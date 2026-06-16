import {
    LONGEVITY_DEFAULTS,
    LONGEVITY_LIMITS,
    LONGEVITY_MODES,
    LONGEVITY_TRANSITION_SMOOTHING,
    describeLongevityHouseholdApplication,
    isValidLongevityMode,
    normalizeLongevityMode,
    shouldSmoothJointToSingleTransition,
    validateLongevitySettings
} from '../app/simulator/dynamic-flex-longevity-contract.js';

console.log('--- Longevity Contract Tests ---');

// Test 1: V1 default remains backwards-compatible.
{
    assertEqual(LONGEVITY_DEFAULTS.mode, 'none', 'longevity default mode should remain none for compatibility');
    assertEqual(LONGEVITY_DEFAULTS.householdApplication, 'final_household_horizon_once', 'household application contract should be explicit');
    assertEqual(LONGEVITY_DEFAULTS.maxHorizonYears, 60, 'longevity contract should preserve max horizon 60');
}

// Test 2: Supported modes are explicit and unknown modes normalize to none.
{
    ['none', 'quantile_shift', 'relative_horizon_buffer', 'buffer_years'].forEach(mode => {
        assert(LONGEVITY_MODES.includes(mode), `${mode} should be listed as supported`);
        assert(isValidLongevityMode(mode), `${mode} should validate`);
        assertEqual(normalizeLongevityMode(mode), mode, `${mode} should normalize to itself`);
    });
    assertEqual(normalizeLongevityMode('cohort_table'), 'none', 'unknown mode should normalize to none in V1');
}

// Test 3: Numeric limits match the reviewed V1 contract.
{
    assertEqual(LONGEVITY_LIMITS.quantileShiftMax, 0.10, 'quantile shift max should be 0.10');
    assertEqual(LONGEVITY_LIMITS.relativePctMax, 0.20, 'relative pct max should be 0.20');
    assertEqual(LONGEVITY_LIMITS.bufferYearsMax, 10, 'buffer years max should be 10');
    assertEqual(LONGEVITY_DEFAULTS.maxShiftedQuantile, 0.95, 'shifted quantile should cap at 0.95');
}

// Test 4: Validation rejects invalid modes, out-of-range values and decimal buffer years.
{
    const invalid = validateLongevitySettings({
        longevityMode: 'cohort_table',
        longevityQuantileShift: 0.2,
        longevityRelativePct: -0.01,
        longevityBufferYears: 2.5
    });
    const fields = invalid.errors.map(err => err.fieldId);
    assertEqual(invalid.valid, false, 'invalid settings should fail validation');
    assert(fields.includes('longevityMode'), 'invalid mode should be reported');
    assert(fields.includes('longevityQuantileShift'), 'invalid quantile shift should be reported');
    assert(fields.includes('longevityRelativePct'), 'invalid relative pct should be reported');
    assert(fields.includes('longevityBufferYears'), 'decimal buffer years should be reported');
}

// Test 5: Pair logic applies the adjustment once to the final household horizon.
{
    const single = describeLongevityHouseholdApplication({ hasPartner: false });
    const pair = describeLongevityHouseholdApplication({ hasPartner: true });
    assertEqual(single.applyPerPerson, false, 'single contract should not apply per person');
    assertEqual(pair.applyPerPerson, false, 'pair contract should not apply per person');
    assertEqual(pair.applyAfterJointHorizon, true, 'pair contract should apply after joint horizon derivation');
    assertEqual(pair.applyCount, 1, 'pair contract should apply longevity exactly once');
}

// Test 6: Joint-to-single transition smoothing has a concrete trigger and ramp.
{
    assertEqual(LONGEVITY_TRANSITION_SMOOTHING.mode, 'linear_horizon_floor', 'transition smoothing mode should be concrete');
    assertEqual(LONGEVITY_TRANSITION_SMOOTHING.rampYears, 3, 'transition smoothing ramp should be 3 years');
    assertEqual(
        shouldSmoothJointToSingleTransition({ previousHorizon: 34, nextRawHorizon: 30 }),
        true,
        'drop above 3 years should trigger smoothing'
    );
    assertEqual(
        shouldSmoothJointToSingleTransition({ previousHorizon: 33, nextRawHorizon: 30 }),
        false,
        'drop of exactly 3 years should not trigger smoothing'
    );
}

console.log('--- Longevity Contract Tests Completed ---');
