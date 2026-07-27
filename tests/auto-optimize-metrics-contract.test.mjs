"use strict";

import { buildMonteCarloAggregates } from '../app/simulator/monte-carlo-aggregates.js';
import {
    MONTE_CARLO_MISSINGNESS_CODE,
    createMonteCarloPathSummaryV1
} from '../app/simulator/monte-carlo-chunk-result.js';
import { createMonteCarloBuffers } from '../app/simulator/monte-carlo-runner-utils.js';
import {
    AUTO_OPTIMIZE_METRIC_RESULT_VERSION,
    checkConstraints,
    getObjectiveValue
} from '../app/simulator/auto-optimize-metrics.js';
import { tieBreaker } from '../app/simulator/auto-optimize-utils.js';

console.log('--- Auto-Optimize Metrics Contract Tests ---');

function buildFixtureAggregates({ technicalIndices = [] } = {}) {
    const totalRuns = 100;
    const buffers = createMonteCarloBuffers(totalRuns);
    createMonteCarloPathSummaryV1(totalRuns, { buffers });
    buffers.finalOutcomes.set(Array.from({ length: totalRuns }, (_value, index) => index + 1));
    buffers.maxDrawdowns.set(Array.from({ length: totalRuns }, (_value, index) => index + 1));

    buffers.meanWithdrawalRateRatio.set([0, 0.01, 0.03, 0.05]);
    buffers.withdrawalRateObservationCount.set([2, 2, 2, 1]);
    buffers.meanWithdrawalRateMissingness.set([
        MONTE_CARLO_MISSINGNESS_CODE.OBSERVED,
        MONTE_CARLO_MISSINGNESS_CODE.OBSERVED,
        MONTE_CARLO_MISSINGNESS_CODE.OBSERVED,
        MONTE_CARLO_MISSINGNESS_CODE.OBSERVED,
        MONTE_CARLO_MISSINGNESS_CODE.DIED_BEFORE_FIRST_OBLIGATION
    ]);
    for (const index of technicalIndices) {
        buffers.finalOutcomes[index] = 0;
        buffers.maxDrawdowns[index] = 0;
        buffers.meanWithdrawalRateMissingness[index] = MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR;
    }

    return buildMonteCarloAggregates({
        inputs: { stressPreset: 'NONE' },
        totalRuns,
        buffers,
        heatmap: [new Uint32Array([0])],
        bins: [0, Infinity],
        totals: {
            outcomeRuinCount: 0,
            outcomeAllDeadCount: 0,
            outcomeHorizonExhaustedCount: totalRuns,
            totalSimulatedYears: 0,
            totalYearsQuoteAbove45: 0,
            shortfallWithCareCount: 0,
            shortfallNoCareProxyCount: 0
        },
        lists: {}
    });
}

{
    const aggregates = buildFixtureAggregates();
    assertClose(aggregates.finalOutcomes.p10, 10.9, 1e-12,
        'O-21 P10 should use linear interpolation over the final-outcome distribution');
    assertClose(aggregates.finalOutcomes.p25, 25.75, 1e-12,
        'O-21 P25 should use its own final-outcome quantile');
    assertClose(aggregates.finalOutcomes.p50, 50.5, 1e-12,
        'O-21 P50 should use the final-outcome median');
    assertClose(aggregates.medianWithdrawalRate.medianRatio, 0.02, 1e-15,
        'D-14 should take the median across canonical per-run arithmetic means');
    assertEqual(aggregates.medianWithdrawalRate.sampleSize, 4,
        'D-14 sample size should count observed runs including a real zero');
    assertEqual(aggregates.medianWithdrawalRate.excludedRuns, 96,
        'D-14 should expose excluded runs separately');
    assertEqual(aggregates.medianWithdrawalRate.missingness.died_before_first_obligation, 1,
        'D-14 should retain death-before-obligation missingness');
    assertEqual(aggregates.medianWithdrawalRate.missingness.technical_error, 0,
        'D-14 should retain technical missingness');
    assertEqual(aggregates.medianWithdrawalRate.missingness.no_observations, 95,
        'D-14 should retain no-observation missingness');
    assertEqual(aggregates.medianWithdrawalRate.runMeanRatios[0], 0,
        'D-14 should retain a genuinely observed zero run mean');
}

{
    const aggregates = buildFixtureAggregates({ technicalIndices: [5] });
    assertEqual(aggregates.finalOutcomes.distribution.sampleSize, 99,
        'technical paths should not enter the end-wealth raw distribution');
    assertEqual(aggregates.finalOutcomes.distribution.excludedRuns, 1,
        'end-wealth distribution should expose excluded technical paths');
    assertEqual(aggregates.finalOutcomes.distribution.missingness.technical_error, 1,
        'end-wealth distribution should classify technical missingness');
    assert(!aggregates.finalOutcomes.distribution.values.includes(0),
        'technical end-wealth buffer zero should not become a favorable observation');
    assertEqual(aggregates.maxDrawdowns.distribution.sampleSize, 99,
        'technical paths should not enter the drawdown raw distribution');
    assertEqual(aggregates.maxDrawdowns.distribution.excludedRuns, 1,
        'drawdown distribution should expose excluded technical paths');
    assertEqual(aggregates.maxDrawdowns.distribution.missingness.technical_error, 1,
        'drawdown distribution should classify technical missingness');
    assert(!aggregates.maxDrawdowns.distribution.values.includes(0),
        'technical drawdown buffer zero should not become a favorable observation');
}

