use crate::types::{SimulationInput, SimulationState, SpendingResult, MarketAnalysisResult};
use crate::config::{SPENDING_MODEL, ALARM_THRESHOLDS, CONFIG_THRESHOLDS_STRATEGY, get_regime_for_scenario};
use std::collections::HashMap;

pub struct SpendingPlanResult {
    pub spending_result: SpendingResult,
    pub new_state: SimulationState,
    pub diagnosis: HashMap<String, serde_json::Value>, 
}

// Helper to contain logic context
struct SpendingContext<'a> {
    _market: &'a MarketAnalysisResult,
    _input: &'a SimulationInput,
    inflated_bedarf_floor: f64,
    inflated_bedarf_flex: f64,
    _runway_monate: f64,
    depotwert_gesamt: f64,
    gesamtwert: f64,
    _rente_jahr: f64,
}

fn initialize_or_load_state(last_state: Option<&SimulationState>, ctx: &SpendingContext) -> SimulationState {
    if let Some(state) = last_state {
        // Recalculate derived params based on current values
        let cumulative_inflation_factor = if state.cumulative_inflation_factor > 0.0 { state.cumulative_inflation_factor } else { 1.0 };
        let real_vermoegen = ctx.gesamtwert / cumulative_inflation_factor;
        let peak_real_vermoegen = state.peak_real_vermoegen.max(real_vermoegen);
        
        // Return updated state structure (Rust doesn't store derived keyParams in struct, calculates on fly usually, 
        // but strict mirroring matches JS structure)
        return SimulationState {
            flex_rate: state.flex_rate,
            peak_real_vermoegen,
            cumulative_inflation_factor,
            alarm_active: state.alarm_active,
            years_in_bear: state.years_in_bear,
            last_inflation_applied_at_age: state.last_inflation_applied_at_age,
            // ...
        };
    }

    // Init new
    SimulationState {
        flex_rate: 100.0,
        peak_real_vermoegen: ctx.gesamtwert,
        cumulative_inflation_factor: 1.0,
        alarm_active: false,
        years_in_bear: 0,
        last_inflation_applied_at_age: 0,
    }
}

