"use strict";

export const TAIL_RISK_MODEL_EVENT_INJECTION = 'event_injection';

export const TAIL_RISK_LIMITS = Object.freeze({
    ANNUAL_PROBABILITY_PCT: Object.freeze({ min: 0, max: 5 }),
    RETURN_SHOCK_PCT: Object.freeze({ min: -60, max: 0 }),
    INFLATION_SHOCK_PCT: Object.freeze({ min: 0, max: 15 }),
    DURATION_YEARS: Object.freeze({ min: 1, max: 5 }),
    COOLDOWN_YEARS: Object.freeze({ min: 0, max: 20 }),
    HISTORICAL_CRISIS_RETURN_PCT: Object.freeze({ max: -25 }),
    HISTORICAL_CRISIS_INFLATION_PCT: Object.freeze({ min: 8 }),
    EFFECTIVE_RETURN_PCT: Object.freeze({ min: -65 }),
    EFFECTIVE_INFLATION_PCT: Object.freeze({ max: 15 })
});

export const TAIL_RISK_DEFAULT_CONFIG = Object.freeze({
    tailRiskEnabled: false,
    tailRiskModel: TAIL_RISK_MODEL_EVENT_INJECTION,
    tailRiskAnnualProbabilityPct: 0,
    tailRiskReturnShockPct: -35,
    tailRiskInflationShockPct: 6,
    tailRiskDurationYears: 1,
    tailRiskCooldownYears: 10
});

export const TAIL_RISK_HISTORICAL_CRISIS_REGIMES = Object.freeze([
    'bear_deep',
    'crash',
    'stagflation'
]);

function normalizePct(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function normalizeHistoricalReturnPct(yearData = {}) {
    const rendite = Number(yearData.rendite);
    if (Number.isFinite(rendite)) return rendite * 100;

    const percentFields = [
        yearData.returnPct,
        yearData.equityReturnPct,
        yearData.stockReturnPct
    ];
    for (const value of percentFields) {
        const pct = normalizePct(value);
        if (Number.isFinite(pct)) return pct;
    }
    return null;
}

function readFirstFinitePercent(values) {
    for (const value of values) {
        const pct = normalizePct(value);
        if (Number.isFinite(pct)) return pct;
    }
    return null;
}

function readRegimeLabels(yearData = {}, context = {}) {
    const labels = [
        yearData.regime,
        yearData.marketRegime,
        yearData.marketSKey,
        yearData.sKey,
        yearData.stressRegime,
        yearData.market?.sKey,
        context.regime,
        context.marketRegime,
        context.marketSKey,
        context.sKey,
        context.market?.sKey
    ];
    return labels
        .filter(label => typeof label === 'string' && label.trim())
        .map(label => label.trim().toLowerCase());
}

function buildValidationError(fieldId, value, message) {
    return { fieldId, value, message };
}

function normalizeBoundedNumber({
    target,
    errors,
    inputs,
    fieldId,
    defaultValue,
    min,
    max,
    integer = false
}) {
    const raw = inputs[fieldId];
    if (raw === undefined || raw === null || raw === '') {
        target[fieldId] = defaultValue;
        return;
    }

    if (typeof raw === 'boolean') {
        target[fieldId] = defaultValue;
        errors.push(buildValidationError(fieldId, raw, `${fieldId} muss eine Zahl sein, kein Boolean.`));
        return;
    }

    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
        target[fieldId] = defaultValue;
        errors.push(buildValidationError(fieldId, raw, `${fieldId} muss eine endliche Zahl sein.`));
        return;
    }

    if (integer && !Number.isInteger(numeric)) {
        target[fieldId] = defaultValue;
        errors.push(buildValidationError(fieldId, raw, `${fieldId} muss eine ganze Zahl sein.`));
        return;
    }

    if (numeric < min || numeric > max) {
        target[fieldId] = defaultValue;
        errors.push(buildValidationError(fieldId, raw, `${fieldId} muss zwischen ${min} und ${max} liegen.`));
        return;
    }

    target[fieldId] = numeric;
}

