// @ts-check

import { CONFIG } from '../balance/balance-config.js';

const SNAPSHOT_SCHEMA_VERSION = 1;
const SNAPSHOT_TYPE = 'persistence-records-v1';
const SNAPSHOT_KIND_MANUAL = 'manual';
const PROFILE_STORAGE_KEYS = Object.freeze({
    registry: 'rs_profiles_v1',
    current: 'rs_current_profile',
    active: 'rs_active_profile'
});
const LEGACY_MIGRATION_MARKER_KEYS = Object.freeze({
    target: 'ruhestandsapp_migrated_to_target',
    completedAt: 'ruhestandsapp_migration_completed_at',
    checksum: 'ruhestandsapp_migration_checksum'
});
const SNAPSHOT_CAPTURE_EXACT_KEYS = new Set([
    CONFIG.STORAGE.LS_KEY,
    CONFIG.STORAGE.MIGRATION_FLAG,
    PROFILE_STORAGE_KEYS.registry,
    PROFILE_STORAGE_KEYS.current,
    PROFILE_STORAGE_KEYS.active,
    'etfProxyUrl',
    'etfProxyUrls',
    'household_withdrawal_mode',
    ...Object.values(LEGACY_MIGRATION_MARKER_KEYS),
    'depot_tranchen',
    'profile_health_bucket',
    'profile_tagesgeld',
    'profile_rente_aktiv',
    'profile_rente_monatlich',
    'profile_sonstige_einkuenfte',
    'profile_aktuelles_alter',
    'profile_gold_aktiv',
    'profile_gold_ziel_pct',
    'profile_gold_floor_pct',
    'profile_gold_steuerfrei',
    'profile_gold_rebal_band',
    'showCareDetails',
    'logDetailLevel',
    'worstLogDetailLevel',
    'backtestLogDetailLevel'
]);
const SNAPSHOT_DOMAIN_PREFIXES = ['sim_', 'sim.', 'balance_expenses_'];
const TECHNICAL_EXACT_KEYS = new Set(['enableWorkerTelemetry', 'featureFlags']);
const TECHNICAL_PREFIXES = ['debug_', 'layout_', 'telemetry_', 'ui_', 'window_'];
const DEFAULT_DB_NAME = 'ruhestand-suite';
const DEFAULT_DB_VERSION = 2;
const KV_STORE = 'kv';
const METADATA_STORE = 'metadata';
const SNAPSHOT_STORE = 'snapshots';
const LEGACY_SNAPSHOT_DB_NAME = 'snapshotDB';
const LEGACY_SNAPSHOT_DB_CLEANUP_METADATA_KEY = 'legacySnapshotDbCleanup';
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

function isLegacySnapshotKey(key) {
    return String(key || '').startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX);
}

