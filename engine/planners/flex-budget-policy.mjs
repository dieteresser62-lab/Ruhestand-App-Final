import { CONFIG } from '../config.mjs';

export function applyFlexBudgetCap(flexRate, inflatedBedarf, input, state, market, addDecision) {
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
}
