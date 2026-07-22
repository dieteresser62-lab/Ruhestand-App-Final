"use strict";

import { getCommonInputs } from './simulator-portfolio.js';
import { compileScenario, getDataVersion, prepareHistoricalDataOnce } from './simulator-engine-helpers.js';
import { displayMonteCarloResults } from './simulator-results.js';
import { normalizeWidowOptions } from './simulator-sweep-utils.js';
import { readMonteCarloParameters, createMonteCarloUI } from './monte-carlo-ui.js';
import { ScenarioAnalyzer } from './scenario-analyzer.js';
import {
    attachMonteCarloBatchOutcome,
    buildMonteCarloAggregates,
    runMonteCarloChunk,
    runMonteCarloSimulation
} from './monte-carlo-runner.js';
import {
    createMonteCarloChunkAccumulatorV1,
    finalizeMonteCarloChunkAccumulatorV1,
    mergeMonteCarloChunkResultV1
} from './monte-carlo-chunk-result.js';
import {
    WorkerJobRunner,
    WorkerRunCancelledError,
    isWorkerRunCancelledError
} from './worker-job-runner.js';
import { featureFlags } from '../shared/feature-flags.js';
import { WorkerPool } from '../../workers/worker-pool.js';
import { formatSimulatorValidationError, validateSimulatorInputs } from './simulator-input-validation.js';
import { EngineAPI } from '../../engine/index.mjs';
import {
    createMonteCarloRunRequestV1,
    createMonteCarloRunResultV1
} from './monte-carlo-contracts.js';
import {
    captureMonteCarloEngineProvenance,
    createMonteCarloExportDownload
} from './monte-carlo-export.js';

const formatMs = (value, digits = 0) => `${Number(value).toFixed(digits)} ms`;
const formatSpeedup = (value, digits = 2) => `${Number(value).toFixed(digits)}x`;

function mergeHeatmap(target, source) {
    // Sum bin counts per year; used for worker chunk merges.
    for (let year = 0; year < target.length; year++) {
        const targetRow = target[year];
        const sourceRow = source[year];
        if (!sourceRow) continue;
        for (let i = 0; i < targetRow.length; i++) {
            targetRow[i] += sourceRow[i] || 0;
        }
    }
}

async function runMonteCarloLogsForIndices({
    inputs,
    widowOptions,
    monteCarloParams,
    useCapeSampling,
    runIndices,
    generationId,
    signal = null
}) {
    const logsByIndex = new Map();
    if (!Array.isArray(runIndices) || runIndices.length === 0) return logsByIndex;
    for (const runIdx of runIndices) {
        throwIfRunCancelled(signal, generationId);
        // Re-run a single index with logging enabled to get full log rows.
        const chunk = await runMonteCarloChunk({
            inputs,
            widowOptions,
            monteCarloParams,
            useCapeSampling,
            runRange: { start: runIdx, count: 1 },
            logIndices: [runIdx]
        });
        const meta = chunk.runMeta?.[0];
        if (meta && meta.logDataRows && meta.logDataRows.length) {
            logsByIndex.set(meta.index, meta.logDataRows);
        }
    }
    return logsByIndex;
}

function appendArray(target, source) {
    if (!source || source.length === 0) return;
    for (let i = 0; i < source.length; i++) {
        target.push(source[i]);
    }
}

export { mergeHeatmap, appendArray };

let globalMonteCarloPool = null;
let globalMonteCarloPoolSize = 0;
let activeMonteCarloRun = null;
let nextMonteCarloGeneration = 1;

function createMonteCarloGenerationId() {
    return `monte-carlo-${nextMonteCarloGeneration++}`;
}

function throwIfRunCancelled(signal, generationId) {
    if (signal?.aborted) {
        throw new WorkerRunCancelledError(generationId, signal.reason);
    }
}

