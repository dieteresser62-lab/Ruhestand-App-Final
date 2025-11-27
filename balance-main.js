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
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile'),
        btnJahresUpdate: document.getElementById('btnJahresUpdate'),
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
    }
};

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
function update() {
    try {
        UIRenderer.clearError();

        // 1. Read Inputs & State
        // Liest alle Formular-Eingaben und den letzten gespeicherten Zustand
        const inputData = UIReader.readAllInputs();
        const persistentState = StorageManager.loadState();

        // Debug-Logging (nur im Debug-Modus aktiv)
        DebugUtils.log('UPDATE', 'Starting update cycle', {
            inputs: inputData,
            persistentState: persistentState
        });

        // 2. Render Bedarfsanpassungs-UI
        // Zeigt Button für Inflationsanpassung, wenn das Alter sich geändert hat
        UIRenderer.renderBedarfAnpassungUI(inputData, persistentState);

        appState.lastUpdateTimestamp = Date.now();

        // 3. Call Engine
        // Die externe Engine (engine.js) berechnet alle Werte
        // Input: Benutzereingaben + letzter State
        // Output: {input, newState, diagnosis, ui} oder {error}
        const modelResult = window.EngineAPI.simulateSingleYear(inputData, persistentState.lastState);

        DebugUtils.log('ENGINE', 'Engine simulation result', modelResult);

        // 4. Handle Engine Response
        // Bei Fehler: Exception werfen für einheitliches Error-Handling
        if (modelResult.error) {
            throw modelResult.error;
        }

        // 5. Prepare data for Renderer
        // Kombiniert Engine-Output mit Eingaben für vollständige UI-Darstellung
        const uiDataForRenderer = {
            ...modelResult.ui,
            input: inputData
        };

        // 6. Render & Save
        // Rendert alle UI-Komponenten: Summary, Liquiditätsbalken, Handlungsanweisung, etc.
        UIRenderer.render(uiDataForRenderer);

        // Bereitet Diagnose-Daten auf und rendert das Diagnose-Panel
        const formattedDiagnosis = UIRenderer.formatDiagnosisPayload(modelResult.diagnosis);

        // Design-Note: Die Transaktionsdiagnostik wird unverändert aus der Engine übernommen,
        // damit UI und Export dieselben Kennzahlen nutzen können.
        if (formattedDiagnosis && modelResult.ui?.action?.transactionDiagnostics) {
            formattedDiagnosis.transactionDiagnostics = modelResult.ui.action.transactionDiagnostics;
        }

        appState.diagnosisData = formattedDiagnosis;
        UIRenderer.renderDiagnosis(appState.diagnosisData);

        DebugUtils.log('DIAGNOSIS', 'Diagnosis data', appState.diagnosisData);

        // Speichert Eingaben und neuen Zustand in localStorage
        StorageManager.saveState({ ...persistentState, inputs: inputData, lastState: modelResult.newState });

        DebugUtils.log('UPDATE', 'Update cycle completed successfully');

    } catch (error) {
        console.error("Update-Fehler:", error);
        DebugUtils.log('ERROR', 'Update failed', error);
        UIRenderer.handleError(error);
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
function init() {
    try {
        // 1. Engine Handshake
        // Prüft ob engine.js geladen ist und die Version kompatibel ist
        initVersionHandshake();
        console.info("Engine ready and handshake successful.", window.EngineAPI.getVersion());
    } catch (e) {
        console.error("Initialisierung abgebrochen wegen Engine-Fehler.");
        return;
    }

    // 2. Initialize Debug Mode
    // Prüft localStorage: 'balance.debugMode' = '1' oder Query-Parameter ?debug=1
    const isDebugMode = DebugUtils.initDebugMode();

    // 3. Populate DOM inputs
    // Sammelt alle input/select-Elemente mit ID in dom.inputs{}
    document.querySelectorAll('input, select').forEach(el => {
        if(el.id) dom.inputs[el.id] = el;
    });

    // 4. Initialize all modules with their dependencies
    // Dependency Injection Pattern: Jedes Modul erhält seine Abhängigkeiten
    initUIReader(dom);
    initStorageManager(dom, appState, UIRenderer);
    initUIRenderer(dom, StorageManager);
    initUIBinder(dom, appState, update, debouncedUpdate);

    // 5. Set version info
    // Zeigt UI- und Engine-Version im Print-Footer
    dom.outputs.printFooter.textContent = `UI: ${CONFIG.APP.VERSION} | Engine: ${window.EngineAPI.getVersion().api}`;

    // 6. Load and apply saved state
    // Lädt letzten Zustand aus localStorage und wendet ihn auf die Formular-Felder an
    const persistentState = StorageManager.loadState();
    UIReader.applyStoredInputs(persistentState.inputs);

    // 7. Bind UI events
    // Registriert alle Event-Listener (input, change, click, keyboard shortcuts)
    UIBinder.bindUI();

    // 8. Update Debug UI
    // Zeigt Debug-Indikator an, wenn Debug-Modus aktiv
    if (isDebugMode) {
        const debugIndicator = document.getElementById('debugModeIndicator');
        if (debugIndicator) {
            debugIndicator.style.display = 'flex';
        }
        DebugUtils.log('INIT', 'Balance App initialized in Debug Mode');
    }

    // 10. Initialize snapshots
    // Prüft ob File System API verfügbar ist und lädt Snapshot-Liste
    StorageManager.initSnapshots().then(() => {
        StorageManager.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
    });

    // 11. Initial update
    // Führt ersten Berechnungs- und Render-Zyklus durch
    update();
}

// ==================================================================================
// APPLICATION ENTRY POINT
// ==================================================================================

document.addEventListener('DOMContentLoaded', init);
