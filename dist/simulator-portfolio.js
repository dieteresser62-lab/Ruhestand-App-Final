"use strict";

import { formatCurrency } from './simulator-utils.js';
import { HISTORICAL_DATA, STRESS_PRESETS, annualData, REGIME_DATA, REGIME_TRANSITIONS, SUPPORTED_PFLEGE_GRADES } from './simulator-data.js';
import { calculateAggregatedValues } from './depot-tranchen-status.js';

const DEFAULT_RISIKOPROFIL = 'sicherheits-dynamisch';
const DEFAULT_PFLEGE_DRIFT_PCT = 3.5; // Realistische Langfrist-Annahme (3–4 % über VPI)
let hasLoggedTranchenDisplay = false;

/**
 * Geschlechtsspezifische Default-Annahmen für die Dauer eines akuten Pflegefalls.
 * Männer verbringen im Schnitt etwas weniger Jahre in intensiver Pflege als Frauen,
 * daher wählen wir 5–10 Jahre vs. 6–12 Jahre als konservative Spanne.
 */
const CARE_DURATION_DEFAULTS = Object.freeze({
    m: { minYears: 5, maxYears: 10 },
    w: { minYears: 6, maxYears: 12 },
    d: { minYears: 5, maxYears: 11 },
    default: { minYears: 5, maxYears: 10 }
});

/**
 * Liefert das Default-Intervall für die Pflegedauer auf Basis des Geschlechts.
 * @param {string} gender - 'm', 'w' oder 'd'.
 * @returns {{minYears:number,maxYears:number}} - Standardwerte für min/max.
 */
function getCareDurationDefaults(gender) {
    return CARE_DURATION_DEFAULTS[gender] || CARE_DURATION_DEFAULTS.default;
}

/**
 * Normalisiert das Benutzerintervall und stellt sicher, dass min ≤ max bleibt.
 * Werte <= 0 oder NaN werden durch Geschlechts-Defaults ersetzt.
 * @param {number} minYearsRaw - User-Eingabe für Mindestdauer.
 * @param {number} maxYearsRaw - User-Eingabe für Höchstdauer.
 * @param {string} gender - Geschlecht der betrachteten Person.
 * @returns {{minYears:number,maxYears:number}} - Bereinigtes Intervall.
 */
function normalizeCareDurationRange(minYearsRaw, maxYearsRaw, gender) {
    const defaults = getCareDurationDefaults(gender);
    let minYears = Number.isFinite(minYearsRaw) && minYearsRaw > 0 ? minYearsRaw : defaults.minYears;
    let maxYears = Number.isFinite(maxYearsRaw) && maxYearsRaw > 0 ? maxYearsRaw : defaults.maxYears;

    if (minYears > maxYears) {
        // Dokumentierte Annahme: Wir lassen den größeren Wert dominieren, statt still zu vertauschen.
        maxYears = minYears;
    }

    return { minYears, maxYears };
}

/**
 * Sammelt alle Eingabewerte aus dem UI
 */
