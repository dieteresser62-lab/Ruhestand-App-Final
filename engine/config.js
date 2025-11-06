'use strict';

/**
 * ===================================================================
 * ENGINE CONFIGURATION MODULE
 * ===================================================================
 * Zentrale Konfiguration für die Ruhestand-Engine
 * Einzige Quelle für Schwellenwerte, Profile und Texte
 * ===================================================================
 */

const ENGINE_API_VERSION = "31.0";
const ENGINE_BUILD_ID = new Date().toISOString().substring(0, 16).replace('T', '_');

const CONFIG = {
    APP: {
        VERSION: ENGINE_API_VERSION,
        NAME: 'Ruhestand-Engine-Core'
    },
    THRESHOLDS: {
        ALARM: {
            withdrawalRate: 0.055,
            realDrawdown: 0.25,
        },
        CAUTION: {
            withdrawalRate: 0.045,
            inflationCap: 3,
        },
        STRATEGY: {
            stagflationInflation: 4,
            runwayThinMonths: 24,
            liquidityBufferZonePercent: 10,
            minRefillAmount: 10000,
            minTradeAmountStatic: 25000,
            minTradeAmountDynamicFactor: 0.005,
            cashRebalanceThreshold: 2500,
            recoveryLiquidityTargetFactor: 0.85
        }
    },
    PROFIL_MAP: {
        'sicherheits-dynamisch': {
            isDynamic: true, minRunwayMonths: 24,
            runway: {
                'peak': { total: 48 }, 'hot_neutral': { total: 36 }, 'bear': { total: 60 },
                'stagflation': { total: 60 }, 'recovery_in_bear': { total: 48 }, 'recovery': { total: 48 }
            }
        }
    },
    SPENDING_MODEL: {
        FLEX_RATE_SMOOTHING_ALPHA: 0.35, RATE_CHANGE_MAX_UP_PP: 2.5, RATE_CHANGE_AGILE_UP_PP: 4.5,
        RATE_CHANGE_MAX_DOWN_PP: 3.5, RATE_CHANGE_MAX_DOWN_IN_BEAR_PP: 10.0
    },
    RECOVERY_GUARDRAILS: {
        description: "Vorsichtige Erhöhung der Flex-Rate während Erholungsphasen, abhängig vom Abstand zum ATH.",
        CURB_RULES: [
            { minGap: 25, maxGap: Infinity, curbPercent: 25 },
            { minGap: 15, maxGap: 25,       curbPercent: 20 },
            { minGap: 10, maxGap: 15,       curbPercent: 15 },
            { minGap: 0,  maxGap: 10,       curbPercent: 10 }
        ],
        getCurb(athGapPercent) {
            const rule = this.CURB_RULES.find(c => athGapPercent > c.minGap && athGapPercent <= c.maxGap);
            return rule ? rule.curbPercent : 10;
        }
    },
    TEXTS: {
        SCENARIO: {
            peak_hot: "Markt heiß gelaufen", peak_stable: "Stabiler Höchststand", recovery: "Best. Erholung",
            bear_deep: "Tiefer Bär", corr_young: "Junge Korrektur", side_long: "Seitwärts Lang",
            recovery_in_bear: "Erholung im Bärenmarkt"
        },
        REGIME_MAP: {
            peak_hot: 'peak', peak_stable: 'hot_neutral', side_long: 'hot_neutral', recovery: 'recovery',
            corr_young: 'recovery', bear_deep: 'bear', recovery_in_bear: 'recovery_in_bear'
        }
    }
};

// Exporte
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG };
}
