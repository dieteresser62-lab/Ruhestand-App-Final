// @ts-check

export const LOCAL_YAHOO_PROXY = 'http://127.0.0.1:8787';
export const QUOTE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const QUOTE_FUTURE_TOLERANCE_SECONDS = 5 * 60;

const LOCAL_PROXY_RETRIES = 2;
const LOCAL_PROXY_TIMEOUT_MS = 3500;
const YAHOO_SYMBOL_PATTERN = /^[A-Z0-9.^=-]{1,32}$/;

export class QuoteError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'QuoteError';
        this.code = code;
        this.details = details;
    }
}

function createQuoteError(code, message, details = {}) {
    return new QuoteError(code, message, details);
}

export function normalizeYahooSymbol(symbol) {
    const normalized = String(symbol || '').trim().toUpperCase();
    if (!YAHOO_SYMBOL_PATTERN.test(normalized) || normalized.includes('@')) {
        throw createQuoteError(
            'INVALID_SYMBOL',
            `Ungueltiges Yahoo-Symbol: ${normalized || '(leer)'}`,
            { symbol: normalized }
        );
    }
    return normalized;
}

function normalizeFetchError(error, timedOut) {
    if (error instanceof QuoteError) return error;
    const message = String(error?.message || error || 'Unbekannter Netzwerkfehler');
    if (timedOut) {
        return createQuoteError('REQUEST_TIMEOUT', `Proxy-Timeout: ${message}`);
    }
    if (error?.name === 'AbortError' || message.toLowerCase().includes('aborted')) {
        return createQuoteError('REQUEST_ABORTED', 'Kursabruf wurde abgebrochen.');
    }
    return createQuoteError('PROXY_UNREACHABLE', `Lokaler Kursproxy nicht erreichbar: ${message}`);
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const externalSignal = options?.signal;
    let timedOut = false;
    const abortFromExternal = () => controller.abort(externalSignal?.reason);

    if (externalSignal?.aborted) {
        throw createQuoteError('REQUEST_ABORTED', 'Kursabruf wurde abgebrochen.');
    }
    externalSignal?.addEventListener('abort', abortFromExternal, { once: true });
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        throw normalizeFetchError(error, timedOut);
    } finally {
        clearTimeout(timer);
        externalSignal?.removeEventListener('abort', abortFromExternal);
    }
}

function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(createQuoteError('REQUEST_ABORTED', 'Kursabruf wurde abgebrochen.'));
            return;
        }
        const onAbort = () => {
            clearTimeout(timer);
            reject(createQuoteError('REQUEST_ABORTED', 'Kursabruf wurde abgebrochen.'));
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve(undefined);
        }, ms);
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

function proxyErrorFromResponse(data, status) {
    const reportedCode = typeof data?.code === 'string' ? data.code : '';
    const fallbackCode = status === 404
        ? 'SYMBOL_NOT_FOUND'
        : status === 429
            ? 'PROVIDER_RATE_LIMITED'
            : status === 504
                ? 'PROVIDER_TIMEOUT'
                : status >= 500
                    ? 'PROVIDER_UNAVAILABLE'
                    : 'PROXY_HTTP_ERROR';
    const code = reportedCode || fallbackCode;
    const message = typeof data?.message === 'string' && data.message.trim()
        ? data.message.trim()
        : `Proxy HTTP ${status}`;
    return createQuoteError(code, message, { status });
}

function isRetriableProxyError(error) {
    return [
        'REQUEST_TIMEOUT',
        'PROXY_UNREACHABLE',
        'PROVIDER_TIMEOUT',
        'PROVIDER_UNAVAILABLE'
    ].includes(error?.code);
}

async function fetchProxyJson(proxyUrl, options = {}) {
    const retries = Number.isInteger(options.retries) ? Math.max(1, options.retries) : LOCAL_PROXY_RETRIES;
    const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, options.timeoutMs) : LOCAL_PROXY_TIMEOUT_MS;
    let lastError = null;

    for (let attempt = 0; attempt < retries; attempt += 1) {
        try {
            const res = await fetchWithTimeout(
                proxyUrl,
                { cache: 'no-store', signal: options.signal },
                timeoutMs
            );
            let data;
            try {
                data = await res.json();
            } catch {
                throw createQuoteError('INVALID_RESPONSE', 'Proxy-Antwort ist kein gueltiges JSON.');
            }
            if (!res.ok || data?.status === 'error') {
                throw proxyErrorFromResponse(data, res.status);
            }
            return data;
        } catch (error) {
            lastError = error instanceof QuoteError
                ? error
                : normalizeFetchError(error, false);
            if (!isRetriableProxyError(lastError) || attempt === retries - 1 || options.signal?.aborted) {
                throw lastError;
            }
            await sleep(200 * (attempt + 1), options.signal);
        }
    }
    throw lastError || createQuoteError('PROXY_UNREACHABLE', 'Lokaler Kursproxy nicht erreichbar.');
}

