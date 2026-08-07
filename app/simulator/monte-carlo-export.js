"use strict";

import {
    MONTE_CARLO_FINGERPRINT_ALGORITHM,
    MONTE_CARLO_LEGACY_READ_ALIASES,
    MONTE_CARLO_RUN_REQUEST_VERSION,
    MONTE_CARLO_RUN_RESULT_VERSION,
    MONTE_CARLO_RUN_RESULT_V2_VERSION,
    MONTE_CARLO_SNAPSHOT_POLICY,
    collectMonteCarloLegacyAliasTelemetryV1,
    deepFreezeMonteCarloContract,
    fingerprintMonteCarloValue,
    normalizeMonteCarloJsonValue,
    validateMonteCarloRunRequestV1,
    validateMonteCarloRunResultV1,
    validateMonteCarloRunResultV2,
    projectMonteCarloRunResultV2
} from './monte-carlo-contracts.js';
import {
    canonicalizeHistoricalContractValue,
    sha256Hex
} from './historical-backtest-contract.js';

export const MONTE_CARLO_EXPORT_SCHEMA_ID = 'de.ruhestandsapp.monte-carlo.run';
export const MONTE_CARLO_EXPORT_V1_VERSION = 'MonteCarloExportV1';
// Deprecated compatibility name: prior consumers used the unqualified
// constant for V1. New code must select an explicit version constant.
export const MONTE_CARLO_EXPORT_VERSION = MONTE_CARLO_EXPORT_V1_VERSION;
export const MONTE_CARLO_EXPORT_V2_VERSION = 'MonteCarloExportV2';
export const SCENARIO_LOG_EXPORT_VERSION = 'ScenarioLogExportV2';
export const SCENARIO_LOG_UNIT_CONTRACT_VERSION = 'ScenarioLogUnitContractV2';
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

function exportError(code, message, version = MONTE_CARLO_EXPORT_V1_VERSION) {
    const error = new TypeError(`${version}: ${message}`);
    error.code = code;
    return error;
}

function normalizeExportedAt(value, version = MONTE_CARLO_EXPORT_V1_VERSION) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) {
        throw exportError('MC_EXPORT_TIMESTAMP_INVALID', 'exportedAtUtc must be a valid UTC timestamp.', version);
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

function requireObject(value, field, version = MONTE_CARLO_EXPORT_V1_VERSION) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw exportError('MC_EXPORT_REQUIRED_OBJECT', `${field} must be an object.`, version);
    }
    return value;
}

function requireString(value, field, version = MONTE_CARLO_EXPORT_V1_VERSION) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw exportError('MC_EXPORT_REQUIRED_STRING', `${field} must be a non-empty string.`, version);
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
        schemaVersion: MONTE_CARLO_EXPORT_V1_VERSION,
        exportedAtUtc: normalizeExportedAt(exportedAt, MONTE_CARLO_EXPORT_V2_VERSION),
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
    if (document.schemaVersion !== MONTE_CARLO_EXPORT_V1_VERSION) {
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

function normalizeSource(source, code = 'MC_EXPORT_JSON_INVALID', version = MONTE_CARLO_EXPORT_V2_VERSION) {
    try {
        return typeof source === 'string' ? JSON.parse(source) : source;
    } catch {
        throw exportError(code, 'input is not valid JSON.', version);
    }
}

function buildExportEnvelopeV2({ request, result, engine, app, exportedAt }) {
    validateMonteCarloRunRequestV1(request);
    const resultV2 = result?.schemaVersion === MONTE_CARLO_RUN_RESULT_VERSION
        ? projectMonteCarloRunResultV2(result)
        : result;
    validateMonteCarloRunResultV2(resultV2);
    return {
        schemaId: MONTE_CARLO_EXPORT_SCHEMA_ID,
        schemaVersion: MONTE_CARLO_EXPORT_V2_VERSION,
        exportedAtUtc: normalizeExportedAt(exportedAt),
        app: normalizeMonteCarloJsonValue(app, { path: '$.app' }),
        engine: normalizeMonteCarloJsonValue(engine || {}, { path: '$.engine' }),
        snapshotPolicy: { ...MONTE_CARLO_SNAPSHOT_POLICY },
        request,
        result: resultV2
    };
}

export function buildMonteCarloExportV2({
    request,
    result,
    engine = null,
    app = MONTE_CARLO_APP_VERSION,
    exportedAt = new Date()
} = {}) {
    const base = buildExportEnvelopeV2({ request, result, engine, app, exportedAt });
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
            forwardPolicy: 'ignore-unknown-fields-after-v2-required-field-validation',
            unknownSchemaVersions: 'reject',
            readablePredecessors: [MONTE_CARLO_EXPORT_V1_VERSION],
            newExportsWriteDeprecatedAliases: false
        },
        privacy: {
            scope: 'only-the-normalized-scenario-used-by-this-run',
            excludes: ['local-filesystem-paths', 'secrets-and-credentials', 'unrelated-storage-records'],
            notice: 'Der Export enthaelt die vom Nutzer eingegebenen Annahmen dieses Simulationsszenarios und wird nur durch eine explizite Nutzeraktion heruntergeladen.'
        }
    };
    validateMonteCarloExportV2(document);
    return deepFreezeMonteCarloContract(document);
}

