// @ts-check

import { detectRuntime } from './runtime-env.js';
import { PersistenceFacade } from './persistence-facade.js';
import { SnapshotArchive, SNAPSHOT_KINDS } from './snapshot-archive.js';
import { isAllowedPersistenceImportKey } from './persistence-key-policy.js';
import {
    PROFILE_HEALTH_BUCKET_KEY,
    PROFILE_LOAD_STATUS,
    PROFILE_STORAGE_KEYS,
    PROFILE_TRANCHES_KEY,
    PROFILE_VALUE_KEYS,
    loadProfileHealthBucketFromData,
    loadStoredBalanceStateFromData,
    parseStoredBool,
    parseStoredNumber
} from '../profile/profile-state.js';
import { isProfileScopedKey } from '../profile/profile-key-policy.js';
import { loadProfileRegistry } from '../profile/profile-registry.js';
import {
    EXPENSES_STORAGE_KEY,
    EXPENSES_STORE_STATUS,
    loadExpensesStoreResult
} from '../balance/balance-expenses-storage.js';
import { CONFIG } from '../balance/balance-config.js';
import { normalizeTrancheCollection } from '../../types/tranche-contract.js';
import { assertCumulativeInflationFactor } from '../../types/cumulative-inflation-contract.js';

export const FULL_BACKUP_TYPE = 'ruhestand-suite-full-persistence-backup';
export const FULL_BACKUP_APP_ID = 'ruhestand-suite';
export const FULL_BACKUP_LEGACY_SCHEMA_VERSION = 1;
export const FULL_BACKUP_SCHEMA_VERSION = 2;
export const FULL_BACKUP_RECOVERY_KIND = SNAPSHOT_KINDS.fullBackupImportRecovery;
const FULL_BACKUP_RECORD_SCOPE = 'authorized-application-records';
const BLOCKED_BACKUP_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const PROFILE_SELECTOR_KEYS = [
    PROFILE_STORAGE_KEYS.current,
    PROFILE_STORAGE_KEYS.active
];
const PROFILE_NUMBER_KEYS = new Set([
    PROFILE_VALUE_KEYS.tagesgeld,
    PROFILE_VALUE_KEYS.renteMonatlich,
    PROFILE_VALUE_KEYS.sonstigeEinkuenfte,
    PROFILE_VALUE_KEYS.alter,
    PROFILE_VALUE_KEYS.goldZiel,
    PROFILE_VALUE_KEYS.goldFloor,
    PROFILE_VALUE_KEYS.goldRebalBand
]);
const PROFILE_BOOLEAN_KEYS = new Set([
    PROFILE_VALUE_KEYS.renteAktiv,
    PROFILE_VALUE_KEYS.goldAktiv,
    PROFILE_VALUE_KEYS.goldSteuerfrei
]);

function timestampForFilename(date = new Date()) {
    return date.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
}

function collectStorageRecords(storage) {
    const records = Object.create(null);
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key) continue;
        const value = storage.getItem(key);
        if (value === null || value === undefined) continue;
        if (typeof value !== 'string') {
            throw new Error(`Persistenzwert ${key} liegt nicht im kanonischen Stringformat vor.`);
        }
        records[key] = value;
    }
    return records;
}

function isPlainRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, key) {
    return Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);
}

function createRecordsStorage(records) {
    const keys = Object.keys(records || {});
    return {
        getItem(key) {
            return hasOwn(records, key) ? records[key] : null;
        },
        key(index) {
            return keys[index] || null;
        },
        get length() {
            return keys.length;
        }
    };
}

function invalidDomain(code, message, error = null) {
    return {
        ok: false,
        code,
        message,
        ...(error ? { error } : {})
    };
}

function validateIsoTimestamp(value, path) {
    if (typeof value !== 'string' || !value) {
        throw new Error(`${path} fehlt oder ist kein String.`);
    }
    const timestamp = new Date(value);
    if (!Number.isFinite(timestamp.getTime())) {
        throw new Error(`${path} ist kein gueltiger Zeitstempel.`);
    }
}

