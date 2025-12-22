
import { TransactionEngine } from '../engine/transactions/TransactionEngine.mjs';

console.log('--- Liquidity Guardrail Tests ---');

// --- Helpers ---
const mockProfile = {
    minRunwayMonths: 24,
    isDynamic: true,
    runway: { 'bear': { total: 60 }, 'peak': { total: 48 }, 'recovery_in_bear': { total: 48 }, 'hot_neutral': { total: 36 } }
};

function getBaseParams() {
    return {
        aktuelleLiquiditaet: 50000,
        depotwertGesamt: 500000,
        zielLiquiditaet: 60000,
        market: { sKey: 'hot_neutral', szenarioText: 'Normal' },
        spending: { monatlicheEntnahme: 2000 },
        minGold: 0,
        profil: mockProfile,
        input: {
            floorBedarf: 24000,
            flexBedarf: 10000,
            renteAktiv: false,
            renteMonatlich: 0,
            targetEq: 100,
            rebalancingBand: 20,
            maxSkimPctOfEq: 5,
            maxBearRefillPctOfEq: 2.5,
            runwayMinMonths: 24,
            runwayTargetMonths: 0,
            startVermoegen: 550000,

            // Portfolio Details required for Tax Calc
            depotwertAlt: 250000, costBasisAlt: 100000, tqfAlt: 0,
            depotwertNeu: 250000, costBasisNeu: 100000, tqfNeu: 0,
            goldWert: 0, goldCost: 0, tagesgeld: 50000,
            kirchensteuerSatz: 0, sparerPauschbetrag: 0
        }
    };
}

// --- TEST 1: Fail-Safe Trigger (Empty Cash - Peak/Normal Market) ---
{
    // Scenario: Cash is 0. Runway is 0. MUST sell.
    const params = getBaseParams();
    params.aktuelleLiquiditaet = 0;
    params.input.tagesgeld = 0;
    // Market: Hot Neutral -> Peak Logic -> Opportunistic Refill.

    const result = TransactionEngine.determineAction(params);

    console.log(`   Result Type: ${result.type}`);
    console.log(`   Title: ${result.title}`);
    console.log(`   Liq Allocated: ${result.verwendungen.liquiditaet}`);
    if (result.type === 'NONE') {
        console.log(`   Block Reason: ${result.transactionDiagnostics?.blockReason}`);
    }

    // In Good Markets, it's called "Opportunistisches Rebalancing & Liquidität auffüllen"
    assert(result.title.includes('Notfüllung') || result.title.includes('Liquidität auffüllen'),
        `Title should indicate refill. Was: ${result.title}`);
    assert(result.verwendungen.liquiditaet > 0, 'Should allocate to liquidity');

    console.log('✅ Fail-Safe Trigger (Normal Market) passed');
}

// --- TEST 1b: Fail-Safe Trigger (Weak Market - Guardrail) ---
{
    const params = getBaseParams();
    params.market.sKey = 'recovery'; // Not Peak, Not Bear
    params.aktuelleLiquiditaet = 0;
    params.input.tagesgeld = 0;

    const result = TransactionEngine.determineAction(params);

    assert(result.title.includes('Runway-Notfüllung'),
        `Title should indicate Guardrail Refill in Weak Market. Was: ${result.title}`);

    console.log('✅ Fail-Safe Trigger (Guardrail) passed');
}

