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
import { AppError, FinancialCalculationError, ValidationError } from './errors.mjs';
import InputValidator from './validators/InputValidator.mjs';
import MarketAnalyzer from './analyzers/MarketAnalyzer.mjs';
import SpendingPlanner from './planners/SpendingPlanner.mjs';
import TransactionEngine from './transactions/TransactionEngine.mjs';
import { settleTaxYear } from './tax-settlement.mjs';
import {
    finalizeThreeBucketAction,
    sumBondBucketValuation
} from './transactions/three-bucket-logic.mjs';
import { deriveVpwExpectedRealReturn } from './planners/vpw-return-policy.mjs';
import { STRATEGY_OPTIONS } from '../types/strategy-options.js';
import {
    deriveLiquidityRunwayPolicy,
    resolveLiquidityRunwayYears
} from '../types/liquidity-runway-contract.js';
import { resolvePlannedAnnualWithdrawal } from '../types/planned-withdrawal-contract.js';
import {
    PLANNED_ACTION_FLOW_EPSILON,
    resolvePlannedAction
} from '../types/planned-action-contract.js';

const DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS = new Set(['mean', 'survival_quantile']);
const LEGACY_STANDARD_MODES = new Set(['dynamic_flex', 'vpw', 'guardrails', 'fixed_real', 'none']);
const ACTION_SOURCE_KINDS = new Set([
    'liquiditaet',
    'aktien_alt',
    'aktien_neu',
    'anleihe',
    'gold'
]);
const ACTION_USE_KEYS = new Set(['liquiditaet', 'gold', 'aktien', 'bonds']);
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
    const liquidityRunwayResolution = resolveLiquidityRunwayYears(rawInput || {});

    const normalizeNum = (val, fallback = 0) => {
        const n = Number(val);
        return Number.isFinite(n) ? n : fallback;
    };

    input.depotwertAlt = normalizeNum(input.depotwertAlt, 0);
    input.depotwertNeu = normalizeNum(input.depotwertNeu, 0);
    input.goldWert = normalizeNum(input.goldWert, 0);
    input.tagesgeld = normalizeNum(input.tagesgeld, 0);
    input.geldmarktEtf = normalizeNum(input.geldmarktEtf, 0);
    input.costBasisAlt = normalizeNum(input.costBasisAlt, 0);
    input.costBasisNeu = normalizeNum(input.costBasisNeu, 0);
    input.goldCost = normalizeNum(input.goldCost, 0);
    input.sparerPauschbetrag = normalizeNum(input.sparerPauschbetrag, 0);
    input.kirchensteuerSatz = normalizeNum(input.kirchensteuerSatz, 0);

    // Optional simulator/test override: absent values retain the legacy
    // tagesgeld + geldmarktEtf fallback; explicit values stay raw for validation.
    if (input.aktuelleLiquiditaet == null) {
        delete input.aktuelleLiquiditaet;
    }

    input.aktuellesAlter = normalizeNum(input.aktuellesAlter, 65);
    input.startAlter = normalizeNum(input.startAlter, input.aktuellesAlter);
    input.inflation = normalizeNum(input.inflation, 0);
    input.liquidityRunwayYears = liquidityRunwayResolution.years;
    delete input.runwayMinMonths;
    delete input.runwayTargetMonths;
    delete input.targetEq;
    input.rebalancingBand = input.rebalancingBand == null
        ? 35
        : Number(input.rebalancingBand);
    delete input.rebalBand;
    input.maxSkimPctOfEq = normalizeNum(input.maxSkimPctOfEq, 0);
    input.maxBearRefillPctOfEq = normalizeNum(input.maxBearRefillPctOfEq, 0);

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
    ['longevityQuantileShift', 'longevityRelativePct', 'longevityBufferYears'].forEach(field => {
        if (input[field] != null) {
            const normalized = Number(input[field]);
            input[field] = Number.isFinite(normalized) ? normalized : input[field];
        }
    });
    input.goGoActive = input.goGoActive === true;
    if (!Number.isFinite(input.goGoMultiplier)) {
        input.goGoMultiplier = 1.0;
    }
    const minimumFlexAnnualRaw = input.minimumFlexAnnual;
    if (minimumFlexAnnualRaw == null || minimumFlexAnnualRaw === '') {
        input.minimumFlexAnnual = 0;
    } else {
        let minimumFlexAnnual = Number.NaN;
        try {
            minimumFlexAnnual = Number(minimumFlexAnnualRaw);
        } catch {
            // Preserve the invalid value so InputValidator can reject it with field context.
        }
        input.minimumFlexAnnual = Number.isFinite(minimumFlexAnnual)
            ? minimumFlexAnnual
            : minimumFlexAnnualRaw;
    }

    const decumulationRaw = (input.decumulation && typeof input.decumulation === 'object')
        ? input.decumulation
        : {};
    const modeRaw = String(decumulationRaw.mode || '').trim().toLowerCase();
    const mode = (modeRaw === STRATEGY_OPTIONS.THREE_BUCKET_JILGE)
        ? STRATEGY_OPTIONS.THREE_BUCKET_JILGE
        : ((modeRaw === STRATEGY_OPTIONS.STANDARD || LEGACY_STANDARD_MODES.has(modeRaw) || modeRaw === '')
            ? STRATEGY_OPTIONS.STANDARD
            : STRATEGY_OPTIONS.STANDARD);
    let drawdownTrigger = Number(decumulationRaw.drawdownTrigger);
    if (!Number.isFinite(drawdownTrigger)) {
        drawdownTrigger = Number(CONFIG.SPENDING_MODEL?.THREE_BUCKET?.DEFAULT_DRAWDOWN_TRIGGER);
    }
    if (Number.isFinite(drawdownTrigger) && drawdownTrigger > 0) {
        drawdownTrigger = -drawdownTrigger;
    }
    const bondTargetFactor = Number(decumulationRaw.bondTargetFactor);
    const bondRefillThreshold = Number(decumulationRaw.bondRefillThreshold);
    input.decumulation = {
        mode,
        bondTargetFactor: Number.isFinite(bondTargetFactor)
            ? Math.max(0, bondTargetFactor)
            : Number(CONFIG.SPENDING_MODEL?.THREE_BUCKET?.DEFAULT_BOND_TARGET_FACTOR),
        drawdownTrigger: Number.isFinite(drawdownTrigger)
            ? drawdownTrigger
            : Number(CONFIG.SPENDING_MODEL?.THREE_BUCKET?.DEFAULT_DRAWDOWN_TRIGGER),
        bondRefillThreshold: Number.isFinite(bondRefillThreshold)
            ? Math.max(0, bondRefillThreshold)
            : CONFIG.SPENDING_MODEL?.THREE_BUCKET?.DEFAULT_BOND_REFILL_THRESHOLD
    };

    return input;
}