export function validateMonteCarloExportV2(document, { verifyFingerprint = true } = {}) {
    requireObject(document, 'document', MONTE_CARLO_EXPORT_V2_VERSION);
    if (document.schemaId !== MONTE_CARLO_EXPORT_SCHEMA_ID) {
        throw exportError('MC_EXPORT_SCHEMA_ID_UNSUPPORTED', `Unsupported schemaId ${String(document.schemaId)}.`, MONTE_CARLO_EXPORT_V2_VERSION);
    }
    if (document.schemaVersion !== MONTE_CARLO_EXPORT_V2_VERSION) {
        throw exportError('MC_EXPORT_VERSION_UNSUPPORTED', `Unsupported schemaVersion ${String(document.schemaVersion)}.`, MONTE_CARLO_EXPORT_V2_VERSION);
    }
    normalizeExportedAt(document.exportedAtUtc, MONTE_CARLO_EXPORT_V2_VERSION);
    const identifiers = requireObject(document.identifiers, 'identifiers', MONTE_CARLO_EXPORT_V2_VERSION);
    requireString(identifiers.requestId, 'identifiers.requestId', MONTE_CARLO_EXPORT_V2_VERSION);
    requireString(identifiers.runId, 'identifiers.runId', MONTE_CARLO_EXPORT_V2_VERSION);
    requireObject(document.app, 'app', MONTE_CARLO_EXPORT_V2_VERSION);
    requireString(document.app.applicationId, 'app.applicationId', MONTE_CARLO_EXPORT_V2_VERSION);
    requireString(document.app.packageVersion, 'app.packageVersion', MONTE_CARLO_EXPORT_V2_VERSION);
    requireObject(document.engine, 'engine', MONTE_CARLO_EXPORT_V2_VERSION);
    if (document.snapshotPolicy?.schemaVersion !== MONTE_CARLO_SNAPSHOT_POLICY.schemaVersion) {
        throw exportError('MC_EXPORT_SNAPSHOT_POLICY_UNSUPPORTED', 'snapshotPolicy is missing or incompatible.', MONTE_CARLO_EXPORT_V2_VERSION);
    }
    validateMonteCarloRunRequestV1(document.request);
    validateMonteCarloRunResultV2(document.result);
    const fingerprint = requireObject(document.fingerprint, 'fingerprint', MONTE_CARLO_EXPORT_V2_VERSION);
    if (fingerprint.algorithm !== MONTE_CARLO_FINGERPRINT_ALGORITHM) {
        throw exportError('MC_EXPORT_FINGERPRINT_ALGORITHM_UNSUPPORTED', 'fingerprint.algorithm is unsupported.', MONTE_CARLO_EXPORT_V2_VERSION);
    }
    if (verifyFingerprint) {
        const expected = fingerprintMonteCarloValue(fingerprintBasis(document)).value;
        if (fingerprint.value !== expected) {
            throw exportError('MC_EXPORT_FINGERPRINT_MISMATCH', 'fingerprint does not match request and result.', MONTE_CARLO_EXPORT_V2_VERSION);
        }
        if (identifiers.runId !== `mcrun_${expected}`
            || identifiers.requestId !== `mcrq_${fingerprintMonteCarloValue(document.request).value}`) {
            throw exportError('MC_EXPORT_IDENTIFIER_MISMATCH', 'identifiers do not match their canonical fingerprints.', MONTE_CARLO_EXPORT_V2_VERSION);
        }
    }
    if (document.compatibility?.forwardPolicy !== 'ignore-unknown-fields-after-v2-required-field-validation'
        || document.compatibility?.newExportsWriteDeprecatedAliases !== false) {
        throw exportError('MC_EXPORT_FORWARD_POLICY_INVALID', 'compatibility policy is missing or incompatible.', MONTE_CARLO_EXPORT_V2_VERSION);
    }
    requireObject(document.privacy, 'privacy', MONTE_CARLO_EXPORT_V2_VERSION);
    normalizeMonteCarloJsonValue(document, { path: '$' });
    return document;
}

