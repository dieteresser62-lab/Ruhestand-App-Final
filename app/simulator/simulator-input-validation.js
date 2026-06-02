"use strict";

export class SimulatorValidationError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.name = 'SimulatorValidationError';
        this.errors = Array.isArray(errors) ? errors : [];
    }
}

export function validateSimulatorInputs(inputs = {}) {
    const minimumFlexAnnualRaw = Number(inputs.minimumFlexAnnual);
    const minimumFlexAnnual = Number.isFinite(minimumFlexAnnualRaw) ? minimumFlexAnnualRaw : 0;
    const startFlexBedarfRaw = Number(inputs.startFlexBedarf);
    const startFlexBedarf = Number.isFinite(startFlexBedarfRaw) ? startFlexBedarfRaw : 0;

    if (minimumFlexAnnual < 0) {
        throw new SimulatorValidationError(
            'Mindest-Flex p.a. darf nicht negativ sein.',
            [
                { fieldId: 'minimumFlexAnnual', message: 'Mindest-Flex p.a. darf nicht negativ sein.' }
            ]
        );
    }
    if (minimumFlexAnnual > startFlexBedarf) {
        throw new SimulatorValidationError(
            'Mindest-Flex p.a. darf nicht größer als Flex-Bedarf p.a. sein.',
            [
                { fieldId: 'minimumFlexAnnual', message: 'Mindest-Flex p.a. darf nicht größer als Flex-Bedarf p.a. sein.' },
                { fieldId: 'startFlexBedarf', message: 'Flex-Bedarf p.a. ist die Obergrenze für Mindest-Flex.' }
            ]
        );
    }

    return inputs;
}

export function formatSimulatorValidationError(error) {
    if (error instanceof SimulatorValidationError) return error.message;
    return error?.message || String(error || 'Unbekannter Validierungsfehler');
}
