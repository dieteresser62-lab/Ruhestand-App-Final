/**
 * Module: Engine Core
 * Purpose: Orchestrates the entire calculation logic of the engine.
 *          Coordinates InputValidator, MarketAnalyzer, SpendingPlanner, and TransactionEngine.
 * Usage: The brain of the simulation, called via EngineAPI.
 * Dependencies: config.mjs, errors.mjs, validators/InputValidator.mjs, analyzers/MarketAnalyzer.mjs, planners/SpendingPlanner.mjs, transactions/TransactionEngine.mjs
 */
/**
 * ===================================================================
 * ENGINE CORE MODULE
 * ===================================================================
 * Orchestriert alle Module und stellt die EngineAPI bereit
 * ===================================================================
 */

import { ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG } from './config.mjs';
import { AppError, ValidationError } from './errors.mjs';
import InputValidator from './validators/InputValidator.mjs';
import MarketAnalyzer from './analyzers/MarketAnalyzer.mjs';
import SpendingPlanner from './planners/SpendingPlanner.mjs';
import TransactionEngine from './transactions/TransactionEngine.mjs';
import { settleTaxYear } from './tax-settlement.mjs';

const DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS = new Set(['mean', 'survival_quantile']);
const VPW_SAFETY_STAGE_LABELS = {
    0: 'normal',
    1: 'gogo_off',
    2: 'static_flex'
};

function _coalesceCapeRatio(input) {
    if (Number.isFinite(input?.capeRatio) && input.capeRatio > 0) {
        return input.capeRatio;
    }
    if (Number.isFinite(input?.marketCapeRatio) && input.marketCapeRatio > 0) {
        return input.marketCapeRatio;
    }
    return undefined;
}

function _normalizeEngineInput(rawInput) {
    const input = { ...(rawInput || {}) };
    const capeRatio = _coalesceCapeRatio(input);
    if (capeRatio !== undefined) {
        input.capeRatio = capeRatio;
    }

    // Dynamic-Flex contract defaults (T01). T02 will consume these fields.
    input.dynamicFlex = input.dynamicFlex === true;
    input.horizonMethod = DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS.has(input.horizonMethod)
        ? input.horizonMethod
        : 'survival_quantile';
    if (!Number.isFinite(input.survivalQuantile)) {
        input.survivalQuantile = 0.85;
    }
    input.goGoActive = input.goGoActive === true;
    if (!Number.isFinite(input.goGoMultiplier)) {
        input.goGoMultiplier = 1.0;
    }

    return input;
}

function _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

const _berechneEntnahmeRate = (realeRendite, horizontJahre) => {
    const laufzeitJahre = Math.max(1, Number(horizontJahre) || 1);
    const rendite = Number(realeRendite) || 0;
    if (Math.abs(rendite) < 0.001) {
        return 1 / laufzeitJahre;
    }
    return rendite / (1 - Math.pow(1 + rendite, -laufzeitJahre));
};

function _calculateExpectedRealReturn(params) {
    const cfg = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX;
    const inflRate = Number.isFinite(params?.inflation) ? (params.inflation / 100) : 0.02;
    const equityNominal = Number.isFinite(params?.expectedReturnCape)
        ? params.expectedReturnCape
        : (cfg.FALLBACK_REAL_RETURN + inflRate);
    const eqPct = Number.isFinite(params?.targetEq) ? (params.targetEq / 100) : 0.60;
    const goldPctRaw = (params?.goldAktiv && Number.isFinite(params?.goldZielProzent))
        ? (params.goldZielProzent / 100)
        : 0;
    const goldPct = _clamp(goldPctRaw, 0, 1);
    const safePct = Math.max(0, 1 - eqPct - goldPct);
    const rawReal = (eqPct * (equityNominal - inflRate)) +
        (goldPct * cfg.GOLD_REAL_RETURN) +
        (safePct * cfg.SAFE_ASSET_REAL_RETURN);
    const clampedReal = _clamp(rawReal, cfg.MIN_REAL_RETURN, cfg.MAX_REAL_RETURN);
    const prior = Number.isFinite(params?.lastExpectedRealReturn)
        ? params.lastExpectedRealReturn
        // Erstjahr: kein Vorwert vorhanden -> direkte Uebernahme des geclampten Werts.
        : clampedReal;
    const alpha = _clamp(cfg.EXPECTED_RETURN_SMOOTHING_ALPHA, 0, 1);
    return prior + alpha * (clampedReal - prior);
}

