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
        this.disabled = false;
        this.hidden = false;
        this.type = '';
        this.dataset = {};
        this.style = { display: '' };
        this.listeners = {};
        this.children = [];
        this.attributes = new Map();
        this.options = [];
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
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    focus() { if (global.document) global.document.activeElement = this; }
    querySelectorAll() { return []; }
    async click() {
        const results = (this.listeners.click || []).map(handler => handler({ target: this, preventDefault() {} }));
        await Promise.all(results);
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
        this.listeners = {};
        this.visibilityState = 'visible';
        this.activeElement = null;
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
    addEventListener(type, handler) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(handler);
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
        'managerBackLink',
        'stats',
        'tranchenTable',
        'priceUpdateStatus',
        'tranchePersistenceStatus',
        'profileValidationStatus',
        'trancheRecoveryActions',
        'corruptPayloadPreview',
        'modalTitle',
        'trancheModal',
        'trancheForm',
        'trancheFormError',
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
        'clearTranchesBtn',
        'closeTrancheModalBtn',
        'revealCorruptPayloadBtn',
        'copyCorruptPayloadBtn',
        'resetCorruptPayloadBtn',
        'retryTrancheLoadBtn',
        'retryTrancheSaveBtn'
    ].forEach(id => doc.register(new MockElement(id, 'button')));
    profileInputIds.forEach(id => {
        const tagName = id.includes('Aktiv') || id.includes('Steuerfrei') || id.includes('Mode') || id.includes('Source') || id.includes('Enabled') ? 'select' : 'input';
        doc.register(new MockElement(id, tagName));
    });
    doc.getElementById('category').value = 'equity';
    doc.getElementById('type').value = 'aktien_neu';
    doc.getElementById('type').options = ['aktien_alt', 'aktien_neu', 'anleihe', 'geldmarkt', 'gold']
        .map(value => ({ value, disabled: false, hidden: false }));
    return doc;
}

