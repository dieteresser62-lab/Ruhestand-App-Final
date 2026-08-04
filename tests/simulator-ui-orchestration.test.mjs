import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PersistenceFacade, persistenceStorage } from '../app/shared/persistence-facade.js';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');

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
        this.validationMessage = '';
        this.reportValidityCalls = 0;
        this.attributes = new Map();
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

    dispatchEvent(event) {
        const nextEvent = event || { type: '' };
        nextEvent.target = nextEvent.target || this;
        (this.listeners[nextEvent.type] || []).forEach(handler => handler(nextEvent));
        return true;
    }

    click() {
        this.dispatchEvent({ type: 'click', target: this, preventDefault() {} });
    }

    setCustomValidity(message) {
        this.validationMessage = String(message || '');
    }

    reportValidity() {
        this.reportValidityCalls += 1;
        return this.validationMessage === '';
    }

    setAttribute(name, value) {
        this.attributes.set(String(name), String(value));
    }

    removeAttribute(name) {
        this.attributes.delete(String(name));
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
    const rangeFields = [
        ['sweepLiquidityRunwayYears', '3'],
        ['sweepGoldRebalancingBand', '25'],
        ['sweepMaxSkimPct', '10'],
        ['sweepMaxBearRefillPct', '2'],
        ['sweepGoldTargetPct', '0'],
        ['sweepSurvivalQuantile', '0.85'],
        ['sweepGoGoMultiplier', '1']
    ];
    [
        ['sweepMetric', 'successProbFloor'],
        ['sweepAxisX', 'liquidityRunwayYears'],
        ['sweepAxisY', 'goldRebalancingBand'],
        ...rangeFields
    ].forEach(([id, value]) => registerElement(documentRef, id, { value }));
    registerElement(documentRef, 'sweepGridSize', { tagName: 'span' });
    return rangeFields.map(([id]) => id);
}

