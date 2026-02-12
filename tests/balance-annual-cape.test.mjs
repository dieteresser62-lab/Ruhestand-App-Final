import { createMarketdataHandlers } from '../app/balance/balance-annual-marketdata.js';
import { CONFIG } from '../app/balance/balance-config.js';

console.log('--- Balance Annual CAPE Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(String(key)); },
        clear: () => { store.clear(); }
    };
}

function mockFetchWithSequence(sequence) {
    let call = 0;
    return async () => {
        const next = sequence[Math.min(call, sequence.length - 1)];
        call += 1;
        if (next instanceof Error) {
            throw next;
        }
        return next;
    };
}

function okTextResponse(text) {
    return {
        ok: true,
        text: async () => text
    };
}

const prevLocalStorage = global.localStorage;
const prevFetch = global.fetch;

try {
    global.localStorage = createLocalStorageMock();

    const dom = {
        inputs: {
            marketCapeRatio: { value: '' },
            capeRatio: { value: '' }
        },
        controls: {}
    };
    const appState = {};

    let updateCalls = 0;
    const handlers = createMarketdataHandlers({
        dom,
        appState,
        debouncedUpdate: () => { updateCalls += 1; },
        applyAnnualInflation: () => {}
    });

    // Test 1: Primary source success.
    {
        updateCalls = 0;
        global.fetch = mockFetchWithSequence([
            okTextResponse('2024.12 foo bar 31.2')
        ]);
        const result = await handlers.handleFetchCapeAuto();
        assertEqual(result.capeFetchStatus, 'ok_primary', 'primary source should succeed');
        assertClose(result.capeRatio, 31.2, 1e-9, 'cape value should parse from primary');
        assert(updateCalls >= 1, 'successful fetch should trigger debounced update');
    }

    // Test 2: Primary fails, mirror succeeds.
    {
        updateCalls = 0;
        global.fetch = mockFetchWithSequence([
            new Error('primary down'),
            okTextResponse('2024.11 x y 29.8')
        ]);
        const result = await handlers.handleFetchCapeAuto();
        assertEqual(result.capeFetchStatus, 'ok_fallback_mirror', 'mirror should be used as fallback');
        assertClose(result.capeRatio, 29.8, 1e-9, 'cape value should parse from mirror');
        assert(result.errors.some(e => e.includes('Primary fehlgeschlagen')), 'primary failure should be tracked');
    }

    // Test 3: No source available, stored fallback should be used.
    {
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
            capeMeta: { capeRatio: 27.4, capeAsOf: '2024-10-01', capeSource: 'stored_last_value' }
        }));
        global.fetch = mockFetchWithSequence([
            new Error('primary down'),
            new Error('mirror down')
        ]);
        const result = await handlers.handleFetchCapeAuto();
        assertEqual(result.capeFetchStatus, 'ok_fallback_stored', 'stored CAPE should be used when sources fail');
        assertClose(result.capeRatio, 27.4, 1e-9, 'stored CAPE ratio should be returned');
    }

    // Test 4: No source and no stored value.
    {
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({}));
        global.fetch = mockFetchWithSequence([
            new Error('primary down'),
            new Error('mirror down')
        ]);
        const result = await handlers.handleFetchCapeAuto();
        assertEqual(result.capeFetchStatus, 'error_no_source_no_stored', 'should report hard CAPE source failure');
        assert(Array.isArray(result.errors) && result.errors.length >= 2, 'source errors should be included');
    }

    // Test 5: Stale source warning.
    {
        global.fetch = mockFetchWithSequence([
            okTextResponse('2020.01 old old 24.0')
        ]);
        const result = await handlers.handleFetchCapeAuto();
        assertEqual(result.capeFetchStatus, 'warn_stale_source', 'very old CAPE should be marked stale');
    }

    console.log('✅ Balance annual CAPE tests passed');
} finally {
    if (prevFetch === undefined) delete global.fetch; else global.fetch = prevFetch;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('--- Balance Annual CAPE Tests Completed ---');
