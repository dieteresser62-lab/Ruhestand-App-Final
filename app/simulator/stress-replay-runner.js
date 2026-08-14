"use strict";

import {
    STRESS_REPLAY_SCHEMA_VERSIONS,
    StressReplayContractError,
    createStressReplayFingerprint,
    createStressReplayPathFingerprint,
    validateStressReplayPathV1,
    validateStressReplayVariantResultV1
} from './stress-replay-contract.js';
import {
    initMcRunState,
    resolveSimulatorCumulativeInflationFactor,
    simulateOneYear
} from './simulator-engine-wrapper.js';
import { computeRentAdjRate, sumDepot } from './simulator-portfolio.js';
import { resolveDynamicFlexRunnerHorizon } from './dynamic-flex-runner-horizon.js';
import {
    buildStressReplayLifeLogContext,
    buildStressReplayLogRow,
    buildStressReplayYearData
} from './mc-log-builder.js';
import { projectScenarioLogV2 } from './monte-carlo-export.js';
import { applyStressReplayVariantV1 } from './stress-replay-variant.js';

export const STRESS_REPLAY_RUNNER_VERSION = 'StressReplayRunnerV1';
export const STRESS_REPLAY_BASELINE_VARIANT_ID = 'baseline';

const MONEY_RECONCILIATION_FIELDS = Object.freeze([
    'wertAktien', 'wertGold', 'liquiditaet', 'floor_brutto', 'rente1', 'rente2',
    'renteSum', 'flex_erfuellt_nominal', 'jahresentnahme_real'
]);
const RATIO_RECONCILIATION_FIELDS = Object.freeze([
    'inflation', 'FlexRatePct', 'QuoteEndPct', 'RealReturnEquityPct', 'RealReturnGoldPct'
]);

export class StressReplayRunnerError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'StressReplayRunnerError';
        this.code = code;
        this.details = details;
    }
}

function fail(code, message, details = {}) {
    throw new StressReplayRunnerError(code, message, details);
}

function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function portfolioTotal(portfolio = {}) {
    return sumDepot({
        depotTranchesAktien: portfolio.depotTranchesAktien || [],
        depotTranchesGold: portfolio.depotTranchesGold || []
    }) + (Number(portfolio.liquiditaet) || 0) + (Number(portfolio.healthBucketGeldmarkt) || 0);
}

function normalizeSourceRows(sourceScenarioLog) {
    const rows = Array.isArray(sourceScenarioLog)
        ? sourceScenarioLog
        : sourceScenarioLog?.records;
    if (!Array.isArray(rows)) {
        fail('STRESS_REPLAY_RECONCILIATION_SOURCE_MISSING', 'Source scenario log rows are required.');
    }
    return rows;
}

function readHouseholdEvent(record) {
    const event = record.householdEvents.find(candidate => candidate?.type === 'household_state');
    if (!event) {
        fail('STRESS_REPLAY_HOUSEHOLD_EVENT_MISSING', 'A materialized household state is required.', {
            yearIndex: record.yearIndex
        });
    }
    return event;
}

function normalizeTechnicalError(error, yearIndex) {
    return {
        code: String(error?.code || 'STRESS_REPLAY_TECHNICAL_ERROR'),
        message: String(error?.message || 'The stress replay year failed technically.'),
        yearIndex
    };
}

function numericMismatch(actual, expected, tolerance) {
    return !Number.isFinite(Number(actual))
        || !Number.isFinite(Number(expected))
        || Math.abs(Number(actual) - Number(expected)) > tolerance;
}

function reconcileRows(generatedRows, sourceRows, path) {
    const prefixLength = path.reconciliation.sourcePrefixLength ?? sourceRows.length;
    if (generatedRows.length < prefixLength || sourceRows.length < prefixLength) {
        fail('STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED', 'Baseline source prefix length is incomplete.', {
            expectedPrefixLength: prefixLength,
            generatedLength: generatedRows.length,
            sourceLength: sourceRows.length
        });
    }
    const tolerances = path.reconciliation.tolerances || {};
    const monetary = Number.isFinite(tolerances.monetaryEur) ? tolerances.monetaryEur : 0.01;
    const ratio = Number.isFinite(tolerances.ratio) ? tolerances.ratio : 1e-9;
    const mismatches = [];
    for (let index = 0; index < prefixLength; index++) {
        const actual = generatedRows[index];
        const expected = sourceRows[index];
        for (const field of ['recordType', 'jahr', 'histJahr']) {
            if (expected?.[field] !== undefined && actual?.[field] !== expected[field]) {
                mismatches.push({ index, field, actual: actual?.[field] ?? null, expected: expected[field] });
            }
        }
        for (const field of MONEY_RECONCILIATION_FIELDS) {
            if (expected?.[field] !== undefined && numericMismatch(actual?.[field], expected[field], monetary)) {
                mismatches.push({ index, field, actual: actual?.[field] ?? null, expected: expected[field] });
            }
        }
        for (const field of RATIO_RECONCILIATION_FIELDS) {
            if (expected?.[field] !== undefined && numericMismatch(actual?.[field], expected[field], ratio)) {
                mismatches.push({ index, field, actual: actual?.[field] ?? null, expected: expected[field] });
            }
        }
        const actualWithdrawal = actual?.entscheidung?.jahresEntnahme;
        const expectedWithdrawal = expected?.entscheidung?.jahresEntnahme;
        if (expectedWithdrawal !== undefined && numericMismatch(actualWithdrawal, expectedWithdrawal, monetary)) {
            mismatches.push({ index, field: 'entscheidung.jahresEntnahme', actual: actualWithdrawal ?? null, expected: expectedWithdrawal });
        }
    }
    if (mismatches.length > 0) {
        fail('STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED', 'Baseline replay differs from its source scenario.', {
            prefixLength,
            mismatches
        });
    }
    return { matched: true, prefixLength, tolerances: { monetaryEur: monetary, ratio } };
}

