import { createAnnualOrchestrator } from '../app/balance/balance-annual-orchestrator.js';
import {
    ANNUAL_PERIOD_METADATA_KEY,
    createSnapshotHandlers
} from '../app/balance/balance-binder-snapshots.js';
import {
    LEGACY_PERIOD_DECISION,
    deriveCompletedCalendarYear
} from '../app/balance/balance-annual-period.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { UIRenderer } from '../app/balance/balance-renderer.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import { SnapshotArchive } from '../app/shared/snapshot-archive.js';
import { PersistenceFacade, persistenceStorage, resetPersistenceRuntimeForTests } from '../app/shared/persistence-facade.js';
import { createBalanceWealthHistoryService } from '../app/balance/balance-wealth-history.js';
import { createManualWealthHistoryEntry } from '../types/wealth-history-contract.js';
import { PROFILE_STORAGE_KEYS, PROFILE_VALUE_KEYS } from '../app/profile/profile-state.js';

console.log('--- Balance Annual Workflow Contract Tests ---');

const REFERENCE_DATE = new Date(2027, 0, 15, 12);
const TARGET_YEAR = deriveCompletedCalendarYear(REFERENCE_DATE);
const SOURCE = { tagesgeld: 12000.25, geldmarktEtf: 23000.5, depotwertAlt: 34000.75, depotwertNeu: 45000.125 };
const COMMIT_RESULT = { ok: true, inputData: SOURCE, modelResult: { newState: { tagesgeld: 1, geldmarktEtf: 2, depotwertAlt: 3, depotwertNeu: 4 } } };
const NEXT_YEAR = TARGET_YEAR + 1;

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

function seedBalanceState() {
    resetPersistenceRuntimeForTests();
    localStorage.setItem(PROFILE_STORAGE_KEYS.current, 'a');
    localStorage.setItem(PROFILE_STORAGE_KEYS.active, 'a');
    localStorage.setItem(PROFILE_STORAGE_KEYS.registry, JSON.stringify({ version: 1, profiles: {
        a: { meta: { id: 'a', name: 'A' }, data: {} },
        b: { meta: { id: 'b', name: 'B' }, data: { [CONFIG.STORAGE.LS_KEY]: JSON.stringify({ wealthHistory: { schemaVersion: 1, entries: [createManualWealthHistoryEntry(SOURCE, '2026-02-01')] } }) } }
    } }));
    localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
        inputs: { aktuellesAlter: 67, floorBedarf: 24000 },
        lastState: { cumulativeInflationFactor: 1 }
    }));
}

function createAnnualDom() {
    return {
        inputs: {
            profilName: { value: `Jahr ${TARGET_YEAR}` },
            aktuellesAlter: { value: '67' }
        },
        expenses: { yearSelect: { value: String(TARGET_YEAR) } },
        outputs: { snapshotList: { id: 'snapshotList' } },
        controls: {
            snapshotStatus: { id: 'snapshotStatus' },
            btnJahresUpdate: { disabled: false, innerHTML: 'Jahres-Update' },
            btnJahresUpdateLog: { disabled: true }
        }
    };
}

const previous = {
    localStorage: global.localStorage,
    confirm: global.confirm,
    setTimeout: global.setTimeout,
    toast: UIRenderer.toast,
    handleError: UIRenderer.handleError,
    createSnapshot: StorageManager.createSnapshot,
    renderSnapshots: StorageManager.renderSnapshots,
    listSnapshots: SnapshotArchive.listSnapshots,
    readSnapshot: SnapshotArchive.readSnapshot
};

