import { CONFIG } from '../config.mjs';

export function applyFinalRateLimits(prevFlexRate, nextFlexRate, market, addDecision, wealthFactor = 1) {
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
}
