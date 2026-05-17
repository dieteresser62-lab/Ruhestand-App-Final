import { settleTaxYear } from '../engine/tax-settlement.mjs';

console.log('--- Tax Settlement Tests ---');

{
    const prev = { lossCarry: 0 };
    const result = settleTaxYear({
        taxStatePrev: prev,
        rawAggregate: { sumTaxableAfterTqfSigned: 2000, sumRealizedGainSigned: 3000 },
        sparerPauschbetrag: 1000,
        kirchensteuerSatz: 0
    });
    assertClose(result.taxDue, 1000 * 0.25 * 1.055, 0.01, 'SPB should reduce taxable base before tax');
    assertClose(result.taxStateNext.lossCarry, 0, 1e-9, 'No loss carry should remain for positive taxable base');
}

{
    const prev = { lossCarry: 5000 };
    const result = settleTaxYear({
        taxStatePrev: prev,
        rawAggregate: { sumTaxableAfterTqfSigned: -3000, sumRealizedGainSigned: -4000 },
        sparerPauschbetrag: 1000,
        kirchensteuerSatz: 0
    });
    assertClose(result.taxDue, 0, 1e-9, 'Negative annual saldo should yield zero tax');
    assertClose(result.taxStateNext.lossCarry, 8000, 1e-9, 'Negative saldo should add to existing loss carry');
    assertClose(result.details.spbUsedThisYear, 0, 1e-9, 'SPB should not be used on non-positive base');
}

{
    const prev = { lossCarry: 5000 };
    const result = settleTaxYear({
        taxStatePrev: prev,
        rawAggregate: { sumTaxableAfterTqfSigned: 5000, sumRealizedGainSigned: 7000 },
        sparerPauschbetrag: 1000,
        kirchensteuerSatz: 0
    });
    assertClose(result.taxStateNext.lossCarry, 0, 1e-9, 'Exact carry depletion should resolve to zero');
    assertClose(result.taxDue, 0, 1e-9, 'No tax should remain after exact loss-carry depletion');
}

{
    const prev = { lossCarry: 4000 };
    const result = settleTaxYear({
        taxStatePrev: prev,
        rawAggregate: { sumTaxableAfterTqfSigned: 5000, sumRealizedGainSigned: 5000 },
        sparerPauschbetrag: 1000,
        kirchensteuerSatz: 0
    });
    assertClose(result.taxDue, 0, 1e-9, 'SPB should absorb remaining taxable base after loss-carry');
    assertClose(result.taxStateNext.lossCarry, 0, 1e-9, 'Carry should be depleted');
    assertClose(result.details.spbUsedThisYear, 1000, 1e-9, 'SPB usage should equal remaining positive base');
}

{
    const prev = { lossCarry: 2000 };
    const result = settleTaxYear({
        taxStatePrev: prev,
        rawAggregate: { sumTaxableAfterTqfSigned: 6000, sumRealizedGainSigned: 7000 },
        sparerPauschbetrag: 1000,
        kirchensteuerSatz: 0.09
    });
    const keSt = 0.25 * (1 + 0.055 + 0.09);
    assertClose(result.details.lossCarryStart, 2000, 1e-9, 'Details should expose starting loss carry');
    assertClose(result.details.taxBaseBeforeCarry, 5000, 1e-9, 'Baseline tax base should apply SPB before loss carry view');
    assertClose(result.details.taxBaseAfterCarry, 3000, 1e-9, 'Final tax base should apply loss carry before SPB');
    assertClose(result.taxDue, 3000 * keSt, 0.01, 'Partial loss carry should still leave final tax due');
    assertClose(result.details.taxBeforeLossCarry, 5000 * keSt, 0.01, 'Details should expose baseline tax before loss carry');
    assertClose(result.details.taxSavedByLossCarry, 2000 * keSt, 0.01, 'Details should expose tax saved by loss carry');
    assertClose(result.taxStateNext.lossCarry, 0, 1e-9, 'Partial consumption should deplete loss carry');
}

{
    const prev = { lossCarry: 250 };
    const prevClone = JSON.stringify(prev);
    settleTaxYear({
        taxStatePrev: prev,
        rawAggregate: { sumTaxableAfterTqfSigned: 100, sumRealizedGainSigned: 100 },
        sparerPauschbetrag: 0,
        kirchensteuerSatz: 0
    });
    assertEqual(JSON.stringify(prev), prevClone, 'Settlement must not mutate previous tax state');
}

console.log('--- Tax Settlement Tests Completed ---');