export function getCommonInputs() {
    // Lade detaillierte Tranchen aus localStorage (falls vorhanden)
    let detailledTranches = null;
    try {
        const saved = localStorage.getItem('depot_tranchen');
        if (saved) {
            detailledTranches = JSON.parse(saved);
            console.log('✅ Detaillierte Depot-Tranchen geladen:', detailledTranches.length, 'Positionen');
        }
    } catch (err) {
        console.warn('Fehler beim Laden der Depot-Tranchen:', err);
    }

    const goldAktiv = document.getElementById('goldAllokationAktiv').checked;

    // Gemeinsame Rentenanpassung (gilt für Person 1 und Partner)
    const rentAdjMode = document.getElementById('rentAdjMode')?.value || 'fix';
    const rentAdjPct = parseFloat(document.getElementById('rentAdjPct')?.value) || 0;

    // Hinterbliebenen-Rente Konfiguration
    const widowModeRaw = document.getElementById('widowPensionMode')?.value || 'stop';
    const widowPctRaw = parseFloat(document.getElementById('widowPensionPct')?.value);
    const widowMarriageOffsetRaw = parseInt(document.getElementById('widowMarriageOffsetYears')?.value);
    const widowMinMarriageYearsRaw = parseInt(document.getElementById('widowMinMarriageYears')?.value);
    const widowOptions = {
        mode: widowModeRaw,
        percent: (() => {
            const pct = Number.isFinite(widowPctRaw) ? widowPctRaw : 0;
            return Math.max(0, Math.min(100, pct)) / 100;
        })(),
        marriageOffsetYears: Math.max(0, Number.isFinite(widowMarriageOffsetRaw) ? widowMarriageOffsetRaw : 0),
        minMarriageYears: Math.max(0, Number.isFinite(widowMinMarriageYearsRaw) ? widowMinMarriageYearsRaw : 0)
    };

    const pflegeGradeConfigs = {};
    SUPPORTED_PFLEGE_GRADES.forEach(grade => {
        const zusatzInput = document.getElementById(`pflegeStufe${grade}Zusatz`);
        const flexInput = document.getElementById(`pflegeStufe${grade}FlexCut`);
        const mortalityInput = document.getElementById(`pflegeStufe${grade}Mortality`);
        const zusatz = parseFloat(zusatzInput?.value) || 0;
        const flexPercent = parseFloat(flexInput?.value);
        const flexCut = Math.min(1, Math.max(0, ((Number.isFinite(flexPercent) ? flexPercent : 100) / 100)));
        const mortalityRaw = parseFloat(mortalityInput?.value);
        const mortalityFactor = Math.max(0, Number.isFinite(mortalityRaw) ? mortalityRaw : 0);
        pflegeGradeConfigs[grade] = { zusatz, flexCut, mortalityFactor };
    });
    const grade1Config = pflegeGradeConfigs[1] || { zusatz: 0, flexCut: 1 };

    // Person 1 Felder - mit Fallback auf alte IDs für Abwärtskompatibilität
    const p1StartAlter = parseInt(document.getElementById('p1StartAlter')?.value || document.getElementById('startAlter')?.value) || 65;
    const p1Geschlecht = document.getElementById('p1Geschlecht')?.value || document.getElementById('geschlecht')?.value || 'w';
    const p1SparerPB = parseFloat(document.getElementById('p1SparerPauschbetrag')?.value || document.getElementById('startSPB')?.value) || 0;
    const p1KirchensteuerPct = parseFloat(document.getElementById('p1KirchensteuerPct')?.value || document.getElementById('kirchensteuerSatz')?.value) || 0;
    const p1Monatsrente = parseFloat(document.getElementById('p1Monatsrente')?.value || document.getElementById('renteMonatlich')?.value) || 0;
    const p1StartInJahren = parseInt(document.getElementById('p1StartInJahren')?.value || document.getElementById('renteStartOffsetJahre')?.value) || 0;

    // Person 2 Migration: r2Brutto (jährlich) → r2Monatsrente (monatlich)
    let r2Monatsrente = parseFloat(document.getElementById('r2Monatsrente')?.value) || 0;
    if (!r2Monatsrente) {
        const r2BruttoJahr = parseFloat(document.getElementById('r2Brutto')?.value) || 0;
        if (r2BruttoJahr > 0) {
            r2Monatsrente = Math.round(r2BruttoJahr / 12);
            // Migration in localStorage wird später in simulator-main.js durchgeführt
        }
    }

    const rawPflegeMin = parseInt(document.getElementById('pflegeMinDauer')?.value);
    const rawPflegeMax = parseInt(document.getElementById('pflegeMaxDauer')?.value);
    const normalizedCareDuration = normalizeCareDurationRange(rawPflegeMin, rawPflegeMax, p1Geschlecht);

    const tagesgeld = parseFloat(document.getElementById('tagesgeld')?.value) || 0;
    const geldmarktEtf = parseFloat(document.getElementById('geldmarktEtf')?.value) || 0;

    const baseInputs = {
        startVermoegen: parseFloat(document.getElementById('simStartVermoegen').value) || 0,
        depotwertAlt: parseFloat(document.getElementById('depotwertAlt').value) || 0,
        tagesgeld: tagesgeld,
        geldmarktEtf: geldmarktEtf,
        einstandAlt: parseFloat(document.getElementById('einstandAlt').value) || 0,
        zielLiquiditaet: tagesgeld + geldmarktEtf,
        startFloorBedarf: parseFloat(document.getElementById('startFloorBedarf').value) || 0,
        startFlexBedarf: parseFloat(document.getElementById('startFlexBedarf').value) || 0,
        marketCapeRatio: parseFloat(document.getElementById('marketCapeRatio')?.value) || 0,
        risikoprofil: DEFAULT_RISIKOPROFIL,
        goldAktiv: goldAktiv,
        goldZielProzent: (goldAktiv ? parseFloat(document.getElementById('goldAllokationProzent').value) : 0),
        goldFloorProzent: (goldAktiv ? parseFloat(document.getElementById('goldFloorProzent').value) : 0),
        rebalancingBand: (goldAktiv ? parseFloat(document.getElementById('rebalancingBand').value) : 25),
        goldSteuerfrei: goldAktiv && document.getElementById('goldSteuerfrei').checked,
        startAlter: p1StartAlter,
        geschlecht: p1Geschlecht,
        startSPB: p1SparerPB,
        kirchensteuerSatz: p1KirchensteuerPct / 100, // Konvertiere zu Dezimal (9 → 0.09)
        renteMonatlich: p1Monatsrente,
        renteStartOffsetJahre: p1StartInJahren,
        rentAdjMode: rentAdjMode,
        rentAdjPct: rentAdjPct,
        // VERALTET: Alte Indexierungsfelder (für Abwärtskompatibilität, werden nicht mehr verwendet)
        renteIndexierungsart: document.getElementById('renteIndexierungsart')?.value || 'fest',
        renteFesterSatz: parseFloat(document.getElementById('renteFesterSatz')?.value) || 0,
        pflegefallLogikAktivieren: document.getElementById('pflegefallLogikAktivieren').checked,
        pflegeModellTyp: document.getElementById('pflegeModellTyp').value,
        pflegeGradeConfigs,
        pflegeStufe1Zusatz: grade1Config.zusatz,
        pflegeStufe1FlexCut: grade1Config.flexCut,
        pflegeMaxFloor: parseFloat(document.getElementById('pflegeMaxFloor').value) || 0,
        pflegeRampUp: parseInt(document.getElementById('pflegeRampUp').value) || 5,
        // Defensive Defaults: greifen auf geschlechtsspezifische Annahmen zurück.
        pflegeMinDauer: normalizedCareDuration.minYears,
        pflegeMaxDauer: normalizedCareDuration.maxYears,
        pflegeKostenDrift: (() => {
            const driftPctRaw = parseFloat(document.getElementById('pflegeKostenDrift')?.value);
            const driftPct = Number.isFinite(driftPctRaw) ? driftPctRaw : DEFAULT_PFLEGE_DRIFT_PCT;
            return Math.max(0, driftPct) / 100;
        })(),
        pflegeRegionalZuschlag: (() => {
            const raw = parseFloat(document.getElementById('pflegeRegionalZuschlag')?.value);
            return Math.max(0, Number.isFinite(raw) ? raw : 0) / 100;
        })(),
        decumulation: { mode: 'none' },
        stressPreset: document.getElementById('stressPreset').value || 'NONE',
        // Partner-Konfiguration (Rente 2)
        partner: {
            aktiv: document.getElementById('chkPartnerAktiv')?.checked || false,
            geschlecht: document.getElementById('r2Geschlecht')?.value || 'w',
            startAlter: parseInt(document.getElementById('r2StartAlter')?.value) || 0,
            startInJahren: parseInt(document.getElementById('r2StartInJahren')?.value) || 0,
            monatsrente: r2Monatsrente,
            sparerPauschbetrag: parseFloat(document.getElementById('r2SparerPauschbetrag')?.value) || 0,
            kirchensteuerPct: parseFloat(document.getElementById('r2KirchensteuerPct')?.value) || 0,
            steuerquotePct: parseFloat(document.getElementById('r2Steuerquote')?.value) || 0,
            // VERALTET: brutto wird durch monatsrente ersetzt
            brutto: r2Monatsrente * 12
        },
        widowOptions
    };

    const strategyInputs = {
        runwayMinMonths: parseInt(document.getElementById('runwayMinMonths')?.value) || 24,
        runwayTargetMonths: parseInt(document.getElementById('runwayTargetMonths')?.value) || 36,
        targetEq: parseInt(document.getElementById('targetEq')?.value) || 60,
        rebalBand: parseInt(document.getElementById('rebalBand')?.value) || 5,
        maxSkimPctOfEq: parseInt(document.getElementById('maxSkimPctOfEq')?.value) || 10,
        maxBearRefillPctOfEq: parseInt(document.getElementById('maxBearRefillPctOfEq')?.value) || 5
    };

    // Ansparphase-Konfiguration
    const accumulationPhaseEnabled = document.getElementById('enableAccumulationPhase')?.checked || false;
    const accumulationDurationYears = parseInt(document.getElementById('accumulationDurationYears')?.value) || 0;
    const accumulationSparrate = parseFloat(document.getElementById('accumulationSparrate')?.value) || 0;
    const sparrateIndexing = document.getElementById('sparrateIndexing')?.value || 'none';

    const accumulationPhase = {
        enabled: accumulationPhaseEnabled,
        durationYears: accumulationDurationYears,
        sparrate: accumulationSparrate,
        sparrateIndexing: sparrateIndexing
    };

    const transitionYear = accumulationPhaseEnabled ? accumulationDurationYears : 0;
    const transitionAge = p1StartAlter + transitionYear;

    return {
        ...baseInputs,
        ...strategyInputs,
        accumulationPhase,
        transitionYear,
        transitionAge,
        // NEU: Detaillierte Tranchen für FIFO und präzise Steuerberechnung
        detailledTranches: detailledTranches
    };
}

