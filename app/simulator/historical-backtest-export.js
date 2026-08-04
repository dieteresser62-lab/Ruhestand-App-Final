"use strict";

import {
    canonicalizeHistoricalContractValue,
    sha256Hex
} from './historical-backtest-contract.js';
import { BACKTEST_RESULT_SCHEMA_VERSION } from './historical-backtest-runner.js';
import { normalizeRuntimeBuildProvenance } from '../shared/runtime-build-provenance.js';

export const HISTORICAL_BACKTEST_EXPORT_SCHEMA_ID = 'de.ruhestandsapp.historical-backtest.raw';
export const HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION = 'HistoricalBacktestExportV2';
export const HISTORICAL_BACKTEST_CSV_SCHEMA_VERSION = 'HistoricalBacktestCsvV2';
export const HISTORICAL_BACKTEST_FINGERPRINT_ALGORITHM = 'sha256-canonical-json-v1';
export const HISTORICAL_BACKTEST_RUN_ID_ALGORITHM = 'sha256-canonical-run-identity-v1';
export const HISTORICAL_BACKTEST_PORTFOLIO_BOUNDARY_SCHEMA_VERSION = 'HistoricalBacktestPortfolioBoundariesV2';
export const HISTORICAL_BACKTEST_INPUT_SEMANTICS_SCHEMA_VERSION = 'HistoricalBacktestInputSemanticsV2';
export const HISTORICAL_BACKTEST_QUANTIZATION_SCHEMA_VERSION = 'HistoricalBacktestQuantizationContractV1';
export const HISTORICAL_BACKTEST_CSV_CONTRACT = Object.freeze({
    delimiter: ';',
    decimalSeparator: '.',
    numberEncoding: 'ecmascript-shortest-roundtrip-no-grouping',
    missingValue: '',
    lineEnding: 'LF',
    formulaInjectionProtection: 'prefix-apostrophe-for-leading-equals-plus-minus-at-tab-or-cr'
});

