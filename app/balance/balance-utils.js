"use strict";

import {
    EUR_FORMATTER,
    NUM_FORMATTER,
    formatCurrency,
    formatNumber,
    formatPercent,
    formatPercentValue,
    formatPercentRatio,
    formatMonths
} from '../shared/shared-formatting.js';

export const NUMBER_PARSE_ERROR_CODES = Object.freeze({
    REQUIRED: 'number_required',
    INVALID_FORMAT: 'number_invalid_format',
    AMBIGUOUS_SEPARATOR: 'number_ambiguous_separator',
    NON_FINITE: 'number_non_finite'
});

function numberParseFailure(code, message) {
    return {
        valid: false,
        value: null,
        error: { code, message }
    };
}

/**
 * Parst ein vollstaendiges deutsches oder englisches Zahlenformat.
 * Einzelne Separatoren mit exakt drei Nachkommastellen gelten aus
 * Kompatibilitaetsgruenden als Tausendertrenner (z. B. 1.234 / 1,234).
 *
 * @param {unknown} rawValue - Zu pruefender Rohwert.
 * @param {{ required?: boolean, allowCurrencySymbol?: boolean }} options - Parseroptionen.
 * @returns {{ valid: boolean, value: number|null, error: { code: string, message: string }|null }}
 */
export function parseLocalizedNumber(rawValue, { required = true, allowCurrencySymbol = true } = {}) {
    if (typeof rawValue === 'number') {
        return Number.isFinite(rawValue)
            ? { valid: true, value: rawValue, error: null }
            : numberParseFailure(NUMBER_PARSE_ERROR_CODES.NON_FINITE, 'Der Zahlenwert muss endlich sein.');
    }

    if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
        return required
            ? numberParseFailure(NUMBER_PARSE_ERROR_CODES.REQUIRED, 'Ein erforderlicher Zahlenwert fehlt.')
            : { valid: true, value: null, error: null };
    }

    let text = String(rawValue)
        .replace(/[\u00a0\u202f]/g, ' ')
        .trim();

    if (/^[+-]?infinity$/i.test(text)) {
        return numberParseFailure(NUMBER_PARSE_ERROR_CODES.NON_FINITE, 'Der Zahlenwert muss endlich sein.');
    }

    if (allowCurrencySymbol) {
        const hasPrefix = text.startsWith('€');
        const hasSuffix = text.endsWith('€');
        if (hasPrefix && hasSuffix) {
            return numberParseFailure(NUMBER_PARSE_ERROR_CODES.INVALID_FORMAT, 'Das Waehrungssymbol darf nur einmal am Rand stehen.');
        }
        if (hasPrefix) text = text.slice(1).trim();
        if (hasSuffix) text = text.slice(0, -1).trim();
    }
    if (text.includes('€')) {
        return numberParseFailure(NUMBER_PARSE_ERROR_CODES.INVALID_FORMAT, 'Das Waehrungssymbol steht an einer ungueltigen Position.');
    }

    let sign = '';
    if (text.startsWith('+') || text.startsWith('-')) {
        sign = text[0];
        text = text.slice(1);
    }
    if (!text || /[^\d., ]/.test(text)) {
        return numberParseFailure(NUMBER_PARSE_ERROR_CODES.INVALID_FORMAT, 'Der Wert ist kein vollstaendiges Zahlenformat.');
    }

    let normalized = null;
    if (text.includes(' ')) {
        const spacedNumber = /^([1-9]\d{0,2}(?: \d{3})+)(?:([,.])(\d+))?$/.exec(text);
        if (!spacedNumber) {
            return numberParseFailure(NUMBER_PARSE_ERROR_CODES.INVALID_FORMAT, 'Leerzeichen muessen gueltige Tausendergruppen trennen.');
        }
        normalized = spacedNumber[1].replace(/ /g, '');
        if (spacedNumber[3]) normalized += `.${spacedNumber[3]}`;
    } else {
        const commaCount = (text.match(/,/g) || []).length;
        const dotCount = (text.match(/\./g) || []).length;

        if (commaCount > 0 && dotCount > 0) {
            const german = /^(?:0|[1-9]\d{0,2}(?:\.\d{3})+),(\d+)$/.exec(text);
            const english = /^(?:0|[1-9]\d{0,2}(?:,\d{3})+)\.(\d+)$/.exec(text);
            if (german) {
                normalized = `${text.slice(0, text.lastIndexOf(',')).replace(/\./g, '')}.${german[1]}`;
            } else if (english) {
                normalized = `${text.slice(0, text.lastIndexOf('.')).replace(/,/g, '')}.${english[1]}`;
            } else {
                return numberParseFailure(NUMBER_PARSE_ERROR_CODES.AMBIGUOUS_SEPARATOR, 'Punkt und Komma sind nicht eindeutig als Tausender- und Dezimaltrenner angeordnet.');
            }
        } else if (commaCount > 0 || dotCount > 0) {
            const separator = commaCount > 0 ? ',' : '.';
            const parts = text.split(separator);
            if (parts.some(part => !/^\d+$/.test(part))) {
                return numberParseFailure(NUMBER_PARSE_ERROR_CODES.INVALID_FORMAT, 'Der Zahlenwert enthaelt einen unvollstaendigen Separator.');
            }
            if (parts.length > 2) {
                const grouped = /^[1-9]\d{0,2}(?:[.,]\d{3})+$/.test(text);
                if (!grouped) {
                    return numberParseFailure(NUMBER_PARSE_ERROR_CODES.AMBIGUOUS_SEPARATOR, 'Mehrere Separatoren muessen vollstaendige Tausendergruppen bilden.');
                }
                normalized = parts.join('');
            } else {
                const [integerPart, fractionPart] = parts;
                const isLegacyThousands = integerPart !== '0'
                    && integerPart.length <= 3
                    && !integerPart.startsWith('0')
                    && fractionPart.length === 3;
                normalized = isLegacyThousands
                    ? `${integerPart}${fractionPart}`
                    : `${integerPart}.${fractionPart}`;
            }
        } else if (/^\d+$/.test(text)) {
            normalized = text;
        }
    }

    if (normalized === null) {
        return numberParseFailure(NUMBER_PARSE_ERROR_CODES.INVALID_FORMAT, 'Der Wert ist kein vollstaendiges Zahlenformat.');
    }

    const value = Number(`${sign}${normalized}`);
    return Number.isFinite(value)
        ? { valid: true, value, error: null }
        : numberParseFailure(NUMBER_PARSE_ERROR_CODES.NON_FINITE, 'Der Zahlenwert muss endlich sein.');
}