export function readMonteCarloExportV2(source, { verifyFingerprint = true } = {}) {
    const parsed = normalizeSource(source);
    validateMonteCarloExportV2(parsed, { verifyFingerprint });
    return deepFreezeMonteCarloContract({
        document: parsed,
        compatibility: { unknownFields: [], deprecatedAliases: [] },
        compatibilityWarnings: []
    });
}

export function readMonteCarloExport(source, options = {}) {
    const parsed = normalizeSource(source);
    if (parsed?.schemaVersion === MONTE_CARLO_EXPORT_V1_VERSION) {
        const read = readMonteCarloExportV1(parsed, options);
        return deepFreezeMonteCarloContract({
            ...read,
            compatibilityWarnings: [{
                code: 'monte_carlo_v1_legacy_bin_and_unit_semantics',
                message: 'V1 beschreibt Heatmap-Intervalle, Ratio-/Prozentwerte und reale Drawdowns nicht mit dem V2-Messvertrag.'
            }]
        });
    }
    if (parsed?.schemaVersion === MONTE_CARLO_EXPORT_V2_VERSION) {
        return readMonteCarloExportV2(parsed, options);
    }
    throw exportError('MC_EXPORT_VERSION_UNSUPPORTED', `Unsupported schemaVersion ${String(parsed?.schemaVersion)}.`, MONTE_CARLO_EXPORT_V2_VERSION);
}

export function serializeMonteCarloExportV2(document) {
    validateMonteCarloExportV2(document);
    return JSON.stringify(JSON.parse(canonicalizeHistoricalContractValue(document)), null, 2);
}

const SCENARIO_RECORD_TYPES = new Set(['financial_year', 'terminal_ruin', 'terminal_death']);
const SCENARIO_V1_WARNING_CODES = Object.freeze([
    'scenario_log_v1_unversioned',
    'legacy_ratio_field_names',
    'legacy_withdrawal_rate_ambiguity',
    'legacy_terminal_rows_untyped',
    'legacy_minimum_flex_name_collision'
]);

