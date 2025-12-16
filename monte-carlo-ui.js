"use strict";

/**
 * Stellt alle DOM-Interaktionen für die Monte-Carlo-Simulation bereit.
 * Kapselt UI-spezifische Logik (Validierung, Progress-Anzeige, Button-Zustände)
 * und liefert generische Callbacks, die der Runner injizieren kann.
 * Dieser Ansatz trennt UI und Business-Logik klar und erleichtert Tests.
 */
export function createMonteCarloUI() {
    const mcButton = requireElement('mcButton', 'Monte-Carlo Start-Button');
    const progressBarContainer = requireElement('mc-progress-bar-container', 'Monte-Carlo Fortschrittsanzeige');
    const progressBar = requireElement('mc-progress-bar', 'Monte-Carlo Fortschrittsbalken');

    return {
        /**
         * Deaktiviert den Start-Button, um Doppelstarts zu verhindern.
         */
        disableStart() { mcButton.disabled = true; },
        /**
         * Aktiviert den Start-Button wieder.
         */
        enableStart() { mcButton.disabled = false; },
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
        async finishProgress() {
            this.updateProgress(100);
            await new Promise(resolve => setTimeout(resolve, 250));
            progressBarContainer.style.display = 'none';
        },
        /**
         * Liest den Status der CAPE-Sampling-Option defensiv aus.
         * @returns {boolean} True, wenn CAPE-Sampling aktiviert ist.
         */
        readUseCapeSampling() { return document.getElementById('useCapeSampling')?.checked === true; },
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

/**
 * Liest alle Monte-Carlo-Steuerparameter aus dem UI und validiert sie defensiv.
 * Design-Entscheidung: Frühes Validieren verhindert späte Ausfälle tief in der Simulation
 * und liefert dem Nutzer klare Fehlermeldungen.
 * @returns {{ anzahl: number, maxDauer: number, blockSize: number, seed: number, methode: string }}
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
    const blockSize = readIntegerInput('mcBlockSize', 'Blockgröße', { min: 1 });
    const seed = readIntegerInput('mcSeed', 'Zufalls-Seed', { defaultValue: 0 });

    return { anzahl, maxDauer, blockSize, seed, methode };
}
