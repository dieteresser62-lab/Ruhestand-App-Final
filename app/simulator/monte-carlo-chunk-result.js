"use strict";

import {
    MC_HEATMAP_BINS,
    createMonteCarloBuffers,
    pickWorstRun
} from './monte-carlo-runner-utils.js';
import {
    assertMonteCarloSamplingDiagnosticsV1,
    mergeMonteCarloSamplingDiagnosticsV1
} from './mc-year-sampling.js';

export const MONTE_CARLO_CHUNK_RESULT_VERSION = 'MonteCarloChunkResultV1';
export const MONTE_CARLO_OUTCOME_INVENTORY_VERSION = 'MonteCarloOutcomeInventoryV1';

export const MONTE_CARLO_OUTCOME_CODE = Object.freeze({
    UNSET: 0,
    RUIN: 1,
    ALL_DEAD: 2,
    HORIZON_EXHAUSTED: 3,
    TECHNICAL_ERROR: 4
});

const MONTE_CARLO_OUTCOME_NAME_BY_CODE = Object.freeze({
    [MONTE_CARLO_OUTCOME_CODE.RUIN]: 'ruin',
    [MONTE_CARLO_OUTCOME_CODE.ALL_DEAD]: 'all_dead',
    [MONTE_CARLO_OUTCOME_CODE.HORIZON_EXHAUSTED]: 'horizon_exhausted',
    [MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR]: 'technical_error'
});

export function resolveMonteCarloTerminalOutcomeV1({
    technicalError = false,
    ruinInStartedFinancialYear = false,
    allDeadTiming = null,
    horizonExhausted = false
} = {}) {
    const allowedDeathTimings = new Set([null, 'before_next_financial_obligation', 'after_ruin']);
    const flagsAreBoolean = [technicalError, ruinInStartedFinancialYear, horizonExhausted]
        .every(value => typeof value === 'boolean');
    if (!flagsAreBoolean || !allowedDeathTimings.has(allDeadTiming)) {
        return { outcomeCode: MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR, errorCode: 'MC_TERMINAL_FLAGS_INVALID' };
    }
    if (technicalError) {
        return { outcomeCode: MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR, errorCode: null };
    }
    if (ruinInStartedFinancialYear) {
        if (allDeadTiming === 'before_next_financial_obligation' || horizonExhausted) {
            return { outcomeCode: MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR, errorCode: 'MC_TERMINAL_FLAGS_CONFLICT' };
        }
        return { outcomeCode: MONTE_CARLO_OUTCOME_CODE.RUIN, errorCode: null };
    }
    if (allDeadTiming !== null) {
        if (allDeadTiming === 'after_ruin' || horizonExhausted) {
            return { outcomeCode: MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR, errorCode: 'MC_TERMINAL_FLAGS_CONFLICT' };
        }
        return { outcomeCode: MONTE_CARLO_OUTCOME_CODE.ALL_DEAD, errorCode: null };
    }
    if (horizonExhausted) {
        return { outcomeCode: MONTE_CARLO_OUTCOME_CODE.HORIZON_EXHAUSTED, errorCode: null };
    }
    return { outcomeCode: MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR, errorCode: 'MC_TERMINAL_OUTCOME_INCOMPLETE' };
}

export function buildMonteCarloOutcomeInventoryV1({
    requestedRuns,
    ruin = 0,
    all_dead = 0,
    horizon_exhausted = 0,
    technical_error = 0
} = {}) {
    const counts = { ruin, all_dead, horizon_exhausted, technical_error };
    assertNonNegativeInteger(requestedRuns, 'outcomeInventory.requestedRuns');
    for (const [name, value] of Object.entries(counts)) {
        assertNonNegativeInteger(value, `outcomeInventory.${name}`);
    }
    const inventorySum = Object.values(counts).reduce((total, value) => total + value, 0);
    if (inventorySum !== requestedRuns) {
        throw contractError(`Outcome inventory sum ${inventorySum} does not match requestedRuns ${requestedRuns}.`);
    }
    const floorCoveredCount = all_dead + horizon_exhausted;
    const hasTechnicalError = technical_error > 0;
    return {
        schemaVersion: MONTE_CARLO_OUTCOME_INVENTORY_VERSION,
        requestedRuns,
        ...counts,
        inventorySum,
        floorCoveredCount,
        floorCoveragePct: !hasTechnicalError && requestedRuns > 0
            ? (floorCoveredCount / requestedRuns) * 100
            : null,
        floorCoverageMissingnessReason: hasTechnicalError
            ? 'technical_error_in_batch'
            : requestedRuns === 0
                ? 'no_requested_runs'
                : null
    };
}

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
    kpiLebensdauer: Uint32Array,
    kpiKuerzungsjahre: Float32Array,
    cutYearShareRatio: Float32Array,
    cutYearShareMissingness: Uint8Array,
    kpiMaxKuerzung: Float32Array,
    volatilities: Float32Array,
    maxDrawdowns: Float32Array,
    depotErschoepft: Uint8Array,
    alterBeiErschoepfung: Uint32Array,
    alterBeiErschoepfungMissingness: Uint8Array,
    anteilJahreOhneFlex: Float32Array,
    stress_maxDrawdowns: Float32Array,
    stress_timeQuoteAbove45: Float32Array,
    stress_cutYears: Float32Array,
    stress_CaR_P10_Real: Float64Array,
    stress_recoveryYears: Float32Array
});

