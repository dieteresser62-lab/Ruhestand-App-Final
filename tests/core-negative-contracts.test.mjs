import { EngineAPI } from '../engine/index.mjs';
import { ValidationError } from '../engine/errors.mjs';
import { settleTaxYear } from '../engine/tax-settlement.mjs';
import { readBasePortfolioInputs } from '../app/simulator/simulator-input-strategy.js';
import { SimulatorValidationError, validateSimulatorInputs } from '../app/simulator/simulator-input-validation.js';
import { applyForcedSaleLiquidityCoverage } from '../app/simulator/simulator-forced-sale.js';
import { applySimulatorTaxRecompute, buildTaxRawAggregate } from '../app/simulator/simulator-tax-recompute.js';

console.log('--- Core Negative Contract Tests ---');

const baseEngineInput = {
    depotwertAlt: 500000,
    depotwertNeu: 0,
    goldWert: 0,
    tagesgeld: 50000,
    geldmarktEtf: 0,
    inflation: 2.0,
    renteMonatlich: 0,
    floorBedarf: 24000,
    flexBedarf: 12000,
    startAlter: 65,
    aktuellesAlter: 65,
    goldAktiv: false,
    risikoprofil: 'sicherheits-dynamisch',
    goldFloorProzent: 0,
    runwayTargetMonths: 36,
    runwayMinMonths: 24,
    renteAktiv: false,
    marketCapeRatio: 20,
    targetEq: 60,
    rebalBand: 5,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 20,
    endeVJ: 100,
    endeVJ_1: 95,
    endeVJ_2: 90,
    endeVJ_3: 85,
    ath: 110,
    jahreSeitAth: 2,
    costBasisAlt: 300000,
    costBasisNeu: 0,
    goldCost: 0,
    sparerPauschbetrag: 1000,
    kirchensteuerSatz: 0
};

function withMutedValidationLog(callback) {
    const originalError = console.error;
    console.error = () => {};
    try {
        return callback();
    } finally {
        console.error = originalError;
    }
}

function assertValidationField(error, fieldId, message) {
    assert(error instanceof ValidationError || error instanceof SimulatorValidationError, `${message}: validation error type`);
    assert(error.errors?.some(entry => entry.fieldId === fieldId), `${message}: ${fieldId} should be marked`);
}

function createDocumentMock(values = {}) {
    return {
        getElementById(id) {
            if (!Object.prototype.hasOwnProperty.call(values, id)) return null;
            const entry = values[id];
            if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                return {
                    value: entry.value ?? '',
                    checked: entry.checked ?? false
                };
            }
            return { value: entry, checked: false };
        }
    };
}

// --- TEST 1: minimumFlexAnnual rejects invalid bounds without silent limiting ---
{
    const cases = [
        { label: 'negative minimum flex', value: -1 },
        { label: 'minimum flex above flexBedarf', value: baseEngineInput.flexBedarf + 1 }
    ];

    for (const testCase of cases) {
        const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear(
            { ...baseEngineInput, minimumFlexAnnual: testCase.value },
            null
        ));
        assert(result.error instanceof ValidationError, `${testCase.label} should return ValidationError`);
        assertValidationField(result.error, 'minimumFlexAnnual', testCase.label);
    }
}

// --- TEST 2: existing legacy loading path for invalid minimumFlexAnnual stays non-crashing ---
{
    const result = EngineAPI.simulateSingleYear(
        { ...baseEngineInput, minimumFlexAnnual: 'legacy-invalid' },
        null
    );
    assert(!result.error, 'Legacy invalid minimumFlexAnnual should not crash the engine path');
    assertEqual(result.input.minimumFlexAnnual, 0, 'Legacy invalid minimumFlexAnnual should normalize to existing zero fallback');
    assert(Number.isFinite(result.ui?.spending?.monatlicheEntnahme), 'Legacy invalid minimumFlexAnnual should still produce finite spending');
}

