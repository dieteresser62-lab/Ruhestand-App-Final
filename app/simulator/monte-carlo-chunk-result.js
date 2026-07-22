"use strict";

import {
    MC_HEATMAP_BINS,
    createMonteCarloBuffers,
    pickWorstRun
} from './monte-carlo-runner-utils.js';

export const MONTE_CARLO_CHUNK_RESULT_VERSION = 'MonteCarloChunkResultV1';

export const MONTE_CARLO_OUTCOME_CODE = Object.freeze({
    UNSET: 0,
    RUIN: 1,
    ALL_DEAD: 2,
    HORIZON_EXHAUSTED: 3,
    TECHNICAL_ERROR: 4
});

export const MONTE_CARLO_MISSINGNESS_CODE = Object.freeze({
    UNSET: 0,
    OBSERVED: 1,
    NOT_APPLICABLE: 2,
    TECHNICAL_ERROR: 3,
    NO_OBSERVATIONS: 4
});

export const MONTE_CARLO_BUFFER_FIELDS = Object.freeze({
    finalOutcomes: Float64Array,
    taxOutcomes: Float64Array,
    kpiLebensdauer: Uint8Array,
    kpiKuerzungsjahre: Float32Array,
    kpiMaxKuerzung: Float32Array,
    volatilities: Float32Array,
    maxDrawdowns: Float32Array,
    depotErschoepft: Uint8Array,
    alterBeiErschoepfung: Uint8Array,
    anteilJahreOhneFlex: Float32Array,
    stress_maxDrawdowns: Float32Array,
    stress_timeQuoteAbove45: Float32Array,
    stress_cutYears: Float32Array,
    stress_CaR_P10_Real: Float64Array,
    stress_recoveryYears: Float32Array
});

export const MONTE_CARLO_COUNTER_FIELDS = Object.freeze([
    'failCount',
    'pflegeTriggeredCount',
    'totalSimulatedYears',
    'totalYearsQuoteAbove45',
    'totalYearsSafetyStage1plus',
    'totalYearsSafetyStage2',
    'shortfallWithCareCount',
    'shortfallNoCareProxyCount',
    'p2TriggeredCount',
    'runsSafetyStage1Triggered',
    'runsSafetyStage2Triggered',
    'healthBucketEnabledCount',
    'healthBucketUsedCount',
    'healthBucketDepletedCount',
    'tailRiskRunsActiveCount',
    'tailRiskRunsAppliedCount',
    'tailRiskEventCount',
    'tailRiskEvaluatedYears',
    'tailRiskActiveYears',
    'tailRiskAppliedYears',
    'tailRiskSkippedHistoricalCrisisYears'
]);

export const MONTE_CARLO_FLOAT_AGGREGATE_FIELDS = Object.freeze([
    'totalTaxSavedByLossCarry',
    'totalHealthBucketUsed'
]);

export const MONTE_CARLO_LIST_FIELDS = Object.freeze([
    'entryAges',
    'entryAgesP2',
    'careDepotCosts',
    'endWealthWithCareList',
    'endWealthNoCareList',
    'p1CareYearsTriggered',
    'p2CareYearsTriggered',
    'bothCareYearsOverlapTriggered',
    'maxAnnualCareSpendTriggered',
    'healthBucketUsedAmounts',
    'healthBucketEndAmounts',
    'healthBucketCoveragePct',
    'healthBucketTargetGaps',
    'healthBucketInterestAmounts'
]);

export const MONTE_CARLO_PATH_SUMMARY_FIELDS = Object.freeze({
    globalRunIndex: Uint32Array,
    outcomeCode: Uint8Array,
    finalValueNominalEur: Float64Array,
    volatilityPct: Float32Array,
    maxDrawdownPct: Float32Array,
    cutYearsNumerator: Uint32Array,
    cutYearsDenominator: Uint32Array,
    realWithdrawalP10RealEur: Float64Array,
    realWithdrawalObservationCount: Uint32Array,
    p1CareEntryAge: Uint16Array,
    p2CareEntryAge: Uint16Array,
    p1CareYears: Uint16Array,
    p2CareYears: Uint16Array,
    bothCareYears: Uint16Array,
    careEverActive: Uint8Array,
    hasPartner: Uint8Array,
    careDepotCostEur: Float64Array,
    maxAnnualCareSpendEur: Float64Array,
    healthBucketEnabled: Uint8Array,
    healthBucketUsedEur: Float64Array,
    healthBucketEndEur: Float64Array,
    healthBucketCoveragePct: Float64Array,
    healthBucketTargetGapEur: Float64Array,
    healthBucketInterestEur: Float64Array,
    taxSavedByLossCarryEur: Float64Array
});