export const MONTE_CARLO_COUNTER_FIELDS = Object.freeze([
    'failCount',
    'outcomeRuinCount',
    'outcomeAllDeadCount',
    'outcomeHorizonExhaustedCount',
    'pflegeTriggeredCount',
    'p1TriggeredCount',
    'p2TriggeredCount',
    'totalSimulatedYears',
    'totalYearsQuoteAbove45',
    'totalYearsSafetyStage1plus',
    'totalYearsSafetyStage2',
    'shortfallWithCareCount',
    'shortfallNoCareProxyCount',
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
    'p1CareAdditionalNeedRealEur',
    'p2CareAdditionalNeedRealEur',
    'totalCareAdditionalNeedRealEur',
    'endWealthWithCareRealEur',
    'endWealthNoCareRealEur',
    'p1CareYearsTriggered',
    'p2CareYearsTriggered',
    'bothCareYearsOverlapTriggered',
    'maxAnnualCareAdditionalNeedRealEur',
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
    finalValueRealEur: Float64Array,
    volatilityPct: Float32Array,
    maxDrawdownPct: Float32Array,
    cutYearsNumerator: Uint32Array,
    cutYearsDenominator: Uint32Array,
    cutYearShareRatio: Float32Array,
    realWithdrawalP10RealEur: Float64Array,
    realWithdrawalObservationCount: Uint32Array,
    p1CareEntryAge: Uint16Array,
    p2CareEntryAge: Uint16Array,
    p1CareYears: Uint16Array,
    p2CareYears: Uint16Array,
    bothCareYears: Uint16Array,
    careEverActive: Uint8Array,
    hasPartner: Uint8Array,
    p1CareAdditionalNeedRealEur: Float64Array,
    p2CareAdditionalNeedRealEur: Float64Array,
    totalCareAdditionalNeedRealEur: Float64Array,
    maxAnnualCareAdditionalNeedRealEur: Float64Array,
    p1CareAdditionalNeedNominalEur: Float64Array,
    p2CareAdditionalNeedNominalEur: Float64Array,
    totalCareAdditionalNeedNominalEur: Float64Array,
    maxAnnualCareAdditionalNeedNominalEur: Float64Array,
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
    cutYearShareRatio: Uint8Array,
    realWithdrawalP10RealEur: Uint8Array,
    p1CareEntryAge: Uint8Array,
    p2CareEntryAge: Uint8Array,
    p1CareAdditionalNeedRealEur: Uint8Array,
    p2CareAdditionalNeedRealEur: Uint8Array,
    totalCareAdditionalNeedRealEur: Uint8Array,
    maxAnnualCareAdditionalNeedRealEur: Uint8Array,
    p1CareAdditionalNeedNominalEur: Uint8Array,
    p2CareAdditionalNeedNominalEur: Uint8Array,
    totalCareAdditionalNeedNominalEur: Uint8Array,
    maxAnnualCareAdditionalNeedNominalEur: Uint8Array,
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
        pathSummaries.cutYearShareRatio = buffers.cutYearShareRatio;
    }
    const pathMissingness = createTypedFields(MONTE_CARLO_PATH_MISSINGNESS_FIELDS, runCount);
    if (buffers) {
        pathMissingness.cutYearShareRatio = buffers.cutYearShareMissingness;
    }
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
    finalValueRealEur = 0,
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
    p1CareAdditionalNeedRealEur = null,
    p2CareAdditionalNeedRealEur = null,
    totalCareAdditionalNeedRealEur = null,
    maxAnnualCareAdditionalNeedRealEur = null,
    p1CareAdditionalNeedNominalEur = null,
    p2CareAdditionalNeedNominalEur = null,
    totalCareAdditionalNeedNominalEur = null,
    maxAnnualCareAdditionalNeedNominalEur = null,
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
    pathSummaries.finalValueRealEur[localIndex] = Number(finalValueRealEur) || 0;
    pathSummaries.volatilityPct[localIndex] = Number(volatilityPct) || 0;
    pathSummaries.maxDrawdownPct[localIndex] = Number(maxDrawdownPct) || 0;
    assertNonNegativeInteger(cutYearsNumerator, 'cutYearsNumerator');
    assertNonNegativeInteger(cutYearsDenominator, 'cutYearsDenominator');
    if (cutYearsNumerator > cutYearsDenominator) {
        throw contractError('cutYearsNumerator must not exceed cutYearsDenominator.');
    }
    pathSummaries.cutYearsNumerator[localIndex] = cutYearsNumerator;
    pathSummaries.cutYearsDenominator[localIndex] = cutYearsDenominator;
    setOptionalValue(
        pathSummaries.cutYearShareRatio,
        pathMissingness.cutYearShareRatio,
        localIndex,
        cutYearsDenominator > 0 ? cutYearsNumerator / cutYearsDenominator : null,
        MONTE_CARLO_MISSINGNESS_CODE.NO_OBSERVATIONS
    );
    pathSummaries.realWithdrawalObservationCount[localIndex] = Math.max(0, Number(realWithdrawalObservationCount) || 0);
    setOptionalValue(
        pathSummaries.realWithdrawalP10RealEur,
        pathMissingness.realWithdrawalP10RealEur,
        localIndex,
        pathSummaries.realWithdrawalObservationCount[localIndex] > 0 ? realWithdrawalP10RealEur : null,
        MONTE_CARLO_MISSINGNESS_CODE.NO_OBSERVATIONS
    );
    const normalizedP1CareEntryAge = Number(p1CareEntryAge) > 0 ? p1CareEntryAge : null;
    const normalizedP2CareEntryAge = Number(p2CareEntryAge) > 0 ? p2CareEntryAge : null;
    setOptionalValue(
        pathSummaries.p1CareEntryAge,
        pathMissingness.p1CareEntryAge,
        localIndex,
        normalizedP1CareEntryAge,
        MONTE_CARLO_MISSINGNESS_CODE.NOT_APPLICABLE
    );
    setOptionalValue(
        pathSummaries.p2CareEntryAge,
        pathMissingness.p2CareEntryAge,
        localIndex,
        normalizedP2CareEntryAge,
        MONTE_CARLO_MISSINGNESS_CODE.NOT_APPLICABLE
    );
    pathSummaries.p1CareYears[localIndex] = Math.max(0, Number(p1CareYears) || 0);
    pathSummaries.p2CareYears[localIndex] = Math.max(0, Number(p2CareYears) || 0);
    pathSummaries.bothCareYears[localIndex] = Math.max(0, Number(bothCareYears) || 0);
    pathSummaries.careEverActive[localIndex] = careEverActive ? 1 : 0;
    pathSummaries.hasPartner[localIndex] = hasPartner ? 1 : 0;
    const careValues = {
        p1CareAdditionalNeedRealEur: [normalizedP1CareEntryAge !== null, p1CareAdditionalNeedRealEur],
        p2CareAdditionalNeedRealEur: [normalizedP2CareEntryAge !== null, p2CareAdditionalNeedRealEur],
        totalCareAdditionalNeedRealEur: [careEverActive, totalCareAdditionalNeedRealEur],
        maxAnnualCareAdditionalNeedRealEur: [careEverActive, maxAnnualCareAdditionalNeedRealEur],
        p1CareAdditionalNeedNominalEur: [normalizedP1CareEntryAge !== null, p1CareAdditionalNeedNominalEur],
        p2CareAdditionalNeedNominalEur: [normalizedP2CareEntryAge !== null, p2CareAdditionalNeedNominalEur],
        totalCareAdditionalNeedNominalEur: [careEverActive, totalCareAdditionalNeedNominalEur],
        maxAnnualCareAdditionalNeedNominalEur: [careEverActive, maxAnnualCareAdditionalNeedNominalEur]
    };
    for (const [field, [applicable, value]] of Object.entries(careValues)) {
        setOptionalValue(
            pathSummaries[field],
            pathMissingness[field],
            localIndex,
            applicable ? value : null,
            MONTE_CARLO_MISSINGNESS_CODE.NOT_APPLICABLE
        );
    }
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
    try {
        assertMonteCarloSamplingDiagnosticsV1(result.samplingDiagnostics, { expectedRuns: count });
    } catch (error) {
        throw contractError(`samplingDiagnostics are invalid: ${error?.message || String(error)}`);
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
    const outcomeCounts = {
        ruin: 0,
        all_dead: 0,
        horizon_exhausted: 0,
        technical_error: 0
    };
    let observedHouseholdCarePaths = 0;
    let observedP1CarePaths = 0;
    let observedP2CarePaths = 0;
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
        outcomeCounts[MONTE_CARLO_OUTCOME_NAME_BY_CODE[outcomeCode]]++;
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
            const cutNumerator = result.pathSummaries.cutYearsNumerator[localIndex];
            const cutDenominator = result.pathSummaries.cutYearsDenominator[localIndex];
            const cutRatio = result.pathSummaries.cutYearShareRatio[localIndex];
            const cutMissingness = result.pathMissingness.cutYearShareRatio[localIndex];
            if (cutNumerator > cutDenominator) {
                throw contractError(`financial path ${globalIndex} has a cut numerator above its denominator.`);
            }
            if (cutDenominator === 0) {
                if (cutNumerator !== 0
                    || cutMissingness !== MONTE_CARLO_MISSINGNESS_CODE.NO_OBSERVATIONS
                    || cutRatio !== 0) {
                    throw contractError(`financial path ${globalIndex} must encode an empty cut denominator as nullable missingness.`);
                }
            } else if (cutMissingness !== MONTE_CARLO_MISSINGNESS_CODE.OBSERVED
                || cutRatio !== Math.fround(cutNumerator / cutDenominator)) {
                throw contractError(`financial path ${globalIndex} has an inconsistent cut-year share.`);
            }
            const bufferedCutRatio = result.buffers.cutYearShareRatio[localIndex];
            if (!Object.is(bufferedCutRatio, cutRatio)) {
                throw contractError(`financial path ${globalIndex} has divergent cut-year buffer and summary values.`);
            }
            if (result.buffers.cutYearShareMissingness[localIndex] !== cutMissingness) {
                throw contractError(`financial path ${globalIndex} has divergent cut-year buffer and missingness values.`);
            }

            const p1Observed = result.pathMissingness.p1CareEntryAge[localIndex]
                === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED;
            const p2Observed = result.pathMissingness.p2CareEntryAge[localIndex]
                === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED;
            const householdObserved = result.pathSummaries.careEverActive[localIndex] === 1;
            if (p1Observed) observedP1CarePaths++;
            if (p2Observed) observedP2CarePaths++;
            if (householdObserved) observedHouseholdCarePaths++;
            if (householdObserved !== (p1Observed || p2Observed)) {
                throw contractError(`financial path ${globalIndex} has inconsistent household/person care flags.`);
            }
            if (p2Observed && result.pathSummaries.hasPartner[localIndex] !== 1) {
                throw contractError(`financial path ${globalIndex} observes P2 care without a partner.`);
            }
            if (!p1Observed && result.pathSummaries.p1CareYears[localIndex] !== 0) {
                throw contractError(`financial path ${globalIndex} has P1 care years without a P1 entry.`);
            }
            if (!p2Observed && result.pathSummaries.p2CareYears[localIndex] !== 0) {
                throw contractError(`financial path ${globalIndex} has P2 care years without a P2 entry.`);
            }
            if (result.pathSummaries.bothCareYears[localIndex]
                > Math.min(result.pathSummaries.p1CareYears[localIndex], result.pathSummaries.p2CareYears[localIndex])) {
                throw contractError(`financial path ${globalIndex} has impossible simultaneous care years.`);
            }
            const careMissingnessExpectations = {
                p1CareAdditionalNeedRealEur: p1Observed,
                p2CareAdditionalNeedRealEur: p2Observed,
                totalCareAdditionalNeedRealEur: householdObserved,
                maxAnnualCareAdditionalNeedRealEur: householdObserved,
                p1CareAdditionalNeedNominalEur: p1Observed,
                p2CareAdditionalNeedNominalEur: p2Observed,
                totalCareAdditionalNeedNominalEur: householdObserved,
                maxAnnualCareAdditionalNeedNominalEur: householdObserved
            };
            for (const [field, observed] of Object.entries(careMissingnessExpectations)) {
                const expectedCode = observed
                    ? MONTE_CARLO_MISSINGNESS_CODE.OBSERVED
                    : MONTE_CARLO_MISSINGNESS_CODE.NOT_APPLICABLE;
                if (result.pathMissingness[field][localIndex] !== expectedCode) {
                    throw contractError(`financial path ${globalIndex} has inconsistent ${field} missingness.`);
                }
                if (result.pathSummaries[field][localIndex] < 0) {
                    throw contractError(`financial path ${globalIndex} has negative ${field}.`);
                }
            }
        }
    }
    if (technicalPaths !== result.technicalInventory.technicalError) {
        throw contractError('Path outcome codes and technical inventory disagree.');
    }
    if (outcomeCounts.ruin !== result.totals.outcomeRuinCount
        || outcomeCounts.all_dead !== result.totals.outcomeAllDeadCount
        || outcomeCounts.horizon_exhausted !== result.totals.outcomeHorizonExhaustedCount) {
        throw contractError('Path outcome codes and financial outcome counters disagree.');
    }
    if (result.totals.failCount !== result.totals.outcomeRuinCount) {
        throw contractError('failCount and outcomeRuinCount must describe the same financial paths.');
    }
    buildMonteCarloOutcomeInventoryV1({
        requestedRuns: count,
        ...outcomeCounts
    });
    if (observedHouseholdCarePaths !== result.totals.pflegeTriggeredCount
        || observedP1CarePaths !== result.totals.p1TriggeredCount
        || observedP2CarePaths !== result.totals.p2TriggeredCount) {
        throw contractError('Path care observations and care counters disagree.');
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
        samplingDiagnostics: null,
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
        samplingDiagnostics: JSON.parse(JSON.stringify(result.samplingDiagnostics)),
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
        const p1Triggered = missing.p1CareEntryAge[index] === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED;
        const p2Triggered = missing.p2CareEntryAge[index] === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED;
        if (p1Triggered) {
            lists.entryAges.push(summary.p1CareEntryAge[index]);
            lists.p1CareYearsTriggered.push(summary.p1CareYears[index]);
            lists.p1CareAdditionalNeedRealEur.push(summary.p1CareAdditionalNeedRealEur[index]);
        }
        if (p2Triggered) {
            lists.entryAgesP2.push(summary.p2CareEntryAge[index]);
            lists.p2CareYearsTriggered.push(summary.p2CareYears[index]);
            lists.p2CareAdditionalNeedRealEur.push(summary.p2CareAdditionalNeedRealEur[index]);
        }
        if (summary.careEverActive[index] === 1) {
            lists.totalCareAdditionalNeedRealEur.push(summary.totalCareAdditionalNeedRealEur[index]);
            lists.endWealthWithCareRealEur.push(summary.finalValueRealEur[index]);
            lists.bothCareYearsOverlapTriggered.push(summary.bothCareYears[index]);
            lists.maxAnnualCareAdditionalNeedRealEur.push(summary.maxAnnualCareAdditionalNeedRealEur[index]);
        } else {
            lists.endWealthNoCareRealEur.push(summary.finalValueRealEur[index]);
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
    let samplingDiagnostics = null;

    for (const chunk of chunks) {
        for (const field of MONTE_CARLO_COUNTER_FIELDS) totals[field] += chunk.totals[field];
        for (let row = 0; row < heatmap.length; row++) {
            for (let column = 0; column < heatmap[row].length; column++) {
                heatmap[row][column] += chunk.heatmap[row][column];
            }
        }
        allRealWithdrawalsSample.push(...chunk.allRealWithdrawalsSample);
        if (!samplingDiagnostics) {
            samplingDiagnostics = JSON.parse(JSON.stringify(chunk.samplingDiagnostics));
        } else {
            try {
                mergeMonteCarloSamplingDiagnosticsV1(samplingDiagnostics, chunk.samplingDiagnostics);
            } catch (error) {
                throw contractError(`sampling diagnostics cannot be merged: ${error?.message || String(error)}`);
            }
        }
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
        samplingDiagnostics,
        worstRun,
        worstRunCare,
        runMeta
    };
}
