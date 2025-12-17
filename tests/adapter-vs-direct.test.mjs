/**
 * ===================================================================
 * ADAPTER VS DIRECT API - COMPARISON TEST SUITE
 * ===================================================================
 * Vergleicht simulator-engine.js (mit Adapter) gegen
 * simulator-engine-direct.js (ohne Adapter, direkter EngineAPI-Zugriff)
 * ===================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EngineAPI, _internal_calculateModel } from '../engine/core.mjs';
import { Ruhestandsmodell_v30 } from '../engine/adapter.mjs';
import { simulateOneYear as simulateOneYearAdapter } from '../simulator-engine.js';
import { simulateOneYear as simulateOneYearDirect } from '../simulator-engine-direct.js';
import { initializePortfolio } from '../simulator-portfolio.js';
import { HISTORICAL_DATA } from '../simulator-data.js';

// Setup global APIs für beide Varianten (direkt beim Import)
global.window = {
    Ruhestandsmodell_v30: Ruhestandsmodell_v30,
    EngineAPI: EngineAPI
};

/**
 * Erstellt yearData aus HISTORICAL_DATA
 */
function getYearData(year = 1980) {
    const historicalEntry = HISTORICAL_DATA[year];
    if (!historicalEntry) {
        // Fallback auf erstes verfügbares Jahr
        const firstYear = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b)[0];
        return getYearData(firstYear);
    }

    return {
        jahr: year,
        rendite: historicalEntry.rendite_msci_eur || 0,
        gold_eur_perf: historicalEntry.gold_eur_perf || 0,
        inflation: historicalEntry.inflation_de || 2.0,
        zinssatz: historicalEntry.zinssatz_1y || 2.0,
        regime: historicalEntry.regime || 'SIDEWAYS',
        capeRatio: historicalEntry.cape_ratio || 25,
        lohn: historicalEntry.lohn_de || 2.0
    };
}

/**
 * Erstellt Standard-Test-Inputs
 */
function createStandardInputs(overrides = {}) {
    return {
        startAlter: 65,
        startFloorBedarf: 24000,
        startFlexBedarf: 12000,
        startVermoegen: 500000,
        renteMonatlich: 1500,
        renteAktiv: true,
        renteStartOffsetJahre: 0,
        rentAdjPct: 1.5,
        targetEq: 60,
        goldAktiv: true,
        goldZielProzent: 10,
        goldFloorProzent: 5,
        risikoprofil: 'balanced',
        runwayTargetMonths: 36,
        runwayMinMonths: 24,
        zielLiquiditaet: 72000,
        partner: {
            aktiv: false,
            brutto: 0,
            startInJahren: 0,
            steuerquotePct: 0
        },
        accumulationPhase: {
            enabled: false
        },
        pflegefallLogikAktivieren: false,
        ...overrides
    };
}

/**
 * Erstellt Standard-State
 */
function createStandardState(inputs) {
    const portfolio = initializePortfolio(inputs);
    return {
        portfolio,
        baseFloor: inputs.startFloorBedarf,
        baseFlex: inputs.startFlexBedarf,
        lastState: null,
        currentAnnualPension: inputs.renteMonatlich * 12,
        currentAnnualPension2: 0,
        marketDataHist: {
            endeVJ: 1000,
            endeVJ_1: 950,
            endeVJ_2: 900,
            endeVJ_3: 850,
            ath: 1100,
            jahreSeitAth: 2,
            inflation: 2.0,
            capeRatio: 25
        },
        samplerState: {},
        widowPensionP1: 0,
        widowPensionP2: 0,
        accumulationState: null,
        transitionYear: 0
    };
}

/**
 * Vergleicht zwei Simulationsergebnisse
 */