function _sanitizeSafetyStage(value) {
    const stage = Number.isFinite(value) ? Math.round(value) : 0;
    const maxStage = Number(CONFIG.SPENDING_MODEL?.DYNAMIC_FLEX_SAFETY?.MAX_STAGE) || 2;
    return _clamp(stage, 0, maxStage);
}

function _loadVpwSafetyState(lastState) {
    return {
        stage: _sanitizeSafetyStage(lastState?.vpwSafetyStage),
        riskStreak: Math.max(0, Number(lastState?.vpwSafetyRiskStreak) || 0),
        stableStreak: Math.max(0, Number(lastState?.vpwSafetyStableStreak) || 0),
        reentryRemaining: Math.max(0, Number(lastState?.vpwSafetyReentryRemaining) || 0)
    };
}

function _deriveEffectiveDynamicFlexSettings(input, safetyState) {
    const requestedDynamicFlex = input.dynamicFlex === true;
    const requestedGoGo = input.goGoActive === true;
    const requestedGoGoMultiplier = Number.isFinite(input.goGoMultiplier) ? input.goGoMultiplier : 1.0;
    const stage = _sanitizeSafetyStage(safetyState?.stage);
    const safetyEnabled = CONFIG.SPENDING_MODEL?.DYNAMIC_FLEX_SAFETY?.ENABLED === true;

    const effective = {
        stage,
        stageLabel: VPW_SAFETY_STAGE_LABELS[stage] || VPW_SAFETY_STAGE_LABELS[0],
        requestedDynamicFlex,
        requestedGoGo,
        requestedGoGoMultiplier,
        effectiveDynamicFlex: requestedDynamicFlex,
        effectiveGoGo: requestedGoGo,
        effectiveGoGoMultiplier: requestedGoGo ? requestedGoGoMultiplier : 1.0,
        goGoSuppressed: false,
        dynamicFlexSuppressed: false,
        stageReason: null
    };

    if (!safetyEnabled || !requestedDynamicFlex) {
        return effective;
    }

    if (stage >= 1 && requestedGoGo) {
        effective.effectiveGoGo = false;
        effective.effectiveGoGoMultiplier = 1.0;
        effective.goGoSuppressed = true;
        effective.stageReason = 'safety_stage_1';
    }

    if (stage >= 2) {
        effective.effectiveDynamicFlex = false;
        effective.effectiveGoGo = false;
        effective.effectiveGoGoMultiplier = 1.0;
        effective.dynamicFlexSuppressed = true;
        effective.goGoSuppressed = requestedGoGo;
        effective.stageReason = 'safety_stage_2';
    }

    return effective;
}

