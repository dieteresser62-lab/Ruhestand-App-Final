"use strict";

/**
 * Tests für auto_optimize.js und zugehörige Module
 * - Latin Hypercube Sampling
 * - Nachbarschafts-Generierung
 * - Kandidaten-Validierung
 * - Constraint-Prüfung
 * - Objective-Extraktion
 * - Cache-Funktionalität
 * - Tie-Breaker-Logik
 * - Haupt-Optimierungsfunktion
 */

console.log('--- Auto-Optimizer Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); },
        key: (index) => Array.from(store.keys())[index] || null,
        get length() { return store.size; }
    };
}

function createDocumentStub() {
    return {
        getElementById: () => ({ value: '0', checked: false })
    };
}

const prevDocument = global.document;
const prevLocalStorage = global.localStorage;
const prevWindow = global.window;

try {
    global.document = createDocumentStub();
    global.localStorage = createLocalStorageMock();
    global.window = {};

    // Importiere Module
    const { latinHypercubeSample, generateNeighborsReduced } = await import('../app/simulator/auto-optimize-sampling.js');
    const { isValidCandidate } = await import('../app/simulator/auto-optimize-params.js');
    const { checkConstraints, getObjectiveValue } = await import('../app/simulator/auto-optimize-metrics.js');
    const { CandidateCache, tieBreaker } = await import('../app/simulator/auto-optimize-utils.js');
    const { rng } = await import('../app/simulator/simulator-utils.js');
    const { runAutoOptimize } = await import('../app/simulator/auto_optimize.js');

    // ========== Latin Hypercube Sampling Tests ==========

    // Test 1: LHS - Grundfunktionalität
    console.log('Test 1: LHS - Grundfunktionalität');
    {
        const rand = rng(42);
        const ranges = {
            targetEq: { min: 20, max: 80, step: 5 }
        };

        // Erwartung: LHS liefert gleichmäßig verteilte Samples im Range.
        const samples = latinHypercubeSample(ranges, 10, rand);

        assert(samples.length === 10, 'LHS sollte 10 Samples liefern');
        assert(samples.every(s => typeof s.targetEq === 'number'), 'Alle Samples sollten targetEq haben');
        assert(samples.every(s => s.targetEq >= 20 && s.targetEq <= 80), 'Alle Werte sollten in Range liegen');
    }
    console.log('✓ LHS Grundfunktionalität OK');

    // Test 2: LHS - Multi-Parameter
    console.log('Test 2: LHS - Multi-Parameter');
    {
        const rand = rng(123);
        const ranges = {
            targetEq: { min: 30, max: 70, step: 2 },
            rebalBand: { min: 2, max: 10, step: 1 },
            goldTargetPct: { min: 0, max: 15, step: 1 }
        };

        const samples = latinHypercubeSample(ranges, 20, rand);

        assert(samples.length === 20, 'LHS sollte 20 Samples liefern');
        assert(samples.every(s => 'targetEq' in s && 'rebalBand' in s && 'goldTargetPct' in s),
            'Alle Samples sollten alle Parameter haben');
    }
    console.log('✓ LHS Multi-Parameter OK');

    // Test 3: LHS - Step-Rounding
    console.log('Test 3: LHS - Step-Rounding');
    {
        const rand = rng(999);
        const ranges = {
            runwayMinM: { min: 12, max: 48, step: 6 }
        };

        // Alle Samples müssen auf dem Step-Grid landen.
        const samples = latinHypercubeSample(ranges, 50, rand);

        // Alle Werte sollten durch Step teilbar sein
        const validSteps = samples.every(s => s.runwayMinM % 6 === 0 || Math.abs(s.runwayMinM % 6) < 0.0001);
        assert(validSteps, 'Alle Werte sollten auf Step-Grid liegen');
    }
    console.log('✓ LHS Step-Rounding OK');

    // ========== Nachbarschafts-Generierung Tests ==========

    // Test 4: generateNeighborsReduced - Basis
    console.log('Test 4: generateNeighborsReduced - Basis');
    {
        const candidate = { targetEq: 60, rebalBand: 5 };
        const ranges = {
            targetEq: { min: 20, max: 80, step: 2 },
            rebalBand: { min: 1, max: 10, step: 0.5 }
        };

        const neighbors = generateNeighborsReduced(candidate, ranges);

        assert(neighbors.length > 0, 'Sollte Nachbarn generieren');
        assert(neighbors.every(n => n.targetEq !== undefined && n.rebalBand !== undefined),
            'Alle Nachbarn sollten alle Parameter haben');
    }
    console.log('✓ generateNeighborsReduced Basis OK');

    // Test 5: generateNeighborsReduced - Respektiert Grenzen
    console.log('Test 5: generateNeighborsReduced - Respektiert Grenzen');
    {
        const candidate = { targetEq: 20 }; // Am Minimum
        const ranges = {
            targetEq: { min: 20, max: 80, step: 2 }
        };

        // Nachbarn dürfen nicht unter das Minimum fallen.
        const neighbors = generateNeighborsReduced(candidate, ranges);

        // Kein Nachbar sollte unter 20 sein
        assert(neighbors.every(n => n.targetEq >= 20), 'Kein Nachbar sollte unter Minimum sein');
    }
    console.log('✓ generateNeighborsReduced Grenzen OK');

    // ========== Kandidaten-Validierung Tests ==========

    // Test 6: isValidCandidate - Gültiger Kandidat
    console.log('Test 6: isValidCandidate - Gültiger Kandidat');
    {
        const candidate = {
            runwayMinM: 24,
            runwayTargetM: 36,
            targetEq: 60,
            goldTargetPct: 5
        };

        assert(isValidCandidate(candidate, 10), 'Gültiger Kandidat sollte akzeptiert werden');
    }
    console.log('✓ isValidCandidate Gültiger Kandidat OK');

    // Test 7: isValidCandidate - Runway-Invariante verletzt
    console.log('Test 7: isValidCandidate - Runway-Invariante');
    {
        const candidate = {
            runwayMinM: 48, // Min > Target = ungültig
            runwayTargetM: 36
        };

        assert(!isValidCandidate(candidate, 10), 'Kandidat mit runwayMinM > runwayTargetM sollte abgelehnt werden');
    }
    console.log('✓ isValidCandidate Runway-Invariante OK');

    // Test 8: isValidCandidate - Gold-Cap überschritten
    console.log('Test 8: isValidCandidate - Gold-Cap');
    {
        const candidate = { goldTargetPct: 15 };
        const goldCap = 10;

        assert(!isValidCandidate(candidate, goldCap), 'Kandidat mit goldTargetPct > Cap sollte abgelehnt werden');
    }
    console.log('✓ isValidCandidate Gold-Cap OK');

    // Test 9: isValidCandidate - Negative Werte
    console.log('Test 9: isValidCandidate - Negative Werte');
    {
        assert(!isValidCandidate({ targetEq: -10 }, 10), 'Negativer targetEq sollte abgelehnt werden');
        assert(!isValidCandidate({ rebalBand: -5 }, 10), 'Negativer rebalBand sollte abgelehnt werden');
        assert(!isValidCandidate({ goldTargetPct: -1 }, 10), 'Negativer goldTargetPct sollte abgelehnt werden');
    }
    console.log('✓ isValidCandidate Negative Werte OK');

    // Test 10: isValidCandidate - Grenzen überschritten
    console.log('Test 10: isValidCandidate - Grenzen überschritten');
    {
        assert(!isValidCandidate({ targetEq: 150 }, 10), 'targetEq > 100 sollte abgelehnt werden');
        assert(!isValidCandidate({ rebalBand: 60 }, 10), 'rebalBand > 50 sollte abgelehnt werden');
        assert(!isValidCandidate({ maxSkimPct: 120 }, 10), 'maxSkimPct > 100 sollte abgelehnt werden');
    }
    console.log('✓ isValidCandidate Grenzen OK');

    // ========== Constraint-Prüfung Tests ==========

    // Test 11: checkConstraints - Alle erfüllt
    console.log('Test 11: checkConstraints - Alle erfüllt');
    {
        const results = {
            successProbFloor: 1.0,
            depletionRate: 0,
            timeShareWRgt45: 0,
            worst5Drawdown: 0.3
        };

        const constraints = { sr99: true, noex: true, ts45: true, dd55: true };

        assert(checkConstraints(results, constraints), 'Alle Constraints sollten erfüllt sein');
    }
    console.log('✓ checkConstraints Alle erfüllt OK');

    // Test 12: checkConstraints - Success Rate verletzt
    console.log('Test 12: checkConstraints - Success Rate verletzt');
    {
        const results = { successProbFloor: 0.95 }; // < 99%

        assert(!checkConstraints(results, { sr99: true }), 'sr99 Constraint sollte verletzt sein');
    }
    console.log('✓ checkConstraints Success Rate OK');

    // Test 13: checkConstraints - Drawdown verletzt
    console.log('Test 13: checkConstraints - Drawdown verletzt');
    {
        const results = { worst5Drawdown: 0.6 }; // > 55%

        assert(!checkConstraints(results, { dd55: true }), 'dd55 Constraint sollte verletzt sein');
    }
    console.log('✓ checkConstraints Drawdown OK');

    // Test 14: checkConstraints - Leere Constraints
    console.log('Test 14: checkConstraints - Leere Constraints');
    {
        const results = { successProbFloor: 0.5, worst5Drawdown: 0.9 };
        const constraints = { sr99: false, noex: false, ts45: false, dd55: false };

        assert(checkConstraints(results, constraints), 'Inaktive Constraints sollten immer erfüllt sein');
    }
    console.log('✓ checkConstraints Leere Constraints OK');

    // ========== Objective-Extraktion Tests ==========

    // Test 15: getObjectiveValue - EndWealth_P50
    console.log('Test 15: getObjectiveValue - EndWealth_P50');
    {
        const results = { medianEndWealth: 500000 };
        const objective = { metric: 'EndWealth_P50', direction: 'max' };

        assertEqual(getObjectiveValue(results, objective), 500000, 'EndWealth_P50 sollte medianEndWealth zurückgeben');
    }
    console.log('✓ getObjectiveValue EndWealth_P50 OK');

    // Test 16: getObjectiveValue - Minimierung (negiert)
    console.log('Test 16: getObjectiveValue - Minimierung');
    {
        const results = { worst5Drawdown: 0.3 };
        const objective = { metric: 'Drawdown_P90', direction: 'min' };

        assertEqual(getObjectiveValue(results, objective), -0.3, 'min-Direction sollte negieren');
    }
    console.log('✓ getObjectiveValue Minimierung OK');

    // Test 17: getObjectiveValue - Unbekannte Metrik
    console.log('Test 17: getObjectiveValue - Unbekannte Metrik');
    {
        let errorThrown = false;
        try {
            getObjectiveValue({}, { metric: 'UnknownMetric', direction: 'max' });
        } catch (e) {
            errorThrown = true;
            assert(e.message.includes('Unknown metric'), 'Fehler sollte "Unknown metric" enthalten');
        }
        assert(errorThrown, 'Unbekannte Metrik sollte Fehler werfen');
    }
    console.log('✓ getObjectiveValue Unbekannte Metrik OK');

    // ========== Cache Tests ==========

    // Test 18: CandidateCache - Basis-Operationen
    console.log('Test 18: CandidateCache - Basis-Operationen');
    {
        const cache = new CandidateCache();

        const candidate = { targetEq: 60, rebalBand: 5 };
        const results = { medianEndWealth: 500000 };

        assert(!cache.has(candidate), 'Cache sollte initial leer sein');

        cache.set(candidate, results);

        assert(cache.has(candidate), 'Cache sollte Kandidat enthalten');
        assertEqual(cache.get(candidate).medianEndWealth, 500000, 'Cache sollte korrekten Wert zurückgeben');
    }
    console.log('✓ CandidateCache Basis-Operationen OK');

    // Test 19: CandidateCache - Key-Generierung
    console.log('Test 19: CandidateCache - Key-Generierung');
    {
        const cache = new CandidateCache();

        // Gleiche Werte in unterschiedlicher Reihenfolge sollten gleichen Key haben
        const candidate1 = { a: 1, b: 2 };
        const candidate2 = { b: 2, a: 1 };

        cache.set(candidate1, { value: 'test' });

        assert(cache.has(candidate2), 'Kandidaten mit gleichen Werten sollten gleichen Key haben');
    }
    console.log('✓ CandidateCache Key-Generierung OK');

    // ========== Tie-Breaker Tests ==========

    // Test 20: tieBreaker - Höhere Success Rate gewinnt
    console.log('Test 20: tieBreaker - Höhere Success Rate');
    {
        const a = { results: { successProbFloor: 0.95 } };
        const b = { results: { successProbFloor: 0.99 } };

        const result = tieBreaker(a, b);

        assert(result > 0, 'b (höhere SR) sollte gewinnen');
    }
    console.log('✓ tieBreaker Höhere Success Rate OK');

    // Test 21: tieBreaker - Niedrigerer Drawdown bei gleicher SR
    console.log('Test 21: tieBreaker - Niedrigerer Drawdown');
    {
        const a = { results: { successProbFloor: 0.99, drawdown: { p90: 0.4 } } };
        const b = { results: { successProbFloor: 0.99, drawdown: { p90: 0.3 } } };

        const result = tieBreaker(a, b);

        assert(result > 0, 'a (höherer DD) sollte verlieren');
    }
    console.log('✓ tieBreaker Niedrigerer Drawdown OK');

    // Test 22: tieBreaker - Gleiche Werte
    console.log('Test 22: tieBreaker - Gleiche Werte');
    {
        const a = { results: { successProbFloor: 0.99, drawdown: { p90: 0.3 }, timeShareWRgt45: 0.01 } };
        const b = { results: { successProbFloor: 0.99, drawdown: { p90: 0.3 }, timeShareWRgt45: 0.01 } };

        const result = tieBreaker(a, b);

        assertEqual(result, 0, 'Identische Werte sollten 0 ergeben');
    }
    console.log('✓ tieBreaker Gleiche Werte OK');

    // ========== Haupt-Optimierung Test ==========

    // Test 23: runAutoOptimize - Champion nahe Optimum
    console.log('Test 23: runAutoOptimize - Champion nahe Optimum');
    {
        const mockEvaluate = async (candidate, baseInputs) => {
            const targetEq = Number.isFinite(candidate?.targetEq)
                ? candidate.targetEq
                : (Number.isFinite(baseInputs?.targetEq) ? baseInputs.targetEq : 60);
            const score = 1000 - Math.pow(targetEq - 60, 2);
            return {
                medianEndWealth: score,
                successProbFloor: 1,
                worst5Drawdown: 0,
                timeShareWRgt45: 0,
                medianWithdrawalRate: 0.03
            };
        };

        const result = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: {
                targetEq: { min: 20, max: 90, step: 2 }
            },
            runsPerCandidate: 20,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: { sr99: false, noex: false, ts45: false, dd55: false },
            maxDauer: 30,
            evaluateCandidateFn: mockEvaluate
        });

        assert(result && result.championCfg, 'Sollte Champion zurückgeben');
        assert(Number.isFinite(result.championCfg.targetEq), 'Champion sollte targetEq haben');
        const delta = Math.abs(result.championCfg.targetEq - 60);
        assert(delta <= 4, `Champion sollte nahe Optimum sein (delta ${delta})`);
        assert(result.metricsTest.medianEndWealth > 900, 'Objective sollte nahe Maximum sein');
    }
    console.log('✓ runAutoOptimize Champion nahe Optimum OK');

    // Test 24: runAutoOptimize - Multi-Parameter
    console.log('Test 24: runAutoOptimize - Multi-Parameter');
    {
        const mockEvaluate = async (candidate) => {
            const eq = candidate.targetEq ?? 60;
            const band = candidate.rebalBand ?? 5;
            // Optimum bei targetEq=50, rebalBand=4
            const score = 1000 - Math.pow(eq - 50, 2) - Math.pow(band - 4, 2) * 10;
            return {
                medianEndWealth: Math.max(0, score),
                successProbFloor: 1,
                worst5Drawdown: 0,
                timeShareWRgt45: 0
            };
        };

        const result = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: {
                targetEq: { min: 30, max: 70, step: 2 },
                rebalBand: { min: 2, max: 8, step: 1 }
            },
            runsPerCandidate: 10,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: {},
            maxDauer: 25,
            evaluateCandidateFn: mockEvaluate
        });

        assert(result && result.championCfg, 'Sollte Champion zurückgeben');
        assert('targetEq' in result.championCfg && 'rebalBand' in result.championCfg,
            'Champion sollte beide Parameter haben');
    }
    console.log('✓ runAutoOptimize Multi-Parameter OK');

    // Test 25: runAutoOptimize - Stability-Metrik
    console.log('Test 25: runAutoOptimize - Stability-Metrik');
    {
        const mockEvaluate = async (candidate) => {
            return {
                medianEndWealth: 500000,
                successProbFloor: 1,
                worst5Drawdown: 0.2,
                timeShareWRgt45: 0
            };
        };

        const result = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: { targetEq: { min: 50, max: 70, step: 5 } },
            runsPerCandidate: 10,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: {},
            maxDauer: 20,
            evaluateCandidateFn: mockEvaluate
        });

        assert(typeof result.stability === 'number', 'Stability sollte Zahl sein');
        assert(result.stability >= 0 && result.stability <= 1, 'Stability sollte zwischen 0 und 1 liegen');
    }
    console.log('✓ runAutoOptimize Stability-Metrik OK');

    // Test 26: runAutoOptimize - Delta vs Current
    console.log('Test 26: runAutoOptimize - Delta vs Current');
    {
        const mockEvaluate = async (candidate) => {
            const eq = candidate.targetEq ?? 60;
            return {
                medianEndWealth: eq * 10000,
                successProbFloor: 0.95 + eq / 1000,
                worst5Drawdown: 0.5 - eq / 200,
                timeShareWRgt45: 0.01
            };
        };

        const result = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: { targetEq: { min: 40, max: 80, step: 5 } },
            runsPerCandidate: 10,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: {},
            maxDauer: 20,
            evaluateCandidateFn: mockEvaluate
        });

        assert(result.deltaVsCurrent !== undefined, 'deltaVsCurrent sollte vorhanden sein');
        assert('successRate' in result.deltaVsCurrent, 'Delta sollte successRate enthalten');
        assert('endWealthP50' in result.deltaVsCurrent, 'Delta sollte endWealthP50 enthalten');
    }
    console.log('✓ runAutoOptimize Delta vs Current OK');

    console.log('✅ Auto-Optimizer objective search works');

} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
}

console.log('--- Auto-Optimizer Tests Completed ---');
