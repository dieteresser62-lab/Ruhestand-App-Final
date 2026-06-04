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
const DEFAULT_STATE = Object.freeze({
    schemaVersion: 1,
    records: {},
    metadata: {}
});
const DEFAULT_SNAPSHOT_ARCHIVE = Object.freeze({
    schemaVersion: 1,
    snapshots: []
});
const SNAPSHOT_TARGET = 'snapshots';

function getInvoke(options = {}) {
    if (typeof options.invoke === 'function') return options.invoke;
    const invoke = globalThis.window?.__TAURI__?.core?.invoke
        || globalThis.__TAURI__?.core?.invoke;
    if (typeof invoke !== 'function') {
        throw new Error('Tauri invoke API ist nicht verfuegbar.');
    }
    return invoke;
}

function normalizeState(raw) {
    if (!raw) return { ...DEFAULT_STATE, records: Object.create(null), metadata: Object.create(null) };
    const parsed = JSON.parse(String(raw));
    const records = Object.create(null);
    Object.entries(parsed.records || {}).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        records[String(key)] = String(value);
    });
    const metadata = Object.create(null);
    Object.entries(parsed.metadata || {}).forEach(([key, value]) => {
        metadata[String(key)] = value;
    });
    return {
        schemaVersion: Number(parsed.schemaVersion) || 1,
        records,
        metadata
    };
}

function serializeState(state) {
    return JSON.stringify({
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        records: state.records,
        metadata: state.metadata
    }, null, 2);
}

function normalizeSnapshotArchive(raw) {
    if (!raw) return { ...DEFAULT_SNAPSHOT_ARCHIVE, snapshots: [] };
    const parsed = JSON.parse(String(raw));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Tauri-Snapshot-Archiv ist ungueltig.');
    }
    if (Number(parsed.schemaVersion) !== 1) {
        throw new Error(`Tauri-Snapshot-Archiv-Schema ${parsed.schemaVersion} wird nicht unterstuetzt.`);
    }
    if (!Array.isArray(parsed.snapshots)) {
        throw new Error('Tauri-Snapshot-Archiv enthaelt keine gueltige Snapshot-Liste.');
    }
    return {
        schemaVersion: 1,
        savedAt: parsed.savedAt ? String(parsed.savedAt) : '',
        snapshots: parsed.snapshots.filter(snapshot => snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot))
    };
}

