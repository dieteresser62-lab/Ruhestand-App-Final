import {
    MONTE_CARLO_CHUNK_RESULT_VERSION,
    MONTE_CARLO_COUNTER_FIELDS,
    MONTE_CARLO_FLOAT_AGGREGATE_FIELDS,
    MONTE_CARLO_LIST_FIELDS,
    MONTE_CARLO_MISSINGNESS_CODE,
    MONTE_CARLO_OUTCOME_CODE,
    assertMonteCarloChunkResultV1,
    createMonteCarloChunkAccumulatorV1,
    createMonteCarloChunkResultV1,
    createMonteCarloPathSummaryV1,
    finalizeMonteCarloChunkAccumulatorV1,
    mergeMonteCarloChunkResultV1,
    recordMonteCarloPathSummaryV1
} from '../app/simulator/monte-carlo-chunk-result.js';
import {
    MC_HEATMAP_BINS,
    createMonteCarloBuffers
} from '../app/simulator/monte-carlo-runner-utils.js';

console.log('--- Monte Carlo Chunk Result Contract Tests ---');

const rows = [
    {
        outcomeCode: MONTE_CARLO_OUTCOME_CODE.HORIZON_EXHAUSTED,
        finalValue: 1000,
        volatility: 4.5,
        drawdown: 12,
        cutNumerator: 1,
        cutDenominator: 10,
        withdrawalP10: 22000,
        withdrawalCount: 10,
        taxSaved: 1e16,
        simulatedYears: 10,
        care: false,
        healthUsed: 0
    },
    {
        outcomeCode: MONTE_CARLO_OUTCOME_CODE.RUIN,
        finalValue: 0,
        volatility: 8,
        drawdown: 100,
        cutNumerator: 2,
        cutDenominator: 3,
        withdrawalP10: 9000,
        withdrawalCount: 3,
        taxSaved: 1,
        simulatedYears: 3,
        care: true,
        p1EntryAge: 81,
        p2EntryAge: 79,
        p1CareYears: 2,
        p2CareYears: 1,
        bothCareYears: 1,
        careCost: 40000,
        maxAnnualCareSpend: 18000,
        hasPartner: true,
        healthEnabled: true,
        healthUsed: 12000,
        healthEnd: 5000,
        healthCoverage: 62.5,
        healthGap: 3000,
        healthInterest: 150
    },
    {
        outcomeCode: MONTE_CARLO_OUTCOME_CODE.ALL_DEAD,
        finalValue: 500,
        volatility: 2,
        drawdown: 5,
        cutNumerator: 0,
        cutDenominator: 4,
        withdrawalP10: null,
        withdrawalCount: 0,
        taxSaved: 1,
        simulatedYears: 4,
        care: true,
        p1EntryAge: 88,
        p2EntryAge: null,
        p1CareYears: 1,
        p2CareYears: 0,
        bothCareYears: 0,
        careCost: 9000,
        maxAnnualCareSpend: 9000,
        hasPartner: false,
        healthUsed: 0
    },
    {
        outcomeCode: MONTE_CARLO_OUTCOME_CODE.HORIZON_EXHAUSTED,
        finalValue: 2500,
        volatility: 3.25,
        drawdown: 9,
        cutNumerator: 0,
        cutDenominator: 8,
        withdrawalP10: 26000,
        withdrawalCount: 8,
        taxSaved: 2,
        simulatedYears: 8,
        care: false,
        healthUsed: 250
    }
];

function emptyTotals() {
    return Object.fromEntries([
        ...MONTE_CARLO_COUNTER_FIELDS,
        ...MONTE_CARLO_FLOAT_AGGREGATE_FIELDS
    ].map(field => [field, 0]));
}

function emptyLists() {
    return Object.fromEntries(MONTE_CARLO_LIST_FIELDS.map(field => [field, []]));
}

