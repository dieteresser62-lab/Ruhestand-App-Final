// @ts-check

import { createLocalStorageAdapter } from './persistence-adapter-localstorage.js';
import { createIndexedDbAdapter } from './persistence-adapter-indexeddb.js';
import { createTauriJsonFileAdapter } from './persistence-adapter-tauri.js';
import { detectRuntime } from './runtime-env.js';

const DEFAULT_DEBOUNCE_MS = 250;
const INDEXEDDB_MIGRATION_TARGET = 'indexeddb';
const TAURI_MIGRATION_TARGET = 'tauri-json-file';
const LEGACY_MIGRATION_MARKER_KEYS = Object.freeze({
    target: 'ruhestandsapp_migrated_to_target',
    completedAt: 'ruhestandsapp_migration_completed_at',
    checksum: 'ruhestandsapp_migration_checksum'
});
const LOCAL_SNAPSHOT_ARCHIVE_KEY = 'rs_snapshot_archive_v1';
const LOCAL_SNAPSHOT_ARCHIVE_SCHEMA_VERSION = 1;
const MARKER_KEY_SET = new Set(Object.values(LEGACY_MIGRATION_MARKER_KEYS));

let adapter = createLocalStorageAdapter();
let adapterExplicitlyConfigured = false;
let memCache = Object.create(null);
let initialized = false;
let initPromise = null;
let dirtyKeys = new Set();
let deletedKeys = new Set();
let flushTimer = null;
let debounceMs = DEFAULT_DEBOUNCE_MS;
let lifecycleBindings = [];
let lifecycleBindToken = 0;
let lastFlushError = null;
let flushChain = Promise.resolve();
let migrationWarning = null;

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function toNullPrototypeRecords(records) {
    const normalized = Object.create(null);
    if (!records || typeof records !== 'object') return normalized;
    Object.entries(records).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        normalized[String(key)] = String(value);
    });
    return normalized;
}

function normalizeSnapshotListArchive(raw) {
    if (!raw) {
        return {
            schemaVersion: LOCAL_SNAPSHOT_ARCHIVE_SCHEMA_VERSION,
            savedAt: '',
            snapshots: []
        };
    }
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Snapshot-Archiv ist ungueltig.');
    }
    if (Number(parsed.schemaVersion) !== LOCAL_SNAPSHOT_ARCHIVE_SCHEMA_VERSION) {
        throw new Error(`Snapshot-Archiv-Schema ${parsed.schemaVersion} wird nicht unterstuetzt.`);
    }
    if (!Array.isArray(parsed.snapshots)) {
        throw new Error('Snapshot-Archiv enthaelt keine gueltige Snapshot-Liste.');
    }
    return {
        schemaVersion: LOCAL_SNAPSHOT_ARCHIVE_SCHEMA_VERSION,
        savedAt: parsed.savedAt ? String(parsed.savedAt) : '',
        snapshots: parsed.snapshots.filter(snapshot => snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot))
    };
}

function serializeSnapshotListArchive(snapshots) {
    return JSON.stringify({
        schemaVersion: LOCAL_SNAPSHOT_ARCHIVE_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        snapshots
    });
}

function toSnapshotArchiveIndexEntry(snapshot) {
    const { records, ...indexEntry } = snapshot || {};
    return indexEntry;
}

function isLocalStorageFallbackAdapter(activeAdapter = adapter) {
    return activeAdapter?.name === 'localStorage';
}

function requireAdapterMethod(methodName) {
    const method = adapter?.[methodName];
    if (typeof method !== 'function') {
        throw new Error(`Aktiver Persistenzadapter unterstuetzt ${methodName}() nicht.`);
    }
    return method.bind(adapter);
}

function clearScheduledFlush() {
    if (flushTimer !== null && typeof clearTimeout === 'function') {
        clearTimeout(flushTimer);
    }
    flushTimer = null;
}

