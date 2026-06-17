import { EngineAPI } from '../engine/index.mjs';
import { CONFIG } from '../engine/config.mjs';

console.log('--- VPW Dynamic Flex Tests ---');

const baseInput = {
    depotwertAlt: 100000,
    depotwertNeu: 0,
    goldWert: 0,
    tagesgeld: 10000,
    geldmarktEtf: 0,
    inflation: 2.0,
    floorBedarf: 1000,
    flexBedarf: 6000,
    goldAktiv: false,
    goldFloorProzent: 0,
    renteAktiv: false,
    renteMonatlich: 0,
    runwayTargetMonths: 36,
    runwayMinMonths: 24,
    targetEq: 60,
    rebalBand: 5,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    risikoprofil: 'sicherheits-dynamisch',
    endeVJ: 100,
    endeVJ_1: 100,
    endeVJ_2: 100,
    endeVJ_3: 100,
    ath: 100,
    jahreSeitAth: 0
};

function vpwRate(r, n) {
    if (Math.abs(r) < 0.001) return 1 / n;
    return r / (1 - Math.pow(1 + r, -n));
}

// Test 1: dynamicFlex false -> contract ready, no active VPW.
{
    const result = EngineAPI.simulateSingleYear({ ...baseInput, dynamicFlex: false }, null);
    assertEqual(result.ui.vpw.enabled, false, 'dynamicFlex=false should stay disabled');
    assertEqual(result.ui.vpw.status, 'disabled', 'disabled contract status expected');
}

// Test 2: VPW active -> expected formula and flex override.
{
    const input = {
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 20,
        marketCapeRatio: 30, // overvalued => expectedReturnCape 5%
        goGoActive: false
    };
    const result = EngineAPI.simulateSingleYear(input, null);
    const vpw = result.ui.vpw;
    const expectedRealReturn = 0.02; // 60%*(5%-2%) + 40%*0.5%
    const expectedRate = vpwRate(expectedRealReturn, 20);
    const expectedTotal = (110000 * expectedRate);
    const expectedFlex = Math.max(0, expectedTotal - 1000);

    assertEqual(vpw.status, 'active', 'vpw should be active');
    assertEqual(vpw.returnPolicy, 'legacy_step', 'legacy policy should remain the default');
    assertEqual(vpw.expectedReturnSource, 'legacy_cape_step', 'legacy source should identify CAPE step input');
    assertEqual(vpw.gesamtwert, 110000, 'vpw should expose formula basis gesamtwert');
    assertClose(vpw.expectedRealReturn, expectedRealReturn, 1e-9, 'expected real return mismatch');
    assertClose(vpw.vpwRate, expectedRate, 1e-9, 'vpw rate mismatch');
    assertClose(vpw.vpwTotal, expectedTotal, 1e-6, 'vpw total mismatch');
    assertClose(vpw.dynamicFlex, expectedFlex, 1e-6, 'dynamic flex mismatch');
}

// Test 3: Continuous CAPE policy can be activated explicitly via config.
{
    const previousPolicy = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY;
    CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY = 'cape_continuous';
    try {
        const input = {
            ...baseInput,
            dynamicFlex: true,
            horizonYears: 20,
            marketCapeRatio: 20,
            goGoActive: false
        };
        const result = EngineAPI.simulateSingleYear(input, null);
        const vpw = result.ui.vpw;
        const expectedRealReturn = 0.041; // 60%*(1/20 + 1.5%) + 40%*0.5%
        const expectedRate = vpwRate(expectedRealReturn, 20);

        assertEqual(vpw.status, 'active', 'continuous VPW should be active');
        assertEqual(vpw.returnPolicy, 'cape_continuous', 'continuous policy should be exposed in diagnostics');
        assertEqual(vpw.expectedReturnSource, 'cape_continuous', 'continuous source should identify policy input');
        assertEqual(vpw.capeInputStatus, 'valid', 'continuous CAPE input should be valid');
        assertClose(vpw.capePolicyRatioUsed, 20, 1e-12, 'continuous policy should use market CAPE');
        assertClose(vpw.expectedRealReturnBeforeSmoothing, expectedRealReturn, 1e-12, 'continuous raw target mismatch');
        assertClose(vpw.expectedRealReturn, expectedRealReturn, 1e-12, 'first continuous year should not smooth without prior state');
        assertClose(vpw.vpwRate, expectedRate, 1e-12, 'continuous VPW rate mismatch');
        assertEqual(vpw.safeRealReturnSource, 'config_dynamic_flex', 'safe return source should be diagnosed');
    } finally {
        CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY = previousPolicy;
    }
}

