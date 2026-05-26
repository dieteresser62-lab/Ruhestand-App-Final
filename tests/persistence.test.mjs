import { detectRuntime, isTauriRuntime } from '../app/shared/runtime-env.js';
import {
    isAllowedPersistenceImportKey,
    listAllowedPersistenceImportKeys,
    LEGACY_MIGRATION_MARKER_KEYS
} from '../app/shared/persistence-key-policy.js';
import { createLocalStorageAdapter } from '../app/shared/persistence-adapter-localstorage.js';
import { createIndexedDbAdapter } from '../app/shared/persistence-adapter-indexeddb.js';
import { createTauriJsonFileAdapter } from '../app/shared/persistence-adapter-tauri.js';
import {
    configurePersistence,
    exportAllSync,
    flush,
    getDirtyState,
    getPersistenceStatus,
    getItemSync,
    importAll,
    init,
    keysSync,
    persistenceStorage,
    removeItemSync,
    resetPersistenceForTests,
    resetPersistenceRuntimeForTests,
    setItemSync
} from '../app/shared/persistence-facade.js';
import {
    bindFullBackupImport,
    buildFullPersistenceBackup,
    buildRecoveryPersistenceBackup,
    createFullBackupFilename,
    createRecoveryBackupFilename,
    FULL_BACKUP_TYPE,
    importFullPersistenceBackup,
    normalizeFullPersistenceBackup
} from '../app/shared/persistence-backup.js';
import { CONFIG } from '../app/balance/balance-config.js';

console.log('--- Persistence Tests ---');

class MockStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.has(String(key)) ? this.store.get(String(key)) : null;
    }
    setItem(key, value) {
        this.store.set(String(key), String(value));
    }
    removeItem(key) {
        this.store.delete(String(key));
    }
    clear() {
        this.store.clear();
    }
    key(index) {
        return Array.from(this.store.keys())[index] || null;
    }
    get length() {
        return this.store.size;
    }
}

