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
import { normalizeWidowOptions, deepClone } from './simulator-sweep-utils.js';
import { runMonteCarloSimulation } from './monte-carlo-runner.js';
import { ScenarioAnalyzer } from './scenario-analyzer.js';

/**
 * Whitelist der erlaubten Parameter-Keys
 */
const ALLOWED_PARAM_KEYS = ['runwayMinM', 'runwayTargetM', 'goldTargetPct'];

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
        default:
            throw new Error(`Unknown parameter key: ${key}`);
    }
}

/**
 * Prüft harte Invarianten (sofort verwerfen)
 * @param {object} candidate - Kandidat mit {runwayMinM, runwayTargetM, goldTargetPct}
 * @param {number} goldCap - Max. erlaubter Gold-Anteil
 * @returns {boolean} true wenn valide
 */
function isValidCandidate(candidate, goldCap) {
    const { runwayMinM, runwayTargetM, goldTargetPct } = candidate;

    // Runway Min <= Runway Target
    if (runwayMinM > runwayTargetM) return false;

    // Gold innerhalb 0..goldCap
    if (goldTargetPct < 0 || goldTargetPct > goldCap) return false;

    return true;
}

/**
 * Extrahiert Metriken aus aggregierten MC-Ergebnissen
 * @param {object} results - Aggregierte MC-Ergebnisse
 * @param {object} objective - {metric, direction, quantile}
 * @returns {number} Metrikwert
 */
