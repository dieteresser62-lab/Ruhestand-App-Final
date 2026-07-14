
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
                    // Log listener exceptions if critical for debugging
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
                const type = lowerMatch.includes('type="checkbox"') || lowerMatch.includes("type='checkbox'") ? 'checkbox' : 'text';
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
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;
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
if (simulateCallCount !== 1) {
    throw new Error(`EngineAPI.simulateSingleYear call count: Expected 1, got ${simulateCallCount}`);
}

// Verify Footer
const footer = document.getElementById('print-footer');
if (!footer.textContent.includes("Engine: 31.0")) {
    throw new Error(`Footer text incorrect. Got: '${footer.textContent}'`);
}
if (document.engineScript.src !== 'engine.js') {
    throw new Error(`Engine script source was changed after handshake: ${document.engineScript.src}`);
}

// --- 5. Test Interaction ---
console.log("Testing Input Change Trigger...");

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

if (simulateCallCount !== 2) {
    throw new Error(`EngineAPI.simulateSingleYear call count after input: Expected 2, got ${simulateCallCount}`);
}

console.log("Testing machine-readable update results and fail-closed persistence...");

const successResult = balanceMain.update({ persist: false });
if (!successResult.ok || successResult.status !== 'success') {
    throw new Error(`Successful update returned unexpected result: ${JSON.stringify(successResult)}`);
}

const assertMinimumFlexReject = (rawValue, expectedMessages) => {
    const input = document.getElementById('minimumFlexAnnual');
    input.value = rawValue;
    const validationCallsBefore = simulateCallCount;
    const writesBeforeValidation = storageWrites.length;
    const validationResult = balanceMain.update();
    if (validationResult.ok || validationResult.status !== 'validation_error') {
        throw new Error(`Validation error for ${rawValue || '<leer>'} returned unexpected result: ${JSON.stringify(validationResult)}`);
    }
    if (simulateCallCount !== validationCallsBefore) {
        throw new Error(`Validation error for ${rawValue || '<leer>'} called EngineAPI.simulateSingleYear unexpectedly.`);
    }
    if (storageWrites.length !== writesBeforeValidation) {
        throw new Error(`Validation error for ${rawValue || '<leer>'} persisted data unexpectedly.`);
    }
    if (input.value !== rawValue) {
        throw new Error(`Validation error changed the visible minimumFlexAnnual value from ${rawValue} to ${input.value}.`);
    }
    const messages = validationResult.error?.errors?.map(entry => entry.message) || [];
    expectedMessages.forEach(message => {
        if (!messages.includes(message)) {
            throw new Error(`Validation error for ${rawValue || '<leer>'} misses message: ${message}`);
        }
    });
    if (!document.getElementById('error-container').textContent.includes('Einige Eingaben sind ungültig')) {
        throw new Error('Validation error was not rendered through the normal UI error path.');
    }
};

assertMinimumFlexReject('-1', ['Mindest-Flex p.a. darf nicht negativ sein.']);
assertMinimumFlexReject('', ['Mindest-Flex p.a. darf nicht leer sein.']);
assertMinimumFlexReject('Infinity', ['Mindest-Flex p.a. muss eine endliche Zahl sein.']);
assertMinimumFlexReject('24001', [
    'Mindest-Flex p.a. darf nicht größer als Flex-Bedarf p.a. sein.',
    'Flex-Bedarf p.a. ist die Obergrenze für Mindest-Flex.'
]);
document.getElementById('minimumFlexAnnual').value = '0';

engineFailure = new Error('Simulierter Engine-Fehler');
const engineResult = balanceMain.update();
if (engineResult.ok || engineResult.status !== 'engine_error') {
    throw new Error(`Engine error returned unexpected result: ${JSON.stringify(engineResult)}`);
}
if (!document.getElementById('error-container').textContent.includes('Simulierter Engine-Fehler')) {
    throw new Error('Engine error was not rendered through the normal UI error path.');
}
engineFailure = null;

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
if (blockedResult.ok || blockedResult.status !== 'blocked' || blockedResult.reason !== 'contract_changed') {
    throw new Error(`Incompatible engine returned unexpected result: ${JSON.stringify(blockedResult)}`);
}
if (incompatibleCalls !== 0) {
    throw new Error('Incompatible EngineAPI.simulateSingleYear was called.');
}
if (storageWrites.length !== writesBeforeBlocked) {
    throw new Error('Blocked engine update wrote Balance or profile state.');
}

delete global.window.EngineAPI;
const missingResult = balanceMain.update();
if (missingResult.ok || missingResult.status !== 'blocked') {
    throw new Error(`Missing engine returned unexpected result: ${JSON.stringify(missingResult)}`);
}
if (storageWrites.length !== writesBeforeBlocked) {
    throw new Error('Missing engine update wrote Balance or profile state.');
}

global.window.EngineAPI = compatibleEngine;

console.log("✅ Balance App Smoke Test Completed Successfully.");

// Restore console
console.error = originalConsoleError;
console.info = originalConsoleInfo;