// Test 4: Go-Go multiplier beyond contract should fail validation (transparent UX).
{
    const input = {
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 20,
        marketCapeRatio: 20,
        returnPolicy: 'cape_continuous',
        goGoActive: false
    };
    const result = EngineAPI.simulateSingleYear(input, null);
    const vpw = result.ui.vpw;
    const expectedRealReturn = 0.041; // 60%*(1/20 + 1.5%) + 40%*0.5%

    assertEqual(vpw.status, 'active', 'input-scoped continuous VPW should be active');
    assertEqual(vpw.returnPolicy, 'cape_continuous', 'input returnPolicy should reach VPW policy');
    assertEqual(vpw.expectedReturnSource, 'cape_continuous', 'input returnPolicy should select continuous source');
    assertClose(vpw.expectedRealReturn, expectedRealReturn, 1e-12, 'input returnPolicy should produce continuous expected return');
}

// Test 5: Go-Go multiplier beyond contract should fail validation (transparent UX).
{
    const input = {
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 20,
        marketCapeRatio: 30,
        goGoActive: true,
        goGoMultiplier: 2.0
    };
    const result = EngineAPI.simulateSingleYear(input, null);
    assert(result.error, 'goGo multiplier > engine contract should produce validation error');
    assertEqual(result.error.name, 'ValidationError', 'invalid goGo multiplier should be rejected by validator');
}

// Test 6: Real-return clamp lower bound.
{
    const input = {
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 15,
        marketCapeRatio: 35,
        targetEq: 90,
        inflation: 50
    };
    const result = EngineAPI.simulateSingleYear(input, null);
    assertEqual(result.ui.vpw.expectedRealReturn, 0, 'expected real return should clamp at lower bound');
}

// Test 7: Real-return clamp upper bound.
{
    const input = {
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 15,
        marketCapeRatio: 15,
        targetEq: 90,
        inflation: -10
    };
    const result = EngineAPI.simulateSingleYear(input, null);
    assertEqual(result.ui.vpw.expectedRealReturn, 0.05, 'expected real return should clamp at upper bound');
}

// Test 8: Smoothing carries over via state.
{
    const year1 = EngineAPI.simulateSingleYear({
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 20,
        marketCapeRatio: 35, // lower return regime
        targetEq: 60,
        inflation: 2
    }, null);
    const r1 = year1.ui.vpw.expectedRealReturn;

    const year2 = EngineAPI.simulateSingleYear({
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 19,
        marketCapeRatio: 15, // higher return regime
        targetEq: 60,
        inflation: 2
    }, year1.newState);
    const r2 = year2.ui.vpw.expectedRealReturn;

    assert(r2 > r1, 'smoothed return should move upward');
    assert(r2 < 0.038, 'smoothed return should remain below raw target due to smoothing');
}

// Test 9: Shorter horizon should increase VPW rate.
{
    const base = {
        ...baseInput,
        dynamicFlex: true,
        marketCapeRatio: 30,
        goGoActive: false
    };
    const longHorizon = EngineAPI.simulateSingleYear({ ...base, horizonYears: 35 }, null);
    const shortHorizon = EngineAPI.simulateSingleYear({ ...base, horizonYears: 20 }, null);
    assert(shortHorizon.ui.vpw.vpwRate > longHorizon.ui.vpw.vpwRate, 'shorter horizon should produce higher VPW rate');
}

