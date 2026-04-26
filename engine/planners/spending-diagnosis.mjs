import { CONFIG } from '../config.mjs';

export function resolveRunwayTarget(profil, market, input) {
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

export function buildSpendingDiagnosis({
    decisionTree = [],
    state,
    alarmStatus,
    params,
    guardrailDiagnostics = {},
    diagnosisMetrics
}) {
    const { market, runwayMonate, profil, input } = params;
    const runwayTargetInfo = resolveRunwayTarget(profil, market, input);

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

    return {
        decisionTree,
        guardrails: guardrailEntries,
        keyParams: {
            ...state.keyParams,
            aktuelleFlexRate: diagnosisMetrics.flexRate,
            kuerzungProzent: diagnosisMetrics.kuerzungProzent,
            jahresentnahme: diagnosisMetrics.jahresentnahme
        },
        general: {
            marketSKey: market.sKey,
            marketSzenario: market.szenarioText,
            alarmActive: alarmStatus.active,
            runwayMonate,
            runwayTargetMonate: runwayTargetInfo.targetMonths,
            runwayTargetQuelle: runwayTargetInfo.source
        }
    };
}
