/**
 * Module: Auto-Optimize Parameter Registry
 * Purpose: Single production registry for optimizer domains, canonical request
 *          keys, applicability, input mutation, form mapping and fingerprints.
 */
"use strict";

export const AUTO_OPTIMIZE_PARAMETER_FINGERPRINT_VERSION = 'AutoOptimizeParameterFingerprintV1';
export const AUTO_OPTIMIZE_REQUEST_FINGERPRINT_VERSION = 'AutoOptimizeRequestFingerprintV1';

function finiteNumber(value) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
}

function roundedInteger(value) {
    const numberValue = finiteNumber(value);
    return numberValue === null ? null : Math.round(numberValue);
}

function bounded(minimum, maximum) {
    return (value) => {
        const numberValue = finiteNumber(value);
        return numberValue !== null && numberValue >= minimum && numberValue <= maximum;
    };
}

function alwaysApplicable() {
    return true;
}

function dynamicFlexApplicable(inputs) {
    return inputs?.dynamicFlex === true;
}

function survivalQuantileApplicable(inputs) {
    return dynamicFlexApplicable(inputs) && inputs?.horizonMethod === 'survival_quantile';
}

function directHorizonApplicable(inputs) {
    return dynamicFlexApplicable(inputs) && inputs?.horizonMethod === 'direct';
}

function defineParameter({
    label,
    unit,
    requestKey,
    formId,
    domain,
    normalize = finiteNumber,
    applicable = alwaysApplicable,
    readInput,
    applyInput,
    applyForm = null,
    readForm = null,
    verifyForm = null,
    requiredFormIds = null
}) {
    const frozenDomain = Object.freeze({ ...domain });
    return Object.freeze({
        label,
        unit,
        requestKey,
        formId,
        domain: frozenDomain,
        normalize,
        validate: bounded(frozenDomain.min, frozenDomain.max),
        applicable,
        readInput,
        applyInput,
        applyForm,
        readForm: readForm || (({ doc }) => doc?.getElementById?.(formId)?.value),
        verifyForm,
        requiredFormIds: Object.freeze(requiredFormIds || (formId ? [formId] : []))
    });
}