function makeChunk(start, selectedRows) {
    const count = selectedRows.length;
    const buffers = createMonteCarloBuffers(count);
    const { pathSummaries, pathMissingness } = createMonteCarloPathSummaryV1(count, { buffers });
    const totals = emptyTotals();
    const runMeta = [];
    let worstRun = null;
    let worstRunCare = null;

    selectedRows.forEach((row, localIndex) => {
        const globalRunIndex = start + localIndex;
        buffers.finalOutcomes[localIndex] = row.finalValue;
        buffers.taxOutcomes[localIndex] = globalRunIndex * 10;
        buffers.kpiLebensdauer[localIndex] = row.simulatedYears;
        buffers.kpiKuerzungsjahre[localIndex] = row.cutNumerator;
        buffers.volatilities[localIndex] = row.volatility;
        buffers.maxDrawdowns[localIndex] = row.drawdown;
        buffers.depotErschoepft[localIndex] = row.outcomeCode === MONTE_CARLO_OUTCOME_CODE.RUIN ? 1 : 0;

        recordMonteCarloPathSummaryV1({
            pathSummaries,
            pathMissingness,
            localIndex,
            globalRunIndex,
            outcomeCode: row.outcomeCode,
            finalValueNominalEur: row.finalValue,
            volatilityPct: row.volatility,
            maxDrawdownPct: row.drawdown,
            cutYearsNumerator: row.cutNumerator,
            cutYearsDenominator: row.cutDenominator,
            realWithdrawalP10RealEur: row.withdrawalP10,
            realWithdrawalObservationCount: row.withdrawalCount,
            p1CareEntryAge: row.p1EntryAge,
            p2CareEntryAge: row.p2EntryAge,
            p1CareYears: row.p1CareYears,
            p2CareYears: row.p2CareYears,
            bothCareYears: row.bothCareYears,
            careEverActive: row.care,
            hasPartner: row.hasPartner,
            careDepotCostEur: row.careCost,
            maxAnnualCareSpendEur: row.maxAnnualCareSpend,
            healthBucketEnabled: row.healthEnabled,
            healthBucketUsedEur: row.healthUsed,
            healthBucketEndEur: row.healthEnd,
            healthBucketCoveragePct: row.healthCoverage,
            healthBucketTargetGapEur: row.healthGap,
            healthBucketInterestEur: row.healthInterest,
            taxSavedByLossCarryEur: row.taxSaved
        });

        totals.failCount += row.outcomeCode === MONTE_CARLO_OUTCOME_CODE.RUIN ? 1 : 0;
        totals.pflegeTriggeredCount += row.care ? 1 : 0;
        totals.totalSimulatedYears += row.simulatedYears;
        totals.totalYearsQuoteAbove45 += row.cutNumerator;
        totals.shortfallWithCareCount += row.care && row.outcomeCode === MONTE_CARLO_OUTCOME_CODE.RUIN ? 1 : 0;
        totals.shortfallNoCareProxyCount += !row.care && row.outcomeCode === MONTE_CARLO_OUTCOME_CODE.RUIN ? 1 : 0;
        totals.p2TriggeredCount += (row.p2CareYears || 0) > 0 ? 1 : 0;
        totals.healthBucketEnabledCount += row.healthEnabled ? 1 : 0;
        totals.healthBucketUsedCount += row.healthUsed > 0 ? 1 : 0;
        totals.healthBucketDepletedCount += row.healthEnabled && row.healthEnd <= 0 ? 1 : 0;
        totals.totalTaxSavedByLossCarry += row.taxSaved;
        totals.totalHealthBucketUsed += row.healthUsed || 0;

        const candidate = {
            finalVermoegen: row.finalValue,
            failed: row.outcomeCode === MONTE_CARLO_OUTCOME_CODE.RUIN,
            comboIdx: 0,
            runIdx: globalRunIndex,
            logDataRows: []
        };
        if (!worstRun || candidate.finalVermoegen < worstRun.finalVermoegen) worstRun = candidate;
        if (row.care && (!worstRunCare || candidate.finalVermoegen < worstRunCare.finalVermoegen)) {
            worstRunCare = { ...candidate, hasCare: true };
        }
        runMeta.push({ index: globalRunIndex, endVermoegen: row.finalValue });
    });

    const heatmap = Array.from({ length: 10 }, () => new Uint32Array(MC_HEATMAP_BINS.length - 1));
    heatmap[0][0] = count;
    return createMonteCarloChunkResultV1({
        runRange: { start, count },
        buffers,
        pathSummaries,
        pathMissingness,
        heatmap,
        bins: MC_HEATMAP_BINS,
        totals,
        lists: emptyLists(),
        allRealWithdrawalsSample: selectedRows.flatMap(row => (
            row.withdrawalCount > 0 ? [row.withdrawalP10] : []
        )),
        worstRun,
        worstRunCare,
        runMeta,
        batchStatus: 'completed',
        financialMetricsValid: true,
        technicalInventory: {
            requested: count,
            financiallyEvaluable: count,
            technicalError: 0,
            errors: []
        }
    });
}