/**
 * Aktualisiert die Anzeige des Start-Portfolios
 */
export function updateStartPortfolioDisplay() {
    const inputs = getCommonInputs();
    const aggregated = (inputs.detailledTranches && Array.isArray(inputs.detailledTranches) && inputs.detailledTranches.length)
        ? calculateAggregatedValues()
        : null;
    const useAggregates = aggregated && (
        aggregated.depotwertAlt > 0 ||
        aggregated.depotwertNeu > 0 ||
        aggregated.geldmarktEtf > 0 ||
        aggregated.goldWert > 0
    );

    if (useAggregates && !hasLoggedTranchenDisplay) {
        console.log('Tranchen-Aggregate werden fuer die Start-Portfolio-Anzeige verwendet.');
        hasLoggedTranchenDisplay = true;
    }

    let displayDepotwertAlt = 0;
    let displayDepotwertNeu = 0;
    let displayGoldWert = 0;
    let displayGeldmarkt = 0;
    let displayTagesgeld = 0;
    let depotwertNeu = 0;
    let zielwertGold = 0;

    if (useAggregates) {
        displayDepotwertAlt = aggregated.depotwertAlt || 0;
        displayDepotwertNeu = aggregated.depotwertNeu || 0;
        displayGoldWert = aggregated.goldWert || 0;
        displayGeldmarkt = aggregated.geldmarktEtf || 0;
        displayTagesgeld = inputs.tagesgeld || 0;
    } else {
        const startLiquiditaet = (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0);
        const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
        const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - startLiquiditaet);
        const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
        zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
        depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

        displayDepotwertAlt = inputs.depotwertAlt;
        displayDepotwertNeu = depotwertNeu;
        displayGoldWert = zielwertGold;
        displayGeldmarkt = inputs.geldmarktEtf || 0;
        displayTagesgeld = inputs.tagesgeld || 0;
    }

    const derivedStartVermoegen = displayDepotwertAlt + displayDepotwertNeu + displayGoldWert + displayTagesgeld + displayGeldmarkt;
    const startField = document.getElementById('simStartVermoegen');
    if (startField) {
        startField.value = String(Math.round(derivedStartVermoegen));
    }

    const showGoldPanel = inputs.goldAktiv || (useAggregates && displayGoldWert > 0);

    document.getElementById('einstandNeu').value = useAggregates
        ? Math.round(aggregated.costBasisNeu || 0)
        : (depotwertNeu).toFixed(0);

    let breakdownHtml = `
        <div style="text-align:center; font-weight:bold; color: var(--primary-color); margin-bottom:10px;">Finale Start-Allokation</div>
        <div class="form-grid-three-col">
            <div class="form-group"><label>Depot (Aktien)</label><span class="calculated-display" style="background-color: #e0f7fa;">${formatCurrency(displayDepotwertAlt + displayDepotwertNeu)}</span></div>
            <div class="form-group"><label>Depot (Gold)</label><span class="calculated-display" style="background-color: #fff9c4;">${formatCurrency(displayGoldWert)}</span></div>
            <div class="form-group"><label>Liquiditд</label><span class="calculated-display" style="background-color: #e8f5e9;">${formatCurrency(displayTagesgeld + displayGeldmarkt)}</span></div>
        </div>
        <div style="font-size: 0.8rem; text-align: center; margin-top: 10px; color: #555;">Aufteilung: Depot Alt (${formatCurrency(displayDepotwertAlt)}) + Depot Neu (${formatCurrency(displayDepotwertNeu)})</div>`;
    document.getElementById('displayPortfolioBreakdown').innerHTML = breakdownHtml;
    document.getElementById('goldStrategyPanel').style.display = showGoldPanel ? 'block' : 'none';
}

