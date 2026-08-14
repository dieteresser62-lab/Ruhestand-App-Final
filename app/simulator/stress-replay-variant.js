"use strict";

import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    STRESS_REPLAY_VARIANT_WHITELIST_V1,
    STRESS_REPLAY_VARIANT_WHITELIST_VERSION,
    StressReplayContractError,
    createStressReplayFingerprint,
    createStressReplayStrategySnapshot,
    createStressReplayVariantFingerprint,
    normalizeStressReplayVariantPatch,
    validateStressReplayVariantV1
} from './stress-replay-contract.js';

export const STRESS_REPLAY_BASELINE_VARIANT_ID = 'baseline';
export const STRESS_REPLAY_MULTI_FACTOR_WARNING = 'STRESS_REPLAY_MULTI_FACTOR_VARIANT';

function fail(code, message, details = {}) {
    throw new StressReplayContractError(code, message, details);
}

function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

function getPath(value, path) {
    return path.split('.').reduce((cursor, segment) => cursor?.[segment], value);
}

function setPath(target, path, value) {
    const segments = path.split('.');
    let cursor = target;
    for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        if (!cursor[segment] || typeof cursor[segment] !== 'object' || Array.isArray(cursor[segment])) {
            cursor[segment] = {};
        }
        cursor = cursor[segment];
    }
    cursor[segments.at(-1)] = cloneValue(value);
}

function sameValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function removeNoOpLeaves(normalizedPatch, baselineStrategy) {
    const materialPatch = {};
    for (const descriptor of STRESS_REPLAY_VARIANT_WHITELIST_V1) {
        const value = getPath(normalizedPatch, descriptor.contractPath);
        if (value === undefined) continue;
        const strategyPath = descriptor.contractPath.replace(/^strategy\./, '');
        if (!sameValue(value, getPath(baselineStrategy, strategyPath))) {
            setPath(materialPatch, descriptor.contractPath, value);
        }
    }
    if (getPath(materialPatch, 'strategy.decumulation.mode') === undefined
        && (getPath(materialPatch, 'strategy.decumulation.bondTargetFactor') !== undefined
            || getPath(materialPatch, 'strategy.decumulation.drawdownTrigger') !== undefined
            || getPath(materialPatch, 'strategy.decumulation.bondRefillThreshold') !== undefined)) {
        setPath(materialPatch, 'strategy.decumulation.mode', baselineStrategy.decumulation?.mode);
    }
    if (getPath(materialPatch, 'strategy.longevityMode') === undefined
        && (getPath(materialPatch, 'strategy.longevityQuantileShift') !== undefined
            || getPath(materialPatch, 'strategy.longevityRelativePct') !== undefined
            || getPath(materialPatch, 'strategy.longevityBufferYears') !== undefined)) {
        setPath(materialPatch, 'strategy.longevityMode', baselineStrategy.longevityMode);
    }
    return materialPatch;
}

function factorGroup(contractPath) {
    if (contractPath.startsWith('strategy.decumulation.')) return 'decumulation';
    if (contractPath === 'strategy.longevityMode' || contractPath.startsWith('strategy.longevity')) {
        return 'longevity';
    }
    return contractPath.replace(/^strategy\./, '');
}

function materialGroups(patch) {
    const groups = new Set();
    for (const descriptor of STRESS_REPLAY_VARIANT_WHITELIST_V1) {
        if (getPath(patch, descriptor.contractPath) !== undefined) {
            groups.add(factorGroup(descriptor.contractPath));
        }
    }
    return [...groups].sort();
}

function applyNormalizedPatch(baselineInputs, patch) {
    const applied = cloneValue(baselineInputs);
    for (const descriptor of STRESS_REPLAY_VARIANT_WHITELIST_V1) {
        const value = getPath(patch, descriptor.contractPath);
        if (value !== undefined) setPath(applied, descriptor.inputPath, value);
    }
    return applied;
}

