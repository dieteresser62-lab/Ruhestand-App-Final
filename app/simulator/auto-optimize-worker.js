/**
 * Module: Auto-Optimize Worker
 * Purpose: Manages parallel execution of Monte Carlo simulations using Web Workers.
 *          Handles WorkerPool creation, job scheduling, and results aggregation.
 * Usage: Used by auto-optimize-evaluate.js to offload heavy computations.
 * Dependencies: monte-carlo-runner.js, worker-pool.js
 */
"use strict";

import {
    attachMonteCarloBatchOutcome,
    buildMonteCarloAggregates,
    MC_HEATMAP_BINS,
    runMonteCarloChunk
} from './monte-carlo-runner.js';
import {
    createMonteCarloChunkAccumulatorV1,
    finalizeMonteCarloChunkAccumulatorV1,
    mergeMonteCarloChunkResultV1
} from './monte-carlo-chunk-result.js';
import { compileScenario, getDataVersion } from './simulator-engine-helpers.js';
import { WorkerPool } from '../../workers/worker-pool.js';
import {
    normalizeMonteCarloParametersV1,
    normalizeMonteCarloResourceConfigV1,
    resolveMonteCarloWorkerCountV1
} from './monte-carlo-parameters.js';

function readWorkerConfig() {
    const workerCountRaw = document.getElementById('mcWorkerCount')?.value ?? '8';
    const budgetRaw = document.getElementById('mcWorkerBudget')?.value ?? '500';
    return normalizeMonteCarloResourceConfigV1({
        workerCount: workerCountRaw,
        timeBudgetMs: budgetRaw
    });
}

function finalizeAutoOptimizeBatch({ aggregatedResults, technicalInventory, failCount }) {
    const contractedResults = attachMonteCarloBatchOutcome(aggregatedResults, technicalInventory);
    if (contractedResults.batchStatus === 'technical_error') {
        const firstError = technicalInventory?.errors?.[0];
        throw new Error(firstError?.message || 'Auto-Optimize wurde wegen eines technischen Simulationsfehlers beendet.');
    }
    return {
        aggregatedResults: contractedResults,
        failCount,
        batchStatus: contractedResults.batchStatus,
        technicalInventory
    };
}

function finalizeChunkBatch(totalRuns, chunks) {
    const accumulator = createMonteCarloChunkAccumulatorV1(totalRuns, { retainRunMeta: false });
    for (const chunk of chunks) {
        mergeMonteCarloChunkResultV1(accumulator, chunk, {
            expectedStart: chunk.runRange.start,
            expectedCount: chunk.runRange.count
        });
    }
    return finalizeMonteCarloChunkAccumulatorV1(accumulator);
}

function buildAggregatesFromBatch(inputs, batch) {
    return buildMonteCarloAggregates({
        inputs,
        totalRuns: batch.totalRuns,
        buffers: batch.buffers,
        heatmap: batch.heatmap,
        bins: batch.bins || MC_HEATMAP_BINS,
        totals: batch.totals,
        lists: batch.lists,
        allRealWithdrawalsSample: batch.allRealWithdrawalsSample
    });
}

let autoOptimizePool = null;
let autoOptimizePoolSize = 0;

function getAutoOptimizePool(workerCount) {
    if (!autoOptimizePool || autoOptimizePoolSize !== workerCount) {
        if (autoOptimizePool) {
            autoOptimizePool.dispose();
        }
        autoOptimizePool = new WorkerPool({
            workerUrl: new URL('../../workers/mc-worker.js', import.meta.url),
            size: workerCount,
            type: 'module',
            telemetryName: 'AutoOptimizePool',
            onError: error => console.error('[AUTO_OPT] WorkerPool Error:', error)
        });
        autoOptimizePoolSize = workerCount;
    }
    return autoOptimizePool;
}

