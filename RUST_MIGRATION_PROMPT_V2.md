# Rust Migration Prompt V2 - Nächste Schritte

## Aktueller Status

Die Rust/WASM-Migration ist in **Phase 3** und folgende Features sind implementiert:

| Phase | Status | Features |
|-------|--------|----------|
| Phase 1 | ✅ | Core Simulation PoC |
| Phase 2 | ✅ | Backtest Engine (Multi-Jahr) |
| Phase 3 | 🔄 | Monte Carlo + Surplus-Logik (mit Bugs) |

### Repository-Struktur
```
Ruhestand-App-Final/
├── rust_engine/src/
│   ├── lib.rs              # WASM-Interfaces (3 Funktionen)
│   ├── simulation.rs       # Monte Carlo Engine (240 LOC) - NEU
│   ├── backtest.rs         # Historischer Backtest (660 LOC)
│   ├── core.rs             # Haupt-Simulationslogik
│   ├── transactions.rs     # Refill/Surplus-Logik - AKTUALISIERT
│   ├── spending.rs         # Flex-Rate, Guardrails
│   ├── tax.rs              # Deutsche Steuerberechnung
│   ├── market.rs           # Marktszenarien
│   ├── types.rs            # Datenstrukturen
│   ├── config.rs           # Konstanten
│   └── validation.rs       # Input-Validierung
├── monte-carlo-runner.mjs  # Test-Runner für MC - NEU
└── backtest-runner.mjs     # Test-Runner für Backtest
```

---

## 🚨 KRITISCHE AUFGABE 1: Kompilierungsfehler beheben

### Problem
Die Tests in `backtest.rs` kompilieren nicht, weil das neue Feld `gold_eur_perf` fehlt.

### Fehlermeldung
```
error[E0063]: missing field `gold_eur_perf` in initializer of `HistoricalMarketData`
  --> src/backtest.rs:690-692
```

### Lösung
In `backtest.rs` die Test-Daten aktualisieren. Das Struct sieht jetzt so aus:

```rust
pub struct HistoricalMarketData {
    pub year: u32,
    pub market_index: f64,
    pub inflation: f64,
    pub cape_ratio: Option<f64>,
    pub gold_eur_perf: Option<f64>,  // NEU - muss in Tests hinzugefügt werden
}
```

### Zu ändernde Stellen in `backtest.rs`

**Test 1: `test_backtest_bull_market` (ca. Zeile 680-700)**
```rust
// VORHER:
HistoricalMarketData { year: 2020, market_index: 100.0, inflation: 2.0, cape_ratio: Some(25.0) },

// NACHHER:
HistoricalMarketData { year: 2020, market_index: 100.0, inflation: 2.0, cape_ratio: Some(25.0), gold_eur_perf: Some(5.0) },
```

Füge `gold_eur_perf: Some(X.X)` oder `gold_eur_perf: None` zu ALLEN `HistoricalMarketData` Instanzen in den Tests hinzu:
- `test_backtest_bull_market` (5 Einträge)
- `test_backtest_bear_market` (5 Einträge)
- `test_asset_tracking_accuracy` (3 Einträge)

### Validierung
```bash
cd rust_engine && cargo test
```
Alle Tests müssen grün sein.

---

## 🚨 KRITISCHE AUFGABE 2: Monte Carlo Performance-Optimierung

### Problem
In `simulation.rs` wird in jeder MC-Iteration JSON geparst:

```rust
// simulation.rs:117 - LANGSAM!
let ui: serde_json::Value = serde_json::from_str(&result.ui).unwrap_or(serde_json::Value::Null);
```

Bei 10.000 Simulationen × 30 Jahre = 300.000 JSON-Parsing-Operationen!

### Lösung: Strukturierte Rückgabe

**Option A: Neue Funktion in `core.rs`**

Erstelle eine neue Funktion, die strukturierte Daten zurückgibt:

```rust
// core.rs - NEU
pub struct CoreResult {
    pub depot_gesamt: f64,
    pub liquiditaet_nachher: f64,
    pub ziel_liquiditaet: f64,
    pub action_type: String,
    pub sell_amount: f64,
    pub invest_aktien: f64,
    pub invest_gold: f64,
    pub new_state: SimulationState,
}

pub fn calculate_model_fast(
    input: &SimulationInput,
    last_state: Option<&SimulationState>
) -> Result<CoreResult, String> {
    // Gleiche Logik wie calculate_model, aber ohne JSON-Serialisierung
}
```

