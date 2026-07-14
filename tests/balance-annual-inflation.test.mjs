import {
    INFLATION_RESULT_METRIC,
    createInflationHandlers
} from '../app/balance/balance-annual-inflation.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import { UIRenderer } from '../app/balance/balance-renderer.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { UIUtils } from '../app/balance/balance-utils.js';

console.log('--- Balance Annual Inflation Tests ---');

const TARGET_YEAR = 2025;
const NOW = new Date('2026-07-14T10:00:00.000Z');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: key => (store.has(String(key)) ? store.get(String(key)) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: key => { store.delete(String(key)); },
        clear: () => { store.clear(); },
        key: index => Array.from(store.keys())[index] || null,
        get length() { return store.size; }
    };
}

function createDom() {
    return {
        inputs: {
            aktuellesAlter: { value: '60' },
            inflation: { value: '2' },
            floorBedarf: { value: '1000' },
            flexBedarf: { value: '500' },
            minimumFlexAnnual: { value: '250' },
            flexBudgetAnnual: { value: '300' },
            flexBudgetRecharge: { value: '200' }
        },
        controls: {}
    };
}

function createResponse(payload, { status = 200, headers = {} } = {}) {
    const normalizedHeaders = new Map(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
    );
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: name => normalizedHeaders.get(String(name).toLowerCase()) || null },
        json: async () => payload
    };
}

function createEcbPayload({ year = TARGET_YEAR, rate = 2.2, suffix = 'AVR' } = {}) {
    return {
        header: { prepared: '2026-01-30T11:15:00Z' },
        structure: {
            dimensions: {
                series: [
                    { id: 'FREQ', values: [{ id: 'A' }] },
                    { id: 'REF_AREA', values: [{ id: 'DE' }] },
                    { id: 'ADJUSTMENT', values: [{ id: 'N' }] },
                    { id: 'ICP_ITEM', values: [{ id: '000000' }] },
                    { id: 'DATA_PROVIDER', values: [{ id: '4D0' }] },
                    { id: 'ICP_SUFFIX', values: [{ id: suffix }] }
                ],
                observation: [
                    { id: 'TIME_PERIOD', values: [{ id: String(year) }] }
                ]
            }
        },
        dataSets: [{
            series: {
                '0:0:0:0:0:0': { observations: { 0: [rate] } }
            }
        }]
    };
}

function createWorldBankPayload({
    year = TARGET_YEAR,
    rate = 2.3,
    indicator = 'FP.CPI.TOTL.ZG'
} = {}) {
    return [
        { lastupdated: '2026-06-20' },
        [{
            indicator: { id: indicator },
            countryiso3code: 'DEU',
            date: String(year),
            value: rate
        }]
    ];
}

function createOecdPayload({ year = TARGET_YEAR, rate = 2.4, transformation = 'GY' } = {}) {
    return {
        meta: { prepared: '2026-06-21T12:00:00Z' },
        data: {
            dataSets: [{
                structure: 0,
                observations: { '0:0:0:0:0:0:0:0:0': [rate] }
            }],
            structures: [{
                dimensions: {
                    observation: [
                        { id: 'REF_AREA', values: [{ id: 'DEU' }] },
                        { id: 'FREQ', values: [{ id: 'A' }] },
                        { id: 'METHODOLOGY', values: [{ id: 'N' }] },
                        { id: 'MEASURE', values: [{ id: 'CPI' }] },
                        { id: 'UNIT_MEASURE', values: [{ id: 'PA' }] },
                        { id: 'EXPENDITURE', values: [{ id: '_T' }] },
                        { id: 'ADJUSTMENT', values: [{ id: 'N' }] },
                        { id: 'TRANSFORMATION', values: [{ id: transformation }] },
                        { id: 'TIME_PERIOD', values: [{ id: String(year) }] }
                    ]
                }
            }]
        }
    };
}

function createHandlers(dom, options = {}) {
    return createInflationHandlers({
        dom,
        update: options.update || (() => {}),
        debouncedUpdate: options.debouncedUpdate || (() => {}),
        fetchImpl: options.fetchImpl,
        now: () => new Date(NOW),
        timeoutMs: 100,
        setTimeoutImpl: options.setTimeoutImpl || (() => 1),
        clearTimeoutImpl: options.clearTimeoutImpl || (() => {})
    });
}

function readNeeds(dom) {
    return {
        inflation: dom.inputs.inflation.value,
        floor: UIUtils.parseCurrency(dom.inputs.floorBedarf.value),
        flex: UIUtils.parseCurrency(dom.inputs.flexBedarf.value),
        minimumFlex: UIUtils.parseCurrency(dom.inputs.minimumFlexAnnual.value),
        annualBudget: UIUtils.parseCurrency(dom.inputs.flexBudgetAnnual.value),
        recharge: UIUtils.parseCurrency(dom.inputs.flexBudgetRecharge.value)
    };
}