function scheduleFlush() {
    if (!initialized || typeof setTimeout !== 'function') return;
    clearScheduledFlush();
    flushTimer = setTimeout(() => {
        flush().catch(err => {
            console.error('[PersistenceFacade] flush failed:', err);
        });
    }, debounceMs);
}

function simpleChecksum(records) {
    const json = JSON.stringify(Object.keys(records).sort().map(key => [key, records[key]]));
    let hash = 0;
    for (let i = 0; i < json.length; i += 1) {
        hash = ((hash << 5) - hash + json.charCodeAt(i)) | 0;
    }
    return String(hash >>> 0);
}

async function collectAllowedLegacyRecords(storage = globalThis.localStorage) {
    const { listAllowedPersistenceImportKeys } = await import('./persistence-key-policy.js');
    const records = Object.create(null);
    listAllowedPersistenceImportKeys(storage).forEach(key => {
        if (MARKER_KEY_SET.has(key)) return;
        const value = storage.getItem(key);
        if (value !== null && value !== undefined) records[key] = String(value);
    });
    return records;
}

function resolveRuntimeAdapter(options = {}) {
    if (options.adapter) return options.adapter;
    const runtime = detectRuntime(options.window || globalThis.window);
    if (runtime === 'tauri') {
        return createTauriJsonFileAdapter({ invoke: options.invoke });
    }
    if (runtime === 'browser' && (options.indexedDB || globalThis.indexedDB)?.open) {
        return createIndexedDbAdapter({ indexedDB: options.indexedDB || globalThis.indexedDB });
    }
    return createLocalStorageAdapter();
}

function getMigrationTargetForAdapter(activeAdapter) {
    if (activeAdapter?.name === 'IndexedDB') return INDEXEDDB_MIGRATION_TARGET;
    if (activeAdapter?.name === 'Tauri JSON File') return TAURI_MIGRATION_TARGET;
    return null;
}

async function migrateLegacyLocalStorageToTargetIfNeeded(activeAdapter, loadedRecords, options = {}) {
    const migrationTarget = getMigrationTargetForAdapter(activeAdapter);
    if (!migrationTarget) return { records: loadedRecords, warning: null };
    const storage = options.localStorage || globalThis.localStorage;
    if (!storage) return { records: loadedRecords, warning: null };

    const legacyRecords = await collectAllowedLegacyRecords(storage);
    const hasTargetRecords = Object.keys(loadedRecords).length > 0;
    const hasLegacyRecords = Object.keys(legacyRecords).length > 0;
    const migratedTarget = storage.getItem(LEGACY_MIGRATION_MARKER_KEYS.target);

    if (hasTargetRecords || !hasLegacyRecords) {
        return { records: loadedRecords, warning: null };
    }

    if (migratedTarget === migrationTarget) {
        return {
            records: loadedRecords,
            warning: {
                code: `${migrationTarget}-empty-after-migration`,
                message: `${activeAdapter.name} ist leer, obwohl bereits eine Migration markiert wurde. Veraltete localStorage-Daten wurden nicht automatisch erneut eingespielt.`
            }
        };
    }

    await activeAdapter.saveBatch({
        upserts: Object.entries(legacyRecords),
        deletes: []
    });
    const checksum = simpleChecksum(legacyRecords);
    storage.setItem(LEGACY_MIGRATION_MARKER_KEYS.target, migrationTarget);
    storage.setItem(LEGACY_MIGRATION_MARKER_KEYS.completedAt, new Date().toISOString());
    storage.setItem(LEGACY_MIGRATION_MARKER_KEYS.checksum, checksum);
    await activeAdapter.writeMetadata?.('legacyMigration', {
        target: migrationTarget,
        completedAt: new Date().toISOString(),
        checksum,
        recordCount: Object.keys(legacyRecords).length
    });

    return {
        records: await activeAdapter.loadAll(),
        warning: null
    };
}

