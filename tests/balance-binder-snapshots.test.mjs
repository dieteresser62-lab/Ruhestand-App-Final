import { createSnapshotHandlers } from '../balance-binder-snapshots.js';
import { StorageManager } from '../balance-storage.js';
import { UIRenderer } from '../balance-renderer.js';
import { CONFIG } from '../balance-config.js';

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

    // Seed localStorage with state + tranchen
    localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({ inputs: { foo: 1 }, lastState: { bar: 2 } }));
    localStorage.setItem('depot_tranchen', JSON.stringify([{ trancheId: 't1' }]));

    // --- TEST 1: createSnapshot generates valid JSON ---
    {
        await handlers.handleJahresabschluss();
        const snapshotKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX)) snapshotKeys.push(key);
        }
        assert(snapshotKeys.length >= 1, 'Snapshot key should be created');
        const raw = localStorage.getItem(snapshotKeys[0]);
        const parsed = JSON.parse(raw);
        assertEqual(parsed.snapshotType, 'full-localstorage', 'Snapshot should be full-localstorage');
        assert(parsed.localStorage[CONFIG.STORAGE.LS_KEY], 'Snapshot should include app state');
        assert(parsed.localStorage['depot_tranchen'], 'Snapshot should include depot_tranchen');
    }

    // --- TEST 2: Snapshot label stored in key ---
    {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX)) keys.push(key);
        }
        assert(keys.some(k => k.includes('--TestLabel')), 'Snapshot key should include label');
    }

    // --- TEST 3: restoreSnapshot restores state ---
    {
        const snapshotKey = CONFIG.STORAGE.SNAPSHOT_PREFIX + new Date().toISOString() + '--RestoreTest';
        const snapshotPayload = {
            snapshotType: 'full-localstorage',
            createdAt: new Date().toISOString(),
            localStorage: {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify({ inputs: { a: 1 }, lastState: { b: 2 } }),
                custom_key: 'value'
            }
        };
        localStorage.setItem(snapshotKey, JSON.stringify(snapshotPayload));
        localStorage.setItem('custom_key', 'old');

        const restoreBtn = { dataset: { key: snapshotKey } };
        const event = { target: { closest: (sel) => (sel === '.restore-snapshot' ? restoreBtn : null) } };
        await handlers.handleSnapshotActions(event);

        assertEqual(localStorage.getItem('custom_key'), 'value', 'restoreSnapshot should restore localStorage data');
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

        const snapshotKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX) && key.includes('WithTranchen')) snapshotKeys.push(key);
        }
        const raw = localStorage.getItem(snapshotKeys[0]);
        const parsed = JSON.parse(raw);
        assert(parsed.localStorage[CONFIG.STORAGE.LS_KEY], 'Snapshot should include inputs/state');
        assert(parsed.localStorage['depot_tranchen'], 'Snapshot should include tranchen');
    }

    // --- TEST 6: Multiple snapshots coexist ---
    {
        dom.inputs.profilName.value = 'Second';
        await handlers.handleJahresabschluss();
        const snapshotKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX)) snapshotKeys.push(key);
        }
        assert(snapshotKeys.length >= 2, 'Multiple snapshot keys should coexist');
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
