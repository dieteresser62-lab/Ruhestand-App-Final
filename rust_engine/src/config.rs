pub struct MarketValuationConfig {
    pub default_cape: f64,
    pub undervalued_cape: f64,
    pub fair_value_cape: f64,
    pub overvalued_cape: f64,
    pub extreme_overvalued_cape: f64,
}

pub const MARKET_VALUATION: MarketValuationConfig = MarketValuationConfig {
    default_cape: 20.0,
    undervalued_cape: 15.0,
    fair_value_cape: 25.0,
    overvalued_cape: 30.0,
    extreme_overvalued_cape: 35.0,
};

pub struct AlarmThresholds {
    pub withdrawal_rate: f64,
    pub real_drawdown: f64,
}

pub const ALARM_THRESHOLDS: AlarmThresholds = AlarmThresholds {
    withdrawal_rate: 0.055,
    real_drawdown: 0.25,
};

pub struct CautionThresholds {
    pub withdrawal_rate: f64,
    pub inflation_cap: f64,
}

pub const CAUTION_THRESHOLDS: CautionThresholds = CautionThresholds {
    withdrawal_rate: 0.045,
    inflation_cap: 3.0,
};

pub struct SpendingModelConfig {
    pub flex_rate_smoothing_alpha: f64,
    pub rate_change_max_up_pp: f64,
    pub rate_change_agile_up_pp: f64,
    pub rate_change_max_down_pp: f64,
    pub rate_change_max_down_in_bear_pp: f64,
}

pub const SPENDING_MODEL: SpendingModelConfig = SpendingModelConfig {
    flex_rate_smoothing_alpha: 0.35,
    rate_change_max_up_pp: 2.5,
    rate_change_agile_up_pp: 4.5,
    rate_change_max_down_pp: 3.5,
    rate_change_max_down_in_bear_pp: 10.0,
};

pub struct StrategyThresholds {
    pub stagflation_inflation: f64,
    pub runway_thin_months: f64,
}

pub const CONFIG_THRESHOLDS_STRATEGY: StrategyThresholds = StrategyThresholds {
    stagflation_inflation: 4.0,
    runway_thin_months: 24.0,
}; // Merged with previous definition

pub fn get_regime_for_scenario(scenario_key: &str) -> &'static str {
    match scenario_key {
        "peak_hot" => "peak",
        "peak_stable" | "side_long" => "hot_neutral",
        "recovery" | "corr_young" => "recovery",
        "bear_deep" => "bear",
        "recovery_in_bear" => "recovery_in_bear",
        _ => "hot_neutral",
    }
}

pub fn get_valuation_signal_text(key: &str) -> &'static str {
    match key {
        "undervalued" => "Bewertung attraktiv",
        "fair" => "Bewertung moderat",
        "overvalued" => "Bewertung angespannt",
        "extreme_overvalued" => "Bewertung extrem angespannt",
        _ => "Bewertungs-Signal",
    }
}

pub fn get_scenario_text(key: &str) -> &'static str {
    match key {
        "peak_hot" => "Markt heiß gelaufen",
        "peak_stable" => "Stabiler Höchststand",
        "recovery" => "Best. Erholung",
        "bear_deep" => "Tiefer Bär",
        "corr_young" => "Junge Korrektur",
        "side_long" => "Seitwärts Lang",
        "recovery_in_bear" => "Erholung im Bärenmarkt",
        _ => "Unbekannt",
    }
}

pub fn get_expected_return_by_signal(key: &str) -> f64 {
    match key {
        "undervalued" => 0.08,
        "fair" => 0.07,
        "overvalued" => 0.05,
        "extreme_overvalued" => 0.04,
        _ => 0.07,
    }
}
