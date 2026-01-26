"use strict";

/**
 * Entscheidet, ob der Guardrail-State (lastState) zurückgesetzt werden soll,
 * wenn sich "kritische" Eingaben stark verändern.
 */
export function shouldResetGuardrailState(prevInputs, nextInputs) {
    if (!prevInputs || !nextInputs) return false;

    const isFiniteNumber = (v) => typeof v === 'number' && isFinite(v);
    const changedBool = (key) => {
        if (typeof prevInputs[key] === 'boolean' || typeof nextInputs[key] === 'boolean') {
            return prevInputs[key] !== nextInputs[key];
        }
        return false;
    };
    const changedNumber = (key, { abs, rel } = {}) => {
        const prev = prevInputs[key];
        const next = nextInputs[key];
        if (!isFiniteNumber(prev) || !isFiniteNumber(next)) return false;
        const delta = Math.abs(next - prev);
        const relDelta = delta / Math.max(1, Math.abs(prev));
        const absHit = isFiniteNumber(abs) ? delta >= abs : false;
        const relHit = isFiniteNumber(rel) ? relDelta >= rel : false;
        return absHit || relHit;
    };
    const anyNumberChange = (key) => {
        const prev = prevInputs[key];
        const next = nextInputs[key];
        if (!isFiniteNumber(prev) || !isFiniteNumber(next)) return false;
        return Math.abs(next - prev) > 0;
    };

    // Bedarf
    const needChanged = ['floorBedarf', 'flexBedarf']
        .some(key => changedNumber(key, { abs: 1000, rel: 0.1 }));

    // Vermögen
    const assetsChanged = ['tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu', 'goldWert']
        .some(key => changedNumber(key, { abs: 10000, rel: 0.1 }));

    // Einkommen
    const incomeChanged = changedBool('renteAktiv')
        || changedNumber('renteMonatlich', { abs: 1000, rel: 0.1 });

    // Markt / Regime-relevant
    const marketChanged = ['endeVJ', 'endeVJ_1', 'endeVJ_2', 'endeVJ_3', 'ath', 'jahreSeitAth']
        .some(anyNumberChange);

    // Flex-Budget (Cap/Topf)
    const flexBudgetChanged = ['flexBudgetAnnual', 'flexBudgetYears', 'flexBudgetRecharge']
        .some(key => changedNumber(key, { abs: 1000, rel: 0.2 }));

    return needChanged || assetsChanged || incomeChanged || marketChanged || flexBudgetChanged;
}
