'use strict';

/**
 * ===================================================================
 * RUHESTANDSMODELL ENGINE v31.0 (Modularized & Bundled)
 * ===================================================================
 *
 * Diese Datei wurde automatisch aus mehreren Modulen zusammengebaut.
 * Um den Code zu bearbeiten, ändern Sie die Quelldateien im engine/ Verzeichnis
 * und führen Sie dann 'node build-engine.js' aus.
 *
 * MODULE STRUCTURE:
 * ===================================================================
 *
 * engine/
 * ├── errors.js                    # Fehlerklassen
 * ├── config.js                    # Zentrale Konfiguration
 * ├── validators/
 * │   └── InputValidator.js        # Eingabevalidierung
 * ├── analyzers/
 * │   └── MarketAnalyzer.js        # Marktanalyse
 * ├── planners/
 * │   └── SpendingPlanner.js       # Ausgabenplanung
 * ├── transactions/
 * │   └── TransactionEngine.js     # Transaktionslogik
 * ├── core.js                      # Orchestrierung & EngineAPI
 * └── adapter.js                   # Simulator-V5-Adapter
 *
 * ===================================================================
 */

(function(global) {
    // Simuliere require() für Browser
    const moduleCache = {};
    function require(modulePath) {
        if (moduleCache[modulePath]) {
            return moduleCache[modulePath];
        }
        throw new Error('Module not found: ' + modulePath);
    }

    // ========================================
    // engine/errors.js
    // ========================================
/**
 * ===================================================================
 * ENGINE ERRORS MODULE
 * ===================================================================
 * Spezifische Fehlerklassen für die Ruhestand-Engine
 * ===================================================================
 */

/**
 * Basis-Fehlerklasse für alle Engine-Fehler
 */
class AppError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.context = context;
        this.timestamp = new Date();
    }
}

/**
 * Fehlerklasse für Validierungsfehler
 */
class ValidationError extends AppError {
    constructor(errors) {
        super("Einige Eingaben sind ungültig. Bitte korrigieren Sie die markierten Felder.");
        this.name = 'ValidationError';
        this.errors = errors; // Array von {field, message}
    }
}

/**
 * Fehlerklasse für Berechnungsfehler
 */
class FinancialCalculationError extends AppError {
    constructor(message, context) {
        super(message, context);
        this.name = 'FinancialCalculationError';
    }
}



    // Export für engine/errors.js
    moduleCache['engine/errors.js'] = { AppError, ValidationError, FinancialCalculationError };

    // ========================================
    // engine/config.js
    // ========================================
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



    // Export für engine/config.js
    moduleCache['engine/config.js'] = { ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG };

    // ========================================
    // engine/validators/InputValidator.js
    // ========================================
/**
 * ===================================================================
 * INPUT VALIDATOR MODULE
 * ===================================================================
 * Validiert Benutzereingaben und gibt strukturierte Fehler zurück
 * ===================================================================
 */

const InputValidator = {
    /**
     * Validiert alle Benutzereingaben auf Plausibilität
     *
     * Prüft folgende Kategorien:
     * - Alter (18-120 Jahre)
     * - Inflation (-10% bis +50%)
     * - Vermögenswerte (>= 0)
     * - Gold-Parameter (bei Aktivierung)
     * - Runway-Werte (min/target)
     * - Aktien-Zielquote (20-90%)
     * - Rebalancing-Parameter
     *
     * @param {Object} input - Benutzereingaben mit allen Parametern
     * @returns {Object} {valid: boolean, errors: Array<{fieldId, message}>}
     */
    validate(input) {
        const errors = [];

        // Hilfsfunktion für Validierungsprüfungen
        const check = (condition, fieldId, message) => {
            if (condition) {
                errors.push({ fieldId, message });
            }
        };

        // 1. Altersvalidierung
        // Plausibilitätsprüfung: 18 (Volljährigkeit) bis 120 Jahre
        check(
            input.aktuellesAlter < 18 || input.aktuellesAlter > 120,
            'aktuellesAlter',
            'Alter muss zwischen 18 und 120 liegen.'
        );

        // 2. Inflationsvalidierung
        // Erlaubt Deflation (-10%) bis extreme Inflation (50%)
        check(
            input.inflation < -10 || input.inflation > 50,
            'inflation',
            'Inflation außerhalb plausibler Grenzen (-10% bis 50%).'
        );

        // 3. Vermögenswerte dürfen nicht negativ sein
        // Prüft alle Depot- und Kostenbasis-Felder
        ['tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu', 'goldWert',
         'floorBedarf', 'flexBedarf', 'costBasisAlt', 'costBasisNeu', 'goldCost',
         'sparerPauschbetrag'].forEach(field => {
            check(input[field] < 0, field, 'Wert darf nicht negativ sein.');
        });

        // Marktdaten dürfen nicht negativ sein
        ['endeVJ', 'endeVJ_1', 'endeVJ_2', 'endeVJ_3', 'ath'].forEach(field => {
            check(input[field] < 0, field, 'Marktdaten dürfen nicht negativ sein.');
        });

        // 4. Gold-spezifische Validierung (nur wenn Gold aktiv)
        // Gold-Allokation sollte nicht mehr als 50% des Portfolios sein
        // Gold-Floor (Mindestbestand) sollte nicht mehr als 20% sein
        if(input.goldAktiv) {
            check(
                input.goldZielProzent <= 0 || input.goldZielProzent > 50,
                'goldZielProzent',
                'Ziel-Allokation unrealistisch (0-50%).'
            );
            check(
                input.goldFloorProzent < 0 || input.goldFloorProzent > 20,
                'goldFloorProzent',
                'Floor-Prozent unrealistisch (0-20%).'
            );
        }

        // 5. Runway-Validierung (Liquiditäts-Reichweite)
        // Minimum: 12-60 Monate (1-5 Jahre)
        // Ziel: 18-72 Monate (1.5-6 Jahre)
        // Ziel muss >= Minimum sein
        check(
            input.runwayMinMonths < 12 || input.runwayMinMonths > 60,
            'runwayMinMonths',
            'Runway Minimum muss zwischen 12 und 60 Monaten liegen.'
        );
        check(
            input.runwayTargetMonths < 18 || input.runwayTargetMonths > 72,
            'runwayTargetMonths',
            'Runway Ziel muss zwischen 18 und 72 Monaten liegen.'
        );
        check(
            input.runwayTargetMonths < input.runwayMinMonths,
            'runwayTargetMonths',
            'Runway Ziel darf nicht kleiner als das Minimum sein.'
        );

        // Aktien-Zielquote
        check(
            input.targetEq < 20 || input.targetEq > 90,
            'targetEq',
            'Aktien-Zielquote muss zwischen 20% und 90% liegen.'
        );

        // Rebalancing-Band
        check(
            input.rebalBand < 1 || input.rebalBand > 20,
            'rebalBand',
            'Rebalancing-Band muss zwischen 1% und 20% liegen.'
        );

        // Max. Abschöpfen
        check(
            input.maxSkimPctOfEq < 0 || input.maxSkimPctOfEq > 25,
            'maxSkimPctOfEq',
            'Max. Abschöpfen muss zwischen 0% and 25% liegen.'
        );

        // Max. Auffüllen (Bär)
        check(
            input.maxBearRefillPctOfEq < 0 || input.maxBearRefillPctOfEq > 15,
            'maxBearRefillPctOfEq',
            'Max. Auffüllen (Bär) muss zwischen 0% und 15% liegen.'
        );

        return { valid: errors.length === 0, errors };
    }
};



    // Export für engine/validators/InputValidator.js
    moduleCache['engine/validators/InputValidator.js'] = InputValidator;

    // ========================================
    // engine/analyzers/MarketAnalyzer.js
    // ========================================
/**
 * ===================================================================
 * MARKET ANALYZER MODULE
 * ===================================================================
 * Analysiert Marktbedingungen und bestimmt das aktuelle Marktszenario
 * ===================================================================
 */

// Imported from ../config.js: CONFIG

/**
 * Normalisiert den übergebenen CAPE-Wert und fällt auf die Konfiguration zurück.
 * @param {number} rawCapeRatio - Optionaler CAPE-Wert aus den Eingaben.
 * @returns {number} Bereinigter CAPE-Wert (> 0).
 */
function normalizeCapeRatio(rawCapeRatio) {
    const fallbackCape = CONFIG.MARKET_VALUATION.DEFAULT_CAPE;
    if (typeof rawCapeRatio === 'number' && Number.isFinite(rawCapeRatio) && rawCapeRatio > 0) {
        return rawCapeRatio;
    }
    return fallbackCape;
}

/**
 * Leitet basierend auf dem CAPE-Wert ein Bewertungssignal und die erwartete Rendite ab.
 * @param {number} rawCapeRatio - Optionaler CAPE-Wert.
 * @returns {Object} Bewertungskontext mit Signal-Key, CAPE und Erwartungswert.
 */
function deriveCapeAssessment(rawCapeRatio) {
    const normalizedCape = normalizeCapeRatio(rawCapeRatio);
    const valuationCfg = CONFIG.MARKET_VALUATION;

    let signalKey = 'fair';
    if (normalizedCape >= valuationCfg.EXTREME_OVERVALUED_CAPE) {
        signalKey = 'extreme_overvalued';
    } else if (normalizedCape >= valuationCfg.OVERVALUED_CAPE) {
        signalKey = 'overvalued';
    } else if (normalizedCape <= valuationCfg.UNDERVALUED_CAPE) {
        signalKey = 'undervalued';
    }

    const expectedReturn = valuationCfg.EXPECTED_RETURN_BY_SIGNAL[signalKey] ||
        valuationCfg.EXPECTED_RETURN_BY_SIGNAL.fair;
    const valuationText = CONFIG.TEXTS.VALUATION_SIGNAL[signalKey] || 'Bewertungs-Signal';

    return {
        capeRatio: normalizedCape,
        signalKey,
        expectedReturn,
        reasonText: `${valuationText} (CAPE ${normalizedCape.toFixed(1)}, exp. Rendite ${(expectedReturn * 100).toFixed(1)}%)`
    };
}

const MarketAnalyzer = {
    /**
     * Analysiert den Markt basierend auf historischen Daten
     * @param {Object} input - Eingabedaten mit Marktinformationen
     * @returns {Object} Marktanalyseergebnis mit Szenario und Metriken
     */
    analyzeMarket(input) {
        const { endeVJ, endeVJ_1, endeVJ_2, endeVJ_3, ath, jahreSeitAth, inflation, capeRatio } = input;

        // Abstand vom ATH berechnen
        const abstandVomAthProzent = (ath > 0 && endeVJ > 0)
            ? ((ath - endeVJ) / ath) * 100
            : 0;

        // 1-Jahres-Performance
        const perf1Y = (endeVJ_1 > 0)
            ? ((endeVJ - endeVJ_1) / endeVJ_1) * 100
            : 0;

        // Monate seit ATH
        let monateSeitAth = jahreSeitAth * 12;
        if (abstandVomAthProzent > 0 && jahreSeitAth === 0) {
            monateSeitAth = 12;
        }

        // Szenario bestimmen
        let sKey, reasons = [];

        if (abstandVomAthProzent <= 0) {
            // Neues Allzeithoch
            sKey = (perf1Y >= 10) ? 'peak_hot' : 'peak_stable';
            reasons.push('Neues Allzeithoch');
            if(perf1Y >= 10) reasons.push('Starkes Momentum (>10%)');
        } else if (abstandVomAthProzent > 20) {
            // Tiefer Bärenmarkt
            sKey = 'bear_deep';
            reasons.push(`ATH-Abstand > 20% (${abstandVomAthProzent.toFixed(1)}%)`);
        } else if (abstandVomAthProzent > 10 && perf1Y > 10 && monateSeitAth > 6) {
            // Erholung nach Korrektur
            sKey = 'recovery';
            reasons.push('Starkes Momentum nach Korrektur');
        } else if (abstandVomAthProzent <= 15 && monateSeitAth <= 6) {
            // Junge Korrektur
            sKey = 'corr_young';
            reasons.push('Kürzliche, leichte Korrektur');
        } else {
            // Seitwärtsphase
            sKey = 'side_long';
            reasons.push('Seitwärtsphase');
        }

        // Prüfung auf Erholung im Bärenmarkt
        if (sKey === 'bear_deep' || sKey === 'recovery') {
            const last4years = [endeVJ, endeVJ_1, endeVJ_2, endeVJ_3].filter(v => v > 0);
            const lowPoint = last4years.length > 0 ? Math.min(...last4years) : 0;
            const rallyFromLow = lowPoint > 0
                ? ((endeVJ - lowPoint) / lowPoint) * 100
                : 0;

            if ((perf1Y >= 15 || rallyFromLow >= 30) && abstandVomAthProzent > 15) {
                sKey = 'recovery_in_bear';
                reasons.push(
                    `Erholung im Bärenmarkt (Perf 1J: ${perf1Y.toFixed(0)}%, ` +
                    `Rally v. Tief: ${rallyFromLow.toFixed(0)}%)`
                );
            }
        }

        // Stagflation prüfen
        const real1Y = perf1Y - inflation;
        const isStagflation = inflation >= CONFIG.THRESHOLDS.STRATEGY.stagflationInflation && real1Y < 0;
        if(isStagflation) {
            reasons.push(
                `Stagflation (Inflation ${inflation}% > Realrendite ${real1Y.toFixed(1)}%)`
            );
        }

        // CAPE-basierte Bewertungsdiagnose
        const valuationContext = deriveCapeAssessment(capeRatio);
        if (valuationContext.reasonText) {
            reasons.push(valuationContext.reasonText);
        }

        // Szenariotext erstellen
        const szenarioText = (CONFIG.TEXTS.SCENARIO[sKey] || "Unbekannt") +
            (isStagflation ? " (Stagflation)" : "");

        return {
            perf1Y,
            abstandVomAthProzent,
            seiATH: (100 - abstandVomAthProzent) / 100,
            sKey,
            isStagflation,
            szenarioText,
            reasons,
            capeRatio: valuationContext.capeRatio,
            valuationSignal: valuationContext.signalKey,
            expectedReturnCape: valuationContext.expectedReturn
        };
    }
};



    // Export für engine/analyzers/MarketAnalyzer.js
    moduleCache['engine/analyzers/MarketAnalyzer.js'] = MarketAnalyzer;

    // ========================================
    // engine/planners/SpendingPlanner.js
    // ========================================
