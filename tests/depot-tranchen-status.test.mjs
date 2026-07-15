import {
    TRANCHE_STATUS_STATES,
    calculateAggregatedValues,
    getTranchenStatus,
    renderTranchenStatusBadge,
    syncTranchenToInputs
} from '../app/tranches/depot-tranchen-status.js';
import { PersistenceFacade } from '../app/shared/persistence-facade.js';

console.log('--- Depot Tranchen Status Tests ---');

function createStorage() {
    const values = new Map();
    return {
        getItem: key => values.has(String(key)) ? values.get(String(key)) : null,
        setItem: (key, value) => values.set(String(key), String(value)),
        removeItem: key => values.delete(String(key)),
        clear: () => values.clear(),
        key: index => Array.from(values.keys())[index] || null,
        get length() { return values.size; }
    };
}

function persistedLot(overrides = {}) {
    return {
        trancheId: 'lot-1',
        name: 'Test Lot',
        shares: 10,
        purchasePrice: 100,
        currentPrice: 80,
        purchaseDate: '2020-01-01',
        type: 'aktien_neu',
        category: 'equity',
        tqf: 0.30,
        ...overrides
    };
}

function engineLot(overrides = {}) {
    return {
        trancheId: 'engine-lot',
        name: 'Engine Lot',
        marketValue: 100,
        costBasis: 80,
        purchaseDate: '2020-01-01',
        type: 'aktien_neu',
        category: 'equity',
        tqf: 0.30,
        ...overrides
    };
}

const previousGlobals = {
    localStorage: global.localStorage,
    window: global.window,
    document: global.document,
    alert: global.alert
};
const storage = createStorage();
global.localStorage = storage;
global.window = { __profilverbundTranchenOverride: null };
global.alert = () => {};
PersistenceFacade.resetPersistenceRuntimeForTests();

console.log('Test 1: explicit status states');
{
    let status = getTranchenStatus();
    assertEqual(status.state, TRANCHE_STATUS_STATES.NOT_LOADED, 'Missing key should be not_loaded');

    storage.setItem('depot_tranchen', '[]');
    status = getTranchenStatus();
    assertEqual(status.state, TRANCHE_STATUS_STATES.EMPTY, 'Explicit [] should be empty');
    assertEqual(status.loaded, false, 'Empty state should not claim active FIFO data');

    storage.setItem('depot_tranchen', JSON.stringify([persistedLot()]));
    status = getTranchenStatus();
    assertEqual(status.state, TRANCHE_STATUS_STATES.VALID, 'Canonical persisted lot should be valid');
    assertClose(status.gainPct, -20, 1e-9, 'Negative return should retain its sign');

    storage.setItem('depot_tranchen', 'nicht-json{{');
    status = getTranchenStatus();
    assertEqual(status.state, TRANCHE_STATUS_STATES.ERROR, 'Malformed storage should be error');
    assertEqual(status.errorCode, 'TRANCHE_STORAGE_CORRUPT', 'Malformed storage should expose the stable code');
}

console.log('Test 2: badge distinguishes empty, valid and malformed without sign duplication');
{
    const container = { innerHTML: '' };
    global.document = { getElementById: id => id === 'status' ? container : null };

    storage.setItem('depot_tranchen', '[]');
    renderTranchenStatusBadge('status');
    assert(container.innerHTML.includes('Tranchenbestand ist leer'), 'Empty badge should name the empty state');
    assert(!container.innerHTML.includes('FIFO aktiv'), 'Empty badge must not claim FIFO is active');

    storage.setItem('depot_tranchen', JSON.stringify([persistedLot()]));
    renderTranchenStatusBadge('status');
    assert(container.innerHTML.includes('FIFO aktiv'), 'Valid badge should report active FIFO');
    assert(container.innerHTML.includes('-20.0%'), 'Negative return should render with one minus sign');
    assert(!container.innerHTML.includes('+-'), 'Badge must never render a double sign');

    storage.setItem('depot_tranchen', 'nicht-json{{');
    renderTranchenStatusBadge('status');
    assert(container.innerHTML.includes('Tranchenbestand ist fehlerhaft'), 'Malformed badge should name the error state');
    assert(!container.innerHTML.includes('Alt/Neu-Modell.</strong>'), 'Malformed badge must not masquerade as unloaded data');
}

