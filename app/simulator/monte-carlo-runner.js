/**
 * Module: Monte Carlo Runner
 * Purpose: Core orchestrator for the Monte Carlo simulation.
 *          Handles the simulation loop, years, life events (Care, Death), and results aggregation.
 * Usage: Called by auto-optimize-worker.js and the main simulation UI.
 * Dependencies: simulator-utils.js, simulator-data.js, simulator-engine-wrapper.js
 */
"use strict";

import { rng, makeRunSeed, quantile } from './simulator-utils.js';
import { BREAK_ON_RUIN, annualData } from './simulator-data.js';
import { applyStressOverride, computeRentAdjRate } from './simulator-portfolio.js';
import { simulateOneYear, initMcRunState, sampleNextYearData, computeRunStatsFromSeries, updateCareMeta, calcCareCost, computeCareMortalityMultiplier, computeHouseholdFlexFactor, getDataVersion, resolveSimulatorCumulativeInflationFactor } from './simulator-engine-wrapper.js';
import { portfolioTotal } from './simulator-results.js';
import { sumDepot } from './simulator-portfolio.js';
import { cloneStressContext, computeMarriageYearsCompleted } from './simulator-sweep-utils.js';
import { ScenarioAnalyzer } from './scenario-analyzer.js';
import { MC_HEATMAP_BINS, pickWorstRun, createMonteCarloBuffers } from './monte-carlo-runner-utils.js';
import { buildMonteCarloAggregates } from './monte-carlo-aggregates.js';
import { createMonteCarloRunContext } from './mc-run-context.js';
import {
    assertSimulatorHorizonAgeContract,
    createMonteCarloLifeState,
    resolveSimulatorMortalityProbability
} from './mc-life-events.js';
import { STATIONARY_BOOTSTRAP_METHOD, isStationaryBootstrapMethod } from './stationary-bootstrap-contract.js';
import { createStationaryBootstrapSampler, nextYearSample } from './stationary-bootstrap-sampler.js';
import { applyTailRiskOverlay, createTailRiskSchedule } from './tail-risk-overlay.js';
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
    createMonteCarloCareNeedTracker,
    createMonteCarloRunMetrics,
    finalizeMonteCarloRunMetrics,
    recordMonteCarloCareNeedYear,
    recordMonteCarloRunOutcome
} from './mc-run-metrics.js';
import {
    buildStartYearCdf,
    buildYearSamplingConfig,
    createMonteCarloSamplingDiagnosticsV1,
    finalizeMonteCarloSamplingDiagnosticsV1,
    pickMonteCarloStartYearIndex,
    recordMonteCarloSampledYearV1,
    recordMonteCarloSamplingStartV1,
    resolveMonteCarloSamplingContractV1,
    resolveMinStartYearIndex
} from './mc-year-sampling.js';
import { resolveDynamicFlexRunnerHorizon } from './dynamic-flex-runner-horizon.js';
import {
    MONTE_CARLO_OUTCOME_CODE,
    buildMonteCarloOutcomeInventoryV1,
    createMonteCarloChunkResultV1,
    createMonteCarloPathSummaryV1,
    recordMonteCarloPathSummaryV1,
    resolveMonteCarloTerminalOutcomeV1
} from './monte-carlo-chunk-result.js';

export { MC_HEATMAP_BINS, pickWorstRun, createMonteCarloBuffers, buildMonteCarloAggregates };
export { buildStartYearCdf, pickStartYearIndex } from './mc-year-sampling.js';

const MAX_TECHNICAL_ERROR_SAMPLES = 20;

export function createMonteCarloTechnicalInventory(requested = 0) {
    return {
        requested: Math.max(0, Number(requested) || 0),
        financiallyEvaluable: 0,
        technicalError: 0,
        errors: []
    };
}

export function mergeMonteCarloTechnicalInventory(target, source) {
    if (!target || !source) return target;
    target.financiallyEvaluable += Math.max(0, Number(source.financiallyEvaluable) || 0);
    target.technicalError += Math.max(0, Number(source.technicalError) || 0);
    const sourceErrors = Array.isArray(source.errors) ? source.errors : [];
    for (const error of sourceErrors) {
        if (target.errors.length >= MAX_TECHNICAL_ERROR_SAMPLES) break;
        target.errors.push(error);
    }
    return target;
}

