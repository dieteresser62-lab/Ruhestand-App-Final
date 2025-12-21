
import { TransactionEngine } from '../engine/transactions/TransactionEngine.mjs';
import { CONFIG } from '../engine/config.mjs';

console.log('--- Transaction Quantization Tests ---');

// MOCK CONSTANTS
const MOCK_PROFIL = { minRunwayMonths: 24, isDynamic: true };
const MOCK_INPUT = {
    targetEq: 60, rebalancingBand: 35, maxSkimPctOfEq: 5,
    floorBedarf: 30000, renteAktiv: false, flexBedarf: 12000,
    depotwertAlt: 500000, depotwertNeu: 0,
    renteMonatlich: 0
};

// --- TEST 1: Core Quantization Logic ---
{
    // Setup Config
    CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED = true;

    // Tier 1: Limit 10,000, Step 1,000
    assertEqual(TransactionEngine._quantizeAmount(1850, 'ceil'), 2000, 'Rounds 1850 -> 2000 (Ceil)');
    assertEqual(TransactionEngine._quantizeAmount(1850, 'floor'), 1000, 'Rounds 1850 -> 1000 (Floor)');

    // Tier 2: Limit 50,000, Step 5,000
    assertEqual(TransactionEngine._quantizeAmount(12300, 'ceil'), 15000, 'Rounds 12300 -> 15000 (Ceil)');
    assertEqual(TransactionEngine._quantizeAmount(12300, 'floor'), 10000, 'Rounds 12300 -> 10000 (Floor)');

    // Tier 3: Limit 200,000, Step 10,000
    assertEqual(TransactionEngine._quantizeAmount(86000, 'ceil'), 90000, 'Rounds 86000 -> 90000 (Ceil)');

    // Tier 4: Limit Infinity, Step 25,000
    assertEqual(TransactionEngine._quantizeAmount(238234, 'ceil'), 250000, 'Rounds 238234 -> 250000 (Ceil)');
    assertEqual(TransactionEngine._quantizeAmount(238234, 'floor'), 225000, 'Rounds 238234 -> 225000 (Floor)');

    console.log('✅ Core Logic Passed');
}

// --- TEST 2: Hysteresis ---
{
    const smallGapParams = {
        ...MOCK_INPUT,
        aktuelleLiquiditaet: 99800, // Ziel 100k -> 200 difference
        zielLiquiditaet: 100000,
        depotwertGesamt: 500000,
        market: { sKey: 'peak_stable', seiATH: 1.0, abstandVomAthProzent: 0, szenarioText: 'Test' },
        profil: MOCK_PROFIL,
        spending: {}, minGold: 0, input: MOCK_INPUT
    };

    const result = TransactionEngine.determineAction(smallGapParams);
    assertEqual(result.type, 'NONE', 'Small gap (200) below hysteresis (2000) should trigger NO action');

    console.log('✅ Hysteresis Logic Passed');
}

// --- TEST 3: Quantized Refill ---
{
    // We must ensure minRefillAmount doesn't block this small trade
    CONFIG.THRESHOLDS.STRATEGY.minRefillAmount = 1000;
    CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic = 1000;

    const gap = 3500; // Above 2000 Hysteresis. Should round to 4000 (Tier 1 is 1k step).
    const params = {
        ...MOCK_INPUT,
        aktuelleLiquiditaet: 100000 - gap,
        zielLiquiditaet: 100000,
        depotwertGesamt: 500000,
        market: { sKey: 'hot_neutral', seiATH: 1.0, abstandVomAthProzent: 0, szenarioText: 'Test' }, // Uses Opportunistic Rebalancing
        profil: MOCK_PROFIL,
        spending: {}, minGold: 0,
        input: { ...MOCK_INPUT, runwayMinMonths: 24 } // Ensure Guardrail doesn't trigger
    };

    const result = TransactionEngine.determineAction(params);

    assertEqual(result.type, 'TRANSACTION', 'Should trigger transaction');
    // Expected: ceil(3500 / 1000) * 1000 = 4000
    assertEqual(result.nettoErlös, 4000, 'Refill should be quantized to 4000');

    console.log('✅ Refill Logic Passed');
}

// --- TEST 4: Quantized Surplus ---
{
    // Surplus > 2000 triggers invest. 
    // We have 104,000 Liq, Ziel 100,000 -> Surplus 4,000.
    // Step for <10k is 1k. Floor(4000) = 4000.

    // Let's try 4,800 Surplus. Should floor to 4,000.
    const params = {
        ...MOCK_INPUT,
        aktuelleLiquiditaet: 104800,
        zielLiquiditaet: 100000,
        depotwertGesamt: 500000,
        market: { sKey: 'peak_hot', seiATH: 1.0, abstandVomAthProzent: 0, szenarioText: 'Test' }, // Good market for investing
        profil: MOCK_PROFIL,
        spending: {}, minGold: 0,
        input: MOCK_INPUT
    };

    const result = TransactionEngine.determineAction(params);

    assertEqual(result.type, 'TRANSACTION', 'Should trigger surplus transaction');
    assertEqual(result.details.verkaufLiquiditaet, 4000, 'Surplus invest should be floored to 4000');

    console.log('✅ Surplus Logic Passed');
}

console.log('--- Transaction Quantization Tests Completed ---');
