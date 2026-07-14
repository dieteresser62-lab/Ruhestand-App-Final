import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UIBinder, initUIBinder } from '../app/balance/balance-binder.js';
import {
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
import { UIReader } from '../app/balance/balance-reader.js';
import { UIRenderer } from '../app/balance/balance-renderer.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import {
    BALANCE_UPDATE_STATUS,
    assertActiveEngineHandshake,
    createEngineHandshake,
    createUpdateFailureResult,
    createUpdateSuccessResult
} from '../app/balance/balance-update-pipeline.js';
import { PersistenceFacade } from '../app/shared/persistence-facade.js';
import { loadProfilverbundProfiles } from '../app/profile/profilverbund-balance.js';

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

    console.log('Test 2: Profilverbund init preserves membership and excludes opted-out profiles');
    {
        const documentRef = new MockDocument();
        const localStorageRef = createLocalStorageMock();
        installBrowserGlobals(documentRef, localStorageRef);
        PersistenceFacade.resetPersistenceForTests();

        const includedState = {
            inputs: {
                tagesgeld: 10000,
                depotwertAlt: 90000,
                costBasisAlt: 80000,
                renteAktiv: false,
                renteMonatlich: 0
            },
            lastState: { guardrailMarker: 'included-keep', taxState: { lossCarry: 111 } }
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

        const selectedProfiles = loadProfilverbundProfiles();
        assertEqual(selectedProfiles.length, 2, 'Nur ausgewaehlte Profile werden fuer den Profilverbund geladen');
        assertEqual(selectedProfiles[0].profileId, 'included', 'Opt-out-Profil wird nicht in Aggregate uebernommen');
        assertEqual(selectedProfiles[1].profileId, 'partner', 'Zweites Haushaltsprofil bleibt im Profilverbund');

        const aggregateInput = {
            floorBedarf: 1200,
            flexBedarf: 0,
            flexBudgetAnnual: 0,
            flexBudgetYears: 0,
            flexBudgetRecharge: 0
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

        handlers.persistProfilverbundProfileStates(runs);
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
        assertEqual(normalizedCurrent.sourceFormat, 'balance-state-v1', 'Aktuelles Exportformat wird eindeutig erkannt');
        assertEqual(normalizedCurrent.migrated, false, 'Aktuelles Exportformat wird nicht als Legacy markiert');
        assertEqual(normalizedCurrent.payload.inputs.floorBedarf, 24000, 'Validierung erhaelt gueltige Kernwerte');

        const legacyDocument = {
            app: CONFIG.APP.NAME,
            version: 'v21.1 Refactored (Engine v31)',
            payload: {
                ...validState,
                lastState: {
                    cumulativeInflationFactor: 9,
                    lastInflationAppliedAtAge: null,
                    taxState: { lossCarry: -1 }
                }
            }
        };
        const normalizedLegacy = normalizeBalanceImportDocument(legacyDocument);
        assertEqual(normalizedLegacy.sourceFormat, 'legacy-balance-export-v0', 'Unterstuetztes Legacy-Format laeuft ueber explizite Migration');
        assertEqual(normalizedLegacy.migrated, true, 'Legacy-Import wird als migriert markiert');
        assertEqual(normalizedLegacy.payload.lastState.cumulativeInflationFactor, 1, 'Legacy-Migration repariert den historischen Inflationsfaktor');
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
        const wrongAppError = captureImportError({ ...currentDocument, appId: 'fremde-app' });
        assert(wrongAppError instanceof BalanceImportError, 'Falsche App-ID liefert einen kontrollierten Importfehler');
        assertEqual(wrongAppError.code, 'wrong_app', 'Falsche App-ID ist maschinenlesbar');
        const wrongVersionError = captureImportError({ ...currentDocument, schemaVersion: 99 });
        assertEqual(wrongVersionError?.code, 'unsupported_version', 'Nicht unterstuetzte Schema-Version wird blockiert');
        const wrongShapeError = captureImportError({ inputs: validState.inputs });
        assertEqual(wrongShapeError?.code, 'unknown_shape', 'Unversionierter Rohzustand wird nicht als Legacy erraten');
        const invalidCoreError = captureImportError({
            ...currentDocument,
            payload: { ...validState, inputs: { ...validState.inputs, floorBedarf: -1 } }
        });
        assertEqual(invalidCoreError?.code, 'invalid_core_value', 'Ungueltige finanzielle Kernwerte werden vor der Mutation blockiert');
        const unsupportedLegacyError = captureImportError({ ...legacyDocument, version: 'v20.0' });
        assertEqual(unsupportedLegacyError?.code, 'unsupported_legacy_version', 'Nicht explizit migrierbare Legacy-Version wird blockiert');
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
        assertEqual(dryRunOptions[0].persist, false, 'Erste Engine-Pruefung ist explizit nicht persistent');
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
        assertEqual(successUpdateOptions[0].persist, false, 'Gueltiger Import prueft zuerst ohne Persistenz');
        assertEqual(successUpdateOptions[1], undefined, 'Erst nach Recovery und Replace folgt das persistente Update');
        assertEqual(replaceCalls, 1, 'Gueltiger Import ersetzt den Balance-State genau einmal');
        assertEqual(rollbackCalls, 0, 'Erfolgreicher Import benoetigt keinen Rollback');
        assert(toasts.some(message => message.includes('Recovery-Snapshot')), 'Erfolgsmeldung bestaetigt den Recovery-Punkt');

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
            simulateSingleYear() {
                engineCalls += 1;
                return {
                    newState: { marketData: { returns: { realEq: -0.2 } } },
                    diagnosis: { general: {} },
                    ui: {
                        spending: { monatlicheEntnahme: 1000 },
                        market: { sKey: 'bear_deep' },
                        zielLiquiditaet: 20000,
                        action: {
                            type: 'TRANSACTION',
                            title: 'Aktienverkauf',
                            nettoErlös: 10000,
                            steuer: 0,
                            quellen: [{
                                kind: 'aktien_neu',
                                sourceProfileId: 'equity-owner',
                                brutto: 10000,
                                netto: 10000,
                                steuer: 0,
                                realizedGainSigned: 0,
                                taxableAfterTqfSigned: 0
                            }],
                            verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                            taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                        }
                    }
                };
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
            tagesgeld: 0,
            geldmarktEtf: 0,
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