try {
    console.log('Test 1: Jahresupdate returns a stable result and reports step errors');
    {
        const calls = [];
        let modalResults = null;
        global.localStorage = createLocalStorageMock();
        seedBalanceState();
        localStorage.setItem('profile_tagesgeld', '50000');
        const confirmedTranches = JSON.stringify([{
            trancheId: 'annual-read-only-lot',
            name: 'Synthetischer Bestand',
            shares: 5,
            purchasePrice: 80,
            currentPrice: 100,
            category: 'equity',
            type: 'aktien_neu',
            tqf: 0.3
        }]);
        localStorage.setItem('depot_tranchen', confirmedTranches);
        global.setTimeout = (fn, delay) => { calls.push(`timeout:${delay}`); fn(); return 0; };
        UIRenderer.toast = () => {};
        UIRenderer.handleError = error => { throw error; };
        const dom = createAnnualDom();
        const inflationContract = {
            rate: 2.1,
            year: TARGET_YEAR,
            source: 'ECB (HICP)',
            dataAsOf: '2026-01-30T11:15:00Z',
            fetchStatus: 'ok_primary_ecb',
            metric: 'consumer_prices_all_items_annual_average_growth_pct'
        };
        const orchestrator = createAnnualOrchestrator({
            dom,
            debouncedUpdate: () => { calls.push('debouncedUpdate'); },
            handleFetchInflation: async () => { calls.push('inflation'); return inflationContract; },
            handleNachrueckenMitETF: async () => { calls.push('etf'); return { status: 'ok' }; },
            handleFetchCapeAuto: async () => ({
                capeFetchStatus: 'error_no_source_no_stored',
                errors: ['primary source failed']
            }),
            showUpdateResultModal: results => { modalResults = results; },
            setLastUpdateResults: () => {}
        });

        const result = await orchestrator.handleJahresUpdate({ failOnStepError: true });
        assertEqual(result.ok, false, 'Fehlerhafter Teilschritt liefert explizit ok=false');
        assertEqual(dom.inputs.aktuellesAlter.value, '68', 'Jahresupdate erhoeht das Alter genau einmal');
        assertEqual(localStorage.getItem(PROFILE_VALUE_KEYS.alter), '68', 'Jahresupdate persistiert das neue Alter vor dem Profil-Sync');
        assertEqual(result.results.inflation.year, TARGET_YEAR, 'Jahresupdate bewahrt das Inflations-Zieljahr');
        assertEqual(result.results.inflation.fetchStatus, 'ok_primary_ecb', 'Jahresupdate bewahrt den Inflations-Fetch-Status');
        assertEqual(modalResults.errors[0].step, 'CAPE', 'Fehlerprotokoll behaelt stabilen Step-Namen');
        assertEqual(dom.controls.btnJahresUpdate.disabled, false, 'Button-Sperre wird im finally geloest');
        assertEqual(localStorage.getItem('depot_tranchen'), confirmedTranches,
            'Beratendes Jahresupdate darf den realen Tranchenbestand nicht veraendern');
    }

    console.log('Test 2: successful commit follows preflight, snapshot, writes, validation and completion');
    {
        const calls = [];
        const dom = createAnnualDom();
        global.localStorage = createLocalStorageMock();
        seedBalanceState();
        global.confirm = () => true;
        UIRenderer.toast = message => { calls.push(`toast:${message}`); };
        UIRenderer.handleError = error => { throw error; };
        SnapshotArchive.listSnapshots = async () => [];
        SnapshotArchive.readSnapshot = async id => ({ id, records: { balance: '{}' } });
        StorageManager.createSnapshot = async () => { calls.push('snapshot'); return { id: `snapshot-${TARGET_YEAR}` }; };
        StorageManager.renderSnapshots = async () => { calls.push('render'); };

        const otherBefore = localStorage.getItem(PROFILE_STORAGE_KEYS.registry);
        const handlers = createSnapshotHandlers({
            dom,
            appState: { snapshotHandle: null },
            getReferenceDate: () => REFERENCE_DATE,
            getTargetYear: () => TARGET_YEAR,
            getLegacyDecision: () => LEGACY_PERIOD_DECISION.NOT_COMMITTED,
            onAnnualWealthSaved: () => {
                assertEqual(StorageManager.loadState()[ANNUAL_PERIOD_METADATA_KEY].pendingCommit, null, 'Bestätigung erst nach Finalisierung');
                calls.push('wealth-confirmed');
            },
            validateLiveState: () => { calls.push('validate-pre'); return { ok: true }; },
            runAnnualUpdate: async () => {
                calls.push('annual-update');
                dom.inputs.aktuellesAlter.value = '68';
                return { ok: true };
            },
            applyAnnualInflation: () => { calls.push('inflation-write'); },
            rollExpensesYearFn: () => { calls.push('expenses-write'); return NEXT_YEAR; },
            flushLiveState: async ({ sync = false } = {}) => { calls.push(`flush:${sync}`); },
            commitLiveState: async ({ periodId }) => { calls.push(`commit:${periodId}`); return COMMIT_RESULT; }
        });

        const result = await handlers.handleJahresabschluss();
        const metadata = StorageManager.loadState()[ANNUAL_PERIOD_METADATA_KEY];
        assertEqual(result.status, 'already_committed', 'Erfolgreicher Coordinator liefert committed-Status');
        assertEqual(metadata.lastCommittedPeriod, `calendar-year:${TARGET_YEAR}`, 'Perioden-ID wird nach finalem Flush committed');
        assertEqual(metadata.pendingCommit, null, 'Erfolgreicher Abschluss entfernt Recovery-Marker');
        const live = StorageManager.loadState();
        const registry = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEYS.registry));
        assertEqual(registry.profiles.a.data[CONFIG.STORAGE.LS_KEY], localStorage.getItem(CONFIG.STORAGE.LS_KEY), 'Live-State und aktive Registry sind bytegleich');
        assertEqual(JSON.stringify(registry.profiles.b), JSON.stringify(JSON.parse(otherBefore).profiles.b), 'Fremder Profilverlauf bleibt unverändert');
        const entry = live.wealthHistory.entries[0];
        assertEqual(live.wealthHistory.entries.length, 1, 'Genau ein Jahresrecord');
        assertEqual(entry.id, 'annual:2026', 'Abgeschlossenes Jahr bestimmt die Identität');
        assertEqual(entry.asOf, '2026-12-31', 'Stichtag ist das Jahresende');
        assertEqual(entry.periodId, 'calendar-year:2026', 'Periode bleibt die abgeschlossene Periode');
        for (const field of Object.keys(SOURCE)) assertEqual(entry[field], SOURCE[field], `Commit-Quelle für ${field}`);
        assertEqual(entry.aktienEtf, 79000.875, 'Beide Teildepots ergeben Aktien-ETF');
        assertEqual(entry.total, 114001.625, 'Nur beauftragte Bestandteile ergeben die Summe');
        assert(calls.indexOf('validate-pre') < calls.indexOf('snapshot'), 'Vorpruefung liegt vor Snapshot');
        assert(calls.indexOf('snapshot') < calls.indexOf('annual-update'), 'Snapshot liegt vor erster fachlicher Jahresmutation');
        assert(calls.indexOf('annual-update') < calls.indexOf('inflation-write'), 'Jahresupdate liegt vor Inflationsfortschreibung');
        assert(calls.indexOf('inflation-write') < calls.indexOf('expenses-write'), 'Inflation liegt vor Ausgaben-Rollover');
        assert(
            calls.indexOf('expenses-write') < calls.indexOf(`commit:calendar-year:${TARGET_YEAR}`),
            'Fachlicher Candidate wird erst nach den Jahreswrites periodengebunden committed'
        );
        assertEqual(calls[calls.length - 1], 'render', 'Snapshot-Liste wird erst nach erfolgreichem Commit gerendert');

        const duplicate = await handlers.handleJahresabschluss();
        assertEqual(duplicate.status, 'already_committed', 'Wiederholung derselben Periode ist idempotent');
        assertEqual(calls.filter(call => call === 'wealth-confirmed').length, 1, 'Nur neuer bestätigter Jahresstand meldet Erfolg');
        assertEqual(calls.filter(call => call === 'snapshot').length, 1, 'Wiederholung erzeugt keinen zweiten Snapshot');
        assertEqual(calls.filter(call => call.startsWith('commit:')).length, 1, 'Wiederholung führt keinen zweiten Engine-Commit aus');
    }

    console.log('Test 3: failed preflight aborts before snapshot and annual writes');
    {
        const calls = [];
        global.localStorage = createLocalStorageMock();
        seedBalanceState();
        global.confirm = () => true;
        UIRenderer.toast = () => {};
        UIRenderer.handleError = () => {};
        StorageManager.createSnapshot = async () => { calls.push('snapshot'); return { id: 'unexpected' }; };
        const handlers = createSnapshotHandlers({
            dom: createAnnualDom(),
            appState: { snapshotHandle: null },
            getReferenceDate: () => REFERENCE_DATE,
            getTargetYear: () => TARGET_YEAR,
            getLegacyDecision: () => LEGACY_PERIOD_DECISION.NOT_COMMITTED,
            validateLiveState: () => ({ ok: false, error: new Error('invalid inputs') }),
            runAnnualUpdate: async () => { calls.push('annual-update'); return { ok: true }; },
            applyAnnualInflation: () => { calls.push('inflation-write'); },
            rollExpensesYearFn: () => { calls.push('expenses-write'); return NEXT_YEAR; },
            flushLiveState: async () => {},
            commitLiveState: async () => COMMIT_RESULT
        });
        await handlers.handleJahresabschluss();
        assert(!calls.includes('snapshot'), 'Fehlgeschlagene Vorpruefung verhindert Snapshot');
        assert(!calls.includes('annual-update'), 'Fehlgeschlagene Vorpruefung verhindert Jahresupdate');
        assert(!calls.includes('inflation-write') && !calls.includes('expenses-write'), 'Fehlgeschlagene Vorpruefung verhindert fachliche Writes');
    }

    console.log('Test 4: snapshot quota failure aborts without fachliche mutation');
    {
        const calls = [];
        global.localStorage = createLocalStorageMock();
        seedBalanceState();
        global.confirm = () => true;
        UIRenderer.toast = () => {};
        UIRenderer.handleError = () => {};
        SnapshotArchive.listSnapshots = async () => [];
        StorageManager.createSnapshot = async () => { calls.push('snapshot'); throw new Error('QuotaExceededError'); };
        const handlers = createSnapshotHandlers({
            dom: createAnnualDom(),
            appState: { snapshotHandle: null },
            getReferenceDate: () => REFERENCE_DATE,
            getTargetYear: () => TARGET_YEAR,
            getLegacyDecision: () => LEGACY_PERIOD_DECISION.NOT_COMMITTED,
            validateLiveState: () => ({ ok: true }),
            runAnnualUpdate: async () => { calls.push('annual-update'); return { ok: true }; },
            applyAnnualInflation: () => { calls.push('inflation-write'); },
            rollExpensesYearFn: () => { calls.push('expenses-write'); return NEXT_YEAR; },
            flushLiveState: async () => {},
            commitLiveState: async () => COMMIT_RESULT
        });
        const result = await handlers.handleJahresabschluss();
        assertEqual(result.status, 'invalid', 'Snapshot-Fehler vor Commit liefert fail-closed Status ohne Recovery-Behauptung');
        assert(!calls.includes('annual-update'), 'Quota-Fehler verhindert Jahresupdate');
        assert(!calls.includes('inflation-write') && !calls.includes('expenses-write'), 'Quota-Fehler verhindert fachliche Writes');
    }

    console.log('Test 5: post-snapshot failure keeps snapshot id and recovery phase');
    {
        const calls = [];
        const dom = createAnnualDom();
        global.localStorage = createLocalStorageMock();
        seedBalanceState();
        global.confirm = () => true;
        UIRenderer.toast = () => {};
        UIRenderer.handleError = () => {};
        SnapshotArchive.listSnapshots = async () => [];
        SnapshotArchive.readSnapshot = async id => ({ id, records: { balance: '{}' } });
        StorageManager.createSnapshot = async () => { calls.push('snapshot'); return { id: 'snapshot-recovery' }; };
        StorageManager.renderSnapshots = async () => { calls.push('render'); };
        const handlers = createSnapshotHandlers({
            dom,
            appState: { snapshotHandle: null },
            getReferenceDate: () => REFERENCE_DATE,
            getTargetYear: () => TARGET_YEAR,
            getLegacyDecision: () => LEGACY_PERIOD_DECISION.NOT_COMMITTED,
            validateLiveState: () => ({ ok: true }),
            runAnnualUpdate: async () => {
                dom.inputs.aktuellesAlter.value = '68';
                return { ok: false, error: new Error('market data failed') };
            },
            applyAnnualInflation: () => { calls.push('inflation-write'); },
            rollExpensesYearFn: () => { calls.push('expenses-write'); return NEXT_YEAR; },
            flushLiveState: async () => {},
            commitLiveState: async () => COMMIT_RESULT
        });
        const result = await handlers.handleJahresabschluss();
        const metadata = StorageManager.loadState()[ANNUAL_PERIOD_METADATA_KEY];
        assertEqual(result.status, 'incomplete_recovery', 'Fehler nach Snapshot bleibt recovery-pflichtig');
        assertEqual(metadata.pendingCommit.snapshotId, 'snapshot-recovery', 'Recovery-Marker bewahrt bestaetigte Snapshot-ID');
        assertEqual(metadata.pendingCommit.phase, 'writes_started', 'Recovery-Marker zeigt letzte persistierte Write-Phase');
        assert(!calls.includes('inflation-write') && !calls.includes('expenses-write'), 'Fehlerhaftes Jahresupdate stoppt weitere Writes');
        assert(!calls.includes('render'), 'Fehlerpfad rendert keinen erfolgreichen Abschluss');
        const blockedRetry = await handlers.handleJahresabschluss();
        assertEqual(blockedRetry.status, 'incomplete_recovery', 'Pending-Commit blockiert einen erneuten Jahresprozess');
        assertEqual(calls.filter(call => call === 'snapshot').length, 1, 'Recovery-Sperre erzeugt keinen weiteren Snapshot');
    }

    console.log('Test 6: in-flight guard rejects a double click');
    {
        global.localStorage = createLocalStorageMock();
        seedBalanceState();
        global.confirm = () => true;
        UIRenderer.toast = () => {};
        UIRenderer.handleError = () => {};
        SnapshotArchive.listSnapshots = async () => [];
        SnapshotArchive.readSnapshot = async id => ({ id, records: { balance: '{}' } });
        StorageManager.createSnapshot = async () => ({ id: 'snapshot-in-flight' });
        StorageManager.renderSnapshots = async () => {};
        let releaseUpdate;
        const updateGate = new Promise(resolve => { releaseUpdate = resolve; });
        const dom = createAnnualDom();
        const handlers = createSnapshotHandlers({
            dom,
            appState: { snapshotHandle: null },
            getReferenceDate: () => REFERENCE_DATE,
            getTargetYear: () => TARGET_YEAR,
            getLegacyDecision: () => LEGACY_PERIOD_DECISION.NOT_COMMITTED,
            validateLiveState: () => ({ ok: true }),
            runAnnualUpdate: async () => {
                await updateGate;
                dom.inputs.aktuellesAlter.value = '68';
                return { ok: true };
            },
            applyAnnualInflation: () => {},
            rollExpensesYearFn: () => NEXT_YEAR,
            flushLiveState: async () => {},
            commitLiveState: async () => COMMIT_RESULT
        });
        const first = handlers.handleJahresabschluss();
        await Promise.resolve();
        await Promise.resolve();
        const second = await handlers.handleJahresabschluss();
        assertEqual(second.status, 'in_flight', 'Doppelklick wird waehrend laufendem Commit abgewiesen');
        releaseUpdate();
        await first;
    }

    console.log('Balance annual workflow contract tests passed');
} finally {
    StorageManager.createSnapshot = previous.createSnapshot;
    StorageManager.renderSnapshots = previous.renderSnapshots;
    SnapshotArchive.listSnapshots = previous.listSnapshots;
    SnapshotArchive.readSnapshot = previous.readSnapshot;
    UIRenderer.handleError = previous.handleError;
    UIRenderer.toast = previous.toast;
    if (previous.setTimeout === undefined) delete global.setTimeout; else global.setTimeout = previous.setTimeout;
    if (previous.confirm === undefined) delete global.confirm; else global.confirm = previous.confirm;
    if (previous.localStorage === undefined) delete global.localStorage; else global.localStorage = previous.localStorage;
}

console.log('--- Balance Annual Workflow Contract Tests Completed ---');
