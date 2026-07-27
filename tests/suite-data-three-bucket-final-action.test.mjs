import { EngineAPI } from '../engine/index.mjs';
import { _allocateFinalTaxToActionSources } from '../engine/core.mjs';
import { calculateSaleAndTax } from '../engine/transactions/sale-engine.mjs';
import {
    appendBondReplenishment,
    applyThreeBucketLogic,
    reservePlannedLotInventory
} from '../engine/transactions/three-bucket-logic.mjs';
import { trySurplusRebalance } from '../engine/transactions/transaction-surplus.mjs';
import { attributeHouseholdAction } from '../app/profile/profilverbund-action-attribution.js';

console.log('--- Suite Data Slice 02 Final Action Tests ---');

function equityLot(overrides = {}) {
    return {
        trancheId: 'eq-1',
        isin: 'EQ1',
        name: 'Equity Lot',
        type: 'aktien_neu',
        category: 'equity',
        marketValue: 100000,
        costBasis: 100000,
        tqf: 0,
        purchaseDate: '2020-01-01',
        ...overrides
    };
}

function goldLot(trancheId, overrides = {}) {
    return {
        trancheId,
        isin: trancheId.toUpperCase(),
        name: `Gold ${trancheId}`,
        type: 'gold',
        category: 'gold',
        marketValue: 60000,
        costBasis: 60000,
        tqf: 1,
        purchaseDate: '2020-01-01',
        ...overrides
    };
}

function saleInput(detailledTranches, overrides = {}) {
    return {
        kirchensteuerSatz: 0,
        sparerPauschbetrag: 0,
        depotwertAlt: 0,
        costBasisAlt: 0,
        tqfAlt: 0,
        depotwertNeu: 0,
        costBasisNeu: 0,
        tqfNeu: 0,
        goldAktiv: false,
        goldWert: 0,
        goldCost: 0,
        goldSteuerfrei: false,
        rebalancingBand: 20,
        detailledTranches,
        ...overrides
    };
}

// O-03 / BAL-02: The production engine must expose the finite real equity
// return as a ratio. No test-only newState.marketData shape is allowed.
{
    const result = EngineAPI.simulateSingleYear({
        depotwertAlt: 100000,
        depotwertNeu: 0,
        goldWert: 0,
        tagesgeld: 50000,
        geldmarktEtf: 0,
        inflation: 2,
        renteAktiv: false,
        renteMonatlich: 0,
        floorBedarf: 24000,
        flexBedarf: 0,
        startAlter: 65,
        aktuellesAlter: 65,
        goldAktiv: false,
        goldFloorProzent: 0,
        goldZielProzent: 0,
        runwayTargetMonths: 36,
        runwayMinMonths: 24,
        risikoprofil: 'sicherheits-dynamisch',
        marketCapeRatio: 20,
        endeVJ: 70,
        endeVJ_1: 100,
        endeVJ_2: 100,
        endeVJ_3: 100,
        ath: 100,
        jahreSeitAth: 1
    }, null);

    assertClose(
        result.ui.market.realReturnEq,
        -0.32,
        1e-12,
        'Engine market output must expose real equity return as finite ratio'
    );
    assert(result.ui.market.realReturnEq < -0.15, 'A -30% nominal return at 2% inflation must trigger the -15% bad-year boundary');
}

// ENG-03: An explicit aggregate equity budget of zero is a hard zero, not
// the legacy "unlimited" sentinel.
{
    const result = calculateSaleAndTax(
        10000,
        saleInput([equityLot()]),
        { minGold: 0, maxEquityBudgetTotal: 0 },
        { sKey: 'peak_stable' },
        false
    );
    assertClose(result.bruttoVerkaufGesamt, 0, 1e-12, 'Explicit zero equity budget must prohibit equity sales');
    assertClose(result.achievedRefill, 0, 1e-12, 'Zero equity budget must produce zero refill');
}

// ENG-02: Gold floor headroom belongs to the aggregate asset class and may
// not be consumed independently by every detailed lot.
{
    const result = calculateSaleAndTax(
        80000,
        saleInput(
            [goldLot('gold-1'), goldLot('gold-2')],
            { goldAktiv: true, goldWert: 120000 }
        ),
        { minGold: 90000 },
        { sKey: 'peak_stable' },
        false
    );
    assert(
        result.bruttoVerkaufGesamt <= 30000.01,
        'Multiple gold lots must share the single 30,000 EUR floor headroom'
    );
    result.breakdown.forEach(source => {
        const lot = source.trancheId === 'gold-1' ? goldLot('gold-1') : goldLot('gold-2');
        assert(source.brutto <= lot.marketValue + 0.01, `Gold lot ${source.trancheId} must not exceed its inventory`);
    });
}

