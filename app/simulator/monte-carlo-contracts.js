"use strict";

import {
    canonicalizeHistoricalContractValue,
    sha256Hex
} from './historical-backtest-contract.js';

export const MONTE_CARLO_RUN_REQUEST_VERSION = 'MonteCarloRunRequestV1';
export const MONTE_CARLO_RUN_RESULT_VERSION = 'MonteCarloRunResultV1';
export const MONTE_CARLO_SCENARIO_VERSION = 'MonteCarloScenarioV1';
export const MONTE_CARLO_SNAPSHOT_POLICY_VERSION = 'MonteCarloSnapshotPolicyV1';
export const MONTE_CARLO_FINGERPRINT_ALGORITHM = 'sha256-canonical-json-v1';

export const MONTE_CARLO_SNAPSHOT_POLICY = Object.freeze({
    schemaVersion: MONTE_CARLO_SNAPSHOT_POLICY_VERSION,
    immutableBaseline: 'pre-hardening-v1',
    currentReference: 'post-slice-07-v1',
    deltaLedger: 'delta-ledger-v1',
    finalCandidate: null,
    policy: 'immutable-baseline-with-versioned-post-slice-references'
});

// The time-boxed V1 read-compatibility window ended with Slice 11. Keeping the
// frozen registry as an empty public contract lets readers expose the same
// compatibility shape without recognizing removed KPI aliases.
export const MONTE_CARLO_LEGACY_READ_ALIASES = Object.freeze([]);

