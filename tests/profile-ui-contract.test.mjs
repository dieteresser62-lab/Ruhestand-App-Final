import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    renderProfilverbundProfileSelector,
    toggleProfilverbundMode
} from '../app/profile/profilverbund-balance-ui.js';
import {
    buildProfilverbundAssetSummary,
    buildProfilverbundProfileSummaries
} from '../app/profile/profilverbund-balance.js';
import { PersistenceFacade } from '../app/shared/persistence-facade.js';

const __filename = fileURLToPath(import.meta.url);

class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    add(name) { this.classes.add(name); }
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
    dispatch(type, event = {}) {
        return Promise.all((this.listeners[type] || []).map(handler => handler({ type, target: this, ...event })));
    }
}

class MockDocument {
    constructor() {
        this.elements = new Map();
        this.listeners = {};
        this.readyState = 'loading';
        this.visibilityState = 'visible';
    }
    createElement(tagName) {
        return new MockElement('', tagName);
    }
    register(element) {
        this.elements.set(element.id, element);
        return element;
    }
    getElementById(id) {
        return this.elements.get(id) || null;
    }
    querySelectorAll(selector) {
        if (selector === '.profilverbund-toggle-target') {
            return Array.from(this.elements.values()).filter(el => el.classList.contains('profilverbund-toggle-target'));
        }
        if (selector === 'a[href][data-profile-handoff]') return [];
        return [];
    }
    addEventListener(type, handler) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(handler);
    }
    async dispatch(type, event = {}) {
        const handlers = this.listeners[type] || [];
        await Promise.all(handlers.map(handler => handler({ type, ...event })));
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

function registerProfileManagerDom(doc) {
    [
        'profileSelect',
        'profileNameInput',
        'profileCreateBtn',
        'profileRenameBtn',
        'profileDeleteBtn',
        'profileSaveBtn',
        'activeProfileBadge',
        'profileStatus'
    ].forEach(id => {
        const tagName = id === 'profileSelect' ? 'select' : (id.endsWith('Btn') ? 'button' : 'input');
        doc.register(new MockElement(id, tagName));
    });
}

const previousGlobals = {
    document: global.document,
    window: global.window,
    localStorage: global.localStorage,
    confirm: global.confirm
};

function installGlobals(doc, storage) {
    global.document = doc;
    global.localStorage = storage;
    global.confirm = () => true;
    global.window = {
        name: 'RUHESTAND_PROFILE_BUNDLE:not-json',
        location: { reload() {} },
        addEventListener(type, handler) {
            if (!this.listeners) this.listeners = {};
            if (!this.listeners[type]) this.listeners[type] = [];
            this.listeners[type].push(handler);
        },
        listeners: {}
    };
}

function shouldRun() {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
    const requestedTest = process.argv[2] ? path.resolve(process.argv[2]) : '';
    return entry === __filename
        || (entry.endsWith(`${path.sep}run-single.mjs`) && requestedTest === __filename);
}

async function runProfileUiContractTests() {
    console.log('--- Profile UI Contract Tests ---');

    console.log('Test 1: Profilverbund selector renders one row per profile and toggles targets');
    {
        const doc = new MockDocument();
        global.document = doc;
        const container = doc.register(new MockElement('profilverbund-profile-list'));
        const target = doc.register(new MockElement('target'));
        target.classList.add('profilverbund-toggle-target');

        renderProfilverbundProfileSelector([
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B', belongsToHousehold: false }
        ]);
        toggleProfilverbundMode(true);

        assertEqual(container.children.length, 2, 'Selector should render exactly one row per profile');
        assertEqual(container.children[0].children[0].checked, true, 'Household profiles should be checked by default');
        assertEqual(container.children[1].children[0].checked, false, 'Opted-out profiles should be unchecked');
        assertEqual(target.style.display, 'block', 'Toggle target should be visible in Profilverbund mode');

        toggleProfilverbundMode(false);
        assertEqual(target.style.display, 'none', 'Toggle target should be hidden outside Profilverbund mode');
    }
    console.log('✓ Profilverbund selector UI OK');

    console.log('Test 2: Profilverbund summaries prefer detailed tranches over aggregate fields');
    {
        const profiles = [{
            profileId: 'a',
            inputs: {
                tagesgeld: 10,
                geldmarktEtf: 999,
                depotwertAlt: 999,
                depotwertNeu: 999,
                goldWert: 999,
                costBasisAlt: 999,
                costBasisNeu: 999,
                goldCost: 999
            },
            tranches: [
                { trancheId: 'alt', marketValue: 100, costBasis: 70, type: 'aktien_alt' },
                { trancheId: 'neu', marketValue: 50, costBasis: 45, type: 'aktien_neu' },
                { trancheId: 'gold', marketValue: 20, costBasis: 15, type: 'gold', category: 'gold' },
                { trancheId: 'mm', marketValue: 30, costBasis: 30, type: 'geldmarkt', category: 'money_market' }
            ]
        }];

        const summary = buildProfilverbundAssetSummary(profiles);
        const profileSummary = buildProfilverbundProfileSummaries(profiles)[0];

        assertEqual(summary.totalDepotAlt, 100, 'Asset summary should use detailed alt tranches');
        assertEqual(summary.totalDepotNeu, 50, 'Asset summary should use detailed neu tranches');
        assertEqual(summary.totalGold, 20, 'Asset summary should use detailed gold tranches');
        assertEqual(summary.totalGeldmarkt, 30, 'Asset summary should use detailed money-market tranches');
        assertEqual(profileSummary.totalAssets, 210, 'Profile summary should not double-count aggregate fallback fields');

        const explicitEmpty = [{
            profileId: 'empty',
            inputs: { tagesgeld: 10, depotwertAlt: 999, depotwertNeu: 999, goldWert: 999, geldmarktEtf: 999 },
            tranches: [],
            hasExplicitTrancheOverride: true
        }];
        const emptySummary = buildProfilverbundAssetSummary(explicitEmpty);
        const emptyProfileSummary = buildProfilverbundProfileSummaries(explicitEmpty)[0];
        assertEqual(emptySummary.totalDepotAlt, 0, 'Explicit empty tranches must suppress aggregate equity fallback');
        assertEqual(emptySummary.totalGeldmarkt, 0, 'Explicit empty tranches must suppress aggregate money-market fallback');
        assertEqual(emptySummary.mergedTranches.length, 0, 'Explicit empty tranches must not synthesize household lots');
        assertEqual(emptyProfileSummary.totalAssets, 10, 'Explicit empty tranches should retain only non-tranche cash');
    }
    console.log('✓ Profilverbund asset double-count guard OK');

    console.log('Test 3: profile-manager handles missing profiles without throwing');
    {
        const doc = new MockDocument();
        const storage = createLocalStorageMock();
        installGlobals(doc, storage);
        registerProfileManagerDom(doc);
        PersistenceFacade.resetPersistenceRuntimeForTests();

        await import('../app/profile/profile-manager.js');
        await doc.dispatch('DOMContentLoaded');

        const select = doc.getElementById('profileSelect');
        const status = doc.getElementById('profileStatus');
        select.value = 'missing-profile';
        await select.dispatch('change');

        assertEqual(status.textContent, 'Profil konnte nicht geladen werden.', 'Missing profile switch should render controlled error');
        assertEqual(status.dataset.kind, 'error', 'Missing profile switch should mark error status');
    }
    console.log('✓ profile-manager missing profile handling OK');

    console.log('Test 4: profile-bridge tolerates invalid handoff data and installs lifecycle hooks');
    {
        const doc = new MockDocument();
        const storage = createLocalStorageMock();
        installGlobals(doc, storage);
        PersistenceFacade.resetPersistenceRuntimeForTests();

        await import('../app/profile/profile-bridge.js');
        await doc.dispatch('DOMContentLoaded');

        assertEqual(window.__rsProfilePersistenceHooksInstalled, true, 'Profile bridge should install persistence hooks');
        assertEqual(window.__rsProfileBfcacheRefreshInstalled, true, 'Profile bridge should install BFCache refresh hook');
    }
    console.log('✓ profile-bridge invalid handoff handling OK');

    console.log('✅ Profile UI contracts validated');
    console.log('--- Profile UI Contract Tests Completed ---');
}

if (shouldRun()) {
    try {
        await runProfileUiContractTests();
    } finally {
        PersistenceFacade.resetPersistenceForTests();
        Object.entries(previousGlobals).forEach(([key, value]) => {
            if (value === undefined) delete global[key];
            else global[key] = value;
        });
    }
}
