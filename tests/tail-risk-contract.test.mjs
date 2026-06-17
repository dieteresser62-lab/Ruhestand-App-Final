import {
    TAIL_RISK_DEFAULT_CONFIG,
    TAIL_RISK_LIMITS,
    TAIL_RISK_MODEL_EVENT_INJECTION,
    classifyHistoricalTailRiskCrisisYear,
    isTailRiskEnabled,
    normalizeTailRiskConfig,
    previewTailRiskOverlay,
    validateTailRiskHorizonCompatibility
} from '../app/simulator/tail-risk-contract.js';

console.log('--- Tail Risk Contract Tests ---');

{
    const config = normalizeTailRiskConfig();
    assertEqual(config.tailRiskEnabled, false, 'Tail risk should be disabled by default');
    assertEqual(config.tailRiskModel, TAIL_RISK_MODEL_EVENT_INJECTION, 'Version 1 should use event injection');
    assertEqual(config.tailRiskAnnualProbabilityPct, 0, 'Default probability should be zero');
    assertEqual(config.tailRiskReturnShockPct, TAIL_RISK_DEFAULT_CONFIG.tailRiskReturnShockPct, 'Default return shock mismatch');
    assertEqual(config.tailRiskInflationShockPct, TAIL_RISK_DEFAULT_CONFIG.tailRiskInflationShockPct, 'Default inflation shock mismatch');
    assertEqual(config.tailRiskConfigValid, true, 'Default config should be valid');
    assertEqual(isTailRiskEnabled(config), false, 'Zero probability should not enable event creation');
}

{
    const config = normalizeTailRiskConfig({
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 1.5,
        tailRiskReturnShockPct: -35,
        tailRiskInflationShockPct: 6,
        tailRiskDurationYears: 3,
        tailRiskCooldownYears: 10
    });
    assertEqual(config.tailRiskEnabled, true, 'Explicit opt-in should be preserved');
    assertEqual(isTailRiskEnabled(config), true, 'Positive probability with opt-in should enable event creation');
    assertEqual(config.tailRiskConfigValid, true, 'Valid opt-in config should not report errors');
}

{
    const config = normalizeTailRiskConfig({
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 9,
        tailRiskReturnShockPct: -70,
        tailRiskInflationShockPct: 20,
        tailRiskDurationYears: 2.5,
        tailRiskCooldownYears: -1
    });
    const fields = config.tailRiskValidationErrors.map(error => error.fieldId).sort();
    assertEqual(config.tailRiskConfigValid, false, 'Out-of-range user config should be invalid');
    assert(fields.includes('tailRiskAnnualProbabilityPct'), 'Probability above 5% should be reported');
    assert(fields.includes('tailRiskReturnShockPct'), 'Return shock below -60% should be reported');
    assert(fields.includes('tailRiskInflationShockPct'), 'Inflation shock above 15% should be reported');
    assert(fields.includes('tailRiskDurationYears'), 'Non-integer duration should be reported');
    assert(fields.includes('tailRiskCooldownYears'), 'Negative cooldown should be reported');
    assertEqual(config.tailRiskAnnualProbabilityPct, TAIL_RISK_DEFAULT_CONFIG.tailRiskAnnualProbabilityPct, 'Invalid probability should not be silently clamped');
}

{
    const config = normalizeTailRiskConfig({
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: true,
        tailRiskReturnShockPct: false,
        tailRiskDurationYears: true
    });
    const fields = config.tailRiskValidationErrors.map(error => error.fieldId).sort();
    assertEqual(config.tailRiskConfigValid, false, 'Boolean numeric fields should be invalid');
    assert(fields.includes('tailRiskAnnualProbabilityPct'), 'Boolean probability should be reported');
    assert(fields.includes('tailRiskReturnShockPct'), 'Boolean return shock should be reported');
    assert(fields.includes('tailRiskDurationYears'), 'Boolean duration should be reported');
}

{
    assertEqual(TAIL_RISK_LIMITS.HISTORICAL_CRISIS_RETURN_PCT.max, -25, 'Crisis return threshold should be -25%');
    assertEqual(TAIL_RISK_LIMITS.HISTORICAL_CRISIS_INFLATION_PCT.min, 8, 'Crisis inflation threshold should be 8%');
    assertEqual(TAIL_RISK_LIMITS.EFFECTIVE_RETURN_PCT.min, -65, 'Effective return floor should be -65%');
    assertEqual(TAIL_RISK_LIMITS.EFFECTIVE_INFLATION_PCT.max, 15, 'Effective inflation cap should be 15%');
}

