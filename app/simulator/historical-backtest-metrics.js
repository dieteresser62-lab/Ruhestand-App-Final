"use strict";

export const HISTORICAL_BACKTEST_METRICS_SCHEMA_VERSION = 'HistoricalBacktestMetricsV1';
export const FLEX_REDUCTION_THRESHOLD_PCT = 10;
export const FLEX_REDUCTION_OPERATOR = 'gte';

const FINANCIAL_OUTCOMES = new Set(['completed', 'ruin']);

function freezeDeep(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) freezeDeep(child, seen);
    return Object.freeze(value);
}

function descriptor({
    id,
    label,
    unit,
    priceBasis = 'not_applicable',
    sign,
    aggregationRule,
    denominator,
    fractionDigits,
    missingnessRule,
    outcomeRule,
    source
}) {
    return freezeDeep({
        id,
        label,
        unit,
        nominalOrReal: priceBasis === 'nominal'
            ? 'nominal'
            : (priceBasis === 'real_start_year_prices' ? 'real' : 'not_applicable'),
        priceBasis,
        sign,
        aggregationRule,
        denominator,
        rounding: {
            phase: 'display_only',
            mode: 'half_away_from_zero',
            fractionDigits
        },
        missingnessRule,
        outcomeRule,
        source
    });
}

