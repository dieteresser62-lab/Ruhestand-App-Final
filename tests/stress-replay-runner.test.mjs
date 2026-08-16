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
    renteMonatlich: 0,
    horizonYears: 30,
    horizonMethod: 'direct',
    dynamicFlex: false,
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
