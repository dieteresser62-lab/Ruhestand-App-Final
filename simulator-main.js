"use strict";

/**
 * ============================================================================
 * SWEEP FIX: ZWEI-PERSONEN-HAUSHALT - PARAMETER WHITELIST & RENTE-2-INVARIANZ
 * ============================================================================
 *
 * Datum: 2025-11-07
 *
 * ÄNDERUNGEN:
 * -----------
 * 1. **Whitelist statt Blacklist für Sweep-Parameter**
 *    - Nur explizit erlaubte Parameter (SWEEP_ALLOWED_KEYS) dürfen im Sweep variiert werden
 *    - Verhindert unbeabsichtigte Änderungen an Person-2-Parametern (Rente, Alter, etc.)
 *    - Blocklist (SWEEP_BLOCK_PATTERNS) für zusätzlichen Schutz von Person-2-Feldern
 *
 * 2. **Deep-Copy der Settings pro Sweep-Zelle**
 *    - deepClone() verwendet structuredClone() (Browser-Native) oder JSON-Fallback
 *    - Verhindert Side-Effects zwischen Sweep-Cases
 *    - baseInputs werden nur EINMAL gelesen und dann geklont
 *
 * 3. **Renten-Invarianz-Wächter für Person 2**
 *    - Extrahiert Rente-2-Serie aus Year-Logs (extractR2Series)
 *    - Vergleicht Rente-2 über alle Sweep-Cases (areR2SeriesEqual)
 *    - Setzt warningR2Varies-Flag bei Abweichungen
 *    - Referenz-Serie wird beim ersten Case gesetzt
 *
 * 4. **Heatmap-Badge & Tooltip für Verstöße**
 *    - Gelber Rand (stroke-width: 3px) bei warningR2Varies
 *    - Warn-Symbol ⚠ in betroffenen Heatmap-Zellen
 *    - Tooltip: "⚠ Rente 2 variierte im Sweep"
 *    - Keine KPI-Verfälschung, nur visuelle Markierung
 *
 * 5. **Developer-Tests mit fixem Seed**
 *    - runSweepSelfTest() für Mini-Sweep mit R2-Invarianz-Prüfung
 *    - Aktivierung via Dev-Mode Toggle (localStorage: sim.devMode=1)
 *    - Console-Logs mit [SWEEP] Prefix
 *    - Visuelle Bestätigung in UI (grün/rot)
 *
 * DEVELOPER-FLAGS:
 * ----------------
 * - Dev-Mode aktivieren: localStorage.setItem('sim.devMode', '1'); dann Reload
 *   oder: Klick auf "Dev-Mode" Toggle im UI (falls vorhanden)
 * - Self-Test Button erscheint dann im Parameter-Sweep Tab
 * - Fixed Seed für Tests: Wird in runSweepSelfTest() hartcodiert (baseSeed = 12345)
 *
 * BETROFFENE DATEIEN:
 * -------------------
 * - simulator-main.js:     Haupt-Sweep-Logik, Whitelist, Deep-Clone, R2-Assertion
 * - simulator-heatmap.js:  Heatmap-Rendering mit R2-Warning-Badge
 * - simulator-results.js:  Metriken-Aggregation (warningR2Varies)
 *
 * FUNKTIONEN:
 * -----------
 * - deepClone(obj)                     ~Zeile 100 (nach Imports)
 * - SWEEP_ALLOWED_KEYS                 ~Zeile 130 (Whitelist-Definition)
 * - SWEEP_BLOCK_PATTERNS               ~Zeile 145 (Blocklist für Person-2)
 * - isBlockedKey(key)                  ~Zeile 155 (Blocklist-Prüfung)
 * - extractR2Series(yearLog)           ~Zeile 164 (Rente-2-Serie extrahieren)
 * - areR2SeriesEqual(s1, s2, tol)      ~Zeile 186 (Rente-2-Vergleich)
 * - runParameterSweep()                ~Zeile 1278 (Haupt-Sweep-Logik)
 * - runSweepSelfTest()                 ~Zeile 1577 (Developer-Test)
 *
 * ============================================================================
 */

import { rng, quantile, sum, mean, formatCurrency, parseRange, parseRangeInput, cartesianProduct, cartesianProductLimited } from './simulator-utils.js';
import { ENGINE_VERSION, ENGINE_HASH, STRESS_PRESETS, BREAK_ON_RUIN, MORTALITY_TABLE, HISTORICAL_DATA, annualData } from './simulator-data.js';
import {
    getCommonInputs, updateStartPortfolioDisplay, initializePortfolio,
    prepareHistoricalData, buildStressContext, applyStressOverride, computeRentAdjRate
} from './simulator-portfolio.js';
import {
    simulateOneYear, initMcRunState, makeDefaultCareMeta, sampleNextYearData, computeRunStatsFromSeries, updateCareMeta, calcCareCost
} from './simulator-engine.js';
import { portfolioTotal, displayMonteCarloResults, renderWorstRunLog, aggregateSweepMetrics } from './simulator-results.js';
import { formatCurrencyShortLog } from './simulator-utils.js';
import { sumDepot } from './simulator-portfolio.js';
import { renderSweepHeatmapSVG } from './simulator-heatmap.js';

/**
 * Schnelles strukturiertes Cloning für Stress-Context
 * Ersetzt JSON.parse/stringify für bessere Performance
 * WICHTIG: Nur für stressCtx - keine anderen Datenstrukturen!
 */
function cloneStressContext(ctx) {
    if (!ctx) return null;
    return {
        type: ctx.type,
        remainingYears: ctx.remainingYears,
        pickableIndices: ctx.pickableIndices, // Read-only Array, Shallow Copy OK
        preset: ctx.preset // Read-only Object, Shallow Copy OK
    };
}

/**
 * Robuste Deep-Clone-Funktion für Sweep-Parameter
 *
 * Verwendet die native structuredClone() API (falls verfügbar, Chrome 98+, Firefox 94+),
 * andernfalls Fallback auf JSON.parse(JSON.stringify()).
 *
 * WICHTIG: Diese Funktion ist KRITISCH für Sweep-Korrektheit!
 * Sie verhindert Side-Effects zwischen Sweep-Cases, indem jede Case-Kombination
 * eine komplett unabhängige Kopie der baseInputs erhält.
 *
 * @param {Object} obj - Das zu klonende Objekt
 * @returns {Object} Tiefe, unabhängige Kopie des Objekts
 *
 * @example
 * const baseInputs = getCommonInputs();
 * const caseInputs = deepClone(baseInputs);
 * caseInputs.rebalBand = 10; // baseInputs.rebalBand bleibt unverändert
 */
