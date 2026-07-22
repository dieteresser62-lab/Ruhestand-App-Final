"use strict";

import { EngineAPI } from '../engine/index.mjs';
import { runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';
import { runSweepChunk } from '../app/simulator/sweep-runner.js';
import { prepareHistoricalDataOnce } from '../app/simulator/simulator-engine-helpers.js';

const scenarioCache = new Map();
const MAX_SCENARIO_CACHE_ENTRIES = 8;
let sweepCache = null;
let dataVersion = null;
let dataVersionKey = null;

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

function normalizeDataVersion(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('Worker init requires a dataVersion object.');
    }
    const annualDataHash = String(value.annualDataHash || '').trim();
    const regimeHash = String(value.regimeHash || '').trim();
    if (!annualDataHash || !regimeHash) {
        throw new TypeError('Worker dataVersion requires annualDataHash and regimeHash.');
    }
    return {
        value: { annualDataHash, regimeHash },
        key: `${annualDataHash}:${regimeHash}`
    };
}

function cacheScenario(scenarioKey, compiledScenario, versionKey) {
    if (!scenarioKey || !compiledScenario) {
        throw new TypeError('Worker init requires scenarioKey and compiledScenario.');
    }
    scenarioCache.delete(scenarioKey);
    scenarioCache.set(scenarioKey, { compiledScenario, dataVersionKey: versionKey });
    while (scenarioCache.size > MAX_SCENARIO_CACHE_ENTRIES) {
        const oldestKey = scenarioCache.keys().next().value;
        scenarioCache.delete(oldestKey);
    }
}

self.onmessage = async event => {
    const message = event.data || {};
    const { type } = message;

    if (type === 'init') {
        const { jobId, generationId, scenarioKey, compiledScenario, dataVersion: nextVersion } = message;
        try {
            const normalizedVersion = normalizeDataVersion(nextVersion);
            prepareHistoricalDataOnce();
            if (dataVersionKey !== null && dataVersionKey !== normalizedVersion.key) {
                scenarioCache.clear();
            }
            dataVersion = normalizedVersion.value;
            dataVersionKey = normalizedVersion.key;
            cacheScenario(scenarioKey, compiledScenario, dataVersionKey);
            send('ready', {
                jobId,
                generationId,
                scenarioKey,
                dataVersion,
                scenarioCacheSize: scenarioCache.size
            });
        } catch (error) {
            send('error', {
                jobId,
                generationId,
                message: error?.message || 'Worker init failed',
                stack: error?.stack || ''
            });
        }
        return;
    }

    if (type === 'dispose') {
        scenarioCache.clear();
        sweepCache = null;
        dataVersion = null;
        dataVersionKey = null;
        send('disposed', { jobId: message.jobId, generationId: message.generationId });
        return;
    }

    if (type === 'sweep-init') {
        const { jobId, generationId, baseInputs, paramCombinations } = message;
        sweepCache = {
            baseInputs,
            paramCombinations
        };
        prepareHistoricalDataOnce();
        send('ready', { jobId, generationId });
        return;
    }

    if (type === 'job') {
        const {
            jobId,
            generationId,
            scenarioKey,
            runRange,
            monteCarloParams,
            useCapeSampling,
            logIndices
        } = message;
        try {
            const cachedScenario = scenarioCache.get(scenarioKey);
            if (!cachedScenario) {
                throw new Error(`Unknown scenarioKey: ${String(scenarioKey)}`);
            }
            if (!dataVersionKey || cachedScenario.dataVersionKey !== dataVersionKey) {
                throw new Error(`Stale dataVersion for scenarioKey: ${String(scenarioKey)}`);
            }
            if (message.dataVersion) {
                const requestedVersion = normalizeDataVersion(message.dataVersion);
                if (requestedVersion.key !== dataVersionKey) {
                    throw new Error(`Worker dataVersion mismatch for scenarioKey: ${String(scenarioKey)}`);
                }
            }
            const { compiledScenario } = cachedScenario;

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
                    send('progress', { jobId, generationId, pct, phase: 'run' });
                },
                engine: EngineAPI
            });

            const elapsedMs = performance.now() - startedAt;
            const transferables = collectTransferables(result);
            send('result', { jobId, generationId, ...result, elapsedMs }, transferables);
        } catch (error) {
            send('error', {
                jobId,
                generationId,
                message: error?.message || 'Worker job failed',
                stack: error?.stack || ''
            });
        }
        return;
    }

    if (type === 'sweep') {
        const { jobId, generationId, sweepConfig, comboRange, refP2Invariants } = message;
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
                refP2Invariants,
                engine: EngineAPI
            });
            const elapsedMs = performance.now() - startedAt;
            send('result', { jobId, generationId, ...result, elapsedMs });
        } catch (error) {
            send('error', {
                jobId,
                generationId,
                message: error?.message || 'Worker sweep job failed',
                stack: error?.stack || ''
            });
        }
        return;
    }

    send('error', {
        jobId: message.jobId,
        generationId: message.generationId,
        message: `Unknown worker message type: ${String(type)}`
    });
};
