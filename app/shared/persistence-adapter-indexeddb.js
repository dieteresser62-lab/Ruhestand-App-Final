// @ts-check

const DEFAULT_DB_NAME = 'ruhestand-suite';
const DEFAULT_DB_VERSION = 2;
const KV_STORE = 'kv';
const METADATA_STORE = 'metadata';
const SNAPSHOT_STORE = 'snapshots';
const OUTDATED_MESSAGE = 'Datenbankverbindung veraltet, bitte diesen Tab neu laden.';
const UPGRADE_BLOCKED_MESSAGE = 'IndexedDB-Upgrade blockiert. Bitte andere RuhestandSuite-Tabs schliessen oder neu laden.';

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

function dispatchPersistenceEvent(type, detail = {}) {
    if (typeof globalThis.dispatchEvent !== 'function') return;
    try {
        const event = typeof globalThis.CustomEvent === 'function'
            ? new globalThis.CustomEvent(type, { detail })
            : { type, detail };
        globalThis.dispatchEvent(event);
    } catch (err) {
        console.warn(`[IndexedDBPersistence] Failed to dispatch ${type}:`, err);
    }
}

function createOutdatedError() {
    const err = new Error(OUTDATED_MESSAGE);
    err.code = 'indexeddb-outdated';
    return err;
}

function createUpgradeBlockedError() {
    const err = new Error(UPGRADE_BLOCKED_MESSAGE);
    err.code = 'indexeddb-upgrade-blocked';
    return err;
}

function toSnapshotIndexEntry(snapshot) {
    const { records, ...indexEntry } = snapshot || {};
    return indexEntry;
}

export function createIndexedDbAdapter(options = {}) {
    const dbName = options.dbName || DEFAULT_DB_NAME;
    const dbVersion = options.dbVersion || DEFAULT_DB_VERSION;
    const indexedDb = options.indexedDB || globalThis.indexedDB;
    let db = null;
    let outdated = false;

    async function ensureOpen() {
        if (outdated) throw createOutdatedError();
        if (db) return db;
        if (!indexedDb?.open) {
            throw new Error('IndexedDB ist in dieser Laufzeit nicht verfuegbar.');
        }
        const request = indexedDb.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
            const upgradeDb = request.result;
            ensureStore(upgradeDb, KV_STORE);
            ensureStore(upgradeDb, METADATA_STORE);
            ensureStore(upgradeDb, SNAPSHOT_STORE);
        };
        db = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
            request.onblocked = () => {
                const err = createUpgradeBlockedError();
                dispatchPersistenceEvent('persistence:upgrade-blocked', { dbName, dbVersion, message: err.message });
                reject(err);
            };
        });
        db.onversionchange = () => {
            outdated = true;
            db?.close?.();
            db = null;
            dispatchPersistenceEvent('persistence:outdated', { dbName, message: OUTDATED_MESSAGE });
        };
        return db;
    }

    function assertUsable() {
        if (outdated) throw createOutdatedError();
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
            assertUsable();
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
            assertUsable();
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
            assertUsable();
            const database = await ensureOpen();
            const store = getStore(database, METADATA_STORE);
            const row = await requestToPromise(store.get(String(key)));
            return row?.value ?? null;
        },

        async writeMetadata(key, value) {
            assertUsable();
            const database = await ensureOpen();
            const transaction = database.transaction(METADATA_STORE, 'readwrite');
            transaction.objectStore(METADATA_STORE).put({
                key: String(key),
                value,
                updatedAt: new Date().toISOString()
            });
            await transactionDone(transaction);
        },

        async listSnapshots() {
            assertUsable();
            const database = await ensureOpen();
            const store = getStore(database, SNAPSHOT_STORE);
            const snapshots = [];
            const request = store.openCursor();
            await new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const cursor = request.result;
                    if (!cursor) {
                        resolve(true);
                        return;
                    }
                    const snapshot = cursor.value?.snapshot || cursor.value;
                    snapshots.push(toSnapshotIndexEntry(snapshot));
                    cursor.continue();
                };
                request.onerror = () => reject(request.error || new Error('IndexedDB snapshot cursor failed'));
            });
            return snapshots;
        },

        async readSnapshot(id) {
            assertUsable();
            const snapshotId = String(id || '');
            const database = await ensureOpen();
            const store = getStore(database, SNAPSHOT_STORE);
            const row = await requestToPromise(store.get(snapshotId));
            const snapshot = row?.snapshot || row;
            if (!snapshot) {
                throw new Error(`Snapshot ${snapshotId} wurde nicht gefunden.`);
            }
            return snapshot;
        },

        async writeSnapshot(snapshot) {
            assertUsable();
            const snapshotId = String(snapshot?.id || '');
            if (!snapshotId) {
                throw new Error('Snapshot-ID fehlt.');
            }
            const database = await ensureOpen();
            const transaction = database.transaction(SNAPSHOT_STORE, 'readwrite');
            transaction.objectStore(SNAPSHOT_STORE).put({
                key: snapshotId,
                snapshot,
                updatedAt: new Date().toISOString()
            });
            await transactionDone(transaction);
            return true;
        },

        async deleteSnapshot(id) {
            assertUsable();
            const snapshotId = String(id || '');
            const database = await ensureOpen();
            const existing = await requestToPromise(getStore(database, SNAPSHOT_STORE).get(snapshotId));
            if (!existing) return false;
            const transaction = database.transaction(SNAPSHOT_STORE, 'readwrite');
            transaction.objectStore(SNAPSHOT_STORE).delete(snapshotId);
            await transactionDone(transaction);
            return true;
        },

        async migrateLegacySnapshotsIfNeeded() {
            assertUsable();
            await ensureOpen();
            return { migratedCount: 0, skippedCount: 0, notStandardRestorableCount: 0, errors: [] };
        },

        async replaceLiveRecords(records, options = {}) {
            assertUsable();
            const database = await ensureOpen();
            const deleteKeys = Array.isArray(options.deleteKeys) ? options.deleteKeys : [];
            const upserts = Array.isArray(options.upserts) ? options.upserts : Object.entries(records || {});
            const transaction = database.transaction(KV_STORE, 'readwrite');
            const store = transaction.objectStore(KV_STORE);
            const updatedAt = new Date().toISOString();

            deleteKeys.forEach(key => {
                store.delete(String(key));
            });
            upserts.forEach(([key, value]) => {
                if (value === null || value === undefined) return;
                store.put({ key: String(key), value: String(value), updatedAt });
            });

            await transactionDone(transaction);
            return { ok: true, deletedCount: deleteKeys.length, upsertCount: upserts.length };
        },

        close() {
            db?.close?.();
            db = null;
        }
    };
}

export default createIndexedDbAdapter;