const OMIT = Symbol('omit');
const SAMPLING_METHODS = new Set(['block', 'stationary', 'regime_markov', 'regime_iid']);
const RNG_MODES = new Set(['per-run-seed', 'legacy-stream']);
const START_YEAR_MODES = new Set(['UNIFORM', 'FILTER', 'RECENCY']);
const BATCH_STATUSES = new Set(['completed', 'technical_error']);
const FORBIDDEN_PRIVATE_KEYS = /^(?:password|passphrase|secret|token|api[_-]?token|api[_-]?key|access[_-]?key|private[_-]?key|local[_-]?path|file[_-]?path)$/i;
const WINDOWS_ABSOLUTE_PATH = /(?:^|[\s"'])(?:[a-zA-Z]:\\|\\\\)[^\s"']+/;
const POSIX_PRIVATE_PATH = /(?:^|[\s"'])(?:\/Users\/|\/home\/)[^\s"']+/;

function contractError(contract, code, message) {
    const error = new TypeError(`${contract}: ${message}`);
    error.code = code;
    return error;
}

export function deepFreezeMonteCarloContract(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreezeMonteCarloContract(child, seen);
    return Object.freeze(value);
}

function redactLocalPaths(value) {
    return String(value ?? '')
        .replace(/(?:[a-zA-Z]:\\|\\\\)[^\s"']+/g, '[lokaler Pfad entfernt]')
        .replace(/(?:\/Users\/|\/home\/)[^\s"']+/g, '[lokaler Pfad entfernt]');
}

export function normalizeMonteCarloJsonValue(value, {
    rejectPrivateData = true,
    path = '$'
} = {}, seen = new WeakSet()) {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') {
        if (rejectPrivateData && typeof value === 'string'
            && (WINDOWS_ABSOLUTE_PATH.test(value) || POSIX_PRIVATE_PATH.test(value))) {
            throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_EXPORT_LOCAL_PATH_FORBIDDEN', `${path} contains a local filesystem path.`);
        }
        return value;
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_EXPORT_NON_FINITE_NUMBER', `${path} must be a finite JSON number.`);
        }
        return Object.is(value, -0) ? 0 : value;
    }
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') return OMIT;
    if (typeof value === 'bigint') {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_EXPORT_BIGINT_UNSUPPORTED', `${path} must not contain bigint values.`);
    }
    if (value instanceof Date) {
        if (!Number.isFinite(value.getTime())) {
            throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_EXPORT_DATE_INVALID', `${path} contains an invalid date.`);
        }
        return value.toISOString();
    }
    if (seen.has(value)) {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_EXPORT_CYCLE_UNSUPPORTED', `${path} must not contain cycles.`);
    }
    seen.add(value);
    if (Array.isArray(value)) {
        const normalized = value.map((child, index) => {
            const item = normalizeMonteCarloJsonValue(child, {
                rejectPrivateData,
                path: `${path}[${index}]`
            }, seen);
            return item === OMIT ? null : item;
        });
        seen.delete(value);
        return normalized;
    }
    const normalized = {};
    for (const key of Object.keys(value)) {
        if (rejectPrivateData && FORBIDDEN_PRIVATE_KEYS.test(key)) {
            throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_EXPORT_PRIVATE_KEY_FORBIDDEN', `${path}.${key} is not part of the portable run contract.`);
        }
        const child = normalizeMonteCarloJsonValue(value[key], {
            rejectPrivateData,
            path: `${path}.${key}`
        }, seen);
        if (child !== OMIT) normalized[key] = child;
    }
    seen.delete(value);
    return normalized;
}

export function fingerprintMonteCarloValue(value) {
    return Object.freeze({
        algorithm: MONTE_CARLO_FINGERPRINT_ALGORITHM,
        value: sha256Hex(canonicalizeHistoricalContractValue(value))
    });
}

function requireObject(value, contract, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw contractError(contract, 'MC_CONTRACT_REQUIRED_OBJECT', `${field} must be an object.`);
    }
    return value;
}

function requireInteger(value, contract, field, { min = 0 } = {}) {
    if (!Number.isSafeInteger(value) || value < min) {
        throw contractError(contract, 'MC_CONTRACT_INTEGER_INVALID', `${field} must be a safe integer >= ${min}.`);
    }
    return value;
}

function requireString(value, contract, field) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw contractError(contract, 'MC_CONTRACT_STRING_INVALID', `${field} must be a non-empty string.`);
    }
    return value;
}

function assertFingerprint(fingerprint, basis, contract, field) {
    requireObject(fingerprint, contract, field);
    if (fingerprint.algorithm !== MONTE_CARLO_FINGERPRINT_ALGORITHM) {
        throw contractError(contract, 'MC_CONTRACT_FINGERPRINT_ALGORITHM_UNSUPPORTED', `${field}.algorithm is unsupported.`);
    }
    const expected = fingerprintMonteCarloValue(basis).value;
    if (fingerprint.value !== expected) {
        throw contractError(contract, 'MC_CONTRACT_FINGERPRINT_MISMATCH', `${field}.value does not match its canonical payload.`);
    }
}

function createExecutionContract(execution = {}) {
    const mode = execution.mode === 'worker' ? 'worker' : 'serial';
    const workerCount = mode === 'worker' ? Number(execution.workerCount) : 0;
    const chunk = execution.chunkConfiguration || {};
    return {
        mode,
        compareModeRequested: execution.compareModeRequested === true,
        workerCount: mode === 'worker' && Number.isSafeInteger(workerCount) && workerCount > 0 ? workerCount : 0,
        timeBudgetMs: mode === 'worker' && Number.isFinite(Number(execution.timeBudgetMs))
            ? Number(execution.timeBudgetMs)
            : null,
        chunkConfiguration: {
            strategy: mode === 'worker' ? 'adaptive-time-budget-v1' : 'single-chunk-v1',
            minChunkRuns: mode === 'worker' ? Number(chunk.minChunkRuns ?? 10) : null,
            baseTimeoutMs: mode === 'worker' ? Number(chunk.baseTimeoutMs ?? 5000) : null,
            stallTimeoutMs: mode === 'worker' ? Number(chunk.stallTimeoutMs ?? 20000) : null
        }
    };
}

export function createMonteCarloRunRequestV1({
    inputs,
    widowOptions,
    monteCarloParams,
    useCapeSampling = false,
    samplingDiagnostics,
    dataVersion,
    execution,
    scenarioKey = null
} = {}) {
    const params = requireObject(monteCarloParams, MONTE_CARLO_RUN_REQUEST_VERSION, 'monteCarloParams');
    const normalizedInputs = normalizeMonteCarloJsonValue(inputs, { path: '$.scenario.normalizedInputs' });
    const normalizedWidowOptions = normalizeMonteCarloJsonValue(widowOptions || {}, { path: '$.scenario.widowOptions' });
    const normalizedDataVersion = normalizeMonteCarloJsonValue(dataVersion || samplingDiagnostics?.dataVersion || {}, {
        path: '$.data.version'
    });
    const samplingContract = normalizeMonteCarloJsonValue(samplingDiagnostics?.contract || {}, {
        path: '$.sampling.effectiveContract'
    });
    const scenario = {
        schemaVersion: MONTE_CARLO_SCENARIO_VERSION,
        cacheKey: typeof scenarioKey === 'string' && scenarioKey.trim() ? scenarioKey : null,
        normalizedInputs,
        widowOptions: normalizedWidowOptions
    };
    scenario.fingerprint = fingerprintMonteCarloValue({
        schemaVersion: scenario.schemaVersion,
        normalizedInputs: scenario.normalizedInputs,
        widowOptions: scenario.widowOptions
    });

    const request = {
        schemaVersion: MONTE_CARLO_RUN_REQUEST_VERSION,
        parameters: {
            runs: Number(params.anzahl),
            horizonYears: Number(params.maxDauer),
            blockLengthYears: Number(params.blockSize),
            seed: Number(params.seed),
            samplingMethod: String(params.methode || ''),
            rngMode: String(params.rngMode || 'per-run-seed')
        },
        sampling: {
            capeSamplingRequested: useCapeSampling === true,
            startYearMode: String(params.startYearMode || 'UNIFORM'),
            startYearFilter: Number(params.startYearFilter ?? 1970),
            startYearHalfLifeYears: Number(params.startYearHalfLife ?? 20),
            excludeEstimatedHistory: params.excludeEstimatedHistory === true,
            effectiveContract: samplingContract
        },
        stress: {
            preset: String(normalizedInputs?.stressPreset || 'NONE'),
            method: 'conditional-preset-then-tail-risk-overlay-v1'
        },
        scenario,
        data: {
            version: normalizedDataVersion,
            fingerprint: fingerprintMonteCarloValue(normalizedDataVersion)
        },
        execution: createExecutionContract(execution),
        snapshotPolicy: { ...MONTE_CARLO_SNAPSHOT_POLICY }
    };
    validateMonteCarloRunRequestV1(request);
    return deepFreezeMonteCarloContract(request);
}

export function validateMonteCarloRunRequestV1(request) {
    requireObject(request, MONTE_CARLO_RUN_REQUEST_VERSION, 'request');
    if (request.schemaVersion !== MONTE_CARLO_RUN_REQUEST_VERSION) {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_REQUEST_VERSION_UNSUPPORTED', `Unsupported schemaVersion ${String(request.schemaVersion)}.`);
    }
    const parameters = requireObject(request.parameters, MONTE_CARLO_RUN_REQUEST_VERSION, 'parameters');
    requireInteger(parameters.runs, MONTE_CARLO_RUN_REQUEST_VERSION, 'parameters.runs', { min: 1 });
    requireInteger(parameters.horizonYears, MONTE_CARLO_RUN_REQUEST_VERSION, 'parameters.horizonYears', { min: 1 });
    requireInteger(parameters.blockLengthYears, MONTE_CARLO_RUN_REQUEST_VERSION, 'parameters.blockLengthYears', { min: 1 });
    requireInteger(parameters.seed, MONTE_CARLO_RUN_REQUEST_VERSION, 'parameters.seed', { min: Number.MIN_SAFE_INTEGER });
    if (!SAMPLING_METHODS.has(parameters.samplingMethod)) {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_REQUEST_SAMPLING_METHOD_INVALID', 'parameters.samplingMethod is unsupported.');
    }
    if (!RNG_MODES.has(parameters.rngMode)) {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_REQUEST_RNG_MODE_INVALID', 'parameters.rngMode is unsupported.');
    }
    const sampling = requireObject(request.sampling, MONTE_CARLO_RUN_REQUEST_VERSION, 'sampling');
    if (!START_YEAR_MODES.has(sampling.startYearMode)) {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_REQUEST_START_YEAR_MODE_INVALID', 'sampling.startYearMode is unsupported.');
    }
    requireInteger(sampling.startYearFilter, MONTE_CARLO_RUN_REQUEST_VERSION, 'sampling.startYearFilter', { min: Number.MIN_SAFE_INTEGER });
    requireInteger(sampling.startYearHalfLifeYears, MONTE_CARLO_RUN_REQUEST_VERSION, 'sampling.startYearHalfLifeYears', { min: 1 });
    const effectiveSampling = requireObject(sampling.effectiveContract, MONTE_CARLO_RUN_REQUEST_VERSION, 'sampling.effectiveContract');
    if (effectiveSampling.schemaVersion !== 'MonteCarloSamplingContractV1') {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_REQUEST_SAMPLING_CONTRACT_UNSUPPORTED', 'sampling.effectiveContract is missing or incompatible.');
    }
    requireObject(request.stress, MONTE_CARLO_RUN_REQUEST_VERSION, 'stress');
    requireString(request.stress.preset, MONTE_CARLO_RUN_REQUEST_VERSION, 'stress.preset');
    const scenario = requireObject(request.scenario, MONTE_CARLO_RUN_REQUEST_VERSION, 'scenario');
    if (scenario.schemaVersion !== MONTE_CARLO_SCENARIO_VERSION) {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_REQUEST_SCENARIO_VERSION_UNSUPPORTED', 'scenario.schemaVersion is unsupported.');
    }
    requireObject(scenario.normalizedInputs, MONTE_CARLO_RUN_REQUEST_VERSION, 'scenario.normalizedInputs');
    requireObject(scenario.widowOptions, MONTE_CARLO_RUN_REQUEST_VERSION, 'scenario.widowOptions');
    assertFingerprint(scenario.fingerprint, {
        schemaVersion: scenario.schemaVersion,
        normalizedInputs: scenario.normalizedInputs,
        widowOptions: scenario.widowOptions
    }, MONTE_CARLO_RUN_REQUEST_VERSION, 'scenario.fingerprint');
    const data = requireObject(request.data, MONTE_CARLO_RUN_REQUEST_VERSION, 'data');
    requireObject(data.version, MONTE_CARLO_RUN_REQUEST_VERSION, 'data.version');
    requireString(data.version.annualDataHash, MONTE_CARLO_RUN_REQUEST_VERSION, 'data.version.annualDataHash');
    requireString(data.version.regimeHash, MONTE_CARLO_RUN_REQUEST_VERSION, 'data.version.regimeHash');
    assertFingerprint(data.fingerprint, data.version, MONTE_CARLO_RUN_REQUEST_VERSION, 'data.fingerprint');
    const execution = requireObject(request.execution, MONTE_CARLO_RUN_REQUEST_VERSION, 'execution');
    if (!['serial', 'worker'].includes(execution.mode)) {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_REQUEST_EXECUTION_MODE_INVALID', 'execution.mode is unsupported.');
    }
    requireInteger(execution.workerCount, MONTE_CARLO_RUN_REQUEST_VERSION, 'execution.workerCount');
    if (execution.mode === 'worker' && execution.workerCount < 1) {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_REQUEST_WORKER_COUNT_INVALID', 'worker execution requires workerCount >= 1.');
    }
    const chunkConfiguration = requireObject(execution.chunkConfiguration, MONTE_CARLO_RUN_REQUEST_VERSION, 'execution.chunkConfiguration');
    if (execution.mode === 'worker') {
        requireInteger(execution.timeBudgetMs, MONTE_CARLO_RUN_REQUEST_VERSION, 'execution.timeBudgetMs', { min: 1 });
        requireInteger(chunkConfiguration.minChunkRuns, MONTE_CARLO_RUN_REQUEST_VERSION, 'execution.chunkConfiguration.minChunkRuns', { min: 1 });
        requireInteger(chunkConfiguration.baseTimeoutMs, MONTE_CARLO_RUN_REQUEST_VERSION, 'execution.chunkConfiguration.baseTimeoutMs', { min: 1 });
        requireInteger(chunkConfiguration.stallTimeoutMs, MONTE_CARLO_RUN_REQUEST_VERSION, 'execution.chunkConfiguration.stallTimeoutMs', { min: 1 });
    }
    if (request.snapshotPolicy?.schemaVersion !== MONTE_CARLO_SNAPSHOT_POLICY_VERSION) {
        throw contractError(MONTE_CARLO_RUN_REQUEST_VERSION, 'MC_REQUEST_SNAPSHOT_POLICY_UNSUPPORTED', 'snapshotPolicy is missing or incompatible.');
    }
    normalizeMonteCarloJsonValue(request, { path: '$' });
    return request;
}

function cloneContractValue(value, path) {
    const normalized = normalizeMonteCarloJsonValue(value, { path });
    return normalized === OMIT ? null : normalized;
}

function projectRealWithdrawal(value = {}) {
    return {
        p10RealEur: value.realEur ?? null,
        p50RealEur: value.p50RealEur ?? null,
        sampleSize: Number(value.sampleSize) || 0,
        excludedRuns: Number(value.excludedRuns) || 0,
        missingness: cloneContractValue(value.missingness || {}, '$.result.kpis.realWithdrawalP10RealEur.missingness'),
        observationCount: cloneContractValue(value.observationCount || {}, '$.result.kpis.realWithdrawalP10RealEur.observationCount'),
        uncertainty: cloneContractValue(value.uncertainty || { confidenceInterval: null }, '$.result.kpis.realWithdrawalP10RealEur.uncertainty')
    };
}

function projectCarePerson(value = {}) {
    return {
        entryRatePct: value.entryRatePct ?? null,
        entryRateNumerator: Number(value.entryRateNumerator) || 0,
        entryRateDenominator: Number(value.entryRateDenominator) || 0,
        entryAgeYearsP50: value.entryAgeP50 ?? null,
        careYearsP50: value.careYearsP50 ?? null,
        additionalNeedRealEurP50: value.realCostEurP50 ?? null,
        sampleSize: Number(value.sampleSize) || 0,
        missingness: value.missingness ?? null
    };
}

function projectMonteCarloKpis(aggregated = {}) {
    const care = aggregated.extraKPI?.pflege || {};
    const household = care.household || {};
    const comparison = care.comparison || {};
    const health = aggregated.extraKPI?.healthBucket || {};
    const lossCarry = aggregated.extraKPI?.lossCarryTaxSavings || {};
    const stress = aggregated.stressKPI || {};
    return {
        floorCoverage: cloneContractValue(aggregated.outcomeInventory?.floorCoverageEstimate || null, '$.result.kpis.floorCoverage'),
        finalWealthNominalEur: cloneContractValue(aggregated.finalOutcomes || {}, '$.result.kpis.finalWealthNominalEur'),
        taxPaidNominalEur: cloneContractValue(aggregated.taxOutcomes || {}, '$.result.kpis.taxPaidNominalEur'),
        simulatedLifetimeYears: cloneContractValue(aggregated.kpiLebensdauer || {}, '$.result.kpis.simulatedLifetimeYears'),
        cutYearSharePct: cloneContractValue(aggregated.cutYearSharePct || {}, '$.result.kpis.cutYearSharePct'),
        maximumFlexCutPct: cloneContractValue(aggregated.kpiMaxKuerzung || {}, '$.result.kpis.maximumFlexCutPct'),
        depotExhaustionRatePct: aggregated.depotErschoepfungsQuote ?? null,
        depotExhaustionAgeYears: cloneContractValue(aggregated.alterBeiErschoepfung || {}, '$.result.kpis.depotExhaustionAgeYears'),
        yearsWithoutFlexPct: cloneContractValue(aggregated.anteilJahreOhneFlex || {}, '$.result.kpis.yearsWithoutFlexPct'),
        portfolioVolatilityPct: cloneContractValue(aggregated.volatilities || {}, '$.result.kpis.portfolioVolatilityPct'),
        maximumDrawdownPct: cloneContractValue(aggregated.maxDrawdowns || {}, '$.result.kpis.maximumDrawdownPct'),
        realWithdrawalP10RealEur: projectRealWithdrawal(aggregated.realWithdrawalP10),
        timeShareWithdrawalRateAbove45Ratio: aggregated.extraKPI?.timeShareQuoteAbove45 ?? null,
        dynamicFlexSafety: cloneContractValue(aggregated.extraKPI?.dynamicFlexSafety || {}, '$.result.kpis.dynamicFlexSafety'),
        lossCarryTaxSavingsNominalEur: {
            totalNominalEur: lossCarry.total ?? null,
            perRunMeanNominalEur: lossCarry.perRunMean ?? null
        },
        healthBucketNominalEur: {
            enabledRatePct: health.enabledRatePct ?? null,
            usedRatePct: health.usedRatePct ?? null,
            depletedRatePct: health.depletedRatePct ?? null,
            usedRuns: Number(health.usedRuns) || 0,
            depletedRuns: Number(health.depletedRuns) || 0,
            totalUsedNominalEur: health.totalUsed ?? null,
            usedP50NominalEur: health.usedMedian ?? null,
            usedP90NominalEur: health.usedP90 ?? null,
            endP50NominalEur: health.endMedian ?? null,
            coverageP50Pct: health.coverageMedianPct ?? null,
            targetGapP50NominalEur: health.targetGapMedian ?? null,
            interestP50NominalEur: health.interestMedian ?? null
        },
        tailRisk: cloneContractValue(aggregated.extraKPI?.tailRisk || {}, '$.result.kpis.tailRisk'),
        care: {
            p1: projectCarePerson(care.p1),
            p2: projectCarePerson(care.p2),
            household: {
                entryRatePct: household.entryRatePct ?? null,
                entryRateNumerator: Number(household.entryRateNumerator) || 0,
                entryRateDenominator: Number(household.entryRateDenominator) || 0,
                careYearsOverlapP50: household.careYearsOverlapP50 ?? null,
                totalAdditionalNeedRealEurP50: household.totalAdditionalNeedRealEurP50 ?? null,
                maxAnnualAdditionalNeedRealEurP50: household.maxAnnualAdditionalNeedRealEurP50 ?? null,
                endWealthWithCareRealEurP50: household.endWealthWithCareRealEurP50 ?? null,
                endWealthWithoutCareRealEurP50: household.endWealthNoCareRealEurP50 ?? null,
                shortfallRateWithCarePct: household.shortfallRateWithCarePct ?? null,
                shortfallRateWithoutCarePct: household.shortfallRateWithoutCarePct ?? null,
                sampleSize: Number(household.sampleSize) || 0,
                noCareSampleSize: Number(household.noCareSampleSize) || 0,
                missingness: household.missingness ?? null
            },
            comparison: {
                endWealthWithoutCareMinusCareRealEur: comparison.endWealthNoCareMinusCareRealEur ?? null,
                method: comparison.method ?? null,
                withCareSampleSize: Number(comparison.withCareSampleSize) || 0,
                noCareSampleSize: Number(comparison.noCareSampleSize) || 0,
                missingness: comparison.missingness ?? null
            }
        },
        stress: {
            preset: stress.presetKey ?? 'NONE',
            horizonYears: Number(stress.years) || 0,
            maximumDrawdownPct: cloneContractValue(stress.maxDD || {}, '$.result.kpis.stress.maximumDrawdownPct'),
            timeShareWithdrawalRateAbove45Ratio: cloneContractValue(stress.timeShareAbove45 || {}, '$.result.kpis.stress.timeShareWithdrawalRateAbove45Ratio'),
            cutYears: cloneContractValue(stress.cutYears || {}, '$.result.kpis.stress.cutYears'),
            realWithdrawalP10RealEur: projectRealWithdrawal(stress.realWithdrawalP10),
            recoveryYears: cloneContractValue(stress.recoveryYears || {}, '$.result.kpis.stress.recoveryYears')
        }
    };
}

function sanitizeTechnicalErrors(errors) {
    return (Array.isArray(errors) ? errors : []).slice(0, 20).map(error => ({
        runIndex: Number.isSafeInteger(error?.runIndex) ? error.runIndex : null,
        simulationYearIndex: Number.isSafeInteger(error?.simulationYearIndex) ? error.simulationYearIndex : null,
        code: typeof error?.code === 'string' && error.code.trim() ? error.code.trim() : 'MC_TECHNICAL_ERROR_UNSPECIFIED',
        message: redactLocalPaths(typeof error?.message === 'string'
            ? error.message
            : 'Ein Simulationspfad wurde technisch abgebrochen.')
    }));
}

function buildWarnings(aggregated, samplingDiagnostics, technicalErrorCount) {
    const warnings = [];
    const uncertaintyWarning = aggregated?.outcomeInventory?.floorCoverageEstimate?.uncertaintyWarning;
    if (uncertaintyWarning) warnings.push({
        source: 'floor_coverage',
        code: String(uncertaintyWarning.code || 'uncertainty_warning'),
        message: String(uncertaintyWarning.message || 'Die Schaetzerunsicherheit ist erhoeht.')
    });
    for (const warning of samplingDiagnostics?.contract?.warnings || []) {
        warnings.push({ source: 'sampling', code: String(warning), message: null });
    }
    if (technicalErrorCount > 0) {
        warnings.push({
            source: 'batch',
            code: 'technical_errors_present',
            message: 'Finanzielle Batch-KPIs sind wegen technischer Pfadfehler fail-closed.'
        });
    }
    return warnings;
}

function buildMissingness(kpis) {
    return {
        zeroPolicy: 'observed-zero-is-zero; unavailable-values-are-null-with-reason',
        cutYearSharePct: {
            sampleSize: Number(kpis.cutYearSharePct?.sampleSize) || 0,
            excludedRuns: Number(kpis.cutYearSharePct?.excludedRuns) || 0
        },
        realWithdrawalP10RealEur: {
            sampleSize: kpis.realWithdrawalP10RealEur.sampleSize,
            excludedRuns: kpis.realWithdrawalP10RealEur.excludedRuns,
            reasons: kpis.realWithdrawalP10RealEur.missingness
        },
        stressRealWithdrawalP10RealEur: {
            sampleSize: kpis.stress.realWithdrawalP10RealEur.sampleSize,
            excludedRuns: kpis.stress.realWithdrawalP10RealEur.excludedRuns,
            reasons: kpis.stress.realWithdrawalP10RealEur.missingness
        },
        care: {
            p1: { sampleSize: kpis.care.p1.sampleSize, reason: kpis.care.p1.missingness },
            p2: { sampleSize: kpis.care.p2.sampleSize, reason: kpis.care.p2.missingness },
            household: { sampleSize: kpis.care.household.sampleSize, reason: kpis.care.household.missingness },
            comparison: { reason: kpis.care.comparison.missingness }
        }
    };
}

function projectHeatmapBins(values) {
    return (Array.isArray(values) ? values : []).map((value, index) => ({
        index,
        upperBoundPct: Number.isFinite(value) ? value : null,
        openEnded: value === Infinity
    }));
}

export function createMonteCarloRunResultV1({
    aggregatedResults,
    samplingDiagnostics,
    executionDiagnostics,
    requestedRuns = null
} = {}) {
    const aggregated = requireObject(aggregatedResults, MONTE_CARLO_RUN_RESULT_VERSION, 'aggregatedResults');
    const outcomeInventory = cloneContractValue(aggregated.outcomeInventory, '$.result.outcomeInventory');
    const technicalInventory = aggregated.technicalInventory || {};
    const requested = requestedRuns ?? outcomeInventory?.requestedRuns ?? technicalInventory.requested;
    const technicalErrorCount = Number(outcomeInventory?.technical_error ?? technicalInventory.technicalError) || 0;
    const kpis = projectMonteCarloKpis(aggregated);
    const sampling = cloneContractValue(samplingDiagnostics || {}, '$.result.diagnostics.sampling');
    const execution = cloneContractValue(executionDiagnostics || {}, '$.result.diagnostics.execution');
    const result = {
        schemaVersion: MONTE_CARLO_RUN_RESULT_VERSION,
        batchStatus: String(aggregated.batchStatus || (technicalErrorCount > 0 ? 'technical_error' : 'completed')),
        financialMetricsValid: aggregated.financialMetricsValid === true,
        sampleSize: {
            requestedRuns: Number(requested),
            financiallyEvaluableRuns: Number(technicalInventory.financiallyEvaluable ?? (Number(requested) - technicalErrorCount)),
            technicalErrorRuns: technicalErrorCount
        },
        technicalErrorCount,
        outcomeInventory,
        kpis,
        uncertainty: {
            floorCoverage: cloneContractValue(outcomeInventory?.floorCoverageEstimate || null, '$.result.uncertainty.floorCoverage'),
            realWithdrawalP10RealEur: cloneContractValue(kpis.realWithdrawalP10RealEur.uncertainty, '$.result.uncertainty.realWithdrawalP10RealEur'),
            stressRealWithdrawalP10RealEur: cloneContractValue(kpis.stress.realWithdrawalP10RealEur.uncertainty, '$.result.uncertainty.stressRealWithdrawalP10RealEur')
        },
        missingness: buildMissingness(kpis),
        diagnostics: {
            sampling,
            execution,
            technicalErrors: sanitizeTechnicalErrors(technicalInventory.errors),
            withdrawalRateHeatmap: {
                bins: projectHeatmapBins(aggregated.bins),
                countsByPlanYear: cloneContractValue(aggregated.heatmap || [], '$.result.diagnostics.withdrawalRateHeatmap.countsByPlanYear')
            }
        },
        warnings: buildWarnings(aggregated, samplingDiagnostics, technicalErrorCount),
        unitContract: {
            currency: 'EUR',
            nominalMoneyFieldSuffix: 'NominalEur',
            realMoneyFieldSuffix: 'RealEur',
            realPriceBasis: 'simulation-start-prices',
            percentages: 'percentage-points',
            ratios: 'unitless-ratio',
            observedZero: '0',
            missingValue: null
        }
    };
    validateMonteCarloRunResultV1(result);
    return deepFreezeMonteCarloContract(result);
}

export function validateMonteCarloRunResultV1(result) {
    requireObject(result, MONTE_CARLO_RUN_RESULT_VERSION, 'result');
    if (result.schemaVersion !== MONTE_CARLO_RUN_RESULT_VERSION) {
        throw contractError(MONTE_CARLO_RUN_RESULT_VERSION, 'MC_RESULT_VERSION_UNSUPPORTED', `Unsupported schemaVersion ${String(result.schemaVersion)}.`);
    }
    if (!BATCH_STATUSES.has(result.batchStatus)) {
        throw contractError(MONTE_CARLO_RUN_RESULT_VERSION, 'MC_RESULT_BATCH_STATUS_INVALID', 'batchStatus is unsupported.');
    }
    const sampleSize = requireObject(result.sampleSize, MONTE_CARLO_RUN_RESULT_VERSION, 'sampleSize');
    requireInteger(sampleSize.requestedRuns, MONTE_CARLO_RUN_RESULT_VERSION, 'sampleSize.requestedRuns', { min: 1 });
    requireInteger(sampleSize.financiallyEvaluableRuns, MONTE_CARLO_RUN_RESULT_VERSION, 'sampleSize.financiallyEvaluableRuns');
    requireInteger(sampleSize.technicalErrorRuns, MONTE_CARLO_RUN_RESULT_VERSION, 'sampleSize.technicalErrorRuns');
    requireInteger(result.technicalErrorCount, MONTE_CARLO_RUN_RESULT_VERSION, 'technicalErrorCount');
    if (sampleSize.financiallyEvaluableRuns + sampleSize.technicalErrorRuns !== sampleSize.requestedRuns
        || sampleSize.technicalErrorRuns !== result.technicalErrorCount) {
        throw contractError(MONTE_CARLO_RUN_RESULT_VERSION, 'MC_RESULT_SAMPLE_SIZE_INCONSISTENT', 'sampleSize must classify every requested run exactly once.');
    }
    const outcomes = requireObject(result.outcomeInventory, MONTE_CARLO_RUN_RESULT_VERSION, 'outcomeInventory');
    for (const field of ['ruin', 'all_dead', 'horizon_exhausted', 'technical_error']) {
        requireInteger(outcomes[field], MONTE_CARLO_RUN_RESULT_VERSION, `outcomeInventory.${field}`);
    }
    if (outcomes.ruin + outcomes.all_dead + outcomes.horizon_exhausted + outcomes.technical_error !== sampleSize.requestedRuns
        || outcomes.technical_error !== result.technicalErrorCount
        || outcomes.requestedRuns !== sampleSize.requestedRuns
        || outcomes.inventorySum !== sampleSize.requestedRuns) {
        throw contractError(MONTE_CARLO_RUN_RESULT_VERSION, 'MC_RESULT_OUTCOME_INVENTORY_INCONSISTENT', 'outcomeInventory must classify every requested run exactly once.');
    }
    if ((result.batchStatus === 'completed' && (result.technicalErrorCount !== 0 || result.financialMetricsValid !== true))
        || (result.batchStatus === 'technical_error' && (result.technicalErrorCount < 1 || result.financialMetricsValid !== false))) {
        throw contractError(MONTE_CARLO_RUN_RESULT_VERSION, 'MC_RESULT_BATCH_VALIDITY_INCONSISTENT', 'batchStatus, technical errors and financialMetricsValid are inconsistent.');
    }
    requireObject(result.kpis, MONTE_CARLO_RUN_RESULT_VERSION, 'kpis');
    requireObject(result.uncertainty, MONTE_CARLO_RUN_RESULT_VERSION, 'uncertainty');
    requireObject(result.missingness, MONTE_CARLO_RUN_RESULT_VERSION, 'missingness');
    requireObject(result.diagnostics, MONTE_CARLO_RUN_RESULT_VERSION, 'diagnostics');
    if (!Array.isArray(result.warnings)) {
        throw contractError(MONTE_CARLO_RUN_RESULT_VERSION, 'MC_RESULT_WARNINGS_INVALID', 'warnings must be an array.');
    }
    requireObject(result.unitContract, MONTE_CARLO_RUN_RESULT_VERSION, 'unitContract');
    if (result.unitContract.nominalMoneyFieldSuffix !== 'NominalEur'
        || result.unitContract.realMoneyFieldSuffix !== 'RealEur') {
        throw contractError(MONTE_CARLO_RUN_RESULT_VERSION, 'MC_RESULT_UNIT_CONTRACT_INVALID', 'money suffixes must be explicit.');
    }
    normalizeMonteCarloJsonValue(result, { path: '$.result' });
    return result;
}

export function extractMonteCarloReplayArgsV1(request) {
    validateMonteCarloRunRequestV1(request);
    return deepFreezeMonteCarloContract({
        inputs: cloneContractValue(request.scenario.normalizedInputs, '$.replay.inputs'),
        widowOptions: cloneContractValue(request.scenario.widowOptions, '$.replay.widowOptions'),
        monteCarloParams: {
            anzahl: request.parameters.runs,
            maxDauer: request.parameters.horizonYears,
            blockSize: request.parameters.blockLengthYears,
            seed: request.parameters.seed,
            methode: request.parameters.samplingMethod,
            rngMode: request.parameters.rngMode,
            startYearMode: request.sampling.startYearMode,
            startYearFilter: request.sampling.startYearFilter,
            startYearHalfLife: request.sampling.startYearHalfLifeYears,
            excludeEstimatedHistory: request.sampling.excludeEstimatedHistory
        },
        useCapeSampling: request.sampling.capeSamplingRequested,
        execution: cloneContractValue(request.execution, '$.replay.execution')
    });
}

function valueAtPath(root, path) {
    return path.split('.').reduce((value, key) => value == null ? undefined : value[key], root);
}

export function collectMonteCarloLegacyAliasTelemetryV1(document, onTelemetry = null) {
    const aliases = MONTE_CARLO_LEGACY_READ_ALIASES.filter(alias => valueAtPath(document, alias.path) !== undefined);
    for (const alias of aliases) {
        if (typeof onTelemetry === 'function') {
            onTelemetry({
                event: 'monte_carlo_deprecated_alias_read',
                alias: alias.path,
                replacement: alias.replacement,
                removalTarget: alias.removalTarget
            });
        }
    }
    return Object.freeze(aliases.map(alias => alias.path));
}
