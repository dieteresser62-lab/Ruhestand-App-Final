
import { SpendingPlanner } from '../engine/planners/SpendingPlanner.mjs';
import {
    evaluateAlarmConditions,
    shouldDeescalateInPeak,
    shouldDeescalateInRecovery
} from '../engine/planners/alarm-policy.mjs';
import { applyFinalRateLimits } from '../engine/planners/final-rate-policy.mjs';
import { applyFlexBudgetCap } from '../engine/planners/flex-budget-policy.mjs';
import { applyFlexShareCurve, calculateFlexRate } from '../engine/planners/flex-rate-policy.mjs';
import { applyMinimumFlexFloor } from '../engine/planners/minimum-flex-policy.mjs';
import { buildSpendingDiagnosis, resolveRunwayTarget } from '../engine/planners/spending-diagnosis.mjs';
import { applyGuardrails } from '../engine/planners/spending-guardrails.mjs';
import { applySpendingPolicyPipeline } from '../engine/planners/spending-policy-pipeline.mjs';
import { calculateFinalWithdrawal } from '../engine/planners/spending-policy-helpers.mjs';
import { calculateWealthAdjustedReductionFactor } from '../engine/planners/wealth-reduction.mjs';
import { CONFIG } from '../engine/config.mjs';

function assert(condition, message) {
    if (!condition) {
        console.error('❌ Assertion failed: ' + message);
        process.exit(1);
    }
}

// Small numeric tolerance helper for percent-ish outputs.
function assertClose(actual, expected, tolerance = 0.001, message) {
    if (Math.abs(actual - expected) > tolerance) {
        console.error(`❌ Assertion failed: ${message} (Expected ${expected}, got ${actual})`);
        process.exit(1);
    }
}

// Mirror the S-curve helper so we can validate the factor directly.
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

// Create a fresh params object for each test block.
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

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

// --- TEST 1: Alarm Trigger ---
{
    // Conditions: >5.5% withdrawal AND >25% drawdown AND bear market.
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
    // Setup: alarm WAS active, market is now recovery-in-bear, metrics healthy.
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

// --- TEST 2a: Alarm policy peak de-escalation ---
{
    const params = getBaseParams();
    params.market.sKey = 'peak_stable';
    params.lastState.alarmActive = true;
    params.lastState.keyParams.entnahmequoteDepot = CONFIG.THRESHOLDS.ALARM.withdrawalRate;
    params.lastState.keyParams.realerDepotDrawdown = 0.20;

    assert(
        shouldDeescalateInPeak(true, params.lastState, params) === true,
        'Peak de-escalation should allow alarm reset on safe withdrawal rate'
    );
    assert(
        SpendingPlanner._shouldDeescalateInPeak(true, params.lastState, params) === true,
        'Planner peak delegate should match alarm policy'
    );
    console.log('✅ Alarm policy: peak de-escalation works');
}

// --- TEST 2b: Alarm policy direct checks ---
{
    const params = getBaseParams();
    params.lastState.alarmActive = true;
    params.market.sKey = 'recovery_in_bear';
    params.runwayMonate = params.profil.minRunwayMonths + 6;
    params.input.endeVJ = 100;
    params.input.endeVJ_1 = 90;
    params.input.endeVJ_2 = 80;

    assert(
        shouldDeescalateInRecovery(true, params.lastState, params) === true,
        'Recovery de-escalation should allow alarm reset with runway and rising closes'
    );
    assert(
        SpendingPlanner._shouldDeescalateInRecovery(true, params.lastState, params) === true,
        'Planner recovery delegate should match alarm policy'
    );
    console.log('✅ Alarm policy: recovery de-escalation works');
}

// --- TEST 2c: Alarm policy suppresses crisis alarm when wealth is sufficient ---
{
    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.lastState.alarmActive = false;
    params.lastState.keyParams.entnahmequoteDepot = 0.08;
    params.lastState.keyParams.realerDepotDrawdown = 0.30;
    params.depotwertGesamt = 10000000;
    params.renteJahr = 0;
    params.inflatedBedarf = { floor: 40000, flex: 20000 };
    const decisions = [];
    const addDecision = (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity });

    const result = evaluateAlarmConditions(params.lastState, params, addDecision);
    assert(result.active === false, 'Wealth-sufficient bear market should suppress alarm');
    assert(result.newlyTriggered === false, 'Wealth-sufficient bear market should not newly trigger alarm');
    assert(decisions.some(d => d.step === 'Alarm unterdrückt'), 'Suppression should be logged');
    console.log('✅ Alarm policy: wealth-sufficient suppression works');
}

