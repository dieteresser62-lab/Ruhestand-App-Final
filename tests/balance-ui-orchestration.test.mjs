import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UIBinder, initUIBinder } from '../app/balance/balance-binder.js';
import { createImportExportHandlers } from '../app/balance/balance-binder-imports.js';
import { createProfilverbundHandlers } from '../app/balance/balance-main-profilverbund.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { UIRenderer } from '../app/balance/balance-renderer.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import { PersistenceFacade } from '../app/shared/persistence-facade.js';

const __filename = fileURLToPath(import.meta.url);

class MockClassList {
    constructor() {
        this.classes = new Set();
    }

    add(name) {
        this.classes.add(name);
    }

    remove(name) {
        this.classes.delete(name);
    }

    contains(name) {
        return this.classes.has(name);
    }

    toggle(name, force) {
        const shouldAdd = force === undefined ? !this.classes.has(name) : Boolean(force);
        if (shouldAdd) this.classes.add(name);
        else this.classes.delete(name);
        return shouldAdd;
    }
}

class MockElement {
    constructor(id = '', tagName = 'div') {
        this.id = id;
        this.tagName = String(tagName).toUpperCase();
        this.value = '';
        this.textContent = '';
        this.innerText = '';
        this.innerHTML = '';
        this.checked = false;
        this.disabled = false;
        this.style = { display: '' };
        this.dataset = {};
        this.type = '';
        this.listeners = {};
        this.children = [];
        this.parentNode = null;
        this.classList = new MockClassList();
    }

    addEventListener(type, handler) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(handler);
    }

    removeEventListener(type, handler) {
        this.listeners[type] = (this.listeners[type] || []).filter(existing => existing !== handler);
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    replaceChild(nextChild, oldChild) {
        const index = this.children.indexOf(oldChild);
        if (index >= 0) this.children[index] = nextChild;
        nextChild.parentNode = this;
        oldChild.parentNode = null;
        return oldChild;
    }

    cloneNode() {
        const clone = new MockElement(this.id, this.tagName);
        clone.value = this.value;
        clone.textContent = this.textContent;
        clone.innerText = this.innerText;
        clone.innerHTML = this.innerHTML;
        clone.checked = this.checked;
        clone.disabled = this.disabled;
        clone.style = { ...this.style };
        clone.dataset = { ...this.dataset };
        clone.type = this.type;
        return clone;
    }

    click() {
        (this.listeners.click || []).forEach(handler => handler({ target: this, preventDefault() {} }));
    }

    matches(selector) {
        return selector === '.btn-apply-inflation' && this.classList.contains('btn-apply-inflation');
    }

    closest(selector) {
        if (selector === '.tab-btn' && this.classList.contains('tab-btn')) return this;
        if (selector === '.restore-snapshot' && this.classList.contains('restore-snapshot')) return this;
        if (selector === '.delete-snapshot' && this.classList.contains('delete-snapshot')) return this;
        return null;
    }

    querySelector(selector) {
        if (selector === '.active') {
            return this.children.find(child => child.classList.contains('active')) || null;
        }
        if (selector === '.modal-close') {
            return this.children.find(child => child.classList.contains('modal-close')) || null;
        }
        if (selector === '.modal-overlay') {
            return this.children.find(child => child.classList.contains('modal-overlay')) || null;
        }
        return null;
    }

    querySelectorAll() {
        return [];
    }
}

class MockDocument {
    constructor() {
        this.elements = new Map();
        this.listeners = {};
        this.visibilityState = 'visible';
    }

    createElement(tagName) {
        return new MockElement('', tagName);
    }

    createDocumentFragment() {
        return new MockElement('fragment', 'fragment');
    }

    createTextNode(text) {
        const node = new MockElement('', 'text');
        node.textContent = String(text);
        return node;
    }

    register(element) {
        this.elements.set(element.id, element);
        return element;
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    querySelectorAll(selector) {
        if (selector === 'input.currency') {
            return Array.from(this.elements.values()).filter(el => el.classList.contains('currency'));
        }
        if (selector === '.profilverbund-toggle-target') {
            return Array.from(this.elements.values()).filter(el => el.classList.contains('profilverbund-toggle-target'));
        }
        return [];
    }

    querySelector() {
        return null;
    }

    addEventListener(type, handler) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(handler);
    }