**Option B: Direktes Struct-Feld in SimulationResult**

```rust
// types.rs - Erweitern
pub struct SimulationResult {
    pub new_state: SimulationState,
    pub diagnosis: SimulationDiagnosis,
    pub ui: String,  // Für WASM/JS
    pub core_data: Option<CoreData>,  // NEU - Für interne Rust-Nutzung
}

pub struct CoreData {
    pub depot_gesamt: f64,
    pub liquiditaet_nachher: f64,
    pub action_type: String,
    pub sell_amount: f64,
    pub invest_aktien: f64,
    pub invest_gold: f64,
}
```

### Anpassung in `simulation.rs`

```rust
// VORHER (langsam):
let ui: serde_json::Value = serde_json::from_str(&result.ui)?;
let depot_gesamt = ui["depotwertGesamt"].as_f64().unwrap_or(0.0);

// NACHHER (schnell):
let depot_gesamt = result.core_data.as_ref().map(|d| d.depot_gesamt).unwrap_or(0.0);
```

---

## 🔧 AUFGABE 3: Gold-Tracking in Monte Carlo

### Problem
In `simulation.rs:183-186` wird Gold nicht aktualisiert:

```rust
// Aktuell - FEHLERHAFT:
input.depotwert_alt = grown_depot; // Nur Aktien
input.depotwert_neu = 0.0;
input.gold_wert = ???  // FEHLT!
```

### Lösung

```rust
// simulation.rs - run_single_simulation()

// Nach Zeile 176:
let grown_depot = new_depot * market_return;

// Gold-Tracking hinzufügen:
// Gold wächst mit ~Inflation (konservative Annahme)
// oder mit eigenem Gold-Return wenn verfügbar
let gold_growth = 1.0 + (inflation_rate / 100.0);  // Inflation als Proxy
input.gold_wert *= gold_growth;

// Alternativ: Separater Gold-Return im Config
// pub struct MonteCarloConfig {
//     pub historical_gold_returns: Vec<f64>,  // Optional
// }
```

### Vollständige Asset-Update-Logik

```rust
// Am Ende der Jahres-Schleife:
input.depotwert_alt = grown_depot * 0.5;  // Aufteilen für Tax-Tracking?
input.depotwert_neu = grown_depot * 0.5;  // Oder alles in 'alt'?
input.gold_wert *= gold_growth;
input.aktuelle_liquiditaet = Some(final_liq);
input.aktuelles_alter += 1;

// Cost-Basis (vereinfacht für MC):
input.cost_basis_alt = input.depotwert_alt * 0.7;  // Annahme: 30% Gewinn
input.cost_basis_neu = input.depotwert_neu * 0.9;  // Annahme: 10% Gewinn
```

---

## 🧪 AUFGABE 4: Monte Carlo Unit Tests

### Fehlend
`simulation.rs` hat keine Unit Tests!

### Zu implementieren

