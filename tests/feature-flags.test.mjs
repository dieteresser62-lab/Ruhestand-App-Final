console.log('--- Feature Flags Tests ---');

import { createLocalStorageAdapter } from '../app/shared/persistence-adapter-localstorage.js';
import { init, resetPersistenceForTests } from '../app/shared/persistence-facade.js';

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

function createMemoryAdapter(initial = {}) {
    const store = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
    return {
        async open() {},
        async loadAll() {
            return Object.fromEntries(store.entries());
        },
        async saveBatch({ upserts = [], deletes = [] } = {}) {
            deletes.forEach(key => store.delete(String(key)));
            upserts.forEach(([key, value]) => store.set(String(key), String(value)));
        }
    };
}

const prevLocalStorage = global.localStorage;
const prevAddEventListener = globalThis.addEventListener;
const prevDispatchEvent = globalThis.dispatchEvent;
const prevCustomEvent = globalThis.CustomEvent;
try {
    global.localStorage = createLocalStorageMock();
    const listeners = new Map();
    globalThis.addEventListener = (type, handler) => {
        const list = listeners.get(type) || [];
        list.push(handler);
        listeners.set(type, list);
    };
    globalThis.dispatchEvent = (event) => {
        (listeners.get(event.type) || []).forEach(handler => handler(event));
        return true;
    };
    globalThis.CustomEvent = class {
        constructor(type) {
            this.type = type;
        }
    };
    resetPersistenceForTests(createLocalStorageAdapter(() => global.localStorage));

    const { featureFlags, getDefaultFlags, isEnabled, toggleFlag } = await import(`../app/shared/feature-flags.js?test=${Date.now()}`);

    // --- TEST 1: Defaults ---
    {
        const defaults = getDefaultFlags();
        assertEqual(defaults.engineMode, 'adapter', 'Default engineMode should be adapter');
        assertEqual(defaults.useWorkers, false, 'Default useWorkers should be false');
    }

    // --- TEST 2: isEnabled + toggleFlag ---
    {
        featureFlags.reset();
        // Toggle muss sowohl in-memory als auch im Storage wirken.
        assertEqual(isEnabled('useWorkers'), false, 'useWorkers should be disabled by default');
        const next = toggleFlag('useWorkers');
        assertEqual(next, true, 'toggleFlag should return new value');
        assertEqual(isEnabled('useWorkers'), true, 'useWorkers should be enabled after toggle');

        const stored = JSON.parse(localStorage.getItem('featureFlags'));
        assertEqual(stored.useWorkers, true, 'toggleFlag should persist to localStorage');
    }

    // --- TEST 3: Invalid flag ---
    {
        let threw = false;
        try {
            toggleFlag('does_not_exist');
        } catch {
            threw = true;
        }
        assert(threw, 'toggleFlag should throw for unknown flag');
    }

    // --- TEST 4: Reload after async persistence initialization ---
    {
        resetPersistenceForTests(createMemoryAdapter({
            featureFlags: JSON.stringify({ useWorkers: false, debugLogging: true })
        }));
        await init();

        assertEqual(isEnabled('useWorkers'), false, 'persistence:initialized reloads flags from initialized backend');
        assertEqual(featureFlags.getAllFlags().debugLogging, true, 'persistence:initialized reloads additional backend flags');
    }

    console.log('✅ Feature flags tests passed');
} finally {
    resetPersistenceForTests(createLocalStorageAdapter());
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevAddEventListener === undefined) delete globalThis.addEventListener; else globalThis.addEventListener = prevAddEventListener;
    if (prevDispatchEvent === undefined) delete globalThis.dispatchEvent; else globalThis.dispatchEvent = prevDispatchEvent;
    if (prevCustomEvent === undefined) delete globalThis.CustomEvent; else globalThis.CustomEvent = prevCustomEvent;
}

console.log('--- Feature Flags Tests Completed ---');
