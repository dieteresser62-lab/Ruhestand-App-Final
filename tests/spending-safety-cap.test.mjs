import { SpendingPlanner } from '../engine/planners/SpendingPlanner.mjs';
import { ALARM_WEALTH_SUFFICIENT_FACTOR_THRESHOLD } from '../engine/planners/alarm-policy.mjs';
import { calculateFlexRate } from '../engine/planners/flex-rate-policy.mjs';
import { applySpendingPolicyPipeline } from '../engine/planners/spending-policy-pipeline.mjs';

console.log('--- Spending Safety Cap Tests ---');

const INTERNAL_ANCHOR = 'post_internal_smoothing_and_flex_rate_hard_caps';

function makeState({ drawdown = 0.1, wealthFactor = 1, flexRate = 80 } = {}) {
    return {
        initialized: true,
        flexRate,
        alarmActive: false,
        flexBudgetBalanceYears: 0,
        keyParams: {
            peakRealVermoegen: 1_000_000,
            currentRealVermoegen: 1_000_000 * (1 - drawdown),
            cumulativeInflationFactor: 1,
            entnahmequoteDepot: 0.04,
            realerDepotDrawdown: drawdown,
            wealthReductionFactor: wealthFactor,
            withdrawalBurdenFactor: wealthFactor
        }
    };
}

function makeParams({ sKey = 'bear_deep', minimumFlexAnnual = 30_000 } = {}) {
    return {
        lastState: null,
        market: {
            sKey,
            szenarioText: sKey,
            abstandVomAthProzent: sKey === 'bear_deep' ? 35 : 0
        },
        inflatedBedarf: { floor: 24_000, flex: 60_000 },
        runwayMonate: 60,
        profil: {},
        depotwertGesamt: 900_000,
        gesamtwert: 1_000_000,
        renteJahr: 0,
        input: {
            inflation: 0,
            liquidityRunwayYears: 5,
            floorBedarf: 24_000,
            flexBedarf: 60_000,
            minimumFlexAnnual,
            flexBudgetAnnual: 0,
            flexBudgetYears: 0,
            flexBudgetRecharge: 0,
            budgetInflationBoost: 0,
            endeVJ: 100,
            endeVJ_1: 100,
            endeVJ_2: 100
        }
    };
}

function evidence(source, candidateFlexRatePct) {
    return {
        active: true,
        source,
        candidateFlexRatePct,
        anchorStage: INTERNAL_ANCHOR
    };
}

function runMatrixCell({ sKey, drawdown, wealthFactor, alarmActive }) {
    const state = makeState({ drawdown, wealthFactor });
    const params = makeParams({ sKey });
    params.lastState = state;
    const structuralEvidence = alarmActive
        ? evidence('alarm', 35)
        : (sKey === 'bear_deep' && wealthFactor > 0 ? evidence('bear_deep', 20) : null);
    return applySpendingPolicyPipeline(
        state,
        { active: alarmActive, newlyTriggered: alarmActive },
        params,
        () => {},
        {
            geglätteteFlexRate: structuralEvidence?.candidateFlexRatePct ?? 80,
            kuerzungQuelle: 'beliebiger Anzeigetext',
            safetyEvidence: structuralEvidence
        }
    );
}

