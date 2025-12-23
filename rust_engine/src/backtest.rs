use crate::types::{SimulationInput, SimulationState};
use crate::core;
use serde::{Deserialize, Serialize};

/// Historische Marktdaten für ein Jahr
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HistoricalMarketData {
    pub year: u32,
    pub market_index: f64,      // S&P 500 oder MSCI World zum Jahresende
    pub inflation: f64,          // Inflation in % für dieses Jahr
    pub cape_ratio: Option<f64>, // Shiller CAPE (optional)
}

/// Konfiguration für Backtest
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BacktestConfig {
    pub start_year: u32,
    pub end_year: u32,
    pub historical_data: Vec<HistoricalMarketData>,
}

/// Snapshot eines einzelnen Jahres
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct YearlySnapshot {
    pub year: u32,
    pub age: u32,
    
    // Vermögenswerte
    pub total_wealth: f64,
    pub liquidity: f64,
    pub depot_value: f64,
    pub gold_value: f64,
    
    // Guardrails
    pub flex_rate: f64,
    pub alarm_active: bool,
    
    // Runway
    pub runway_months: f64,
    pub runway_status: String,
    
    // Markt
    pub market_scenario: String,
    pub market_index: f64,
    pub inflation: f64,
    
    // Transaktionen
    pub transaction_type: String,
    pub withdrawal: f64,
    pub refill_amount: f64,
}

/// Gesamtergebnis des Backtests
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BacktestResult {
    pub success: bool,
    pub final_wealth: f64,
    pub final_age: u32,
    pub years_simulated: u32,
    pub portfolio_depleted_at_age: Option<u32>,
    pub snapshots: Vec<YearlySnapshot>,
    
    // Statistiken
    pub min_wealth: f64,
    pub max_wealth: f64,
    pub total_withdrawals: f64,
    pub avg_flex_rate: f64,
}