// --- TEST 3: UI reader and simulator validator use the same public field name ---
{
    const doc = createDocumentMock({
        tagesgeld: '10.000',
        geldmarktEtf: '5.000',
        simStartVermoegen: '100.000',
        depotwertAlt: '85',
        einstandAlt: '70',
        startFloorBedarf: '24000',
        startFlexBedarf: '12000',
        minimumFlexAnnual: '6000',
        goldAllokationAktiv: 'false'
    });
    const base = readBasePortfolioInputs(doc);
    assertEqual(base.minimumFlexAnnual, 6000, 'Simulator reader should expose minimumFlexAnnual');
    assertEqual(base.minFlexAnnual, undefined, 'Simulator reader should not introduce a minFlexAnnual alias');
    validateSimulatorInputs(base);

    for (const testCase of [
        { label: 'negative simulator minimum flex', inputs: { startFlexBedarf: 12000, minimumFlexAnnual: -1 } },
        { label: 'above-flex simulator minimum flex', inputs: { startFlexBedarf: 12000, minimumFlexAnnual: 12001 } }
    ]) {
        let thrown = null;
        try {
            validateSimulatorInputs(testCase.inputs);
        } catch (error) {
            thrown = error;
        }
        assert(thrown instanceof SimulatorValidationError, `${testCase.label} should throw SimulatorValidationError`);
        assert(thrown.errors.some(entry => entry.fieldId === 'minimumFlexAnnual'), `${testCase.label} should mark minimumFlexAnnual`);
    }
}

// --- TEST 4: NaN/Infinity core inputs keep the existing non-crashing normalization contract ---
{
    const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear(
        { ...baseEngineInput, tagesgeld: Number.NaN, geldmarktEtf: Number.POSITIVE_INFINITY },
        null
    ));
    assert(!result.error, 'NaN/Infinity asset input should not crash the engine path');
    assertEqual(result.input.tagesgeld, 0, 'NaN tagesgeld should normalize to existing zero fallback');
    assertEqual(result.input.geldmarktEtf, 0, 'Infinity geldmarktEtf should normalize to existing zero fallback');
    assert(Number.isFinite(result.ui?.spending?.monatlicheEntnahme), 'NaN/Infinity asset input should still produce finite spending');
}

// --- TEST 5: aktuelleLiquiditaet is a strict optional number override ---
{
    for (const missingValue of [undefined, null]) {
        const result = EngineAPI.simulateSingleYear(
            { ...baseEngineInput, aktuelleLiquiditaet: missingValue },
            null
        );
        assert(!result.error, 'Missing liquidity override should use the legacy fallback');
        assertEqual(result.input.aktuelleLiquiditaet, undefined, 'Missing liquidity override should be removed from normalized input');
        assert(Number.isFinite(result.ui.runway.months), 'Fallback liquidity should produce finite runway');
    }

    for (const value of [0, 25000]) {
        const result = EngineAPI.simulateSingleYear(
            { ...baseEngineInput, aktuelleLiquiditaet: value },
            null
        );
        assert(!result.error, 'Finite non-negative liquidity override should be accepted');
        assertEqual(result.input.aktuelleLiquiditaet, value, 'Accepted liquidity override should remain a number');
        assert(Number.isFinite(result.ui.runway.months), 'Accepted liquidity override should produce finite runway');
        assert(Number.isFinite(result.ui.liquiditaet.deckungVorher), 'Accepted liquidity override should produce finite coverage');
    }

    for (const value of ['50000', '50.000,00', '50000.00', '', 'ungültig', Number.NaN, Infinity, -Infinity, -1]) {
        const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear(
            { ...baseEngineInput, aktuelleLiquiditaet: value },
            null
        ));
        assertValidationField(result.error, 'aktuelleLiquiditaet', `Invalid liquidity override ${String(value)}`);
    }
}