export const HISTORICAL_BACKTEST_METRIC_DESCRIPTORS = freezeDeep([
    descriptor({
        id: 'wealth_start_nominal_eur',
        label: 'Startvermoegen',
        unit: 'EUR',
        priceBasis: 'nominal',
        sign: 'higher_is_better',
        aggregationRule: 'first_value',
        denominator: 'one_run',
        fractionDigits: 2,
        missingnessRule: 'null_if_no_initialized_portfolio',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'result.portfolioStart'
    }),
    descriptor({
        id: 'wealth_end_nominal_eur',
        label: 'Endvermoegen',
        unit: 'EUR',
        priceBasis: 'nominal',
        sign: 'higher_is_better',
        aggregationRule: 'last_value',
        denominator: 'one_run',
        fractionDigits: 2,
        missingnessRule: 'null_if_no_terminal_portfolio',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'result.portfolioEnd_reconciled_with_last_row.portfolio_total_end'
    }),
    descriptor({
        id: 'wealth_end_real_eur',
        label: 'Reales Endvermoegen',
        unit: 'EUR',
        priceBasis: 'real_start_year_prices',
        sign: 'higher_is_better',
        aggregationRule: 'last_nominal_value_div_cumulative_inflation',
        denominator: 'one_run',
        fractionDigits: 2,
        missingnessRule: 'null_if_terminal_wealth_or_inflation_path_missing',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'result.portfolioEnd_and_rows[*].inflationVJ'
    }),
    descriptor({
        id: 'withdrawal_total_nominal_eur',
        label: 'Gesamte Entnahmen',
        unit: 'EUR',
        priceBasis: 'nominal',
        sign: 'neutral',
        aggregationRule: 'sum',
        denominator: 'emitted_year_rows',
        fractionDigits: 2,
        missingnessRule: 'null_if_any_emitted_row_lacks_jahresEntnahme',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].entscheidung.jahresEntnahme'
    }),
    descriptor({
        id: 'floor_shortfall_occurred',
        label: 'Floor-Shortfall aufgetreten',
        unit: 'boolean',
        sign: 'lower_is_better',
        aggregationRule: 'any_positive',
        denominator: 'emitted_year_rows',
        fractionDigits: 0,
        missingnessRule: 'false_only_if_all_rows_have_explicit_or_derived_shortfall',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.floor_shortfall_nominal_or_floor_aus_depot_minus_entnahme_effektiv'
    }),
    descriptor({
        id: 'floor_shortfall_years',
        label: 'Jahre mit Floor-Shortfall',
        unit: 'years',
        sign: 'lower_is_better',
        aggregationRule: 'count_positive',
        denominator: 'emitted_year_rows',
        fractionDigits: 0,
        missingnessRule: 'null_if_any_row_shortfall_is_not_reconstructible',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.floor_shortfall_nominal_or_floor_aus_depot_minus_entnahme_effektiv'
    }),
    descriptor({
        id: 'floor_shortfall_total_nominal_eur',
        label: 'Kumulierter Floor-Shortfall',
        unit: 'EUR',
        priceBasis: 'nominal',
        sign: 'lower_is_better',
        aggregationRule: 'sum',
        denominator: 'emitted_year_rows',
        fractionDigits: 2,
        missingnessRule: 'null_if_any_row_shortfall_is_not_reconstructible',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.floor_shortfall_nominal_or_floor_aus_depot_minus_entnahme_effektiv'
    }),
    descriptor({
        id: 'floor_shortfall_total_real_eur',
        label: 'Kumulierter realer Floor-Shortfall',
        unit: 'EUR',
        priceBasis: 'real_start_year_prices',
        sign: 'lower_is_better',
        aggregationRule: 'sum_nominal_div_inflation_factor_at_year_start',
        denominator: 'emitted_year_rows',
        fractionDigits: 2,
        missingnessRule: 'null_if_shortfall_or_inflation_path_missing',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.floor_shortfall_nominal_and_rows[*].inflationVJ'
    }),
    descriptor({
        id: 'floor_shortfall_max_real_eur',
        label: 'Hoechster realer Floor-Shortfall',
        unit: 'EUR',
        priceBasis: 'real_start_year_prices',
        sign: 'lower_is_better',
        aggregationRule: 'maximum_nominal_div_inflation_factor_at_year_start',
        denominator: 'emitted_year_rows',
        fractionDigits: 2,
        missingnessRule: 'null_if_shortfall_or_inflation_path_missing',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.floor_shortfall_nominal_and_rows[*].inflationVJ'
    }),
    descriptor({
        id: 'floor_shortfall_longest_streak_years',
        label: 'Laengste Floor-Shortfall-Dauer',
        unit: 'years',
        sign: 'lower_is_better',
        aggregationRule: 'longest_consecutive_positive_streak',
        denominator: 'emitted_year_rows',
        fractionDigits: 0,
        missingnessRule: 'null_if_any_row_shortfall_is_not_reconstructible',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.floor_shortfall_nominal_or_floor_aus_depot_minus_entnahme_effektiv'
    }),
    descriptor({
        id: 'flex_reduction_years_gte_10_pct',
        label: 'Jahre mit Flex-Kuerzung (≥ 10 %)',
        unit: 'years',
        sign: 'lower_is_better',
        aggregationRule: 'count_value_greater_than_or_equal_10_pct',
        denominator: 'completed_years',
        fractionDigits: 0,
        missingnessRule: 'null_if_any_completed_row_lacks_kuerzungProzent',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].entscheidung.kuerzungProzent'
    }),
    descriptor({
        id: 'flex_reduction_max_pct',
        label: 'Tiefste Flex-Kuerzung',
        unit: 'percent',
        sign: 'lower_is_better',
        aggregationRule: 'maximum',
        denominator: 'completed_years',
        fractionDigits: 2,
        missingnessRule: 'null_if_no_completed_reduction_values',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].entscheidung.kuerzungProzent'
    }),
    descriptor({
        id: 'flex_reduction_longest_streak_gte_10_pct',
        label: 'Laengste Flex-Kuerzungsserie (≥ 10 %)',
        unit: 'years',
        sign: 'lower_is_better',
        aggregationRule: 'longest_consecutive_value_greater_than_or_equal_10_pct',
        denominator: 'completed_years',
        fractionDigits: 0,
        missingnessRule: 'null_if_any_completed_row_lacks_kuerzungProzent',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].entscheidung.kuerzungProzent'
    }),
    descriptor({
        id: 'runway_min_coverage_pct',
        label: 'Minimale Runway-Deckung',
        unit: 'percent',
        sign: 'higher_is_better',
        aggregationRule: 'minimum',
        denominator: 'rows_with_finite_runway_coverage',
        fractionDigits: 2,
        missingnessRule: 'null_if_no_finite_RunwayCoveragePct',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.RunwayCoveragePct'
    }),
    descriptor({
        id: 'runway_stress_years_below_100_pct',
        label: 'Jahre mit Runway-Stress (< 100 %)',
        unit: 'years',
        sign: 'lower_is_better',
        aggregationRule: 'count_value_below_100_pct',
        denominator: 'rows_with_finite_runway_coverage',
        fractionDigits: 0,
        missingnessRule: 'null_if_no_finite_RunwayCoveragePct',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.RunwayCoveragePct'
    }),
    descriptor({
        id: 'wealth_max_drawdown_nominal_end_series_pct',
        label: 'Maximaler Drawdown des nominalen Endvermoegens',
        unit: 'percent',
        priceBasis: 'nominal',
        sign: 'lower_is_better',
        aggregationRule: 'maximum_peak_to_trough_decline',
        denominator: 'portfolio_start_plus_each_emitted_year_end',
        fractionDigits: 2,
        missingnessRule: 'null_if_any_portfolio_endpoint_is_missing_or_non_positive_peak',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'result.portfolioStart_and_rows[*].row.portfolio_total_end'
    }),
    descriptor({
        id: 'tax_total_nominal_eur',
        label: 'Gezahlte Steuern',
        unit: 'EUR',
        priceBasis: 'nominal',
        sign: 'lower_is_better',
        aggregationRule: 'sum',
        denominator: 'emitted_year_rows',
        fractionDigits: 2,
        missingnessRule: 'null_if_any_row_lacks_steuern_gesamt',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.steuern_gesamt'
    }),
    descriptor({
        id: 'tax_saved_by_loss_carry_total_nominal_eur',
        label: 'Steuerersparnis durch Verlusttopf',
        unit: 'EUR',
        priceBasis: 'nominal',
        sign: 'neutral',
        aggregationRule: 'sum',
        denominator: 'emitted_year_rows',
        fractionDigits: 2,
        missingnessRule: 'null_if_any_row_lacks_taxSavedByLossCarry',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'rows[*].row.taxSavedByLossCarry'
    }),
    descriptor({
        id: 'loss_carry_end_nominal_eur',
        label: 'Verlusttopf am Laufende',
        unit: 'EUR',
        priceBasis: 'nominal',
        sign: 'neutral',
        aggregationRule: 'last_value',
        denominator: 'one_run',
        fractionDigits: 2,
        missingnessRule: 'null_if_no_row_exposes_lossCarryEnd',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'last_rows[*].row.lossCarryEnd'
    }),
    descriptor({
        id: 'health_bucket_end_nominal_eur',
        label: 'Pflegebucket am Laufende',
        unit: 'EUR',
        priceBasis: 'nominal',
        sign: 'neutral',
        aggregationRule: 'last_canonical_enabled_value',
        denominator: 'one_run',
        fractionDigits: 2,
        missingnessRule: 'zero_if_canonical_health_bucket_is_disabled',
        outcomeRule: 'available_for_completed_or_ruin',
        source: 'result.summary.healthBucket.end'
    }),
    ...['completed', 'ruin', 'incomplete', 'technical_error'].map(kind => descriptor({
        id: `outcome_is_${kind}`,
        label: `Outcome ${kind}`,
        unit: 'boolean',
        sign: kind === 'completed' ? 'higher_is_better' : 'lower_is_better',
        aggregationRule: 'indicator',
        denominator: 'one_requested_run',
        fractionDigits: 0,
        missingnessRule: 'never_missing_for_BacktestRunResultV1',
        outcomeRule: 'available_for_all_outcomes',
        source: 'result.outcome.kind'
    }))
]);