function _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function _allocateFinalTaxToActionSources(sources, finalTax) {
    const sourceList = Array.isArray(sources) ? sources : [];
    const assetRows = sourceList
        .map((source, index) => ({ source, index }))
        .filter(({ source }) => source?.kind && source.kind !== 'liquiditaet');
    const parsedFinalTax = Number(finalTax);
    if (!Number.isFinite(parsedFinalTax) || parsedFinalTax < -0.01) {
        throw new FinancialCalculationError(
            'Die finale Steuer der Transaktion ist ungueltig. Bitte pruefen Sie die Steuerparameter und starten Sie die Berechnung erneut.',
            { contract: 'final_source_tax', finalTax }
        );
    }
    const targetTax = Math.max(0, parsedFinalTax);
    if (!assetRows.length) {
        if (targetTax > 0.01) {
            throw new FinancialCalculationError(
                'Die finale Steuer kann keiner Verkaufsquelle zugeordnet werden. Bitte pruefen Sie die Depot-Tranchen und starten Sie die Berechnung erneut.',
                { contract: 'final_source_tax', targetTax }
            );
        }
        return sourceList.map(source => ({ ...source }));
    }

    const positiveTaxable = assetRows.map(({ source }) => (
        Math.max(0, Number(source?.taxableAfterTqfSigned) || 0)
    ));
    const taxableTotal = positiveTaxable.reduce((total, value) => total + value, 0);
    const grossCaps = assetRows.map(({ source }) => Math.max(0, Number(source?.brutto) || 0));
    const grossTotal = grossCaps.reduce((total, value) => total + value, 0);
    const weights = taxableTotal > 0
        ? positiveTaxable
        : grossCaps;
    const weightTotal = weights.reduce((total, value) => total + value, 0);

    if (targetTax > 0.000000001 && weightTotal <= 0.000000001) {
        throw new FinancialCalculationError(
            'Eine positive finale Steuer steht keiner positiven Brutto-Verkaufsquelle gegenueber. Bitte pruefen Sie die Depot-Tranchen und Steuerdaten.',
            { contract: 'final_source_tax', targetTax, grossTotal, taxableTotal }
        );
    }
    if (targetTax > grossTotal + 0.01) {
        throw new FinancialCalculationError(
            'Die finale Steuer uebersteigt den gesamten Bruttoverkauf. Bitte pruefen Sie die Steuerparameter und Verkaufsquellen.',
            { contract: 'final_source_tax', targetTax, grossTotal }
        );
    }

    const allocations = new Array(assetRows.length).fill(0);
    let taxRemaining = targetTax;
    let active = assetRows
        .map((_, index) => index)
        .filter(index => grossCaps[index] > 0.000000001);

    while (taxRemaining > 0.000000001 && active.length) {
        const activeWeightTotal = active.reduce((total, index) => total + weights[index], 0);
        const useGrossCapacityWeights = activeWeightTotal <= 0.000000001;
        const effectiveWeightTotal = active.reduce((total, index) => (
            total + (
                useGrossCapacityWeights
                    ? Math.max(0, grossCaps[index] - allocations[index])
                    : weights[index]
            )
        ), 0);
        if (effectiveWeightTotal <= 0.000000001) break;

        const remainingBeforeAllocation = taxRemaining;
        const saturated = active.filter(index => {
            const capacity = Math.max(0, grossCaps[index] - allocations[index]);
            const weight = useGrossCapacityWeights
                ? capacity
                : weights[index];
            const proportionalTax = remainingBeforeAllocation * (weight / effectiveWeightTotal);
            return proportionalTax > capacity + 0.000000001;
        });

        if (saturated.length) {
            saturated.forEach(index => {
                const capacity = Math.max(0, grossCaps[index] - allocations[index]);
                allocations[index] += capacity;
                taxRemaining -= capacity;
            });
            const saturatedSet = new Set(saturated);
            active = active.filter(index => !saturatedSet.has(index));
            continue;
        }

        active.forEach(index => {
            const capacity = Math.max(0, grossCaps[index] - allocations[index]);
            const weight = useGrossCapacityWeights
                ? capacity
                : weights[index];
            allocations[index] += remainingBeforeAllocation * (weight / effectiveWeightTotal);
        });
        taxRemaining = 0;
    }

    if (taxRemaining > 0.01) {
        throw new FinancialCalculationError(
            'Die finale Steuer kann nicht ohne negative Nettoquelle verteilt werden. Bitte pruefen Sie die Steuerparameter und Depot-Tranchen.',
            { contract: 'final_source_tax', targetTax, taxRemaining, grossTotal }
        );
    }

    const allocatedByIndex = new Map();
    assetRows.forEach(({ index }, assetIndex) => {
        allocatedByIndex.set(index, allocations[assetIndex]);
    });

    const allocatedTotal = allocations.reduce((total, value) => total + value, 0);
    if (Math.abs(allocatedTotal - targetTax) > 0.01) {
        throw new FinancialCalculationError(
            'Die verteilte Quellensteuer stimmt nicht mit der finalen Steuer ueberein. Bitte pruefen Sie die Steuerparameter und Depot-Tranchen.',
            { contract: 'final_source_tax', targetTax, allocatedTotal }
        );
    }

    return sourceList.map((source, index) => {
        if (!allocatedByIndex.has(index)) return { ...source };
        const allocatedTax = allocatedByIndex.get(index);
        const gross = Math.max(0, Number(source?.brutto) || 0);
        return {
            ...source,
            steuerPlan: Number(source?.steuer) || 0,
            steuer: allocatedTax,
            netto: Math.max(0, gross - allocatedTax)
        };
    });
}

