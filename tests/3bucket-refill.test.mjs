import { simulateOneYear } from '../app/simulator/simulator-engine-direct.js';

console.log('--- 3-Bucket Refill Tests ---');

function createMockEngine({ spending, action, marketSKey = 'hot_neutral' }) {
    return {
        simulateSingleYear() {
            return {
                ui: {
                    spending: {
                        monatlicheEntnahme: spending?.monatlicheEntnahme ?? 0,
                        kuerzungProzent: 0,
                        kuerzungQuelle: 'none',
                        details: {}
                    },
                    action: {
                        type: action?.type || 'HOLD',
                        quellen: action?.quellen || [],
                        nettoErlös: action?.nettoErlös || 0,
                        steuer: action?.steuer || 0,
                        verwendungen: action?.verwendungen || { gold: 0, aktien: 0 },
                        taxRawAggregate: action?.taxRawAggregate || { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
                    },
                    market: { sKey: marketSKey, szenarioText: marketSKey },
                    zielLiquiditaet: 0,
                    liquiditaet: { deckungNachher: 100 },
                    runway: { months: 36 },
                    vpw: null
                },
                newState: {
                    alarmActive: false,
                    lastMarketSKey: marketSKey,
                    cumulativeInflationFactor: 1,
                    taxState: { lossCarry: 0 }
                }
            };
        }
    };
}

function baseInputs(overrides = {}) {
    return {
        startAlter: 65,
        renteStartOffsetJahre: 0,
        partner: { aktiv: false },
        rentAdjPct: 0,
        startFloorBedarf: 24000,
        startFlexBedarf: 0,
        flexBudgetAnnual: 0,
        flexBudgetYears: 0,
        flexBudgetRecharge: 0,
        targetEq: 60,
        runwayTargetMonths: 36,
        runwayMinMonths: 24,
        rebalBand: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        rebalancingBand: 25,
        goldAktiv: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        risikoprofil: 'sicherheits-dynamisch',
        startSPB: 1000,
        kirchensteuerSatz: 0,
        marketCapeRatio: 25,
        decumulation: {
            mode: '3_bucket_jilge',
            bondTargetFactor: 5,
            drawdownTrigger: 15,
            bondRefillThreshold: null
        },
        ...overrides
    };
}

function baseState(portfolio) {
    return {
        portfolio,
        baseFloor: 24000,
        baseFlex: 0,
        baseFlexBudgetAnnual: 0,
        baseFlexBudgetRecharge: 0,
        lastState: null,
        currentAnnualPension: 0,
        currentAnnualPension2: 0,
        marketDataHist: {
            endeVJ: 100,
            endeVJ_1: 100,
            endeVJ_2: 100,
            endeVJ_3: 100,
            ath: 100,
            jahreSeitAth: 0,
            capeRatio: 25,
            inflation: 2
        },
        widowPensionP1: 0,
        widowPensionP2: 0
    };
}

{
    const state = baseState({
        depotTranchesAktien: [
            { type: 'aktien_neu', category: 'equity', marketValue: 100000, costBasis: 100000, tqf: 0.3 },
            { type: 'anleihe', category: 'bonds', marketValue: 20000, costBasis: 20000, tqf: 0.0 }
        ],
        depotTranchesGold: [],
        depotTranchesGeldmarkt: [],
        liquiditaet: 50000,
        tagesgeld: 50000,
        geldmarktEtf: 0
    });
    const inputs = baseInputs();
    const engine = createMockEngine({
        spending: { monatlicheEntnahme: 0 },
        action: {
            type: 'TRANSACTION',
            quellen: [{ kind: 'aktien_neu', brutto: 10000, steuer: 100, netto: 9900 }],
            nettoErlös: 9900,
            steuer: 100
        }
    });
    const yearData = { rendite: -0.3, gold_eur_perf: 0, zinssatz: 0, inflation: 2, jahr: 2008 };
    const result = simulateOneYear(state, inputs, yearData, 0, null, 0, null, 1, engine);

    const afterEquity = result.newState.portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu');
    const afterBond = result.newState.portfolio.depotTranchesAktien.find(t => t.type === 'anleihe');
    assertClose(afterEquity.marketValue, 70000, 1e-6, 'bad year must not sell equity tranches in 3-bucket mode');
    assert(afterBond.marketValue < 20400, 'bad year should route sales into bond bucket');
    assert(result.logData.threeBucket.isBadYear === true, 'bad year marker should be logged');
    assert(result.logData.threeBucket.bondSaleAmount > 0, 'bond sale amount should be logged in bad year');
    assert(result.logData.threeBucket.equityPreserved >= 10000, 'blocked equity sale should be tracked as preserved');
}

{
    const state = baseState({
        depotTranchesAktien: [
            { type: 'aktien_neu', category: 'equity', marketValue: 150000, costBasis: 150000, tqf: 0.3 }
        ],
        depotTranchesGold: [],
        depotTranchesGeldmarkt: [],
        liquiditaet: 40000,
        tagesgeld: 40000,
        geldmarktEtf: 0
    });
    const inputs = baseInputs();
    const engine = createMockEngine({
        spending: { monatlicheEntnahme: 1000 },
        action: { type: 'HOLD', quellen: [], nettoErlös: 0, steuer: 0 }
    });
    const yearData = { rendite: 0.1, gold_eur_perf: 0, zinssatz: 0, inflation: 2, jahr: 2010 };
    const result = simulateOneYear(state, inputs, yearData, 0, null, 0, null, 1, engine);
    const autoBond = result.newState.portfolio.depotTranchesAktien.find(t => t.isin === 'BOND_BUCKET_AUTO');
    assert(autoBond, 'good year refill should auto-create bond tranche if missing');
    assert(autoBond.marketValue > 0, 'auto-created bond tranche should be refilled');
    assertClose(autoBond.costBasis, autoBond.marketValue, 1e-6, 'bond refill must increase marketValue and costBasis equally');
    assert(result.logData.threeBucket.bondRefillNet > 0, 'bond refill net amount should be logged');
}

{
    const state = baseState({
        depotTranchesAktien: [
            { type: 'aktien_neu', category: 'equity', marketValue: 100000, costBasis: 100000, tqf: 0.3 },
            { type: 'anleihe', category: 'bonds', marketValue: 10000, costBasis: 10000, tqf: 0.0 }
        ],
        depotTranchesGold: [],
        depotTranchesGeldmarkt: [],
        liquiditaet: 30000,
        tagesgeld: 30000,
        geldmarktEtf: 0
    });
    const inputs = baseInputs({
        decumulation: {
            mode: '3_bucket_jilge',
            bondTargetFactor: 0,
            drawdownTrigger: 80,
            bondRefillThreshold: null
        }
    });
    const engine = createMockEngine({
        spending: { monatlicheEntnahme: 0 },
        action: { type: 'HOLD', quellen: [], nettoErlös: 0, steuer: 0 }
    });
    const yearData = { rendite: -0.3, gold_eur_perf: 0, zinssatz: 0, inflation: 2, jahr: 2015 };
    const result = simulateOneYear(state, inputs, yearData, 0, null, 0, null, 1, engine);
    const bond = result.newState.portfolio.depotTranchesAktien.find(t => t.type === 'anleihe');
    const equity = result.newState.portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu');
    assertClose(bond.marketValue, 10200, 1e-6, 'bond tranche must use fixed nominal return of +2%');
    assertClose(equity.marketValue, 70000, 1e-6, 'equity tranche must still use market return');
}

console.log('✅ 3-Bucket refill tests passed');

