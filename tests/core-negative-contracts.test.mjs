import { EngineAPI } from '../engine/index.mjs';
import { FinancialCalculationError, ValidationError } from '../engine/errors.mjs';
import SpendingPlanner from '../engine/planners/SpendingPlanner.mjs';
import { settleTaxYear } from '../engine/tax-settlement.mjs';
import TransactionEngine from '../engine/transactions/TransactionEngine.mjs';
import { readBasePortfolioInputs } from '../app/simulator/simulator-input-strategy.js';
import { SimulatorValidationError, validateSimulatorInputs } from '../app/simulator/simulator-input-validation.js';
import { applyForcedSaleLiquidityCoverage } from '../app/simulator/simulator-forced-sale.js';
import { applySimulatorTaxRecompute, buildTaxRawAggregate } from '../app/simulator/simulator-tax-recompute.js';
import { resolvePlannedAnnualWithdrawal } from '../types/planned-withdrawal-contract.js';

console.log('--- Core Negative Contract Tests ---');

// --- CONTRACT: planned withdrawal representations reconcile fail-closed ---
{
    const atTolerance = resolvePlannedAnnualWithdrawal({
        spendingResult: {
            monatlicheEntnahme: 1000,
            details: { endgueltigeEntnahme: 12000.01 }
        }
    });
    assertEqual(atTolerance.status, 'resolved',
        'Exactly one cent representation drift must remain inside the documented tolerance');
    assertEqual(atTolerance.source, 'spending.details.endgueltigeEntnahme',
        'Reconciled representations must retain the annual Planner detail as diagnostic source');

    const aboveTolerance = resolvePlannedAnnualWithdrawal({
        spendingResult: {
            monatlicheEntnahme: 1000,
            details: { endgueltigeEntnahme: 12000.0101 }
        }
    });
    assertEqual(aboveTolerance.status, 'conflict',
        'Representation drift above one cent must fail as a conflict');

    for (const invalidValue of ['12000', Number.NaN, Number.POSITIVE_INFINITY, null]) {
        const invalid = resolvePlannedAnnualWithdrawal({
            spendingResult: { details: { endgueltigeEntnahme: invalidValue } }
        });
        assertEqual(invalid.status, 'invalid',
            `Invalid annual representation ${String(invalidValue)} must fail closed`);
    }
}

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

// --- TEST 2: invalid legacy minimumFlexAnnual is rejected instead of replaced with zero ---
{
    const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear(
        { ...baseEngineInput, minimumFlexAnnual: 'legacy-invalid' },
        null
    ));
    assert(result.error instanceof ValidationError, 'Invalid legacy minimumFlexAnnual should return ValidationError');
    assertValidationField(result.error, 'minimumFlexAnnual', 'invalid legacy minimum flex');
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
        { label: 'above-flex simulator minimum flex', inputs: { startFlexBedarf: 12000, minimumFlexAnnual: 12001 } },
        { label: 'non-numeric simulator minimum flex', inputs: { startFlexBedarf: 12000, minimumFlexAnnual: 'invalid' } },
        { label: 'non-finite simulator minimum flex', inputs: { startFlexBedarf: 12000, minimumFlexAnnual: Number.POSITIVE_INFINITY } }
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

// --- TEST 6: Active pension requires a finite non-negative monthly amount ---
{
    for (const value of ['true', 'false', 1, 0]) {
        const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear(
            { ...baseEngineInput, renteAktiv: value, renteMonatlich: 1000 },
            null
        ));
        assertValidationField(result.error, 'renteAktiv', `Non-boolean pension activation ${String(value)}`);
    }

    for (const value of [undefined, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
        const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear(
            { ...baseEngineInput, renteAktiv: true, renteMonatlich: value },
            null
        ));
        assertValidationField(result.error, 'renteMonatlich', `Invalid active pension ${String(value)}`);
    }

    const zeroPension = EngineAPI.simulateSingleYear(
        { ...baseEngineInput, renteAktiv: true, renteMonatlich: 0 },
        null
    );
    assert(!zeroPension.error, 'Active pension with explicit zero should remain valid');
}

// --- TEST 7: tax settlement sanitizes invalid tax state and raw aggregates without mutation ---
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

// --- TEST 8: forced-sale recompute uses loss carry and TQF-adjusted signed aggregate ---
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

