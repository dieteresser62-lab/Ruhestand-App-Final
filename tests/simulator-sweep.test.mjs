"use strict";

/**
 * Tests für simulator-sweep.js und sweep-runner.js
 * - Range-Parsing
 * - Kartesisches Produkt
 * - Whitelist/Blocklist-Enforcement
 * - P2-Invarianten-Prüfung
 * - Sweep-Chunk-Ausführung
 */

import { EngineAPI } from '../engine/index.mjs';
import { prepareHistoricalDataOnce } from '../app/simulator/simulator-engine-helpers.js';
import {
    ESTIMATED_HISTORY_CUTOFF_YEAR,
    annualData
} from '../app/simulator/simulator-data.js';
import {
    cartesianProductLimited,
    makeRunSeed,
    parseRangeInput,
    quantile
} from '../app/simulator/simulator-utils.js';
import {
    deepClone,
    SWEEP_ALLOWED_KEYS,
    SWEEP_BLOCK_PATTERNS,
    isBlockedKey,
    extractP2Invariants,
    areP2InvariantsEqual,
    normalizeWidowOptions
} from '../app/simulator/simulator-sweep-utils.js';
import {
    SWEEP_RESULT_PROVENANCE_VERSION,
    SWEEP_SAMPLING_FINGERPRINT_VERSION,
    SWEEP_HOUSEHOLD_RISK_DIAGNOSTICS_VERSION,
    buildSweepInputs,
    runSweepChunk
} from '../app/simulator/sweep-runner.js';
import {
    SWEEP_REQUEST_VERSION,
    SWEEP_SAMPLING_METHOD_RESOLUTION,
    normalizeSweepRequestV1
} from '../app/simulator/monte-carlo-parameters.js';
import {
    MONTE_CARLO_HOUSEHOLD_LIFE_CONTRACT_VERSION,
    runMonteCarloChunk
} from '../app/simulator/monte-carlo-runner.js';
import { resolveDynamicFlexRunnerHorizon } from '../app/simulator/dynamic-flex-runner-horizon.js';
import {
    applyTailRiskOverlay,
    createTailRiskSchedule,
    summarizeTailRiskEvents
} from '../app/simulator/tail-risk-overlay.js';

if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.EngineAPI = EngineAPI;

console.log('--- Simulator Sweep Tests ---');

function buildSamplingTestInputs(overrides = {}) {
    return {
        startAlter: 30,
        geschlecht: 'm',
        startVermoegen: 500000,
        depotwertAlt: 450000,
        einstandAlt: 350000,
        tagesgeld: 50000,
        geldmarktEtf: 0,
        zielLiquiditaet: 30000,
        startFloorBedarf: 24000,
        startFlexBedarf: 12000,
        flexBudgetAnnual: 0,
        flexBudgetRecharge: 0,
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
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 20,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        capeRatio: 20,
        marketCapeRatio: 20,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0,
        tailRiskEnabled: false,
        ...overrides
    };
}

const samplingTestCombination = Object.freeze({
    runwayMin: 24,
    runwayTarget: 36,
    targetEq: 60,
    rebalBand: 5,
    maxSkimPct: 10,
    maxBearRefillPct: 5,
    goldTargetPct: 0
});

function buildSweepRequest(method, overrides = {}, useCapeSampling = false) {
    return normalizeSweepRequestV1({
        schemaVersion: SWEEP_REQUEST_VERSION,
        monteCarloParameters: {
            anzahl: 1,
            maxDauer: 4,
            blockSize: 3,
            seed: 60616,
            methode: method,
            rngMode: 'per-run-seed',
            startYearMode: 'UNIFORM',
            startYearFilter: 1970,
            startYearHalfLife: 20,
            excludeEstimatedHistory: false,
            ...overrides
        },
        useCapeSampling
    }, {
        inputs: buildSamplingTestInputs(),
        historicalRecordCount: annualData.length
    });
}

// Test 1: parseRangeInput - Einzelwert
console.log('Test 1: parseRangeInput - Einzelwert');
{
    const result = parseRangeInput('24');
    assertEqual(result.length, 1, 'Einzelwert sollte 1 Element haben');
    assertEqual(result[0], 24, 'Einzelwert sollte 24 sein');
    console.log('✓ parseRangeInput Einzelwert OK');
}

// Test 2: parseRangeInput - Kommaliste
console.log('Test 2: parseRangeInput - Kommaliste');
{
    const result = parseRangeInput('50, 60, 70');
    assertEqual(result.length, 3, 'Kommaliste sollte 3 Elemente haben');
    assertEqual(result[0], 50, 'Erstes Element sollte 50 sein');
    assertEqual(result[1], 60, 'Zweites Element sollte 60 sein');
    assertEqual(result[2], 70, 'Drittes Element sollte 70 sein');
    console.log('✓ parseRangeInput Kommaliste OK');
}

// Test 3: parseRangeInput - Range-Format
console.log('Test 3: parseRangeInput - Range-Format');
{
    const result = parseRangeInput('18:6:36');
    assertEqual(result.length, 4, 'Range 18:6:36 sollte 4 Elemente haben');
    assertEqual(result[0], 18, 'Erstes Element sollte 18 sein');
    assertEqual(result[1], 24, 'Zweites Element sollte 24 sein');
    assertEqual(result[2], 30, 'Drittes Element sollte 30 sein');
    assertEqual(result[3], 36, 'Viertes Element sollte 36 sein');
    console.log('✓ parseRangeInput Range-Format OK');
}

// Test 4: parseRangeInput - Dezimalwerte
console.log('Test 4: parseRangeInput - Dezimalwerte');
{
    const result = parseRangeInput('0.5:0.5:2.0');
    assertEqual(result.length, 4, 'Range 0.5:0.5:2.0 sollte 4 Elemente haben');
    assertClose(result[0], 0.5, 1e-9, 'Erstes Element sollte 0.5 sein');
    assertClose(result[1], 1.0, 1e-9, 'Zweites Element sollte 1.0 sein');
    assertClose(result[2], 1.5, 1e-9, 'Drittes Element sollte 1.5 sein');
    assertClose(result[3], 2.0, 1e-9, 'Viertes Element sollte 2.0 sein');
    console.log('✓ parseRangeInput Dezimalwerte OK');
}

// Test 5: parseRangeInput - Leere Eingabe
console.log('Test 5: parseRangeInput - Leere Eingabe');
{
    assertEqual(parseRangeInput('').length, 0, 'Leerer String sollte leeres Array liefern');
    assertEqual(parseRangeInput(null).length, 0, 'null sollte leeres Array liefern');
    assertEqual(parseRangeInput(undefined).length, 0, 'undefined sollte leeres Array liefern');
    assertEqual(parseRangeInput('   ').length, 0, 'Whitespace sollte leeres Array liefern');
    console.log('✓ parseRangeInput Leere Eingabe OK');
}

// Test 6: parseRangeInput - Fehlerhafte Eingabe
console.log('Test 6: parseRangeInput - Fehlerhafte Eingabe');
{
    let errorThrown = false;
    try {
        parseRangeInput('18:6'); // Nur 2 Teile statt 3
    } catch (e) {
        errorThrown = true;
        assert(e.message.includes('Ungültiges Range-Format'), 'Fehler sollte Range-Format erwähnen');
    }
    assert(errorThrown, 'Ungültige Range sollte Fehler werfen');
    console.log('✓ parseRangeInput Fehlerhafte Eingabe OK');
}

// Test 7: parseRangeInput - Negativer Step
console.log('Test 7: parseRangeInput - Negativer Step');
{
    let errorThrown = false;
    try {
        parseRangeInput('36:-6:18');
    } catch (e) {
        errorThrown = true;
        assert(e.message.includes('Step muss > 0'), 'Fehler sollte Step-Validierung erwähnen');
    }
    assert(errorThrown, 'Negativer Step sollte Fehler werfen');
    console.log('✓ parseRangeInput Negativer Step OK');
}

// Test 8: cartesianProductLimited - Basis
console.log('Test 8: cartesianProductLimited - Basis');
{
    const arrays = [[1, 2], [3, 4]];
    const { combos, tooMany, size } = cartesianProductLimited(arrays, 100);

    assertEqual(size, 4, 'Größe sollte 4 sein (2x2)');
    assert(!tooMany, 'tooMany sollte false sein');
    assertEqual(combos.length, 4, 'Sollte 4 Kombinationen haben');
    assert(combos.some(c => c[0] === 1 && c[1] === 3), 'Sollte [1,3] enthalten');
    assert(combos.some(c => c[0] === 2 && c[1] === 4), 'Sollte [2,4] enthalten');
    console.log('✓ cartesianProductLimited Basis OK');
}

