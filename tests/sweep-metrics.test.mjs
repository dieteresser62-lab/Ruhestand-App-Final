import { computeRunStatsFromSeries } from '../app/simulator/simulator-engine-helpers.js';
import {
    aggregateSweepMetrics,
    SWEEP_COMPARISON_DIAGNOSTICS_VERSION,
    SWEEP_DRAWDOWN_DEFINITION_VERSION,
    SWEEP_METRICS_VERSION
} from '../app/simulator/simulator-results.js';
import { readSweepMetricValue } from '../app/simulator/sweep-metrics-contract.js';
import {
    mergeApplicableRunwayMinimum,
    readApplicableRunwayMonths
} from '../app/simulator/sweep-runner.js';

console.log('--- Sweep Metrics Contract Tests ---');

{
    const outcomes = Array.from({ length: 100 }, (_, index) => ({
        finalVermoegen: 100000 + index,
        maxDrawdown: index + 1,
        minRunway: 24,
        failed: index < 5
    }));
    const metrics = aggregateSweepMetrics(outcomes, {
        commonRandomNumbers: true,
        randomPolicyVersion: 'SweepCommonRandomNumbersV2'
    });

    assertEqual(metrics.schemaVersion, SWEEP_METRICS_VERSION, 'Sweep metric result shape is versioned');
    assertEqual(metrics.metricMetadata.definitions.minRunwayObserved.unit, 'months', 'Runway metadata declares months');
    assertEqual(metrics.metricMetadata.definitions.minRunwayObserved.measurementPhase, 'after_transaction_before_payout', 'Runway metadata declares the pre-payout phase');
    assert(metrics.metricMetadata.definitions.minRunwayObserved.source.includes('runway_after_transaction_before_payout_months'), 'Runway metadata names the canonical monthly source');
    assertClose(metrics.worst5Drawdown, 95.05, 1e-12, 'D-06 uses P95 of the ascending non-negative loss distribution');
    assertClose(metrics.p10EndWealth, 100009.9, 1e-12, 'P10 end wealth uses the canonical interpolated quantile');
    assertClose(metrics.p25EndWealth, 100024.75, 1e-12, 'P25 end wealth uses the canonical interpolated quantile');
    assertClose(metrics.medianEndWealth, 100049.5, 1e-12, 'Median end wealth uses the canonical interpolated quantile');
    assertClose(metrics.p75EndWealth, 100074.25, 1e-12, 'P75 end wealth uses the canonical interpolated quantile');
    assertEqual(
        metrics.metricMetadata.definitions.worst5Drawdown.definitionVersion,
        SWEEP_DRAWDOWN_DEFINITION_VERSION,
        'Drawdown definition is independently versioned'
    );
    assertEqual(
        metrics.metricMetadata.definitions.worst5Drawdown.quantileDirection,
        'ascending_loss_distribution_upper_tail',
        'Drawdown metadata fixes the bad-tail direction'
    );
    assertEqual(
        metrics.metricMetadata.definitions.worst5Drawdown.terminalRuinLossPct,
        100,
        'Drawdown metadata fixes terminal ruin at a 100 percent loss'
    );
    assertEqual(
        metrics.comparison.schemaVersion,
        SWEEP_COMPARISON_DIAGNOSTICS_VERSION,
        'Sweep comparison diagnostics are versioned'
    );
    assertEqual(metrics.comparison.runCount, 100, 'Comparison diagnostics expose the evaluated run count');
    assertEqual(metrics.comparison.commonRandomNumbers, true, 'Comparison diagnostics expose active common random numbers');
    assertEqual(
        metrics.comparison.successProbability.confidenceInterval95.method,
        'wilson_score',
        'Success probability exposes the established Wilson interval'
    );
    assertEqual(
        metrics.comparison.quantileUncertainty.confidenceInterval,
        null,
        'Quantile uncertainty does not invent an unimplemented confidence interval'
    );
    assertEqual(
        metrics.comparison.ranking.status,
        'experimental_point_estimate',
        'Ranking status remains explicitly experimental'
    );
}

{
    const outcomes = Array.from({ length: 200 }, (_, index) => ({
        finalVermoegen: index < 11 ? 0 : 100000,
        maxDrawdown: index < 11 ? 100 : 34,
        minRunway: index < 11 ? 0 : 24,
        failed: index < 11
    }));
    const metrics = aggregateSweepMetrics(outcomes);
    assertEqual(metrics.worst5Drawdown, 100, 'P95 enters the terminal-ruin block above a five percent ruin share');
    assertEqual(
        metrics.comparison.drawdownQuantile.terminalRuinRuns,
        11,
        'Comparison diagnostics expose the terminal-ruin run count'
    );
    assertClose(
        metrics.comparison.drawdownQuantile.terminalRuinSharePct,
        5.5,
        1e-12,
        'Comparison diagnostics expose the terminal-ruin share'
    );
    assertEqual(
        metrics.comparison.drawdownQuantile.quantileInTerminalRuinBlock,
        true,
        'Comparison diagnostics mark a drawdown quantile saturated by terminal ruin'
    );
}

