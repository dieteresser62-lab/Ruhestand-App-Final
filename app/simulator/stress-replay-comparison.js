"use strict";

import {
    STRESS_REPLAY_COMPARISON_KPIS_V1,
    STRESS_REPLAY_LIMITS,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    StressReplayContractError,
    canonicalizeStressReplayValue,
    createStressReplayComparisonFingerprint,
    createStressReplayFingerprint,
    validateStressReplayComparisonV1,
    validateStressReplayVariantResultV1,
    validateStressReplayVariantV1
} from './stress-replay-contract.js';
import { runStressReplayPathV1 } from './stress-replay-runner.js';
import {
    createStressReplayBaselineVariantV1
} from './stress-replay-variant.js';
import {
    STRESS_REPLAY_TRANSACTION_CLASSES,
    summarizeStressReplayTransactionsV1
} from './stress-replay-transactions.js';

export const STRESS_REPLAY_COMPARISON_VERSION = 'StressReplayComparisonV1';

function fail(code, message, details = {}) {
    throw new StressReplayContractError(code, message, details);
}

function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function sameValue(left, right) {
    return canonicalizeStressReplayValue(left) === canonicalizeStressReplayValue(right);
}

function relativeDeltaPct(baseline, alternative) {
    if (!Number.isFinite(baseline) || !Number.isFinite(alternative) || baseline === 0) return null;
    return ((alternative - baseline) / Math.abs(baseline)) * 100;
}

function numericDelta(baseline, alternative) {
    return Number.isFinite(baseline) && Number.isFinite(alternative)
        ? alternative - baseline
        : null;
}

function marker({
    category,
    yearIndex,
    historicalYear,
    causeCode,
    fields,
    baselineValue,
    variantValue
}) {
    const singleBaseline = fields.length === 1 ? baselineValue : null;
    const singleVariant = fields.length === 1 ? variantValue : null;
    return {
        category,
        yearIndex,
        historicalYear: Number.isSafeInteger(historicalYear) ? historicalYear : null,
        causeCode,
        fields,
        baselineValue: cloneValue(baselineValue),
        variantValue: cloneValue(variantValue),
        absoluteDelta: numericDelta(singleBaseline, singleVariant),
        relativeDeltaPct: relativeDeltaPct(singleBaseline, singleVariant)
    };
}

function recordsByYear(result) {
    return new Map((result.scenarioLog?.records || []).map((record, index) => [
        Number.isSafeInteger(record.jahr) ? record.jahr - 1 : index,
        record
    ]));
}

function yearResultsByYear(result) {
    return new Map((result.yearResults || []).map(record => [record.yearIndex, record]));
}

function firstChangedYear(baselineMap, variantMap, project) {
    const years = [...new Set([...baselineMap.keys(), ...variantMap.keys()])].sort((left, right) => left - right);
    for (const yearIndex of years) {
        const baseline = project(baselineMap.get(yearIndex));
        const variant = project(variantMap.get(yearIndex));
        if (!sameValue(baseline, variant)) return { yearIndex, baseline, variant };
    }
    return null;
}

function transactionYears(result, classes) {
    const grouped = new Map();
    for (const event of result.transactions || []) {
        if (!classes.has(event.class)) continue;
        const current = grouped.get(event.yearIndex) || [];
        current.push(event);
        grouped.set(event.yearIndex, current);
    }
    return grouped;
}

function transactionProjection(events) {
    if (!events) return [];
    return events.map(event => ({
        class: event.class,
        grossEur: event.grossEur,
        netEur: event.netEur,
        taxEur: event.taxEur,
        missingness: event.missingness
    }));
}

