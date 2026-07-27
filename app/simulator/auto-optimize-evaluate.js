/**
 * Module: Auto-Optimize Evaluate
 * Purpose: Evaluates a single optimization candidate by running a Monte Carlo simulation.
 *          Clone inputs, applies mutations, runs MC, and aggregates KPIs (Success Rate, Drawdown).
 * Usage: Used by auto_optimize.js to score candidates.
 * Dependencies: auto-optimize-worker.js, simulator-sweep-utils.js
 */
"use strict";

import { deepClone, normalizeWidowOptions } from './simulator-sweep-utils.js';
import { quantile } from './simulator-utils.js';
import { runMonteCarloAutoOptimize } from './auto-optimize-worker.js';
import { validateSimulatorInputs } from './simulator-input-validation.js';
import { AUTO_OPTIMIZE_METRIC_RESULT_VERSION } from './auto-optimize-metrics.js';
import {
    applyAutoOptimizeCandidateToInputs,
    createAutoOptimizeParameterFingerprint,
    createAutoOptimizeRequestFingerprint,
    readAutoOptimizeCandidateFromInputs
} from './auto-optimize-param-meta.js';

const QUANTILE_METHOD = 'linear_interpolation_at_(n_minus_1)_q';

function metricSourceError(message) {
    const error = new Error(message);
    error.code = 'AUTO_OPTIMIZE_METRIC_SOURCE_INVALID';
    return error;
}

function requireFiniteMetric(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw metricSourceError(`${label} fehlt oder ist nicht endlich.`);
    }
    return value;
}

function collectFiniteDistribution(allResults, reader, label) {
    const combined = [];
    let excludedRuns = 0;
    let technicalErrorCount = 0;
    for (let index = 0; index < allResults.length; index++) {
        const result = allResults[index];
        const distribution = reader(result.aggregatedResults);
        const values = distribution?.values;
        const sampleSize = distribution?.sampleSize;
        const batchExcludedRuns = distribution?.excludedRuns;
        const batchTechnicalErrors = distribution?.missingness?.technical_error;
        if (distribution?.definitionVersion !== 'MonteCarloFinancialRunDistributionV1'
            || !Array.isArray(values) || values.length === 0
            || distribution.quantileMethod !== QUANTILE_METHOD
            || sampleSize !== values.length
            || !Number.isSafeInteger(batchExcludedRuns) || batchExcludedRuns < 0
            || !Number.isSafeInteger(batchTechnicalErrors) || batchTechnicalErrors < 0
            || batchTechnicalErrors !== batchExcludedRuns
            || sampleSize + batchExcludedRuns !== result.anzahl
            || distribution.requestedRuns !== result.anzahl) {
            throw metricSourceError(`${label} besitzt in Seed-Batch ${index + 1} keine gueltige Rohverteilung.`);
        }
        if (batchTechnicalErrors > 0) {
            throw metricSourceError(
                `${label} ist in Seed-Batch ${index + 1} wegen ${batchTechnicalErrors} technischen Pfaden nicht auswertbar.`
            );
        }
        excludedRuns += batchExcludedRuns;
        technicalErrorCount += batchTechnicalErrors;
        combined.push(...values.map((value, valueIndex) => (
            requireFiniteMetric(value, `${label} in Seed-Batch ${index + 1}, Run ${valueIndex + 1}`)
        )));
    }
    return {
        values: combined,
        excludedRuns,
        missingness: Object.freeze({
            technical_error: technicalErrorCount
        })
    };
}

function requireNonNegativeInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw metricSourceError(`${label} muss eine nichtnegative ganze Zahl sein.`);
    }
    return value;
}

function collectWithdrawalRateDistribution(allResults) {
    const values = [];
    const missingness = {
        no_observations: 0,
        died_before_first_obligation: 0,
        technical_error: 0,
        not_applicable: 0
    };
    for (let index = 0; index < allResults.length; index++) {
        const result = allResults[index];
        const aggregate = result.aggregatedResults.medianWithdrawalRate;
        const runValues = aggregate?.runMeanRatios;
        if (aggregate?.definitionVersion !== 'MedianWithdrawalRateD14V1' || !Array.isArray(runValues)) {
            throw metricSourceError(`Median Withdrawal Rate besitzt in Seed-Batch ${index + 1} keinen D-14-Vertrag.`);
        }
        const sampleSize = requireNonNegativeInteger(
            aggregate.sampleSize,
            `Median Withdrawal Rate sampleSize in Seed-Batch ${index + 1}`
        );
        const excludedRuns = requireNonNegativeInteger(
            aggregate.excludedRuns,
            `Median Withdrawal Rate excludedRuns in Seed-Batch ${index + 1}`
        );
        if (sampleSize !== runValues.length || sampleSize + excludedRuns !== result.anzahl) {
            throw metricSourceError(`Median Withdrawal Rate meldet in Seed-Batch ${index + 1} eine inkonsistente Stichprobe.`);
        }
        values.push(...runValues.map((value, valueIndex) => (
            requireFiniteMetric(value, `Median Withdrawal Rate in Seed-Batch ${index + 1}, Run ${valueIndex + 1}`)
        )));

        let missingnessSum = 0;
        for (const key of Object.keys(missingness)) {
            const count = requireNonNegativeInteger(
                aggregate.missingness?.[key],
                `Median Withdrawal Rate missingness.${key} in Seed-Batch ${index + 1}`
            );
            missingness[key] += count;
            missingnessSum += count;
        }
        if (missingnessSum !== excludedRuns) {
            throw metricSourceError(`Median Withdrawal Rate klassifiziert in Seed-Batch ${index + 1} nicht alle ausgeschlossenen Runs.`);
        }
    }
    return {
        values,
        missingness: Object.freeze(missingness)
    };
}

