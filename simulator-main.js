"use strict";

/**
 * ============================================================================
 * SIMULATOR-MAIN.JS - Hauptmodul für Monte-Carlo & Backtest
 * ============================================================================
 *
 * Dieses Modul enthält die Kernfunktionen für die Simulation:
 * - runMonteCarlo() - Monte-Carlo-Simulation
 * - runBacktest() - Historischer Backtest
 * - selfCheckEngine() - Engine-Validierung
 *
 * Die anderen Funktionen wurden in separate Module ausgelagert:
 * - simulator-sweep.js - Parameter Sweep
 * - simulator-persistence.js - Export/Import
 * - simulator-ui-init.js - UI-Initialisierung
 * ============================================================================
 */

import { rng, quantile, formatCurrency } from './simulator-utils.js';
import { ENGINE_VERSION, BREAK_ON_RUIN, MORTALITY_TABLE, HISTORICAL_DATA, annualData } from './simulator-data.js';
import {
    getCommonInputs, updateStartPortfolioDisplay, initializePortfolio,
    prepareHistoricalData, buildStressContext, applyStressOverride, computeRentAdjRate
} from './simulator-portfolio.js';
import {
    simulateOneYear,
    initMcRunState,
    makeDefaultCareMeta,
    sampleNextYearData,
    computeRunStatsFromSeries,
    updateCareMeta,
    calcCareCost,
    computeCareMortalityMultiplier
} from './simulator-engine.js';
import {
    portfolioTotal,
    displayMonteCarloResults,
    renderWorstRunLog,
    loadDetailLevel,
    BACKTEST_LOG_DETAIL_KEY,
    LEGACY_LOG_DETAIL_KEY
} from './simulator-results.js';
import { formatCurrencyShortLog } from './simulator-utils.js';

// Importiere aus den neuen Modulen
import {
    runParameterSweep,
    displaySweepResults,
    runSweepSelfTest,
    deepClone
} from './simulator-sweep.js';
import {
    exportWorstRunLogData,
    exportBacktestLogData,
    renderBacktestLog,
    buildBacktestColumnDefinitions,
    formatCellForDisplay
} from './simulator-persistence.js';
import {
    initSimulatorUI,
    applyPflegeKostenPreset,
    updatePflegeUIInfo
} from './simulator-ui-init.js';

/**
 * Schnelles strukturiertes Cloning für Stress-Context
 */
function cloneStressContext(ctx) {
    if (!ctx) return null;
    return {
        type: ctx.type,
        remainingYears: ctx.remainingYears,
        pickableIndices: ctx.pickableIndices,
        preset: ctx.preset
    };
}

/**
 * Normalisiert die Konfiguration der Hinterbliebenenrente.
 */
function normalizeWidowOptions(rawOptions) {
    const defaults = {
        mode: 'stop',
        percent: 0,
        marriageOffsetYears: 0,
        minMarriageYears: 0
    };
    if (!rawOptions) return defaults;
    return {
        mode: rawOptions.mode === 'percent' ? 'percent' : 'stop',
        percent: Math.max(0, Math.min(1, Number(rawOptions.percent) || 0)),
        marriageOffsetYears: Math.max(0, Math.floor(Number(rawOptions.marriageOffsetYears) || 0)),
        minMarriageYears: Math.max(0, Math.floor(Number(rawOptions.minMarriageYears) || 0))
    };
}

/**
 * Berechnet die Rentenanpassungsrate für ein bestimmtes Jahr
 */
