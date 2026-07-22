import { EngineAPI } from '../engine/index.mjs';
import {
    attachMonteCarloBatchOutcome,
    runMonteCarloChunk
} from '../app/simulator/monte-carlo-runner.js';
import { createMonteCarloBuffers } from '../app/simulator/monte-carlo-runner-utils.js';
import {
    MAX_SIMULATOR_COUNTER_VALUE,
    assertSimulatorHorizonAgeContract,
    resolveSimulatorMortalityProbability
} from '../app/simulator/mc-life-events.js';
import {
    MONTE_CARLO_MISSINGNESS_CODE,
    MONTE_CARLO_OUTCOME_CODE,
    buildMonteCarloOutcomeInventoryV1,
    resolveMonteCarloTerminalOutcomeV1
} from '../app/simulator/monte-carlo-chunk-result.js';

console.log('--- Monte Carlo Outcome/Horizon Contract Tests ---');

function buildInputs(overrides = {}) {
    return {
        startAlter: 20,
        accumulationPhase: { enabled: false },
        transitionYear: 0,
        startVermoegen: 500000,
        depotwertAlt: 500000,
        einstandAlt: 400000,
        tagesgeld: 20000,
        geldmarktEtf: 0,
        zielLiquiditaet: 20000,
        startFloorBedarf: 24000,
        startFlexBedarf: 6000,
        flexBudgetAnnual: 0,
        flexBudgetRecharge: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        rentAdjPct: 0,
        goldAktiv: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        goldSteuerfrei: false,
        risikoprofil: 'sicherheits-dynamisch',
        rebalancingBand: 20,
        runwayTargetMonths: 36,
        runwayMinMonths: 24,
        targetEq: 60,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        marketCapeRatio: 20,
        capeRatio: 20,
        kirchensteuerSatz: 0,
        startSPB: 1000,
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1,
        pflegefallLogikAktivieren: false,
        geschlecht: 'm',
        partner: { aktiv: false },
        stressPreset: 'NONE',
        ...overrides
    };
}

const widowOptions = { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 };

async function runSingle(inputs, { engine = EngineAPI, seed = 42, monteCarloOverrides = {} } = {}) {
    return runMonteCarloChunk({
        inputs,
        monteCarloParams: {
            anzahl: 1,
            maxDauer: 1,
            blockSize: 1,
            seed,
            methode: 'block',
            rngMode: 'per-run-seed',
            startYearMode: 'UNIFORM',
            ...monteCarloOverrides
        },
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 0, count: 1 },
        engine
    });
}

{
    const ruinAfterStartedYear = resolveMonteCarloTerminalOutcomeV1({
        ruinInStartedFinancialYear: true,
        allDeadTiming: 'after_ruin'
    });
    assertEqual(ruinAfterStartedYear.outcomeCode, MONTE_CARLO_OUTCOME_CODE.RUIN, 'Ruin in a started financial year should outrank a later same-year death flag');

    const allDeadBeforeObligation = resolveMonteCarloTerminalOutcomeV1({
        allDeadTiming: 'before_next_financial_obligation'
    });
    assertEqual(allDeadBeforeObligation.outcomeCode, MONTE_CARLO_OUTCOME_CODE.ALL_DEAD, 'Death before the next obligation should be all_dead');

    const horizon = resolveMonteCarloTerminalOutcomeV1({ horizonExhausted: true });
    assertEqual(horizon.outcomeCode, MONTE_CARLO_OUTCOME_CODE.HORIZON_EXHAUSTED, 'A living path at the last plan year should be horizon_exhausted');

    const conflict = resolveMonteCarloTerminalOutcomeV1({
        ruinInStartedFinancialYear: true,
        allDeadTiming: 'before_next_financial_obligation'
    });
    assertEqual(conflict.outcomeCode, MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR, 'Chronologically contradictory terminal flags should fail closed');
    assertEqual(conflict.errorCode, 'MC_TERMINAL_FLAGS_CONFLICT', 'Terminal conflict should expose a stable diagnostic code');
}

{
    const inventory = buildMonteCarloOutcomeInventoryV1({
        requestedRuns: 4,
        ruin: 1,
        all_dead: 1,
        horizon_exhausted: 1,
        technical_error: 1
    });
    assertEqual(inventory.inventorySum, 4, 'Outcome inventory should classify every requested run exactly once');
    assertEqual(inventory.floorCoveragePct, null, 'Any technical error should suppress floor coverage fail-closed');
    assertEqual(inventory.floorCoverageMissingnessReason, 'technical_error_in_batch', 'Fail-closed coverage should retain its reason');

    const clean = attachMonteCarloBatchOutcome({
        outcomeCounts: { ruin: 1, all_dead: 1, horizon_exhausted: 2 }
    }, {
        requested: 4,
        financiallyEvaluable: 4,
        technicalError: 0,
        errors: []
    });
    assertEqual(clean.outcomeInventory.floorCoveragePct, 75, 'Clean batch should use all_dead plus horizon_exhausted over requested runs');
    assertEqual(clean.outcomeInventory.floorCoverageEstimate.sampleSize, 4, 'Floor estimate should expose requested runs as its sample size');
    assertEqual(clean.outcomeInventory.floorCoverageEstimate.confidenceInterval95.method, 'wilson_score', 'Floor estimate should use the reviewed Wilson interval');
    assert(clean.outcomeInventory.floorCoverageEstimate.confidenceInterval95.lowerPct < 75, 'Wilson lower bound should remain below the point estimate');
    assertEqual(clean.outcomeInventory.floorCoverageEstimate.uncertaintyWarning.code, 'small_sample', 'Small batches should carry an explicit uncertainty warning');

    const technicalTransport = {
        requested: 4,
        financiallyEvaluable: 3,
        technicalError: 1,
        errors: [{ code: 'SYNTHETIC', message: 'Technischer Testfehler.' }]
    };
    attachMonteCarloBatchOutcome({
        outcomeCounts: { ruin: 1, all_dead: 1, horizon_exhausted: 1 }
    }, technicalTransport);
    assert(technicalTransport.errors[0].message.includes('Terminale Outcomes:'), 'Technical UI error path should keep the outcome inventory visible');
    assert(technicalTransport.errors[0].message.includes('Floor-Deckung im gewaehlten Horizont: nicht ausgewiesen'), 'Technical UI error path should use the reviewed fail-closed headline');
}

