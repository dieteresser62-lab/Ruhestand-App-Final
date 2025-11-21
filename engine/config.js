'use strict';

/**
 * ===================================================================
 * ENGINE CONFIGURATION MODULE
 * ===================================================================
 * Zentrale Konfiguration für die Ruhestand-Engine
 * Einzige Quelle für Schwellenwerte, Profile und Texte
 * ===================================================================
 */

// Engine-Versionierung
const ENGINE_API_VERSION = "31.0";
const ENGINE_BUILD_ID = "2025-11-20_16-20";

/**
 * Zentrale Engine-Konfiguration
 *
 * Diese Konfiguration definiert alle kritischen Schwellenwerte und Parameter
 * für die Ruhestand-Engine. Änderungen an diesen Werten können signifikante
 * Auswirkungen auf die Ausgaben- und Transaktionsstrategie haben.
 */
const CONFIG = {
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
            minRefillAmount: 10000,                     // Min. 10.000€ für Depot-Verkauf und reduziertes Liquiditäts-Gate
            minTradeAmountStatic: 25000,                // Min. 25.000€ für Rebalancing-Trades
            minTradeAmountDynamicFactor: 0.005,         // 0.5% des Portfolios als dynamischer Trade-Mindestbetrag
            cashRebalanceThreshold: 2500,               // Min. 2.500€ für Cash-Rebalancing
            recoveryLiquidityTargetFactor: 0.85,        // 85% des Ziel-Runway in Recovery-Phasen
            absoluteMinLiquidity: 10000,                // Min. 10.000€ absolute Liquidität (für ruhiges Schlafen)
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
        RATE_CHANGE_MAX_DOWN_IN_BEAR_PP: 10.0           // -10pp im Bärenmarkt (drastisch)
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

// Exporte
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG };
}
