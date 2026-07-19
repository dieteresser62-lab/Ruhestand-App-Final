"use strict";

import { runHistoricalBacktest } from './historical-backtest-runner.js';

export const HISTORICAL_BACKTEST_COHORTS_SCHEMA_VERSION = 'HistoricalBacktestCohortsV1';
export const HISTORICAL_BACKTEST_COHORT_HORIZON_CONVENTION = 'inclusive_end_equals_start_plus_horizon_minus_one';

const COHORT_OUTCOME_KINDS = Object.freeze([
    'completed',
    'ruin',
    'incomplete',
    'technical_error',
    'cancelled'
]);

function cloneValue(value, seen = new WeakMap()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
    seen.set(value, copy);
    for (const key of Reflect.ownKeys(value)) {
        if (Array.isArray(value) && key === 'length') continue;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor) continue;
        if ('value' in descriptor) descriptor.value = cloneValue(descriptor.value, seen);
        Object.defineProperty(copy, key, descriptor);
    }
    return copy;
}

function freezeDeep(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) freezeDeep(value[key], seen);
    return Object.freeze(value);
}

function requirePositiveInteger(value, name) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) {
        throw new TypeError(`${name} must be a positive integer`);
    }
    return number;
}

function requireInteger(value, name) {
    const number = Number(value);
    if (!Number.isInteger(number)) throw new TypeError(`${name} must be an integer`);
    return number;
}

function buildPeriods(rangeStartYear, rangeEndYear, horizonYears) {
    const eligible = [];
    const excluded = [];
    for (let startYear = rangeStartYear; startYear <= rangeEndYear; startYear++) {
        const endYear = startYear + horizonYears - 1;
        if (endYear <= rangeEndYear) {
            eligible.push({ startYear, endYear });
        } else {
            excluded.push({
                startYear,
                endYear,
                horizonYears,
                reason: {
                    code: 'insufficient_horizon',
                    rangeEndYear,
                    missingYears: endYear - rangeEndYear
                }
            });
        }
    }
    return { eligible, excluded };
}

function preparedProvider(provider, prepared, expectedPeriod) {
    return Object.freeze({
        schemaVersion: provider?.schemaVersion || null,
        datasetId: provider?.datasetId || null,
        revision: provider?.revision || null,
        contentHash: provider?.contentHash || null,
        temporalConventionId: provider?.temporalConventionId || null,
        bounds: provider?.bounds || null,
        preparePeriod(period) {
            if (Number(period?.startYear) !== expectedPeriod.startYear
                || Number(period?.endYear) !== expectedPeriod.endYear) {
                throw new TypeError('Prepared cohort provider received a different period');
            }
            return prepared;
        }
    });
}

function technicalCohort(period, code, message, cause = null) {
    return {
        cohortId: `${period.startYear}-${period.endYear}`,
        startYear: period.startYear,
        endYear: period.endYear,
        horizonYears: period.endYear - period.startYear + 1,
        outcome: {
            kind: 'technical_error',
            error: { code, message }
        },
        exclusionReason: code,
        runResult: null,
        diagnostics: cause === null ? null : { cause }
    };
}

function incompleteCohort(period, reason) {
    return {
        cohortId: `${period.startYear}-${period.endYear}`,
        startYear: period.startYear,
        endYear: period.endYear,
        horizonYears: period.endYear - period.startYear + 1,
        outcome: {
            kind: 'incomplete',
            exclusionReason: reason?.code || 'historical_data_incomplete'
        },
        exclusionReason: reason?.code || 'historical_data_incomplete',
        incompleteReason: reason || null,
        runResult: null
    };
}

function classifyRun(period, runResult) {
    const kind = COHORT_OUTCOME_KINDS.includes(runResult?.outcome?.kind)
        ? runResult.outcome.kind
        : 'technical_error';
    const normalizedResult = kind === runResult?.outcome?.kind ? runResult : null;
    return {
        cohortId: `${period.startYear}-${period.endYear}`,
        startYear: period.startYear,
        endYear: period.endYear,
        horizonYears: period.endYear - period.startYear + 1,
        outcome: normalizedResult?.outcome || {
            kind: 'technical_error',
            error: {
                code: 'COHORT_RUN_RESULT_INVALID',
                message: 'Der Cohort-Lauf lieferte kein gueltiges Outcome.'
            }
        },
        exclusionReason: kind === 'incomplete'
            ? (runResult?.incompleteReason?.code || runResult?.outcome?.exclusionReason || 'historical_data_incomplete')
            : (kind === 'technical_error' ? (runResult?.error?.code || 'cohort_technical_error') : null),
        runResult: normalizedResult
    };
}

function countOutcomes(cohorts, eligibleCount, excluded) {
    const counts = Object.fromEntries(COHORT_OUTCOME_KINDS.map(kind => [kind, 0]));
    const exclusionReasons = Object.create(null);
    for (const entry of excluded) {
        const code = entry.reason.code;
        exclusionReasons[code] = (exclusionReasons[code] || 0) + 1;
    }
    for (const cohort of cohorts) {
        counts[cohort.outcome.kind] = (counts[cohort.outcome.kind] || 0) + 1;
        if (cohort.exclusionReason) {
            exclusionReasons[cohort.exclusionReason] = (exclusionReasons[cohort.exclusionReason] || 0) + 1;
        }
    }
    const denominator = eligibleCount;
    const rate = value => denominator > 0 ? (value / denominator) * 100 : null;
    return {
        candidate: eligibleCount + excluded.length,
        eligible: eligibleCount,
        completed: counts.completed,
        ruin: counts.ruin,
        incomplete: counts.incomplete,
        technicalError: counts.technical_error,
        cancelled: counts.cancelled,
        financiallyEvaluable: counts.completed + counts.ruin,
        excluded: excluded.length,
        exclusionReasons,
        rateDenominator: 'all_eligible_cohorts',
        ratesPct: {
            completed: rate(counts.completed),
            ruin: rate(counts.ruin),
            incomplete: rate(counts.incomplete),
            technicalError: rate(counts.technical_error),
            cancelled: rate(counts.cancelled)
        }
    };
}