export function attachMonteCarloBatchOutcome(aggregatedResults, technicalInventory) {
    const inventory = technicalInventory || createMonteCarloTechnicalInventory(0);
    const batchStatus = inventory.technicalError > 0 ? 'technical_error' : 'completed';
    const outcomeCounts = aggregatedResults?.outcomeCounts || {};
    const outcomeInventory = buildMonteCarloOutcomeInventoryV1({
        requestedRuns: inventory.requested,
        ruin: Math.max(0, Number(outcomeCounts.ruin) || 0),
        all_dead: Math.max(0, Number(outcomeCounts.all_dead) || 0),
        horizon_exhausted: Math.max(0, Number(outcomeCounts.horizon_exhausted) || 0),
        technical_error: inventory.technicalError
    });
    if (batchStatus === 'technical_error' && inventory.errors?.[0]) {
        const firstError = inventory.errors[0];
        if (!String(firstError.message || '').includes('Terminale Outcomes:')) {
            firstError.message = `${firstError.message || 'Die Monte-Carlo-Simulation wurde technisch abgebrochen.'} `
                + `Floor-Deckung im gewaehlten Horizont: nicht ausgewiesen. Terminale Outcomes: `
                + `Ruin ${outcomeInventory.ruin}, Tod ${outcomeInventory.all_dead}, `
                + `Horizont ${outcomeInventory.horizon_exhausted}, Technik ${outcomeInventory.technical_error}.`;
        }
    }
    const { outcomeCounts: _outcomeCounts, ...financialResults } = aggregatedResults || {};
    return {
        ...financialResults,
        batchStatus,
        financialMetricsValid: batchStatus === 'completed',
        technicalInventory: inventory,
        outcomeInventory
    };
}

