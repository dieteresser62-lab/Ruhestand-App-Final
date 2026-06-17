import { EngineAPI } from '../engine/index.mjs';
import { mergeHeatmap, appendArray } from '../app/simulator/simulator-monte-carlo.js';
import { MC_HEATMAP_BINS, pickWorstRun, createMonteCarloBuffers, buildMonteCarloAggregates, runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';
import { createMonteCarloRunContext } from '../app/simulator/mc-run-context.js';
import {
    createMonteCarloStressTracker,
    recordMonteCarloStressYear,
    writeMonteCarloStressMetrics
} from '../app/simulator/mc-stress-tracker.js';
import {
    buildMonteCarloDeathLogRow,
    buildMonteCarloRuinLogRow,
    buildMonteCarloYearLogRow
} from '../app/simulator/mc-log-builder.js';
import {
    createMonteCarloRunMetrics,
    finalizeMonteCarloRunMetrics,
    recordMonteCarloRunOutcome
} from '../app/simulator/mc-run-metrics.js';

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
        capeRatio: 20,
        kirchensteuerSatz: 0,
        startSPB: 1000,
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0,
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

// --- TEST 6a: Monte-Carlo run context creation ---
{
    const inputs = buildBasicInputs();
    const monteCarloParams = {
        anzahl: 10,
        maxDauer: 2,
        blockSize: 1,
        seed: 42,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };
    const context = createMonteCarloRunContext({
        inputs,
        monteCarloParams,
        runRange: { start: 2, count: 4 },
        logIndices: [2, 4],
        buildYearSamplingConfig: () => ({ marker: 'sampling' }),
        buildStartYearCdf: () => null,
        resolveMinStartYearIndex: () => 4
    });

    assertEqual(context.runStart, 2, 'Context should preserve run start');
    assertEqual(context.runCount, 4, 'Context should preserve run count');
    assertEqual(context.buffers.finalOutcomes.length, 4, 'Context buffers should match run count');
    assert(context.logIndexSet.has(2) && context.logIndexSet.has(4), 'Context should build log index set');
    assertEqual(context.yearSamplingConfig.marker, 'sampling', 'Context should use injected sampling config');
    assertEqual(context.minStartYearIndex, 4, 'Context should resolve min start index');
}

// --- TEST 6b: Monte-Carlo run context rejects legacy chunking ---
{
    let didThrow = false;
    try {
        createMonteCarloRunContext({
            inputs: buildBasicInputs(),
            monteCarloParams: {
                anzahl: 10,
                maxDauer: 2,
                blockSize: 1,
                seed: 42,
                methode: 'block',
                rngMode: 'legacy-stream',
                startYearMode: 'UNIFORM'
            },
            runRange: { start: 1, count: 4 },
            buildYearSamplingConfig: () => null,
            buildStartYearCdf: () => null,
            resolveMinStartYearIndex: () => 4
        });
    } catch (error) {
        didThrow = true;
    }
    assert(didThrow, 'Legacy-stream mode should reject non-zero chunk starts');
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
        totalYearsSafetyStage1plus: 3,
        totalYearsSafetyStage2: 1,
        shortfallWithCareCount: 0,
        shortfallNoCareProxyCount: 0,
        p2TriggeredCount: 0,
        runsSafetyStage1Triggered: 1,
        runsSafetyStage2Triggered: 1,
        healthBucketEnabledCount: 2,
        healthBucketUsedCount: 1,
        healthBucketDepletedCount: 1,
        totalHealthBucketUsed: 5000
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
        maxAnnualCareSpendTriggered: [],
        healthBucketUsedAmounts: [5000],
        healthBucketEndAmounts: [0, 20000],
        healthBucketCoveragePct: [0, 80],
        healthBucketTargetGaps: [30000, 10000],
        healthBucketInterestAmounts: [250]
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
    assertClose(aggregates.extraKPI.dynamicFlexSafety.yearShareStage1plus, 0.3, 0.0001, 'Safety stage1+ year share should match');
    assertClose(aggregates.extraKPI.dynamicFlexSafety.yearShareStage2, 0.1, 0.0001, 'Safety stage2 year share should match');
    assertClose(aggregates.extraKPI.healthBucket.usedRatePct, (1 / 3) * 100, 0.0001, 'Health bucket used rate should match');
    assertClose(aggregates.extraKPI.healthBucket.depletedRatePct, 50, 0.0001, 'Health bucket depletion rate should match');
    assertClose(aggregates.extraKPI.healthBucket.totalUsed, 5000, 0.0001, 'Health bucket total used should match');
    assertClose(aggregates.extraKPI.healthBucket.coverageMedianPct, 40, 0.0001, 'Health bucket coverage median should match');
}

// --- TEST 7b: Monte-Carlo stress tracker ---
{
    const tracker = createMonteCarloStressTracker({ preset: { years: 2 } }, 1000);
    recordMonteCarloStressYear(tracker, 0, 900, {
        entnahmequote: 0.05,
        entscheidung: { kuerzungProzent: 12 },
        jahresentnahme_real: 100
    });
    recordMonteCarloStressYear(tracker, 1, 800, {
        entnahmequote: 0.03,
        entscheidung: { kuerzungProzent: 0 },
        jahresentnahme_real: 200
    });
    recordMonteCarloStressYear(tracker, 2, 780, {
        entnahmequote: 0.034,
        entscheidung: { kuerzungProzent: 0 },
        jahresentnahme_real: 150
    });

    const maxDD = new Float64Array(1);
    const quoteAbove45 = new Float64Array(1);
    const cutYears = new Uint16Array(1);
    const car = new Float64Array(1);
    const recoveryYears = new Uint16Array(1);
    writeMonteCarloStressMetrics(tracker, 0, maxDD, quoteAbove45, cutYears, car, recoveryYears);

    assert(maxDD[0] > 0, 'Stress tracker should write max drawdown');
    assertClose(quoteAbove45[0], 50, 1e-9, 'Stress tracker should write quote-above-4.5 share');
    assert(cutYears[0] === 1, 'Stress tracker should count cut years');
    assert(car[0] > 0, 'Stress tracker should write real-withdrawal CaR');
    assert(recoveryYears[0] === 1, 'Stress tracker should write recovery years');
}

// --- TEST 7c: Monte-Carlo log builders ---
{
    const lifeLogContext = {
        hasPartner: true,
        p1Alive: true,
        p2Alive: false,
        careMetaP1: {
            active: true,
            grade: 2,
            gradeLabel: 'PG2',
            zusatzFloorZiel: 1200,
            zusatzFloorDelta: 300,
            flexFactor: 0.7,
            kumulierteKosten: 500,
            log_floor_anchor: 100,
            log_maxfloor_anchor: 200,
            log_cap_zusatz: 300,
            log_delta_flex: 0.1
        },
        careMetaP2: null,
        p1ActiveThisYear: true,
        p2ActiveThisYear: false
    };
    const ruinRow = buildMonteCarloRuinLogRow({
        simulationsJahr: 2,
        yearData: { jahr: 2001, inflation: 0.02 },
        inputs: { rente1: 1000, rente2: 200 },
        lifeLogContext
    });
    const normalRow = buildMonteCarloYearLogRow({
        simulationsJahr: 0,
        yearData: { jahr: 2000, inflation: 0.01 },
        result: {
            logData: {
                aktionUndGrund: 'OK',
                taxSavedByLossCarry: 12,
                entnahme_plan: 100,
                entnahme_effektiv: 90,
                liq_before_payout: 500,
                liq_after_payout: 410
            },
            ui: { vpw: { horizonYears: 30 } }
        },
        lifeLogContext
    });
    const deathRow = buildMonteCarloDeathLogRow({
        deathLogContext: { jahr: 4, histJahr: 2003, inflation: 0.03 },
        currentRunLogLength: 3,
        portfolioSnapshot: { depotTranchesAktien: [], depotTranchesGold: [], liquiditaet: 42 },
        inputs: { rente1: 1000, rente2: 200 },
        lifeLogContext
    });

    assert(ruinRow.aktionUndGrund === '>>> RUIN <<<', 'Ruin log builder should set ruin marker');
    assert(normalRow.taxSavedByLossCarry === 12, 'Year log builder should preserve result log fields');
    assert(normalRow.entnahme_plan === 100 && normalRow.liq_after_payout === 410, 'Year log builder should preserve payout transparency fields');
    assert(normalRow.CareP1_Active === 1 && normalRow.CareP2_Active === 0, 'Year log builder should write care activity fields');
    assert(deathRow.aktionUndGrund.includes('Alle Personen verstorben'), 'Death log builder should set death marker');
    assert(deathRow.Person2Alive === 0, 'Death log builder should preserve partner alive flag');
}

// --- TEST 7d: Monte-Carlo run metrics ---
{
    const metrics = createMonteCarloRunMetrics(1);
    const buffers = createMonteCarloBuffers(1);
    recordMonteCarloRunOutcome(metrics, {
        i: 0,
        runIdx: 7,
        buffers,
        simState: { portfolio: { liquiditaet: 1000 } },
        failed: false,
        lebensdauer: 3,
        jahreOhneFlex: 1,
        kpiJahreMitKuerzungDieserLauf: 2,
        kpiMaxKuerzungDieserLauf: 12,
        totalTaxesThisRun: 99,
        totalTaxSavedByLossCarryThisRun: 11,
        depotOnlyStart: 1000,
        depotOnlyEnd: 800,
        ruinOrDepleted: false,
        careEverActive: true,
        triggeredAge: 70,
        triggeredAgeP2: 72,
        p1CareYears: 2,
        p2CareYears: 1,
        bothCareYears: 1,
        hasPartner: true,
        careMetaP1: { zusatzFloorZiel: 1000 },
        careMetaP2: { zusatzFloorZiel: 500 },
        runSafetyStage1Ever: true,
        runSafetyStage2Ever: false,
        healthBucketEnabledThisRun: true,
        healthBucketUsedThisRun: 12000,
        healthBucketEndThisRun: 8000,
        healthBucketCoveragePctThisRun: 40,
        healthBucketTargetGapThisRun: 12000,
        healthBucketInterestThisRun: 80,
        currentRunLog: [{ jahr: 1 }]
    });
    const finalized = finalizeMonteCarloRunMetrics(metrics);

    assertEqual(buffers.kpiLebensdauer[0], 3, 'Run metrics should write lifespan buffer');
    assertEqual(buffers.kpiKuerzungsjahre[0], 2, 'Run metrics should write cut-years buffer');
    assertEqual(finalized.totals.pflegeTriggeredCount, 1, 'Run metrics should count care-triggered runs');
    assertEqual(finalized.totals.runsSafetyStage1Triggered, 1, 'Run metrics should count safety stage 1 runs');
    assertEqual(finalized.lists.entryAges[0], 70, 'Run metrics should store P1 care entry age');
    assertEqual(finalized.lists.entryAgesP2[0], 72, 'Run metrics should store P2 care entry age');
    assertEqual(finalized.totals.healthBucketUsedCount, 1, 'Run metrics should count health bucket usage');
    assertEqual(finalized.lists.healthBucketUsedAmounts[0], 12000, 'Run metrics should store health bucket usage');
    assertEqual(finalized.runMeta[0].healthBucketEnd, 8000, 'Run metrics should write health bucket meta');
    assertEqual(finalized.runMeta[0].totalCareYears, 3, 'Run metrics should write runMeta care years');
    assertEqual(finalized.worstRun.runIdx, 7, 'Run metrics should update worst run');
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
        totalYearsSafetyStage1plus: (chunkA.totals.totalYearsSafetyStage1plus || 0) + (chunkB.totals.totalYearsSafetyStage1plus || 0),
        totalYearsSafetyStage2: (chunkA.totals.totalYearsSafetyStage2 || 0) + (chunkB.totals.totalYearsSafetyStage2 || 0),
        shortfallWithCareCount: chunkA.totals.shortfallWithCareCount + chunkB.totals.shortfallWithCareCount,
        shortfallNoCareProxyCount: chunkA.totals.shortfallNoCareProxyCount + chunkB.totals.shortfallNoCareProxyCount,
        p2TriggeredCount: chunkA.totals.p2TriggeredCount + chunkB.totals.p2TriggeredCount,
        runsSafetyStage1Triggered: (chunkA.totals.runsSafetyStage1Triggered || 0) + (chunkB.totals.runsSafetyStage1Triggered || 0),
        runsSafetyStage2Triggered: (chunkA.totals.runsSafetyStage2Triggered || 0) + (chunkB.totals.runsSafetyStage2Triggered || 0),
        totalTaxSavedByLossCarry: (chunkA.totals.totalTaxSavedByLossCarry || 0) + (chunkB.totals.totalTaxSavedByLossCarry || 0)
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
    totalYearsSafetyStage1plus: 0,
    totalYearsSafetyStage2: 0,
    shortfallWithCareCount: 0,
    shortfallNoCareProxyCount: 0,
    p2TriggeredCount: 0,
    runsSafetyStage1Triggered: 0,
    runsSafetyStage2Triggered: 0,
    totalTaxSavedByLossCarry: 0
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

// --- TEST 9a: Stationary Bootstrap serial runner produces deterministic logs ---
{
    const inputs = buildBasicInputs();
    const monteCarloParams = {
        anzahl: 2,
        maxDauer: 6,
        blockSize: 3,
        seed: 60616,
        methode: 'stationary',
        rngMode: 'per-run-seed',
        startYearMode: 'FILTER',
        startYearFilter: 1980
    };
    const runA = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 2 },
        logIndices: [0, 1],
        engine: EngineAPI
    });
    const runB = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 2 },
        logIndices: [0, 1],
        engine: EngineAPI
    });

    const histYearsA = (runA.runMeta?.[0]?.logDataRows || []).map(row => row.histJahr);
    const histYearsB = (runB.runMeta?.[0]?.logDataRows || []).map(row => row.histJahr);
    assert(histYearsA.length >= 4, 'Stationary runner should produce logged historical years');
    assertEqual(JSON.stringify(histYearsA), JSON.stringify(histYearsB), 'Stationary runner should be deterministic for fixed seed');
    assert(histYearsA.every(year => Number(year) >= 1980), 'Stationary FILTER starts and continuations should stay in or after the filtered window for this short run');
}

