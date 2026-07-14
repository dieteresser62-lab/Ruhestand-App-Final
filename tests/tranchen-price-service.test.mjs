"use strict";

import { createRequire } from 'node:module';
import {
    checkProxyHealth,
    fetchProxyPrice,
    fetchProxySymbol,
    normalizeQuote,
    normalizeYahooSymbol,
    QUOTE_MAX_AGE_SECONDS
} from '../app/tranches/tranchen-price-service.js';

const require = createRequire(import.meta.url);
const nodeProxy = require('../tools/yahoo-proxy.cjs');

console.log('--- Tranchen Price Service Tests ---');

const previousFetch = global.fetch;
const previousSetTimeout = global.setTimeout;
const previousClearTimeout = global.clearTimeout;
const previousPerformance = global.performance;
const NOW = 1_800_000_000;

function installImmediateTimers() {
    global.setTimeout = (handler) => {
        handler();
        return 1;
    };
    global.clearTimeout = () => {};
}

function jsonResponse(body, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body
    };
}

async function captureError(action) {
    try {
        await action();
        return null;
    } catch (error) {
        return error;
    }
}

function validQuote(overrides = {}) {
    return {
        symbol: 'VWCE.DE',
        price: 123.45,
        currency: 'EUR',
        asOf: NOW - 60,
        source: 'yahoo-chart',
        ...overrides
    };
}

