/**
 * Module: Monte Carlo Runner
 * Purpose: Core orchestrator for the Monte Carlo simulation.
 *          Handles the simulation loop, years, life events (Care, Death), and results aggregation.
 * Usage: Called by auto-optimize-worker.js and the main simulation UI.
 * Dependencies: simulator-utils.js, simulator-data.js, simulator-engine-wrapper.js
 */
"use strict";

import { rng, makeRunSeed } from './simulator-utils.js';
import { BREAK_ON_RUIN, MORTALITY_TABLE, annualData } from './simulator-data.js';
import { applyStressOverride, computeRentAdjRate } from './simulator-portfolio.js';
import { simulateOneYear, initMcRunState, sampleNextYearData, computeRunStatsFromSeries, updateCareMeta, calcCareCost, computeCareMortalityMultiplier, computeHouseholdFlexFactor, estimateRemainingLifeYears, estimateJointRemainingLifeYears, estimateSingleRemainingLifeYearsAtQuantile, estimateJointRemainingLifeYearsAtQuantile } from './simulator-engine-wrapper.js';
import { portfolioTotal } from './simulator-results.js';
import { sumDepot } from './simulator-portfolio.js';
import { cloneStressContext, computeMarriageYearsCompleted } from './simulator-sweep-utils.js';
import { ScenarioAnalyzer } from './scenario-analyzer.js';
import { MC_HEATMAP_BINS, pickWorstRun, createMonteCarloBuffers } from './monte-carlo-runner-utils.js';
import { buildMonteCarloAggregates } from './monte-carlo-aggregates.js';
import { createMonteCarloRunContext } from './mc-run-context.js';
import { createMonteCarloLifeState } from './mc-life-events.js';
import {
    createMonteCarloStressTracker,
    recordMonteCarloStressYear,
    writeMonteCarloStressMetrics
} from './mc-stress-tracker.js';
import {
    buildMonteCarloDeathLogRow,
    buildMonteCarloRuinLogRow,
    buildMonteCarloYearLogRow
} from './mc-log-builder.js';
import {
    createMonteCarloRunMetrics,
    finalizeMonteCarloRunMetrics,
    recordMonteCarloRunOutcome
} from './mc-run-metrics.js';
import {
    buildStartYearCdf,
    buildYearSamplingConfig,
    pickMonteCarloStartYearIndex,
    resolveMinStartYearIndex
} from './mc-year-sampling.js';

export { MC_HEATMAP_BINS, pickWorstRun, createMonteCarloBuffers, buildMonteCarloAggregates };
export { buildStartYearCdf, pickStartYearIndex } from './mc-year-sampling.js';

const DYNAMIC_FLEX_MIN_HORIZON = 1;
const DYNAMIC_FLEX_MAX_HORIZON = 60;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function resolveMonteCarloCape(yearData, inputs, marketDataHist) {
    const yearCape = Number(yearData?.capeRatio ?? yearData?.cape);
    if (Number.isFinite(yearCape) && yearCape > 0) return yearCape;
    const inputCape = Number(inputs?.capeRatio);
    if (Number.isFinite(inputCape) && inputCape > 0) return inputCape;
    const legacyCape = Number(inputs?.marketCapeRatio);
    if (Number.isFinite(legacyCape) && legacyCape > 0) return legacyCape;
    const histCape = Number(marketDataHist?.capeRatio);
    if (Number.isFinite(histCape) && histCape > 0) return histCape;
    return 0;
}