// Test 10: CAPE alias fields should be consistent.
{
    const a = EngineAPI.simulateSingleYear({
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 25,
        capeRatio: 28,
        marketCapeRatio: 0
    }, null);
    const b = EngineAPI.simulateSingleYear({
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 25,
        capeRatio: 0,
        marketCapeRatio: 28
    }, null);
    assertClose(a.ui.vpw.expectedRealReturn, b.ui.vpw.expectedRealReturn, 1e-12, 'cape alias should resolve identically');
    assertClose(a.ui.vpw.dynamicFlex, b.ui.vpw.dynamicFlex, 1e-6, 'cape alias should produce same flex');
}

// Test 11: Go-Go active vs inactive should affect VPW total.
{
    const base = {
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 22,
        marketCapeRatio: 30,
        goGoMultiplier: 1.2
    };
    const off = EngineAPI.simulateSingleYear({ ...base, goGoActive: false }, null);
    const on = EngineAPI.simulateSingleYear({ ...base, goGoActive: true }, null);
    assert(on.ui.vpw.vpwTotal > off.ui.vpw.vpwTotal, 'goGo active should increase VPW total');
}

// Test 12: Smoothing should progress over multiple years.
{
    const y1 = EngineAPI.simulateSingleYear({
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 20,
        marketCapeRatio: 35,
        targetEq: 70
    }, null);
    const y2 = EngineAPI.simulateSingleYear({
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 19,
        marketCapeRatio: 15,
        targetEq: 70
    }, y1.newState);
    const y3 = EngineAPI.simulateSingleYear({
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 18,
        marketCapeRatio: 15,
        targetEq: 70
    }, y2.newState);
    assert(y2.ui.vpw.expectedRealReturn > y1.ui.vpw.expectedRealReturn, 'year 2 should move up');
    assert(y3.ui.vpw.expectedRealReturn >= y2.ui.vpw.expectedRealReturn, 'year 3 should continue towards target');
    assert(y3.ui.vpw.expectedRealReturn <= 0.05, 'smoothing should still obey clamp');
}

// Test 13: Bear scenario should reduce FlexRate below 100 with active VPW.
{
    const bear = EngineAPI.simulateSingleYear({
        ...baseInput,
        dynamicFlex: true,
        horizonYears: 20,
        marketCapeRatio: 32,
        floorBedarf: 24000,
        flexBedarf: 12000,
        endeVJ: 60,
        endeVJ_1: 80,
        endeVJ_2: 100,
        endeVJ_3: 110,
        ath: 120,
        jahreSeitAth: 3
    }, null);
    const flexRate = Number(bear.ui?.spending?.details?.flexRate);
    assert(Number.isFinite(flexRate) && flexRate < 100, 'bear regime should apply flex reduction under VPW path');
}

// Test 14: Safety stage 1 should disable Go-Go after repeated bad years.
{
    const stressInput = {
        ...baseInput,
        depotwertAlt: 250000,
        tagesgeld: 5000,
        floorBedarf: 24000,
        flexBedarf: 12000,
        dynamicFlex: true,
        horizonYears: 25,
        marketCapeRatio: 30,
        goGoActive: true,
        goGoMultiplier: 1.2,
        endeVJ: 60,
        endeVJ_1: 80,
        endeVJ_2: 100,
        endeVJ_3: 110,
        ath: 120,
        jahreSeitAth: 3
    };
    const seededState = {
        initialized: true,
        flexRate: 100,
        alarmActive: false,
        cumulativeInflationFactor: 1,
        peakRealVermoegen: 300000
    };
    const runs = [];
    let state = seededState;
    for (let i = 0; i < 6; i += 1) {
        const yearRun = EngineAPI.simulateSingleYear(stressInput, state);
        runs.push(yearRun);
        state = yearRun.newState;
    }
    const escalated = runs.some((r) => Number(r.newState?.vpwSafetyStage || 0) >= 1);
    assert(escalated, 'safety should escalate to at least stage 1 under sustained stress');
    const suppressionIdx = runs.findIndex((r, i) =>
        i > 0 &&
        Number(runs[i - 1].newState?.vpwSafetyStage || 0) >= 1 &&
        r.ui?.vpw?.goGoSuppressed === true
    );
    assert(suppressionIdx >= 1, 'go-go suppression should apply in the year after safety escalation');
    assertEqual(runs[suppressionIdx].ui.vpw.goGoActive, false, 'go-go should be inactive when suppression is applied');
}

