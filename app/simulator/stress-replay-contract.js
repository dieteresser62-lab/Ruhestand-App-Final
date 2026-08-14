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
    comparisonExport: 'StressReplayComparisonExportV1',
    workspace: 'StressReplayWorkspaceV1'
});

export const STRESS_REPLAY_CONTRACT_VERSION = 'stress-replay-contract-v1';
export const STRESS_REPLAY_VARIANT_WHITELIST_VERSION = 'StressReplayVariantWhitelistV1';
export const STRESS_REPLAY_VARIANT_CONTRACT_KEYS_V1 = Object.freeze([
    'schemaVersion',
    'contractVersion',
    'whitelistVersion',
    'id',
    'role',
    'label',
    'baselineScenarioFingerprint',
    'patch',
    'normalizedInputFingerprint',
    'materialChangeGroups',
    'warnings',
    'variantFingerprint'
]);
export const STRESS_REPLAY_FINGERPRINT_ALGORITHM = 'sha256-canonical-json-v1';
export const STRESS_REPLAY_SCOPE = 'single-materialized-monte-carlo-path';
export const STRESS_REPLAY_LIMITS = Object.freeze({
    maximumPathBytes: 1024 * 1024,
    maximumEnvelopeBytes: 2 * 1024 * 1024,
    maximumAlternatives: 3,
    maximumVariants: 4
});

export const STRESS_REPLAY_COMPARISON_KPIS_V1 = Object.freeze([
    Object.freeze({ field: 'finalValueNominalEur', unit: 'nominal_eur' }),
    Object.freeze({ field: 'finalValueRealEur', unit: 'real_eur' }),
    Object.freeze({ field: 'maximumDrawdownNominalPct', unit: 'percentage_points' }),
    Object.freeze({ field: 'maximumDrawdownRealPct', unit: 'percentage_points' }),
    Object.freeze({ field: 'totalWithdrawalsEur', unit: 'nominal_eur' }),
    Object.freeze({ field: 'totalFlexFulfilledEur', unit: 'nominal_eur' }),
    Object.freeze({ field: 'totalMinimumFlexShortfallEur', unit: 'nominal_eur' }),
    Object.freeze({ field: 'totalTaxesEur', unit: 'nominal_eur' }),
    Object.freeze({ field: 'totalHealthBucketUsedEur', unit: 'nominal_eur' }),
    Object.freeze({ field: 'financiallyEvaluatedYears', unit: 'years' }),
    Object.freeze({ field: 'ruinYear', unit: 'zero_based_year_index' })
]);

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

export function createStressReplayVariantFingerprint(variant) {
    requirePlainObject(variant, 'variant');
    const fingerprintBasis = Object.fromEntries(
        STRESS_REPLAY_VARIANT_CONTRACT_KEYS_V1
            .filter(key => key !== 'label' && key !== 'variantFingerprint')
            .filter(key => Object.hasOwn(variant, key))
            .map(key => [key, variant[key]])
    );
    return createStressReplayFingerprint(fingerprintBasis);
}