export const HISTORICAL_BACKTEST_METRIC_DESCRIPTOR_BY_ID = freezeDeep(Object.fromEntries(
    HISTORICAL_BACKTEST_METRIC_DESCRIPTORS.map(entry => [entry.id, entry])
));

function finiteOrNull(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function rowPortfolioEnd(entry) {
    const canonical = finiteOrNull(entry?.row?.portfolio_total_end);
    if (canonical !== null) return canonical;
    const equity = finiteOrNull(entry?.wertAktien ?? entry?.row?.wertAktien);
    const gold = finiteOrNull(entry?.wertGold ?? entry?.row?.wertGold);
    const cash = finiteOrNull(entry?.liquiditaet ?? entry?.row?.liquiditaet);
    const health = finiteOrNull(entry?.row?.health_bucket_end) ?? 0;
    return equity !== null && gold !== null && cash !== null ? equity + gold + cash + health : null;
}

function rowFloorShortfall(entry) {
    const explicit = finiteOrNull(entry?.row?.floor_shortfall_nominal);
    if (explicit !== null) return Math.max(0, explicit);
    const required = finiteOrNull(entry?.row?.floor_aus_depot);
    const paid = finiteOrNull(entry?.row?.entnahme_effektiv);
    return required !== null && paid !== null ? Math.max(0, required - paid) : null;
}

function longestPositiveStreak(values, predicate = value => value > 0) {
    let current = 0;
    let longest = 0;
    for (const value of values) {
        if (predicate(value)) {
            current++;
            longest = Math.max(longest, current);
        } else {
            current = 0;
        }
    }
    return longest;
}

function completeFiniteSeries(rows, getter) {
    const values = rows.map(getter);
    return values.every(value => value !== null) ? values : null;
}

function computeInflationFactors(rows) {
    const atYearStart = [];
    let factor = 1;
    for (const entry of rows) {
        const inflationPct = finiteOrNull(entry?.inflationVJ);
        if (inflationPct === null || 1 + inflationPct / 100 <= 0) return null;
        atYearStart.push(factor);
        factor *= 1 + inflationPct / 100;
    }
    return { atYearStart, atRunEnd: factor };
}

function computeMaxDrawdown(series) {
    if (!Array.isArray(series) || series.length === 0 || series.some(value => value === null)) return null;
    let peak = series[0];
    if (!(peak > 0)) return null;
    let maximumPct = 0;
    for (const value of series) {
        if (value > peak) peak = value;
        if (!(peak > 0)) return null;
        maximumPct = Math.max(maximumPct, ((peak - value) / peak) * 100);
    }
    return maximumPct;
}

function lastFinite(rows, getter) {
    for (let index = rows.length - 1; index >= 0; index--) {
        const value = getter(rows[index]);
        if (value !== null) return value;
    }
    return null;
}

function availabilityFor(values) {
    return Object.fromEntries(Object.entries(values).map(([id, value]) => [
        id,
        value === null ? 'missing' : 'available'
    ]));
}

export function deriveHistoricalBacktestMetrics(result) {
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const outcomeKind = String(result?.outcome?.kind || '');
    const isFinancialOutcome = FINANCIAL_OUTCOMES.has(outcomeKind);
    const startWealth = isFinancialOutcome ? finiteOrNull(result?.portfolioStart) : null;
    const endWealth = isFinancialOutcome ? finiteOrNull(result?.portfolioEnd) : null;
    const inflation = isFinancialOutcome ? computeInflationFactors(rows) : null;
    const withdrawalSeries = isFinancialOutcome
        ? completeFiniteSeries(rows, entry => finiteOrNull(entry?.entscheidung?.jahresEntnahme))
        : null;
    const shortfallSeries = isFinancialOutcome ? completeFiniteSeries(rows, rowFloorShortfall) : null;
    const reductionRows = rows.filter(entry => entry?.row?.Regime !== 'BANKRUPT');
    const reductionSeries = isFinancialOutcome
        ? completeFiniteSeries(reductionRows, entry => finiteOrNull(entry?.entscheidung?.kuerzungProzent))
        : null;
    const runwaySeries = isFinancialOutcome
        ? rows.map(entry => finiteOrNull(entry?.row?.RunwayCoveragePct)).filter(value => value !== null)
        : [];
    const taxSeries = isFinancialOutcome
        ? completeFiniteSeries(rows, entry => finiteOrNull(entry?.row?.steuern_gesamt))
        : null;
    const taxSavedSeries = isFinancialOutcome
        ? completeFiniteSeries(rows, entry => finiteOrNull(entry?.row?.taxSavedByLossCarry))
        : null;
    const rowEndSeries = isFinancialOutcome ? completeFiniteSeries(rows, rowPortfolioEnd) : null;
    const realShortfalls = shortfallSeries && inflation
        ? shortfallSeries.map((value, index) => value / inflation.atYearStart[index])
        : null;

    const values = {
        wealth_start_nominal_eur: startWealth,
        wealth_end_nominal_eur: endWealth,
        wealth_end_real_eur: endWealth !== null && inflation ? endWealth / inflation.atRunEnd : null,
        withdrawal_total_nominal_eur: withdrawalSeries ? withdrawalSeries.reduce((sum, value) => sum + value, 0) : null,
        floor_shortfall_occurred: shortfallSeries ? shortfallSeries.some(value => value > 0) : null,
        floor_shortfall_years: shortfallSeries ? shortfallSeries.filter(value => value > 0).length : null,
        floor_shortfall_total_nominal_eur: shortfallSeries ? shortfallSeries.reduce((sum, value) => sum + value, 0) : null,
        floor_shortfall_total_real_eur: realShortfalls ? realShortfalls.reduce((sum, value) => sum + value, 0) : null,
        floor_shortfall_max_real_eur: realShortfalls ? Math.max(0, ...realShortfalls) : null,
        floor_shortfall_longest_streak_years: shortfallSeries ? longestPositiveStreak(shortfallSeries) : null,
        flex_reduction_years_gte_10_pct: reductionSeries
            ? reductionSeries.filter(value => value >= FLEX_REDUCTION_THRESHOLD_PCT).length
            : null,
        flex_reduction_max_pct: reductionSeries && reductionSeries.length > 0 ? Math.max(...reductionSeries) : null,
        flex_reduction_longest_streak_gte_10_pct: reductionSeries
            ? longestPositiveStreak(reductionSeries, value => value >= FLEX_REDUCTION_THRESHOLD_PCT)
            : null,
        runway_min_coverage_pct: runwaySeries.length > 0 ? Math.min(...runwaySeries) : null,
        runway_stress_years_below_100_pct: runwaySeries.length > 0
            ? runwaySeries.filter(value => value < 100).length
            : null,
        wealth_max_drawdown_nominal_end_series_pct: startWealth !== null && rowEndSeries
            ? computeMaxDrawdown([startWealth, ...rowEndSeries])
            : null,
        tax_total_nominal_eur: taxSeries ? taxSeries.reduce((sum, value) => sum + value, 0) : null,
        tax_saved_by_loss_carry_total_nominal_eur: taxSavedSeries
            ? taxSavedSeries.reduce((sum, value) => sum + value, 0)
            : null,
        loss_carry_end_nominal_eur: isFinancialOutcome
            ? lastFinite(rows, entry => finiteOrNull(entry?.row?.lossCarryEnd))
            : null,
        health_bucket_end_nominal_eur: isFinancialOutcome
            ? finiteOrNull(result?.summary?.healthBucket?.end) ?? 0
            : null,
        outcome_is_completed: outcomeKind === 'completed',
        outcome_is_ruin: outcomeKind === 'ruin',
        outcome_is_incomplete: outcomeKind === 'incomplete',
        outcome_is_technical_error: outcomeKind === 'technical_error'
    };

    return freezeDeep({
        schemaVersion: HISTORICAL_BACKTEST_METRICS_SCHEMA_VERSION,
        reductionContract: {
            operator: FLEX_REDUCTION_OPERATOR,
            thresholdPct: FLEX_REDUCTION_THRESHOLD_PCT,
            includesExactThreshold: true,
            metricId: 'flex_reduction_years_gte_10_pct'
        },
        drawdownReferenceSeries: 'portfolioStart followed by each rows[*].row.portfolio_total_end, nominal, including health bucket',
        descriptors: HISTORICAL_BACKTEST_METRIC_DESCRIPTORS,
        values,
        availability: availabilityFor(values),
        reconciliation: {
            rowCount: rows.length,
            requestedYears: Number.isInteger(result?.requestedYears) ? result.requestedYears : null,
            completedYears: Number.isInteger(result?.completedYears) ? result.completedYears : null,
            outcomeKind
        }
    });
}
