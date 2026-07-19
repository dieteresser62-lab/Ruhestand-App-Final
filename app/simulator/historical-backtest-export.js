"use strict";

import {
    canonicalizeHistoricalContractValue,
    sha256Hex
} from './historical-backtest-contract.js';
import { BACKTEST_RESULT_SCHEMA_VERSION } from './historical-backtest-runner.js';

export const HISTORICAL_BACKTEST_EXPORT_SCHEMA_ID = 'de.ruhestandsapp.historical-backtest.raw';
export const HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION = 'HistoricalBacktestExportV1';
export const HISTORICAL_BACKTEST_CSV_SCHEMA_VERSION = 'HistoricalBacktestCsvV1';
export const HISTORICAL_BACKTEST_FINGERPRINT_ALGORITHM = 'sha256-canonical-json-v1';
export const HISTORICAL_BACKTEST_CSV_CONTRACT = Object.freeze({
    delimiter: ';',
    decimalSeparator: '.',
    numberEncoding: 'ecmascript-shortest-roundtrip-no-grouping',
    missingValue: '',
    lineEnding: 'LF',
    formulaInjectionProtection: 'prefix-apostrophe-for-leading-equals-plus-minus-at-tab-or-cr'
});

const OMIT = Symbol('omit');
const FORBIDDEN_DIAGNOSTIC_KEYS = new Set(['stack', 'cause']);

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

function toJsonValue(value, { omitDiagnosticKeys = false } = {}, seen = new WeakSet()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new TypeError('Historical backtest export only supports finite numbers');
        }
        return Object.is(value, -0) ? 0 : value;
    }
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') return OMIT;
    if (typeof value === 'bigint') {
        throw new TypeError('Historical backtest export does not support bigint values');
    }
    if (value instanceof Date) return value.toISOString();
    if (seen.has(value)) {
        throw new TypeError('Historical backtest export does not support cyclic values');
    }
    seen.add(value);
    if (Array.isArray(value)) {
        const array = value.map(item => {
            const normalized = toJsonValue(item, { omitDiagnosticKeys }, seen);
            return normalized === OMIT ? null : normalized;
        });
        seen.delete(value);
        return array;
    }
    const normalized = {};
    for (const key of Object.keys(value)) {
        if (omitDiagnosticKeys && FORBIDDEN_DIAGNOSTIC_KEYS.has(key)) continue;
        const child = toJsonValue(value[key], { omitDiagnosticKeys }, seen);
        if (child !== OMIT) normalized[key] = child;
    }
    seen.delete(value);
    return normalized;
}

function requireBacktestResult(result) {
    if (!result || typeof result !== 'object' || result.schemaVersion !== BACKTEST_RESULT_SCHEMA_VERSION) {
        throw new TypeError(`Historical backtest export requires ${BACKTEST_RESULT_SCHEMA_VERSION}`);
    }
    if (!result.request || typeof result.request !== 'object') {
        throw new TypeError('Historical backtest export requires result.request');
    }
    if (!result.outcome || typeof result.outcome.kind !== 'string') {
        throw new TypeError('Historical backtest export requires result.outcome.kind');
    }
    return result;
}

function sanitizeError(error) {
    if (!error || typeof error !== 'object') return null;
    return {
        code: typeof error.code === 'string' ? error.code : 'BACKTEST_ERROR_UNSPECIFIED',
        message: typeof error.message === 'string' ? error.message : 'Der Backtest wurde mit einem Fehler beendet.'
    };
}

function sanitizeOutcome(outcome) {
    const normalized = toJsonValue(outcome, { omitDiagnosticKeys: true });
    if (normalized.error) normalized.error = sanitizeError(normalized.error);
    return normalized;
}

function normalizeExportedAt(exportedAt) {
    const date = exportedAt instanceof Date ? exportedAt : new Date(exportedAt);
    if (!Number.isFinite(date.getTime())) {
        throw new TypeError('Historical backtest export requires a valid exportedAt value');
    }
    return date.toISOString();
}

function buildPortfolioSnapshots(result) {
    if (result.portfolioSnapshots && typeof result.portfolioSnapshots === 'object') {
        return toJsonValue(result.portfolioSnapshots);
    }
    return {
        start: result.portfolioStart == null ? null : { totalNominalEur: result.portfolioStart },
        end: result.portfolioEnd == null ? null : { totalNominalEur: result.portfolioEnd }
    };
}

