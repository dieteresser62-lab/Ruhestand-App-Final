"use strict";

import { rng, quantile, sum, mean, formatCurrency, parseRange, parseRangeInput, cartesianProduct, cartesianProductLimited } from './simulator-utils.js';
import { ENGINE_VERSION, ENGINE_HASH, STRESS_PRESETS, BREAK_ON_RUIN, MORTALITY_TABLE, HISTORICAL_DATA, annualData } from './simulator-data.js';
import {
    getCommonInputs, updateStartPortfolioDisplay, initializePortfolio,
    prepareHistoricalData, buildStressContext, applyStressOverride, computeRentAdjRate
} from './simulator-portfolio.js';
import {
    simulateOneYear, initMcRunState, makeDefaultCareMeta, sampleNextYearData, computeRunStatsFromSeries, updateCareMeta
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
 * Verwendet structuredClone falls verfügbar, sonst JSON-Fallback
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
 */
const SWEEP_ALLOWED_KEYS = new Set([
    // Strategie-Parameter
    'targetEq', 'rebalBand', 'maxSkimPctOfEq', 'maxBearRefillPctOfEq',
    'runwayMinMonths', 'runwayTargetMonths',
    'goldZielProzent', 'goldFloorProzent', 'goldAktiv',
    // Basis-Parameter (gemeinsam)
    'rentAdjMode', 'rentAdjPct',
    'startFloorBedarf', 'startFlexBedarf',
    // Weitere erlaubte Parameter können hier hinzugefügt werden
]);

/**
 * Blockliste: Regex-Patterns für Person-2-Felder
 * Diese Felder dürfen NICHT im Sweep überschrieben werden
 */
const SWEEP_BLOCK_PATTERNS = [
    /^partner(\.|$)/i,   // z.B. partner.aktiv, partner.monatsrente, ...
    /^r2[A-Z_]/,         // z.B. r2Monatsrente, r2StartInJahren, r2Steuerquote, ...
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
 * Extrahiert Rente-2-Serie aus YearLog
 * @param {Array} yearLog - Array mit Jahr-für-Jahr-Logs
 * @returns {Array|null} Array mit Rente-2-Werten pro Jahr, oder null
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
 * Prüft, ob zwei Rente-2-Serien identisch sind (innerhalb Toleranz)
 * @param {Array} series1 - Erste Serie
 * @param {Array} series2 - Zweite Serie
 * @param {number} tolerance - Maximale Abweichung (Standard: 1e-6)
 * @returns {boolean} true wenn identisch
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

            let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren);
            let stressCtx = cloneStressContext(stressCtxMaster);

            const stressYears = stressCtxMaster?.preset?.years ?? 0;
            const stressPortfolioValues = [portfolioTotal(simState.portfolio)];
            let stressYearsAbove45 = 0;
            let stressCutYears = 0;
            const stressRealWithdrawals = [];
            let postStressRecoveryYears = null;

            for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                const currentAge = inputs.startAlter + simulationsJahr;
                lebensdauer = simulationsJahr + 1;

                let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                yearData = applyStressOverride(yearData, stressCtx, rand);

                careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);

                if (careMeta && careMeta.active) careEverActive = true;
                if (careMeta && careMeta.triggered && triggeredAge === null) triggeredAge = currentAge;

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
                    // Bei Ruin ist das Depot definitiv erschöpft - setze Alter
                    if (!depotErschoepfungAlterGesetzt) {
                        alterBeiErschoepfung[i] = currentAge;
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
                      alterBeiErschoepfung[i] = currentAge;
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
                        pflege_aktiv: !!(careMeta && careMeta.active),
                        pflege_zusatz_floor: careMeta?.zusatzFloorZiel ?? 0,
                        pflege_zusatz_floor_delta: careMeta?.zusatzFloorDelta ?? 0,
                        pflege_flex_faktor: careMeta?.flexFactor ?? 1,
                        pflege_kumuliert: careMeta?.kumulierteKosten ?? 0,
                        pflege_floor_anchor: careMeta?.log_floor_anchor ?? 0,
                        pflege_maxfloor_anchor: careMeta?.log_maxfloor_anchor ?? 0,
                        pflege_cap_zusatz: careMeta?.log_cap_zusatz ?? 0,
                        pflege_delta_flex: careMeta?.log_delta_flex ?? 0
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

            const cumulCareDepotCosts = careMeta?.kumulierteKosten || 0;
            endWealthWithCare[i] = endVermoegen;
            endWealthNoCareProxyArr[i] = endVermoegen + cumulCareDepotCosts;
            if (triggeredAge !== null) {
                pflegeTriggeredCount++; entryAges.push(triggeredAge); careDepotCosts.push(cumulCareDepotCosts);
                if (failed) shortfallWithCareCount++;
            }
            if (endWealthNoCareProxyArr[i] <= 0) shortfallNoCareProxyCount++;
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
          depotCosts_median: careDepotCosts.length ? quantile(careDepotCosts, 0.5) : 0
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

        // R2-Assertion: Referenz-Serie für Rente 2 (wird beim ersten Case gesetzt)
        let REF_R2 = null;

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

            const rand = rng(baseSeed + comboIdx);
            const stressCtxMaster = buildStressContext(inputs.stressPreset, rand);

            const runOutcomes = [];
            let sampleYearLog = null; // Speichert Year-Log vom ersten Run für R2-Prüfung

            for (let i = 0; i < anzahlRuns; i++) {
                let failed = false;
                const startYearIndex = Math.floor(rand() * annualData.length);
                let simState = initMcRunState(inputs, startYearIndex);

                const depotWertHistorie = [portfolioTotal(simState.portfolio)];
                let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren);
                let stressCtx = cloneStressContext(stressCtxMaster);

                let minRunway = Infinity;

                // Nur beim ersten Run: Year-Log sammeln für R2-Prüfung
                const collectYearLog = (i === 0);
                const currentRunLog = collectYearLog ? [] : null;

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
                        if (collectYearLog && currentRunLog) {
                            currentRunLog.push({
                                jahr: simulationsJahr + 1,
                                rente2: 0,
                                isRuin: true
                            });
                        }
                        if (BREAK_ON_RUIN) break;
                    } else {
                        simState = result.newState;
                        depotWertHistorie.push(portfolioTotal(simState.portfolio));

                        const runway = result.logData.RunwayCoveragePct || 0;
                        if (runway < minRunway) minRunway = runway;

                        // Sammle Year-Log für R2-Prüfung (nur erster Run)
                        if (collectYearLog && currentRunLog) {
                            currentRunLog.push({
                                jahr: simulationsJahr + 1,
                                rente2: result.logData.rente2 || 0,
                                Rente2: result.logData.rente2 || 0 // Fallback verschiedene Feldnamen
                            });
                        }
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

                // Speichere Year-Log vom ersten Run für R2-Prüfung
                if (collectYearLog && currentRunLog && !sampleYearLog) {
                    sampleYearLog = currentRunLog;
                }
            }

            // R2-Assertion: Prüfe ob Rente 2 konstant über Cases bleibt
            let r2VarianceWarning = false;
            if (sampleYearLog) {
                const r2 = extractR2Series(sampleYearLog);
                if (r2 && r2.length > 0) {
                    if (REF_R2 === null) {
                        // Erste Case-Referenz setzen
                        REF_R2 = r2;
                        console.log(`[SWEEP] Referenz-R2-Serie gesetzt (Case ${comboIdx}):`, r2.slice(0, 5), '...');
                    } else {
                        // Vergleiche mit Referenz
                        if (!areR2SeriesEqual(r2, REF_R2)) {
                            console.warn(`[SWEEP][ASSERT] Rente2 variiert im Sweep (Case ${comboIdx}), sollte konstant bleiben.`);
                            console.warn('[SWEEP] Referenz:', REF_R2.slice(0, 5), '...');
                            console.warn('[SWEEP] Aktuell:', r2.slice(0, 5), '...');
                            r2VarianceWarning = true;
                        }
                    }
                } else if (baseInputs.partner && baseInputs.partner.aktiv) {
                    console.warn('[SWEEP] Konnte Rente2-Serie nicht extrahieren aus Year-Log (Case ' + comboIdx + ').');
                }
            }

            const metrics = aggregateSweepMetrics(runOutcomes);
            metrics.warningR2Varies = r2VarianceWarning; // Füge Warnung zu Metriken hinzu
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
 * Führt einen Sweep-Selbsttest durch (nur für Debug-Zwecke)
 * Testet ob Person-2-Rente über Cases konstant bleibt
 */
