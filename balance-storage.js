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
 */
export function initStorageManager(domRefs, state, renderer) {
    dom = domRefs;
    appState = state;
    UIRenderer = renderer;
}

export const StorageManager = {
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

    loadState() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE.LS_KEY);
            const parsed = data ? JSON.parse(data) : {};
            return this._runMigrations(parsed);
        } catch (e) {
            throw new StorageError("Fehler beim Laden des Zustands aus dem LocalStorage.", { originalError: e });
        }
    },

    saveState(state) {
        try {
            localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(state));
        } catch (e) {
            throw new StorageError("Fehler beim Speichern des Zustands im LocalStorage.", { originalError: e });
        }
    },

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

    resetState() {
        localStorage.removeItem(CONFIG.STORAGE.LS_KEY);
        localStorage.removeItem(CONFIG.STORAGE.MIGRATION_FLAG);
    },

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
        } catch(e) {
            console.warn("Konnte Snapshot-Handle nicht laden.", e);
        }
    },

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
                    .map(key => ({
                        key,
                        name: new Date(key.replace(CONFIG.STORAGE.SNAPSHOT_PREFIX, ''))
                            .toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
                    }));
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
        snapshots.sort((a,b) => b.name.localeCompare(a.name)).forEach(({ key, name }) => {
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

    async createSnapshot(handle) {
        const currentData = this.loadState();
        if (!currentData || Object.keys(currentData).length === 0) {
            throw new StorageError("Keine Daten zum Sichern vorhanden.");
        }
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');

        if (handle) {
            const fileName = `Snapshot_${timestamp}.json`;
            const fileHandle = await handle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(currentData, null, 2));
            await writable.close();
        } else {
            const key = CONFIG.STORAGE.SNAPSHOT_PREFIX + new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(currentData));
        }
    },

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

    async restoreSnapshot(key, handle) {
        let snapshotData;
        if (handle) {
            const fileHandle = await handle.getFileHandle(key);
            const file = await fileHandle.getFile();
            snapshotData = JSON.parse(await file.text());
        } else {
            snapshotData = JSON.parse(localStorage.getItem(key));
        }
        this.saveState(snapshotData);
        location.reload();
    },

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
