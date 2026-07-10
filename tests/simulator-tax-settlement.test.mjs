import { simulateOneYear } from '../app/simulator/simulator-engine-direct.js';
import { applyForcedSaleLiquidityCoverage, applyPayoutFallbackSale, reduceAcrossTranches } from '../app/simulator/simulator-forced-sale.js';
import { addTaxRawAggregate, applySimulatorTaxRecompute, buildTaxRawAggregate } from '../app/simulator/simulator-tax-recompute.js';
import { settleTaxYear } from '../engine/tax-settlement.mjs';
import { prepareHistoricalData } from '../app/simulator/simulator-portfolio.js';

console.log('--- Simulator Tax Settlement Tests ---');

prepareHistoricalData();

function buildInputs(overrides = {}) {
    return {
        startAlter: 65,
        accumulationPhase: { enabled: false },
        transitionYear: 0,
        startVermoegen: 600000,
        depotwertAlt: 600000,
        einstandAlt: 900000,
        tagesgeld: 0,
        geldmarktEtf: 0,
        zielLiquiditaet: 0,
        startFloorBedarf: 120000,
        startFlexBedarf: 0,
        flexBudgetAnnual: 0,
        flexBudgetRecharge: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        rentAdjPct: 0,
        goldAktiv: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        goldSteuerfrei: false,
        risikoprofil: 'sicherheits-dynamisch',
        rebalancingBand: 20,
        runwayTargetMonths: 36,
        runwayMinMonths: 24,
        targetEq: 60,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        marketCapeRatio: 20,
        capeRatio: 20,
        kirchensteuerSatz: 0,
        startSPB: 1000,
        dynamicFlex: false,
        goGoActive: false,
        goGoMultiplier: 1.0,
        pflegefallLogikAktivieren: false,
        geschlecht: 'm',
        partner: { aktiv: false },
        stressPreset: 'NONE',
        ...overrides
    };
}

function buildState(overrides = {}) {
    return {
        portfolio: {
            depotTranchesAktien: [{ marketValue: 600000, costBasis: 900000, type: 'aktien_alt', purchaseDate: '2000-01-01' }],
            depotTranchesGold: [],
            liquiditaet: 0
        },
        marketDataHist: {
            ath: 100,
            endeVJ: 100,
            endeVJ_1: 95,
            endeVJ_2: 90,
            jahreSeitAth: 0,
            capeRatio: 20
        },
        baseFloor: 120000,
        baseFlex: 0,
        currentAnnualPension: 0,
        currentAnnualPension2: 0,
        lastState: { taxState: { lossCarry: 0 } },
        widowPensionP1: 0,
        widowPensionP2: 0,
        ...overrides
    };
}

const crashYear = {
    jahr: 2008,
    rendite: -0.40,
    inflation: 0,
    zinssatz: 0,
    gold_eur_perf: 0
};

function makeStubEngine({ monthlyWithdrawal, actionTax, actionTaxableRaw = 1000 }) {
    return {
        simulateSingleYear: (_engineInput, lastState) => ({
            ui: {
                spending: {
                    monatlicheEntnahme: monthlyWithdrawal,
                    kuerzungQuelle: 'none',
                    details: { flexRate: 1 }
                },
                action: {
                    type: 'TRANSACTION',
                    title: 'Test Transaction',
                    anweisungKlasse: 'anweisung-gelb',
                    quellen: [{ kind: 'aktien_alt', brutto: 1000, steuer: actionTax, netto: 1000 - actionTax }],
                    verwendungen: {},
                    nettoErlös: 1000 - actionTax,
                    steuer: actionTax,
                    pauschbetragVerbraucht: 0,
                    taxRawAggregate: {
                        sumRealizedGainSigned: actionTaxableRaw,
                        sumTaxableAfterTqfSigned: actionTaxableRaw
                    },
                    taxSettlement: {
                        sumTaxableAfterTqfSigned: actionTaxableRaw,
                        lossCarryStart: Number(lastState?.taxState?.lossCarry) || 0,
                        taxBeforeLossCarry: actionTax,
                        taxAfterLossCarry: actionTax,
                        taxSavedByLossCarry: 0,
                        spbUsedThisYear: 0
                    },
                    transactionDiagnostics: { blockReason: 'none' }
                },
                market: { szenarioText: 'test' },
                runway: { months: 24 },
                liquiditaet: { deckungNachher: 100 },
                vpw: null,
                zielLiquiditaet: 0
            },
            newState: {
                alarmActive: false,
                lastMarketSKey: 'BULL',
                cumulativeInflationFactor: 1,
                taxState: { lossCarry: Number(lastState?.taxState?.lossCarry) || 0 }
            }
        })
    };
}

