import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

import { EngineAPI } from '../engine/index.mjs';
import {
    attachMonteCarloBatchOutcome,
    buildMonteCarloAggregates,
    createMonteCarloBuffers,
    runMonteCarloChunk
} from '../app/simulator/monte-carlo-runner.js';
import {
    createMonteCarloChunkAccumulatorV1,
    finalizeMonteCarloChunkAccumulatorV1,
    mergeMonteCarloChunkResultV1
} from '../app/simulator/monte-carlo-chunk-result.js';
import {
    MONTE_CARLO_LEGACY_READ_ALIASES,
    MONTE_CARLO_RUN_REQUEST_VERSION,
    MONTE_CARLO_RUN_RESULT_VERSION,
    MONTE_CARLO_SCENARIO_VERSION,
    MONTE_CARLO_SNAPSHOT_POLICY
} from '../app/simulator/monte-carlo-contracts.js';
import {
    MONTE_CARLO_PARAMETER_LIMITS,
    MONTE_CARLO_PARAMETERS_VERSION
} from '../app/simulator/monte-carlo-parameters.js';
import {
    compileScenario,
    getDataVersion
} from '../app/simulator/simulator-engine-helpers.js';
import { computeRunStatsFromSeries } from '../app/simulator/simulator-engine-wrapper.js';
import { quantile } from '../app/simulator/simulator-utils.js';

console.log('--- Monte Carlo Measurement Contract Tests ---');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, 'fixtures', 'monte-carlo-measurement');
const workerUrl = new URL('../workers/mc-worker.js', import.meta.url);
const UPDATE_REFERENCE_ID = String(process.env.MC_UPDATE_REFERENCE || '').trim();
function readFixture(name) {
    return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), 'utf8'));
}

function readFixtureUnlessWriting(name, snapshotId) {
    return UPDATE_REFERENCE_ID === snapshotId ? null : readFixture(name);
}

const goldenFixture = readFixture('golden-cases-v1.json');
const snapshotPolicy = readFixture('snapshot-policy-v1.json');
const deltaLedger = readFixture('delta-ledger-v1.json');
const preHardening = readFixture('pre-hardening-v1.json');
const postSlice03 = readFixture('post-slice-03-v1.json');
const postSlice04 = readFixture('post-slice-04-v1.json');
const postSlice05 = readFixture('post-slice-05-v1.json');
const postSlice06 = readFixture('post-slice-06-v1.json');
const postSlice07 = readFixture('post-slice-07-v1.json');
const postSuiteData05 = readFixture('post-suite-data-05-v1.json');
const postSuiteData02 = readFixture('post-suite-data-02-v1.json');
const postSuiteData11 = readFixture('post-suite-data-11-v1.json');
const postBacktestData02V1 = readFixture('post-backtest-data-02-v1.json');
const postBacktestData02V2 = readFixture('post-backtest-data-02-v2.json');
const postBacktestData02 = readFixtureUnlessWriting(
    'post-backtest-data-02-v3.json',
    'post-backtest-data-02-v3'
);
const postBacktestData03 = readFixture('post-backtest-data-03-v1.json');
const postBacktestData04 = readFixtureUnlessWriting(
    'post-backtest-data-04-v1.json',
    'post-backtest-data-04-v1'
);
const postBacktestData05 = readFixtureUnlessWriting(
    'post-backtest-data-05-v1.json',
    'post-backtest-data-05-v1'
);
const postBacktestData06V1 = readFixture('post-backtest-data-06-v1.json');
const postBacktestData06 = readFixtureUnlessWriting(
    'post-backtest-data-06-v2.json',
    'post-backtest-data-06-v2'
);
const postBacktestData07 = readFixture('post-backtest-data-07-v1.json');
const finalCandidate = readFixture('monte-carlo-v1-final.json');
const benchmarkContract = readFixture('benchmark-contract-v1.json');
const benchmarkResults = readFixture('benchmark-results-2026-07-22.json');
const consumerInventory = readFixture('consumer-inventory-v1.json');
const slice08MeasurementPath = path.join(fixtureDir, 'liquidity-runway-slice-08-v1.json');
const slice09MeasurementPath = path.join(fixtureDir, 'minimum-flex-slice-09-v1.json');
const slice10MeasurementPath = path.join(fixtureDir, 'tax-logic-slice-10-v1.json');
const slice17MeasurementPath = path.join(fixtureDir, '..', 'liquidity-runway-basis-slice-17-measurement-v1.json');
const safetyPolicySlice03MeasurementPath = path.join(fixtureDir, '..', 'safety-policy-slice-03-measurement-v1.json');

function getGolden(id) {
    return goldenFixture.cases.find(entry => entry.id === id);
}

function nullableMedian(values) {
    return values.length > 0 ? quantile(values, 0.5) : null;
}

function canonicalize(value) {
    return JSON.parse(JSON.stringify(value, (_key, current) => {
        if (typeof current === 'number' && !Number.isFinite(current)) return null;
        if (ArrayBuffer.isView(current)) return Array.from(current);
        return current;
    }));
}

function assertJsonEqual(actual, expected, message) {
    assertEqual(JSON.stringify(canonicalize(actual)), JSON.stringify(canonicalize(expected)), message);
}

function collectLeafDiffPaths(before, after, pathName = '$') {
    if (JSON.stringify(before) === JSON.stringify(after)) return [];
    const beforeObject = before !== null && typeof before === 'object';
    const afterObject = after !== null && typeof after === 'object';
    if (!beforeObject || !afterObject || Array.isArray(before) !== Array.isArray(after)) return [pathName];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return Array.from(keys).sort().flatMap(key => collectLeafDiffPaths(
        before[key],
        after[key],
        `${pathName}.${key}`
    ));
}