async function waitFor(predicate, message, timeoutMs = 1500) {
    const started = Date.now();
    while (!predicate()) {
        if (Date.now() - started > timeoutMs) throw new Error(message);
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}

function installGlobals(documentRef, storageRef) {
    global.document = documentRef;
    global.window = {
        tranchen: null,
        localStorage: storageRef,
        location: {
            reloadCount: 0,
            reload() { this.reloadCount += 1; }
        }
    };
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

        await initTranchenManagerPage();
        await PersistenceFacade.flush();

        assertEqual(window.tranchen.length, 0, 'Empty storage should expose empty tranche list');
        assert(doc.getElementById('tranchenTable').innerHTML.includes('Keine Tranchen vorhanden'), 'Empty state should be rendered');
        assert(doc.getElementById('stats').innerHTML.includes('Anzahl Tranchen'), 'Stats container should be rendered');
        assertEqual(persistenceStorage.getItem('depot_tranchen'), null, 'Pure empty load must not create a tranche key');
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
            type: 'aktien_neu',
            tqf: 0.3
        }]));
        persistenceStorage.setItem('profile_tagesgeld', '12345');

        const previousFetch = global.fetch;
        global.fetch = async () => {
            throw new Error('offline');
        };
        try {
            await initTranchenManagerPage();
            await doc.getElementById('updatePricesBtn').listeners.click[0]();
            await PersistenceFacade.flush();
        } finally {
            if (previousFetch === undefined) delete global.fetch; else global.fetch = previousFetch;
        }

        assertEqual(window.tranchen.length, 1, 'Valid storage should load one tranche');
        assertEqual(window.tranchen[0].currentPrice, 120, 'Offline price update must preserve existing local price');
        assert(doc.getElementById('priceUpdateStatus').textContent.includes('fehlgeschlagen'), 'Offline update should render degraded status');
        assertEqual(doc.getElementById('profileTagesgeld').value, 12345, 'Profile values should be applied to DOM');
        assert(doc.getElementById('activeProfileName').textContent.includes('(default)'), 'Loaded profile label should include actual id');
    }
    console.log('✓ valid storage and offline price degradation OK');

    console.log('Test 3: corrupt storage remains untouched until explicit recovery');
    {
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();

        const corruptRaw = '{bad json';
        persistenceStorage.setItem('depot_tranchen', corruptRaw);

        await initTranchenManagerPage();
        await PersistenceFacade.flush();

        assertEqual(window.tranchen.length, 0, 'Corrupt profile must not expose processable tranches');
        assert(persistenceStorage.getItem('depot_tranchen') === corruptRaw, 'Corrupt storage must remain byte-for-byte unchanged');
        assertEqual(doc.getElementById('trancheRecoveryActions').hidden, false, 'Corrupt state should expose reviewed recovery actions');
        assertEqual(doc.getElementById('retryTrancheLoadBtn').hidden, true, 'Corrupt state should not use unavailable retry');
        assertEqual(doc.getElementById('addTrancheBtn').disabled, true, 'Corrupt state should block normal processing');
        assertEqual(doc.getElementById('corruptPayloadPreview').hidden, true, 'Raw payload must not be shown automatically');
        assertEqual(doc.getElementById('corruptPayloadPreview').textContent, '', 'Raw payload must not enter DOM before local action');

        await doc.getElementById('revealCorruptPayloadBtn').click();
        assert(doc.getElementById('corruptPayloadPreview').textContent === corruptRaw, 'Explicit reveal should show unchanged raw payload');

        await doc.getElementById('resetCorruptPayloadBtn').click();
        assertEqual(persistenceStorage.getItem('depot_tranchen'), '[]', 'Explicit confirmed reset should persist an empty override');
        assertEqual(doc.getElementById('trancheRecoveryActions').hidden, true, 'Successful reset should leave recovery mode');
    }
    console.log('✓ corrupt storage recovery contract OK');

    console.log('Test 4: unavailable reload preserves last confirmed state and listeners');
    {
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();
        persistenceStorage.setItem('depot_tranchen', JSON.stringify([{
            trancheId: 'confirmed',
            name: 'Confirmed',
            shares: 1,
            purchasePrice: 100,
            currentPrice: 100,
            category: 'equity',
            type: 'aktien_neu',
            tqf: 0.3
        }]));

        await initTranchenManagerPage({ profileId: 'default' });
        const listenerCount = doc.getElementById('addTrancheBtn').listeners.click.length;
        await initTranchenManagerPage({
            profileId: 'default',
            loader: () => ({ status: 'unavailable', tranches: null, raw: null })
        });

        assertEqual(window.tranchen.length, 1, 'Unavailable reload should retain last confirmed visible state');
        assertEqual(window.tranchen[0].trancheId, 'confirmed', 'Unavailable reload must not switch profile data');
        assertEqual(doc.getElementById('retryTrancheLoadBtn').hidden, false, 'Unavailable state should expose retry');
        assertEqual(doc.getElementById('trancheRecoveryActions').hidden, true, 'Unavailable state must not expose reset');
        assertEqual(doc.getElementById('addTrancheBtn').listeners.click.length, listenerCount, 'Repeated init must not duplicate listeners');

        doc.visibilityState = 'hidden';
        doc.listeners.visibilitychange[0]();
        doc.visibilityState = 'visible';
        doc.listeners.visibilitychange[0]();
        assertEqual(window.location.reloadCount, 1, 'Return from another tab should reload manager context once');
    }
    console.log('✓ unavailable and lifecycle contract OK');

    console.log('Test 5: failed flush keeps confirmed state and supports retry');
    {
        const initialRaw = JSON.stringify([{
            trancheId: 'persisted',
            schemaVersion: 1,
            name: 'Persisted',
            isin: '',
            ticker: '',
            shares: 1,
            purchasePrice: 100,
            currentPrice: 100,
            purchaseDate: '',
            category: 'equity',
            type: 'aktien_neu',
            tqf: 0.3,
            notes: '',
            costBasis: 100,
            marketValue: 100,
            gainLoss: 0,
            gainLossPct: 0
        }]);
        const adapterStore = new Map([['depot_tranchen', initialRaw]]);
        let failSave = true;
        const adapter = {
            name: 'retry-memory',
            async open() {},
            async loadAll() { return Object.fromEntries(adapterStore); },
            async saveBatch(batch) {
                if (failSave) throw new Error('offline');
                batch.deletes.forEach(key => adapterStore.delete(key));
                batch.upserts.forEach(([key, value]) => adapterStore.set(key, String(value)));
            }
        };
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests(adapter);
        await PersistenceFacade.init();

        await initTranchenManagerPage({ profileId: 'default' });
        await doc.getElementById('clearTranchesBtn').click();

        assertEqual(window.tranchen.length, 1, 'Flush rejection should keep confirmed tranche visible');
        assertEqual(adapterStore.get('depot_tranchen'), initialRaw, 'Flush rejection must not change confirmed adapter state');
        assertEqual(doc.getElementById('retryTrancheSaveBtn').hidden, false, 'Flush rejection should expose retry');
        assert(!doc.getElementById('tranchePersistenceStatus').textContent.includes('dauerhaft gelöscht'), 'Flush rejection must not report success');

        failSave = false;
        await doc.getElementById('retryTrancheSaveBtn').click();
        assertEqual(window.tranchen.length, 0, 'Successful retry should apply pending delete');
        assertEqual(adapterStore.get('depot_tranchen'), '[]', 'Successful retry should durably persist empty state');
        assertEqual(doc.getElementById('retryTrancheSaveBtn').hidden, true, 'Successful retry should clear pending action');

        failSave = true;
        doc.getElementById('profileTagesgeld').value = '777';
        doc.getElementById('profileTagesgeld').listeners.input[0]();
        await waitFor(
            () => doc.getElementById('retryTrancheSaveBtn').hidden === false,
            'Debounced profile flush rejection should expose retry'
        );
        assertEqual(doc.getElementById('profileTagesgeld').value, 0, 'Profile flush rejection should restore confirmed visible value');
        assertEqual(adapterStore.has('profile_tagesgeld'), false, 'Profile flush rejection must not change adapter state');
        assertEqual(doc.getElementById('retryTrancheSaveBtn').hidden, false, 'Profile flush rejection should expose retry');

        failSave = false;
        await doc.getElementById('retryTrancheSaveBtn').click();
        assertEqual(adapterStore.get('profile_tagesgeld'), '777', 'Profile retry should durably persist pending value');
        assertEqual(doc.getElementById('retryTrancheSaveBtn').hidden, true, 'Profile retry should clear pending action');
    }
    console.log('✓ flush failure recovery OK');

    console.log('Test 6: profile input gate ignores invalid intermediates and commits only latest valid value');
    {
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();

        await initTranchenManagerPage({ profileId: 'default' });
        const input = doc.getElementById('profileTagesgeld');
        input.value = '';
        input.listeners.input[0]();
        await new Promise(resolve => setTimeout(resolve, 350));
        assertEqual(persistenceStorage.getItem('profile_tagesgeld'), null, 'Blank intermediate value must not be persisted');
        assertEqual(doc.getElementById('profileValidationStatus').hidden, false, 'Invalid intermediate should be announced');

        input.value = '100';
        input.listeners.input[0]();
        input.value = '200';
        input.listeners.input[0]();
        await waitFor(
            () => persistenceStorage.getItem('profile_tagesgeld') === '200',
            'Latest debounced profile value should be persisted'
        );
        assertEqual(persistenceStorage.getItem('profile_tagesgeld'), '200', 'Rapid input should commit only the latest complete value');
        assertEqual(doc.getElementById('profileValidationStatus').hidden, true, 'Valid values should clear validation status');

        input.value = '-5';
        input.listeners.input[0]();
        await new Promise(resolve => setTimeout(resolve, 350));
        assertEqual(persistenceStorage.getItem('profile_tagesgeld'), '200', 'Negative input must leave confirmed state unchanged');
    }
    console.log('✓ profile validation and debounce gate OK');

    console.log('Test 7: valid input queued during a slow flush is committed automatically');
    {
        const adapterStore = new Map();
        let saveCalls = 0;
        let releaseFirstSave;
        const firstSaveGate = new Promise(resolve => { releaseFirstSave = resolve; });
        const adapter = {
            name: 'slow-profile-memory',
            async open() {},
            async loadAll() { return Object.fromEntries(adapterStore); },
            async saveBatch(batch) {
                saveCalls += 1;
                if (saveCalls === 1) await firstSaveGate;
                batch.deletes.forEach(key => adapterStore.delete(key));
                batch.upserts.forEach(([key, value]) => adapterStore.set(key, String(value)));
            }
        };
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests(adapter);
        await PersistenceFacade.init();
        await initTranchenManagerPage({ profileId: 'default' });

        const input = doc.getElementById('profileTagesgeld');
        input.value = '100';
        input.listeners.input[0]();
        await waitFor(() => saveCalls === 1, 'First debounced profile flush should start');
        input.value = '200';
        input.listeners.input[0]();
        await new Promise(resolve => setTimeout(resolve, 350));
        releaseFirstSave();
        await waitFor(
            () => saveCalls >= 2 && adapterStore.get('profile_tagesgeld') === '200',
            'Queued profile value should flush after the in-flight commit'
        );
        assertEqual(adapterStore.get('profile_tagesgeld'), '200', 'Queued profile value should become the confirmed value');
        assertEqual(doc.getElementById('retryTrancheSaveBtn').hidden, true, 'Successful queued save should not require manual retry');
    }
    console.log('✓ slow-flush profile queue OK');

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
