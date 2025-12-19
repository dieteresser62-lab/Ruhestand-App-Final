
import { simulateOneYear } from '../simulator-engine-wrapper.js';
import { EngineAPI } from '../engine/index.mjs';

// --- MOCKING GLOBAL STATE ---
if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.EngineAPI = EngineAPI;

// Helper Assert
function assert(condition, message) {
    if (!condition) throw new Error(message || "Assertion failed");
}
function assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: Actual ${actual} != Expected ${expected}`);
    }
}

console.log('--- Advanced Scenario Tests ---');

// Base Inputs
const baseInputs = {
    startAlter: 65,
    rentAdjPct: 0,
    accumulationPhase: { enabled: false },
    zielLiquiditaet: 20000,
    startFloorBedarf: 24000,
    startFlexBedarf: 10000,
    goldAktiv: false,
    partner: { aktiv: true }, // Couple for widow test
    targetEq: 90,
    startSPB: 1000,
    marketCapeRatio: 20,
    risikoprofil: 'sicherheits-dynamisch',
    kirchensteuerSatz: 0,
    rebalBand: 20,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    pflegeKosten: {
        pg1: 100, pg2: 500, pg3: 1500, pg4: 3000, pg5: 4000
    },
    // Flex adjustments for care
    pflege_flex_faktor: 0.5 // 50% flex reduction if care case
};

// Base State
const baseState = {
    portfolio: {
        depotTranchesAktien: [{ marketValue: 500000, costBasis: 400000, type: 'aktien_alt' }],
        depotTranchesGold: [],
        liquiditaet: 20000
    },
    baseFloor: 24000,
    baseFlex: 10000,
    currentAnnualPension: 20000,
    widowPensionP1: 12000, // 60%
    widowPensionP2: 0,
    marketDataHist: {
        endeVJ: 100, endeVJ_1: 90, endeVJ_2: 80, ath: 100, jahreSeitAth: 0, capeRatio: 20
    }
};

// Year Data
const normalYear = { jahr: 2025, rendite: 0.05, inflation: 1.02, zinssatz: 0.01, gold_eur_perf: 0 };
const crashYear = { jahr: 2025, rendite: -0.50, inflation: 1.02, zinssatz: 0.01, gold_eur_perf: 0.10 };


// --- TEST 1: Care Case (Pflegefall) ---
// Expectation: Uncovered costs increase, Flex demand decreases
try {
    const inputs = { ...baseInputs, p1Pflegegrad: 4 }; // Person 1 has Care Level 4
    const state = JSON.parse(JSON.stringify(baseState));

    // Care costs for PG4 = 3000/month = 36000/year.
    // Pension = 20000. Gap = 16000.

    // We need to pass pflegeMeta AND careFloorAddition (6th arg).
    const pflegeMeta = {
        active: true, // Mark active!
        triggered: true,
        startAge: 65,
        currentYearInCare: 1,
        grade: 4,
        gradeLabel: 'Pflegegrad 4',
        zusatzFloorZiel: 36000, // 3000/month * 12
        zusatzFloorDelta: 36000,
        flexFactor: 0.5,
        mortalityFactor: 1.0,
        kumulierteKosten: 0
    };

    // Simulate what the runner does: Calculate floor addition
    const careFloorAddition = pflegeMeta.zusatzFloorZiel;

    const result = simulateOneYear(state, inputs, normalYear, 0, pflegeMeta, careFloorAddition);

    assert(!result.isRuin, 'Care case should not be ruin with enough assets');

    // Check if total withdrawal is higher than base.
    const baseResult = simulateOneYear(JSON.parse(JSON.stringify(baseState)), baseInputs, normalYear, 0);

    // Correct path matches simulateOneYear return: result.logData.entscheidung.jahresEntnahme
    const spendingCare = result.logData?.entscheidung?.jahresEntnahme || 0;
    const spendingBase = baseResult.logData?.entscheidung?.jahresEntnahme || 0;

    console.log(`Care Spending: ${spendingCare}, Base Spending: ${spendingBase}`);

    assert(spendingCare > spendingBase, 'Spending should increase in care case');

    console.log('✅ Care Scenario Passed');
} catch (e) {
    console.error('Test 1 (Care) Failed', e);
    throw e;
}

// --- TEST 2: Widow/Survivor (Witwenrente) ---
try {
    const inputs = { ...baseInputs, p1Alive: false, partner: { aktiv: true } };

    // Let's simulate a state where P1 is dead.
    const state = JSON.parse(JSON.stringify(baseState));
    // P1 is dead, so P1 pension ignored. P2 is alive and gets Widow Pension.
    state.widowPensionP2 = 12000;
    state.currentAnnualPension2 = 0; // P2 has no own pension

    // Explicitly test with P1 Dead context
    const householdContext = { p1Alive: false, p2Alive: true, widowBenefits: { p1FromP2: false, p2FromP1: true } };

    const result = simulateOneYear(state, inputs, normalYear, 0, null, 0, householdContext);
    assert(!result.isRuin, 'Widow scenario should be solvable');

    // STRICT ASSERTION: Verify Pension Logic
    // We expect the system to use the reduced pension (12000).
    const usedPension = result.logData?.pension_annual || 0;
    console.log(`Widow Pension Used: ${usedPension}`);

    // Assert it strictly matches expected weak pension (allow small float diff)
    assertClose(usedPension, 12000, 1.0, 'Should use the reduced widow pension (12000)');

    console.log('✅ Widow Scenario Passed (Strict Check)');
} catch (e) {
    console.error('Test 2 (Widow) Failed', e);
    throw e;
}

// --- TEST 3: Crash Scenario ---
try {
    const state = JSON.parse(JSON.stringify(baseState));
    const result = simulateOneYear(state, baseInputs, crashYear, 0);

    const endStocks = result.newState.portfolio.depotTranchesAktien[0].marketValue;
    console.log(`Crash End Stocks: ${endStocks} (Start: 500k -> Market: 250k)`);

    // Debug Action
    const actionTitle = result.logData?.aktionUndGrund || "";
    const vk = result.logData?.vk || [];
    console.log(`Crash Action: ${actionTitle}`);
    console.log(`Sales:`, JSON.stringify(vk));

    // Assert we didn't sell ALL stocks.
    assert(endStocks >= 200000, 'Should retain significant stock value after crash (>= 200k)');

    // STRICT ASSERTION: Verify correct crisis reaction
    const isEmergencyOrRebal = actionTitle.includes("Not-VK") || actionTitle.includes("Rebalancing") || actionTitle.includes("Liquidität");
    assert(isEmergencyOrRebal, 'Crash should trigger emergency sale or rebalancing action');
    assert(vk.vkGes > 0, 'Should sell *some* assets to cover liquidity gap');

    assert(!result.isRuin, 'Crash should not cause ruin immediately');
    console.log('✅ Crash Scenario Passed (Strict Check)');
} catch (e) {
    console.error('Test 3 (Crash) Failed', e);
    throw e;
}

console.log('--- Advanced Scenario Tests Completed ---');
