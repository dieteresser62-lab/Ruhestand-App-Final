/**
 * Module: Balance Main
 * Purpose: The central entry point and orchestrator for the Balance App (ES6 version).
 *          It initializes the application, handles the main update loop, manages state, and coordinates
 *          interactions between the UI, Storage, and the Calculation Engine.
 * Usage: Loaded as the main script in the HTML file.
 * Dependencies: balance-config.js, balance-storage.js, balance-reader.js, balance-renderer.js, balance-binder.js, engine.js (global)
 */
"use strict";

/**
 * ===================================================================================
 * BALANCE-APP HAUPTMODUL - ES6 VERSION
 * ===================================================================================
 */

import { CONFIG, REQUIRED_ENGINE_API_VERSION_PREFIX } from './balance-config.js';
import { StorageManager, initStorageManager } from './balance-storage.js';
import { UIReader, initUIReader } from './balance-reader.js';
import { UIRenderer, initUIRenderer } from './balance-renderer.js';
import { UIBinder, initUIBinder } from './balance-binder.js';
import { initTranchenStatus, syncTranchenToInputs } from '../tranches/depot-tranchen-status.js';
import { loadProfilverbundProfiles } from '../profile/profilverbund-balance.js';
import { createProfilverbundHandlers } from './balance-main-profilverbund.js';
import { createProfileSyncHandlers } from './balance-main-profile-sync.js';
import { UIUtils } from './balance-utils.js';
import { initExpensesTab, updateExpensesBudget } from './balance-expenses.js';
import { initDynamicFlexControls } from '../simulator/simulator-main-dynamic-flex.js';
import { init as initPersistence } from '../shared/persistence-facade.js';
import { PROFILE_VALUE_KEYS } from '../profile/profile-state.js';
import { postprocessBalanceAction } from './balance-action-postprocessor.js';
import {
    buildBalanceRendererPayload,
    calculateExpensesBudget,
    enrichBalanceDiagnosisPayload,
    persistBalanceUpdate,
    prepareEngineLastState,
    validateBalanceInputs
} from './balance-update-pipeline.js';

// ==================================================================================
// APPLICATION STATE & DOM REFERENCES
// ==================================================================================

const appState = {
    debounceTimer: null,
    snapshotHandle: null,
    diagnosisData: null,
    lastUpdateTimestamp: null,
    lastMarktData: null
};

const PROFILVERBUND_STORAGE_KEYS = {
    mode: 'household_withdrawal_mode'
};

