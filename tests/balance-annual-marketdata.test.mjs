import {
    ANNUAL_MARKET_DATA_META_KEY,
    ANNUAL_MARKET_DATA_SCHEMA_VERSION,
    createAnnualMarketDataRequest,
    createMarketdataHandlers,
    selectAnnualCloseQuote
} from '../app/balance/balance-annual-marketdata.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { UIRenderer } from '../app/balance/balance-renderer.js';

console.log('--- Balance Annual Marketdata Tests ---');

function unix(isoDateTime) {
    return Math.floor(new Date(isoDateTime).getTime() / 1000);
}

function yahooChart(timestamps, closes) {
    return {
        chart: {
            result: [{
                timestamp: timestamps,
                indicators: { quote: [{ close: closes }] }
            }]
        }
    };
}

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

function seedAnnualState(periodId = 'calendar-year:2025', marketDataMeta) {
    const state = {
        annualPeriodMetadata: {
            schemaVersion: 1,
            lastCommittedPeriod: null,
            pendingCommit: {
                periodId,
                phase: 'writes_started',
                snapshotId: 'snapshot-2025'
            }
        }
    };
    if (marketDataMeta !== undefined) state[ANNUAL_MARKET_DATA_META_KEY] = marketDataMeta;
    localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(state));
}

function createDom() {
    return {
        inputs: {
            endeVJ: { value: '120' },
            endeVJ_1: { value: '110' },
            endeVJ_2: { value: '100' },
            endeVJ_3: { value: '90' },
            ath: { value: '150' },
            jahreSeitAth: { value: '2' }
        },
        controls: {
            btnNachrueckenMitETF: null,
            btnUndoNachruecken: { style: { display: 'none' } }
        }
    };
}

function createHandlers(dom, appState = {}, options = {}) {
    const calls = { inflation: 0, update: 0 };
    return {
        calls,
        handlers: createMarketdataHandlers({
            dom,
            appState,
            debouncedUpdate: () => {
                calls.update += 1;
                return options.debouncedUpdate?.();
            },
            applyAnnualInflation: () => {
                calls.inflation += 1;
                return options.applyAnnualInflation?.();
            }
        })
    };
}

function okJsonResponse(data) {
    return {
        ok: true,
        json: async () => data
    };
}

const previous = {
    fetch: global.fetch,
    localStorage: global.localStorage,
    toast: UIRenderer.toast,
    handleError: UIRenderer.handleError
};

