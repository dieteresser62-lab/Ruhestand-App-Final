"use strict";

import {
    calculateTrancheDerivedValues,
    loadTranchesFromStorage,
    normalizeTranches,
    saveTranchesToStorage
} from '../app/tranches/tranchen-manager-state.js';
import { TrancheValidationError } from '../types/tranche-contract.js';

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

function validLegacyTranche(overrides = {}) {
    return {
        name: 'ETF',
        shares: 5,
        purchasePrice: 100,
        currentPrice: 120,
        purchaseDate: '2024-01-01',
        category: 'equity',
        type: 'aktien_neu',
        tqf: 0.3,
        ...overrides
    };
}

console.log('Test 1: normalizeTranches migrates stable ids and canonical values');
{
    const items = [validLegacyTranche({ name: 'A' }), validLegacyTranche({ id: 'legacy-id', name: 'B' })];
    const normalized = normalizeTranches(items);
    const repeated = normalizeTranches(items);
    assert(normalized[0].trancheId.startsWith('tranche_legacy_'), 'Missing legacy trancheId should be generated');
    assertEqual(normalized[0].trancheId, repeated[0].trancheId, 'Legacy id generation should be deterministic');
    assertEqual(normalized[1].trancheId, 'legacy-id', 'Legacy id should be promoted to trancheId');
    assertEqual(normalized[0].schemaVersion, 1, 'Normalized lots should use the current schema');
}
console.log('✓ normalizeTranches canonical migration OK');

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
    storage.setItem('depot_tranchen', JSON.stringify([validLegacyTranche()]));
    const loaded = loadTranchesFromStorage(storage);
    assertEqual(loaded.length, 1, 'One tranche should load');
    assert(loaded[0].trancheId.startsWith('tranche_legacy_'), 'Loaded tranche should be normalized with id');
    assertEqual(loaded[0].marketValue, 600, 'Loaded tranche should recompute derived market value');
}
console.log('✓ loadTranchesFromStorage normalizes persisted entries OK');

console.log('Test 4: save validates and persists only canonical records');
{
    const storage = createLocalStorageMock();
    const saved = saveTranchesToStorage([validLegacyTranche({ id: 'saved-id' })], storage);
    const persisted = JSON.parse(storage.getItem('depot_tranchen'));
    assertEqual(saved[0].schemaVersion, 1, 'Save returns canonical schema');
    assertEqual(persisted[0].trancheId, 'saved-id', 'Save persists canonical trancheId');
    assertEqual('id' in persisted[0], false, 'Save does not persist legacy id alias');
}
console.log('✓ save persists canonical records OK');

console.log('Test 5: invalid and duplicate records fail before storage mutation');
{
    const storage = createLocalStorageMock();
    storage.setItem('depot_tranchen', 'unchanged');
    let error = null;
    try {
        saveTranchesToStorage([
            validLegacyTranche({ id: 'duplicate' }),
            validLegacyTranche({ id: 'duplicate', name: 'Second' })
        ], storage);
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof TrancheValidationError, 'Duplicate ids should produce contract validation error');
    assert(error.errors.some(item => item.code === 'TRANCHE_ID_DUPLICATE'), 'Duplicate error should have stable code');
    assertEqual(storage.getItem('depot_tranchen'), 'unchanged', 'Failed validation should not mutate storage');
}
console.log('✓ invalid records fail before storage mutation OK');