function buildCanonicalExportResult(result, cohortInventory) {
    const error = sanitizeError(result.error || result.outcome?.error);
    const rows = toJsonValue(Array.isArray(result.rows) ? result.rows : []);
    const firstYear = Number.isInteger(result.firstYear)
        ? result.firstYear
        : (Number.isInteger(rows[0]?.jahr) ? rows[0].jahr : null);
    const safeCohortInventory = cohortInventory == null
        ? (result.cohortInventory == null ? null : toJsonValue(result.cohortInventory))
        : toJsonValue(cohortInventory);

    return {
        schemaVersion: result.schemaVersion,
        outcome: sanitizeOutcome(result.outcome),
        warnings: toJsonValue(Array.isArray(result.warnings) ? result.warnings : [], { omitDiagnosticKeys: true }),
        error,
        requestedYears: result.requestedYears ?? null,
        completedYears: result.completedYears ?? 0,
        firstYear,
        lastCompletedYear: result.lastCompletedYear ?? null,
        ruinYear: result.ruinYear ?? result.outcome?.ruinYear ?? null,
        breakOnRuin: Boolean(result.breakOnRuin),
        dataStatus: result.dataStatus ?? null,
        incompleteReason: result.incompleteReason == null
            ? null
            : toJsonValue(result.incompleteReason, { omitDiagnosticKeys: true }),
        provenance: {
            dataset: toJsonValue(result.request.dataset || null),
            temporalConventionId: result.request.temporalConventionId ?? null,
            engine: toJsonValue(result.request.engine || null)
        },
        portfolioSnapshots: buildPortfolioSnapshots(result),
        historicalYearRecords: toJsonValue(Array.isArray(result.historicalYearRecords)
            ? result.historicalYearRecords
            : []),
        rows,
        metrics: toJsonValue(result.metrics || null),
        summary: toJsonValue(result.summary || null),
        cohortInventory: safeCohortInventory
    };
}

export function captureHistoricalBacktestEngineProvenance(engineApi) {
    let version = null;
    let config = null;
    try {
        version = typeof engineApi?.getVersion === 'function' ? engineApi.getVersion() : null;
        config = typeof engineApi?.getConfig === 'function' ? engineApi.getConfig() : null;
    } catch {
        version = null;
        config = null;
    }
    return deepFreeze({
        apiVersion: typeof version?.api === 'string' ? version.api : null,
        buildId: typeof version?.build === 'string' ? version.build : null,
        configFingerprint: config == null
            ? null
            : {
                algorithm: HISTORICAL_BACKTEST_FINGERPRINT_ALGORITHM,
                value: sha256Hex(canonicalizeHistoricalContractValue(config))
            }
    });
}

export function buildHistoricalBacktestRawExport(result, {
    exportedAt = new Date(),
    cohortInventory = null
} = {}) {
    requireBacktestResult(result);
    const request = toJsonValue(result.request);
    const canonicalResult = buildCanonicalExportResult(result, cohortInventory);
    const requestFingerprint = sha256Hex(canonicalizeHistoricalContractValue(request));
    const fingerprintBasis = {
        schemaId: HISTORICAL_BACKTEST_EXPORT_SCHEMA_ID,
        schemaVersion: HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION,
        request,
        result: canonicalResult
    };
    const resultFingerprint = sha256Hex(canonicalizeHistoricalContractValue(fingerprintBasis));

    return deepFreeze({
        schemaId: HISTORICAL_BACKTEST_EXPORT_SCHEMA_ID,
        schemaVersion: HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION,
        exportedAt: normalizeExportedAt(exportedAt),
        identifiers: {
            requestId: `btrq_${requestFingerprint}`,
            runId: `btrun_${resultFingerprint}`
        },
        fingerprint: {
            algorithm: HISTORICAL_BACKTEST_FINGERPRINT_ALGORITHM,
            value: resultFingerprint,
            excludes: ['exportedAt', 'identifiers', 'exportContract', 'diagnostics']
        },
        request,
        result: canonicalResult,
        exportContract: {
            sourceResultSchemaVersion: BACKTEST_RESULT_SCHEMA_VERSION,
            canonicalization: HISTORICAL_BACKTEST_FINGERPRINT_ALGORITHM,
            excludedResultFields: ['diagnostics'],
            numericValues: 'finite JSON numbers; no display formatting',
            privacyNotice: 'Der Export enthaelt die vollstaendigen lokalen Simulationsannahmen und wird nur durch eine explizite Nutzeraktion erzeugt.'
        }
    });
}

function stringifyCanonicalExportDocument(document) {
    return JSON.stringify(JSON.parse(canonicalizeHistoricalContractValue(document)), null, 2);
}

export function serializeHistoricalBacktestJson(result, options = {}) {
    return stringifyCanonicalExportDocument(buildHistoricalBacktestRawExport(result, options));
}

function finiteOrNull(...values) {
    const match = values.find(value => typeof value === 'number' && Number.isFinite(value));
    return match ?? null;
}

function recordForYear(recordsByYear, year) {
    return Number.isInteger(year) ? recordsByYear.get(year) || null : null;
}