// --- TEST 9: malformed internal SpendingPlanner results fail closed ---
{
    const originalDetermineSpending = SpendingPlanner.determineSpending;
    try {
        const malformedPlannerCases = [
            {
                label: 'missing',
                spendingResult: { details: {} },
                expectedStatus: 'missing'
            },
            {
                label: 'conflicting',
                spendingResult: {
                    monatlicheEntnahme: 1000,
                    details: { endgueltigeEntnahme: 24000 }
                },
                expectedStatus: 'conflict'
            },
            {
                label: 'negative',
                spendingResult: {
                    monatlicheEntnahme: -1000,
                    details: { endgueltigeEntnahme: -12000 }
                },
                expectedStatus: 'invalid'
            },
            {
                label: 'explicit null annual detail',
                spendingResult: {
                    monatlicheEntnahme: 1000,
                    details: { endgueltigeEntnahme: null }
                },
                expectedStatus: 'invalid'
            },
            {
                label: 'explicit null monthly value',
                spendingResult: {
                    monatlicheEntnahme: null,
                    details: { endgueltigeEntnahme: 12000 }
                },
                expectedStatus: 'invalid'
            }
        ];

        for (const testCase of malformedPlannerCases) {
            SpendingPlanner.determineSpending = () => ({
                spendingResult: testCase.spendingResult,
                newState: {},
                diagnosis: { general: {}, keyParams: {}, decisionTree: [], guardrails: [] }
            });
            const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear(baseEngineInput, null));
            assert(result.error instanceof FinancialCalculationError,
                `${testCase.label} planned annual withdrawal must fail instead of falling back to raw VPW need`);
            assertEqual(result.error.context?.contract, 'planned_annual_withdrawal',
                `${testCase.label} planner output must identify the violated withdrawal contract`);
            assertEqual(result.error.context?.status, testCase.expectedStatus,
                `${testCase.label} planner output must retain its reconciliation status`);
        }
    } finally {
        SpendingPlanner.determineSpending = originalDetermineSpending;
    }
}

