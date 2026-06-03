// @ts-check

import { PROFILE_STORAGE_KEYS } from '../profile/profile-state.js';
import { PersistenceFacade } from './persistence-facade.js';
import { isAllowedSnapshotCaptureKey } from './persistence-key-policy.js';

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const SNAPSHOT_TYPE = 'persistence-records-v1';
export const SNAPSHOT_KINDS = Object.freeze({
    annualClosePreMutation: 'annual-close-pre-mutation',
    manual: 'manual'
});

const DEFAULT_RESTORE_SCOPE = Object.freeze({
    profileRegistryMode: 'preserve-by-default',
    profileLiveDataMode: 'restore-only-if-active-profile-still-exists'
});

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function asIsoDate(value, fieldName) {
    const date = value ? new Date(value) : new Date();
    if (!Number.isFinite(date.getTime())) {
        throw new Error(`Snapshot ${fieldName} ist ungueltig.`);
    }
    return date.toISOString();
}

function sanitizeIdPart(value) {
    return String(value || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function createSnapshotId(createdAt, label = '') {
    const timestamp = String(createdAt).replace(/[:.]/g, '-');
    const suffix = sanitizeIdPart(label);
    return suffix ? `snapshot_${timestamp}--${suffix}` : `snapshot_${timestamp}`;
}

function normalizeRecords(records) {
    if (!records || typeof records !== 'object' || Array.isArray(records)) {
        throw new Error('Snapshot records muessen ein Objekt sein.');
    }
    const normalized = Object.create(null);
    Object.entries(records).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        normalized[String(key)] = String(value);
    });
    return normalized;
}

function normalizeRestoreScope(scope) {
    if (!scope || typeof scope !== 'object' || Array.isArray(scope)) {
        return { ...DEFAULT_RESTORE_SCOPE };
    }
    return {
        ...DEFAULT_RESTORE_SCOPE,
        ...scope
    };
}

function getStorage(storage) {
    return storage || PersistenceFacade;
}

function requireStorageMethod(storage, methodName) {
    const activeStorage = getStorage(storage);
    const method = activeStorage?.[methodName];
    if (typeof method !== 'function') {
        throw new Error(`Snapshot-Archiv-Speicher unterstuetzt ${methodName}() nicht.`);
    }
    return method.bind(activeStorage);
}

export function captureCurrentRecords({ keys, getItem } = {}) {
    if (typeof getItem !== 'function') {
        throw new Error('Snapshot-Capture benoetigt getItem(key).');
    }
    const sourceKeys = typeof keys === 'function' ? keys() : keys;
    if (!Array.isArray(sourceKeys)) {
        throw new Error('Snapshot-Capture benoetigt eine Key-Liste.');
    }
    const records = Object.create(null);
    sourceKeys.forEach(key => {
        const normalizedKey = String(key || '');
        if (!isAllowedSnapshotCaptureKey(normalizedKey)) return;
        const value = getItem(normalizedKey);
        if (value === null || value === undefined) return;
        records[normalizedKey] = String(value);
    });
    return records;
}

export function buildSnapshot({
    id,
    label = '',
    kind = SNAPSHOT_KINDS.manual,
    records,
    activeProfileId,
    activeProfileName,
    createdAt,
    restoreScope
} = {}) {
    const normalizedCreatedAt = asIsoDate(createdAt, 'createdAt');
    const normalizedRecords = normalizeRecords(records);
    const snapshot = {
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        id: id ? String(id) : createSnapshotId(normalizedCreatedAt, label),
        snapshotType: SNAPSHOT_TYPE,
        kind: String(kind || SNAPSHOT_KINDS.manual),
        createdAt: normalizedCreatedAt,
        label: String(label || ''),
        activeProfileId: activeProfileId ? String(activeProfileId) : '',
        activeProfileName: activeProfileName ? String(activeProfileName) : '',
        recordCount: Object.keys(normalizedRecords).length,
        records: normalizedRecords,
        restoreScope: normalizeRestoreScope(restoreScope)
    };
    return validateSnapshot(snapshot);
}

