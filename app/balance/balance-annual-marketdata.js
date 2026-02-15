/**
 * Module: Balance Annual Market Data
 * Purpose: Manages market data updates for the annual review process ("Nachrücken").
 *          It fetches ETF prices (e.g., Vanguard FTSE All-World) via Yahoo (local proxy and optional custom proxy)
 *          and updates the historical performance data (ATH, Years since ATH).
 * Usage: Used by balance-binder-annual.js to support the "Nachrücken" workflow.
 * Dependencies: balance-config.js, balance-renderer.js
 */
"use strict";

import { AppError } from './balance-config.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';

const CAPE_PLAUSIBILITY_MIN = 5;
const CAPE_PLAUSIBILITY_MAX = 80;
const CAPE_STALE_MONTHS = 18;
const CAPE_FETCH_TIMEOUT_MS = 12000;

const CAPE_SOURCES = {
    PRIMARY: {
        id: 'yale_ie_data_xls',
        label: 'Yale ie_data.xls (via r.jina.ai)',
        url: 'https://r.jina.ai/http://www.econ.yale.edu/~shiller/data/ie_data.xls'
    },
    MIRROR: {
        id: 'shillerdata_mirror',
        label: 'shillerdata mirror (via r.jina.ai)',
        url: 'https://r.jina.ai/http://www.shillerdata.com/market-data/'
    },
    STORED: {
        id: 'stored_last_value',
        label: 'Lokaler letzter CAPE-Stand'
    }
};

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function parseDateTokenToIso(token) {
    if (!token) return null;
    const text = String(token).trim();
    const m = text.match(/^((?:18|19|20)\d{2})[.\-\/](\d{1,2})$/);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
    return `${String(year)}-${String(month).padStart(2, '0')}-01`;
}

function monthsOld(isoDate) {
    if (!isoDate) return Infinity;
    const date = new Date(isoDate);
    if (!Number.isFinite(date.getTime())) return Infinity;
    const now = new Date();
    return ((now.getUTCFullYear() - date.getUTCFullYear()) * 12)
        + (now.getUTCMonth() - date.getUTCMonth());
}

function isCapePlausible(value) {
    return Number.isFinite(value) && value > CAPE_PLAUSIBILITY_MIN && value < CAPE_PLAUSIBILITY_MAX;
}

function parseCapeFromShillerText(text) {
    if (!text || typeof text !== 'string') return null;
    const lines = text.split(/\r?\n/);
    let best = null;
    for (const line of lines) {
        if (!line || line.length < 8) continue;
        const dateMatch = line.match(/\b(?:18|19|20)\d{2}[.\-\/](?:0?[1-9]|1[0-2])\b/);
        if (!dateMatch) continue;
        const isoDate = parseDateTokenToIso(dateMatch[0]);
        if (!isoDate) continue;
        const numericTokens = (line.match(/-?\d+(?:[.,]\d+)?/g) || [])
            .map(token => Number(token.replace(',', '.')))
            .filter(Number.isFinite);
        if (numericTokens.length === 0) continue;
        const candidateCape = numericTokens[numericTokens.length - 1];
        if (!isCapePlausible(candidateCape)) continue;
        if (!best || isoDate > best.capeAsOf) {
            best = {
                capeRatio: Number(candidateCape.toFixed(2)),
                capeAsOf: isoDate
            };
        }
    }
    return best;
}

async function fetchTextWithTimeout(url, timeoutMs = CAPE_FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.text();
    } finally {
        clearTimeout(timer);
    }
}

