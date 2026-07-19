import {
    deriveHistoricalBacktestMetrics,
    FLEX_REDUCTION_OPERATOR,
    FLEX_REDUCTION_THRESHOLD_PCT,
    HISTORICAL_BACKTEST_METRIC_DESCRIPTORS,
    HISTORICAL_BACKTEST_METRICS_SCHEMA_VERSION
} from '../app/simulator/historical-backtest-metrics.js';

console.log('--- Historical Backtest Metrics Tests ---');

function row({
    year,
    endWealth,
    inflationPct,
    withdrawal,
    reductionPct,
    runwayPct,
    floorRequired,
    floorPaid,
    explicitShortfall,
    taxes,
    taxSaved,
    lossCarry
}) {
    return {
        jahr: year,
        inflationVJ: inflationPct,
        wertAktien: endWealth,
        wertGold: 0,
        liquiditaet: 0,
        entscheidung: {
            jahresEntnahme: withdrawal,
            kuerzungProzent: reductionPct
        },
        row: {
            portfolio_total_end: endWealth,
            floor_aus_depot: floorRequired,
            entnahme_effektiv: floorPaid,
            ...(explicitShortfall === undefined ? {} : { floor_shortfall_nominal: explicitShortfall }),
            RunwayCoveragePct: runwayPct,
            steuern_gesamt: taxes,
            taxSavedByLossCarry: taxSaved,
            lossCarryEnd: lossCarry
        }
    };
}

const goldenResult = {
    schemaVersion: 'BacktestRunResultV1',
    outcome: { kind: 'completed' },
    requestedYears: 3,
    completedYears: 3,
    portfolioStart: 1000,
    portfolioEnd: 700,
    rows: [
        row({
            year: 2000,
            endWealth: 1200,
            inflationPct: 10,
            withdrawal: 10,
            reductionPct: 9.99,
            runwayPct: 120,
            floorRequired: 50,
            floorPaid: 50,
            taxes: 1,
            taxSaved: 0,
            lossCarry: 0
        }),
        row({
            year: 2001,
            endWealth: 900,
            inflationPct: 0,
            withdrawal: 11,
            reductionPct: 10,
            runwayPct: 80,
            floorRequired: 70,
            floorPaid: 50,
            explicitShortfall: 20,
            taxes: 2,
            taxSaved: 4,
            lossCarry: 10
        }),
        row({
            year: 2002,
            endWealth: 700,
            inflationPct: 0,
            withdrawal: 12,
            reductionPct: 25,
            runwayPct: 50,
            floorRequired: 80,
            floorPaid: 50,
            taxes: 3,
            taxSaved: 5,
            lossCarry: 7
        })
    ],
    summary: {
        healthBucket: { enabled: true, end: 42, realCoveragePct: 80, targetGap: 10 }
    }
};

const before = JSON.stringify(goldenResult);
const metrics = deriveHistoricalBacktestMetrics(goldenResult);
const values = metrics.values;

