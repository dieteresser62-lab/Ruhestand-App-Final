import { getStartYearCandidates } from '../shared/cape-utils.js';
import { ESTIMATED_HISTORY_CUTOFF_YEAR } from './simulator-data.js';

export const MIN_START_YEAR_INDEX = 4;
export const MONTE_CARLO_SAMPLING_CONTRACT_VERSION = 'MonteCarloSamplingContractV1';
export const MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION = 'MonteCarloSamplingDiagnosticsV1';

const MONTE_CARLO_METHODS = new Set(['block', 'stationary', 'regime_markov', 'regime_iid']);
const START_YEAR_MODES = new Set(['UNIFORM', 'FILTER', 'RECENCY']);
const SAMPLING_TAIL_COUNTER_FIELDS = Object.freeze([
    'runsActiveCount',
    'runsAppliedCount',
    'eventCount',
    'evaluatedYears',
    'activeYears',
    'appliedYears',
    'skippedHistoricalCrisisYears'
]);

function samplingContractError(code, message) {
    const error = new RangeError(`${MONTE_CARLO_SAMPLING_CONTRACT_VERSION}: ${message}`);
    error.code = code;
    return error;
}

function samplerFromIndices(indices, weightedSampler = null) {
    if (!Array.isArray(indices) || indices.length === 0) return null;
    if (weightedSampler?.indices?.length === indices.length
        && weightedSampler.indices.every((value, index) => value === indices[index])) {
        return weightedSampler;
    }
    return { indices: [...indices], cdf: null };
}

function incrementCounter(target, key, amount = 1) {
    const normalizedKey = String(key);
    target[normalizedKey] = (target[normalizedKey] || 0) + amount;
}

function sumCounterMap(values) {
    return Object.values(values || {}).reduce((sum, value) => sum + value, 0);
}

function assertCounterMap(values, label) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: ${label} must be an object.`);
    }
    for (const [key, value] of Object.entries(values)) {
        if (!key || !Number.isSafeInteger(value) || value < 0) {
            throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: ${label}.${key} must be a non-negative integer.`);
        }
    }
}

export function buildCdfFromIndices(indices, weightsByIndex) {
    if (!Array.isArray(indices) || indices.length === 0) return null;
    let total = 0;
    for (const idx of indices) {
        const weight = weightsByIndex ? (weightsByIndex[idx] || 0) : 1;
        total += weight;
    }
    if (total <= 0) return null;
    let cumulative = 0;
    // CDF: monoton wachsend, letzter Wert wird auf 1 geklemmt.
    const cdf = indices.map(idx => {
        const weight = weightsByIndex ? (weightsByIndex[idx] || 0) : 1;
        cumulative += weight / total;
        return cumulative;
    });
    cdf[cdf.length - 1] = 1;
    return { indices, cdf };
}

export function pickFromSampler(rand, sampler, fallbackIndex = 0) {
    if (!sampler || !Array.isArray(sampler.indices) || sampler.indices.length === 0) {
        return fallbackIndex;
    }
    const sample = rand ? rand() : Math.random();
    const r = Math.min(1 - Number.EPSILON, Math.max(0, Number.isFinite(sample) ? sample : 0));
    if (!Array.isArray(sampler.cdf) || sampler.cdf.length !== sampler.indices.length) {
        const offset = Math.floor(r * sampler.indices.length);
        return sampler.indices[Math.min(sampler.indices.length - 1, offset)] ?? fallbackIndex;
    }
    // Binäre Suche im CDF für O(log n) Sampling.
    let low = 0;
    let high = sampler.cdf.length - 1;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (r < sampler.cdf[mid]) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return sampler.indices[low] ?? fallbackIndex;
}

export function resolveMinStartYearIndex(data, excludeEstimatedHistory = false) {
    const safeFallback = Math.max(0, Math.min(MIN_START_YEAR_INDEX, data.length - 1));
    if (!excludeEstimatedHistory) return safeFallback;
    const idx = data.findIndex(entry => (entry?.jahr ?? 0) >= ESTIMATED_HISTORY_CUTOFF_YEAR);
    return idx >= 0 ? idx : safeFallback;
}