/**
 * Initialisiert das Portfolio mit detaillierten Tranchen (erweiterte Logik)
 * Unterstützt mehrere individuelle Positionen mit FIFO-Tracking
 */
export function initializePortfolioDetailed(inputs) {
    let depotTranchesAktien = [];
    let depotTranchesGold = [];
    let depotTranchesGeldmarkt = [];

    // Falls detaillierte Tranchen in inputs vorhanden sind, diese verwenden
    if (inputs.detailledTranches && Array.isArray(inputs.detailledTranches)) {
        // Sortiere nach Kaufdatum (FIFO)
        const sortedTranches = [...inputs.detailledTranches].sort((a, b) => {
            const dateA = a.purchaseDate ? new Date(a.purchaseDate) : new Date('1900-01-01');
            const dateB = b.purchaseDate ? new Date(b.purchaseDate) : new Date('1900-01-01');
            return dateA - dateB;
        });

        for (const tranche of sortedTranches) {
            const trancheObj = {
                trancheId: tranche.trancheId || tranche.id || null,
                name: tranche.name || 'Unbekannt',
                isin: tranche.isin || '',
                shares: Number(tranche.shares) || 0,
                purchasePrice: Number(tranche.purchasePrice) || 0,
                purchaseDate: tranche.purchaseDate || null,
                currentPrice: Number(tranche.currentPrice) || 0,
                marketValue: (Number(tranche.shares) || 0) * (Number(tranche.currentPrice) || 0),
                costBasis: (Number(tranche.shares) || 0) * (Number(tranche.purchasePrice) || 0),
                tqf: Number(tranche.tqf) ?? 0.30,
                type: tranche.type || 'aktien_alt',
                category: tranche.category || 'equity'
            };

            // Kategorisierung
            if (trancheObj.category === 'equity') {
                depotTranchesAktien.push(trancheObj);
            } else if (trancheObj.category === 'gold') {
                depotTranchesGold.push(trancheObj);
            } else if (trancheObj.category === 'money_market') {
                depotTranchesGeldmarkt.push(trancheObj);
            }
        }
    }

    // Fallback auf alte Logik, wenn keine detaillierten Tranchen vorhanden
    if (depotTranchesAktien.length === 0) {
        const startLiquiditaet = (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0);
        const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
        const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - startLiquiditaet);
        const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
        const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
        const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

        if (inputs.depotwertAlt > 1) {
            depotTranchesAktien.push({
                marketValue: inputs.depotwertAlt,
                costBasis: inputs.einstandAlt,
                tqf: 0.30,
                type: 'aktien_alt',
                name: 'Altbestand (aggregiert)',
                purchaseDate: null
            });
        }
        if (depotwertNeu > 1) {
            depotTranchesAktien.push({
                marketValue: depotwertNeu,
                costBasis: depotwertNeu,
                tqf: 0.30,
                type: 'aktien_neu',
                name: 'Neubestand (aggregiert)',
                purchaseDate: null
            });
        }
        if (inputs.geldmarktEtf > 1) {
            depotTranchesGeldmarkt.push({
                marketValue: inputs.geldmarktEtf,
                costBasis: inputs.geldmarktEtf,
                tqf: 0,
                type: 'geldmarkt',
                name: 'Geldmarkt',
                purchaseDate: null
            });
        }
        if (zielwertGold > 1) {
            depotTranchesGold.push({
                marketValue: zielwertGold,
                costBasis: zielwertGold,
                tqf: inputs.goldSteuerfrei ? 1.0 : 0.0,
                type: 'gold',
                name: 'Gold',
                purchaseDate: null
            });
        }
    }

    const geldmarktSum = depotTranchesGeldmarkt.reduce((sum, t) => sum + (Number(t.marketValue) || 0), 0);
    const geldmarktEtf = geldmarktSum > 0 ? geldmarktSum : (inputs.geldmarktEtf || 0);
    const tagesgeld = inputs.tagesgeld || 0;

    return {
        depotTranchesAktien: [...depotTranchesAktien],
        depotTranchesGold: [...depotTranchesGold],
        depotTranchesGeldmarkt: [...depotTranchesGeldmarkt],
        liquiditaet: tagesgeld + geldmarktEtf,
        tagesgeld,
        geldmarktEtf
    };
}

