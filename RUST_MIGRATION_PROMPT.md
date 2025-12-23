# Rust Migration Prompt für Gemini/AI-Assistenten

## Projektkontext

Du arbeitest an einer **Ruhestand-Planungs-App** (Retirement Planning App), die eine JavaScript-basierte Simulations-Engine nach **Rust/WASM** migriert. Das Ziel ist eine ~50-100x Performance-Steigerung für Monte-Carlo-Simulationen.

### Repository-Struktur
```
Ruhestand-App-Final/
├── rust_engine/                    # Rust-Crate (WASM-kompiliert)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                  # WASM-Interface
│       ├── types.rs                # Input/Output-Strukturen
│       ├── core.rs                 # Haupt-Simulationslogik
│       ├── backtest.rs             # Multi-Jahr-Backtest (✅ fertig)
│       ├── simulation.rs           # Monte Carlo (⏳ LEER)
│       ├── spending.rs             # Flex-Rate, Guardrails
│       ├── transactions.rs         # Refill/Surplus-Logik
│       ├── tax.rs                  # Deutsche Steuerberechnung
│       ├── market.rs               # Marktszenarien
│       ├── config.rs               # Konstanten
│       └── validation.rs           # Input-Validierung
├── src/
│   └── lib/
│       └── core/                   # Original JavaScript-Engine
├── backtest-runner.mjs             # Test-Runner für Backtest
└── load-wasm.mjs                   # WASM-Loader
```

---

## Aktueller Migrations-Status

### ✅ Abgeschlossene Phasen

**Phase 1 - Initial PoC**: Core-Simulation portiert
**Phase 2 - Backtest Engine**:
- Multi-Jahr-Simulation mit historischen Daten
- ATH-Tracking, Markt-Wachstum
- ~65x schneller als JavaScript
- Asset-Tracking (Alt/Neu/Gold separat)

**Phase 3 - Asset Tracking (begonnen)**:
- Cost-Basis-Fortschreibung
- Depot-Werte pro Tranche

### ⏳ Offene Aufgaben

1. **Surplus-Investitionslogik** in `transactions.rs` (unvollständig)
2. **Monte Carlo Engine** in `simulation.rs` (leer)
3. **Echter Parity-Test** (JS vs Rust Vergleich)

---

## Architektur-Übersicht

### Datenfluss
```
SimulationInput (JS)
    → WASM-Binding (serde_wasm_bindgen)
    → core::calculate_model()
        → market::analyze_market()      # Markt-Szenario bestimmen
        → spending::determine_spending() # Flex-Rate berechnen
        → transactions::determine_action() # Refill/Invest/None
        → tax::calculate_sale_and_tax()  # Steuer bei Verkauf
    → SimulationResult (zurück zu JS)
```

### Markt-Szenarien (`market.rs`)
| Key | Beschreibung | Trigger |
|-----|--------------|---------|
| `peak_hot` | Überhitzter Markt | ATH + Perf >10% |
| `peak_stable` | Stabiler Höchststand | ATH + Perf <10% |
| `bear_deep` | Tiefer Bärenmarkt | Drawdown >20% |
| `recovery_in_bear` | Erholung im Bär | Rally >30% aber noch >15% unter ATH |
| `side_long` | Seitwärtsmarkt | Default |

### Guardrail-System (`spending.rs`)
- **Alarm-Trigger**: Entnahmequote >5.5% ODER realer Drawdown >25%
- **Flex-Rate**: Wird dynamisch zwischen 35%-100% angepasst
- **Smoothing**: Alpha=0.35, max. Änderung 2.5-10pp/Jahr

---

## Wichtige Datenstrukturen

### SimulationInput (types.rs)
```rust
pub struct SimulationInput {
    // Profil
    pub aktuelles_alter: u32,
    pub risikoprofil: String,       // "wachstum", "ausgewogen", "konservativ"

    // Vermögen
    pub tagesgeld: f64,
    pub geldmarkt_etf: f64,
    pub depotwert_alt: f64,         // Aktien vor 2009 (Altbestand)
    pub depotwert_neu: f64,         // Aktien nach 2009
    pub gold_wert: f64,

    // Steuer
    pub cost_basis_alt: f64,
    pub cost_basis_neu: f64,
    pub sparer_pauschbetrag: f64,   // 1000€ Freibetrag

    // Bedarf
    pub floor_bedarf: f64,          // Fixe Ausgaben/Jahr
    pub flex_bedarf: f64,           // Variable Ausgaben/Jahr

    // Marktdaten
    pub ende_vj: f64,               // Marktindex Ende Vorjahr
    pub ende_vj_1: f64,             // ... vor 1 Jahr
    pub ende_vj_2: f64,             // ... vor 2 Jahren
    pub ende_vj_3: f64,             // ... vor 3 Jahren
    pub ath: f64,                   // All-Time-High
    pub jahre_seit_ath: f64,
    pub cape_ratio: Option<f64>,    // Shiller CAPE

    // Strategie
    pub runway_min_months: f64,     // Min. Liquiditäts-Reserve (24)
    pub runway_target_months: f64,  // Ziel-Reserve (36)
    pub target_eq: f64,             // Aktien-Zielquote (z.B. 75%)
}
```

