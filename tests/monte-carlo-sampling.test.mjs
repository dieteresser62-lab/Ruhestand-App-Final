
import { sampleNextYearData, initMcRunState } from '../simulator-engine-helpers.js';
import { REGIME_TRANSITIONS, annualData } from '../simulator-data.js';
import { prepareHistoricalData } from '../simulator-portfolio.js';

console.log('--- Monte-Carlo Sampling Tests ---');

// Initialize Data
prepareHistoricalData(); // Populates annualData

// --- Helper: Mock RNG ---
// Simple linear congruential generator for deterministic "random" numbers or sequence player
function createMockRng(sequence) {
    let index = 0;
    return () => {
        if (index >= sequence.length) return 0.5; // Fallback
        return sequence[index++];
    };
}

// --- TEST 1: Conditional Bootstrap (Stress Scenario) ---
{
    // If stressCtx is provided, it should pick from pickableIndices
    const mockState = { samplerState: {} };

    // Test Case: Pick indices 10 and 20.
    // Index 10: 1961 (Bear/Sideways?). Index 20: 1971.

    const stressCtx = {
        type: 'conditional_bootstrap',
        remainingYears: 5,
        pickableIndices: [10, 20]
    };

    // Mock Rand: First call returns 0.99 -> floor(0.99*2) = 1.
    // Should pick index 20.
    const rand = createMockRng([0.99]);

    const result = sampleNextYearData(mockState, 'block', 1, rand, stressCtx);

    // Assertions: Result should be a data object from annualData
    assert(result, 'Should return a data object');
    assert(typeof result.rendite === 'number', 'Should have rendite'); // NOT msci_eur
    assert(result.regime, 'Should have regime');

    console.log('✅ Conditional Bootstrap logic execution works');
}

// --- TEST 2: Block Bootstrap Regime Transition ---
{
    // Verify that regime transitions follow the matrix
    // Current Regime: BULL

    const mockState = {
        samplerState: { currentRegime: 'BULL' }
    };

    // Pick ANY valid transition
    const rand = createMockRng([0.5, 0.5]);

    const result = sampleNextYearData(mockState, 'block', 1, rand, null);

    const newRegime = mockState.samplerState.currentRegime;
    assert(['BULL', 'BEAR', 'SIDEWAYS', 'STAGFLATION'].includes(newRegime),
        `New Regime ${newRegime} should be valid`);

    console.log(`✅ Regime Transition works (Transitioned to ${newRegime})`);
}

// --- TEST 3: Determinism (Seed/Sequence) ---
{
    // Same Mock RNG Sequence -> Identical Result
    const seq = [0.1, 0.2, 0.8, 0.3];

    const stateA = { samplerState: { currentRegime: 'BULL' } };
    const randA = createMockRng([...seq]);
    const resultA = sampleNextYearData(stateA, 'block', 1, randA, null);

    const stateB = { samplerState: { currentRegime: 'BULL' } };
    const randB = createMockRng([...seq]);
    const resultB = sampleNextYearData(stateB, 'block', 1, randB, null);

    assert(resultA.rendite === resultB.rendite, 'Identical RNG -> Identical Market Data');
    assert(stateA.samplerState.currentRegime === stateB.samplerState.currentRegime, 'Identical RNG -> Identical Regime State');

    console.log('✅ Determinism works');
}

console.log('--- Monte-Carlo Sampling Tests Completed ---');
