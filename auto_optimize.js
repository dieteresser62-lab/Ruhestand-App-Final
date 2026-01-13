"use strict";

/**
 * =============================================================================
 * AUTO-OPTIMIZE CORE LOGIC
 * =============================================================================
 *
 * Generische Auto-Optimierung für den Simulator basierend auf:
 * - Einer frei wählbaren Metrik (Objective)
 * - Genau drei Parametern mit Ranges
 * - Separaten Train/Test Seeds für robuste Validierung
 * - Constraint-basierter Kandidatenfilterung
 * - Effizienter Suche via Latin Hypercube Sampling + lokale Verfeinerung
 *
 * Die Ranges übersteuern temporär die Rahmendaten pro Kandidat.
 */

import { rng } from './simulator-utils.js';
import { getCommonInputs, prepareHistoricalData } from './simulator-portfolio.js';
import { compileScenario, getDataVersion } from './simulator-engine-helpers.js';
import { normalizeWidowOptions, deepClone } from './simulator-sweep-utils.js';
import { buildMonteCarloAggregates, createMonteCarloBuffers, MC_HEATMAP_BINS, runMonteCarloChunk } from './monte-carlo-runner.js';
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

async function runMonteCarloAutoOptimize({ inputs, widowOptions, monteCarloParams, useCapeSampling }) {
    const { anzahl } = monteCarloParams;
    const workerConfig = readWorkerConfig();
    const desiredWorkers = workerConfig.workerCount ?? 0;
    const workerCount = Math.max(1, Number.isFinite(desiredWorkers) && desiredWorkers > 0
        ? desiredWorkers
        : Math.max(1, (navigator?.hardwareConcurrency || 2) - 1));
    const timeBudgetMs = workerConfig.timeBudgetMs ?? 200;

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

/**
 * Whitelist der erlaubten Parameter-Keys
 */
const ALLOWED_PARAM_KEYS = [
    'runwayMinM',
    'runwayTargetM',
    'goldTargetPct',
    'targetEq',
    'rebalBand',
    'maxSkimPct',
    'maxBearRefillPct'
];

/**
 * Mutator-Map: Wie werden die Parameter auf die Config angewendet?
 * @param {object} cfg - Config-Objekt (wird mutiert)
 * @param {string} key - Parameter-Key
 * @param {number} value - Wert
 */
function applyParameterMutation(cfg, key, value) {
    switch (key) {
        case 'runwayMinM':
            if (!cfg.runway) cfg.runway = {};
            cfg.runway.min = Math.round(value);
            break;
        case 'runwayTargetM':
            if (!cfg.runway) cfg.runway = {};
            cfg.runway.target = Math.round(value);
            break;
        case 'goldTargetPct':
            if (!cfg.alloc) cfg.alloc = {};
            cfg.alloc.goldTarget = Number(value);
            break;
        case 'targetEq':
            if (!cfg.alloc) cfg.alloc = {};
            cfg.alloc.targetEq = Number(value);
            break;
        case 'rebalBand':
            if (!cfg.rebal) cfg.rebal = {};
            cfg.rebal.band = Number(value);
            break;
        case 'maxSkimPct':
            if (!cfg.skim) cfg.skim = {};
            cfg.skim.maxPct = Number(value);
            break;
        case 'maxBearRefillPct':
            if (!cfg.bear) cfg.bear = {};
            cfg.bear.maxRefillPct = Number(value);
            break;
        default:
            throw new Error(`Unknown parameter key: ${key}`);
    }
}

/**
 * Prüft harte Invarianten (sofort verwerfen)
 * @param {object} candidate - Kandidat mit beliebigen Parametern
 * @param {number} goldCap - Max. erlaubter Gold-Anteil
 * @returns {boolean} true wenn valide
 */
function isValidCandidate(candidate, goldCap) {
    // Runway-Invariante: Min <= Target
    if (candidate.runwayMinM !== undefined && candidate.runwayTargetM !== undefined) {
        if (candidate.runwayMinM > candidate.runwayTargetM) return false;
    }

    // Gold-Invariante: 0 <= goldTarget <= goldCap
    if (candidate.goldTargetPct !== undefined) {
        if (candidate.goldTargetPct < 0 || candidate.goldTargetPct > goldCap) return false;
    }

    // Target Eq: 0 <= targetEq <= 100
    if (candidate.targetEq !== undefined) {
        if (candidate.targetEq < 0 || candidate.targetEq > 100) return false;
    }

    // Rebal Band: 0 <= rebalBand <= 50
    if (candidate.rebalBand !== undefined) {
        if (candidate.rebalBand < 0 || candidate.rebalBand > 50) return false;
    }

    // Max Skim %: 0 <= maxSkimPct <= 100
    if (candidate.maxSkimPct !== undefined) {
        if (candidate.maxSkimPct < 0 || candidate.maxSkimPct > 100) return false;
    }

    // Max Bear Refill %: 0 <= maxBearRefillPct <= 100
    if (candidate.maxBearRefillPct !== undefined) {
        if (candidate.maxBearRefillPct < 0 || candidate.maxBearRefillPct > 100) return false;
    }

    return true;
}

/**
 * Extrahiert Metriken aus aggregierten MC-Ergebnissen
 * @param {object} results - Aggregierte MC-Ergebnisse (FLACHE Struktur!)
 * @param {object} objective - {metric, direction, quantile}
 * @returns {number} Metrikwert
 */
export function getObjectiveValue(results, objective) {
    const { metric, direction, quantile } = objective;
    let value;

    switch (metric) {
        case 'EndWealth_P50':
            value = results.medianEndWealth ?? 0;
            break;
        case 'EndWealth_P25':
            value = results.p25EndWealth ?? 0;
            break;
        case 'SuccessRate':
            value = results.successProbFloor ?? 0;
            break;
        case 'Drawdown_P90':
            value = results.worst5Drawdown ?? 0;
            break;
        case 'TimeShare_WR_gt_4_5':
            value = results.timeShareWRgt45 ?? 0;
            break;
        case 'Median_WR':
            value = results.medianWithdrawalRate ?? 0;
            break;
        default:
            throw new Error(`Unknown metric: ${metric}`);
    }

    // Bei "min" negieren wir, damit Maximierung funktioniert
    return direction === 'max' ? value : -value;
}

/**
 * Prüft Constraints
 * @param {object} results - Aggregierte MC-Ergebnisse (FLACHE Struktur!)
 * @param {object} constraints - {sr99, noex, ts45, dd55}
 * @returns {boolean} true wenn alle aktiven Constraints erfüllt
 */
function checkConstraints(results, constraints) {
    if (constraints.sr99) {
        const sr = results.successProbFloor ?? 0;
        if (sr < 0.99) return false;
    }

    if (constraints.noex) {
        const exhaustionRate = results.depletionRate ?? 0;
        if (exhaustionRate > 0.005) return false; // > 0.5% (relaxed from 0% for practicality)
    }

    if (constraints.ts45) {
        const ts = results.timeShareWRgt45 ?? 0;
        if (ts > 0.01) return false; // > 1%
    }

    if (constraints.dd55) {
        const dd = results.worst5Drawdown ?? 0;
        if (dd > 0.55) return false; // > 55%
    }

    return true;
}

/**
 * Latin Hypercube Sampling für N-dimensionalen Parameter-Raum
 * @param {object} ranges - {param1: {min, max, step}, param2: {...}, ...}
 * @param {number} n - Anzahl Samples
 * @param {Function} rand - RNG-Funktion
 * @returns {Array<object>} Array von {param1: val, param2: val, ...}
 */
function latinHypercubeSample(ranges, n, rand) {
    const params = Object.keys(ranges);

    if (params.length === 0) {
        throw new Error('At least 1 parameter required');
    }

    const samples = [];

    // Generiere Permutationen für jede Dimension
    const perms = params.map(() => {
        const perm = Array.from({ length: n }, (_, i) => i);
        // Fisher-Yates Shuffle
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        return perm;
    });

    for (let i = 0; i < n; i++) {
        const sample = {};
        params.forEach((key, dim) => {
            const { min, max, step } = ranges[key];
            const bin = perms[dim][i];
            const binSize = (max - min) / n;
            const offset = rand() * binSize;
            const rawValue = min + bin * binSize + offset;

            // Snap to step grid
            const steppedValue = Math.round(rawValue / step) * step;
            sample[key] = Math.max(min, Math.min(max, steppedValue));
        });
        samples.push(sample);
    }

    return samples;
}

/**
 * Gibt Delta-Werte für einen Parameter-Key zurück (für Nachbarschafts-Generierung)
 * @param {string} key - Parameter-Key
 * @param {boolean} reduced - Reduzierte Deltas (true) oder volle Deltas (false)
 * @returns {Array<number>} Delta-Werte
 */
function getParameterDeltas(key, reduced = false) {
    const deltaMap = {
        runwayMinM: reduced ? [-2, 2] : [-4, -2, 2, 4],
        runwayTargetM: reduced ? [-2, 2] : [-4, -2, 2, 4],
        goldTargetPct: reduced ? [-1, 1] : [-2, -1, 1, 2],
        targetEq: reduced ? [-2, 2] : [-5, -2, 2, 5],
        rebalBand: reduced ? [-0.5, 0.5] : [-1, -0.5, 0.5, 1],
        maxSkimPct: reduced ? [-2, 2] : [-5, -2, 2, 5],
        maxBearRefillPct: reduced ? [-2, 2] : [-5, -2, 2, 5]
    };
    return deltaMap[key] || (reduced ? [-1, 1] : [-2, -1, 1, 2]);
}

/**
 * Lokale Verfeinerung: Nachbarschaft eines Kandidaten generieren
 * @param {object} candidate - Parameter-Objekt
 * @param {object} ranges - Original-Ranges
 * @returns {Array<object>} Nachbarn
 */
function generateNeighbors(candidate, ranges) {
    const neighbors = [];

    // Für jeden Parameter im Kandidaten
    for (const [key, value] of Object.entries(candidate)) {
        if (!ranges[key]) continue; // Überspringe Parameter ohne Range

        const deltas = getParameterDeltas(key, false);
        for (const delta of deltas) {
            const newVal = value + delta;
            if (newVal >= ranges[key].min && newVal <= ranges[key].max) {
                neighbors.push({ ...candidate, [key]: newVal });
            }
        }
    }

    return neighbors;
}

/**
 * Reduzierte Nachbarschaft für schnellere Verfeinerung
 * @param {object} candidate - Parameter-Objekt
 * @param {object} ranges - Original-Ranges
 * @returns {Array<object>} Nachbarn (nur kleinere Deltas)
 */
function generateNeighborsReduced(candidate, ranges) {
    const neighbors = [];

    // Für jeden Parameter im Kandidaten
    for (const [key, value] of Object.entries(candidate)) {
        if (!ranges[key]) continue; // Überspringe Parameter ohne Range

        const deltas = getParameterDeltas(key, true);
        for (const delta of deltas) {
            const newVal = value + delta;
            if (newVal >= ranges[key].min && newVal <= ranges[key].max) {
                neighbors.push({ ...candidate, [key]: newVal });
            }
        }
    }

    return neighbors;
}

/**
 * Führt eine MC-Simulation für einen Kandidaten aus
 * @param {object} candidate - Parameter-Objekt mit beliebigen Keys
 * @param {object} baseInputs - Basis-Config
 * @param {number} runsPerCandidate - Anzahl MC-Runs
 * @param {number} maxDauer - Max. Simulationsdauer in Jahren
 * @param {Array<number>} seeds - Seed-Array
 * @param {object} constraints - Constraints (optional, für Early Exit)
 * @returns {Promise<object|null>} Aggregierte Ergebnisse oder null wenn Constraints verletzt
 */
async function evaluateCandidate(candidate, baseInputs, runsPerCandidate, maxDauer, seeds, constraints = null) {
    // Deep-clone inputs und Override anwenden
    const inputs = deepClone(baseInputs);

    // Setze Defaults
    if (!inputs.runwayMinMonths) inputs.runwayMinMonths = 24;
    if (!inputs.runwayTargetMonths) inputs.runwayTargetMonths = 36;
    if (!inputs.goldAllokationProzent) inputs.goldAllokationProzent = 0;
    if (!inputs.targetEq) inputs.targetEq = 60;
    if (!inputs.rebalBand) inputs.rebalBand = 5;
    if (!inputs.maxSkimPctOfEq) inputs.maxSkimPctOfEq = 25;
    if (!inputs.maxBearRefillPctOfEq) inputs.maxBearRefillPctOfEq = 50;

    // Mutationen für alle vorhandenen Parameter anwenden
    if (candidate.runwayMinM !== undefined) {
        inputs.runwayMinMonths = candidate.runwayMinM;
    }
    if (candidate.runwayTargetM !== undefined) {
        inputs.runwayTargetMonths = candidate.runwayTargetM;
    }
    if (candidate.goldTargetPct !== undefined) {
        inputs.goldAllokationProzent = candidate.goldTargetPct;
    }
    if (candidate.targetEq !== undefined) {
        inputs.targetEq = candidate.targetEq;
    }
    if (candidate.rebalBand !== undefined) {
        inputs.rebalBand = candidate.rebalBand;
    }
    if (candidate.maxSkimPct !== undefined) {
        inputs.maxSkimPctOfEq = candidate.maxSkimPct;
    }
    if (candidate.maxBearRefillPct !== undefined) {
        inputs.maxBearRefillPctOfEq = candidate.maxBearRefillPct;
    }

    // Normalisiere Widow Options
    const widowOptions = normalizeWidowOptions(inputs.widowOptions);

    // Sammle Ergebnisse über alle Seeds
    const allResults = [];

    for (const seed of seeds) {
        const monteCarloParams = {
            anzahl: runsPerCandidate,
            maxDauer,
            blockSize: 5,
            seed,
            methode: 'regime_markov'
        };

        const { aggregatedResults, failCount } = await runMonteCarloAutoOptimize({
            inputs,
            widowOptions,
            monteCarloParams,
            useCapeSampling: false,
            onProgress: () => { }
        });

        allResults.push({ aggregatedResults, failCount, anzahl: runsPerCandidate });

        // DEBUG: Log first aggregatedResults structure
        if (allResults.length === 1) {

        }

        // OPTIMIZATION: Early Exit bei harten Constraint-Verletzungen
        // Wenn bereits nach 1-2 Seeds klar ist, dass Constraints verletzt werden,
        // müssen die restlichen Seeds nicht mehr berechnet werden
        if (constraints && allResults.length >= 2) {
            const partialAvg = {
                successRate: mean(allResults.map(r => (r.anzahl - r.failCount) / r.anzahl)),
                depletionRate: mean(allResults.map(r => (r.aggregatedResults.depotErschoepfungsQuote ?? 0) / 100)), // % → 0-1
                timeShareWRgt45: mean(allResults.map(r => r.aggregatedResults.extraKPI?.timeShareQuoteAbove45 ?? 0)),
                worst5Drawdown: mean(allResults.map(r => (r.aggregatedResults.maxDrawdowns?.p90 ?? 0) / 100)) // % → 0-1
            };

            // Harte Constraints: Wenn deutlich verfehlt (>5% Puffer), abbrechen
            if (constraints.sr99 && partialAvg.successRate < 0.94) return null;
            if (constraints.noex && partialAvg.depletionRate > 0.05) return null;
            if (constraints.ts45 && partialAvg.timeShareWRgt45 > 0.05) return null;
            if (constraints.dd55 && partialAvg.worst5Drawdown > 0.60) return null;
        }
    }

    // Mittelwerte über Seeds bilden
    // WICHTIG: Normalisierung - manche Werte sind bereits in % (→ /100), andere in Dezimal
    const avgResults = {
        successProbFloor: mean(allResults.map(r => (r.anzahl - r.failCount) / r.anzahl)),
        depletionRate: mean(allResults.map(r => (r.aggregatedResults.depotErschoepfungsQuote ?? 0) / 100)), // % → 0-1
        timeShareWRgt45: mean(allResults.map(r => r.aggregatedResults.extraKPI?.timeShareQuoteAbove45 ?? 0)), // already 0-1
        p25EndWealth: mean(allResults.map(r => r.aggregatedResults.finalOutcomes?.p10 ?? 0)), // absolute €
        medianEndWealth: mean(allResults.map(r => r.aggregatedResults.finalOutcomes?.p50 ?? 0)), // absolute €
        worst5Drawdown: mean(allResults.map(r => (r.aggregatedResults.maxDrawdowns?.p90 ?? 0) / 100)), // % → 0-1
        medianWithdrawalRate: 0 // Not available in aggregatedResults
    };

    return avgResults;
}

/**
 * Hilfsfunktion: Mittelwert
 */
function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Memo-Cache für evaluierte Kandidaten
 */
class CandidateCache {
    constructor() {
        this.cache = new Map();
    }

    key(candidate) {
        // Dynamically generate cache key from all parameter keys (sorted for consistency)
        const keys = Object.keys(candidate).sort();
        return keys.map(k => `${k}:${candidate[k]}`).join('|');
    }

    has(candidate) {
        return this.cache.has(this.key(candidate));
    }

    get(candidate) {
        return this.cache.get(this.key(candidate));
    }

    set(candidate, results) {
        this.cache.set(this.key(candidate), results);
    }
}

/**
 * Tie-Breaker: Wenn Objective gleich, nutze sekundäre Kriterien
 * @param {object} a - Kandidat A mit results
 * @param {object} b - Kandidat B mit results
 * @returns {number} -1 wenn a besser, 1 wenn b besser, 0 wenn gleich
 */
function tieBreaker(a, b) {
    // 1. Höhere Success Rate
    const srA = a.results.successProbFloor ?? 0;
    const srB = b.results.successProbFloor ?? 0;
    if (Math.abs(srA - srB) > 0.001) return srB - srA > 0 ? 1 : -1;

    // 2. Niedrigerer Drawdown P90
    const ddA = a.results.drawdown?.p90 ?? 0;
    const ddB = b.results.drawdown?.p90 ?? 0;
    if (Math.abs(ddA - ddB) > 0.001) return ddA - ddB > 0 ? 1 : -1;

    // 3. Niedrigerer TimeShare > 4.5%
    const tsA = a.results.timeShareWRgt45 ?? 0;
    const tsB = b.results.timeShareWRgt45 ?? 0;
    if (Math.abs(tsA - tsB) > 0.0001) return tsA - tsB > 0 ? 1 : -1;

    return 0;
}

/**
 * Hauptfunktion: Auto-Optimize
 * @param {object} config - Konfiguration
 * @returns {Promise<object>} {championCfg, metricsTest, deltaVsCurrent, stability}
 */
export async function runAutoOptimize(config) {
    const {
        objective,
        params,
        runsPerCandidate,
        seedsTrain,
        seedsTest,
        constraints,
        maxDauer,
        onProgress = () => { }
    } = config;

    // Prepare historical data
    prepareHistoricalData();

    // Basis-Inputs
    const baseInputs = getCommonInputs();

    // Gold Cap aus Config
    const goldCap = baseInputs.goldAllokationProzent || 10;

    // RNG für LHS
    const rand = rng(42);

    // Seeds generieren
    const trainSeedArray = Array.from({ length: seedsTrain }, (_, i) => 42 + i);
    const testSeedArray = Array.from({ length: seedsTest }, (_, i) => 420 + i);

    // Cache
    const cache = new CandidateCache();

    onProgress({ stage: 'lhs', progress: 0 });

    // OPTIMIZATION 1: Reduzierte LHS-Größe (100 statt 200)
    const lhsSamples = latinHypercubeSample(params, 100, rand);

    const validCandidates = [];
    for (const sample of lhsSamples) {
        // Dynamically copy all parameters from sample
        const candidate = { ...sample };

        if (isValidCandidate(candidate, goldCap)) {
            validCandidates.push(candidate);
        }
    }

    onProgress({ stage: 'quick_filter', progress: 0, total: validCandidates.length });

    // OPTIMIZATION 2: Early Pruning - Quick-Filter mit reduzierten Runs
    // Phase 1a: Quick-Filter mit nur 200 Runs × 2 Seeds
    const quickFilterRuns = Math.min(200, Math.round(runsPerCandidate * 0.1));
    const quickFilterSeeds = trainSeedArray.slice(0, 2);

    // Quick-Filter: KEINE Constraints (zu wenig Runs, zu hohe Varianz)
    // Constraints werden erst bei voller Evaluation mit allen Runs geprüft
    const BATCH_SIZE = 4; // OPTIMIZATION 3: Parallele Evaluation
    const quickFiltered = [];

    for (let i = 0; i < validCandidates.length; i += BATCH_SIZE) {
        const batch = validCandidates.slice(i, i + BATCH_SIZE);

        // Parallel evaluation
        const batchResults = await Promise.all(
            batch.map(async (candidate) => {
                const results = await evaluateCandidate(
                    candidate,
                    baseInputs,
                    quickFilterRuns,
                    maxDauer,
                    quickFilterSeeds,
                    null // KEIN Early Exit im Quick-Filter (zu wenig Runs für verlässliche Constraints)
                );

                if (results) {
                    // Quick-Filter: Sortiere nur nach Objective, keine harten Constraints
                    const objValue = getObjectiveValue(results, objective);
                    return { candidate, objValue, quickResults: results };
                }
                return null;
            })
        );

        quickFiltered.push(...batchResults.filter(r => r !== null));
        onProgress({ stage: 'quick_filter', progress: Math.min(i + BATCH_SIZE, validCandidates.length), total: validCandidates.length });
    }

    if (quickFiltered.length === 0) {
        throw new Error('Quick filter failed: all candidates produced invalid results');
    }

    // Sortiere und nimm Top-50
    quickFiltered.sort((a, b) => b.objValue - a.objValue);
    const top50 = quickFiltered.slice(0, Math.min(50, quickFiltered.length));

    onProgress({ stage: 'evaluate_lhs', progress: 0, total: top50.length });

    // Phase 1b: Volle Evaluation der Top-50
    const evaluated = [];

    for (let i = 0; i < top50.length; i += BATCH_SIZE) {
        const batch = top50.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
            batch.map(async (entry) => {
                const candidate = entry.candidate;

                if (!cache.has(candidate)) {
                    const results = await evaluateCandidate(
                        candidate,
                        baseInputs,
                        runsPerCandidate,
                        maxDauer,
                        trainSeedArray,
                        constraints
                    );
                    if (results) cache.set(candidate, results);
                }

                const results = cache.get(candidate);
                if (results && checkConstraints(results, constraints)) {
                    const objValue = getObjectiveValue(results, objective);
                    return { candidate, results, objValue };
                }
                return null;
            })
        );

        evaluated.push(...batchResults.filter(r => r !== null));
        onProgress({ stage: 'evaluate_lhs', progress: Math.min(i + BATCH_SIZE, top50.length), total: top50.length });
    }

    if (evaluated.length === 0) {
        throw new Error('No candidates satisfied constraints after full evaluation');
    }

    // Sortiere nach Objective
    evaluated.sort((a, b) => b.objValue - a.objValue);

    // Top-5 für lokale Verfeinerung (statt Top-10)
    const top5 = evaluated.slice(0, 5);

    onProgress({ stage: 'refine', progress: 0 });

    // Phase 2: Lokale Verfeinerung (nur ±2 statt ±2/±4)
    const refineCandidates = new Set();
    for (const entry of top5) {
        const neighbors = generateNeighborsReduced(entry.candidate, params);
        for (const neighbor of neighbors) {
            if (isValidCandidate(neighbor, goldCap)) {
                refineCandidates.add(JSON.stringify(neighbor));
            }
        }
    }

    const refineArray = Array.from(refineCandidates).map(s => JSON.parse(s));

    onProgress({ stage: 'refine', progress: 0, total: refineArray.length });

    for (let i = 0; i < refineArray.length; i += BATCH_SIZE) {
        const batch = refineArray.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
            batch.map(async (candidate) => {
                if (!cache.has(candidate)) {
                    const results = await evaluateCandidate(
                        candidate,
                        baseInputs,
                        runsPerCandidate,
                        maxDauer,
                        trainSeedArray,
                        constraints
                    );
                    if (results) cache.set(candidate, results);
                }

                const results = cache.get(candidate);
                if (results && checkConstraints(results, constraints)) {
                    const objValue = getObjectiveValue(results, objective);
                    return { candidate, results, objValue };
                }
                return null;
            })
        );

        evaluated.push(...batchResults.filter(r => r !== null));
        onProgress({ stage: 'refine', progress: Math.min(i + BATCH_SIZE, refineArray.length), total: refineArray.length });
    }

    // Neu sortieren
    evaluated.sort((a, b) => {
        const diff = b.objValue - a.objValue;
        if (Math.abs(diff) > 0.0001) return diff;
        return tieBreaker(a, b);
    });

    // Top-3 für Test-Validierung
    const top3 = evaluated.slice(0, 3);

    onProgress({ stage: 'validate', progress: 0, total: top3.length });

    // Phase 3: Validierung auf Test-Seeds
    const validated = [];
    for (let i = 0; i < top3.length; i++) {
        const entry = top3[i];

        const testResults = await evaluateCandidate(
            entry.candidate,
            baseInputs,
            runsPerCandidate,
            maxDauer,
            testSeedArray
        );

        if (checkConstraints(testResults, constraints)) {
            const testObjValue = getObjectiveValue(testResults, objective);
            validated.push({
                candidate: entry.candidate,
                trainResults: entry.results,
                testResults,
                trainObjValue: entry.objValue,
                testObjValue
            });
        }

        onProgress({ stage: 'validate', progress: i + 1, total: top3.length });
    }

    if (validated.length === 0) {
        throw new Error('No candidates passed validation on test seeds');
    }

    // Champion-Auswahl (basierend auf Test-Objective)
    validated.sort((a, b) => {
        const diff = b.testObjValue - a.testObjValue;
        if (Math.abs(diff) > 0.0001) return diff;
        return tieBreaker(
            { results: a.testResults },
            { results: b.testResults }
        );
    });

    const champion = validated[0];

    // Stabilität: Wie oft war Champion in den Top-3 über verschiedene Seed-Kombinationen?
    // Vereinfachte Metrik: Verhältnis Train-Objective zu Test-Objective
    const stability = Math.min(1, champion.trainObjValue / (champion.testObjValue + 0.0001));

    // Delta vs. Current - dynamically build current config from baseInputs
    const currentConfig = {};

    // Map all possible parameters from baseInputs to candidate format
    if (params.runwayMinM !== undefined) {
        currentConfig.runwayMinM = baseInputs.runwayMinMonths || 24;
    }
    if (params.runwayTargetM !== undefined) {
        currentConfig.runwayTargetM = baseInputs.runwayTargetMonths || 36;
    }
    if (params.goldTargetPct !== undefined) {
        currentConfig.goldTargetPct = baseInputs.goldAllokationProzent || 0;
    }
    if (params.targetEq !== undefined) {
        currentConfig.targetEq = baseInputs.targetEq || 60;
    }
    if (params.rebalBand !== undefined) {
        currentConfig.rebalBand = baseInputs.rebalBand || 5;
    }
    if (params.maxSkimPct !== undefined) {
        currentConfig.maxSkimPct = baseInputs.maxSkimPctOfEq || 25;
    }
    if (params.maxBearRefillPct !== undefined) {
        currentConfig.maxBearRefillPct = baseInputs.maxBearRefillPctOfEq || 50;
    }

    const currentResults = await evaluateCandidate(
        currentConfig,
        baseInputs,
        runsPerCandidate,
        maxDauer,
        testSeedArray
    );

    const delta = {
        successRate: (champion.testResults.successProbFloor ?? 0) - (currentResults.successProbFloor ?? 0),
        drawdownP90: (champion.testResults.worst5Drawdown ?? 0) - (currentResults.worst5Drawdown ?? 0),
        endWealthP50: (champion.testResults.medianEndWealth ?? 0) - (currentResults.medianEndWealth ?? 0),
        timeShareWRgt45: (champion.testResults.timeShareWRgt45 ?? 0) - (currentResults.timeShareWRgt45 ?? 0)
    };

    onProgress({ stage: 'done', progress: 1 });

    return {
        championCfg: champion.candidate,
        metricsTest: champion.testResults,
        deltaVsCurrent: delta,
        stability
    };
}
