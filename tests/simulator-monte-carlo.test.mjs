import { EngineAPI } from '../engine/index.mjs';
import { mergeHeatmap, appendArray } from '../simulator-monte-carlo.js';
import { MC_HEATMAP_BINS, pickWorstRun, createMonteCarloBuffers, buildMonteCarloAggregates, runMonteCarloChunk } from '../monte-carlo-runner.js';

console.log('--- Simulator Monte Carlo Tests ---');

function sumHeatmap(heatmap) {
    let total = 0;
    for (const row of heatmap) {
        for (const val of row) total += val;
    }
    return total;
}

function buildBasicInputs() {
    return {
        startAlter: 65,
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
        kirchensteuerSatz: 0,
        startSPB: 1000,
        pflegefallLogikAktivieren: false,
        geschlecht: 'm',
        partner: { aktiv: false },
        stressPreset: 'NONE'
    };
}

// --- TEST 1: Heatmap merge (basic) ---
{
    const target = [new Uint32Array([1, 2]), new Uint32Array([3, 4])];
    const source = [new Uint32Array([10, 20]), new Uint32Array([30, 40])];
    mergeHeatmap(target, source);
    // Summe je Zelle muss korrekt akkumulieren.
    assert(target[0][0] === 11 && target[0][1] === 22, 'Heatmap merge should sum row 0');
    assert(target[1][0] === 33 && target[1][1] === 44, 'Heatmap merge should sum row 1');
}

// --- TEST 2: Heatmap merge (empty source) ---
{
    const target = [new Uint32Array([1, 2]), new Uint32Array([3, 4])];
    mergeHeatmap(target, []);
    assert(target[0][0] === 1 && target[1][1] === 4, 'Empty source should not change target');
}

// --- TEST 3: Heatmap merge (short source) ---
{
    const target = [new Uint32Array([1, 2]), new Uint32Array([3, 4])];
    const source = [new Uint32Array([5, 6])];
    mergeHeatmap(target, source);
    assert(target[0][0] === 6 && target[0][1] === 8, 'Short source should merge available rows');
    assert(target[1][0] === 3 && target[1][1] === 4, 'Missing rows should stay unchanged');
}

// --- TEST 4: appendArray helper ---
{
    const target = [1];
    appendArray(target, [2, 3]);
    assertEqual(target.length, 3, 'appendArray should add elements');
    assertEqual(target[2], 3, 'appendArray should preserve order');
}

// --- TEST 5: pickWorstRun logic and null handling ---
{
    const a = { finalVermoegen: 100, comboIdx: 2, runIdx: 5 };
    const b = { finalVermoegen: 90, comboIdx: 3, runIdx: 1 };
    const c = { finalVermoegen: 100, comboIdx: 1, runIdx: 9 };
    const d = { finalVermoegen: 100, comboIdx: 1, runIdx: 2 };
    assert(pickWorstRun(null, a) === a, 'Null current should return candidate');
    assert(pickWorstRun(a, null) === a, 'Null candidate should keep current');
    // Tie-Breaker: erst Endvermögen, dann comboIdx, dann runIdx.
    assert(pickWorstRun(a, b) === b, 'Lower finalVermoegen should win');
    assert(pickWorstRun(a, c) === c, 'Lower comboIdx should win on tie');
    assert(pickWorstRun(c, d) === d, 'Lower runIdx should win on full tie');
}

// --- TEST 6: Monte-Carlo chunk execution and buffer structure ---
{
    const inputs = buildBasicInputs();
    const monteCarloParams = {
        anzahl: 4,
        maxDauer: 2,
        blockSize: 1,
        seed: 42,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };
    const chunk = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 4 },
        engine: EngineAPI
    });

    // Struktur-Checks: Buffers, Heatmap, Bins, Totals vorhanden.
    assert(chunk.buffers.finalOutcomes.length === 4, 'Buffers should match run count');
    assert(chunk.heatmap.length === 10, 'Heatmap should have 10 rows');
    assertEqual(chunk.bins.length, MC_HEATMAP_BINS.length, 'Bins should match MC_HEATMAP_BINS');
    assert(chunk.totals.totalSimulatedYears >= 0, 'Totals should be present');
}

