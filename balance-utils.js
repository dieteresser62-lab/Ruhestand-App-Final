"use strict";

/**
 * ===================================================================================
 * BALANCE-APP UTILITY FUNKTIONEN
 * ===================================================================================
 */

export const UIUtils = {
    EUR_FORMATTER: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
    NUM_FORMATTER: new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }),

    formatCurrency: val => (typeof val === 'number' && isFinite(val)) ? UIUtils.EUR_FORMATTER.format(val) : 'N/A',

    formatNumber: num => UIUtils.NUM_FORMATTER.format(Math.round(num)),

    parseCurrency: str => {
        if (!str) return 0;
        const n = parseFloat(String(str).replace(/\./g, '').replace(',', '.'));
        return isFinite(n) ? n : 0;
    },

    getThreshold(path, defaultValue) {
        // Sicherer Zugriff auf die Engine-Konfiguration mit Fallbacks
        const config = window.EngineAPI?.getConfig() || window.Ruhestandsmodell_v30?.CONFIG;
        if (!config || typeof path !== 'string') {
            return defaultValue;
        }
        const value = path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, config);
        return (typeof value === 'number') ? value : defaultValue;
    }
};
