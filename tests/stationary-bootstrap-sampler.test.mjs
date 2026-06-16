import {
    STATIONARY_BOOTSTRAP_RESTART_REASONS,
    normalizeStationaryBootstrapConfig,
    resolveStationaryBootstrapStartPolicy
} from '../app/simulator/stationary-bootstrap-contract.js';
import {
    createStationaryBootstrapSampler,
    nextYearSample
} from '../app/simulator/stationary-bootstrap-sampler.js';

console.log('--- Stationary Bootstrap Sampler Tests ---');

const sampleData = [
    { jahr: 2000, rendite: 0.01, inflation: 0.01, regime: 'SIDEWAYS' },
    { jahr: 2001, rendite: 0.02, inflation: 0.02, regime: 'BULL' },
    { jahr: 2002, rendite: 0.03, inflation: 0.03, regime: 'BULL' },
    { jahr: 2003, rendite: -0.04, inflation: 0.04, regime: 'BEAR' },
    { jahr: 2004, rendite: 0.05, inflation: 0.05, regime: 'SIDEWAYS' }
];

function createSequenceRng(sequence) {
    let index = 0;
    return () => {
        const value = sequence[index] ?? 0.5;
        index += 1;
        return value;
    };
}

{
    const config = normalizeStationaryBootstrapConfig(null);
    assertEqual(config.expectedBlockLength, 5, 'null config uses default expected block length');

    const policy = resolveStationaryBootstrapStartPolicy(null);
    assertEqual(policy.blockStartSelector, 'UNIFORM', 'null policy options use uniform selector');

    const stringCapePolicy = resolveStationaryBootstrapStartPolicy({
        useCapeSampling: 'true',
        startYearMode: 'RECENCY'
    });
    assertEqual(stringCapePolicy.blockStartSelector, 'RECENCY', 'truthy non-boolean CAPE flag does not activate CAPE');
    assertEqual(stringCapePolicy.capeHasPriority, false, 'truthy non-boolean CAPE flag is not reported as priority');
}

{
    const sampler = createStationaryBootstrapSampler({
        annualData: sampleData,
        expectedBlockLength: 5,
        startIndices: [1],
        rng: createSequenceRng([0.9, 0.0, 0.9, 0.9])
    });

    const first = nextYearSample(sampler);
    const second = nextYearSample(sampler);
    const third = nextYearSample(sampler);

    assertEqual(first.index, 1, 'initial start uses configured start index');
    assertEqual(first.restartReason, STATIONARY_BOOTSTRAP_RESTART_REASONS.INITIAL, 'first sample is initial restart');
    assertEqual(second.index, 2, 'continuation advances sequentially');
    assertEqual(third.index, 3, 'second continuation advances sequentially again');
    assertEqual(sampler.restartCount, 1, 'continuation does not increment restart count');
}

{
    const sampler = createStationaryBootstrapSampler({
        annualData: sampleData,
        expectedBlockLength: 1,
        startIndices: [0, 2, 4],
        rng: createSequenceRng([0.2, 0.0, 0.4, 0.5, 0.6, 0.99])
    });

    const first = nextYearSample(sampler);
    const second = nextYearSample(sampler);
    const third = nextYearSample(sampler);

    assertEqual(first.index, 0, 'expectedBlockLength=1 can start at first configured index');
    assertEqual(second.restartReason, STATIONARY_BOOTSTRAP_RESTART_REASONS.RANDOM, 'expectedBlockLength=1 restarts on next sample');
    assertEqual(second.index, 2, 'random restart picks a new configured start index');
    assertEqual(third.index, 4, 'subsequent restart also uses configured start index pool');
    assertEqual(sampler.restartCount, 3, 'IID behavior restarts every sampled year after initialization');
}

{
    const sampler = createStationaryBootstrapSampler({
        annualData: sampleData,
        expectedBlockLength: 30,
        startIndices: [3],
        rng: createSequenceRng([0.7, 0.0, 0.8, 0.8, 0.8])
    });

    const first = nextYearSample(sampler);
    const second = nextYearSample(sampler);
    const third = nextYearSample(sampler);

    assertEqual(first.index, 3, 'data-end scenario starts at penultimate entry');
    assertEqual(second.index, 4, 'sampler can continue to the final data point');
    assertEqual(third.restartReason, STATIONARY_BOOTSTRAP_RESTART_REASONS.DATA_END, 'final data point forces data_end restart');
    assertEqual(third.index, 3, 'data_end restart selects a configured new block start without wrap-around');
    assertEqual(sampler.lastRestartDraw, 0.8, 'data_end sample still consumes one restart draw');
}

{
    const sampler = createStationaryBootstrapSampler({
        annualData: sampleData,
        expectedBlockLength: 5,
        cdf: {
            indices: [1, 4],
            cdf: [0.25, 1]
        },
        rng: createSequenceRng([0.9, 0.2])
    });

    const first = nextYearSample(sampler);
    assertEqual(first.index, 1, 'sampler object CDF selects weighted start index');
}

console.log('--- Stationary Bootstrap Sampler Tests Completed ---');
