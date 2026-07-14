import { EngineAPI } from '../engine/index.mjs';
import { buildDetailedTranchesFromPortfolio } from '../app/simulator/simulator-engine-direct-utils.js';
import { simulateOneYear } from '../app/simulator/simulator-engine-direct.js';
import { initMcRunState, prepareHistoricalDataOnce } from '../app/simulator/simulator-engine-helpers.js';
import { annualData } from '../app/simulator/simulator-data.js';
import { runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';
import { initializePortfolioDetailed } from '../app/simulator/simulator-portfolio-init.js';
import {
    applySaleToPortfolio,
    buyGold,
    buyStocksNeu
} from '../app/simulator/simulator-portfolio-tranches.js';

console.log('--- Simulator Portfolio Tranche Invariants ---');

function detailedLot(overrides = {}) {
    return {
        trancheId: 'profile-a:shared',
        sourceProfileId: 'profile-a',
        name: 'ETF',
        isin: 'SAME',
        shares: 10,
        purchasePrice: 100,
        currentPrice: 120,
        purchaseDate: '2020-01-01',
        marketValue: 1200,
        costBasis: 1000,
        tqf: 0.30,
        type: 'aktien_neu',
        category: 'equity',
        metadata: { nested: { owner: 'profile-a' } },
        ...overrides
    };
}

{
    const originalInputs = {
        tagesgeld: 100,
        geldmarktEtf: 9999,
        simulationSourceProfileId: 'profile-a',
        detailledTranches: [detailedLot()]
    };
    const before = structuredClone(originalInputs);
    const portfolio = initializePortfolioDetailed(originalInputs);

    applySaleToPortfolio(portfolio, {
        breakdown: [{
            kind: 'aktien_neu',
            trancheId: 'profile-a:shared',
            sourceProfileId: 'profile-a',
            brutto: 600
        }]
    });

    const remaining = portfolio.depotTranchesAktien[0];
    assertClose(remaining.marketValue, 600, 1e-9, 'Partial sale should reduce market value proportionally');
    assertClose(remaining.costBasis, 500, 1e-9, 'Partial sale should reduce cost basis proportionally');
    assertClose(remaining.shares, 5, 1e-9, 'Partial sale should reduce shares proportionally');
    assertEqual(JSON.stringify(originalInputs), JSON.stringify(before),
        'Portfolio mutation must leave nested input data structurally unchanged');
}

{
    const first = detailedLot({ trancheId: 'profile-a:first', marketValue: 100, costBasis: 80, shares: 1 });
    const second = detailedLot({
        trancheId: 'profile-a:second', marketValue: 100, costBasis: 90,
        shares: 1, purchaseDate: '2021-01-01'
    });
    const portfolio = initializePortfolioDetailed({ tagesgeld: 0, detailledTranches: [first, second] });

    applySaleToPortfolio(portfolio, {
        breakdown: [
            { kind: 'aktien_neu', trancheId: 'profile-a:first', sourceProfileId: 'profile-a', brutto: 100 },
            { kind: 'aktien_neu', trancheId: 'profile-a:first', sourceProfileId: 'profile-a', brutto: 100 }
        ]
    });

    assertEqual(portfolio.depotTranchesAktien[0].simulationLotStatus, 'sold',
        'Full sale should mark the lot sold');
    assertEqual(portfolio.depotTranchesAktien[0].marketValue, 0, 'Sold lot should have zero market value');
    assertEqual(portfolio.depotTranchesAktien[1].marketValue, 100,
        'Duplicate breakdown entry must not spill into another lot');
    const engineLots = buildDetailedTranchesFromPortfolio(portfolio);
    assertEqual(engineLots.length, 1, 'Sold lots should not return to the next engine input');
}

{
    const portfolio = initializePortfolioDetailed({
        tagesgeld: 0,
        detailledTranches: [
            detailedLot({ trancheId: 'profile-a:shared', sourceProfileId: 'profile-a' }),
            detailedLot({ trancheId: 'profile-b:shared', sourceProfileId: 'profile-b' })
        ]
    });
    applySaleToPortfolio(portfolio, {
        breakdown: [{
            kind: 'aktien_neu', trancheId: 'missing:shared', sourceProfileId: 'profile-b', brutto: 100
        }]
    });
    assertEqual(portfolio.depotTranchesAktien[0].marketValue, 1200,
        'Unknown composite id must not suffix-match profile A');
    assertEqual(portfolio.depotTranchesAktien[1].marketValue, 1200,
        'Unknown composite id must not suffix-match profile B');

    applySaleToPortfolio(portfolio, {
        breakdown: [{
            kind: 'aktien_neu', trancheId: 'profile-b:shared', sourceProfileId: 'profile-b', brutto: 120
        }]
    });
    assertEqual(portfolio.depotTranchesAktien[0].marketValue, 1200,
        'Profile A should remain isolated');
    assertEqual(portfolio.depotTranchesAktien[1].marketValue, 1080,
        'Exact profile B composite key should select only profile B');
}

{
    const makePortfolio = () => ({
        depotTranchesAktien: [],
        depotTranchesGold: [],
        depotTranchesGeldmarkt: [],
        simulationSourceProfileId: 'profile-a',
        simulationGoldTqf: 1,
        simulationDate: '2030-12-31'
    });
    const firstRun = makePortfolio();
    const secondRun = makePortfolio();
    buyStocksNeu(firstRun, 100);
    buyGold(firstRun, 50);
    buyStocksNeu(firstRun, 25);
    buyStocksNeu(secondRun, 100);
    buyGold(secondRun, 50);
    buyStocksNeu(secondRun, 25);

    const firstIds = buildDetailedTranchesFromPortfolio(firstRun).map(lot => lot.trancheId);
    const secondIds = buildDetailedTranchesFromPortfolio(secondRun).map(lot => lot.trancheId);
    assertEqual(JSON.stringify(firstIds), JSON.stringify(secondIds),
        'Identical runs should produce identical simulation lot ids');
    assertEqual(new Set(firstIds).size, 3, 'Every simulated purchase should receive a unique lot id');
    assert(buildDetailedTranchesFromPortfolio(firstRun).every(lot => lot.sourceProfileId === 'profile-a'),
        'Engine lots should preserve simulated purchase provenance');
    assert(buildDetailedTranchesFromPortfolio(firstRun).every(lot => lot.purchaseDate === '2030-12-31'),
        'Engine lots should preserve the deterministic simulation date');
}

{
    const portfolio = {
        depotTranchesAktien: [{
            marketValue: 100, costBasis: 80, tqf: 0.30,
            type: 'aktien_neu', category: 'equity', sourceProfileId: 'profile-a'
        }],
        depotTranchesGold: [],
        depotTranchesGeldmarkt: [],
        simulationSourceProfileId: 'profile-a'
    };
    const [engineLot] = buildDetailedTranchesFromPortfolio(portfolio);
    assert(engineLot.trancheId.startsWith('simbase:'), 'Legacy aggregate lot should receive a stable simulation id');
    assertEqual(portfolio.depotTranchesAktien[0].trancheId, engineLot.trancheId,
        'Generated engine id should be written to the simulation copy for exact sale matching');
    applySaleToPortfolio(portfolio, {
        breakdown: [{
            kind: 'aktien_neu', trancheId: engineLot.trancheId,
            sourceProfileId: 'profile-a', brutto: 25
        }]
    });
    assertEqual(portfolio.depotTranchesAktien[0].marketValue, 75,
        'Generated stable id should resolve the exact simulation lot on sale');
}

{
    const moneyMarket = {
        trancheId: 'profile-a:money', sourceProfileId: 'profile-a', name: 'Money',
        shares: 10, purchasePrice: 10, currentPrice: 10, purchaseDate: '2020-01-01',
        marketValue: 100, costBasis: 100, tqf: 0, type: 'geldmarkt', category: 'money_market'
    };
    const detailed = initializePortfolioDetailed({
        tagesgeld: 20,
        geldmarktEtf: 100,
        detailledTranches: [moneyMarket]
    });
    assertEqual(detailed.geldmarktEtf, 100, 'Detailed money market and aggregate must not be added together');
    assertEqual(detailed.liquiditaet, 120, 'Liquidity should count detailed money market exactly once');

    const explicitEmpty = initializePortfolioDetailed({
        startVermoegen: 1000,
        depotwertAlt: 800,
        tagesgeld: 20,
        geldmarktEtf: 200,
        detailledTranches: []
    });
    assertEqual(explicitEmpty.depotTranchesAktien.length, 0, 'Explicit empty lots should not create aggregate equity');
    assertEqual(explicitEmpty.depotTranchesGeldmarkt.length, 0, 'Explicit empty lots should not create aggregate money market');
    assertEqual(explicitEmpty.liquiditaet, 20, 'Explicit empty lots should retain only separate cash');
}

{
    const portfolio = {
        depotTranchesAktien: [detailedLot({ shares: Number.NaN })],
        depotTranchesGold: [],
        depotTranchesGeldmarkt: []
    };
    let sharesError = null;
    try {
        applySaleToPortfolio(portfolio, {
            breakdown: [{
                kind: 'aktien_neu', trancheId: 'profile-a:shared', sourceProfileId: 'profile-a', brutto: 100
            }]
        });
    } catch (error) {
        sharesError = error;
    }
    assertEqual(sharesError?.code, 'SIMULATION_LOT_SHARES_INVALID',
        'Invalid present shares should stop lot mutation');
}

{
    prepareHistoricalDataOnce();
    const inputs = {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 900000,
        depotwertAlt: 900000,
        einstandAlt: 800000,
        tagesgeld: 0,
        geldmarktEtf: 0,
        zielLiquiditaet: 24000,
        startFloorBedarf: 24000,
        startFlexBedarf: 6000,
        minimumFlexAnnual: 0,
        targetEq: 60,
        rebalBand: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        goldAktiv: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        goldSteuerfrei: true,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        dynamicFlex: false,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0,
        simulationSourceProfileId: 'profile-a',
        detailledTranches: [detailedLot({
            trancheId: 'profile-a:direct-worker',
            shares: 900,
            purchasePrice: 888.8888888889,
            currentPrice: 1000,
            marketValue: 900000,
            costBasis: 800000
        })]
    };
    const before = structuredClone(inputs);
    const directState = initMcRunState(inputs, 4);
    simulateOneYear(directState, inputs, annualData[4], 0, null, 0, null, 1, EngineAPI);
    assertEqual(JSON.stringify(inputs), JSON.stringify(before),
        'Direct simulation should not mutate the original detailed input');

    await runMonteCarloChunk({
        inputs,
        monteCarloParams: {
            anzahl: 2,
            maxDauer: 2,
            blockSize: 2,
            seed: 707,
            methode: 'block',
            rngMode: 'per-run-seed'
        },
        widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
        useCapeSampling: false,
        runRange: { start: 0, count: 2 },
        engine: EngineAPI
    });
    assertEqual(JSON.stringify(inputs), JSON.stringify(before),
        'Worker-like repeated simulations should not mutate the original detailed input');
}

console.log('--- Simulator Portfolio Tranche Invariants Completed ---');
