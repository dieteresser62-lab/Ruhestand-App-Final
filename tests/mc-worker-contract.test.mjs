import { Worker } from 'node:worker_threads';
import { EngineAPI } from '../engine/index.mjs';
import { compileScenario, getDataVersion } from '../app/simulator/simulator-engine-helpers.js';
import { annualData } from '../app/simulator/simulator-data.js';
import { runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';
import {
    MONTE_CARLO_CHUNK_RESULT_VERSION,
    assertMonteCarloChunkResultV1
} from '../app/simulator/monte-carlo-chunk-result.js';

console.log('--- MC Worker Entrypoint Contract Tests ---');

if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.EngineAPI = EngineAPI;

const workerUrl = new URL('../workers/mc-worker.js', import.meta.url);

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

function terminateWorker(worker) {
    return worker.terminate().catch(() => undefined);
}

function postAndWait(worker, payload, { timeoutMs = 12000, terminalTypes = ['ready', 'result', 'error', 'disposed'] } = {}) {
    const progress = [];
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for worker response to ${payload.type}`));
        }, timeoutMs);

        const cleanup = () => {
            clearTimeout(timer);
            worker.off('message', onMessage);
            worker.off('error', onError);
            worker.off('exit', onExit);
        };

        const onMessage = message => {
            if (message?.type === 'progress') {
                progress.push(message);
                return;
            }
            if (!terminalTypes.includes(message?.type)) {
                return;
            }
            cleanup();
            resolve({ message, progress });
        };

        const onError = error => {
            cleanup();
            reject(error);
        };

        const onExit = code => {
            if (code !== 0) {
                cleanup();
                reject(new Error(`Worker exited with code ${code}`));
            }
        };

        worker.on('message', onMessage);
        worker.on('error', onError);
        worker.on('exit', onExit);
        worker.postMessage(payload);
    });
}

function createInputs() {
    return {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 750000,
        depotwertAlt: 250000,
        einstandAlt: 200000,
        zielLiquiditaet: 45000,
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
}

const widowOptions = {
    mode: 'stop',
    percent: 0,
    marriageOffsetYears: 0,
    minMarriageYears: 0
};

const monteCarloParams = {
    anzahl: 6,
    maxDauer: 18,
    blockSize: 4,
    seed: 24680,
    methode: 'block',
    rngMode: 'per-run-seed'
};

// Test 1: init/dispose lifecycle through the real worker entrypoint.
console.log('Test 1: init/dispose lifecycle');
{
    const worker = createWorkerHarness();
    try {
        const inputs = createInputs();
        const { scenarioKey, compiledScenario } = compileScenario(
            inputs,
            widowOptions,
            monteCarloParams.methode,
            false,
            inputs.stressPreset
        );
        const dataVersion = getDataVersion();

        const init = await postAndWait(worker, {
            type: 'init',
            jobId: 'init-1',
            scenarioKey,
            compiledScenario,
            dataVersion
        });
        assertEqual(init.message.type, 'ready', 'init should return ready');
        assertEqual(init.message.jobId, 'init-1', 'init should echo jobId');
        assertEqual(init.message.scenarioKey, scenarioKey, 'init should echo scenarioKey');
        assertEqual(
            JSON.stringify(init.message.dataVersion),
            JSON.stringify(dataVersion),
            'init should echo dataVersion'
        );

        const disposed = await postAndWait(worker, { type: 'dispose', jobId: 'dispose-1' });
        assertEqual(disposed.message.type, 'disposed', 'dispose should return disposed');
        console.log('✓ init/dispose lifecycle OK');
    } finally {
        await terminateWorker(worker);
    }
}

// Test 2: unknown message types stay controlled.
console.log('Test 2: unknown message type');
{
    const worker = createWorkerHarness();
    try {
        const response = await postAndWait(worker, { type: 'nope', jobId: 'unknown-1' });
        assertEqual(response.message.type, 'error', 'unknown type should return error');
        assertEqual(response.message.jobId, 'unknown-1', 'unknown type should echo jobId');
        assert(
            response.message.message.includes('Unknown worker message type: nope'),
            'unknown type should include controlled error message'
        );
        console.log('✓ unknown message type OK');
    } finally {
        await terminateWorker(worker);
    }
}

// Test 3: job without cached scenario returns an error response, not a process crash.
console.log('Test 3: missing scenario cache');
{
    const worker = createWorkerHarness();
    try {
        const response = await postAndWait(worker, {
            type: 'job',
            jobId: 'missing-scenario-1',
            scenarioKey: 'missing',
            runRange: { start: 0, count: 1 },
            monteCarloParams,
            useCapeSampling: false,
            logIndices: []
        });
        assertEqual(response.message.type, 'error', 'missing scenario should return error');
        assert(
            response.message.message.includes('Unknown scenarioKey: missing'),
            'missing scenario should include scenarioKey'
        );
        console.log('✓ missing scenario cache OK');
    } finally {
        await terminateWorker(worker);
    }
}

// Test 4: valid job returns result structure and progress through the entrypoint.
console.log('Test 4: valid Monte-Carlo job');
{
    const worker = createWorkerHarness();
    try {
        const inputs = createInputs();
        const { scenarioKey, compiledScenario } = compileScenario(
            inputs,
            widowOptions,
            monteCarloParams.methode,
            false,
            inputs.stressPreset
        );

        await postAndWait(worker, {
            type: 'init',
            jobId: 'init-valid-job',
            scenarioKey,
            compiledScenario,
            dataVersion: getDataVersion()
        });

        const response = await postAndWait(worker, {
            type: 'job',
            jobId: 'job-1',
            generationId: 'generation-valid-job',
            scenarioKey,
            runRange: { start: 0, count: monteCarloParams.anzahl },
            monteCarloParams,
            dataVersion: getDataVersion(),
            useCapeSampling: false,
            logIndices: [0]
        });

        const result = response.message;
        assertEqual(result.type, 'result', 'valid job should return result');
        assertEqual(result.jobId, 'job-1', 'valid job should echo jobId');
        assertEqual(result.generationId, 'generation-valid-job', 'valid job should echo generationId');
        assert(Number.isFinite(result.elapsedMs), 'result should include elapsedMs');
        assert(result.buffers?.finalOutcomes instanceof Float64Array, 'result should include finalOutcomes buffer');
        assertEqual(result.buffers.finalOutcomes.length, monteCarloParams.anzahl, 'finalOutcomes should match run count');
        assert(result.buffers.finalOutcomes.buffer.byteLength > 0, 'finalOutcomes should have a transferable buffer');
        assertEqual(result.schemaVersion, MONTE_CARLO_CHUNK_RESULT_VERSION, 'worker should return the central chunk schema');
        assertMonteCarloChunkResultV1(result, { expectedStart: 0, expectedCount: monteCarloParams.anzahl });
        assert(result.pathSummaries?.globalRunIndex instanceof Uint32Array, 'worker should transfer indexed path summaries');
        assert(result.pathMissingness?.path instanceof Uint8Array, 'worker should transfer path missingness');
        assert(Array.isArray(result.heatmap), 'result should include heatmap rows');
        assert(result.heatmap[0] instanceof Uint32Array, 'heatmap rows should be typed arrays');
        assert(result.totals && Number.isFinite(result.totals.failCount), 'result should include totals.failCount');
        assert(Array.isArray(result.lists?.entryAges), 'result should include list payloads');
        assert(response.progress.length > 0, 'valid job should emit progress messages');
        assert(
            response.progress.every(item => item.jobId === 'job-1'
                && item.generationId === 'generation-valid-job'
                && item.phase === 'run'),
            'progress messages should carry jobId, generationId and phase'
        );
        console.log('✓ valid Monte-Carlo job OK');
    } finally {
        await terminateWorker(worker);
    }
}

// Test 5: stationary bootstrap runs through the real worker entrypoint with data-end restarts.
console.log('Test 5: stationary bootstrap Monte-Carlo job');
{
    const worker = createWorkerHarness();
    try {
        const inputs = createInputs();
        const lastHistoricalYear = annualData[annualData.length - 1]?.jahr;
        const stationaryParams = {
            anzahl: 6,
            maxDauer: 7,
            blockSize: 30,
            seed: 86420,
            methode: 'stationary',
            rngMode: 'per-run-seed',
            startYearMode: 'FILTER',
            startYearFilter: lastHistoricalYear,
            startYearHalfLife: 20,
            excludeEstimatedHistory: false
        };
        const { scenarioKey, compiledScenario } = compileScenario(
            inputs,
            widowOptions,
            stationaryParams.methode,
            false,
            inputs.stressPreset
        );

        await postAndWait(worker, {
            type: 'init',
            jobId: 'init-stationary-job',
            scenarioKey,
            compiledScenario,
            dataVersion: getDataVersion()
        });

        const response = await postAndWait(worker, {
            type: 'job',
            jobId: 'stationary-job-1',
            scenarioKey,
            runRange: { start: 0, count: stationaryParams.anzahl },
            monteCarloParams: stationaryParams,
            useCapeSampling: false,
            logIndices: [0, 5]
        });
        const serial = await runMonteCarloChunk({
            inputs,
            widowOptions,
            monteCarloParams: stationaryParams,
            useCapeSampling: false,
            runRange: { start: 0, count: stationaryParams.anzahl },
            logIndices: [0, 5],
            engine: EngineAPI
        });

        const result = response.message;
        assertEqual(result.type, 'result', 'stationary job should return result');
        assertEqual(result.jobId, 'stationary-job-1', 'stationary job should echo jobId');
        assertEqual(result.buffers.finalOutcomes.length, stationaryParams.anzahl, 'stationary finalOutcomes should match run count');
        assertEqual(
            JSON.stringify(Array.from(result.buffers.finalOutcomes)),
            JSON.stringify(Array.from(serial.buffers.finalOutcomes)),
            'stationary worker finalOutcomes should match serial chunk'
        );
        assertEqual(result.totals.failCount, serial.totals.failCount, 'stationary worker failCount should match serial');
        assertEqual(result.runMeta.length, stationaryParams.anzahl, 'stationary worker runMeta should include all runs');
        const workerRun0 = (result.runMeta || []).find(meta => meta.index === 0);
        const serialRun0 = (serial.runMeta || []).find(meta => meta.index === 0);
        assert(workerRun0?.logDataRows?.length >= 2, 'stationary worker should log repeated data-end samples');
        assertEqual(
            JSON.stringify(workerRun0.logDataRows.map(row => row.histJahr)),
            JSON.stringify(serialRun0.logDataRows.map(row => row.histJahr)),
            'stationary worker histJahr sequence should match serial'
        );
        assert(
            workerRun0.logDataRows.every(row => row.histJahr === lastHistoricalYear),
            'stationary worker should keep data-end restarts inside the filtered last year'
        );
        console.log('✓ stationary bootstrap Monte-Carlo job OK');
    } finally {
        await terminateWorker(worker);
    }
}

// Test 6: cache is bounded and a changed data version invalidates older scenarios.
console.log('Test 6: bounded scenario cache and dataVersion invalidation');
{
    const worker = createWorkerHarness();
    try {
        const inputs = createInputs();
        const { compiledScenario } = compileScenario(
            inputs,
            widowOptions,
            monteCarloParams.methode,
            false,
            inputs.stressPreset
        );
        const version = getDataVersion();

        let latestInit = null;
        for (let index = 0; index < 9; index++) {
            latestInit = await postAndWait(worker, {
                type: 'init',
                jobId: `init-cache-${index}`,
                scenarioKey: `scenario-${index}`,
                compiledScenario,
                dataVersion: version
            });
        }
        assertEqual(latestInit.message.scenarioCacheSize, 8, 'worker scenario cache should be bounded to eight entries');

        const evicted = await postAndWait(worker, {
            type: 'job',
            jobId: 'evicted-scenario-job',
            scenarioKey: 'scenario-0',
            runRange: { start: 0, count: 1 },
            monteCarloParams: { ...monteCarloParams, anzahl: 1 },
            dataVersion: version,
            useCapeSampling: false,
            logIndices: []
        });
        assertEqual(evicted.message.type, 'error', 'oldest scenario should be evicted at the cache limit');
        assert(evicted.message.message.includes('Unknown scenarioKey'), 'evicted scenario should fail closed');

        const nextVersion = {
            ...version,
            annualDataHash: `${version.annualDataHash}-changed`
        };
        const changed = await postAndWait(worker, {
            type: 'init',
            jobId: 'init-data-version-change',
            scenarioKey: 'scenario-new-version',
            compiledScenario,
            dataVersion: nextVersion
        });
        assertEqual(changed.message.scenarioCacheSize, 1, 'dataVersion change should clear the previous scenario cache');

        const stale = await postAndWait(worker, {
            type: 'job',
            jobId: 'stale-data-version-job',
            scenarioKey: 'scenario-new-version',
            runRange: { start: 0, count: 1 },
            monteCarloParams: { ...monteCarloParams, anzahl: 1 },
            dataVersion: version,
            useCapeSampling: false,
            logIndices: []
        });
        assertEqual(stale.message.type, 'error', 'stale job dataVersion should be rejected');
        assert(stale.message.message.includes('dataVersion mismatch'), 'stale dataVersion error should be explicit');
        console.log('✓ bounded scenario cache and dataVersion invalidation OK');
    } finally {
        await terminateWorker(worker);
    }
}

// Test 7: malformed data versions fail as controlled init errors.
console.log('Test 7: invalid dataVersion fails closed');
{
    const worker = createWorkerHarness();
    try {
        const response = await postAndWait(worker, {
            type: 'init',
            jobId: 'init-invalid-version',
            scenarioKey: 'invalid-version',
            compiledScenario: { inputs: createInputs(), widowOptions },
            dataVersion: { annualDataHash: 'only-one-hash' }
        });
        assertEqual(response.message.type, 'error', 'invalid dataVersion should return a controlled error');
        assert(response.message.message.includes('annualDataHash and regimeHash'), 'invalid dataVersion error should name required hashes');
        console.log('✓ invalid dataVersion fails closed OK');
    } finally {
        await terminateWorker(worker);
    }
}

// Test 8: the worker entrypoint applies MonteCarloParametersV1 before execution.
console.log('Test 8: invalid Monte-Carlo parameters fail closed in worker');
{
    const worker = createWorkerHarness();
    try {
        const inputs = createInputs();
        const { scenarioKey, compiledScenario } = compileScenario(
            inputs,
            widowOptions,
            monteCarloParams.methode,
            false,
            inputs.stressPreset
        );
        await postAndWait(worker, {
            type: 'init',
            jobId: 'init-invalid-parameters',
            scenarioKey,
            compiledScenario,
            dataVersion: getDataVersion()
        });
        const response = await postAndWait(worker, {
            type: 'job',
            jobId: 'job-invalid-parameters',
            scenarioKey,
            runRange: { start: 0, count: 6 },
            monteCarloParams: { ...monteCarloParams, anzahl: '6runs' },
            useCapeSampling: false,
            logIndices: []
        });
        assertEqual(response.message.type, 'error', 'worker rejects a suffixed run count');
        assert(response.message.message.includes('ganze Zahl'), 'worker exposes the shared integer-contract error');
        console.log('✓ invalid Monte-Carlo parameters fail closed in worker OK');
    } finally {
        await terminateWorker(worker);
    }
}

console.log('--- MC Worker Entrypoint Contract Tests Completed ---');