// BAL-03: A post-action bond refill may only use inventory that was not
// already reserved by the pending action.
{
    const tranches = [equityLot()];
    const pendingAction = {
        type: 'TRANSACTION',
        anweisungKlasse: 'anweisung-gelb',
        title: 'Bestehender Verkauf',
        nettoErlös: 80000,
        steuer: 0,
        quellen: [{
            kind: 'aktien_neu',
            category: 'equity',
            trancheId: 'eq-1',
            brutto: 80000,
            steuer: 0,
            netto: 80000,
            tqf: 0,
            gainQuotePlan: 0,
            gainQuoteSigned: 0,
            realizedGainSigned: 0,
            taxableAfterTqfSigned: 0
        }],
        verwendungen: { liquiditaet: 80000, gold: 0, aktien: 0 },
        taxRawAggregate: {
            sumRealizedGainSigned: 0,
            sumTaxableAfterTqfSigned: 0
        }
    };
    const engineInput = {
        ...saleInput(tranches),
        floorBedarf: 20000,
        flexBedarf: 0,
        renteAktiv: false,
        renteMonatlich: 0,
        decumulation: {
            mode: '3_bucket_jilge',
            bondTargetFactor: 5,
            drawdownTrigger: -0.15,
            bondRefillThreshold: 0
        }
    };
    const badYearCheck = applyThreeBucketLogic(
        tranches,
        engineInput,
        { sKey: 'peak_stable' },
        pendingAction,
        0.10,
        0
    );
    const refill = appendBondReplenishment(
        tranches,
        engineInput,
        badYearCheck.updatedAction,
        0.10,
        20000,
        0,
        { sKey: 'peak_stable' }
    );
    const totalGrossForLot = refill.updatedAction.quellen
        .filter(source => source.trancheId === 'eq-1')
        .reduce((total, source) => total + (Number(source.brutto) || 0), 0);
    assert(
        totalGrossForLot <= 100000.01,
        'An 80,000 EUR reservation on a 100,000 EUR lot must leave at most 20,000 EUR for refill'
    );
}

// REV-02-F01: reservations must be scoped by source profile as well as lot ID.
// A sale from profile A must not consume the identically named lot in profile B.
{
    const tranches = [
        equityLot({
            trancheId: 'shared-lot',
            sourceProfileId: 'profile-a',
            marketValue: 50000,
            costBasis: 50000
        }),
        equityLot({
            trancheId: 'shared-lot',
            sourceProfileId: 'profile-b',
            marketValue: 50000,
            costBasis: 50000
        })
    ];
    const pendingAction = {
        type: 'TRANSACTION',
        anweisungKlasse: 'anweisung-gelb',
        title: 'Profil A Verkauf',
        nettoErlös: 40000,
        steuer: 0,
        quellen: [{
            kind: 'aktien_neu',
            category: 'equity',
            trancheId: 'shared-lot',
            sourceProfileId: 'profile-a',
            brutto: 40000,
            steuer: 0,
            netto: 40000,
            tqf: 0,
            gainQuotePlan: 0,
            gainQuoteSigned: 0,
            realizedGainSigned: 0,
            taxableAfterTqfSigned: 0
        }],
        verwendungen: { liquiditaet: 40000, gold: 0, aktien: 0 },
        taxRawAggregate: {
            sumRealizedGainSigned: 0,
            sumTaxableAfterTqfSigned: 0
        }
    };
    const remaining = reservePlannedLotInventory(tranches, pendingAction);
    const remainingByProfile = new Map(
        remaining.map(tranche => [tranche.sourceProfileId, tranche.marketValue])
    );

    assertClose(remainingByProfile.get('profile-a'), 10000, 0.01,
        'Profile A reservation must leave only its own 10,000 EUR remainder');
    assertClose(remainingByProfile.get('profile-b'), 50000, 0.01,
        'Profile B identically named lot must remain fully available');

    let overbookingError = null;
    try {
        reservePlannedLotInventory(tranches, {
            ...pendingAction,
            quellen: [{ ...pendingAction.quellen[0], brutto: 60000 }]
        });
    } catch (error) {
        overbookingError = error;
    }
    assertEqual(overbookingError?.name, 'FinancialCalculationError',
        '3-bucket overbooking must preserve an actionable engine error type');
    assert(String(overbookingError?.message || '').includes('Bitte pruefen Sie die Depot-Tranchen'),
        '3-bucket overbooking must tell the user how to resolve the input conflict');
}

