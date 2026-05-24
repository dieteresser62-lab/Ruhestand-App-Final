
import { buyGold, buyStocksNeu, sumDepot, initializePortfolio, initializePortfolioDetailed, getCommonInputs } from '../app/simulator/simulator-portfolio.js';

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
    // Erster Kauf erstellt Tranche.
    buyGold(portfolio, 100);
    assertEqual(portfolio.depotTranchesGold.length, 1, 'Should add gold tranche');
    assertEqual(portfolio.depotTranchesGold[0].marketValue, 100, 'Should have correct value');

    // Zweiter Kauf soll in bestehende Tranche aggregieren.
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

    // Neue Käufe addieren nur zur "neu"-Tranche.
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
        'dynamicFlex': { checked: false },
        'horizonMethod': 'survival_quantile',
        'horizonYears': 30,
        'survivalQuantile': 0.85,
        'goGoActive': { checked: false },
        'goGoMultiplier': 1.1,
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
        assertEqual(parsedInputs.dynamicFlex, false, 'Should parse dynamicFlex toggle');
        assertEqual(parsedInputs.horizonMethod, 'survival_quantile', 'Should parse default horizonMethod');
        assertEqual(parsedInputs.horizonYears, 30, 'Should parse horizonYears');
        assertEqual(parsedInputs.survivalQuantile, 0.85, 'Should parse survivalQuantile');
        assertEqual(parsedInputs.goGoActive, false, 'Should parse goGoActive');
        assertEqual(parsedInputs.goGoMultiplier, 1.1, 'Should parse goGoMultiplier');
        assertEqual(parsedInputs.capeRatio, 20, 'Should mirror marketCapeRatio as capeRatio');

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

// Test 5: Dynamic Flex bounds and fallbacks
{
    const mockValues = {
        'dynamicFlex': { checked: true },
        'horizonMethod': 'invalid',
        'horizonYears': 120,
        'survivalQuantile': 0.1,
        'goGoActive': { checked: true },
        'goGoMultiplier': 999,
        'marketCapeRatio': 31.4
    };

    setupMockDOM(mockValues);
    try {
        const parsedInputs = getCommonInputs();
        assertEqual(parsedInputs.dynamicFlex, true, 'Should enable dynamicFlex');
        assertEqual(parsedInputs.horizonMethod, 'survival_quantile', 'Invalid horizonMethod should fallback');
        assertEqual(parsedInputs.horizonYears, 60, 'horizonYears should clamp to max');
        assertEqual(parsedInputs.survivalQuantile, 0.5, 'survivalQuantile should clamp to min');
        assertEqual(parsedInputs.goGoActive, true, 'Should enable goGoActive');
        assertEqual(parsedInputs.goGoMultiplier, 1.5, 'goGoMultiplier should clamp to max');
        assertEqual(parsedInputs.marketCapeRatio, 31.4, 'Should parse marketCapeRatio');
        assertEqual(parsedInputs.capeRatio, 31.4, 'Should keep cape alias in sync');
        console.log('✅ Dynamic Flex parsing bounds work');
    } finally {
        teardownMockDOM();
    }
}

// Test 6: Pflegebucket carve-out from aggregate money market and cash
{
    const portfolio = initializePortfolio({
        startVermoegen: 300000,
        depotwertAlt: 100000,
        einstandAlt: 80000,
        tagesgeld: 50000,
        geldmarktEtf: 120000,
        goldAktiv: false,
        healthBucket: {
            enabled: true,
            initialAmount: 150000,
            assetSource: 'money_market_first_then_cash',
            triggerMinGrade: 4,
            triggerMode: 'OR',
            coverageMode: 'care_additional_floor_only',
            returnMode: 'cash_return',
            targetMode: 'inflation_indexed_diagnostic'
        }
    });

    assertEqual(portfolio.healthBucketGeldmarkt, 150000, 'Health bucket should carve requested amount');
    assertEqual(portfolio.geldmarktEtf, 0, 'Money market should be used first');
    assertEqual(portfolio.tagesgeld, 20000, 'Cash should cover remaining bucket amount');
    assertEqual(portfolio.liquiditaet, 20000, 'Operational liquidity should exclude health bucket');
    assertEqual(portfolio.healthBucketCashAmount, 30000, 'Cash carve-out should be tracked');
    assertEqual(portfolio.healthBucketTranches.length, 1, 'Carved money-market tranche should be tracked');
    console.log('✅ Health bucket aggregate carve-out works');
}

