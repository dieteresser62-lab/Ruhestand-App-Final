/**
 * Module: Auto-Optimize Core
 * Purpose: Central logic for the auto-optimization feature.
 *          Implements Latin Hypercube Sampling (LHS), candidate filtering, and multi-stage evaluation (Quick -> Full -> Refine -> Validate).
 * Usage: Called by auto_optimize_ui.js to run the optimization process.
 * Dependencies: auto-optimize-metrics.js, auto-optimize-params.js, auto-optimize-evaluate.js, auto-optimize-sampling.js
 */
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
import { isValidCandidate } from './auto-optimize-params.js';
import { latinHypercubeSample, generateNeighborsReduced } from './auto-optimize-sampling.js';
import { evaluateCandidate } from './auto-optimize-evaluate.js';
import { CandidateCache, tieBreaker } from './auto-optimize-utils.js';
import { checkConstraints, getObjectiveValue } from './auto-optimize-metrics.js';

export { getObjectiveValue } from './auto-optimize-metrics.js';

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
        onProgress = () => { },
        evaluateCandidateFn
    } = config;
    const evaluate = evaluateCandidateFn || evaluateCandidate;

    // Prepare historical data
    prepareHistoricalData();

    // Basis-Inputs
    const baseInputs = getCommonInputs();

    // Gold Cap aus Config
    const goldCap = baseInputs.goldAllokationProzent || 10;

    // RNG für LHS
    const rand = rng(42);

    // Seeds generieren
    const trainSeedArray = Array.from({ length: seedsTrain }, (_, i) => 42 + i);
    const testSeedArray = Array.from({ length: seedsTest }, (_, i) => 420 + i);

    // Cache
    const cache = new CandidateCache();

    onProgress({ stage: 'lhs', progress: 0 });

    // OPTIMIZATION 1: Reduzierte LHS-Größe (100 statt 200)
    const lhsSamples = latinHypercubeSample(params, 100, rand);

    const validCandidates = [];
    for (const sample of lhsSamples) {
        // Dynamically copy all parameters from sample
        const candidate = { ...sample };

        if (isValidCandidate(candidate, goldCap)) {
            validCandidates.push(candidate);
        }
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

                if (results) {
                    // Quick-Filter: Sortiere nur nach Objective, keine harten Constraints
                    const objValue = getObjectiveValue(results, objective);
                    return { candidate, objValue, quickResults: results };
                }
                return null;
            })
        );

        quickFiltered.push(...batchResults.filter(r => r !== null));
        onProgress({ stage: 'quick_filter', progress: Math.min(i + BATCH_SIZE, validCandidates.length), total: validCandidates.length });
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

                const results = cache.get(candidate);
                if (results && checkConstraints(results, constraints)) {
                    const objValue = getObjectiveValue(results, objective);
                    return { candidate, results, objValue };
                }
                return null;
            })
        );

        evaluated.push(...batchResults.filter(r => r !== null));
        onProgress({ stage: 'evaluate_lhs', progress: Math.min(i + BATCH_SIZE, top50.length), total: top50.length });
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
            if (isValidCandidate(neighbor, goldCap)) {
                refineCandidates.add(JSON.stringify(neighbor));
            }
        }
    }

    const refineArray = Array.from(refineCandidates).map(s => JSON.parse(s));

    onProgress({ stage: 'refine', progress: 0, total: refineArray.length });

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

                const results = cache.get(candidate);
                if (results && checkConstraints(results, constraints)) {
                    const objValue = getObjectiveValue(results, objective);
                    return { candidate, results, objValue };
                }
                return null;
            })
        );

        evaluated.push(...batchResults.filter(r => r !== null));
        onProgress({ stage: 'refine', progress: Math.min(i + BATCH_SIZE, refineArray.length), total: refineArray.length });
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
            const testObjValue = getObjectiveValue(testResults, objective);
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

    // Stabilität: Wie oft war Champion in den Top-3 über verschiedene Seed-Kombinationen?
    // Vereinfachte Metrik: Verhältnis Train-Objective zu Test-Objective
    const stability = Math.min(1, champion.trainObjValue / (champion.testObjValue + 0.0001));

    // Delta vs. Current - dynamically build current config from baseInputs
    const currentConfig = {};

    // Map all possible parameters from baseInputs to candidate format
    if (params.runwayMinM !== undefined) {
        currentConfig.runwayMinM = baseInputs.runwayMinMonths || 24;
    }
    if (params.runwayTargetM !== undefined) {
        currentConfig.runwayTargetM = baseInputs.runwayTargetMonths || 36;
    }
    if (params.goldTargetPct !== undefined) {
        currentConfig.goldTargetPct = baseInputs.goldAllokationProzent || 0;
    }
    if (params.targetEq !== undefined) {
        currentConfig.targetEq = baseInputs.targetEq || 60;
    }
    if (params.rebalBand !== undefined) {
        currentConfig.rebalBand = baseInputs.rebalBand || 5;
    }
    if (params.maxSkimPct !== undefined) {
        currentConfig.maxSkimPct = baseInputs.maxSkimPctOfEq || 25;
    }
    if (params.maxBearRefillPct !== undefined) {
        currentConfig.maxBearRefillPct = baseInputs.maxBearRefillPctOfEq || 50;
    }

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

    return {
        championCfg: champion.candidate,
        metricsTest: champion.testResults,
        deltaVsCurrent: delta,
        stability
    };
}
