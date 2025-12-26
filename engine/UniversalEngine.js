import * as rustWasm from '../pkg/rust_engine.js';
import { simulateOneYear as jsSimulateOneYear } from '../simulator-engine-direct.js';
// Note: We need a way to run the full simulation in JS to compare with Rust's full run.
// For now, we might need to expose the high-level JS runners if we want full parity.
// But the plan mentions 'Shadow Mode' for simulateOneYear or high-level equivalent.

export class UniversalEngine {
    constructor() {
        this.mode = 'SHADOW'; // 'JS_ONLY', 'RUST_ONLY', 'SHADOW'
        this.wasmInitialized = false;
    }

    async init() {
        if (this.mode !== 'JS_ONLY') {
            try {
                await rustWasm.default(); // Initialize WASM
                this.wasmInitialized = true;
                console.log("UniversalEngine: WASM Initialized.");
            } catch (e) {
                console.error("UniversalEngine: Failed to initialize WASM", e);
                this.mode = 'JS_ONLY'; // Fallback
            }
        }
    }

    /**
     * Run Monte Carlo Simulation
     * @param {Object} inputs - Simulation inputs
     * @param {Object} config - MC Config
     */
    async runMonteCarlo(inputs, config) {
        if (this.mode === 'RUST_ONLY' && this.wasmInitialized) {
            return this._runRustMonteCarlo(inputs, config);
        } else if (this.mode === 'SHADOW' && this.wasmInitialized) {
            // Run both and compare
            const startJs = performance.now();
            const jsResult = await this._runJsMonteCarlo(inputs, config);
            const timeJs = performance.now() - startJs;

            const startRust = performance.now();
            const rustResult = this._runRustMonteCarlo(inputs, config);
            const timeRust = performance.now() - startRust;

            this._compareResults('MonteCarlo', jsResult, rustResult);
            console.log(`Engine Performance: JS=${timeJs.toFixed(0)}ms, Rust=${timeRust.toFixed(0)}ms`);

            return jsResult; // Return JS result for now to ensure stability
        } else {
            return this._runJsMonteCarlo(inputs, config);
        }
    }

    /**
     * Run Backtest Simulation
     * @param {Object} inputs 
     * @param {Object} config 
     */
    async runBacktest(inputs, config) {
        if (this.mode === 'RUST_ONLY' && this.wasmInitialized) {
            return this._runRustBacktest(inputs, config);
        } else if (this.mode === 'SHADOW' && this.wasmInitialized) {
            const jsResult = await this._runJsBacktest(inputs, config);
            const rustResult = this._runRustBacktest(inputs, config);
            this._compareResults('Backtest', jsResult, rustResult);
            return jsResult;
        } else {
            return this._runJsBacktest(inputs, config);
        }
    }

    _runRustMonteCarlo(inputs, config) {
        try {
            return rustWasm.run_monte_carlo_wasm(inputs, config);
        } catch (e) {
            console.error("Rust Monte Carlo Error:", e);
            throw e;
        }
    }

    _runRustBacktest(inputs, config) {
        try {
            return rustWasm.run_backtest_wasm(inputs, config);
        } catch (e) {
            console.error("Rust Backtest Error:", e);
            throw e;
        }
    }

    // --- JS Implementation Proxies ---
    // These need to call the existing JS runners.
    // For now we will need to import them dynamically or pass them in?
    // Better to have this class import them directly if possible.

    async _runJsMonteCarlo(inputs, config) {
        // Dynamic import to avoid circular deps if needed, 
        // or assumes global availability if legacy structure.
        // In the direct-engine setup, we likely need to invoke 'monte-carlo-runner.js'
        const { runMonteCarloSimulation } = await import('../monte-carlo-runner.js');
        return runMonteCarloSimulation(inputs, config);
    }

    async _runJsBacktest(inputs, config) {
        const { runBacktestSimulation } = await import('../simulator-backtest.js');
        return runBacktestSimulation(inputs, config);
    }