export const MONTE_CARLO_PATH_MISSINGNESS_FIELDS = Object.freeze({
    path: Uint8Array,
    realWithdrawalP10RealEur: Uint8Array,
    p1CareEntryAge: Uint8Array,
    p2CareEntryAge: Uint8Array,
    careDepotCostEur: Uint8Array,
    healthBucketCoveragePct: Uint8Array
});

const PATH_TRANSFER_PREFIX = '__mcChunkV1Path_';
const MISSINGNESS_TRANSFER_PREFIX = '__mcChunkV1Missing_';
const MAX_TECHNICAL_ERROR_SAMPLES = 20;

function contractError(message) {
    return new TypeError(`[${MONTE_CARLO_CHUNK_RESULT_VERSION}] ${message}`);
}

function assertNonNegativeInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw contractError(`${label} must be a non-negative safe integer.`);
    }
}

function createTypedFields(registry, length) {
    return Object.fromEntries(Object.entries(registry).map(([field, Constructor]) => (
        [field, new Constructor(length)]
    )));
}

function attachPathTransferBuffers(buffers, pathSummaries, pathMissingness) {
    const existingViews = new Set(Object.values(buffers));
    for (const [field, values] of Object.entries(pathSummaries)) {
        if (existingViews.has(values)) continue;
        buffers[`${PATH_TRANSFER_PREFIX}${field}`] = values;
        existingViews.add(values);
    }
    for (const [field, values] of Object.entries(pathMissingness)) {
        if (existingViews.has(values)) continue;
        buffers[`${MISSINGNESS_TRANSFER_PREFIX}${field}`] = values;
        existingViews.add(values);
    }
}

export function createMonteCarloPathSummaryV1(runCount, {
    buffers = null,
    attachTransferBuffers = false
} = {}) {
    assertNonNegativeInteger(runCount, 'runCount');
    const pathSummaries = createTypedFields(MONTE_CARLO_PATH_SUMMARY_FIELDS, runCount);
    if (buffers) {
        pathSummaries.finalValueNominalEur = buffers.finalOutcomes;
        pathSummaries.volatilityPct = buffers.volatilities;
        pathSummaries.maxDrawdownPct = buffers.maxDrawdowns;
    }
    const pathMissingness = createTypedFields(MONTE_CARLO_PATH_MISSINGNESS_FIELDS, runCount);
    if (buffers && attachTransferBuffers) {
        attachPathTransferBuffers(buffers, pathSummaries, pathMissingness);
    }
    return { pathSummaries, pathMissingness };
}

function setOptionalValue(values, missingness, index, value, missingCode) {
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) {
        values[index] = Number(value);
        missingness[index] = MONTE_CARLO_MISSINGNESS_CODE.OBSERVED;
    } else {
        values[index] = 0;
        missingness[index] = missingCode;
    }
}

