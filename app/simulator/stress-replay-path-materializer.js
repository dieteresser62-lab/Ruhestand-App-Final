"use strict";

import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    STRESS_REPLAY_SCOPE,
    STRESS_REPLAY_UNITS_V1,
    StressReplayContractError,
    createStressReplayFingerprint,
    validateStressReplayPathV1
} from './stress-replay-contract.js';

export const STRESS_REPLAY_CAPTURE_VERSION = 'StressReplayCaptureV1';
export const STRESS_REPLAY_SHADOW_DOMAIN = 'stress-replay-post-ruin-shadow-v1';
export const STRESS_REPLAY_POST_RUIN_POLICY_VERSION = 'StressReplayPostRuinPolicyV1';
export const STRESS_REPLAY_SOURCE_TIE_BREAK = 'smallest_absolute_run_index';

function fail(code, message, details = {}) {
    throw new StressReplayContractError(code, message, details);
}

function cloneJson(value) {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
}

function requireFingerprint(value, name) {
    if (value?.algorithm !== 'sha256-canonical-json-v1'
        || typeof value?.value !== 'string'
        || !/^[a-f0-9]{64}$/.test(value.value)) {
        fail('STRESS_REPLAY_SOURCE_IDENTITY_INVALID', `${name} must be a canonical SHA-256 fingerprint`, { name });
    }
    return cloneJson(value);
}

function sameNumber(left, right, tolerance) {
    return Number.isFinite(Number(left))
        && Number.isFinite(Number(right))
        && Math.abs(Number(left) - Number(right)) <= tolerance;
}

function reconcileRecord(captured, source, index, tolerances) {
    if (!source || captured.recordType !== source.recordType) {
        return { index, field: 'recordType', captured: captured.recordType, source: source?.recordType ?? null };
    }
    const comparisons = [
        ['jahr', captured.yearIndex + 1, source.jahr, 0],
        ['histJahr', captured.historicalYear, source.histJahr, 0],
        ['inflationPct', captured.inflationPct, source.inflation, tolerances.ratio]
    ];
    for (const [field, left, right, tolerance] of comparisons) {
        if (left === null && right === null) continue;
        if (!sameNumber(left, right, tolerance)) return { index, field, captured: left, source: right };
    }
    const household = captured.householdEvents?.[0];
    for (const [field, sourceField] of [['p1Alive', 'Person1Alive'], ['p2Alive', 'Person2Alive']]) {
        if (household?.[field] === null || source?.[sourceField] === null) continue;
        if (household && Number(household[field]) !== Number(source?.[sourceField])) {
            return { index, field, captured: household[field], source: source?.[sourceField] };
        }
    }
    return null;
}

/**
 * Creates a position-independent uint32 sub-seed. The derivation is deliberately
 * based on public source identity, never on the current state of the main RNG.
 */
export function deriveStressReplayShadowSeed({
    seed,
    absoluteRunIndex,
    contractVersion = STRESS_REPLAY_CONTRACT_VERSION,
    domain = STRESS_REPLAY_SHADOW_DOMAIN
}) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xFFFFFFFF
        || !Number.isSafeInteger(absoluteRunIndex) || absoluteRunIndex < 0) {
        fail('STRESS_REPLAY_SOURCE_IDENTITY_INVALID', 'Shadow seed identity is invalid', { seed, absoluteRunIndex });
    }
    const fingerprint = createStressReplayFingerprint({ seed, absoluteRunIndex, contractVersion, domain });
    return Number.parseInt(fingerprint.value.slice(0, 8), 16) >>> 0;
}

export function createStressReplayCaptureRequest(runIndices) {
    if (!Array.isArray(runIndices) || runIndices.length === 0) {
        fail('STRESS_REPLAY_CAPTURE_REQUEST_INVALID', 'At least one absolute run index is required');
    }
    const indices = [...new Set(runIndices)];
    if (indices.some(index => !Number.isSafeInteger(index) || index < 0)) {
        fail('STRESS_REPLAY_CAPTURE_REQUEST_INVALID', 'Capture indices must be non-negative safe integers');
    }
    return Object.freeze({
        schemaVersion: STRESS_REPLAY_CAPTURE_VERSION,
        runIndices: Object.freeze(indices.sort((a, b) => a - b))
    });
}

