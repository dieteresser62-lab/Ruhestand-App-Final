
import { SpendingPlanner } from '../engine/planners/SpendingPlanner.mjs';
import { CONFIG } from '../engine/config.mjs';

console.log('--- Spending Quantization Tests ---');

// MOCK CONSTANTS
const PROFILE = { minRunwayMonths: 24, isDynamic: true };
const MARKET = { sKey: 'hot_neutral', abstandVomAthProzent: 0, szenarioText: 'Test' };
const LAST_STATE = { flexRate: 100, initialized: true, keyParams: { peakRealVermoegen: 500000, currentRealVermoegen: 500000, entnahmequoteDepot: 0.03 } };
const INPUT = { inflation: 2 };

// --- TEST 1: Helper Logic ---
{
    CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED = true;

    // Tier 1 (< 2000): Step 50
    assertEqual(SpendingPlanner._quantizeMonthly(1832, 'floor'), 1800, '1832 -> 1800');
    assertEqual(SpendingPlanner._quantizeMonthly(1849, 'floor'), 1800, '1849 -> 1800');
    assertEqual(SpendingPlanner._quantizeMonthly(1851, 'floor'), 1850, '1851 -> 1850');

    // Tier 2 (< 5000): Step 100
    assertEqual(SpendingPlanner._quantizeMonthly(3420, 'floor'), 3400, '3420 -> 3400');
    assertEqual(SpendingPlanner._quantizeMonthly(3490, 'floor'), 3400, '3490 -> 3400');

    // Tier 3 (> 5000): Step 250
    assertEqual(SpendingPlanner._quantizeMonthly(6100, 'floor'), 6000, '6100 -> 6000');
    assertEqual(SpendingPlanner._quantizeMonthly(6240, 'floor'), 6000, '6240 -> 6000');
    assertEqual(SpendingPlanner._quantizeMonthly(6260, 'floor'), 6250, '6260 -> 6250');

    console.log('✅ Helper Logic Passed');
}

// --- TEST 2: Integration Logic ---
{
    CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED = true;

    const oddBedarf = {
        floor: 30000,
        flex: 12043 // Total 42043 => /12 = 3503.58
    };

    const params = {
        lastState: LAST_STATE,
        market: MARKET,
        inflatedBedarf: oddBedarf,
        runwayMonate: 40,
        profil: PROFILE,
        depotwertGesamt: 600000,
        gesamtwert: 600000,
        renteJahr: 0,
        input: INPUT
    };

    const result = SpendingPlanner.determineSpending(params);

    // Expected: 3503.58 -> Round down to next 100 (Tier 2, <5000).
    // 3500.
    // Annual result: 3500 * 12 = 42000.

    const monatlich = result.spendingResult.monatlicheEntnahme;
    assertEqual(monatlich, 3500, 'Should round 3503.58 down to 3500');

    const total = result.spendingResult.details.endgueltigeEntnahme;
    assertEqual(total, 42000, 'Annual should be 12 * 3500 = 42000');

    console.log('✅ Integration Logic Passed');
}

console.log('--- Spending Quantization Tests Completed ---');
