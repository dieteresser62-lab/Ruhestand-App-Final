
import { applySaleToPortfolio } from './simulator-portfolio-tranches.js';

const portfolio = {
    depotTranchesAktien: [
        {
            trancheId: null,
            marketValue: 1000,
            costBasis: 500,
            type: 'aktien_alt',
            name: 'Altbestand'
        }
    ],
    depotTranchesGold: [],
    depotTranchesGeldmarkt: []
};

const saleResult = {
    breakdown: [
        {
            kind: 'aktien_alt',
            trancheId: null,
            name: 'Altbestand',
            brutto: 500
        }
    ]
};

console.log('Before:', portfolio.depotTranchesAktien[0].marketValue);
applySaleToPortfolio(portfolio, saleResult);
console.log('After (Match Type):', portfolio.depotTranchesAktien[0].marketValue);

// Test Mismatch Type
const portfolio2 = {
    depotTranchesAktien: [
        {
            trancheId: null,
            marketValue: 1000,
            costBasis: 500,
            type: 'aktien_alt',
            name: 'Altbestand'
        }
    ],
    depotTranchesGold: [],
    depotTranchesGeldmarkt: []
};

const saleResult2 = {
    breakdown: [
        {
            kind: 'aktien', // Mismatch!
            trancheId: null,
            name: 'Altbestand', // Name match
            brutto: 500
        }
    ]
};

console.log('Before 2:', portfolio2.depotTranchesAktien[0].marketValue);
applySaleToPortfolio(portfolio2, saleResult2);
console.log('After 2 (Mismatch Type, Match Name):', portfolio2.depotTranchesAktien[0].marketValue);


// Test Mismatch Type AND Name
const portfolio3 = {
    depotTranchesAktien: [
        {
            trancheId: null,
            marketValue: 1000,
            costBasis: 500,
            type: 'aktien_alt',
            name: 'Altbestand'
        }
    ],
    depotTranchesGold: [],
    depotTranchesGeldmarkt: []
};

const saleResult3 = {
    breakdown: [
        {
            kind: 'aktien', // Mismatch!
            trancheId: null,
            name: 'Generic', // Name Mismatch!
            brutto: 500
        }
    ]
};

console.log('Before 3:', portfolio3.depotTranchesAktien[0].marketValue);
applySaleToPortfolio(portfolio3, saleResult3);
console.log('After 3 (Mismatch Type, Mismatch Name - Fallback):', portfolio3.depotTranchesAktien[0].marketValue);
