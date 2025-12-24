# Rust Migration Prompt V4 - Phase 5: Frontend-Integration & Produktionsreife

## Aktueller Status

Die Rust/WASM-Migration ist in **Phase 4 abgeschlossen**:

| Phase | Status | Features |
|-------|--------|----------|
| Phase 1 | ✅ | Core Simulation PoC |
| Phase 2 | ✅ | Backtest Engine |
| Phase 3 | ✅ | Asset Tracking + Surplus-Logik |
| Phase 3.5 | ✅ | MC-Optimierung + CoreData + 15 Tests |
| Phase 4 | ✅ | Benchmarks, Parity-Test, Frontend-Adapter |
| **Phase 5** | 🔄 | **Frontend-Integration & Produktionsreife** |

### Neu erstellte Dateien in Phase 4

| Datei | LOC | Beschreibung |
|-------|-----|--------------|
| `benchmark-mc.mjs` | 84 | Performance-Benchmark (100-10k Sims) |
| `historical-data.mjs` | 74 | S&P 500 Returns 1928-2023, DE Inflation |
| `parity-test.mjs` | 127 | JS vs Rust Vergleichsframework |
| `src/lib/rust-engine.mjs` | 42 | Frontend-Adapter mit Lazy-Loading |

### Repository-Struktur
```
Ruhestand-App-Final/
├── rust_engine/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs              # 3 WASM-Interfaces
│       ├── simulation.rs       # Monte Carlo (optimiert)
│       ├── backtest.rs         # Historischer Backtest
│       ├── core.rs             # Haupt-Simulation + CoreData
│       └── ...
├── pkg/                        # WASM-Output (wird generiert)
├── src/
│   └── lib/
│       └── rust-engine.mjs     # Frontend-Adapter ✅
├── benchmark-mc.mjs            # Performance-Tests ✅
├── historical-data.mjs         # Echte Marktdaten ✅
├── parity-test.mjs             # JS/Rust Vergleich ✅
└── monte-carlo-runner.mjs      # MC Test-Runner
```

---

## 🎯 Phase 5 Ziele

1. **WASM in Svelte-App integrieren**
2. **Monte Carlo UI-Komponente erstellen**
3. **Backtest-Visualisierung mit echten Daten**
4. **Engine-Umschaltung (JS/Rust) mit Feature-Flag**
5. **Error-Handling & Loading-States**
6. **Produktions-Build optimieren**

---

## 🚨 AUFGABE 1: WASM-Build in Svelte einbinden

### 1.1 Vite-Konfiguration für WASM

In `vite.config.js` oder `vite.config.ts`:

```javascript
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
    plugins: [
        sveltekit(),
        wasm(),
        topLevelAwait()
    ],
    optimizeDeps: {
        exclude: ['rust_engine']
    }
});
```

### 1.2 Package.json Dependencies

```json
{
  "devDependencies": {
    "vite-plugin-wasm": "^3.3.0",
    "vite-plugin-top-level-await": "^1.4.1"
  }
}
```

### 1.3 WASM-Build Script

In `package.json` scripts:
```json
{
  "scripts": {
    "build:wasm": "cd rust_engine && wasm-pack build --target web --out-dir ../src/lib/pkg",
    "dev": "npm run build:wasm && vite dev",
    "build": "npm run build:wasm && vite build"
  }
}
```

---

## 🚨 AUFGABE 2: Engine-Store mit Svelte

### 2.1 Engine-Store erstellen

Erstelle `src/lib/stores/engine.ts`:

```typescript
import { writable, derived } from 'svelte/store';
import type { MonteCarloResult, BacktestResult } from '$lib/types/rust-engine';

// Feature Flag
export const useRustEngine = writable<boolean>(true);

// Engine State
export const engineLoading = writable<boolean>(false);
export const engineError = writable<string | null>(null);
export const engineReady = writable<boolean>(false);

// Results
export const monteCarloResult = writable<MonteCarloResult | null>(null);
export const backtestResult = writable<BacktestResult | null>(null);

// Derived
export const isEngineAvailable = derived(
    [engineReady, engineError],
    ([$ready, $error]) => $ready && !$error
);

// Engine Instance (Singleton)
let engineInstance: any = null;

export async function initEngine(): Promise<void> {
    if (engineInstance) return;

    engineLoading.set(true);
    engineError.set(null);

    try {
        const { initRustEngine } = await import('$lib/rust-engine');
        engineInstance = await initRustEngine();
        engineReady.set(true);
    } catch (e) {
        console.error('Failed to init Rust engine:', e);
        engineError.set(e instanceof Error ? e.message : 'Unknown error');
        // Fallback to JS engine could be implemented here
    } finally {
        engineLoading.set(false);
    }
}

export function getEngine() {
    if (!engineInstance) {
        throw new Error('Engine not initialized. Call initEngine() first.');
    }
    return engineInstance;
}
```

