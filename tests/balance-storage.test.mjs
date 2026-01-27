"use strict";

/**
 * Tests für balance-storage.js
 * - localStorage-Serialisierung
 * - Migrations-Logik
 * - State-Management
 * - Snapshot-Erstellung (mit Mock)
 */

// Mock für localStorage (Map-basiert, genügt für Tests).
class MockLocalStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
        this.store.set(key, String(value));
    }

    removeItem(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }

    key(index) {
        const keys = Array.from(this.store.keys());
        return keys[index] || null;
    }

    get length() {
        return this.store.size;
    }

    // Iterator für Object.keys-ähnliche Operationen
    keys() {
        return Array.from(this.store.keys());
    }
}

// Mock für IndexedDB (nur für API-Kompatibilität).
class MockIDBHelper {
    constructor() {
        this.store = new Map();
        this.db = {};
    }

    async open() {
        return Promise.resolve();
    }

    async get(key) {
        return this.store.get(key) || null;
    }

    async set(key, val) {
        this.store.set(key, val);
    }
}

// Setup global mocks
const mockLocalStorage = new MockLocalStorage();
global.localStorage = mockLocalStorage;

// Mock CONFIG und StorageError
const CONFIG = {
    STORAGE: {
        LS_KEY: 'balance_app_state',
        MIGRATION_FLAG: 'balance_migration_v1',
        SNAPSHOT_PREFIX: 'balance_snapshot_'
    }
};

class StorageError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'StorageError';
        this.originalError = options.originalError || null;
    }
}

// Minimaler StorageManager für Tests (aus balance-storage.js extrahiert)
const StorageManager = {
    _idbHelper: new MockIDBHelper(),

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
        const safeLabel = label ? label.replace(/[^a-zA-Z0-9_\- äöüÄÖÜß]/g, '_').trim() : '';

        if (!handle) {
            const labelPart = safeLabel ? `--${safeLabel}` : '';
            const key = CONFIG.STORAGE.SNAPSHOT_PREFIX + new Date().toISOString() + labelPart;
            localStorage.setItem(key, JSON.stringify(currentData));
            return key;
        }
        return null; // File handle nicht implementiert im Mock
    },

    async restoreSnapshot(key, handle) {
        let snapshotData;
        let rawSnapshot = localStorage.getItem(key);
        snapshotData = JSON.parse(rawSnapshot);

        if (!snapshotData || typeof snapshotData !== "object") {
            throw new StorageError("Snapshot enthält keine gültigen Daten.");
        }
        if (snapshotData.snapshotType === "full-localstorage" && snapshotData.localStorage) {
            localStorage.clear();
            Object.entries(snapshotData.localStorage).forEach(([lsKey, value]) => {
                localStorage.setItem(lsKey, value);
            });
            if (rawSnapshot && key) {
                localStorage.setItem(key, rawSnapshot);
            }
        } else {
            this.saveState(snapshotData);
        }
    },

    async deleteSnapshot(key, handle) {
        if (!handle) {
            localStorage.removeItem(key);
        }
    }
};

console.log('--- Balance Storage Tests ---');

// Test 1: saveState und loadState - Basis
console.log('Test 1: saveState und loadState - Basis');
{
    mockLocalStorage.clear();

    const testState = {
        inputs: {
            startVermoegen: 500000,
            startFloorBedarf: 24000,
            startFlexBedarf: 12000
        },
        lastState: {
            cumulativeInflationFactor: 1.05,
            lastInflationAppliedAtAge: 66
        }
    };

    // Rundtrip: speichern -> laden -> Struktur erhalten.
    StorageManager.saveState(testState);
    const loaded = StorageManager.loadState();

    assertEqual(loaded.inputs.startVermoegen, 500000, 'startVermoegen sollte geladen werden');
    assertEqual(loaded.inputs.startFloorBedarf, 24000, 'startFloorBedarf sollte geladen werden');
    assertClose(loaded.lastState.cumulativeInflationFactor, 1.05, 1e-9, 'cumulativeInflationFactor sollte geladen werden');
    console.log('✓ saveState und loadState Basis OK');
}

// Test 2: loadState - Leerer Storage
console.log('Test 2: loadState - Leerer Storage');
{
    mockLocalStorage.clear();

    const loaded = StorageManager.loadState();

    assert(typeof loaded === 'object', 'Leerer Storage sollte leeres Objekt liefern');
    assertEqual(Object.keys(loaded).length, 1, 'Sollte nur lastState nach Migration haben');
    console.log('✓ loadState Leerer Storage OK');
}

