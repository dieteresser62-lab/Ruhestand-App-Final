import {
    annualData,
    assertHistoricalRegimeContract,
    classifyHistoricalRegime,
    REGIME_CLASSIFICATION_THRESHOLDS,
    REGIME_DATA,
    REGIME_TRANSITIONS,
    STRESS_PRESETS
} from '../app/simulator/simulator-data.js';
import {
    buildStressContext,
    applyStressOverride,
    resolveStressHistoricalPool
} from '../app/simulator/simulator-portfolio-stress.js';
import { sampleNextYearData } from '../app/simulator/simulator-engine-helpers.js';
import {
    formatSimulatorValidationError,
    SIMULATOR_CONTRACT_ERROR_MESSAGES_DE
} from '../app/simulator/simulator-input-validation.js';

console.log('--- Stress And Regime Contract Tests ---');

function captureError(fn) {
    try {
        fn();
        return null;
    } catch (error) {
        return error;
    }
}

const expectedDistribution = { BULL: 40, BEAR: 6, SIDEWAYS: 49, STAGFLATION: 6 };
const actualDistribution = Object.fromEntries(
    REGIME_CLASSIFICATION_THRESHOLDS.labels.map(label => [label, REGIME_DATA[label].length])
);
assertEqual(JSON.stringify(actualDistribution), JSON.stringify(expectedDistribution),
    'Canonical 1925-2025 regime distribution is independently pinned');
assertEqual(REGIME_CLASSIFICATION_THRESHOLDS.calibrationStatus,
    'retained_after_total_return_distribution_review',
    'Threshold retention is explicit after the total-return distribution review');
assertEqual(REGIME_CLASSIFICATION_THRESHOLDS.externalValidationStatus, 'not_validated',
    'Retained thresholds do not claim external calibration');

assertEqual(classifyHistoricalRegime({ rendite: 0.150001, inflation: 2 }), 'BULL',
    'Return strictly above 15 percent is BULL');
assertEqual(classifyHistoricalRegime({ rendite: 0.15, inflation: 2 }), 'SIDEWAYS',
    'Return exactly at 15 percent remains SIDEWAYS');
assertEqual(classifyHistoricalRegime({ rendite: -0.150001, inflation: 2 }), 'BEAR',
    'Return strictly below minus 15 percent is BEAR');
assertEqual(classifyHistoricalRegime({ rendite: -0.15, inflation: 2 }), 'SIDEWAYS',
    'Return exactly at minus 15 percent remains SIDEWAYS');
assertEqual(classifyHistoricalRegime({ rendite: -0.01, inflation: 5.0001 }), 'STAGFLATION',
    'High inflation and a negative equity return take STAGFLATION precedence');
assertEqual(captureError(() => classifyHistoricalRegime({ rendite: Number.NaN, inflation: 2 }))?.code,
    'SIMULATOR_REGIME_INPUT_INVALID', 'Non-finite regime inputs fail closed');

const expectedTransitions = {
    BULL: { total: 40, BULL: 18, BEAR: 2, SIDEWAYS: 17, STAGFLATION: 3 },
    BEAR: { total: 6, BULL: 1, BEAR: 1, SIDEWAYS: 4, STAGFLATION: 0 },
    SIDEWAYS: { total: 48, BULL: 19, BEAR: 3, SIDEWAYS: 26, STAGFLATION: 0 },
    STAGFLATION: { total: 6, BULL: 2, BEAR: 0, SIDEWAYS: 1, STAGFLATION: 3 }
};
assertEqual(JSON.stringify(REGIME_TRANSITIONS), JSON.stringify(expectedTransitions),
    'Canonical transition counts contain no invented fallback transitions');

const expectedStressEvidenceKinds = {
    NONE: 'none',
    STAGFLATION_70s: 'historical_filter',
    DOUBLE_BEAR_00s: 'historical_filter',
    GREAT_DEPRESSION_29_33: 'reconstructed_window',
    WWII_40s: 'reconstructed_window',
    STAGFLATION_SUPER: 'hybrid_synthetic',
    INFLATION_SPIKE_3Y: 'synthetic_shock',
    FORCED_DRAWDOWN_3Y: 'synthetic_shock',
    LOST_DECADE_12Y: 'synthetic_shock',
    CORRELATION_CRASH_4Y: 'synthetic_shock'
};
assertEqual(
    JSON.stringify(Object.fromEntries(Object.entries(STRESS_PRESETS).map(([key, preset]) => [key, preset.provenance?.evidenceKind]))),
    JSON.stringify(expectedStressEvidenceKinds),
    'Every stress preset distinguishes observation, reconstruction, hybrid and synthetic evidence'
);
assertEqual(STRESS_PRESETS.STAGFLATION_70s.provenance.sourceEvidence,
    'mixed_observation_proxy_and_reconstruction',
    'Historical filters disclose their mixed observation/proxy/reconstruction source evidence');
