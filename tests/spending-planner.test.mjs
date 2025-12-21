
import { SpendingPlanner } from '../engine/planners/SpendingPlanner.mjs';
import { CONFIG } from '../engine/config.mjs';

function assert(condition, message) {
    if (!condition) {
        console.error('❌ Assertion failed: ' + message);
        process.exit(1);
    }
}

function assertClose(actual, expected, tolerance = 0.001, message) {
    if (Math.abs(actual - expected) > tolerance) {
        console.error(`❌ Assertion failed: ${message} (Expected ${expected}, got ${actual})`);
        process.exit(1);
    }
}

console.log('--- SpendingPlanner Logic Tests ---');

// --- Helpers to mock params ---
const mockProfile = {
    minRunwayMonths: 24,
    isDynamic: true,
    runway: { 'bear': { total: 60 }, 'peak': { total: 48 }, 'recovery_in_bear': { total: 48 } }
};

// Use deep clone helper for clean state
function getBaseParams() {
    return {
        lastState: {
            initialized: true,
            flexRate: 100,
            alarmActive: false,
            keyParams: { entnahmequoteDepot: 0.035, realerDepotDrawdown: 0.10, peakRealVermoegen: 100000, currentRealVermoegen: 90000 }
        },
        market: { sKey: 'hot_neutral', szenarioText: 'Normal' },
        inflatedBedarf: { floor: 24000, flex: 10000 },
        runwayMonate: 48,
        profil: mockProfile,
        depotwertGesamt: 100000,
        gesamtwert: 110000,
        renteJahr: 20000,
        input: { inflation: 2.0, runwayTargetMonths: 0 }
    };
}

// --- TEST 1: Alarm Trigger ---
{
    // Conditions: >5.5% Withdrawal AND >25% Drawdown AND Bear Market
    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.lastState.keyParams.entnahmequoteDepot = 0.06; // 6% > 5.5%
    params.lastState.keyParams.realerDepotDrawdown = 0.30; // 30% > 25%
    params.runwayMonate = 12; // Thin runway

    const result = SpendingPlanner.determineSpending(params);

    // FIX: Check diagnosis.general.alarmActive
    assert(result.diagnosis.general.alarmActive === true, 'Alarm should activate on critical metrics in Bear market');

    assert(result.spendingResult.kuerzungQuelle.includes('Alarm') || result.spendingResult.kuerzungQuelle.includes('Guardrail'), 'Cutting source should be Alarm/Guardrail');

    // Check cut magnitude (newly triggered alarm usually cuts hard)
    assert(result.spendingResult.details.flexRate < 100, 'Flex rate should be cut');

    console.log('✅ Alarm Activation Logic works');
}

// --- TEST 2: Alarm De-escalation (Recovery) ---
{
    // Setup: Alarm WAS active, Market is now RecoveryInBear, Metrics healthy
    const params = getBaseParams();
    params.lastState.alarmActive = true;
    params.market.sKey = 'recovery_in_bear';
    params.lastState.keyParams.entnahmequoteDepot = 0.04; // 4% (Safe)
    params.lastState.keyParams.realerDepotDrawdown = 0.15; // 15% (Safe)
    params.runwayMonate = 50; // Plenty runway

    // We need input history for safe check: noNewLowerYearlyCloses
    params.input.endeVJ = 100;
    params.input.endeVJ_1 = 90;
    params.input.endeVJ_2 = 80;

    const result = SpendingPlanner.determineSpending(params);

    // FIX: Check diagnosis.general.alarmActive
    assert(result.diagnosis.general.alarmActive === false, 'Alarm should de-escalate in healthy recovery');
    console.log('✅ Alarm De-escalation Logic works');
}

// --- TEST 3: Flex Rate Smoothing ---
{
    const params = getBaseParams();
    // Increase depot to avoid 'Caution' guardrail (Withdrawal Rate < 4.5%)
    params.depotwertGesamt = 1000000;
    params.gesamtwert = 1100000;

    // Previous rate was 100%. Market Bear Deep demands -10pp or raw cut.
    params.market.sKey = 'bear_deep';
    params.market.abstandVomAthProzent = 30; // 30% crash
    // Raw Formula: 50 + (30-20) = 60% Cut => 40% Target Flex Rate.
    // Previous: 100%.
    // Smoothed: 0.35 * 40 + 0.65 * 100 = 14 + 65 = 79%.
    // Max Change Down Bear: 10pp.
    // From 100 to 79 is -21pp. Cap at -10pp. Result: 90%.

    const result = SpendingPlanner.determineSpending(params);
    const newRate = result.spendingResult.details.flexRate;

    console.log(`   Detailed Result: Rate=${newRate}, Source=${result.spendingResult.kuerzungQuelle}`);

    assertClose(newRate, 90, 0.1, 'Flex Rate should be smoothed/capped (100 -> 90)');
    assert(result.spendingResult.kuerzungQuelle.includes('Glättung'), `Source should be Smoothing, but was: ${result.spendingResult.kuerzungQuelle}`);

    console.log('✅ Flex Rate Smoothing works');
}

// --- TEST 4: Budget Floor Protection ---
{
    // Scenario: High Spending Pressure (Bear), but Floor MUST be paid.
    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.market.abstandVomAthProzent = 5; // Mild bear

    // Force very low flex rate from previous state to see if it bumps up
    params.lastState.flexRate = 0;

    const result = SpendingPlanner.determineSpending(params);

    const spending = result.spendingResult.details.endgueltigeEntnahme;
    assert(spending >= 24000, 'Must pay at least the nominal floor');

    console.log('✅ Budget Floor Protection works');
}

console.log('--- SpendingPlanner Tests Completed ---');