export const AUTO_OPTIMIZE_PARAMETER_REGISTRY = Object.freeze({
    liquidityRunwayYears: defineParameter({
        label: 'Liquiditäts-Runway',
        unit: 'Jahre',
        requestKey: 'liquidityRunwayYears',
        formId: 'liquidityRunwayYears',
        domain: { min: 1, max: 10, step: 0.5 },
        readInput: inputs => inputs?.liquidityRunwayYears,
        applyInput: (inputs, value) => { inputs.liquidityRunwayYears = value; }
    }),
    goldTargetPct: defineParameter({
        label: 'Gold Target',
        unit: '%',
        requestKey: 'goldZielProzent',
        formId: 'goldAllokationProzent',
        domain: { min: 0, max: 50, step: 1 },
        readInput: inputs => inputs?.goldZielProzent,
        applyInput: (inputs, value) => {
            inputs.goldZielProzent = value;
            inputs.goldAktiv = value > 0;
        },
        applyForm: ({ doc, value, dispatchChange }) => {
            const target = doc?.getElementById?.('goldAllokationProzent');
            const active = doc?.getElementById?.('goldAllokationAktiv');
            if (!target || !active) return false;
            target.value = value;
            dispatchChange(target);
            active.value = value > 0 ? 'true' : 'false';
            dispatchChange(active);
            return true;
        },
        verifyForm: ({ doc, value }) => (
            doc?.getElementById?.('goldAllokationAktiv')?.value === (value > 0 ? 'true' : 'false')
        ),
        requiredFormIds: ['goldAllokationProzent', 'goldAllokationAktiv']
    }),
    goldRebalancingBand: defineParameter({
        label: 'Gold-Rebal Band',
        unit: '%',
        requestKey: 'rebalancingBand',
        formId: 'rebalancingBand',
        domain: { min: 0, max: 100, step: 1 },
        readInput: inputs => inputs?.rebalancingBand,
        applyInput: (inputs, value) => { inputs.rebalancingBand = value; }
    }),
    maxSkimPct: defineParameter({
        label: 'Max Skim',
        unit: '%',
        requestKey: 'maxSkimPctOfEq',
        formId: 'maxSkimPctOfEq',
        domain: { min: 0, max: 50, step: 1 },
        readInput: inputs => inputs?.maxSkimPctOfEq,
        applyInput: (inputs, value) => { inputs.maxSkimPctOfEq = value; }
    }),
    maxBearRefillPct: defineParameter({
        label: 'Max Bear Refill',
        unit: '%',
        requestKey: 'maxBearRefillPctOfEq',
        formId: 'maxBearRefillPctOfEq',
        domain: { min: 0, max: 70, step: 1 },
        readInput: inputs => inputs?.maxBearRefillPctOfEq,
        applyInput: (inputs, value) => { inputs.maxBearRefillPctOfEq = value; }
    }),
    horizonYears: defineParameter({
        label: 'VPW Horizon (nur Direct-Request)',
        unit: 'Jahre',
        requestKey: 'horizonYears',
        formId: 'horizonYears',
        domain: { min: 1, max: 60, step: 1 },
        normalize: roundedInteger,
        applicable: directHorizonApplicable,
        readInput: inputs => inputs?.horizonYears,
        applyInput: (inputs, value) => { inputs.horizonYears = value; }
    }),
    survivalQuantile: defineParameter({
        label: 'VPW Quantile',
        unit: '',
        requestKey: 'survivalQuantile',
        formId: 'survivalQuantile',
        domain: { min: 0.5, max: 0.99, step: 0.01 },
        applicable: survivalQuantileApplicable,
        readInput: inputs => inputs?.survivalQuantile,
        applyInput: (inputs, value) => { inputs.survivalQuantile = value; }
    }),
    goGoMultiplier: defineParameter({
        label: 'VPW Go-Go Mult',
        unit: 'x',
        requestKey: 'goGoMultiplier',
        formId: 'goGoMultiplier',
        domain: { min: 1, max: 1.5, step: 0.05 },
        applicable: dynamicFlexApplicable,
        readInput: inputs => inputs?.goGoMultiplier,
        applyInput: (inputs, value) => {
            inputs.goGoMultiplier = value;
            inputs.goGoActive = true;
        },
        applyForm: ({ doc, value, dispatchChange }) => {
            const target = doc?.getElementById?.('goGoMultiplier');
            const active = doc?.getElementById?.('goGoActive');
            if (!target || !active) return false;
            target.value = value;
            dispatchChange(target);
            active.checked = true;
            dispatchChange(active);
            return true;
        },
        verifyForm: ({ doc }) => doc?.getElementById?.('goGoActive')?.checked === true,
        requiredFormIds: ['goGoMultiplier', 'goGoActive']
    })
});

// The direct horizon remains a supported request parameter, but it is not
// offered in the interactive optimizer while the normal form only exposes
// actuarial horizon methods. maxBearRefillPct also remains available for
// explicit legacy roundtrips, but is not an optimization dimension because
// no causal effect on an optimizer KPI can be demonstrated in the runner.
const INTERACTIVE_PARAMETER_KEYS = Object.freeze([
    'liquidityRunwayYears',
    'goldTargetPct',
    'goldRebalancingBand',
    'maxSkimPct',
    'survivalQuantile',
    'goGoMultiplier'
]);

export const AUTO_OPTIMIZE_PARAMETER_OPTIONS = INTERACTIVE_PARAMETER_KEYS.map(key => Object.freeze({
    key,
    label: AUTO_OPTIMIZE_PARAMETER_REGISTRY[key].label
}));

export const AUTO_OPTIMIZE_PARAM_LABELS = Object.freeze(Object.fromEntries(
    Object.entries(AUTO_OPTIMIZE_PARAMETER_REGISTRY).map(([key, definition]) => [key, definition.label])
));

export const AUTO_OPTIMIZE_PARAM_UNITS = Object.freeze(Object.fromEntries(
    Object.entries(AUTO_OPTIMIZE_PARAMETER_REGISTRY).map(([key, definition]) => [key, definition.unit])
));