// NE-03 truth matrix: only current bear_deep plus strictly more than 25% drawdown may set Flex to zero.
for (const sKey of ['bear_deep', 'side_long']) {
    for (const drawdown of [0.2499, 0.25, 0.2501]) {
        for (const wealthFactor of [0, 1]) {
            for (const alarmActive of [false, true]) {
                const result = runMatrixCell({ sKey, drawdown, wealthFactor, alarmActive });
                const expectedEmergency = sKey === 'bear_deep' && drawdown > 0.25;
                assertEqual(
                    result.severeFlexEmergencyActive,
                    expectedEmergency,
                    `NE-03 gate for ${sKey}, drawdown ${drawdown}, wealthFactor ${wealthFactor}, alarm ${alarmActive}`
                );
                if (expectedEmergency) {
                    assertClose(result.flexRate, 0, 1e-9, 'Active NE-03 gate must force exact zero flex');
                    assertEqual(result.safetyCapSource, 'severe_bear_wealth_emergency', 'Emergency source must be explicit');
                    assertEqual(result.safetyCapAnchorStage, 'post_total_wealth_drawdown_gate', 'Emergency anchor must match source');
                    assertEqual(result.minimumFlexOverrideAllowed, true, 'Emergency must explicitly allow overriding minimum flex');
                } else {
                    assert(result.flexRate > 0, 'Inactive NE-03 gate must not force zero flex');
                }
            }
        }
    }
}

// C-14: alarm suppression and withdrawal burden remain diagnostics only.
{
    const result = runMatrixCell({
        sKey: 'bear_deep',
        drawdown: 0.2501,
        wealthFactor: 0,
        alarmActive: false
    });
    assertEqual(result.severeFlexEmergencyActive, true, 'Emergency remains active with zero withdrawal burden');
    assertEqual(result.alarmActive, false, 'Alarm may remain inactive independently');
    assertEqual(result.alarmWealthSufficient, true, 'Suppressed-alarm diagnostic remains visible');
    assertEqual(result.withdrawalBurdenGateRole, 'diagnostic_only', 'Withdrawal burden must not become a hidden third gate');
}

// S3-05: alarm suppression and its diagnostic share one exported threshold.
{
    assertClose(ALARM_WEALTH_SUFFICIENT_FACTOR_THRESHOLD, 0.5, 1e-12, 'Alarm suppression threshold remains explicit');
    const sufficient = runMatrixCell({
        sKey: 'side_long',
        drawdown: 0.1,
        wealthFactor: ALARM_WEALTH_SUFFICIENT_FACTOR_THRESHOLD - 0.001,
        alarmActive: false
    });
    const insufficient = runMatrixCell({
        sKey: 'side_long',
        drawdown: 0.1,
        wealthFactor: ALARM_WEALTH_SUFFICIENT_FACTOR_THRESHOLD,
        alarmActive: false
    });
    assertEqual(sufficient.alarmWealthSufficient, true, 'Factor below the shared threshold is sufficient');
    assertEqual(insufficient.alarmWealthSufficient, false, 'Factor at the shared strict threshold is not sufficient');
    assertClose(sufficient.alarmWealthSufficientThreshold, 0.5, 1e-12, 'Diagnostic exposes the shared threshold');
}

// Normal safety signal: the 50% policy target retains the configured 10pp
// bear down-limit, so a prior 80% rate reaches 70% this year.
{
    const state = makeState({ drawdown: 0.1, wealthFactor: 1, flexRate: 80 });
    const params = makeParams({ sKey: 'bear_deep' });
    const result = applySpendingPolicyPipeline(
        state,
        { active: false, newlyTriggered: false },
        params,
        () => {},
        {
            geglätteteFlexRate: 20,
            kuerzungQuelle: 'Tiefer Bär',
            safetyEvidence: evidence('bear_deep', 20)
        }
    );
    assertClose(result.safetyCapRawCandidateFlexRatePct, 20, 1e-9, 'Raw structural candidate remains visible');
    assertClose(result.safetyCapFlexRatePct, 50, 1e-9, 'Normal cap respects the minimum-flex lower bound');
    assertClose(result.safetyCapEffectiveFlexRatePct, 70, 1e-9, 'Effective cap retains the configured bear down-limit');
    assertClose(result.flexRate, 70, 1e-9, 'Normal safety target is approached by at most 10pp in this bear year');
    assertEqual(result.safetyCapDeferredByRateLimit, true, 'Diagnosis exposes the rate-limited policy target');
    assertEqual(state.keyParams.minimumFlexStatus, 'applied', 'Normal safety cap must preserve fulfilled minimum flex');
    assertEqual(state.keyParams.minimumFlexFulfilled, true, 'Rate-limited normal cap still fulfils minimum flex');
    assertEqual(state.keyParams.finalLimitingPolicy, 'final_smoothing', 'Final smoothing remains the limiting policy');
}