export const HISTORICAL_BACKTEST_CSV_COLUMNS = deepFreeze([
    { id: 'simulation_year_calendar_year', read: ({ entry }) => entry?.jahr ?? null },
    { id: 'outcome_code', read: ({ result }) => result.outcome?.kind ?? '' },
    { id: 'action_code', read: ({ entry }) => entry?.row?.aktionUndGrund ?? '' },
    { id: 'cut_reason_code', read: ({ entry }) => entry?.row?.CutReason ?? '' },
    { id: 'minimum_flex_status_code', read: ({ entry }) => entry?.row?.minimumFlexStatus ?? '' },
    { id: 'equity_return_ratio', read: ({ record }) => record?.realized?.equityReturn?.value ?? null },
    { id: 'gold_return_pct', read: ({ record }) => record?.realized?.goldReturn?.value ?? null },
    { id: 'cash_bond_return_pct', read: ({ record }) => record?.realized?.cashBondReturn?.value ?? null },
    { id: 'inflation_pct', read: ({ record }) => record?.realized?.inflation?.value ?? null },
    { id: 'wage_pension_adjustment_pct', read: ({ record }) => record?.realized?.wagePensionAdjustment?.value ?? null },
    { id: 'cape_ratio', read: ({ record }) => record?.decisionAsOf?.capeRatio?.value ?? null },
    { id: 'withdrawal_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.entscheidung?.jahresEntnahme, entry?.row?.entnahme_effektiv) },
    { id: 'floor_required_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.floor_brutto) },
    { id: 'pension_total_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.renteSum) },
    { id: 'flex_fulfilled_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.flex_erfuellt_nominal) },
    { id: 'minimum_flex_annual_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.minimumFlexAnnual) },
    { id: 'flex_reduction_pct', read: ({ entry }) => finiteOrNull(entry?.entscheidung?.kuerzungProzent) },
    { id: 'portfolio_equity_end_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.wertAktien, entry?.row?.wertAktien) },
    { id: 'portfolio_gold_end_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.wertGold, entry?.row?.wertGold) },
    { id: 'portfolio_cash_end_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.liquiditaet, entry?.row?.liquiditaet) },
    { id: 'health_bucket_end_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.health_bucket_end) },
    { id: 'portfolio_total_end_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.portfolio_total_end) },
    { id: 'tax_total_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.steuern_gesamt) },
    { id: 'loss_carry_end_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.lossCarryEnd) },
    { id: 'floor_shortfall_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.floor_shortfall_nominal) }
]);

function escapeCsvCell(value) {
    if (value == null) return HISTORICAL_BACKTEST_CSV_CONTRACT.missingValue;
    let text = typeof value === 'number'
        ? (Object.is(value, -0) ? '0' : String(value))
        : String(value);
    if (typeof value !== 'number' && /^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /["\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeHistoricalBacktestCsv(result) {
    requireBacktestResult(result);
    const rows = Array.isArray(result.rows) ? result.rows : [];
    const exportRows = rows.length > 0 ? rows : [null];
    const recordsByYear = new Map((Array.isArray(result.historicalYearRecords)
        ? result.historicalYearRecords
        : []).map(record => [record.simulationYear, record]));
    const header = HISTORICAL_BACKTEST_CSV_COLUMNS.map(column => column.id).join(HISTORICAL_BACKTEST_CSV_CONTRACT.delimiter);
    const lines = exportRows.map(entry => {
        const context = {
            result,
            entry,
            record: recordForYear(recordsByYear, entry?.jahr)
        };
        return HISTORICAL_BACKTEST_CSV_COLUMNS
            .map(column => escapeCsvCell(column.read(context)))
            .join(HISTORICAL_BACKTEST_CSV_CONTRACT.delimiter);
    });
    return [header, ...lines].join('\n');
}

export function createHistoricalBacktestDownload(result, format = 'json', options = {}) {
    const exportedAt = normalizeExportedAt(options.exportedAt ?? new Date());
    const rawDocument = buildHistoricalBacktestRawExport(result, {
        exportedAt,
        cohortInventory: options.cohortInventory ?? null
    });
    const extension = format === 'csv' ? 'csv' : 'json';
    if (!['json', 'csv'].includes(format)) {
        throw new TypeError(`Unsupported historical backtest export format: ${String(format)}`);
    }
    const timestamp = exportedAt.replace(/[:]/g, '-');
    const period = `${result.request.startYear ?? 'unknown'}-${result.request.endYear ?? 'unknown'}`;
    const fingerprint = rawDocument.fingerprint.value.slice(0, 12);
    return deepFreeze({
        filename: `backtest-${period}-${fingerprint}-${timestamp}.${extension}`,
        content: format === 'json' ? stringifyCanonicalExportDocument(rawDocument) : serializeHistoricalBacktestCsv(result),
        mimeType: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
        fingerprint: rawDocument.fingerprint
    });
}
