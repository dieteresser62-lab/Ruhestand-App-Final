import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    STRESS_REPLAY_SCOPE,
    STRESS_REPLAY_UNITS_V1,
    createStressReplayFingerprint
} from '../app/simulator/stress-replay-contract.js';
import {
    StressReplayRunnerError,
    runStressReplayPathV1
} from '../app/simulator/stress-replay-runner.js';
import { createStressReplayVariantV1 } from '../app/simulator/stress-replay-variant.js';
import {
    STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT,
    STRESS_REPLAY_TRANSACTION_CLASSES
} from '../app/simulator/stress-replay-transactions.js';
import { simulateOneYear } from '../app/simulator/simulator-engine-wrapper.js';
import { EngineAPI } from '../engine/index.mjs';
import { settleTaxYear } from '../engine/tax-settlement.mjs';

function assertJsonEqual(actual, expected, message) {
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

function projectScenarioLogCore(scenarioLog) {
    const projected = structuredClone(scenarioLog);
    for (const record of projected.records) {
        delete record.stressReplayTransactionDiagnostics;
        if (Array.isArray(record.balance_trace)) {
            record.balance_trace = record.balance_trace.filter(
                entry => entry.phase !== 'after_payout_fallback'
            );
        }
    }
    return projected;
}

function projectReplayCaptureCore(result) {
    const projected = structuredClone(result);
    delete projected.resultFingerprint;
    projected.transactions = [];
    projected.scenarioLog = projectScenarioLogCore(projected.scenarioLog);
    return projected;
}

function household(overrides = {}) {
    return [{
        type: 'household_state',
        p1Alive: 1,
        p2Alive: null,
        p1CareActive: false,
        p2CareActive: false,
        careMetaP1: null,
        careMetaP2: null,
        effectiveFlexFactor: 1,
        totalCareFloorEur: 0,
        widowBenefitActiveForP1: false,
        widowBenefitActiveForP2: false,
        effectiveTransitionYear: 0,
        ...overrides
    }];
}

function year(yearIndex, overrides = {}) {
    return {
        yearIndex,
        recordType: 'financial_year',
        financiallyEvaluable: true,
        historicalYear: 2000 + yearIndex,
        equityReturnPct: 5,
        goldReturnPct: 2,
        cashReturnPct: 1,
        inflationPct: 2,
        wageGrowthPct: 2,
        capeRatio: 20,
        regime: 'NORMAL',
        stressEvents: [],
        tailRiskEvents: [],
        householdEvents: household(),
        continuation: false,
        ...overrides
    };
}

function pathFor(years, terminalStatus = 'horizon_exhausted') {
    return {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.path,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        scope: STRESS_REPLAY_SCOPE,
        source: {
            requestFingerprint: createStressReplayFingerprint({ request: 1 }),
            seed: 123,
            rngMode: 'per-run-seed',
            absoluteRunIndex: 4,
            displayRunNumber: 5,
            scenarioKey: 'fixture',
            selectionMetric: 'nominal_terminal_wealth_eur',
            tieBreak: 'smallest_absolute_run_index',
            startYearIndex: 12
        },
        breakOnRuin: true,
        dataFingerprint: createStressReplayFingerprint({ data: 1 }),
        engineFingerprint: createStressReplayFingerprint({ engine: 1 }),
        units: { ...STRESS_REPLAY_UNITS_V1 },
        horizonYears: Math.max(1, years.length),
        effectiveLength: years.length,
        terminalStatus,
        initialMarketDataHist: [{
            endeVJ: 100,
            endeVJ_1: 95,
            endeVJ_2: 90,
            endeVJ_3: 85,
            ath: 110,
            jahreSeitAth: 2,
            inflation: 2,
            capeRatio: 20
        }],
        years,
        continuation: { active: false },
        reconciliation: {
            sourcePrefixMatched: true,
            sourcePrefixLength: years.length,
            tolerances: { monetaryEur: 0.01, ratio: 1e-9 }
        }
    };
}

const inputs = {
    startAlter: 65,
    geschlecht: 'm',
    partner: { aktiv: false },
    startFloorBedarf: 10000,
    startFlexBedarf: 2000,
    minimumFlexAnnual: 1000,
    liquidityRunwayYears: 5,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    decumulation: { mode: 'standard' },
    renteMonatlich: 0,
    horizonYears: 30,
    horizonMethod: 'direct',
    dynamicFlex: false,
    survivalQuantile: 0.85,
    goGoActive: false,
    goGoMultiplier: 1,
    longevityMode: 'none',
    rentAdjMode: 'fix',
    rentAdjPct: 0
};

function initialState() {
    return {
        portfolio: {
            depotTranchesAktien: [{ marketValue: 100, costBasis: 80 }],
            depotTranchesGold: [],
            liquiditaet: 20
        },
        cumulativeInflationFactor: 1,
        marketDataHist: { shouldBeReplaced: true }
    };
}

function successResult(state, _adjustedInputs, yearData, yearIndex) {
    const nextValue = state.portfolio.depotTranchesAktien[0].marketValue * (1 + yearData.rendite);
    const nextState = {
        ...state,
        cumulativeInflationFactor: state.cumulativeInflationFactor * (1 + yearData.inflation / 100),
        portfolio: {
            ...state.portfolio,
            depotTranchesAktien: [{ marketValue: nextValue, costBasis: 80 }]
        }
    };
    return {
        kind: 'success',
        isRuin: false,
        newState: nextState,
        totalTaxesThisYear: 1,
        logData: {
            wertAktien: nextValue,
            wertGold: 0,
            liquiditaet: 20,
            entscheidung: { jahresEntnahme: 5, kuerzungProzent: 0 },
            floor_brutto: 5,
            rente1: 0,
            rente2: 0,
            renteSum: 0,
            FlexRatePct: 100,
            flex_erfuellt_nominal: 0,
            QuoteEndPct: 4,
            RealReturnEquityPct: yearData.rendite,
            RealReturnGoldPct: 0,
            jahresentnahme_real: 5,
            entnahmequote: 0.04,
            Regime: yearIndex < 0 ? 'unused' : 'decumulation'
        },
        ui: { vpw: null }
    };
}

function sourceFinancialRows(count) {
    let value = 100;
    return Array.from({ length: count }, (_, index) => {
        value *= 1.05;
        return {
            recordType: 'financial_year',
            financiallyEvaluable: true,
            jahr: index + 1,
            histJahr: 2000 + index,
            inflation: 2,
            wertAktien: value,
            wertGold: 0,
            liquiditaet: 20,
            entscheidung: { jahresEntnahme: 5 },
            floor_brutto: 5,
            rente1: 0,
            rente2: 0,
            renteSum: 0,
            FlexRatePct: 100,
            flex_erfuellt_nominal: 0,
            QuoteEndPct: 4,
            RealReturnEquityPct: 0.05,
            RealReturnGoldPct: 0,
            jahresentnahme_real: 5
        };
    });
}

const dependencies = { initMcRunState: initialState, simulateOneYear: successResult };

console.log('Test 1: baseline reconciliation is deterministic, immutable and RNG-free');
const baselinePath = pathFor([year(0), year(1)]);
const sourceRows = sourceFinancialRows(2);
const inputBefore = JSON.stringify(inputs);
const originalRandom = Math.random;
Math.random = () => { throw new Error('RNG must not be consumed by replay'); };
let first;
let second;
try {
    first = runStressReplayPathV1({ path: baselinePath, baselineInputs: inputs, sourceScenarioLog: sourceRows, dependencies });
    second = runStressReplayPathV1({ path: baselinePath, baselineInputs: inputs, sourceScenarioLog: sourceRows, dependencies });
} finally {
    Math.random = originalRandom;
}
assertEqual(first.resultFingerprint.value, second.resultFingerprint.value, 'Repeated replay must be byte-deterministic');
assertEqual(first.terminalStatus, 'horizon_exhausted', 'Complete path must exhaust the horizon');
assertEqual(first.reconciliation.matched, true, 'Baseline must reconcile against source rows');
assertEqual(first.summary.financiallyEvaluatedYears, 2, 'Both years must be financially evaluated');
assertEqual(JSON.stringify(inputs), inputBefore, 'Baseline inputs must remain immutable');
assertEqual(first.scenarioLog.schemaVersion, 'ScenarioLogExportV2', 'Runner must expose the existing scenario export contract');

console.log('Test 2: accumulation and materialized care/partner/widow state reach the year engine');
const observed = [];
const householdPath = pathFor([year(0, {
    householdEvents: household({
        p2Alive: 1,
        p1CareActive: true,
        careMetaP1: { active: true, grade: 3, zusatzFloorZiel: 7000 },
        careMetaP2: { active: false },
        totalCareFloorEur: 7000,
        effectiveFlexFactor: 0.75,
        widowBenefitActiveForP1: true,
        effectiveTransitionYear: 2
    })
})]);
const partnerInputs = {
    ...inputs,
    partner: { aktiv: true, startAlter: 63, geschlecht: 'w' },
    accumulationPhase: { enabled: true },
    transitionYear: 3,
    widowOptions: { mode: 'percent', percent: 60 }
};
runStressReplayPathV1({
    path: householdPath,
    baselineInputs: partnerInputs,
    sourceScenarioLog: sourceFinancialRows(1),
    dependencies: {
        initMcRunState: initialState,
        simulateOneYear(state, adjusted, data, index, careMeta, careFloor, context, flexFactor) {
            observed.push({ adjusted, careMeta, careFloor, context, flexFactor, marketDataHist: state.marketDataHist });
            return successResult(state, adjusted, data, index);
        }
    }
});
assertEqual(observed[0].careFloor, 7000, 'Materialized care floor must reach the engine');
assertEqual(observed[0].flexFactor, 0.75, 'Materialized care flex factor must reach the engine');
assertEqual(observed[0].context.widowBenefits.p1FromP2, true, 'Materialized widow state must reach the engine');
assertEqual(observed[0].adjusted.transitionYear, 2, 'Materialized accumulation transition must reach the engine');
assertEqual(observed[0].marketDataHist.endeVJ_3, 85, 'Materialized market start state must replace reconstructed history');
assertEqual(observed[0].adjusted[STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT], true, 'Replay transaction capture must remain enabled by default');

console.log('Test 2b: V2 floor, flex and minimum-flex values reach runner dependencies unchanged');
const needsBaselineInputs = { ...inputs, horizonMethod: 'mean' };
const needsVariant = createStressReplayVariantV1({
    id: 'needs-through-runner',
    label: 'Needs through runner',
    baselineInputs: needsBaselineInputs,
    patch: {
        strategy: {
            startFloorBedarf: 0,
            startFlexBedarf: 750,
            minimumFlexAnnual: 500
        }
    }
});
let observedNeeds = null;
const needsPathBefore = JSON.stringify(householdPath);
const needsInputsBefore = JSON.stringify(needsBaselineInputs);
runStressReplayPathV1({
    path: householdPath,
    baselineInputs: needsBaselineInputs,
    variant: needsVariant,
    dependencies: {
        initMcRunState(adjustedInputs) {
            observedNeeds = {
                startFloorBedarf: adjustedInputs.startFloorBedarf,
                startFlexBedarf: adjustedInputs.startFlexBedarf,
                minimumFlexAnnual: adjustedInputs.minimumFlexAnnual
            };
            return initialState();
        },
        simulateOneYear: successResult
    }
});
assertJsonEqual(
    observedNeeds,
    { startFloorBedarf: 0, startFlexBedarf: 750, minimumFlexAnnual: 500 },
    'Runner initialization must receive all V2 need patch values including zero'
);
assertEqual(JSON.stringify(householdPath), needsPathBefore, 'V2 runner must not mutate the materialized path');
assertEqual(JSON.stringify(needsBaselineInputs), needsInputsBefore, 'V2 runner must not mutate baseline inputs');

console.log('Test 3: ruin, death and technical errors remain distinct');
const ruinYear = year(0, { recordType: 'terminal_ruin', financiallyEvaluable: false });
const ruinResult = runStressReplayPathV1({
    path: pathFor([ruinYear], 'ruin'),
    baselineInputs: inputs,
    sourceScenarioLog: [{ recordType: 'terminal_ruin', jahr: 1, histJahr: 2000 }],
    dependencies: {
        initMcRunState: initialState,
        simulateOneYear: () => ({ kind: 'ruin', isRuin: true })
    }
});
assertEqual(ruinResult.terminalStatus, 'ruin', 'Ruin must remain a financial terminal status');
assertEqual(ruinResult.technicalError, null, 'Ruin must not be reported as a technical error');

const deathRecord = year(1, {
    recordType: 'terminal_death',
    financiallyEvaluable: false,
    householdEvents: household({ p1Alive: 0 })
});
const deathResult = runStressReplayPathV1({
    path: pathFor([year(0), deathRecord], 'all_dead'),
    baselineInputs: inputs,
    sourceScenarioLog: [...sourceFinancialRows(1), { recordType: 'terminal_death', jahr: 2, histJahr: 2001 }],
    dependencies
});
assertEqual(deathResult.terminalStatus, 'all_dead', 'Death must remain distinct from ruin');
assertEqual(deathResult.yearResults.length, 2, 'The processed death year must remain in yearly results');
assertEqual(deathResult.yearResults[1].status, 'terminal_death', 'Death needs an unambiguous yearly status');
assertEqual(deathResult.yearResults[1].historicalYear, 2001, 'Death retains its historical year');
assertEqual(deathResult.yearResults[1].nominalValueEur, deathResult.yearResults[0].nominalValueEur, 'Death must not change the nominal portfolio');
assertEqual(deathResult.yearResults[1].realValueEur, deathResult.yearResults[0].realValueEur, 'Death must not change the real portfolio');
assertEqual(deathResult.yearResults[1].withdrawalEur, null, 'Death must not invent a withdrawal');
assertEqual(deathResult.yearResults[1].taxEur, null, 'Death must not invent tax');
assertEqual(deathResult.yearResults[1].financiallyEvaluable, false, 'Death must remain financially unevaluable');
assertEqual(deathResult.summary.financiallyEvaluatedYears, 1, 'Death must not count as a financial year');
assertEqual(deathResult.summary.ruinYear, null, 'Death must not be reported as ruin');
assertEqual(deathResult.yearResults[1].missingness.length, 2, 'Death financial missingness must be explicit');

const technical = runStressReplayPathV1({
    path: pathFor([year(0)]),
    baselineInputs: inputs,
    sourceScenarioLog: sourceFinancialRows(1),
    dependencies: {
        initMcRunState: initialState,
        simulateOneYear: () => ({ kind: 'technical_error', error: { code: 'FIXTURE_FAILURE', message: 'fixture' } })
    }
});
assertEqual(technical.terminalStatus, 'technical_error', 'Technical failure must not be converted into ruin');
assertEqual(technical.summary, null, 'Technical failure must not expose a zero-valued financial summary');
assertEqual(technical.technicalError.code, 'FIXTURE_FAILURE', 'Technical error code must survive');

console.log('Test 4: cent-level source mismatch fails closed');
try {
    runStressReplayPathV1({
        path: baselinePath,
        baselineInputs: inputs,
        sourceScenarioLog: [{ ...sourceRows[0], wertAktien: sourceRows[0].wertAktien + 0.02 }, sourceRows[1]],
        dependencies
    });
    assert(false, 'Mismatch above the cent tolerance must fail');
} catch (error) {
    assert(error instanceof StressReplayRunnerError, 'Mismatch must use the runner error contract');
    assertEqual(error.code, 'STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED', 'Mismatch must expose a stable code');
}

console.log('Test 5: real crash-sale capture is additive and deterministic at the runner boundary');
const crashInputs = {
    ...inputs,
    startFloorBedarf: 6,
    startFlexBedarf: 0,
    zielLiquiditaet: 0,
    accumulationPhase: { enabled: false },
    goldAktiv: false,
    targetEq: 90,
    startSPB: 1000,
    marketCapeRatio: 20,
    risikoprofil: 'sicherheits-dynamisch',
    kirchensteuerSatz: 0,
    rebalBand: 20,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5
};
const crashState = {
    portfolio: {
        depotTranchesAktien: [
            {
                marketValue: 9.6666666667,
                costBasis: 9.6666666667,
                type: 'aktien_alt',
                purchaseDate: '2020-01-01'
            },
            {
                marketValue: 166.6666666667,
                costBasis: 166.6666666667,
                type: 'aktien_alt',
                purchaseDate: '2000-01-01'
            }
        ],
        depotTranchesGold: [],
        liquiditaet: 0
    },
    baseFloor: 6,
    baseFlex: 0,
    lastState: { taxState: { lossCarry: 0 } },
    currentAnnualPension: 0,
    marketDataHist: {
        endeVJ: 100,
        endeVJ_1: 90,
        endeVJ_2: 80,
        ath: 100,
        jahreSeitAth: 0,
        capeRatio: 20
    },
    widowPensionP1: 0,
    widowPensionP2: 0,
    cumulativeInflationFactor: 1
};
const crashTaxSettlement = settleTaxYear({
    taxStatePrev: crashState.lastState.taxState,
    rawAggregate: {
        sumRealizedGainSigned: 0,
        sumTaxableAfterTqfSigned: 0
    },
    sparerPauschbetrag: crashInputs.startSPB,
    kirchensteuerSatz: crashInputs.kirchensteuerSatz
});
const crashEngine = {
    ...EngineAPI,
    simulateSingleYear: () => ({
        ui: {
            spending: {
                monatlicheEntnahme: 0.5,
                kuerzungQuelle: 'none',
                details: { flexRate: 1 }
            },
            action: {
                type: 'NONE',
                title: 'No planned transaction',
                anweisungKlasse: '',
                quellen: [],
                verwendungen: {},
                nettoErlös: 0,
                steuer: 0,
                pauschbetragVerbraucht: 0,
                taxRawAggregate: {
                    sumRealizedGainSigned: 0,
                    sumTaxableAfterTqfSigned: 0
                },
                taxSettlement: crashTaxSettlement.details,
                transactionDiagnostics: { blockReason: 'none' }
            },
            market: { szenarioText: 'runner-crash-sale-parity-witness' },
            runway: { months: 0 },
            liquiditaet: { deckungNachher: 0 },
            vpw: null,
            zielLiquiditaet: 0
        },
        newState: {
            alarmActive: false,
            lastMarketSKey: 'BEAR',
            cumulativeInflationFactor: 1,
            taxState: crashTaxSettlement.taxStateNext
        }
    })
};
const crashPath = pathFor([year(0, {
    historicalYear: 2001,
    equityReturnPct: -40,
    goldReturnPct: 0,
    cashReturnPct: 0,
    inflationPct: 0,
    wageGrowthPct: 0,
    regime: 'BEAR',
    stressEvents: [{ type: 'market_crash', equityReturnPct: -40 }]
})]);
const crashSourceRows = [{ recordType: 'financial_year', jahr: 1, histJahr: 2001 }];
const crashPathBefore = JSON.stringify(crashPath);
const crashInputsBefore = JSON.stringify(crashInputs);

function runCrashReplay(captureTransactions) {
    const rawYearResults = [];
    const replayResult = runStressReplayPathV1({
        path: crashPath,
        baselineInputs: crashInputs,
        sourceScenarioLog: crashSourceRows,
        engine: crashEngine,
        captureTransactions,
        dependencies: {
            initMcRunState: () => structuredClone(crashState),
            simulateOneYear(...args) {
                const result = simulateOneYear(...args);
                rawYearResults.push(structuredClone(result));
                return result;
            }
        }
    });
    return { replayResult, rawYearResults };
}

const crashWithoutCapture = runCrashReplay(false);
const crashWithCapture = runCrashReplay(true);
const crashWithCaptureRepeated = runCrashReplay(true);
assertEqual(crashWithCapture.replayResult.terminalStatus, 'horizon_exhausted', 'Crash-sale witness must complete financially');
assertEqual(crashWithCapture.replayResult.reconciliation.matched, true, 'Capture-on crash replay must reconcile');
assertEqual(crashWithoutCapture.replayResult.reconciliation.matched, true, 'Capture-off crash replay must reconcile');
assertEqual(crashWithCapture.replayResult.transactions.length, 2, 'Crash-sale witness must expose both executed sale diagnostics');
assertJsonEqual(
    crashWithCapture.replayResult.transactions.map(transaction => transaction.class),
    [
        STRESS_REPLAY_TRANSACTION_CLASSES.LIQUIDITY_SHORTFALL_FORCED_SALE,
        STRESS_REPLAY_TRANSACTION_CLASSES.PAYOUT_FLOOR_FALLBACK_SALE
    ],
    'Runner must preserve the exact forced-sale then payout-fallback transaction order'
);
assertEqual(crashWithoutCapture.replayResult.transactions.length, 0, 'Capture-off replay must not project transaction diagnostics');
assertJsonEqual(crashWithCapture.replayResult.summary, crashWithoutCapture.replayResult.summary, 'Capture must not change summary finances');
assertJsonEqual(crashWithCapture.replayResult.yearResults, crashWithoutCapture.replayResult.yearResults, 'Capture must not change yearly finances');
assertJsonEqual(
    projectScenarioLogCore(crashWithCapture.replayResult.scenarioLog),
    projectScenarioLogCore(crashWithoutCapture.replayResult.scenarioLog),
    'Removing only allowed additions must restore byte-identical scenario log core rows'
);
assertJsonEqual(crashWithCapture.replayResult.reconciliation, crashWithoutCapture.replayResult.reconciliation, 'Capture must not change reconciliation');
assertJsonEqual(crashWithCapture.replayResult.pathFingerprint, crashWithoutCapture.replayResult.pathFingerprint, 'Capture must not change path identity');
assertJsonEqual(crashWithCapture.replayResult.baselineScenarioFingerprint, crashWithoutCapture.replayResult.baselineScenarioFingerprint, 'Capture must not change baseline identity');
assertJsonEqual(crashWithCapture.replayResult.variantFingerprint, crashWithoutCapture.replayResult.variantFingerprint, 'Capture must not change variant identity');
assertEqual(
    crashWithCapture.replayResult.resultFingerprint.value,
    crashWithCaptureRepeated.replayResult.resultFingerprint.value,
    'Repeated capture-on replay must retain its exact result fingerprint'
);
assertJsonEqual(
    projectReplayCaptureCore(crashWithCapture.replayResult),
    projectReplayCaptureCore(crashWithoutCapture.replayResult),
    'Removing only transactions, diagnostic log fields and the fallback trace must restore the exact runner result'
);
assertJsonEqual(crashWithCapture.replayResult, crashWithCaptureRepeated.replayResult, 'Repeated capture-on replay must be byte-deterministic');
assertEqual(JSON.stringify(crashPath), crashPathBefore, 'Runner capture must not mutate the materialized crash path');
assertEqual(JSON.stringify(crashInputs), crashInputsBefore, 'Runner capture must not mutate baseline inputs');

const rawWithoutCapture = crashWithoutCapture.rawYearResults[0];
const rawWithCapture = crashWithCapture.rawYearResults[0];
const diagnostics = rawWithCapture.logData.stressReplayTransactionDiagnostics;
assertEqual(rawWithoutCapture.logData.stressReplayTransactionDiagnostics, undefined, 'Capture-off raw year must retain its prior payload shape');
assertEqual(diagnostics.length, 2, 'Capture-on raw year must add exactly two diagnostics');
const projectedRawWithoutCapture = structuredClone(rawWithoutCapture);
const projectedRawWithCapture = structuredClone(rawWithCapture);
delete projectedRawWithoutCapture.logData.stressReplayTransactionDiagnostics;
delete projectedRawWithCapture.logData.stressReplayTransactionDiagnostics;
const traceWithoutCapture = projectedRawWithoutCapture.logData.balance_trace;
const traceWithCapture = projectedRawWithCapture.logData.balance_trace;
delete projectedRawWithoutCapture.logData.balance_trace;
delete projectedRawWithCapture.logData.balance_trace;
assertJsonEqual(projectedRawWithCapture, projectedRawWithoutCapture, 'Only additive capture fields may differ in the raw year result');
const fallbackTraceIndexes = traceWithCapture
    .map((entry, index) => entry.phase === 'after_payout_fallback' ? index : -1)
    .filter(index => index >= 0);
assertJsonEqual(fallbackTraceIndexes, [5], 'Capture must add the fallback trace once at the exact transaction position');
assertEqual(traceWithCapture.length, traceWithoutCapture.length + 1, 'Capture must add exactly one trace phase');
assertJsonEqual(
    traceWithCapture.filter(entry => entry.phase !== 'after_payout_fallback'),
    traceWithoutCapture,
    'All existing trace phases must retain byte-identical order and content'
);