function getMonteCarloPool(workerCount) {
    if (!globalMonteCarloPool
        || globalMonteCarloPoolSize !== workerCount
        || globalMonteCarloPool.disposed
        || globalMonteCarloPool.poolDisabled) {
        if (globalMonteCarloPool) {
            globalMonteCarloPool.dispose();
        }
        globalMonteCarloPool = new WorkerPool({
            workerUrl: new URL('../../workers/mc-worker.js', import.meta.url),
            size: workerCount,
            type: 'module',
            telemetryName: 'MonteCarloPool',
            onError: error => console.error('[MC WorkerPool] Error:', error)
        });
        globalMonteCarloPoolSize = workerCount;
    }
    return globalMonteCarloPool;
}

async function runMonteCarloWithWorkers({
    inputs,
    widowOptions,
    monteCarloParams,
    useCapeSampling,
    scenarioAnalyzer,
    onProgress,
    workerConfig = null,
    generationId,
    signal = null
}) {
    throwIfRunCancelled(signal, generationId);
    const {
        anzahl,
        maxDauer,
        blockSize,
        seed,
        methode,
        rngMode = 'per-run-seed',
        startYearMode,
        startYearFilter,
        startYearHalfLife,
        excludeEstimatedHistory = false
    } = monteCarloParams;
    const desiredWorkers = workerConfig?.workerCount ?? 0;
    const workerCount = Math.max(1, Number.isFinite(desiredWorkers) && desiredWorkers > 0
        ? desiredWorkers
        : Math.max(1, (navigator?.hardwareConcurrency || 2) - 1));
    const pool = getMonteCarloPool(workerCount);
    pool.ensureCapacity();
    pool.onError = error => console.error('[MC WorkerPool] Error:', error);

    const { scenarioKey, compiledScenario } = compileScenario(inputs, widowOptions, methode, useCapeSampling, inputs.stressPreset);
    const dataVersion = getDataVersion();
    // Random sample indices are logged by workers to build scenario highlights.
    const logIndices = scenarioAnalyzer?.getRandomSampleIndices?.() || null;

    const chunkAccumulator = createMonteCarloChunkAccumulatorV1(anzahl);
    const timeBudgetMs = workerConfig?.timeBudgetMs ?? 200;
    const chunkConfiguration = {
        strategy: 'adaptive-time-budget-v1',
        minChunkRuns: 10,
        baseTimeoutMs: 5000,
        stallTimeoutMs: 20000
    };
    const runner = new WorkerJobRunner({
        pool,
        totalItems: anzahl,
        workerCount,
        timeBudgetMs,
        minChunk: chunkConfiguration.minChunkRuns,
        baseTimeoutMs: chunkConfiguration.baseTimeoutMs,
        stallTimeoutMs: chunkConfiguration.stallTimeoutMs,
        onProgress: pct => onProgress(pct * 0.9),
        buildPayload: (start, count) => ({
            type: 'job',
            scenarioKey,
            runRange: { start, count },
            monteCarloParams: {
                anzahl: count,
                maxDauer,
                blockSize,
                seed,
                methode,
                rngMode,
                startYearMode,
                startYearFilter,
                startYearHalfLife,
                excludeEstimatedHistory
            },
            useCapeSampling,
            logIndices,
            dataVersion
        }),
        mergeResult: (result, start, count) => {
            mergeMonteCarloChunkResultV1(chunkAccumulator, result, {
                expectedStart: start,
                expectedCount: count
            });
        },
        generationId,
        signal
    });

    const abortGeneration = () => {
        void pool.cancelGeneration(
            generationId,
            new WorkerRunCancelledError(generationId, signal?.reason)
        ).catch(error => console.error('[MC] Worker generation cancellation failed.', error));
    };
    signal?.addEventListener?.('abort', abortGeneration, { once: true });
    try {
        await pool.broadcast({
            type: 'init',
            scenarioKey,
            compiledScenario,
            dataVersion
        }, [], { generationId });

        throwIfRunCancelled(signal, generationId);
        await runner.run();
    } finally {
        signal?.removeEventListener?.('abort', abortGeneration);
        // keep pool alive for reuse across runs
    }

    throwIfRunCancelled(signal, generationId);
    const finalized = finalizeMonteCarloChunkAccumulatorV1(chunkAccumulator);
    if (scenarioAnalyzer) {
        for (const meta of finalized.runMeta) {
            // Track samples in global run order, independent of worker completion order.
            meta.isRandomSample = scenarioAnalyzer.shouldCaptureRandomSample(meta.index);
            scenarioAnalyzer.addRun(meta);
        }
    }

    let worstRun = finalized.worstRun;
    let worstRunCare = finalized.worstRunCare;
    if (!worstRun) {
        worstRun = { finalVermoegen: Infinity, logDataRows: [], failed: false, comboIdx: 0, runIdx: 0 };
    }
    if (!worstRunCare) {
        worstRunCare = { finalVermoegen: Infinity, logDataRows: [], failed: false, hasCare: false, comboIdx: 0, runIdx: 0 };
    }

    onProgress(95);
    await new Promise(resolve => setTimeout(resolve, 0));
    throwIfRunCancelled(signal, generationId);

    const aggregatedResults = attachMonteCarloBatchOutcome(buildMonteCarloAggregates({
        inputs,
        totalRuns: anzahl,
        buffers: finalized.buffers,
        heatmap: finalized.heatmap,
        bins: finalized.bins,
        totals: finalized.totals,
        lists: finalized.lists,
        allRealWithdrawalsSample: finalized.allRealWithdrawalsSample
    }), finalized.technicalInventory);

    onProgress(100);

    return {
        aggregatedResults,
        failCount: finalized.totals.failCount,
        worstRun,
        worstRunCare,
        pflegeTriggeredCount: finalized.totals.pflegeTriggeredCount,
        batchStatus: aggregatedResults.batchStatus,
        financialMetricsValid: aggregatedResults.financialMetricsValid,
        technicalInventory: finalized.technicalInventory,
        samplingDiagnostics: finalized.samplingDiagnostics,
        executionDiagnostics: {
            mode: 'worker',
            workerCount,
            timeBudgetMs,
            chunkConfiguration
        }
    };
}