function finiteOrNull(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function buildScenarioMeasurementMissingness(record, {
    financiallyEvaluable,
    withdrawalRatesApplicable,
    minimumFlexApplicable
}) {
    const groups = {
        returnRatios: {
            applicable: financiallyEvaluable,
            values: [
                record.realReturnEquityRatio,
                record.realReturnGoldRatio,
                record.nominalReturnEquityRatio,
                record.nominalReturnGoldRatio
            ]
        },
        withdrawalRates: {
            applicable: withdrawalRatesApplicable,
            values: [record.realizedWithdrawalRatePct, record.preDecisionWithdrawalRatePct]
        },
        minimumFlex: {
            applicable: minimumFlexApplicable,
            values: [
                record.minimumFlexConfiguredAnnualEur,
                record.minimumFlexPolicyEffectiveAnnualEur,
                record.minimumFlexFulfilledAnnualEur
            ]
        }
    };
    return Object.fromEntries(Object.entries(groups).map(([key, group]) => {
        const observations = group.applicable
            ? group.values.filter(value => value !== null).length
            : 0;
        return [key, {
            reason: !financiallyEvaluable
                ? 'not_applicable_terminal_record'
                : !group.applicable
                    ? 'not_applicable_accumulation_year'
                    : observations === group.values.length
                        ? null
                        : 'source_value_unobserved',
            observationCount: { observations }
        }];
    }));
}

function removeLegacyMinimumFlexCollision(base) {
    if (!base.entscheidung || typeof base.entscheidung !== 'object' || Array.isArray(base.entscheidung)
        || !base.entscheidung.details || typeof base.entscheidung.details !== 'object'
        || Array.isArray(base.entscheidung.details)) {
        return base;
    }
    const details = { ...base.entscheidung.details };
    delete details.minimumFlexEffectiveFinal;
    return {
        ...base,
        entscheidung: {
            ...base.entscheidung,
            details
        }
    };
}

function resolveMinimumFlexPolicyValue(row) {
    return finiteOrNull(
        row.minimumFlexPolicyEffectiveAnnualEur
        ?? row.entscheidung?.details?.minimumFlexEffectiveFinal
    );
}

function projectScenarioRecordV2(row, index) {
    requireObject(row, `records[${index}]`, SCENARIO_LOG_EXPORT_VERSION);
    if (!SCENARIO_RECORD_TYPES.has(row.recordType)) {
        throw exportError('SCENARIO_LOG_RECORD_TYPE_INVALID', `records[${index}].recordType is unsupported.`, SCENARIO_LOG_EXPORT_VERSION);
    }
    const financiallyEvaluable = row.recordType === 'financial_year';
    if (row.financiallyEvaluable !== financiallyEvaluable) {
        throw exportError('SCENARIO_LOG_FINANCIAL_APPLICABILITY_INVALID', `records[${index}].financiallyEvaluable conflicts with recordType.`, SCENARIO_LOG_EXPORT_VERSION);
    }
    const accumulationYear = financiallyEvaluable && row.Regime === 'accumulation';
    const withdrawalRatesApplicable = financiallyEvaluable && !accumulationYear;
    const minimumFlexApplicable = financiallyEvaluable && !accumulationYear;
    let base = { ...row };
    for (const field of [
        'RealReturnEquityPct',
        'RealReturnGoldPct',
        'NominalReturnEquityPct',
        'NominalReturnGoldPct',
        'entnahmequote',
        'QuoteEndPct',
        'minimumFlexAnnual',
        'minimumFlexEffectiveBefore',
        'minimumFlexEffectiveAfter',
        'minimumFlexEffectiveFinal',
        'minimumFlexPolicyEffectiveAnnualEur',
        'minimumFlexFulfilledAnnualEur',
        'financiallyEvaluable'
    ]) delete base[field];
    base = removeLegacyMinimumFlexCollision(base);
    const record = {
        ...base,
        recordType: row.recordType,
        financiallyEvaluable,
        realReturnEquityRatio: financiallyEvaluable ? finiteOrNull(row.RealReturnEquityPct) : null,
        realReturnGoldRatio: financiallyEvaluable ? finiteOrNull(row.RealReturnGoldPct) : null,
        nominalReturnEquityRatio: financiallyEvaluable ? finiteOrNull(row.NominalReturnEquityPct) : null,
        nominalReturnGoldRatio: financiallyEvaluable ? finiteOrNull(row.NominalReturnGoldPct) : null,
        realizedWithdrawalRatePct: withdrawalRatesApplicable && finiteOrNull(row.entnahmequote) !== null
            ? row.entnahmequote * 100
            : null,
        preDecisionWithdrawalRatePct: withdrawalRatesApplicable ? finiteOrNull(row.QuoteEndPct) : null,
        minimumFlexConfiguredAnnualEur: minimumFlexApplicable ? finiteOrNull(row.minimumFlexAnnual) : null,
        minimumFlexPolicyEffectiveAnnualEur: minimumFlexApplicable
            ? resolveMinimumFlexPolicyValue(row)
            : null,
        minimumFlexFulfilledAnnualEur: minimumFlexApplicable
            ? finiteOrNull(row.minimumFlexFulfilledAnnualEur ?? row.minimumFlexEffectiveFinal)
            : null
    };
    record.measurementMissingness = buildScenarioMeasurementMissingness(record, {
        financiallyEvaluable,
        withdrawalRatesApplicable,
        minimumFlexApplicable
    });
    return normalizeMonteCarloJsonValue(record, { path: `$.records[${index}]` });
}

function createScenarioLogUnitContractV2() {
    return {
        schemaVersion: SCENARIO_LOG_UNIT_CONTRACT_VERSION,
        ratioFields: {
            realReturnEquityRatio: 'unitless_ratio',
            realReturnGoldRatio: 'unitless_ratio',
            nominalReturnEquityRatio: 'unitless_ratio',
            nominalReturnGoldRatio: 'unitless_ratio'
        },
        percentagePointFields: {
            realizedWithdrawalRatePct: {
                numerator: 'actual_effective_annual_withdrawal',
                denominator: 'equity_bond_and_gold_tranches_excluding_liquidity_and_health_bucket',
                measurementTime: 'after_policy_transaction_and_actual_payout'
            },
            preDecisionWithdrawalRatePct: {
                numerator: 'preliminary_withdrawal_based_on_previous_year_flex_rate',
                denominator: 'equity_bond_and_gold_tranches_excluding_liquidity_and_health_bucket',
                measurementTime: 'before_transaction_and_payout',
                description: 'vorlaeufige Entnahme auf Basis der Vorjahres-Flexrate, vor Transaktions- und Auszahlungsphase; Nenner Depot ohne Liquiditaet und Health-Bucket'
            }
        },
        annualMoneyFields: {
            minimumFlexConfiguredAnnualEur: 'nominal_eur_per_year',
            minimumFlexPolicyEffectiveAnnualEur: 'nominal_eur_per_year_after_policy',
            minimumFlexFulfilledAnnualEur: 'nominal_eur_per_year_actual_fulfilment'
        },
        terminalRecordPolicy: 'financial_measurements_null_with_reason_and_observation_count'
    };
}

export function projectScenarioLogV2(rows) {
    if (!Array.isArray(rows)) {
        throw exportError('SCENARIO_LOG_ROWS_INVALID', 'rows must be an array.', SCENARIO_LOG_EXPORT_VERSION);
    }
    const document = {
        schemaVersion: SCENARIO_LOG_EXPORT_VERSION,
        unitContract: createScenarioLogUnitContractV2(),
        materializationContract: {
            scope: 'single_selected_scenario_path',
            input: 'already_materialized_and_request_horizon_bounded',
            streaming: false
        },
        records: rows.map(projectScenarioRecordV2)
    };
    validateScenarioLogExportV2(document);
    return deepFreezeMonteCarloContract(document);
}

export function validateScenarioLogExportV2(document) {
    requireObject(document, 'document', SCENARIO_LOG_EXPORT_VERSION);
    if (document.schemaVersion !== SCENARIO_LOG_EXPORT_VERSION) {
        throw exportError('SCENARIO_LOG_VERSION_UNSUPPORTED', `Unsupported schemaVersion ${String(document.schemaVersion)}.`, SCENARIO_LOG_EXPORT_VERSION);
    }
    const unitContract = document.unitContract;
    if (unitContract?.schemaVersion !== SCENARIO_LOG_UNIT_CONTRACT_VERSION
        || unitContract.ratioFields?.realReturnEquityRatio !== 'unitless_ratio'
        || unitContract.ratioFields?.realReturnGoldRatio !== 'unitless_ratio'
        || unitContract.ratioFields?.nominalReturnEquityRatio !== 'unitless_ratio'
        || unitContract.ratioFields?.nominalReturnGoldRatio !== 'unitless_ratio'
        || unitContract.percentagePointFields?.realizedWithdrawalRatePct?.numerator !== 'actual_effective_annual_withdrawal'
        || unitContract.percentagePointFields?.realizedWithdrawalRatePct?.denominator !== 'equity_bond_and_gold_tranches_excluding_liquidity_and_health_bucket'
        || unitContract.percentagePointFields?.realizedWithdrawalRatePct?.measurementTime !== 'after_policy_transaction_and_actual_payout'
        || unitContract.percentagePointFields?.preDecisionWithdrawalRatePct?.numerator !== 'preliminary_withdrawal_based_on_previous_year_flex_rate'
        || unitContract.percentagePointFields?.preDecisionWithdrawalRatePct?.denominator !== 'equity_bond_and_gold_tranches_excluding_liquidity_and_health_bucket'
        || unitContract.percentagePointFields?.preDecisionWithdrawalRatePct?.measurementTime !== 'before_transaction_and_payout'
        || unitContract.percentagePointFields?.preDecisionWithdrawalRatePct?.description !== 'vorlaeufige Entnahme auf Basis der Vorjahres-Flexrate, vor Transaktions- und Auszahlungsphase; Nenner Depot ohne Liquiditaet und Health-Bucket'
        || unitContract.annualMoneyFields?.minimumFlexConfiguredAnnualEur !== 'nominal_eur_per_year'
        || unitContract.annualMoneyFields?.minimumFlexPolicyEffectiveAnnualEur !== 'nominal_eur_per_year_after_policy'
        || unitContract.annualMoneyFields?.minimumFlexFulfilledAnnualEur !== 'nominal_eur_per_year_actual_fulfilment'
        || unitContract.terminalRecordPolicy !== 'financial_measurements_null_with_reason_and_observation_count') {
        throw exportError('SCENARIO_LOG_UNIT_CONTRACT_INVALID', 'unitContract is missing or incompatible.', SCENARIO_LOG_EXPORT_VERSION);
    }
    if (document.materializationContract?.scope !== 'single_selected_scenario_path'
        || document.materializationContract?.input !== 'already_materialized_and_request_horizon_bounded'
        || document.materializationContract?.streaming !== false) {
        throw exportError('SCENARIO_LOG_MATERIALIZATION_CONTRACT_INVALID', 'materializationContract is missing or incompatible.', SCENARIO_LOG_EXPORT_VERSION);
    }
    if (!Array.isArray(document.records)) {
        throw exportError('SCENARIO_LOG_RECORDS_INVALID', 'records must be an array.', SCENARIO_LOG_EXPORT_VERSION);
    }
    for (const [index, record] of document.records.entries()) {
        requireObject(record, `records[${index}]`, SCENARIO_LOG_EXPORT_VERSION);
        if (!SCENARIO_RECORD_TYPES.has(record.recordType)
            || record.financiallyEvaluable !== (record.recordType === 'financial_year')) {
            throw exportError('SCENARIO_LOG_RECORD_TYPE_INVALID', `records[${index}] has an invalid type or applicability.`, SCENARIO_LOG_EXPORT_VERSION);
        }
        for (const field of [
            'realReturnEquityRatio',
            'realReturnGoldRatio',
            'nominalReturnEquityRatio',
            'nominalReturnGoldRatio',
            'realizedWithdrawalRatePct',
            'preDecisionWithdrawalRatePct',
            'minimumFlexConfiguredAnnualEur',
            'minimumFlexPolicyEffectiveAnnualEur',
            'minimumFlexFulfilledAnnualEur'
        ]) {
            const value = record[field];
            if (value !== null && !Number.isFinite(value)) {
                throw exportError('SCENARIO_LOG_MEASUREMENT_INVALID', `records[${index}].${field} must be finite or null.`, SCENARIO_LOG_EXPORT_VERSION);
            }
            if (!record.financiallyEvaluable && value !== null) {
                throw exportError('SCENARIO_LOG_TERMINAL_MEASUREMENT_INVALID', `records[${index}].${field} must be null for terminal records.`, SCENARIO_LOG_EXPORT_VERSION);
            }
        }
        const measurementMissingness = requireObject(record.measurementMissingness, `records[${index}].measurementMissingness`, SCENARIO_LOG_EXPORT_VERSION);
        const accumulationYear = record.financiallyEvaluable && record.Regime === 'accumulation';
        const measurementGroups = {
            returnRatios: {
                applicable: record.financiallyEvaluable,
                values: [
                    record.realReturnEquityRatio,
                    record.realReturnGoldRatio,
                    record.nominalReturnEquityRatio,
                    record.nominalReturnGoldRatio
                ]
            },
            withdrawalRates: {
                applicable: record.financiallyEvaluable && !accumulationYear,
                values: [record.realizedWithdrawalRatePct, record.preDecisionWithdrawalRatePct]
            },
            minimumFlex: {
                applicable: record.financiallyEvaluable && !accumulationYear,
                values: [
                    record.minimumFlexConfiguredAnnualEur,
                    record.minimumFlexPolicyEffectiveAnnualEur,
                    record.minimumFlexFulfilledAnnualEur
                ]
            }
        };
        for (const [group, measurement] of Object.entries(measurementGroups)) {
            const state = requireObject(measurementMissingness[group], `records[${index}].measurementMissingness.${group}`, SCENARIO_LOG_EXPORT_VERSION);
            if (state.reason !== null) {
                requireString(state.reason, `records[${index}].measurementMissingness.${group}.reason`, SCENARIO_LOG_EXPORT_VERSION);
            }
            const count = state?.observationCount?.observations;
            if (!Number.isSafeInteger(count) || count < 0) {
                throw exportError('SCENARIO_LOG_OBSERVATION_COUNT_INVALID', `records[${index}].measurementMissingness.${group} has an invalid count.`, SCENARIO_LOG_EXPORT_VERSION);
            }
            if (!record.financiallyEvaluable
                && (state.reason !== 'not_applicable_terminal_record' || count !== 0)) {
                throw exportError('SCENARIO_LOG_TERMINAL_MISSINGNESS_INVALID', `records[${index}].measurementMissingness.${group} is inconsistent.`, SCENARIO_LOG_EXPORT_VERSION);
            }
            if (record.financiallyEvaluable && !measurement.applicable) {
                if (measurement.values.some(value => value !== null)
                    || state.reason !== 'not_applicable_accumulation_year' || count !== 0) {
                    throw exportError('SCENARIO_LOG_ACCUMULATION_MISSINGNESS_INVALID', `records[${index}].measurementMissingness.${group} is inconsistent.`, SCENARIO_LOG_EXPORT_VERSION);
                }
            } else if (record.financiallyEvaluable) {
                const expectedCount = measurement.values.filter(value => value !== null).length;
                const expectedReason = expectedCount === measurement.values.length ? null : 'source_value_unobserved';
                if (count !== expectedCount || state.reason !== expectedReason) {
                    throw exportError('SCENARIO_LOG_MISSINGNESS_INVALID', `records[${index}].measurementMissingness.${group} is inconsistent with its measurements.`, SCENARIO_LOG_EXPORT_VERSION);
                }
            }
        }
    }
    normalizeMonteCarloJsonValue(document, { path: '$.scenarioLog' });
    return document;
}

export function serializeScenarioLogExportV2(document) {
    validateScenarioLogExportV2(document);
    return JSON.stringify(JSON.parse(canonicalizeHistoricalContractValue(document)), null, 2);
}

function csvCellV2(value) {
    let text;
    if (value === null || value === undefined) text = '';
    else if (typeof value === 'object') text = canonicalizeHistoricalContractValue(value);
    else text = String(value);
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeScenarioLogCsvV2(document) {
    validateScenarioLogExportV2(document);
    const rows = document.records.map(record => ({
        ...record,
        scenarioLogSchemaVersion: document.schemaVersion,
        unitContractVersion: document.unitContract.schemaVersion
    }));
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))].sort();
    return [
        headers.map(csvCellV2).join(';'),
        ...rows.map(row => headers.map(header => csvCellV2(row[header])).join(';'))
    ].join('\r\n');
}

