import { CONFIG } from '../config.mjs';
import {
    deriveLiquidityRunwayPolicy,
    resolveLiquidityRunwayYears
} from '../../types/liquidity-runway-contract.js';

export function resolveRunwayTarget(profil, market, input) {
    const policy = deriveLiquidityRunwayPolicy(resolveLiquidityRunwayYears(input || {}).years);
    return {
        targetMonths: policy.targetMonths,
        hardMinimumMonths: policy.hardMinimumMonths,
        source: 'input:liquidityRunwayYears'
    };
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
            threshold: runwayTargetInfo.hardMinimumMonths,
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