/**
 * Koordiniert die Monte-Carlo-Simulation (UI-Orchestrator)
 *
 * Diese Funktion ist der zentrale Einstiegspunkt für Monte-Carlo-Simulationen.
 * Sie orchestriert:
 * - UI-Vorbereitung (Fortschrittsbalken, Button-States)
 * - Eingabedaten-Sammlung (Portfolio, Renten, Pflege, MC-Parameter)
 * - Aufruf der DOM-freien Simulation (monte-carlo-runner.js)
 * - Szenario-Analyse und Auswahl charakteristischer Runs
 * - Ergebnis-Darstellung (Perzentile, KPIs, Worst-Run, Pflegefall-Statistik)
 *
 * Die eigentliche Simulationslogik ist DOM-frei; UI-spezifische Aufgaben
 * (Fortschrittsanzeige, Benutzereingaben, Ergebnisdarstellung) werden hier gebündelt.
 *
 * @async
 * @returns {Promise<void>} Promise, das nach Abschluss der Simulation aufgelöst wird
 * @throws {Error} Bei Validierungs- oder Berechnungsfehlern
 */
export function runMonteCarlo() {
    if (activeMonteCarloRun) return activeMonteCarloRun.promise;

    const runState = {
        generationId: createMonteCarloGenerationId(),
        controller: new AbortController(),
        status: 'running',
        ui: null,
        promise: null,
        cancelPromise: null
    };
    activeMonteCarloRun = runState;
    runState.promise = executeMonteCarloRun(runState).finally(() => {
        if (activeMonteCarloRun === runState) activeMonteCarloRun = null;
    });
    return runState.promise;
}

export function cancelMonteCarlo() {
    const runState = activeMonteCarloRun;
    if (!runState) return Promise.resolve(false);
    if (runState.cancelPromise) return runState.cancelPromise;

    runState.status = 'cancelling';
    runState.ui?.beginCancelling?.();
    runState.controller.abort(new WorkerRunCancelledError(runState.generationId));
    runState.cancelPromise = runState.promise.then(
        () => true,
        () => true
    );
    return runState.cancelPromise;
}

