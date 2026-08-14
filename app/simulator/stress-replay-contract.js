"use strict";

import {
    canonicalizeHistoricalContractValue,
    sha256Hex
} from './historical-backtest-contract.js';
import {
    isValidLiquidityRunwayYears,
    resolveLiquidityRunwayYears
} from '../../types/liquidity-runway-contract.js';
import {
    LONGEVITY_LIMITS,
    normalizeLongevityMode
} from './dynamic-flex-longevity-contract.js';
import { normalizeDecumulationMode } from './simulator-input-strategy.js';

export const STRESS_REPLAY_SCHEMA_VERSIONS = Object.freeze({
    path: 'StressReplayPathV1',
    variant: 'StressReplayVariantV1',
    variantResult: 'StressReplayVariantResultV1',
    comparison: 'StressReplayComparisonV1',
    comparisonExport: 'StressReplayComparisonExportV1'
});

export const STRESS_REPLAY_CONTRACT_VERSION = 'stress-replay-contract-v1';
export const STRESS_REPLAY_FINGERPRINT_ALGORITHM = 'sha256-canonical-json-v1';
export const STRESS_REPLAY_SCOPE = 'single-materialized-monte-carlo-path';
export const STRESS_REPLAY_LIMITS = Object.freeze({
    maximumPathBytes: 1024 * 1024,
    maximumEnvelopeBytes: 2 * 1024 * 1024,
    maximumAlternatives: 3,
    maximumVariants: 4
});

export const STRESS_REPLAY_UNITS_V1 = Object.freeze({
    equityReturnPct: 'percent_per_year',
    goldReturnPct: 'percent_per_year',
    cashReturnPct: 'percent_per_year',
    inflationPct: 'percent_per_year',
    wageGrowthPct: 'percent_per_year',
    capeRatio: 'ratio',
    monetaryValues: 'nominal_eur'
});

const THREE_BUCKET_MODE = '3_bucket_jilge';
const STANDARD_MODE = 'standard';
const HORIZON_METHODS = new Set(['mean', 'survival_quantile']);
const TERMINAL_STATUSES = new Set(['horizon_exhausted', 'all_dead', 'ruin']);
const RESULT_TERMINAL_STATUSES = new Set([...TERMINAL_STATUSES, 'technical_error']);
const RECORD_TYPES = new Set(['financial_year', 'terminal_ruin', 'terminal_death']);
const SOURCE_TIE_BREAK = 'smallest_absolute_run_index';
const FINGERPRINT_EXCLUDED_KEYS = new Set([
    'createdAtUtc',
    'updatedAtUtc',
    'exportedAtUtc',
    'displayName',
    'displayLabel',
    'label'
]);

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

function cloneValue(value, seen = new WeakMap()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) {
        throw new StressReplayContractError(
            'STRESS_REPLAY_CONTRACT_CYCLE',
            'Stress replay contract values must not contain cycles'
        );
    }
    const copy = Array.isArray(value) ? [] : {};
    seen.set(value, copy);
    for (const [key, child] of Object.entries(value)) copy[key] = cloneValue(child, seen);
    seen.delete(value);
    return copy;
}

export class StressReplayContractError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'StressReplayContractError';
        this.code = code;
        this.details = details && typeof details === 'object' ? details : {};
    }
}

function fail(code, message, details = {}) {
    throw new StressReplayContractError(code, message, details);
}

function requirePlainObject(value, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', `${path} must be an object`, { path });
    }
    return value;
}

function requireString(value, path) {
    if (typeof value !== 'string' || value.trim() === '') {
        fail('STRESS_REPLAY_CONTRACT_INVALID', `${path} must be a non-empty string`, { path });
    }
    return value;
}

function requireInteger(value, path, minimum = Number.MIN_SAFE_INTEGER) {
    if (!Number.isSafeInteger(value) || value < minimum) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', `${path} must be an integer >= ${minimum}`, { path, value });
    }
    return value;
}

