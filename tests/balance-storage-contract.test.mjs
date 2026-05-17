import { CONFIG, StorageError } from '../app/balance/balance-config.js';
import { StorageManager } from '../app/balance/balance-storage.js';

console.log('--- Balance Storage Contract Tests ---');

class MockLocalStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.has(String(key)) ? this.store.get(String(key)) : null;
    }

    setItem(key, value) {
        this.store.set(String(key), String(value));
    }

    removeItem(key) {
        this.store.delete(String(key));
    }

    clear() {
        this.store.clear();
    }

    key(index) {
        return Array.from(this.store.keys())[index] || null;
    }

    get length() {
        return this.store.size;
    }
}

function snapshotKeys(storage, prefix = CONFIG.STORAGE.SNAPSHOT_PREFIX) {
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key?.startsWith(prefix)) keys.push(key);
    }
    return keys;
}

const prevLocalStorage = global.localStorage;
const prevLocation = global.location;

try {
    console.log('Test 1: real migration sanitizes inflation state and creates taxState');
    {
        global.localStorage = new MockLocalStorage();
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
            inputs: { floorBedarf: 24000 },
            lastState: {
                cumulativeInflationFactor: 9,
                lastInflationAppliedAtAge: null
            }
        }));

        const loaded = StorageManager.loadState();

        assertEqual(loaded.lastState.cumulativeInflationFactor, 1, 'Migration setzt zu hohen Inflationsfaktor zurueck');
        assertEqual(loaded.lastState.lastInflationAppliedAtAge, 0, 'Migration setzt ungueltiges Inflationsalter zurueck');
        assertEqual(loaded.lastState.taxState.lossCarry, 0, 'Migration ergaenzt fehlenden TaxState');
        assertEqual(localStorage.getItem(CONFIG.STORAGE.MIGRATION_FLAG), '1', 'Migration setzt das Flag');
    }

    console.log('Test 2: taxState is repaired even when migration flag already exists');
    {
        global.localStorage = new MockLocalStorage();
        localStorage.setItem(CONFIG.STORAGE.MIGRATION_FLAG, '1');
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
            lastState: {
                cumulativeInflationFactor: 12,
                lastInflationAppliedAtAge: 99,
                taxState: { lossCarry: -50 }
            }
        }));

        const loaded = StorageManager.loadState();

        assertEqual(loaded.lastState.cumulativeInflationFactor, 12, 'Alte Inflation-Migration laeuft bei gesetztem Flag nicht erneut');
        assertEqual(loaded.lastState.lastInflationAppliedAtAge, 99, 'Altes Inflationsalter bleibt bei gesetztem Flag unveraendert');
        assertEqual(loaded.lastState.taxState.lossCarry, 0, 'TaxState wird trotz gesetztem Flag repariert');
    }

    console.log('Test 3: valid taxState.lossCarry is preserved');
    {
        global.localStorage = new MockLocalStorage();
        localStorage.setItem(CONFIG.STORAGE.MIGRATION_FLAG, '1');
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
            lastState: {
                taxState: { lossCarry: 1234.56 }
            }
        }));

        const loaded = StorageManager.loadState();

        assertClose(loaded.lastState.taxState.lossCarry, 1234.56, 1e-9, 'Gueltiger Verlusttopf bleibt erhalten');
    }

    console.log('Test 4: invalid storage JSON throws StorageError');
    {
        global.localStorage = new MockLocalStorage();
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, 'nicht-json{{{');

        let thrown = null;
        try {
            StorageManager.loadState();
        } catch (err) {
            thrown = err;
        }

        assert(thrown instanceof StorageError, 'Ungueltiges JSON wirft den echten StorageError');
    }

    console.log('Test 5: snapshot restore filters non-app keys and keeps snapshot source');
    {
        let reloadCount = 0;
        global.localStorage = new MockLocalStorage();
        global.location = { reload: () => { reloadCount += 1; } };

        const snapshotKey = `${CONFIG.STORAGE.SNAPSHOT_PREFIX}2026-05-12T10:00:00.000Z--Contract`;
        const snapshotPayload = {
            snapshotType: 'full-localstorage',
            createdAt: '2026-05-12T10:00:00.000Z',
            localStorage: {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify({ inputs: { floorBedarf: 30000 } }),
                depot_tranchen: JSON.stringify([{ id: 't1', wert: 1000 }]),
                profile_tagesgeld: '50000',
                balance_expenses_2026: JSON.stringify({ activeYear: 2026 }),
                unrelated_private_export: 'must-not-restore'
            }
        };

        localStorage.setItem(snapshotKey, JSON.stringify(snapshotPayload));
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({ inputs: { floorBedarf: 1 } }));
        localStorage.setItem('unrelated_private_export', 'old');

        await StorageManager.restoreSnapshot(snapshotKey, null);

        assertEqual(JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY)).inputs.floorBedarf, 30000, 'Restore ersetzt den Balance-State');
        assertEqual(JSON.parse(localStorage.getItem('depot_tranchen'))[0].id, 't1', 'Restore stellt Tranchen wieder her');
        assertEqual(localStorage.getItem('profile_tagesgeld'), '50000', 'Restore stellt Profilwerte wieder her');
        assert(localStorage.getItem('balance_expenses_2026'), 'Restore stellt Ausgaben-Check-Daten wieder her');
        assertEqual(localStorage.getItem('unrelated_private_export'), null, 'Restore verwirft nicht erlaubte Keys');
        assert(localStorage.getItem(snapshotKey), 'Restore behaelt den verwendeten Snapshot im Browser-Storage');
        assertEqual(reloadCount, 1, 'Restore triggert genau einen Reload');
    }

    console.log('Test 6: real createSnapshot stores full localStorage payload with sanitized label');
    {
        global.localStorage = new MockLocalStorage();
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({ inputs: { floorBedarf: 24000 } }));
        localStorage.setItem('depot_tranchen', JSON.stringify([{ id: 't2' }]));

        await StorageManager.createSnapshot(null, 'Profil:/2026?');

        const keys = snapshotKeys(localStorage);
        assertEqual(keys.length, 1, 'createSnapshot legt genau einen Snapshot-Key an');
        assert(keys[0].includes('--Profil__2026_'), 'Snapshot-Label wird fuer localStorage-Key bereinigt');

        const payload = JSON.parse(localStorage.getItem(keys[0]));
        assertEqual(payload.snapshotType, 'full-localstorage', 'Snapshot nutzt full-localstorage Format');
        assert(payload.localStorage[CONFIG.STORAGE.LS_KEY], 'Snapshot enthaelt Balance-State');
        assert(payload.localStorage.depot_tranchen, 'Snapshot enthaelt Tranchen');
    }

    console.log('Balance storage contract tests passed');
} finally {
    if (prevLocation === undefined) delete global.location; else global.location = prevLocation;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('--- Balance Storage Contract Tests Completed ---');
