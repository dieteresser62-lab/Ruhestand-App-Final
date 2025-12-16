
import { EngineAPI } from '../engine/index.mjs';

console.log('--- Core Engine Tests ---');

// Mock Data
const input = {
    depotwertAlt: 100000,
    depotwertNeu: 0,
    goldWert: 0,
    tagesgeld: 10000,
    geldmarktEtf: 0,
    inflation: 2.0,
    renteMonatlich: 0,
    floorBedarf: 2000 * 12,
    flexBedarf: 500 * 12,
    startAlter: 65,
    goldAktiv: false,
    risikoprofil: 'sicherheits-dynamisch',
    goldFloorProzent: 0,
    runwayTargetMonths: 36,
    runwayMinMonths: 24,
    renteAktiv: false,
    renteMonatlich: 0,
    marketCapeRatio: 20
};

const market = {
    regime: 'SIDEWAYS',
    capeRatio: 20,
    inflation: 2.0
};

// Test 1: simulateSingleYear basic structure
try {
    const result = EngineAPI.simulateSingleYear(input, null);

    assert(result !== null, 'Should return a result object');
    assert(result.ui !== undefined, 'Should have UI result');
    assert(result.newState !== undefined, 'Should have newState');
    assert(result.newState.lastMarketSKey !== undefined, 'Market regime should be defined');
    console.log(`   Detailed Regime detected: ${result.newState.lastMarketSKey}`);

    console.log('✅ optimizeSpending structure valid');
} catch (e) {
    console.error('Test 1 Failed', e);
    throw e;
}

// Test 2: Spending Logic (Floor vs Liquid)
// Floor is 24k, Liquid is 10k. Runway < 1 year. 
// Should trigger alarm/cuts if logic is strict, but EngineAPI defaults are usually robust.
try {
    const tightInput = { ...input, tagesgeld: 5000 };
    const result = EngineAPI.simulateSingleYear(tightInput, null);
    const spending = result.ui.spending;

    // Engine usually calculates Runway based on Portfolio + Liquid
    // 100k + 5k = 105k. 24k Floor. Runway ~4 years. 
    // This should NOT cut floor, but might cut Flex.

    assert(spending.monatlicheEntnahme > 0, 'Should allow withdrawal');
    // assert(spending.kuerzungProzent <= 0 || spending.kuerzungQuelle === 'flex', 'Should not panic cut floor immediately');

    console.log('✅ Spending logic basic check passed');
} catch (e) {
    console.error('Test 2 Failed', e);
    throw e;
}

console.log('--- Core Engine Tests Completed ---');
