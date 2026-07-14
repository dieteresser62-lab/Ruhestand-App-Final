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
    const saved = storage.getItem(PROFILE_TRANCHES_KEY);
    if (!saved) return [];
    try {
        return normalizeTranches(JSON.parse(saved));
    } catch {
        const parsed = (() => {
            try {
                return JSON.parse(saved);
            } catch {
                return null;
            }
        })();
        if (parsed === null) return [];
        return normalizeTranches(parsed);
    }
}
