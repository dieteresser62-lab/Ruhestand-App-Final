// @ts-check

import { detectRuntime } from './runtime-env.js';
import { PersistenceFacade } from './persistence-facade.js';

export const FULL_BACKUP_TYPE = 'ruhestand-suite-full-persistence-backup';
const BLOCKED_BACKUP_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function timestampForFilename(date = new Date()) {
    return date.toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
}

function collectStorageRecords(storage) {
    const records = Object.create(null);
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key) continue;
        const value = storage.getItem(key);
        if (value !== null && value !== undefined) records[key] = value;
    }
    return records;
}

export function buildFullPersistenceBackup(options = {}) {
    const storage = options.storage || PersistenceFacade;
    const records = storage.exportAllSync
        ? storage.exportAllSync().records
        : collectStorageRecords(storage);
    const exportedAt = new Date().toISOString();

    return {
        backupType: FULL_BACKUP_TYPE,
        schemaVersion: 1,
        app: 'ruhestand-suite',
        exportedAt,
        runtime: detectRuntime(options.window || globalThis.window),
        recordCount: Object.keys(records).length,
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
    if (!payload || typeof payload !== 'object') {
        return { ok: false, message: 'Ungueltige Backup-Datei.' };
    }
    if (payload.backupType !== FULL_BACKUP_TYPE) {
        return { ok: false, message: 'Die Datei ist kein komplettes Ruhestand-Suite-Backup.' };
    }
    const records = payload.records || payload.localStorage;
    if (!records || typeof records !== 'object' || Array.isArray(records)) {
        return { ok: false, message: 'Backup enthaelt keine gueltigen Datensaetze.' };
    }
    const normalizedRecords = Object.create(null);
    Object.entries(records).forEach(([key, value]) => {
        const safeKey = String(key);
        if (BLOCKED_BACKUP_KEYS.has(safeKey)) return;
        if (value === null || value === undefined) return;
        normalizedRecords[safeKey] = String(value);
    });
    return {
        ok: true,
        backup: {
            ...payload,
            records: normalizedRecords,
            localStorage: normalizedRecords,
            recordCount: Object.keys(normalizedRecords).length
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
    const result = await PersistenceFacade.importAll({ records: backup.records }, { replace: true });
    if (!result.ok) return result;
    return {
        ok: true,
        message: `Komplettes Backup importiert (${backup.recordCount} Eintraege).`,
        backup
    };
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
                status.textContent = `Komplettes Backup erstellt (${backup.recordCount} Eintraege).`;
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
                const confirmed = typeof confirmImport === 'function'
                    ? confirmImport(`Komplettes Backup mit ${backup.recordCount} Eintraegen importieren?\n\nAlle aktuell gespeicherten Daten werden ersetzt.`)
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
                    const recoveryText = recoveryResult?.skipped
                        ? ' Kein Recovery-Backup noetig, da vorher keine Daten gespeichert waren.'
                        : ' Recovery-Backup wurde vorher erstellt.';
                    status.textContent = `${result.message || 'Import abgeschlossen.'}${result.ok ? recoveryText : ''}`;
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