function buildFirstDeltaMarkers(baseline, variant) {
    const markers = [];
    const baselineYears = yearResultsByYear(baseline);
    const variantYears = yearResultsByYear(variant);
    const portfolioDelta = firstChangedYear(baselineYears, variantYears, year => year && ({
        nominalValueEur: year.nominalValueEur,
        realValueEur: year.realValueEur
    }));
    if (portfolioDelta) {
        const record = baselineYears.get(portfolioDelta.yearIndex) || variantYears.get(portfolioDelta.yearIndex);
        markers.push(marker({
            category: 'portfolio_state',
            yearIndex: portfolioDelta.yearIndex,
            historicalYear: record?.historicalYear,
            causeCode: 'PORTFOLIO_VALUE_CHANGED',
            fields: ['nominalValueEur', 'realValueEur'],
            baselineValue: portfolioDelta.baseline,
            variantValue: portfolioDelta.variant
        }));
    }

    const baselineRecords = recordsByYear(baseline);
    const variantRecords = recordsByYear(variant);
    for (const definition of [
        {
            category: 'policy_decision',
            causeCode: 'POLICY_DECISION_CHANGED',
            fields: ['entscheidung'],
            project: row => row?.entscheidung ?? null
        },
        {
            category: 'household_flex',
            causeCode: 'HOUSEHOLD_FLEX_CHANGED',
            fields: ['FlexRatePct', 'flex_erfuellt_nominal'],
            project: row => row && ({
                FlexRatePct: row.FlexRatePct ?? null,
                flex_erfuellt_nominal: row.flex_erfuellt_nominal ?? null
            })
        },
        {
            category: 'minimum_flex_shortfall',
            causeCode: 'MINIMUM_FLEX_SHORTFALL_CHANGED',
            fields: ['minimumFlexConfiguredAnnualEur', 'minimumFlexFulfilledAnnualEur'],
            project: row => row && ({
                minimumFlexConfiguredAnnualEur: row.minimumFlexConfiguredAnnualEur ?? null,
                minimumFlexFulfilledAnnualEur: row.minimumFlexFulfilledAnnualEur ?? null,
                shortfallEur: Number.isFinite(row.minimumFlexConfiguredAnnualEur)
                    && Number.isFinite(row.minimumFlexFulfilledAnnualEur)
                    ? Math.max(0, row.minimumFlexConfiguredAnnualEur - row.minimumFlexFulfilledAnnualEur)
                    : null
            })
        }
    ]) {
        const delta = firstChangedYear(baselineRecords, variantRecords, definition.project);
        if (!delta) continue;
        const record = baselineRecords.get(delta.yearIndex) || variantRecords.get(delta.yearIndex);
        markers.push(marker({
            ...definition,
            yearIndex: delta.yearIndex,
            historicalYear: record?.histJahr,
            baselineValue: delta.baseline,
            variantValue: delta.variant
        }));
    }

    for (const definition of [
        {
            category: 'rebalancing',
            causeCode: 'REBALANCING_TRANSACTION_CHANGED',
            classes: new Set([
                STRESS_REPLAY_TRANSACTION_CLASSES.POLICY_REBALANCING_SALE,
                STRESS_REPLAY_TRANSACTION_CLASSES.BOND_REFILL_SALE
            ])
        },
        {
            category: 'forced_sale',
            causeCode: 'FORCED_SALE_TRANSACTION_CHANGED',
            classes: new Set([
                STRESS_REPLAY_TRANSACTION_CLASSES.LIQUIDITY_SHORTFALL_FORCED_SALE,
                STRESS_REPLAY_TRANSACTION_CLASSES.PAYOUT_FLOOR_FALLBACK_SALE
            ])
        }
    ]) {
        const baselineTransactions = transactionYears(baseline, definition.classes);
        const variantTransactions = transactionYears(variant, definition.classes);
        const delta = firstChangedYear(baselineTransactions, variantTransactions, transactionProjection);
        if (!delta) continue;
        const sourceEvent = baselineTransactions.get(delta.yearIndex)?.[0]
            || variantTransactions.get(delta.yearIndex)?.[0];
        markers.push(marker({
            category: definition.category,
            yearIndex: delta.yearIndex,
            historicalYear: sourceEvent?.historicalYear,
            causeCode: definition.causeCode,
            fields: ['class', 'grossEur', 'netEur', 'taxEur'],
            baselineValue: delta.baseline,
            variantValue: delta.variant
        }));
    }

    if (baseline.terminalStatus !== variant.terminalStatus) {
        const yearIndex = Math.max(
            baseline.yearResults.at(-1)?.yearIndex ?? -1,
            variant.yearResults.at(-1)?.yearIndex ?? -1
        );
        const record = baseline.yearResults.find(year => year.yearIndex === yearIndex)
            || variant.yearResults.find(year => year.yearIndex === yearIndex);
        markers.push(marker({
            category: 'terminal_status',
            yearIndex: Math.max(0, yearIndex),
            historicalYear: record?.historicalYear,
            causeCode: 'TERMINAL_STATUS_CHANGED',
            fields: ['terminalStatus'],
            baselineValue: baseline.terminalStatus,
            variantValue: variant.terminalStatus
        }));
    }
    return markers.sort((left, right) => left.yearIndex - right.yearIndex
        || left.category.localeCompare(right.category));
}