export const HISTORICAL_BACKTEST_INPUT_SEMANTICS = Object.freeze({
    schemaVersion: HISTORICAL_BACKTEST_INPUT_SEMANTICS_SCHEMA_VERSION,
    zielLiquiditaet: Object.freeze({
        role: 'legacy_start_liquidity_alias',
        value: 'tagesgeld_plus_geldmarktEtf_at_run_start',
        not: 'strategy_target',
        strategyTargetSource: 'liquidityRunwayYears_and_year_specific_post_policy_planned_annual_net_withdrawal'
    }),
    capeRatio: Object.freeze({
        role: 'non_historical_ui_fallback',
        historicalBacktestEffect: 'none',
        canonicalHistoricalSource: 'result.historicalYearRecords[*].decisionAsOf.capeRatio'
    }),
    startVermoegen: Object.freeze({
        role: 'canonical_total_start_wealth',
        unit: 'EUR'
    }),
    geldmarktEtf: Object.freeze({
        role: 'start_wealth_component_money_market',
        unit: 'EUR',
        includedIn: ['startVermoegen', 'zielLiquiditaet']
    }),
    depotwertNeu: Object.freeze({
        role: 'derived_aggregate_when_no_detailed_lots_are_supplied',
        derivation: 'startVermoegen_minus_depotwertAlt_minus_tagesgeld_minus_geldmarktEtf_minus_gold_target',
        detailedLotSource: 'detailledTranches',
        missingFieldMeaning: 'derived_or_replaced_by_detailed_lots_not_zero'
    })
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

function exportContractError(code, message, details = {}) {
    const error = new TypeError(message);
    error.name = 'HistoricalBacktestExportError';
    error.code = code;
    error.details = Object.freeze({ ...details });
    return error;
}

function finiteNumberOrNull(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeQuantizationTiers(tiers) {
    if (!Array.isArray(tiers) || tiers.length === 0) return null;
    const normalized = tiers.map((tier, index) => {
        const step = finiteNumberOrNull(tier?.step);
        const limit = tier?.limit === Infinity ? null : finiteNumberOrNull(tier?.limit);
        if (!(step > 0)
            || (limit === null && tier?.limit !== Infinity)
            || (limit !== null && !(limit > 0))) return null;
        return {
            index: index + 1,
            upperBoundExclusive: limit,
            unbounded: limit === null,
            step
        };
    });
    return normalized.every(Boolean) ? normalized : null;
}

function captureQuantizationContract(config) {
    const policy = config?.ANTI_PSEUDO_ACCURACY;
    const annualTiers = normalizeQuantizationTiers(policy?.QUANTIZATION_TIERS);
    const monthlyTiers = normalizeQuantizationTiers(policy?.QUANTIZATION_TIERS_MONTHLY);
    const rounding = policy?.WITHDRAWAL_ROUNDING;
    if (!policy
        || typeof policy.ENABLED !== 'boolean'
        || !annualTiers
        || !monthlyTiers
        || rounding?.phase !== 'after_floor_plus_flex_decision_before_final_annual_withdrawal'
        || !['floor', 'ceil'].includes(rounding?.monthlyMode)
        || !Number.isInteger(rounding?.annualizationFactor)
        || rounding.annualizationFactor <= 0
        || rounding?.floorProtection !== 'max_floor_annual'
        || typeof policy.METRIC_DISPLAY_ROUNDING !== 'string'
        || policy.METRIC_DISPLAY_ROUNDING.trim() === '') return null;
    return {
        schemaVersion: HISTORICAL_BACKTEST_QUANTIZATION_SCHEMA_VERSION,
        enabled: policy.ENABLED,
        transactionAnnualTiers: annualTiers,
        withdrawalMonthlyTiers: monthlyTiers,
        withdrawalRounding: {
            phase: rounding.phase,
            monthlyMode: rounding.monthlyMode,
            annualizationFactor: rounding.annualizationFactor,
            floorProtection: rounding.floorProtection
        },
        metricDisplayRounding: policy.METRIC_DISPLAY_ROUNDING
    };
}

function isValidQuantizationTiers(tiers) {
    if (!Array.isArray(tiers) || tiers.length === 0) return false;
    let previousUpperBound = 0;
    return tiers.every((tier, index) => {
        if (tier?.index !== index + 1 || !(Number.isFinite(tier?.step) && tier.step > 0)) return false;
        const isLast = index === tiers.length - 1;
        if (tier.unbounded === true) return isLast && tier.upperBoundExclusive === null;
        if (tier.unbounded !== false
            || !(Number.isFinite(tier.upperBoundExclusive) && tier.upperBoundExclusive > previousUpperBound)) return false;
        previousUpperBound = tier.upperBoundExclusive;
        return true;
    }) && tiers.at(-1)?.unbounded === true;
}

function isValidQuantizationContract(contract) {
    const rounding = contract?.withdrawalRounding;
    return contract?.schemaVersion === HISTORICAL_BACKTEST_QUANTIZATION_SCHEMA_VERSION
        && typeof contract.enabled === 'boolean'
        && isValidQuantizationTiers(contract.transactionAnnualTiers)
        && isValidQuantizationTiers(contract.withdrawalMonthlyTiers)
        && rounding?.phase === 'after_floor_plus_flex_decision_before_final_annual_withdrawal'
        && ['floor', 'ceil'].includes(rounding?.monthlyMode)
        && Number.isInteger(rounding?.annualizationFactor)
        && rounding.annualizationFactor > 0
        && rounding?.floorProtection === 'max_floor_annual'
        && typeof contract.metricDisplayRounding === 'string'
        && contract.metricDisplayRounding.trim() !== '';
}

function validateEngineExportProvenance(engine) {
    const sourceCommit = String(engine?.sourceCommit || '').trim().toLowerCase();
    const sourceTreeStatus = String(engine?.sourceTreeStatus || '').trim().toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
        throw exportContractError(
            'HISTORICAL_EXPORT_SOURCE_COMMIT_REQUIRED',
            'Historical backtest export requires an exact 40-character source commit.'
        );
    }
    if (sourceTreeStatus !== 'clean') {
        throw exportContractError(
            'HISTORICAL_EXPORT_SOURCE_TREE_DIRTY',
            'Historical backtest export requires a clean source tree.',
            { sourceTreeStatus: sourceTreeStatus || 'missing' }
        );
    }
    if (!isValidQuantizationContract(engine?.quantizationContract)) {
        throw exportContractError(
            'HISTORICAL_EXPORT_QUANTIZATION_CONTRACT_REQUIRED',
            'Historical backtest export requires a complete captured engine quantization contract.'
        );
    }
}

function buildValidatedRequest(result) {
    const request = toJsonValue(result.request);
    request.engine = request.engine && typeof request.engine === 'object' ? request.engine : {};
    validateEngineExportProvenance(request.engine);
    return request;
}

function reconcileBoundaryTotal(result, metricId, evidenceValue, evidencePath) {
    const metricValue = finiteNumberOrNull(result?.metrics?.values?.[metricId]);
    const independentValue = finiteNumberOrNull(evidenceValue);
    if ((metricValue === null) !== (independentValue === null)
        || (metricValue !== null && Math.abs(metricValue - independentValue) > 1e-6)) {
        throw exportContractError(
            'HISTORICAL_EXPORT_PORTFOLIO_BOUNDARY_MISMATCH',
            `${metricId} does not reconcile with ${evidencePath}.`,
            { metricId, metricValue, evidencePath, evidenceValue: independentValue }
        );
    }
    return metricValue;
}

function buildPortfolioBoundaries(result) {
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const isFinancialOutcome = result?.outcome?.kind === 'completed' || result?.outcome?.kind === 'ruin';
    if (!isFinancialOutcome) {
        return {
            schemaVersion: HISTORICAL_BACKTEST_PORTFOLIO_BOUNDARY_SCHEMA_VERSION,
            restartable: false,
            canonicalFields: ['totalNominalEur'],
            totalComposition: {
                includes: ['active_portfolio', 'health_bucket'],
                healthBucketRelation: 'included_in_total_do_not_add'
            },
            omittedInternalState: [
                'portfolioSnapshots.start',
                'portfolioSnapshots.end',
                'portfolioSnapshots.*.detailledTranches',
                'simulation_lot_state'
            ],
            restartInstruction: 'Use a newly validated current input/profile snapshot; historical result boundaries are diagnostic aggregates only.',
            start: null,
            end: null
        };
    }
    const startTotal = reconcileBoundaryTotal(
        result,
        'wealth_start_nominal_eur',
        rows[0]?.row?.portfolio_total_start,
        'rows[0].row.portfolio_total_start'
    );
    const endTotal = reconcileBoundaryTotal(
        result,
        'wealth_end_nominal_eur',
        rows.at(-1)?.row?.portfolio_total_end,
        'rows[-1].row.portfolio_total_end'
    );
    return {
        schemaVersion: HISTORICAL_BACKTEST_PORTFOLIO_BOUNDARY_SCHEMA_VERSION,
        restartable: false,
        canonicalFields: ['totalNominalEur'],
        totalComposition: {
            includes: ['active_portfolio', 'health_bucket'],
            healthBucketRelation: 'included_in_total_do_not_add'
        },
        omittedInternalState: [
            'portfolioSnapshots.start',
            'portfolioSnapshots.end',
            'portfolioSnapshots.*.detailledTranches',
            'simulation_lot_state'
        ],
        restartInstruction: 'Use a newly validated current input/profile snapshot; historical result boundaries are diagnostic aggregates only.',
        start: startTotal === null ? null : {
            totalNominalEur: startTotal,
            asOf: 'before_first_requested_year'
        },
        end: endTotal === null ? null : {
            totalNominalEur: endTotal,
            asOfYear: Number.isInteger(result?.lastCompletedYear) ? result.lastCompletedYear : null
        }
    };
}

function buildPeriodContract(result, request, rows) {
    const startYear = Number.isInteger(request?.startYear) ? request.startYear : null;
    const endYear = Number.isInteger(request?.endYear) ? request.endYear : null;
    const inclusiveYears = startYear !== null && endYear !== null && endYear >= startYear
        ? endYear - startYear + 1
        : null;
    const requestedYears = Number.isInteger(result?.requestedYears) ? result.requestedYears : null;
    if (inclusiveYears !== null && requestedYears !== null && inclusiveYears !== requestedYears) {
        throw exportContractError(
            'HISTORICAL_EXPORT_PERIOD_LENGTH_MISMATCH',
            'Historical backtest requestedYears does not match the inclusive calendar period.',
            { startYear, endYear, inclusiveYears, requestedYears }
        );
    }
    const completedYears = Number.isInteger(result?.completedYears) ? result.completedYears : 0;
    return {
        startYear,
        endYear,
        endpointConvention: 'inclusive_start_and_end_calendar_years',
        inclusiveYears,
        requestedYears,
        completedYears,
        emittedYearRows: rows.length,
        isCompleteCalendarWindow: result?.outcome?.kind === 'completed'
            && inclusiveYears !== null
            && completedYears === inclusiveYears
            && rows.length === inclusiveYears,
        projectionClaim: 'observed_requested_calendar_window_not_fixed_30_year_horizon'
    };
}

function buildCanonicalExportResult(result, cohortInventory, request) {
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
        period: buildPeriodContract(result, request, rows),
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
            dataset: toJsonValue(request.dataset || null),
            temporalConventionId: request.temporalConventionId ?? null,
            engine: toJsonValue(request.engine || null)
        },
        portfolioBoundaries: buildPortfolioBoundaries(result),
        historicalYearRecords: toJsonValue(Array.isArray(result.historicalYearRecords)
            ? result.historicalYearRecords
            : []),
        rows,
        metrics: toJsonValue(result.metrics || null),
        summary: toJsonValue(result.summary || null),
        cohortInventory: safeCohortInventory
    };
}