// Test 7: Pflegebucket carve-out reduces detailed money-market tranches FIFO
{
    const portfolio = initializePortfolioDetailed({
        tagesgeld: 20000,
        geldmarktEtf: 0,
        detailledTranches: [
            {
                trancheId: 'gm-new',
                category: 'money_market',
                type: 'geldmarkt',
                marketValue: 70000,
                costBasis: 63000,
                purchaseDate: '2022-01-01'
            },
            {
                trancheId: 'gm-old',
                category: 'money_market',
                type: 'geldmarkt',
                marketValue: 60000,
                costBasis: 60000,
                purchaseDate: '2020-01-01'
            },
            {
                trancheId: 'eq',
                category: 'equity',
                type: 'aktien_alt',
                marketValue: 100000,
                costBasis: 80000,
                purchaseDate: '2019-01-01'
            }
        ],
        healthBucket: {
            enabled: true,
            initialAmount: 100000
        }
    });

    assertEqual(portfolio.healthBucketGeldmarkt, 100000, 'Detailed carve-out should fill requested amount');
    assertEqual(portfolio.geldmarktEtf, 30000, 'Remaining money market should stay operational');
    assertEqual(portfolio.liquiditaet, 50000, 'Operational liquidity should be cash plus remaining money market');
    assertEqual(portfolio.depotTranchesGeldmarkt.length, 1, 'Fully carved FIFO tranche should be removed');
    assertEqual(portfolio.depotTranchesGeldmarkt[0].trancheId, 'gm-new', 'Newer tranche should remain after FIFO carve-out');
    assertEqual(portfolio.depotTranchesGeldmarkt[0].marketValue, 30000, 'Newer tranche should be partially reduced');
    assertEqual(portfolio.healthBucketTranches.length, 2, 'Bucket should remember carved source lots');
    assertEqual(portfolio.healthBucketTranches[0].trancheId, 'gm-old', 'Oldest tranche should be carved first');
    assertEqual(portfolio.healthBucketTranches[1].marketValue, 40000, 'Second tranche should be partially carved');
    console.log('✅ Health bucket detailed FIFO carve-out works');
}

// Test 8: Pflegebucket caps when money market and cash are insufficient
{
    const portfolio = initializePortfolio({
        startVermoegen: 100000,
        depotwertAlt: 0,
        einstandAlt: 0,
        tagesgeld: 20000,
        geldmarktEtf: 50000,
        goldAktiv: false,
        healthBucket: {
            enabled: true,
            initialAmount: 100000
        }
    });

    assertEqual(portfolio.healthBucketGeldmarkt, 70000, 'Health bucket should cap to available liquid assets');
    assertEqual(portfolio.healthBucketMeta.capped, true, 'Capped bucket should be flagged');
    assertEqual(portfolio.healthBucketMeta.shortfall, 30000, 'Shortfall should be tracked');
    assert(portfolio.healthBucketMeta.warnings.length === 1, 'Capped bucket should produce one warning');
    assertEqual(portfolio.liquiditaet, 0, 'All liquid assets should be carved when capped');
    console.log('✅ Health bucket capped carve-out works');
}

// Test 9: Pflegebucket FIFO remains stable with invalid purchase dates
{
    const portfolio = initializePortfolioDetailed({
        tagesgeld: 0,
        geldmarktEtf: 0,
        detailledTranches: [
            {
                trancheId: 'gm-valid',
                category: 'money_market',
                type: 'geldmarkt',
                marketValue: 50000,
                costBasis: 50000,
                purchaseDate: '2024-01-01'
            },
            {
                trancheId: 'gm-invalid',
                category: 'money_market',
                type: 'geldmarkt',
                marketValue: 50000,
                costBasis: 50000,
                purchaseDate: 'kein-datum'
            }
        ],
        healthBucket: {
            enabled: true,
            initialAmount: 50000
        }
    });

    assertEqual(portfolio.healthBucketTranches.length, 1, 'Invalid-date tranche should still be carved deterministically');
    assertEqual(portfolio.healthBucketTranches[0].trancheId, 'gm-invalid', 'Invalid date should fall back to FIFO baseline date');
    assertEqual(portfolio.depotTranchesGeldmarkt[0].trancheId, 'gm-valid', 'Valid later tranche should remain operational');
    console.log('✅ Health bucket invalid-date FIFO fallback works');
}

console.log('--- Portfolio Logic Tests Completed ---');