/**
 * Initialisiert das Portfolio mit Tranchen (Legacy-Kompatibilität)
 */
export function initializePortfolio(inputs) {
    // Falls detaillierte Tranchen vorhanden, nutze erweiterte Funktion
    if (inputs.detailledTranches && Array.isArray(inputs.detailledTranches)) {
        return initializePortfolioDetailed(inputs);
    }

    // Sonst alte Logik
    let depotTranchesAktien = [];
    let depotTranchesGold = [];
    let depotTranchesGeldmarkt = [];

    const startLiquiditaet = (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0);
    const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
    const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - startLiquiditaet);
    const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
    const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
    const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

    if (inputs.depotwertAlt > 1) {
        depotTranchesAktien.push({ marketValue: inputs.depotwertAlt, costBasis: inputs.einstandAlt, tqf: 0.30, type: 'aktien_alt' });
    }
    if (depotwertNeu > 1) {
        depotTranchesAktien.push({ marketValue: depotwertNeu, costBasis: depotwertNeu, tqf: 0.30, type: 'aktien_neu' });
    }
    if (inputs.geldmarktEtf > 1) {
        depotTranchesGeldmarkt.push({ marketValue: inputs.geldmarktEtf, costBasis: inputs.geldmarktEtf, tqf: 0, type: 'geldmarkt' });
    }
    if (zielwertGold > 1) {
        depotTranchesGold.push({ marketValue: zielwertGold, costBasis: zielwertGold, tqf: inputs.goldSteuerfrei ? 1.0 : 0.0, type: 'gold' });
    }

    return {
        depotTranchesAktien: [...depotTranchesAktien],
        depotTranchesGold: [...depotTranchesGold],
        depotTranchesGeldmarkt: [...depotTranchesGeldmarkt],
        liquiditaet: (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0),
        tagesgeld: inputs.tagesgeld || 0,
        geldmarktEtf: inputs.geldmarktEtf || 0
    };
}

/**
 * Bereitet historische Daten auf und berechnet Regime
 */
export function prepareHistoricalData() {
    if (annualData.length > 0) return;
    const years = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < years.length; i++) {
        const y = years[i], prev = years[i - 1];
        const cur = HISTORICAL_DATA[y], vj = HISTORICAL_DATA[prev];
        if (!cur || !vj) continue;

        const m1 = Number(cur.msci_eur);
        const m0 = Number(vj.msci_eur);
        if (!isFinite(m0) || !isFinite(m1)) {
            console.warn(`Ungültige MSCI-Daten für Jahr ${y} oder ${prev} übersprungen.`);
            continue;
        }

        let rendite = (m0 > 0) ? (m1 - m0) / m0 : 0;
        if (!isFinite(rendite)) rendite = 0;

        const dataPoint = {
            jahr: y,
            rendite: rendite,
            inflation: Number(vj.inflation_de) || 0,
            zinssatz: Number(vj.zinssatz_de) || 0,
            lohn: Number(vj.lohn_de) || 0,
            gold_eur_perf: Number(vj.gold_eur_perf) || 0
        };

        annualData.push(dataPoint);
        const realRendite = rendite * 100 - dataPoint.inflation;
        let regime = (dataPoint.inflation > 4 && realRendite < 0) ? 'STAGFLATION' : (rendite > 0.15) ? 'BULL' : (rendite < -0.10) ? 'BEAR' : 'SIDEWAYS';
        dataPoint.regime = regime;
        if (!REGIME_DATA[regime]) REGIME_DATA[regime] = [];
        REGIME_DATA[regime].push(dataPoint);
    }
    const regimes = ['BULL', 'BEAR', 'SIDEWAYS', 'STAGFLATION'];
    regimes.forEach(from => { REGIME_TRANSITIONS[from] = { BULL: 0, BEAR: 0, SIDEWAYS: 0, STAGFLATION: 0, total: 0 }; });
    for (let i = 1; i < annualData.length; i++) {
        const fromRegime = annualData[i - 1].regime, toRegime = annualData[i].regime;
        if (fromRegime && toRegime) { REGIME_TRANSITIONS[fromRegime][toRegime]++; REGIME_TRANSITIONS[fromRegime].total++; }
    }
}

/**
 * Berechnet jährliche Rente basierend auf Indexierung
 * VERALTET: Wird durch computePensionNext ersetzt (nur noch für Abwärtskompatibilität)
 */
