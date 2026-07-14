/**
 * Module: Balance Update Pipeline
 * Purpose: Small helpers for the Balance main update cycle.
 */
"use strict";

import { shouldResetGuardrailState } from './balance-guardrail-reset.js';
import { buildBalanceHealthBucketDiagnostics } from './balance-health-bucket.js';
import { ValidationError } from './balance-config.js';

export const BALANCE_UPDATE_STATUS = Object.freeze({
    SUCCESS: 'success',
    VALIDATION_ERROR: 'validation_error',
    ENGINE_ERROR: 'engine_error',
    BLOCKED: 'blocked'
});

export class EngineGateError extends Error {
    constructor(message, reason, context = {}) {
        super(message);
        this.name = 'EngineGateError';
        this.reason = reason;
        this.context = context;
    }
}

function normalizeError(error) {
    if (error instanceof Error) return error;
    return new Error(typeof error === 'string' ? error : 'Unbekannter Fehler');
}

export function createEngineHandshake(engineApi, requiredVersionPrefix) {
    if (!engineApi || typeof engineApi.getVersion !== 'function') {
        throw new EngineGateError(
            'EngineAPI (engine.js) konnte nicht geladen werden oder ist ungültig.',
            'missing_engine'
        );
    }
    if (typeof engineApi.simulateSingleYear !== 'function') {
        throw new EngineGateError(
            'EngineAPI.simulateSingleYear() fehlt. Berechnungen wurden blockiert.',
            'missing_simulation'
        );
    }

    let version;
    try {
        version = engineApi.getVersion();
    } catch (error) {
        throw new EngineGateError(
            'EngineAPI.getVersion() konnte nicht ausgeführt werden.',
            'version_read_failed',
            { originalError: normalizeError(error) }
        );
    }
    if (!version || typeof version.api !== 'string' || typeof version.build !== 'string') {
        throw new EngineGateError(
            'EngineAPI.getVersion() liefert ein ungültiges Format.',
            'invalid_version'
        );
    }
    if (!version.api.startsWith(requiredVersionPrefix)) {
        throw new EngineGateError(
            `Inkompatible Engine-Version erkannt (Geladen: ${version.api}, Erwartet: ${requiredVersionPrefix}x). Berechnungen wurden blockiert.`,
            'incompatible_version',
            { actualApi: version.api, requiredVersionPrefix }
        );
    }

    return Object.freeze({
        engineApi,
        version: Object.freeze({ api: version.api, build: version.build }),
        getVersion: engineApi.getVersion,
        simulateSingleYear: engineApi.simulateSingleYear
    });
}

export function assertActiveEngineHandshake(handshake, currentEngineApi) {
    if (!handshake) {
        throw new EngineGateError(
            'Kein erfolgreicher Engine-Handshake vorhanden. Berechnungen wurden blockiert.',
            'handshake_missing'
        );
    }
    if (
        currentEngineApi !== handshake.engineApi ||
        currentEngineApi?.getVersion !== handshake.getVersion ||
        currentEngineApi?.simulateSingleYear !== handshake.simulateSingleYear
    ) {
        throw new EngineGateError(
            'Der Engine-Vertrag wurde nach dem Handshake verändert. Berechnungen wurden blockiert.',
            'contract_changed'
        );
    }
    return handshake.engineApi;
}

export function createUpdateSuccessResult(payload = {}) {
    return { ok: true, status: BALANCE_UPDATE_STATUS.SUCCESS, ...payload };
}

export function createBlockedUpdateResult(reason, error = null) {
    const result = { ok: false, status: BALANCE_UPDATE_STATUS.BLOCKED, reason };
    if (error) result.error = normalizeError(error);
    return result;
}

export function createUpdateFailureResult(error, { phase = 'update' } = {}) {
    const normalizedError = normalizeError(error);
    let status = BALANCE_UPDATE_STATUS.BLOCKED;
    if (phase === 'validation' && normalizedError instanceof ValidationError) {
        status = BALANCE_UPDATE_STATUS.VALIDATION_ERROR;
    } else if (phase === 'engine') {
        status = BALANCE_UPDATE_STATUS.ENGINE_ERROR;
    }
    return {
        ok: false,
        status,
        reason: normalizedError instanceof EngineGateError ? normalizedError.reason : phase,
        error: normalizedError
    };
}

export function validateBalanceInputs(inputData = {}) {
    const errors = [];
    const minimumFlexAnnual = Number(inputData.minimumFlexAnnual);
    const flexBedarf = Number(inputData.flexBedarf);
    if (Number.isFinite(minimumFlexAnnual) && minimumFlexAnnual < 0) {
        errors.push({
            fieldId: 'minimumFlexAnnual',
            message: 'Mindest-Flex p.a. darf nicht negativ sein.'
        });
    }
    if (
        Number.isFinite(minimumFlexAnnual) &&
        Number.isFinite(flexBedarf) &&
        minimumFlexAnnual > flexBedarf
    ) {
        errors.push({
            fieldId: 'minimumFlexAnnual',
            message: 'Mindest-Flex p.a. darf nicht größer als Flex-Bedarf p.a. sein.'
        });
        errors.push({
            fieldId: 'flexBedarf',
            message: 'Flex-Bedarf p.a. ist die Obergrenze für Mindest-Flex.'
        });
    }
    if (errors.length > 0) {
        throw new ValidationError(errors);
    }
}

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