### 2.2 TypeScript Types

Erstelle `src/lib/types/rust-engine.ts`:

```typescript
export interface MonteCarloConfig {
    numSimulations: number;
    yearsToSimulate: number;
    historicalReturns: number[];
    historicalInflation: number[];
}

export interface MonteCarloResult {
    successRate: number;
    medianFinalWealth: number;
    percentile5: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
    ruinProbability: number;
    avgYearsToRuin: number | null;
}

export interface BacktestConfig {
    startYear: number;
    endYear: number;
    historicalData: HistoricalMarketData[];
}

export interface HistoricalMarketData {
    year: number;
    marketIndex: number;
    inflation: number;
    capeRatio: number | null;
    goldEurPerf: number | null;
}

export interface BacktestResult {
    success: boolean;
    finalWealth: number;
    finalAge: number;
    yearsSimulated: number;
    portfolioDepletedAtAge: number | null;
    snapshots: YearlySnapshot[];
    minWealth: number;
    maxWealth: number;
    totalWithdrawals: number;
    avgFlexRate: number;
}

export interface YearlySnapshot {
    year: number;
    age: number;
    totalWealth: number;
    liquidity: number;
    depotValue: number;
    depotAlt: number;
    depotNeu: number;
    goldValue: number;
    flexRate: number;
    alarmActive: boolean;
    runwayMonths: number;
    runwayStatus: string;
    marketScenario: string;
    transactionType: string;
    withdrawal: number;
    refillAmount: number;
}

export interface SimulationInput {
    aktuellesAlter: number;
    risikoprofil: string;
    inflation: number;
    tagesgeld: number;
    geldmarktEtf: number;
    aktuelleLiquiditaet: number | null;
    depotwertAlt: number;
    depotwertNeu: number;
    goldAktiv: boolean;
    goldWert: number;
    goldCost: number;
    goldZielProzent: number;
    goldFloorProzent: number;
    floorBedarf: number;
    flexBedarf: number;
    renteAktiv: boolean;
    renteMonatlich: number;
    costBasisAlt: number;
    costBasisNeu: number;
    sparerPauschbetrag: number;
    endeVJ: number;
    endeVJ_1: number;
    endeVJ_2: number;
    endeVJ_3: number;
    ath: number;
    jahreSeitAth: number;
    capeRatio: number | null;
    runwayMinMonths: number;
    runwayTargetMonths: number;
    targetEq: number;
    rebalBand: number;
    maxSkimPctOfEq: number;
    maxBearRefillPctOfEq: number;
}
```

---

## 🚨 AUFGABE 3: Monte Carlo UI-Komponente

### 3.1 Monte Carlo Panel

Erstelle `src/lib/components/MonteCarlo.svelte`:

```svelte
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
```

---

## 🚨 AUFGABE 4: Vermögens-Fan-Chart

### 4.1 Chart-Komponente

Erstelle `src/lib/components/WealthFanChart.svelte`:

```svelte
<script lang="ts">
    import { onMount } from 'svelte';
    import type { MonteCarloResult } from '$lib/types/rust-engine';

    export let result: MonteCarloResult;
    export let startWealth: number;
    export let years: number;

    // Simplified Fan Chart Data
    // In production, you'd collect yearly percentiles from MC
    $: fanData = generateFanData(startWealth, result, years);

    function generateFanData(start: number, r: MonteCarloResult, y: number) {
        // Linear interpolation from start to final percentiles
        // Real implementation should collect yearly snapshots
        const data = [];
        for (let i = 0; i <= y; i++) {
            const progress = i / y;
            data.push({
                year: i,
                p5: start + (r.percentile5 - start) * progress,
                p25: start + (r.percentile25 - start) * progress,
                median: start + (r.medianFinalWealth - start) * progress,
                p75: start + (r.percentile75 - start) * progress,
                p95: start + (r.percentile95 - start) * progress,
            });
        }
        return data;
    }
</script>

<div class="fan-chart">
    <svg viewBox="0 0 400 200">
        <!-- Simplified SVG chart -->
        <!-- In production, use Chart.js or D3 -->
        <text x="200" y="20" text-anchor="middle" font-size="12">
            Vermögensentwicklung (30 Jahre)
        </text>

        <!-- Fan bands would be drawn here -->
        <text x="200" y="100" text-anchor="middle" font-size="10" fill="#666">
            [Chart-Visualisierung hier einfügen]
        </text>
        <text x="200" y="120" text-anchor="middle" font-size="10" fill="#666">
            Median: €{result.medianFinalWealth.toLocaleString('de-DE', {maximumFractionDigits: 0})}
        </text>
    </svg>
</div>

<style>
    .fan-chart {
        width: 100%;
        max-width: 600px;
        margin: 1rem 0;
    }

    svg {
        width: 100%;
        height: auto;
        background: white;
        border-radius: 8px;
    }
</style>
```

