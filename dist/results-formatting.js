"use strict";

import { formatCurrency } from './simulator-utils.js';

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
export function formatNumberWithUnit(value, unit = '', fractionDigits = 1) {
    if (value == null || !isFinite(value)) {
        return '—';
    }
    const formatted = Number(value).toFixed(fractionDigits).replace('.', ',');
    return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Gibt einen Prozentwert mit Standard-Formatierung aus.
 *
 * @param {number|null|undefined} value - Prozentwert ohne %-Zeichen (z.B. 12.3).
 * @returns {string} Formatierter Prozentwert oder '—'.
 */
export function formatPercentage(value) {
    return formatNumberWithUnit(value, '%');
}

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
