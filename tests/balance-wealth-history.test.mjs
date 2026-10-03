import { createBalanceWealthHistoryService, createManualWealthHistoryController } from '../app/balance/balance-wealth-history.js';
import { BALANCE_UPDATE_MODE } from '../app/balance/balance-update-pipeline.js';
import { createSnapshotHandlers } from '../app/balance/balance-binder-snapshots.js';
import { UIBinder, initUIBinder } from '../app/balance/balance-binder.js';
import { loadProfilverbundProfiles } from '../app/profile/profilverbund-balance.js';
import { createProfilverbundHandlers } from '../app/balance/balance-main-profilverbund.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import { UIRenderer } from '../app/balance/balance-renderer.js';
import { UIReader } from '../app/balance/balance-reader.js';
import { createBalanceExportDocument } from '../app/balance/balance-binder-imports.js';
import { refreshBalanceWealthHistory } from '../app/balance/balance-wealth-history-renderer.js';
import { PROFILE_STORAGE_KEYS } from '../app/profile/profile-state.js';
import {
    PersistenceFacade, persistenceStorage, resetPersistenceForTests,
    resetPersistenceRuntimeForTests
} from '../app/shared/persistence-facade.js';
import { createManualWealthHistoryEntry } from '../types/wealth-history-contract.js';
import { runInNewContext } from 'node:vm';
import { installWealthBrowserUpdateObserver } from './browser-smoke.test.mjs';

console.log('--- Vermögensverlauf: Persistenz und Jahresabschluss ---');

// addInitScript serialisiert den Hook in jedes neue Seitendokument. Ein bereits
// beim Start geplanter Timer muss vor der späteren Idle-/Tabprüfung sichtbar sein.
for (const phase of ['Start', 'Reload']) {
    const scheduled = new Map();
    let nextId = 0;
    const window = {
        setTimeout(callback, delay, ...args) {
            const id = ++nextId;
            scheduled.set(id, () => callback(...args));
            return id;
        },
        clearTimeout(id) { scheduled.delete(id); }
    };
    const install = () => runInNewContext(`(${installWealthBrowserUpdateObserver.toString()})()`, { window });
    const fire = id => {
        const callback = scheduled.get(id);
        scheduled.delete(id);
        callback();
    };
    install();
    let updates = 0;
    const startup = window.setTimeout(() => { updates += 1; }, 250);
    const hook = window.setTimeout;
    install();
    assertEqual(window.setTimeout, hook, `${phase}: erneute Installation verschachtelt keinen Hook`);
    assert(window.__wealthPendingUpdates.has(startup), `${phase}: vor Idle geplanter Startupdate ist ausstehend`);
    assertEqual(updates, 0, `${phase}: Beobachtung führt Startupdate nicht vorzeitig aus`);
    window.clearTimeout(startup);
    assertEqual(window.__wealthPendingUpdates.size, 0, `${phase}: Abbruch entfernt den Starttimer`);
    assert(!scheduled.has(startup), `${phase}: Abbruch erreicht den ursprünglichen Scheduler`);
    let followup;
    const replacement = window.setTimeout(amount => {
        updates += amount;
        assert(window.__wealthPendingUpdates.has(replacement), `${phase}: laufender Callback bleibt ausstehend`);
        followup = window.setTimeout(() => { updates += 1; }, 250);
    }, 250, 2);
    fire(replacement);
    assertEqual(updates, 2, `${phase}: Callbackargumente bleiben erhalten`);
    assertEqual(window.__wealthPendingUpdates.size, 1, `${phase}: Folgeupdate verhindert vorzeitiges Idle`);
    assert(window.__wealthPendingUpdates.has(followup), `${phase}: Folgeupdate bleibt beobachtet`);
    fire(followup);
    assertEqual(updates, 3, `${phase}: Folgeupdate ausgeführt`);
    assertEqual(window.__wealthPendingUpdates.size, 0, `${phase}: Idle erst nach letztem Callback`);
    const unrelated = window.setTimeout(() => {}, 3500);
    assertEqual(window.__wealthPendingUpdates.size, 0, `${phase}: Meldungstimer blockiert Idle nicht`);
    fire(unrelated);
    const failure = window.setTimeout(() => { throw new Error('Startupdate fehlgeschlagen'); }, 250);
    let error;
    try { fire(failure); } catch (caught) { error = caught; }
    assertEqual(error?.message, 'Startupdate fehlgeschlagen', `${phase}: Callbackfehler bleibt sichtbar`);
    assertEqual(window.__wealthPendingUpdates.size, 0, `${phase}: fehlerhafter Callback hinterlässt keinen Timer`);
}

const STATE = CONFIG.STORAGE.LS_KEY;
const REGISTRY = PROFILE_STORAGE_KEYS.registry;
const SOURCE = { tagesgeld: 12000, geldmarktEtf: 23000, depotwertAlt: 34000, depotwertNeu: 45000 };
const RESULT = { ok: true, inputData: SOURCE, modelResult: { newState: { tagesgeld: 999999 } } };
const manual = createManualWealthHistoryEntry(SOURCE, '2026-06-01');
const reference = new Date(2027, 0, 15, 12);

function historyDom(open = false) {
    return {
        panel: { classList: { contains: name => name === 'active' && open,
            add: () => { open = true; }, remove: () => { open = false; } } },
        date: { textContent: '' },
        count: { textContent: '' }, chart: { innerHTML: '' }, table: { innerHTML: '' },
        hint: { textContent: '' }, status: { textContent: '' }
    };
}


function deferred() {
    let resolve;
    const promise = new Promise(r => { resolve = r; });
    return { promise, resolve };
}

async function rejects(operation, message) {
    let failed = false;
    try { await operation(); } catch { failed = true; }
    assert(failed, message);
}

