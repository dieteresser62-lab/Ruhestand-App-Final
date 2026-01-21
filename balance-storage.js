"use strict";

/**
 * ===================================================================================
 * BALANCE-APP PERSISTENZ-SCHICHT (StorageManager)
 * ===================================================================================
 */

import { CONFIG, StorageError } from './balance-config.js';

// Module-level references to be injected
let dom = null;
let appState = null;
let UIRenderer = null;

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
            const data = localStorage.getItem(CONFIG.STORAGE.LS_KEY);
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
            localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(state));
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
        if (localStorage.getItem(CONFIG.STORAGE.MIGRATION_FLAG)) return data;

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
        localStorage.setItem(CONFIG.STORAGE.MIGRATION_FLAG, '1');
        return data;
    },

    /**
     * Löscht den gespeicherten Zustand (Reset)
     * Entfernt localStorage-Einträge für State und Migrations-Flag
     */
    resetState() {
        localStorage.removeItem(CONFIG.STORAGE.LS_KEY);
        localStorage.removeItem(CONFIG.STORAGE.MIGRATION_FLAG);
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
            dom.controls.snapshotStatus.textContent = "Speicherort: Browser (File System API nicht unterstützt)";
            return;
        }
        try {
            const handle = await this._idbHelper.get('snapshotDirHandle');
            if (handle && (await handle.queryPermission({ mode: 'readwrite' })) === 'granted') {
                appState.snapshotHandle = handle;
            }
        } catch (e) {
            console.warn("Konnte Snapshot-Handle nicht laden.", e);
        }
    },

    /**
     * Rendert die Liste verfügbarer Snapshots im UI
     *
     * Lädt Snapshots entweder aus dem verbundenen File-System-Ordner
     * (falls handle vorhanden) oder aus localStorage. Erstellt für
     * jeden Snapshot Wiederherstellen- und Löschen-Buttons.
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
            if (handle) {
                statusEl.textContent = `Verbunden mit: ${handle.name}`;
                for await (const entry of handle.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                        snapshots.push({ key: entry.name, name: entry.name.replace('.json', '') });
                    }
                }
            } else {
                statusEl.textContent = 'Speicherort: Browser (localStorage)';
                snapshots = Object.keys(localStorage)
                    .filter(key => key.startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX))
                    .map(key => {
                        const rawSuffix = key.replace(CONFIG.STORAGE.SNAPSHOT_PREFIX, '');
                        // Check for separator indicating a label we added: '--'
                        let dateStr = rawSuffix;
                        let label = '';
                        if (rawSuffix.includes('--')) {
                            const parts = rawSuffix.split('--');
                            dateStr = parts[0];
                            label = parts.slice(1).join('--'); // Rejoin rest if there were multiple dashes
                        }

                        let displayName = new Date(dateStr)
                            .toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
                        if (displayName === 'Invalid Date') displayName = dateStr;
                        if (label) displayName += ` (${label})`;

                        return { key, name: displayName };
                    });
            }
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
        snapshots.sort((a, b) => b.name.localeCompare(a.name)).forEach(({ key, name }) => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;

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
     * Erstellt einen neuen Snapshot des aktuellen Zustands
     *
     * Speichert den kompletten Anwendungszustand entweder als JSON-Datei
     * im verbundenen Verzeichnis (falls handle vorhanden) oder im localStorage.
     * Der Dateiname enthält einen Zeitstempel im Format: Snapshot_YYYY-MM-DD_HH-MM-SS.json
     *
     * @async
     * @param {FileSystemDirectoryHandle|null} handle - Verzeichnis-Handle oder null
     * @param {string} [label=''] - Optionaler Benutzer-Label für den Snapshot
     * @returns {Promise<void>}
     * @throws {StorageError} Wenn keine Daten zum Sichern vorhanden sind
     */
    async createSnapshot(handle, label = '') {
        const localSnapshot = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            localSnapshot[key] = localStorage.getItem(key);
        }
        if (Object.keys(localSnapshot).length === 0) {
            throw new StorageError("Keine Daten zum Sichern vorhanden.");
        }
        const currentData = {
            snapshotType: 'full-localstorage',
            createdAt: new Date().toISOString(),
            localStorage: localSnapshot
        };
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');

        // Sanitize label
        const safeLabel = label ? label.replace(/[^a-zA-Z0-9_\- äöüÄÖÜß]/g, '_').trim() : '';

        if (handle) {
            // User Format: Profilname & Timestamp -> "Dieter_2025-..."
            // Fallback: Snapshot_2025-...
            const prefix = safeLabel ? safeLabel : 'Snapshot';
            // Ensure separator is clear. If label ends with _, don't add another.
            const fileName = `${prefix}_${timestamp}.json`;

            const fileHandle = await handle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(currentData, null, 2));
            await writable.close();
        } else {
            // Use '--' as separator for LocalStorage keys to distinguish date from label
            // We keep the chronological key structure for LS to maintain sorting
            const labelPart = safeLabel ? `--${safeLabel}` : '';
            const key = CONFIG.STORAGE.SNAPSHOT_PREFIX + new Date().toISOString() + labelPart;
            localStorage.setItem(key, JSON.stringify(currentData));
        }
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
     * Stellt einen Snapshot wieder her
     *
     * Lädt Snapshot-Daten entweder aus einer Datei (falls handle vorhanden)
     * oder aus localStorage, speichert sie als aktuellen Zustand und lädt
     * die Seite neu, um die wiederhergestellten Daten anzuzeigen.
     *
     * @async
     * @param {string} key - Dateiname oder localStorage-Schlüssel des Snapshots
     * @param {FileSystemDirectoryHandle|null} handle - Verzeichnis-Handle oder null
     * @returns {Promise<void>}
     */
    async restoreSnapshot(key, handle) {
        let snapshotData;
        let rawSnapshot = null;
        if (handle) {
            const fileHandle = await handle.getFileHandle(key);
            const file = await fileHandle.getFile();
            snapshotData = JSON.parse(await file.text());
        } else {
            rawSnapshot = localStorage.getItem(key);
            snapshotData = JSON.parse(rawSnapshot);
        }
        if (!snapshotData || typeof snapshotData !== "object") {
            throw new StorageError("Snapshot enthält keine gültigen Daten.");
        }
        if (snapshotData.snapshotType === "full-localstorage" && snapshotData.localStorage) {
            localStorage.clear();
            Object.entries(snapshotData.localStorage).forEach(([lsKey, value]) => {
                localStorage.setItem(lsKey, value);
            });
            if (!handle && rawSnapshot && key) {
                localStorage.setItem(key, rawSnapshot);
            }
        } else {
            this.saveState(snapshotData);
        }
        location.reload();
    },

    /**
     * Löscht einen Snapshot
     *
     * Entfernt den Snapshot entweder als Datei aus dem verbundenen Verzeichnis
     * (falls handle vorhanden) oder aus localStorage. Aktualisiert anschließend
     * die Snapshot-Liste im UI.
     *
     * @async
     * @param {string} key - Dateiname oder localStorage-Schlüssel des Snapshots
     * @param {FileSystemDirectoryHandle|null} handle - Verzeichnis-Handle oder null
     * @returns {Promise<void>}
     */
    async deleteSnapshot(key, handle) {
        if (handle) {
            await handle.removeEntry(key);
        } else {
            localStorage.removeItem(key);
        }
        this.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, handle);
        UIRenderer.toast('Snapshot gelöscht.');
    }
};
