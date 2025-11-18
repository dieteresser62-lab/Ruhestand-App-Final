"use strict";

import { formatCurrency } from './simulator-utils.js';
import { HISTORICAL_DATA, STRESS_PRESETS, annualData, REGIME_DATA, REGIME_TRANSITIONS, SUPPORTED_PFLEGE_GRADES } from './simulator-data.js';

const DEFAULT_RISIKOPROFIL = 'sicherheits-dynamisch';

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
    const goldAktiv = document.getElementById('goldAllokationAktiv').checked;

    // Gemeinsame Rentenanpassung (gilt für Person 1 und Partner)
    const rentAdjMode = document.getElementById('rentAdjMode')?.value || 'fix';
    const rentAdjPct = parseFloat(document.getElementById('rentAdjPct')?.value) || 0;

    const pflegeGradeConfigs = {};
    SUPPORTED_PFLEGE_GRADES.forEach(grade => {
        const zusatzInput = document.getElementById(`pflegeStufe${grade}Zusatz`);
        const flexInput = document.getElementById(`pflegeStufe${grade}FlexCut`);
        const zusatz = parseFloat(zusatzInput?.value) || 0;
        const flexPercent = parseFloat(flexInput?.value);
        const flexCut = Math.min(1, Math.max(0, ((Number.isFinite(flexPercent) ? flexPercent : 100) / 100)));
        pflegeGradeConfigs[grade] = { zusatz, flexCut };
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

    const baseInputs = {
        startVermoegen: parseFloat(document.getElementById('simStartVermoegen').value) || 0,
        depotwertAlt: parseFloat(document.getElementById('depotwertAlt').value) || 0,
        einstandAlt: parseFloat(document.getElementById('einstandAlt').value) || 0,
        zielLiquiditaet: parseFloat(document.getElementById('zielLiquiditaet').value) || 0,
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
        pflegeKostenDrift: (parseFloat(document.getElementById('pflegeKostenDrift').value) || 0) / 100,
        pflegebeschleunigtMortalitaetAktivieren: document.getElementById('pflegebeschleunigtMortalitaetAktivieren').checked,
        pflegeTodesrisikoFaktor: parseFloat(document.getElementById('pflegeTodesrisikoFaktor').value) || 1.0,
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
        }
    };

    const strategyConstants = {
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        targetEq: 60,
        rebalBand: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5
    };

    return { ...baseInputs, ...strategyConstants };
}

/**
 * Aktualisiert die Anzeige des Start-Portfolios
 */
export function updateStartPortfolioDisplay() {
    const inputs = getCommonInputs();
    const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
    const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - inputs.zielLiquiditaet);
    const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
    const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
    const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);
    document.getElementById('einstandNeu').value = (depotwertNeu).toFixed(0);
    let breakdownHtml = `
        <div style="text-align:center; font-weight:bold; color: var(--primary-color); margin-bottom:10px;">Finale Start-Allokation</div>
        <div class="form-grid-three-col">
            <div class="form-group"><label>Depot (Aktien)</label><span class="calculated-display" style="background-color: #e0f7fa;">${formatCurrency(inputs.depotwertAlt + depotwertNeu)}</span></div>
            <div class="form-group"><label>Depot (Gold)</label><span class="calculated-display" style="background-color: #fff9c4;">${formatCurrency(zielwertGold)}</span></div>
            <div class="form-group"><label>Liquidität</label><span class="calculated-display" style="background-color: #e8f5e9;">${formatCurrency(inputs.zielLiquiditaet)}</span></div>
        </div>
        <div style="font-size: 0.8rem; text-align: center; margin-top: 10px; color: #555;">Aufteilung: Depot Alt (${formatCurrency(inputs.depotwertAlt)}) + Depot Neu (${formatCurrency(depotwertNeu)})</div>`;
    document.getElementById('displayPortfolioBreakdown').innerHTML = breakdownHtml;
    document.getElementById('goldStrategyPanel').style.display = inputs.goldAktiv ? 'block' : 'none';
}

/**
 * Initialisiert das Portfolio mit Tranchen
 */