// --- TEST 2d: Spending diagnosis builder preserves public shape ---
{
    const params = getBaseParams();
    params.profil = {
        ...params.profil,
        isDynamic: true,
        runway: {
            hot_neutral: { total: 12 },
            bear: { total: 30 }
        }
    };
    params.market.sKey = 'bear_deep';
    params.runwayMonate = 18;
    const state = clone(params.lastState);
    state.keyParams = {
        entnahmequoteDepot: 0.05,
        realerDepotDrawdown: 0.20,
        wealthReductionFactor: 0.75
    };
    const decisionTree = [{ step: 'Test', impact: 'Shape bleibt stabil', status: 'active', severity: 'info' }];
    const result = buildSpendingDiagnosis({
        decisionTree,
        state,
        alarmStatus: { active: true, newlyTriggered: false },
        params,
        guardrailDiagnostics: {
            inflationCap: { rule: 'max', type: 'percent', threshold: 0.03, value: 0.05 },
            budgetFloor: { rule: 'min', type: 'currency', threshold: 50000, value: 48000 }
        },
        diagnosisMetrics: {
            flexRate: 70,
            kuerzungProzent: 30,
            jahresentnahme: 42000
        }
    });

    assert(result.decisionTree === decisionTree, 'Diagnosis should retain the decision tree reference');
    assert(result.general.alarmActive === true, 'Diagnosis should expose alarm state');
    assert(result.general.runwayTargetQuelle === 'profil:bear', 'Dynamic runway target should use mapped regime');
    assert(result.guardrails.some(g => g.name === 'Inflations-Cap'), 'Diagnosis should include inflation cap diagnostics');
    assert(result.guardrails.some(g => g.name === 'Budget-Floor Deckung'), 'Diagnosis should include budget floor diagnostics');
    assert(result.keyParams.aktuelleFlexRate === 70, 'Diagnosis should copy final flex rate');
    assert(result.keyParams.jahresentnahme === 42000, 'Diagnosis should copy final withdrawal');
    console.log('✅ Spending diagnosis builder preserves public shape');
}

// --- TEST 2e: Spending diagnosis runway target delegate ---
{
    const profil = { minRunwayMonths: 6, isDynamic: false };
    const input = { runwayTargetMonths: 14 };
    const market = { sKey: 'hot_neutral' };
    const direct = resolveRunwayTarget(profil, market, input);
    const delegated = SpendingPlanner._resolveRunwayTarget(profil, market, input);

    assert(direct.targetMonths === 14, 'Static runway target should use input target');
    assert(direct.source === 'input', 'Static runway target should keep input source');
    assert(delegated.targetMonths === direct.targetMonths, 'Planner runway target delegate should match diagnosis module');
    assert(delegated.source === direct.source, 'Planner runway source delegate should match diagnosis module');
    console.log('✅ Spending diagnosis runway target delegate works');
}

// --- TEST 3: Flex Rate Smoothing / Caps ---
{
    const decisions = [];
    const result = applyFlexShareCurve(
        100,
        { floor: 10000, flex: 90000 },
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity }),
        1
    );

    assert(result.applied === true, 'Flex-share curve should apply when flex share is high');
    assert(result.rate < 100, 'Flex-share curve should cap the flex rate');
    assert(decisions.some(d => d.step === 'Flex-S-Kurve'), 'Flex-share curve should be logged');
    console.log('✅ Flex-rate policy: flex share curve works');
}