assertEqual(metrics.schemaVersion, HISTORICAL_BACKTEST_METRICS_SCHEMA_VERSION, 'metric bundle is versioned');
assertEqual(FLEX_REDUCTION_OPERATOR, 'gte', 'reduction operator is explicit');
assertEqual(FLEX_REDUCTION_THRESHOLD_PCT, 10, 'reduction threshold is explicit');
assertEqual(metrics.reductionContract.includesExactThreshold, true, 'exactly ten percent is included');
assertEqual(metrics.reductionContract.metricId, 'flex_reduction_years_gte_10_pct', 'metric id encodes the inclusive threshold');
assertEqual(values.wealth_start_nominal_eur, 1000, 'start wealth reconciles to the canonical start snapshot');
assertEqual(values.wealth_end_nominal_eur, 700, 'end wealth reconciles to the canonical end snapshot');
assertClose(values.wealth_end_real_eur, 700 / 1.1, 1e-12, 'real end wealth uses the complete inflation path without display rounding');
assertEqual(values.withdrawal_total_nominal_eur, 33, 'withdrawals sum raw yearly rows');
assertEqual(values.floor_shortfall_occurred, true, 'floor shortfall occurrence is detected');
assertEqual(values.floor_shortfall_years, 2, 'floor shortfall duration counts affected years');
assertEqual(values.floor_shortfall_total_nominal_eur, 50, 'nominal shortfall sums explicit and reconstructible raw rows');
assertClose(values.floor_shortfall_total_real_eur, 50 / 1.1, 1e-12, 'real shortfall uses the inflation factor at each year start');
assertClose(values.floor_shortfall_max_real_eur, 30 / 1.1, 1e-12, 'maximum real shortfall remains unrounded');
assertEqual(values.floor_shortfall_longest_streak_years, 2, 'longest floor-shortfall streak is reconciled');
assertEqual(values.flex_reduction_years_gte_10_pct, 2, 'exactly ten and values above ten are counted');
assertEqual(values.flex_reduction_max_pct, 25, 'maximum reduction depth is retained');
assertEqual(values.flex_reduction_longest_streak_gte_10_pct, 2, 'inclusive reduction streak is reconciled');
assertEqual(values.runway_min_coverage_pct, 50, 'minimum runway coverage is derived');
assertEqual(values.runway_stress_years_below_100_pct, 2, 'runway stress years use the documented strict below-100 operator');
assertClose(values.wealth_max_drawdown_nominal_end_series_pct, (500 / 1200) * 100, 1e-12, 'drawdown uses nominal year-end wealth including the start snapshot');
assertEqual(values.tax_total_nominal_eur, 6, 'tax total reconciles to raw rows');
assertEqual(values.tax_saved_by_loss_carry_total_nominal_eur, 9, 'loss-carry tax savings reconcile to raw rows');
assertEqual(values.loss_carry_end_nominal_eur, 7, 'terminal loss carry uses the last canonical raw value');
assertEqual(values.health_bucket_end_nominal_eur, 42, 'health bucket metric uses the canonical result summary');
assertEqual(values.outcome_is_completed, true, 'completed outcome indicator is set');
assertEqual(values.outcome_is_ruin, false, 'ruin outcome indicator is clear');
assertEqual(metrics.availability.floor_shortfall_total_real_eur, 'available', 'availability is explicit');
assertEqual(JSON.stringify(goldenResult), before, 'metric derivation does not mutate the canonical result');

const descriptorIds = HISTORICAL_BACKTEST_METRIC_DESCRIPTORS.map(entry => entry.id);
assertEqual(new Set(descriptorIds).size, descriptorIds.length, 'metric descriptor ids are unique');
for (const descriptor of HISTORICAL_BACKTEST_METRIC_DESCRIPTORS) {
    assert(typeof descriptor.id === 'string' && descriptor.id.length > 0, `${descriptor.id} has an id`);
    assert(typeof descriptor.label === 'string' && descriptor.label.length > 0, `${descriptor.id} has a label`);
    assert(typeof descriptor.unit === 'string' && descriptor.unit.length > 0, `${descriptor.id} has a unit`);
    assert(['nominal', 'real', 'not_applicable'].includes(descriptor.nominalOrReal), `${descriptor.id} declares nominal/real basis`);
    assert(typeof descriptor.sign === 'string' && descriptor.sign.length > 0, `${descriptor.id} declares a sign interpretation`);
    assert(typeof descriptor.aggregationRule === 'string' && descriptor.aggregationRule.length > 0, `${descriptor.id} declares aggregation`);
    assert(typeof descriptor.denominator === 'string' && descriptor.denominator.length > 0, `${descriptor.id} declares denominator`);
    assert(descriptor.rounding.phase === 'display_only', `${descriptor.id} keeps rounding out of raw metrics`);
    assert(typeof descriptor.missingnessRule === 'string' && descriptor.missingnessRule.length > 0, `${descriptor.id} declares missingness`);
    assert(typeof descriptor.outcomeRule === 'string' && descriptor.outcomeRule.length > 0, `${descriptor.id} declares outcome handling`);
    assert(Object.prototype.hasOwnProperty.call(values, descriptor.id), `${descriptor.id} has a canonical raw value`);
}

const incomplete = deriveHistoricalBacktestMetrics({
    schemaVersion: 'BacktestRunResultV1',
    outcome: { kind: 'incomplete' },
    requestedYears: 3,
    completedYears: 0,
    rows: [],
    portfolioStart: null,
    portfolioEnd: null,
    summary: { healthBucket: { enabled: false, end: 0 } }
});
assertEqual(incomplete.values.wealth_end_nominal_eur, null, 'incomplete run has no invented financial end wealth');
assertEqual(incomplete.values.floor_shortfall_years, null, 'incomplete run has no invented shortfall denominator');
assertEqual(incomplete.values.outcome_is_incomplete, true, 'incomplete outcome remains explicit');
assertEqual(incomplete.availability.wealth_end_nominal_eur, 'missing', 'missing financial values are machine readable');

console.log('✅ Historical backtest metrics tests passed');
