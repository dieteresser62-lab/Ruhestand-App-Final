"use strict";

import { EngineAPI } from '../engine/index.mjs';
import { runMonteCarloChunk } from '../monte-carlo-runner.js';
import { runSweepChunk } from '../sweep-runner.js';
import { prepareHistoricalDataOnce } from '../simulator-engine-helpers.js';

const scenarioCache = new Map();
let sweepCache = null;
let dataVersion = null;

function send(type, payload = {}, transferables = []) {
    self.postMessage({ type, ...payload }, transferables);
}

function collectTransferables(result) {
    const transferables = [];
    if (result?.buffers) {
        for (const value of Object.values(result.buffers)) {
            if (value?.buffer) transferables.push(value.buffer);
        }
    }
    if (Array.isArray(result?.heatmap)) {
        for (const row of result.heatmap) {
            if (row?.buffer) transferables.push(row.buffer);
        }
    }
    return transferables;
}

self.onmessage = async event => {
    const message = event.data || {};
    const { type } = message;

    if (type === 'init') {
        const { jobId, scenarioKey, compiledScenario, dataVersion: nextVersion } = message;
        if (scenarioKey && compiledScenario) {
            scenarioCache.set(scenarioKey, compiledScenario);
        }
        if (nextVersion) {
            dataVersion = nextVersion;
        }
        prepareHistoricalDataOnce();
        send('ready', { jobId, scenarioKey, dataVersion });
        return;
    }

    if (type === 'dispose') {
        scenarioCache.clear();
        sweepCache = null;
        dataVersion = null;
        send('disposed', {});
        return;
    }

    if (type === 'sweep-init') {
        const { jobId, baseInputs, paramCombinations } = message;
        sweepCache = {
            baseInputs,
            paramCombinations
        };
        prepareHistoricalDataOnce();
        send('ready', { jobId });
        return;
    }

    if (type === 'job') {
        const { jobId, scenarioKey, runRange, monteCarloParams, useCapeSampling, logIndices } = message;
        try {
            const compiledScenario = scenarioCache.get(scenarioKey);
            if (!compiledScenario) {
                throw new Error(`Unknown scenarioKey: ${String(scenarioKey)}`);
            }

            const startedAt = performance.now();
            const result = await runMonteCarloChunk({
                inputs: compiledScenario.inputs,
                widowOptions: compiledScenario.widowOptions,
                monteCarloParams: {
                    ...monteCarloParams,
                    methode: monteCarloParams?.methode ?? compiledScenario.methode
                },
                useCapeSampling: useCapeSampling ?? compiledScenario.useCapeSampling,
                runRange,
                logIndices,
                onProgress: pct => {
                    send('progress', { jobId, pct, phase: 'run' });
                },
                engine: EngineAPI
            });

            const elapsedMs = performance.now() - startedAt;
            const transferables = collectTransferables(result);
            send('result', { jobId, ...result, elapsedMs }, transferables);
        } catch (error) {
            send('error', {
                jobId,
                message: error?.message || 'Worker job failed',
                stack: error?.stack || ''
            });
        }
        return;
    }

    if (type === 'sweep') {
        const { jobId, sweepConfig, comboRange, refP2Invariants } = message;
        try {
            prepareHistoricalDataOnce();
            const startedAt = performance.now();
            if (!sweepCache || !sweepCache.baseInputs || !sweepCache.paramCombinations) {
                throw new Error('Sweep cache missing; did you call sweep-init?');
            }
            const result = runSweepChunk({
                baseInputs: sweepCache.baseInputs,
                paramCombinations: sweepCache.paramCombinations,
                comboRange,
                sweepConfig,
                refP2Invariants
            });
            const elapsedMs = performance.now() - startedAt;
            send('result', { jobId, ...result, elapsedMs });
        } catch (error) {
            send('error', {
                jobId,
                message: error?.message || 'Worker sweep job failed',
                stack: error?.stack || ''
            });
        }
        return;
    }

    send('error', {
        jobId: message.jobId,
        message: `Unknown worker message type: ${String(type)}`
    });
};
