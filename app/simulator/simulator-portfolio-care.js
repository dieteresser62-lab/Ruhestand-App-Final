/**
 * Module: Simulator Portfolio Care
 * Purpose: Logic for care duration ranges (Pflege).
 *          Provides gender-specific default assumptions.
 * Usage: Called by simulator-portfolio-inputs.js.
 * Dependencies: None (pure logic)
 */
"use strict";

/**
 * Geschlechtsspezifische Default-Annahmen für die Dauer eines akuten Pflegefalls.
 * Männer verbringen im Schnitt etwas weniger Jahre in intensiver Pflege als Frauen,
 * daher wählen wir 5–10 Jahre vs. 6–12 Jahre als konservative Spanne.
 */
const CARE_DURATION_DEFAULTS = Object.freeze({
    m: { minYears: 5, maxYears: 10 },
    w: { minYears: 6, maxYears: 12 },
    d: { minYears: 5, maxYears: 11 },
    default: { minYears: 5, maxYears: 10 }
});

/**
 * Liefert das Default-Intervall für die Pflegedauer auf Basis des Geschlechts.
 * @param {string} gender - 'm', 'w' oder 'd'.
 * @returns {{minYears:number,maxYears:number}} - Standardwerte für min/max.
 */
function getCareDurationDefaults(gender) {
    return CARE_DURATION_DEFAULTS[gender] || CARE_DURATION_DEFAULTS.default;
}

/**
 * Normalisiert das Benutzerintervall und stellt sicher, dass min ≤ max bleibt.
 * Werte <= 0 oder NaN werden durch Geschlechts-Defaults ersetzt.
 * @param {number} minYearsRaw - User-Eingabe für Mindestdauer.
 * @param {number} maxYearsRaw - User-Eingabe für Höchstdauer.
 * @param {string} gender - Geschlecht der betrachteten Person.
 * @returns {{minYears:number,maxYears:number}} - Bereinigtes Intervall.
 */
export function normalizeCareDurationRange(minYearsRaw, maxYearsRaw, gender) {
    const defaults = getCareDurationDefaults(gender);
    let minYears = Number.isFinite(minYearsRaw) && minYearsRaw > 0 ? minYearsRaw : defaults.minYears;
    let maxYears = Number.isFinite(maxYearsRaw) && maxYearsRaw > 0 ? maxYearsRaw : defaults.maxYears;

    if (minYears > maxYears) {
        // Dokumentierte Annahme: Wir lassen den größeren Wert dominieren, statt still zu vertauschen.
        maxYears = minYears;
    }

    return { minYears, maxYears };
}
