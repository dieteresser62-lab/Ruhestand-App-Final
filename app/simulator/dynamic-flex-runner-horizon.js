"use strict";

import {
    estimateJointRemainingLifeYears,
    estimateJointRemainingLifeYearsAtQuantile,
    estimateRemainingLifeYears,
    estimateSingleRemainingLifeYearsAtQuantile
} from './simulator-engine-helpers.js';
import {
    applyLongevityHorizonAdjustment,
    applyLongevityTransitionSmoothing
} from './dynamic-flex-longevity-horizon.js';

const DYNAMIC_FLEX_MIN_HORIZON = 1;
const DYNAMIC_FLEX_MAX_HORIZON = 60;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function finiteOrDefault(value, fallback) {
    if (value == null) return fallback;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeMethod(method) {
    return method === 'mean' ? 'mean' : 'survival_quantile';
}

function resolveHouseholdContext(inputs, context = {}) {
    const yearIndex = Math.max(0, Math.floor(finiteOrDefault(context.yearIndex, 0)));
    const startAgeP1 = finiteOrDefault(inputs?.startAlter, 65);
    const ageP1 = Number.isFinite(context.ageP1) ? context.ageP1 : startAgeP1 + yearIndex;
    const partnerActive = inputs?.partner?.aktiv === true;
    const startAgeP2 = finiteOrDefault(inputs?.partner?.startAlter, ageP1);
    const ageP2 = Number.isFinite(context.ageP2) ? context.ageP2 : startAgeP2 + yearIndex;
    return {
        yearIndex,
        ageP1,
        ageP2,
        genderP1: inputs?.geschlecht || 'm',
        genderP2: inputs?.partner?.geschlecht || ((inputs?.geschlecht || 'm') === 'm' ? 'w' : 'm'),
        p1Alive: context.p1Alive !== false,
        p2Alive: partnerActive && context.p2Alive !== false,
        partnerActive
    };
}

function deriveRawHorizon(inputs, context, quantileOverride = null) {
    const fallback = clamp(
        finiteOrDefault(inputs?.horizonYears, 30),
        DYNAMIC_FLEX_MIN_HORIZON,
        DYNAMIC_FLEX_MAX_HORIZON
    );
    if (inputs?.dynamicFlex !== true) return fallback;

    const method = normalizeMethod(inputs?.horizonMethod);
    const quantile = clamp(
        finiteOrDefault(quantileOverride, finiteOrDefault(inputs?.survivalQuantile, 0.85)),
        0.5,
        0.99
    );
    const household = resolveHouseholdContext(inputs, context);

    if (household.p1Alive && household.p2Alive && household.partnerActive) {
        if (method === 'mean') {
            return clamp(
                estimateJointRemainingLifeYears(
                    household.genderP1,
                    household.ageP1,
                    household.genderP2,
                    household.ageP2
                ),
                DYNAMIC_FLEX_MIN_HORIZON,
                DYNAMIC_FLEX_MAX_HORIZON
            );
        }
        return estimateJointRemainingLifeYearsAtQuantile(
            household.genderP1,
            household.ageP1,
            household.genderP2,
            household.ageP2,
            quantile,
            { minYears: DYNAMIC_FLEX_MIN_HORIZON, maxYears: DYNAMIC_FLEX_MAX_HORIZON }
        );
    }

    if (household.p1Alive) {
        if (method === 'mean') {
            return clamp(
                estimateRemainingLifeYears(household.genderP1, household.ageP1),
                DYNAMIC_FLEX_MIN_HORIZON,
                DYNAMIC_FLEX_MAX_HORIZON
            );
        }
        return estimateSingleRemainingLifeYearsAtQuantile(
            household.genderP1,
            household.ageP1,
            quantile,
            { minYears: DYNAMIC_FLEX_MIN_HORIZON, maxYears: DYNAMIC_FLEX_MAX_HORIZON }
        );
    }

    if (household.p2Alive) {
        if (method === 'mean') {
            return clamp(
                estimateRemainingLifeYears(household.genderP2, household.ageP2),
                DYNAMIC_FLEX_MIN_HORIZON,
                DYNAMIC_FLEX_MAX_HORIZON
            );
        }
        return estimateSingleRemainingLifeYearsAtQuantile(
            household.genderP2,
            household.ageP2,
            quantile,
            { minYears: DYNAMIC_FLEX_MIN_HORIZON, maxYears: DYNAMIC_FLEX_MAX_HORIZON }
        );
    }

    return DYNAMIC_FLEX_MIN_HORIZON;
}

export function resolveDynamicFlexRunnerHorizon(inputs, context = {}) {
    const rawHorizon = deriveRawHorizon(inputs, context);
    const method = normalizeMethod(inputs?.horizonMethod);
    const quantile = clamp(finiteOrDefault(inputs?.survivalQuantile, 0.85), 0.5, 0.99);
    const adjustment = applyLongevityHorizonAdjustment({
        horizonYearsRaw: rawHorizon,
        survivalQuantile: quantile,
        horizonMethod: method,
        settings: inputs,
        recomputeHorizonForQuantile: shiftedQuantile => deriveRawHorizon(inputs, context, shiftedQuantile)
    });

    if (!adjustment.valid) {
        return {
            valid: false,
            errors: adjustment.errors,
            horizonYears: rawHorizon,
            diagnostics: null
        };
    }

    const diagnostics = { ...adjustment.diagnostics };
    let horizonYears = diagnostics.horizonYears;
    if (
        diagnostics.longevityMode !== 'none' &&
        context.applyTransitionSmoothing === true &&
        Number.isFinite(context.previousHorizon) &&
        Number.isFinite(horizonYears)
    ) {
        const smoothing = applyLongevityTransitionSmoothing({
            previousHorizon: context.previousHorizon,
            nextRawHorizon: horizonYears,
            yearsSinceTransition: context.yearsSinceTransition
        });
        if (Number.isFinite(smoothing.horizonYears) && smoothing.horizonYears > horizonYears) {
            horizonYears = smoothing.horizonYears;
            diagnostics.horizonYears = horizonYears;
            diagnostics.longevityTransitionSmoothingApplied = smoothing.smoothingApplied;
            diagnostics.longevityTransitionSmoothingFloor = smoothing.smoothingFloor;
        } else {
            diagnostics.longevityTransitionSmoothingApplied = false;
            diagnostics.longevityTransitionSmoothingFloor = null;
        }
    }

    return {
        valid: true,
        errors: [],
        horizonYears,
        diagnostics
    };
}