function validateBalanceInflationState(balanceState, path) {
    const lastState = balanceState?.lastState;
    if (!isPlainRecord(lastState) || !hasOwn(lastState, 'cumulativeInflationFactor')) return;
    assertCumulativeInflationFactor(lastState.cumulativeInflationFactor, {
        path: `${path}.lastState.cumulativeInflationFactor`
    });
}

function validateStoredTranches(data, path) {
    if (!hasOwn(data, PROFILE_TRANCHES_KEY)) return;
    const raw = data[PROFILE_TRANCHES_KEY];
    if (typeof raw !== 'string') {
        throw new Error(`${path}.${PROFILE_TRANCHES_KEY} muss als JSON-String vorliegen.`);
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`${path}.${PROFILE_TRANCHES_KEY} enthaelt ungueltiges JSON.`);
    }
    normalizeTrancheCollection(parsed, { mode: 'persisted' });
}

function validateProfileScalarValues(data, path) {
    Object.entries(data).forEach(([key, value]) => {
        if (PROFILE_NUMBER_KEYS.has(key) && parseStoredNumber(value, null) === null) {
            throw new Error(`${path}.${key} enthaelt keine endliche Zahl.`);
        }
        if (PROFILE_BOOLEAN_KEYS.has(key) && parseStoredBool(value, null) === null) {
            throw new Error(`${path}.${key} enthaelt keinen gueltigen Booleanwert.`);
        }
    });
}

function validateProfileData(data, path) {
    if (!isPlainRecord(data)) {
        throw new Error(`${path} ist kein gueltiges Profildatenobjekt.`);
    }
    Object.entries(data).forEach(([key, value]) => {
        if (!isProfileScopedKey(key)) {
            throw new Error(`${path}.${key} ist kein erlaubter profilbezogener Key.`);
        }
        if (typeof value !== 'string') {
            throw new Error(`${path}.${key} muss als String vorliegen.`);
        }
    });

    const healthResult = loadProfileHealthBucketFromData(data);
    if (healthResult.status === PROFILE_LOAD_STATUS.CORRUPT
        || healthResult.status === PROFILE_LOAD_STATUS.UNAVAILABLE) {
        throw new Error(healthResult.error?.message || `${path}.${PROFILE_HEALTH_BUCKET_KEY} ist ungueltig.`);
    }

    const balanceResult = loadStoredBalanceStateFromData(data);
    if (balanceResult.status === PROFILE_LOAD_STATUS.CORRUPT
        || balanceResult.status === PROFILE_LOAD_STATUS.UNAVAILABLE) {
        throw new Error(balanceResult.error?.message || `${path}.${CONFIG.STORAGE.LS_KEY} ist ungueltig.`);
    }
    if (balanceResult.value) {
        validateBalanceInflationState(balanceResult.value, `${path}.${CONFIG.STORAGE.LS_KEY}`);
    }

    validateStoredTranches(data, path);
    validateProfileScalarValues(data, path);
}

function validateRegistryAndProfiles(records, options = {}) {
    const storage = createRecordsStorage(records);
    const registryResult = loadProfileRegistry(storage);
    if (registryResult.status === PROFILE_LOAD_STATUS.CORRUPT
        || registryResult.status === PROFILE_LOAD_STATUS.UNAVAILABLE) {
        throw new Error(registryResult.error?.message || 'Die Profilregistry ist ungueltig.');
    }

    const registryPresent = hasOwn(records, PROFILE_STORAGE_KEYS.registry);
    const registry = registryResult.value || { version: 1, profiles: {} };
    if (options.requireProfileContext && !registryPresent) {
        throw new Error('Die Profilregistry fehlt.');
    }

    Object.entries(registry.profiles || {}).forEach(([profileId, profile]) => {
        const meta = profile.meta || {};
        if (meta.createdAt !== undefined) validateIsoTimestamp(meta.createdAt, `registry.profiles.${profileId}.meta.createdAt`);
        if (meta.updatedAt !== undefined) validateIsoTimestamp(meta.updatedAt, `registry.profiles.${profileId}.meta.updatedAt`);
        validateProfileData(profile.data, `registry.profiles.${profileId}.data`);
    });

    PROFILE_SELECTOR_KEYS.forEach(key => {
        if (!hasOwn(records, key)) {
            if (options.requireProfileContext) {
                throw new Error(`${key} fehlt.`);
            }
            return;
        }
        const profileId = records[key];
        if (!profileId || !hasOwn(registry.profiles, profileId)) {
            throw new Error(`${key} verweist auf das nicht vorhandene Profil ${profileId || '<leer>'}.`);
        }
    });
    return registry;
}