// 0) Direct helper tests for raw aggregate and recompute mutation contract.
{
    const aggregate = buildTaxRawAggregate({
        sumRealizedGainSigned: '100',
        sumTaxableAfterTqfSigned: '50'
    });
    addTaxRawAggregate(aggregate, {
        sumRealizedGainSigned: -40,
        sumTaxableAfterTqfSigned: -20
    }, 0.5);
    assertClose(aggregate.sumRealizedGainSigned, 80, 1e-9, 'Raw aggregate should add scaled realized gains');
    assertClose(aggregate.sumTaxableAfterTqfSigned, 40, 1e-9, 'Raw aggregate should add scaled taxable gains');

    const actionResult = {
        steuer: 100,
        taxSettlement: { existing: true },
        taxRawAggregate: { sumRealizedGainSigned: 100, sumTaxableAfterTqfSigned: 100 }
    };
    const spendingNewState = {};
    const recompute = applySimulatorTaxRecompute({
        didForcedSale: true,
        actionResult,
        spendingNewState,
        taxStatePrev: { lossCarry: 0 },
        combinedTaxRawAggregate: aggregate,
        sparerPauschbetrag: 0,
        kirchensteuerSatz: 0,
        forcedSaleScaleApplied: 0.5
    });
    const expected = settleTaxYear({
        taxStatePrev: { lossCarry: 0 },
        rawAggregate: aggregate,
        sparerPauschbetrag: 0,
        kirchensteuerSatz: 0
    });
    assertClose(recompute.totalTaxesThisYear, expected.taxDue, 1e-9, 'Direct recompute should return settlement tax');
    assert(actionResult.taxSettlement.recomputedWithForcedSales === true, 'Direct recompute should mark forced recompute');
    assert(actionResult.taxSettlement.forcedSaleScaleApplied === 0.5, 'Direct recompute should preserve forced sale scale');
    assertClose(actionResult.taxSettlement.taxReservedTotal, 100, 1e-9,
        'Direct recompute should expose the cash-effective regular tax reserve');
    assertClose(recompute.taxCashAdjustment, 100 - expected.taxDue, 1e-9,
        'Direct recompute should return the reserve release for operative cash');
    assert(spendingNewState.taxState, 'Direct recompute should update next tax state');
}

// 0aa) A partially executed regular sale scales reserve and raw aggregate alike.
{
    const regularSaleScale = 0.5;
    const combinedTaxRawAggregate = buildTaxRawAggregate();
    addTaxRawAggregate(combinedTaxRawAggregate, {
        sumRealizedGainSigned: 4000,
        sumTaxableAfterTqfSigned: 2800
    }, regularSaleScale);
    const actionResult = {
        steuer: 500,
        taxSettlement: {},
        taxRawAggregate: {}
    };
    const recompute = applySimulatorTaxRecompute({
        didForcedSale: false,
        actionResult,
        spendingNewState: {},
        taxStatePrev: { lossCarry: 0 },
        combinedTaxRawAggregate,
        sparerPauschbetrag: 1000,
        kirchensteuerSatz: 0,
        regularSaleScale
    });
    const expected = settleTaxYear({
        taxStatePrev: { lossCarry: 0 },
        rawAggregate: combinedTaxRawAggregate,
        sparerPauschbetrag: 1000,
        kirchensteuerSatz: 0
    });
    assertClose(actionResult.taxRawAggregate.sumTaxableAfterTqfSigned, 1400, 1e-9,
        'Partial regular sale should expose the scaled taxable raw aggregate');
    assertClose(actionResult.taxSettlement.regularTaxReserved, 250, 1e-9,
        'Partial regular sale should scale the cash-effective tax reserve');
    assert(actionResult.taxSettlement.recomputedWithForcedSales === false,
        'Partial regular sale alone should recompute without claiming a forced sale');
    assertClose(recompute.taxCashAdjustment, 250 - expected.taxDue, 1e-9,
        'Partial regular sale should reconcile scaled reserve against scaled settlement');
}