// Test 9: cartesianProductLimited - Limit überschritten
console.log('Test 9: cartesianProductLimited - Limit überschritten');
{
    const arrays = [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]];
    const { combos, tooMany, size } = cartesianProductLimited(arrays, 100);

    assertEqual(size, 125, 'Größe sollte 125 sein (5^3)');
    assert(tooMany, 'tooMany sollte true sein');
    assertEqual(combos.length, 0, 'Combos sollte leer sein bei Überschreitung');
    console.log('✓ cartesianProductLimited Limit OK');
}

// Test 10: cartesianProductLimited - Leeres Array
console.log('Test 10: cartesianProductLimited - Leeres Array');
{
    const result1 = cartesianProductLimited([], 100);
    assertEqual(result1.combos.length, 0, 'Leeres Array sollte keine Kombos liefern');

    const result2 = cartesianProductLimited([[1, 2], []], 100);
    assertEqual(result2.combos.length, 0, 'Array mit leerem Sub-Array sollte keine Kombos liefern');
    console.log('✓ cartesianProductLimited Leeres Array OK');
}

// Test 11: isBlockedKey - Partner-Keys
console.log('Test 11: isBlockedKey - Partner-Keys');
{
    assert(isBlockedKey('partner.aktiv'), 'partner.aktiv sollte geblockt sein');
    assert(isBlockedKey('partner.brutto'), 'partner.brutto sollte geblockt sein');
    assert(isBlockedKey('partner'), 'partner sollte geblockt sein');
    assert(!isBlockedKey('targetEq'), 'targetEq sollte nicht geblockt sein');
    console.log('✓ isBlockedKey Partner-Keys OK');
}

// Test 12: isBlockedKey - r2/p2-Keys
console.log('Test 12: isBlockedKey - r2/p2-Keys');
{
    assert(isBlockedKey('r2Monatsrente'), 'r2Monatsrente sollte geblockt sein');
    assert(isBlockedKey('r2StartInJahren'), 'r2StartInJahren sollte geblockt sein');
    assert(isBlockedKey('p2Rente'), 'p2Rente sollte geblockt sein');
    assert(isBlockedKey('p2StartAlter'), 'p2StartAlter sollte geblockt sein');
    assert(!isBlockedKey('rebalBand'), 'rebalBand sollte nicht geblockt sein');
    console.log('✓ isBlockedKey r2/p2-Keys OK');
}

// Test 13: SWEEP_ALLOWED_KEYS - Whitelist-Prüfung
console.log('Test 13: SWEEP_ALLOWED_KEYS - Whitelist');
{
    assert(SWEEP_ALLOWED_KEYS.has('runwayMinMonths'), 'runwayMinMonths sollte erlaubt sein');
    assert(SWEEP_ALLOWED_KEYS.has('runwayTargetMonths'), 'runwayTargetMonths sollte erlaubt sein');
    assert(SWEEP_ALLOWED_KEYS.has('targetEq'), 'targetEq sollte erlaubt sein');
    assert(SWEEP_ALLOWED_KEYS.has('rebalBand'), 'rebalBand sollte erlaubt sein');
    assert(SWEEP_ALLOWED_KEYS.has('maxSkimPctOfEq'), 'maxSkimPctOfEq sollte erlaubt sein');
    assert(SWEEP_ALLOWED_KEYS.has('goldZielProzent'), 'goldZielProzent sollte erlaubt sein');
    assert(SWEEP_ALLOWED_KEYS.has('horizonYears'), 'horizonYears sollte erlaubt sein');
    assert(SWEEP_ALLOWED_KEYS.has('survivalQuantile'), 'survivalQuantile sollte erlaubt sein');
    assert(SWEEP_ALLOWED_KEYS.has('goGoMultiplier'), 'goGoMultiplier sollte erlaubt sein');
    assert(!SWEEP_ALLOWED_KEYS.has('startAlter'), 'startAlter sollte nicht auf Whitelist sein');
    console.log('✓ SWEEP_ALLOWED_KEYS Whitelist OK');
}

// Test 14: extractP2Invariants - Basis
console.log('Test 14: extractP2Invariants - Basis');
{
    const inputs = {
        partner: {
            aktiv: true,
            brutto: 1500,
            startAlter: 63,
            startInJahren: 2,
            steuerquotePct: 20
        },
        rentAdjPct: 1.5
    };

    const invariants = extractP2Invariants(inputs);

    assertEqual(invariants.aktiv, true, 'aktiv sollte true sein');
    assertEqual(invariants.brutto, 1500, 'brutto sollte 1500 sein');
    assertEqual(invariants.startAlter, 63, 'startAlter sollte 63 sein');
    assertEqual(invariants.startInJahren, 2, 'startInJahren sollte 2 sein');
    assertEqual(invariants.steuerquotePct, 20, 'steuerquotePct sollte 20 sein');
    assertEqual(invariants.rentAdjPct, 1.5, 'rentAdjPct sollte 1.5 sein');
    console.log('✓ extractP2Invariants Basis OK');
}

// Test 15: extractP2Invariants - Ohne Partner
console.log('Test 15: extractP2Invariants - Ohne Partner');
{
    const inputs = { partner: null };
    const invariants = extractP2Invariants(inputs);

    assertEqual(invariants.aktiv, false, 'aktiv sollte false sein ohne Partner');
    assertEqual(invariants.brutto, 0, 'brutto sollte 0 sein ohne Partner');
    console.log('✓ extractP2Invariants Ohne Partner OK');
}

// Test 16: areP2InvariantsEqual - Gleiche Werte
console.log('Test 16: areP2InvariantsEqual - Gleiche Werte');
{
    const inv1 = { aktiv: true, brutto: 1500, startAlter: 63, startInJahren: 2, steuerquotePct: 20, rentAdjPct: 1.5 };
    const inv2 = { aktiv: true, brutto: 1500, startAlter: 63, startInJahren: 2, steuerquotePct: 20, rentAdjPct: 1.5 };

    assert(areP2InvariantsEqual(inv1, inv2), 'Gleiche Invarianten sollten equal sein');
    console.log('✓ areP2InvariantsEqual Gleiche Werte OK');
}

// Test 17: areP2InvariantsEqual - Unterschiedliche Werte
console.log('Test 17: areP2InvariantsEqual - Unterschiedliche Werte');
{
    const inv1 = { aktiv: true, brutto: 1500, startAlter: 63, startInJahren: 2, steuerquotePct: 20, rentAdjPct: 1.5 };
    const inv2 = { aktiv: true, brutto: 2000, startAlter: 63, startInJahren: 2, steuerquotePct: 20, rentAdjPct: 1.5 };

    assert(!areP2InvariantsEqual(inv1, inv2), 'Unterschiedliche Invarianten sollten nicht equal sein');
    console.log('✓ areP2InvariantsEqual Unterschiedliche Werte OK');
}

// Test 18: deepClone - Tiefe Kopie
console.log('Test 18: deepClone - Tiefe Kopie');
{
    const original = {
        a: 1,
        b: { c: 2, d: [3, 4, 5] },
        e: 'test'
    };

    const clone = deepClone(original);

    // Ändere Original
    original.a = 100;
    original.b.c = 200;
    original.b.d.push(6);

    // Clone sollte unverändert sein
    assertEqual(clone.a, 1, 'Clone.a sollte unverändert sein');
    assertEqual(clone.b.c, 2, 'Clone.b.c sollte unverändert sein');
    assertEqual(clone.b.d.length, 3, 'Clone.b.d sollte 3 Elemente haben');
    console.log('✓ deepClone Tiefe Kopie OK');
}

// Test 19: normalizeWidowOptions - Defaults
console.log('Test 19: normalizeWidowOptions - Defaults');
{
    const result = normalizeWidowOptions(null);

    assertEqual(result.mode, 'stop', 'Default mode sollte stop sein');
    assertEqual(result.percent, 0, 'Default percent sollte 0 sein');
    assertEqual(result.marriageOffsetYears, 0, 'Default marriageOffsetYears sollte 0 sein');
    assertEqual(result.minMarriageYears, 0, 'Default minMarriageYears sollte 0 sein');
    console.log('✓ normalizeWidowOptions Defaults OK');
}