function deepClone(obj) {
    if (typeof structuredClone === 'function') {
        return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Setzt verschachtelten Pfad in Objekt (z.B. "partner.monatsrente")
 * @param {object} obj - Zielobjekt
 * @param {string} path - Pfad (z.B. "a.b.c" oder "key")
 * @param {any} value - Wert zum Setzen
 */
function setNested(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    current[parts[parts.length - 1]] = value;
}

/**
 * Whitelist für erlaubte Sweep-Parameter
 * Nur diese Parameter dürfen im Sweep variiert werden
 *
 * WICHTIG: Person-2-Parameter (partner.*, r2*, p2*) dürfen NICHT hier aufgeführt werden!
 *
 * Aktuelle Sweep-Parameter (Stand 2025-11-07):
 * - runwayMin/runwayTarget → runwayMinMonths/runwayTargetMonths
 * - targetEq
 * - rebalBand
 * - maxSkimPct → maxSkimPctOfEq
 * - maxBearRefillPct → maxBearRefillPctOfEq
 * - goldTargetPct → goldZielProzent + goldAktiv
 */
const SWEEP_ALLOWED_KEYS = new Set([
    // Strategie-Parameter (Liquiditäts-Runway)
    'runwayMinMonths', 'runwayTargetMonths',
    // Strategie-Parameter (Portfolio-Allokation)
    'targetEq', 'rebalBand',
    // Strategie-Parameter (Skim & Refill)
    'maxSkimPctOfEq', 'maxBearRefillPctOfEq',
    // Strategie-Parameter (Gold-Allokation)
    'goldZielProzent', 'goldFloorProzent', 'goldAktiv',
    // Basis-Parameter (gemeinsam für beide Personen)
    'rentAdjMode', 'rentAdjPct',
    'startFloorBedarf', 'startFlexBedarf',
    // Weitere erlaubte Parameter können hier hinzugefügt werden
    // ACHTUNG: Keine Person-2-spezifischen Parameter (r2*, partner.*, p2*)!
]);

/**
 * Blockliste: Regex-Patterns für Person-2-Felder
 * Diese Felder dürfen NICHT im Sweep überschrieben werden
 *
 * WICHTIG: Dies ist eine Fail-Safe zusätzlich zur Whitelist!
 * Selbst wenn jemand versehentlich einen Person-2-Parameter zur Whitelist hinzufügt,
 * wird er durch diese Blockliste abgefangen.
 *
 * Geblockte Patterns:
 * - partner.* (z.B. partner.aktiv, partner.monatsrente, partner.pension)
 * - r2* (z.B. r2Monatsrente, r2StartInJahren, r2Steuerquote, r2Geschlecht)
 * - p2* (z.B. p2Rente, p2StartAlter, etc.)
 */
const SWEEP_BLOCK_PATTERNS = [
    /^partner(\.|$)/i,   // z.B. partner.aktiv, partner.monatsrente, ...
    /^r2[A-Z_]/,         // z.B. r2Monatsrente, r2StartInJahren, r2Steuerquote, ...
    /^p2[A-Z_]/,         // z.B. p2Rente, p2StartAlter, p2Geschlecht, ...
];

/**
 * Prüft, ob ein Key auf der Blockliste steht (Person-2-Parameter)
 * @param {string} key - Parameter-Key
 * @returns {boolean} true wenn geblockt
 */
function isBlockedKey(key) {
    return SWEEP_BLOCK_PATTERNS.some(rx => rx.test(key));
}

/**
 * Extrahiert Basis-Parameter von Person 2 für Invarianz-Prüfung
 *
 * WICHTIG: Diese Funktion extrahiert nur die GRUND-PARAMETER der Person 2,
 * NICHT die abgeleiteten Jahreswerte (die sich durch COLA/Inflation ändern).
 *
 * Die Funktion ist der Kern des P2-Invarianz-Wächters im Parameter-Sweep.
 * Sie stellt sicher, dass nur die Basis-Konfiguration verglichen wird, nicht
 * die daraus abgeleiteten zeitabhängigen Rentenbeträge.
 *
 * @param {Object} inputs - Eingabe-Settings (inkl. inputs.partner)
 * @returns {Object} Objekt mit P2-Basis-Parametern
 *
 * @example
 * const inv1 = extractP2Invariants(inputs1);
 * const inv2 = extractP2Invariants(inputs2);
 * const equal = JSON.stringify(inv1) === JSON.stringify(inv2);
 */
function extractP2Invariants(inputs) {
    if (!inputs || !inputs.partner) {
        return {
            aktiv: false,
            brutto: 0,
            startAlter: 0,
            startInJahren: 0,
            steuerquotePct: 0,
            rentAdjPct: 0
        };
    }

    return {
        aktiv: !!inputs.partner.aktiv,
        brutto: Number(inputs.partner.brutto) || 0,
        startAlter: Number(inputs.partner.startAlter) || 0,
        startInJahren: Number(inputs.partner.startInJahren) || 0,
        steuerquotePct: Number(inputs.partner.steuerquotePct) || 0,
        rentAdjPct: Number(inputs.rentAdjPct) || 0
    };
}

/**
 * Prüft, ob zwei P2-Invarianten-Objekte identisch sind
 *
 * Diese Funktion vergleicht die GRUND-PARAMETER von Person 2 zwischen zwei Settings.
 * Im Gegensatz zur alten areR2SeriesEqual(), die abgeleitete Zeitserien verglich,
 * arbeitet diese Funktion auf der Basis-Ebene und ist damit immun gegen
 * Inflationspfad-Unterschiede oder State-Leaks.
 *
 * @param {Object} inv1 - Erste Invarianten (Referenz)
 * @param {Object} inv2 - Zweite Invarianten (zu prüfen)
 * @returns {boolean} true wenn identisch, false sonst
 *
 * @example
 * const ref = { aktiv: true, brutto: 18000, startAlter: 65, ... };
 * const test1 = { aktiv: true, brutto: 18000, startAlter: 65, ... }; // Identisch
 * const test2 = { aktiv: true, brutto: 20000, startAlter: 65, ... }; // Abweichend!
 *
 * areP2InvariantsEqual(ref, test1); // => true
 * areP2InvariantsEqual(ref, test2); // => false (Warnung!)
 */
function areP2InvariantsEqual(inv1, inv2) {
    if (!inv1 || !inv2) return false;
    return JSON.stringify(inv1) === JSON.stringify(inv2);
}

/**
 * DEPRECATED: Extrahiert Rente-2-Serie aus YearLog für Invarianz-Prüfung
 *
 * WARNUNG: Diese Funktion wurde durch extractP2Invariants() ersetzt!
 * Der alte Ansatz verglich abgeleitete Jahreswerte, was zu Fehlalarmen führte.
 *
 * @deprecated Verwende stattdessen extractP2Invariants() + areP2InvariantsEqual()
 */
function extractR2Series(yearLog) {
    if (!yearLog || !Array.isArray(yearLog) || yearLog.length === 0) return null;

    // Unterstütze verschiedene mögliche Feldnamen
    const possibleKeys = ['rente2', 'Rente2', 'Rente_2', 'p2Rente', 'r2'];
    const key = possibleKeys.find(k => k in (yearLog[0] || {}));

    if (!key) {
        console.warn('[SWEEP] Konnte kein Rente-2-Feld in YearLog finden. Verfügbare Keys:', Object.keys(yearLog[0] || {}));
        return null;
    }

    return yearLog.map(y => Number(y[key]) || 0);
}

/**
 * DEPRECATED: Prüft, ob zwei Rente-2-Serien identisch sind
 *
 * WARNUNG: Diese Funktion wurde durch areP2InvariantsEqual() ersetzt!
 * Der alte Ansatz verglich Zeitserien und löste Fehlalarme aus.
 *
 * @deprecated Verwende stattdessen extractP2Invariants() + areP2InvariantsEqual()
 */
function areR2SeriesEqual(series1, series2, tolerance = 1e-6) {
    if (!series1 || !series2) return false;
    if (series1.length !== series2.length) return false;
    return series1.every((v, i) => Math.abs(v - series2[i]) < tolerance);
}

/**
 * Führt eine Funktion aus, ohne dass localStorage.setItem aufgerufen werden kann
 * @param {Function} fn - Auszuführende Funktion
 * @returns {*} Rückgabewert der Funktion
 */
function withNoLSWrites(fn) {
    const _lsSet = localStorage.setItem;
    localStorage.setItem = function() {
        // No-op während Sweep - verhindert Side-Effects
        console.debug('[SWEEP] localStorage.setItem blockiert während Sweep');
    };
    try {
        return fn();
    } finally {
        localStorage.setItem = _lsSet;
    }
}

/**
 * Berechnet die Rentenanpassungsrate für ein bestimmtes Jahr
 * @param {Object} ctx - Kontext mit inputs, series, simStartYear
 * @param {number} yearIdx - Jahr-Index innerhalb der Simulation (0 = erstes Jahr)
 * @returns {number} Anpassungsrate in Prozent (z.B. 2.0 für 2%)
 */
function computeAdjPctForYear(ctx, yearIdx) {
    // ctx.inputs.rentAdj: { mode: "fix"|"wage"|"cpi", pct: number }
    const mode = ctx.inputs.rentAdj?.mode || "fix";
    if (mode === "fix") return Number(ctx.inputs.rentAdj?.pct || 0);

    // Stelle sicher, dass ctx.series existiert:
    // ctx.series = { wageGrowth: number[], inflationPct: number[], startYear: number }
    // startYear = erstes Jahr der historischen Reihe (z.B. 1970)
    const s = ctx.series || {};
    const offsetIdx = (ctx.simStartYear ?? 0) - (s.startYear ?? 0) + yearIdx;

    if (mode === "wage") {
        const v = Array.isArray(s.wageGrowth) ? s.wageGrowth[offsetIdx] : undefined;
        return Number.isFinite(v) ? Number(v) : 0;
    }
    if (mode === "cpi") {
        const v = Array.isArray(s.inflationPct) ? s.inflationPct[offsetIdx] : undefined;
        return Number.isFinite(v) ? Number(v) : 0;
    }
    return 0;
}

/**
 * Wendet Steuerberechnung auf Rentenbrutto an
 * @param {number} pensionGross - Bruttorenete p.a.
 * @param {Object} params - { sparerPauschbetrag, kirchensteuerPct, steuerquotePct }
 * @returns {number} Nettorente (≥ 0)
 */
function applyPensionTax(pensionGross, params) {
    // Wenn steuerquotePct > 0 → verwende pauschal pensionGross * (1 - steuerquotePct/100)
    if (params.steuerquotePct > 0) {
        const netto = pensionGross * (1 - params.steuerquotePct / 100);
        return Math.max(0, netto);
    }

    // Sonst: vereinfachte Logik (Sparer-Pauschbetrag, Kirchensteuer etc.)
    // Für Person 1: keine zusätzliche Steuer (wird extern versteuert)
    // Für Person 2: detaillierte Berechnung könnte hier implementiert werden
    // Aktuell: Wenn keine Steuerquote angegeben, wird keine Steuer abgezogen
    return Math.max(0, pensionGross);
}

/**
 * Führt die Monte-Carlo-Simulation durch
 */
export async function runMonteCarlo() {
    const mcButton = document.getElementById('mcButton');
    mcButton.disabled = true;
    const progressBarContainer = document.getElementById('mc-progress-bar-container');
    const progressBar = document.getElementById('mc-progress-bar');
    try {
        prepareHistoricalData();
        const inputs = getCommonInputs();

        progressBarContainer.style.display = 'block'; progressBar.style.width = '0%';
        const anzahl = parseInt(document.getElementById('mcAnzahl').value);
        const maxDauer = parseInt(document.getElementById('mcDauer').value);
        const blockSize = parseInt(document.getElementById('mcBlockSize').value);
        const seed = parseInt(document.getElementById('mcSeed').value);
        const methode = document.getElementById('mcMethode').value;
        const rand = rng(seed);

        const stressCtxMaster = buildStressContext(inputs.stressPreset, rand);

        const finalOutcomes = new Float64Array(anzahl);
        const taxOutcomes = new Float64Array(anzahl);
        const kpiLebensdauer = new Uint8Array(anzahl);
        const kpiKuerzungsjahre = new Float32Array(anzahl);
        const kpiMaxKuerzung = new Float32Array(anzahl);
        const volatilities = new Float32Array(anzahl);
        const maxDrawdowns = new Float32Array(anzahl);
        const depotErschoepft = new Uint8Array(anzahl);
        const alterBeiErschoepfung = new Uint8Array(anzahl).fill(255);
        const anteilJahreOhneFlex = new Float32Array(anzahl);

        // Realistischer Schwellenwert für Depot-Erschöpfung: 100 € (vorher 0,000001 €)
        const DEPOT_DEPLETION_THRESHOLD = 100;

        const stress_maxDrawdowns = new Float32Array(anzahl);
        const stress_timeQuoteAbove45 = new Float32Array(anzahl);
        const stress_cutYears = new Float32Array(anzahl);
        const stress_CaR_P10_Real = new Float64Array(anzahl);
        const stress_recoveryYears = new Float32Array(anzahl);

        let worstRun = { finalVermoegen: Infinity, logDataRows: [], failed: false };
        let worstRunCare = { finalVermoegen: Infinity, logDataRows: [], failed: false, hasCare: false };

        let failCount = 0;
        let pflegeTriggeredCount = 0;
        const entryAges = [], careDepotCosts = [];
        let shortfallWithCareCount = 0, shortfallNoCareProxyCount = 0;
        const endWealthWithCare = new Float64Array(anzahl);
        const endWealthNoCareProxyArr = new Float64Array(anzahl);

        // Dual Care KPIs
        const p1CareYearsArr = new Uint16Array(anzahl);
        const p2CareYearsArr = new Uint16Array(anzahl);
        const bothCareYearsArr = new Uint16Array(anzahl);
        const entryAgesP2 = [];
        let p2TriggeredCount = 0;
        const maxAnnualCareSpendArr = new Float64Array(anzahl);

        // Arrays for care years (only for triggered cases)
        const p1CareYearsTriggered = [];
        const p2CareYearsTriggered = [];
        const bothCareYearsTriggered = [];

        const BINS = [0, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, Infinity];
        const heatmap = Array(10).fill(0).map(() => new Uint32Array(BINS.length - 1));
        let totalSimulatedYears = 0, totalYearsQuoteAbove45 = 0;
        const allRealWithdrawalsSample = [];

        // Optimiert: Dynamisches Progress-Update-Intervall für bessere Performance
        // Mindestens alle 100 Runs ODER 1% der Gesamtzahl (je nachdem was größer ist)
        const progressUpdateInterval = Math.max(100, Math.floor(anzahl / 100));

        for (let i = 0; i < anzahl; i++) {
            if (i % progressUpdateInterval === 0) {
                progressBar.style.width = `${(i / anzahl) * 90}%`;
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            let failed = false, totalTaxesThisRun = 0, kpiJahreMitKuerzungDieserLauf = 0, kpiMaxKuerzungDieserLauf = 0;
            let lebensdauer = 0, jahreOhneFlex = 0, triggeredAge = null;
            let careEverActive = false;

            const startYearIndex = Math.floor(rand() * annualData.length);
            let simState = initMcRunState(inputs, startYearIndex);

            const depotWertHistorie = [portfolioTotal(simState.portfolio)];
            const currentRunLog = [];
            let depotNurHistorie = [ sumDepot(simState.portfolio) ];
            let depotErschoepfungAlterGesetzt = false;

            // Dual Care: P1 + P2 (Partner)
            const careMetaP1 = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren);
            const careMetaP2 = (inputs.partner?.aktiv === true) ? makeDefaultCareMeta(inputs.pflegefallLogikAktivieren) : null;

            // Separate RNG streams for independent care events
            const rngCareP1 = rand.fork('CARE_P1');
            const rngCareP2 = careMetaP2 ? rand.fork('CARE_P2') : null;

            let stressCtx = cloneStressContext(stressCtxMaster);

            const stressYears = stressCtxMaster?.preset?.years ?? 0;
            const stressPortfolioValues = [portfolioTotal(simState.portfolio)];
            let stressYearsAbove45 = 0;
            let stressCutYears = 0;
            const stressRealWithdrawals = [];
            let postStressRecoveryYears = null;

            // Track dual care activity
            let p1Alive = true, p2Alive = careMetaP2 !== null;
            let p1CareYears = 0, p2CareYears = 0, bothCareYears = 0;
            let triggeredAgeP2 = null;

            for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                const ageP1 = inputs.startAlter + simulationsJahr;
                lebensdauer = simulationsJahr + 1;

                // Calculate P2 age (based on partner offset)
                let ageP2 = ageP1;
                if (inputs.partner?.aktiv) {
                    // Use partner's startAlter + simulationsJahr to age them correctly
                    ageP2 = inputs.partner.startAlter + simulationsJahr;
                }

                let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                yearData = applyStressOverride(yearData, stressCtx, rand);

                // Update care for both persons independently
                if (p1Alive) {
                    updateCareMeta(careMetaP1, inputs, ageP1, yearData, rngCareP1);
                    if (careMetaP1 && careMetaP1.active) careEverActive = true;
                    if (careMetaP1 && careMetaP1.triggered && triggeredAge === null) triggeredAge = ageP1;
                }

                if (p2Alive && careMetaP2) {
                    updateCareMeta(careMetaP2, inputs, ageP2, yearData, rngCareP2);
                    if (careMetaP2 && careMetaP2.triggered && triggeredAgeP2 === null) triggeredAgeP2 = ageP2;
                }

                // Track care years
                const p1ActiveThisYear = p1Alive && careMetaP1?.active;
                const p2ActiveThisYear = p2Alive && careMetaP2?.active;
                if (p1ActiveThisYear) p1CareYears++;
                if (p2ActiveThisYear) p2CareYears++;
                if (p1ActiveThisYear && p2ActiveThisYear) bothCareYears++;

                // Separate mortality for P1 and P2
                if (p1Alive) {
                    let qx1 = MORTALITY_TABLE[inputs.geschlecht][ageP1] || 1;
                    if (careMetaP1?.active && inputs.pflegebeschleunigtMortalitaetAktivieren) {
                        qx1 = Math.min(1.0, qx1 * inputs.pflegeTodesrisikoFaktor);
                    }
                    if (rand() < qx1) {
                        p1Alive = false;
                    }
                }

                if (p2Alive && careMetaP2) {
                    // Partner has opposite gender by default
                    const p2Gender = inputs.geschlecht === 'm' ? 'w' : 'm';
                    let qx2 = MORTALITY_TABLE[p2Gender][ageP2] || 1;
                    if (careMetaP2?.active && inputs.pflegebeschleunigtMortalitaetAktivieren) {
                        qx2 = Math.min(1.0, qx2 * inputs.pflegeTodesrisikoFaktor);
                    }
                    if (rand() < qx2) {
                        p2Alive = false;
                    }
                }

                // Simulation ends when P1 dies (main person)
                if (!p1Alive) break;

                // Calculate care costs from both persons
                const { zusatzFloor: careFloorP1, flexFactor: careFlexP1 } = calcCareCost(careMetaP1, null);
                const { zusatzFloor: careFloorP2 } = careMetaP2 ? calcCareCost(careMetaP2, null) : { zusatzFloor: 0 };
                const totalCareFloor = careFloorP1 + careFloorP2;

                // Apply care costs to state (temporarily modify for this year)
                const stateWithCare = {
                    ...simState,
                    baseFloor: simState.baseFloor + totalCareFloor,
                    baseFlex: simState.baseFlex * Math.min(careFlexP1, careMetaP2?.flexFactor ?? 1.0)
                };

                // Berechne dynamische Rentenanpassung basierend auf Modus (fix/wage/cpi)
                const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct };

                // Pass careMetaP1 for logging (legacy compatibility)
                const result = simulateOneYear(stateWithCare, adjustedInputs, yearData, simulationsJahr, careMetaP1);

                if (result.isRuin) {
                    failed = true;
                    // Bei Ruin ist das Depot definitiv erschöpft - setze Alter
                    if (!depotErschoepfungAlterGesetzt) {
                        alterBeiErschoepfung[i] = ageP1;
                        depotErschoepfungAlterGesetzt = true;
                    }
                    currentRunLog.push({
                        jahr: simulationsJahr + 1,
                        histJahr: yearData.jahr,
                        aktionUndGrund: ">>> RUIN <<<",
                        wertAktien: 0, wertGold: 0, liquiditaet: 0
                    });
                    if (BREAK_ON_RUIN) break;
                } else {
                    simState = result.newState;
                    totalTaxesThisRun += result.totalTaxesThisYear;
                    if (result.logData.entscheidung.kuerzungProzent >= 10) kpiJahreMitKuerzungDieserLauf++;
                    kpiMaxKuerzungDieserLauf = Math.max(kpiMaxKuerzungDieserLauf, result.logData.entscheidung.kuerzungProzent);

                    const depotOnlyNow = sumDepot(simState.portfolio);
                    depotNurHistorie.push(depotOnlyNow);

                    if (!depotErschoepfungAlterGesetzt && depotOnlyNow <= DEPOT_DEPLETION_THRESHOLD) {
                      alterBeiErschoepfung[i] = ageP1;
                      depotErschoepfungAlterGesetzt = true;
                    }

                    if (result.logData.FlexRatePct <= 0.1) {
                        jahreOhneFlex++;
                    }

                    totalSimulatedYears++;
                    if (result.logData.entnahmequote * 100 > 4.5) totalYearsQuoteAbove45++;
                    if (i % 100 === 0) allRealWithdrawalsSample.push(result.logData.jahresentnahme_real);

                    if (simulationsJahr < 10) {
                        const quote = result.logData.entnahmequote * 100;
                        for (let b = 0; b < BINS.length - 1; b++) {
                            if (quote >= BINS[b] && quote < BINS[b + 1]) { heatmap[simulationsJahr][b]++; break; }
                        }
                    }

                    depotWertHistorie.push(portfolioTotal(simState.portfolio));

                    if (stressYears > 0 && simulationsJahr < stressYears) {
                        stressPortfolioValues.push(portfolioTotal(simState.portfolio));

                        if (result.logData.entnahmequote * 100 > 4.5) {
                            stressYearsAbove45++;
                        }
                        if (result.logData.entscheidung.kuerzungProzent > 10) {
                            stressCutYears++;
                        }
                        stressRealWithdrawals.push(result.logData.jahresentnahme_real);
                    }

                    if (stressYears > 0 && simulationsJahr >= stressYears && postStressRecoveryYears === null) {
                        if (result.logData.entnahmequote * 100 < 3.5) {
                            postStressRecoveryYears = simulationsJahr - (stressYears - 1);
                        }
                    }

                    currentRunLog.push({
                        jahr: simulationsJahr + 1, histJahr: yearData.jahr, inflation: yearData.inflation, ...result.logData,
                        // P1 Care (legacy compatibility)
                        pflege_aktiv: !!(careMetaP1 && careMetaP1.active),
                        pflege_zusatz_floor: careMetaP1?.zusatzFloorZiel ?? 0,
                        pflege_zusatz_floor_delta: careMetaP1?.zusatzFloorDelta ?? 0,
                        pflege_flex_faktor: careMetaP1?.flexFactor ?? 1,
                        pflege_kumuliert: careMetaP1?.kumulierteKosten ?? 0,
                        pflege_floor_anchor: careMetaP1?.log_floor_anchor ?? 0,
                        pflege_maxfloor_anchor: careMetaP1?.log_maxfloor_anchor ?? 0,
                        pflege_cap_zusatz: careMetaP1?.log_cap_zusatz ?? 0,
                        pflege_delta_flex: careMetaP1?.log_delta_flex ?? 0,
                        // P2 Care (new dual care support)
                        CareP1_Active: p1ActiveThisYear ? 1 : 0,
                        CareP1_Cost: careMetaP1?.zusatzFloorZiel ?? 0,
                        CareP2_Active: p2ActiveThisYear ? 1 : 0,
                        CareP2_Cost: careMetaP2?.zusatzFloorZiel ?? 0
                    });
                }
            }

            if (stressYears > 0) {
                const { maxDDpct: stressMaxDD } = computeRunStatsFromSeries(stressPortfolioValues);
                stress_maxDrawdowns[i] = stressMaxDD;
                stress_timeQuoteAbove45[i] = (stressYearsAbove45 / stressYears) * 100;
                stress_cutYears[i] = stressCutYears;
                stress_CaR_P10_Real[i] = stressRealWithdrawals.length > 0 ? quantile(stressRealWithdrawals, 0.10) : 0;

                if (postStressRecoveryYears === null) {
                    postStressRecoveryYears = Math.max(0, lebensdauer - stressYears);
                }
                stress_recoveryYears[i] = postStressRecoveryYears;
            }

            const endVermoegen = failed ? 0 : portfolioTotal(simState.portfolio);

            if ((failed ? -Infinity : endVermoegen) < (worstRun.failed ? -Infinity : worstRun.finalVermoegen)) {
                worstRun = { finalVermoegen: endVermoegen, logDataRows: currentRunLog, failed: failed };
            }
            if (careEverActive && ((failed ? -Infinity : endVermoegen) < (worstRunCare.failed ? -Infinity : worstRunCare.finalVermoegen))) {
                worstRunCare = { finalVermoegen: endVermoegen, logDataRows: currentRunLog, failed: failed, hasCare: true };
            }

            if (failed) failCount++;
            const { volPct, maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);

            finalOutcomes[i] = endVermoegen;
            taxOutcomes[i] = totalTaxesThisRun;
            kpiLebensdauer[i] = lebensdauer;
            kpiKuerzungsjahre[i] = lebensdauer > 0 ? (kpiJahreMitKuerzungDieserLauf / lebensdauer) * 100 : 0;
            kpiMaxKuerzung[i] = kpiMaxKuerzungDieserLauf;
            anteilJahreOhneFlex[i] = lebensdauer > 0 ? (jahreOhneFlex / lebensdauer) * 100 : 0;
            volatilities[i] = volPct;
            maxDrawdowns[i] = maxDDpct;
            // Depot gilt als erschöpft, wenn es jemals unter den Schwellenwert fiel ODER der Run fehlgeschlagen ist
            depotErschoepft[i] = (failed || depotNurHistorie.some(v => v <= DEPOT_DEPLETION_THRESHOLD)) ? 1 : 0;

            const cumulCareDepotCosts = (careMetaP1?.kumulierteKosten || 0) + (careMetaP2?.kumulierteKosten || 0);
            endWealthWithCare[i] = endVermoegen;
            endWealthNoCareProxyArr[i] = endVermoegen + cumulCareDepotCosts;
            if (triggeredAge !== null) {
                pflegeTriggeredCount++; entryAges.push(triggeredAge); careDepotCosts.push(careMetaP1?.kumulierteKosten || 0);
                if (failed) shortfallWithCareCount++;
                // Store care years only for triggered cases
                p1CareYearsTriggered.push(p1CareYears);
            }
            if (triggeredAgeP2 !== null) {
                p2TriggeredCount++; entryAgesP2.push(triggeredAgeP2);
                // Store care years only for triggered cases
                p2CareYearsTriggered.push(p2CareYears);
            }
            // Store bothCareYears only if at least one person had care
            if (triggeredAge !== null || triggeredAgeP2 !== null) {
                bothCareYearsTriggered.push(bothCareYears);
            }
            if (endWealthNoCareProxyArr[i] <= 0) shortfallNoCareProxyCount++;

            // Store dual care metrics (for all runs, needed for internal tracking)
            p1CareYearsArr[i] = p1CareYears;
            p2CareYearsArr[i] = p2CareYears;
            bothCareYearsArr[i] = bothCareYears;

            // Track max annual care spend (sum of both P1 and P2)
            let maxAnnualSpend = 0;
            for (const logRow of currentRunLog) {
                const annualSpend = (logRow.CareP1_Cost || 0) + (logRow.CareP2_Cost || 0);
                maxAnnualSpend = Math.max(maxAnnualSpend, annualSpend);
            }
            maxAnnualCareSpendArr[i] = maxAnnualSpend;
        }

        progressBar.style.width = '95%';
        await new Promise(resolve => setTimeout(resolve, 0));

        const successfulOutcomes = [];
        for(let i=0; i<anzahl; ++i) { if(finalOutcomes[i] > 0) successfulOutcomes.push(finalOutcomes[i]); }

        const pflegeResults = {
          entryRatePct: (pflegeTriggeredCount / anzahl) * 100,
          entryAgeMedian: entryAges.length ? quantile(entryAges, 0.5) : 0,
          shortfallRate_condCare: pflegeTriggeredCount > 0 ? (shortfallWithCareCount / pflegeTriggeredCount) * 100 : 0,
          shortfallRate_noCareProxy: (shortfallNoCareProxyCount / anzahl) * 100,
          endwealthWithCare_median: quantile(endWealthWithCare, 0.5),
          endwealthNoCare_median: quantile(endWealthNoCareProxyArr, 0.5),
          depotCosts_median: careDepotCosts.length ? quantile(careDepotCosts, 0.5) : 0,
          // Dual Care KPIs (only for triggered cases)
          p1CareYears: p1CareYearsTriggered.length ? quantile(p1CareYearsTriggered, 0.5) : 0,
          p2CareYears: p2CareYearsTriggered.length ? quantile(p2CareYearsTriggered, 0.5) : 0,
          bothCareYears: bothCareYearsTriggered.length ? quantile(bothCareYearsTriggered, 0.5) : 0,
          p2EntryRatePct: (p2TriggeredCount / anzahl) * 100,
          p2EntryAgeMedian: entryAgesP2.length ? quantile(entryAgesP2, 0.5) : 0,
          maxAnnualCareSpend: quantile(maxAnnualCareSpendArr, 0.5),
          shortfallDelta_vs_noCare: quantile(endWealthNoCareProxyArr, 0.5) - quantile(endWealthWithCare, 0.5)
        };

        const stressPresetKey = inputs.stressPreset || 'NONE';
        const aggregatedResults = {
            finalOutcomes: {
                p10: quantile(finalOutcomes, 0.1), p50: quantile(finalOutcomes, 0.5),
                p90: quantile(finalOutcomes, 0.9), p50_successful: quantile(successfulOutcomes, 0.5)
            },
            taxOutcomes: { p50: quantile(taxOutcomes, 0.5) },
            kpiLebensdauer: { mean: mean(kpiLebensdauer) },
            kpiKuerzungsjahre: { p50: quantile(kpiKuerzungsjahre, 0.5) },
            kpiMaxKuerzung: { p50: quantile(kpiMaxKuerzung, 0.5) },
            depotErschoepfungsQuote: (sum(depotErschoepft) / anzahl) * 100,
            alterBeiErschoepfung: { p50: quantile(Array.from(alterBeiErschoepfung).filter(a => a < 255), 0.5) || 0 },
            anteilJahreOhneFlex: { p50: quantile(anteilJahreOhneFlex, 0.5) },
            volatilities: { p50: quantile(volatilities, 0.5) },
            maxDrawdowns: { p50: quantile(maxDrawdowns, 0.5), p90: quantile(maxDrawdowns, 0.9) },
            heatmap: heatmap.map(yearData => Array.from(yearData)),
            bins: BINS,
            extraKPI: {
                timeShareQuoteAbove45: totalSimulatedYears > 0 ? totalYearsQuoteAbove45 / totalSimulatedYears : 0,
                consumptionAtRiskP10Real: quantile(allRealWithdrawalsSample, 0.1),
                pflege: pflegeResults
            },
            stressKPI: {
                presetKey: stressPresetKey,
                years: STRESS_PRESETS[stressPresetKey]?.years || 0,
                maxDD: {
                    p50: quantile(stress_maxDrawdowns, 0.50),
                    p90: quantile(stress_maxDrawdowns, 0.90)
                },
                timeShareAbove45: {
                    p50: quantile(stress_timeQuoteAbove45, 0.50)
                },
                cutYears: {
                    p50: quantile(stress_cutYears, 0.50)
                },
                consumptionAtRiskP10Real: {
                    p50: quantile(stress_CaR_P10_Real, 0.50)
                },
                recoveryYears: {
                    p50: quantile(stress_recoveryYears, 0.50)
                }
            }
        };

        displayMonteCarloResults(aggregatedResults, anzahl, failCount, worstRun, {}, {}, pflegeTriggeredCount, inputs, worstRunCare);

    } catch (e) {
        alert("Fehler in der Monte-Carlo-Simulation:\n\n" + e.message + "\n" + e.stack); console.error(e);
    } finally {
        progressBar.style.width = '100%'; setTimeout(() => { progressBarContainer.style.display = 'none'; }, 250); mcButton.disabled = false;
    }
}

