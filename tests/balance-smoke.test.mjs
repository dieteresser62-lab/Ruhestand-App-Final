
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createImportExportHandlers, createBalanceExportDocument } from '../app/balance/balance-binder-imports.js';
import { createSnapshotHandlers } from '../app/balance/balance-binder-snapshots.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import { PersistenceFacade } from '../app/shared/persistence-facade.js';
import { ValidationError } from '../app/balance/balance-config.js';
import { initUIRenderer, UIRenderer } from '../app/balance/balance-renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const htmlContent = fs.readFileSync(path.join(rootDir, 'Balance.html'), 'utf8');

console.log("--- Balance App Smoke Test (No JSDOM) ---");

// --- 1. Custom DOM Mock ---
// Ziel: Balance.html initialisieren, ohne JSDOM, mit minimalem DOM-API.

class MockElement {
    constructor(id, tagName = 'div') {
        this.id = id;
        this.tagName = tagName.toUpperCase();
        this.value = '';
        this.textContent = '';
        this.checked = false;
        this.style = { display: '' };
        this.dataset = {};
        this.classList = {
            _classes: new Set(),
            add: (c) => this.classList._classes.add(c),
            remove: (c) => this.classList._classes.delete(c),
            contains: (c) => this.classList._classes.has(c)
        };
        this.listeners = {};
        this.children = [];
        this.attributes = {};
    }

    set textContent(value) { this.text = String(value); this.children = []; }
    get textContent() { return (this.text || '') + this.children.map(child => child.textContent).join(''); }

    setAttribute(name, value) {
        this.attributes[name] = value;
        if (name === 'class') {
            // rudimentary sync not strictly needed if valid classList usage
        }
    }

    getAttribute(name) {
        return this.attributes[name] || null;
    }

    removeAttribute(name) {
        delete this.attributes[name];
    }

    addEventListener(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    dispatchEvent(event) {
        if (this.listeners[event.type]) {
            this.listeners[event.type].forEach(cb => {
                try {
                    cb(event);
                } catch (e) {
                    throw e;
                }
            });
        }
    }

    querySelector(selector) { return new MockElement('dummy-child'); }
    querySelectorAll(selector) { return []; }

    // Child manipulation
    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
    }

    append(...children) {
        children.forEach(c => {
            if (c instanceof MockElement) c.parentNode = this;
        });
        this.children.push(...children);
    }

    replaceChildren(...children) {
        this.textContent = '';
        this.children = [];
        this.append(...children);
    }

    remove() {
        if (this.parentNode) {
            this.parentNode.children = this.parentNode.children.filter(c => c !== this);
            this.parentNode = null;
        }
    }
}

class MockDocument {
    constructor() {
        this.elements = {};
        this.listeners = {};
        this.engineScript = new MockElement('engine-script', 'script');
        this.engineScript.src = 'engine.js';
    }

    createElement(tagName) {
        return new MockElement('', tagName);
    }

    createDocumentFragment() {
        return new MockElement('fragment', 'FRAGMENT');
    }

    createTextNode(text) {
        const el = new MockElement('text-node', 'TEXT_NODE');
        el.textContent = text;
        return el;
    }

    getElementById(id) {
        if (!this.elements[id]) {
            this.elements[id] = new MockElement(id);
        }
        return this.elements[id];
    }

    querySelector(selector) {
        if (selector === '.form-column') {
            return this.getElementById('input-form-container');
        }
        if (selector === 'script[src^="engine.js"]') {
            return this.engineScript;
        }
        // Return a dummy element
        return new MockElement('dummy-query');
    }

    querySelectorAll(selector) {
        if (selector === 'input, select') {
            // Auto-discover IDs from HTML content to populate dom.inputs
            const inputs = [];
            // Use [\s\S] to match across newlines inside the tag
            const regex = /<(?:input|select)[\s\S]+?id=["']([^"']+)["']/gi;
            let match;
            while ((match = regex.exec(htmlContent)) !== null) {
                const id = match[1];
                const lowerMatch = match[0].toLowerCase();
                const type = lowerMatch.includes('type="file"') ? 'file' : lowerMatch.includes('type="checkbox"') || lowerMatch.includes("type='checkbox'") ? 'checkbox' : 'text';
                const el = this.getElementById(id);
                el.type = type; // Set type hint
                inputs.push(el);
            }
            return inputs;
        }
        return [];
    }

