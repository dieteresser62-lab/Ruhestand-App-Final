/**
 * Module: Engine Config
 * Purpose: Central configuration for the simulation engine.
 *          Defines thresholds (alarms, caution), control parameters, and version info.
 * Usage: Imported by all engine modules.
 * Dependencies: None
 */

// Engine-Versionierung
export const ENGINE_API_VERSION = "31.0";
export const ENGINE_BUILD_ID = "2025-12-22_16-35";

/**
 * Zentrale Engine-Konfiguration
 *
 * Diese Konfiguration definiert alle kritischen Schwellenwerte und Parameter
 * für die Ruhestand-Engine. Änderungen an diesen Werten können signifikante
 * Auswirkungen auf die Ausgaben- und Transaktionsstrategie haben.
 */
export const CONFIG = {
    APP: {
        VERSION: ENGINE_API_VERSION,
        NAME: 'Ruhestand-Engine-Core'
    },

    /**
     * Schwellenwerte für verschiedene Entscheidungsregeln
     */
    THRESHOLDS: {
        /**
         * ALARM-Schwellen: Aktivieren den Notfall-Modus bei kritischer Situation
         * - withdrawalRate: Max. Entnahmequote (5.5% des Depots pro Jahr)
         * - realDrawdown: Max. realer Vermögensverlust vom Peak (25%)
         */
        ALARM: {
            withdrawalRate: 0.055,      // 5.5% Entnahmequote als kritische Grenze
            realDrawdown: 0.25,         // 25% realer Drawdown als Alarmsignal
        },

        /**
         * CAUTION-Schwellen: Aktivieren vorsichtige Strategien
         * - withdrawalRate: Vorsichts-Entnahmequote (4.5% des Depots pro Jahr)
         * - inflationCap: Max. Inflationsanpassung in vorsichtigen Phasen (3%)
         */
        CAUTION: {
            withdrawalRate: 0.045,      // 4.5% Entnahmequote für vorsichtige Planung
            inflationCap: 3,            // 3% max. Inflationsanpassung im Caution-Modus
        },
        /**
         * STRATEGIE-Schwellen: Definieren Verhaltensregeln für Transaktionen
         */
        STRATEGY: {
            stagflationInflation: 4,                    // 4% Inflation als Stagflations-Grenze
            runwayThinMonths: 24,                       // 24 Monate = kritischer Runway
            liquidityBufferZonePercent: 10,             // 10% Pufferzone für Liquiditäts-Ziel
            minCashBufferMonths: 2,                     // Min. 2 Monate Cash-Puffer (Default, wenn Input fehlt)
            minRefillAmount: 10000,                     // Min. 10.000€ für Depot-Verkauf und reduziertes Liquiditäts-Gate
            minTradeAmountStatic: 25000,                // Min. 25.000€ für Rebalancing-Trades
            minTradeAmountDynamicFactor: 0.005,         // 0.5% des Portfolios als dynamischer Trade-Mindestbetrag
            cashRebalanceThreshold: 2500,               // Min. 2.500€ für Cash-Rebalancing
            recoveryLiquidityTargetFactor: 0.85,        // 85% des Ziel-Runway in Recovery-Phasen
            absoluteMinLiquidity: 10000,                // Min. 10.000€ absolute Liquidität (für ruhiges Schlafen)
            runwayGuardrailActivationPct: 0.69,         // Guardrail wird erst bei <69% Ziel-Deckung oder Min-Runway aktiviert
            runwayCoverageMinPct: 0.75                  // Mindestens 75% Liquiditätsdeckung des Ziels, bevor Failsafe greift
        }
    },

    /**
     * Jedes Profil definiert die Ziel- Liquidität in verschiedenen Marktphasen:
     * - peak: Markt auf Allzeithoch(48 Monate Runway)
     * - hot_neutral: Stabiler Markt(36 Monate)
     * - bear: Bärenmarkt (60 Monate = 5 Jahre!)
     * - recovery_in_bear: Erholung im Bärenmarkt(48 Monate)
     */
    PROFIL_MAP: {
        'sicherheits-dynamisch': {
            isDynamic: true,                            // Dynamisches Profil (Runway variiert mit Markt)
            minRunwayMonths: 24,                        // Min. 24 Monate Runway immer halten
            runway: {
                'peak': { total: 48 },                  // 4 Jahre bei Peak
                'hot_neutral': { total: 36 },           // 3 Jahre im Normalfall
                'bear': { total: 60 },                  // 5 Jahre im Bärenmarkt
                'stagflation': { total: 60 },           // 5 Jahre bei Stagflation
                'recovery_in_bear': { total: 48 },      // 4 Jahre in Recovery
                'recovery': { total: 48 }               // 4 Jahre in normaler Recovery
            }
        }
    },

    /**
     * Ausgabenmodell-Parameter
     *
     * Steuert die Flex-Rate-Anpassung (= wie viel vom flexiblen Bedarf wird entnommen):
     * - SMOOTHING_ALPHA: Glättungsfaktor (0.35 = 35% neue Rate, 65% alte Rate)
     * - MAX_UP_PP: Max. Erhöhung pro Jahr in Prozentpunkten (normal: 2.5pp)
     * - AGILE_UP_PP: Max. Erhöhung in günstigen Phasen (4.5pp)
     * - MAX_DOWN_PP: Max. Reduktion pro Jahr (3.5pp)
     * - MAX_DOWN_IN_BEAR_PP: Max. Reduktion im Bärenmarkt (10pp = drastisch!)
     */
    SPENDING_MODEL: {
        FLEX_RATE_SMOOTHING_ALPHA: 0.35,                // Glättungsfaktor für Flex-Rate
        RATE_CHANGE_MAX_UP_PP: 2.5,                     // +2.5pp pro Jahr (konservativ)
        RATE_CHANGE_AGILE_UP_PP: 4.5,                   // +4.5pp in Peak/Recovery (agiler)
        RATE_CHANGE_MAX_DOWN_PP: 3.5,                   // -3.5pp pro Jahr (normal)
        RATE_CHANGE_MAX_DOWN_IN_BEAR_PP: 6.0,           // -6pp im Bärenmarkt (sanfter)
        RATE_CHANGE_RELAX_MAX_DOWN_PP: 20.0,            // Max. Relaxierung der Down-Rate bei hohem Vermögen
        WEALTH_ADJUSTED_REDUCTION: {
            SAFE_WITHDRAWAL_RATE: 0.015,                // Unter 1.5%: keine marktbedingte Reduktion
            FULL_WITHDRAWAL_RATE: 0.035                 // Ab 3.5%: volle Reduktion
        },
        FLEX_BUDGET: {
            ENABLED: true,
            DEFAULT_MAX_YEARS: 5,
            DEFAULT_RECHARGE_FRACTION: 0.7,
            ACTIVE_REGIMES: ['bear_deep', 'recovery_in_bear'],
            REGIME_WEIGHTS: {
                bear_deep: 1.0,
                recovery_in_bear: 0.5
            },
            REGIME_CAP_MULTIPLIER: {
                bear_deep: 1.0,
                recovery_in_bear: 1.5
            },
            MIN_RATE_BASE_PCT: {
                bear_deep: 5,
                recovery_in_bear: 5
            },
            MIN_RATE_FLOOR_SLOPE_PCT: {
                bear_deep: 60,
                recovery_in_bear: 60
            }
        },
        FLEX_SHARE_S_CURVE: {
            ENABLED: true,
            K: 0.8,                                     // Cap-Stärke (0..1)
            A: 14.0,                                    // Steilheit der S-Kurve
            B: 0.52                                     // Knickpunkt (Flex-Anteil 0..1)
        },
        FLEX_RATE_HARD_CAPS: {
            BEAR_DEEP_MAX_RATE: 70,                     // Max. Flex-Rate im tiefen Bärenmarkt
            FLEX_SHARE_RELIEF_MAX_PP: 15,              // Entlastung bei geringem Flex-Anteil
            RUNWAY_COVERAGE_CAPS: [
                { maxCoverage: 1.20, maxRate: 70 },     // <120% Runway-Deckung
                { maxCoverage: 1.05, maxRate: 60 },     // <105% Runway-Deckung
                { maxCoverage: 0.90, maxRate: 50 }      // <90% Runway-Deckung
            ]
        },
        FLEX_RATE_FINAL_LIMITS: {
            MAX_UP_PP: 12.0,                            // Max. Anstieg nach Caps pro Jahr
            MAX_DOWN_PP: 12.0,                          // Max. Rückgang nach Caps pro Jahr
            MAX_DOWN_IN_BEAR_PP: 10.0,                  // Sanfterer Abbau im Bärenmarkt
            RELAX_MAX_DOWN_PP: 20.0                     // Max. Relaxierung des Final-Down-Limits
        },
        DYNAMIC_FLEX: {
            SAFE_ASSET_REAL_RETURN: 0.005,              // 0.5% reale Rendite sichere Anlagen
            GOLD_REAL_RETURN: 0.01,                     // 1.0% reale Rendite Gold
            MIN_HORIZON_YEARS: 1,                       // Mindest-Restlaufzeit
            MAX_HORIZON_YEARS: 60,                      // Maximale Restlaufzeit
            FALLBACK_REAL_RETURN: 0.03,                 // Fallback wenn kein CAPE-Signal
            MIN_REAL_RETURN: 0.00,                      // Untergrenze fuer Phase 1
            MAX_REAL_RETURN: 0.05,                      // Obergrenze fuer Phase 1
            EXPECTED_RETURN_SMOOTHING_ALPHA: 0.35,      // Daempfung gegen Spruenge
            MAX_GO_GO_MULTIPLIER: 1.5                   // Sicherheitslimit Go-Go
        },
        DYNAMIC_FLEX_SAFETY: {
            ENABLED: true,
            MAX_STAGE: 2,
            BAD_SCORE_THRESHOLD: 2,                     // Ab diesem Score gilt ein Jahr als "kritisch"
            SEVERE_SCORE_THRESHOLD: 5,                  // Harte Eskalation um 1 Stufe
            ESCALATE_STREAK_YEARS: 2,                   // Kritische Jahre in Folge bis Eskalation
            DEESCALATE_STREAK_YEARS: 2,                 // Stabile Jahre in Folge bis Deeskalation
            HARD_CUT_PCT: 35,                           // Sehr starke Flex-Kuerzung als Stresssignal
            GOOD_WITHDRAWAL_RATE: 0.05,                 // Für Deeskalation: Entnahmequote <= 5%
            GOOD_DRAWDOWN: 0.25,                        // Für Deeskalation: Drawdown <= 25%
            GOOD_CUT_PCT: 45,                           // Für Deeskalation: max. 45% Kürzung
            RUNWAY_HEADROOM_MONTHS: 3,                  // Für Deeskalation: Min-Runway + Puffer
            REENTRY_RAMP_YEARS: 3,                      // Nach 2->1 Dynamic-Flex über N Jahre weich einblenden
            STAGE2_REQUIRE_CRITICAL_STRESS: true,       // Stage 2 nur bei Alarm/Runway-Krise
            STAGE2_MIN_FLEX_OF_FLOOR_RATIO: 0.25,       // Stage-2-Flexboden relativ zum Floor
            STAGE2_MIN_FLEX_OF_PREV_DYNAMIC_RATIO: 0.20 // Stage-2-Flexboden relativ zur letzten Dynamic-Flex-Hoehe
        }
    },

    /**
     * Anti-Pseudo-Accuracy
     *
     * Vermeidet "krumme" Beträge in Transaktionen (z.B. 12.341,52€), die eine falsche Präzision suggerieren.
     * Stattdessen werden Beträge intelligent gerundet (quantisiert).
     */
    ANTI_PSEUDO_ACCURACY: {
        ENABLED: true,
        HYSTERESIS_MIN_REFILL_AMOUNT: 2000,   // Unter 2.000€ ignorieren (Rauschunterdrückung)

        // Adaptive Rundungsstufen: [Obergrenze (exklusiv), Schrittweite]
        QUANTIZATION_TIERS: [
            { limit: 10000, step: 1000 },     // z.B. 1.850 -> 2.000
            { limit: 50000, step: 5000 },     // z.B. 12.300 -> 15.000
            { limit: 200000, step: 10000 },   // z.B. 86.000 -> 90.000
            { limit: Infinity, step: 25000 }  // z.B. 238.234 -> 250.000
        ],

        // Eigene Tiers für monatliche Beträge (feiner)
        QUANTIZATION_TIERS_MONTHLY: [
            { limit: 2000, step: 50 },    // z.B. 1.832 -> 1.850
            { limit: 5000, step: 100 },   // z.B. 3.420 -> 3.500
            { limit: Infinity, step: 250 } // z.B. 6.100 -> 6.250
        ]
    },

    /**
     * Recovery-Guardrails
     *
     * Verhindert zu aggressive Entnahmen während der Markt-Erholung.
     * Die Flex-Rate wird gekappt basierend auf dem Abstand zum Allzeithoch (ATH).
     *
     * Beispiel: Bei 25%+ Abstand vom ATH -> Max. 75% Flex-Rate (25% Kürzung)
     */
    RECOVERY_GUARDRAILS: {
        description: "Vorsichtige Erhöhung der Flex-Rate während Erholungsphasen, abhängig vom Abstand zum ATH.",

        // Kürzungsregeln basierend auf ATH-Abstand
        CURB_RULES: [
            { minGap: 25, maxGap: Infinity, curbPercent: 25 },
            { minGap: 15, maxGap: 25, curbPercent: 20 },
            { minGap: 10, maxGap: 15, curbPercent: 15 },
            { minGap: 0, maxGap: 10, curbPercent: 10 }
        ],

        /**
         * Bestimmt Kürzung basierend auf ATH-Abstand
         * @param {number} athGapPercent - Abstand vom Allzeithoch in Prozent
         * @returns {number} Kürzung in Prozentpunkten (10-25%)
         */
        getCurb(athGapPercent) {
            const rule = this.CURB_RULES.find(c => athGapPercent > c.minGap && athGapPercent <= c.maxGap);
            return rule ? rule.curbPercent : 10;
        }
    },

    /**
     * Bewertungsparameter für CAPE-basierte Marktanalysen.
     * Diese Werte werden für diagnostische Hinweise und erwartete Renditen genutzt.
     */
    MARKET_VALUATION: {
        DEFAULT_CAPE: 20,
        UNDERVALUED_CAPE: 15,
        FAIR_VALUE_CAPE: 25,
        OVERVALUED_CAPE: 30,
        EXTREME_OVERVALUED_CAPE: 35,
        EXPECTED_RETURN_BY_SIGNAL: {
            undervalued: 0.08,
            fair: 0.07,
            overvalued: 0.05,
            extreme_overvalued: 0.04
        }
    },

    /**
     * Texte und Mappings für UI-Darstellung
     */
    TEXTS: {
        /**
         * Szenario-Beschreibungen für UI
         * Mapping von Szenario-Key zu lesbarem Text
         */
        SCENARIO: {
            peak_hot: "Markt heiß gelaufen",                // Überhitzter Markt
            peak_stable: "Stabiler Höchststand",            // Stabiles ATH
            recovery: "Best. Erholung",                     // Bestätigte Erholung
            bear_deep: "Tiefer Bär",                        // Tiefer Bärenmarkt
            corr_young: "Junge Korrektur",                  // Kurze Korrektur
            side_long: "Seitwärts Lang",                    // Lange Seitwärtsbewegung
            recovery_in_bear: "Erholung im Bärenmarkt"      // Rally im Bärenmarkt
        },

        /**
         * Regime-Mapping für Runway-Berechnung
         * Mappt spezifische Szenarien auf allgemeine Markt-Regimes
         */
        REGIME_MAP: {
            peak_hot: 'peak',                               // Überhitzt -> Peak-Regime
            peak_stable: 'hot_neutral',                     // Stabil -> Hot-Neutral
            side_long: 'hot_neutral',                       // Seitwärts -> Hot-Neutral
            recovery: 'recovery',                           // Erholung -> Recovery
            corr_young: 'recovery',                         // Junge Korrektur -> Recovery
            bear_deep: 'bear',                              // Tiefer Bär -> Bear
            recovery_in_bear: 'recovery_in_bear'            // Rally im Bär -> Special Recovery
        },

        /**
         * Bewertungstexte für CAPE-Signale
         */
        VALUATION_SIGNAL: {
            undervalued: 'Bewertung attraktiv',
            fair: 'Bewertung moderat',
            overvalued: 'Bewertung angespannt',
            extreme_overvalued: 'Bewertung extrem angespannt'
        }
    }
};

export default { ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG };
