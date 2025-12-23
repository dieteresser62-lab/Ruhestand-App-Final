import { loadWasm } from './load-wasm.mjs';

async function runTest() {
    console.log('--- Starting Rust PoC Test ---');

    try {
        const wasm = await loadWasm();

        const input = {
            value: 42.5,
            iterations: 1000
        };

        console.log('JS Input:', input);

        // Measure execution time (just for fun, though overhead dominates here)
        const start = performance.now();
        const result = wasm.run_simulation_poc(input);
        const end = performance.now();

        console.log('Rust Output:', result);
        console.log(`Execution time (incl. marshalling): ${(end - start).toFixed(3)}ms`);

        if (result.result === 85.0) {
            console.log('✅ SUCCESS: Calculation correct (42.5 * 2 = 85.0)');
        } else {
            console.error('❌ FAILURE: Incorrect calculation result.');
        }

    } catch (e) {
        console.error('❌ ERROR:', e);
    }
}

runTest();
