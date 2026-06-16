"use strict";

export const LONGEVITY_MODES = Object.freeze([
    'none',
    'quantile_shift',
    'relative_horizon_buffer',
    'buffer_years'
]);

export const LONGEVITY_DEFAULTS = Object.freeze({
    mode: 'none',
    quantileShift: 0.05,
    relativePct: 0.05,
    bufferYears: 2,
    maxShiftedQuantile: 0.95,
    minHorizonYears: 1,
    maxHorizonYears: 60,
    householdApplication: 'final_household_horizon_once'
});

export const LONGEVITY_LIMITS = Object.freeze({
    quantileShiftMin: 0,
    quantileShiftMax: 0.10,
    relativePctMin: 0,
    relativePctMax: 0.20,
    bufferYearsMin: 0,
    bufferYearsMax: 10
});

export const LONGEVITY_TRANSITION_SMOOTHING = Object.freeze({
    mode: 'linear_horizon_floor',
    trigger: 'joint_to_single',
    maxUnsmoothedDropYears: 3,
    rampYears: 3
});

export function isValidLongevityMode(mode) {
    return LONGEVITY_MODES.includes(mode);
}

export function normalizeLongevityMode(mode) {
    return isValidLongevityMode(mode) ? mode : LONGEVITY_DEFAULTS.mode;
}

export function validateLongevitySettings(settings = {}) {
    const errors = [];
    const mode = normalizeLongevityMode(settings.longevityMode ?? settings.mode);

    if ((settings.longevityMode ?? settings.mode) != null && !isValidLongevityMode(settings.longevityMode ?? settings.mode)) {
        errors.push({ fieldId: 'longevityMode', message: 'longevityMode ist unbekannt.' });
    }

    const numericChecks = [
        ['longevityQuantileShift', settings.longevityQuantileShift ?? settings.quantileShift, LONGEVITY_LIMITS.quantileShiftMin, LONGEVITY_LIMITS.quantileShiftMax],
        ['longevityRelativePct', settings.longevityRelativePct ?? settings.relativePct, LONGEVITY_LIMITS.relativePctMin, LONGEVITY_LIMITS.relativePctMax],
        ['longevityBufferYears', settings.longevityBufferYears ?? settings.bufferYears, LONGEVITY_LIMITS.bufferYearsMin, LONGEVITY_LIMITS.bufferYearsMax]
    ];

    for (const [fieldId, value, min, max] of numericChecks) {
        if (value == null) continue;
        if (!Number.isFinite(value) || value < min || value > max) {
            errors.push({ fieldId, message: `${fieldId} muss zwischen ${min} und ${max} liegen.` });
        }
    }

    const bufferYears = settings.longevityBufferYears ?? settings.bufferYears;
    if (bufferYears != null && Number.isFinite(bufferYears) && !Number.isInteger(bufferYears)) {
        errors.push({ fieldId: 'longevityBufferYears', message: 'longevityBufferYears muss eine ganze Zahl sein.' });
    }

    return {
        valid: errors.length === 0,
        errors,
        normalized: {
            longevityMode: mode,
            longevityQuantileShift: settings.longevityQuantileShift ?? settings.quantileShift ?? LONGEVITY_DEFAULTS.quantileShift,
            longevityRelativePct: settings.longevityRelativePct ?? settings.relativePct ?? LONGEVITY_DEFAULTS.relativePct,
            longevityBufferYears: settings.longevityBufferYears ?? settings.bufferYears ?? LONGEVITY_DEFAULTS.bufferYears
        }
    };
}

export function describeLongevityHouseholdApplication({ hasPartner = false } = {}) {
    return {
        householdApplication: LONGEVITY_DEFAULTS.householdApplication,
        applyPerPerson: false,
        applyAfterJointHorizon: hasPartner === true,
        applyCount: 1
    };
}

export function shouldSmoothJointToSingleTransition({ previousHorizon, nextRawHorizon }) {
    if (!Number.isFinite(previousHorizon) || !Number.isFinite(nextRawHorizon)) {
        return false;
    }
    return previousHorizon - nextRawHorizon > LONGEVITY_TRANSITION_SMOOTHING.maxUnsmoothedDropYears;
}