export function normalizeQuote(rawQuote, requestedSymbol, options = {}) {
    const requested = normalizeYahooSymbol(requestedSymbol);
    if (!rawQuote || typeof rawQuote !== 'object' || Array.isArray(rawQuote)) {
        throw createQuoteError('INVALID_RESPONSE', 'Proxy-Antwort enthaelt kein Quote-Objekt.');
    }

    let responseSymbol;
    try {
        responseSymbol = normalizeYahooSymbol(rawQuote.symbol);
    } catch {
        throw createQuoteError('INVALID_RESPONSE', 'Proxy-Antwort enthaelt kein gueltiges Symbol.');
    }
    if (responseSymbol !== requested) {
        throw createQuoteError(
            'SYMBOL_MISMATCH',
            `Antwortsymbol ${responseSymbol} entspricht nicht der Anfrage ${requested}.`,
            { requested, received: responseSymbol }
        );
    }

    const price = rawQuote.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        throw createQuoteError('INVALID_PRICE', 'Proxy-Antwort enthaelt keinen positiven endlichen Kurs.');
    }

    const currency = typeof rawQuote.currency === 'string'
        ? rawQuote.currency.trim().toUpperCase()
        : '';
    if (!currency) {
        throw createQuoteError('CURRENCY_MISSING', 'Proxy-Antwort enthaelt keine eindeutige Waehrung.');
    }
    if (currency !== 'EUR') {
        throw createQuoteError(
            'UNSUPPORTED_CURRENCY',
            `Waehrung ${currency} wird nicht unterstuetzt.`,
            { currency }
        );
    }

    const asOf = rawQuote.asOf;
    if (asOf === undefined || asOf === null || asOf === '') {
        throw createQuoteError('AS_OF_MISSING', 'Proxy-Antwort enthaelt keinen Kursstichtag.');
    }
    if (!Number.isInteger(asOf) || asOf <= 0) {
        throw createQuoteError('INVALID_AS_OF', 'Kursstichtag muss eine positive UTC-Unixsekunde sein.');
    }

    const nowSeconds = Number.isFinite(options.nowSeconds)
        ? Math.floor(options.nowSeconds)
        : Math.floor(Date.now() / 1000);
    if (asOf > nowSeconds + QUOTE_FUTURE_TOLERANCE_SECONDS) {
        throw createQuoteError('QUOTE_FROM_FUTURE', 'Kursstichtag liegt unzulaessig weit in der Zukunft.');
    }
    if (nowSeconds - asOf > QUOTE_MAX_AGE_SECONDS) {
        throw createQuoteError('QUOTE_STALE', 'Kurs ist aelter als sieben Kalendertage.');
    }

    const source = typeof rawQuote.source === 'string' ? rawQuote.source.trim() : '';
    if (!source) {
        throw createQuoteError('INVALID_RESPONSE', 'Proxy-Antwort enthaelt keine Kursquelle.');
    }

    return Object.freeze({
        symbol: responseSymbol,
        price,
        currency,
        asOf,
        source
    });
}

export async function fetchProxyPrice(symbol, proxyBase = LOCAL_YAHOO_PROXY, options = {}) {
    const requestedSymbol = normalizeYahooSymbol(symbol);
    const base = proxyBase.replace(/\/$/, '');
    const url = `${base}/quote?symbol=${encodeURIComponent(requestedSymbol)}`;
    const data = await fetchProxyJson(url, options);
    return normalizeQuote(data, requestedSymbol, options);
}

function normalizeSearchResultSymbol(result) {
    try {
        return normalizeYahooSymbol(result?.symbol);
    } catch {
        return null;
    }
}

export async function fetchProxySymbol(query, proxyBase = LOCAL_YAHOO_PROXY, nameHint, options = {}) {
    const url = `${proxyBase.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}`;
    const data = await fetchProxyJson(url, options);
    const results = Array.isArray(data?.quotes) ? data.quotes : [];
    if (!results.length) return null;
    const q = String(query || '').trim().toUpperCase();
    const exact = results.find(result => normalizeSearchResultSymbol(result) === q);
    if (exact) return normalizeSearchResultSymbol(exact);

    if (nameHint) {
        const name = String(nameHint).trim().toUpperCase();
        const byName = results.find(result => {
            const candidateName = String(result?.shortname || result?.longname || '').toUpperCase();
            return candidateName.includes(name) && normalizeSearchResultSymbol(result);
        });
        if (byName) return normalizeSearchResultSymbol(byName);
    }
    return results.map(normalizeSearchResultSymbol).find(Boolean) || null;
}

function formatQuoteError(error) {
    const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR';
    const message = error?.message || String(error);
    return `${code}: ${message}`;
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
        statusEl.textContent = `Proxy FEHLER (${stamp}) nach ${elapsed} ms - ${formatQuoteError(error)}`;
    }
}