function validateLiveDomains(records) {
    const liveProfileData = Object.create(null);
    Object.entries(records).forEach(([key, value]) => {
        if (isProfileScopedKey(key)) liveProfileData[key] = value;
    });
    validateProfileData(liveProfileData, 'records');

    if (hasOwn(records, EXPENSES_STORAGE_KEY)) {
        const expensesResult = loadExpensesStoreResult(createRecordsStorage(records));
        if (expensesResult.status === EXPENSES_STORE_STATUS.CORRUPT) {
            throw new Error(expensesResult.error?.message || 'Der Ausgabenstore ist ungueltig.');
        }
    }
}

export function validatePersistenceDomainRecords(records, options = {}) {
    if (!isPlainRecord(records)) {
        return invalidDomain('records_invalid', 'Persistenz-Records muessen ein Objekt sein.');
    }
    try {
        Object.entries(records).forEach(([key, value]) => {
            if (BLOCKED_BACKUP_KEYS.has(key) || !isAllowedPersistenceImportKey(key)) {
                throw new Error(`Persistenz-Key ${key} ist nicht erlaubt.`);
            }
            if (typeof value !== 'string') {
                throw new Error(`Persistenzwert ${key} muss als String vorliegen.`);
            }
        });
        const registry = validateRegistryAndProfiles(records, options);
        validateLiveDomains(records);
        return { ok: true, records, registry };
    } catch (error) {
        return invalidDomain(
            error?.code || 'domain_validation_failed',
            error?.message || 'Persistenzdaten sind fachlich ungueltig.',
            error
        );
    }
}

function recordsMatch(left, right) {
    const leftKeys = Object.keys(left || {}).sort();
    const rightKeys = Object.keys(right || {}).sort();
    return leftKeys.length === rightKeys.length
        && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
}

function collectAllowedFacadeRecords(persistence = PersistenceFacade) {
    const exported = persistence.exportAllSync();
    const records = Object.create(null);
    Object.entries(exported?.records || {}).forEach(([key, value]) => {
        if (!isAllowedPersistenceImportKey(key)) return;
        if (typeof value !== 'string') {
            throw new Error(`Persistenzwert ${key} liegt nicht im kanonischen Stringformat vor.`);
        }
        records[key] = value;
    });
    return records;
}

export function buildFullPersistenceBackup(options = {}) {
    const storage = options.storage || PersistenceFacade;
    const sourceRecords = storage.exportAllSync
        ? storage.exportAllSync().records
        : collectStorageRecords(storage);
    const records = Object.create(null);
    const excludedKeys = [];
    Object.entries(sourceRecords || {}).forEach(([key, value]) => {
        if (!isAllowedPersistenceImportKey(key)) {
            excludedKeys.push(key);
            return;
        }
        if (typeof value !== 'string') {
            throw new Error(`Persistenzwert ${key} liegt nicht im kanonischen Stringformat vor.`);
        }
        records[key] = value;
    });
    const exportedAt = new Date().toISOString();

    return {
        backupType: FULL_BACKUP_TYPE,
        schemaVersion: FULL_BACKUP_SCHEMA_VERSION,
        app: FULL_BACKUP_APP_ID,
        exportedAt,
        runtime: detectRuntime(options.window || globalThis.window),
        recordScope: FULL_BACKUP_RECORD_SCOPE,
        recordCount: Object.keys(records).length,
        excludedRecordCount: excludedKeys.length,
        excludedKeys: excludedKeys.sort(),
        records,
        localStorage: records
    };
}

export function createFullBackupFilename(date = new Date()) {
    return `ruhestand-suite-full-backup-${timestampForFilename(date)}.json`;
}

export function createRecoveryBackupFilename(date = new Date()) {
    return `ruhestand-suite-recovery-before-import-${timestampForFilename(date)}.json`;
}

export function buildRecoveryPersistenceBackup(options = {}) {
    const backup = buildFullPersistenceBackup(options);
    return {
        ...backup,
        backupPurpose: 'recovery-before-import',
        recoveryReason: options.reason || 'before-full-import'
    };
}