// W02-2/W02-3: final tax allocation is capacity constrained and rejects tax
// without any gross sale instead of producing a negative source net amount.
{
    const sources = _allocateFinalTaxToActionSources([{
        kind: 'aktien_neu',
        trancheId: 'small-taxable-lot',
        brutto: 1,
        steuer: 0,
        netto: 1,
        taxableAfterTqfSigned: 1000
    }, {
        kind: 'aktien_neu',
        trancheId: 'fallback-lot',
        brutto: 100,
        steuer: 0,
        netto: 100,
        taxableAfterTqfSigned: 0
    }], 50);
    const allocatedTax = sources.reduce((total, source) => total + (Number(source.steuer) || 0), 0);

    assertClose(allocatedTax, 50, 0.01, 'Final source tax allocation must preserve total settlement tax');
    assert(sources.every(source => source.netto >= -0.000001),
        'Final source tax allocation must never create a negative source net amount');
    assert(sources.every(source => source.steuer <= source.brutto + 0.000001),
        'Final source tax allocation must respect every source gross capacity');

    let degenerateError = null;
    try {
        _allocateFinalTaxToActionSources([{
            kind: 'aktien_neu',
            trancheId: 'zero-gross-lot',
            brutto: 0,
            steuer: 0,
            netto: 0,
            taxableAfterTqfSigned: 0
        }], 1);
    } catch (error) {
        degenerateError = error;
    }
    assert(degenerateError instanceof Error,
        'Positive final tax without gross source capacity must fail closed');
    assertEqual(degenerateError?.name, 'FinancialCalculationError',
        'Degenerate source tax allocation must preserve an actionable engine error type');
    assert(String(degenerateError?.message || '').includes('Bitte pruefen Sie'),
        'Degenerate source tax allocation must provide a user action');
}

// ENG-09: maxSkimPctOfEq=0 disables the overflow path instead of falling
// back to five percent.
{
    const result = trySurplusRebalance({
        aktuelleLiquiditaet: 100000,
        zielLiquiditaet: 10000,
        depotwertGesamt: 900000,
        market: { sKey: 'peak_stable', abstandVomAthProzent: 0 },
        input: {
            targetEq: 60,
            rebalBand: 0,
            rebalancingBand: 0,
            goldAktiv: false,
            goldZielProzent: 0,
            depotwertAlt: 900000,
            depotwertNeu: 0,
            maxSkimPctOfEq: 0
        },
        investiertesKapital: 1000000,
        quantizeAmount: value => value,
        transactionDiagnostics: {}
    });
    assertEqual(result, null, 'maxSkimPctOfEq=0 must disable surplus overflow investment');
}

// BAL-02/BAL-04/BAL-05: A real single-profile Balance engine result finalizes
// 3-bucket sources before its one authoritative annual settlement.
{
    const result = EngineAPI.simulateSingleYear({
        depotwertAlt: 0,
        depotwertNeu: 150000,
        costBasisAlt: 0,
        costBasisNeu: 115000,
        tqfAlt: 0,
        tqfNeu: 0,
        goldWert: 0,
        tagesgeld: 0,
        geldmarktEtf: 0,
        inflation: 2,
        renteAktiv: false,
        renteMonatlich: 0,
        floorBedarf: 12000,
        flexBedarf: 0,
        startAlter: 65,
        aktuellesAlter: 65,
        goldAktiv: false,
        goldFloorProzent: 0,
        goldZielProzent: 0,
        runwayTargetMonths: 36,
        runwayMinMonths: 24,
        risikoprofil: 'sicherheits-dynamisch',
        sparerPauschbetrag: 0,
        kirchensteuerSatz: 0,
        marketCapeRatio: 20,
        endeVJ: 70,
        endeVJ_1: 100,
        endeVJ_2: 100,
        endeVJ_3: 100,
        ath: 100,
        jahreSeitAth: 1,
        finalizeThreeBucketAction: true,
        decumulation: {
            mode: '3_bucket_jilge',
            drawdownTrigger: -0.15,
            bondTargetFactor: 5,
            bondRefillThreshold: 0
        },
        detailledTranches: [{
            trancheId: 'bond-1',
            type: 'anleihe',
            category: 'bonds',
            marketValue: 50000,
            costBasis: 25000,
            tqf: 0
        }, {
            trancheId: 'equity-1',
            type: 'aktien_neu',
            category: 'equity',
            marketValue: 100000,
            costBasis: 90000,
            tqf: 0.3
        }]
    }, { taxState: { lossCarry: 777 } });
    const sources = result.ui.action.quellen || [];
    const sourceNet = sources.reduce((total, source) => total + (Number(source.netto) || 0), 0);
    const useTotal = Object.values(result.ui.action.verwendungen || {})
        .reduce((total, value) => total + (Number(value) || 0), 0);

    assertEqual(result.ui.threeBucket.isBadYear, true, 'Production 3-bucket result must use the real bad-year signal');
    assert(sources.length > 0 && sources.every(source => source.category === 'bonds'),
        'Bad-year final action must contain only bond sale sources');
    assertEqual(result.ui.action.taxSettlementDeferred, false, 'Single-profile final action must be settled in the engine');
    assertClose(result.ui.action.taxSettlement.taxAfterLossCarry, result.ui.action.steuer, 0.01,
        'Single-profile action and tax-settlement diagnostics must expose the same final tax');
    assertClose(result.newState.taxState.lossCarry, 0, 1e-12,
        'Single-profile candidate state must contain the final consumed loss carry');
    assertClose(sourceNet, result.ui.action.nettoErlös, 0.01,
        'Single-profile final source net must equal action net');
    assertClose(sourceNet, useTotal, 0.01,
        'Single-profile final source net must equal all uses');
    assert(sources.every(source => source.brutto <= 50000.01),
        'Single-profile final source must not exceed its bond lot inventory');
}

