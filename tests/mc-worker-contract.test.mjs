import { Worker } from 'node:worker_threads';
import { EngineAPI } from '../engine/index.mjs';
import { compileScenario, getDataVersion } from '../app/simulator/simulator-engine-helpers.js';

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
            scenarioKey,
            runRange: { start: 0, count: monteCarloParams.anzahl },
            monteCarloParams,
            useCapeSampling: false,
            logIndices: [0]
        });

        const result = response.message;
        assertEqual(result.type, 'result', 'valid job should return result');
        assertEqual(result.jobId, 'job-1', 'valid job should echo jobId');
        assert(Number.isFinite(result.elapsedMs), 'result should include elapsedMs');
        assert(result.buffers?.finalOutcomes instanceof Float64Array, 'result should include finalOutcomes buffer');
        assertEqual(result.buffers.finalOutcomes.length, monteCarloParams.anzahl, 'finalOutcomes should match run count');
        assert(result.buffers.finalOutcomes.buffer.byteLength > 0, 'finalOutcomes should have a transferable buffer');
        assert(Array.isArray(result.heatmap), 'result should include heatmap rows');
        assert(result.heatmap[0] instanceof Uint32Array, 'heatmap rows should be typed arrays');
        assert(result.totals && Number.isFinite(result.totals.failCount), 'result should include totals.failCount');
        assert(Array.isArray(result.lists?.entryAges), 'result should include list payloads');
        assert(response.progress.length > 0, 'valid job should emit progress messages');
        assert(
            response.progress.every(item => item.jobId === 'job-1' && item.phase === 'run'),
            'progress messages should carry jobId and phase'
        );
        console.log('✓ valid Monte-Carlo job OK');
    } finally {
        await terminateWorker(worker);
    }
}

console.log('--- MC Worker Entrypoint Contract Tests Completed ---');