function _assertFinalActionReconciliation(action) {
    const sources = action.quellen;
    const invalidAssetSource = sources.find(source => (
        source.kind !== 'liquiditaet'
        && (
            typeof source.brutto !== 'number'
            || !Number.isFinite(source.brutto)
            || source.brutto < 0
            || typeof source.steuer !== 'number'
            || !Number.isFinite(source.steuer)
            || typeof source.netto !== 'number'
            || !Number.isFinite(source.netto)
            || source.netto < -0.01
            || source.steuer < -0.01
            || source.steuer > source.brutto + 0.01
        )
    ));
    if (invalidAssetSource) {
        throw new FinancialCalculationError(
            'Eine finale Verkaufsquelle besitzt ungueltige Brutto-, Steuer- oder Nettowerte. Bitte pruefen Sie die Depot-Tranchen und Steuerparameter.',
            { contract: 'final_action_reconciliation', source: invalidAssetSource }
        );
    }

    const invalidCashSource = sources.find(source => (
        source.kind === 'liquiditaet'
        && (
            typeof source.brutto !== 'number'
            || !Number.isFinite(source.brutto)
            || source.brutto < 0
        )
    ));
    if (invalidCashSource) {
        throw new FinancialCalculationError(
            'Eine finale Liquiditätsquelle besitzt einen ungültigen Bruttowert.',
            { contract: 'planned_liquidity_flow', source: invalidCashSource }
        );
    }

    const assetSourceNet = sources
        .filter(source => source.kind !== 'liquiditaet')
        .reduce((total, source) => total + source.netto, 0);
    const cashSourceGross = sources
        .filter(source => source.kind === 'liquiditaet')
        .reduce((total, source) => total + source.brutto, 0);
    const sourceFundingTotal = assetSourceNet + cashSourceGross;
    const useTotal = Object.values(action?.verwendungen || {})
        .reduce((total, value) => total + value, 0);
    const actionNet = action.nettoErlös;
    if (typeof actionNet !== 'number' || !Number.isFinite(actionNet) || actionNet < 0) {
        throw new FinancialCalculationError(
            'Der Netto-Gesamtbetrag der finalen Transaktion ist ungültig.',
            { contract: 'planned_action_flow', actionNet }
        );
    }
    if (
        action.type === 'NONE'
        && (sourceFundingTotal > 0.01 || useTotal > 0.01 || actionNet > 0.01)
    ) {
        throw new FinancialCalculationError(
            'Eine Nichttransaktions-Aktion darf keine finanziellen Quellen oder Verwendungen enthalten.',
            {
                contract: 'planned_action_flow',
                sourceFundingTotal,
                useTotal,
                actionNet
            }
        );
    }
    if (action.verwendungen.liquiditaet > assetSourceNet + 0.01) {
        throw new FinancialCalculationError(
            'Der geplante Liquiditätszufluss ist nicht durch Netto-Assetverkäufe gedeckt.',
            {
                contract: 'planned_liquidity_flow',
                plannedLiquidityInflow: action.verwendungen.liquiditaet,
                assetSourceNet
            }
        );
    }
    if (
        Math.abs(sourceFundingTotal - useTotal) > 0.01
        || Math.abs(sourceFundingTotal - actionNet) > 0.01
    ) {
        throw new FinancialCalculationError(
            `Die finale Transaktion ist nicht ausgeglichen: Quellen-Finanzierung ${sourceFundingTotal.toFixed(2)} EUR, Verwendungen ${useTotal.toFixed(2)} EUR, Action-Netto ${actionNet.toFixed(2)} EUR. Bitte pruefen Sie die Depot-Tranchen und Transaktionsbudgets.`,
            {
                contract: 'final_action_reconciliation',
                assetSourceNet,
                cashSourceGross,
                sourceFundingTotal,
                useTotal,
                actionNet
            }
        );
    }
}

function _assertPlannedActionContract(action, input, availableLiquidity, phase) {
    const normalizeTqf = value => {
        const normalized = Number(value);
        return Number.isFinite(normalized) ? normalized : 0;
    };
    const plannedActionResolution = resolvePlannedAction({
        action,
        availableLiquidity,
        detailedTranches: input.detailledTranches,
        legacyCapacities: {
            aktien_alt: input.depotwertAlt,
            aktien_neu: input.depotwertNeu,
            gold: input.goldWert
        },
        legacyTaxMetadata: {
            aktien_alt: {
                costBasis: input.costBasisAlt,
                tqf: normalizeTqf(input.tqfAlt),
                taxExempt: input.taxExemptAlt === true
            },
            aktien_neu: {
                costBasis: input.costBasisNeu,
                tqf: normalizeTqf(input.tqfNeu),
                taxExempt: input.taxExemptNeu === true
            },
            gold: {
                costBasis: input.goldCost,
                tqf: 0,
                taxExempt: input.goldSteuerfrei === true
            }
        }
    });
    if (plannedActionResolution.status === 'resolved') return plannedActionResolution;

    const liquidityContractReasons = new Set([
        'cash_source_overbooked',
        'liquidity_inflow_without_asset_source'
    ]);
    const contract = liquidityContractReasons.has(plannedActionResolution.reason)
        || (
            plannedActionResolution.reason === 'use_amount_invalid'
            && plannedActionResolution.context?.key === 'liquiditaet'
        )
        ? 'planned_liquidity_flow'
        : 'planned_action_flow';
    throw new FinancialCalculationError(
        'Die Transaktionsplanung verletzt den gemeinsamen Action-Vertrag.',
        {
            contract,
            phase,
            reason: plannedActionResolution.reason,
            ...plannedActionResolution.context
        }
    );
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
    const policyResult = deriveVpwExpectedRealReturn(params);
    const clampedReal = policyResult.expectedRealReturn;
    const prior = Number.isFinite(params?.lastExpectedRealReturn)
        ? params.lastExpectedRealReturn
        // Erstjahr: kein Vorwert vorhanden -> direkte Uebernahme des geclampten Werts.
        : clampedReal;
    const alpha = _clamp(cfg.EXPECTED_RETURN_SMOOTHING_ALPHA, 0, 1);
    const smoothedReal = prior + alpha * (clampedReal - prior);
    return {
        ...policyResult,
        expectedRealReturnBeforeSmoothing: clampedReal,
        expectedRealReturn: smoothedReal,
        smoothingAlpha: alpha
    };
}

