import {
    STRESS_REPLAY_CAPTURE_VERSION,
    STRESS_REPLAY_POST_RUIN_POLICY_VERSION,
    STRESS_REPLAY_SHADOW_DOMAIN,
    createStressReplayCaptureRequest,
    deriveStressReplayShadowSeed,
    materializeStressReplayPathV1
} from '../app/simulator/stress-replay-path-materializer.js';
import { createStressReplayFingerprint } from '../app/simulator/stress-replay-contract.js';
import { ScenarioAnalyzer } from '../app/simulator/scenario-analyzer.js';

function fingerprint(value) {
    return createStressReplayFingerprint(value);
}

function household(p1Alive = 1) {
    return [{ type: 'household_state', p1Alive, p2Alive: null }];
}

function financialYear(yearIndex, historicalYear, overrides = {}) {
    return {
        yearIndex,
        recordType: 'financial_year',
        financiallyEvaluable: true,
        historicalYear,
        equityReturnPct: -10,
        goldReturnPct: 5,
        cashReturnPct: 2,
        inflationPct: 3,
        wageGrowthPct: 2.5,
        capeRatio: 20,
        regime: 'BEAR',
        stressEvents: [],
        tailRiskEvents: [],
        householdEvents: household(),
        continuation: false,
        ...overrides
    };
}

const capture = {
    schemaVersion: STRESS_REPLAY_CAPTURE_VERSION,
    seed: 1234,
    runSeed: 9876,
    rngMode: 'per-run-seed',
    absoluteRunIndex: 7,
    horizonYears: 3,
    startYearIndex: 12,
    breakOnRuin: true,
    initialMarketDataHist: {
        endeVJ: 100,
        endeVJ_1: 95,
        endeVJ_2: 90,
        endeVJ_3: 85,
        ath: 110,
        jahreSeitAth: 2,
        inflation: 2,
        capeRatio: 20
    },
    years: [
        financialYear(0, 1980),
        {
            yearIndex: 1,
            recordType: 'terminal_ruin',
            financiallyEvaluable: false,
            historicalYear: 1981,
            equityReturnPct: -30,
            goldReturnPct: 2,
            cashReturnPct: 1,
            inflationPct: 4,
            wageGrowthPct: 2,
            capeRatio: 18,
            regime: 'BEAR',
            stressEvents: [{ type: 'stress_override', preset: 'LOST_DECADE' }],
            tailRiskEvents: [{ tailRiskActive: true, tailRiskEventId: 1 }],
            householdEvents: household(),
            continuation: false
        },
        financialYear(2, 1990, { continuation: true })
    ],
    sourcePrefixLength: 2,
    terminalStatus: 'ruin',
    continuation: {
        schemaVersion: STRESS_REPLAY_POST_RUIN_POLICY_VERSION,
        active: true,
        domain: STRESS_REPLAY_SHADOW_DOMAIN,
        shadowSeed: 42,
        startsAtYearIndex: 2,
        careInflationPolicy: 'captured-effective-year-data-v1'
    }
};

const sourceLogRows = [
    { recordType: 'financial_year', jahr: 1, histJahr: 1980, inflation: 3, Person1Alive: 1, Person2Alive: null },
    { recordType: 'terminal_ruin', jahr: 2, histJahr: 1981, inflation: 4, Person1Alive: 1, Person2Alive: null }
];

console.log('Test 1: capture request normalizes unique absolute indices');
const request = createStressReplayCaptureRequest([7, 2, 7]);
assertEqual(JSON.stringify(request.runIndices), JSON.stringify([2, 7]), 'Capture indices must be unique and sorted');
assert(Object.isFrozen(request), 'Capture request must be immutable');

console.log('Test 2: shadow seed is position-independent and domain-separated');
const firstSeed = deriveStressReplayShadowSeed({ seed: 1234, absoluteRunIndex: 7 });
const repeatedSeed = deriveStressReplayShadowSeed({ seed: 1234, absoluteRunIndex: 7 });
const otherRunSeed = deriveStressReplayShadowSeed({ seed: 1234, absoluteRunIndex: 8 });
const otherDomainSeed = deriveStressReplayShadowSeed({ seed: 1234, absoluteRunIndex: 7, domain: 'another-domain' });
assertEqual(firstSeed, repeatedSeed, 'Same public identity must derive the same shadow seed');
assert(firstSeed !== otherRunSeed, 'Absolute run index must affect the shadow seed');
assert(firstSeed !== otherDomainSeed, 'Shadow domain must affect the shadow seed');

