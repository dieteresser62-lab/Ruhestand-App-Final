import { CONFIG } from '../config.mjs';

export function quantizeMonthly(amount, mode = 'floor') {
    if (!CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED) return amount;

    const tiers = CONFIG.ANTI_PSEUDO_ACCURACY.QUANTIZATION_TIERS_MONTHLY;
    const tier = tiers.find(t => amount < t.limit);
    const step = tier ? tier.step : 250;

    if (mode === 'ceil') {
        return Math.ceil(amount / step) * step;
    }
    return Math.floor(amount / step) * step;
}

export function smoothstep(x) {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
}

export function calcFlexShare(inflatedBedarf) {
    const floor = Math.max(0, Number(inflatedBedarf?.floor) || 0);
    const flex = Math.max(0, Number(inflatedBedarf?.flex) || 0);
    const total = floor + flex;
    if (total <= 0 || flex <= 0) return 0;
    return Math.min(1, Math.max(0, flex / total));
}

export function calculateFinalWithdrawal(inflatedBedarf, flexRate, antiPseudoAccuracyEnabled = true) {
    const rawEntnahme = inflatedBedarf.floor +
        (inflatedBedarf.flex * (Math.max(0, Math.min(100, flexRate)) / 100));
    let monthlyEntnahme = rawEntnahme / 12;

    if (antiPseudoAccuracyEnabled) {
        monthlyEntnahme = quantizeMonthly(monthlyEntnahme, 'floor');
    }

    const endgueltigeEntnahme = monthlyEntnahme * 12;
    const effectiveFlexRate = (inflatedBedarf.flex > 0)
        ? ((Math.max(0, endgueltigeEntnahme - inflatedBedarf.floor) / inflatedBedarf.flex) * 100)
        : 0;

    return { endgueltigeEntnahme, flexRate: effectiveFlexRate };
}