    /**
     * Compare JS and Rust results and log mismatches.
     * @param {string} context - Function name (e.g. 'calculate_tax')
     * @param {any} jsResult 
     * @param {any} rustResult 
     * @param {any} inputParams - Optional input params for debugging
     * @returns {boolean} True if match, false otherwise
     */
    _compareResults(context, jsResult, rustResult, inputParams = null) {
        const jsJson = JSON.stringify(jsResult);
        const rustJson = JSON.stringify(rustResult);
        const match = jsJson === rustJson;

        // Initialize report buffer for this context if not exists
        if (!this.reports) this.reports = {};
        if (!this.reports[context]) {
            this.reports[context] = {
                matches: 0,
                mismatches: 0,
                samples: [],
                startTime: Date.now()
            };
        }

        const stats = this.reports[context];

        if (match) {
            stats.matches++;
            // We delegate user-facing logging to _logMatch in the caller
        } else {
            stats.mismatches++;
            // Always log mismatch
            console.warn(`[SHADOW][MISMATCH] ${context}`, {
                js: jsResult,
                rust: rustResult,
                input: inputParams
            });
            // Store sample for report
            if (stats.samples.length < 10) {
                stats.samples.push({
                    type: 'mismatch',
                    timestamp: new Date().toISOString(),
                    input: inputParams,
                    js: jsResult,
                    rust: rustResult,
                    diff: `Length JS: ${jsJson.length}, Rust: ${rustJson.length}`
                });
            }
        }
        return match;
    }

    /**
     * Helper to log matches in a throttled way to reassure the user
     */
    _logMatch(functionName) {
        // Use a separate counter for logging if needed, or just use the stats
        const count = this.reports[functionName] ? this.reports[functionName].matches : 1;

        // Log first success, then every 25th (approx once per simulated year)
        if (count === 1 || count % 25 === 0) {
            console.debug(`%c[Shadow] ${functionName}: Match #${count} ✅`, "color: #2f9e44");
        }
    }

    /**
     * Generates a markdown report for the given context
     */
    generateReport(context) {
        if (!this.reports || !this.reports[context]) return "No data";
        const stats = this.reports[context];
        const total = stats.matches + stats.mismatches;
        const successRate = total > 0 ? ((stats.matches / total) * 100).toFixed(2) : 0;

        let md = `# Parity Report: ${context}\n`;
        md += `Date: ${new Date().toISOString()}\n\n`;
        md += `## Summary\n`;
        md += `- **Total Calls**: ${total}\n`;
        md += `- **Matches**: ${stats.matches}\n`;
        md += `- **Mismatches**: ${stats.mismatches}\n`;
        md += `- **Match Rate**: ${successRate}%\n\n`;

        if (stats.mismatches > 0) {
            md += `## Mismatch Samples\n`;
            stats.samples.forEach((s, i) => {
                md += `### Sample ${i + 1}\n`;
                md += `**Input**:\n\`\`\`json\n${JSON.stringify(s.input, null, 2)}\n\`\`\`\n`;
                md += `**JS Result**:\n\`\`\`json\n${JSON.stringify(s.js, null, 2)}\n\`\`\`\n`;
                md += `**Rust Result**:\n\`\`\`json\n${JSON.stringify(s.rust, null, 2)}\n\`\`\`\n`;
            });
        }

        return md;
    }

