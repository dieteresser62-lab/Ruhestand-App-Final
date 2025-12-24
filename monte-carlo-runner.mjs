import { loadWasm } from './load-wasm.mjs';

async function testMonteCarlo() {
    console.log('=== Rust Monte Carlo Test ===\n');

    const wasm = await loadWasm();

    // Create Dummy Historical Returns (Bootstrap Pool)
    // S&P 500 Style: ~10% avg, 20% vol roughly
    const historicalReturns = [];
    const historicalInflation = [];

    for (let i = 0; i < 100; i++) {
        // Simple random distribution
        const r = 1.0 + (Math.random() * 0.40 - 0.15); // -15% to +25%
        historicalReturns.push(r);
        historicalInflation.push(2.0 + (Math.random() * 3.0)); // 2-5% inflation
    }

    const input = {
        aktuellesAlter: 60,
        risikoprofil: "wachstum",
        inflation: 2.0,
        tagesgeld: 50000.0,
        geldmarktEtf: 0.0,
        aktuelleLiquiditaet: 50000.0,
        depotwertAlt: 800000.0,
        depotwertNeu: 0.0,
        goldAktiv: true,
        goldWert: 100000.0,
        goldCost: 80000.0,
        goldZielProzent: 10.0,
        goldFloorProzent: 5.0,
        floorBedarf: 30000.0,
        flexBedarf: 12000.0,
        renteAktiv: false,
        renteMonatlich: 0.0,
        costBasisAlt: 600000.0,
        costBasisNeu: 0.0,
        sparerPauschbetrag: 1000.0,
        endeVJ: 100.0,
        endeVJ_1: 95.0,
        endeVJ_2: 90.0,
        endeVJ_3: 85.0,
        ath: 105.0,
        jahreSeitAth: 0,
        capeRatio: 20.0,
        runwayMinMonths: 24.0,
        runwayTargetMonths: 36.0,
        targetEq: 75.0,
        rebalBand: 5.0,
        maxSkimPctOfEq: 10.0,
        maxBearRefillPctOfEq: 20.0,
    };

    const config = {
        numSimulations: 5000,
        yearsToSimulate: 30,
        historicalReturns,
        historicalInflation,
    };

    console.log(`Running ${config.numSimulations} Simulations x ${config.yearsToSimulate} Years...\n`);
    console.time('Monte Carlo Duration');

    try {
        const result = wasm.run_monte_carlo_wasm(input, config);
        console.timeEnd('Monte Carlo Duration');

        console.log('\n=== RESULTS ===');
        console.log(`✅ Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
        console.log(`💀 Ruin Probability: ${(result.ruinProbability * 100).toFixed(1)}%`);
        console.log(`💰 Median Wealth: €${result.medianFinalWealth.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`);
        console.log(`📉 5th Percentile (Bad): €${result.percentile5.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`);
        console.log(`📈 95th Percentile (Good): €${result.percentile95.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`);

        if (result.avgYearsToRuin) {
            console.log(`⏳ Avg Years to Ruin: ${result.avgYearsToRuin.toFixed(1)}`);
        }

    } catch (e) {
        console.error('\n❌ ERROR:', e);
        process.exit(1);
    }
}

testMonteCarlo();