// 0ab) An underfunded reserve is a hard contract error, not another cash withdrawal.
{
    let error = null;
    try {
        applySimulatorTaxRecompute({
            didForcedSale: true,
            actionResult: { steuer: 0, taxSettlement: {}, taxRawAggregate: {} },
            spendingNewState: {},
            taxStatePrev: { lossCarry: 0 },
            combinedTaxRawAggregate: buildTaxRawAggregate({
                sumRealizedGainSigned: 1000,
                sumTaxableAfterTqfSigned: 1000
            }),
            sparerPauschbetrag: 0,
            kirchensteuerSatz: 0,
            forcedTaxReserved: 0
        });
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof Error && error.message.includes('Simulator-Steuerreserve-Contract verletzt'),
        'Reserve underfunding below tolerance should stop the simulator contract');
}

// 0a) Direct recompute consumes existing loss carry before SPB/final tax.
{
    const aggregate = buildTaxRawAggregate({
        sumRealizedGainSigned: 7000,
        sumTaxableAfterTqfSigned: 6000
    });
    const actionResult = {
        steuer: 999,
        taxSettlement: { existing: true },
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
        kirchensteuerSatz: 0.09,
        forcedSaleScaleApplied: 1
    });
    const keSt = 0.25 * (1 + 0.055 + 0.09);
    assertClose(actionResult.taxSettlement.lossCarryStart, 2000, 1e-9,
        'Forced recompute should expose starting loss carry');
    assertClose(actionResult.taxSettlement.taxBaseBeforeCarry, 5000, 1e-9,
        'Forced recompute should expose baseline tax base before loss carry');
    assertClose(actionResult.taxSettlement.taxBaseAfterCarry, 3000, 1e-9,
        'Forced recompute should consume loss carry before SPB/final tax');
    assertClose(actionResult.steuer, 3000 * keSt, 0.01,
        'Forced recompute should set action tax to final settlement tax');
    assertClose(recompute.totalTaxesThisYear, actionResult.steuer, 1e-9,
        'Simulator yearly tax should come from recomputed action tax');
    assertClose(actionResult.taxSettlement.taxSavedByLossCarry, 2000 * keSt, 0.01,
        'Forced recompute should expose tax saved by loss carry');
    assertClose(spendingNewState.taxState.lossCarry, 0, 1e-9,
        'Forced recompute should update next simulator tax state');
    assertClose(actionResult.taxRawAggregate.sumTaxableAfterTqfSigned, 6000, 1e-9,
        'Forced recompute should copy combined raw aggregate to action');
}