// Test 3: Migration - Ungültiger cumulativeInflationFactor
console.log('Test 3: Migration - Ungültiger cumulativeInflationFactor');
{
    mockLocalStorage.clear();

    const brokenState = {
        lastState: {
            cumulativeInflationFactor: 5.0, // Ungültig (> 3)
            lastInflationAppliedAtAge: 70
        }
    };

    localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(brokenState));
    const loaded = StorageManager.loadState();

    assertEqual(loaded.lastState.cumulativeInflationFactor, 1, 'cumulativeInflationFactor > 3 sollte auf 1 zurückgesetzt werden');
    console.log('✓ Migration Ungültiger cumulativeInflationFactor OK');
}

// Test 4: Migration - NaN lastInflationAppliedAtAge
console.log('Test 4: Migration - NaN lastInflationAppliedAtAge');
{
    mockLocalStorage.clear();

    const brokenState = {
        lastState: {
            cumulativeInflationFactor: 1.02,
            lastInflationAppliedAtAge: NaN
        }
    };

    localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(brokenState));
    const loaded = StorageManager.loadState();

    assertEqual(loaded.lastState.lastInflationAppliedAtAge, 0, 'NaN lastInflationAppliedAtAge sollte auf 0 zurückgesetzt werden');
    console.log('✓ Migration NaN lastInflationAppliedAtAge OK');
}

// Test 5: Migration - Wird nur einmal ausgeführt
console.log('Test 5: Migration - Wird nur einmal ausgeführt');
{
    mockLocalStorage.clear();

    // Erste Migration
    const state1 = { lastState: { cumulativeInflationFactor: 5.0 } };
    localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(state1));
    StorageManager.loadState();

    // Setze ungültigen Wert erneut
    const state2 = { lastState: { cumulativeInflationFactor: 10.0 } };
    localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(state2));
    const loaded = StorageManager.loadState();

    // Migration sollte nicht erneut laufen (Flag gesetzt)
    assertEqual(loaded.lastState.cumulativeInflationFactor, 10.0, 'Zweite Migration sollte nicht laufen');
    console.log('✓ Migration Wird nur einmal ausgeführt OK');
}

// Test 6: resetState
console.log('Test 6: resetState');
{
    mockLocalStorage.clear();

    StorageManager.saveState({ inputs: { test: 123 } });
    assert(localStorage.getItem(CONFIG.STORAGE.LS_KEY) !== null, 'State sollte gespeichert sein');

    StorageManager.resetState();

    assertEqual(localStorage.getItem(CONFIG.STORAGE.LS_KEY), null, 'State sollte gelöscht sein');
    assertEqual(localStorage.getItem(CONFIG.STORAGE.MIGRATION_FLAG), null, 'Migration-Flag sollte gelöscht sein');
    console.log('✓ resetState OK');
}

// Test 7: createSnapshot - Basis
console.log('Test 7: createSnapshot - Basis');
{
    mockLocalStorage.clear();

    localStorage.setItem('test_key_1', 'value_1');
    localStorage.setItem('test_key_2', 'value_2');

    const snapshotKey = await StorageManager.createSnapshot(null, '');

    assert(snapshotKey.startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX), 'Snapshot-Key sollte mit Prefix beginnen');

    const snapshotData = JSON.parse(localStorage.getItem(snapshotKey));
    assertEqual(snapshotData.snapshotType, 'full-localstorage', 'snapshotType sollte full-localstorage sein');
    assertEqual(snapshotData.localStorage.test_key_1, 'value_1', 'Snapshot sollte test_key_1 enthalten');
    assertEqual(snapshotData.localStorage.test_key_2, 'value_2', 'Snapshot sollte test_key_2 enthalten');
    console.log('✓ createSnapshot Basis OK');
}

// Test 8: createSnapshot - Mit Label
console.log('Test 8: createSnapshot - Mit Label');
{
    mockLocalStorage.clear();

    localStorage.setItem('data', 'test');

    const snapshotKey = await StorageManager.createSnapshot(null, 'Mein_Profil');

    assert(snapshotKey.includes('--Mein_Profil'), 'Snapshot-Key sollte Label enthalten');
    console.log('✓ createSnapshot Mit Label OK');
}

// Test 9: createSnapshot - Leerer Storage
console.log('Test 9: createSnapshot - Leerer Storage');
{
    mockLocalStorage.clear();

    let errorThrown = false;
    try {
        await StorageManager.createSnapshot(null, '');
    } catch (e) {
        errorThrown = true;
        assert(e instanceof StorageError, 'Sollte StorageError werfen');
        assert(e.message.includes('Keine Daten'), 'Fehlermeldung sollte "Keine Daten" enthalten');
    }
    assert(errorThrown, 'Leerer Storage sollte Fehler werfen');
    console.log('✓ createSnapshot Leerer Storage OK');
}