function collectNumericLeafDeltas(before, after, pathName = '$') {
    if (typeof before === 'number' && typeof after === 'number') {
        return Object.is(before, after) ? [] : [{ path: pathName, before, after }];
    }
    const beforeObject = before !== null && typeof before === 'object';
    const afterObject = after !== null && typeof after === 'object';
    if (!beforeObject || !afterObject || Array.isArray(before) !== Array.isArray(after)) return [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return Array.from(keys).sort().flatMap(key => collectNumericLeafDeltas(
        before[key],
        after[key],
        `${pathName}.${key}`
    ));
}

function createWorkerHarness() {
    const harnessSource = `
        import { parentPort } from 'node:worker_threads';
        globalThis.self = {
            postMessage(message, transferables = []) {
                parentPort.postMessage(message, transferables);
            },
            onmessage: null
        };
        parentPort.on('message', data => {
            if (typeof globalThis.self.onmessage === 'function') {
                globalThis.self.onmessage({ data });
            }
        });
        await import(${JSON.stringify(workerUrl.href)});
    `;
    return new Worker(
        new URL(`data:text/javascript,${encodeURIComponent(harnessSource)}`),
        { type: 'module' }
    );
}

function postAndWait(worker, payload, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for worker response to ${payload.type}/${payload.jobId}`));
        }, timeoutMs);

        const cleanup = () => {
            clearTimeout(timer);
            worker.off('message', onMessage);
            worker.off('error', onError);
            worker.off('exit', onExit);
        };
        const onMessage = message => {
            if (message?.type === 'progress') return;
            if (payload.jobId && message?.jobId && message.jobId !== payload.jobId) return;
            if (!['ready', 'result', 'error', 'disposed'].includes(message?.type)) return;
            cleanup();
            if (message.type === 'error') {
                reject(new Error(message.message || `Worker job ${payload.jobId} failed`));
                return;
            }
            resolve(message);
        };
        const onError = error => {
            cleanup();
            reject(error);
        };
        const onExit = code => {
            cleanup();
            reject(new Error(`Worker exited before responding to ${payload.jobId} (code ${code})`));
        };

        worker.on('message', onMessage);
        worker.on('error', onError);
        worker.on('exit', onExit);
        worker.postMessage(payload);
    });
}

async function terminateWorkers(workers) {
    await Promise.all(workers.map(worker => worker.terminate().catch(() => undefined)));
}

async function initializeWorkers(workerCount, runnerCase) {
    const workers = Array.from({ length: workerCount }, () => createWorkerHarness());
    const { scenarioKey, compiledScenario } = compileScenario(
        runnerCase.inputs,
        runnerCase.widowOptions,
        runnerCase.monteCarloParams.methode,
        runnerCase.useCapeSampling,
        runnerCase.inputs.stressPreset
    );
    const dataVersion = getDataVersion();
    try {
        await Promise.all(workers.map((worker, index) => postAndWait(worker, {
            type: 'init',
            jobId: `measurement-init-${index}`,
            scenarioKey,
            compiledScenario,
            dataVersion
        })));
        return { workers, scenarioKey, dataVersion };
    } catch (error) {
        await terminateWorkers(workers);
        throw error;
    }
}

function validateChunkRanges(ranges, totalRuns) {
    let next = 0;
    for (const range of ranges) {
        assertEqual(range.start, next, 'Chunk ranges must be contiguous and globally ordered');
        assert(Number.isInteger(range.count) && range.count > 0, 'Chunk counts must be positive integers');
        next += range.count;
    }
    assertEqual(next, totalRuns, 'Chunk ranges must cover every requested run exactly once');
}

function createAccumulator(totalRuns, templateResult = null, { retainRunMeta = true } = {}) {
    const bins = templateResult?.bins || [0, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, Infinity];
    const heatmapRows = templateResult?.heatmap?.length || 10;
    return {
        ...createMonteCarloChunkAccumulatorV1(totalRuns, {
            bins,
            heatmapRows,
            retainRunMeta
        }),
        payloadBytes: 0
    };
}

function estimatePayloadBytes(result) {
    let typedBytes = 0;
    const json = JSON.stringify(result, (_key, current) => {
        if (ArrayBuffer.isView(current)) {
            typedBytes += current.byteLength;
            return undefined;
        }
        return current;
    });
    return typedBytes + Buffer.byteLength(json || '', 'utf8');
}

function mergeChunkIntoAccumulator(accumulator, result, start, count, payloadBytes = 0) {
    mergeMonteCarloChunkResultV1(accumulator, result, {
        expectedStart: start,
        expectedCount: count
    });
    accumulator.payloadBytes += payloadBytes;
}

function finalizeAccumulator(accumulator, inputs) {
    const finalized = finalizeMonteCarloChunkAccumulatorV1(accumulator);
    const aggregates = attachMonteCarloBatchOutcome(buildMonteCarloAggregates({
        inputs,
        totalRuns: finalized.totalRuns,
        buffers: finalized.buffers,
        heatmap: finalized.heatmap,
        bins: finalized.bins,
        totals: finalized.totals,
        lists: finalized.lists,
        allRealWithdrawalsSample: finalized.allRealWithdrawalsSample
    }), finalized.technicalInventory);
    return { ...finalized, payloadBytes: accumulator.payloadBytes, aggregates };
}

async function runWorkerLayout(runnerCase, workerCount, ranges) {
    validateChunkRanges(ranges, runnerCase.monteCarloParams.anzahl);
    const { workers, scenarioKey } = await initializeWorkers(workerCount, runnerCase);
    try {
        const jobs = ranges.map((range, index) => postAndWait(workers[index % workers.length], {
            type: 'job',
            jobId: `layout-${workerCount}-${index}`,
            scenarioKey,
            runRange: range,
            monteCarloParams: {
                ...runnerCase.monteCarloParams,
                anzahl: range.count
            },
            useCapeSampling: runnerCase.useCapeSampling,
            logIndices: runnerCase.logIndices
        }));
        const messages = await Promise.all(jobs);
        // Merge deliberately opposite to global run order. The V1 contract must
        // make worker completion/merge order irrelevant.
        const completionOrder = messages
            .map((message, index) => ({ message, range: ranges[index] }))
            .reverse();
        const accumulator = createAccumulator(runnerCase.monteCarloParams.anzahl, completionOrder[0]?.message);
        for (const { message, range } of completionOrder) {
            mergeChunkIntoAccumulator(
                accumulator,
                message,
                range.start,
                range.count,
                estimatePayloadBytes(message)
            );
        }
        return finalizeAccumulator(accumulator, runnerCase.inputs);
    } finally {
        await terminateWorkers(workers);
    }
}

function compactWorstRun(value) {
    if (!value) return null;
    return {
        finalVermoegen: value.finalVermoegen,
        failed: value.failed,
        hasCare: value.hasCare ?? false,
        comboIdx: value.comboIdx,
        runIdx: value.runIdx
    };
}

const V2_ADDITIONAL_BUFFER_FIELDS = new Set([
    'realMaxDrawdowns',
    'realMaxDrawdownObservationCount',
    'realMaxDrawdownMissingness'
]);

function legacyV1BufferBytes(result) {
    return Object.entries(result.buffers).reduce((sum, [field, buffer]) => (
        V2_ADDITIONAL_BUFFER_FIELDS.has(field) ? sum : sum + buffer.byteLength
    ), 0);
}

function snapshotProjection(result) {
    const bufferBytes = legacyV1BufferBytes(result);
    const aggregates = result.aggregates;
    return canonicalize({
        bufferBytes,
        bufferBytesPerRun: bufferBytes / result.totalRuns,
        buffers: result.buffers,
        heatmap: result.heatmap,
        bins: result.bins,
        totals: result.totals,
        listLengths: Object.fromEntries(Object.entries(result.lists).map(([key, values]) => [key, values.length])),
        allRealWithdrawalsSample: result.allRealWithdrawalsSample,
        technicalInventory: result.technicalInventory,
        samplingDiagnostics: result.samplingDiagnostics,
        aggregates: {
            finalOutcomes: aggregates.finalOutcomes,
            taxOutcomes: aggregates.taxOutcomes,
            kpiLebensdauer: aggregates.kpiLebensdauer,
            kpiKuerzungsjahre: aggregates.kpiKuerzungsjahre,
            cutYearSharePct: aggregates.cutYearSharePct,
            kpiMaxKuerzung: aggregates.kpiMaxKuerzung,
            depotErschoepfungsQuote: aggregates.depotErschoepfungsQuote,
            alterBeiErschoepfung: aggregates.alterBeiErschoepfung,
            anteilJahreOhneFlex: aggregates.anteilJahreOhneFlex,
            volatilities: aggregates.volatilities,
            maxDrawdowns: aggregates.maxDrawdowns,
            timeShareQuoteAbove45: aggregates.extraKPI.timeShareQuoteAbove45,
            consumptionAtRiskP10Real: aggregates.extraKPI.consumptionAtRiskP10Real,
            lossCarryTaxSavings: aggregates.extraKPI.lossCarryTaxSavings,
            pflege: aggregates.extraKPI.pflege,
            stressKPI: aggregates.stressKPI,
            batchStatus: aggregates.batchStatus,
            financialMetricsValid: aggregates.financialMetricsValid
        },
        worstRun: compactWorstRun(result.worstRun),
        worstRunCare: compactWorstRun(result.worstRunCare)
    });
}

function riskKpiSnapshotProjection(result) {
    const bufferBytes = legacyV1BufferBytes(result);
    return canonicalize({
        bufferBytes,
        bufferBytesPerRun: bufferBytes / result.totalRuns,
        buffers: {
            legacyCutYearCounts: result.buffers.kpiKuerzungsjahre,
            cutYearShareRatio: result.buffers.cutYearShareRatio,
            cutYearShareMissingness: result.buffers.cutYearShareMissingness,
            volatilityPct: result.buffers.volatilities,
            maxDrawdownPct: result.buffers.maxDrawdowns
        },
        pathSummaries: {
            cutYearsNumerator: result.pathSummaries.cutYearsNumerator,
            cutYearsDenominator: result.pathSummaries.cutYearsDenominator,
            cutYearShareRatio: result.pathSummaries.cutYearShareRatio,
            volatilityPct: result.pathSummaries.volatilityPct,
            maxDrawdownPct: result.pathSummaries.maxDrawdownPct
        },
        pathMissingness: {
            cutYearShareRatio: result.pathMissingness.cutYearShareRatio
        },
        aggregates: {
            legacyCutYearCounts: result.aggregates.kpiKuerzungsjahre,
            cutYearSharePct: result.aggregates.cutYearSharePct,
            volatilities: result.aggregates.volatilities,
            maxDrawdowns: result.aggregates.maxDrawdowns
        }
    });
}

function outcomeHorizonSnapshotProjection(result) {
    const bufferBytes = legacyV1BufferBytes(result);
    return canonicalize({
        bufferBytes,
        bufferBytesPerRun: bufferBytes / result.totalRuns,
        bufferTypes: {
            kpiLebensdauer: result.buffers.kpiLebensdauer.constructor.name,
            alterBeiErschoepfung: result.buffers.alterBeiErschoepfung.constructor.name,
            alterBeiErschoepfungMissingness: result.buffers.alterBeiErschoepfungMissingness.constructor.name,
            outcomeCode: result.pathSummaries.outcomeCode.constructor.name
        },
        buffers: {
            kpiLebensdauer: result.buffers.kpiLebensdauer,
            alterBeiErschoepfung: result.buffers.alterBeiErschoepfung,
            alterBeiErschoepfungMissingness: result.buffers.alterBeiErschoepfungMissingness,
            outcomeCode: result.pathSummaries.outcomeCode
        },
        totals: {
            outcomeRuinCount: result.totals.outcomeRuinCount,
            outcomeAllDeadCount: result.totals.outcomeAllDeadCount,
            outcomeHorizonExhaustedCount: result.totals.outcomeHorizonExhaustedCount
        },
        outcomeInventory: result.aggregates.outcomeInventory
    });
}

function samplingSnapshotProjection(result) {
    const bufferBytes = legacyV1BufferBytes(result);
    return canonicalize({
        bufferBytes,
        bufferBytesPerRun: bufferBytes / result.totalRuns,
        buffers: {
            finalOutcomes: result.buffers.finalOutcomes,
            kpiLebensdauer: result.buffers.kpiLebensdauer
        },
        totals: {
            outcomeRuinCount: result.totals.outcomeRuinCount,
            outcomeAllDeadCount: result.totals.outcomeAllDeadCount,
            outcomeHorizonExhaustedCount: result.totals.outcomeHorizonExhaustedCount,
            tailRiskEventCount: result.totals.tailRiskEventCount,
            tailRiskEvaluatedYears: result.totals.tailRiskEvaluatedYears,
            tailRiskAppliedYears: result.totals.tailRiskAppliedYears
        },
        samplingDiagnostics: result.samplingDiagnostics,
        aggregates: {
            finalOutcomes: result.aggregates.finalOutcomes,
            depotErschoepfungsQuote: result.aggregates.depotErschoepfungsQuote
        }
    });
}

function carUncertaintySnapshotProjection(result) {
    const bufferBytes = legacyV1BufferBytes(result);
    return canonicalize({
        bufferBytes,
        bufferBytesPerRun: bufferBytes / result.totalRuns,
        buffers: {
            realWithdrawalP10RealEur: result.buffers.realWithdrawalP10RealEur,
            realWithdrawalObservationCount: result.buffers.realWithdrawalObservationCount,
            realWithdrawalP10Missingness: result.buffers.realWithdrawalP10Missingness,
            stressRealWithdrawalP10RealEur: result.buffers.stress_CaR_P10_Real,
            stressRealWithdrawalObservationCount: result.buffers.stress_realWithdrawalObservationCount,
            stressRealWithdrawalP10Missingness: result.buffers.stress_realWithdrawalP10Missingness
        },
        allRealWithdrawalsSample: result.allRealWithdrawalsSample,
        pathSummaries: {
            realWithdrawalP10RealEur: result.pathSummaries.realWithdrawalP10RealEur,
            realWithdrawalObservationCount: result.pathSummaries.realWithdrawalObservationCount
        },
        pathMissingness: {
            realWithdrawalP10RealEur: result.pathMissingness.realWithdrawalP10RealEur
        },
        aggregates: {
            realWithdrawalP10: result.aggregates.realWithdrawalP10,
            stressRealWithdrawalP10: result.aggregates.stressKPI.realWithdrawalP10,
            floorCoverageEstimate: result.aggregates.outcomeInventory.floorCoverageEstimate
        }
    });
}

function autoOptimizeMetricsSnapshotProjection(result) {
    const bufferBytes = legacyV1BufferBytes(result);
    return canonicalize({
        resourceContract: {
            measuredWorkerResultBytesPerRun: MONTE_CARLO_PARAMETER_LIMITS.measuredWorkerResultBytesPerRun
        },
        bufferBytes,
        bufferBytesPerRun: bufferBytes / result.totalRuns,
        buffers: {
            meanWithdrawalRateRatio: result.buffers.meanWithdrawalRateRatio,
            withdrawalRateObservationCount: result.buffers.withdrawalRateObservationCount,
            meanWithdrawalRateMissingness: result.buffers.meanWithdrawalRateMissingness
        },
        pathSummaries: {
            meanWithdrawalRateRatio: result.pathSummaries.meanWithdrawalRateRatio,
            withdrawalRateObservationCount: result.pathSummaries.withdrawalRateObservationCount
        },
        pathMissingness: {
            meanWithdrawalRateRatio: result.pathMissingness.meanWithdrawalRateRatio
        },
        aggregates: {
            finalOutcomes: result.aggregates.finalOutcomes,
            maximumDrawdownPct: result.aggregates.maxDrawdowns,
            medianWithdrawalRate: result.aggregates.medianWithdrawalRate
        }
    });
}

function careKpiSnapshotProjection() {
    const golden = getGolden('GC-CARE-01');
    const runsWithCare = golden.input.runs.filter(run => run.p1 || run.p2);
    const p1Rows = golden.input.runs.map(run => run.p1).filter(Boolean);
    const p2Rows = golden.input.runs.map(run => run.p2).filter(Boolean);
    const totalRuns = golden.input.requestedRuns;
    const buffers = createMonteCarloBuffers(totalRuns);
    const lists = {
        entryAges: p1Rows.map(row => row.entryAge),
        entryAgesP2: p2Rows.map(row => row.entryAge),
        p1CareAdditionalNeedRealEur: p1Rows.map(row => row.realCostEur),
        p2CareAdditionalNeedRealEur: p2Rows.map(row => row.realCostEur),
        totalCareAdditionalNeedRealEur: runsWithCare.map(run => (
            (run.p1?.realCostEur || 0) + (run.p2?.realCostEur || 0)
        )),
        endWealthWithCareRealEur: [700000, 600000],
        endWealthNoCareRealEur: [900000, 1000000],
        p1CareYearsTriggered: p1Rows.map(row => row.careYears),
        p2CareYearsTriggered: p2Rows.map(row => row.careYears),
        bothCareYearsOverlapTriggered: [0, 1],
        maxAnnualCareAdditionalNeedRealEur: [12000, 14000],
        healthBucketUsedAmounts: [],
        healthBucketEndAmounts: [],
        healthBucketCoveragePct: [],
        healthBucketTargetGaps: [],
        healthBucketInterestAmounts: []
    };
    const aggregate = buildMonteCarloAggregates({
        inputs: { stressPreset: 'NONE', partner: { aktiv: true } },
        totalRuns,
        buffers,
        heatmap: [new Uint32Array([0])],
        bins: [0, Infinity],
        totals: {
            pflegeTriggeredCount: runsWithCare.length,
            p1TriggeredCount: p1Rows.length,
            p2TriggeredCount: p2Rows.length,
            totalSimulatedYears: 0,
            totalYearsQuoteAbove45: 0,
            shortfallWithCareCount: 0,
            shortfallNoCareProxyCount: 0
        },
        lists,
        allRealWithdrawalsSample: []
    });
    return canonicalize(aggregate.extraKPI.pflege);
}

function finalCandidateSnapshotProjection(result) {
    const bufferBytes = legacyV1BufferBytes(result);
    const samplingDiagnostics = result.samplingDiagnostics;
    const {
        currentReference: _mutableCurrentReference,
        ...snapshotEvidencePolicy
    } = MONTE_CARLO_SNAPSHOT_POLICY;
    return canonicalize({
        contracts: {
            parameters: MONTE_CARLO_PARAMETERS_VERSION,
            runRequest: MONTE_CARLO_RUN_REQUEST_VERSION,
            runResult: MONTE_CARLO_RUN_RESULT_VERSION,
            scenario: MONTE_CARLO_SCENARIO_VERSION,
            snapshotPolicy: snapshotEvidencePolicy
        },
        resourceContract: {
            runs: MONTE_CARLO_PARAMETER_LIMITS.runs,
            durationYears: MONTE_CARLO_PARAMETER_LIMITS.durationYears,
            blockLengthYears: MONTE_CARLO_PARAMETER_LIMITS.blockLengthYears,
            workerCount: MONTE_CARLO_PARAMETER_LIMITS.workerCount,
            jobTimeBudgetMs: MONTE_CARLO_PARAMETER_LIMITS.jobTimeBudgetMs,
            measuredWorkerResultBytesPerRun: MONTE_CARLO_PARAMETER_LIMITS.measuredWorkerResultBytesPerRun
        },
        compatibility: {
            deprecatedReadAliases: MONTE_CARLO_LEGACY_READ_ALIASES
        },
        execution: {
            workerConfiguration: preHardening.metadata.workerConfiguration,
            chunkPolicy: preHardening.metadata.chunkPolicy
        },
        result: {
            bufferBytesPerRun: bufferBytes / result.totalRuns,
            pathSummaries: {
                outcomeCode: result.pathSummaries.outcomeCode,
                volatilityPct: result.pathSummaries.volatilityPct,
                maxDrawdownPct: result.pathSummaries.maxDrawdownPct,
                cutYearShareRatio: result.pathSummaries.cutYearShareRatio,
                realWithdrawalP10RealEur: result.pathSummaries.realWithdrawalP10RealEur
            },
            pathMissingness: {
                cutYearShareRatio: result.pathMissingness.cutYearShareRatio,
                realWithdrawalP10RealEur: result.pathMissingness.realWithdrawalP10RealEur
            },
            outcomeInventory: result.aggregates.outcomeInventory,
            riskKpis: {
                volatilityPct: result.aggregates.volatilities,
                maximumDrawdownPct: result.aggregates.maxDrawdowns,
                cutYearSharePct: result.aggregates.cutYearSharePct
            },
            realWithdrawalP10: result.aggregates.realWithdrawalP10,
            careKpis: careKpiSnapshotProjection(),
            samplingDiagnostics: {
                schemaVersion: samplingDiagnostics.schemaVersion,
                contract: samplingDiagnostics.contract,
                dataVersion: samplingDiagnostics.dataVersion,
                requestedRuns: samplingDiagnostics.requestedRuns,
                sampledYears: samplingDiagnostics.sampledYears,
                initialStartYearCounts: samplingDiagnostics.initialStartYearCounts,
                sourceCounts: samplingDiagnostics.sourceCounts,
                regimeCounts: samplingDiagnostics.regimeCounts,
                stationaryRestartCounts: samplingDiagnostics.stationaryRestartCounts,
                tailRisk: samplingDiagnostics.tailRisk
            },
            technicalInventory: result.technicalInventory
        }
    });
}

function omitHistoricalFixtureCompatibilityFields(snapshotResult) {
    const evidence = canonicalize(snapshotResult);
    for (const pathName of snapshotPolicy.historicalFixtureCompatibility.ignoredResultPaths) {
        const parts = pathName.split('.');
        let parent = evidence;
        for (const part of parts.slice(0, -1)) {
            parent = parent?.[part];
            if (!parent) break;
        }
        if (parent) delete parent[parts.at(-1)];
    }
    return evidence;
}

function resolveTolerance(pathName, sameRuntime, toleranceContract) {
    if (sameRuntime) return toleranceContract.sameRuntime.defaultAbsolute;
    let tolerance = toleranceContract.crossRuntime.defaultAbsolute;
    for (const rule of toleranceContract.crossRuntime.fields) {
        if (pathName.startsWith(rule.pathPrefix)) tolerance = rule.absolute;
    }
    return tolerance;
}

function compareSnapshotNode(actual, expected, pathName, sameRuntime, toleranceContract) {
    if (typeof expected === 'number' && typeof actual === 'number') {
        const tolerance = resolveTolerance(pathName, sameRuntime, toleranceContract);
        assertClose(actual, expected, tolerance, `Snapshot numeric mismatch at ${pathName}`);
        return;
    }
    if (Array.isArray(expected)) {
        assert(Array.isArray(actual), `Snapshot array missing at ${pathName}`);
        assertEqual(actual.length, expected.length, `Snapshot array length mismatch at ${pathName}`);
        for (let index = 0; index < expected.length; index++) {
            compareSnapshotNode(actual[index], expected[index], `${pathName}.${index}`, sameRuntime, toleranceContract);
        }
        return;
    }
    if (expected && typeof expected === 'object') {
        assert(actual && typeof actual === 'object', `Snapshot object missing at ${pathName}`);
        assertJsonEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), `Snapshot keys mismatch at ${pathName}`);
        for (const key of Object.keys(expected)) {
            compareSnapshotNode(actual[key], expected[key], `${pathName}.${key}`, sameRuntime, toleranceContract);
        }
        return;
    }
    assertEqual(actual, expected, `Snapshot value mismatch at ${pathName}`);
}

function determinismProjection(result) {
    const aggregates = canonicalize(result.aggregates);
    return canonicalize({
        buffers: result.buffers,
        totals: result.totals,
        technicalInventory: result.technicalInventory,
        aggregates
    });
}

function buildScenarioRunnerCase(profile) {
    const base = canonicalize(preHardening.runnerCase);
    base.monteCarloParams = {
        ...base.monteCarloParams,
        anzahl: profile.runs,
        maxDauer: profile.durationYears,
        seed: profile.seed
    };
    base.logIndices = [];
    if (profile.scenarioId === 'highWithdrawal') {
        base.inputs.startVermoegen = 600000;
        base.inputs.depotwertAlt = 550000;
        base.inputs.einstandAlt = 440000;
        base.inputs.startFloorBedarf = 36000;
        base.inputs.startFlexBedarf = 24000;
    } else if (profile.scenarioId === 'carePartner') {
        base.inputs.pflegefallLogikAktivieren = true;
        base.inputs.partner = { aktiv: true, startAlter: 62, geschlecht: 'w' };
        base.inputs.pflegeMinDauer = 1;
        base.inputs.pflegeMaxDauer = 6;
        base.inputs.pflegeMaxFloor = 120000;
    }
    return base;
}

async function measureCancellation(runnerCase, workerCount) {
    const { workers, scenarioKey } = await initializeWorkers(workerCount, runnerCase);
    try {
        const countPerWorker = Math.max(10000, Math.ceil(runnerCase.monteCarloParams.anzahl / workerCount));
        for (let index = 0; index < workers.length; index++) {
            workers[index].postMessage({
                type: 'job',
                jobId: `cancel-probe-${index}`,
                scenarioKey,
                runRange: { start: index * countPerWorker, count: countPerWorker },
                monteCarloParams: {
                    ...runnerCase.monteCarloParams,
                    anzahl: countPerWorker
                },
                useCapeSampling: runnerCase.useCapeSampling,
                logIndices: []
            });
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        const startedAt = performance.now();
        await terminateWorkers(workers);
        return performance.now() - startedAt;
    } catch (error) {
        await terminateWorkers(workers);
        throw error;
    }
}

async function runAdaptiveBenchmark(profile, { retainRunMeta = true, includeCancellation = true } = {}) {
    const runnerCase = buildScenarioRunnerCase(profile);
    const { workers, scenarioKey } = await initializeWorkers(profile.workerCount, runnerCase);
    const chunkPolicy = benchmarkContract.measurementMethod.chunkPolicy;
    const accumulator = createAccumulator(profile.runs, null, { retainRunMeta });
    let nextRunIndex = 0;
    let chunkSize = Math.min(
        chunkPolicy.maximumChunk,
        Math.max(chunkPolicy.minimumChunk, Math.floor(profile.runs / (profile.workerCount * 4)))
    );
    let smoothedChunkSize = chunkSize;
    const chunkSizes = [];
    const memorySamples = [];
    let jobSequence = 0;
    const sampleMemory = () => memorySamples.push(process.memoryUsage());
    sampleMemory();
    const memoryTimer = setInterval(sampleMemory, 100);
    const startedAt = performance.now();

    const workerLoop = async (worker, workerIndex) => {
        while (true) {
            if (nextRunIndex >= profile.runs) return;
            const start = nextRunIndex;
            const count = Math.min(chunkSize, profile.runs - nextRunIndex);
            nextRunIndex += count;
            const jobId = `benchmark-${workerIndex}-${jobSequence++}`;
            const result = await postAndWait(worker, {
                type: 'job',
                jobId,
                scenarioKey,
                runRange: { start, count },
                monteCarloParams: {
                    ...runnerCase.monteCarloParams,
                    anzahl: count
                },
                useCapeSampling: runnerCase.useCapeSampling,
                logIndices: []
            }, 300000);
            mergeChunkIntoAccumulator(accumulator, result, start, count, estimatePayloadBytes(result));
            chunkSizes.push(count);
            sampleMemory();
            const elapsedMs = Number(result.elapsedMs) || 0;
            if (elapsedMs > 0) {
                const scaled = Math.round(count * (profile.jobTimeBudgetMs / elapsedMs));
                const targetSize = Math.max(
                    chunkPolicy.minimumChunk,
                    Math.min(chunkPolicy.maximumChunk, scaled || chunkPolicy.minimumChunk)
                );
                smoothedChunkSize = Math.max(
                    chunkPolicy.minimumChunk,
                    Math.min(
                        chunkPolicy.maximumChunk,
                        Math.round(
                            smoothedChunkSize * chunkPolicy.smoothingOldWeight +
                            targetSize * chunkPolicy.smoothingTargetWeight
                        )
                    )
                );
                chunkSize = smoothedChunkSize;
            }
        }
    };

    try {
        await Promise.all(workers.map((worker, index) => workerLoop(worker, index)));
    } finally {
        clearInterval(memoryTimer);
        sampleMemory();
        await terminateWorkers(workers);
    }
    const durationMs = performance.now() - startedAt;
    const finalized = finalizeAccumulator(accumulator, runnerCase.inputs);
    const cancellationReactionMs = includeCancellation
        ? await measureCancellation(runnerCase, profile.workerCount)
        : null;
    const peakRssBytes = Math.max(...memorySamples.map(sample => sample.rss));
    const peakHeapUsedBytes = Math.max(...memorySamples.map(sample => sample.heapUsed));
    const bufferBytes = Object.values(finalized.buffers).reduce((sum, buffer) => sum + buffer.byteLength, 0);
    const ruinRatePct = finalized.aggregates.depotErschoepfungsQuote;
    const floorCoveragePct = finalized.technicalInventory.technicalError > 0
        ? null
        : ((profile.runs - finalized.totals.failCount) / profile.runs) * 100;

    return {
        profile: {
            runs: profile.runs,
            durationYears: profile.durationYears,
            workerCount: profile.workerCount,
            jobTimeBudgetMs: profile.jobTimeBudgetMs,
            scenarioId: profile.scenarioId,
            seed: profile.seed
        },
        measurement: {
            durationMs,
            peakRssBytes,
            peakHeapUsedBytes,
            cancellationReactionMs,
            bufferBytes,
            bufferBytesPerRun: bufferBytes / profile.runs,
            estimatedWorkerPayloadBytes: finalized.payloadBytes,
            estimatedWorkerPayloadBytesPerRun: finalized.payloadBytes / profile.runs,
            chunkCount: chunkSizes.length,
            chunkSizeMinimum: Math.min(...chunkSizes),
            chunkSizeMaximum: Math.max(...chunkSizes),
            chunkSizeMean: chunkSizes.reduce((sum, value) => sum + value, 0) / chunkSizes.length,
            completedRuns: finalized.completedRuns,
            technicalErrorRuns: finalized.technicalInventory.technicalError
        },
        kpis: {
            floorCoveragePct,
            ruinRatePct,
            endWealthP10NominalEur: finalized.aggregates.finalOutcomes.p10,
            endWealthP50NominalEur: finalized.aggregates.finalOutcomes.p50,
            maxDrawdownP90Pct: finalized.aggregates.maxDrawdowns.p90
        }
    };
}

function computeKpiDelta(low, high) {
    const delta = {};
    for (const key of benchmarkContract.reportedKpis) {
        const lowValue = low.kpis[key];
        const highValue = high.kpis[key];
        delta[key] = lowValue === null || highValue === null
            ? null
            : highValue - lowValue;
    }
    return delta;
}

// Contract 1: all decisions and fixture shapes are explicit.
{
    assertEqual(goldenFixture.decisions.length, 12, 'D-01 through D-12 must all be represented');
    assertJsonEqual(goldenFixture.decisions.map(entry => entry.id), Array.from({ length: 12 }, (_value, index) => `D-${String(index + 1).padStart(2, '0')}`), 'Decision IDs must be contiguous');
    assert(goldenFixture.decisions.every(entry => ['decided', 'blocked'].includes(entry.status)), 'Every decision must be decided or explicitly blocked');
    assert(goldenFixture.cases.length >= 5, 'All required golden-case families must exist');
    for (const goldenCase of goldenFixture.cases) {
        assert(goldenCase.input && goldenCase.expected, `${goldenCase.id} must name input and expected output`);
        for (const key of ['intermediate', 'value', 'unit', 'denominator', 'rounding', 'uiLabel']) {
            assert(goldenCase.expected[key] !== undefined, `${goldenCase.id} must declare expected.${key}`);
        }
    }
}

// Contract 2: volatility and drawdown are independently reproducible.
{
    const golden = getGolden('GC-RISK-01');
    const series = golden.input.portfolioValuesNominalEur;
    const returns = series.slice(1).map((value, index) => value / series[index] - 1);
    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const squaredDeviationSum = returns.reduce((sum, value) => sum + ((value - mean) ** 2), 0);
    const actual = computeRunStatsFromSeries(series);
    for (let index = 0; index < returns.length; index++) {
        assertClose(returns[index], golden.expected.intermediate.periodReturnsRatio[index], 1e-15, `Risk golden period return ${index} must match`);
    }
    assertClose(mean, golden.expected.intermediate.meanReturnRatio, 1e-15, 'Risk golden mean return must match');
    assertClose(squaredDeviationSum, golden.expected.intermediate.squaredDeviationSum, 1e-15, 'Risk golden squared deviations must match');
    assertClose(actual.volPct, golden.expected.value.volatilityPct, 1e-12, 'Risk golden volatility must match');
    assertClose(actual.maxDDpct, golden.expected.value.maxDrawdownPct, 1e-12, 'Risk golden drawdown must match');
}

// Contract 3: cut share uses the reviewed numerator and denominator.
{
    const golden = getGolden('GC-CUT-01');
    const eligible = golden.input.decumulationYears.filter(year => year.completed && Number.isFinite(year.cutPct));
    const cut = eligible.filter(year => year.cutPct >= 10);
    const ratio = eligible.length > 0 ? cut.length / eligible.length : null;
    assertJsonEqual(eligible.map(year => year.year), golden.expected.intermediate.eligibleYears, 'Cut-share eligible years must match');
    assertJsonEqual(cut.map(year => year.year), golden.expected.intermediate.cutYearsGte10Pct, 'Cut-share numerator years must match');
    assertEqual(cut.length, golden.expected.intermediate.numerator, 'Cut-share numerator must match');
    assertEqual(eligible.length, golden.expected.intermediate.denominator, 'Cut-share denominator must match');
    assertClose(ratio, golden.expected.value.cutYearShareRatio, 0, 'Cut-share ratio must match');
}

// Contract 4: P1/P2 care distributions stay separate and nullable when empty.
{
    const golden = getGolden('GC-CARE-01');
    const observed = person => golden.input.runs.map(run => run[person]).filter(Boolean);
    const buildPerson = person => {
        const rows = observed(person);
        return {
            entryRatePct: rows.length / golden.input.requestedRuns * 100,
            entryAgeP50: nullableMedian(rows.map(row => row.entryAge)),
            careYearsP50: nullableMedian(rows.map(row => row.careYears)),
            realCostEurP50: nullableMedian(rows.map(row => row.realCostEur)),
            sampleSize: rows.length
        };
    };
    assertJsonEqual(buildPerson('p1'), golden.expected.value.p1, 'P1 care golden must match');
    assertJsonEqual(buildPerson('p2'), golden.expected.value.p2, 'P2 care golden must match');
    const emptyP1 = golden.input.emptyConditionalRuns.map(run => run.p1).filter(Boolean);
    const emptyP2 = golden.input.emptyConditionalRuns.map(run => run.p2).filter(Boolean);
    assertJsonEqual({ entryAgeP50: nullableMedian(emptyP1), careYearsP50: nullableMedian(emptyP1), realCostEurP50: nullableMedian(emptyP1), sampleSize: emptyP1.length }, golden.expected.value.emptyP1, 'Empty P1 distribution must be nullable');
    assertJsonEqual({ entryAgeP50: nullableMedian(emptyP2), careYearsP50: nullableMedian(emptyP2), realCostEurP50: nullableMedian(emptyP2), sampleSize: emptyP2.length }, golden.expected.value.emptyP2, 'Empty P2 distribution must be nullable');
}

// Contract 5: all four terminal outcomes are exclusive and technical errors fail closed.
{
    const golden = getGolden('GC-OUTCOME-01');
    const classify = events => {
        if (events.includes('technical_error')) return 'technical_error';
        if (events.includes('financial_year_started') && events.includes('ruin_detected')) return 'ruin';
        if (events.includes('all_dead_before_next_financial_obligation')) return 'all_dead';
        if (events.includes('last_plan_year_completed_while_alive')) return 'horizon_exhausted';
        return 'technical_error';
    };
    const outcomes = golden.input.runs.map(run => classify(run.events));
    const inventory = { ruin: 0, all_dead: 0, horizon_exhausted: 0, technical_error: 0 };
    for (const outcome of outcomes) inventory[outcome]++;
    const floorCoveragePct = inventory.technical_error > 0
        ? null
        : ((inventory.all_dead + inventory.horizon_exhausted) / golden.input.requestedRuns) * 100;
    assertJsonEqual(outcomes, golden.expected.intermediate.outcomeByRunIndex, 'Outcome chronology must match');
    assertJsonEqual(inventory, golden.expected.value.inventory, 'Outcome inventory must match');
    assertEqual(Object.values(inventory).reduce((sum, value) => sum + value, 0), golden.input.requestedRuns, 'Outcome inventory must be exhaustive');
    assertEqual(floorCoveragePct, golden.expected.value.floorCoveragePct, 'Technical error must suppress floor coverage');
}

// Contract 6: CAPE anchors the first sample before later method-specific stages.
{
    const golden = getGolden('GC-SAMPLING-01');
    const input = golden.input;
    const resolve = method => {
        if (method === 'block') {
            return { firstSource: 'cape', recordIndices: [input.capeStartRecord.index, ...input.nextSequentialRecords.map(record => record.index)], filterAppliedToCapeAnchor: false };
        }
        if (method === 'stationary') {
            return { firstSource: 'cape', initialRecordIndex: input.capeStartRecord.index, continuationCandidateIndex: input.nextSequentialRecords[0].index };
        }
        if (method === 'regime_markov') {
            return { firstSource: 'cape', initialRegime: input.capeStartRecord.regime };
        }
        return { firstSource: 'cape', yearTwoMayUseIndependentRecordIndex: input.independentDrawRecord.index };
    };
    for (const method of input.methods) {
        assertJsonEqual(resolve(method), golden.expected.intermediate[method], `Sampling precedence must match for ${method}`);
    }
    assertEqual(golden.expected.intermediate.tailRiskStage, 'after_historical_record_selection', 'Tail-risk must be an overlay after sampling');
}

// Contract 7: snapshot classes, immutable baseline and delta-ledger policy are explicit.
{
    assertEqual(snapshotPolicy.referenceClasses.length, 5, 'Snapshot policy must distinguish baseline, Monte Carlo, Suite-Data, Backtest-Data and final-candidate references');
    const baselineClass = snapshotPolicy.referenceClasses.find(entry => entry.id === 'pre-hardening-v1');
    assert(baselineClass?.immutable === true && baselineClass?.overwriteAllowed === false, 'Pre-hardening reference must be immutable');
    assertEqual(
        snapshotPolicy.pendingDataCandidates.at(-1),
        'post-backtest-data-07-v1',
        'Snapshot policy must retain Slice 07 as the latest pending data candidate'
    );
    assertEqual(snapshotPolicy.comparisonRules.sameRuntime, 'exact', 'Same-runtime snapshots must be exact');
    assertEqual(snapshotPolicy.comparisonRules.widenToleranceAfterFailure, false, 'Tolerance widening after failure must be forbidden');
    assertEqual(
        JSON.stringify(snapshotPolicy.historicalFixtureCompatibility.ignoredResultPaths),
        JSON.stringify([
            'contracts.snapshotPolicy.currentReference',
            'contracts.snapshotPolicy.ignoredHistoricalFixtureFields'
        ]),
        'Fixture-specific historical compatibility paths must live in the measurement policy'
    );
    assertEqual(deltaLedger.baselineOverwriteAllowed, false, 'Delta ledger must not permit baseline overwrite');
    assert(deltaLedger.requiredEntryFields.includes('goldenCaseIds'), 'Delta entries must link to golden cases');
    assertEqual(deltaLedger.policy.unexplainedDelta, 'block', 'Unexplained deltas must block');
    const slice03Entries = deltaLedger.entries.filter(entry => entry.sliceId === '03');
    assertEqual(slice03Entries.length, 2, 'Slice 03 must ledger volatility and cut-share changes separately');
    for (const entry of slice03Entries) {
        for (const field of deltaLedger.requiredEntryFields) {
            assert(entry[field] !== undefined, `Slice 03 delta entry must contain ${field}`);
        }
        assertEqual(entry.sourceReference, 'pre-hardening-v1', 'Slice 03 deltas must retain the immutable source reference');
        assertEqual(entry.targetReference, 'post-slice-03-v1', 'Slice 03 deltas must target the separate post-slice snapshot');
    }
    assertEqual(postSlice03.sourceReference, 'pre-hardening-v1', 'Post-Slice-03 snapshot must reference the immutable baseline');
    assertEqual(postSlice03.reviewStatus, 'pending', 'Codex must not mark its own post-slice snapshot as reviewed');
    const slice04Entries = deltaLedger.entries.filter(entry => entry.sliceId === '04');
    assertEqual(slice04Entries.length, 3, 'Slice 04 must ledger person semantics, care-need units and comparison sign separately');
    for (const entry of slice04Entries) {
        for (const field of deltaLedger.requiredEntryFields) {
            assert(entry[field] !== undefined, `Slice 04 delta entry must contain ${field}`);
        }
        assertEqual(entry.sourceReference, 'post-slice-03-v1', 'Slice 04 deltas must retain the prior accepted slice reference');
        assertEqual(entry.targetReference, 'post-slice-04-v1', 'Slice 04 deltas must target the separate post-slice snapshot');
    }
    assertEqual(postSlice04.sourceReference, 'post-slice-03-v1', 'Post-Slice-04 snapshot must reference the prior slice snapshot');
    assertEqual(postSlice04.reviewStatus, 'pending', 'Codex must not mark its own Post-Slice-04 snapshot as reviewed');
    assertJsonEqual(careKpiSnapshotProjection(), postSlice04.result, 'Post-Slice-04 care snapshot must match the deterministic golden aggregate');
    const slice05Entries = deltaLedger.entries.filter(entry => entry.sliceId === '05');
    assert(slice05Entries.length >= 2, 'Slice 05 must ledger outcome semantics and buffer/mortality bounds separately');
    for (const entry of slice05Entries) {
        for (const field of deltaLedger.requiredEntryFields) {
            assert(Object.prototype.hasOwnProperty.call(entry, field), `Slice 05 delta entry must contain ${field}`);
        }
        assertEqual(entry.sourceReference, 'post-slice-04-v1', 'Slice 05 deltas must retain the prior accepted slice reference');
        assertEqual(entry.targetReference, 'post-slice-05-v1', 'Slice 05 deltas must target the separate post-slice snapshot');
    }
    assertEqual(postSlice05.sourceReference, 'post-slice-04-v1', 'Post-Slice-05 snapshot must reference the prior slice snapshot');
    assertEqual(postSlice05.reviewStatus, 'pending', 'Codex must not mark its own Post-Slice-05 snapshot as reviewed');
    const slice06Entries = deltaLedger.entries.filter(entry => entry.sliceId === '06');
    assert(slice06Entries.length >= 2, 'Slice 06 must ledger path precedence and sampling diagnostics separately');
    for (const entry of slice06Entries) {
        for (const field of deltaLedger.requiredEntryFields) {
            assert(Object.prototype.hasOwnProperty.call(entry, field), `Slice 06 delta entry must contain ${field}`);
        }
        assertEqual(entry.sourceReference, 'post-slice-05-v1', 'Slice 06 deltas must retain the prior accepted slice reference');
        assertEqual(entry.targetReference, 'post-slice-06-v1', 'Slice 06 deltas must target the separate post-slice snapshot');
    }
    assertEqual(postSlice06.sourceReference, 'post-slice-05-v1', 'Post-Slice-06 snapshot must reference the prior slice snapshot');
    assertEqual(postSlice06.reviewStatus, 'pending', 'Codex must not mark its own Post-Slice-06 snapshot as reviewed');
    const slice07Entries = deltaLedger.entries.filter(entry => entry.sliceId === '07');
    assertEqual(slice07Entries.length, 2, 'Slice 07 must ledger estimator uncertainty and run-based withdrawal semantics separately');
    for (const entry of slice07Entries) {
        for (const field of deltaLedger.requiredEntryFields) {
            assert(Object.prototype.hasOwnProperty.call(entry, field), `Slice 07 delta entry must contain ${field}`);
        }
        assertEqual(entry.sourceReference, 'post-slice-06-v1', 'Slice 07 deltas must retain the prior accepted slice reference');
        assertEqual(entry.targetReference, 'post-slice-07-v1', 'Slice 07 deltas must target the separate post-slice snapshot');
    }
    assertEqual(postSlice07.sourceReference, 'post-slice-06-v1', 'Post-Slice-07 snapshot must reference the prior slice snapshot');
    assertEqual(postSlice07.reviewStatus, 'pending', 'Codex must not mark its own Post-Slice-07 snapshot as reviewed');
    const suiteData05Entries = deltaLedger.entries.filter(entry => entry.sliceId === 'SUITE-DATA-05');
    assertEqual(suiteData05Entries.length, 1, 'Suite-Data Slice 05 must ledger its engine-spending snapshot delta separately');
    for (const field of deltaLedger.requiredEntryFields) {
        assert(Object.prototype.hasOwnProperty.call(suiteData05Entries[0], field), `Suite-Data Slice 05 delta entry must contain ${field}`);
    }
    assertEqual(suiteData05Entries[0].sourceReference, 'post-slice-07-v1', 'Suite-Data Slice 05 must retain the immutable MC semantic source');
    assertEqual(suiteData05Entries[0].targetReference, 'post-suite-data-05-v1', 'Suite-Data Slice 05 must target a separate versioned snapshot');
    assertEqual(postSuiteData05.sourceReference, 'post-slice-07-v1', 'Suite-Data Slice 05 snapshot must reference the prior MC semantic snapshot');
    assertEqual(postSuiteData05.reviewStatus, 'pending', 'Codex must not mark its own Suite-Data Slice 05 snapshot as reviewed');
    const suiteData02Entries = deltaLedger.entries.filter(entry => entry.sliceId === 'SUITE-DATA-02');
    assertEqual(suiteData02Entries.length, 1, 'Suite-Data Slice 02 must ledger its transaction-budget snapshot delta separately');
    for (const field of deltaLedger.requiredEntryFields) {
        assert(Object.prototype.hasOwnProperty.call(suiteData02Entries[0], field), `Suite-Data Slice 02 delta entry must contain ${field}`);
    }
    assertEqual(suiteData02Entries[0].sourceReference, 'post-suite-data-05-v1', 'Suite-Data Slice 02 must retain the prior Suite-Data reference');
    assertEqual(suiteData02Entries[0].targetReference, 'post-suite-data-02-v1', 'Suite-Data Slice 02 must target a separate versioned snapshot');
    assertEqual(postSuiteData02.sourceReference, 'post-suite-data-05-v1', 'Suite-Data Slice 02 snapshot must reference the prior Suite-Data snapshot');
    assertEqual(postSuiteData02.reviewStatus, 'pending', 'Codex must not mark its own Suite-Data Slice 02 snapshot as reviewed');
    assertJsonEqual(postSuiteData02.carResult, postSuiteData05.carResult, 'Suite-Data Slice 02 must retain the direct-runner CaR reference exactly');
    const suiteData11Entries = deltaLedger.entries.filter(entry => entry.sliceId === 'SUITE-DATA-11');
    assertEqual(suiteData11Entries.length, 1, 'Suite-Data Slice 11 must ledger its optimizer-metric snapshot delta separately');
    for (const field of deltaLedger.requiredEntryFields) {
        assert(Object.prototype.hasOwnProperty.call(suiteData11Entries[0], field), `Suite-Data Slice 11 delta entry must contain ${field}`);
    }
    assertEqual(suiteData11Entries[0].sourceReference, 'post-suite-data-02-v1', 'Suite-Data Slice 11 must retain the prior Suite-Data reference');
    assertEqual(suiteData11Entries[0].targetReference, 'post-suite-data-11-v1', 'Suite-Data Slice 11 must target a separate versioned snapshot');
    assertEqual(postSuiteData11.sourceReference, 'post-suite-data-02-v1', 'Suite-Data Slice 11 snapshot must reference the prior Suite-Data snapshot');
    assertEqual(postSuiteData11.reviewStatus, 'pending', 'Codex must not mark its own Suite-Data Slice 11 snapshot as reviewed');
    assertEqual(postSuiteData11.resourceEvidence.profileName, 'standard', 'Suite-Data Slice 11 resource evidence must use the standard profile');
    assertEqual(postSuiteData11.resourceEvidence.runs, 100000, 'Suite-Data Slice 11 resource evidence must measure 100000 runs');
    assertEqual(postSuiteData11.resourceEvidence.bufferBytesPerRun, 106, 'Suite-Data Slice 11 resource evidence must retain the exact transfer-buffer size');
    assertClose(
        postSuiteData11.resourceEvidence.measuredWorkerPayloadBytesPerRun,
        977.62585,
        0,
        'Suite-Data Slice 11 resource evidence must retain the measured total worker payload'
    );
    assertEqual(
        postSuiteData11.result.resourceContract.measuredWorkerResultBytesPerRun,
        Math.round(postSuiteData11.resourceEvidence.measuredWorkerPayloadBytesPerRun),
        'Suite-Data Slice 11 resource contract must round the measured worker payload'
    );
    const backtestData02Entries = deltaLedger.entries.filter(entry => entry.sliceId === 'BACKTEST-DATA-02');
    assertEqual(backtestData02Entries.length, 1, 'Backtest-Data Slice 02 must ledger its data-chain snapshot delta separately');
    for (const field of deltaLedger.requiredEntryFields) {
        assert(Object.prototype.hasOwnProperty.call(backtestData02Entries[0], field), `Backtest-Data Slice 02 delta entry must contain ${field}`);
    }
    assertEqual(backtestData02Entries[0].sourceReference, 'post-suite-data-02-v1', 'Backtest-Data Slice 02 must retain the reviewed-current source reference');
    assertEqual(backtestData02Entries[0].targetReference, 'post-backtest-data-02-v3', 'Backtest-Data Slice 02 must target the final remediated versioned snapshot');
    assertEqual(postBacktestData02V1.reviewStatus, 'pending', 'The superseded V1 candidate must remain unreviewed and immutable');
    assertEqual(postBacktestData02V2.reviewStatus, 'pending', 'The superseded V2 candidate must remain unreviewed and immutable');
    if (postBacktestData02) {
        assertEqual(postBacktestData02.sourceReference, 'post-suite-data-02-v1', 'Backtest-Data Slice 02 snapshot must reference the prior current snapshot');
        assertEqual(postBacktestData02.snapshotId, 'post-backtest-data-02-v3', 'The active Backtest-Data snapshot must be the final remediated V3 candidate');
        assertEqual(postBacktestData02.reviewStatus, 'pending', 'Codex must not mark its own Backtest-Data Slice 02 snapshot as reviewed');
        assertEqual(postBacktestData02.goldenCaseIds.length, goldenFixture.cases.length, 'Backtest-Data Slice 02 snapshot must cover every golden-case family');
    }
    const backtestData03Entries = deltaLedger.entries.filter(entry => entry.sliceId === 'BACKTEST-DATA-03');
    assertEqual(backtestData03Entries.length, 1, 'Backtest-Data Slice 03 must ledger its CPI snapshot delta separately');
    for (const field of deltaLedger.requiredEntryFields) {
        assert(Object.prototype.hasOwnProperty.call(backtestData03Entries[0], field), `Backtest-Data Slice 03 delta entry must contain ${field}`);
    }
    assertEqual(backtestData03Entries[0].sourceReference, 'post-backtest-data-02-v3', 'Backtest-Data Slice 03 must retain the Slice 02 source reference');
    assertEqual(backtestData03Entries[0].targetReference, 'post-backtest-data-03-v1', 'Backtest-Data Slice 03 must target its immutable pending candidate');
    if (postBacktestData03) {
        assertEqual(postBacktestData03.sourceReference, 'post-backtest-data-02-v3', 'Backtest-Data Slice 03 snapshot must reference the prior data snapshot');
        assertEqual(postBacktestData03.snapshotId, 'post-backtest-data-03-v1', 'The Backtest-Data Slice 03 candidate must retain its original immutable revision');
        assertEqual(postBacktestData03.reviewStatus, 'pending', 'The Backtest-Data Slice 03 candidate must remain pending until external review');
        assertEqual(postBacktestData03.goldenCaseIds.length, goldenFixture.cases.length, 'Backtest-Data Slice 03 snapshot must cover every golden-case family');
    }
    const backtestData04Entries = deltaLedger.entries.filter(entry => entry.sliceId === 'BACKTEST-DATA-04');
    assertEqual(backtestData04Entries.length, 1, 'Backtest-Data Slice 04 must ledger its cash/money-market snapshot delta separately');
    for (const field of deltaLedger.requiredEntryFields) {
        assert(Object.prototype.hasOwnProperty.call(backtestData04Entries[0], field), `Backtest-Data Slice 04 delta entry must contain ${field}`);
    }
    assertEqual(backtestData04Entries[0].sourceReference, 'post-backtest-data-03-v1', 'Backtest-Data Slice 04 must retain the Slice 03 source reference');
    assertEqual(backtestData04Entries[0].targetReference, 'post-backtest-data-04-v1', 'Backtest-Data Slice 04 must target its immutable pending candidate');
    if (postBacktestData04) {
        assertEqual(postBacktestData04.sourceReference, 'post-backtest-data-03-v1', 'Backtest-Data Slice 04 snapshot must reference the prior data snapshot');
        assertEqual(postBacktestData04.snapshotId, 'post-backtest-data-04-v1', 'The Backtest-Data Slice 04 candidate must retain its original immutable revision');
        assertEqual(postBacktestData04.reviewStatus, 'pending', 'The Backtest-Data Slice 04 candidate must remain pending until external review');
        assertEqual(postBacktestData04.goldenCaseIds.length, goldenFixture.cases.length, 'Backtest-Data Slice 04 snapshot must cover every golden-case family');
    }
    const backtestData05Entries = deltaLedger.entries.filter(entry => entry.sliceId === 'BACKTEST-DATA-05');
    assertEqual(backtestData05Entries.length, 1, 'Backtest-Data Slice 05 must ledger its gold snapshot delta separately');
    for (const field of deltaLedger.requiredEntryFields) {
        assert(Object.prototype.hasOwnProperty.call(backtestData05Entries[0], field), `Backtest-Data Slice 05 delta entry must contain ${field}`);
    }
    assertEqual(backtestData05Entries[0].sourceReference, 'post-backtest-data-04-v1', 'Backtest-Data Slice 05 must retain the Slice 04 source reference');
    assertEqual(backtestData05Entries[0].targetReference, 'post-backtest-data-05-v1', 'Backtest-Data Slice 05 must target its separate pending candidate');
    assertEqual(backtestData05Entries[0].knownEvidenceDefect.capturedAtUtcStatus, 'invalid_predates_measured_code_state', 'Slice 05 ledger must not present its impossible capture time as valid evidence');
    assertEqual(backtestData05Entries[0].knownEvidenceDefect.goldRuntimeEffectMeasured, false, 'Slice 05 ledger must not infer a gold runtime effect from gold-free MC cases');
    if (postBacktestData05) {
        assertEqual(postBacktestData05.sourceReference, 'post-backtest-data-04-v1', 'Backtest-Data Slice 05 snapshot must reference the prior data snapshot');
        assertEqual(postBacktestData05.snapshotId, 'post-backtest-data-05-v1', 'The Backtest-Data Slice 05 candidate must retain its original immutable revision');
        assertEqual(postBacktestData05.reviewStatus, 'pending', 'The Backtest-Data Slice 05 candidate must remain pending until external review');
        assertEqual(postBacktestData05.goldenCaseIds.length, goldenFixture.cases.length, 'Backtest-Data Slice 05 snapshot must cover every golden-case family');
    }
    const backtestData06Entries = deltaLedger.entries.filter(entry => entry.sliceId === 'BACKTEST-DATA-06');
    assertEqual(backtestData06Entries.length, 2, 'Backtest-Data Slice 06 must preserve V1 and ledger the corrected V2 measurement separately');
    for (const entry of backtestData06Entries) {
        for (const field of deltaLedger.requiredEntryFields) {
            assert(Object.prototype.hasOwnProperty.call(entry, field), `Backtest-Data Slice 06 delta entry must contain ${field}`);
        }
    }
    assertEqual(backtestData06Entries[0].sourceReference, 'post-backtest-data-05-v1', 'Backtest-Data Slice 06 must retain the Slice 05 source reference');
    assertEqual(backtestData06Entries[0].targetReference, 'post-backtest-data-06-v1', 'Backtest-Data Slice 06 must preserve its original pending candidate');
    assertEqual(backtestData06Entries[0].knownEvidenceDefect.numericDeltaCount, 0, 'Slice 06 V1 ledger must disclose that it measured no numeric delta');
    assertEqual(backtestData06Entries[0].knownEvidenceDefect.capeRuntimeEffectMeasured, false, 'Slice 06 V1 ledger must not claim a CAPE runtime measurement');
    assertEqual(backtestData06Entries[0].knownEvidenceDefect.wageRuntimeEffectMeasured, false, 'Slice 06 V1 ledger must not claim a wage runtime measurement');
    assertEqual(backtestData06Entries[1].sourceReference, 'post-backtest-data-06-v1', 'Corrected Slice 06 measurement must retain V1 as its immutable predecessor');
    assertEqual(backtestData06Entries[1].targetReference, 'post-backtest-data-06-v2', 'Corrected Slice 06 measurement must target the V2 candidate');
    assertEqual(backtestData06Entries[1].measurementScope.capeSamplingCaseIncluded, false, 'V2 ledger must disclose missing CAPE sampling coverage');
    assertEqual(backtestData06Entries[1].measurementScope.capeRuntimeEffectMeasured, false, 'V2 ledger must not claim a CAPE runtime effect');
    assertEqual(backtestData06Entries[1].measurementScope.wageIndexedPensionCaseIncluded, false, 'V2 ledger must disclose missing wage-indexed pension coverage');
    assertEqual(backtestData06Entries[1].measurementScope.wageRuntimeEffectMeasured, false, 'V2 ledger must not claim a wage runtime effect');
    assertEqual(backtestData06Entries[1].measurementScope.numericDeltaCount, 0, 'V2 ledger must state the measured zero numeric deltas');
    assertEqual(postBacktestData06V1.snapshotId, 'post-backtest-data-06-v1', 'Original Slice-06 candidate must remain immutable');
    if (postBacktestData06) {
        assertEqual(postBacktestData06.sourceReference, 'post-backtest-data-06-v1', 'Backtest-Data Slice 06 V2 snapshot must reference its immutable predecessor');
        assertEqual(postBacktestData06.snapshotId, 'post-backtest-data-06-v2', 'The active Backtest-Data Slice 06 candidate must be V2');
        assertEqual(postBacktestData06.reviewStatus, 'pending', 'The Backtest-Data Slice 06 candidate must remain pending until external review');
        assertEqual(postBacktestData06.measurementScope.capeRuntimeEffectMeasured, false, 'Slice 06 snapshot must reject a CAPE-effect interpretation');
        assertEqual(postBacktestData06.measurementScope.wageRuntimeEffectMeasured, false, 'Slice 06 snapshot must reject a wage-effect interpretation');
        assertEqual(postBacktestData06.measurementScope.derivedRegimeEffectExpected, false, 'Slice 06 snapshot must not claim CAPE/wage regime effects');
        assertEqual(postBacktestData06.measurementScope.numericDeltaCount, 0, 'Slice 06 snapshot must disclose zero numeric deltas');
        const capturedAtMs = Date.parse(postBacktestData06.capturedAtUtc);
        assert(Number.isFinite(capturedAtMs), 'Slice 06 V2 capture timestamp must be valid ISO time');
        assert(capturedAtMs > Date.parse(postBacktestData06V1.capturedAtUtc), 'Slice 06 V2 capture must postdate its immutable predecessor');
        assert(capturedAtMs <= Date.now() + 60000, 'Slice 06 V2 capture must not be in the future');
        const sourceText = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
        assert(!sourceText.includes(postBacktestData06.capturedAtUtc), 'Slice 06 V2 timestamp must not be a test-source literal');
        assertEqual(postBacktestData06.captureEvidence.measuredHistoricalDataHash, postBacktestData06.metadata.dataVersion.annualDataHash, 'Capture evidence must bind the measured annual-data hash');
    }
    const backtestData07Entries = deltaLedger.entries.filter(entry => entry.sliceId === 'BACKTEST-DATA-07');
    assertEqual(backtestData07Entries.length, 1, 'Backtest-Data Slice 07 must ledger its dedicated demography/care/survivor runtime measurement');
    for (const field of deltaLedger.requiredEntryFields) {
        assert(Object.prototype.hasOwnProperty.call(backtestData07Entries[0], field), `Backtest-Data Slice 07 delta entry must contain ${field}`);
    }
    assertEqual(backtestData07Entries[0].sourceReference, 'post-backtest-data-06-v2', 'Slice 07 measurement must retain the Slice 06 Monte Carlo input reference');
    assertEqual(backtestData07Entries[0].targetReference, 'post-backtest-data-07-v1', 'Slice 07 measurement must target its separate pending candidate');
    assertEqual(postBacktestData07.snapshotId, 'post-backtest-data-07-v1', 'Slice 07 runtime measurement must use the policy identifier');
    assertEqual(postBacktestData07.sourceReference, 'post-backtest-data-06-v2', 'Slice 07 runtime measurement must bind the Slice 06 predecessor');
    assertEqual(postBacktestData07.reviewStatus, 'pending', 'Codex must not approve its own Slice 07 runtime measurement');
    assertEqual(postBacktestData07.effectBoundary.mortalityRuntimeEffectMeasured, true, 'Slice 07 measurement must exercise mortality');
    assertEqual(postBacktestData07.effectBoundary.careRuntimeActive, true, 'Slice 07 measurement must activate care');
    assertEqual(postBacktestData07.effectBoundary.partnerRuntimeActive, true, 'Slice 07 measurement must activate the partner path');
    assertEqual(postBacktestData07.effectBoundary.survivorBenefitRuntimeActive, true, 'Slice 07 measurement must activate survivor benefits');
    assertEqual(postBacktestData07.effectBoundary.sweepRuntimeEffectMeasured, true, 'Slice 07 measurement must include Sweep');
    assertEqual(postBacktestData07.numericDeltaCount, 40, 'Slice 07 measurement must retain all measured numeric deltas');
    assertEqual(postBacktestData07.targetMeasurement.profile.runs, 2048, 'Slice 07 runtime profile must retain its fixed run count');
    assertEqual(postBacktestData07.targetMeasurement.profile.durationYears, 40, 'Slice 07 runtime profile must retain its fixed duration');
    assertEqual(postBacktestData07.targetMeasurement.sweep.length, 2, 'Slice 07 runtime profile must measure both fixed Sweep combinations');
    const slice12Entries = deltaLedger.entries.filter(entry => entry.sliceId === '12');
    assertEqual(slice12Entries.length, 1, 'Slice 12 must ledger the integrated final candidate separately');
    for (const field of deltaLedger.requiredEntryFields) {
        assert(Object.prototype.hasOwnProperty.call(slice12Entries[0], field), `Slice 12 delta entry must contain ${field}`);
    }
    assertEqual(slice12Entries[0].sourceReference, 'post-slice-07-v1', 'Final integration ledger must retain the latest semantic source reference');
    assertEqual(slice12Entries[0].targetReference, 'monte-carlo-v1-final', 'Final integration ledger must target the separate candidate');
    assertEqual(finalCandidate.snapshotId, 'monte-carlo-v1-final', 'Final candidate must use the policy identifier');
    assertEqual(finalCandidate.reviewStatus, 'candidate_pending_external_review', 'Codex must not approve the final candidate');
    assertEqual(finalCandidate.sourceReferences[0], 'pre-hardening-v1', 'Final candidate must retain the immutable baseline lineage');
    assert(finalCandidate.sourceReferences.includes('post-slice-07-v1'), 'Final candidate must retain the latest semantic reference lineage');
    assertEqual(finalCandidate.goldenCaseIds.length, goldenFixture.cases.length, 'Final candidate must cover every approved golden-case family');
}

// Contract 8: every planned rename has producers, consumers, tests and a migration note.
{
    assert(consumerInventory.fields.length >= 8, 'Consumer inventory must cover all known rename families');
    for (const field of consumerInventory.fields) {
        assert(field.currentField && field.targetField, 'Consumer inventory field names must be explicit');
        assert(field.producer.length > 0 && field.consumers.length > 0 && field.tests.length > 0, `${field.currentField} must inventory producers, consumers and tests`);
        for (const file of [...field.producer, ...field.consumers, ...field.tests]) {
            assert(fs.existsSync(path.join(__dirname, '..', file)), `Inventoried consumer path must exist: ${file}`);
        }
        assert(field.migration.length > 20, `${field.currentField} must have a useful migration note`);
    }
}

// Contract 9: resource bounds and reproducible benchmark/convergence profiles are fixed.
{
    const resources = benchmarkContract.resourceContract;
    assertEqual(resources.runs.default, 10000, 'Monte Carlo target default must be 10000 runs');
    assertEqual(resources.runs.interactiveRecommendedMaximum, 100000, 'Interactive recommendation must be 100000 runs');
    assertEqual(resources.runs.hardMaximum, 1000000, 'Hard run maximum must be 1000000');
    assertEqual(resources.runs.silentClampingAllowed, false, 'Run values must not be silently clamped');
    assertEqual(resources.durationYears.mortalityTableMaximumAge, 110, 'Duration bound must reference the mortality-table maximum');
    assertEqual(resources.durationYears.storageMaximum, 4294967295, 'Duration storage bound must match the Uint32 contract');
    assertEqual(Math.min(resources.durationYears.storageMaximum, resources.durationYears.mortalityTableMaximumAge - 65 + 1), 46, 'Duration formula must be reproducible for age 65');
    assertEqual(resources.blockLengthYears.configuredMaximum, 30, 'Block length maximum must be fixed');
    assertEqual(resources.workerCount.benchmarkValue, 8, 'Benchmark worker count must be fixed at 8');
    assertEqual(resources.jobTimeBudgetMs.benchmarkValue, 500, 'Benchmark time budget must be fixed at 500 ms');
    assertJsonEqual(benchmarkContract.profiles.standard, { runs: 100000, durationYears: 35, workerCount: 8, jobTimeBudgetMs: 500, scenarioId: 'base', seed: 12345 }, 'Standard benchmark profile must be fixed');
    assertJsonEqual(benchmarkContract.profiles.stress, { runs: 1000000, durationYears: 35, workerCount: 8, jobTimeBudgetMs: 500, scenarioId: 'base', seed: 12345 }, 'Stress benchmark profile must be fixed');
    assert(benchmarkContract.profiles.weakReference.workerCount < benchmarkContract.profiles.standard.workerCount, 'Weak reference must use fewer workers');
    assert(benchmarkContract.convergenceCases.length >= 3, 'Convergence ledger must fix several seed/scenario pairs');
    assert(new Set(benchmarkContract.convergenceCases.map(entry => entry.seed)).size >= 3, 'Convergence cases must use several fixed seeds');
    assert(new Set(benchmarkContract.convergenceCases.map(entry => entry.scenarioId)).size >= 3, 'Convergence cases must use several fixed scenarios');
}

// Contract 9a: time-boxed V1 KPI aliases are absent from productive readers.
{
    assertEqual(MONTE_CARLO_LEGACY_READ_ALIASES.length, 0, 'Public V1 legacy read-alias registry must remain empty after Slice 11');
    const removedAliases = ['kpiKuerzungsjahre', 'consumptionAtRiskP10Real'];
    const productiveReaders = [
        'app/simulator/results-metrics.js',
        'app/simulator/simulator-results.js',
        'app/simulator/simulator-monte-carlo.js',
        'app/simulator/monte-carlo-contracts.js',
        'app/simulator/monte-carlo-export.js',
        'app/simulator/auto-optimize-evaluate.js',
        'app/simulator/auto-optimize-metrics.js',
        'app/simulator/auto-optimize-renderer.js'
    ];
    for (const relativePath of productiveReaders) {
        const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
        for (const alias of removedAliases) {
            assert(!source.includes(`.${alias}`) && !source.includes(`[\"${alias}\"]`) && !source.includes(`['${alias}']`), `${relativePath} must not consume removed alias ${alias}`);
        }
    }
}