export function configurePersistence(options = {}) {
    if (options.adapter) {
        adapter = options.adapter;
        adapterExplicitlyConfigured = true;
    }
    if (Number.isFinite(options.debounceMs)) debounceMs = Math.max(0, Number(options.debounceMs));
}

export async function init(options = {}) {
    if (initPromise) return initPromise;
    if (options.adapter || Number.isFinite(options.debounceMs)) {
        configurePersistence(options);
    }
    initPromise = (async () => {
        if (!adapterExplicitlyConfigured) {
            adapter = resolveRuntimeAdapter(options);
        }
        let loadedRecords;
        let skipLegacyMigration = false;
        try {
            await adapter.open?.();
            loadedRecords = toNullPrototypeRecords(await adapter.loadAll());
        } catch (err) {
            if (err?.code !== 'tauri-state-corrupt') throw err;
            skipLegacyMigration = true;
            loadedRecords = Object.create(null);
            migrationWarning = {
                code: 'tauri-state-corrupt',
                message: `${err.message || 'Tauri-Daten konnten nicht gelesen werden'} Bitte ein Backup importieren oder mit leerem Zustand fortfahren.`,
                quarantinePath: err.quarantinePath || ''
            };
        }
        const migrationResult = skipLegacyMigration
            ? { records: loadedRecords, warning: null }
            : await migrateLegacyLocalStorageToTargetIfNeeded(adapter, loadedRecords, options);
        memCache = toNullPrototypeRecords(migrationResult.records);
        migrationWarning = migrationWarning || migrationResult.warning;
        initialized = true;
        bindLifecycleFlush();
        if (typeof globalThis.dispatchEvent === 'function') {
            try {
                const event = typeof globalThis.CustomEvent === 'function'
                    ? new globalThis.CustomEvent('persistence:initialized')
                    : { type: 'persistence:initialized' };
                globalThis.dispatchEvent(event);
            } catch (e) {
                console.warn('[PersistenceFacade] Failed to dispatch initialization event:', e);
            }
        }
        return true;
    })();
    return initPromise;
}

export function isInitialized() {
    return initialized;
}

export function getItemSync(key) {
    const normalized = String(key);
    if (initialized) {
        return hasOwn(memCache, normalized) ? memCache[normalized] : null;
    }
    return adapter.getItemSync?.(normalized) ?? null;
}

export function setItemSync(key, value) {
    const normalized = String(key);
    const stringValue = String(value);
    if (!initialized) {
        adapter.setItemSync?.(normalized, stringValue);
        return;
    }
    if (memCache[normalized] === stringValue && !deletedKeys.has(normalized)) return;
    memCache[normalized] = stringValue;
    deletedKeys.delete(normalized);
    dirtyKeys.add(normalized);
    scheduleFlush();
}

export function removeItemSync(key) {
    const normalized = String(key);
    if (!initialized) {
        adapter.removeItemSync?.(normalized);
        return;
    }
    if (!hasOwn(memCache, normalized) && !dirtyKeys.has(normalized)) return;
    delete memCache[normalized];
    dirtyKeys.delete(normalized);
    deletedKeys.add(normalized);
    scheduleFlush();
}

export function keysSync() {
    if (initialized) return Object.keys(memCache);
    return adapter.keysSync?.() ?? [];
}

export function keySync(index) {
    return keysSync()[index] || null;
}

export function clearAllowedSync(keysOrPredicate) {
    const predicate = typeof keysOrPredicate === 'function'
        ? keysOrPredicate
        : (key) => new Set(keysOrPredicate || []).has(key);
    keysSync().forEach(key => {
        if (predicate(key)) removeItemSync(key);
    });
}

export function clearSync() {
    keysSync().forEach(key => removeItemSync(key));
}

export function exportAllSync() {
    const records = Object.create(null);
    keysSync().forEach(key => {
        const value = getItemSync(key);
        if (value !== null && value !== undefined) records[key] = value;
    });
    return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        records
    };
}