/**
 * ===================================================================================
 * BALANCE-APP UTILITY FUNKTIONEN
 * ===================================================================================
 * Sammlung von Hilfsfunktionen für Formatierung und Konfigurationszugriff
 * ===================================================================================
 */

/**
 * Module: Balance Utils
 * Purpose: Collection of utility functions for formatting (Currency, Percent, Months) and configuration access.
 *          Centralizes number formatting logic using Intl.NumberFormat for performance.
 * Usage: Used widely across the application for display formatting.
 * Dependencies: shared-formatting.js
 */
export const UIUtils = {
    // Intl.NumberFormat-Instanzen für Performance (einmalige Initialisierung)
    EUR_FORMATTER,
    NUM_FORMATTER,

    /**
     * Formatiert eine Zahl als Währung (Euro)
     * @param {number} val - Zu formatierende Zahl
     * @returns {string} Formatierter String (z.B. "1.234,56 €") oder "N/A"
     */
    formatCurrency: val => (typeof val === 'number' && isFinite(val)) ? formatCurrency(val) : 'N/A',

    /**
     * Formatiert eine Zahl als Ganzzahl mit Tausendertrennern
     * @param {number} num - Zu formatierende Zahl
     * @returns {string} Formatierter String (z.B. "1.234")
     */
    formatNumber,

    /**
     * Formatiert Prozentwerte mit einstellbarer Skalierung.
     * @param {number} value - Eingabewert
     * @param {object} options - Formatoptionen
     * @returns {string|null} Formatierter Prozentwert oder Fallback
     */
    formatPercent,
    formatPercentValue,
    formatPercentRatio,

    /**
     * Formatiert Monatswerte mit Suffix.
     * @param {number} value - Eingabewert
     * @param {object} options - Formatoptionen
     * @returns {string} Formatierter Monatswert oder Fallback
     */
    formatMonths,

    /**
     * Liefert den strukturierten Parser-Contract fuer deutsche/englische Zahlen.
     * Null bleibt von fehlenden oder ungueltigen Werten unterscheidbar.
     */
    parseCurrencyResult: (str, options = {}) => parseLocalizedNumber(str, {
        required: options.required ?? true,
        allowCurrencySymbol: options.allowCurrencySymbol ?? true
    }),

    /**
     * Kompatibler Zahlen-Rueckgabepfad fuer bestehende Aufrufer.
     * Kritische Pfade muessen den strukturierten Result-Contract verwenden;
     * Legacy-Aufrufer behalten vorerst ihren bisherigen 0-Fallback.
     *
     * @param {unknown} str - Zu parsender Wert.
     * @returns {number} Vollstaendig geparste Zahl oder Legacy-Fallback 0.
     */
    parseCurrency: str => {
        const result = parseLocalizedNumber(str, {
            required: true,
            allowCurrencySymbol: true
        });
        return result.valid ? result.value : 0;
    },

    /**
     * Holt einen Schwellenwert aus der Engine-Konfiguration
     * Fallback auf defaultValue, wenn Pfad nicht existiert
     *
     * @param {string} path - Pfad in der Config (z.B. "THRESHOLDS.ALARM.withdrawalRate")
     * @param {number} defaultValue - Fallback-Wert
     * @returns {number} Schwellenwert oder defaultValue
     *
     * @example
     * getThreshold('THRESHOLDS.ALARM.withdrawalRate', 0.055) // => 0.055
     */
    getThreshold(path, defaultValue) {
        // Sicherer Zugriff auf die Engine-Konfiguration mit Fallbacks
        const win = (typeof window !== 'undefined') ? window : null;
        const config = win?.EngineAPI?.getConfig() || win?.Ruhestandsmodell_v30?.CONFIG;
        if (!config || typeof path !== 'string') {
            return defaultValue;
        }
        const value = path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, config);
        return (typeof value === 'number') ? value : defaultValue;
    },

    /**
     * Liefert eine menschenlesbare Beschreibung für die Quelle eines Runway-Ziels.
     *
     * @param {string} sourceKey - Maschineller Source-Key (z.B. "input" oder "profil:peak_hot").
     * @returns {{ label: string, description: string }} Beschreibender Text für UI/Export.
     */
    describeRunwayTargetSource(sourceKey) {
        const fallback = {
            label: 'Unbekannt (Legacy)',
            description: 'Quelle konnte nicht bestimmt werden – bitte Zielwerte prüfen.'
        };

        if (typeof sourceKey !== 'string' || !sourceKey.trim()) {
            return fallback;
        }

        const normalized = sourceKey.trim().toLowerCase();
        const staticMap = {
            input: {
                label: 'Manueller Input',
                description: 'Runway-Ziel wurde direkt in den Profil-Inputs definiert.'
            },
            fallback: {
                label: 'Fallback (Minimum)',
                description: 'Es wurde auf den minimalen Runway-Wert des Profils zurückgegriffen.'
            },
            'profil:smoothed': {
                label: 'Profil (geglättet)',
                description: 'Runway-Ziel wurde zwischen Profil-Stützwerten anhand der Regime-Severity interpoliert.'
            },
            unknown: fallback,
            legacy: fallback
        };

        if (normalized.startsWith('profil:')) {
            const regime = normalized.split(':')[1] || 'unbekanntes Regime';
            return {
                label: `Profil (Regime: ${regime})`,
                description: 'Dynamisches Profil-Ziel abhängig vom aktuellen Marktregime.'
            };
        }

        return staticMap[normalized] || fallback;
    },

    /**
     * Liefert kompakten UI-Text für geglättete Runway-Ziele.
     *
     * @param {object} smoothing - Diagnoseobjekt aus der Engine.
     * @returns {{ label: string, explanation: string, detail: string, active: boolean }}
     */
    describeRunwayTargetSmoothing(smoothing) {
        const formatM = (value, digits = 0) => formatMonths(value, { fractionDigits: digits, invalid: 'n/a', suffix: 'Monate' });
        const empty = {
            label: 'Keine Glättung',
            explanation: 'Runway-Ziel stammt aus dem diskreten Profil- oder Eingabewert.',
            detail: '',
            active: false
        };
        if (!smoothing || typeof smoothing !== 'object') {
            return empty;
        }

        const target = formatM(smoothing.targetMonths, 1);
        const raw = formatM(smoothing.rawTargetMonths, 0);
        const lower = formatM(smoothing.lowerTargetMonths, 0);
        const upper = formatM(smoothing.upperTargetMonths, 0);
        const min = formatM(smoothing.hardMinimumMonths ?? smoothing.minRunwayMonths, 0);
        const severityPct = Number.isFinite(smoothing.severityPct)
            ? smoothing.severityPct
            : (Number.isFinite(smoothing.severity) ? Math.round(smoothing.severity * 100) : 0);

        if (smoothing.smoothingActive) {
            return {
                label: smoothing.smoothingApplied ? 'Runway-Ziel geglättet' : 'Runway-Glättung aktiv',
                explanation: `Runway-Ziel: ${target} (${severityPct}% Drawdown-Severity zwischen ${lower} und ${upper}; Rohziel ${raw}). Harte Mindestgrenze: ${min}, nicht geglättet.`,
                detail: `${severityPct}% zwischen Normalziel ${lower} und Stressziel ${upper}`,
                active: true
            };
        }

        if (smoothing.smoothingFallback) {
            const reasonLabels = {
                invalid_discrete_target: 'diskretes Ziel ungültig',
                invalid_severity: 'Severity nicht berechenbar',
                incomplete_support_targets: 'Profil-Stützwerte unvollständig'
            };
            const reason = reasonLabels[smoothing.fallbackReason] || smoothing.fallbackReason || 'Fallback aktiv';
            return {
                label: 'Runway-Glättung im Fallback',
                explanation: `Glättung wurde nicht angewandt (${reason}); verwendet wird das Rohziel ${raw}. Harte Mindestgrenze: ${min}, nicht geglättet.`,
                detail: reason,
                active: false
            };
        }

        return empty;
    }
};