// Test 10: restoreSnapshot
console.log('Test 10: restoreSnapshot');
{
    mockLocalStorage.clear();

    // Erstelle Zustand
    localStorage.setItem('key_before', 'before_value');

    // Erstelle Snapshot
    const snapshotKey = await StorageManager.createSnapshot(null, '');

    // Ändere Zustand
    localStorage.setItem('key_before', 'changed_value');
    localStorage.setItem('key_new', 'new_value');

    // Restore Snapshot
    await StorageManager.restoreSnapshot(snapshotKey, null);

    assertEqual(localStorage.getItem('key_before'), 'before_value', 'key_before sollte wiederhergestellt sein');
    assertEqual(localStorage.getItem('key_new'), null, 'key_new sollte nicht existieren nach Restore');
    console.log('✓ restoreSnapshot OK');
}

// Test 11: deleteSnapshot
console.log('Test 11: deleteSnapshot');
{
    mockLocalStorage.clear();

    localStorage.setItem('data', 'test');
    const snapshotKey = await StorageManager.createSnapshot(null, '');

    assert(localStorage.getItem(snapshotKey) !== null, 'Snapshot sollte existieren');

    await StorageManager.deleteSnapshot(snapshotKey, null);

    assertEqual(localStorage.getItem(snapshotKey), null, 'Snapshot sollte gelöscht sein');
    console.log('✓ deleteSnapshot OK');
}

// Test 12: Komplexer State mit verschachtelten Objekten
console.log('Test 12: Komplexer State');
{
    mockLocalStorage.clear();

    const complexState = {
        inputs: {
            startVermoegen: 1000000,
            portfolio: {
                aktien: 600000,
                anleihen: 300000,
                liquiditaet: 100000
            },
            renten: [
                { name: 'GRV', betrag: 1500 },
                { name: 'bAV', betrag: 500 }
            ]
        },
        lastState: {
            cumulativeInflationFactor: 1.1,
            guardrailHistory: [0.95, 1.0, 1.05, 0.98],
            lastInflationAppliedAtAge: 68
        }
    };

    StorageManager.saveState(complexState);
    const loaded = StorageManager.loadState();

    assertEqual(loaded.inputs.portfolio.aktien, 600000, 'Verschachteltes portfolio.aktien sollte geladen werden');
    assertEqual(loaded.inputs.renten.length, 2, 'renten Array sollte 2 Elemente haben');
    assertEqual(loaded.inputs.renten[0].name, 'GRV', 'Erste Rente sollte GRV sein');
    assertEqual(loaded.lastState.guardrailHistory.length, 4, 'guardrailHistory sollte 4 Elemente haben');
    console.log('✓ Komplexer State OK');
}

// Test 13: Ungültiges JSON im Storage
console.log('Test 13: Ungültiges JSON im Storage');
{
    mockLocalStorage.clear();

    localStorage.setItem(CONFIG.STORAGE.LS_KEY, 'nicht valid json {{{');

    let errorThrown = false;
    try {
        StorageManager.loadState();
    } catch (e) {
        errorThrown = true;
        assert(e instanceof StorageError, 'Sollte StorageError werfen');
    }
    assert(errorThrown, 'Ungültiges JSON sollte Fehler werfen');
    console.log('✓ Ungültiges JSON im Storage OK');
}

// Test 14: restoreSnapshot mit ungültigen Daten
console.log('Test 14: restoreSnapshot mit ungültigen Daten');
{
    mockLocalStorage.clear();

    const invalidKey = 'invalid_snapshot_key';
    localStorage.setItem(invalidKey, 'null');

    let errorThrown = false;
    try {
        await StorageManager.restoreSnapshot(invalidKey, null);
    } catch (e) {
        errorThrown = true;
        assert(e instanceof StorageError, 'Sollte StorageError werfen');
    }
    assert(errorThrown, 'Ungültiger Snapshot sollte Fehler werfen');
    console.log('✓ restoreSnapshot mit ungültigen Daten OK');
}

// Test 15: Mehrere Snapshots
console.log('Test 15: Mehrere Snapshots');
{
    mockLocalStorage.clear();

    localStorage.setItem('state_v1', 'version_1');
    const key1 = await StorageManager.createSnapshot(null, 'v1');

    localStorage.setItem('state_v1', 'version_2');
    localStorage.setItem('state_v2', 'added_in_v2');
    const key2 = await StorageManager.createSnapshot(null, 'v2');

    // Beide Snapshots sollten existieren
    assert(localStorage.getItem(key1) !== null, 'Snapshot v1 sollte existieren');
    assert(localStorage.getItem(key2) !== null, 'Snapshot v2 sollte existieren');

    // Restore v1
    await StorageManager.restoreSnapshot(key1, null);
    assertEqual(localStorage.getItem('state_v1'), 'version_1', 'state_v1 sollte version_1 sein nach Restore v1');
    assertEqual(localStorage.getItem('state_v2'), null, 'state_v2 sollte nicht existieren nach Restore v1');
    console.log('✓ Mehrere Snapshots OK');
}

// Aufräumen
mockLocalStorage.clear();

console.log('--- Balance Storage Tests Abgeschlossen ---');