function compareResults(adapterResult, directResult, scenario, tolerancePct = 1) {
    const errors = [];

    // Prüfe auf Ruin
    if (adapterResult.isRuin !== directResult.isRuin) {
        errors.push(`RUIN mismatch: Adapter=${adapterResult.isRuin}, Direct=${directResult.isRuin}`);
    }

    if (adapterResult.isRuin || directResult.isRuin) {
        return errors; // Bei Ruin keine weiteren Vergleiche
    }

    // Vergleiche kritische Felder
    const compareField = (field, path, isCurrency = true) => {
        const adapterVal = getNestedValue(adapterResult, path);
        const directVal = getNestedValue(directResult, path);

        if (adapterVal === undefined && directVal === undefined) return;
        if (adapterVal === null && directVal === null) return;

        if (isCurrency) {
            const diff = Math.abs(adapterVal - directVal);
            const avg = (Math.abs(adapterVal) + Math.abs(directVal)) / 2;
            const diffPct = avg > 0 ? (diff / avg) * 100 : 0;

            if (diffPct > tolerancePct && diff > 1) { // Ignoriere Rundungsdifferenzen < 1€
                errors.push(`${field}: Adapter=${adapterVal.toFixed(2)}€, Direct=${directVal.toFixed(2)}€, Diff=${diffPct.toFixed(2)}%`);
            }
        } else {
            if (adapterVal !== directVal) {
                errors.push(`${field}: Adapter=${adapterVal}, Direct=${directVal}`);
            }
        }
    };

    // Liquidität
    compareField('Liquidität', 'newState.portfolio.liquiditaet');
    compareField('Log Liquidität', 'logData.liquiditaet');

    // Jahresentnahme
    compareField('Jahresentnahme', 'logData.entscheidung.jahresEntnahme');
    compareField('Monatliche Entnahme', 'logData.entscheidung.monatlicheEntnahme');

    // Depotwerte
    compareField('Wert Aktien', 'logData.wertAktien');
    compareField('Wert Gold', 'logData.wertGold');

    // Steuern
    compareField('Steuern gesamt', 'logData.steuern_gesamt');
    compareField('Steuern total', 'totalTaxesThisYear');

    // Verkäufe
    compareField('VK Aktien', 'logData.vk.vkAkt');
    compareField('VK Gold', 'logData.vk.vkGld');

    // Käufe
    compareField('Kauf Aktien', 'logData.kaufAkt');
    compareField('Kauf Gold', 'logData.kaufGld');

    // Kürzungen
    compareField('Kürzung %', 'logData.entscheidung.kuerzungProzent', false);
    compareField('FlexRate', 'logData.FlexRatePct', false);

    // Alarm & Regime
    compareField('Alarm', 'logData.Alarm', false);
    compareField('Regime', 'logData.Regime', false);

    // Runway
    compareField('Runway Months', 'logData.entscheidung.runwayMonths', false);

    // Inflation Factor
    compareField('Inflation Factor', 'logData.inflation_factor_cum', false);

    // Next State
    compareField('Next Base Floor', 'newState.baseFloor');
    compareField('Next Base Flex', 'newState.baseFlex');

    return errors;
}

/**
 * Hilfsfunktion zum Zugriff auf verschachtelte Werte
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Führt beide Simulationen aus und vergleicht sie
 */
async function runComparison(scenario, inputs, state, yearData, yearIndex, options = {}) {
    const {
        pflegeMeta = null,
        careFloorAddition = 0,
        householdContext = null,
        temporaryFlexFactor = 1.0
    } = options;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`Scenario: ${scenario}`);
    console.log(`${'='.repeat(70)}`);

    // Deep clone state für beide Tests (strukturelle Klone statt JSON)
    const stateAdapter = structuredClone(state);
    const stateDirect = structuredClone(state);

    // Messung Adapter-Version
    const startAdapter = performance.now();
    const resultAdapter = simulateOneYearAdapter(
        stateAdapter,
        inputs,
        yearData,
        yearIndex,
        pflegeMeta,
        careFloorAddition,
        householdContext,
        temporaryFlexFactor,
        global.window.Ruhestandsmodell_v30 // Adapter explizit übergeben
    );
    const timeAdapter = performance.now() - startAdapter;

    // Messung Direct-Version
    const startDirect = performance.now();
    const resultDirect = simulateOneYearDirect(
        stateDirect,
        inputs,
        yearData,
        yearIndex,
        pflegeMeta,
        careFloorAddition,
        householdContext,
        temporaryFlexFactor,
        global.window.EngineAPI // EngineAPI direkt übergeben
    );
    const timeDirect = performance.now() - startDirect;

    // Vergleiche Ergebnisse
    const errors = compareResults(resultAdapter, resultDirect, scenario);

    // Performance-Vergleich
    const speedup = ((timeAdapter - timeDirect) / timeAdapter) * 100;
    console.log(`\nPerformance:`);
    console.log(`  Adapter: ${timeAdapter.toFixed(3)}ms`);
    console.log(`  Direct:  ${timeDirect.toFixed(3)}ms`);
    console.log(`  Speedup: ${speedup > 0 ? '+' : ''}${speedup.toFixed(1)}%`);

    // Ergebnisse
    if (errors.length === 0) {
        console.log(`\n✅ Results match perfectly!`);
    } else {
        console.log(`\n⚠️  Found ${errors.length} differences:`);
        errors.forEach(err => console.log(`  - ${err}`));
    }

    return {
        scenario,
        passed: errors.length === 0,
        errors,
        performance: {
            adapter: timeAdapter,
            direct: timeDirect,
            speedup: speedup
        },
        results: {
            adapter: resultAdapter,
            direct: resultDirect
        }
    };
}

