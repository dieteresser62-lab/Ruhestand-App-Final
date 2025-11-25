"use strict";

/**
 * ============================================================================
 * Utility-Funktionen für Simulator-Sweep und Grundlogik
 * ----------------------------------------------------------------------------
 * Ausgelagerte Helfer aus simulator-main.js, um die Hauptdatei zu entschlacken
 * und wiederverwendbare Logik zentral abzulegen.
 * ============================================================================
 */

/**
 * Schnelles strukturiertes Cloning für Stress-Context.
 * @param {object|null|undefined} ctx - Ursprünglicher Stress-Context.
 * @returns {object|null} Flache Kopie für sicheren Gebrauch innerhalb eines Sweeps.
 */
export function cloneStressContext(ctx) {
    if (!ctx) return null;
    return {
        type: ctx.type,
        remainingYears: ctx.remainingYears,
        pickableIndices: ctx.pickableIndices, // Read-only Array, Shallow Copy OK
        preset: ctx.preset // Read-only Object, Shallow Copy OK
    };
}

/**
 * Normalisiert die Konfiguration der Hinterbliebenenrente.
 * @param {object|undefined} rawOptions - Ursprüngliche Eingaben aus dem UI.
 * @returns {{mode:string,percent:number,marriageOffsetYears:number,minMarriageYears:number}} Normalisierte Optionen.
 */
export function normalizeWidowOptions(rawOptions) {
    const defaults = {
        mode: 'stop',
        percent: 0,
        marriageOffsetYears: 0,
        minMarriageYears: 0
    };
    if (!rawOptions) return defaults;
    return {
        mode: rawOptions.mode === 'percent' ? 'percent' : 'stop',
        percent: Math.max(0, Math.min(1, Number(rawOptions.percent) || 0)),
        marriageOffsetYears: Math.max(0, Math.floor(Number(rawOptions.marriageOffsetYears) || 0)),
        minMarriageYears: Math.max(0, Math.floor(Number(rawOptions.minMarriageYears) || 0))
    };
}

/**
 * Ermittelt die Anzahl der Ehejahre, die bis zum aktuellen Simulationsjahr vergangen sind.
 * @param {number} yearIndex - Laufender Jahresindex der Simulation (0-basiert).
 * @param {{marriageOffsetYears:number}} widowOptions - Normalisierte Witwen-Konfiguration.
 * @returns {number} Anzahl der absolvierten Ehejahre (0, falls noch nicht verheiratet).
 */
export function computeMarriageYearsCompleted(yearIndex, widowOptions) {
    if (!widowOptions) return 0;
    if (yearIndex < widowOptions.marriageOffsetYears) return 0;
    return (yearIndex - widowOptions.marriageOffsetYears) + 1;
}

/**
 * Robuste Deep-Clone-Funktion für Sweep-Parameter.
 * @param {Object} obj - Das zu klonende Objekt.
 * @returns {Object} Tiefe, unabhängige Kopie des Objekts.
 */
