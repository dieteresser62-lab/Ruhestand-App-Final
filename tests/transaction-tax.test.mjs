
import { TransactionEngine } from '../engine/transactions/TransactionEngine.mjs';

console.log('--- Transaction Tax Tests ---');

// --- Helper: Base Inputs ---
function getBaseInputs() {
    return {
        // Tax Rates
        kirchensteuerSatz: 0.0, // 0%
        sparerPauschbetrag: 0,

        // Portfolio Tranches
        depotwertAlt: 20000,
        costBasisAlt: 10000, // 50% Profit
        tqfAlt: 0.0, // No partial exemption

        depotwertNeu: 0,
        costBasisNeu: 0,
        tqfNeu: 0,

        // Gold
        goldAktiv: false,
        goldWert: 0,
        goldCost: 0,
        goldSteuerfrei: false,

        // Misc
        rebalancingBand: 20
    };
}

const baseMarket = { sKey: 'hot_neutral' };
const baseContext = { saleBudgets: {} }; // No budget limits

// --- TEST 1: KESt Calculation (Base Claim) ---
{
    const input = getBaseInputs();
    input.kirchensteuerSatz = 0.0;

    // Sell 10,000 EUR from 'Alt' Tranche.
    // Tranche: 20k Value, 10k Cost. Profit Ratio = 0.5.
    // Sold: 10k. Profit Portion: 5k.
    // Taxable: 5k (No TQF, No SPB).
    // Tax Rate: 25% * 1.055 (Soli) = 26.375%.
    // Expected Tax: 5000 * 0.26375 = 1318.75.

    const result = TransactionEngine.calculateSaleAndTax(
        10000,
        input,
        baseContext,
        baseMarket,
        false
    );

    // Note: calculateSaleAndTax returns 'achievedRefill' (Netto).
    // Netto = Brutto - Tax.
    // If I requested 10k Netto, it calculates gross up?
    // Wait, function signature: calculateSaleAndTax(requestedRefill ...).
    // Logic: `_calculateSingleSale` iterates and tries to fill `requestedRefill` (NETTO).
    // So if I request 10k NEt, it calculates required Gross.

    // Let's test specific Tax on specific Gross by looking at breakdown.
    // breakdown[0].brutto is the gross amount sold.
    // breakdown[0].steuer is the tax.

    // If we request huge amount, we sell everything (20k).
    // Let's request 20k Netto (Impossible since 20k Gross).
    // It will sell 20k Gross.
    // Profit 10k. Tax 2637.50. Net 17362.50.

    // Vollverkauf erzwingen, um Steuerberechnung eindeutig zu prüfen.
    const fullSale = TransactionEngine.calculateSaleAndTax(
        20000,
        input,
        baseContext,
        baseMarket,
        false
    );

    const tax = fullSale.steuerGesamt;
    const expectedTax = 10000 * 0.25 * 1.055; // 2637.5

    // console.log(`Tax Full Sale: ${tax} (Expected ${expectedTax})`);

    assertClose(tax, expectedTax, 0.01, 'Tax should be 25% + Soli on full profit');
    console.log('✅ KESt Logic works');
}

// --- TEST 2: Teilfreistellung (TQF) ---
{
    const input = getBaseInputs();
    input.tqfAlt = 0.30; // 30% Exemption

    // Sell Full 20k (10k Profit).
    // Taxable Profit = 10k * (1 - 0.3) = 7k.
    // Tax = 7000 * 0.26375 = 1846.25.

    const result = TransactionEngine.calculateSaleAndTax(
        20000,
        input,
        baseContext,
        baseMarket,
        false
    );

    const tax = result.steuerGesamt;
    const expectedTax = 7000 * 0.25 * 1.055;

    assertClose(tax, expectedTax, 0.01, 'Tax should respect TQF (30% exemption)');
    console.log('✅ TQF Logic works');
}

// --- TEST 3: Sparer-Pauschbetrag (SPB) ---
{
    const input = getBaseInputs();
    input.sparerPauschbetrag = 1000;

    // Sell Full 20k (10k Profit).
    // Taxable Profit = 10k.
    // Offset SPB: 10k - 1k = 9k.
    // Tax = 9000 * 0.26375 = 2373.75.

    const result = TransactionEngine.calculateSaleAndTax(
        20000,
        input,
        baseContext,
        baseMarket,
        false
    );

    const tax = result.steuerGesamt;
    const expectedTax = 9000 * 0.25 * 1.055;

    assertClose(tax, expectedTax, 0.01, 'Tax should respect SPB');
    assertClose(result.pauschbetragVerbraucht, 1000, 0.01, 'Should report used SPB');

    console.log('✅ SPB Logic works');
}