async function setup() {
    const initialState = {
        inputs: { aktuellesAlter: 67, tagesgeld: 4, geldmarktEtf: 5, depotwertAlt: 6, depotwertNeu: 7 },
        lastState: { cumulativeInflationFactor: 1 },
        wealthHistory: { schemaVersion: 1, entries: [manual] }
    };
    const initial = {
        [STATE]: JSON.stringify(initialState),
        [PROFILE_STORAGE_KEYS.current]: 'a',
        [PROFILE_STORAGE_KEYS.active]: 'a',
        [REGISTRY]: JSON.stringify({ version: 1, profiles: {
            a: { meta: { id: 'a', name: 'A' }, data: { [STATE]: JSON.stringify(initialState), profile_tagesgeld: '4' } },
            b: { meta: { id: 'b', name: 'B' }, data: { [STATE]: JSON.stringify({ wealthHistory: { schemaVersion: 1, entries: [manual] } }) } }
        } })
    };
    const store = new Map(Object.entries(initial));
    const snapshots = new Map();
    const faults = { write: false, readback: false, flush: false, readGate: null, manual: false };
    let corruptNextRead = false;
    const adapter = {
        name: 'wealth-test-memory',
        async open() {},
        async loadAll() {
            if (faults.readGate) {
                const gate = faults.readGate;
                faults.readGate = null;
                gate.entered.resolve();
                await gate.release.promise;
            }
            const records = Object.fromEntries(store);
            if (corruptNextRead) {
                corruptNextRead = false;
                records[STATE] = '{}';
            }
            return records;
        },
        async saveBatch({ upserts, deletes }) {
            if (faults.flush) { faults.flush = false; throw new Error('flush failed'); }
            const isFinal = upserts.some(([key, raw]) => key === STATE &&
                (JSON.parse(raw).annualPeriodMetadata?.lastCommittedPeriod === 'calendar-year:2026'
                    || (faults.manual && JSON.parse(raw).wealthHistory?.entries.some(entry => entry.id === 'manual:2026-12-31'))));
            if (isFinal && faults.write) { faults.write = false; throw new Error('write failed'); }
            deletes.forEach(key => store.delete(key));
            upserts.forEach(([key, value]) => store.set(key, value));
            if (isFinal && faults.readback) { faults.readback = false; corruptNextRead = true; }
        },
        async listSnapshots() { return [...snapshots.values()].map(({ records, ...entry }) => entry); },
        async readSnapshot(id) { return structuredClone(snapshots.get(id)); },
        async writeSnapshot(snapshot) { snapshots.set(snapshot.id, structuredClone(snapshot)); },
        async deleteSnapshot(id) { snapshots.delete(id); }
    };
    resetPersistenceForTests(adapter);
    await PersistenceFacade.init();
    const service = createBalanceWealthHistoryService();
    const dom = {
        inputs: { profilName: { value: 'A' }, aktuellesAlter: { value: '67' }, tagesgeld: { value: '999' } },
        expenses: { yearSelect: { value: '2026' } },
        outputs: { snapshotList: {} }, controls: { snapshotStatus: {} }
    };
    const counts = { commits: 0, updates: 0, renders: 0, confirmations: 0 };
    const createHandlers = (overrides = {}) => createSnapshotHandlers({
        dom, appState: { snapshotHandle: null }, wealthHistory: service,
        onAnnualWealthSaved: () => { counts.confirmations += 1; },
        getReferenceDate: () => reference,
        getLegacyDecision: () => 'not_committed',
        validateLiveState: () => RESULT,
        flushLiveState: () => PersistenceFacade.flush(),
        applyAnnualInflation: () => {},
        runAnnualUpdate: async () => { counts.updates += 1; dom.inputs.aktuellesAlter.value = '68'; return { ok: true }; },
        rollExpensesYearFn: () => 2027,
        commitLiveState: async () => {
            counts.commits += 1;
            const state = StorageManager.loadState();
            StorageManager.saveState({ ...state, lastState: { ...state.lastState, tagesgeld: 888888 } });
            await PersistenceFacade.flush();
            return RESULT;
        },
        ...overrides
    });
    return { service, dom, counts, createHandlers, store, snapshots, faults, initialState };
}