// --- TEST 9b: Stationary Bootstrap serial full vs split chunks match ---
{
    const inputs = buildBasicInputs();
    const monteCarloParams = {
        anzahl: 6,
        maxDauer: 5,
        blockSize: 2,
        seed: 7007,
        methode: 'stationary',
        rngMode: 'per-run-seed',
        startYearMode: 'RECENCY',
        startYearHalfLife: 15
    };

    const runChunk = (start, count) => runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start, count },
        engine: EngineAPI
    });

    const full = await runChunk(0, 6);
    const splitA = await runChunk(0, 3);
    const splitB = await runChunk(3, 3);

    const combinedFinal = Array.from(splitA.buffers.finalOutcomes).concat(Array.from(splitB.buffers.finalOutcomes));
    const combinedTax = Array.from(splitA.buffers.taxOutcomes).concat(Array.from(splitB.buffers.taxOutcomes));
    assertEqual(JSON.stringify(combinedFinal), JSON.stringify(Array.from(full.buffers.finalOutcomes)), 'Stationary split vs full final outcomes should match');
    assertEqual(JSON.stringify(combinedTax), JSON.stringify(Array.from(full.buffers.taxOutcomes)), 'Stationary split vs full tax outcomes should match');
    assertClose(sumHeatmap(splitA.heatmap) + sumHeatmap(splitB.heatmap), sumHeatmap(full.heatmap), 0.0001, 'Stationary split vs full heatmap sum should match');
}

