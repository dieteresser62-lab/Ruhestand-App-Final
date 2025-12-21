/**
 * ===================================================================
 * SPENDING PLANNER MODULE
 * ===================================================================
 * Berechnet die optimale Ausgabenstrategie basierend auf Marktbedingungen
 * und finanzieller Situation
 * ===================================================================
 */

import { CONFIG } from '../config.mjs';

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
                geglätteteFlexRate = Math.max(35, state.flexRate);
                addDecision(
                    'Anpassung im Alarm-Modus',
                    `Alarm-Modus ist weiterhin aktiv, Rate auf ${geglätteteFlexRate.toFixed(1)}% (Min. 35%) gehalten.`,
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

// Exporte
export default SpendingPlanner;
