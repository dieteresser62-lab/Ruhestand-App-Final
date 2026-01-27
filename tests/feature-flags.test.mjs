console.log('--- Feature Flags Tests ---');

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
try {
    global.localStorage = createLocalStorageMock();

    const { featureFlags, getDefaultFlags, isEnabled, toggleFlag } = await import('../feature-flags.js');

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

    console.log('✅ Feature flags tests passed');
} finally {
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('--- Feature Flags Tests Completed ---');