### BacktestConfig (backtest.rs)
```rust
pub struct BacktestConfig {
    pub start_year: u32,
    pub end_year: u32,
    pub historical_data: Vec<HistoricalMarketData>,
}

pub struct HistoricalMarketData {
    pub year: u32,
    pub market_index: f64,
    pub inflation: f64,
    pub cape_ratio: Option<f64>,
}
```

---

## Aufgabe: Monte Carlo Engine implementieren

### Ziel
Implementiere `simulation.rs` mit einer Monte Carlo Engine, die:
1. N Simulationsläufe (z.B. 10.000) durchführt
2. Bootstrap-Sampling von historischen Renditen verwendet
3. Parallelisierung mit `rayon` nutzt
4. Aggregierte Statistiken zurückgibt

### Gewünschte API
```rust
// simulation.rs

pub struct MonteCarloConfig {
    pub num_simulations: u32,       // z.B. 10_000
    pub years_to_simulate: u32,     // z.B. 30
    pub historical_returns: Vec<f64>, // Jährliche Renditen
    pub historical_inflation: Vec<f64>,
}

pub struct MonteCarloResult {
    pub success_rate: f64,          // % der Läufe ohne Ruin
    pub median_final_wealth: f64,
    pub percentile_5: f64,          // Schlechtes Szenario
    pub percentile_25: f64,
    pub percentile_75: f64,
    pub percentile_95: f64,         // Gutes Szenario
    pub ruin_probability: f64,
    pub avg_years_to_ruin: Option<f64>,
}

pub fn run_monte_carlo(
    base_input: SimulationInput,
    config: MonteCarloConfig,
) -> Result<MonteCarloResult, String>;
```

### Implementierungs-Hinweise

1. **Random-Generator**:
   ```toml
   # Cargo.toml - rand aktivieren
   rand = { version = "0.8", features = ["std_rng"] }
   ```

2. **Parallelisierung**:
   ```rust
   use rayon::prelude::*;

   let results: Vec<_> = (0..config.num_simulations)
       .into_par_iter()
       .map(|_| run_single_simulation(&base_input, &config))
       .collect();
   ```

3. **Bootstrap-Sampling**:
   ```rust
   // Zufällige Rendite aus historischen Daten
   let idx = rng.gen_range(0..config.historical_returns.len());
   let yearly_return = config.historical_returns[idx];
   ```

4. **Ruin-Erkennung**:
   - Portfolio ist ruiniert wenn `total_wealth <= 0`
   - Tracke Alter bei Ruin für Statistiken

5. **WASM-Interface** in `lib.rs`:
   ```rust
   #[cfg(target_arch = "wasm32")]
   #[wasm_bindgen]
   pub fn run_monte_carlo_wasm(
       input_val: JsValue,
       config_val: JsValue
   ) -> Result<JsValue, JsValue> { ... }
   ```

---

## Aufgabe: Surplus-Investitionslogik vervollständigen

### Aktuelle Lücke in `transactions.rs:106-114`
```rust
// SURPLUS (Invest)
let surplus = -raw_gap;
let min_trade = 25000.0;
if surplus > min_trade && !market.s_key.contains("bear") {
     // TODO: Allocation logic
}
```

### Gewünschte Logik
1. Berechne Ziel-Allokation basierend auf `input.target_eq` und `input.gold_ziel_prozent`
2. Verteile Surplus proportional auf Aktien (→ `depotwert_neu`) und Gold
3. Aktualisiere Cost-Basis (Kauf = 1:1 zu Cost-Basis)
4. Gib `TransactionAction` mit `verwendungen.aktien` und `verwendungen.gold` zurück

---

## Build & Test Befehle

```bash
# Rust-Engine bauen (WASM)
cd rust_engine
wasm-pack build --target web --out-dir ../pkg

# Tests ausführen
cargo test

# Backtest-Runner
cd ..
node backtest-runner.mjs
```

---

## Wichtige Regeln

1. **Serde-Konvention**: Alle structs verwenden `#[serde(rename_all = "camelCase")]`
2. **Fehlerbehandlung**: Verwende `Result<T, String>` für WASM-Kompatibilität
3. **Keine Panics**: Alle Fehler müssen graceful behandelt werden
4. **Deutsche Steuern**: KESt = 25% + 5.5% Soli, TQF für Aktienfonds = 30% (→ 0.15 effektiv)
5. **Quantisierung**: Große Beträge auf 5k/10k/25k runden (Anti-Pseudo-Genauigkeit)

---

## Kontext-Dateien zum Lesen

Vor der Implementierung diese Dateien lesen:
1. `rust_engine/src/backtest.rs` - Referenz für Jahres-Simulation
2. `rust_engine/src/core.rs` - Wie `calculate_model` funktioniert
3. `rust_engine/src/types.rs` - Alle Datenstrukturen
4. `rust_engine/src/transactions.rs` - Wo Surplus-Logik fehlt

---

## Erwartetes Ergebnis

Nach Abschluss sollte:
1. `simulation.rs` eine funktionierende Monte Carlo Engine enthalten
2. `transactions.rs` die Surplus-Investitionslogik vollständig implementieren
3. `lib.rs` ein WASM-Interface `run_monte_carlo_wasm` exportieren
4. Alle `cargo test` bestehen
5. Ein neuer Test-Runner `monte-carlo-runner.mjs` existieren
