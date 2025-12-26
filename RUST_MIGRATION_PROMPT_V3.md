# Rust Migration Prompt V3 - Phase 4: WASM-Integration & Performance

## Aktueller Status

Die Rust/WASM-Migration ist in **Phase 3.5 abgeschlossen**:

| Phase | Status | Features |
|-------|--------|----------|
| Phase 1 | ✅ | Core Simulation PoC |
| Phase 2 | ✅ | Backtest Engine |
| Phase 3 | ✅ | Asset Tracking + Surplus-Logik |
| Phase 3.5 | ✅ | MC-Optimierung + CoreData + 15 Tests |
| **Phase 4** | 🔄 | **WASM-Integration & Performance** |

### Repository-Struktur
```
Ruhestand-App-Final/
├── rust_engine/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs              # WASM-Interfaces (3 Funktionen)
│       ├── simulation.rs       # Monte Carlo Engine (optimiert)
│       ├── backtest.rs         # Historischer Backtest
│       ├── core.rs             # Haupt-Simulation + CoreData
│       ├── types.rs            # Datenstrukturen inkl. CoreData
│       └── ...
├── pkg/                        # WASM-Output (wird generiert)
├── monte-carlo-runner.mjs      # MC Test-Runner
├── backtest-runner.mjs         # Backtest Test-Runner
└── load-wasm.mjs               # WASM-Loader
```

---

## 🎯 Phase 4 Ziele

1. **WASM-Build verifizieren**
2. **Performance-Benchmarks durchführen**
3. **Parity-Tests JS vs Rust**
4. **Historische Daten integrieren**
5. **Frontend-Adapter erstellen**

---

## 🚨 AUFGABE 1: WASM-Build & Grundtest

### 1.1 WASM-Build ausführen

```bash
cd rust_engine
wasm-pack build --target web --out-dir ../pkg
```

### 1.2 Build-Fehler beheben (falls vorhanden)

Häufige Probleme:
- `rand` Crate braucht `getrandom` mit `js` Feature für WASM
- `rayon` ist nur für Native (bereits korrekt konfiguriert)

**Cargo.toml sollte so aussehen:**
```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rand = { version = "0.8", features = ["std_rng"] }

[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen = "0.2"
serde-wasm-bindgen = "0.4"
getrandom = { version = "0.2", features = ["js"] }
console_error_panic_hook = "0.1"

[target.'cfg(not(target_arch = "wasm32"))'.dependencies]
rayon = "1.10"
```

### 1.3 Test-Runner ausführen

```bash
cd ..
node monte-carlo-runner.mjs
node backtest-runner.mjs
```

### Erwartetes Ergebnis
```
=== Rust Monte Carlo Test ===
Running 5000 Simulations x 30 Years...
Monte Carlo Duration: ~500ms (WASM) vs ~50ms (Native mit Rayon)

✅ Success Rate: 85-95%
💀 Ruin Probability: 5-15%
💰 Median Wealth: €800k-1.5M
```

---

## 🚨 AUFGABE 2: Performance-Benchmark erstellen

### 2.1 Neuer Benchmark-Runner

Erstelle `benchmark-mc.mjs`:

