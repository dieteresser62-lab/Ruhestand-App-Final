/**
 * Module: Balance Update Pipeline
 * Purpose: Small helpers for the Balance main update cycle.
 */
"use strict";

import { shouldResetGuardrailState } from './balance-guardrail-reset.js';
import { buildBalanceHealthBucketDiagnostics } from './balance-health-bucket.js';

export function prepareEngineLastState(persistentState = {}, inputData = {}) {
    const previousLastState = persistentState.lastState || null;
    const preservedTaxState = previousLastState?.taxState
        ? { taxState: previousLastState.taxState }
        : null;
    return shouldResetGuardrailState(persistentState.inputs, inputData)
        ? preservedTaxState
        : previousLastState;
}

export function buildBalanceRendererPayload(modelResult = {}, inputData = {}) {
    const cumulativeInflationFactor = modelResult?.diagnosis?.keyParams?.cumulativeInflationFactor;
    return {
        ...(modelResult.ui || {}),
        input: inputData,
        healthBucketDiagnostics: buildBalanceHealthBucketDiagnostics(inputData, { cumulativeInflationFactor })
    };
}

export function enrichBalanceDiagnosisPayload({ formattedDiagnosis, modelResult = {}, inputData = {}, threeBucketDiagnosis = null }) {
    if (!formattedDiagnosis) return formattedDiagnosis;
    if (modelResult.ui?.action?.transactionDiagnostics) {
        formattedDiagnosis.transactionDiagnostics = modelResult.ui.action.transactionDiagnostics;
    }
    if (modelResult.ui?.vpw) {
        formattedDiagnosis.keyParams = formattedDiagnosis.keyParams || {};
        formattedDiagnosis.keyParams.vpw = modelResult.ui.vpw;
    }
    formattedDiagnosis.keyParams = formattedDiagnosis.keyParams || {};
    formattedDiagnosis.keyParams.healthBucket = buildBalanceHealthBucketDiagnostics(
        inputData,
        { cumulativeInflationFactor: formattedDiagnosis.keyParams.cumulativeInflationFactor }
    );
    if (threeBucketDiagnosis) {
        formattedDiagnosis.threeBucket = threeBucketDiagnosis;
    }
    return formattedDiagnosis;
}

export function persistBalanceUpdate({ profilverbundRuns, profilverbundHandlers, storageManager, persistentState, inputData, modelResult }) {
    if (profilverbundRuns) {
        profilverbundHandlers.persistProfilverbundProfileStates(profilverbundRuns);
        return;
    }
    storageManager.saveState({ ...persistentState, inputs: inputData, lastState: modelResult.newState });
}

export function calculateExpensesBudget({ fixedIncomeAnnual = 0, monthlyWithdrawal = 0 }) {
    const safeFixedIncomeAnnual = Number.isFinite(fixedIncomeAnnual) ? fixedIncomeAnnual : 0;
    const safeMonthlyWithdrawal = Number.isFinite(monthlyWithdrawal) ? monthlyWithdrawal : 0;
    const monthlyBudget = safeMonthlyWithdrawal + (safeFixedIncomeAnnual / 12);
    return {
        monthlyBudget,
        annualBudget: monthlyBudget * 12
    };
}
