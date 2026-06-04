import { createAnnualOrchestrator } from '../app/balance/balance-annual-orchestrator.js';
import { createSnapshotHandlers } from '../app/balance/balance-binder-snapshots.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { UIRenderer } from '../app/balance/balance-renderer.js';
import { StorageManager } from '../app/balance/balance-storage.js';

console.log('--- Balance Annual Workflow Contract Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(String(key)); },
        clear: () => { store.clear(); },
        key: (index) => Array.from(store.keys())[index] || null,
        get length() { return store.size; }
    };
}

const prevLocalStorage = global.localStorage;
const prevConfirm = global.confirm;
const prevSetTimeout = global.setTimeout;
const prevToast = UIRenderer.toast;
const prevHandleError = UIRenderer.handleError;
const prevCreateSnapshot = StorageManager.createSnapshot;
const prevRenderSnapshots = StorageManager.renderSnapshots;

try {
    console.log('Test 1: Jahresupdate orchestrates age, handlers, results and profile save');
    {
        const calls = [];
        const toasts = [];
        let modalResults = null;
        let lastUpdateResults = null;

        global.localStorage = createLocalStorageMock();
        global.setTimeout = (fn, delay) => {
            calls.push(`timeout:${delay}`);
            fn();
            return 0;
        };
        UIRenderer.toast = (message) => { toasts.push(message); };
        UIRenderer.handleError = (error) => {
            throw error;
        };

        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
            inputs: { floorBedarf: 24000 },
            lastState: { cumulativeInflationFactor: 1 }
        }));
        localStorage.setItem('profile_tagesgeld', '50000');

        const dom = {
            inputs: {
                aktuellesAlter: { value: '67' }
            },
            controls: {
                btnJahresUpdate: { disabled: false, innerHTML: 'Jahres-Update' },
                btnJahresUpdateLog: { disabled: true }
            }
        };

        const orchestrator = createAnnualOrchestrator({
            dom,
            debouncedUpdate: () => { calls.push('debouncedUpdate'); },
            handleFetchInflation: async () => {
                calls.push('inflation');
                assertEqual(dom.inputs.aktuellesAlter.value, '68', 'Alter wird vor Inflationsabruf erhoeht');
                return { status: 'ok', inflation: 2.1 };
            },
            handleNachrueckenMitETF: async () => {
                calls.push('etf');
                return { status: 'ok', moved: true };
            },
            handleFetchCapeAuto: async () => {
                calls.push('cape');
                return {
                    capeFetchStatus: 'error_no_source_no_stored',
                    errors: ['primary source failed']
                };
            },
            showUpdateResultModal: (results) => { modalResults = results; },
            setLastUpdateResults: (results) => { lastUpdateResults = results; }
        });

        await orchestrator.handleJahresUpdate();

        assertEqual(dom.inputs.aktuellesAlter.value, '68', 'Jahresupdate erhoeht das Alter um ein Jahr');
        assertEqual(dom.controls.btnJahresUpdate.disabled, false, 'Jahresupdate-Button wird wieder aktiviert');
        assertEqual(dom.controls.btnJahresUpdate.innerHTML, 'Jahres-Update', 'Jahresupdate-Buttontext wird wiederhergestellt');
        assertEqual(dom.controls.btnJahresUpdateLog.disabled, false, 'Log-Button wird nach Update aktiviert');
        assertEqual(calls.join('|'), 'inflation|timeout:500|etf|cape|debouncedUpdate', 'Jahresupdate haelt die erwartete Handler-Reihenfolge ein');
        assert(modalResults, 'CAPE-Fehler oeffnet das Ergebnis-Modal');
        assertEqual(modalResults.errors.length, 1, 'CAPE-Fehler wird im Result-Shape gesammelt');
        assertEqual(modalResults.errors[0].step, 'CAPE', 'CAPE-Fehler hat stabilen Step-Namen');
        assert(modalResults.errors[0].error.includes('primary source failed'), 'CAPE-Fehlerdetails werden weitergegeben');
        assert(lastUpdateResults, 'Result-Shape wird fuer erneute Log-Anzeige gespeichert');
        assertEqual(lastUpdateResults.age.old, 67, 'Result-Shape enthaelt altes Alter');
        assertEqual(lastUpdateResults.age.new, 68, 'Result-Shape enthaelt neues Alter');
        assertEqual(JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY)).ageAdjustedForInflation, 68, 'Age-adjusted State wird gespeichert');

        const registry = JSON.parse(localStorage.getItem('rs_profiles_v1'));
        assert(registry?.profiles?.default?.data?.profile_tagesgeld, 'Jahresupdate speichert aktuellen Profil-Snapshot');
        assertEqual(toasts[0], 'Starte Jahres-Update...', 'Jahresupdate startet mit Status-Toast');
    }

    console.log('Test 2: Jahresabschluss flushes and creates snapshot before annual mutations');
    {
        const calls = [];
        const toasts = [];
        let createSnapshotArgs = null;
        let renderArgs = null;

        global.localStorage = createLocalStorageMock();
        global.confirm = () => true;
        global.setTimeout = (fn, delay) => {
            calls.push(`timeout:${delay}`);
            fn();
            return 0;
        };
        UIRenderer.toast = (message) => {
            calls.push(`toast:${message}`);
            toasts.push(message);
        };
        UIRenderer.handleError = (error) => {
            throw error;
        };
        StorageManager.createSnapshot = async (handle, label) => {
            calls.push('createSnapshot');
            createSnapshotArgs = { handle, label };
        };
        StorageManager.renderSnapshots = async (list, status, handle) => {
            calls.push('renderSnapshots');
            renderArgs = { list, status, handle };
        };

        const dom = {
            inputs: { profilName: { value: 'Jahr 2026' } },
            outputs: { snapshotList: { id: 'snapshotList' } },
            controls: { snapshotStatus: { id: 'snapshotStatus' } }
        };
        const appState = { snapshotHandle: { name: 'snapshots' } };

        const handlers = createSnapshotHandlers({
            dom,
            appState,
            applyAnnualInflation: () => { calls.push('applyAnnualInflation'); },
            debouncedUpdate: () => { calls.push('debouncedUpdate'); },
            rollExpensesYearFn: () => {
                calls.push('rollExpensesYear');
                return 2027;
            },
            flushLiveState: async (options = {}) => { calls.push(`flushLiveState:${JSON.stringify(options)}`); }
        });

        await handlers.handleJahresabschluss();

        assertEqual(
            calls.slice(0, 6).join('|'),
            'flushLiveState:{"sync":true}|createSnapshot|toast:Jahresabschluss-Snapshot "Jahr 2026" erfolgreich erstellt.|applyAnnualInflation|rollExpensesYear|flushLiveState:{"sync":true}',
            'Jahresabschluss flusht Live-Daten, schreibt Snapshot vor Mutation und flusht nach allen Mutationen'
        );
        assert(!calls.includes('debouncedUpdate'), 'Jahresabschluss wartet nicht mehr auf einen fragilen Debounce-Timer');
        assert(calls.some(call => call.startsWith('toast:Ausgaben-Check auf ')), 'Jahresabschluss meldet Ausgaben-Rollover');
        assertEqual(calls[calls.length - 1], 'renderSnapshots', 'Snapshot-Liste wird nach Abschluss neu gerendert');
        assertEqual(createSnapshotArgs.handle, appState.snapshotHandle, 'Snapshot nutzt den aktiven Snapshot-Handle');
        assertEqual(createSnapshotArgs.label, 'Jahr 2026', 'Snapshot nutzt den Profilnamen als Label');
        assertEqual(renderArgs.list, dom.outputs.snapshotList, 'renderSnapshots erhaelt die Snapshot-Liste');
        assertEqual(renderArgs.status, dom.controls.snapshotStatus, 'renderSnapshots erhaelt den Snapshot-Status');
        assertEqual(renderArgs.handle, appState.snapshotHandle, 'renderSnapshots nutzt den aktiven Snapshot-Handle');
        assert(toasts[0].includes('Jahresabschluss-Snapshot'), 'Erster Abschluss-Toast bestaetigt den Snapshot');
    }

    console.log('Test 3: Jahresabschluss aborts without mutation when snapshot creation fails');
    {
        const calls = [];
        let handledError = null;

        global.localStorage = createLocalStorageMock();
        global.confirm = () => true;
        global.setTimeout = (fn, delay) => {
            calls.push(`timeout:${delay}`);
            fn();
            return 0;
        };
        UIRenderer.toast = (message) => {
            calls.push(`toast:${message}`);
        };
        UIRenderer.handleError = (error) => {
            handledError = error;
        };
        StorageManager.createSnapshot = async () => {
            calls.push('createSnapshot');
            throw new Error('snapshot failed');
        };
        StorageManager.renderSnapshots = async () => {
            calls.push('renderSnapshots');
        };

        const dom = {
            inputs: { profilName: { value: 'Jahr 2026' } },
            outputs: { snapshotList: { id: 'snapshotList' } },
            controls: { snapshotStatus: { id: 'snapshotStatus' } }
        };
        const appState = { snapshotHandle: { name: 'snapshots' } };

        const handlers = createSnapshotHandlers({
            dom,
            appState,
            applyAnnualInflation: () => { calls.push('applyAnnualInflation'); },
            debouncedUpdate: () => { calls.push('debouncedUpdate'); },
            rollExpensesYearFn: () => {
                calls.push('rollExpensesYear');
                return 2027;
            },
            flushLiveState: async (options = {}) => { calls.push(`flushLiveState:${JSON.stringify(options)}`); }
        });

        await handlers.handleJahresabschluss();

        assert(handledError, 'Snapshot-Fehler wird ueber den UI-Fehlerpfad gemeldet');
        assert(!calls.includes('applyAnnualInflation'), 'Snapshot-Fehler verhindert Inflation/Jahresmutation');
        assert(!calls.includes('debouncedUpdate'), 'Snapshot-Fehler verhindert Live-Update nach Mutation');
        assert(!calls.includes('rollExpensesYear'), 'Snapshot-Fehler verhindert Ausgaben-Rollover-Mutation');
        assert(!calls.some(call => call.startsWith('toast:Ausgaben-Check auf ')), 'Snapshot-Fehler verhindert Ausgaben-Rollover');
        assert(!calls.includes('renderSnapshots'), 'Snapshot-Fehler rendert keine erfolgreiche Snapshot-Liste');
    }

    console.log('Test 4: Jahresabschluss aborts without snapshot when pre-flush fails');
    {
        const calls = [];
        let handledError = null;

        global.localStorage = createLocalStorageMock();
        global.confirm = () => true;
        global.setTimeout = (fn, delay) => {
            calls.push(`timeout:${delay}`);
            fn();
            return 0;
        };
        UIRenderer.toast = (message) => {
            calls.push(`toast:${message}`);
        };
        UIRenderer.handleError = (error) => {
            handledError = error;
        };
        StorageManager.createSnapshot = async () => {
            calls.push('createSnapshot');
        };
        StorageManager.renderSnapshots = async () => {
            calls.push('renderSnapshots');
        };

        const dom = {
            inputs: { profilName: { value: 'Jahr 2026' } },
            outputs: { snapshotList: { id: 'snapshotList' } },
            controls: { snapshotStatus: { id: 'snapshotStatus' } }
        };
        const appState = { snapshotHandle: { name: 'snapshots' } };

        const handlers = createSnapshotHandlers({
            dom,
            appState,
            applyAnnualInflation: () => { calls.push('applyAnnualInflation'); },
            debouncedUpdate: () => { calls.push('debouncedUpdate'); },
            rollExpensesYearFn: () => {
                calls.push('rollExpensesYear');
                return 2027;
            },
            flushLiveState: async (options = {}) => {
                calls.push(`flushLiveState:${JSON.stringify(options)}`);
                throw new Error('flush failed');
            }
        });

        await handlers.handleJahresabschluss();

        assert(handledError, 'Vorab-Flush-Fehler wird ueber den UI-Fehlerpfad gemeldet');
        assert(!calls.includes('createSnapshot'), 'Vorab-Flush-Fehler verhindert Snapshot-Erstellung');
        assert(!calls.includes('applyAnnualInflation'), 'Vorab-Flush-Fehler verhindert Inflation/Jahresmutation');
        assert(!calls.includes('debouncedUpdate'), 'Vorab-Flush-Fehler verhindert Live-Update nach Mutation');
        assert(!calls.includes('rollExpensesYear'), 'Vorab-Flush-Fehler verhindert Ausgaben-Rollover-Mutation');
        assert(!calls.some(call => call.startsWith('toast:Ausgaben-Check auf ')), 'Vorab-Flush-Fehler verhindert Ausgaben-Rollover');
        assert(!calls.includes('renderSnapshots'), 'Vorab-Flush-Fehler rendert keine erfolgreiche Snapshot-Liste');
    }

    console.log('Test 5: Jahresabschluss keeps snapshot and reports error when post-mutation flush fails');
    {
        const calls = [];
        let handledError = null;

        global.localStorage = createLocalStorageMock();
        global.confirm = () => true;
        global.setTimeout = (fn, delay) => {
            calls.push(`timeout:${delay}`);
            fn();
            return 0;
        };
        UIRenderer.toast = (message) => {
            calls.push(`toast:${message}`);
        };
        UIRenderer.handleError = (error) => {
            handledError = error;
        };
        StorageManager.createSnapshot = async () => {
            calls.push('createSnapshot');
        };
        StorageManager.renderSnapshots = async () => {
            calls.push('renderSnapshots');
        };

        const dom = {
            inputs: { profilName: { value: 'Jahr 2026' } },
            outputs: { snapshotList: { id: 'snapshotList' } },
            controls: { snapshotStatus: { id: 'snapshotStatus' } }
        };
        const appState = { snapshotHandle: { name: 'snapshots' } };
        let flushCount = 0;

        const handlers = createSnapshotHandlers({
            dom,
            appState,
            applyAnnualInflation: () => { calls.push('applyAnnualInflation'); },
            debouncedUpdate: () => { calls.push('debouncedUpdate'); },
            rollExpensesYearFn: () => {
                calls.push('rollExpensesYear');
                return 2027;
            },
            flushLiveState: async (options = {}) => {
                flushCount += 1;
                calls.push(`flushLiveState:${JSON.stringify(options)}`);
                if (flushCount === 2) throw new Error('post flush failed');
            }
        });

        await handlers.handleJahresabschluss();

        assert(handledError, 'Post-Mutations-Flush-Fehler wird ueber den UI-Fehlerpfad gemeldet');
        assert(calls.includes('createSnapshot'), 'Post-Mutations-Flush-Fehler laesst den Pre-Mutation-Snapshot bestehen');
        assert(calls.includes('applyAnnualInflation'), 'Post-Mutations-Flush-Fehler passiert nach Inflation');
        assert(calls.includes('rollExpensesYear'), 'Post-Mutations-Flush-Fehler passiert nach Ausgaben-Rollover');
        assert(!calls.includes('renderSnapshots'), 'Post-Mutations-Flush-Fehler rendert keine erfolgreiche Snapshot-Liste');
        assert(!calls.some(call => call.startsWith('toast:Ausgaben-Check auf ')), 'Post-Mutations-Flush-Fehler meldet keinen erfolgreichen Ausgaben-Rollover');
    }

    console.log('Balance annual workflow contract tests passed');
} finally {
    if (prevRenderSnapshots === undefined) delete StorageManager.renderSnapshots; else StorageManager.renderSnapshots = prevRenderSnapshots;
    if (prevCreateSnapshot === undefined) delete StorageManager.createSnapshot; else StorageManager.createSnapshot = prevCreateSnapshot;
    UIRenderer.handleError = prevHandleError;
    UIRenderer.toast = prevToast;
    if (prevSetTimeout === undefined) delete global.setTimeout; else global.setTimeout = prevSetTimeout;
    if (prevConfirm === undefined) delete global.confirm; else global.confirm = prevConfirm;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('--- Balance Annual Workflow Contract Tests Completed ---');