export function validateStressReplayVariantV1(variant) {
    requirePlainObject(variant, 'variant');
    const allowedKeys = new Set(STRESS_REPLAY_VARIANT_CONTRACT_KEYS_V1);
    const unknownKeys = Object.keys(variant).filter(key => !allowedKeys.has(key)).sort();
    if (unknownKeys.length > 0) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Variant contains unknown contract fields', {
            fields: unknownKeys
        });
    }
    if (variant.schemaVersion !== STRESS_REPLAY_SCHEMA_VERSIONS.variant
        || variant.contractVersion !== STRESS_REPLAY_CONTRACT_VERSION
        || variant.whitelistVersion !== STRESS_REPLAY_VARIANT_WHITELIST_VERSION) {
        fail('STRESS_REPLAY_VERSION_UNSUPPORTED', 'Unsupported stress replay variant contract', {
            schemaVersion: variant.schemaVersion,
            contractVersion: variant.contractVersion,
            whitelistVersion: variant.whitelistVersion
        });
    }
    requireString(variant.id, 'variant.id');
    requireString(variant.label, 'variant.label');
    if (variant.role !== 'baseline' && variant.role !== 'alternative') {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'variant.role must be baseline or alternative', {
            path: 'variant.role',
            role: variant.role
        });
    }
    if ((variant.role === 'baseline' && variant.id !== 'baseline')
        || (variant.role === 'alternative' && variant.id === 'baseline')) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'The baseline id is reserved for the baseline variant', {
            path: 'variant.id'
        });
    }
    validateFingerprint(variant.baselineScenarioFingerprint, 'variant.baselineScenarioFingerprint');
    validateFingerprint(variant.normalizedInputFingerprint, 'variant.normalizedInputFingerprint');
    validateFingerprint(variant.variantFingerprint, 'variant.variantFingerprint');
    const expectedVariantFingerprint = createStressReplayVariantFingerprint(variant);
    if (expectedVariantFingerprint.value !== variant.variantFingerprint.value) {
        fail('STRESS_REPLAY_VARIANT_FINGERPRINT_MISMATCH', 'Variant fingerprint does not match its contents');
    }
    const normalizedPatch = normalizeStressReplayVariantPatch(variant.patch);
    if (canonicalizeHistoricalContractValue(normalizedPatch)
        !== canonicalizeHistoricalContractValue(variant.patch)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Variant patch must already be canonically normalized', {
            path: 'variant.patch'
        });
    }
    const patchLeaves = flattenLeaves(normalizedPatch);
    if (variant.role === 'baseline' && patchLeaves.length !== 0) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'The baseline variant must have an empty patch', {
            path: 'variant.patch'
        });
    }
    if (variant.role === 'alternative' && patchLeaves.length === 0) {
        fail('STRESS_REPLAY_VARIANT_NO_OP', 'An alternative variant must contain a material change');
    }
    if (!Array.isArray(variant.materialChangeGroups) || !Array.isArray(variant.warnings)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Variant diagnostics must be arrays');
    }
    const expectedGroups = [...new Set(patchLeaves.map(([path]) => {
        if (path.startsWith('strategy.decumulation.')) return 'decumulation';
        if (path === 'strategy.longevityMode' || path.startsWith('strategy.longevity')) return 'longevity';
        return path.replace(/^strategy\./, '');
    }))].sort();
    if (canonicalizeHistoricalContractValue(variant.materialChangeGroups)
        !== canonicalizeHistoricalContractValue(expectedGroups)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Variant material-change groups do not match its patch');
    }
    const expectedWarnings = expectedGroups.length > 1
        ? [{
            code: 'STRESS_REPLAY_MULTI_FACTOR_VARIANT',
            factorCount: expectedGroups.length,
            factorGroups: expectedGroups
        }]
        : [];
    if (canonicalizeHistoricalContractValue(variant.warnings)
        !== canonicalizeHistoricalContractValue(expectedWarnings)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Variant warnings do not match its material changes');
    }
    if (variant.role === 'baseline' && variant.materialChangeGroups.length !== 0) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'The baseline variant must not report material changes');
    }
    if (variant.role === 'baseline'
        && variant.normalizedInputFingerprint.value !== variant.baselineScenarioFingerprint.value) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Baseline normalized inputs must match the baseline scenario');
    }
    assertStressReplayFinite(variant, 'variant');
    return deepFreeze(cloneValue({ ...variant, patch: normalizedPatch }));
}

export const assertStressReplayVariantV1 = validateStressReplayVariantV1;

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

function comparisonFingerprintBasis(comparison) {
    const { comparisonFingerprint: _comparisonFingerprint, ...basis } = comparison;
    return basis;
}

export function createStressReplayComparisonFingerprint(comparison) {
    requirePlainObject(comparison, 'comparison');
    return createStressReplayFingerprint(comparisonFingerprintBasis(comparison));
}