function _buildSafetySignals(params) {
    const {
        alarmActive,
        entnahmequoteDepot,
        realerDepotDrawdown,
        runwayMonate,
        minRunwayMonths,
        kuerzungProzent
    } = params;
    const cfg = CONFIG.SPENDING_MODEL?.DYNAMIC_FLEX_SAFETY || {};
    const hasRunwayCrisis = Number.isFinite(runwayMonate) && Number.isFinite(minRunwayMonths) && runwayMonate < minRunwayMonths;
    const hasCriticalStress = alarmActive || hasRunwayCrisis;

    let score = 0;
    if (alarmActive) score += 2;
    if (Number.isFinite(entnahmequoteDepot) && entnahmequoteDepot >= CONFIG.THRESHOLDS.CAUTION.withdrawalRate) score += 1;
    if (Number.isFinite(realerDepotDrawdown) && realerDepotDrawdown >= CONFIG.THRESHOLDS.ALARM.realDrawdown) score += 1;
    if (hasRunwayCrisis) score += 1;
    if (Number.isFinite(kuerzungProzent) && kuerzungProzent >= (Number(cfg.HARD_CUT_PCT) || 35)) score += 1;

    const badThreshold = Number(cfg.BAD_SCORE_THRESHOLD) || 2;
    const severeThreshold = Number(cfg.SEVERE_SCORE_THRESHOLD) || 4;
    const isBad = score >= badThreshold;
    const isSevere = score >= severeThreshold || (alarmActive && hasRunwayCrisis);

    const runwayHeadroom = Number(cfg.RUNWAY_HEADROOM_MONTHS) || 6;
    const goodWithdrawal = Number(cfg.GOOD_WITHDRAWAL_RATE) || 0.04;
    const goodDrawdown = Number(cfg.GOOD_DRAWDOWN) || 0.15;
    const goodCut = Number(cfg.GOOD_CUT_PCT) || 15;
    const isGood = !alarmActive &&
        Number.isFinite(entnahmequoteDepot) && entnahmequoteDepot <= goodWithdrawal &&
        Number.isFinite(realerDepotDrawdown) && realerDepotDrawdown <= goodDrawdown &&
        Number.isFinite(runwayMonate) && Number.isFinite(minRunwayMonths) && runwayMonate >= (minRunwayMonths + runwayHeadroom) &&
        Number.isFinite(kuerzungProzent) && kuerzungProzent <= goodCut;

    return { score, isBad, isSevere, isGood, hasCriticalStress };
}