assertEqual(STRESS_PRESETS.GREAT_DEPRESSION_29_33.provenance.sourceEvidence,
    'research_proxy_reconstruction',
    'Named early calendar windows disclose reconstruction rather than observation');
assert(!STRESS_PRESETS.GREAT_DEPRESSION_29_33.label.startsWith('Great Depression'),
    'Reconstructed 1929-1933 window does not claim an exact observed Great Depression replay');
assert(!STRESS_PRESETS.WWII_40s.label.startsWith('Zweiter Weltkrieg'),
    'Reconstructed 1939-1945 window does not claim an exact observed WWII replay');
assert(Object.isFrozen(STRESS_PRESETS) && Object.isFrozen(STRESS_PRESETS.STAGFLATION_70s.provenance),
    'Stress preset and provenance contracts are deeply immutable');

const yearsFor = key => buildStressContext(key, () => 0.5).pickableIndices.map(index => annualData[index].jahr);
assertEqual(JSON.stringify(yearsFor('GREAT_DEPRESSION_29_33')), JSON.stringify([1929, 1930, 1931, 1932, 1933]),
    'Reconstructed 1929-1933 window is exact at the calendar boundary');
assertEqual(JSON.stringify(yearsFor('WWII_40s')), JSON.stringify([1939, 1940, 1941, 1942, 1943, 1944, 1945]),
    'Reconstructed 1939-1945 window is exact at the calendar boundary');
assertEqual(JSON.stringify(yearsFor('DOUBLE_BEAR_00s')),
    JSON.stringify([1929, 1930, 1931, 1946, 1947, 1948, 1973, 1974, 2001, 2002]),
    'Minimum two-year stress clusters exclude isolated loss years');
assertEqual(JSON.stringify(yearsFor('STAGFLATION_70s')), JSON.stringify([1946, 1948, 1973]),
    'Stagflation filter pool is fully pinned');
assertEqual(JSON.stringify(yearsFor('STAGFLATION_SUPER')), JSON.stringify([1946, 1948, 1973]),
    'Hybrid stagflation filter pool is fully pinned');
assertEqual(resolveStressHistoricalPool('DOUBLE_BEAR_00s').minimumDistinctYears, 3,
    'Historical conditional stress requires a non-degenerate three-year pool');
assert(formatSimulatorValidationError({ code: 'SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY' }).includes('Startjahrfilter'),
    'Empty effective stress pools have a German filter-specific action message');
assert(formatSimulatorValidationError({ code: 'SIMULATOR_STRESS_EFFECTIVE_POOL_TOO_SMALL' }).includes('synthetisches Stressszenario'),
    'Degenerate effective stress pools recommend a viable alternative');
const expectedLocalizedCodes = [
    'SIMULATOR_STRESS_PRESET_UNKNOWN',
    'SIMULATOR_STRESS_POOL_EMPTY',
    'SIMULATOR_STRESS_SEQUENCE_INVALID',
    'SIMULATOR_STRESS_INPUT_INVALID',
    'SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY',
    'SIMULATOR_STRESS_EFFECTIVE_POOL_TOO_SMALL',
    'SIMULATOR_REGIME_INPUT_INVALID',
    'SIMULATOR_REGIME_TRANSITIONS_EMPTY',
    'SIMULATOR_REGIME_DISTRIBUTION_DRIFT',
    'SIMULATOR_REGIME_TRANSITIONS_INVALID',
    'SIMULATOR_REGIME_TRANSITION_SELECTION_FAILED',
    'MC_SAMPLING_REGIME_POOL_EMPTY',
    'SIMULATOR_REGIME_POOL_EMPTY'
];
assertEqual(JSON.stringify(Object.keys(SIMULATOR_CONTRACT_ERROR_MESSAGES_DE).sort()),
    JSON.stringify([...expectedLocalizedCodes].sort()),
    'Every stress and regime contract code has one German UI message');
for (const code of expectedLocalizedCodes) {
    const message = formatSimulatorValidationError({ code, message: `${code}: raw English` });
    assert(!message.includes(code) && !message.includes('raw English'), `${code} does not leak its raw error text`);
    assert(!/(?:ausfuehr|frueher|geschaetzt|enthaelt|fuer|uebergaeng|pruef|bestaetig)/i.test(message),
        `${code} uses proper German umlauts instead of ASCII transliteration`);
}

assertEqual(buildStressContext(undefined, () => 0.5), null,
    'Missing optional stress input uses the explicit NONE default');
assertEqual(captureError(() => buildStressContext('UNKNOWN_PRESET', () => 0.5))?.code,
    'SIMULATOR_STRESS_PRESET_UNKNOWN', 'Unknown stress presets fail closed');

const backupAnnual = annualData.slice();
try {
    annualData.length = 0;
    assertEqual(captureError(() => buildStressContext('STAGFLATION_70s', () => 0.5))?.code,
        'SIMULATOR_STRESS_POOL_EMPTY', 'Empty historical stress pools fail closed');
} finally {
    annualData.push(...backupAnnual);
}