function computeDynamicFlexHorizonForYear(inputs, { yearIndex, ageP1, ageP2, p1Alive, p2Alive }) {
    // UI/Preset horizon is fallback only; bei aktivem Dynamic-Flex wird jahrweise aus Sterbetafeln neu berechnet.
    const fallback = clamp(Number(inputs?.horizonYears) || 30, DYNAMIC_FLEX_MIN_HORIZON, DYNAMIC_FLEX_MAX_HORIZON);
    if (inputs?.dynamicFlex !== true) return fallback;
    const method = inputs?.horizonMethod || 'survival_quantile';
    const quantile = clamp(Number(inputs?.survivalQuantile) || 0.85, 0.5, 0.99);
    const currentAgeP1 = Number.isFinite(ageP1) ? ageP1 : ((Number(inputs?.startAlter) || 65) + yearIndex);
    const currentAgeP2 = Number.isFinite(ageP2) ? ageP2 : ((Number(inputs?.partner?.startAlter) || currentAgeP1) + yearIndex);
    const genderP1 = inputs?.geschlecht || 'm';
    const genderP2 = inputs?.partner?.geschlecht || (genderP1 === 'm' ? 'w' : 'm');

    if (p1Alive && p2Alive && inputs?.partner?.aktiv === true) {
        if (method === 'mean') {
            return clamp(
                estimateJointRemainingLifeYears(genderP1, currentAgeP1, genderP2, currentAgeP2),
                DYNAMIC_FLEX_MIN_HORIZON,
                DYNAMIC_FLEX_MAX_HORIZON
            );
        }
        return estimateJointRemainingLifeYearsAtQuantile(
            genderP1,
            currentAgeP1,
            genderP2,
            currentAgeP2,
            quantile,
            { minYears: DYNAMIC_FLEX_MIN_HORIZON, maxYears: DYNAMIC_FLEX_MAX_HORIZON }
        );
    }
    if (p1Alive) {
        if (method === 'mean') {
            return clamp(
                estimateRemainingLifeYears(genderP1, currentAgeP1),
                DYNAMIC_FLEX_MIN_HORIZON,
                DYNAMIC_FLEX_MAX_HORIZON
            );
        }
        return estimateSingleRemainingLifeYearsAtQuantile(
            genderP1,
            currentAgeP1,
            quantile,
            { minYears: DYNAMIC_FLEX_MIN_HORIZON, maxYears: DYNAMIC_FLEX_MAX_HORIZON }
        );
    }
    if (p2Alive) {
        if (method === 'mean') {
            return clamp(
                estimateRemainingLifeYears(genderP2, currentAgeP2),
                DYNAMIC_FLEX_MIN_HORIZON,
                DYNAMIC_FLEX_MAX_HORIZON
            );
        }
        return estimateSingleRemainingLifeYearsAtQuantile(
            genderP2,
            currentAgeP2,
            quantile,
            { minYears: DYNAMIC_FLEX_MIN_HORIZON, maxYears: DYNAMIC_FLEX_MAX_HORIZON }
        );
    }
    return DYNAMIC_FLEX_MIN_HORIZON;
}

/**
 * Reine Monte-Carlo-Simulation ohne DOM-Abhängigkeiten.
 * Erwartet alle UI-Daten als Parameter und liefert Aggregationen sowie Szenario-Metadaten zurück.
 * Fortschritts-Updates und Szenario-Logging werden über Callbacks injiziert, um maximale Trennung zu erreichen.
 * @param {object} options - Konfiguration der Simulation.
 * @param {object} options.inputs - Gemeinsame Eingaben aus dem UI.
 * @param {object} options.monteCarloParams - Parameter wie Anzahl, Dauer, Seed usw.
 * @param {object} options.widowOptions - Normalisierte Witwen-Optionen.
 * @param {boolean} options.useCapeSampling - Flag, ob CAPE-Sampling aktiv ist.
 * @param {(progressPct:number)=>void} [options.onProgress] - Optionaler Callback für Fortschritts-Updates.
 * @param {ScenarioAnalyzer} [options.scenarioAnalyzer] - Externer Analyzer zum Tracking von Szenarien.
 * @returns {Promise<{ aggregatedResults: object, failCount: number, worstRun: object, worstRunCare: object, pflegeTriggeredCount: number }>}
 */
export async function runMonteCarloSimulation({ inputs, monteCarloParams, widowOptions, useCapeSampling, onProgress = () => { }, scenarioAnalyzer = null, engine = null }) {
    const { anzahl } = monteCarloParams;
    const analyzer = scenarioAnalyzer || new ScenarioAnalyzer(anzahl);

    const chunk = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling,
        onProgress,
        engine,
        runRange: { start: 0, count: anzahl }
    });

    if (analyzer && chunk.runMeta) {
        for (const meta of chunk.runMeta) {
            meta.isRandomSample = analyzer.shouldCaptureRandomSample(meta.index);
            analyzer.addRun(meta);
        }
    }

    onProgress(95);
    await new Promise(resolve => setTimeout(resolve, 0));

    const aggregatedResults = buildMonteCarloAggregates({
        inputs,
        totalRuns: anzahl,
        buffers: chunk.buffers,
        heatmap: chunk.heatmap,
        bins: chunk.bins,
        totals: chunk.totals,
        lists: chunk.lists,
        allRealWithdrawalsSample: chunk.allRealWithdrawalsSample
    });

    onProgress(100);

    return {
        aggregatedResults,
        failCount: chunk.totals.failCount,
        worstRun: chunk.worstRun,
        worstRunCare: chunk.worstRunCare,
        pflegeTriggeredCount: chunk.totals.pflegeTriggeredCount
    };
}

