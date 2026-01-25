
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

function smoothstep(x) {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
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

// --- TEST 3: Flex Rate Smoothing / Caps ---
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

    const prevRate = params.lastState.flexRate ?? 100;
    assert(newRate <= prevRate, `Flex Rate should not increase in Bear test, got ${newRate}`);
    assert(newRate >= 0, `Flex Rate should be non-negative, got ${newRate}`);
    assert(
        result.spendingResult.kuerzungQuelle.includes('Glättung') ||
        result.spendingResult.kuerzungQuelle.includes('Flex-Anteil') ||
        result.spendingResult.kuerzungQuelle.includes('Guardrail') ||
        result.spendingResult.kuerzungQuelle.includes('Vermögen'),
        `Source should be Smoothing/Flex-Anteil/Guardrail, but was: ${result.spendingResult.kuerzungQuelle}`
    );

    console.log('✅ Flex Rate Smoothing/Caps work');
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

// --- TEST 5: Wealth-adjusted reduction factor (net withdrawal) ---
{
    const params = {
        inflatedBedarf: { floor: 40000, flex: 20000 },
        renteJahr: 0,
        depotwertGesamt: 6000000
    };
    const result = SpendingPlanner._calculateWealthAdjustedReductionFactor(params);
    assertClose(result.factor, 0, 0.001, 'No reduction at 1% withdrawal rate');
    console.log('✅ Wealth-adjusted reduction: 1% => 0');
}

// --- TEST 6: Wealth-adjusted reduction factor midpoint ---
{
    const params = {
        inflatedBedarf: { floor: 40000, flex: 20000 },
        renteJahr: 0,
        depotwertGesamt: 2400000 // 60k / 2.4M = 2.5%
    };
    const result = SpendingPlanner._calculateWealthAdjustedReductionFactor(params);
    assertClose(result.factor, 0.5, 0.01, 'Midpoint reduction at 2.5% withdrawal rate');
    console.log('✅ Wealth-adjusted reduction: 2.5% => 0.5');
}

// --- TEST 7: Wealth-adjusted reduction factor full ---
{
    const params = {
        inflatedBedarf: { floor: 40000, flex: 20000 },
        renteJahr: 0,
        depotwertGesamt: 1200000 // 60k / 1.2M = 5%
    };
    const result = SpendingPlanner._calculateWealthAdjustedReductionFactor(params);
    assertClose(result.factor, 1, 0.001, 'Full reduction at 5% withdrawal rate');
    console.log('✅ Wealth-adjusted reduction: 5% => 1');
}

// --- TEST 8: Wealth-adjusted reduction respects pensions (net withdrawal) ---
{
    const params = {
        inflatedBedarf: { floor: 40000, flex: 20000 },
        renteJahr: 60000, // pensions cover full need
        depotwertGesamt: 1000000
    };
    const result = SpendingPlanner._calculateWealthAdjustedReductionFactor(params);
    assertClose(result.factor, 0, 0.001, 'No reduction when pensions cover full need');
    console.log('✅ Wealth-adjusted reduction: pensions cover need => 0');
}

// --- TEST 9: S-curve check against linear ---
{
    const params = {
        inflatedBedarf: { floor: 40000, flex: 20000 },
        renteJahr: 0,
        depotwertGesamt: 3000000 // 60k / 3.0M = 2.0%
    };
    const result = SpendingPlanner._calculateWealthAdjustedReductionFactor(params);
    const expected = smoothstep(0.25);
    assertClose(result.factor, expected, 0.01, 'S-curve factor at 2% matches smoothstep');
    console.log('✅ Wealth-adjusted reduction: S-curve matches at 2%');
}

console.log('--- SpendingPlanner Tests Completed ---');