export function recordMonteCarloPathSummaryV1({
    pathSummaries,
    pathMissingness,
    localIndex,
    globalRunIndex,
    outcomeCode,
    technicalError = false,
    finalValueNominalEur = 0,
    volatilityPct = 0,
    maxDrawdownPct = 0,
    cutYearsNumerator = 0,
    cutYearsDenominator = 0,
    realWithdrawalP10RealEur = null,
    realWithdrawalObservationCount = 0,
    p1CareEntryAge = null,
    p2CareEntryAge = null,
    p1CareYears = 0,
    p2CareYears = 0,
    bothCareYears = 0,
    careEverActive = false,
    hasPartner = false,
    careDepotCostEur = null,
    maxAnnualCareSpendEur = 0,
    healthBucketEnabled = false,
    healthBucketUsedEur = 0,
    healthBucketEndEur = 0,
    healthBucketCoveragePct = null,
    healthBucketTargetGapEur = 0,
    healthBucketInterestEur = 0,
    taxSavedByLossCarryEur = 0
}) {
    assertNonNegativeInteger(localIndex, 'localIndex');
    assertNonNegativeInteger(globalRunIndex, 'globalRunIndex');
    if (!pathSummaries || !pathMissingness || localIndex >= pathSummaries.globalRunIndex.length) {
        throw contractError('Path summary index is outside the allocated chunk range.');
    }

    pathSummaries.globalRunIndex[localIndex] = globalRunIndex;
    pathSummaries.outcomeCode[localIndex] = outcomeCode;

    if (technicalError) {
        for (const values of Object.values(pathMissingness)) {
            values[localIndex] = MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR;
        }
        return;
    }

    pathMissingness.path[localIndex] = MONTE_CARLO_MISSINGNESS_CODE.OBSERVED;
    pathSummaries.finalValueNominalEur[localIndex] = Number(finalValueNominalEur) || 0;
    pathSummaries.volatilityPct[localIndex] = Number(volatilityPct) || 0;
    pathSummaries.maxDrawdownPct[localIndex] = Number(maxDrawdownPct) || 0;
    pathSummaries.cutYearsNumerator[localIndex] = Math.max(0, Number(cutYearsNumerator) || 0);
    pathSummaries.cutYearsDenominator[localIndex] = Math.max(0, Number(cutYearsDenominator) || 0);
    pathSummaries.realWithdrawalObservationCount[localIndex] = Math.max(0, Number(realWithdrawalObservationCount) || 0);
    setOptionalValue(
        pathSummaries.realWithdrawalP10RealEur,
        pathMissingness.realWithdrawalP10RealEur,
        localIndex,
        pathSummaries.realWithdrawalObservationCount[localIndex] > 0 ? realWithdrawalP10RealEur : null,
        MONTE_CARLO_MISSINGNESS_CODE.NO_OBSERVATIONS
    );
    setOptionalValue(
        pathSummaries.p1CareEntryAge,
        pathMissingness.p1CareEntryAge,
        localIndex,
        p1CareEntryAge,
        MONTE_CARLO_MISSINGNESS_CODE.NOT_APPLICABLE
    );
    setOptionalValue(
        pathSummaries.p2CareEntryAge,
        pathMissingness.p2CareEntryAge,
        localIndex,
        p2CareEntryAge,
        MONTE_CARLO_MISSINGNESS_CODE.NOT_APPLICABLE
    );
    pathSummaries.p1CareYears[localIndex] = Math.max(0, Number(p1CareYears) || 0);
    pathSummaries.p2CareYears[localIndex] = Math.max(0, Number(p2CareYears) || 0);
    pathSummaries.bothCareYears[localIndex] = Math.max(0, Number(bothCareYears) || 0);
    pathSummaries.careEverActive[localIndex] = careEverActive ? 1 : 0;
    pathSummaries.hasPartner[localIndex] = hasPartner ? 1 : 0;
    setOptionalValue(
        pathSummaries.careDepotCostEur,
        pathMissingness.careDepotCostEur,
        localIndex,
        careEverActive ? careDepotCostEur : null,
        MONTE_CARLO_MISSINGNESS_CODE.NOT_APPLICABLE
    );
    pathSummaries.maxAnnualCareSpendEur[localIndex] = Number(maxAnnualCareSpendEur) || 0;
    pathSummaries.healthBucketEnabled[localIndex] = healthBucketEnabled ? 1 : 0;
    pathSummaries.healthBucketUsedEur[localIndex] = Number(healthBucketUsedEur) || 0;
    pathSummaries.healthBucketEndEur[localIndex] = Number(healthBucketEndEur) || 0;
    setOptionalValue(
        pathSummaries.healthBucketCoveragePct,
        pathMissingness.healthBucketCoveragePct,
        localIndex,
        healthBucketEnabled ? healthBucketCoveragePct : null,
        MONTE_CARLO_MISSINGNESS_CODE.NOT_APPLICABLE
    );
    pathSummaries.healthBucketTargetGapEur[localIndex] = Number(healthBucketTargetGapEur) || 0;
    pathSummaries.healthBucketInterestEur[localIndex] = Number(healthBucketInterestEur) || 0;
    pathSummaries.taxSavedByLossCarryEur[localIndex] = Number(taxSavedByLossCarryEur) || 0;
}

