import { CONFIG } from '../config.mjs';

const SAFE_MONTHLY_TIERS = Object.freeze(
    CONFIG.ANTI_PSEUDO_ACCURACY.QUANTIZATION_TIERS_MONTHLY
        .map(tier => Object.freeze({ limit: tier.limit, step: tier.step }))
);

export const SPENDING_ROUNDING_FALLBACK_CODE = 'SPENDING_ROUNDING_CONTRACT_FALLBACK';
let roundingFallbackWarningEmitted = false;

function resolveMonthlyQuantizationTiers() {
    const configured = CONFIG.ANTI_PSEUDO_ACCURACY?.QUANTIZATION_TIERS_MONTHLY;
    const valid = Array.isArray(configured)
        && configured.length > 0
        && configured.every((tier, index) => Number.isFinite(tier?.step)
            && tier.step > 0
            && (Number.isFinite(tier?.limit) || (index === configured.length - 1 && tier?.limit === Infinity)));
    return valid
        ? { tiers: configured, fallbackApplied: false }
        : { tiers: SAFE_MONTHLY_TIERS, fallbackApplied: true };
}

export function quantizeMonthly(amount, mode = 'floor', tiersOverride = null) {
    if (!CONFIG.ANTI_PSEUDO_ACCURACY?.ENABLED) return amount;

    const tiers = tiersOverride || resolveMonthlyQuantizationTiers().tiers;
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

const SAFE_WITHDRAWAL_ROUNDING = Object.freeze({
    phase: 'after_floor_plus_flex_decision_before_final_annual_withdrawal',
    monthlyMode: 'floor',
    annualizationFactor: 12,
    floorProtection: 'max_floor_annual'
});

function resolveWithdrawalRoundingContract() {
    const configured = CONFIG.ANTI_PSEUDO_ACCURACY?.WITHDRAWAL_ROUNDING;
    const valid = configured?.phase === SAFE_WITHDRAWAL_ROUNDING.phase
        && ['floor', 'ceil'].includes(configured?.monthlyMode)
        && Number.isInteger(configured?.annualizationFactor)
        && configured.annualizationFactor > 0
        && configured?.floorProtection === SAFE_WITHDRAWAL_ROUNDING.floorProtection;
    return valid
        ? { ...configured, fallbackApplied: false }
        : { ...SAFE_WITHDRAWAL_ROUNDING, fallbackApplied: true };
}

export function calculateFinalWithdrawal(inflatedBedarf, flexRate, antiPseudoAccuracyEnabled = true) {
    const roundingContract = resolveWithdrawalRoundingContract();
    const monthlyTiers = resolveMonthlyQuantizationTiers();
    const annualizationFactor = roundingContract.annualizationFactor;
    const floorAnnual = Math.max(0, Number(inflatedBedarf.floor) || 0);
    const rawEntnahme = floorAnnual +
        (inflatedBedarf.flex * (Math.max(0, Math.min(100, flexRate)) / 100));
    const rawMonthly = rawEntnahme / annualizationFactor;
    let quantizedMonthly = rawMonthly;

    if (antiPseudoAccuracyEnabled) {
        quantizedMonthly = quantizeMonthly(rawMonthly, roundingContract.monthlyMode, monthlyTiers.tiers);
    }

    const quantizedAnnual = quantizedMonthly * annualizationFactor;
    const floorProtectionApplied = quantizedAnnual < floorAnnual;
    const endgueltigeEntnahme = Math.max(floorAnnual, quantizedAnnual);
    const effectiveFlexRate = (inflatedBedarf.flex > 0)
        ? ((Math.max(0, endgueltigeEntnahme - floorAnnual) / inflatedBedarf.flex) * 100)
        : 0;
    const contractFallbackApplied = roundingContract.fallbackApplied || monthlyTiers.fallbackApplied;
    if (antiPseudoAccuracyEnabled && contractFallbackApplied && !roundingFallbackWarningEmitted) {
        roundingFallbackWarningEmitted = true;
        console.warn(
            `[${SPENDING_ROUNDING_FALLBACK_CODE}] Ungueltiger Live-Rundungsvertrag; `
            + 'die Entnahmeberechnung verwendet den freigegebenen sicheren Default.'
        );
    }
    const quantization = {
        enabled: antiPseudoAccuracyEnabled,
        phase: roundingContract.phase,
        mode: roundingContract.monthlyMode,
        annualizationFactor,
        floorProtection: roundingContract.floorProtection,
        contractFallbackApplied,
        warningCode: contractFallbackApplied ? SPENDING_ROUNDING_FALLBACK_CODE : null,
        rawAnnual: rawEntnahme,
        rawMonthly,
        quantizedMonthly,
        quantizedAnnual,
        floorAnnual,
        floorProtectionApplied,
        finalAnnual: endgueltigeEntnahme
    };

    return { endgueltigeEntnahme, flexRate: effectiveFlexRate, quantization };
}