    addEventListener(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    dispatchEvent(event) {
        if (this.listeners[event.type]) {
            this.listeners[event.type].forEach(cb => cb(event));
        }
    }
}

class MockEvent {
    constructor(type) {
        this.type = type;
        this.target = null; // Will be set on dispatch
    }
}

// Setup Global Context
const localStorageData = new Map();
const storageWrites = [];
const localStorageMock = {
    getItem: key => localStorageData.get(String(key)) ?? null,
    setItem: (key, value) => {
        localStorageData.set(String(key), String(value));
        storageWrites.push(String(key));
    },
    removeItem: key => localStorageData.delete(String(key)),
    key: index => Array.from(localStorageData.keys())[index] ?? null,
    get length() { return localStorageData.size; }
};

const savedGlobals = Object.fromEntries(['window', 'document', 'localStorage', 'Event']
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;

try {
global.window = {
    addEventListener: () => { },
    localStorage: localStorageMock,
    location: { href: 'http://localhost/' }
};
global.localStorage = localStorageMock; // Explicit global assignment
global.document = new MockDocument();
global.Event = MockEvent;

// Mock EngineAPI
let simulateCallCount = 0;
let engineFailure = null;
const compatibleEngine = {
    getVersion: () => ({ api: "31.0", build: "TEST-BUILD" }),
    getConfig: () => ({
        THRESHOLDS: {
            STRATEGY: { cashRebalanceThreshold: 2500 },
            ALARM: { withdrawalRate: 0.055, realDrawdown: 0.25 },
            CAUTION: { withdrawalRate: 0.045 }
        }
    }),
    simulateSingleYear: (input, lastState) => {
        simulateCallCount++;
        if (engineFailure) throw engineFailure;
        return {
            input,
            newState: {},
            ui: {
                liquiditaet: {
                    deckungVorher: 100,
                    deckungNachher: 110
                },
                depotwertGesamt: 200000,
                neuerBedarf: 30000,
                minGold: 0,
                zielLiquiditaet: 50000,
                runway: { months: 48, status: 'ok' },
                spending: {
                    monatlicheEntnahme: 2000,
                    details: { flexRate: 1.0, entnahmequoteDepot: 0.04, realerDepotDrawdown: 0 },
                    kuerzungQuelle: '-'
                },
                market: { szenarioText: 'Normaler Markt' },
                // Legacy support
                output: {
                    liquiditaet: 50000
                },
                action: {
                    type: "test",
                    summary: "Test Action",
                    title: "Test Action Title",
                    transactionDiagnostics: [],
                    details: {
                        regel: "Test",
                        params: {}
                    },
                    transactions: { verkaufAktien: 0, verkaufGold: 0 },
                    verwendungen: { liquiditaet: 0 }
                },
                diagnosis: { details: [] }
            },
            diagnosis: {
                general: {
                    runwayMonate: 48,
                    runwayStatus: 'ok',
                    marketSzenario: 'Normaler Markt',
                    alarmActive: false,
                    runwayTargetMonate: 60,
                    runwayTargetQuelle: 'User',
                    deckungVorher: 100,
                    deckungNachher: 110
                },
                keyParams: {
                    entnahmequoteDepot: 0.04,
                    realerDepotDrawdown: 0
                },
                details: []
            }
        };
    }
};
global.window.EngineAPI = compatibleEngine;

// Mock console
console.error = (...args) => {
    // Suppress expected errors during init if mocks aren't perfect
    // or log them if critical
    // originalConsoleError(...args);
};
console.info = () => { };

// --- 2. Import Module ---
const modulePath = path.join(rootDir, 'app', 'balance', 'balance-main.js');
const moduleUrl = new URL(`file:///${modulePath.replace(/\\/g, '/')}`).href;

let balanceMain;
try {
    balanceMain = await import(moduleUrl);
} catch (e) {
    originalConsoleError("Failed to import module:", e);
    throw e;
}
// --- 3. Trigger Init ---
console.log("Triggering Application Init via DOMContentLoaded...");

// Pre-fill critical inputs to pass validation in update()
document.getElementById('aktuellesAlter').value = "65";
document.getElementById('floorBedarf').value = "30000";
document.getElementById('flexBedarf').value = "24000";
document.getElementById('minimumFlexAnnual').value = "0";

const loadEvent = new MockEvent('DOMContentLoaded');
document.dispatchEvent(loadEvent);

// Wait for async init (StorageManager.initSnapshots is async promise chain)
await new Promise(resolve => setTimeout(resolve, 100));

// --- 4. Verify ---

// Verify Engine was called (init calls update())
assertEqual(simulateCallCount, 1, 'EngineAPI.simulateSingleYear should run exactly once during init');

// Verify Footer
const footer = document.getElementById('print-footer');
assert(footer.textContent.includes("Engine: 31.0"), `Footer should expose Engine 31.0, got '${footer.textContent}'`);
assertEqual(document.engineScript.src, 'engine.js', 'Engine script source should remain stable after handshake');

// --- 5. Test Interaction ---
console.log("Testing Input Change Trigger...");
const visibleToastText = () => document.getElementById('toast-container').children
    .find(child => child.className === 'toast-text')?.textContent || '';
const notification = 'Ausgaben-Check auf 2027 umgestellt. Vermögensstand gesichert.';
UIRenderer.toast(notification);
UIRenderer.clearError();
assertEqual(visibleToastText(), notification, 'Echter Renderer: clearError erhält den Toast');

// Get an input that we served via querySelectorAll
const inputEl = document.getElementById('p1StartAlter');
// Simulate change
inputEl.value = "67";

// Dispatch 'input' event on element
const evt = new MockEvent('input');
evt.target = inputEl;

// bubbling on .form-column which we mapped to 'input-form-container'
const formCheck = document.getElementById('input-form-container');
formCheck.dispatchEvent(evt);

// Wait for debounce (300ms)
await new Promise(resolve => setTimeout(resolve, 310));

assertEqual(simulateCallCount, 2, 'Debounced input should trigger exactly one additional engine call');
assertEqual(visibleToastText(), notification, 'Echtes debouncedUpdate erhält den Toast');

console.log("Testing machine-readable update results and fail-closed persistence...");

const successResult = balanceMain.update({ mode: 'preview' });
if (!successResult.ok || successResult.status !== 'success') {
    throw new Error(`Successful update returned unexpected result: ${JSON.stringify(successResult)}`);
}
assertEqual(visibleToastText(), notification, 'Echtes erfolgreiches update erhält den Toast');

const assertMinimumFlexReject = (rawValue, expectedMessages) => {
    const input = document.getElementById('minimumFlexAnnual');
    input.value = rawValue;
    const validationCallsBefore = simulateCallCount;
    const writesBeforeValidation = storageWrites.length;
    const validationResult = balanceMain.update();
    assert(
        !validationResult.ok && validationResult.status === 'validation_error',
        `Invalid minimum flex ${rawValue || '<leer>'} should return validation_error`
    );
    assertEqual(simulateCallCount, validationCallsBefore, `Invalid minimum flex ${rawValue || '<leer>'} should not call the engine`);
    assertEqual(storageWrites.length, writesBeforeValidation, `Invalid minimum flex ${rawValue || '<leer>'} should not persist data`);
    assertEqual(input.value, rawValue, `Invalid minimum flex ${rawValue || '<leer>'} should remain visible without clamping`);
    const messages = validationResult.error?.errors?.map(entry => entry.message) || [];
    expectedMessages.forEach(message => {
        assert(messages.includes(message), `Invalid minimum flex ${rawValue || '<leer>'} should include message: ${message}`);
    });
    assert(
        document.getElementById('error-container').textContent.includes('Einige Eingaben sind ungültig'),
        'Validation error should use the normal UI error path'
    );
};

assertMinimumFlexReject('-1', ['Mindest-Flex p.a. darf nicht negativ sein.']);
assertMinimumFlexReject('', ['Mindest-Flex p.a. darf nicht leer sein.']);
assertMinimumFlexReject('Infinity', ['Mindest-Flex p.a. muss eine endliche Zahl sein.']);
assertMinimumFlexReject('24001', [
    'Mindest-Flex p.a. darf nicht größer als Flex-Bedarf p.a. sein.',
    'Flex-Bedarf p.a. ist die Obergrenze für Mindest-Flex.'
]);
assertEqual(visibleToastText(), notification, 'Echtes Validierungsfehler-update erhält den Toast');
document.getElementById('minimumFlexAnnual').value = '0';
UIRenderer.handleActionError(new Error('Unabhängige Aktion'), 'expenses-import');
const corrected = balanceMain.update();
assert(corrected.ok, 'Korrigierte Eingaben führen zum erfolgreichen echten Update');
assertEqual(document.getElementById('error-container').textContent, '', 'Echtes Update beseitigt Berechnungsfehler und Liste');
assert(!document.getElementById('minimumFlexAnnual').classList.contains('input-error'), 'Echtes Update entfernt Feldmarkierungen');
assertEqual(visibleToastText(), notification, 'Korrektur erhält gleichzeitigen Toast');
assert(document.getElementById('action-error-container').textContent.includes('Unabhängige Aktion'), 'Korrektur erhält Aktionsfehler');

engineFailure = new Error('Simulierter Engine-Fehler');
const engineResult = balanceMain.update();
assert(!engineResult.ok && engineResult.status === 'engine_error', 'Engine failures should return engine_error');
assert(
    document.getElementById('error-container').textContent.includes('Simulierter Engine-Fehler'),
    'Engine error should use the normal UI error path'
);
assertEqual(visibleToastText(), notification, 'Enginefehler und Toast bleiben gleichzeitig sichtbar');
engineFailure = null;

// Reale Import-/Snapshot-/Annualhandler mit echtem Renderer und Main-Debounce.
const actionContainer = document.getElementById('action-error-container');
const scopedEntry = scope => actionContainer.children.find(entry => entry.dataset.scope === scope);
const actionText = scope => scopedEntry(scope)?.children[0].textContent || '';
const inputRefs = Object.fromEntries(document.querySelectorAll('input, select').map(el => [el.id, el]));
const handlerDom = { inputs: inputRefs, outputs: { snapshotList: document.getElementById('snapshotList') },
    controls: {}, expenses: {} };
const imports = createImportExportHandlers({ dom: handlerDom, update: balanceMain.update, debouncedUpdate: () => formCheck.dispatchEvent({ type: 'input', target: inputEl }) });
const importFile = document.getElementById('importFile');
importFile.files = [{ text: async () => '{kein-json' }];
await imports.handleImport({ target: importFile });
const rejectedText = actionText('balance-import');
assert(rejectedText.includes('kein gültiges JSON'), 'Realer Importhandler rendert sichere Ablehnung');
assert(rejectedText.includes('unveränderte Balance-Exportdatei'), 'Ablehnung behält Handlungsoption');
UIRenderer.clearError();
balanceMain.update({ mode: 'preview' });
formCheck.dispatchEvent({ type: 'input', target: inputEl });
await new Promise(resolve => setTimeout(resolve, 310));
assertEqual(actionText('balance-import'), rejectedText, 'Ablehnung überlebt clearError und echte direkte/entprellte Updates');
importFile.files = [];
await imports.handleImport({ target: importFile });
assertEqual(actionText('balance-import'), rejectedText, 'Leere Dateiauswahl löscht den vorherigen Fehler nicht');

// Bereits vorgemerkte Writes des vorigen echten Updates zuerst abschließen.
await PersistenceFacade.flush();
const callsBeforeFiles = simulateCallCount;
const writesBeforeFiles = storageWrites.length;
for (const id of ['importFile', 'csvFileInput', 'expensesCsvInput']) {
    const fileInput = document.getElementById(id);
    fileInput.type = 'file';
    formCheck.dispatchEvent({ type: 'input', target: fileInput });
    formCheck.dispatchEvent({ type: 'change', target: fileInput });
}
await new Promise(resolve => setTimeout(resolve, 310));
assertEqual(simulateCallCount, callsBeforeFiles, 'Reale Main-/Formbindung berechnet für sämtliche Dateievents exakt null Mal');
assertEqual(storageWrites.length, writesBeforeFiles, 'Dateievents schreiben nicht im Hintergrund');

const exportDoc = createBalanceExportDocument(StorageManager.loadState());
const previousReplace = StorageManager.replaceStateFromImport;
const previousRollback = StorageManager.rollbackImportReplace;
const previousRestore = StorageManager.restoreSnapshot;
let replaceCalls = 0;
let rollbackCalls = 0;
try {
    StorageManager.replaceStateFromImport = async () => {
        replaceCalls++;
        assertEqual(actionText('balance-import'), '', 'Neuer Import entfernt seinen alten Fehler vor der Arbeit');
        engineFailure = new Error('Synthetischer UI-Fehler nach Replace');
        return { recoverySnapshotId: 'synthetischer-recovery' };
    };
    StorageManager.rollbackImportReplace = async receipt => {
        assertEqual(receipt.recoverySnapshotId, 'synthetischer-recovery', 'Rollback erhält den bestätigten Recoverypunkt');
        rollbackCalls++;
        engineFailure = null;
    };
    importFile.files = [{ text: async () => JSON.stringify(exportDoc) }];
    await imports.handleImport({ target: importFile });
    const rollbackText = actionText('balance-import');
    assertEqual(replaceCalls, 1, 'Realer Import führt genau ein Replace aus');
    assertEqual(rollbackCalls, 1, 'Realer Import führt genau einen Rollback aus');
    assert(rollbackText.includes('automatisch wiederhergestellt'), 'Realer Rollback rendert seinen unveränderten Recoveryhinweis');
    formCheck.dispatchEvent({ type: 'input', target: inputEl });
    await new Promise(resolve => setTimeout(resolve, 310));
    assertEqual(actionText('balance-import'), rollbackText, 'Rollbackhinweis überlebt den echten Main-Debounce');

    const csvFile = document.getElementById('csvFileInput');
    csvFile.files = [{ text: async () => 'date;close\nungueltig;kaputt' }];
    await imports.handleCsvImport({ target: csvFile });
    const csvText = actionText('market-csv-import');
    assert(csvText.includes('CSV-Import fehlgeschlagen'), 'Realer CSV-Handler rendert seinen eigenen Bereich');
    assertEqual(actionText('balance-import'), rollbackText, 'CSV-Fehler erhält JSON-Fehler');

    let confirmed = false;
    const oldConfirm = globalThis.confirm;
    globalThis.confirm = () => confirmed;
    try {
        StorageManager.restoreSnapshot = async () => { throw new Error('Synthetischer Snapshotfehler'); };
        let startValidation;
        let releaseValidation;
        const validationStarted = new Promise(resolve => { startValidation = resolve; });
        const validationGate = new Promise(resolve => { releaseValidation = resolve; });
        const snapshots = createSnapshotHandlers({ dom: handlerDom, appState: {},
            getTargetYear: () => 2025, getReferenceDate: () => new Date('2026-10-03'),
            getLegacyDecision: () => 'not_committed',
            validateLiveState: async () => {
                startValidation();
                await validationGate;
                return { ok: false, error: new ValidationError([{ fieldId: 'minimumFlexAnnual', message: 'Annual-Vorprüfung' }]) };
            },
            flushLiveState: async () => {}, applyAnnualInflation: () => {} });
        const restoreEvent = { target: { closest: selector => selector === '.restore-snapshot' ? { dataset: { key: 'synthetisch.json' } } : null } };
        UIRenderer.handleActionError(new Error('Vorheriger Snapshotfehler'), 'snapshots');
        await snapshots.handleSnapshotActions(restoreEvent);
        assert(actionText('snapshots').includes('Vorheriger'), 'Abgebrochene Snapshotbestätigung erhält den Fehler');
        confirmed = true;
        await snapshots.handleSnapshotActions(restoreEvent);
        const snapshotText = actionText('snapshots');
        assert(snapshotText.includes('Snapshot-Aktion fehlgeschlagen'), 'Realer Snapshothandler rendert StorageError im Aktionskanal');
        UIRenderer.handleActionError(new Error('Vorheriger Jahresfehler'), 'annual');
        confirmed = false;
        await snapshots.handleJahresabschluss();
        assert(actionText('annual').includes('Vorheriger Jahresfehler'), 'Abgebrochene Jahresbestätigung erhält ihren Fehler');
        confirmed = true;
        const pendingAnnual = snapshots.handleJahresabschluss();
        await validationStarted;
        assertEqual(actionText('annual'), '', 'Angenommener Jahresprozess entfernt vorherigen Jahresfehler');
        UIRenderer.handleActionError(new Error('Fehler während Jahresaktion'), 'annual');
        const reentrant = await snapshots.handleJahresabschluss();
        assertEqual(reentrant.status, 'in_flight', 'Realer Jahresprozess weist Reentranz ab');
        assert(actionText('annual').includes('Fehler während Jahresaktion'), 'Abgewiesene Reentranz löscht keinen Jahresfehler');
        releaseValidation();
        const annualResult = await pendingAnnual;
        assertEqual(annualResult.status, 'invalid', 'Annualvalidierung behält ihren bisherigen Status');
        const annualText = actionText('annual');
        assert(annualText.includes('Annual-Vorprüfung'), 'ValidationError aus echtem Annualhandler gehört zum Aktionskanal');
        assert(!document.getElementById('minimumFlexAnnual').classList.contains('input-error'), 'Annualvalidierung markiert keine Berechnungsfelder');
        UIRenderer.toast('Zeitlicher Nachweis');
        balanceMain.update({ mode: 'preview' });
        formCheck.dispatchEvent({ type: 'input', target: inputEl });
        await new Promise(resolve => setTimeout(resolve, 6100));
        for (const [scope, text] of [['balance-import', rollbackText], ['market-csv-import', csvText], ['snapshots', snapshotText], ['annual', annualText]]) {
            assertEqual(actionText(scope), text, `${scope} überlebt echte Updates und den echten Toastablauf`);
        }
        const callsBeforeClose = simulateCallCount;
        const writesBeforeClose = storageWrites.length;
        const loadStateBeforeClose = StorageManager.loadState;
        const getItemBeforeClose = localStorageMock.getItem;
        let storageReads = 0;
        StorageManager.loadState = (...args) => { storageReads++; return loadStateBeforeClose(...args); };
        localStorageMock.getItem = (...args) => { storageReads++; return getItemBeforeClose(...args); };
        try {
            scopedEntry('balance-import').children[1].dispatchEvent({ type: 'click' });
            await new Promise(resolve => setTimeout(resolve, 310));
            assertEqual(storageReads, 0, 'Schließen greift auch lesend nicht auf den Speicher zu');
        } finally {
            StorageManager.loadState = loadStateBeforeClose;
            localStorageMock.getItem = getItemBeforeClose;
        }
        assertEqual(actionText('balance-import'), '', 'Echter Schließenknopf entfernt seinen Fehler');
        assertEqual(actionText('snapshots'), snapshotText, 'Schließen erhält anderen Bereich');
        await new Promise(resolve => setTimeout(resolve, 310));
        assertEqual(simulateCallCount, callsBeforeClose, 'Schließen verursacht weder direkte noch entprellte Berechnung');
        assertEqual(storageWrites.length, writesBeforeClose, 'Schließen verursacht keinen Speicherzugriff');
    } finally {
        if (oldConfirm === undefined) delete globalThis.confirm;
        else globalThis.confirm = oldConfirm;
    }
} finally {
    engineFailure = null;
    StorageManager.replaceStateFromImport = previousReplace;
    StorageManager.rollbackImportReplace = previousRollback;
    StorageManager.restoreSnapshot = previousRestore;
}

let incompatibleCalls = 0;
global.window.EngineAPI = {
    getVersion: () => ({ api: '30.9', build: 'OLD-BUILD' }),
    simulateSingleYear: () => {
        incompatibleCalls++;
        return {};
    }
};
const writesBeforeBlocked = storageWrites.length;
const blockedResult = balanceMain.update();
assert(
    !blockedResult.ok && blockedResult.status === 'blocked' && blockedResult.reason === 'contract_changed',
    'Incompatible engine should return the contract_changed block reason'
);
assertEqual(incompatibleCalls, 0, 'Incompatible EngineAPI should not execute simulateSingleYear');
assertEqual(storageWrites.length, writesBeforeBlocked, 'Blocked engine update should not persist Balance or profile state');

delete global.window.EngineAPI;
const missingResult = balanceMain.update();
assert(!missingResult.ok && missingResult.status === 'blocked', 'Missing engine should block the update');
assertEqual(storageWrites.length, writesBeforeBlocked, 'Missing engine update should not persist Balance or profile state');

global.window.EngineAPI = compatibleEngine;

console.log("✅ Balance App Smoke Test Completed Successfully.");

} finally {
    // Beendet den echten Toasttimer auch bei fehlgeschlagenen Assertions.
    initUIRenderer(null, null);
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
    for (const [key, descriptor] of Object.entries(savedGlobals)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
    }
}
