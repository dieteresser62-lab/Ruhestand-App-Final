use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")] // Match JS naming convention
pub struct SimulationInput {
    // Profil & Basics
    pub aktuelles_alter: u32,
    pub risikoprofil: String,
    pub inflation: f64,

    // Liquidität
    pub tagesgeld: f64,
    pub geldmarkt_etf: f64,
    pub aktuelle_liquiditaet: Option<f64>, // Explicit override

    // Depot Assets
    pub depotwert_alt: f64,
    pub depotwert_neu: f64,
    
    // Gold
    pub gold_aktiv: bool,
    pub gold_wert: f64,
    pub gold_cost: f64,
    pub gold_ziel_prozent: f64,
    pub gold_floor_prozent: f64,

    // Bedarf / Rente
    pub floor_bedarf: f64,
    pub flex_bedarf: f64,
    pub rente_aktiv: bool,
    pub rente_monatlich: f64,

    // Steuern
    pub cost_basis_alt: f64,
    pub cost_basis_neu: f64,
    pub sparer_pauschbetrag: f64,

    // Marktdaten (Historie)
    #[serde(rename = "endeVJ")]
    pub ende_vj: f64,
    #[serde(rename = "endeVJ_1")]
    pub ende_vj_1: f64,
    #[serde(rename = "endeVJ_2")]
    pub ende_vj_2: f64,
    #[serde(rename = "endeVJ_3")]
    pub ende_vj_3: f64,
    pub ath: f64,
    #[serde(rename = "jahreSeitAth")]
    pub jahre_seit_ath: f64,
    #[serde(rename = "capeRatio")]
    pub cape_ratio: Option<f64>,

    // Strategie-Parameter
    pub runway_min_months: f64,
    pub runway_target_months: f64,
    pub target_eq: f64,
    pub rebal_band: f64,
    pub max_skim_pct_of_eq: f64,
    pub max_bear_refill_pct_of_eq: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct MarketAnalysisResult {
    pub perf_1y: f64,
    pub abstand_vom_ath_prozent: f64,
    pub sei_ath: f64,
    pub s_key: String,
    pub is_stagflation: bool,
    pub szenario_text: String,
    pub reasons: Vec<String>,
    pub cape_ratio: f64,
    pub valuation_signal: String,
    pub expected_return_cape: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct SpendingResult {
    pub flex_rate: f64,
    pub flex_verwendung: f64,
    pub total_entnahme: f64,
    pub entnahme_depot: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TransactionResult {
    pub liquiditaet_alt: f64,
    pub liquiditaet_neu: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TransactionSource {
    pub kind: String,
    pub brutto: f64,
    pub netto: f64,
    pub steuer: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TransactionUsage {
    pub liquiditaet: f64,
    pub gold: f64,
    pub aktien: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct TransactionAction {
    #[serde(rename = "type")]
    pub action_type: String, // "TRANSACTION" or "NONE"
    pub title: String,
    pub netto_erloes: f64, // "nettoErlös" in JS
    pub quellen: Vec<TransactionSource>,
    pub verwendungen: TransactionUsage,
    pub steuer: f64,
    pub diagnosis_entries: Vec<serde_json::Value>,
    // details, diagnostics, etc. omitted or mapped generically
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct SimulationState {
    // Guardrail State History
    pub flex_rate: f64,
    pub peak_real_vermoegen: f64,
    pub years_in_bear: u32,
    pub cumulative_inflation_factor: f64,
    pub alarm_active: bool,
    pub last_inflation_applied_at_age: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimulationDiagnosis {
    pub decision_tree: Vec<String>,
    pub general: serde_json::Value,
    pub guardrails: Vec<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SimulationResult {
    // pub input: SimulationInput, // Echo back input? logic does so in JS
    pub new_state: SimulationState,
    pub diagnosis: SimulationDiagnosis,
    pub ui: String, // Serialize to string to bypass serde_wasm_bindgen issues with Value
}
