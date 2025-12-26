# Rust Engine Integration - Richtiger Ansatz

## Problemstellung

Die bisherige Migration war fehlgeleitet:
- SvelteKit-UI statt bestehende HTML/JS-Oberfläche
- Nur ~10% der Features portiert
- Zwei getrennte Engines → Inkonsistente Ergebnisse

## Richtiger Ansatz: Drop-in Replacement

**Eine Rust-Engine, die die bestehende JavaScript-EngineAPI ersetzt.**

```
┌─────────────────────────────────────────────────────────┐
│                    Simulator.html                        │
│                     Balance.html                         │
│                    (UNVERÄNDERT)                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│             simulator-engine-wrapper.js                  │
│                    (UNVERÄNDERT)                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  window.EngineAPI                        │
│                                                          │
│   VORHER: engine/index.mjs → engine/core.mjs (JS)       │
│   NACHHER: rust-engine-loader.js → WASM                  │
└─────────────────────────────────────────────────────────┘
```

---

## Aktuelle JavaScript EngineAPI

### Datei: `engine/core.mjs`

```javascript
const EngineAPI = {
    getVersion: function() {
        return { api: ENGINE_API_VERSION, build: ENGINE_BUILD_ID };
    },

    getConfig: function() {
        return CONFIG;  // Konfigurationskonstanten
    },

    analyzeMarket: function(input) {
        return MarketAnalyzer.analyzeMarket(input);
    },

    calculateTargetLiquidity: function(profil, market, inflatedBedarf) {
        return TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf);
    },

    simulateSingleYear: function(input, lastState) {
        return _internal_calculateModel(input, lastState);
    }
};
```

### Return-Struktur von `simulateSingleYear`:

```javascript
{
    input,      // Echo der Eingabe
    newState: {
        flexRate: number,
        peakRealVermoegen: number,
        yearsInBear: number,
        cumulativeInflationFactor: number,
        alarmActive: boolean,
        lastInflationAppliedAtAge: number
    },
    diagnosis: {
        decisionTree: [...],
        general: {...},
        guardrails: [...]
    },
    ui: {
        depotwertGesamt: number,
        neuerBedarf: number,
        minGold: number,
        zielLiquiditaet: number,
        market: {
            perf1Y: number,
            abstandVomAthProzent: number,
            seiAth: number,
            sKey: string,  // "peak_hot", "bear_deep", "recovery_in_bear", etc.
            isStagflation: boolean,
            szenarioText: string,
            reasons: [...],
            capeRatio: number,
            valuationSignal: string,
            expectedReturnCape: number
        },
        spending: {
            flexRate: number,
            flexVerwendung: number,
            totalEntnahme: number,
            entnahmeDepot: number
        },
        action: {
            type: string,  // "TRANSACTION" or "NONE"
            title: string,
            nettoErloes: number,
            quellen: [...],
            verwendungen: { liquiditaet, gold, aktien },
            steuer: number,
            diagnosisEntries: [...]
        },
        liquiditaet: {
            deckungVorher: number,
            deckungNachher: number
        },
        runway: {
            months: number,
            status: string  // "ok", "warn", "bad"
        }
    }
}
```

---

## Aufgaben

### AUFGABE 1: Rust-Engine erweitern

Die bestehende Rust-Engine (`rust_engine/src/`) muss erweitert werden:

**Neue Exports in `lib.rs`:**

```rust
#[wasm_bindgen]
pub fn engine_get_version() -> JsValue {
    // Return { api: "31", build: "RUST-v1" }
}

#[wasm_bindgen]
pub fn engine_get_config() -> JsValue {
    // Return CONFIG object matching JS structure
}

#[wasm_bindgen]
pub fn engine_analyze_market(input: JsValue) -> JsValue {
    // Wrapper around market::analyze_market
}

#[wasm_bindgen]
pub fn engine_calculate_target_liquidity(
    profil: JsValue,
    market: JsValue,
    inflated_bedarf: JsValue
) -> JsValue {
    // Wrapper around transactions::calculate_target_liquidity
}

#[wasm_bindgen]
pub fn engine_simulate_single_year(
    input: JsValue,
    last_state: JsValue
) -> JsValue {
    // Main function - must return EXACT same structure as JS!
}
```

### AUFGABE 2: JavaScript-Loader erstellen

Erstelle `rust-engine-loader.js`:

```javascript
/**
 * Lädt die Rust/WASM Engine und ersetzt window.EngineAPI
 */

let wasmModule = null;
let wasmReady = false;

async function loadRustEngine() {
    try {
        // Dynamischer Import des WASM-Moduls
        const wasm = await import('./pkg/rust_engine.js');
        await wasm.default();  // WASM initialisieren

        wasmModule = wasm;
        wasmReady = true;

        console.log('[RustEngine] WASM loaded successfully');
        return true;
    } catch (e) {
        console.error('[RustEngine] Failed to load WASM:', e);
        return false;
    }
}

// Rust-basierte EngineAPI
const RustEngineAPI = {
    getVersion: function() {
        if (!wasmReady) throw new Error('WASM not loaded');
        return wasmModule.engine_get_version();
    },

    getConfig: function() {
        if (!wasmReady) throw new Error('WASM not loaded');
        return wasmModule.engine_get_config();
    },

    analyzeMarket: function(input) {
        if (!wasmReady) throw new Error('WASM not loaded');
        return wasmModule.engine_analyze_market(input);
    },

    calculateTargetLiquidity: function(profil, market, inflatedBedarf) {
        if (!wasmReady) throw new Error('WASM not loaded');
        return wasmModule.engine_calculate_target_liquidity(profil, market, inflatedBedarf);
    },

    simulateSingleYear: function(input, lastState) {
        if (!wasmReady) throw new Error('WASM not loaded');
        return wasmModule.engine_simulate_single_year(input, lastState || null);
    }
};

// Engine ersetzen sobald WASM geladen
loadRustEngine().then(success => {
    if (success) {
        window.EngineAPI = RustEngineAPI;
        console.log('[RustEngine] window.EngineAPI replaced with Rust implementation');
    } else {
        console.warn('[RustEngine] Falling back to JS engine');
    }
});

export { loadRustEngine, RustEngineAPI };
```

### AUFGABE 3: HTML anpassen

In `Simulator.html` und `Balance.html` den Loader vor der Engine laden:

```html
<!-- VORHER -->
<script type="module" src="engine.js"></script>

<!-- NACHHER -->
<script type="module" src="rust-engine-loader.js"></script>
<script type="module" src="engine.js"></script>
```

Der Loader lädt WASM asynchron. Falls erfolgreich, wird `window.EngineAPI` ersetzt.
Falls fehlgeschlagen, bleibt die JS-Engine aktiv (Fallback).

---

## Kritische Return-Struktur

Die Rust-Funktion `engine_simulate_single_year` MUSS exakt diese Struktur zurückgeben:

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulateYearResult {
    pub input: SimulationInput,
    pub new_state: SimulationState,
    pub diagnosis: Diagnosis,
    pub ui: UiResult,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UiResult {
    pub depotwert_gesamt: f64,
    pub neuer_bedarf: f64,
    pub min_gold: f64,
    pub ziel_liquiditaet: f64,
    pub market: MarketAnalysisResult,
    pub spending: SpendingResult,
    pub action: TransactionAction,
    pub liquiditaet: LiquiditaetStatus,
    pub runway: RunwayStatus,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LiquiditaetStatus {
    pub deckung_vorher: f64,
    pub deckung_nachher: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunwayStatus {
    pub months: f64,
    pub status: String,  // "ok", "warn", "bad"
}
```

---

## Validierung

### Parity-Test

```javascript
// Test: JS vs Rust Ergebnisse vergleichen
const jsResult = JSEngineAPI.simulateSingleYear(testInput, testState);
const rustResult = RustEngineAPI.simulateSingleYear(testInput, testState);

// Vergleiche alle Felder
assert(jsResult.ui.depotwertGesamt === rustResult.ui.depotwertGesamt);
assert(jsResult.ui.zielLiquiditaet === rustResult.ui.zielLiquiditaet);
assert(jsResult.newState.flexRate === rustResult.newState.flexRate);
// etc.
```

### Akzeptanzkriterien

1. ✅ `cargo test` besteht
2. ✅ WASM-Build funktioniert
3. ✅ Simulator.html lädt ohne Fehler
4. ✅ Balance.html lädt ohne Fehler
5. ✅ Parity-Test: <0.1% Abweichung zu JS-Engine
6. ✅ Monte Carlo läuft mit Rust-Engine

---

## Build-Prozess

```bash
# 1. Rust-Engine bauen
cd rust_engine
wasm-pack build --target web --out-dir ../pkg

# 2. In Browser testen
# Öffne Simulator.html
# Console: "RustEngine WASM loaded successfully"
# Console: "window.EngineAPI replaced with Rust implementation"
```

---

## Vorteile dieses Ansatzes

1. **Keine UI-Änderungen** - Simulator.html und Balance.html bleiben unverändert
2. **Eine Engine** - Konsistente Ergebnisse überall
3. **Fallback** - Bei WASM-Problemen funktioniert die JS-Engine
4. **Schrittweise Migration** - Einzelne Funktionen können nacheinander portiert werden
5. **Performance** - Monte Carlo profitiert sofort von WASM-Geschwindigkeit