// 0b) Direct forced-sale liquidity coverage helper mutates portfolio and tax aggregate.
{
    const fifoTranches = [
        { marketValue: 100, costBasis: 80, purchaseDate: '2020-01-01' },
        { marketValue: 100, costBasis: 50, purchaseDate: '2010-01-01' }
    ];
    const reduced = reduceAcrossTranches(fifoTranches, 120, true);
    assertClose(reduced, 120, 1e-9, 'Fallback reducer should cover requested amount');
    assertClose(fifoTranches[1].marketValue, 0, 1e-9, 'Fallback reducer should reduce oldest tranche first');
    assertClose(fifoTranches[0].marketValue, 80, 1e-9, 'Fallback reducer should continue with next tranche');

    const portfolio = {
        depotTranchesAktien: [{
            marketValue: 100000,
            costBasis: 50000,
            type: 'aktien_alt',
            category: 'equity',
            purchaseDate: '2000-01-01',
            tqf: 0.3
        }],
        depotTranchesGold: [],
        liquiditaet: 0
    };
    const combinedTaxRawAggregate = buildTaxRawAggregate();
    const coverage = applyForcedSaleLiquidityCoverage({
        forcedShortfall: 10000,
        portfolio,
        engineInput: {
            sparerPauschbetrag: 100000,
            kirchensteuerSatz: 0,
            goldAktiv: false,
            depotwertAlt: 100000,
            depotwertNeu: 0,
            goldWert: 0
        },
        market: { sKey: 'bear_deep' },
        is3Bucket: false,
        isBadYear: false,
        depotTranchesAktien: portfolio.depotTranchesAktien,
        depotTranchesGold: portfolio.depotTranchesGold,
        equityBeforeForced: 100000,
        goldBeforeForced: 0,
        combinedTaxRawAggregate
    });
    assert(coverage.didForcedSale === true, 'Forced coverage should mark forced sale');
    assert(coverage.liquiditaetDelta > 0, 'Forced coverage should add liquidity');
    assert(coverage.forcedTaxReservedDelta > 0, 'Forced coverage should expose its scaled plan-tax reserve');
    assert(portfolio.depotTranchesAktien[0].marketValue < 100000, 'Forced coverage should reduce portfolio value');
    assert(combinedTaxRawAggregate.sumRealizedGainSigned > 0, 'Forced coverage should add realized gain to tax aggregate');
    const forcedGrossExecuted = 100000 - portfolio.depotTranchesAktien[0].marketValue;
    const forcedAction = { steuer: 0, taxSettlement: {}, taxRawAggregate: {} };
    const forcedReconciliation = applySimulatorTaxRecompute({
        didForcedSale: true,
        actionResult: forcedAction,
        spendingNewState: {},
        taxStatePrev: { lossCarry: 0 },
        combinedTaxRawAggregate,
        sparerPauschbetrag: 0,
        kirchensteuerSatz: 0,
        forcedTaxReserved: coverage.forcedTaxReservedDelta,
        forcedSaleScaleApplied: coverage.forcedSaleScaleApplied
    });
    assertClose(coverage.liquiditaetDelta + forcedReconciliation.taxCashAdjustment,
        forcedGrossExecuted - forcedAction.steuer, 0.01,
        'Forced-sale gross minus final tax should equal reconciled sale cash');

    const payoutPortfolio = {
        depotTranchesAktien: [{ marketValue: 20000, costBasis: 15000, type: 'aktien_alt', purchaseDate: '2000-01-01' }],
        depotTranchesGold: []
    };
    const fallback = applyPayoutFallbackSale({
        jahresEntnahmeEffektiv: 5000,
        netFloorYear: 10000,
        liquiditaet: 0,
        payout: 5000,
        is3Bucket: false,
        isBadYear: false,
        depotTranchesAktien: payoutPortfolio.depotTranchesAktien,
        depotTranchesGold: payoutPortfolio.depotTranchesGold,
        formatRuinNumber: value => Math.round(value)
    });
    assert(fallback.isRuin === false, 'Payout fallback should avoid ruin when assets can cover floor');
    assertClose(fallback.liquiditaet, 0, 1e-9, 'Payout fallback should spend the fallback sale on the floor');
    assertClose(payoutPortfolio.depotTranchesAktien[0].marketValue, 15000, 1e-9, 'Payout fallback should reduce assets by missing floor amount');
}

// 1) Forced sale path: settlement must be recomputed with combined raw aggregate.
{
    const inputs = buildInputs();
    const state = buildState();
    const engine = makeStubEngine({ monthlyWithdrawal: 10000, actionTax: 100 });
    const result = simulateOneYear(state, inputs, crashYear, 0, null, 0, null, 1, engine);

    assert(!result.isRuin, 'Forced-sale scenario should still return a valid result');
    assert(result.ui?.action?.taxSettlement?.recomputedWithForcedSales === true, 'Forced-sale scenario must mark recompute=true');
    assert(result.ui?.action?.steuer < 100, 'Forced-sale recompute should reduce tax in this loss scenario');
    assert(result.ui?.action?.taxSettlement?.taxReservedTotal >= result.ui?.action?.steuer,
        'Forced-sale scenario should reserve at least the final tax');
    assertClose(result.ui.action.taxSettlement.taxCashAdjustment,
        result.ui.action.taxSettlement.taxReservedTotal - result.ui.action.steuer, 0.01,
        'Forced-sale scenario should expose exactly one reserve reconciliation');

    const expectedTax = settleTaxYear({
        taxStatePrev: { lossCarry: 0 },
        rawAggregate: result.ui.action.taxRawAggregate,
        sparerPauschbetrag: inputs.startSPB,
        kirchensteuerSatz: inputs.kirchensteuerSatz
    }).taxDue;
    assertClose(result.ui.action.steuer, expectedTax, 1e-9, 'Recomputed action tax should equal settlement(rawAggregate)');
}