export function validateStressReplayComparisonV1(comparison) {
    requirePlainObject(comparison, 'comparison');
    const allowedKeys = new Set([
        'schemaVersion',
        'comparisonVersion',
        'baselineId',
        'pathFingerprint',
        'baselineScenarioFingerprint',
        'variantOrder',
        'variants',
        'pairwise',
        'overallStatus',
        'financialRankingAllowed',
        'interpretation',
        'comparisonFingerprint'
    ]);
    const unknownKeys = Object.keys(comparison).filter(key => !allowedKeys.has(key)).sort();
    if (unknownKeys.length > 0) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Comparison contains unknown contract fields', {
            fields: unknownKeys
        });
    }
    if (comparison.schemaVersion !== STRESS_REPLAY_SCHEMA_VERSIONS.comparison
        || comparison.comparisonVersion !== STRESS_REPLAY_SCHEMA_VERSIONS.comparison) {
        fail('STRESS_REPLAY_VERSION_UNSUPPORTED', 'Unsupported stress replay comparison contract', {
            schemaVersion: comparison.schemaVersion,
            comparisonVersion: comparison.comparisonVersion
        });
    }
    if (comparison.baselineId !== 'baseline') {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Stress replay comparison must use the reserved baseline id');
    }
    validateFingerprint(comparison.pathFingerprint, 'comparison.pathFingerprint');
    validateFingerprint(comparison.baselineScenarioFingerprint, 'comparison.baselineScenarioFingerprint');
    validateFingerprint(comparison.comparisonFingerprint, 'comparison.comparisonFingerprint');
    if (!Array.isArray(comparison.variantOrder)
        || !Array.isArray(comparison.variants)
        || !Array.isArray(comparison.pairwise)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Stress replay comparison collections are invalid');
    }
    if (comparison.variantOrder.length < 1
        || comparison.variantOrder.length > STRESS_REPLAY_LIMITS.maximumVariants
        || comparison.variantOrder[0] !== 'baseline'
        || new Set(comparison.variantOrder).size !== comparison.variantOrder.length) {
        fail('STRESS_REPLAY_VARIANT_LIMIT_EXCEEDED', 'Stress replay comparison variant order is invalid');
    }
    const expectedAlternativeOrder = comparison.variantOrder.slice(1).sort((left, right) => left.localeCompare(right));
    if (canonicalizeHistoricalContractValue(comparison.variantOrder.slice(1))
        !== canonicalizeHistoricalContractValue(expectedAlternativeOrder)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Alternative comparison order must be stable by id');
    }
    if (comparison.variants.length !== comparison.variantOrder.length
        || comparison.pairwise.length !== comparison.variantOrder.length - 1) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Stress replay comparison cardinalities do not reconcile');
    }
    const variantIds = comparison.variants.map(entry => entry?.variantId);
    const pairwiseIds = comparison.pairwise.map(entry => entry?.variantId);
    if (canonicalizeHistoricalContractValue(variantIds)
        !== canonicalizeHistoricalContractValue(comparison.variantOrder)
        || canonicalizeHistoricalContractValue(pairwiseIds)
        !== canonicalizeHistoricalContractValue(comparison.variantOrder.slice(1))) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Stress replay comparison identities do not reconcile');
    }
    for (const [index, entry] of comparison.variants.entries()) {
        requirePlainObject(entry, `comparison.variants[${index}]`);
        requireString(entry.variantId, `comparison.variants[${index}].variantId`);
        requireString(entry.label, `comparison.variants[${index}].label`);
        validateFingerprint(entry.variantFingerprint, `comparison.variants[${index}].variantFingerprint`);
        validateFingerprint(entry.resultFingerprint, `comparison.variants[${index}].resultFingerprint`);
        const expectedRole = index === 0 ? 'baseline' : 'alternative';
        if (entry.role !== expectedRole
            || !RESULT_TERMINAL_STATUSES.has(entry.terminalStatus)
            || !Array.isArray(entry.materialChangeGroups)
            || !Array.isArray(entry.warnings)
            || !Array.isArray(entry.transactionSummary)
            || !Array.isArray(entry.missingness)) {
            fail('STRESS_REPLAY_CONTRACT_INVALID', 'Stress replay comparison variant entry is invalid', {
                path: `comparison.variants[${index}]`
            });
        }
        if ((entry.terminalStatus === 'technical_error') !== (entry.summary === null)) {
            fail('STRESS_REPLAY_CONTRACT_INVALID', 'Comparison variant summary conflicts with terminal status', {
                path: `comparison.variants[${index}].summary`
            });
        }
    }
    const allowedStatuses = new Set(['complete', 'blocked_technical_error']);
    if (!allowedStatuses.has(comparison.overallStatus)
        || typeof comparison.financialRankingAllowed !== 'boolean') {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Stress replay comparison status is invalid');
    }
    const hasTechnicalError = comparison.variants.some(entry => entry?.terminalStatus === 'technical_error');
    if (hasTechnicalError !== (comparison.overallStatus === 'blocked_technical_error')
        || comparison.financialRankingAllowed !== false) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Technical comparison status or interpretation is misleading');
    }
    const baselineTechnical = comparison.variants[0]?.terminalStatus === 'technical_error';
    for (const [index, pair] of comparison.pairwise.entries()) {
        if (!Array.isArray(pair?.firstDeltaMarkers)
            || !Array.isArray(pair?.missingness)
            || !Array.isArray(pair?.warnings)) {
            fail('STRESS_REPLAY_CONTRACT_INVALID', 'Pairwise stress replay diagnostics are invalid');
        }
        if (typeof pair.comparable !== 'boolean'
            || (pair.comparable && (!pair.kpiDeltas || typeof pair.kpiDeltas !== 'object'))
            || (!pair.comparable && pair.kpiDeltas !== null)) {
            fail('STRESS_REPLAY_CONTRACT_INVALID', 'Pairwise stress replay comparability is invalid');
        }
        const variantTechnical = comparison.variants[index + 1]?.terminalStatus === 'technical_error';
        if (pair.baselineId !== 'baseline'
            || pair.comparable !== !(baselineTechnical || variantTechnical)
            || !['single_factor', 'multi_factor'].includes(pair.factorMode)
            || !Array.isArray(pair.materialChangeGroups)
            || typeof pair.interpretation !== 'string') {
            fail('STRESS_REPLAY_CONTRACT_INVALID', 'Pairwise stress replay status is inconsistent');
        }
        if (pair.comparable) {
            const baselineSummary = comparison.variants[0].summary;
            const variantSummary = comparison.variants[index + 1].summary;
            const expectedKpiKeys = STRESS_REPLAY_COMPARISON_KPIS_V1.map(kpi => kpi.field).sort();
            const actualKpiKeys = Object.keys(pair.kpiDeltas).sort();
            if (canonicalizeHistoricalContractValue(actualKpiKeys)
                !== canonicalizeHistoricalContractValue(expectedKpiKeys)) {
                fail('STRESS_REPLAY_CONTRACT_INVALID', 'Pairwise KPI ledger has an invalid field set');
            }
            for (const { field: kpiField, unit } of STRESS_REPLAY_COMPARISON_KPIS_V1) {
                const delta = requirePlainObject(pair.kpiDeltas[kpiField], `comparison.pairwise[${index}].kpiDeltas.${kpiField}`);
                const baselineValue = baselineSummary?.[kpiField] ?? null;
                const variantValue = variantSummary?.[kpiField] ?? null;
                const observed = Number.isFinite(baselineValue) && Number.isFinite(variantValue);
                const expectedAbsolute = observed ? variantValue - baselineValue : null;
                const expectedRelative = observed && baselineValue !== 0
                    ? ((variantValue - baselineValue) / Math.abs(baselineValue)) * 100
                    : null;
                if (delta.unit !== unit
                    || canonicalizeHistoricalContractValue(delta.baselineValue) !== canonicalizeHistoricalContractValue(baselineValue)
                    || canonicalizeHistoricalContractValue(delta.variantValue) !== canonicalizeHistoricalContractValue(variantValue)
                    || canonicalizeHistoricalContractValue(delta.absoluteDelta) !== canonicalizeHistoricalContractValue(expectedAbsolute)
                    || canonicalizeHistoricalContractValue(delta.relativeDeltaPct) !== canonicalizeHistoricalContractValue(expectedRelative)) {
                    fail('STRESS_REPLAY_CONTRACT_INVALID', 'Pairwise KPI delta does not match variant summaries', {
                        field: kpiField
                    });
                }
            }
        }
        for (const [markerIndex, deltaMarker] of pair.firstDeltaMarkers.entries()) {
            requirePlainObject(deltaMarker, `comparison.pairwise[${index}].firstDeltaMarkers[${markerIndex}]`);
            requireInteger(deltaMarker.yearIndex, `comparison.pairwise[${index}].firstDeltaMarkers[${markerIndex}].yearIndex`, 0);
            requireString(deltaMarker.category, `comparison.pairwise[${index}].firstDeltaMarkers[${markerIndex}].category`);
            requireString(deltaMarker.causeCode, `comparison.pairwise[${index}].firstDeltaMarkers[${markerIndex}].causeCode`);
            if (!Array.isArray(deltaMarker.fields) || deltaMarker.fields.length === 0) {
                fail('STRESS_REPLAY_CONTRACT_INVALID', 'First delta marker fields are invalid');
            }
        }
    }
    assertStressReplayFinite(comparison, 'comparison');
    const expectedFingerprint = createStressReplayComparisonFingerprint(comparison);
    if (expectedFingerprint.value !== comparison.comparisonFingerprint.value) {
        fail('STRESS_REPLAY_COMPARISON_FINGERPRINT_MISMATCH', 'Comparison fingerprint does not match its contents');
    }
    return deepFreeze(cloneValue(comparison));
}

