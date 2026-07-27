/**
 * Module: Auto-Optimize Core
 * Purpose: Central logic for the auto-optimization feature.
 *          Implements Latin Hypercube Sampling (LHS), candidate filtering, and multi-stage evaluation (Quick -> Full -> Refine -> Validate).
 * Usage: Called by auto_optimize_ui.js to run the optimization process.
 * Dependencies: auto-optimize-metrics.js, auto-optimize-param-meta.js,
 *               auto-optimize-evaluate.js, auto-optimize-sampling.js
 */
// Note: This module uses Promise.all batching for candidate evaluation,
// not WebWorker-based parallelism. See worker-job-runner.js for the
// Worker-based orchestration pattern used by MC and Sweep.
"use strict";

/**
 * =============================================================================
 * AUTO-OPTIMIZE CORE LOGIC
 * =============================================================================
 *
 * Generische Auto-Optimierung für den Simulator basierend auf:
 * - Einer frei wählbaren Metrik (Objective)
 * - Genau drei Parametern mit Ranges
 * - Separaten Train/Test Seeds für robuste Validierung
 * - Constraint-basierter Kandidatenfilterung
 * - Effizienter Suche via Latin Hypercube Sampling + lokale Verfeinerung
 *
 * Die Ranges übersteuern temporär die Rahmendaten pro Kandidat.
 */

import { rng } from './simulator-utils.js';
import { getCommonInputs, prepareHistoricalData } from './simulator-portfolio.js';
import { latinHypercubeSample, generateNeighborsReduced } from './auto-optimize-sampling.js';
import { evaluateCandidate } from './auto-optimize-evaluate.js';
import { CandidateCache, tieBreaker } from './auto-optimize-utils.js';
import { checkConstraints, getObjectiveValue } from './auto-optimize-metrics.js';
import {
    AUTO_OPTIMIZE_DYNAMIC_FLEX_PARAM_KEYS,
    assertAutoOptimizeParameterRanges,
    createAutoOptimizeParameterFingerprint,
    createAutoOptimizeRequestFingerprint,
    isAutoOptimizeCandidateValid,
    readAutoOptimizeCandidateFromInputs
} from './auto-optimize-param-meta.js';
import { normalizeMonteCarloParametersV1 } from './monte-carlo-parameters.js';
import { readMonteCarloParameters } from './monte-carlo-ui.js';

export { getObjectiveValue } from './auto-optimize-metrics.js';

function resolveDynamicFlexMode(modeRaw) {
    const mode = String(modeRaw || 'inherit').toLowerCase();
    if (mode === 'force_on' || mode === 'force_off' || mode === 'inherit') return mode;
    return 'inherit';
}

function applyDynamicFlexMode(baseInputs, modeRaw) {
    const mode = resolveDynamicFlexMode(modeRaw);
    const resolved = { ...(baseInputs || {}) };
    if (mode === 'force_on') {
        resolved.dynamicFlex = true;
    } else if (mode === 'force_off') {
        resolved.dynamicFlex = false;
    }
    return { inputs: resolved, mode };
}

function hasDynamicFlexOptimizerParams(params) {
    return Object.keys(params || {}).some(key => AUTO_OPTIMIZE_DYNAMIC_FLEX_PARAM_KEYS.has(key));
}

const AUTO_OPTIMIZE_EVALUATION_CONTRACT_VERSION = 'AutoOptimizeEvaluationContractV1';
const AUTO_OPTIMIZE_SEED_CONTRACT_VERSION = 'AutoOptimizeSeedContractV1';
const CONFIRMATION_SEED_OFFSET = 0x9E3779B9;

function readControlChecked(id, fallback, doc = globalThis.document) {
    const element = doc?.getElementById?.(id);
    return element ? element.checked === true : fallback;
}

