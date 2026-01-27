/**
 * Module: Spending Planner
 * Purpose: Determines the annual spending strategy (Flex-Rate) based on market conditions, portfolio state, and guardrails.
 *          Implements the core "Variable Withdrawal Rate" logic, including smoothing and alarms.
 * Usage: Called by engine/core.mjs during the simulation loop.
 * Dependencies: engine/config.mjs
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
    _quantizeMonthly(amount, mode = 'floor') {
        if (!CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED) return amount;

        const tiers = CONFIG.ANTI_PSEUDO_ACCURACY.QUANTIZATION_TIERS_MONTHLY;
        const tier = tiers.find(t => amount < t.limit);
        const step = tier ? tier.step : 250;

        if (mode === 'ceil') {
            return Math.ceil(amount / step) * step;
        }
        return Math.floor(amount / step) * step;
    },

    _smoothstep(x) {
        const t = Math.min(1, Math.max(0, x));
        return t * t * (3 - 2 * t);
    },

    _calculateWealthAdjustedReductionFactor(params) {
        const cfg = CONFIG.SPENDING_MODEL?.WEALTH_ADJUSTED_REDUCTION;
        if (!cfg) return { factor: 1, entnahmequoteUsed: null };
        const safeRate = Number(cfg.SAFE_WITHDRAWAL_RATE);
        const fullRate = Number(cfg.FULL_WITHDRAWAL_RATE);
        if (!Number.isFinite(safeRate) || !Number.isFinite(fullRate) || fullRate <= safeRate) {
            return { factor: 1, entnahmequoteUsed: null };
        }

        const inflatedBedarf = params?.inflatedBedarf || {};
        const floor = Math.max(0, Number(inflatedBedarf.floor) || 0);
        const flex = Math.max(0, Number(inflatedBedarf.flex) || 0);
        const renteJahr = Math.max(0, Number(params?.renteJahr) || 0);
        const maxEntnahme = Math.max(0, floor + flex - renteJahr);
        const depotwertGesamt = Math.max(0, Number(params?.depotwertGesamt) || 0);
        const lastState = params?.lastState || {};
        const lastEntnahmeReal = Number.isFinite(lastState.lastEntnahmeReal)
            ? Math.max(0, lastState.lastEntnahmeReal)
            : null;
        const inflationFactor = Number.isFinite(lastState.cumulativeInflationFactor)
            ? Math.max(1e-9, lastState.cumulativeInflationFactor)
            : 1;
        const depotwertReal = depotwertGesamt / inflationFactor;

        let entnahmequoteUsed = null;
        if (lastEntnahmeReal !== null && depotwertReal > 0) {
            entnahmequoteUsed = lastEntnahmeReal / depotwertReal;
        } else if (depotwertGesamt > 0) {
            entnahmequoteUsed = maxEntnahme / depotwertGesamt;
        } else {
            entnahmequoteUsed = 1;
        }

        const linearT = (entnahmequoteUsed - safeRate) / (fullRate - safeRate);
        return { factor: this._smoothstep(linearT), entnahmequoteUsed };
    },

    _applyFlexShareCurve(flexRate, inflatedBedarf, addDecision, wealthFactor = 1) {
        const curve = CONFIG.SPENDING_MODEL?.FLEX_SHARE_S_CURVE;
        if (!curve?.ENABLED) {
            return { rate: flexRate, applied: false };
        }

        const floor = Math.max(0, Number(inflatedBedarf?.floor) || 0);
        const flex = Math.max(0, Number(inflatedBedarf?.flex) || 0);
        const total = floor + flex;
        if (total <= 0 || flex <= 0 || flexRate <= 0) {
            return { rate: flexRate, applied: false };
        }

        const share = Math.min(1, Math.max(0, flex / total));
        const s = 1 / (1 + Math.exp(-curve.A * (share - curve.B)));
        const baseCap = Math.max(0, Math.min(100, 100 - (curve.K * 100 * s)));
        const w = Number.isFinite(wealthFactor) ? Math.min(1, Math.max(0, wealthFactor)) : 1;
        const cap = Math.max(0, Math.min(100, 100 - (w * (100 - baseCap))));
        const adjusted = Math.max(0, Math.min(100, Math.min(flexRate, cap)));

        const applied = adjusted + 0.05 < flexRate;
        if (applied) {
            addDecision(
                'Flex-S-Kurve',
                `Flex-Anteil ${Math.round(share * 100)}% -> Cap ${(cap).toFixed(1)}%.`,
                'active'
            );
        }

        return { rate: adjusted, applied };
    },

    _calcFlexShare(inflatedBedarf) {
        const floor = Math.max(0, Number(inflatedBedarf?.floor) || 0);
        const flex = Math.max(0, Number(inflatedBedarf?.flex) || 0);
        const total = floor + flex;
        if (total <= 0 || flex <= 0) return 0;
        return Math.min(1, Math.max(0, flex / total));
    },

    _applyFlexBudgetCap(flexRate, inflatedBedarf, input, state, market, addDecision) {
        const cfg = CONFIG.SPENDING_MODEL?.FLEX_BUDGET;
        if (!cfg?.ENABLED) {
            return { rate: flexRate, balanceYears: state.flexBudgetBalanceYears, minRatePct: 0, applied: false };
        }

        const annualCap = Number(input?.flexBudgetAnnual) || 0;
        if (annualCap <= 0) {
            return { rate: flexRate, balanceYears: state.flexBudgetBalanceYears, minRatePct: 0, applied: false };
        }

        const maxYearsInput = Number(input?.flexBudgetYears);
        const maxYears = (Number.isFinite(maxYearsInput) && maxYearsInput > 0)
            ? maxYearsInput
            : (cfg.DEFAULT_MAX_YEARS || 0);
        const maxBalanceYears = Math.max(0, maxYears);
        let prevBalanceYears = Number.isFinite(state.flexBudgetBalanceYears)
            ? state.flexBudgetBalanceYears
            : (Number.isFinite(state.flexBudgetBalance) ? state.flexBudgetBalance : maxBalanceYears);
        if (!Number.isFinite(prevBalanceYears) || prevBalanceYears <= 0) {
            prevBalanceYears = maxBalanceYears;
        }
        prevBalanceYears = Math.min(maxBalanceYears, Math.max(0, prevBalanceYears));

        const rechargeInput = Number(input?.flexBudgetRecharge);
        const recharge = Number.isFinite(rechargeInput)
            ? rechargeInput
            : (annualCap * (cfg.DEFAULT_RECHARGE_FRACTION || 0));

        const activeRegimes = Array.isArray(cfg.ACTIVE_REGIMES) ? cfg.ACTIVE_REGIMES : [];
        const isActive = activeRegimes.includes(market?.sKey);
        const regimeWeights = cfg.REGIME_WEIGHTS || {};
        const regimeWeight = Number.isFinite(regimeWeights?.[market?.sKey])
            ? regimeWeights[market.sKey]
            : 1.0;
        const capMultipliers = cfg.REGIME_CAP_MULTIPLIER || {};
        const capMultiplier = Number.isFinite(capMultipliers?.[market?.sKey])
            ? capMultipliers[market.sKey]
            : 1.0;
        const minRateBaseByRegime = cfg.MIN_RATE_BASE_PCT || {};
        const baseMinRate = Number.isFinite(minRateBaseByRegime?.[market?.sKey])
            ? minRateBaseByRegime[market.sKey]
            : 0;
        const minRateSlopeByRegime = cfg.MIN_RATE_FLOOR_SLOPE_PCT || {};
        const slopeRate = Number.isFinite(minRateSlopeByRegime?.[market?.sKey])
            ? minRateSlopeByRegime[market.sKey]
            : 0;
        const wealthFactor = Number.isFinite(state?.keyParams?.wealthReductionFactor)
            ? Math.min(1, Math.max(0, state.keyParams.wealthReductionFactor))
            : 1;
        const floorGross = Math.max(0, Number(input?.floorBedarf) || 0);
        const flexGross = Math.max(0, Number(input?.flexBedarf) || 0);
        const totalGross = floorGross + flexGross;
        const floorShare = totalGross > 0 ? Math.min(1, Math.max(0, floorGross / totalGross)) : 0;
        const minRatePct = Math.max(0, (baseMinRate + (slopeRate * floorShare)) * wealthFactor);

        let balanceYears = prevBalanceYears;
        let rate = flexRate;
        let applied = false;
        if (isActive && balanceYears > 0 && inflatedBedarf?.flex > 0) {
            const currentFlex = inflatedBedarf.flex * (Math.max(0, Math.min(100, flexRate)) / 100);
            const capThisYear = annualCap * capMultiplier;
            const capWithWealth = capThisYear + (1 - wealthFactor) * Math.max(0, currentFlex - capThisYear);
            const allowedFlex = Math.min(currentFlex, capWithWealth);
            if (allowedFlex + 0.01 < currentFlex) {
                rate = Math.min(100, Math.max(0, (allowedFlex / inflatedBedarf.flex) * 100));
                applied = true;
                addDecision(
                    'Flex-Budget (Cap)',
                    `Flex auf ${allowedFlex.toFixed(0)}€ gekappt (Topf ${balanceYears.toFixed(1)} J, x${capMultiplier}).`,
                    'active',
                    'guardrail'
                );
            }
            balanceYears = Math.max(0, balanceYears - Math.max(0, regimeWeight));
        } else if (!isActive && recharge > 0 && maxBalanceYears > 0 && balanceYears < maxBalanceYears - 0.01) {
            const rechargeYears = recharge / annualCap;
            balanceYears = Math.min(maxBalanceYears, balanceYears + Math.max(0, rechargeYears));
        }

        if (isActive && minRatePct > 0 && rate < minRatePct) {
            rate = minRatePct;
            applied = true;
            addDecision(
                'Flex-Budget (Min-Rate)',
                `Flex-Rate auf min. ${minRatePct.toFixed(0)}% angehoben (Regime ${market?.sKey}, Floor-Anteil ${Math.round(floorShare * 100)}%).`,
                'active',
                'guardrail'
            );
        }

        return { rate, balanceYears, minRatePct, applied };
    },

    _applyFinalRateLimits(prevFlexRate, nextFlexRate, market, addDecision, wealthFactor = 1) {
        const limits = CONFIG.SPENDING_MODEL?.FLEX_RATE_FINAL_LIMITS;
        if (!limits) return { rate: nextFlexRate, applied: false };

        const baseMaxUp = limits.MAX_UP_PP ?? 0;
        const baseMaxDown = (market?.sKey === 'bear_deep')
            ? (limits.MAX_DOWN_IN_BEAR_PP ?? limits.MAX_DOWN_PP ?? 0)
            : (limits.MAX_DOWN_PP ?? 0);
        const w = Number.isFinite(wealthFactor) ? Math.min(1, Math.max(0, wealthFactor)) : 1;
        const maxUp = baseMaxUp;
        const relaxCap = Number.isFinite(limits.RELAX_MAX_DOWN_PP)
            ? limits.RELAX_MAX_DOWN_PP
            : 20;
        const relaxScale = 1 - w;
        const relax = relaxScale * relaxScale;
        const maxDown = baseMaxDown + (relax * (relaxCap - baseMaxDown));
        const delta = nextFlexRate - prevFlexRate;
        let rate = nextFlexRate;

        if (maxUp > 0 && delta > maxUp) {
            rate = prevFlexRate + maxUp;
            addDecision(
                'Glättung (Final-Guardrail)',
                `Anstieg nach Guardrails auf max. ${maxUp} pp begrenzt.`,
                'active',
                'guardrail'
            );
        } else if (maxDown > 0 && delta < -maxDown) {
            rate = prevFlexRate - maxDown;
            addDecision(
                'Glättung (Final-Guardrail)',
                `Rückgang nach Guardrails auf max. ${maxDown} pp begrenzt.`,
                'active',
                'guardrail'
            );
        }

        return { rate, applied: rate !== nextFlexRate };
    },

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
        // Alarm > Guardrails: Im Alarmmodus werden Guardrails bewusst ausgesetzt,
        // damit der Sicherheitsmechanismus nicht durch Nebenregeln verwässert wird.
        const alarmStatus = this._evaluateAlarmConditions(state, params, addDecision);

        // 3. Flex-Rate berechnen (inkl. Glättung/Alarm-Verhalten).
        // Diese Rate ist die "Zentralsteuerung" der Flex-Entnahme.
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

        // Flex-Budget wirkt als weicher Deckel: schützt den Floor,
        // begrenzt aber die Flex-Entnahme bei langer Durststrecke.
        const flexBudgetResult = this._applyFlexBudgetCap(
            geglätteteFlexRate,
            inflatedBedarf,
            input,
            state,
            market,
            addDecision
        );
        if (flexBudgetResult.applied) {
            geglätteteFlexRate = flexBudgetResult.rate;
            if (kuerzungQuelle !== 'Budget-Floor') {
                kuerzungQuelle = 'Flex-Budget (Cap)';
            }
        }
        if (Number.isFinite(flexBudgetResult.balanceYears)) {
            state.flexBudgetBalanceYears = flexBudgetResult.balanceYears;
        }
        if (state.keyParams && Number.isFinite(flexBudgetResult.minRatePct)) {
            state.keyParams.minFlexRatePct = flexBudgetResult.minRatePct;
        }

        // Wealth-Faktor dämpft Ausgaben bei sehr hohem Vermögen (Sicherheitsmodus).
        const wealthFactor = Number.isFinite(state.keyParams?.wealthReductionFactor)
            ? Math.min(1, Math.max(0, state.keyParams.wealthReductionFactor))
            : 1;

        // Finale Limits wirken als letzte Schutzbarriere (Rate-Clamp).
        const finalLimitResult = this._applyFinalRateLimits(
            state.flexRate ?? 100,
            geglätteteFlexRate,
            market,
            addDecision,
            wealthFactor
        );
        if (finalLimitResult.applied) {
            geglätteteFlexRate = finalLimitResult.rate;
            if (kuerzungQuelle !== 'Budget-Floor') {
                kuerzungQuelle = 'Glättung (Final-Guardrail)';
            }
        }

        // 5. Endgültige Entnahme bestimmen.
        // Floor wird immer voll genommen, Flex wird mit der finalen Rate skaliert.
        let rawEntnahme = inflatedBedarf.floor +
            (inflatedBedarf.flex * (Math.max(0, Math.min(100, geglätteteFlexRate)) / 100));

        // ANTI-PSEUDO-ACCURACY: Monatliche Entnahme quantisieren
        // Umrechnung auf Monatsbasis -> Runden -> Zurück auf Jahresbasis
        // Wir nutzen 'floor' (abrunden) für Budget-Sicherheit.
        let monthlyEntnahme = rawEntnahme / 12;
        if (CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED) {
            monthlyEntnahme = this._quantizeMonthly(monthlyEntnahme, 'floor');
        }
        const endgueltigeEntnahme = monthlyEntnahme * 12;

        // 6. Flex-Rate ableiten (Anteil des Flex-Bedarfs, der finanziert werden kann).
        // Diese Rate spiegelt die tatsächlich finanzierbare Flex-Komponente wider.
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
        // Wealth-Adjusted Reduction: gibt eine Dämpfung zurück, wenn die Entnahmequote
        // unter dem Safe-Rate-Niveau liegt (Signal: Vermögen reicht).
        const wealthReduction = this._calculateWealthAdjustedReductionFactor(params);
        const wealthFactor = Number.isFinite(wealthReduction.factor)
            ? Math.min(1, Math.max(0, wealthReduction.factor))
            : 1;
        // <0.5 bedeutet: wir schneiden die Reduktion mindestens halb – also "reichlich Vermögen".
        const wealthSufficient = wealthFactor < 0.5;

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

        if (isCrisis && wealthSufficient) {
            if (alarmWarAktiv) {
                addDecision(
                    'Alarm unterdrückt',
                    'Vermögen ausreichend – Alarm-Modus wird beendet.',
                    'active',
                    'info'
                );
            } else {
                addDecision(
                    'Alarm unterdrückt',
                    'Vermögen ausreichend – kein Alarm-Modus trotz Bärenmarkt.',
                    'active',
                    'info'
                );
            }
            alarmWarAktiv = false;
        }

        // Alarm-Trigger: tiefer Bär + nicht vermögenssicher + (kritische Quote+Runway)
        // oder harter Drawdown als alleiniger Auslöser.
        const alarmAktivInDieserRunde = !alarmWarAktiv && isCrisis && !wealthSufficient &&
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
        const wealthReduction = this._calculateWealthAdjustedReductionFactor(p);
        const wealthFactor = Number.isFinite(wealthReduction.factor)
            ? Math.min(1, Math.max(0, wealthReduction.factor))
            : 1;
        if (state.keyParams) {
            state.keyParams.wealthReductionFactor = wealthFactor;
            if (Number.isFinite(wealthReduction.entnahmequoteUsed)) {
                state.keyParams.entnahmequoteUsed = wealthReduction.entnahmequoteUsed;
            }
        }

        if (alarmStatus.active) {
            const kuerzungQuelle = 'Guardrail (Alarm)';
            let geglätteteFlexRate = state.flexRate;

            if (alarmStatus.newlyTriggered) {
                const shortfallRatio = Math.max(
                    0,
                    (p.profil.minRunwayMonths - p.runwayMonate) / p.profil.minRunwayMonths
                );
                const zielCut = Math.min(10, Math.round(10 + 20 * shortfallRatio));
                const zielCutScaled = zielCut * wealthFactor;
                geglätteteFlexRate = Math.max(35, state.flexRate - zielCutScaled);
                addDecision(
                    'Anpassung im Alarm-Modus',
                    `Flex-Rate wird auf ${geglätteteFlexRate.toFixed(1)}% gesetzt.`,
                    'active',
                    'alarm'
                );
                if (wealthFactor < 1) {
                    addDecision(
                        'Vermögensbasierte Dämpfung',
                        'Alarm-Kürzung wird aufgrund hoher Vermögensdeckung reduziert.',
                        'active',
                        'info'
                    );
                }
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
            RATE_CHANGE_MAX_DOWN_IN_BEAR_PP,
            RATE_CHANGE_RELAX_MAX_DOWN_PP
        } = CONFIG.SPENDING_MODEL;

        let kuerzungQuelle = 'Profil';
        let roheKuerzungProzent = 0;

        if (market.sKey === 'bear_deep') {
            // Tiefer Bär: Basis-Kürzung steigt mit ATH-Abstand,
            // wird aber bei "Vermögen ausreichend" skaliert.
            const reductionFactor = wealthFactor;
            const basisKuerzung = 50 + Math.max(0, market.abstandVomAthProzent - 20);
            roheKuerzungProzent = basisKuerzung * reductionFactor;

            if (reductionFactor === 0) {
                kuerzungQuelle = 'Vermögen ausreichend';
                addDecision(
                    'Vermögensbasierte Anpassung',
                    'Keine Reduktion nötig – Entnahmequote unter dem Safe-Wert.',
                    'active',
                    'info'
                );
            } else if (reductionFactor < 1) {
                kuerzungQuelle = 'Tiefer Bär (vermögensadj.)';
                addDecision(
                    'Vermögensbasierte Anpassung',
                    `Reduktion auf ${(reductionFactor * 100).toFixed(0)}% skaliert wegen niedriger Entnahmequote.`,
                    'active',
                    'info'
                );
            } else {
                kuerzungQuelle = 'Tiefer Bär';
            }
        }

        const roheFlexRate = 100 - roheKuerzungProzent;
        const prevFlexRate = state.flexRate ?? 100;
        const alphaEff = FLEX_RATE_SMOOTHING_ALPHA + (1 - wealthFactor) * (1 - FLEX_RATE_SMOOTHING_ALPHA);
        let geglätteteFlexRate = alphaEff * roheFlexRate +
            (1 - alphaEff) * prevFlexRate;

        // Veränderungsraten begrenzen.
        const delta = geglätteteFlexRate - prevFlexRate;
        const regime = CONFIG.TEXTS.REGIME_MAP[market.sKey];
        const baseMaxUp = (regime === 'peak' || regime === 'hot_neutral' || regime === 'recovery_in_bear')
            ? RATE_CHANGE_AGILE_UP_PP
            : RATE_CHANGE_MAX_UP_PP;
        const baseMaxDown = (market.sKey === 'bear_deep')
            ? RATE_CHANGE_MAX_DOWN_IN_BEAR_PP
            : RATE_CHANGE_MAX_DOWN_PP;
        const maxUp = baseMaxUp;
        const relaxCap = Number.isFinite(RATE_CHANGE_RELAX_MAX_DOWN_PP)
            ? RATE_CHANGE_RELAX_MAX_DOWN_PP
            : 20;
        const relaxScale = 1 - wealthFactor;
        const relax = relaxScale * relaxScale;
        const MAX_DOWN = baseMaxDown + (relax * (relaxCap - baseMaxDown));

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

        const flexShare = this._calcFlexShare(p.inflatedBedarf);
        const curveResult = this._applyFlexShareCurve(geglätteteFlexRate, p.inflatedBedarf, addDecision, wealthFactor);
        if (curveResult.applied) {
            geglätteteFlexRate = curveResult.rate;
            if (['Profil', 'Glättung (Anstieg)', 'Glättung (Abfall)'].includes(kuerzungQuelle)) {
                kuerzungQuelle = 'Flex-Anteil (S-Kurve)';
            }
        }

        // Harte Caps: tiefer Bär + Runway-Deckung
        const hardCaps = CONFIG.SPENDING_MODEL?.FLEX_RATE_HARD_CAPS;
        const shareRelief = Math.max(0, hardCaps?.FLEX_SHARE_RELIEF_MAX_PP ?? 0);
        const relief = shareRelief * (1 - flexShare);
        if (hardCaps?.BEAR_DEEP_MAX_RATE && market.sKey === 'bear_deep') {
            const baseCap = Math.min(100, hardCaps.BEAR_DEEP_MAX_RATE + relief);
            const cap = Math.min(100, 100 - (wealthFactor * (100 - baseCap)));
            if (geglätteteFlexRate > cap) {
                geglätteteFlexRate = cap;
                kuerzungQuelle = 'Guardrail (Bären-Cap)';
                addDecision(
                    'Guardrail (Bären-Cap)',
                    `Flex-Rate im tiefen Bärenmarkt auf ${geglätteteFlexRate.toFixed(1)}% gekappt (Flex-Anteil ${Math.round(flexShare * 100)}%).`,
                    'active',
                    'guardrail'
                );
            }
        }

        if (hardCaps?.RUNWAY_COVERAGE_CAPS?.length) {
            const targetMonths = p.profil?.minRunwayMonths || p.input?.runwayMinMonths || 0;
            if (targetMonths > 0) {
                const coverage = p.runwayMonate / targetMonths;
                const rules = hardCaps.RUNWAY_COVERAGE_CAPS
                    .slice()
                    .sort((a, b) => a.maxCoverage - b.maxCoverage);
                const match = rules.find(r => coverage < r.maxCoverage);
                const baseCap = match ? Math.min(100, match.maxRate + relief) : null;
                const cap = baseCap === null ? null : Math.min(100, 100 - (wealthFactor * (100 - baseCap)));
                if (cap !== null && geglätteteFlexRate > cap) {
                    geglätteteFlexRate = cap;
                    kuerzungQuelle = 'Guardrail (Runway-Cap)';
                    addDecision(
                        'Guardrail (Runway-Cap)',
                        `Runway-Deckung ${(coverage * 100).toFixed(0)}% -> Flex-Rate auf ${geglätteteFlexRate.toFixed(1)}% gekappt (Flex-Anteil ${Math.round(flexShare * 100)}%).`,
                        'active',
                        'guardrail'
                    );
                }
            }
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
            let basisCurb = CONFIG.RECOVERY_GUARDRAILS.getCurb(gap);
            if (runwayMonate < 30) basisCurb = Math.max(basisCurb, 20);

            const wealthReduction = this._calculateWealthAdjustedReductionFactor(params);
            const reductionFactor = wealthReduction.factor;
            if (state.keyParams && Number.isFinite(reductionFactor)) {
                state.keyParams.wealthReductionFactor = reductionFactor;
            }
            if (state.keyParams && Number.isFinite(wealthReduction.entnahmequoteUsed)) {
                state.keyParams.entnahmequoteUsed = wealthReduction.entnahmequoteUsed;
            }

            const curb = basisCurb * reductionFactor;
            const maxFlexRate = 100 - curb;

            if (reductionFactor > 0 && geglätteteFlexRate > maxFlexRate) {
                geglätteteFlexRate = maxFlexRate;
                kuerzungQuelle = reductionFactor < 1
                    ? 'Guardrail (vermögensadj.)'
                    : 'Guardrail (Vorsicht)';
                addDecision(
                    kuerzungQuelle,
                    `Recovery-Cap: Flex-Rate auf ${maxFlexRate.toFixed(1)}% gekappt.`,
                    'active',
                    'guardrail'
                );
                cautiousRuleApplied = true;
            } else if (reductionFactor === 0) {
                addDecision(
                    'Vermögensbasierte Anpassung',
                    'Recovery-Cap entfällt – Entnahmequote unter dem Safe-Wert.',
                    'active',
                    'info'
                );
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
        const wealthFactor = Number.isFinite(state.keyParams?.wealthReductionFactor)
            ? Math.min(1, Math.max(0, state.keyParams.wealthReductionFactor))
            : 1;
        const minBudgetWithWealth = aktuellesGesamtbudget + (angepasstesMinBudget - aktuellesGesamtbudget) * wealthFactor;
        const noNewLowerYearlyCloses = input.endeVJ > Math.min(input.endeVJ_1, input.endeVJ_2);
        const budgetFloorErlaubt = !['bear_deep', 'recovery_in_bear'].includes(market.sKey) ||
            ((market.abstandVomAthProzent || 0) <= 10 && noNewLowerYearlyCloses &&
                runwayMonate >= Math.max(30, profil.minRunwayMonths + 6));

        if (budgetFloorErlaubt) {
            diagnostics.budgetFloor = {
                rule: 'min',
                type: 'currency',
                threshold: minBudgetWithWealth,
                value: aktuellesGesamtbudget
            };
        }

        if (budgetFloorErlaubt && !cautiousRuleApplied && aktuellesGesamtbudget + 1 < minBudgetWithWealth) {
            const benötigteJahresentnahme = Math.max(0, minBudgetWithWealth - renteJahr);
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