/**
 * Führt einen historischen Backtest durch
 */
export function runBacktest() {
     try {
        const extraKPI = document.getElementById('monteCarloResults').style.display === 'block' ? (window.lastMcRunExtraKPI || {}) : {};
        document.getElementById('btButton').disabled = true;
        const inputs = getCommonInputs();
        const startJahr = parseInt(document.getElementById('simStartJahr').value); const endJahr = parseInt(document.getElementById('simEndJahr').value);
        if (startJahr < 1973 || endJahr > 2024 || startJahr >= endJahr) {
            alert(`Fehler: Bitte einen gültigen Zeitraum eingeben.\n- Der Zeitraum muss zwischen 1973 und 2024 liegen.`);
            document.getElementById('btButton').disabled = false; return;
        }

        // Historische Reihen als Arrays aufbauen (1970-2024)
        const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a,b)=>a-b).filter(y => y >= 1970);
        const wageGrowthArray = histYears.map(y => HISTORICAL_DATA[y].lohn_de || 0);
        const inflationPctArray = histYears.map(y => HISTORICAL_DATA[y].inflation_de || 0);
        const HIST_SERIES_START_YEAR = 1970;

        // Backtest-Kontext für Rentenanpassung
        const backtestCtx = {
            inputs: {
                rentAdj: {
                    mode: inputs.rentAdjMode || 'fix',
                    pct: inputs.rentAdjPct || 0
                }
            },
            series: {
                wageGrowth: wageGrowthArray,
                inflationPct: inflationPctArray,
                startYear: HIST_SERIES_START_YEAR
            },
            simStartYear: startJahr
        };

        let simState = {
            portfolio: initializePortfolio(inputs),
            baseFloor: inputs.startFloorBedarf,
            baseFlex: inputs.startFlexBedarf,
            lastState: null,
            currentAnnualPension: 0,
            currentAnnualPension2: 0,
            marketDataHist: { endeVJ: HISTORICAL_DATA[startJahr-1].msci_eur, endeVJ_1: HISTORICAL_DATA[startJahr-2].msci_eur, endeVJ_2: HISTORICAL_DATA[startJahr-3].msci_eur, endeVJ_3: HISTORICAL_DATA[startJahr-4].msci_eur, ath: 0, jahreSeitAth: 0 }
        };
        simState.marketDataHist.ath = Math.max(...Object.keys(HISTORICAL_DATA).filter(y => y < startJahr).map(y => HISTORICAL_DATA[y].msci_eur));

        let totalEntnahme = 0, kuerzungJahreAmStueck = 0, maxKuerzungStreak = 0, jahreMitKuerzung = 0, totalSteuern = 0;

        const p = (str, len) => String(str).padStart(len);
        const pf = (val, len) => p(`${(val || 0).toFixed(1)}%`, len);
        const pfInt = (val, len) => p(`${Math.round(val || 0)}%`, len);

        let header = [
            "Jahr".padEnd(4), "Entn.".padStart(7), "Floor".padStart(7), "Rente1".padStart(7), "Rente2".padStart(7), "RenteSum".padStart(8), "FloorDep".padStart(8), "Flex%".padStart(5), "Flex€".padStart(7), "Entn_real".padStart(9),
            "Adj%".padStart(5),
            "Status".padEnd(16), "Quote%".padStart(6), "Runway%".padStart(7),
            "R.Aktien".padStart(8), "R.Gold".padStart(8), "Infl.".padStart(5),
            "Handl.A".padStart(8), "Handl.G".padStart(8), "St.".padStart(6),
            "Aktien".padStart(8), "Gold".padStart(7), "Liq.".padStart(7),
            "NeedLiq".padStart(8), "GuardG".padStart(7), "GuardA".padStart(7), "GuardNote".padStart(16)
        ].join("  ");
        let log = header + "\n" + "=".repeat(header.length) + "\n";

        for (let jahr = startJahr; jahr <= endJahr; jahr++) {
            const dataVJ = HISTORICAL_DATA[jahr - 1];
            if (!dataVJ || !HISTORICAL_DATA[jahr]) { log += `${jahr}: Fehlende Daten.\n`; continue; }

            const jahresrenditeAktien = (HISTORICAL_DATA[jahr].msci_eur - dataVJ.msci_eur) / dataVJ.msci_eur;
            const jahresrenditeGold = (dataVJ.gold_eur_perf || 0) / 100;
            const yearData = { ...dataVJ, rendite: jahresrenditeAktien, gold_eur_perf: dataVJ.gold_eur_perf, zinssatz: dataVJ.zinssatz_de, inflation: dataVJ.inflation_de, jahr };

            const yearIndex = jahr - startJahr;

            // Berechne dynamische Rentenanpassung mit neuer Helper-Funktion
            const adjPct = computeAdjPctForYear(backtestCtx, yearIndex);

            // Übergebe die berechnete Anpassungsrate an simulateOneYear
            const adjustedInputs = { ...inputs, rentAdjPct: adjPct };
            const result = simulateOneYear(simState, adjustedInputs, yearData, yearIndex);

            if (result.isRuin) {
                log += `${String(jahr).padEnd(5)}... RUIN ...\n`; if (BREAK_ON_RUIN) break;
            }

            simState = result.newState;
            totalSteuern += result.totalTaxesThisYear;
            const row = result.logData;
            const { entscheidung, wertAktien, wertGold, liquiditaet } = row;
            totalEntnahme += entscheidung.jahresEntnahme;

            const netA = (row.vk?.vkAkt || 0) - (row.kaufAkt || 0);
            const netG = (row.vk?.vkGld || 0) - (row.kaufGld || 0);

            log += [
                p(jahr, 4),
                formatCurrencyShortLog(entscheidung.jahresEntnahme).padStart(7),
                formatCurrencyShortLog(row.floor_brutto).padStart(7),
                formatCurrencyShortLog(row.rente1 || 0).padStart(7),
                formatCurrencyShortLog(row.rente2 || 0).padStart(7),
                formatCurrencyShortLog(row.renteSum || 0).padStart(8),
                formatCurrencyShortLog(row.floor_aus_depot).padStart(8),
                pfInt(row.FlexRatePct, 5),
                formatCurrencyShortLog(row.flex_erfuellt_nominal).padStart(7),
                formatCurrencyShortLog(row.jahresentnahme_real).padStart(9),
                pf(adjPct, 5),
                row.aktionUndGrund.substring(0,15).padEnd(16),
                pf(row.QuoteEndPct, 6),
                pfInt(row.RunwayCoveragePct, 7),
                pf((row.RealReturnEquityPct||0)*100, 8),
                pf((row.RealReturnGoldPct||0)*100, 8),
                pf(dataVJ.inflation_de, 5),
                formatCurrencyShortLog(netA).padStart(8),
                formatCurrencyShortLog(netG).padStart(8),
                formatCurrencyShortLog(row.steuern_gesamt || 0).padStart(6),
                formatCurrencyShortLog(wertAktien).padStart(8),
                formatCurrencyShortLog(wertGold).padStart(7),
                formatCurrencyShortLog(liquiditaet).padStart(7),
                formatCurrencyShortLog(row.NeedLiq || 0).padStart(8),
                formatCurrencyShortLog(row.GuardGold || 0).padStart(7),
                formatCurrencyShortLog(row.GuardEq || 0).padStart(7),
                String(row.GuardNote || '').substring(0, 16).padStart(16)
            ].join("  ") + "\n";

            if (entscheidung.kuerzungProzent >= 10) { jahreMitKuerzung++; kuerzungJahreAmStueck++; }
            else { maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck); kuerzungJahreAmStueck = 0; }
        }
        maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck);
        const endVermoegen = portfolioTotal(simState.portfolio);
        document.getElementById('simulationResults').style.display = 'block';
        document.getElementById('simulationSummary').innerHTML = `
         <div class="summary-grid">
            <div class="summary-item"><strong>Startvermögen</strong><span>${formatCurrency(inputs.startVermoegen)}</span></div>
            <div class="summary-item"><strong>Endvermögen</strong><span>${formatCurrency(endVermoegen)}</span></div>
            <div class="summary-item highlight"><strong>Gesamte Entnahmen</strong><span>${formatCurrency(totalEntnahme)}</span></div>
            <div class="summary-item"><strong>Max. Kürzungsdauer</strong><span>${maxKuerzungStreak} Jahre</span></div>
            <div class="summary-item"><strong>Jahre mit Kürzung (>10%)</strong><span>${jahreMitKuerzung} von ${endJahr - startJahr + 1}</span></div>
            <div class="summary-item tax"><strong>Gezahlte Steuern</strong><span>${formatCurrency(totalSteuern)}</span></div>
        </div>`;
        document.getElementById('simulationLog').textContent = log;
    } catch (error) {
        alert("Ein Fehler ist im Backtest aufgetreten:\n\n" + error.message + "\n" + error.stack);
        console.error("Fehler in runBacktest():", error);
    } finally { document.getElementById('btButton').disabled = false; }
}