function computeMaxDrawdown(values) {
    let peak = -Infinity;
    let maximum = 0;
    for (const value of values) {
        if (!Number.isFinite(value)) continue;
        peak = Math.max(peak, value);
        if (peak > 0) maximum = Math.max(maximum, ((peak - value) / peak) * 100);
    }
    return maximum;
}

function createFingerprintBasis(result) {
    const { resultFingerprint: _resultFingerprint, ...basis } = result;
    return basis;
}

function finalizeResult(result) {
    const withFingerprint = {
        ...result,
        resultFingerprint: createStressReplayFingerprint(createFingerprintBasis(result))
    };
    return validateStressReplayVariantResultV1(withFingerprint);
}

function technicalResult({
    pathFingerprint,
    baselineScenarioFingerprint,
    variantFingerprint,
    variantId,
    role,
    warnings,
    error,
    yearIndex
}) {
    return finalizeResult({
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.variantResult,
        runnerVersion: STRESS_REPLAY_RUNNER_VERSION,
        variantId,
        role,
        pathFingerprint,
        baselineScenarioFingerprint,
        variantFingerprint,
        terminalStatus: 'technical_error',
        summary: null,
        yearResults: [],
        scenarioLog: null,
        transactions: [],
        missingness: [{ code: 'technical_error', yearIndex }],
        warnings,
        technicalError: normalizeTechnicalError(error, yearIndex),
        reconciliation: { matched: false, reason: 'technical_error' }
    });
}

/**
 * Runs one materialized path through the existing year engine. The function is
 * deliberately DOM-, Worker-, RNG- and sampling-free.
 */
