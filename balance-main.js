"use strict";

/**
 * ===================================================================================
 * BALANCE-APP HAUPTMODUL - ES6 VERSION
 * ===================================================================================
 */

import { CONFIG, REQUIRED_ENGINE_API_VERSION_PREFIX, DebugUtils } from './balance-config.js';
import { StorageManager, initStorageManager } from './balance-storage.js';
import { UIReader, initUIReader } from './balance-reader.js';
import { UIRenderer, initUIRenderer } from './balance-renderer.js';
import { UIBinder, initUIBinder } from './balance-binder.js';

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
        snapshotList: document.getElementById('snapshotList'),
        printFooter: document.getElementById('print-footer')
    },
    inputs: {}, // Wird in init() gefüllt
    controls: {
        depotLastUpdated: document.getElementById('depotLastUpdated'),
        themeToggle: document.getElementById('themeToggle'),
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile'),
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
        keyParams: document.getElementById('diag-key-params')
    }
};

// ==================================================================================
// CORE APPLICATION FUNCTIONS
// ==================================================================================

/**
 * Haupt-Update-Funktion: Liest UI, ruft die EXTERNE ENGINE auf, rendert Ergebnis, speichert Zustand.
 */
function update() {
    try {
        UIRenderer.clearError();

        // 1. Read Inputs & State
        const inputData = UIReader.readAllInputs();
        const persistentState = StorageManager.loadState();

        DebugUtils.log('UPDATE', 'Starting update cycle', {
            inputs: inputData,
            persistentState: persistentState
        });

        // 2. Render Bedarfsanpassungs-UI
        UIRenderer.renderBedarfAnpassungUI(inputData, persistentState);

        appState.lastUpdateTimestamp = Date.now();

        // 3. Call Engine
        const modelResult = window.EngineAPI.simulateSingleYear(inputData, persistentState.lastState);

        DebugUtils.log('ENGINE', 'Engine simulation result', modelResult);

        // 4. Handle Engine Response
        if (modelResult.error) {
            throw modelResult.error;
        }

        // 5. Prepare data for Renderer
        const uiDataForRenderer = {
            ...modelResult.ui,
            input: inputData
        };

        // 6. Render & Save
        UIRenderer.render(uiDataForRenderer);

        appState.diagnosisData = UIRenderer.formatDiagnosisPayload(modelResult.diagnosis);
        UIRenderer.renderDiagnosis(appState.diagnosisData);

        DebugUtils.log('DIAGNOSIS', 'Diagnosis data', appState.diagnosisData);

        StorageManager.saveState({ ...persistentState, inputs: inputData, lastState: modelResult.newState });

        DebugUtils.log('UPDATE', 'Update cycle completed successfully');

    } catch (error) {
        console.error("Update-Fehler:", error);
        DebugUtils.log('ERROR', 'Update failed', error);
        UIRenderer.handleError(error);
    }
}

function debouncedUpdate() {
    clearTimeout(appState.debounceTimer);
    appState.debounceTimer = setTimeout(update, 250);
}

/**
 * Führt den Engine-Handshake beim Start durch.
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

        console.log(`Engine Handshake erfolgreich. API v${version.api} (Build: ${version.build}) geladen.`);

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
 * Initialisiert die Anwendung: Bindet UI-Events, lädt Daten und führt das erste Update aus.
 */
function init() {
    try {
        // 1. Engine Handshake
        initVersionHandshake();
        console.info("Engine ready and handshake successful.", window.EngineAPI.getVersion());
    } catch (e) {
        console.error("Initialisierung abgebrochen wegen Engine-Fehler.");
        return;
    }

    // 2. Initialize Debug Mode
    const isDebugMode = DebugUtils.initDebugMode();

    // 3. Populate DOM inputs
    document.querySelectorAll('input, select').forEach(el => {
        if(el.id) dom.inputs[el.id] = el;
    });

    // 4. Initialize all modules with their dependencies
    initUIReader(dom);
    initStorageManager(dom, appState, UIRenderer);
    initUIRenderer(dom, StorageManager);
    initUIBinder(dom, appState, update, debouncedUpdate);

    // 5. Set version info
    dom.outputs.printFooter.textContent = `UI: ${CONFIG.APP.VERSION} | Engine: ${window.EngineAPI.getVersion().api}`;

    // 6. Load and apply saved state
    const persistentState = StorageManager.loadState();
    UIReader.applyStoredInputs(persistentState.inputs);

    // 7. Bind UI events
    UIBinder.bindUI();

    // 8. Apply theme
    UIRenderer.applyTheme(localStorage.getItem('theme') || 'system');

    // 9. Update Debug UI
    if (isDebugMode) {
        const debugIndicator = document.getElementById('debugModeIndicator');
        if (debugIndicator) {
            debugIndicator.style.display = 'flex';
        }
        DebugUtils.log('INIT', 'Balance App initialized in Debug Mode');
    }

    // 10. Initialize snapshots
    StorageManager.initSnapshots().then(() => {
        StorageManager.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
    });

    // 11. Initial update
    update();
}

// ==================================================================================
// APPLICATION ENTRY POINT
// ==================================================================================

document.addEventListener('DOMContentLoaded', init);
