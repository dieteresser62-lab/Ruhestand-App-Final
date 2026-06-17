"use strict";

import { validateTailRiskHorizonCompatibility } from './tail-risk-contract.js';

export class SimulatorValidationError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.name = 'SimulatorValidationError';
        this.errors = Array.isArray(errors) ? errors : [];
    }
}

export function validateSimulatorInputs(inputs = {}) {
    const errors = [];
    const minimumFlexAnnualRaw = Number(inputs.minimumFlexAnnual);
    const minimumFlexAnnual = Number.isFinite(minimumFlexAnnualRaw) ? minimumFlexAnnualRaw : 0;
    const startFlexBedarfRaw = Number(inputs.startFlexBedarf);
    const startFlexBedarf = Number.isFinite(startFlexBedarfRaw) ? startFlexBedarfRaw : 0;

    if (minimumFlexAnnual < 0) {
        errors.push({ fieldId: 'minimumFlexAnnual', message: 'Mindest-Flex p.a. darf nicht negativ sein.' });
    }
    if (minimumFlexAnnual > startFlexBedarf) {
        errors.push(
            { fieldId: 'minimumFlexAnnual', message: 'Mindest-Flex p.a. darf nicht größer als Flex-Bedarf p.a. sein.' },
            { fieldId: 'startFlexBedarf', message: 'Flex-Bedarf p.a. ist die Obergrenze für Mindest-Flex.' }
        );
    }

    const tailRiskValidation = validateTailRiskHorizonCompatibility(inputs, inputs.tailRiskHorizonYears);
    const tailRiskInputErrors = Array.isArray(inputs.tailRiskValidationErrors)
        ? inputs.tailRiskValidationErrors
        : [];
    if (!tailRiskValidation.valid) {
        for (const error of tailRiskValidation.errors) {
            errors.push({
                fieldId: error.fieldId,
                message: error.message || 'Ungueltiger Tail-Risk-Parameter.'
            });
        }
    }
    if (tailRiskInputErrors.length > 0) {
        for (const error of tailRiskInputErrors) {
            const alreadyReported = errors.some(existing => existing.fieldId === error.fieldId && existing.message === error.message);
            if (!alreadyReported) {
                errors.push({
                    fieldId: error.fieldId,
                    message: error.message || 'Ungueltiger Tail-Risk-Parameter.'
                });
            }
        }
    }

    if (errors.length > 0) {
        const first = errors[0];
        throw new SimulatorValidationError(
            first?.message || 'Ungueltige Simulator-Eingaben.',
            errors
        );
    }

    return inputs;
}

export function formatSimulatorValidationError(error) {
    if (error instanceof SimulatorValidationError) return error.message;
    return error?.message || String(error || 'Unbekannter Validierungsfehler');
}