// Test 20: normalizeWidowOptions - Werte-Normalisierung
console.log('Test 20: normalizeWidowOptions - Werte-Normalisierung');
{
    const result = normalizeWidowOptions({
        mode: 'percent',
        percent: 0.6,
        marriageOffsetYears: 5,
        minMarriageYears: 10
    });

    assertEqual(result.mode, 'percent', 'Mode sollte percent sein');
    assertClose(result.percent, 0.6, 1e-9, 'Percent sollte 0.6 sein');
    assertEqual(result.marriageOffsetYears, 5, 'marriageOffsetYears sollte 5 sein');
    assertEqual(result.minMarriageYears, 10, 'minMarriageYears sollte 10 sein');
    console.log('✓ normalizeWidowOptions Werte-Normalisierung OK');
}

// Test 21: buildSweepInputs - Parameter-Überschreibung
console.log('Test 21: buildSweepInputs - Parameter-Überschreibung');
{
    const baseInputs = {
        startAlter: 65,
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        targetEq: 60,
        rebalBand: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        goldAktiv: false,
        goldZielProzent: 0,
        dynamicFlex: true,
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: true,
        goGoMultiplier: 1.1
    };

    const params = {
        runwayMin: 18,
        runwayTarget: 30,
        targetEq: 70,
        rebalBand: 6,
        maxSkimPct: 12,
        maxBearRefillPct: 8,
        goldTargetPct: 5,
        horizonYears: 35,
        survivalQuantile: 0.9,
        goGoMultiplier: 1.2
    };

    // buildSweepInputs maps sweep params onto engine inputs.
    const result = buildSweepInputs(baseInputs, params);

    assertEqual(result.runwayMinMonths, 18, 'runwayMinMonths sollte überschrieben sein');
    assertEqual(result.runwayTargetMonths, 30, 'runwayTargetMonths sollte überschrieben sein');
    assertEqual(result.targetEq, 70, 'targetEq sollte überschrieben sein');
    assertEqual(result.rebalBand, 6, 'rebalBand sollte überschrieben sein');
    assertEqual(result.maxSkimPctOfEq, 12, 'maxSkimPctOfEq sollte überschrieben sein');
    assertEqual(result.maxBearRefillPctOfEq, 8, 'maxBearRefillPctOfEq sollte überschrieben sein');
    assertEqual(result.goldZielProzent, 5, 'goldZielProzent sollte überschrieben sein');
    assert(result.goldAktiv === true, 'goldAktiv sollte true sein bei goldTargetPct > 0');
    assertEqual(result.horizonYears, 35, 'horizonYears sollte überschrieben sein');
    assertClose(result.survivalQuantile, 0.9, 1e-9, 'survivalQuantile sollte überschrieben sein');
    assertClose(result.goGoMultiplier, 1.2, 1e-9, 'goGoMultiplier sollte überschrieben sein');

    // Nicht überschriebene Werte bleiben
    assertEqual(result.startAlter, 65, 'startAlter sollte unverändert sein');
    console.log('✓ buildSweepInputs Parameter-Überschreibung OK');
}

// Test 22: runSweepChunk - Basis-Ausführung
console.log('Test 22: runSweepChunk - Basis-Ausführung');
{
    prepareHistoricalDataOnce();

    const baseInputs = {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 500000,
        depotwertAlt: 200000,
        einstandAlt: 150000,
        zielLiquiditaet: 30000,
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
        marketCapeRatio: 0,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0
    };

    const paramCombinations = [
        { runwayMin: 18, runwayTarget: 30, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0 },
        { runwayMin: 24, runwayTarget: 36, targetEq: 70, rebalBand: 6, maxSkimPct: 12, maxBearRefillPct: 6, goldTargetPct: 0 }
    ];

    const sweepConfig = {
        anzahlRuns: 10,
        maxDauer: 15,
        blockSize: 5,
        baseSeed: 42,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    // Run two param combos in a single chunk and validate the output shape.
    const { results, p2VarianceCount } = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 0, count: 2 },
        sweepConfig
    });

    assertEqual(results.length, 2, 'Sollte 2 Ergebnisse haben');
    assertEqual(results[0].comboIdx, 0, 'Erstes Ergebnis sollte comboIdx 0 haben');
    assertEqual(results[1].comboIdx, 1, 'Zweites Ergebnis sollte comboIdx 1 haben');

    // Prüfe Metriken-Struktur
    assert(typeof results[0].metrics.successProbFloor === 'number', 'successProbFloor sollte Zahl sein');
    assert(typeof results[0].metrics.medianEndWealth === 'number', 'medianEndWealth sollte Zahl sein');
    assert(typeof results[0].metrics.p10EndWealth === 'number', 'p10EndWealth sollte Zahl sein');
    assert(typeof results[0].metrics.worst5Drawdown === 'number', 'worst5Drawdown sollte Zahl sein');

    assertEqual(p2VarianceCount, 0, 'p2VarianceCount sollte 0 sein ohne Partner-Änderungen');
    console.log('✓ runSweepChunk Basis-Ausführung OK');
}

// Test 23: runSweepChunk - Determinismus
console.log('Test 23: runSweepChunk - Determinismus');
{
    // Same inputs + seed must be stable across runs.
    const baseInputs = {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 500000,
        depotwertAlt: 200000,
        einstandAlt: 150000,
        zielLiquiditaet: 30000,
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
        marketCapeRatio: 0,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0
    };

    const paramCombinations = [
        { runwayMin: 24, runwayTarget: 36, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0 }
    ];

    const sweepConfig = {
        anzahlRuns: 20,
        maxDauer: 20,
        blockSize: 5,
        baseSeed: 12345,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const run1 = runSweepChunk({ baseInputs, paramCombinations, comboRange: { start: 0, count: 1 }, sweepConfig });
    const run2 = runSweepChunk({ baseInputs, paramCombinations, comboRange: { start: 0, count: 1 }, sweepConfig });

    assertClose(run1.results[0].metrics.successProbFloor, run2.results[0].metrics.successProbFloor, 1e-9, 'successProbFloor sollte deterministisch sein');
    assertClose(run1.results[0].metrics.medianEndWealth, run2.results[0].metrics.medianEndWealth, 1e-6, 'medianEndWealth sollte deterministisch sein');
    console.log('✓ runSweepChunk Determinismus OK');
}

// Test 24: runSweepChunk - Invalid Dynamic-Flex Kombination
console.log('Test 24: runSweepChunk - Invalid Dynamic-Flex Kombination');
{
    const baseInputs = {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 500000,
        depotwertAlt: 200000,
        einstandAlt: 150000,
        zielLiquiditaet: 30000,
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
        dynamicFlex: false,
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        marketCapeRatio: 0,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0
    };

    const paramCombinations = [
        { runwayMin: 18, runwayTarget: 24, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, survivalQuantile: 0.9 }
    ];

    const sweepConfig = {
        anzahlRuns: 10,
        maxDauer: 10,
        blockSize: 5,
        baseSeed: 42,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const { results } = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 0, count: 1 },
        sweepConfig
    });

    assert(results[0].metrics.invalidCombination === true, 'Kombination sollte als invalid markiert sein');
    assert(String(results[0].metrics.invalidReason || '').includes('Dynamic Flex'), 'Invalid-Reason sollte Dynamic Flex enthalten');
    console.log('✓ runSweepChunk Invalid Dynamic-Flex Kombination OK');
}

// Test 25: runSweepChunk - Invalid Quantile-Bereich
console.log('Test 25: runSweepChunk - Invalid Quantile-Bereich');
{
    const baseInputs = {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 500000,
        depotwertAlt: 200000,
        einstandAlt: 150000,
        zielLiquiditaet: 30000,
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
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        marketCapeRatio: 0,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0
    };

    const paramCombinations = [
        { runwayMin: 18, runwayTarget: 24, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, survivalQuantile: 0.2 }
    ];

    const sweepConfig = {
        anzahlRuns: 10,
        maxDauer: 10,
        blockSize: 5,
        baseSeed: 42,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const { results } = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 0, count: 1 },
        sweepConfig
    });

    assert(results[0].metrics.invalidCombination === true, 'Out-of-range Quantile sollte invalid sein');
    assert(String(results[0].metrics.invalidReason || '').includes('survivalQuantile'), 'Reason sollte survivalQuantile enthalten');
    console.log('✓ runSweepChunk Invalid Quantile-Bereich OK');
}

