import { EngineAPI } from '../engine/index.mjs';
import { getStartYearCandidates } from '../app/shared/cape-utils.js';
import {
    MONTE_CARLO_SAMPLING_CONTRACT_VERSION,
    MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION,
    buildYearSamplingConfig,
    resolveMonteCarloSamplingContractV1
} from '../app/simulator/mc-year-sampling.js';
import {
    createMonteCarloChunkAccumulatorV1,
    finalizeMonteCarloChunkAccumulatorV1,
    mergeMonteCarloChunkResultV1
} from '../app/simulator/monte-carlo-chunk-result.js';
import { runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';
import { annualData } from '../app/simulator/simulator-data.js';
import { prepareHistoricalData } from '../app/simulator/simulator-portfolio.js';

console.log('--- Monte Carlo Sampling Contract Tests ---');

prepareHistoricalData();

const widowOptions = {
    mode: 'stop',
    percent: 0,
    marriageOffsetYears: 0,
    minMarriageYears: 0
};

function buildInputs(overrides = {}) {
    return {
        startAlter: 30,
        geschlecht: 'm',
        startVermoegen: 600000,
        depotwertAlt: 550000,
        einstandAlt: 450000,
        tagesgeld: 50000,
        geldmarktEtf: 0,
        zielLiquiditaet: 40000,
        startFloorBedarf: 24000,
        startFlexBedarf: 8000,
        flexBudgetAnnual: 0,
        flexBudgetRecharge: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        rentAdjPct: 0,
        targetEq: 60,
        rebalancingBand: 10,
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        goldAktiv: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        goldSteuerfrei: true,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 20,
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
        tailRiskEnabled: false,
        ...overrides
    };
}

function buildParams(method, overrides = {}) {
    return {
        anzahl: 1,
        maxDauer: 5,
        blockSize: 3,
        seed: 60616,
        methode: method,
        rngMode: 'per-run-seed',
        startYearMode: 'RECENCY',
        startYearFilter: 1970,
        startYearHalfLife: 20,
        excludeEstimatedHistory: false,
        ...overrides
    };
}

async function runCase(method, overrides = {}) {
    const inputs = buildInputs(overrides.inputs);
    const monteCarloParams = buildParams(method, overrides.params);
    return runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: overrides.useCapeSampling ?? true,
        runRange: overrides.runRange || { start: 0, count: monteCarloParams.anzahl },
        logIndices: overrides.logIndices || [0],
        engine: EngineAPI
    });
}

{
    const sampleData = Array.from({ length: 10 }, (_, index) => ({
        jahr: 2000 + index,
        regime: 'SIDEWAYS'
    }));
    const config = buildYearSamplingConfig('UNIFORM', sampleData, { blockSize: 3 });
    assert(config.blockStartIndices.includes(7), 'last complete fixed-block start is eligible');
    assert(!config.blockStartIndices.includes(8), 'incomplete fixed-block start is rejected');
}

{
    const requestedConfig = buildYearSamplingConfig('RECENCY', annualData, {
        blockSize: 3,
        startYearHalfLife: 20
    });
    const resolution = resolveMonteCarloSamplingContractV1({
        method: 'block',
        inputs: buildInputs(),
        annualData,
        useCapeSampling: true,
        startYearMode: 'RECENCY',
        startYearHalfLife: 20,
        blockSize: 3,
        yearSamplingConfig: requestedConfig
    });
    assertEqual(resolution.contract.schemaVersion, MONTE_CARLO_SAMPLING_CONTRACT_VERSION, 'sampling contract is versioned');
    assertEqual(resolution.contract.startSource, 'cape', 'CAPE has explicit priority over recency');
    assert(resolution.contract.ignoredOptions.includes('startYearHalfLife'), 'ignored recency option is diagnosed');
    assertEqual(resolution.effectiveYearSamplingConfig.mode, 'UNIFORM', 'CAPE priority removes recency from subsequent year draws');
    assert(resolution.initialStartSampler.indices.every(index => index <= annualData.length - 3), 'CAPE fixed-block candidates all fit a complete block');
}

{
    const resolution = resolveMonteCarloSamplingContractV1({
        method: 'block',
        inputs: buildInputs(),
        annualData,
        useCapeSampling: true,
        startYearMode: 'FILTER',
        startYearFilter: 3000,
        blockSize: 3
    });
    assertEqual(resolution.contract.startSource, 'cape', 'effective CAPE takes priority even when the ignored filter has no candidates');
    assert(resolution.contract.ignoredOptions.includes('startYearFilter'), 'an unusable but ignored filter remains explicit in the contract');
}

{
    let thrown = null;
    try {
        resolveMonteCarloSamplingContractV1({
            method: 'block',
            inputs: buildInputs(),
            annualData,
            useCapeSampling: false,
            startYearMode: 'UNIFORM',
            blockSize: annualData.length
        });
    } catch (error) {
        thrown = error;
    }
    assertEqual(thrown?.code, 'MC_SAMPLING_NO_BLOCK_START_CANDIDATES', 'empty full-block candidate set fails with a stable contract code');
}

