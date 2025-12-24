let wasmModule = null;

export async function initRustEngine() {
    if (wasmModule) return wasmModule;

    // In Node (tests), we might load file directly. In Browser, valid URL.
    // This adapter acts as abstract layer.
    // For Web App usage, we expect standard import.

    // Note: This path depends on where the bundler puts the pkg
    // For Vite/Webpack, usually direct import works if wasm-pack plugin used.
    // Or dynamic import. 
    // Assuming standard dynamic import for module.

    try {
        const wasm = await import('../../pkg/rust_engine.js');
        await wasm.default(); // Initialize WASM

        wasmModule = {
            runSimulation: (input) => {
                const result = wasm.run_simulation_poc(input);
                return {
                    ...result,
                    ui: JSON.parse(result.ui),
                };
            },

            runBacktest: (input, config) => {
                return wasm.run_backtest_wasm(input, config);
            },

            runMonteCarlo: (input, config) => {
                return wasm.run_monte_carlo_wasm(input, config);
            },
        };
    } catch (e) {
        console.error("Failed to load Rust/WASM Engine:", e);
        throw e;
    }

    return wasmModule;
}