// O-04: The household action starts with a 10,000 EUR bond blueprint. The
// profile-aware finalization must gross it up to 11,519.08 EUR, settle the
// owner's 777 EUR loss carry exactly once and finance the unchanged use.
{
    const expectedGross = 11519.08;
    const expectedTax = ((expectedGross * 0.5) - 777) * 0.25 * 1.055;
    const targetNet = expectedGross - expectedTax;
    const attributed = attributeHouseholdAction({
        householdAction: {
            type: 'TRANSACTION',
            title: 'Bond-Finalisierung',
            anweisungKlasse: 'anweisung-gelb',
            nettoErlös: 10000,
            steuer: 0,
            quellen: [{
                kind: 'anleihe',
                category: 'bonds',
                trancheId: 'bond-owner:bond-1',
                sourceProfileId: 'bond-owner',
                brutto: 10000,
                steuer: 0,
                netto: 10000,
                tqf: 0,
                gainQuotePlan: 0.5,
                gainQuoteSigned: 0.5,
                realizedGainSigned: 5000,
                taxableAfterTqfSigned: 5000
            }],
            verwendungen: {
                liquiditaet: targetNet,
                gold: 0,
                aktien: 0,
                bonds: 0
            },
            taxRawAggregate: {
                sumRealizedGainSigned: 5000,
                sumTaxableAfterTqfSigned: 5000
            },
            taxSettlementDeferred: true
        },
        profiles: [{
            profileId: 'bond-owner',
            name: 'Bond Owner',
            inputs: {
                sparerPauschbetrag: 0,
                kirchensteuerSatz: 0,
                depotwertNeu: 50000
            },
            tranches: [{
                trancheId: 'bond-1',
                type: 'anleihe',
                category: 'bonds',
                marketValue: 50000,
                costBasis: 25000,
                tqf: 0
            }],
            balanceState: { lastState: { taxState: { lossCarry: 777 } } }
        }, {
            profileId: 'observer',
            name: 'Observer',
            inputs: { sparerPauschbetrag: 0, kirchensteuerSatz: 0 },
            tranches: [],
            balanceState: { lastState: { taxState: { lossCarry: 123 } } }
        }],
        mode: 'tax_optimized'
    });
    const ownerSettlement = attributed.settlements.find(entry => entry.profileId === 'bond-owner');
    const observerSettlement = attributed.settlements.find(entry => entry.profileId === 'observer');
    const sourceGross = attributed.finalAction.quellen
        .filter(source => source.kind !== 'liquiditaet')
        .reduce((total, source) => total + source.brutto, 0);
    const sourceNet = attributed.finalAction.quellen
        .reduce((total, source) => total + source.netto, 0);

    assertClose(attributed.finalAction.steuer, 1314.14, 0.01, 'O-04 final tax must match the independent 1,314.14 EUR hand calculation');
    assertClose(ownerSettlement.taxStateNext.lossCarry, 0, 1e-12, 'O-04 selling owner must consume the 777 EUR loss carry');
    assertClose(observerSettlement.taxStateNext.lossCarry, 123, 1e-12, 'O-04 no-sale profile must preserve its loss carry');
    assertClose(attributed.finalAction.bruttoVerkaufGesamt, expectedGross, 0.01, 'O-04 final gross must be 11,519.08 EUR');
    assertClose(sourceGross, attributed.finalAction.bruttoVerkaufGesamt, 0.01, 'O-04 source gross must reconcile to final gross');
    assertClose(sourceNet, targetNet, 0.01, 'O-04 source net must finance the unchanged household use');
    assertClose(sourceNet, attributed.finalAction.nettoErlös, 0.01, 'O-04 source net and final action net must match');
    assertEqual(attributed.finalAction.taxSettlementDeferred, false, 'O-04 profile settlement must close the deferred household contract');
}

console.log('--- Suite Data Slice 02 Final Action Tests Completed ---');