function buildKpiDeltas(baseline, variant, missingness) {
    return Object.fromEntries(STRESS_REPLAY_COMPARISON_KPIS_V1.map(({ field, unit }) => {
        const baselineValue = baseline.summary?.[field] ?? null;
        const variantValue = variant.summary?.[field] ?? null;
        const observed = Number.isFinite(baselineValue) && Number.isFinite(variantValue);
        const jointlyNotApplicable = field === 'ruinYear'
            && baselineValue === null
            && variantValue === null;
        if (!observed && !jointlyNotApplicable) {
            missingness.push({
                code: field === 'ruinYear'
                    ? 'paired_kpi_not_jointly_applicable'
                    : 'paired_kpi_unobserved',
                field,
                baselineObserved: Number.isFinite(baselineValue),
                variantObserved: Number.isFinite(variantValue)
            });
        }
        return [field, {
            unit,
            baselineValue,
            variantValue,
            absoluteDelta: observed ? variantValue - baselineValue : null,
            relativeDeltaPct: observed ? relativeDeltaPct(baselineValue, variantValue) : null,
            applicability: jointlyNotApplicable ? 'not_applicable_neither_ruined' : 'applicable'
        }];
    }));
}

function assertResultFingerprint(result) {
    const { resultFingerprint: _resultFingerprint, ...basis } = result;
    const expected = createStressReplayFingerprint(basis);
    if (expected.value !== result.resultFingerprint.value) {
        fail('STRESS_REPLAY_RESULT_FINGERPRINT_MISMATCH', 'Variant result fingerprint does not match its contents', {
            variantId: result.variantId
        });
    }
}

function normalizePairs(variants, results) {
    if (!Array.isArray(variants) || !Array.isArray(results)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Comparison variants and results must be arrays');
    }
    const validatedVariants = variants.map(validateStressReplayVariantV1);
    const validatedResults = results.map(result => {
        const validated = validateStressReplayVariantResultV1(result);
        assertResultFingerprint(validated);
        return validated;
    });
    if (validatedVariants.length !== validatedResults.length
        || validatedVariants.length < 1
        || validatedVariants.length > STRESS_REPLAY_LIMITS.maximumVariants) {
        fail('STRESS_REPLAY_VARIANT_LIMIT_EXCEEDED', 'A comparison requires one baseline and at most three alternatives');
    }
    const variantsById = new Map();
    const resultsById = new Map();
    for (const variant of validatedVariants) {
        if (variantsById.has(variant.id)) fail('STRESS_REPLAY_VARIANT_ID_DUPLICATE', 'Variant ids must be unique');
        variantsById.set(variant.id, variant);
    }
    for (const result of validatedResults) {
        if (resultsById.has(result.variantId)) fail('STRESS_REPLAY_VARIANT_ID_DUPLICATE', 'Result variant ids must be unique');
        resultsById.set(result.variantId, result);
    }
    const baseline = variantsById.get('baseline');
    if (!baseline || baseline.role !== 'baseline'
        || [...variantsById.values()].filter(variant => variant.role === 'baseline').length !== 1) {
        fail('STRESS_REPLAY_BASELINE_INVALID', 'Comparison requires exactly one immutable baseline');
    }
    const variantOrder = ['baseline', ...[...variantsById.keys()]
        .filter(id => id !== 'baseline')
        .sort((left, right) => left.localeCompare(right))];
    for (const id of variantOrder) {
        const variant = variantsById.get(id);
        const result = resultsById.get(id);
        if (!result || result.role !== variant.role
            || result.variantFingerprint.value !== variant.variantFingerprint.value) {
            fail('STRESS_REPLAY_VARIANT_RESULT_MISMATCH', 'Variant and result identities do not reconcile', { variantId: id });
        }
        if (result.baselineScenarioFingerprint.value !== baseline.baselineScenarioFingerprint.value) {
            fail('STRESS_REPLAY_BASELINE_FINGERPRINT_MISMATCH', 'Comparison results do not share one baseline scenario');
        }
    }
    if (resultsById.size !== variantOrder.length) {
        fail('STRESS_REPLAY_VARIANT_RESULT_MISMATCH', 'Comparison contains an unexpected result');
    }
    const pathValues = new Set(validatedResults.map(result => result.pathFingerprint.value));
    if (pathValues.size !== 1) {
        fail('STRESS_REPLAY_PATH_FINGERPRINT_MISMATCH', 'Every comparison result must use the same materialized path');
    }
    return { variantsById, resultsById, variantOrder };
}

function finalizeComparison(comparison) {
    const withoutFingerprint = cloneValue(comparison);
    delete withoutFingerprint.comparisonFingerprint;
    return validateStressReplayComparisonV1({
        ...withoutFingerprint,
        comparisonFingerprint: createStressReplayComparisonFingerprint(withoutFingerprint)
    });
}

