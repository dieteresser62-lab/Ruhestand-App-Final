use crate::types::{SimulationInput, SimulationResult, SimulationState, SimulationDiagnosis};
pub fn calculate_model(input: &SimulationInput, last_state: Option<&SimulationState>) -> Result<SimulationResult, String> {
    // 1. Validation
    let errors = crate::validation::validate(input);
    if !errors.is_empty() {
        return Err(format!("Validation Failed: {:?}", errors.iter().map(|e| &e.message).collect::<Vec<_>>()));
    }

    // 2. Grundwerte berechnen
    // Aktuelle Liquidität (Use override or sum)
    let aktuelle_liquiditaet = input.aktuelle_liquiditaet
        .unwrap_or(input.tagesgeld + input.geldmarkt_etf);

    // Gesamtes Depotvermögen
    let gold_val = if input.gold_aktiv { input.gold_wert } else { 0.0 };
    let depotwert_gesamt = input.depotwert_alt + input.depotwert_neu + gold_val;

    // Gesamtvermögen
    let gesamtwert = depotwert_gesamt + aktuelle_liquiditaet;

    // 3. Marktanalyse
    let market = crate::market::analyze_market(
        input, 
        input.jahre_seit_ath as u32, 
        input.cape_ratio
    );

    // 4. Gold Floor
    let gold_floor_abs = (input.gold_floor_prozent / 100.0) * gesamtwert;
    let min_gold = if input.gold_aktiv { gold_floor_abs } else { 0.0 };

    // 5. Inflationsangepasster Bedarf
    let rente_jahr = if input.rente_aktiv { input.rente_monatlich * 12.0 } else { 0.0 };
    // Fix: Pension surplus logic
    let pension_surplus = (rente_jahr - input.floor_bedarf).max(0.0);
    
    let inflated_floor = (input.floor_bedarf - rente_jahr).max(0.0);
    let mut inflated_flex = input.flex_bedarf;

    if pension_surplus > 0.0 {
        inflated_flex = (inflated_flex - pension_surplus).max(0.0);
    }
    
    let neuer_bedarf = inflated_floor + inflated_flex;

    // 6. Runway berechnen
    let reichweite_monate = if neuer_bedarf > 0.0 {
        aktuelle_liquiditaet / (neuer_bedarf / 12.0)
    } else {
        f64::INFINITY
    };

    // 7. Ausgabenplanung (SpendingPlanner)
    let spending_plan = crate::spending::determine_spending(
        last_state,
        &market,
        input,
        inflated_floor,
        inflated_flex,
        reichweite_monate,
        depotwert_gesamt,
        gesamtwert,
        rente_jahr
    );
    
    let spending_result = spending_plan.spending_result;
    let new_state = spending_plan.new_state;

    // 8. Ziel-Liquidität berechnen
    // Note: JS logic passes inflatedBedarf struct, here we pass values or simplified total.
    // calculateTargetLiquidity uses (floor+flex) mostly.
    let ziel_liquiditaet = crate::transactions::calculate_target_liquidity(
        input.runway_min_months, // simplified passing
        &market,
        neuer_bedarf,
        input
    );

    // 9. Transaktionsaktion bestimmen
    let action = crate::transactions::determine_action(
        aktuelle_liquiditaet,
        depotwert_gesamt,
        ziel_liquiditaet,
        &market,
        &spending_result,
        min_gold,
        input,
        input.runway_min_months
    );
    
    // Collect Diagnosis from Action
    // (In full port, push action.diagnosis_entries to diagnosis.decisionTree)

    // 10. Liquidität nach Transaktion
    let liq_nach_transaktion = aktuelle_liquiditaet + action.verwendungen.liquiditaet;
    
    // 11. Final Metrics (Runway Status etc)
    let runway_months_post = if neuer_bedarf > 0.0 {
        liq_nach_transaktion / (neuer_bedarf / 12.0)
    } else {
        f64::INFINITY
    };
    
    let runway_status = if runway_months_post >= input.runway_target_months {
        "ok"
    } else if runway_months_post >= input.runway_min_months {
        "warn"
    } else {
        "bad"
    };

    // Construct Result
    Ok(SimulationResult {
        new_state,
        diagnosis: SimulationDiagnosis {
            decision_tree: vec![], // TODO: Populate
            general: serde_json::json!({
                "marketSKey": market.s_key,
                "marketSzenario": market.szenario_text,
                "runwayMonate": runway_months_post,
                "runwayStatus": runway_status,
                "deckungVorher": if ziel_liquiditaet > 0.0 { (aktuelle_liquiditaet / ziel_liquiditaet) * 100.0 } else { 100.0 },
                "deckungNachher": if ziel_liquiditaet > 0.0 { (liq_nach_transaktion / ziel_liquiditaet) * 100.0 } else { 100.0 }
            }),
            guardrails: vec![],
        },
        ui: serde_json::json!({
            "depotwertGesamt": depotwert_gesamt,
            "neuerBedarf": neuer_bedarf,
            "minGold": min_gold,
            "zielLiquiditaet": ziel_liquiditaet,
            "liquiditaet": {
                 "deckungVorher": if ziel_liquiditaet > 0.0 { (aktuelle_liquiditaet / ziel_liquiditaet) * 100.0 } else { 100.0 },
                 "deckungNachher": if ziel_liquiditaet > 0.0 { (liq_nach_transaktion / ziel_liquiditaet) * 100.0 } else { 100.0 }
            },
            "flexRate": spending_result.flex_rate,
            "runway": { "months": runway_months_post, "status": runway_status },
            "market": market,
            "spending": spending_result,
            "action": action
        }).to_string(),
    })
}
