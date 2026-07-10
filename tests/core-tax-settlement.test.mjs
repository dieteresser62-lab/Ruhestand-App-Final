import { EngineAPI } from '../engine/index.mjs';

console.log('--- Core Tax Settlement Integration Tests ---');

const baseInput = {
    depotwertAlt: 300000,
    depotwertNeu: 0,
    goldWert: 0,
    tagesgeld: 0,
    geldmarktEtf: 0,
    inflation: 2.0,
    renteMonatlich: 0,
    floorBedarf: 36000,
    flexBedarf: 12000,
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
    costBasisAlt: 150000,
    costBasisNeu: 0,
    goldCost: 0,
    sparerPauschbetrag: 1000,
    kirchensteuerSatz: 0
};

function assertSaleContract(action, messagePrefix) {
    const verwendungenSumme = (action.verwendungen?.liquiditaet || 0) +
        (action.verwendungen?.gold || 0) +
        (action.verwendungen?.aktien || 0);
    assertClose(action.bruttoVerkaufGesamt - action.steuer, action.nettoErlös, 0.01,
        `${messagePrefix}: gross sale minus final tax should equal final net proceeds`);
    assertClose(verwendungenSumme, action.nettoErlös, 0.01,
        `${messagePrefix}: uses should distribute final net proceeds completely`);
    assertClose(action.nettoErlösPlan, action.bruttoVerkaufGesamt - action.steuerPlanGesamt, 0.01,
        `${messagePrefix}: planned net proceeds should use planned tax reserve`);
    assertClose(action.taxCashAdjustment, action.steuerPlanGesamt - action.steuer, 0.01,
        `${messagePrefix}: cash adjustment should reconcile planned and final tax`);
}

{
    const lastState = { taxState: { lossCarry: 5000 } };
    const lastStateBefore = JSON.stringify(lastState);
    const result = EngineAPI.simulateSingleYear(
        { ...baseInput },
        lastState
    );
    assert(!result.error, 'Core run with preloaded tax state should succeed');
    assert(result.newState && result.newState.taxState, 'newState.taxState should be present');
    assert(result.ui && result.ui.action, 'ui.action should exist');
    assert(result.ui.action.taxRawAggregate, 'ui.action.taxRawAggregate should be exposed');
    assert(result.ui.action.taxSettlement, 'ui.action.taxSettlement should be exposed');

    assertClose(result.ui.action.taxRawAggregate.sumRealizedGainSigned, 15000, 0.001,
        'Core tax raw aggregate should expose realized gain from sale');
    assertClose(result.ui.action.taxRawAggregate.sumTaxableAfterTqfSigned, 15000, 0.001,
        'Core tax raw aggregate should expose taxable signed gain from sale');
    assertClose(result.ui.action.taxSettlement.lossCarryStart, 5000, 0.001,
        'Core settlement should expose starting loss carry');
    assertClose(result.ui.action.taxSettlement.taxBaseBeforeCarry, 14000, 0.001,
        'Core settlement should expose pre-loss-carry tax base after SPB');
    assertClose(result.ui.action.taxSettlement.taxBaseAfterCarry, 9000, 0.001,
        'Core settlement should expose final tax base after loss carry and SPB');
    assertClose(result.ui.action.taxSettlement.taxSavedByLossCarry, 1318.75, 0.001,
        'Core settlement should expose tax saved by loss carry');
    assertClose(
        result.ui.action.steuer || 0,
        result.ui.action.taxSettlement.taxAfterLossCarry || 0,
        0.001,
        'action.steuer should equal settlement tax'
    );
    assertClose(result.ui.action.steuer || 0, 2373.75, 0.001,
        'Core action tax should be final settlement tax after loss carry');
    assertClose(result.ui.action.bruttoVerkaufGesamt, 30000, 0.001,
        'Core should preserve the conservative gross sale');
    assertClose(result.ui.action.steuerPlanGesamt, 3692.5, 0.001,
        'Core should expose the original planned tax reserve');
    assertClose(result.ui.action.nettoErlösPlan, 26307.5, 0.001,
        'Core should expose the original planned net proceeds');
    assertClose(result.ui.action.taxCashAdjustment, 1318.75, 0.001,
        'Core should credit the loss-carry tax saving exactly once');
    assertClose(result.ui.action.nettoErlös, 27626.25, 0.001,
        'Core should expose final net proceeds after tax reconciliation');
    assertClose(result.ui.action.verwendungen.liquiditaet, 27626.25, 0.001,
        'Core should add the tax saving only to liquidity use');
    assertClose(result.ui.runway.months, 6.9065625, 0.000001,
        'Core runway should use reconciled liquidity');
    assertSaleContract(result.ui.action, 'Partial loss carry');
    assertClose(result.newState.taxState.lossCarry, 0, 0.001,
        'Core should deplete loss carry when annual taxable base is sufficient');
    assertEqual(JSON.stringify(lastState), lastStateBefore, 'Core run must not mutate previous tax state');
}

{
    const result = EngineAPI.simulateSingleYear(
        { ...baseInput },
        { taxState: { lossCarry: 20000 } }
    );
    assert(!result.error, 'Core run with over-covering loss carry should succeed');
    assertClose(result.ui.action.taxSettlement.signedAfterCarry, -5000, 0.001,
        'Core settlement should keep negative signed base after over-covering loss carry');
    assertClose(result.ui.action.steuer || 0, 0, 0.001,
        'Over-covering loss carry should reduce final core tax to zero');
    assertClose(result.ui.action.taxCashAdjustment, 3692.5, 0.001,
        'Over-covering loss carry should release the full planned tax reserve');
    assertSaleContract(result.ui.action, 'Over-covering loss carry');
    assertClose(result.newState.taxState.lossCarry, 5000, 0.001,
        'Core should carry forward unused loss carry');
}