export function createHistoricalBacktestRunIdentity(result, { cohortInventory = null } = {}) {
    requireBacktestResult(result);
    const identityBasis = {
        algorithm: HISTORICAL_BACKTEST_RUN_ID_ALGORITHM,
        sourceResultSchemaVersion: result.schemaVersion,
        request: toJsonValue(result.request),
        outcome: sanitizeOutcome(result.outcome),
        rows: toJsonValue(Array.isArray(result.rows) ? result.rows : []),
        historicalYearRecords: toJsonValue(Array.isArray(result.historicalYearRecords)
            ? result.historicalYearRecords
            : []),
        metrics: toJsonValue(result.metrics || null),
        cohortInventory: cohortInventory == null ? null : toJsonValue(cohortInventory)
    };
    return `btrun_${sha256Hex(canonicalizeHistoricalContractValue(identityBasis))}`;
}

export function captureHistoricalBacktestEngineProvenance(engineApi, runtimeBuildProvenance = null) {
    let version = null;
    let config = null;
    try {
        version = typeof engineApi?.getVersion === 'function' ? engineApi.getVersion() : null;
        config = typeof engineApi?.getConfig === 'function' ? engineApi.getConfig() : null;
    } catch {
        version = null;
        config = null;
    }
    const runtime = normalizeRuntimeBuildProvenance(runtimeBuildProvenance);
    return deepFreeze({
        apiVersion: typeof version?.api === 'string' ? version.api : null,
        buildId: typeof version?.build === 'string' ? version.build : null,
        sourceCommit: runtime?.sourceCommit ?? null,
        sourceTreeStatus: runtime?.sourceTreeStatus ?? 'unavailable',
        sourceProvenanceProvider: runtime?.provider ?? null,
        configFingerprint: config == null
            ? null
            : {
                algorithm: HISTORICAL_BACKTEST_FINGERPRINT_ALGORITHM,
                value: sha256Hex(canonicalizeHistoricalContractValue(config))
            },
        quantizationContract: captureQuantizationContract(config)
    });
}