function project(batch) {
    return {
        totals: batch.totals,
        lists: batch.lists,
        buffers: Object.fromEntries(Object.entries(batch.buffers).map(([field, values]) => [field, Array.from(values)])),
        pathSummaries: Object.fromEntries(Object.entries(batch.pathSummaries).map(([field, values]) => [field, Array.from(values)])),
        pathMissingness: Object.fromEntries(Object.entries(batch.pathMissingness).map(([field, values]) => [field, Array.from(values)])),
        heatmap: batch.heatmap.map(row => Array.from(row)),
        allRealWithdrawalsSample: batch.allRealWithdrawalsSample,
        runMeta: batch.runMeta,
        worstRun: batch.worstRun,
        worstRunCare: batch.worstRunCare
    };
}

function expectContractError(callback, message) {
    let thrown = null;
    try {
        callback();
    } catch (error) {
        thrown = error;
    }
    assert(thrown instanceof TypeError, message);
    assert(String(thrown?.message).includes(MONTE_CARLO_CHUNK_RESULT_VERSION), `${message} should identify the contract version`);
}

{
    const emptyChunk = makeChunk(0, []);
    const accumulator = createMonteCarloChunkAccumulatorV1(0);
    mergeMonteCarloChunkResultV1(accumulator, emptyChunk, { expectedStart: 0, expectedCount: 0 });
    const finalized = finalizeMonteCarloChunkAccumulatorV1(accumulator);
    assertEqual(finalized.completedRuns, 0, 'Empty contract should finalize zero runs');
    assertEqual(finalized.schemaVersion, MONTE_CARLO_CHUNK_RESULT_VERSION, 'Empty contract should retain V1 schema');
}

{
    const chunk = makeChunk(0, rows.slice(0, 1));
    assertMonteCarloChunkResultV1(chunk, { expectedStart: 0, expectedCount: 1 });
    assertEqual(chunk.pathSummaries.globalRunIndex[0], 0, 'Single chunk should use its global run index');
    assertEqual(chunk.pathMissingness.path[0], MONTE_CARLO_MISSINGNESS_CODE.OBSERVED, 'Single path should be observed');
}

{
    const layoutA = [makeChunk(0, rows.slice(0, 2)), makeChunk(2, rows.slice(2, 4))];
    const layoutB = [makeChunk(0, rows.slice(0, 1)), makeChunk(1, rows.slice(1, 4))];
    const accumulators = [
        createMonteCarloChunkAccumulatorV1(rows.length),
        createMonteCarloChunkAccumulatorV1(rows.length),
        createMonteCarloChunkAccumulatorV1(rows.length)
    ];
    mergeMonteCarloChunkResultV1(accumulators[0], layoutA[0]);
    mergeMonteCarloChunkResultV1(accumulators[0], layoutA[1]);
    mergeMonteCarloChunkResultV1(accumulators[1], layoutA[1]);
    mergeMonteCarloChunkResultV1(accumulators[1], layoutA[0]);
    mergeMonteCarloChunkResultV1(accumulators[2], layoutB[1]);
    mergeMonteCarloChunkResultV1(accumulators[2], layoutB[0]);

    const finalized = accumulators.map(finalizeMonteCarloChunkAccumulatorV1);
    assertEqual(JSON.stringify(project(finalized[1])), JSON.stringify(project(finalized[0])), 'Completion permutation must not affect results');
    assertEqual(JSON.stringify(project(finalized[2])), JSON.stringify(project(finalized[0])), 'Chunk partition must not affect results');
    assertEqual(finalized[0].totals.totalTaxSavedByLossCarry, 1e16 + 1 + 1 + 2, 'Float aggregate should reduce per-run values globally');
    assertEqual(finalized[0].lists.entryAges.join(','), '81,88', 'Conditional lists should follow global run order');
    assertEqual(finalized[0].worstRun.runIdx, 1, 'Worst-run tie breaking should retain the smallest global index');
    assertEqual(finalized[0].pathMissingness.realWithdrawalP10RealEur[2], MONTE_CARLO_MISSINGNESS_CODE.NO_OBSERVATIONS, 'Missing CaR observation should use an explicit code');
    assertEqual(finalized[0].buffers.finalOutcomes.length, rows.length, 'Accumulator memory should remain O(runs)');
    assert(!Object.keys(finalized[0].pathSummaries).some(field => /annualPath|yearPath/i.test(field)), 'Contract must not transfer annual path arrays');
}

