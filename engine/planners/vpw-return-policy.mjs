import { CONFIG } from '../config.mjs';

const POLICY_LEGACY_STEP = 'legacy_step';
const POLICY_CAPE_CONTINUOUS = 'cape_continuous';

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function coalesceFinite(...values) {
    return values.find(finiteNumber);
}

function normalizeWeightPct(value, fallbackPct) {
    const pct = finiteNumber(value) ? value : fallbackPct;
    return clamp(pct / 100, 0, 1);
}

function resolveCapeConfig(config = CONFIG) {
    return {
        ...CONFIG.CAPE_CONTINUOUS,
        ...(config?.CAPE_CONTINUOUS || {})
    };
}

function resolveDynamicFlexConfig(config = CONFIG) {
    return {
        ...CONFIG.SPENDING_MODEL.DYNAMIC_FLEX,
        ...(config?.SPENDING_MODEL?.DYNAMIC_FLEX || {})
    };
}

function normalizeCape(capeInput, options) {
    const defaultCape = finiteNumber(options.DEFAULT_CAPE) && options.DEFAULT_CAPE > 0
        ? options.DEFAULT_CAPE
        : CONFIG.MARKET_VALUATION.DEFAULT_CAPE;
    const minCape = finiteNumber(options.MIN_CAPE) ? options.MIN_CAPE : 0;
    const maxCape = finiteNumber(options.MAX_CAPE) ? options.MAX_CAPE : 100;

    if (capeInput === null || capeInput === undefined || capeInput === '') {
        return { capeRatioUsed: defaultCape, capeInputStatus: 'fallback_missing' };
    }
    if (!finiteNumber(capeInput) || capeInput <= minCape || capeInput > maxCape) {
        return { capeRatioUsed: defaultCape, capeInputStatus: 'fallback_invalid' };
    }
    return { capeRatioUsed: capeInput, capeInputStatus: 'valid' };
}

function resolveSafeRealReturn(context = {}, dynamicFlexCfg = {}, capeCfg = {}) {
    if (finiteNumber(context.safeRealReturn)) {
        return { safeRealReturn: context.safeRealReturn, safeRealReturnSource: 'context' };
    }
    if (capeCfg.SAFE_REAL_RETURN_MODE === 'config_or_zero' && finiteNumber(dynamicFlexCfg.SAFE_ASSET_REAL_RETURN)) {
        return { safeRealReturn: dynamicFlexCfg.SAFE_ASSET_REAL_RETURN, safeRealReturnSource: 'config_dynamic_flex' };
    }
    return { safeRealReturn: 0, safeRealReturnSource: 'fallback_zero' };
}

function resolveGoldRealReturn(context = {}, dynamicFlexCfg = {}) {
    if (finiteNumber(context.goldRealReturn)) {
        return { goldRealReturn: context.goldRealReturn, goldRealReturnSource: 'context' };
    }
    if (finiteNumber(dynamicFlexCfg.GOLD_REAL_RETURN)) {
        return { goldRealReturn: dynamicFlexCfg.GOLD_REAL_RETURN, goldRealReturnSource: 'config_dynamic_flex' };
    }
    return { goldRealReturn: 0, goldRealReturnSource: 'fallback_zero' };
}

export function normalizeVpwReturnPolicyOptions(input = {}, config = CONFIG) {
    const dynamicFlexCfg = resolveDynamicFlexConfig(config);
    const capeCfg = resolveCapeConfig(config);
    const returnPolicy = input.returnPolicy || dynamicFlexCfg.RETURN_POLICY || POLICY_LEGACY_STEP;
    return {
        returnPolicy: returnPolicy === POLICY_CAPE_CONTINUOUS ? POLICY_CAPE_CONTINUOUS : POLICY_LEGACY_STEP,
        dynamicFlex: dynamicFlexCfg,
        capeContinuous: capeCfg
    };
}

