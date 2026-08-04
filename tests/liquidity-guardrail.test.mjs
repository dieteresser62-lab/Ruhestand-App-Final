
import { TransactionEngine } from '../engine/transactions/TransactionEngine.mjs';
import { FinancialCalculationError } from '../engine/errors.mjs';

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
        // Der Produktivpfad liefert immer das finale SpendingPlanner-Ergebnis.
        spending: {
            monatlicheEntnahme: 2000,
            details: { endgueltigeEntnahme: 24000 }
        },
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

            // Portfolio Details required for Tax Calc (Gewinnquote + Steuerlast).
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

    // Floor Need: 12k (1k/mo). Finaler Spending-Plan: 24k (2k/mo).
    // Bei 24 Monaten liegt das Guardrail-Ziel damit bei 48k; Cash startet
    // bei 36k und liegt oberhalb des separaten Floor-Puffers.

    const params = getBaseParams();
    params.market.sKey = 'bear_deep';
    params.market.szenarioText = 'Bärenmarkt';
    params.input.floorBedarf = 12000;
    params.input.flexBedarf = 24000;
    params.aktuelleLiquiditaet = 36000;
    params.input.tagesgeld = 36000;
    params.zielLiquiditaet = 48000;

    // Finaler Spending-Bedarf: 24k/Jahr. 36k Cash entsprechen 18 Monaten;
    // die 24-Monats-Untergrenze verlangt 12k Auffüllung. Das normale
    // Bären-Cap begrenzt den quantisierten Bruttoverkauf auf 10k.
    const result = TransactionEngine.determineAction(params);

    assert(result.title.includes('Cap aktiv'), `Should indicate Cap Active in Bear. Title: ${result.title}`);

    const equity = params.depotwertGesamt; // 500k
    const capPct = params.input.maxBearRefillPctOfEq; // 2.5
    let expectedRefill = equity * (capPct / 100); // 12500
    // Anti-Pseudo-Accuracy: Cap is now quantized (floor) to nearest step (5000 for <50k)
    expectedRefill = Math.floor(expectedRefill / 5000) * 5000; // 10000

    // Calculate expected Net Refill: Cap applies to Gross Sale.
    // Gain Ratio = (250k - 100k) / 250k = 0.6.
    // Tax Rate = 26.375%.
    // Expected Tax = expectedRefill * 0.6 * 0.26375;
    const expectedTax = expectedRefill * 0.6 * 0.26375;
    const expectedNet = expectedRefill - expectedTax;

    console.log(`   Refill: ${result.verwendungen.liquiditaet} (Std Cap Gross: ${expectedRefill}, Net: ${expectedNet})`);

    assertClose(result.verwendungen.liquiditaet, expectedNet, 10, 'Should use Standard Cap (Net after Tax)');

    console.log('✅ Bear Refill Cap passed');
}

// --- TEST 2b: Bear emergency cap switches exactly below 75% target coverage ---
{
    const makeBearBoundaryParams = (cash) => {
        const params = getBaseParams();
        params.market.sKey = 'bear_deep';
        params.market.szenarioText = 'Bärenmarkt';
        params.zielLiquiditaet = 200000;
        params.aktuelleLiquiditaet = cash;
        params.input.tagesgeld = cash;
        params.input.floorBedarf = 12000;
        params.input.flexBedarf = 88000;
        params.input.liquidityRunwayYears = 2;
        params.input.startVermoegen = 650000;
        params.input.depotwertAlt = 250000;
        params.input.costBasisAlt = 250000;
        params.input.depotwertNeu = 250000;
        params.input.costBasisNeu = 250000;
        params.spending = {
            monatlicheEntnahme: 100000 / 12,
            details: { endgueltigeEntnahme: 100000 }
        };
        return params;
    };

    const standardResult = TransactionEngine.determineAction(makeBearBoundaryParams(150000));
    const emergencyResult = TransactionEngine.determineAction(makeBearBoundaryParams(149999));
    const standardGross = standardResult.quellen.reduce((sum, source) => sum + source.brutto, 0);
    const emergencyGross = emergencyResult.quellen.reduce((sum, source) => sum + source.brutto, 0);

    assertEqual(standardResult.type, 'TRANSACTION', 'Exactly 75% target coverage should retain a capped bear refill');
    assertEqual(emergencyResult.type, 'TRANSACTION', 'Coverage below 75% should trigger a capped bear emergency refill');
    assertClose(standardGross, 10000, 1e-7, 'Exactly 75% coverage must retain the quantized 2.5% standard cap');
    assertClose(emergencyGross, 50000, 1e-7, 'Coverage one euro below 75% must activate the quantized 10% emergency cap');
    assertClose(standardResult.verwendungen.liquiditaet, 10000, 1e-7, 'Standard-cap sale must fund exactly 10,000 EUR liquidity');
    assertClose(emergencyResult.verwendungen.liquiditaet, 50000, 1e-7, 'Emergency-cap sale must fund exactly 50,000 EUR liquidity');
    assertClose(standardResult.steuer, 0, 1e-7, 'Zero-gain standard-cap witness must remain tax-neutral');
    assertClose(emergencyResult.steuer, 0, 1e-7, 'Zero-gain emergency-cap witness must remain tax-neutral');
    assert(
        standardResult.diagnosisEntries.some(entry => (
            entry.step === 'Cap wirksam (Bär)'
            && entry.impact.includes('10000€')
            && entry.impact.includes('(2.5%)')
        )),
        'Standard-cap witness must expose its 10,000 EUR cap and configured 2.5% policy as a named diagnosis entry'
    );
    assert(
        emergencyResult.diagnosisEntries.some(entry => (
            entry.step === 'Cap wirksam (Bär)'
            && entry.impact.includes('50000€')
            && entry.impact.includes('(10% Notfall-Cap)')
        )),
        'Emergency-cap witness must expose its 50,000 EUR cap and effective 10% emergency policy as a named diagnosis entry'
    );

    console.log('✅ Bear standard/emergency cap boundary passed');
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
    params.input.liquidityRunwayYears = 1;
    params.profil.minRunwayMonths = 12;
    // Current runway remains above the canonical 12-month hard minimum.
    // But Coverage: 40k / 60k = 66% < 75%.
    // Should trigger.

    const result = TransactionEngine.determineAction(params);
    assert(result.type === 'TRANSACTION', 'Should trigger on Coverage Gap');
    assert(result.title.includes('Notfüllung'), 'Should be a Refill');

    console.log('✅ Coverage Gap Trigger passed');
}

