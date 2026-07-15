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
    const storage = {
        setCalls: 0,
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => {
            storage.setCalls += 1;
            store.set(String(key), String(value));
        },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); }
    };
    return storage;
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
    assertEqual(loaded.status, 'valid', 'Non-empty canonical storage should report valid');
    assertEqual(loaded.tranches.length, 1, 'One tranche should load');
    assert(loaded.tranches[0].trancheId.startsWith('tranche_legacy_'), 'Loaded tranche should be normalized with id');
    assertEqual(loaded.tranches[0].marketValue, 600, 'Loaded tranche should recompute derived market value');
}
console.log('✓ loadTranchesFromStorage normalizes persisted entries OK');

console.log('Test 3a: historic money-market records from independent selects remain loadable');
{
    const storage = createLocalStorageMock();
    const historicRaw = JSON.stringify([validLegacyTranche({
        trancheId: 'legacy-money-market',
        name: 'Historic Money Market ETF',
        isin: ' IE00TEST0001 ',
        ticker: ' mmkt.de ',
        category: 'money_market',
        type: 'aktien_neu'
    })]);
    storage.setItem('depot_tranchen', historicRaw);
    const writesBeforeLoad = storage.setCalls;
    const loaded = loadTranchesFromStorage(storage);
    assertEqual(loaded.status, 'valid', 'Historic manager payload should load instead of entering corrupt recovery');
    assertEqual(loaded.tranches[0].category, 'money_market', 'Historic category should remain unchanged');
    assertEqual(loaded.tranches[0].type, 'geldmarkt', 'Historic equity type should migrate to canonical money-market type');
    assertEqual(loaded.tranches[0].isin, 'IE00TEST0001', 'Historic ISIN whitespace should normalize independently');
    assertEqual(storage.setCalls, writesBeforeLoad, 'Read-time migration must not write automatically');
    assertEqual(storage.getItem('depot_tranchen'), historicRaw, 'Read-time migration must preserve the original raw payload');
}
console.log('✓ historic money-market migration OK');

console.log('Test 3b: load reports empty, corrupt and unavailable without mutation');
{
    const emptyStorage = createLocalStorageMock();
    const empty = loadTranchesFromStorage(emptyStorage);
    assertEqual(empty.status, 'empty', 'Missing storage should report empty');
    assertEqual(emptyStorage.setCalls, 0, 'Pure empty load must not write');

    const corruptStorage = createLocalStorageMock();
    const corruptRaw = '{invalid-json';
    corruptStorage.setItem('depot_tranchen', corruptRaw);
    const writesBeforeLoad = corruptStorage.setCalls;
    const corrupt = loadTranchesFromStorage(corruptStorage);
    assertEqual(corrupt.status, 'corrupt', 'Invalid payload should report corrupt');
    assert(corrupt.raw === corruptRaw, 'Corrupt payload should be retained byte-for-byte');
    assertEqual(corruptStorage.setCalls, writesBeforeLoad, 'Corrupt load must not write');
    assert(corruptStorage.getItem('depot_tranchen') === corruptRaw, 'Corrupt live payload must remain unchanged');

    const unavailable = loadTranchesFromStorage({
        getItem() { throw new Error('storage offline'); },
        setItem() { throw new Error('must not write'); }
    });
    assertEqual(unavailable.status, 'unavailable', 'Read rejection should report unavailable');
    assertEqual(unavailable.raw, null, 'Unavailable read must not invent a raw payload');
}
console.log('✓ explicit load-state contract OK');

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
