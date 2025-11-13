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
    validate(input) {
        const errors = [];
        const check = (condition, fieldId, message) => {
            if (condition) {
                errors.push({ fieldId, message });
            }
        };

        // Altersvalidierung
        check(
            input.aktuellesAlter < 18 || input.aktuellesAlter > 120,
            'aktuellesAlter',
            'Alter muss zwischen 18 und 120 liegen.'
        );

        // Inflationsvalidierung
        check(
            input.inflation < -10 || input.inflation > 50,
            'inflation',
            'Inflation außerhalb plausibler Grenzen (-10% bis 50%).'
        );

        // Vermögenswerte dürfen nicht negativ sein
        ['tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu', 'goldWert',
         'floorBedarf', 'flexBedarf', 'costBasisAlt', 'costBasisNeu', 'goldCost',
         'sparerPauschbetrag'].forEach(field => {
            check(input[field] < 0, field, 'Wert darf nicht negativ sein.');
        });

        // Marktdaten dürfen nicht negativ sein
        ['endeVJ', 'endeVJ_1', 'endeVJ_2', 'endeVJ_3', 'ath'].forEach(field => {
            check(input[field] < 0, field, 'Marktdaten dürfen nicht negativ sein.');
        });

        // Gold-spezifische Validierung
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

        // Runway-Validierung
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

const MarketAnalyzer = {
    /**
     * Analysiert den Markt basierend auf historischen Daten
     * @param {Object} input - Eingabedaten mit Marktinformationen
     * @returns {Object} Marktanalyseergebnis mit Szenario und Metriken
     */
    analyzeMarket(input) {
        const { endeVJ, endeVJ_1, endeVJ_2, endeVJ_3, ath, jahreSeitAth, inflation } = input;

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

        // Szenariotext erstellen
        const szenarioText = (CONFIG.TEXTS.SCENARIO[sKey] || "Unbekannt") +
            (isStagflation ? " (Stagflation)" : "");

        return {
            perf1Y,
            abstandVomAthProzent,
            sKey,
            isStagflation,
            szenarioText,
            reasons
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
     * Bestimmt die Ausgabenstrategie für ein Jahr
     * @param {Object} p - Parameter-Objekt mit allen notwendigen Daten
     * @returns {Object} Ergebnis mit Ausgabenplan, neuem State und Diagnose
     */
    determineSpending(p) {
        const {
            lastState, market, inflatedBedarf, runwayMonate,
            profil, depotwertGesamt, gesamtwert, renteJahr, input
        } = p;

        const diagnosis = {
            decisionTree: [],
            guardrails: [],
            keyParams: {},
            general: {}
        };

        const addDecision = (step, impact, status, severity = 'info') => {
            diagnosis.decisionTree.push({ step, impact, status, severity });
        };

        // 1. State initialisieren oder laden
        const state = this._initializeOrLoadState(lastState, p, addDecision);

        // 2. Alarm-Bedingungen evaluieren
        const alarmStatus = this._evaluateAlarmConditions(state, p, addDecision);

        // 3. Flex-Rate berechnen
        let { geglätteteFlexRate, kuerzungQuelle } = this._calculateFlexRate(
            state, alarmStatus, p, addDecision
        );

        // 4. Guardrails anwenden (wenn nicht im Alarm-Modus)
        let guardrailDiagnostics = {};
        if (!alarmStatus.active) {
            const guardrailResult = this._applyGuardrails(
                geglätteteFlexRate, state, { ...p, kuerzungQuelle }, addDecision
            );
            geglätteteFlexRate = guardrailResult.rate;
            kuerzungQuelle = guardrailResult.source;
            guardrailDiagnostics = guardrailResult.diagnostics || {};
        }

        // 5. Endgültige Entnahme berechnen
        let endgueltigeEntnahme = inflatedBedarf.floor +
            (inflatedBedarf.flex * (Math.max(0, Math.min(100, geglätteteFlexRate)) / 100));

        // 6. Finale Werte berechnen
        let flexRate;
        if (inflatedBedarf.flex > 0) {
            const flexErfuellt = Math.max(0, endgueltigeEntnahme - inflatedBedarf.floor);
            flexRate = (flexErfuellt / inflatedBedarf.flex) * 100;
        } else {
            // Wenn es keinen Flex-Bedarf gibt, ist die Flex-Rate 0%
            flexRate = 0;
        }
        const finaleKuerzung = 100 - flexRate;

        // 7. Ergebnisse zusammenstellen
        const { newState, spendingResult } = this._buildResults(
            state, endgueltigeEntnahme, alarmStatus, flexRate, kuerzungQuelle, p
        );

        // 8. Diagnose vervollständigen
        diagnosis.general = {
            marketSKey: market.sKey,
            marketSzenario: market.szenarioText,
            alarmActive: alarmStatus.active,
            runwayMonate: p.runwayMonate
        };
        diagnosis.keyParams = state.keyParams;
        diagnosis.guardrails.push(
            {
                name: "Entnahmequote",
                value: state.keyParams.entnahmequoteDepot,
                threshold: CONFIG.THRESHOLDS.ALARM.withdrawalRate,
                type: 'percent',
                rule: 'max'
            },
            {
                name: "Realer Drawdown (Gesamt)",
                value: state.keyParams.realerDepotDrawdown,
                threshold: CONFIG.THRESHOLDS.ALARM.realDrawdown,
                type: 'percent',
                rule: 'max'
            },
            {
                name: "Runway (vs. Min)",
                value: runwayMonate,
                threshold: profil.minRunwayMonths,
                type: 'months',
                rule: 'min'
            }
        );

        if (guardrailDiagnostics.inflationCap) {
            diagnosis.guardrails.push({
                name: "Inflations-Cap",
                ...guardrailDiagnostics.inflationCap
            });
        }

        if (guardrailDiagnostics.budgetFloor) {
            diagnosis.guardrails.push({
                name: "Budget-Floor Deckung",
                ...guardrailDiagnostics.budgetFloor
            });
        }

        return { spendingResult, newState, diagnosis };
    },

    /**
     * Initialisiert einen neuen State oder lädt den bestehenden
     * @private
     */
    _initializeOrLoadState(lastState, p, addDecision) {
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
            "System-Initialisierung",
            "Starte mit 100% Flex-Rate und setze initialen Vermögens-Peak.",
            "active"
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
     * Prüft, ob Alarm in Peak-Phase deeskaliert werden kann
     * @private
     */
    _shouldDeescalateInPeak(alarmWarAktiv, state, p) {
        if (!alarmWarAktiv || !['peak_hot', 'peak_stable', 'side_long'].includes(p.market.sKey)) {
            return false;
        }
        const { entnahmequoteDepot, realerDepotDrawdown } = state.keyParams;
        return entnahmequoteDepot <= CONFIG.THRESHOLDS.ALARM.withdrawalRate ||
               realerDepotDrawdown <= 0.15;
    },

    /**
     * Prüft, ob Alarm in Recovery-Phase deeskaliert werden kann
     * @private
     */
    _shouldDeescalateInRecovery(alarmWarAktiv, state, p) {
        if (!alarmWarAktiv || p.market.sKey !== 'recovery_in_bear') {
            return false;
        }
        const { runwayMonate, profil, input } = p;
        const { entnahmequoteDepot, realerDepotDrawdown } = state.keyParams;
        const okRunway = runwayMonate >= (profil.minRunwayMonths + 6);
        const okDrawdnRecovery = realerDepotDrawdown <= (CONFIG.THRESHOLDS.ALARM.realDrawdown - 0.05);
        const noNewLowerYearlyCloses = input.endeVJ > Math.min(input.endeVJ_1, input.endeVJ_2);

        return (entnahmequoteDepot <= CONFIG.THRESHOLDS.ALARM.withdrawalRate ||
                okRunway || okDrawdnRecovery) && noNewLowerYearlyCloses;
    },

    /**
     * Evaluiert Alarm-Bedingungen
     * @private
     */
    _evaluateAlarmConditions(state, p, addDecision) {
        const { market, runwayMonate, profil } = p;
        const { entnahmequoteDepot, realerDepotDrawdown } = state.keyParams;

        let alarmWarAktiv = state.alarmActive;

        // Deeskalation prüfen
        if (this._shouldDeescalateInPeak(alarmWarAktiv, state, p)) {
            alarmWarAktiv = false;
            addDecision(
                "Alarm-Deeskalation (Peak)",
                "Markt erholt, Drawdown/Quote unkritisch. Alarm wird beendet.",
                "active",
                "guardrail"
            );
        } else if (this._shouldDeescalateInRecovery(alarmWarAktiv, state, p)) {
            alarmWarAktiv = false;
            addDecision(
                "Alarm-Deeskalation (Recovery)",
                "Bedingungen für Entspannung sind erfüllt. Alarm wird beendet.",
                "active",
                "guardrail"
            );
        }

        // Alarm-Aktivierung prüfen
        const isCrisis = market.sKey === 'bear_deep';
        const isRunwayThin = runwayMonate < CONFIG.THRESHOLDS.STRATEGY.runwayThinMonths;
        const isQuoteCritical = entnahmequoteDepot > CONFIG.THRESHOLDS.ALARM.withdrawalRate;
        const isDrawdownCritical = realerDepotDrawdown > CONFIG.THRESHOLDS.ALARM.realDrawdown;

        const alarmAktivInDieserRunde = !alarmWarAktiv && isCrisis &&
            ((isQuoteCritical && isRunwayThin) || isDrawdownCritical);

        if (alarmAktivInDieserRunde) {
            addDecision(
                "Alarm-Aktivierung!",
                `Bärenmarkt und kritische Schwelle überschritten. Alarm-Modus AN.`,
                "active",
                "alarm"
            );
        }

        return {
            active: alarmAktivInDieserRunde || alarmWarAktiv,
            newlyTriggered: alarmAktivInDieserRunde
        };
    },

    /**
     * Berechnet die Flex-Rate
     * @private
     */
    _calculateFlexRate(state, alarmStatus, p, addDecision) {
        // Im Alarm-Modus: Drastische Kürzung
        if (alarmStatus.active) {
            const kuerzungQuelle = "Guardrail (Alarm)";
            let geglätteteFlexRate = state.flexRate;

            if (alarmStatus.newlyTriggered) {
                const shortfallRatio = Math.max(
                    0,
                    (p.profil.minRunwayMonths - p.runwayMonate) / p.profil.minRunwayMonths
                );
                const zielCut = Math.min(10, Math.round(10 + 20 * shortfallRatio));
                geglätteteFlexRate = Math.max(35, state.flexRate - zielCut);
                addDecision(
                    "Anpassung im Alarm-Modus",
                    `Flex-Rate wird auf ${geglätteteFlexRate.toFixed(1)}% gesetzt.`,
                    "active",
                    "alarm"
                );
            } else {
                addDecision(
                    "Anpassung im Alarm-Modus",
                    `Alarm-Modus ist weiterhin aktiv, Rate bleibt bei ${geglätteteFlexRate.toFixed(1)}%.`,
                    "active",
                    "alarm"
                );
            }
            return { geglätteteFlexRate, kuerzungQuelle };
        }

        // Normale Berechnung
        const { market } = p;
        const {
            FLEX_RATE_SMOOTHING_ALPHA,
            RATE_CHANGE_MAX_UP_PP,
            RATE_CHANGE_AGILE_UP_PP,
            RATE_CHANGE_MAX_DOWN_PP,
            RATE_CHANGE_MAX_DOWN_IN_BEAR_PP
        } = CONFIG.SPENDING_MODEL;

        let kuerzungQuelle = "Profil";
        let roheKuerzungProzent = 0;

        if (market.sKey === "bear_deep") {
            roheKuerzungProzent = 50 + Math.max(0, market.abstandVomAthProzent - 20);
            kuerzungQuelle = "Tiefer Bär";
        }

        const roheFlexRate = 100 - roheKuerzungProzent;
        const prevFlexRate = state.flexRate ?? 100;
        let geglätteteFlexRate = FLEX_RATE_SMOOTHING_ALPHA * roheFlexRate +
            (1 - FLEX_RATE_SMOOTHING_ALPHA) * prevFlexRate;

        // Veränderungsraten begrenzen
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
            kuerzungQuelle = "Glättung (Anstieg)";
        } else if (delta < -MAX_DOWN) {
            geglätteteFlexRate = prevFlexRate - MAX_DOWN;
            kuerzungQuelle = "Glättung (Abfall)";
        }

        if (kuerzungQuelle.startsWith("Glättung")) {
            addDecision(
                "Glättung der Rate",
                `Veränderung auf max. ${delta > 0 ? maxUp : MAX_DOWN} pp begrenzt.`,
                "active"
            );
        }

        return { geglätteteFlexRate, kuerzungQuelle };
    },

    /**
     * Wendet Guardrails an
     * @private
     */
    _applyGuardrails(rate, state, p, addDecision) {
        const {
            market, inflatedBedarf, renteJahr, input,
            runwayMonate, profil, kuerzungQuelle: initialSource
        } = p;
        const { entnahmequoteDepot } = state.keyParams;

        const isRecoveryContext = (market.sKey === 'recovery_in_bear') ||
            (market.sKey === 'recovery' && market.abstandVomAthProzent >= 15);
        const isCautionContext = (entnahmequoteDepot >= CONFIG.THRESHOLDS.CAUTION.withdrawalRate);

        let kuerzungQuelle = initialSource;
        let geglätteteFlexRate = rate;
        let cautiousRuleApplied = false;
        const diagnostics = {};

        // Recovery-Guardrail
        if (market.sKey === 'recovery_in_bear') {
            const gap = market.abstandVomAthProzent || 0;
            let curb = CONFIG.RECOVERY_GUARDRAILS.getCurb(gap);
            if (runwayMonate < 30) curb = Math.max(curb, 20);
            const maxFlexRate = 100 - curb;

            if (geglätteteFlexRate > maxFlexRate) {
                geglätteteFlexRate = maxFlexRate;
                kuerzungQuelle = "Guardrail (Vorsicht)";
                addDecision(
                    "Guardrail (Vorsicht)",
                    `Recovery-Cap: Flex-Rate auf ${maxFlexRate.toFixed(1)}% gekappt.`,
                    "active",
                    "guardrail"
                );
                cautiousRuleApplied = true;
            }
        }

        // Inflations-Cap bei hoher Entnahmequote
        let inflationCap = input.inflation;
        if (entnahmequoteDepot >= CONFIG.THRESHOLDS.CAUTION.withdrawalRate) {
            const calculatedInflationCap = Math.min(
                input.inflation,
                CONFIG.THRESHOLDS.CAUTION.inflationCap
            );
            if (calculatedInflationCap < input.inflation) {
                kuerzungQuelle = "Guardrail (Vorsicht)";
                addDecision(
                    "Guardrail (Vorsicht)",
                    `Caution-Cap: Inflationsanpassung auf ${calculatedInflationCap}% begrenzt.`,
                    "active",
                    "guardrail"
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

        // Quelle anpassen wenn vorsichtige Regeln in Recovery/Caution-Kontext
        const isWeakSource = ["Profil", "Glättung (Anstieg)", "Glättung (Abfall)"].includes(kuerzungQuelle);
        if (isWeakSource && (isRecoveryContext || (isCautionContext && market.sKey !== 'bear_deep'))) {
            kuerzungQuelle = "Guardrail (Vorsicht)";
        }

        // Budget-Floor Guardrail
        const angepasstesMinBudget = state.lastTotalBudget * (1 + inflationCap / 100);
        const geplanteJahresentnahme = inflatedBedarf.floor +
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
                kuerzungQuelle = "Budget-Floor";
                addDecision(
                    kuerzungQuelle,
                    `Um realen Kaufkraftverlust zu vermeiden, wird Rate auf ${geglätteteFlexRate.toFixed(1)}% angehoben.`,
                    "active",
                    "guardrail"
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
     * Baut die finalen Ergebnisse zusammen
     * @private
     */
    _buildResults(state, endgueltigeEntnahme, alarmStatus, flexRate, kuerzungQuelle, p) {
        const { market, renteJahr, inflatedBedarf } = p;
        const { peakRealVermoegen, currentRealVermoegen, cumulativeInflationFactor } = state.keyParams;

        // finaleKuerzung ist das Komplement zur flexRate
        const finaleKuerzung = 100 - flexRate;
        const aktuellesGesamtbudgetFinal = endgueltigeEntnahme + renteJahr;

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

        return { newState, spendingResult };
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
    calculateTargetLiquidity: (profil, market, inflatedBedarf) => {
        if (!profil.isDynamic) {
            return (inflatedBedarf.floor + inflatedBedarf.flex) * 2;
        }

        const regime = CONFIG.TEXTS.REGIME_MAP[market.sKey];
        const zielMonate = profil.runway[regime]?.total || profil.runway.hot_neutral.total;
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
    _computeCappedRefill({ isBearContext, liquiditaetsbedarf, aktienwert, input }) {
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
        const nettoBedarf = Math.min(liquiditaetsbedarf, maxCapEuro);
        const isCapped = nettoBedarf < liquiditaetsbedarf;

        if (nettoBedarf < CONFIG.THRESHOLDS.STRATEGY.minRefillAmount) {
            if (liquiditaetsbedarf >= CONFIG.THRESHOLDS.STRATEGY.minRefillAmount) {
                return {
                    bedarf: 0,
                    title: '',
                    diagnosisEntries: [{
                        step: "Aktion unterdrückt",
                        impact: `Geplanter Verkauf (${nettoBedarf.toFixed(0)}€) unter Mindestgröße nach Capping.`,
                        status: 'inactive',
                        severity: 'guardrail'
                    }]
                };
            }
            return { bedarf: 0, title: '', diagnosisEntries: [] };
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

        return { bedarf: nettoBedarf, title, diagnosisEntries };
    },

    /**
     * Bestimmt notwendige Transaktionsaktion
     */
    determineAction(p) {
        const {
            aktuelleLiquiditaet, depotwertGesamt, zielLiquiditaet,
            market, spending, minGold, profil, input
        } = p;

        let actionDetails = { bedarf: 0, title: '', diagnosisEntries: [] };
        let isPufferSchutzAktiv = false;
        let verwendungen = { liquiditaet: 0, gold: 0, aktien: 0 };
        const transactionDiagnostics = {
            wasTriggered: false,
            blockReason: 'none',
            blockedAmount: 0,
            equityThresholds: {},
            goldThresholds: {},
            potentialTrade: {}
        };
        const saleContext = { minGold, saleBudgets: {} };

        const renteJahr = input.renteAktiv ? input.renteMonatlich * 12 : 0;
        const floorBedarfNetto = Math.max(0, input.floorBedarf - renteJahr);
        const krisenMindestLiquiditaet = (floorBedarfNetto / 12) * input.runwayMinMonths;
        const sicherheitsPuffer = krisenMindestLiquiditaet;
        const isBearRegimeProxy = market.sKey === 'bear_deep' || market.sKey === 'recovery_in_bear';

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
            const aktienwert = input.depotwertAlt + input.depotwertNeu;

            // Bärenmarkt: Runway auffüllen
            if (isBearRegimeProxy && currentRunwayMonths < input.runwayMinMonths) {
                const runwayBedarfEuro = (input.runwayMinMonths - currentRunwayMonths) *
                    (gesamtjahresbedarf / 12);
                actionDetails = this._computeCappedRefill({
                    isBearContext: true,
                    liquiditaetsbedarf: runwayBedarfEuro,
                    aktienwert,
                    input
                });
                verwendungen.liquiditaet = actionDetails.bedarf;

            // Nicht-Bärenmarkt: Opportunistisches Rebalancing
            } else if (!isBearRegimeProxy) {
                const investiertesKapital = depotwertGesamt + aktuelleLiquiditaet;
                const minTrade = Math.max(
                    CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
                    investiertesKapital * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
                );

                const liquiditaetsBedarf = Math.max(0, zielLiquiditaet - aktuelleLiquiditaet);
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

                if (totalerBedarf >= minTrade) {
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

                    // Aktien-Verkaufsbudget berechnen
                    const aktienZielwert = investiertesKapital * (input.targetEq / 100);
                    const aktienObergrenze = aktienZielwert * (1 + (input.rebalBand / 100));
                    const aktienUeberschuss = (aktienwert > aktienObergrenze)
                        ? (aktienwert - aktienZielwert)
                        : 0;
                    const maxSkimCapEuro = (input.maxSkimPctOfEq / 100) * aktienwert;
                    const maxSellableFromEquity = Math.min(aktienUeberschuss, maxSkimCapEuro);

                    const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
                    if (totalEquityValue > 0) {
                        saleContext.saleBudgets.aktien_alt =
                            maxSellableFromEquity * (input.depotwertAlt / totalEquityValue);
                        saleContext.saleBudgets.aktien_neu =
                            maxSellableFromEquity * (input.depotwertNeu / totalEquityValue);
                    }

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

        const minTradeResult = Math.max(
            CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
            (depotwertGesamt + aktuelleLiquiditaet) * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
        );

        if (!saleResult || saleResult.achievedRefill < minTradeResult) {
            return {
                type: 'NONE',
                anweisungKlasse: 'anweisung-gruen',
                title: `${market.szenarioText} (Kein Handlungsbedarf)`,
                diagnosisEntries: actionDetails.diagnosisEntries,
                transactionDiagnostics
            };
        }

        const effektiverNettoerloes = saleResult.achievedRefill;

        if (gesamterNettoBedarf > effektiverNettoerloes + 1 && !actionDetails.title.includes('(Cap aktiv)')) {
            actionDetails.title += ' (Cap aktiv)';
        }

        // Erlös verteilen: Priorität 1: Liquidität, 2: Gold, 3: Aktien
        let erloesUebrig = effektiverNettoerloes;

        const finalLiq = Math.min(erloesUebrig, verwendungen.liquiditaet);
        erloesUebrig -= finalLiq;

        const finalGold = Math.min(erloesUebrig, verwendungen.gold);
        erloesUebrig -= finalGold;

        const finalAktien = Math.min(erloesUebrig, verwendungen.aktien);

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
 * Interne Orchestrierungsfunktion
 * Führt alle Module zusammen und berechnet ein Jahresergebnis
 * @private
 */
function _internal_calculateModel(input, lastState) {
    // 1. Validierung
    const validationResult = InputValidator.validate(input);
    if (!validationResult.valid) {
        return { error: new ValidationError(validationResult.errors) };
    }

    // 2. Grundwerte berechnen
    const profil = CONFIG.PROFIL_MAP[input.risikoprofil];
    const aktuelleLiquiditaet = input.tagesgeld + input.geldmarktEtf;
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu +
        (input.goldAktiv ? input.goldWert : 0);
    const gesamtwert = depotwertGesamt + aktuelleLiquiditaet;

    // 3. Marktanalyse
    const market = MarketAnalyzer.analyzeMarket(input);

    // 4. Gold-Floor berechnen
    const goldFloorAbs = (input.goldFloorProzent / 100) * gesamtwert;
    const minGold = input.goldAktiv ? goldFloorAbs : 0;

    // 5. Inflationsangepassten Bedarf berechnen
    const renteJahr = input.renteAktiv ? (input.renteMonatlich * 12) : 0;
    const inflatedBedarf = {
        floor: Math.max(0, input.floorBedarf - renteJahr),
        flex: input.flexBedarf
    };
    const neuerBedarf = inflatedBedarf.floor + inflatedBedarf.flex;

    // 6. Runway berechnen
    const reichweiteMonate = (inflatedBedarf.floor + inflatedBedarf.flex) > 0
        ? (aktuelleLiquiditaet / ((inflatedBedarf.floor + inflatedBedarf.flex) / 12))
        : Infinity;

    // 7. Ausgabenplanung
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
    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(
        profil,
        market,
        inflatedBedarf
    );

    // 9. Transaktionsaktion bestimmen
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
    if (Array.isArray(action.diagnosisEntries) && action.diagnosisEntries.length) {
        diagnosis.decisionTree.push(...action.diagnosisEntries);
    }

    // 10. Liquidität nach Transaktion berechnen
    const liqNachTransaktion = aktuelleLiquiditaet + (action.verwendungen?.liquiditaet || 0);
    const jahresGesamtbedarf = inflatedBedarf.floor + inflatedBedarf.flex;
    const computeCoverage = (liquiditaetWert) => (zielLiquiditaet > 0)
        ? (liquiditaetWert / zielLiquiditaet) * 100
        : 100;
    const deckungVorher = computeCoverage(aktuelleLiquiditaet);
    const deckungNachher = computeCoverage(liqNachTransaktion);
    const runwayMonths = (jahresGesamtbedarf > 0)
        ? (liqNachTransaktion / (jahresGesamtbedarf / 12))
        : Infinity;

    // 11. Runway-Status
    let runwayStatus = 'bad';
    if (runwayMonths >= input.runwayTargetMonths) {
        runwayStatus = 'ok';
    } else if (runwayMonths >= input.runwayMinMonths) {
        runwayStatus = 'warn';
    }
    diagnosis.general = diagnosis.general || {};
    diagnosis.general.runwayStatus = runwayStatus;
    diagnosis.general.runwayMonate = runwayMonths;
    diagnosis.general.deckungVorher = deckungVorher;
    diagnosis.general.deckungNachher = deckungNachher;

    // 12. Ergebnis zusammenstellen
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
    getVersion: function() {
        return { api: ENGINE_API_VERSION, build: ENGINE_BUILD_ID };
    },

    /**
     * Gibt Konfiguration zurück
     */
    getConfig: function() {
        return CONFIG;
    },

    /**
     * Analysiert Marktbedingungen
     */
    analyzeMarket: function(input) {
        try {
            return MarketAnalyzer.analyzeMarket(input);
        } catch (e) {
            return { error: e.message };
        }
    },

    /**
     * Berechnet Ziel-Liquidität
     */
    calculateTargetLiquidity: function(profil, market, inflatedBedarf) {
        return TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf);
    },

    /**
     * Simuliert ein einzelnes Jahr
     */
    simulateSingleYear: function(input, lastState) {
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
    addDecision: function(step, impact, status, severity) {
        console.warn("EngineAPI.addDecision ist veraltet.");
    },

    /**
     * @deprecated Veraltete Methode
     */
    updateDecision: function() {},

    /**
     * @deprecated Veraltete Methode
     */
    removeDecision: function() {}
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
    calculateTargetLiquidity: function(profil, market, annualNeedOrInflated, inflatedFloor, inflatedFlex) {
        const inflated = (annualNeedOrInflated && typeof annualNeedOrInflated === 'object')
            ? annualNeedOrInflated
            : { floor: Number(inflatedFloor) || 0, flex: Number(inflatedFlex) || 0 };

        return EngineAPI.calculateTargetLiquidity(profil, market, inflated);
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
