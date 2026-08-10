import path from 'node:path';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { describeLegacyTaxMigration, initTranchenManagerPage } from '../app/tranches/tranchen-manager-page.js';
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
        if (selector === '[data-cash-action]' && this.dataset.cashAction) return this;
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
        'taxExempt',
        'notes',
        'reconciliationForm',
        'reconciliationStatus',
        'reconciliationCashChoice',
        'reconciliationCashStatuses',
        'reconcileCashStatus',
        'reconcileInitialCashBalanceGroup',
        'reconcileInitialCashBalance',
        'cashPostingModal',
        'cashPostingModalTitle',
        'cashPostingModalSummary',
        'cashPostingForm',
        'cashPostingBalance',
        'cashPostingReasonGroup',
        'cashPostingReason',
        'cashPostingFormError'
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
        'retryTrancheSaveBtn',
        'reconciliationPreviewBtn',
        'reconciliationConfirmBtn',
        'reconciliationCancelBtn',
        'cashPostingCancelBtn',
        'cashPostingSubmitBtn'
    ].forEach(id => doc.register(new MockElement(id, 'button')));
    profileInputIds.forEach(id => {
        const tagName = id.includes('Aktiv') || id.includes('Steuerfrei') || id.includes('Mode') || id.includes('Source') || id.includes('Enabled') ? 'select' : 'input';
        doc.register(new MockElement(id, tagName));
    });
    doc.getElementById('category').value = 'equity';
    doc.getElementById('type').value = 'aktien_neu';
    doc.getElementById('reconcileCashStatus').value = 'pending_manual_posting';
    doc.getElementById('type').options = ['aktien_alt', 'aktien_neu', 'anleihe', 'geldmarkt', 'gold']
        .map(value => ({ value, disabled: false, hidden: false }));
    return doc;
}

function createCashSale(overrides = {}) {
    return {
        schemaVersion: 1,
        eventType: 'sale_reconciled',
        actionId: 'page-cash-sale',
        profileId: 'page-cash-profile',
        trancheId: 'page-cash-lot',
        executedAt: '2026-07-14',
        actual: { sharesSold: 1, grossProceeds: 100, fees: 5, netProceeds: 95 },
        cashStatus: 'confirmed_already_reflected',
        cashBalanceAfterPostingEur: 5000,
        cashConfirmedAt: '2026-07-14T12:00:00.000Z',
        result: { beforeShares: 2, remainingShares: 1, trancheRemoved: false },
        reconciledAt: '2026-07-14T12:00:00.000Z',
        ...overrides
    };
}