export async function importAll(bundle, options = {}) {
    const records = bundle?.records || {};
    const allowKey = typeof options.allowKey === 'function' ? options.allowKey : () => true;
    if (!records || typeof records !== 'object') {
        return { ok: false, message: 'Ungueltiges Persistenz-Bundle.' };
    }
    if (options.replace === true) {
        keysSync().forEach(key => {
            if (allowKey(key)) removeItemSync(key);
        });
    }
    Object.entries(records).forEach(([key, value]) => {
        if (!allowKey(key)) return;
        if (value === null || value === undefined) return;
        setItemSync(key, String(value));
    });
    await flush();
    return { ok: true, message: 'Import erfolgreich.' };
}

export async function listSnapshots() {
    if (typeof adapter?.listSnapshots === 'function') {
        return adapter.listSnapshots();
    }
    if (!isLocalStorageFallbackAdapter()) {
        throw new Error('Aktiver Persistenzadapter unterstuetzt listSnapshots() nicht.');
    }
    const archive = normalizeSnapshotListArchive(getItemSync(LOCAL_SNAPSHOT_ARCHIVE_KEY));
    return archive.snapshots.map(toSnapshotArchiveIndexEntry);
}

export async function readSnapshot(id) {
    if (typeof adapter?.readSnapshot === 'function') {
        return adapter.readSnapshot(String(id || ''));
    }
    if (!isLocalStorageFallbackAdapter()) {
        throw new Error('Aktiver Persistenzadapter unterstuetzt readSnapshot() nicht.');
    }
    const snapshotId = String(id || '');
    const archive = normalizeSnapshotListArchive(getItemSync(LOCAL_SNAPSHOT_ARCHIVE_KEY));
    const snapshot = archive.snapshots.find(entry => String(entry?.id || '') === snapshotId);
    if (!snapshot) {
        throw new Error(`Snapshot ${snapshotId} wurde nicht gefunden.`);
    }
    return snapshot;
}

export async function writeSnapshot(snapshot) {
    if (typeof adapter?.writeSnapshot === 'function') {
        await adapter.writeSnapshot(snapshot);
        return true;
    }
    if (!isLocalStorageFallbackAdapter()) {
        throw new Error('Aktiver Persistenzadapter unterstuetzt writeSnapshot() nicht.');
    }
    const archive = normalizeSnapshotListArchive(getItemSync(LOCAL_SNAPSHOT_ARCHIVE_KEY));
    const snapshotId = String(snapshot?.id || '');
    if (!snapshotId) {
        throw new Error('Snapshot-ID fehlt.');
    }
    const nextSnapshots = archive.snapshots.filter(entry => String(entry?.id || '') !== snapshotId);
    nextSnapshots.push(snapshot);
    setItemSync(LOCAL_SNAPSHOT_ARCHIVE_KEY, serializeSnapshotListArchive(nextSnapshots));
    await flush();
    return true;
}

export async function deleteSnapshot(id) {
    if (typeof adapter?.deleteSnapshot === 'function') {
        await adapter.deleteSnapshot(String(id || ''));
        return true;
    }
    if (!isLocalStorageFallbackAdapter()) {
        throw new Error('Aktiver Persistenzadapter unterstuetzt deleteSnapshot() nicht.');
    }
    const snapshotId = String(id || '');
    const archive = normalizeSnapshotListArchive(getItemSync(LOCAL_SNAPSHOT_ARCHIVE_KEY));
    const nextSnapshots = archive.snapshots.filter(entry => String(entry?.id || '') !== snapshotId);
    if (nextSnapshots.length === archive.snapshots.length) return false;
    setItemSync(LOCAL_SNAPSHOT_ARCHIVE_KEY, serializeSnapshotListArchive(nextSnapshots));
    await flush();
    return true;
}

export async function migrateLegacySnapshotsIfNeeded() {
    if (typeof adapter?.migrateLegacySnapshotsIfNeeded === 'function') {
        return adapter.migrateLegacySnapshotsIfNeeded();
    }
    if (isLocalStorageFallbackAdapter()) {
        return { migratedCount: 0, skippedCount: 0, notStandardRestorableCount: 0, errors: [] };
    }
    throw new Error('Aktiver Persistenzadapter unterstuetzt migrateLegacySnapshotsIfNeeded() nicht.');
}

