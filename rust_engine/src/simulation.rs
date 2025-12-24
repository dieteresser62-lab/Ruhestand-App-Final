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
                // Parse Result to get Transactions/Spending
                // Optimization: core could return structured data instead of JSON string
                // But for now we parse JSON (Perf hit? Maybe. But `core` is fast).
                // Actually `core` returns `SimulationResult`.
                // Wait, `calculate_model` returns `SimulationResult` which *contains* `ui` string.
                // We need to parse it to get `action`. This is suboptimal for MC.
                // But let's stick to valid logic first.
                
                let ui: serde_json::Value = serde_json::from_str(&result.ui).unwrap_or(serde_json::Value::Null);
                
                let liquiditaet_nachher_obj = &ui["liquiditaet"];
                let ziel_liq = ui["zielLiquiditaet"].as_f64().unwrap_or(0.0);
                let deckung_nachher_pct = liquiditaet_nachher_obj["deckungNachher"].as_f64().unwrap_or(100.0);
                let liquiditaet_nachher = ziel_liq * (deckung_nachher_pct / 100.0);
                
                let depot_gesamt = ui["depotwertGesamt"].as_f64().unwrap_or(0.0);
                
                // Transactions
                let action_details = &ui["action"];
                // We need to know net flow to update assets.
                // Simplified Asset Tracking for MC:
                // We track Total Wealth split roughly?
                // Or try to replicate `backtest.rs` precision?
                // `backtest.rs` logic is complex parsing.
                // For MC speed, maybe simplify?
                // Total Wealth = Depot + Liq.
                // Next Year Wealth = (Depot +/- Tx) * Growth + Liq.
                
                // Let's grab `depotwertGesamt` from UI (this is pre-tx).
                // Apply Tx.
                let action_type = action_details["type"].as_str().unwrap_or("NONE");
                
                let mut invest_amount = 0.0;
                let mut sell_amount = 0.0;
                
                if action_type == "TRANSACTION" {
                     let quellen = action_details["quellen"].as_array();
                     if let Some(q) = quellen {
                         for item in q {
                             sell_amount += item["brutto"].as_f64().unwrap_or(0.0);
                         }
                     }
                     let verwendungen = &action_details["verwendungen"];
                     invest_amount += verwendungen["aktien"].as_f64().unwrap_or(0.0);
                     invest_amount += verwendungen["gold"].as_f64().unwrap_or(0.0);
                }
                
                let new_depot = depot_gesamt - sell_amount + invest_amount;
                let new_total_wealth = new_depot + liquiditaet_nachher;
                
                if new_total_wealth <= 0.0 {
                    ruined = true;
                    years_to_ruin = Some(year);
                    break; 
                }
                
                // Update State
                state = result.new_state;

                // Prepare Input for Next Year
                // Grow the depot (Assets)
                // Note: `market_return` is for THIS year? 
                // Usually MC samples "Next Year Return".
                // We simulate Year 1. We sample Return 1.
                // Returns 1.07.
                // We apply this to assets for next loop?
                // Yes.
                let grown_depot = new_depot * market_return;
                let final_liq = liquiditaet_nachher; // Cash doesn't grow? Or risk-free rate?
                // Assume 0% real or inflation match? 
                // Let's assume cash is flat for safety or matches inflation.
                // Input tracks `tagesgeld`, `geldmarkt_etf`. 
                // Let's assume flat for now to be conservative.

                input.depotwert_alt = grown_depot; // Simplify: put all in 'alt' or track mix? 
                // For MC, cost basis taxes matters less? 
                // Use `depotwert_alt` as main bucket.
                input.depotwert_neu = 0.0; 
                input.aktuelle_liquiditaet = Some(final_liq);
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