{
    const buffers = createMonteCarloBuffers(1);
    buffers.kpiLebensdauer[0] = 300;
    buffers.alterBeiErschoepfung[0] = 310;
    buffers.alterBeiErschoepfungMissingness[0] = 1;
    assertEqual(buffers.kpiLebensdauer[0], 300, 'Duration buffer should not wrap at Uint8 boundaries');
    assertEqual(buffers.alterBeiErschoepfung[0], 310, 'Depletion-age buffer should not wrap at Uint8 boundaries');
    assertEqual(buffers.alterBeiErschoepfungMissingness[0], 1, 'Depletion age should use explicit missingness instead of a numeric sentinel');

    const boundary = assertSimulatorHorizonAgeContract(
        buildInputs({ startAlter: 1 }),
        MAX_SIMULATOR_COUNTER_VALUE
    );
    assertEqual(boundary.duration, MAX_SIMULATOR_COUNTER_VALUE, 'Maximum representable duration should pass the buffer contract');
    let overflowRejected = false;
    try {
        assertSimulatorHorizonAgeContract(buildInputs({ startAlter: 2 }), MAX_SIMULATOR_COUNTER_VALUE);
    } catch (error) {
        overflowRejected = error instanceof RangeError;
    }
    assert(overflowRejected, 'Age plus horizon beyond the buffer range should be rejected instead of clamped');
}

{
    assertEqual(resolveSimulatorMortalityProbability('m', 110), 1, 'Mortality age 110 should remain certain death');
    assertEqual(resolveSimulatorMortalityProbability('m', 111), 1, 'Monte Carlo should fail closed beyond the mortality table');
    assertEqual(resolveSimulatorMortalityProbability('w', 17), 1, 'Sweep and Monte Carlo helper should fail closed below the mortality table');
}

{
    const horizonChunk = await runSingle(buildInputs(), { seed: 42 });
    assertEqual(horizonChunk.pathSummaries.outcomeCode[0], MONTE_CARLO_OUTCOME_CODE.HORIZON_EXHAUSTED, 'Living one-year path should end censored at the horizon');

    const deathChunk = await runSingle(buildInputs({ startAlter: 110 }));
    assertEqual(deathChunk.pathSummaries.outcomeCode[0], MONTE_CARLO_OUTCOME_CODE.ALL_DEAD, 'Certain death in the last plan year should be all_dead before the financial obligation');
    assertEqual(deathChunk.pathSummaries.realWithdrawalObservationCount[0], 0, 'Death before the first obligation should have no withdrawal observation');
    assertEqual(deathChunk.pathMissingness.realWithdrawalP10RealEur[0], MONTE_CARLO_MISSINGNESS_CODE.DIED_BEFORE_FIRST_OBLIGATION, 'Death before the first obligation should retain its dedicated missingness reason');

    const ruinChunk = await runSingle(buildInputs({
        startVermoegen: 1,
        depotwertAlt: 1,
        einstandAlt: 1,
        tagesgeld: 0,
        zielLiquiditaet: 0,
        startFloorBedarf: 1000000,
        startFlexBedarf: 0
    }));
    assertEqual(ruinChunk.pathSummaries.outcomeCode[0], MONTE_CARLO_OUTCOME_CODE.RUIN, 'Uncovered floor in a started year should end as ruin');

    const paddedRuinChunk = await runSingle(buildInputs({
        startVermoegen: 1,
        depotwertAlt: 1,
        einstandAlt: 1,
        tagesgeld: 0,
        zielLiquiditaet: 0,
        startFloorBedarf: 1000000,
        startFlexBedarf: 0
    }), {
        monteCarloOverrides: { maxDauer: 5 }
    });
    assertEqual(paddedRuinChunk.pathSummaries.realWithdrawalObservationCount[0], 5, 'Immediate ruin should include the attempted obligation and living post-ruin years');
    assertEqual(paddedRuinChunk.pathSummaries.realWithdrawalP10RealEur[0], 0, 'Immediate ruin should produce an observed per-run withdrawal P10 of zero');

    const stressRuinChunk = await runSingle(buildInputs({
        startVermoegen: 1,
        depotwertAlt: 1,
        einstandAlt: 1,
        tagesgeld: 0,
        zielLiquiditaet: 0,
        startFloorBedarf: 1000000,
        startFlexBedarf: 0,
        stressPreset: 'GREAT_DEPRESSION_29_33'
    }), {
        monteCarloOverrides: { maxDauer: 5 }
    });
    assertEqual(stressRuinChunk.buffers.stress_realWithdrawalObservationCount[0], 5, 'Stress CaR should use the same post-ruin zero fill inside its fixed window');
    assertEqual(stressRuinChunk.buffers.stress_CaR_P10_Real[0], 0, 'Stress CaR should observe zero for immediate ruin');

    const technicalChunk = await runSingle(buildInputs(), {
        engine: { simulateSingleYear: () => ({ error: new Error('synthetic') }) }
    });
    assertEqual(technicalChunk.pathSummaries.outcomeCode[0], MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR, 'Adapter/engine failure should remain technical_error');
}

console.log('--- Monte Carlo Outcome/Horizon Contract Tests Completed ---');