---

## 🚨 AUFGABE 5: Integration in Hauptseite

### 5.1 Page-Integration

In `src/routes/+page.svelte` oder entsprechender Route:

```svelte
<script lang="ts">
    import MonteCarlo from '$lib/components/MonteCarlo.svelte';
    import { userInput } from '$lib/stores/user-input'; // Existing store

    // Convert user input to simulation input format
    $: simulationInput = {
        aktuellesAlter: $userInput.age,
        risikoprofil: $userInput.riskProfile,
        // ... map all fields
    };
</script>

<main>
    <h1>Ruhestand Planer</h1>

    <!-- Existing input forms -->

    <section class="simulation-section">
        <MonteCarlo input={simulationInput} />
    </section>
</main>
```

---

## 🚨 AUFGABE 6: Production Build

### 6.1 Build-Optimierungen

```bash
# WASM mit Release-Optimierungen bauen
cd rust_engine
wasm-pack build --target web --out-dir ../src/lib/pkg --release

# Größe prüfen
ls -lh ../src/lib/pkg/*.wasm
# Ziel: < 500KB (gzip: < 150KB)
```

### 6.2 Cargo.toml Optimierungen

```toml
[profile.release]
opt-level = 's'     # Size optimization
lto = true          # Link-time optimization
codegen-units = 1   # Better optimization
```

---

## 📋 Zusammenfassung der Aufgaben

| # | Aufgabe | Priorität | Dateien | Aufwand |
|---|---------|-----------|---------|---------|
| 1 | Vite WASM-Config | 🔴 KRITISCH | `vite.config.js` | 15 min |
| 2 | Engine-Store | 🔴 KRITISCH | `src/lib/stores/engine.ts` | 30 min |
| 3 | Monte Carlo UI | 🟠 HOCH | `MonteCarlo.svelte` | 45 min |
| 4 | Fan-Chart | 🟡 MITTEL | `WealthFanChart.svelte` | 30 min |
| 5 | Page-Integration | 🟠 HOCH | `+page.svelte` | 20 min |
| 6 | Production Build | 🟡 MITTEL | `Cargo.toml`, Scripts | 20 min |

---

## Build & Test Befehle

```bash
# 1. Dependencies installieren
npm install vite-plugin-wasm vite-plugin-top-level-await

# 2. WASM bauen (Release)
cd rust_engine && wasm-pack build --target web --out-dir ../src/lib/pkg --release

# 3. Dev-Server starten
cd .. && npm run dev

# 4. Production Build
npm run build

# 5. Preview Production
npm run preview
```

---

## Erwartetes Ergebnis nach Phase 5

1. ✅ WASM lädt automatisch beim App-Start
2. ✅ Monte Carlo UI mit Echtzeit-Ergebnissen
3. ✅ < 1 Sekunde für 10.000 Simulationen
4. ✅ Fehlerbehandlung mit Fallback
5. ✅ WASM-Bundle < 500KB (gzip < 150KB)
6. ✅ TypeScript-Types für alle Rust-Strukturen

---

## 🎯 Migrations-Gesamtfortschritt

```
Phase 1: Initial PoC .......................... ✅
Phase 2: Backtest Engine ...................... ✅
Phase 3: Asset Tracking + Surplus ............. ✅
Phase 3.5: MC Optimierung + Tests ............. ✅
Phase 4: Benchmarks, Parity, Adapter .......... ✅
Phase 5: Frontend-Integration ................. 📋 (Prompt bereit)
Phase 6: Produktionsreife & Monitoring ........ ⏳
```

---

## Wichtige Hinweise

1. **Svelte 5**: Falls Svelte 5 verwendet wird, Runes-Syntax beachten (`$state`, `$derived`)
2. **SSR**: WASM funktioniert nicht serverseitig - dynamischer Import oder Client-Only
3. **Memory**: Bei vielen MC-Läufen auf Memory-Leaks achten
4. **Safari**: WASM-Threads funktionieren nicht in Safari (aber wir nutzen keine)