export function deepClone(obj) {
    if (typeof structuredClone === 'function') {
        return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Setzt verschachtelten Pfad in Objekt (z.B. "partner.monatsrente").
 * @param {object} obj - Zielobjekt.
 * @param {string} path - Pfad (z.B. "a.b.c" oder "key").
 * @param {any} value - Wert zum Setzen.
 */
export function setNested(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    current[parts[parts.length - 1]] = value;
}

/**
 * Whitelist für erlaubte Sweep-Parameter.
 * Nur diese Parameter dürfen im Sweep variiert werden.
 */
export const SWEEP_ALLOWED_KEYS = new Set([
    // Strategie-Parameter (Liquiditäts-Runway)
    'runwayMinMonths', 'runwayTargetMonths',
    // Strategie-Parameter (Portfolio-Allokation)
    'targetEq', 'rebalBand',
    // Strategie-Parameter (Skim & Refill)
    'maxSkimPctOfEq', 'maxBearRefillPctOfEq',
    // Strategie-Parameter (Gold-Allokation)
    'goldZielProzent', 'goldFloorProzent', 'goldAktiv',
    // Basis-Parameter (gemeinsam für beide Personen)
    'rentAdjMode', 'rentAdjPct',
    'startFloorBedarf', 'startFlexBedarf',
    // Weitere erlaubte Parameter können hier hinzugefügt werden
    // ACHTUNG: Keine Person-2-spezifischen Parameter (r2*, partner.*, p2*)!
]);

/**
 * Blockliste: Regex-Patterns für Person-2-Felder.
 * Diese Felder dürfen NICHT im Sweep überschrieben werden.
 */
export const SWEEP_BLOCK_PATTERNS = [
    /^partner(\.|$)/i,   // z.B. partner.aktiv, partner.monatsrente, ...
    /^r2[A-Z_]/,         // z.B. r2Monatsrente, r2StartInJahren, r2Steuerquote, ...
    /^p2[A-Z_]/,         // z.B. p2Rente, p2StartAlter, p2Geschlecht, ...
];

/**
 * Prüft, ob ein Key auf der Blockliste steht (Person-2-Parameter).
 * @param {string} key - Parameter-Key.
 * @returns {boolean} true wenn geblockt.
 */
export function isBlockedKey(key) {
    return SWEEP_BLOCK_PATTERNS.some(rx => rx.test(key));
}

/**
 * Extrahiert Basis-Parameter von Person 2 für Invarianz-Prüfung.
 * @param {Object} inputs - Eingabe-Settings (inkl. inputs.partner).
 * @returns {Object} Objekt mit P2-Basis-Parametern.
 */
export function extractP2Invariants(inputs) {
    if (!inputs || !inputs.partner) {
        return {
            aktiv: false,
            brutto: 0,
            startAlter: 0,
            startInJahren: 0,
            steuerquotePct: 0,
            rentAdjPct: 0
        };
    }

    return {
        aktiv: !!inputs.partner.aktiv,
        brutto: Number(inputs.partner.brutto) || 0,
        startAlter: Number(inputs.partner.startAlter) || 0,
        startInJahren: Number(inputs.partner.startInJahren) || 0,
        steuerquotePct: Number(inputs.partner.steuerquotePct) || 0,
        rentAdjPct: Number(inputs.rentAdjPct) || 0
    };
}

/**
 * Prüft, ob zwei P2-Invarianten-Objekte identisch sind.
 * @param {Object} inv1 - Erste Invarianten (Referenz).
 * @param {Object} inv2 - Zweite Invarianten (zu prüfen).
 * @returns {boolean} true wenn identisch, false sonst.
 */
export function areP2InvariantsEqual(inv1, inv2) {
    if (!inv1 || !inv2) return false;
    return JSON.stringify(inv1) === JSON.stringify(inv2);
}

/**
 * DEPRECATED: Extrahiert Rente-2-Serie aus YearLog für Invarianz-Prüfung.
 * @deprecated Verwende stattdessen extractP2Invariants() + areP2InvariantsEqual().
 * @param {Array} yearLog - Jahreslog mit potenzieller Rente-2-Spalte.
 * @returns {Array<number>|null} Serie der Rente-2-Werte oder null bei Fehler.
 */
export function extractR2Series(yearLog) {
    if (!yearLog || !Array.isArray(yearLog) || yearLog.length === 0) return null;

    // Unterstütze verschiedene mögliche Feldnamen
    const possibleKeys = ['rente2', 'Rente2', 'Rente_2', 'p2Rente', 'r2'];
    const key = possibleKeys.find(k => k in (yearLog[0] || {}));

    if (!key) {
        console.warn('[SWEEP] Konnte kein Rente-2-Feld in YearLog finden. Verfügbare Keys:', Object.keys(yearLog[0] || {}));
        return null;
    }

    return yearLog.map(y => Number(y[key]) || 0);
}

/**
 * DEPRECATED: Prüft, ob zwei Rente-2-Serien identisch sind.
 * @deprecated Verwende stattdessen extractP2Invariants() + areP2InvariantsEqual().
 * @param {Array<number>} series1 - Erste Serie.
 * @param {Array<number>} series2 - Zweite Serie.
 * @param {number} [tolerance=1e-6] - Vergleichstoleranz.
 * @returns {boolean} true, wenn Serien gleich sind, sonst false.
 */
export function areR2SeriesEqual(series1, series2, tolerance = 1e-6) {
    if (!series1 || !series2) return false;
    if (series1.length !== series2.length) return false;
    return series1.every((v, i) => Math.abs(v - series2[i]) < tolerance);
}

/**
 * Führt eine Funktion aus, ohne dass localStorage.setItem aufgerufen werden kann.
 * @param {Function} fn - Auszuführende Funktion.
 * @returns {*} Rückgabewert der Funktion.
 */
export function withNoLSWrites(fn) {
    const _lsSet = localStorage.setItem;
    localStorage.setItem = function () {
        // No-op während Sweep - verhindert Side-Effects
        console.debug('[SWEEP] localStorage.setItem blockiert während Sweep');
    };
    try {
        return fn();
    } finally {
        localStorage.setItem = _lsSet;
    }
}
