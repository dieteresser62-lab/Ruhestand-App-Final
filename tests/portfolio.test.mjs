
import { buyGold, buyStocksNeu, sumDepot, initializePortfolio } from '../simulator-portfolio.js';

console.log('--- Portfolio Logic Tests ---');

// Mock DOM for initializePortfolio because it reads documents.getElementById
// We'll skip initializePortfolio test for now or Mock it heavily if needed.
// Actually, initializePortfolio reads EVERYTHING from DOM. That's hard to test in Node without JSDOM.
// Strategies:
// 1. Refactor initializePortfolio to accept a config object (Best practice, but out of scope?)
// 2. Mock document.getElementById (Messy global pollution)
// 3. Test only pure functions like buyGold, sumDepot

// Test 1: sumDepot
{
    const portfolio = {
        depotTranchesAktien: [{ marketValue: 100 }, { marketValue: 200 }],
        depotTranchesGold: [{ marketValue: 50 }]
    };
    const sum = sumDepot(portfolio);
    assertEqual(sum, 350, 'sumDepot should sum all tranches');
    console.log('✅ sumDepot works');
}

// Test 2: buyGold
{
    const portfolio = {
        depotTranchesGold: []
    };
    buyGold(portfolio, 100);
    assertEqual(portfolio.depotTranchesGold.length, 1, 'Should add gold tranche');
    assertEqual(portfolio.depotTranchesGold[0].marketValue, 100, 'Should have correct value');

    buyGold(portfolio, 50);
    assertEqual(portfolio.depotTranchesGold.length, 1, 'Should merge into existing tranche');
    assertEqual(portfolio.depotTranchesGold[0].marketValue, 150, 'Should sum up value');
    console.log('✅ buyGold works');
}

// Test 3: buyStocksNeu
{
    const portfolio = {
        depotTranchesAktien: []
    };
    buyStocksNeu(portfolio, 100);
    assertEqual(portfolio.depotTranchesAktien.length, 1, 'Should add stock tranche');
    assertEqual(portfolio.depotTranchesAktien[0].type, 'aktien_neu', 'Should be type aktien_neu');

    const oldTranche = { type: 'aktien_alt', marketValue: 500 };
    portfolio.depotTranchesAktien.push(oldTranche);

    buyStocksNeu(portfolio, 50);
    const neu = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu');
    assertEqual(neu.marketValue, 150, 'Should add to neu tranche');
    assertEqual(portfolio.depotTranchesAktien.length, 2, 'Should keep old tranche');
    console.log('✅ buyStocksNeu works');
}

console.log('--- Portfolio Logic Tests Completed ---');
