
import { simulateOneYear, initMcRunState } from '../simulator-engine.js';
import { EngineAPI } from '../engine/index.mjs';

// --- MOCKING GLOBAL STATE (SIMULATION ENV) ---
// Note: We deliberately do NOT set global.window.EngineAPI here
// to verify that the injection works!
if (typeof global.window === 'undefined') {
    global.window = {};
}

// Simple assertion helper
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

// MOCKING GLOBAL CLEANUP
// Since other tests (parity.test.mjs) might have set this global, we clean it up here
// to ensure we really test the headless path.
if (typeof global.window !== 'undefined') {
    global.window.EngineAPI = undefined;
}

console.log('--- Headless Simulator Test ---');

// TEST 0: Prove that global injection is missing (Verify test setup)
console.log('🔎 Test 0: Verify Environment Cleanliness');
assert(typeof global.window === 'undefined' || typeof global.window.EngineAPI === 'undefined', "Global Engine should be undefined");
console.log('✅ Environment verified (No Global Engine)');

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
    targetEq: 50, // Moved up for clarity
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

console.log('   DEBUG: Engine CONFIG Available?', !!EngineAPI.getConfig);
console.log('   DEBUG: PROFIL_MAP Keys:', Object.keys(EngineAPI.getConfig?.().PROFIL_MAP || {}));


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
    if (cash === 0) {
        console.log('   DEBUG: Transaktion:', JSON.stringify(result.logData.transaktion, null, 2));
        console.log('   DEBUG: Entscheidung:', JSON.stringify(result.logData.entscheidung, null, 2));
        console.log('   DEBUG: Spending:', JSON.stringify(result.ui?.spending, null, 2));
    }
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
    const expectedMessage = e.message.includes('EngineAPI fehlt') || e.message.includes('No Engine API available');
    if (expectedMessage) {
        console.log(`✅ Correctly caught missing dependency error: "${e.message}"`);
    } else {
        throw new Error(`Unexpected error caught: ${e.message}`);
    }
}

console.log('\n✅ All Headless Tests Passed');
