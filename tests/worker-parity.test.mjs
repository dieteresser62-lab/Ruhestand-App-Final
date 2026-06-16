import { EngineAPI } from '../engine/index.mjs';
import { CONFIG } from '../engine/config.mjs';
import { prepareHistoricalDataOnce } from '../app/simulator/simulator-engine-helpers.js';
import { createMonteCarloBuffers, MC_HEATMAP_BINS, pickWorstRun, runMonteCarloChunk, buildMonteCarloAggregates } from '../app/simulator/monte-carlo-runner.js';
import { runSweepChunk } from '../app/simulator/sweep-runner.js';

// Engine API is expected to live on window in browser-mode code.
if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.EngineAPI = EngineAPI;

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: ${actual} != ${expected}`);
    }
}

// Append helper used to merge worker-like list outputs.
function appendArray(target, source) {
    if (!source || source.length === 0) return;
    for (let i = 0; i < source.length; i++) {
        target.push(source[i]);
    }
}

// Merge heatmap counts (year x bin) by simple summation.
function mergeHeatmap(target, source) {
    for (let year = 0; year < target.length; year++) {
        const targetRow = target[year];
        const sourceRow = source[year];
        if (!sourceRow) continue;
        for (let i = 0; i < targetRow.length; i++) {
            targetRow[i] += sourceRow[i] || 0;
        }
    }
}

const MC_BUFFER_KEYS = [
    'finalOutcomes',
    'taxOutcomes',
    'kpiLebensdauer',
    'kpiKuerzungsjahre',
    'kpiMaxKuerzung',
    'volatilities',
    'maxDrawdowns',
    'depotErschoepft',
    'alterBeiErschoepfung',
    'anteilJahreOhneFlex',
    'stress_maxDrawdowns',
    'stress_timeQuoteAbove45',
    'stress_cutYears',
    'stress_CaR_P10_Real',
    'stress_recoveryYears'
];

const MC_TOTAL_KEYS = [
    'failCount',
    'pflegeTriggeredCount',
    'totalSimulatedYears',
    'totalYearsQuoteAbove45',
    'totalYearsSafetyStage1plus',
    'totalYearsSafetyStage2',
    'shortfallWithCareCount',
    'shortfallNoCareProxyCount',
    'p2TriggeredCount',
    'runsSafetyStage1Triggered',
    'runsSafetyStage2Triggered',
    'totalTaxSavedByLossCarry',
    'healthBucketEnabledCount',
    'healthBucketUsedCount',
    'healthBucketDepletedCount',
    'totalHealthBucketUsed'
];

const MC_LIST_KEYS = [
    'entryAges',
    'entryAgesP2',
    'careDepotCosts',
    'endWealthWithCareList',
    'endWealthNoCareList',
    'p1CareYearsTriggered',
    'p2CareYearsTriggered',
    'bothCareYearsOverlapTriggered',
    'maxAnnualCareSpendTriggered',
    'healthBucketUsedAmounts',
    'healthBucketEndAmounts',
    'healthBucketCoveragePct',
    'healthBucketTargetGaps',
    'healthBucketInterestAmounts'
];

function createMergedMonteCarloState(totalRuns) {
    return {
        buffers: createMonteCarloBuffers(totalRuns),
        heatmap: Array(10).fill(0).map(() => new Uint32Array(MC_HEATMAP_BINS.length - 1)),
        totals: Object.fromEntries(MC_TOTAL_KEYS.map(key => [key, 0])),
        lists: Object.fromEntries(MC_LIST_KEYS.map(key => [key, []])),
        allRealWithdrawalsSample: [],
        worstRun: null,
        worstRunCare: null,
        runMeta: []
    };
}

function mergeMonteCarloChunk(state, chunk, start) {
    for (const key of MC_BUFFER_KEYS) {
        assert(chunk.buffers[key] !== undefined, `Chunk buffer missing ${key}`);
        assert(state.buffers[key] !== undefined, `Merged buffer missing ${key}`);
        state.buffers[key].set(chunk.buffers[key], start);
    }

    mergeHeatmap(state.heatmap, chunk.heatmap);

    for (const key of MC_TOTAL_KEYS) {
        state.totals[key] += chunk.totals[key] || 0;
    }

    for (const key of MC_LIST_KEYS) {
        appendArray(state.lists[key], chunk.lists[key]);
    }
    appendArray(state.allRealWithdrawalsSample, chunk.allRealWithdrawalsSample);
    appendArray(state.runMeta, chunk.runMeta);

    state.worstRun = pickWorstRun(state.worstRun, chunk.worstRun);
    state.worstRunCare = pickWorstRun(state.worstRunCare, chunk.worstRunCare);
}

function buildAggregatesFromState(inputs, totalRuns, state) {
    return buildMonteCarloAggregates({
        inputs,
        totalRuns,
        buffers: state.buffers,
        heatmap: state.heatmap,
        bins: MC_HEATMAP_BINS,
        totals: state.totals,
        lists: state.lists,
        allRealWithdrawalsSample: state.allRealWithdrawalsSample
    });
}

function sumHeatmap(heatmap) {
    let sum = 0;
    for (const row of heatmap || []) {
        for (const value of row || []) sum += value || 0;
    }
    return sum;
}

function sortedNumericJson(values) {
    return JSON.stringify([...(values || [])].map(Number).sort((a, b) => a - b));
}

function assertMonteCarloTotalsEqual(fullTotals, mergedTotals, prefix) {
    for (const key of MC_TOTAL_KEYS) {
        assertClose(fullTotals[key] || 0, mergedTotals[key] || 0, 1e-6, `${prefix} total ${key} mismatch`);
    }
}

function assertMonteCarloListShapesEqual(fullLists, mergedLists, prefix) {
    for (const key of MC_LIST_KEYS) {
        assert((fullLists[key] || []).length === (mergedLists[key] || []).length, `${prefix} list ${key} length mismatch`);
        assertEqual(sortedNumericJson(mergedLists[key]), sortedNumericJson(fullLists[key]), `${prefix} list ${key} values mismatch`);
    }
}

const SWEEP_METRIC_KEYS = [
    'successProbFloor',
    'p10EndWealth',
    'p25EndWealth',
    'medianEndWealth',
    'p75EndWealth',
    'meanEndWealth',
    'maxEndWealth',
    'worst5Drawdown',
    'minRunwayObserved'
];

function sortSweepResults(results) {
    return [...(results || [])].sort((a, b) => a.comboIdx - b.comboIdx);
}

function assertSweepResultsEqual(fullResults, splitResults, prefix) {
    const fullSorted = sortSweepResults(fullResults);
    const splitSorted = sortSweepResults(splitResults);
    assert(fullSorted.length === splitSorted.length, `${prefix} result length mismatch`);

    for (let i = 0; i < fullSorted.length; i++) {
        const full = fullSorted[i];
        const split = splitSorted[i];
        assertEqual(split.comboIdx, full.comboIdx, `${prefix} comboIdx mismatch at ${i}`);
        assertEqual(JSON.stringify(split.params), JSON.stringify(full.params), `${prefix} params mismatch for combo ${full.comboIdx}`);
        assertEqual(
            Boolean(split.metrics?.invalidCombination),
            Boolean(full.metrics?.invalidCombination),
            `${prefix} invalid flag mismatch for combo ${full.comboIdx}`
        );
        assertEqual(
            String(split.metrics?.invalidReason || ''),
            String(full.metrics?.invalidReason || ''),
            `${prefix} invalid reason mismatch for combo ${full.comboIdx}`
        );

        for (const key of SWEEP_METRIC_KEYS) {
            assertClose(split.metrics?.[key] || 0, full.metrics?.[key] || 0, 1e-6, `${prefix} metric ${key} mismatch for combo ${full.comboIdx}`);
        }
    }
}

console.log('--- Worker Parity Tests ---');

// Ensure historical data is initialized before MC/sweep runs.
prepareHistoricalDataOnce();

const baseInputs = {
    startAlter: 65,
    geschlecht: 'm',
    startVermoegen: 900000,
    depotwertAlt: 300000,
    einstandAlt: 250000,
    zielLiquiditaet: 50000,
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
    dynamicFlex: false,
    horizonMethod: 'survival_quantile',
    horizonYears: 30,
    survivalQuantile: 0.85,
    goGoActive: false,
    goGoMultiplier: 1.0,
    capeRatio: 0,
    marketCapeRatio: 0,
    stressPreset: 'NONE',
    pflegefallLogikAktivieren: false,
    partner: { aktiv: false },
    accumulationPhase: { enabled: false },
    transitionYear: 0
};

const widowOptions = {
    mode: 'stop',
    percent: 0,
    marriageOffsetYears: 0,
    minMarriageYears: 0
};

// Test 1: Monte-Carlo chunk merge parity
try {
    const monteCarloParams = {
        anzahl: 40,
        maxDauer: 30,
        blockSize: 5,
        seed: 1234,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const fullChunk = await runMonteCarloChunk({
        inputs: baseInputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 0, count: monteCarloParams.anzahl },
        engine: EngineAPI
    });

    const splitA = await runMonteCarloChunk({
        inputs: baseInputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 0, count: 20 },
        engine: EngineAPI
    });

    const splitB = await runMonteCarloChunk({
        inputs: baseInputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 20, count: 20 },
        engine: EngineAPI
    });

    const mergedBuffers = createMonteCarloBuffers(monteCarloParams.anzahl);
    // Keep merged structures identical to the worker aggregation path.
    const mergedHeatmap = Array(10).fill(0).map(() => new Uint32Array(MC_HEATMAP_BINS.length - 1));
    const mergedLists = Object.fromEntries(MC_LIST_KEYS.map(key => [key, []]));
    const mergedTotals = Object.fromEntries(MC_TOTAL_KEYS.map(key => [key, 0]));
    const mergedWithdrawals = [];

    // Merge-Helper: entspricht der Worker-Chunk-Akkumulation im echten Lauf.
    const mergeChunk = (chunk, start) => {
        const chunkBuffers = chunk.buffers;
        mergedBuffers.finalOutcomes.set(chunkBuffers.finalOutcomes, start);
        mergedBuffers.taxOutcomes.set(chunkBuffers.taxOutcomes, start);
        mergedBuffers.kpiLebensdauer.set(chunkBuffers.kpiLebensdauer, start);
        mergedBuffers.kpiKuerzungsjahre.set(chunkBuffers.kpiKuerzungsjahre, start);
        mergedBuffers.kpiMaxKuerzung.set(chunkBuffers.kpiMaxKuerzung, start);
        mergedBuffers.volatilities.set(chunkBuffers.volatilities, start);
        mergedBuffers.maxDrawdowns.set(chunkBuffers.maxDrawdowns, start);
        mergedBuffers.depotErschoepft.set(chunkBuffers.depotErschoepft, start);
        mergedBuffers.alterBeiErschoepfung.set(chunkBuffers.alterBeiErschoepfung, start);
        mergedBuffers.anteilJahreOhneFlex.set(chunkBuffers.anteilJahreOhneFlex, start);
        mergedBuffers.stress_maxDrawdowns.set(chunkBuffers.stress_maxDrawdowns, start);
        mergedBuffers.stress_timeQuoteAbove45.set(chunkBuffers.stress_timeQuoteAbove45, start);
        mergedBuffers.stress_cutYears.set(chunkBuffers.stress_cutYears, start);
        mergedBuffers.stress_CaR_P10_Real.set(chunkBuffers.stress_CaR_P10_Real, start);
        mergedBuffers.stress_recoveryYears.set(chunkBuffers.stress_recoveryYears, start);

        mergeHeatmap(mergedHeatmap, chunk.heatmap);

        for (const key of MC_TOTAL_KEYS) {
            mergedTotals[key] += chunk.totals[key] || 0;
        }

        for (const key of MC_LIST_KEYS) {
            appendArray(mergedLists[key], chunk.lists[key]);
        }
        appendArray(mergedWithdrawals, chunk.allRealWithdrawalsSample);
    };

    mergeChunk(splitA, 0);
    mergeChunk(splitB, 20);

    const fullAggregates = buildMonteCarloAggregates({
        inputs: baseInputs,
        totalRuns: monteCarloParams.anzahl,
        buffers: fullChunk.buffers,
        heatmap: fullChunk.heatmap,
        bins: fullChunk.bins,
        totals: fullChunk.totals,
        lists: fullChunk.lists,
        allRealWithdrawalsSample: fullChunk.allRealWithdrawalsSample
    });

    const mergedAggregates = buildMonteCarloAggregates({
        inputs: baseInputs,
        totalRuns: monteCarloParams.anzahl,
        buffers: mergedBuffers,
        heatmap: mergedHeatmap,
        bins: MC_HEATMAP_BINS,
        totals: mergedTotals,
        lists: mergedLists,
        allRealWithdrawalsSample: mergedWithdrawals
    });

    assert(fullChunk.totals.failCount === mergedTotals.failCount, 'MC failCount mismatch');
    assert(fullChunk.totals.pflegeTriggeredCount === mergedTotals.pflegeTriggeredCount, 'MC pflegeTriggeredCount mismatch');

    assertClose(fullAggregates.finalOutcomes.p10, mergedAggregates.finalOutcomes.p10, 1e-6, 'MC p10 mismatch');
    assertClose(fullAggregates.finalOutcomes.p50, mergedAggregates.finalOutcomes.p50, 1e-6, 'MC p50 mismatch');
    assertClose(fullAggregates.finalOutcomes.p90, mergedAggregates.finalOutcomes.p90, 1e-6, 'MC p90 mismatch');
    assertClose(fullAggregates.depotErschoepfungsQuote, mergedAggregates.depotErschoepfungsQuote, 1e-6, 'MC depletion mismatch');
    assertClose(fullAggregates.extraKPI.timeShareQuoteAbove45, mergedAggregates.extraKPI.timeShareQuoteAbove45, 1e-6, 'MC timeShare mismatch');
    assertClose(fullAggregates.stressKPI.maxDD.p50, mergedAggregates.stressKPI.maxDD.p50, 1e-6, 'MC stress maxDD p50 mismatch');

    console.log('✅ Monte-Carlo merge parity passed');
} catch (e) {
    console.error('❌ Monte-Carlo merge parity failed', e);
    throw e;
}

// Test 2: Sweep chunk split parity
try {
    const sweepConfig = {
        anzahlRuns: 20,
        maxDauer: 25,
        blockSize: 5,
        baseSeed: 77,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const paramCombinations = [
        { runwayMin: 18, runwayTarget: 30, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0 },
        { runwayMin: 24, runwayTarget: 36, targetEq: 70, rebalBand: 6, maxSkimPct: 12, maxBearRefillPct: 6, goldTargetPct: 5 },
        { runwayMin: 30, runwayTarget: 42, targetEq: 50, rebalBand: 4, maxSkimPct: 8, maxBearRefillPct: 4, goldTargetPct: 0 }
    ];

    const fullSweep = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 0, count: paramCombinations.length },
        sweepConfig
    });

    const sweepA = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 0, count: 2 },
        sweepConfig
    });

    const sweepB = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 2, count: 1 },
        sweepConfig
    });

    const combinedResults = [...sweepA.results, ...sweepB.results].sort((a, b) => a.comboIdx - b.comboIdx);
    assert(fullSweep.results.length === combinedResults.length, 'Sweep result length mismatch');

    for (let i = 0; i < fullSweep.results.length; i++) {
        const full = fullSweep.results[i];
        const merged = combinedResults[i];
        assert(full.comboIdx === merged.comboIdx, 'Sweep combo index mismatch');

        assertClose(full.metrics.successProbFloor, merged.metrics.successProbFloor, 1e-6, 'Sweep successProb mismatch');
        assertClose(full.metrics.p10EndWealth, merged.metrics.p10EndWealth, 1e-6, 'Sweep p10 mismatch');
        assertClose(full.metrics.medianEndWealth, merged.metrics.medianEndWealth, 1e-6, 'Sweep median mismatch');
        assertClose(full.metrics.worst5Drawdown, merged.metrics.worst5Drawdown, 1e-6, 'Sweep drawdown mismatch');
    }

    assert(fullSweep.p2VarianceCount === (sweepA.p2VarianceCount + sweepB.p2VarianceCount), 'Sweep p2 variance mismatch');

console.log('✅ Sweep split parity passed');
} catch (e) {
    console.error('❌ Sweep split parity failed', e);
    throw e;
}

// Test 2b: Sweep uneven split parity with invalid combinations and input isolation
try {
    const sweepConfig = {
        anzahlRuns: 18,
        maxDauer: 18,
        blockSize: 4,
        baseSeed: 2026,
        methode: 'block',
        rngMode: 'per-run-seed'
    };
    const paramCombinations = [
        { runwayMin: 18, runwayTarget: 30, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0 },
        { runwayMin: 24, runwayTarget: 36, targetEq: 70, rebalBand: 6, maxSkimPct: 12, maxBearRefillPct: 6, goldTargetPct: 5 },
        { runwayMin: 42, runwayTarget: 30, targetEq: 55, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0 },
        { runwayMin: 30, runwayTarget: 42, targetEq: 50, rebalBand: 4, maxSkimPct: 8, maxBearRefillPct: 4, goldTargetPct: 0 },
        { runwayMin: 24, runwayTarget: 36, targetEq: 65, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 35 },
        { runwayMin: 12, runwayTarget: 24, targetEq: 80, rebalBand: 8, maxSkimPct: 15, maxBearRefillPct: 8, goldTargetPct: 10 }
    ];
    const baseSnapshot = JSON.stringify(baseInputs);

    const fullSweep = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 0, count: paramCombinations.length },
        sweepConfig
    });
    assertEqual(JSON.stringify(baseInputs), baseSnapshot, 'Sweep full run should not mutate baseInputs');

    const splitRanges = [
        { start: 0, count: 1 },
        { start: 1, count: 3 },
        { start: 4, count: 2 }
    ];
    const splitResults = [];
    let splitP2VarianceCount = 0;
    for (const range of splitRanges) {
        const split = runSweepChunk({
            baseInputs,
            paramCombinations,
            comboRange: range,
            sweepConfig
        });
        splitResults.push(...split.results);
        splitP2VarianceCount += split.p2VarianceCount;
        assertEqual(JSON.stringify(baseInputs), baseSnapshot, `Sweep split ${range.start}:${range.count} should not mutate baseInputs`);
    }

    assertSweepResultsEqual(fullSweep.results, splitResults, 'Uneven Sweep');
    assertEqual(fullSweep.p2VarianceCount, splitP2VarianceCount, 'Uneven Sweep p2VarianceCount mismatch');

    const invalidReasons = sortSweepResults(splitResults)
        .filter(item => item.metrics?.invalidCombination)
        .map(item => String(item.metrics.invalidReason || ''));
    assert(invalidReasons.length === 2, 'Uneven Sweep should retain two invalid combinations');
    assert(invalidReasons.some(reason => reason.includes('runwayMin')), 'Uneven Sweep should retain runway invalid reason');
    assert(invalidReasons.some(reason => reason.includes('goldTargetPct')), 'Uneven Sweep should retain gold target invalid reason');

    console.log('✅ Uneven Sweep split parity with invalid combinations passed');
} catch (e) {
    console.error('❌ Uneven Sweep split parity with invalid combinations failed', e);
    throw e;
}

// Test 2c: Sweep Dynamic-Flex invalid shape parity across split ranges
try {
    const dynamicBase = {
        ...baseInputs,
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0
    };
    const sweepConfig = {
        anzahlRuns: 12,
        maxDauer: 12,
        blockSize: 4,
        baseSeed: 3030,
        methode: 'block',
        rngMode: 'per-run-seed'
    };
    const paramCombinations = [
        { runwayMin: 18, runwayTarget: 30, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, survivalQuantile: 0.9 },
        { runwayMin: 18, runwayTarget: 30, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, survivalQuantile: 0.2 },
        { runwayMin: 18, runwayTarget: 30, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, goGoMultiplier: 1.2 },
        { runwayMin: 18, runwayTarget: 30, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, horizonYears: 45 }
    ];

    const fullSweep = runSweepChunk({
        baseInputs: dynamicBase,
        paramCombinations,
        comboRange: { start: 0, count: paramCombinations.length },
        sweepConfig
    });
    const splitA = runSweepChunk({
        baseInputs: dynamicBase,
        paramCombinations,
        comboRange: { start: 0, count: 2 },
        sweepConfig
    });
    const splitB = runSweepChunk({
        baseInputs: dynamicBase,
        paramCombinations,
        comboRange: { start: 2, count: 2 },
        sweepConfig
    });

    assertSweepResultsEqual(fullSweep.results, [...splitA.results, ...splitB.results], 'Dynamic Sweep invalid');
    assertEqual(fullSweep.p2VarianceCount, splitA.p2VarianceCount + splitB.p2VarianceCount, 'Dynamic Sweep p2VarianceCount mismatch');
    assert(fullSweep.results[1].metrics.invalidCombination === true, 'Dynamic Sweep should mark invalid quantile');
    assert(fullSweep.results[2].metrics.invalidCombination === true, 'Dynamic Sweep should mark invalid go-go multiplier');
    assert(fullSweep.results[0].metrics.invalidCombination !== true, 'Dynamic Sweep should keep valid quantile valid');
    assert(fullSweep.results[3].metrics.invalidCombination !== true, 'Dynamic Sweep should keep valid horizon valid');

    console.log('✅ Dynamic-Flex Sweep invalid-shape parity passed');
} catch (e) {
    console.error('❌ Dynamic-Flex Sweep invalid-shape parity failed', e);
    throw e;
}

// Test 3: Dynamic-Flex parity incl. VPW log payload (serial full vs split chunks)
try {
    const dynamicInputs = {
        ...baseInputs,
        startAlter: 50,
        dynamicFlex: true,
        horizonMethod: 'mean',
        horizonYears: 35,
        capeRatio: 30,
        marketCapeRatio: 30
    };
    const monteCarloParams = {
        anzahl: 12,
        maxDauer: 6,
        blockSize: 3,
        seed: 314159,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const fullChunk = await runMonteCarloChunk({
        inputs: dynamicInputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 0, count: monteCarloParams.anzahl },
        logIndices: [0],
        engine: EngineAPI
    });

    const splitA = await runMonteCarloChunk({
        inputs: dynamicInputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 0, count: 6 },
        logIndices: [0],
        engine: EngineAPI
    });

    const splitB = await runMonteCarloChunk({
        inputs: dynamicInputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 6, count: 6 },
        logIndices: [0],
        engine: EngineAPI
    });

    const mergedBuffers = createMonteCarloBuffers(monteCarloParams.anzahl);
    const mergedHeatmap = Array(10).fill(0).map(() => new Uint32Array(MC_HEATMAP_BINS.length - 1));
    const mergedLists = Object.fromEntries(MC_LIST_KEYS.map(key => [key, []]));
    const mergedTotals = Object.fromEntries(MC_TOTAL_KEYS.map(key => [key, 0]));
    const mergedWithdrawals = [];

    const mergeChunk = (chunk, start) => {
        const chunkBuffers = chunk.buffers;
        mergedBuffers.finalOutcomes.set(chunkBuffers.finalOutcomes, start);
        mergedBuffers.taxOutcomes.set(chunkBuffers.taxOutcomes, start);
        mergedBuffers.kpiLebensdauer.set(chunkBuffers.kpiLebensdauer, start);
        mergedBuffers.kpiKuerzungsjahre.set(chunkBuffers.kpiKuerzungsjahre, start);
        mergedBuffers.kpiMaxKuerzung.set(chunkBuffers.kpiMaxKuerzung, start);
        mergedBuffers.volatilities.set(chunkBuffers.volatilities, start);
        mergedBuffers.maxDrawdowns.set(chunkBuffers.maxDrawdowns, start);
        mergedBuffers.depotErschoepft.set(chunkBuffers.depotErschoepft, start);
        mergedBuffers.alterBeiErschoepfung.set(chunkBuffers.alterBeiErschoepfung, start);
        mergedBuffers.anteilJahreOhneFlex.set(chunkBuffers.anteilJahreOhneFlex, start);
        mergedBuffers.stress_maxDrawdowns.set(chunkBuffers.stress_maxDrawdowns, start);
        mergedBuffers.stress_timeQuoteAbove45.set(chunkBuffers.stress_timeQuoteAbove45, start);
        mergedBuffers.stress_cutYears.set(chunkBuffers.stress_cutYears, start);
        mergedBuffers.stress_CaR_P10_Real.set(chunkBuffers.stress_CaR_P10_Real, start);
        mergedBuffers.stress_recoveryYears.set(chunkBuffers.stress_recoveryYears, start);
        mergeHeatmap(mergedHeatmap, chunk.heatmap);
        for (const key of MC_TOTAL_KEYS) {
            mergedTotals[key] += chunk.totals[key] || 0;
        }
        for (const key of MC_LIST_KEYS) {
            appendArray(mergedLists[key], chunk.lists[key]);
        }
        appendArray(mergedWithdrawals, chunk.allRealWithdrawalsSample);
    };

    mergeChunk(splitA, 0);
    mergeChunk(splitB, 6);

    const fullAggregates = buildMonteCarloAggregates({
        inputs: dynamicInputs,
        totalRuns: monteCarloParams.anzahl,
        buffers: fullChunk.buffers,
        heatmap: fullChunk.heatmap,
        bins: fullChunk.bins,
        totals: fullChunk.totals,
        lists: fullChunk.lists,
        allRealWithdrawalsSample: fullChunk.allRealWithdrawalsSample
    });
    const mergedAggregates = buildMonteCarloAggregates({
        inputs: dynamicInputs,
        totalRuns: monteCarloParams.anzahl,
        buffers: mergedBuffers,
        heatmap: mergedHeatmap,
        bins: MC_HEATMAP_BINS,
        totals: mergedTotals,
        lists: mergedLists,
        allRealWithdrawalsSample: mergedWithdrawals
    });

    assertClose(fullAggregates.finalOutcomes.p50, mergedAggregates.finalOutcomes.p50, 1e-6, 'Dynamic MC p50 mismatch');
    assertClose(fullAggregates.depotErschoepfungsQuote, mergedAggregates.depotErschoepfungsQuote, 1e-6, 'Dynamic MC depletion mismatch');

    const fullMetaRun0 = (fullChunk.runMeta || []).find(m => m.index === 0);
    const splitMetaRun0 = (splitA.runMeta || []).find(m => m.index === 0);
    const fullHorizons = (fullMetaRun0?.logDataRows || []).map(r => Number(r?.vpw?.horizonYears)).filter(Number.isFinite);
    const splitHorizons = (splitMetaRun0?.logDataRows || []).map(r => Number(r?.vpw?.horizonYears)).filter(Number.isFinite);
    assert(fullHorizons.length > 0, 'Dynamic full run should expose VPW horizons');
    assertEqual(JSON.stringify(splitHorizons), JSON.stringify(fullHorizons), 'Dynamic run-0 VPW horizons should match split/full');

    console.log('✅ Dynamic-Flex MC parity passed');
} catch (e) {
    console.error('❌ Dynamic-Flex MC parity failed', e);
    throw e;
}

// Test 4: Monte-Carlo uneven chunk parity with complete merge contracts
try {
    const monteCarloParams = {
        anzahl: 37,
        maxDauer: 24,
        blockSize: 4,
        seed: 98765,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const fullChunk = await runMonteCarloChunk({
        inputs: baseInputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 0, count: monteCarloParams.anzahl },
        engine: EngineAPI
    });

    const splitRanges = [
        { start: 0, count: 7 },
        { start: 7, count: 16 },
        { start: 23, count: 14 }
    ];
    const merged = createMergedMonteCarloState(monteCarloParams.anzahl);

    for (const range of splitRanges) {
        const chunk = await runMonteCarloChunk({
            inputs: baseInputs,
            monteCarloParams,
            widowOptions,
            useCapeSampling: false,
            runRange: range,
            engine: EngineAPI
        });
        mergeMonteCarloChunk(merged, chunk, range.start);
    }

    const fullAggregates = buildMonteCarloAggregates({
        inputs: baseInputs,
        totalRuns: monteCarloParams.anzahl,
        buffers: fullChunk.buffers,
        heatmap: fullChunk.heatmap,
        bins: fullChunk.bins,
        totals: fullChunk.totals,
        lists: fullChunk.lists,
        allRealWithdrawalsSample: fullChunk.allRealWithdrawalsSample
    });
    const mergedAggregates = buildAggregatesFromState(baseInputs, monteCarloParams.anzahl, merged);

    for (const key of MC_BUFFER_KEYS) {
        assert(merged.buffers[key].length === monteCarloParams.anzahl, `Uneven MC merged buffer ${key} length mismatch`);
    }
    assertMonteCarloTotalsEqual(fullChunk.totals, merged.totals, 'Uneven MC');
    assertMonteCarloListShapesEqual(fullChunk.lists, merged.lists, 'Uneven MC');
    assertEqual(sumHeatmap(merged.heatmap), sumHeatmap(fullChunk.heatmap), 'Uneven MC heatmap total should match');
    assertEqual(JSON.stringify(merged.allRealWithdrawalsSample), JSON.stringify(fullChunk.allRealWithdrawalsSample), 'Uneven MC withdrawal sample should match');
    assertClose(fullAggregates.finalOutcomes.p10, mergedAggregates.finalOutcomes.p10, 1e-6, 'Uneven MC p10 mismatch');
    assertClose(fullAggregates.finalOutcomes.p50, mergedAggregates.finalOutcomes.p50, 1e-6, 'Uneven MC p50 mismatch');
    assertClose(fullAggregates.finalOutcomes.p90, mergedAggregates.finalOutcomes.p90, 1e-6, 'Uneven MC p90 mismatch');
    assertClose(fullAggregates.depotErschoepfungsQuote, mergedAggregates.depotErschoepfungsQuote, 1e-6, 'Uneven MC depletion mismatch');
    assert(merged.worstRun?.runIdx === fullChunk.worstRun?.runIdx, 'Uneven MC worst run index mismatch');
    assertClose(merged.worstRun?.finalVermoegen, fullChunk.worstRun?.finalVermoegen, 1e-6, 'Uneven MC worst run wealth mismatch');

    console.log('✅ Uneven Monte-Carlo chunk parity passed');
} catch (e) {
    console.error('❌ Uneven Monte-Carlo chunk parity failed', e);
    throw e;
}

// Test 5: Monte-Carlo logshape parity across chunk boundaries
try {
    const dynamicInputs = {
        ...baseInputs,
        startAlter: 52,
        dynamicFlex: true,
        horizonMethod: 'mean',
        horizonYears: 32,
        capeRatio: 28,
        marketCapeRatio: 28
    };
    const monteCarloParams = {
        anzahl: 37,
        maxDauer: 8,
        blockSize: 4,
        seed: 24680,
        methode: 'block',
        rngMode: 'per-run-seed'
    };
    const logIndices = [0, 8, 24, 36];

    const fullChunk = await runMonteCarloChunk({
        inputs: dynamicInputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 0, count: monteCarloParams.anzahl },
        logIndices,
        engine: EngineAPI
    });

    const splitRanges = [
        { start: 0, count: 7 },
        { start: 7, count: 16 },
        { start: 23, count: 14 }
    ];
    const merged = createMergedMonteCarloState(monteCarloParams.anzahl);

    for (const range of splitRanges) {
        const chunk = await runMonteCarloChunk({
            inputs: dynamicInputs,
            monteCarloParams,
            widowOptions,
            useCapeSampling: false,
            runRange: range,
            logIndices,
            engine: EngineAPI
        });
        mergeMonteCarloChunk(merged, chunk, range.start);
    }

    const fullByIndex = new Map((fullChunk.runMeta || []).map(meta => [meta.index, meta]));
    const mergedByIndex = new Map((merged.runMeta || []).map(meta => [meta.index, meta]));
    const requiredRowFields = [
        'jahr',
        'histJahr',
        'inflation',
        'entnahme_effektiv',
        'liq_before_payout',
        'liq_after_payout',
        'portfolio_total_end',
        'taxSavedByLossCarry',
        'Person1Alive',
        'vpw'
    ];

    assert(fullChunk.runMeta.length === monteCarloParams.anzahl, 'Full logshape runMeta length mismatch');
    assert(merged.runMeta.length === monteCarloParams.anzahl, 'Merged logshape runMeta length mismatch');
    assertEqual(
        JSON.stringify([...mergedByIndex.keys()].sort((a, b) => a - b)),
        JSON.stringify([...fullByIndex.keys()].sort((a, b) => a - b)),
        'Logshape runMeta indices should match'
    );

    for (const runIdx of logIndices) {
        const fullMeta = fullByIndex.get(runIdx);
        const mergedMeta = mergedByIndex.get(runIdx);
        assert(fullMeta, `Full log meta missing run ${runIdx}`);
        assert(mergedMeta, `Merged log meta missing run ${runIdx}`);
        assertEqual(mergedMeta.index, fullMeta.index, `Log meta index mismatch for run ${runIdx}`);
        assertEqual(mergedMeta.logDataRows.length, fullMeta.logDataRows.length, `Log row count mismatch for run ${runIdx}`);
        assert(mergedMeta.logDataRows.length > 0, `Log rows should be captured for run ${runIdx}`);

        for (let rowIdx = 0; rowIdx < fullMeta.logDataRows.length; rowIdx++) {
            const fullRow = fullMeta.logDataRows[rowIdx];
            const mergedRow = mergedMeta.logDataRows[rowIdx];
            for (const field of requiredRowFields) {
                assert(field in mergedRow, `Merged log row missing ${field} for run ${runIdx}`);
                assert(field in fullRow, `Full log row missing ${field} for run ${runIdx}`);
            }
            assertEqual(mergedRow.jahr, fullRow.jahr, `Log jahr mismatch for run ${runIdx}, row ${rowIdx}`);
            assertEqual(mergedRow.histJahr, fullRow.histJahr, `Log histJahr mismatch for run ${runIdx}, row ${rowIdx}`);
            assertClose(mergedRow.entnahme_effektiv, fullRow.entnahme_effektiv, 1e-6, `Log entnahme mismatch for run ${runIdx}, row ${rowIdx}`);
            assertClose(mergedRow.portfolio_total_end, fullRow.portfolio_total_end, 1e-6, `Log portfolio total mismatch for run ${runIdx}, row ${rowIdx}`);
            assertEqual(
                JSON.stringify(mergedRow.vpw || null),
                JSON.stringify(fullRow.vpw || null),
                `Log VPW payload mismatch for run ${runIdx}, row ${rowIdx}`
            );
        }
    }

    console.log('✅ Monte-Carlo logshape chunk-boundary parity passed');
} catch (e) {
    console.error('❌ Monte-Carlo logshape chunk-boundary parity failed', e);
    throw e;
}

// Test 6: Continuous CAPE policy stays deterministic across MC and Sweep chunking
try {
    const previousPolicy = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY;
    CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY = 'cape_continuous';
    try {
        const continuousInputs = {
            ...baseInputs,
            startAlter: 54,
            dynamicFlex: true,
            horizonMethod: 'mean',
            horizonYears: 30,
            capeRatio: 20,
            marketCapeRatio: 20
        };
        const monteCarloParams = {
            anzahl: 16,
            maxDauer: 7,
            blockSize: 3,
            seed: 271828,
            methode: 'block',
            rngMode: 'per-run-seed'
        };

        const fullChunk = await runMonteCarloChunk({
            inputs: continuousInputs,
            monteCarloParams,
            widowOptions,
            useCapeSampling: false,
            runRange: { start: 0, count: monteCarloParams.anzahl },
            logIndices: [0, 7, 15],
            engine: EngineAPI
        });

        const splitRanges = [
            { start: 0, count: 5 },
            { start: 5, count: 6 },
            { start: 11, count: 5 }
        ];
        const merged = createMergedMonteCarloState(monteCarloParams.anzahl);

        for (const range of splitRanges) {
            const chunk = await runMonteCarloChunk({
                inputs: continuousInputs,
                monteCarloParams,
                widowOptions,
                useCapeSampling: false,
                runRange: range,
                logIndices: [0, 7, 15],
                engine: EngineAPI
            });
            mergeMonteCarloChunk(merged, chunk, range.start);
        }

        const fullAggregates = buildMonteCarloAggregates({
            inputs: continuousInputs,
            totalRuns: monteCarloParams.anzahl,
            buffers: fullChunk.buffers,
            heatmap: fullChunk.heatmap,
            bins: fullChunk.bins,
            totals: fullChunk.totals,
            lists: fullChunk.lists,
            allRealWithdrawalsSample: fullChunk.allRealWithdrawalsSample
        });
        const mergedAggregates = buildAggregatesFromState(continuousInputs, monteCarloParams.anzahl, merged);

        assertMonteCarloTotalsEqual(fullChunk.totals, merged.totals, 'Continuous CAPE MC');
        assertMonteCarloListShapesEqual(fullChunk.lists, merged.lists, 'Continuous CAPE MC');
        assertClose(fullAggregates.finalOutcomes.p10, mergedAggregates.finalOutcomes.p10, 1e-6, 'Continuous CAPE MC p10 mismatch');
        assertClose(fullAggregates.finalOutcomes.p50, mergedAggregates.finalOutcomes.p50, 1e-6, 'Continuous CAPE MC p50 mismatch');
        assertClose(fullAggregates.depotErschoepfungsQuote, mergedAggregates.depotErschoepfungsQuote, 1e-6, 'Continuous CAPE MC depletion mismatch');

        const fullByIndex = new Map((fullChunk.runMeta || []).map(meta => [meta.index, meta]));
        const mergedByIndex = new Map((merged.runMeta || []).map(meta => [meta.index, meta]));
        for (const runIdx of [0, 7, 15]) {
            const fullRows = fullByIndex.get(runIdx)?.logDataRows || [];
            const mergedRows = mergedByIndex.get(runIdx)?.logDataRows || [];
            assert(fullRows.length > 0, `Continuous CAPE MC should log run ${runIdx}`);
            assertEqual(mergedRows.length, fullRows.length, `Continuous CAPE MC log row count mismatch for run ${runIdx}`);
            for (let rowIdx = 0; rowIdx < fullRows.length; rowIdx++) {
                assertEqual(fullRows[rowIdx]?.vpw?.returnPolicy, 'cape_continuous', `Continuous CAPE MC full policy mismatch for run ${runIdx}`);
                assertEqual(mergedRows[rowIdx]?.vpw?.returnPolicy, 'cape_continuous', `Continuous CAPE MC merged policy mismatch for run ${runIdx}`);
                assertEqual(
                    JSON.stringify(mergedRows[rowIdx].vpw || null),
                    JSON.stringify(fullRows[rowIdx].vpw || null),
                    `Continuous CAPE MC VPW payload mismatch for run ${runIdx}, row ${rowIdx}`
                );
            }
        }

        const sweepConfig = {
            anzahlRuns: 10,
            maxDauer: 10,
            blockSize: 3,
            baseSeed: 4040,
            methode: 'block',
            rngMode: 'per-run-seed'
        };
        const paramCombinations = [
            { runwayMin: 18, runwayTarget: 30, targetEq: 55, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, horizonYears: 25 },
            { runwayMin: 24, runwayTarget: 36, targetEq: 65, rebalBand: 6, maxSkimPct: 12, maxBearRefillPct: 6, goldTargetPct: 0, horizonYears: 30 },
            { runwayMin: 30, runwayTarget: 42, targetEq: 75, rebalBand: 7, maxSkimPct: 14, maxBearRefillPct: 7, goldTargetPct: 5, horizonYears: 35 }
        ];

        const fullSweep = runSweepChunk({
            baseInputs: continuousInputs,
            paramCombinations,
            comboRange: { start: 0, count: paramCombinations.length },
            sweepConfig,
            engine: EngineAPI
        });
        const sweepA = runSweepChunk({
            baseInputs: continuousInputs,
            paramCombinations,
            comboRange: { start: 0, count: 1 },
            sweepConfig,
            engine: EngineAPI
        });
        const sweepB = runSweepChunk({
            baseInputs: continuousInputs,
            paramCombinations,
            comboRange: { start: 1, count: 2 },
            sweepConfig,
            engine: EngineAPI
        });

        assertSweepResultsEqual(fullSweep.results, [...sweepA.results, ...sweepB.results], 'Continuous CAPE Sweep');
        assertEqual(fullSweep.p2VarianceCount, sweepA.p2VarianceCount + sweepB.p2VarianceCount, 'Continuous CAPE Sweep p2VarianceCount mismatch');
    } finally {
        CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY = previousPolicy;
    }

    console.log('✅ Continuous CAPE runner parity passed');
} catch (e) {
    console.error('❌ Continuous CAPE runner parity failed', e);
    throw e;
}

// Test 7: Longevity horizon fields stay deterministic across MC chunking
try {
    const longevityInputs = {
        ...baseInputs,
        startAlter: 58,
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        capeRatio: 24,
        marketCapeRatio: 24,
        longevityMode: 'quantile_shift',
        longevityQuantileShift: 0.05
    };
    const monteCarloParams = {
        anzahl: 14,
        maxDauer: 6,
        blockSize: 3,
        seed: 60616,
        methode: 'block',
        rngMode: 'per-run-seed'
    };
    const logIndices = [0, 6, 13];

    const fullChunk = await runMonteCarloChunk({
        inputs: longevityInputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling: false,
        runRange: { start: 0, count: monteCarloParams.anzahl },
        logIndices,
        engine: EngineAPI
    });

    const splitRanges = [
        { start: 0, count: 5 },
        { start: 5, count: 4 },
        { start: 9, count: 5 }
    ];
    const merged = createMergedMonteCarloState(monteCarloParams.anzahl);
    for (const range of splitRanges) {
        const chunk = await runMonteCarloChunk({
            inputs: longevityInputs,
            monteCarloParams,
            widowOptions,
            useCapeSampling: false,
            runRange: range,
            logIndices,
            engine: EngineAPI
        });
        mergeMonteCarloChunk(merged, chunk, range.start);
    }

    assertMonteCarloTotalsEqual(fullChunk.totals, merged.totals, 'Longevity MC');
    assertMonteCarloListShapesEqual(fullChunk.lists, merged.lists, 'Longevity MC');
    const fullByIndex = new Map((fullChunk.runMeta || []).map(meta => [meta.index, meta]));
    const mergedByIndex = new Map((merged.runMeta || []).map(meta => [meta.index, meta]));
    for (const runIdx of logIndices) {
        const fullRows = fullByIndex.get(runIdx)?.logDataRows || [];
        const mergedRows = mergedByIndex.get(runIdx)?.logDataRows || [];
        assert(fullRows.length > 0, `Longevity MC should log run ${runIdx}`);
        assertEqual(mergedRows.length, fullRows.length, `Longevity MC log row count mismatch for run ${runIdx}`);
        for (let rowIdx = 0; rowIdx < fullRows.length; rowIdx++) {
            assertEqual(fullRows[rowIdx]?.vpw?.longevityMode, 'quantile_shift', `Longevity MC full mode mismatch for run ${runIdx}`);
            assertEqual(mergedRows[rowIdx]?.vpw?.longevityMode, 'quantile_shift', `Longevity MC merged mode mismatch for run ${runIdx}`);
            assertEqual(
                JSON.stringify(mergedRows[rowIdx].vpw || null),
                JSON.stringify(fullRows[rowIdx].vpw || null),
                `Longevity MC VPW payload mismatch for run ${runIdx}, row ${rowIdx}`
            );
        }
    }

    console.log('✅ Longevity runner parity passed');
} catch (e) {
    console.error('❌ Longevity runner parity failed', e);
    throw e;
}

console.log('--- Worker Parity Tests Completed ---');