// S3-01: a normal bear safety target may not bypass MAX_DOWN_IN_BEAR_PP.
{
    const rates = [];
    let previousRate = 100;
    for (let year = 0; year < 4; year += 1) {
        const state = makeState({ drawdown: 0.2, wealthFactor: 1, flexRate: previousRate });
        const result = applySpendingPolicyPipeline(
            state,
            { active: false, newlyTriggered: false },
            makeParams({ sKey: 'bear_deep', minimumFlexAnnual: 0 }),
            () => {},
            {
                geglätteteFlexRate: 24,
                kuerzungQuelle: 'Tiefer Bär',
                safetyEvidence: evidence('bear_deep', 24)
            }
        );
        rates.push(result.flexRate);
        assert(previousRate - result.flexRate <= 10 + 1e-9, 'Normal Safety-Cap must retain the 10pp bear down-limit');
        previousRate = result.flexRate;
    }
    assertEqual(JSON.stringify(rates), JSON.stringify([90, 80, 70, 60]), 'Normal Safety target is approached gradually');
}

// A truly reducing spending guardrail gets its later anchor; inflation-only labels do not count.
{
    const state = makeState({ drawdown: 0.1, wealthFactor: 1, flexRate: 90 });
    state.keyParams.entnahmequoteDepot = 0.06;
    const params = makeParams({ sKey: 'recovery_in_bear' });
    params.market.abstandVomAthProzent = 20;
    params.runwayMonate = 12;
    const result = applySpendingPolicyPipeline(
        state,
        { active: false, newlyTriggered: false },
        params,
        () => {},
        { geglätteteFlexRate: 90, kuerzungQuelle: 'Profil', safetyEvidence: null }
    );
    assertEqual(result.safetyCapSource, 'spending_guardrail', 'Reducing spending guardrail becomes structural source');
    assertEqual(result.safetyCapAnchorStage, 'post_spending_guardrails', 'Spending guardrail uses its own anchor');
    assertEqual(state.keyParams.spendingGuardrailRateCapApplied, true, 'Rate reduction is exposed independently of copy');
}

// A display string alone must never activate the cap.
{
    const params = makeParams({ sKey: 'side_long', minimumFlexAnnual: 0 });
    const leftState = makeState({ drawdown: 0.1, wealthFactor: 0, flexRate: 80 });
    leftState.keyParams.entnahmequoteDepot = 0.01;
    const rightState = JSON.parse(JSON.stringify(leftState));
    const left = applySpendingPolicyPipeline(
        leftState,
        { active: false, newlyTriggered: false },
        params,
        () => {},
        { geglätteteFlexRate: 80, kuerzungQuelle: 'Profil', safetyEvidence: null }
    );
    const right = applySpendingPolicyPipeline(
        rightState,
        { active: false, newlyTriggered: false },
        params,
        () => {},
        { geglätteteFlexRate: 80, kuerzungQuelle: 'Guardrail (frei erfundener Text)', safetyEvidence: null }
    );
    assertEqual(left.safetyCapSource, null, 'No structural evidence means no cap');
    assertEqual(right.safetyCapSource, null, 'Guardrail-looking copy must not activate a cap');
    assertClose(left.flexRate, right.flexRate, 1e-9, 'Changing copy alone must not change the result');
}