// --- TEST 10: malformed or overbooked cash flows fail instead of being normalized/clamped ---
{
    const originalDetermineAction = TransactionEngine.determineAction;
    try {
        const invalidCashActions = [
            {
                label: 'string cash inflow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid string cash inflow',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: { liquiditaet: 'not-a-number', gold: 0, aktien: 0 },
                    nettoErlös: 0,
                    steuer: 0
                }
            },
            {
                label: 'NaN cash inflow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid NaN cash inflow',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: { liquiditaet: Number.NaN, gold: 0, aktien: 0 },
                    nettoErlös: 0,
                    steuer: 0
                }
            },
            {
                label: 'null cash inflow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid null cash inflow',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: { liquiditaet: null, gold: 0, aktien: 0 },
                    nettoErlös: 0,
                    steuer: 0
                }
            },
            {
                label: 'undefined cash inflow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid undefined cash inflow',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: { liquiditaet: undefined, gold: 0, aktien: 0 },
                    nettoErlös: 0,
                    steuer: 0
                }
            },
            {
                label: 'overbooked cash source',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid overbooked cash action',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'liquiditaet', brutto: 60000, netto: 60000, steuer: 0 }],
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 60000 },
                    nettoErlös: 60000,
                    steuer: 0,
                    details: { source: 'surplus', verkaufLiquiditaet: 60000 }
                }
            },
            {
                label: 'source-less positive cash inflow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid source-less cash inflow',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                    nettoErlös: 10000,
                    steuer: 0
                }
            },
            {
                label: 'source-less raw action before 3-bucket finalization',
                expectedContract: 'planned_liquidity_flow',
                expectedPhase: 'transaction_engine_output',
                engineInput: {
                    ...baseEngineInput,
                    finalizeThreeBucketAction: true,
                    decumulation: {
                        mode: '3_bucket_jilge',
                        drawdownTrigger: -15,
                        bondTargetFactor: 5
                    },
                    endeVJ: 70,
                    endeVJ_1: 100,
                    endeVJ_2: 100,
                    endeVJ_3: 100,
                    detailledTranches: [{
                        schemaVersion: 2,
                        trancheId: 'bond-1',
                        type: 'anleihe',
                        category: 'bonds',
                        marketValue: 50000,
                        costBasis: 50000,
                        tqf: 0,
                        taxExempt: false
                    }]
                },
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid raw action before 3-bucket finalization',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                    nettoErlös: 10000,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'string sources container',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid string sources container',
                    diagnosisEntries: [],
                    quellen: 'oops',
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 0 },
                    nettoErlös: 0,
                    steuer: 0
                }
            },
            {
                label: 'null sources container',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid null sources container',
                    diagnosisEntries: [],
                    quellen: null,
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 0 },
                    nettoErlös: 0,
                    steuer: 0
                }
            },
            {
                label: 'NONE action with positive cash use',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'NONE',
                    title: 'Invalid minting NONE action',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                    nettoErlös: 0,
                    steuer: 0
                }
            },
            {
                label: 'NONE action with source-less negative tax aggregate',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'NONE',
                    title: 'Invalid NONE loss-carry injection',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: {},
                    nettoErlös: 0,
                    steuer: 0,
                    taxRawAggregate: {
                        sumRealizedGainSigned: -100000,
                        sumTaxableAfterTqfSigned: -70000
                    }
                }
            },
            {
                label: 'NONE action with an exact-cent cash-funded purchase',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'NONE',
                    title: 'Invalid exact-cent NONE purchase',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'liquiditaet', brutto: 0.01, netto: 0.01, steuer: 0 }],
                    verwendungen: { liquiditaet: 0, gold: 0.01, aktien: 0 },
                    nettoErlös: 0.01,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'cash-only action with negative tax aggregate',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid cash-funded loss-carry injection',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'liquiditaet', brutto: 10000, netto: 10000, steuer: 0 }],
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 10000 },
                    nettoErlös: 10000,
                    steuer: 0,
                    taxRawAggregate: {
                        sumRealizedGainSigned: -100000,
                        sumTaxableAfterTqfSigned: -70000
                    }
                }
            },
            {
                label: 'zero-gross asset source with fake loss carry',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'NONE',
                    title: 'Invalid zero-gross loss-carry injection',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 0,
                        netto: 0,
                        steuer: 0,
                        realizedGainSigned: -100000,
                        taxableAfterTqfSigned: -70000
                    }],
                    verwendungen: {},
                    nettoErlös: 0,
                    steuer: 0,
                    taxRawAggregate: {
                        sumRealizedGainSigned: -100000,
                        sumTaxableAfterTqfSigned: -70000
                    }
                }
            },
            {
                label: 'asset source tax raw values contradict legacy inventory economics',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid trillion-euro loss-carry injection',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 1,
                        netto: 1,
                        steuer: 0,
                        realizedGainSigned: -1000000000000,
                        taxableAfterTqfSigned: -1000000000000
                    }],
                    verwendungen: { liquiditaet: 1, gold: 0, aktien: 0 },
                    nettoErlös: 1,
                    steuer: 0,
                    taxRawAggregate: {
                        sumRealizedGainSigned: -1000000000000,
                        sumTaxableAfterTqfSigned: -1000000000000
                    }
                }
            },
            {
                label: 'asset source taxable raw value reverses realized-gain sign',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid tax-raw sign inversion',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 1,
                        netto: 1,
                        steuer: 0,
                        realizedGainSigned: 1,
                        taxableAfterTqfSigned: -1000000000000
                    }],
                    verwendungen: { liquiditaet: 1, gold: 0, aktien: 0 },
                    nettoErlös: 1,
                    steuer: 0,
                    taxRawAggregate: {
                        sumRealizedGainSigned: 1,
                        sumTaxableAfterTqfSigned: -1000000000000
                    }
                }
            },
            {
                label: 'unknown action type with positive cash use',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'UNEXPECTED',
                    title: 'Invalid unknown action',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                    nettoErlös: 10000,
                    steuer: 0
                }
            },
            {
                label: 'noncanonical cash source casing',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid source casing',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'Liquiditaet', brutto: 10000, netto: 10000, steuer: 0 }],
                    verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                    nettoErlös: 10000,
                    steuer: 0
                }
            },
            {
                label: 'noncanonical cash source whitespace',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid source whitespace',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'liquiditaet ', brutto: 10000, netto: 10000, steuer: 0 }],
                    verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                    nettoErlös: 10000,
                    steuer: 0
                }
            },
            {
                label: 'cash source missing net value',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid cash source without net value',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'liquiditaet', brutto: 10000, steuer: 0 }],
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 10000 },
                    nettoErlös: 10000,
                    steuer: 0
                }
            },
            {
                label: 'cash source string net value',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid cash source string net value',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'liquiditaet', brutto: 10000, steuer: 0, netto: '10000' }],
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 10000 },
                    nettoErlös: 10000,
                    steuer: 0
                }
            },
            {
                label: 'cash source nonzero tax and divergent net',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid taxed cash source',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'liquiditaet', brutto: 10000, steuer: 999999, netto: -989999 }],
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 10000 },
                    nettoErlös: 10000,
                    steuer: 0
                }
            },
            {
                label: 'per-source asset rounding drift accumulates above tolerance',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid accumulated asset source drift',
                    diagnosisEntries: [],
                    quellen: [
                        {
                            kind: 'aktien_alt',
                            brutto: 100,
                            netto: 100.009,
                            steuer: 0,
                            realizedGainSigned: 0,
                            taxableAfterTqfSigned: 0
                        },
                        {
                            kind: 'aktien_alt',
                            brutto: 100,
                            netto: 100.009,
                            steuer: 0,
                            realizedGainSigned: 0,
                            taxableAfterTqfSigned: 0
                        }
                    ],
                    verwendungen: { liquiditaet: 200.018, gold: 0, aktien: 0 },
                    nettoErlös: 200.018,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'zero-gross asset source mints one cent of net funding',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid exact-cent net mint',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 0,
                        netto: 0.01,
                        steuer: 0,
                        realizedGainSigned: 0,
                        taxableAfterTqfSigned: 0
                    }],
                    verwendungen: { liquiditaet: 0.01, gold: 0, aktien: 0 },
                    nettoErlös: 0.01,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'per-source cash rounding drift accumulates above tolerance',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid accumulated cash source drift',
                    diagnosisEntries: [],
                    quellen: [
                        { kind: 'liquiditaet', brutto: 100, netto: 100.009, steuer: 0 },
                        { kind: 'liquiditaet', brutto: 100, netto: 100.009, steuer: 0 }
                    ],
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 200 },
                    nettoErlös: 200,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'money-market source already counted as liquidity',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid double-counted money-market source',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'geldmarkt', brutto: 10000, steuer: 0, netto: 10000 }],
                    verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                    nettoErlös: 10000,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'unknown use key',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid use key',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 10000,
                        netto: 10000,
                        steuer: 0,
                        realizedGainSigned: 0,
                        taxableAfterTqfSigned: 0
                    }],
                    verwendungen: { liquiditaett: 10000 },
                    nettoErlös: 10000,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'money-market use unsupported at Core boundary',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid Core money-market transfer',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'liquiditaet', brutto: 10000, netto: 10000, steuer: 0 }],
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 0, geldmarkt: 10000 },
                    nettoErlös: 10000,
                    steuer: 0
                }
            },
            {
                label: 'legacy asset source overbooks inventory',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid legacy inventory overbooking',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 1000000,
                        netto: 1000000,
                        steuer: 0,
                        realizedGainSigned: 0,
                        taxableAfterTqfSigned: 0
                    }],
                    verwendungen: { liquiditaet: 1000000, gold: 0, aktien: 0 },
                    nettoErlös: 1000000,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'duplicate detailed sources overbook one lot',
                expectedContract: 'planned_action_flow',
                engineInput: {
                    ...baseEngineInput,
                    detailledTranches: [{
                        schemaVersion: 2,
                        trancheId: 'alt-1',
                        isin: 'ALT1',
                        name: 'Altbestand',
                        type: 'aktien_alt',
                        category: 'equity',
                        marketValue: 500000,
                        costBasis: 300000,
                        tqf: 0.3,
                        taxExempt: false,
                        purchaseDate: '2020-01-01'
                    }]
                },
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid detailed lot overbooking',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        trancheId: 'alt-1',
                        sourceProfileId: null,
                        brutto: 300000,
                        netto: 300000,
                        steuer: 0,
                        realizedGainSigned: 0,
                        taxableAfterTqfSigned: 0
                    }, {
                        kind: 'aktien_alt',
                        trancheId: 'alt-1',
                        sourceProfileId: null,
                        brutto: 300000,
                        netto: 300000,
                        steuer: 0,
                        realizedGainSigned: 0,
                        taxableAfterTqfSigned: 0
                    }],
                    verwendungen: { liquiditaet: 600000, gold: 0, aktien: 0 },
                    nettoErlös: 600000,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'source tax raw values exceed action aggregate',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid zeroed action tax aggregate',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 10000,
                        steuer: 0,
                        netto: 10000,
                        realizedGainSigned: 4000,
                        taxableAfterTqfSigned: 2800
                    }],
                    verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                    nettoErlös: 10000,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                }
            },
            {
                label: 'action tax aggregate exceeds source raw values',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid invented action tax aggregate',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 10000,
                        steuer: 0,
                        netto: 10000,
                        realizedGainSigned: 0,
                        taxableAfterTqfSigned: 0
                    }],
                    verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
                    nettoErlös: 10000,
                    steuer: 0,
                    taxRawAggregate: { sumRealizedGainSigned: 4000, sumTaxableAfterTqfSigned: 2800 }
                }
            },
            {
                label: 'missing asset-sale tax aggregate',
                expectedContract: 'planned_action_flow',
                omitDefaultTaxAggregate: true,
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid missing tax aggregate',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 10000,
                        steuer: 1000,
                        netto: 9000,
                        realizedGainSigned: 4000,
                        taxableAfterTqfSigned: 2800
                    }],
                    verwendungen: { liquiditaet: 9000, gold: 0, aktien: 0 },
                    nettoErlös: 9000,
                    steuer: 1000
                }
            },
            {
                label: 'string asset-sale tax aggregate',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid string tax aggregate',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 10000,
                        steuer: 1000,
                        netto: 9000,
                        realizedGainSigned: 1000,
                        taxableAfterTqfSigned: 1000
                    }],
                    verwendungen: { liquiditaet: 9000, gold: 0, aktien: 0 },
                    nettoErlös: 9000,
                    steuer: 1000,
                    taxRawAggregate: {
                        sumRealizedGainSigned: '1000',
                        sumTaxableAfterTqfSigned: 1000
                    }
                }
            },
            {
                label: 'NaN asset-sale tax aggregate',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid NaN tax aggregate',
                    diagnosisEntries: [],
                    quellen: [{
                        kind: 'aktien_alt',
                        brutto: 10000,
                        steuer: 1000,
                        netto: 9000,
                        realizedGainSigned: 1000,
                        taxableAfterTqfSigned: 1000
                    }],
                    verwendungen: { liquiditaet: 9000, gold: 0, aktien: 0 },
                    nettoErlös: 9000,
                    steuer: 1000,
                    taxRawAggregate: {
                        sumRealizedGainSigned: Number.NaN,
                        sumTaxableAfterTqfSigned: 1000
                    }
                }
            },
            {
                label: 'malformed uses container',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid uses container',
                    diagnosisEntries: [],
                    quellen: [],
                    verwendungen: 'oops',
                    nettoErlös: 0,
                    steuer: 0
                }
            },
            {
                label: 'unreconciled cash-funded uses',
                expectedContract: 'planned_action_flow',
                action: {
                    type: 'TRANSACTION',
                    title: 'Invalid cash-funded uses',
                    diagnosisEntries: [],
                    quellen: [{ kind: 'liquiditaet', brutto: 10000, netto: 10000, steuer: 0 }],
                    verwendungen: { liquiditaet: 0, gold: 0, aktien: 5000 },
                    nettoErlös: 10000,
                    steuer: 0
                }
            }
        ];

        for (const testCase of invalidCashActions) {
            TransactionEngine.determineAction = () => {
                const action = { ...testCase.action };
                if (
                    !testCase.omitDefaultTaxAggregate
                    && !Object.prototype.hasOwnProperty.call(action, 'taxRawAggregate')
                ) {
                    action.taxRawAggregate = {
                        sumRealizedGainSigned: 0,
                        sumTaxableAfterTqfSigned: 0
                    };
                }
                return action;
            };
            const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear(
                testCase.engineInput || baseEngineInput,
                null
            ));
            assert(result.error instanceof FinancialCalculationError,
                `${testCase.label} must fail instead of being normalized or clamped`);
            assertEqual(result.error.context?.contract, testCase.expectedContract || 'planned_liquidity_flow',
                `${testCase.label} must identify the violated liquidity-flow contract`);
            if (testCase.expectedPhase) {
                assertEqual(result.error.context?.phase, testCase.expectedPhase,
                    `${testCase.label} must fail at the documented action-contract phase`);
            }
        }
    } finally {
        TransactionEngine.determineAction = originalDetermineAction;
    }
}