export function normalizeFullPersistenceBackup(payload) {
    if (!isPlainRecord(payload)) {
        return { ok: false, message: 'Ungueltige Backup-Datei.' };
    }
    if (payload.backupType !== FULL_BACKUP_TYPE) {
        return { ok: false, message: 'Die Datei ist kein komplettes Ruhestand-Suite-Backup.' };
    }
    if (payload.app !== FULL_BACKUP_APP_ID) {
        return { ok: false, message: 'Das Backup gehoert nicht zur Ruhestand-Suite.' };
    }
    if (payload.schemaVersion !== FULL_BACKUP_SCHEMA_VERSION
        && payload.schemaVersion !== FULL_BACKUP_LEGACY_SCHEMA_VERSION) {
        return { ok: false, message: `Backup-Schema ${String(payload.schemaVersion)} wird nicht unterstuetzt.` };
    }
    try {
        validateIsoTimestamp(payload.exportedAt, 'exportedAt');
    } catch (error) {
        return { ok: false, message: error.message };
    }
    const isLegacy = payload.schemaVersion === FULL_BACKUP_LEGACY_SCHEMA_VERSION;
    const records = isPlainRecord(payload.records)
        ? payload.records
        : (isLegacy && isPlainRecord(payload.localStorage) ? payload.localStorage : null);
    if (!records) return { ok: false, message: 'Backup enthaelt keine gueltigen Datensaetze.' };

    const sourceCount = Object.keys(records).length;
    if (!Number.isInteger(payload.recordCount) || payload.recordCount !== sourceCount) {
        return {
            ok: false,
            message: `Backup recordCount ${String(payload.recordCount)} passt nicht zu ${sourceCount} Datensaetzen.`
        };
    }
    if (payload.records !== undefined && payload.localStorage !== undefined) {
        if (!isPlainRecord(payload.localStorage) || !recordsMatch(payload.localStorage, records)) {
            return { ok: false, message: 'Der localStorage-Alias stimmt nicht mit den kanonischen Backup-Records ueberein.' };
        }
    }

    const normalizedRecords = Object.create(null);
    const excludedKeys = [];
    for (const [key, value] of Object.entries(records)) {
        const safeKey = String(key);
        if (BLOCKED_BACKUP_KEYS.has(safeKey) || !isAllowedPersistenceImportKey(safeKey)) {
            if (!isLegacy) {
                return { ok: false, message: `Backup enthaelt den nicht erlaubten Key ${safeKey}.` };
            }
            excludedKeys.push(safeKey);
            continue;
        }
        if (typeof value !== 'string') {
            return { ok: false, message: `Backupwert ${safeKey} muss als String vorliegen.` };
        }
        normalizedRecords[safeKey] = value;
    }
    const recordCount = Object.keys(normalizedRecords).length;
    const domainValidation = validatePersistenceDomainRecords(normalizedRecords);
    if (!domainValidation.ok) return domainValidation;
    return {
        ok: true,
        backup: {
            ...payload,
            schemaVersion: FULL_BACKUP_SCHEMA_VERSION,
            sourceSchemaVersion: payload.schemaVersion,
            migrated: isLegacy,
            recordScope: FULL_BACKUP_RECORD_SCOPE,
            records: normalizedRecords,
            localStorage: normalizedRecords,
            recordCount,
            excludedRecordCount: isLegacy
                ? excludedKeys.length
                : Number.isInteger(payload.excludedRecordCount) ? payload.excludedRecordCount : 0,
            excludedKeys: isLegacy
                ? excludedKeys.sort()
                : (Array.isArray(payload.excludedKeys) ? payload.excludedKeys.slice() : [])
        }
    };
}

export function downloadJsonFile(data, filename, doc = globalThis.document) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = doc.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    doc.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export async function downloadFullPersistenceBackup(options = {}) {
    await PersistenceFacade.flush();
    const backup = buildFullPersistenceBackup(options);
    if (backup.recordCount === 0) {
        throw new Error('Keine gespeicherten Daten fuer ein Backup gefunden.');
    }
    const filename = options.filename || createFullBackupFilename();
    downloadJsonFile(backup, filename, options.document || globalThis.document);
    return { filename, backup };
}

