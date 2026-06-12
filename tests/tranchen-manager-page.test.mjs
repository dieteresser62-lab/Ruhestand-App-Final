import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initTranchenManagerPage } from '../app/tranches/tranchen-manager-page.js';
import { PersistenceFacade, persistenceStorage } from '../app/shared/persistence-facade.js';

const __filename = fileURLToPath(import.meta.url);

class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    add(name) { this.classes.add(name); }
    remove(name) { this.classes.delete(name); }
    contains(name) { return this.classes.has(name); }
}

class MockElement {
    constructor(id = '', tagName = 'div') {
        this.id = id;
        this.tagName = String(tagName).toUpperCase();
        this.value = '';
        this.textContent = '';
        this.innerHTML = '';
        this.checked = false;
        this.type = '';
        this.dataset = {};
        this.style = { display: '' };
        this.listeners = {};
        this.children = [];
        this.classList = new MockClassList();
    }
    addEventListener(type, handler) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(handler);
    }
    appendChild(child) {
        this.children.push(child);
        return child;
    }
    click() {
        (this.listeners.click || []).forEach(handler => handler({ target: this, preventDefault() {} }));
    }
    closest(selector) {
        if (selector === '[data-action]' && this.dataset.action) return this;
        return null;
    }
}

class MockDocument {
    constructor() {
        this.elements = new Map();
        this.created = [];
    }
    createElement(tagName) {
        const element = new MockElement('', tagName);
        this.created.push(element);
        return element;
    }
    register(element) {
        this.elements.set(element.id, element);
        return element;
    }
    getElementById(id) {
        return this.elements.get(id) || null;
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

const profileInputIds = [
    'profileTagesgeld',
    'profileAlter',
    'profileRenteMonatlich',
    'profileSonstigeEinkuenfte',
    'profileGoldAktiv',
    'profileGoldZiel',
    'profileGoldFloor',
    'profileGoldBand',
    'profileGoldSteuerfrei',
    'profileHealthBucketEnabled',
    'profileHealthBucketInitialAmount',
    'profileHealthBucketAssetSource',
    'profileHealthBucketTriggerMinGrade',
    'profileHealthBucketTriggerMode',
    'profileHealthBucketCoverageMode',
    'profileHealthBucketReturnMode',
    'profileHealthBucketTargetMode'
];

function createTranchenPageDom() {
    const doc = new MockDocument();
    [
        'activeProfileName',
        'stats',
        'tranchenTable',
        'priceUpdateStatus',
        'modalTitle',
        'trancheModal',
        'trancheForm',
        'name',
        'isin',
        'ticker',
        'shares',
        'purchasePrice',
        'currentPrice',
        'purchaseDate',
        'category',
        'type',
        'tqf',
        'notes'
    ].forEach(id => doc.register(new MockElement(id)));
    [
        'addTrancheBtn',
        'updatePricesBtn',
        'proxyHealthBtn',
        'exportTranchesBtn',
        'importTranchesBtn',
        'clearTranchesBtn',
        'closeTrancheModalBtn'
    ].forEach(id => doc.register(new MockElement(id, 'button')));
    profileInputIds.forEach(id => {
        const tagName = id.includes('Aktiv') || id.includes('Steuerfrei') || id.includes('Mode') || id.includes('Source') || id.includes('Enabled') ? 'select' : 'input';
        doc.register(new MockElement(id, tagName));
    });
    return doc;
}

function installGlobals(documentRef, storageRef) {
    global.document = documentRef;
    global.window = { tranchen: null, localStorage: storageRef };
    global.localStorage = storageRef;
    global.confirm = () => true;
    global.alert = () => {};
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

const previousGlobals = {
    document: global.document,
    window: global.window,
    localStorage: global.localStorage,
    confirm: global.confirm,
    alert: global.alert,
    URL: global.URL,
    Blob: global.Blob
};

function shouldRun() {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
    const requestedTest = process.argv[2] ? path.resolve(process.argv[2]) : '';
    return entry === __filename
        || (entry.endsWith(`${path.sep}run-single.mjs`) && requestedTest === __filename);
}

async function runTranchenManagerPageTests() {
    console.log('--- Tranchen Manager Page Tests ---');

    console.log('Test 1: page initializes empty storage without crashing');
    {
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();

        initTranchenManagerPage();
        await PersistenceFacade.flush();

        assertEqual(window.tranchen.length, 0, 'Empty storage should expose empty tranche list');
        assert(doc.getElementById('tranchenTable').innerHTML.includes('Keine Tranchen vorhanden'), 'Empty state should be rendered');
        assert(doc.getElementById('stats').innerHTML.includes('Anzahl Tranchen'), 'Stats container should be rendered');
    }
    console.log('✓ empty storage initialization OK');

    console.log('Test 2: page initializes valid storage and preserves local data when price service is offline');
    {
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();
        persistenceStorage.setItem('depot_tranchen', JSON.stringify([{
            trancheId: 't1',
            name: 'ETF',
            ticker: 'ETF',
            shares: 10,
            purchasePrice: 100,
            currentPrice: 120,
            category: 'equity',
            type: 'aktien_neu'
        }]));
        persistenceStorage.setItem('profile_tagesgeld', '12345');

        const previousFetch = global.fetch;
        global.fetch = async () => {
            throw new Error('offline');
        };
        try {
            initTranchenManagerPage();
            await doc.getElementById('updatePricesBtn').listeners.click[0]();
            await PersistenceFacade.flush();
        } finally {
            if (previousFetch === undefined) delete global.fetch; else global.fetch = previousFetch;
        }

        assertEqual(window.tranchen.length, 1, 'Valid storage should load one tranche');
        assertEqual(window.tranchen[0].currentPrice, 120, 'Offline price update must preserve existing local price');
        assert(doc.getElementById('priceUpdateStatus').textContent.includes('fehlgeschlagen'), 'Offline update should render degraded status');
        assertEqual(doc.getElementById('profileTagesgeld').value, 12345, 'Profile values should be applied to DOM');
    }
    console.log('✓ valid storage and offline price degradation OK');

    console.log('Test 3: page initializes corrupt tranche storage as empty state');
    {
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();
        persistenceStorage.setItem('depot_tranchen', '{bad json');

        initTranchenManagerPage();
        await PersistenceFacade.flush();

        assertEqual(window.tranchen.length, 0, 'Corrupt tranche storage should fall back to empty list');
        assertEqual(persistenceStorage.getItem('depot_tranchen'), '[]', 'Corrupt storage should be normalized after init');
        assert(doc.getElementById('tranchenTable').innerHTML.includes('Keine Tranchen vorhanden'), 'Corrupt storage should render empty state');
    }
    console.log('✓ corrupt storage initialization OK');

    console.log('✅ Tranchen manager page contract validated');
    console.log('--- Tranchen Manager Page Tests Completed ---');
}

if (shouldRun()) {
    try {
        await runTranchenManagerPageTests();
    } finally {
        PersistenceFacade.resetPersistenceForTests();
        Object.entries(previousGlobals).forEach(([key, value]) => {
            if (value === undefined) delete global[key];
            else global[key] = value;
        });
    }
}