{
    let rejected = false;
    try {
        aggregateSweepMetrics([
            { finalVermoegen: 1, maxDrawdown: -10, minRunway: 12, failed: false },
            { finalVermoegen: 0, maxDrawdown: 140, minRunway: 0, failed: true }
        ]);
    } catch (error) {
        rejected = error instanceof RangeError;
    }
    assert(rejected, 'Out-of-domain drawdown losses fail closed instead of being clamped to terminal ruin');
}

{
    const { maxDDpct } = computeRunStatsFromSeries([250000, 275000, 0]);
    assertClose(maxDDpct, 100, 1e-12, 'A terminal zero after a positive peak produces exactly 100 percent maximum drawdown');
}

{
    const canonical = {
        metrics: aggregateSweepMetrics([
            { finalVermoegen: 100, maxDrawdown: 20, minRunway: 12, failed: false }
        ])
    };
    assertEqual(readSweepMetricValue(canonical, 'worst5Drawdown'), 20, 'Canonical metric reader returns finite values');
    assertEqual(
        readSweepMetricValue({ metrics: { worst5Drawdown: 20 } }, 'worst5Drawdown'),
        null,
        'Canonical metric reader rejects an unversioned shape'
    );
    assertEqual(
        readSweepMetricValue({ metrics: { ...canonical.metrics, schemaVersion: 'SweepMetricsV3' } }, 'worst5Drawdown'),
        null,
        'Canonical metric reader rejects the former percent-as-months contract version'
    );
    assertEqual(
        readSweepMetricValue({
            metrics: {
                ...canonical.metrics,
                worst5Drawdown: Number.NaN
            }
        }, 'worst5Drawdown'),
        null,
        'Canonical metric reader rejects non-finite values'
    );
}

{
    assertEqual(readApplicableRunwayMonths({
        RunwayMeasurementPhase: 'after_transaction_before_payout',
        runway_after_transaction_before_payout_months: 60,
        RunwayCoveragePct: 100
    }), 60, 'Sweep runner reads canonical pre-payout months instead of the coverage percentage');
    assertEqual(readApplicableRunwayMonths({
        RunwayMeasurementPhase: 'post_payout_end_of_year',
        runway_after_transaction_before_payout_months: 48
    }), null, 'Sweep runner rejects a runway value from the wrong measurement phase');
    assertEqual(readApplicableRunwayMonths({
        RunwayMeasurementPhase: 'after_transaction_before_payout',
        RunwayCoveragePct: 100
    }), null, 'Sweep runner does not treat a coverage percentage as months when the monthly field is absent');
    assertEqual(mergeApplicableRunwayMinimum(null, null), null, 'Sweep runner preserves missing runway months');
    assertEqual(mergeApplicableRunwayMinimum(null, 24), 24, 'Sweep runner initializes the first applicable runway');
    assertEqual(mergeApplicableRunwayMinimum(24, 0), 0, 'Sweep runner preserves an applicable zero runway');
    assertEqual(mergeApplicableRunwayMinimum(12, 24), 12, 'Sweep runner retains the lower applicable runway');

    const mixedApplicability = aggregateSweepMetrics([
        { finalVermoegen: 100, maxDrawdown: 10, minRunway: null, failed: false },
        { finalVermoegen: 100, maxDrawdown: 10, minRunway: 24, failed: false },
        { finalVermoegen: 100, maxDrawdown: 10, minRunway: 12, failed: false }
    ]);
    assertEqual(mixedApplicability.minRunwayObserved, 12, 'Sweep aggregation ignores non-applicable runway years');

    const noApplicableRunway = aggregateSweepMetrics([
        { finalVermoegen: 100, maxDrawdown: 10, minRunway: null, failed: false }
    ]);
    assertEqual(noApplicableRunway.minRunwayObserved, null, 'All-non-applicable sweep runway remains null');
    assertEqual(
        readSweepMetricValue({ metrics: noApplicableRunway }, 'minRunwayObserved'),
        null,
        'Canonical metric reader must not coerce a null runway metric to zero'
    );
    assertEqual(
        aggregateSweepMetrics([]).minRunwayObserved,
        null,
        'An empty sweep has no observed runway minimum'
    );
}

console.log('--- Sweep Metrics Contract Tests Completed ---');
