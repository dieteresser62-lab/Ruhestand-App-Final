"use strict";

import {
    STATIONARY_BOOTSTRAP_RESTART_REASONS,
    normalizeStationaryBootstrapConfig
} from './stationary-bootstrap-contract.js';

function clampRandom(value) {
    return Math.min(1 - Number.EPSILON, Math.max(0, Number.isFinite(value) ? value : 0));
}

function drawRandom(rng) {
    return clampRandom(typeof rng === 'function' ? rng() : Math.random());
}

function validateAnnualData(annualData) {
    if (!Array.isArray(annualData) || annualData.length === 0) {
        throw new TypeError('Stationary Bootstrap requires a non-empty annualData array.');
    }
    return annualData;
}

function normalizeStartIndices({ annualData, startIndices }) {
    if (!Array.isArray(startIndices) || startIndices.length === 0) {
        return annualData.map((_, index) => index);
    }
    const valid = [];
    const seen = new Set();
    for (const rawIndex of startIndices) {
        const index = Math.round(Number(rawIndex));
        if (!Number.isInteger(index) || index < 0 || index >= annualData.length || seen.has(index)) continue;
        seen.add(index);
        valid.push(index);
    }
    return valid.length > 0 ? valid : annualData.map((_, index) => index);
}

function normalizeSamplerCdf({ cdf, startIndices }) {
    if (Array.isArray(cdf) && cdf.length === startIndices.length) {
        return cdf.map(value => clampRandom(Number(value)));
    }
    return null;
}

function pickFromIndexedCdf(draw, startIndices, cdf) {
    let low = 0;
    let high = cdf.length - 1;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (draw < cdf[mid]) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return startIndices[low] ?? startIndices[0] ?? 0;
}

function pickBlockStartIndex(state) {
    const draw = drawRandom(state.rng);
    const samplerObject = state.startSamplerObject;
    if (samplerObject) {
        if (Array.isArray(samplerObject.cdf) && samplerObject.cdf.length === samplerObject.indices.length) {
            return pickFromIndexedCdf(draw, samplerObject.indices, samplerObject.cdf);
        }
        const offset = Math.floor(draw * samplerObject.indices.length);
        return samplerObject.indices[Math.min(samplerObject.indices.length - 1, offset)] ?? 0;
    }
    if (Array.isArray(state.startCdf) && state.startCdf.length === state.startIndices.length) {
        return pickFromIndexedCdf(draw, state.startIndices, state.startCdf);
    }
    const offset = Math.floor(draw * state.startIndices.length);
    return state.startIndices[Math.min(state.startIndices.length - 1, offset)] ?? 0;
}

export function createStationaryBootstrapSampler({
    annualData,
    expectedBlockLength,
    blockSize,
    mode = 'UNIFORM',
    cdf = null,
    startIndices = null,
    initialStartIndex = null,
    rng = null
} = {}) {
    const safeAnnualData = validateAnnualData(annualData);
    const config = normalizeStationaryBootstrapConfig({ expectedBlockLength, blockSize });
    const normalizedStartIndices = normalizeStartIndices({ annualData: safeAnnualData, startIndices });
    let startSamplerObject = null;
    if (cdf && Array.isArray(cdf.indices) && Array.isArray(cdf.cdf) && cdf.indices.length === cdf.cdf.length) {
        const paired = [];
        const seen = new Set();
        for (let i = 0; i < cdf.indices.length; i++) {
            const index = Math.round(Number(cdf.indices[i]));
            if (!Number.isInteger(index) || index < 0 || index >= safeAnnualData.length || seen.has(index)) continue;
            seen.add(index);
            paired.push({ index, cdf: clampRandom(Number(cdf.cdf[i])) });
        }
        if (paired.length > 0) {
            startSamplerObject = {
                indices: paired.map(item => item.index),
                cdf: paired.map(item => item.cdf)
            };
        }
    }

    return {
        annualData: safeAnnualData,
        mode,
        expectedBlockLength: config.expectedBlockLength,
        restartProbability: config.restartProbability,
        rng,
        startIndices: normalizedStartIndices,
        startCdf: normalizeSamplerCdf({ cdf, startIndices: normalizedStartIndices }),
        startSamplerObject,
        initialStartIndex: Number.isInteger(initialStartIndex)
            && initialStartIndex >= 0
            && initialStartIndex < safeAnnualData.length
            ? initialStartIndex
            : null,
        currentIndex: null,
        yearsInCurrentBlock: 0,
        restartCount: 0,
        lastRestartReason: null,
        lastRestartDraw: null
    };
}

export function nextYearSample(state) {
    if (!state || !Array.isArray(state.annualData) || state.annualData.length === 0) {
        throw new TypeError('Stationary Bootstrap state requires a non-empty annualData array.');
    }

    const isInitial = state.currentIndex === null || state.currentIndex === undefined;
    const restartDraw = isInitial ? null : drawRandom(state.rng);
    state.lastRestartDraw = restartDraw;
    const isAtDataEnd = !isInitial && state.currentIndex >= state.annualData.length - 1;
    const isRandomRestart = !isInitial && !isAtDataEnd && restartDraw < state.restartProbability;

    let restartReason = null;
    if (isInitial) {
        restartReason = STATIONARY_BOOTSTRAP_RESTART_REASONS.INITIAL;
    } else if (isAtDataEnd) {
        restartReason = STATIONARY_BOOTSTRAP_RESTART_REASONS.DATA_END;
    } else if (isRandomRestart) {
        restartReason = STATIONARY_BOOTSTRAP_RESTART_REASONS.RANDOM;
    }

    if (restartReason) {
        state.currentIndex = restartReason === STATIONARY_BOOTSTRAP_RESTART_REASONS.INITIAL
            && state.initialStartIndex !== null
            ? state.initialStartIndex
            : pickBlockStartIndex(state);
        state.yearsInCurrentBlock = 1;
        state.restartCount += 1;
        state.lastRestartReason = restartReason;
    } else {
        state.currentIndex += 1;
        state.yearsInCurrentBlock += 1;
        state.lastRestartReason = null;
    }

    return {
        yearData: { ...state.annualData[state.currentIndex] },
        index: state.currentIndex,
        isRestart: Boolean(restartReason),
        restartReason,
        restartDraw,
        yearsInCurrentBlock: state.yearsInCurrentBlock,
        restartCount: state.restartCount
    };
}