// Alarm cut transparency: constant 10pp basis multiplied only by the existing wealth factor.
{
    const state = makeState({ drawdown: 0.2, wealthFactor: 0.5, flexRate: 100 });
    const params = makeParams({ sKey: 'bear_deep' });
    params.lastState = { lastEntnahmeReal: 22_500, cumulativeInflationFactor: 1 };
    params.depotwertGesamt = 900_000;
    const result = calculateFlexRate(
        state,
        { active: true, newlyTriggered: true },
        params,
        () => {}
    );
    assertClose(result.safetyEvidence.baseAlarmCutPct, 10, 1e-9, 'Alarm exposes the honest constant base cut');
    assertClose(result.safetyEvidence.effectiveAlarmCutPct, 5, 1e-9, 'Alarm exposes base cut times wealth factor');
    assertClose(result.geglätteteFlexRate, 95, 1e-9, 'Effective 5pp cut is applied to the prior rate');
}

// Missing/non-finite drawdown must stop fail-closed.
for (const invalidDrawdown of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
    const state = makeState();
    state.keyParams.realerDepotDrawdown = invalidDrawdown;
    let error = null;
    try {
        applySpendingPolicyPipeline(
            state,
            { active: false, newlyTriggered: false },
            makeParams({ sKey: 'bear_deep' }),
            () => {},
            { geglätteteFlexRate: 80, kuerzungQuelle: 'Profil', safetyEvidence: null }
        );
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof RangeError, `Invalid drawdown ${String(invalidDrawdown)} must fail closed`);
}

// A finite negative raw ratio means the current real wealth is above the
// previously stored peak before that peak is updated. It is a 0% drawdown.
{
    const state = makeState({ drawdown: -0.1 });
    const result = applySpendingPolicyPipeline(
        state,
        { active: false, newlyTriggered: false },
        makeParams({ sKey: 'bear_deep' }),
        () => {},
        { geglätteteFlexRate: 80, kuerzungQuelle: 'Profil', safetyEvidence: null }
    );
    assertClose(result.realTotalWealthDrawdownRatio, 0, 1e-12, 'Above-peak wealth normalizes to zero drawdown');
    assert(result.severeFlexEmergencyActive === false, 'Above-peak wealth cannot activate the emergency gate');
}

// S3-07: the Planner preserves the finite raw above-peak ratio for its other
// consumers; only the severe gate normalizes it to semantic zero.
{
    const result = SpendingPlanner.determineSpending({
        lastState: {
            initialized: true,
            flexRate: 80,
            alarmActive: false,
            peakRealVermoegen: 1_000_000,
            cumulativeInflationFactor: 1,
            lastEntnahmeReal: 30_000,
            lastMarketSKey: 'side_long',
            lastTotalBudget: 84_000
        },
        market: { sKey: 'side_long', szenarioText: 'Seitwärts', abstandVomAthProzent: 0 },
        inflatedBedarf: { floor: 24_000, flex: 60_000 },
        runwayMonate: 60,
        profil: {},
        depotwertGesamt: 1_100_000,
        gesamtwert: 1_100_000,
        renteJahr: 0,
        input: makeParams({ sKey: 'side_long' }).input
    });
    assert(result.spendingResult.details.realerDepotDrawdown < 0, 'Planner retains the finite raw above-peak ratio');
    assertClose(result.diagnosis.general.realTotalWealthDrawdownRatio, 0, 1e-12, 'Severe gate alone normalizes above-peak ratio to zero');
    assertClose(result.newState.peakRealVermoegen, 1_100_000, 1e-9, 'New real wealth high updates the persistent peak');
}

