import { EngineAPI } from '../engine/index.mjs';
import { simulateOneYear } from '../app/simulator/simulator-engine-direct.js';
import {
    advanceSimulatorCumulativeInflationFactor,
    prepareHistoricalDataOnce,
    resolveSimulatorCumulativeInflationFactor
} from '../app/simulator/simulator-engine-helpers.js';
import { runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';

console.log('--- Simulator Real Withdrawal Contract Tests ---');

const baseInputs = {
    startAlter: 65,
    geschlecht: 'm',
    startVermoegen: 1000000,
    depotwertAlt: 900000,
    einstandAlt: 720000,
    depotwertNeu: 0,
    einstandNeu: 0,
    tagesgeld: 100000,
    zielLiquiditaet: 50000,
    startFloorBedarf: 12000,
    startFlexBedarf: 0,
    minimumFlexAnnual: 0,
    flexBudgetAnnual: 0,
    flexBudgetRecharge: 0,
    targetEq: 60,
    rebalBand: 5,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    runwayMinMonths: 24,
    runwayTargetMonths: 36,
    goldAktiv: false,
    goldZielProzent: 0,
    goldFloorProzent: 0,
    goldSteuerfrei: true,
    startSPB: 1000,
    kirchensteuerSatz: 0,
    rentAdjMode: 'fix',
    rentAdjPct: 0,
    renteAktiv: false,
    renteMonatlich: 0,
    renteStartOffsetJahre: 0,
    dynamicFlex: false,
    horizonMethod: 'survival_quantile',
    horizonYears: 30,
    survivalQuantile: 0.85,
    goGoActive: false,
    goGoMultiplier: 1,
    capeRatio: 20,
    marketCapeRatio: 20,
    stressPreset: 'NONE',
    pflegefallLogikAktivieren: false,
    partner: { aktiv: false },
    accumulationPhase: { enabled: false },
    transitionYear: 0,
    risikoprofil: 'sicherheits-dynamisch'
};

function createState({ accumulation = false } = {}) {
    return {
        portfolio: {
            depotTranchesAktien: [{
                marketValue: 900000,
                costBasis: 720000,
                type: 'aktien_alt',
                category: 'equity'
            }],
            depotTranchesGold: [],
            liquiditaet: 100000
        },
        cumulativeInflationFactor: 1,
        baseFloor: 12000,
        baseFlex: 0,
        baseMinimumFlexAnnual: 0,
        baseFlexBudgetAnnual: 0,
        baseFlexBudgetRecharge: 0,
        lastState: { taxState: { lossCarry: 0 } },
        currentAnnualPension: 0,
        currentAnnualPension2: 0,
        marketDataHist: {
            endeVJ: 100,
            endeVJ_1: 100,
            endeVJ_2: 100,
            endeVJ_3: 100,
            ath: 100,
            jahreSeitAth: 0,
            capeRatio: 20
        },
        widowPensionP1: 0,
        widowPensionP2: 0,
        samplerState: {},
        accumulationState: accumulation
            ? { yearsSaved: 0, totalContributed: 0, sparrateThisYear: 0 }
            : null,
        transitionYear: accumulation ? 2 : 0
    };
}

function simulateInflationYear(state, inputs, yearIndex) {
    return simulateOneYear(
        state,
        inputs,
        {
            jahr: 2000 + yearIndex,
            rendite: 0,
            gold_eur_perf: 0,
            zinssatz: 0,
            inflation: 10,
            cape: 20
        },
        yearIndex,
        null,
        0,
        null,
        1,
        EngineAPI
    );
}

assertEqual(resolveSimulatorCumulativeInflationFactor({}), 1, 'Missing factor should start at one');
assertClose(
    resolveSimulatorCumulativeInflationFactor({ lastState: { cumulativeInflationFactor: 1.25 } }),
    1.25,
    1e-12,
    'Legacy nested factor should remain a supported fallback'
);
assertClose(
    resolveSimulatorCumulativeInflationFactor({
        cumulativeInflationFactor: 1.2,
        lastState: { cumulativeInflationFactor: 9 }
    }),
    1.2,
    1e-12,
    'Top-level simulator factor should own the contract'
);
assertClose(
    advanceSimulatorCumulativeInflationFactor(1.2, -2),
    1.176,
    1e-12,
    'Deflation should use the same multiplicative contract'
);

let state = createState();
const expectedFactors = [1, 1.1, 1.21];
const expectedNextFactors = [1.1, 1.21, 1.331];

for (let yearIndex = 0; yearIndex < 3; yearIndex++) {
    const result = simulateInflationYear(state, baseInputs, yearIndex);
    const expectedFactor = expectedFactors[yearIndex];
    const expectedNextFactor = expectedNextFactors[yearIndex];

    assert(!result.isRuin, `Synthetic year ${yearIndex + 1} should not ruin`);
    assertClose(
        result.logData.inflation_factor_cum,
        expectedFactor,
        1e-12,
        `Synthetic year ${yearIndex + 1} should expose the current factor`
    );
    assertClose(
        result.logData.jahresentnahme_real,
        result.logData.entnahme_effektiv / expectedFactor,
        1e-9,
        `Synthetic year ${yearIndex + 1} should deflate the effective withdrawal`
    );
    assertClose(
        result.logData.jahresentnahme_real,
        12000,
        1e-9,
        `Synthetic year ${yearIndex + 1} should preserve base-year purchasing power`
    );
    assertClose(
        result.newState.cumulativeInflationFactor,
        expectedNextFactor,
        1e-12,
        `Synthetic year ${yearIndex + 1} should advance the app factor once`
    );
    assertClose(
        result.newState.lastState.cumulativeInflationFactor,
        expectedNextFactor,
        1e-12,
        `Synthetic year ${yearIndex + 1} should mirror the next factor to Engine state`
    );
    assertClose(
        result.ui.spending.details.cumulativeInflationFactor,
        expectedFactor,
        1e-12,
        `Synthetic year ${yearIndex + 1} should give Engine the current factor`
    );
    assertClose(
        result.logData.portfolio_flow_delta,
        0,
        1e-9,
        `Synthetic year ${yearIndex + 1} should not introduce FlowDelta`
    );

    state = result.newState;
}

const accumulationInputs = {
    ...baseInputs,
    accumulationPhase: {
        enabled: true,
        durationYears: 2,
        sparrate: 0,
        sparrateIndexing: 'none'
    },
    transitionYear: 2
};
let accumulationState = createState({ accumulation: true });
const accumulationYear1 = simulateInflationYear(accumulationState, accumulationInputs, 0);
assertEqual(accumulationYear1.logData.jahresentnahme_real, 0, 'Accumulation year should not withdraw');
assertClose(accumulationYear1.logData.inflation_factor_cum, 1, 1e-12, 'First accumulation year should use base factor');
assertClose(accumulationYear1.newState.cumulativeInflationFactor, 1.1, 1e-12, 'First accumulation year should advance factor');

const accumulationYear2 = simulateInflationYear(accumulationYear1.newState, accumulationInputs, 1);
assertEqual(accumulationYear2.logData.jahresentnahme_real, 0, 'Second accumulation year should not withdraw');
assertClose(accumulationYear2.logData.inflation_factor_cum, 1.1, 1e-12, 'Second accumulation year should use carried factor');
assertClose(accumulationYear2.newState.cumulativeInflationFactor, 1.21, 1e-12, 'Second accumulation year should advance factor');

const transitionResult = simulateInflationYear(accumulationYear2.newState, accumulationInputs, 2);
assert(!transitionResult.isRuin, 'First withdrawal year after accumulation should not ruin');
assertClose(transitionResult.logData.inflation_factor_cum, 1.21, 1e-12, 'Transition withdrawal should use full accumulation factor');
assertClose(
    transitionResult.logData.jahresentnahme_real,
    transitionResult.logData.entnahme_effektiv / 1.21,
    1e-9,
    'Transition withdrawal should use simulation-start purchasing power'
);
assertClose(
    transitionResult.ui.spending.details.cumulativeInflationFactor,
    1.21,
    1e-12,
    'First Engine year after accumulation should align to the app factor'
);
assertClose(
    transitionResult.newState.cumulativeInflationFactor,
    1.331,
    1e-12,
    'Transition year should advance factor once for the following year'
);
assertClose(
    transitionResult.newState.lastState.cumulativeInflationFactor,
    1.331,
    1e-12,
    'Transition state should keep app and Engine factor mirrors aligned'
);
assertClose(
    transitionResult.newState.lastState.lastEntnahmeReal,
    transitionResult.logData.jahresentnahme_real,
    1e-9,
    'Engine real-withdrawal state should match the simulator log after transition'
);
assertClose(transitionResult.logData.portfolio_flow_delta, 0, 1e-9, 'Transition should not introduce FlowDelta');

prepareHistoricalDataOnce();
const mcChunk = await runMonteCarloChunk({
    inputs: { ...baseInputs, startAlter: 40 },
    widowOptions: {
        mode: 'stop',
        percent: 0,
        marriageOffsetYears: 0,
        minMarriageYears: 0
    },
    monteCarloParams: {
        anzahl: 1,
        maxDauer: 3,
        blockSize: 3,
        seed: 24680,
        methode: 'block',
        rngMode: 'per-run-seed'
    },
    useCapeSampling: false,
    runRange: { start: 0, count: 1 },
    logIndices: [0],
    engine: EngineAPI
});
const mcRows = mcChunk.runMeta?.[0]?.logDataRows || [];
assertEqual(mcRows.length, 3, 'Seeded MC contract fixture should produce three logged years');

let expectedMcFactor = 1;
for (let rowIndex = 0; rowIndex < mcRows.length; rowIndex++) {
    const row = mcRows[rowIndex];
    assertClose(
        row.inflation_factor_cum,
        expectedMcFactor,
        1e-12,
        `MC year ${rowIndex + 1} should carry the same cumulative factor contract`
    );
    assertClose(
        row.jahresentnahme_real,
        row.entnahme_effektiv / expectedMcFactor,
        1e-9,
        `MC year ${rowIndex + 1} should expose a real effective withdrawal`
    );
    assertClose(
        mcChunk.allRealWithdrawalsSample[rowIndex],
        row.jahresentnahme_real,
        1e-9,
        `MC real-withdrawal sample ${rowIndex + 1} should match the logged contract`
    );
    expectedMcFactor *= 1 + (row.inflation / 100);
}

console.log('--- Simulator Real Withdrawal Contract Tests Completed ---');
