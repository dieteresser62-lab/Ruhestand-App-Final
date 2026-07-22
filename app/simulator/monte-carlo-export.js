"use strict";

import {
    MONTE_CARLO_FINGERPRINT_ALGORITHM,
    MONTE_CARLO_LEGACY_READ_ALIASES,
    MONTE_CARLO_RUN_REQUEST_VERSION,
    MONTE_CARLO_RUN_RESULT_VERSION,
    MONTE_CARLO_SNAPSHOT_POLICY,
    collectMonteCarloLegacyAliasTelemetryV1,
    deepFreezeMonteCarloContract,
    fingerprintMonteCarloValue,
    normalizeMonteCarloJsonValue,
    validateMonteCarloRunRequestV1,
    validateMonteCarloRunResultV1
} from './monte-carlo-contracts.js';
import {
    canonicalizeHistoricalContractValue,
    sha256Hex
} from './historical-backtest-contract.js';

export const MONTE_CARLO_EXPORT_SCHEMA_ID = 'de.ruhestandsapp.monte-carlo.run';
export const MONTE_CARLO_EXPORT_VERSION = 'MonteCarloExportV1';
export const MONTE_CARLO_APP_VERSION = Object.freeze({
    applicationId: 'de.ruhestandsapp.suite',
    packageVersion: '1.0.0',
    desktopBundleVersion: '0.1.0'
});

const TOP_LEVEL_FIELDS = new Set([
    'schemaId',
    'schemaVersion',
    'exportedAtUtc',
    'identifiers',
    'fingerprint',
    'app',
    'engine',
    'snapshotPolicy',
    'request',
    'result',
    'compatibility',
    'privacy'
]);
const REQUEST_FIELDS = new Set([
    'schemaVersion',
    'parameters',
    'sampling',
    'stress',
    'scenario',
    'data',
    'execution',
    'snapshotPolicy'
]);
const RESULT_FIELDS = new Set([
    'schemaVersion',
    'batchStatus',
    'financialMetricsValid',
    'sampleSize',
    'technicalErrorCount',
    'outcomeInventory',
    'kpis',
    'uncertainty',
    'missingness',
    'diagnostics',
    'warnings',
    'unitContract'
]);

function exportError(code, message) {
    const error = new TypeError(`${MONTE_CARLO_EXPORT_VERSION}: ${message}`);
    error.code = code;
    return error;
}

function normalizeExportedAt(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) {
        throw exportError('MC_EXPORT_TIMESTAMP_INVALID', 'exportedAtUtc must be a valid UTC timestamp.');
    }
    return date.toISOString();
}

function fingerprintBasis(document) {
    return {
        schemaId: document.schemaId,
        schemaVersion: document.schemaVersion,
        app: document.app,
        engine: document.engine,
        snapshotPolicy: document.snapshotPolicy,
        request: document.request,
        result: document.result
    };
}

function unknownFields(value, known, prefix) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    return Object.keys(value)
        .filter(key => !known.has(key))
        .map(key => `${prefix}.${key}`);
}

function requireObject(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw exportError('MC_EXPORT_REQUIRED_OBJECT', `${field} must be an object.`);
    }
    return value;
}

function requireString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw exportError('MC_EXPORT_REQUIRED_STRING', `${field} must be a non-empty string.`);
    }
    return value;
}

export function captureMonteCarloEngineProvenance(engineApi) {
    let version = null;
    let config = null;
    try {
        version = typeof engineApi?.getVersion === 'function' ? engineApi.getVersion() : null;
        config = typeof engineApi?.getConfig === 'function' ? engineApi.getConfig() : null;
    } catch {
        version = null;
        config = null;
    }
    return deepFreezeMonteCarloContract({
        apiVersion: typeof version?.api === 'string' ? version.api : null,
        buildId: typeof version?.build === 'string' ? version.build : null,
        configFingerprint: config == null
            ? null
            : {
                algorithm: MONTE_CARLO_FINGERPRINT_ALGORITHM,
                value: sha256Hex(canonicalizeHistoricalContractValue(config))
            }
    });
}

export function buildMonteCarloExportV1({
    request,
    result,
    engine = null,
    app = MONTE_CARLO_APP_VERSION,
    exportedAt = new Date()
} = {}) {
    validateMonteCarloRunRequestV1(request);
    validateMonteCarloRunResultV1(result);
    const normalizedApp = normalizeMonteCarloJsonValue(app, { path: '$.app' });
    const normalizedEngine = normalizeMonteCarloJsonValue(engine || {}, { path: '$.engine' });
    const base = {
        schemaId: MONTE_CARLO_EXPORT_SCHEMA_ID,
        schemaVersion: MONTE_CARLO_EXPORT_VERSION,
        exportedAtUtc: normalizeExportedAt(exportedAt),
        app: normalizedApp,
        engine: normalizedEngine,
        snapshotPolicy: { ...MONTE_CARLO_SNAPSHOT_POLICY },
        request,
        result
    };
    const fingerprint = fingerprintMonteCarloValue(fingerprintBasis(base));
    const requestFingerprint = fingerprintMonteCarloValue(request);
    const document = {
        ...base,
        identifiers: {
            requestId: `mcrq_${requestFingerprint.value}`,
            runId: `mcrun_${fingerprint.value}`
        },
        fingerprint: {
            ...fingerprint,
            excludes: ['exportedAtUtc', 'identifiers', 'compatibility', 'privacy']
        },
        compatibility: {
            forwardPolicy: 'ignore-unknown-fields-after-v1-required-field-validation',
            unknownSchemaVersions: 'reject',
            deprecatedReadAliases: MONTE_CARLO_LEGACY_READ_ALIASES.map(alias => ({ ...alias })),
            newExportsWriteDeprecatedAliases: false
        },
        privacy: {
            scope: 'only-the-normalized-scenario-used-by-this-run',
            excludes: ['local-filesystem-paths', 'secrets-and-credentials', 'unrelated-storage-records'],
            notice: 'Der Export enthaelt die vom Nutzer eingegebenen Annahmen dieses Simulationsszenarios und wird nur durch eine explizite Nutzeraktion heruntergeladen.'
        }
    };
    validateMonteCarloExportV1(document);
    return deepFreezeMonteCarloContract(document);
}

