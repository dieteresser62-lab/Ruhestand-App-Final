import {
    applyLongevityHorizonAdjustment,
    applyLongevityTransitionSmoothing
} from '../app/simulator/dynamic-flex-longevity-horizon.js';

console.log('--- Longevity Horizon Tests ---');

// Test 1: mode=none preserves the raw horizon exactly after normal bounds.
{
    const result = applyLongevityHorizonAdjustment({
        horizonYearsRaw: 28,
        survivalQuantile: 0.85,
        settings: { longevityMode: 'none' }
    });
    assertEqual(result.valid, true, 'none mode should be valid');
    assertEqual(result.diagnostics.horizonYearsRaw, 28, 'raw horizon should be exposed');
    assertEqual(result.diagnostics.horizonYears, 28, 'none mode should preserve horizon');
    assertEqual(result.diagnostics.longevityApplied, false, 'none mode should not be applied');
}

// Test 2: quantile_shift caps at 0.95 and reports the actual applied shift.
{
    const result = applyLongevityHorizonAdjustment({
        horizonYearsRaw: 30,
        survivalQuantile: 0.93,
        settings: { longevityMode: 'quantile_shift', longevityQuantileShift: 0.05 },
        recomputeHorizonForQuantile: quantile => 30 + ((quantile - 0.93) * 100)
    });
    assertEqual(result.valid, true, 'quantile shift should be valid');
    assertClose(result.diagnostics.longevityAppliedShift, 0.02, 1e-12, 'shift should be capped at 0.95');
    assertEqual(result.diagnostics.survivalQuantileAdjusted, 0.95, 'adjusted quantile should be capped');
    assertClose(result.diagnostics.horizonYears, 32, 1e-12, 'effective horizon should use recomputed capped quantile');
}

// Test 3: quantile_shift near cap diagnoses a zero applied shift instead of pretending to buffer.
{
    const result = applyLongevityHorizonAdjustment({
        horizonYearsRaw: 34,
        survivalQuantile: 0.95,
        settings: { longevityMode: 'quantile_shift', longevityQuantileShift: 0.05 },
        recomputeHorizonForQuantile: () => 40
    });
    assertEqual(result.diagnostics.longevityAppliedShift, 0, 'max quantile should have no applied shift');
    assertEqual(result.diagnostics.horizonYears, 34, 'zero shift should preserve raw horizon');
    assertEqual(result.diagnostics.longevityClampReason, 'quantile_cap', 'zero shift should be diagnosed as quantile cap');
}

// Test 4: relative_horizon_buffer is monotonic and respects max horizon 60.
{
    const result = applyLongevityHorizonAdjustment({
        horizonYearsRaw: 58,
        survivalQuantile: 0.85,
        settings: { longevityMode: 'relative_horizon_buffer', longevityRelativePct: 0.10 }
    });
    assertEqual(result.diagnostics.horizonYearsRaw, 58, 'raw horizon should be preserved');
    assertEqual(result.diagnostics.horizonYears, 60, 'relative buffer should clamp at max horizon');
    assert(result.diagnostics.horizonYears >= result.diagnostics.horizonYearsRaw, 'buffer should be monotonic');
    assertEqual(result.diagnostics.longevityClampReason, 'max_horizon', 'max clamp should be diagnosed');
}

// Test 5: buffer_years applies an integer year buffer once to the final household horizon.
{
    const result = applyLongevityHorizonAdjustment({
        horizonYearsRaw: 31,
        survivalQuantile: 0.85,
        settings: { longevityMode: 'buffer_years', longevityBufferYears: 2 }
    });
    assertEqual(result.diagnostics.horizonYears, 33, 'fixed buffer should be added once');
    assertEqual(result.diagnostics.longevityAppliedBufferYears, 2, 'applied buffer years should be diagnosed');
}

// Test 6: invalid longevity settings are reported without producing diagnostics.
{
    const result = applyLongevityHorizonAdjustment({
        horizonYearsRaw: 31,
        settings: { longevityMode: 'buffer_years', longevityBufferYears: 2.5 }
    });
    assertEqual(result.valid, false, 'decimal buffer should be invalid');
    assertEqual(result.diagnostics, null, 'invalid settings should not produce diagnostics');
}

// Test 7: transition smoothing limits the first joint-to-single drop to 3 years and ramps out.
{
    const year0 = applyLongevityTransitionSmoothing({
        previousHorizon: 34,
        nextRawHorizon: 28,
        yearsSinceTransition: 0
    });
    const year1 = applyLongevityTransitionSmoothing({
        previousHorizon: 34,
        nextRawHorizon: 28,
        yearsSinceTransition: 1
    });
    const year3 = applyLongevityTransitionSmoothing({
        previousHorizon: 34,
        nextRawHorizon: 28,
        yearsSinceTransition: 3
    });
    assertEqual(year0.horizonYears, 31, 'first transition year should limit drop to 3 years');
    assert(year1.horizonYears < year0.horizonYears, 'smoothing floor should decline over ramp');
    assertEqual(year3.horizonYears, 28, 'smoothing should be inactive after ramp years');
}

console.log('--- Longevity Horizon Tests Completed ---');