// Contract 10: the fixed worker snapshot uses the same runner fixture as direct execution.
const fixedWorkerResult = await runWorkerLayout(
    preHardening.runnerCase,
    preHardening.metadata.workerConfiguration.workerCount,
    preHardening.metadata.chunkPolicy.ranges
);
const actualDataVersion = getDataVersion();
const actualSnapshotResult = samplingSnapshotProjection(fixedWorkerResult);
const actualSlice07Result = carUncertaintySnapshotProjection(fixedWorkerResult);
if (process.env.MC_PRINT_SLICE_03 === '1') {
    console.log('__POST_SLICE_03_CAPTURE_START__');
    console.log(JSON.stringify({ dataVersion: actualDataVersion, result: riskKpiSnapshotProjection(fixedWorkerResult) }, null, 2));
    console.log('__POST_SLICE_03_CAPTURE_END__');
}
if (process.env.MC_PRINT_SLICE_05 === '1') {
    console.log('__POST_SLICE_05_CAPTURE_START__');
    console.log(JSON.stringify({ dataVersion: actualDataVersion, result: outcomeHorizonSnapshotProjection(fixedWorkerResult) }, null, 2));
    console.log('__POST_SLICE_05_CAPTURE_END__');
}
if (process.env.MC_PRINT_SLICE_06 === '1') {
    console.log('__POST_SLICE_06_CAPTURE_START__');
    console.log(JSON.stringify({ dataVersion: actualDataVersion, result: actualSnapshotResult }, null, 2));
    console.log('__POST_SLICE_06_CAPTURE_END__');
}
if (process.env.MC_PRINT_SLICE_07 === '1') {
    console.log('__POST_SLICE_07_CAPTURE_START__');
    console.log(JSON.stringify({ dataVersion: actualDataVersion, result: actualSlice07Result }, null, 2));
    console.log('__POST_SLICE_07_CAPTURE_END__');
}
if (process.env.MC_PRINT_FINAL === '1') {
    console.log('__MONTE_CARLO_V1_FINAL_CAPTURE_START__');
    console.log(JSON.stringify({ dataVersion: actualDataVersion, result: finalCandidateSnapshotProjection(fixedWorkerResult) }, null, 2));
    console.log('__MONTE_CARLO_V1_FINAL_CAPTURE_END__');
}
if (process.env.MC_PRINT_SUITE_DATA_11 === '1') {
    console.log('__POST_SUITE_DATA_11_CAPTURE_START__');
    console.log(JSON.stringify({ dataVersion: actualDataVersion, result: autoOptimizeMetricsSnapshotProjection(fixedWorkerResult) }, null, 2));
    console.log('__POST_SUITE_DATA_11_CAPTURE_END__');
}
const actualFinalProjection = finalCandidateSnapshotProjection(fixedWorkerResult);
const actualAutoOptimizeProjection = autoOptimizeMetricsSnapshotProjection(fixedWorkerResult);
const actualBacktestData02Snapshot = {
    schemaVersion: 'monte-carlo-post-slice-snapshot-v1',
    snapshotId: 'post-backtest-data-02-v3',
    sourceReference: 'post-suite-data-02-v1',
    sliceId: 'BACKTEST-DATA-02',
    reviewStatus: 'pending',
    capturedAtUtc: '2026-07-29T00:00:00.000Z',
    goldenCaseIds: ['GC-RISK-01', 'GC-CUT-01', 'GC-CARE-01', 'GC-OUTCOME-01', 'GC-SAMPLING-01', 'GC-CAR-01'],
    metadata: {
        seed: preHardening.metadata.seed,
        dataVersion: actualDataVersion,
        runtime: {
            kind: 'node',
            version: process.version,
            platform: process.platform,
            architecture: process.arch
        },
        numericTolerance: postSuiteData02.metadata.numericTolerance
    },
    carResult: actualSlice07Result,
    autoOptimizeResult: actualAutoOptimizeProjection,
    result: actualFinalProjection
};
const actualBacktestData03Snapshot = {
    schemaVersion: 'monte-carlo-post-slice-snapshot-v1',
    snapshotId: 'post-backtest-data-03-v1',
    sourceReference: 'post-backtest-data-02-v3',
    sliceId: 'BACKTEST-DATA-03',
    reviewStatus: 'pending',
    capturedAtUtc: '2026-07-29T00:00:00.000Z',
    goldenCaseIds: ['GC-RISK-01', 'GC-CUT-01', 'GC-CARE-01', 'GC-OUTCOME-01', 'GC-SAMPLING-01', 'GC-CAR-01'],
    metadata: {
        seed: preHardening.metadata.seed,
        dataVersion: actualDataVersion,
        runtime: {
            kind: 'node',
            version: process.version,
            platform: process.platform,
            architecture: process.arch
        },
        numericTolerance: postBacktestData02?.metadata.numericTolerance
            ?? postSuiteData02.metadata.numericTolerance
    },
    carResult: actualSlice07Result,
    autoOptimizeResult: actualAutoOptimizeProjection,
    result: actualFinalProjection
};
const actualBacktestData04Snapshot = {
    schemaVersion: 'monte-carlo-post-slice-snapshot-v1',
    snapshotId: 'post-backtest-data-04-v1',
    sourceReference: 'post-backtest-data-03-v1',
    sliceId: 'BACKTEST-DATA-04',
    reviewStatus: 'pending',
    capturedAtUtc: '2026-07-29T00:00:00.000Z',
    goldenCaseIds: ['GC-RISK-01', 'GC-CUT-01', 'GC-CARE-01', 'GC-OUTCOME-01', 'GC-SAMPLING-01', 'GC-CAR-01'],
    metadata: {
        seed: preHardening.metadata.seed,
        dataVersion: actualDataVersion,
        runtime: {
            kind: 'node',
            version: process.version,
            platform: process.platform,
            architecture: process.arch
        },
        numericTolerance: postBacktestData03.metadata.numericTolerance
    },
    carResult: actualSlice07Result,
    autoOptimizeResult: actualAutoOptimizeProjection,
    result: actualFinalProjection
};
const actualBacktestData05Snapshot = {
    schemaVersion: 'monte-carlo-post-slice-snapshot-v1',
    snapshotId: 'post-backtest-data-05-v1',
    sourceReference: 'post-backtest-data-04-v1',
    sliceId: 'BACKTEST-DATA-05',
    reviewStatus: 'pending',
    capturedAtUtc: '2026-07-30T00:00:00.000Z',
    goldenCaseIds: ['GC-RISK-01', 'GC-CUT-01', 'GC-CARE-01', 'GC-OUTCOME-01', 'GC-SAMPLING-01', 'GC-CAR-01'],
    metadata: {
        seed: preHardening.metadata.seed,
        dataVersion: actualDataVersion,
        runtime: {
            kind: 'node',
            version: process.version,
            platform: process.platform,
            architecture: process.arch
        },
        numericTolerance: postBacktestData04?.metadata.numericTolerance
            ?? postBacktestData03.metadata.numericTolerance
    },
    carResult: actualSlice07Result,
    autoOptimizeResult: actualAutoOptimizeProjection,
    result: actualFinalProjection
};
const slice06CaptureTimestamp = UPDATE_REFERENCE_ID === 'post-backtest-data-06-v2'
    ? new Date().toISOString()
    : postBacktestData06?.capturedAtUtc;
