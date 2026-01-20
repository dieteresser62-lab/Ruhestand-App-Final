"use strict";

import { formatCurrency, formatNumberWithUnit, formatPercentage } from './simulator-formatting.js';

/**
 * Wandelt einen numerischen Wert defensiv in einen Währungs-String um.
 * Liefert einen Gedankenstrich, wenn der Wert fehlt oder nicht finiten ist.
 *
 * @param {number|null|undefined} value - Zahl, die als Währung formatiert werden soll.
 * @returns {string} Formatierter Währungswert oder '—' als Fallback.
 */
export function formatCurrencySafe(value) {
    if (value == null || !isFinite(value)) {
        return '—';
    }
    return formatCurrency(value);
}

/**
 * Formatiert einen numerischen Wert mit optionaler Einheit und Dezimalstellen.
 *
 * @param {number|null|undefined} value - Der zu formatierende Wert.
 * @param {string} unit - Einheit, die an den formatierten Wert angehängt wird (inkl. z.B. "%", "Jahre").
 * @param {number} fractionDigits - Anzahl der Nachkommastellen.
 * @returns {string} Formatierter Wert mit Einheit oder '—' falls nicht darstellbar.
 */
export { formatNumberWithUnit, formatPercentage };

/**
 * Hilfsfunktion für plain-text KPI-Beschreibungen.
 *
 * @param {string} text - Beschreibungstext, darf leer sein.
 * @returns {string} Getrimmter Beschreibungstext.
 */
export function sanitizeDescription(text) {
    if (typeof text !== 'string') {
        return '';
    }
    return text.trim();
}
