"use strict";

import { AppError } from './balance-config.js';
import { UIRenderer } from './balance-renderer.js';

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
            customList
                .filter(entry => typeof entry === 'string' && entry.trim().length > 0)
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

        // Strategie 3: Finnhub API (kostenlos, CORS-freundlich, aber braucht Demo-Key)
        try {
            const finnhubKey = localStorage.getItem('finnhubApiKey') || 'demo';
            const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`;

            const response = await fetch(finnhubUrl);

            if (response.ok) {
                const data = await response.json();

                if (data.c && data.c > 0) { // c = current price
                    return {
                        price: data.c,
                        date: new Date(data.t * 1000), // t = timestamp
                        ticker: ticker,
                        source: 'Finnhub (aktueller Kurs)'
                    };
                }
            }
        } catch (err) {
            // Finnhub API failed
        }

        // Alle Strategien fehlgeschlagen
        throw new AppError(
            `ETF-Daten konnten nicht abgerufen werden.\n\n` +
            `Ticker: ${ticker} (ISIN: ${isin})\n` +
            `Zieldatum: ${targetDate.toLocaleDateString('de-DE')}\n\n` +
            `Getestete APIs:\n` +
            `- Yahoo Finance via lokalem Proxy (localhost:8787)\n` +
            `- Optional: Custom Proxy (localStorage etfProxyUrl/etfProxyUrls)\n` +
            `- Finnhub API\n\n` +
            `Hinweise:\n` +
            `- Nutze den manuellen "Nachr." Button\n` +
            `- Importiere Daten via "CSV" Button\n` +
            `- Optional: localStorage "finnhubApiKey" setzen\n` +
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

    return {
        handleNachruecken,
        handleUndoNachruecken,
        handleNachrueckenMitETF
    };
}