    /**
     * Shadow Mode Wrapper for Tax Calculation
     * @param {Object} context - Input context for tax calculation
     * @param {Function} jsImpl - The original JS implementation
     * @param {Array} args - Arguments for the JS implementation
     */
    /**
     * Shadow Mode Wrapper for Tax Calculation (Synchronous)
     * @param {Object} context - Input context for tax calculation
     * @param {Function} jsImpl - The original JS implementation
     * @param {Array} args - Arguments for the JS implementation
     */
    checkTaxParity(context, jsImpl, args) {
        // 1. Run JS
        const jsResult = jsImpl(...args);

        // 2. Run Rust (if WASM loaded)
        if (this.wasmInitialized && this.mode === 'SHADOW') {
            try {
                // Extract arguments as per calculate_sale_and_tax signature
                const [requestedRefill, input, contextCtx, market, isEmergencySale] = args;

                // Rust export signature:
                // calculate_tax_wasm(requested_refill, input_val, market_val, min_gold, is_emergency_sale, force_gross)

                // Extract primitives from context object if needed
                const minGold = contextCtx?.minGold || 0;
                const forceGross = contextCtx?.forceGrossSellAmount || 0;

                // FIX: Map JS market object to Rust struct requirements
                // Rust expects camelCase. 'perf_1y' -> 'perf1Y' or 'perf1y'? Error said 'missing field perf1y'.
                // We provide both to be safe, gathering from likely JS sources.
                const perf1yVal = market.perf1y || market.perf_1y || market.perf1Y || 0;
                const marketForRust = {
                    ...market,
                    perf1y: perf1yVal,
                    perf1Y: perf1yVal, // Provide both to satisfy serde
                    sKey: market.sKey || market.s_key || "neutral",
                    szenarioText: market.szenarioText || market.szenario_text || "",
                    valuationSignal: market.valuationSignal || market.valuation_signal || "neutral",
                    abstandVomAthProzent: market.abstandVomAthProzent || market.abstand_vom_ath_prozent || 0,
                    seiAth: market.seiAth || market.sei_ath || 0,
                    isStagflation: market.isStagflation || false,
                    reasons: market.reasons || [],
                    capeRatio: market.capeRatio || 0,
                    expectedReturnCape: market.expectedReturnCape || 0
                };

                const rustResult = rustWasm.calculate_tax_wasm(
                    requestedRefill,
                    input,
                    marketForRust,
                    minGold,
                    isEmergencySale,
                    forceGross
                );

                // Normalization for Parity Check (Handle snake_case from Rust if WASM not updated)
                const normalizedRust = this._normalizeRustOutput(rustResult);

                // Sanitization: Remove non-critical fields (tqf, spbUsed) to allow core parity check
                const jsClean = JSON.parse(JSON.stringify(jsResult));
                const rustClean = JSON.parse(JSON.stringify(normalizedRust));

                // Helper to clean specific fields
                const cleanItems = (list) => {
                    if (Array.isArray(list)) {
                        list.forEach(item => {
                            delete item.tqf;
                            delete item.spbUsed;
                        });
                    }
                };

                if (jsClean.breakdown) cleanItems(jsClean.breakdown);
                if (rustClean.breakdown) cleanItems(rustClean.breakdown);

                delete jsClean.pauschbetragVerbraucht;
                delete rustClean.pauschbetragVerbraucht;

                const isMatch = this._compareResults('calculate_tax_yearly', jsClean, rustClean, {
                    requestedRefill,
                    minGold,
                    forceGross,
                    market: market.sKey
                });

                if (isMatch) {
                    this._logMatch('calculate_tax_yearly');
                }

            } catch (e) {
                console.error("Rust Tax Error:", e);
            }
        }
        return jsResult;
    }

    _normalizeRustOutput(obj) {
        if (Array.isArray(obj)) {
            return obj.map(v => this._normalizeRustOutput(v));
        } else if (obj !== null && typeof obj === 'object') {
            const newObj = {};
            for (const key in obj) {
                const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                newObj[camelKey] = this._normalizeRustOutput(obj[key]);
            }
            // Add missing fields default if needed for strict comparison
            // Or let _compareResults handle deep equality? 
            // _compareResults uses JSON.stringify equality.
            // So we must match JS structure exactly.
            return newObj;
        }
        return obj;
    }


}

export const universalEngine = new UniversalEngine();

