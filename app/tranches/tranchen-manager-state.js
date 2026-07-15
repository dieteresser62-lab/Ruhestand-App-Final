// @ts-check

import { PROFILE_TRANCHES_KEY } from '../profile/profile-state.js';
import { persistenceStorage } from '../shared/persistence-facade.js';
import {
    calculateCanonicalTrancheValues,
    normalizeTrancheCollection
} from '../../types/tranche-contract.js';

export function generateTrancheId() {
    const rand = Math.random().toString(36).slice(2, 8);
    return `tranche_${Date.now()}_${rand}`;
}

export function normalizeTranches(items) {
    return normalizeTrancheCollection(items, { mode: 'persisted' });
}

export function calculateTrancheDerivedValues(tranche) {
    return calculateCanonicalTrancheValues(tranche);
}

export function saveTranchesToStorage(tranchen, storage = persistenceStorage) {
    const normalized = normalizeTranches(tranchen);
    storage.setItem(PROFILE_TRANCHES_KEY, JSON.stringify(normalized));
    return normalized;
}

export function loadTranchesFromStorage(storage = persistenceStorage) {
    let raw;
    try {
        raw = storage.getItem(PROFILE_TRANCHES_KEY);
    } catch {
        return Object.freeze({
            status: 'unavailable',
            tranches: null,
            raw: null,
            errorCode: 'TRANCHE_STORAGE_UNAVAILABLE'
        });
    }

    if (raw === null || raw === '') {
        return Object.freeze({
            status: 'empty',
            tranches: Object.freeze([]),
            raw,
            errorCode: null
        });
    }

    try {
        const tranches = normalizeTranches(JSON.parse(raw));
        return Object.freeze({
            status: tranches.length > 0 ? 'valid' : 'empty',
            tranches: Object.freeze(tranches),
            raw,
            errorCode: null
        });
    } catch {
        return Object.freeze({
            status: 'corrupt',
            tranches: null,
            raw,
            errorCode: 'TRANCHE_STORAGE_CORRUPT'
        });
    }
}