function createMemoryAdapter(initial = {}, options = {}) {
    const store = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
    const batches = [];
    return {
        name: 'memory',
        batches,
        store,
        async open() {},
        async loadAll() {
            return Object.fromEntries(store.entries());
        },
        async saveBatch(batch) {
            batches.push({
                upserts: batch.upserts.map(([key, value]) => [key, value]),
                deletes: [...batch.deletes]
            });
            if (options.failSave) {
                throw new Error('save failed');
            }
            batch.deletes.forEach(key => store.delete(key));
            batch.upserts.forEach(([key, value]) => store.set(key, String(value)));
        },
        async readMetadata(key) {
            return store.get(`metadata.${key}`) || null;
        },
        async writeMetadata(key, value) {
            store.set(`metadata.${key}`, JSON.stringify(value));
        }
    };
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function nextTick() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

function createFakeIndexedDB() {
    class FakeObjectStore {
        constructor(store) {
            this.store = store;
        }
        put(row) {
            this.store.set(String(row.key), { ...row });
        }
        delete(key) {
            this.store.delete(String(key));
        }
        get(key) {
            const request = {};
            setTimeout(() => {
                request.result = this.store.get(String(key));
                request.onsuccess?.();
            }, 0);
            return request;
        }
        openCursor() {
            const request = {};
            const entries = Array.from(this.store.values());
            let index = 0;
            const advance = () => {
                if (index >= entries.length) {
                    request.result = null;
                    request.onsuccess?.();
                    return;
                }
                request.result = {
                    value: entries[index],
                    continue() {
                        index += 1;
                        setTimeout(advance, 0);
                    }
                };
                request.onsuccess?.();
            };
            setTimeout(advance, 0);
            return request;
        }
    }

    class FakeTransaction {
        constructor(db, storeName) {
            this.db = db;
            this.storeName = storeName;
            setTimeout(() => this.oncomplete?.(), 0);
        }
        objectStore(storeName) {
            return new FakeObjectStore(this.db.stores.get(storeName));
        }
    }

    class FakeDatabase {
        constructor() {
            this.stores = new Map();
            this.objectStoreNames = {
                contains: (name) => this.stores.has(name)
            };
        }
        createObjectStore(name) {
            this.stores.set(name, new Map());
        }
        transaction(storeName) {
            return new FakeTransaction(this, storeName);
        }
        close() {}
    }

    const db = new FakeDatabase();
    return {
        db,
        open() {
            const request = {};
            setTimeout(() => {
                request.result = db;
                request.onupgradeneeded?.();
                request.onsuccess?.();
            }, 0);
            return request;
        }
    };
}

const prevLocalStorage = global.localStorage;
const prevWindow = global.window;
const prevDocument = global.document;

try {
    console.log('Test 1: runtime detection');
    {
        assertEqual(detectRuntime(null), 'unknown', 'Ohne Window ist Runtime unknown');
        assertEqual(detectRuntime({}), 'browser', 'Normales Window ist Browser');
        assertEqual(detectRuntime({ __TAURI_INTERNALS__: {} }), 'tauri', 'Tauri Internals werden erkannt');
        assert(isTauriRuntime({ __TAURI__: {} }), 'Tauri v1 Marker wird erkannt');
    }

    console.log('Test 2: persistence key policy');
    {
        const storage = new MockStorage();
        storage.setItem(CONFIG.STORAGE.LS_KEY, '{}');
        storage.setItem('sim_dynamicFlex', 'true');
        storage.setItem('sim.dynamicFlex', 'true');
        storage.setItem('balance_expenses_v1', '{}');
        storage.setItem(LEGACY_MIGRATION_MARKER_KEYS.target, 'indexeddb');
        storage.setItem('private_unrelated_key', 'secret');

        assert(isAllowedPersistenceImportKey(CONFIG.STORAGE.LS_KEY), 'Balance-Key ist erlaubt');
        assert(isAllowedPersistenceImportKey('sim_dynamicFlex'), 'sim_ Key ist erlaubt');
        assert(isAllowedPersistenceImportKey('sim.dynamicFlex'), 'sim. Key ist erlaubt');
        assert(isAllowedPersistenceImportKey('balance_expenses_v1'), 'Ausgaben-Key ist erlaubt');
        assert(isAllowedPersistenceImportKey(LEGACY_MIGRATION_MARKER_KEYS.target), 'Migrationsmarker ist erlaubt');
        assert(!isAllowedPersistenceImportKey('private_unrelated_key'), 'Fremder Key ist nicht erlaubt');

        const keys = listAllowedPersistenceImportKeys(storage);
        assert(keys.includes(CONFIG.STORAGE.LS_KEY), 'Allowlist-Listing enthaelt Balance-Key');
        assert(!keys.includes('private_unrelated_key'), 'Allowlist-Listing filtert fremden Key');
    }

    console.log('Test 3: uninitialized facade delegates to localStorage adapter');
    {
        const storage = new MockStorage();
        global.localStorage = storage;
        resetPersistenceForTests(createLocalStorageAdapter(() => global.localStorage));

        setItemSync('phase1_key', 'value');
        assertEqual(storage.getItem('phase1_key'), 'value', 'Uninitialisierte Facade schreibt direkt ins Legacy-Backend');
        assertEqual(getItemSync('phase1_key'), 'value', 'Uninitialisierte Facade liest direkt aus Legacy-Backend');
        removeItemSync('phase1_key');
        assertEqual(storage.getItem('phase1_key'), null, 'Uninitialisierte Facade loescht im Legacy-Backend');
    }

    console.log('Test 4: initialized facade reads/writes synchronously from cache and flushes batch');
    {
        const adapter = createMemoryAdapter({ existing: 'old' });
        resetPersistenceForTests(adapter);
        configurePersistence({ debounceMs: 0 });
        await init();

        assertEqual(getItemSync('existing'), 'old', 'Init laedt Backend in Memory-Cache');
        setItemSync('new_key', 'new_value');
        assertEqual(getItemSync('new_key'), 'new_value', 'setItemSync ist sofort im Cache sichtbar');
        assertEqual(adapter.store.get('new_key'), undefined, 'Backend wird erst beim Flush geschrieben');

        await flush();
        assertEqual(adapter.store.get('new_key'), 'new_value', 'Flush schreibt Upsert ins Backend');
        assertEqual(adapter.batches.length, 1, 'Flush erzeugt genau einen Batch');

        removeItemSync('existing');
        assertEqual(getItemSync('existing'), null, 'removeItemSync entfernt sofort aus Cache');
        await flush();
        assertEqual(adapter.store.has('existing'), false, 'Flush schreibt Delete ins Backend');
    }

    console.log('Test 5: failed flush keeps dirty keys queued');
    {
        const adapter = createMemoryAdapter({}, { failSave: true });
        resetPersistenceForTests(adapter);
        await init();

        setItemSync('will_retry', '1');
        let thrown = false;
        try {
            await flush();
        } catch {
            thrown = true;
        }
        assert(thrown, 'Flush-Fehler wird weitergegeben');
        assert(getDirtyState().dirtyKeys.includes('will_retry'), 'Dirty Key bleibt nach Fehler in Queue');
    }

    console.log('Test 6: export/import bundle and runtime writes are not allowlist-blocked');
    {
        const adapter = createMemoryAdapter();
        resetPersistenceForTests(adapter);
        await init();

        setItemSync('new_future_runtime_key', 'allowed-at-runtime');
        const bundle = exportAllSync();
        assertEqual(bundle.records.new_future_runtime_key, 'allowed-at-runtime', 'Runtime-Key wird exportiert');

        await importAll({
            records: {
                [CONFIG.STORAGE.LS_KEY]: '{"inputs":{}}',
                unrelated: 'blocked'
            }
        }, {
            replace: true,
            allowKey: isAllowedPersistenceImportKey
        });

        assertEqual(getItemSync(CONFIG.STORAGE.LS_KEY), '{"inputs":{}}', 'Import schreibt erlaubten Key');
        assertEqual(getItemSync('unrelated'), null, 'Import blockiert nicht erlaubten Fremd-Key');
    }

    console.log('Test 7: persistenceStorage exposes storage-like API');
    {
        const adapter = createMemoryAdapter();
        resetPersistenceForTests(adapter);
        await init();

        persistenceStorage.setItem('a', '1');
        persistenceStorage.setItem('b', '2');
        assertEqual(persistenceStorage.length, 2, 'Storage-like API liefert length');
        assert(keysSync().includes(persistenceStorage.key(0)), 'Storage-like key() liefert vorhandenen Key');
        persistenceStorage.clear();
        assertEqual(persistenceStorage.length, 0, 'Storage-like clear leert Cache');
    }

    console.log('Test 8: flush calls are serialized to preserve write order');
    {
        const first = deferred();
        const second = deferred();
        const store = new Map();
        const calls = [];
        const adapter = {
            async open() {},
            async loadAll() {
                return {};
            },
            async saveBatch(batch) {
                calls.push({
                    upserts: batch.upserts.map(([key, value]) => [key, value]),
                    deletes: [...batch.deletes]
                });
                if (calls.length === 1) await first.promise;
                if (calls.length === 2) await second.promise;
                batch.deletes.forEach(key => store.delete(key));
                batch.upserts.forEach(([key, value]) => store.set(key, String(value)));
            }
        };

        resetPersistenceForTests(adapter);
        await init();

        setItemSync('race_key', 'old');
        const flushOne = flush();
        await Promise.resolve();
        assertEqual(calls.length, 1, 'Erster Flush startet sofort');

        setItemSync('race_key', 'new');
        const flushTwo = flush();
        await Promise.resolve();
        assertEqual(calls.length, 1, 'Zweiter Flush wartet auf den ersten Flush');

        first.resolve();
        await nextTick();
        assertEqual(calls.length, 2, 'Zweiter Flush startet nach Abschluss des ersten');
        second.resolve();
        await Promise.all([flushOne, flushTwo]);

        assertEqual(store.get('race_key'), 'new', 'Serialisierte Flushes bewahren den neuesten Wert');
    }

    console.log('Test 9: reset unregisters lifecycle listeners');
    {
        const listeners = new Map();
        let removeCount = 0;
        const doc = {
            visibilityState: 'visible',
            addEventListener(type, handler) {
                listeners.set(`doc:${type}`, handler);
            },
            removeEventListener(type, handler) {
                if (listeners.get(`doc:${type}`) === handler) removeCount += 1;
            }
        };
        const win = {
            addEventListener(type, handler) {
                listeners.set(`win:${type}`, handler);
            },
            removeEventListener(type, handler) {
                if (listeners.get(`win:${type}`) === handler) removeCount += 1;
            }
        };

        global.document = doc;
        global.window = win;
        resetPersistenceForTests(createMemoryAdapter());
        await init();

        assert(listeners.has('doc:visibilitychange'), 'visibilitychange Listener wird registriert');
        assert(listeners.has('win:pagehide'), 'pagehide Listener wird registriert');

        resetPersistenceForTests(createMemoryAdapter());
        assertEqual(removeCount, 2, 'resetPersistenceForTests entfernt beide Lifecycle-Listener');
    }

    console.log('Test 10: Tauri close event flushes cache before confirming close');
    {
        const adapter = createMemoryAdapter();
        let closeHandler = null;
        let confirmCloseCount = 0;
        const win = {
            addEventListener() {},
            removeEventListener() {},
            __TAURI__: {
                event: {
                    async listen(event, handler) {
                        if (event === 'ruhestand://close-requested') closeHandler = handler;
                        return () => {};
                    }
                },
                core: {
                    async invoke(command) {
                        if (command === 'confirm_app_close') confirmCloseCount += 1;
                    }
                }
            }
        };

        global.window = win;
        resetPersistenceForTests(adapter);
        await init();
        await nextTick();

        setItemSync('close_key', 'persisted');
        await closeHandler();

        assertEqual(adapter.store.get('close_key'), 'persisted', 'Tauri Close-Handshake flusht offene Writes');
        assertEqual(confirmCloseCount, 1, 'Tauri Close-Handshake bestaetigt Schliessen nach Flush');
    }

    console.log('Test 11: full persistence backup contains all records and runtime metadata');
    {
        const adapter = createMemoryAdapter({ alpha: '1', beta: '2' });
        resetPersistenceForTests(adapter);
        await init();

        const backup = buildFullPersistenceBackup({ window: { __TAURI__: {} } });
        assertEqual(backup.backupType, FULL_BACKUP_TYPE, 'Backup-Typ ist eindeutig');
        assertEqual(backup.runtime, 'tauri', 'Runtime-Metadaten werden geschrieben');
        assertEqual(backup.recordCount, 2, 'Backup zaehlt alle Records');
        assertEqual(backup.records.alpha, '1', 'Backup enthaelt ersten Key');
        assertEqual(backup.records.beta, '2', 'Backup enthaelt zweiten Key');
        assertEqual(backup.localStorage.alpha, '1', 'Legacy localStorage-Alias bleibt im Backup');
        const recovery = buildRecoveryPersistenceBackup({ reason: 'test-import' });
        assertEqual(recovery.backupPurpose, 'recovery-before-import', 'Recovery-Backup markiert seinen Zweck');
        assertEqual(recovery.recoveryReason, 'test-import', 'Recovery-Backup uebernimmt den Grund');
        assert(
            createFullBackupFilename(new Date('2026-05-25T12:13:14Z')).startsWith('ruhestand-suite-full-backup-2026-05-25_'),
            'Backup-Dateiname enthaelt Datum'
        );
        assert(
            createRecoveryBackupFilename(new Date('2026-05-25T12:13:14Z')).startsWith('ruhestand-suite-recovery-before-import-2026-05-25_'),
            'Recovery-Dateiname enthaelt Datum'
        );
    }

    console.log('Test 11: full persistence backup import replaces current records');
    {
        const adapter = createMemoryAdapter({ old: 'remove-me' });
        resetPersistenceForTests(adapter);
        await init();

        const invalid = normalizeFullPersistenceBackup({ records: { x: '1' } });
        assertEqual(invalid.ok, false, 'Import lehnt Dateien ohne Backup-Typ ab');

        const result = await importFullPersistenceBackup({
            backupType: FULL_BACKUP_TYPE,
            schemaVersion: 1,
            records: {
                next: 42,
                flag: true,
                __proto__: 'blocked',
                constructor: 'blocked',
                prototype: 'blocked'
            }
        });

        assertEqual(result.ok, true, 'Komplettimport ist erfolgreich');
        assertEqual(getItemSync('old'), null, 'Komplettimport ersetzt alte Daten');
        assertEqual(getItemSync('next'), '42', 'Komplettimport schreibt numerische Werte als String');
        assertEqual(getItemSync('flag'), 'true', 'Komplettimport schreibt Boolean-Werte als String');
        assertEqual(getItemSync('__proto__'), null, 'Komplettimport filtert __proto__');
        assertEqual(getItemSync('constructor'), null, 'Komplettimport filtert constructor');
        assertEqual(getItemSync('prototype'), null, 'Komplettimport filtert prototype');
    }

    console.log('Test 11b: full backup import UI creates recovery backup before replacing records');
    {
        const adapter = createMemoryAdapter({ old: 'keep-me' });
        resetPersistenceForTests(adapter);
        await init();

        const handlers = new Map();
        const button = {
            addEventListener(type, handler) {
                handlers.set(`button:${type}`, handler);
            }
        };
        const fileInput = {
            files: [{ name: 'backup.json' }],
            value: '',
            click() {},
            addEventListener(type, handler) {
                handlers.set(`file:${type}`, handler);
            }
        };
        const status = { dataset: {}, textContent: '' };
        const doc = {
            getElementById(id) {
                return {
                    fullBackupImportBtn: button,
                    fullBackupImportFile: fileInput,
                    fullBackupStatus: status
                }[id] || null;
            }
        };
        const prevFileReader = global.FileReader;
        let reloadCount = 0;
        let recoverySawOldValue = false;

        try {
            global.FileReader = class {
                readAsText() {
                    this.result = JSON.stringify({
                        backupType: FULL_BACKUP_TYPE,
                        schemaVersion: 1,
                        records: { next: 'imported' }
                    });
                    setTimeout(() => this.onload?.(), 0);
                }
            };

            bindFullBackupImport({
                document: doc,
                confirmImport: () => true,
                reload: () => { reloadCount += 1; },
                createRecoveryBackup: async () => {
                    recoverySawOldValue = getItemSync('old') === 'keep-me';
                    return { filename: 'recovery.json', backup: buildRecoveryPersistenceBackup(), skipped: false };
                }
            });

            handlers.get('file:change')();
            await new Promise(resolve => setTimeout(resolve, 10));

            assertEqual(recoverySawOldValue, true, 'Recovery-Backup wird vor dem Ersetzen erzeugt');
            assertEqual(getItemSync('old'), null, 'Import ersetzt nach Recovery die alten Daten');
            assertEqual(getItemSync('next'), 'imported', 'Import schreibt die neuen Daten nach Recovery');
            assertEqual(reloadCount, 1, 'Import triggert nach Erfolg einen Reload');
            assert(status.textContent.includes('Recovery-Backup wurde vorher erstellt'), 'Status nennt vorheriges Recovery-Backup');
        } finally {
            if (prevFileReader === undefined) delete global.FileReader; else global.FileReader = prevFileReader;
        }
    }

    console.log('Test 12: IndexedDB adapter stores kv records and metadata');
    {
        const fakeIndexedDB = createFakeIndexedDB();
        const adapter = createIndexedDbAdapter({
            indexedDB: fakeIndexedDB,
            dbName: 'test-ruhestand-suite'
        });

        await adapter.open();
        assert(fakeIndexedDB.db.stores.has('kv'), 'IndexedDB Adapter erstellt kv Store');
        assert(fakeIndexedDB.db.stores.has('metadata'), 'IndexedDB Adapter erstellt metadata Store');

        await adapter.saveBatch({
            upserts: [['a', '1'], ['b', 2]],
            deletes: []
        });
        assertEqual(fakeIndexedDB.db.stores.get('kv').get('a').value, '1', 'IndexedDB Adapter schreibt String-Werte');
        assertEqual(fakeIndexedDB.db.stores.get('kv').get('b').value, '2', 'IndexedDB Adapter normalisiert Werte auf String');

        const loaded = await adapter.loadAll();
        assertEqual(loaded.a, '1', 'IndexedDB Adapter laedt ersten KV-Eintrag');
        assertEqual(loaded.b, '2', 'IndexedDB Adapter laedt zweiten KV-Eintrag');

        await adapter.saveBatch({
            upserts: [['c', '3']],
            deletes: ['a']
        });
        const afterDelete = await adapter.loadAll();
        assertEqual(afterDelete.a, undefined, 'IndexedDB Adapter loescht KV-Eintraege');
        assertEqual(afterDelete.c, '3', 'IndexedDB Adapter schreibt Upserts im Delete-Batch');

        await adapter.writeMetadata('migration', { done: true });
        const metadata = await adapter.readMetadata('migration');
        assertEqual(metadata.done, true, 'IndexedDB Adapter liest Metadata getrennt vom KV-Store');
    }

    console.log('Test 13: Tauri JSON adapter stores records via Rust commands');
    {
        let fileContent = '';
        const calls = [];
        const adapter = createTauriJsonFileAdapter({
            invoke: async (command, args = {}) => {
                calls.push([command, args]);
                if (command === 'load_app_state') return fileContent;
                if (command === 'save_app_state') {
                    fileContent = args.content;
                    return null;
                }
                if (command === 'quarantine_app_state') {
                    fileContent = '';
                    return 'corrupt-file.json';
                }
                throw new Error(`unknown command ${command}`);
            }
        });

        await adapter.open();
        await adapter.saveBatch({ upserts: [['alpha', 1], ['beta', '2']], deletes: [] });
        let loaded = await adapter.loadAll();
        assertEqual(loaded.alpha, '1', 'Tauri Adapter schreibt String-Werte');
        assertEqual(loaded.beta, '2', 'Tauri Adapter schreibt zweiten Wert');
        await adapter.writeMetadata('migration', { done: true });
        const metadata = await adapter.readMetadata('migration');
        assertEqual(metadata.done, true, 'Tauri Adapter liest Metadata');
        await adapter.saveBatch({ upserts: [], deletes: ['alpha'] });
        loaded = await adapter.loadAll();
        assertEqual(loaded.alpha, undefined, 'Tauri Adapter loescht Records');
        assert(calls.some(([command]) => command === 'save_app_state'), 'Tauri Adapter ruft save_app_state auf');
    }

    console.log('Test 14: Tauri JSON adapter quarantines corrupt state');
    {
        const adapter = createTauriJsonFileAdapter({
            invoke: async (command) => {
                if (command === 'load_app_state') return '{broken json';
                if (command === 'quarantine_app_state') return 'quarantined.json';
                throw new Error(`unexpected command ${command}`);
            }
        });
        try {
            await adapter.open();
            assert(false, 'Korruptes Tauri JSON sollte einen Fehler werfen');
        } catch (err) {
            assertEqual(err.code, 'tauri-state-corrupt', 'Korruptes Tauri JSON setzt Fehlercode');
            assertEqual(err.quarantinePath, 'quarantined.json', 'Korruptes Tauri JSON merkt Quarantaene-Pfad');
        }
    }

    console.log('Test 15: Tauri runtime uses JSON file adapter and migrates allowed legacy localStorage records');
    {
        let fileContent = '';
        const storage = new MockStorage();
        storage.setItem(CONFIG.STORAGE.LS_KEY, '{"inputs":{"alter":67}}');
        storage.setItem('sim_dynamicFlex', 'true');
        storage.setItem('unrelated_secret', 'blocked');
        resetPersistenceRuntimeForTests();

        await init({
            window: { __TAURI__: {} },
            localStorage: storage,
            invoke: async (command, args = {}) => {
                if (command === 'load_app_state') return fileContent;
                if (command === 'save_app_state') {
                    fileContent = args.content;
                    return null;
                }
                if (command === 'quarantine_app_state') return 'quarantined.json';
                throw new Error(`unknown command ${command}`);
            }
        });

        assertEqual(getPersistenceStatus().backend, 'Tauri JSON File', 'Tauri Runtime nutzt JSON-Dateiadapter');
        assertEqual(getItemSync(CONFIG.STORAGE.LS_KEY), '{"inputs":{"alter":67}}', 'Tauri Migration uebernimmt erlaubten Balance-Key');
        assertEqual(getItemSync('sim_dynamicFlex'), 'true', 'Tauri Migration uebernimmt erlaubten Simulator-Key');
        assertEqual(getItemSync('unrelated_secret'), null, 'Tauri Migration filtert nicht erlaubten Legacy-Key');
        assertEqual(storage.getItem(LEGACY_MIGRATION_MARKER_KEYS.target), 'tauri-json-file', 'Tauri Migration setzt Target-Marker');
    }

    console.log('Test 16: Tauri corrupt state starts with recovery warning instead of failing init');
    {
        resetPersistenceRuntimeForTests();
        await init({
            window: { __TAURI__: {} },
            invoke: async (command) => {
                if (command === 'load_app_state') return '{broken json';
                if (command === 'quarantine_app_state') return 'quarantined.json';
                if (command === 'save_app_state') return null;
                throw new Error(`unknown command ${command}`);
            }
        });
        assertEqual(getPersistenceStatus().backend, 'Tauri JSON File', 'Tauri Recovery bleibt auf Dateiadapter');
        assertEqual(getPersistenceStatus().migrationWarning.code, 'tauri-state-corrupt', 'Tauri Recovery setzt Warnzustand');
        assertEqual(getPersistenceStatus().recordCount, 0, 'Tauri Recovery startet ohne geladene Records');
    }

    console.log('Test 17: browser migration copies allowed legacy localStorage records to IndexedDB');
    {
        const storage = new MockStorage();
        storage.setItem(CONFIG.STORAGE.LS_KEY, '{"inputs":{"alter":65}}');
        storage.setItem('sim_dynamicFlex', 'true');
        storage.setItem('unrelated_secret', 'blocked');
        const adapter = createIndexedDbAdapter({
            indexedDB: createFakeIndexedDB(),
            dbName: 'migration-test'
        });
        resetPersistenceForTests(adapter);

        await init({ localStorage: storage });

        assertEqual(getItemSync(CONFIG.STORAGE.LS_KEY), '{"inputs":{"alter":65}}', 'Migration uebernimmt erlaubten Balance-Key');
        assertEqual(getItemSync('sim_dynamicFlex'), 'true', 'Migration uebernimmt erlaubten Simulator-Key');
        assertEqual(getItemSync('unrelated_secret'), null, 'Migration filtert nicht erlaubten Legacy-Key');
        assertEqual(storage.getItem(LEGACY_MIGRATION_MARKER_KEYS.target), 'indexeddb', 'Migration setzt Target-Marker im localStorage');
        assert(storage.getItem(LEGACY_MIGRATION_MARKER_KEYS.completedAt), 'Migration setzt Zeitstempel-Marker');
        assert(storage.getItem(LEGACY_MIGRATION_MARKER_KEYS.checksum), 'Migration setzt Checksum-Marker');
        assertEqual(getPersistenceStatus().backend, 'IndexedDB', 'Aktives Backend ist IndexedDB');
    }

    console.log('Test 18: browser migration blocks silent reversion when IndexedDB is empty after migration');
    {
        const storage = new MockStorage();
        storage.setItem(CONFIG.STORAGE.LS_KEY, '{"inputs":{"alter":60}}');
        storage.setItem(LEGACY_MIGRATION_MARKER_KEYS.target, 'indexeddb');
        const adapter = createIndexedDbAdapter({
            indexedDB: createFakeIndexedDB(),
            dbName: 'silent-reversion-test'
        });
        resetPersistenceForTests(adapter);

        await init({ localStorage: storage });

        assertEqual(getItemSync(CONFIG.STORAGE.LS_KEY), null, 'Veralteter localStorage-Stand wird nicht still erneut migriert');
        assertEqual(getPersistenceStatus().migrationWarning.code, 'indexeddb-empty-after-migration', 'Silent-Reversion-Warnung wird gesetzt');
        assertEqual(getPersistenceStatus().recordCount, 0, 'IndexedDB bleibt leer statt Legacy-Daten zu uebernehmen');
    }

    console.log('Test 19: runtime cache accepts prototype-like keys without prototype pollution');
    {
        const adapter = createMemoryAdapter();
        resetPersistenceForTests(adapter);
        await init();

        setItemSync('__proto__', 'runtime-value');
        setItemSync('constructor', 'runtime-constructor');
        setItemSync('prototype', 'runtime-prototype');

        assertEqual(getItemSync('__proto__'), 'runtime-value', 'Cache behandelt __proto__ als normalen Key');
        assertEqual(getItemSync('constructor'), 'runtime-constructor', 'Cache behandelt constructor als normalen Key');
        assertEqual(getItemSync('prototype'), 'runtime-prototype', 'Cache behandelt prototype als normalen Key');
        assertEqual(Object.getPrototypeOf(exportAllSync().records), null, 'Exportiertes Record-Objekt hat keinen Prototyp');
        assertEqual({}.polluted, undefined, 'Object-Prototyp bleibt unveraendert');
    }

    console.log('Test 20: failed flush does not override concurrent delete/write changes on same key');
    {
        const def = deferred();
        const adapter = {
            async open() {},
            async loadAll() { return {}; },
            async saveBatch(batch) {
                await def.promise;
                throw new Error('simulated save failure');
            }
        };
        resetPersistenceForTests(adapter);
        await init();

        setItemSync('concurrency_key', 'initial');
        const flushPromise = flush();
        
        removeItemSync('concurrency_key');
        
        def.resolve();
        try {
            await flushPromise;
        } catch {
            // expected
        }

        assertEqual(getItemSync('concurrency_key'), null, 'Concurrent deletion is preserved after failed flush');
        assert(!getDirtyState().dirtyKeys.includes('concurrency_key'), 'Key is not in dirty list since it was deleted');
        assert(getDirtyState().deletedKeys.includes('concurrency_key'), 'Key is in deleted list');
    }

    console.log('Test 21: failed flush does not override concurrent write changes on deleted key');
    {
        const def = deferred();
        const adapter = {
            async open() {},
            async loadAll() { return { 'concurrency_key2': 'initial' }; },
            async saveBatch(batch) {
                await def.promise;
                throw new Error('simulated save failure');
            }
        };
        resetPersistenceForTests(adapter);
        await init();

        removeItemSync('concurrency_key2');
        const flushPromise = flush();

        setItemSync('concurrency_key2', 'new_val');

        def.resolve();
        try {
            await flushPromise;
        } catch {
            // expected
        }

        assertEqual(getItemSync('concurrency_key2'), 'new_val', 'Concurrent write is preserved after failed flush');
        assert(getDirtyState().dirtyKeys.includes('concurrency_key2'), 'Key is in dirty list');
        assert(!getDirtyState().deletedKeys.includes('concurrency_key2'), 'Key is not in deleted list');
    }

    console.log('Persistence tests passed');
} finally {
    resetPersistenceForTests(createLocalStorageAdapter());
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
}

console.log('--- Persistence Tests Completed ---');