// Test 26: runSweepChunk - Invalid Go-Go Multiplikator wenn Go-Go inaktiv
console.log('Test 26: runSweepChunk - Invalid Go-Go Multiplikator wenn Go-Go inaktiv');
{
    const baseInputs = {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 500000,
        depotwertAlt: 200000,
        einstandAlt: 150000,
        zielLiquiditaet: 30000,
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
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        marketCapeRatio: 0,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0
    };

    const paramCombinations = [
        { runwayMin: 18, runwayTarget: 24, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, goGoMultiplier: 1.2 }
    ];

    const sweepConfig = {
        anzahlRuns: 10,
        maxDauer: 10,
        blockSize: 5,
        baseSeed: 42,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const { results } = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 0, count: 1 },
        sweepConfig
    });

    assert(results[0].metrics.invalidCombination === true, 'Go-Go Multiplikator ohne Go-Go sollte invalid sein');
    assert(String(results[0].metrics.invalidReason || '').includes('Go-Go'), 'Reason sollte Go-Go enthalten');
    console.log('✓ runSweepChunk Invalid Go-Go Multiplikator wenn Go-Go inaktiv OK');
}

// Test 27: runSweepChunk - Gueltige Dynamic-Flex Grenzwerte
console.log('Test 27: runSweepChunk - Gueltige Dynamic-Flex Grenzwerte');
{
    prepareHistoricalDataOnce();

    const baseInputs = {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 500000,
        depotwertAlt: 200000,
        einstandAlt: 150000,
        zielLiquiditaet: 30000,
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
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: true,
        goGoMultiplier: 1.0,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        marketCapeRatio: 0,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0
    };

    const paramCombinations = [
        { runwayMin: 18, runwayTarget: 24, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, horizonYears: 60, survivalQuantile: 0.99, goGoMultiplier: 1.5 }
    ];

    const sweepConfig = {
        anzahlRuns: 10,
        maxDauer: 10,
        blockSize: 5,
        baseSeed: 42,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const { results } = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 0, count: 1 },
        sweepConfig
    });

    assert(results[0].metrics.invalidCombination !== true, 'Grenzwerte sollten gueltig sein');
    assert(typeof results[0].metrics.successProbFloor === 'number', 'Metriken sollten berechnet werden');
    console.log('✓ runSweepChunk Gueltige Dynamic-Flex Grenzwerte OK');
}

