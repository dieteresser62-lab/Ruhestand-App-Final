import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PersistenceFacade, persistenceStorage } from '../app/shared/persistence-facade.js';

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
        this.type = '';
        this.dataset = {};
        this.style = { display: '', color: '' };
        this.listeners = {};
        this.children = [];
        this.parentNode = null;
        this.classList = new MockClassList();
    }

    addEventListener(type, handler) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(handler);
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    dispatchEvent(event) {
        const nextEvent = event || { type: '' };
        nextEvent.target = nextEvent.target || this;
        (this.listeners[nextEvent.type] || []).forEach(handler => handler(nextEvent));
        return true;
    }

    click() {
        this.dispatchEvent({ type: 'click', target: this, preventDefault() {} });
    }

    querySelectorAll(selector) {
        if (selector === 'input, select') {
            return this.children.filter(child => child.tagName === 'INPUT' || child.tagName === 'SELECT');
        }
        return [];
    }

    closest(selector) {
        if (selector === '.ao-preset-btn' && this.classList.contains('ao-preset-btn')) return this;
        return null;
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

    register(element) {
        this.elements.set(element.id, element);
        return element;
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    querySelectorAll(selector) {
        if (selector === '.tab-btn') {
            return Array.from(this.elements.values()).filter(element => element.classList.contains('tab-btn'));
        }
        if (selector === '.tab-panel') {
            return Array.from(this.elements.values()).filter(element => element.classList.contains('tab-panel'));
        }
        return [];
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

function installBrowserGlobals(documentRef, localStorageRef) {
    global.document = documentRef;
    global.window = {
        addEventListener() {},
        removeEventListener() {},
        localStorage: localStorageRef,
        location: { reload() {} }
    };
    global.localStorage = localStorageRef;
    global.location = global.window.location;
    global.confirm = () => true;
    global.alert = () => {};
    global.Event = class {
        constructor(type) {
            this.type = type;
        }
    };
}

function registerElement(documentRef, id, options = {}) {
    const element = documentRef.register(new MockElement(id, options.tagName || 'input'));
    element.value = options.value ?? '';
    element.checked = Boolean(options.checked);
    element.type = options.type || '';
    element.dataset = { ...(options.dataset || {}) };
    if (options.className) {
        options.className.split(/\s+/).filter(Boolean).forEach(name => element.classList.add(name));
    }
    return element;
}

function registerSweepDom(documentRef) {
    [
        ['sweepMetric', 'successProbFloor'],
        ['sweepAxisX', 'runwayMin'],
        ['sweepAxisY', 'targetEq'],
        ['sweepRunwayMin', '18'],
        ['sweepRunwayTarget', '24'],
        ['sweepTargetEq', '60'],
        ['sweepRebalBand', '5'],
        ['sweepMaxSkimPct', '10'],
        ['sweepMaxBearRefillPct', '5'],
        ['sweepGoldTargetPct', '0'],
        ['sweepHorizonYears', '30'],
        ['sweepSurvivalQuantile', '0.85'],
        ['sweepGoGoMultiplier', '1']
    ].forEach(([id, value]) => registerElement(documentRef, id, { value }));
    registerElement(documentRef, 'sweepGridSize', { tagName: 'span' });
}

const previousGlobals = {
    document: global.document,
    window: global.window,
    localStorage: global.localStorage,
    location: global.location,
    confirm: global.confirm,
    alert: global.alert,
    Event: global.Event
};

async function runSimulatorUiOrchestrationTests() {
    console.log('--- Simulator UI Orchestration Tests ---');

    const documentRef = new MockDocument();
    const localStorageRef = createLocalStorageMock();
    installBrowserGlobals(documentRef, localStorageRef);
    PersistenceFacade.resetPersistenceRuntimeForTests();

    const [
        mainModule,
        tabsModule,
        resetModule,
        partnerModule,
        stressModule,
        persistModule,
        sweepUiModule,
        optimizerModule,
        monteCarloUiModule
    ] = await Promise.all([
        import('../app/simulator/simulator-main.js'),
        import('../app/simulator/simulator-main-tabs.js'),
        import('../app/simulator/simulator-main-reset.js'),
        import('../app/simulator/simulator-main-partner.js'),
        import('../app/simulator/simulator-main-stress.js'),
        import('../app/simulator/simulator-main-input-persist.js'),
        import('../app/simulator/simulator-main-sweep-ui.js'),
        import('../app/simulator/simulator-optimizer.js'),
        import('../app/simulator/monte-carlo-ui.js')
    ]);

    void mainModule;

    console.log('Test 1: simulator-main exposes legacy browser entry points');
    {
        assertEqual(typeof window.onload, 'function', 'Simulator onload handler wird registriert');
        assertEqual(typeof window.runMonteCarlo, 'function', 'Monte-Carlo Handler wird global verdrahtet');
        assertEqual(typeof window.runBacktest, 'function', 'Backtest Handler wird global verdrahtet');
        assertEqual(typeof window.runParameterSweep, 'function', 'Sweep Handler wird global verdrahtet');
        assertEqual(typeof window.simulateOneYear, 'function', 'Legacy simulateOneYear Handler bleibt verfuegbar');
    }

    console.log('Test 2: tab buttons activate exactly one target panel');
    {
        const overviewButton = registerElement(documentRef, 'tab-overview-button', { tagName: 'button', className: 'tab-btn' });
        overviewButton.dataset.tab = 'overview';
        overviewButton.classList.add('active');
        const sweepButton = registerElement(documentRef, 'tab-sweep-button', { tagName: 'button', className: 'tab-btn' });
        sweepButton.dataset.tab = 'sweep';
        const overviewPanel = registerElement(documentRef, 'tab-overview', { className: 'tab-panel' });
        overviewPanel.classList.add('active');
        const sweepPanel = registerElement(documentRef, 'tab-sweep', { className: 'tab-panel' });

        tabsModule.initTabSwitching();
        sweepButton.click();

        assert(!overviewButton.classList.contains('active'), 'Vorheriger Tab-Button wird deaktiviert');
        assert(sweepButton.classList.contains('active'), 'Geklickter Tab-Button wird aktiviert');
        assert(!overviewPanel.classList.contains('active'), 'Vorheriges Panel wird deaktiviert');
        assert(sweepPanel.classList.contains('active'), 'Ziel-Panel wird aktiviert');
    }

    console.log('Test 3: reset button removes only simulator persistence keys');
    {
        const resetBtn = registerElement(documentRef, 'resetBtn', { tagName: 'button' });
        let reloadCalls = 0;
        window.location.reload = () => { reloadCalls += 1; };
        persistenceStorage.setItem('sim_startFloorBedarf', '24000');
        persistenceStorage.setItem('profile_name', 'nicht loeschen');

        resetModule.initResetButton();
        resetBtn.click();

        assertEqual(persistenceStorage.getItem('sim_startFloorBedarf'), null, 'Reset entfernt sim_-Keys');
        assertEqual(persistenceStorage.getItem('profile_name'), 'nicht loeschen', 'Reset laesst fremde Keys unveraendert');
        assertEqual(reloadCalls, 1, 'Reset loest genau einen Reload aus');
    }

    console.log('Test 4: central simulator controls persist and update visible state');
    {
        let confirmCalls = 0;
        global.confirm = () => {
            confirmCalls += 1;
            return true;
        };
        const partnerToggle = registerElement(documentRef, 'chkPartnerAktiv', { type: 'checkbox' });
        const partnerSection = registerElement(documentRef, 'sectionRente2');
        partnerModule.initPartnerToggle();
        partnerToggle.checked = true;
        partnerToggle.dispatchEvent({ type: 'change' });

        assertEqual(partnerSection.style.display, 'block', 'Partner-Sektion wird sichtbar geschaltet');
        assertEqual(persistenceStorage.getItem('sim_partnerAktiv'), '1', 'Partner-Aktiv-Flag wird persistiert');
        assertEqual(confirmCalls, 0, 'Partner-Toggle fragt nicht unnoetig nach Bestaetigung');

        const floorInput = registerElement(documentRef, 'startFloorBedarf', { value: '24000' });
        [
            ['displayPortfolioBreakdown', 'div'],
            ['simStartVermoegen', 'input'],
            ['depotwertAlt', 'input'],
            ['einstandAlt', 'input'],
            ['tagesgeld', 'input'],
            ['geldmarktEtf', 'input'],
            ['goldAllokationAktiv', 'select'],
            ['goldAllokationProzent', 'input'],
            ['goldFloorProzent', 'input'],
            ['goldSteuerfrei', 'select'],
            ['goldStrategyPanel', 'div'],
            ['einstandNeu', 'input'],
            ['depotwertGesamt', 'input'],
            ['goldWert', 'input'],
            ['initialBondBucket', 'input']
        ].forEach(([id, tagName]) => registerElement(documentRef, id, { tagName }));
        persistModule.initInputPersistence();
        floorInput.value = '30000';
        floorInput.dispatchEvent({ type: 'input' });

        assertEqual(persistenceStorage.getItem('sim_startFloorBedarf'), '30000', 'Input-Persistenz speichert geaenderte Werte');
    }

    console.log('Test 5: stress and sweep UI render visible state for valid and invalid combinations');
    {
        const stressSelect = registerElement(documentRef, 'stressPreset', { tagName: 'select' });
        stressModule.initStressPresetOptions();
        assert(stressSelect.children.length > 0, 'Stress-Presets werden in das Select geschrieben');

        registerSweepDom(documentRef);
        sweepUiModule.initSweepUIControls();
        const gridSize = documentRef.getElementById('sweepGridSize');
        assertEqual(gridSize.textContent, 'Grid: 1 Kombis', 'Sweep-Grid zeigt gueltige Kombinationszahl');

        const invalidInput = documentRef.getElementById('sweepRunwayMin');
        invalidInput.value = '18:6';
        invalidInput.dispatchEvent({ type: 'input' });
        assertEqual(gridSize.textContent, 'Grid: ? Kombis', 'Ungueltige Sweep-Range wird sichtbar blockiert');

        invalidInput.value = '1:1:301';
        invalidInput.dispatchEvent({ type: 'input' });
        assert(gridSize.textContent.includes('Max: 300'), 'Zu grosse Sweep-Kombination zeigt Max-Hinweis');
        assertEqual(gridSize.style.color, '#d32f2f', 'Zu grosse Sweep-Kombination wird als Fehler markiert');
    }

    console.log('Test 6: optimizer applies selected parameters without running Monte-Carlo jobs');
    {
        registerElement(documentRef, 'runwayMinMonths');
        registerElement(documentRef, 'runwayTargetMonths');
        registerElement(documentRef, 'targetEq');
        registerElement(documentRef, 'rebalBand');
        registerElement(documentRef, 'maxSkimPctOfEq');
        registerElement(documentRef, 'maxBearRefillPctOfEq');
        registerElement(documentRef, 'maxSkimPct');
        registerElement(documentRef, 'maxBearRefillPct');
        registerElement(documentRef, 'goldZielProzent');
        registerElement(documentRef, 'goldAktiv', { type: 'checkbox' });

        optimizerModule.applyParametersToForm({
            runwayMin: 18,
            runwayTarget: 30,
            targetEq: 65,
            rebalBand: 7,
            maxSkimPct: 12,
            maxBearRefillPct: 8,
            goldTargetPct: 5
        });

        assertEqual(documentRef.getElementById('runwayMinMonths').value, 18, 'Optimizer uebernimmt runwayMin');
        assertEqual(documentRef.getElementById('targetEq').value, 65, 'Optimizer uebernimmt Ziel-Aktienquote');
        assertEqual(documentRef.getElementById('goldZielProzent').value, 5, 'Optimizer uebernimmt Gold-Zielquote');
        assertEqual(documentRef.getElementById('goldAktiv').checked, true, 'Gold wird bei Zielquote > 0 aktiviert');
    }

    console.log('Test 7: Monte-Carlo method controls expose Stationary Bootstrap block length semantics');
    {
        const methodSelect = registerElement(documentRef, 'mcMethode', { tagName: 'select', value: 'regime_markov' });
        const blockSizeInput = registerElement(documentRef, 'mcBlockSize', { value: '5' });
        const blockSizeLabel = registerElement(documentRef, 'mcBlockSizeLabel', { tagName: 'label' });

        persistModule.initInputPersistence();
        monteCarloUiModule.initMonteCarloMethodControls();
        assertEqual(blockSizeInput.disabled, true, 'Regime-Methoden deaktivieren Blocklaengenfeld');
        assertEqual(blockSizeLabel.textContent, 'Blockgröße (Jahre)', 'Regime-Methoden behalten neutrales Blockgroessenlabel');

        methodSelect.value = 'stationary';
        methodSelect.dispatchEvent({ type: 'change' });
        assertEqual(blockSizeInput.disabled, false, 'Stationary Bootstrap aktiviert Blocklaengenfeld');
        assertEqual(blockSizeLabel.textContent, 'Erwartete Blocklänge (Jahre)', 'Stationary Bootstrap zeigt erwartete Blocklaenge');
        assert(blockSizeInput.title.includes('1-30'), 'Stationary Tooltip nennt erlaubten Parameterbereich');

        methodSelect.dispatchEvent({ type: 'change' });
        assertEqual(persistenceStorage.getItem('sim_mcMethode'), 'stationary', 'MC-Methode wird persistiert');
    }

    console.log('Simulator UI orchestration tests passed');
    console.log('--- Simulator UI Orchestration Tests Completed ---');
}

function shouldRun() {
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
    const requestedTest = process.argv[2] ? path.resolve(process.argv[2]) : '';
    return entry === __filename
        || (entry.endsWith(`${path.sep}run-single.mjs`) && requestedTest === __filename);
}

if (shouldRun()) {
    try {
        await runSimulatorUiOrchestrationTests();
    } finally {
        PersistenceFacade.resetPersistenceRuntimeForTests();
        Object.entries(previousGlobals).forEach(([key, value]) => {
            if (value === undefined) delete global[key];
            else global[key] = value;
        });
    }
}