async function runSweepSelfTest() {
    const resultsDiv = document.getElementById('sweepSelfTestResults');
    const button = document.getElementById('sweepSelfTestButton');

    button.disabled = true;
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="color: #666;">Test läuft...</p>';

    try {
        prepareHistoricalData();

        // Mini-Sweep: Nur rebalBand und targetEq variieren
        const testCases = [
            { rebalBand: 5, targetEq: 60 },
            { rebalBand: 10, targetEq: 60 },
            { rebalBand: 15, targetEq: 60 }
        ];

        const baseInputs = deepClone(getCommonInputs());
        const anzahlRuns = 10; // Nur 10 Runs pro Case für schnellen Test
        const maxDauer = 10; // Nur 10 Jahre
        const baseSeed = 12345;
        const methode = 'regime_markov';

        let REF_R2 = null;
        let allPassed = true;
        const logMessages = [];

        for (let caseIdx = 0; caseIdx < testCases.length; caseIdx++) {
            const testCase = testCases[caseIdx];
            const inputs = deepClone(baseInputs);
            inputs.rebalBand = testCase.rebalBand;
            inputs.targetEq = testCase.targetEq;

            const rand = rng(baseSeed + caseIdx);
            const stressCtxMaster = buildStressContext(inputs.stressPreset, rand);

            // Führe nur ersten Run aus, um R2 zu extrahieren
            let sampleYearLog = null;
            const startYearIndex = Math.floor(rand() * annualData.length);
            let simState = initMcRunState(inputs, startYearIndex);
            let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren);
            let stressCtx = cloneStressContext(stressCtxMaster);
            const currentRunLog = [];

            for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                const currentAge = inputs.startAlter + simulationsJahr;
                let yearData = sampleNextYearData(simState, methode, 5, rand, stressCtx);
                yearData = applyStressOverride(yearData, stressCtx, rand);
                careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);

                const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct };
                const result = simulateOneYear(simState, adjustedInputs, yearData, simulationsJahr, careMeta);

                if (result.isRuin) break;

                simState = result.newState;
                currentRunLog.push({
                    jahr: simulationsJahr + 1,
                    rente2: result.logData.rente2 || 0,
                    Rente2: result.logData.rente2 || 0
                });
            }

            sampleYearLog = currentRunLog;

            // R2-Prüfung
            const r2 = extractR2Series(sampleYearLog);
            if (r2 && r2.length > 0) {
                if (REF_R2 === null) {
                    REF_R2 = r2;
                    logMessages.push(`✓ Case ${caseIdx + 1}: Referenz gesetzt (rebalBand=${testCase.rebalBand})`);
                } else {
                    if (areR2SeriesEqual(r2, REF_R2)) {
                        logMessages.push(`✓ Case ${caseIdx + 1}: R2 konstant (rebalBand=${testCase.rebalBand})`);
                    } else {
                        allPassed = false;
                        logMessages.push(`✗ Case ${caseIdx + 1}: R2 variiert! (rebalBand=${testCase.rebalBand})`);
                        logMessages.push(`  Referenz: [${REF_R2.slice(0, 3).join(', ')}...]`);
                        logMessages.push(`  Aktuell:  [${r2.slice(0, 3).join(', ')}...]`);
                    }
                }
            } else {
                logMessages.push(`⚠ Case ${caseIdx + 1}: Konnte R2 nicht extrahieren`);
            }
        }

        // Ergebnis anzeigen
        const statusColor = allPassed ? 'green' : 'red';
        const statusText = allPassed ? '✓ Test bestanden' : '✗ Test fehlgeschlagen';

        let html = `<div style="padding: 10px; background-color: ${allPassed ? '#e8f5e9' : '#ffebee'}; border-radius: 4px; border: 1px solid ${statusColor};">`;
        html += `<strong style="color: ${statusColor};">${statusText}</strong><br><br>`;
        html += `<div style="font-family: monospace; font-size: 0.85rem;">`;
        html += logMessages.join('<br>');
        html += `</div></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
        console.error('Sweep-Selbsttest Fehler:', error);
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