export function normalizeTailRiskConfig(inputs = {}) {
    const safeInputs = inputs || {};
    const errors = [];
    const config = {
        tailRiskEnabled: safeInputs.tailRiskEnabled === true,
        tailRiskModel: TAIL_RISK_MODEL_EVENT_INJECTION
    };

    normalizeBoundedNumber({
        target: config,
        errors,
        inputs: safeInputs,
        fieldId: 'tailRiskAnnualProbabilityPct',
        defaultValue: TAIL_RISK_DEFAULT_CONFIG.tailRiskAnnualProbabilityPct,
        min: TAIL_RISK_LIMITS.ANNUAL_PROBABILITY_PCT.min,
        max: TAIL_RISK_LIMITS.ANNUAL_PROBABILITY_PCT.max
    });
    normalizeBoundedNumber({
        target: config,
        errors,
        inputs: safeInputs,
        fieldId: 'tailRiskReturnShockPct',
        defaultValue: TAIL_RISK_DEFAULT_CONFIG.tailRiskReturnShockPct,
        min: TAIL_RISK_LIMITS.RETURN_SHOCK_PCT.min,
        max: TAIL_RISK_LIMITS.RETURN_SHOCK_PCT.max
    });
    normalizeBoundedNumber({
        target: config,
        errors,
        inputs: safeInputs,
        fieldId: 'tailRiskInflationShockPct',
        defaultValue: TAIL_RISK_DEFAULT_CONFIG.tailRiskInflationShockPct,
        min: TAIL_RISK_LIMITS.INFLATION_SHOCK_PCT.min,
        max: TAIL_RISK_LIMITS.INFLATION_SHOCK_PCT.max
    });
    normalizeBoundedNumber({
        target: config,
        errors,
        inputs: safeInputs,
        fieldId: 'tailRiskDurationYears',
        defaultValue: TAIL_RISK_DEFAULT_CONFIG.tailRiskDurationYears,
        min: TAIL_RISK_LIMITS.DURATION_YEARS.min,
        max: TAIL_RISK_LIMITS.DURATION_YEARS.max,
        integer: true
    });
    normalizeBoundedNumber({
        target: config,
        errors,
        inputs: safeInputs,
        fieldId: 'tailRiskCooldownYears',
        defaultValue: TAIL_RISK_DEFAULT_CONFIG.tailRiskCooldownYears,
        min: TAIL_RISK_LIMITS.COOLDOWN_YEARS.min,
        max: TAIL_RISK_LIMITS.COOLDOWN_YEARS.max,
        integer: true
    });

    return {
        ...config,
        tailRiskValidationErrors: errors,
        tailRiskConfigValid: errors.length === 0
    };
}

export function isTailRiskEnabled(config = {}) {
    return config?.tailRiskEnabled === true && Number(config?.tailRiskAnnualProbabilityPct) > 0;
}

export function classifyHistoricalTailRiskCrisisYear(yearData = {}, context = {}) {
    const safeYearData = yearData || {};
    const safeContext = context || {};
    const returnPct = normalizeHistoricalReturnPct(safeYearData);
    const inflationPct = readFirstFinitePercent([
        safeYearData.inflation,
        safeYearData.inflationPct
    ]);
    const regimeLabels = readRegimeLabels(safeYearData, safeContext);
    const reasons = [];

    if (Number.isFinite(returnPct) && returnPct <= TAIL_RISK_LIMITS.HISTORICAL_CRISIS_RETURN_PCT.max) {
        reasons.push('return_threshold');
    }
    if (Number.isFinite(inflationPct) && inflationPct >= TAIL_RISK_LIMITS.HISTORICAL_CRISIS_INFLATION_PCT.min) {
        reasons.push('inflation_threshold');
    }
    if (regimeLabels.some(label => TAIL_RISK_HISTORICAL_CRISIS_REGIMES.includes(label))) {
        reasons.push('regime_label');
    }

    return {
        isHistoricalCrisis: reasons.length > 0,
        reasons,
        returnPct,
        inflationPct,
        regimeLabels
    };
}

export function previewTailRiskOverlay(yearData = {}, configInput = {}, context = {}) {
    const config = normalizeTailRiskConfig(configInput);
    const crisis = classifyHistoricalTailRiskCrisisYear(yearData, context);
    const historicalReturnPct = Number.isFinite(crisis.returnPct) ? crisis.returnPct : 0;
    const historicalInflationPct = Number.isFinite(crisis.inflationPct) ? crisis.inflationPct : 0;

    if (!isTailRiskEnabled(config)) {
        return {
            tailRiskApplied: false,
            tailRiskSkippedReason: config.tailRiskEnabled ? 'probability_zero' : 'disabled',
            historicalReturnPct,
            effectiveReturnPct: historicalReturnPct,
            historicalInflationPct,
            effectiveInflationPct: historicalInflationPct,
            historicalCrisis: crisis.isHistoricalCrisis,
            historicalCrisisReasons: crisis.reasons
        };
    }

    if (crisis.isHistoricalCrisis) {
        return {
            tailRiskApplied: false,
            tailRiskSkippedReason: 'historical_crisis',
            historicalReturnPct,
            effectiveReturnPct: historicalReturnPct,
            historicalInflationPct,
            effectiveInflationPct: historicalInflationPct,
            historicalCrisis: true,
            historicalCrisisReasons: crisis.reasons
        };
    }

    return {
        tailRiskApplied: true,
        tailRiskSkippedReason: null,
        historicalReturnPct,
        effectiveReturnPct: Math.max(
            TAIL_RISK_LIMITS.EFFECTIVE_RETURN_PCT.min,
            historicalReturnPct + config.tailRiskReturnShockPct
        ),
        historicalInflationPct,
        effectiveInflationPct: Math.min(
            TAIL_RISK_LIMITS.EFFECTIVE_INFLATION_PCT.max,
            historicalInflationPct + config.tailRiskInflationShockPct
        ),
        historicalCrisis: false,
        historicalCrisisReasons: []
    };
}

export function validateTailRiskHorizonCompatibility(configInput = {}, horizonYears) {
    const config = normalizeTailRiskConfig(configInput);
    const errors = [...config.tailRiskValidationErrors];
    const horizon = Number(horizonYears);

    if (isTailRiskEnabled(config) && Number.isFinite(horizon)) {
        if (config.tailRiskDurationYears > horizon) {
            errors.push(buildValidationError(
                'tailRiskDurationYears',
                config.tailRiskDurationYears,
                `tailRiskDurationYears darf den Horizont ${horizon} nicht ueberschreiten.`
            ));
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