export function buildHistoricalBacktestRawExport(result, {
    exportedAt = new Date(),
    cohortInventory = null
} = {}) {
    requireBacktestResult(result);
    const request = buildValidatedRequest(result);
    const canonicalResult = buildCanonicalExportResult(result, cohortInventory, request);
    const contracts = {
        inputSemantics: HISTORICAL_BACKTEST_INPUT_SEMANTICS,
        flexReductionMaximum: {
            metricId: 'flex_reduction_max_pct',
            basis: canonicalResult.metrics?.flexBasisContract?.effective ?? null,
            basisConsistencyRequired: true,
            missingness: 'null_if_flex_haushalt_basis_is_missing_or_mixed',
            interpretation: 'maximum_household_flex_reduction_not_person_reduction'
        }
    };
    const requestFingerprint = sha256Hex(canonicalizeHistoricalContractValue(request));
    const fingerprintBasis = {
        schemaId: HISTORICAL_BACKTEST_EXPORT_SCHEMA_ID,
        schemaVersion: HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION,
        request,
        result: canonicalResult,
        contracts
    };
    const resultFingerprint = sha256Hex(canonicalizeHistoricalContractValue(fingerprintBasis));
    const runId = createHistoricalBacktestRunIdentity(result, { cohortInventory });

    return deepFreeze({
        schemaId: HISTORICAL_BACKTEST_EXPORT_SCHEMA_ID,
        schemaVersion: HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION,
        exportedAt: normalizeExportedAt(exportedAt),
        identifiers: {
            requestId: `btrq_${requestFingerprint}`,
            runId
        },
        fingerprint: {
            algorithm: HISTORICAL_BACKTEST_FINGERPRINT_ALGORITHM,
            value: resultFingerprint,
            excludes: ['exportedAt', 'identifiers', 'exportContract', 'diagnostics']
        },
        request,
        result: canonicalResult,
        contracts,
        exportContract: {
            sourceResultSchemaVersion: BACKTEST_RESULT_SCHEMA_VERSION,
            canonicalization: HISTORICAL_BACKTEST_FINGERPRINT_ALGORITHM,
            excludedResultFields: ['diagnostics'],
            excludedInternalPortfolioFields: ['portfolioSnapshots'],
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
    { id: 'run_id', read: ({ runId }) => runId },
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
    { id: 'flex_household_required_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.flex_brutto_haushalt) },
    { id: 'flex_pension_contribution_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.flex_rentenueberschuss) },
    { id: 'flex_required_from_portfolio_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.flex_aus_depot_bedarf) },
    { id: 'flex_fulfilled_from_portfolio_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.flex_aus_depot_erfuellt) },
    { id: 'flex_household_fulfilled_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.flex_haushalt_erfuellt) },
    { id: 'flex_household_reduction_pct', read: ({ entry }) => finiteOrNull(entry?.row?.flex_haushalt_kuerzung_pct) },
    { id: 'minimum_flex_annual_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.minimumFlexAnnual) },
    { id: 'minimum_flex_effective_final_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.minimumFlexEffectiveFinal) },
    { id: 'minimum_flex_shortfall_nominal_eur', read: ({ entry }) => finiteOrNull(entry?.row?.minimumFlexShortfallAnnual) },
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

export function serializeHistoricalBacktestCsv(result, { cohortInventory = null, runIdentity = null } = {}) {
    requireBacktestResult(result);
    const runId = runIdentity || createHistoricalBacktestRunIdentity(result, { cohortInventory });
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
            record: recordForYear(recordsByYear, entry?.jahr),
            runId
        };
        return HISTORICAL_BACKTEST_CSV_COLUMNS
            .map(column => escapeCsvCell(column.read(context)))
            .join(HISTORICAL_BACKTEST_CSV_CONTRACT.delimiter);
    });
    return [header, ...lines].join('\n');
}

export function createHistoricalBacktestDownload(result, format = 'json', options = {}) {
    if (!['json', 'csv'].includes(format)) {
        throw new TypeError(`Unsupported historical backtest export format: ${String(format)}`);
    }
    const exportedAt = normalizeExportedAt(options.exportedAt ?? new Date());
    const rawDocument = format === 'json'
        ? buildHistoricalBacktestRawExport(result, {
            exportedAt,
            cohortInventory: options.cohortInventory ?? null
        })
        : null;
    const runId = format === 'json'
        ? rawDocument.identifiers.runId
        : createHistoricalBacktestRunIdentity(result, { cohortInventory: options.cohortInventory ?? null });
    const csvContent = format === 'csv'
        ? serializeHistoricalBacktestCsv(result, {
            cohortInventory: options.cohortInventory ?? null,
            runIdentity: runId
        })
        : null;
    const extension = format === 'csv' ? 'csv' : 'json';
    const timestamp = exportedAt.replace(/[:]/g, '-');
    const period = `${result.request.startYear ?? 'unknown'}-${result.request.endYear ?? 'unknown'}`;
    const fingerprint = format === 'json'
        ? rawDocument.fingerprint
        : {
            algorithm: 'sha256-csv-utf8-v1',
            value: sha256Hex(csvContent)
        };
    const runToken = runId.slice(-64, -52);
    const formatToken = fingerprint.value.slice(0, 12);
    const formatTokenLabel = format === 'json' ? 'result' : 'csv';
    return deepFreeze({
        filename: `backtest-${period}-run-${runToken}-${formatTokenLabel}-${formatToken}-${timestamp}.${extension}`,
        content: format === 'json' ? stringifyCanonicalExportDocument(rawDocument) : csvContent,
        mimeType: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
        fingerprint
    });
}
