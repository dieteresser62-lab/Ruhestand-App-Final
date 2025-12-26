use crate::types::{SimulationInput, MarketAnalysisResult, SpendingResult, TransactionAction, TransactionUsage};
use crate::config::{CONFIG_THRESHOLDS_STRATEGY, get_regime_for_scenario};
use crate::tax;
use std::collections::HashMap;
use serde_json::Value;

fn quantize_amount(amount: f64, mode: &str) -> f64 {
    // Simplified quantization tiers (Anti-Pseudo-Accuracy)
    // Tiers: <10k step 1k, <50k step 5k...
    let step = if amount < 10000.0 { 1000.0 }
               else if amount < 50000.0 { 5000.0 }
               else if amount < 200000.0 { 10000.0 }
               else { 25000.0 };
               
    if mode == "ceil" {
        (amount / step).ceil() * step
    } else {
        (amount / step).floor() * step
    }
}

pub fn calculate_target_liquidity(_profil_min_months: f64, market: &MarketAnalysisResult, inflated_bedarf: f64, input: &SimulationInput) -> f64 {
    // Simplified port of calculateTargetLiquidity
    // Assuming non-dynamic profile first (or simplified dynamic logic)
    
    // Dynamic logic approximation
    let regime = get_regime_for_scenario(&market.s_key);
    let target_months = if ["peak", "hot_neutral"].contains(&regime) { 
        input.runway_target_months 
    } else { 
        input.runway_target_months.max(48.0) // Assume defensive 
    };
    
    // Buffer logic
    let brutto_bedarf_year = inflated_bedarf; // Simplified input structure
    let min_buffer = (brutto_bedarf_year / 12.0) * 2.0;
    
    let runway_cap = (brutto_bedarf_year / 12.0) * target_months;
    
    let raw_target = runway_cap.max(min_buffer);
    
    // Round to 100
    (raw_target / 100.0).ceil() * 100.0
}

pub fn determine_action(
    aktuelle_liquiditaet: f64,
    _depotwert_gesamt: f64,
    ziel_liquiditaet: f64,
    market: &MarketAnalysisResult,
    spending: &SpendingResult,
    min_gold: f64,
    input: &SimulationInput,
    min_runway_months_profil: f64,
) -> TransactionAction {
    let mut _diagnosis: Vec<Value> = vec![];

    // 1. Puffer Check
    let floor_bedarf_netto = (input.floor_bedarf - (if input.rente_aktiv { input.rente_monatlich * 12.0 } else { 0.0 })).max(0.0);
    let runway_min_threshold = min_runway_months_profil; // Simplified
    let krisen_min_liq = (floor_bedarf_netto / 12.0) * runway_min_threshold;
    let sicherheits_puffer = krisen_min_liq.max(CONFIG_THRESHOLDS_STRATEGY.runway_thin_months * 1000.0); // Simple fallback

    // Puffer protection in Bear
    let is_bear = market.s_key == "bear_deep" || market.s_key == "recovery_in_bear";
    if aktuelle_liquiditaet <= sicherheits_puffer && is_bear {
         let gap = sicherheits_puffer - aktuelle_liquiditaet;
         let bedarf = if gap > 1.0 { gap } else { floor_bedarf_netto }; // Fill 1 year floor if tiny gap? Logic copied
         
         // EMERGENCY SALE
         let sale_budgets = HashMap::new(); // empty = full access
         let sale_result = tax::calculate_sale_and_tax(bedarf, input, min_gold, Some(&sale_budgets), market, true, 0.0);
         
         return TransactionAction {
             action_type: "TRANSACTION".to_string(),
             title: "Notfall-Verkauf (Puffer-Sicherung)".to_string(),
             netto_erloes: sale_result.achieved_refill,
             quellen: sale_result.breakdown,
             verwendungen: TransactionUsage { liquiditaet: sale_result.achieved_refill, gold: 0.0, aktien: 0.0 },
             steuer: sale_result.steuer_gesamt,
             diagnosis_entries: vec![serde_json::json!({"step": "Puffer-Schutz", "status": "active"})],
         };
    }

    // 2. Normal Logic (Refill or Surplus)
    // Account for annual spending in the liquidity gap
    let effective_liquidity = aktuelle_liquiditaet - spending.total_entnahme;
    let raw_gap = ziel_liquiditaet - effective_liquidity;
    
    if raw_gap > 0.0 {
        // REFILL
        let mut liq_bedarf = quantize_amount(raw_gap, "ceil");
        // Hysteresis check (simplified)
        if liq_bedarf < 2000.0 { liq_bedarf = 0.0; }
        
        if liq_bedarf > 0.0 {
             let sale_result = tax::calculate_sale_and_tax(liq_bedarf, input, min_gold, None, market, false, 0.0);
             return TransactionAction {
                 action_type: "TRANSACTION".to_string(),
                 title: "Liquidität auffüllen".to_string(),
                 netto_erloes: sale_result.achieved_refill,
                 quellen: sale_result.breakdown,
                 verwendungen: TransactionUsage { liquiditaet: sale_result.achieved_refill, gold: 0.0, aktien: 0.0 },
                 steuer: sale_result.steuer_gesamt,
                 diagnosis_entries: vec![],
             };
        }
    } else {
        // SURPLUS (Invest)
        let surplus = -raw_gap;
        let min_trade = 25000.0;
        
        if surplus > min_trade && !market.s_key.contains("bear") {
             // Allocation Logic
             let total_assets = input.depotwert_alt + input.depotwert_neu + input.gold_wert + surplus;
             
             // Calculate target amounts
             let target_gold = if input.gold_aktiv {
                 total_assets * (input.gold_ziel_prozent / 100.0)
             } else {
                 0.0
             };
             
             // Determine Gold need
             let gold_need = (target_gold - input.gold_wert).max(0.0);
             
             // Split surplus
             let invest_gold = gold_need.min(surplus);
             let invest_stocks = surplus - invest_gold;
             
             return TransactionAction {
                 action_type: "TRANSACTION".to_string(),
                 title: "Überschuss investieren".to_string(),
                 netto_erloes: 0.0, // Cost, not proceeds? Wait, logic return type says "netto_erloes". 
                 // Usually for refill implies sales. For Invest implies cost?
                 // Let's check struct definition. 
                 // If action is Invest, netto_erloes usually negative or 0?
                 // In JS engine: "nettoErloes" is positive for sales.
                 // Here we are returning a TransactionAction.
                 // If we invest, we occupy liquidity.
                 // The caller handles liquidity update.
                 // Let's send 0.0 as "erloes" (proceeds), but populate "verwendungen".
                 
                 quellen: vec![],
                 verwendungen: TransactionUsage {
                     liquiditaet: 0.0, // Used from surplus logic outside?
                     // Wait, TransactionUsage defines where money goes.
                     // But here 'verwendungen' usually means "Where did the money go?".
                     // If we invest, we use liquidity.
                     aktien: invest_stocks,
                     gold: invest_gold,
                 },
                 steuer: 0.0,
                 diagnosis_entries: vec![
                     format!("Surplus: {:.0}€", surplus).into(),
                     format!("Invest Stocks: {:.0}€", invest_stocks).into(),
                     format!("Invest Gold: {:.0}€", invest_gold).into(),
                 ],
             };
        }
    }

    // Default None
    TransactionAction {
        action_type: "NONE".to_string(),
        title: "Kein Handlungsbedarf".to_string(),
        netto_erloes: 0.0,
        quellen: vec![],
        verwendungen: TransactionUsage::default(),
        steuer: 0.0,
        diagnosis_entries: vec![],
    }
    }