// --- TEST 9c: Stationary Bootstrap preserves conditional stress bootstrap priority ---
{
    const inputs = {
        ...buildBasicInputs(),
        stressPreset: 'GREAT_DEPRESSION_29_33'
    };
    const monteCarloParams = {
        anzahl: 1,
        maxDauer: 5,
        blockSize: 3,
        seed: 2929,
        methode: 'stationary',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };
    const chunk = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 1 },
        logIndices: [0],
        engine: EngineAPI
    });

    const histYears = (chunk.runMeta?.[0]?.logDataRows || []).map(row => Number(row.histJahr));
    assert(histYears.length >= 5, 'Stationary stress run should produce the full stress-window log');
    assert(histYears.slice(0, 5).every(year => year >= 1929 && year <= 1933), 'Conditional stress bootstrap should take priority during the stress window');
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

// --- TEST 14: Dynamic Flex horizon recomputation in serial MC ---
{
    const inputs = {
        ...buildBasicInputs(),
        startAlter: 50,
        dynamicFlex: true,
        horizonMethod: 'mean',
        horizonYears: 35,
        marketCapeRatio: 30,
        capeRatio: 30
    };
    const monteCarloParams = {
        anzahl: 1,
        maxDauer: 4,
        blockSize: 1,
        seed: 2026,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };
    const chunk = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 1 },
        logIndices: [0],
        engine: EngineAPI
    });

    const run = chunk.runMeta?.[0];
    const rows = run?.logDataRows || [];
    assert(rows.length >= 3, 'Dynamic flex MC run should produce at least three log rows');
    const horizons = rows
        .map(row => Number(row?.vpw?.horizonYears))
        .filter(Number.isFinite);
    assert(horizons.length >= 3, 'Dynamic flex MC rows should include VPW horizons');
    assert(horizons[1] <= horizons[0], 'MC horizon should not increase year-over-year (y1->y2)');
    assert(horizons[2] <= horizons[1], 'MC horizon should not increase year-over-year (y2->y3)');
    const payoutRows = rows.filter(row => Number.isFinite(Number(row?.entnahme_plan)));
    assert(payoutRows.length >= 3, 'Dynamic flex MC rows should expose payout transparency fields');
    for (const row of payoutRows.slice(0, 3)) {
        assert(Number.isFinite(Number(row.entnahme_effektiv)), 'Payout row should expose effective withdrawal');
        assert(Number.isFinite(Number(row.liq_before_payout)), 'Payout row should expose liquidity before payout');
        assert(Number.isFinite(Number(row.liq_after_payout)), 'Payout row should expose liquidity after payout');
        assert(Number.isFinite(Number(row.portfolio_total_end)), 'Payout row should expose end portfolio total');
    }
}