// --- TEST 3b: Flex-rate policy direct alarm mode ---
{
    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.runwayMonate = 6;
    params.lastState.keyParams.entnahmequoteDepot = 0.10;
    params.lastState.keyParams.realerDepotDrawdown = 0.40;
    params.renteJahr = 0;
    params.inflatedBedarf = { floor: 24000, flex: 24000 };
    params.depotwertGesamt = 300000;
    const state = clone(params.lastState);
    const plannerState = clone(params.lastState);
    const decisions = [];
    const addDecision = (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity });
    const alarmStatus = { active: true, newlyTriggered: true };

    const result = calculateFlexRate(state, alarmStatus, params, addDecision);
    const plannerResult = SpendingPlanner._calculateFlexRate(plannerState, alarmStatus, params, () => {});

    assert(result.kuerzungQuelle === 'Guardrail (Alarm)', 'Alarm mode should mark alarm source');
    assert(result.geglätteteFlexRate < params.lastState.flexRate, 'New alarm should reduce flex rate');
    assert(decisions.some(d => d.step === 'Anpassung im Alarm-Modus'), 'Alarm flex-rate adjustment should be logged');
    assertClose(plannerResult.geglätteteFlexRate, result.geglätteteFlexRate, 0.0001, 'Planner flex-rate delegate should match policy');
    console.log('✅ Flex-rate policy: alarm mode works');
}

// --- TEST 3c: Flex-rate policy direct bear cap ---
{
    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.market.abstandVomAthProzent = 35;
    params.runwayMonate = 12;
    params.renteJahr = 0;
    params.inflatedBedarf = { floor: 24000, flex: 24000 };
    params.depotwertGesamt = 300000;
    params.lastState.keyParams.entnahmequoteDepot = 0.10;
    const state = clone(params.lastState);
    const decisions = [];
    const result = calculateFlexRate(
        state,
        { active: false, newlyTriggered: false },
        params,
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity })
    );

    assert(result.geglätteteFlexRate <= params.lastState.flexRate, 'Bear policy should not increase flex rate');
    assert(
        ['Tiefer Bär', 'Tiefer Bär (vermögensadj.)', 'Glättung (Abfall)', 'Guardrail (Bären-Cap)', 'Guardrail (Runway-Cap)'].includes(result.kuerzungQuelle),
        `Bear policy should use a bear-compatible source, got ${result.kuerzungQuelle}`
    );
    assert(Number.isFinite(state.keyParams.wealthReductionFactor), 'Flex-rate policy should write wealth factor diagnostics');
    console.log('✅ Flex-rate policy: bear path works');
}

// --- TEST 3d: Flex Rate Smoothing / Caps ---
{
    const params = getBaseParams();
    // Increase depot to avoid 'Caution' guardrail (withdrawal rate < 4.5%).
    params.depotwertGesamt = 1000000;
    params.gesamtwert = 1100000;

    // Previous rate was 100%. Bear-deep demands a large cut; caps should limit it.
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
    const params = getBaseParams();
    params.market.sKey = 'recovery_in_bear';
    params.market.abstandVomAthProzent = 20;
    params.runwayMonate = 20;
    params.renteJahr = 0;
    params.inflatedBedarf = { floor: 24000, flex: 24000 };
    params.depotwertGesamt = 300000;
    params.input = {
        ...params.input,
        inflation: 2,
        endeVJ: 100,
        endeVJ_1: 95,
        endeVJ_2: 90
    };
    const state = clone(params.lastState);
    state.keyParams.entnahmequoteDepot = 0.08;
    const decisions = [];
    const result = applyGuardrails(
        100,
        state,
        { ...params, kuerzungQuelle: 'Profil' },
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity })
    );
    const plannerResult = SpendingPlanner._applyGuardrails(100, clone(params.lastState), { ...params, kuerzungQuelle: 'Profil' }, () => {});

    assert(result.rate < 100, 'Recovery guardrail should cap flex rate');
    assert(result.source.includes('Guardrail'), 'Recovery guardrail should set guardrail source');
    assert(decisions.some(d => String(d.step).includes('Guardrail')), 'Recovery guardrail should be logged');
    assertClose(plannerResult.rate, result.rate, 0.0001, 'Planner guardrail delegate should match policy');
    console.log('✅ Guardrail policy: recovery cap works');
}