// 2) No forced sale path: settlement stays untouched (except flags).
{
    const inputs = buildInputs({ startFloorBedarf: 0, startFlexBedarf: 0 });
    const state = buildState({
        baseFloor: 0,
        baseFlex: 0,
        portfolio: {
            depotTranchesAktien: [{ marketValue: 600000, costBasis: 400000, type: 'aktien_alt', purchaseDate: '2000-01-01' }],
            depotTranchesGold: [],
            liquiditaet: 200000
        }
    });
    const engine = makeStubEngine({ monthlyWithdrawal: 0, actionTax: 77 });
    const result = simulateOneYear(state, inputs, { ...crashYear, rendite: 0.02 }, 0, null, 0, null, 1, engine);

    assert(!result.isRuin, 'No-forced-sale scenario should return a valid result');
    assert(result.ui?.action?.taxSettlement?.recomputedWithForcedSales === false, 'No-forced-sale scenario must keep recompute=false');
    assert(result.ui?.action?.steuer === 77, 'No-forced-sale scenario should keep engine settlement tax');
    assert(result.totalTaxesThisYear === 77, 'Year tax should come from action.steuer directly');
    assertClose(result.ui.action.taxSettlement.taxCashAdjustment, 0, 1e-9,
        'Scale-1 year without forced sale should not run simulator cash reconciliation');
}

// 3) Ten deterministic years reconcile reserves without cumulative tax/cash drift.
{
    const yearlyRawTaxable = [4000, -3000, 2500, 6000, -1500, 3200, 0, 5000, -2500, 4500];
    let taxState = { lossCarry: 0 };
    let cumulativeReserved = 0;
    let cumulativeTaxDue = 0;
    let cumulativeCashAdjustment = 0;
    let sawForcedSale = false;
    let sawLossYear = false;

    yearlyRawTaxable.forEach((taxableRaw, yearIndex) => {
        const didForcedSale = yearIndex % 3 === 0;
        const regularSaleScale = yearIndex === 5 ? 0.6 : 1;
        const regularTaxReserved = taxableRaw > 0 ? 1200 * regularSaleScale : 0;
        const forcedTaxReserved = didForcedSale && taxableRaw > 0 ? 500 : 0;
        const aggregate = buildTaxRawAggregate({
            sumRealizedGainSigned: taxableRaw,
            sumTaxableAfterTqfSigned: taxableRaw
        });
        const actionResult = {
            steuer: regularSaleScale > 0 ? regularTaxReserved / regularSaleScale : 0,
            taxSettlement: {},
            taxRawAggregate: {}
        };
        const spendingNewState = {};
        const result = applySimulatorTaxRecompute({
            didForcedSale,
            actionResult,
            spendingNewState,
            taxStatePrev: taxState,
            combinedTaxRawAggregate: aggregate,
            sparerPauschbetrag: 1000,
            kirchensteuerSatz: 0,
            regularSaleScale,
            forcedTaxReserved,
            forcedSaleScaleApplied: didForcedSale ? 1 : null
        });

        taxState = spendingNewState.taxState || taxState;
        cumulativeReserved += regularTaxReserved + forcedTaxReserved;
        cumulativeTaxDue += result.totalTaxesThisYear;
        cumulativeCashAdjustment += result.taxCashAdjustment;
        sawForcedSale ||= didForcedSale;
        sawLossYear ||= taxableRaw < 0;
        assertClose(result.taxCashAdjustment,
            regularTaxReserved + forcedTaxReserved - result.totalTaxesThisYear, 0.01,
            `Year ${yearIndex + 1} should reconcile reserve and final tax exactly once`);
    });

    assert(sawForcedSale, 'Ten-year sequence should contain forced sales');
    assert(sawLossYear, 'Ten-year sequence should contain loss years');
    assertClose(cumulativeCashAdjustment, cumulativeReserved - cumulativeTaxDue, 0.01,
        'Ten-year sequence should have no cumulative tax/cash drift');
}

console.log('✅ Simulator tax settlement tests passed');
