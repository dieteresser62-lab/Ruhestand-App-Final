"use strict";

/**
 * ===================================================================================
 * BALANCE-APP UTILITY FUNKTIONEN
 * ===================================================================================
 * Sammlung von Hilfsfunktionen für Formatierung und Konfigurationszugriff
 * ===================================================================================
 */

export const UIUtils = {
    // Intl.NumberFormat-Instanzen für Performance (einmalige Initialisierung)
    EUR_FORMATTER: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
    NUM_FORMATTER: new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }),

    /**
     * Formatiert eine Zahl als Währung (Euro)
     * @param {number} val - Zu formatierende Zahl
     * @returns {string} Formatierter String (z.B. "1.234,56 €") oder "N/A"
     */
    formatCurrency: val => (typeof val === 'number' && isFinite(val)) ? UIUtils.EUR_FORMATTER.format(val) : 'N/A',

    /**
     * Formatiert eine Zahl als Ganzzahl mit Tausendertrennern
     * @param {number} num - Zu formatierende Zahl
     * @returns {string} Formatierter String (z.B. "1.234")
     */
    formatNumber: num => UIUtils.NUM_FORMATTER.format(Math.round(num)),

    /**
     * Parst einen Währungs-String zu einer Zahl
     * Unterstützt deutsches Format (1.234,56) und englisches Format (1,234.56)
     * @param {string} str - Zu parsender String
     * @returns {number} Geparste Zahl oder 0 bei Fehler
     */
    parseCurrency: str => {
        if (!str) return 0;
        const n = parseFloat(String(str).replace(/\./g, '').replace(',', '.'));
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
        const config = window.EngineAPI?.CONFIG || window.EngineAPI?.getConfig();
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