export function runStressReplayPathV1({
    path,
    baselineInputs,
    sourceScenarioLog,
    variant = null,
    engine = null,
    dependencies = {}
}) {
    const validatedPath = validateStressReplayPathV1(path);
    const frozenInputFingerprint = createStressReplayFingerprint(baselineInputs);
    const role = variant?.role || 'baseline';
    const variantId = variant?.id || STRESS_REPLAY_BASELINE_VARIANT_ID;
    const warnings = cloneValue(variant?.warnings || []);
    const variantFingerprint = variant?.variantFingerprint
        || createStressReplayFingerprint({ role: 'baseline', patch: {} });
    const inputs = variant
        ? cloneValue(applyStressReplayVariantV1({ baselineInputs, variant }))
        : cloneValue(baselineInputs);
    const normalizedInputFingerprint = createStressReplayFingerprint(inputs);
    const sourceRows = role === 'baseline' ? normalizeSourceRows(sourceScenarioLog) : null;
    const pathFingerprint = createStressReplayPathFingerprint(validatedPath);
    if (validatedPath.pathFingerprint && validatedPath.pathFingerprint.value !== pathFingerprint.value) {
        fail('STRESS_REPLAY_PATH_FINGERPRINT_MISMATCH', 'The stress replay path fingerprint does not match its contents.');
    }
    const initialize = dependencies.initMcRunState || initMcRunState;
    const runYear = dependencies.simulateOneYear || simulateOneYear;
    let state;
    try {
        state = initialize(inputs, validatedPath.source.startYearIndex);
        state.marketDataHist = cloneValue(validatedPath.initialMarketDataHist[0]);
    } catch (error) {
        return technicalResult({
            pathFingerprint,
            baselineScenarioFingerprint: frozenInputFingerprint,
            variantFingerprint,
            variantId,
            role,
            warnings,
            error,
            yearIndex: 0
        });
    }

    const initialValue = portfolioTotal(state.portfolio);
    const nominalValues = [initialValue];
    const realValues = [initialValue];
    const yearResults = [];
    const logRows = [];
    let totalTaxesEur = 0;
    let totalWithdrawalsEur = 0;
    let terminalStatus = null;
    let previousDynamicHorizon = null;
    let wasJointAliveAtPreviousHorizon = inputs.partner?.aktiv === true;
    let longevityTransitionStartYear = null;
    let longevityTransitionAnchorHorizon = null;

    for (const record of validatedPath.years) {
        const household = readHouseholdEvent(record);
        const lifeLogContext = buildStressReplayLifeLogContext(record);
        if (record.recordType === 'terminal_death') {
            logRows.push(buildStressReplayLogRow({
                record,
                inputs,
                portfolioSnapshot: state.portfolio,
                currentRunLogLength: logRows.length
            }));
            terminalStatus = 'all_dead';
            break;
        }

        const yearData = buildStressReplayYearData(record);
        const p1Alive = household.p1Alive === true || household.p1Alive === 1;
        const hasPartner = household.p2Alive !== null && household.p2Alive !== undefined;
        const p2Alive = hasPartner && (household.p2Alive === true || household.p2Alive === 1);
        const ageP1 = Number(inputs.startAlter) + record.yearIndex;
        const ageP2 = hasPartner ? Number(inputs.partner?.startAlter) + record.yearIndex : ageP1;
        const jointAliveThisYear = hasPartner && p1Alive && p2Alive;
        if (wasJointAliveAtPreviousHorizon && !jointAliveThisYear && Number.isFinite(previousDynamicHorizon)) {
            longevityTransitionStartYear = record.yearIndex;
            longevityTransitionAnchorHorizon = previousDynamicHorizon;
        } else if (jointAliveThisYear) {
            longevityTransitionStartYear = null;
            longevityTransitionAnchorHorizon = null;
        }
        const horizonResolution = resolveDynamicFlexRunnerHorizon(inputs, {
            yearIndex: record.yearIndex,
            ageP1,
            ageP2,
            p1Alive,
            p2Alive,
            applyTransitionSmoothing: longevityTransitionStartYear !== null,
            previousHorizon: longevityTransitionAnchorHorizon,
            yearsSinceTransition: longevityTransitionStartYear === null ? 0 : record.yearIndex - longevityTransitionStartYear
        });
        const adjustedInputs = {
            ...inputs,
            rentAdjPct: computeRentAdjRate(inputs, yearData),
            transitionYear: household.effectiveTransitionYear ?? inputs.transitionYear ?? 0,
            capeRatio: record.capeRatio,
            marketCapeRatio: record.capeRatio,
            horizonYears: horizonResolution.horizonYears,
            ...(horizonResolution.diagnostics?.longevityMode !== 'none'
                ? { longevityHorizonDiagnostics: horizonResolution.diagnostics }
                : {})
        };
        previousDynamicHorizon = horizonResolution.horizonYears;
        wasJointAliveAtPreviousHorizon = jointAliveThisYear;
        const householdContext = {
            p1Alive,
            p2Alive,
            widowBenefits: {
                p1FromP2: household.widowBenefitActiveForP1 === true,
                p2FromP1: household.widowBenefitActiveForP2 === true,
                p1FromP2Percent: Number(inputs.widowOptions?.percent) || 0,
                p2FromP1Percent: Number(inputs.widowOptions?.percent) || 0
            },
            care: {
                p1: cloneValue(household.careMetaP1),
                p2: cloneValue(household.careMetaP2)
            }
        };
        let result;
        try {
            result = runYear(
                { ...state },
                adjustedInputs,
                yearData,
                record.yearIndex,
                cloneValue(household.careMetaP1),
                Number(household.totalCareFloorEur) || 0,
                householdContext,
                Number.isFinite(Number(household.effectiveFlexFactor)) ? Number(household.effectiveFlexFactor) : 1,
                engine
            );
        } catch (error) {
            return technicalResult({
                pathFingerprint,
                baselineScenarioFingerprint: frozenInputFingerprint,
                variantFingerprint,
                variantId,
                role,
                warnings,
                error,
                yearIndex: record.yearIndex
            });
        }
        const flagsConflict = (result?.kind === 'success' && result?.isRuin === true)
            || (result?.kind === 'ruin' && result?.isRuin === false);
        if (flagsConflict || result?.kind === 'technical_error' || result?.error) {
            const error = flagsConflict
                ? { code: 'MC_TERMINAL_FLAGS_CONFLICT', message: 'The year adapter returned conflicting terminal flags.' }
                : result?.error || result;
            return technicalResult({
                pathFingerprint,
                baselineScenarioFingerprint: frozenInputFingerprint,
                variantFingerprint,
                variantId,
                role,
                warnings,
                error,
                yearIndex: record.yearIndex
            });
        }
        if (result?.kind === 'ruin' || result?.isRuin === true) {
            logRows.push(buildStressReplayLogRow({ record, result, inputs }));
            terminalStatus = 'ruin';
            nominalValues.push(0);
            realValues.push(0);
            yearResults.push({
                yearIndex: record.yearIndex,
                historicalYear: record.historicalYear,
                status: 'ruin',
                nominalValueEur: 0,
                realValueEur: 0
            });
            break;
        }
        if (!result?.newState?.portfolio || !result?.logData) {
            return technicalResult({
                pathFingerprint,
                baselineScenarioFingerprint: frozenInputFingerprint,
                variantFingerprint,
                variantId,
                role,
                warnings,
                error: { code: 'SIMULATOR_RESULT_SHAPE_INVALID', message: 'The year adapter returned an invalid result shape.' },
                yearIndex: record.yearIndex
            });
        }
        state = result.newState;
        const nominalValueEur = portfolioTotal(state.portfolio);
        const inflationFactor = resolveSimulatorCumulativeInflationFactor(state);
        const realValueEur = nominalValueEur / inflationFactor;
        const withdrawalEur = Number(result.logData?.entscheidung?.jahresEntnahme) || 0;
        totalTaxesEur += Number(result.totalTaxesThisYear) || 0;
        totalWithdrawalsEur += withdrawalEur;
        nominalValues.push(nominalValueEur);
        realValues.push(realValueEur);
        logRows.push(buildStressReplayLogRow({ record, result, inputs }));
        yearResults.push({
            yearIndex: record.yearIndex,
            historicalYear: record.historicalYear,
            status: 'financial_year',
            nominalValueEur,
            realValueEur,
            withdrawalEur,
            taxEur: Number(result.totalTaxesThisYear) || 0,
            p1Alive: lifeLogContext.p1Alive,
            p2Alive: lifeLogContext.hasPartner ? lifeLogContext.p2Alive : null
        });
    }

    terminalStatus ??= 'horizon_exhausted';
    if (role === 'baseline' && terminalStatus !== validatedPath.terminalStatus) {
        fail('STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED', 'Baseline terminal status differs from the source path.', {
            expected: validatedPath.terminalStatus,
            actual: terminalStatus
        });
    }
    const reconciliation = role === 'baseline'
        ? reconcileRows(logRows, sourceRows, validatedPath)
        : { matched: false, reason: 'alternative_not_source_reconciled' };
    const inputFingerprintAfter = createStressReplayFingerprint(baselineInputs);
    if (inputFingerprintAfter.value !== frozenInputFingerprint.value) {
        fail('STRESS_REPLAY_BASELINE_INPUT_MUTATED', 'Baseline inputs changed during replay.');
    }
    const normalizedInputFingerprintAfter = createStressReplayFingerprint(inputs);
    if (normalizedInputFingerprintAfter.value !== normalizedInputFingerprint.value) {
        fail('STRESS_REPLAY_VARIANT_INPUT_MUTATED', 'Normalized variant inputs changed during replay.');
    }
    const finalValueNominalEur = terminalStatus === 'ruin' ? 0 : portfolioTotal(state.portfolio);
    const finalValueRealEur = terminalStatus === 'ruin'
        ? 0
        : finalValueNominalEur / resolveSimulatorCumulativeInflationFactor(state);
    return finalizeResult({
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.variantResult,
        runnerVersion: STRESS_REPLAY_RUNNER_VERSION,
        variantId,
        role,
        pathFingerprint,
        baselineScenarioFingerprint: frozenInputFingerprint,
        variantFingerprint,
        terminalStatus,
        summary: {
            finalValueNominalEur,
            finalValueRealEur,
            maximumDrawdownNominalPct: computeMaxDrawdown(nominalValues),
            maximumDrawdownRealPct: computeMaxDrawdown(realValues),
            totalWithdrawalsEur,
            totalTaxesEur,
            financiallyEvaluatedYears: yearResults.filter(year => year.status === 'financial_year').length,
            ruinYear: terminalStatus === 'ruin' ? yearResults.at(-1)?.yearIndex ?? null : null
        },
        yearResults,
        scenarioLog: projectScenarioLogV2(logRows),
        transactions: [],
        missingness: [],
        warnings,
        technicalError: null,
        reconciliation
    });
}

export const runStressReplayBaselineV1 = runStressReplayPathV1;

export function runStressReplayVariantV1(options) {
    if (!options?.variant || options.variant.role !== 'alternative') {
        fail('STRESS_REPLAY_VARIANT_REQUIRED', 'runStressReplayVariantV1 requires an alternative variant');
    }
    return runStressReplayPathV1(options);
}

export function isStressReplayContractFailure(error) {
    return error instanceof StressReplayContractError || error instanceof StressReplayRunnerError;
}
