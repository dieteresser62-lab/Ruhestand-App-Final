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
    policyDiagnostics = {},
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
            safetyCapActive: policyDiagnostics.safetyCapActive === true,
            safetyCapFlexRatePct: Number.isFinite(policyDiagnostics.safetyCapFlexRatePct)
                ? policyDiagnostics.safetyCapFlexRatePct
                : null,
            safetyCapEffectiveFlexRatePct: Number.isFinite(policyDiagnostics.safetyCapEffectiveFlexRatePct)
                ? policyDiagnostics.safetyCapEffectiveFlexRatePct
                : null,
            safetyCapRawCandidateFlexRatePct: Number.isFinite(policyDiagnostics.safetyCapRawCandidateFlexRatePct)
                ? policyDiagnostics.safetyCapRawCandidateFlexRatePct
                : null,
            safetyCapSource: policyDiagnostics.safetyCapSource || null,
            safetyCapAnchorStage: policyDiagnostics.safetyCapAnchorStage || null,
            safetyCapBinding: policyDiagnostics.safetyCapBinding || null,
            safetyCapDeferredByRateLimit: policyDiagnostics.safetyCapDeferredByRateLimit === true,
            severeFlexEmergencyActive: policyDiagnostics.severeFlexEmergencyActive === true,
            marketExtremeBear: policyDiagnostics.marketExtremeBear === true,
            realTotalWealthDrawdownRatio: Number.isFinite(policyDiagnostics.realTotalWealthDrawdownRatio)
                ? policyDiagnostics.realTotalWealthDrawdownRatio
                : null,
            realTotalWealthDrawdownThresholdRatio: Number.isFinite(policyDiagnostics.realTotalWealthDrawdownThresholdRatio)
                ? policyDiagnostics.realTotalWealthDrawdownThresholdRatio
                : null,
            minimumFlexOverrideAllowed: policyDiagnostics.minimumFlexOverrideAllowed === true,
            alarmActiveDiagnostic: policyDiagnostics.alarmActive === true,
            withdrawalBurdenFactor: Number.isFinite(policyDiagnostics.withdrawalBurdenFactor)
                ? policyDiagnostics.withdrawalBurdenFactor
                : null,
            alarmWealthSufficient: typeof policyDiagnostics.alarmWealthSufficient === 'boolean'
                ? policyDiagnostics.alarmWealthSufficient
                : null,
            alarmWealthSufficientThreshold: Number.isFinite(policyDiagnostics.alarmWealthSufficientThreshold)
                ? policyDiagnostics.alarmWealthSufficientThreshold
                : null,
            withdrawalBurdenGateRole: policyDiagnostics.withdrawalBurdenGateRole || null,
            finalLimitingPolicy: policyDiagnostics.finalLimitingPolicy || null,
            floorProtectionPolicy: policyDiagnostics.floorProtectionPolicy || null,
            runwayMonate,
            runwayTargetMonate: runwayTargetInfo.targetMonths,
            runwayTargetQuelle: runwayTargetInfo.source
        }
    };
}
