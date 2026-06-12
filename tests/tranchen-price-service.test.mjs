"use strict";

import {
    checkProxyHealth,
    fetchProxyPrice,
    fetchProxySymbol
} from '../app/tranches/tranchen-price-service.js';

console.log('--- Tranchen Price Service Tests ---');

const previousFetch = global.fetch;
const previousSetTimeout = global.setTimeout;
const previousClearTimeout = global.clearTimeout;
const previousPerformance = global.performance;

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

try {
    global.performance = { now: () => 100 };

    console.log('Test 1: fetchProxyPrice reads valid proxy price');
    {
        const urls = [];
        global.fetch = async (url) => {
            urls.push(String(url));
            return jsonResponse({ price: 123.45 });
        };

        const price = await fetchProxyPrice(' VWCE ', 'http://proxy.local/');

        assertEqual(price, 123.45, 'Proxy price should be returned as number');
        assert(urls[0].includes('/quote?symbol=VWCE'), 'Symbol should be URL encoded and trimmed');
    }
    console.log('✓ fetchProxyPrice success OK');

    console.log('Test 2: fetchProxyPrice reports HTTP and incomplete responses');
    {
        global.fetch = async () => jsonResponse({ message: 'bad gateway' }, 502);
        let httpError = null;
        try {
            await fetchProxyPrice('FAIL', 'http://proxy.local');
        } catch (error) {
            httpError = error;
        }
        assert(httpError?.message.includes('Proxy HTTP 502'), 'HTTP errors should mention status');

        global.fetch = async () => jsonResponse({ price: null });
        let incompleteError = null;
        try {
            await fetchProxyPrice('EMPTY', 'http://proxy.local');
        } catch (error) {
            incompleteError = error;
        }
        assertEqual(incompleteError?.message, 'Proxy: no price', 'Incomplete price response should fail explicitly');
    }
    console.log('✓ fetchProxyPrice failure paths OK');

    console.log('Test 3: fetchProxyPrice turns aborts into timeout errors');
    {
        installImmediateTimers();
        global.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
            const rejectAsAbort = () => {
                const error = new Error('signal is aborted');
                error.name = 'AbortError';
                reject(error);
            };
            if (options.signal?.aborted) {
                rejectAsAbort();
                return;
            }
            options.signal.addEventListener('abort', rejectAsAbort);
        });

        let timeoutError = null;
        try {
            await fetchProxyPrice('SLOW', 'http://proxy.local');
        } catch (error) {
            timeoutError = error;
        }
        assert(timeoutError?.message.includes('Timeout nach 8000 ms'), 'Abort should be normalized as timeout');
    }
    console.log('✓ fetchProxyPrice timeout OK');

    console.log('Test 4: fetchProxySymbol prefers exact symbol, name hint and first result');
    {
        global.setTimeout = previousSetTimeout;
        global.clearTimeout = previousClearTimeout;
        global.fetch = async (url) => {
            const query = decodeURIComponent(String(url).split('q=')[1] || '');
            if (query === 'name') {
                return jsonResponse({ quotes: [
                    { symbol: 'AAA', shortname: 'Other Fund', exchange: 'XETRA' },
                    { symbol: 'BBB', shortname: 'Vanguard FTSE', exchange: 'GER' }
                ] });
            }
            return jsonResponse({ quotes: [
                { symbol: 'OTHER', exchange: 'XETRA' },
                { symbol: query.toUpperCase(), exchange: 'GER' }
            ] });
        };

        assertEqual(await fetchProxySymbol('vwce', 'http://proxy.local'), 'VWCE@GER', 'Exact symbol should win');
        assertEqual(await fetchProxySymbol('name', 'http://proxy.local', 'Vanguard'), 'BBB@GER', 'Name hint should resolve matching result');
    }
    console.log('✓ fetchProxySymbol resolution OK');

    console.log('Test 5: checkProxyHealth degrades visibly while keeping caller state usable');
    {
        installImmediateTimers();
        const statusEl = { textContent: '' };
        global.fetch = async () => {
            throw new Error('fetch failed');
        };

        await checkProxyHealth(statusEl, 'http://offline.local');

        assert(statusEl.textContent.includes('Proxy FEHLER'), 'Offline proxy should render visible degraded status');
        assert(statusEl.textContent.includes('fetch failed') || statusEl.textContent.includes('Timeout'), 'Status should include failure reason');
    }
    console.log('✓ checkProxyHealth degraded status OK');

    console.log('✅ Tranchen price service contract validated');
} finally {
    if (previousFetch === undefined) delete global.fetch; else global.fetch = previousFetch;
    global.setTimeout = previousSetTimeout;
    global.clearTimeout = previousClearTimeout;
    if (previousPerformance === undefined) delete global.performance; else global.performance = previousPerformance;
}

console.log('--- Tranchen Price Service Tests Completed ---');