export async function replaceLiveRecords(records, options = {}) {
    clearScheduledFlush();
    await flush();

    const allowKey = typeof options.allowKey === 'function' ? options.allowKey : () => true;
    const requestedDeleteKeys = Array.isArray(options.deleteKeys) ? options.deleteKeys.map(key => String(key)) : [];
    const requestedUpserts = Array.isArray(options.upserts)
        ? options.upserts.map(([key, value]) => [String(key), value])
        : Object.entries(records || {});

    const deleteKeys = requestedDeleteKeys.filter(key => allowKey(key, options));
    const upserts = requestedUpserts
        .filter(([key, value]) => value !== null && value !== undefined && allowKey(String(key), options))
        .map(([key, value]) => [String(key), String(value)]);

    if (typeof adapter?.replaceLiveRecords === 'function') {
        const result = await adapter.replaceLiveRecords(records, { ...options, deleteKeys, upserts, allowKey });
        deleteKeys.forEach(key => {
            delete memCache[key];
        });
        upserts.forEach(([key, value]) => {
            memCache[key] = value;
        });
        dirtyKeys.clear();
        deletedKeys.clear();
        lastFlushError = null;
        return result ?? { ok: true, deletedCount: deleteKeys.length, upsertCount: upserts.length };
    }

    const affectedKeys = new Set([...deleteKeys, ...upserts.map(([key]) => key)]);
    const backup = Object.create(null);
    affectedKeys.forEach(key => {
        if (hasOwn(memCache, key)) backup[key] = memCache[key];
    });

    deleteKeys.forEach(key => {
        delete memCache[key];
    });
    upserts.forEach(([key, value]) => {
        memCache[key] = value;
    });
    dirtyKeys.clear();
    deletedKeys.clear();

    try {
        await requireAdapterMethod('saveBatch')({ deletes: deleteKeys, upserts });
        lastFlushError = null;
        return { ok: true, deletedCount: deleteKeys.length, upsertCount: upserts.length };
    } catch (err) {
        affectedKeys.forEach(key => {
            if (hasOwn(backup, key)) {
                memCache[key] = backup[key];
            } else {
                delete memCache[key];
            }
        });
        dirtyKeys.clear();
        deletedKeys.clear();
        lastFlushError = err;
        throw err;
    }
}

export async function flush() {
    clearScheduledFlush();
    if (!initialized) return true;

    const runFlush = async () => {
        if (dirtyKeys.size === 0 && deletedKeys.size === 0) return true;
        const batch = {
            upserts: Array.from(dirtyKeys).map(key => [key, memCache[key]]),
            deletes: Array.from(deletedKeys)
        };
        dirtyKeys.clear();
        deletedKeys.clear();
        try {
            await adapter.saveBatch(batch);
            lastFlushError = null;
            return true;
        } catch (err) {
            batch.upserts.forEach(([key]) => {
                if (!deletedKeys.has(key)) {
                    dirtyKeys.add(key);
                }
            });
            batch.deletes.forEach(key => {
                if (!dirtyKeys.has(key)) {
                    deletedKeys.add(key);
                }
            });
            lastFlushError = err;
            throw err;
        }
    };

    const queuedFlush = flushChain.then(runFlush, runFlush);
    flushChain = queuedFlush.catch(() => true);
    return queuedFlush;
}

export function getDirtyState() {
    return {
        dirtyKeys: Array.from(dirtyKeys),
        deletedKeys: Array.from(deletedKeys),
        lastFlushError
    };
}

export function getPersistenceStatus() {
    return {
        initialized,
        backend: adapter?.name || 'unknown',
        recordCount: keysSync().length,
        migrationWarning,
        lastFlushError
    };
}