if (typeof slice06CaptureTimestamp !== 'string') {
    throw new Error('Slice-06 V2 capture timestamp is unavailable outside immutable candidate creation');
}
const actualBacktestData06Snapshot = {
    schemaVersion: 'monte-carlo-post-slice-snapshot-v1',
    snapshotId: 'post-backtest-data-06-v2',
    sourceReference: 'post-backtest-data-06-v1',
    sliceId: 'BACKTEST-DATA-06',
    reviewStatus: 'pending',
    capturedAtUtc: slice06CaptureTimestamp,
    goldenCaseIds: ['GC-RISK-01', 'GC-CUT-01', 'GC-CARE-01', 'GC-OUTCOME-01', 'GC-SAMPLING-01', 'GC-CAR-01'],
    measurementScope: {
        goldHoldingCaseIncluded: false,
        goldRuntimeEffectMeasured: false,
        capeSamplingCaseIncluded: false,
        capeRuntimeEffectMeasured: false,
        wageIndexedPensionCaseIncluded: false,
        wageRuntimeEffectMeasured: false,
        derivedRegimeEffectExpected: false,
        numericDeltaCount: 0,
        sharedAnnualDataFingerprintOnly: true,
        interpretation: 'The fixed Monte Carlo golden cases request neither CAPE start-year sampling nor wage-indexed pension escalation and hold no gold. Regimes depend only on equity return and inflation. Therefore no numeric result delta is expected or claimed; this candidate fingerprints the changed annual-data hash and provenance only. Runtime CAPE and wage effects are evidenced by separate backtest and CAPE-sampling delta oracles.'
    },
    captureEvidence: {
        clockSource: 'new Date().toISOString() evaluated during immutable candidate creation',
        creationGuard: 'MC_UPDATE_REFERENCE=post-backtest-data-06-v2 with refuse-overwrite semantics',
        predecessorSnapshotId: postBacktestData06V1.snapshotId,
        measuredHistoricalDataHash: actualDataVersion.annualDataHash
    },
    metadata: {
        seed: preHardening.metadata.seed,
        dataVersion: actualDataVersion,
        runtime: {
            kind: 'node',
            version: process.version,
            platform: process.platform,
            architecture: process.arch
        },
        numericTolerance: postBacktestData06V1.metadata.numericTolerance
            ?? postBacktestData05?.metadata.numericTolerance
            ?? postBacktestData04?.metadata.numericTolerance
            ?? postBacktestData03.metadata.numericTolerance
    },
    carResult: actualSlice07Result,
    autoOptimizeResult: actualAutoOptimizeProjection,
    result: actualFinalProjection
};
if (UPDATE_REFERENCE_ID) {
    const candidates = new Map([
        [actualBacktestData02Snapshot.snapshotId, actualBacktestData02Snapshot],
        [actualBacktestData03Snapshot.snapshotId, actualBacktestData03Snapshot],
        [actualBacktestData04Snapshot.snapshotId, actualBacktestData04Snapshot],
        [actualBacktestData05Snapshot.snapshotId, actualBacktestData05Snapshot],
        [actualBacktestData06Snapshot.snapshotId, actualBacktestData06Snapshot]
    ]);
    const candidate = candidates.get(UPDATE_REFERENCE_ID);
    if (!candidate) {
        throw new Error(`Unsupported MC_UPDATE_REFERENCE target: ${UPDATE_REFERENCE_ID}`);
    }
    const candidatePath = path.join(fixtureDir, `${candidate.snapshotId}.json`);
    if (fs.existsSync(candidatePath)) {
        throw new Error(`Refusing to overwrite immutable Monte Carlo candidate ${candidate.snapshotId}`);
    }
    fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8');
    throw new Error(
        `Created ${candidate.snapshotId}.json as an unvalidated candidate; rerun without `
        + 'MC_UPDATE_REFERENCE to validate live output against the stored candidate'
    );
}