function assertTypedFields(container, registry, count, label) {
    if (!container || typeof container !== 'object') {
        throw contractError(`${label} must be an object.`);
    }
    const expectedFields = Object.keys(registry);
    const actualFields = Object.keys(container);
    for (const field of expectedFields) {
        const Constructor = registry[field];
        const values = container[field];
        if (!(values instanceof Constructor)) {
            throw contractError(`${label}.${field} must be ${Constructor.name}.`);
        }
        if (values.length !== count) {
            throw contractError(`${label}.${field} length ${values.length} does not match runRange.count ${count}.`);
        }
        if (Constructor === Float32Array || Constructor === Float64Array) {
            for (const value of values) {
                if (!Number.isFinite(value)) {
                    throw contractError(`${label}.${field} contains a non-finite value.`);
                }
            }
        }
    }
    const unknown = actualFields.filter(field => !expectedFields.includes(field));
    if (unknown.length > 0) {
        throw contractError(`${label} contains unregistered fields: ${unknown.join(', ')}.`);
    }
}

function assertBuffers(buffers, count) {
    if (!buffers || typeof buffers !== 'object') {
        throw contractError('buffers must be an object.');
    }
    for (const [field, Constructor] of Object.entries(MONTE_CARLO_BUFFER_FIELDS)) {
        const values = buffers[field];
        if (!(values instanceof Constructor)) {
            throw contractError(`buffers.${field} must be ${Constructor.name}.`);
        }
        if (values.length !== count) {
            throw contractError(`buffers.${field} length ${values.length} does not match runRange.count ${count}.`);
        }
        if (Constructor === Float32Array || Constructor === Float64Array) {
            for (const value of values) {
                if (!Number.isFinite(value)) {
                    throw contractError(`buffers.${field} contains a non-finite value.`);
                }
            }
        }
    }
    const unknown = Object.keys(buffers).filter(field => (
        !(field in MONTE_CARLO_BUFFER_FIELDS)
        && !field.startsWith(PATH_TRANSFER_PREFIX)
        && !field.startsWith(MISSINGNESS_TRANSFER_PREFIX)
    ));
    if (unknown.length > 0) {
        throw contractError(`buffers contains unregistered fields: ${unknown.join(', ')}.`);
    }
}

function assertFiniteNumberList(values, label) {
    if (!Array.isArray(values)) throw contractError(`${label} must be an array.`);
    for (const value of values) {
        if (!Number.isFinite(value)) throw contractError(`${label} contains a non-finite value.`);
    }
}

function assertDiagnostics(result, count) {
    if (!Array.isArray(result.bins) || result.bins.length < 2) {
        throw contractError('bins must contain at least two boundaries.');
    }
    for (let index = 0; index < result.bins.length; index++) {
        const value = result.bins[index];
        if (typeof value !== 'number' || Number.isNaN(value)) {
            throw contractError('bins must contain numeric boundaries.');
        }
        if (index > 0 && value <= result.bins[index - 1]) {
            throw contractError('bins must be strictly increasing.');
        }
    }
    if (!Array.isArray(result.heatmap)) throw contractError('heatmap must be an array.');
    for (const row of result.heatmap) {
        if (!(row instanceof Uint32Array) || row.length !== result.bins.length - 1) {
            throw contractError('heatmap rows must be Uint32Array values matching bins.');
        }
    }
    if (!result.technicalInventory || typeof result.technicalInventory !== 'object') {
        throw contractError('technicalInventory must be an object.');
    }
    for (const field of ['requested', 'financiallyEvaluable', 'technicalError']) {
        assertNonNegativeInteger(result.technicalInventory[field], `technicalInventory.${field}`);
    }
    if (result.technicalInventory.requested !== count) {
        throw contractError('technicalInventory.requested must equal runRange.count.');
    }
    if (result.technicalInventory.financiallyEvaluable + result.technicalInventory.technicalError !== count) {
        throw contractError('technical inventory must classify every chunk run exactly once.');
    }
    if (!Array.isArray(result.technicalInventory.errors)) {
        throw contractError('technicalInventory.errors must be an array.');
    }
    if (!Array.isArray(result.runMeta)) throw contractError('runMeta must be an array.');
    if (result.runMeta.length !== result.technicalInventory.financiallyEvaluable) {
        throw contractError('runMeta length must equal financially evaluable runs.');
    }
}

