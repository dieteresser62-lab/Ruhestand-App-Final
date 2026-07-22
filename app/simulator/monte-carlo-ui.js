"use strict";

import { STATIONARY_BOOTSTRAP_METHOD } from './stationary-bootstrap-contract.js';

export function triggerMonteCarloDownload(download, {
    documentRef = globalThis.document,
    urlApi = globalThis.URL,
    BlobCtor = globalThis.Blob
} = {}) {
    if (!download || typeof download.content !== 'string'
        || typeof download.filename !== 'string' || !download.filename.endsWith('.json')) {
        throw new TypeError('Monte-Carlo-Download ist unvollstaendig.');
    }
    if (!documentRef?.createElement || typeof urlApi?.createObjectURL !== 'function'
        || typeof BlobCtor !== 'function') {
        throw new Error('Der Browserdownload ist in dieser Umgebung nicht verfuegbar.');
    }
    const blob = new BlobCtor([download.content], { type: download.mimeType || 'application/json' });
    const url = urlApi.createObjectURL(blob);
    const anchor = documentRef.createElement('a');
    anchor.href = url;
    anchor.download = download.filename;
    try {
        documentRef.body?.appendChild?.(anchor);
        anchor.click();
    } finally {
        if (typeof anchor.remove === 'function') anchor.remove();
        else documentRef.body?.removeChild?.(anchor);
        urlApi.revokeObjectURL?.(url);
    }
    return download.filename;
}

/**
 * Stellt alle DOM-Interaktionen für die Monte-Carlo-Simulation bereit.
 * Kapselt UI-spezifische Logik (Validierung, Progress-Anzeige, Button-Zustände)
 * und liefert generische Callbacks, die der Runner injizieren kann.
 * Dieser Ansatz trennt UI und Business-Logik klar und erleichtert Tests.
 */