// --- TEST 10b: non-sellable money-market lots remain valid inventory context ---
{
    const originalDetermineAction = TransactionEngine.determineAction;
    try {
        TransactionEngine.determineAction = () => ({
            type: 'TRANSACTION',
            title: 'Valid equity sale beside money-market inventory',
            diagnosisEntries: [],
            quellen: [{
                kind: 'aktien_alt',
                trancheId: 'eq-1',
                brutto: 10000,
                netto: 10000,
                steuer: 0,
                realizedGainSigned: 0,
                taxableAfterTqfSigned: 0
            }],
            verwendungen: { liquiditaet: 10000, gold: 0, aktien: 0 },
            nettoErlös: 10000,
            steuer: 0,
            taxRawAggregate: { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
        });
        const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear({
            ...baseEngineInput,
            geldmarktEtf: 10000,
            detailledTranches: [
                {
                    schemaVersion: 2,
                    trancheId: 'eq-1',
                    type: 'aktien_alt',
                    category: 'equity',
                    marketValue: 500000,
                    costBasis: 500000,
                    tqf: 0.3,
                    taxExempt: false
                },
                {
                    schemaVersion: 2,
                    trancheId: 'mm-1',
                    type: 'geldmarkt',
                    category: 'money_market',
                    marketValue: 10000,
                    costBasis: 10000,
                    tqf: 0,
                    taxExempt: false
                }
            ]
        }, null));
        assert(!result.error,
            'A money-market lot in detailed inventory must not block a valid equity source');
        assertEqual(result.ui.action.type, 'TRANSACTION',
            'The valid equity sale beside money-market inventory must remain executable');
    } finally {
        TransactionEngine.determineAction = originalDetermineAction;
    }
}

