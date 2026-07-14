/**
 * Module: Simulator Input Tranches
 * Purpose: Reads detailed tranche inputs from profile overrides or persisted storage.
 */
"use strict";

import { persistenceStorage } from '../shared/persistence-facade.js';

export class SimulatorTrancheInputError extends Error {
    constructor(message, cause = null) {
        super(message, cause ? { cause } : undefined);
        this.name = 'SimulatorTrancheInputError';
        this.code = 'SIMULATOR_TRANCHE_INPUT_INVALID';
    }
}

function deepClone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

export function readTrancheInputs({ win = globalThis.window, storage = persistenceStorage } = {}) {
    const preferAggregates = Boolean(win && win.__profilverbundPreferAggregates);
    const hasOverride = Boolean(win)
        && Object.prototype.hasOwnProperty.call(win, '__profilverbundTranchenOverride');
    const override = hasOverride ? win.__profilverbundTranchenOverride : undefined;

    if (Array.isArray(override)) {
        return {
            detailledTranches: deepClone(override),
            simulationSourceProfileId: override.simulationSourceProfileId
                || override.find(tranche => tranche?.sourceProfileId)?.sourceProfileId
                || null
        };
    }
    if (hasOverride && override !== null && override !== undefined) {
        throw new SimulatorTrancheInputError('Der Profilverbund-Tranchenbestand ist kein Array.');
    }
    if (preferAggregates) {
        return { detailledTranches: null, simulationSourceProfileId: null };
    }

    if (!storage || typeof storage.getItem !== 'function') {
        return { detailledTranches: null, simulationSourceProfileId: null };
    }

    const saved = storage.getItem('depot_tranchen');
    if (saved === null || saved === undefined || saved === '') {
        return { detailledTranches: null, simulationSourceProfileId: null };
    }

    try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
            throw new SimulatorTrancheInputError('Der gespeicherte Tranchenbestand ist kein Array.');
        }
        return { detailledTranches: parsed, simulationSourceProfileId: null };
    } catch (error) {
        if (error instanceof SimulatorTrancheInputError) throw error;
        throw new SimulatorTrancheInputError('Der gespeicherte Tranchenbestand ist kein gueltiges JSON-Array.', error);
    }
}
