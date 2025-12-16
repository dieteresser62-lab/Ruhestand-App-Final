
import { simulateOneYear } from '../simulator-engine.js';
import { EngineAPI, Ruhestandsmodell_v30 } from '../engine/index.mjs';

// --- MOCKING GLOBAL STATE ---
if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.Ruhestandsmodell_v30 = Ruhestandsmodell_v30;
global.window.EngineAPI = EngineAPI;

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
    // This gap should be added to the Floor/Spending Need.
    // Flex should be reduced by 50% (factor 0.5) -> 10000 * 0.5 = 5000.

    // Note: simulateOneYear calculates spending internally using SpendingPlanner via EngineAPI.
    // We check the result to see if the "Uncovered Care Costs" influenced the total spending or diagnosis.

    // We need to pass pflegeMeta AND careFloorAddition (6th arg).
    // simulateOneYear signature: (..., pflegeMeta, careFloorAddition, ...)
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
    // The simulator adds this to baseFloor inside (line 191).
    const careFloorAddition = pflegeMeta.zusatzFloorZiel;

    const result = simulateOneYear(state, inputs, normalYear, 0, pflegeMeta, careFloorAddition);

    assert(!result.isRuin, 'Care case should not be ruin with enough assets');

    // Check if Uncovered Costs were detected.
    // The Engine returns `diagnosis` which might contain "Pflegekosten".
    const diag = result.logData?.diagnosis || {};
    const stepOutput = result.logData?.stepOutput || {}; // Depending on what simulateOneYear calls "logData"

    // simulateOneYear returns { newState, logData, isRuin }.
    // logData comes from `_internal_calculateModel` -> `diagnosis`.

    // Hard to check exact numbers without deep access to intermediate steps, 
    // but we can check if total withdrawal is higher than base.
    // Base: 24k Floor + 10k Flex - 20k Pension = 14k Gap. (+ Taxes)
    // Care: 24k Floor + 36k Care - 20k Pension = 40k Gap? 
    // Or does 36k Care replace Floor/Living? Usually additive or partial replacement.
    // Assuming additive for unserved costs.

    // Let's just assert it runs and total spending increased significantly.
    // For comparison, run baseline:
    const baseResult = simulateOneYear(JSON.parse(JSON.stringify(baseState)), baseInputs, normalYear, 0);
    const baseWithdrawal = baseState.portfolio.liquiditaet - baseResult.newState.portfolio.liquiditaet + (baseResult.newState.portfolio.depotTranchesAktien[0].marketValue < 500000 ? 10000 : 0);
    // Complexity in measuring withdrawal because of refill logic.
    // Better: Check `result.logData.ui.spending.totalAnnual`.

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
    // p1Alive false usually triggers widow pension logic if partner is simulated.
    // However, simulation state `widowPensionP1` is usually set at start.
    // If P1 dies, P2 gets widow pension of P1?

    // Since Inputs are static config, we simulate the state where P1 IS ALREADY DEAD.
    // This means `currentAnnualPension` should be P2 Own + Widow P1.
    // OR the Engine adjusts it?
    // Engine usually takes `currentAnnualPension` from state.
    // If we want to test the transition, we need to simulate the year OF death or AFTER.

    // Let's simulate a state where P1 is dead.
    const state = JSON.parse(JSON.stringify(baseState));
    // Simulate low pension (Widow state)
    state.currentAnnualPension = 12000;

    const result = simulateOneYear(state, inputs, normalYear, 0);
    assert(!result.isRuin, 'Widow scenario should be solvable');

    console.log('✅ Widow Scenario Passed (Solvency Check)');
} catch (e) {
    console.error('Test 2 (Widow) Failed', e);
    throw e;
}

// --- TEST 3: Crash Scenario ---
try {
    const state = JSON.parse(JSON.stringify(baseState));
    const result = simulateOneYear(state, baseInputs, crashYear, 0);

    // 50% crash on 500k -> 250k.
    // Spending approx 30k.
    // Portfolio should be ~220k.
    // Rebalancing should probably NOT sell stocks (Crisis mode usually avoids selling equities in deep crash if "Crisis Mode" active).

    const endStocks = result.newState.portfolio.depotTranchesAktien[0].marketValue;
    console.log(`Crash End Stocks: ${endStocks} (Start: 500k -> Market: 250k)`);

    // Debug Action
    const actionTitle = result.logData?.aktionUndGrund || "";
    const vk = result.logData?.vk || [];
    console.log(`Crash Action: ${actionTitle}`);
    console.log(`Sales:`, JSON.stringify(vk));

    // Assert we didn't sell ALL stocks.
    // If exact 200k, maybe we loosen assertion or understand why
    assert(endStocks >= 200000, 'Should retain significant stock value after crash (>= 200k)');

    assert(!result.isRuin, 'Crash should not cause ruin immediately');
    console.log('✅ Crash Scenario Passed');
} catch (e) {
    console.error('Test 3 (Crash) Failed', e);
    throw e;
}

console.log('--- Advanced Scenario Tests Completed ---');
