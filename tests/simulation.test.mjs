
import { simulateOneYear } from '../simulator-engine.js';
import { EngineAPI } from '../engine/index.mjs';

// --- MOCKING GLOBAL STATE ---
// simulator-engine.js relies auf eine globale EngineAPI, falls keine explizit injiziert wird
if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.EngineAPI = EngineAPI;

console.log('--- Simulation Loop Tests ---');

/**
 * Einfache Assertion ohne Test-Runner, damit der Test in Node-Umgebungen stabil bleibt.
 * @param {boolean} condition - Ausdruck, der wahr sein muss.
 * @param {string} message - Fehlermeldung für den Fall der Nichterfüllung.
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

/**
 * Vergleich zweier Zahlen mit Toleranz, um Floating-Point-Abweichungen robust zu behandeln.
 * @param {number} actual - gemessener Wert
 * @param {number} expected - Vergleichswert
 * @param {number} tolerance - maximal erlaubte Abweichung
 * @param {string} message - Fehlerhinweis
 */
function assertClose(actual, expected, tolerance, message) {
    const delta = Math.abs(actual - expected);
    if (delta > tolerance) {
        throw new Error(message + ` (Δ=${delta.toFixed(4)})`);
    }
}

// Mock Inputs
const inputs = {
    startAlter: 65,
    rentAdjPct: 0,
    accumulationPhase: { enabled: false },
    zielLiquiditaet: 20000,
    startFloorBedarf: 24000, // 2k/month
    startFlexBedarf: 6000,
    goldAktiv: false,
    partner: { aktiv: false },
    targetEq: 90, // Max permitted equity
    startSPB: 1000,
    marketCapeRatio: 20,
    risikoprofil: 'sicherheits-dynamisch',
    kirchensteuerSatz: 0,
    rentAdjPct: 0,
    rebalBand: 20,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5
};

// Mock State
const startPortfolio = {
    depotTranchesAktien: [{ marketValue: 500000, costBasis: 400000, type: 'aktien_alt' }],
    depotTranchesGold: [],
    liquiditaet: 20000
};

const startHistoricalData = {
    endeVJ: 100,
    endeVJ_1: 90,
    endeVJ_2: 80,
    ath: 100,
    jahreSeitAth: 0,
    capeRatio: 20
};

const state = {
    portfolio: startPortfolio,
    baseFloor: 24000,
    baseFlex: 6000,
    lastState: null, // Engine will init
    currentAnnualPension: 0,
    marketDataHist: startHistoricalData,
    widowPensionP1: 0,
    widowPensionP2: 0
};

// Mock Year Data (Normal Year)
const yearDataNormal = {
    jahr: 2000,
    rendite: 0.05, // +5%
    inflation: 2.0,
    zinssatz: 1.0,
    gold_eur_perf: 0
};

// Test 1: simulateOneYear run-through
try {
    const result = simulateOneYear(state, inputs, yearDataNormal, 0);

    if (result.isRuin) {
        console.log('Ruin Result:', JSON.stringify(result, null, 2));
    }

    assert(!result.isRuin, 'Normal year should not be ruin');
    assert(result.newState !== undefined, 'Should return newState');
    assert(result.logData !== undefined, 'Should return logData');

    // Check inflation adjustment
    const expectedFloor = 24000 * 1.02;
    // Floating point precision check
    assertClose(result.newState.baseFloor, expectedFloor, 0.01, 'Floor should inflate by 2%');

    console.log('✅ Simulation run-through passed');
} catch (e) {
    console.error('Test 1 Failed', e);
    throw e;
}

// Test 2: Ruin Scenario
// Extremely high withdrawals or 0 assets
try {
    const poorState = JSON.parse(JSON.stringify(state));
    poorState.portfolio.depotTranchesAktien = [];
    poorState.portfolio.liquiditaet = 0;

    const result = simulateOneYear(poorState, inputs, yearDataNormal, 0);
    assert(result.isRuin, 'Zero assets should be ruin');
    console.log('✅ Ruin detection passed');
} catch (e) {
    console.error('Test 2 Failed', e);
    throw e;
}

console.log('--- Simulation Loop Tests Completed ---');