{
    const results = {
        metricContract: { schemaVersion: AUTO_OPTIMIZE_METRIC_RESULT_VERSION },
        endWealthQuantilesPct: {
            10: 100,
            25: 250,
            50: 500
        },
        p10EndWealth: 100,
        p25EndWealth: 250,
        medianEndWealth: 500,
        successProbFloor: 0.99,
        depletionRate: 0,
        timeShareWRgt45: 0,
        worst5Drawdown: 0.4,
        medianWithdrawalRate: 0
    };
    assertEqual(
        getObjectiveValue(results, { metric: 'EndWealth_P50', direction: 'max', quantile: 10 }),
        100,
        'The additional quantile field should select P10 instead of being ignored'
    );
    assertEqual(
        getObjectiveValue(results, { metric: 'EndWealth_P25', direction: 'max', quantile: 50 }),
        250,
        'The unchanged UI default 50 should preserve the named P25 selector'
    );
    assertEqual(
        getObjectiveValue(results, { metric: 'Median_WR', direction: 'min' }),
        -0,
        'A genuinely observed Median Withdrawal Rate zero should remain rankable'
    );
}

{
    const p10Leader = {
        endWealthQuantilesPct: { 10: 150, 25: 180, 50: 300 },
        p10EndWealth: 150,
        p25EndWealth: 180,
        medianEndWealth: 300
    };
    const p25Leader = {
        endWealthQuantilesPct: { 10: 100, 25: 220, 50: 350 },
        p10EndWealth: 100,
        p25EndWealth: 220,
        medianEndWealth: 350
    };
    assert(
        getObjectiveValue(p10Leader, { metric: 'EndWealth_P50', direction: 'max', quantile: 10 })
            > getObjectiveValue(p25Leader, { metric: 'EndWealth_P50', direction: 'max', quantile: 10 }),
        'Intentionally reversed P10 ordering should select the P10 leader'
    );
    assert(
        getObjectiveValue(p10Leader, { metric: 'EndWealth_P25', direction: 'max' })
            < getObjectiveValue(p25Leader, { metric: 'EndWealth_P25', direction: 'max' }),
        'Intentionally reversed P25 ordering should select the P25 leader'
    );
}

{
    let missingObjective = null;
    try {
        getObjectiveValue({}, { metric: 'Drawdown_P90', direction: 'min' });
    } catch (error) {
        missingObjective = error;
    }
    assertEqual(missingObjective?.code, 'AUTO_OPTIMIZE_METRIC_UNAVAILABLE',
        'A missing objective metric should fail closed instead of becoming zero');
    assert(!checkConstraints({}, { dd55: true }),
        'A missing drawdown constraint metric should fail closed');

    let missingTiebreaker = null;
    try {
        tieBreaker(
            { results: { successProbFloor: 0.99 } },
            { results: { successProbFloor: 0.99 } }
        );
    } catch (error) {
        missingTiebreaker = error;
    }
    assertEqual(missingTiebreaker?.code, 'AUTO_OPTIMIZE_TIEBREAKER_CONTRACT_MISMATCH',
        'Two unversioned tiebreaker shapes should fail the version gate');

    let versionedMissingTiebreaker = null;
    try {
        tieBreaker(
            {
                results: {
                    metricContract: { schemaVersion: AUTO_OPTIMIZE_METRIC_RESULT_VERSION },
                    successProbFloor: 0.99
                }
            },
            {
                results: {
                    metricContract: { schemaVersion: AUTO_OPTIMIZE_METRIC_RESULT_VERSION },
                    successProbFloor: 0.99
                }
            }
        );
    } catch (error) {
        versionedMissingTiebreaker = error;
    }
    assertEqual(versionedMissingTiebreaker?.code, 'AUTO_OPTIMIZE_METRIC_UNAVAILABLE',
        'A versioned shape with a missing drawdown should fail closed instead of becoming zero');

    assert(!checkConstraints({ successProbFloor: true }, { sr99: true }),
        'Boolean success probability should not be coerced to one');
    assert(!checkConstraints({ worst5Drawdown: [] }, { dd55: true }),
        'Array drawdown should not be coerced to zero');
    let numericStringObjective = null;
    try {
        getObjectiveValue(
            { medianWithdrawalRate: '0.03' },
            { metric: 'Median_WR', direction: 'min' }
        );
    } catch (error) {
        numericStringObjective = error;
    }
    assertEqual(numericStringObjective?.code, 'AUTO_OPTIMIZE_METRIC_UNAVAILABLE',
        'Numeric strings should not pass the metric contract');
}

console.log('--- Auto-Optimize Metrics Contract Tests Completed ---');