assertJsonEqual(postSlice03.metadata.dataVersion, finalCandidate.metadata.dataVersion, 'Immutable Monte Carlo references should retain their original data version');
assert(preHardening.result !== null, 'Immutable pre-hardening result must remain captured');
assertEqual(preHardening.result.bufferBytesPerRun, 63, 'Immutable pre-hardening buffer evidence must remain unchanged');
assertJsonEqual(preHardening.result.buffers.volatilities, preHardening.result.buffers.maxDrawdowns, 'Immutable baseline must retain the documented pre-fix volatility defect');
const activeSnapshot = postBacktestData06;
const slice08ExpectedFixture = JSON.parse(fs.readFileSync(slice08MeasurementPath, 'utf8'));
const slice09ExpectedFixture = JSON.parse(fs.readFileSync(slice09MeasurementPath, 'utf8'));
const sameRuntime = process.version === slice08ExpectedFixture.targetMeasurement.runtime.node
    && process.platform === slice08ExpectedFixture.targetMeasurement.runtime.platform
    && process.arch === slice08ExpectedFixture.targetMeasurement.runtime.architecture;
assertEqual(postSlice03.result.aggregates.volatilities.p50 !== postSlice03.result.aggregates.maxDrawdowns.p50, true, 'Immutable Post-Slice-03 reference retains separated volatility and drawdown semantics');
assertJsonEqual(postSlice03.metadata.dataVersion, postSlice05.metadata.dataVersion, 'Post-Slice-05 should retain the immutable prior data version');
assertEqual(postSlice05.result.outcomeInventory.schemaVersion, 'MonteCarloOutcomeInventoryV1', 'Immutable Post-Slice-05 reference retains the outcome contract');
assertEqual(postSlice05.result.bufferBytesPerRun, 75, 'Immutable Post-Slice-05 reference retains its buffer evidence');
assertJsonEqual(postSlice03.metadata.dataVersion, postSlice06.metadata.dataVersion, 'Post-Slice-06 should retain the immutable prior data version');
assertEqual(postSlice06.result.bufferBytesPerRun, 75, 'Immutable Post-Slice-06 reference retains its buffer evidence');
assertJsonEqual(postSlice03.metadata.dataVersion, postSlice07.metadata.dataVersion, 'Post-Slice-07 should retain the immutable prior data version');
assertJsonEqual(actualDataVersion, activeSnapshot.metadata.dataVersion, 'Backtest-Data Slice 06 data version must match');
const slice06NumericDeltas = collectNumericLeafDeltas(
    {
        carResult: postBacktestData05.carResult,
        autoOptimizeResult: postBacktestData05.autoOptimizeResult,
        result: postBacktestData05.result
    },
    {
        carResult: activeSnapshot.carResult,
        autoOptimizeResult: activeSnapshot.autoOptimizeResult,
        result: activeSnapshot.result
    }
);
assertEqual(slice06NumericDeltas.length, 0, 'Slice 06 Monte Carlo golden cases must truthfully report zero numeric result deltas');
assertEqual(activeSnapshot.measurementScope.numericDeltaCount, slice06NumericDeltas.length, 'Slice 06 measurement scope must equal the measured numeric delta count');
assertEqual(
    activeSnapshot.metadata.dataVersion.regimeHash,
    postBacktestData05.metadata.dataVersion.regimeHash,
    'CAPE and wage replacement must not claim a derived-regime change'
);
const slice06ChangedLeafPaths = collectLeafDiffPaths(postBacktestData05, activeSnapshot);
assertJsonEqual(
    slice06ChangedLeafPaths,
    [
        '$.captureEvidence',
        '$.capturedAtUtc',
        '$.measurementScope',
        '$.metadata.dataVersion.annualDataHash',
        '$.result.result.samplingDiagnostics.dataVersion.annualDataHash',
        '$.sliceId',
        '$.snapshotId',
        '$.sourceReference'
    ],
    'Slice 06 Monte Carlo V2 should have the exact eight-leaf identity/provenance boundary'
);
const slice06UnexpectedLeafPaths = slice06ChangedLeafPaths.filter(pathName => ![
    '$.capturedAtUtc',
    '$.metadata.dataVersion.annualDataHash',
    '$.result.result.samplingDiagnostics.dataVersion.annualDataHash',
    '$.sliceId',
    '$.snapshotId',
    '$.sourceReference'
].includes(pathName)
    && pathName !== '$.measurementScope'
    && pathName !== '$.captureEvidence'
    && !pathName.startsWith('$.measurementScope.')
    && !pathName.startsWith('$.captureEvidence.'));