console.log('Test 3: materialization preserves start state, continuation, source identity and reconciliation');
const path = materializeStressReplayPathV1({
    capture,
    sourceLogRows,
    sourceRequest: { parameters: { seed: 1234 }, scenario: { id: 'fixture' } },
    dataFingerprint: fingerprint({ data: 'v1' }),
    engineFingerprint: fingerprint({ engine: 'v1' }),
    scenarioKey: 'worst',
    selectionMetric: 'nominal_terminal_wealth_eur'
});
assertEqual(path.source.absoluteRunIndex, 7, 'Absolute source index must remain zero-based');
assertEqual(path.source.displayRunNumber, 8, 'Display source number must remain one-based');
assertEqual(path.initialMarketDataHist[0].endeVJ_3, 85, 'Complete pre-year market history must survive');
assertEqual(path.years.length, 3, 'Post-ruin shadow continuation must prevent ruin truncation');
assertEqual(path.years[2].continuation, true, 'Continuation years must be explicit');
assertEqual(path.years[1].equityReturnPct, -30, 'Observed ruin-year return must survive without becoming a source-log oracle');
assertEqual(path.reconciliation.sourcePrefixLength, 2, 'Only the exported source prefix must reconcile');
assertEqual(path.continuation.domain, STRESS_REPLAY_SHADOW_DOMAIN, 'Continuation domain must be fingerprinted');

console.log('Test 4: record-type-specific source mismatch fails closed');
try {
    materializeStressReplayPathV1({
        capture,
        sourceLogRows: [{ ...sourceLogRows[0], histJahr: 1979 }, sourceLogRows[1]],
        sourceRequest: { parameters: { seed: 1234 } },
        dataFingerprint: fingerprint({ data: 'v1' }),
        engineFingerprint: fingerprint({ engine: 'v1' }),
        scenarioKey: 'worst',
        selectionMetric: 'nominal_terminal_wealth_eur'
    });
    assert(false, 'Mismatched source year must be rejected');
} catch (error) {
    assertEqual(error.code, 'STRESS_REPLAY_RECONCILIATION_FAILED', 'Mismatch must expose reconciliation error code');
}

console.log('Test 5: legacy-stream sources are rejected before persistence');
try {
    materializeStressReplayPathV1({
        capture: { ...capture, rngMode: 'legacy-stream' },
        sourceLogRows,
        sourceRequest: {},
        dataFingerprint: fingerprint({ data: 'v1' }),
        engineFingerprint: fingerprint({ engine: 'v1' }),
        scenarioKey: 'worst',
        selectionMetric: 'nominal_terminal_wealth_eur'
    });
    assert(false, 'Legacy stream capture must be rejected');
} catch (error) {
    assertEqual(error.code, 'STRESS_REPLAY_SOURCE_UNSUPPORTED', 'Legacy stream must expose unsupported-source code');
}

console.log('Test 6: scenario selection ties resolve to the smallest absolute run index');
const analyzer = new ScenarioAnalyzer(3);
for (const index of [2, 0, 1]) {
    analyzer.addRun({
        index,
        endVermoegen: 100,
        failed: false,
        lebensdauer: 10,
        careEverActive: false,
        totalCareYears: 0,
        totalCareAdditionalNeedRealEur: 0,
        maxKuerzung: 0,
        logDataRows: []
    });
}
const logs = analyzer.buildScenarioLogs();
const worst = logs.characteristic.find(entry => entry.key === 'worst');
assertEqual(worst.sourceIdentity.absoluteRunIndex, 0, 'Wealth tie must select smallest absolute run index');
assertEqual(worst.sourceIdentity.tieBreak, 'smallest_absolute_run_index', 'Tie-break must be explicit');