export function assertMonteCarloChunkResultV1(result, {
    expectedStart = null,
    expectedCount = null
} = {}) {
    if (!result || typeof result !== 'object') throw contractError('Chunk result must be an object.');
    if (result.schemaVersion !== MONTE_CARLO_CHUNK_RESULT_VERSION) {
        throw contractError(`Unsupported schemaVersion ${String(result.schemaVersion)}.`);
    }
    const start = result.runRange?.start;
    const count = result.runRange?.count;
    assertNonNegativeInteger(start, 'runRange.start');
    assertNonNegativeInteger(count, 'runRange.count');
    if (expectedStart !== null && start !== expectedStart) {
        throw contractError(`runRange.start ${start} does not match expected start ${expectedStart}.`);
    }
    if (expectedCount !== null && count !== expectedCount) {
        throw contractError(`runRange.count ${count} does not match expected count ${expectedCount}.`);
    }

    assertBuffers(result.buffers, count);
    assertTypedFields(result.pathSummaries, MONTE_CARLO_PATH_SUMMARY_FIELDS, count, 'pathSummaries');
    assertTypedFields(result.pathMissingness, MONTE_CARLO_PATH_MISSINGNESS_FIELDS, count, 'pathMissingness');

    const registeredTotalFields = new Set([
        ...MONTE_CARLO_COUNTER_FIELDS,
        ...MONTE_CARLO_FLOAT_AGGREGATE_FIELDS
    ]);
    if (!result.totals || typeof result.totals !== 'object') throw contractError('totals must be an object.');
    for (const field of registeredTotalFields) {
        const value = result.totals[field];
        if (!Number.isFinite(value) || value < 0) {
            throw contractError(`totals.${field} must be a finite non-negative number.`);
        }
        if (MONTE_CARLO_COUNTER_FIELDS.includes(field) && !Number.isSafeInteger(value)) {
            throw contractError(`totals.${field} must be an integer counter.`);
        }
    }
    const unknownTotals = Object.keys(result.totals).filter(field => !registeredTotalFields.has(field));
    if (unknownTotals.length > 0) {
        throw contractError(`totals contains unregistered fields: ${unknownTotals.join(', ')}.`);
    }

    if (!result.lists || typeof result.lists !== 'object') throw contractError('lists must be an object.');
    for (const field of MONTE_CARLO_LIST_FIELDS) {
        assertFiniteNumberList(result.lists[field], `lists.${field}`);
    }
    const unknownLists = Object.keys(result.lists).filter(field => !MONTE_CARLO_LIST_FIELDS.includes(field));
    if (unknownLists.length > 0) {
        throw contractError(`lists contains unregistered fields: ${unknownLists.join(', ')}.`);
    }
    assertFiniteNumberList(result.allRealWithdrawalsSample, 'allRealWithdrawalsSample');
    assertDiagnostics(result, count);

    let technicalPaths = 0;
    const seenMetaIndices = new Set();
    const validOutcomeCodes = new Set(Object.values(MONTE_CARLO_OUTCOME_CODE).filter(code => code !== MONTE_CARLO_OUTCOME_CODE.UNSET));
    const validMissingnessCodes = new Set(Object.values(MONTE_CARLO_MISSINGNESS_CODE).filter(code => code !== MONTE_CARLO_MISSINGNESS_CODE.UNSET));
    for (let localIndex = 0; localIndex < count; localIndex++) {
        const globalIndex = start + localIndex;
        if (result.pathSummaries.globalRunIndex[localIndex] !== globalIndex) {
            throw contractError(`pathSummaries.globalRunIndex[${localIndex}] must equal ${globalIndex}.`);
        }
        const outcomeCode = result.pathSummaries.outcomeCode[localIndex];
        const pathState = result.pathMissingness.path[localIndex];
        if (!validOutcomeCodes.has(outcomeCode)) {
            throw contractError(`pathSummaries.outcomeCode[${localIndex}] is not registered.`);
        }
        for (const [field, values] of Object.entries(result.pathMissingness)) {
            if (!validMissingnessCodes.has(values[localIndex])) {
                throw contractError(`pathMissingness.${field}[${localIndex}] is not registered.`);
            }
        }
        if (outcomeCode === MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR) {
            technicalPaths++;
            if (pathState !== MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR) {
                throw contractError(`technical path ${globalIndex} must carry technical-error missingness.`);
            }
            for (const values of Object.values(result.pathMissingness)) {
                if (values[localIndex] !== MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR) {
                    throw contractError(`technical path ${globalIndex} must fail all summary fields closed.`);
                }
            }
        } else if (pathState !== MONTE_CARLO_MISSINGNESS_CODE.OBSERVED) {
            throw contractError(`financial path ${globalIndex} must be observed.`);
        } else {
            for (const [field, values] of Object.entries(result.pathMissingness)) {
                if (field !== 'path' && values[localIndex] === MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR) {
                    throw contractError(`financial path ${globalIndex} cannot contain technical missingness.`);
                }
            }
        }
    }
    if (technicalPaths !== result.technicalInventory.technicalError) {
        throw contractError('Path outcome codes and technical inventory disagree.');
    }
    for (const meta of result.runMeta) {
        const index = meta?.index;
        if (!Number.isSafeInteger(index) || index < start || index >= start + count || seenMetaIndices.has(index)) {
            throw contractError('runMeta indices must be unique and inside runRange.');
        }
        seenMetaIndices.add(index);
    }
    return result;
}

