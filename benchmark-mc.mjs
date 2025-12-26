import { loadWasm } from './load-wasm.mjs';

async function benchmark() {
    console.log('=== Monte Carlo Performance Benchmark ===\n');

    const wasm = await loadWasm();

    // Historic Returns (simplified for benchmark)
    const historicalReturns = [];
    const historicalInflation = [];
    for (let i = 0; i < 100; i++) {
        historicalReturns.push(1.0 + (Math.random() * 0.40 - 0.15));
        historicalInflation.push(2.0 + Math.random() * 3.0);
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

    const testCases = [
        { sims: 100, years: 30, label: "100 x 30" },
        { sims: 1000, years: 30, label: "1k x 30" },
        { sims: 5000, years: 30, label: "5k x 30" },
        { sims: 10000, years: 30, label: "10k x 30" },
        // { sims: 100000, years: 30, label: "100k x 30" }, // Caution with heap
    ];

    console.log('Simulations │ Duration │ Sims/sec │ Success Rate');
    console.log('────────────┼──────────┼──────────┼─────────────');

    for (const tc of testCases) {
        const config = {
            numSimulations: tc.sims,
            yearsToSimulate: tc.years,
            historicalReturns,
            historicalInflation,
        };

        const start = performance.now();
        const result = wasm.run_monte_carlo_wasm(input, config);
        const duration = performance.now() - start;

        const simsPerSec = Math.round(tc.sims / (duration / 1000));
        console.log(
            `${tc.label.padEnd(11)} │ ${duration.toFixed(0).padStart(6)}ms │ ${simsPerSec.toString().padStart(8)} │ ${(result.successRate * 100).toFixed(1)}%`
        );
    }

    console.log('\n✅ Benchmark complete!');
}

benchmark().catch(console.error);