function isSnapshotTechnicalKey(key) {
    const normalized = String(key || '');
    if (TECHNICAL_EXACT_KEYS.has(normalized)) return true;
    return TECHNICAL_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function isAllowedSnapshotCaptureKey(key) {
    const normalized = String(key || '');
    if (!normalized || isLegacySnapshotKey(normalized) || isSnapshotTechnicalKey(normalized)) return false;
    if (SNAPSHOT_CAPTURE_EXACT_KEYS.has(normalized)) return true;
    return SNAPSHOT_DOMAIN_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function parseJsonObject(raw, fallback = null) {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(String(raw));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function parseLegacySnapshot(raw) {
    const parsed = parseJsonObject(raw, null);
    if (parsed?.snapshotType !== 'full-localstorage' || !parsed.localStorage || typeof parsed.localStorage !== 'object') {
        return null;
    }
    return parsed;
}

function getProfileNameFromLegacyRecords(records, activeProfileId) {
    const registry = parseJsonObject(records[PROFILE_STORAGE_KEYS.registry], null);
    return String(registry?.profiles?.[activeProfileId]?.meta?.name || '');
}

function resolveLegacyActiveProfileId(records) {
    const explicit = String(records[PROFILE_STORAGE_KEYS.current] || records[PROFILE_STORAGE_KEYS.active] || '');
    if (explicit) return explicit;
    if (!records[PROFILE_STORAGE_KEYS.registry]) return 'default';
    return '';
}

function asIsoDate(value) {
    const date = value ? new Date(value) : new Date();
    if (!Number.isFinite(date.getTime())) return new Date().toISOString();
    return date.toISOString();
}

function buildCanonicalSnapshotFromLegacy(key, legacySnapshot) {
    const sourceRecords = legacySnapshot.localStorage || {};
    const records = Object.create(null);
    Object.entries(sourceRecords).forEach(([recordKey, value]) => {
        const normalizedKey = String(recordKey || '');
        if (!isAllowedSnapshotCaptureKey(normalizedKey)) return;
        if (value === null || value === undefined) return;
        records[normalizedKey] = String(value);
    });
    const activeProfileId = resolveLegacyActiveProfileId(sourceRecords);
    const label = legacySnapshot.label || String(key || '').replace(CONFIG.STORAGE.SNAPSHOT_PREFIX, '');
    return {
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        id: String(key || '').replace(CONFIG.STORAGE.SNAPSHOT_PREFIX, 'snapshot_legacy_') || undefined,
        snapshotType: SNAPSHOT_TYPE,
        label,
        kind: SNAPSHOT_KIND_MANUAL,
        createdAt: asIsoDate(legacySnapshot.timestamp || legacySnapshot.createdAt),
        activeProfileId,
        activeProfileName: activeProfileId ? getProfileNameFromLegacyRecords(sourceRecords, activeProfileId) : '',
        recordCount: Object.keys(records).length,
        records,
        restoreScope: {
            profileRegistryMode: 'preserve-by-default',
            profileLiveDataMode: 'restore-only-if-active-profile-still-exists'
        }
    };
}

function createLegacyMigrationReport() {
    return {
        migratedCount: 0,
        skippedCount: 0,
        notStandardRestorableCount: 0,
        errors: []
    };
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
            await this.migrateLegacySnapshotsIfNeeded();
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
            const database = await ensureOpen();
            const report = createLegacyMigrationReport();
            const kvStore = getStore(database, KV_STORE);
            const snapshotStore = getStore(database, SNAPSHOT_STORE);
            const legacyRows = [];
            const cursorRequest = kvStore.openCursor();

            await new Promise((resolve, reject) => {
                cursorRequest.onsuccess = () => {
                    const cursor = cursorRequest.result;
                    if (!cursor) {
                        resolve(true);
                        return;
                    }
                    const row = cursor.value;
                    if (isLegacySnapshotKey(row?.key)) legacyRows.push(row);
                    cursor.continue();
                };
                cursorRequest.onerror = () => reject(cursorRequest.error || new Error('IndexedDB legacy snapshot cursor failed'));
            });

            for (const row of legacyRows) {
                const legacyKey = String(row.key || '');
                try {
                    const legacySnapshot = parseLegacySnapshot(row.value);
                    if (!legacySnapshot) {
                        report.skippedCount += 1;
                        continue;
                    }
                    const canonical = buildCanonicalSnapshotFromLegacy(legacyKey, legacySnapshot);
                    const existing = await requestToPromise(snapshotStore.get(canonical.id));
                    if (existing) {
                        report.skippedCount += 1;
                    } else {
                        const transaction = database.transaction([SNAPSHOT_STORE, KV_STORE], 'readwrite');
                        transaction.objectStore(SNAPSHOT_STORE).put({
                            key: canonical.id,
                            snapshot: canonical,
                            updatedAt: new Date().toISOString()
                        });
                        transaction.objectStore(KV_STORE).delete(legacyKey);
                        await transactionDone(transaction);
                        report.migratedCount += 1;
                    }
                    if (!canonical.activeProfileId) report.notStandardRestorableCount += 1;
                } catch (err) {
                    report.errors.push({ key: legacyKey, message: err?.message || String(err) });
                }
            }

            const cleanupMarker = await this.readMetadata(LEGACY_SNAPSHOT_DB_CLEANUP_METADATA_KEY);
            if (!cleanupMarker?.completedAt && indexedDb?.deleteDatabase) {
                try {
                    const deleteRequest = indexedDb.deleteDatabase(LEGACY_SNAPSHOT_DB_NAME);
                    await requestToPromise(deleteRequest);
                    await this.writeMetadata(LEGACY_SNAPSHOT_DB_CLEANUP_METADATA_KEY, {
                        completedAt: new Date().toISOString(),
                        dbName: LEGACY_SNAPSHOT_DB_NAME
                    });
                } catch (err) {
                    report.errors.push({ key: LEGACY_SNAPSHOT_DB_NAME, message: err?.message || String(err) });
                }
            }

            return report;
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
