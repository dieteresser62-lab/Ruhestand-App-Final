import {
    deriveCAPEContinuousReturn,
    deriveCAPELegacyStepReturn,
    deriveVpwExpectedRealReturn,
    normalizeVpwReturnPolicyOptions
} from '../engine/planners/vpw-return-policy.mjs';

console.log('--- VPW Return Policy Tests ---');

const baseContinuous = {
    returnPolicy: 'cape_continuous',
    targetEq: 60,
    goldAktiv: false
};

// Test 1: policy option normalization keeps legacy as the explicit default.
{
    const normalizedDefault = normalizeVpwReturnPolicyOptions({});
    const normalizedContinuous = normalizeVpwReturnPolicyOptions({ returnPolicy: 'cape_continuous' });
    const normalizedUnknown = normalizeVpwReturnPolicyOptions({ returnPolicy: 'unknown' });

    assertEqual(normalizedDefault.returnPolicy, 'legacy_step', 'legacy_step should remain the default policy');
    assertEqual(normalizedContinuous.returnPolicy, 'cape_continuous', 'cape_continuous should be accepted explicitly');
    assertEqual(normalizedUnknown.returnPolicy, 'legacy_step', 'unknown policy should fallback to legacy_step');
}

// Test 2: continuous CAPE curve covers requested reference CAPEs.
{
    const expected = [
        [10, 0.05],
        [15, 0.05],
        [20, 0.041],
        [25, 0.035],
        [30, 0.031],
        [35, 0.028142857142857143],
        [45, 0.024333333333333332]
    ];

    for (const [cape, expectedRealReturn] of expected) {
        const result = deriveCAPEContinuousReturn(cape, baseContinuous);
        assertEqual(result.returnPolicy, 'cape_continuous', `CAPE ${cape} should use continuous policy`);
        assertEqual(result.capeInputStatus, 'valid', `CAPE ${cape} should be valid`);
        assertClose(result.expectedRealReturn, expectedRealReturn, 1e-12, `CAPE ${cape} expected return mismatch`);
        assertEqual(result.safeRealReturnSource, 'config_dynamic_flex', `CAPE ${cape} should use dynamic-flex safe return`);
    }
}

// Test 3: higher CAPE must not produce higher expected return.
{
    const capes = [10, 15, 20, 25, 30, 35, 45];
    const returns = capes.map((cape) => deriveCAPEContinuousReturn(cape, baseContinuous).expectedRealReturn);

    for (let i = 1; i < returns.length; i += 1) {
        assert(
            returns[i] <= returns[i - 1],
            `CAPE ${capes[i]} should not exceed CAPE ${capes[i - 1]} return`
        );
    }
    assert(returns[0] > returns[2], 'CAPE 10 should exceed CAPE 20 despite low-CAPE clamp plateau');
    assert(returns[2] > returns[5], 'CAPE 20 should exceed CAPE 35');
}

// Test 4: missing and invalid CAPE values fallback to DEFAULT_CAPE without crashing.
{
    const fallbackExpected = deriveCAPEContinuousReturn(20, baseContinuous).expectedRealReturn;
    const cases = [
        [null, 'fallback_missing'],
        [undefined, 'fallback_missing'],
        [NaN, 'fallback_invalid'],
        [Infinity, 'fallback_invalid'],
        [0, 'fallback_invalid'],
        [-5, 'fallback_invalid'],
        [101, 'fallback_invalid'],
        ['abc', 'fallback_invalid']
    ];

    for (const [cape, status] of cases) {
        const result = deriveCAPEContinuousReturn(cape, baseContinuous);
        assertEqual(result.capeInputStatus, status, `CAPE ${String(cape)} fallback status mismatch`);
        assertEqual(result.expectedReturnSource, 'fallback', `CAPE ${String(cape)} should mark fallback source`);
        assertEqual(result.capeRatioUsed, 20, `CAPE ${String(cape)} should use DEFAULT_CAPE`);
        assertClose(result.expectedRealReturn, fallbackExpected, 1e-12, `CAPE ${String(cape)} fallback return mismatch`);
    }
}

// Test 5: equity and portfolio clamps are separate and transparent.
{
    const result = deriveCAPEContinuousReturn(5, {
        ...baseContinuous,
        targetEq: 100,
        safeRealReturn: 0
    });

    assertClose(result.rawEquityRealReturn, 0.215, 1e-12, 'raw equity return should expose unclamped CAPE yield plus premium');
    assertClose(result.equityRealReturn, 0.08, 1e-12, 'equity return should clamp before portfolio mix');
    assertClose(result.expectedRealReturnRaw, 0.08, 1e-12, 'portfolio raw return should use clamped equity return');
    assertClose(result.expectedRealReturnClamped, 0.07, 1e-12, 'portfolio return should clamp at CAPE_CONTINUOUS max');
    assertEqual(result.clamped, true, 'clamped flag should be true when either clamp applies');
    assertEqual(result.safeRealReturnSource, 'context', 'explicit safeRealReturn should be reported as context source');
}