// --- TEST 6: tax settlement sanitizes invalid tax state and raw aggregates without mutation ---
{
    const prev = { lossCarry: Number.POSITIVE_INFINITY };
    const prevBefore = JSON.stringify(prev);
    const result = settleTaxYear({
        taxStatePrev: prev,
        rawAggregate: {
            sumTaxableAfterTqfSigned: Number.NaN,
            sumRealizedGainSigned: Number.NEGATIVE_INFINITY
        },
        sparerPauschbetrag: Number.POSITIVE_INFINITY,
        kirchensteuerSatz: Number.NaN
    });
    assertEqual(JSON.stringify(prev), prevBefore, 'Tax settlement should not mutate invalid previous tax state');
    assert(Number.isFinite(result.taxDue), 'Tax due should be finite for invalid raw inputs');
    assertEqual(result.taxDue, 0, 'Invalid raw inputs should fall back to zero tax due');
    assertEqual(result.taxStateNext.lossCarry, 0, 'Invalid loss carry should sanitize to zero');
    assertEqual(result.details.sumTaxableAfterTqfSigned, 0, 'Invalid taxable aggregate should sanitize to zero');
    assertEqual(result.details.sumRealizedGainSigned, 0, 'Invalid realized aggregate should sanitize to zero');
}

// --- TEST 7: forced-sale recompute uses loss carry and TQF-adjusted signed aggregate ---
{
    const aggregate = buildTaxRawAggregate({
        sumRealizedGainSigned: 10000,
        sumTaxableAfterTqfSigned: 7000
    });
    const actionResult = {
        steuer: 999,
        taxSettlement: { recomputedWithForcedSales: false },
        taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
    };
    const spendingNewState = { taxState: { lossCarry: 2000 } };
    const recompute = applySimulatorTaxRecompute({
        didForcedSale: true,
        actionResult,
        spendingNewState,
        taxStatePrev: { lossCarry: 2000 },
        combinedTaxRawAggregate: aggregate,
        sparerPauschbetrag: 1000,
        kirchensteuerSatz: 0,
        forcedSaleScaleApplied: 0.5,
        forcedTaxReserved: 100
    });
    const expectedTax = (7000 - 2000 - 1000) * 0.25 * 1.055;

    assert(actionResult.taxSettlement.recomputedWithForcedSales === true, 'Forced-sale path should mark recompute');
    assertEqual(actionResult.taxSettlement.forcedSaleScaleApplied, 0.5, 'Forced-sale path should expose sale scale');
    assertClose(actionResult.steuer, expectedTax, 0.01, 'Forced-sale recompute should apply loss carry before final tax');
    assertClose(recompute.totalTaxesThisYear, expectedTax, 0.01, 'Year tax should follow recomputed settlement');
    assertEqual(spendingNewState.taxState.lossCarry, 0, 'Positive forced-sale tax base should consume loss carry');
    assertEqual(actionResult.taxRawAggregate.sumTaxableAfterTqfSigned, 7000, 'Forced-sale path should preserve TQF-adjusted aggregate');
}

// --- TEST 8: non-positive forced shortfall is a neutral no-sale path ---
{
    const portfolio = {
        depotTranchesAktien: [{ marketValue: 1000, costBasis: 800, type: 'aktien_alt', purchaseDate: '2020-01-01' }],
        depotTranchesGold: [],
        liquiditaet: 0
    };
    const aggregate = buildTaxRawAggregate();
    const result = applyForcedSaleLiquidityCoverage({
        forcedShortfall: -100,
        portfolio,
        engineInput: { goldAktiv: false },
        market: { sKey: 'bear_deep' },
        is3Bucket: false,
        isBadYear: false,
        depotTranchesAktien: portfolio.depotTranchesAktien,
        depotTranchesGold: portfolio.depotTranchesGold,
        equityBeforeForced: 1000,
        goldBeforeForced: 0,
        combinedTaxRawAggregate: aggregate
    });
    assert(result.didForcedSale === false, 'Negative forced shortfall should not trigger forced sale');
    assertEqual(result.liquiditaetDelta, 0, 'Negative forced shortfall should not add liquidity');
    assertEqual(portfolio.depotTranchesAktien[0].marketValue, 1000, 'Negative forced shortfall should not mutate portfolio');
    assertEqual(aggregate.sumTaxableAfterTqfSigned, 0, 'Negative forced shortfall should not mutate tax aggregate');
}

console.log('--- Core Negative Contract Tests Completed ---');
