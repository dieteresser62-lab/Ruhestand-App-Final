// @ts-check

import { PROFILE_TRANCHES_KEY } from '../profile/profile-state.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

export function generateTrancheId() {
    const rand = Math.random().toString(36).slice(2, 8);
    return `tranche_${Date.now()}_${rand}`;
}

export function normalizeTranches(items) {
    if (!Array.isArray(items)) return [];
    return items.map((t) => {
        const existingId = t && (t.trancheId || t.id);
        return {
            ...t,
            trancheId: existingId || generateTrancheId()
        };
    });
}

export function calculateTrancheDerivedValues(tranche) {
    const shares = Number(tranche?.shares) || 0;
    const purchasePrice = Number(tranche?.purchasePrice) || 0;
    const currentPrice = Number(tranche?.currentPrice) || purchasePrice;
    return {
        ...tranche,
        currentPrice,
        marketValue: shares * currentPrice,
        costBasis: shares * purchasePrice
    };
}

export function saveTranchesToStorage(tranchen, storage = persistenceStorage) {
    storage.setItem(PROFILE_TRANCHES_KEY, JSON.stringify(tranchen));
    return tranchen;
}

export function loadTranchesFromStorage(storage = persistenceStorage) {
    const saved = storage.getItem(PROFILE_TRANCHES_KEY);
    if (!saved) return [];
    try {
        return normalizeTranches(JSON.parse(saved));
    } catch {
        return [];
    }
}