function buildAutoOptimizeEvaluationContract({
    runsPerCandidate,
    maxDauer,
    baseInputs,
    modelAssumptions = null,
    doc = globalThis.document
}) {
    const suppliedParameters = modelAssumptions?.monteCarloParameters;
    const rawParameters = suppliedParameters || readMonteCarloParameters(baseInputs);
    const monteCarloParameters = normalizeMonteCarloParametersV1({
        ...rawParameters,
        anzahl: runsPerCandidate,
        maxDauer
    }, { inputs: baseInputs });
    const useCapeSampling = modelAssumptions?.useCapeSampling === undefined
        ? readControlChecked('useCapeSampling', false, doc)
        : modelAssumptions.useCapeSampling === true;

    return Object.freeze({
        schemaVersion: AUTO_OPTIMIZE_EVALUATION_CONTRACT_VERSION,
        source: suppliedParameters ? 'explicit_canonical_request' : 'main_monte_carlo_controls',
        monteCarloParameters,
        useCapeSampling,
        dataFilter: Object.freeze({
            startYearMode: monteCarloParameters.startYearMode,
            startYearFilter: monteCarloParameters.startYearFilter,
            startYearHalfLife: monteCarloParameters.startYearHalfLife,
            excludeEstimatedHistory: monteCarloParameters.excludeEstimatedHistory
        }),
        fixedModelAssumptions: Object.freeze({
            capeRatio: Number.isFinite(Number(baseInputs?.marketCapeRatio))
                ? Number(baseInputs.marketCapeRatio)
                : (Number.isFinite(Number(baseInputs?.capeRatio)) ? Number(baseInputs.capeRatio) : null),
            stressPreset: baseInputs?.stressPreset ?? 'NONE',
            dynamicFlex: baseInputs?.dynamicFlex === true,
            horizonMethod: baseInputs?.horizonMethod ?? 'survival_quantile',
            maxDauer
        })
    });
}

function deriveSeedArrays(baseSeed, trainCount, confirmationCount) {
    if (!Number.isSafeInteger(trainCount) || trainCount < 1 || trainCount > 20) {
        throw new TypeError('Train-Seeds muessen als ganze Zahl zwischen 1 und 20 angegeben werden.');
    }
    if (!Number.isSafeInteger(confirmationCount) || confirmationCount < 1 || confirmationCount > 20) {
        throw new TypeError('Bestaetigungsseeds muessen als ganze Zahl zwischen 1 und 20 angegeben werden.');
    }
    const trainSeeds = Array.from({ length: trainCount }, (_, index) => (baseSeed + index) >>> 0);
    const confirmationSeeds = Array.from(
        { length: confirmationCount },
        (_, index) => (baseSeed + CONFIRMATION_SEED_OFFSET + index) >>> 0
    );
    const trainSet = new Set(trainSeeds);
    if (confirmationSeeds.some(seed => trainSet.has(seed))) {
        throw new Error('Train- und Bestaetigungsseeds muessen disjunkt sein.');
    }
    return Object.freeze({
        schemaVersion: AUTO_OPTIMIZE_SEED_CONTRACT_VERSION,
        baseSeed,
        derivation: 'train=uint32(base+i); confirmation=uint32(base+0x9E3779B9+i)',
        trainSeeds: Object.freeze(trainSeeds),
        confirmationSeeds: Object.freeze(confirmationSeeds),
        disjoint: true
    });
}

function computeDynamicFlexSafetyPenalty(results, objective) {
    const sr = Number(results?.successProbFloor);
    const dd = Number(results?.worst5Drawdown);
    const ts = Number(results?.timeShareWRgt45);
    const wr = Number(results?.medianWithdrawalRate);

    const srPenalty = Number.isFinite(sr) ? Math.max(0, (0.97 - sr) / 0.05) : 0;
    const ddPenalty = Number.isFinite(dd) ? Math.max(0, (dd - 0.50) / 0.20) : 0;
    const tsPenalty = Number.isFinite(ts) ? Math.max(0, (ts - 0.12) / 0.20) : 0;
    const wrPenalty = Number.isFinite(wr) ? Math.max(0, (wr - 0.055) / 0.020) : 0;
    const combined = (0.30 * srPenalty) + (0.35 * ddPenalty) + (0.25 * tsPenalty) + (0.10 * wrPenalty);
    if (combined <= 0) return 0;

    if (objective?.metric === 'EndWealth_P50' || objective?.metric === 'EndWealth_P25') {
        const wealthBase = Math.max(50000, Number(results?.medianEndWealth) || 0);
        return wealthBase * Math.min(0.75, combined * 0.35);
    }
    return Math.min(0.8, combined * 0.2);
}

function computeObjectiveWithSafety(results, objective, useSafetyGuards) {
    const baseObjective = getObjectiveValue(results, objective);
    if (!useSafetyGuards) return baseObjective;
    const penalty = computeDynamicFlexSafetyPenalty(results, objective);
    return baseObjective - penalty;
}