function _buildLongevityDiagnostics(input, effectiveHorizon) {
    const source = (input?.longevityHorizonDiagnostics && typeof input.longevityHorizonDiagnostics === 'object')
        ? input.longevityHorizonDiagnostics
        : null;
    const mode = typeof input?.longevityMode === 'string' ? input.longevityMode : (source?.longevityMode || 'none');
    const rawHorizon = Number.isFinite(source?.horizonYearsRaw)
        ? source.horizonYearsRaw
        : effectiveHorizon;
    return {
        horizonYearsRaw: rawHorizon,
        longevityMode: mode,
        longevityApplied: source ? source.longevityApplied === true : false,
        longevityAppliedShift: Number.isFinite(source?.longevityAppliedShift) ? source.longevityAppliedShift : 0,
        longevityAppliedBufferYears: Number.isFinite(source?.longevityAppliedBufferYears) ? source.longevityAppliedBufferYears : 0,
        longevityRelativePct: Number.isFinite(source?.longevityRelativePct) ? source.longevityRelativePct : 0,
        longevityClampReason: source?.longevityClampReason || null,
        survivalQuantileRaw: Number.isFinite(source?.survivalQuantileRaw) ? source.survivalQuantileRaw : null,
        survivalQuantileAdjusted: Number.isFinite(source?.survivalQuantileAdjusted) ? source.survivalQuantileAdjusted : null,
        longevityTransitionSmoothingApplied: source?.longevityTransitionSmoothingApplied === true,
        longevityTransitionSmoothingFloor: Number.isFinite(source?.longevityTransitionSmoothingFloor)
            ? source.longevityTransitionSmoothingFloor
            : null
    };
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
        kuerzungProzent,
        safetyStage,
        threeBucketActive
    } = params;
    const cfg = CONFIG.SPENDING_MODEL?.DYNAMIC_FLEX_SAFETY || {};
    const hasRunwayCrisis = Number.isFinite(runwayMonate) && Number.isFinite(minRunwayMonths) && runwayMonate < minRunwayMonths;
    const hasCriticalStress = alarmActive || hasRunwayCrisis;
    const stage = _sanitizeSafetyStage(safetyStage);
    const ignoreStage2SelfCut = stage >= 2 && !hasCriticalStress;
    const ignoreStage2DrawdownForRecovery = ignoreStage2SelfCut && threeBucketActive === true;

    let score = 0;
    if (alarmActive) score += 2;
    if (Number.isFinite(entnahmequoteDepot) && entnahmequoteDepot >= CONFIG.THRESHOLDS.CAUTION.withdrawalRate) score += 1;
    if (Number.isFinite(realerDepotDrawdown) && realerDepotDrawdown >= CONFIG.THRESHOLDS.ALARM.realDrawdown) score += 1;
    if (hasRunwayCrisis) score += 1;
    if (!ignoreStage2SelfCut && Number.isFinite(kuerzungProzent) && kuerzungProzent >= (Number(cfg.HARD_CUT_PCT) || 35)) score += 1;

    const badThreshold = Number(cfg.BAD_SCORE_THRESHOLD) || 2;
    const severeThreshold = Number(cfg.SEVERE_SCORE_THRESHOLD) || 4;
    const isBad = score >= badThreshold;
    const isSevere = score >= severeThreshold || (alarmActive && hasRunwayCrisis);

    const runwayHeadroom = Number(cfg.RUNWAY_HEADROOM_MONTHS) || 6;
    const goodWithdrawal = Number(cfg.GOOD_WITHDRAWAL_RATE) || 0.04;
    const goodDrawdown = Number(cfg.GOOD_DRAWDOWN) || 0.15;
    const goodCut = Number(cfg.GOOD_CUT_PCT) || 15;
    const hasAcceptableCutForRecovery = ignoreStage2SelfCut ||
        (Number.isFinite(kuerzungProzent) && kuerzungProzent <= goodCut);
    const hasAcceptableDrawdownForRecovery = ignoreStage2DrawdownForRecovery ||
        (Number.isFinite(realerDepotDrawdown) && realerDepotDrawdown <= goodDrawdown);
    const isGood = !alarmActive &&
        Number.isFinite(entnahmequoteDepot) && entnahmequoteDepot <= goodWithdrawal &&
        hasAcceptableDrawdownForRecovery &&
        Number.isFinite(runwayMonate) && Number.isFinite(minRunwayMonths) && runwayMonate >= (minRunwayMonths + runwayHeadroom) &&
        hasAcceptableCutForRecovery;

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
    const equityValue = normalizedInput.depotwertAlt + normalizedInput.depotwertNeu;
    const goldValue = normalizedInput.goldAktiv ? normalizedInput.goldWert : 0;
    const equityWeightPct = gesamtwert > 0 ? (equityValue / gesamtwert) * 100 : 0;
    const goldWeightPct = gesamtwert > 0 ? (goldValue / gesamtwert) * 100 : 0;
    const liquidityRunwayPolicy = deriveLiquidityRunwayPolicy(normalizedInput.liquidityRunwayYears);

    // 3. Marktanalyse durchführen
    // Bestimmt Marktszenario (Bär, Bulle, Seitwärts, etc.) basierend auf historischen Daten
    const marketAnalysis = MarketAnalyzer.analyzeMarket(normalizedInput);
    const realReturnEq = (
        (Number(marketAnalysis.perf1Y) || 0)
        - (Number(normalizedInput.inflation) || 0)
    ) / 100;
    const market = {
        ...marketAnalysis,
        realReturnEq
    };

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
        const vpwReturnPolicy = _calculateExpectedRealReturn({
            returnPolicy: normalizedInput.returnPolicy,
            capeRatio: normalizedInput.capeRatio,
            marketCapeRatio: normalizedInput.marketCapeRatio,
            expectedReturnCape: market.expectedReturnCape,
            inflation: normalizedInput.inflation,
            equityWeightPct,
            goldAktiv: normalizedInput.goldAktiv,
            goldWeightPct,
            lastExpectedRealReturn: vpwExpectedRealReturn
        });
        const expectedRealReturn = vpwReturnPolicy.expectedRealReturn;
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
            ..._buildLongevityDiagnostics(normalizedInput, horizonYears),
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
            returnPolicy: vpwReturnPolicy.returnPolicy,
            expectedReturnSource: vpwReturnPolicy.expectedReturnSource,
            capeRatioUsed: Number.isFinite(market?.capeRatio) ? market.capeRatio : null,
            expectedReturnCape: Number.isFinite(market?.expectedReturnCape) ? market.expectedReturnCape : null,
            capePolicyRatioUsed: Number.isFinite(vpwReturnPolicy.capeRatioUsed) ? vpwReturnPolicy.capeRatioUsed : null,
            capeInputStatus: vpwReturnPolicy.capeInputStatus || null,
            safeRealReturn: vpwReturnPolicy.safeRealReturn,
            safeRealReturnSource: vpwReturnPolicy.safeRealReturnSource,
            goldRealReturn: vpwReturnPolicy.goldRealReturn,
            goldRealReturnSource: vpwReturnPolicy.goldRealReturnSource,
            portfolioWeightSource: 'actual_engine_portfolio',
            equityWeight: vpwReturnPolicy.equityWeight,
            goldWeight: vpwReturnPolicy.goldWeight,
            safeWeight: vpwReturnPolicy.safeWeight,
            expectedRealReturnRaw: vpwReturnPolicy.expectedRealReturnRaw,
            expectedRealReturnClamped: vpwReturnPolicy.expectedRealReturnClamped,
            expectedRealReturnBeforeSmoothing: vpwReturnPolicy.expectedRealReturnBeforeSmoothing,
            smoothingAlpha: vpwReturnPolicy.smoothingAlpha,
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

    // 6. Vorläufige Runway für den SpendingPlanner berechnen.
    // Diese Schätzung muss den noch ungekürzten Bedarf verwenden, weil der
    // SpendingPlanner seine Guardrails erst daraus ableitet.
    const prePolicyRunwayMonths = (inflatedBedarf.floor + inflatedBedarf.flex) > 0
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
        runwayMonate: prePolicyRunwayMonths,
        profil,
        depotwertGesamt,
        gesamtwert,
        renteJahr,
        input: normalizedInput
    });

    // Ab hier ist die final geplante, nach Policies gekürzte und quantisierte
    // Netto-Entnahme die kanonische Basis für Liquiditätsziel, Transaktion und
    // operativen Runway. Fehlende oder widersprüchliche Planner-Ausgaben dürfen
    // nicht auf den Rohbedarf zurückfallen, weil das den Ausgangsfehler reaktiviert.
    const plannedWithdrawalResolution = resolvePlannedAnnualWithdrawal({ spendingResult });
    if (plannedWithdrawalResolution.status !== 'resolved') {
        throw new FinancialCalculationError(
            'Das Ergebnis der Ausgabenplanung enthält keine eindeutige geplante Jahresentnahme.',
            {
                contract: 'planned_annual_withdrawal',
                status: plannedWithdrawalResolution.status,
                candidates: plannedWithdrawalResolution.candidates
            }
        );
    }
    const plannedAnnualNetNeed = plannedWithdrawalResolution.annualWithdrawal;
    const preTransactionRunwayMonths = plannedAnnualNetNeed > 0
        ? aktuelleLiquiditaet / (plannedAnnualNetNeed / 12)
        : Infinity;

    // 8. Ziel-Liquidität aus der final geplanten Netto-Entnahme berechnen.
    // Der separate Brutto-Mindestpuffer bleibt in TransactionEngine erhalten.
    const targetLiquidityDetails = TransactionEngine.calculateTargetLiquidityDetails(
        profil,
        market,
        plannedAnnualNetNeed,
        normalizedInput
    );
    const zielLiquiditaet = targetLiquidityDetails.targetLiquidity;

    // 9. Transaktionsaktion bestimmen
    // Entscheidet, ob und welche Transaktionen notwendig sind:
    // - Depot-Verkauf zur Liquiditäts-Auffüllung
    // - Rebalancing (Aktien/Gold)
    // - Notfall-Verkäufe bei kritischem Runway
    let action = TransactionEngine.determineAction({
        aktuelleLiquiditaet,
        depotwertGesamt,
        zielLiquiditaet,
        market,
        spending: spendingResult,
        minGold,
        profil,
        input: normalizedInput
    });
    _assertPlannedActionContract(
        action,
        normalizedInput,
        aktuelleLiquiditaet,
        'transaction_engine_output'
    );
    let threeBucketDiagnosis = null;
    if (
        normalizedInput.finalizeThreeBucketAction === true
        && normalizedInput.decumulation?.mode === STRATEGY_OPTIONS.THREE_BUCKET_JILGE
    ) {
        const detailedTranches = Array.isArray(normalizedInput.detailledTranches)
            ? normalizedInput.detailledTranches
            : [];
        const finalized = finalizeThreeBucketAction({
            detailedTranches,
            engineInput: normalizedInput,
            market,
            pendingAction: action,
            realReturnEq: market.realReturnEq,
            annualWithdrawalTarget: plannedAnnualNetNeed,
            currentBondValuation: sumBondBucketValuation(detailedTranches)
        });
        action = finalized.updatedAction;
        threeBucketDiagnosis = finalized.threeBucketState;
    }

    _assertPlannedActionContract(
        action,
        normalizedInput,
        aktuelleLiquiditaet,
        'three_bucket_final'
    );

    if (!action || typeof action !== 'object' || Array.isArray(action)) {
        throw new FinancialCalculationError(
            'Die Transaktionsplanung hat kein gültiges Action-Objekt geliefert.',
            { contract: 'planned_action_flow', actionType: Array.isArray(action) ? 'array' : typeof action }
        );
    }
    if (action.type !== 'TRANSACTION' && action.type !== 'NONE') {
        throw new FinancialCalculationError(
            'Die Transaktionsplanung hat einen unbekannten Action-Typ geliefert.',
            { contract: 'planned_action_flow', actionType: action.type }
        );
    }
    const hasRawSourcesProperty = Object.prototype.hasOwnProperty.call(action, 'quellen');
    if (
        (action.type === 'TRANSACTION' || hasRawSourcesProperty)
        && !Array.isArray(action.quellen)
    ) {
        throw new FinancialCalculationError(
            'Die Quellen der geplanten Transaktion besitzen keinen gültigen Array-Vertrag.',
            {
                contract: 'planned_action_flow',
                rawSourcesType: action.quellen === null ? 'null' : typeof action.quellen
            }
        );
    }
    const invalidRawSourceIndex = Array.isArray(action.quellen)
        ? action.quellen.findIndex(source => (
            !source
            || typeof source !== 'object'
            || Array.isArray(source)
            || !ACTION_SOURCE_KINDS.has(source.kind)
            || typeof source.brutto !== 'number'
            || !Number.isFinite(source.brutto)
            || source.brutto < 0
            || typeof source.steuer !== 'number'
            || !Number.isFinite(source.steuer)
            || source.steuer < 0
            || source.steuer > source.brutto + 0.01
            || typeof source.netto !== 'number'
            || !Number.isFinite(source.netto)
            || source.netto < 0
            || Math.abs((source.brutto - source.steuer) - source.netto) > 0.01
            || (
                source.kind === 'liquiditaet'
                && (
                    Math.abs(source.steuer) > 0.01
                    || Math.abs(source.netto - source.brutto) > 0.01
                )
            )
        ))
        : -1;
    if (invalidRawSourceIndex >= 0) {
        throw new FinancialCalculationError(
            'Eine Quelle der geplanten Transaktion ist ungültig.',
            {
                contract: 'planned_action_flow',
                sourceIndex: invalidRawSourceIndex,
                source: action.quellen[invalidRawSourceIndex]
            }
        );
    }
    const rawAssetSources = Array.isArray(action.quellen)
        ? action.quellen.filter(source => source.kind !== 'liquiditaet')
        : [];
    const rawCashSources = Array.isArray(action.quellen)
        ? action.quellen.filter(source => source.kind === 'liquiditaet')
        : [];
    const hasAssetSale = rawAssetSources.length > 0;
    const rawSourcePlanTax = rawAssetSources.reduce((total, source) => total + source.steuer, 0);
    const rawSourcePlanFunding = rawAssetSources.reduce((total, source) => total + source.netto, 0)
        + rawCashSources.reduce((total, source) => total + source.brutto, 0);
    if (
        action.type === 'TRANSACTION'
        && (
            typeof action.nettoErlös !== 'number'
            || !Number.isFinite(action.nettoErlös)
            || action.nettoErlös < 0
        )
    ) {
        throw new FinancialCalculationError(
            'Der geplante Netto-Gesamtbetrag der Transaktion ist ungültig.',
            {
                contract: 'planned_action_flow',
                field: 'nettoErlös',
                value: action.nettoErlös
            }
        );
    }
    const hasRawActionTax = Object.prototype.hasOwnProperty.call(action, 'steuer');
    if (
        action.type === 'TRANSACTION'
        && (
            (hasRawActionTax && (
                typeof action.steuer !== 'number'
                || !Number.isFinite(action.steuer)
                || action.steuer < 0
            ))
            || (hasAssetSale && !hasRawActionTax)
            || (hasAssetSale && Math.abs(action.steuer - rawSourcePlanTax) > 0.01)
            || (!hasAssetSale && hasRawActionTax && action.steuer > 0.01)
        )
    ) {
        throw new FinancialCalculationError(
            'Die geplante Gesamtsteuer der Transaktion ist ungültig oder nicht mit den Quellen reconciliert.',
            {
                contract: 'planned_action_flow',
                field: 'steuer',
                value: action.steuer,
                rawSourcePlanTax
            }
        );
    }

    // Diagnose-Einträge von Transaktion hinzufügen
    // Transaktionen können eigene Diagnose-Einträge erzeugen (z.B. Caps, Guardrails)
    if (Array.isArray(action.diagnosisEntries) && action.diagnosisEntries.length) {
        diagnosis.decisionTree.push(...action.diagnosisEntries);
    }
    if (action.transactionDiagnostics) {
        diagnosis.transactionDiagnostics = action.transactionDiagnostics;
    }

    const rawTaxAggregate = action?.taxRawAggregate;
    const rawTaxAggregatePrototype = rawTaxAggregate && typeof rawTaxAggregate === 'object'
        ? Object.getPrototypeOf(rawTaxAggregate)
        : null;
    const hasPlainTaxAggregate = rawTaxAggregate !== null
        && typeof rawTaxAggregate === 'object'
        && !Array.isArray(rawTaxAggregate)
        && (rawTaxAggregatePrototype === Object.prototype || rawTaxAggregatePrototype === null);
    const hasValidTaxAggregateValues = hasPlainTaxAggregate
        && typeof rawTaxAggregate.sumRealizedGainSigned === 'number'
        && Number.isFinite(rawTaxAggregate.sumRealizedGainSigned)
        && typeof rawTaxAggregate.sumTaxableAfterTqfSigned === 'number'
        && Number.isFinite(rawTaxAggregate.sumTaxableAfterTqfSigned);
    if (hasAssetSale && !hasValidTaxAggregateValues) {
        throw new FinancialCalculationError(
            'Eine geplante Asset-Transaktion besitzt kein gültiges Rohsteueraggregat.',
            {
                contract: 'planned_action_flow',
                field: 'taxRawAggregate',
                taxRawAggregate: rawTaxAggregate ?? null
            }
        );
    }
    const actionRawAggregate = {
        sumRealizedGainSigned: hasValidTaxAggregateValues
            ? rawTaxAggregate.sumRealizedGainSigned
            : 0,
        sumTaxableAfterTqfSigned: hasValidTaxAggregateValues
            ? rawTaxAggregate.sumTaxableAfterTqfSigned
            : 0
    };
    const steuerPlanGesamt = hasAssetSale ? (Number(action.steuer) || 0) : 0;
    const nettoErloesPlan = hasAssetSale ? (Number(action.nettoErlös) || 0) : 0;
    const bruttoVerkaufGesamt = hasAssetSale
        ? action.quellen.reduce(
            (summe, source) => summe + (source?.kind === 'liquiditaet' ? 0 : (Number(source?.brutto) || 0)),
            0
        )
        : 0;
    const taxSettlementDeferred = normalizedInput.deferTaxSettlement === true;
    const taxSettlement = taxSettlementDeferred
        ? {
            taxDue: steuerPlanGesamt,
            taxStateNext: { ...taxStatePrev },
            details: {
                deferred: true,
                reason: 'profile_attribution_required',
                sumRealizedGainSigned: actionRawAggregate.sumRealizedGainSigned,
                sumTaxableAfterTqfSigned: actionRawAggregate.sumTaxableAfterTqfSigned,
                lossCarryStart: taxStatePrev.lossCarry,
                taxPlanDue: steuerPlanGesamt
            }
        }
        : settleTaxYear({
            taxStatePrev,
            rawAggregate: actionRawAggregate,
            sparerPauschbetrag: normalizedInput.sparerPauschbetrag,
            kirchensteuerSatz: normalizedInput.kirchensteuerSatz
        });
    const rawTaxCashAdjustment = hasAssetSale
        ? steuerPlanGesamt - taxSettlement.taxDue
        : 0;

    if (rawTaxCashAdjustment < -0.01) {
        throw new FinancialCalculationError(
            `Die finale Steuer uebersteigt die eingeplante Steuerreserve um ${Math.abs(rawTaxCashAdjustment).toFixed(2)} EUR. Bitte pruefen Sie die Steuerparameter und Depot-Tranchen.`,
            {
                contract: 'tax_reserve',
                taxCashAdjustment: rawTaxCashAdjustment,
                steuerPlanGesamt,
                finalTax: taxSettlement.taxDue
            }
        );
    }
    // Dieselbe Subcent-Regel wie im Simulator-Recompute: negatives
    // Rundungsrauschen bis einschließlich 0,01 EUR darf keine negative
    // Verwendung und damit keinen falschen Liquiditätsfehler erzeugen.
    const taxCashAdjustment = rawTaxCashAdjustment < 0 && rawTaxCashAdjustment >= -0.01
        ? 0
        : rawTaxCashAdjustment;
    const rawVerwendungen = action?.verwendungen;
    const rawUsesPrototype = rawVerwendungen && typeof rawVerwendungen === 'object'
        ? Object.getPrototypeOf(rawVerwendungen)
        : null;
    const hasPlainUses = rawVerwendungen !== null
        && typeof rawVerwendungen === 'object'
        && !Array.isArray(rawVerwendungen)
        && (rawUsesPrototype === Object.prototype || rawUsesPrototype === null);
    const hasRawUsesProperty = Object.prototype.hasOwnProperty.call(action, 'verwendungen');
    if ((action.type === 'TRANSACTION' || hasRawUsesProperty) && !hasPlainUses) {
        throw new FinancialCalculationError(
            'Die geplanten Verwendungen der Transaktion besitzen keinen gültigen Objektvertrag.',
            {
                contract: 'planned_action_flow',
                rawUsesType: Array.isArray(rawVerwendungen) ? 'array' : typeof rawVerwendungen
            }
        );
    }
    const invalidRawUse = hasPlainUses
        ? Object.entries(rawVerwendungen).find(([, value]) => (
            typeof value !== 'number' || !Number.isFinite(value) || value < 0
        ))
        : null;
    const invalidRawUseKey = hasPlainUses
        ? Object.keys(rawVerwendungen).find(key => !ACTION_USE_KEYS.has(key))
        : null;
    if (invalidRawUseKey) {
        throw new FinancialCalculationError(
            'Die geplante Transaktion besitzt einen unbekannten Verwendungsschlüssel.',
            {
                contract: 'planned_action_flow',
                key: invalidRawUseKey
            }
        );
    }
    if (invalidRawUse) {
        const [key, value] = invalidRawUse;
        throw new FinancialCalculationError(
            'Eine geplante Verwendung der Transaktion ist ungültig.',
            {
                contract: key === 'liquiditaet' ? 'planned_liquidity_flow' : 'planned_action_flow',
                key,
                value
            }
        );
    }
    const rawUseTotal = hasPlainUses
        ? Object.values(rawVerwendungen).reduce((total, value) => total + value, 0)
        : 0;
    if (
        action.type === 'TRANSACTION'
        && (
            Math.abs(rawSourcePlanFunding - rawUseTotal) > 0.01
            || Math.abs(rawSourcePlanFunding - action.nettoErlös) > 0.01
        )
    ) {
        throw new FinancialCalculationError(
            'Die geplante Transaktion ist bereits vor dem Steuer-Settlement nicht ausgeglichen.',
            {
                contract: 'planned_action_flow',
                rawSourcePlanFunding,
                rawUseTotal,
                actionNet: action.nettoErlös
            }
        );
    }
    action.quellen = _allocateFinalTaxToActionSources(action?.quellen, taxSettlement.taxDue);

    const verwendungen = Object.fromEntries(
        Object.entries(hasPlainUses ? rawVerwendungen : {})
            .map(([key, value]) => [key, value])
    );
    verwendungen.liquiditaet = Number(verwendungen.liquiditaet) || 0;
    verwendungen.gold = Number(verwendungen.gold) || 0;
    verwendungen.aktien = Number(verwendungen.aktien) || 0;
    if (hasAssetSale) {
        verwendungen.liquiditaet += taxCashAdjustment;
        action.nettoErlös = nettoErloesPlan + taxCashAdjustment;
    } else if (action?.type === 'NONE') {
        action.nettoErlös = 0;
    }

    action.bruttoVerkaufGesamt = bruttoVerkaufGesamt;
    action.steuerPlanGesamt = steuerPlanGesamt;
    action.nettoErlösPlan = nettoErloesPlan;
    action.taxCashAdjustment = taxCashAdjustment;
    action.verwendungen = verwendungen;
    action.taxRawAggregate = actionRawAggregate;
    action.taxSettlement = taxSettlement.details;
    action.taxSettlementDeferred = taxSettlementDeferred;
    // NOTE: action is passed by reference to the UI payload below.
    // We intentionally override steuer with the final annual settlement tax.
    action.steuer = taxSettlement.taxDue;
    _assertFinalActionReconciliation(action);
    diagnosis.keyParams = diagnosis.keyParams || {};
    diagnosis.keyParams.taxSettlement = taxSettlement.details;
    if (threeBucketDiagnosis) {
        diagnosis.keyParams.threeBucket = threeBucketDiagnosis;
    }

    // 10. Liquidität nach Transaktion berechnen.
    // Zuflüsse aus Depotverkäufen und Abflüsse bei Überschussinvestitionen
    // müssen beide in die nachgelagerte Runway eingehen.
    const plannedLiquidityInflow = Number(action.verwendungen?.liquiditaet ?? 0);
    const cashFundingSources = Array.isArray(action?.quellen)
        ? action.quellen.filter(source => source?.kind === 'liquiditaet')
        : [];
    const invalidCashFundingSource = cashFundingSources.find(source => (
        typeof source?.brutto !== 'number' || !Number.isFinite(source.brutto) || source.brutto < 0
    ));
    if (!Number.isFinite(plannedLiquidityInflow) || plannedLiquidityInflow < 0 || invalidCashFundingSource) {
        throw new FinancialCalculationError(
            'Die geplanten Liquiditätsflüsse der Transaktion sind ungültig.',
            {
                contract: 'planned_liquidity_flow',
                plannedLiquidityInflow,
                invalidCashFundingSource: invalidCashFundingSource || null
            }
        );
    }
    const plannedLiquidityOutflow = cashFundingSources.reduce(
        (sum, source) => sum + source.brutto,
        0
    );
    const rawLiqNachTransaktion = aktuelleLiquiditaet
        + plannedLiquidityInflow
        - plannedLiquidityOutflow;
    if (
        !Number.isFinite(rawLiqNachTransaktion)
        || rawLiqNachTransaktion < -PLANNED_ACTION_FLOW_EPSILON
    ) {
        throw new FinancialCalculationError(
            'Die geplante Transaktion überbucht die verfügbare Liquidität.',
            {
                contract: 'planned_liquidity_flow',
                aktuelleLiquiditaet,
                plannedLiquidityInflow,
                plannedLiquidityOutflow,
                liqNachTransaktion: rawLiqNachTransaktion
            }
        );
    }
    const liqNachTransaktion = rawLiqNachTransaktion < 0 ? 0 : rawLiqNachTransaktion;

    // KPI: Liquiditätsdeckung relativ zum Zielwert vor/nach Transaktion
    // Wird als Diagnose-KPI und für die UI wiederverwendet, deshalb einmalig berechnet
    const computeCoverage = (liquiditaetWert) => (zielLiquiditaet > 0)
        ? (liquiditaetWert / zielLiquiditaet) * 100
        : 100;
    const deckungVorher = computeCoverage(aktuelleLiquiditaet);
    const deckungNachher = computeCoverage(liqNachTransaktion);

    // Neue Runway nach Transaktion berechnen
    const runwayMonths = (plannedAnnualNetNeed > 0)
        ? (liqNachTransaktion / (plannedAnnualNetNeed / 12))
        : Infinity;
    // Die Dynamic-Flex-Safety behält bewusst die vor Slice 17 kalibrierte
    // Rohbedarfsbasis. Eine Policy-Kürzung darf ihr eigenes Erholungssignal
    // nicht durch einen kleineren Nenner erzeugen.
    const safetyRunwayMonths = (neuerBedarf > 0)
        ? (liqNachTransaktion / (neuerBedarf / 12))
        : Infinity;

    const safetyUpdate = _updateVpwSafetyState({
        lastState,
        requestedDynamicFlex: vpwEffectiveSettings.requestedDynamicFlex,
        signals: {
            alarmActive: diagnosis?.general?.alarmActive === true,
            entnahmequoteDepot: diagnosis?.keyParams?.entnahmequoteDepot,
            realerDepotDrawdown: diagnosis?.keyParams?.realerDepotDrawdown,
            runwayMonate: safetyRunwayMonths,
            minRunwayMonths: liquidityRunwayPolicy.hardMinimumMonths,
            kuerzungProzent: spendingResult?.kuerzungProzent,
            safetyStage: vpwEffectiveSettings.stage,
            threeBucketActive: normalizedInput.decumulation?.mode === STRATEGY_OPTIONS.THREE_BUCKET_JILGE
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
    diagnosis.general.dynamicFlexSafetyRunwayMonate = safetyRunwayMonths;
    diagnosis.general.dynamicFlexSafetyRunwayBasis = 'pre_policy_annual_net_need';
    diagnosis.general.dynamicFlexSafetyAnnualNeed = neuerBedarf;
    diagnosis.general.plannedAnnualWithdrawalSource = plannedWithdrawalResolution.source;
    diagnosis.general.runwayMonateVorTransaktion = preTransactionRunwayMonths;
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

    // 11. Runway-Status bestimmen
    // - 'ok': Runway >= Ziel (z.B. 36+ Monate)
    // - 'warn': Runway >= Minimum aber < Ziel (z.B. 24-36 Monate)
    // - 'bad': Runway < Minimum (< 24 Monate) - kritisch!
    let runwayStatus = 'bad';
    if (runwayMonths >= liquidityRunwayPolicy.targetMonths) {
        runwayStatus = 'ok';
    } else if (runwayMonths >= liquidityRunwayPolicy.hardMinimumMonths) {
        runwayStatus = 'warn';
    }

    // Diagnose-Objekt mit finalem Runway-Status und Zielwert anreichern
    diagnosis.general = diagnosis.general || {};
    diagnosis.general.runwayStatus = runwayStatus;
    diagnosis.general.runwayMonate = runwayMonths;
    diagnosis.general.deckungVorher = deckungVorher;
    diagnosis.general.deckungNachher = deckungNachher;
    const runwayTargetSmoothing = targetLiquidityDetails.runwayTargetDiagnostics || null;
    const validInputRunwayTarget = (typeof liquidityRunwayPolicy.targetMonths === 'number' && isFinite(liquidityRunwayPolicy.targetMonths) && liquidityRunwayPolicy.targetMonths > 0)
        ? liquidityRunwayPolicy.targetMonths
        : null;
    const hasValidTarget = (typeof diagnosis.general.runwayTargetMonate === 'number' && isFinite(diagnosis.general.runwayTargetMonate));
    if (runwayTargetSmoothing?.targetMonths) {
        diagnosis.general.runwayTargetMonate = runwayTargetSmoothing.targetMonths;
    } else if (!hasValidTarget && validInputRunwayTarget) {
        diagnosis.general.runwayTargetMonate = validInputRunwayTarget;
    }
    if (runwayTargetSmoothing?.source) {
        diagnosis.general.runwayTargetQuelle = runwayTargetSmoothing.source;
    } else if (typeof diagnosis.general.runwayTargetQuelle !== 'string' || !diagnosis.general.runwayTargetQuelle.trim()) {
        diagnosis.general.runwayTargetQuelle = validInputRunwayTarget ? 'input' : 'legacy';
    }
    if (runwayTargetSmoothing) {
        diagnosis.general.runwayTargetSmoothing = runwayTargetSmoothing;
        diagnosis.general.regimeSmoothingApplied = runwayTargetSmoothing.smoothingApplied;
        diagnosis.general.regimeSmoothingFallback = runwayTargetSmoothing.smoothingFallback;
        diagnosis.general.regimeSmoothingFactors = {
            drawdownSeverity: runwayTargetSmoothing.severity,
            drawdownSeverityPct: runwayTargetSmoothing.severityPct,
            lowerTargetMonths: runwayTargetSmoothing.lowerTargetMonths,
            upperTargetMonths: runwayTargetSmoothing.upperTargetMonths,
            hardMinimumMonths: runwayTargetSmoothing.hardMinimumMonths
        };
        diagnosis.keyParams.runwayTargetSmoothing = runwayTargetSmoothing;
    }

    if (Array.isArray(diagnosis.guardrails)) {
        diagnosis.guardrails = diagnosis.guardrails.map(guardrail => {
            if (guardrail && guardrail.type === 'months' && guardrail.rule === 'min' && guardrail.name.startsWith('Runway')) {
                if (
                    guardrail.name.startsWith('Runway (vs. Ziel)') &&
                    Number.isFinite(runwayTargetSmoothing?.targetMonths)
                ) {
                    return { ...guardrail, value: runwayMonths, threshold: runwayTargetSmoothing.targetMonths };
                }
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
        threeBucket: threeBucketDiagnosis,
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
            ..._buildLongevityDiagnostics(
                normalizedInput,
                Number.isFinite(normalizedInput.horizonYears) ? normalizedInput.horizonYears : null
            ),
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
