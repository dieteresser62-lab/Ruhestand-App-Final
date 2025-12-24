use crate::types::{SimulationInput, MarketAnalysisResult};
use crate::config::{MARKET_VALUATION, CONFIG_THRESHOLDS_STRATEGY, get_valuation_signal_text, get_scenario_text, get_expected_return_by_signal};

fn normalize_cape_ratio(raw_cape_ratio: Option<f64>) -> f64 {
    match raw_cape_ratio {
        Some(val) if val > 0.0 && val.is_finite() => val,
        _ => MARKET_VALUATION.default_cape,
    }
}

struct CapeAssessment {
    cape_ratio: f64,
    signal_key: String,
    expected_return: f64,
    reason_text: String,
}

fn derive_cape_assessment(raw_cape_ratio: Option<f64>) -> CapeAssessment {
    let normalized_cape = normalize_cape_ratio(raw_cape_ratio);
    
    let signal_key = if normalized_cape >= MARKET_VALUATION.extreme_overvalued_cape {
        "extreme_overvalued"
    } else if normalized_cape >= MARKET_VALUATION.overvalued_cape {
        "overvalued"
    } else if normalized_cape <= MARKET_VALUATION.undervalued_cape {
        "undervalued"
    } else {
        "fair"
    };

    let expected_return = get_expected_return_by_signal(signal_key);
    let valuation_text = get_valuation_signal_text(signal_key);

    CapeAssessment {
        cape_ratio: normalized_cape,
        signal_key: signal_key.to_string(),
        expected_return,
        reason_text: format!("{} (CAPE {:.1}, exp. Rendite {:.1}%)", valuation_text, normalized_cape, expected_return * 100.0),
    }
}