// --- TEST 7: Aggregates calculation ---
{
    const totalRuns = 3;
    const buffers = createMonteCarloBuffers(totalRuns);
    buffers.finalOutcomes.set([100, 200, 300]);
    buffers.taxOutcomes.set([10, 20, 30]);
    buffers.kpiLebensdauer.set([80, 82, 84]);
    buffers.kpiKuerzungsjahre.set([1, 2, 3]);
    buffers.kpiMaxKuerzung.set([5, 6, 7]);
    buffers.volatilities.set([10, 20, 30]);
    buffers.maxDrawdowns.set([0.1, 0.2, 0.3]);
    buffers.depotErschoepft.set([0, 1, 0]);
    buffers.alterBeiErschoepfung.set([255, 70, 255]);
    buffers.anteilJahreOhneFlex.set([0, 0.2, 0.4]);
    buffers.stress_maxDrawdowns.set([0.1, 0.2, 0.3]);
    buffers.stress_timeQuoteAbove45.set([0.01, 0.02, 0.03]);
    buffers.stress_cutYears.set([1, 2, 3]);
    buffers.stress_CaR_P10_Real.set([10, 20, 30]);
    buffers.stress_recoveryYears.set([1, 2, 3]);

    const heatmap = [new Uint32Array([1, 2])];
    const totals = {
        pflegeTriggeredCount: 0,
        totalSimulatedYears: 10,
        totalYearsQuoteAbove45: 2,
        shortfallWithCareCount: 0,
        shortfallNoCareProxyCount: 0,
        p2TriggeredCount: 0
    };
    const lists = {
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
    const allRealWithdrawalsSample = [100, 200];

    const aggregates = buildMonteCarloAggregates({
        inputs: { stressPreset: 'NONE' },
        totalRuns,
        buffers,
        heatmap,
        bins: MC_HEATMAP_BINS,
        totals,
        lists,
        allRealWithdrawalsSample
    });

    // Verifikation: zentrale Kennzahlen korrekt abgeleitet.
    assertClose(aggregates.finalOutcomes.p50, 200, 0.0001, 'Median end wealth should be 200');
    assertClose(aggregates.taxOutcomes.p50, 20, 0.0001, 'Median tax should be 20');
    assertClose(aggregates.depotErschoepfungsQuote, (1 / 3) * 100, 0.0001, 'Depletion rate should match');
    assertClose(aggregates.extraKPI.timeShareQuoteAbove45, 0.2, 0.0001, 'Time share above 4.5 should match');
}

// --- TEST 8: Chunk merge consistency (split vs full) ---
{
    const inputs = buildBasicInputs();
    const monteCarloParams = {
        anzahl: 6,
        maxDauer: 2,
        blockSize: 1,
        seed: 123,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };

    const fullChunk = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 6 },
        engine: EngineAPI
    });

    const chunkA = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 3 },
        engine: EngineAPI
    });

    const chunkB = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 3, count: 3 },
        engine: EngineAPI
    });

    const combinedBuffers = createMonteCarloBuffers(6);
    combinedBuffers.finalOutcomes.set(chunkA.buffers.finalOutcomes, 0);
    combinedBuffers.finalOutcomes.set(chunkB.buffers.finalOutcomes, 3);
    combinedBuffers.taxOutcomes.set(chunkA.buffers.taxOutcomes, 0);
    combinedBuffers.taxOutcomes.set(chunkB.buffers.taxOutcomes, 3);
    combinedBuffers.kpiLebensdauer.set(chunkA.buffers.kpiLebensdauer, 0);
    combinedBuffers.kpiLebensdauer.set(chunkB.buffers.kpiLebensdauer, 3);
    combinedBuffers.kpiKuerzungsjahre.set(chunkA.buffers.kpiKuerzungsjahre, 0);
    combinedBuffers.kpiKuerzungsjahre.set(chunkB.buffers.kpiKuerzungsjahre, 3);
    combinedBuffers.kpiMaxKuerzung.set(chunkA.buffers.kpiMaxKuerzung, 0);
    combinedBuffers.kpiMaxKuerzung.set(chunkB.buffers.kpiMaxKuerzung, 3);
    combinedBuffers.volatilities.set(chunkA.buffers.volatilities, 0);
    combinedBuffers.volatilities.set(chunkB.buffers.volatilities, 3);
    combinedBuffers.maxDrawdowns.set(chunkA.buffers.maxDrawdowns, 0);
    combinedBuffers.maxDrawdowns.set(chunkB.buffers.maxDrawdowns, 3);
    combinedBuffers.depotErschoepft.set(chunkA.buffers.depotErschoepft, 0);
    combinedBuffers.depotErschoepft.set(chunkB.buffers.depotErschoepft, 3);
    combinedBuffers.alterBeiErschoepfung.set(chunkA.buffers.alterBeiErschoepfung, 0);
    combinedBuffers.alterBeiErschoepfung.set(chunkB.buffers.alterBeiErschoepfung, 3);
    combinedBuffers.anteilJahreOhneFlex.set(chunkA.buffers.anteilJahreOhneFlex, 0);
    combinedBuffers.anteilJahreOhneFlex.set(chunkB.buffers.anteilJahreOhneFlex, 3);
    combinedBuffers.stress_maxDrawdowns.set(chunkA.buffers.stress_maxDrawdowns, 0);
    combinedBuffers.stress_maxDrawdowns.set(chunkB.buffers.stress_maxDrawdowns, 3);
    combinedBuffers.stress_timeQuoteAbove45.set(chunkA.buffers.stress_timeQuoteAbove45, 0);
    combinedBuffers.stress_timeQuoteAbove45.set(chunkB.buffers.stress_timeQuoteAbove45, 3);
    combinedBuffers.stress_cutYears.set(chunkA.buffers.stress_cutYears, 0);
    combinedBuffers.stress_cutYears.set(chunkB.buffers.stress_cutYears, 3);
    combinedBuffers.stress_CaR_P10_Real.set(chunkA.buffers.stress_CaR_P10_Real, 0);
    combinedBuffers.stress_CaR_P10_Real.set(chunkB.buffers.stress_CaR_P10_Real, 3);
    combinedBuffers.stress_recoveryYears.set(chunkA.buffers.stress_recoveryYears, 0);
    combinedBuffers.stress_recoveryYears.set(chunkB.buffers.stress_recoveryYears, 3);

    const combinedHeatmap = Array(10).fill(0).map(() => new Uint32Array(MC_HEATMAP_BINS.length - 1));
    mergeHeatmap(combinedHeatmap, chunkA.heatmap);
    mergeHeatmap(combinedHeatmap, chunkB.heatmap);

    const combinedTotals = {
        pflegeTriggeredCount: chunkA.totals.pflegeTriggeredCount + chunkB.totals.pflegeTriggeredCount,
        totalSimulatedYears: chunkA.totals.totalSimulatedYears + chunkB.totals.totalSimulatedYears,
        totalYearsQuoteAbove45: chunkA.totals.totalYearsQuoteAbove45 + chunkB.totals.totalYearsQuoteAbove45,
        shortfallWithCareCount: chunkA.totals.shortfallWithCareCount + chunkB.totals.shortfallWithCareCount,
        shortfallNoCareProxyCount: chunkA.totals.shortfallNoCareProxyCount + chunkB.totals.shortfallNoCareProxyCount,
        p2TriggeredCount: chunkA.totals.p2TriggeredCount + chunkB.totals.p2TriggeredCount
    };

    const combinedLists = {
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
    appendArray(combinedLists.entryAges, chunkA.lists.entryAges);
    appendArray(combinedLists.entryAges, chunkB.lists.entryAges);
    appendArray(combinedLists.entryAgesP2, chunkA.lists.entryAgesP2);
    appendArray(combinedLists.entryAgesP2, chunkB.lists.entryAgesP2);
    appendArray(combinedLists.careDepotCosts, chunkA.lists.careDepotCosts);
    appendArray(combinedLists.careDepotCosts, chunkB.lists.careDepotCosts);
    appendArray(combinedLists.endWealthWithCareList, chunkA.lists.endWealthWithCareList);
    appendArray(combinedLists.endWealthWithCareList, chunkB.lists.endWealthWithCareList);
    appendArray(combinedLists.endWealthNoCareList, chunkA.lists.endWealthNoCareList);
    appendArray(combinedLists.endWealthNoCareList, chunkB.lists.endWealthNoCareList);
    appendArray(combinedLists.p1CareYearsTriggered, chunkA.lists.p1CareYearsTriggered);
    appendArray(combinedLists.p1CareYearsTriggered, chunkB.lists.p1CareYearsTriggered);
    appendArray(combinedLists.p2CareYearsTriggered, chunkA.lists.p2CareYearsTriggered);
    appendArray(combinedLists.p2CareYearsTriggered, chunkB.lists.p2CareYearsTriggered);
    appendArray(combinedLists.bothCareYearsOverlapTriggered, chunkA.lists.bothCareYearsOverlapTriggered);
    appendArray(combinedLists.bothCareYearsOverlapTriggered, chunkB.lists.bothCareYearsOverlapTriggered);
    appendArray(combinedLists.maxAnnualCareSpendTriggered, chunkA.lists.maxAnnualCareSpendTriggered);
    appendArray(combinedLists.maxAnnualCareSpendTriggered, chunkB.lists.maxAnnualCareSpendTriggered);

    const combinedWithdrawals = [];
    appendArray(combinedWithdrawals, chunkA.allRealWithdrawalsSample);
    appendArray(combinedWithdrawals, chunkB.allRealWithdrawalsSample);

    const aggregatedFull = buildMonteCarloAggregates({
        inputs,
        totalRuns: 6,
        buffers: fullChunk.buffers,
        heatmap: fullChunk.heatmap,
        bins: fullChunk.bins,
        totals: fullChunk.totals,
        lists: fullChunk.lists,
        allRealWithdrawalsSample: fullChunk.allRealWithdrawalsSample
    });

    const aggregatedCombined = buildMonteCarloAggregates({
        inputs,
        totalRuns: 6,
        buffers: combinedBuffers,
        heatmap: combinedHeatmap,
        bins: fullChunk.bins,
        totals: combinedTotals,
        lists: combinedLists,
        allRealWithdrawalsSample: combinedWithdrawals
    });

    assertClose(aggregatedCombined.finalOutcomes.p50, aggregatedFull.finalOutcomes.p50, 0.0001, 'Split vs full p50 should match');
    assertClose(aggregatedCombined.depotErschoepfungsQuote, aggregatedFull.depotErschoepfungsQuote, 0.0001, 'Split vs full depletion should match');
    assertClose(sumHeatmap(combinedHeatmap), sumHeatmap(fullChunk.heatmap), 0.0001, 'Split vs full heatmap sum should match');
}

