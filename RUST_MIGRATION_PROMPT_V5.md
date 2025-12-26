# Rust Migration Prompt V5 - Phase 6: Bugfixes & Produktionsreife

## Aktueller Status

Die Rust/WASM-Migration ist in **Phase 5 abgeschlossen**, aber es gibt kritische Bugs:

| Phase | Status | Features |
|-------|--------|----------|
| Phase 1 | ✅ | Core Simulation PoC |
| Phase 2 | ✅ | Backtest Engine |
| Phase 3 | ✅ | Asset Tracking + Surplus-Logik |
| Phase 3.5 | ✅ | MC-Optimierung + CoreData |
| Phase 4 | ✅ | Benchmarks, Parity, Adapter |
| Phase 5 | ✅ | SvelteKit Integration (mit Bugs) |
| **Phase 6** | 🔄 | **Bugfixes & Produktionsreife** |

### Neue Dateien in Phase 5 (+2925 LOC)

| Datei | LOC | Beschreibung |
|-------|-----|--------------|
| `src/lib/components/MonteCarlo.svelte` | 189 | MC UI-Komponente |
| `src/lib/components/WealthFanChart.svelte` | 66 | Vermögens-Chart |
| `src/lib/stores/engine.ts` | 49 | Engine-Store mit Lazy-Loading |
| `src/lib/types/rust-engine.ts` | 99 | TypeScript-Interfaces |
| `src/lib/historical-data.ts` | 72 | Historische Daten (TS) |
| `src/routes/+page.svelte` | 78 | Demo-Seite |
| `vite.config.js` | 15 | WASM-Konfiguration |
| `svelte.config.js` | 13 | SvelteKit-Konfiguration |
| `package.json` | 32 | Dependencies aktualisiert |

---

## 🚨 KRITISCHER BUG: Rayon fehlt

### Problem
Die `rayon` Dependency wurde aus `Cargo.toml` entfernt, aber `simulation.rs` verwendet sie noch:

```
error[E0433]: failed to resolve: use of unresolved module or unlinked crate `rayon`
 --> src/simulation.rs:5:5
  |
5 | use rayon::prelude::*;
  |     ^^^^^ use of unresolved module or unlinked crate `rayon`
```

### Lösung
In `rust_engine/Cargo.toml` hinzufügen:

```toml
# Native-specific dependencies
[target.'cfg(not(target_arch = "wasm32"))'.dependencies]
rayon = "1.10"
```

Die vollständige Cargo.toml sollte so aussehen:

```toml
[package]
name = "rust_engine"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rand = { version = "0.8", features = ["std_rng"] }

# WASM-specific dependencies
[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen = "0.2"
serde-wasm-bindgen = "0.4"
getrandom = { version = "0.2", features = ["js"] }
console_error_panic_hook = "0.1"

# Native-specific dependencies (for parallel MC)
[target.'cfg(not(target_arch = "wasm32"))'.dependencies]
rayon = "1.10"

[profile.release]
opt-level = 's'
lto = true
codegen-units = 1
```

### Validierung
```bash
cd rust_engine && cargo test
# Erwartet: 15 Tests bestanden
```

---

## 🔧 AUFGABE 1: Compiler-Warning beheben

### Problem
```
warning: unused variable: `state`
  --> src/transactions.rs:239:13
   |
239 |         let state = SimulationState { flex_rate: 100.0, ..Default::default() };
    |             ^^^^^ help: if this is intentional, prefix it with an underscore: `_state`
```

### Lösung
In `src/transactions.rs:239` ändern:

```rust
// VORHER:
let state = SimulationState { flex_rate: 100.0, ..Default::default() };

// NACHHER:
let _state = SimulationState { flex_rate: 100.0, ..Default::default() };
```

---

## 🚨 AUFGABE 2: WASM-Build verifizieren

### 2.1 WASM bauen

```bash
cd rust_engine
wasm-pack build --target web --out-dir ../src/lib/pkg
```

### 2.2 Mögliche Fehler

**Fehler: `wasm-pack` nicht installiert**
```bash
cargo install wasm-pack
```

**Fehler: `wasm32-unknown-unknown` Target fehlt**
```bash
rustup target add wasm32-unknown-unknown
```

### 2.3 Erwartete Ausgabe
```
[INFO]: 🎯  Checking for the Wasm target...
[INFO]: 🌀  Compiling to Wasm...
[INFO]: ⬇️  Installing wasm-bindgen...
[INFO]: ✨   Done in Xs
[INFO]: 📦   Your wasm pkg is ready to publish at /path/to/src/lib/pkg
```

### 2.4 Dateien verifizieren
```bash
ls -la src/lib/pkg/
# Erwartet:
# - rust_engine_bg.wasm (~200-400KB)
# - rust_engine.js
# - rust_engine.d.ts
# - package.json
```

