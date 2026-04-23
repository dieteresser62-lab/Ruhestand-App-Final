"use strict";

import {
    calculateTrancheDerivedValues,
    loadTranchesFromStorage,
    normalizeTranches
} from '../app/tranches/tranchen-manager-state.js';

console.log('--- Tranchen Manager State Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); }
    };
}

console.log('Test 1: normalizeTranches adds stable ids');
{
    const normalized = normalizeTranches([{ name: 'A' }, { id: 'legacy-id', name: 'B' }]);
    assert(normalized[0].trancheId.startsWith('tranche_'), 'Missing trancheId should be generated');
    assertEqual(normalized[1].trancheId, 'legacy-id', 'Legacy id should be promoted to trancheId');
}
console.log('✓ normalizeTranches adds stable ids OK');

console.log('Test 2: derived values are recomputed');
{
    const tranche = calculateTrancheDerivedValues({
        shares: 10,
        purchasePrice: 100,
        currentPrice: 120
    });
    assertEqual(tranche.costBasis, 1000, 'Cost basis should equal shares * purchase price');
    assertEqual(tranche.marketValue, 1200, 'Market value should equal shares * current price');
}
console.log('✓ derived values are recomputed OK');

console.log('Test 3: loadTranchesFromStorage normalizes persisted entries');
{
    const storage = createLocalStorageMock();
    storage.setItem('depot_tranchen', JSON.stringify([{ name: 'ETF' }]));
    const loaded = loadTranchesFromStorage(storage);
    assertEqual(loaded.length, 1, 'One tranche should load');
    assert(loaded[0].trancheId.startsWith('tranche_'), 'Loaded tranche should be normalized with id');
}
console.log('✓ loadTranchesFromStorage normalizes persisted entries OK');