// --- TEST 10c: action inventory uses the canonical share/price derivation ---
{
    const originalDetermineAction = TransactionEngine.determineAction;
    try {
        const plannedTax = 474.75;
        const plannedNet = 10000 - plannedTax;
        TransactionEngine.determineAction = () => ({
            type: 'TRANSACTION',
            title: 'Valid derived-inventory equity sale',
            diagnosisEntries: [],
            quellen: [{
                kind: 'aktien_alt',
                trancheId: 'derived-eq-1',
                brutto: 10000,
                netto: plannedNet,
                steuer: plannedTax,
                realizedGainSigned: 4000,
                taxableAfterTqfSigned: 2800
            }],
            verwendungen: { liquiditaet: plannedNet, gold: 0, aktien: 0 },
            nettoErlös: plannedNet,
            steuer: plannedTax,
            taxRawAggregate: {
                sumRealizedGainSigned: 4000,
                sumTaxableAfterTqfSigned: 2800
            }
        });
        const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear({
            ...baseEngineInput,
            detailledTranches: [{
                schemaVersion: 2,
                trancheId: 'derived-eq-1',
                type: 'aktien_alt',
                category: 'equity',
                shares: 500,
                purchasePrice: 600,
                currentPrice: 1000,
                tqf: 0.3,
                taxExempt: false
            }]
        }, null));
        assert(!result.error,
            'Share/price-derived market value and cost basis must satisfy the shared inventory contract');
        assertEqual(result.ui.action.taxRawAggregate.sumRealizedGainSigned, 4000,
            'Derived inventory must bind the source realized gain to the canonical lot economics');
    } finally {
        TransactionEngine.determineAction = originalDetermineAction;
    }
}