assertJsonEqual(slice06UnexpectedLeafPaths, [], 'Slice 06 Monte Carlo V2 must change only identity, capture, scope and annual-data provenance fields');
const slice08PreviousProjection = {
    carResult: activeSnapshot.carResult,
    autoOptimizeResult: activeSnapshot.autoOptimizeResult,
    result: omitHistoricalFixtureCompatibilityFields(activeSnapshot.result)
};
const slice08CurrentProjection = {
    carResult: actualSlice07Result,
    autoOptimizeResult: actualAutoOptimizeProjection,
    result: actualFinalProjection
};
const slice08ChangedLeafPaths = collectLeafDiffPaths(slice08PreviousProjection, slice08CurrentProjection);
const slice08NumericDeltas = collectNumericLeafDeltas(slice08PreviousProjection, slice08CurrentProjection);
const sha256Json = value => createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
const currentSlice08Measurement = {
    schemaVersion: 'LiquidityRunwayMonteCarloMeasurementV1',
    snapshotId: 'post-backtest-data-08-v1',
    sourceReference: 'post-backtest-data-07-v1',
    projectionSourceReference: 'post-backtest-data-06-v2',
    sourceResultDocument: 'docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_07_DEMOGRAFIE_PFLEGE_HINTERBLIEBENE.md',
    reviewStatus: 'pending',
    carResultSha256: sha256Json(actualSlice07Result),
    autoOptimizeResultSha256: sha256Json(actualAutoOptimizeProjection),
    finalResultSha256: sha256Json(actualFinalProjection),
    changedLeafCount: slice08ChangedLeafPaths.length,
    changedLeafPaths: slice08ChangedLeafPaths,
    changedLeafPathsSha256: sha256Json(slice08ChangedLeafPaths),
    numericDeltaCount: slice08NumericDeltas.length,
    numericDeltasSha256: sha256Json(slice08NumericDeltas)
};
if (process.env.MC_PRINT_SLICE_08 === '1') {
    console.log('__POST_BACKTEST_DATA_08_CAPTURE_START__');
    console.log(JSON.stringify(currentSlice08Measurement, null, 2));
    console.log('__POST_BACKTEST_DATA_08_CAPTURE_END__');
}
const slice08FixtureSha256 = createHash('sha256')
    .update(fs.readFileSync(slice08MeasurementPath))
    .digest('hex');