export function computeYearlyPension({ yearIndex, baseMonthly, startOffset, lastAnnualPension, indexierungsArt, inflRate, lohnRate, festerSatz }) {
    if (!baseMonthly || yearIndex < startOffset) return 0;
    let anpassungsSatz = 0;
    switch (indexierungsArt) {
        case 'inflation': anpassungsSatz = inflRate / 100; break;
        case 'lohn': anpassungsSatz = (lohnRate ?? inflRate) / 100; break;
        case 'fest': anpassungsSatz = festerSatz / 100; break;
    }
    if (yearIndex === startOffset) return baseMonthly * 12;
    const last = lastAnnualPension > 0 ? lastAnnualPension : baseMonthly * 12;
    return last * (1 + anpassungsSatz);
}

/**
 * Berechnet die nächste jährliche Rente mit gemeinsamer Anpassungsrate
 * @param {number} prev - Vorjahresrente (brutto, vor Steuern)
 * @param {boolean} isFirstYear - Ist es das erste Auszahlungsjahr?
 * @param {number} base - Basisrente (brutto p.a.) im ersten Jahr
 * @param {number} adjPct - Jährliche Anpassungsrate in Prozent (z.B. 2.0 für 2%)
 * @returns {number} Rentenbrutto für das Jahr (≥ 0)
 */
export function computePensionNext(prev, isFirstYear, base, adjPct) {
    if (isFirstYear) return Math.max(0, base);
    const val = prev * (1 + adjPct / 100);
    return Math.max(0, val);
}

/**
 * Berechnet die effektive Rentenanpassungsrate basierend auf Modus und Jahresdaten
 * @param {object} inputs - Input-Objekt mit rentAdjMode und rentAdjPct
 * @param {object} yearData - Jahresdaten mit inflation und lohn
 * @returns {number} Anpassungsrate in Prozent (z.B. 2.0 für 2%)
 */
export function computeRentAdjRate(inputs, yearData) {
    if (!inputs.rentAdjMode || inputs.rentAdjMode === 'fix') {
        return inputs.rentAdjPct || 0;
    }

    if (inputs.rentAdjMode === 'wage') {
        // Lohnentwicklung aus historischen Daten
        return yearData.lohn || 0;
    }

    if (inputs.rentAdjMode === 'cpi') {
        // Inflation (CPI)
        return yearData.inflation || 0;
    }

    // Fallback
    return inputs.rentAdjPct || 0;
}

/**
 * Bereitet den Kontext für ein Stress-Szenario vor
 */
export function buildStressContext(presetKey, rand) {
    const preset = STRESS_PRESETS[presetKey] || STRESS_PRESETS.NONE;
    if (preset.type === 'none') return null;

    const context = {
        preset: preset,
        remainingYears: preset.years,
        type: preset.type
    };

    if (preset.type === 'conditional_bootstrap') {
        context.pickableIndices = annualData
            .map((d, i) => ({ ...d, index: i }))
            .filter(d => {
                const realReturnPct = (d.rendite * 100) - d.inflation;
                const passesInflation = preset.filter.inflationMin === undefined || d.inflation >= preset.filter.inflationMin;
                const passesRealReturn = preset.filter.equityRealMax === undefined || realReturnPct <= preset.filter.equityRealMax;
                return passesInflation && passesRealReturn;
            })
            .map(d => d.index);

        if (context.pickableIndices.length === 0) {
            console.warn(`Stress-Szenario "${preset.label}" fand keine passenden historischen Jahre. Fallback auf 'Kein Stress'.`);
            return null;
        }
    }

    if (preset.type === 'parametric_sequence' && preset.reboundClamp) {
        context.reboundYearsRemaining = preset.reboundClamp.years;
    }

    return context;
}

/**
 * Wendet Stress-Überschreibungen auf Jahresdaten an
 */
export function applyStressOverride(yearData, stressCtx, rand) {
    if (!stressCtx || stressCtx.remainingYears <= 0) {
        if (stressCtx?.reboundYearsRemaining > 0 && stressCtx.preset.reboundClamp) {
            yearData.rendite = Math.min(yearData.rendite, stressCtx.preset.reboundClamp.cap);
            stressCtx.reboundYearsRemaining--;
        }
        return yearData;
    }

    const preset = stressCtx.preset;
    const modifiedData = { ...yearData };

    // 1. Basis-Logik je nach Typ (Filter, Sequenz etc.)
    switch (preset.type) {
        case 'parametric_sequence':
            const i = preset.years - stressCtx.remainingYears;
            const baseReturn = preset.seqReturnsEq[i] || 0;
            const noise = (rand() * 2 - 1) * (preset.noiseVol || 0);
            modifiedData.rendite = baseReturn + noise;
            if (preset.inflationFixed !== undefined) {
                modifiedData.inflation = preset.inflationFixed;
            }
            // Sequenz überschreibt alles, daher hier break und return
            stressCtx.remainingYears--;
            return modifiedData;
    }

    // 2. Parametrische Modifikation (Shift/Scale) auf das Jahr anwenden
    // Funktioniert nun AUCH für 'conditional_bootstrap' oder andere Typen, 
    // sofern Parameter im Preset definiert sind.

    // Volatilitäts-Skalierung (staucht/streckt Abweichung vom Mittelwert)
    if (preset.volScaleEq) {
        const HIST_MEAN_APPROX = 0.08;
        modifiedData.rendite = HIST_MEAN_APPROX + (modifiedData.rendite - HIST_MEAN_APPROX) * preset.volScaleEq;
    }

    // Lineare Shifts
    modifiedData.rendite += (preset.muShiftEq || 0);
    modifiedData.gold_eur_perf = (modifiedData.gold_eur_perf || 0) + ((preset.muShiftAu || 0) * 100);

    // Caps (Obergrenzen für Renditen) - WICHTIG für "Lost Decade" (keine Gold-Raketen)
    if (preset.returnMaxAu !== undefined) {
        // Gold-Perf ist in Prozent (z.B. 19.5 für 19.5%)
        modifiedData.gold_eur_perf = Math.min(modifiedData.gold_eur_perf, preset.returnMaxAu);
    }
    if (preset.returnMaxEq !== undefined) {
        // Aktien-Rendite ist dezimal (z.B. 0.05 für 5%)
        modifiedData.rendite = Math.min(modifiedData.rendite, preset.returnMaxEq);
    }

    // Floors/Caps
    if (preset.inflationFloor) {
        modifiedData.inflation = Math.max(modifiedData.inflation, preset.inflationFloor);
    }

    stressCtx.remainingYears--;
    return modifiedData;
}

