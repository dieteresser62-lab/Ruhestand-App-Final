import {
    STATIONARY_BOOTSTRAP_DEFAULT_EXPECTED_BLOCK_LENGTH,
    STATIONARY_BOOTSTRAP_LABEL,
    STATIONARY_BOOTSTRAP_MAX_EXPECTED_BLOCK_LENGTH,
    STATIONARY_BOOTSTRAP_METHOD,
    STATIONARY_BOOTSTRAP_RESTART_REASONS,
    STATIONARY_BOOTSTRAP_SAMPLING_SCOPE,
    isStationaryBootstrapMethod,
    normalizeStationaryBootstrapConfig,
    resolveStationaryBootstrapStartPolicy
} from '../app/simulator/stationary-bootstrap-contract.js';

console.log('--- Stationary Bootstrap Contract Tests ---');

{
    assertEqual(STATIONARY_BOOTSTRAP_METHOD, 'stationary', 'Stationary Bootstrap uses the reviewed internal method name');
    assertEqual(STATIONARY_BOOTSTRAP_LABEL, 'Stationary Bootstrap', 'Stationary Bootstrap has the reviewed UI label');
    assert(isStationaryBootstrapMethod('stationary'), 'stationary is recognized as stationary bootstrap');
    assert(!isStationaryBootstrapMethod('block'), 'block remains a separate method');
}

{
    const normalized = normalizeStationaryBootstrapConfig({ blockSize: 5 });
    assertEqual(normalized.expectedBlockLength, 5, 'mcBlockSize is reusable as expected block length');
    assertClose(normalized.restartProbability, 0.2, 1e-12, 'restart probability is 1 / expectedBlockLength');
}

{
    assertEqual(
        normalizeStationaryBootstrapConfig({ expectedBlockLength: 0 }).expectedBlockLength,
        1,
        'zero expected block length falls back to IID behavior'
    );
    assertEqual(
        normalizeStationaryBootstrapConfig({ expectedBlockLength: -3 }).expectedBlockLength,
        1,
        'negative expected block length falls back to IID behavior'
    );
    assertEqual(
        normalizeStationaryBootstrapConfig({ expectedBlockLength: Number.NaN }).expectedBlockLength,
        STATIONARY_BOOTSTRAP_DEFAULT_EXPECTED_BLOCK_LENGTH,
        'non-finite expected block length uses the default'
    );
    assertEqual(
        normalizeStationaryBootstrapConfig({ expectedBlockLength: 999 }).expectedBlockLength,
        STATIONARY_BOOTSTRAP_MAX_EXPECTED_BLOCK_LENGTH,
        'expected block length is capped at the reviewed maximum'
    );
}

{
    const policy = resolveStationaryBootstrapStartPolicy({
        useCapeSampling: true,
        startYearMode: 'RECENCY'
    });
    assertEqual(policy.blockStartSelector, 'CAPE', 'CAPE sampling has priority for new block starts');
    assertEqual(policy.capeHasPriority, true, 'CAPE priority is explicit in the contract');
    assertEqual(
        policy.weightedSelectionScope,
        STATIONARY_BOOTSTRAP_SAMPLING_SCOPE.NEW_BLOCK_STARTS_ONLY,
        'CAPE/FILTER/RECENCY weighting applies only to new block starts'
    );
    assertEqual(
        policy.continuationScope,
        STATIONARY_BOOTSTRAP_SAMPLING_SCOPE.SEQUENTIAL_CONTINUATION,
        'block continuation is sequential'
    );
    assertEqual(
        policy.appliesFilterRecencyDuringContinuation,
        false,
        'FILTER/RECENCY do not affect continuation years'
    );
}

{
    const policy = resolveStationaryBootstrapStartPolicy({
        useCapeSampling: false,
        startYearMode: 'FILTER'
    });
    assertEqual(policy.blockStartSelector, 'FILTER', 'FILTER selects new block starts when CAPE is inactive');
    assertEqual(policy.capeHasPriority, false, 'CAPE priority is inactive when CAPE sampling is off');
}

{
    assertEqual(STATIONARY_BOOTSTRAP_RESTART_REASONS.DATA_END, 'data_end', 'data_end restart reason is contractual');
    assertEqual(STATIONARY_BOOTSTRAP_RESTART_REASONS.RANDOM, 'random', 'random restart reason is contractual');
}

console.log('--- Stationary Bootstrap Contract Tests Completed ---');