function normalizeTechnicalPathError(result, runIdx, simulationsJahr) {
    const fallbackCode = 'SIMULATOR_RESULT_SHAPE_INVALID';
    const sourceError = result?.error;
    const code = typeof sourceError?.code === 'string' && sourceError.code.trim()
        ? sourceError.code.trim()
        : fallbackCode;
    const sourceMessage = typeof sourceError?.message === 'string' ? sourceError.message.trim() : '';
    return {
        runIndex: runIdx,
        simulationYearIndex: simulationsJahr,
        code,
        message: sourceMessage.includes(code)
            ? sourceMessage
            : `Ein Simulationspfad wurde technisch abgebrochen (${code}).`
    };
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

function createStationaryBootstrapForRun({
    blockSize,
    rand,
    startYearIndex,
    samplingResolution
}) {
    const startSampler = samplingResolution?.blockStartSampler;
    const startIndices = startSampler?.indices;
    return createStationaryBootstrapSampler({
        annualData,
        blockSize,
        mode: STATIONARY_BOOTSTRAP_METHOD,
        cdf: Array.isArray(startSampler?.cdf) ? startSampler : null,
        startIndices,
        initialStartIndex: startYearIndex,
        rng: rand
    });
}

function shouldUseStressBootstrap(stressCtx) {
    return stressCtx?.type === 'conditional_bootstrap' && stressCtx.remainingYears > 0;
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

    const aggregatedResults = attachMonteCarloBatchOutcome(buildMonteCarloAggregates({
        inputs,
        totalRuns: anzahl,
        buffers: chunk.buffers,
        heatmap: chunk.heatmap,
        bins: chunk.bins,
        totals: chunk.totals,
        lists: chunk.lists,
        allRealWithdrawalsSample: chunk.allRealWithdrawalsSample
    }), chunk.technicalInventory);

    onProgress(100);

    return {
        aggregatedResults,
        failCount: chunk.totals.failCount,
        worstRun: chunk.worstRun,
        worstRunCare: chunk.worstRunCare,
        pflegeTriggeredCount: chunk.totals.pflegeTriggeredCount,
        batchStatus: aggregatedResults.batchStatus,
        financialMetricsValid: aggregatedResults.financialMetricsValid,
        technicalInventory: chunk.technicalInventory,
        samplingDiagnostics: chunk.samplingDiagnostics
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

    assertSimulatorHorizonAgeContract(inputs, monteCarloParams?.maxDauer);

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
        startYearMode,
        startYearFilter,
        startYearHalfLife,
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
    const samplingResolution = resolveMonteCarloSamplingContractV1({
        method: methode,
        inputs,
        annualData,
        useCapeSampling,
        startYearMode,
        startYearFilter,
        startYearHalfLife,
        blockSize,
        excludeEstimatedHistory,
        yearSamplingConfig
    });
    const samplingDiagnostics = createMonteCarloSamplingDiagnosticsV1({
        contract: samplingResolution.contract,
        dataVersion: getDataVersion()
    });
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
        alterBeiErschoepfungMissingness,
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
    const technicalInventory = createMonteCarloTechnicalInventory(runCount);
    const outcomeCounts = {
        ruin: 0,
        all_dead: 0,
        horizon_exhausted: 0
    };
    const { pathSummaries, pathMissingness } = createMonteCarloPathSummaryV1(runCount, {
        buffers,
        attachTransferBuffers: true
    });

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
        let cutYearsNumeratorThisRun = 0;
        let cutDecisionYearsThisRun = 0;
        let lebensdauer = 0, jahreOhneFlex = 0, triggeredAge = null;
        let careEverActive = false;
        const careNeedTracker = createMonteCarloCareNeedTracker();
        let technicalPathError = null;
        const realWithdrawalsThisRun = [];

        const runSeed = makeRunSeed(seed, 0, runIdx);
        const rand = legacyRand || rng(runSeed);
        const tailRiskSchedule = createTailRiskSchedule(runSeed, inputs, maxDauer).schedule;

        const startYearIndex = pickMonteCarloStartYearIndex({
            rand,
            inputs,
            annualData,
            useCapeSampling,
            excludeEstimatedHistory,
            yearSamplingConfig,
            startYearCdf,
            minStartYearIndex,
            samplingContract: samplingResolution
        });
        recordMonteCarloSamplingStartV1(samplingDiagnostics, annualData[startYearIndex]);

        let simState = initMcRunState(inputs, startYearIndex);
        if (samplingResolution.effectiveYearSamplingConfig) {
            simState.samplerState.yearSampling = samplingResolution.effectiveYearSamplingConfig;
        }
        if (methode === 'block') {
            simState.samplerState.blockStartIndex = startYearIndex;
            simState.samplerState.yearInBlock = 0;
            simState.samplerState.contractInitialRecordPending = true;
        } else if (methode === 'regime_markov' || methode === 'regime_iid') {
            simState.samplerState.currentRegime = annualData[startYearIndex]?.regime;
            simState.samplerState.contractInitialRecordPending = true;
        }
        if (isStationaryBootstrapMethod(methode)) {
            simState.samplerState.stationaryBootstrap = createStationaryBootstrapForRun({
                blockSize,
                rand,
                startYearIndex,
                samplingResolution
            });
        }

        const depotWertHistorie = [portfolioTotal(simState.portfolio)];
        const shouldLogRun = !logIndexSet || logIndexSet.has(runIdx);
        const currentRunLog = shouldLogRun ? [] : null;
        const tailRiskEntriesThisRun = [];
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
        let previousDynamicHorizon = null;
        let wasJointAliveAtPreviousHorizon = hasPartner && p1Alive && p2Alive;
        let longevityTransitionStartYear = null;
        let longevityTransitionAnchorHorizon = null;

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

            const conditionalStressActive = shouldUseStressBootstrap(stressCtx);
            let stationarySample = null;
            let samplingSource = 'unknown';
            let yearData;
            if (isStationaryBootstrapMethod(methode) && !conditionalStressActive) {
                stationarySample = nextYearSample(simState.samplerState.stationaryBootstrap);
                yearData = stationarySample.yearData;
                samplingSource = stationarySample.restartReason === 'initial'
                    ? 'initial_start'
                    : (stationarySample.isRestart ? 'stationary_restart' : 'stationary_continuation');
            } else if ((methode === 'regime_markov' || methode === 'regime_iid')
                && simState.samplerState.contractInitialRecordPending
                && !conditionalStressActive) {
                yearData = { ...annualData[startYearIndex] };
                simState.samplerState.contractInitialRecordPending = false;
                samplingSource = 'initial_start';
            } else {
                yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                if (conditionalStressActive) {
                    samplingSource = 'conditional_stress';
                } else if (methode === 'block') {
                    const isBlockStart = simState.samplerState.yearInBlock === 1;
                    if (isBlockStart && simState.samplerState.contractInitialRecordPending) {
                        samplingSource = 'initial_start';
                        simState.samplerState.contractInitialRecordPending = false;
                    } else {
                        samplingSource = isBlockStart ? 'fixed_block_restart' : 'fixed_block_continuation';
                    }
                } else {
                    samplingSource = methode;
                }
            }
            recordMonteCarloSampledYearV1(samplingDiagnostics, {
                yearData,
                source: samplingSource,
                stationaryRestartReason: stationarySample?.restartReason || null
            });
            yearData = applyStressOverride(yearData, stressCtx, rand);
            const tailRiskOverlay = applyTailRiskOverlay(yearData, tailRiskSchedule[simulationsJahr] ?? null, {
                runIdx,
                simulationsJahr,
                methode,
                stressPreset: inputs?.stressPreset
            });
            yearData = tailRiskOverlay.yearData;
            tailRiskEntriesThisRun.push(tailRiskOverlay);

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
                let qx1 = resolveSimulatorMortalityProbability(inputs.geschlecht, ageP1);
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
                let qx2 = resolveSimulatorMortalityProbability(p2Gender, ageP2);
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
                    inflation: yearData.inflation,
                    tailRiskOverlay
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

            // Measure the exact modelled care addition passed to the engine.
            // It is a need, not an attributable depot cash flow. Real values use
            // the same start-price factor as the current simulator year.
            recordMonteCarloCareNeedYear(careNeedTracker, {
                p1CareAdditionalNeedNominalEur: careCostP1.zusatzFloor,
                p2CareAdditionalNeedNominalEur: careCostP2?.zusatzFloor,
                priceFactor: resolveSimulatorCumulativeInflationFactor(simState)
            });

            // Do NOT modify simState.baseFlex permanently.
            // We pass the effectiveFlexFactor to simulateOneYear to apply it only for the current year's spending decision.
            // The simulation engine will then base the NEXT year's state on the original (unreduced) baseFlex.
            const stateWithCareFlex = {
                ...simState
            };

            // Berechne dynamische Rentenanpassung basierend auf Modus (fix/wage/cpi)
            const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
            const resolvedCapeRatio = resolveMonteCarloCape(yearData, inputs, simState.marketDataHist);
            const jointAliveThisYear = hasPartner && p1Alive && p2Alive;
            if (wasJointAliveAtPreviousHorizon && !jointAliveThisYear && Number.isFinite(previousDynamicHorizon)) {
                longevityTransitionStartYear = simulationsJahr;
                longevityTransitionAnchorHorizon = previousDynamicHorizon;
            } else if (jointAliveThisYear) {
                longevityTransitionStartYear = null;
                longevityTransitionAnchorHorizon = null;
            }
            const horizonResolution = resolveDynamicFlexRunnerHorizon(inputs, {
                yearIndex: simulationsJahr,
                ageP1,
                ageP2,
                p1Alive,
                p2Alive,
                applyTransitionSmoothing: longevityTransitionStartYear !== null,
                previousHorizon: longevityTransitionAnchorHorizon,
                yearsSinceTransition: longevityTransitionStartYear === null
                    ? 0
                    : simulationsJahr - longevityTransitionStartYear
            });
            const dynamicHorizonYears = horizonResolution.horizonYears;
            const adjustedInputs = {
                ...inputs,
                rentAdjPct: effectiveRentAdjPct,
                transitionYear: effectiveTransitionYear,
                capeRatio: resolvedCapeRatio,
                marketCapeRatio: resolvedCapeRatio,
                horizonYears: dynamicHorizonYears,
                ...(horizonResolution.diagnostics?.longevityMode !== 'none'
                    ? { longevityHorizonDiagnostics: horizonResolution.diagnostics }
                    : {})
            };
            previousDynamicHorizon = dynamicHorizonYears;
            wasJointAliveAtPreviousHorizon = jointAliveThisYear;
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

            const adapterFlagsConflict = (result?.kind === 'success' && result?.isRuin === true)
                || (result?.kind === 'ruin' && result?.isRuin === false);
            if (adapterFlagsConflict) {
                technicalPathError = normalizeTechnicalPathError({
                    error: {
                        code: 'MC_TERMINAL_FLAGS_CONFLICT',
                        message: 'Der Jahresadapter lieferte widerspruechliche Terminalflags.'
                    }
                }, runIdx, simulationsJahr);
                break;
            }

            if (result?.kind === 'technical_error' || result?.error) {
                technicalPathError = normalizeTechnicalPathError(result, runIdx, simulationsJahr);
                break;
            }

            if (result?.kind === 'ruin' || result?.isRuin === true) {
                failed = true;
                // Bei Ruin ist das Depot definitiv erschöpft - setze Alter
                if (!depotErschoepfungAlterGesetzt) {
                    alterBeiErschoepfung[i] = ageP1;
                    alterBeiErschoepfungMissingness[i] = 1;
                    depotErschoepfungAlterGesetzt = true;
                }
                if (currentRunLog) currentRunLog.push(buildMonteCarloRuinLogRow({
                    simulationsJahr,
                    yearData,
                    inputs,
                    lifeLogContext,
                    tailRiskOverlay
                }));
                if (BREAK_ON_RUIN) break;
            } else if ((result?.kind === undefined || result.kind === 'success')
                && result?.newState?.portfolio
                && result?.logData) {
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
                const cutPct = Number(result.logData.entscheidung.kuerzungProzent);
                if (Number.isFinite(cutPct)) {
                    if (cutPct >= 10) kpiJahreMitKuerzungDieserLauf++;
                    if (!isAccumulation) {
                        cutDecisionYearsThisRun++;
                        if (cutPct >= 10) cutYearsNumeratorThisRun++;
                    }
                    kpiMaxKuerzungDieserLauf = Math.max(kpiMaxKuerzungDieserLauf, cutPct);
                }

                const depotOnlyNow = sumDepot(simState.portfolio);
                depotNurHistorie.push(depotOnlyNow);

                if (!depotErschoepfungAlterGesetzt && depotOnlyNow <= DEPOT_DEPLETION_THRESHOLD) {
                    alterBeiErschoepfung[i] = ageP1;
                    alterBeiErschoepfungMissingness[i] = 1;
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
                if (Number.isFinite(Number(result.logData.jahresentnahme_real))) {
                    realWithdrawalsThisRun.push(Number(result.logData.jahresentnahme_real));
                }

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
                    lifeLogContext,
                    tailRiskOverlay
                }));
            } else {
                technicalPathError = normalizeTechnicalPathError(result, runIdx, simulationsJahr);
                break;
            }
        }

        if (technicalPathError) {
            technicalInventory.technicalError++;
            if (technicalInventory.errors.length < MAX_TECHNICAL_ERROR_SAMPLES) {
                technicalInventory.errors.push(technicalPathError);
            }
            recordMonteCarloPathSummaryV1({
                pathSummaries,
                pathMissingness,
                localIndex: i,
                globalRunIndex: runIdx,
                outcomeCode: MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR,
                technicalError: true
            });
            continue;
        }

        const terminalResolution = resolveMonteCarloTerminalOutcomeV1({
            ruinInStartedFinancialYear: failed,
            allDeadTiming: runEndedBecauseAllDied
                ? failed ? 'after_ruin' : 'before_next_financial_obligation'
                : null,
            horizonExhausted: !failed && !runEndedBecauseAllDied && lebensdauer === maxDauer
        });
        if (terminalResolution.outcomeCode === MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR) {
            const errorCode = terminalResolution.errorCode || 'MC_TERMINAL_OUTCOME_INVALID';
            technicalInventory.technicalError++;
            if (technicalInventory.errors.length < MAX_TECHNICAL_ERROR_SAMPLES) {
                technicalInventory.errors.push({
                    runIndex: runIdx,
                    simulationYearIndex: Math.max(0, lebensdauer - 1),
                    code: errorCode,
                    message: `Ein Simulationspfad verletzte den terminalen Outcome-Vertrag (${errorCode}).`
                });
            }
            recordMonteCarloPathSummaryV1({
                pathSummaries,
                pathMissingness,
                localIndex: i,
                globalRunIndex: runIdx,
                outcomeCode: MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR,
                technicalError: true
            });
            continue;
        }

        technicalInventory.financiallyEvaluable++;
        if (terminalResolution.outcomeCode === MONTE_CARLO_OUTCOME_CODE.RUIN) outcomeCounts.ruin++;
        if (terminalResolution.outcomeCode === MONTE_CARLO_OUTCOME_CODE.ALL_DEAD) outcomeCounts.all_dead++;
        if (terminalResolution.outcomeCode === MONTE_CARLO_OUTCOME_CODE.HORIZON_EXHAUSTED) outcomeCounts.horizon_exhausted++;

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

        const { volPct, maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);
        volatilities[i] = volPct;
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

        const depotOnlyEnd = depotNurHistorie[depotNurHistorie.length - 1] || 0;
        const ruinOrDepleted = failed || depotOnlyEnd <= DEPOT_DEPLETION_THRESHOLD;
        const finalValueNominalEur = failed ? 0 : portfolioTotal(simState.portfolio);
        const finalValueRealEur = finalValueNominalEur / resolveSimulatorCumulativeInflationFactor(simState);
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
            finalValueRealEur,
            ruinOrDepleted,
            careEverActive,
            triggeredAge,
            triggeredAgeP2,
            p1CareYears,
            p2CareYears,
            bothCareYears,
            hasPartner,
            ...careNeedTracker,
            runSafetyStage1Ever,
            runSafetyStage2Ever,
            healthBucketEnabledThisRun,
            healthBucketUsedThisRun,
            healthBucketEndThisRun,
            healthBucketCoveragePctThisRun,
            healthBucketTargetGapThisRun,
            healthBucketInterestThisRun,
            tailRiskEntriesThisRun,
            currentRunLog
        });
        recordMonteCarloPathSummaryV1({
            pathSummaries,
            pathMissingness,
            localIndex: i,
            globalRunIndex: runIdx,
            outcomeCode: terminalResolution.outcomeCode,
            finalValueNominalEur: finalOutcomes[i],
            finalValueRealEur,
            volatilityPct: volatilities[i],
            maxDrawdownPct: maxDrawdowns[i],
            cutYearsNumerator: cutYearsNumeratorThisRun,
            cutYearsDenominator: cutDecisionYearsThisRun,
            realWithdrawalP10RealEur: realWithdrawalsThisRun.length > 0
                ? quantile(realWithdrawalsThisRun, 0.10)
                : null,
            realWithdrawalObservationCount: realWithdrawalsThisRun.length,
            p1CareEntryAge: triggeredAge,
            p2CareEntryAge: triggeredAgeP2,
            p1CareYears,
            p2CareYears,
            bothCareYears,
            careEverActive,
            hasPartner,
            ...careNeedTracker,
            healthBucketEnabled: healthBucketEnabledThisRun,
            healthBucketUsedEur: healthBucketUsedThisRun,
            healthBucketEndEur: healthBucketEndThisRun,
            healthBucketCoveragePct: healthBucketCoveragePctThisRun,
            healthBucketTargetGapEur: healthBucketTargetGapThisRun,
            healthBucketInterestEur: healthBucketInterestThisRun,
            taxSavedByLossCarryEur: totalTaxSavedByLossCarryThisRun
        });
    }

    const finalizedMetrics = finalizeMonteCarloRunMetrics(runMetrics);
    finalizedMetrics.totals.outcomeRuinCount = outcomeCounts.ruin;
    finalizedMetrics.totals.outcomeAllDeadCount = outcomeCounts.all_dead;
    finalizedMetrics.totals.outcomeHorizonExhaustedCount = outcomeCounts.horizon_exhausted;
    finalizeMonteCarloSamplingDiagnosticsV1(samplingDiagnostics, finalizedMetrics.totals);

    return createMonteCarloChunkResultV1({
        runRange: { start: runStart, count: runCount },
        buffers,
        pathSummaries,
        pathMissingness,
        heatmap,
        bins: MC_HEATMAP_BINS,
        totals: finalizedMetrics.totals,
        lists: finalizedMetrics.lists,
        allRealWithdrawalsSample: finalizedMetrics.allRealWithdrawalsSample,
        worstRun: finalizedMetrics.worstRun,
        worstRunCare: finalizedMetrics.worstRunCare,
        runMeta: finalizedMetrics.runMeta,
        batchStatus: technicalInventory.technicalError > 0 ? 'technical_error' : 'completed',
        financialMetricsValid: technicalInventory.technicalError === 0,
        technicalInventory,
        samplingDiagnostics
    });
}