// --- TEST 4: Pension-covered floor should not trigger crisis refill for optional flex runway ---
{
    const params = getBaseParams();
    params.market.sKey = 'recovery_in_bear';
    params.market.szenarioText = 'Erholung im Bärenmarkt';
    params.zielLiquiditaet = 100000;
    params.aktuelleLiquiditaet = 25000;
    params.input.tagesgeld = 25000;
    params.input.floorBedarf = 30000;
    params.input.flexBedarf = 25000;
    params.input.renteAktiv = true;
    params.input.renteMonatlich = 3000; // 36k pension covers the 30k floor.
    params.spending = {
        monatlicheEntnahme: 19000 / 12,
        details: { endgueltigeEntnahme: 19000 }
    };

    const result = TransactionEngine.determineAction(params);

    assert(result.type === 'NONE', `Should not sell in bear recovery for optional flex runway only. Title: ${result.title}`);
    assert(!result.title.includes('Runway-Notfüllung'), `Should not label optional flex runway as crisis refill. Title: ${result.title}`);

    console.log('✅ Pension-covered floor suppresses optional flex crisis refill passed');
}

// --- TEST 5: Guardrail runway uses the final spending need, not raw input flex ---
{
    const params = getBaseParams();
    params.market.sKey = 'recovery';
    params.market.szenarioText = 'Erholung';
    params.aktuelleLiquiditaet = 80000;
    params.zielLiquiditaet = 72000;
    params.input.tagesgeld = 80000;
    params.input.floorBedarf = 12000;
    params.input.flexBedarf = 120000;
    params.input.liquidityRunwayYears = 3;
    params.spending = { monatlicheEntnahme: 2000, details: { endgueltigeEntnahme: 24000 } };

    const result = TransactionEngine.determineAction(params);

    assert(result.type === 'NONE', `Effective 40-month runway should not trigger a refill. Title: ${result.title}`);
    assert(!result.title.includes('Runway-Notfüllung'), `Effective spending need must suppress the raw-flex guardrail refill. Title: ${result.title}`);

    const legacyFallbackParams = JSON.parse(JSON.stringify(params));
    delete legacyFallbackParams.spending;
    const legacyFallbackResult = TransactionEngine.determineAction(legacyFallbackParams);

    assert(legacyFallbackResult.type === 'TRANSACTION', 'Direct legacy callers without spending data should retain the conservative raw-need fallback');
    assert(legacyFallbackResult.title.includes('Runway-Notfüllung'), 'Legacy fallback should remain explicitly visible as a runway refill');
    assertEqual(
        legacyFallbackResult.transactionDiagnostics?.plannedAnnualWithdrawal?.source,
        'legacy_raw_input_without_spending_result',
        'The direct-call legacy fallback must be explicitly diagnosed instead of remaining silent'
    );

    const invalidProductParams = JSON.parse(JSON.stringify(params));
    invalidProductParams.spending = {};
    let invalidProductError = null;
    try {
        TransactionEngine.determineAction(invalidProductParams);
    } catch (error) {
        invalidProductError = error;
    }
    assert(invalidProductError instanceof FinancialCalculationError,
        'A present but incomplete SpendingPlanner result must fail instead of silently selecting the legacy raw-need branch');
    assertEqual(invalidProductError.context?.contract, 'planned_annual_withdrawal',
        'Incomplete product spending should expose the violated withdrawal contract');

    console.log('✅ Effective spending need and legacy fallback passed');
}

console.log('--- Liquidity Guardrail Tests Completed ---');
