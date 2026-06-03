// @ts-check

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
            return { migratedCount: 0, skippedCount: 0, notStandardRestorableCount: 0, errors: [] };
        },
        async quarantine() {
            if (!invoke) invoke = getInvoke(options);
            return invoke('quarantine_app_state');
        }
    };
}

export default createTauriJsonFileAdapter;
