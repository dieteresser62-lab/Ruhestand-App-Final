<script lang="ts">
    import { onMount } from 'svelte';
    import {
        initEngine,
        getEngine,
        engineLoading,
        engineReady,
        engineError,
        monteCarloResult
    } from '$lib/stores/engine';
    import { getReturnsForMC } from '$lib/historical-data';
    import type { MonteCarloConfig, SimulationInput } from '$lib/types/rust-engine';

    export let input: SimulationInput;

    let numSimulations = 5000;
    let yearsToSimulate = 30;
    let isRunning = false;
    let duration = 0;

    onMount(async () => {
        await initEngine();
    });

    async function runMonteCarlo() {
        if (!$engineReady) return;

        isRunning = true;
        const start = performance.now();

        try {
            const { returns, inflation } = getReturnsForMC(1950, 2023);

            const config: MonteCarloConfig = {
                numSimulations,
                yearsToSimulate,
                historicalReturns: returns,
                historicalInflation: inflation,
            };

            const engine = getEngine();
            const result = engine.runMonteCarlo(input, config);

            duration = performance.now() - start;
            monteCarloResult.set(result);

        } catch (e) {
            console.error('Monte Carlo failed:', e);
        } finally {
            isRunning = false;
        }
    }
</script>

<div class="monte-carlo-panel">
    <h3>Monte Carlo Simulation</h3>

    {#if $engineLoading}
        <p>🔄 Engine wird geladen...</p>
    {:else if $engineError}
        <p class="error">❌ Fehler: {$engineError}</p>
    {:else if $engineReady}
        <div class="controls">
            <label>
                Simulationen:
                <input type="number" bind:value={numSimulations} min="100" max="100000" step="100" />
            </label>
            <label>
                Jahre:
                <input type="number" bind:value={yearsToSimulate} min="10" max="50" />
            </label>
            <button on:click={runMonteCarlo} disabled={isRunning}>
                {isRunning ? '⏳ Läuft...' : '▶️ Starten'}
            </button>
        </div>

        {#if $monteCarloResult}
            <div class="results">
                <h4>Ergebnisse ({duration.toFixed(0)}ms)</h4>

                <div class="result-grid">
                    <div class="metric success">
                        <span class="label">Erfolgsrate</span>
                        <span class="value">{($monteCarloResult.successRate * 100).toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">Median Vermögen</span>
                        <span class="value">€{$monteCarloResult.medianFinalWealth.toLocaleString('de-DE', {maximumFractionDigits: 0})}</span>
                    </div>
                    <div class="metric warning">
                        <span class="label">5% Percentil (Schlecht)</span>
                        <span class="value">€{$monteCarloResult.percentile5.toLocaleString('de-DE', {maximumFractionDigits: 0})}</span>
                    </div>
                    <div class="metric good">
                        <span class="label">95% Percentil (Gut)</span>
                        <span class="value">€{$monteCarloResult.percentile95.toLocaleString('de-DE', {maximumFractionDigits: 0})}</span>
                    </div>
                    <div class="metric danger">
                        <span class="label">Ruinwahrscheinlichkeit</span>
                        <span class="value">{($monteCarloResult.ruinProbability * 100).toFixed(1)}%</span>
                    </div>
                    {#if $monteCarloResult.avgYearsToRuin}
                        <div class="metric">
                            <span class="label">Ø Jahre bis Ruin</span>
                            <span class="value">{$monteCarloResult.avgYearsToRuin.toFixed(1)}</span>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    {/if}
</div>

<style>
    .monte-carlo-panel {
        padding: 1rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #fafafa;
    }

    .controls {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }

    .controls label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .controls input {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        width: 120px;
    }

    .controls button {
        padding: 0.5rem 1rem;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        align-self: flex-end;
    }

    .controls button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .result-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .metric {
        padding: 1rem;
        background: white;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .metric .label {
        display: block;
        font-size: 0.875rem;
        color: #666;
    }

    .metric .value {
        display: block;
        font-size: 1.5rem;
        font-weight: bold;
        margin-top: 0.25rem;
    }

    .metric.success .value { color: #4CAF50; }
    .metric.warning .value { color: #FF9800; }
    .metric.danger .value { color: #F44336; }
    .metric.good .value { color: #2196F3; }

    .error { color: #F44336; }
</style>
