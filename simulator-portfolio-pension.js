"use strict";

/**
 * Berechnet jährliche Rente basierend auf Indexierung
 * VERALTET: Wird durch computePensionNext ersetzt (nur noch für Abwärtskompatibilität)
 */
export function computeYearlyPension({ yearIndex, baseMonthly, startOffset, lastAnnualPension, indexierungsArt, inflRate, lohnRate, festerSatz }) {
    if (!baseMonthly || yearIndex < startOffset) return 0;
    let anpassungsSatz = 0;
    switch (indexierungsArt) {
        case 'inflation': anpassungsSatz = inflRate / 100; break;
        case 'lohn': anpassungsSatz = (lohnRate ?? inflRate) / 100; break;
        case 'fest': anpassungsSatz = festerSatz / 100; break;
    }
    if (yearIndex === startOffset) return baseMonthly * 12;
    const last = lastAnnualPension > 0 ? lastAnnualPension : baseMonthly * 12;
    return last * (1 + anpassungsSatz);
}

/**
 * Berechnet die nächste jährliche Rente mit gemeinsamer Anpassungsrate
 * @param {number} prev - Vorjahresrente (brutto, vor Steuern)
 * @param {boolean} isFirstYear - Ist es das erste Auszahlungsjahr?
 * @param {number} base - Basisrente (brutto p.a.) im ersten Jahr
 * @param {number} adjPct - Jährliche Anpassungsrate in Prozent (z.B. 2.0 für 2%)
 * @returns {number} Rentenbrutto für das Jahr (≥ 0)
 */
export function computePensionNext(prev, isFirstYear, base, adjPct) {
    if (isFirstYear) return Math.max(0, base);
    const val = prev * (1 + adjPct / 100);
    return Math.max(0, val);
}

/**
 * Berechnet die effektive Rentenanpassungsrate basierend auf Modus und Jahresdaten
 * @param {object} inputs - Input-Objekt mit rentAdjMode und rentAdjPct
 * @param {object} yearData - Jahresdaten mit inflation und lohn
 * @returns {number} Anpassungsrate in Prozent (z.B. 2.0 für 2%)
 */
export function computeRentAdjRate(inputs, yearData) {
    if (!inputs.rentAdjMode || inputs.rentAdjMode === 'fix') {
        return inputs.rentAdjPct || 0;
    }

    if (inputs.rentAdjMode === 'wage') {
        // Lohnentwicklung aus historischen Daten
        return yearData.lohn || 0;
    }

    if (inputs.rentAdjMode === 'cpi') {
        // Inflation (CPI)
        return yearData.inflation || 0;
    }

    // Fallback
    return inputs.rentAdjPct || 0;
}