export async function downloadRecoveryPersistenceBackup(options = {}) {
    await PersistenceFacade.flush();
    const backup = buildRecoveryPersistenceBackup(options);
    if (backup.recordCount === 0) {
        return { filename: null, backup, skipped: true };
    }
    const filename = options.filename || createRecoveryBackupFilename();
    downloadJsonFile(backup, filename, options.document || globalThis.document);
    return { filename, backup, skipped: false };
}

export async function importFullPersistenceBackup(payload, options = {}) {
    const normalized = normalizeFullPersistenceBackup(payload);
    if (!normalized.ok) return normalized;
    const backup = normalized.backup;
    if (backup.recordCount === 0) {
        return { ok: false, message: 'Backup enthaelt keine gespeicherten Daten.' };
    }
    const persistence = options.persistence || PersistenceFacade;
    const snapshotStorage = options.snapshotStorage || persistence;
    let recoverySnapshotId = '';
    try {
        await persistence.flush();
        const previousRecords = collectAllowedFacadeRecords(persistence);
        const activeProfileId = previousRecords[PROFILE_STORAGE_KEYS.active]
            || previousRecords[PROFILE_STORAGE_KEYS.current]
            || '';
        const recovery = await SnapshotArchive.createSnapshot({
            label: `Vollbackup-Import Recovery ${new Date().toISOString()}`,
            kind: FULL_BACKUP_RECOVERY_KIND,
            records: previousRecords,
            activeProfileId,
            restoreScope: {
                profileRegistryMode: 'replace-all-rollback',
                profileLiveDataMode: 'replace-all-rollback'
            }
        }, { storage: snapshotStorage });
        const confirmedRecovery = await SnapshotArchive.readSnapshot(recovery.id, {
            storage: snapshotStorage
        });
        recoverySnapshotId = confirmedRecovery.id;
        if (!recordsMatch(previousRecords, confirmedRecovery.records)) {
            return {
                ok: false,
                code: 'recovery_snapshot_mismatch',
                message: `Import abgebrochen: Der Recovery-Snapshot ${recoverySnapshotId} stimmt nicht mit dem Livebestand ueberein. Wiederherstellung: Balance > Snapshots.`,
                recoverySnapshotId
            };
        }

        const result = await persistence.replaceRecordsTransactional(backup.records, {
            allowKey: isAllowedPersistenceImportKey,
            postValidate(records) {
                const domainValidation = validatePersistenceDomainRecords(records);
                if (!domainValidation.ok) return domainValidation;
                if (typeof options.validateAfterLoad === 'function') {
                    return options.validateAfterLoad(records, backup);
                }
                return domainValidation;
            }
        });
        return {
            ok: true,
            message: `Komplettes Backup importiert (${backup.recordCount} Eintraege${backup.migrated ? ', Schema 1 migriert' : ''}).`,
            backup,
            recoverySnapshotId,
            restore: result
        };
    } catch (error) {
        const recoveryHint = recoverySnapshotId
            ? ` Recovery-Snapshot ${recoverySnapshotId}: Wiederherstellung unter Balance > Snapshots.`
            : '';
        return {
            ok: false,
            code: error?.code || 'full_backup_import_failed',
            message: `${error?.message || 'Komplettes Backup konnte nicht importiert werden.'}${recoveryHint}`,
            recoverySnapshotId: recoverySnapshotId || null,
            rollbackError: error?.rollbackError || null
        };
    }
}

export function getPersistenceBackupInfo(options = {}) {
    const runtime = detectRuntime(options.window || globalThis.window);
    const status = PersistenceFacade.getPersistenceStatus();
    const backend = PersistenceFacade.isInitialized() ? status.backend : 'localStorage';
    return {
        runtime,
        backend,
        recordCount: status.recordCount,
        migrationWarning: status.migrationWarning
    };
}

export function renderPersistenceBackupInfo(target, options = {}) {
    if (!target) return false;
    const info = getPersistenceBackupInfo(options);
    const runtimeLabel = info.runtime === 'tauri' ? 'Tauri' : info.runtime === 'browser' ? 'Browser' : 'Unbekannt';
    const warning = info.migrationWarning ? `; Hinweis: ${info.migrationWarning.message}` : '';
    target.textContent = `Speicher: ${runtimeLabel} / ${info.backend}; gespeicherte Eintraege: ${info.recordCount}${warning}`;
    return true;
}

