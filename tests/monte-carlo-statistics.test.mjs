import {
    buildBinaryProportionEstimate,
    calculateWilson95Interval,
    summarizePerRunRealWithdrawalP10
} from '../app/simulator/monte-carlo-statistics.js';
import { MONTE_CARLO_MISSINGNESS_CODE } from '../app/simulator/monte-carlo-chunk-result.js';

console.log('--- Monte Carlo Statistics Tests ---');

{
    const none = calculateWilson95Interval(0, 10);
    assertClose(none.lowerRatio, 0, 1e-15, 'Wilson 0/n should have a zero lower bound');
    assertClose(none.upperRatio, 0.2775327998628892, 1e-12, 'Wilson 0/n should retain a non-zero upper bound');

    const all = calculateWilson95Interval(10, 10);
    assertClose(all.lowerRatio, 0.7224672001371107, 1e-12, 'Wilson n/n should retain a lower uncertainty bound');
    assertClose(all.upperRatio, 1, 1e-15, 'Wilson n/n should have an upper bound of one');

    const half = calculateWilson95Interval(5, 10);
    assertClose(half.lowerRatio, 0.236593090512564, 1e-12, 'Wilson midpoint lower bound should match the reviewed formula');
    assertClose(half.upperRatio, 0.7634069094874361, 1e-12, 'Wilson midpoint upper bound should match the reviewed formula');
}

{
    const small = buildBinaryProportionEstimate({ successes: 8, trials: 10 });
    assertEqual(small.estimatePct, 80, 'Binary estimator should expose the point estimate in percent');
    assertEqual(small.sampleSize, 10, 'Binary estimator should expose requested runs as sample size');
    assertEqual(small.uncertaintyWarning.code, 'small_sample', 'Run counts below 1000 should produce a visible precision warning');
    assert(small.confidenceInterval95.lowerPct < 80 && small.confidenceInterval95.upperPct > 80, 'Wilson interval should contain the point estimate');

    const standard = buildBinaryProportionEstimate({ successes: 800, trials: 1000 });
    assertEqual(standard.uncertaintyWarning, null, 'The warning should clear at the documented 1000-run threshold');

    const failed = buildBinaryProportionEstimate({ successes: 8, trials: 10, technicalErrorCount: 1 });
    assertEqual(failed.estimatePct, null, 'Technical errors should suppress the binary point estimate fail-closed');
    assertEqual(failed.confidenceInterval95, null, 'Technical errors should suppress the Wilson interval fail-closed');
}

{
    const summary = summarizePerRunRealWithdrawalP10({
        values: new Float64Array([0, 10000, 20000, 0, 0]),
        observationCounts: new Uint32Array([5, 5, 5, 0, 0]),
        missingness: new Uint8Array([
            MONTE_CARLO_MISSINGNESS_CODE.OBSERVED,
            MONTE_CARLO_MISSINGNESS_CODE.OBSERVED,
            MONTE_CARLO_MISSINGNESS_CODE.OBSERVED,
            MONTE_CARLO_MISSINGNESS_CODE.DIED_BEFORE_FIRST_OBLIGATION,
            MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR
        ]),
        totalRuns: 5,
        missingnessCodes: MONTE_CARLO_MISSINGNESS_CODE
    });
    assertClose(summary.realEur, 2000, 1e-12, 'Across-run P10 should reduce one equally weighted scalar per evaluable run');
    assertClose(summary.p50RealEur, 10000, 1e-12, 'Across-run P50 should reduce the same per-run scalar population');
    assertEqual(summary.sampleSize, 3, 'Quantile result should expose evaluable run count');
    assertEqual(summary.excludedRuns, 2, 'Quantile result should expose excluded run count');
    assertEqual(summary.missingness.died_before_first_obligation, 1, 'Missingness inventory should separate death before decumulation');
    assertEqual(summary.missingness.technical_error, 1, 'Missingness inventory should separate technical errors');
    assertEqual(summary.uncertainty.confidenceInterval, null, 'Quantile result must not imply an unimplemented confidence interval');
}

console.log('--- Monte Carlo Statistics Tests Completed ---');