/**
 * ===================================================================
 * SPENDING PLANNER MODULE
 * ===================================================================
 * Berechnet die optimale Ausgabenstrategie basierend auf Marktbedingungen
 * und finanzieller Situation
 * ===================================================================
 */

// Imported from ../config.js: CONFIG

const SpendingPlanner = {
    /**
     * Bestimmt die Ausgabenstrategie für ein Jahr.
     *
     * @param {Object} params - Aggregierte Parameter der Engine-Orchestrierung.
     * @param {Object} params.lastState - Persistierter Zustand der Vorperiode.
     * @param {Object} params.market - Aktuelles Marktregime und Metadaten.
     * @param {Object} params.inflatedBedarf - Inflationsbereinigte Bedarfskomponenten.
     * @param {number} params.runwayMonate - Aktuelle Liquiditätsreichweite in Monaten.
     * @param {Object} params.profil - Aktives Risikoprofil inkl. Runway-Logik.
     * @param {Object} params.input - Roh-Input aus der UI.
     * @returns {{ spendingResult: Object, newState: Object, diagnosis: Object }}
     *          Komplettes Ergebnis mit neuer State, Diagnose und Entnahmeplan.
     */
    determineSpending(params) {
        const {
            lastState,
            market,
            inflatedBedarf,
            runwayMonate,
            profil,
            depotwertGesamt,
            gesamtwert,
            renteJahr,
            input
        } = params;

        const diagnosis = {
            decisionTree: [],
            guardrails: [],
            keyParams: {},
            general: {}
        };

        const addDecision = (step, impact, status, severity = 'info') => {
            diagnosis.decisionTree.push({ step, impact, status, severity });
        };

        // 1. State initialisieren oder laden.
        const state = this._initializeOrLoadState(lastState, params, addDecision);

        // 2. Alarm-Bedingungen evaluieren.
        const alarmStatus = this._evaluateAlarmConditions(state, params, addDecision);

        // 3. Flex-Rate berechnen (inkl. Glättung/Alarm-Verhalten).
        let { geglätteteFlexRate, kuerzungQuelle } = this._calculateFlexRate(
            state,
            alarmStatus,
            params,
            addDecision
        );

        // 4. Guardrails anwenden, sobald kein Alarm aktiv ist.
        let guardrailDiagnostics = {};
        if (!alarmStatus.active) {
            const guardrailResult = this._applyGuardrails(
                geglätteteFlexRate,
                state,
                { ...params, kuerzungQuelle },
                addDecision
            );
            geglätteteFlexRate = guardrailResult.rate;
            kuerzungQuelle = guardrailResult.source;
            guardrailDiagnostics = guardrailResult.diagnostics || {};
        }

        // 5. Endgültige Entnahme bestimmen.
        const endgueltigeEntnahme = inflatedBedarf.floor +
            (inflatedBedarf.flex * (Math.max(0, Math.min(100, geglätteteFlexRate)) / 100));

        // 6. Flex-Rate ableiten (Anteil des Flex-Bedarfs, der finanziert werden kann).
        const flexRate = (inflatedBedarf.flex > 0)
            ? ((Math.max(0, endgueltigeEntnahme - inflatedBedarf.floor) / inflatedBedarf.flex) * 100)
            : 0;

        // 7. Ergebnisobjekte aufbauen.
        const { newState, spendingResult, diagnosisMetrics } = this._buildResults(
            state,
            endgueltigeEntnahme,
            alarmStatus,
            flexRate,
            kuerzungQuelle,
            params
        );

        // 8. Diagnose vervollständigen.
        const runwayTargetInfo = this._resolveRunwayTarget(profil, market, input);
        diagnosis.general = {
            marketSKey: market.sKey,
            marketSzenario: market.szenarioText,
            alarmActive: alarmStatus.active,
            runwayMonate: runwayMonate,
            runwayTargetMonate: runwayTargetInfo.targetMonths,
            runwayTargetQuelle: runwayTargetInfo.source
        };

        // Guardrail-Überblick zusammenstellen.
        const guardrailEntries = [
            {
                name: 'Entnahmequote',
                value: state.keyParams.entnahmequoteDepot,
                threshold: CONFIG.THRESHOLDS.ALARM.withdrawalRate,
                type: 'percent',
                rule: 'max'
            },
            {
                name: 'Realer Drawdown (Gesamt)',
                value: state.keyParams.realerDepotDrawdown,
                threshold: CONFIG.THRESHOLDS.ALARM.realDrawdown,
                type: 'percent',
                rule: 'max'
            },
            {
                name: 'Runway (vs. Min)',
                value: runwayMonate,
                threshold: profil.minRunwayMonths,
                type: 'months',
                rule: 'min'
            }
        ];

        if (runwayTargetInfo.targetMonths && runwayTargetInfo.targetMonths > 0) {
            guardrailEntries.push({
                name: 'Runway (vs. Ziel)',
                value: runwayMonate,
                threshold: runwayTargetInfo.targetMonths,
                type: 'months',
                rule: 'min'
            });
        }

        if (guardrailDiagnostics.inflationCap) {
            guardrailEntries.push({
                name: 'Inflations-Cap',
                ...guardrailDiagnostics.inflationCap
            });
        }

        if (guardrailDiagnostics.budgetFloor) {
            guardrailEntries.push({
                name: 'Budget-Floor Deckung',
                ...guardrailDiagnostics.budgetFloor
            });
        }

        diagnosis.guardrails.push(...guardrailEntries);

        // Diagnose-Key-Parameter kopieren, um Seiteneffekte zu vermeiden.
        diagnosis.keyParams = {
            ...state.keyParams,
            aktuelleFlexRate: diagnosisMetrics.flexRate,
            kuerzungProzent: diagnosisMetrics.kuerzungProzent,
            jahresentnahme: diagnosisMetrics.jahresentnahme
        };

        return { spendingResult, newState, diagnosis };
    },

    /**
     * Initialisiert den Persistenz-State oder lädt die Vorperioden-Werte.
     *
     * @param {Object|null} lastState - Vorheriger State (kann fehlen).
     * @param {Object} params - Vollständiger Parameter-Datensatz.
     * @param {Function} addDecision - Callback zum Dokumentieren von Schritten.
     * @returns {Object} Neuer State mit aktualisierten Key-Parametern.
     */
    _initializeOrLoadState(lastState, params, addDecision) {
        const p = params;
        if (lastState && lastState.initialized) {
            const cumulativeInflationFactor = lastState.cumulativeInflationFactor || 1;
            const realVermögen = p.gesamtwert / cumulativeInflationFactor;
            const peakRealVermoegen = lastState.peakRealVermoegen || realVermögen;
            const realerDepotDrawdown = (peakRealVermoegen > 0)
                ? (peakRealVermoegen - realVermögen) / peakRealVermoegen
                : 0;
            const vorlaeufigeEntnahme = p.inflatedBedarf.floor +
                (p.inflatedBedarf.flex * (lastState.flexRate / 100));
            const entnahmequoteDepot = p.depotwertGesamt > 0
                ? vorlaeufigeEntnahme / p.depotwertGesamt
                : 0;

            return {
                ...lastState,
                keyParams: {
                    peakRealVermoegen,
                    currentRealVermoegen: realVermögen,
                    cumulativeInflationFactor,
                    entnahmequoteDepot,
                    realerDepotDrawdown
                }
            };
        }

        addDecision(
            'System-Initialisierung',
            'Starte mit 100% Flex-Rate und setze initialen Vermögens-Peak.',
            'active'
        );

        return {
            flexRate: 100,
            lastMarketSKey: p.market.sKey,
            lastTotalBudget: p.inflatedBedarf.floor + p.inflatedBedarf.flex + p.renteJahr,
            peakRealVermoegen: p.gesamtwert,
            cumulativeInflationFactor: 1,
            initialized: true,
            alarmActive: false,
            lastInflationAppliedAtAge: 0,
            keyParams: {
                peakRealVermoegen: p.gesamtwert,
                currentRealVermoegen: p.gesamtwert,
                cumulativeInflationFactor: 1,
                entnahmequoteDepot: 0,
                realerDepotDrawdown: 0
            }
        };
    },

    /**
     * Prüft, ob ein aktiver Alarm im Peak-Szenario zurückgefahren werden kann.
     *
     * @param {boolean} alarmWarAktiv - Flag aus dem Vorjahr.
     * @param {Object} state - Persistenter State.
     * @param {Object} params - Laufzeitdaten (inkl. Marktinformationen).
     * @returns {boolean} True, wenn eine Deeskalation erfolgen darf.
     */
    _shouldDeescalateInPeak(alarmWarAktiv, state, params) {
        const { market } = params;
        if (!alarmWarAktiv || !['peak_hot', 'peak_stable', 'side_long'].includes(market.sKey)) {
            return false;
        }
        const { entnahmequoteDepot, realerDepotDrawdown } = state.keyParams;
        return entnahmequoteDepot <= CONFIG.THRESHOLDS.ALARM.withdrawalRate ||
            realerDepotDrawdown <= 0.15;
    },

    /**
     * Prüft, ob ein aktiver Alarm im Recovery-Szenario zurückgefahren werden kann.
     *
     * @param {boolean} alarmWarAktiv - Flag aus dem Vorjahr.
     * @param {Object} state - Persistenter State.
     * @param {Object} params - Laufzeitdaten.
     * @returns {boolean} True, wenn eine Deeskalation erfolgen darf.
     */
    _shouldDeescalateInRecovery(alarmWarAktiv, state, params) {
        if (!alarmWarAktiv || params.market.sKey !== 'recovery_in_bear') {
            return false;
        }
        const { runwayMonate, profil, input } = params;
        const { entnahmequoteDepot, realerDepotDrawdown } = state.keyParams;
        const okRunway = runwayMonate >= (profil.minRunwayMonths + 6);
        const okDrawdnRecovery = realerDepotDrawdown <= (CONFIG.THRESHOLDS.ALARM.realDrawdown - 0.05);
        const noNewLowerYearlyCloses = input.endeVJ > Math.min(input.endeVJ_1, input.endeVJ_2);

        return (entnahmequoteDepot <= CONFIG.THRESHOLDS.ALARM.withdrawalRate ||
            okRunway || okDrawdnRecovery) && noNewLowerYearlyCloses;
    },

    /**
     * Bewertet sämtliche Alarmbedingungen.
     *
     * @param {Object} state - Persistenter State.
     * @param {Object} params - Laufzeitdaten.
     * @param {Function} addDecision - Protokollierungs-Hook.
     * @returns {{active: boolean, newlyTriggered: boolean}} Alarmstatus.
     */
    _evaluateAlarmConditions(state, params, addDecision) {
        const { market, runwayMonate, profil } = params;
        const { entnahmequoteDepot, realerDepotDrawdown } = state.keyParams;

        let alarmWarAktiv = state.alarmActive;

        // Deeskalation prüfen.
        if (this._shouldDeescalateInPeak(alarmWarAktiv, state, params)) {
            alarmWarAktiv = false;
            addDecision(
                'Alarm-Deeskalation (Peak)',
                'Markt erholt, Drawdown/Quote unkritisch. Alarm wird beendet.',
                'active',
                'guardrail'
            );
        } else if (this._shouldDeescalateInRecovery(alarmWarAktiv, state, params)) {
            alarmWarAktiv = false;
            addDecision(
                'Alarm-Deeskalation (Recovery)',
                'Bedingungen für Entspannung sind erfüllt. Alarm wird beendet.',
                'active',
                'guardrail'
            );
        }

        // Alarm-Aktivierung prüfen.
        const isCrisis = market.sKey === 'bear_deep';
        const isRunwayThin = runwayMonate < CONFIG.THRESHOLDS.STRATEGY.runwayThinMonths;
        const isQuoteCritical = entnahmequoteDepot > CONFIG.THRESHOLDS.ALARM.withdrawalRate;
        const isDrawdownCritical = realerDepotDrawdown > CONFIG.THRESHOLDS.ALARM.realDrawdown;

        const alarmAktivInDieserRunde = !alarmWarAktiv && isCrisis &&
            ((isQuoteCritical && isRunwayThin) || isDrawdownCritical);

        if (alarmAktivInDieserRunde) {
            addDecision(
                'Alarm-Aktivierung!',
                'Bärenmarkt und kritische Schwelle überschritten. Alarm-Modus AN.',
                'active',
                'alarm'
            );
        }

        return {
            active: alarmAktivInDieserRunde || alarmWarAktiv,
            newlyTriggered: alarmAktivInDieserRunde
        };
    },

    /**
     * Berechnet die Flex-Rate unter Berücksichtigung von Alarmstatus und Glättung.
     *
     * @param {Object} state - Persistenter State.
     * @param {Object} alarmStatus - Struktur aus _evaluateAlarmConditions.
     * @param {Object} params - Laufzeitdaten.
     * @param {Function} addDecision - Logging-Hook.
     * @returns {{ geglätteteFlexRate: number, kuerzungQuelle: string }}
     */
    _calculateFlexRate(state, alarmStatus, params, addDecision) {
        const p = params;
        if (alarmStatus.active) {
            const kuerzungQuelle = 'Guardrail (Alarm)';
            let geglätteteFlexRate = state.flexRate;

            if (alarmStatus.newlyTriggered) {
                const shortfallRatio = Math.max(
                    0,
                    (p.profil.minRunwayMonths - p.runwayMonate) / p.profil.minRunwayMonths
                );
                const zielCut = Math.min(10, Math.round(10 + 20 * shortfallRatio));
                geglätteteFlexRate = Math.max(35, state.flexRate - zielCut);
                addDecision(
                    'Anpassung im Alarm-Modus',
                    `Flex-Rate wird auf ${geglätteteFlexRate.toFixed(1)}% gesetzt.`,
                    'active',
                    'alarm'
                );
            } else {
                addDecision(
                    'Anpassung im Alarm-Modus',
                    `Alarm-Modus ist weiterhin aktiv, Rate bleibt bei ${geglätteteFlexRate.toFixed(1)}%.`,
                    'active',
                    'alarm'
                );
            }
            return { geglätteteFlexRate, kuerzungQuelle };
        }

        // Normale Berechnung.
        const { market } = p;
        const {
            FLEX_RATE_SMOOTHING_ALPHA,
            RATE_CHANGE_MAX_UP_PP,
            RATE_CHANGE_AGILE_UP_PP,
            RATE_CHANGE_MAX_DOWN_PP,
            RATE_CHANGE_MAX_DOWN_IN_BEAR_PP
        } = CONFIG.SPENDING_MODEL;

        let kuerzungQuelle = 'Profil';
        let roheKuerzungProzent = 0;

        if (market.sKey === 'bear_deep') {
            roheKuerzungProzent = 50 + Math.max(0, market.abstandVomAthProzent - 20);
            kuerzungQuelle = 'Tiefer Bär';
        }

        const roheFlexRate = 100 - roheKuerzungProzent;
        const prevFlexRate = state.flexRate ?? 100;
        let geglätteteFlexRate = FLEX_RATE_SMOOTHING_ALPHA * roheFlexRate +
            (1 - FLEX_RATE_SMOOTHING_ALPHA) * prevFlexRate;

        // Veränderungsraten begrenzen.
        const delta = geglätteteFlexRate - prevFlexRate;
        const regime = CONFIG.TEXTS.REGIME_MAP[market.sKey];
        const maxUp = (regime === 'peak' || regime === 'hot_neutral' || regime === 'recovery_in_bear')
            ? RATE_CHANGE_AGILE_UP_PP
            : RATE_CHANGE_MAX_UP_PP;
        const MAX_DOWN = (market.sKey === 'bear_deep')
            ? RATE_CHANGE_MAX_DOWN_IN_BEAR_PP
            : RATE_CHANGE_MAX_DOWN_PP;

        if (delta > maxUp) {
            geglätteteFlexRate = prevFlexRate + maxUp;
            kuerzungQuelle = 'Glättung (Anstieg)';
        } else if (delta < -MAX_DOWN) {
            geglätteteFlexRate = prevFlexRate - MAX_DOWN;
            kuerzungQuelle = 'Glättung (Abfall)';
        }

        if (kuerzungQuelle.startsWith('Glättung')) {
            addDecision(
                'Glättung der Rate',
                `Veränderung auf max. ${delta > 0 ? maxUp : MAX_DOWN} pp begrenzt.`,
                'active'
            );
        }

        return { geglätteteFlexRate, kuerzungQuelle };
    },

    /**
     * Wendet Guardrails auf die Flex-Rate an und liefert Diagnosedaten.
     *
     * @param {number} rate - Vorläufige Flex-Rate.
     * @param {Object} state - Persistenter State.
     * @param {Object} params - Laufzeitdaten.
     * @param {Function} addDecision - Logging-Hook.
     * @returns {{ rate: number, source: string, diagnostics: Object }} Ergebnis.
     */
    _applyGuardrails(rate, state, params, addDecision) {
        const {
            market, inflatedBedarf, renteJahr, input,
            runwayMonate, profil, kuerzungQuelle: initialSource
        } = params;
        const { entnahmequoteDepot } = state.keyParams;

        const isRecoveryContext = (market.sKey === 'recovery_in_bear') ||
            (market.sKey === 'recovery' && market.abstandVomAthProzent >= 15);
        const isCautionContext = (entnahmequoteDepot >= CONFIG.THRESHOLDS.CAUTION.withdrawalRate);

        let kuerzungQuelle = initialSource;
        let geglätteteFlexRate = rate;
        let cautiousRuleApplied = false;
        const diagnostics = {};

        // Recovery-Guardrail.
        if (market.sKey === 'recovery_in_bear') {
            const gap = market.abstandVomAthProzent || 0;
            let curb = CONFIG.RECOVERY_GUARDRAILS.getCurb(gap);
            if (runwayMonate < 30) curb = Math.max(curb, 20);
            const maxFlexRate = 100 - curb;

            if (geglätteteFlexRate > maxFlexRate) {
                geglätteteFlexRate = maxFlexRate;
                kuerzungQuelle = 'Guardrail (Vorsicht)';
                addDecision(
                    'Guardrail (Vorsicht)',
                    `Recovery-Cap: Flex-Rate auf ${maxFlexRate.toFixed(1)}% gekappt.`,
                    'active',
                    'guardrail'
                );
                cautiousRuleApplied = true;
            }
        }

        // Inflations-Cap bei hoher Entnahmequote.
        let inflationCap = input.inflation;
        if (entnahmequoteDepot >= CONFIG.THRESHOLDS.CAUTION.withdrawalRate) {
            const calculatedInflationCap = Math.min(
                input.inflation,
                CONFIG.THRESHOLDS.CAUTION.inflationCap
            );
            if (calculatedInflationCap < input.inflation) {
                kuerzungQuelle = 'Guardrail (Vorsicht)';
                addDecision(
                    'Guardrail (Vorsicht)',
                    `Caution-Cap: Inflationsanpassung auf ${calculatedInflationCap}% begrenzt.`,
                    'active',
                    'guardrail'
                );
            }
            inflationCap = calculatedInflationCap;
            cautiousRuleApplied = true;
            diagnostics.inflationCap = {
                rule: 'max',
                type: 'percent',
                threshold: Math.max(0, inflationCap) / 100,
                value: Math.max(0, input.inflation) / 100,
                details: {
                    entnahmequoteDepot,
                    capBinding: calculatedInflationCap < input.inflation
                }
            };
        }

        // Quelle anpassen, wenn vorsichtige Regeln greifen.
        const isWeakSource = ['Profil', 'Glättung (Anstieg)', 'Glättung (Abfall)'].includes(kuerzungQuelle);
        if ((isRecoveryContext || isCautionContext) && cautiousRuleApplied && isWeakSource) {
            kuerzungQuelle = 'Guardrail (Vorsicht)';
        }

        // Budget-Floor sichern.
        const inflationsFaktor = 1 + Math.max(0, inflationCap) / 100;
        const inflationsAnhebung = Math.max(0, Math.min(100, input.budgetInflationBoost || 0));
        const inflationsBoost = inflationsAnhebung / 100;
        const floorBedarfNachInflation = (inflatedBedarf.floor / inflationsFaktor) * (1 + inflationsBoost);
        const flexBedarfNachInflation = inflatedBedarf.flex / inflationsFaktor;
        const angepasstesMinBudget = floorBedarfNachInflation + flexBedarfNachInflation + renteJahr;
        let geplanteJahresentnahme = inflatedBedarf.floor +
            (inflatedBedarf.flex * (Math.max(0, Math.min(100, geglätteteFlexRate)) / 100));
        let aktuellesGesamtbudget = geplanteJahresentnahme + renteJahr;
        const noNewLowerYearlyCloses = input.endeVJ > Math.min(input.endeVJ_1, input.endeVJ_2);
        const budgetFloorErlaubt = !['bear_deep', 'recovery_in_bear'].includes(market.sKey) ||
            ((market.abstandVomAthProzent || 0) <= 10 && noNewLowerYearlyCloses &&
                runwayMonate >= Math.max(30, profil.minRunwayMonths + 6));

        if (budgetFloorErlaubt) {
            diagnostics.budgetFloor = {
                rule: 'min',
                type: 'currency',
                threshold: angepasstesMinBudget,
                value: aktuellesGesamtbudget
            };
        }

        if (budgetFloorErlaubt && !cautiousRuleApplied && aktuellesGesamtbudget + 1 < angepasstesMinBudget) {
            const benötigteJahresentnahme = Math.max(0, angepasstesMinBudget - renteJahr);
            const nötigeFlexRate = inflatedBedarf.flex > 0
                ? Math.min(100, Math.max(0, ((benötigteJahresentnahme - inflatedBedarf.floor) / inflatedBedarf.flex) * 100))
                : 0;

            if (nötigeFlexRate > geglätteteFlexRate) {
                geglätteteFlexRate = nötigeFlexRate;
                kuerzungQuelle = 'Budget-Floor';
                addDecision(
                    kuerzungQuelle,
                    `Um realen Kaufkraftverlust zu vermeiden, wird Rate auf ${geglätteteFlexRate.toFixed(1)}% angehoben.`,
                    'active',
                    'guardrail'
                );
                const aktualisierteEntnahme = inflatedBedarf.floor +
                    (inflatedBedarf.flex * (Math.max(0, Math.min(100, geglätteteFlexRate)) / 100));
                aktuellesGesamtbudget = aktualisierteEntnahme + renteJahr;
                if (diagnostics.budgetFloor) {
                    diagnostics.budgetFloor.value = aktuellesGesamtbudget;
                }
            }
        }

        return { rate: geglätteteFlexRate, source: kuerzungQuelle, diagnostics };
    },

    /**
     * Baut finale Ergebnisobjekte inklusive Diagnosemetriken.
     *
     * @param {Object} state - Persistenter State.
     * @param {number} endgueltigeEntnahme - Jahresentnahme nach Kürzungen.
     * @param {Object} alarmStatus - Struktur aus _evaluateAlarmConditions.
     * @param {number} flexRate - Effektive Flex-Rate in %.
     * @param {string} kuerzungQuelle - Hauptgrund für Kürzungen.
     * @param {Object} params - Laufzeitdaten.
     * @returns {{ newState: Object, spendingResult: Object, diagnosisMetrics: Object }}
     */
    _buildResults(state, endgueltigeEntnahme, alarmStatus, flexRate, kuerzungQuelle, params) {
        const { market, renteJahr } = params;
        const { peakRealVermoegen, currentRealVermoegen, cumulativeInflationFactor } = state.keyParams;

        const finaleKuerzung = 100 - flexRate;
        const aktuellesGesamtbudgetFinal = endgueltigeEntnahme + renteJahr;

        const diagnosisMetrics = {
            flexRate,
            kuerzungProzent: finaleKuerzung,
            jahresentnahme: endgueltigeEntnahme
        };

        const newState = {
            ...state,
            flexRate,
            lastMarketSKey: market.sKey,
            lastTotalBudget: aktuellesGesamtbudgetFinal,
            peakRealVermoegen: Math.max(peakRealVermoegen, currentRealVermoegen),
            alarmActive: alarmStatus.active,
            cumulativeInflationFactor: cumulativeInflationFactor,
            lastInflationAppliedAtAge: state.lastInflationAppliedAtAge
        };
        delete newState.keyParams;

        const spendingResult = {
            monatlicheEntnahme: endgueltigeEntnahme / 12,
            kuerzungProzent: finaleKuerzung,
            kuerzungQuelle: kuerzungQuelle,
            anmerkung: `(Flex um ${finaleKuerzung.toFixed(0)}% wg. ${kuerzungQuelle} gekürzt)`,
            details: { ...state.keyParams, flexRate, endgueltigeEntnahme }
        };

        return { newState, spendingResult, diagnosisMetrics };
    },

    /**
     * Ermittelt das relevante Runway-Ziel (statisch oder dynamisch je Regime).
     *
     * @param {Object} profil - Aktuelles Risikoprofil inkl. Runway-Konfiguration.
     * @param {Object} market - Marktinformationen mit Szenario-Key.
     * @param {Object} input - Benutzer-Input für statische Zielwerte.
     * @returns {{ targetMonths: number|null, source: string }} Zielwert und Quelle.
     */
    _resolveRunwayTarget(profil, market, input) {
        if (!profil) {
            return { targetMonths: input?.runwayTargetMonths || null, source: 'input' };
        }

        const fallbackMin = profil.minRunwayMonths || input?.runwayMinMonths || null;
        const inputTarget = (typeof input?.runwayTargetMonths === 'number' && input.runwayTargetMonths > 0)
            ? input.runwayTargetMonths
            : null;

        if (!profil.isDynamic) {
            const resolvedTarget = inputTarget || fallbackMin;
            return { targetMonths: resolvedTarget || null, source: 'input' };
        }

        const regimeKey = CONFIG.TEXTS.REGIME_MAP[market?.sKey] || market?.sKey || 'hot_neutral';
        const dynamicTarget = profil.runway?.[regimeKey]?.total;

        if (typeof dynamicTarget === 'number' && dynamicTarget > 0) {
            return { targetMonths: dynamicTarget, source: `profil:${regimeKey}` };
        }

        const resolvedTarget = inputTarget || fallbackMin || null;
        return { targetMonths: resolvedTarget, source: resolvedTarget ? 'fallback' : 'unknown' };
    }
};



    // Export für engine/planners/SpendingPlanner.js
    moduleCache['engine/planners/SpendingPlanner.js'] = SpendingPlanner;

    // ========================================
    // engine/transactions/TransactionEngine.js
    // ========================================