{
    const result = EngineAPI.simulateSingleYear(
        { ...baseInput },
        {}
    );
    assert(!result.error, 'Core run with empty lastState should succeed');
    assert(result.newState && result.newState.taxState, 'taxState should be defaulted when missing');
    assertEqual(typeof result.newState.taxState.lossCarry, 'number', 'taxState.lossCarry should be numeric');
    assertClose(result.ui.action.taxCashAdjustment, 0, 0.001,
        'Core run without loss carry should not adjust cash');
    assertClose(result.ui.action.nettoErlös, 26307.5, 0.001,
        'Core run without loss carry should preserve planned net proceeds');
    assertSaleContract(result.ui.action, 'No loss carry');
}

{
    const result = EngineAPI.simulateSingleYear(
        { ...baseInput, tagesgeld: 133100 },
        {}
    );
    assert(!result.error, 'Core no-transaction run should succeed');
    assertEqual(result.ui.action.type, 'NONE', 'Sufficient liquidity should not trigger a transaction');
    assertClose(result.ui.action.bruttoVerkaufGesamt, 0, 0.001,
        'No-transaction action should expose zero gross sale');
    assertClose(result.ui.action.steuerPlanGesamt, 0, 0.001,
        'No-transaction action should expose zero planned tax');
    assertClose(result.ui.action.steuer, 0, 0.001,
        'No-transaction action should expose zero final tax');
    assertClose(result.ui.action.nettoErlösPlan, 0, 0.001,
        'No-transaction action should expose zero planned net proceeds');
    assertClose(result.ui.action.nettoErlös, 0, 0.001,
        'No-transaction action should expose zero final net proceeds');
    assertClose(result.ui.action.taxCashAdjustment, 0, 0.001,
        'No-transaction action should expose zero tax cash adjustment');
    assertClose(result.ui.action.taxRawAggregate.sumRealizedGainSigned, 0, 0.001,
        'No-transaction action should expose neutral realized-gain aggregate');
    assertClose(result.ui.action.taxRawAggregate.sumTaxableAfterTqfSigned, 0, 0.001,
        'No-transaction action should expose neutral taxable aggregate');
}

{
    const result = EngineAPI.simulateSingleYear({
        ...baseInput,
        depotwertAlt: 6000,
        costBasisAlt: 2700,
        sparerPauschbetrag: 0,
        maxSkimPctOfEq: 50,
        tqfAlt: 0.3,
        detailledTranches: [
            {
                trancheId: 'loss-lot', type: 'aktien_alt', category: 'equity',
                marketValue: 1500, costBasis: 1950, tqf: 0.3, purchaseDate: '2020-01-01'
            },
            {
                trancheId: 'gain-lot', type: 'aktien_alt', category: 'equity',
                marketValue: 1500, costBasis: 750, tqf: 0.3, purchaseDate: '2021-01-01'
            },
            {
                trancheId: 'high-gain-lot', type: 'aktien_alt', category: 'equity',
                marketValue: 3000, costBasis: 0, tqf: 0.3, purchaseDate: '2022-01-01'
            }
        ]
    }, {});
    assert(!result.error, 'Core mixed gain/loss tranche run should succeed');
    assertClose(result.ui.action.taxRawAggregate.sumRealizedGainSigned, 300, 0.001,
        'Core should preserve signed realized gains across mixed tranches');
    assertClose(result.ui.action.taxRawAggregate.sumTaxableAfterTqfSigned, 210, 0.001,
        'Core should preserve signed taxable aggregates across mixed tranches');
    assert(Number.isFinite(result.ui.action.taxRawAggregate.sumRealizedGainSigned),
        'Mixed realized-gain aggregate should remain finite');
    assert(Number.isFinite(result.ui.action.taxRawAggregate.sumTaxableAfterTqfSigned),
        'Mixed taxable aggregate should remain finite');
    assertClose(result.ui.action.taxCashAdjustment, 83.08125, 0.001,
        'Core should reconcile the same-year loss against the positive-lot plan reserve');
    assertSaleContract(result.ui.action, 'Mixed gain/loss tranches');
}

{
    const result = EngineAPI.simulateSingleYear({
        ...baseInput,
        depotwertAlt: 2000,
        costBasisAlt: 1300,
        sparerPauschbetrag: 0,
        maxSkimPctOfEq: 50,
        tqfAlt: 0.3,
        detailledTranches: [
            {
                trancheId: 'loss-only-lot', type: 'aktien_alt', category: 'equity',
                marketValue: 1000, costBasis: 1300, tqf: 0.3, purchaseDate: '2020-01-01'
            },
            {
                trancheId: 'gain-not-sold', type: 'aktien_alt', category: 'equity',
                marketValue: 1000, costBasis: 0, tqf: 0.3, purchaseDate: '2021-01-01'
            }
        ]
    }, {});
    assert(!result.error, 'Core loss-only tranche run should succeed');
    assertClose(result.ui.action.taxRawAggregate.sumRealizedGainSigned, -300, 0.001,
        'Core should preserve a signed realized loss');
    assertClose(result.ui.action.taxRawAggregate.sumTaxableAfterTqfSigned, -210, 0.001,
        'Core should apply TQF symmetrically to a signed loss aggregate');
    assertClose(result.ui.action.steuer, 0, 0.001,
        'Loss-only sale should have zero final tax');
    assertClose(result.ui.action.taxCashAdjustment, 0, 0.001,
        'Loss-only sale should not invent a tax reserve adjustment');
    assertSaleContract(result.ui.action, 'Loss-only tranche');
}

console.log('--- Core Tax Settlement Integration Tests Completed ---');