// Test 28: runSweepChunk - Mindest-Flex wird in Sweep-Laeufen akzeptiert
console.log('Test 28: runSweepChunk - Mindest-Flex wird in Sweep-Laeufen akzeptiert');
{
    prepareHistoricalDataOnce();

    const baseInputs = {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 500000,
        depotwertAlt: 480000,
        einstandAlt: 400000,
        tagesgeld: 20000,
        geldmarktEtf: 0,
        zielLiquiditaet: 20000,
        startFloorBedarf: 24000,
        startFlexBedarf: 12000,
        minimumFlexAnnual: 9000,
        flexBudgetAnnual: 0,
        flexBudgetRecharge: 0,
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
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 10,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        marketCapeRatio: 35,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0
    };

    const paramCombinations = [
        { runwayMin: 18, runwayTarget: 24, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0 }
    ];

    const sweepConfig = {
        anzahlRuns: 4,
        maxDauer: 6,
        blockSize: 1,
        baseSeed: 2005,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const { results } = runSweepChunk({
        baseInputs,
        paramCombinations,
        comboRange: { start: 0, count: 1 },
        sweepConfig
    });

    assert(results[0].metrics.invalidCombination !== true, 'Mindest-Flex-Sweep sollte gueltig bleiben');
    assert(typeof results[0].metrics.successProbFloor === 'number', 'Mindest-Flex-Sweep sollte Metriken berechnen');
    assert(Number.isFinite(results[0].metrics.meanEndWealth), 'Mindest-Flex-Sweep sollte end wealth aggregieren');
    console.log('✓ runSweepChunk Mindest-Flex akzeptiert OK');
}

// Test 29: O-11 - expliziter Stationary-/Markov-Dispatch mit Indexfingerprint
console.log('Test 29: O-11 - expliziter Stationary-/Markov-Dispatch mit Indexfingerprint');
{
    prepareHistoricalDataOnce();
    const lastHistoricalIndex = annualData.length - 1;
    const lastHistoricalYear = annualData[lastHistoricalIndex].jahr;
    const baseInputs = buildSamplingTestInputs();
    const requestOverrides = {
        maxDauer: 4,
        blockSize: 2,
        startYearMode: 'FILTER',
        startYearFilter: lastHistoricalYear
    };
    const stationary = runSweepChunk({
        baseInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: buildSweepRequest('stationary', requestOverrides)
    }).results[0];
    const markov = runSweepChunk({
        baseInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: buildSweepRequest('regime_markov', {
            ...requestOverrides,
            startYearFilter: 2000
        })
    }).results[0];

    const stationaryFingerprint = stationary.provenance.samplingFingerprint;
    const markovFingerprint = markov.provenance.samplingFingerprint;
    assertEqual(stationary.provenance.schemaVersion, SWEEP_RESULT_PROVENANCE_VERSION, 'Sweep result provenance is versioned');
    assertEqual(stationaryFingerprint.schemaVersion, SWEEP_SAMPLING_FINGERPRINT_VERSION, 'Sweep sampling fingerprint is versioned');
    assertEqual(stationaryFingerprint.tracedRuns[0].historicalYearIndices.length, 4, 'stationary reference path contains the complete four-year index sequence');
    assertEqual(markovFingerprint.tracedRuns[0].historicalYearIndices.length, 4, 'Markov reference path contains the complete four-year index sequence');
    assert(
        stationaryFingerprint.tracedRuns[0].historicalYearIndices.every(index => index === lastHistoricalIndex),
        'stationary exact reference path remains anchored to the only eligible historical index'
    );
    assert(
        markovFingerprint.tracedRuns[0].historicalYearIndices
            .every(index => Number(annualData[index]?.jahr) >= 2000),
        'regime Markov exact reference path remains inside its prevalidated filtered universe'
    );
    assert(
        markovFingerprint.hash !== stationaryFingerprint.hash,
        'stationary and regime Markov produce distinct sampling fingerprints'
    );
    assertEqual(stationary.provenance.appliedSamplingMethod, 'stationary', 'stationary provenance names the applied sampler');
    assertEqual(markov.provenance.appliedSamplingMethod, 'regime_markov', 'Markov provenance names the applied sampler');
    assert(
        stationary.provenance.samplingDiagnostics.stationaryRestartCounts.initial > 0,
        'stationary dispatch records its initial stationary block'
    );
    assertEqual(
        markov.provenance.samplingDiagnostics.stationaryRestartCounts.initial,
        0,
        'Markov dispatch does not pass through the stationary sampler'
    );
    assert(
        (markov.provenance.samplingDiagnostics.sourceCounts.regime_markov || 0) > 0,
        'Markov dispatch records draws from the Markov sampler'
    );
    console.log('✓ O-11 expliziter Stationary-/Markov-Dispatch OK');
}

// Test 30: Seed 0 bleibt reproduzierbar und unterscheidet sich von 12345
console.log('Test 30: Sweep Seed 0 Reproduzierbarkeit');
{
    const baseInputs = buildSamplingTestInputs();
    const run = seed => runSweepChunk({
        baseInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: buildSweepRequest('stationary', {
            anzahl: 3,
            maxDauer: 8,
            seed
        })
    });
    const zeroA = run(0);
    const zeroB = run(0);
    const other = run(12345);
    const zeroFingerprint = zeroA.results[0].provenance.samplingFingerprint.hash;
    assertEqual(zeroA.sweepRequest.monteCarloParameters.seed, 0, 'runner preserves seed zero in the normalized request');
    assertEqual(
        zeroFingerprint,
        zeroB.results[0].provenance.samplingFingerprint.hash,
        'seed zero produces a stable sampling fingerprint'
    );
    assert(
        zeroFingerprint !== other.results[0].provenance.samplingFingerprint.hash,
        'seed zero produces a different sampling fingerprint than seed 12345'
    );
    console.log('✓ Sweep Seed 0 Reproduzierbarkeit OK');
}

// Test 31: Filter und Estimated-History-Ausschluss gelten fuer jeden Zug
console.log('Test 31: Sweep Startjahrfilter und Estimated-History-Ausschluss');
{
    const filterYear = Math.max(1970, ESTIMATED_HISTORY_CUTOFF_YEAR);
    const result = runSweepChunk({
        baseInputs: buildSamplingTestInputs(),
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: buildSweepRequest('regime_markov', {
            anzahl: 3,
            maxDauer: 8,
            startYearMode: 'FILTER',
            startYearFilter: filterYear,
            excludeEstimatedHistory: true
        })
    }).results[0];
    const tracedIndices = result.provenance.samplingFingerprint.tracedRuns
        .flatMap(run => run.historicalYearIndices);
    const countedYears = Object.keys(
        result.provenance.samplingDiagnostics.historicalYearCounts
    ).map(Number);
    assert(tracedIndices.length > 0, 'filtered Sweep exposes inspected historical indices');
    assert(
        tracedIndices.every(index => Number(annualData[index]?.jahr) >= filterYear),
        'every inspected Sweep draw satisfies the configured start-year filter'
    );
    assert(
        countedYears.length > 0 && countedYears.every(year => year >= filterYear),
        'the complete historical-year counter satisfies filter and estimated-history exclusion'
    );
    assertEqual(
        result.provenance.samplingDiagnostics.contract.excludeEstimatedHistory,
        true,
        'sampling diagnostics retain estimated-history exclusion'
    );
    assertEqual(
        result.provenance.householdRiskDiagnostics.schemaVersion,
        SWEEP_HOUSEHOLD_RISK_DIAGNOSTICS_VERSION,
        'Sweep household and risk diagnostics are versioned'
    );
    assertEqual(
        result.provenance.samplingDiagnostics.tailRisk.appliedYears,
        0,
        'disabled tail risk remains a supported, evaluated overlay with zero applied years'
    );
    assertEqual(
        result.provenance.unsupportedOverlays.length,
        0,
        'Sweep no longer marks tail risk as unsupported'
    );
    console.log('✓ Sweep Startjahrfilter und Estimated-History-Ausschluss OK');
}

// Test 32: Single-Combination-Sweep nutzt den kanonischen MC-Samplingstart
console.log('Test 32: Single-Combination-Sweep/MC Samplingparitaet');
{
    const baseInputs = buildSamplingTestInputs();
    const request = buildSweepRequest('stationary', {
        anzahl: 1,
        maxDauer: 1,
        seed: 4242,
        startYearMode: 'RECENCY'
    }, true);
    const sweep = runSweepChunk({
        baseInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: request
    });
    const mcInputs = buildSweepInputs(baseInputs, samplingTestCombination);
    const monteCarlo = await runMonteCarloChunk({
        inputs: mcInputs,
        monteCarloParams: request.monteCarloParameters,
        widowOptions: {
            mode: 'stop',
            percent: 0,
            marriageOffsetYears: 0,
            minMarriageYears: 0
        },
        useCapeSampling: request.useCapeSampling,
        runRange: { start: 0, count: 1 },
        logIndices: [0],
        engine: EngineAPI
    });
    const sweepIndex = sweep.results[0].provenance
        .samplingFingerprint.tracedRuns[0].historicalYearIndices[0];
    const monteCarloYear = monteCarlo.runMeta[0].logDataRows[0].histJahr;
    const monteCarloIndex = annualData.findIndex(
        entry => Number(entry.jahr) === Number(monteCarloYear)
    );
    assertEqual(sweepIndex, monteCarloIndex, 'single-combination Sweep and MC select the same canonical initial record');
    assertEqual(
        sweep.results[0].provenance.samplingDiagnostics.contract.startSource,
        monteCarlo.samplingDiagnostics.contract.startSource,
        'single-combination Sweep and MC expose the same applied start-source policy'
    );
    assertEqual(
        sweep.results[0].provenance.requestedSamplingMethod,
        sweep.results[0].provenance.appliedSamplingMethod,
        'strict method validation preserves requested/applied equality'
    );
    assertEqual(
        sweep.results[0].provenance.samplingMethodResolution,
        SWEEP_SAMPLING_METHOD_RESOLUTION,
        'result provenance explains requested/applied equality as strict no-fallback validation'
    );
    console.log('✓ Single-Combination-Sweep/MC Samplingparitaet OK');
}

// Test 33: Unbekannte Sweep-Methode wird fail-closed abgewiesen
console.log('Test 33: Unbekannte Sweep-Methode');
{
    let thrown = null;
    try {
        runSweepChunk({
            baseInputs: buildSamplingTestInputs(),
            paramCombinations: [samplingTestCombination],
            comboRange: { start: 0, count: 1 },
            sweepRequest: {
                schemaVersion: SWEEP_REQUEST_VERSION,
                monteCarloParameters: {
                    ...buildSweepRequest('block').monteCarloParameters,
                    methode: 'unknown_sampler'
                }
            }
        });
    } catch (error) {
        thrown = error;
    }
    assertEqual(thrown?.code, 'MC_PARAMETER_ENUM_INVALID', 'unknown Sweep method is rejected by the canonical parameter contract');
    console.log('✓ Unbekannte Sweep-Methode OK');
}

// Test 34: Fehlender Sweep-Request wird fail-closed abgewiesen
console.log('Test 34: Fehlender Sweep-Request');
{
    let thrown = null;
    try {
        runSweepChunk({
            baseInputs: buildSamplingTestInputs(),
            paramCombinations: [samplingTestCombination],
            comboRange: { start: 0, count: 1 }
        });
    } catch (error) {
        thrown = error;
    }
    assertEqual(
        thrown?.code,
        'SWEEP_REQUEST_OBJECT_REQUIRED',
        'missing Sweep request fails closed before any default run count can be scheduled'
    );
    console.log('✓ Fehlender Sweep-Request OK');
}

// Test 35: Provenienz bindet den Seedraum an den globalen Kombinationsindex
console.log('Test 35: Sweep Kombinationsindex-Provenienz');
{
    const result = runSweepChunk({
        baseInputs: buildSamplingTestInputs(),
        paramCombinations: [samplingTestCombination, samplingTestCombination],
        comboRange: { start: 1, count: 1 },
        sweepRequest: buildSweepRequest('stationary', {
            anzahl: 1,
            maxDauer: 1,
            seed: 4242
        })
    }).results[0];
    assertEqual(result.comboIdx, 1, 'chunk result retains the global combination index');
    assertEqual(
        result.provenance.combinationIndex,
        1,
        'result provenance identifies the combination coordinate used by makeRunSeed'
    );
    assertEqual(
        result.provenance.samplingFingerprint.combinationIndex,
        1,
        'sampling fingerprint identifies the same combination coordinate'
    );
    console.log('✓ Sweep Kombinationsindex-Provenienz OK');
}

// Test 36: Leerer Pool eines ziehbaren Regimes blockiert vor dem Sweep
console.log('Test 36: Sweep Regime-Pool Fail-Closed');
{
    const lastHistoricalYear = annualData.at(-1).jahr;
    for (const method of ['regime_markov', 'regime_iid']) {
        let thrown = null;
        try {
            runSweepChunk({
                baseInputs: buildSamplingTestInputs(),
                paramCombinations: [samplingTestCombination],
                comboRange: { start: 0, count: 1 },
                sweepRequest: buildSweepRequest(method, {
                    anzahl: 1,
                    maxDauer: 1,
                    startYearMode: 'FILTER',
                    startYearFilter: lastHistoricalYear
                })
            });
        } catch (error) {
            thrown = error;
        }
        assertEqual(
            thrown?.code,
            'MC_SAMPLING_REGIME_POOL_EMPTY',
            `${method} rejects an empty drawable regime pool before scheduling runs`
        );
    }
    console.log('✓ Sweep Regime-Pool Fail-Closed OK');
}

// Test 37: O-12 - Partner, deterministischer P2-Tod und Witwenleistung
console.log('Test 37: O-12 Sweep Partner-/Witwenpfad');
{
    const widowOptions = {
        mode: 'percent',
        percent: 0.5,
        marriageOffsetYears: 0,
        minMarriageYears: 0
    };
    const partnerInputs = buildSamplingTestInputs({
        startAlter: 50,
        startVermoegen: 1000000,
        depotwertAlt: 900000,
        einstandAlt: 700000,
        tagesgeld: 100000,
        partner: {
            aktiv: true,
            geschlecht: 'w',
            startAlter: 80,
            startInJahren: 0,
            monatsrente: 5000,
            brutto: 60000,
            steuerquotePct: 0
        },
        widowOptions
    });
    const request = buildSweepRequest('block', {
        anzahl: 1,
        maxDauer: 8,
        blockSize: 3,
        seed: 4
    });
    const activeSweep = runSweepChunk({
        baseInputs: partnerInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: request,
        engine: EngineAPI
    }).results[0];
    const inactiveSweep = runSweepChunk({
        baseInputs: {
            ...partnerInputs,
            partner: { ...partnerInputs.partner, aktiv: false }
        },
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: request,
        engine: EngineAPI
    }).results[0];
    const activeYears = activeSweep.provenance.householdRiskDiagnostics
        .tracedRuns[0].events
        .filter(event => event.simulationYearIndex <= 3);
    const inactiveYear0 = inactiveSweep.provenance.householdRiskDiagnostics
        .tracedRuns[0].events
        .find(event => event.simulationYearIndex === 0);
    const byYear = new Map(activeYears.map(event => [event.simulationYearIndex, event]));

    assertEqual(byYear.get(0)?.pensionP2Eur, 60000, 'active partner contributes exactly 60,000 EUR in year 1');
    assertEqual(byYear.get(1)?.pensionP2Eur, 60000, 'active partner contributes exactly 60,000 EUR before death in year 2');
    assertEqual(inactiveYear0?.pensionP2Eur, 0, 'inactive partner contributes no P2 pension');
    assertEqual(
        byYear.get(0)?.pensionAnnualEur - inactiveYear0?.pensionAnnualEur,
        60000,
        'partner activation changes annual household pension by exactly 60,000 EUR'
    );
    assertEqual(byYear.get(2)?.p2Alive, false, 'seed 4 fixes P2 death in simulation year 3');
    assertEqual(byYear.get(2)?.pensionP2Eur, 0, 'P2 pension stops in the deterministic death year');
    assertEqual(
        byYear.get(2)?.temporaryFlexFactor,
        0.75,
        'Sweep keeps the canonical couple flex factor when P1 survives P2 without care metadata'
    );
    assertEqual(byYear.get(3)?.widowP1Active, true, 'widow path activates in the year after P2 death');
    assertEqual(byYear.get(3)?.widowPensionP1Eur, 30000, 'widow-specific diagnostic reports the configured 50 percent share');
    assertEqual(byYear.get(3)?.pensionP1Eur, 30000, 'P1 receives exactly 30,000 EUR widow pension');
    assertEqual(
        activeSweep.provenance.householdRiskDiagnostics.household.p2DeathEvents,
        1,
        'household diagnostics count the P2 death exactly once'
    );

    const mc = await runMonteCarloChunk({
        inputs: buildSweepInputs(partnerInputs, samplingTestCombination),
        monteCarloParams: request.monteCarloParameters,
        widowOptions,
        useCapeSampling: request.useCapeSampling,
        runRange: { start: 0, count: 1 },
        logIndices: [0],
        engine: EngineAPI
    });
    const mcRows = mc.runMeta[0].logDataRows.slice(0, 4);
    for (let yearIndex = 0; yearIndex <= 3; yearIndex++) {
        assertEqual(
            byYear.get(yearIndex)?.p2Alive ? 1 : 0,
            mcRows[yearIndex]?.Person2Alive,
            `Sweep and MC expose the same P2 life state in year ${yearIndex + 1}`
        );
        assertEqual(
            byYear.get(yearIndex)?.pensionP2Eur,
            mcRows[yearIndex]?.rente2,
            `Sweep and MC expose the same P2 pension in year ${yearIndex + 1}`
        );
    }
    assertClose(
        mcRows[2]?.flex_brutto,
        partnerInputs.startFlexBedarf * mcRows[2]?.inflation_factor_cum * 0.75,
        1e-8,
        'MC applies the canonical couple flex factor when P1 survives P2 without care metadata'
    );
    assertEqual(mcRows[3]?.WidowBenefitP1, 30000, 'MC log reports the same non-zero widow benefit');
    assertEqual(
        mc.samplingDiagnostics.modelContracts?.householdLife?.schemaVersion,
        MONTE_CARLO_HOUSEHOLD_LIFE_CONTRACT_VERSION,
        'MC diagnostics version the corrected household life contract'
    );
    assertEqual(
        mc.samplingDiagnostics.modelContracts?.householdLife?.partnerMortalityPolicy,
        'withdrawal-phase-independent-of-care-metadata',
        'MC diagnostics name partner mortality as independent from disabled care metadata'
    );
    assertEqual(
        mc.samplingDiagnostics.modelContracts?.householdLife?.householdFlexProfilePolicy,
        'partner-activation-independent-of-care-metadata',
        'MC diagnostics name household flex membership as independent from disabled care metadata'
    );
    assert(
        mc.samplingDiagnostics.modelContracts?.householdLife?.deltaLedgerIds?.includes('A08-8'),
        'MC diagnostics link the household-flex correction to A08-8'
    );
    console.log('✓ O-12 Sweep Partner-/Witwenpfad OK');
}

// Test 38: Pflegefloor und temporaerer Flexfaktor bleiben zum MC-Pfad paritaetisch
console.log('Test 38: Sweep Pflege-Flex-/Floor-Paritaet');
{
    const gradeConfigs = Object.fromEntries(
        [1, 2, 3, 4, 5].map(grade => [
            grade,
            { zusatz: grade * 1000, flexCut: 0.5, mortalityFactor: 1 }
        ])
    );
    const careInputs = buildSamplingTestInputs({
        startAlter: 80,
        startVermoegen: 1000000,
        depotwertAlt: 900000,
        einstandAlt: 700000,
        tagesgeld: 100000,
        pflegefallLogikAktivieren: true,
        pflegeModellTyp: 'chronisch',
        pflegeRampUp: 1,
        pflegeKostenDrift: 0,
        pflegeRegionalZuschlag: 0,
        pflegeMaxFloor: 60000,
        pflegeGradeConfigs: gradeConfigs
    });
    const request = buildSweepRequest('block', {
        anzahl: 1,
        maxDauer: 3,
        blockSize: 3,
        seed: 3
    });
    const sweep = runSweepChunk({
        baseInputs: careInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: request,
        engine: EngineAPI
    }).results[0];
    const sweepCareYear = sweep.provenance.householdRiskDiagnostics
        .tracedRuns[0].events
        .find(event => event.p1CareActive);
    assertEqual(sweepCareYear?.temporaryFlexFactor, 0.5, 'single-person care applies the configured temporary flex factor 0.5');
    assert(
        sweepCareYear?.totalCareFloorNominalEur > 0,
        'active care passes a positive additional floor to the annual step'
    );
    assertEqual(
        sweep.provenance.householdRiskDiagnostics.household.minimumTemporaryFlexFactor,
        0.5,
        'household diagnostics retain the minimum applied flex factor'
    );

    const mc = await runMonteCarloChunk({
        inputs: buildSweepInputs(careInputs, samplingTestCombination),
        monteCarloParams: request.monteCarloParameters,
        widowOptions: normalizeWidowOptions(careInputs.widowOptions),
        useCapeSampling: request.useCapeSampling,
        runRange: { start: 0, count: 1 },
        logIndices: [0],
        engine: EngineAPI
    });
    const mcCareYear = mc.runMeta[0].logDataRows[sweepCareYear.simulationYearIndex];
    assertEqual(mcCareYear?.pflege_flex_faktor, 0.5, 'MC reference applies the same care flex factor');
    assertClose(
        sweepCareYear.totalCareFloorNominalEur,
        mcCareYear?.pflege_zusatz_floor,
        1e-9,
        'Sweep and MC pass the same care floor'
    );
    console.log('✓ Sweep Pflege-Flex-/Floor-Paritaet OK');
}

// Test 39: O-20 - Survival-Quantil bestimmt Sweep-Horizon und VPW wie im MC
console.log('Test 39: O-20 Sweep Survival-Horizon-/VPW-Paritaet');
{
    const baseInputs = buildSamplingTestInputs({
        startAlter: 50,
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        longevityMode: 'none'
    });
    const request = buildSweepRequest('block', {
        anzahl: 1,
        maxDauer: 4,
        blockSize: 3,
        seed: 4242
    });
    const observed = [];
    for (const survivalQuantile of [0.5, 0.99]) {
        const combination = {
            ...samplingTestCombination,
            survivalQuantile
        };
        const effectiveInputs = buildSweepInputs(baseInputs, combination);
        const expected = resolveDynamicFlexRunnerHorizon(effectiveInputs, {
            yearIndex: 0,
            ageP1: effectiveInputs.startAlter,
            ageP2: effectiveInputs.startAlter,
            p1Alive: true,
            p2Alive: false
        });
        const sweep = runSweepChunk({
            baseInputs,
            paramCombinations: [combination],
            comboRange: { start: 0, count: 1 },
            sweepRequest: request,
            engine: EngineAPI
        }).results[0];
        const sweepYear0 = sweep.provenance.householdRiskDiagnostics
            .tracedRuns[0].events
            .find(event => event.simulationYearIndex === 0);
        assertEqual(
            sweepYear0?.horizonYears,
            expected.horizonYears,
            `Sweep resolves the canonical year-1 horizon for quantile ${survivalQuantile}`
        );
        assertEqual(
            sweepYear0?.vpwHorizonYears,
            expected.horizonYears,
            `engine VPW receives the canonical horizon for quantile ${survivalQuantile}`
        );
        assert(
            Number.isFinite(sweepYear0?.vpwRate),
            `Sweep exposes a finite VPW rate for quantile ${survivalQuantile}`
        );

        const mc = await runMonteCarloChunk({
            inputs: effectiveInputs,
            monteCarloParams: request.monteCarloParameters,
            widowOptions: normalizeWidowOptions(effectiveInputs.widowOptions),
            useCapeSampling: request.useCapeSampling,
            runRange: { start: 0, count: 1 },
            logIndices: [0],
            engine: EngineAPI
        });
        const mcVpw = mc.runMeta[0].logDataRows[0]?.vpw;
        assertEqual(mcVpw?.horizonYears, sweepYear0?.vpwHorizonYears, 'Sweep and MC use the same VPW horizon');
        assertClose(mcVpw?.vpwRate, sweepYear0?.vpwRate, 1e-12, 'Sweep and MC use the same VPW rate');
        observed.push(sweepYear0);
    }
    assert(
        observed[1].horizonYears > observed[0].horizonYears,
        'quantile 0.99 produces a longer effective horizon than quantile 0.50'
    );
    assert(
        observed[1].vpwRate < observed[0].vpwRate,
        'the longer 0.99 horizon produces the lower VPW withdrawal rate'
    );
    console.log('✓ O-20 Sweep Survival-Horizon-/VPW-Paritaet OK');
}

// Test 40: O-13 - deterministischer Tail-Schedule, Overlay und Diagnose
console.log('Test 40: O-13 Sweep Tail-Risk-Overlay');
{
    const tailInputs = buildSamplingTestInputs({
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 5,
        tailRiskReturnShockPct: -35,
        tailRiskInflationShockPct: 6,
        tailRiskDurationYears: 2,
        tailRiskCooldownYears: 1
    });
    const request = buildSweepRequest('block', {
        anzahl: 1,
        maxDauer: 8,
        blockSize: 3,
        seed: 2
    });
    const sweep = runSweepChunk({
        baseInputs: tailInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: request,
        engine: EngineAPI
    }).results[0];
    const runSeed = makeRunSeed(2, 0, 0);
    const expectedPlan = createTailRiskSchedule(runSeed, tailInputs, 8);
    assertEqual(expectedPlan.events.length, 1, 'reference schedule injects exactly one event');
    assertEqual(expectedPlan.events[0].startYearIndex, 2, 'reference event starts in simulation year index 2');
    assertEqual(expectedPlan.events[0].durationYears, 2, 'reference event spans exactly two years');
    assertEqual(
        JSON.stringify(sweep.provenance.householdRiskDiagnostics.tracedRuns[0].tailRiskSchedule.scheduledEvents),
        JSON.stringify(expectedPlan.events),
        'Sweep provenance exposes the exact canonical tail schedule'
    );

    const sampledIndices = sweep.provenance.samplingFingerprint
        .tracedRuns[0].historicalYearIndices;
    const referenceEntries = sampledIndices.map((historicalIndex, simulationsJahr) =>
        applyTailRiskOverlay(
            annualData[historicalIndex],
            expectedPlan.schedule[simulationsJahr] ?? null,
            {
                runIdx: 0,
                combinationIndex: 0,
                simulationsJahr,
                methode: 'block',
                stressPreset: tailInputs.stressPreset
            }
        )
    );
    const referenceSummary = summarizeTailRiskEvents(referenceEntries);
    const tailDiagnostics = sweep.provenance.householdRiskDiagnostics.tailRisk;
    assertEqual(tailDiagnostics.activeYears, referenceSummary.tailRiskActiveYears, 'active tail years match the canonical overlay');
    assertEqual(tailDiagnostics.appliedYears, referenceSummary.tailRiskAppliedYears, 'applied tail years match the canonical overlay');
    assertEqual(
        tailDiagnostics.skippedHistoricalCrisisYears,
        referenceSummary.tailRiskSkippedHistoricalCrisisYears,
        'historical-crisis skips match the canonical overlay'
    );
    const tracedTailYears = sweep.provenance.householdRiskDiagnostics
        .tracedRuns[0].events
        .filter(event => event.tailRisk);
    for (const traced of tracedTailYears) {
        const expected = referenceEntries[traced.simulationYearIndex];
        assertEqual(traced.tailRisk.applied, expected.tailRiskApplied, 'traced tail application flag matches reference');
        assertEqual(traced.tailRisk.skippedReason, expected.tailRiskSkippedReason, 'traced tail skip reason matches reference');
        assertClose(traced.tailRisk.effectiveReturnPct, expected.effectiveReturnPct, 1e-12, 'traced effective return matches reference');
        assertClose(traced.tailRisk.effectiveInflationPct, expected.effectiveInflationPct, 1e-12, 'traced effective inflation matches reference');
    }

    const mc = await runMonteCarloChunk({
        inputs: buildSweepInputs(tailInputs, samplingTestCombination),
        monteCarloParams: request.monteCarloParameters,
        widowOptions: normalizeWidowOptions(tailInputs.widowOptions),
        useCapeSampling: request.useCapeSampling,
        runRange: { start: 0, count: 1 },
        logIndices: [0],
        engine: EngineAPI
    });
    assertEqual(tailDiagnostics.activeYears, mc.totals.tailRiskActiveYears, 'Sweep and MC count the same active tail years');
    assertEqual(tailDiagnostics.appliedYears, mc.totals.tailRiskAppliedYears, 'Sweep and MC count the same applied tail years');
    assertEqual(
        tailDiagnostics.skippedHistoricalCrisisYears,
        mc.totals.tailRiskSkippedHistoricalCrisisYears,
        'Sweep and MC count the same historical-crisis skips'
    );
    console.log('✓ O-13 Sweep Tail-Risk-Overlay OK');
}

// Test 41: Single-Profile ohne Pflege/Tail bleibt vollstaendig zum MC-Pfad paritaetisch
console.log('Test 41: Single-Profile Sweep/MC Ergebnisparitaet');
{
    const baseInputs = buildSamplingTestInputs({
        startAlter: 30,
        dynamicFlex: false,
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        tailRiskEnabled: false
    });
    const request = buildSweepRequest('block', {
        anzahl: 3,
        maxDauer: 6,
        blockSize: 3,
        seed: 9090
    });
    const sweep = runSweepChunk({
        baseInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: request,
        engine: EngineAPI
    }).results[0];
    const effectiveInputs = buildSweepInputs(baseInputs, samplingTestCombination);
    const mc = await runMonteCarloChunk({
        inputs: effectiveInputs,
        monteCarloParams: request.monteCarloParameters,
        widowOptions: normalizeWidowOptions(effectiveInputs.widowOptions),
        useCapeSampling: request.useCapeSampling,
        runRange: { start: 0, count: 3 },
        logIndices: [],
        engine: EngineAPI
    });
    const finalOutcomes = Array.from(mc.buffers.finalOutcomes);
    const sortedOutcomes = [...finalOutcomes].sort((a, b) => a - b);
    const expectedMean = finalOutcomes.reduce((sum, value) => sum + value, 0) / finalOutcomes.length;
    assertClose(
        sweep.metrics.p10EndWealth,
        sortedOutcomes[Math.floor(sortedOutcomes.length * 0.1)],
        1e-8,
        'Sweep P10 matches its documented order-statistic aggregation over MC raw paths'
    );
    assertClose(sweep.metrics.medianEndWealth, quantile(finalOutcomes, 0.5), 1e-8, 'Sweep median matches MC raw paths');
    assertClose(sweep.metrics.meanEndWealth, expectedMean, 1e-8, 'Sweep mean matches MC raw paths');
    assertClose(
        sweep.metrics.successProbFloor,
        ((3 - mc.totals.failCount) / 3) * 100,
        1e-12,
        'Sweep success rate matches MC raw paths'
    );
    assertEqual(
        sweep.provenance.householdRiskDiagnostics.tailRisk.appliedYears,
        0,
        'no-tail single profile applies no tail overlay'
    );
    console.log('✓ Single-Profile Sweep/MC Ergebnisparitaet OK');
}

// Test 42: A08-1 - survivor pension starts no earlier than the deceased pension offset
console.log('Test 42: A08-1 Sweep Witwenrenten-Offset');
{
    const widowOptions = {
        mode: 'percent',
        percent: 0.5,
        marriageOffsetYears: 0,
        minMarriageYears: 0
    };
    const runOffsetCase = partnerStartOffsetYears => {
        const baseInputs = buildSamplingTestInputs({
            startAlter: 50,
            startVermoegen: 1000000,
            depotwertAlt: 900000,
            einstandAlt: 700000,
            tagesgeld: 100000,
            partner: {
                aktiv: true,
                geschlecht: 'w',
                startAlter: 80,
                startInJahren: partnerStartOffsetYears,
                monatsrente: 5000,
                brutto: 60000,
                steuerquotePct: 0
            },
            widowOptions
        });
        const request = buildSweepRequest('block', {
            anzahl: 1,
            maxDauer: 8,
            blockSize: 3,
            seed: 4
        });
        return runSweepChunk({
            baseInputs,
            paramCombinations: [samplingTestCombination],
            comboRange: { start: 0, count: 1 },
            sweepRequest: request,
            engine: EngineAPI
        }).results[0].provenance.householdRiskDiagnostics.tracedRuns[0].events;
    };

    const eligibleAtWidowStart = new Map(runOffsetCase(3).map(event => [event.simulationYearIndex, event]));
    const notYetEligible = new Map(runOffsetCase(4).map(event => [event.simulationYearIndex, event]));
    assertEqual(eligibleAtWidowStart.get(2)?.p2Alive, false, 'reference P2 dies before receiving an own pension');
    assertEqual(eligibleAtWidowStart.get(3)?.widowP1Active, true, 'widow state activates in the year after P2 death');
    assertEqual(
        eligibleAtWidowStart.get(3)?.widowPensionP1Eur,
        30000,
        'widow pension starts exactly when the deceased P2 pension offset is reached'
    );
    assertEqual(notYetEligible.get(3)?.widowP1Active, true, 'widow state remains active before the pension offset');
    assertEqual(
        notYetEligible.get(3)?.widowPensionP1Eur,
        0,
        'active widow state pays zero before the deceased P2 pension offset'
    );
    console.log('✓ A08-1 Sweep Witwenrenten-Offset OK');
}

// Test 43: A08-5 - an all-dead abort without an engine step is not a care/flex year
console.log('Test 43: A08-5 Sweep Todesjahr-Diagnostik');
{
    const baseInputs = buildSamplingTestInputs({
        startAlter: 110,
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false }
    });
    const request = buildSweepRequest('block', {
        anzahl: 1,
        maxDauer: 1,
        blockSize: 1,
        seed: 123
    });
    const diagnostics = runSweepChunk({
        baseInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: request,
        engine: EngineAPI
    }).results[0].provenance.householdRiskDiagnostics;
    assertEqual(diagnostics.runsEvaluated, 1, 'all-dead run remains counted as an evaluated run');
    assertEqual(diagnostics.household.allDeadRuns, 1, 'all-dead run is diagnosed exactly once');
    assertEqual(diagnostics.yearsEvaluated, 0, 'death before the annual engine step adds no evaluated year');
    assertEqual(
        diagnostics.household.minimumTemporaryFlexFactor,
        null,
        'death without care or engine step does not report a zero care-flex minimum'
    );
    assertEqual(
        diagnostics.household.totalCareFloorNominalEur,
        0,
        'death without an engine step adds no care floor'
    );
    assertEqual(diagnostics.household.p1CareActiveYears, 0, 'aborted death year adds no P1 care year');
    assertEqual(diagnostics.household.p2CareActiveYears, 0, 'aborted death year adds no P2 care year');
    assertEqual(diagnostics.household.bothCareActiveYears, 0, 'aborted death year adds no dual-care year');
    assertEqual(diagnostics.household.widowP1ActiveYears, 0, 'aborted death year adds no P1 widow year');
    assertEqual(diagnostics.household.widowP2ActiveYears, 0, 'aborted death year adds no P2 widow year');

    const widowInputs = buildSamplingTestInputs({
        startAlter: 90,
        pflegefallLogikAktivieren: false,
        partner: {
            aktiv: true,
            geschlecht: 'w',
            startAlter: 90,
            startInJahren: 0,
            monatsrente: 0,
            brutto: 0,
            steuerquotePct: 0
        },
        widowOptions: {
            mode: 'percent',
            percent: 0.5,
            marriageOffsetYears: 0,
            minMarriageYears: 0
        }
    });
    const widowDiagnostics = runSweepChunk({
        baseInputs: widowInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: buildSweepRequest('block', {
            anzahl: 1,
            maxDauer: 12,
            blockSize: 3,
            seed: 1
        }),
        engine: EngineAPI
    }).results[0].provenance.householdRiskDiagnostics;
    const allDeadWidowEvent = widowDiagnostics.tracedRuns[0].events.find(
        event => event.runEndedBecauseAllDied && event.widowP1Active
    );
    assert(allDeadWidowEvent, 'discriminating A08-5 fixture ends while P1 widow state is active');
    assertEqual(
        widowDiagnostics.household.widowP1ActiveYears,
        2,
        'P1 widow counter excludes the final all-dead year without an engine step'
    );
    assertEqual(widowDiagnostics.household.p1DeathEvents, 1, 'final P1 death event remains diagnosed');
    assertEqual(widowDiagnostics.household.p2DeathEvents, 1, 'earlier P2 death event remains diagnosed');
    console.log('✓ A08-5 Sweep Todesjahr-Diagnostik OK');
}