export function createMonteCarloChunkResultV1(result) {
    const contracted = {
        ...result,
        schemaVersion: MONTE_CARLO_CHUNK_RESULT_VERSION
    };
    return assertMonteCarloChunkResultV1(contracted);
}

function createEmptyTotals() {
    return Object.fromEntries([
        ...MONTE_CARLO_COUNTER_FIELDS,
        ...MONTE_CARLO_FLOAT_AGGREGATE_FIELDS
    ].map(field => [field, 0]));
}

function createEmptyLists() {
    return Object.fromEntries(MONTE_CARLO_LIST_FIELDS.map(field => [field, []]));
}

export function createMonteCarloChunkAccumulatorV1(totalRuns, {
    bins = MC_HEATMAP_BINS,
    heatmapRows = 10,
    retainRunMeta = true
} = {}) {
    assertNonNegativeInteger(totalRuns, 'totalRuns');
    assertNonNegativeInteger(heatmapRows, 'heatmapRows');
    if (!Array.isArray(bins) || bins.length < 2) throw contractError('Accumulator bins are invalid.');
    const buffers = createMonteCarloBuffers(totalRuns);
    const { pathSummaries, pathMissingness } = createMonteCarloPathSummaryV1(totalRuns, { buffers });
    return {
        schemaVersion: MONTE_CARLO_CHUNK_RESULT_VERSION,
        totalRuns,
        bins: [...bins],
        heatmapRows,
        buffers,
        pathSummaries,
        pathMissingness,
        mergedRuns: new Uint8Array(totalRuns),
        retainRunMeta: retainRunMeta === true,
        runMetaByIndex: retainRunMeta === true ? new Array(totalRuns) : null,
        contributions: new Map()
    };
}