function createCashRegistry(actions) {
    return {
        version: 1,
        profiles: {
            'page-cash-profile': {
                meta: {
                    id: 'page-cash-profile',
                    name: 'Cashprofil',
                    createdAt: '2026-07-14T00:00:00.000Z',
                    updatedAt: '2026-07-14T00:00:00.000Z',
                    belongsToHousehold: true
                },
                data: {}
            }
        },
        trancheReconciliation: { schemaVersion: 1, actions }
    };
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

    console.log('Test 1a: legacy tax migration is quantified and visible');
    {
        const warning = describeLegacyTaxMigration(JSON.stringify([
            { schemaVersion: 1, category: 'equity', type: 'aktien_alt', tqf: 0.3 },
            { schemaVersion: 1, category: 'gold', type: 'gold', tqf: 1 },
            { category: 'money_market', type: 'geldmarkt', tqf: 0.3 }
        ]));
        assert(warning.includes('3 Legacy-Tranche(n)'), 'Migration warning quantifies every affected legacy lot');
        assert(warning.includes('1 alte Gold-TQF-1-Kodierung(en)'), 'Migration warning quantifies converted Gold exemptions');
        assert(warning.includes('1 unbelegte Nicht-Aktien-TQF'), 'Migration warning quantifies reset non-equity TQF values');
        assert(warning.includes('rechnet die Simulation mit diesen konservativen Annahmen'),
            'Migration warning states the active calculation consequence until confirmation');
        assertEqual(describeLegacyTaxMigration(JSON.stringify([{ schemaVersion: 2, taxExempt: false }])), '',
            'Current schema does not display a migration warning');
    }

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
        assert(doc.getElementById('tranchePersistenceStatus').textContent.includes('1 Legacy-Tranche(n)'),
            'Loaded legacy storage must surface the tax-contract migration before user confirmation');
        const offlineStatus = doc.getElementById('priceUpdateStatus').textContent;
        assert(offlineStatus.startsWith('Kurse konnten nicht aktualisiert werden.'), 'Offline update should render a concise failure status');
        assert(offlineStatus.includes('ETF: Lokaler Kursproxy nicht erreichbar'), 'Offline update should name the affected tranche and understandable reason');
        assertEqual(doc.getElementById('profileTagesgeld').value, 12345, 'Profile values should be applied to DOM');
        assert(doc.getElementById('activeProfileName').textContent.includes('(default)'), 'Loaded profile label should include actual id');
    }
    console.log('✓ valid storage and offline price degradation OK');

    console.log('Test 3: mixed quote batch is single-flight, fail-closed and persisted exactly once');
    {
        const now = Math.floor(Date.now() / 1000);
        const initialTranches = [
            {
                trancheId: 'eur-a', name: 'EUR A', ticker: 'SAME.DE', shares: 2,
                purchasePrice: 100, currentPrice: 100, category: 'equity', type: 'aktien_neu', tqf: 0.3
            },
            {
                trancheId: 'eur-b', name: 'EUR B', ticker: 'SAME.DE', shares: 3,
                purchasePrice: 90, currentPrice: 90, category: 'equity', type: 'aktien_neu', tqf: 0.3
            },
            {
                trancheId: 'usd', name: 'USD Lot', ticker: 'USD.DE', shares: 1,
                purchasePrice: 80, currentPrice: 80, category: 'equity', type: 'aktien_neu', tqf: 0.3
            }
        ];
        const adapterStore = new Map([['depot_tranchen', JSON.stringify(initialTranches)]]);
        let trancheWriteBatches = 0;
        const adapter = {
            name: 'quote-batch-memory',
            async open() {},
            async loadAll() { return Object.fromEntries(adapterStore); },
            async saveBatch(batch) {
                if (batch.upserts.some(([key]) => key === 'depot_tranchen')) trancheWriteBatches += 1;
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

        let releaseEurQuote;
        const eurQuoteGate = new Promise(resolve => { releaseEurQuote = resolve; });
        const quoteCalls = new Map();
        const previousFetch = global.fetch;
        global.fetch = async url => {
            const parsed = new NodeURL(String(url));
            if (parsed.pathname === '/search') {
                const query = parsed.searchParams.get('q');
                return { ok: true, status: 200, json: async () => ({ quotes: [{ symbol: query }] }) };
            }
            const symbol = parsed.searchParams.get('symbol');
            quoteCalls.set(symbol, (quoteCalls.get(symbol) || 0) + 1);
            if (symbol === 'SAME.DE') {
                await eurQuoteGate;
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        symbol,
                        price: 125,
                        currency: 'EUR',
                        asOf: now,
                        source: 'yahoo-chart'
                    })
                };
            }
            return {
                ok: false,
                status: 422,
                json: async () => ({
                    status: 'error',
                    code: 'UNSUPPORTED_CURRENCY',
                    message: 'Waehrung USD wird nicht unterstuetzt.'
                })
            };
        };

        try {
            const firstClick = doc.getElementById('updatePricesBtn').listeners.click[0]();
            const secondClick = doc.getElementById('updatePricesBtn').listeners.click[0]();
            await waitFor(() => quoteCalls.get('SAME.DE') === 1, 'Duplicate symbol should start exactly one active quote request');
            assertEqual(doc.getElementById('updatePricesBtn').disabled, true, 'Active quote batch should disable repeated UI action');
            releaseEurQuote();
            await Promise.all([firstClick, secondClick]);
            await PersistenceFacade.flush();
        } finally {
            if (previousFetch === undefined) delete global.fetch; else global.fetch = previousFetch;
        }

        assertEqual(quoteCalls.get('SAME.DE'), 1, 'Same symbol across lots and double click must remain single-flight');
        assertEqual(window.tranchen.find(item => item.trancheId === 'eur-a').currentPrice, 125, 'First EUR lot should update');
        assertEqual(window.tranchen.find(item => item.trancheId === 'eur-b').currentPrice, 125, 'Second EUR lot should share result');
        assertEqual(window.tranchen.find(item => item.trancheId === 'usd').currentPrice, 80, 'Rejected USD lot must retain old price');
        assertEqual(trancheWriteBatches, 1, 'Mixed successful batch should persist tranche state exactly once');
        assertEqual(JSON.parse(adapterStore.get('depot_tranchen')).find(item => item.trancheId === 'usd').currentPrice, 80, 'Persisted rejected lot should retain old price');
        const batchStatus = doc.getElementById('priceUpdateStatus').textContent;
        assert(batchStatus.startsWith('Kurse teilweise aktualisiert (2 von 3).'), 'Mixed outcome should remain concise and unambiguous');
        assert(batchStatus.includes('USD Lot: Waehrung USD wird nicht unterstuetzt.'), 'Rejected tranche and understandable reason should remain visible');
        assert(!batchStatus.includes('yahoo-chart') && !batchStatus.includes('Stichtag'), 'Successful quote metadata should not clutter the status');
        assertEqual(doc.getElementById('updatePricesBtn').disabled, false, 'Completed batch should re-enable controls');
    }
    console.log('✓ quote batch resilience contract OK');

    console.log('Test 4: late quote response after profile switch is ignored');
    {
        const now = Math.floor(Date.now() / 1000);
        const initialRaw = JSON.stringify([{
            trancheId: 'late', name: 'Late Quote', ticker: 'LATE.DE', shares: 1,
            purchasePrice: 100, currentPrice: 100, category: 'equity', type: 'aktien_neu', tqf: 0.3
        }]);
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();
        persistenceStorage.setItem('depot_tranchen', initialRaw);
        await PersistenceFacade.flush();
        await initTranchenManagerPage({ profileId: 'default' });

        let releaseQuote;
        let notifyStarted;
        const quoteGate = new Promise(resolve => { releaseQuote = resolve; });
        const started = new Promise(resolve => { notifyStarted = resolve; });
        const previousFetch = global.fetch;
        global.fetch = async () => {
            notifyStarted();
            await quoteGate;
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    symbol: 'LATE.DE', price: 150, currency: 'EUR', asOf: now, source: 'yahoo-chart'
                })
            };
        };

        try {
            const oldBatch = doc.getElementById('updatePricesBtn').listeners.click[0]();
            await started;
            initTranchenManagerPage({
                profileId: 'other',
                loader: () => ({ status: 'empty', tranches: [], raw: null })
            });
            releaseQuote();
            await oldBatch;
        } finally {
            if (previousFetch === undefined) delete global.fetch; else global.fetch = previousFetch;
        }

        assertEqual(window.tranchen.length, 0, 'Late result must not repopulate the newly selected empty profile');
        assertEqual(JSON.parse(persistenceStorage.getItem('depot_tranchen'))[0].currentPrice, 100, 'Late result must not persist into the previous profile state');
        assertEqual(doc.getElementById('priceUpdateStatus').textContent, '', 'Late result must not overwrite the new profile status');
        assertEqual(doc.getElementById('updatePricesBtn').disabled, false, 'Profile switch should release quote-batch controls');
    }
    console.log('✓ late quote invalidation OK');

    console.log('Test 5: corrupt storage remains untouched until explicit recovery');
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

    console.log('Test 6: unavailable reload preserves last confirmed state and listeners');
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

    console.log('Test 7: failed flush keeps confirmed state and supports retry');
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

    console.log('Test 8: profile input gate ignores invalid intermediates and commits only latest valid value');
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

    console.log('Test 9: valid input queued during a slow flush is committed automatically');
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

    console.log('Test 10: stale cash-correction dialog is blocked before confirmation and preserves the newer audit');
    {
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();
        const sale = createCashSale();
        persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(createCashRegistry([sale])));

        await initTranchenManagerPage({ profileId: 'page-cash-profile' });
        const actionButton = new MockElement('correct-page-cash', 'button');
        actionButton.dataset.cashAction = 'correct';
        actionButton.dataset.targetActionId = sale.actionId;
        doc.getElementById('reconciliationCashStatuses').listeners.click[0]({ target: actionButton });
        assert(doc.getElementById('cashPostingModalSummary').textContent.includes('Nächste Korrekturrevision: 1'),
            'Correction dialog should pin the displayed revision');
        assert(doc.getElementById('cashPostingModalSummary').textContent.includes('cash-correction:v1:page-cash-sale:1'),
            'Correction dialog should pin the displayed canonical action id');

        const registryAfterOtherTab = createCashRegistry([sale, {
            schemaVersion: 1,
            eventType: 'cash_posting_corrected',
            actionId: 'cash-correction:v1:page-cash-sale:1',
            correctionActionId: 'cash-correction:v1:page-cash-sale:1',
            targetActionId: sale.actionId,
            correctsActionId: sale.actionId,
            correctionRevision: 1,
            profileId: sale.profileId,
            confirmedNetProceedsEur: 95,
            cashBalanceAfterPostingEur: 4000,
            correctionReason: 'Parallel in Tab B korrigiert',
            correctedAt: '2026-07-15T09:00:00.000Z'
        }]);
        persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(registryAfterOtherTab));
        doc.getElementById('cashPostingBalance').value = '4500';
        doc.getElementById('cashPostingReason').value = 'Veraltete Annahme aus Tab A';
        let confirmCalls = 0;
        global.confirm = () => { confirmCalls += 1; return true; };

        const submitted = await doc.getElementById('cashPostingForm').listeners.submit[0]({ preventDefault() {} });
        const persisted = JSON.parse(persistenceStorage.getItem('rs_profiles_v1'));
        assertEqual(submitted, false, 'Stale correction dialog should be rejected');
        assertEqual(confirmCalls, 0, 'Stale correction must fail before the final confirmation dialog');
        assertEqual(persisted.trancheReconciliation.actions.length, 2,
            'Stale correction must not append a silently re-derived revision');
        assertEqual(persisted.trancheReconciliation.actions[1].cashBalanceAfterPostingEur, 4000,
            'Newer effective cash balance must remain unchanged');
        assertEqual(doc.getElementById('cashPostingFormError').hidden, false,
            'Stale correction should expose an actionable modal error');
        assert(doc.getElementById('cashPostingFormError').textContent.includes('abweichenden Payload')
            || doc.getElementById('cashPostingFormError').textContent.includes('aktuellen Stand'),
        'Stale correction error should explain the conflict or request a current reload');
    }
    console.log('✓ stale cash-dialog gate OK');

    console.log('Test 11: unreadable cash audit renders an incomplete-list warning instead of an empty history');
    {
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();
        persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(createCashRegistry([{
            ...createCashSale(),
            eventType: 'unknown_future_event'
        }])));

        await initTranchenManagerPage({ profileId: 'page-cash-profile' });
        const panel = doc.getElementById('reconciliationCashStatuses').innerHTML;
        assert(panel.includes('Cashstatus-Audit nicht lesbar – die Liste ist unvollständig'),
            'Manager panel should expose its unreadable audit state');
        assert(!panel.includes('Noch keine dokumentierten Realverkäufe'),
            'Unreadable audit must not be rendered as an empty sale history');
        assert(doc.getElementById('reconciliationStatus').textContent.includes('blockiert'),
            'Manager form should keep cash confirmation and correction visibly blocked');
    }
    console.log('✓ unreadable cash-audit panel contract OK');

    console.log('Test 12: cash confirmation uses the page orchestrator and appends exactly one audit event');
    {
        const storageRef = createLocalStorageMock();
        const doc = createTranchenPageDom();
        installGlobals(doc, storageRef);
        PersistenceFacade.resetPersistenceForTests();
        await PersistenceFacade.init();
        const pendingSale = createCashSale({ cashStatus: 'pending_manual_posting' });
        delete pendingSale.cashBalanceAfterPostingEur;
        delete pendingSale.cashConfirmedAt;
        const registry = createCashRegistry([pendingSale]);
        const saleBefore = JSON.stringify(registry.trancheReconciliation.actions[0]);
        persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(registry));
        persistenceStorage.setItem('rs_current_profile', 'page-cash-profile');
        persistenceStorage.setItem('rs_active_profile', 'page-cash-profile');

        await initTranchenManagerPage({ profileId: 'page-cash-profile' });
        const actionButton = new MockElement('confirm-page-cash', 'button');
        actionButton.dataset.cashAction = 'confirm';
        actionButton.dataset.targetActionId = pendingSale.actionId;
        doc.getElementById('reconciliationCashStatuses').listeners.click[0]({ target: actionButton });
        doc.getElementById('cashPostingBalance').value = '5095';
        let confirmationText = '';
        global.confirm = message => { confirmationText = message; return true; };

        const submitted = await doc.getElementById('cashPostingForm').listeners.submit[0]({ preventDefault() {} });
        const persisted = JSON.parse(persistenceStorage.getItem('rs_profiles_v1'));
        assertEqual(submitted, true, 'Page orchestrator should commit a confirmed cash posting');
        assert(confirmationText.includes('Nettoerlös') && confirmationText.includes('keine automatische Cashbuchung'),
            'Final confirmation should name the evidence and manual-only effect');
        assertEqual(persisted.trancheReconciliation.actions.length, 2,
            'Page orchestrator should append exactly one confirmation event');
        assertEqual(JSON.stringify(persisted.trancheReconciliation.actions[0]), saleBefore,
            'Page orchestrator must preserve the original sale record exactly');
        assertEqual(persisted.trancheReconciliation.actions[1].eventType, 'cash_posting_confirmed',
            'Page orchestrator should persist the explicit confirmation event');
        assertEqual(doc.getElementById('cashPostingModal').classList.contains('active'), false,
            'Successful confirmation should close the cash modal');
    }
    console.log('✓ cash page orchestration contract OK');

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
