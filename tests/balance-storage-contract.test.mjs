import { CONFIG, StorageError } from '../app/balance/balance-config.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import { createLocalStorageAdapter } from '../app/shared/persistence-adapter-localstorage.js';
import { resetPersistenceForTests } from '../app/shared/persistence-facade.js';
import { SnapshotArchive, SNAPSHOT_TYPE } from '../app/shared/snapshot-archive.js';
import { PROFILE_STORAGE_KEYS } from '../app/profile/profile-state.js';

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

function installMockLocalStorage() {
    global.localStorage = new MockLocalStorage();
    resetPersistenceForTests(createLocalStorageAdapter(() => global.localStorage));
    return global.localStorage;
}

const prevLocalStorage = global.localStorage;
const prevLocation = global.location;

try {
    console.log('Test 1: real migration sanitizes inflation state and creates taxState');
    {
        installMockLocalStorage();
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
        installMockLocalStorage();
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
        installMockLocalStorage();
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
        installMockLocalStorage();
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, 'nicht-json{{{');

        let thrown = null;
        try {
            StorageManager.loadState();
        } catch (err) {
            thrown = err;
        }

        assert(thrown instanceof StorageError, 'Ungueltiges JSON wirft den echten StorageError');
    }

    console.log('Test 5: snapshot restore uses archive and keeps unrelated keys plus snapshot history');
    {
        let reloadCount = 0;
        installMockLocalStorage();
        global.location = { reload: () => { reloadCount += 1; } };

        localStorage.setItem(PROFILE_STORAGE_KEYS.current, 'default');
        localStorage.setItem(PROFILE_STORAGE_KEYS.active, 'default');
        localStorage.setItem(PROFILE_STORAGE_KEYS.registry, JSON.stringify({
            version: 1,
            currentProfileId: 'default',
            profiles: {
                default: { meta: { name: 'Default' }, data: {} },
                other: { meta: { name: 'Other' }, data: { profile_tagesgeld: '999' } }
            }
        }));
        const snapshot = await SnapshotArchive.createSnapshot({
            id: 'contract-restore',
            label: 'Contract',
            kind: 'manual',
            createdAt: '2026-05-12T10:00:00.000Z',
            activeProfileId: 'default',
            activeProfileName: 'Default',
            records: {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify({ inputs: { floorBedarf: 30000 } }),
                [PROFILE_STORAGE_KEYS.current]: 'default',
                [PROFILE_STORAGE_KEYS.active]: 'default',
                [PROFILE_STORAGE_KEYS.registry]: JSON.stringify({ profiles: { default: { data: { profile_tagesgeld: 'snapshot-registry-must-not-win' } } } }),
                depot_tranchen: JSON.stringify([{ id: 't1', wert: 1000 }]),
                profile_tagesgeld: '50000',
                balance_expenses_2026: JSON.stringify({ activeYear: 2026 })
            }
        });

        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({ inputs: { floorBedarf: 1 } }));
        localStorage.setItem('unrelated_private_export', 'old');

        await StorageManager.restoreSnapshot(snapshot.id, null);

        assertEqual(JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY)).inputs.floorBedarf, 30000, 'Restore ersetzt den Balance-State');
        assertEqual(JSON.parse(localStorage.getItem('depot_tranchen'))[0].id, 't1', 'Restore stellt Tranchen wieder her');
        assertEqual(localStorage.getItem('profile_tagesgeld'), '50000', 'Restore stellt Profilwerte wieder her');
        assert(localStorage.getItem('balance_expenses_2026'), 'Restore stellt Ausgaben-Check-Daten wieder her');
        assertEqual(localStorage.getItem('unrelated_private_export'), 'old', 'Restore laesst nicht erlaubte fremde Keys unveraendert');
        assert(await SnapshotArchive.readSnapshot(snapshot.id), 'Restore behaelt den verwendeten Snapshot im Archiv');
        const registry = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEYS.registry));
        assert(registry.profiles.other, 'Restore erhaelt andere Profile in der aktuellen Registry');
        assertEqual(registry.profiles.default.data.profile_tagesgeld, '50000', 'Restore aktualisiert nur die Daten des Snapshot-Profils');
        assertEqual(reloadCount, 1, 'Restore triggert genau einen Reload');
    }

    console.log('Test 6: real createSnapshot stores canonical archive snapshot');
    {
        installMockLocalStorage();
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({ inputs: { floorBedarf: 24000 } }));
        localStorage.setItem('depot_tranchen', JSON.stringify([{ id: 't2' }]));
        localStorage.setItem(PROFILE_STORAGE_KEYS.current, 'default');
        localStorage.setItem(PROFILE_STORAGE_KEYS.active, 'default');

        await StorageManager.createSnapshot(null, 'Profil:/2026?');

        const snapshots = await SnapshotArchive.listSnapshots();
        assertEqual(snapshots.length, 1, 'createSnapshot legt genau einen Archiv-Snapshot an');
        assertEqual(snapshots[0].records, undefined, 'Snapshot-Index enthaelt keinen Vollpayload');
        assertEqual(snapshots[0].label, 'Profil:/2026?', 'Snapshot-Label bleibt als Metadatum erhalten');

        const payload = await SnapshotArchive.readSnapshot(snapshots[0].id);
        assertEqual(payload.snapshotType, SNAPSHOT_TYPE, 'Snapshot nutzt kanonisches Format');
        assert(payload.records[CONFIG.STORAGE.LS_KEY], 'Snapshot enthaelt Balance-State');
        assert(payload.records.depot_tranchen, 'Snapshot enthaelt Tranchen');
    }

    console.log('Balance storage contract tests passed');
} finally {
    resetPersistenceForTests(createLocalStorageAdapter());
    if (prevLocation === undefined) delete global.location; else global.location = prevLocation;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('--- Balance Storage Contract Tests Completed ---');