```javascript
import { loadWasm } from './load-wasm.mjs';

async function benchmark() {
    console.log('=== Monte Carlo Performance Benchmark ===\n');

    const wasm = await loadWasm();

    // Historische Returns (vereinfacht)
    const historicalReturns = [];
    const historicalInflation = [];
    for (let i = 0; i < 100; i++) {
        historicalReturns.push(1.0 + (Math.random() * 0.40 - 0.15));
        historicalInflation.push(2.0 + Math.random() * 3.0);
    }

    const input = {
        aktuellesAlter: 60,
        risikoprofil: "wachstum",
        inflation: 2.0,
        tagesgeld: 50000.0,
        geldmarktEtf: 0.0,
        aktuelleLiquiditaet: 50000.0,
        depotwertAlt: 800000.0,
        depotwertNeu: 0.0,
        goldAktiv: true,
        goldWert: 100000.0,
        goldCost: 80000.0,
        goldZielProzent: 10.0,
        goldFloorProzent: 5.0,
        floorBedarf: 30000.0,
        flexBedarf: 12000.0,
        renteAktiv: false,
        renteMonatlich: 0.0,
        costBasisAlt: 600000.0,
        costBasisNeu: 0.0,
        sparerPauschbetrag: 1000.0,
        endeVJ: 100.0,
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

    const testCases = [
        { sims: 100, years: 30, label: "100 x 30" },
        { sims: 1000, years: 30, label: "1k x 30" },
        { sims: 5000, years: 30, label: "5k x 30" },
        { sims: 10000, years: 30, label: "10k x 30" },
    ];

    console.log('Simulations │ Duration │ Sims/sec │ Success Rate');
    console.log('────────────┼──────────┼──────────┼─────────────');

    for (const tc of testCases) {
        const config = {
            numSimulations: tc.sims,
            yearsToSimulate: tc.years,
            historicalReturns,
            historicalInflation,
        };

        const start = performance.now();
        const result = wasm.run_monte_carlo_wasm(input, config);
        const duration = performance.now() - start;

        const simsPerSec = Math.round(tc.sims / (duration / 1000));
        console.log(
            `${tc.label.padEnd(11)} │ ${duration.toFixed(0).padStart(6)}ms │ ${simsPerSec.toString().padStart(8)} │ ${(result.successRate * 100).toFixed(1)}%`
        );
    }

    console.log('\n✅ Benchmark complete!');
}

benchmark().catch(console.error);
```

### 2.2 Ziel-Performance

| Simulationen | WASM Ziel | Native Ziel |
|--------------|-----------|-------------|
| 1.000 × 30 Jahre | < 100ms | < 20ms |
| 10.000 × 30 Jahre | < 1s | < 200ms |
| 100.000 × 30 Jahre | < 10s | < 2s |

---

## 🚨 AUFGABE 3: Parity-Test JS vs Rust

### 3.1 Parity-Tester erstellen

Erstelle `parity-test.mjs`:

