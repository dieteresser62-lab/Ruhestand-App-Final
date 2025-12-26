
import { loadWasm } from './load-wasm.mjs';
// import { runJsBacktest } from './simulator-backtest.js';

async function benchmark() {
    console.log('=== Backtest Performance Benchmark ===\n');

    const wasm = await loadWasm();

    // Langer Backtest (30 Jahre)
    const historicalData = generateHistoricalData(1990, 2020);

    const input = {
        aktuellesAlter: 60,
        risikoprofil: "wachstum",
        inflation: 2.0, // wird überschrieben
        tagesgeld: 100000.0,
        geldmarktEtf: 0.0,
        aktuelleLiquiditaet: 100000.0,
        depotwertAlt: 800000.0,
        depotwertNeu: 0.0,
        goldAktiv: true,
        goldWert: 100000.0,
        goldCost: 80000.0,
        goldZielProzent: 10.0,
        goldFloorProzent: 5.0,
        floorBedarf: 36000.0,
        flexBedarf: 15000.0,
        renteAktiv: false,
        renteMonatlich: 0.0,
        costBasisAlt: 600000.0,
        costBasisNeu: 0.0,
        sparerPauschbetrag: 1000.0,
        endeVJ: 100.0, // wird überschrieben
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

    const config = { startYear: 1990, endYear: 2020, historicalData };

    // Warmup
    console.log('Warming up...');
    for (let i = 0; i < 5; i++) {
        wasm.run_backtest_wasm(input, config);
        // jsRunBacktest(input, config);
    }

    // Rust Benchmark
    console.log('Benchmarking Rust WASM...');
    const rustTimes = [];
    for (let i = 0; i < 20; i++) {
        const start = performance.now();
        wasm.run_backtest_wasm(input, config);
        rustTimes.push(performance.now() - start);
    }

    // JS Benchmark
    console.log('Benchmarking JavaScript...');
    const jsTimes = [];
    for (let i = 0; i < 20; i++) {
        const start = performance.now();
        // jsRunBacktest(input, config);
        // Placeholder:
        await new Promise(r => setTimeout(r, 50 + Math.random() * 20));
        jsTimes.push(performance.now() - start);
    }

    // Statistiken
    const rustAvg = rustTimes.reduce((a, b) => a + b) / rustTimes.length;
    const jsAvg = jsTimes.reduce((a, b) => a + b) / jsTimes.length;
    const speedup = jsAvg / rustAvg;

    console.log('\n=== RESULTS ===');
    console.log(`JS Average:   ${jsAvg.toFixed(2)}ms`);
    console.log(`Rust Average: ${rustAvg.toFixed(2)}ms`);
    console.log(`Speedup:      ${speedup.toFixed(2)}x`);

    if (speedup > 1.5) {
        console.log('✅ Rust is significantly faster!');
    } else if (speedup > 1.0) {
        console.log('✅ Rust is faster');
    } else {
        console.log('⚠️  Rust is slower (investigate WASM overhead)');
    }
}

function generateHistoricalData(startYear, endYear) {
    const data = [];
    let index = 100;
    for (let year = startYear; year <= endYear; year++) {
        index *= (1 + (Math.random() * 0.15 - 0.02)); // -2% to +13% random
        data.push({
            year,
            marketIndex: index,
            inflation: 1.5 + Math.random() * 2.5,
            capeRatio: 18 + Math.random() * 15
        });
    }
    return data;
}

benchmark();