/**
 * ===================================================================
 * TRANSACTION ENGINE MODULE
 * ===================================================================
 * Bestimmt Transaktionsaktionen und berechnet Verkäufe mit Steuern
 * ===================================================================
 */

// Imported from ../config.js: CONFIG

const TransactionEngine = {
    /**
     * Berechnet Ziel-Liquidität basierend auf Profil und Markt
     */
    calculateTargetLiquidity: (profil, market, inflatedBedarf, input = null) => {
        if (!profil.isDynamic) {
            return (inflatedBedarf.floor + inflatedBedarf.flex) * 2;
        }

        const regime = CONFIG.TEXTS.REGIME_MAP[market.sKey];
        const profilMax = profil.runway[regime]?.total || profil.runway.hot_neutral.total;
        const minMonths = input?.runwayMinMonths || profil.minRunwayMonths;
        const userTarget = input?.runwayTargetMonths || profilMax;

        // Bidirektionale ATH-Skalierung:
        // seiATH = 1.0 (am ATH): User-Target (z.B. 36 Monate)
        // seiATH > 1.0 (über ATH): nach oben skalieren bis Profil-Max (z.B. 48)
        // seiATH < 1.0 (unter ATH): nach unten skalieren bis Minimum (z.B. 24)
        const seiATH = market.seiATH || 1;

        let zielMonate;
        if (seiATH >= 1) {
            // Über ATH: von userTarget hoch zu profilMax
            // 20% über ATH → volles profilMax
            const aboveAthFactor = Math.min((seiATH - 1) * 5, 1);
            zielMonate = userTarget + aboveAthFactor * (profilMax - userTarget);
        } else {
            // Unter ATH: von userTarget runter zu minMonths
            // 40% unter ATH → minMonths
            const belowAthFactor = Math.min((1 - seiATH) * 2.5, 1);
            zielMonate = userTarget - belowAthFactor * (userTarget - minMonths);
        }

        const useFullFlex = (regime === 'peak' || regime === 'hot_neutral');
        const anpassbarerBedarf = useFullFlex
            ? (inflatedBedarf.floor + inflatedBedarf.flex)
            : (inflatedBedarf.floor + 0.5 * inflatedBedarf.flex);

        return (Math.max(1, anpassbarerBedarf) / 12) * zielMonate;
    },

    /**
     * Berechnet gewichtete Allokation
     * @private
     */
    _computeWeights(input, gesamtwert) {
        if (gesamtwert <= 0) {
            return { eqWeight: 0, goldWeight: 0, liqWeight: 0 };
        }

        const aktienwert = input.depotwertAlt + input.depotwertNeu;
        const goldwert = input.goldAktiv ? input.goldWert : 0;
        const liquiditaet = input.tagesgeld + input.geldmarktEtf;

        return {
            eqWeight: aktienwert / gesamtwert,
            goldWeight: goldwert / gesamtwert,
            liqWeight: liquiditaet / gesamtwert
        };
    },

    /**
     * Berechnet begrenztes Auffüllen (mit Cap)
     * @private
     */
    _computeCappedRefill({ isBearContext, liquiditaetsbedarf, aktienwert, input, isCriticalLiquidity = false }) {
        const capConfig = isBearContext
            ? {
                pct: input.maxBearRefillPctOfEq,
                title: 'Bärenmarkt-Auffüllung (Drip)',
                diagStep: 'Cap wirksam (Bär)'
            }
            : {
                pct: input.maxSkimPctOfEq,
                title: 'Opportunistisches Rebalancing (Skim & Fill)',
                diagStep: 'Cap wirksam (Skim)'
            };

        const maxCapEuro = (capConfig.pct / 100) * aktienwert;
        // Bei kritischer Liquidität: erhöhtes Cap erlauben (10% des Aktienwerts)
        const effectiveMaxCap = isCriticalLiquidity
            ? Math.max(maxCapEuro, aktienwert * 0.10)
            : maxCapEuro;
        const nettoBedarf = Math.min(liquiditaetsbedarf, effectiveMaxCap);
        const isCapped = nettoBedarf < liquiditaetsbedarf;

        // Bei kritischer Liquidität: stark reduzierte Mindestschwelle verwenden
        // Wenn isCriticalLiquidity true ist, setzen wir das Limit auf 0, um JEDE notwendige Auffüllung zu erlauben
        // und so den "Notfall-Verkauf" im Folgejahr zu verhindern.
        const effectiveMinRefill = isCriticalLiquidity
            ? 0
            : CONFIG.THRESHOLDS.STRATEGY.minRefillAmount;

        if (nettoBedarf < effectiveMinRefill) {
            if (liquiditaetsbedarf >= effectiveMinRefill) {
                return {
                    bedarf: 0,
                    title: '',
                    diagnosisEntries: [{
                        step: "Aktion unterdrückt",
                        impact: `Geplanter Verkauf (${nettoBedarf.toFixed(0)}€) unter Mindestgröße nach Capping.`,
                        status: 'inactive',
                        severity: 'guardrail'
                    }],
                    isCapped
                };
            }
            return { bedarf: 0, title: '', diagnosisEntries: [], isCapped };
        }

        const title = isCapped ? `${capConfig.title} (Cap aktiv)` : capConfig.title;
        const diagnosisEntries = isCapped
            ? [{
                step: capConfig.diagStep,
                impact: `Auffüllen auf ${nettoBedarf.toFixed(0)}€ (${capConfig.pct}%) begrenzt.`,
                status: 'active',
                severity: 'guardrail'
            }]
            : [];

        return { bedarf: nettoBedarf, title, diagnosisEntries, isCapped };
    },

    /**
     * Ermittelt die anwendbare Mindest-Trade-Schwelle für liquiditätsgetriebene Aktionen.
     *
     * @param {Object} params - Parameterobjekt
     * @param {number} params.investiertesKapital - Gesamtwert des Portfolios inkl. Liquidität
     * @param {number} params.liquiditaetsBedarf - Geplanter Liquiditätszufluss (ohne Gold)
     * @param {number} params.totalerBedarf - Gesamter Zielzufluss (inklusive etwaiger Gold-Beschaffungen)
     * @returns {{ appliedMinTradeGate: number, minTradeResultOverride: (number|null), diagnosisEntry: (Object|null) }}
     */
    _computeAppliedMinTradeGate({ investiertesKapital, liquiditaetsBedarf, totalerBedarf }) {
        const basisMinTrade = Math.max(
            CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
            investiertesKapital * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
        );
        const liquidityEmergencyGate = Math.max(
            CONFIG.THRESHOLDS.STRATEGY.minRefillAmount || 0,
            CONFIG.THRESHOLDS.STRATEGY.cashRebalanceThreshold || 0
        );

        let appliedMinTradeGate = basisMinTrade;
        let minTradeResultOverride = null;
        let diagnosisEntry = null;

        const shouldRelaxMinTradeGate =
            liquiditaetsBedarf > 0 && totalerBedarf > 0 && totalerBedarf < basisMinTrade;

        if (shouldRelaxMinTradeGate) {
            appliedMinTradeGate = Math.min(basisMinTrade, liquidityEmergencyGate);

            if (appliedMinTradeGate < basisMinTrade) {
                minTradeResultOverride = appliedMinTradeGate;
                diagnosisEntry = {
                    step: 'Liquiditäts-Priorität',
                    impact: `Mindestschwelle temporär auf ${appliedMinTradeGate.toFixed(0)}€ gesenkt (statt ${basisMinTrade.toFixed(0)}€).`,
                    status: 'active',
                    severity: 'info'
                };
            }
        }

        return { appliedMinTradeGate, minTradeResultOverride, diagnosisEntry };
    },

    /**
     * Bestimmt notwendige Transaktionsaktion
     */
    determineAction(p) {
        const {
            aktuelleLiquiditaet, depotwertGesamt, zielLiquiditaet,
            market, spending, minGold, profil, input
        } = p;

        let actionDetails = { bedarf: 0, title: '', diagnosisEntries: [], isCapped: false };
        let isPufferSchutzAktiv = false;
        let verwendungen = { liquiditaet: 0, gold: 0, aktien: 0 };
        let minTradeResultOverride = null;
        const transactionDiagnostics = {
            wasTriggered: false,
            blockReason: 'none',
            blockedAmount: 0,
            equityThresholds: {
                targetAllocationPct: input.targetEq,
                rebalancingBandPct: input.rebalancingBand ?? input.rebalBand ?? 35,
                maxSkimPctOfEq: input.maxSkimPctOfEq
            },
            goldThresholds: {
                minGoldReserve: minGold,
                targetPct: input.goldZielProzent || 0,
                maxBearRefillPctOfEq: input.maxBearRefillPctOfEq
            },
            potentialTrade: {}
        };
        const markAsBlocked = (reason, blockedAmount = 0, overrides = {}) => {
            transactionDiagnostics.blockReason = reason;
            transactionDiagnostics.blockedAmount = Math.max(0, blockedAmount);
            if (overrides && typeof overrides === 'object') {
                transactionDiagnostics.potentialTrade = {
                    ...transactionDiagnostics.potentialTrade,
                    ...overrides
                };
            }
        };
        const saleContext = { minGold, saleBudgets: {} };

        const renteJahr = input.renteAktiv ? input.renteMonatlich * 12 : 0;
        const floorBedarfNetto = Math.max(0, input.floorBedarf - renteJahr);

        // Strukturales Runway-Mindestmaß ableiten: Bevorzugt das Profil-Minimum, fällt sonst auf Input/Strategie zurück.
        // Design-Entscheidung: Die neutrale Notfüllung soll nur bei echter Runway-Unterschreitung auslösen –
        // daher orientieren wir uns an der harten Untergrenze (Profil), nicht an höheren Zielwerten.
        const runwayMinThresholdMonths = profil?.minRunwayMonths
            ?? CONFIG.THRESHOLDS.STRATEGY.runwayThinMonths
            ?? input.runwayMinMonths;

        const krisenMindestLiquiditaet = (floorBedarfNetto / 12) * runwayMinThresholdMonths;
        // Sicherheits-Puffer: Entweder rechnerischer Bedarf oder absolutes Minimum (für ruhiges Schlafen)
        const sicherheitsPuffer = Math.max(
            krisenMindestLiquiditaet,
            CONFIG.THRESHOLDS.STRATEGY.absoluteMinLiquidity || 10000
        );
        const isBearRegimeProxy = market.sKey === 'bear_deep' || market.sKey === 'recovery_in_bear';
        console.log('DEBUG TransactionEngine: isBearRegimeProxy', isBearRegimeProxy, 'market.sKey', market.sKey, 'aktuelleLiquiditaet', aktuelleLiquiditaet, 'sicherheitsPuffer', sicherheitsPuffer);
        const investiertesKapital = depotwertGesamt + aktuelleLiquiditaet;

        // Puffer-Schutz im Bärenmarkt
        if (aktuelleLiquiditaet <= sicherheitsPuffer && isBearRegimeProxy) {
            isPufferSchutzAktiv = true;
            const gap = sicherheitsPuffer - aktuelleLiquiditaet;

            if (gap > 1) {
                actionDetails.bedarf = Math.max(0, gap);
                actionDetails.title = "Notfall-Verkauf (Puffer-Auffüllung)";
            } else {
                actionDetails.bedarf = floorBedarfNetto;
                actionDetails.title = "Notfall-Verkauf (Puffer-Sicherung)";
            }

            actionDetails.diagnosisEntries.push({
                step: "Puffer-Schutz (Floor-Fill)",
                impact: `Runway-Sicherung um ${actionDetails.bedarf.toFixed(0)}€`,
                status: 'active',
                severity: 'alarm'
            });
            verwendungen.liquiditaet = actionDetails.bedarf;
        }

        // Normale Transaktionslogik
        if (!isPufferSchutzAktiv) {
            const gesamtjahresbedarf = floorBedarfNetto + input.flexBedarf;
            const currentRunwayMonths = (gesamtjahresbedarf > 0)
                ? (aktuelleLiquiditaet / (gesamtjahresbedarf / 12))
                : Infinity;
            // Floor-basierter Runway für Guardrail-Prüfung (konsistent mit UI-Anzeige)
            const currentFloorRunwayMonths = (floorBedarfNetto > 0)
                ? (aktuelleLiquiditaet / (floorBedarfNetto / 12))
                : Infinity;
            const aktienwert = input.depotwertAlt + input.depotwertNeu;
            const zielLiquiditaetsdeckung = (zielLiquiditaet > 0)
                ? (aktuelleLiquiditaet / zielLiquiditaet)
                : 1;
            const runwayCoverageThreshold = CONFIG.THRESHOLDS.STRATEGY.runwayCoverageMinPct || 0;
            const guardrailActivationThreshold =
                CONFIG.THRESHOLDS.STRATEGY.runwayGuardrailActivationPct
                ?? runwayCoverageThreshold
                ?? 0;

            // Regime-Prüfung für konditionierte Guardrail-Aktivierung
            const marketRegime = CONFIG.TEXTS.REGIME_MAP[market.sKey] || market.sKey;
            const isPeakRegime = marketRegime === 'peak' || marketRegime === 'hot_neutral';

            // Design-Entscheidung: Guardrail greift nur bei echten Lücken (unter Aktivierungsschwelle oder Mindest-Runway),
            // damit moderate Unterdeckungen über die reguläre Rebalancing-Logik aufgefüllt werden können.
            // Prüfe BEIDE Runways: Floor-Runway UND Gesamt-Runway
            // Floor-Runway kann irreführend hoch sein wenn Pension den Großteil des Floors deckt
            const hasFloorRunwayGap = currentFloorRunwayMonths < runwayMinThresholdMonths;
            const hasTotalRunwayGap = currentRunwayMonths < runwayMinThresholdMonths;
            const hasRunwayGap = hasFloorRunwayGap || hasTotalRunwayGap;
            const hasCoverageGap = zielLiquiditaetsdeckung < guardrailActivationThreshold;
            const monthlyBaselineNeed = (gesamtjahresbedarf / 12);
            const guardrailTargetEuro = Math.max(
                runwayMinThresholdMonths * monthlyBaselineNeed,
                runwayCoverageThreshold * zielLiquiditaet
            );
            const guardrailTargetMonths = (monthlyBaselineNeed > 0)
                ? (guardrailTargetEuro / monthlyBaselineNeed)
                : 0;
            const guardrailGapEuro = Math.max(0, guardrailTargetEuro - aktuelleLiquiditaet);
            // Peak-Regimes: KEIN Guardrail - immer Opportunistisches Rebalancing verwenden.
            // Im Peak wollen wir die gute Marktlage nutzen, um BEIDES aufzufüllen (Liquidität + Gold).
            // Gold aufschieben ist riskant, da der nächste Bär jederzeit kommen kann.
            // Nicht-Peak: Guardrail bei Coverage-Lücke oder Runway-Lücke
            const hasGuardrailGap = isPeakRegime
                ? false
                : ((hasCoverageGap || hasRunwayGap) && guardrailGapEuro > 1);

            console.log('DEBUG determineAction:', {
                currentFloorRunwayMonths,
                runwayMinThresholdMonths,
                zielLiquiditaetsdeckung: (zielLiquiditaetsdeckung * 100).toFixed(1) + '%',
                guardrailActivationThreshold,
                hasCoverageGap,
                hasRunwayGap,
                hasGuardrailGap,
                isBearRegimeProxy
            });

            // Bärenmarkt: Runway auffüllen, sobald Guardrail unterschritten wird
            if (isBearRegimeProxy && hasGuardrailGap) {
                const isCriticalLiquidityBear = aktuelleLiquiditaet < (sicherheitsPuffer * 1.5);

                const bearRefill = this._computeCappedRefill({
                    isBearContext: true,
                    liquiditaetsbedarf: guardrailGapEuro,
                    aktienwert,
                    input,
                    isCriticalLiquidity: isCriticalLiquidityBear
                });

                if (bearRefill.bedarf > 0) {
                    actionDetails = bearRefill;
                    actionDetails.title = `Runway-Notfüllung (Bär)${bearRefill.isCapped ? ' (Cap aktiv)' : ''}`;
                    actionDetails.diagnosisEntries.unshift({
                        step: 'Runway-Notfüllung (Bär)',
                        impact: `Liquidität auf mindestens ${guardrailTargetMonths.toFixed(1)} Monate bzw. ${(runwayCoverageThreshold * 100).toFixed(0)}% des Ziels anheben (Ziel: ${guardrailTargetEuro.toFixed(0)}€).`,
                        status: 'active',
                        severity: 'warning'
                    });
                    verwendungen.liquiditaet = actionDetails.bedarf;

                    // Im Bärenmarkt: Gold-Floor auf 0 setzen, da Gold als Krisenreserve
                    // vollständig verfügbar sein soll (analog zur ATH-Logik bei -20% Abstand)
                    saleContext.minGold = 0;

                    // Sale-Budgets setzen um Aktien-Verkauf zu ermöglichen
                    const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
                    if (totalEquityValue > 0) {
                        const requiredEquitySale = Math.min(actionDetails.bedarf, totalEquityValue);
                        saleContext.saleBudgets.aktien_alt =
                            requiredEquitySale * (input.depotwertAlt / totalEquityValue);
                        saleContext.saleBudgets.aktien_neu =
                            requiredEquitySale * (input.depotwertNeu / totalEquityValue);
                    }
                    // Gold-Budget: Im Bärenmarkt alles verfügbar (minGold = 0)
                    if (input.goldAktiv && input.goldWert > 0) {
                        saleContext.saleBudgets.gold = input.goldWert;
                    }

                    // Bei Guardrail-Aktivierung: Mindestschwelle deaktivieren
                    minTradeResultOverride = 0;
                }

                // Universeller Runway-Failsafe: gilt in allen Nicht-Bären-Regimes
            } else if (hasGuardrailGap) {
                const isCriticalLiquidityFailsafe = zielLiquiditaetsdeckung < runwayCoverageThreshold || hasRunwayGap;

                const minTradeGateResult = this._computeAppliedMinTradeGate({
                    investiertesKapital,
                    liquiditaetsBedarf: guardrailGapEuro,
                    totalerBedarf: guardrailGapEuro
                });
                minTradeResultOverride = minTradeGateResult.minTradeResultOverride;
                if (minTradeGateResult.diagnosisEntry) {
                    actionDetails.diagnosisEntries.push(minTradeGateResult.diagnosisEntry);
                }

                // Bei kritischer Liquidität: Mindestschwelle deaktivieren, um RUIN durch
                // Liquiditätsmangel zu verhindern. Bei Guardrail-Aktivierung MUSS die
                // Auffüllung erfolgen, auch wenn der Betrag unter dem normalen Minimum liegt.
                if (isCriticalLiquidityFailsafe) {
                    minTradeResultOverride = 0;
                }

                const neutralRefill = this._computeCappedRefill({
                    isBearContext: false,
                    liquiditaetsbedarf: guardrailGapEuro,
                    aktienwert,
                    input,
                    isCriticalLiquidity: isCriticalLiquidityFailsafe
                });

                if (neutralRefill.bedarf > 0) {
                    actionDetails = neutralRefill;
                    actionDetails.title = `Runway-Notfüllung (neutral)${neutralRefill.isCapped ? ' (Cap aktiv)' : ''}`;
                    actionDetails.diagnosisEntries.unshift({
                        step: 'Runway-Notfüllung (neutral)',
                        impact: `Liquidität auf mindestens ${guardrailTargetMonths.toFixed(1)} Monate bzw. ${(runwayCoverageThreshold * 100).toFixed(0)}% des Ziels anheben (Ziel: ${guardrailTargetEuro.toFixed(0)}€).`,
                        status: 'active',
                        severity: 'warning'
                    });
                    verwendungen.liquiditaet = actionDetails.bedarf;

                    // Sale-Budgets setzen um Aktien-Verkauf zu ermöglichen
                    // Bei Guardrail-Aktivierung muss genug verkauft werden können
                    const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
                    if (totalEquityValue > 0) {
                        // Erlaube Verkauf bis zum Bedarf, verteilt auf beide Aktien-Tranchen
                        const requiredEquitySale = Math.min(actionDetails.bedarf, totalEquityValue);
                        saleContext.saleBudgets.aktien_alt =
                            requiredEquitySale * (input.depotwertAlt / totalEquityValue);
                        saleContext.saleBudgets.aktien_neu =
                            requiredEquitySale * (input.depotwertNeu / totalEquityValue);
                    }
                    // Gold-Budget auf verfügbaren Wert setzen (über dem Floor)
                    if (input.goldAktiv && input.goldWert > 0) {
                        const availableGold = Math.max(0, input.goldWert - (minGold || 0));
                        saleContext.saleBudgets.gold = availableGold;
                    }
                }

                // Nicht-Bärenmarkt: Opportunistisches Rebalancing
            } else if (!isBearRegimeProxy) {
                const liquiditaetsBedarf = Math.max(0, zielLiquiditaet - aktuelleLiquiditaet);

                // ATH-basierte Skalierung: Bei -20% ATH-Abstand kein Rebalancing mehr
                // seiATH = 1.0 (am ATH) → Faktor = 1.0, seiATH = 0.8 (-20%) → Faktor = 0.0
                const seiATH = market.seiATH || 1;
                const athRebalancingFaktor = Math.max(0, Math.min(1, (seiATH - 0.8) / 0.2));

                // Prüfe ob kritische Liquiditätssituation vorliegt
                const zielLiquiditaetsdeckungLocal = (zielLiquiditaet > 0)
                    ? (aktuelleLiquiditaet / zielLiquiditaet)
                    : 1;
                const runwayCoverageThresholdLocal = CONFIG.THRESHOLDS.STRATEGY.runwayCoverageMinPct || 0.75;
                const isCriticalLiquidity = zielLiquiditaetsdeckungLocal < runwayCoverageThresholdLocal;

                let goldKaufBedarf = 0;

                // Gold-Rebalancing prüfen
                if (input.goldAktiv && input.goldZielProzent > 0) {
                    const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
                    const bandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
                    const goldUntergrenze = goldZielwert * (1 - bandPct);

                    if (input.goldWert < goldUntergrenze) {
                        goldKaufBedarf = Math.max(0, goldZielwert - input.goldWert);
                    }
                }

                const totalerBedarf = liquiditaetsBedarf + goldKaufBedarf;

                console.log('DEBUG Rebalancing:', {
                    liquiditaetsBedarf,
                    goldKaufBedarf,
                    totalerBedarf,
                    isCriticalLiquidity,
                    zielLiquiditaet,
                    aktuelleLiquiditaet,
                    seiATH,
                    athRebalancingFaktor,
                    marketSKey: market.sKey
                });

                // Bei kritischer Liquidität: niedrigere Mindestschwelle verwenden
                // WICHTIG: minTradeResultOverride auf 0 setzen, um RUIN zu verhindern
                // Sonst würde der dynamische minTradeResult bei großen Portfolios die Transaktion blockieren
                let appliedMinTradeGate;
                if (isCriticalLiquidity) {
                    appliedMinTradeGate = Math.max(
                        CONFIG.THRESHOLDS.STRATEGY.minRefillAmount || 2500,
                        CONFIG.THRESHOLDS.STRATEGY.cashRebalanceThreshold || 2500
                    );
                    minTradeResultOverride = 0;
                } else {
                    const minTradeGateResult = this._computeAppliedMinTradeGate({
                        investiertesKapital,
                        liquiditaetsBedarf,
                        totalerBedarf
                    });
                    appliedMinTradeGate = minTradeGateResult.appliedMinTradeGate;
                    minTradeResultOverride = minTradeGateResult.minTradeResultOverride;
                    if (minTradeGateResult.diagnosisEntry) {
                        actionDetails.diagnosisEntries.push(minTradeGateResult.diagnosisEntry);
                    }
                }

                if (totalerBedarf >= appliedMinTradeGate) {
                    // Gold-Verkaufsbudget berechnen
                    let maxSellableFromGold = 0;
                    if (input.goldAktiv && input.goldZielProzent > 0) {
                        const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
                        const bandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
                        const goldObergrenze = goldZielwert * (1 + bandPct);

                        if (input.goldWert > goldObergrenze) {
                            maxSellableFromGold = input.goldWert - goldZielwert;
                        }
                    }
                    saleContext.saleBudgets.gold = maxSellableFromGold;
                    transactionDiagnostics.goldThresholds = {
                        ...transactionDiagnostics.goldThresholds,
                        saleBudgetGold: maxSellableFromGold,
                        rebalancingBandPct: input.rebalancingBand ?? input.rebalBand ?? 35
                    };

                    // Aktien-Verkaufsbudget berechnen
                    const aktienZielwert = investiertesKapital * (input.targetEq / 100);
                    const aktienObergrenze = aktienZielwert * (1 + (input.rebalBand / 100));
                    let aktienUeberschuss = (aktienwert > aktienObergrenze)
                        ? (aktienwert - aktienZielwert)
                        : 0;

                    // Bei kritischer Liquidität: Verkauf auch unter Obergrenze/Zielwert erlauben
                    // um RUIN durch Liquiditätsmangel zu verhindern
                    if (isCriticalLiquidity && aktienUeberschuss < liquiditaetsBedarf) {
                        // Erlaube Verkauf bis zum Liquiditätsbedarf, begrenzt durch verfügbare Aktien
                        aktienUeberschuss = Math.min(liquiditaetsBedarf, aktienwert);
                    }

                    // ATH-skaliertes Cap: Bei -20% ATH-Abstand kein Rebalancing mehr
                    const baseMaxSkimCapEuro = (input.maxSkimPctOfEq / 100) * aktienwert;
                    const athScaledSkimCap = baseMaxSkimCapEuro * athRebalancingFaktor;
                    // Bei kritischer Liquidität: Cap auf Liquiditätsbedarf + 20% Puffer begrenzen
                    // Das stellt sicher, dass die Liquidität aufgefüllt wird, aber nicht unbegrenzt für Gold
                    const effectiveSkimCap = isCriticalLiquidity
                        ? Math.max(athScaledSkimCap, liquiditaetsBedarf * 1.2)
                        : athScaledSkimCap;
                    const maxSellableFromEquity = Math.min(aktienUeberschuss, effectiveSkimCap);

                    const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
                    if (totalEquityValue > 0) {
                        saleContext.saleBudgets.aktien_alt =
                            maxSellableFromEquity * (input.depotwertAlt / totalEquityValue);
                        saleContext.saleBudgets.aktien_neu =
                            maxSellableFromEquity * (input.depotwertNeu / totalEquityValue);
                    }
                    transactionDiagnostics.equityThresholds = {
                        ...transactionDiagnostics.equityThresholds,
                        saleBudgetAktienAlt: saleContext.saleBudgets.aktien_alt || 0,
                        saleBudgetAktienNeu: saleContext.saleBudgets.aktien_neu || 0
                    };

                    actionDetails.bedarf = totalerBedarf;
                    actionDetails.title = "Opportunistisches Rebalancing & Liquidität auffüllen";
                    verwendungen.gold = Math.min(totalerBedarf, goldKaufBedarf);
                    verwendungen.liquiditaet = Math.min(totalerBedarf - verwendungen.gold, liquiditaetsBedarf);
                }
            }
        }

        // Verkauf berechnen
        const gesamterNettoBedarf = actionDetails.bedarf;
        if (gesamterNettoBedarf <= 0) {
            markAsBlocked('liquidity_sufficient', 0, {
                direction: 'Keine Aktion',
                title: actionDetails.title || 'Keine Aktion',
                netAmount: 0
            });
            return {
                type: 'NONE',
                anweisungKlasse: 'anweisung-gruen',
                title: `${market.szenarioText} (Kein Handlungsbedarf)`,
                diagnosisEntries: actionDetails.diagnosisEntries,
                transactionDiagnostics
            };
        }

        let saleResult = this.calculateSaleAndTax(
            gesamterNettoBedarf,
            input,
            saleContext,
            market,
            isPufferSchutzAktiv
        );

        // Bei Notfall-Verkäufen (Puffer-Schutz) keine minTrade-Schwelle anwenden
        const minTradeResult = isPufferSchutzAktiv
            ? 0
            : (minTradeResultOverride ?? Math.max(
                CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
                (depotwertGesamt + aktuelleLiquiditaet) * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
            ));

        if (!saleResult || (saleResult.achievedRefill < minTradeResult && !isPufferSchutzAktiv)) {
            const achieved = saleResult?.achievedRefill || 0;
            markAsBlocked('min_trade', Math.max(0, minTradeResult - achieved), {
                direction: actionDetails.title || 'Verkauf',
                title: actionDetails.title || 'Verkauf',
                netAmount: gesamterNettoBedarf
            });
            return {
                type: 'NONE',
                anweisungKlasse: 'anweisung-gruen',
                title: `${market.szenarioText} (Kein Handlungsbedarf)`,
                diagnosisEntries: actionDetails.diagnosisEntries,
                transactionDiagnostics
            };
        }

        const effektiverNettoerloes = saleResult.achievedRefill;

        if (gesamterNettoBedarf > effektiverNettoerloes + 1 && !actionDetails.isCapped) {
            actionDetails.title += ' (Cap aktiv)';
            actionDetails.isCapped = true;
        }

        // Erlös verteilen: Priorität 1: Liquidität, 2: Gold, 3: Aktien
        let erloesUebrig = effektiverNettoerloes;

        const finalLiq = Math.min(erloesUebrig, verwendungen.liquiditaet);
        erloesUebrig -= finalLiq;

        const finalGold = Math.min(erloesUebrig, verwendungen.gold);
        erloesUebrig -= finalGold;

        const finalAktien = Math.min(erloesUebrig, verwendungen.aktien);

        transactionDiagnostics.wasTriggered = true;
        transactionDiagnostics.blockReason = 'none';
        transactionDiagnostics.blockedAmount = 0;
        transactionDiagnostics.potentialTrade = {
            direction: 'Verkauf',
            title: actionDetails.title,
            netAmount: effektiverNettoerloes,
            liquidityUse: finalLiq,
            goldUse: finalGold,
            equityUse: finalAktien
        };

        return {
            type: 'TRANSACTION',
            anweisungKlasse: 'anweisung-gelb',
            title: actionDetails.title,
            isPufferSchutzAktiv,
            nettoErlös: effektiverNettoerloes,
            quellen: saleResult.breakdown,
            steuer: saleResult.steuerGesamt,
            verwendungen: { liquiditaet: finalLiq, gold: finalGold, aktien: finalAktien },
            diagnosisEntries: actionDetails.diagnosisEntries,
            transactionDiagnostics
        };
    },

    /**
     * Berechnet Verkauf und Steuer
     */
    calculateSaleAndTax(requestedRefill, input, context, market, isEmergencySale) {
        const keSt = 0.25 * (1 + 0.055 + input.kirchensteuerSatz);

        const _calculateSingleSale = (nettoBedarf, pauschbetrag, tranchesToUse) => {
            let finalBreakdown = [];
            let totalBrutto = 0;
            let totalSteuer = 0;
            let pauschbetragVerbraucht = 0;
            let nochZuDeckenderNettoBetrag = nettoBedarf;
            let pauschbetragRest = pauschbetrag;

            for (const tranche of tranchesToUse) {
                if (nochZuDeckenderNettoBetrag <= 0.01) break;

                let maxBruttoVerkaufbar = tranche.marketValue;

                // Gold-Floor berücksichtigen
                if (tranche.kind === 'gold' && context.minGold !== undefined) {
                    maxBruttoVerkaufbar = Math.max(0, input.goldWert - context.minGold);
                }

                // Sale-Budget berücksichtigen
                if (context.saleBudgets && context.saleBudgets[tranche.kind] !== undefined) {
                    maxBruttoVerkaufbar = Math.min(maxBruttoVerkaufbar, context.saleBudgets[tranche.kind]);
                }

                if (maxBruttoVerkaufbar <= 0) continue;

                // Gewinnquote berechnen
                const gewinnQuote = tranche.marketValue > 0
                    ? Math.max(0, (tranche.marketValue - tranche.costBasis) / tranche.marketValue)
                    : 0;

                // Maximal möglichen Netto-Erlös berechnen
                const gewinnBruttoMax = maxBruttoVerkaufbar * gewinnQuote;
                const steuerpflichtigerAnteilMax = gewinnBruttoMax * (1 - tranche.tqf);
                const anrechenbarerPauschbetragMax = Math.min(pauschbetragRest, steuerpflichtigerAnteilMax);
                const finaleSteuerbasisMax = steuerpflichtigerAnteilMax - anrechenbarerPauschbetragMax;
                const steuerMax = Math.max(0, finaleSteuerbasisMax) * keSt;
                const maxNettoAusTranche = maxBruttoVerkaufbar - steuerMax;

                if (maxNettoAusTranche <= 0) continue;

                const nettoAusDieserTranche = Math.min(nochZuDeckenderNettoBetrag, maxNettoAusTranche);

                // Zu verkaufenden Bruttobetrag berechnen
                let zuVerkaufenBrutto;
                if (nettoAusDieserTranche < maxNettoAusTranche) {
                    zuVerkaufenBrutto = (nettoAusDieserTranche / maxNettoAusTranche) * maxBruttoVerkaufbar;
                } else {
                    zuVerkaufenBrutto = maxBruttoVerkaufbar;
                }

                if (zuVerkaufenBrutto < 1) continue;

                // Tatsächliche Steuer berechnen
                const bruttogewinn = zuVerkaufenBrutto * gewinnQuote;
                const gewinnNachTFS = bruttogewinn * (1 - tranche.tqf);
                const anrechenbarerPauschbetrag = Math.min(pauschbetragRest, gewinnNachTFS);
                const finaleSteuerbasis = gewinnNachTFS - anrechenbarerPauschbetrag;
                const steuer = Math.max(0, finaleSteuerbasis) * keSt;
                const nettoErlös = zuVerkaufenBrutto - steuer;

                totalBrutto += zuVerkaufenBrutto;
                totalSteuer += steuer;
                pauschbetragRest -= anrechenbarerPauschbetrag;
                pauschbetragVerbraucht += anrechenbarerPauschbetrag;
                nochZuDeckenderNettoBetrag -= nettoErlös;

                finalBreakdown.push({
                    kind: tranche.kind,
                    brutto: zuVerkaufenBrutto,
                    steuer,
                    tqf: tranche.tqf,
                    spbUsed: anrechenbarerPauschbetrag,
                    netto: nettoErlös
                });
            }

            return {
                steuerGesamt: totalSteuer,
                bruttoVerkaufGesamt: totalBrutto,
                achievedRefill: Math.max(0, nettoBedarf - nochZuDeckenderNettoBetrag),
                breakdown: finalBreakdown,
                pauschbetragVerbraucht: pauschbetragVerbraucht,
            };
        };

        // Tranchen zusammenstellen
        let tranches = {
            aktien_alt: {
                marketValue: input.depotwertAlt,
                costBasis: input.costBasisAlt,
                tqf: input.tqfAlt,
                kind: 'aktien_alt'
            },
            aktien_neu: {
                marketValue: input.depotwertNeu,
                costBasis: input.costBasisNeu,
                tqf: input.tqfNeu,
                kind: 'aktien_neu'
            },
            gold: (input.goldAktiv && input.goldWert > 0)
                ? {
                    marketValue: input.goldWert,
                    costBasis: input.goldCost,
                    tqf: input.goldSteuerfrei ? 1.0 : 0.0,
                    kind: 'gold'
                }
                : null
        };

        // Leere Tranchen entfernen
        Object.keys(tranches).forEach(key => {
            if (!tranches[key] || !tranches[key].marketValue) {
                delete tranches[key];
            }
        });

        const sellOrder = this._getSellOrder(tranches, market, input, context, isEmergencySale);
        const orderedTranches = sellOrder.map(k => tranches[k]);

        return _calculateSingleSale(requestedRefill, input.sparerPauschbetrag, orderedTranches);
    },

    /**
     * Bestimmt Verkaufsreihenfolge
     * @private
     */
    _getSellOrder(tranches, market, input, context, isEmergencySale) {
        // Aktien nach steuerlicher Effizienz sortieren
        const equityKeys = Object.keys(tranches)
            .filter(k => k.startsWith('aktien'))
            .sort((a, b) => {
                const tA = tranches[a];
                const tB = tranches[b];
                const gqA = tA.marketValue > 0
                    ? Math.max(0, (tA.marketValue - tA.costBasis) / tA.marketValue)
                    : 0;
                const gqB = tB.marketValue > 0
                    ? Math.max(0, (tB.marketValue - tB.costBasis) / tB.marketValue)
                    : 0;
                return (gqA * (1 - tA.tqf)) - (gqB * (1 - tB.tqf));
            });

        const isDefensiveContext = isEmergencySale ||
            market.sKey === 'bear_deep' ||
            market.sKey === 'recovery_in_bear';

        // Im defensiven Kontext: Gold zuerst
        if (isDefensiveContext) {
            const order = ['gold', ...equityKeys];
            return order.filter(k => tranches[k]);
        }

        // Gold über Obergrenze? Gold zuerst verkaufen
        if (input.goldAktiv && tranches.gold) {
            const depotwertGesamt = (input.depotwertAlt || 0) +
                (input.depotwertNeu || 0) +
                (input.goldWert || 0);
            const investiertesKapital = depotwertGesamt + input.tagesgeld + input.geldmarktEtf;
            const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
            const bandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
            const goldObergrenze = goldZielwert * (1 + bandPct);

            if (tranches.gold.marketValue > goldObergrenze) {
                return ['gold', ...equityKeys].filter(k => tranches[k]);
            }
        }

        // Standard: Aktien zuerst, dann Gold
        return [...equityKeys, 'gold'].filter(k => tranches[k]);
    },

    /**
     * Merge zwei Verkaufsergebnisse
     */
    mergeSaleResults(res1, res2) {
        if (!res1) return res2;
        if (!res2) return res1;

        const merged = {
            steuerGesamt: (res1.steuerGesamt || 0) + (res2.steuerGesamt || 0),
            bruttoVerkaufGesamt: (res1.bruttoVerkaufGesamt || 0) + (res2.bruttoVerkaufGesamt || 0),
            achievedRefill: (res1.achievedRefill || 0) + (res2.achievedRefill || 0),
            pauschbetragVerbraucht: (res1.pauschbetragVerbraucht || 0) + (res2.pauschbetragVerbraucht || 0),
            breakdown: [...(res1.breakdown || []), ...(res2.breakdown || [])]
        };

        return merged;
    }
};



    // Export für engine/transactions/TransactionEngine.js
    moduleCache['engine/transactions/TransactionEngine.js'] = TransactionEngine;

    // ========================================
    // engine/core.js
    // ========================================