// Test 15: Safety stage 2 should switch Dynamic Flex to static flex.
{
    const stressInput = {
        ...baseInput,
        depotwertAlt: 250000,
        tagesgeld: 5000,
        floorBedarf: 24000,
        flexBedarf: 12000,
        dynamicFlex: true,
        horizonYears: 25,
        marketCapeRatio: 30,
        goGoActive: true,
        goGoMultiplier: 1.2,
        endeVJ: 60,
        endeVJ_1: 80,
        endeVJ_2: 100,
        endeVJ_3: 110,
        ath: 120,
        jahreSeitAth: 3
    };
    const seededState = {
        initialized: true,
        flexRate: 100,
        alarmActive: false,
        cumulativeInflationFactor: 1,
        peakRealVermoegen: 300000
    };
    const runs = [];
    let state = seededState;
    for (let i = 0; i < 8; i += 1) {
        const yearRun = EngineAPI.simulateSingleYear(stressInput, state);
        runs.push(yearRun);
        state = yearRun.newState;
    }
    const hasStageTwo = runs.some((r) => Number(r.newState?.vpwSafetyStage || 0) >= 2);
    assert(hasStageTwo, 'safety should escalate to stage 2 under extended stress');
    const staticFlexIdx = runs.findIndex((r, i) =>
        i > 0 &&
        Number(runs[i - 1].newState?.vpwSafetyStage || 0) >= 2 &&
        r.ui?.vpw?.status === 'safety_static_flex'
    );
    assert(staticFlexIdx >= 1, 'stage 2 should switch to static flex in the following year');
    assertEqual(runs[staticFlexIdx].ui.vpw.enabled, false, 'stage 2 should disable dynamic flex');
    assertEqual(runs[staticFlexIdx].ui.vpw.dynamicFlexSuppressed, true, 'dynamic flex suppression flag should be true');
}

// Test 16: Re-entry from stage 2 to stage 1 should be damped (no full jump-in).
{
    const reentryInput = {
        ...baseInput,
        depotwertAlt: 4000000,
        tagesgeld: 400000,
        floorBedarf: 24000,
        flexBedarf: 12000,
        dynamicFlex: true,
        horizonYears: 24,
        marketCapeRatio: 24,
        goGoActive: true,
        goGoMultiplier: 1.1,
        endeVJ: 110,
        endeVJ_1: 105,
        endeVJ_2: 100,
        endeVJ_3: 95,
        ath: 110,
        jahreSeitAth: 0
    };
    const seededReentryState = {
        initialized: true,
        flexRate: 100,
        alarmActive: false,
        cumulativeInflationFactor: 1,
        peakRealVermoegen: 300000,
        vpwSafetyStage: 1,
        vpwSafetyReentryRemaining: 3
    };
    const reentryRun = EngineAPI.simulateSingleYear(reentryInput, seededReentryState);
    assertEqual(reentryRun.ui.vpw.status, 'active', 'stage 1 should reactivate VPW path');
    assertEqual(reentryRun.ui.vpw.reentryApplied, true, 'first re-entry year should be damped');
    assert(reentryRun.ui.vpw.dynamicFlex < reentryRun.ui.vpw.rawDynamicFlex, 'damped flex should be below raw VPW flex');
}

