"use strict";

import {
    LONGEVITY_DEFAULTS,
    LONGEVITY_TRANSITION_SMOOTHING,
    normalizeLongevityMode,
    validateLongevitySettings
} from './dynamic-flex-longevity-contract.js';

const MIN_SURVIVAL_QUANTILE = 0.5;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function finiteOrDefault(value, fallback) {
    if (value == null) return fallback;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
}

function clampHorizon(value) {
    return clamp(
        finiteOrDefault(value, LONGEVITY_DEFAULTS.minHorizonYears),
        LONGEVITY_DEFAULTS.minHorizonYears,
        LONGEVITY_DEFAULTS.maxHorizonYears
    );
}

function createBaseDiagnostics({ mode, rawHorizon, effectiveHorizon, survivalQuantile }) {
    return {
        horizonYearsRaw: rawHorizon,
        horizonYears: effectiveHorizon,
        longevityMode: mode,
        longevityApplied: mode !== 'none' && effectiveHorizon > rawHorizon,
        longevityAppliedShift: 0,
        longevityAppliedBufferYears: 0,
        longevityRelativePct: 0,
        longevityClampReason: effectiveHorizon >= LONGEVITY_DEFAULTS.maxHorizonYears && rawHorizon < effectiveHorizon
            ? 'max_horizon'
            : null,
        survivalQuantileRaw: Number.isFinite(survivalQuantile) ? survivalQuantile : null,
        survivalQuantileAdjusted: Number.isFinite(survivalQuantile) ? survivalQuantile : null
    };
}

export function applyLongevityHorizonAdjustment({
    horizonYearsRaw,
    survivalQuantile,
    horizonMethod = 'survival_quantile',
    settings = {},
    recomputeHorizonForQuantile = null
} = {}) {
    const validation = validateLongevitySettings(settings);
    if (!validation.valid) {
        return {
            valid: false,
            errors: validation.errors,
            diagnostics: null
        };
    }

    const normalized = validation.normalized;
    const mode = normalizeLongevityMode(normalized.longevityMode);
    const rawHorizon = clampHorizon(horizonYearsRaw);
    const rawQuantile = finiteOrDefault(survivalQuantile, null);

    if (mode === 'none') {
        return {
            valid: true,
            errors: [],
            diagnostics: createBaseDiagnostics({
                mode,
                rawHorizon,
                effectiveHorizon: rawHorizon,
                survivalQuantile: rawQuantile
            })
        };
    }

    if (mode === 'quantile_shift') {
        const cappedBaseQuantile = Number.isFinite(rawQuantile)
            ? clamp(rawQuantile, MIN_SURVIVAL_QUANTILE, LONGEVITY_DEFAULTS.maxShiftedQuantile)
            : null;
        const shiftedQuantile = Number.isFinite(cappedBaseQuantile)
            ? clamp(
                cappedBaseQuantile + normalized.longevityQuantileShift,
                MIN_SURVIVAL_QUANTILE,
                LONGEVITY_DEFAULTS.maxShiftedQuantile
            )
            : null;
        const appliedShift = Number.isFinite(shiftedQuantile) && Number.isFinite(cappedBaseQuantile)
            ? shiftedQuantile - cappedBaseQuantile
            : 0;
        const recomputedHorizon = (
            horizonMethod === 'survival_quantile' &&
            appliedShift > 0 &&
            typeof recomputeHorizonForQuantile === 'function'
        )
            ? recomputeHorizonForQuantile(shiftedQuantile)
            : rawHorizon;
        const effectiveHorizon = Math.max(rawHorizon, clampHorizon(recomputedHorizon));
        const diagnostics = createBaseDiagnostics({
            mode,
            rawHorizon,
            effectiveHorizon,
            survivalQuantile: cappedBaseQuantile
        });
        diagnostics.longevityApplied = appliedShift > 0 && effectiveHorizon > rawHorizon;
        diagnostics.longevityAppliedShift = appliedShift;
        diagnostics.survivalQuantileAdjusted = shiftedQuantile;
        diagnostics.longevityClampReason = appliedShift <= 0 ? 'quantile_cap' : diagnostics.longevityClampReason;
        return { valid: true, errors: [], diagnostics };
    }

    if (mode === 'relative_horizon_buffer') {
        const targetHorizon = rawHorizon * (1 + normalized.longevityRelativePct);
        const effectiveHorizon = clampHorizon(targetHorizon);
        const diagnostics = createBaseDiagnostics({
            mode,
            rawHorizon,
            effectiveHorizon,
            survivalQuantile: rawQuantile
        });
        diagnostics.longevityRelativePct = normalized.longevityRelativePct;
        diagnostics.longevityAppliedBufferYears = Math.max(0, effectiveHorizon - rawHorizon);
        return { valid: true, errors: [], diagnostics };
    }

    if (mode === 'buffer_years') {
        const targetHorizon = rawHorizon + normalized.longevityBufferYears;
        const effectiveHorizon = clampHorizon(targetHorizon);
        const diagnostics = createBaseDiagnostics({
            mode,
            rawHorizon,
            effectiveHorizon,
            survivalQuantile: rawQuantile
        });
        diagnostics.longevityAppliedBufferYears = Math.max(0, effectiveHorizon - rawHorizon);
        return { valid: true, errors: [], diagnostics };
    }

    return {
        valid: true,
        errors: [],
        diagnostics: createBaseDiagnostics({
            mode: 'none',
            rawHorizon,
            effectiveHorizon: rawHorizon,
            survivalQuantile: rawQuantile
        })
    };
}

export function applyLongevityTransitionSmoothing({
    previousHorizon,
    nextRawHorizon,
    yearsSinceTransition = 0
} = {}) {
    const previous = finiteOrDefault(previousHorizon, null);
    const next = finiteOrDefault(nextRawHorizon, null);
    if (!Number.isFinite(previous) || !Number.isFinite(next)) {
        return {
            horizonYears: Number.isFinite(next) ? clampHorizon(next) : null,
            smoothingApplied: false,
            smoothingFloor: null
        };
    }

    const maxDrop = LONGEVITY_TRANSITION_SMOOTHING.maxUnsmoothedDropYears;
    const rampYears = LONGEVITY_TRANSITION_SMOOTHING.rampYears;
    const elapsed = Math.max(0, Math.floor(finiteOrDefault(yearsSinceTransition, 0)));
    const rawDrop = previous - next;
    if (rawDrop <= maxDrop || elapsed >= rampYears) {
        return {
            horizonYears: clampHorizon(next),
            smoothingApplied: false,
            smoothingFloor: null
        };
    }

    const firstFloor = previous - maxDrop;
    const totalFloorDrop = Math.max(0, firstFloor - next);
    const smoothingFloor = firstFloor - (totalFloorDrop * elapsed / rampYears);
    const smoothedHorizon = Math.max(next, smoothingFloor);
    return {
        horizonYears: clampHorizon(smoothedHorizon),
        smoothingApplied: smoothedHorizon > next,
        smoothingFloor: clampHorizon(smoothingFloor)
    };
}