/**
 * Sortiert Tranchen nach FIFO-Prinzip (First In, First Out)
 * Älteste Käufe (nach Datum) werden zuerst verkauft (gesetzlich vorgeschrieben)
 */
export function sortTranchesFIFO(tranches) {
    return [...tranches].sort((a, b) => {
        const dateA = a.purchaseDate ? new Date(a.purchaseDate) : new Date('1900-01-01');
        const dateB = b.purchaseDate ? new Date(b.purchaseDate) : new Date('1900-01-01');
        return dateA - dateB;
    });
}

/**
 * Sortiert Tranchen nach steuerlicher Effizienz (niedrigste Steuerlast zuerst)
 * Berücksichtigt Gewinnquote und Teilfreistellung
 */
export function sortTranchesTaxOptimized(tranches) {
    return [...tranches].sort((a, b) => {
        const gqA = a.marketValue > 0 ? Math.max(0, (a.marketValue - a.costBasis) / a.marketValue) : 0;
        const gqB = b.marketValue > 0 ? Math.max(0, (b.marketValue - b.costBasis) / b.marketValue) : 0;
        const taxLoadA = gqA * (1 - (a.tqf || 0));
        const taxLoadB = gqB * (1 - (b.tqf || 0));
        return taxLoadA - taxLoadB;
    });
}

/**
 * Berechnet die Gesamtsteuer für einen hypothetischen Verkauf einer Tranche
 * @param {object} tranche - Die zu verkaufende Tranche
 * @param {number} sellAmount - Verkaufsbetrag (Marktwert)
 * @param {number} sparerPauschbetrag - Verfügbarer Sparer-Pauschbetrag
 * @param {number} kirchensteuerSatz - Kirchensteuersatz (z.B. 0.09 für 9%)
 * @returns {{steuer: number, netto: number, pauschbetragUsed: number}}
 */
export function calculateTrancheTax(tranche, sellAmount, sparerPauschbetrag, kirchensteuerSatz) {
    const keSt = 0.25 * (1 + 0.055 + (kirchensteuerSatz || 0));

    const marketValue = tranche.marketValue || 0;
    const costBasis = tranche.costBasis || 0;
    const tqf = tranche.tqf || 0;

    if (marketValue <= 0 || sellAmount <= 0) {
        return { steuer: 0, netto: sellAmount, pauschbetragUsed: 0 };
    }

    // Gewinnquote berechnen
    const gewinnQuote = Math.max(0, (marketValue - costBasis) / marketValue);

    // Bruttogewinn für den Verkaufsbetrag
    const bruttogewinn = sellAmount * gewinnQuote;

    // Teilfreistellung anwenden
    const gewinnNachTFS = bruttogewinn * (1 - tqf);

    // Sparer-Pauschbetrag anwenden
    const anrechenbarerPauschbetrag = Math.min(sparerPauschbetrag, gewinnNachTFS);
    const finaleSteuerbasis = Math.max(0, gewinnNachTFS - anrechenbarerPauschbetrag);

    // Steuer berechnen
    const steuer = finaleSteuerbasis * keSt;
    const netto = sellAmount - steuer;

    return {
        steuer: steuer,
        netto: netto,
        pauschbetragUsed: anrechenbarerPauschbetrag
    };
}

/**
 * Wendet Verkaufsergebnis auf Portfolio an
 */