function buildIntegerQuantiles(values) {
    const quantiles = {};
    for (let pct = 1; pct <= 99; pct++) {
        quantiles[pct] = quantile(values, pct / 100);
    }
    return Object.freeze(quantiles);
}

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
                depletionRate: mean(allResults.map(r => (
                    requireFiniteMetric(r.aggregatedResults.depotErschoepfungsQuote, 'Depot-Erschoepfungsquote') / 100
                ))),
                timeShareWRgt45: mean(allResults.map(r => (
                    requireFiniteMetric(r.aggregatedResults.extraKPI?.timeShareQuoteAbove45, 'TimeShare WR > 4,5 %')
                ))),
                worst5Drawdown: mean(allResults.map(r => (
                    requireFiniteMetric(r.aggregatedResults.maxDrawdowns?.p90, 'Drawdown P90') / 100
                )))
            };

            // Harte Constraints: Wenn deutlich verfehlt (>5% Puffer), abbrechen
            if (constraints.sr99 && partialAvg.successRate < 0.94) return null;
            if (constraints.noex && partialAvg.depletionRate > 0.05) return null;
            if (constraints.ts45 && partialAvg.timeShareWRgt45 > 0.05) return null;
            if (constraints.dd55 && partialAvg.worst5Drawdown > 0.60) return null;
        }
    }

    const requestedRuns = allResults.reduce((sum, result) => sum + result.anzahl, 0);
    const successfulRuns = allResults.reduce((sum, result) => sum + (result.anzahl - result.failCount), 0);
    const endWealthDistribution = collectFiniteDistribution(
        allResults,
        aggregated => aggregated.finalOutcomes?.distribution,
        'Endvermoegen'
    );
    const drawdownDistribution = collectFiniteDistribution(
        allResults,
        aggregated => aggregated.maxDrawdowns?.distribution,
        'Drawdown'
    );
    const endWealthValues = endWealthDistribution.values;
    const drawdownValuesPct = drawdownDistribution.values;
    const withdrawalRateDistribution = collectWithdrawalRateDistribution(allResults);
    const withdrawalRateValues = withdrawalRateDistribution.values;
    const endWealthQuantilesPct = buildIntegerQuantiles(endWealthValues);
    const withdrawalRateMissingness = withdrawalRateDistribution.missingness;

    // Kanonische Verteilungen werden ueber alle Train- bzw. Bestaetigungsseeds
    // gepoolt. Echte Nullen bleiben Teil der Verteilung; Missingness bleibt
    // ausschliesslich im versionierten Metrikvertrag.
    const avgResults = {
        metricContract: Object.freeze({
            schemaVersion: AUTO_OPTIMIZE_METRIC_RESULT_VERSION,
            seedBatchCount: allResults.length,
            requestedRuns,
            quantileMethod: QUANTILE_METHOD,
            resultKeys: Object.freeze({
                endWealthQuantilesPct: 'endWealthQuantilesPct',
                successProbability: 'successProbFloor',
                depletionRate: 'depletionRate',
                timeShareWithdrawalRateAbove45: 'timeShareWRgt45',
                drawdownP90: 'worst5Drawdown',
                medianWithdrawalRate: 'medianWithdrawalRate'
            }),
            endWealth: Object.freeze({
                sampleSize: endWealthValues.length,
                missingRuns: endWealthDistribution.excludedRuns,
                missingness: endWealthDistribution.missingness
            }),
            drawdown: Object.freeze({
                definitionVersion: 'MonteCarloDrawdownP90V1',
                quantile: 0.90,
                sampleSize: drawdownValuesPct.length,
                excludedRuns: drawdownDistribution.excludedRuns,
                missingness: drawdownDistribution.missingness,
                sourceUnit: 'percent_loss_from_prior_peak',
                resultUnit: 'ratio',
                crossRunnerComparability: 'not_directly_comparable_to_SweepDrawdownLossP95V1'
            }),
            withdrawalRate: Object.freeze({
                definitionVersion: 'MedianWithdrawalRateD14V1',
                sampleSize: withdrawalRateValues.length,
                excludedRuns: requestedRuns - withdrawalRateValues.length,
                missingness: withdrawalRateMissingness,
                perRunStatistic: 'arithmetic_mean',
                acrossRunStatistic: 'median',
                unit: 'ratio'
            })
        }),
        successProbFloor: successfulRuns / requestedRuns,
        depletionRate: mean(allResults.map(r => (
            requireFiniteMetric(r.aggregatedResults.depotErschoepfungsQuote, 'Depot-Erschoepfungsquote') / 100
        ))),
        timeShareWRgt45: mean(allResults.map(r => (
            requireFiniteMetric(r.aggregatedResults.extraKPI?.timeShareQuoteAbove45, 'TimeShare WR > 4,5 %')
        ))),
        endWealthQuantilesPct,
        p10EndWealth: endWealthQuantilesPct[10],
        p25EndWealth: endWealthQuantilesPct[25],
        medianEndWealth: endWealthQuantilesPct[50],
        worst5Drawdown: quantile(drawdownValuesPct, 0.90) / 100,
        medianWithdrawalRate: withdrawalRateValues.length > 0
            ? quantile(withdrawalRateValues, 0.50)
            : undefined,
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
