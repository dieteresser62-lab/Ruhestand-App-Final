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
        SNAPSHOT_PREFIX: 'ruhestandsmodell_snapshot_'
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