export async function getMetadata(key) {
    return adapter.readMetadata?.(key) ?? null;
}

export function bindLifecycleFlush(doc = globalThis.document, win = globalThis.window) {
    if (lifecycleBindings.length > 0) return;
    const bindToken = lifecycleBindToken;
    const requestFlush = () => {
        flush().catch(err => console.error('[PersistenceFacade] lifecycle flush failed:', err));
    };
    const requestTauriCloseFlush = async () => {
        try {
            await flush();
        } catch (err) {
            console.error('[PersistenceFacade] Tauri close flush failed:', err);
        } finally {
            try {
                await win?.__TAURI__?.core?.invoke?.('confirm_app_close');
            } catch (err) {
                console.error('[PersistenceFacade] Tauri close confirmation failed:', err);
            }
        }
    };
    const visibilityHandler = () => {
        if (doc.visibilityState === 'hidden') requestFlush();
    };
    if (doc?.addEventListener) {
        doc.addEventListener('visibilitychange', visibilityHandler);
        lifecycleBindings.push({ target: doc, type: 'visibilitychange', handler: visibilityHandler });
    }
    if (win?.addEventListener) {
        win.addEventListener('pagehide', requestFlush);
        lifecycleBindings.push({ target: win, type: 'pagehide', handler: requestFlush });
    }
    if (win?.__TAURI__?.event?.listen && win?.__TAURI__?.core?.invoke) {
        win.__TAURI__.event.listen('ruhestand://close-requested', requestTauriCloseFlush)
            .then(unlisten => {
                if (bindToken === lifecycleBindToken) {
                    lifecycleBindings.push({ unlisten });
                } else {
                    unlisten?.();
                }
            })
            .catch(err => console.error('[PersistenceFacade] Tauri close listener failed:', err));
    }
}

export function unbindLifecycleFlush() {
    lifecycleBindToken += 1;
    lifecycleBindings.forEach(({ target, type, handler }) => {
        target?.removeEventListener?.(type, handler);
    });
    lifecycleBindings.forEach(({ unlisten }) => {
        try {
            unlisten?.();
        } catch (err) {
            console.error('[PersistenceFacade] Failed to unbind lifecycle listener:', err);
        }
    });
    lifecycleBindings = [];
}

export function resetPersistenceForTests(nextAdapter = createLocalStorageAdapter()) {
    clearScheduledFlush();
    unbindLifecycleFlush();
    adapter = nextAdapter;
    adapterExplicitlyConfigured = true;
    memCache = Object.create(null);
    initialized = false;
    initPromise = null;
    dirtyKeys = new Set();
    deletedKeys = new Set();
    flushTimer = null;
    debounceMs = DEFAULT_DEBOUNCE_MS;
    lastFlushError = null;
    flushChain = Promise.resolve();
    migrationWarning = null;
    lifecycleBindToken += 1;
}

export function resetPersistenceRuntimeForTests() {
    resetPersistenceForTests(createLocalStorageAdapter());
    adapterExplicitlyConfigured = false;
}

export const PersistenceFacade = {
    configurePersistence,
    init,
    isInitialized,
    getItemSync,
    setItemSync,
    removeItemSync,
    clearAllowedSync,
    keysSync,
    keySync,
    clearSync,
    exportAllSync,
    importAll,
    listSnapshots,
    readSnapshot,
    writeSnapshot,
    deleteSnapshot,
    migrateLegacySnapshotsIfNeeded,
    replaceLiveRecords,
    flush,
    getDirtyState,
    getPersistenceStatus,
    getMetadata,
    bindLifecycleFlush,
    unbindLifecycleFlush,
    resetPersistenceForTests,
    resetPersistenceRuntimeForTests
};

export const persistenceStorage = {
    getItem: getItemSync,
    setItem: setItemSync,
    removeItem: removeItemSync,
    clear: clearSync,
    key: keySync,
    get length() {
        return keysSync().length;
    }
};

export default PersistenceFacade;