export function createMarketdataHandlers({
    dom,
    appState,
    debouncedUpdate,
    applyAnnualInflation
}) {
    const handleNachruecken = () => {
        appState.lastMarktData = {
            endeVJ: dom.inputs.endeVJ.value,
            endeVJ_1: dom.inputs.endeVJ_1.value,
            endeVJ_2: dom.inputs.endeVJ_2.value,
            endeVJ_3: dom.inputs.endeVJ_3.value,
            ath: dom.inputs.ath.value,
            jahreSeitAth: dom.inputs.jahreSeitAth.value
        };
        dom.inputs.endeVJ_3.value = dom.inputs.endeVJ_2.value;
        dom.inputs.endeVJ_2.value = dom.inputs.endeVJ_1.value;
        dom.inputs.endeVJ_1.value = dom.inputs.endeVJ.value;
        const ath = parseFloat(dom.inputs.ath.value) || 0;
        const endevj = parseFloat(dom.inputs.endeVJ.value) || 0;
        const j = parseFloat(dom.inputs.jahreSeitAth.value) || 0;
        dom.inputs.jahreSeitAth.value = (endevj >= ath) ? 0 : (j + 1);

        applyAnnualInflation();
        debouncedUpdate();
        dom.controls.btnUndoNachruecken.style.display = 'inline-flex';
    };

    const handleUndoNachruecken = () => {
        if (appState.lastMarktData) {
            Object.entries(appState.lastMarktData).forEach(([k, v]) => {
                dom.inputs[k].value = v;
            });
        }
        dom.controls.btnUndoNachruecken.style.display = 'none';
        debouncedUpdate();
    };

    const fetchVanguardETFPrice = async (targetDate) => {
        const ticker = 'VWCE.DE'; // Vanguard FTSE All-World in EUR (Xetra)
        const isin = 'IE00BK5BQT80'; // ISIN für alternative APIs
        const LOCAL_YAHOO_PROXY = 'http://127.0.0.1:8787';

        const formatDate = (date) => Math.floor(date.getTime() / 1000); // Unix timestamp

        // Starte am Zieldatum und gehe max. 10 Tage zurück (für Wochenenden/Feiertage)
        const targetTime = formatDate(targetDate);
        const startDate = new Date(targetDate);
        startDate.setDate(startDate.getDate() - 10);
        const startTime = formatDate(startDate);

        // Strategie 1: Yahoo Finance ueber lokalen Proxy
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startTime}&period2=${targetTime}&interval=1d`;
        const parseYahooResponse = (data, sourceLabel) => {
            if (data.chart?.result?.[0]) {
                const result = data.chart.result[0];
                const timestamps = result.timestamp;
                const quotes = result.indicators.quote[0];

                if (timestamps && quotes?.close) {
                    // Finde den letzten verfügbaren Schlusskurs
                    for (let i = timestamps.length - 1; i >= 0; i--) {
                        const price = quotes.close[i];
                        if (price !== null && !isNaN(price)) {
                            return {
                                price: price,
                                date: new Date(timestamps[i] * 1000),
                                ticker: ticker,
                                source: sourceLabel
                            };
                        }
                    }
                }
            }
            return null;
        };
        try {
            const proxyUrl = `${LOCAL_YAHOO_PROXY}/chart?symbol=${encodeURIComponent(ticker)}&period1=${startTime}&period2=${targetTime}&interval=1d`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const data = await response.json();
                const parsed = parseYahooResponse(data, 'Yahoo Finance (lokaler Proxy)');
                if (parsed) return parsed;
            }
        } catch (err) {
            // Yahoo Finance via local proxy failed, try fallback
        }

        const buildProxyUrl = (template, targetUrl) => {
            if (template.includes('{url}')) {
                return template.replace('{url}', encodeURIComponent(targetUrl));
            }
            return `${template}${encodeURIComponent(targetUrl)}`;
        };
        const proxyEntries = [];
        const rawCustomProxy = localStorage.getItem('etfProxyUrls') || localStorage.getItem('etfProxyUrl');
        if (rawCustomProxy) {
            let customList = [];
            try {
                const parsed = JSON.parse(rawCustomProxy);
                if (Array.isArray(parsed)) customList = parsed;
                else if (typeof parsed === 'string') customList = [parsed];
            } catch (err) {
                customList = [rawCustomProxy];
            }
            const isLocalUrl = (url) => {
                try {
                    const parsed = new URL(url.replace('{url}', 'placeholder'));
                    return ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
                } catch { return false; }
            };
            customList
                .filter(entry => typeof entry === 'string' && entry.trim().length > 0 && isLocalUrl(entry.trim()))
                .forEach(entry => {
                    proxyEntries.push({
                        name: 'Custom Proxy',
                        template: entry.trim()
                    });
                });
        }

        for (const proxy of proxyEntries) {
            try {
                const proxyUrl = buildProxyUrl(proxy.template, yahooUrl);
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const data = await response.json();
                    const parsed = parseYahooResponse(data, proxy.name);
                    if (parsed) return parsed;
                }
            } catch (err) {
                // Yahoo Finance via proxy failed, try next
            }
        }

        // Alle Strategien fehlgeschlagen
        throw new AppError(
            `ETF-Daten konnten nicht abgerufen werden.\n\n` +
            `Ticker: ${ticker} (ISIN: ${isin})\n` +
            `Zieldatum: ${targetDate.toLocaleDateString('de-DE')}\n\n` +
            `Getestete APIs:\n` +
            `- Yahoo Finance via lokalem Proxy (localhost:8787)\n` +
            `- Optional: Custom Proxy (localStorage etfProxyUrl/etfProxyUrls)\n\n` +
            `Hinweise:\n` +
            `- Nutze den manuellen "Nachr." Button\n` +
            `- Importiere Daten via "CSV" Button\n` +
            `- Optional: localStorage "etfProxyUrl" oder "etfProxyUrls" setzen\n` +
            `- Pruefe die Browser-Konsole (F12) fuer Details`
        );
    };

    const handleNachrueckenMitETF = async () => {
        const btn = dom.controls.btnNachrueckenMitETF;  // Kann undefined sein (wenn von Jahres-Update aufgerufen)
        const originalText = btn?.innerHTML;

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ ETF...';
            }

            // Zieldatum: aktuelles Tagesdatum
            const targetDate = new Date();

            if (btn) {
                const todayLabel = targetDate.toLocaleDateString('de-DE');
                UIRenderer.toast(`Rufe VWCE.DE Kurs vom ${todayLabel} ab...`);
            }

            // 1. ETF-Kurs abrufen
            const etfData = await fetchVanguardETFPrice(targetDate);

            // 2. Nachrücken durchführen (bestehende Logik)
            if (btn) {
                btn.innerHTML = '⏳ Nachr...';
            }

            // Speichere alte Werte für Undo und Rückgabe
            const oldATH = parseFloat(dom.inputs.ath.value) || 0;
            const oldJahreSeitAth = parseInt(dom.inputs.jahreSeitAth.value) || 0;

            appState.lastMarktData = {
                endeVJ: dom.inputs.endeVJ.value,
                endeVJ_1: dom.inputs.endeVJ_1.value,
                endeVJ_2: dom.inputs.endeVJ_2.value,
                endeVJ_3: dom.inputs.endeVJ_3.value,
                ath: dom.inputs.ath.value,
                jahreSeitAth: dom.inputs.jahreSeitAth.value
            };

            // Verschiebe die Werte
            dom.inputs.endeVJ_3.value = dom.inputs.endeVJ_2.value;
            dom.inputs.endeVJ_2.value = dom.inputs.endeVJ_1.value;
            dom.inputs.endeVJ_1.value = dom.inputs.endeVJ.value;

            // 3. Neuen ETF-Wert in Ende VJ eintragen (ohne Nachkommastellen)
            const etfPrice = Math.round(etfData.price);
            dom.inputs.endeVJ.value = etfPrice.toString();

            // 4. ATH-Logik anwenden
            const currentATH = oldATH;
            const newValue = etfPrice;
            const previousJahreSeitAth = oldJahreSeitAth;

            let isNewATH = false;
            let newJahreSeitAth = previousJahreSeitAth;

            if (newValue > currentATH) {
                // Neues Allzeithoch!
                dom.inputs.ath.value = etfPrice.toString();
                dom.inputs.jahreSeitAth.value = '0';
                isNewATH = true;
                newJahreSeitAth = 0;
            } else {
                // Kein neues ATH → Jahre erhöhen
                newJahreSeitAth = previousJahreSeitAth + 1;
                dom.inputs.jahreSeitAth.value = newJahreSeitAth.toString();
            }

            // 5. Inflation anwenden
            applyAnnualInflation();

            // 6. Update und Feedback
            debouncedUpdate();
            dom.controls.btnUndoNachruecken.style.display = 'inline-flex';

            const usedDate = etfData.date.toLocaleDateString('de-DE');
            const athStatus = isNewATH ? '🎯 Neues ATH!' : `Jahre seit ATH: ${newJahreSeitAth}`;

            if (btn) {
                UIRenderer.toast(
                    `✅ Nachrücken mit ETF abgeschlossen!\n` +
                    `VWCE.DE: ${etfPrice} € (${usedDate})\n` +
                    `Quelle: ${etfData.source}\n` +
                    `${athStatus}`
                );
            }

            // Rückgabe für Jahres-Update Modal
            return {
                price: etfPrice,
                date: usedDate,
                ticker: etfData.ticker,
                source: etfData.source,
                ath: {
                    old: oldATH,
                    new: isNewATH ? etfPrice : oldATH,
                    isNew: isNewATH,
                    yearsSince: newJahreSeitAth
                }
            };

        } catch (err) {
            console.error('Nachrücken mit ETF fehlgeschlagen:', err);
            UIRenderer.handleError(err);
            throw err; // Re-throw für Jahres-Update
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    };

    const updateCapeInputsIfPresent = (capeRatio) => {
        const value = toNumber(capeRatio);
        if (!Number.isFinite(value)) return;
        const target = Math.max(0, value);
        if (dom.inputs.marketCapeRatio) {
            dom.inputs.marketCapeRatio.value = target.toFixed(1);
        }
        if (dom.inputs.capeRatio) {
            dom.inputs.capeRatio.value = target.toFixed(1);
        }
    };

    const persistCapeMeta = (metaPatch) => {
        const state = StorageManager.loadState() || {};
        const currentMeta = state.capeMeta || {};
        state.capeMeta = {
            ...currentMeta,
            ...metaPatch
        };
        StorageManager.saveState(state);
    };

    const readStoredCapeMeta = () => {
        const state = StorageManager.loadState() || {};
        const meta = state.capeMeta || {};
        return {
            capeRatio: toNumber(meta.capeRatio),
            capeAsOf: meta.capeAsOf || null,
            capeSource: meta.capeSource || null,
            capeFetchStatus: meta.capeFetchStatus || null,
            capeUpdatedAt: meta.capeUpdatedAt || null
        };
    };

    const attemptCapeSource = async (source) => {
        const text = await fetchTextWithTimeout(source.url);
        const parsed = parseCapeFromShillerText(text);
        if (!parsed || !isCapePlausible(parsed.capeRatio)) {
            throw new Error('CAPE Parsing lieferte keinen plausiblen Wert');
        }
        return {
            capeRatio: parsed.capeRatio,
            capeAsOf: parsed.capeAsOf,
            capeSource: source.id
        };
    };

    const handleFetchCapeAuto = async () => {
        const nowIso = new Date().toISOString();
        const errors = [];
        const stored = readStoredCapeMeta();
        let resolved = null;
        let fetchStatus = 'error_no_source_no_stored';

        try {
            resolved = await attemptCapeSource(CAPE_SOURCES.PRIMARY);
            fetchStatus = 'ok_primary';
        } catch (err) {
            errors.push(`Primary fehlgeschlagen: ${err?.message || 'unbekannt'}`);
        }

        if (!resolved) {
            try {
                resolved = await attemptCapeSource(CAPE_SOURCES.MIRROR);
                fetchStatus = 'ok_fallback_mirror';
            } catch (err) {
                errors.push(`Mirror fehlgeschlagen: ${err?.message || 'unbekannt'}`);
            }
        }

        if (!resolved && Number.isFinite(stored.capeRatio) && stored.capeRatio > 0) {
            resolved = {
                capeRatio: stored.capeRatio,
                capeAsOf: stored.capeAsOf || null,
                capeSource: CAPE_SOURCES.STORED.id
            };
            fetchStatus = 'ok_fallback_stored';
        }

        if (resolved && monthsOld(resolved.capeAsOf) > CAPE_STALE_MONTHS) {
            fetchStatus = 'warn_stale_source';
        }

        if (resolved) {
            if (errors.length > 0) {
                console.info('[CAPE] Resolved with fallback path', {
                    fetchStatus,
                    resolvedSource: resolved.capeSource,
                    nonFatalErrors: errors
                });
            }
            const persistedMeta = {
                capeRatio: resolved.capeRatio,
                capeAsOf: resolved.capeAsOf,
                capeSource: resolved.capeSource,
                capeFetchStatus: fetchStatus,
                capeUpdatedAt: nowIso
            };
            persistCapeMeta(persistedMeta);
            updateCapeInputsIfPresent(resolved.capeRatio);
            debouncedUpdate();
            return {
                ...persistedMeta,
                sourceLabel: (resolved.capeSource === CAPE_SOURCES.PRIMARY.id)
                    ? CAPE_SOURCES.PRIMARY.label
                    : (resolved.capeSource === CAPE_SOURCES.MIRROR.id)
                        ? CAPE_SOURCES.MIRROR.label
                        : CAPE_SOURCES.STORED.label,
                errors
            };
        }

        const errorMeta = {
            capeRatio: Number.isFinite(stored.capeRatio) ? stored.capeRatio : null,
            capeAsOf: stored.capeAsOf || null,
            capeSource: stored.capeSource || null,
            capeFetchStatus: fetchStatus,
            capeUpdatedAt: nowIso
        };
        console.error('[CAPE] No source available and no stored fallback', {
            fetchStatus,
            errors,
            storedMeta: stored
        });
        persistCapeMeta(errorMeta);
        return {
            ...errorMeta,
            sourceLabel: errorMeta.capeSource || 'keine',
            errors
        };
    };

    return {
        handleNachruecken,
        handleUndoNachruecken,
        handleNachrueckenMitETF,
        handleFetchCapeAuto
    };
}