// Test 6: deriveVpwExpectedRealReturn dispatches by policy.
{
    const continuous = deriveVpwExpectedRealReturn({ ...baseContinuous, capeRatio: 30 });
    const continuousAlias = deriveVpwExpectedRealReturn({
        ...baseContinuous,
        capeRatio: 0,
        marketCapeRatio: 30
    });
    const legacy = deriveVpwExpectedRealReturn({
        returnPolicy: 'legacy_step',
        expectedReturnCape: 0.05,
        inflation: 2,
        targetEq: 60
    });

    assertEqual(continuous.returnPolicy, 'cape_continuous', 'dispatcher should route continuous policy');
    assertClose(continuousAlias.expectedRealReturn, continuous.expectedRealReturn, 1e-12, 'dispatcher should preserve CAPE alias fallback');
    assertEqual(legacy.returnPolicy, 'legacy_step', 'dispatcher should route legacy policy');
}

// Test 7: legacy policy mirrors the current dynamic-flex real-return formula.
{
    const result = deriveCAPELegacyStepReturn({
        expectedReturnCape: 0.05,
        inflation: 2,
        targetEq: 60,
        goldAktiv: false
    });

    assertEqual(result.expectedReturnSource, 'legacy_cape_step', 'legacy source should identify CAPE step input');
    assertClose(result.expectedRealReturnRaw, 0.02, 1e-12, 'legacy raw return should match current formula');
    assertClose(result.expectedRealReturn, 0.02, 1e-12, 'legacy return should remain unclamped for normal case');
    assertEqual(result.safeRealReturnSource, 'config_dynamic_flex', 'legacy safe return should come from dynamic-flex config');
}

// Test 8: inactive gold must not multiply zero weight with missing gold config.
{
    const result = deriveCAPEContinuousReturn(20, baseContinuous, {
        SPENDING_MODEL: {
            DYNAMIC_FLEX: {
                GOLD_REAL_RETURN: undefined
            }
        }
    });

    assert(Number.isFinite(result.expectedRealReturnRaw), 'missing gold config with inactive gold should not produce NaN raw return');
    assert(Number.isFinite(result.expectedRealReturn), 'missing gold config with inactive gold should not produce NaN return');
    assertEqual(result.goldWeight, 0, 'gold should be inactive in the fixture');
    assertEqual(result.goldContribution, 0, 'inactive gold contribution should be zero');
    assertEqual(result.goldRealReturnSource, 'fallback_zero', 'missing gold config should be diagnosed as fallback_zero');
}

// Test 9: active gold uses its own finite return and contributes separately.
{
    const result = deriveCAPEContinuousReturn(20, {
        ...baseContinuous,
        targetEq: 50,
        goldAktiv: true,
        goldZielProzent: 20,
        goldRealReturn: 0.02
    });

    assertClose(result.equityWeight, 0.5, 1e-12, 'active gold fixture equity weight mismatch');
    assertClose(result.goldWeight, 0.2, 1e-12, 'active gold fixture gold weight mismatch');
    assertClose(result.safeWeight, 0.3, 1e-12, 'active gold fixture safe weight mismatch');
    assertClose(result.equityContribution, 0.0325, 1e-12, 'active gold fixture equity contribution mismatch');
    assertClose(result.goldContribution, 0.004, 1e-12, 'active gold fixture gold contribution mismatch');
    assertClose(result.safeContribution, 0.0015, 1e-12, 'active gold fixture safe contribution mismatch');
    assertClose(result.expectedRealReturn, 0.038, 1e-12, 'active gold fixture expected return mismatch');
    assertEqual(result.goldRealReturnSource, 'context', 'explicit goldRealReturn should be diagnosed as context source');
}

// Test 10: legacy gold path is finite even if dynamic-flex gold config is missing.
{
    const result = deriveCAPELegacyStepReturn({
        expectedReturnCape: 0.05,
        inflation: 2,
        targetEq: 60,
        goldAktiv: true,
        goldZielProzent: 10
    }, {
        SPENDING_MODEL: {
            DYNAMIC_FLEX: {
                GOLD_REAL_RETURN: undefined
            }
        }
    });

    assert(Number.isFinite(result.expectedRealReturnRaw), 'legacy missing gold config should not produce NaN raw return');
    assert(Number.isFinite(result.expectedRealReturn), 'legacy missing gold config should not produce NaN return');
    assertEqual(result.goldRealReturnSource, 'fallback_zero', 'legacy missing gold config should be diagnosed as fallback_zero');
}

console.log('--- VPW Return Policy Tests Completed ---');