export function bindFullBackupButton(options = {}) {
    const doc = options.document || globalThis.document;
    const button = options.button || doc.getElementById('fullBackupBtn');
    const status = options.status || doc.getElementById('fullBackupStatus');
    if (!button) return false;

    button.addEventListener('click', async () => {
        button.disabled = true;
        if (status) {
            status.dataset.kind = '';
            status.textContent = 'Backup wird erstellt...';
        }
        try {
            const { backup } = await downloadFullPersistenceBackup({ document: doc, window: options.window });
            if (status) {
                status.dataset.kind = 'ok';
                const excludedText = backup.excludedRecordCount
                    ? ` ${backup.excludedRecordCount} UI-/Layout-Einstellungen sind nicht enthalten.`
                    : '';
                status.textContent = `Komplettes fachliches Backup erstellt (${backup.recordCount} Eintraege).${excludedText}`;
            }
        } catch (err) {
            if (status) {
                status.dataset.kind = 'error';
                status.textContent = err?.message || 'Backup konnte nicht erstellt werden.';
            }
        } finally {
            button.disabled = false;
        }
    });

    return true;
}

export function bindFullBackupImport(options = {}) {
    const doc = options.document || globalThis.document;
    const button = options.button || doc.getElementById('fullBackupImportBtn');
    const fileInput = options.fileInput || doc.getElementById('fullBackupImportFile');
    const status = options.status || doc.getElementById('fullBackupStatus');
    if (!button || !fileInput) return false;

    button.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const payload = JSON.parse(String(reader.result || ''));
                const normalized = normalizeFullPersistenceBackup(payload);
                if (!normalized.ok) {
                    if (status) {
                        status.dataset.kind = 'error';
                        status.textContent = normalized.message;
                    }
                    return;
                }
                const backup = normalized.backup;
                const confirmImport = options.confirmImport || globalThis.confirm;
                const migrationText = backup.migrated
                    ? `\n\nSchema 1 wird migriert; ${backup.excludedRecordCount} nicht mehr unterstuetzte Eintraege werden ausgelassen.`
                    : '';
                const confirmed = typeof confirmImport === 'function'
                    ? confirmImport(`Komplettes Backup mit ${backup.recordCount} Eintraegen importieren?\n\nAlle aktuell gespeicherten fachlichen Daten werden ersetzt.${migrationText}`)
                    : true;
                if (!confirmed) return;

                const createRecoveryBackup = options.createRecoveryBackup || downloadRecoveryPersistenceBackup;
                if (status) {
                    status.dataset.kind = '';
                    status.textContent = 'Recovery-Backup wird erstellt...';
                }
                let recoveryResult;
                try {
                    recoveryResult = await createRecoveryBackup({ document: doc, window: options.window });
                } catch (err) {
                    if (status) {
                        status.dataset.kind = 'error';
                        status.textContent = `Import abgebrochen: Recovery-Backup konnte nicht erstellt werden (${err?.message || 'unbekannter Fehler'}).`;
                    }
                    return;
                }

                const result = await importFullPersistenceBackup(backup);
                if (status) {
                    status.dataset.kind = result.ok ? 'ok' : 'error';
                    const errorCodeText = !result.ok && result.code ? ` [${result.code}]` : '';
                    const recoveryText = recoveryResult?.skipped
                        ? ' Kein Recovery-Backup noetig, da vorher keine Daten gespeichert waren.'
                        : ' Recovery-Backup wurde vorher erstellt.';
                    status.textContent = `${result.message || 'Import abgeschlossen.'}${errorCodeText}${result.ok ? recoveryText : ''}`;
                }
                if (result.ok) {
                    const reload = options.reload || (() => globalThis.location?.reload?.());
                    reload();
                }
            } catch (err) {
                if (status) {
                    status.dataset.kind = 'error';
                    status.textContent = err?.message || 'Import fehlgeschlagen.';
                }
            }
        };
        reader.readAsText(file);
    });

    return true;
}
