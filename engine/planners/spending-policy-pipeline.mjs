import { applyFinalRateLimits } from './final-rate-policy.mjs';
import { applyFlexBudgetCap } from './flex-budget-policy.mjs';
import { applyMinimumFlexFloor, writeMinimumFlexDiagnostics } from './minimum-flex-policy.mjs';
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

    const minimumFlexResult = applyMinimumFlexFloor(
        flexRate,
        { ...params, state, alarmStatus, kuerzungQuelle },
        addDecision
    );
    flexRate = minimumFlexResult.rate;
    writeMinimumFlexDiagnostics(state, minimumFlexResult);

    const flexBudgetResult = applyFlexBudgetCap(
        flexRate,
        inflatedBedarf,
        input,
        state,
        market,
        addDecision
    );
    if (flexBudgetResult.applied) {
        const minimumFlexWasLimited = minimumFlexResult.applied &&
            Number.isFinite(minimumFlexResult.requiredRate) &&
            flexBudgetResult.rate + 0.01 < minimumFlexResult.requiredRate;
        flexRate = flexBudgetResult.rate;
        if (minimumFlexWasLimited) {
            writeMinimumFlexDiagnostics(state, {
                ...minimumFlexResult,
                rate: flexRate,
                effectiveFlexAfter: inflatedBedarf.flex * (Math.max(0, Math.min(100, flexRate)) / 100)
            }, 'limited_by_flex_budget');
        }
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
        const minimumFlexWasSmoothed = minimumFlexResult.applied &&
            state.keyParams?.minimumFlexStatus !== 'limited_by_flex_budget' &&
            Number.isFinite(minimumFlexResult.requiredRate) &&
            finalLimitResult.rate + 0.01 < minimumFlexResult.requiredRate;
        flexRate = finalLimitResult.rate;
        if (minimumFlexWasSmoothed) {
            writeMinimumFlexDiagnostics(state, {
                ...minimumFlexResult,
                rate: flexRate,
                effectiveFlexAfter: inflatedBedarf.flex * (Math.max(0, Math.min(100, flexRate)) / 100)
            }, 'applied_limited_by_final_smoothing');
        }
        if (kuerzungQuelle !== 'Budget-Floor') {
            kuerzungQuelle = 'Glättung (Final-Guardrail)';
        }
    }

    return { flexRate, kuerzungQuelle, guardrailDiagnostics };
}