function serializeSnapshotArchive(archive) {
    return JSON.stringify({
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        snapshots: archive.snapshots || []
    }, null, 2);
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

export function createTauriJsonFileAdapter(options = {}) {
    let invoke = null;
    let state = { ...DEFAULT_STATE, records: Object.create(null), metadata: Object.create(null) };
    let snapshotArchive = { ...DEFAULT_SNAPSHOT_ARCHIVE, snapshots: [] };
    let opened = false;
    let snapshotsOpened = false;

    async function persist() {
        await invoke('save_app_state', { content: serializeState(state) });
    }

    async function ensureSnapshotsOpen() {
        if (snapshotsOpened) return;
        if (!invoke) invoke = getInvoke(options);
        const raw = await invoke('load_app_state', { target: SNAPSHOT_TARGET });
        snapshotArchive = normalizeSnapshotArchive(raw);
        snapshotsOpened = true;
    }

    async function persistSnapshots() {
        await invoke('save_app_state', {
            target: SNAPSHOT_TARGET,
            content: serializeSnapshotArchive(snapshotArchive)
        });
    }

    return {
        name: 'Tauri JSON File',
        async open() {
            invoke = getInvoke(options);
            const raw = await invoke('load_app_state');
            try {
                state = normalizeState(raw);
            } catch (err) {
                let quarantinePath = '';
                try {
                    quarantinePath = await invoke('quarantine_app_state');
                } catch (quarantineErr) {
                    const wrapped = new Error(`Tauri-Daten konnten nicht gelesen und nicht quarantiniert werden: ${quarantineErr?.message || quarantineErr}`);
                    wrapped.code = 'tauri-state-corrupt';
                    wrapped.cause = err;
                    throw wrapped;
                }
                const wrapped = new Error('Tauri-Daten konnten nicht gelesen werden. Die beschaedigte Datei wurde gesichert.');
                wrapped.code = 'tauri-state-corrupt';
                wrapped.quarantinePath = quarantinePath;
                wrapped.cause = err;
                throw wrapped;
            }
            opened = true;
        },
        async loadAll() {
            return state.records;
        },
        async saveBatch(batch) {
            if (!opened) await this.open();
            batch.deletes.forEach(key => {
                delete state.records[String(key)];
            });
            batch.upserts.forEach(([key, value]) => {
                if (value === null || value === undefined) return;
                state.records[String(key)] = String(value);
            });
            await persist();
        },
        async readMetadata(key) {
            return state.metadata[String(key)] ?? null;
        },
        async writeMetadata(key, value) {
            state.metadata[String(key)] = value;
            await persist();
        },
        async listSnapshots() {
            await this.migrateLegacySnapshotsIfNeeded();
            await ensureSnapshotsOpen();
            return snapshotArchive.snapshots.map(toSnapshotIndexEntry);
        },
        async readSnapshot(id) {
            await ensureSnapshotsOpen();
            const snapshotId = String(id || '');
            const snapshot = snapshotArchive.snapshots.find(entry => String(entry?.id || '') === snapshotId);
            if (!snapshot) {
                throw new Error(`Snapshot ${snapshotId} wurde nicht gefunden.`);
            }
            return snapshot;
        },
        async writeSnapshot(snapshot) {
            await ensureSnapshotsOpen();
            const snapshotId = String(snapshot?.id || '');
            if (!snapshotId) {
                throw new Error('Snapshot-ID fehlt.');
            }
            const snapshots = snapshotArchive.snapshots.filter(entry => String(entry?.id || '') !== snapshotId);
            snapshots.push(snapshot);
            snapshotArchive = { ...snapshotArchive, snapshots };
            await persistSnapshots();
            return true;
        },
        async deleteSnapshot(id) {
            await ensureSnapshotsOpen();
            const snapshotId = String(id || '');
            const snapshots = snapshotArchive.snapshots.filter(entry => String(entry?.id || '') !== snapshotId);
            if (snapshots.length === snapshotArchive.snapshots.length) return false;
            snapshotArchive = { ...snapshotArchive, snapshots };
            await persistSnapshots();
            return true;
        },
        async migrateLegacySnapshotsIfNeeded() {
            if (!opened) await this.open();
            await ensureSnapshotsOpen();
            const report = createLegacyMigrationReport();
            const legacyKeys = Object.keys(state.records || {}).filter(isLegacySnapshotKey);
            let liveChanged = false;
            let snapshotsChanged = false;

            legacyKeys.forEach(legacyKey => {
                try {
                    const legacySnapshot = parseLegacySnapshot(state.records[legacyKey]);
                    if (!legacySnapshot) {
                        report.skippedCount += 1;
                        return;
                    }
                    const canonical = buildCanonicalSnapshotFromLegacy(legacyKey, legacySnapshot);
                    const exists = snapshotArchive.snapshots.some(entry => String(entry?.id || '') === canonical.id);
                    if (exists) {
                        report.skippedCount += 1;
                    } else {
                        snapshotArchive.snapshots.push(canonical);
                        delete state.records[legacyKey];
                        liveChanged = true;
                        snapshotsChanged = true;
                        report.migratedCount += 1;
                    }
                    if (!canonical.activeProfileId) report.notStandardRestorableCount += 1;
                } catch (err) {
                    report.errors.push({ key: legacyKey, message: err?.message || String(err) });
                }
            });

            if (snapshotsChanged) await persistSnapshots();
            if (liveChanged) await persist();
            return report;
        },
        async quarantine() {
            if (!invoke) invoke = getInvoke(options);
            return invoke('quarantine_app_state');
        }
    };
}

export default createTauriJsonFileAdapter;
