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
} from './shared-formatting.js';

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
     * Parst einen Währungs-String zu einer Zahl
     * Unterstützt deutsches Format (1.234,56) und englisches Format (1,234.56)
     * @param {string} str - Zu parsender String
     * @returns {number} Geparste Zahl oder 0 bei Fehler
     */
    parseCurrency: str => {
        if (!str) return 0;
        const raw = String(str).trim().replace(/\s/g, '');
        if (!raw) return 0;
        const lastComma = raw.lastIndexOf(',');
        const lastDot = raw.lastIndexOf('.');
        let normalized = raw;
        if (lastComma !== -1 && lastDot !== -1) {
            if (lastComma > lastDot) {
                // Comma is decimal separator: 1.234,56
                normalized = raw.replace(/\./g, '').replace(',', '.');
            } else {
                // Dot is decimal separator: 1,234.56
                normalized = raw.replace(/,/g, '');
            }
        } else if (lastComma !== -1) {
            // Only comma present: 1234,56
            normalized = raw.replace(/\./g, '').replace(',', '.');
        } else if (lastDot !== -1) {
            // Only dot present: 1.234 (thousands) or 12.5 (decimal)
            const parts = raw.split('.');
            const tail = parts[parts.length - 1];
            if (tail.length === 3) {
                normalized = raw.replace(/\./g, '');
            }
        }
        const n = parseFloat(normalized);
        return isFinite(n) ? n : 0;
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
        const config = window.EngineAPI?.getConfig() || window.Ruhestandsmodell_v30?.CONFIG;
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
    }
};