export function validateMonteCarloExportV1(document, { verifyFingerprint = true } = {}) {
    requireObject(document, 'document');
    if (document.schemaId !== MONTE_CARLO_EXPORT_SCHEMA_ID) {
        throw exportError('MC_EXPORT_SCHEMA_ID_UNSUPPORTED', `Unsupported schemaId ${String(document.schemaId)}.`);
    }
    if (document.schemaVersion !== MONTE_CARLO_EXPORT_VERSION) {
        throw exportError('MC_EXPORT_VERSION_UNSUPPORTED', `Unsupported schemaVersion ${String(document.schemaVersion)}.`);
    }
    normalizeExportedAt(document.exportedAtUtc);
    const identifiers = requireObject(document.identifiers, 'identifiers');
    requireString(identifiers.requestId, 'identifiers.requestId');
    requireString(identifiers.runId, 'identifiers.runId');
    requireObject(document.app, 'app');
    requireString(document.app.applicationId, 'app.applicationId');
    requireString(document.app.packageVersion, 'app.packageVersion');
    requireObject(document.engine, 'engine');
    if (document.snapshotPolicy?.schemaVersion !== MONTE_CARLO_SNAPSHOT_POLICY.schemaVersion) {
        throw exportError('MC_EXPORT_SNAPSHOT_POLICY_UNSUPPORTED', 'snapshotPolicy is missing or incompatible.');
    }
    validateMonteCarloRunRequestV1(document.request);
    validateMonteCarloRunResultV1(document.result);
    const fingerprint = requireObject(document.fingerprint, 'fingerprint');
    if (fingerprint.algorithm !== MONTE_CARLO_FINGERPRINT_ALGORITHM) {
        throw exportError('MC_EXPORT_FINGERPRINT_ALGORITHM_UNSUPPORTED', 'fingerprint.algorithm is unsupported.');
    }
    if (verifyFingerprint) {
        const expected = fingerprintMonteCarloValue(fingerprintBasis(document)).value;
        if (fingerprint.value !== expected) {
            throw exportError('MC_EXPORT_FINGERPRINT_MISMATCH', 'fingerprint does not match request and result.');
        }
        const expectedRunId = `mcrun_${expected}`;
        const expectedRequestId = `mcrq_${fingerprintMonteCarloValue(document.request).value}`;
        if (identifiers.runId !== expectedRunId || identifiers.requestId !== expectedRequestId) {
            throw exportError('MC_EXPORT_IDENTIFIER_MISMATCH', 'identifiers do not match their canonical fingerprints.');
        }
    }
    const compatibility = requireObject(document.compatibility, 'compatibility');
    if (compatibility.forwardPolicy !== 'ignore-unknown-fields-after-v1-required-field-validation'
        || compatibility.newExportsWriteDeprecatedAliases !== false) {
        throw exportError('MC_EXPORT_FORWARD_POLICY_INVALID', 'compatibility policy is missing or incompatible.');
    }
    requireObject(document.privacy, 'privacy');
    normalizeMonteCarloJsonValue(document, { path: '$' });
    return document;
}

export function readMonteCarloExportV1(source, {
    verifyFingerprint = true,
    onTelemetry = null
} = {}) {
    let parsed;
    try {
        parsed = typeof source === 'string' ? JSON.parse(source) : source;
    } catch {
        throw exportError('MC_EXPORT_JSON_INVALID', 'input is not valid JSON.');
    }
    validateMonteCarloExportV1(parsed, { verifyFingerprint });
    const unknown = [
        ...unknownFields(parsed, TOP_LEVEL_FIELDS, '$'),
        ...unknownFields(parsed.request, REQUEST_FIELDS, '$.request'),
        ...unknownFields(parsed.result, RESULT_FIELDS, '$.result')
    ];
    for (const field of unknown) {
        if (typeof onTelemetry === 'function') {
            onTelemetry({ event: 'monte_carlo_unknown_field_ignored', field });
        }
    }
    const deprecatedAliases = collectMonteCarloLegacyAliasTelemetryV1(parsed, onTelemetry);
    return deepFreezeMonteCarloContract({
        document: parsed,
        compatibility: {
            unknownFields: unknown,
            deprecatedAliases
        }
    });
}

export function serializeMonteCarloExportV1(document) {
    validateMonteCarloExportV1(document);
    return JSON.stringify(JSON.parse(canonicalizeHistoricalContractValue(document)), null, 2);
}

export function createMonteCarloExportDownload({
    request,
    result,
    engine = null,
    app = MONTE_CARLO_APP_VERSION,
    exportedAt = new Date()
} = {}) {
    const document = buildMonteCarloExportV1({ request, result, engine, app, exportedAt });
    const safeTimestamp = document.exportedAtUtc.replace(/[:.]/g, '-');
    const fingerprint = document.fingerprint.value.slice(0, 12);
    return deepFreezeMonteCarloContract({
        filename: `monte-carlo-${fingerprint}-${safeTimestamp}.json`,
        mimeType: 'application/json',
        content: serializeMonteCarloExportV1(document),
        fingerprint: document.fingerprint,
        runId: document.identifiers.runId
    });
}