// --- TEST 15: Serial MC forwards minimumFlexAnnual and affects withdrawals ---
{
    const baseInputs = {
        ...buildBasicInputs(),
        startVermoegen: 500000,
        depotwertAlt: 480000,
        einstandAlt: 400000,
        tagesgeld: 20000,
        startFlexBedarf: 12000,
        flexBudgetAnnual: 0,
        dynamicFlex: true,
        horizonYears: 10,
        marketCapeRatio: 35,
        capeRatio: 35
    };
    const monteCarloParams = {
        anzahl: 1,
        maxDauer: 6,
        blockSize: 1,
        seed: 2005,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };
    const runChunk = (minimumFlexAnnual) => runMonteCarloChunk({
        inputs: { ...baseInputs, minimumFlexAnnual },
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 1 },
        logIndices: [0],
        engine: EngineAPI
    });

    const withMinimumFlex = await runChunk(9000);
    const withoutMinimumFlex = await runChunk(0);
    const withRows = withMinimumFlex.runMeta?.[0]?.logDataRows || [];
    const withoutRows = withoutMinimumFlex.runMeta?.[0]?.logDataRows || [];
    const sumWithdrawals = (rows) => rows.reduce((sum, row) => sum + (Number(row?.entscheidung?.jahresEntnahme) || 0), 0);

    assert(withRows.length > 0 && withoutRows.length > 0, 'MC minimum-flex comparison should produce log rows');
    assert(sumWithdrawals(withRows) > sumWithdrawals(withoutRows), 'MC should withdraw more when minimum flex is set');
    assert(withRows.some(row => row?.minimumFlexStatus === 'applied'), 'MC log should expose applied minimum-flex status');
}