{
    const technicalBuffers = createMonteCarloBuffers(1);
    const { pathSummaries, pathMissingness } = createMonteCarloPathSummaryV1(1, { buffers: technicalBuffers });
    recordMonteCarloPathSummaryV1({
        pathSummaries,
        pathMissingness,
        localIndex: 0,
        globalRunIndex: 3,
        outcomeCode: MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR,
        technicalError: true
    });
    const technical = createMonteCarloChunkResultV1({
        runRange: { start: 3, count: 1 },
        buffers: technicalBuffers,
        pathSummaries,
        pathMissingness,
        heatmap: Array.from({ length: 10 }, () => new Uint32Array(MC_HEATMAP_BINS.length - 1)),
        bins: MC_HEATMAP_BINS,
        totals: emptyTotals(),
        lists: emptyLists(),
        allRealWithdrawalsSample: [],
        worstRun: null,
        worstRunCare: null,
        runMeta: [],
        technicalInventory: {
            requested: 1,
            financiallyEvaluable: 0,
            technicalError: 1,
            errors: [{ runIndex: 3, code: 'TEST_ERROR', message: 'synthetic' }]
        }
    });
    assertEqual(technical.pathMissingness.path[0], MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR, 'Technical path should fail closed');
}

{
    const valid = makeChunk(0, rows.slice(0, 2));
    expectContractError(
        () => assertMonteCarloChunkResultV1({ ...valid, schemaVersion: 'MonteCarloChunkResultV2' }),
        'Incompatible versions must be rejected'
    );
    expectContractError(
        () => assertMonteCarloChunkResultV1({ ...valid, buffers: { ...valid.buffers, finalOutcomes: new Float32Array(2) } }),
        'Wrong buffer data types must be rejected'
    );
    expectContractError(
        () => assertMonteCarloChunkResultV1({ ...valid, pathSummaries: { ...valid.pathSummaries, outcomeCode: new Uint8Array(1) } }),
        'Wrong summary lengths must be rejected'
    );
    expectContractError(
        () => mergeMonteCarloChunkResultV1(createMonteCarloChunkAccumulatorV1(2), valid, { expectedStart: 1 }),
        'Unexpected worker range must be rejected'
    );
    const duplicateAccumulator = createMonteCarloChunkAccumulatorV1(2);
    mergeMonteCarloChunkResultV1(duplicateAccumulator, valid);
    expectContractError(
        () => mergeMonteCarloChunkResultV1(duplicateAccumulator, valid),
        'Duplicate chunks must be rejected'
    );
    const incompleteAccumulator = createMonteCarloChunkAccumulatorV1(3);
    mergeMonteCarloChunkResultV1(incompleteAccumulator, valid);
    expectContractError(
        () => finalizeMonteCarloChunkAccumulatorV1(incompleteAccumulator),
        'Incomplete accumulators must fail closed'
    );
}

console.log('--- Monte Carlo Chunk Result Contract Tests Completed ---');