export async function runMonteCarloAutoOptimize({ inputs, widowOptions, monteCarloParams, useCapeSampling }) {
    monteCarloParams = normalizeMonteCarloParametersV1(monteCarloParams, { inputs });
    const { anzahl } = monteCarloParams;
    const workerConfig = readWorkerConfig();
    const desiredWorkers = workerConfig.workerCount ?? 0;
    const workerCount = resolveMonteCarloWorkerCountV1({
        workerCount: desiredWorkers,
        timeBudgetMs: workerConfig.timeBudgetMs
    });
    const timeBudgetMs = workerConfig.timeBudgetMs ?? 200;

    // Fallback: ohne Worker läuft alles seriell im Main Thread.
    if (typeof Worker === 'undefined') {
        const chunk = await runMonteCarloChunk({
            inputs,
            widowOptions,
            monteCarloParams,
            useCapeSampling,
            runRange: { start: 0, count: anzahl },
            logIndices: []
        });
        const batch = finalizeChunkBatch(anzahl, [chunk]);
        const aggregatedResults = buildAggregatesFromBatch(inputs, batch);
        return finalizeAutoOptimizeBatch({
            aggregatedResults,
            technicalInventory: batch.technicalInventory,
            failCount: batch.totals.failCount
        });
    }

    const pool = getAutoOptimizePool(workerCount);

    const { scenarioKey, compiledScenario } = compileScenario(inputs, widowOptions, monteCarloParams.methode, useCapeSampling, inputs.stressPreset);
    const dataVersion = getDataVersion();

    const chunkAccumulator = createMonteCarloChunkAccumulatorV1(anzahl, { retainRunMeta: false });

    let nextRunIdx = 0;
    // Chunk-Größen adaptieren: kleine Jobs für Parallelität, aber begrenzt, um Overhead zu vermeiden.
    const minChunk = 10;
    const maxChunk = Math.min(80, Math.max(minChunk, Math.ceil(anzahl / workerCount)));
    let chunkSize = Math.min(maxChunk, Math.max(minChunk, Math.floor(anzahl / (workerCount * 4)) || minChunk));
    let smoothedChunkSize = chunkSize;

    const pending = new Set();
    const scheduleNextIfNeeded = () => {
        while (pending.size < workerCount && nextRunIdx < anzahl) {
            const count = Math.min(chunkSize, anzahl - nextRunIdx);
            scheduleJob(nextRunIdx, count);
            nextRunIdx += count;
        }
    };

    const scheduleJob = (start, count) => {
        // Job-Payload ist vollständig deterministisch über scenarioKey + runRange.
        const startedAt = performance.now();
        const payload = {
            type: 'job',
            scenarioKey,
            runRange: { start, count },
            monteCarloParams: {
                anzahl: count,
                maxDauer: monteCarloParams.maxDauer,
                blockSize: monteCarloParams.blockSize,
                seed: monteCarloParams.seed,
                methode: monteCarloParams.methode,
                rngMode: monteCarloParams.rngMode || 'per-run-seed',
                startYearMode: monteCarloParams.startYearMode,
                startYearFilter: monteCarloParams.startYearFilter,
                startYearHalfLife: monteCarloParams.startYearHalfLife,
                excludeEstimatedHistory: monteCarloParams.excludeEstimatedHistory
            },
            useCapeSampling,
            logIndices: []
        };
        const promise = pool.runJob(payload).then(result => {
            const elapsedMs = result.elapsedMs ?? (performance.now() - startedAt);
            return { result, start, count, elapsedMs };
        });
        pending.add(promise);
        promise.finally(() => pending.delete(promise));
    };

    try {
        await pool.broadcast({
            type: 'init',
            scenarioKey,
            compiledScenario,
            dataVersion
        });

        scheduleNextIfNeeded();

        while (pending.size > 0) {
            const { result, start, count, elapsedMs } = await Promise.race(pending);
            mergeMonteCarloChunkResultV1(chunkAccumulator, result, {
                expectedStart: start,
                expectedCount: count
            });

            if (elapsedMs > 0) {
                const scaled = Math.round(count * (timeBudgetMs / elapsedMs));
                const targetSize = Math.max(minChunk, Math.min(maxChunk, scaled || minChunk));
                smoothedChunkSize = Math.max(minChunk, Math.min(maxChunk, Math.round(smoothedChunkSize * 0.7 + targetSize * 0.3)));
                chunkSize = smoothedChunkSize;
            }

            scheduleNextIfNeeded();
        }
    } catch (error) {
        if (autoOptimizePool) {
            autoOptimizePool.dispose();
            autoOptimizePool = null;
            autoOptimizePoolSize = 0;
        }
        console.error('[AUTO_OPT] Worker execution failed, falling back to serial.', error);
        const chunk = await runMonteCarloChunk({
            inputs,
            widowOptions,
            monteCarloParams,
            useCapeSampling,
            runRange: { start: 0, count: anzahl },
            logIndices: []
        });
        const batch = finalizeChunkBatch(anzahl, [chunk]);
        const aggregatedResults = buildAggregatesFromBatch(inputs, batch);
        return finalizeAutoOptimizeBatch({
            aggregatedResults,
            technicalInventory: batch.technicalInventory,
            failCount: batch.totals.failCount
        });
    } finally {
        if (autoOptimizePool?.telemetry && autoOptimizePool.telemetry.enabled) {
            autoOptimizePool.telemetry.printReport();
        }
        // keep pool alive for reuse across candidates/seeds
    }

    const batch = finalizeMonteCarloChunkAccumulatorV1(chunkAccumulator);
    const aggregatedResults = buildAggregatesFromBatch(inputs, batch);

    return finalizeAutoOptimizeBatch({
        aggregatedResults,
        technicalInventory: batch.technicalInventory,
        failCount: batch.totals.failCount
    });
}