try {
    global.performance = { now: () => 100 };

    console.log('Test 1: fetchProxyPrice returns the normalized EUR quote contract');
    {
        const urls = [];
        global.fetch = async (url) => {
            urls.push(String(url));
            return jsonResponse(validQuote());
        };

        const quote = await fetchProxyPrice(' vwce.de ', 'http://proxy.local/', { nowSeconds: NOW });

        assertEqual(quote.symbol, 'VWCE.DE', 'Response should retain the normalized requested symbol');
        assertEqual(quote.price, 123.45, 'Quote price should be a number');
        assertEqual(quote.currency, 'EUR', 'Only EUR should pass');
        assertEqual(quote.asOf, NOW - 60, 'Quote should retain UTC epoch seconds');
        assertEqual(quote.source, 'yahoo-chart', 'Quote should expose provider source');
        assert(urls[0].includes('/quote?symbol=VWCE.DE'), 'Symbol should be URL encoded and normalized');
    }
    console.log('✓ normalized quote success OK');

    console.log('Test 2: foreign and missing currencies fail closed with stable codes');
    {
        for (const currency of ['USD', 'GBP', 'GBX']) {
            const error = await captureError(async () => normalizeQuote(
                validQuote({ currency }),
                'VWCE.DE',
                { nowSeconds: NOW }
            ));
            assertEqual(error?.code, 'UNSUPPORTED_CURRENCY', `${currency} must be rejected`);
            assert(error?.message.includes(currency), `${currency} rejection should remain visible`);
        }
        const missing = await captureError(async () => normalizeQuote(
            validQuote({ currency: '' }),
            'VWCE.DE',
            { nowSeconds: NOW }
        ));
        assertEqual(missing?.code, 'CURRENCY_MISSING', 'Missing currency must fail closed');
    }
    console.log('✓ currency rejection OK');

    console.log('Test 3: timestamp, symbol and price validation reject ambiguous responses');
    {
        const cases = [
            [validQuote({ asOf: null }), 'AS_OF_MISSING'],
            [validQuote({ asOf: NOW - QUOTE_MAX_AGE_SECONDS - 1 }), 'QUOTE_STALE'],
            [validQuote({ asOf: NOW + 301 }), 'QUOTE_FROM_FUTURE'],
            [validQuote({ price: 0 }), 'INVALID_PRICE'],
            [validQuote({ price: -1 }), 'INVALID_PRICE'],
            [validQuote({ price: Number.NaN }), 'INVALID_PRICE'],
            [validQuote({ symbol: 'OTHER.DE' }), 'SYMBOL_MISMATCH']
        ];
        for (const [payload, expectedCode] of cases) {
            const error = await captureError(async () => normalizeQuote(payload, 'VWCE.DE', { nowSeconds: NOW }));
            assertEqual(error?.code, expectedCode, `Invalid quote should fail with ${expectedCode}`);
        }
        assertEqual(normalizeYahooSymbol(' sap.de '), 'SAP.DE', 'Yahoo symbols should normalize deterministically');
        const suffixError = await captureError(async () => normalizeYahooSymbol('SAP@GER'));
        assertEqual(suffixError?.code, 'INVALID_SYMBOL', '@exchange suffix must be rejected');
    }
    console.log('✓ strict quote validation OK');

    console.log('Test 4: HTTP, provider and malformed-response failures retain stable codes');
    {
        for (const [status, body, expectedCode] of [
            [404, { status: 'error', code: 'SYMBOL_NOT_FOUND', message: 'unknown' }, 'SYMBOL_NOT_FOUND'],
            [429, { status: 'error', code: 'PROVIDER_RATE_LIMITED', message: 'slow down' }, 'PROVIDER_RATE_LIMITED'],
            [500, { status: 'error', code: 'PROVIDER_UNAVAILABLE', message: 'down' }, 'PROVIDER_UNAVAILABLE']
        ]) {
            global.fetch = async () => jsonResponse(body, status);
            const error = await captureError(() => fetchProxyPrice(
                'VWCE.DE',
                'http://proxy.local',
                { nowSeconds: NOW, retries: 1 }
            ));
            assertEqual(error?.code, expectedCode, `HTTP ${status} should map to ${expectedCode}`);
        }

        global.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } });
        const malformed = await captureError(() => fetchProxyPrice(
            'VWCE.DE',
            'http://proxy.local',
            { nowSeconds: NOW, retries: 1 }
        ));
        assertEqual(malformed?.code, 'INVALID_RESPONSE', 'Malformed JSON must be distinguished');
    }
    console.log('✓ transport error codes OK');

    console.log('Test 5: per-request timeout and external batch abort are distinct');
    {
        installImmediateTimers();
        global.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
            const rejectAsAbort = () => {
                const error = new Error('signal is aborted');
                error.name = 'AbortError';
                reject(error);
            };
            if (options.signal?.aborted) rejectAsAbort();
            else options.signal?.addEventListener('abort', rejectAsAbort, { once: true });
        });
        const timeout = await captureError(() => fetchProxyPrice(
            'SLOW.DE',
            'http://proxy.local',
            { nowSeconds: NOW, retries: 1, timeoutMs: 10 }
        ));
        assertEqual(timeout?.code, 'REQUEST_TIMEOUT', 'Internal timeout should be normalized');

        global.setTimeout = previousSetTimeout;
        global.clearTimeout = previousClearTimeout;
        const controller = new AbortController();
        let notifyStarted;
        const started = new Promise(resolve => { notifyStarted = resolve; });
        global.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
            notifyStarted();
            options.signal?.addEventListener('abort', () => {
                const error = new Error('aborted');
                error.name = 'AbortError';
                reject(error);
            }, { once: true });
        });
        const request = captureError(() => fetchProxyPrice(
            'SLOW.DE',
            'http://proxy.local',
            { nowSeconds: NOW, retries: 1, signal: controller.signal }
        ));
        await started;
        controller.abort();
        const aborted = await request;
        assertEqual(aborted?.code, 'REQUEST_ABORTED', 'External abort should not be reported as timeout');
    }
    console.log('✓ timeout and abort contract OK');

    console.log('Test 6: symbol search returns provider symbols without proprietary suffixes');
    {
        global.fetch = async (url) => {
            const query = decodeURIComponent(String(url).split('q=')[1] || '');
            if (query === 'name') {
                return jsonResponse({ quotes: [
                    { symbol: 'AAA', shortname: 'Other Fund', exchange: 'XETRA' },
                    { symbol: 'BBB.DE', shortname: 'Vanguard FTSE', exchange: 'GER' }
                ] });
            }
            return jsonResponse({ quotes: [
                { symbol: 'INVALID@GER', exchange: 'GER' },
                { symbol: query.toUpperCase(), exchange: 'GER' }
            ] });
        };

        assertEqual(await fetchProxySymbol('vwce.de', 'http://proxy.local'), 'VWCE.DE', 'Exact Yahoo symbol should win');
        assertEqual(await fetchProxySymbol('name', 'http://proxy.local', 'Vanguard'), 'BBB.DE', 'Name hint should resolve valid symbol');
    }
    console.log('✓ symbol search contract OK');

    console.log('Test 7: Node proxy pure contract matches browser normalization');
    {
        const candidate = nodeProxy.pickChartCandidate({ chart: { result: [{
            meta: {
                symbol: 'VWCE.DE',
                regularMarketPrice: 123.45,
                regularMarketTime: NOW - 60,
                currency: 'EUR'
            }
        }] } });
        const proxyQuote = nodeProxy.normalizeProviderQuote('vwce.de', candidate, NOW);
        const browserQuote = normalizeQuote(proxyQuote, 'VWCE.DE', { nowSeconds: NOW });
        assertEqual(JSON.stringify(browserQuote), JSON.stringify(proxyQuote), 'Node and browser success shapes should match');
        assertEqual(nodeProxy.normalizeYahooSymbol('vwce.de'), 'VWCE.DE', 'Node proxy should use same symbol normalization');

        for (const currency of ['USD', 'GBP', 'GBX']) {
            const error = await captureError(async () => nodeProxy.normalizeProviderQuote(
                'VWCE.DE',
                { ...candidate, currency },
                NOW
            ));
            assertEqual(error?.code, 'UNSUPPORTED_CURRENCY', `Node proxy should reject ${currency}`);
        }
    }
    console.log('✓ Node/browser parity OK');

    console.log('Test 8: healthcheck distinguishes an unreachable proxy visibly');
    {
        const statusEl = { textContent: '' };
        global.fetch = async () => { throw new Error('fetch failed'); };

        await checkProxyHealth(statusEl, 'http://offline.local');

        assert(statusEl.textContent.includes('Proxy FEHLER'), 'Offline proxy should render visible degraded status');
        assert(statusEl.textContent.includes('PROXY_UNREACHABLE'), 'Status should retain stable reachability code');
    }
    console.log('✓ healthcheck error detail OK');

    console.log('✅ Tranchen price service contract validated');
} finally {
    if (previousFetch === undefined) delete global.fetch; else global.fetch = previousFetch;
    global.setTimeout = previousSetTimeout;
    global.clearTimeout = previousClearTimeout;
    if (previousPerformance === undefined) delete global.performance; else global.performance = previousPerformance;
}

console.log('--- Tranchen Price Service Tests Completed ---');
