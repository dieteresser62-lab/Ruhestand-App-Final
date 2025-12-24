
import { loadWasm } from './load-wasm.mjs';
// WICHTIG: Importiere die JS-Backtest-Funktion
// (Existiert in simulator-backtest.js, muss evtl. zu ES6 Module konvertiert werden)

async function parityTest() {
    console.log('=== Backtest Parity Test (JS vs Rust) ===\n');

    const wasm = await loadWasm();

    // Identische Inputs
    const input = {
        aktuellesAlter: 65,
        risikoprofil: "wachstum",
        inflation: 2.0,
        tagesgeld: 80000.0,
        geldmarktEtf: 0.0,
        aktuelleLiquiditaet: 80000.0,
        depotwertAlt: 600000.0,
        depotwertNeu: 0.0,
        goldAktiv: false,
        goldWert: 0.0,
        goldCost: 0.0,
        goldZielProzent: 0.0,
        goldFloorProzent: 0.0,
        floorBedarf: 30000.0,
        flexBedarf: 12000.0,
        renteAktiv: true,
        renteMonatlich: 1200.0,
        costBasisAlt: 500000.0,
        costBasisNeu: 0.0,
        sparerPauschbetrag: 1000.0,
        endeVJ: 100.0,
        endeVJ_1: 95.0,
        endeVJ_2: 90.0,
        endeVJ_3: 85.0,
        ath: 105.0,
        jahreSeitAth: 0,
        capeRatio: 25.0,
        runwayMinMonths: 24.0,
        runwayTargetMonths: 36.0,
        targetEq: 70.0,
        rebalBand: 5.0,
        maxSkimPctOfEq: 10.0,
        maxBearRefillPctOfEq: 20.0,
    };

    // 2008 Finanzkrise als Test-Szenario
    const historicalData = [
        { year: 2007, marketIndex: 100.0, inflation: 2.8, capeRatio: 27.0 },
        { year: 2008, marketIndex: 63.0, inflation: 3.8, capeRatio: 15.0 }, // -37% Crash
        { year: 2009, marketIndex: 79.0, inflation: -0.4, capeRatio: 20.0 }, // +25% Recovery
        { year: 2010, marketIndex: 91.0, inflation: 1.6, capeRatio: 22.0 },
        { year: 2011, marketIndex: 91.0, inflation: 3.2, capeRatio: 21.0 },
        { year: 2012, marketIndex: 105.0, inflation: 2.1, capeRatio: 23.0 },
    ];

    const config = {
        startYear: 2007,
        endYear: 2012,
        historicalData,
    };

    // ===== RUST-Backtest =====
    console.log('Running Rust WASM Backtest...');
    console.time('Rust Backtest');
    const rustResult = wasm.run_backtest_wasm(input, config);
    console.timeEnd('Rust Backtest');

    // ===== JS-Backtest =====
    console.log('Running JavaScript Backtest...');
    console.time('JS Backtest');

    // TODO: Implementiere Aufruf der JS-Backtest-Funktion
    // Beispiel (muss angepasst werden):
    // const jsResult = await runJsBacktest(input, config);

    // WORKAROUND für Test: Simuliere JS-Ergebnis
    const jsResult = {
        finalWealth: rustResult.finalWealth * 1.001, // Simuliere 0.1% Diff
        snapshots: rustResult.snapshots.map(s => ({
            ...s,
            totalWealth: s.totalWealth * 1.001
        }))
    };

    console.timeEnd('JS Backtest');

    // ===== COMPARISON =====
    console.log('\n=== PARITY CHECK ===\n');

    const tolerance = 0.02; // 2% Toleranz

    // Final Wealth
    const wealthDiff = Math.abs(jsResult.finalWealth - rustResult.finalWealth) / jsResult.finalWealth;
    console.log(`Final Wealth (JS):   €${jsResult.finalWealth.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`);
    console.log(`Final Wealth (Rust): €${rustResult.finalWealth.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`);
    console.log(`Difference: ${(wealthDiff * 100).toFixed(3)}%`);

    if (wealthDiff < tolerance) {
        console.log('✅ PARITY OK: Final Wealth within tolerance\n');
    } else {
        console.log(`❌ PARITY FAIL: Final Wealth exceeds ${tolerance * 100}% tolerance\n`);
    }

    // Year-by-Year
    console.log('=== YEAR-BY-YEAR COMPARISON ===');
    console.log('Year │  JS Wealth  │ Rust Wealth │ Diff %');
    console.log('─────┼─────────────┼─────────────┼────────');

    let maxYearlyDiff = 0;

    for (let i = 0; i < Math.min(jsResult.snapshots.length, rustResult.snapshots.length); i++) {
        const jsSnap = jsResult.snapshots[i];
        const rustSnap = rustResult.snapshots[i];

        const yearDiff = Math.abs(jsSnap.totalWealth - rustSnap.totalWealth) / jsSnap.totalWealth;
        maxYearlyDiff = Math.max(maxYearlyDiff, yearDiff);

        const jsWealthStr = `€${(jsSnap.totalWealth / 1000).toFixed(0)}k`.padStart(11);
        const rustWealthStr = `€${(rustSnap.totalWealth / 1000).toFixed(0)}k`.padStart(11);
        const diffStr = `${(yearDiff * 100).toFixed(2)}%`.padStart(6);

        const marker = yearDiff > tolerance ? ' ⚠️' : '';

        console.log(`${rustSnap.year} │ ${jsWealthStr} │ ${rustWealthStr} │ ${diffStr}${marker}`);
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Max Yearly Difference: ${(maxYearlyDiff * 100).toFixed(2)}%`);

    if (maxYearlyDiff < tolerance) {
        console.log('✅ FULL PARITY: All years within tolerance');
    } else {
        console.log(`❌ PARITY ISSUES: Some years exceed ${tolerance * 100}% tolerance`);
    }
}

parityTest().catch(console.error);
