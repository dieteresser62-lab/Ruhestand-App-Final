/**
 * Module: Auto-Optimize Worker
 * Purpose: Manages parallel execution of Monte Carlo simulations using Web Workers.
 *          Handles WorkerPool creation, job scheduling, and results aggregation.
 * Usage: Used by auto-optimize-evaluate.js to offload heavy computations.
 * Dependencies: monte-carlo-runner.js, worker-pool.js
 */
"use strict";

import {
    buildMonteCarloAggregates,
    createMonteCarloBuffers,
    MC_HEATMAP_BINS,
    runMonteCarloChunk
} from './monte-carlo-runner.js';
import { compileScenario, getDataVersion } from './simulator-engine-helpers.js';
import { WorkerPool } from '../../workers/worker-pool.js';

function mergeHeatmap(target, source) {
    for (let year = 0; year < target.length; year++) {
        const targetRow = target[year];
        const sourceRow = source[year];
        if (!sourceRow) continue;
        for (let i = 0; i < targetRow.length; i++) {
            targetRow[i] += sourceRow[i] || 0;
        }
    }
}

function readWorkerConfig() {
    const workerCountRaw = document.getElementById('mcWorkerCount')?.value ?? '8';
    const budgetRaw = document.getElementById('mcWorkerBudget')?.value ?? '500';
    const workerCount = parseInt(String(workerCountRaw).trim(), 10);
    const timeBudgetMs = parseInt(String(budgetRaw).trim(), 10);
    return {
        workerCount: Number.isFinite(workerCount) && workerCount > 0 ? workerCount : 0,
        timeBudgetMs: Number.isFinite(timeBudgetMs) && timeBudgetMs > 0 ? timeBudgetMs : 500
    };
}

function appendArray(target, source) {
    if (!source || source.length === 0) return;
    for (let i = 0; i < source.length; i++) {
        target.push(source[i]);
    }
}

let autoOptimizePool = null;
let autoOptimizePoolSize = 0;