const dom = {
    outputs: {
        miniSummary: document.getElementById('miniSummary'),
        depotwert: document.getElementById('displayDepotwert'),
        neuerBedarf: document.getElementById('neuerBedarf'),
        zielLiquiditaet: document.getElementById('zielLiquiditaet'),
        liquiditaetBalken: document.getElementById('liquiditaetBalken'),
        balkenContainer: document.querySelector('.progress-bar-container'),
        marktstatusText: document.getElementById('marktstatusText'),
        monatlicheEntnahme: document.getElementById('monatlicheEntnahme'),
        handlungsanweisung: document.getElementById('handlungsanweisung'),
        minGoldDisplay: document.getElementById('minGoldDisplay'),
        entnahmeDetailsContent: document.getElementById('entnahmeDetailsContent'),
        entnahmeBreakdown: document.getElementById('entnahme-breakdown'),
        healthBucketSummary: document.getElementById('healthBucketSummary'),
        snapshotList: document.getElementById('snapshotList'),
        printFooter: document.getElementById('print-footer')
    },
    inputs: {}, // Wird in init() gefüllt
    controls: {
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile'),
        btnJahresUpdate: document.getElementById('btnJahresUpdate'),
        btnJahresUpdateLog: document.getElementById('btnJahresUpdateLog'),
        btnNachruecken: document.getElementById('btnNachruecken'),
        btnUndoNachruecken: document.getElementById('btnUndoNachruecken'),
        btnCsvImport: document.getElementById('btnCsvImport'),
        csvFileInput: document.getElementById('csvFileInput'),
        copyAction: document.getElementById('copyAction'),
        resetBtn: document.getElementById('resetBtn'),
        jahresabschlussBtn: document.getElementById('jahresabschlussBtn'),
        connectFolderBtn: document.getElementById('connectFolderBtn'),
        snapshotStatus: document.getElementById('snapshotStatus'),
        goldPanel: document.getElementById('goldPanel')
    },
    containers: {
        error: document.getElementById('error-container'),
        bedarfAnpassung: document.getElementById('bedarfAnpassungContainer'),
        tabButtons: document.querySelector('.tab-buttons'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        form: document.querySelector('.form-column'),
        versionAlert: document.getElementById('engine-version-alert')
    },
    diagnosis: {
        drawer: document.getElementById('diagnosisDrawer'),
        overlay: document.getElementById('drawerOverlay'),
        openBtn: document.getElementById('openDiagnosisBtn'),
        closeBtn: document.getElementById('closeDiagnosisBtn'),
        copyBtn: document.getElementById('copyDiagnosisBtn'),
        filterToggle: document.getElementById('diagFilterToggle'),
        content: document.getElementById('diagContent'),
        chips: document.getElementById('diag-chips'),
        decisionTree: document.getElementById('diag-decision-tree'),
        guardrails: document.getElementById('diag-guardrails'),
        transaction: document.getElementById('diag-transaction'),
        keyParams: document.getElementById('diag-key-params')
    },
    expenses: {
        annualBudget: document.getElementById('expensesAnnualBudget'),
        monthlyBudget: document.getElementById('expensesMonthlyBudget'),
        annualRemaining: document.getElementById('expensesAnnualRemaining'),
        annualUsed: document.getElementById('expensesAnnualUsed'),
        annualForecast: document.getElementById('expensesAnnualForecast'),
        forecastSub: document.getElementById('expensesForecastSub'),
        ytdValue: document.getElementById('expensesYtdValue'),
        ytdSub: document.getElementById('expensesYtdSub'),
        yearSelect: document.getElementById('expensesYearSelect'),
        table: document.getElementById('expensesTable'),
        csvInput: document.getElementById('expensesCsvInput'),
        detailDialog: document.getElementById('expensesDetailDialog'),
        detailTitle: document.getElementById('expensesDetailTitle'),
        detailBody: document.getElementById('expensesDetailBody'),
        detailClose: document.getElementById('expensesDetailClose')
    }
};

const profilverbundHandlers = createProfilverbundHandlers({
    dom,
    PROFILVERBUND_STORAGE_KEYS
});
const profileSyncHandlers = createProfileSyncHandlers({
    dom,
    PROFILE_VALUE_KEYS
});

// ==================================================================================
// CORE APPLICATION FUNCTIONS
// ==================================================================================

/**
 * Haupt-Update-Funktion - Kern der Balance-App
 *
 * Diese Funktion orchestriert den kompletten Update-Zyklus:
 * 1. Liest alle UI-Eingaben (Vermögen, Bedarf, Marktdaten)
 * 2. Lädt persistenten Zustand (Guardrail-History)
 * 3. Ruft die externe Engine auf (engine.js)
 * 4. Rendert alle Ergebnisse in der UI
 * 5. Speichert den neuen Zustand
 *
 * Wird aufgerufen bei:
 * - Initialisierung der App
 * - Änderung von Input-Feldern (debounced)
 * - Import von Daten
 * - Jahresabschluss
 */
function update({ persist = true } = {}) {
    try {
        UIRenderer.clearError();

        // Keep profile-derived values in sync before reading inputs.
        profileSyncHandlers.syncProfileDerivedInputs();

        // 1. Read Inputs & State
        // Liest alle Formular-Eingaben und den letzten gespeicherten Zustand
        const inputData = UIReader.readAllInputs();
        validateBalanceInputs(inputData);
        const profilverbundProfiles = loadProfilverbundProfiles();
        profilverbundHandlers.updateProfilverbundGlobals(profilverbundProfiles, inputData);

        // Check for empty/initial state to avoid validation errors
        if (!inputData.aktuellesAlter || inputData.aktuellesAlter === 0) {
            UIRenderer.clearError();
            // Optionally clear results or show specific "Start" message
            // For now, just return to keep UI clean
            return { ok: true, skipped: true };
        }

        const persistentState = StorageManager.loadState();
        const lastState = prepareEngineLastState(persistentState, inputData);

        // Profilverbund runs are computed only for multi-profile households.
        const isMultiProfileHousehold = profilverbundProfiles.length > 1;
        const householdStateSource = profilverbundProfiles
            .find(entry => entry?.balanceState?.profilverbundHouseholdLastState)
            ?.balanceState || persistentState;
        const householdLastState = isMultiProfileHousehold
            ? prepareEngineLastState({
                inputs: householdStateSource.profilverbundHouseholdInputs,
                lastState: householdStateSource.profilverbundHouseholdLastState
            }, inputData)
            : null;
        const profilverbundRuns = isMultiProfileHousehold
            ? profilverbundHandlers.runProfilverbundProfileSimulations(inputData, profilverbundProfiles, householdLastState)
            : null;
        if (!profilverbundRuns && typeof window !== 'undefined') {
            window.__profilverbundActionResults = null;
        }

        // 2. Render Bedarfsanpassungs-UI
        // Zeigt Button für Inflationsanpassung, wenn das Alter sich geändert hat
        UIRenderer.renderBedarfAnpassungUI(inputData, persistentState);

        appState.lastUpdateTimestamp = Date.now();

        // 3. Call Engine
        // Die externe Engine (engine.js) berechnet alle Werte
        // Input: Benutzereingaben + letzter State
        // Output: {input, newState, diagnosis, ui} oder {error}
        const modelResult = profilverbundRuns?.householdResult
            || window.EngineAPI.simulateSingleYear(inputData, lastState);

        // 4. Handle Engine Response
        // Bei Fehler: Exception werfen für einheitliches Error-Handling
        if (modelResult.error) {
            throw modelResult.error;
        }
        const { threeBucketDiagnosis } = postprocessBalanceAction({
            inputData,
            modelResult,
            profilverbundRuns,
            mergeProfilverbundActions: profilverbundHandlers.mergeProfilverbundActions
        });

        // 5. Prepare data for Renderer
        // Kombiniert Engine-Output mit Eingaben für vollständige UI-Darstellung
        const uiDataForRenderer = buildBalanceRendererPayload(modelResult, inputData);

        // 6. Render & Save
        // Rendert alle UI-Komponenten: Summary, Liquiditätsbalken, Handlungsanweisung, etc.
        UIRenderer.render(uiDataForRenderer);

        // Bereitet Diagnose-Daten auf und rendert das Diagnose-Panel
        const formattedDiagnosis = enrichBalanceDiagnosisPayload({
            formattedDiagnosis: UIRenderer.formatDiagnosisPayload(modelResult.diagnosis),
            modelResult,
            inputData,
            threeBucketDiagnosis
        });

        appState.diagnosisData = formattedDiagnosis;
        UIRenderer.renderDiagnosis(appState.diagnosisData);

        // Speichert Eingaben und neuen Zustand
        // Persist per-profile states to keep each profile's guardrails stable.
        if (persist) {
            persistBalanceUpdate({
                profilverbundRuns,
                profilverbundHandlers,
                storageManager: StorageManager,
                persistentState,
                inputData,
                modelResult
            });

            profilverbundHandlers.refreshProfilverbundBalance();
        }

        const fixedIncomeAnnual = UIUtils.parseCurrency(dom.inputs.fixedIncomeAnnual?.value || 0);
        const { monthlyBudget, annualBudget } = calculateExpensesBudget({
            fixedIncomeAnnual,
            monthlyWithdrawal: modelResult.ui?.spending?.monatlicheEntnahme
        });
        updateExpensesBudget({ monthlyBudget, annualBudget });

        return { ok: true, inputData, modelResult };

    } catch (error) {
        console.error("Update-Fehler:", error);
        UIRenderer.handleError(error);
        return { ok: false, error };
    }
}

/**
 * Debounced Update-Funktion
 *
 * Verzögert den Update-Aufruf um 250ms, um bei schnellen Eingaben
 * (z.B. Tippen in Zahlenfeldern) nicht zu viele Updates auszulösen.
 * Spart Performance und reduziert Flackern.
 */
function debouncedUpdate() {
    clearTimeout(appState.debounceTimer);
    appState.debounceTimer = setTimeout(update, 250);
}

/**
 * Führt den Engine-Handshake beim Start durch
 *
 * Überprüft:
 * 1. Ob engine.js geladen wurde
 * 2. Ob die API-Version kompatibel ist (v31.x erforderlich)
 * 3. Zeigt ggf. Warnbanner bei Versionsinkompatibilität
 *
 * @throws {Error} Wenn Engine nicht geladen oder ungültig
 */
function initVersionHandshake() {
    try {
        if (typeof window.EngineAPI === 'undefined' || typeof window.EngineAPI.getVersion !== 'function') {
            throw new Error("EngineAPI (engine.js) konnte nicht geladen werden oder ist ungültig.");
        }

        const version = window.EngineAPI.getVersion();
        if (!version || typeof version.api !== 'string' || typeof version.build !== 'string') {
            throw new Error("EngineAPI.getVersion() liefert ein ungültiges Format.");
        }

        // Version Handshake
        if (!version.api.startsWith(REQUIRED_ENGINE_API_VERSION_PREFIX)) {
            const alertBanner = dom.containers.versionAlert;
            alertBanner.textContent = `WARNUNG: Veraltete Engine-Version erkannt (Geladen: ${version.api}, Erwartet: ${REQUIRED_ENGINE_API_VERSION_PREFIX}x). Die App ist möglicherweise instabil. Bitte aktualisieren Sie die Engine-Datei (engine.js).`;
            alertBanner.style.display = 'block';
            alertBanner.tabIndex = -1;
        }

        // Cache-Busting
        const scriptTag = document.querySelector('script[src^="engine.js"]');
        if (scriptTag && version.build) {
            const newSrc = `engine.js?v=${version.build}`;
            if (scriptTag.src !== newSrc) {
                scriptTag.src = newSrc;
            }
        }

    } catch (e) {
        // Harter Fehler, wenn die Engine fehlt
        const alertBanner = dom.containers.versionAlert;
        alertBanner.textContent = `FATALER FEHLER: ${e.message}. Die Anwendung kann nicht gestartet werden.`;
        alertBanner.style.display = 'block';
        alertBanner.style.backgroundColor = 'var(--danger-color)';
        alertBanner.style.color = 'white';
        alertBanner.tabIndex = -1;
        throw new Error("Engine Load Failed");
    }
}

/**
 * Initialisiert die Anwendung - Entry Point
 *
 * Ablauf:
 * 1. Engine-Handshake (Versions-Check)
 * 2. Debug-Modus initialisieren
 * 3. DOM-Referenzen sammeln
 * 4. Alle Module initialisieren (mit Dependency Injection)
 * 5. Gespeicherten Zustand laden und anwenden
 * 6. Event-Listener binden
 * 7. Theme anwenden
 * 8. Snapshot-System initialisieren
 * 9. Erstes Update durchführen
 *
 * Module-Architektur:
 * - UIReader: Liest DOM-Eingaben
 * - StorageManager: localStorage + File System API
 * - UIRenderer: Rendert alle UI-Komponenten
 * - UIBinder: Event-Handler für alle Interaktionen
 */
async function init() {
    await initPersistence();
    try {
        // 1. Engine Handshake
        // Prüft ob engine.js geladen ist und die Version kompatibel ist
        initVersionHandshake();
        console.info("Engine ready and handshake successful.", window.EngineAPI.getVersion());
    } catch (e) {
        console.error("Initialisierung abgebrochen wegen Engine-Fehler.");
        return;
    }

    // 2. Populate DOM inputs
    // Sammelt alle input/select-Elemente mit ID in dom.inputs{}
    document.querySelectorAll('input, select').forEach(el => {
        if (el.id) dom.inputs[el.id] = el;
    });

    // 4. Initialize all modules with their dependencies
    // Dependency Injection Pattern: Jedes Modul erhält seine Abhängigkeiten
    initUIReader(dom);
    initStorageManager(dom, appState, UIRenderer);
    initUIRenderer(dom, StorageManager);
    initUIBinder(dom, appState, update, debouncedUpdate);
    initExpensesTab(dom);

    // 5. Set version info
    // Zeigt UI- und Engine-Version im Print-Footer
    dom.outputs.printFooter.textContent = `UI: ${CONFIG.APP.VERSION} | Engine: ${window.EngineAPI.getVersion().api}`;

    // 6. Load and apply saved state
    // Lädt letzten Zustand aus localStorage und wendet ihn auf die Formular-Felder an
    const persistentState = StorageManager.loadState();
    UIReader.applyStoredInputs(persistentState.inputs);
    profileSyncHandlers.syncProfileDerivedInputs();
    syncTranchenToInputs({ silent: true });
    initDynamicFlexControls({ enableLocalPersistence: false });

    // 7. Bind UI events
    // Registriert alle Event-Listener (input, change, click, keyboard shortcuts)
    UIBinder.bindUI();

    // 8. Initialize snapshots
    // Prüft ob File System API verfügbar ist und lädt Snapshot-Liste
    StorageManager.initSnapshots().then(() => {
        StorageManager.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
    });

    // 9. Initial update
    // Führt ersten Berechnungs- und Render-Zyklus durch
    update();

    // 10. Initialize Depot-Tranchen Status Badge
    // Zeigt Status der geladenen detaillierten Tranchen an
    initTranchenStatus('tranchenStatusBadge');

    profilverbundHandlers.initProfilverbundBalance();
}

// ==================================================================================
// APPLICATION ENTRY POINT
// ==================================================================================

document.addEventListener('DOMContentLoaded', init);