// --- TEST 3i: Guardrail policy caution inflation cap ---
{
    const params = getBaseParams();
    params.input = { ...params.input, inflation: 6 };
    const state = clone(params.lastState);
    state.keyParams.entnahmequoteDepot = CONFIG.THRESHOLDS.CAUTION.withdrawalRate;
    const decisions = [];
    const result = applyGuardrails(
        100,
        state,
        { ...params, kuerzungQuelle: 'Profil' },
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity })
    );

    assert(result.source === 'Guardrail (Vorsicht)', 'Caution inflation cap should set caution source');
    assert(result.diagnostics.inflationCap, 'Caution inflation cap should expose diagnostics');
    assertClose(result.diagnostics.inflationCap.threshold, CONFIG.THRESHOLDS.CAUTION.inflationCap / 100, 0.0001, 'Inflation cap threshold should be normalized');
    assert(decisions.some(d => d.step === 'Guardrail (Vorsicht)'), 'Caution inflation cap should be logged');
    console.log('✅ Guardrail policy: caution inflation cap works');
}

// --- TEST 3j: Guardrail policy budget floor ---
{
    const params = getBaseParams();
    params.market.sKey = 'hot_neutral';
    params.renteJahr = 0;
    params.inflatedBedarf = { floor: 30000, flex: 30000 };
    params.input = {
        ...params.input,
        inflation: 2,
        budgetInflationBoost: 8,
        endeVJ: 100,
        endeVJ_1: 95,
        endeVJ_2: 90
    };
    const state = clone(params.lastState);
    state.keyParams.entnahmequoteDepot = 0.02;
    state.keyParams.wealthReductionFactor = 1;
    const decisions = [];
    const result = applyGuardrails(
        0,
        state,
        { ...params, kuerzungQuelle: 'Profil' },
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity })
    );

    assert(result.source === 'Budget-Floor', 'Budget floor should become source when it lifts the rate');
    assert(result.rate > 0, 'Budget floor should lift a zero flex rate');
    assert(result.diagnostics.budgetFloor, 'Budget floor should expose diagnostics');
    assert(decisions.some(d => d.step === 'Budget-Floor'), 'Budget floor should be logged');
    console.log('✅ Guardrail policy: budget floor works');
}

// --- TEST 4: Budget Floor Protection ---
{
    const state = { flexBudgetBalanceYears: 2, keyParams: { wealthReductionFactor: 1 } };
    const input = {
        flexBudgetAnnual: 6000,
        flexBudgetYears: 2,
        flexBudgetRecharge: 0,
        floorBedarf: 24000,
        flexBedarf: 24000
    };
    const inflatedBedarf = { floor: 24000, flex: 24000 };
    const market = { sKey: 'bear_deep' };
    const decisions = [];
    const result = applyFlexBudgetCap(
        100,
        inflatedBedarf,
        input,
        state,
        market,
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity })
    );
    const plannerResult = SpendingPlanner._applyFlexBudgetCap(100, inflatedBedarf, input, clone(state), market, () => {});

    assert(result.applied === true, 'Flex budget should apply cap in bear regime');
    assert(result.rate < 100, 'Flex budget cap should reduce rate');
    assertClose(result.balanceYears, 1, 0.0001, 'Flex budget should consume one bear year');
    assert(decisions.some(d => d.step === 'Flex-Budget (Cap)'), 'Flex budget cap should be logged');
    assertClose(plannerResult.rate, result.rate, 0.0001, 'Planner flex budget delegate should match policy');
    console.log('✅ Flex-budget policy: cap and delegate work');
}

// --- TEST 3f: Flex-budget policy recharge ---
{
    const state = { flexBudgetBalanceYears: 1, keyParams: { wealthReductionFactor: 1 } };
    const result = applyFlexBudgetCap(
        100,
        { floor: 24000, flex: 24000 },
        {
            flexBudgetAnnual: 6000,
            flexBudgetYears: 3,
            flexBudgetRecharge: 3000,
            floorBedarf: 24000,
            flexBedarf: 24000
        },
        state,
        { sKey: 'hot_neutral' },
        () => {}
    );

    assert(result.applied === false, 'Flex budget should not cap outside active regimes');
    assertClose(result.balanceYears, 1.5, 0.0001, 'Flex budget should recharge by recharge / annualCap years');
    console.log('✅ Flex-budget policy: recharge works');
}

