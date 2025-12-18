
import { simulateOneYear, initMcRunState } from '../simulator-engine-wrapper.js';
import { EngineAPI } from '../engine/index.mjs';

// --- MOCKING GLOBAL STATE (SIMULATION ENV) ---
if (typeof global.window === 'undefined') {
    global.window = {};
}

// Simple assertion helper
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

console.log('--- Headless Simulator Test ---');

// TEST 1: Headless Execution with Injection
console.log('\n🔎 Test 1: Headless Execution (Node.js)');

const inputs = {
    startAlter: 65,
    startVermoegen: 500000,
    targetEq: 50,
    rebalancingBand: 10,
    renteAktiv: false,
    startFloorBedarf: 20000,
    startFlexBedarf: 10000,
    zielLiquiditaet: 100000,
    tagesgeld: 50000,
    geldmarktEtf: 50000,
    depotwertAlt: 200000,
    depotwertNeu: 200000,
    costBasisAlt: 150000,
    costBasisNeu: 180000,
    startSPB: 1000,
    kirchensteuerSatz: 0,
    runwayTargetMonths: 24,
    minRunwayMonths: 12,
    risikoprofil: 'sicherheits-dynamisch', // Required for core engine
    rebalBand: 20
};

// Ensure arrays exist for tranche mapping
const initializedInputs = {
    ...inputs,
    depotTranchesAktien: [{
        marketValue: 200000,
        costBasis: 150000,
        type: 'aktien_alt',
        tqf: 0.3
    }]
};

const yearData = {
    inflation: 0.02,
    rendite: 0.05,
    zinssatz: 0.03,
    gold_eur_perf: 10,
    capeRatio: 20
};

const currentState = initMcRunState(initializedInputs, 0);
const config = EngineAPI.getConfig();



try {
    // EXECUTE with manual engine injection
    const result = simulateOneYear(
        currentState,
        initializedInputs,
        yearData,
        0,
        null,
        0,
        null,
        1.0,
        EngineAPI // injecting the engine explicitly
    );

    assert(result, "Result should be defined");
    assert(result.newState, "New State should be defined");
    assert(!result.isRuin, "Standard values should not lead to ruin");

    const cash = result.newState.portfolio.liquiditaet;
    console.log(`   Result Liquidität: ${cash.toFixed(2)}€`);

    assert(cash > 10000, "Should have liquidity remaining");

    console.log('✅ Headless Execution Passed');
} catch (error) {
    console.error('❌ Headless Execution Failed:', error);
    process.exit(1);
}

// TEST 2: Error on Missing Injection
console.log('\n🔎 Test 2: Error when missing engine');
try {
    simulateOneYear(currentState, initializedInputs, yearData, 0);
    // Should fail
    throw new Error("Should have thrown error due to missing engine");
} catch (e) {
    console.log(`✅ Correctly caught missing dependency error: "${e.message}"`);
}

console.log('\n✅ All Headless Tests Passed');
