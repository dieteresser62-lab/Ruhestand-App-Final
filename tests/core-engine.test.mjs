
import { EngineAPI } from '../engine/index.mjs';

console.log('--- Core Engine Tests ---');

// Mock Data: minimal vollständiger Input für Engine (Balance-ähnlich).
const baseInput = {
    depotwertAlt: 100000,
    depotwertNeu: 0,
    goldWert: 0,
    tagesgeld: 10000,
    geldmarktEtf: 0,
    inflation: 2.0,
    renteMonatlich: 0,
    floorBedarf: 2000 * 12, // 24k
    flexBedarf: 500 * 12, // 6k
    startAlter: 65,
    goldAktiv: false,
    risikoprofil: 'sicherheits-dynamisch', // Default has minRunwayMonths: 18
    goldFloorProzent: 0,
    runwayTargetMonths: 36,
    runwayMinMonths: 24,
    renteAktiv: false,
    renteMonatlich: 0,
    marketCapeRatio: 20
};

const marketBase = {
    regime: 'SIDEWAYS',
    capeRatio: 20,
    inflation: 2.0
};

// --- Test 1: Basic Structure ---
try {
    const result = EngineAPI.simulateSingleYear(baseInput, null);

    // Struktur-Check: Engine muss UI + neuen State liefern.
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

// --- Test 2: Spending Logic (Floor vs Liquid) ---
try {
    // Tight liquidity: 5k liquid + 100k depot. Floor 24k.
    const tightInput = { ...baseInput, tagesgeld: 5000 };
    const result = EngineAPI.simulateSingleYear(tightInput, null);
    const spending = result.ui.spending;

    // Auch bei knapper Liquidität darf die Entnahme > 0 bleiben (Verkäufe möglich).
    assert(spending.monatlicheEntnahme > 0, 'Should allow withdrawal');
    console.log('✅ Spending logic basic check passed');
} catch (e) {
    console.error('Test 2 Failed', e);
    throw e;
}

// --- Test 3: Regime Detection (Unit Test via Inputs) ---
try {
    // Force BEAR_DEEP: Current price (endeVJ) << Previous prices
    const bearInput = {
        ...baseInput,
        endeVJ: 70,    // -30% drop
        endeVJ_1: 100,
        endeVJ_2: 95,
        ath: 105,
        jahreSeitAth: 1
    };

    // EngineAPI bestimmt Regime intern aus den Preis-Inputs.
    const result = EngineAPI.simulateSingleYear(bearInput, null);

    // Check internal regime (kann leicht variieren: bear_deep vs crash).
    // Note: Engine result structure has diagnose -> diagnosis
    const diagnosis = result.diagnosis || result.logData?.diagnosis;
    const regime = result.newState.lastMarketSKey || (diagnosis?.general?.marketSKey);
    console.log(`   Forced Regime: ${regime}`);

    // Depending on logic, this might be 'bear_deep' or 'crash'
    assert(regime && (regime.includes('bear') || regime.includes('crash')), 'Should detect Bear market conditions');

    console.log('✅ Regime Detection (Bear) passed');
} catch (e) {
    console.error('Test 3 (Regime) Failed', e);
    throw e;
}

// --- Test 4: Guardrail - Budget Floor Protection ---
try {
    // Scenario: Market Crash, but we must protect the Floor.
    // Floor is set to 30,000 via Input.
    const floorProtectedInput = {
        ...baseInput,
        floorBedarf: 30000,
        flexBedarf: 10000,
        // Force crash so flex gets cut
        endeVJ: 70, endeVJ_1: 100, endeVJ_2: 95, ath: 105, jahreSeitAth: 1,
        marketData: { regime: 'bear_deep', inflation: 2.0, rendite: -20, zinssatz: 0, gold_eur_perf: 0 }
    };

    // Ensure sufficient liquid/assets to actually pay the floor
    const richState = {
        baseFloor: 30000,
        baseFlex: 10000,
        cumulativeInflationFactor: 1.0,
        lastTotalBudget: 40000,
        keyParams: { peakRealVermoegen: 500000, currentRealVermoegen: 350000 }
    };

    const result = EngineAPI.simulateSingleYear(floorProtectedInput, richState);

    const spendingMonthly = result.ui.spending.monatlicheEntnahme;
    const spendingYearly = spendingMonthly * 12;

    const regime = result.newState.lastMarketSKey;

    console.log(`   Detailed Regime: ${regime}`);
    console.log(`   Spending Yearly: ${spendingYearly} (Floor Goal: 30000)`);
    console.log(`   Cut Source: ${result.ui.spending.kuerzungQuelle}`);

    // Expectation: Flex should be cut because of Bear Market
    assert(result.ui.spending.kuerzungProzent > 0 || regime.includes('bear'), 'Should detect stress');

    // Expectation: Spending must AT LEAST cover the floor (30k), assuming assets suffice.
    // Allow small epsilon.
    assert(spendingYearly >= 29999, 'Spending must respect the Floor (30k)');

    console.log('✅ Guardrail / Budget Floor passed');
} catch (e) {
    console.error('Test 4 (Guardrail) Failed', e);
    throw e;
}

// --- Test 5: T01 Contract (CAPE alias + stable ui.vpw schema) ---
try {
    const contractInput = {
        ...baseInput,
        capeRatio: undefined,
        marketCapeRatio: 31.5,
        dynamicFlex: false
    };
    const result = EngineAPI.simulateSingleYear(contractInput, null);

    assert(result?.ui?.vpw !== undefined, 'ui.vpw must always be present');
    assert(result.ui.vpw.enabled === false, 'ui.vpw.enabled should reflect dynamicFlex=false');
    assert(Number.isFinite(result.ui.vpw.gesamtwert), 'ui.vpw.gesamtwert should always be present');
    assert(result.ui.vpw.horizonMethod === 'survival_quantile', 'default horizonMethod should be survival_quantile');
    assert(result.ui.vpw.goGoMultiplier === 1.0, 'default goGoMultiplier should be 1.0');
    assert(result.ui.market?.capeRatio === 31.5, 'market.capeRatio should accept marketCapeRatio alias');
    assert(result.ui.vpw.capeRatioUsed === 31.5, 'ui.vpw.capeRatioUsed should expose resolved CAPE');

    console.log('✅ T01 contract (CAPE alias + ui.vpw schema) passed');
} catch (e) {
    console.error('Test 5 (T01 contract) Failed', e);
    throw e;
}

console.log('--- Core Engine Tests Completed ---');
