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
export class AppError extends Error {
    /**
     * Erstellt eine neue generische Engine-Fehlerinstanz.
     * @param {string} message - Fehlermeldung für den Aufrufer.
     * @param {Object} context - Zusätzliche Kontextinformationen zur Diagnose.
     */
    constructor(message, context = {}) {
        super(message);
        this.context = context;
        this.timestamp = new Date();
    }
}

/**
 * Fehlerklasse für Validierungsfehler
 */
export class ValidationError extends AppError {
    /**
     * Beschreibt Validierungsfehler für Nutzereingaben.
     * @param {Array<Object>} errors - Liste einzelner Feldfehler ({field, message}).
     */
    constructor(errors) {
        super("Einige Eingaben sind ungültig. Bitte korrigieren Sie die markierten Felder.");
        this.name = 'ValidationError';
        this.errors = errors; // Array von {field, message}
    }
}

/**
 * Fehlerklasse für Berechnungsfehler
 */
export class FinancialCalculationError extends AppError {
    /**
     * Beschreibt Fehler, die während finanzieller Berechnungen auftreten.
     * @param {string} message - Präzise Beschreibung des Fehlers.
     * @param {Object} context - Berechnungsbezogene Metadaten zur Fehleranalyse.
     */
    constructor(message, context) {
        super(message, context);
        this.name = 'FinancialCalculationError';
    }
}

export default {
    AppError,
    ValidationError,
    FinancialCalculationError
};
