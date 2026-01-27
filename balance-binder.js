/**
 * Module: Balance Binder (UI Binder)
 * Purpose: Centralizes Event Handling and wiring for the Balance App.
 *          It connects DOM events (clicks, inputs, shortcuts) to the appropriate logic handlers (Annual, Imports, Diagnosis, Snapshots).
 * Usage: Initialized by balance-main.js to set up all event listeners.
 * Dependencies: balance-reader.js, balance-renderer.js, balance-storage.js, balance-binder-*.js
 */
"use strict";

/**
 * ===================================================================================
 * BALANCE-APP EVENT-HANDLER
 * ===================================================================================
 */

import { UIUtils } from './balance-utils.js';
import { UIReader } from './balance-reader.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';
import { createAnnualHandlers } from './balance-binder-annual.js';
import { createImportExportHandlers } from './balance-binder-imports.js';
import { createDiagnosisHandlers } from './balance-binder-diagnosis.js';
import { createSnapshotHandlers } from './balance-binder-snapshots.js';

// Module-level references
let dom = null;
let appState = null;
let update = null;
let debouncedUpdate = null;
let lastUpdateResults = null;
let handlers = null;

/**
 * Initialisiert den UIBinder mit den notwendigen Abhängigkeiten
 */
export function initUIBinder(domRefs, state, updateFn, debouncedUpdateFn) {
    dom = domRefs;
    appState = state;
    update = updateFn;
    debouncedUpdate = debouncedUpdateFn;
    const annual = createAnnualHandlers({
        dom,
        appState,
        update,
        debouncedUpdate,
        getLastUpdateResults: () => lastUpdateResults,
        setLastUpdateResults: (value) => { lastUpdateResults = value; }
    });
    const imports = createImportExportHandlers({ dom, debouncedUpdate, update });
    const diagnosis = createDiagnosisHandlers({ dom, appState });
    const snapshots = createSnapshotHandlers({
        dom,
        appState,
        debouncedUpdate,
        applyAnnualInflation: annual.applyAnnualInflation
    });
    handlers = { annual, imports, diagnosis, snapshots };
}