export const assertStressReplayComparisonV1 = validateStressReplayComparisonV1;

function workspaceFingerprintBasis(workspace) {
    const { workspaceFingerprint: _workspaceFingerprint, ...basis } = workspace;
    return basis;
}

export function createStressReplayWorkspaceFingerprint(workspace) {
    requirePlainObject(workspace, 'workspace');
    return createStressReplayFingerprint(workspaceFingerprintBasis(workspace));
}

export function validateStressReplayWorkspaceV1(workspace) {
    requirePlainObject(workspace, 'workspace');
    const allowedKeys = new Set([
        'schemaVersion',
        'contractVersion',
        'scope',
        'createdAtUtc',
        'updatedAtUtc',
        'path',
        'pathFingerprint',
        'baselineSnapshot',
        'baselineScenarioFingerprint',
        'variantOrder',
        'variants',
        'workspaceFingerprint'
    ]);
    const unknownKeys = Object.keys(workspace).filter(key => !allowedKeys.has(key)).sort();
    if (unknownKeys.length > 0) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Workspace contains unknown contract fields', {
            fields: unknownKeys
        });
    }
    if (workspace.schemaVersion !== STRESS_REPLAY_SCHEMA_VERSIONS.workspace
        || workspace.contractVersion !== STRESS_REPLAY_CONTRACT_VERSION
        || workspace.scope !== STRESS_REPLAY_SCOPE) {
        fail('STRESS_REPLAY_VERSION_UNSUPPORTED', 'Unsupported stress replay workspace contract', {
            schemaVersion: workspace.schemaVersion,
            contractVersion: workspace.contractVersion,
            scope: workspace.scope
        });
    }
    for (const key of ['createdAtUtc', 'updatedAtUtc']) {
        requireString(workspace[key], `workspace.${key}`);
        const date = new Date(workspace[key]);
        if (!Number.isFinite(date.getTime()) || date.toISOString() !== workspace[key]) {
            fail('STRESS_REPLAY_CONTRACT_INVALID', `workspace.${key} must be a canonical UTC timestamp`, {
                path: `workspace.${key}`
            });
        }
    }
    if (new Date(workspace.updatedAtUtc).getTime() < new Date(workspace.createdAtUtc).getTime()) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'workspace.updatedAtUtc must not predate createdAtUtc');
    }
    const path = validateStressReplayPathV1(workspace.path);
    validateFingerprint(workspace.pathFingerprint, 'workspace.pathFingerprint');
    const expectedPathFingerprint = createStressReplayPathFingerprint(path);
    if (workspace.pathFingerprint.value !== expectedPathFingerprint.value
        || (path.pathFingerprint && path.pathFingerprint.value !== expectedPathFingerprint.value)) {
        fail('STRESS_REPLAY_PATH_FINGERPRINT_MISMATCH', 'Workspace path fingerprint does not match its path');
    }
    requirePlainObject(workspace.baselineSnapshot, 'workspace.baselineSnapshot');
    assertStressReplayFinite(workspace.baselineSnapshot, 'workspace.baselineSnapshot');
    validateFingerprint(workspace.baselineScenarioFingerprint, 'workspace.baselineScenarioFingerprint');
    const expectedBaselineFingerprint = createStressReplayFingerprint(workspace.baselineSnapshot);
    if (workspace.baselineScenarioFingerprint.value !== expectedBaselineFingerprint.value) {
        fail('STRESS_REPLAY_BASELINE_FINGERPRINT_MISMATCH', 'Workspace baseline snapshot fingerprint does not match');
    }
    if (!Array.isArray(workspace.variantOrder)
        || !Array.isArray(workspace.variants)
        || workspace.variantOrder.length !== workspace.variants.length
        || workspace.variantOrder.length < 1
        || workspace.variantOrder.length > STRESS_REPLAY_LIMITS.maximumVariants
        || workspace.variantOrder[0] !== 'baseline'
        || new Set(workspace.variantOrder).size !== workspace.variantOrder.length) {
        fail('STRESS_REPLAY_VARIANT_LIMIT_EXCEEDED', 'Workspace variant order is invalid');
    }
    const variants = workspace.variants.map((variant, index) => {
        const validated = validateStressReplayVariantV1(variant);
        if (validated.id !== workspace.variantOrder[index]
            || validated.role !== (index === 0 ? 'baseline' : 'alternative')
            || validated.baselineScenarioFingerprint.value !== expectedBaselineFingerprint.value) {
            fail('STRESS_REPLAY_CONTRACT_INVALID', 'Workspace variant identity or baseline binding is invalid', {
                path: `workspace.variants[${index}]`
            });
        }
        return validated;
    });
    validateFingerprint(workspace.workspaceFingerprint, 'workspace.workspaceFingerprint');
    const expectedWorkspaceFingerprint = createStressReplayWorkspaceFingerprint(workspace);
    if (workspace.workspaceFingerprint.value !== expectedWorkspaceFingerprint.value) {
        fail('STRESS_REPLAY_WORKSPACE_FINGERPRINT_MISMATCH', 'Workspace fingerprint does not match its contents');
    }
    assertStressReplaySize(workspace, STRESS_REPLAY_LIMITS.maximumEnvelopeBytes, 'workspace');
    return deepFreeze(cloneValue({ ...workspace, path, variants }));
}