const previous = {
    localStorage: global.localStorage,
    toast: UIRenderer.toast,
    handleError: UIRenderer.handleError,
    consoleError: console.error
};

try {
    global.localStorage = createLocalStorageMock();
    UIRenderer.toast = () => {};
    UIRenderer.handleError = () => {};
    console.error = () => {};

    console.log('Test 1: positive inflation compounds over ten annual applications');
    {
        const dom = createDom();
        const handlers = createHandlers(dom);
        const baseState = { lastState: { cumulativeInflationFactor: 1, lastInflationAppliedAtAge: 60 } };
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(baseState));

        for (let age = 61; age <= 70; age++) {
            dom.inputs.aktuellesAlter.value = String(age);
            handlers.applyAnnualInflation();
        }
        const factor = StorageManager.loadState().lastState.cumulativeInflationFactor;
        assertClose(factor, 1.219, 0.01, 'Cumulative inflation should be about 1.22 after ten years at 2%');
    }

    console.log('Test 2: direct need adjustment applies the same multiplicative formula');
    {
        localStorage.clear();
        const dom = createDom();
        const handlers = createHandlers(dom);
        handlers.applyInflationToBedarfe();
        const needs = readNeeds(dom);
        assertClose(needs.floor, 1020, 0.01, 'Floor should be adjusted by positive inflation');
        assertClose(needs.flex, 510, 0.01, 'Flex should be adjusted by positive inflation');
        assertClose(needs.minimumFlex, 255, 0.01, 'Minimum flex should be adjusted by positive inflation');
    }

    console.log('Test 3: deflation reduces both needs and the cumulative factor');
    {
        localStorage.clear();
        const dom = createDom();
        dom.inputs.inflation.value = '-5';
        const handlers = createHandlers(dom);
        handlers.applyInflationToBedarfe();
        assertClose(readNeeds(dom).floor, 950, 0.01, 'Deflation should reduce a positive need multiplicatively');

        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
            lastState: { cumulativeInflationFactor: 1.1, lastInflationAppliedAtAge: 70 }
        }));
        dom.inputs.aktuellesAlter.value = '71';
        handlers.applyAnnualInflation();
        assertClose(
            StorageManager.loadState().lastState.cumulativeInflationFactor,
            1.045,
            0.0001,
            'Deflation should reduce the cumulative factor with the same formula'
        );
    }

    console.log('Test 4: ECB returns the exact annual-average contract before financial mutation');
    {
        localStorage.clear();
        const dom = createDom();
        const seenSignals = [];
        const cleared = [];
        const handlers = createHandlers(dom, {
            fetchImpl: async (url, options) => {
                assert(url.includes('HICP/A.DE.N.000000.4D0.AVR'), 'ECB request should select annual HICP average growth');
                assert(url.includes(`startPeriod=${TARGET_YEAR}`), 'ECB request should select the completed target year');
                seenSignals.push(options.signal);
                return createResponse(createEcbPayload());
            },
            setTimeoutImpl: () => 41,
            clearTimeoutImpl: id => { cleared.push(id); }
        });

        const result = await handlers.handleFetchInflation();
        assertEqual(result.year, TARGET_YEAR, 'Inflation result should expose the exact target year');
        assertEqual(result.metric, INFLATION_RESULT_METRIC, 'Inflation result should expose the shared metric');
        assertEqual(result.fetchStatus, 'ok_primary_ecb', 'Inflation result should expose the primary fetch status');
        assertEqual(result.dataAsOf, '2026-01-30T11:15:00Z', 'Inflation result should expose source data vintage');
        assertClose(readNeeds(dom).floor, 1022, 0.01, 'Validated ECB rate should be applied to needs');
        assert(seenSignals[0] instanceof AbortSignal, 'ECB request should receive an AbortSignal');
        assertEqual(cleared[0], 41, 'ECB timeout should be cleaned up after success');
    }

    console.log('Test 5: wrong ECB year is rejected and World Bank fallback preserves deflation');
    {
        localStorage.clear();
        const dom = createDom();
        const calls = [];
        const handlers = createHandlers(dom, {
            fetchImpl: async url => {
                calls.push(url);
                if (url.includes('data-api.ecb.europa.eu')) {
                    return createResponse(createEcbPayload({ year: TARGET_YEAR - 1, rate: 9 }));
                }
                return createResponse(createWorldBankPayload({ rate: -0.5 }));
            }
        });

        const result = await handlers.handleFetchInflation();
        assertEqual(calls.length, 2, 'Wrong-year ECB data should trigger exactly one fallback');
        assertEqual(result.source, 'World Bank (CPI)', 'World Bank should resolve the rejected ECB response');
        assertEqual(result.fetchStatus, 'ok_fallback_world_bank', 'Fallback path should be explicit');
        assertClose(result.rate, -0.5, 0.0001, 'Negative World Bank inflation should remain negative');
        assertClose(readNeeds(dom).floor, 995, 0.01, 'Fallback deflation should reduce needs');
    }

    console.log('Test 6: incompatible responses fall through to the current OECD SDMX contract');
    {
        localStorage.clear();
        const dom = createDom();
        const calls = [];
        const handlers = createHandlers(dom, {
            fetchImpl: async url => {
                calls.push(url);
                if (url.includes('data-api.ecb.europa.eu')) return createResponse({}, { status: 503 });
                if (url.includes('api.worldbank.org')) {
                    return createResponse(createWorldBankPayload({ indicator: 'WRONG.INDICATOR' }));
                }
                assert(url.startsWith('https://sdmx.oecd.org/'), 'OECD fallback should use the current SDMX host');
                return createResponse(createOecdPayload());
            }
        });

        const result = await handlers.handleFetchInflation();
        assertEqual(calls.length, 3, 'OECD should be attempted after ECB and World Bank rejection');
        assertEqual(result.source, 'OECD (CPI)', 'OECD should resolve the compatible annual CPI value');
        assertEqual(result.fetchStatus, 'ok_fallback_oecd', 'OECD fallback status should be explicit');
        assertClose(result.rate, 2.4, 0.0001, 'OECD annual CPI value should be preserved');
    }

    console.log('Test 7: unavailable, out-of-range, and incompatible data never partially mutate inputs');
    {
        localStorage.clear();
        const dom = createDom();
        const beforeNeeds = readNeeds(dom);
        const beforeState = localStorage.getItem(CONFIG.STORAGE.LS_KEY);
        const cleared = [];
        const handlers = createHandlers(dom, {
            fetchImpl: async url => {
                if (url.includes('data-api.ecb.europa.eu')) {
                    return createResponse(createEcbPayload({ rate: 60 }));
                }
                if (url.includes('api.worldbank.org')) {
                    return createResponse(createWorldBankPayload({ rate: null }));
                }
                return createResponse(createOecdPayload({ transformation: '_Z' }));
            },
            setTimeoutImpl: (() => {
                let id = 0;
                return () => ++id;
            })(),
            clearTimeoutImpl: id => { cleared.push(id); }
        });

        let rejected = false;
        try {
            await handlers.handleFetchInflation();
        } catch (err) {
            rejected = true;
            assertEqual(err.context.attempts.length, 3, 'Failed result should retain all source attempts');
        }
        assert(rejected, 'Unacceptable data from all sources should reject');
        assertEqual(JSON.stringify(readNeeds(dom)), JSON.stringify(beforeNeeds), 'Failed fetch should not mutate financial inputs');
        assertEqual(localStorage.getItem(CONFIG.STORAGE.LS_KEY), beforeState, 'Failed fetch should not mutate stored state');
        assertEqual(cleared.length, 3, 'Every failed request should clean up its timeout');
    }

    console.log('Test 8: timeout aborts one source, cleans up, and permits the next source');
    {
        localStorage.clear();
        const dom = createDom();
        const timeoutCallbacks = [];
        const cleared = [];
        let requestCount = 0;
        const handlers = createHandlers(dom, {
            setTimeoutImpl: callback => {
                timeoutCallbacks.push(callback);
                return timeoutCallbacks.length;
            },
            clearTimeoutImpl: id => { cleared.push(id); },
            fetchImpl: async (url, options) => {
                requestCount++;
                if (url.includes('data-api.ecb.europa.eu')) {
                    timeoutCallbacks[timeoutCallbacks.length - 1]();
                    assert(options.signal.aborted, 'Timed-out ECB request should be aborted');
                    const abortError = new Error('aborted');
                    abortError.name = 'AbortError';
                    throw abortError;
                }
                return createResponse(createWorldBankPayload({ rate: 1.8 }));
            }
        });

        const result = await handlers.handleFetchInflation();
        assertEqual(requestCount, 2, 'Timeout should continue with the next source');
        assertEqual(result.fetchStatus, 'ok_fallback_world_bank', 'Timeout fallback should report its source path');
        assertEqual(cleared.length, 2, 'Timed-out and successful requests should both clean up timers');
    }

    console.log('Balance annual inflation tests passed');
} finally {
    console.error = previous.consoleError;
    UIRenderer.handleError = previous.handleError;
    UIRenderer.toast = previous.toast;
    if (previous.localStorage === undefined) delete global.localStorage;
    else global.localStorage = previous.localStorage;
}

console.log('--- Balance Annual Inflation Tests Completed ---');
