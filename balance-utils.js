"use strict";

/**
 * ===================================================================================
 * BALANCE-APP UTILITY FUNKTIONEN
 * ===================================================================================
 * Wrapper um shared-utils für Balance-App spezifische Verwendung.
 * Stellt UIUtils-Objekt für Abwärtskompatibilität bereit.
 * ===================================================================================
 */

import {
    formatCurrency,
    formatNumber,
    parseCurrency,
    getThreshold,
    describeRunwayTargetSource
} from './shared-utils.js';

export const UIUtils = {
    /**
     * Formatiert eine Zahl als Währung (Euro)
     * @param {number} val - Zu formatierende Zahl
     * @returns {string} Formatierter String (z.B. "1.234,56 €") oder "N/A"
     */
    formatCurrency,

    /**
     * Formatiert eine Zahl als Ganzzahl mit Tausendertrennern
     * @param {number} num - Zu formatierende Zahl
     * @returns {string} Formatierter String (z.B. "1.234")
     */
    formatNumber,

    /**
     * Parst einen Währungs-String zu einer Zahl
     * @param {string} str - Zu parsender String
     * @returns {number} Geparste Zahl oder 0 bei Fehler
     */
    parseCurrency,

    /**
     * Holt einen Schwellenwert aus der Engine-Konfiguration
     * @param {string} path - Pfad in der Config
     * @param {number} defaultValue - Fallback-Wert
     * @returns {number} Schwellenwert oder defaultValue
     */
    getThreshold,

    /**
     * Liefert eine menschenlesbare Beschreibung für Runway-Ziel-Quelle
     * @param {string} sourceKey - Source-Key
     * @returns {{ label: string, description: string }} Beschreibender Text
     */
    describeRunwayTargetSource
};
