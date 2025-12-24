
import { loadWasm } from './load-wasm.mjs';

async function testBacktest() {
    console.log('=== Rust Backtest Test ===\n');

    const wasm = await loadWasm();

    // Historische S&P 500 Daten (vereinfacht, normalisiert auf 2010=100)
    const historicalData = [
        { year: 2010, marketIndex: 100.0, inflation: 1.6, capeRatio: 21.5 },
        { year: 2011, marketIndex: 100.0, inflation: 3.2, capeRatio: 22.3 },
        { year: 2012, marketIndex: 113.5, inflation: 2.1, capeRatio: 23.1 },
        { year: 2013, marketIndex: 147.1, inflation: 1.5, capeRatio: 25.2 },
        { year: 2014, marketIndex: 163.8, inflation: 1.6, capeRatio: 26.8 },
        { year: 2015, marketIndex: 162.5, inflation: 0.1, capeRatio: 26.5 },
        { year: 2016, marketIndex: 178.1, inflation: 1.3, capeRatio: 27.9 },
        { year: 2017, marketIndex: 212.7, inflation: 2.1, capeRatio: 31.4 },
        { year: 2018, marketIndex: 199.5, inflation: 2.4, capeRatio: 28.2 },
        { year: 2019, marketIndex: 257.0, inflation: 1.8, capeRatio: 31.2 },
        { year: 2020, marketIndex: 298.8, inflation: 1.2, capeRatio: 33.4 },
    ];

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

    const config = {
        startYear: 2010,
        endYear: 2020,
        historicalData,
    };

    console.log('Running Backtest (2010-2020)...\n');
    console.time('Backtest Duration');

    try {
        const result = wasm.run_backtest_wasm(input, config);
        console.timeEnd('Backtest Duration');

        console.log('\n=== SUMMARY ===');
        console.log(`✅ Success: ${result.success}`);
        console.log(`📅 Years Simulated: ${result.yearsSimulated}`);
        console.log(`💰 Start Wealth: €${(100000 + 800000 + 100000).toLocaleString('de-DE')}`);
        console.log(`💰 Final Wealth: €${result.finalWealth.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
        console.log(`📊 Min Wealth: €${result.minWealth.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
        console.log(`📊 Max Wealth: €${result.maxWealth.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
        console.log(`💸 Total Withdrawals: €${result.totalWithdrawals.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
        console.log(`📉 Avg Flex Rate: ${result.avgFlexRate.toFixed(1)}%`);

        if (result.portfolioDepletedAtAge) {
            console.log(`⚠️  Portfolio depleted at age ${result.portfolioDepletedAtAge}`);
        }

        console.log('\n=== YEARLY SNAPSHOTS ===');
        console.log('Year │ Age │   Wealth   │ Flex% │    Scenario     │ Action');
        console.log('─────┼─────┼────────────┼───────┼─────────────────┼──────────');

        result.snapshots.forEach(snap => {
            const wealthStr = `€${(snap.totalWealth / 1000).toFixed(0)}k`.padStart(10);
            const flexStr = `${snap.flexRate.toFixed(0)}%`.padStart(5);
            const scenarioStr = snap.marketScenario.padEnd(15);
            const actionStr = snap.transactionType === 'TRANSACTION'
                ? (snap.refillAmount > 0 ? `Refill €${(snap.refillAmount / 1000).toFixed(0)}k` : 'Invest')
                : 'None';

            console.log(`${snap.year} │ ${snap.age}  │ ${wealthStr} │ ${flexStr} │ ${scenarioStr} │ ${actionStr}`);

            // Asset Details (enabled for verification)
            console.log(`      Assets: Alt €${(snap.depotAlt / 1000).toFixed(0)}k, Neu €${(snap.depotNeu / 1000).toFixed(0)}k, Gold €${(snap.goldValue / 1000).toFixed(0)}k`);
        });

        console.log('\n✅ Test completed successfully!');

    } catch (e) {
        console.error('\n❌ ERROR:', e);
        process.exit(1);
    }
}

testBacktest();
