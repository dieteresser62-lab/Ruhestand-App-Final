/**
 * Module: Balance Renderer
 * Purpose: The Facade pattern for all UI rendering operations.
 *          Delegates specific rendering tasks to SummaryRenderer, ActionRenderer, and DiagnosisRenderer.
 *          Also handles global UI feedback like Toasts and Error messages.
 * Usage: Used by balance-main.js to update the UI after calculations.
 * Dependencies: balance-renderer-summary.js, balance-renderer-action.js, balance-renderer-diagnosis.js
 */
"use strict";

/**
 * ===================================================================================
 * BALANCE-APP UI-RENDERER
 * ===================================================================================
 */

import { AppError, ValidationError } from './balance-config.js';
import { SummaryRenderer } from './balance-renderer-summary.js';
import { ActionRenderer } from './balance-renderer-action.js';
import { DiagnosisRenderer } from './balance-renderer-diagnosis.js';

// Module-level references
let dom = null;
let StorageManager = null;
let summaryRenderer = null;
let actionRenderer = null;
let diagnosisRenderer = null;
let toastTimer = null;
let toastRevision = 0;
const actionErrors = new Map();

function renderError(container, error, markFields = false) {
    container.className = 'error-warn';
    if (error instanceof ValidationError) {
        container.textContent = error.message;
        const ul = document.createElement('ul');
        error.errors.forEach(({ fieldId, message }) => {
            const li = document.createElement('li');
            li.textContent = message;
            ul.appendChild(li);
            if (markFields) dom.inputs?.[fieldId]?.classList.add('input-error');
        });
        container.appendChild(ul);
    } else if (error instanceof AppError) {
        container.textContent = `Ein interner Fehler ist aufgetreten: ${error.message}`;
    } else {
        container.textContent = `Ein unerwarteter Anwendungsfehler ist aufgetreten: ${error.message || 'Unbekannter Fehler'}`;
    }
}

function clearToast(container) {
    if (!container) return;
    container.replaceChildren();
    container.className = '';
}

/**
 * Initialisiert den UIRenderer mit den notwendigen Abhängigkeiten.
 *
 * @param {Object} domRefs - Zentraler DOM-Baum.
 * @param {Object} storageManager - Storage-Adapter für Fallbacks.
 */
export function initUIRenderer(domRefs, storageManager) {
    // Auch bereits bereitgestellte Callbacks verlieren bei Neuinitialisierung ihre Identität.
    toastRevision++;
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = null;
    clearToast(dom?.containers?.toast);
    clearToast(domRefs?.containers?.toast);
    dom?.containers?.actionError?.replaceChildren();
    domRefs?.containers?.actionError?.replaceChildren();
    actionErrors.clear();
    dom = domRefs;
    StorageManager = storageManager;
    summaryRenderer = new SummaryRenderer(domRefs, storageManager);
    actionRenderer = new ActionRenderer(domRefs);
    diagnosisRenderer = new DiagnosisRenderer(domRefs);
}

/**
 * Fassade für alle UI-Render-Aufgaben. Orchestriert spezialisierte Renderer
 * und kapselt generische Utility-Funktionen (Fehler, Toasts).
 */
export const UIRenderer = {
    /**
     * Orchestriert das Rendering der Gesamtoberfläche.
     *
     * @param {Object} ui - Aufbereitete UI-Daten (inkl. input, action, spending, liquiditaet).
     */
    render(ui) {
        if (!summaryRenderer || !actionRenderer) {
            return;
        }
        // Summary first, then action panel to keep layout stable.
        summaryRenderer.renderOverview(ui);
        actionRenderer.renderAction(ui?.action, ui?.input, ui?.spending, ui?.zielLiquiditaet);
    },

    /**
     * Delegiert die UI zur Bedarfsanpassung.
     *
     * @param {Object} inputData - Eingaben des Nutzers.
     * @param {Object} persistentState - Persistenter Zustand.
     */
    renderBedarfAnpassungUI(inputData, persistentState) {
        summaryRenderer?.renderBedarfAnpassungUI(inputData, persistentState);
    },

    /**
     * Reicht formatierte Diagnose-Daten an den DiagnosisRenderer durch.
     *
     * @param {Object} diagnosis - Diagnose-Struktur aus der Engine.
     */
    renderDiagnosis(diagnosis) {
        diagnosisRenderer?.renderDiagnosis(diagnosis);
    },

    /**
     * Formatiert Diagnose-Rohdaten über den DiagnosisRenderer.
     *
     * @param {Object|null} raw - Unformatierte Diagnose.
     * @returns {Object|null} Formatierte Diagnose.
     */
    formatDiagnosisPayload(raw) {
        return diagnosisRenderer?.formatPayload(raw);
    },

    /**
     * Zeigt Nutzerfeedback an.
     *
     * @param {string} msg - Meldungstext.
     * @param {boolean} [isSuccess=true] - Farbe/Typ der Meldung.
     */
    toast(msg, isSuccess = true) {
        const container = dom?.containers?.toast;
        if (!container) return;
        if (toastTimer !== null) clearTimeout(toastTimer);
        const revision = ++toastRevision;
        const icon = document.createElement('span');
        icon.className = 'toast-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = isSuccess ? '✓' : '!';
        const type = document.createElement('span');
        type.className = 'toast-type';
        type.textContent = isSuccess ? 'Erfolg: ' : 'Fehler: ';
        const text = document.createElement('span');
        text.className = 'toast-text';
        text.textContent = msg;
        container.className = isSuccess ? 'toast-success' : 'toast-error';
        container.replaceChildren(icon, type, text);
        toastTimer = setTimeout(() => {
            if (revision !== toastRevision || container !== dom?.containers?.toast) return;
            clearToast(container);
            toastTimer = null;
        }, 6000);
    },

    /**
     * Zentrale Fehlerbehandlung für Validierungs- und Laufzeitfehler.
     *
     * @param {Error} error - Aufgetretener Fehler.
     */
    handleError(error) {
        const container = dom?.containers?.error;
        if (!container) return;
        renderError(container, error, true);
    },

    handleActionError(error, scope) {
        const container = dom?.containers?.actionError;
        if (!container) return;
        this.clearActionError(scope);
        const entry = document.createElement('div');
        entry.className = 'action-error-entry';
        entry.dataset.scope = scope;
        const text = document.createElement('div');
        renderError(text, error);
        text.classList.add('action-error-text');
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Schließen';
        close.setAttribute('aria-label', `Fehlermeldung schließen: ${text.textContent}`);
        close.addEventListener('click', () => {
            // Ein alter Knopf darf keinen späteren Fehler desselben Bereichs entfernen.
            if (actionErrors.get(scope) === entry) this.clearActionError(scope);
        });
        entry.appendChild(text);
        entry.appendChild(close);
        actionErrors.set(scope, entry);
        container.appendChild(entry);
    },

    clearActionError(scope) {
        actionErrors.get(scope)?.remove();
        actionErrors.delete(scope);
    },

    /**
     * Setzt die Fehleranzeige zurück und entfernt Feldmarkierungen.
     */
    clearError() {
        if (!dom?.containers?.error) return;
        dom.containers.error.textContent = '';
        dom.containers.error.className = '';
        Object.values(dom.inputs || {}).forEach(el => el.classList.remove('input-error'));
    }
};
