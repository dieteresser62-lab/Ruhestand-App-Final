import { sortTranchesFIFO, calculateTrancheTax, applySaleToPortfolio } from '../simulator-portfolio-tranches.js';

console.log('--- Depot Tranchen Tests ---');

// --- TEST 1: FIFO ordering ---
{
    const tranches = [
        { trancheId: 't2', purchaseDate: '2015-01-01' },
        { trancheId: 't1', purchaseDate: '2010-01-01' },
        { trancheId: 't3', purchaseDate: '2020-01-01' }
    ];
    const ordered = sortTranchesFIFO(tranches);
    assert(ordered[0].trancheId === 't1', 'Oldest tranche should be first');
    assert(ordered[2].trancheId === 't3', 'Newest tranche should be last');
}

// --- TEST 2: Tax calculation with partial sale and TFS ---
{
    const tranche = { marketValue: 100, costBasis: 60, tqf: 0.30 };
    // Teilverkauf mit TFS und Kirchensteuer.
    const result = calculateTrancheTax(tranche, 50, 10, 0.09);
    assertClose(result.steuer, 1.145, 0.01, 'Tax should match expected calculation');
    assertClose(result.netto, 48.855, 0.01, 'Net amount should reflect tax');
    assertClose(result.pauschbetragUsed, 10, 0.001, 'Pauschbetrag should be applied');
}

// --- TEST 3: FIFO reductions across matching tranches ---
{
    const portfolio = {
        depotTranchesAktien: [
            { trancheId: 't1', type: 'aktien_alt', name: 'ETF', isin: 'X', purchaseDate: '2010-01-01', marketValue: 100, costBasis: 60 },
            { trancheId: 't2', type: 'aktien_alt', name: 'ETF', isin: 'X', purchaseDate: '2015-01-01', marketValue: 100, costBasis: 80 },
            { trancheId: 't3', type: 'aktien_alt', name: 'ETF', isin: 'X', purchaseDate: '2020-01-01', marketValue: 100, costBasis: 90 }
        ],
        depotTranchesGold: [],
        depotTranchesGeldmarkt: []
    };

    const saleResult = {
        breakdown: [
            { kind: 'aktien_alt', name: 'ETF', isin: 'X', brutto: 150, steuer: 0 }
        ]
    };

    applySaleToPortfolio(portfolio, saleResult);

    const [t1, t2, t3] = portfolio.depotTranchesAktien;
    assertClose(t1.marketValue, 0, 0.001, 'Oldest tranche should be fully sold');
    assertClose(t1.costBasis, 0, 0.001, 'Oldest tranche cost basis should be reduced to zero');
    assertClose(t2.marketValue, 50, 0.001, 'Second tranche should be partially sold');
    assertClose(t2.costBasis, 40, 0.001, 'Second tranche cost basis should be reduced proportionally');
    assertClose(t3.marketValue, 100, 0.001, 'Newest tranche should remain untouched');
}

// --- TEST 4: FIFO applies oldest tranche first (applySaleToPortfolio) ---
{
    const portfolio = {
        depotTranchesAktien: [
            { trancheId: 'old', type: 'aktien_alt', name: 'ETF', isin: 'X', purchaseDate: '2005-01-01', marketValue: 100, costBasis: 60 },
            { trancheId: 'new', type: 'aktien_alt', name: 'ETF', isin: 'X', purchaseDate: '2015-01-01', marketValue: 100, costBasis: 80 }
        ],
        depotTranchesGold: [],
        depotTranchesGeldmarkt: []
    };
    const saleResult = { breakdown: [{ kind: 'aktien_alt', name: 'ETF', isin: 'X', brutto: 80, steuer: 0 }] };
    applySaleToPortfolio(portfolio, saleResult);
    const [oldTranche, newTranche] = portfolio.depotTranchesAktien;
    assertClose(oldTranche.marketValue, 20, 0.001, 'Oldest tranche should be reduced first');
    assertClose(newTranche.marketValue, 100, 0.001, 'Newer tranche should remain untouched');
}

// --- TEST 5: Partial sale keeps remainder + cost basis proportional ---
{
    const portfolio = {
        depotTranchesAktien: [
            { trancheId: 't1', type: 'aktien_alt', name: 'ETF', isin: 'X', purchaseDate: '2010-01-01', marketValue: 100, costBasis: 40 }
        ],
        depotTranchesGold: [],
        depotTranchesGeldmarkt: []
    };
    const saleResult = { breakdown: [{ kind: 'aktien_alt', trancheId: 't1', brutto: 50, steuer: 0 }] };
    applySaleToPortfolio(portfolio, saleResult);
    const t1 = portfolio.depotTranchesAktien[0];
    assertClose(t1.marketValue, 50, 0.001, 'Partial sale should keep remaining position');
    assertClose(t1.costBasis, 20, 0.001, 'Cost basis should be reduced proportionally');
}

// --- TEST 6: TFS calculation (ETF 30% vs Gold 0%) ---
{
    const etf = { marketValue: 100, costBasis: 60, tqf: 0.30 };
    const gold = { marketValue: 100, costBasis: 60, tqf: 0.0 };
    const etfTax = calculateTrancheTax(etf, 100, 0, 0);
    const goldTax = calculateTrancheTax(gold, 100, 0, 0);
    assert(etfTax.steuer < goldTax.steuer, 'ETF with 30% TFS should have lower tax than Gold');
}

// --- TEST 7: Multiple categories (Aktien, Gold, Geldmarkt) ---
{
    const portfolio = {
        depotTranchesAktien: [
            { trancheId: 'a1', type: 'aktien_alt', name: 'ETF', isin: 'A', purchaseDate: '2010-01-01', marketValue: 100, costBasis: 60 }
        ],
        depotTranchesGold: [
            { trancheId: 'g1', type: 'gold', name: 'Gold', isin: 'G', purchaseDate: '2012-01-01', marketValue: 50, costBasis: 40 }
        ],
        depotTranchesGeldmarkt: [
            { trancheId: 'm1', type: 'geldmarkt', name: 'MMF', isin: 'M', purchaseDate: '2018-01-01', marketValue: 80, costBasis: 80 }
        ]
    };
    const saleResult = {
        breakdown: [
            { kind: 'aktien_alt', trancheId: 'a1', brutto: 40, steuer: 0 },
            { kind: 'gold', trancheId: 'g1', brutto: 10, steuer: 0 },
            { kind: 'geldmarkt', trancheId: 'm1', brutto: 20, steuer: 0 }
        ]
    };
    applySaleToPortfolio(portfolio, saleResult);
    assertClose(portfolio.depotTranchesAktien[0].marketValue, 60, 0.001, 'Aktien tranche reduced');
    assertClose(portfolio.depotTranchesGold[0].marketValue, 40, 0.001, 'Gold tranche reduced');
    assertClose(portfolio.depotTranchesGeldmarkt[0].marketValue, 60, 0.001, 'Geldmarkt tranche reduced');
}

console.log('--- Depot Tranchen Tests Completed ---');