function getAutoOptimizePool(workerCount) {
    if (!autoOptimizePool || autoOptimizePoolSize !== workerCount) {
        if (autoOptimizePool) {
            autoOptimizePool.dispose();
        }
        autoOptimizePool = new WorkerPool({
            workerUrl: new URL('./workers/mc-worker.js', import.meta.url),
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
    const { anzahl } = monteCarloParams;
    const workerConfig = readWorkerConfig();
    const desiredWorkers = workerConfig.workerCount ?? 0;
    const workerCount = Math.max(1, Number.isFinite(desiredWorkers) && desiredWorkers > 0
        ? desiredWorkers
        : Math.max(1, (navigator?.hardwareConcurrency || 2) - 1));
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
        const aggregatedResults = buildMonteCarloAggregates({
            inputs,
            totalRuns: anzahl,
            buffers: chunk.buffers,
            heatmap: chunk.heatmap,
            bins: chunk.bins || MC_HEATMAP_BINS,
            totals: chunk.totals,
            lists: chunk.lists,
            allRealWithdrawalsSample: chunk.allRealWithdrawalsSample
        });
        return { aggregatedResults, failCount: chunk.totals.failCount };
    }

    const pool = getAutoOptimizePool(workerCount);

    const { scenarioKey, compiledScenario } = compileScenario(inputs, widowOptions, monteCarloParams.methode, useCapeSampling, inputs.stressPreset);
    const dataVersion = getDataVersion();

    const buffers = createMonteCarloBuffers(anzahl);
    const heatmap = Array(10).fill(0).map(() => new Uint32Array(MC_HEATMAP_BINS.length - 1));
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
    const allRealWithdrawalsSample = [];
    const totals = {
        failCount: 0,
        pflegeTriggeredCount: 0,
        totalSimulatedYears: 0,
        totalYearsQuoteAbove45: 0,
        shortfallWithCareCount: 0,
        shortfallNoCareProxyCount: 0,
        p2TriggeredCount: 0
    };

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
                rngMode: monteCarloParams.rngMode || 'per-run-seed'
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

            const chunkBuffers = result.buffers;
            buffers.finalOutcomes.set(chunkBuffers.finalOutcomes, start);
            buffers.taxOutcomes.set(chunkBuffers.taxOutcomes, start);
            buffers.kpiLebensdauer.set(chunkBuffers.kpiLebensdauer, start);
            buffers.kpiKuerzungsjahre.set(chunkBuffers.kpiKuerzungsjahre, start);
            buffers.kpiMaxKuerzung.set(chunkBuffers.kpiMaxKuerzung, start);
            buffers.volatilities.set(chunkBuffers.volatilities, start);
            buffers.maxDrawdowns.set(chunkBuffers.maxDrawdowns, start);
            buffers.depotErschoepft.set(chunkBuffers.depotErschoepft, start);
            buffers.alterBeiErschoepfung.set(chunkBuffers.alterBeiErschoepfung, start);
            buffers.anteilJahreOhneFlex.set(chunkBuffers.anteilJahreOhneFlex, start);
            buffers.stress_maxDrawdowns.set(chunkBuffers.stress_maxDrawdowns, start);
            buffers.stress_timeQuoteAbove45.set(chunkBuffers.stress_timeQuoteAbove45, start);
            buffers.stress_cutYears.set(chunkBuffers.stress_cutYears, start);
            buffers.stress_CaR_P10_Real.set(chunkBuffers.stress_CaR_P10_Real, start);
            buffers.stress_recoveryYears.set(chunkBuffers.stress_recoveryYears, start);

            mergeHeatmap(heatmap, result.heatmap);

            totals.failCount += result.totals.failCount;
            totals.pflegeTriggeredCount += result.totals.pflegeTriggeredCount;
            totals.totalSimulatedYears += result.totals.totalSimulatedYears;
            totals.totalYearsQuoteAbove45 += result.totals.totalYearsQuoteAbove45;
            totals.shortfallWithCareCount += result.totals.shortfallWithCareCount;
            totals.shortfallNoCareProxyCount += result.totals.shortfallNoCareProxyCount;
            totals.p2TriggeredCount += result.totals.p2TriggeredCount;

            appendArray(lists.entryAges, result.lists.entryAges);
            appendArray(lists.entryAgesP2, result.lists.entryAgesP2);
            appendArray(lists.careDepotCosts, result.lists.careDepotCosts);
            appendArray(lists.endWealthWithCareList, result.lists.endWealthWithCareList);
            appendArray(lists.endWealthNoCareList, result.lists.endWealthNoCareList);
            appendArray(lists.p1CareYearsTriggered, result.lists.p1CareYearsTriggered);
            appendArray(lists.p2CareYearsTriggered, result.lists.p2CareYearsTriggered);
            appendArray(lists.bothCareYearsOverlapTriggered, result.lists.bothCareYearsOverlapTriggered);
            appendArray(lists.maxAnnualCareSpendTriggered, result.lists.maxAnnualCareSpendTriggered);
            appendArray(allRealWithdrawalsSample, result.allRealWithdrawalsSample);

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
        const aggregatedResults = buildMonteCarloAggregates({
            inputs,
            totalRuns: anzahl,
            buffers: chunk.buffers,
            heatmap: chunk.heatmap,
            bins: chunk.bins || MC_HEATMAP_BINS,
            totals: chunk.totals,
            lists: chunk.lists,
            allRealWithdrawalsSample: chunk.allRealWithdrawalsSample
        });
        return { aggregatedResults, failCount: chunk.totals.failCount };
    } finally {
        if (autoOptimizePool?.telemetry && autoOptimizePool.telemetry.enabled) {
            autoOptimizePool.telemetry.printReport();
        }
        // keep pool alive for reuse across candidates/seeds
    }

    const aggregatedResults = buildMonteCarloAggregates({
        inputs,
        totalRuns: anzahl,
        buffers,
        heatmap,
        bins: MC_HEATMAP_BINS,
        totals,
        lists,
        allRealWithdrawalsSample
    });

    return { aggregatedResults, failCount: totals.failCount };
}