export const UIBinder = {
    bindUI() {
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        dom.containers.form.addEventListener('input', this.handleFormInput.bind(this));
        dom.containers.form.addEventListener('change', this.handleFormChange.bind(this));
        document.querySelectorAll('input.currency').forEach(el => {
            el.addEventListener('blur', (e) => {
                e.target.value = UIUtils.formatNumber(UIUtils.parseCurrency(e.target.value));
            });
        });

        dom.containers.tabButtons.addEventListener('click', this.handleTabClick.bind(this));
        dom.controls.resetBtn.addEventListener('click', this.handleReset.bind(this));
        dom.controls.copyAction.addEventListener('click', () => {
            navigator.clipboard.writeText(document.getElementById('handlungContent').innerText.trim())
                .then(() => UIRenderer.toast('Kopiert.'));
        });
        dom.containers.bedarfAnpassung.addEventListener('click', this.handleBedarfAnpassungClick.bind(this));
        dom.controls.btnJahresUpdate.addEventListener('click', this.handleJahresUpdate.bind(this));
        if (dom.controls.btnJahresUpdateLog) {
            dom.controls.btnJahresUpdateLog.addEventListener('click', this.handleShowUpdateLog.bind(this));
        }
        dom.controls.btnNachruecken.addEventListener('click', this.handleNachruecken.bind(this));
        dom.controls.btnUndoNachruecken.addEventListener('click', this.handleUndoNachruecken.bind(this));
        dom.controls.exportBtn.addEventListener('click', this.handleExport.bind(this));
        dom.controls.importBtn.addEventListener('click', () => dom.controls.importFile.click());
        dom.controls.importFile.addEventListener('change', this.handleImport.bind(this));
        dom.controls.btnCsvImport.addEventListener('click', () => dom.controls.csvFileInput.click());
        dom.controls.csvFileInput.addEventListener('change', this.handleCsvImport.bind(this));
        dom.controls.jahresabschlussBtn.addEventListener('click', this.handleJahresabschluss.bind(this));
        dom.controls.connectFolderBtn.addEventListener('click', () => {
            try { StorageManager.connectFolder(); }
            catch (error) { UIRenderer.handleError(error); }
        });

        dom.outputs.snapshotList.addEventListener('click', this.handleSnapshotActions.bind(this));

        const toggleDrawer = (isOpen) => {
            dom.diagnosis.drawer.classList.toggle('is-open', isOpen);
            dom.diagnosis.overlay.classList.toggle('is-open', isOpen);
        };
        dom.diagnosis.openBtn.addEventListener('click', () => toggleDrawer(true));
        dom.diagnosis.closeBtn.addEventListener('click', () => toggleDrawer(false));
        dom.diagnosis.overlay.addEventListener('click', () => toggleDrawer(false));
        dom.diagnosis.copyBtn.addEventListener('click', this.handleCopyDiagnosis.bind(this));
        dom.diagnosis.filterToggle.addEventListener('change', (e) => {
            dom.diagnosis.content.classList.toggle('filter-inactive', e.target.checked)
        });
    },

    handleKeyboardShortcuts(e) {
        // Alt+J: Jahresabschluss
        if (e.altKey && e.key === 'j') {
            e.preventDefault();
            dom.controls.jahresabschlussBtn.click();
            return;
        }

        // Alt+E: Export
        if (e.altKey && e.key === 'e') {
            e.preventDefault();
            dom.controls.exportBtn.click();
            return;
        }

        // Alt+I: Import
        if (e.altKey && e.key === 'i') {
            e.preventDefault();
            dom.controls.importBtn.click();
            return;
        }

        // Alt+N: Marktdaten nachrücken
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            dom.controls.btnNachruecken.click();
            return;
        }
    },

    handleFormInput(e) {
        const targetId = e.target.id;
        if (targetId && (targetId.startsWith('depotwert') || targetId === 'goldWert')) {
            const state = StorageManager.loadState();
            state.inputs = { ...(state.inputs || {}), depotLastUpdate: Date.now() };
            StorageManager.saveState(state);
        }
        debouncedUpdate();
    },

    handleFormChange() {
        UIReader.applySideEffectsFromInputs();
        debouncedUpdate();
    },

    handleTabClick(e) {
        const clickedButton = e.target.closest('.tab-btn');
        if (!clickedButton) return;
        dom.containers.tabButtons.querySelector('.active').classList.remove('active');
        clickedButton.classList.add('active');
        dom.containers.tabPanels.forEach(panel => panel.classList.remove('active'));
        document.getElementById('tab-' + clickedButton.dataset.tab).classList.add('active');
    },

    handleReset() {
        if (confirm("Alle gespeicherten Werte (inkl. Guardrail-Daten) zurücksetzen?")) {
            StorageManager.resetState();
            location.reload();
        }
    },

    handleBedarfAnpassungClick(e) {
        if (e.target.matches('.btn-apply-inflation')) {
            handlers.annual.applyInflationToBedarfe();
        }
    },

    handleNachruecken() {
        handlers.annual.handleNachruecken();
    },

    handleUndoNachruecken() {
        handlers.annual.handleUndoNachruecken();
    },

    handleExport() {
        handlers.imports.handleExport();
    },

    async handleImport(e) {
        return handlers.imports.handleImport(e);
    },

    async handleCsvImport(e) {
        return handlers.imports.handleCsvImport(e);
    },

    async handleFetchInflation() {
        return handlers.annual.handleFetchInflation();
    },

    /**
     * Führt den vollständigen Jahres-Update-Prozess aus (Inflation abrufen, Marktdaten nachrücken, Alter erhöhen)
     * und rendert anschließend das Ergebnis-Modal.
     * @returns {Promise<void>} Kein Rückgabewert; UI wird direkt aktualisiert.
     */
    async handleJahresUpdate() {
        return handlers.annual.handleJahresUpdate();
    },

    /**
     * Rendert das Ergebnis-Modal für den Jahres-Update-Prozess und bindet Close-Handler.
     * @param {Object} results Aggregiertes Ergebnisobjekt aus Inflation, ETF-Daten und Altersfortschritt.
     * @returns {void}
     */
    showUpdateResultModal(results) {
        return handlers.annual.showUpdateResultModal(results);
    },

    /**
     * Öffnet das Ergebnis-Modal erneut, um das letzte gespeicherte Protokoll anzuzeigen.
     * @returns {void}
     */
    handleShowUpdateLog() {
        return handlers.annual.handleShowUpdateLog();
    },

    async handleNachrueckenMitETF() {
        return handlers.annual.handleNachrueckenMitETF();
    },

    async handleJahresabschluss() {
        return handlers.snapshots.handleJahresabschluss();
    },

    async handleSnapshotActions(e) {
        return handlers.snapshots.handleSnapshotActions(e);
    },

    handleCopyDiagnosis() {
        return handlers.diagnosis.handleCopyDiagnosis();
    }
};