const emptyTotals = {
    pflegeTriggeredCount: 0,
    totalSimulatedYears: 0,
    totalYearsQuoteAbove45: 0,
    shortfallWithCareCount: 0,
    shortfallNoCareProxyCount: 0,
    p2TriggeredCount: 0
};
const emptyLists = {
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

// --- TEST 9: Determinism (same seed -> same results) ---
{
    const inputs = buildBasicInputs();
    const monteCarloParams = {
        anzahl: 5,
        maxDauer: 2,
        blockSize: 1,
        seed: 777,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };
    const runA = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 5 },
        engine: EngineAPI
    });
    const runB = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 5 },
        engine: EngineAPI
    });

    assertEqual(JSON.stringify(Array.from(runA.buffers.finalOutcomes)), JSON.stringify(Array.from(runB.buffers.finalOutcomes)), 'Determinism: finalOutcomes should match');
    assertClose(sumHeatmap(runA.heatmap), sumHeatmap(runB.heatmap), 0.0001, 'Determinism: heatmap sum should match');
}

// --- TEST 10: Ruin counting matches finalOutcomes <= 0 ---
{
    const buffers = createMonteCarloBuffers(4);
    buffers.finalOutcomes.set([100, 0, -1, 50]);
    buffers.depotErschoepft.set([0, 1, 1, 0]);
    const ruinCount = Array.from(buffers.finalOutcomes).filter(v => v <= 0).length;
    const depletedCount = Array.from(buffers.depotErschoepft).reduce((acc, v) => acc + v, 0);
    assertEqual(depletedCount, ruinCount, 'Ruin count should match finalOutcomes <= 0');
}