pub fn analyze_market(input: &SimulationInput, years_since_ath: u32, cape_ratio_input: Option<f64>) -> MarketAnalysisResult {
    // 1. Calculations
    let ath = input.ath;
    let ende_vj = input.ende_vj;
    
    // Abstand vom ATH
    let abstand_vom_ath_prozent = if ath > 0.0 && ende_vj > 0.0 {
        (ath - ende_vj) / ath * 100.0
    } else {
        0.0
    };

    // 1-Jahres-Performance
    let ende_vj_1 = input.ende_vj_1;
    let perf_1y = if ende_vj_1 > 0.0 {
        (ende_vj - ende_vj_1) / ende_vj_1 * 100.0
    } else {
        0.0
    };

    // Monate seit ATH (Approximation from passed in year counter if needed, or 0)
    // Note: JS logic uses `jahreSeitAth` from input, but it wasn't in InputValidator explicitly.
    // Assuming 0 for now or passed as arg.
    let mut monate_seit_ath = years_since_ath * 12;
    if abstand_vom_ath_prozent > 0.0 && years_since_ath == 0 {
        monate_seit_ath = 12;
    }

    // 2. Determine Scenario
    let mut s_key;
    let mut reasons = Vec::new();

    if abstand_vom_ath_prozent <= 0.0 {
        // New ATH
        s_key = if perf_1y >= 10.0 { "peak_hot" } else { "peak_stable" };
        reasons.push("Neues Allzeithoch".to_string());
        if perf_1y >= 10.0 { reasons.push("Starkes Momentum (>10%)".to_string()); }
    } else if abstand_vom_ath_prozent > 20.0 {
        // Deep Bear
        s_key = "bear_deep";
        reasons.push(format!("ATH-Abstand > 20% ({:.1}%)", abstand_vom_ath_prozent));
    } else if abstand_vom_ath_prozent > 10.0 && perf_1y > 10.0 && monate_seit_ath > 6 {
        // Recovery
        s_key = "recovery";
        reasons.push("Starkes Momentum nach Korrektur".to_string());
    } else if abstand_vom_ath_prozent <= 15.0 && monate_seit_ath <= 6 {
        // Young Correction
        s_key = "corr_young";
        reasons.push("Kürzliche, leichte Korrektur".to_string());
    } else {
        // Sideways
        s_key = "side_long";
        reasons.push("Seitwärtsphase".to_string());
    }

    // Recovery in Bear check
    if s_key == "bear_deep" || s_key == "recovery" {
        let last_4_years: Vec<f64> = vec![input.ende_vj, input.ende_vj_1, input.ende_vj_2, input.ende_vj_3]
            .into_iter().filter(|&v| v > 0.0).collect();
        
        // Find min
        let low_point = last_4_years.iter().fold(f64::INFINITY, |a, &b| a.min(b));
        
        if low_point < f64::INFINITY && low_point > 0.0 {
             let rally_from_low = (input.ende_vj - low_point) / low_point * 100.0;
             if (perf_1y >= 15.0 || rally_from_low >= 30.0) && abstand_vom_ath_prozent > 15.0 {
                 s_key = "recovery_in_bear";
                 reasons.push(format!("Erholung im Bärenmarkt (Perf 1J: {:.0}%, Rally v. Tief: {:.0}%)", perf_1y, rally_from_low));
             }
        }
    }

    // Stagflation
    let real_1y = perf_1y - input.inflation;
    let is_stagflation = input.inflation >= CONFIG_THRESHOLDS_STRATEGY.stagflation_inflation && real_1y < 0.0;
    if is_stagflation {
        reasons.push(format!("Stagflation (Inflation {}% > Realrendite {:.1}%)", input.inflation, real_1y));
    }

    // CAPE
    let valuation = derive_cape_assessment(cape_ratio_input);
    if !valuation.reason_text.is_empty() {
        reasons.push(valuation.reason_text);
    }

    let szenario_text = format!("{}{}", get_scenario_text(s_key), if is_stagflation { " (Stagflation)" } else { "" });

    MarketAnalysisResult {
        perf_1y,
        abstand_vom_ath_prozent,
        sei_ath: (100.0 - abstand_vom_ath_prozent) / 100.0,
        s_key: s_key.to_string(),
        is_stagflation,
        szenario_text,
        reasons,
        cape_ratio: valuation.cape_ratio,
        valuation_signal: valuation.signal_key,
        expected_return_cape: valuation.expected_return,
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
            floor_bedarf: 0.0,
            flex_bedarf: 0.0,
            rente_aktiv: false,
            rente_monatlich: 0.0,
            cost_basis_alt: 0.0,
            cost_basis_neu: 0.0,
            sparer_pauschbetrag: 0.0,
            ende_vj: 100.0,
            ende_vj_1: 95.0, // +5.2%
            ende_vj_2: 90.0,
            ende_vj_3: 85.0,
            ath: 105.0, // ~4.7% dd
            jahre_seit_ath: 0.0,
            cape_ratio: Some(20.0),
            runway_min_months: 0.0,
            runway_target_months: 0.0,
            target_eq: 0.0,
            rebal_band: 0.0,
            max_skim_pct_of_eq: 0.0,
            max_bear_refill_pct_of_eq: 0.0,
        }
    }

    #[test]
    fn test_scenario_side_long() {
        let input = create_mock_input();
        let result = analyze_market(&input, 0, input.cape_ratio);

        assert_eq!(result.s_key, "side_long");
        assert!(!result.is_stagflation);
        assert_eq!(result.valuation_signal, "fair"); // CAPE 20 is Fair
        // Default CAPE logic: 
        // Overvalued: 28, Ext: 35. 
        // Undervalued: 16? 
        // 20 is likely "fair". Let's check.
    }

    #[test]
    fn test_scenario_deep_bear() {
        let mut input = create_mock_input();
        input.ath = 140.0;
        input.ende_vj = 100.0; 
        // Drawdown: (140-100)/140 = 28.5% > 20%
        
        let result = analyze_market(&input, 1, input.cape_ratio);
        assert_eq!(result.s_key, "bear_deep");
        assert!(result.abstand_vom_ath_prozent > 28.0);
    }
    
    #[test]
    fn test_stagflation() {
        let mut input = create_mock_input();
        input.inflation = 8.0; // High inflation
        input.ende_vj = 90.0;
        input.ende_vj_1 = 100.0; // -10% nominal
        // Real: -10% - 8% = -18% real
        
        let result = analyze_market(&input, 1, input.cape_ratio);
        assert!(result.is_stagflation, "Should detect stagflation");
    }
}