/**
 * Prüft Engine-Version und -Hash
 */
export function selfCheckEngine() {
    if (typeof window.Ruhestandsmodell_v30 === 'undefined') {
        const footer = document.getElementById('engine-mismatch-footer');
        if (footer) {
            footer.textContent = `FEHLER: Die Engine-Datei 'engine.js' konnte nicht geladen werden!`;
            footer.style.display = 'block';
        }
        return;
    };

    const fnBody = Object.values(window.Ruhestandsmodell_v30).reduce((s, fn) => s + (typeof fn === 'function' ? fn.toString() : ''), '');
    let hash = 0;
    for (let i = 0; i < fnBody.length; i++) {
        hash = ((hash << 5) - hash) + fnBody.charCodeAt(i);
        hash |= 0;
    }
    const currentHash = String(Math.abs(hash));
    const mismatch = window.Ruhestandsmodell_v30.VERSION !== ENGINE_VERSION;

    const footer = document.getElementById('engine-mismatch-footer');
    if (mismatch && footer) {
        footer.textContent = `WARNUNG: Engine-Version veraltet! Erwartet: ${ENGINE_VERSION}, gefunden: ${window.Ruhestandsmodell_v30.VERSION}`;
        footer.style.display = 'block';
    }
}

/**
 * DOM-Initialisierung und Event-Handler
 */