export function buildYearSamplingConfig(mode, data, { startYearFilter = 1970, startYearHalfLife = 20, blockSize = 1, excludeEstimatedHistory = false } = {}) {
    if (!Array.isArray(data) || data.length === 0) return null;

    const cutoff = Number.isFinite(startYearFilter) ? startYearFilter : 1970;
    const halfLife = Number.isFinite(startYearHalfLife) && startYearHalfLife > 0 ? startYearHalfLife : 20;
    const minStartIndex = resolveMinStartYearIndex(data, excludeEstimatedHistory);
    // Recency-Mode: Exponentielles Abklingen mit Halbwertszeit (halfLife).
    const currentYear = data[data.length - 1]?.jahr ?? new Date().getFullYear();

    const allowedIndices = [];
    const weightsByIndex = new Array(data.length).fill(0);
    for (let i = minStartIndex; i < data.length; i++) {
        const year = data[i].jahr;
        if (excludeEstimatedHistory && year < ESTIMATED_HISTORY_CUTOFF_YEAR) continue;
        if (mode === 'FILTER' && year < cutoff) continue;
        allowedIndices.push(i);
        if (mode === 'RECENCY') {
            const age = currentYear - year;
            weightsByIndex[i] = Math.pow(0.5, age / halfLife);
        } else {
            weightsByIndex[i] = 1;
        }
    }

    if (allowedIndices.length === 0) return null;

    const allowedIndexSet = new Set(allowedIndices);
    const allSampler = (mode === 'FILTER' || mode === 'RECENCY')
        ? buildCdfFromIndices(allowedIndices, weightsByIndex)
        : null;

    // Block-Sampling: Der letzte Index data.length - blockSize ist noch ein
    // vollstaendiger Blockstart und muss deshalb eingeschlossen bleiben.
    const normalizedBlockSize = Math.max(1, Math.round(Number(blockSize) || 1));
    const maxStartIndex = data.length - normalizedBlockSize;
    const blockStartIndices = allowedIndices.filter(idx => idx <= maxStartIndex);
    const blockSampler = (mode === 'FILTER' || mode === 'RECENCY')
        ? buildCdfFromIndices(blockStartIndices, weightsByIndex)
        : null;

    const regimeSamplers = {};
    for (const idx of allowedIndices) {
        const regime = data[idx].regime;
        if (!regimeSamplers[regime]) regimeSamplers[regime] = [];
        regimeSamplers[regime].push(idx);
    }
    const regimeSamplerMap = {};
    for (const [regime, indices] of Object.entries(regimeSamplers)) {
        regimeSamplerMap[regime] = (mode === 'FILTER' || mode === 'RECENCY')
            ? buildCdfFromIndices(indices, weightsByIndex)
            : { indices, cdf: null };
    }

    return {
        mode: START_YEAR_MODES.has(mode) ? mode : 'UNIFORM',
        allowedIndices,
        allowedIndexSet,
        allSampler,
        blockSampler,
        blockStartIndices,
        maxStartIndex,
        regimeSamplers: regimeSamplerMap,
        weightsByIndex
    };
}