const previous = {
    confirm: global.confirm, location: global.location, window: global.window,
    toast: UIRenderer.toast, error: UIRenderer.handleError, document: global.document,
    render: StorageManager.renderSnapshots, snapshot: StorageManager.createSnapshot,
    applyInputs: UIReader.applyStoredInputs
};
try {
    global.confirm = () => true;
    global.location = { reload() {} };
    UIRenderer.toast = () => {};
    UIRenderer.handleError = () => {};
    StorageManager.renderSnapshots = async () => {};

    function manualController(env, overrides = {}) {
        const button = { disabled: false };
        const annualButton = { disabled: false };
        const status = { textContent: '' };
        const calls = { preview: 0, toast: 0, refresh: 0 };
        const controller = createManualWealthHistoryController({
            service: env.service, button, status, annualButtons: [annualButton],
            now: () => new Date(2026, 11, 31, 12),
            update: request => {
                assertEqual(request.mode, BALANCE_UPDATE_MODE.PREVIEW, 'Manueller Knopf startet nur eine frische Vorschau');
                calls.preview += 1;
                return RESULT;
            },
            refresh: () => { calls.refresh += 1; }, toast: () => { calls.toast += 1; },
            ...overrides
        });
        return { controller, button, annualButton, status, calls };
    }

    console.log('Manueller Klick erfasst frische Werte, ersetzt nur denselben Tag und lässt Jahresstand/Engine-State unverändert');
    {
        const env = await setup();
        await env.createHandlers().handleJahresabschluss();
        const before = StorageManager.loadState();
        const stateBefore = JSON.stringify(before.lastState);
        const metadataBefore = JSON.stringify(before.annualPeriodMetadata);
        let current = { ...SOURCE, tagesgeld: 42.25 };
        const ui = manualController(env, { update: request => {
            assertEqual(request.mode, BALANCE_UPDATE_MODE.PREVIEW, 'Ausstehende Debounce-Eingaben werden ohne Periodencommit gelesen');
            return { ...RESULT, inputData: current };
        } });
        assertEqual((await ui.controller.capture()).status, 'saved', 'Manueller Stand nach Readback bestätigt');
        current = { ...SOURCE, tagesgeld: 99.75 };
        await ui.controller.capture();
        const captured = StorageManager.loadState();
        assertEqual(captured.wealthHistory.entries.filter(entry => entry.id === 'manual:2026-12-31').length, 1, 'Wiederholung ersetzt genau denselben manuellen Tag');
        assertEqual(captured.wealthHistory.entries.find(entry => entry.id === 'manual:2026-12-31').tagesgeld, 99.75, 'Frische Eingaben statt alter Persistenz oder Simulation');
        assertEqual(captured.wealthHistory.entries.find(entry => entry.id === 'annual:2026').tagesgeld, 12000, 'Jahresrecord am selben Datum bleibt erhalten');
        const tomorrow = manualController(env, { now: () => new Date(2027, 0, 1) });
        await tomorrow.controller.capture();
        const final = StorageManager.loadState();
        assertEqual(final.wealthHistory.entries.length, 4, 'Neuer lokaler Tag fügt einen Record hinzu');
        assertEqual(JSON.stringify(final.lastState), stateBefore, 'Kein zusätzlicher Engine-State-Commit');
        assertEqual(JSON.stringify(final.annualPeriodMetadata), metadataBefore, 'Kein zusätzlicher Periodenmarker');
        assertEqual(ui.calls.toast, 2, 'Erfolg erst nach bestätigtem Speichern');
        assertEqual(env.store.get(STATE), JSON.parse(env.store.get(REGISTRY)).profiles.a.data[STATE], 'Manuelle Werte in Live-State und Registry gleich');
    }

    console.log('Klickdatum bleibt trotz Wartezeit lokal; Doppelklick und Jahresknopf sind bis zum Ende gesperrt');
    {
        const savedTZ = process.env.TZ;
        process.env.TZ = 'Europe/Berlin';
        try {
            const env = await setup();
            const gate = { entered: deferred(), release: deferred() };
            env.faults.readGate = gate;
            let clock = new Date('2026-12-31T23:30:00Z');
            const ui = manualController(env, { now: () => clock });
            const first = ui.controller.capture();
            await gate.entered.promise;
            assert(ui.button.disabled && ui.annualButton.disabled, 'Erfassung sperrt beide Bedienwege');
            assertEqual(ui.calls.toast, 0, 'Während Readback keine Erfolgsmeldung');
            assertEqual((await ui.controller.capture()).status, 'in_flight', 'Doppelklick ohne zweite Erfassung');
            let annualCalls = 0;
            assertEqual((await ui.controller.withAnnual(() => { annualCalls += 1; })).status, 'in_flight', 'Jahresknopf während manueller Erfassung blockiert');
            assertEqual(annualCalls, 0, 'Kein zwischenzeitlicher Jahresprozess');
            clock = new Date('2027-01-02T12:00:00Z');
            gate.release.resolve();
            assertEqual((await first).status, 'saved', 'Erster Klick bestätigt');
            assert(StorageManager.loadState().wealthHistory.entries.some(entry => entry.id === 'manual:2027-01-01'), 'Lokales Klickdatum statt UTC- oder späterem Schreibdatum');
            assertEqual(ui.calls.preview, 1, 'Doppelklick führt nur eine Vorschau aus');
            assert(!ui.button.disabled && !ui.annualButton.disabled, 'Nach Abschluss wieder entsperrt');
        } finally { if (savedTZ === undefined) delete process.env.TZ; else process.env.TZ = savedTZ; }
    }

    console.log('Validierungs-, Write-, Readback- und Flushfehler melden keinen manuellen Erfolg');
    for (const fault of ['validation', 'write', 'readback', 'flush', 'pending', 'corrupt']) {
        const env = await setup();
        env.faults.manual = true;
        const rawBefore = persistenceStorage.getItem(STATE);
        if (['write', 'readback', 'flush'].includes(fault)) env.faults[fault] = true;
        if (fault === 'flush') persistenceStorage.setItem('profile_tagesgeld', '100');
        if (fault === 'pending') persistenceStorage.setItem(STATE, JSON.stringify({ ...env.initialState, annualPeriodMetadata: { pendingCommit: { periodId: 'calendar-year:2026' } } }));
        if (fault === 'corrupt') persistenceStorage.setItem(STATE, JSON.stringify({ ...env.initialState, wealthHistory: { schemaVersion: 9, entries: [] } }));
        const ui = manualController(env, fault === 'validation' ? { update: () => ({ ok: false, error: new Error('Ungültige Eingaben') }) } : {});
        assertEqual((await ui.controller.capture()).status, 'failed', `${fault}: keine falsche Bestätigung`);
        assertEqual(ui.calls.toast, 0, `${fault}: keine Erfolgsmeldung`);
        assert(ui.status.textContent.includes('nicht bestätigt'), `${fault}: sichtbarer Fehler`);
        assert(!ui.button.disabled && !ui.annualButton.disabled, `${fault}: Bedienung entsperrt`);
        if (fault === 'corrupt') assertEqual(JSON.parse(persistenceStorage.getItem(STATE)).wealthHistory.schemaVersion, 9, 'Beschädigter Verlauf wird nicht überschrieben');
        else if (fault !== 'pending') assertEqual(persistenceStorage.getItem(STATE), rawBefore, `${fault}: bisheriger Stand unverändert`);
    }

    for (const active of [false, true]) for (const fault of ['write', 'readback']) {
        const env = await setup();
        env.faults.manual = true;
        env.faults[fault] = true;
        const view = historyDom(active);
        refreshBalanceWealthHistory(view);
        const chartBefore = view.chart.innerHTML;
        const tableBefore = view.table.innerHTML;
        const ui = manualController(env, { status: view.status, refresh: () => refreshBalanceWealthHistory(view) });
        assertEqual((await ui.controller.capture()).status, 'failed', `${fault}: Erfassung im aktuellen Tab scheitert ohne Bestätigung`);
        assertEqual(view.panel.classList.contains('active'), active, 'Speicherfehler erhält Tabaktivität');
        assertEqual(view.date.textContent, 'Zuletzt erfasst am 01.06.2026', 'Speicherfehler erhält bestätigtes Datum');
        assertEqual(view.chart.innerHTML, chartBefore, 'Speicherfehler erhält gültiges Diagramm beziehungsweise leeren inaktiven Container');
        assertEqual(view.table.innerHTML, tableBefore, 'Speicherfehler erhält gültige Tabelle beziehungsweise leeren inaktiven Container');
        assertEqual(ui.calls.toast, 0, 'Kein Erfolg bei Speicherfehler');
        assert(view.status.textContent.includes('Stand nicht bestätigt'), 'Speicherfehler im Panel gemeldet');
    }

    console.log('Profilwechsel im manuellen Readback und laufender Jahresprozess verhindern fremde/vorläufige Bestätigung');
    {
        const env = await setup();
        const gate = { entered: deferred(), release: deferred() };
        env.faults.readGate = gate;
        const ui = manualController(env);
        const capture = ui.controller.capture();
        await gate.entered.promise;
        const foreign = JSON.parse(persistenceStorage.getItem(REGISTRY)).profiles.b.data[STATE];
        persistenceStorage.setItem(PROFILE_STORAGE_KEYS.current, 'b');
        persistenceStorage.setItem(PROFILE_STORAGE_KEYS.active, 'b');
        persistenceStorage.setItem(STATE, foreign);
        gate.release.resolve();
        assertEqual((await capture).status, 'failed', 'Profilwechsel verhindert Bestätigung');
        assertEqual(ui.calls.toast, 0, 'Kein Erfolg für fremdes Profil');
        assertEqual(persistenceStorage.getItem(STATE), foreign, 'Fremder Verlauf unverändert');
        assert(!ui.button.disabled, 'Profilwechselfehler entsperrt den Knopf');
    }
    {
        const env = await setup();
        const gate = deferred();
        const ui = manualController(env);
        const annual = ui.controller.withAnnual(() => gate.promise);
        assert(ui.button.disabled, 'Jahreslauf sperrt manuellen Knopf');
        assertEqual((await ui.controller.capture()).status, 'in_flight', 'Kein vorläufiger Stand während Jahreslauf');
        assertEqual(ui.calls.preview, 0, 'Nicht einmal eine manuelle Vorschau während Jahreslauf');
        gate.resolve();
        await annual;
        assert(!ui.button.disabled, 'Jahresabschluss entsperrt Knopf');
        try { await ui.controller.withAnnual(() => { throw new Error('Jahresfehler'); }); } catch {}
        assert(!ui.button.disabled, 'Auch Jahresfehler entsperrt Knopf');
    }

    console.log('Binder bindet den manuellen Listener einmal, auch bei erneuter Initialisierung');
    {
        const env = await setup();
        const element = () => ({ listeners: {}, addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); } });
        const dom = {
            ...env.dom,
            controls: Object.fromEntries(['resetBtn', 'copyAction', 'btnJahresUpdate', 'btnNachruecken', 'btnUndoNachruecken', 'btnCsvImport', 'csvFileInput', 'jahresabschlussBtn', 'connectFolderBtn', 'captureWealthBtn'].map(key => [key, element()])),
            wealthHistory: historyDom(),
            outputs: { snapshotList: element() },
            containers: { form: element(), tabButtons: element(), bedarfAnpassung: element() },
            diagnosis: Object.fromEntries(['drawer', 'overlay', 'openBtn', 'closeBtn', 'copyBtn', 'filterToggle'].map(key => [key, element()]))
        };
        global.document = { addEventListener() {}, querySelectorAll: () => [] };
        let previews = 0;
        let debounceResumed = 0;
        const binderState = {};
        const initialize = () => initUIBinder(dom, binderState, request => { assertEqual(request.mode, BALANCE_UPDATE_MODE.PREVIEW, 'Binder nutzt PREVIEW'); previews += 1; return RESULT; }, () => { debounceResumed += 1; });
        initialize(); UIBinder.bindUI(); UIBinder.bindUI();
        initialize(); UIBinder.bindUI();
        assertEqual(dom.controls.captureWealthBtn.listeners.click.length, 1, 'Genau ein Capture-Listener trotz erneuter Bindung');
        assertEqual(dom.containers.tabButtons.listeners.click.length, 1, 'Genau ein Tablistener trotz erneuter Bindung');
        const persistedBeforeTab = env.store.get(STATE);
        const registryBeforeTab = env.store.get(REGISTRY);
        const buttons = ['update', 'settings', 'ausgaben', 'wealth'].map(tab => ({ dataset: { tab },
            classList: historyDom(tab === 'update').panel.classList }));
        const panels = buttons.map(button => button.dataset.tab === 'wealth' ? dom.wealthHistory.panel : historyDom(button.dataset.tab === 'update').panel);
        dom.containers.tabPanels = panels;
        dom.containers.tabButtons.querySelector = () => buttons.find(button => button.classList.contains('active'));
        global.document.getElementById = id => panels[['tab-update', 'tab-settings', 'tab-ausgaben', 'tab-wealth'].indexOf(id)];
        const clearError = UIRenderer.clearError;
        let clears = 0;
        UIRenderer.clearError = () => { clears += 1; };
        try {
            for (const index of [3, 0, 3, 2, 3]) {
                dom.containers.tabButtons.listeners.click[0]({ target: { closest: () => buttons[index] } });
                assertEqual(dom.wealthHistory.panel.classList.contains('active'), index === 3, 'Tabaktivität aus bestehender Mechanik');
                assertEqual(Boolean(dom.wealthHistory.chart.innerHTML), index === 3, 'Aktivierung zeichnet, Verlassen leert');
            }
            assertEqual(clears, 0, 'Tabwechsel ohne Fehlerbereinigung');
        } finally { UIRenderer.clearError = clearError; }
        assertEqual(previews, 0, 'Tabwechsel startet kein Engineupdate');
        assertEqual(debounceResumed, 0, 'Tabwechsel plant keinen Inputwrite');
        assertEqual(env.store.get(STATE), persistedBeforeTab, 'Tabwechsel ohne Statewrite oder Erfassung');
        assertEqual(env.store.get(REGISTRY), registryBeforeTab, 'Tabwechsel ohne Registrywrite');
        binderState.debounceTimer = setTimeout(() => { throw new Error('Der alte Timer darf nicht laufen'); }, 10000);
        await dom.controls.captureWealthBtn.listeners.click[0]();
        assertEqual(previews, 1, 'Ein Klick erzeugt nur eine Erfassung');
        assertEqual(binderState.debounceTimer, null, 'Ausstehender Inputwrite während Transaktion angehalten');
        assertEqual(debounceResumed, 1, 'Inputpersistenz nach bestätigter Erfassung wieder eingeplant');
    }

    console.log('Reale Importe erhalten aktiven und inaktiven Tab bei Erfolg, Ablehnung, Legacy und Rollback');
    for (const active of [false, true]) for (const kind of ['legacy', 'history', 'reject', 'rollback']) {
        const env = await setup();
        const view = env.dom.wealthHistory = historyDom(active);
        refreshBalanceWealthHistory(view);
        const previousChart = view.chart.innerHTML;
        const errors = [];
        UIRenderer.handleError = error => { errors.push(error); };
        UIReader.applyStoredInputs = () => {};
        initUIBinder(env.dom, {}, request => {
            assertEqual(view.panel.classList.contains('active'), active, 'Importupdate erhält Tabaktivität');
            refreshBalanceWealthHistory(view);
            return kind === 'rollback' && request.mode === BALANCE_UPDATE_MODE.PERSIST_INPUTS ? { ok: false } : RESULT;
        }, () => {});
        await UIBinder.handleImport({ target: { files: [] } });
        assertEqual(view.panel.classList.contains('active'), active, 'Dateidialog ohne Auswahl wirkungslos');
        const imported = createManualWealthHistoryEntry({ ...SOURCE, tagesgeld: 42 }, '2026-08-01');
        const doc = createBalanceExportDocument({
            inputs: { aktuellesAlter: 67, floorBedarf: 24000, flexBedarf: 12000, ...SOURCE },
            lastState: { cumulativeInflationFactor: 1 },
            ...(kind === 'history' ? { wealthHistory: { schemaVersion: 1, entries: [imported] } } : {})
        });
        await UIBinder.handleImport({ target: { value: 'datei', files: [{ text: async () => {
            assertEqual(view.panel.classList.contains('active'), active, 'Dateilesen ohne Tabwechsel');
            return kind === 'reject' ? '{ungueltig' : JSON.stringify(doc);
        } }] } });
        assertEqual(view.panel.classList.contains('active'), active, 'Jedes Importergebnis erhält Tabaktivität');
        assertEqual(view.status.textContent, '', 'Vorherige Erfassungsbestätigung entfernt');
        if (!active) assertEqual(view.chart.innerHTML + view.table.innerHTML, '', 'Inaktiver Import erzeugt keine Inhalte');
        if (kind === 'rollback' || kind === 'reject') {
            assertEqual(StorageManager.loadState().wealthHistory.entries.length, 1, 'Fehler bewahrt bisherigen Verlauf');
            assert(errors.length > 0, 'Importfehler bleibt gemeldet');
            assertEqual(view.chart.innerHTML, previousChart, 'Darstellung entspricht endgültigen Rollbackdaten');
            assertEqual(view.date.textContent, 'Zuletzt erfasst am 01.06.2026', 'Fehler bewahrt bestätigtes Datum');
        } else if (kind === 'history') {
            assertEqual(view.count.textContent, '1 Stand', 'Importierte Anzahl aktualisiert');
            assertEqual(view.date.textContent, 'Zuletzt erfasst am 01.08.2026', 'Importdatum unmittelbar aktualisiert');
            if (active) assert(view.table.innerHTML.includes('01.08.2026'), 'Aktive Tabelle zeigt nur importierte Historie');
            assertEqual(JSON.stringify(StorageManager.loadState().wealthHistory.entries), JSON.stringify([imported]), 'Replace übernimmt exakt den Import');
        } else {
            assert(!Object.hasOwn(StorageManager.loadState(), 'wealthHistory'), 'Legacy mischt keine alte Historie bei');
            assertEqual(view.date.textContent, 'Noch keine Stände erfasst', 'Legacy ersetzt Datum mit Leertext');
            if (active) assert(view.hint.textContent.includes('Noch keine Stände'), 'Aktiver Legacy-Leerhinweis');
        }
        view.panel.classList.add('active');
        refreshBalanceWealthHistory(view);
        if (kind === 'rollback' || kind === 'reject') assert(view.table.innerHTML.includes('01.06.2026'), 'Spätere Aktivierung zeigt Rollbackdaten');
    }
    UIRenderer.handleError = () => {};
    UIReader.applyStoredInputs = previous.applyInputs;

    console.log('Reale Verbund-/Tranchenaggregation liefert die Quelle trotz abweichender Felder und Simulation');
    {
        const env = await setup();
        global.window = {};
        const registry = JSON.parse(persistenceStorage.getItem(REGISTRY));
        const tranche = (id, value, type, category = 'equity') => ({
            trancheId: id, name: id, shares: 1, purchasePrice: value / 2,
            currentPrice: value, category, type, tqf: 0
        });
        registry.profiles.a.data.profile_tagesgeld = '7000';
        registry.profiles.a.data.depot_tranchen = JSON.stringify([
            tranche('a-alt', 14000, 'aktien_alt'), tranche('a-neu', 15000, 'aktien_neu'),
            tranche('a-money', 10000, 'geldmarkt', 'money_market')
        ]);
        registry.profiles.b.data.profile_tagesgeld = '5000';
        registry.profiles.b.data.depot_tranchen = JSON.stringify([
            tranche('b-alt', 20000, 'aktien_alt'), tranche('b-neu', 30000, 'aktien_neu'),
            tranche('b-money', 13000, 'geldmarkt', 'money_market'), tranche('b-gold', 100000, 'gold', 'gold')
        ]);
        persistenceStorage.setItem(REGISTRY, JSON.stringify(registry));
        persistenceStorage.setItem('profile_tagesgeld', registry.profiles.a.data.profile_tagesgeld);
        persistenceStorage.setItem('depot_tranchen', registry.profiles.a.data.depot_tranchen);
        const foreignBefore = JSON.stringify(registry.profiles.b);
        const compound = createProfilverbundHandlers({ dom: env.dom, PROFILVERBUND_STORAGE_KEYS: { mode: 'profilverbund_withdrawal_mode' } });
        const capture = manualController(env, { update: request => {
            assertEqual(request.mode, BALANCE_UPDATE_MODE.PREVIEW, 'Reale manuelle Aggregation verwendet Vorschau');
            const inputData = { tagesgeld: 999, geldmarktEtf: 888, depotwertAlt: 777, depotwertNeu: 666 };
            compound.updateProfilverbundGlobals(loadProfilverbundProfiles(), inputData);
            return { ...RESULT, inputData };
        } });
        assertEqual((await capture.controller.capture()).status, 'saved', 'Manueller aggregierter Stand bestätigt');
        const captured = StorageManager.loadState().wealthHistory.entries.find(entry => entry.id === 'manual:2026-12-31');
        for (const field of Object.keys(SOURCE)) assertEqual(captured[field], SOURCE[field], `Manueller Record enthält reale aggregierte Quelle für ${field}`);
        assertEqual(JSON.stringify(JSON.parse(persistenceStorage.getItem(REGISTRY)).profiles.b), foreignBefore, 'Manuelle Verbunderfassung schreibt nur aktives Profil');
        const handler = env.createHandlers({ commitLiveState: async () => {
            env.counts.commits += 1;
            const inputData = { tagesgeld: 999, geldmarktEtf: 888, depotwertAlt: 777, depotwertNeu: 666 };
            compound.updateProfilverbundGlobals(loadProfilverbundProfiles(), inputData);
            return { ...RESULT, inputData };
        } });
        assertEqual((await handler.handleJahresabschluss()).status, 'already_committed', 'Aggregierter Jahresabschluss erfolgreich');
        const annual = StorageManager.loadState().wealthHistory.entries.find(entry => entry.reason === 'annual_close');
        for (const field of Object.keys(SOURCE)) assertEqual(annual[field], SOURCE[field], `Reale aggregierte Quelle für ${field}`);
        assertEqual(annual.total, 114000, 'Gold wird nicht zusätzlich addiert');
        assertEqual(JSON.stringify(JSON.parse(persistenceStorage.getItem(REGISTRY)).profiles.b), foreignBefore, 'Verbundmitglied erhält keinen eigenen Verlaufwrite');

        // Die beiden öffentlichen Binder-Einstiege prüfen denselben gespeicherten Abschluss.
        const SystemDate = global.Date;
        global.Date = class extends SystemDate {
            constructor(...args) { super(...(args.length ? args : [reference.getTime()])); }
        };
        try {
            let updates = 0;
            initUIBinder(env.dom, { snapshotHandle: null }, () => { updates += 1; return RESULT; }, () => {});
            assertEqual((await UIBinder.handleJahresUpdate()).status, 'already_committed', 'Jahres-Update-Knopf erkennt abgeschlossene Periode');
            assertEqual((await UIBinder.handleJahresabschluss()).status, 'already_committed', 'Jahresabschluss-Knopf erkennt dieselbe Periode');
            assertEqual(updates, 0, 'Beide Binder-Knöpfe starten keinen weiteren Engine-Lauf');
        } finally { global.Date = SystemDate; }
    }

    console.log('Finale Write-/Readback-/Flushfehler erhalten Historie und Recovery; echter Restore erlaubt einen Abschluss');
    for (const fault of ['write', 'readback', 'flush']) {
        const env = await setup();
        const handler = env.createHandlers({
            commitLiveState: async () => {
                env.counts.commits += 1;
                env.faults[fault] = true;
                // Ein ausstehender fachlicher Write macht den finalen Flush prüfbar.
                if (fault === 'flush') persistenceStorage.setItem('profile_tagesgeld', '12');
                return RESULT;
            }
        });
        const failed = await handler.handleJahresabschluss();
        assertEqual(failed.status, 'incomplete_recovery', `${fault}: kein falscher Erfolg`);
        assertEqual(env.counts.confirmations, 0, 'Fehlgeschlagener Abschluss bestätigt keinen Stand');
        const state = StorageManager.loadState();
        assertEqual(JSON.stringify(state.wealthHistory), JSON.stringify(env.initialState.wealthHistory), `${fault}: vorheriger Verlauf erhalten`);
        assertEqual(state.annualPeriodMetadata.lastCommittedPeriod, null, `${fault}: kein finaler Periodenmarker`);
        assertEqual(state.annualPeriodMetadata.pendingCommit.phase, 'validating', `${fault}: Pending-Recovery erhalten`);
        assertEqual((await handler.handleJahresabschluss()).status, 'incomplete_recovery', `${fault}: Wiederholung bleibt blockiert`);
        assertEqual(env.counts.commits, 1, `${fault}: kein weiterer Engine-Commit`);
        const id = state.annualPeriodMetadata.pendingCommit.snapshotId;
        assert(env.snapshots.has(id), `${fault}: tatsächlicher Recovery-Snapshot vorhanden`);
        const recoveryBefore = JSON.stringify(env.snapshots.get(id));
        await StorageManager.restoreSnapshot(id, null);
        env.dom.inputs.aktuellesAlter.value = '67';
        // Der schnelle Speicheradapter kann beide Versuche in derselben Millisekunde
        // ausführen. Eigene Labels trennen die Fixtures ohne Wartezeit oder Echtzeituhr.
        env.dom.inputs.profilName.value = `A-Wiederholung-${fault}`;
        const restoredHandler = env.createHandlers();
        assertEqual((await restoredHandler.handleJahresabschluss()).status, 'already_committed', `${fault}: Abschluss nach Restore erfolgreich`);
        assertEqual(env.snapshots.size, 2, `${fault}: Wiederholung erzeugt einen eigenen Recovery-Snapshot`);
        assertEqual(JSON.stringify(env.snapshots.get(id)), recoveryBefore, `${fault}: ursprünglicher Recovery-Snapshot bleibt unverändert`);
        const entries = StorageManager.loadState().wealthHistory.entries;
        assertEqual(entries.length, 2, `${fault}: manueller Stand und genau ein Jahresstand`);
        assertEqual(JSON.stringify(entries[0]), JSON.stringify(manual), `${fault}: Snapshot bewahrt manuelle Historie`);
        assertEqual(entries.filter(entry => entry.id === 'annual:2026').length, 1, `${fault}: genau ein Jahresrecord nach Restore`);
        assertEqual(env.store.get(STATE), JSON.parse(env.store.get(REGISTRY)).profiles.a.data[STATE], `${fault}: bestätigter Live-State und Registry gleich`);
    }

    console.log('Beide Jahresknöpfe teilen den Coordinator; auch Legacy-Persistenz ist gegen Doppelklick gesperrt');
    {
        const env = await setup();
        const gate = deferred();
        const entered = deferred();
        let firstFlush = true;
        const handler = env.createHandlers({ flushLiveState: async () => {
            if (firstFlush) { firstFlush = false; entered.resolve(); await gate.promise; }
            await PersistenceFacade.flush();
        } });
        const first = handler.handleJahresabschluss();
        await entered.promise;
        assertEqual((await handler.handleJahresabschluss()).status, 'in_flight', 'Doppelklick schon beim Legacy-Flush gesperrt');
        await rejects(() => env.service.captureManual({ result: RESULT, asOf: '2026-12-31' }), 'Manuelle Erfassung während Jahresabschluss gesperrt');
        gate.resolve();
        assertEqual((await first).status, 'already_committed', 'Erster Knopf schließt ab');
        assertEqual((await handler.handleJahresabschluss()).status, 'already_committed', 'Zweiter Knopf bleibt ein No-op');
        assertEqual(env.counts.confirmations, 1, 'No-op bestätigt keinen neuen Stand');
        assertEqual(env.counts.commits, 1, 'Beide Knöpfe erzeugen nur einen Engine-Commit');
    }

    console.log('Profilwechsel in wartenden Jahres-/Persistenzschritten schreiben keine fremde Historie');
    for (const step of ['annual', 'flush', 'read']) {
        const env = await setup();
        const gate = { entered: deferred(), release: deferred() };
        const foreign = JSON.parse(persistenceStorage.getItem(REGISTRY)).profiles.b.data[STATE];
        const handler = env.createHandlers({
            runAnnualUpdate: async () => {
                if (step === 'annual') { gate.entered.resolve(); await gate.release.promise; }
                env.dom.inputs.aktuellesAlter.value = '68';
                return { ok: true };
            },
            commitLiveState: async () => {
                if (step === 'flush') {
                    gate.entered.resolve(); await gate.release.promise;
                }
                if (step === 'read') env.faults.readGate = gate;
                return RESULT;
            }
        });
        const running = handler.handleJahresabschluss();
        await gate.entered.promise;
        persistenceStorage.setItem(PROFILE_STORAGE_KEYS.current, 'b');
        persistenceStorage.setItem(PROFILE_STORAGE_KEYS.active, 'b');
        persistenceStorage.setItem(STATE, foreign);
        gate.release.resolve();
        assertEqual((await running).status, 'incomplete_recovery', `${step}: Profilwechsel bricht Abschluss ab`);
        assertEqual(persistenceStorage.getItem(STATE), foreign, `${step}: fremder Live-State unverändert`);
        assertEqual(JSON.parse(persistenceStorage.getItem(REGISTRY)).profiles.b.data[STATE], foreign, `${step}: fremde Registryhistorie unverändert`);
    }

    console.log('Gemeinsame Warteschlange übernimmt keine veralteten States und verliert keine manuellen Einträge');
    {
        const env = await setup();
        const firstService = env.service;
        const secondService = createBalanceWealthHistoryService();
        const gate = { entered: deferred(), release: deferred() };
        env.faults.readGate = gate;
        const first = firstService.captureManual({ result: RESULT, asOf: '2026-07-01' });
        await gate.entered.promise;
        const second = secondService.captureManual({ result: { ok: true, inputData: { ...SOURCE, tagesgeld: 1 } }, asOf: '2026-07-02' });
        const annual = env.createHandlers().handleJahresabschluss();
        gate.release.resolve();
        await first;
        await second;
        await annual;
        const entries = StorageManager.loadState().wealthHistory.entries;
        assertEqual(entries.length, 4, 'Beide manuellen Stände, vorheriger Stand und Jahresstand bleiben erhalten');
        assertEqual(entries.find(entry => entry.asOf === '2026-07-02').tagesgeld, 1, 'Zweiter manueller Stand bewahrt eigene Quelle');
        assertEqual(entries.find(entry => entry.id === 'annual:2026').total, 114000, 'Jahresabschluss verwendet seine Commit-Quelle');
    }

    console.log('Beschädigter Verlauf, Pending-Recovery und gewechseltes Profil blockieren manuelle Writes');
    {
        const env = await setup();
        const state = StorageManager.loadState();
        StorageManager.saveState({ ...state, annualPeriodMetadata: { pendingCommit: { periodId: 'calendar-year:2026' } } });
        await rejects(() => env.service.captureManual({ result: RESULT, asOf: '2026-07-01' }), 'Pending-Recovery verhindert manuellen Record');
        persistenceStorage.setItem(STATE, JSON.stringify({ ...state, wealthHistory: { schemaVersion: 9, entries: [] } }));
        await rejects(() => env.service.captureManual({ result: RESULT, asOf: '2026-07-01' }), 'Beschädigter Verlauf wird nicht überschrieben');
        assertEqual(JSON.parse(persistenceStorage.getItem(STATE)).wealthHistory.schemaVersion, 9, 'Beschädigtes Original bleibt erhalten');
    }
    {
        const env = await setup();
        const gate = { entered: deferred(), release: deferred() };
        env.faults.readGate = gate;
        const pending = env.service.captureManual({ result: RESULT, asOf: '2026-07-01' });
        await gate.entered.promise;
        const foreign = JSON.parse(persistenceStorage.getItem(REGISTRY)).profiles.b.data[STATE];
        persistenceStorage.setItem(PROFILE_STORAGE_KEYS.current, 'b');
        persistenceStorage.setItem(PROFILE_STORAGE_KEYS.active, 'b');
        persistenceStorage.setItem(STATE, foreign);
        gate.release.resolve();
        await rejects(() => pending, 'Profilwechsel während manueller Persistenz wird erkannt');
        assertEqual(persistenceStorage.getItem(STATE), foreign, 'Manueller Write lässt fremden Live-State unverändert');
    }

    console.log('Aktive und inaktive Erfassung aktualisieren die bestätigte Datenbasis ohne Zustandswechsel');
    for (const open of [false, true]) {
        const env = await setup();
        const view = historyDom(open);
        let current = { ...SOURCE, tagesgeld: 42 };
        const ui = manualController(env, {
            status: view.status,
            update: () => ({ ...RESULT, inputData: current }),
            refresh: () => refreshBalanceWealthHistory(view)
        });
        for (const amount of [42, 99]) {
            current = { ...SOURCE, tagesgeld: amount };
            await ui.controller.capture();
            assertEqual(view.status.textContent, 'Stand gesichert', 'Kurze Bestätigung nach Readback');
            assertEqual(view.panel.classList.contains('active'), open, 'Erfassung erhält Sichtbarkeit');
            assertEqual(view.count.textContent, '2 Stände', 'Tagesersetzung zählt nicht doppelt');
            assertEqual(view.date.textContent, 'Zuletzt erfasst am 31.12.2026', 'Erfassung aktualisiert Datum unmittelbar');
            if (open) assert(view.table.innerHTML.includes(amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })), 'Aktive Tabelle zeigt neuen Tageswert');
            else assertEqual(view.chart.innerHTML + view.table.innerHTML, '', 'Inaktive Erfassung ohne Inhalte');
        }
        const tomorrow = manualController(env, { now: () => new Date(2027, 0, 1), refresh: () => refreshBalanceWealthHistory(view) });
        await tomorrow.controller.capture();
        const annual = env.createHandlers({ onAnnualWealthSaved: () => {
            assertEqual(env.store.get(STATE), JSON.parse(env.store.get(REGISTRY)).profiles.a.data[STATE], 'Bestätigung erst nach State-/Registry-Readback');
            view.status.textContent = 'Stand gesichert';
        } });
        await ui.controller.withAnnual(() => annual.handleJahresabschluss());
        assertEqual(view.panel.classList.contains('active'), open, 'Jahresabschluss erhält Sichtbarkeit');
        assertEqual(view.count.textContent, '4 Stände', 'Zusätzlicher Tag und Jahresstand gezählt');
        assertEqual(view.date.textContent, 'Zuletzt erfasst am 01.01.2027', 'Älterer Jahresstichtag vermindert Datum nicht');
        if (open) assert(view.chart.innerHTML.includes('Jahresabschluss') && view.table.innerHTML.includes('01.01.2027'), 'Aktive Darstellung zeigt Tag und Jahresstand');
        else assertEqual(view.chart.innerHTML + view.table.innerHTML, '', 'Inaktiver Jahresabschluss ohne Inhalte');
        await ui.controller.withAnnual(() => annual.handleJahresabschluss());
        assertEqual(view.status.textContent, '', 'Jahres-No-op ohne neue Erfolgsmeldung');
    }
    {
        const env = await setup();
        const handler = env.createHandlers({ onAnnualWealthSaved: () => { throw new Error('UI-Rückruf fehlgeschlagen'); } });
        assertEqual((await handler.handleJahresabschluss()).status, 'already_committed', 'UI-Rückruffehler nach Readback bleibt abgeschlossener Commit');
        assertEqual(StorageManager.loadState().annualPeriodMetadata.pendingCommit, null, 'Kein falscher Recoverymarker');
        assertEqual((await handler.handleJahresabschluss()).status, 'already_committed', 'Wiederholung bleibt No-op');
        assertEqual(env.counts.commits, 1, 'Kein zweiter Commit nach UI-Rückruffehler');
    }

    console.log('Abschluss vor 2026 behält seinen Vertrag ohne Record; Renderfehler ändern bestätigten Erfolg nicht');
    {
        const env = await setup();
        const handler = env.createHandlers({
            getReferenceDate: () => new Date(2026, 0, 15), getTargetYear: () => 2025,
            rollExpensesYearFn: () => 2026
        });
        assertEqual((await handler.handleJahresabschluss()).status, 'already_committed', 'Legacy-Jahr weiterhin abschließbar');
        assertEqual(env.counts.confirmations, 0, 'Vor 2026 keine Verlaufsbestätigung');
        assertEqual(StorageManager.loadState().wealthHistory.entries.length, 1, 'Vor 2026 kein Jahresrecord');
        assertEqual(StorageManager.loadState().annualPeriodMetadata.lastCommittedPeriod, 'calendar-year:2025', 'Legacy-Periodenvertrag erhalten');
    }
    {
        const env = await setup();
        StorageManager.renderSnapshots = async () => { throw new Error('render failed'); };
        const handler = env.createHandlers();
        assertEqual((await handler.handleJahresabschluss()).status, 'already_committed', 'Renderfehler meldet keinen falschen Persistenzfehler');
        assertEqual((await handler.handleJahresabschluss()).status, 'already_committed', 'Renderfehler erlaubt keinen zweiten Abschluss');
        assertEqual(env.counts.commits, 1, 'Nach Renderfehler nur ein Engine-Commit');
        assertEqual(StorageManager.loadState().wealthHistory.entries.length, 2, 'Bestätigter Jahresrecord bleibt erhalten');
        StorageManager.renderSnapshots = async () => {};
    }
} finally {
    StorageManager.createSnapshot = previous.snapshot;
    StorageManager.renderSnapshots = previous.render;
    UIRenderer.toast = previous.toast;
    UIRenderer.handleError = previous.error;
    UIReader.applyStoredInputs = previous.applyInputs;
    if (previous.confirm === undefined) delete global.confirm; else global.confirm = previous.confirm;
    if (previous.location === undefined) delete global.location; else global.location = previous.location;
    if (previous.window === undefined) delete global.window; else global.window = previous.window;
    if (previous.document === undefined) delete global.document; else global.document = previous.document;
    resetPersistenceRuntimeForTests();
}