// --- TEST 11: a negative subcent tax-reserve remainder is neutralized consistently ---
{
    const originalDetermineAction = TransactionEngine.determineAction;
    try {
        const plannedTax = 0.25875;
        const plannedGross = 1001;
        const plannedNet = plannedGross - plannedTax;
        TransactionEngine.determineAction = () => ({
            type: 'TRANSACTION',
            title: 'Subcent tax reserve witness',
            diagnosisEntries: [],
            quellen: [{
                kind: 'aktien_alt',
                brutto: plannedGross,
                steuer: plannedTax,
                netto: plannedNet,
                realizedGainSigned: 1001,
                taxableAfterTqfSigned: 1001
            }],
            verwendungen: { liquiditaet: 0, gold: 0, aktien: 0, bonds: plannedNet },
            nettoErlös: plannedNet,
            steuer: plannedTax,
            taxRawAggregate: { sumRealizedGainSigned: 1001, sumTaxableAfterTqfSigned: 1001 }
        });
        const result = withMutedValidationLog(() => EngineAPI.simulateSingleYear({
            ...baseEngineInput,
            costBasisAlt: 0
        }, null));
        assert(!result.error, 'Negative tax-reserve rounding noise up to one cent must not create a negative liquidity use');
        assertEqual(result.ui.action.taxCashAdjustment, 0,
            'Core must apply the same negative-subcent normalization as simulator tax recompute');
        assertEqual(result.ui.action.verwendungen.liquiditaet, 0,
            'Normalized subcent noise must leave the planned liquidity use non-negative');
    } finally {
        TransactionEngine.determineAction = originalDetermineAction;
    }
}

// --- TEST 12: non-positive forced shortfall is a neutral no-sale path ---
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