/**
 * Hauptfunktion: Auto-Optimize
 * @param {object} config - Konfiguration
 * @returns {Promise<object>} {championCfg, metricsTest, deltaVsCurrent, stability}
 */
export async function runAutoOptimize(config) {
    const {
        objective,
        params,
        runsPerCandidate,
        seedsTrain,
        seedsTest,
        constraints,
        maxDauer,
        dynamicFlexMode = 'inherit',
        safetyGuards = true,
        onProgress = () => { },
        evaluateCandidateFn,
        modelAssumptions = null
    } = config;
    const evaluateImplementation = evaluateCandidateFn || evaluateCandidate;

    // Prepare historical data
    prepareHistoricalData();

    // Basis-Inputs
    const baseInputsRaw = getCommonInputs();
    const { inputs: baseInputs, mode: effectiveDynamicFlexMode } = applyDynamicFlexMode(baseInputsRaw, dynamicFlexMode);
    const usesDynamicFlexParams = hasDynamicFlexOptimizerParams(params);
    const safetyGuardsActive = safetyGuards !== false && usesDynamicFlexParams;

    if (usesDynamicFlexParams && baseInputs.dynamicFlex !== true) {
        throw new Error('Dynamic-Flex Parameter im Optimizer gewaehlt, aber Dynamic Flex ist nicht aktiv (Mode=force_on oder aktive Rahmendaten erforderlich).');
    }
    assertAutoOptimizeParameterRanges(params, baseInputs);

    // Validate the comparison configuration before generating or evaluating
    // candidates so invalid framework data cannot discard a completed run.
    const currentConfig = readAutoOptimizeCandidateFromInputs(params, baseInputs);

    const evaluationContract = buildAutoOptimizeEvaluationContract({
        runsPerCandidate,
        maxDauer,
        baseInputs,
        modelAssumptions
    });
    const seedContract = deriveSeedArrays(
        evaluationContract.monteCarloParameters.seed,
        seedsTrain,
        seedsTest
    );
    const trainSeedArray = seedContract.trainSeeds;
    const testSeedArray = seedContract.confirmationSeeds;

    const evaluate = async (candidate, evaluationInputs, runs, duration, seeds, activeConstraints = null) => {
        const results = await evaluateImplementation(
            candidate,
            evaluationInputs,
            runs,
            duration,
            seeds,
            activeConstraints,
            evaluationContract
        );
        if (results?.parameterFidelity) {
            const expectedParameterFingerprint = createAutoOptimizeParameterFingerprint(candidate);
            const expectedRequestFingerprint = createAutoOptimizeRequestFingerprint(candidate);
            if (
                results.parameterFidelity.parameterFingerprint !== expectedParameterFingerprint
                || results.parameterFidelity.requestFingerprint !== expectedRequestFingerprint
            ) {
                const error = new Error('Evaluate-Request weicht vom kanonischen Kandidatenfingerprint ab.');
                error.code = 'AUTO_OPTIMIZE_EVALUATE_FINGERPRINT_MISMATCH';
                throw error;
            }
        }
        return results;
    };

    // Gold bleibt innerhalb des kanonischen Prozentvertrags.
    const goldCap = 50;

    // RNG für LHS
    const rand = rng(42);

    // Cache
    const cache = new CandidateCache();

    onProgress({ stage: 'lhs', progress: 0 });

    // OPTIMIZATION 1: Reduzierte LHS-Größe (100 statt 200)
    const lhsSamples = latinHypercubeSample(params, 100, rand);

    const validCandidates = [];
    for (const sample of lhsSamples) {
        // Dynamically copy all parameters from sample
        const candidate = { ...sample };

        if (isAutoOptimizeCandidateValid(candidate, goldCap, baseInputs)) {
            validCandidates.push(candidate);
        }
    }
    if (validCandidates.length === 0) {
        const error = new Error('Kein gueltiger Kandidat: Suchbereiche und Runway-Reihenfolge passen nicht zu den Rahmendaten.');
        error.code = 'AUTO_OPTIMIZE_CANDIDATE_SET_EMPTY';
        throw error;
    }

    onProgress({ stage: 'quick_filter', progress: 0, total: validCandidates.length });

    // OPTIMIZATION 2: Early Pruning - Quick-Filter mit reduzierten Runs
    // Phase 1a: Quick-Filter mit nur 200 Runs × 2 Seeds
    const quickFilterRuns = Math.min(200, Math.round(runsPerCandidate * 0.1));
    const quickFilterSeeds = trainSeedArray.slice(0, 2);

    // Quick-Filter: KEINE Constraints (zu wenig Runs, zu hohe Varianz)
    // Constraints werden erst bei voller Evaluation mit allen Runs geprüft
    const BATCH_SIZE = 4; // OPTIMIZATION 3: Parallele Evaluation
    const quickFiltered = [];

    let quickCompleted = 0;
    for (let i = 0; i < validCandidates.length; i += BATCH_SIZE) {
        const batch = validCandidates.slice(i, i + BATCH_SIZE);

        // Parallel evaluation
        const batchResults = await Promise.all(
            batch.map(async (candidate) => {
                const results = await evaluate(
                    candidate,
                    baseInputs,
                    quickFilterRuns,
                    maxDauer,
                    quickFilterSeeds,
                    null // KEIN Early Exit im Quick-Filter (zu wenig Runs für verlässliche Constraints)
                );

                quickCompleted++;
                onProgress({ stage: 'quick_filter', progress: quickCompleted, total: validCandidates.length });

                if (results) {
                    // Quick-Filter: Sortiere nur nach Objective, keine harten Constraints
                    const objValue = computeObjectiveWithSafety(results, objective, safetyGuardsActive);
                    return { candidate, objValue, quickResults: results };
                }
                return null;
            })
        );

        quickFiltered.push(...batchResults.filter(r => r !== null));
    }

    if (quickFiltered.length === 0) {
        throw new Error('Quick filter failed: all candidates produced invalid results');
    }

    // Sortiere und nimm Top-50
    quickFiltered.sort((a, b) => b.objValue - a.objValue);
    const top50 = quickFiltered.slice(0, Math.min(50, quickFiltered.length));

    onProgress({ stage: 'evaluate_lhs', progress: 0, total: top50.length });

    // Phase 1b: Volle Evaluation der Top-50
    const evaluated = [];

    let evalCompleted = 0;
    for (let i = 0; i < top50.length; i += BATCH_SIZE) {
        const batch = top50.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
            batch.map(async (entry) => {
                const candidate = entry.candidate;

                if (!cache.has(candidate)) {
                    const results = await evaluate(
                        candidate,
                        baseInputs,
                        runsPerCandidate,
                        maxDauer,
                        trainSeedArray,
                        constraints
                    );
                    if (results) cache.set(candidate, results);
                }

                evalCompleted++;
                onProgress({ stage: 'evaluate_lhs', progress: evalCompleted, total: top50.length });

                const results = cache.get(candidate);
                if (results && checkConstraints(results, constraints)) {
                    const objValue = computeObjectiveWithSafety(results, objective, safetyGuardsActive);
                    return { candidate, results, objValue };
                }
                return null;
            })
        );

        evaluated.push(...batchResults.filter(r => r !== null));
    }

    if (evaluated.length === 0) {
        throw new Error('No candidates satisfied constraints after full evaluation');
    }

    // Sortiere nach Objective
    evaluated.sort((a, b) => b.objValue - a.objValue);

    // Top-5 für lokale Verfeinerung (statt Top-10)
    const top5 = evaluated.slice(0, 5);

    onProgress({ stage: 'refine', progress: 0 });

    // Phase 2: Lokale Verfeinerung (nur ±2 statt ±2/±4)
    const refineCandidates = new Set();
    for (const entry of top5) {
        const neighbors = generateNeighborsReduced(entry.candidate, params);
        for (const neighbor of neighbors) {
            if (isAutoOptimizeCandidateValid(neighbor, goldCap, baseInputs)) {
                refineCandidates.add(JSON.stringify(neighbor));
            }
        }
    }

    const refineArray = Array.from(refineCandidates).map(s => JSON.parse(s));

    onProgress({ stage: 'refine', progress: 0, total: refineArray.length });

    let refineCompleted = 0;
    for (let i = 0; i < refineArray.length; i += BATCH_SIZE) {
        const batch = refineArray.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
            batch.map(async (candidate) => {
                if (!cache.has(candidate)) {
                    const results = await evaluate(
                        candidate,
                        baseInputs,
                        runsPerCandidate,
                        maxDauer,
                        trainSeedArray,
                        constraints
                    );
                    if (results) cache.set(candidate, results);
                }

                refineCompleted++;
                onProgress({ stage: 'refine', progress: refineCompleted, total: refineArray.length });

                const results = cache.get(candidate);
                if (results && checkConstraints(results, constraints)) {
                    const objValue = computeObjectiveWithSafety(results, objective, safetyGuardsActive);
                    return { candidate, results, objValue };
                }
                return null;
            })
        );

        evaluated.push(...batchResults.filter(r => r !== null));
    }

    // Neu sortieren
    evaluated.sort((a, b) => {
        const diff = b.objValue - a.objValue;
        if (Math.abs(diff) > 0.0001) return diff;
        return tieBreaker(a, b);
    });

    // Top-3 für Test-Validierung
    const top3 = evaluated.slice(0, 3);

    onProgress({ stage: 'validate', progress: 0, total: top3.length });

    // Phase 3: Validierung auf Test-Seeds
    const validated = [];
    for (let i = 0; i < top3.length; i++) {
        const entry = top3[i];

        const testResults = await evaluate(
            entry.candidate,
            baseInputs,
            runsPerCandidate,
            maxDauer,
            testSeedArray
        );

        if (checkConstraints(testResults, constraints)) {
            const testObjValue = computeObjectiveWithSafety(testResults, objective, safetyGuardsActive);
            validated.push({
                candidate: entry.candidate,
                trainResults: entry.results,
                testResults,
                trainObjValue: entry.objValue,
                testObjValue
            });
        }

        onProgress({ stage: 'validate', progress: i + 1, total: top3.length });
    }

    if (validated.length === 0) {
        throw new Error('No candidates passed validation on test seeds');
    }

    // Champion-Auswahl (basierend auf Test-Objective)
    validated.sort((a, b) => {
        const diff = b.testObjValue - a.testObjValue;
        if (Math.abs(diff) > 0.0001) return diff;
        return tieBreaker(
            { results: a.testResults },
            { results: b.testResults }
        );
    });

    const champion = validated[0];
    const parameterFidelity = Object.freeze({
        schemaVersion: 'AutoOptimizeChampionFidelityV1',
        parameterFingerprint: createAutoOptimizeParameterFingerprint(champion.candidate),
        requestFingerprint: createAutoOptimizeRequestFingerprint(champion.candidate)
    });
    Object.defineProperties(champion.candidate, {
        __autoOptimizeParameterFingerprint: {
            value: parameterFidelity.parameterFingerprint,
            enumerable: false
        },
        __autoOptimizeRequestFingerprint: {
            value: parameterFidelity.requestFingerprint,
            enumerable: false
        }
    });

    // Stabilität: Wie oft war Champion in den Top-3 über verschiedene Seed-Kombinationen?
    // Vereinfachte Metrik: Verhältnis Train-Objective zu Test-Objective
    const stability = Math.min(1, champion.trainObjValue / (champion.testObjValue + 0.0001));

    const currentResults = await evaluate(
        currentConfig,
        baseInputs,
        runsPerCandidate,
        maxDauer,
        testSeedArray
    );

    const delta = {
        successRate: (champion.testResults.successProbFloor ?? 0) - (currentResults.successProbFloor ?? 0),
        drawdownP90: (champion.testResults.worst5Drawdown ?? 0) - (currentResults.worst5Drawdown ?? 0),
        endWealthP50: (champion.testResults.medianEndWealth ?? 0) - (currentResults.medianEndWealth ?? 0),
        timeShareWRgt45: (champion.testResults.timeShareWRgt45 ?? 0) - (currentResults.timeShareWRgt45 ?? 0)
    };

    onProgress({ stage: 'done', progress: 1 });

    const reportedEvaluationContract = Object.freeze({
        ...evaluationContract,
        seedContract
    });
    return {
        championCfg: champion.candidate,
        metricsTest: champion.testResults,
        deltaVsCurrent: delta,
        stability,
        parameterFidelity,
        optimizationContext: {
            dynamicFlexMode: effectiveDynamicFlexMode,
            dynamicFlexActive: baseInputs.dynamicFlex === true,
            safetyGuardsActive,
            usesDynamicFlexParams,
            evaluationContract: reportedEvaluationContract
        }
    };
}