export function buildStressReplayComparisonV1({ variants, results }) {
    const { variantsById, resultsById, variantOrder } = normalizePairs(variants, results);
    const baselineResult = resultsById.get('baseline');
    const variantEntries = variantOrder.map(id => {
        const variant = variantsById.get(id);
        const result = resultsById.get(id);
        return {
            variantId: id,
            role: variant.role,
            label: variant.label,
            materialChangeGroups: cloneValue(variant.materialChangeGroups),
            warnings: cloneValue(variant.warnings),
            variantFingerprint: cloneValue(variant.variantFingerprint),
            resultFingerprint: cloneValue(result.resultFingerprint),
            terminalStatus: result.terminalStatus,
            summary: cloneValue(result.summary),
            transactionSummary: summarizeStressReplayTransactionsV1(result.transactions),
            missingness: cloneValue(result.missingness)
        };
    });
    const pairwise = variantOrder.slice(1).map(id => {
        const variant = variantsById.get(id);
        const result = resultsById.get(id);
        const comparable = baselineResult.terminalStatus !== 'technical_error'
            && result.terminalStatus !== 'technical_error';
        const missingness = [];
        if (!comparable) {
            missingness.push({
                code: 'technical_error_blocks_financial_comparison',
                baselineTechnicalError: baselineResult.technicalError,
                variantTechnicalError: result.technicalError
            });
        }
        return {
            variantId: id,
            baselineId: 'baseline',
            comparable,
            factorMode: variant.materialChangeGroups.length > 1 ? 'multi_factor' : 'single_factor',
            materialChangeGroups: cloneValue(variant.materialChangeGroups),
            kpiDeltas: comparable ? buildKpiDeltas(baselineResult, result, missingness) : null,
            firstDeltaMarkers: comparable ? buildFirstDeltaMarkers(baselineResult, result) : [],
            missingness,
            warnings: cloneValue(variant.warnings),
            interpretation: comparable
                ? 'paired_counterfactual_on_one_fixed_path'
                : 'financial_comparison_blocked_by_technical_error'
        };
    });
    const hasTechnicalError = variantEntries.some(entry => entry.terminalStatus === 'technical_error');
    return finalizeComparison({
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.comparison,
        comparisonVersion: STRESS_REPLAY_COMPARISON_VERSION,
        baselineId: 'baseline',
        pathFingerprint: cloneValue(baselineResult.pathFingerprint),
        baselineScenarioFingerprint: cloneValue(baselineResult.baselineScenarioFingerprint),
        variantOrder,
        variants: variantEntries,
        pairwise,
        overallStatus: hasTechnicalError ? 'blocked_technical_error' : 'complete',
        financialRankingAllowed: false,
        interpretation: 'paired_counterfactual_on_one_fixed_path_not_a_general_strategy_ranking'
    });
}

export function runStressReplayComparisonV1({
    path,
    baselineInputs,
    sourceScenarioLog,
    alternatives = [],
    engine = null,
    dependencies = {}
}) {
    if (!Array.isArray(alternatives) || alternatives.length > STRESS_REPLAY_LIMITS.maximumAlternatives) {
        fail('STRESS_REPLAY_VARIANT_LIMIT_EXCEEDED', 'At most three stress replay alternatives are supported');
    }
    const baseline = createStressReplayBaselineVariantV1({ baselineInputs });
    const variants = [baseline, ...alternatives.map(validateStressReplayVariantV1)];
    const results = variants.map(variant => runStressReplayPathV1({
        path: cloneValue(path),
        baselineInputs: cloneValue(baselineInputs),
        sourceScenarioLog: cloneValue(sourceScenarioLog),
        variant,
        engine,
        dependencies
    }));
    return buildStressReplayComparisonV1({ variants, results });
}

export function removeStressReplayComparisonVariantV1(comparison, variantId) {
    const validated = validateStressReplayComparisonV1(comparison);
    if (variantId === 'baseline') {
        fail('STRESS_REPLAY_BASELINE_IMMUTABLE', 'The comparison baseline cannot be removed');
    }
    if (!validated.variantOrder.includes(variantId)) return validated;
    const variants = validated.variants.filter(entry => entry.variantId !== variantId);
    const pairwise = validated.pairwise.filter(entry => entry.variantId !== variantId);
    const hasTechnicalError = variants.some(entry => entry.terminalStatus === 'technical_error');
    return finalizeComparison({
        ...validated,
        variantOrder: validated.variantOrder.filter(id => id !== variantId),
        variants,
        pairwise,
        overallStatus: hasTechnicalError ? 'blocked_technical_error' : 'complete'
    });
}

export const compareStressReplayVariantsV1 = buildStressReplayComparisonV1;
export const createStressReplayComparisonV1 = buildStressReplayComparisonV1;
export const compareStressReplayVariantResultsV1 = buildStressReplayComparisonV1;
export const removeStressReplayVariantFromComparisonV1 = removeStressReplayComparisonVariantV1;