```javascript
import { loadWasm } from './load-wasm.mjs';

/**
 * Simuliert die JS-Engine-Logik für einen einzelnen Jahresschritt.
 * Dies sollte durch den echten JS-Engine-Aufruf ersetzt werden.
 */
function runJsSimulationStep(input) {
    // TODO: Import actual JS engine
    // import { calculateModel } from './src/lib/core/index.mjs';
    // return calculateModel(input);

    // Placeholder - muss durch echte JS-Logik ersetzt werden
    return {
        depotwertGesamt: input.depotwertAlt + input.depotwertNeu,
        liquiditaetNachher: input.aktuelleLiquiditaet * 0.9, // Simplified
        flexRate: 100,
        actionType: "NONE",
    };
}

async function parityTest() {
    console.log('=== JS vs Rust Parity Test ===\n');

    const wasm = await loadWasm();

    const testInputs = [
        {
            name: "Standard Case",
            input: {
                aktuellesAlter: 60,
                risikoprofil: "wachstum",
                inflation: 2.0,
                tagesgeld: 50000.0,
                geldmarktEtf: 0.0,
                aktuelleLiquiditaet: 50000.0,
                depotwertAlt: 500000.0,
                depotwertNeu: 100000.0,
                goldAktiv: true,
                goldWert: 50000.0,
                goldCost: 40000.0,
                goldZielProzent: 10.0,
                goldFloorProzent: 5.0,
                floorBedarf: 30000.0,
                flexBedarf: 12000.0,
                renteAktiv: false,
                renteMonatlich: 0.0,
                costBasisAlt: 400000.0,
                costBasisNeu: 80000.0,
                sparerPauschbetrag: 1000.0,
                endeVJ: 100.0,
                endeVJ_1: 95.0,
                endeVJ_2: 90.0,
                endeVJ_3: 85.0,
                ath: 105.0,
                jahreSeitAth: 1,
                capeRatio: 25.0,
                runwayMinMonths: 24.0,
                runwayTargetMonths: 36.0,
                targetEq: 75.0,
                rebalBand: 5.0,
                maxSkimPctOfEq: 10.0,
                maxBearRefillPctOfEq: 20.0,
            }
        },
        {
            name: "Bear Market",
            input: {
                // ... same as above but with bear market conditions
                aktuellesAlter: 65,
                risikoprofil: "ausgewogen",
                inflation: 4.0,
                tagesgeld: 30000.0,
                geldmarktEtf: 0.0,
                aktuelleLiquiditaet: 30000.0,
                depotwertAlt: 300000.0,
                depotwertNeu: 50000.0,
                goldAktiv: true,
                goldWert: 40000.0,
                goldCost: 35000.0,
                goldZielProzent: 10.0,
                goldFloorProzent: 5.0,
                floorBedarf: 36000.0,
                flexBedarf: 15000.0,
                renteAktiv: false,
                renteMonatlich: 0.0,
                costBasisAlt: 250000.0,
                costBasisNeu: 45000.0,
                sparerPauschbetrag: 1000.0,
                endeVJ: 70.0,       // -30% from ATH
                endeVJ_1: 90.0,
                endeVJ_2: 100.0,
                endeVJ_3: 95.0,
                ath: 100.0,
                jahreSeitAth: 2,
                capeRatio: 18.0,
                runwayMinMonths: 24.0,
                runwayTargetMonths: 36.0,
                targetEq: 60.0,
                rebalBand: 5.0,
                maxSkimPctOfEq: 10.0,
                maxBearRefillPctOfEq: 20.0,
            }
        }
    ];

    console.log('Test Case      │ Field            │ JS Value │ Rust Value │ Diff %');
    console.log('───────────────┼──────────────────┼──────────┼────────────┼────────');

    let allPassed = true;

    for (const tc of testInputs) {
        // Run JS
        const jsResult = runJsSimulationStep(tc.input);

        // Run Rust
        const rustResult = wasm.run_simulation_poc(tc.input);
        const rustUi = JSON.parse(rustResult.ui);

        // Compare key fields
        const comparisons = [
            { field: 'depotwertGesamt', js: jsResult.depotwertGesamt, rust: rustUi.depotwertGesamt },
            { field: 'flexRate', js: jsResult.flexRate, rust: rustUi.flexRate },
            // Add more fields as needed
        ];

        for (const cmp of comparisons) {
            const diff = Math.abs(cmp.js - cmp.rust) / Math.max(cmp.js, 0.01) * 100;
            const status = diff < 1 ? '✅' : '❌';

            if (diff >= 1) allPassed = false;

            console.log(
                `${tc.name.substring(0, 14).padEnd(14)} │ ${cmp.field.padEnd(16)} │ ${cmp.js.toFixed(0).padStart(8)} │ ${cmp.rust.toFixed(0).padStart(10)} │ ${status} ${diff.toFixed(2)}%`
            );
        }
    }

    console.log(allPassed ? '\n✅ All parity tests passed!' : '\n❌ Some parity tests failed!');
}

parityTest().catch(console.error);
```

---

## 🚨 AUFGABE 4: Historische Daten integrieren

### 4.1 Historische Returns-Datei erstellen

Erstelle `historical-data.mjs`:

```javascript
// S&P 500 Total Returns 1928-2023 (vereinfacht)
export const SP500_RETURNS = [
    // Format: [year, return_factor]
    // z.B. 1.10 = +10%, 0.90 = -10%
    [1928, 1.438], [1929, 0.916], [1930, 0.752], [1931, 0.566],
    [1932, 0.918], [1933, 1.540], [1934, 0.985], [1935, 1.477],
    // ... Add all years
    [2020, 1.184], [2021, 1.287], [2022, 0.816], [2023, 1.262],
];

// Gold EUR Returns (vereinfacht, ab 1970)
export const GOLD_EUR_RETURNS = [
    [1970, 1.05], [1971, 1.15], // ...
    [2020, 1.14], [2021, 0.96], [2022, 1.06], [2023, 1.10],
];

// Inflation Deutschland (ab 1950)
export const DE_INFLATION = [
    [1950, 7.3], [1951, 7.9], // ...
    [2020, 0.5], [2021, 3.1], [2022, 6.9], [2023, 5.9],
];

// Hilfsfunktion: Returns als Array für MC
export function getReturnsForMC(startYear = 1950, endYear = 2023) {
    const returns = [];
    const inflation = [];

    for (const [year, ret] of SP500_RETURNS) {
        if (year >= startYear && year <= endYear) {
            returns.push(ret);
        }
    }

    for (const [year, infl] of DE_INFLATION) {
        if (year >= startYear && year <= endYear) {
            inflation.push(infl);
        }
    }

    return { returns, inflation };
}
```

