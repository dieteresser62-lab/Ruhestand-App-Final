/**
 * Module: Balance Storage (StorageManager)
 * Purpose: Manages data persistence via LocalStorage and the File System Access API (for Snapshots).
 *          Handles state loading/saving, migrations for older versions, and snapshot management.
 * Usage: Used by balance-main.js and balance-binder.js for all persistence operations.
 * Dependencies: balance-config.js
 */
"use strict";

/**
 * ===================================================================================
 * BALANCE-APP PERSISTENZ-SCHICHT (StorageManager)
 * ===================================================================================
 */

import { CONFIG, StorageError } from './balance-config.js';
import { PersistenceFacade, persistenceStorage } from '../shared/persistence-facade.js';
import { SnapshotArchive, SNAPSHOT_KINDS } from '../shared/snapshot-archive.js';
import { isAllowedSnapshotRestoreLiveKey } from '../shared/persistence-key-policy.js';
import { PROFILE_STORAGE_KEYS } from '../profile/profile-state.js';
import { isProfileScopedKey } from '../profile/profile-key-policy.js';
import { saveCurrentProfileFromLocalStorage } from '../profile/profile-storage.js';

// Module-level references to be injected
let dom = null;
let appState = null;
let UIRenderer = null;

function parseJsonObject(raw, fallback = null) {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(String(raw));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function registryHasProfile(registry, profileId) {
    if (!profileId || !registry || typeof registry !== 'object') return false;
    return Boolean(registry.profiles?.[profileId]);
}

function getProfileNameFromRegistry(registry, profileId) {
    return String(registry?.profiles?.[profileId]?.meta?.name || '');
}

function getPersistenceKeys() {
    return Array.from({ length: persistenceStorage.length }, (_, i) => persistenceStorage.key(i)).filter(Boolean);
}

function getSnapshotStatusText() {
    const backend = PersistenceFacade.getPersistenceStatus().backend;
    if (backend === 'Tauri JSON File') return 'Internes Snapshot-Archiv: App-Speicher (separates snapshots-Target)';
    if (backend === 'IndexedDB') return 'Internes Snapshot-Archiv: Browser-Speicher (IndexedDB Store snapshots)';
    return 'Internes Snapshot-Archiv: Browser-Fallback (localStorage, begrenzte Ablage)';
}

function formatSnapshotName(entry) {
    const createdAt = new Date(entry.createdAt);
    const dateText = Number.isFinite(createdAt.getTime())
        ? createdAt.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
        : String(entry.createdAt || entry.id);
    const label = entry.label || entry.activeProfileName || '';
    return label ? `${dateText} (${label})` : dateText;
}

function buildRestoredProfileData(records) {
    const data = {};
    Object.entries(records || {}).forEach(([key, value]) => {
        if (key === PROFILE_STORAGE_KEYS.registry || key === PROFILE_STORAGE_KEYS.current || key === PROFILE_STORAGE_KEYS.active) return;
        if (!isProfileScopedKey(key)) return;
        if (value === null || value === undefined) return;
        data[key] = String(value);
    });
    return data;
}

function buildStandardRestorePlan(snapshot, currentRegistry) {
    const snapshotActiveProfileId = String(snapshot.activeProfileId || '');
    if (!registryHasProfile(currentRegistry, snapshotActiveProfileId)) {
        throw new StorageError(`Das Snapshot-Profil "${snapshotActiveProfileId || 'unbekannt'}" existiert in der aktuellen Profil-Registry nicht mehr.`);
    }

    const registry = JSON.parse(JSON.stringify(currentRegistry));
    registry.profiles[snapshotActiveProfileId] = {
        ...registry.profiles[snapshotActiveProfileId],
        data: buildRestoredProfileData(snapshot.records)
    };

    const restoreOptions = {
        mode: 'standard',
        snapshotActiveProfileId,
        currentRegistry
    };
    const allowKey = (key) => {
        if (key === PROFILE_STORAGE_KEYS.registry) return true;
        return isAllowedSnapshotRestoreLiveKey(key, restoreOptions);
    };
    const snapshotKeys = new Set(Object.keys(snapshot.records || {}));
    const protectedKeys = new Set([
        PROFILE_STORAGE_KEYS.registry,
        PROFILE_STORAGE_KEYS.current,
        PROFILE_STORAGE_KEYS.active
    ]);
    const deleteKeys = getPersistenceKeys()
        .filter(key => !snapshotKeys.has(key))
        .filter(key => !protectedKeys.has(key))
        .filter(key => isAllowedSnapshotRestoreLiveKey(key, restoreOptions));
    const upserts = Object.entries(snapshot.records || {})
        .filter(([key]) => key !== PROFILE_STORAGE_KEYS.registry)
        .filter(([key]) => isAllowedSnapshotRestoreLiveKey(key, restoreOptions))
        .map(([key, value]) => [key, String(value)]);

    upserts.push([PROFILE_STORAGE_KEYS.current, snapshotActiveProfileId]);
    upserts.push([PROFILE_STORAGE_KEYS.active, snapshotActiveProfileId]);
    upserts.push([PROFILE_STORAGE_KEYS.registry, JSON.stringify(registry)]);

    return { deleteKeys, upserts, allowKey };
}

/**
 * Initialisiert den StorageManager mit den notwendigen Abhängigkeiten
 *
 * @param {Object} domRefs - DOM-Referenzen für UI-Updates
 * @param {Object} state - Globaler Anwendungszustand
 * @param {Object} renderer - UI-Renderer für Toast-Nachrichten
 */
export function initStorageManager(domRefs, state, renderer) {
    dom = domRefs;
    appState = state;
    UIRenderer = renderer;
}

export const StorageManager = {
    /**
     * IndexedDB-Helper für File System Access API Handles
     * Speichert Verzeichnis-Handles persistent zwischen Sessions
     */
    _idbHelper: {
        db: null,
        open() {
            return new Promise((resolve, reject) => {
                if (this.db) return resolve();
                const request = indexedDB.open('snapshotDB', 1);
                request.onupgradeneeded = e => e.target.result.createObjectStore('handles');
                request.onsuccess = e => { this.db = e.target.result; resolve(); };
                request.onerror = e => reject(e.target.error);
            });
        },
        async get(key) {
            await this.open();
            return new Promise((res, rej) => {
                const req = this.db.transaction('handles').objectStore('handles').get(key);
                req.onsuccess = e => res(e.target.result);
                req.onerror = e => rej(e.target.error);
            });
        },
        async set(key, val) {
            await this.open();
            return new Promise((res, rej) => {
                const req = this.db.transaction('handles', 'readwrite').objectStore('handles').put(val, key);
                req.onsuccess = () => res();
                req.onerror = e => rej(e.target.error);
            });
        }
    },

    /**
     * Lädt den gespeicherten Zustand aus localStorage
     *
     * Enthält:
     * - Benutzereingaben (Vermögen, Bedarf, Marktdaten)
     * - Engine-State (Guardrail-History, Inflationsfaktor, etc.)
     *
     * @returns {Object} Gespeicherter Zustand mit inputs und lastState
     * @throws {StorageError} Bei Lade- oder Parse-Fehlern
     */
    loadState() {
        try {
            const data = persistenceStorage.getItem(CONFIG.STORAGE.LS_KEY);
            const parsed = data ? JSON.parse(data) : {};
            return this._runMigrations(parsed);
        } catch (e) {
            throw new StorageError("Fehler beim Laden des Zustands aus dem LocalStorage.", { originalError: e });
        }
    },

    /**
     * Speichert den aktuellen Zustand in localStorage
     *
     * @param {Object} state - Zustand mit inputs und lastState
     * @throws {StorageError} Bei Speicher-Fehlern (z.B. Quota exceeded)
     */
    saveState(state) {
        try {
            persistenceStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(state));
        } catch (e) {
            throw new StorageError("Fehler beim Speichern des Zustands im LocalStorage.", { originalError: e });
        }
    },

    /**
     * Führt Daten-Migrationen für ältere localStorage-Versionen durch
     *
     * Bereinigt fehlerhafte Werte:
     * - Inflationsfaktor > 3 → 1 (Reset bei fehlerhaften Werten)
     * - Nicht-finite Werte → Standardwerte
     *
     * @param {Object} data - Rohdaten aus localStorage
     * @returns {Object} Migrierte Daten
     * @private
     */
    _runMigrations(data) {
        const ensureTaxState = (payload) => {
            if (!payload || typeof payload !== 'object') return payload;
            const state = payload.lastState;
            if (!state || typeof state !== 'object') return payload;
            if (!state.taxState || typeof state.taxState !== 'object') {
                state.taxState = { lossCarry: 0 };
            } else if (!Number.isFinite(state.taxState.lossCarry) || state.taxState.lossCarry < 0) {
                state.taxState.lossCarry = 0;
            }
            payload.lastState = state;
            return payload;
        };
        if (persistenceStorage.getItem(CONFIG.STORAGE.MIGRATION_FLAG)) {
            return ensureTaxState(data);
        }

        let state = data.lastState || {};
        if (state) {
            if (!isFinite(state.cumulativeInflationFactor) || state.cumulativeInflationFactor > 3) {
                state.cumulativeInflationFactor = 1;
            }
            if (!Number.isFinite(state.lastInflationAppliedAtAge)) {
                state.lastInflationAppliedAtAge = 0;
            }
            data.lastState = state;
        }
        persistenceStorage.setItem(CONFIG.STORAGE.MIGRATION_FLAG, '1');
        return ensureTaxState(data);
    },

    /**
     * Löscht den gespeicherten Zustand (Reset)
     * Entfernt localStorage-Einträge für State und Migrations-Flag
     */
    resetState() {
        persistenceStorage.removeItem(CONFIG.STORAGE.LS_KEY);
        persistenceStorage.removeItem(CONFIG.STORAGE.MIGRATION_FLAG);
    },

    /**
     * Initialisiert die Snapshot-Funktionalität
     *
     * Prüft File System Access API-Unterstützung und lädt gespeicherte
     * Verzeichnis-Handles aus IndexedDB. Falls kein Handle oder keine
     * Berechtigung vorhanden, bleibt localStorage als Fallback aktiv.
     *
     * @async
     * @returns {Promise<void>}
     */
    async initSnapshots() {
        if (!('showDirectoryPicker' in window)) {
            dom.controls.connectFolderBtn.style.display = 'none';
            dom.controls.snapshotStatus.textContent = getSnapshotStatusText();
            return;
        }
        try {
            const handle = await this._idbHelper.get('snapshotDirHandle');
            if (handle && (await handle.queryPermission({ mode: 'readwrite' })) === 'granted') {
                appState.snapshotHandle = handle;
            }
        } catch (e) { }
    },

    /**
     * Rendert die Liste verfügbarer Snapshots aus dem internen Snapshot-Archiv.
     *
     * @async
     * @param {HTMLElement} listEl - DOM-Element für die Snapshot-Liste
     * @param {HTMLElement} statusEl - DOM-Element für Statusanzeige
     * @param {FileSystemDirectoryHandle|null} handle - Verzeichnis-Handle oder null
     * @returns {Promise<void>}
     */
    async renderSnapshots(listEl, statusEl, handle) {
        const liLoading = document.createElement('li');
        liLoading.textContent = 'Lade...';
        listEl.replaceChildren(liLoading);

        let snapshots = [];
        try {
            statusEl.textContent = getSnapshotStatusText();
            snapshots = await SnapshotArchive.listSnapshots();
        } catch (err) {
            liLoading.textContent = 'Fehler beim Laden der Snapshots.';
            return;
        }

        if (snapshots.length === 0) {
            liLoading.textContent = 'Keine Snapshots vorhanden.';
            listEl.replaceChildren(liLoading);
            return;
        }

        const fragment = document.createDocumentFragment();
        snapshots.forEach(entry => {
            const key = entry.id;
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = formatSnapshotName(entry);
            if (!entry.standardRestorable) {
                const restoreHint = document.createElement('small');
                restoreHint.textContent = 'Standard-Restore nur nach Profilzuordnung moeglich.';
                restoreHint.style.display = 'block';
                restoreHint.style.color = 'var(--muted-text)';
                nameSpan.appendChild(restoreHint);
            }

            const actionsSpan = document.createElement('span');
            actionsSpan.className = 'snapshot-actions';

            const restoreBtn = document.createElement('button');
            restoreBtn.type = 'button';
            restoreBtn.className = 'btn btn-sm btn-utility restore-snapshot';
            restoreBtn.dataset.key = key;
            restoreBtn.textContent = 'Wiederherstellen';

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-sm delete-snapshot';
            deleteBtn.dataset.key = key;
            deleteBtn.style.color = 'var(--danger-color)';
            deleteBtn.textContent = 'Löschen';

            actionsSpan.append(restoreBtn, deleteBtn);
            li.append(nameSpan, actionsSpan);
            fragment.appendChild(li);
        });
        listEl.replaceChildren(fragment);
    },

    /**
     * Erstellt einen neuen kanonischen Snapshot des aktuellen Zustands im internen Archiv.
     *
     * @async
     * @param {FileSystemDirectoryHandle|null} handle - Verzeichnis-Handle oder null
     * @param {string} [label=''] - Optionaler Benutzer-Label für den Snapshot
     * @returns {Promise<void>}
     * @throws {StorageError} Wenn keine Daten zum Sichern vorhanden sind
     */
    async createSnapshot(handle, label = '') {
        saveCurrentProfileFromLocalStorage();
        const records = SnapshotArchive.captureCurrentRecords({
            keys: getPersistenceKeys,
            getItem: key => persistenceStorage.getItem(key)
        });
        if (Object.keys(records).length === 0) {
            throw new StorageError("Keine Daten zum Sichern vorhanden.");
        }
        const activeProfileId = SnapshotArchive.getActiveProfileIdFromRecords(records);
        const registry = parseJsonObject(records[PROFILE_STORAGE_KEYS.registry], null);
        await SnapshotArchive.createSnapshot({
            label,
            kind: SNAPSHOT_KINDS.annualClosePreMutation,
            records,
            activeProfileId,
            activeProfileName: getProfileNameFromRegistry(registry, activeProfileId)
        });
    },

    /**
     * Öffnet Ordner-Auswahl-Dialog und verbindet File-System-Verzeichnis
     *
     * Fordert Benutzer auf, einen Ordner für Snapshots auszuwählen.
     * Speichert das Verzeichnis-Handle in IndexedDB für zukünftige Sessions
     * und aktualisiert die Snapshot-Liste im UI.
     *
     * @async
     * @returns {Promise<void>}
     * @throws {StorageError} Wenn Zugriff verweigert oder Verbindung fehlschlägt
     */
    async connectFolder() {
        try {
            const handle = await window.showDirectoryPicker();
            if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
                throw new StorageError('Zugriff auf den Ordner wurde nicht gewährt.');
            }
            await this._idbHelper.set('snapshotDirHandle', handle);
            appState.snapshotHandle = handle;
            UIRenderer.toast('Snapshot-Ordner erfolgreich verbunden.');
            this.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
        } catch (err) {
            if (err.name !== 'AbortError') {
                throw new StorageError('Ordner konnte nicht verbunden werden.', { originalError: err });
            }
        }
    },

    /**
     * Stellt einen kanonischen Archiv-Snapshot per Standard-Restore wieder her.
     *
     * @async
     * @param {string} key - Dateiname oder localStorage-Schlüssel des Snapshots
     * @param {FileSystemDirectoryHandle|null} handle - Verzeichnis-Handle oder null
     * @returns {Promise<void>}
     */
    async restoreSnapshot(key, handle) {
        saveCurrentProfileFromLocalStorage();
        const snapshot = await SnapshotArchive.readSnapshot(key);
        const currentRegistry = parseJsonObject(persistenceStorage.getItem(PROFILE_STORAGE_KEYS.registry), null);
        const { deleteKeys, upserts, allowKey } = buildStandardRestorePlan(snapshot, currentRegistry);
        await PersistenceFacade.replaceLiveRecords(snapshot.records, {
            deleteKeys,
            upserts,
            allowKey,
            restoreLock: true
        });
        location.reload();
    },

    /**
     * Löscht einen Snapshot aus dem internen Archiv und aktualisiert die UI-Liste.
     *
     * @async
     * @param {string} key - Dateiname oder localStorage-Schlüssel des Snapshots
     * @param {FileSystemDirectoryHandle|null} handle - Verzeichnis-Handle oder null
     * @returns {Promise<void>}
     */
    async deleteSnapshot(key, handle) {
        await SnapshotArchive.deleteSnapshot(key);
        this.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, handle);
        UIRenderer.toast('Snapshot gelöscht.');
    }
};