function requireFinite(value, path, { minimum = -Infinity, maximum = Infinity, integer = false } = {}) {
    if (!Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value))) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', `${path} is outside its finite numeric domain`, {
            path,
            value,
            minimum,
            maximum,
            integer
        });
    }
    return value;
}

export function assertStressReplayFinite(value, path = 'value', seen = new WeakSet()) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
        fail('STRESS_REPLAY_NON_FINITE', `${path} must be finite`, { path, value: String(value) });
    }
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) fail('STRESS_REPLAY_CONTRACT_CYCLE', `${path} contains a cycle`, { path });
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
        assertStressReplayFinite(child, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`, seen);
    }
    seen.delete(value);
    return value;
}

function projectFingerprintValue(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) fail('STRESS_REPLAY_CONTRACT_CYCLE', 'Fingerprint input contains a cycle');
    seen.add(value);
    const projected = Array.isArray(value) ? [] : {};
    for (const [key, child] of Object.entries(value)) {
        if (!FINGERPRINT_EXCLUDED_KEYS.has(key)) projected[key] = projectFingerprintValue(child, seen);
    }
    seen.delete(value);
    return projected;
}

export function canonicalizeStressReplayValue(value) {
    assertStressReplayFinite(value);
    return canonicalizeHistoricalContractValue(value);
}

export function createStressReplayFingerprint(value) {
    assertStressReplayFinite(value);
    const projected = projectFingerprintValue(value);
    return deepFreeze({
        algorithm: STRESS_REPLAY_FINGERPRINT_ALGORITHM,
        value: sha256Hex(canonicalizeHistoricalContractValue(projected))
    });
}

export function assertStressReplaySize(value, maximumBytes, subject = 'value') {
    requireFinite(maximumBytes, 'maximumBytes', { minimum: 1, integer: true });
    assertStressReplayFinite(value, subject);
    const bytes = new TextEncoder().encode(canonicalizeHistoricalContractValue(value)).byteLength;
    if (bytes > maximumBytes) {
        fail('STRESS_REPLAY_PERSISTENCE_SIZE_LIMIT', `${subject} exceeds its size limit`, {
            subject,
            bytes,
            maximumBytes
        });
    }
    return bytes;
}

const field = (inputPath, contractPath, options) => deepFreeze({ inputPath, contractPath, ...options });

export const STRESS_REPLAY_VARIANT_WHITELIST_V1 = deepFreeze([
    field('liquidityRunwayYears', 'strategy.liquidityRunwayYears', { type: 'liquidity_runway_years' }),
    field('maxSkimPctOfEq', 'strategy.maxSkimPctOfEq', { type: 'finite_number' }),
    field('maxBearRefillPctOfEq', 'strategy.maxBearRefillPctOfEq', { type: 'finite_number' }),
    field('decumulation.mode', 'strategy.decumulation.mode', { type: 'decumulation_mode' }),
    field('decumulation.bondTargetFactor', 'strategy.decumulation.bondTargetFactor', { type: 'finite_number', minimum: 0, activeWhen: 'strategy.decumulation.mode=3_bucket_jilge' }),
    field('decumulation.drawdownTrigger', 'strategy.decumulation.drawdownTrigger', { type: 'finite_number', activeWhen: 'strategy.decumulation.mode=3_bucket_jilge' }),
    field('decumulation.bondRefillThreshold', 'strategy.decumulation.bondRefillThreshold', { type: 'finite_number', minimum: 0, activeWhen: 'strategy.decumulation.mode=3_bucket_jilge' }),
    field('dynamicFlex', 'strategy.dynamicFlex', { type: 'boolean' }),
    field('horizonMethod', 'strategy.horizonMethod', { type: 'enum', values: [...HORIZON_METHODS] }),
    field('horizonYears', 'strategy.horizonYears', { type: 'finite_number', minimum: 1, maximum: 60 }),
    field('survivalQuantile', 'strategy.survivalQuantile', { type: 'finite_number', minimum: 0.5, maximum: 0.99 }),
    field('goGoActive', 'strategy.goGoActive', { type: 'boolean' }),
    field('goGoMultiplier', 'strategy.goGoMultiplier', { type: 'finite_number', minimum: 1, maximum: 1.5 }),
    field('longevityMode', 'strategy.longevityMode', { type: 'longevity_mode' }),
    field('longevityQuantileShift', 'strategy.longevityQuantileShift', { type: 'finite_number', minimum: LONGEVITY_LIMITS.quantileShiftMin, maximum: LONGEVITY_LIMITS.quantileShiftMax, activeWhen: 'strategy.longevityMode=quantile_shift' }),
    field('longevityRelativePct', 'strategy.longevityRelativePct', { type: 'finite_number', minimum: LONGEVITY_LIMITS.relativePctMin, maximum: LONGEVITY_LIMITS.relativePctMax, activeWhen: 'strategy.longevityMode=relative_horizon_buffer' }),
    field('longevityBufferYears', 'strategy.longevityBufferYears', { type: 'finite_integer', minimum: LONGEVITY_LIMITS.bufferYearsMin, maximum: LONGEVITY_LIMITS.bufferYearsMax, activeWhen: 'strategy.longevityMode=buffer_years' })
]);

export const STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1 = Object.freeze([
    'strategy.goldAktiv',
    'strategy.goldZielProzent',
    'strategy.goldFloorProzent',
    'strategy.rebalancingBand',
    'strategy.goldSteuerfrei',
    'strategy.goldTargetPct',
    'strategy.minimumFlexAnnual',
    'strategy.flexBudgetAnnual',
    'strategy.flexBudgetYears',
    'strategy.flexBudgetRecharge',
    'strategy.tranchen'
]);

const WHITELIST_BY_CONTRACT_PATH = new Map(
    STRESS_REPLAY_VARIANT_WHITELIST_V1.map(descriptor => [descriptor.contractPath, descriptor])
);

function flattenLeaves(value, prefix = '', output = []) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value);
        if (keys.length === 0 && prefix) output.push([prefix, value]);
        for (const key of keys) flattenLeaves(value[key], prefix ? `${prefix}.${key}` : key, output);
    } else {
        output.push([prefix, value]);
    }
    return output;
}

function setPath(target, path, value) {
    const segments = path.split('.');
    let cursor = target;
    for (let index = 0; index < segments.length - 1; index++) {
        cursor[segments[index]] ??= {};
        cursor = cursor[segments[index]];
    }
    cursor[segments.at(-1)] = value;
}

function normalizeWhitelistedValue(value, descriptor) {
    const path = descriptor.contractPath;
    if (descriptor.type === 'boolean') {
        if (typeof value !== 'boolean') fail('STRESS_REPLAY_VARIANT_VALUE_INVALID', `${path} must be boolean`, { path, value });
        return value;
    }
    if (descriptor.type === 'enum') {
        if (!descriptor.values.includes(value)) {
            fail('STRESS_REPLAY_VARIANT_VALUE_INVALID', `${path} has an unsupported value`, { path, value, allowed: descriptor.values });
        }
        return value;
    }
    if (descriptor.type === 'decumulation_mode') return normalizeDecumulationMode(value);
    if (descriptor.type === 'longevity_mode') return normalizeLongevityMode(value);
    if (descriptor.type === 'liquidity_runway_years') {
        if (!isValidLiquidityRunwayYears(value)) {
            fail('STRESS_REPLAY_VARIANT_VALUE_INVALID', `${path} violates the liquidity runway contract`, { path, value });
        }
        return value;
    }
    return requireFinite(value, path, {
        minimum: descriptor.minimum,
        maximum: descriptor.maximum,
        integer: descriptor.type === 'finite_integer'
    });
}

/**
 * Validates an already contract-shaped patch. Conditional subfields are kept
 * only when their controlling mode is effective in this patch or baseline.
 */
export function normalizeStressReplayVariantPatch(patch, { baselineStrategy = {} } = {}) {
    requirePlainObject(patch, 'patch');
    assertStressReplayFinite(patch, 'patch');
    const leaves = flattenLeaves(patch);
    const forbidden = [...new Set(leaves
        .map(([path]) => path)
        .filter(path => !WHITELIST_BY_CONTRACT_PATH.has(path)))].sort();
    if (forbidden.length > 0) {
        fail('STRESS_REPLAY_VARIANT_FIELD_FORBIDDEN', 'Variant patch contains fields outside the V1 whitelist', {
            fields: forbidden
        });
    }

    const rawValues = new Map(leaves);
    const effectiveDecumulationMode = normalizeDecumulationMode(
        rawValues.get('strategy.decumulation.mode')
            ?? baselineStrategy.decumulation?.mode
            ?? STANDARD_MODE
    );
    const effectiveLongevityMode = normalizeLongevityMode(
        rawValues.get('strategy.longevityMode')
            ?? baselineStrategy.longevityMode
    );
    const normalized = {};
    for (const [path, value] of leaves) {
        const descriptor = WHITELIST_BY_CONTRACT_PATH.get(path);
        const inactiveDecumulationField = descriptor.activeWhen?.startsWith('strategy.decumulation.mode=')
            && effectiveDecumulationMode !== THREE_BUCKET_MODE;
        const activeLongevityMode = descriptor.activeWhen?.startsWith('strategy.longevityMode=')
            ? descriptor.activeWhen.slice(descriptor.activeWhen.indexOf('=') + 1)
            : null;
        if (inactiveDecumulationField || (activeLongevityMode && effectiveLongevityMode !== activeLongevityMode)) {
            continue;
        }
        setPath(normalized, path, normalizeWhitelistedValue(value, descriptor));
    }
    return deepFreeze(cloneValue(normalized));
}

/** Builds the exact replay strategy projection from getCommonInputs(). */
export function createStressReplayStrategySnapshot(inputs) {
    requirePlainObject(inputs, 'inputs');
    const runway = resolveLiquidityRunwayYears(inputs).years;
    const decumulationMode = inputs.decumulation?.mode;
    const longevityMode = inputs.longevityMode;
    const strategy = {
        liquidityRunwayYears: runway,
        maxSkimPctOfEq: inputs.maxSkimPctOfEq,
        maxBearRefillPctOfEq: inputs.maxBearRefillPctOfEq,
        decumulation: {
            mode: decumulationMode,
            bondTargetFactor: inputs.decumulation?.bondTargetFactor,
            drawdownTrigger: inputs.decumulation?.drawdownTrigger,
            bondRefillThreshold: inputs.decumulation?.bondRefillThreshold
        },
        dynamicFlex: inputs.dynamicFlex,
        horizonMethod: inputs.horizonMethod,
        horizonYears: inputs.horizonYears,
        survivalQuantile: inputs.survivalQuantile,
        goGoActive: inputs.goGoActive,
        goGoMultiplier: inputs.goGoMultiplier,
        longevityMode,
        longevityQuantileShift: inputs.longevityQuantileShift,
        longevityRelativePct: inputs.longevityRelativePct,
        longevityBufferYears: inputs.longevityBufferYears
    };
    const contractPatch = normalizeStressReplayVariantPatch({ strategy }, { baselineStrategy: strategy });
    const snapshot = cloneValue(contractPatch.strategy);
    snapshot.decumulation ??= {};
    snapshot.decumulation.mode = normalizeWhitelistedValue(decumulationMode, WHITELIST_BY_CONTRACT_PATH.get('strategy.decumulation.mode'));
    snapshot.longevityMode = normalizeWhitelistedValue(longevityMode, WHITELIST_BY_CONTRACT_PATH.get('strategy.longevityMode'));
    return deepFreeze(snapshot);
}

function validateFingerprint(value, path) {
    if (value?.algorithm !== STRESS_REPLAY_FINGERPRINT_ALGORITHM
        || typeof value?.value !== 'string'
        || !/^[a-f0-9]{64}$/.test(value.value)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', `${path} must be a canonical SHA-256 fingerprint`, { path });
    }
}

function validateInitialMarketHistory(history) {
    if (!Array.isArray(history) || history.length === 0) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'initialMarketDataHist must be a non-empty array', {
            path: 'path.initialMarketDataHist'
        });
    }
    assertStressReplayFinite(history, 'path.initialMarketDataHist');
}

function validateAnnualRecord(record, index) {
    const path = `path.years[${index}]`;
    requirePlainObject(record, path);
    requireInteger(record.yearIndex, `${path}.yearIndex`, 0);
    if (record.yearIndex !== index) {
        fail('STRESS_REPLAY_INDEX_BASIS_INVALID', `${path}.yearIndex must be zero-based and contiguous`, {
            path: `${path}.yearIndex`,
            expected: index,
            actual: record.yearIndex
        });
    }
    if (!RECORD_TYPES.has(record.recordType) || typeof record.financiallyEvaluable !== 'boolean') {
        fail('STRESS_REPLAY_CONTRACT_INVALID', `${path} has an invalid record type or evaluability marker`, { path });
    }
    const expectedFinanciallyEvaluable = record.recordType === 'financial_year';
    if (record.financiallyEvaluable !== expectedFinanciallyEvaluable) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', `${path} evaluability conflicts with recordType`, { path });
    }
    if (record.financiallyEvaluable) {
        for (const key of ['equityReturnPct', 'goldReturnPct', 'cashReturnPct', 'inflationPct', 'wageGrowthPct', 'capeRatio']) {
            requireFinite(record[key], `${path}.${key}`);
        }
        requireString(record.regime, `${path}.regime`);
    }
    for (const key of ['stressEvents', 'tailRiskEvents', 'householdEvents']) {
        if (!Array.isArray(record[key])) fail('STRESS_REPLAY_CONTRACT_INVALID', `${path}.${key} must be an array`, { path: `${path}.${key}` });
    }
    assertStressReplayFinite(record, path);
}

export function validateStressReplayPathV1(path) {
    requirePlainObject(path, 'path');
    if (path.schemaVersion !== STRESS_REPLAY_SCHEMA_VERSIONS.path
        || path.contractVersion !== STRESS_REPLAY_CONTRACT_VERSION
        || path.scope !== STRESS_REPLAY_SCOPE) {
        fail('STRESS_REPLAY_VERSION_UNSUPPORTED', 'Unsupported stress replay path contract', {
            schemaVersion: path.schemaVersion,
            contractVersion: path.contractVersion,
            scope: path.scope
        });
    }
    const source = requirePlainObject(path.source, 'path.source');
    validateFingerprint(source.requestFingerprint, 'path.source.requestFingerprint');
    requireFinite(source.seed, 'path.source.seed', { minimum: 0, maximum: 0xFFFFFFFF, integer: true });
    if (source.rngMode !== 'per-run-seed') {
        fail('STRESS_REPLAY_SOURCE_UNSUPPORTED', 'Only per-run-seed Monte Carlo sources are replayable', { rngMode: source.rngMode });
    }
    requireInteger(source.absoluteRunIndex, 'path.source.absoluteRunIndex', 0);
    requireInteger(source.displayRunNumber, 'path.source.displayRunNumber', 1);
    if (source.displayRunNumber !== source.absoluteRunIndex + 1) {
        fail('STRESS_REPLAY_INDEX_BASIS_INVALID', 'displayRunNumber must equal absoluteRunIndex + 1', {
            absoluteRunIndex: source.absoluteRunIndex,
            displayRunNumber: source.displayRunNumber
        });
    }
    requireString(source.scenarioKey, 'path.source.scenarioKey');
    requireString(source.selectionMetric, 'path.source.selectionMetric');
    if (source.tieBreak !== SOURCE_TIE_BREAK) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'path.source.tieBreak is unsupported', {
            path: 'path.source.tieBreak',
            expected: SOURCE_TIE_BREAK,
            actual: source.tieBreak
        });
    }
    if (typeof path.breakOnRuin !== 'boolean') {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'path.breakOnRuin must be boolean', { path: 'path.breakOnRuin' });
    }
    validateFingerprint(path.dataFingerprint, 'path.dataFingerprint');
    validateFingerprint(path.engineFingerprint, 'path.engineFingerprint');
    requirePlainObject(path.units, 'path.units');
    for (const [key, unit] of Object.entries(STRESS_REPLAY_UNITS_V1)) {
        if (path.units[key] !== unit) {
            fail('STRESS_REPLAY_CONTRACT_INVALID', `path.units.${key} is unsupported`, {
                path: `path.units.${key}`,
                expected: unit,
                actual: path.units[key]
            });
        }
    }
    requireInteger(path.horizonYears, 'path.horizonYears', 1);
    requireInteger(path.effectiveLength, 'path.effectiveLength', 1);
    if (!TERMINAL_STATUSES.has(path.terminalStatus)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'path.terminalStatus is unsupported', { terminalStatus: path.terminalStatus });
    }
    validateInitialMarketHistory(path.initialMarketDataHist);
    if (!Array.isArray(path.years) || path.years.length !== path.effectiveLength || path.effectiveLength > path.horizonYears) {
        fail('STRESS_REPLAY_LENGTH_MISMATCH', 'Path lengths do not reconcile', {
            horizonYears: path.horizonYears,
            effectiveLength: path.effectiveLength,
            yearCount: Array.isArray(path.years) ? path.years.length : null
        });
    }
    path.years.forEach(validateAnnualRecord);
    requirePlainObject(path.reconciliation, 'path.reconciliation');
    if (path.reconciliation.sourcePrefixMatched !== true) {
        fail('STRESS_REPLAY_RECONCILIATION_FAILED', 'Source prefix reconciliation must pass before a path is accepted');
    }
    assertStressReplayFinite(path, 'path');
    assertStressReplaySize(path, STRESS_REPLAY_LIMITS.maximumPathBytes, 'path');
    return deepFreeze(cloneValue(path));
}

export const assertStressReplayPathV1 = validateStressReplayPathV1;

export function createStressReplayPathFingerprint(path) {
    requirePlainObject(path, 'path');
    const { pathFingerprint: _pathFingerprint, ...fingerprintBasis } = path;
    return createStressReplayFingerprint(fingerprintBasis);
}

export function validateStressReplayVariantResultV1(result) {
    requirePlainObject(result, 'result');
    if (result.schemaVersion !== STRESS_REPLAY_SCHEMA_VERSIONS.variantResult) {
        fail('STRESS_REPLAY_VERSION_UNSUPPORTED', 'Unsupported stress replay variant result contract', {
            schemaVersion: result.schemaVersion
        });
    }
    for (const key of [
        'pathFingerprint',
        'baselineScenarioFingerprint',
        'variantFingerprint',
        'resultFingerprint'
    ]) validateFingerprint(result[key], `result.${key}`);
    if (!RESULT_TERMINAL_STATUSES.has(result.terminalStatus)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'result.terminalStatus is unsupported', {
            terminalStatus: result.terminalStatus
        });
    }
    if (!Array.isArray(result.yearResults) || !Array.isArray(result.transactions)
        || !Array.isArray(result.missingness) || !Array.isArray(result.warnings)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Stress replay result collections are invalid');
    }
    if (result.terminalStatus === 'technical_error') {
        requirePlainObject(result.technicalError, 'result.technicalError');
        if (result.summary !== null || result.reconciliation?.matched === true) {
            fail('STRESS_REPLAY_CONTRACT_INVALID', 'Technical errors must not expose reconciled financial summaries');
        }
    } else {
        requirePlainObject(result.summary, 'result.summary');
        if (result.technicalError !== null) {
            fail('STRESS_REPLAY_CONTRACT_INVALID', 'Financial results must not contain a technical error');
        }
    }
    assertStressReplayFinite(result, 'result');
    return deepFreeze(cloneValue(result));
}

export const assertStressReplayVariantResultV1 = validateStressReplayVariantResultV1;
