import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UIBinder, initUIBinder } from '../app/balance/balance-binder.js';
import {
    BALANCE_IMPORT_INPUT_SCHEMA_VERSION,
    BALANCE_EXPORT_APP_ID,
    BALANCE_EXPORT_SCHEMA,
    BALANCE_EXPORT_SCHEMA_VERSION,
    BalanceImportError,
    createBalanceExportDocument,
    createImportExportHandlers,
    normalizeBalanceImportDocument
} from '../app/balance/balance-binder-imports.js';
import { createProfilverbundHandlers } from '../app/balance/balance-main-profilverbund.js';
import { CONFIG, ValidationError } from '../app/balance/balance-config.js';
import { UIReader, initUIReader } from '../app/balance/balance-reader.js';
import { UIRenderer } from '../app/balance/balance-renderer.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import {
    BALANCE_UPDATE_MODE,
    BALANCE_UPDATE_STATUS,
    assertActiveEngineHandshake,
    createEngineHandshake,
    createUpdateFailureResult,
    createUpdateSuccessResult
} from '../app/balance/balance-update-pipeline.js';
import { ANNUAL_MARKET_DATA_META_KEY } from '../app/balance/balance-annual-marketdata.js';
import { PersistenceFacade } from '../app/shared/persistence-facade.js';
import { loadProfilverbundProfiles } from '../app/profile/profilverbund-balance.js';
import { EngineAPI } from '../engine/index.mjs';

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
            aktuellesAlter: documentRef.register(new MockElement('aktuellesAlter', 'input')),
            marketCsvMode: documentRef.register(new MockElement('marketCsvMode', 'select')),
            marketCsvTargetYear: documentRef.register(new MockElement('marketCsvTargetYear', 'input')),
            marketCsvExpectedAsOf: documentRef.register(new MockElement('marketCsvExpectedAsOf', 'input')),
            marketCsvInstrument: documentRef.register(new MockElement('marketCsvInstrument', 'input')),
            endeVJ: documentRef.register(new MockElement('endeVJ', 'input')),
            endeVJ_1: documentRef.register(new MockElement('endeVJ_1', 'input')),
            endeVJ_2: documentRef.register(new MockElement('endeVJ_2', 'input')),
            endeVJ_3: documentRef.register(new MockElement('endeVJ_3', 'input')),
            ath: documentRef.register(new MockElement('ath', 'input')),
            jahreSeitAth: documentRef.register(new MockElement('jahreSeitAth', 'input'))
        },
        outputs: {
            snapshotList: documentRef.register(new MockElement('snapshotList')),
            marketDataProvenance: documentRef.register(new MockElement('marketDataProvenance'))
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
const prevReplaceStateFromImport = StorageManager.replaceStateFromImport;
const prevRollbackImportReplace = StorageManager.rollbackImportReplace;
const prevApplyStoredInputs = UIReader.applyStoredInputs;

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
        let saveCalls = 0;
        StorageManager.loadState = () => ({ inputs: {} });
        StorageManager.saveState = () => { saveCalls += 1; };
        StorageManager.resetState = () => {};
        StorageManager.connectFolder = () => {};

        const dom = createDomRefs(documentRef);
        delete dom.controls.exportBtn;
        const binderState = { snapshotHandle: null, pendingInputMetadata: {} };
        initUIBinder(dom, binderState, () => { updateCalls += 1; }, () => { debouncedCalls += 1; });

        UIBinder.bindUI();
        UIBinder.bindUI();

        assertEqual((documentRef.listeners.keydown || []).length, 1, 'Keyboard shortcut listener wird nur einmal gebunden');
        assertEqual((dom.containers.form.listeners.input || []).length, 1, 'Form-Input listener wird nur einmal gebunden');
        assertEqual((dom.controls.btnJahresUpdate.listeners.click || []).length, 1, 'Jahresupdate listener wird nur einmal gebunden');
        assertEqual((dom.controls.importBtn.listeners.click || []).length, 1, 'Import-Button listener bleibt trotz optionalem Export eindeutig');

        dom.containers.form.listeners.input[0]({ target: { id: 'floorBedarf' } });
        assertEqual(debouncedCalls, 1, 'Ein Input-Event loest genau einen debounced Update aus');
        assertEqual(updateCalls, 0, 'Input-Event loest keinen direkten Update-Pfad aus');

        dom.containers.form.listeners.input[0]({ target: { id: 'depotwertAlt' } });
        assertEqual(saveCalls, 0, 'Depot-Input schreibt keinen State ausserhalb der Update-Pipeline');
        assert(Number.isFinite(binderState.pendingInputMetadata.depotLastUpdate),
            'Depot-Zeitstempel wird bis zum expliziten persist_inputs-Lauf vorgemerkt');

        const debounceCallsBeforeFileChange = debouncedCalls;
        dom.containers.form.listeners.change[0]({ target: { id: 'importFile', type: 'file' } });
        assertEqual(debouncedCalls, debounceCallsBeforeFileChange,
            'Dateiauswahl wird nur vom Import-Handler verarbeitet und plant keinen parallelen Persistenzlauf');
    }

    console.log('Test 2: Profilverbund init preserves membership and excludes opted-out profiles');
    {
        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();
        let migratedMainStateLoads = 0;
        StorageManager.loadState = () => {
            migratedMainStateLoads += 1;
            return prevLoadState.call(StorageManager);
        };
        StorageManager.saveState = state => prevSaveState.call(StorageManager, state);

        const includedState = {
            inputs: {
                tagesgeld: 10000,
                depotwertAlt: 90000,
                costBasisAlt: 80000,
                renteAktiv: false,
                renteMonatlich: 0
            },
            lastState: {
                guardrailMarker: 'included-keep',
                cumulativeInflationFactor: 2.99,
                taxState: { lossCarry: 111 }
            },
            profilverbundHouseholdLastState: { householdGuardrail: 'household-keep' },
            annualPeriodMetadata: {
                schemaVersion: 1,
                lastCommittedPeriod: 'calendar-year:2024',
                pendingCommit: null
            },
            balanceStateLifecycle: { schemaVersion: 1, lastCommittedPeriod: 'calendar-year:2024' },
            ageAdjustedForInflation: 66
        };
        const partnerState = {
            inputs: {
                tagesgeld: 20000,
                depotwertAlt: 180000,
                costBasisAlt: 160000,
                renteAktiv: false,
                renteMonatlich: 0
            },
            lastState: { guardrailMarker: 'partner-keep', taxState: { lossCarry: 222 } }
        };
        const excludedState = {
            inputs: {
                tagesgeld: 900000,
                depotwertAlt: 900000,
                costBasisAlt: 100000,
                renteAktiv: true,
                renteMonatlich: 5000
            }
        };
        const createdAt = '2026-01-01T00:00:00.000Z';
        localStorageRef.setItem('rs_profiles_v1', JSON.stringify({
            version: 1,
            profiles: {
                included: {
                    meta: { id: 'included', name: 'Im Haushalt', createdAt, updatedAt: createdAt, belongsToHousehold: true },
                    data: {}
                },
                partner: {
                    meta: { id: 'partner', name: 'Partner', createdAt, updatedAt: createdAt, belongsToHousehold: true },
                    data: {}
                },
                excluded: {
                    meta: { id: 'excluded', name: 'Ausgeschlossen', createdAt, updatedAt: createdAt, belongsToHousehold: false },
                    data: {}
                }
            }
        }));
        localStorageRef.setItem('rs_current_profile', 'included');

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

        const registryAfterReload = JSON.parse(localStorageRef.getItem('rs_profiles_v1'));
        assertEqual(registryAfterReload.profiles.excluded.meta.belongsToHousehold, false,
            'Initialisierung erhaelt den gespeicherten Opt-out-Zustand');
        const excludedCheckbox = profileList.children
            .map(row => row.children[0])
            .find(checkbox => checkbox?.dataset?.profileId === 'excluded');
        assert(excludedCheckbox, 'Ausgeschlossenes Profil wird im Selektor dargestellt');
        assertEqual(excludedCheckbox.checked, false, 'Checkbox spiegelt den gespeicherten Opt-out-Zustand');

        registryAfterReload.profiles.included.data[CONFIG.STORAGE.LS_KEY] = JSON.stringify(includedState);
        registryAfterReload.profiles.partner.data[CONFIG.STORAGE.LS_KEY] = JSON.stringify(partnerState);
        registryAfterReload.profiles.excluded.data[CONFIG.STORAGE.LS_KEY] = JSON.stringify(excludedState);
        localStorageRef.setItem('rs_profiles_v1', JSON.stringify(registryAfterReload));
        localStorageRef.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
            ...includedState,
            annualPeriodMetadata: {
                lastCommittedPeriod: null,
                pendingCommit: {
                    periodId: 'calendar-year:2025',
                    snapshotId: 'snapshot-multi',
                    phase: 'writes_started'
                }
            },
            ageAdjustedForInflation: 67
        }));

        const selectedProfiles = loadProfilverbundProfiles();
        assertEqual(selectedProfiles.length, 2, 'Nur ausgewaehlte Profile werden fuer den Profilverbund geladen');
        assertEqual(selectedProfiles[0].profileId, 'included', 'Opt-out-Profil wird nicht in Aggregate uebernommen');
        assertEqual(selectedProfiles[1].profileId, 'partner', 'Zweites Haushaltsprofil bleibt im Profilverbund');

        const aggregateInput = {
            floorBedarf: 1200,
            flexBedarf: 0,
            flexBudgetAnnual: 0,
            flexBudgetYears: 0,
            flexBudgetRecharge: 0,
            depotLastUpdate: 123456
        };
        handlers.updateProfilverbundGlobals(selectedProfiles, aggregateInput);
        assertEqual(aggregateInput.tagesgeld, 30000, 'Opt-out-Vermoegen beeinflusst das Haushaltsaggregat nicht');
        assertEqual(aggregateInput.renteMonatlich, 0, 'Opt-out-Einkommen beeinflusst das Haushaltsaggregat nicht');

        const engineCalls = [];
        window.EngineAPI = {
            simulateSingleYear(input) {
                engineCalls.push({ ...input });
                return {
                    newState: { call: engineCalls.length },
                    diagnosis: {},
                    ui: {
                        spending: { monatlicheEntnahme: 100 },
                        action: {
                            type: 'NONE',
                            nettoErlös: 0,
                            steuer: 0,
                            verwendungen: {},
                            quellen: []
                        }
                    }
                };
            }
        };
        const runs = handlers.runProfilverbundProfileSimulations(aggregateInput, selectedProfiles);
        const mergedAction = handlers.mergeProfilverbundActions(runs);

        assertEqual(engineCalls.length, 1, 'Engine laeuft im Profilverbund ausschliesslich fuer den Haushalt');
        assertEqual(runs.length, 2, 'Opt-out-Profil erzeugt keinen Profil-Run');
        assertEqual(mergedAction.quellen.length, 0, 'Haushalt ohne Handlungsbedarf erhaelt keine erfundene Profilquelle');
        assertEqual(engineCalls[0].detailledTranches.length, 2, 'Haushaltslauf erhaelt synthetische Tranchen der zwei ausgewaehlten Profile');
        assert(engineCalls[0].detailledTranches.every(tranche => tranche.sourceProfileId !== 'excluded'),
            'Opt-out-Profil gelangt nicht in den Haushaltstranchenpool');
        assert(engineCalls[0].detailledTranches.some(tranche => tranche.sourceProfileId === 'included'),
            'Erstes ausgewaehltes Profil besitzt eindeutige Quellenprovenienz');
        assert(engineCalls[0].detailledTranches.some(tranche => tranche.sourceProfileId === 'partner'),
            'Zweites ausgewaehltes Profil besitzt eindeutige Quellenprovenienz');

        runs[0].persistedInput = { ...runs[0].persistedInput, floorBedarf: 1300 };
        handlers.persistProfilverbundInputs(runs);
        const registryAfterInputPersistence = JSON.parse(localStorageRef.getItem('rs_profiles_v1'));
        const includedAfterInputPersistence = JSON.parse(
            registryAfterInputPersistence.profiles.included.data[CONFIG.STORAGE.LS_KEY]
        );
        const partnerAfterInputPersistence = JSON.parse(
            registryAfterInputPersistence.profiles.partner.data[CONFIG.STORAGE.LS_KEY]
        );
        assertEqual(includedAfterInputPersistence.inputs.floorBedarf, 1300,
            'Input-only Persistenz speichert geaenderte Profileingaben');
        assertEqual(includedAfterInputPersistence.lastState.guardrailMarker, 'included-keep',
            'Input-only Persistenz erhaelt den ersten Profil-Guardrail-State');
        assertClose(includedAfterInputPersistence.lastState.taxState.lossCarry, 111, 0.001,
            'Input-only Persistenz erhaelt den ersten Verlustvortrag');
        assertClose(partnerAfterInputPersistence.lastState.taxState.lossCarry, 222, 0.001,
            'Input-only Persistenz erhaelt den zweiten Verlustvortrag');
        assertEqual(
            includedAfterInputPersistence.profilverbundHouseholdLastState.householdGuardrail,
            'household-keep',
            'Input-only Persistenz erhaelt den Household-Guardrail-State'
        );
        assertEqual(includedAfterInputPersistence.annualPeriodMetadata, undefined,
            'Profil-State uebernimmt keine haushaltsweite Pending-Periode');
        assertEqual(includedAfterInputPersistence.ageAdjustedForInflation, undefined,
            'Profil-State uebernimmt keine ausschliesslich im Haupt-State gefuehrte Inflationsmetadaten');
        assertEqual(includedAfterInputPersistence.inputs.depotLastUpdate, 123456,
            'Profilverbund persistiert den vorgemerkten Depot-Zeitstempel im aktiven Profil');
        const mainAfterInputPersistence = JSON.parse(localStorageRef.getItem(CONFIG.STORAGE.LS_KEY));
        assertEqual(
            mainAfterInputPersistence.annualPeriodMetadata.pendingCommit.phase,
            'writes_started',
            'Input-only Profilverbund-Write loescht die Pending-Periode nicht aus dem Haupt-State'
        );
        assertEqual(mainAfterInputPersistence.ageAdjustedForInflation, 67,
            'Input-only Profilverbund-Write erhaelt die Inflationsmetadaten im Haupt-State');
        assertEqual(mainAfterInputPersistence.inputs.depotLastUpdate, 123456,
            'Profilverbund persistiert den Depot-Zeitstempel auch im Haupt-State');
        assertEqual(mainAfterInputPersistence.lastState.cumulativeInflationFactor, 2.99,
            'Input-only Write erhaelt einen plausiblen kumulierten Inflationsfaktor bytegetreu');
        assert(migratedMainStateLoads > 0,
            'Aktiver Profilverbund-Write liest seine Merge-Basis ueber den migrierenden StorageManager');

        handlers.persistProfilverbundProfileStates(runs, {
            lifecycle: { schemaVersion: 1, lastCommittedPeriod: 'calendar-year:2025' }
        });
        const registryAfterPersistence = JSON.parse(localStorageRef.getItem('rs_profiles_v1'));
        const includedPersisted = JSON.parse(registryAfterPersistence.profiles.included.data[CONFIG.STORAGE.LS_KEY]);
        const partnerPersisted = JSON.parse(registryAfterPersistence.profiles.partner.data[CONFIG.STORAGE.LS_KEY]);
        assertEqual(includedPersisted.lastState.guardrailMarker, 'included-keep',
            'Persistenz erhaelt Profil-Guardrails statt eines technischen Profil-Engine-State');
        assertClose(includedPersisted.lastState.taxState.lossCarry, 111, 0.001,
            'Persistenz schreibt den attribuierten No-Sale-Steuerzustand des ersten Profils');
        assertClose(partnerPersisted.lastState.taxState.lossCarry, 222, 0.001,
            'Persistenz schreibt den attribuierten No-Sale-Steuerzustand des zweiten Profils');
        assertEqual(includedPersisted.profilverbundHouseholdLastState.call, 1,
            'Gemeinsamer Haushalts-Guardrail-State bleibt separat erhalten');
        assertClose(includedPersisted.profilverbundHouseholdLastState.taxState.lossCarry, 0, 0.001,
            'Nicht autoritativer Haushalts-Steuerzustand wird vor der Persistenz neutralisiert');
        assertEqual(includedPersisted.balanceStateLifecycle, undefined,
            'Profil-State uebernimmt keinen haushaltsweiten Lifecycle');
        assertEqual(includedPersisted.annualPeriodMetadata, undefined,
            'Profilverbund-Commit haelt Perioden-Metadaten aus den Profildaten heraus');
        const mainAfterCommit = JSON.parse(localStorageRef.getItem(CONFIG.STORAGE.LS_KEY));
        assertEqual(
            mainAfterCommit.annualPeriodMetadata.pendingCommit.periodId,
            'calendar-year:2025',
            'Realer Profilverbund-Commit erhaelt die Perioden-Metadaten im Haupt-State'
        );
        assertEqual(mainAfterCommit.balanceStateLifecycle.lastCommittedPeriod, 'calendar-year:2025',
            'Profilverbund-Commit speichert die gemeinsame Perioden-ID nur im Haupt-State');

        localStorageRef.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
            ...mainAfterCommit,
            annualPeriodMetadata: {
                schemaVersion: 1,
                lastCommittedPeriod: 'calendar-year:2025',
                pendingCommit: null
            }
        }));
        const profileStatesAfterCommit = JSON.parse(localStorageRef.getItem('rs_profiles_v1'));
        runs.forEach(run => {
            run.balanceState = JSON.parse(
                profileStatesAfterCommit.profiles[run.profileId].data[CONFIG.STORAGE.LS_KEY]
            );
        });
        handlers.persistProfilverbundInputs(runs);
        const mainAfterFollowingInput = JSON.parse(localStorageRef.getItem(CONFIG.STORAGE.LS_KEY));
        assertEqual(
            mainAfterFollowingInput.annualPeriodMetadata.lastCommittedPeriod,
            'calendar-year:2025',
            'Spaeterer Input-Write kann ein abgeschlossenes Haushaltsjahr nicht zuruecksetzen'
        );
        assertEqual(mainAfterFollowingInput.annualPeriodMetadata.pendingCommit, null,
            'Spaeterer Input-Write kann keinen Phantom-Pending-Commit wiederbeleben');
        const registryAfterFollowingInput = JSON.parse(localStorageRef.getItem('rs_profiles_v1'));
        const includedAfterFollowingInput = JSON.parse(
            registryAfterFollowingInput.profiles.included.data[CONFIG.STORAGE.LS_KEY]
        );
        assertEqual(includedAfterFollowingInput.annualPeriodMetadata, undefined,
            'Auch der zweite reale Write haelt Haushaltsmetadaten aus dem Profil-State heraus');
    }

    console.log('Test 3: Balance import schema, legacy migration and fail-safe orchestration');
    {
        const validState = {
            inputs: {
                aktuellesAlter: 67,
                floorBedarf: 24000,
                flexBedarf: 12000,
                minimumFlexAnnual: 2000,
                tagesgeld: 50000
            },
            lastState: {
                cumulativeInflationFactor: 1.08,
                lastInflationAppliedAtAge: 66,
                taxState: { lossCarry: 500 }
            }
        };
        const currentDocument = createBalanceExportDocument(validState);
        assertEqual(currentDocument.appId, BALANCE_EXPORT_APP_ID, 'Export nutzt die stabile Balance-App-ID');
        assertEqual(currentDocument.schema, BALANCE_EXPORT_SCHEMA, 'Export benennt das Balance-State-Schema');
        assertEqual(currentDocument.schemaVersion, BALANCE_EXPORT_SCHEMA_VERSION, 'Export nutzt die aktuelle Schema-Version');
        assert(Number.isFinite(new Date(currentDocument.exportedAt).getTime()), 'Export enthaelt einen gueltigen ISO-Zeitpunkt');

        const normalizedCurrent = normalizeBalanceImportDocument(currentDocument);
        assertEqual(normalizedCurrent.sourceFormat, 'balance-state-v2', 'Aktuelles Exportformat wird eindeutig erkannt');
        assertEqual(normalizedCurrent.migrated, false, 'Aktuelles Exportformat wird nicht als Legacy markiert');
        assertEqual(normalizedCurrent.payload.inputs.floorBedarf, 24000, 'Validierung erhaelt gueltige Kernwerte');
        assertEqual(Object.hasOwn(normalizedCurrent.payload.inputs, 'dynamicFlex'), false,
            'Ein fehlendes optionales Booleanfeld bleibt fehlend und wird nicht aktiviert');
        assertEqual(BALANCE_IMPORT_INPUT_SCHEMA_VERSION, 2, 'Der vollständige Eingabevertrag ist explizit versioniert');

        const versionOneDocument = {
            ...currentDocument,
            schemaVersion: 1,
            inputSchemaVersion: 1,
            payload: {
                ...validState,
                inputs: {
                    ...validState.inputs,
                    aktuellesAlter: 0,
                    targetEq: 0,
                    rebalBand: 0,
                    tqfAlt: 30,
                    kirchensteuerSatz: 0.08
                }
            }
        };
        const normalizedVersionOne = normalizeBalanceImportDocument(versionOneDocument);
        assertEqual(normalizedVersionOne.sourceFormat, 'balance-state-v1',
            'Bestehende Version-1-Sicherungen laufen über den benannten Aufwärtsmigrator');
        assertEqual(normalizedVersionOne.migrated, true, 'Version-1-Sicherungen werden sichtbar als migriert markiert');
        assertEqual(normalizedVersionOne.payload.inputs.targetEq, 0,
            'Der Version-1-Migrator erhält die in Slice 03 entschiedene Aktienquote 0');
        assertEqual(normalizedVersionOne.payload.inputs.rebalBand, 0,
            'Der Version-1-Migrator erhält den Reader-Fallback 0 für das Rebalancing-Band');
        assertEqual(normalizedVersionOne.payload.inputs.tqfAlt, 0.3,
            'Eindeutige historische Prozentschreibweise wird symmetrisch in die Dezimalrate migriert');
        assertEqual(normalizedVersionOne.payload.inputs.kirchensteuerSatz, 0.08,
            'Der bereits versionierte Kirchensteuer-Enum bleibt ohne unbelegte Prozentheuristik erhalten');

        [
            { field: 'rebalBand', value: 0, expectsWarning: false },
            { field: 'aktuellesAlter', value: 0, expectsWarning: false },
            { field: 'inflation', value: 60, expectsWarning: true },
            { field: 'horizonYears', value: 30.5, expectsWarning: true },
            { field: 'profilName', value: 'P'.repeat(250), expectsWarning: true },
            { field: 'flexBudgetYears', value: 12, expectsWarning: true },
            { field: 'tqfAlt', value: 30, expectsWarning: true }
        ].forEach(({ field, value, expectsWarning }) => {
            const exportWithReachableValue = createBalanceExportDocument({
                ...validState,
                inputs: { ...validState.inputs, [field]: value }
            });
            assertEqual(exportWithReachableValue.schemaVersion, 2,
                `Erreichbarer Livewert ${field} verhindert den Recovery-Export nicht`);
            assertEqual(Boolean(exportWithReachableValue.validationWarnings?.length), expectsWarning,
                `${field} wird entsprechend dem aktuellen Importvertrag als Hinweis inventarisiert`);
            if (expectsWarning) {
                assert(exportWithReachableValue.validationWarnings[0].message.includes(field),
                    `${field} bleibt im Exporthinweis konkret benannt`);
            }
        });
        const zeroBoundaryDocument = createBalanceExportDocument({
            ...validState,
            inputs: { ...validState.inputs, targetEq: 0, rebalBand: 0 }
        });
        const normalizedZeroBoundary = normalizeBalanceImportDocument(zeroBoundaryDocument);
        assertEqual(normalizedZeroBoundary.payload.inputs.targetEq, 0,
            'Aktueller Export-/Import-Roundtrip erhält targetEq=0 ohne Legacy-Fallback');
        assertEqual(normalizedZeroBoundary.payload.inputs.rebalBand, 0,
            'Aktueller Export-/Import-Roundtrip erhält rebalBand=0 ohne Legacy-Fallback');
        for (const inflationBoundary of [-10, 50]) {
            const boundaryDocument = createBalanceExportDocument({
                ...validState,
                inputs: { ...validState.inputs, inflation: inflationBoundary }
            });
            assertEqual(boundaryDocument.validationWarnings?.length || 0, 0,
                `Inflationsgrenze ${inflationBoundary} bleibt im Export-/Importvertrag inklusive`);
            const normalizedBoundary = normalizeBalanceImportDocument(boundaryDocument);
            assertEqual(normalizedBoundary.payload.inputs.inflation, inflationBoundary,
                `Inflationsgrenze ${inflationBoundary} bleibt im Roundtrip erhalten`);
        }
        const rejectedHistoricalInflationDocument = createBalanceExportDocument({
            ...validState,
            inputs: { ...validState.inputs, inflation: -10.1 }
        });
        assertEqual(rejectedHistoricalInflationDocument.validationWarnings?.[0]?.code, 'invalid_input_bounds',
            'Balance export marks an inflation value below the live application boundary');
        let rejectedHistoricalInflation = null;
        try {
            normalizeBalanceImportDocument(rejectedHistoricalInflationDocument);
        } catch (error) {
            rejectedHistoricalInflation = error;
        }
        assertEqual(rejectedHistoricalInflation?.code, 'invalid_input_bounds',
            'Balance import rejects values that the annual live application path cannot consume');
        assert(rejectedHistoricalInflation?.message?.includes('Untergrenze -10'),
            'Balance import names the same lower boundary as the annual live application path');
        const goldDiagnosticInputs = {
            ...validState.inputs,
            goldBasisVermoegen: 100000,
            goldZielBetrag: 7500,
            goldFloorBetrag: 1000,
            goldStrategyDiagnostics: [{
                profileId: 'default',
                name: 'Standard',
                assetBase: 120000,
                operativeLiquidity: 30000,
                excludedHealthBucket: 20000,
                freeAssetBase: 100000,
                goldAktiv: true,
                goldZielProzent: 7.5,
                goldFloorProzent: 1,
                goldZielBetrag: 7500,
                goldFloorBetrag: 1000,
                rebalancingBand: 25,
                goldSteuerfrei: true
            }]
        };
        const normalizedGoldDiagnostics = normalizeBalanceImportDocument(
            createBalanceExportDocument({ ...validState, inputs: goldDiagnosticInputs })
        );
        assertEqual(normalizedGoldDiagnostics.payload.inputs.goldStrategyDiagnostics.length, 1,
            'Profilverbund-Golddiagnostik ist Teil des vollständigen persistierten Inputvertrags');
        const invalidGoldDiagnosticDocument = createBalanceExportDocument({
            ...validState,
            inputs: {
                ...goldDiagnosticInputs,
                goldStrategyDiagnostics: [{
                    ...goldDiagnosticInputs.goldStrategyDiagnostics[0],
                    freeAssetBase: 99999
                }]
            }
        });
        let invalidGoldDiagnosticError = null;
        try {
            normalizeBalanceImportDocument(invalidGoldDiagnosticDocument);
        } catch (error) {
            invalidGoldDiagnosticError = error;
        }
        assertEqual(invalidGoldDiagnosticError?.code, 'invalid_core_value',
            'Inkonsistente Profilverbund-Golddiagnostik wird vor DOM und Persistenz blockiert');

        const legacyDocument = {
            app: CONFIG.APP.NAME,
            version: 'v21.1 Refactored (Engine v31)',
            payload: {
                ...validState,
                lastState: {
                    cumulativeInflationFactor: 2.9,
                    lastInflationAppliedAtAge: null,
                    taxState: { lossCarry: -1 }
                }
            }
        };
        const normalizedLegacy = normalizeBalanceImportDocument(legacyDocument);
        assertEqual(normalizedLegacy.sourceFormat, 'legacy-balance-export-v0', 'Unterstuetztes Legacy-Format laeuft ueber explizite Migration');
        assertEqual(normalizedLegacy.migrated, true, 'Legacy-Import wird als migriert markiert');
        assertEqual(normalizedLegacy.payload.lastState.cumulativeInflationFactor, 2.9,
            'Legacy-Migration erhaelt einen plausiblen kumulierten Inflationsfaktor');
        assertEqual(normalizedLegacy.payload.lastState.lastInflationAppliedAtAge, 0, 'Legacy-Migration repariert das historische Inflationsalter');
        assertEqual(normalizedLegacy.payload.lastState.taxState.lossCarry, 0, 'Legacy-Migration repariert den historischen Verlustvortrag');

        const captureImportError = document => {
            try {
                normalizeBalanceImportDocument(document);
                return null;
            } catch (error) {
                return error;
            }
        };
        const createVersionOneProbe = inputOverrides => ({
            ...currentDocument,
            schemaVersion: 1,
            inputSchemaVersion: 1,
            payload: {
                ...validState,
                inputs: {
                    ...validState.inputs,
                    ...inputOverrides
                }
            }
        });
        [
            {
                label: 'unbekannte Zusatzfelder',
                overrides: { unbekanntesFeld: 1 },
                code: 'unknown_input_field'
            },
            {
                label: 'Bereichsverletzungen',
                overrides: { targetEq: 5000 },
                code: 'invalid_input_bounds'
            },
            {
                label: 'freie Enums',
                overrides: { horizonMethod: 'wuerfeln' },
                code: 'invalid_input_value'
            },
            {
                label: 'ueberlange Strings',
                overrides: { profilName: 'P'.repeat(5000) },
                code: 'invalid_input_type'
            },
            {
                label: 'unbelegte Kirchensteuer-Prozentschreibweisen',
                overrides: { kirchensteuerSatz: 8 },
                code: 'invalid_input_bounds'
            }
        ].forEach(({ label, overrides, code }) => {
            const error = captureImportError(createVersionOneProbe(overrides));
            assertEqual(error?.code, code,
                `Version-1-Import blockiert ${label} nach der Migration am vollständigen V2-Vertrag`);
        });
        const wrongAppError = captureImportError({ ...currentDocument, appId: 'fremde-app' });
        assert(wrongAppError instanceof BalanceImportError, 'Falsche App-ID liefert einen kontrollierten Importfehler');
        assertEqual(wrongAppError.code, 'wrong_app', 'Falsche App-ID ist maschinenlesbar');
        const wrongVersionError = captureImportError({ ...currentDocument, schemaVersion: 99 });
        assertEqual(wrongVersionError?.code, 'unsupported_version', 'Nicht unterstuetzte Schema-Version wird blockiert');
        const wrongInputSchemaError = captureImportError({ ...currentDocument, inputSchemaVersion: 99 });
        assertEqual(wrongInputSchemaError?.code, 'unsupported_input_schema_version',
            'Nicht unterstuetzte Eingabevertragsversion wird blockiert');
        const wrongShapeError = captureImportError({ inputs: validState.inputs });
        assertEqual(wrongShapeError?.code, 'unknown_shape', 'Unversionierter Rohzustand wird nicht als Legacy erraten');
        const invalidCoreError = captureImportError({
            ...currentDocument,
            payload: { ...validState, inputs: { ...validState.inputs, floorBedarf: -1 } }
        });
        assertEqual(invalidCoreError?.code, 'invalid_input_bounds', 'Ungueltige finanzielle Kernwerte werden vor der Mutation blockiert');
        [0, -1, 20.0001, 99, Number.NaN, Number.POSITIVE_INFINITY].forEach(invalidFactor => {
            const invalidInflationError = captureImportError({
                ...currentDocument,
                payload: {
                    ...validState,
                    lastState: { cumulativeInflationFactor: invalidFactor }
                }
            });
            assertEqual(
                invalidInflationError?.code,
                'invalid_last_state',
                `Ungueltiger kumulierter Inflationsfaktor ${String(invalidFactor)} wird vor der Mutation blockiert`
            );
        });
        ['false', '0', 0, 1, null].forEach(value => {
            const invalidBooleanError = captureImportError({
                ...currentDocument,
                payload: {
                    ...validState,
                    inputs: { ...validState.inputs, dynamicFlex: value }
                }
            });
            assertEqual(invalidBooleanError?.code, 'invalid_boolean',
                `Aktuelles Schema blockiert den Nicht-Boolean ${JSON.stringify(value)}`);
        });
        const unknownInputError = captureImportError({
            ...currentDocument,
            payload: {
                ...validState,
                inputs: { ...validState.inputs, unbekanntesFeld: 1 }
            }
        });
        assertEqual(unknownInputError?.code, 'unknown_input_field', 'Nicht inventarisierte Eingabefelder werden fail-closed blockiert');
        const invalidTrancheError = captureImportError({
            ...currentDocument,
            payload: {
                ...validState,
                inputs: {
                    ...validState.inputs,
                    detailledTranches: [{ schemaVersion: 1, trancheId: 'broken' }]
                }
            }
        });
        assertEqual(invalidTrancheError?.code, 'invalid_input_value',
            'Komplexe Eingabefelder werden gegen ihren kanonischen Detailvertrag validiert');
        const unsupportedLegacyError = captureImportError({ ...legacyDocument, version: 'v20.0' });
        assertEqual(unsupportedLegacyError?.code, 'unsupported_legacy_version', 'Nicht explizit migrierbare Legacy-Version wird blockiert');
        const invalidLegacyFieldError = captureImportError({
            ...legacyDocument,
            payload: {
                ...validState,
                inputs: {
                    ...validState.inputs,
                    unbekanntesFeld: 1
                }
            }
        });
        assertEqual(invalidLegacyFieldError?.code, 'unknown_input_field',
            'Auch der Legacy-V0-Pfad endet nach der Migration am vollständigen Eingabevertrag');

        const legacyBooleanDocument = {
            ...legacyDocument,
            payload: {
                ...validState,
                inputs: {
                    ...validState.inputs,
                    renteAktiv: 'false',
                    goldAktiv: '0',
                    goldSteuerfrei: 0,
                    dynamicFlex: 'true',
                    goGoActive: '1',
                    healthBucketEnabled: 'ja',
                    decumulation: {
                        mode: '3_bucket_jilge',
                        bondTargetFactor: 5,
                        drawdownTrigger: 15,
                        bondRefillThresholdPct: 8
                    }
                }
            }
        };
        const normalizedLegacyBooleans = normalizeBalanceImportDocument(legacyBooleanDocument);
        assertEqual(normalizedLegacyBooleans.payload.inputs.renteAktiv, false, 'Legacy-String false wird explizit migriert');
        assertEqual(normalizedLegacyBooleans.payload.inputs.goldAktiv, false, 'Legacy-String 0 wird explizit migriert');
        assertEqual(normalizedLegacyBooleans.payload.inputs.goldSteuerfrei, false, 'Legacy-Zahl 0 wird explizit migriert');
        assertEqual(normalizedLegacyBooleans.payload.inputs.dynamicFlex, true, 'Legacy-String true wird explizit migriert');
        assertEqual(normalizedLegacyBooleans.payload.inputs.goGoActive, true, 'Legacy-String 1 wird explizit migriert');
        assertEqual(normalizedLegacyBooleans.payload.inputs.healthBucketEnabled, true, 'Legacy-String ja wird explizit migriert');
        assertEqual(normalizedLegacyBooleans.payload.inputs.decumulation.bondRefillThreshold, 8,
            'Legacy-Refill-Alias wird im benannten Legacy-Pfad kanonisiert');
        assertEqual(Object.hasOwn(normalizedLegacyBooleans.payload.inputs.decumulation, 'bondRefillThresholdPct'), false,
            'Legacy-Refill-Alias bleibt nicht parallel zum kanonischen Feld erhalten');
        let invalidExportError = null;
        try {
            createBalanceExportDocument({});
        } catch (error) {
            invalidExportError = error;
        }
        assertEqual(invalidExportError?.code, 'invalid_inputs', 'Export erzeugt keine formal aktuelle, aber fachlich ungueltige Datei');

        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();

        const errors = [];
        const toasts = [];
        UIRenderer.handleError = error => { errors.push(error); };
        UIRenderer.toast = message => { toasts.push(message); };
        StorageManager.saveState = () => {};
        StorageManager.loadState = () => ({ inputs: {} });
        let replaceCalls = 0;
        let rollbackCalls = 0;
        StorageManager.replaceStateFromImport = async payload => {
            replaceCalls += 1;
            assertEqual(payload.inputs.floorBedarf, 24000, 'Replace erhaelt nur den validierten Payload');
            return { ok: true, recoverySnapshotId: 'import-recovery-test' };
        };
        StorageManager.rollbackImportReplace = async receipt => {
            rollbackCalls += 1;
            assertEqual(receipt.recoverySnapshotId, 'import-recovery-test', 'Rollback nutzt den bestaetigten Recovery-Receipt');
            return { ok: true };
        };

        const dom = createDomRefs(documentRef);
        initUIReader(dom);
        dom.inputs.aktuellesAlter.value = '66';
        UIReader.applyStoredInputs = inputs => {
            dom.inputs.aktuellesAlter.value = String(inputs.aktuellesAlter);
            dom.inputs.tagesgeld.value = String(inputs.tagesgeld || 0);
        };
        let updateCalls = 0;
        const handlers = createImportExportHandlers({
            dom,
            update: () => { updateCalls += 1; return { ok: true, status: 'success' }; },
            debouncedUpdate: () => {}
        });

        StorageManager.loadState = () => ({});
        handlers.handleExport();
        assert(errors[0].message.includes('[invalid_inputs]'),
            'Ein strukturell unmöglicher Export reicht den maschinenlesbaren Fehlercode durch');
        assert(errors[0].message.includes('inputs'),
            'Ein strukturell unmöglicher Export nennt den konkreten fehlenden Bereich');
        errors.length = 0;
        StorageManager.loadState = () => ({ inputs: {} });

        let badJsonFileValue = 'C:\\fakepath\\invalid.json';
        const badJsonTarget = {
            type: 'file',
            files: [{ text: async () => '{bad json' }],
            get value() {
                return badJsonFileValue;
            },
            set value(nextValue) {
                if (nextValue !== '') {
                    throw new Error('File inputs may only be cleared programmatically.');
                }
                badJsonFileValue = nextValue;
            }
        };
        dom.inputs.importFile = badJsonTarget;
        await handlers.handleImport({ target: badJsonTarget });

        const badCsvTarget = {
            files: [{ text: async () => 'date;open;high;low;close\nungueltig;;;;' }],
            value: 'selected'
        };
        await handlers.handleCsvImport({ target: badCsvTarget });

        assertEqual(errors.length, 2, 'Import- und CSV-Fehler werden ueber handleError gemeldet');
        assert(errors[0].message.includes('kein gültiges JSON'), 'JSON-Import nennt sichere Ursache und Handlungsoption');
        assert(errors[1].message.includes('CSV-Import fehlgeschlagen'), 'CSV-Import meldet nutzerfaehigen Fehlertext');
        assertEqual(badJsonTarget.value, '', 'JSON-Dateiauswahl wird nach Fehler zurueckgesetzt');
        assertEqual(badCsvTarget.value, '', 'CSV-Dateiauswahl wird nach Fehler zurueckgesetzt');
        assertEqual(replaceCalls, 0, 'Syntaxfehler veraendern keine Live-Daten');
        assertEqual(updateCalls, 0, 'Syntaxfehler erreichen weder Dry-Run noch persistentes Update');

        errors.length = 0;
        const wrongAppTarget = {
            files: [{ text: async () => JSON.stringify({ ...currentDocument, appId: 'fremde-app' }) }],
            value: 'selected'
        };
        await handlers.handleImport({ target: wrongAppTarget });
        assertEqual(replaceCalls, 0, 'Falsche App-ID erreicht den Replace-Pfad nicht');
        assertEqual(updateCalls, 0, 'Falsche App-ID erreicht den Engine-Dry-Run nicht');
        assertEqual(dom.inputs.aktuellesAlter.value, '66', 'Abgewiesener Import laesst die sichtbaren Eingaben unveraendert');
        assert(errors[0].message.includes('gehört nicht zur Balance-App'), 'App-ID-Fehler enthaelt Ursache ohne Payload-Leak');

        errors.length = 0;
        const dryRunOptions = [];
        const dryRunFailHandlers = createImportExportHandlers({
            dom,
            update: options => {
                dryRunOptions.push(options);
                return { ok: false, status: 'engine_error' };
            },
            debouncedUpdate: () => {}
        });
        const dryRunFailTarget = {
            files: [{ text: async () => JSON.stringify(currentDocument) }],
            value: 'selected'
        };
        await dryRunFailHandlers.handleImport({ target: dryRunFailTarget });
        assertEqual(dryRunOptions.length, 1, 'Fehlgeschlagener Dry-Run fuehrt keinen zweiten Update-Lauf aus');
        assertEqual(dryRunOptions[0].mode, BALANCE_UPDATE_MODE.PREVIEW,
            'Erste Engine-Pruefung ist explizit nicht persistent');
        assertEqual(replaceCalls, 0, 'Fehlgeschlagener Dry-Run schreibt keine Live-Daten');
        assertEqual(dom.inputs.aktuellesAlter.value, '66', 'Fehlgeschlagener Dry-Run stellt die sichtbaren Eingaben wieder her');
        assert(errors[0].message.includes('Live-Daten wurden nicht verändert'), 'Dry-Run-Fehler nennt den unveraenderten Zustand');

        errors.length = 0;
        const successUpdateOptions = [];
        const successHandlers = createImportExportHandlers({
            dom,
            update: options => {
                successUpdateOptions.push(options);
                return { ok: true, status: 'success' };
            },
            debouncedUpdate: () => {}
        });
        const successTarget = {
            files: [{ text: async () => JSON.stringify(currentDocument) }],
            value: 'selected'
        };
        await successHandlers.handleImport({ target: successTarget });
        assertEqual(successUpdateOptions.length, 2, 'Gueltiger Import durchlaeuft Dry-Run und persistentes Abschluss-Update');
        assertEqual(successUpdateOptions[0].mode, BALANCE_UPDATE_MODE.PREVIEW,
            'Gueltiger Import prueft zuerst ohne Persistenz');
        assertEqual(successUpdateOptions[1].mode, BALANCE_UPDATE_MODE.PERSIST_INPUTS,
            'Erst nach Recovery und Replace folgt ein explizites persist_inputs-Update');
        assertEqual(replaceCalls, 1, 'Gueltiger Import ersetzt den Balance-State genau einmal');
        assertEqual(rollbackCalls, 0, 'Erfolgreicher Import benoetigt keinen Rollback');
        assert(toasts.some(message => message.includes('Recovery-Snapshot')), 'Erfolgsmeldung bestaetigt den Recovery-Punkt');

        const jsonLoadState = StorageManager.loadState;
        const jsonReplaceStateFromImport = StorageManager.replaceStateFromImport;
        const jsonRollbackImportReplace = StorageManager.rollbackImportReplace;
        let csvStoredState = {
            inputs: {
                aktuellesAlter: 67,
                floorBedarf: 24000,
                flexBedarf: 12000
            }
        };
        let csvReplaceCalls = 0;
        let csvRollbackCalls = 0;
        StorageManager.loadState = () => JSON.parse(JSON.stringify(csvStoredState));
        StorageManager.replaceStateFromImport = async payload => {
            csvReplaceCalls += 1;
            csvStoredState = JSON.parse(JSON.stringify(payload));
            return { ok: true, recoverySnapshotId: 'csv-import-recovery-test' };
        };
        StorageManager.rollbackImportReplace = async receipt => {
            csvRollbackCalls += 1;
            assertEqual(receipt.recoverySnapshotId, 'csv-import-recovery-test', 'CSV-Rollback nutzt den Recovery-Receipt');
            return { ok: true };
        };
        const csvTargetYear = new Date().getFullYear() - 1;
        const csvExpectedAsOf = `${csvTargetYear}-12-30`;
        const csvSourceFileName = `markt-${csvTargetYear}.csv`;
        const csvRows = [
            'Datum;Schluss',
            `30.12.${csvTargetYear - 3};100`,
            `30.12.${csvTargetYear - 2};110`,
            `30.12.${csvTargetYear - 1};120`,
            `30.12.${csvTargetYear};130`
        ];
        dom.inputs.marketCsvMode.value = 'current';
        dom.inputs.marketCsvTargetYear.value = String(csvTargetYear);
        dom.inputs.marketCsvExpectedAsOf.value = csvExpectedAsOf;
        dom.inputs.marketCsvInstrument.value = 'vwce.de';
        const csvUpdateOptions = [];
        const csvHandlers = createImportExportHandlers({
            dom,
            update: options => {
                csvUpdateOptions.push(options);
                return {
                    ok: true,
                    status: 'success',
                    inputData: {
                        aktuellesAlter: 67,
                        floorBedarf: 24000,
                        flexBedarf: 12000,
                        endeVJ: Number(dom.inputs.endeVJ.value),
                        endeVJ_1: Number(dom.inputs.endeVJ_1.value),
                        endeVJ_2: Number(dom.inputs.endeVJ_2.value),
                        endeVJ_3: Number(dom.inputs.endeVJ_3.value),
                        ath: Number(dom.inputs.ath.value),
                        jahreSeitAth: Number(dom.inputs.jahreSeitAth.value)
                    }
                };
            },
            debouncedUpdate: () => {}
        });
        const csvSuccessTarget = {
            files: [{
                name: csvSourceFileName,
                text: async () => csvRows.join('\n')
            }],
            value: 'selected'
        };
        await csvHandlers.handleCsvImport({ target: csvSuccessTarget });
        assertEqual(csvUpdateOptions.length, 2, 'CSV-Import durchlaeuft Preview und persistente Bestaetigung');
        assertEqual(csvUpdateOptions[0].mode, BALANCE_UPDATE_MODE.PREVIEW, 'CSV prueft vor dem Replace ohne Persistenz');
        assertEqual(csvUpdateOptions[1].mode, BALANCE_UPDATE_MODE.PERSIST_INPUTS, 'CSV persistiert erst nach erfolgreichem Replace');
        assertEqual(csvReplaceCalls, 1, 'Gueltige CSV ersetzt den State atomar genau einmal');
        assertEqual(csvRollbackCalls, 0, 'Erfolgreiche CSV benoetigt keinen Rollback');
        assertEqual(csvStoredState.inputs.ath, 0,
            'Ein Fensterhoch am letzten Kurs wird nicht als Allzeithoch gespeichert');
        assertEqual(csvStoredState.inputs.jahreSeitAth, 0,
            'Ohne gerichteten Fensterabstand bleibt die ATH-Referenz neutral');
        assertEqual(csvStoredState[ANNUAL_MARKET_DATA_META_KEY].sourceFileName, csvSourceFileName,
            'CSV-Dateiname bleibt als persistierte Quellenangabe erhalten');
        assertEqual(csvStoredState[ANNUAL_MARKET_DATA_META_KEY].periodId, `calendar-year:${csvTargetYear}`,
            'CSV-Provenienz bleibt an die explizite Zielperiode gebunden');
        assertEqual(csvStoredState[ANNUAL_MARKET_DATA_META_KEY].highScope, 'windowHigh',
            'CSV-Provenienz kennzeichnet das lokale Fensterhoch');
        assertEqual(
            csvStoredState[ANNUAL_MARKET_DATA_META_KEY].engineReference.policy,
            'window_high_as_conservative_ath_lower_bound',
            'CSV-Provenienz trennt die Engine-Untergrenze maschinenlesbar von einem echten ATH'
        );
        assertEqual(
            csvStoredState[ANNUAL_MARKET_DATA_META_KEY].engineReference.applied,
            false,
            'Die steigende CSV dokumentiert, dass ihre Untergrenze nicht als Engine-ATH angewendet wurde'
        );
        const csvExportDocument = createBalanceExportDocument(csvStoredState);
        assertEqual(
            csvExportDocument.payload[ANNUAL_MARKET_DATA_META_KEY].sourceFileName,
            csvSourceFileName,
            'JSON-Export erhält die persistierte CSV-Provenienz vollständig'
        );
        const versionOneCsvDocument = JSON.parse(JSON.stringify(csvExportDocument));
        versionOneCsvDocument.schemaVersion = 1;
        versionOneCsvDocument.inputSchemaVersion = 1;
        versionOneCsvDocument.payload.inputs.ath = 0;
        versionOneCsvDocument.payload.inputs.jahreSeitAth = 0;
        const versionOneMarketMeta = versionOneCsvDocument.payload[ANNUAL_MARKET_DATA_META_KEY];
        delete versionOneMarketMeta.engineReference;
        delete versionOneMarketMeta.high.verifiedAllTimeHighAvailable;
        versionOneMarketMeta.high.engineAthAvailable = false;
        const migratedVersionOneCsv = normalizeBalanceImportDocument(versionOneCsvDocument);
        assertEqual(migratedVersionOneCsv.payload.inputs.ath, 0,
            'Version-1-CSV-Provenienz ohne positiven Fensterabstand bleibt nach Migration ATH-neutral');
        assertEqual(
            migratedVersionOneCsv.payload[ANNUAL_MARKET_DATA_META_KEY].engineReference.policy,
            'window_high_as_conservative_ath_lower_bound',
            'Der Version-1-Migrator ergänzt die neue Engine-Referenz nachvollziehbar'
        );
        assertEqual(
            migratedVersionOneCsv.payload[ANNUAL_MARKET_DATA_META_KEY].engineReference.applied,
            false,
            'Der Version-1-Migrator leitet die gerichtete Anwendung aus Fensterhoch und Schlusskurs ab'
        );
        const correctedMarketState = JSON.parse(JSON.stringify(csvStoredState));
        correctedMarketState.inputs.endeVJ = 131;
        const correctedMarketExport = createBalanceExportDocument(correctedMarketState);
        assertEqual(correctedMarketExport.schemaVersion, 2,
            'Eine manuelle Marktdatenkorrektur verhindert den Recovery-Export nicht');
        assertEqual(correctedMarketExport.validationWarnings?.[0]?.code, 'invalid_market_provenance',
            'Eine manuelle Marktdatenkorrektur bleibt im Export als Provenienzabweichung sichtbar');
        assert(correctedMarketExport.validationWarnings[0].message.includes('Provenienz'),
            'Der Exporthinweis benennt die abweichende Provenienz statt den Zustand pauschal als beschädigt');
        const tamperedCsvExport = JSON.parse(JSON.stringify(csvExportDocument));
        tamperedCsvExport.payload[ANNUAL_MARKET_DATA_META_KEY].highScope = 'allTimeHigh';
        const tamperedCsvError = captureImportError(tamperedCsvExport);
        assertEqual(tamperedCsvError?.code, 'invalid_market_provenance',
            'Ein Export kann windowHigh nicht durch manipulierte Metadaten zum ATH hochstufen');
        assertEqual(dom.outputs.marketDataProvenance.dataset.asOf, csvExpectedAsOf,
            'Erfolgreiche CSV rendert die persistierte Provenienz sichtbar');
        assertEqual(
            dom.outputs.marketDataProvenance.dataset.enginePolicy,
            'window_high_as_conservative_ath_lower_bound',
            'Die sichtbare Provenienz exponiert die konservative Engine-Policy maschinenlesbar'
        );
        assertEqual(
            dom.outputs.marketDataProvenance.dataset.engineReferenceApplied,
            'false',
            'Die sichtbare Provenienz zeigt die nicht angewendete Engine-Referenz maschinenlesbar'
        );

        const staleStateBeforeImport = JSON.stringify(csvStoredState);
        dom.inputs.marketCsvExpectedAsOf.value = `${csvTargetYear}-12-31`;
        errors.length = 0;
        await csvHandlers.handleCsvImport({ target: {
            files: [{
                name: 'markt-stale.csv',
                text: async () => csvRows.join('\n')
            }],
            value: 'selected'
        } });
        assertEqual(csvReplaceCalls, 1, 'Stichtagsabweichung erreicht keinen weiteren Replace');
        assertEqual(JSON.stringify(csvStoredState), staleStateBeforeImport, 'Abgewiesene CSV veraendert den persistierten State nicht');
        assert(errors[0].message.includes('Stichtag'), 'CSV-Stichtagsfehler bleibt fuer Nutzende handlungsfaehig');

        StorageManager.loadState = jsonLoadState;
        StorageManager.replaceStateFromImport = jsonReplaceStateFromImport;
        StorageManager.rollbackImportReplace = jsonRollbackImportReplace;

        dom.inputs.aktuellesAlter.value = '66';
        errors.length = 0;
        let finalUpdateCall = 0;
        const finalFailureHandlers = createImportExportHandlers({
            dom,
            update: () => {
                finalUpdateCall += 1;
                return finalUpdateCall === 1
                    ? { ok: true, status: 'success' }
                    : { ok: false, status: 'engine_error' };
            },
            debouncedUpdate: () => {}
        });
        const finalFailureTarget = {
            files: [{ text: async () => JSON.stringify(currentDocument) }],
            value: 'selected'
        };
        await finalFailureHandlers.handleImport({ target: finalFailureTarget });
        assertEqual(replaceCalls, 2, 'Spaeter Fehler tritt nach genau einem weiteren Replace auf');
        assertEqual(rollbackCalls, 1, 'Spaeter Abschlussfehler rollt den Import automatisch zurueck');
        assertEqual(dom.inputs.aktuellesAlter.value, '66', 'Rollback stellt auch die sichtbaren Eingaben wieder her');
        assert(errors[0].message.includes('automatisch wiederhergestellt'), 'Rollback-Erfolg nennt Ursache und Wiederherstellung');
    }

    console.log('Test 4: Balance startup renders persistence migration warnings with backend and recovery guidance');
    {
        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();

        const { renderPersistenceStartupWarning } = await import('../app/balance/balance-main.js');
        const warningTarget = new MockElement('persistenceWarning');
        const shown = renderPersistenceStartupWarning({
            backend: 'Tauri JSON Test',
            migrationWarning: {
                code: 'tauri-state-corrupt',
                message: 'Gespeicherter Zustand konnte nicht sicher geladen werden.',
                quarantinePath: 'quarantine-reference'
            }
        }, warningTarget);

        assertEqual(shown, true, 'MigrationWarning wird als sichtbarer Startup-Status behandelt');
        assertEqual(warningTarget.style.display, 'block', 'Startup-Warnung wird sichtbar geschaltet');
        assertEqual(warningTarget.dataset.kind, 'persistence-warning', 'Startup-Warnung ist maschinenlesbar typisiert');
        assert(warningTarget.textContent.includes('Gesamtspeicher'), 'Startup-Warnung nennt den betroffenen Datenbereich');
        assert(warningTarget.textContent.includes('Tauri JSON Test'), 'Startup-Warnung nennt das aktive Backend');
        assert(warningTarget.textContent.includes('quarantiniert'), 'Startup-Warnung verweist auf die vorhandene Adapterquarantaene');
        assert(warningTarget.textContent.includes('Recovery- oder Reset-Entscheidung'), 'Startup-Warnung nennt den sicheren Nutzerentscheid');
        assertEqual(warningTarget.textContent.includes('quarantine-reference'), false, 'Startup-Warnung leakt keinen lokalen Quarantaenepfad');
        assertEqual(
            renderPersistenceStartupWarning({ backend: 'IndexedDB', migrationWarning: null }, new MockElement()),
            false,
            'Ohne MigrationWarning wird kein falscher Warnzustand erzeugt'
        );
    }

    console.log('Test 5: Profilverbund globals are set and cleared without stale data');
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

        const goldProfiles = [
            {
                profileId: 'gold',
                name: 'Gold',
                inputs: {
                    depotwertAlt: 100000,
                    depotwertNeu: 0,
                    goldWert: 0,
                    tagesgeld: 0,
                    geldmarktEtf: 0,
                    goldAktiv: true,
                    goldZielProzent: 8,
                    goldFloorProzent: 1,
                    rebalancingBand: 20,
                    goldSteuerfrei: true
                },
                tranches: []
            },
            {
                profileId: 'plain',
                name: 'Ohne Gold',
                inputs: {
                    depotwertAlt: 900000,
                    depotwertNeu: 0,
                    goldWert: 0,
                    tagesgeld: 0,
                    geldmarktEtf: 0,
                    goldAktiv: false,
                    goldZielProzent: 0,
                    goldFloorProzent: 0,
                    rebalancingBand: 50,
                    goldSteuerfrei: false
                },
                tranches: []
            }
        ];
        const goldInput = {
            floorBedarf: 0,
            flexBedarf: 0,
            flexBudgetAnnual: 0,
            flexBudgetYears: 0,
            flexBudgetRecharge: 0,
            goldZielProzent: 99
        };
        handlers.updateProfilverbundGlobals(goldProfiles, goldInput);
        assertEqual(goldInput.goldZielBetrag, 8000,
            'Balance globals should use the selected profiles absolute gold target');
        assertClose(goldInput.goldZielProzent, 0.8, 0.0000001,
            'Balance globals should replace the active DOM profile quote with the household quote');
        assertEqual(goldInput.goldStrategyDiagnostics.length, 2,
            'Balance globals should expose one gold diagnostic per selected profile');

        handlers.updateProfilverbundGlobals([], inputData);

        assertEqual(window.__profilverbundDistribution, null, 'Leerer Profilverbund loescht alte Distribution');
        assertEqual(window.__profilverbundProfileSummaries, null, 'Leerer Profilverbund loescht alte Profilzusammenfassung');
    }

    console.log('Test 6: Profilverbund decides household spending once and finances only allocated shares');
    {
        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();
        localStorageRef.setItem('profilverbund_mode_test', 'proportional');

        const engineCalls = [];
        window.EngineAPI = {
            simulateSingleYear(input, lastState) {
                engineCalls.push({ input: { ...input }, lastState });
                const isHouseholdCall = engineCalls.length === 1;
                return {
                    newState: { call: engineCalls.length },
                    diagnosis: {},
                    ui: {
                        spending: { monatlicheEntnahme: isHouseholdCall ? 3000 : (input.floorBedarf / 12) },
                        action: { type: 'NONE', verwendungen: {}, quellen: [] }
                    }
                };
            }
        };

        const handlers = createProfilverbundHandlers({
            dom: { inputs: {} },
            PROFILVERBUND_STORAGE_KEYS: { mode: 'profilverbund_mode_test' }
        });
        const sharedInput = {
            floorBedarf: 40000,
            flexBedarf: 10000,
            renteAktiv: true,
            renteMonatlich: 1500,
            dynamicFlex: true,
            minimumFlexAnnual: 5000
        };
        const profiles = [
            {
                profileId: 'a',
                name: 'A',
                inputs: { depotwertAlt: 300000, renteAktiv: true, renteMonatlich: 1000 },
                tranches: [],
                balanceState: { inputs: {}, lastState: { taxState: { lossCarry: 100 } } }
            },
            {
                profileId: 'b',
                name: 'B',
                inputs: { depotwertAlt: 100000, renteAktiv: true, renteMonatlich: 500 },
                tranches: [],
                balanceState: { inputs: {}, lastState: { taxState: { lossCarry: 200 } } }
            }
        ];

        const runs = handlers.runProfilverbundProfileSimulations(sharedInput, profiles, { household: true });

        assertEqual(engineCalls.length, 1, 'Engine runs exactly once for the household');
        assertEqual(engineCalls[0].lastState.household, true, 'Household run receives household guardrail state');
        assertEqual(runs.householdResult.ui.spending.monatlicheEntnahme, 3000, 'Household result remains available to the main orchestrator');
        assertClose(runs.distribution.totalNeed, 36000, 0.001, 'Final household spending drives allocation');
        assertClose(runs[0].ui.spending.monatlicheEntnahme, 2250, 0.001, 'Profile A receives only a display attribution of household spending');
        assertClose(runs[1].ui.spending.monatlicheEntnahme, 750, 0.001, 'Profile B receives only a display attribution of household spending');
        assertClose(runs[0].input.floorBedarf, 40000, 0.001, 'Profile persistence is not replaced by an artificial funding floor');
        assertClose(runs[1].input.floorBedarf, 40000, 0.001, 'Second profile persistence is not replaced by an artificial funding floor');
        assertEqual(runs[0].input.dynamicFlex, true, 'No technical profile input disables household Dynamic Flex');
        assertEqual(runs[1].input.minimumFlexAnnual, 5000, 'No technical profile input clears the minimum flex contract');
        assertClose(runs[0].newState.taxState.lossCarry, 100, 0.001, 'Profile without sale preserves its own loss carry');
        assertClose(runs[1].newState.taxState.lossCarry, 200, 0.001, 'Second profile without sale preserves its own loss carry');
        assertEqual(runs[0].persistedInput.renteMonatlich, 1000, 'Original profile income remains in persisted inputs');
        assertEqual(runs[1].persistedInput.renteMonatlich, 500, 'Second profile income remains in persisted inputs');
    }

    console.log('Test 6b: Profilverbund applies bad-year 3-bucket replacement once at household level');
    {
        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();
        localStorageRef.setItem('profilverbund_mode_test', 'tax_optimized');

        let engineCalls = 0;
        window.EngineAPI = {
            simulateSingleYear(input, lastState) {
                engineCalls += 1;
                assertEqual(input.finalizeThreeBucketAction, true,
                    'Household Engine input requests pre-settlement 3-bucket finalization');
                assertEqual(input.deferTaxSettlement, true,
                    'Household Engine input defers tax until profile attribution');
                return EngineAPI.simulateSingleYear(input, lastState);
            }
        };
        const handlers = createProfilverbundHandlers({
            dom: { inputs: {} },
            PROFILVERBUND_STORAGE_KEYS: { mode: 'profilverbund_mode_test' }
        });
        const profiles = [
            {
                profileId: 'bond-owner',
                name: 'Bond Owner',
                inputs: { depotwertNeu: 50000, tagesgeld: 0, renteAktiv: false, sparerPauschbetrag: 1000, kirchensteuerSatz: 0 },
                tranches: [{ trancheId: 'bond-1', type: 'anleihe', category: 'bonds', marketValue: 50000, costBasis: 50000, tqf: 0 }],
                balanceState: { lastState: { taxState: { lossCarry: 0 } } }
            },
            {
                profileId: 'equity-owner',
                name: 'Equity Owner',
                inputs: { depotwertNeu: 100000, tagesgeld: 0, renteAktiv: false, sparerPauschbetrag: 1000, kirchensteuerSatz: 0 },
                tranches: [{ trancheId: 'equity-1', type: 'aktien_neu', category: 'equity', marketValue: 100000, costBasis: 90000, tqf: 0.3 }],
                balanceState: { lastState: { taxState: { lossCarry: 0 } } }
            }
        ];
        const runs = handlers.runProfilverbundProfileSimulations({
            floorBedarf: 12000,
            flexBedarf: 0,
            aktuellesAlter: 65,
            inflation: 2,
            tagesgeld: 0,
            geldmarktEtf: 0,
            goldAktiv: false,
            goldWert: 0,
            goldFloorProzent: 0,
            goldZielProzent: 0,
            runwayTargetMonths: 36,
            runwayMinMonths: 24,
            risikoprofil: 'sicherheits-dynamisch',
            endeVJ: 70,
            endeVJ_1: 100,
            endeVJ_2: 100,
            endeVJ_3: 100,
            ath: 100,
            jahreSeitAth: 1,
            decumulation: { mode: '3_bucket_jilge', drawdownTrigger: -0.15, bondTargetFactor: 5 },
            sparerPauschbetrag: 1000,
            kirchensteuerSatz: 0
        }, profiles);

        assertEqual(engineCalls, 1, '3-bucket Profilverbund performs no profile-engine reruns');
        assertEqual(runs.threeBucketDiagnosis.isBadYear, true, 'Household diagnosis records the bad-year replacement');
        assertEqual(runs.finalAction.quellen.length, 1, 'Household replacement produces one final source');
        assertEqual(runs.finalAction.quellen[0].sourceProfileId, 'bond-owner', 'Bond sale keeps exact profile ownership');
        assertEqual(runs.finalAction.quellen[0].kind, 'anleihe', 'Final action replaces the equity sale with a bond sale');
        assertEqual(runs.finalAction.quellen.some(source => source.kind === 'aktien_neu'), false,
            'No second profile action reintroduces the blocked equity sale');
    }

    console.log('Test 7: Engine handshake and update result contracts fail closed');
    {
        const compatibleEngine = {
            getVersion: () => ({ api: '31.7', build: 'test-build' }),
            simulateSingleYear: () => ({ newState: {}, ui: {}, diagnosis: {} })
        };
        const handshake = createEngineHandshake(compatibleEngine, '31.');
        assertEqual(handshake.version.api, '31.7', 'Kompatible Engine-Major-Version besteht den Handshake');
        assertEqual(assertActiveEngineHandshake(handshake, compatibleEngine), compatibleEngine,
            'Aktiver Handshake liefert exakt die gebundene Engine zurueck');

        const captureGateError = callback => {
            try {
                callback();
                return null;
            } catch (error) {
                return error;
            }
        };
        const missingEngine = captureGateError(() => createEngineHandshake(undefined, '31.'));
        assertEqual(missingEngine?.reason, 'missing_engine', 'Fehlende Engine wird fail-closed abgewiesen');

        const incompleteEngine = captureGateError(() => createEngineHandshake({
            getVersion: () => ({ api: '31.7' }),
            simulateSingleYear: () => ({})
        }, '31.'));
        assertEqual(incompleteEngine?.reason, 'invalid_version', 'Unvollstaendige Versionsantwort wird abgewiesen');

        const incompatibleEngine = captureGateError(() => createEngineHandshake({
            getVersion: () => ({ api: '30.9', build: 'old-build' }),
            simulateSingleYear: () => ({})
        }, '31.'));
        assertEqual(incompatibleEngine?.reason, 'incompatible_version', 'Inkompatible Engine-Major-Version wird abgewiesen');

        const replacedContract = captureGateError(() => assertActiveEngineHandshake(handshake, {
            ...compatibleEngine
        }));
        assertEqual(replacedContract?.reason, 'contract_changed', 'Engine-Austausch nach dem Handshake blockiert das Update');

        const validationResult = createUpdateFailureResult(
            new ValidationError([{ fieldId: 'floorBedarf', message: 'ungueltig' }]),
            { phase: 'validation' }
        );
        assertEqual(validationResult.status, BALANCE_UPDATE_STATUS.VALIDATION_ERROR,
            'Eingabefehler liefern validation_error');

        const engineResult = createUpdateFailureResult(new Error('Engine fehlgeschlagen'), { phase: 'engine' });
        assertEqual(engineResult.status, BALANCE_UPDATE_STATUS.ENGINE_ERROR,
            'Engine-Ausfuehrungsfehler liefern engine_error');

        const blockedResult = createUpdateFailureResult(replacedContract, { phase: 'engine_gate' });
        assertEqual(blockedResult.status, BALANCE_UPDATE_STATUS.BLOCKED,
            'Engine-Gate-Fehler liefern blocked');
        assertEqual(blockedResult.reason, 'contract_changed', 'Blocked-Ergebnis behaelt den maschinenlesbaren Gate-Grund');

        const successResult = createUpdateSuccessResult({ marker: true });
        assertEqual(successResult.status, BALANCE_UPDATE_STATUS.SUCCESS, 'Erfolgreiches Update liefert success');
        assertEqual(successResult.ok, true, 'Success-Status bleibt mit bestehendem ok-Contract kompatibel');
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
        if (prevReplaceStateFromImport === undefined) delete StorageManager.replaceStateFromImport; else StorageManager.replaceStateFromImport = prevReplaceStateFromImport;
        if (prevRollbackImportReplace === undefined) delete StorageManager.rollbackImportReplace; else StorageManager.rollbackImportReplace = prevRollbackImportReplace;
        if (prevApplyStoredInputs === undefined) delete UIReader.applyStoredInputs; else UIReader.applyStoredInputs = prevApplyStoredInputs;
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