### 4.2 MC-Runner mit echten Daten

```javascript
import { loadWasm } from './load-wasm.mjs';
import { getReturnsForMC } from './historical-data.mjs';

async function runRealMC() {
    const wasm = await loadWasm();
    const { returns, inflation } = getReturnsForMC(1950, 2023);

    const config = {
        numSimulations: 10000,
        yearsToSimulate: 30,
        historicalReturns: returns,
        historicalInflation: inflation,
    };

    // ... run simulation
}
```

---

## 🚨 AUFGABE 5: Frontend-Adapter

### 5.1 Rust-Engine Wrapper

Erstelle `src/lib/rust-engine.mjs`:

```javascript
let wasmModule = null;

export async function initRustEngine() {
    if (wasmModule) return wasmModule;

    const wasm = await import('../pkg/rust_engine.js');
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

    return wasmModule;
}

// Usage:
// const engine = await initRustEngine();
// const mcResult = engine.runMonteCarlo(input, config);
```

### 5.2 Feature-Flag für Engine-Wahl

```javascript
// src/lib/config.mjs
export const USE_RUST_ENGINE = true; // Toggle für A/B-Testing

// src/lib/simulation-adapter.mjs
import { initRustEngine } from './rust-engine.mjs';
import { calculateModel as jsCalculateModel } from './core/index.mjs';

export async function runSimulation(input) {
    if (USE_RUST_ENGINE) {
        const engine = await initRustEngine();
        return engine.runSimulation(input);
    } else {
        return jsCalculateModel(input);
    }
}
```

---

## 📋 Zusammenfassung der Aufgaben

| # | Aufgabe | Priorität | Dateien | Aufwand |
|---|---------|-----------|---------|---------|
| 1 | WASM-Build & Test | 🔴 KRITISCH | Terminal | 10 min |
| 2 | Performance-Benchmark | 🟠 HOCH | `benchmark-mc.mjs` | 20 min |
| 3 | Parity-Test | 🟠 HOCH | `parity-test.mjs` | 30 min |
| 4 | Historische Daten | 🟡 MITTEL | `historical-data.mjs` | 45 min |
| 5 | Frontend-Adapter | 🟡 MITTEL | `src/lib/rust-engine.mjs` | 30 min |

---

## Build & Test Befehle

```bash
# 1. WASM bauen
cd rust_engine && wasm-pack build --target web --out-dir ../pkg

# 2. Rust-Tests
cargo test

# 3. WASM-Tests
cd .. && node monte-carlo-runner.mjs

# 4. Benchmark
node benchmark-mc.mjs

# 5. Parity-Test
node parity-test.mjs
```

---

## Erwartetes Ergebnis nach Phase 4

1. ✅ WASM-Build funktioniert ohne Fehler
2. ✅ MC mit 10k Sims < 1 Sekunde (WASM)
3. ✅ Parity JS vs Rust < 1% Abweichung
4. ✅ Historische Daten 1950-2023 integriert
5. ✅ Frontend-Adapter bereit für Integration
6. ✅ Feature-Flag für Engine-Wahl

---

## Wichtige Hinweise

1. **WASM-Parallelisierung**: `rayon` funktioniert nicht in WASM. MC läuft dort sequentiell.
2. **Memory**: Bei 100k Simulationen auf Heap-Größe achten
3. **Floating-Point**: Kleine Abweichungen (< 0.01%) zwischen JS und Rust sind normal
4. **Error-Handling**: Alle WASM-Fehler werden als `JsValue::from_str()` zurückgegeben