export function readScenarioLogExport(source) {
    const parsed = normalizeSource(source, 'SCENARIO_LOG_JSON_INVALID', SCENARIO_LOG_EXPORT_VERSION);
    if (Array.isArray(parsed)) {
        return deepFreezeMonteCarloContract({
            document: {
                schemaVersion: 'ScenarioLogV1Unversioned',
                records: parsed
            },
            compatibilityWarnings: SCENARIO_V1_WARNING_CODES.map(code => ({ code }))
        });
    }
    if (parsed?.schemaVersion === SCENARIO_LOG_EXPORT_VERSION) {
        validateScenarioLogExportV2(parsed);
        return deepFreezeMonteCarloContract({ document: parsed, compatibilityWarnings: [] });
    }
    throw exportError('SCENARIO_LOG_VERSION_UNSUPPORTED', `Unsupported schemaVersion ${String(parsed?.schemaVersion)}.`, SCENARIO_LOG_EXPORT_VERSION);
}

export function createMonteCarloExportDownload({
    request,
    result,
    engine = null,
    app = MONTE_CARLO_APP_VERSION,
    exportedAt = new Date()
} = {}) {
    const document = buildMonteCarloExportV2({ request, result, engine, app, exportedAt });
    const safeTimestamp = document.exportedAtUtc.replace(/[:.]/g, '-');
    const fingerprint = document.fingerprint.value.slice(0, 12);
    return deepFreezeMonteCarloContract({
        filename: `monte-carlo-${fingerprint}-${safeTimestamp}.json`,
        mimeType: 'application/json',
        content: serializeMonteCarloExportV2(document),
        fingerprint: document.fingerprint,
        runId: document.identifiers.runId
    });
}
