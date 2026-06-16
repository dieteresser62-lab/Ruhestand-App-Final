"use strict";

export const STATIONARY_BOOTSTRAP_METHOD = 'stationary';
export const STATIONARY_BOOTSTRAP_LABEL = 'Stationary Bootstrap';
export const STATIONARY_BOOTSTRAP_MIN_EXPECTED_BLOCK_LENGTH = 1;
export const STATIONARY_BOOTSTRAP_MAX_EXPECTED_BLOCK_LENGTH = 30;
export const STATIONARY_BOOTSTRAP_DEFAULT_EXPECTED_BLOCK_LENGTH = 5;

export const STATIONARY_BOOTSTRAP_RESTART_REASONS = Object.freeze({
    INITIAL: 'initial',
    RANDOM: 'random',
    DATA_END: 'data_end'
});

export const STATIONARY_BOOTSTRAP_SAMPLING_SCOPE = Object.freeze({
    NEW_BLOCK_STARTS_ONLY: 'new_block_starts_only',
    SEQUENTIAL_CONTINUATION: 'sequential_continuation'
});

export function isStationaryBootstrapMethod(method) {
    return method === STATIONARY_BOOTSTRAP_METHOD;
}

export function normalizeStationaryBootstrapConfig(inputs = {}) {
    const safeInputs = inputs || {};
    const raw = Number(safeInputs.expectedBlockLength ?? safeInputs.blockSize);
    let expectedBlockLength;
    if (!Number.isFinite(raw)) {
        expectedBlockLength = STATIONARY_BOOTSTRAP_DEFAULT_EXPECTED_BLOCK_LENGTH;
    } else if (raw <= 0) {
        expectedBlockLength = STATIONARY_BOOTSTRAP_MIN_EXPECTED_BLOCK_LENGTH;
    } else {
        expectedBlockLength = Math.round(raw);
    }

    expectedBlockLength = Math.min(
        STATIONARY_BOOTSTRAP_MAX_EXPECTED_BLOCK_LENGTH,
        Math.max(STATIONARY_BOOTSTRAP_MIN_EXPECTED_BLOCK_LENGTH, expectedBlockLength)
    );

    return {
        method: STATIONARY_BOOTSTRAP_METHOD,
        expectedBlockLength,
        restartProbability: 1 / expectedBlockLength,
        minExpectedBlockLength: STATIONARY_BOOTSTRAP_MIN_EXPECTED_BLOCK_LENGTH,
        maxExpectedBlockLength: STATIONARY_BOOTSTRAP_MAX_EXPECTED_BLOCK_LENGTH
    };
}

export function resolveStationaryBootstrapStartPolicy(options = {}) {
    const safeOptions = options || {};
    const useCapeSampling = safeOptions.useCapeSampling === true;
    const startYearMode = safeOptions.startYearMode ?? 'UNIFORM';
    const normalizedStartYearMode = ['UNIFORM', 'FILTER', 'RECENCY'].includes(startYearMode)
        ? startYearMode
        : 'UNIFORM';
    const blockStartSelector = useCapeSampling ? 'CAPE' : normalizedStartYearMode;

    return {
        blockStartSelector,
        capeHasPriority: useCapeSampling === true,
        weightedSelectionScope: STATIONARY_BOOTSTRAP_SAMPLING_SCOPE.NEW_BLOCK_STARTS_ONLY,
        continuationScope: STATIONARY_BOOTSTRAP_SAMPLING_SCOPE.SEQUENTIAL_CONTINUATION,
        appliesFilterRecencyDuringContinuation: false
    };
}