/**
 * Converts the runner-owned capture into the persisted path contract and
 * reconciles only fields actually exported for each ScenarioLog recordType.
 */
export function materializeStressReplayPathV1({
    capture,
    sourceLogRows,
    sourceRequest,
    sourceRequestFingerprint = createStressReplayFingerprint(sourceRequest),
    dataFingerprint,
    engineFingerprint,
    scenarioKey,
    selectionMetric,
    selectionTieBreak = STRESS_REPLAY_SOURCE_TIE_BREAK,
    tolerances = { monetaryEur: 0.01, ratio: 1e-9 }
}) {
    if (!capture || capture.schemaVersion !== STRESS_REPLAY_CAPTURE_VERSION) {
        fail('STRESS_REPLAY_CAPTURE_INVALID', 'Runner capture is missing or incompatible');
    }
    if (capture.rngMode !== 'per-run-seed') {
        fail('STRESS_REPLAY_SOURCE_UNSUPPORTED', 'Only per-run-seed captures can be materialized', {
            rngMode: capture.rngMode
        });
    }
    if (!Array.isArray(sourceLogRows) || sourceLogRows.length === 0) {
        fail('STRESS_REPLAY_RECONCILIATION_FAILED', 'Source log rows are required for reconciliation');
    }
    if (selectionTieBreak !== STRESS_REPLAY_SOURCE_TIE_BREAK) {
        fail('STRESS_REPLAY_SOURCE_IDENTITY_INVALID', 'Unsupported source tie-break', { selectionTieBreak });
    }

    const sourcePrefixLength = Math.min(sourceLogRows.length, capture.sourcePrefixLength);
    const mismatches = [];
    for (let index = 0; index < sourcePrefixLength; index++) {
        const mismatch = reconcileRecord(capture.years[index], sourceLogRows[index], index, tolerances);
        if (mismatch) mismatches.push(mismatch);
    }
    if (sourcePrefixLength !== capture.sourcePrefixLength || mismatches.length > 0) {
        fail('STRESS_REPLAY_RECONCILIATION_FAILED', 'Captured source prefix does not match the selected run log', {
            expectedPrefixLength: capture.sourcePrefixLength,
            actualPrefixLength: sourcePrefixLength,
            mismatches
        });
    }

    const pathWithoutFingerprint = {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.path,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        scope: STRESS_REPLAY_SCOPE,
        source: {
            requestFingerprint: requireFingerprint(sourceRequestFingerprint, 'sourceRequestFingerprint'),
            seed: capture.seed,
            rngMode: capture.rngMode,
            absoluteRunIndex: capture.absoluteRunIndex,
            displayRunNumber: capture.absoluteRunIndex + 1,
            scenarioKey: String(scenarioKey || ''),
            selectionMetric: String(selectionMetric || ''),
            tieBreak: selectionTieBreak,
            startYearIndex: capture.startYearIndex
        },
        breakOnRuin: capture.breakOnRuin,
        dataFingerprint: requireFingerprint(dataFingerprint, 'dataFingerprint'),
        engineFingerprint: requireFingerprint(engineFingerprint, 'engineFingerprint'),
        units: { ...STRESS_REPLAY_UNITS_V1 },
        horizonYears: capture.horizonYears,
        effectiveLength: capture.years.length,
        terminalStatus: capture.terminalStatus,
        initialMarketDataHist: [cloneJson(capture.initialMarketDataHist)],
        years: cloneJson(capture.years),
        continuation: cloneJson(capture.continuation),
        reconciliation: {
            sourcePrefixMatched: true,
            sourcePrefixLength,
            policy: 'scenario-log-record-type-fields-v1',
            tolerances: cloneJson(tolerances)
        }
    };
    const path = {
        ...pathWithoutFingerprint,
        pathFingerprint: createStressReplayFingerprint(pathWithoutFingerprint)
    };
    return validateStressReplayPathV1(path);
}