// --- TEST 3g: Flex-budget policy min-rate ---
{
    const state = { flexBudgetBalanceYears: 2, keyParams: { wealthReductionFactor: 1 } };
    const result = applyFlexBudgetCap(
        5,
        { floor: 48000, flex: 12000 },
        {
            flexBudgetAnnual: 6000,
            flexBudgetYears: 2,
            flexBudgetRecharge: 0,
            floorBedarf: 48000,
            flexBedarf: 12000
        },
        state,
        { sKey: 'bear_deep' },
        () => {}
    );

    assert(result.applied === true, 'Flex budget min-rate should apply in bear regime');
    assert(result.rate > 5, 'Flex budget min-rate should lift very low rates');
    assertClose(result.minRatePct, 53, 0.0001, 'Flex budget min-rate should include floor-share slope');
    console.log('✅ Flex-budget policy: min-rate works');
}

// --- TEST 3h: Minimum-flex policy direct helper ---
{
    const inflatedBedarf = { floor: 24000, flex: 20000 };
    const input = { minimumFlexAnnual: 10000 };
    const decisions = [];
    const beforeBedarf = JSON.stringify(inflatedBedarf);
    const beforeInput = JSON.stringify(input);
    const result = applyMinimumFlexFloor(
        20,
        { inflatedBedarf, input, alarmStatus: { active: false } },
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity })
    );
    const delegated = SpendingPlanner._applyMinimumFlexFloor(
        20,
        { inflatedBedarf, input, alarmStatus: { active: false } },
        () => {}
    );

    assert(result.applied === true, 'Minimum flex should apply when effective flex is below floor');
    assertClose(result.requiredRate, 50, 0.0001, 'Minimum flex should calculate required rate from inflated flex');
    assertClose(result.rate, 50, 0.0001, 'Minimum flex should lift rate to required rate');
    assert(result.status === 'applied', 'Minimum flex should report applied status');
    assert(decisions.some(d => d.step === 'Mindest-Flex'), 'Minimum flex should be logged');
    assert(JSON.stringify(inflatedBedarf) === beforeBedarf, 'Minimum flex must not mutate inflatedBedarf');
    assert(JSON.stringify(input) === beforeInput, 'Minimum flex must not mutate input');
    assertClose(delegated.rate, result.rate, 0.0001, 'Planner minimum-flex delegate should match policy');

    const zero = applyMinimumFlexFloor(20, { inflatedBedarf, input: { minimumFlexAnnual: 0 }, alarmStatus: { active: false } }, () => {});
    assert(zero.status === 'inactive_zero' && zero.rate === 20, 'Minimum flex zero should leave rate unchanged');

    const noFlex = applyMinimumFlexFloor(20, { inflatedBedarf: { floor: 24000, flex: 0 }, input, alarmStatus: { active: false } }, () => {});
    assert(noFlex.status === 'not_needed' && noFlex.rate === 20, 'Minimum flex should not divide by zero when flex need is zero');

    const alarm = applyMinimumFlexFloor(20, { inflatedBedarf, input, alarmStatus: { active: true } }, () => {});
    assert(alarm.status === 'blocked_emergency' && alarm.rate === 20, 'Minimum flex should not lift during alarm mode');

    const lowLiquidityEnoughWealth = applyMinimumFlexFloor(
        20,
        {
            inflatedBedarf,
            input,
            alarmStatus: { active: false },
            runwayMonate: 1,
            profil: { minRunwayMonths: 24 },
            gesamtwert: 120000
        },
        () => {}
    );
    assert(lowLiquidityEnoughWealth.applied === true, 'Low current liquidity alone should not block minimum flex when total wealth is sufficient');

    const runwayEmergency = applyMinimumFlexFloor(
        20,
        {
            inflatedBedarf,
            input,
            alarmStatus: { active: false },
            profil: { minRunwayMonths: 24 },
            gesamtwert: 70000
        },
        () => {}
    );
    assert(runwayEmergency.status === 'blocked_emergency', 'Minimum flex should block when minimum runway cannot be restored');
    assert(runwayEmergency.blockReason === 'minimum_runway_not_restorable', 'Runway emergency should expose block reason');
    assertClose(runwayEmergency.emergency.requiredWealthForRunway, 102000, 0.0001, 'Runway proxy documents floor+minimum-flex plus 24-month reserve');

    const floorEmergency = applyMinimumFlexFloor(
        20,
        {
            inflatedBedarf,
            input,
            alarmStatus: { active: false },
            profil: { minRunwayMonths: 0 },
            gesamtwert: 30000
        },
        () => {}
    );
    assert(floorEmergency.status === 'blocked_emergency', 'Minimum flex should block when floor plus minimum flex is not covered');
    assert(floorEmergency.blockReason === 'floor_minimum_flex_not_covered', 'Floor emergency should expose block reason');

    console.log('✅ Minimum-flex policy helper works');
}

