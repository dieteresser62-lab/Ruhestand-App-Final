import { annualData, REGIME_DATA, REGIME_TRANSITIONS } from '../app/simulator/simulator-data.js';
import { sampleNextYearData } from '../app/simulator/simulator-engine-helpers.js';

console.log('--- Historical Data Robustness Tests ---');

// Simple deterministic RNG that returns a fixed sequence then 0.5.
function createMockRng(sequence) {
    let index = 0;
    return () => {
        if (index >= sequence.length) return 0.5;
        return sequence[index++];
    };
}

// Backup global data so we can restore after the mutation test.
const backupAnnual = annualData.slice();
const backupRegimeData = {
    BULL: REGIME_DATA.BULL.slice(),
    BEAR: REGIME_DATA.BEAR.slice(),
    SIDEWAYS: REGIME_DATA.SIDEWAYS.slice(),
    STAGFLATION: REGIME_DATA.STAGFLATION.slice()
};
const backupTransitions = JSON.parse(JSON.stringify(REGIME_TRANSITIONS));

try {
    // Wipe all historical data to trigger the empty-data fallback path.
    annualData.length = 0;
    REGIME_DATA.BULL.length = 0;
    REGIME_DATA.BEAR.length = 0;
    REGIME_DATA.SIDEWAYS.length = 0;
    REGIME_DATA.STAGFLATION.length = 0;
    Object.keys(REGIME_TRANSITIONS).forEach(key => delete REGIME_TRANSITIONS[key]);

    const state = { samplerState: { currentRegime: 'BULL', yearInBlock: 0 } };
    const rand = createMockRng([0.1, 0.9]);

    const result = sampleNextYearData(state, 'block', 2, rand, null);

    assert(result, 'Should return a data object even when historical data is empty');
    assert(Number.isFinite(result.rendite), 'rendite should be finite');
    assert(result.regime === 'SIDEWAYS', 'Fallback regime should be SIDEWAYS');

    console.log('✅ Empty historical data handled');
} finally {
    // Restore original data to avoid polluting other tests.
    annualData.length = 0;
    backupAnnual.forEach(entry => annualData.push(entry));
    REGIME_DATA.BULL.length = 0;
    REGIME_DATA.BEAR.length = 0;
    REGIME_DATA.SIDEWAYS.length = 0;
    REGIME_DATA.STAGFLATION.length = 0;
    backupRegimeData.BULL.forEach(entry => REGIME_DATA.BULL.push(entry));
    backupRegimeData.BEAR.forEach(entry => REGIME_DATA.BEAR.push(entry));
    backupRegimeData.SIDEWAYS.forEach(entry => REGIME_DATA.SIDEWAYS.push(entry));
    backupRegimeData.STAGFLATION.forEach(entry => REGIME_DATA.STAGFLATION.push(entry));
    Object.keys(REGIME_TRANSITIONS).forEach(key => delete REGIME_TRANSITIONS[key]);
    Object.assign(REGIME_TRANSITIONS, backupTransitions);
}

console.log('--- Historical Data Robustness Tests Completed ---');