export function resolveMonteCarloSamplingContractV1({
    method,
    inputs,
    annualData,
    useCapeSampling = false,
    startYearMode = 'UNIFORM',
    startYearFilter = 1970,
    startYearHalfLife = 20,
    blockSize = 1,
    excludeEstimatedHistory = false,
    yearSamplingConfig = null
} = {}) {
    if (!Array.isArray(annualData) || annualData.length === 0) {
        throw samplingContractError('MC_SAMPLING_DATA_EMPTY', 'annualData must not be empty.');
    }
    if (!MONTE_CARLO_METHODS.has(method)) {
        throw samplingContractError('MC_SAMPLING_METHOD_INVALID', `unsupported method ${String(method)}.`);
    }

    const normalizedMode = START_YEAR_MODES.has(startYearMode) ? startYearMode : 'UNIFORM';
    const requestedConfig = yearSamplingConfig || buildYearSamplingConfig(normalizedMode, annualData, {
        startYearFilter,
        startYearHalfLife,
        blockSize,
        excludeEstimatedHistory
    });
    const uniformConfig = normalizedMode === 'UNIFORM'
        ? requestedConfig
        : buildYearSamplingConfig('UNIFORM', annualData, {
            blockSize,
            excludeEstimatedHistory
        });
    if (!uniformConfig?.allowedIndices?.length) {
        throw samplingContractError('MC_SAMPLING_NO_START_CANDIDATES', 'the unweighted start-year universe is empty.');
    }

    const minStartIndex = resolveMinStartYearIndex(annualData, excludeEstimatedHistory);
    const capeValue = Number(inputs?.capeRatio) > 0
        ? Number(inputs.capeRatio)
        : Number(inputs?.marketCapeRatio);
    const capeYears = useCapeSampling === true && Number.isFinite(capeValue) && capeValue > 0
        ? getStartYearCandidates(capeValue, annualData, 0.2, { fallbackToAll: false })
        : [];
    const capeIndices = capeYears
        .map(year => annualData.findIndex(entry => entry?.jahr === year))
        .filter(index => index >= minStartIndex)
        .filter(index => !excludeEstimatedHistory
            || Number(annualData[index]?.jahr) >= ESTIMATED_HISTORY_CUTOFF_YEAR);
    const capeInitialIndices = method === 'block'
        ? capeIndices.filter(index => index <= annualData.length - Math.max(1, Math.round(Number(blockSize) || 1)))
        : capeIndices;
    const capeEffective = useCapeSampling === true && capeInitialIndices.length > 0;

    const baseInitialIndices = method === 'block'
        ? requestedConfig?.blockStartIndices
        : requestedConfig?.allowedIndices;
    if (!capeEffective && (!Array.isArray(baseInitialIndices) || baseInitialIndices.length === 0)) {
        const code = method === 'block'
            ? 'MC_SAMPLING_NO_BLOCK_START_CANDIDATES'
            : 'MC_SAMPLING_NO_START_CANDIDATES';
        throw samplingContractError(code, 'no eligible initial record satisfies the configured sampling method.');
    }

    const baseWeightedSampler = method === 'block'
        ? requestedConfig?.blockSampler
        : requestedConfig?.allSampler;
    const initialStartSampler = capeEffective
        ? samplerFromIndices(capeInitialIndices)
        : samplerFromIndices(baseInitialIndices, baseWeightedSampler);
    if (!initialStartSampler) {
        throw samplingContractError('MC_SAMPLING_NO_START_CANDIDATES', 'no initial start sampler could be constructed.');
    }

    const effectiveYearSamplingConfig = capeEffective ? uniformConfig : requestedConfig;
    if (method === 'block') {
        effectiveYearSamplingConfig.blockStartIndices = [...initialStartSampler.indices];
        effectiveYearSamplingConfig.blockSampler = initialStartSampler;
    }

    const warnings = [];
    if (useCapeSampling === true && !(Number.isFinite(capeValue) && capeValue > 0)) {
        warnings.push('cape_value_unavailable_fallback');
    } else if (useCapeSampling === true && capeInitialIndices.length === 0) {
        warnings.push('cape_candidates_empty_fallback');
    }

    const ignoredOptions = capeEffective && normalizedMode !== 'UNIFORM'
        ? ['startYearMode', normalizedMode === 'FILTER' ? 'startYearFilter' : 'startYearHalfLife']
        : [];
    const startSource = capeEffective ? 'cape' : normalizedMode.toLowerCase();
    const publicContract = {
        schemaVersion: MONTE_CARLO_SAMPLING_CONTRACT_VERSION,
        method,
        startSource,
        requestedStartYearMode: normalizedMode,
        capeSamplingRequested: useCapeSampling === true,
        capeSamplingEffective: capeEffective,
        excludeEstimatedHistory: excludeEstimatedHistory === true,
        ignoredOptions,
        warnings,
        initialCandidateCount: initialStartSampler.indices.length,
        firstRecordPolicy: 'selected_start_record',
        fixedBlockPolicy: method === 'block' ? 'full_sequential_block_from_selected_start' : 'not_applicable',
        stationaryRestartPolicy: method === 'stationary' ? 'restart_probability_after_initial_record' : 'not_applicable',
        regimePolicy: method === 'regime_markov'
            ? 'initial_record_then_markov_transition'
            : (method === 'regime_iid' ? 'initial_record_then_iid' : 'not_applicable'),
        precedence: [
            'estimated_history_exclusion',
            'cape_or_start_weighting',
            'sampling_method',
            'conditional_stress_override',
            'tail_risk_overlay'
        ]
    };

    return {
        contract: publicContract,
        initialStartSampler,
        blockStartSampler: method === 'block' || method === 'stationary'
            ? initialStartSampler
            : null,
        effectiveYearSamplingConfig
    };
}