const currentSlice09Measurement = {
    schemaVersion: 'MinimumFlexMonteCarloSweepMeasurementV1',
    snapshotId: 'post-backtest-data-09-v1',
    sourceReference: 'post-backtest-data-08-v1',
    sourceFixtureSha256: slice08FixtureSha256,
    sourceResultDocument: 'docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_08_LIQUIDITAETS_RUNWAY_PUFFERVERTRAG.md',
    targetResultDocument: 'docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_09_FLOOR_MINDEST_FLEX_STABILISATOR.md',
    reviewStatus: 'pending',
    measurementScope: {
        monteCarloAggregateProjectionMeasured: true,
        sweepAggregateProjectionMeasured: true,
        minimumFlexRowDiagnosticsMeasuredHere: false,
        minimumFlexRowDiagnosticsEvidence: 'tests/worker-parity.test.mjs and tests/simulator-backtest-characterization.test.mjs'
    },
    sourceProjectionHashes: {
        carResultSha256: slice08ExpectedFixture.carResultSha256,
        autoOptimizeResultSha256: slice08ExpectedFixture.autoOptimizeResultSha256,
        finalResultSha256: slice08ExpectedFixture.finalResultSha256
    },
    targetProjectionHashes: {
        carResultSha256: sha256Json(actualSlice07Result),
        autoOptimizeResultSha256: sha256Json(actualAutoOptimizeProjection),
        finalResultSha256: sha256Json(actualFinalProjection)
    },
    changedProjectionCount: [
        ['carResultSha256', sha256Json(actualSlice07Result)],
        ['autoOptimizeResultSha256', sha256Json(actualAutoOptimizeProjection)],
        ['finalResultSha256', sha256Json(actualFinalProjection)]
    ].filter(([key, value]) => slice08ExpectedFixture[key] !== value).length,
    economicAggregateDeltaExpected: false
};
if (process.env.MC_PRINT_SLICE_09 === '1') {
    console.log('__POST_BACKTEST_DATA_09_CAPTURE_START__');
    console.log(JSON.stringify(currentSlice09Measurement, null, 2));
    console.log('__POST_BACKTEST_DATA_09_CAPTURE_END__');
}
assertEqual(slice08FixtureSha256, slice09ExpectedFixture.sourceFixtureSha256, 'Slice 09 must consume the byte-identical Slice-08 Monte Carlo fixture');
const slice09FixtureSha256 = createHash('sha256')
    .update(fs.readFileSync(slice09MeasurementPath))
    .digest('hex');
const currentSlice10Measurement = {
    schemaVersion: 'TaxLogicSlice10MonteCarloMeasurementV1',
    snapshotId: 'post-backtest-data-10-v1',
    sourceReference: 'post-backtest-data-09-v1',
    sourceFixtureSha256: slice09FixtureSha256,
    sourceResultDocument: 'docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_09_FLOOR_MINDEST_FLEX_STABILISATOR.md',
    targetResultDocument: 'docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_10_HEUTIGE_STEUERLOGIK.md',
    reviewStatus: 'pending',
    sourceProjectionHashes: slice09ExpectedFixture.targetProjectionHashes,
    targetProjectionHashes: {
        carResultSha256: sha256Json(actualSlice07Result),
        autoOptimizeResultSha256: sha256Json(actualAutoOptimizeProjection),
        finalResultSha256: sha256Json(actualFinalProjection)
    },
    changedProjectionCount: [
        ['carResultSha256', sha256Json(actualSlice07Result)],
        ['autoOptimizeResultSha256', sha256Json(actualAutoOptimizeProjection)],
        ['finalResultSha256', sha256Json(actualFinalProjection)]
    ].filter(([key, value]) => slice09ExpectedFixture.targetProjectionHashes[key] !== value).length,
    economicAggregateDeltaExpected: true
};
if (process.env.MC_PRINT_SLICE_10 === '1') {
    console.log('__POST_BACKTEST_DATA_10_CAPTURE_START__');
    console.log(JSON.stringify(currentSlice10Measurement, null, 2));
    console.log('__POST_BACKTEST_DATA_10_CAPTURE_END__');
} else {
    const slice10FixtureBytes = fs.readFileSync(slice10MeasurementPath);
    assertEqual(
        createHash('sha256').update(slice10FixtureBytes).digest('hex'),
        'f6d0b4fab497d63d9a7a12eaaeda307b9ee01163585ebc97bbb48569d82935ba',
        'Immutable Slice-10 Monte Carlo measurement must remain byte-identical'
    );
}
const slice10FixtureBytes = fs.readFileSync(slice10MeasurementPath);
const slice10ExpectedFixture = JSON.parse(slice10FixtureBytes.toString('utf8'));
assertEqual(slice10ExpectedFixture.changedProjectionCount, 3,
    'Archived Slice 10 tax logic must retain its three changed Monte Carlo/Sweep projections');
