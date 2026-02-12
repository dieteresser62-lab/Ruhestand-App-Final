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

/**
 * Führt eine MC-Simulation für einen Kandidaten aus
 * @param {object} candidate - Parameter-Objekt mit beliebigen Keys
 * @param {object} baseInputs - Basis-Config
 * @param {number} runsPerCandidate - Anzahl MC-Runs
 * @param {number} maxDauer - Max. Simulationsdauer in Jahren
 * @param {Array<number>} seeds - Seed-Array
 * @param {object} constraints - Constraints (optional, für Early Exit)
 * @returns {Promise<object|null>} Aggregierte Ergebnisse oder null wenn Constraints verletzt
 */
export async function evaluateCandidate(candidate, baseInputs, runsPerCandidate, maxDauer, seeds, constraints = null) {
    // Deep-clone inputs und Override anwenden
    const inputs = deepClone(baseInputs);

    // Setze Defaults
    if (!inputs.runwayMinMonths) inputs.runwayMinMonths = 24;
    if (!inputs.runwayTargetMonths) inputs.runwayTargetMonths = 36;
    if (!inputs.goldAllokationProzent) inputs.goldAllokationProzent = 0;
    if (!inputs.targetEq) inputs.targetEq = 60;
    if (!inputs.rebalBand) inputs.rebalBand = 5;
    if (!inputs.maxSkimPctOfEq) inputs.maxSkimPctOfEq = 25;
    if (!inputs.maxBearRefillPctOfEq) inputs.maxBearRefillPctOfEq = 50;

    // Mutationen für alle vorhandenen Parameter anwenden
    if (candidate.runwayMinM !== undefined) {
        inputs.runwayMinMonths = candidate.runwayMinM;
    }
    if (candidate.runwayTargetM !== undefined) {
        inputs.runwayTargetMonths = candidate.runwayTargetM;
    }
    if (candidate.goldTargetPct !== undefined) {
        inputs.goldAllokationProzent = candidate.goldTargetPct;
    }
    if (candidate.targetEq !== undefined) {
        inputs.targetEq = candidate.targetEq;
    }
    if (candidate.rebalBand !== undefined) {
        inputs.rebalBand = candidate.rebalBand;
    }
    if (candidate.maxSkimPct !== undefined) {
        inputs.maxSkimPctOfEq = candidate.maxSkimPct;
    }
    if (candidate.maxBearRefillPct !== undefined) {
        inputs.maxBearRefillPctOfEq = candidate.maxBearRefillPct;
    }
    if (candidate.horizonYears !== undefined) {
        inputs.horizonYears = candidate.horizonYears;
    }
    if (candidate.survivalQuantile !== undefined) {
        inputs.survivalQuantile = candidate.survivalQuantile;
        // Quantile wirkt nur in dieser Horizon-Methode.
        inputs.horizonMethod = 'survival_quantile';
    }
    if (candidate.goGoMultiplier !== undefined) {
        inputs.goGoMultiplier = candidate.goGoMultiplier;
        if (inputs.dynamicFlex === true) {
            // Bei Optimierung des Multiplikators Go-Go sicher aktivieren.
            inputs.goGoActive = true;
        }
    }

    // Normalisiere Widow Options
    const widowOptions = normalizeWidowOptions(inputs.widowOptions);

    // Sammle Ergebnisse über alle Seeds
    const allResults = [];

    for (const seed of seeds) {
        const monteCarloParams = {
            anzahl: runsPerCandidate,
            maxDauer,
            blockSize: 5,
            seed,
            methode: 'regime_markov'
        };

        const { aggregatedResults, failCount } = await runMonteCarloAutoOptimize({
            inputs,
            widowOptions,
            monteCarloParams,
            useCapeSampling: false,
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
        medianWithdrawalRate: 0 // Not available in aggregatedResults
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
