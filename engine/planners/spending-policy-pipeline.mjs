import { CONFIG } from '../config.mjs';
import { applyFinalRateLimits } from './final-rate-policy.mjs';
import { applyFlexBudgetCap } from './flex-budget-policy.mjs';
import { SAFETY_RATE_TOLERANCE_PCT } from './flex-rate-policy.mjs';
import { ALARM_WEALTH_SUFFICIENT_FACTOR_THRESHOLD } from './alarm-policy.mjs';
import { applyMinimumFlexFloor, writeMinimumFlexDiagnostics } from './minimum-flex-policy.mjs';
import { applyGuardrails } from './spending-guardrails.mjs';

export const SPENDING_POLICY_ORDER_CONTRACT = Object.freeze({
    schemaVersion: 'SpendingPolicyOrderV2',
    steps: Object.freeze([
        'alarm',
        'guardrails',
        'minimum_flex',
        'flex_budget',
        'final_smoothing',
        'safety_cap'
    ])
});

const SAFETY_SOURCE_PRIORITY = Object.freeze({
    bear_deep: 1,
    alarm: 2,
    flex_rate_hard_cap: 3,
    spending_guardrail: 4,
    severe_bear_wealth_emergency: 5
});
const SAFETY_SOURCE_ANCHOR = Object.freeze({
    bear_deep: 'post_internal_smoothing_and_flex_rate_hard_caps',
    alarm: 'post_internal_smoothing_and_flex_rate_hard_caps',
    flex_rate_hard_cap: 'post_internal_smoothing_and_flex_rate_hard_caps',
    spending_guardrail: 'post_spending_guardrails',
    severe_bear_wealth_emergency: 'post_total_wealth_drawdown_gate'
});

function clampRate(value) {
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, value));
}

function normalizeSafetyCandidate(evidence) {
    if (evidence?.active !== true) return null;
    const candidateFlexRatePct = clampRate(evidence.candidateFlexRatePct);
    const source = typeof evidence.source === 'string' ? evidence.source : null;
    const anchorStage = typeof evidence.anchorStage === 'string' ? evidence.anchorStage : null;
    if (
        candidateFlexRatePct === null
        || !SAFETY_SOURCE_PRIORITY[source]
        || anchorStage !== SAFETY_SOURCE_ANCHOR[source]
    ) {
        throw new RangeError('Aktive Safety-Evidenz muss endliche Rate, bekannte Quelle und Anchor-Stage enthalten.');
    }
    return { source, candidateFlexRatePct, anchorStage, evidence };
}

function selectStrongestSafetyCandidate(candidates) {
    return candidates.reduce((selected, candidate) => {
        if (!selected) return candidate;
        if (candidate.candidateFlexRatePct + SAFETY_RATE_TOLERANCE_PCT < selected.candidateFlexRatePct) {
            return candidate;
        }
        if (Math.abs(candidate.candidateFlexRatePct - selected.candidateFlexRatePct) <= SAFETY_RATE_TOLERANCE_PCT) {
            return SAFETY_SOURCE_PRIORITY[candidate.source] > SAFETY_SOURCE_PRIORITY[selected.source]
                ? candidate
                : selected;
        }
        return selected;
    }, null);
}