export async function runMonteCarloChunk({
    inputs,
    monteCarloParams,
    widowOptions,
    useCapeSampling,
    runRange = null,
    onProgress = () => { },
    logIndices = null,
    engine = null
}) {
    onProgress(0);

    const context = createMonteCarloRunContext({
        inputs,
        monteCarloParams,
        runRange,
        logIndices,
        buildYearSamplingConfig,
        buildStartYearCdf,
        resolveMinStartYearIndex
    });
    const {
        maxDauer,
        blockSize,
        seed,
        methode,
        excludeEstimatedHistory,
        runStart,
        runCount,
        legacyRand,
        stressCtxMaster,
        buffers,
        progressUpdateInterval,
        logIndexSet,
        yearSamplingConfig,
        startYearCdf,
        minStartYearIndex
    } = context;
    const {
        finalOutcomes,
        taxOutcomes,
        kpiLebensdauer,
        kpiKuerzungsjahre,
        kpiMaxKuerzung,
        volatilities,
        maxDrawdowns,
        depotErschoepft,
        alterBeiErschoepfung,
        anteilJahreOhneFlex,
        stress_maxDrawdowns,
        stress_timeQuoteAbove45,
        stress_cutYears,
        stress_CaR_P10_Real,
        stress_recoveryYears
    } = buffers;

    // Realistischer Schwellenwert für Depot-Erschöpfung: 100 € (vorher 0,000001 €)
    const DEPOT_DEPLETION_THRESHOLD = 100;

    const runMetrics = createMonteCarloRunMetrics(runCount);

    const heatmap = Array(10).fill(0).map(() => new Uint32Array(MC_HEATMAP_BINS.length - 1));
    let lastProgressPct = -1;

    for (let i = 0; i < runCount; i++) {
        if (i % progressUpdateInterval === 0) {
            const pct = Math.floor((i / runCount) * 90);
            if (pct > lastProgressPct) {
                lastProgressPct = pct;
                onProgress(pct);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        const runIdx = runStart + i;
        let failed = false, totalTaxesThisRun = 0, totalTaxSavedByLossCarryThisRun = 0, kpiJahreMitKuerzungDieserLauf = 0, kpiMaxKuerzungDieserLauf = 0;
        let lebensdauer = 0, jahreOhneFlex = 0, triggeredAge = null;
        let careEverActive = false;

        const rand = legacyRand || rng(makeRunSeed(seed, 0, runIdx));

        const startYearIndex = pickMonteCarloStartYearIndex({
            rand,
            inputs,
            annualData,
            useCapeSampling,
            excludeEstimatedHistory,
            yearSamplingConfig,
            startYearCdf,
            minStartYearIndex
        });

        let simState = initMcRunState(inputs, startYearIndex);
        if (yearSamplingConfig) {
            simState.samplerState.yearSampling = yearSamplingConfig;
        }

        const depotWertHistorie = [portfolioTotal(simState.portfolio)];
        const shouldLogRun = !logIndexSet || logIndexSet.has(runIdx);
        const currentRunLog = shouldLogRun ? [] : null;
        let depotNurHistorie = [sumDepot(simState.portfolio)];
        let depotErschoepfungAlterGesetzt = false;
        // Track dynamic transition year (can be shortened by care event)
        let effectiveTransitionYear = inputs.transitionYear ?? 0;

        const lifeState = createMonteCarloLifeState(inputs, rand);
        const { careMetaP1, careMetaP2, hasPartner } = lifeState;
        const rngCareP1 = lifeState.rngCareP1;
        const rngCareP2 = lifeState.rngCareP2;
        let p1Alive = lifeState.p1Alive;
        let p2Alive = lifeState.p2Alive;
        let p1CareYears = 0;
        let p2CareYears = 0;
        let bothCareYears = 0;
        let triggeredAgeP2 = null;
        let runEndedBecauseAllDied = false;
        let deathLogContext = null;
        let p1ActiveThisYear = false;
        let p2ActiveThisYear = false;
        let widowBenefitActiveForP1 = false;
        let widowBenefitActiveForP2 = false;
        const householdContext = lifeState.householdContext;

        let stressCtx = cloneStressContext(stressCtxMaster);

        const stressTracker = createMonteCarloStressTracker(stressCtxMaster, portfolioTotal(simState.portfolio));

        let retirementYearCounter = 0; // Track years in retirement for heatmap alignment
        let runSafetyStage1Ever = false;
        let runSafetyStage2Ever = false;
        let healthBucketEnabledThisRun = false;
        let healthBucketUsedThisRun = 0;
        let healthBucketEndThisRun = 0;
        let healthBucketCoveragePctThisRun = null;
        let healthBucketTargetGapThisRun = 0;
        let healthBucketInterestThisRun = 0;

        for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
            lebensdauer = simulationsJahr + 1;

            let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
            yearData = applyStressOverride(yearData, stressCtx, rand);

            const ageP1 = inputs.startAlter + simulationsJahr;
            const marriageYearsCompleted = computeMarriageYearsCompleted(simulationsJahr, widowOptions);
            const widowModeEnabled = widowOptions.mode === 'percent' && widowOptions.percent > 0 && hasPartner;
            const widowEligibleThisYear = widowModeEnabled &&
                marriageYearsCompleted > 0 &&
                marriageYearsCompleted >= widowOptions.minMarriageYears;
            const p1AliveAtStart = p1Alive;
            const p2AliveAtStart = p2Alive;
            let ageP2 = ageP1;
            if (inputs.partner?.aktiv) {
                ageP2 = inputs.partner.startAlter + simulationsJahr;
            }

            if (p1Alive) {
                updateCareMeta(careMetaP1, inputs, ageP1, yearData, rngCareP1);
                if (careMetaP1 && careMetaP1.active) careEverActive = true;
                if (careMetaP1 && careMetaP1.triggered && triggeredAge === null) triggeredAge = ageP1;
            }

            if (p2Alive && careMetaP2) {
                updateCareMeta(careMetaP2, inputs, ageP2, yearData, rngCareP2);
                if (careMetaP2 && careMetaP2.triggered && triggeredAgeP2 === null) {
                    triggeredAgeP2 = ageP2;
                }
                if (careMetaP2 && careMetaP2.active) careEverActive = true;
            }

            if (inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear) {
                if ((p1Alive && careMetaP1?.active) || (p2Alive && careMetaP2?.active)) {
                    effectiveTransitionYear = simulationsJahr;
                }
            }

            p1ActiveThisYear = p1Alive && careMetaP1?.active;
            p2ActiveThisYear = p2Alive && careMetaP2?.active;
            if (p2ActiveThisYear) careEverActive = true;
            if (p1ActiveThisYear) p1CareYears++;
            if (p2ActiveThisYear) p2CareYears++;
            if (p1ActiveThisYear && p2ActiveThisYear) bothCareYears++;

            const isAccumulation = inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear;

            if (!isAccumulation && p1Alive) {
                let qx1 = MORTALITY_TABLE[inputs.geschlecht][ageP1] || 0.0005;
                const careFactorP1 = computeCareMortalityMultiplier(careMetaP1, inputs);
                if (careFactorP1 > 1) {
                    qx1 = Math.min(1.0, qx1 * careFactorP1);
                }
                if (rand() < qx1) {
                    p1Alive = false;
                }
            }

            if (!isAccumulation && p2Alive && careMetaP2) {
                const p2Gender = inputs.partner?.geschlecht || (inputs.geschlecht === 'm' ? 'w' : 'm');
                let qx2 = MORTALITY_TABLE[p2Gender][ageP2] || 0.0005;
                const careFactorP2 = computeCareMortalityMultiplier(careMetaP2, inputs);
                if (careFactorP2 > 1) {
                    qx2 = Math.min(1.0, qx2 * careFactorP2);
                }
                if (rand() < qx2) {
                    p2Alive = false;
                }
            }

            if (widowEligibleThisYear && (!p1AliveAtStart || !p2AliveAtStart)) {
                if (!p1AliveAtStart && p2AliveAtStart) {
                    widowBenefitActiveForP2 = true;
                } else if (!p2AliveAtStart && p1AliveAtStart) {
                    widowBenefitActiveForP1 = true;
                }
            }

            if (!p1Alive && !p2Alive) {
                runEndedBecauseAllDied = true;
                deathLogContext = {
                    jahr: simulationsJahr + 1,
                    histJahr: yearData.jahr,
                    inflation: yearData.inflation
                };
            }

            const careCostP1 = calcCareCost(careMetaP1, null);
            const careCostP2 = careMetaP2 ? calcCareCost(careMetaP2, null) : null;
            const totalCareFloor = careCostP1.zusatzFloor + (careCostP2 ? careCostP2.zusatzFloor : 0);
            const effectiveFlexFactor = computeHouseholdFlexFactor({
                p1Alive,
                careMetaP1,
                p2Alive,
                careMetaP2
            });
            householdContext.p1Alive = p1Alive;
            householdContext.p2Alive = hasPartner ? p2Alive : false;
            householdContext.widowBenefits.p1FromP2 = widowBenefitActiveForP1;
            householdContext.widowBenefits.p2FromP1 = widowBenefitActiveForP2;
            householdContext.care = {
                p1: careMetaP1,
                p2: careMetaP2
            };

            if (runEndedBecauseAllDied) break;

            // Do NOT modify simState.baseFlex permanently.
            // We pass the effectiveFlexFactor to simulateOneYear to apply it only for the current year's spending decision.
            // The simulation engine will then base the NEXT year's state on the original (unreduced) baseFlex.
            const stateWithCareFlex = {
                ...simState
            };

            // Berechne dynamische Rentenanpassung basierend auf Modus (fix/wage/cpi)
            const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
            const resolvedCapeRatio = resolveMonteCarloCape(yearData, inputs, simState.marketDataHist);
            const dynamicHorizonYears = computeDynamicFlexHorizonForYear(inputs, {
                yearIndex: simulationsJahr,
                ageP1,
                ageP2,
                p1Alive,
                p2Alive
            });
            const adjustedInputs = {
                ...inputs,
                rentAdjPct: effectiveRentAdjPct,
                transitionYear: effectiveTransitionYear,
                capeRatio: resolvedCapeRatio,
                marketCapeRatio: resolvedCapeRatio,
                horizonYears: dynamicHorizonYears
            };
            yearData.capeRatio = resolvedCapeRatio;

            // Pass care floor and Flex Factor as separate parameters
            const result = simulateOneYear(stateWithCareFlex, adjustedInputs, yearData, simulationsJahr, careMetaP1, totalCareFloor, householdContext, effectiveFlexFactor, engine);
            const lifeLogContext = currentRunLog ? {
                hasPartner,
                p1Alive,
                p2Alive,
                careMetaP1,
                careMetaP2,
                p1ActiveThisYear,
                p2ActiveThisYear
            } : null;

            if (result.isRuin) {
                failed = true;
                // Bei Ruin ist das Depot definitiv erschöpft - setze Alter
                if (!depotErschoepfungAlterGesetzt) {
                    alterBeiErschoepfung[i] = ageP1;
                    depotErschoepfungAlterGesetzt = true;
                }
                if (currentRunLog) currentRunLog.push(buildMonteCarloRuinLogRow({
                    simulationsJahr,
                    yearData,
                    inputs,
                    lifeLogContext
                }));
                if (BREAK_ON_RUIN) break;
            } else {
                simState = result.newState;
                totalTaxesThisRun += result.totalTaxesThisYear;
                totalTaxSavedByLossCarryThisRun += Number(result.logData?.taxSavedByLossCarry) || 0;
                if (result.logData?.health_bucket_enabled) {
                    healthBucketEnabledThisRun = true;
                }
                healthBucketUsedThisRun += Number(result.logData?.health_bucket_used) || 0;
                healthBucketInterestThisRun += Number(result.logData?.health_bucket_interest) || 0;
                if (Number.isFinite(Number(result.logData?.health_bucket_end))) {
                    healthBucketEndThisRun = Number(result.logData.health_bucket_end);
                }
                if (Number.isFinite(Number(result.logData?.health_bucket_real_coverage_pct))) {
                    healthBucketCoveragePctThisRun = Number(result.logData.health_bucket_real_coverage_pct);
                }
                if (Number.isFinite(Number(result.logData?.health_bucket_target_gap))) {
                    healthBucketTargetGapThisRun = Number(result.logData.health_bucket_target_gap);
                }
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

                runMetrics.totalSimulatedYears++;
                if (result.logData.entnahmequote * 100 > 4.5) runMetrics.totalYearsQuoteAbove45++;
                const vpwPayload = result.ui?.vpw || null;
                const vpwSafetyStage = Number(vpwPayload?.safetyStage);
                if (Number.isFinite(vpwSafetyStage)) {
                    if (vpwSafetyStage >= 1) {
                        runMetrics.totalYearsSafetyStage1plus++;
                        runSafetyStage1Ever = true;
                    }
                    if (vpwSafetyStage >= 2) {
                        runMetrics.totalYearsSafetyStage2++;
                        runSafetyStage2Ever = true;
                    }
                }
                if (runIdx % 100 === 0) runMetrics.allRealWithdrawalsSample.push(result.logData.jahresentnahme_real);

                if (!isAccumulation && retirementYearCounter < 10) {
                    const quote = result.logData.entnahmequote * 100;
                    for (let b = 0; b < MC_HEATMAP_BINS.length - 1; b++) {
                        if (quote >= MC_HEATMAP_BINS[b] && quote < MC_HEATMAP_BINS[b + 1]) { heatmap[retirementYearCounter][b]++; break; }
                    }
                    retirementYearCounter++;
                }

                depotWertHistorie.push(portfolioTotal(simState.portfolio));

                if (stressTracker.stressYears > 0) {
                    recordMonteCarloStressYear(
                        stressTracker,
                        simulationsJahr,
                        portfolioTotal(simState.portfolio),
                        result.logData
                    );
                }

                if (currentRunLog) currentRunLog.push(buildMonteCarloYearLogRow({
                    simulationsJahr,
                    yearData,
                    result,
                    lifeLogContext
                }));
            }
        }

        if (runEndedBecauseAllDied) {
            // Ergänze einen letzten Log-Eintrag, damit klar ersichtlich ist, dass alle Personen verstorben sind.
            const portfolioSnapshot = simState?.portfolio || {};
            if (currentRunLog) currentRunLog.push(buildMonteCarloDeathLogRow({
                deathLogContext,
                currentRunLogLength: currentRunLog.length,
                portfolioSnapshot,
                inputs,
                lifeLogContext: {
                    hasPartner,
                    p1Alive,
                    p2Alive,
                    careMetaP1,
                    careMetaP2,
                    p1ActiveThisYear,
                    p2ActiveThisYear
                }
            }));
        }

        const { maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);
        volatilities[i] = maxDDpct;
        maxDrawdowns[i] = maxDDpct;

        writeMonteCarloStressMetrics(
            stressTracker,
            i,
            stress_maxDrawdowns,
            stress_timeQuoteAbove45,
            stress_cutYears,
            stress_CaR_P10_Real,
            stress_recoveryYears
        );

        const depotOnlyStart = depotNurHistorie[0] || 1;
        const depotOnlyEnd = depotNurHistorie[depotNurHistorie.length - 1] || 0;
        const ruinOrDepleted = failed || depotOnlyEnd <= DEPOT_DEPLETION_THRESHOLD;
        recordMonteCarloRunOutcome(runMetrics, {
            i,
            runIdx,
            buffers,
            simState,
            failed,
            lebensdauer,
            jahreOhneFlex,
            kpiJahreMitKuerzungDieserLauf,
            kpiMaxKuerzungDieserLauf,
            totalTaxesThisRun,
            totalTaxSavedByLossCarryThisRun,
            depotOnlyStart,
            depotOnlyEnd,
            ruinOrDepleted,
            careEverActive,
            triggeredAge,
            triggeredAgeP2,
            p1CareYears,
            p2CareYears,
            bothCareYears,
            hasPartner,
            careMetaP1,
            careMetaP2,
            runSafetyStage1Ever,
            runSafetyStage2Ever,
            healthBucketEnabledThisRun,
            healthBucketUsedThisRun,
            healthBucketEndThisRun,
            healthBucketCoveragePctThisRun,
            healthBucketTargetGapThisRun,
            healthBucketInterestThisRun,
            currentRunLog
        });
    }

    const finalizedMetrics = finalizeMonteCarloRunMetrics(runMetrics);

    return {
        runRange: { start: runStart, count: runCount },
        buffers,
        heatmap,
        bins: MC_HEATMAP_BINS,
        totals: finalizedMetrics.totals,
        lists: finalizedMetrics.lists,
        allRealWithdrawalsSample: finalizedMetrics.allRealWithdrawalsSample,
        worstRun: finalizedMetrics.worstRun,
        worstRunCare: finalizedMetrics.worstRunCare,
        runMeta: finalizedMetrics.runMeta
    };
}
