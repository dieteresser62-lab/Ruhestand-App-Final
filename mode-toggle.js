"use strict";

/**
 * Vereinheitlichte Logik für den Einfach/Fortgeschritten-Umschalter.
 *
 * Der Helper übernimmt folgende Aufgaben:
 * - Persistiert den Modus in localStorage und setzt die Body-Klasse
 * - Aktualisiert Labels für eine freundlichere Terminologie im Einfach-Modus
 * - Fügt optionale Tooltips hinzu
 * - Zeigt einen Status-Hinweis, der erklärt, wie mit versteckten Werten umgegangen wird
 * - Bietet einen Reset-Button, um Advanced-Werte bei Bedarf auf Defaults zurückzusetzen
 *
 * @param {Object} config - Konfigurationsobjekt für die Initialisierung.
 * @param {string} [config.storageKey='ruhestand-ui-mode'] - LocalStorage-Key zur Persistenz des Modus.
 * @param {string} [config.toggleSelector='#modeToggle'] - CSS-Selector für das Toggle-Element.
 * @param {string} [config.bodySimpleClass='mode-simple'] - CSS-Klasse, die im Einfach-Modus auf dem Body gesetzt wird.
 * @param {Object<string, string>} [config.tooltipMap={}] - Mapping von Feld-IDs auf Tooltip-Texte.
 * @param {Object<string, {original:string, simple:string}>} [config.labelMappings={}] - Mapping für Label-Texte pro Modus.
 * @param {string|null} [config.advancedResetSelector=null] - Selector für Advanced-Felder, deren Default-Werte gesichert werden sollen.
 * @param {string|null} [config.statusContainerId=null] - ID eines Containers, in dem Status-Hinweise angezeigt werden.
 * @param {string} [config.simpleStatusText='Fortgeschrittene Einstellungen bleiben aktiv.'] - Hinweistext im Einfach-Modus.
 * @param {string} [config.advancedStatusText='Fortgeschritten-Modus aktiv.'] - Hinweistext im Fortgeschritten-Modus.
 */
export function initModeToggle(config = {}) {
    const {
        storageKey = 'ruhestand-ui-mode',
        toggleSelector = '#modeToggle',
        bodySimpleClass = 'mode-simple',
        tooltipMap = {},
        labelMappings = {},
        advancedResetSelector = null,
        statusContainerId = null,
        simpleStatusText = 'Fortgeschrittene Einstellungen bleiben aktiv.',
        advancedStatusText = 'Fortgeschritten-Modus aktiv.'
    } = config;

    const modeToggle = document.querySelector(toggleSelector);
    if (!modeToggle) {
        console.warn('Mode toggle element not found for selector', toggleSelector);
        return;
    }

    const body = document.body;
    const defaultAdvancedValues = captureAdvancedDefaults(advancedResetSelector);
    const statusContainer = statusContainerId ? document.getElementById(statusContainerId) : null;

    const savedMode = (localStorage.getItem(storageKey) || 'simple').toLowerCase();
    const initialMode = savedMode === 'advanced' ? 'advanced' : 'simple';

    applyModeClass(body, bodySimpleClass, initialMode);
    modeToggle.checked = initialMode === 'advanced';

    const updateLabelsFn = () => updateLabels(labelMappings, body, bodySimpleClass);
    const renderStatusFn = () => renderModeStatus({
        container: statusContainer,
        mode: modeToggle.checked ? 'advanced' : 'simple',
        simpleStatusText,
        advancedStatusText,
        defaultAdvancedValues,
        advancedResetSelector
    });

    attachModeToggleHandler({
        toggle: modeToggle,
        storageKey,
        body,
        bodySimpleClass,
        onModeChange: () => {
            updateLabelsFn();
            renderStatusFn();
        }
    });

    addTooltips(tooltipMap);
    updateLabelsFn();
    renderStatusFn();
}

/**
 * Setzt die Body-Klasse entsprechend des Modus.
 *
 * @param {HTMLElement} body - Body-Element der Seite.
 * @param {string} simpleClass - CSS-Klasse, die den Einfach-Modus markiert.
 * @param {'simple'|'advanced'} mode - Aktueller Modus.
 */
function applyModeClass(body, simpleClass, mode) {
    const isSimple = mode === 'simple';
    body.classList.toggle(simpleClass, isSimple);
}

/**
 * Bindet den Change-Handler für das Toggle und persistiert den Modus.
 *
 * @param {Object} params - Parameter für den Handler.
 * @param {HTMLInputElement} params.toggle - Checkbox-Element für den Modus.
 * @param {string} params.storageKey - LocalStorage-Key.
 * @param {HTMLElement} params.body - Body-Element.
 * @param {string} params.bodySimpleClass - CSS-Klasse für den Einfach-Modus.
 * @param {Function} params.onModeChange - Callback nach dem Umschalten.
 */
function attachModeToggleHandler({ toggle, storageKey, body, bodySimpleClass, onModeChange }) {
    toggle.addEventListener('change', () => {
        const mode = toggle.checked ? 'advanced' : 'simple';
        applyModeClass(body, bodySimpleClass, mode);
        localStorage.setItem(storageKey, mode);
        onModeChange();
    });
}