// --- TEST 4: Budget Floor Protection ---
{
    // Scenario: high spending pressure (bear), but floor MUST be paid.
    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.market.abstandVomAthProzent = 5; // Mild bear

    // Force very low flex rate from previous state to see if it bumps up.
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
    const result = calculateWealthAdjustedReductionFactor(params);
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
    const result = calculateWealthAdjustedReductionFactor(params);
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
    const result = calculateWealthAdjustedReductionFactor(params);
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
    const result = calculateWealthAdjustedReductionFactor(params);
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
    const result = calculateWealthAdjustedReductionFactor(params);
    const expected = smoothstep(0.25);
    assertClose(result.factor, expected, 0.01, 'S-curve factor at 2% matches smoothstep');
    console.log('✅ Wealth-adjusted reduction: S-curve matches at 2%');
}

// --- TEST 9b: Wealth-adjusted reduction uses real previous withdrawal when available ---
{
    const params = {
        inflatedBedarf: { floor: 100000, flex: 100000 },
        renteJahr: 0,
        depotwertGesamt: 2400000,
        lastState: {
            lastEntnahmeReal: 60000,
            cumulativeInflationFactor: 1.2
        }
    };
    const result = calculateWealthAdjustedReductionFactor(params);
    const cfg = CONFIG.SPENDING_MODEL.WEALTH_ADJUSTED_REDUCTION;
    const expectedT = (0.03 - cfg.SAFE_WITHDRAWAL_RATE) / (cfg.FULL_WITHDRAWAL_RATE - cfg.SAFE_WITHDRAWAL_RATE);
    assertClose(result.entnahmequoteUsed, 0.03, 0.0001, 'Real previous withdrawal should use real depot basis');
    assertClose(result.factor, smoothstep(expectedT), 0.01, 'Real previous withdrawal should drive wealth factor');
    assertClose(
        SpendingPlanner._calculateWealthAdjustedReductionFactor(params).factor,
        result.factor,
        0.0001,
        'Planner delegate should return wealth policy factor'
    );
    console.log('✅ Wealth-adjusted reduction: real previous withdrawal basis works');
}

// --- TEST 10: Alarm + Flex-Budget + Final-Limits interaction ---
{
    const decisions = [];
    const result = applyFinalRateLimits(
        100,
        50,
        { sKey: 'bear_deep' },
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity }),
        1
    );
    const delegated = SpendingPlanner._applyFinalRateLimits(100, 50, { sKey: 'bear_deep' }, () => {}, 1);

    assertClose(result.rate, 90, 0.0001, 'Final-rate policy should cap bear drawdown to 10pp');
    assert(result.applied === true, 'Final-rate policy should mark active cap');
    assert(decisions.some(d => d.step === 'Glättung (Final-Guardrail)'), 'Final-rate cap should be logged');
    assertClose(delegated.rate, result.rate, 0.0001, 'Planner final-rate delegate should match policy');
    console.log('✅ Final-rate policy delegate works');
}

// --- TEST 10a: Spending policy pipeline applies post-flex controls ---
{
    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.market.abstandVomAthProzent = 35;
    params.runwayMonate = 12;
    params.inflatedBedarf = { floor: 24000, flex: 24000 };
    params.input = {
        ...params.input,
        floorBedarf: 24000,
        flexBedarf: 24000,
        flexBudgetAnnual: 6000,
        flexBudgetYears: 2,
        flexBudgetRecharge: 0
    };
    const state = clone(params.lastState);
    state.keyParams.entnahmequoteDepot = 0.08;
    state.keyParams.realerDepotDrawdown = 0.30;
    const delegateState = clone(state);
    const decisions = [];
    const initialPolicyResult = { geglätteteFlexRate: 40, kuerzungQuelle: 'Tiefer Bär' };
    const result = applySpendingPolicyPipeline(
        state,
        { active: false, newlyTriggered: false },
        params,
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity }),
        initialPolicyResult
    );
    const delegated = SpendingPlanner._applySpendingPolicyPipeline(
        delegateState,
        { active: false, newlyTriggered: false },
        params,
        () => {},
        initialPolicyResult
    );

    assert(result.flexRate >= 0 && result.flexRate <= 100, 'Policy pipeline should keep flex rate bounded');
    assert(Number.isFinite(state.flexBudgetBalanceYears), 'Policy pipeline should update flex-budget state');
    assert(decisions.some(d => String(d.step).includes('Flex-Budget')), 'Policy pipeline should log flex-budget decision');
    assertClose(delegated.flexRate, result.flexRate, 0.0001, 'Planner policy-pipeline delegate should match module');
    console.log('✅ Spending policy pipeline delegate works');
}