// --- TEST 4: Gold Tax ---
{
    // Case A: Tax Free (Short term? No, usually Long Term checked via input.goldSteuerfrei)
    const input = getBaseInputs();
    input.goldAktiv = true;
    input.goldWert = 10000;
    input.goldCost = 5000; // 5k Profit
    input.goldSteuerfrei = true; // Held > 1yr

    // Sell Gold only.
    // Need to empty stocks or force gold sale via budget or order.
    // Stocks are 20k.
    // Let's set stocks to 0 for this test.
    input.depotwertAlt = 0;
    input.costBasisAlt = 0;

    const result = TransactionEngine.calculateSaleAndTax(
        10000, // Sell all
        input,
        baseContext,
        baseMarket,
        true // Emergency Sale (Defensive) forces Gold first usually? Or just sell only available asset.
    );

    assertClose(result.steuerGesamt, 0, 0.01, 'Gold should be tax free if configured so');

    // Case B: Not Tax Free
    const inputTaxed = getBaseInputs();
    inputTaxed.goldAktiv = true;
    inputTaxed.goldWert = 10000;
    inputTaxed.goldCost = 5000;
    inputTaxed.goldSteuerfrei = false; // < 1 yr
    inputTaxed.depotwertAlt = 0;

    const resultTaxed = TransactionEngine.calculateSaleAndTax(
        10000,
        inputTaxed,
        baseContext,
        baseMarket,
        false
    );

    // Profit 5k. 
    // Is Gold taxed flat 25% in this engine?
    // Implementation check: `tqf = input.goldSteuerfrei ? 1.0 : 0.0`.
    // So TQF is 0. Tax base is full profit. Rate is KESt (26.375%).
    // Note: In reality Gold is personal tax rate, but Engine approximates with KESt or 0.
    const expectedTax = 5000 * 0.25 * 1.055;

    assertClose(resultTaxed.steuerGesamt, expectedTax, 0.01, 'Gold <1yr taxed at flat rate in engine');

    console.log('✅ Gold Tax Logic works');
}

// --- TEST 5: Sell Order (Tax Efficiency) ---
{
    const input = getBaseInputs();
    // Tranche A: Alt. 10k Value, 2k Cost. Profit 80%.
    input.depotwertAlt = 10000;
    input.costBasisAlt = 2000;
    input.tqfAlt = 0;

    // Tranche B: Neu. 10k Value, 9k Cost. Profit 10%.
    input.depotwertNeu = 10000;
    input.costBasisNeu = 9000;
    input.tqfNeu = 0;

    // Request 5k Netto.
    // Should sell Tranche B (Neu) first because lower profit ratio -> lower tax.

    const result = TransactionEngine.calculateSaleAndTax(
        5000,
        input,
        baseContext,
        baseMarket,
        false
    );

    // Check breakdown
    const usedNeu = result.breakdown.find(b => b.kind === 'aktien_neu');
    const usedAlt = result.breakdown.find(b => b.kind === 'aktien_alt');

    assert(usedNeu !== undefined && usedNeu.brutto > 0, 'Should use Tax-Efficient Tranche (Neu)');
    assert(usedAlt === undefined || usedAlt.brutto === 0, 'Should NOT use Tax-Inefficient Tranche (Alt) yet');

    console.log('✅ Sell Order (Efficiency) works');
}


// --- TEST 6: Detailed Tranches (Unique IDs, No Overwrite) ---
{
    const input = getBaseInputs();
    input.depotwertAlt = 0;
    input.costBasisAlt = 0;
    input.depotwertNeu = 0;
    input.costBasisNeu = 0;

    input.detailledTranches = [
        { trancheId: 't1', isin: 'SAME', name: 'Lot A', type: 'aktien_neu', category: 'equity', marketValue: 1000, costBasis: 1000, tqf: 0, purchaseDate: '2020-01-01' },
        { trancheId: 't2', isin: 'SAME', name: 'Lot B', type: 'aktien_neu', category: 'equity', marketValue: 1000, costBasis: 1000, tqf: 0, purchaseDate: '2021-01-01' }
    ];

    const result = TransactionEngine.calculateSaleAndTax(
        1500,
        input,
        baseContext,
        baseMarket,
        false
    );

    const totalBrutto = result.breakdown.reduce((sum, b) => sum + (b.brutto || 0), 0);
    assertClose(totalBrutto, 1500, 0.01, 'Should sell across multiple detailed tranches');
    assert(result.breakdown.length === 2, 'Should preserve multiple detailed tranches with same ISIN');

    console.log('✅ Detailed tranches (unique IDs) work');
}

// --- TEST 7: Sale Budgets Across Lots ---
{
    const input = getBaseInputs();
    input.depotwertAlt = 0;
    input.costBasisAlt = 0;
    input.depotwertNeu = 0;
    input.costBasisNeu = 0;

    input.detailledTranches = [
        { trancheId: 't1', isin: 'SAME', name: 'Lot A', type: 'aktien_neu', category: 'equity', marketValue: 1000, costBasis: 1000, tqf: 0, purchaseDate: '2020-01-01' },
        { trancheId: 't2', isin: 'SAME', name: 'Lot B', type: 'aktien_neu', category: 'equity', marketValue: 1000, costBasis: 1000, tqf: 0, purchaseDate: '2021-01-01' }
    ];

    const budgetContext = { saleBudgets: { aktien_neu: 1200 } };
    const result = TransactionEngine.calculateSaleAndTax(
        2000,
        input,
        budgetContext,
        baseMarket,
        false
    );

    assert(result.bruttoVerkaufGesamt <= 1200.01, 'Sale budget should cap total gross across lots');

    console.log('✅ Sale budget caps total across lots');
}
console.log('--- Transaction Tax Tests Completed ---');
