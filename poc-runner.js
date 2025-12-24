import { loadWasm } from './load-wasm.mjs';

async function runTest() {
    console.log('--- Starting Rust Core Port Test ---');

    try {
        const wasm = await loadWasm();

        // 1. Valid Input
        const input = {
            aktuellesAlter: 40, // Changed from camelCase map in Rust
            risikoprofil: "wachstum",
            inflation: 2.0,
            tagesgeld: 10000.0,
            geldmarktEtf: 0.0,
            aktuelleLiquiditaet: 10000.0, // optional
            depotwertAlt: 50000.0,
            depotwertNeu: 0.0,
            goldAktiv: false,
            goldWert: 0.0,
            goldCost: 0.0,
            goldZielProzent: 0.0,
            goldFloorProzent: 0.0,
            floorBedarf: 24000.0,
            flexBedarf: 6000.0,
            renteAktiv: false,
            renteMonatlich: 0.0,
            costBasisAlt: 40000.0,
            costBasisNeu: 0.0,
            sparerPauschbetrag: 1000.0,
            endeVJ: 100.0,
            endeVJ_1: 95.0,
            endeVJ_2: 90.0,
            endeVJ_3: 85.0,
            ath: 105.0,
            jahreSeitAth: 1, // New field
            capeRatio: 25.0, // New field, optional
            runwayMinMonths: 24.0,
            runwayTargetMonths: 36.0,
            targetEq: 80.0,
            rebalBand: 5.0,
            maxSkimPctOfEq: 10.0,
            maxBearRefillPctOfEq: 20.0,
        };

        console.log('Testing Valid Input...');
        const result = wasm.run_simulation_poc(input);
        // Parse UI string back to object
        if (typeof result.ui === 'string') {
            try {
                result.ui = JSON.parse(result.ui);
            } catch (e) {
                console.error("Failed to parse UI JSON string:", e);
            }
        }

        console.log('Valid Result FULL:', JSON.stringify(result, null, 2));
        console.log('Valid Result flexRate:', result.ui.flexRate);
        console.log('Valid Result Liquidität:', result.ui.liquiditaet);

        // 2. Invalid Input (Age > 120)
        console.log('\nTesting Invalid Input (Age 150)...');
        input.aktuellesAlter = 150;
        try {
            wasm.run_simulation_poc(input);
            console.error('❌ FAILURE: Validation should have failed!');
        } catch (e) {
            console.log('✅ SUCCESS: Validation caught error:', e);
        }

    } catch (e) {
        console.error('❌ ERROR:', e);
    }
}

runTest();