const slice17TargetProjectionHashes = {
    carResultSha256: sha256Json(actualSlice07Result),
    autoOptimizeResultSha256: sha256Json(actualAutoOptimizeProjection),
    finalResultSha256: sha256Json(actualFinalProjection)
};
const currentSlice17Measurement = {
    schemaVersion: 'LiquidityRunwayBasisSlice17MonteCarloMeasurementV1',
    sourceReference: slice10ExpectedFixture.snapshotId,
    sourceFixtureSha256: createHash('sha256').update(slice10FixtureBytes).digest('hex'),
    targetResultDocument: 'docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_17_RUNWAY_BASIS_BUGFIX.md',
    reviewStatus: 'pending_external_review',
    sourceProjectionHashes: slice10ExpectedFixture.targetProjectionHashes,
    targetProjectionHashes: slice17TargetProjectionHashes,
    measuredProjectionCount: Object.keys(slice17TargetProjectionHashes).length,
    cause: 'planned_withdrawal_controls_liquidity_while_safety_retains_pre_policy_need'
};
const slice17FixtureBytes = fs.readFileSync(slice17MeasurementPath);
assertEqual(
    createHash('sha256').update(slice17FixtureBytes).digest('hex'),
    '9a733a9cf5454d038e178250e0904d564244657c35173d0a5b899ec54312f241',
    'Immutable Slice-17 combined measurement must remain byte-identical for Slice-03'
);
const expectedSlice17 = JSON.parse(slice17FixtureBytes.toString('utf8')).monteCarlo;
const safetyPolicySlice03MonteCarloMeasurement = {
    schemaVersion: 'SafetyPolicySlice03MonteCarloMeasurementV1',
    sourceReference: 'post-backtest-data-17-v1',
    sourceFixtureSha256: createHash('sha256').update(slice17FixtureBytes).digest('hex'),
    targetResultDocument: 'docs/internal/SLICE_ABSCHLUSSHAERTUNG_03_SAFETY_POLICY_PRIORITAET.md',
    reviewStatus: 'pending_external_review',
    sourceProjectionHashes: expectedSlice17.targetProjectionHashes,
    targetProjectionHashes: slice17TargetProjectionHashes,
    changedProjectionCount: Object.entries(slice17TargetProjectionHashes)
        .filter(([key, value]) => expectedSlice17.targetProjectionHashes[key] !== value)
        .length,
    measuredProjectionCount: Object.keys(slice17TargetProjectionHashes).length,
    technicalErrorCount: actualFinalProjection?.result?.technicalInventory?.technicalError ?? null,
    requestedRuns: actualFinalProjection?.result?.technicalInventory?.requested ?? null,
    financiallyEvaluableRuns: actualFinalProjection?.result?.technicalInventory?.financiallyEvaluable ?? null,
    cause: 'structural_safety_cap_changes_withdrawals_without_changing_sampling_or_worker_contracts'
};
assertEqual(safetyPolicySlice03MonteCarloMeasurement.technicalErrorCount, 0,
    'Slice-03 fixed Monte Carlo evidence must contain no technical path errors');
assertEqual(
    safetyPolicySlice03MonteCarloMeasurement.financiallyEvaluableRuns,
    safetyPolicySlice03MonteCarloMeasurement.requestedRuns,
    'Slice-03 fixed Monte Carlo evidence must retain every requested run as financially evaluable'
);
if (process.env.MC_PRINT_SAFETY_POLICY_SLICE_03 === '1') {
    console.log('__SAFETY_POLICY_SLICE_03_MONTE_CARLO_START__');
    console.log(JSON.stringify(safetyPolicySlice03MonteCarloMeasurement, null, 2));
    console.log('__SAFETY_POLICY_SLICE_03_MONTE_CARLO_END__');
} else {
    const expectedSafetyPolicySlice03 = JSON.parse(
        fs.readFileSync(safetyPolicySlice03MeasurementPath, 'utf8')
    ).monteCarlo;
    compareSnapshotNode(
        safetyPolicySlice03MonteCarloMeasurement,
        expectedSafetyPolicySlice03,
        'safetyPolicySlice03.monteCarlo',
        sameRuntime,
        activeSnapshot.metadata.numericTolerance
    );
}
assertEqual(MONTE_CARLO_SNAPSHOT_POLICY.finalCandidate, finalCandidate.snapshotId, 'Public snapshot policy must name the integrated final candidate');
assertEqual(
    MONTE_CARLO_SNAPSHOT_POLICY.currentReference,
    null,
    'Public snapshot policy must expose no current reference while every available successor remains pending'
);
assertEqual(
    MONTE_CARLO_SNAPSHOT_POLICY.policy,
    'immutable-baseline-with-versioned-pending-candidates',
    'Public snapshot policy must describe pending candidates rather than promoted post-slice references'
);
assertEqual(
    MONTE_CARLO_SNAPSHOT_POLICY.promotionRule,
    'current-reference-remains-null-until-external-approval',
    'Public snapshot policy must require external approval before reference promotion'
);
assertEqual(
    Object.hasOwn(MONTE_CARLO_SNAPSHOT_POLICY, 'ignoredHistoricalFixtureFields'),
    false,
    'Public snapshot policy must not expose fixture-specific ignore paths'
);
assertEqual(activeSnapshot.reviewStatus, 'pending', 'The active measurement target should remain a pending candidate');

const directChunk = await runMonteCarloChunk({
    ...preHardening.runnerCase,
    runRange: { start: 0, count: preHardening.runnerCase.monteCarloParams.anzahl },
    engine: EngineAPI
});
const directAccumulator = createAccumulator(preHardening.runnerCase.monteCarloParams.anzahl, directChunk);
mergeChunkIntoAccumulator(directAccumulator, directChunk, 0, preHardening.runnerCase.monteCarloParams.anzahl);
const directResult = finalizeAccumulator(directAccumulator, preHardening.runnerCase.inputs);
assertJsonEqual(determinismProjection(fixedWorkerResult), determinismProjection(directResult), 'Direct runner and fixed worker snapshot must share one fixture and exact per-run values');

// Contract 11: 1/2/4-worker layouts and three chunk boundaries are exact in one runtime.
{
    const totalRuns = preHardening.runnerCase.monteCarloParams.anzahl;
    const firstHalf = Math.floor(totalRuns / 2);
    const layouts = [
        { workerCount: 1, ranges: [{ start: 0, count: totalRuns }] },
        { workerCount: 2, ranges: [{ start: 0, count: firstHalf }, { start: firstHalf, count: totalRuns - firstHalf }] },
        { workerCount: 4, ranges: [{ start: 0, count: 1 }, { start: 1, count: 2 }, { start: 3, count: 1 }, { start: 4, count: totalRuns - 4 }] }
    ];
    const expected = determinismProjection(directResult);
    for (const layout of layouts) {
        const result = await runWorkerLayout(preHardening.runnerCase, layout.workerCount, layout.ranges);
        for (const values of Object.values(result.buffers)) {
            assert(Array.from(values).every(Number.isFinite), `${layout.workerCount}-worker per-run floats must be finite`);
        }
        assertJsonEqual(determinismProjection(result), expected, `${layout.workerCount}-worker/chunk layout must be exact in the same runtime`);
    }
}

// Contract 12: committed benchmark evidence is mandatory for an ordinary test run.
if (process.env.MC_ALLOW_PENDING_MEASUREMENTS === '1' || process.env.MC_PRINT_BASELINE === '1') {
    assert(['pending-measurement', 'completed'].includes(benchmarkResults.status), 'Benchmark result state must be recognized');
} else {
    assertEqual(benchmarkResults.status, 'completed', 'Benchmark evidence must be completed');
    assert(/^v\d+\./.test(benchmarkResults.environment.runtime), 'Benchmark evidence must identify its Node runtime');
    assert(typeof benchmarkResults.environment.platform === 'string' && benchmarkResults.environment.platform.length > 0, 'Benchmark evidence must identify its platform');
    assert(typeof benchmarkResults.environment.architecture === 'string' && benchmarkResults.environment.architecture.length > 0, 'Benchmark evidence must identify its architecture');
    assert(Number.isInteger(benchmarkResults.environment.logicalCpuCount) && benchmarkResults.environment.logicalCpuCount > 0, 'Benchmark evidence must identify its logical CPU count');
    for (const profileName of ['standard', 'stress', 'weakReference']) {
        const evidence = benchmarkResults.measurements.find(entry => entry.profileName === profileName);
        assert(evidence, `Benchmark evidence must include ${profileName}`);
        assertJsonEqual(evidence.profile, benchmarkContract.profiles[profileName], `${profileName} evidence must use the fixed profile`);
        assertEqual(evidence.measurement.completedRuns, evidence.profile.runs, `${profileName} evidence must complete every requested run`);
        assertEqual(evidence.measurement.technicalErrorRuns, 0, `${profileName} evidence must contain no technical errors`);
        for (const field of ['durationMs', 'peakRssBytes', 'peakHeapUsedBytes', 'cancellationReactionMs', 'bufferBytesPerRun', 'estimatedWorkerPayloadBytesPerRun']) {
            assert(Number.isFinite(evidence.measurement[field]) && evidence.measurement[field] >= 0, `${profileName} evidence must contain finite ${field}`);
        }
        for (const kpi of benchmarkContract.reportedKpis) {
            assert(Number.isFinite(evidence.kpis[kpi]), `${profileName} evidence must contain finite ${kpi}`);
        }
    }
    assertEqual(benchmarkResults.convergence.length, benchmarkContract.convergenceCases.length, 'Every convergence case must have evidence');
    assertJsonEqual(
        benchmarkResults.convergence.map(entry => entry.id),
        benchmarkContract.convergenceCases.map(entry => entry.id),
        'Convergence evidence must use the fixed case order and IDs'
    );
    for (const evidence of benchmarkResults.convergence) {
        assertEqual(evidence.lowRuns, 100000, `${evidence.id} must record the low run count`);
        assertEqual(evidence.highRuns, 1000000, `${evidence.id} must record the high run count`);
        for (const kpi of benchmarkContract.reportedKpis) {
            assertClose(
                evidence.highKpis[kpi] - evidence.lowKpis[kpi],
                evidence.deltaHighMinusLow[kpi],
                1e-12,
                `${evidence.id} must reproduce the recorded delta for ${kpi}`
            );
        }
    }
}

const requestedProfile = process.env.MC_MEASUREMENT_PROFILE;
if (requestedProfile) {
    if (requestedProfile === 'convergence') {
        const requestedCase = process.env.MC_CONVERGENCE_CASE;
        const cases = requestedCase
            ? benchmarkContract.convergenceCases.filter(entry => entry.id === requestedCase)
            : benchmarkContract.convergenceCases;
        assert(cases.length > 0, `Measurement profile must contain convergence case: ${requestedCase}`);
        const evidence = [];
        for (const convergenceCase of cases) {
            const measurements = [];
            for (const runs of convergenceCase.runCounts) {
                measurements.push(await runAdaptiveBenchmark({
                    runs,
                    durationYears: 35,
                    workerCount: 8,
                    jobTimeBudgetMs: 500,
                    scenarioId: convergenceCase.scenarioId,
                    seed: convergenceCase.seed
                }, { retainRunMeta: false, includeCancellation: false }));
            }
            evidence.push({
                id: convergenceCase.id,
                lowRuns: measurements[0].profile.runs,
                highRuns: measurements[1].profile.runs,
                lowKpis: measurements[0].kpis,
                highKpis: measurements[1].kpis,
                deltaHighMinusLow: computeKpiDelta(measurements[0], measurements[1])
            });
        }
        console.log('__MC_CONVERGENCE_RESULT_START__');
        console.log(JSON.stringify(evidence, null, 2));
        console.log('__MC_CONVERGENCE_RESULT_END__');
        assert(evidence.every(entry => entry.lowRuns === 100000 && entry.highRuns === 1000000), 'Convergence evidence must compare 100000 with 1000000 runs');
    } else {
        const profile = benchmarkContract.profiles[requestedProfile];
        assert(profile, `Measurement profile must exist: ${requestedProfile}`);
        const evidence = await runAdaptiveBenchmark(profile);
        console.log('__MC_BENCHMARK_RESULT_START__');
        console.log(JSON.stringify({ profileName: requestedProfile, ...evidence }, null, 2));
        console.log('__MC_BENCHMARK_RESULT_END__');
        assertEqual(evidence.measurement.completedRuns, profile.runs, `${requestedProfile} must complete every run`);
        assertEqual(evidence.measurement.technicalErrorRuns, 0, `${requestedProfile} must have no technical-error paths`);
        assert(Number.isFinite(evidence.measurement.durationMs) && evidence.measurement.durationMs > 0, `${requestedProfile} must record duration`);
        assert(Number.isFinite(evidence.measurement.peakRssBytes) && evidence.measurement.peakRssBytes > 0, `${requestedProfile} must record peak memory`);
        assert(Number.isFinite(evidence.measurement.cancellationReactionMs) && evidence.measurement.cancellationReactionMs >= 0, `${requestedProfile} must record cancellation reaction`);
        assert(Number.isFinite(evidence.measurement.estimatedWorkerPayloadBytesPerRun) && evidence.measurement.estimatedWorkerPayloadBytesPerRun > 0, `${requestedProfile} must record bytes per run`);
    }
}

console.log('--- Monte Carlo Measurement Contract Tests Completed ---');