/**
 * ===================================================================
 * ENGINE CORE MODULE
 * ===================================================================
 * Orchestriert alle Module und stellt die EngineAPI bereit
 * ===================================================================
 */

// Imported from ./config.js: ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG
// Imported from ./errors.js: AppError, ValidationError
// Imported from ./validators/InputValidator.js: InputValidator
// Imported from ./analyzers/MarketAnalyzer.js: MarketAnalyzer
// Imported from ./planners/SpendingPlanner.js: SpendingPlanner
// Imported from ./transactions/TransactionEngine.js: TransactionEngine

/**
 * Interne Orchestrierungsfunktion - Berechnet ein komplettes Jahresergebnis
 *
 * Diese Funktion orchestriert alle Engine-Module und führt die Jahresberechnung durch:
 * 1. Validiert Eingaben
 * 2. Berechnet Grundwerte (Portfolio, Liquidität, Bedarf)
 * 3. Analysiert Marktbedingungen
 * 4. Bestimmt Ausgabenstrategie (mit Guardrails)
 * 5. Berechnet notwendige Transaktionen
 * 6. Erstellt umfassende Diagnose
 *
 * @private
 * @param {Object} input - Benutzereingaben mit allen Parametern (Vermögen, Bedarf, Alter, etc.)
 * @param {Object} lastState - Vorheriger Zustand mit Guardrail-History (flexRate, peakRealVermoegen, etc.)
 * @returns {Object} Ergebnis mit {input, newState, diagnosis, ui} oder {error} bei Fehler
 */