export function previewStressReplayVariantPatchV1({ baselineInputs, patch }) {
    const baselineFingerprintBefore = createStressReplayFingerprint(baselineInputs);
    const baselineStrategy = createStressReplayStrategySnapshot(baselineInputs);
    const normalized = normalizeStressReplayVariantPatch(patch, { baselineStrategy });
    const materialPatch = removeNoOpLeaves(normalized, baselineStrategy);
    const normalizedMaterialPatch = normalizeStressReplayVariantPatch(materialPatch, { baselineStrategy });
    const normalizedInputs = applyNormalizedPatch(baselineInputs, normalizedMaterialPatch);
    const baselineFingerprintAfter = createStressReplayFingerprint(baselineInputs);
    if (baselineFingerprintBefore.value !== baselineFingerprintAfter.value) {
        fail('STRESS_REPLAY_BASELINE_INPUT_MUTATED', 'Variant preview mutated the baseline inputs');
    }
    const materialChangeGroups = materialGroups(normalizedMaterialPatch);
    const warnings = materialChangeGroups.length > 1
        ? [{
            code: STRESS_REPLAY_MULTI_FACTOR_WARNING,
            factorCount: materialChangeGroups.length,
            factorGroups: materialChangeGroups
        }]
        : [];
    return deepFreeze({
        patch: normalizedMaterialPatch,
        normalizedInputs,
        baselineScenarioFingerprint: baselineFingerprintBefore,
        normalizedInputFingerprint: createStressReplayFingerprint(normalizedInputs),
        materialChangeGroups,
        warnings
    });
}

export function createStressReplayVariantV1({
    id,
    role = 'alternative',
    label,
    baselineInputs,
    patch = {}
}) {
    if (role !== 'baseline' && role !== 'alternative') {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Variant role must be baseline or alternative', { role });
    }
    const resolvedId = role === 'baseline' ? STRESS_REPLAY_BASELINE_VARIANT_ID : id;
    const resolvedLabel = String(label || (role === 'baseline' ? 'Baseline' : '')).trim();
    if (typeof resolvedId !== 'string' || resolvedId.trim() === '' || resolvedLabel === '') {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'Variant id and label must be non-empty strings');
    }
    if (role === 'alternative' && resolvedId.trim() === STRESS_REPLAY_BASELINE_VARIANT_ID) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'The baseline id is reserved for the baseline variant');
    }
    const preview = previewStressReplayVariantPatchV1({ baselineInputs, patch });
    if (role === 'baseline' && Object.keys(preview.patch).length > 0) {
        fail('STRESS_REPLAY_CONTRACT_INVALID', 'The baseline variant must have an empty patch');
    }
    if (role === 'alternative' && preview.materialChangeGroups.length === 0) {
        fail('STRESS_REPLAY_VARIANT_NO_OP', 'An alternative variant must contain a material strategy change');
    }
    const variantWithoutFingerprint = {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.variant,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        whitelistVersion: STRESS_REPLAY_VARIANT_WHITELIST_VERSION,
        id: resolvedId.trim(),
        role,
        label: resolvedLabel,
        baselineScenarioFingerprint: preview.baselineScenarioFingerprint,
        patch: preview.patch,
        normalizedInputFingerprint: preview.normalizedInputFingerprint,
        materialChangeGroups: preview.materialChangeGroups,
        warnings: preview.warnings
    };
    return validateStressReplayVariantV1({
        ...variantWithoutFingerprint,
        variantFingerprint: createStressReplayVariantFingerprint(variantWithoutFingerprint)
    });
}

export function createStressReplayBaselineVariantV1({ baselineInputs, label = 'Baseline' }) {
    return createStressReplayVariantV1({
        role: 'baseline',
        id: STRESS_REPLAY_BASELINE_VARIANT_ID,
        label,
        baselineInputs,
        patch: {}
    });
}

export function applyStressReplayVariantV1({ baselineInputs, variant }) {
    const validated = validateStressReplayVariantV1(variant);
    const baselineScenarioFingerprint = createStressReplayFingerprint(baselineInputs);
    if (baselineScenarioFingerprint.value !== validated.baselineScenarioFingerprint.value) {
        fail('STRESS_REPLAY_BASELINE_FINGERPRINT_MISMATCH', 'Variant does not belong to these baseline inputs');
    }
    const applied = applyNormalizedPatch(baselineInputs, validated.patch);
    const appliedFingerprint = createStressReplayFingerprint(applied);
    if (appliedFingerprint.value !== validated.normalizedInputFingerprint.value) {
        fail('STRESS_REPLAY_VARIANT_FINGERPRINT_MISMATCH', 'Variant normalized-input fingerprint does not match');
    }
    if (validated.role === 'alternative'
        && appliedFingerprint.value === baselineScenarioFingerprint.value) {
        fail('STRESS_REPLAY_VARIANT_NO_OP', 'An alternative variant must change normalized inputs');
    }
    return deepFreeze(applied);
}
