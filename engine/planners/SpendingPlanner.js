'use strict';

/**
 * ===================================================================
 * SPENDING PLANNER MODULE
 * ===================================================================
 * Berechnet die optimale Ausgabenstrategie basierend auf Marktbedingungen
 * und finanzieller Situation
 * ===================================================================
 */

const { CONFIG } = require('../config.js');

const SpendingPlanner = {
    /**
     * Bestimmt die Ausgabenstrategie für ein Jahr
     * @param {Object} p - Parameter-Objekt mit allen notwendigen Daten
     * @returns {Object} Ergebnis mit Ausgabenplan, neuem State und Diagnose
     */
    determineSpending(p) {
        const {
            lastState, market, inflatedBedarf, round5, runwayMonate,
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
        if (!alarmStatus.active) {
            const guardrailResult = this._applyGuardrails(
                geglätteteFlexRate, state, { ...p, kuerzungQuelle }, addDecision
            );
            geglätteteFlexRate = guardrailResult.rate;
            kuerzungQuelle = guardrailResult.source;
        }

        // 5. Endgültige Entnahme berechnen
        let endgueltigeEntnahme = inflatedBedarf.floor +
            (inflatedBedarf.flex * (Math.max(0, Math.min(100, geglätteteFlexRate)) / 100));

        // 6. Optional auf 5%-Schritte runden
        if (round5) {
            const ungerundeteFlexRate = inflatedBedarf.flex > 0
                ? ((endgueltigeEntnahme - inflatedBedarf.floor) / inflatedBedarf.flex * 100)
                : 0;
            const gerundeteFlexRate = Math.round(ungerundeteFlexRate / 5) * 5;

            if (Math.abs(ungerundeteFlexRate - gerundeteFlexRate) > 0.1) {
                endgueltigeEntnahme = inflatedBedarf.floor +
                    (inflatedBedarf.flex * (gerundeteFlexRate / 100));
                addDecision(
                    "Rundung",
                    `Flex-Rate auf nächsten 5%-Schritt gerundet (${gerundeteFlexRate.toFixed(0)}%).`,
                    "inactive"
                );
            }
        }

        // 7. Finale Werte berechnen
        const finaleKuerzung = inflatedBedarf.flex > 0
            ? 100 - (Math.max(0, endgueltigeEntnahme - inflatedBedarf.floor) / inflatedBedarf.flex * 100)
            : 0;
        const flexRate = 100 - finaleKuerzung;

        // 8. Ergebnisse zusammenstellen
        const { newState, spendingResult } = this._buildResults(
            state, endgueltigeEntnahme, alarmStatus, flexRate, kuerzungQuelle, p
        );

        // 9. Diagnose vervollständigen
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
        const aktuellesGesamtbudget = geplanteJahresentnahme + renteJahr;
        const noNewLowerYearlyCloses = input.endeVJ > Math.min(input.endeVJ_1, input.endeVJ_2);
        const budgetFloorErlaubt = !['bear_deep', 'recovery_in_bear'].includes(market.sKey) ||
            ((market.abstandVomAthProzent || 0) <= 10 && noNewLowerYearlyCloses &&
             runwayMonate >= Math.max(30, profil.minRunwayMonths + 6));

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
            }
        }

        return { rate: geglätteteFlexRate, source: kuerzungQuelle };
    },

    /**
     * Baut die finalen Ergebnisse zusammen
     * @private
     */
    _buildResults(state, endgueltigeEntnahme, alarmStatus, flexRate, kuerzungQuelle, p) {
        const { market, renteJahr, inflatedBedarf } = p;
        const { peakRealVermoegen, currentRealVermoegen, cumulativeInflationFactor } = state.keyParams;

        const finaleKuerzung = inflatedBedarf.flex > 0
            ? 100 - (Math.max(0, endgueltigeEntnahme - inflatedBedarf.floor) / inflatedBedarf.flex * 100)
            : 0;
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

// Exporte
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpendingPlanner;
}