// --- TEST 16: taxSavedByLossCarry is deterministic with fixed seed ---
{
    const inputs = {
        ...buildBasicInputs(),
        startVermoegen: 450000,
        depotwertAlt: 450000,
        einstandAlt: 700000, // encourages realized losses in down years
        startSPB: 1000,
        kirchensteuerSatz: 0
    };
    const monteCarloParams = {
        anzahl: 4,
        maxDauer: 4,
        blockSize: 1,
        seed: 424242,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };
    const runA = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 4 },
        logIndices: [0, 1, 2, 3],
        engine: EngineAPI
    });
    const runB = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 4 },
        logIndices: [0, 1, 2, 3],
        engine: EngineAPI
    });

    const sumTaxSaved = (chunk) => (chunk.runMeta || []).reduce((sum, meta) => {
        const rows = Array.isArray(meta?.logDataRows) ? meta.logDataRows : [];
        return sum + rows.reduce((inner, row) => inner + (Number(row?.taxSavedByLossCarry) || 0), 0);
    }, 0);

    const sumA = sumTaxSaved(runA);
    const sumB = sumTaxSaved(runB);
    assertClose(sumA, sumB, 1e-9, 'taxSavedByLossCarry sum should be deterministic for fixed seed');

    const sampleRow = runA.runMeta?.[0]?.logDataRows?.find(r => r && typeof r === 'object');
    assert(sampleRow && Number.isFinite(Number(sampleRow.taxSavedByLossCarry)), 'Log rows should expose numeric taxSavedByLossCarry');
}

