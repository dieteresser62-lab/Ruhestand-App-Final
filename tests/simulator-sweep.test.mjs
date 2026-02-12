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
import { parseRangeInput, cartesianProductLimited } from '../app/simulator/simulator-utils.js';
import {
    deepClone,
    SWEEP_ALLOWED_KEYS,
    SWEEP_BLOCK_PATTERNS,
    isBlockedKey,
    extractP2Invariants,
    areP2InvariantsEqual,
    normalizeWidowOptions
} from '../app/simulator/simulator-sweep-utils.js';
import { buildSweepInputs, runSweepChunk } from '../app/simulator/sweep-runner.js';

if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.EngineAPI = EngineAPI;

console.log('--- Simulator Sweep Tests ---');

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
        { runwayMin: 18, runwayTarget: 24, targetEq: 60, rebalBand: 5, maxSkimPct: 10, maxBearRefillPct: 5, goldTargetPct: 0, horizonYears: 60, survivalQuantile: 0.99, goGoMultiplier: 2.0 }
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

console.log('--- Simulator Sweep Tests Abgeschlossen ---');
