
import { buyGold, buyStocksNeu, sumDepot, initializePortfolio, getCommonInputs } from '../simulator-portfolio.js';

console.log('--- Portfolio Logic Tests ---');

// --- Helper: Mock DOM ---
// allows us to verify getCommonInputs() logic
function setupMockDOM(valuesMap) {
    global.document = {
        getElementById: (id) => {
            const entry = valuesMap[id];
            // Simulate value or checked property
            return {
                value: (entry && entry.value !== undefined) ? entry.value : (entry || ''),
                checked: (entry && entry.checked !== undefined) ? entry.checked : false,
                style: { display: 'none' }, // Mock style object
                innerHTML: '', // Mock innerHTML
            };
        }
    };
}

// Helper: Clear Mock
function teardownMockDOM() {
    delete global.document;
}

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

// --- Test 4: DOM Mock & Initialization ---
{
    // Define inputs mimicking the UI form fields
    const mockValues = {
        'simStartVermoegen': 100000,
        'depotwertAlt': 50000,    // 50k Stocks
        'einstandAlt': 40000,
        'tagesgeld': 10000, // 10k Liquid
        'geldmarktEtf': 0,
        // Gold disabled
        'goldAllokationAktiv': { checked: false },
        'startFloorBedarf': 24000,
        'startFlexBedarf': 6000,
        'marketCapeRatio': 20,
        // Person 1
        'p1StartAlter': 65,
        'p1Geschlecht': 'w',
        'p1SparerPauschbetrag': 1000,
        'p1Monatsrente': 1500,
        // Person 2
        'partnerActive': { checked: false }, // Note: Simulator uses specific ID logic, check getCommonInputs
        // Wait, getCommonInputs doesn't read check for partnerActive? 
        // It reads inputs.partner fields?
        // Actually getCommonInputs reads 'widowPensionMode' etc.
    };

    setupMockDOM(mockValues);

    // Test parsing
    try {
        const parsedInputs = getCommonInputs();

        // Assertions on parsing
        assertEqual(parsedInputs.startVermoegen, 100000, 'Should parse startVermoegen');
        assertEqual(parsedInputs.zielLiquiditaet, 10000, 'Should derive zielLiquiditaet');
        assertEqual(parsedInputs.depotwertAlt, 50000, 'Should parse depotwertAlt');
        assertEqual(parsedInputs.goldAktiv, false, 'Should parse gold toggle');

        // Test Initialization
        const portfolio = initializePortfolio(parsedInputs);

        // Logic:
        // Total: 100k. Old Stocks: 50k. Remaining: 50k.
        // Liquid Goal: 10k. 
        // Investable New: 40k.
        // New Portfolio: Old Stock (50k) + New Stock (40k) + Liquid (10k) = 100k.

        const stockTranches = portfolio.depotTranchesAktien;
        const oldStock = stockTranches.find(t => t.type === 'aktien_alt');
        const newStock = stockTranches.find(t => t.type === 'aktien_neu');

        assert(oldStock !== undefined, 'Should have old stock tranche');
        assertEqual(oldStock.marketValue, 50000, 'Old stock value correct');

        assert(newStock !== undefined, 'Should have new stock tranche');
        assertEqual(newStock.marketValue, 40000, 'New stock value correct (100k - 50k old - 10k liq)');

        assertEqual(portfolio.liquiditaet, 10000, 'Liquidity correct');

        console.log('✅ DOM Parsing & Initialization works');

    } catch (e) {
        console.error('Test 4 Failed', e);
        throw e;
    } finally {
        teardownMockDOM();
    }
}

console.log('--- Portfolio Logic Tests Completed ---');