export function validateSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        throw new Error('Snapshot ist kein Objekt.');
    }
    if (Number(snapshot.schemaVersion) !== SNAPSHOT_SCHEMA_VERSION) {
        throw new Error(`Snapshot-Schema ${snapshot.schemaVersion} wird nicht unterstuetzt.`);
    }
    if (snapshot.snapshotType !== SNAPSHOT_TYPE) {
        throw new Error(`Snapshot-Typ ${snapshot.snapshotType || ''} wird nicht unterstuetzt.`);
    }
    if (!snapshot.id) {
        throw new Error('Snapshot-ID fehlt.');
    }
    const createdAt = asIsoDate(snapshot.createdAt, 'createdAt');
    const records = normalizeRecords(snapshot.records);
    const recordCount = Object.keys(records).length;
    if (Number(snapshot.recordCount) !== recordCount) {
        throw new Error(`Snapshot recordCount ${snapshot.recordCount} passt nicht zu ${recordCount} Records.`);
    }
    return {
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        id: String(snapshot.id),
        snapshotType: SNAPSHOT_TYPE,
        kind: String(snapshot.kind || SNAPSHOT_KINDS.manual),
        createdAt,
        label: String(snapshot.label || ''),
        activeProfileId: snapshot.activeProfileId ? String(snapshot.activeProfileId) : '',
        activeProfileName: snapshot.activeProfileName ? String(snapshot.activeProfileName) : '',
        recordCount,
        records,
        restoreScope: normalizeRestoreScope(snapshot.restoreScope)
    };
}

export function toSnapshotIndexEntry(snapshot) {
    const source = snapshot?.records ? validateSnapshot(snapshot) : snapshot;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
        throw new Error('Snapshot-Indexeintrag ist kein Objekt.');
    }
    return {
        id: String(source.id || ''),
        label: String(source.label || ''),
        kind: String(source.kind || SNAPSHOT_KINDS.manual),
        createdAt: asIsoDate(source.createdAt, 'createdAt'),
        activeProfileId: source.activeProfileId ? String(source.activeProfileId) : '',
        activeProfileName: source.activeProfileName ? String(source.activeProfileName) : '',
        recordCount: Number(source.recordCount) || 0,
        standardRestorable: Boolean(source.activeProfileId)
    };
}

export async function writeSnapshot(snapshot, options = {}) {
    const normalized = validateSnapshot(snapshot);
    const write = requireStorageMethod(options.storage, 'writeSnapshot');
    await write(normalized);
    return normalized.id;
}

export async function createSnapshot(snapshotInput, options = {}) {
    const snapshot = buildSnapshot(snapshotInput);
    await writeSnapshot(snapshot, options);
    return snapshot;
}

export async function readSnapshot(id, options = {}) {
    const read = requireStorageMethod(options.storage, 'readSnapshot');
    const snapshot = await read(String(id || ''));
    return validateSnapshot(snapshot);
}

export async function listSnapshots(options = {}) {
    const list = requireStorageMethod(options.storage, 'listSnapshots');
    const snapshots = await list();
    if (!Array.isArray(snapshots)) {
        throw new Error('Snapshot-Liste ist ungueltig.');
    }
    return snapshots
        .map(toSnapshotIndexEntry)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteSnapshot(id, options = {}) {
    const remove = requireStorageMethod(options.storage, 'deleteSnapshot');
    await remove(String(id || ''));
    return true;
}

export function getActiveProfileIdFromRecords(records) {
    if (!records || typeof records !== 'object') return '';
    return String(records[PROFILE_STORAGE_KEYS.current] || records[PROFILE_STORAGE_KEYS.active] || '');
}

export const SnapshotArchive = {
    captureCurrentRecords,
    buildSnapshot,
    createSnapshot,
    listSnapshots,
    readSnapshot,
    writeSnapshot,
    deleteSnapshot,
    validateSnapshot,
    toSnapshotIndexEntry,
    getActiveProfileIdFromRecords
};

export default SnapshotArchive;