try {
    UIRenderer.toast = () => {};
    UIRenderer.handleError = () => {};

    console.log('Test 1: period id creates a stable UTC year-end request window');
    {
        const request = createAnnualMarketDataRequest('calendar-year:2025');
        assertEqual(request.targetYear, 2025, 'Zieljahr stammt aus der Perioden-ID');
        assertEqual(request.windowStart, '2025-12-27', 'Abruffenster beginnt am 27.12.');
        assertEqual(request.windowEnd, '2025-12-31', 'Abruffenster endet fachlich am 31.12.');
        assertEqual(new Date(request.period1 * 1000).toISOString(), '2025-12-27T00:00:00.000Z', 'period1 ist UTC-stabil');
        assertEqual(new Date(request.period2 * 1000).toISOString(), '2026-01-01T00:00:00.000Z', 'period2 ist der exklusive Folgejahresbeginn');
    }

    console.log('Test 2: malformed or unsupported period ids are rejected');
    {
        assertEqual(createAnnualMarketDataRequest('calendar-year:2025-extra'), null, 'Perioden-ID mit Suffix wird abgelehnt');
        assertEqual(createAnnualMarketDataRequest('year:2025'), null, 'Falscher Prefix wird abgelehnt');
        assertEqual(createAnnualMarketDataRequest('calendar-year:0999'), null, 'Jahr ausserhalb des Contracts wird abgelehnt');
        assertEqual(createAnnualMarketDataRequest(null), null, 'Fehlende Perioden-ID wird abgelehnt');
    }

    console.log('Test 3: latest valid target-year close wins independently of response order');
    {
        const data = yahooChart(
            [
                unix('2026-01-02T16:30:00Z'),
                unix('2025-12-30T16:30:00Z'),
                unix('2025-07-01T16:30:00Z'),
                unix('2025-12-29T16:30:00Z')
            ],
            [999, 131.25, 120, 130]
        );
        const quote = selectAnnualCloseQuote(data, {
            targetYear: 2025,
            ticker: 'VWCE.DE',
            source: 'Testquelle'
        });
        assertClose(quote.price, 131.25, 1e-9, 'Letzter gueltiger Schlusskurs wird gewaehlt');
        assertEqual(quote.asOf, '2025-12-30', 'Folgejahr und Jahresmitte werden nicht als Stichtag verwendet');
        assertEqual(quote.targetYear, 2025, 'Quote behaelt das explizite Zieljahr');
        assertEqual(quote.source, 'Testquelle', 'Quote behaelt die pruefbare Quelle');
    }

    console.log('Test 4: 27 December through 31 December are inclusive');
    {
        const quote27 = selectAnnualCloseQuote(
            yahooChart([unix('2025-12-27T12:00:00Z')], [125]),
            { targetYear: 2025 }
        );
        const quote31 = selectAnnualCloseQuote(
            yahooChart([unix('2025-12-31T12:00:00Z')], [132]),
            { targetYear: 2025 }
        );
        assertEqual(quote27.asOf, '2025-12-27', '27.12. ist als untere Grenze gueltig');
        assertEqual(quote31.asOf, '2025-12-31', '31.12. ist als obere Grenze gueltig');
    }

    console.log('Test 5: weekend and holiday gaps keep the last available close');
    {
        const quote = selectAnnualCloseQuote(
            yahooChart(
                [unix('2022-12-29T16:30:00Z'), unix('2022-12-30T16:30:00Z')],
                [96, 97]
            ),
            { targetYear: 2022 }
        );
        assertEqual(quote.asOf, '2022-12-30', 'Freitag bleibt letzter Kurs vor dem Wochenend-Jahresende');
        assertEqual(quote.price, 97, 'Der Preis des letzten Handelstags wird verwendet');
    }

    console.log('Test 6: stale, wrong-year, empty and implausible quotes fail closed');
    {
        assertEqual(
            selectAnnualCloseQuote(yahooChart([unix('2025-12-26T16:30:00Z')], [130]), { targetYear: 2025 }),
            null,
            'Kurs vor dem 27.12. wird als unvollstaendige Versorgung abgelehnt'
        );
        assertEqual(
            selectAnnualCloseQuote(yahooChart([unix('2024-12-31T16:30:00Z')], [130]), { targetYear: 2025 }),
            null,
            'Kurs aus falschem Jahr wird abgelehnt'
        );
        assertEqual(selectAnnualCloseQuote(yahooChart([], []), { targetYear: 2025 }), null, 'Leere Quotes werden abgelehnt');
        assertEqual(
            selectAnnualCloseQuote(
                yahooChart(
                    [
                        unix('2025-12-27T16:30:00Z'),
                        unix('2025-12-29T16:30:00Z'),
                        unix('2025-12-30T16:30:00Z'),
                        unix('2025-12-31T16:30:00Z')
                    ],
                    [0, -1, Number.NaN, Number.POSITIVE_INFINITY]
                ),
                { targetYear: 2025 }
            ),
            null,
            'Nichtpositive und nichtendliche Preise werden abgelehnt'
        );
        assertEqual(
            selectAnnualCloseQuote(
                yahooChart(
                    [unix('2025-12-30T16:30:00Z'), unix('2025-12-31T16:30:00Z')],
                    [0.49, 100000.01]
                ),
                { targetYear: 2025 }
            ),
            null,
            'Offensichtliche Skalierungsfehler ausserhalb des ETF-Preiscontracts werden abgelehnt'
        );
        assert(
            selectAnnualCloseQuote(
                yahooChart(
                    [unix('2025-12-30T16:30:00Z'), unix('2025-12-31T16:30:00Z')],
                    [0.5, 100000]
                ),
                { targetYear: 2025 }
            ),
            'Die expliziten Preisgrenzen bleiben inklusive'
        );
        assertEqual(selectAnnualCloseQuote({ chart: { result: [] } }, { targetYear: 2025 }), null, 'Fehlende Quote-Struktur wird abgelehnt');
    }

    console.log('Test 7: handler persists complete as-of metadata and consistent ATH evaluation');
    {
        global.localStorage = createLocalStorageMock();
        const previousMeta = {
            schemaVersion: 1,
            periodId: 'calendar-year:2024',
            targetYear: 2024,
            price: 120,
            asOf: '2024-12-30',
            ticker: 'VWCE.DE',
            source: 'Vorjahr',
            ath: { value: 150, yearsSince: 2, evaluatedAsOf: '2024-12-30', lastHighAsOf: '2022-12-30' }
        };
        seedAnnualState('calendar-year:2025', previousMeta);
        const dom = createDom();
        const appState = {};
        const { handlers, calls } = createHandlers(dom, appState);
        let requestedUrl = null;
        global.fetch = async url => {
            requestedUrl = String(url);
            return okJsonResponse(yahooChart([unix('2025-12-30T16:30:00Z')], [140.4]));
        };

        const result = await handlers.handleNachrueckenMitETF();
        const request = createAnnualMarketDataRequest('calendar-year:2025');
        const requested = new URL(requestedUrl);
        const stored = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY));
        const meta = stored[ANNUAL_MARKET_DATA_META_KEY];

        assertEqual(requested.searchParams.get('period1'), String(request.period1), 'Fetch verwendet period1 aus der Perioden-ID');
        assertEqual(requested.searchParams.get('period2'), String(request.period2), 'Fetch verwendet exklusives period2');
        assertEqual(dom.inputs.endeVJ.value, '140', 'Gerundeter Jahresendkurs wird in endeVJ gespeichert');
        assertEqual(dom.inputs.endeVJ_1.value, '120', 'Vorjahreskurs wird genau einmal nachgerueckt');
        assertEqual(dom.inputs.jahreSeitAth.value, '3', 'ATH-Jahre werden am selben Jahresendstichtag fortgeschrieben');
        assertEqual(result.asOf, '2025-12-30', 'Resultat enthaelt maschinenlesbaren Stichtag');
        assertEqual(result.targetYear, 2025, 'Resultat enthaelt Zieljahr');
        assertEqual(result.periodId, 'calendar-year:2025', 'Resultat enthaelt Perioden-ID');
        assertEqual(meta.schemaVersion, ANNUAL_MARKET_DATA_SCHEMA_VERSION, 'Persistenz enthaelt Schema-Version');
        assertEqual(meta.price, 140, 'Persistierter Preis entspricht endeVJ');
        assertEqual(meta.asOf, '2025-12-30', 'Persistenz enthaelt ISO-Stichtag');
        assertEqual(meta.ticker, 'VWCE.DE', 'Persistenz enthaelt Ticker');
        assertEqual(meta.source, 'Yahoo Finance (lokaler Proxy)', 'Persistenz enthaelt Quelle');
        assertEqual(meta.targetYear, 2025, 'Persistenz enthaelt Zieljahr');
        assertEqual(stored.inputs.endeVJ, meta.price, 'Persistierter Input und Metadatenpreis werden gemeinsam geschrieben');
        assertEqual(stored.inputs.jahreSeitAth, meta.ath.yearsSince, 'Persistierter ATH-Zaehler stimmt mit Metadaten ueberein');
        assertEqual(meta.ath.evaluatedAsOf, meta.asOf, 'ATH-Auswertung nutzt denselben Stichtag');
        assertEqual(meta.ath.lastHighAsOf, '2022-12-30', 'Bekannter letzter ATH-Stichtag bleibt erhalten');
        assertEqual(calls.inflation, 1, 'Inflationsfortschreibung folgt genau einmal auf gueltige Marktdaten');
        assertEqual(calls.update, 1, 'Gueltige Marktdaten triggern genau ein Update');
        assertEqual(dom.controls.btnUndoNachruecken.style.display, 'inline-flex', 'Gueltiges Nachruecken bleibt undo-faehig');

        handlers.handleUndoNachruecken();
        const restored = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY));
        assertEqual(dom.inputs.endeVJ.value, '120', 'Undo stellt den vorherigen Kurs wieder her');
        assertEqual(restored[ANNUAL_MARKET_DATA_META_KEY].periodId, 'calendar-year:2024', 'Undo stellt vorherige Stichtagsmetadaten wieder her');
        assertEqual(restored.inputs.endeVJ, 120, 'Undo persistiert den vorherigen Kurs gemeinsam mit den Metadaten');
        assertEqual(restored.inputs.jahreSeitAth, 2, 'Undo persistiert den vorherigen ATH-Zaehler gemeinsam mit den Metadaten');
    }

    console.log('Test 8: equal ATH resets years without claiming a new high');
    {
        global.localStorage = createLocalStorageMock();
        seedAnnualState();
        const dom = createDom();
        const { handlers } = createHandlers(dom);
        global.fetch = async () => okJsonResponse(
            yahooChart([unix('2025-12-31T16:30:00Z')], [150])
        );

        const result = await handlers.handleNachrueckenMitETF();
        const meta = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY))[ANNUAL_MARKET_DATA_META_KEY];
        assertEqual(result.ath.isNew, false, 'ATH-Gleichstand ist kein neues Hoch');
        assertEqual(result.ath.yearsSince, 0, 'ATH-Gleichstand setzt Jahre seit ATH auf null');
        assertEqual(meta.ath.lastHighAsOf, '2025-12-31', 'ATH-Gleichstand dokumentiert den aktuellen Stichtag');
    }

    console.log('Test 9: invalid annual coverage rejects before DOM and metadata mutation');
    {
        global.localStorage = createLocalStorageMock();
        seedAnnualState();
        const dom = createDom();
        const { handlers, calls } = createHandlers(dom);
        const beforeDom = JSON.stringify(dom.inputs);
        global.fetch = async () => okJsonResponse(
            yahooChart(
                [unix('2025-12-26T16:30:00Z'), unix('2026-01-02T16:30:00Z')],
                [140, 141]
            )
        );

        let thrown = null;
        try {
            await handlers.handleNachrueckenMitETF();
        } catch (err) {
            thrown = err;
        }
        const stored = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY));
        assert(thrown instanceof Error, 'Ungueltige Jahresendversorgung wirft einen Fehler');
        assertEqual(JSON.stringify(dom.inputs), beforeDom, 'Ungueltige Quotes mutieren keine Marktdatenfelder');
        assertEqual(stored[ANNUAL_MARKET_DATA_META_KEY], undefined, 'Ungueltige Quotes persistieren keine Metadaten');
        assertEqual(calls.inflation, 0, 'Ungueltige Quotes starten keine Inflationsmutation');
        assertEqual(calls.update, 0, 'Ungueltige Quotes triggern kein Update');
    }

    console.log('Test 10: missing active period rejects before fetch');
    {
        global.localStorage = createLocalStorageMock();
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({}));
        const dom = createDom();
        const { handlers } = createHandlers(dom);
        let fetchCalls = 0;
        global.fetch = async () => { fetchCalls += 1; return okJsonResponse(yahooChart([], [])); };
        let thrown = null;
        try {
            await handlers.handleNachrueckenMitETF();
        } catch (err) {
            thrown = err;
        }
        assert(thrown instanceof Error, 'Fehlende Perioden-ID blockiert den Handler');
        assertEqual(fetchCalls, 0, 'Ohne Perioden-ID beginnt kein Online-Abruf');
        assertEqual(dom.inputs.endeVJ.value, '120', 'Ohne Perioden-ID bleibt endeVJ unveraendert');
    }

    console.log('Test 11: malformed or future pending commits reject before fetch');
    {
        global.localStorage = createLocalStorageMock();
        seedAnnualState();
        let state = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY));
        state.annualPeriodMetadata.pendingCommit.phase = 'snapshot_confirmed';
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(state));
        const dom = createDom();
        const { handlers } = createHandlers(dom);
        let fetchCalls = 0;
        global.fetch = async () => { fetchCalls += 1; return okJsonResponse(yahooChart([], [])); };
        let invalidPhaseError = null;
        try {
            await handlers.handleNachrueckenMitETF();
        } catch (err) {
            invalidPhaseError = err;
        }
        assert(invalidPhaseError instanceof Error, 'Falsche Commit-Phase wird abgelehnt');

        seedAnnualState('calendar-year:9999');
        let futureError = null;
        try {
            await handlers.handleNachrueckenMitETF();
        } catch (err) {
            futureError = err;
        }
        assert(futureError instanceof Error, 'Noch nicht abgeschlossenes Zieljahr wird abgelehnt');
        assertEqual(fetchCalls, 0, 'Strukturell ungueltige oder zukuenftige Commits starten keinen Fetch');
        assertEqual(dom.inputs.endeVJ.value, '120', 'Commit-Contract-Fehler mutieren keine Marktdatenfelder');
    }

    console.log('Test 12: post-mutation failure rolls DOM and persistent marketdata back');
    {
        global.localStorage = createLocalStorageMock();
        const previousMeta = {
            schemaVersion: 1,
            periodId: 'calendar-year:2024',
            targetYear: 2024,
            price: 120,
            asOf: '2024-12-30',
            ticker: 'VWCE.DE',
            source: 'Vorjahr',
            ath: { value: 150, yearsSince: 2, evaluatedAsOf: '2024-12-30', lastHighAsOf: '2022-12-30' }
        };
        seedAnnualState('calendar-year:2025', previousMeta);
        const dom = createDom();
        const beforeDom = JSON.stringify(dom.inputs);
        const { handlers, calls } = createHandlers(dom, {}, {
            applyAnnualInflation: () => { throw new Error('inflation write failed'); }
        });
        global.fetch = async () => okJsonResponse(
            yahooChart([unix('2025-12-30T16:30:00Z')], [140])
        );
        let thrown = null;
        try {
            await handlers.handleNachrueckenMitETF();
        } catch (err) {
            thrown = err;
        }
        const stored = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY));
        assert(thrown instanceof Error, 'Fehler nach DOM-Mutation wird weitergereicht');
        assertEqual(JSON.stringify(dom.inputs), beforeDom, 'Fehler nach DOM-Mutation stellt alle Marktdatenfelder wieder her');
        assertEqual(stored[ANNUAL_MARKET_DATA_META_KEY].periodId, 'calendar-year:2024', 'Fehler stellt vorherige Stichtagsmetadaten wieder her');
        assertEqual(stored.inputs, undefined, 'Fehler persistiert keine neuen Marktdateninputs');
        assertEqual(calls.update, 0, 'Fehler vor erfolgreicher Mutation triggert kein nachgelagertes Update');
        assertEqual(dom.controls.btnUndoNachruecken.style.display, 'none', 'Fehlerpfad bietet kein irrefuehrendes Undo an');
    }

    console.log('Test 13: manual source-less rollover invalidates and undo restores as-of metadata');
    {
        global.localStorage = createLocalStorageMock();
        const previousMeta = {
            schemaVersion: 1,
            periodId: 'calendar-year:2024',
            targetYear: 2024,
            price: 120,
            asOf: '2024-12-30',
            ticker: 'VWCE.DE',
            source: 'Yahoo Finance (lokaler Proxy)',
            ath: { value: 150, yearsSince: 2, evaluatedAsOf: '2024-12-30', lastHighAsOf: '2022-12-30' }
        };
        seedAnnualState('calendar-year:2025', previousMeta);
        const dom = createDom();
        const { handlers } = createHandlers(dom);

        handlers.handleNachruecken();
        let stored = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY));
        assertEqual(stored[ANNUAL_MARKET_DATA_META_KEY], undefined, 'Manuelles Nachruecken laesst keine veraltete Online-Metadaten stehen');
        handlers.handleUndoNachruecken();
        stored = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY));
        assertEqual(stored[ANNUAL_MARKET_DATA_META_KEY].asOf, '2024-12-30', 'Undo stellt die Online-Stichtagsmetadaten wieder her');
    }

    console.log('Balance annual marketdata tests passed');
} finally {
    UIRenderer.toast = previous.toast;
    UIRenderer.handleError = previous.handleError;
    if (previous.fetch === undefined) delete global.fetch; else global.fetch = previous.fetch;
    if (previous.localStorage === undefined) delete global.localStorage; else global.localStorage = previous.localStorage;
}

console.log('--- Balance Annual Marketdata Tests Completed ---');