function evaluateSevereFlexEmergency(state, market, alarmStatus) {
    const rawDrawdownRatio = state?.keyParams?.realerDepotDrawdown;
    const thresholdRatio = CONFIG.THRESHOLDS?.ALARM?.realDrawdown;
    if (!Number.isFinite(rawDrawdownRatio)) {
        throw new RangeError('Realer Gesamtvermoegensdrawdown muss fuer das Safety-Gate als endliches Ratio vorliegen.');
    }
    if (!Number.isFinite(thresholdRatio) || thresholdRatio < 0 || thresholdRatio > 1) {
        throw new RangeError('Safety-Gate-Schwelle fuer realen Gesamtvermoegensdrawdown ist ungueltig.');
    }

    // Before the yearly peak update, a new real-wealth high can transiently
    // produce a negative raw ratio. Semantically this is a 0% drawdown.
    const drawdownRatio = Math.max(0, rawDrawdownRatio);
    const marketExtremeBear = market?.sKey === 'bear_deep';
    const active = marketExtremeBear && drawdownRatio > thresholdRatio;
    const withdrawalBurdenFactor = Number.isFinite(state?.keyParams?.withdrawalBurdenFactor)
        ? Math.max(0, Math.min(1, state.keyParams.withdrawalBurdenFactor))
        : (Number.isFinite(state?.keyParams?.wealthReductionFactor)
            ? Math.max(0, Math.min(1, state.keyParams.wealthReductionFactor))
            : null);

    return {
        active,
        marketExtremeBear,
        realTotalWealthDrawdownRatio: drawdownRatio,
        realTotalWealthDrawdownThresholdRatio: thresholdRatio,
        minimumFlexOverrideAllowed: active,
        alarmActive: alarmStatus?.active === true,
        withdrawalBurdenFactor,
        alarmWealthSufficient: withdrawalBurdenFactor === null
            ? null
            : withdrawalBurdenFactor < ALARM_WEALTH_SUFFICIENT_FACTOR_THRESHOLD,
        alarmWealthSufficientThreshold: ALARM_WEALTH_SUFFICIENT_FACTOR_THRESHOLD,
        withdrawalBurdenGateRole: 'diagnostic_only'
    };
}

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
    const safetyCandidates = [];
    const initialSafetyCandidate = normalizeSafetyCandidate(initialPolicyResult.safetyEvidence);
    if (initialSafetyCandidate) safetyCandidates.push(initialSafetyCandidate);
    const severeFlexEmergency = evaluateSevereFlexEmergency(state, market, alarmStatus);
    const executedSteps = ['alarm'];
    let finalLimitingPolicy = initialSafetyCandidate?.source === 'alarm'
        ? 'alarm'
        : 'initial_flex_policy';

    executedSteps.push('guardrails');
    const guardrailInputRate = flexRate;
    let guardrailRateCapApplied = false;
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
        guardrailRateCapApplied = Number.isFinite(guardrailInputRate)
            && Number.isFinite(flexRate)
            && flexRate + SAFETY_RATE_TOLERANCE_PCT < guardrailInputRate;
        if (guardrailRateCapApplied) {
            safetyCandidates.push({
                source: 'spending_guardrail',
                candidateFlexRatePct: flexRate,
                anchorStage: 'post_spending_guardrails',
                evidence: {
                    rateCapApplied: true,
                    inputFlexRatePct: guardrailInputRate,
                    outputFlexRatePct: flexRate
                }
            });
            finalLimitingPolicy = 'spending_guardrail';
        }
    }
    guardrailDiagnostics = {
        ...guardrailDiagnostics,
        rateCap: {
            rateCapApplied: guardrailRateCapApplied,
            inputFlexRatePct: Number.isFinite(guardrailInputRate) ? guardrailInputRate : null,
            outputFlexRatePct: Number.isFinite(flexRate) ? flexRate : null,
            tolerancePct: SAFETY_RATE_TOLERANCE_PCT
        }
    };

    const normalSafetyCandidate = selectStrongestSafetyCandidate(safetyCandidates);
    const selectedSafetyCandidate = severeFlexEmergency.active
        ? {
            source: 'severe_bear_wealth_emergency',
            candidateFlexRatePct: 0,
            anchorStage: 'post_total_wealth_drawdown_gate',
            evidence: severeFlexEmergency
        }
        : normalSafetyCandidate;

    executedSteps.push('minimum_flex');
    const minimumFlexResult = applyMinimumFlexFloor(
        flexRate,
        { ...params, state, alarmStatus, kuerzungQuelle },
        addDecision
    );
    flexRate = minimumFlexResult.rate;
    let minimumFlexStatus = minimumFlexResult.status;
    const minimumFlexStatusBeforeSafetyOverride = minimumFlexStatus;
    let minimumFlexCanBeLimited = minimumFlexResult.minimumFlexAnnual > 0
        && minimumFlexResult.flexAnnual > 0
        && minimumFlexResult.status !== 'blocked_emergency';
    if (minimumFlexResult.applied) finalLimitingPolicy = 'minimum_flex';

    const safetyCapRawCandidateFlexRatePct = selectedSafetyCandidate?.candidateFlexRatePct ?? null;
    let safetyCapFlexRatePct = safetyCapRawCandidateFlexRatePct;
    let minimumFlexFloorAppliedToSafetyCap = false;
    if (
        selectedSafetyCandidate
        && !severeFlexEmergency.active
        && minimumFlexCanBeLimited
        && Number.isFinite(minimumFlexResult.requiredRate)
        && safetyCapFlexRatePct + SAFETY_RATE_TOLERANCE_PCT < minimumFlexResult.requiredRate
    ) {
        safetyCapFlexRatePct = minimumFlexResult.requiredRate;
        minimumFlexFloorAppliedToSafetyCap = true;
    }
    if (severeFlexEmergency.active) {
        minimumFlexStatus = 'overridden_by_severe_flex_emergency';
        minimumFlexCanBeLimited = false;
    }

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
        finalLimitingPolicy = 'flex_budget';
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
        finalLimitingPolicy = 'final_smoothing';
    }

    executedSteps.push('safety_cap');
    const finalRateBeforeSafetyCapPct = flexRate;
    let safetyCapEffectiveFlexRatePct = safetyCapFlexRatePct;
    let safetyCapDeferredByRateLimit = false;
    if (
        selectedSafetyCandidate
        && !severeFlexEmergency.active
        && Number.isFinite(safetyCapFlexRatePct)
    ) {
        const rateLimitedTarget = applyFinalRateLimits(
            state.flexRate ?? 100,
            safetyCapFlexRatePct,
            market,
            () => {},
            wealthFactor
        );
        safetyCapEffectiveFlexRatePct = Math.max(
            safetyCapFlexRatePct,
            Number.isFinite(rateLimitedTarget.rate) ? rateLimitedTarget.rate : safetyCapFlexRatePct
        );
        safetyCapDeferredByRateLimit = safetyCapEffectiveFlexRatePct
            > safetyCapFlexRatePct + SAFETY_RATE_TOLERANCE_PCT
            && finalRateBeforeSafetyCapPct
                > safetyCapFlexRatePct + SAFETY_RATE_TOLERANCE_PCT;
    }
    const safetyCapApplied = selectedSafetyCandidate !== null
        && Number.isFinite(safetyCapEffectiveFlexRatePct)
        && flexRate > safetyCapEffectiveFlexRatePct + SAFETY_RATE_TOLERANCE_PCT;
    const safetyCapBindingApplied = safetyCapApplied || severeFlexEmergency.active;
    if (selectedSafetyCandidate && Number.isFinite(safetyCapEffectiveFlexRatePct)) {
        flexRate = Math.min(flexRate, safetyCapEffectiveFlexRatePct);
    }
    if (severeFlexEmergency.active) {
        flexRate = 0;
        finalLimitingPolicy = 'safety_cap';
        kuerzungQuelle = 'Safety-Cap (schwere Flex-Notlage)';
        addDecision(
            'Schwere Flex-Notlage',
            `Tiefer Bärenmarkt und realer Drawdown des aktiven Gesamtvermögens über ${(severeFlexEmergency.realTotalWealthDrawdownThresholdRatio * 100).toFixed(1)}%: Flex einschließlich Mindest-Flex auf 0% begrenzt; Floor bleibt unverändert.`,
            'active',
            'alarm'
        );
    } else if (safetyCapApplied) {
        finalLimitingPolicy = 'safety_cap';
        kuerzungQuelle = `Safety-Cap (${selectedSafetyCandidate.source})`;
        addDecision(
            'Safety-Obergrenze',
            `Strukturelles Signal ${selectedSafetyCandidate.source} begrenzt die finale Flex-Rate auf ${safetyCapEffectiveFlexRatePct.toFixed(1)}% (Policy-Ziel ${safetyCapFlexRatePct.toFixed(1)}%; bestehende Änderungsgrenzen bleiben erhalten).`,
            'active',
            'guardrail'
        );
    } else if (safetyCapDeferredByRateLimit && finalRateBeforeSafetyCapPct > safetyCapFlexRatePct + SAFETY_RATE_TOLERANCE_PCT) {
        addDecision(
            'Safety-Ziel geglättet',
            `Policy-Ziel ${safetyCapFlexRatePct.toFixed(1)}% wird wegen der bestehenden Abwärtsgrenze schrittweise erreicht; aktuell ${flexRate.toFixed(1)}%.`,
            'active',
            'guardrail'
        );
    }

    const nextFlexRateSmoothingReferencePct = severeFlexEmergency.active
        ? finalRateBeforeSafetyCapPct
        : flexRate;

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
    Object.assign(state.keyParams, {
        safetyCapActive: selectedSafetyCandidate !== null,
        safetyCapFlexRatePct,
        safetyCapEffectiveFlexRatePct,
        safetyCapRawCandidateFlexRatePct,
        safetyCapSource: selectedSafetyCandidate?.source ?? null,
        safetyCapAnchorStage: selectedSafetyCandidate?.anchorStage ?? null,
        safetyCapApplied: safetyCapBindingApplied,
        safetyCapBinding: {
            active: selectedSafetyCandidate !== null,
            source: selectedSafetyCandidate?.source ?? null,
            rawCandidateFlexRatePct: safetyCapRawCandidateFlexRatePct,
            policyTargetFlexRatePct: safetyCapFlexRatePct,
            effectiveCapFlexRatePct: safetyCapEffectiveFlexRatePct,
            minimumFlexFloorApplied: minimumFlexFloorAppliedToSafetyCap,
            finalRateBeforeCapPct: Number.isFinite(finalRateBeforeSafetyCapPct)
                ? finalRateBeforeSafetyCapPct
                : null,
            finalRateAfterCapPct: Number.isFinite(flexRate) ? flexRate : null,
            capApplied: safetyCapBindingApplied,
            deferredByRateLimit: safetyCapDeferredByRateLimit,
            tolerancePct: SAFETY_RATE_TOLERANCE_PCT
        },
        safetyCapDeferredByRateLimit,
        spendingGuardrailRateCapApplied: guardrailRateCapApplied,
        severeFlexEmergencyActive: severeFlexEmergency.active,
        marketExtremeBear: severeFlexEmergency.marketExtremeBear,
        realTotalWealthDrawdownRatio: severeFlexEmergency.realTotalWealthDrawdownRatio,
        realTotalWealthDrawdownThresholdRatio: severeFlexEmergency.realTotalWealthDrawdownThresholdRatio,
        minimumFlexOverrideAllowed: severeFlexEmergency.minimumFlexOverrideAllowed,
        minimumFlexStatusBeforeSafetyOverride: severeFlexEmergency.active
            ? minimumFlexStatusBeforeSafetyOverride
            : null,
        alarmActiveDiagnostic: severeFlexEmergency.alarmActive,
        withdrawalBurdenFactor: severeFlexEmergency.withdrawalBurdenFactor,
        alarmWealthSufficient: severeFlexEmergency.alarmWealthSufficient,
        alarmWealthSufficientThreshold: severeFlexEmergency.alarmWealthSufficientThreshold,
        withdrawalBurdenGateRole: severeFlexEmergency.withdrawalBurdenGateRole,
        finalLimitingPolicy,
        floorProtectionPolicy: 'planned_floor_unchanged',
        nextFlexRateSmoothingReferencePct
    });
    assertPolicyOrder(executedSteps);

    return {
        flexRate,
        kuerzungQuelle,
        guardrailDiagnostics,
        safetyCapActive: selectedSafetyCandidate !== null,
        safetyCapFlexRatePct,
        safetyCapEffectiveFlexRatePct,
        safetyCapRawCandidateFlexRatePct,
        safetyCapSource: selectedSafetyCandidate?.source ?? null,
        safetyCapBinding: state.keyParams.safetyCapBinding,
        safetyCapAnchorStage: selectedSafetyCandidate?.anchorStage ?? null,
        safetyCapApplied: safetyCapBindingApplied,
        safetyCapDeferredByRateLimit,
        severeFlexEmergencyActive: severeFlexEmergency.active,
        marketExtremeBear: severeFlexEmergency.marketExtremeBear,
        realTotalWealthDrawdownRatio: severeFlexEmergency.realTotalWealthDrawdownRatio,
        realTotalWealthDrawdownThresholdRatio: severeFlexEmergency.realTotalWealthDrawdownThresholdRatio,
        minimumFlexOverrideAllowed: severeFlexEmergency.minimumFlexOverrideAllowed,
        alarmActive: severeFlexEmergency.alarmActive,
        withdrawalBurdenFactor: severeFlexEmergency.withdrawalBurdenFactor,
        alarmWealthSufficient: severeFlexEmergency.alarmWealthSufficient,
        alarmWealthSufficientThreshold: severeFlexEmergency.alarmWealthSufficientThreshold,
        withdrawalBurdenGateRole: severeFlexEmergency.withdrawalBurdenGateRole,
        finalLimitingPolicy,
        floorProtectionPolicy: 'planned_floor_unchanged',
        nextFlexRateSmoothingReferencePct,
        policyOrder: Object.freeze({
            schemaVersion: SPENDING_POLICY_ORDER_CONTRACT.schemaVersion,
            executedSteps: Object.freeze([...executedSteps])
        })
    };
}
