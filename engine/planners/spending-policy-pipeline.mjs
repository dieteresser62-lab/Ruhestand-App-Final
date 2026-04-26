import { applyFinalRateLimits } from './final-rate-policy.mjs';
import { applyFlexBudgetCap } from './flex-budget-policy.mjs';
import { applyGuardrails } from './spending-guardrails.mjs';

export function applySpendingPolicyPipeline(state, alarmStatus, params, addDecision, initialPolicyResult) {
    const { inflatedBedarf, input, market } = params;
    let flexRate = initialPolicyResult.geglätteteFlexRate;
    let kuerzungQuelle = initialPolicyResult.kuerzungQuelle;
    let guardrailDiagnostics = {};

    if (!alarmStatus.active) {
        const guardrailResult = applyGuardrails(
            flexRate,
            state,
            { ...params, kuerzungQuelle },
            addDecision
        );
        flexRate = guardrailResult.rate;
        kuerzungQuelle = guardrailResult.source;
        guardrailDiagnostics = guardrailResult.diagnostics || {};
    }

    const flexBudgetResult = applyFlexBudgetCap(
        flexRate,
        inflatedBedarf,
        input,
        state,
        market,
        addDecision
    );
    if (flexBudgetResult.applied) {
        flexRate = flexBudgetResult.rate;
        if (kuerzungQuelle !== 'Budget-Floor') {
            kuerzungQuelle = 'Flex-Budget (Cap)';
        }
    }
    if (Number.isFinite(flexBudgetResult.balanceYears)) {
        state.flexBudgetBalanceYears = flexBudgetResult.balanceYears;
    }
    if (state.keyParams && Number.isFinite(flexBudgetResult.minRatePct)) {
        state.keyParams.minFlexRatePct = flexBudgetResult.minRatePct;
    }

    const wealthFactor = Number.isFinite(state.keyParams?.wealthReductionFactor)
        ? Math.min(1, Math.max(0, state.keyParams.wealthReductionFactor))
        : 1;

    const finalLimitResult = applyFinalRateLimits(
        state.flexRate ?? 100,
        flexRate,
        market,
        addDecision,
        wealthFactor
    );
    if (finalLimitResult.applied) {
        flexRate = finalLimitResult.rate;
        if (kuerzungQuelle !== 'Budget-Floor') {
            kuerzungQuelle = 'Glättung (Final-Guardrail)';
        }
    }

    return { flexRate, kuerzungQuelle, guardrailDiagnostics };
}