    removeEventListener(type, handler) {
        this.listeners[type] = (this.listeners[type] || []).filter(existing => existing !== handler);
    }
}

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: key => (store.has(String(key)) ? store.get(String(key)) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: key => { store.delete(String(key)); },
        clear: () => { store.clear(); },
        key: index => Array.from(store.keys())[index] || null,
        get length() { return store.size; }
    };
}

function createDomRefs(documentRef) {
    const tabButtons = documentRef.register(new MockElement('tabButtons'));
    const activeTab = new MockElement('tab-overview-button', 'button');
    activeTab.classList.add('active');
    tabButtons.appendChild(activeTab);

    const tabPanel = documentRef.register(new MockElement('tab-overview'));
    tabPanel.classList.add('active');

    const modal = documentRef.register(new MockElement('updateResultModal'));
    const closeX = new MockElement('modalCloseX', 'button');
    closeX.classList.add('modal-close');
    const overlay = new MockElement('modalOverlay');
    overlay.classList.add('modal-overlay');
    modal.appendChild(closeX);
    modal.appendChild(overlay);

    const form = documentRef.register(new MockElement('input-form-container'));
    const currencyInput = documentRef.register(new MockElement('currencyInput', 'input'));
    currencyInput.classList.add('currency');

    const controls = {
        resetBtn: documentRef.register(new MockElement('resetBtn', 'button')),
        copyAction: documentRef.register(new MockElement('copyAction', 'button')),
        btnJahresUpdate: documentRef.register(new MockElement('btnJahresUpdate', 'button')),
        btnJahresUpdateLog: documentRef.register(new MockElement('btnJahresUpdateLog', 'button')),
        btnNachruecken: documentRef.register(new MockElement('btnNachruecken', 'button')),
        btnUndoNachruecken: documentRef.register(new MockElement('btnUndoNachruecken', 'button')),
        importBtn: documentRef.register(new MockElement('importBtn', 'button')),
        importFile: documentRef.register(new MockElement('importFile', 'input')),
        btnCsvImport: documentRef.register(new MockElement('btnCsvImport', 'button')),
        csvFileInput: documentRef.register(new MockElement('csvFileInput', 'input')),
        jahresabschlussBtn: documentRef.register(new MockElement('jahresabschlussBtn', 'button')),
        connectFolderBtn: documentRef.register(new MockElement('connectFolderBtn', 'button')),
        snapshotStatus: documentRef.register(new MockElement('snapshotStatus'))
    };

    const diagnosis = {
        drawer: documentRef.register(new MockElement('diagnosisDrawer')),
        overlay: documentRef.register(new MockElement('diagnosisOverlay')),
        openBtn: documentRef.register(new MockElement('diagnosisOpen', 'button')),
        closeBtn: documentRef.register(new MockElement('diagnosisClose', 'button')),
        copyBtn: documentRef.register(new MockElement('diagnosisCopy', 'button')),
        filterToggle: documentRef.register(new MockElement('diagnosisFilter', 'input')),
        content: documentRef.register(new MockElement('diagnosisContent'))
    };

    documentRef.register(new MockElement('handlungContent')).innerText = 'Aktion';
    documentRef.register(new MockElement('modalTitle'));
    documentRef.register(new MockElement('modalResults'));
    documentRef.register(new MockElement('modalDuration'));
    const modalCloseBtn = documentRef.register(new MockElement('modalCloseBtn', 'button'));
    modal.appendChild(modalCloseBtn);

    return {
        inputs: {
            profilName: documentRef.register(new MockElement('profilName', 'input')),
            tagesgeld: documentRef.register(new MockElement('tagesgeld', 'input')),
            renteAktiv: documentRef.register(new MockElement('renteAktiv', 'select')),
            renteMonatlich: documentRef.register(new MockElement('renteMonatlich', 'input')),
            fixedIncomeAnnual: documentRef.register(new MockElement('fixedIncomeAnnual', 'input')),
            aktuellesAlter: documentRef.register(new MockElement('aktuellesAlter', 'input'))
        },
        outputs: {
            snapshotList: documentRef.register(new MockElement('snapshotList'))
        },
        controls,
        containers: {
            form,
            tabButtons,
            tabPanels: [tabPanel],
            bedarfAnpassung: documentRef.register(new MockElement('bedarfAnpassung'))
        },
        diagnosis
    };
}