function assertCompatibleBins(accumulator, result) {
    if (result.heatmap.length !== accumulator.heatmapRows || result.bins.length !== accumulator.bins.length) {
        throw contractError('Chunk heatmap dimensions do not match the accumulator.');
    }
    for (let index = 0; index < accumulator.bins.length; index++) {
        if (!Object.is(accumulator.bins[index], result.bins[index])) {
            throw contractError(`Chunk bin ${index} does not match the accumulator.`);
        }
    }
}

export function mergeMonteCarloChunkResultV1(accumulator, result, {
    expectedStart = null,
    expectedCount = null
} = {}) {
    if (!accumulator || accumulator.schemaVersion !== MONTE_CARLO_CHUNK_RESULT_VERSION) {
        throw contractError('Accumulator is missing or incompatible.');
    }
    assertMonteCarloChunkResultV1(result, { expectedStart, expectedCount });
    assertCompatibleBins(accumulator, result);
    const { start, count } = result.runRange;
    if (start + count > accumulator.totalRuns) {
        throw contractError('Chunk range exceeds the accumulator run count.');
    }
    if (accumulator.contributions.has(start)) throw contractError(`Chunk starting at ${start} was merged twice.`);
    for (let localIndex = 0; localIndex < count; localIndex++) {
        if (accumulator.mergedRuns[start + localIndex] !== 0) {
            throw contractError(`Chunk range overlaps global run ${start + localIndex}.`);
        }
    }

    for (const field of Object.keys(MONTE_CARLO_BUFFER_FIELDS)) {
        accumulator.buffers[field].set(result.buffers[field], start);
    }
    for (const field of Object.keys(MONTE_CARLO_PATH_SUMMARY_FIELDS)) {
        accumulator.pathSummaries[field].set(result.pathSummaries[field], start);
    }
    for (const field of Object.keys(MONTE_CARLO_PATH_MISSINGNESS_FIELDS)) {
        accumulator.pathMissingness[field].set(result.pathMissingness[field], start);
    }
    accumulator.mergedRuns.fill(1, start, start + count);
    if (accumulator.runMetaByIndex) {
        for (const meta of result.runMeta) accumulator.runMetaByIndex[meta.index] = meta;
    }
    accumulator.contributions.set(start, {
        runRange: { ...result.runRange },
        totals: { ...result.totals },
        heatmap: result.heatmap.map(row => new Uint32Array(row)),
        allRealWithdrawalsSample: [...result.allRealWithdrawalsSample],
        technicalInventory: {
            ...result.technicalInventory,
            errors: [...result.technicalInventory.errors]
        },
        worstRun: result.worstRun,
        worstRunCare: result.worstRunCare
    });
    return accumulator;
}

function buildListsFromPathSummaries(accumulator) {
    const lists = createEmptyLists();
    const summary = accumulator.pathSummaries;
    const missing = accumulator.pathMissingness;
    for (let index = 0; index < accumulator.totalRuns; index++) {
        if (missing.path[index] !== MONTE_CARLO_MISSINGNESS_CODE.OBSERVED) continue;
        if (summary.careEverActive[index] === 1) {
            lists.entryAges.push(missing.p1CareEntryAge[index] === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED
                ? summary.p1CareEntryAge[index]
                : 0);
            if (summary.hasPartner[index] === 1) {
                lists.entryAgesP2.push(missing.p2CareEntryAge[index] === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED
                    ? summary.p2CareEntryAge[index]
                    : 0);
                lists.p2CareYearsTriggered.push(summary.p2CareYears[index]);
            }
            lists.careDepotCosts.push(summary.careDepotCostEur[index]);
            lists.endWealthWithCareList.push(summary.finalValueNominalEur[index]);
            lists.p1CareYearsTriggered.push(summary.p1CareYears[index]);
            lists.bothCareYearsOverlapTriggered.push(summary.bothCareYears[index]);
            lists.maxAnnualCareSpendTriggered.push(summary.maxAnnualCareSpendEur[index]);
        } else {
            lists.endWealthNoCareList.push(summary.finalValueNominalEur[index]);
        }

        if (summary.healthBucketEnabled[index] === 1) {
            lists.healthBucketEndAmounts.push(summary.healthBucketEndEur[index]);
            lists.healthBucketTargetGaps.push(summary.healthBucketTargetGapEur[index]);
            if (missing.healthBucketCoveragePct[index] === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED) {
                lists.healthBucketCoveragePct.push(summary.healthBucketCoveragePct[index]);
            }
        }
        if (summary.healthBucketUsedEur[index] > 0) {
            lists.healthBucketUsedAmounts.push(summary.healthBucketUsedEur[index]);
        }
        if (summary.healthBucketInterestEur[index] > 0) {
            lists.healthBucketInterestAmounts.push(summary.healthBucketInterestEur[index]);
        }
    }
    return lists;
}