/**
 * Fügt Tooltips anhand der bereitgestellten Map hinzu.
 *
 * @param {Object<string, string>} tooltipMap - Mapping von Feld-IDs auf Tooltip-Texte.
 */
function addTooltips(tooltipMap) {
    const addTooltip = (fieldId, text) => {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const label = field.closest('.form-group')?.querySelector('label');
        if (!label || label.querySelector('.help-tooltip')) return;

        const tooltip = document.createElement('span');
        tooltip.className = 'help-tooltip';
        tooltip.innerHTML = `
            <span class="help-icon">?</span>
            <span class="tooltip-text">${text}</span>
        `;
        label.appendChild(tooltip);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            Object.entries(tooltipMap).forEach(([fieldId, text]) => addTooltip(fieldId, text));
        });
    } else {
        Object.entries(tooltipMap).forEach(([fieldId, text]) => addTooltip(fieldId, text));
    }
}

/**
 * Aktualisiert Labels abhängig vom Modus.
 *
 * @param {Object<string, {original:string, simple:string}>} labelMappings - Mapping der Labeltexte.
 * @param {HTMLElement} body - Body-Element der Seite.
 * @param {string} simpleClass - CSS-Klasse, die den Einfach-Modus markiert.
 */
function updateLabels(labelMappings, body, simpleClass) {
    const isSimple = body.classList.contains(simpleClass);
    Object.keys(labelMappings).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;

        const label = field.closest('.form-group')?.querySelector('label');
        if (!label) return;

        if (!label.dataset.originalText) {
            label.dataset.originalText = label.childNodes[0]?.textContent || '';
        }

        const textNode = label.childNodes[0];
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = isSimple ? labelMappings[fieldId].simple : labelMappings[fieldId].original;
        }
    });
}

/**
 * Sichert Default-Werte der Advanced-Felder, damit sie gezielt zurückgesetzt werden können.
 *
 * @param {string|null} advancedResetSelector - Selector für Advanced-Felder.
 * @returns {Map<string, {type:string, value:string|boolean}>} Map der Default-Werte.
 */
function captureAdvancedDefaults(advancedResetSelector) {
    const defaults = new Map();
    if (!advancedResetSelector) return defaults;

    document.querySelectorAll(advancedResetSelector).forEach(control => {
        const key = control.id || control.name;
        if (!key) return;

        defaults.set(key, {
            type: control.type,
            value: control.type === 'checkbox' || control.type === 'radio' ? control.checked : control.value
        });
    });

    return defaults;
}

/**
 * Stellt gespeicherte Advanced-Defaults wieder her.
 *
 * @param {Map<string, {type:string, value:string|boolean}>} defaults - Gesicherte Default-Werte.
 * @param {string|null} advancedResetSelector - Selector für Advanced-Felder.
 */
function resetAdvancedFields(defaults, advancedResetSelector) {
    if (!advancedResetSelector || defaults.size === 0) return;

    document.querySelectorAll(advancedResetSelector).forEach(control => {
        const key = control.id || control.name;
        if (!key || !defaults.has(key)) return;

        const stored = defaults.get(key);
        if (stored.type === 'checkbox' || stored.type === 'radio') {
            control.checked = Boolean(stored.value);
        } else {
            control.value = stored.value;
        }

        // Event feuern, damit Downstream-Listener (z.B. Debounce-Update) reagieren.
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

/**
 * Rendert einen Hinweis zum aktiven Modus und bietet optional einen Reset für Advanced-Werte.
 *
 * @param {Object} params - Parameter für die Statusanzeige.
 * @param {HTMLElement|null} params.container - Zielcontainer für den Hinweis.
 * @param {'simple'|'advanced'} params.mode - Aktueller Modus.
 * @param {string} params.simpleStatusText - Text im Einfach-Modus.
 * @param {string} params.advancedStatusText - Text im Fortgeschritten-Modus.
 * @param {Map<string, {type:string, value:string|boolean}>} params.defaultAdvancedValues - Gesicherte Default-Werte.
 * @param {string|null} params.advancedResetSelector - Selector für Advanced-Felder.
 */
function renderModeStatus({ container, mode, simpleStatusText, advancedStatusText, defaultAdvancedValues, advancedResetSelector }) {
    if (!container) return;

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'mode-status-card';

    const message = document.createElement('p');
    message.textContent = mode === 'simple' ? simpleStatusText : advancedStatusText;
    wrapper.appendChild(message);

    if (mode === 'simple' && defaultAdvancedValues.size > 0 && advancedResetSelector) {
        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = 'btn btn-secondary btn-reset-advanced';
        resetButton.textContent = 'Advanced-Werte auf Standard setzen';
        resetButton.addEventListener('click', () => resetAdvancedFields(defaultAdvancedValues, advancedResetSelector));
        wrapper.appendChild(resetButton);
    }

    container.appendChild(wrapper);
}