// --- TEST 10aa: Spending policy pipeline applies minimum flex before budget and final limits ---
{
    const params = getBaseParams();
    params.market.sKey = 'hot_neutral';
    params.inflatedBedarf = { floor: 24000, flex: 20000 };
    params.input = {
        ...params.input,
        floorBedarf: 24000,
        flexBedarf: 20000,
        minimumFlexAnnual: 10000,
        flexBudgetAnnual: 0,
        flexBudgetYears: 0,
        flexBudgetRecharge: 0
    };
    const state = clone(params.lastState);
    state.flexRate = 50;
    state.keyParams.entnahmequoteDepot = CONFIG.THRESHOLDS.CAUTION.withdrawalRate;
    const initialPolicyResult = { geglätteteFlexRate: 20, kuerzungQuelle: 'Profil' };
    const decisions = [];
    const result = applySpendingPolicyPipeline(
        state,
        { active: false, newlyTriggered: false },
        params,
        (step, impact, status, severity = 'info') => decisions.push({ step, impact, status, severity }),
        initialPolicyResult
    );

    assertClose(result.flexRate, 50, 0.0001, 'Minimum flex should lift the pipeline rate before final limits when within max-up');
    assert(state.keyParams.minimumFlexStatus === 'applied', 'Minimum flex status should be applied');
    assertClose(state.keyParams.minimumFlexRequiredRate, 50, 0.0001, 'Pipeline should store minimum flex required rate');
    assert(decisions.some(d => d.step === 'Mindest-Flex'), 'Pipeline should log minimum flex');

    const budgetParams = clone(params);
    budgetParams.market.sKey = 'bear_deep';
    budgetParams.input.flexBudgetAnnual = 6000;
    budgetParams.input.flexBudgetYears = 2;
    const budgetState = clone(params.lastState);
    budgetState.flexRate = 20;
    budgetState.flexBudgetBalanceYears = 2;
    budgetState.keyParams.entnahmequoteDepot = CONFIG.THRESHOLDS.CAUTION.withdrawalRate;
    budgetState.keyParams.realerDepotDrawdown = 0.30;
    const budgetResult = applySpendingPolicyPipeline(
        budgetState,
        { active: false, newlyTriggered: false },
        budgetParams,
        () => {},
        initialPolicyResult
    );
    assert(budgetResult.flexRate < 50, 'Flex-budget/final limits should be allowed to reduce a minimum-flex lift');
    assert(budgetState.keyParams.minimumFlexStatus === 'limited_by_flex_budget', 'Minimum flex should report flex-budget limitation');

    const smoothParams = clone(params);
    smoothParams.input.flexBudgetAnnual = 0;
    const smoothState = clone(params.lastState);
    smoothState.flexRate = 20;
    smoothState.keyParams.entnahmequoteDepot = CONFIG.THRESHOLDS.CAUTION.withdrawalRate;
    const smoothResult = applySpendingPolicyPipeline(
        smoothState,
        { active: false, newlyTriggered: false },
        smoothParams,
        () => {},
        { geglätteteFlexRate: 20, kuerzungQuelle: 'Profil' }
    );
    // 32% = vorher geglättete 20% + max. 12 Prozentpunkte Final-Smoothing-Anstieg.
    assertClose(smoothResult.flexRate, 32, 0.0001, 'Final-rate limits should smooth a large minimum-flex lift');
    assert(
        smoothState.keyParams.minimumFlexStatus === 'applied_limited_by_final_smoothing',
        'Minimum flex should report final smoothing limitation'
    );

    console.log('✅ Spending policy pipeline minimum-flex ordering works');
}

