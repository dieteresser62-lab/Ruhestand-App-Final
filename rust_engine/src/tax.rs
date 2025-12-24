use crate::types::{SimulationInput, MarketAnalysisResult, TransactionSource};

#[derive(Clone, Debug)]
pub struct Tranche {
    pub kind: String,
    pub market_value: f64,
    pub cost_basis: f64,
    pub tqf: f64,
}

#[derive(Clone, Debug)]
pub struct SaleResult {
    pub steuer_gesamt: f64,
    pub brutto_verkauf_gesamt: f64,
    pub achieved_refill: f64,
    pub breakdown: Vec<TransactionSource>,
}

pub fn calculate_sale_and_tax(
    requested_refill: f64,
    input: &SimulationInput,
    min_gold: f64,
    sale_budgets: Option<&std::collections::HashMap<String, f64>>,
    market: &MarketAnalysisResult,
    is_emergency_sale: bool,
    force_gross_sell_amount: f64, // New param for specific gross targeting
) -> SaleResult {
    let kist = 0.0; // Simplification: input.kirchensteuerSatz isn't in InputValidator yet!
    let kest = 0.25 * (1.0 + 0.055 + kist);
    
    // 1. Build Tranches
    let mut tranches = Vec::new();
    if input.depotwert_alt > 0.0 {
        tranches.push(Tranche { 
            kind: "aktien_alt".to_string(), 
            market_value: input.depotwert_alt, 
            cost_basis: input.cost_basis_alt, 
            tqf: 0.15 // TODO: input.tqfAlt 
        });
    }
    if input.depotwert_neu > 0.0 {
        tranches.push(Tranche { 
            kind: "aktien_neu".to_string(), 
            market_value: input.depotwert_neu, 
            cost_basis: input.cost_basis_neu, 
            tqf: 0.15 // TODO: input.tqfNeu
        });
    }
    if input.gold_aktiv && input.gold_wert > 0.0 {
        tranches.push(Tranche { 
            kind: "gold".to_string(), 
            market_value: input.gold_wert, 
            cost_basis: input.gold_cost, 
            tqf: 1.0 // Steuerfrei assumption or logic
        });
    }

    // 2. Sort Tranches
    // ... logic port from _getSellOrder ...
    // Sort logic simplified for PoC:
    let is_defensive = is_emergency_sale || market.s_key == "bear_deep" || market.s_key == "recovery_in_bear";
    
    tranches.sort_by(|a, b| {
         if is_defensive {
             // Gold first
             if a.kind == "gold" { return std::cmp::Ordering::Less; }
             if b.kind == "gold" { return std::cmp::Ordering::Greater; }
         }
         // Efficiency sort (descending efficiency = ascending tax/loss impact?)
         // JS sorts by efficiency (low tax first?)
         // JS Logic: (gqA * (1-tqfA)) - (gqB * (1-tqfB)) -> sort ascending? 
         // JS comment: "Aktien nach steuerlicher Effizienz sortieren"
         // Logic implies we want to sell least tax efficient first? No, normally we want to defer tax.
         // Let's assume standard sort for now or copy JS logic exactly.
         // JS sorts ascending result.
         
         let gq_a = if a.market_value > 0.0 { (a.market_value - a.cost_basis).max(0.0) / a.market_value } else { 0.0 };
         let gq_b = if b.market_value > 0.0 { (b.market_value - b.cost_basis).max(0.0) / b.market_value } else { 0.0 };
         let val_a = gq_a * (1.0 - a.tqf);
         let val_b = gq_b * (1.0 - b.tqf);
         
         val_a.partial_cmp(&val_b).unwrap_or(std::cmp::Ordering::Equal)
    });


    // 3. Execution Loop
    let mut result = SaleResult { steuer_gesamt: 0.0, brutto_verkauf_gesamt: 0.0, achieved_refill: 0.0, breakdown: vec![] };
    let mut noch_zu_deckender_netto = requested_refill.max(0.0);
    let mut pauschbetrag_rest = input.sparer_pauschbetrag; 
    let mut total_brutto_tracker = 0.0;

    for tranche in tranches {
        // Budget constraints
        let budget_cap = if let Some(budgets) = sale_budgets {
             *budgets.get(&tranche.kind).unwrap_or(&f64::INFINITY)
        } else {
             f64::INFINITY
        };

        // Determine max brutto from this tranche
        let mut max_brutto = tranche.market_value.min(budget_cap);
        if tranche.kind == "gold" {
            max_brutto = (input.gold_wert - min_gold).max(0.0).min(max_brutto);
        }
        
        if max_brutto <= 0.0 { continue; }

        if force_gross_sell_amount > 0.0 && total_brutto_tracker >= force_gross_sell_amount { break; }
        if force_gross_sell_amount <= 0.0 && noch_zu_deckender_netto <= 0.01 { break; }

        // Tax calculation on max sale
        let gewinn_quote = if tranche.market_value > 0.0 { (tranche.market_value - tranche.cost_basis).max(0.0) / tranche.market_value } else { 0.0 };
        let _steuer_factor_per_euro_brutto = gewinn_quote * (1.0 - tranche.tqf) * kest; 
        // Note: Pauschbetrag complicates per-euro factor, using iterative check or simplified
        
        // Simplified Logic: Calculate needed brutto to cover remaining Netto (or remaining Brutto target)
        // Netto = Brutto - Steuer
        // Steuer = (Brutto * GQ * (1-TQF) - Pausch) * KESt
        // Steuer = Brutto*Factor - Pausch*KESt
        // Netto = Brutto - (Brutto*Factor - Pausch*KESt) = Brutto * (1-Factor) + Pausch*KESt
        // => Brutto = (Netto - Pausch*KESt) / (1 - Factor)
        
        // Handling Pauschbetrag logic correctly in a loop is tricky without full simulation if we sell partial.
        // For PoC, let's just sell whatever covers the gap linear approximation
        
        let target_brutto = if force_gross_sell_amount > 0.0 {
             (force_gross_sell_amount - total_brutto_tracker).min(max_brutto)
        } else {
             // Netto Search
             // Attempt to cover 'noch_zu_deckender_netto'
             // Assumption: Pauschbetrag usage is negligible for exact math in PoC or handled simply
             let factor = gewinn_quote * (1.0 - tranche.tqf) * kest;
             let needed = noch_zu_deckender_netto / (1.0 - factor).max(0.01); 
             needed.min(max_brutto)
        };
        
        // Execute Sale
        let brutto_verkauf = target_brutto;
        let gewinn_brutto = brutto_verkauf * gewinn_quote;
        let gewinn_nach_tqs = gewinn_brutto * (1.0 - tranche.tqf);
        let anrechenbarer_pausch = pauschbetrag_rest.min(gewinn_nach_tqs);
        let steuer_basis = gewinn_nach_tqs - anrechenbarer_pausch;
        let steuer = steuer_basis.max(0.0) * kest;
        let netto = brutto_verkauf - steuer;
        
        result.steuer_gesamt += steuer;
        result.brutto_verkauf_gesamt += brutto_verkauf;
        result.achieved_refill += netto;
        total_brutto_tracker += brutto_verkauf;
        pauschbetrag_rest -= anrechenbarer_pausch;
        noch_zu_deckender_netto -= netto;
        
        result.breakdown.push(TransactionSource {
            kind: tranche.kind.clone(),
            brutto: brutto_verkauf,
            netto: netto,
            steuer: steuer,
        });
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::SimulationInput;

    fn create_mock_input() -> SimulationInput {
        SimulationInput {
            aktuelles_alter: 60,
            risikoprofil: "wachstum".to_string(),
            inflation: 0.0,
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
            sparer_pauschbetrag: 1000.0,
            ende_vj: 0.0,
            ende_vj_1: 0.0,
            ende_vj_2: 0.0,
            ende_vj_3: 0.0,
            ath: 0.0,
            jahre_seit_ath: 0.0,
            cape_ratio: None,
            runway_min_months: 0.0,
            runway_target_months: 0.0,
            target_eq: 0.0,
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
              sei_ath: 0.0,
              perf_1y: 0.0,
              is_stagflation: false,
              cape_ratio: 0.0,
              expected_return_cape: 0.0,
         }
    }

    #[test]
    fn test_sale_tax_calculation_gain() {
        let input = create_mock_input();
        let market = create_mock_market();
        
        let mut budgets = std::collections::HashMap::new();
        budgets.insert("aktien_alt".to_string(), 10000.0);
        
        let mut test_input = input.clone();
        test_input.sparer_pauschbetrag = 0.0; // Ensure tax is triggered
        test_input.depotwert_alt = 10000.0;
        test_input.cost_basis_alt = 5000.0;
        
        let result = calculate_sale_and_tax(
            907.69,
            &test_input,
            0.0,
            Some(&budgets),
            &market,
            false,
            0.0
        );
        
        assert_eq!(result.breakdown.len(), 1);
        let sale = &result.breakdown[0]; // Fixed field name
        
        // Approx check (TQF 0.15 -> Eff Tax ~11.2% -> Gross ~1022)
        assert!((sale.brutto - 1022.3).abs() < 1.0, "Gross sell invalid, got {}", sale.brutto);
        assert!(sale.steuer > 50.0, "Tax should be positive, got {}", sale.steuer);
    }
    
    #[test]
    fn test_sale_no_tax_on_loss() {
        let input = create_mock_input();
        let market = create_mock_market();
        
        let mut test_input = input.clone();
        test_input.depotwert_alt = 8000.0;
        test_input.cost_basis_alt = 10000.0;
        
         let mut budgets = std::collections::HashMap::new();
        budgets.insert("aktien_alt".to_string(), 10000.0);

        let result = calculate_sale_and_tax(
            1000.0, 
            &test_input,
            0.0,
            Some(&budgets),
            &market,
            false,
            0.0
        );

        let sale = &result.breakdown[0]; // Fixed field name
        assert!((sale.brutto - 1000.0).abs() < 5.0);
        assert_eq!(sale.steuer, 0.0);
    }
}
