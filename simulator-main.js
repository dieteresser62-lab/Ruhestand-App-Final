"use strict";

import { rng, quantile, sum, mean, formatCurrency, parseRange, parseRangeInput, cartesianProduct, cartesianProductLimited } from './simulator-utils.js';
import { ENGINE_VERSION, ENGINE_HASH, STRESS_PRESETS, BREAK_ON_RUIN, MORTALITY_TABLE, HISTORICAL_DATA, annualData } from './simulator-data.js';
import {
    getCommonInputs, updateStartPortfolioDisplay, initializePortfolio,
    prepareHistoricalData, buildStressContext, applyStressOverride, computeTwoPersonPensions
} from './simulator-portfolio.js';
import {
    simulateOneYear, initMcRunState, makeDefaultCareMeta, sampleNextYearData, computeRunStatsFromSeries, updateCareMeta, updateCareMetaTwoPersons
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

            let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.zweiPersonenHaushalt);
            let stressCtx = cloneStressContext(stressCtxMaster);

            // Zwei-Personen-Haushalt: Status-Tracking
            let personStatus = inputs.zweiPersonenHaushalt ? { person1Alive: true, person2Alive: true } : null;
            let lastPensions = inputs.zweiPersonenHaushalt ? { person1: 0, person2: 0 } : null;
            let spendingReductionApplied = false;

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

                // Pflege- und Mortalitätslogik
                if (inputs.zweiPersonenHaushalt) {
                    const age1 = inputs.startAlter + simulationsJahr;
                    const age2 = inputs.partnerStartAlter + simulationsJahr;

                    // Pflege für beide Personen updaten
                    careMeta = updateCareMetaTwoPersons(careMeta, inputs, age1, age2, yearData, rand);

                    if (careMeta?.person1?.active || careMeta?.person2?.active) careEverActive = true;
                    if (careMeta?.person1?.triggered && triggeredAge === null) triggeredAge = age1;
                    if (careMeta?.person2?.triggered && triggeredAge === null) triggeredAge = age2;

                    // Mortalität für Person 1
                    if (personStatus.person1Alive) {
                        let qx1 = MORTALITY_TABLE[inputs.geschlecht][age1] || 1;
                        if (careMeta?.person1?.active && inputs.pflegebeschleunigtMortalitaetAktivieren) {
                            qx1 = Math.min(1.0, qx1 * inputs.pflegeTodesrisikoFaktor);
                        }
                        if (rand() < qx1) {
                            personStatus.person1Alive = false;
                            // Ausgaben um 20% reduzieren beim ersten Todesfall
                            if (!spendingReductionApplied) {
                                simState.baseFloor *= 0.8;
                                simState.baseFlex *= 0.8;
                                spendingReductionApplied = true;
                            }
                        }
                    }

                    // Mortalität für Person 2
                    if (personStatus.person2Alive) {
                        let qx2 = MORTALITY_TABLE[inputs.partnerGeschlecht][age2] || 1;
                        if (careMeta?.person2?.active && inputs.pflegebeschleunigtMortalitaetAktivieren) {
                            qx2 = Math.min(1.0, qx2 * inputs.pflegeTodesrisikoFaktor);
                        }
                        if (rand() < qx2) {
                            personStatus.person2Alive = false;
                            // Ausgaben um 20% reduzieren beim ersten Todesfall
                            if (!spendingReductionApplied) {
                                simState.baseFloor *= 0.8;
                                simState.baseFlex *= 0.8;
                                spendingReductionApplied = true;
                            }
                        }
                    }

                    // Simulation endet, wenn beide verstorben sind
                    if (!personStatus.person1Alive && !personStatus.person2Alive) break;

                    // Renten für beide Personen berechnen
                    const pensions = computeTwoPersonPensions({
                        yearIndex: simulationsJahr,
                        inputs,
                        lastPensions,
                        personStatus,
                        inflRate: yearData.inflation,
                        lohnRate: yearData.lohn
                    });
                    lastPensions = { person1: pensions.person1, person2: pensions.person2 };
                    simState.currentAnnualPension = pensions.total;
                } else {
                    // Single-Person-Logik (unverändert)
                    careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);

                    if (careMeta && careMeta.active) careEverActive = true;
                    if (careMeta && careMeta.triggered && triggeredAge === null) triggeredAge = currentAge;

                    let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
                    if (careMeta && careMeta.active && inputs.pflegebeschleunigtMortalitaetAktivieren) {
                        qx = Math.min(1.0, qx * inputs.pflegeTodesrisikoFaktor);
                    }

                    if (rand() < qx) break;
                }

                const result = simulateOneYear(simState, inputs, yearData, simulationsJahr, careMeta, personStatus);

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

        let simState = {
            portfolio: initializePortfolio(inputs),
            baseFloor: inputs.startFloorBedarf,
            baseFlex: inputs.startFlexBedarf,
            lastState: null,
            currentAnnualPension: { a: 0, b: 0 },
            marketDataHist: { endeVJ: HISTORICAL_DATA[startJahr-1].msci_eur, endeVJ_1: HISTORICAL_DATA[startJahr-2].msci_eur, endeVJ_2: HISTORICAL_DATA[startJahr-3].msci_eur, endeVJ_3: HISTORICAL_DATA[startJahr-4].msci_eur, ath: 0, jahreSeitAth: 0 }
        };
        simState.marketDataHist.ath = Math.max(...Object.keys(HISTORICAL_DATA).filter(y => y < startJahr).map(y => HISTORICAL_DATA[y].msci_eur));

        let totalEntnahme = 0, kuerzungJahreAmStueck = 0, maxKuerzungStreak = 0, jahreMitKuerzung = 0, totalSteuern = 0;

        const p = (str, len) => String(str).padStart(len);
        const pf = (val, len) => p(`${(val || 0).toFixed(1)}%`, len);
        const pfInt = (val, len) => p(`${Math.round(val || 0)}%`, len);

        let header = [
            "Jahr".padEnd(4), "Entn.".padStart(7), "Floor".padStart(7), "Rente".padStart(7), "FloorDep".padStart(8), "Flex%".padStart(5), "Flex€".padStart(7), "Entn_real".padStart(9),
            "Status".padEnd(16), "Quote%".padStart(6), "Runway%".padStart(7),
            "R.Aktien".padStart(8), "R.Gold".padStart(8), "Infl.".padStart(5),
            "Handl.A".padStart(8), "Handl.G".padStart(8), "St.".padStart(6),
            "Aktien".padStart(8), "Gold".padStart(7), "Liq.".padStart(7)
        ].join("  ");
        let log = header + "\n" + "=".repeat(header.length) + "\n";

        for (let jahr = startJahr; jahr <= endJahr; jahr++) {
            const dataVJ = HISTORICAL_DATA[jahr - 1];
            if (!dataVJ || !HISTORICAL_DATA[jahr]) { log += `${jahr}: Fehlende Daten.\n`; continue; }

            const jahresrenditeAktien = (HISTORICAL_DATA[jahr].msci_eur - dataVJ.msci_eur) / dataVJ.msci_eur;
            const jahresrenditeGold = (dataVJ.gold_eur_perf || 0) / 100;
            const yearData = { ...dataVJ, rendite: jahresrenditeAktien, gold_eur_perf: dataVJ.gold_eur_perf, zinssatz: dataVJ.zinssatz_de, inflation: dataVJ.inflation_de, jahr };

            const yearIndex = jahr - startJahr;
            const result = simulateOneYear(simState, inputs, yearData, yearIndex);

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
                formatCurrencyShortLog(row.pension_annual).padStart(7),
                formatCurrencyShortLog(row.floor_aus_depot).padStart(8),
                pfInt(row.FlexRatePct, 5),
                formatCurrencyShortLog(row.flex_erfuellt_nominal).padStart(7),
                formatCurrencyShortLog(row.jahresentnahme_real).padStart(9),
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
                formatCurrencyShortLog(liquiditaet).padStart(7)
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
        'einstandAlt', 'startAlter', 'geschlecht', 'startSPB', 'kirchensteuerSatz', 'round5',
        'renteMonatlich', 'renteStartOffsetJahre', 'renteIndexierungsart', 'renteFesterSatz',
        'zweiPersonenHaushalt', 'partnerStartAlter', 'partnerGeschlecht', 'partnerStartSPB',
        'partnerKirchensteuerSatz', 'partnerRenteMonatlich', 'partnerRenteStartOffsetJahre',
        'partnerRenteIndexierungsart', 'partnerRenteFesterSatz', 'witwenRenteProzent',
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

    const renteIndexArtSelect = document.getElementById('renteIndexierungsart');
    renteIndexArtSelect.addEventListener('change', () => { document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none'; });

    const partnerRenteIndexArtSelect = document.getElementById('partnerRenteIndexierungsart');
    if (partnerRenteIndexArtSelect) {
        partnerRenteIndexArtSelect.addEventListener('change', () => { document.getElementById('partnerFesterSatzContainer').style.display = partnerRenteIndexArtSelect.value === 'fest' ? 'block' : 'none'; });
    }

    const pflegeCheckbox = document.getElementById('pflegefallLogikAktivieren');
    pflegeCheckbox.addEventListener('change', () => { document.getElementById('pflegePanel').style.display = pflegeCheckbox.checked ? 'grid' : 'none'; });

    const pflegeModellSelect = document.getElementById('pflegeModellTyp');
    pflegeModellSelect.addEventListener('change', () => { document.getElementById('pflegeDauerContainer').style.display = pflegeModellSelect.value === 'akut' ? 'contents' : 'none'; });

    const pflegeMortalitaetCheckbox = document.getElementById('pflegebeschleunigtMortalitaetAktivieren');
    pflegeMortalitaetCheckbox.addEventListener('change', () => { document.getElementById('pflegeTodesrisikoContainer').style.display = pflegeMortalitaetCheckbox.checked ? 'flex' : 'none'; });

    const zweiPersonenCheckbox = document.getElementById('zweiPersonenHaushalt');
    zweiPersonenCheckbox.addEventListener('change', () => { document.getElementById('partnerPanel').style.display = zweiPersonenCheckbox.checked ? 'grid' : 'none'; });

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
    document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none';
    if (partnerRenteIndexArtSelect) {
        document.getElementById('partnerFesterSatzContainer').style.display = partnerRenteIndexArtSelect.value === 'fest' ? 'block' : 'none';
    }
    document.getElementById('partnerPanel').style.display = zweiPersonenCheckbox.checked ? 'grid' : 'none';
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
};

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

        const baseInputs = getCommonInputs();
        const anzahlRuns = parseInt(document.getElementById('mcAnzahl').value) || 100;
        const maxDauer = parseInt(document.getElementById('mcDauer').value) || 35;
        const blockSize = parseInt(document.getElementById('mcBlockSize').value) || 5;
        const baseSeed = parseInt(document.getElementById('mcSeed').value) || 12345;
        const methode = document.getElementById('mcMethode').value;

        const sweepResults = [];

        for (let comboIdx = 0; comboIdx < paramCombinations.length; comboIdx++) {
            const params = paramCombinations[comboIdx];

            const inputs = {
                ...baseInputs,
                runwayMinMonths: params.runwayMin,
                runwayTargetMonths: params.runwayTarget,
                targetEq: params.targetEq,
                rebalBand: params.rebalBand,
                maxSkimPctOfEq: params.maxSkimPct,
                maxBearRefillPctOfEq: params.maxBearRefillPct
            };

            if (params.goldTargetPct !== undefined) {
                inputs.goldZielProzent = params.goldTargetPct;
                inputs.goldAktiv = params.goldTargetPct > 0;
            }

            const rand = rng(baseSeed + comboIdx);
            const stressCtxMaster = buildStressContext(inputs.stressPreset, rand);

            const runOutcomes = [];

            for (let i = 0; i < anzahlRuns; i++) {
                let failed = false;
                const startYearIndex = Math.floor(rand() * annualData.length);
                let simState = initMcRunState(inputs, startYearIndex);

                const depotWertHistorie = [portfolioTotal(simState.portfolio)];
                let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.zweiPersonenHaushalt);
                let stressCtx = cloneStressContext(stressCtxMaster);

                let personStatus = inputs.zweiPersonenHaushalt ? { person1Alive: true, person2Alive: true } : null;
                let lastPensions = inputs.zweiPersonenHaushalt ? { person1: 0, person2: 0 } : null;
                let spendingReductionApplied = false;

                let minRunway = Infinity;

                for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                    const currentAge = inputs.startAlter + simulationsJahr;

                    let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                    yearData = applyStressOverride(yearData, stressCtx, rand);

                    if (inputs.zweiPersonenHaushalt) {
                        const age1 = inputs.startAlter + simulationsJahr;
                        const age2 = inputs.partnerStartAlter + simulationsJahr;

                        careMeta = updateCareMetaTwoPersons(careMeta, inputs, age1, age2, yearData, rand);

                        if (personStatus.person1Alive) {
                            let qx1 = MORTALITY_TABLE[inputs.geschlecht][age1] || 1;
                            if (careMeta?.person1?.active && inputs.pflegebeschleunigtMortalitaetAktivieren) {
                                qx1 = Math.min(1.0, qx1 * inputs.pflegeTodesrisikoFaktor);
                            }
                            if (rand() < qx1) {
                                personStatus.person1Alive = false;
                                if (!spendingReductionApplied) {
                                    simState.baseFloor *= 0.8;
                                    simState.baseFlex *= 0.8;
                                    spendingReductionApplied = true;
                                }
                            }
                        }

                        if (personStatus.person2Alive) {
                            let qx2 = MORTALITY_TABLE[inputs.partnerGeschlecht][age2] || 1;
                            if (careMeta?.person2?.active && inputs.pflegebeschleunigtMortalitaetAktivieren) {
                                qx2 = Math.min(1.0, qx2 * inputs.pflegeTodesrisikoFaktor);
                            }
                            if (rand() < qx2) {
                                personStatus.person2Alive = false;
                                if (!spendingReductionApplied) {
                                    simState.baseFloor *= 0.8;
                                    simState.baseFlex *= 0.8;
                                    spendingReductionApplied = true;
                                }
                            }
                        }

                        if (!personStatus.person1Alive && !personStatus.person2Alive) break;

                        const pensions = computeTwoPersonPensions({
                            yearIndex: simulationsJahr,
                            inputs,
                            lastPensions,
                            personStatus,
                            inflRate: yearData.inflation,
                            lohnRate: yearData.lohn
                        });
                        lastPensions = { person1: pensions.person1, person2: pensions.person2 };
                        simState.currentAnnualPension = pensions.total;
                    } else {
                        careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);

                        let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
                        if (careMeta && careMeta.active && inputs.pflegebeschleunigtMortalitaetAktivieren) {
                            qx = Math.min(1.0, qx * inputs.pflegeTodesrisikoFaktor);
                        }

                        if (rand() < qx) break;
                    }

                    const result = simulateOneYear(simState, inputs, yearData, simulationsJahr, careMeta, personStatus);

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

// Globale Funktionen für HTML onclick-Handler
window.runMonteCarlo = runMonteCarlo;
window.runBacktest = runBacktest;
window.runParameterSweep = runParameterSweep;
window.displaySweepResults = displaySweepResults;
window.formatCurrency = formatCurrency;

// Für Parity Smoke Test
window.simulateOneYear = simulateOneYear;
window.annualData = annualData;