#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SimulationInput, MarketAnalysisResult, SpendingResult, SimulationState};

    fn create_mock_input() -> SimulationInput {
        SimulationInput {
            aktuelles_alter: 60,
            risikoprofil: "wachstum".to_string(),
            inflation: 2.0,
            tagesgeld: 0.0,
            geldmarkt_etf: 0.0,
            aktuelle_liquiditaet: Some(20000.0), // Start with some cash
            depotwert_alt: 100000.0,
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
            cost_basis_alt: 50000.0,
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
            max_skim_pct_of_eq: 0.0,
            max_bear_refill_pct_of_eq: 0.0,
        }
    }

    fn create_mock_market() -> MarketAnalysisResult {
         MarketAnalysisResult::default()
    }
    
    fn create_mock_spending() -> SpendingResult {
        SpendingResult {
            flex_rate: 100.0,
            total_entnahme: 30000.0, // 30k total need
            entnahme_depot: 0.0,
            flex_verwendung: 0.0,
        }
    }

    #[test]
    fn test_transactions_refill() {
        let mut input = create_mock_input();
        input.aktuelle_liquiditaet = Some(5000.0); // Only 5k cash
        let market = create_mock_market();
        let spending = create_mock_spending(); // 30k need
        
        let _state = SimulationState { flex_rate: 100.0, ..Default::default() };
        
        // Need target liquidity. Let's assume need 30k (Spending) + buffer
        let ziel_liquiditaet = 36000.0; // 3 years of flex bedarf? Simplified.
        
        let result = determine_action(
            input.aktuelle_liquiditaet.unwrap(),
            100000.0, // Depot
            ziel_liquiditaet,
            &market,
            &spending,
            0.0, // Min Gold
            &input,
            24.0 // Min Runway
        );
        
        assert_eq!(result.action_type, "TRANSACTION");
        assert_eq!(result.title, "Liquidität auffüllen");
        
        // Deficit = Ziel 36k - Current 5k = 31k.
        assert!(result.netto_erloes >= 31000.0);
    }
}
