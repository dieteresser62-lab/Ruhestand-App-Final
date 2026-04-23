// @ts-check

export const LOCAL_YAHOO_PROXY = 'http://127.0.0.1:8787';
const LOCAL_PROXY_RETRIES = 3;

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        const message = String(err?.message || '');
        if (err?.name === 'AbortError' || message.includes('signal is aborted')) {
            throw new Error(`Timeout nach ${timeoutMs} ms`);
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetriableProxyError(error) {
    const message = String(error?.message || '').toLowerCase();
    return (
        error?.name === 'AbortError' ||
        message.includes('timeout nach') ||
        message.includes('failed to fetch') ||
        message.includes('networkerror') ||
        message.includes('load failed') ||
        message.includes('fetch failed') ||
        message.includes('signal is aborted') ||
        message.includes('proxy http 502') ||
        message.includes('proxy http 503') ||
        message.includes('proxy http 504')
    );
}

async function fetchProxyJson(proxyUrl) {
    let lastError = null;
    for (let attempt = 0; attempt < LOCAL_PROXY_RETRIES; attempt++) {
        try {
            const res = await fetchWithTimeout(proxyUrl, { cache: 'no-store' }, 8000);
            if (!res.ok) {
                throw new Error(`Proxy HTTP ${res.status}`);
            }
            return await res.json();
        } catch (error) {
            lastError = error;
            if (!isRetriableProxyError(error) || attempt === LOCAL_PROXY_RETRIES - 1) {
                throw error;
            }
            await sleep(250 * (attempt + 1));
        }
    }
    throw lastError || new Error('Proxy request failed');
}

export async function fetchProxyPrice(symbol, proxyBase = LOCAL_YAHOO_PROXY) {
    const rawSymbol = String(symbol || '').trim();
    const base = proxyBase.replace(/\/$/, '');
    const url = `${base}/quote?symbol=${encodeURIComponent(rawSymbol)}`;
    const data = await fetchProxyJson(url);
    if (data && data.status === 'error') {
        throw new Error(data.message || 'Proxy: error');
    }
    const price = Number(data && data.price);
    if (Number.isFinite(price) && price > 0) return price;
    throw new Error('Proxy: no price');
}

export async function fetchProxySymbol(query, proxyBase = LOCAL_YAHOO_PROXY, nameHint) {
    const url = `${proxyBase.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}`;
    const data = await fetchProxyJson(url);
    if (data && data.status === 'error') {
        throw new Error(data.message || 'Proxy: error');
    }
    const results = data && Array.isArray(data.quotes) ? data.quotes : [];
    if (!results.length) return null;
    const q = String(query || '').toUpperCase();
    const exact = results.find(r => String(r.symbol || '').toUpperCase() === q);
    if (exact && exact.symbol) {
        const exchange = exact.exchange || '';
        return exchange ? `${exact.symbol}@${exchange}` : exact.symbol;
    }
    if (nameHint) {
        const name = String(nameHint).toUpperCase();
        const byName = results.find(r => String(r.shortname || r.longname || '').toUpperCase().includes(name));
        if (byName && byName.symbol) {
            const exchange = byName.exchange || '';
            return exchange ? `${byName.symbol}@${exchange}` : byName.symbol;
        }
    }
    const first = results[0];
    if (!first || !first.symbol) return null;
    return first.symbol;
}

export async function checkProxyHealth(statusEl, proxyBase = LOCAL_YAHOO_PROXY) {
    const base = proxyBase.replace(/\/$/, '');
    const startedAt = performance.now();
    statusEl.textContent = `Proxy-Check laeuft... (${base})`;
    try {
        const data = await fetchProxyJson(`${base}/search?q=VWCE`);
        const elapsed = Math.round(performance.now() - startedAt);
        const count = Array.isArray(data?.quotes) ? data.quotes.length : 0;
        const stamp = new Date().toLocaleString('de-DE');
        statusEl.textContent = `Proxy OK (${stamp}) - Antwort in ${elapsed} ms, Treffer: ${count}.`;
    } catch (error) {
        const elapsed = Math.round(performance.now() - startedAt);
        const stamp = new Date().toLocaleString('de-DE');
        const message = error?.message || String(error);
        statusEl.textContent = `Proxy FEHLER (${stamp}) nach ${elapsed} ms - ${message}`;
    }
}
