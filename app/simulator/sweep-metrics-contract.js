"use strict";

export const SWEEP_METRICS_VERSION = 'SweepMetricsV3';
export const SWEEP_METRIC_METADATA_VERSION = 'SweepMetricMetadataV2';
export const SWEEP_DRAWDOWN_DEFINITION_VERSION = 'SweepDrawdownLossP95V1';
export const SWEEP_COMPARISON_DIAGNOSTICS_VERSION = 'SweepComparisonDiagnosticsV2';

export const SWEEP_DECISION_METRIC_KEYS = Object.freeze([
    'successProbFloor',
    'p10EndWealth',
    'p25EndWealth',
    'medianEndWealth',
    'p75EndWealth',
    'meanEndWealth',
    'maxEndWealth',
    'worst5Drawdown',
    'minRunwayObserved'
]);

export const SWEEP_METRIC_METADATA = Object.freeze({
    schemaVersion: SWEEP_METRIC_METADATA_VERSION,
    definitions: Object.freeze({
        successProbFloor: Object.freeze({
            label: 'Floor-Deckung im gewaehlten Horizont',
            unit: 'percent',
            direction: 'higher_is_better',
            source: 'runOutcomes.failed',
            numerator: 'runs_without_floor_failure',
            denominator: 'all_evaluated_runs'
        }),
        p10EndWealth: Object.freeze({
            label: 'P10 Endvermoegen',
            unit: 'nominal_eur',
            direction: 'higher_is_better',
            source: 'runOutcomes.finalVermoegen',
            quantile: 0.10,
            quantileMethod: 'linear_interpolation_at_(n_minus_1)_q'
        }),
        p25EndWealth: Object.freeze({
            label: 'P25 Endvermoegen',
            unit: 'nominal_eur',
            direction: 'higher_is_better',
            source: 'runOutcomes.finalVermoegen',
            quantile: 0.25,
            quantileMethod: 'linear_interpolation_at_(n_minus_1)_q'
        }),
        medianEndWealth: Object.freeze({
            label: 'Median Endvermoegen',
            unit: 'nominal_eur',
            direction: 'higher_is_better',
            source: 'runOutcomes.finalVermoegen',
            quantile: 0.50,
            quantileMethod: 'linear_interpolation_at_(n_minus_1)_q'
        }),
        p75EndWealth: Object.freeze({
            label: 'P75 Endvermoegen',
            unit: 'nominal_eur',
            direction: 'higher_is_better',
            source: 'runOutcomes.finalVermoegen',
            quantile: 0.75,
            quantileMethod: 'linear_interpolation_at_(n_minus_1)_q'
        }),
        meanEndWealth: Object.freeze({
            label: 'Mittleres Endvermoegen',
            unit: 'nominal_eur',
            direction: 'higher_is_better',
            source: 'runOutcomes.finalVermoegen',
            statistic: 'arithmetic_mean'
        }),
        maxEndWealth: Object.freeze({
            label: 'Maximales Endvermoegen',
            unit: 'nominal_eur',
            direction: 'higher_is_better',
            source: 'runOutcomes.finalVermoegen',
            statistic: 'maximum'
        }),
        worst5Drawdown: Object.freeze({
            definitionVersion: SWEEP_DRAWDOWN_DEFINITION_VERSION,
            label: 'Schlechter 5%-Drawdown',
            unit: 'percent_loss_from_prior_positive_peak',
            direction: 'lower_is_better',
            source: 'runOutcomes.maxDrawdown',
            population: 'one_non_negative_maximum_drawdown_loss_per_evaluated_run',
            quantile: 0.95,
            quantileMethod: 'linear_interpolation_at_(n_minus_1)_q',
            quantileDirection: 'ascending_loss_distribution_upper_tail',
            terminalRuinLossPct: 100,
            runnerScope: 'sweep',
            crossRunnerComparability: 'not_directly_comparable_to_unversioned_monte_carlo_drawdown'
        }),
        minRunwayObserved: Object.freeze({
            label: 'Minimale beobachtete Runway',
            unit: 'months',
            direction: 'higher_is_better',
            source: 'runOutcomes.minRunway',
            statistic: 'minimum'
        })
    })
});

/**
 * Liest eine entscheidungsrelevante Sweep-Metrik nur aus dem kanonischen,
 * versionierten Resultshape.
 *
 * @param {Object} result - Sweep-Ergebnis mit `metrics`
 * @param {string} metricKey - kanonischer Metrikschluessel
 * @returns {number|null} endlicher Metrikwert oder null bei Contractbruch
 */
export function readSweepMetricValue(result, metricKey) {
    if (!result?.metrics
        || result.metrics.schemaVersion !== SWEEP_METRICS_VERSION
        || result.metrics.invalidCombination === true
        || !SWEEP_DECISION_METRIC_KEYS.includes(metricKey)) {
        return null;
    }
    const value = Number(result.metrics[metricKey]);
    return Number.isFinite(value) ? value : null;
}
