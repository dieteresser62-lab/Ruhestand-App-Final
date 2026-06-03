import { createSnapshotHandlers } from '../app/balance/balance-binder-snapshots.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import { UIRenderer } from '../app/balance/balance-renderer.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { SnapshotArchive, SNAPSHOT_TYPE } from '../app/shared/snapshot-archive.js';
import { PROFILE_STORAGE_KEYS } from '../app/profile/profile-state.js';

console.log('--- Balance Binder Snapshots Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); },
        key: (index) => Array.from(store.keys())[index] || null,
        get length() { return store.size; }
    };
}

const prevLocalStorage = global.localStorage;
const prevConfirm = global.confirm;
const prevLocation = global.location;
const prevSetTimeout = global.setTimeout;

try {
    global.localStorage = createLocalStorageMock();
    global.confirm = () => true;
    global.location = { reload: () => {} };
    global.setTimeout = (fn) => { fn(); return 0; };

    const dom = {
        inputs: { profilName: { value: 'TestLabel' } },
        outputs: { snapshotList: {} },
        controls: { snapshotStatus: {} }
    };

    const appState = { snapshotHandle: null };

    let errorHandled = false;
    const prevToast = UIRenderer.toast;
    const prevHandleError = UIRenderer.handleError;
    const prevRenderSnapshots = StorageManager.renderSnapshots;

    UIRenderer.toast = () => {};
    UIRenderer.handleError = () => { errorHandled = true; };
    StorageManager.renderSnapshots = async () => {};

    const handlers = createSnapshotHandlers({
        dom,
        appState,
        debouncedUpdate: () => {},
        applyAnnualInflation: () => {}
    });

    // Seed localStorage with state + tranchen (Snapshot muss beide enthalten).
    localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({ inputs: { foo: 1 }, lastState: { bar: 2 } }));
    localStorage.setItem('depot_tranchen', JSON.stringify([{ trancheId: 't1' }]));
    localStorage.setItem(PROFILE_STORAGE_KEYS.current, 'default');
    localStorage.setItem(PROFILE_STORAGE_KEYS.active, 'default');

    // --- TEST 1: createSnapshot generates canonical archive JSON ---
    {
        await handlers.handleJahresabschluss();
        const snapshots = await SnapshotArchive.listSnapshots();
        assert(snapshots.length >= 1, 'Snapshot archive entry should be created');
        assertEqual(snapshots[0].records, undefined, 'Snapshot list should not expose full records');
        const parsed = await SnapshotArchive.readSnapshot(snapshots[0].id);
        assertEqual(parsed.snapshotType, SNAPSHOT_TYPE, 'Snapshot should use canonical snapshot type');
        assert(parsed.records[CONFIG.STORAGE.LS_KEY], 'Snapshot should include app state');
        assert(parsed.records['depot_tranchen'], 'Snapshot should include depot_tranchen');
        assert(!Object.keys(parsed.records).some(key => key.startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX)), 'Snapshot should not include legacy snapshot keys');
    }

    // --- TEST 2: Snapshot label stored in archive entry ---
    {
        const snapshots = await SnapshotArchive.listSnapshots();
        assert(snapshots.some(entry => entry.label === 'TestLabel'), 'Snapshot archive entry should include label');
    }

    // --- TEST 3: restoreSnapshot restores data without clearing snapshot history or technical keys ---
    {
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
        localStorage.setItem('ui_panel_state', 'keep-me');
        const snapshot = await SnapshotArchive.createSnapshot({
            id: 'restore-test',
            label: 'RestoreTest',
            kind: 'manual',
            activeProfileId: 'default',
            activeProfileName: 'Default',
            records: {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify({ inputs: { a: 1 }, lastState: { b: 2 } }),
                [PROFILE_STORAGE_KEYS.current]: 'default',
                [PROFILE_STORAGE_KEYS.active]: 'default',
                [PROFILE_STORAGE_KEYS.registry]: JSON.stringify({ profiles: { default: { data: { depot_tranchen: 'from-snapshot-registry' } } } }),
                depot_tranchen: 'restored_value'
            }
        });
        localStorage.setItem('depot_tranchen', 'old');
        localStorage.setItem('profile_tagesgeld', 'old-profile-value');

        const restoreBtn = { dataset: { key: snapshot.id } };
        const event = { target: { closest: (sel) => (sel === '.restore-snapshot' ? restoreBtn : null) } };
        await handlers.handleSnapshotActions(event);

        assertEqual(localStorage.getItem('depot_tranchen'), 'restored_value', 'restoreSnapshot should restore localStorage data');
        assertEqual(localStorage.getItem('profile_tagesgeld'), null, 'restoreSnapshot should delete missing fachliche profile keys');
        assertEqual(localStorage.getItem('ui_panel_state'), 'keep-me', 'restoreSnapshot should keep technical UI keys');
        assert(await SnapshotArchive.readSnapshot(snapshot.id), 'restoreSnapshot should keep snapshot history');
        const registry = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEYS.registry));
        assert(registry.profiles.other, 'restoreSnapshot should preserve other registry profiles');
        assertEqual(registry.profiles.default.data.depot_tranchen, 'restored_value', 'restoreSnapshot should update restored profile data in current registry');
    }

    // --- TEST 4: Fehlerhafte Snapshots werden abgefangen ---
    {
        const prevRestore = StorageManager.restoreSnapshot;
        StorageManager.restoreSnapshot = async () => { throw new Error('Restore failed'); };
        const restoreBtn = { dataset: { key: 'broken' } };
        const event = { target: { closest: (sel) => (sel === '.restore-snapshot' ? restoreBtn : null) } };
        await handlers.handleSnapshotActions(event);
        assert(errorHandled, 'Errors should be handled via UIRenderer.handleError');
        StorageManager.restoreSnapshot = prevRestore;
    }

    // --- TEST 5: Snapshot contains inputs, tranchen, state ---
    {
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({ inputs: { foo: 1 }, lastState: { bar: 2 } }));
        localStorage.setItem('depot_tranchen', JSON.stringify([{ trancheId: 't1' }]));
        dom.inputs.profilName.value = 'WithTranchen';
        await handlers.handleJahresabschluss();

        const snapshotEntry = (await SnapshotArchive.listSnapshots()).find(entry => entry.label === 'WithTranchen');
        const parsed = await SnapshotArchive.readSnapshot(snapshotEntry.id);
        assert(parsed.records[CONFIG.STORAGE.LS_KEY], 'Snapshot should include inputs/state');
        assert(parsed.records['depot_tranchen'], 'Snapshot should include tranchen');
    }

    // --- TEST 6: Multiple snapshots coexist ---
    {
        dom.inputs.profilName.value = 'Second';
        await handlers.handleJahresabschluss();
        const snapshots = await SnapshotArchive.listSnapshots();
        assert(snapshots.length >= 2, 'Multiple snapshot archive entries should coexist');
    }

    // --- TEST 7: Restore aborts when snapshot profile is missing in current registry ---
    {
        const snapshot = await SnapshotArchive.createSnapshot({
            id: 'missing-profile-restore-test',
            label: 'MissingProfile',
            kind: 'manual',
            activeProfileId: 'deleted-profile',
            records: {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify({ inputs: { missing: true } }),
                [PROFILE_STORAGE_KEYS.current]: 'deleted-profile'
            }
        });
        localStorage.setItem(PROFILE_STORAGE_KEYS.current, 'default');
        localStorage.setItem(PROFILE_STORAGE_KEYS.active, 'default');
        localStorage.setItem(PROFILE_STORAGE_KEYS.registry, JSON.stringify({
            version: 1,
            currentProfileId: 'default',
            profiles: {
                default: { meta: { name: 'Default' }, data: {} }
            }
        }));
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({ inputs: { keep: true } }));

        const restoreBtn = { dataset: { key: snapshot.id } };
        const event = { target: { closest: (sel) => (sel === '.restore-snapshot' ? restoreBtn : null) } };
        errorHandled = false;
        await handlers.handleSnapshotActions(event);

        assert(errorHandled, 'Missing profile restore should be handled as error');
        assert(JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY)).inputs.keep, 'Missing profile restore should not mutate live state');
    }

    UIRenderer.toast = prevToast;
    UIRenderer.handleError = prevHandleError;
    StorageManager.renderSnapshots = prevRenderSnapshots;

    console.log('✅ Balance binder snapshots tests passed');
} finally {
    if (prevSetTimeout === undefined) delete global.setTimeout; else global.setTimeout = prevSetTimeout;
    if (prevLocation === undefined) delete global.location; else global.location = prevLocation;
    if (prevConfirm === undefined) delete global.confirm; else global.confirm = prevConfirm;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('--- Balance Binder Snapshots Tests Completed ---');
