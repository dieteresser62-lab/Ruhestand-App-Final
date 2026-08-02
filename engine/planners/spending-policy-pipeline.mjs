import { applyFinalRateLimits } from './final-rate-policy.mjs';
import { applyFlexBudgetCap } from './flex-budget-policy.mjs';
import { applyMinimumFlexFloor, writeMinimumFlexDiagnostics } from './minimum-flex-policy.mjs';
import { applyGuardrails } from './spending-guardrails.mjs';

export const SPENDING_POLICY_ORDER_CONTRACT = Object.freeze({
    schemaVersion: 'SpendingPolicyOrderV1',
    steps: Object.freeze([
        'alarm',
        'guardrails',
        'minimum_flex',
        'flex_budget',
        'final_smoothing'
    ])
});

function assertPolicyOrder(executedSteps) {
    const expectedSteps = SPENDING_POLICY_ORDER_CONTRACT.steps;
    const matchesContract = executedSteps.length === expectedSteps.length
        && executedSteps.every((step, index) => step === expectedSteps[index]);
    if (!matchesContract) {
        throw new Error(
            `Spending-Policy-Reihenfolge verletzt (${SPENDING_POLICY_ORDER_CONTRACT.schemaVersion}): `
            + `${executedSteps.join(' > ')}`
        );
    }
}

export function applySpendingPolicyPipeline(state, alarmStatus, params, addDecision, initialPolicyResult) {
    const { inflatedBedarf, input, market } = params;
    let flexRate = initialPolicyResult.geglätteteFlexRate;
    let kuerzungQuelle = initialPolicyResult.kuerzungQuelle;
    let guardrailDiagnostics = {};
    const executedSteps = ['alarm'];

    executedSteps.push('guardrails');
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

    executedSteps.push('minimum_flex');
    const minimumFlexResult = applyMinimumFlexFloor(
        flexRate,
        { ...params, state, alarmStatus, kuerzungQuelle },
        addDecision
    );
    flexRate = minimumFlexResult.rate;
    let minimumFlexStatus = minimumFlexResult.status;
    const minimumFlexCanBeLimited = minimumFlexResult.minimumFlexAnnual > 0
        && minimumFlexResult.flexAnnual > 0
        && minimumFlexResult.status !== 'blocked_emergency';

    executedSteps.push('flex_budget');
    const flexBudgetResult = applyFlexBudgetCap(
        flexRate,
        inflatedBedarf,
        input,
        state,
        market,
        addDecision
    );
    if (flexBudgetResult.applied) {
        const minimumFlexWasLimited = minimumFlexCanBeLimited &&
            Number.isFinite(minimumFlexResult.requiredRate) &&
            flexBudgetResult.rate + 0.01 < minimumFlexResult.requiredRate;
        flexRate = flexBudgetResult.rate;
        if (minimumFlexWasLimited) {
            minimumFlexStatus = 'limited_by_flex_budget';
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

    executedSteps.push('final_smoothing');
    const finalLimitResult = applyFinalRateLimits(
        state.flexRate ?? 100,
        flexRate,
        market,
        addDecision,
        wealthFactor
    );
    if (finalLimitResult.applied) {
        const minimumFlexWasSmoothed = minimumFlexCanBeLimited &&
            minimumFlexStatus !== 'limited_by_flex_budget' &&
            Number.isFinite(minimumFlexResult.requiredRate) &&
            finalLimitResult.rate + 0.01 < minimumFlexResult.requiredRate;
        flexRate = finalLimitResult.rate;
        if (minimumFlexWasSmoothed) {
            minimumFlexStatus = 'applied_limited_by_final_smoothing';
        }
        if (kuerzungQuelle !== 'Budget-Floor') {
            kuerzungQuelle = 'Glättung (Final-Guardrail)';
        }
    }

    if (
        minimumFlexCanBeLimited
        && minimumFlexStatus !== 'limited_by_flex_budget'
        && minimumFlexStatus !== 'applied_limited_by_final_smoothing'
        && minimumFlexResult.targetUnattainableAtFullFlex === true
    ) {
        minimumFlexStatus = 'limited_by_available_flex';
    }
    writeMinimumFlexDiagnostics(state, {
        ...minimumFlexResult,
        rate: flexRate
    }, minimumFlexStatus);
    assertPolicyOrder(executedSteps);

    return {
        flexRate,
        kuerzungQuelle,
        guardrailDiagnostics,
        policyOrder: Object.freeze({
            schemaVersion: SPENDING_POLICY_ORDER_CONTRACT.schemaVersion,
            executedSteps: Object.freeze([...executedSteps])
        })
    };
}
