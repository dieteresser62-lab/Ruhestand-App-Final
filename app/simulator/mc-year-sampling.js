import { getStartYearCandidates } from '../shared/cape-utils.js';
import { ESTIMATED_HISTORY_CUTOFF_YEAR } from './simulator-data.js';

export const MIN_START_YEAR_INDEX = 4;

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
    if (!sampler || !sampler.cdf || !sampler.indices || sampler.indices.length === 0) {
        return fallbackIndex;
    }
    const sample = rand ? rand() : Math.random();
    const r = Math.min(1 - Number.EPSILON, Math.max(0, Number.isFinite(sample) ? sample : 0));
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

    // Block-Sampling: Startindex so wählen, dass ein Block (blockSize) passt.
    const maxStartIndex = Math.max(minStartIndex + 1, data.length - blockSize);
    const blockStartIndices = allowedIndices.filter(idx => idx < maxStartIndex);
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
    minStartYearIndex = MIN_START_YEAR_INDEX
}) {
    const inputCapeForSampling = Number(inputs.capeRatio) > 0 ? Number(inputs.capeRatio) : Number(inputs.marketCapeRatio);
    if (useCapeSampling && inputCapeForSampling > 0) {
        const candidates = getStartYearCandidates(inputCapeForSampling, annualData)
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
        ? pickFromSampler(
            rand,
            yearSamplingConfig.allSampler,
            pickStartYearIndex(rand, annualData, null, minStartYearIndex)
        )
        : pickStartYearIndex(rand, annualData, startYearCdf, minStartYearIndex);
}