function _internal_calculateModel(input, lastState) {
    // 1. Validierung der Eingabedaten
    // Prüft alle Eingaben auf Plausibilität und Vollständigkeit
    const validationResult = InputValidator.validate(input);
    if (!validationResult.valid) {
        return { error: new ValidationError(validationResult.errors) };
    }

    // 2. Grundwerte berechnen
    // Profil-Konfiguration laden (Runway-Ziele, Allokationsstrategie)
    const profil = CONFIG.PROFIL_MAP[input.risikoprofil];

    // Aktuelle Liquidität = Tagesgeld + Geldmarkt-ETF
    const aktuelleLiquiditaet = input.tagesgeld + input.geldmarktEtf;

    // Gesamtes Depotvermögen (Aktien alt + neu + optional Gold)
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu +
        (input.goldAktiv ? input.goldWert : 0);

    // Gesamtvermögen = Depot + Liquidität
    const gesamtwert = depotwertGesamt + aktuelleLiquiditaet;

    // 3. Marktanalyse durchführen
    // Bestimmt Marktszenario (Bär, Bulle, Seitwärts, etc.) basierend auf historischen Daten
    const market = MarketAnalyzer.analyzeMarket(input);

    // 4. Gold-Floor berechnen (Mindestbestand)
    // Definiert minimalen Gold-Bestand als Prozentsatz des Gesamtvermögens
    const goldFloorAbs = (input.goldFloorProzent / 100) * gesamtwert;
    const minGold = input.goldAktiv ? goldFloorAbs : 0;

    // 5. Inflationsangepassten Bedarf berechnen
    // Bedarf wird um Renteneinkünfte reduziert (netto)
    const renteJahr = input.renteAktiv ? (input.renteMonatlich * 12) : 0;
    const inflatedBedarf = {
        floor: Math.max(0, input.floorBedarf - renteJahr),  // Grundbedarf (essentiell)
        flex: input.flexBedarf                              // Flexibler Bedarf (optional)
    };
    const neuerBedarf = inflatedBedarf.floor + inflatedBedarf.flex;

    // 6. Runway berechnen (Liquiditäts-Reichweite in Monaten)
    // Wie lange reicht die aktuelle Liquidität bei aktuellem Bedarf?
    const reichweiteMonate = (inflatedBedarf.floor + inflatedBedarf.flex) > 0
        ? (aktuelleLiquiditaet / ((inflatedBedarf.floor + inflatedBedarf.flex) / 12))
        : Infinity;

    // 7. Ausgabenplanung mit Guardrails
    // SpendingPlanner bestimmt die optimale Entnahmestrategie basierend auf:
    // - Marktsituation (Bär vs. Bulle)
    // - Runway-Status (kritisch, ok, gut)
    // - Historischem Peak (Drawdown-Berechnung)
    // - Entnahmequote und Alarmbedingungen
    const { spendingResult, newState, diagnosis } = SpendingPlanner.determineSpending({
        market,
        lastState,
        inflatedBedarf,
        runwayMonate: reichweiteMonate,
        profil,
        depotwertGesamt,
        gesamtwert,
        renteJahr,
        input
    });

    // 8. Ziel-Liquidität berechnen
    // Bestimmt die optimale Liquiditätshöhe basierend auf Profil und Marktsituation
    // Im Bärenmarkt: höhere Liquidität (z.B. 60 Monate)
    // Im Bullenmarkt: niedrigere Liquidität (z.B. 36 Monate)
    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(
        profil,
        market,
        inflatedBedarf,
        input
    );

    // 9. Transaktionsaktion bestimmen
    // Entscheidet, ob und welche Transaktionen notwendig sind:
    // - Depot-Verkauf zur Liquiditäts-Auffüllung
    // - Rebalancing (Aktien/Gold)
    // - Notfall-Verkäufe bei kritischem Runway
    const action = TransactionEngine.determineAction({
        aktuelleLiquiditaet,
        depotwertGesamt,
        zielLiquiditaet,
        market,
        spending: spendingResult,
        minGold,
        profil,
        input
    });

    // Diagnose-Einträge von Transaktion hinzufügen
    // Transaktionen können eigene Diagnose-Einträge erzeugen (z.B. Caps, Guardrails)
    if (Array.isArray(action.diagnosisEntries) && action.diagnosisEntries.length) {
        diagnosis.decisionTree.push(...action.diagnosisEntries);
    }

    // 10. Liquidität nach Transaktion berechnen
    // Berücksichtigt Depot-Verkäufe zur Liquiditäts-Auffüllung
    const liqNachTransaktion = aktuelleLiquiditaet + (action.verwendungen?.liquiditaet || 0);
    const jahresGesamtbedarf = inflatedBedarf.floor + inflatedBedarf.flex;

    // KPI: Liquiditätsdeckung relativ zum Zielwert vor/nach Transaktion
    // Wird als Diagnose-KPI und für die UI wiederverwendet, deshalb einmalig berechnet
    const computeCoverage = (liquiditaetWert) => (zielLiquiditaet > 0)
        ? (liquiditaetWert / zielLiquiditaet) * 100
        : 100;
    const deckungVorher = computeCoverage(aktuelleLiquiditaet);
    const deckungNachher = computeCoverage(liqNachTransaktion);

    // Neue Runway nach Transaktion berechnen
    const runwayMonths = (jahresGesamtbedarf > 0)
        ? (liqNachTransaktion / (jahresGesamtbedarf / 12))
        : Infinity;

    // 11. Runway-Status bestimmen
    // - 'ok': Runway >= Ziel (z.B. 36+ Monate)
    // - 'warn': Runway >= Minimum aber < Ziel (z.B. 24-36 Monate)
    // - 'bad': Runway < Minimum (< 24 Monate) - kritisch!
    let runwayStatus = 'bad';
    if (runwayMonths >= input.runwayTargetMonths) {
        runwayStatus = 'ok';
    } else if (runwayMonths >= input.runwayMinMonths) {
        runwayStatus = 'warn';
    }

    // Diagnose-Objekt mit finalem Runway-Status und Zielwert anreichern
    diagnosis.general = diagnosis.general || {};
    diagnosis.general.runwayStatus = runwayStatus;
    diagnosis.general.runwayMonate = runwayMonths;
    diagnosis.general.deckungVorher = deckungVorher;
    diagnosis.general.deckungNachher = deckungNachher;
    const validInputRunwayTarget = (typeof input.runwayTargetMonths === 'number' && isFinite(input.runwayTargetMonths) && input.runwayTargetMonths > 0)
        ? input.runwayTargetMonths
        : null;
    const hasValidTarget = (typeof diagnosis.general.runwayTargetMonate === 'number' && isFinite(diagnosis.general.runwayTargetMonate));
    if (!hasValidTarget && validInputRunwayTarget) {
        diagnosis.general.runwayTargetMonate = validInputRunwayTarget;
    }
    if (typeof diagnosis.general.runwayTargetQuelle !== 'string' || !diagnosis.general.runwayTargetQuelle.trim()) {
        diagnosis.general.runwayTargetQuelle = validInputRunwayTarget ? 'input' : 'legacy';
    }

    if (Array.isArray(diagnosis.guardrails)) {
        diagnosis.guardrails = diagnosis.guardrails.map(guardrail => {
            if (guardrail && guardrail.type === 'months' && guardrail.rule === 'min' && guardrail.name.startsWith('Runway')) {
                return { ...guardrail, value: runwayMonths };
            }
            return guardrail;
        });
    }

    // 12. Ergebnis zusammenstellen
    // Struktur: {input, newState, diagnosis, ui}
    return {
        input,
        newState,
        diagnosis,
        ui: {
            depotwertGesamt,
            neuerBedarf,
            minGold,
            zielLiquiditaet,
            market,
            spending: spendingResult,
            action,
            liquiditaet: {
                deckungVorher,
                deckungNachher
            },
            runway: { months: runwayMonths, status: runwayStatus }
        }
    };
}

