/**
 * Module: Auto-Optimize Apply
 * Purpose: Apply champion parameters through the canonical registry and verify
 *          the evaluated request fingerprint against the resulting form state.
 */
"use strict";

import {
    AUTO_OPTIMIZE_PARAMETER_REGISTRY,
    createAutoOptimizeParameterFingerprint,
    createAutoOptimizeRequestFingerprint
} from './auto-optimize-param-meta.js';

function applyError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function readApplicabilityInputs(doc) {
    return {
        dynamicFlex: doc?.getElementById?.('dynamicFlex')?.checked === true,
        horizonMethod: doc?.getElementById?.('horizonMethod')?.value
    };
}

export function applyChampionToForm({
    championCfg,
    doc = globalThis.document,
    EventCtor = globalThis.Event
}) {
    if (!championCfg || typeof championCfg !== 'object' || Array.isArray(championCfg)) {
        throw applyError('AUTO_OPTIMIZE_APPLY_CANDIDATE_REQUIRED', 'Kein gueltiger Champion zum Anwenden vorhanden.');
    }

    const normalizedCandidate = {};
    for (const [paramKey, rawValue] of Object.entries(championCfg)) {
        const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[paramKey];
        if (!definition) {
            throw applyError(
                'AUTO_OPTIMIZE_APPLY_PARAMETER_UNKNOWN',
                `Unbekannter Champion-Parameter kann nicht angewendet werden: ${paramKey}.`
            );
        }
        const value = definition.normalize(rawValue);
        if (value === null || !definition.validate(value)) {
            throw applyError(
                'AUTO_OPTIMIZE_APPLY_PARAMETER_INVALID',
                `${definition.label} besitzt keinen gueltigen Champion-Wert.`
            );
        }
        normalizedCandidate[paramKey] = value;
    }

    const parameterFingerprint = createAutoOptimizeParameterFingerprint(normalizedCandidate);
    const requestFingerprint = createAutoOptimizeRequestFingerprint(normalizedCandidate);
    if (
        typeof championCfg.__autoOptimizeParameterFingerprint !== 'string'
        || typeof championCfg.__autoOptimizeRequestFingerprint !== 'string'
    ) {
        throw applyError(
            'AUTO_OPTIMIZE_APPLY_FINGERPRINT_REQUIRED',
            'Der Champion besitzt keinen vollstaendigen Evaluationsfingerprint; Uebernahme abgebrochen.'
        );
    }
    if (championCfg.__autoOptimizeParameterFingerprint !== parameterFingerprint) {
        throw applyError(
            'AUTO_OPTIMIZE_APPLY_PARAMETER_FINGERPRINT_MISMATCH',
            'Der Champion wurde seit seiner Evaluation veraendert; Uebernahme abgebrochen.'
        );
    }
    if (championCfg.__autoOptimizeRequestFingerprint !== requestFingerprint) {
        throw applyError(
            'AUTO_OPTIMIZE_APPLY_REQUEST_FINGERPRINT_MISMATCH',
            'Der kanonische Champion-Request stimmt nicht mit der Evaluation ueberein.'
        );
    }

    const applicabilityInputs = readApplicabilityInputs(doc);
    for (const paramKey of Object.keys(normalizedCandidate)) {
        const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[paramKey];
        if (!definition.applicable(applicabilityInputs)) {
            throw applyError(
                'AUTO_OPTIMIZE_APPLY_PARAMETER_NOT_APPLICABLE',
                `${definition.label} ist im aktuellen Formularmodus nicht anwendbar; Uebernahme abgebrochen.`
            );
        }
        for (const formId of definition.requiredFormIds) {
            if (!doc?.getElementById?.(formId)) {
                throw applyError(
                    'AUTO_OPTIMIZE_APPLY_FORM_TARGET_MISSING',
                    `Formularziel fuer ${definition.label} fehlt.`
                );
            }
        }
    }

    const dispatchChange = (input) => {
        input.dispatchEvent(new EventCtor('change', { bubbles: true }));
    };
    for (const [paramKey, value] of Object.entries(normalizedCandidate)) {
        const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[paramKey];
        if (definition.applyForm) {
            if (!definition.applyForm({ doc, value, dispatchChange })) {
                throw applyError(
                    'AUTO_OPTIMIZE_APPLY_FORM_TARGET_MISSING',
                    `Formularziel fuer ${definition.label} fehlt.`
                );
            }
            continue;
        }

        const input = doc?.getElementById?.(definition.formId);
        if (!input) {
            throw applyError(
                'AUTO_OPTIMIZE_APPLY_FORM_TARGET_MISSING',
                `Formularziel fuer ${definition.label} fehlt.`
            );
        }
        input.value = value;
        dispatchChange(input);
    }

    const appliedCandidate = {};
    for (const paramKey of Object.keys(normalizedCandidate)) {
        const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[paramKey];
        const appliedValue = definition.normalize(definition.readForm({ doc }));
        if (appliedValue === null) {
            throw applyError(
                'AUTO_OPTIMIZE_APPLY_READBACK_INVALID',
                `${definition.label} konnte nach der Uebernahme nicht kanonisch zurueckgelesen werden.`
            );
        }
        if (definition.verifyForm && !definition.verifyForm({ doc, value: appliedValue })) {
            throw applyError(
                'AUTO_OPTIMIZE_APPLY_SIDE_EFFECT_MISMATCH',
                `${definition.label} wurde nicht mit allen erforderlichen Formularzuständen uebernommen.`
            );
        }
        appliedCandidate[paramKey] = appliedValue;
    }

    const appliedParameterFingerprint = createAutoOptimizeParameterFingerprint(appliedCandidate);
    const appliedRequestFingerprint = createAutoOptimizeRequestFingerprint(appliedCandidate);
    if (
        appliedParameterFingerprint !== parameterFingerprint
        || appliedRequestFingerprint !== requestFingerprint
    ) {
        throw applyError(
            'AUTO_OPTIMIZE_APPLY_READBACK_FINGERPRINT_MISMATCH',
            'Der angewendete Formularzustand weicht vom evaluierten Champion ab.'
        );
    }

    return Object.freeze({
        schemaVersion: 'AutoOptimizeApplyFidelityV1',
        parameterFingerprint: appliedParameterFingerprint,
        requestFingerprint: appliedRequestFingerprint
    });
}
