/**
 * Module: Tax Settlement
 * Purpose: Calculates final annual tax and next tax-state based on raw annual sale aggregates.
 *          This module is intentionally pure (no mutation of inputs, no side effects).
 */

function toFiniteNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function sanitizeTaxState(taxStatePrev) {
    const prev = taxStatePrev && typeof taxStatePrev === 'object' ? taxStatePrev : {};
    return {
        lossCarry: Math.max(0, toFiniteNumber(prev.lossCarry, 0))
    };
}

export function settleTaxYear(params = {}) {
    const taxStatePrev = sanitizeTaxState(params.taxStatePrev);
    const raw = params.rawAggregate && typeof params.rawAggregate === 'object'
        ? params.rawAggregate
        : {};
    const sparerPauschbetrag = Math.max(0, toFiniteNumber(params.sparerPauschbetrag, 0));
    const kiSt = Math.max(0, toFiniteNumber(params.kirchensteuerSatz, 0));
    const keSt = 0.25 * (1 + 0.055 + kiSt);

    const sumTaxableAfterTqfSigned = toFiniteNumber(raw.sumTaxableAfterTqfSigned, 0);
    const sumRealizedGainSigned = toFiniteNumber(raw.sumRealizedGainSigned, 0);

    // Baseline tax without loss carry (still with SPB).
    const positiveBeforeCarry = Math.max(0, sumTaxableAfterTqfSigned);
    const spbUsedBeforeCarry = Math.min(sparerPauschbetrag, positiveBeforeCarry);
    const taxBaseBeforeCarry = Math.max(0, positiveBeforeCarry - spbUsedBeforeCarry);
    const taxBeforeLossCarry = taxBaseBeforeCarry * keSt;

    // Apply existing loss-carry on signed annual taxable base.
    const signedAfterCarry = sumTaxableAfterTqfSigned - taxStatePrev.lossCarry;
    const positiveAfterCarry = Math.max(0, signedAfterCarry);
    const spbUsedThisYear = Math.min(sparerPauschbetrag, positiveAfterCarry);
    const taxBaseAfterCarry = Math.max(0, positiveAfterCarry - spbUsedThisYear);
    const taxDue = taxBaseAfterCarry * keSt;
    const lossCarryNext = Math.max(0, -signedAfterCarry);

    const taxStateNext = { lossCarry: lossCarryNext };

    return {
        taxDue,
        taxStateNext,
        details: {
            keSt,
            sumRealizedGainSigned,
            sumTaxableAfterTqfSigned,
            lossCarryStart: taxStatePrev.lossCarry,
            signedAfterCarry,
            spbUsedThisYear,
            taxBaseBeforeCarry,
            taxBaseAfterCarry,
            taxBeforeLossCarry,
            taxAfterLossCarry: taxDue,
            taxSavedByLossCarry: Math.max(0, taxBeforeLossCarry - taxDue)
        }
    };
}

export default { settleTaxYear };