// Test 16: Stage 2 must not block its own recovery through the static-flex cut.
{
    const recoveryInput = {
        ...baseInput,
        depotwertAlt: 3900000,
        depotwertNeu: 0,
        tagesgeld: 400000,
        goldWert: 100000,
        goldAktiv: true,
        goldZielProzent: 7.5,
        goldFloorProzent: 1,
        goldCost: 100000,
        floorBedarf: 24000,
        flexBedarf: 12000,
        dynamicFlex: true,
        horizonYears: 24,
        marketCapeRatio: 24,
        goGoActive: true,
        goGoMultiplier: 1.1,
        endeVJ: 110,
        endeVJ_1: 105,
        endeVJ_2: 100,
        endeVJ_3: 95,
        ath: 110,
        jahreSeitAth: 0
    };
    let state = {
        initialized: true,
        flexRate: 20,
        alarmActive: false,
        cumulativeInflationFactor: 1,
        peakRealVermoegen: 3000000,
        vpwSafetyStage: 2,
        vpwSafetyRiskStreak: 0,
        vpwSafetyStableStreak: 0,
        vpwSafetyReentryRemaining: 0
    };
    const runs = [];
    for (let i = 0; i < 3; i += 1) {
        const yearRun = EngineAPI.simulateSingleYear(recoveryInput, state);
        runs.push(yearRun);
        state = yearRun.newState;
    }
    assert(runs[0].ui.spending.kuerzungProzent >= 35, 'recovery fixture should retain a high static-flex cut');
    assertEqual(runs[0].newState.vpwSafetyStableStreak, 1, 'healthy stage-2 year should count as stable despite self-imposed cut');
    assertEqual(runs[1].newState.vpwSafetyStage, 1, 'second stable year should de-escalate from stage 2 to stage 1');
    assertEqual(runs[2].ui.vpw.status, 'active', 'stage 1 should reactivate VPW after stage-2 recovery');
}

// Test 17: 3-bucket stage 2 recovery should not be blocked by protected drawdown alone.
{
    const recoveryInput = {
        ...baseInput,
        depotwertAlt: 1900000,
        depotwertNeu: 0,
        tagesgeld: 300000,
        goldWert: 100000,
        goldAktiv: true,
        goldZielProzent: 7.5,
        goldFloorProzent: 1,
        goldCost: 100000,
        floorBedarf: 24000,
        flexBedarf: 12000,
        dynamicFlex: true,
        horizonYears: 24,
        marketCapeRatio: 24,
        goGoActive: true,
        goGoMultiplier: 1.1,
        decumulation: {
            mode: '3_bucket_jilge',
            bondTargetFactor: 5,
            drawdownTrigger: 15,
            bondRefillThreshold: null
        },
        endeVJ: 110,
        endeVJ_1: 105,
        endeVJ_2: 100,
        endeVJ_3: 95,
        ath: 110,
        jahreSeitAth: 0
    };
    let state = {
        initialized: true,
        flexRate: 20,
        alarmActive: false,
        cumulativeInflationFactor: 1,
        peakRealVermoegen: 4000000,
        vpwSafetyStage: 2,
        vpwSafetyRiskStreak: 0,
        vpwSafetyStableStreak: 0,
        vpwSafetyReentryRemaining: 0
    };
    const runs = [];
    for (let i = 0; i < 3; i += 1) {
        const yearRun = EngineAPI.simulateSingleYear(recoveryInput, state);
        runs.push(yearRun);
        state = yearRun.newState;
    }
    assert(runs[0].diagnosis.keyParams.realerDepotDrawdown > 0.25, 'fixture should retain a deep drawdown');
    assert(runs[0].diagnosis.general.runwayMonate >= 24, 'fixture should have sufficient runway');
    assertEqual(runs[0].newState.vpwSafetyStableStreak, 1, '3-bucket protected drawdown should count as stable in stage 2');
    assertEqual(runs[1].newState.vpwSafetyStage, 1, '3-bucket protected drawdown should de-escalate from stage 2');
    assertEqual(runs[2].ui.vpw.status, 'active', 'VPW should reactivate after 3-bucket protected recovery');
}

console.log('--- VPW Dynamic Flex Tests Completed ---');
