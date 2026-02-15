import { simulateOneYear } from '../app/simulator/simulator-engine-direct.js';
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

// 1) Forced sale path: settlement must be recomputed with combined raw aggregate.
{
    const inputs = buildInputs();
    const state = buildState();
    const engine = makeStubEngine({ monthlyWithdrawal: 10000, actionTax: 100 });
    const result = simulateOneYear(state, inputs, crashYear, 0, null, 0, null, 1, engine);

    assert(!result.isRuin, 'Forced-sale scenario should still return a valid result');
    assert(result.ui?.action?.taxSettlement?.recomputedWithForcedSales === true, 'Forced-sale scenario must mark recompute=true');
    assert(result.ui?.action?.steuer < 100, 'Forced-sale recompute should reduce tax in this loss scenario');

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
}

console.log('✅ Simulator tax settlement tests passed');
