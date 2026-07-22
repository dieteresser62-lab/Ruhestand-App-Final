import fs from 'node:fs';
import path from 'node:path';
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
    compileScenario,
    getDataVersion
} from '../app/simulator/simulator-engine-helpers.js';
import { computeRunStatsFromSeries } from '../app/simulator/simulator-engine-wrapper.js';
import { quantile } from '../app/simulator/simulator-utils.js';

console.log('--- Monte Carlo Measurement Contract Tests ---');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, 'fixtures', 'monte-carlo-measurement');
const workerUrl = new URL('../workers/mc-worker.js', import.meta.url);
function readFixture(name) {
    return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), 'utf8'));
}

const goldenFixture = readFixture('golden-cases-v1.json');
const snapshotPolicy = readFixture('snapshot-policy-v1.json');
const deltaLedger = readFixture('delta-ledger-v1.json');
const preHardening = readFixture('pre-hardening-v1.json');
const postSlice03 = readFixture('post-slice-03-v1.json');
const postSlice04 = readFixture('post-slice-04-v1.json');
const postSlice05 = readFixture('post-slice-05-v1.json');
const postSlice06 = readFixture('post-slice-06-v1.json');
const benchmarkContract = readFixture('benchmark-contract-v1.json');
const benchmarkResults = readFixture('benchmark-results-2026-07-22.json');
const consumerInventory = readFixture('consumer-inventory-v1.json');

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

function snapshotProjection(result) {
    const bufferBytes = Object.values(result.buffers).reduce((sum, buffer) => sum + buffer.byteLength, 0);
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
    const bufferBytes = Object.values(result.buffers).reduce((sum, buffer) => sum + buffer.byteLength, 0);
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
    const bufferBytes = Object.values(result.buffers).reduce((sum, buffer) => sum + buffer.byteLength, 0);
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
    const bufferBytes = Object.values(result.buffers).reduce((sum, buffer) => sum + buffer.byteLength, 0);
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
    assertEqual(snapshotPolicy.referenceClasses.length, 3, 'Snapshot policy must distinguish three reference classes');
    const baselineClass = snapshotPolicy.referenceClasses.find(entry => entry.id === 'pre-hardening-v1');
    assert(baselineClass?.immutable === true && baselineClass?.overwriteAllowed === false, 'Pre-hardening reference must be immutable');
    assertEqual(snapshotPolicy.comparisonRules.sameRuntime, 'exact', 'Same-runtime snapshots must be exact');
    assertEqual(snapshotPolicy.comparisonRules.widenToleranceAfterFailure, false, 'Tolerance widening after failure must be forbidden');
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

// Contract 10: the fixed worker snapshot uses the same runner fixture as direct execution.
const fixedWorkerResult = await runWorkerLayout(
    preHardening.runnerCase,
    preHardening.metadata.workerConfiguration.workerCount,
    preHardening.metadata.chunkPolicy.ranges
);
const actualDataVersion = getDataVersion();
const actualSnapshotResult = samplingSnapshotProjection(fixedWorkerResult);
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
assertJsonEqual(actualDataVersion, postSlice03.metadata.dataVersion, 'Post-Slice-03 data version must match');
assert(preHardening.result !== null, 'Immutable pre-hardening result must remain captured');
assertEqual(preHardening.result.bufferBytesPerRun, 63, 'Immutable pre-hardening buffer evidence must remain unchanged');
assertJsonEqual(preHardening.result.buffers.volatilities, preHardening.result.buffers.maxDrawdowns, 'Immutable baseline must retain the documented pre-fix volatility defect');
const sameRuntime = process.version === postSlice06.metadata.runtime.version
    && process.platform === postSlice06.metadata.runtime.platform
    && process.arch === postSlice06.metadata.runtime.architecture;
assertEqual(postSlice03.result.aggregates.volatilities.p50 !== postSlice03.result.aggregates.maxDrawdowns.p50, true, 'Immutable Post-Slice-03 reference retains separated volatility and drawdown semantics');
assertJsonEqual(actualDataVersion, postSlice05.metadata.dataVersion, 'Post-Slice-05 data version must match');
assertEqual(postSlice05.result.outcomeInventory.schemaVersion, 'MonteCarloOutcomeInventoryV1', 'Immutable Post-Slice-05 reference retains the outcome contract');
assertEqual(postSlice05.result.bufferBytesPerRun, 75, 'Immutable Post-Slice-05 reference retains its buffer evidence');
assertJsonEqual(actualDataVersion, postSlice06.metadata.dataVersion, 'Post-Slice-06 data version must match');
compareSnapshotNode(
    actualSnapshotResult,
    postSlice06.result,
    'result',
    sameRuntime,
    postSlice06.metadata.numericTolerance
);

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