/**
 * ===================================================================
 * ENGINE API (v31)
 * ===================================================================
 * Moderne, zustandslose API für Balance App v38+
 * ===================================================================
 */
const EngineAPI = {
    /**
     * Gibt Versionsinformationen zurück
     */
    getVersion: function () {
        return { api: ENGINE_API_VERSION, build: ENGINE_BUILD_ID };
    },

    /**
     * Gibt Konfiguration zurück
     */
    getConfig: function () {
        return CONFIG;
    },

    /**
     * Analysiert Marktbedingungen
     */
    analyzeMarket: function (input) {
        try {
            return MarketAnalyzer.analyzeMarket(input);
        } catch (e) {
            return { error: e.message };
        }
    },

    /**
     * Berechnet Ziel-Liquidität
     */
    calculateTargetLiquidity: function (profil, market, inflatedBedarf, input = null) {
        return TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf, input);
    },

    /**
     * Simuliert ein einzelnes Jahr
     */
    simulateSingleYear: function (input, lastState) {
        try {
            return _internal_calculateModel(input, lastState);
        } catch (e) {
            if (e instanceof AppError) {
                return { error: e };
            }
            return {
                error: new AppError(
                    "Ein unerwarteter Engine-Fehler ist aufgetreten.",
                    { originalError: e }
                )
            };
        }
    },

    /**
     * @deprecated Veraltete Methode
     */
    addDecision: function (step, impact, status, severity) {
        console.warn("EngineAPI.addDecision ist veraltet.");
    },

    /**
     * @deprecated Veraltete Methode
     */
    updateDecision: function () { },

    /**
     * @deprecated Veraltete Methode
     */
    removeDecision: function () { }
};



    // Export für engine/core.js
    moduleCache['engine/core.js'] = { EngineAPI, _internal_calculateModel };

    // ========================================
    // engine/adapter.js
    // ========================================