// S3-08: real evidence generation, not handcrafted evidence, must distinguish
// a positive bear raw cut from a binding Flex-rate hard cap.
{
    const bearState = makeState({ drawdown: 0.2, wealthFactor: 1, flexRate: 30 });
    const bearParams = makeParams({ sKey: 'bear_deep', minimumFlexAnnual: 0 });
    bearParams.lastState = { lastEntnahmeReal: 84_000, cumulativeInflationFactor: 1 };
    const bearResult = calculateFlexRate(
        bearState,
        { active: false, newlyTriggered: false },
        bearParams,
        () => {}
    );
    assertEqual(bearResult.safetyEvidence.positiveBearDeepRawCut, true, 'Real producer detects the positive bear raw cut');
    assertEqual(bearResult.safetyEvidence.source, 'bear_deep', 'Real producer exposes bear_deep when no hard cap binds');

    const hardCapState = makeState({ drawdown: 0.2, wealthFactor: 1, flexRate: 100 });
    const hardCapParams = makeParams({ sKey: 'bear_deep', minimumFlexAnnual: 0 });
    hardCapParams.inflatedBedarf = { floor: 80_000, flex: 20_000 };
    hardCapParams.input.floorBedarf = 80_000;
    hardCapParams.input.flexBedarf = 20_000;
    hardCapParams.lastState = { lastEntnahmeReal: 100_000, cumulativeInflationFactor: 1 };
    const hardCapResult = calculateFlexRate(
        hardCapState,
        { active: false, newlyTriggered: false },
        hardCapParams,
        () => {}
    );
    assertEqual(hardCapResult.safetyEvidence.flexRateHardCapApplied, true, 'Real producer detects a binding Flex-rate hard cap');
    assertEqual(hardCapResult.safetyEvidence.source, 'flex_rate_hard_cap', 'Binding hard cap wins the real evidence source');
    assertEqual(hardCapResult.safetyEvidence.flexRateHardCapSource, 'bear_deep_max_rate', 'Hard-cap subtype remains explicit');
}

// C-16: the deliberately binary threshold is visible as 0 -> normal -> 0 over three years.
{
    const input = {
        inflation: 0,
        liquidityRunwayYears: 5,
        floorBedarf: 24_000,
        flexBedarf: 60_000,
        minimumFlexAnnual: 30_000,
        flexBudgetAnnual: 0,
        flexBudgetYears: 0,
        flexBudgetRecharge: 0,
        budgetInflationBoost: 0,
        endeVJ: 100,
        endeVJ_1: 100,
        endeVJ_2: 100
    };
    let lastState = {
        initialized: true,
        flexRate: 100,
        alarmActive: false,
        peakRealVermoegen: 1_000_000,
        cumulativeInflationFactor: 1,
        lastEntnahmeReal: 10_000,
        lastMarketSKey: 'bear_deep',
        lastTotalBudget: 84_000
    };
    const rates = [];
    const fulfilled = [];
    for (const drawdown of [0.253, 0.245, 0.253]) {
        const totalWealth = 1_000_000 * (1 - drawdown);
        const result = SpendingPlanner.determineSpending({
            lastState,
            market: { sKey: 'bear_deep', szenarioText: 'Tiefer Bär', abstandVomAthProzent: 35 },
            inflatedBedarf: { floor: 24_000, flex: 60_000 },
            runwayMonate: 60,
            profil: {},
            depotwertGesamt: totalWealth,
            gesamtwert: totalWealth,
            renteJahr: 0,
            input
        });
        rates.push(result.spendingResult.details.flexRate);
        fulfilled.push(result.spendingResult.details.minimumFlexFulfilled);
        lastState = result.newState;
    }
    assertClose(rates[0], 0, 1e-9, '25.3% drawdown activates zero flex');
    assert(rates[1] >= 50, '24.5% drawdown returns to at least the applicable minimum-flex rate');
    assertEqual(fulfilled[1], true, 'Middle year fulfils minimum flex instead of accepting any positive rate');
    assertClose(rates[2], 0, 1e-9, '25.3% drawdown reactivates zero flex');
}