// --- TEST 11: Percentiles order (P10 < P50 < P90) ---
{
    const buffers = createMonteCarloBuffers(10);
    buffers.finalOutcomes.set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const aggregates = buildMonteCarloAggregates({
        inputs: { stressPreset: 'NONE' },
        totalRuns: 10,
        buffers,
        heatmap: [new Uint32Array([0])],
        bins: MC_HEATMAP_BINS,
        totals: emptyTotals,
        lists: emptyLists,
        allRealWithdrawalsSample: [0]
    });
    assert(aggregates.finalOutcomes.p10 < aggregates.finalOutcomes.p50, 'P10 should be < P50');
    assert(aggregates.finalOutcomes.p50 < aggregates.finalOutcomes.p90, 'P50 should be < P90');
}

// --- TEST 12: aggregateMCResults mean (kpiLebensdauer) ---
{
    const buffers = createMonteCarloBuffers(3);
    buffers.finalOutcomes.set([100, 200, 300]);
    buffers.kpiLebensdauer.set([80, 82, 84]);
    const aggregates = buildMonteCarloAggregates({
        inputs: { stressPreset: 'NONE' },
        totalRuns: 3,
        buffers,
        heatmap: [new Uint32Array([0])],
        bins: MC_HEATMAP_BINS,
        totals: emptyTotals,
        lists: emptyLists,
        allRealWithdrawalsSample: [0]
    });
    assertClose(aggregates.kpiLebensdauer.mean, 82, 0.0001, 'kpiLebensdauer mean should be correct');
}

// --- TEST 13: Success rate matches (numRuns - ruinCount) / numRuns ---
{
    const buffers = createMonteCarloBuffers(4);
    buffers.finalOutcomes.set([100, -1, 0, 50]);
    buffers.depotErschoepft.set([0, 1, 1, 0]);
    const aggregates = buildMonteCarloAggregates({
        inputs: { stressPreset: 'NONE' },
        totalRuns: 4,
        buffers,
        heatmap: [new Uint32Array([0])],
        bins: MC_HEATMAP_BINS,
        totals: emptyTotals,
        lists: emptyLists,
        allRealWithdrawalsSample: [0]
    });
    const ruinCount = 2;
    const expectedSuccessRate = ((4 - ruinCount) / 4) * 100;
    const actualSuccessRate = 100 - aggregates.depotErschoepfungsQuote;
    assertClose(actualSuccessRate, expectedSuccessRate, 0.0001, 'Success rate should match depletion rate');
}

console.log('--- Simulator Monte Carlo Tests Completed ---');
