// @ts-check

const DEFAULT_DB_NAME = 'ruhestand-suite';
const DEFAULT_DB_VERSION = 1;
const KV_STORE = 'kv';
const METADATA_STORE = 'metadata';

function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
}

function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
        transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
    });
}

function ensureStore(db, name) {
    if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name, { keyPath: 'key' });
    }
}

export function createIndexedDbAdapter(options = {}) {
    const dbName = options.dbName || DEFAULT_DB_NAME;
    const dbVersion = options.dbVersion || DEFAULT_DB_VERSION;
    const indexedDb = options.indexedDB || globalThis.indexedDB;
    let db = null;

    async function ensureOpen() {
        if (db) return db;
        if (!indexedDb?.open) {
            throw new Error('IndexedDB ist in dieser Laufzeit nicht verfuegbar.');
        }
        const request = indexedDb.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
            const upgradeDb = request.result;
            ensureStore(upgradeDb, KV_STORE);
            ensureStore(upgradeDb, METADATA_STORE);
        };
        db = await requestToPromise(request);
        db.onversionchange = () => {
            db?.close?.();
            db = null;
        };
        return db;
    }

    function getStore(database, storeName, mode = 'readonly') {
        return database.transaction(storeName, mode).objectStore(storeName);
    }

    return {
        name: 'IndexedDB',

        async open() {
            await ensureOpen();
        },

        async loadAll() {
            const database = await ensureOpen();
            const store = getStore(database, KV_STORE);
            const records = Object.create(null);
            const request = store.openCursor();
            await new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const cursor = request.result;
                    if (!cursor) {
                        resolve(true);
                        return;
                    }
                    const row = cursor.value;
                    if (row?.key !== undefined && row.value !== undefined) {
                        records[String(row.key)] = String(row.value);
                    }
                    cursor.continue();
                };
                request.onerror = () => reject(request.error || new Error('IndexedDB cursor failed'));
            });
            return records;
        },

        async saveBatch(batch = {}) {
            const database = await ensureOpen();
            const transaction = database.transaction(KV_STORE, 'readwrite');
            const store = transaction.objectStore(KV_STORE);
            const updatedAt = new Date().toISOString();

            (batch.deletes || []).forEach(key => {
                store.delete(String(key));
            });
            (batch.upserts || []).forEach(([key, value]) => {
                store.put({ key: String(key), value: String(value), updatedAt });
            });

            await transactionDone(transaction);
        },

        async readMetadata(key) {
            const database = await ensureOpen();
            const store = getStore(database, METADATA_STORE);
            const row = await requestToPromise(store.get(String(key)));
            return row?.value ?? null;
        },

        async writeMetadata(key, value) {
            const database = await ensureOpen();
            const transaction = database.transaction(METADATA_STORE, 'readwrite');
            transaction.objectStore(METADATA_STORE).put({
                key: String(key),
                value,
                updatedAt: new Date().toISOString()
            });
            await transactionDone(transaction);
        },

        close() {
            db?.close?.();
            db = null;
        }
    };
}

export default createIndexedDbAdapter;