export function createMonteCarloUI() {
    const mcButton = requireElement('mcButton', 'Monte-Carlo Start-Button');
    const cancelButton = document.getElementById('mcCancelButton');
    const progressBarContainer = requireElement('mc-progress-bar-container', 'Monte-Carlo Fortschrittsanzeige');
    const progressBar = requireElement('mc-progress-bar', 'Monte-Carlo Fortschrittsbalken');
    const exportActions = document.getElementById('mcRunExportActions');
    const exportButton = document.getElementById('exportMonteCarloRunJson');
    const exportStatus = document.getElementById('mcRunExportStatus');
    let cancelHandler = null;

    return {
        /**
         * Deaktiviert den Start-Button, um Doppelstarts zu verhindern.
         */
        disableStart() { mcButton.disabled = true; },
        /**
         * Aktiviert den Start-Button wieder.
         */
        enableStart() { mcButton.disabled = false; },
        bindCancel(handler) {
            if (!cancelButton || typeof handler !== 'function') return false;
            this.unbindCancel();
            cancelHandler = event => {
                event?.preventDefault?.();
                void handler();
            };
            cancelButton.addEventListener('click', cancelHandler);
            return true;
        },
        unbindCancel() {
            if (!cancelButton || !cancelHandler) return false;
            cancelButton.removeEventListener?.('click', cancelHandler);
            cancelHandler = null;
            return true;
        },
        beginRun() {
            mcButton.disabled = true;
            mcButton.setAttribute?.('aria-busy', 'true');
            if (cancelButton) {
                cancelButton.hidden = false;
                cancelButton.style.display = 'inline-block';
                cancelButton.disabled = false;
                cancelButton.textContent = 'Monte-Carlo-Lauf abbrechen';
            }
        },
        beginCancelling() {
            mcButton.disabled = true;
            if (cancelButton) {
                cancelButton.disabled = true;
                cancelButton.textContent = 'Abbruch läuft …';
            }
        },
        finishRun() {
            mcButton.disabled = false;
            mcButton.removeAttribute?.('aria-busy');
            if (cancelButton) {
                cancelButton.disabled = true;
                cancelButton.hidden = true;
                cancelButton.style.display = 'none';
                cancelButton.textContent = 'Monte-Carlo-Lauf abbrechen';
            }
        },
        showCancelled() {
            this.showCompareResults('Monte-Carlo-Lauf wurde abgebrochen.');
            if (exportStatus) exportStatus.textContent = 'Monte-Carlo-Lauf wurde abgebrochen.';
        },
        /**
         * Blendet die Fortschrittsanzeige ein und setzt sie zurück.
         */
        showProgress() { progressBarContainer.style.display = 'block'; this.updateProgress(0); },
        /**
         * Aktualisiert die Fortschrittsanzeige in Prozent (0-100).
         * @param {number} percent - Fortschritt in Prozent.
         */
        updateProgress(percent) { progressBar.style.width = `${Math.max(0, Math.min(percent, 100))}%`; },
        /**
         * Blendet die Fortschrittsanzeige nach kurzer Verzögerung aus.
         */
        async finishProgress({ completed = true } = {}) {
            if (completed) this.updateProgress(100);
            await new Promise(resolve => setTimeout(resolve, 250));
            progressBarContainer.style.display = 'none';
        },
        /**
         * Liest den Status der CAPE-Sampling-Option defensiv aus.
         * @returns {boolean} True, wenn CAPE-Sampling aktiviert ist.
         */
        readUseCapeSampling() { return document.getElementById('useCapeSampling')?.checked === true; },
        /**
         * Liest Worker-Config fuer Monte-Carlo aus der UI.
         * @returns {{ workerCount: number, timeBudgetMs: number }}
         */
        readWorkerConfig() {
            const workerCountRaw = document.getElementById('mcWorkerCount')?.value ?? '8';
            const budgetRaw = document.getElementById('mcWorkerBudget')?.value ?? '500';
            const workerCount = parseInt(String(workerCountRaw).trim(), 10);
            const timeBudgetMs = parseInt(String(budgetRaw).trim(), 10);
            return {
                workerCount: Number.isFinite(workerCount) && workerCount > 0 ? workerCount : 0,
                timeBudgetMs: Number.isFinite(timeBudgetMs) && timeBudgetMs > 0 ? timeBudgetMs : 500
            };
        },
        /**
         * Liest den Vergleichsmodus fuer Seriell vs Worker aus.
         * @returns {boolean} True, wenn der Vergleich aktiviert ist.
         */
        readCompareMode() { return document.getElementById('mcCompareMode')?.checked === true; },
        /**
         * Zeigt Vergleichsergebnisse an.
         * @param {string} text - Vergleichstext.
         */
        showCompareResults(text) {
            const container = document.getElementById('mc-compare-results');
            if (container) {
                container.textContent = text;
                container.style.display = 'block';
            }
        },
        /**
         * Versteckt Vergleichsergebnisse.
         */
        hideCompareResults() {
            const container = document.getElementById('mc-compare-results');
            if (container) container.style.display = 'none';
        },
        /**
         * Zeigt eine Fehlermeldung im UI an.
         * @param {Error|string} error - Das Fehlerobjekt oder die Fehlermeldung.
         */
        showError(error) {
            const container = document.getElementById('mc-error-container');
            const messageEl = document.getElementById('mc-error-message');
            if (container && messageEl) {
                const msg = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
                messageEl.textContent = msg;
                container.style.display = 'block';
            } else {
                console.error("Error Container missing!", error);
                alert("Fehler (Fallback): " + error);
            }
        },
        /**
         * Versteckt die Fehlermeldung.
         */
        hideError() {
            const container = document.getElementById('mc-error-container');
            if (container) container.style.display = 'none';
        },
        clearRunExport() {
            if (exportButton) {
                exportButton.disabled = true;
                exportButton.onclick = null;
            }
            if (exportActions) {
                exportActions.hidden = true;
                exportActions.style.display = 'none';
            }
            if (exportStatus) exportStatus.textContent = '';
        },
        publishRunExport(download) {
            if (!exportButton || !exportActions) return false;
            exportButton.disabled = false;
            exportButton.onclick = () => {
                try {
                    const filename = triggerMonteCarloDownload(download);
                    if (exportStatus) exportStatus.textContent = `Export gespeichert: ${filename}`;
                } catch (error) {
                    this.showError(error);
                }
            };
            exportActions.hidden = false;
            exportActions.style.display = 'flex';
            if (exportStatus) {
                exportStatus.textContent = 'Versionierter Run-/Result-/Provenienzexport ist bereit.';
            }
            return true;
        }
    };
}