export function createMonteCarloSamplingDiagnosticsV1({ contract, dataVersion } = {}) {
    if (contract?.schemaVersion !== MONTE_CARLO_SAMPLING_CONTRACT_VERSION) {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: sampling contract is missing or incompatible.`);
    }
    return {
        schemaVersion: MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION,
        contract: { ...contract, ignoredOptions: [...contract.ignoredOptions], warnings: [...contract.warnings], precedence: [...contract.precedence] },
        dataVersion: { ...(dataVersion || {}) },
        requestedRuns: 0,
        sampledYears: 0,
        initialStartYearCounts: {},
        historicalYearCounts: {},
        sourceCounts: {},
        regimeCounts: {},
        stationaryRestartCounts: {
            initial: 0,
            random: 0,
            data_end: 0
        },
        tailRisk: Object.fromEntries(SAMPLING_TAIL_COUNTER_FIELDS.map(field => [field, 0]))
    };
}

export function recordMonteCarloSamplingStartV1(diagnostics, yearData) {
    diagnostics.requestedRuns += 1;
    incrementCounter(diagnostics.initialStartYearCounts, yearData?.jahr ?? 'unknown');
    return diagnostics;
}

export function recordMonteCarloSampledYearV1(diagnostics, {
    yearData,
    source,
    stationaryRestartReason = null
} = {}) {
    diagnostics.sampledYears += 1;
    incrementCounter(diagnostics.historicalYearCounts, yearData?.jahr ?? 'unknown');
    incrementCounter(diagnostics.sourceCounts, source || 'unknown');
    incrementCounter(diagnostics.regimeCounts, yearData?.regime || 'UNKNOWN');
    if (stationaryRestartReason && stationaryRestartReason in diagnostics.stationaryRestartCounts) {
        diagnostics.stationaryRestartCounts[stationaryRestartReason] += 1;
    }
    return diagnostics;
}

export function finalizeMonteCarloSamplingDiagnosticsV1(diagnostics, totals = {}) {
    diagnostics.tailRisk = {
        runsActiveCount: Number(totals.tailRiskRunsActiveCount) || 0,
        runsAppliedCount: Number(totals.tailRiskRunsAppliedCount) || 0,
        eventCount: Number(totals.tailRiskEventCount) || 0,
        evaluatedYears: Number(totals.tailRiskEvaluatedYears) || 0,
        activeYears: Number(totals.tailRiskActiveYears) || 0,
        appliedYears: Number(totals.tailRiskAppliedYears) || 0,
        skippedHistoricalCrisisYears: Number(totals.tailRiskSkippedHistoricalCrisisYears) || 0
    };
    return assertMonteCarloSamplingDiagnosticsV1(diagnostics);
}

export function assertMonteCarloSamplingDiagnosticsV1(diagnostics, { expectedRuns = null } = {}) {
    if (!diagnostics || diagnostics.schemaVersion !== MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION) {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: diagnostics are missing or incompatible.`);
    }
    if (diagnostics.contract?.schemaVersion !== MONTE_CARLO_SAMPLING_CONTRACT_VERSION) {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: contract is missing or incompatible.`);
    }
    if (!MONTE_CARLO_METHODS.has(diagnostics.contract.method)) {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: method is invalid.`);
    }
    for (const field of ['requestedRuns', 'sampledYears']) {
        if (!Number.isSafeInteger(diagnostics[field]) || diagnostics[field] < 0) {
            throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: ${field} must be a non-negative integer.`);
        }
    }
    if (expectedRuns !== null && diagnostics.requestedRuns !== expectedRuns) {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: requestedRuns does not match the chunk range.`);
    }
    for (const [label, values] of Object.entries({
        initialStartYearCounts: diagnostics.initialStartYearCounts,
        historicalYearCounts: diagnostics.historicalYearCounts,
        sourceCounts: diagnostics.sourceCounts,
        regimeCounts: diagnostics.regimeCounts,
        stationaryRestartCounts: diagnostics.stationaryRestartCounts,
        tailRisk: diagnostics.tailRisk
    })) {
        assertCounterMap(values, label);
    }
    if (sumCounterMap(diagnostics.initialStartYearCounts) !== diagnostics.requestedRuns) {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: initial start counts must classify every run.`);
    }
    if (sumCounterMap(diagnostics.historicalYearCounts) !== diagnostics.sampledYears
        || sumCounterMap(diagnostics.sourceCounts) !== diagnostics.sampledYears
        || sumCounterMap(diagnostics.regimeCounts) !== diagnostics.sampledYears) {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: sampled-year counters are inconsistent.`);
    }
    if (!diagnostics.dataVersion || typeof diagnostics.dataVersion !== 'object') {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: dataVersion must be an object.`);
    }
    return diagnostics;
}

export function mergeMonteCarloSamplingDiagnosticsV1(target, source) {
    assertMonteCarloSamplingDiagnosticsV1(target);
    assertMonteCarloSamplingDiagnosticsV1(source);
    if (JSON.stringify(target.contract) !== JSON.stringify(source.contract)
        || JSON.stringify(target.dataVersion) !== JSON.stringify(source.dataVersion)) {
        throw new TypeError(`${MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION}: chunks use incompatible sampling contracts or data versions.`);
    }
    target.requestedRuns += source.requestedRuns;
    target.sampledYears += source.sampledYears;
    for (const field of ['initialStartYearCounts', 'historicalYearCounts', 'sourceCounts', 'regimeCounts', 'stationaryRestartCounts', 'tailRisk']) {
        for (const [key, value] of Object.entries(source[field])) incrementCounter(target[field], key, value);
    }
    return assertMonteCarloSamplingDiagnosticsV1(target);
}

export function buildStartYearCdf(mode, data, { startYearFilter = 1970, startYearHalfLife = 20, excludeEstimatedHistory = false } = {}) {
    if (!Array.isArray(data) || data.length === 0) return null;
    if (mode !== 'FILTER' && mode !== 'RECENCY') return null;

    const currentYear = data[data.length - 1]?.jahr ?? new Date().getFullYear();
    const halfLife = Number.isFinite(startYearHalfLife) && startYearHalfLife > 0 ? startYearHalfLife : 20;
    const cutoff = Number.isFinite(startYearFilter) ? startYearFilter : 1970;
    const minStartIndex = resolveMinStartYearIndex(data, excludeEstimatedHistory);

    const weights = data.map((entry, index) => {
        if (index < minStartIndex) return 0;
        if (excludeEstimatedHistory && entry.jahr < ESTIMATED_HISTORY_CUTOFF_YEAR) return 0;
        if (mode === 'FILTER') {
            return entry.jahr >= cutoff ? 1 : 0;
        }
        const age = currentYear - entry.jahr;
        return Math.pow(0.5, age / halfLife);
    });

    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    if (totalWeight <= 0) return null;

    let cumulative = 0;
    const cdf = weights.map(weight => {
        cumulative += weight / totalWeight;
        return cumulative;
    });
    cdf[cdf.length - 1] = 1;
    return cdf;
}

export function pickStartYearIndex(rand, data, cdf, minIndex = MIN_START_YEAR_INDEX) {
    if (!Array.isArray(data) || data.length === 0) return 0;
    const sample = rand ? rand() : Math.random();
    const r = Math.min(1 - Number.EPSILON, Math.max(0, Number.isFinite(sample) ? sample : 0));
    if (!cdf || cdf.length !== data.length) {
        // Gleichverteilung als Fallback, wenn kein CDF vorhanden ist.
        const min = Math.max(0, Math.min(minIndex, data.length - 1));
        const span = Math.max(1, data.length - min);
        return Math.min(data.length - 1, min + Math.floor(r * span));
    }
    let low = 0;
    let high = cdf.length - 1;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (r < cdf[mid]) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}

export function pickMonteCarloStartYearIndex({
    rand,
    inputs,
    annualData,
    useCapeSampling,
    excludeEstimatedHistory = false,
    yearSamplingConfig = null,
    startYearCdf = null,
    minStartYearIndex = MIN_START_YEAR_INDEX,
    samplingContract = null
}) {
    if (samplingContract?.initialStartSampler) {
        return pickFromSampler(rand, samplingContract.initialStartSampler, minStartYearIndex);
    }
    const inputCapeForSampling = Number(inputs.capeRatio) > 0 ? Number(inputs.capeRatio) : Number(inputs.marketCapeRatio);
    if (useCapeSampling && inputCapeForSampling > 0) {
        const candidates = getStartYearCandidates(inputCapeForSampling, annualData, 0.2, { fallbackToAll: false })
            .filter(year => !excludeEstimatedHistory || year >= ESTIMATED_HISTORY_CUTOFF_YEAR);
        if (candidates.length > 0) {
            const chosenYear = candidates[Math.floor(rand() * candidates.length)];
            const idx = annualData.findIndex(d => d.jahr === chosenYear);
            return idx === -1
                ? pickStartYearIndex(rand, annualData, null, minStartYearIndex)
                : idx;
        }
        return pickStartYearIndex(rand, annualData, null, minStartYearIndex);
    }

    return yearSamplingConfig?.allSampler
        ? pickFromSampler(rand, yearSamplingConfig.allSampler, minStartYearIndex)
        : pickStartYearIndex(rand, annualData, startYearCdf, minStartYearIndex);
}
