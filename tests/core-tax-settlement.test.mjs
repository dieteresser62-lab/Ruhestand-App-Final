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
}

console.log('--- Core Tax Settlement Integration Tests Completed ---');