export const AUTO_OPTIMIZE_PARAM_FORM_IDS = Object.freeze(Object.fromEntries(
    Object.entries(AUTO_OPTIMIZE_PARAMETER_REGISTRY).map(([key, definition]) => [key, definition.formId])
));

export const AUTO_OPTIMIZE_DYNAMIC_FLEX_PARAM_KEYS = new Set([
    'horizonYears',
    'survivalQuantile',
    'goGoMultiplier'
]);

export const AUTO_OPTIMIZE_DYNAMIC_FLEX_MODE_LABELS = {
    inherit: 'Rahmendaten verwenden',
    force_on: 'Dynamic Flex erzwungen EIN',
    force_off: 'Dynamic Flex erzwungen AUS'
};

function parameterError(code, message) {
    const error = new TypeError(message);
    error.code = code;
    return error;
}

function selectedKeys(paramsOrKeys) {
    return Array.isArray(paramsOrKeys)
        ? paramsOrKeys
        : Object.keys(paramsOrKeys || {});
}

export function assertAutoOptimizeParameterSet(paramsOrKeys, baseInputs) {
    for (const key of selectedKeys(paramsOrKeys)) {
        const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[key];
        if (!definition) {
            throw parameterError('AUTO_OPTIMIZE_PARAMETER_UNKNOWN', `Unbekannter Auto-Optimize-Parameter: ${key}.`);
        }
        if (!definition.applicable(baseInputs)) {
            if (key === 'horizonYears') {
                throw parameterError(
                    'AUTO_OPTIMIZE_PARAMETER_NOT_APPLICABLE',
                    'VPW Horizon ist nur bei horizonMethod=direct optimierbar; aktuarische Methoden berechnen den Horizont.'
                );
            }
            throw parameterError(
                'AUTO_OPTIMIZE_PARAMETER_NOT_APPLICABLE',
                `${definition.label} ist fuer die aktuellen Rahmendaten nicht anwendbar.`
            );
        }
    }
}

export function assertAutoOptimizeParameterRanges(params, baseInputs) {
    if (!params || typeof params !== 'object' || Array.isArray(params) || Object.keys(params).length === 0) {
        throw parameterError(
            'AUTO_OPTIMIZE_PARAMETER_RANGE_REQUIRED',
            'Mindestens ein Auto-Optimize-Suchbereich ist erforderlich.'
        );
    }
    assertAutoOptimizeParameterSet(params, baseInputs);

    for (const [key, range] of Object.entries(params)) {
        const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[key];
        const minimum = finiteNumber(range?.min);
        const maximum = finiteNumber(range?.max);
        const step = finiteNumber(range?.step);
        const normalizedMinimum = definition.normalize(minimum);
        const normalizedMaximum = definition.normalize(maximum);
        if (
            minimum === null
            || maximum === null
            || step === null
            || normalizedMinimum !== minimum
            || normalizedMaximum !== maximum
            || !definition.validate(normalizedMinimum)
            || !definition.validate(normalizedMaximum)
        ) {
            throw parameterError(
                'AUTO_OPTIMIZE_PARAMETER_RANGE_DOMAIN_INVALID',
                `${definition.label}: Suchbereich muss innerhalb [${definition.domain.min}, ${definition.domain.max}] liegen.`
            );
        }
        if (minimum > maximum) {
            throw parameterError(
                'AUTO_OPTIMIZE_PARAMETER_RANGE_ORDER_INVALID',
                `${definition.label}: Minimum darf Maximum nicht ueberschreiten.`
            );
        }
        if (step <= 0) {
            throw parameterError(
                'AUTO_OPTIMIZE_PARAMETER_RANGE_STEP_INVALID',
                `${definition.label}: Schrittweite muss groesser als 0 sein.`
            );
        }
    }
}

