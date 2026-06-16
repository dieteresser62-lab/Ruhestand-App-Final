import { EngineAPI } from '../engine/index.mjs';
import { prepareHistoricalDataOnce } from '../app/simulator/simulator-engine-helpers.js';
import { resolveDynamicFlexRunnerHorizon } from '../app/simulator/dynamic-flex-runner-horizon.js';
import { runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';
import { buildSweepInputs } from '../app/simulator/sweep-runner.js';
import { SWEEP_ALLOWED_KEYS } from '../app/simulator/simulator-sweep-utils.js';

console.log('--- Longevity Engine/Runner Integration Tests ---');

prepareHistoricalDataOnce();

const engineBaseInput = {
    depotwertAlt: 600000,
    depotwertNeu: 0,
    goldWert: 0,
    tagesgeld: 80000,
    geldmarktEtf: 0,
    inflation: 2,
    floorBedarf: 24000,
    flexBedarf: 12000,
    startAlter: 65,
    goldAktiv: false,
    goldFloorProzent: 0,
    renteAktiv: false,
    renteMonatlich: 0,
    runwayTargetMonths: 36,
    runwayMinMonths: 24,
    targetEq: 60,
    rebalBand: 5,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    risikoprofil: 'sicherheits-dynamisch',
    endeVJ: 100,
    endeVJ_1: 100,
    endeVJ_2: 100,
    endeVJ_3: 100,
    ath: 100,
    jahreSeitAth: 0,
    marketCapeRatio: 25,
    dynamicFlex: true,
    horizonMethod: 'survival_quantile',
    horizonYears: 30,
    survivalQuantile: 0.85,
    goGoActive: false,
    goGoMultiplier: 1
};

const runnerBaseInputs = {
    startAlter: 65,
    geschlecht: 'm',
    startVermoegen: 900000,
    depotwertAlt: 500000,
    einstandAlt: 420000,
    zielLiquiditaet: 80000,
    startFloorBedarf: 24000,
    startFlexBedarf: 12000,
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
    renteMonatlich: 0,
    renteStartOffsetJahre: 0,
    dynamicFlex: true,
    horizonMethod: 'survival_quantile',
    horizonYears: 30,
    survivalQuantile: 0.85,
    goGoActive: false,
    goGoMultiplier: 1,
    capeRatio: 25,
    marketCapeRatio: 25,
    stressPreset: 'NONE',
    pflegefallLogikAktivieren: false,
    partner: { aktiv: false },
    accumulationPhase: { enabled: false },
    transitionYear: 0
};

// Test 1: Resolver applies quantile_shift before the engine call and exposes diagnostics.
{
    const baseline = resolveDynamicFlexRunnerHorizon(runnerBaseInputs, { yearIndex: 0 });
    const shifted = resolveDynamicFlexRunnerHorizon({
        ...runnerBaseInputs,
        longevityMode: 'quantile_shift',
        longevityQuantileShift: 0.05
    }, { yearIndex: 0 });

    assertEqual(baseline.valid, true, 'baseline resolver should be valid');
    assertEqual(shifted.valid, true, 'shifted resolver should be valid');
    assert(shifted.horizonYears >= baseline.horizonYears, 'quantile shift should not shorten the runner horizon');
    assertEqual(shifted.diagnostics.horizonYearsRaw, baseline.horizonYears, 'raw horizon should match unadjusted resolver');
    assertClose(shifted.diagnostics.longevityAppliedShift, 0.05, 1e-12, 'applied quantile shift should be diagnosed');
}

// Test 2: Engine consumes effective horizon and echoes Longevity diagnostics.
{
    const horizon = resolveDynamicFlexRunnerHorizon({
        ...runnerBaseInputs,
        longevityMode: 'relative_horizon_buffer',
        longevityRelativePct: 0.10
    }, { yearIndex: 0 });
    const result = EngineAPI.simulateSingleYear({
        ...engineBaseInput,
        horizonYears: horizon.horizonYears,
        longevityMode: 'relative_horizon_buffer',
        longevityRelativePct: 0.10,
        longevityHorizonDiagnostics: horizon.diagnostics
    }, null);

    assert(!result.error, `engine should accept longevity diagnostics: ${result.error?.message || ''}`);
    assertEqual(result.ui.vpw.status, 'active', 'VPW should remain active');
    assertEqual(result.ui.vpw.horizonYearsRaw, horizon.diagnostics.horizonYearsRaw, 'engine should expose raw horizon');
    assertEqual(result.ui.vpw.horizonYears, horizon.horizonYears, 'engine should expose effective horizon');
    assertEqual(result.ui.vpw.longevityMode, 'relative_horizon_buffer', 'engine should expose longevity mode');
    assert(result.ui.vpw.longevityAppliedBufferYears > 0, 'engine should expose applied buffer years');
}

// Test 3: Joint-to-single smoothing is gated behind active Longevity modes.
{
    const rawSingle = resolveDynamicFlexRunnerHorizon(runnerBaseInputs, {
        yearIndex: 0,
        applyTransitionSmoothing: false
    });
    const defaultSmoothed = resolveDynamicFlexRunnerHorizon(runnerBaseInputs, {
        yearIndex: 0,
        applyTransitionSmoothing: true,
        previousHorizon: rawSingle.horizonYears + 10,
        yearsSinceTransition: 0
    });
    const activeSmoothed = resolveDynamicFlexRunnerHorizon({
        ...runnerBaseInputs,
        longevityMode: 'buffer_years',
        longevityBufferYears: 0
    }, {
        yearIndex: 0,
        applyTransitionSmoothing: true,
        previousHorizon: rawSingle.horizonYears + 10,
        yearsSinceTransition: 0
    });

    assertEqual(defaultSmoothed.horizonYears, rawSingle.horizonYears, 'default none mode should not smooth baseline horizons');
    assert(activeSmoothed.horizonYears > rawSingle.horizonYears, 'active longevity mode should allow transition smoothing');
    assertEqual(activeSmoothed.diagnostics.longevityTransitionSmoothingApplied, true, 'active smoothing should be diagnosed');
}

// Test 4: Invalid Longevity settings fail engine validation.
{
    const result = EngineAPI.simulateSingleYear({
        ...engineBaseInput,
        longevityMode: 'buffer_years',
        longevityBufferYears: 2.5
    }, null);
    assert(result.error, 'decimal longevityBufferYears should fail validation');
    assertEqual(result.error.name, 'ValidationError', 'invalid longevity settings should produce ValidationError');
}

// Test 5: Monte Carlo logs carry the same effective Longevity VPW payload.
{
    const monteCarloParams = {
        anzahl: 4,
        maxDauer: 4,
        blockSize: 2,
        seed: 5150,
        methode: 'block',
        rngMode: 'per-run-seed'
    };
    const chunk = await runMonteCarloChunk({
        inputs: {
            ...runnerBaseInputs,
            longevityMode: 'quantile_shift',
            longevityQuantileShift: 0.05
        },
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: monteCarloParams.anzahl },
        logIndices: [0],
        engine: EngineAPI
    });
    const firstRow = (chunk.runMeta || []).find(meta => meta.index === 0)?.logDataRows?.find(row => row?.vpw);
    assert(firstRow?.vpw, 'MC log should include VPW payload');
    assertEqual(firstRow.vpw.longevityMode, 'quantile_shift', 'MC VPW payload should expose longevity mode');
    assert(firstRow.vpw.horizonYears >= firstRow.vpw.horizonYearsRaw, 'MC effective horizon should not be below raw horizon');
    assertClose(firstRow.vpw.longevityAppliedShift, 0.05, 1e-12, 'MC payload should expose applied shift');
}

// Test 6: Sweep/Optimizer V1 does not expose Longevity as variable parameters.
{
    assert(!SWEEP_ALLOWED_KEYS.has('longevityMode'), 'longevityMode should not be sweepable in V1');
    assert(!SWEEP_ALLOWED_KEYS.has('longevityBufferYears'), 'longevityBufferYears should not be sweepable in V1');
    const inputs = buildSweepInputs(
        { ...runnerBaseInputs, longevityMode: 'buffer_years', longevityBufferYears: 2 },
        {
            runwayMin: 18,
            runwayTarget: 30,
            targetEq: 60,
            rebalBand: 5,
            maxSkimPct: 10,
            maxBearRefillPct: 5,
            goldTargetPct: 0,
            longevityBufferYears: 8
        }
    );
    assertEqual(inputs.longevityBufferYears, 2, 'buildSweepInputs should not override longevityBufferYears');
}

console.log('--- Longevity Engine/Runner Integration Tests Completed ---');