// Test 44: A08-8 - active partner membership is independent from disabled care metadata
console.log('Test 44: A08-8 Sweep Paar-Flex ohne Pflegelogik');
{
    const baseInputs = buildSamplingTestInputs({
        startAlter: 92,
        pflegefallLogikAktivieren: false,
        partner: {
            aktiv: true,
            geschlecht: 'w',
            startAlter: 66,
            startInJahren: 0,
            monatsrente: 0,
            brutto: 0,
            steuerquotePct: 0
        }
    });
    const request = buildSweepRequest('block', {
        anzahl: 1,
        maxDauer: 4,
        blockSize: 3,
        seed: 4242
    });
    const events = runSweepChunk({
        baseInputs,
        paramCombinations: [samplingTestCombination],
        comboRange: { start: 0, count: 1 },
        sweepRequest: request,
        engine: EngineAPI
    }).results[0].provenance.householdRiskDiagnostics.tracedRuns[0].events;
    const survivorYear = events.find(event => event.p1Alive === false && event.p2Alive === true);
    assert(survivorYear, 'deterministic A08-8 fixture reaches P1-dead/P2-alive state');
    assertEqual(
        survivorYear.temporaryFlexFactor,
        0.75,
        'surviving P2 keeps the canonical couple flex factor without care metadata'
    );
    console.log('✓ A08-8 Sweep Paar-Flex ohne Pflegelogik OK');
}

console.log('--- Simulator Sweep Tests Abgeschlossen ---');
