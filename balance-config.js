"use strict";

/**
 * ===================================================================================
 * BALANCE-APP KONFIGURATION & FEHLERKLASSEN
 * ===================================================================================
 */

// Erforderliche Engine-Version
export const REQUIRED_ENGINE_API_VERSION_PREFIX = "31.";

// App-spezifische Konfiguration
export const CONFIG = {
    APP: {
        VERSION: 'v22.0 ES6 Modules (Engine v31)',
        NAME: 'Ruhestand-Balancing'
    },
    STORAGE: {
        LS_KEY: `ruhestandsmodellValues_v29_guardrails`,
        MIGRATION_FLAG: 'migration_v29_inflation_sanitized',
        SNAPSHOT_PREFIX: 'ruhestandsmodell_snapshot_',
        DEBUG_MODE_KEY: 'balance_debug_mode'
    },
    DEBUG: {
        ENABLED: false  // wird zur Laufzeit gesetzt
    }
};

// FEHLERKLASSEN
export class AppError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.context = context;
        this.timestamp = new Date();
    }
}

export class ValidationError extends AppError {
    constructor(errors) {
        super("Einige Eingaben sind ungültig. Bitte korrigieren Sie die markierten Felder.");
        this.name = 'ValidationError';
        this.errors = errors; // Array von {field, message}
    }
}

export class FinancialCalculationError extends AppError {
    constructor(message, context) {
        super(message, context);
        this.name = 'FinancialCalculationError';
    }
}

export class StorageError extends AppError {
    constructor(message, context) {
        super(message, context);
        this.name = 'StorageError';
    }
}

// DEBUG UTILITIES
export const DebugUtils = {
    /**
     * Prüft ob Debug-Modus über URL-Parameter oder localStorage aktiviert ist
     */
    isDebugMode() {
        // Prüfe URL-Parameter ?dev=true oder ?dev=1
        const urlParams = new URLSearchParams(window.location.search);
        const urlDebug = urlParams.get('dev') === 'true' || urlParams.get('dev') === '1';

        // Prüfe localStorage
        const storageDebug = localStorage.getItem(CONFIG.STORAGE.DEBUG_MODE_KEY) === 'true';

        return urlDebug || storageDebug;
    },

    /**
     * Aktiviert oder deaktiviert den Debug-Modus
     */
    toggleDebugMode() {
        const currentState = this.isDebugMode();
        const newState = !currentState;

        if (newState) {
            localStorage.setItem(CONFIG.STORAGE.DEBUG_MODE_KEY, 'true');
            console.log('%c🐛 DEBUG MODE ACTIVATED', 'background: #222; color: #bada55; font-size: 14px; padding: 4px 8px; border-radius: 4px;');
        } else {
            localStorage.removeItem(CONFIG.STORAGE.DEBUG_MODE_KEY);
            console.log('%c🐛 DEBUG MODE DEACTIVATED', 'background: #222; color: #ff6b6b; font-size: 14px; padding: 4px 8px; border-radius: 4px;');
        }

        CONFIG.DEBUG.ENABLED = newState;
        return newState;
    },

    /**
     * Initialisiert Debug-Modus beim App-Start
     */
    initDebugMode() {
        const isDebug = this.isDebugMode();
        CONFIG.DEBUG.ENABLED = isDebug;

        if (isDebug) {
            console.log('%c🐛 DEBUG MODE ENABLED', 'background: #222; color: #bada55; font-size: 14px; padding: 4px 8px; border-radius: 4px;');
            console.log('Debug mode can be toggled with CTRL+Shift+D');
        }

        return isDebug;
    },

    /**
     * Logged Debug-Informationen (nur wenn Debug-Modus aktiv)
     */
    log(category, message, data = null) {
        if (!CONFIG.DEBUG.ENABLED) return;

        const timestamp = new Date().toLocaleTimeString('de-DE');
        console.group(`%c[${timestamp}] ${category}`, 'color: #3b82f6; font-weight: bold;');
        console.log(message);
        if (data) {
            console.log('Data:', data);
        }
        console.groupEnd();
    }
};