export function normalizeAutoOptimizeCandidate(candidate, baseInputs, { goldCap = 100 } = {}) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        throw parameterError('AUTO_OPTIMIZE_CANDIDATE_OBJECT_REQUIRED', 'Auto-Optimize-Kandidat muss ein Objekt sein.');
    }

    const normalized = {};
    for (const [key, rawValue] of Object.entries(candidate)) {
        const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[key];
        if (!definition) {
            throw parameterError('AUTO_OPTIMIZE_PARAMETER_UNKNOWN', `Unbekannter Auto-Optimize-Parameter: ${key}.`);
        }
        if (!definition.applicable(baseInputs)) {
            throw parameterError(
                'AUTO_OPTIMIZE_PARAMETER_NOT_APPLICABLE',
                `${definition.label} ist fuer die aktuellen Rahmendaten nicht anwendbar.`
            );
        }
        const value = definition.normalize(rawValue);
        if (value === null || !definition.validate(value)) {
            throw parameterError(
                'AUTO_OPTIMIZE_PARAMETER_DOMAIN_INVALID',
                `${definition.label} liegt ausserhalb der zulaessigen Domain.`
            );
        }
        if (key === 'goldTargetPct' && value > goldCap) {
            throw parameterError(
                'AUTO_OPTIMIZE_GOLD_CAP_EXCEEDED',
                `Gold Target ${value} ueberschreitet das Cap ${goldCap}.`
            );
        }
        normalized[key] = value;
    }

    return normalized;
}

export function isAutoOptimizeCandidateValid(candidate, goldCap = 100, baseInputs = {}) {
    try {
        normalizeAutoOptimizeCandidate(candidate, baseInputs, { goldCap });
        return true;
    } catch {
        return false;
    }
}

export function applyAutoOptimizeCandidateToInputs(candidate, inputs, options = {}) {
    const normalized = normalizeAutoOptimizeCandidate(candidate, inputs, options);
    for (const [key, value] of Object.entries(normalized)) {
        AUTO_OPTIMIZE_PARAMETER_REGISTRY[key].applyInput(inputs, value);
    }
    return normalized;
}

export function readAutoOptimizeCandidateFromInputs(paramsOrKeys, inputs) {
    const candidate = {};
    for (const key of selectedKeys(paramsOrKeys)) {
        const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[key];
        if (!definition) {
            throw parameterError('AUTO_OPTIMIZE_PARAMETER_UNKNOWN', `Unbekannter Auto-Optimize-Parameter: ${key}.`);
        }
        const value = definition.normalize(definition.readInput(inputs));
        if (value === null) {
            throw parameterError(
                'AUTO_OPTIMIZE_PARAMETER_MISSING',
                `${definition.requestKey} fehlt in den Rahmendaten.`
            );
        }
        candidate[key] = value;
    }
    return normalizeAutoOptimizeCandidate(candidate, inputs);
}

function stableFingerprint(version, candidate, useRequestKeys) {
    const entries = Object.entries(candidate)
        .map(([key, rawValue]) => {
            const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[key];
            if (!definition) {
                throw parameterError('AUTO_OPTIMIZE_PARAMETER_UNKNOWN', `Unbekannter Auto-Optimize-Parameter: ${key}.`);
            }
            const value = definition.normalize(rawValue);
            if (value === null) {
                throw parameterError('AUTO_OPTIMIZE_PARAMETER_DOMAIN_INVALID', `${definition.label} ist nicht endlich.`);
            }
            return [useRequestKeys ? definition.requestKey : key, Object.is(value, -0) ? 0 : value];
        })
        .sort(([left], [right]) => left.localeCompare(right));
    return JSON.stringify({ schemaVersion: version, values: Object.fromEntries(entries) });
}

export function createAutoOptimizeParameterFingerprint(candidate) {
    return stableFingerprint(AUTO_OPTIMIZE_PARAMETER_FINGERPRINT_VERSION, candidate, false);
}

export function createAutoOptimizeRequestFingerprint(candidate) {
    return stableFingerprint(AUTO_OPTIMIZE_REQUEST_FINGERPRINT_VERSION, candidate, true);
}

export function renderAutoOptimizeParamOptions(selectedKey = '') {
    return AUTO_OPTIMIZE_PARAMETER_OPTIONS
        .map(({ key, label }) => `<option value="${key}"${key === selectedKey ? ' selected' : ''}>${label}</option>`)
        .join('');
}