// --- TEST 10ab: Dynamic-Flex Stage 2 safety rate can be lifted by minimum flex ---
{
    const params = getBaseParams();
    params.market.sKey = 'bear_soft';
    params.inflatedBedarf = { floor: 24000, flex: 20000 };
    params.input = {
        ...params.input,
        dynamicFlex: true,
        floorBedarf: 24000,
        flexBedarf: 20000,
        minimumFlexAnnual: 10000,
        flexBudgetAnnual: 0,
        flexBudgetYears: 0,
        flexBudgetRecharge: 0
    };
    const state = clone(params.lastState);
    state.flexRate = 20;
    state.keyParams.entnahmequoteDepot = CONFIG.THRESHOLDS.CAUTION.withdrawalRate;
    const result = applySpendingPolicyPipeline(
        state,
        { active: false, newlyTriggered: false },
        params,
        () => {},
        { geglätteteFlexRate: 20, kuerzungQuelle: 'Dynamic-Flex Safety Stage 2' }
    );

    assert(result.flexRate > 20, 'Minimum flex should lift a low Dynamic-Flex Stage 2 safety rate');
    assertClose(state.keyParams.minimumFlexRequiredRate, 50, 0.0001, 'Stage 2 scenario should compute the minimum-flex rate');
    assert(
        ['applied', 'applied_limited_by_final_smoothing'].includes(state.keyParams.minimumFlexStatus),
        'Stage 2 scenario should expose an applied minimum-flex status'
    );
    console.log('✅ Dynamic-Flex Stage 2 minimum-flex interaction works');
}

// --- TEST 10b: Final withdrawal helper quantizes and derives effective flex ---
{
    const result = calculateFinalWithdrawal({ floor: 24000, flex: 24000 }, 51, true);
    const delegated = SpendingPlanner._calculateFinalWithdrawal({ floor: 24000, flex: 24000 }, 51);

    assertClose(result.endgueltigeEntnahme, 36000, 0.0001, 'Final withdrawal should quantize monthly amount down');
    assertClose(result.flexRate, 50, 0.0001, 'Final withdrawal should derive effective flex rate after quantization');
    assertClose(delegated.endgueltigeEntnahme, result.endgueltigeEntnahme, 0.0001, 'Planner final-withdrawal delegate should match helper');
    console.log('✅ Final withdrawal helper works');
}

// --- TEST 10c: Alarm + Flex-Budget + Final-Limits interaction ---
{
    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.market.abstandVomAthProzent = 35;
    params.runwayMonate = 6;
    params.lastState.flexRate = 100;
    params.lastState.alarmActive = false;
    params.lastState.keyParams.entnahmequoteDepot = 0.10;
    params.lastState.keyParams.realerDepotDrawdown = 0.40;
    params.inflatedBedarf = { floor: 24000, flex: 24000 };
    params.renteJahr = 0;
    params.depotwertGesamt = 300000;
    params.gesamtwert = 310000;
    params.input = {
        ...params.input,
        floorBedarf: 24000,
        flexBedarf: 24000,
        flexBudgetAnnual: 6000,
        flexBudgetYears: 2,
        flexBudgetRecharge: 0
    };

    const result = SpendingPlanner.determineSpending(params);
    const flexRate = result.spendingResult.details.flexRate;
    const decisionSteps = result.diagnosis.decisionTree.map(d => d.step);

    assert(result.diagnosis.general.alarmActive === true, 'Alarm should be active in this scenario');
    assert(decisionSteps.includes('Flex-Budget (Cap)'), 'Flex-Budget cap should be applied in decision tree');
    assert(
        result.spendingResult.kuerzungQuelle.includes('Final-Guardrail') ||
        result.spendingResult.kuerzungQuelle.includes('Glättung'),
        'Final limits should cap the extreme cut'
    );
    assert(flexRate >= 85 && flexRate <= 100, `Final flex rate should be limited by final caps (got ${flexRate})`);

    console.log('✅ Alarm + Flex-Budget + Final-Limits interaction works');
}

console.log('--- SpendingPlanner Tests Completed ---');