function installBrowserGlobals(documentRef, localStorageRef) {
    global.document = documentRef;
    global.window = {
        addEventListener() {},
        removeEventListener() {},
        localStorage: localStorageRef
    };
    global.localStorage = localStorageRef;
    Object.defineProperty(global, 'navigator', {
        configurable: true,
        value: {
        clipboard: {
            writeText: async () => true
        }
        }
    });
    global.location = { reload() {} };
    global.confirm = () => true;
    global.HTMLInputElement = MockElement;
    global.URL = {
        createObjectURL: () => 'blob:test',
        revokeObjectURL: () => {}
    };
    global.Blob = class {
        constructor(parts, options) {
            this.parts = parts;
            this.options = options;
        }
    };
}

const prevDocument = global.document;
const prevWindow = global.window;
const prevLocalStorage = global.localStorage;
const prevNavigatorDescriptor = Object.getOwnPropertyDescriptor(global, 'navigator');
const prevLocation = global.location;
const prevConfirm = global.confirm;
const prevHTMLInputElement = global.HTMLInputElement;
const prevURL = global.URL;
const prevBlob = global.Blob;
const prevToast = UIRenderer.toast;
const prevHandleError = UIRenderer.handleError;
const prevLoadState = StorageManager.loadState;
const prevSaveState = StorageManager.saveState;
const prevResetState = StorageManager.resetState;
const prevConnectFolder = StorageManager.connectFolder;

async function runBalanceUiOrchestrationTests() {
    console.log('--- Balance UI Orchestration Tests ---');

    console.log('Test 1: UIBinder binds controls only once and tolerates optional import/export controls');
    {
        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();

        let updateCalls = 0;
        let debouncedCalls = 0;
        StorageManager.loadState = () => ({ inputs: {} });
        StorageManager.saveState = () => {};
        StorageManager.resetState = () => {};
        StorageManager.connectFolder = () => {};

        const dom = createDomRefs(documentRef);
        delete dom.controls.exportBtn;
        initUIBinder(dom, { snapshotHandle: null }, () => { updateCalls += 1; }, () => { debouncedCalls += 1; });

        UIBinder.bindUI();
        UIBinder.bindUI();

        assertEqual((documentRef.listeners.keydown || []).length, 1, 'Keyboard shortcut listener wird nur einmal gebunden');
        assertEqual((dom.containers.form.listeners.input || []).length, 1, 'Form-Input listener wird nur einmal gebunden');
        assertEqual((dom.controls.btnJahresUpdate.listeners.click || []).length, 1, 'Jahresupdate listener wird nur einmal gebunden');
        assertEqual((dom.controls.importBtn.listeners.click || []).length, 1, 'Import-Button listener bleibt trotz optionalem Export eindeutig');

        dom.containers.form.listeners.input[0]({ target: { id: 'floorBedarf' } });
        assertEqual(debouncedCalls, 1, 'Ein Input-Event loest genau einen debounced Update aus');
        assertEqual(updateCalls, 0, 'Input-Event loest keinen direkten Update-Pfad aus');
    }

    console.log('Test 2: Profilverbund init binds profile controls once');
    {
        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();

        const modeSelect = documentRef.register(new MockElement('profilverbund-withdrawal-mode', 'select'));
        const profileList = documentRef.register(new MockElement('profilverbund-profile-list'));

        const handlers = createProfilverbundHandlers({
            dom: { inputs: {} },
            PROFILVERBUND_STORAGE_KEYS: { mode: 'profilverbund_mode_test' }
        });

        handlers.initProfilverbundBalance();
        handlers.initProfilverbundBalance();

        assertEqual((modeSelect.listeners.change || []).length, 1, 'Profilverbund-Modus wird nur einmal gebunden');
        assertEqual((profileList.listeners.change || []).length, 1, 'Profilverbund-Profilliste wird nur einmal gebunden');
    }

    console.log('Test 3: JSON and CSV import failures report through UI error feedback');
    {
        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();

        const errors = [];
        UIRenderer.handleError = error => { errors.push(error); };
        UIRenderer.toast = () => {};
        StorageManager.saveState = () => {};
        StorageManager.loadState = () => ({ inputs: {} });

        const dom = createDomRefs(documentRef);
        const handlers = createImportExportHandlers({
            dom,
            update: () => {},
            debouncedUpdate: () => {}
        });

        const badJsonTarget = {
            files: [{ text: async () => '{bad json' }],
            value: 'selected'
        };
        await handlers.handleImport({ target: badJsonTarget });

        const badCsvTarget = {
            files: [{ text: async () => 'date;open;high;low;close\nungueltig;;;;' }],
            value: 'selected'
        };
        await handlers.handleCsvImport({ target: badCsvTarget });

        assertEqual(errors.length, 2, 'Import- und CSV-Fehler werden ueber handleError gemeldet');
        assert(errors[0].message.includes('Import fehlgeschlagen'), 'JSON-Import meldet nutzerfaehigen Fehlertext');
        assert(errors[1].message.includes('CSV-Import fehlgeschlagen'), 'CSV-Import meldet nutzerfaehigen Fehlertext');
        assertEqual(badJsonTarget.value, '', 'JSON-Dateiauswahl wird nach Fehler zurueckgesetzt');
        assertEqual(badCsvTarget.value, '', 'CSV-Dateiauswahl wird nach Fehler zurueckgesetzt');
    }

    console.log('Test 4: Profilverbund globals are set and cleared without stale data');
    {
        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();
        localStorageRef.setItem('profilverbund_mode_test', 'tax_optimized');

        const handlers = createProfilverbundHandlers({
            dom: { inputs: {} },
            PROFILVERBUND_STORAGE_KEYS: { mode: 'profilverbund_mode_test' }
        });
        const inputData = {
            floorBedarf: 40000,
            flexBedarf: 10000,
            flexBudgetAnnual: 0,
            flexBudgetYears: 0,
            flexBudgetRecharge: 0
        };
        const profiles = [{
            profileId: 'a',
            name: 'A',
            inputs: {
                tagesgeld: 50000,
                geldmarktEtf: 10000,
                depotwertAlt: 120000,
                depotwertNeu: 80000,
                costBasisAlt: 100000,
                costBasisNeu: 70000,
                goldWert: 30000,
                goldCost: 25000,
                renteAktiv: true,
                renteMonatlich: 1000
            },
            tranches: []
        }];

        handlers.updateProfilverbundGlobals(profiles, inputData);

        assertEqual(inputData.tagesgeld, 50000, 'Profilverbund schreibt aggregiertes Tagesgeld in Inputdaten');
        assertEqual(inputData.renteAktiv, true, 'Profilverbund aktiviert Rente bei positiver Profilrente');
        assert(window.__profilverbundDistribution?.items?.length === 1, 'Profilverbund-Verteilung wird gesetzt');
        assert(window.__profilverbundProfileSummaries?.length === 1, 'Profilverbund-Profilzusammenfassung wird gesetzt');

        handlers.updateProfilverbundGlobals([], inputData);

        assertEqual(window.__profilverbundDistribution, null, 'Leerer Profilverbund loescht alte Distribution');
        assertEqual(window.__profilverbundProfileSummaries, null, 'Leerer Profilverbund loescht alte Profilzusammenfassung');
    }

    console.log('Balance UI orchestration tests passed');
    console.log('--- Balance UI Orchestration Tests Completed ---');
}