export function deriveCAPEContinuousReturn(cape, options = {}, config = CONFIG) {
    const normalized = normalizeVpwReturnPolicyOptions({ ...options, returnPolicy: POLICY_CAPE_CONTINUOUS }, config);
    const dynamicFlexCfg = normalized.dynamicFlex;
    const capeCfg = {
        ...normalized.capeContinuous,
        ...options
    };
    const { capeRatioUsed, capeInputStatus } = normalizeCape(cape, capeCfg);
    const earningsYield = 1 / capeRatioUsed;
    const equityRiskPremium = finiteNumber(capeCfg.EQUITY_PREMIUM_ADJUSTMENT) ? capeCfg.EQUITY_PREMIUM_ADJUSTMENT : 0;
    const rawEquityRealReturn = earningsYield + equityRiskPremium;
    const equityRealReturn = clamp(
        rawEquityRealReturn,
        capeCfg.MIN_EQUITY_REAL_RETURN,
        capeCfg.MAX_EQUITY_REAL_RETURN
    );
    const eqPct = normalizeWeightPct(coalesceFinite(options.targetEq, options.equityWeightPct), 60);
    const goldPctRaw = options.goldAktiv === true
        ? normalizeWeightPct(coalesceFinite(options.goldZielProzent, options.goldWeightPct), 0)
        : 0;
    const goldPct = clamp(goldPctRaw, 0, Math.max(0, 1 - eqPct));
    const safePct = Math.max(0, 1 - eqPct - goldPct);
    const { goldRealReturn, goldRealReturnSource } = resolveGoldRealReturn(options, dynamicFlexCfg);
    const { safeRealReturn, safeRealReturnSource } = resolveSafeRealReturn(options, dynamicFlexCfg, capeCfg);
    const goldContribution = goldPct > 0 ? (goldPct * goldRealReturn) : 0;
    const safeContribution = safePct > 0 ? (safePct * safeRealReturn) : 0;
    const expectedRealReturnRaw = (eqPct * equityRealReturn) +
        goldContribution +
        safeContribution;
    const expectedRealReturnClamped = clamp(
        expectedRealReturnRaw,
        capeCfg.MIN_REAL_RETURN,
        capeCfg.MAX_REAL_RETURN
    );

    return {
        returnPolicy: POLICY_CAPE_CONTINUOUS,
        expectedReturnSource: capeInputStatus === 'valid' ? 'cape_continuous' : 'fallback',
        capeRatioUsed,
        capeInputStatus,
        earningsYield,
        equityRiskPremium,
        rawEquityRealReturn,
        equityRealReturn,
        equityRealReturnClamped: equityRealReturn,
        safeRealReturn,
        safeRealReturnSource,
        goldRealReturn,
        goldRealReturnSource,
        equityWeight: eqPct,
        goldWeight: goldPct,
        safeWeight: safePct,
        equityContribution: eqPct * equityRealReturn,
        goldContribution,
        safeContribution,
        expectedRealReturnRaw,
        expectedRealReturnClamped,
        expectedRealReturn: expectedRealReturnClamped,
        clamped: equityRealReturn !== rawEquityRealReturn || expectedRealReturnClamped !== expectedRealReturnRaw
    };
}

export function deriveCAPELegacyStepReturn(context = {}, config = CONFIG) {
    const normalized = normalizeVpwReturnPolicyOptions({ ...context, returnPolicy: POLICY_LEGACY_STEP }, config);
    const cfg = normalized.dynamicFlex;
    const inflRate = finiteNumber(context.inflation) ? (context.inflation / 100) : 0.02;
    const equityNominal = finiteNumber(context.expectedReturnCape)
        ? context.expectedReturnCape
        : (cfg.FALLBACK_REAL_RETURN + inflRate);
    const eqPct = normalizeWeightPct(context.targetEq, 60);
    const goldPctRaw = context.goldAktiv === true ? normalizeWeightPct(context.goldZielProzent, 0) : 0;
    const goldPct = clamp(goldPctRaw, 0, Math.max(0, 1 - eqPct));
    const safePct = Math.max(0, 1 - eqPct - goldPct);
    const { goldRealReturn, goldRealReturnSource } = resolveGoldRealReturn(context, cfg);
    const { safeRealReturn, safeRealReturnSource } = resolveSafeRealReturn(
        context,
        cfg,
        { SAFE_REAL_RETURN_MODE: 'config_or_zero' }
    );
    const goldContribution = goldPct > 0 ? (goldPct * goldRealReturn) : 0;
    const safeContribution = safePct > 0 ? (safePct * safeRealReturn) : 0;
    const expectedRealReturnRaw = (eqPct * (equityNominal - inflRate)) +
        goldContribution +
        safeContribution;
    const expectedRealReturnClamped = clamp(expectedRealReturnRaw, cfg.MIN_REAL_RETURN, cfg.MAX_REAL_RETURN);

    return {
        returnPolicy: POLICY_LEGACY_STEP,
        expectedReturnSource: finiteNumber(context.expectedReturnCape) ? 'legacy_cape_step' : 'fallback',
        expectedReturnCape: finiteNumber(context.expectedReturnCape) ? context.expectedReturnCape : null,
        expectedRealReturnRaw,
        expectedRealReturnClamped,
        expectedRealReturn: expectedRealReturnClamped,
        equityWeight: eqPct,
        goldWeight: goldPct,
        safeWeight: safePct,
        safeRealReturn,
        safeRealReturnSource,
        goldRealReturn,
        goldRealReturnSource,
        equityContribution: eqPct * (equityNominal - inflRate),
        goldContribution,
        safeContribution,
        clamped: expectedRealReturnClamped !== expectedRealReturnRaw
    };
}

export function deriveVpwExpectedRealReturn(context = {}, config = CONFIG) {
    const normalized = normalizeVpwReturnPolicyOptions(context, config);
    if (normalized.returnPolicy === POLICY_CAPE_CONTINUOUS) {
        const capeInput = finiteNumber(context.capeRatio) && context.capeRatio > 0
            ? context.capeRatio
            : context.marketCapeRatio;
        return deriveCAPEContinuousReturn(capeInput, context, config);
    }
    return deriveCAPELegacyStepReturn(context, config);
}