function buildTechnicalInventory(totalRuns, chunks) {
    const inventory = {
        requested: totalRuns,
        financiallyEvaluable: 0,
        technicalError: 0,
        errors: []
    };
    for (const chunk of chunks) {
        inventory.financiallyEvaluable += chunk.technicalInventory.financiallyEvaluable;
        inventory.technicalError += chunk.technicalInventory.technicalError;
        for (const error of chunk.technicalInventory.errors) {
            if (inventory.errors.length >= MAX_TECHNICAL_ERROR_SAMPLES) break;
            inventory.errors.push(error);
        }
    }
    return inventory;
}

export function finalizeMonteCarloChunkAccumulatorV1(accumulator) {
    if (!accumulator || accumulator.schemaVersion !== MONTE_CARLO_CHUNK_RESULT_VERSION) {
        throw contractError('Accumulator is missing or incompatible.');
    }
    for (let index = 0; index < accumulator.totalRuns; index++) {
        if (accumulator.mergedRuns[index] !== 1) {
            throw contractError(`Cannot finalize: global run ${index} is missing.`);
        }
    }
    const chunks = [...accumulator.contributions.values()].sort((left, right) => (
        left.runRange.start - right.runRange.start
    ));
    const totals = createEmptyTotals();
    const heatmap = Array.from(
        { length: accumulator.heatmapRows },
        () => new Uint32Array(accumulator.bins.length - 1)
    );
    const allRealWithdrawalsSample = [];
    const runMeta = accumulator.runMetaByIndex
        ? accumulator.runMetaByIndex.filter(Boolean)
        : [];
    let worstRun = null;
    let worstRunCare = null;

    for (const chunk of chunks) {
        for (const field of MONTE_CARLO_COUNTER_FIELDS) totals[field] += chunk.totals[field];
        for (let row = 0; row < heatmap.length; row++) {
            for (let column = 0; column < heatmap[row].length; column++) {
                heatmap[row][column] += chunk.heatmap[row][column];
            }
        }
        allRealWithdrawalsSample.push(...chunk.allRealWithdrawalsSample);
        worstRun = pickWorstRun(worstRun, chunk.worstRun);
        worstRunCare = pickWorstRun(worstRunCare, chunk.worstRunCare);
    }

    for (let index = 0; index < accumulator.totalRuns; index++) {
        if (accumulator.pathMissingness.path[index] !== MONTE_CARLO_MISSINGNESS_CODE.OBSERVED) continue;
        totals.totalTaxSavedByLossCarry += accumulator.pathSummaries.taxSavedByLossCarryEur[index];
        totals.totalHealthBucketUsed += accumulator.pathSummaries.healthBucketUsedEur[index];
    }
    return {
        schemaVersion: MONTE_CARLO_CHUNK_RESULT_VERSION,
        totalRuns: accumulator.totalRuns,
        completedRuns: accumulator.totalRuns,
        buffers: accumulator.buffers,
        pathSummaries: accumulator.pathSummaries,
        pathMissingness: accumulator.pathMissingness,
        heatmap,
        bins: [...accumulator.bins],
        totals,
        lists: buildListsFromPathSummaries(accumulator),
        allRealWithdrawalsSample,
        technicalInventory: buildTechnicalInventory(accumulator.totalRuns, chunks),
        worstRun,
        worstRunCare,
        runMeta
    };
}