window.onload = function() {
    selfCheckEngine();
    prepareHistoricalData();

    function updatePflegeUIInfo() {
        const pflegeMaxFloorInput = document.getElementById('pflegeMaxFloor');
        let infoBadge = document.getElementById('pflegeInfoBadge');
        if (!infoBadge) {
            infoBadge = document.createElement('div');
            infoBadge.id = 'pflegeInfoBadge';
            infoBadge.style.fontSize = '0.8rem';
            infoBadge.style.color = '#555';
            infoBadge.style.textAlign = 'center';
            infoBadge.style.marginTop = '10px';
            infoBadge.style.padding = '5px';
            infoBadge.style.background = 'var(--background-color)';
            infoBadge.style.borderRadius = '4px';
            pflegeMaxFloorInput.parentElement.parentElement.appendChild(infoBadge);
        }

        const startFloor = parseFloat(document.getElementById('startFloorBedarf').value) || 0;
        const maxFloor = parseFloat(pflegeMaxFloorInput.value) || 0;
        const stufe1 = parseFloat(document.getElementById('pflegeStufe1Zusatz').value) || 0;
        const capHeute = Math.max(0, maxFloor - startFloor);

        infoBadge.innerHTML = `Heutiger Cap für Zusatzkosten: <strong>${formatCurrency(capHeute)}</strong> (Stufe 1 Bedarf: ${formatCurrency(stufe1)})`;
    }

    updateStartPortfolioDisplay();

    const allInputs = [
        'simStartVermoegen', 'depotwertAlt', 'zielLiquiditaet', 'simRisikoprofil',
        'goldAllokationAktiv', 'goldAllokationProzent', 'goldFloorProzent', 'rebalancingBand',
        'goldSteuerfrei', 'startFloorBedarf', 'startFlexBedarf',
        'einstandAlt', 'p1StartAlter', 'p1Geschlecht', 'p1SparerPauschbetrag', 'p1KirchensteuerPct', 'round5',
        'p1Monatsrente', 'p1StartInJahren', 'rentAdjMode', 'rentAdjPct',
        'pflegefallLogikAktivieren', 'pflegeModellTyp', 'pflegeStufe1Zusatz', 'pflegeStufe1FlexCut',
        'pflegeMaxFloor', 'pflegeRampUp', 'pflegeMinDauer', 'pflegeMaxDauer', 'pflegeKostenDrift',
        'pflegebeschleunigtMortalitaetAktivieren', 'pflegeTodesrisikoFaktor',
        'decumulationMode'
    ];
    allInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const eventType = (element.type === 'radio' || element.type === 'checkbox') ? 'change' : 'input';
            element.addEventListener(eventType, updateStartPortfolioDisplay);
        }
    });

    ['startFloorBedarf', 'pflegeMaxFloor', 'pflegeStufe1Zusatz'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', updatePflegeUIInfo);
    });

    const pflegeMaxFloorInput = document.getElementById('pflegeMaxFloor');
    if(pflegeMaxFloorInput) {
        pflegeMaxFloorInput.title = 'Gesamt-Floor inkl. Pflege. Der maximal mögliche Zusatzbedarf ergibt sich aus diesem Wert abzüglich des Basis-Floor-Bedarfs zum Zeitpunkt des Pflegeeintritts.';
    }
    updatePflegeUIInfo();

    const mcMethodeSelect = document.getElementById('mcMethode');
    mcMethodeSelect.addEventListener('change', () => { document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block'; });

    // Rentenanpassungs-Modus: Enable/Disable + Show/Hide Prozentfeld
    const rentAdjModeSelect = document.getElementById('rentAdjMode');
    const rentAdjPctInput = document.getElementById('rentAdjPct');
    if (rentAdjModeSelect && rentAdjPctInput) {
        const rentAdjPctGroup = rentAdjPctInput.closest('.form-group');

        rentAdjModeSelect.addEventListener('change', () => {
            const mode = rentAdjModeSelect.value;
            if (mode === 'fix') {
                rentAdjPctInput.disabled = false;
                rentAdjPctInput.title = 'Gemeinsame Rentenanpassung für beide Personen';
                if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'flex';
            } else {
                rentAdjPctInput.disabled = true;
                rentAdjPctInput.title = 'Wird automatisch über Koppelung gesteuert (' + (mode === 'wage' ? 'Lohnentwicklung' : 'Inflation') + ')';
                if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'none';
            }
        });
        // Initial state
        const initialMode = rentAdjModeSelect.value || 'fix';
        rentAdjPctInput.disabled = initialMode !== 'fix';
        if (initialMode !== 'fix') {
            rentAdjPctInput.title = 'Wird automatisch über Koppelung gesteuert (' + (initialMode === 'wage' ? 'Lohnentwicklung' : 'Inflation') + ')';
            if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'none';
        } else {
            rentAdjPctInput.title = 'Gemeinsame Rentenanpassung für beide Personen';
            if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'flex';
        }
    }

    // VERALTET: Alte Indexierungs-Logik (deaktiviert, versteckt)
    // const renteIndexArtSelect = document.getElementById('renteIndexierungsart');
    // renteIndexArtSelect.addEventListener('change', () => { document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none'; });

    const pflegeCheckbox = document.getElementById('pflegefallLogikAktivieren');
    pflegeCheckbox.addEventListener('change', () => { document.getElementById('pflegePanel').style.display = pflegeCheckbox.checked ? 'grid' : 'none'; });

    const pflegeModellSelect = document.getElementById('pflegeModellTyp');
    pflegeModellSelect.addEventListener('change', () => { document.getElementById('pflegeDauerContainer').style.display = pflegeModellSelect.value === 'akut' ? 'contents' : 'none'; });

    const pflegeMortalitaetCheckbox = document.getElementById('pflegebeschleunigtMortalitaetAktivieren');
    pflegeMortalitaetCheckbox.addEventListener('change', () => { document.getElementById('pflegeTodesrisikoContainer').style.display = pflegeMortalitaetCheckbox.checked ? 'flex' : 'none'; });

    // Partner/Rente-2-Einstellungen: Toggle Show/Hide
    const chkPartnerAktiv = document.getElementById('chkPartnerAktiv');
    const sectionRente2 = document.getElementById('sectionRente2');
    if (chkPartnerAktiv && sectionRente2) {
        chkPartnerAktiv.addEventListener('change', () => {
            const aktiv = chkPartnerAktiv.checked;
            sectionRente2.style.display = aktiv ? 'block' : 'none';
            localStorage.setItem('sim_partnerAktiv', aktiv ? '1' : '0');
        });
    }

    const careDetailsCheckbox = document.getElementById('toggle-care-details');
    if (careDetailsCheckbox) {
        careDetailsCheckbox.checked = localStorage.getItem('showCareDetails') === '1';

        careDetailsCheckbox.addEventListener('change', (e) => {
            const showDetails = e.currentTarget.checked;
            localStorage.setItem('showCareDetails', showDetails ? '1' : '0');

            if (window.globalWorstRunData && window.globalWorstRunData.rows.length > 0) {
                 document.getElementById('worstRunLog').textContent = renderWorstRunLog(
                    window.globalWorstRunData.rows,
                    window.globalWorstRunData.caR_Threshold,
                    { showCareDetails: showDetails }
                );
            }
        });
    }

    const stressSelect = document.getElementById('stressPreset');
    if (stressSelect) {
        Object.entries(STRESS_PRESETS).forEach(([key, preset]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.label;
            stressSelect.appendChild(option);
        });
    }

    document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block';
    // VERALTET: document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none';
    document.getElementById('pflegePanel').style.display = pflegeCheckbox.checked ? 'grid' : 'none';
    document.getElementById('pflegeDauerContainer').style.display = pflegeModellSelect.value === 'akut' ? 'contents' : 'none';
    document.getElementById('pflegeTodesrisikoContainer').style.display = pflegeMortalitaetCheckbox.checked ? 'flex' : 'none';

    const sweepMetricSelect = document.getElementById('sweepMetric');
    const sweepAxisXSelect = document.getElementById('sweepAxisX');
    const sweepAxisYSelect = document.getElementById('sweepAxisY');

    if (sweepMetricSelect) {
        sweepMetricSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    if (sweepAxisXSelect) {
        sweepAxisXSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    if (sweepAxisYSelect) {
        sweepAxisYSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    // Grid-Size-Counter für Parameter-Sweep
    function updateSweepGridSize() {
        const rangeInputs = {
            runwayMin: document.getElementById('sweepRunwayMin').value,
            runwayTarget: document.getElementById('sweepRunwayTarget').value,
            targetEq: document.getElementById('sweepTargetEq').value,
            rebalBand: document.getElementById('sweepRebalBand').value,
            maxSkimPct: document.getElementById('sweepMaxSkimPct').value,
            maxBearRefillPct: document.getElementById('sweepMaxBearRefillPct').value,
            goldTargetPct: document.getElementById('sweepGoldTargetPct').value
        };

        let totalSize = 1;
        let hasError = false;

        try {
            for (const rangeStr of Object.values(rangeInputs)) {
                if (!rangeStr || !rangeStr.trim()) {
                    hasError = true;
                    break;
                }
                const values = parseRangeInput(rangeStr);
                if (values.length === 0) {
                    hasError = true;
                    break;
                }
                totalSize *= values.length;
            }
        } catch (error) {
            hasError = true;
        }

        const gridSizeEl = document.getElementById('sweepGridSize');
        if (gridSizeEl) {
            if (hasError) {
                gridSizeEl.textContent = 'Grid: ? Kombis';
                gridSizeEl.style.color = '#999';
            } else if (totalSize > 300) {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis (⚠ Max: 300)`;
                gridSizeEl.style.color = '#d32f2f';
            } else {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis`;
                gridSizeEl.style.color = 'var(--secondary-color)';
            }
        }
    }

    // Add event listeners to all sweep input fields
    const sweepInputIds = [
        'sweepRunwayMin', 'sweepRunwayTarget', 'sweepTargetEq', 'sweepRebalBand',
        'sweepMaxSkimPct', 'sweepMaxBearRefillPct', 'sweepGoldTargetPct'
    ];

    sweepInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateSweepGridSize);
        }
    });

    // Initial update
    updateSweepGridSize();

    // Tab switching logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked button and corresponding panel
            button.classList.add('active');
            const tabId = 'tab-' + button.dataset.tab;
            const targetPanel = document.getElementById(tabId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Sweep defaults with localStorage persistence
    initSweepDefaultsWithLocalStorageFallback();

    // Partner/Rente-2 configuration with localStorage persistence
    initRente2ConfigWithLocalStorage();
};

/**
 * Initialisiert Rente-Konfiguration (Person 1 + Partner) mit localStorage
 *
 * NEU: Gemeinsame Rentenanpassung für beide Personen (rentAdjPct)
 *
 * Smoke Tests für Zwei-Personen-Haushalt:
 * 1. Partner aus (chkPartnerAktiv=false):
 *    - sectionRente2 ist hidden
 *    - Im Backtest/MC: rente2 === 0, renteSum === rente1
 *
 * 2. Partner an (chkPartnerAktiv=true):
 *    - sectionRente2 ist sichtbar
 *    - Vor Startalter: rente2 === 0
 *    - Ab Startalter: rente2 wächst jährlich um rentAdjPct%
 *
 * 3. Backtest-Logs:
 *    - Pro Jahr: rente1, rente2, renteSum in separaten Spalten
 *    - Keine negativen Werte
 *    - renteSum wird vom Floor-Bedarf abgezogen
 *
 * 4. UI-Persistenz (LocalStorage):
 *    - Werte bleiben nach Reload erhalten
 */
function initRente2ConfigWithLocalStorage() {
    const defaults = {
        // Person 1
        p1StartAlter: 63,
        p1Geschlecht: 'm',
        p1SparerPB: 1000,
        p1KirchensteuerPct: 9,
        p1Monatsrente: 500,
        p1StartInJahren: 5,
        rentAdjMode: 'wage',
        rentAdjPct: 2.0,
        // Person 2
        aktiv: false,
        r2Geschlecht: 'w',
        r2StartAlter: 60,
        r2StartInJahren: 0,
        r2Monatsrente: 1500,
        r2SparerPB: 0,
        r2KirchensteuerPct: 0,
        r2Steuerquote: 0
    };

    const keys = {
        // Person 1
        p1StartAlter: 'sim_p1StartAlter',
        p1Geschlecht: 'sim_p1Geschlecht',
        p1SparerPB: 'sim_p1SparerPauschbetrag',
        p1KirchensteuerPct: 'sim_p1KirchensteuerPct',
        p1Monatsrente: 'sim_p1Monatsrente',
        p1StartInJahren: 'sim_p1StartInJahren',
        rentAdjMode: 'sim_rentAdjMode',
        rentAdjPct: 'sim_rentAdjPct',
        // Person 2
        aktiv: 'sim_partnerAktiv',
        r2Geschlecht: 'sim_r2Geschlecht',
        r2StartAlter: 'sim_r2StartAlter',
        r2StartInJahren: 'sim_r2StartInJahren',
        r2Monatsrente: 'sim_r2Monatsrente',
        r2SparerPB: 'sim_r2SparerPauschbetrag',
        r2KirchensteuerPct: 'sim_r2KirchensteuerPct',
        r2Steuerquote: 'sim_r2Steuerquote',
        // VERALTET: Alte Keys für Abwärtskompatibilität
        r2Brutto_OLD: 'sim_r2Brutto',
        anpassung_OLD: 'sim_r2Anpassung'
    };

    // Person 1 Felder
    const p1StartAlter = document.getElementById('p1StartAlter');
    const p1Geschlecht = document.getElementById('p1Geschlecht');
    const p1SparerPB = document.getElementById('p1SparerPauschbetrag');
    const p1KirchensteuerPct = document.getElementById('p1KirchensteuerPct');
    const p1Monatsrente = document.getElementById('p1Monatsrente');
    const p1StartInJahren = document.getElementById('p1StartInJahren');
    const rentAdjMode = document.getElementById('rentAdjMode');
    const rentAdjPct = document.getElementById('rentAdjPct');

    // Person 2 Felder
    const chkPartnerAktiv = document.getElementById('chkPartnerAktiv');
    const sectionRente2 = document.getElementById('sectionRente2');
    const r2Geschlecht = document.getElementById('r2Geschlecht');
    const r2StartAlter = document.getElementById('r2StartAlter');
    const r2StartInJahren = document.getElementById('r2StartInJahren');
    const r2Monatsrente = document.getElementById('r2Monatsrente');
    const r2SparerPB = document.getElementById('r2SparerPauschbetrag');
    const r2KirchensteuerPct = document.getElementById('r2KirchensteuerPct');
    const r2Steuerquote = document.getElementById('r2Steuerquote');

    // ========== Person 1 Initialisierung ==========
    if (p1StartAlter) {
        const saved = localStorage.getItem(keys.p1StartAlter);
        p1StartAlter.value = saved || defaults.p1StartAlter;
        p1StartAlter.addEventListener('input', () => localStorage.setItem(keys.p1StartAlter, p1StartAlter.value));
    }

    if (p1Geschlecht) {
        const saved = localStorage.getItem(keys.p1Geschlecht);
        p1Geschlecht.value = saved || defaults.p1Geschlecht;
        p1Geschlecht.addEventListener('change', () => localStorage.setItem(keys.p1Geschlecht, p1Geschlecht.value));
    }

    if (p1SparerPB) {
        const saved = localStorage.getItem(keys.p1SparerPB);
        p1SparerPB.value = saved || defaults.p1SparerPB;
        p1SparerPB.addEventListener('input', () => localStorage.setItem(keys.p1SparerPB, p1SparerPB.value));
    }

    if (p1KirchensteuerPct) {
        const saved = localStorage.getItem(keys.p1KirchensteuerPct);
        p1KirchensteuerPct.value = saved || defaults.p1KirchensteuerPct;
        p1KirchensteuerPct.addEventListener('change', () => localStorage.setItem(keys.p1KirchensteuerPct, p1KirchensteuerPct.value));
    }

    if (p1Monatsrente) {
        const saved = localStorage.getItem(keys.p1Monatsrente);
        p1Monatsrente.value = saved || defaults.p1Monatsrente;
        p1Monatsrente.addEventListener('input', () => localStorage.setItem(keys.p1Monatsrente, p1Monatsrente.value));
    }

    if (p1StartInJahren) {
        const saved = localStorage.getItem(keys.p1StartInJahren);
        p1StartInJahren.value = saved || defaults.p1StartInJahren;
        p1StartInJahren.addEventListener('input', () => localStorage.setItem(keys.p1StartInJahren, p1StartInJahren.value));
    }

    // Rentenanpassung
    if (rentAdjMode) {
        const saved = localStorage.getItem(keys.rentAdjMode);
        rentAdjMode.value = saved || defaults.rentAdjMode;
        rentAdjMode.addEventListener('change', () => localStorage.setItem(keys.rentAdjMode, rentAdjMode.value));
    }

    if (rentAdjPct) {
        let saved = localStorage.getItem(keys.rentAdjPct);
        // Abwärtskompatibilität: Falls noch nicht gesetzt, versuche alten Wert zu übernehmen
        if (!saved || saved === '') {
            const oldR2Anpassung = localStorage.getItem(keys.anpassung_OLD);
            if (oldR2Anpassung) {
                saved = oldR2Anpassung;
                localStorage.setItem(keys.rentAdjPct, saved);
                console.log('Migrated old r2Anpassung value to rentAdjPct:', saved);
            }
        }
        rentAdjPct.value = saved || defaults.rentAdjPct;
        rentAdjPct.addEventListener('input', () => localStorage.setItem(keys.rentAdjPct, rentAdjPct.value));
    }

    // ========== Person 2 Initialisierung ==========
    if (!chkPartnerAktiv || !sectionRente2) return;

    // Lade gespeicherte Werte
    const savedAktiv = localStorage.getItem(keys.aktiv);
    chkPartnerAktiv.checked = savedAktiv === '1';
    sectionRente2.style.display = chkPartnerAktiv.checked ? 'block' : 'none';

    if (r2Geschlecht) {
        const saved = localStorage.getItem(keys.r2Geschlecht);
        r2Geschlecht.value = saved || defaults.r2Geschlecht;
        r2Geschlecht.addEventListener('change', () => localStorage.setItem(keys.r2Geschlecht, r2Geschlecht.value));
    }

    if (r2StartAlter) {
        const saved = localStorage.getItem(keys.r2StartAlter);
        r2StartAlter.value = saved || defaults.r2StartAlter;
        r2StartAlter.addEventListener('input', () => localStorage.setItem(keys.r2StartAlter, r2StartAlter.value));
    }

    if (r2StartInJahren) {
        const saved = localStorage.getItem(keys.r2StartInJahren);
        r2StartInJahren.value = saved || defaults.r2StartInJahren;
        r2StartInJahren.addEventListener('input', () => localStorage.setItem(keys.r2StartInJahren, r2StartInJahren.value));
    }

    // Migration: r2Brutto (jährlich) → r2Monatsrente (monatlich)
    if (r2Monatsrente) {
        let saved = localStorage.getItem(keys.r2Monatsrente);
        if (!saved || saved === '' || saved === '0') {
            const oldBrutto = localStorage.getItem(keys.r2Brutto_OLD);
            if (oldBrutto && parseFloat(oldBrutto) > 0) {
                saved = String(Math.round(parseFloat(oldBrutto) / 12));
                localStorage.setItem(keys.r2Monatsrente, saved);
                console.log('Migrated r2Brutto (' + oldBrutto + ' €/Jahr) to r2Monatsrente (' + saved + ' €/Monat)');
            }
        }
        r2Monatsrente.value = saved || defaults.r2Monatsrente;
        r2Monatsrente.addEventListener('input', () => localStorage.setItem(keys.r2Monatsrente, r2Monatsrente.value));
    }

    if (r2SparerPB) {
        const saved = localStorage.getItem(keys.r2SparerPB);
        r2SparerPB.value = saved || defaults.r2SparerPB;
        r2SparerPB.addEventListener('input', () => localStorage.setItem(keys.r2SparerPB, r2SparerPB.value));
    }

    if (r2KirchensteuerPct) {
        const saved = localStorage.getItem(keys.r2KirchensteuerPct);
        r2KirchensteuerPct.value = saved || defaults.r2KirchensteuerPct;
        r2KirchensteuerPct.addEventListener('change', () => localStorage.setItem(keys.r2KirchensteuerPct, r2KirchensteuerPct.value));
    }

    if (r2Steuerquote) {
        const saved = localStorage.getItem(keys.r2Steuerquote);
        r2Steuerquote.value = saved || defaults.r2Steuerquote;
        r2Steuerquote.addEventListener('input', () => localStorage.setItem(keys.r2Steuerquote, r2Steuerquote.value));
    }

    // Kopiere P1-Werte in versteckte Felder für Abwärtskompatibilität
    const syncP1ToOld = () => {
        const startAlterOld = document.getElementById('startAlter');
        const geschlechtOld = document.getElementById('geschlecht');
        const startSPBOld = document.getElementById('startSPB');
        const kirchensteuerSatzOld = document.getElementById('kirchensteuerSatz');
        const renteMonatlichOld = document.getElementById('renteMonatlich');
        const renteStartOffsetJahreOld = document.getElementById('renteStartOffsetJahre');

        if (startAlterOld && p1StartAlter) startAlterOld.value = p1StartAlter.value;
        if (geschlechtOld && p1Geschlecht) geschlechtOld.value = p1Geschlecht.value;
        if (startSPBOld && p1SparerPB) startSPBOld.value = p1SparerPB.value;
        if (kirchensteuerSatzOld && p1KirchensteuerPct) kirchensteuerSatzOld.value = (parseFloat(p1KirchensteuerPct.value) / 100).toFixed(2);
        if (renteMonatlichOld && p1Monatsrente) renteMonatlichOld.value = p1Monatsrente.value;
        if (renteStartOffsetJahreOld && p1StartInJahren) renteStartOffsetJahreOld.value = p1StartInJahren.value;
    };

    // Initial sync
    syncP1ToOld();

    // Sync bei jedem Input
    [p1StartAlter, p1Geschlecht, p1SparerPB, p1KirchensteuerPct, p1Monatsrente, p1StartInJahren].forEach(el => {
        if (el) el.addEventListener('input', syncP1ToOld);
        if (el) el.addEventListener('change', syncP1ToOld);
    });
}

/**
 * Initialisiert Sweep-Defaults mit localStorage-Fallback
 */
function initSweepDefaultsWithLocalStorageFallback() {
    const map = [
        ["sweepRunwayMin", "sim.sweep.runwayMin"],
        ["sweepRunwayTarget", "sim.sweep.runwayTarget"],
        ["sweepTargetEq", "sim.sweep.targetEq"],
        ["sweepRebalBand", "sim.sweep.rebalBand"],
        ["sweepMaxSkimPct", "sim.sweep.maxSkimPct"],
        ["sweepMaxBearRefillPct", "sim.sweep.maxBearRefillPct"],
        ["sweepGoldTargetPct", "sim.sweep.goldTarget"]
    ];

    for (const [id, key] of map) {
        const el = document.getElementById(id);
        if (!el) continue;

        const saved = localStorage.getItem(key);
        if (saved !== null && saved !== undefined && saved !== '') {
            el.value = saved;
        }

        el.addEventListener("change", () => localStorage.setItem(key, el.value));
        el.addEventListener("input", () => localStorage.setItem(key, el.value));
    }
}

/**
 * Führt einen Parameter-Sweep durch
 */
export async function runParameterSweep() {
    const sweepButton = document.getElementById('sweepButton');
    sweepButton.disabled = true;
    const progressBarContainer = document.getElementById('sweep-progress-bar-container');
    const progressBar = document.getElementById('sweep-progress-bar');

    try {
        prepareHistoricalData();

        const rangeInputs = {
            runwayMin: document.getElementById('sweepRunwayMin').value,
            runwayTarget: document.getElementById('sweepRunwayTarget').value,
            targetEq: document.getElementById('sweepTargetEq').value,
            rebalBand: document.getElementById('sweepRebalBand').value,
            maxSkimPct: document.getElementById('sweepMaxSkimPct').value,
            maxBearRefillPct: document.getElementById('sweepMaxBearRefillPct').value,
            goldTargetPct: document.getElementById('sweepGoldTargetPct').value
        };

        const paramLabels = {
            runwayMin: 'Runway Min',
            runwayTarget: 'Runway Target',
            targetEq: 'Target Eq',
            rebalBand: 'Rebal Band',
            maxSkimPct: 'Max Skim %',
            maxBearRefillPct: 'Max Bear Refill %',
            goldTargetPct: 'Gold Target %'
        };

        const paramRanges = {};
        try {
            for (const [key, rangeStr] of Object.entries(rangeInputs)) {
                const values = parseRangeInput(rangeStr);
                if (values.length === 0) {
                    alert(`Leeres Range-Input für ${paramLabels[key] || key}.\n\nBitte geben Sie einen Wert ein:\n- Einzelwert: 24\n- Liste: 24,36,48\n- Range: 24:12:48`);
                    return;
                }
                paramRanges[key] = values;
            }
        } catch (error) {
            alert(`Fehler beim Parsen der Range-Eingaben:\n\n${error.message}\n\nErlaubte Formate:\n- Einzelwert: 24\n- Kommaliste: 50,60,70\n- Range: start:step:end (z.B. 18:6:36)`);
            return;
        }

        // Calculate combinations with limit check
        const arrays = Object.values(paramRanges);
        const { combos, tooMany, size } = cartesianProductLimited(arrays, 300);

        if (tooMany) {
            alert(`Zu viele Kombinationen: ${size} (theoretisch)\n\nMaximum: 300\n\nBitte reduzieren Sie die Anzahl der Parameter-Werte.`);
            return;
        }

        if (combos.length === 0) {
            alert('Keine Parameter-Kombinationen gefunden.');
            return;
        }

        // Convert back to object format
        const paramKeys = Object.keys(paramRanges);
        const paramCombinations = combos.map(combo => {
            const obj = {};
            paramKeys.forEach((key, i) => {
                obj[key] = combo[i];
            });
            return obj;
        });

        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        // WICHTIG: Basis-Inputs nur EINMAL lesen und einfrieren (Deep Clone)
        const baseInputs = deepClone(getCommonInputs());
        const anzahlRuns = parseInt(document.getElementById('mcAnzahl').value) || 100;
        const maxDauer = parseInt(document.getElementById('mcDauer').value) || 35;
        const blockSize = parseInt(document.getElementById('mcBlockSize').value) || 5;
        const baseSeed = parseInt(document.getElementById('mcSeed').value) || 12345;
        const methode = document.getElementById('mcMethode').value;

        const sweepResults = [];

        // P2-Invarianz-Guard: Referenz-Invarianten für Person 2 (wird beim ersten Case gesetzt)
        let REF_P2_INVARIANTS = null;

        for (let comboIdx = 0; comboIdx < paramCombinations.length; comboIdx++) {
            const params = paramCombinations[comboIdx];

            // Erstelle Case-spezifische Inputs durch Deep Clone der Basis
            const inputs = deepClone(baseInputs);

            // Überschreibe nur erlaubte Parameter (Whitelist + Blockliste prüfen)
            const caseOverrides = {
                runwayMinMonths: params.runwayMin,
                runwayTargetMonths: params.runwayTarget,
                targetEq: params.targetEq,
                rebalBand: params.rebalBand,
                maxSkimPctOfEq: params.maxSkimPct,
                maxBearRefillPctOfEq: params.maxBearRefillPct
            };

            if (params.goldTargetPct !== undefined) {
                caseOverrides.goldZielProzent = params.goldTargetPct;
                caseOverrides.goldAktiv = params.goldTargetPct > 0;
            }

            // Wende Overrides an mit Whitelist/Blockliste-Prüfung
            for (const [k, v] of Object.entries(caseOverrides)) {
                if (isBlockedKey(k)) {
                    console.warn(`[SWEEP] Ignoriere Person-2-Key im Sweep: ${k}`);
                    continue;
                }
                if (SWEEP_ALLOWED_KEYS.size && !SWEEP_ALLOWED_KEYS.has(k)) {
                    console.warn(`[SWEEP] Key nicht auf Whitelist, übersprungen: ${k}`);
                    continue;
                }
                // Setze erlaubten Parameter
                inputs[k] = v;
            }

            // P2-Invarianz-Guard: Extrahiere Basis-Parameter (NICHT abgeleitete Zeitserien!)
            const p2Invariants = extractP2Invariants(inputs);

            if (REF_P2_INVARIANTS === null) {
                // Erste Case-Referenz setzen
                REF_P2_INVARIANTS = p2Invariants;
                console.log(`[SWEEP] Referenz-P2-Invarianten gesetzt (Case ${comboIdx}):`, p2Invariants);
            }

            // Prüfe P2-Invarianz VOR der Simulation (keine YearLogs mehr nötig!)
            const p2VarianceWarning = !areP2InvariantsEqual(p2Invariants, REF_P2_INVARIANTS);

            if (p2VarianceWarning) {
                console.warn(`[SWEEP][ASSERT] P2-Basis-Parameter variieren im Sweep (Case ${comboIdx}), sollten konstant bleiben!`);
                console.warn('[SWEEP] Referenz:', REF_P2_INVARIANTS);
                console.warn('[SWEEP] Aktuell:', p2Invariants);
            }

            const rand = rng(baseSeed + comboIdx);
            const stressCtxMaster = buildStressContext(inputs.stressPreset, rand);

            const runOutcomes = [];

            for (let i = 0; i < anzahlRuns; i++) {
                let failed = false;
                const startYearIndex = Math.floor(rand() * annualData.length);
                let simState = initMcRunState(inputs, startYearIndex);

                const depotWertHistorie = [portfolioTotal(simState.portfolio)];
                let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren);
                let stressCtx = cloneStressContext(stressCtxMaster);

                let minRunway = Infinity;

                for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                    const currentAge = inputs.startAlter + simulationsJahr;

                    let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                    yearData = applyStressOverride(yearData, stressCtx, rand);

                    careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);

                    let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
                    if (careMeta && careMeta.active && inputs.pflegebeschleunigtMortalitaetAktivieren) {
                        qx = Math.min(1.0, qx * inputs.pflegeTodesrisikoFaktor);
                    }

                    if (rand() < qx) break;

                    // Berechne dynamische Rentenanpassung basierend auf Modus (fix/wage/cpi)
                    const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                    const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct };

                    const result = simulateOneYear(simState, adjustedInputs, yearData, simulationsJahr, careMeta);

                    if (result.isRuin) {
                        failed = true;
                        if (BREAK_ON_RUIN) break;
                    } else {
                        simState = result.newState;
                        depotWertHistorie.push(portfolioTotal(simState.portfolio));

                        const runway = result.logData.RunwayCoveragePct || 0;
                        if (runway < minRunway) minRunway = runway;
                    }
                }

                const endVermoegen = failed ? 0 : portfolioTotal(simState.portfolio);
                const { maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);

                runOutcomes.push({
                    finalVermoegen: endVermoegen,
                    maxDrawdown: maxDDpct,
                    minRunway: minRunway === Infinity ? 0 : minRunway,
                    failed: failed
                });
            }

            const metrics = aggregateSweepMetrics(runOutcomes);
            metrics.warningR2Varies = p2VarianceWarning; // Füge Warnung zu Metriken hinzu
            sweepResults.push({ params, metrics });

            const progress = ((comboIdx + 1) / paramCombinations.length) * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${Math.round(progress)}%`;

            if (comboIdx % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        window.sweepResults = sweepResults;
        window.sweepParamRanges = paramRanges;

        displaySweepResults();

        document.getElementById('sweepResults').style.display = 'block';

    } catch (e) {
        alert("Fehler im Parameter-Sweep:\n\n" + e.message);
        console.error('Parameter-Sweep Fehler:', e);

        // Reset UI on error
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
    } finally {
        if (progressBar.style.width !== '0%') {
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
        }
        setTimeout(() => { progressBarContainer.style.display = 'none'; }, 250);
        sweepButton.disabled = false;
    }
}

/**
 * Zeigt die Sweep-Ergebnisse als Heatmap an
 */
function displaySweepResults() {
    try {
        const metricKey = document.getElementById('sweepMetric').value;
        const xParam = document.getElementById('sweepAxisX').value;
        const yParam = document.getElementById('sweepAxisY').value;

        const xValues = window.sweepParamRanges[xParam] || [];
        const yValues = window.sweepParamRanges[yParam] || [];

        const heatmapHtml = renderSweepHeatmapSVG(
            window.sweepResults,
            metricKey,
            xParam,
            yParam,
            xValues,
            yValues
        );

        document.getElementById('sweepHeatmap').innerHTML = heatmapHtml;
    } catch (error) {
        alert("Fehler beim Rendern der Sweep-Heatmap:\n\n" + error.message);
        console.error('displaySweepResults Fehler:', error);
        document.getElementById('sweepHeatmap').innerHTML = '<p style="color: red;">Fehler beim Rendern der Heatmap. Siehe Konsole für Details.</p>';
    }
}

/**
 * Führt einen umfassenden Sweep-Selbsttest durch (Developer-Modus)
 *
 * Tests:
 * 1. Baseline-Test: Rente2 bleibt über Cases konstant (Whitelist greift)
 * 2. Negativtest: Simuliert absichtliche R2-Änderung (sollte erkannt werden)
 * 3. Deep-Copy-Test: baseInputs bleiben nach Sweep unverändert
 *
 * Aktivierung: Dev-Mode Toggle oder localStorage.setItem('sim.devMode', '1')
 */
async function runSweepSelfTest() {
    const resultsDiv = document.getElementById('sweepSelfTestResults');
    const button = document.getElementById('sweepSelfTestButton');

    button.disabled = true;
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="color: #666;">🔬 Sweep-Tests laufen...</p>';

    console.log('[SWEEP-TEST] ========================================');
    console.log('[SWEEP-TEST] Starte Sweep-Selbsttest-Suite');
    console.log('[SWEEP-TEST] ========================================');

    try {
        prepareHistoricalData();

        const logMessages = [];
        let allTestsPassed = true;

        // =====================================================================
        // TEST 1: Baseline - P2-Invarianten bleiben über Cases konstant
        // =====================================================================
        console.log('[SWEEP-TEST] Test 1: Baseline (P2-Invarianz)');
        logMessages.push('<strong>Test 1: Baseline (P2-Invarianz) - NEUE PRÜFUNG</strong>');

        const testCases = [
            { rebalBand: 5, targetEq: 60 },
            { rebalBand: 10, targetEq: 60 },
            { rebalBand: 15, targetEq: 60 }
        ];

        const baseInputs = deepClone(getCommonInputs());
        const baseInputsJson = JSON.stringify(baseInputs); // Für Deep-Copy-Test
        const anzahlRuns = 10;
        const maxDauer = 10;
        const baseSeed = 12345;
        const methode = 'regime_markov';

        let REF_P2_INV = null;
        let test1Passed = true;

        for (let caseIdx = 0; caseIdx < testCases.length; caseIdx++) {
            const testCase = testCases[caseIdx];
            const inputs = deepClone(baseInputs);
            inputs.rebalBand = testCase.rebalBand;
            inputs.targetEq = testCase.targetEq;

            // NEUE PRÜFUNG: Extrahiere P2-Basis-Parameter (keine Simulation nötig!)
            const p2Inv = extractP2Invariants(inputs);

            if (REF_P2_INV === null) {
                REF_P2_INV = p2Inv;
                console.log(`[SWEEP-TEST] ✓ Case ${caseIdx + 1}: Referenz gesetzt (rebalBand=${testCase.rebalBand})`);
                console.log(`[SWEEP-TEST]   P2-Invarianten:`, p2Inv);
                logMessages.push(`&nbsp;&nbsp;✓ Case ${caseIdx + 1}: Referenz gesetzt (rebalBand=${testCase.rebalBand})`);
                logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;aktiv=${p2Inv.aktiv}, brutto=${p2Inv.brutto}, rentAdjPct=${p2Inv.rentAdjPct}`);
            } else {
                if (areP2InvariantsEqual(p2Inv, REF_P2_INV)) {
                    console.log(`[SWEEP-TEST] ✓ Case ${caseIdx + 1}: P2-Invarianten konstant (rebalBand=${testCase.rebalBand})`);
                    logMessages.push(`&nbsp;&nbsp;✓ Case ${caseIdx + 1}: P2-Invarianten konstant (rebalBand=${testCase.rebalBand})`);
                } else {
                    test1Passed = false;
                    allTestsPassed = false;
                    console.error(`[SWEEP-TEST] ✗ Case ${caseIdx + 1}: P2-Invarianten variieren! (rebalBand=${testCase.rebalBand})`);
                    console.error(`[SWEEP-TEST]   Referenz:`, REF_P2_INV);
                    console.error(`[SWEEP-TEST]   Aktuell:`, p2Inv);
                    logMessages.push(`&nbsp;&nbsp;<span style="color: red;">✗ Case ${caseIdx + 1}: P2-Invarianten variieren! (rebalBand=${testCase.rebalBand})</span>`);
                    logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;Referenz: ${JSON.stringify(REF_P2_INV)}`);
                    logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;Aktuell: ${JSON.stringify(p2Inv)}`);
                }
            }
        }

        logMessages.push(test1Passed ? '<span style="color: green;">✓ Test 1 bestanden</span>' : '<span style="color: red;">✗ Test 1 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // TEST 2: Deep-Copy-Test - baseInputs bleiben unverändert
        // =====================================================================
        console.log('[SWEEP-TEST] Test 2: Deep-Copy-Schutz');
        logMessages.push('<strong>Test 2: Deep-Copy-Schutz</strong>');

        const baseInputsAfter = JSON.stringify(baseInputs);
        const test2Passed = baseInputsJson === baseInputsAfter;

        if (test2Passed) {
            console.log('[SWEEP-TEST] ✓ baseInputs blieben unverändert nach Cases');
            logMessages.push('&nbsp;&nbsp;✓ baseInputs blieben unverändert nach Cases');
        } else {
            console.error('[SWEEP-TEST] ✗ baseInputs wurden modifiziert! Deep-Copy fehlerhaft!');
            logMessages.push('&nbsp;&nbsp;<span style="color: red;">✗ baseInputs wurden modifiziert! Deep-Copy fehlerhaft!</span>');
            allTestsPassed = false;
        }

        logMessages.push(test2Passed ? '<span style="color: green;">✓ Test 2 bestanden</span>' : '<span style="color: red;">✗ Test 2 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // TEST 3: Negativtest - P2-Änderung sollte erkannt werden
        // =====================================================================
        console.log('[SWEEP-TEST] Test 3: Negativtest (P2-Änderung sollte erkannt werden)');
        logMessages.push('<strong>Test 3: Negativtest (P2-Änderung erkennen) - NEUE PRÜFUNG</strong>');

        // Simuliere zwei Cases, wobei beim zweiten absichtlich partner.brutto geändert wird
        const negTestCases = [
            { rebalBand: 10, p2Change: false },
            { rebalBand: 15, p2Change: true } // Hier ändern wir absichtlich partner.brutto
        ];

        let NEG_REF_P2_INV = null;
        let test3Passed = false; // Sollte NACH dem zweiten Case true werden (wenn Änderung erkannt wurde)

        for (let caseIdx = 0; caseIdx < negTestCases.length; caseIdx++) {
            const testCase = negTestCases[caseIdx];
            const inputs = deepClone(baseInputs);
            inputs.rebalBand = testCase.rebalBand;

            // ABSICHTLICH P2 ändern beim zweiten Case (nur für Test!)
            if (testCase.p2Change && inputs.partner && inputs.partner.aktiv) {
                inputs.partner.brutto = inputs.partner.brutto * 1.5; // +50%
                console.log('[SWEEP-TEST] ⚠ Absichtlich partner.brutto geändert (für Negativtest)');
            }

            // NEUE PRÜFUNG: Extrahiere P2-Invarianten (keine Simulation nötig!)
            const p2Inv = extractP2Invariants(inputs);

            if (NEG_REF_P2_INV === null) {
                NEG_REF_P2_INV = p2Inv;
                console.log(`[SWEEP-TEST] ✓ Neg-Case ${caseIdx + 1}: Referenz gesetzt`);
                logMessages.push(`&nbsp;&nbsp;✓ Neg-Case ${caseIdx + 1}: Referenz gesetzt`);
            } else {
                if (areP2InvariantsEqual(p2Inv, NEG_REF_P2_INV)) {
                    console.error(`[SWEEP-TEST] ✗ Neg-Case ${caseIdx + 1}: P2-Änderung wurde NICHT erkannt!`);
                    logMessages.push(`&nbsp;&nbsp;<span style="color: red;">✗ Neg-Case ${caseIdx + 1}: P2-Änderung wurde NICHT erkannt!</span>`);
                    allTestsPassed = false;
                } else {
                    console.log(`[SWEEP-TEST] ✓ Neg-Case ${caseIdx + 1}: P2-Änderung korrekt erkannt!`);
                    console.log(`[SWEEP-TEST]   Referenz:`, NEG_REF_P2_INV);
                    console.log(`[SWEEP-TEST]   Geändert:`, p2Inv);
                    logMessages.push(`&nbsp;&nbsp;<span style="color: green;">✓ Neg-Case ${caseIdx + 1}: P2-Änderung korrekt erkannt!</span>`);
                    logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;brutto: ${NEG_REF_P2_INV.brutto} → ${p2Inv.brutto}`);
                    test3Passed = true;
                }
            }
        }

        logMessages.push(test3Passed ? '<span style="color: green;">✓ Test 3 bestanden</span>' : '<span style="color: red;">✗ Test 3 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // Gesamtergebnis
        // =====================================================================
        console.log('[SWEEP-TEST] ========================================');
        console.log('[SWEEP-TEST] Gesamtergebnis: ' + (allTestsPassed ? '✓ ALLE TESTS BESTANDEN' : '✗ TESTS FEHLGESCHLAGEN'));
        console.log('[SWEEP-TEST] ========================================');

        const statusColor = allTestsPassed ? 'green' : 'red';
        const statusText = allTestsPassed ? '✓ Alle Tests bestanden' : '✗ Einige Tests fehlgeschlagen';

        let html = `<div style="padding: 15px; background-color: ${allTestsPassed ? '#e8f5e9' : '#ffebee'}; border-radius: 4px; border: 1px solid ${statusColor};">`;
        html += `<strong style="color: ${statusColor}; font-size: 1.1rem;">${statusText}</strong><br><br>`;
        html += `<div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">`;
        html += logMessages.join('<br>');
        html += `</div>`;
        html += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 0.8rem; color: #666;">`;
        html += `Hinweis: Console-Logs enthalten detaillierte Test-Ausgaben mit [SWEEP-TEST] Prefix.`;
        html += `</div></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
        console.error('[SWEEP-TEST] Fehler:', error);
    } finally {
        button.disabled = false;
    }
}

// Globale Funktionen für HTML onclick-Handler
window.runMonteCarlo = runMonteCarlo;
window.runBacktest = runBacktest;
window.runParameterSweep = runParameterSweep;
window.displaySweepResults = displaySweepResults;
window.formatCurrency = formatCurrency;
window.runSweepSelfTest = runSweepSelfTest;

// Für Parity Smoke Test
window.simulateOneYear = simulateOneYear;
window.annualData = annualData;