export function applySaleToPortfolio(portfolio, saleResult) {
    if (!saleResult || !saleResult.breakdown) return;

    const findTrancheById = (trancheId) => {
        if (!trancheId) return null;
        const byId = (arr) => Array.isArray(arr) ? arr.find(t => t.trancheId === trancheId) : null;
        return byId(portfolio.depotTranchesAktien)
            || byId(portfolio.depotTranchesGold)
            || byId(portfolio.depotTranchesGeldmarkt);
    };

    saleResult.breakdown.forEach(saleItem => {
        if (!saleItem.kind || saleItem.kind === 'liquiditaet') return; // Skip liquidity or invalid items
        let tranche = findTrancheById(saleItem.trancheId);
        if (!tranche) {
            const tranches = saleItem.kind.startsWith('aktien') ? portfolio.depotTranchesAktien : portfolio.depotTranchesGold;
            tranche = tranches.find(t => t.type === saleItem.kind);
        }
        if (tranche) {
            const reduction = Math.min(saleItem.brutto, tranche.marketValue);
            const reductionRatio = tranche.marketValue > 0 ? reduction / tranche.marketValue : 0;
            tranche.costBasis -= tranche.costBasis * reductionRatio;
            tranche.marketValue -= reduction;
        }
    });
}

/**
 * Fasst Verkäufe nach Asset-Typ zusammen
 */
export function summarizeSalesByAsset(saleResult) {
    const sums = { vkAkt: 0, vkGld: 0, stAkt: 0, stGld: 0, vkGes: 0, stGes: 0 };
    if (!saleResult || !Array.isArray(saleResult.breakdown)) return sums;
    for (const item of saleResult.breakdown) {
        if (!item.kind || item.kind === 'liquiditaet') continue;
        const isAktie = String(item.kind || '').startsWith('aktien');
        const brutto = +item.brutto || 0;
        const steuer = (item.steuer != null) ? (+item.steuer) : 0;
        if (isAktie) { sums.vkAkt += brutto; sums.stAkt += steuer; }
        else { sums.vkGld += brutto; sums.stGld += steuer; }
        sums.vkGes += brutto; sums.stGes += steuer;
    }
    if (sums.stGes === 0 && saleResult.steuerGesamt > 0 && (sums.vkAkt + sums.vkGld) > 0) {
        const tot = sums.vkAkt + sums.vkGld; const ges = saleResult.steuerGesamt;
        sums.stAkt = ges * (sums.vkAkt / tot); sums.stGld = ges * (sums.vkGld / tot); sums.stGes = ges;
    } else if (saleResult.steuerGesamt > 0 && Math.abs(sums.stGes - saleResult.steuerGesamt) > 1e-6) {
        sums.stGes = saleResult.steuerGesamt;
    }
    return sums;
}

/**
 * Konvertiert Portfolio-Status zurück in Input-Kontext
 */
export function buildInputsCtxFromPortfolio(inputs, portfolio, { pensionAnnual, marketData }) {
    const sumByType = (arr, type) => {
        const list = Array.isArray(arr) ? arr : [];
        return list.reduce((acc, t) => {
            if (t.type === type) {
                acc.marketValue += Number(t.marketValue) || 0;
                acc.costBasis += Number(t.costBasis) || 0;
            }
            return acc;
        }, { marketValue: 0, costBasis: 0 });
    };

    const aktAlt = sumByType(portfolio.depotTranchesAktien, 'aktien_alt');
    const aktNeu = sumByType(portfolio.depotTranchesAktien, 'aktien_neu');
    const gTr = sumByType(portfolio.depotTranchesGold, 'gold');

    const gmm = sumByType(portfolio.depotTranchesGeldmarkt, 'geldmarkt');
    const geldmarktEtf = Number(portfolio.geldmarktEtf) || gmm.marketValue || 0;
    const tagesgeld = Number(portfolio.tagesgeld) || Math.max(0, (portfolio.liquiditaet || 0) - geldmarktEtf);

    return {
        ...inputs,
        tagesgeld,
        geldmarktEtf,
        depotwertAlt: aktAlt.marketValue, costBasisAlt: aktAlt.costBasis, tqfAlt: 0.30,
        depotwertNeu: aktNeu.marketValue, costBasisNeu: aktNeu.costBasis, tqfNeu: 0.30,
        goldWert: gTr.marketValue, goldCost: gTr.costBasis,
        goldSteuerfrei: inputs.goldSteuerfrei,
        sparerPauschbetrag: inputs.startSPB,
        marketData,
        pensionAnnual
    };
}

/**
 * Summiert Depotwert über alle Tranchen
 */
export function sumDepot(portfolio) {
    const sumTr = (arr) => Array.isArray(arr) ? arr.reduce((s, t) => s + (Number(t?.marketValue) || 0), 0) : 0;
    return sumTr(portfolio?.depotTranchesAktien) + sumTr(portfolio?.depotTranchesGold);
}

/**
 * Kauft Gold und fügt es zum Portfolio hinzu
 */
export function buyGold(portfolio, amount) {
    if (amount <= 0) return;
    const goldTranche = portfolio.depotTranchesGold.find(t => t.type === 'gold');
    if (goldTranche) {
        goldTranche.marketValue += amount;
        goldTranche.costBasis += amount;
    } else {
        portfolio.depotTranchesGold.push({ marketValue: amount, costBasis: amount, tqf: 1.0, type: 'gold' });
    }
}

/**
 * Kauft Aktien und fügt sie zum Portfolio hinzu
 */
export function buyStocksNeu(portfolio, amount) {
    if (amount <= 0) return;
    const neuTranche = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu');
    if (neuTranche) {
        neuTranche.marketValue += amount;
        neuTranche.costBasis += amount;
    } else {
        portfolio.depotTranchesAktien.push({ marketValue: amount, costBasis: amount, tqf: 0.30, type: 'aktien_neu' });
    }
}