// ===================================================================
// TEST SCENARIOS
// ===================================================================

describe('Adapter vs Direct API Comparison', () => {

    it('Test 1: Standard Scenario (normale Entnahme)', async () => {
        const inputs = createStandardInputs();
        const state = createStandardState(inputs);
        const yearData = getYearData(1980);

        const result = await runComparison(
            'Standard Scenario',
            inputs,
            state,
            yearData,
            0
        );

        assert.strictEqual(result.passed, true, `Test failed with ${result.errors.length} differences`);
    });

    it('Test 2: Zero Floor (Rente deckt Floor komplett)', async () => {
        const inputs = createStandardInputs({
            startFloorBedarf: 18000,
            renteMonatlich: 1500 // 18k/Jahr = komplett gedeckt
        });
        const state = createStandardState(inputs);
        const yearData = getYearData(1980);

        const result = await runComparison(
            'Zero Floor (Pension covers all)',
            inputs,
            state,
            yearData,
            0
        );

        assert.strictEqual(result.passed, true, `Test failed with ${result.errors.length} differences`);
    });

    it('Test 3: High Pension Surplus (Überschussrente)', async () => {
        const inputs = createStandardInputs({
            startFloorBedarf: 12000,
            startFlexBedarf: 12000,
            renteMonatlich: 2500 // 30k/Jahr > 24k Gesamt
        });
        const state = createStandardState(inputs);
        const yearData = getYearData(1980);

        const result = await runComparison(
            'High Pension Surplus',
            inputs,
            state,
            yearData,
            0
        );

        assert.strictEqual(result.passed, true, `Test failed with ${result.errors.length} differences`);
    });

    it('Test 4: Bear Market (Crash Szenario)', async () => {
        const inputs = createStandardInputs();
        const state = createStandardState(inputs);
        // Verwende ein schlechtes Jahr (z.B. 2008-ähnlich)
        const yearData = {
            jahr: 2008,
            rendite: -0.40, // -40%
            gold_eur_perf: 15,
            inflation: 2.5,
            zinssatz: 2.0,
            regime: 'BEAR',
            capeRatio: 15
        };

        const result = await runComparison(
            'Bear Market Crash',
            inputs,
            state,
            yearData,
            0
        );

        assert.strictEqual(result.passed, true, `Test failed with ${result.errors.length} differences`);
    });

    it('Test 5: Bull Market (Hausse)', async () => {
        const inputs = createStandardInputs();
        const state = createStandardState(inputs);
        const yearData = {
            jahr: 1995,
            rendite: 0.30, // +30%
            gold_eur_perf: -5,
            inflation: 1.5,
            zinssatz: 3.0,
            regime: 'BULL',
            capeRatio: 35
        };

        const result = await runComparison(
            'Bull Market',
            inputs,
            state,
            yearData,
            0
        );

        assert.strictEqual(result.passed, true, `Test failed with ${result.errors.length} differences`);
    });

    it('Test 6: Low Liquidity (kritischer Runway)', async () => {
        const inputs = createStandardInputs({
            startVermoegen: 500000,
            zielLiquiditaet: 72000
        });
        const state = createStandardState(inputs);
        // Setze Liquidität sehr niedrig
        state.portfolio.liquiditaet = 15000; // Nur ~7 Monate Runway

        const yearData = getYearData(1980);

        const result = await runComparison(
            'Low Liquidity Emergency',
            inputs,
            state,
            yearData,
            0
        );

        assert.strictEqual(result.passed, true, `Test failed with ${result.errors.length} differences`);
    });

    it('Test 7: High Liquidity (Überschuss-Rebalancing)', async () => {
        const inputs = createStandardInputs();
        const state = createStandardState(inputs);
        // Setze Liquidität sehr hoch
        state.portfolio.liquiditaet = 150000; // Weit über Ziel

        const yearData = getYearData(1980);

        const result = await runComparison(
            'High Liquidity Rebalancing',
            inputs,
            state,
            yearData,
            0
        );

        assert.strictEqual(result.passed, true, `Test failed with ${result.errors.length} differences`);
    });

    it('Test 8: No Gold (nur Aktien)', async () => {
        const inputs = createStandardInputs({
            goldAktiv: false,
            targetEq: 70
        });
        const state = createStandardState(inputs);
        state.portfolio.depotTranchesGold = []; // Kein Gold

        const yearData = getYearData(1980);

        const result = await runComparison(
            'No Gold Portfolio',
            inputs,
            state,
            yearData,
            0
        );

        assert.strictEqual(result.passed, true, `Test failed with ${result.errors.length} differences`);
    });

    it('Test 9: Partner aktiv (Zweipersonenhaushalt)', async () => {
        const inputs = createStandardInputs({
            partner: {
                aktiv: true,
                brutto: 12000,
                startInJahren: 0,
                steuerquotePct: 15
            }
        });
        const state = createStandardState(inputs);
        state.currentAnnualPension2 = 12000;

        const yearData = getYearData(1980);

        const result = await runComparison(
            'Partner Active (Couple)',
            inputs,
            state,
            yearData,
            0
        );

        assert.strictEqual(result.passed, true, `Test failed with ${result.errors.length} differences`);
    });

    it('Test 10: Multi-Year Simulation (5 Jahre)', async () => {
        const inputs = createStandardInputs();
        let stateAdapter = createStandardState(inputs);
        let stateDirect = createStandardState(inputs);

        const allErrors = [];
        let totalSpeedupPct = 0;

        console.log(`\n${'='.repeat(70)}`);
        console.log(`Multi-Year Simulation (5 Years)`);
        console.log(`${'='.repeat(70)}`);

        for (let year = 0; year < 5; year++) {
            const yearData = getYearData(1980 + year);

            // Adapter
            const startAdapter = performance.now();
            const resultAdapter = simulateOneYearAdapter(
                stateAdapter,
                inputs,
                yearData,
                year,
                null, 0, null, 1.0,
                global.window.Ruhestandsmodell_v30
            );
            const timeAdapter = performance.now() - startAdapter;

            // Direct
            const startDirect = performance.now();
            const resultDirect = simulateOneYearDirect(
                stateDirect,
                inputs,
                yearData,
                year,
                null, 0, null, 1.0,
                global.window.EngineAPI
            );
            const timeDirect = performance.now() - startDirect;

            const speedup = ((timeAdapter - timeDirect) / timeAdapter) * 100;
            totalSpeedupPct += speedup;

            const errors = compareResults(resultAdapter, resultDirect, `Year ${year + 1}`);

            console.log(`\nYear ${year + 1}:`);
            console.log(`  Adapter: ${timeAdapter.toFixed(3)}ms`);
            console.log(`  Direct:  ${timeDirect.toFixed(3)}ms`);
            console.log(`  Speedup: ${speedup > 0 ? '+' : ''}${speedup.toFixed(1)}%`);
            console.log(`  Errors:  ${errors.length}`);

            if (errors.length > 0) {
                allErrors.push(...errors.map(e => `Year ${year + 1}: ${e}`));
            }

            // Update states für nächstes Jahr
            if (!resultAdapter.isRuin) stateAdapter = resultAdapter.newState;
            if (!resultDirect.isRuin) stateDirect = resultDirect.newState;
        }

        const avgSpeedup = totalSpeedupPct / 5;
        console.log(`\n📊 Average Speedup over 5 years: ${avgSpeedup > 0 ? '+' : ''}${avgSpeedup.toFixed(1)}%`);

        if (allErrors.length === 0) {
            console.log(`✅ All 5 years match perfectly!`);
        } else {
            console.log(`⚠️  Total differences across 5 years: ${allErrors.length}`);
        }

        assert.strictEqual(allErrors.length, 0, `Multi-year test failed with ${allErrors.length} differences`);
    });

});