async function executeMonteCarloRun(runState) {
    const { generationId, controller } = runState;
    const { signal } = controller;
    const ui = createMonteCarloUI();
    runState.ui = ui;
    ui.bindCancel?.(() => cancelMonteCarlo());
    ui.beginRun?.();
    ui.disableStart();
    ui.hideError(); // Reset error state
    ui.clearRunExport();
    const updateProgress = percent => {
        if (!signal.aborted && activeMonteCarloRun === runState) {
            ui.updateProgress(percent);
        }
    };

    try {
        throwIfRunCancelled(signal, generationId);
        prepareHistoricalDataOnce();
        const inputs = validateSimulatorInputs(getCommonInputs());
        const widowOptions = normalizeWidowOptions(inputs.widowOptions);
        const {
            anzahl,
            maxDauer,
            blockSize,
            seed,
            methode,
            rngMode,
            startYearMode,
            startYearFilter,
            startYearHalfLife,
            excludeEstimatedHistory
        } = readMonteCarloParameters();
        const monteCarloParams = {
            anzahl,
            maxDauer,
            blockSize,
            seed,
            methode,
            rngMode,
            startYearMode,
            startYearFilter,
            startYearHalfLife,
            excludeEstimatedHistory
        };

        ui.showProgress();
        updateProgress(0);
        ui.hideCompareResults();

        const scenarioAnalyzer = new ScenarioAnalyzer(anzahl);
        const useWorkers = rngMode !== 'legacy-stream';
        const useCapeSampling = ui.readUseCapeSampling();
        const compareMode = ui.readCompareMode();
        const workerConfig = ui.readWorkerConfig();
        let results = null;
        let usedWorkers = false;

        if (compareMode) {
            const serialStart = performance.now();
            const serialResults = await runMonteCarloSimulation({
                inputs,
                widowOptions,
                monteCarloParams,
                useCapeSampling,
                onProgress: pct => updateProgress(pct * 0.5),
                scenarioAnalyzer: null
            });
            throwIfRunCancelled(signal, generationId);
            const serialElapsed = performance.now() - serialStart;

            if (!useWorkers) {
                ui.showCompareResults(`Seriell: ${formatMs(serialElapsed)} (Worker nicht verfuegbar im Legacy-Stream).`);
                results = serialResults;
            } else {
                const workerStart = performance.now();
                try {
                    results = await runMonteCarloWithWorkers({
                        inputs,
                        widowOptions,
                        monteCarloParams,
                        useCapeSampling,
                        onProgress: pct => updateProgress(50 + pct * 0.5),
                        scenarioAnalyzer,
                        workerConfig,
                        generationId,
                        signal
                    });
                    usedWorkers = true;
                    const workerElapsed = performance.now() - workerStart;
                    const speedup = serialElapsed > 0 ? (serialElapsed / workerElapsed) : 0;
                    ui.showCompareResults(`Seriell: ${formatMs(serialElapsed)} · Worker: ${formatMs(workerElapsed)} · Speedup: ${formatSpeedup(speedup, 2)}`);
                } catch (error) {
                    if (isWorkerRunCancelledError(error) || signal.aborted) throw error;
                    console.error('[MC] Worker execution failed, falling back to serial.', error);
                    results = serialResults;
                    ui.showCompareResults(`Seriell: ${formatMs(serialElapsed)} · Worker fehlgeschlagen (Fallback auf seriell).`);
                }
            }
        } else if (useWorkers) {
            try {
                results = await runMonteCarloWithWorkers({
                    inputs,
                    widowOptions,
                    monteCarloParams,
                    useCapeSampling,
                    onProgress: pct => updateProgress(pct),
                    scenarioAnalyzer,
                    workerConfig,
                    generationId,
                    signal
                });
                usedWorkers = true;
            } catch (error) {
                if (isWorkerRunCancelledError(error) || signal.aborted) throw error;
                console.error('[MC] Worker execution failed, falling back to serial.', error);
                results = null;
            }
        }

        if (!results) {
            throwIfRunCancelled(signal, generationId);
            results = await runMonteCarloSimulation({
                inputs,
                widowOptions,
                monteCarloParams,
                useCapeSampling,
                onProgress: pct => updateProgress(pct),
                scenarioAnalyzer
                // engine parameter removed - wrapper selects correct engine based on feature flag mode
            });
        }
        throwIfRunCancelled(signal, generationId);

        const {
            aggregatedResults,
            failCount,
            worstRun,
            worstRunCare,
            pflegeTriggeredCount,
            batchStatus,
            technicalInventory
        } = results;

        const effectiveExecutionDiagnostics = results.executionDiagnostics || {
            mode: 'serial',
            workerCount: 0,
            timeBudgetMs: null,
            chunkConfiguration: {
                strategy: 'single-chunk-v1',
                minChunkRuns: null,
                baseTimeoutMs: null,
                stallTimeoutMs: null
            }
        };
        const { scenarioKey } = compileScenario(
            inputs,
            widowOptions,
            methode,
            useCapeSampling,
            inputs.stressPreset
        );
        const runRequest = createMonteCarloRunRequestV1({
            inputs,
            widowOptions,
            monteCarloParams,
            useCapeSampling,
            samplingDiagnostics: results.samplingDiagnostics,
            dataVersion: results.samplingDiagnostics?.dataVersion || getDataVersion(),
            execution: {
                ...effectiveExecutionDiagnostics,
                compareModeRequested: compareMode
            },
            scenarioKey
        });
        const runResult = createMonteCarloRunResultV1({
            aggregatedResults,
            samplingDiagnostics: results.samplingDiagnostics,
            executionDiagnostics: runRequest.execution,
            requestedRuns: anzahl
        });
        ui.publishRunExport(createMonteCarloExportDownload({
            request: runRequest,
            result: runResult,
            engine: captureMonteCarloEngineProvenance(EngineAPI)
        }));

        if (batchStatus === 'technical_error') {
            const firstError = technicalInventory?.errors?.[0];
            ui.showError(firstError?.message || 'Die Monte-Carlo-Simulation wurde wegen eines technischen Fehlers beendet.');
            return;
        }

        if (usedWorkers && scenarioAnalyzer) {
            // Re-run selected indices in serial to capture full log rows.
            const targetIndices = scenarioAnalyzer.getCharacteristicIndices();
            const logsByIndex = await runMonteCarloLogsForIndices({
                inputs,
                widowOptions,
                monteCarloParams,
            useCapeSampling,
            runIndices: targetIndices,
            generationId,
            signal
        });
            throwIfRunCancelled(signal, generationId);
            scenarioAnalyzer.updateRunLogs(logsByIndex);
            if (logsByIndex.has(worstRun?.runIdx)) {
                worstRun.logDataRows = logsByIndex.get(worstRun.runIdx);
            }
            if (logsByIndex.has(worstRunCare?.runIdx)) {
                worstRunCare.logDataRows = logsByIndex.get(worstRunCare.runIdx);
            }
        }

        const scenarioLogs = scenarioAnalyzer.buildScenarioLogs();
        throwIfRunCancelled(signal, generationId);
        displayMonteCarloResults(aggregatedResults, anzahl, failCount, worstRun, {}, {}, pflegeTriggeredCount, inputs, worstRunCare, scenarioLogs);
    } catch (e) {
        if (isWorkerRunCancelledError(e) || signal.aborted) {
            runState.status = 'cancelled';
            ui.showCancelled?.();
            return;
        }
        console.error("Monte-Carlo Simulation Failed:", e);
        ui.showError(formatSimulatorValidationError(e));
    } finally {
        await ui.finishProgress({ completed: runState.status !== 'cancelled' });
        ui.unbindCancel?.();
        ui.finishRun?.();
        ui.enableStart();
    }
}
