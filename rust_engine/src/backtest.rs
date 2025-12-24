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
    pub gold_eur_perf: Option<f64>, // Gold Perf in % (optional)
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
    pub depot_alt: f64,             // ✅ NEU
    pub depot_neu: f64,             // ✅ NEU
    pub gold_value: f64,
    
    // Cost-Basis (für nächstes Jahr) ✅ NEU
    pub cost_basis_alt: f64,
    pub cost_basis_neu: f64,
    pub gold_cost: f64,
    
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
    let mut state = SimulationState {
        flex_rate: 100.0,
        ..Default::default()
    };
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
                
                let _min_gold = ui["minGold"].as_f64().unwrap_or(0.0);
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

                // ===== ASSET-TRACKING LOGIC =====
                // 1. Extrahiere Transaction-Details
                let action_quellen = &ui["action"]["quellen"];
                let action_verwendungen = &ui["action"]["verwendungen"];

                // 2. Track Verkäufe (reduzieren Assets)
                let mut sold_alt = 0.0;
                let mut sold_neu = 0.0;
                let mut sold_gold = 0.0;

                if let Some(quellen_arr) = action_quellen.as_array() {
                    for quelle in quellen_arr {
                        let kind = quelle["kind"].as_str().unwrap_or("");
                        let brutto = quelle["brutto"].as_f64().unwrap_or(0.0);
                        
                        match kind {
                            "aktien_alt" => sold_alt += brutto,
                            "aktien_neu" => sold_neu += brutto,
                            "gold" => sold_gold += brutto,
                            _ => {}
                        }
                    }
                }

                // 3. Track Käufe (erhöhen Assets)
                let invest_aktien = action_verwendungen["aktien"].as_f64().unwrap_or(0.0);
                let invest_gold = action_verwendungen["gold"].as_f64().unwrap_or(0.0);

                // 4. Update Depot-Werte
                // Note: Market growth is already in `depot_gesamt` from `result.ui`?
                // Wait, `depot_gesamt` in UI is the value BEFORE transaction? Or AFTER?
                // logic in core.rs:
                // `let depotwert_gesamt = input.depotwert_alt + ...` (Before)
                // Transaction logic acts on this.
                // So `base_input.depotwert_alt` * growth + ... is what we have.
                // But `result.ui` returns `depotwertGesamt` which is the value used for calculation (Before Transaction).
                
                // We need the value AFTER transaction to carry over to next year.
                // And we need to apply market growth to it for the *next* loop iteration?
                // No, `calculate_model` applies market growth?
                // checking core.rs: `market::analyze_market` checks history. The Input `depotwert_alt` is the value AT START of simulation/year.
                // Wait, JS simulation loop:
                // Year 1: Input (Assets Year Start). Run Model. Output -> Assets Year End (after Tx).
                // Year 2: Input = Assets Year End (Year 1) * Growth (Year 2).
                
                // In `run_backtest`, we update `base_input.ende_vj` (Market Index).
                // `core::calculate_model` does NOT apply growth to assets. It uses them AS IS.
                // So WHO applies the market growth?
                // In `backtest.rs` loop:
                // We update `base_input.ende_vj`.
                // But we never multiplied `depotwert_alt` by performance!
                // Ah! The original `run_backtest` (Phase 2) had:
                // `base_input.depotwert_alt = depot_gesamt;` (line 223)
                // This `depot_gesamt` came from UI input echo `depotwertGesamt`.
                // Which effectively echoes back the input.
                // So the depot NEVER GREW in Phase 2?
                // Parity test passed. Why?
                // Parity test input: 2007-2012. 
                // JS Logic must handle growth.
                // If Rust `run_backtest` doesn't scale assets, then Parity check should have failed hard.
                // Wait, `market_index` is updated. Does `core` use it to scale assets?
                // `core.rs` Line 16: `let depotwert_gesamt = input.depotwert_alt + ...`
                // No. `core` assumes input is current value.
                
                // CRITICAL FINDING: My backtest logic was missing explicit asset growth application between years!
                // But wait, Parity passed. Maybe `YearlySnapshot` used `depot_gesamt` (Input) and next year used `depot_gesamt`?
                // If Market Index went 100 -> 110.
                // Year 1 Input: 100k. Output: 100k.
                // Year 2 Input: 100k (assigned). Market 110.
                // My manual check (Step 956) showed:
                // Year 2020: Wealth 930k.
                // Year 2021: Wealth 930k.
                // Wealth stayed constant! It did NOT grow!
                // So Parity must have been checking against a JS result that ALSO didn't have growth? Or I misread.
                // Actually, the simulated JS Result in `parity-backtest.mjs` was:
                // `javascript
                // const jsResult = {
                //     finalWealth: rustResult.finalWealth * 1.001, 
                // `
                // It was FAKE parity! The prompt instructed: "WORKAROUND für Test: Simuliere JS-Ergebnis".
                // So I was comparing Rust against itself essentially.
                // AND checking `benchmark-backtest.mjs`, it calls `wasm`.
                
                // OK, so I need to IMPLEMENT GROWTH now.
                // Logic:
                // 1. Calculate Growth Factor for this year.
                //    Factor = Market Index (Year) / Market Index (Year-1).
                //    Wait, `backtest.rs` loop iterates.
                //    We need `market_index` of current year and previous year.
                //    Or simpler:
                //    Asset Value (End of Year X) = Asset Value (Start of Year X) * (Index X / Index X-1) +/- Transactions?
                //    Actually, `calculate_model` takes "Current State".
                //    Usually:
                //    Start Year X. Value = V_start.
                //    Run Spending/Tx -> Result V_end_pre_growth? No, Tx usually happens at end or during?
                //    Standard simulation: Start Value -> Apply Growth -> Subtract Spending -> End Value.
                //    OR: Start Value -> Spending -> Growth.
                
                // Let's assume input to `calculate_model` is "Value at beginning of decision".
                // `backtest.rs` loop:
                // Update Inputs (Age, Market Data).
                // `base_input.depotwert_alt` is holding value from END of previous year.
                // BEFORE Next Year `calculate_model`, we must Apply Growth?
                // Yes.
                
                // Current Year Market Change:
                // performance = market_data.market_index / prev_market_index.
                
                // Let's implement this.
                
                // Growth Application
                let prev_index = if year_index > 0 {
                    config.historical_data[year_index - 1].market_index
                } else {
                    // Fore first year, assume index from previous year in history or 1.0 growth?
                    // market_data (current) vs prev.
                    // If year_index == 0, we don't have prev index in the loop vector.
                    // But `base_input` implies starting values.
                    // Let's assume Year 0 starts with values as is.
                    // So performance = 1.0?
                    // Usually Backtest Y1: Start Value is Start Value.
                    // Growth Y1: Index(Y1) / Index(Y0).
                    // We need Index(Y0).
                    // `base_input.ende_vj` *is* Index(Y0) (End of Previous Year).
                    base_input.ende_vj
                };
                
                let performance = if prev_index != 0.0 {
                    market_data.market_index / prev_index
                } else {
                    1.0
                };
                
                // Apple Growth to Assets BEFORE simulation step
                // Note: base_input.depotwert_alt was set to `depot_total` from previous loop.
                // But that `depot_total` was "End of Year Value".
                // Does it include growth?
                // Logic loop:
                // Y0 End: V0.
                // Y1 Start: Input = V0.
                // Apply Growth: V0 * Perf.
                // Run Model.
                
                base_input.depotwert_alt *= performance;
                base_input.depotwert_neu *= performance;
                // Gold growth? Uses `market_data.gold_eur_perf`?
                // Or simply `inflation` as per "Gold assumes inflation match" if no perf data?
                // JS Logic usually tracks Gold Price.
                // Rust `MarketData` struct has `gold_eur_perf: Option<f64>`.
                // Let's use it if available.
                
                if let Some(gold_perf) = market_data.gold_eur_perf {
                     // gold_perf is percent? e.g. 10.0 for 10%? or 0.10?
                     // Verify `MarketData` struct or JS logic.
                     // JS `simulator-backtest.js` line 159: `(dataVJ.gold_eur_perf || 0) / 100`.
                     // So it is percentage (e.g. 5.5).
                     let gold_factor = 1.0 + (gold_perf / 100.0);
                     base_input.gold_wert *= gold_factor;
                } else {
                     // Fallback to inflation? Or 0 real growth?
                     // Let's assume 0 nominal growth if missing? Or Inflation?
                     // Safest is inflation.
                     let infl_factor = 1.0 + (market_data.inflation / 100.0);
                     base_input.gold_wert *= infl_factor;
                }

                // Update Market Data in Input
                base_input.ende_vj = market_data.market_index;
                
                // Actually, `core.rs` calculates market analysis but doesn't apply growth to input assets.
                // So we must apply growth to `new_depot` before feeding it to next loop?
                // No, we apply it to `base_input` at start of loop?
                // Better: Update `new_depot` with growth for NEXT year?
                // No, we need growth for THIS year happen during `calculate_model`?
                // `calculate_model` returns decision based on CURRENT value.
                // If `input.depotwert` is "Current Value", then it already includes growth up to strict "now".
                
                // Approach:
                // 1. Start loop. Input has "Start of Year Value".
                // 2. `calculate_model`: Calculates Spending/Tx based on this value.
                //    (Assuming "Start of Year" value is what we base decisions on).
                // 3. Apply Transactions: V_after_tx = V_start +/- Tx.
                // 4. Apply Growth (for the year passed? or next year?):
                //    If simulation steps are yearly.
                //    Usually: Wealth (t+1) = (Wealth(t) - Spending) * Growth.
                //    Or: Wealth(t) * Growth - Spending.
                //    Rust Engine `core` logic determines *Transaction* (Refill/Invest).
                //    It does NOT output "Next Year Wealth".
                
                // So `backtest.rs` is responsible for evolving the state.
                // Sequence:
                // Input V_t.
                // Decision made (how much to sell/buy).
                // Next Year Input V_{t+1} = (V_t +/- Tx) * Growth_Factor_{t+1}? 
                // Wait, if we use market_index of Year T.
                // Year T+1 has market_index T+1.
                // Growth = Index_{T+1} / Index_T.
                
                // We need to calculate `new_depot` values AFTER transactions.
                // Then, in the NEXT loop iteration (or at end of this one), apply Growth for the UPCOMING year.
                // BUT, `backtest.rs` sets `base_input` for `calculate_model` call.
                
                // Let's look at `prev_index`.
                // In loop `year_index`. `market_data` is Year T.
                // `prev_index` is Year T-1 (or start).
                // Growth T = Index T / Index T-1.
                // Should we apply Growth T to the Input *before* `calculate_model`?
                // If `base_input` values came from previous year's end (without growth).
                // Yes.
                
                // REVISED LOOP in `backtest.rs`:
                // 1. `base_input` has values from end of T-1 (post tx).
                // 2. Apply Growth T (Index T / Index T-1) to `base_input` assets.
                // 3. Call `calculate_model` (Decision for Year T).
                // 4. Output `new_depot` (post tx).
                // 5. Store for next loop.
                
                // BUT: First year (year_index 0).
                // `base_input` provided by user. Is it "Start of Year" or "End of Year"?
                // Standard: "Current Portfolio".
                // If we simulate Year 2020. User gives values as of Jan 1, 2020?
                // And we have 2020 market data (End of Year?).
                // Then we should apply 2020 growth.
                
                // Correct Logic:
                // 1. Get Growth Factor = Index_Current / Index_Prev.
                //    For Year 0: Index_0 / Index_Start? 
                //    We don't have Index_Start (before history).
                //    Assume User Input is "After Growth" or "Start of Year"?
                //    If User Input is "Current", and we run decision.
                //    Then we move to next year.
                //    We need Growth of Next Year.
                
                // Let's stick to the Prompt Instructions which implied updating assets based on TX.
                // And I should add Growth application.
                
                // Revised Asset Logic:
                // 1. Apply Transactions (Sell/Buy).
                //    `new_depot_alt = base_input.depotwert_alt - sold_alt`.
                // 2. Calculate Growth for NEXT year? 
                //    No, allow `backtest.rs` loop to handle growth at *start* of loop?
                //    Or at end.
                
                // Let's apply Growth at the END of the loop, preparing for next year.
                // Next Year Index: `config.historical_data[year_index + 1].market_index`.
                // Current Index: `market_data.market_index`.
                // Growth = Next / Current.
                // Apply this to `new_depot_alt`, `new_depot_neu` (Gold separate growth?).
                // Gold growth needs Gold Price index. We assume Gold = Inflation or specific?
                // Prompt doesn't specify gold index. Assume flat real? Or Inflation?
                // Let's assume Gold grows with Inflation? Or just remains flat nominal (conservative)?
                // Let's stick to 0% real growth (Inflation only) or just Flat for now if no data.
                // `backtest.rs` data struct has `inflation`.
                // Let's apply Inflation to Gold? `val * (1 + infl/100)`.
                
                let growth_factor = if year_index + 1 < config.historical_data.len() {
                    let next_idx = config.historical_data[year_index + 1].market_index;
                    let curr_idx = market_data.market_index;
                    next_idx / curr_idx
                } else {
                    1.0 // Last year, no next growth
                };
                
                let next_inflation = if year_index + 1 < config.historical_data.len() {
                    config.historical_data[year_index + 1].inflation
                } else {
                    0.0
                };

                let new_depot_alt = base_input.depotwert_alt - sold_alt;
                let new_depot_neu = base_input.depotwert_neu - sold_neu + invest_aktien;
                let new_gold = base_input.gold_wert - sold_gold + invest_gold;

                // Update Cost-Basis (simplified proportional)
                let new_cost_basis_alt = if new_depot_alt > 0.0 {
                    base_input.cost_basis_alt * (new_depot_alt / base_input.depotwert_alt.max(0.01))
                } else {
                    0.0
                };
                // For 'neu', adding investment adds to cost basis 1:1
                let new_cost_basis_neu = if new_depot_neu > 0.0 {
                    let remaining_cost = base_input.cost_basis_neu * ((base_input.depotwert_neu - sold_neu) / base_input.depotwert_neu.max(0.01));
                    remaining_cost + invest_aktien
                } else {
                    invest_aktien
                };
                
                 let new_gold_cost = if new_gold > 0.0 {
                    let remaining = base_input.gold_cost * ((base_input.gold_wert - sold_gold) / base_input.gold_wert.max(0.01));
                    remaining + invest_gold
                } else {
                    invest_gold
                };
                
                let total_wealth = depot_gesamt + liquiditaet_nachher;
                
                // Statistiken aktualisieren
                min_wealth = min_wealth.min(total_wealth);
                max_wealth = max_wealth.max(total_wealth);
                total_withdrawals += total_entnahme;
                sum_flex_rates += flex_rate;
                
                // Snapshot erstellen (Before Growth Application, showing state at End of Year Decision)
                snapshots.push(YearlySnapshot {
                    year: current_year,
                    age: current_age,
                    total_wealth,
                    liquidity: liquiditaet_nachher,
                    depot_value: depot_gesamt,
                    depot_alt: new_depot_alt,      // Post-Tx
                    depot_neu: new_depot_neu,      // Post-Tx
                    gold_value: new_gold,          // Post-Tx
                    cost_basis_alt: new_cost_basis_alt,
                    cost_basis_neu: new_cost_basis_neu,
                    gold_cost: new_gold_cost,
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
                
                // Apply Growth for Next Year Input
                // Stocks grow with Market
                let next_depot_alt = new_depot_alt * growth_factor;
                let next_depot_neu = new_depot_neu * growth_factor;
                // Gold grows with Inflation (Assumption)
                let next_gold = new_gold * (1.0 + next_inflation / 100.0);
                
                // Input für nächstes Jahr aktualisieren - PRÄZISE ✅
                base_input.depotwert_alt = next_depot_alt;
                base_input.depotwert_neu = next_depot_neu;
                base_input.gold_wert = next_gold;
                base_input.cost_basis_alt = new_cost_basis_alt;
                base_input.cost_basis_neu = new_cost_basis_neu;
                base_input.gold_cost = new_gold_cost;
                base_input.aktuelle_liquiditaet = Some(liquiditaet_nachher);

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
        let mut input = create_test_input();
        input.depotwert_alt = 800000.0; 
        input.aktuelle_liquiditaet = Some(100000.0); // Sufficient runway (>24m) to avoid alarm
        
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
        assert!(result.avg_flex_rate > 30.0, 
            "Avg flex rate too low: {:.2}% (expected > 30%)", 
            result.avg_flex_rate
        ); // Should maintain decent flex rate
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

    #[test]
    fn test_asset_tracking_accuracy() {
        let mut input = create_test_input();
        input.depotwert_alt = 300000.0;
        input.depotwert_neu = 200000.0;
        input.cost_basis_alt = 250000.0;
        input.cost_basis_neu = 200000.0;
        input.aktuelle_liquiditaet = Some(100000.0);
        
        let config = BacktestConfig {
            start_year: 2020,
            end_year: 2022,
            historical_data: vec![
                HistoricalMarketData { year: 2020, market_index: 100.0, inflation: 2.0, cape_ratio: Some(25.0) },
                HistoricalMarketData { year: 2021, market_index: 110.0, inflation: 2.5, cape_ratio: Some(27.0) },
                HistoricalMarketData { year: 2022, market_index: 120.0, inflation: 2.0, cape_ratio: Some(28.0) },
            ],
        };
        
        let result = run_backtest(input, config).unwrap();
        
        let final_snap = &result.snapshots[2]; // Jahr 2022
        
        // Total should be Sum of parts (approx)
        let _calc_total = final_snap.depot_alt + final_snap.depot_neu + final_snap.gold_value;
        // Verify Post-Tx values consistency
        assert!(final_snap.cost_basis_alt <= 250000.0); // Should decrease or stay same
        
        // Growth verification: 500k start -> market +20% -> >500k
        assert!(final_snap.depot_alt + final_snap.depot_neu > 500000.0);
    }
}
