
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
const localStorageMock = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
    key: () => null,
    length: 0
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
global.window.EngineAPI = {
    getVersion: () => ({ api: "1.0.0", build: "TEST-BUILD" }),
    getConfig: () => ({
        THRESHOLDS: {
            STRATEGY: { cashRebalanceThreshold: 2500 },
            ALARM: { withdrawalRate: 0.055, realDrawdown: 0.25 },
            CAUTION: { withdrawalRate: 0.045 }
        }
    }),
    simulateSingleYear: (input, lastState) => {
        simulateCallCount++;
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

try {
    await import(moduleUrl);
} catch (e) {
    originalConsoleError("Failed to import module:", e);
    throw e;
}
// --- 3. Trigger Init ---
console.log("Triggering Application Init via DOMContentLoaded...");

// Pre-fill critical inputs to pass validation in update()
document.getElementById('aktuellesAlter').value = "65";
document.getElementById('floorBedarf').value = "30000";

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
if (!footer.textContent.includes("Engine: 1.0.0")) {
    throw new Error(`Footer text incorrect. Got: '${footer.textContent}'`);
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

console.log("✅ Balance App Smoke Test Completed Successfully.");

// Restore console
console.error = originalConsoleError;
console.info = originalConsoleInfo;