pub fn determine_spending(
    last_state: Option<&SimulationState>,
    market: &MarketAnalysisResult,
    input: &SimulationInput,
    inflated_bedarf_floor: f64,
    inflated_bedarf_flex: f64,
    runway_monate: f64,
    depotwert_gesamt: f64,
    gesamtwert: f64,
    rente_jahr: f64
) -> SpendingPlanResult {
    
    let ctx = SpendingContext {
        _market: market, 
        _input: input, 
        inflated_bedarf_floor, 
        inflated_bedarf_flex, 
        _runway_monate: runway_monate, 
        depotwert_gesamt, 
        gesamtwert, 
        _rente_jahr: rente_jahr
    };

    let mut state = initialize_or_load_state(last_state, &ctx);

    // Calc key metrics
    let vorlaeufige_entnahme = ctx.inflated_bedarf_floor + (ctx.inflated_bedarf_flex * (state.flex_rate / 100.0));
    let entnahmequote_depot = if ctx.depotwert_gesamt > 0.0 { vorlaeufige_entnahme / ctx.depotwert_gesamt } else { 0.0 };
    let real_vermoegen = ctx.gesamtwert / state.cumulative_inflation_factor;
    let realer_depot_drawdown = if state.peak_real_vermoegen > 0.0 { (state.peak_real_vermoegen - real_vermoegen) / state.peak_real_vermoegen } else { 0.0 };

    // 2. Alarm Evaluation
    // De-escalation
    let mut alarm_active = state.alarm_active;
    if alarm_active {
        // Peak De-escalation
        if ["peak_hot", "peak_stable", "side_long"].contains(&market.s_key.as_str()) {
             if entnahmequote_depot <= ALARM_THRESHOLDS.withdrawal_rate || realer_depot_drawdown <= 0.15 {
                 alarm_active = false;
             }
        }
        // Recovery De-escalation
        else if market.s_key == "recovery_in_bear" {
             let min_runway = input.runway_min_months + 6.0; // Approximation of profile logic
             let ok_runway = runway_monate >= min_runway;
             let ok_drawdown = realer_depot_drawdown <= (ALARM_THRESHOLDS.real_drawdown - 0.05);
             if entnahmequote_depot <= ALARM_THRESHOLDS.withdrawal_rate || ok_runway || ok_drawdown {
                 alarm_active = false;
             }
        }
    }

    // Trigger Alarm
    let is_crisis = market.s_key == "bear_deep";
    let is_runway_thin = runway_monate < CONFIG_THRESHOLDS_STRATEGY.runway_thin_months;
    let is_quote_critical = entnahmequote_depot > ALARM_THRESHOLDS.withdrawal_rate;
    let is_drawdown_critical = realer_depot_drawdown > ALARM_THRESHOLDS.real_drawdown;

    if !alarm_active && is_crisis && ((is_quote_critical && is_runway_thin) || is_drawdown_critical) {
        alarm_active = true;
    }

    // 3. Flex Rate Calculation
    let mut glatte_flex_rate; // = state.flex_rate; // logic assigns it below
    let mut _kuerzung_quelle = "Profil".to_string();

    if alarm_active {
        _kuerzung_quelle = "Guardrail (Alarm)".to_string();
        // Simply hold or cut logic (simplified port)
        glatte_flex_rate = if alarm_active && !state.alarm_active {
            // Newly triggered
             (state.flex_rate - 10.0).max(35.0)
        } else {
             state.flex_rate.max(35.0)
        };
    } else {
        // Normal smoothing
        let mut rohe_kuerzung = 0.0;
        if market.s_key == "bear_deep" {
             rohe_kuerzung = 50.0 + (market.abstand_vom_ath_prozent - 20.0).max(0.0);
             _kuerzung_quelle = "Tiefer Bär".to_string();
        }
        let rohe_rate = 100.0 - rohe_kuerzung;
        
        // Smoothing
        glatte_flex_rate = SPENDING_MODEL.flex_rate_smoothing_alpha * rohe_rate + (1.0 - SPENDING_MODEL.flex_rate_smoothing_alpha) * state.flex_rate;
        
        // Rate Change logic
        let delta = glatte_flex_rate - state.flex_rate;
        let regime = get_regime_for_scenario(&market.s_key);
        
        let max_up = if ["peak", "hot_neutral", "recovery_in_bear"].contains(&regime) { SPENDING_MODEL.rate_change_agile_up_pp } else { SPENDING_MODEL.rate_change_max_up_pp };
        let max_down = if market.s_key == "bear_deep" { SPENDING_MODEL.rate_change_max_down_in_bear_pp } else { SPENDING_MODEL.rate_change_max_down_pp };

        if delta > max_up {
            glatte_flex_rate = state.flex_rate + max_up;
            _kuerzung_quelle = "Glättung (Anstieg)".to_string();
        } else if delta < -max_down {
            glatte_flex_rate = state.flex_rate - max_down;
            _kuerzung_quelle = "Glättung (Abfall)".to_string();
        }
    }

    // 4. Guardrails (Simplified port for now)
    // Recovery Guardrail
    if market.s_key == "recovery_in_bear" {
        let max_flex = 80.0; // Simplified curve
        if glatte_flex_rate > max_flex {
            glatte_flex_rate = max_flex;
            _kuerzung_quelle = "Guardrail (Vorsicht)".to_string();
        }
    }

    // 5. Final Calculation
    let raw_entnahme = ctx.inflated_bedarf_floor + (ctx.inflated_bedarf_flex * (glatte_flex_rate.clamp(0.0, 100.0) / 100.0));
    let endgueltige_entnahme = raw_entnahme; // Skip quantization for now

    // Update State
    state.flex_rate = glatte_flex_rate;
    state.alarm_active = alarm_active;
    state.peak_real_vermoegen = state.peak_real_vermoegen.max(real_vermoegen);

    SpendingPlanResult {
        spending_result: SpendingResult {
            flex_rate: glatte_flex_rate,
            flex_verwendung: 0.0, // TODO
            total_entnahme: endgueltige_entnahme,
            entnahme_depot: 0.0, // Calculated later in TransactionEngine
        },
        new_state: state,
        diagnosis: HashMap::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SimulationInput;

    fn create_mock_input() -> SimulationInput {
        SimulationInput {
            aktuelles_alter: 60,
            risikoprofil: "wachstum".to_string(),
            inflation: 2.0,
            tagesgeld: 0.0,
            geldmarkt_etf: 0.0,
            aktuelle_liquiditaet: Some(0.0),
            depotwert_alt: 0.0,
            depotwert_neu: 0.0,
            gold_aktiv: false,
            gold_wert: 0.0,
            gold_cost: 0.0,
            gold_ziel_prozent: 0.0,
            gold_floor_prozent: 0.0,
            floor_bedarf: 24000.0,
            flex_bedarf: 10000.0,
            rente_aktiv: false,
            rente_monatlich: 0.0,
            cost_basis_alt: 0.0,
            cost_basis_neu: 0.0,
            sparer_pauschbetrag: 0.0,
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
            rebal_band: 0.0,
            max_skim_pct_of_eq: 0.0,
            max_bear_refill_pct_of_eq: 0.0,
        }
    }

    fn create_mock_market() -> crate::types::MarketAnalysisResult {
         crate::types::MarketAnalysisResult {
              s_key: "neutral".to_string(),
              szenario_text: "Neutral".to_string(),
              valuation_signal: "fair".to_string(),
              reasons: vec![],
              abstand_vom_ath_prozent: 0.0,
              sei_ath: 1.0,
              perf_1y: 5.0,
              is_stagflation: false,
              cape_ratio: 20.0,
              expected_return_cape: 0.05,
         }
    }

    #[test]
    fn test_spending_smoothing_neutral() {
        let input = create_mock_input();
        let market = create_mock_market();
        
        let mut state = SimulationState::default();
        state.flex_rate = 100.0;
        state.peak_real_vermoegen = 500000.0;
        state.cumulative_inflation_factor = 1.0;

        let result = determine_spending(
            Some(&state),
            &market,
            &input,
            24000.0, // Inflated Floor
            10000.0, // Inflated Flex
            48.0,    // Runway Months (Plenty)
            500000.0, // Depot
            500000.0, // Total
            0.0      // Pension
        );

        assert_eq!(result.spending_result.flex_rate, 100.0);
        assert!(!result.new_state.alarm_active);
    }
    
    #[test]
    fn test_alarm_trigger() {
        let input = create_mock_input();
        let mut market = create_mock_market();
        market.abstand_vom_ath_prozent = 35.0; // Near Bear
        market.s_key = "bear_deep".to_string(); // Crisis condition needed
        
        let mut state = SimulationState::default();
        state.flex_rate = 100.0;
        state.peak_real_vermoegen = 500000.0;
        state.cumulative_inflation_factor = 1.0;
        state.alarm_active = false;

        // High withdrawal needed vs low assets
        let depot = 200000.0; 
        let floor = 24000.0;
        let flex = 10000.0;
        
        // WR = (34k) / 200k = 17% !!! > 8% (Alarm Threshold default?)
        
        let result = determine_spending(
            Some(&state),
            &market,
            &input,
            floor,
            flex,
            12.0,    // Low Runway
            depot,
            depot,
            0.0
        );

        // Should trigger alarm
        assert!(result.new_state.alarm_active);
        // Flex Rate should be cut (100 -> 90 or min)
        assert!(result.spending_result.flex_rate < 100.0);
    }
}