// S3-06: a continuing severe gate stays at zero even though its output must
// not become the smoothing anchor for later recovery.
{
    const input = makeParams({ sKey: 'bear_deep' }).input;
    let lastState = {
        initialized: true,
        flexRate: 100,
        alarmActive: false,
        peakRealVermoegen: 1_000_000,
        cumulativeInflationFactor: 1,
        lastEntnahmeReal: 60_000,
        lastMarketSKey: 'bear_deep',
        lastTotalBudget: 84_000
    };
    const rates = [];
    const smoothingReferences = [];
    const diagnosedReferences = [];
    for (let year = 0; year < 8; year += 1) {
        const result = SpendingPlanner.determineSpending({
            lastState,
            market: { sKey: 'bear_deep', szenarioText: 'Tiefer Bär', abstandVomAthProzent: 35 },
            inflatedBedarf: { floor: 24_000, flex: 60_000 },
            runwayMonate: 60,
            profil: {},
            depotwertGesamt: 700_000,
            gesamtwert: 700_000,
            renteJahr: 0,
            input
        });
        rates.push(result.spendingResult.details.flexRate);
        smoothingReferences.push(result.newState.flexRateSmoothingReference);
        diagnosedReferences.push(result.spendingResult.details.nextFlexRateSmoothingReferencePct);
        lastState = result.newState;
    }
    const recovery = SpendingPlanner.determineSpending({
        lastState,
        market: { sKey: 'side_long', szenarioText: 'Seitwärts', abstandVomAthProzent: 10 },
        inflatedBedarf: { floor: 24_000, flex: 60_000 },
        runwayMonate: 60,
        profil: {},
        depotwertGesamt: 900_000,
        gesamtwert: 900_000,
        renteJahr: 0,
        input
    });
    assert(rates.every(rate => rate === 0), 'Persistent severe gate remains zero for every active year');
    assert(smoothingReferences.every(rate => rate >= 50), 'Emergency zero never erodes the recovery anchor below applicable minimum flex');
    assertEqual(JSON.stringify(diagnosedReferences), JSON.stringify(smoothingReferences), 'Diagnosed and persisted smoothing anchors stay identical');
    assert(recovery.spendingResult.details.flexRate >= 50, 'Recovery after eight severe years immediately restores applicable minimum flex');
    assertEqual(recovery.spendingResult.details.minimumFlexFulfilled, true, 'Recovery after persistent severe years fulfils minimum flex');
}

// S3-02: one severe year must not cause multi-year minimum-flex shortfalls
// after the market and total-wealth drawdown recover.
{
    const input = makeParams({ sKey: 'bear_deep' }).input;
    let lastState = {
        initialized: true,
        flexRate: 100,
        alarmActive: false,
        peakRealVermoegen: 1_000_000,
        cumulativeInflationFactor: 1,
        lastEntnahmeReal: 60_000,
        lastMarketSKey: 'bear_deep',
        lastTotalBudget: 84_000
    };
    const years = [
        { sKey: 'bear_deep', drawdown: 0.30, gap: 35 },
        { sKey: 'side_long', drawdown: 0.10, gap: 10 },
        { sKey: 'side_long', drawdown: 0.05, gap: 5 },
        { sKey: 'peak_hot', drawdown: 0, gap: 0 }
    ];
    const results = [];
    for (const year of years) {
        const totalWealth = 1_000_000 * (1 - year.drawdown);
        const result = SpendingPlanner.determineSpending({
            lastState,
            market: { sKey: year.sKey, szenarioText: year.sKey, abstandVomAthProzent: year.gap },
            inflatedBedarf: { floor: 24_000, flex: 60_000 },
            runwayMonate: 60,
            profil: {},
            depotwertGesamt: totalWealth,
            gesamtwert: totalWealth,
            renteJahr: 0,
            input
        });
        results.push(result);
        lastState = result.newState;
    }
    assertClose(results[0].spendingResult.details.flexRate, 0, 1e-9, 'Severe year intentionally sets zero flex');
    for (const result of results.slice(1)) {
        assert(result.spendingResult.details.flexRate >= 50, 'Every recovered year immediately restores at least minimum flex');
        assertEqual(result.spendingResult.details.minimumFlexFulfilled, true, 'Every recovered year fulfils minimum flex');
    }
}

console.log('--- Spending Safety Cap Tests Completed ---');
