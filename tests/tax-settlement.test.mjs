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
