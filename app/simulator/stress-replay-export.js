"use strict";

import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_LIMITS,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    StressReplayContractError,
    assertStressReplayFinite,
    assertStressReplaySize,
    createStressReplayFingerprint,
    validateStressReplayComparisonV1,
    validateStressReplayWorkspaceV1
} from './stress-replay-contract.js';

export const STRESS_REPLAY_EXPORT_SCHEMA_ID = 'de.ruhestandsapp.stress-replay.comparison';

const PRIVATE_FIELD = /^(?:password|passphrase|secret|token|api[_-]?token|api[_-]?key|access[_-]?key|private[_-]?key|local[_-]?path|file[_-]?path)$/i;
const LOCAL_PATH_VALUE = /^(?:file:\/\/|[a-z]:[\\/]|\\\\|\/(?:home|users|private)\/|\/mnt\/[a-z]\/users\/)/i;

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

function requirePlainObject(value, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        fail('STRESS_REPLAY_EXPORT_INVALID', `${path} must be an object`, { path });
    }
    return value;
}

function normalizeUtc(value, path = 'exportedAtUtc') {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) {
        fail('STRESS_REPLAY_EXPORT_INVALID', `${path} must be a valid UTC timestamp`, { path });
    }
    return date.toISOString();
}

function assertNoPrivateData(value, path = '$', seen = new WeakSet()) {
    if (typeof value === 'string' && LOCAL_PATH_VALUE.test(value.trim())) {
        fail('STRESS_REPLAY_EXPORT_PRIVATE_DATA', 'Local filesystem paths are not exportable', { path });
    }
    if (value === null || typeof value !== 'object') return;
    if (seen.has(value)) fail('STRESS_REPLAY_CONTRACT_CYCLE', 'Export data must not contain cycles', { path });
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
        const childPath = Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`;
        if (PRIVATE_FIELD.test(key)) {
            fail('STRESS_REPLAY_EXPORT_PRIVATE_DATA', 'Secret or local-path fields are not exportable', {
                path: childPath
            });
        }
        assertNoPrivateData(child, childPath, seen);
    }
    seen.delete(value);
}

function exportFingerprintBasis(document) {
    const { exportFingerprint: _exportFingerprint, ...basis } = document;
    return basis;
}

export function createStressReplayComparisonExportFingerprint(document) {
    requirePlainObject(document, 'document');
    return createStressReplayFingerprint(exportFingerprintBasis(document));
}

export function validateStressReplayComparisonExportV1(document) {
    requirePlainObject(document, 'document');
    const allowedKeys = new Set([
        'schemaId', 'schemaVersion', 'contractVersion', 'exportedAtUtc', 'workspace',
        'comparison', 'compatibility', 'privacy', 'exportFingerprint'
    ]);
    const unknownKeys = Object.keys(document).filter(key => !allowedKeys.has(key)).sort();
    if (unknownKeys.length > 0) {
        fail('STRESS_REPLAY_EXPORT_INVALID', 'Export contains unknown top-level fields', { fields: unknownKeys });
    }
    if (document.schemaId !== STRESS_REPLAY_EXPORT_SCHEMA_ID
        || document.schemaVersion !== STRESS_REPLAY_SCHEMA_VERSIONS.comparisonExport
        || document.contractVersion !== STRESS_REPLAY_CONTRACT_VERSION) {
        fail('STRESS_REPLAY_VERSION_UNSUPPORTED', 'Unsupported stress replay export contract', {
            schemaId: document.schemaId,
            schemaVersion: document.schemaVersion,
            contractVersion: document.contractVersion
        });
    }
    normalizeUtc(document.exportedAtUtc);
    const workspace = validateStressReplayWorkspaceV1(document.workspace);
    const comparison = document.comparison === null
        ? null
        : validateStressReplayComparisonV1(document.comparison);
    if (comparison && (comparison.pathFingerprint.value !== workspace.pathFingerprint.value
        || comparison.baselineScenarioFingerprint.value !== workspace.baselineScenarioFingerprint.value
        || JSON.stringify(comparison.variantOrder) !== JSON.stringify(workspace.variantOrder))) {
        fail('STRESS_REPLAY_EXPORT_FINGERPRINT_MISMATCH', 'Comparison does not belong to the exported workspace');
    }
    const compatibility = requirePlainObject(document.compatibility, 'document.compatibility');
    if (compatibility.mismatchPolicy !== 'read_only_inspection'
        || compatibility.unknownSchemaVersions !== 'reject') {
        fail('STRESS_REPLAY_EXPORT_INVALID', 'Export compatibility policy is unsupported');
    }
    const privacy = requirePlainObject(document.privacy, 'document.privacy');
    if (privacy.scope !== 'single-stress-replay-workspace'
        || !Array.isArray(privacy.excludes)
        || !privacy.excludes.includes('local-filesystem-paths')
        || !privacy.excludes.includes('secrets-and-credentials')
        || !privacy.excludes.includes('unrelated-storage-records')
        || !privacy.excludes.includes('complete-source-scenario-logs')) {
        fail('STRESS_REPLAY_EXPORT_INVALID', 'Export privacy policy is incomplete');
    }
    assertStressReplayFinite(document, 'document');
    assertNoPrivateData({ workspace, comparison });
    if (document.exportFingerprint?.algorithm !== 'sha256-canonical-json-v1'
        || typeof document.exportFingerprint?.value !== 'string') {
        fail('STRESS_REPLAY_EXPORT_INVALID', 'Export fingerprint is invalid');
    }
    const expectedFingerprint = createStressReplayComparisonExportFingerprint(document);
    if (document.exportFingerprint.value !== expectedFingerprint.value) {
        fail('STRESS_REPLAY_EXPORT_FINGERPRINT_MISMATCH', 'Export fingerprint does not match its contents');
    }
    assertStressReplaySize(document, STRESS_REPLAY_LIMITS.maximumEnvelopeBytes, 'comparisonExport');
    return deepFreeze(cloneValue({ ...document, workspace, comparison }));
}

export function buildStressReplayComparisonExportV1({
    workspace,
    comparison = null,
    exportedAt = new Date()
} = {}) {
    const base = {
        schemaId: STRESS_REPLAY_EXPORT_SCHEMA_ID,
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.comparisonExport,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        exportedAtUtc: normalizeUtc(exportedAt),
        workspace: validateStressReplayWorkspaceV1(workspace),
        comparison: comparison === null ? null : validateStressReplayComparisonV1(comparison),
        compatibility: {
            mismatchPolicy: 'read_only_inspection',
            unknownSchemaVersions: 'reject'
        },
        privacy: {
            scope: 'single-stress-replay-workspace',
            excludes: [
                'local-filesystem-paths',
                'secrets-and-credentials',
                'unrelated-storage-records',
                'complete-source-scenario-logs'
            ]
        }
    };
    assertNoPrivateData({ workspace: base.workspace, comparison: base.comparison });
    return validateStressReplayComparisonExportV1({
        ...base,
        exportFingerprint: createStressReplayComparisonExportFingerprint(base)
    });
}

export function serializeStressReplayComparisonExportV1(document, { pretty = true } = {}) {
    const validated = validateStressReplayComparisonExportV1(document);
    const serialized = JSON.stringify(validated, null, pretty ? 2 : 0);
    const bytes = new TextEncoder().encode(serialized).byteLength;
    if (bytes > STRESS_REPLAY_LIMITS.maximumEnvelopeBytes) {
        fail('STRESS_REPLAY_PERSISTENCE_SIZE_LIMIT', 'Serialized stress replay export exceeds its size limit', {
            subject: 'comparisonExport',
            bytes,
            maximumBytes: STRESS_REPLAY_LIMITS.maximumEnvelopeBytes
        });
    }
    return serialized;
}

export function parseStressReplayComparisonExportV1(serialized) {
    if (typeof serialized !== 'string') {
        fail('STRESS_REPLAY_EXPORT_INVALID', 'Imported stress replay data must be JSON text');
    }
    const bytes = new TextEncoder().encode(serialized).byteLength;
    if (bytes > STRESS_REPLAY_LIMITS.maximumEnvelopeBytes) {
        fail('STRESS_REPLAY_PERSISTENCE_SIZE_LIMIT', 'Imported stress replay data exceeds its size limit', {
            subject: 'comparisonExport',
            bytes,
            maximumBytes: STRESS_REPLAY_LIMITS.maximumEnvelopeBytes
        });
    }
    let parsed;
    try {
        parsed = JSON.parse(serialized);
    } catch (cause) {
        fail('STRESS_REPLAY_EXPORT_JSON_INVALID', 'Imported stress replay data is not valid JSON', {
            cause: cause?.message || String(cause)
        });
    }
    return validateStressReplayComparisonExportV1(parsed);
}