function computeAdjPctForYear(ctx, yearIdx) {
    const mode = ctx.inputs.rentAdj?.mode || "fix";
    if (mode === "fix") return Number(ctx.inputs.rentAdj?.pct || 0);

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
        const widowOptions = normalizeWidowOptions(inputs.widowOptions);

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

        const p1CareYearsArr = new Uint16Array(anzahl);
        const p2CareYearsArr = new Uint16Array(anzahl);
        const bothCareYearsArr = new Uint16Array(anzahl);
        const entryAgesP2 = [];
        let p2TriggeredCount = 0;
        const maxAnnualCareSpendTriggered = [];

        for (let i = 0; i < anzahl; i++) {
            let failed = false;
            const startYearIndex = Math.floor(rand() * annualData.length);
            let simState = initMcRunState(inputs, startYearIndex);

            const depotWertHistorie = [portfolioTotal(simState.portfolio)];
            let careMeta = {
                p1: makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.geschlecht),
                p2: null // Zweite Person nicht simuliert
            };
            let stressCtx = cloneStressContext(stressCtxMaster);

            let kuerzungsJahre = 0, maxKuerzung = 0, jahreMitKuerzung = 0;
            let lebensjahre = 0, totalTax = 0, jahreOhneFlex = 0;

            let minRunway = Infinity;
            let maxEquityQuote = 0;
            let yearsAbove45 = 0;
            let annualCutsThisRun = [];
            let recoveryYear = -1;
            let p1CareYears = 0, p2CareYears = 0, bothCareYears = 0;
            let p1CareTrig = false, p2CareTrig = false;
            let maxAnnualCareThisRun = 0;

            const logDataRows = [];

            for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                const currentAge = inputs.startAlter + simulationsJahr;

                let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                yearData = applyStressOverride(yearData, stressCtx, rand);

                careMeta.p1 = updateCareMeta(careMeta.p1, inputs, currentAge, yearData, rand);

                let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
                const careFactor = computeCareMortalityMultiplier(careMeta.p1, inputs);
                if (careFactor > 1) {
                    qx = Math.min(1.0, qx * careFactor);
                }

                if (rand() < qx) break;
                lebensjahre++;

                const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct };

                const { zusatzFloor: careFloor } = calcCareCost(careMeta.p1, careMeta.p2);
                const annualCareCost = careFloor;
                if (annualCareCost > maxAnnualCareThisRun) maxAnnualCareThisRun = annualCareCost;

                if (careMeta.p1?.active) { p1CareYears++; if (!p1CareTrig) p1CareTrig = true; }
                if (careMeta.p2?.active) { p2CareYears++; if (!p2CareTrig) p2CareTrig = true; }
                if (careMeta.p1?.active && careMeta.p2?.active) bothCareYears++;

                const result = simulateOneYear(simState, adjustedInputs, yearData, simulationsJahr, careMeta.p1, careFloor);

                if (result.isRuin) {
                    failed = true;
                    if (BREAK_ON_RUIN) break;
                } else {
                    simState = result.newState;
                    totalTax += result.totalTaxesThisYear;
                    const row = result.logData;
                    logDataRows.push(row);

                    depotWertHistorie.push(portfolioTotal(simState.portfolio));

                    const runway = row.RunwayCoveragePct || 0;
                    if (runway < minRunway) minRunway = runway;

                    const eq = row.QuoteEndPct || 0;
                    if (eq > maxEquityQuote) maxEquityQuote = eq;
                    if (eq > 45) yearsAbove45++;

                    const cut = row.kuerzungProzent || 0;
                    annualCutsThisRun.push(cut);
                    if (cut >= 10) {
                        jahreMitKuerzung++;
                        maxKuerzung = Math.max(maxKuerzung, cut);
                    }

                    if (row.FlexRatePct < 1) jahreOhneFlex++;
                }
            }

            const endVermoegen = failed ? 0 : portfolioTotal(simState.portfolio);
            finalOutcomes[i] = endVermoegen;
            taxOutcomes[i] = totalTax;
            kpiLebensdauer[i] = lebensjahre;
            kpiKuerzungsjahre[i] = jahreMitKuerzung;
            kpiMaxKuerzung[i] = maxKuerzung;
            anteilJahreOhneFlex[i] = lebensjahre > 0 ? (jahreOhneFlex / lebensjahre) : 0;

            const { volatility, maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);
            volatilities[i] = volatility;
            maxDrawdowns[i] = maxDDpct;

            if (endVermoegen < DEPOT_DEPLETION_THRESHOLD) {
                depotErschoepft[i] = 1;
                failCount++;
            }

            stress_maxDrawdowns[i] = maxDDpct;
            stress_timeQuoteAbove45[i] = lebensjahre > 0 ? (yearsAbove45 / lebensjahre) * 100 : 0;
            stress_cutYears[i] = jahreMitKuerzung;
            stress_CaR_P10_Real[i] = annualCutsThisRun.length > 0 ? quantile(annualCutsThisRun, 0.10) : 0;
            stress_recoveryYears[i] = recoveryYear >= 0 ? recoveryYear : maxDauer;

            p1CareYearsArr[i] = p1CareYears;
            p2CareYearsArr[i] = p2CareYears;
            bothCareYearsArr[i] = bothCareYears;

            if (p1CareTrig || p2CareTrig) {
                pflegeTriggeredCount++;
                if (maxAnnualCareThisRun > 0) maxAnnualCareSpendTriggered.push(maxAnnualCareThisRun);
            }

            endWealthWithCare[i] = endVermoegen;

            if (endVermoegen < worstRun.finalVermoegen) {
                worstRun = { finalVermoegen: endVermoegen, logDataRows: [...logDataRows], failed };
            }

            if ((p1CareTrig || p2CareTrig) && endVermoegen < worstRunCare.finalVermoegen) {
                worstRunCare = { finalVermoegen: endVermoegen, logDataRows: [...logDataRows], failed, hasCare: true };
            }

            const progress = ((i + 1) / anzahl) * 100;
            progressBar.style.width = `${progress}%`;

            if (i % 50 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Calculate mean for kpiLebensdauer
        const lebensdauerArr = Array.from(kpiLebensdauer);
        const lebensdauerMean = lebensdauerArr.reduce((a, b) => a + b, 0) / lebensdauerArr.length;

        // Calculate depotErschoepfungsQuote
        const depotErschoepfungsQuote = (failCount / anzahl) * 100;

        const aggregatedResults = {
            finalOutcomes: {
                p10: quantile(finalOutcomes, 0.10),
                p50: quantile(finalOutcomes, 0.50),
                p90: quantile(finalOutcomes, 0.90),
                p50_successful: quantile(finalOutcomes.filter(v => v > 0), 0.50)
            },
            taxOutcomes: {
                p50: quantile(taxOutcomes, 0.50)
            },
            kpiLebensdauer: {
                mean: lebensdauerMean,
                p50: quantile(lebensdauerArr, 0.50)
            },
            depotErschoepfungsQuote: depotErschoepfungsQuote,
            kpiKuerzungsjahre: {
                p50: quantile(Array.from(kpiKuerzungsjahre), 0.50)
            },
            kpiMaxKuerzung: {
                p50: quantile(Array.from(kpiMaxKuerzung), 0.50)
            },
            maxDrawdowns: {
                p50: quantile(maxDrawdowns, 0.50),
                p90: quantile(maxDrawdowns, 0.90)
            },
            volatilities: {
                p50: quantile(volatilities, 0.50)
            },
            anteilJahreOhneFlex: {
                p50: quantile(anteilJahreOhneFlex, 0.50) * 100
            },
            stressKPI: {
                years: inputs.stressYears || 0,
                presetKey: inputs.stressPreset || 'NONE',
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
        const startJahr = parseInt(document.getElementById('simStartJahr').value);
        const endJahr = parseInt(document.getElementById('simEndJahr').value);
        if (startJahr < 1951 || endJahr > 2024 || startJahr >= endJahr) {
            alert(`Fehler: Bitte einen gültigen Zeitraum eingeben.\n- Der Zeitraum muss zwischen 1951 und 2024 liegen.`);
            document.getElementById('btButton').disabled = false; return;
        }

        const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b).filter(y => y >= 1950);
        const wageGrowthArray = histYears.map(y => HISTORICAL_DATA[y].lohn_de || 0);
        const inflationPctArray = histYears.map(y => HISTORICAL_DATA[y].inflation_de || 0);
        const HIST_SERIES_START_YEAR = 1950;

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

        const getHistVal = (y, prop) => (HISTORICAL_DATA[y] ? HISTORICAL_DATA[y][prop] : 0);

        let simState = {
            portfolio: initializePortfolio(inputs),
            baseFloor: inputs.startFloorBedarf,
            baseFlex: inputs.startFlexBedarf,
            lastState: null,
            currentAnnualPension: 0,
            currentAnnualPension2: 0,
            marketDataHist: {
                endeVJ: getHistVal(startJahr - 1, 'msci_eur'),
                endeVJ_1: getHistVal(startJahr - 2, 'msci_eur'),
                endeVJ_2: getHistVal(startJahr - 3, 'msci_eur'),
                endeVJ_3: getHistVal(startJahr - 4, 'msci_eur'),
                ath: 0,
                jahreSeitAth: 0,
                capeRatio: inputs.marketCapeRatio || 0
            }
        };

        const prevYearsVals = Object.keys(HISTORICAL_DATA)
            .filter(y => y < startJahr)
            .map(y => HISTORICAL_DATA[y].msci_eur);
        simState.marketDataHist.ath = prevYearsVals.length > 0 ? Math.max(...prevYearsVals) : (simState.marketDataHist.endeVJ || 0);

        let totalEntnahme = 0, kuerzungJahreAmStueck = 0, maxKuerzungStreak = 0, jahreMitKuerzung = 0, totalSteuern = 0;
        const logRows = [];

        const logDetailLevel = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY);
        const columns = buildBacktestColumnDefinitions(logDetailLevel);

        const headerLine = columns.map(col => {
            const headerText = col.header || '';
            const align = col.align === 'left' ? 'left' : 'right';
            return align === 'left'
                ? headerText.padEnd(col.width)
                : headerText.padStart(col.width);
        }).join('  ');
        let log = headerLine + '\n' + '='.repeat(headerLine.length) + '\n';

        for (let jahr = startJahr; jahr <= endJahr; jahr++) {
            const dataVJ = HISTORICAL_DATA[jahr - 1];
            if (!dataVJ || !HISTORICAL_DATA[jahr]) { log += `${jahr}: Fehlende Daten.\n`; continue; }

            const jahresrenditeAktien = (HISTORICAL_DATA[jahr].msci_eur - dataVJ.msci_eur) / dataVJ.msci_eur;
            const jahresrenditeGold = (dataVJ.gold_eur_perf || 0) / 100;
            const yearData = { ...dataVJ, rendite: jahresrenditeAktien, gold_eur_perf: dataVJ.gold_eur_perf, zinssatz: dataVJ.zinssatz_de, inflation: dataVJ.inflation_de, jahr };

            const yearIndex = jahr - startJahr;
            const adjPct = computeAdjPctForYear(backtestCtx, yearIndex);

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

            logRows.push({
                jahr, row, entscheidung, wertAktien, wertGold, liquiditaet,
                netA, netG, adjPct, inflationVJ: dataVJ.inflation_de
            });

            const line = columns.map(col => formatCellForDisplay(col, logRows[logRows.length - 1])).join('  ');
            log += line + '\n';

            if (entscheidung.kuerzungProzent >= 10) { jahreMitKuerzung++; kuerzungJahreAmStueck++; }
            else { maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck); kuerzungJahreAmStueck = 0; }
        }
        maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck);
        const endVermoegen = portfolioTotal(simState.portfolio);

        window.globalBacktestData = { rows: logRows, startJahr };

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

// Initialisierung bei DOM-Load
window.onload = function() {
    initSimulatorUI();
};

// Globale Funktionen für HTML onclick-Handler
window.runMonteCarlo = runMonteCarlo;
window.runBacktest = runBacktest;
window.runParameterSweep = runParameterSweep;
window.displaySweepResults = displaySweepResults;
window.formatCurrency = formatCurrency;
window.runSweepSelfTest = runSweepSelfTest;
window.renderBacktestLog = renderBacktestLog;
window.exportWorstRunLogData = exportWorstRunLogData;
window.exportBacktestLogData = exportBacktestLogData;

// Für Parity Smoke Test
window.simulateOneYear = simulateOneYear;
window.annualData = annualData;