// ===================================================================
// PERFORMANCE BENCHMARK SUITE
// ===================================================================

describe('Performance Benchmarks', () => {

    it('Benchmark: 100 Standard Years (Adapter)', async () => {
        const inputs = createStandardInputs();
        const state = createStandardState(inputs);
        const yearData = getYearData(1980);

        const start = performance.now();
        for (let i = 0; i < 100; i++) {
            simulateOneYearAdapter(
                structuredClone(state),
                inputs,
                yearData,
                0,
                null, 0, null, 1.0,
                global.window.Ruhestandsmodell_v30
            );
        }
        const time = performance.now() - start;

        console.log(`\n⏱️  Adapter: 100 iterations in ${time.toFixed(2)}ms (${(time/100).toFixed(3)}ms/iter)`);
    });

    it('Benchmark: 100 Standard Years (Direct)', async () => {
        const inputs = createStandardInputs();
        const state = createStandardState(inputs);
        const yearData = getYearData(1980);

        const start = performance.now();
        for (let i = 0; i < 100; i++) {
            simulateOneYearDirect(
                structuredClone(state),
                inputs,
                yearData,
                0,
                null, 0, null, 1.0,
                global.window.EngineAPI
            );
        }
        const time = performance.now() - start;

        console.log(`\n⏱️  Direct: 100 iterations in ${time.toFixed(2)}ms (${(time/100).toFixed(3)}ms/iter)`);
    });

});
