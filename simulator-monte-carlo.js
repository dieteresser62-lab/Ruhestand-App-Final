"use strict";

import { getCommonInputs } from './simulator-portfolio.js';
import { compileScenario, getDataVersion, prepareHistoricalDataOnce } from './simulator-engine-helpers.js';
import { displayMonteCarloResults } from './simulator-results.js';
import { normalizeWidowOptions } from './simulator-sweep-utils.js';
import { readMonteCarloParameters, createMonteCarloUI } from './monte-carlo-ui.js';
import { ScenarioAnalyzer } from './scenario-analyzer.js';
import { buildMonteCarloAggregates, createMonteCarloBuffers, MC_HEATMAP_BINS, pickWorstRun, runMonteCarloChunk, runMonteCarloSimulation } from './monte-carlo-runner.js';
import { featureFlags } from './feature-flags.js';
import { WorkerPool } from './workers/worker-pool.js';

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

async function runMonteCarloLogsForIndices({
    inputs,
    widowOptions,
    monteCarloParams,
    useCapeSampling,
    runIndices
}) {
    const logsByIndex = new Map();
    if (!Array.isArray(runIndices) || runIndices.length === 0) return logsByIndex;
    for (const runIdx of runIndices) {
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

async function runMonteCarloWithWorkers({
    inputs,
    widowOptions,
    monteCarloParams,
    useCapeSampling,
    scenarioAnalyzer,
    onProgress,
    workerConfig = null
}) {
    const { anzahl, maxDauer, blockSize, seed, methode, rngMode = 'per-run-seed' } = monteCarloParams;
    const desiredWorkers = workerConfig?.workerCount ?? 0;
    const workerCount = Math.max(1, Number.isFinite(desiredWorkers) && desiredWorkers > 0
        ? desiredWorkers
        : (navigator?.hardwareConcurrency || 2));
    const workerUrl = new URL('./workers/mc-worker.js', import.meta.url);
    const stallTimeoutMs = 20000;
    const pollIntervalMs = 250;
    let lastProgressAt = performance.now();
    const pool = new WorkerPool({
        workerUrl,
        size: workerCount,
        type: 'module',
        onProgress: () => {
            lastProgressAt = performance.now();
        },
        onError: error => console.error('[MC WorkerPool] Error:', error)
    });

    const { scenarioKey, compiledScenario } = compileScenario(inputs, widowOptions, methode, useCapeSampling, inputs.stressPreset);
    const dataVersion = getDataVersion();
    const logIndices = scenarioAnalyzer?.getRandomSampleIndices?.() || null;

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

    let worstRun = null;
    let worstRunCare = null;
    let runsCompleted = 0;
    let nextRunIdx = 0;

    const timeBudgetMs = workerConfig?.timeBudgetMs ?? 200;
    const minChunk = 25;
    const maxChunk = Math.max(minChunk, Math.ceil(anzahl / workerCount));
    let chunkSize = Math.min(maxChunk, Math.max(minChunk, Math.floor(anzahl / (workerCount * 4)) || minChunk));

    const pending = new Set();

    const scheduleJob = (start, count) => {
        const startedAt = performance.now();
        const payload = {
            type: 'job',
            scenarioKey,
            runRange: { start, count },
            monteCarloParams: {
                anzahl: count,
                maxDauer,
                blockSize,
                seed,
                methode,
                rngMode
            },
            useCapeSampling,
            logIndices
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

        while (nextRunIdx < anzahl && pending.size < workerCount) {
            const count = Math.min(chunkSize, anzahl - nextRunIdx);
            scheduleJob(nextRunIdx, count);
            nextRunIdx += count;
        }

        while (pending.size > 0) {
            let raced = null;
            while (!raced) {
                const next = await Promise.race([
                    Promise.race(pending),
                    new Promise(resolve => setTimeout(resolve, pollIntervalMs))
                ]);
                if (next) {
                    raced = next;
                    break;
                }
                if (performance.now() - lastProgressAt > stallTimeoutMs) {
                    throw new Error('Worker jobs stalled; falling back to serial execution.');
                }
            }

            const { result, start, count, elapsedMs } = raced;

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

            lists.entryAges.push(...result.lists.entryAges);
            lists.entryAgesP2.push(...result.lists.entryAgesP2);
            lists.careDepotCosts.push(...result.lists.careDepotCosts);
            lists.endWealthWithCareList.push(...result.lists.endWealthWithCareList);
            lists.endWealthNoCareList.push(...result.lists.endWealthNoCareList);
            lists.p1CareYearsTriggered.push(...result.lists.p1CareYearsTriggered);
            lists.p2CareYearsTriggered.push(...result.lists.p2CareYearsTriggered);
            lists.bothCareYearsOverlapTriggered.push(...result.lists.bothCareYearsOverlapTriggered);
            lists.maxAnnualCareSpendTriggered.push(...result.lists.maxAnnualCareSpendTriggered);
            allRealWithdrawalsSample.push(...result.allRealWithdrawalsSample);

            worstRun = pickWorstRun(worstRun, result.worstRun);
            worstRunCare = pickWorstRun(worstRunCare, result.worstRunCare);

            if (scenarioAnalyzer && result.runMeta) {
                for (const meta of result.runMeta) {
                    meta.isRandomSample = scenarioAnalyzer.shouldCaptureRandomSample(meta.index);
                    scenarioAnalyzer.addRun(meta);
                }
            }

            runsCompleted += count;
            onProgress((runsCompleted / anzahl) * 90);
            lastProgressAt = performance.now();

            if (elapsedMs > 0) {
                const scaled = Math.round(count * (timeBudgetMs / elapsedMs));
                chunkSize = Math.max(minChunk, Math.min(maxChunk, scaled || minChunk));
            }

            if (nextRunIdx < anzahl) {
                const nextCount = Math.min(chunkSize, anzahl - nextRunIdx);
            scheduleJob(nextRunIdx, nextCount);
            nextRunIdx += nextCount;
        }
        }
    } finally {
        pool.dispose();
    }

    if (!worstRun) {
        worstRun = { finalVermoegen: Infinity, logDataRows: [], failed: false, comboIdx: 0, runIdx: 0 };
    }
    if (!worstRunCare) {
        worstRunCare = { finalVermoegen: Infinity, logDataRows: [], failed: false, hasCare: false, comboIdx: 0, runIdx: 0 };
    }

    onProgress(95);
    await new Promise(resolve => setTimeout(resolve, 0));

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

    onProgress(100);

    return {
        aggregatedResults,
        failCount: totals.failCount,
        worstRun,
        worstRunCare,
        pflegeTriggeredCount: totals.pflegeTriggeredCount
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
export async function runMonteCarlo() {
    const ui = createMonteCarloUI();
    ui.disableStart();
    ui.hideError(); // Reset error state

    try {
        prepareHistoricalDataOnce();
        const inputs = getCommonInputs();
        const widowOptions = normalizeWidowOptions(inputs.widowOptions);
        const { anzahl, maxDauer, blockSize, seed, methode, rngMode } = readMonteCarloParameters();

        ui.showProgress();
        ui.updateProgress(0);
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
                monteCarloParams: { anzahl, maxDauer, blockSize, seed, methode, rngMode },
                useCapeSampling,
                onProgress: pct => ui.updateProgress(pct * 0.5),
                scenarioAnalyzer: null
            });
            const serialElapsed = performance.now() - serialStart;

            if (!useWorkers) {
                ui.showCompareResults(`Seriell: ${serialElapsed.toFixed(0)} ms (Worker nicht verfuegbar im Legacy-Stream).`);
                results = serialResults;
            } else {
                const workerStart = performance.now();
                try {
                    results = await runMonteCarloWithWorkers({
                        inputs,
                        widowOptions,
                        monteCarloParams: { anzahl, maxDauer, blockSize, seed, methode, rngMode },
                        useCapeSampling,
                        onProgress: pct => ui.updateProgress(50 + pct * 0.5),
                        scenarioAnalyzer,
                        workerConfig
                    });
                    usedWorkers = true;
                    const workerElapsed = performance.now() - workerStart;
                    const speedup = serialElapsed > 0 ? (serialElapsed / workerElapsed) : 0;
                    ui.showCompareResults(`Seriell: ${serialElapsed.toFixed(0)} ms · Worker: ${workerElapsed.toFixed(0)} ms · Speedup: ${speedup.toFixed(2)}x`);
                } catch (error) {
                    console.error('[MC] Worker execution failed, falling back to serial.', error);
                    results = serialResults;
                    ui.showCompareResults(`Seriell: ${serialElapsed.toFixed(0)} ms · Worker fehlgeschlagen (Fallback auf seriell).`);
                }
            }
        } else if (useWorkers) {
            try {
                results = await runMonteCarloWithWorkers({
                    inputs,
                    widowOptions,
                    monteCarloParams: { anzahl, maxDauer, blockSize, seed, methode, rngMode },
                    useCapeSampling,
                    onProgress: pct => ui.updateProgress(pct),
                    scenarioAnalyzer,
                    workerConfig
                });
                usedWorkers = true;
            } catch (error) {
                console.error('[MC] Worker execution failed, falling back to serial.', error);
                results = null;
            }
        }

        if (!results) {
            results = await runMonteCarloSimulation({
                inputs,
                widowOptions,
                monteCarloParams: { anzahl, maxDauer, blockSize, seed, methode, rngMode },
                useCapeSampling,
                onProgress: pct => ui.updateProgress(pct),
                scenarioAnalyzer
                // engine parameter removed - wrapper selects correct engine based on feature flag mode
            });
        }

        const { aggregatedResults, failCount, worstRun, worstRunCare, pflegeTriggeredCount } = results;

        if (usedWorkers && scenarioAnalyzer) {
            const targetIndices = scenarioAnalyzer.getCharacteristicIndices();
            const logsByIndex = await runMonteCarloLogsForIndices({
                inputs,
                widowOptions,
                monteCarloParams: { anzahl, maxDauer, blockSize, seed, methode, rngMode },
                useCapeSampling,
                runIndices: targetIndices
            });
            scenarioAnalyzer.updateRunLogs(logsByIndex);
            if (logsByIndex.has(worstRun?.runIdx)) {
                worstRun.logDataRows = logsByIndex.get(worstRun.runIdx);
            }
            if (logsByIndex.has(worstRunCare?.runIdx)) {
                worstRunCare.logDataRows = logsByIndex.get(worstRunCare.runIdx);
            }
        }

        const scenarioLogs = scenarioAnalyzer.buildScenarioLogs();
        displayMonteCarloResults(aggregatedResults, anzahl, failCount, worstRun, {}, {}, pflegeTriggeredCount, inputs, worstRunCare, scenarioLogs);
    } catch (e) {
        console.error("Monte-Carlo Simulation Failed:", e);
        ui.showError(e);
    } finally {
        await ui.finishProgress();
        ui.enableStart();
    }
}
