use crate::types::{SimulationInput, SimulationState};
use crate::core;
use serde::{Deserialize, Serialize};
#[cfg(not(target_arch = "wasm32"))]
use rayon::prelude::*;
use rand::prelude::*;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MonteCarloConfig {
    pub num_simulations: u32,
    pub years_to_simulate: u32,
    pub historical_returns: Vec<f64>, // Annual returns (e.g. 1.07 for 7%)
    pub historical_inflation: Vec<f64>, // Annual inflation (e.g. 2.0 for 2%)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MonteCarloResult {
    pub success_rate: f64,
    pub median_final_wealth: f64,
    pub percentile_5: f64,
    pub percentile_25: f64,
    pub percentile_75: f64,
    pub percentile_95: f64,
    pub ruin_probability: f64,
    pub avg_years_to_ruin: Option<f64>,
}

pub fn run_monte_carlo(
    base_input: SimulationInput,
    config: MonteCarloConfig,
) -> Result<MonteCarloResult, String> {
    if config.historical_returns.is_empty() {
        return Err("No historical returns provided".to_string());
    }

    // Determine parallelism based on architecture
    let results: Vec<SimulationRunResult> = execute_simulations(&base_input, &config);

    // Aggregate results
    calculate_statistics(results, config.num_simulations)
}

struct SimulationRunResult {
    final_wealth: f64,
    ruined: bool,
    years_to_ruin: Option<u32>,
}

#[cfg(not(target_arch = "wasm32"))]
fn execute_simulations(input: &SimulationInput, config: &MonteCarloConfig) -> Vec<SimulationRunResult> {
    (0..config.num_simulations)
        .into_par_iter()
        .map(|_| run_single_simulation(input.clone(), config)) // input.clone() is cheap enough?
        .collect()
}

#[cfg(target_arch = "wasm32")]
fn execute_simulations(input: &SimulationInput, config: &MonteCarloConfig) -> Vec<SimulationRunResult> {
    (0..config.num_simulations)
        .map(|_| run_single_simulation(input.clone(), config))
        .collect()
}

fn run_single_simulation(mut input: SimulationInput, config: &MonteCarloConfig) -> SimulationRunResult {
    let mut rng = rand::thread_rng();
    let mut state = SimulationState {
        flex_rate: 100.0,
        ..Default::default()
    };
    
    let mut ruined = false;
    let mut years_to_ruin = None;

    for year in 0..config.years_to_simulate {
        // Bootstrap Sampling
        let idx = rng.gen_range(0..config.historical_returns.len());
        let market_return = config.historical_returns[idx];
        let inflation_rate = config.historical_inflation[idx];

        // Apply Market Growth BEFORE Decision (similar to Backtest Logic Findings)
        // Wait, input contains "Current Assets". 
        // If we step forward, we first Grow, then Transact? Or Transact then Grow?
        // Decisions are usually made on "Start of Year" values.
        // But if `market_return` is for THIS year.
        // We should apply it to `input` before next year or at end of this year.
        
        // Loop:
        // 1. Update Market Context (randomly sampled)
        //    For MC, we don't have perfect "Market Analysis" indicators like CAPE or ATH from history.
        //    We must simulate them or disable checking them?
        //    The `core` logic relies on `jahre_seit_ath`. 
        //    We need to track virtual ATH.
        
        let current_index = input.ende_vj * market_return; // Simulate index evolution
        if current_index > input.ath {
            input.ath = current_index;
            input.jahre_seit_ath = 0.0;
        } else {
            input.jahre_seit_ath += 1.0;
        }
        input.ende_vj = current_index;
        input.inflation = inflation_rate;

        // Run Core Logic
        match core::calculate_model(&input, Some(&state)) {
            Ok(result) => {
                // Optimization: Use CoreData if available (always true in native)
                let core_data = result.core_data.as_ref().expect("CoreData missing");
                
                let liquiditaet_nachher = core_data.liquiditaet_nachher;
                 // new_depot_total calculation removed as it was unused and replaced by next_depot_alt/neu logic
                                      
                // Split back new depot roughly?
                // Simplification for MC: 
                // We don't strictly separate Alt/Neu growth in Input struct beyond passing it in.
                // We should respect the split if possible.
                // But `depot_gesamt` is sum.
                // Let's rely on `sell_amount` breakdown.
                
                let mut next_depot_alt = input.depotwert_alt - core_data.sell_amount_aktien_alt;
                let mut next_depot_neu = input.depotwert_neu - core_data.sell_amount_aktien_neu + core_data.invest_aktien;
                
                let mut next_gold = input.gold_wert - core_data.sell_amount_gold + core_data.invest_gold;
                
                let new_total_wealth = next_depot_alt + next_depot_neu + next_gold + liquiditaet_nachher;
                
                if new_total_wealth <= 0.0 {
                    ruined = true;
                    years_to_ruin = Some(year);
                    break; 
                }
                
                // Update State
                state = result.new_state;

                // Prepare Input for Next Year
                // Grow the depot (Assets)
                // Note: `market_return` was sampled for THIS year and used to update index.
                // But `calculate_model` uses values at START of year (essentially).
                // So we should apply growth to carry over to NEXT year.
                // `market_return` is the performance OF this year.
                
                next_depot_alt *= market_return;
                next_depot_neu *= market_return;
                
                // Gold Tracking
                // Use inflation as proxy for gold growth if no explicit data
                let gold_growth = 1.0 + (inflation_rate / 100.0);
                next_gold *= gold_growth;

                input.depotwert_alt = next_depot_alt;
                input.depotwert_neu = next_depot_neu; 
                input.gold_wert = next_gold;
                input.aktuelle_liquiditaet = Some(liquiditaet_nachher);
                input.aktuelles_alter += 1;
            }
            Err(_) => {
                ruined = true; 
                break;
            }
        }
    }

    // Final wealth is sum of last state
    let final_wealth = input.depotwert_alt + input.depotwert_neu + input.gold_wert + input.aktuelle_liquiditaet.unwrap_or(0.0);

    SimulationRunResult {
        final_wealth,
        ruined,
        years_to_ruin,
    }
}

fn calculate_statistics(mut results: Vec<SimulationRunResult>, num_sims: u32) -> Result<MonteCarloResult, String> {
    if results.is_empty() {
        return Err("No results generated".to_string());
    }

    let ruined_count = results.iter().filter(|r| r.ruined).count();
    let success_rate = 1.0 - (ruined_count as f64 / num_sims as f64);
    let ruin_probability = 1.0 - success_rate;

    results.sort_by(|a, b| a.final_wealth.partial_cmp(&b.final_wealth).unwrap());

    let percentile = |p: f64| {
        let idx = (p * (results.len() as f64 - 1.0)) as usize;
        results[idx].final_wealth
    };

    let avg_years_to_ruin = if ruined_count > 0 {
        let sum_years: u32 = results.iter().filter_map(|r| r.years_to_ruin).sum();
        Some(sum_years as f64 / ruined_count as f64)
    } else {
        None
    };

    Ok(MonteCarloResult {
        success_rate,
        median_final_wealth: percentile(0.50),
        percentile_5: percentile(0.05),
        percentile_25: percentile(0.25),
        percentile_75: percentile(0.75),
        percentile_95: percentile(0.95),
        ruin_probability,
        avg_years_to_ruin,
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
        let mut input = create_test_input();
        input.depotwert_alt = 800000.0; // Increase to safe WR level (~5%)

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