{
    const noLegacyFallback = getStartYearCandidates(1000, annualData, 0.2, { fallbackToAll: false });
    assertEqual(noLegacyFallback.length, 0, 'strict CAPE candidate lookup does not silently return all years');
    const resolution = resolveMonteCarloSamplingContractV1({
        method: 'regime_iid',
        inputs: buildInputs({ capeRatio: 0, marketCapeRatio: 0 }),
        annualData,
        useCapeSampling: true,
        startYearMode: 'RECENCY',
        blockSize: 3
    });
    assertEqual(resolution.contract.startSource, 'recency', 'missing CAPE value falls back to the requested start weighting');
    assert(resolution.contract.warnings.includes('cape_value_unavailable_fallback'), 'CAPE fallback is explicitly diagnosed');
}

for (const method of ['block', 'stationary', 'regime_markov', 'regime_iid']) {
    const chunk = await runCase(method);
    const diagnostics = chunk.samplingDiagnostics;
    const startYears = Object.keys(diagnostics.initialStartYearCounts);
    const rows = chunk.runMeta?.[0]?.logDataRows || [];
    assertEqual(diagnostics.schemaVersion, MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION, `${method} exposes versioned diagnostics`);
    assertEqual(diagnostics.contract.method, method, `${method} is named in diagnostics`);
    assertEqual(diagnostics.contract.startSource, 'cape', `${method} diagnoses CAPE as effective start source`);
    assertEqual(startYears.length, 1, `${method} records one selected start year for one run`);
    assert(rows.length > 0, `${method} produces an inspectable deterministic path`);
    assertEqual(Number(rows[0].histJahr), Number(startYears[0]), `${method} starts the simulated path at the selected CAPE record`);
    assertEqual(diagnostics.sampledYears, rows.length, `${method} drawn-year count matches the logged path`);
    assertEqual(Object.values(diagnostics.regimeCounts).reduce((sum, value) => sum + value, 0), diagnostics.sampledYears, `${method} regime counters classify every drawn year`);

    if (method === 'block' && rows.length >= 3) {
        assertEqual(Number(rows[1].histJahr), Number(rows[0].histJahr) + 1, 'fixed block continues sequentially after the CAPE record');
        assertEqual(Number(rows[2].histJahr), Number(rows[1].histJahr) + 1, 'fixed block retains the complete first block');
    }
    if (method === 'stationary') {
        assertEqual(diagnostics.stationaryRestartCounts.initial, 1, 'stationary bootstrap records one anchored initial block');
    }
    if (method === 'regime_markov') {
        assertEqual(diagnostics.contract.regimePolicy, 'initial_record_then_markov_transition', 'Markov transitions start after the selected record');
    }
    if (method === 'regime_iid') {
        assertEqual(diagnostics.contract.regimePolicy, 'initial_record_then_iid', 'IID draws start after the selected record');
    }
}

{
    const chunk = await runCase('block', {
        inputs: {
            tailRiskEnabled: true,
            tailRiskAnnualProbabilityPct: 100,
            tailRiskReturnShockPct: -35,
            tailRiskInflationShockPct: 6,
            tailRiskDurationYears: 1,
            tailRiskCooldownYears: 0
        },
        params: { seed: 7, maxDauer: 4 }
    });
    const tail = chunk.samplingDiagnostics.tailRisk;
    assertEqual(tail.eventCount, chunk.totals.tailRiskEventCount, 'tail-risk event diagnostics reconcile with chunk totals');
    assertEqual(tail.evaluatedYears, chunk.totals.tailRiskEvaluatedYears, 'tail-risk evaluated-year diagnostics reconcile with chunk totals');
    assertEqual(tail.appliedYears, chunk.totals.tailRiskAppliedYears, 'tail-risk applied-year diagnostics reconcile with chunk totals');
    assertEqual(chunk.samplingDiagnostics.contract.precedence.at(-1), 'tail_risk_overlay', 'tail risk is explicitly the last sampling stage');
}

{
    const inputs = buildInputs();
    const monteCarloParams = buildParams('block', { anzahl: 6, maxDauer: 5, seed: 4242 });
    const runRange = range => runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: true,
        runRange: range,
        logIndices: [],
        engine: EngineAPI
    });
    const full = await runRange({ start: 0, count: 6 });
    const splitA = await runRange({ start: 0, count: 2 });
    const splitB = await runRange({ start: 2, count: 4 });
    const accumulator = createMonteCarloChunkAccumulatorV1(6);
    mergeMonteCarloChunkResultV1(accumulator, splitB);
    mergeMonteCarloChunkResultV1(accumulator, splitA);
    const merged = finalizeMonteCarloChunkAccumulatorV1(accumulator);
    assertEqual(JSON.stringify(merged.samplingDiagnostics), JSON.stringify(full.samplingDiagnostics), 'sampling diagnostics are invariant to chunking and merge order');
    assertEqual(merged.samplingDiagnostics.requestedRuns, 6, 'merged sampling diagnostics retain the requested run count');
    assert(merged.samplingDiagnostics.dataVersion.annualDataHash, 'sampling diagnostics identify the annual-data version');
    assert(merged.samplingDiagnostics.dataVersion.regimeHash, 'sampling diagnostics identify the regime version');
}

console.log('--- Monte Carlo Sampling Contract Tests Completed ---');