```rust
// simulation.rs - Am Ende hinzufügen

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SimulationInput;

    fn create_test_input() -> SimulationInput {
        SimulationInput {
            aktuelles_alter: 60,
            risikoprofil: "wachstum".to_string(),
            inflation: 2.0,
            tagesgeld: 50000.0,
            geldmarkt_etf: 0.0,
            aktuelle_liquiditaet: Some(50000.0),
            depotwert_alt: 500000.0,
            depotwert_neu: 0.0,
            gold_aktiv: true,
            gold_wert: 50000.0,
            gold_cost: 40000.0,
            gold_ziel_prozent: 10.0,
            gold_floor_prozent: 5.0,
            floor_bedarf: 30000.0,
            flex_bedarf: 12000.0,
            rente_aktiv: false,
            rente_monatlich: 0.0,
            cost_basis_alt: 400000.0,
            cost_basis_neu: 0.0,
            sparer_pauschbetrag: 1000.0,
            ende_vj: 100.0,
            ende_vj_1: 95.0,
            ende_vj_2: 90.0,
            ende_vj_3: 85.0,
            ath: 100.0,
            jahre_seit_ath: 0.0,
            cape_ratio: Some(20.0),
            runway_min_months: 24.0,
            runway_target_months: 36.0,
            target_eq: 75.0,
            rebal_band: 5.0,
            max_skim_pct_of_eq: 10.0,
            max_bear_refill_pct_of_eq: 20.0,
        }
    }

    #[test]
    fn test_monte_carlo_basic() {
        let input = create_test_input();

        // Konstante Returns für deterministischen Test
        let config = MonteCarloConfig {
            num_simulations: 100,
            years_to_simulate: 10,
            historical_returns: vec![1.07; 20],  // 7% jedes Jahr
            historical_inflation: vec![2.0; 20],
        };

        let result = run_monte_carlo(input, config).unwrap();

        // Bei 7% Rendite und 42k Entnahme sollte Portfolio überleben
        assert!(result.success_rate > 0.9, "Success rate too low: {}", result.success_rate);
        assert!(result.median_final_wealth > 500000.0, "Median wealth too low");
    }

    #[test]
    fn test_monte_carlo_bear_market() {
        let input = create_test_input();

        // Negative Returns
        let config = MonteCarloConfig {
            num_simulations: 100,
            years_to_simulate: 30,
            historical_returns: vec![0.95; 20],  // -5% jedes Jahr
            historical_inflation: vec![3.0; 20],
        };

        let result = run_monte_carlo(input, config).unwrap();

        // Bei -5% Rendite sollte Portfolio irgendwann scheitern
        assert!(result.ruin_probability > 0.5, "Ruin prob too low in bear: {}", result.ruin_probability);
    }

    #[test]
    fn test_monte_carlo_empty_returns() {
        let input = create_test_input();

        let config = MonteCarloConfig {
            num_simulations: 10,
            years_to_simulate: 5,
            historical_returns: vec![],  // LEER
            historical_inflation: vec![2.0],
        };

        let result = run_monte_carlo(input, config);
        assert!(result.is_err(), "Should fail with empty returns");
    }

    #[test]
    fn test_percentile_calculation() {
        let input = create_test_input();

        let config = MonteCarloConfig {
            num_simulations: 1000,
            years_to_simulate: 20,
            historical_returns: vec![1.05, 1.10, 0.90, 1.15, 0.85],  // Varianz
            historical_inflation: vec![2.0, 2.5, 3.0, 1.5, 2.0],
        };

        let result = run_monte_carlo(input, config).unwrap();

        // Percentile-Ordnung prüfen
        assert!(result.percentile_5 <= result.percentile_25);
        assert!(result.percentile_25 <= result.median_final_wealth);
        assert!(result.median_final_wealth <= result.percentile_75);
        assert!(result.percentile_75 <= result.percentile_95);
    }
}
```

---

## 📋 Zusammenfassung der Aufgaben

| # | Aufgabe | Priorität | Dateien | Aufwand |
|---|---------|-----------|---------|---------|
| 1 | Kompilierungsfehler beheben | 🔴 KRITISCH | `backtest.rs` | 5 min |
| 2 | MC Performance-Optimierung | 🟠 HOCH | `core.rs`, `types.rs`, `simulation.rs` | 30 min |
| 3 | Gold-Tracking in MC | 🟡 MITTEL | `simulation.rs` | 15 min |
| 4 | MC Unit Tests | 🟡 MITTEL | `simulation.rs` | 20 min |

---

## Build & Test Befehle

```bash
# 1. Tests ausführen (nach Fix)
cd rust_engine && cargo test

# 2. WASM bauen
wasm-pack build --target web --out-dir ../pkg

# 3. Monte Carlo testen
cd .. && node monte-carlo-runner.mjs

# 4. Backtest testen
node backtest-runner.mjs
```

---

## Wichtige Regeln

1. **Serde**: Alle Structs verwenden `#[serde(rename_all = "camelCase")]`
2. **Fehlerbehandlung**: `Result<T, String>` für WASM-Kompatibilität
3. **Keine Panics**: Alle `.unwrap()` durch `.unwrap_or()` oder `?` ersetzen
4. **Performance**: Keine Allokationen in Hot-Loops
5. **Parallelisierung**: `rayon` nur für Native, nicht WASM

---

## Erwartetes Ergebnis nach Abschluss

1. ✅ `cargo test` läuft ohne Fehler
2. ✅ `cargo test` enthält MC-Tests
3. ✅ MC läuft ~10x schneller (nach Optimierung)
4. ✅ Gold wird in MC korrekt getrackt
5. ✅ WASM-Build funktioniert
6. ✅ `monte-carlo-runner.mjs` zeigt korrekte Ergebnisse
