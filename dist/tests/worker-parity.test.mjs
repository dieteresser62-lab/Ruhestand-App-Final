import { EngineAPI } from '../engine/index.mjs';
import { prepareHistoricalDataOnce } from '../simulator-engine-helpers.js';
import { createMonteCarloBuffers, MC_HEATMAP_BINS, runMonteCarloChunk, buildMonteCarloAggregates } from '../monte-carlo-runner.js';
import { runSweepChunk } from '../sweep-runner.js';

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

function appendArray(target, source) {
    if (!source || source.length === 0) return;
    for (let i = 0; i < source.length; i++) {
        target.push(source[i]);
    }
}

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

console.log('--- Worker Parity Tests ---');

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
    const mergedHeatmap = Array(10).fill(0).map(() => new Uint32Array(MC_HEATMAP_BINS.length - 1));
    const mergedLists = {
        entryAges: [],
        entryAgesP2: [],
        careDepotCosts: [],
        endWealthWithCareList: [],
        endWealthNoCareList: [],
        p1CareYearsTriggered: [],
        p2CareYearsTriggered: [],
        bothCareYearsOverlapTriggered: [],
        maxAnnualCareSpendTriggered: []
    };
    const mergedTotals = {
        failCount: 0,
        pflegeTriggeredCount: 0,
        totalSimulatedYears: 0,
        totalYearsQuoteAbove45: 0,
        shortfallWithCareCount: 0,
        shortfallNoCareProxyCount: 0,
        p2TriggeredCount: 0
    };
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

        mergedTotals.failCount += chunk.totals.failCount;
        mergedTotals.pflegeTriggeredCount += chunk.totals.pflegeTriggeredCount;
        mergedTotals.totalSimulatedYears += chunk.totals.totalSimulatedYears;
        mergedTotals.totalYearsQuoteAbove45 += chunk.totals.totalYearsQuoteAbove45;
        mergedTotals.shortfallWithCareCount += chunk.totals.shortfallWithCareCount;
        mergedTotals.shortfallNoCareProxyCount += chunk.totals.shortfallNoCareProxyCount;
        mergedTotals.p2TriggeredCount += chunk.totals.p2TriggeredCount;

        appendArray(mergedLists.entryAges, chunk.lists.entryAges);
        appendArray(mergedLists.entryAgesP2, chunk.lists.entryAgesP2);
        appendArray(mergedLists.careDepotCosts, chunk.lists.careDepotCosts);
        appendArray(mergedLists.endWealthWithCareList, chunk.lists.endWealthWithCareList);
        appendArray(mergedLists.endWealthNoCareList, chunk.lists.endWealthNoCareList);
        appendArray(mergedLists.p1CareYearsTriggered, chunk.lists.p1CareYearsTriggered);
        appendArray(mergedLists.p2CareYearsTriggered, chunk.lists.p2CareYearsTriggered);
        appendArray(mergedLists.bothCareYearsOverlapTriggered, chunk.lists.bothCareYearsOverlapTriggered);
        appendArray(mergedLists.maxAnnualCareSpendTriggered, chunk.lists.maxAnnualCareSpendTriggered);
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

console.log('--- Worker Parity Tests Completed ---');
