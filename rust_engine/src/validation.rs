use crate::types::SimulationInput;

pub struct ValidationError {
    pub field_id: String,
    pub message: String,
}

pub fn validate(input: &SimulationInput) -> Vec<ValidationError> {
    let mut errors = Vec::new();

    // Helper closure
    let mut check = |condition: bool, field: &str, msg: &str| {
        if condition {
            errors.push(ValidationError {
                field_id: field.to_string(),
                message: msg.to_string(),
            });
        }
    };

    // 1. Alter check
    check(input.aktuelles_alter < 18 || input.aktuelles_alter > 120, "aktuellesAlter", "Alter muss zwischen 18 und 120 liegen.");

    // 2. Inflation
    check(input.inflation < -10.0 || input.inflation > 50.0, "inflation", "Inflation außerhalb plausibler Grenzen (-10% bis 50%).");

    // 3. Negativ-Checks
    check(input.tagesgeld < 0.0, "tagesgeld", "Wert darf nicht negativ sein.");
    check(input.geldmarkt_etf < 0.0, "geldmarktEtf", "Wert darf nicht negativ sein.");
    check(input.depotwert_alt < 0.0, "depotwertAlt", "Wert darf nicht negativ sein.");
    check(input.depotwert_neu < 0.0, "depotwertNeu", "Wert darf nicht negativ sein.");
    check(input.gold_wert < 0.0, "goldWert", "Wert darf nicht negativ sein.");
    check(input.floor_bedarf < 0.0, "floorBedarf", "Wert darf nicht negativ sein.");
    check(input.flex_bedarf < 0.0, "flexBedarf", "Wert darf nicht negativ sein.");
    check(input.cost_basis_alt < 0.0, "costBasisAlt", "Wert darf nicht negativ sein.");
    check(input.cost_basis_neu < 0.0, "costBasisNeu", "Wert darf nicht negativ sein.");
    check(input.gold_cost < 0.0, "goldCost", "Wert darf nicht negativ sein.");
    check(input.sparer_pauschbetrag < 0.0, "sparerPauschbetrag", "Wert darf nicht negativ sein.");

    // Marktdaten (basic check)
    check(input.ende_vj < 0.0, "endeVJ", "Marktdaten dürfen nicht negativ sein.");
    check(input.ath < 0.0, "ath", "Marktdaten dürfen nicht negativ sein.");

    // 4. Gold
    if input.gold_aktiv {
        check(input.gold_ziel_prozent <= 0.0 || input.gold_ziel_prozent > 50.0, "goldZielProzent", "Ziel-Allokation unrealistisch (0-50%).");
        check(input.gold_floor_prozent < 0.0 || input.gold_floor_prozent > 20.0, "goldFloorProzent", "Floor-Prozent unrealistisch (0-20%).");
    }

    // 5. Runway
    check(input.runway_min_months < 12.0 || input.runway_min_months > 60.0, "runwayMinMonths", "Runway Minimum muss zwischen 12 und 60 Monaten liegen.");
    check(input.runway_target_months < 18.0 || input.runway_target_months > 72.0, "runwayTargetMonths", "Runway Ziel muss zwischen 18 und 72 Monaten liegen.");
    check(input.runway_target_months < input.runway_min_months, "runwayTargetMonths", "Runway Ziel darf nicht kleiner als das Minimum sein.");

    // 6. Aktien-Quote
    check(input.target_eq < 20.0 || input.target_eq > 90.0, "targetEq", "Aktien-Zielquote muss zwischen 20% und 90% liegen.");

    // 7. Rebalancing
    check(input.rebal_band < 1.0 || input.rebal_band > 20.0, "rebalBand", "Rebalancing-Band muss zwischen 1% und 20% liegen.");

    // 8. Max Skim / Refill
    check(input.max_skim_pct_of_eq < 0.0 || input.max_skim_pct_of_eq > 50.0, "maxSkimPctOfEq", "Max. Abschöpfen muss zwischen 0% and 50% liegen.");
    check(input.max_bear_refill_pct_of_eq < 0.0 || input.max_bear_refill_pct_of_eq > 70.0, "maxBearRefillPctOfEq", "Max. Auffüllen (Bär) muss zwischen 0% und 70% liegen.");

    errors
}
