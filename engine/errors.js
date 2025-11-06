'use strict';

/**
 * ===================================================================
 * ENGINE ERRORS MODULE
 * ===================================================================
 * Spezifische Fehlerklassen für die Ruhestand-Engine
 * ===================================================================
 */

/**
 * Basis-Fehlerklasse für alle Engine-Fehler
 */
class AppError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.context = context;
        this.timestamp = new Date();
    }
}

/**
 * Fehlerklasse für Validierungsfehler
 */
class ValidationError extends AppError {
    constructor(errors) {
        super("Einige Eingaben sind ungültig. Bitte korrigieren Sie die markierten Felder.");
        this.name = 'ValidationError';
        this.errors = errors; // Array von {field, message}
    }
}

/**
 * Fehlerklasse für Berechnungsfehler
 */
class FinancialCalculationError extends AppError {
    constructor(message, context) {
        super(message, context);
        this.name = 'FinancialCalculationError';
    }
}

// Exporte
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppError, ValidationError, FinancialCalculationError };
}