/**
 * Liefert ein Pflicht-DOM-Element und validiert dessen Existenz, damit wir bei fehlerhaften
 * UI-Verkabelungen frühzeitig aussagekräftige Fehlermeldungen liefern können.
 * @param {string} elementId - Die erwartete DOM-ID des Elements.
 * @param {string} description - Menschlich lesbare Beschreibung für Fehlermeldungen.
 * @returns {HTMLElement} Referenz auf das gefundene Element.
 */
export function requireElement(elementId, description) {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`UI-Element fehlt: ${description} (id=${elementId})`);
    }
    return element;
}

/**
 * Liest einen Integer-Wert aus einem Input-Feld und erzwingt sinnvolle Parameterbereiche,
 * damit Simulationen nicht mit stillschweigenden NaN-Werten starten.
 * @param {string} elementId - DOM-ID des Inputs.
 * @param {string} description - Menschlich lesbare Beschreibung für Fehlermeldungen.
 * @param {{min?: number, max?: number, defaultValue?: number}} [options] - Validierungsgrenzen.
 * @returns {number} Der validierte Integer-Wert.
 */
export function readIntegerInput(elementId, description, { min = -Infinity, max = Infinity, defaultValue } = {}) {
    const element = requireElement(elementId, description);
    const rawValue = (element.value ?? '').trim();
    const parsed = parseInt(rawValue, 10);

    if (Number.isNaN(parsed)) {
        if (typeof defaultValue === 'number') {
            return defaultValue;
        }
        throw new Error(`Ungültiger Wert für ${description}: Bitte eine Zahl eingeben.`);
    }
    if (!Number.isFinite(parsed)) {
        throw new Error(`Ungültiger Wert für ${description}: Zahl ist nicht endlich.`);
    }
    if (parsed < min || parsed > max) {
        const minInfo = Number.isFinite(min) ? ` (min: ${min})` : '';
        const maxInfo = Number.isFinite(max) ? ` (max: ${max})` : '';
        throw new Error(`Ungültiger Wert für ${description}: ${parsed}${minInfo}${maxInfo}`);
    }
    return parsed;
}

function readOptionalIntegerInput(elementId, description, { min = -Infinity, max = Infinity, defaultValue } = {}) {
    const element = document.getElementById(elementId);
    if (!element) {
        return defaultValue;
    }
    return readIntegerInput(elementId, description, { min, max, defaultValue });
}

/**
 * Liest alle Monte-Carlo-Steuerparameter aus dem UI und validiert sie defensiv.
 * Design-Entscheidung: Frühes Validieren verhindert späte Ausfälle tief in der Simulation
 * und liefert dem Nutzer klare Fehlermeldungen.
 * @returns {{ anzahl: number, maxDauer: number, blockSize: number, seed: number, methode: string, rngMode: string, startYearMode: string, startYearFilter: number, startYearHalfLife: number, excludeEstimatedHistory: boolean }}
 */
export function readMonteCarloParameters() {
    const methodeSelect = requireElement('mcMethode', 'Monte-Carlo Methode');
    const allowedMethods = Array.from(methodeSelect.options || []).map(option => option.value);
    const methode = methodeSelect.value || allowedMethods[0] || '';
    if (allowedMethods.length > 0 && !allowedMethods.includes(methode)) {
        throw new Error(`Ungültige Monte-Carlo-Methode: ${methode}`);
    }

    const anzahl = readIntegerInput('mcAnzahl', 'Anzahl der Simulationen', { min: 1 });
    const maxDauer = readIntegerInput('mcDauer', 'Simulationsdauer in Jahren', { min: 1 });
    const blockSizeDescription = methode === STATIONARY_BOOTSTRAP_METHOD ? 'Erwartete Blocklänge' : 'Blockgröße';
    const blockSizeOptions = methode === STATIONARY_BOOTSTRAP_METHOD
        ? { min: 1, max: 30 }
        : { min: 1 };
    const blockSize = readIntegerInput('mcBlockSize', blockSizeDescription, blockSizeOptions);
    const seed = readIntegerInput('mcSeed', 'Zufalls-Seed', { defaultValue: 0 });
    const rngModeElement = document.getElementById('rngMode');
    const rngMode = rngModeElement ? rngModeElement.value : 'per-run-seed';

    const startYearModeElement = document.getElementById('mcStartYearMode');
    const startYearModeRaw = startYearModeElement ? startYearModeElement.value : 'UNIFORM';
    const allowedStartYearModes = ['UNIFORM', 'FILTER', 'RECENCY'];
    const startYearMode = allowedStartYearModes.includes(startYearModeRaw) ? startYearModeRaw : 'UNIFORM';
    const startYearFilter = readOptionalIntegerInput('mcStartYearFilter', 'Startjahr-Filter', {
        min: 1950,
        max: 2010,
        defaultValue: 1970
    });
    const startYearHalfLife = readOptionalIntegerInput('mcStartYearHalfLife', 'Half-Life (Jahre)', {
        min: 5,
        max: 50,
        defaultValue: 20
    });
    const excludeEstimatedHistoryElement = document.getElementById('mcExcludeEstimatedHistory');
    const excludeEstimatedHistory = excludeEstimatedHistoryElement?.checked === true;

    return { anzahl, maxDauer, blockSize, seed, methode, rngMode, startYearMode, startYearFilter, startYearHalfLife, excludeEstimatedHistory };
}