---

## 🚨 AUFGABE 3: SvelteKit-App starten

### 3.1 Dependencies installieren

```bash
npm install
```

### 3.2 WASM bauen und Dev-Server starten

```bash
npm run dev
```

### 3.3 Mögliche Fehler

**Fehler: `$lib/rust-engine.mjs` nicht gefunden**

Der Import in `stores/engine.ts` referenziert `$lib/rust-engine.mjs`, aber die Datei liegt in `src/lib/rust-engine.mjs`.

Prüfen:
```bash
ls -la src/lib/rust-engine.mjs
# Sollte existieren
```

Falls nicht, muss der Import angepasst werden oder die Datei kopiert werden.

**Fehler: WASM-Module nicht geladen**

In `src/lib/rust-engine.mjs` prüfen, dass der Pfad zum pkg stimmt:
```javascript
const wasm = await import('../../pkg/rust_engine.js');
// oder
const wasm = await import('$lib/pkg/rust_engine.js');
```

### 3.4 Erwartete Ausgabe
```
  VITE v5.x.x  ready in Xms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🚨 AUFGABE 4: End-to-End Test

### 4.1 Browser öffnen

Öffne `http://localhost:5173/`

### 4.2 Erwartetes Verhalten

1. Seite zeigt "Ruhestand Planer (Rust Engine Demo)"
2. Monte Carlo Panel zeigt "🔄 Engine wird geladen..."
3. Nach 1-2 Sekunden: "▶️ Starten" Button erscheint
4. Klick auf "Starten" führt Simulation durch
5. Ergebnisse werden angezeigt:
   - Erfolgsrate: ~85-95%
   - Median Vermögen: €X
   - Ruinwahrscheinlichkeit: ~5-15%

### 4.3 Fehlerbehandlung

Falls "❌ Fehler:" angezeigt wird:
1. Browser-Console öffnen (F12)
2. Fehlermeldung analysieren
3. Häufigste Ursachen:
   - WASM nicht gebaut (`npm run build:wasm`)
   - Import-Pfade falsch
   - CORS-Probleme (sollte bei Vite nicht auftreten)

---

## 🚨 AUFGABE 5: Production Build

### 5.1 Produktions-Build erstellen

```bash
npm run build
```

### 5.2 Preview testen

```bash
npm run preview
```

### 5.3 Bundle-Größe prüfen

```bash
ls -lh .svelte-kit/output/client/_app/immutable/
# Oder nach dem Build:
ls -lh build/_app/immutable/
```

**Zielgrößen:**
- WASM-Modul: < 500KB (gzip: < 150KB)
- JS-Bundle: < 200KB (gzip: < 60KB)

---

## 🚨 AUFGABE 6: Backtest UI-Komponente erstellen

### 6.1 Neue Komponente

Erstelle `src/lib/components/Backtest.svelte`:

```svelte
<script lang="ts">
    import { onMount } from 'svelte';
    import {
        initEngine,
        getEngine,
        engineReady,
        backtestResult
    } from '$lib/stores/engine';
    import type { BacktestConfig, SimulationInput, HistoricalMarketData } from '$lib/types/rust-engine';
    import { SP500_RETURNS, DE_INFLATION } from '$lib/historical-data';

    export let input: SimulationInput;

    let startYear = 2000;
    let endYear = 2023;
    let isRunning = false;
    let duration = 0;

    onMount(async () => {
        await initEngine();
    });

    function buildHistoricalData(start: number, end: number): HistoricalMarketData[] {
        const data: HistoricalMarketData[] = [];

        for (let year = start; year <= end; year++) {
            const sp500Entry = SP500_RETURNS.find(([y]) => y === year);
            const inflEntry = DE_INFLATION.find(([y]) => y === year);

            if (sp500Entry && inflEntry) {
                // Convert return factor to index (normalized to 100 at start)
                const baseIndex = year === start ? 100 : data[data.length - 1].marketIndex * sp500Entry[1];

                data.push({
                    year,
                    marketIndex: baseIndex,
                    inflation: inflEntry[1],
                    capeRatio: null, // Could add CAPE data later
                    goldEurPerf: null
                });
            }
        }

        return data;
    }

    async function runBacktest() {
        if (!$engineReady) return;

        isRunning = true;
        const start = performance.now();

        try {
            const historicalData = buildHistoricalData(startYear, endYear);

            const config: BacktestConfig = {
                startYear,
                endYear,
                historicalData,
            };

            const engine = getEngine();
            const result = engine.runBacktest(input, config);

            duration = performance.now() - start;
            backtestResult.set(result);

        } catch (e) {
            console.error('Backtest failed:', e);
        } finally {
            isRunning = false;
        }
    }
</script>

<div class="backtest-panel">
    <h3>Historischer Backtest</h3>

    {#if $engineReady}
        <div class="controls">
            <label>
                Von:
                <select bind:value={startYear}>
                    {#each [1950, 1960, 1970, 1980, 1990, 2000, 2010] as year}
                        <option value={year}>{year}</option>
                    {/each}
                </select>
            </label>
            <label>
                Bis:
                <select bind:value={endYear}>
                    {#each [2000, 2005, 2010, 2015, 2020, 2023] as year}
                        <option value={year}>{year}</option>
                    {/each}
                </select>
            </label>
            <button on:click={runBacktest} disabled={isRunning}>
                {isRunning ? '⏳ Läuft...' : '▶️ Backtest starten'}
            </button>
        </div>

        {#if $backtestResult}
            <div class="results">
                <h4>Ergebnisse ({duration.toFixed(0)}ms)</h4>

                <div class="summary">
                    <p><strong>Zeitraum:</strong> {$backtestResult.yearsSimulated} Jahre</p>
                    <p><strong>Endvermögen:</strong> €{$backtestResult.finalWealth.toLocaleString('de-DE', {maximumFractionDigits: 0})}</p>
                    <p><strong>Ø Flex-Rate:</strong> {$backtestResult.avgFlexRate.toFixed(1)}%</p>
                    <p><strong>Min/Max:</strong> €{$backtestResult.minWealth.toLocaleString('de-DE', {maximumFractionDigits: 0})} / €{$backtestResult.maxWealth.toLocaleString('de-DE', {maximumFractionDigits: 0})}</p>
                </div>

                <!-- Yearly snapshots table could go here -->
            </div>
        {/if}
    {/if}
</div>

<style>
    .backtest-panel {
        padding: 1rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #fafafa;
        margin-top: 1rem;
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

    .controls select, .controls button {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .controls button {
        background: #2196F3;
        color: white;
        border: none;
        cursor: pointer;
        align-self: flex-end;
    }

    .controls button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .summary p {
        margin: 0.25rem 0;
    }
</style>
```

### 6.2 In +page.svelte einbinden

```svelte
<script lang="ts">
    import MonteCarlo from '$lib/components/MonteCarlo.svelte';
    import Backtest from '$lib/components/Backtest.svelte';
    // ... rest
</script>

<main>
    <h1>Ruhestand Planer (Rust Engine Demo)</h1>

    <section class="simulation-section">
        <MonteCarlo input={simulationInput} />
    </section>

    <section class="backtest-section">
        <Backtest input={simulationInput} />
    </section>
</main>
```

---

## 📋 Zusammenfassung der Aufgaben

| # | Aufgabe | Priorität | Status |
|---|---------|-----------|--------|
| 1 | Rayon-Dependency fixen | 🔴 KRITISCH | Offen |
| 2 | Compiler-Warning beheben | 🟡 NIEDRIG | Offen |
| 3 | WASM-Build verifizieren | 🔴 KRITISCH | Offen |
| 4 | SvelteKit-App starten | 🟠 HOCH | Offen |
| 5 | E2E-Test durchführen | 🟠 HOCH | Offen |
| 6 | Production Build | 🟡 MITTEL | Offen |
| 7 | Backtest UI erstellen | 🟡 MITTEL | Offen |

---

## Build & Test Befehle (Reihenfolge)

```bash
# 1. Rayon fixen (manuell in Cargo.toml)

# 2. Rust-Tests
cd rust_engine && cargo test

# 3. WASM bauen
wasm-pack build --target web --out-dir ../src/lib/pkg

# 4. NPM Dependencies
cd .. && npm install

# 5. Dev-Server
npm run dev

# 6. Browser öffnen
# http://localhost:5173

# 7. Production Build
npm run build && npm run preview
```

---

## 🎯 Migrations-Gesamtfortschritt

```
Phase 1: Initial PoC .......................... ✅
Phase 2: Backtest Engine ...................... ✅
Phase 3: Asset Tracking + Surplus ............. ✅
Phase 3.5: MC Optimierung + Tests ............. ✅
Phase 4: Benchmarks, Parity, Adapter .......... ✅
Phase 5: SvelteKit Integration ................ ✅ (mit Bugs)
Phase 6: Bugfixes & Produktionsreife .......... 📋 (Prompt bereit)
```

---

## Wichtige Hinweise

1. **Rayon-Bug ist kritisch**: Ohne diesen Fix kompiliert der Rust-Code nicht
2. **WASM muss vor npm run dev gebaut werden**: Sonst fehlen die Imports
3. **TypeScript-Pfade**: `$lib/` alias funktioniert nur in SvelteKit-Dateien
4. **Browser-Cache**: Bei WASM-Änderungen Hard-Refresh (Ctrl+Shift+R) nötig