function readRealSweepRangeIds() {
    const simulatorHtml = fs.readFileSync(path.join(projectRoot, 'Simulator.html'), 'utf8');
    const fieldset = simulatorHtml.match(
        /<legend><span[^>]*>[^<]*<\/span>Sweep-Ranges<\/legend>([\s\S]*?)<\/fieldset>/
    );
    assert(fieldset, 'Simulator.html enthaelt das erwartete Sweep-Ranges-Fieldset');
    return [...fieldset[1].matchAll(/<input\b[^>]*\bid="(sweep[A-Za-z0-9_-]+)"/g)]
        .map(match => match[1]);
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
        sweepModule,
        sweepUiModule,
        optimizerModule,
        monteCarloUiModule,
        backtestUiModule,
        householdNeedsModule,
        profileSelectionModule
    ] = await Promise.all([
        import('../app/simulator/simulator-main.js'),
        import('../app/simulator/simulator-main-tabs.js'),
        import('../app/simulator/simulator-main-reset.js'),
        import('../app/simulator/simulator-main-partner.js'),
        import('../app/simulator/simulator-main-stress.js'),
        import('../app/simulator/simulator-main-input-persist.js'),
        import('../app/simulator/simulator-sweep.js'),
        import('../app/simulator/simulator-main-sweep-ui.js'),
        import('../app/simulator/simulator-optimizer.js'),
        import('../app/simulator/monte-carlo-ui.js'),
        import('../app/simulator/simulator-backtest.js'),
        import('../app/simulator/simulator-household-needs-persistence.js'),
        import('../app/simulator/simulator-main-profiles.js')
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
        const profileStatus = registerElement(documentRef, 'simProfileStatus');
        let reloadCalls = 0;
        window.location.reload = () => { reloadCalls += 1; };
        persistenceStorage.setItem('sim_startFloorBedarf', '24000');
        persistenceStorage.setItem(
            householdNeedsModule.HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY,
            JSON.stringify({ schemaVersion: 1, startFloorBedarf: '24002' })
        );
        persistenceStorage.setItem('profile_name', 'nicht loeschen');

        resetModule.initResetButton();
        resetBtn.click();
        await PersistenceFacade.flush();

        assertEqual(persistenceStorage.getItem('sim_startFloorBedarf'), null, 'Reset entfernt sim_-Keys');
        const resetHouseholdNeeds = householdNeedsModule.readHouseholdSimulatorNeedsState();
        assertEqual(resetHouseholdNeeds.status, 'profile_default', 'Reset deaktiviert den Haushaltsbedarf-Override');
        assertEqual(resetHouseholdNeeds.values, null, 'Reset hinterlaesst keine wirksamen Haushaltswerte');
        assertEqual(persistenceStorage.getItem('profile_name'), 'nicht loeschen', 'Reset laesst fremde Keys unveraendert');
        assertEqual(reloadCalls, 1, 'Reset loest genau einen Reload aus');

        const originalFlush = PersistenceFacade.flush;
        const originalConsoleError = console.error;
        PersistenceFacade.flush = async () => { throw new Error('synthetic flush failure'); };
        console.error = () => {};
        resetBtn.disabled = false;
        reloadCalls = 0;
        resetBtn.click();
        await Promise.resolve();
        await Promise.resolve();
        assert(profileStatus.textContent.includes('nicht dauerhaft gespeichert'),
            'Fehlgeschlagener Reset-Flush wird sichtbar gemeldet');
        assertEqual(reloadCalls, 0, 'Fehlgeschlagener Reset-Flush laedt die Seite nicht neu');
        assertEqual(resetBtn.disabled, false, 'Reset bleibt nach Flush-Fehler erneut ausfuehrbar');
        PersistenceFacade.flush = originalFlush;
        console.error = originalConsoleError;
        await PersistenceFacade.flush();
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

        persistenceStorage.removeItem(householdNeedsModule.HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY);
        persistenceStorage.setItem('sim_startFloorBedarf', '24002');
        persistenceStorage.setItem('sim_startFlexBedarf', '150000');
        persistenceStorage.setItem('sim_minimumFlexAnnual', '60000');
        householdNeedsModule.initializeHouseholdSimulatorNeeds({
            status: 'candidate',
            values: {
                startFloorBedarf: '24002',
                startFlexBedarf: '150000',
                minimumFlexAnnual: '60000'
            }
        });
        const floorInput = registerElement(documentRef, 'startFloorBedarf', { value: '24000' });
        const flexInput = registerElement(documentRef, 'startFlexBedarf', { value: '60000' });
        const minimumFlexInput = registerElement(documentRef, 'minimumFlexAnnual', { value: '30000' });
        const mcRunsInput = registerElement(documentRef, 'mcAnzahl', { value: '1000' });
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
        assertEqual(floorInput.value, '24002', 'Persistierter Haushalts-Floor wird wiederhergestellt');
        assertEqual(flexInput.value, '150000', 'Persistierter Haushalts-Flex wird wiederhergestellt');
        assertEqual(minimumFlexInput.value, '60000', 'Persistierter Haushalts-Mindest-Flex wird wiederhergestellt');
        assertEqual(mcRunsInput.value, '10000', 'new/empty persistence uses the central 10,000-run default');
        persistenceStorage.setItem('sim_mcAnzahl', '7777');
        persistModule.initInputPersistence();
        assertEqual(mcRunsInput.value, '7777', 'an explicit persisted valid run count is not overwritten');
        flexInput.value = '';
        floorInput.value = '30000';
        floorInput.dispatchEvent({ type: 'input' });

        const persistedHouseholdNeeds = householdNeedsModule.readHouseholdSimulatorNeedsState().values;
        assertEqual(persistedHouseholdNeeds.startFloorBedarf, '30000', 'Input-Persistenz speichert geaenderten Haushalts-Floor');
        assertEqual(persistedHouseholdNeeds.startFlexBedarf, '150000', 'Input-Persistenz behaelt den Haushalts-Flex');
        assertEqual(persistedHouseholdNeeds.minimumFlexAnnual, '60000', 'Input-Persistenz behaelt den Haushalts-Mindest-Flex');
        assertEqual(persistenceStorage.getItem('sim_startFloorBedarf'), '24002', 'Legacy-Profilwert wird nicht mit dem Haushaltswert ueberschrieben');

        flexInput.dispatchEvent({ type: 'input' });
        assert(flexInput.validationMessage.includes('nicht gespeichert'),
            'Ungueltige bearbeitete Bedarfseingabe wird direkt am Feld gemeldet');
        assertEqual(flexInput.reportValidityCalls, 0,
            'Laufende Tastatureingabe wird nicht durch reportValidity unterbrochen');
        flexInput.dispatchEvent({ type: 'change' });
        assert(flexInput.reportValidityCalls >= 1, 'Feldnahe Browsermeldung wird beim Abschluss ausgeloest');
        flexInput.value = '150000';
        flexInput.dispatchEvent({ type: 'input' });
        assertEqual(flexInput.validationMessage, '', 'Eine gueltige Korrektur entfernt die Feldwarnung');

        minimumFlexInput.value = '';
        minimumFlexInput.dispatchEvent({ type: 'input' });
        flexInput.value = '70000';
        flexInput.dispatchEvent({ type: 'input' });
        assertEqual(householdNeedsModule.readHouseholdSimulatorNeedsState().values.startFlexBedarf, '70000',
            'Gueltiger Flex wird trotz leerem Mindest-Flex gegen dessen letzten wirksamen Wert gespeichert');
        minimumFlexInput.value = '60000';
        minimumFlexInput.dispatchEvent({ type: 'input' });
        const repairedHouseholdNeeds = householdNeedsModule.readHouseholdSimulatorNeedsState().values;
        assertEqual(repairedHouseholdNeeds.startFlexBedarf, '70000',
            'Korrektur des Nachbarfelds behaelt die zuvor gespeicherte Flex-Aenderung');
        assertEqual(repairedHouseholdNeeds.minimumFlexAnnual, '60000',
            'Korrigierter Mindest-Flex wird ebenfalls gespeichert');

        persistenceStorage.setItem(householdNeedsModule.HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY, '{kaputt');
        const corruptHouseholdNeeds = householdNeedsModule.readHouseholdSimulatorNeedsState();
        assertEqual(corruptHouseholdNeeds.values, null, 'Defekter Haushalts-Override faellt kontrolliert aus');
        assert(corruptHouseholdNeeds.warning.includes('beschädigt'), 'Defekter Haushalts-Override erzeugt ein sichtbares Warnsignal');
    }

    console.log('Test 5: stress and sweep UI render visible state for valid and invalid combinations');
    {
        const stressSelect = registerElement(documentRef, 'stressPreset', { tagName: 'select' });
        stressModule.initStressPresetOptions();
        assert(stressSelect.children.length > 0, 'Stress-Presets werden in das Select geschrieben');

        const mockSweepIds = registerSweepDom(documentRef);
        assertEqual(
            JSON.stringify([...mockSweepIds].sort()),
            JSON.stringify(readRealSweepRangeIds().sort()),
            'Sweep Mock-DOM bleibt exakt mit Simulator.html synchron'
        );
        persistenceStorage.setItem('sim.sweep.horizonYears', '30');
        sweepModule.initSweepDefaultsWithLocalStorageFallback();
        assertEqual(
            persistenceStorage.getItem('sim.sweep.horizonYears'),
            null,
            'Entferntes Direkt-Horizon-Feld laesst keinen verwaisten Persistenzwert zurueck'
        );
        sweepUiModule.initSweepUIControls();
        const gridSize = documentRef.getElementById('sweepGridSize');
        assertEqual(gridSize.textContent, 'Grid: 1 Kombis', 'Sweep-Grid zeigt gueltige Kombinationszahl');

        const invalidInput = documentRef.getElementById('sweepLiquidityRunwayYears');
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
        registerElement(documentRef, 'liquidityRunwayYears');
        registerElement(documentRef, 'rebalancingBand');
        registerElement(documentRef, 'maxSkimPctOfEq');
        registerElement(documentRef, 'maxBearRefillPctOfEq');
        registerElement(documentRef, 'goldAllokationProzent');
        registerElement(documentRef, 'goldAllokationAktiv', { value: 'false' });

        optimizerModule.applyParametersToForm({
            liquidityRunwayYears: 1.5,
            goldRebalancingBand: 7,
            maxSkimPct: 12,
            maxBearRefillPct: 8,
            goldTargetPct: 5
        });

        assertEqual(documentRef.getElementById('liquidityRunwayYears').value, 1.5, 'Optimizer uebernimmt kanonischen Runway');
        assertEqual(documentRef.getElementById('rebalancingBand').value, 7, 'Optimizer uebernimmt Gold-Rebalancing-Band');
        assertEqual(documentRef.getElementById('goldAllokationProzent').value, 5, 'Optimizer uebernimmt Gold-Zielquote');
        assertEqual(documentRef.getElementById('goldAllokationAktiv').value, 'true', 'Gold wird bei Zielquote > 0 aktiviert');
    }

    console.log('Test 7: Monte-Carlo controls expose method semantics and CAPE precedence');
    {
        const methodSelect = registerElement(documentRef, 'mcMethode', { tagName: 'select', value: 'regime_markov' });
        const blockSizeInput = registerElement(documentRef, 'mcBlockSize', { value: '5' });
        const blockSizeLabel = registerElement(documentRef, 'mcBlockSizeLabel', { tagName: 'label' });
        const startYearMode = registerElement(documentRef, 'mcStartYearMode', { tagName: 'select', value: 'FILTER' });
        const filterRow = registerElement(documentRef, 'mcStartYearFilterRow', { tagName: 'div' });
        const halfLifeRow = registerElement(documentRef, 'mcStartYearHalfLifeRow', { tagName: 'div' });
        const filterValue = registerElement(documentRef, 'mcStartYearFilterValue', { tagName: 'span' });
        const halfLifeValue = registerElement(documentRef, 'mcStartYearHalfLifeValue', { tagName: 'span' });
        registerElement(documentRef, 'mcStartYearFilter', { value: '1970' });
        registerElement(documentRef, 'mcStartYearHalfLife', { value: '20' });
        const capeToggle = registerElement(documentRef, 'useCapeSampling', { type: 'checkbox', checked: true });
        const capeWarning = registerElement(documentRef, 'mcStartYearCapeWarning', { tagName: 'div' });

        persistModule.initInputPersistence();
        monteCarloUiModule.initMonteCarloMethodControls();
        monteCarloUiModule.initMonteCarloStartYearControls();
        assertEqual(blockSizeInput.disabled, true, 'Regime-Methoden deaktivieren Blocklaengenfeld');
        assertEqual(blockSizeLabel.textContent, 'Blockgröße (Jahre)', 'Regime-Methoden behalten neutrales Blockgroessenlabel');
        assertEqual(filterRow.style.display, 'block', 'FILTER zeigt das Startjahrfeld');
        assertEqual(halfLifeRow.style.display, 'none', 'FILTER blendet die Recency-Halbwertszeit aus');
        assertEqual(filterValue.textContent, '1970', 'FILTER-Ausgabewert wird synchronisiert');
        assertEqual(halfLifeValue.textContent, '20', 'Recency-Ausgabewert wird synchronisiert');
        assertEqual(capeWarning.style.display, 'block', 'CAPE plus Gewichtung zeigt den sichtbaren Vorranghinweis');

        capeToggle.checked = false;
        capeToggle.dispatchEvent({ type: 'change' });
        assertEqual(capeWarning.style.display, 'none', 'Der Vorranghinweis verschwindet ohne CAPE-Sampling');

        methodSelect.value = 'stationary';
        methodSelect.dispatchEvent({ type: 'change' });
        assertEqual(blockSizeInput.disabled, false, 'Stationary Bootstrap aktiviert Blocklaengenfeld');
        assertEqual(blockSizeLabel.textContent, 'Erwartete Blocklänge (Jahre)', 'Stationary Bootstrap zeigt erwartete Blocklaenge');
        assert(blockSizeInput.title.includes('1-30'), 'Stationary Tooltip nennt erlaubten Parameterbereich');

        methodSelect.dispatchEvent({ type: 'change' });
        assertEqual(persistenceStorage.getItem('sim_mcMethode'), 'stationary', 'MC-Methode wird persistiert');
    }

    console.log('Test 8: Monte-Carlo cancel UI exposes running and cancelling states');
    {
        const startButton = registerElement(documentRef, 'mcButton', { tagName: 'button' });
        const cancelButton = registerElement(documentRef, 'mcCancelButton', { tagName: 'button' });
        cancelButton.hidden = true;
        const progressContainer = registerElement(documentRef, 'mc-progress-bar-container', { tagName: 'div' });
        registerElement(documentRef, 'mc-progress-bar', { tagName: 'div' });
        const compareResults = registerElement(documentRef, 'mc-compare-results', { tagName: 'div' });
        let cancelCalls = 0;
        const ui = monteCarloUiModule.createMonteCarloUI();
        ui.bindCancel(() => { cancelCalls += 1; });

        ui.beginRun();
        assertEqual(startButton.disabled, true, 'MC start remains disabled while a run is active');
        assertEqual(cancelButton.disabled, false, 'MC cancel is enabled for the active run');
        assertEqual(cancelButton.hidden, false, 'MC cancel is visible for the active run');
        cancelButton.click();
        assertEqual(cancelCalls, 1, 'MC cancel dispatches exactly one bound action per click');

        ui.beginCancelling();
        assertEqual(startButton.disabled, true, 'MC start remains disabled while cancellation completes');
        assertEqual(cancelButton.disabled, true, 'duplicate MC cancel is disabled while cancellation completes');
        assert(cancelButton.textContent.includes('Abbruch'), 'cancelling state is visible on the cancel button');
        ui.showCancelled();
        assertEqual(compareResults.style.display, 'block', 'cancelled status is visibly rendered');

        ui.unbindCancel();
        ui.finishRun();
        assertEqual(startButton.disabled, false, 'MC start is restored after lifecycle completion');
        assertEqual(cancelButton.hidden, true, 'MC cancel is hidden after lifecycle completion');
        assertEqual(progressContainer.style.display, '', 'lifecycle state does not mutate progress visibility directly');
    }

    console.log('Test 9: Backtest controls receive bounds and exactly one module handler');
    {
        const startButton = registerElement(documentRef, 'btButton', { tagName: 'button' });
        const startYear = registerElement(documentRef, 'simStartJahr', { value: '2000' });
        const endYear = registerElement(documentRef, 'simEndJahr', { value: '2025' });
        const datasetHint = registerElement(documentRef, 'backtestDatasetHint', { tagName: 'p' });
        const cohortToggle = registerElement(documentRef, 'runBacktestCohorts', { type: 'checkbox' });
        const cohortHorizon = registerElement(documentRef, 'backtestCohortHorizon', { value: '10' });
        registerElement(documentRef, 'simStartJahrError', { tagName: 'p' });
        registerElement(documentRef, 'simEndJahrError', { tagName: 'p' });
        registerElement(documentRef, 'backtestCohortHorizonError', { tagName: 'p' });
        registerElement(documentRef, 'toggle-backtest-detail', { type: 'checkbox' });
        registerElement(documentRef, 'exportBacktestJson', { tagName: 'button' });
        registerElement(documentRef, 'exportBacktestCsv', { tagName: 'button' });

        backtestUiModule.initializeBacktestUI();
        backtestUiModule.initializeBacktestUI();

        assert(Number.isInteger(Number(startYear.min)) && Number(startYear.min) <= 2000, 'Backtest start input receives provider minimum');
        assertEqual(endYear.max, '2025', 'Backtest end input receives provider maximum');
        assert(datasetHint.textContent.includes('Datensatz') && datasetHint.textContent.includes('2025'), 'Backtest dataset hint is visible');
        assertEqual(startButton.listeners.click.length, 1, 'Backtest start button has exactly one module click handler');
        assertEqual(cohortToggle.listeners.change.length, 1, 'Cohort toggle has exactly one module change handler');
        assertEqual(cohortHorizon.disabled, true, 'Cohort horizon remains disabled until explicitly selected');
    }

    console.log('Test 10: missing profile selection fails closed while migration remains pending');
    {
        const profileStatus = documentRef.getElementById('simProfileStatus');
        profileSelectionModule.initSimulatorProfileSelection();
        assert(window.__profileRecoveryBlocker?.message.includes('Bedarfsmigration bleibt ausstehend'),
            'Fehlender Profilverbund setzt einen expliziten Recovery-Blocker');
        assertEqual(documentRef.getElementById('mcButton').disabled, true,
            'Fehlender Profilverbund blockiert Monte-Carlo');
        assertEqual(documentRef.getElementById('btButton').disabled, true,
            'Fehlender Profilverbund blockiert Backtest');
        assert(profileStatus.textContent.includes('Profil-Recovery erforderlich'),
            'Fehlender Profilverbund wird sichtbar gemeldet');
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
