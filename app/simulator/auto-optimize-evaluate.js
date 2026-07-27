/**
 * Module: Auto-Optimize Evaluate
 * Purpose: Evaluates a single optimization candidate by running a Monte Carlo simulation.
 *          Clone inputs, applies mutations, runs MC, and aggregates KPIs (Success Rate, Drawdown).
 * Usage: Used by auto_optimize.js to score candidates.
 * Dependencies: auto-optimize-worker.js, simulator-sweep-utils.js
 */
"use strict";

import { deepClone, normalizeWidowOptions } from './simulator-sweep-utils.js';
import { runMonteCarloAutoOptimize } from './auto-optimize-worker.js';
import { validateSimulatorInputs } from './simulator-input-validation.js';
import {
    applyAutoOptimizeCandidateToInputs,
    createAutoOptimizeParameterFingerprint,
    createAutoOptimizeRequestFingerprint,
    readAutoOptimizeCandidateFromInputs
} from './auto-optimize-param-meta.js';

/**
 * Führt eine MC-Simulation für einen Kandidaten aus
 * @param {object} candidate - Parameter-Objekt mit beliebigen Keys
 * @param {object} baseInputs - Basis-Config
 * @param {number} runsPerCandidate - Anzahl MC-Runs
 * @param {number} maxDauer - Max. Simulationsdauer in Jahren
 * @param {Array<number>} seeds - Seed-Array
 * @param {object} constraints - Constraints (optional, für Early Exit)
 * @param {object|null} evaluationContract - Versionierte MC-/Sampling-Annahmen
 * @returns {Promise<object|null>} Aggregierte Ergebnisse oder null wenn Constraints verletzt
 */
export async function evaluateCandidate(
    candidate,
    baseInputs,
    runsPerCandidate,
    maxDauer,
    seeds,
    constraints = null,
    evaluationContract = null
) {
    // Deep-clone inputs und Override anwenden
    const inputs = deepClone(baseInputs);

    // Null ist ein gueltiger Wert. Nur fehlende Werte erhalten Defaults.
    inputs.runwayMinMonths ??= 24;
    inputs.runwayTargetMonths ??= 36;
    inputs.goldZielProzent ??= 0;
    inputs.goldAktiv ??= Number(inputs.goldZielProzent) > 0;
    inputs.targetEq ??= 60;
    inputs.rebalBand ??= 5;
    inputs.maxSkimPctOfEq ??= 25;
    inputs.maxBearRefillPctOfEq ??= 50;

    const normalizedCandidate = applyAutoOptimizeCandidateToInputs(candidate, inputs, { goldCap: 50 });
    const appliedCandidate = readAutoOptimizeCandidateFromInputs(Object.keys(normalizedCandidate), inputs);
    const parameterFingerprint = createAutoOptimizeParameterFingerprint(appliedCandidate);
    const requestFingerprint = createAutoOptimizeRequestFingerprint(appliedCandidate);

    validateSimulatorInputs(inputs);
    // Normalisiere Widow Options
    const widowOptions = normalizeWidowOptions(inputs.widowOptions);

    // Sammle Ergebnisse über alle Seeds
    const allResults = [];
    const samplingParameters = evaluationContract?.monteCarloParameters || {};
    const useCapeSampling = evaluationContract?.useCapeSampling === true;

    for (const seed of seeds) {
        const monteCarloParams = {
            ...samplingParameters,
            anzahl: runsPerCandidate,
            maxDauer,
            blockSize: samplingParameters.blockSize ?? 5,
            seed,
            methode: samplingParameters.methode ?? 'regime_markov',
            rngMode: samplingParameters.rngMode ?? 'per-run-seed',
            startYearMode: samplingParameters.startYearMode ?? 'UNIFORM',
            startYearFilter: samplingParameters.startYearFilter ?? 1970,
            startYearHalfLife: samplingParameters.startYearHalfLife ?? 20,
            excludeEstimatedHistory: samplingParameters.excludeEstimatedHistory ?? false
        };

        const { aggregatedResults, failCount } = await runMonteCarloAutoOptimize({
            inputs,
            widowOptions,
            monteCarloParams,
            useCapeSampling,
            onProgress: () => { }
        });

        allResults.push({ aggregatedResults, failCount, anzahl: runsPerCandidate });

        // OPTIMIZATION: Early Exit bei harten Constraint-Verletzungen
        // Wenn bereits nach 1-2 Seeds klar ist, dass Constraints verletzt werden,
        // müssen die restlichen Seeds nicht mehr berechnet werden
        if (constraints && allResults.length >= 2) {
            const partialAvg = {
                successRate: mean(allResults.map(r => (r.anzahl - r.failCount) / r.anzahl)),
                depletionRate: mean(allResults.map(r => (r.aggregatedResults.depotErschoepfungsQuote ?? 0) / 100)), // % → 0-1
                timeShareWRgt45: mean(allResults.map(r => r.aggregatedResults.extraKPI?.timeShareQuoteAbove45 ?? 0)),
                worst5Drawdown: mean(allResults.map(r => (r.aggregatedResults.maxDrawdowns?.p90 ?? 0) / 100)) // % → 0-1
            };

            // Harte Constraints: Wenn deutlich verfehlt (>5% Puffer), abbrechen
            if (constraints.sr99 && partialAvg.successRate < 0.94) return null;
            if (constraints.noex && partialAvg.depletionRate > 0.05) return null;
            if (constraints.ts45 && partialAvg.timeShareWRgt45 > 0.05) return null;
            if (constraints.dd55 && partialAvg.worst5Drawdown > 0.60) return null;
        }
    }

    // Mittelwerte über Seeds bilden
    // WICHTIG: Normalisierung - manche Werte sind bereits in % (→ /100), andere in Dezimal
    const avgResults = {
        successProbFloor: mean(allResults.map(r => (r.anzahl - r.failCount) / r.anzahl)),
        depletionRate: mean(allResults.map(r => (r.aggregatedResults.depotErschoepfungsQuote ?? 0) / 100)), // % → 0-1
        timeShareWRgt45: mean(allResults.map(r => r.aggregatedResults.extraKPI?.timeShareQuoteAbove45 ?? 0)), // already 0-1
        p25EndWealth: mean(allResults.map(r => r.aggregatedResults.finalOutcomes?.p10 ?? 0)), // absolute €
        medianEndWealth: mean(allResults.map(r => r.aggregatedResults.finalOutcomes?.p50 ?? 0)), // absolute €
        worst5Drawdown: mean(allResults.map(r => (r.aggregatedResults.maxDrawdowns?.p90 ?? 0) / 100)), // % → 0-1
        medianWithdrawalRate: 0, // Not available in aggregatedResults
        parameterFidelity: Object.freeze({
            schemaVersion: 'AutoOptimizeCandidateFidelityV1',
            parameterFingerprint,
            requestFingerprint
        })
    };

    return avgResults;
}

/**
 * Hilfsfunktion: Mittelwert
 */
function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}
