
import { MarketAnalyzer } from '../engine/analyzers/MarketAnalyzer.mjs';
import { getStartYearCandidates } from '../cape-utils.js';
import { HISTORICAL_DATA, annualData } from '../simulator-data.js';

console.log('--- Market Analyzer Tests ---');

// --- Helper: Basic Input Data ---
function getBaseMarketInput() {
    return {
        endeVJ: 100,
        endeVJ_1: 90,
        endeVJ_2: 85,
        endeVJ_3: 80,
        ath: 100,
        jahreSeitAth: 0,
        inflation: 2.0,
        capeRatio: 20
    };
}

// --- TEST 1: ATH & Scenario Detection ---
{
    // Case 1: New ATH (Stable)
    const inputPeak = getBaseMarketInput();
    inputPeak.endeVJ = 100;
    inputPeak.ath = 100;
    inputPeak.endeVJ_1 = 95; // Perf 5%

    const resPeak = MarketAnalyzer.analyzeMarket(inputPeak);
    assert(resPeak.sKey === 'peak_stable', `Expect peak_stable, got ${resPeak.sKey}`);
    assertClose(resPeak.abstandVomAthProzent, 0, 0.1, 'ATH distance 0%');

    // Case 2: Deep Bear (30% Drawdown)
    const inputBear = getBaseMarketInput();
    inputBear.endeVJ = 70;
    inputBear.ath = 100;
    inputBear.jahreSeitAth = 1;

    const resBear = MarketAnalyzer.analyzeMarket(inputBear);
    assert(resBear.sKey === 'bear_deep', `Expect bear_deep, got ${resBear.sKey}`);
    assertClose(resBear.abstandVomAthProzent, 30, 0.1, 'ATH distance 30%');

    // Case 3: Recovery (10% down, but >10% Perf)
    const inputRec = getBaseMarketInput();
    inputRec.endeVJ = 90; // Down 10%
    inputRec.ath = 100;
    inputRec.endeVJ_1 = 78; // Was 78 -> 90 = +15%
    inputRec.jahreSeitAth = 2; // > 6 months

    const resRec = MarketAnalyzer.analyzeMarket(inputRec);
    // Logic: abstand=10% (>10? No, needs >10 for Recovery? Wait)
    // Code: abstand > 10 && perf > 10 && months > 6.
    // 10 > 10 is False. Recovery needs > 10% drawdown?
    // Let's make drawdown 11% (EndeVJ = 89).
    inputRec.endeVJ = 89;
    // Perf: 78 -> 89 = +14%

    const resRec2 = MarketAnalyzer.analyzeMarket(inputRec);
    assert(resRec2.sKey === 'recovery', `Expect recovery, got ${resRec2.sKey}`);

    console.log('✅ Scenario Detection Logic Passed');
}

// --- TEST 2: CAPE Valuation Analysis ---
{
    const input = getBaseMarketInput();

    // Case 1: Undervalued (e.g. 10)
    input.capeRatio = 10;
    const resUnder = MarketAnalyzer.analyzeMarket(input);
    assert(resUnder.valuationSignal === 'undervalued', 'Expect undervalued');

    // Case 2: Overvalued (Threshold is 30)
    input.capeRatio = 31;
    const resOver = MarketAnalyzer.analyzeMarket(input);
    assert(resOver.valuationSignal === 'overvalued', `Expect overvalued for CAPE 31 (Got ${resOver.valuationSignal})`);

    // Case 3: Extreme (e.g. 36)
    input.capeRatio = 36;
    const resExt = MarketAnalyzer.analyzeMarket(input);
    assert(resExt.valuationSignal === 'extreme_overvalued', 'Expect extreme_overvalued');

    console.log('✅ CAPE Valuation Logic Passed');
}

// --- TEST 3: CAPE Utils (Historical Filtering) ---
{
    // Test getStartYearCandidates using real HISTORICAL_DATA (if available)
    // Check if 2000 is returned for High CAPE
    if (HISTORICAL_DATA && Object.keys(HISTORICAL_DATA).length > 0) {

        // Mock data structure expected by util: Array of objects {jahr, ...}
        // Actually, getStartYearCandidates expects `data` to be annualData array (for valid years list)
        // and uses HISTORICAL_DATA global for values. 
        // We can pass a mock "valid years list" as data.
        const mockData = Object.keys(HISTORICAL_DATA).map(y => ({ jahr: parseInt(y) }));

        // Target CAPE 30 (Dotcom bubble level)
        const candidatesHigh = getStartYearCandidates(30, mockData, 0.2); // 24-36 range

        // Check known years: 1929 or 2000 approx?
        // 2000 CAPE was ~44(?). 1929 ~30.
        // Let's explicitly check years we know.
        // Or just ensure we get SOME years.

        // Let's try Target 15 (Average).
        const candidatesAvg = getStartYearCandidates(15, mockData, 0.2); // 12-18
        assert(candidatesAvg.length > 0, 'Should find years for CAPE 15');

        // Target 99 (Unrealistic) -> Should trigger fallback to Wide or All
        const candidatesNone = getStartYearCandidates(99, mockData, 0.1);
        // 89-109. Likely none. Fallback logic: Wide -> All?
        // Fallback: If < 5 candidates, try wide (0.5). 99 +/- 50% = 49-148. Still none?
        // If wide empty -> returns ALL validYears.
        assert(candidatesNone.length === mockData.length, 'Should fallback to ALL years for impossible CAPE');

        console.log('✅ CAPE Utils Filtering Passed');

    } else {
        console.warn('⚠️ Skipped CAPE Utils checks (HISTORICAL_DATA missing)');
    }
}

console.log('--- Market Analyzer Tests Completed ---');