/**
 * ===================================================================
 * ENGINE ADAPTER MODULE
 * ===================================================================
 * Adapter-Schicht für Simulator V5 (Ruhestandsmodell_v30)
 * Stellt Abwärtskompatibilität mit älteren Anwendungen sicher
 * ===================================================================
 */

// Imported from ./config.js: ENGINE_API_VERSION, CONFIG
// Imported from ./core.js: EngineAPI, _internal_calculateModel
// Imported from ./transactions/TransactionEngine.js: TransactionEngine

/**
 * Adapter für Simulator V5
 * Bildet alte Funktionssignaturen auf neue Engine-Logik ab
 */
const Ruhestandsmodell_v30_Adapter = {
    VERSION: ENGINE_API_VERSION,

    CONFIG: {
        ...CONFIG,
        SCENARIO_TEXT: CONFIG.TEXTS?.SCENARIO || {}
    },

    analyzeMarket: EngineAPI.analyzeMarket,

    /**
     * Berechnet Ziel-Liquidität (alte Signatur)
     */
    calculateTargetLiquidity: function(profil, market, annualNeedOrInflated, inflatedFloor, inflatedFlex, input = null) {
        const inflated = (annualNeedOrInflated && typeof annualNeedOrInflated === 'object')
            ? annualNeedOrInflated
            : { floor: Number(inflatedFloor) || 0, flex: Number(inflatedFlex) || 0 };

        return EngineAPI.calculateTargetLiquidity(profil, market, inflated, input);
    },

    mergeSaleResults: TransactionEngine.mergeSaleResults,

    _lastSimulationResult: null,

    /**
     * Führt vollständige Simulation aus und cached das Ergebnis
     * @private
     */
    _runFullSimulationAndCache(v30_inputsCtx, lastState) {
        const v38_input = {
            ...v30_inputsCtx,
            renteAktiv: (v30_inputsCtx.pensionAnnual ?? 0) > 0,
            renteMonatlich: (v30_inputsCtx.pensionAnnual ?? 0) / 12,
            endeVJ: v30_inputsCtx.marketData?.endeVJ ?? v30_inputsCtx.endeVJ ?? 0,
            endeVJ_1: v30_inputsCtx.marketData?.endeVJ_1 ?? v30_inputsCtx.endeVJ_1 ?? 0,
            endeVJ_2: v30_inputsCtx.marketData?.endeVJ_2 ?? v30_inputsCtx.endeVJ_2 ?? 0,
            endeVJ_3: v30_inputsCtx.marketData?.endeVJ_3 ?? v30_inputsCtx.endeVJ_3 ?? 0,
            ath: v30_inputsCtx.marketData?.ath ?? v30_inputsCtx.ath ?? 0,
            jahreSeitAth: v30_inputsCtx.marketData?.jahreSeitAth ?? v30_inputsCtx.jahreSeitAth ?? 0
        };

        const fullResult = EngineAPI.simulateSingleYear(v38_input, lastState);
        this._lastSimulationResult = fullResult;
        return fullResult;
    },

    /**
     * Bestimmt Ausgabenstrategie (alte Signatur)
     */
    determineSpending: function({
        market, lastState, inflatedFloor, inflatedFlex,
        runwayMonths, liquidNow, profile,
        depotValue, inputsCtx, totalWealth
    }) {
        const fullResult = this._runFullSimulationAndCache(inputsCtx, lastState);

        if (fullResult.error) {
            return {
                error: fullResult.error,
                spendingResult: null,
                newState: lastState
            };
        }

        return {
            spendingResult: fullResult.ui.spending,
            newState: fullResult.newState,
            diagnosis: fullResult.diagnosis,
            _fullEngineResponse: fullResult
        };
    },

    /**
     * Bestimmt Transaktionsaktion (alte Signatur)
     */
    determineAction: function(v30_results, v30_inputsCtx) {
        let fullResult;

        if (this._lastSimulationResult) {
            fullResult = this._lastSimulationResult;
            this._lastSimulationResult = null;
        } else {
            fullResult = this._runFullSimulationAndCache(
                v30_inputsCtx,
                v30_results.spending?.details
            );
        }

        if (fullResult.error) {
            return {
                error: fullResult.error,
                title: "Fehler in der Engine"
            };
        }

        const v38_actionResult = fullResult.ui.action;
        const saleBreakdown = v38_actionResult.quellen || [];
        const aktuelleLiquiditaet = fullResult.input.tagesgeld + fullResult.input.geldmarktEtf;
        const depotwertGesamt = fullResult.input.depotwertAlt +
            fullResult.input.depotwertNeu +
            (fullResult.input.goldAktiv ? fullResult.input.goldWert : 0);

        return {
            ...v38_actionResult,
            saleResult: v38_actionResult.type === 'TRANSACTION' ? {
                steuerGesamt: v38_actionResult.steuer,
                bruttoVerkaufGesamt: saleBreakdown.reduce((sum, q) => sum + q.brutto, 0),
                achievedRefill: v38_actionResult.nettoErlös,
                breakdown: saleBreakdown
            } : null,
            liqNachTransaktion: {
                total: aktuelleLiquiditaet + (v38_actionResult.verwendungen?.liquiditaet || 0)
            },
            kaufGold: v38_actionResult.verwendungen?.gold || 0,
            kaufAktien: v38_actionResult.verwendungen?.aktien || 0,
            reason: v38_actionResult.transactionDiagnostics?.blockReason || 'none',
            rebalFlag: !!(v38_actionResult.title?.toLowerCase().includes('rebal')),
            netSaleEquity: saleBreakdown
                .filter(q => q.kind.startsWith('aktien'))
                .reduce((sum, q) => sum + q.brutto, 0),
            netSaleGold: saleBreakdown.find(q => q.kind === 'gold')?.brutto || 0,
            diagnostics: v38_actionResult.transactionDiagnostics,
            goldWeightBeforePct: depotwertGesamt > 0
                ? (fullResult.input.goldWert / depotwertGesamt) * 100
                : 0,
            taxRateSalesPct: (v38_actionResult.nettoErlös > 0)
                ? (v38_actionResult.steuer / v38_actionResult.nettoErlös) * 100
                : 0,
            liquidityGapEUR: fullResult.ui.zielLiquiditaet - aktuelleLiquiditaet,
            _fullEngineResponse: fullResult
        };
    },

    /**
     * Berechnet Verkauf und Steuer (alte Signatur)
     */
    calculateSaleAndTax: function(requestedRefill, v30_inputsCtx, caps = {}, market) {
        const v38_input = {
            ...v30_inputsCtx,
            tagesgeld: v30_inputsCtx.tagesgeld,
            geldmarktEtf: v30_inputsCtx.geldmarktEtf,
            depotwertAlt: v30_inputsCtx.depotwertAlt,
            depotwertNeu: v30_inputsCtx.depotwertNeu,
            goldWert: v30_inputsCtx.goldWert,
            costBasisAlt: v30_inputsCtx.costBasisAlt,
            costBasisNeu: v30_inputsCtx.costBasisNeu,
            goldCost: v30_inputsCtx.goldCost
        };

        const v38_saleResult = TransactionEngine.calculateSaleAndTax(
            requestedRefill,
            v38_input,
            { minGold: caps?.minGold ?? 0 },
            market,
            true
        );

        return { saleResult: v38_saleResult };
    }
};



    // Export für engine/adapter.js
    moduleCache['engine/adapter.js'] = Ruhestandsmodell_v30_Adapter;


    // Globale Exporte
    global.EngineAPI = moduleCache['engine/core.js'].EngineAPI;
    global.Ruhestandsmodell_v30 = moduleCache['engine/adapter.js'];

})(typeof window !== 'undefined' ? window : this);