export function initMonteCarloMethodControls() {
    const methodElement = document.getElementById('mcMethode');
    const blockSizeElement = document.getElementById('mcBlockSize');
    if (!methodElement || !blockSizeElement) return;

    const blockSizeLabel = document.getElementById('mcBlockSizeLabel');
    const fixedBlockTitle = 'Länge der historischen Blöcke für Block-Bootstrap';
    const stationaryTitle = 'Erwartete mittlere Blocklänge für Stationary Bootstrap (1-30 Jahre)';
    const disabledTitle = 'Nur bei Block-Bootstrap oder Stationary Bootstrap relevant';

    const updateControls = () => {
        const method = methodElement.value;
        const usesBlockLength = method === 'block' || method === STATIONARY_BOOTSTRAP_METHOD;
        blockSizeElement.disabled = !usesBlockLength;

        if (method === STATIONARY_BOOTSTRAP_METHOD) {
            if (blockSizeLabel) blockSizeLabel.textContent = 'Erwartete Blocklänge (Jahre)';
            blockSizeElement.title = stationaryTitle;
        } else {
            if (blockSizeLabel) blockSizeLabel.textContent = 'Blockgröße (Jahre)';
            blockSizeElement.title = method === 'block' ? fixedBlockTitle : disabledTitle;
        }
    };

    methodElement.addEventListener('change', updateControls);
    updateControls();
}

export function initMonteCarloStartYearControls() {
    const modeElement = document.getElementById('mcStartYearMode');
    if (!modeElement) return;

    const filterRow = document.getElementById('mcStartYearFilterRow');
    const halfLifeRow = document.getElementById('mcStartYearHalfLifeRow');
    const filterValue = document.getElementById('mcStartYearFilterValue');
    const halfLifeValue = document.getElementById('mcStartYearHalfLifeValue');
    const filterInput = document.getElementById('mcStartYearFilter');
    const halfLifeInput = document.getElementById('mcStartYearHalfLife');
    const capeToggle = document.getElementById('useCapeSampling');
    const capeWarning = document.getElementById('mcStartYearCapeWarning');

    const syncRangeValue = (input, output) => {
        if (!input || !output) return;
        output.textContent = String(input.value);
    };

    const updateVisibility = () => {
        const mode = modeElement.value || 'UNIFORM';
        if (filterRow) filterRow.style.display = mode === 'FILTER' ? 'block' : 'none';
        if (halfLifeRow) halfLifeRow.style.display = mode === 'RECENCY' ? 'block' : 'none';
        if (capeWarning) {
            const capeActive = capeToggle?.checked === true;
            capeWarning.style.display = capeActive && mode !== 'UNIFORM' ? 'block' : 'none';
        }
    };

    if (filterInput && filterValue) {
        syncRangeValue(filterInput, filterValue);
        filterInput.addEventListener('input', () => syncRangeValue(filterInput, filterValue));
    }
    if (halfLifeInput && halfLifeValue) {
        syncRangeValue(halfLifeInput, halfLifeValue);
        halfLifeInput.addEventListener('input', () => syncRangeValue(halfLifeInput, halfLifeValue));
    }

    modeElement.addEventListener('change', updateVisibility);
    if (capeToggle) {
        capeToggle.addEventListener('change', updateVisibility);
    }
    updateVisibility();
}