/// Haupt-Backtest-Funktion
pub fn run_backtest(
    mut base_input: SimulationInput,
    config: BacktestConfig,
) -> Result<BacktestResult, String> {
    
    // Validierung
    if config.historical_data.is_empty() {
        return Err("Historical data is empty".to_string());
    }
    
    if config.start_year > config.end_year {
        return Err("start_year must be <= end_year".to_string());
    }
    
    let expected_years = (config.end_year - config.start_year + 1) as usize;
    if config.historical_data.len() != expected_years {
        return Err(format!(
            "Historical data length ({}) doesn't match year range ({})",
            config.historical_data.len(), expected_years
        ));
    }
    
    // Initialisierung
    let mut state = SimulationState::default();
    let mut snapshots = Vec::new();
    let start_age = base_input.aktuelles_alter;
    
    let mut portfolio_depleted = false;
    let mut depletion_age = None;
    
    let mut min_wealth = f64::INFINITY;
    let mut max_wealth: f64 = 0.0; // Explicit type
    let mut total_withdrawals = 0.0;
    let mut sum_flex_rates = 0.0;
    
    // Schleife über Jahre
    for (year_index, market_data) in config.historical_data.iter().enumerate() {
        let current_year = market_data.year;
        let current_age = start_age + year_index as u32;
        
        // Input mit historischen Daten aktualisieren
        base_input.aktuelles_alter = current_age;
        base_input.inflation = market_data.inflation;
        
        // Markt-History aufbauen (rollierend, letzte 4 Jahre)
        base_input.ende_vj = market_data.market_index;
        
        if year_index >= 1 {
            base_input.ende_vj_1 = config.historical_data[year_index - 1].market_index;
        }
        if year_index >= 2 {
            base_input.ende_vj_2 = config.historical_data[year_index - 2].market_index;
        }
        if year_index >= 3 {
            base_input.ende_vj_3 = config.historical_data[year_index - 3].market_index;
        }
        
        // ATH berechnen (Maximum aller bisherigen Werte)
        let ath = config.historical_data[0..=year_index]
            .iter()
            .map(|d| d.market_index)
            .fold(0.0, f64::max);
        base_input.ath = ath;
        
        // Jahre seit ATH berechnen
        let mut years_since_ath = 0.0;
        for i in (0..=year_index).rev() {
            if config.historical_data[i].market_index >= ath * 0.99 {
                // Innerhalb 1% von ATH = ATH erreicht
                break;
            }
            years_since_ath += 1.0;
        }
        base_input.jahre_seit_ath = years_since_ath;
        
        base_input.cape_ratio = market_data.cape_ratio;
        
        // Ein Jahr simulieren
        match core::calculate_model(&base_input, Some(&state)) {
            Ok(result) => {
                // UI-String parsen
                let ui: serde_json::Value = serde_json::from_str(&result.ui)
                    .map_err(|e| format!("Failed to parse UI JSON at year {}: {}", current_year, e))?;
                
                // Werte extrahieren
                let depot_gesamt = ui["depotwertGesamt"].as_f64().unwrap_or(0.0);
                let liq_nachher_obj = &ui["liquiditaet"];
                
                // WICHTIG: liquiditaet ist ein Objekt mit deckungVorher/Nachher (Prozent!)
                // Die tatsächliche Liquidität muss aus zielLiquiditaet berechnet werden
                let ziel_liq = ui["zielLiquiditaet"].as_f64().unwrap_or(0.0);
                let deckung_nachher_pct = liq_nachher_obj["deckungNachher"].as_f64().unwrap_or(100.0);
                let liquiditaet_nachher = ziel_liq * (deckung_nachher_pct / 100.0);
                
                let min_gold = ui["minGold"].as_f64().unwrap_or(0.0);
                let flex_rate = ui["flexRate"].as_f64().unwrap_or(100.0);
                let runway_months = ui["runway"]["months"].as_f64().unwrap_or(0.0);
                let runway_status = ui["runway"]["status"].as_str().unwrap_or("unknown").to_string();
                let market_scenario = ui["market"]["sKey"].as_str().unwrap_or("unknown").to_string();
                let action_type = ui["action"]["type"].as_str().unwrap_or("NONE").to_string();
                let total_entnahme = ui["spending"]["totalEntnahme"].as_f64().unwrap_or(0.0);
                
                // Refill-Betrag (wenn vorhanden)
                let refill_amount = if action_type == "TRANSACTION" {
                    ui["action"]["nettoErloes"].as_f64().unwrap_or(0.0)
                } else {
                    0.0
                };
                
                let total_wealth = depot_gesamt + liquiditaet_nachher;
                
                // Statistiken aktualisieren
                min_wealth = min_wealth.min(total_wealth);
                max_wealth = max_wealth.max(total_wealth);
                total_withdrawals += total_entnahme;
                sum_flex_rates += flex_rate;
                
                // Snapshot erstellen
                snapshots.push(YearlySnapshot {
                    year: current_year,
                    age: current_age,
                    total_wealth,
                    liquidity: liquiditaet_nachher,
                    depot_value: depot_gesamt,
                    gold_value: min_gold,
                    flex_rate,
                    alarm_active: result.new_state.alarm_active,
                    runway_months,
                    runway_status,
                    market_scenario,
                    market_index: market_data.market_index,
                    inflation: market_data.inflation,
                    transaction_type: action_type,
                    withdrawal: total_entnahme,
                    refill_amount,
                });
                
                // State für nächstes Jahr übernehmen
                state = result.new_state;
                
                // Ruin-Check
                if total_wealth <= 0.0 {
                    portfolio_depleted = true;
                    depletion_age = Some(current_age);
                    break;
                }
                
                // Input für nächstes Jahr aktualisieren
                // WICHTIG: Hier müsste die tatsächliche Asset-Allocation getrackt werden
                // Für PoC: Vereinfachung - nutze Gesamtwerte
                base_input.depotwert_alt = depot_gesamt; // Vereinfacht
                base_input.aktuelle_liquiditaet = Some(liquiditaet_nachher);
                
                // TODO: Präzises Asset-Tracking (Alt/Neu/Gold separat)
                // Dies erfordert detaillierte Transaktions-Historie
            }
            Err(e) => {
                return Err(format!(
                    "Simulation failed at year {} (age {}): {}",
                    current_year, current_age, e
                ));
            }
        }
    }
    
    let final_wealth = snapshots.last().map(|s| s.total_wealth).unwrap_or(0.0);
    let final_age = snapshots.last().map(|s| s.age).unwrap_or(start_age);
    let avg_flex_rate = if !snapshots.is_empty() {
        sum_flex_rates / snapshots.len() as f64
    } else {
        100.0
    };
    
    Ok(BacktestResult {
        success: !portfolio_depleted,
        final_wealth,
        final_age,
        years_simulated: snapshots.len() as u32,
        portfolio_depleted_at_age: depletion_age,
        snapshots,
        min_wealth,
        max_wealth,
        total_withdrawals,
        avg_flex_rate,
    })
}

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
            gold_aktiv: false,
            gold_wert: 0.0,
            gold_cost: 0.0,
            gold_ziel_prozent: 0.0,
            gold_floor_prozent: 0.0,
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
            ath: 105.0,
            jahre_seit_ath: 0.0,
            cape_ratio: Some(20.0),
            runway_min_months: 24.0,
            runway_target_months: 36.0,
            target_eq: 80.0,
            rebal_band: 5.0,
            max_skim_pct_of_eq: 10.0,
            max_bear_refill_pct_of_eq: 20.0,
        }
    }

    #[test]
    fn test_backtest_bull_market() {
        let input = create_test_input();
        
        let config = BacktestConfig {
            start_year: 2020,
            end_year: 2024,
            historical_data: vec![
                HistoricalMarketData { year: 2020, market_index: 100.0, inflation: 2.0, cape_ratio: Some(25.0) },
                HistoricalMarketData { year: 2021, market_index: 110.0, inflation: 2.5, cape_ratio: Some(27.0) },
                HistoricalMarketData { year: 2022, market_index: 120.0, inflation: 2.0, cape_ratio: Some(28.0) },
                HistoricalMarketData { year: 2023, market_index: 130.0, inflation: 1.8, cape_ratio: Some(29.0) },
                HistoricalMarketData { year: 2024, market_index: 140.0, inflation: 2.2, cape_ratio: Some(30.0) },
            ],
        };

        let result = run_backtest(input, config).unwrap();
        
        assert!(result.success, "Backtest should succeed in bull market");
        assert_eq!(result.years_simulated, 5);
        assert!(result.final_wealth > 0.0);
        assert_eq!(result.snapshots.len(), 5);
        assert!(result.avg_flex_rate > 50.0); // Should maintain decent flex rate
    }

    #[test]
    fn test_backtest_bear_market() {
        let input = create_test_input();
        
        let config = BacktestConfig {
            start_year: 2007,
            end_year: 2011,
            historical_data: vec![
                HistoricalMarketData { year: 2007, market_index: 100.0, inflation: 2.8, cape_ratio: Some(27.0) },
                HistoricalMarketData { year: 2008, market_index: 63.0, inflation: 3.8, cape_ratio: Some(15.0) }, // -37%
                HistoricalMarketData { year: 2009, market_index: 79.0, inflation: -0.4, cape_ratio: Some(20.0) }, // +25%
                HistoricalMarketData { year: 2010, market_index: 91.0, inflation: 1.6, cape_ratio: Some(22.0) },
                HistoricalMarketData { year: 2011, market_index: 91.0, inflation: 3.2, cape_ratio: Some(21.0) },
            ],
        };

        let result = run_backtest(input, config).unwrap();
        
        assert_eq!(result.years_simulated, 5);
        // Check that flex rate was cut during bear
        let min_flex = result.snapshots.iter().map(|s| s.flex_rate).fold(f64::INFINITY, f64::min);
        assert!(min_flex < 80.0, "Flex rate should be cut in bear market");
    }
}