{
    const returnCrash = classifyHistoricalTailRiskCrisisYear({ rendite: -0.251, inflation: 2 });
    assertEqual(returnCrash.isHistoricalCrisis, true, 'Return <= -25% should mark historical crisis');
    assert(returnCrash.reasons.includes('return_threshold'), 'Return-threshold reason should be exposed');

    const inflationCrisis = classifyHistoricalTailRiskCrisisYear({ rendite: 0.02, inflation: 8.1 });
    assertEqual(inflationCrisis.isHistoricalCrisis, true, 'Inflation >= 8% should mark historical crisis');
    assert(inflationCrisis.reasons.includes('inflation_threshold'), 'Inflation-threshold reason should be exposed');

    const regimeCrisis = classifyHistoricalTailRiskCrisisYear({ rendite: 0.02, inflation: 2, regime: 'STAGFLATION' });
    assertEqual(regimeCrisis.isHistoricalCrisis, true, 'Known stress regime should mark historical crisis');
    assert(regimeCrisis.reasons.includes('regime_label'), 'Regime-label reason should be exposed');

    const normalYear = classifyHistoricalTailRiskCrisisYear({ rendite: -0.24, inflation: 7.9, regime: 'BEAR' });
    assertEqual(normalYear.isHistoricalCrisis, false, 'Moderate stress below thresholds should remain eligible for overlay');
}

{
    const nearZeroPercent = classifyHistoricalTailRiskCrisisYear({ returnPct: -0.5, inflation: 2 });
    assertEqual(nearZeroPercent.returnPct, -0.5, 'Already-percent return fields near zero should not be multiplied by 100');
    assertEqual(nearZeroPercent.isHistoricalCrisis, false, '-0.5% should not be treated as a -50% crisis');

    const extremeDecimal = classifyHistoricalTailRiskCrisisYear({ rendite: -1.2, inflation: 2 });
    assertEqual(extremeDecimal.returnPct, -120, 'Decimal rendite -1.2 should mean -120%');
    assertEqual(extremeDecimal.isHistoricalCrisis, true, 'Extreme decimal rendite should be a crisis');
}

{
    const yearData = Object.freeze({ jahr: 2001, rendite: -0.24, inflation: 7 });
    const preview = previewTailRiskOverlay(yearData, {
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 5,
        tailRiskReturnShockPct: -50,
        tailRiskInflationShockPct: 12,
        tailRiskDurationYears: 1,
        tailRiskCooldownYears: 0
    });
    assertEqual(preview.tailRiskApplied, true, 'Eligible non-crisis year should receive overlay in preview');
    assertEqual(preview.effectiveReturnPct, -65, 'Effective return should be floored at -65%');
    assertEqual(preview.effectiveInflationPct, 15, 'Effective inflation should be capped at 15%');
    assertEqual(yearData.rendite, -0.24, 'Preview must not mutate historical return input');
    assertEqual(yearData.inflation, 7, 'Preview must not mutate historical inflation input');
}

{
    const skipped = previewTailRiskOverlay({ rendite: -0.251, inflation: 2 }, {
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 5,
        tailRiskReturnShockPct: -35,
        tailRiskInflationShockPct: 6,
        tailRiskDurationYears: 1,
        tailRiskCooldownYears: 0
    });
    assertEqual(skipped.tailRiskApplied, false, 'Historical crisis year should skip additional overlay');
    assertEqual(skipped.tailRiskSkippedReason, 'historical_crisis', 'Skip reason should identify historical crisis');
    assertClose(skipped.effectiveReturnPct, -25.1, 1e-12, 'Skipped crisis year should keep historical return');
}

{
    const config = {
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 5,
        tailRiskReturnShockPct: -35,
        tailRiskInflationShockPct: 6,
        tailRiskDurationYears: 1,
        tailRiskCooldownYears: 0
    };
    const moderateStress = previewTailRiskOverlay({ rendite: -0.24, inflation: 2 }, config);
    const thresholdCrisis = previewTailRiskOverlay({ rendite: -0.251, inflation: 2 }, config);
    assertEqual(moderateStress.tailRiskApplied, true, 'Year just above crisis threshold remains overlay-eligible');
    assertEqual(thresholdCrisis.tailRiskApplied, false, 'Year just below crisis threshold skips overlay');
    assertClose(moderateStress.effectiveReturnPct, -59, 1e-12, 'Klippen-Effekt: -24% plus -35% shock becomes -59%');
    assertClose(thresholdCrisis.effectiveReturnPct, -25.1, 1e-12, 'Klippen-Effekt: -25.1% skips and remains less severe');
    assert(
        moderateStress.effectiveReturnPct < thresholdCrisis.effectiveReturnPct,
        'Contract intentionally exposes non-monotonic skip cliff for review'
    );
}

{
    const compatible = validateTailRiskHorizonCompatibility({
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 1,
        tailRiskDurationYears: 3,
        tailRiskCooldownYears: 10
    }, 20);
    assertEqual(compatible.valid, true, 'Duration + cooldown within horizon should be valid');

    const longCooldown = validateTailRiskHorizonCompatibility({
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 1,
        tailRiskDurationYears: 3,
        tailRiskCooldownYears: 10
    }, 5);
    assertEqual(longCooldown.valid, true, 'Cooldown may extend beyond horizon to force at most one event');

    const incompatible = validateTailRiskHorizonCompatibility({
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 1,
        tailRiskDurationYears: 3,
        tailRiskCooldownYears: 10
    }, 2);
    assertEqual(incompatible.valid, false, 'Duration beyond horizon should be invalid');
    assert(incompatible.errors.some(error => error.fieldId === 'tailRiskDurationYears'), 'Duration horizon error should be explicit');
}

console.log('--- Tail Risk Contract Tests Completed ---');