function _updateVpwSafetyState(args) {
    const cfg = CONFIG.SPENDING_MODEL?.DYNAMIC_FLEX_SAFETY || {};
    const prev = _loadVpwSafetyState(args?.lastState);
    const requestedDynamicFlex = args?.requestedDynamicFlex === true;
    const safetyEnabled = cfg.ENABLED === true;
    if (!safetyEnabled || !requestedDynamicFlex) {
        return { ...prev, transition: 'none', score: 0 };
    }

    const signals = _buildSafetySignals(args?.signals || {});
    let stage = prev.stage;
    let riskStreak = prev.riskStreak;
    let stableStreak = prev.stableStreak;
    let transition = 'none';

    if (signals.isBad) {
        riskStreak += 1;
        stableStreak = 0;
    } else if (signals.isGood) {
        stableStreak += 1;
        riskStreak = 0;
    } else {
        riskStreak = 0;
        stableStreak = 0;
    }

    const escalateStreak = Math.max(1, Number(cfg.ESCALATE_STREAK_YEARS) || 2);
    const deescalateStreak = Math.max(1, Number(cfg.DEESCALATE_STREAK_YEARS) || 3);
    const maxStage = Math.max(0, Number(cfg.MAX_STAGE) || 2);
    const stage2NeedsCriticalStress = cfg.STAGE2_REQUIRE_CRITICAL_STRESS !== false;

    if (signals.isSevere && stage < maxStage) {
        const wantsStage2 = stage === 1;
        if (!wantsStage2 || !stage2NeedsCriticalStress || signals.hasCriticalStress) {
            stage += 1;
            riskStreak = 0;
            stableStreak = 0;
            transition = 'up';
        }
    } else if (riskStreak >= escalateStreak && stage < maxStage) {
        const wantsStage2 = stage === 1;
        if (!wantsStage2 || !stage2NeedsCriticalStress || signals.hasCriticalStress) {
            stage += 1;
            riskStreak = 0;
            stableStreak = 0;
            transition = 'up';
        }
    } else if (stableStreak >= deescalateStreak && stage > 0) {
        stage -= 1;
        riskStreak = 0;
        stableStreak = 0;
        transition = 'down';
    }

    return {
        stage: _sanitizeSafetyStage(stage),
        riskStreak,
        stableStreak,
        transition,
        score: signals.score
    };
}

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
    const normalizedInput = _normalizeEngineInput(input);
    const taxStatePrev = {
        lossCarry: Math.max(0, Number(lastState?.taxState?.lossCarry) || 0)
    };
    const vpwSafetyState = _loadVpwSafetyState(lastState);
    const vpwEffectiveSettings = _deriveEffectiveDynamicFlexSettings(normalizedInput, vpwSafetyState);
    // 1. Validierung der Eingabedaten
    // Prüft alle Eingaben auf Plausibilität und Vollständigkeit
    // Harte Eingabevalidierung vor jeder Modellrechnung (fail-fast).
    const validationResult = InputValidator.validate(normalizedInput);
    if (!validationResult.valid) {
        // DEBUG: Log validation errors
        console.error('[VALIDATION ERROR] Invalid input fields:', validationResult.errors);
        return { error: new ValidationError(validationResult.errors) };
    }

    // 2. Grundwerte berechnen
    // Profil-Konfiguration laden (Runway-Ziele, Allokationsstrategie)
    // Profil-Konfiguration laden (Runway-Ziele, Allokationsstrategie)
    // Risikoprofil steuert Runway-Ziele, Guardrails und Entnahme-Logik.
    let profil = CONFIG.PROFIL_MAP[normalizedInput.risikoprofil];
    if (!profil) {
        // Fallback für Tests oder invalide Eingaben
        profil = CONFIG.PROFIL_MAP['sicherheits-dynamisch'];
    }


    // Aktuelle Liquidität = Tagesgeld + Geldmarkt-ETF (oder direkter Override)
    // Liquidität kann direkt überschrieben werden (z. B. Simulator/Tests).
    const aktuelleLiquiditaet = (normalizedInput.aktuelleLiquiditaet !== undefined)
        ? normalizedInput.aktuelleLiquiditaet
        : (normalizedInput.tagesgeld + normalizedInput.geldmarktEtf);

    // Gesamtes Depotvermögen (Aktien alt + neu + optional Gold)
    const depotwertGesamt = normalizedInput.depotwertAlt + normalizedInput.depotwertNeu +
        (normalizedInput.goldAktiv ? normalizedInput.goldWert : 0);

    // Gesamtvermögen = Depot + Liquidität
    const gesamtwert = depotwertGesamt + aktuelleLiquiditaet;

    // 3. Marktanalyse durchführen
    // Bestimmt Marktszenario (Bär, Bulle, Seitwärts, etc.) basierend auf historischen Daten
    const market = MarketAnalyzer.analyzeMarket(normalizedInput);

    // 4. Gold-Floor berechnen (Mindestbestand)
    // Definiert minimalen Gold-Bestand als Prozentsatz des Gesamtvermögens
    const goldFloorAbs = (normalizedInput.goldFloorProzent / 100) * gesamtwert;
    const minGold = normalizedInput.goldAktiv ? goldFloorAbs : 0;

    // 5. Inflationsangepassten Bedarf berechnen
    // Bedarf wird um Renteneinkünfte reduziert (netto)
    const renteJahr = normalizedInput.renteAktiv ? (normalizedInput.renteMonatlich * 12) : 0;
    // Fix: Überschussrente auf den Flex-Bedarf anrechnen
    // Überschussrente reduziert zuerst den Flex-Bedarf (Floor bleibt geschützt).
    const pensionSurplus = Math.max(0, renteJahr - normalizedInput.floorBedarf);

    const inflatedBedarf = {
        floor: Math.max(0, normalizedInput.floorBedarf - renteJahr),  // Grundbedarf (essentiell)
        flex: normalizedInput.flexBedarf                              // Flexibler Bedarf (optional)
    };

    if (pensionSurplus > 0) {
        inflatedBedarf.flex = Math.max(0, inflatedBedarf.flex - pensionSurplus);
    }
    const dynamicFlexCfg = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX;
    const dynamicFlexSafetyCfg = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX_SAFETY || {};
    let vpwExpectedRealReturn = Number.isFinite(lastState?.vpwExpectedRealReturn)
        ? lastState.vpwExpectedRealReturn
        : null;
    let vpwDiagnostics = null;
    if (vpwEffectiveSettings.effectiveDynamicFlex && Number.isFinite(normalizedInput.horizonYears) && normalizedInput.horizonYears > 0) {
        const horizonYears = _clamp(
            normalizedInput.horizonYears,
            dynamicFlexCfg.MIN_HORIZON_YEARS,
            dynamicFlexCfg.MAX_HORIZON_YEARS
        );
        const expectedRealReturn = _calculateExpectedRealReturn({
            expectedReturnCape: market.expectedReturnCape,
            inflation: normalizedInput.inflation,
            targetEq: normalizedInput.targetEq,
            goldAktiv: normalizedInput.goldAktiv,
            goldZielProzent: normalizedInput.goldZielProzent,
            lastExpectedRealReturn: vpwExpectedRealReturn
        });
        vpwExpectedRealReturn = expectedRealReturn;
        const vpwRate = _berechneEntnahmeRate(expectedRealReturn, horizonYears);
        let vpwTotal = gesamtwert * vpwRate;
        const goGoMultiplier = vpwEffectiveSettings.effectiveGoGo
            ? _clamp(normalizedInput.goGoMultiplier, 1.0, dynamicFlexCfg.MAX_GO_GO_MULTIPLIER)
            : 1.0;
        vpwTotal *= goGoMultiplier;

        // VPW setzt den Flex-Anteil neu auf Basis von Netto-Floor (nach Rentenabzug).
        // Die vorherige statische Flex-/Pensions-Reduktion dient nur dem Legacy-Pfad.
        const staticFlexBaseline = Math.max(0, inflatedBedarf.flex);
        const rawDynamicFlex = Math.max(0, vpwTotal - inflatedBedarf.floor);
        const reentryRampYears = Math.max(1, Number(dynamicFlexSafetyCfg.REENTRY_RAMP_YEARS) || 3);
        const reentryRemaining = Math.max(0, Number(vpwSafetyState?.reentryRemaining) || 0);
        let reentryApplied = false;
        let reentryBlendWeight = 1;
        if (vpwEffectiveSettings.stage === 1 && reentryRemaining > 0 && reentryRampYears > 0) {
            const yearsDone = Math.max(0, reentryRampYears - reentryRemaining);
            reentryBlendWeight = _clamp((yearsDone + 1) / reentryRampYears, 0, 1);
            inflatedBedarf.flex = staticFlexBaseline + ((rawDynamicFlex - staticFlexBaseline) * reentryBlendWeight);
            reentryApplied = true;
        } else {
            inflatedBedarf.flex = rawDynamicFlex;
        }
        vpwDiagnostics = {
            enabled: true,
            status: 'active',
            gesamtwert: Math.round(gesamtwert),
            horizonYears,
            horizonMethod: normalizedInput.horizonMethod,
            survivalQuantile: normalizedInput.survivalQuantile,
            goGoActive: vpwEffectiveSettings.effectiveGoGo,
            goGoMultiplier,
            goGoRequested: vpwEffectiveSettings.requestedGoGo,
            goGoSuppressed: vpwEffectiveSettings.goGoSuppressed,
            dynamicFlexRequested: vpwEffectiveSettings.requestedDynamicFlex,
            dynamicFlexSuppressed: vpwEffectiveSettings.dynamicFlexSuppressed,
            safetyStage: vpwEffectiveSettings.stage,
            safetyStageLabel: vpwEffectiveSettings.stageLabel,
            reentryApplied: false,
            reentryBlendWeight: 1,
            reentryRemainingBefore: Math.max(0, Number(vpwSafetyState?.reentryRemaining) || 0),
            capeRatioUsed: Number.isFinite(market?.capeRatio) ? market.capeRatio : null,
            expectedReturnCape: Number.isFinite(market?.expectedReturnCape) ? market.expectedReturnCape : null,
            expectedRealReturn,
            vpwRate,
            vpwTotal,
            dynamicFlex: inflatedBedarf.flex,
            rawDynamicFlex,
            staticFlexBaseline,
            reentryApplied,
            reentryBlendWeight,
            reentryRemainingBefore: reentryRemaining
        };
    }
    if (!vpwEffectiveSettings.effectiveDynamicFlex && vpwEffectiveSettings.stage >= 2 && vpwEffectiveSettings.requestedDynamicFlex) {
        const floorBasedMin = Math.max(0, inflatedBedarf.floor * Math.max(0, Number(dynamicFlexSafetyCfg.STAGE2_MIN_FLEX_OF_FLOOR_RATIO) || 0));
        const prevDynamicFlex = Math.max(0, Number(lastState?.vpwLastDynamicFlex) || 0);
        const prevDynamicBasedMin = Math.max(0, prevDynamicFlex * Math.max(0, Number(dynamicFlexSafetyCfg.STAGE2_MIN_FLEX_OF_PREV_DYNAMIC_RATIO) || 0));
        const stage2MinFlex = Math.max(inflatedBedarf.flex, floorBasedMin, prevDynamicBasedMin);
        inflatedBedarf.flex = stage2MinFlex;
    }
    const neuerBedarf = inflatedBedarf.floor + inflatedBedarf.flex;

    // 6. Runway berechnen (Liquiditäts-Reichweite in Monaten)
    // Wie lange reicht die aktuelle Liquidität bei aktuellem Bedarf?
    // Runway: Wie viele Monate deckt die Liquidität den aktuellen Bedarf?
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
        input: normalizedInput
    });

    // 8. Ziel-Liquidität berechnen
    // Bestimmt die optimale Liquiditätshöhe basierend auf Profil und Marktsituation
    // Im Bärenmarkt: höhere Liquidität (z.B. 60 Monate)
    // Im Bullenmarkt: niedrigere Liquidität (z.B. 36 Monate)
    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(
        profil,
        market,
        inflatedBedarf,
        normalizedInput
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
        input: normalizedInput
    });

    // Diagnose-Einträge von Transaktion hinzufügen
    // Transaktionen können eigene Diagnose-Einträge erzeugen (z.B. Caps, Guardrails)
    if (Array.isArray(action.diagnosisEntries) && action.diagnosisEntries.length) {
        diagnosis.decisionTree.push(...action.diagnosisEntries);
    }
    if (action.transactionDiagnostics) {
        diagnosis.transactionDiagnostics = action.transactionDiagnostics;
    }

    const actionRawAggregate = {
        sumRealizedGainSigned: Number(action?.taxRawAggregate?.sumRealizedGainSigned) || 0,
        sumTaxableAfterTqfSigned: Number(action?.taxRawAggregate?.sumTaxableAfterTqfSigned) || 0
    };
    const taxSettlement = settleTaxYear({
        taxStatePrev,
        rawAggregate: actionRawAggregate,
        sparerPauschbetrag: normalizedInput.sparerPauschbetrag,
        kirchensteuerSatz: normalizedInput.kirchensteuerSatz
    });
    action.taxRawAggregate = actionRawAggregate;
    action.taxSettlement = taxSettlement.details;
    // NOTE: action is passed by reference to the UI payload below.
    // We intentionally override steuer with the final annual settlement tax.
    action.steuer = taxSettlement.taxDue;
    diagnosis.keyParams = diagnosis.keyParams || {};
    diagnosis.keyParams.taxSettlement = taxSettlement.details;

    const safetyUpdate = _updateVpwSafetyState({
        lastState,
        requestedDynamicFlex: vpwEffectiveSettings.requestedDynamicFlex,
        signals: {
            alarmActive: diagnosis?.general?.alarmActive === true,
            entnahmequoteDepot: diagnosis?.keyParams?.entnahmequoteDepot,
            realerDepotDrawdown: diagnosis?.keyParams?.realerDepotDrawdown,
            runwayMonate: reichweiteMonate,
            minRunwayMonths: profil?.minRunwayMonths,
            kuerzungProzent: spendingResult?.kuerzungProzent
        }
    });
    const reentryRampYears = Math.max(1, Number(dynamicFlexSafetyCfg.REENTRY_RAMP_YEARS) || 3);
    const prevReentryRemaining = Math.max(0, Number(vpwSafetyState?.reentryRemaining) || 0);
    let nextReentryRemaining = prevReentryRemaining;
    if (safetyUpdate.transition === 'up' && safetyUpdate.stage >= 2) {
        nextReentryRemaining = 0;
    } else if (safetyUpdate.transition === 'down' && vpwEffectiveSettings.stage === 2 && safetyUpdate.stage === 1) {
        nextReentryRemaining = reentryRampYears;
    } else if (vpwEffectiveSettings.stage === 1 && prevReentryRemaining > 0) {
        nextReentryRemaining = Math.max(0, prevReentryRemaining - 1);
    } else if (safetyUpdate.stage === 0) {
        nextReentryRemaining = 0;
    }
    diagnosis.general = diagnosis.general || {};
    diagnosis.general.dynamicFlexSafetyStage = vpwEffectiveSettings.stage;
    diagnosis.general.dynamicFlexSafetyLabel = vpwEffectiveSettings.stageLabel;
    diagnosis.general.dynamicFlexSafetyScore = safetyUpdate.score;
    diagnosis.general.dynamicFlexSafetyRiskStreak = safetyUpdate.riskStreak;
    diagnosis.general.dynamicFlexSafetyStableStreak = safetyUpdate.stableStreak;
    diagnosis.general.dynamicFlexSafetyTransition = safetyUpdate.transition;
    diagnosis.general.dynamicFlexSafetyReentryRemaining = nextReentryRemaining;
    diagnosis.general.dynamicFlexGoGoSuppressed = vpwEffectiveSettings.goGoSuppressed;
    diagnosis.general.dynamicFlexSuppressed = vpwEffectiveSettings.dynamicFlexSuppressed;
    if (safetyUpdate.transition === 'up') {
        diagnosis.decisionTree.push({
            step: 'Dynamic-Flex Safety',
            impact: `Sicherheitsstufe erhöht (${vpwEffectiveSettings.stageLabel} → ${VPW_SAFETY_STAGE_LABELS[safetyUpdate.stage]}).`,
            status: 'active',
            severity: 'guardrail'
        });
    } else if (safetyUpdate.transition === 'down') {
        diagnosis.decisionTree.push({
            step: 'Dynamic-Flex Safety',
            impact: `Sicherheitsstufe reduziert (${vpwEffectiveSettings.stageLabel} → ${VPW_SAFETY_STAGE_LABELS[safetyUpdate.stage]}).`,
            status: 'active',
            severity: 'info'
        });
    } else if (vpwEffectiveSettings.stage > 0 && vpwEffectiveSettings.requestedDynamicFlex) {
        diagnosis.decisionTree.push({
            step: 'Dynamic-Flex Safety',
            impact: `Sicherheitsstufe aktiv (${vpwEffectiveSettings.stageLabel}).`,
            status: 'active',
            severity: 'guardrail'
        });
    }
    if (vpwDiagnostics?.reentryApplied) {
        diagnosis.decisionTree.push({
            step: 'Dynamic-Flex Re-Entry',
            impact: `Stufe-2-Rückkehr wird gedämpft (Blend ${(vpwDiagnostics.reentryBlendWeight * 100).toFixed(0)}%).`,
            status: 'active',
            severity: 'guardrail'
        });
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
    if (runwayMonths >= normalizedInput.runwayTargetMonths) {
        runwayStatus = 'ok';
    } else if (runwayMonths >= normalizedInput.runwayMinMonths) {
        runwayStatus = 'warn';
    }

    // Diagnose-Objekt mit finalem Runway-Status und Zielwert anreichern
    diagnosis.general = diagnosis.general || {};
    diagnosis.general.runwayStatus = runwayStatus;
    diagnosis.general.runwayMonate = runwayMonths;
    diagnosis.general.deckungVorher = deckungVorher;
    diagnosis.general.deckungNachher = deckungNachher;
    const validInputRunwayTarget = (typeof normalizedInput.runwayTargetMonths === 'number' && isFinite(normalizedInput.runwayTargetMonths) && normalizedInput.runwayTargetMonths > 0)
        ? normalizedInput.runwayTargetMonths
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

    const resultForUI = {
        depotwertGesamt,
        neuerBedarf,
        minGold,
        zielLiquiditaet, // Explicitly check this!
        market,
        spending: spendingResult,
        action,
        liquiditaet: {
            deckungVorher,
            deckungNachher
        },
        runway: { months: runwayMonths, status: runwayStatus },
        // Stable schema for Dynamic-Flex contract (T01/T02).
        vpw: vpwDiagnostics || {
            enabled: vpwEffectiveSettings.effectiveDynamicFlex,
            gesamtwert: Math.round(gesamtwert),
            horizonYears: Number.isFinite(normalizedInput.horizonYears) ? normalizedInput.horizonYears : null,
            horizonMethod: normalizedInput.horizonMethod,
            survivalQuantile: Number.isFinite(normalizedInput.survivalQuantile) ? normalizedInput.survivalQuantile : null,
            goGoActive: vpwEffectiveSettings.effectiveGoGo,
            goGoMultiplier: vpwEffectiveSettings.effectiveGoGo
                ? (Number.isFinite(normalizedInput.goGoMultiplier) ? normalizedInput.goGoMultiplier : 1.0)
                : 1.0,
            goGoRequested: vpwEffectiveSettings.requestedGoGo,
            goGoSuppressed: vpwEffectiveSettings.goGoSuppressed,
            dynamicFlexRequested: vpwEffectiveSettings.requestedDynamicFlex,
            dynamicFlexSuppressed: vpwEffectiveSettings.dynamicFlexSuppressed,
            safetyStage: vpwEffectiveSettings.stage,
            safetyStageLabel: vpwEffectiveSettings.stageLabel,
            capeRatioUsed: Number.isFinite(market?.capeRatio) ? market.capeRatio : null,
            expectedReturnCape: Number.isFinite(market?.expectedReturnCape) ? market.expectedReturnCape : null,
            status: vpwEffectiveSettings.requestedDynamicFlex
                ? (vpwEffectiveSettings.effectiveDynamicFlex ? 'contract_ready' : 'safety_static_flex')
                : 'disabled'
        }
    };

    if (newState && typeof newState === 'object') {
        newState.vpwSafetyStage = safetyUpdate.stage;
        newState.vpwSafetyRiskStreak = safetyUpdate.riskStreak;
        newState.vpwSafetyStableStreak = safetyUpdate.stableStreak;
        newState.vpwSafetyReentryRemaining = nextReentryRemaining;
        if (vpwDiagnostics && Number.isFinite(vpwDiagnostics.rawDynamicFlex)) {
            newState.vpwLastDynamicFlex = vpwDiagnostics.rawDynamicFlex;
        }
        if (Number.isFinite(vpwExpectedRealReturn)) {
            newState.vpwExpectedRealReturn = vpwExpectedRealReturn;
        } else {
            delete newState.vpwExpectedRealReturn;
        }
        newState.taxState = taxSettlement.taxStateNext;
    }

    return {
        input: normalizedInput,
        newState,
        diagnosis,
        ui: resultForUI
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
    calculateTargetLiquidity: function (profil, market, inflatedBedarf) {
        return TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf);
    },

    /**
     * Simuliert ein einzelnes Jahr
     */
    simulateSingleYear: function (input, lastState) {
        try {
            return _internal_calculateModel(input, lastState);
        } catch (e) {
            console.error('[EngineAPI] Critical Error in simulateSingleYear:', e);
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

// Exporte
export { EngineAPI, _internal_calculateModel };
export default { EngineAPI, _internal_calculateModel };
