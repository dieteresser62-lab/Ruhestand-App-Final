/**
 * Module: Spending Planner
 * Purpose: Determines the annual spending strategy (Flex-Rate) based on market conditions, portfolio state, and guardrails.
 *          Implements the core "Variable Withdrawal Rate" logic, including smoothing and alarms.
 * Usage: Called by engine/core.mjs during the simulation loop.
 * Dependencies: engine/config.mjs
 */
import { CONFIG } from '../config.mjs';
import { evaluateAlarmConditions, shouldDeescalateInPeak, shouldDeescalateInRecovery } from './alarm-policy.mjs';
import { applyFinalRateLimits } from './final-rate-policy.mjs';
import { applyFlexBudgetCap } from './flex-budget-policy.mjs';
import { applyFlexShareCurve, calculateFlexRate } from './flex-rate-policy.mjs';
import { applyMinimumFlexFloor } from './minimum-flex-policy.mjs';
import { buildSpendingDiagnosis, resolveRunwayTarget } from './spending-diagnosis.mjs';
import { applyGuardrails } from './spending-guardrails.mjs';
import { applySpendingPolicyPipeline } from './spending-policy-pipeline.mjs';
import { calcFlexShare, calculateFinalWithdrawal, quantizeMonthly, smoothstep } from './spending-policy-helpers.mjs';
import { calculateWealthAdjustedReductionFactor } from './wealth-reduction.mjs';

export const SpendingPlanner = {
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
    _quantizeMonthly(amount, mode = 'floor') {
        return quantizeMonthly(amount, mode);
    },

    _smoothstep(x) {
        return smoothstep(x);
    },

    _calculateWealthAdjustedReductionFactor(params) {
        return calculateWealthAdjustedReductionFactor(params);
    },

    _applyFlexShareCurve(flexRate, inflatedBedarf, addDecision, wealthFactor = 1) {
        return applyFlexShareCurve(flexRate, inflatedBedarf, addDecision, wealthFactor);
    },

    _calcFlexShare(inflatedBedarf) {
        return calcFlexShare(inflatedBedarf);
    },

    _applyFlexBudgetCap(flexRate, inflatedBedarf, input, state, market, addDecision) {
        return applyFlexBudgetCap(flexRate, inflatedBedarf, input, state, market, addDecision);
    },

    _applyMinimumFlexFloor(flexRate, context, addDecision) {
        return applyMinimumFlexFloor(flexRate, context, addDecision);
    },

    _applyFinalRateLimits(prevFlexRate, nextFlexRate, market, addDecision, wealthFactor = 1) {
        return applyFinalRateLimits(prevFlexRate, nextFlexRate, market, addDecision, wealthFactor);
    },

    determineSpending(params) {
        const { lastState, inflatedBedarf } = params;

        const decisionTree = [];

        const addDecision = (step, impact, status, severity = 'info') => {
            decisionTree.push({ step, impact, status, severity });
        };

        // 1. State initialisieren oder laden.
        const state = this._initializeOrLoadState(lastState, params, addDecision);

        // 2. Alarm-Bedingungen evaluieren.
        // Alarm > Guardrails: Im Alarmmodus werden Guardrails bewusst ausgesetzt,
        // damit der Sicherheitsmechanismus nicht durch Nebenregeln verwässert wird.
        const alarmStatus = this._evaluateAlarmConditions(state, params, addDecision);

        // 3. Flex-Rate berechnen (inkl. Glättung/Alarm-Verhalten).
        // Diese Rate ist die "Zentralsteuerung" der Flex-Entnahme.
        const initialPolicyResult = this._calculateFlexRate(
            state,
            alarmStatus,
            params,
            addDecision
        );

        // 4. Policy-Pipeline anwenden: Guardrails, Flex-Budget und finale Limits.
        const policyResult = this._applySpendingPolicyPipeline(
            state,
            alarmStatus,
            params,
            addDecision,
            initialPolicyResult
        );

        // 5. Endgültige Entnahme bestimmen.
        const { endgueltigeEntnahme, flexRate } = this._calculateFinalWithdrawal(
            inflatedBedarf,
            policyResult.flexRate
        );

        // 6. Ergebnisobjekte aufbauen.
        const { newState, spendingResult, diagnosisMetrics } = this._buildResults(
            state,
            endgueltigeEntnahme,
            alarmStatus,
            flexRate,
            policyResult.kuerzungQuelle,
            params
        );

        // 7. Diagnose vervollständigen.
        const diagnosis = this._buildDiagnosis({
            decisionTree,
            state,
            alarmStatus,
            params,
            guardrailDiagnostics: policyResult.guardrailDiagnostics,
            diagnosisMetrics
        });

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
        return shouldDeescalateInPeak(alarmWarAktiv, state, params);
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
        return shouldDeescalateInRecovery(alarmWarAktiv, state, params);
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
        return evaluateAlarmConditions(state, params, addDecision);
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
        return calculateFlexRate(state, alarmStatus, params, addDecision);
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
        return applyGuardrails(rate, state, params, addDecision);
    },

    /**
     * Wendet die Spending-Policy-Pipeline nach der initialen Flex-Rate an.
     *
     * @param {Object} state - Persistenter State; Flex-Budget-State kann aktualisiert werden.
     * @param {Object} alarmStatus - Struktur aus _evaluateAlarmConditions.
     * @param {Object} params - Laufzeitdaten.
     * @param {Function} addDecision - Logging-Hook.
     * @param {Object} initialPolicyResult - Ergebnis aus _calculateFlexRate.
     * @returns {{ flexRate: number, kuerzungQuelle: string, guardrailDiagnostics: Object }}
     */
    _applySpendingPolicyPipeline(state, alarmStatus, params, addDecision, initialPolicyResult) {
        return applySpendingPolicyPipeline(state, alarmStatus, params, addDecision, initialPolicyResult);
    },

    /**
     * Ermittelt final quantisierte Jahresentnahme und effektive Flex-Rate.
     *
     * @param {Object} inflatedBedarf - Inflationsbereinigter Floor-/Flex-Bedarf.
     * @param {number} flexRate - Finale Ziel-Flex-Rate vor Quantisierung.
     * @returns {{ endgueltigeEntnahme: number, flexRate: number }}
     */
    _calculateFinalWithdrawal(inflatedBedarf, flexRate) {
        return calculateFinalWithdrawal(
            inflatedBedarf,
            flexRate,
            CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED
        );
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

        const entnahmeReal = endgueltigeEntnahme / (cumulativeInflationFactor || 1);
        const newState = {
            ...state,
            flexRate,
            lastMarketSKey: market.sKey,
            lastTotalBudget: aktuellesGesamtbudgetFinal,
            peakRealVermoegen: Math.max(peakRealVermoegen, currentRealVermoegen),
            alarmActive: alarmStatus.active,
            cumulativeInflationFactor: cumulativeInflationFactor,
            lastInflationAppliedAtAge: state.lastInflationAppliedAtAge,
            lastEntnahmeReal: entnahmeReal
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
     * Baut die finale Diagnose-Struktur.
     *
     * @param {Object} params - Diagnoseparameter inkl. State, Guardrails und Metriken.
     * @returns {{ decisionTree: Array, guardrails: Array, keyParams: Object, general: Object }}
     */
    _buildDiagnosis(params) {
        return buildSpendingDiagnosis(params);
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
        return resolveRunwayTarget(profil, market, input);
    }
};

// Exporte
export default SpendingPlanner;