export function initializePortfolio(inputs) {
    let depotTranchesAktien = [];
    let depotTranchesGold = [];

    const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
    const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - inputs.zielLiquiditaet);
    const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
    const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
    const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

    if (inputs.depotwertAlt > 1) {
        depotTranchesAktien.push({ marketValue: inputs.depotwertAlt, costBasis: inputs.einstandAlt, tqf: 0.30, type: 'aktien_alt' });
    }
    if (depotwertNeu > 1) {
        depotTranchesAktien.push({ marketValue: depotwertNeu, costBasis: depotwertNeu, tqf: 0.30, type: 'aktien_neu' });
    }
    if (zielwertGold > 1) {
        depotTranchesGold.push({ marketValue: zielwertGold, costBasis: zielwertGold, tqf: inputs.goldSteuerfrei ? 1.0 : 0.0, type: 'gold' });
    }

    return {
        depotTranchesAktien: [...depotTranchesAktien],
        depotTranchesGold: [...depotTranchesGold],
        liquiditaet: inputs.zielLiquiditaet
    };
}

/**
 * Bereitet historische Daten auf und berechnet Regime
 */
export function prepareHistoricalData() {
    if (annualData.length > 0) return;
    const years = Object.keys(HISTORICAL_DATA).map(Number).sort((a,b)=>a-b);
    for (let i = 1; i < years.length; i++) {
        const y = years[i], prev = years[i-1];
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
        const fromRegime = annualData[i-1].regime, toRegime = annualData[i].regime;
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
            .map((d, i) => ({...d, index: i}))
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

    switch (preset.type) {
        case 'parametric':
            modifiedData.rendite += (preset.muShiftEq || 0);
            modifiedData.gold_eur_perf = (modifiedData.gold_eur_perf || 0) + ((preset.muShiftAu || 0) * 100);
            modifiedData.inflation = Math.max(modifiedData.inflation, preset.inflationFloor || 0);
            break;

        case 'parametric_sequence':
            const i = preset.years - stressCtx.remainingYears;
            const baseReturn = preset.seqReturnsEq[i] || 0;
            const noise = (rand() * 2 - 1) * (preset.noiseVol || 0);
            modifiedData.rendite = baseReturn + noise;
            if (preset.inflationFixed !== undefined) {
                modifiedData.inflation = preset.inflationFixed;
            }
            break;
    }

    stressCtx.remainingYears--;
    return modifiedData;
}

/**
 * Wendet Verkaufsergebnis auf Portfolio an
 */
export function applySaleToPortfolio(portfolio, saleResult) {
    if (!saleResult || !saleResult.breakdown) return;
    saleResult.breakdown.forEach(saleItem => {
        const tranches = saleItem.kind.startsWith('aktien') ? portfolio.depotTranchesAktien : portfolio.depotTranchesGold;
        const tranche = tranches.find(t => t.type === saleItem.kind);
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
    const isAktie = String(item.kind || '').startsWith('aktien');
    const brutto = +item.brutto || 0;
    const steuer = (item.steuer != null) ? (+item.steuer) : 0;
    if (isAktie) { sums.vkAkt += brutto; sums.stAkt += steuer; }
    else         { sums.vkGld += brutto; sums.stGld += steuer; }
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
export function buildInputsCtxFromPortfolio(inputs, portfolio, {pensionAnnual, marketData}) {
  const aktAlt = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_alt') || {marketValue:0, costBasis:0};
  const aktNeu = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu') || {marketValue:0, costBasis:0};
  const gTr   = portfolio.depotTranchesGold.find(t => t.type === 'gold')       || {marketValue:0, costBasis:0};

  return {
    ...inputs,
    tagesgeld: portfolio.liquiditaet, geldmarktEtf: 0,
    depotwertAlt: aktAlt.marketValue,  costBasisAlt: aktAlt.costBasis,  tqfAlt: 0.30,
    depotwertNeu: aktNeu.marketValue,  costBasisNeu: aktNeu.costBasis,  tqfNeu: 0.30,
    goldWert: gTr.marketValue,         goldCost:    gTr.costBasis,
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