/**
 * Runs every eligible fixed-length historical window in one preflighted batch.
 * Overlapping windows are an in-sample diagnosis and are not independent trials.
 */
export function runHistoricalBacktestCohorts({
    inputs,
    range,
    cohortHorizonYears,
    historicalDataProvider,
    simulateYear,
    initializePortfolio,
    computeAdjustmentPct,
    resolveHorizon,
    totalPortfolio,
    breakOnRuin = true,
    runSinglePath = runHistoricalBacktest,
    instrumentation = null
}) {
    const rangeStartYear = requireInteger(range?.startYear, 'range.startYear');
    const rangeEndYear = requireInteger(range?.endYear, 'range.endYear');
    const horizonYears = requirePositiveInteger(cohortHorizonYears, 'cohortHorizonYears');
    if (rangeStartYear > rangeEndYear) {
        throw new TypeError('range.startYear must not exceed range.endYear');
    }
    if (!historicalDataProvider || typeof historicalDataProvider.prepareBatch !== 'function') {
        throw new TypeError('runHistoricalBacktestCohorts requires historicalDataProvider.prepareBatch');
    }
    if (typeof runSinglePath !== 'function') {
        throw new TypeError('runHistoricalBacktestCohorts requires runSinglePath to be a function');
    }

    const requestInputs = freezeDeep(cloneValue(inputs || {}));
    const { eligible, excluded } = buildPeriods(rangeStartYear, rangeEndYear, horizonYears);
    const request = freezeDeep({
        schemaVersion: 'BacktestCohortRequestV1',
        executionMode: 'rolling_cohorts',
        rangeStartYear,
        rangeEndYear,
        cohortHorizonYears: horizonYears,
        horizonConvention: HISTORICAL_BACKTEST_COHORT_HORIZON_CONVENTION,
        overlappingWindows: true,
        sampleCharacter: 'in_sample_diagnosis',
        independentTrials: false,
        successProbabilityClaim: false,
        automaticPolicySelection: false,
        accumulationPhasePolicy: 'preserve_inputs_and_restart_yearIndex_at_zero_for_each_cohort',
        outcomeRateDenominator: 'all_eligible_cohorts',
        breakOnRuin: Boolean(breakOnRuin),
        dataset: {
            datasetId: historicalDataProvider.datasetId || null,
            revision: historicalDataProvider.revision || null,
            contentHash: historicalDataProvider.contentHash || null
        },
        temporalConventionId: historicalDataProvider.temporalConventionId || null,
        inputs: requestInputs
    });

    const cohorts = [];
    if (eligible.length > 0) {
        let batch;
        try {
            batch = historicalDataProvider.prepareBatch(eligible, { instrumentation });
        } catch (cause) {
            for (const period of eligible) {
                cohorts.push(technicalCohort(
                    period,
                    'COHORT_BATCH_PREFLIGHT_ERROR',
                    'Der Rolling-Cohort-Batch konnte nicht vorbereitet werden.',
                    cause
                ));
            }
        }

        if (batch) {
            const preparedPeriods = Array.isArray(batch.periods) ? batch.periods : [];
            for (let index = 0; index < eligible.length; index++) {
                const period = eligible[index];
                const prepared = preparedPeriods[index];
                if (!prepared) {
                    const isFirstLegacyIncomplete = batch.status === 'incomplete' && batch.batchIndex === index;
                    cohorts.push(isFirstLegacyIncomplete
                        ? incompleteCohort(period, batch.reason)
                        : technicalCohort(
                            period,
                            'COHORT_BATCH_RESULT_INCOMPLETE',
                            'Der Rolling-Cohort-Batch enthielt kein Ergebnis fuer dieses Fenster.'
                        ));
                    continue;
                }
                if (prepared.status !== 'complete') {
                    cohorts.push(incompleteCohort(period, prepared.reason));
                    continue;
                }
                let runResult;
                try {
                    runResult = runSinglePath({
                        inputs: requestInputs,
                        period,
                        historicalDataProvider: preparedProvider(historicalDataProvider, prepared, period),
                        simulateYear,
                        initializePortfolio,
                        computeAdjustmentPct,
                        resolveHorizon,
                        totalPortfolio,
                        breakOnRuin
                    });
                } catch (cause) {
                    cohorts.push(technicalCohort(
                        period,
                        'COHORT_RUNNER_EXCEPTION',
                        'Der Rolling-Cohort-Lauf wurde technisch abgebrochen.',
                        cause
                    ));
                    continue;
                }
                cohorts.push(classifyRun(period, runResult));
            }
        }
    }

    const inventory = countOutcomes(cohorts, eligible.length, excluded);
    return {
        schemaVersion: HISTORICAL_BACKTEST_COHORTS_SCHEMA_VERSION,
        request,
        descriptor: freezeDeep({
            label: 'Rolling-Cohort-In-sample-Diagnose',
            horizonConvention: HISTORICAL_BACKTEST_COHORT_HORIZON_CONVENTION,
            overlappingWindows: true,
            sampleCharacter: 'in_sample_diagnosis',
            independentTrials: false,
            successProbabilityClaim: false,
            rateDenominator: 'all_eligible_cohorts'
        }),
        inventory,
        cohorts,
        excluded
    };
}