console.log('Test 3: canonical classification prevents gold and money-market double counting');
{
    const values = calculateAggregatedValues([
        engineLot({ trancheId: 'equity', marketValue: 100, costBasis: 80 }),
        engineLot({ trancheId: 'money', type: 'geldmarkt', category: 'money_market', tqf: 0, marketValue: 200, costBasis: 200 }),
        engineLot({ trancheId: 'gold', type: 'gold', category: 'gold', tqf: 0, marketValue: 300, costBasis: 250 }),
        engineLot({ trancheId: 'bond', type: 'anleihe', category: 'bonds', tqf: 0, marketValue: 400, costBasis: 390 })
    ]);
    assertEqual(values.depotwertNeu, 500, 'Legacy neu total should contain equity plus bonds, but not money market or gold');
    assertEqual(values.geldmarktEtf, 200, 'Money market should be counted exactly once in its own bucket');
    assertEqual(values.goldWert, 300, 'Gold should be counted exactly once in its own bucket');
    assertEqual(values.bondsWert, 400, 'Bond diagnostic total should retain the canonical bond amount');

    let mismatchError = null;
    try {
        calculateAggregatedValues([
            engineLot({ trancheId: 'mismatch', type: 'aktien_neu', category: 'money_market' })
        ]);
    } catch (error) {
        mismatchError = error;
    }
    assertEqual(mismatchError?.code, 'TRANCHE_VALIDATION_FAILED', 'Contradictory classification must fail closed');
}

console.log('Test 4: empty household override wins over current-profile storage');
{
    storage.setItem('depot_tranchen', JSON.stringify([persistedLot()]));
    global.window.__profilverbundTranchenOverride = [];
    const status = getTranchenStatus();
    assertEqual(status.state, TRANCHE_STATUS_STATES.EMPTY, 'Empty override should remain empty');
    assertEqual(status.source, 'override', 'Empty override should remain the authoritative source');
    assertEqual(calculateAggregatedValues(), null, 'Empty override should not aggregate the current profile lot');
}

console.log('Test 5: input synchronization replaces money market instead of adding another position');
{
    const elements = new Map();
    const field = (id, value = '0') => {
        const element = {
            id,
            type: 'number',
            value,
            dispatchEvent() {}
        };
        elements.set(id, element);
        return element;
    };
    field('simStartVermoegen', '999');
    field('depotwertAlt');
    field('costBasisAlt');
    field('einstandAlt');
    field('depotwertNeu');
    field('costBasisNeu');
    field('einstandNeu');
    field('geldmarktEtf', '900');
    field('goldWert');
    field('goldCost');
    field('tagesgeld', '50');
    global.document = { getElementById: id => elements.get(id) || null };
    global.window.__profilverbundTranchenOverride = [
        engineLot({ trancheId: 'money-only', type: 'geldmarkt', category: 'money_market', tqf: 0, marketValue: 200, costBasis: 200 })
    ];

    assertEqual(syncTranchenToInputs({ silent: true }), true, 'Valid override should synchronize');
    assertEqual(elements.get('geldmarktEtf').value, '200', 'Detailed money-market lot should replace the stale aggregate field');
    assertEqual(elements.get('simStartVermoegen').value, '250', 'Start assets should contain money market and cash exactly once');
}

PersistenceFacade.resetPersistenceRuntimeForTests();
Object.entries(previousGlobals).forEach(([key, value]) => {
    if (value === undefined) delete global[key];
    else global[key] = value;
});

console.log('--- Depot Tranchen Status Tests Completed ---');