function shouldRun() {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
    const requestedTest = process.argv[2] ? path.resolve(process.argv[2]) : '';
    return entry === __filename
        || (entry.endsWith(`${path.sep}run-single.mjs`) && requestedTest === __filename);
}

const runRequested = shouldRun();

if (runRequested) {
    try {
        await runBalanceUiOrchestrationTests();
    } finally {
        if (prevLoadState === undefined) delete StorageManager.loadState; else StorageManager.loadState = prevLoadState;
        if (prevSaveState === undefined) delete StorageManager.saveState; else StorageManager.saveState = prevSaveState;
        if (prevResetState === undefined) delete StorageManager.resetState; else StorageManager.resetState = prevResetState;
        if (prevConnectFolder === undefined) delete StorageManager.connectFolder; else StorageManager.connectFolder = prevConnectFolder;
        UIRenderer.toast = prevToast;
        UIRenderer.handleError = prevHandleError;
        if (prevBlob === undefined) delete global.Blob; else global.Blob = prevBlob;
        if (prevURL === undefined) delete global.URL; else global.URL = prevURL;
        if (prevHTMLInputElement === undefined) delete global.HTMLInputElement; else global.HTMLInputElement = prevHTMLInputElement;
        if (prevConfirm === undefined) delete global.confirm; else global.confirm = prevConfirm;
        if (prevLocation === undefined) delete global.location; else global.location = prevLocation;
        if (prevNavigatorDescriptor) Object.defineProperty(global, 'navigator', prevNavigatorDescriptor);
        else delete global.navigator;
        if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
        if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
        if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
        PersistenceFacade.resetPersistenceForTests();
    }
}