// --- TEST 2: Bear Refill Cap ---
{
    // Scenario: Bear Market. Cash is Safe for Floor but Thin for Total.
    // Needs Notfüllung, but Capped.

    // Floor Need: 12k (1k/mo). Min Runway 24. Puffer = 24k.
    // Total Need: 36k (3k/mo). Trigger = 72k.
    // Cash: 30k. (>24k Puffer OK. <72k Guardrail BAD).

    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.market.szenarioText = 'Bärenmarkt';
    params.input.floorBedarf = 12000;
    params.input.flexBedarf = 24000;
    params.aktuelleLiquiditaet = 30000;
    params.input.tagesgeld = 30000;

    // Result should be "Runway-Notfüllung (Bär) (Cap aktiv)"

    const result = TransactionEngine.determineAction(params);

    assert(result.title.includes('Cap aktiv'), `Should indicate Cap Active in Bear. Title: ${result.title}`);

    const refillAmount = result.verwendungen.liquiditaet;
    const equity = params.depotwertGesamt; // 500k
    const capPct = params.input.maxBearRefillPctOfEq; // 2.5
    let expectedRefill = equity * (capPct / 100); // 12500
    // Anti-Pseudo-Accuracy: Cap is now quantized (floor) to nearest step (5000 for <50k)
    expectedRefill = Math.floor(expectedRefill / 5000) * 5000; // 10000

    // Not critical liquidity (30k > 24k isn't critical enough for emergency override? 
    // Critical is < Puffer * 1.5 = 36k. 30k < 36k.
    // logic: const isCriticalLiquidityBear = aktuelleLiquiditaet < (sicherheitsPuffer * 1.5);
    // So 30k IS critical.
    // Then computeCappedRefill uses:
    // const effectiveMaxCap = isCriticalLiquidity ? Math.max(maxCapEuro, aktienwert * 0.10) : maxCapEuro;
    // Emergency Cap = 10% = 50k.
    // Standard Cap = 2.5% = 12.5k.
    // So it allows up to 50k. 
    // Gap = 72k - 30k = 42k.
    // 42k < 50k. So FULL Refill allowed?
    // Wait, if full refill allowed, then Cap IS NOT ACTIVE.

    // I want to test CAP active.
    // So I need Gap > 50k? Or `isCriticalLiquidity` to be False.
    // Make `aktuelleLiquiditaet` > 36k.
    // Puffer 24k. Critical < 36k.
    // Set Cash = 40k.
    // Puffer OK. Critical False.
    // Gap: Target 72k - 40k = 32k.
    // Standard Cap: 12.5k.
    // Refill limited to 12.5k. Cap Active.

    console.log(`Debug Check: Current=${params.aktuelleLiquiditaet}, Puffer=24000, CriticalBoundary=36000`);

    const paramsSafe = JSON.parse(JSON.stringify(params));
    paramsSafe.aktuelleLiquiditaet = 40000;
    paramsSafe.input.tagesgeld = 40000;
    // Gap 32k. Cap 12.5k. Result 12.5k.

    const resultSafe = TransactionEngine.determineAction(paramsSafe);

    // Calculate expected Net Refill: Cap applies to Gross Sale.
    // Gain Ratio = (250k - 100k) / 250k = 0.6.
    // Tax Rate = 26.375%.
    // Expected Tax = expectedRefill * 0.6 * 0.26375;
    const expectedTax = expectedRefill * 0.6 * 0.26375;
    const expectedNet = expectedRefill - expectedTax;

    console.log(`   RefillSafe: ${resultSafe.verwendungen.liquiditaet} (Std Cap Gross: ${expectedRefill}, Net: ${expectedNet})`);

    assert(resultSafe.title.includes('Cap aktiv'), `Should satisfy Cap Active. Title: ${resultSafe.title}`);
    assertClose(resultSafe.verwendungen.liquiditaet, expectedNet, 10, 'Should use Standard Cap (Net after Tax)');

    console.log('✅ Bear Refill Cap passed');
}

// --- TEST 3: Runway Coverage Gap (<75%) ---
{
    // Scenario: Target 60k. Actual 40k (66%). Threshold 75%.
    // Should trigger Refill even if Runway > Min (e.g. 40k = 20 months > 12 Min... wait, min is 24).

    const params = getBaseParams();
    params.market.sKey = 'recovery'; // Non-Peak, Non-Bear -> Allows Neutral Guardrail
    params.zielLiquiditaet = 60000;
    params.aktuelleLiquiditaet = 40000;
    params.input.tagesgeld = 40000;

    // Let's reduce Min Runway to test Coverage Trigger alone.
    params.input.runwayMinMonths = 10;
    params.profil.minRunwayMonths = 10;
    // Now 14 months > 10 months. Runway OK.
    // But Coverage: 40k / 60k = 66% < 75%.
    // Should trigger.

    const result = TransactionEngine.determineAction(params);
    assert(result.type === 'TRANSACTION', 'Should trigger on Coverage Gap');
    assert(result.title.includes('Notfüllung'), 'Should be a Refill');

    console.log('✅ Coverage Gap Trigger passed');
}

console.log('--- Liquidity Guardrail Tests Completed ---');