// --- TEST 17: Tail-risk overlay is applied and logged in serial MC ---
{
    const inputs = {
        ...buildBasicInputs(),
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 5,
        tailRiskReturnShockPct: -35,
        tailRiskInflationShockPct: 6,
        tailRiskDurationYears: 1,
        tailRiskCooldownYears: 0
    };
    const monteCarloParams = {
        anzahl: 1,
        maxDauer: 4,
        blockSize: 1,
        seed: 2,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };
    const chunk = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 1 },
        logIndices: [0],
        engine: EngineAPI
    });

    const rows = chunk.runMeta?.[0]?.logDataRows || [];
    const activeRows = rows.filter(row => row?.tailRiskActive === true);
    assert(rows.length >= 4, 'Tail-risk MC run should produce log rows');
    assertEqual(activeRows.length, 1, 'Seeded serial run should log exactly one active tail-risk year');
    assertEqual(activeRows[0].jahr, 3, 'Seeded tail-risk event should occur in the expected simulation year');
    assertEqual(activeRows[0].tailRiskEventType, 'crash_inflation_shock', 'Tail-risk log should expose event type');
    assertEqual(activeRows[0].tailRiskReturnShockPct, -35, 'Tail-risk log should expose return shock');
    assertEqual(activeRows[0].tailRiskInflationShockPct, 6, 'Tail-risk log should expose inflation shock');
    assert(Number.isFinite(Number(activeRows[0].tailRiskEffectiveReturnPct)), 'Tail-risk log should expose effective return');
    assert(Number.isFinite(Number(activeRows[0].tailRiskEffectiveInflationPct)), 'Tail-risk log should expose effective inflation');
    assert(rows.some(row => row.tailRiskActive === false), 'Inactive years should expose neutral tail-risk log fields');
}

// --- TEST 18: Tail-risk schedule is independent of serial chunk boundaries ---
{
    const inputs = {
        ...buildBasicInputs(),
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 5,
        tailRiskReturnShockPct: -35,
        tailRiskInflationShockPct: 6,
        tailRiskDurationYears: 1,
        tailRiskCooldownYears: 0
    };
    const monteCarloParams = {
        anzahl: 2,
        maxDauer: 4,
        blockSize: 1,
        seed: 7,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM'
    };
    const runChunk = (start, count) => runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start, count },
        logIndices: [0, 1],
        engine: EngineAPI
    });

    const full = await runChunk(0, 2);
    const splitA = await runChunk(0, 1);
    const splitB = await runChunk(1, 1);
    const fullByRun = new Map((full.runMeta || []).map(meta => [meta.index, meta]));
    const splitByRun = new Map([...splitA.runMeta, ...splitB.runMeta].map(meta => [meta.index, meta]));
    const tailShape = (meta) => (meta?.logDataRows || []).map(row => ({
        jahr: row.jahr,
        histJahr: row.histJahr,
        tailRiskActive: row.tailRiskActive,
        tailRiskApplied: row.tailRiskApplied,
        tailRiskSkippedReason: row.tailRiskSkippedReason,
        tailRiskEventId: row.tailRiskEventId,
        tailRiskEventYearOffset: row.tailRiskEventYearOffset,
        tailRiskEffectiveReturnPct: row.tailRiskEffectiveReturnPct,
        tailRiskEffectiveInflationPct: row.tailRiskEffectiveInflationPct
    }));

    for (const runIdx of [0, 1]) {
        assert(fullByRun.has(runIdx), `Full tail-risk run meta missing run ${runIdx}`);
        assert(splitByRun.has(runIdx), `Split tail-risk run meta missing run ${runIdx}`);
        assertEqual(
            JSON.stringify(tailShape(splitByRun.get(runIdx))),
            JSON.stringify(tailShape(fullByRun.get(runIdx))),
            `Tail-risk log shape should be chunk-independent for run ${runIdx}`
        );
    }
}

console.log('--- Simulator Monte Carlo Tests Completed ---');