export function getObjectiveValue(results, objective) {
    const { metric, direction, quantile } = objective;
    let value;

    switch (metric) {
        case 'EndWealth_P50':
            value = results.endWealth?.p50 ?? results.medianEndWealth ?? 0;
            break;
        case 'EndWealth_P25':
            value = results.endWealth?.p25 ?? results.p25EndWealth ?? 0;
            break;
        case 'SuccessRate':
            value = results.successProbFloor ?? results.successRate ?? 0;
            break;
        case 'Drawdown_P90':
            value = results.drawdown?.p90 ?? results.worst5Drawdown ?? 0;
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
 * @param {object} results - Aggregierte MC-Ergebnisse
 * @param {object} constraints - {sr99, noex, ts45, dd55}
 * @returns {boolean} true wenn alle aktiven Constraints erfüllt
 */
function checkConstraints(results, constraints) {
    if (constraints.sr99) {
        const sr = results.successProbFloor ?? results.successRate ?? 0;
        if (sr < 0.99) return false;
    }

    if (constraints.noex) {
        const exhaustionRate = results.depletionRate ?? 0;
        if (exhaustionRate > 0) return false;
    }

    if (constraints.ts45) {
        const ts = results.timeShareWRgt45 ?? 0;
        if (ts > 0.01) return false; // > 1%
    }

    if (constraints.dd55) {
        const dd = results.drawdown?.p90 ?? results.worst5Drawdown ?? 0;
        if (dd > 0.55) return false; // > 55%
    }

    return true;
}

/**
 * Latin Hypercube Sampling für 3D-Parameter-Raum
 * @param {object} ranges - {p1: {min, max, step}, p2: {...}, p3: {...}}
 * @param {number} n - Anzahl Samples
 * @param {Function} rand - RNG-Funktion
 * @returns {Array<object>} Array von {p1Val, p2Val, p3Val}
 */
function latinHypercubeSample(ranges, n, rand) {
    const params = Object.keys(ranges);
    if (params.length !== 3) throw new Error('Exactly 3 parameters required');

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
 * Lokale Verfeinerung: Nachbarschaft eines Kandidaten generieren
 * @param {object} candidate - {runwayMinM, runwayTargetM, goldTargetPct}
 * @param {object} ranges - Original-Ranges
 * @returns {Array<object>} Nachbarn
 */
function generateNeighbors(candidate, ranges) {
    const neighbors = [];

    // Runway Min: ±2, ±4 Monate
    for (const delta of [-4, -2, 2, 4]) {
        const val = candidate.runwayMinM + delta;
        if (val >= ranges.runwayMinM.min && val <= ranges.runwayMinM.max) {
            neighbors.push({ ...candidate, runwayMinM: val });
        }
    }

    // Runway Target: ±2, ±4 Monate
    for (const delta of [-4, -2, 2, 4]) {
        const val = candidate.runwayTargetM + delta;
        if (val >= ranges.runwayTargetM.min && val <= ranges.runwayTargetM.max) {
            neighbors.push({ ...candidate, runwayTargetM: val });
        }
    }

    // Gold: ±1, ±2 Prozentpunkte
    for (const delta of [-2, -1, 1, 2]) {
        const val = candidate.goldTargetPct + delta;
        if (val >= ranges.goldTargetPct.min && val <= ranges.goldTargetPct.max) {
            neighbors.push({ ...candidate, goldTargetPct: val });
        }
    }

    return neighbors;
}

/**
 * Führt eine MC-Simulation für einen Kandidaten aus
 * @param {object} candidate - {runwayMinM, runwayTargetM, goldTargetPct}
 * @param {object} baseInputs - Basis-Config
 * @param {number} runsPerCandidate - Anzahl MC-Runs
 * @param {number} maxDauer - Max. Simulationsdauer in Jahren
 * @param {Array<number>} seeds - Seed-Array
 * @returns {Promise<object>} Aggregierte Ergebnisse
 */
async function evaluateCandidate(candidate, baseInputs, runsPerCandidate, maxDauer, seeds) {
    // Deep-clone inputs und Override anwenden
    const inputs = deepClone(baseInputs);

    // Mutationen anwenden
    if (!inputs.runwayMinMonths) inputs.runwayMinMonths = 24;
    if (!inputs.runwayTargetMonths) inputs.runwayTargetMonths = 36;
    if (!inputs.goldAllokationProzent) inputs.goldAllokationProzent = 0;

    inputs.runwayMinMonths = candidate.runwayMinM;
    inputs.runwayTargetMonths = candidate.runwayTargetM;
    inputs.goldAllokationProzent = candidate.goldTargetPct;

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

        const scenarioAnalyzer = new ScenarioAnalyzer(runsPerCandidate);

        const { aggregatedResults } = await runMonteCarloSimulation({
            inputs,
            widowOptions,
            monteCarloParams,
            useCapeSampling: false,
            onProgress: () => {},
            scenarioAnalyzer
        });

        allResults.push(aggregatedResults);
    }

    // Mittelwerte über Seeds bilden
    const avgResults = {
        successProbFloor: mean(allResults.map(r => r.successProbFloor ?? r.successRate ?? 0)),
        depletionRate: mean(allResults.map(r => r.depletionRate ?? 0)),
        timeShareWRgt45: mean(allResults.map(r => r.timeShareWRgt45 ?? 0)),
        endWealth: {
            p25: mean(allResults.map(r => r.endWealth?.p25 ?? r.p25EndWealth ?? 0)),
            p50: mean(allResults.map(r => r.endWealth?.p50 ?? r.medianEndWealth ?? 0))
        },
        drawdown: {
            p90: mean(allResults.map(r => r.drawdown?.p90 ?? r.worst5Drawdown ?? 0))
        },
        medianWithdrawalRate: mean(allResults.map(r => r.medianWithdrawalRate ?? 0))
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
        return `${candidate.runwayMinM}|${candidate.runwayTargetM}|${candidate.goldTargetPct}`;
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
        onProgress = () => {}
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

    // Phase 1: Latin Hypercube Sampling (200 Kandidaten)
    const lhsSamples = latinHypercubeSample(params, 200, rand);

    const validCandidates = [];
    for (const sample of lhsSamples) {
        const candidate = {
            runwayMinM: sample.runwayMinM,
            runwayTargetM: sample.runwayTargetM,
            goldTargetPct: sample.goldTargetPct
        };

        if (isValidCandidate(candidate, goldCap)) {
            validCandidates.push(candidate);
        }
    }

    onProgress({ stage: 'evaluate_lhs', progress: 0, total: validCandidates.length });

    // Evaluiere alle validen Kandidaten
    const evaluated = [];
    for (let i = 0; i < validCandidates.length; i++) {
        const candidate = validCandidates[i];

        if (!cache.has(candidate)) {
            const results = await evaluateCandidate(
                candidate,
                baseInputs,
                runsPerCandidate,
                maxDauer,
                trainSeedArray
            );
            cache.set(candidate, results);
        }

        const results = cache.get(candidate);

        // Constraints prüfen
        if (checkConstraints(results, constraints)) {
            const objValue = getObjectiveValue(results, objective);
            evaluated.push({ candidate, results, objValue });
        }

        onProgress({ stage: 'evaluate_lhs', progress: i + 1, total: validCandidates.length });
    }

    if (evaluated.length === 0) {
        throw new Error('No candidates satisfied constraints');
    }

    // Sortiere nach Objective
    evaluated.sort((a, b) => b.objValue - a.objValue);

    // Top-10 für lokale Verfeinerung
    const top10 = evaluated.slice(0, 10);

    onProgress({ stage: 'refine', progress: 0 });

    // Phase 2: Lokale Verfeinerung
    const refineCandidates = new Set();
    for (const entry of top10) {
        const neighbors = generateNeighbors(entry.candidate, params);
        for (const neighbor of neighbors) {
            if (isValidCandidate(neighbor, goldCap)) {
                refineCandidates.add(JSON.stringify(neighbor));
            }
        }
    }

    const refineArray = Array.from(refineCandidates).map(s => JSON.parse(s));

    for (let i = 0; i < refineArray.length; i++) {
        const candidate = refineArray[i];

        if (!cache.has(candidate)) {
            const results = await evaluateCandidate(
                candidate,
                baseInputs,
                runsPerCandidate,
                maxDauer,
                trainSeedArray
            );
            cache.set(candidate, results);
        }

        const results = cache.get(candidate);

        if (checkConstraints(results, constraints)) {
            const objValue = getObjectiveValue(results, objective);
            evaluated.push({ candidate, results, objValue });
        }
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

    // Delta vs. Current
    const currentResults = await evaluateCandidate(
        {
            runwayMinM: baseInputs.runwayMinMonths || 24,
            runwayTargetM: baseInputs.runwayTargetMonths || 36,
            goldTargetPct: baseInputs.goldAllokationProzent || 0
        },
        baseInputs,
        runsPerCandidate,
        maxDauer,
        testSeedArray
    );

    const delta = {
        successRate: (champion.testResults.successProbFloor ?? 0) - (currentResults.successProbFloor ?? 0),
        drawdownP90: (champion.testResults.drawdown?.p90 ?? 0) - (currentResults.drawdown?.p90 ?? 0),
        endWealthP50: (champion.testResults.endWealth?.p50 ?? 0) - (currentResults.endWealth?.p50 ?? 0),
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