export const assertStressReplayWorkspaceV1 = validateStressReplayWorkspaceV1;

export function createStressReplayWorkspaceV1({
    path,
    baselineSnapshot,
    variants,
    variantOrder = variants?.map(variant => variant?.id),
    createdAtUtc = new Date().toISOString(),
    updatedAtUtc = createdAtUtc
} = {}) {
    const validatedPath = validateStressReplayPathV1(path);
    requirePlainObject(baselineSnapshot, 'baselineSnapshot');
    if (!Array.isArray(variants)) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'variants must be an array');
    }
    const workspaceWithoutFingerprint = {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.workspace,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        scope: STRESS_REPLAY_SCOPE,
        createdAtUtc,
        updatedAtUtc,
        path: validatedPath,
        pathFingerprint: createStressReplayPathFingerprint(validatedPath),
        baselineSnapshot: cloneValue(baselineSnapshot),
        baselineScenarioFingerprint: createStressReplayFingerprint(baselineSnapshot),
        variantOrder: cloneValue(variantOrder),
        variants: cloneValue(variants)
    };
    return validateStressReplayWorkspaceV1({
        ...workspaceWithoutFingerprint,
        workspaceFingerprint: createStressReplayWorkspaceFingerprint(workspaceWithoutFingerprint)
    });
}