try {
    const onlyStagflationYear = backupAnnual.find(entry => entry.jahr === 1973);
    annualData.length = 0;
    annualData.push(onlyStagflationYear);
    assertEqual(captureError(() => buildStressContext('STAGFLATION_70s', () => 0.5))?.code,
        'SIMULATOR_STRESS_EFFECTIVE_POOL_TOO_SMALL',
        'Stress context construction rejects a non-empty but degenerate raw pool');
} finally {
    annualData.length = 0;
    annualData.push(...backupAnnual);
}

const runtimeDiversityContext = buildStressContext('STAGFLATION_70s', () => 0.5);
const year1973Index = annualData.findIndex(entry => entry.jahr === 1973);
const runtimeDiversityState = {
    samplerState: {
        yearSampling: { allowedIndexSet: new Set([year1973Index]) }
    }
};
assertEqual(captureError(() => sampleNextYearData(
    runtimeDiversityState,
    'block',
    2,
    () => 0,
    runtimeDiversityContext
))?.code, 'SIMULATOR_STRESS_EFFECTIVE_POOL_TOO_SMALL',
'Runtime stress sampling independently rejects a one-year effective pool');

const sequenceContext = buildStressContext('FORCED_DRAWDOWN_3Y', () => 0.5);
sequenceContext.preset = { ...sequenceContext.preset, seqReturnsEq: [] };
assertEqual(captureError(() => applyStressOverride({
    rendite: 0.05,
    inflation: 2,
    gold_eur_perf: 1
}, sequenceContext, () => 0.5))?.code, 'SIMULATOR_STRESS_SEQUENCE_INVALID',
'Missing parametric sequence values fail closed instead of becoming zero returns');

const invalidInputContext = buildStressContext('INFLATION_SPIKE_3Y', () => 0.5);
assertEqual(captureError(() => applyStressOverride({
    rendite: Number.NaN,
    inflation: 2,
    gold_eur_perf: 1
}, invalidInputContext, () => 0.5))?.code, 'SIMULATOR_STRESS_INPUT_INVALID',
'Non-finite stress inputs fail closed');

try {
    REGIME_TRANSITIONS.BULL.total = 0;
    assertEqual(captureError(() => assertHistoricalRegimeContract())?.code,
        'SIMULATOR_REGIME_TRANSITIONS_EMPTY', 'Empty canonical transition rows fail the runtime preflight');
} finally {
    REGIME_TRANSITIONS.BULL.total = 40;
}

const removedSideways = REGIME_DATA.SIDEWAYS.pop();
try {
    const drift = captureError(() => assertHistoricalRegimeContract());
    assertEqual(drift?.code, 'SIMULATOR_REGIME_DISTRIBUTION_DRIFT',
        'Regime distribution drift fails at runtime instead of module import');
    assert(drift?.message.includes('expected') && drift?.message.includes('observed'),
        'Distribution drift diagnostics expose expected and observed inventories');
    assert(formatSimulatorValidationError(drift).includes('Regimevertrag'),
        'Distribution drift has a German user-facing action message');
} finally {
    REGIME_DATA.SIDEWAYS.push(removedSideways);
}

const filteredRegimeState = {
    samplerState: {
        yearInBlock: 0,
        yearSampling: {
            allowedIndices: [annualData.length - 1],
            regimeSamplers: {}
        }
    }
};
assertEqual(captureError(() => sampleNextYearData(
    filteredRegimeState,
    'regime_iid',
    2,
    () => 0,
    null
))?.code, 'SIMULATOR_REGIME_POOL_EMPTY',
'A missing effective regime pool never falls back to unfiltered history');

const transitionBackup = REGIME_TRANSITIONS.BULL;
try {
    REGIME_TRANSITIONS.BULL = { total: 0 };
    const state = { samplerState: { currentRegime: 'BULL', yearInBlock: 0 } };
    assertEqual(captureError(() => sampleNextYearData(state, 'regime_markov', 2, () => 0.5, null))?.code,
        'SIMULATOR_REGIME_TRANSITIONS_INVALID', 'Invalid transition rows fail closed');
} finally {
    REGIME_TRANSITIONS.BULL = transitionBackup;
}

try {
    REGIME_TRANSITIONS.BULL = { total: 2, BULL: 1 };
    const state = { samplerState: { currentRegime: 'BULL', yearInBlock: 0 } };
    assertEqual(captureError(() => sampleNextYearData(state, 'regime_markov', 2, () => 0.75, null))?.code,
        'SIMULATOR_REGIME_TRANSITION_SELECTION_FAILED',
        'Non-reconciling transition counts do not silently select SIDEWAYS');
} finally {
    REGIME_TRANSITIONS.BULL = transitionBackup;
}

console.log('--- Stress And Regime Contract Tests Completed ---');
