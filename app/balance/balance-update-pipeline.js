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

export const BALANCE_UPDATE_MODE = Object.freeze({
    PREVIEW: 'preview',
    PERSIST_INPUTS: 'persist_inputs',
    COMMIT_PERIOD: 'commit_period'
});

export const BALANCE_STATE_LIFECYCLE_KEY = 'balanceStateLifecycle';

export class EngineGateError extends Error {
    constructor(message, reason, context = {}) {
        super(message);
        this.name = 'EngineGateError';
        this.reason = reason;
        this.context = context;
    }
}

export class BalanceStateLifecycleError extends Error {
    constructor(message, reason, context = {}) {
        super(message);
        this.name = 'BalanceStateLifecycleError';
        this.reason = reason;
        this.context = context;
    }
}

function normalizeError(error) {
    if (error instanceof Error) return error;
    return new Error(typeof error === 'string' ? error : 'Unbekannter Fehler');
}

function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function assertJsonCompatibleBalanceValue(value, seen = new WeakSet()) {
    if (value === null) return;
    if (value === undefined) {
        throw new BalanceStateLifecycleError(
            'Der Balance-State enthaelt einen nicht per JSON speicherbaren undefined-Wert.',
            'non_json_state'
        );
    }
    if (typeof value === 'number') {
        if (Number.isFinite(value)) return;
        throw new BalanceStateLifecycleError(
            'Der Balance-State enthaelt eine nicht per JSON speicherbare Zahl.',
            'non_json_state'
        );
    }
    if (typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value !== 'object') {
        throw new BalanceStateLifecycleError(
            `Der Balance-State enthaelt einen nicht per JSON speicherbaren Wert vom Typ ${typeof value}.`,
            'non_json_state'
        );
    }
    if (seen.has(value)) {
        throw new BalanceStateLifecycleError(
            'Der Balance-State enthaelt eine zyklische Struktur und kann nicht sicher verarbeitet werden.',
            'fingerprint_cycle'
        );
    }
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
        throw new BalanceStateLifecycleError(
            `Der Balance-State enthaelt ein nicht unterstuetztes Laufzeitobjekt ${value.constructor?.name || 'Object'}.`,
            'non_json_state'
        );
    }
    seen.add(value);
    if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index++) {
            if (!Object.prototype.hasOwnProperty.call(value, index)) {
                throw new BalanceStateLifecycleError(
                    'Der Balance-State enthaelt ein nicht per JSON eindeutig speicherbares Array mit Luecken.',
                    'non_json_state'
                );
            }
        }
        const hasCustomArrayKey = Object.keys(value).some(key => {
            const index = Number(key);
            return !Number.isSafeInteger(index) || index < 0 || index >= value.length || String(index) !== key;
        });
        if (hasCustomArrayKey) {
            throw new BalanceStateLifecycleError(
                'Der Balance-State enthaelt ein Array mit nicht per JSON erhaltenen Zusatzfeldern.',
                'non_json_state'
            );
        }
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new BalanceStateLifecycleError(
            'Der Balance-State enthaelt nicht per JSON speicherbare Symbol-Schluessel.',
            'non_json_state'
        );
    }
    Object.keys(value).forEach(key => assertJsonCompatibleBalanceValue(value[key], seen));
    seen.delete(value);
}

function normalizeFingerprintValue(value) {
    if (value === null) return null;
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) {
        return value.map(entry => normalizeFingerprintValue(entry));
    }
    const normalized = {};
    Object.keys(value).sort().forEach(key => {
        normalized[key] = normalizeFingerprintValue(value[key]);
    });
    return normalized;
}

export function createBalanceFingerprint(value) {
    assertJsonCompatibleBalanceValue(value);
    const serialized = JSON.stringify(normalizeFingerprintValue(value));
    let hash = 0x811c9dc5;
    for (let index = 0; index < serialized.length; index++) {
        hash ^= serialized.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function selectPersistentFinancialInputs(inputs) {
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return null;
    return Object.fromEntries(
        Object.entries(inputs)
            .filter(([key]) => key !== 'depotLastUpdate')
    );
}

/**
 * Fingerprints only persisted JSON data that can influence the financial
 * candidate. Workflow/UI metadata and depotLastUpdate are intentionally
 * excluded; period validity is guarded separately by assertBalancePeriodCommit.
 */
export function createBalanceCommitBaseFingerprint({
    persistentState = {},
    profilverbundProfiles = []
} = {}) {
    const profiles = Array.isArray(profilverbundProfiles)
        ? profilverbundProfiles
            .map(entry => {
                const balanceState = entry?.balanceState || {};
                return {
                    profileId: entry?.profileId || null,
                    inputs: selectPersistentFinancialInputs(balanceState.inputs),
                    lastState: balanceState.lastState || null,
                    profilverbundHouseholdInputs: selectPersistentFinancialInputs(
                        balanceState.profilverbundHouseholdInputs
                    ),
                    profilverbundHouseholdLastState:
                        balanceState.profilverbundHouseholdLastState || null
                };
            })
            .sort((left, right) => String(left.profileId).localeCompare(String(right.profileId)))
        : [];

    return createBalanceFingerprint({
        inputs: selectPersistentFinancialInputs(persistentState?.inputs),
        lastState: persistentState?.lastState || null,
        profilverbundProfiles: profiles
    });
}

export function cloneBalanceState(value) {
    if (value === null) return value;
    assertJsonCompatibleBalanceValue(value);
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

export function resolveBalanceUpdateRequest(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new BalanceStateLifecycleError(
            'Der Balance-Update-Vertrag ist ungueltig.',
            'invalid_update_request'
        );
    }

    const hasMode = hasOwn(options, 'mode');
    const hasLegacyPersist = hasOwn(options, 'persist');
    if (hasMode && hasLegacyPersist) {
        throw new BalanceStateLifecycleError(
            'Balance-Update darf mode und persist nicht kombinieren.',
            'ambiguous_update_request'
        );
    }

    if (hasLegacyPersist) {
        throw new BalanceStateLifecycleError(
            'Der Legacy-Parameter persist wird nicht mehr unterstuetzt. Bitte einen expliziten mode verwenden.',
            'legacy_persist_unsupported'
        );
    }
    const mode = hasMode ? options.mode : BALANCE_UPDATE_MODE.PREVIEW;
    if (!Object.values(BALANCE_UPDATE_MODE).includes(mode)) {
        throw new BalanceStateLifecycleError(
            `Unbekannter Balance-Update-Modus: ${String(mode)}`,
            'invalid_update_mode',
            { mode }
        );
    }

    const periodId = typeof options.periodId === 'string' ? options.periodId.trim() : '';
    if (mode === BALANCE_UPDATE_MODE.COMMIT_PERIOD && !periodId) {
        throw new BalanceStateLifecycleError(
            'Ein periodengebundener Balance-Commit benoetigt eine Perioden-ID.',
            'period_required'
        );
    }
    if (mode !== BALANCE_UPDATE_MODE.COMMIT_PERIOD && periodId) {
        throw new BalanceStateLifecycleError(
            'Eine Perioden-ID ist nur im Modus commit_period zulaessig.',
            'period_not_allowed'
        );
    }

    return Object.freeze({
        mode,
        periodId: periodId || null
    });
}

export function assertBalanceCandidateFresh(expectedFingerprint, currentFingerprint) {
    if (
        typeof expectedFingerprint !== 'string'
        || !expectedFingerprint
        || typeof currentFingerprint !== 'string'
        || !currentFingerprint
        || expectedFingerprint !== currentFingerprint
    ) {
        throw new BalanceStateLifecycleError(
            'Der berechnete Balance-Candidate basiert nicht mehr auf dem aktuellen Basis-State.',
            'stale_candidate',
            { expectedFingerprint, currentFingerprint }
        );
    }
    return currentFingerprint;
}

export function assertBalancePeriodCommit(persistentState = {}, periodId) {
    const normalizedPeriodId = typeof periodId === 'string' ? periodId.trim() : '';
    if (!normalizedPeriodId) {
        throw new BalanceStateLifecycleError(
            'Ein periodengebundener Balance-Commit benoetigt eine Perioden-ID.',
            'period_required'
        );
    }

    const annualMetadata = persistentState?.annualPeriodMetadata || {};
    const lifecycle = persistentState?.[BALANCE_STATE_LIFECYCLE_KEY] || {};
    if (
        annualMetadata.lastCommittedPeriod === normalizedPeriodId
        || lifecycle.lastCommittedPeriod === normalizedPeriodId
    ) {
        throw new BalanceStateLifecycleError(
            `Die Balance-Periode ${normalizedPeriodId} wurde bereits committed.`,
            'period_already_committed',
            { periodId: normalizedPeriodId }
        );
    }

    const pending = annualMetadata.pendingCommit;
    if (!pending || typeof pending !== 'object') {
        throw new BalanceStateLifecycleError(
            `Fuer die Balance-Periode ${normalizedPeriodId} ist kein Commit vorbereitet.`,
            'period_not_pending',
            { periodId: normalizedPeriodId }
        );
    }
    if (pending.periodId !== normalizedPeriodId) {
        throw new BalanceStateLifecycleError(
            `Vorbereitete Periode ${String(pending.periodId)} passt nicht zu ${normalizedPeriodId}.`,
            'period_mismatch',
            { periodId: normalizedPeriodId, pendingPeriodId: pending.periodId }
        );
    }
    if (typeof pending.snapshotId !== 'string' || !pending.snapshotId.trim()) {
        throw new BalanceStateLifecycleError(
            'Der periodengebundene Balance-Commit hat keinen bestaetigten Recovery-Snapshot.',
            'snapshot_required',
            { periodId: normalizedPeriodId }
        );
    }
    if (!['writes_started', 'validating'].includes(pending.phase)) {
        throw new BalanceStateLifecycleError(
            `Die Balance-Periode ${normalizedPeriodId} ist nicht in einer commitfaehigen Phase.`,
            'invalid_commit_phase',
            { periodId: normalizedPeriodId, phase: pending.phase }
        );
    }

    return pending;
}

export function assertBalanceCommitStillCurrent({
    expectedBaseFingerprint,
    currentBaseFingerprint,
    currentPersistentState = {},
    periodId
} = {}) {
    assertBalanceCandidateFresh(expectedBaseFingerprint, currentBaseFingerprint);
    assertBalancePeriodCommit(currentPersistentState, periodId);
    return currentPersistentState;
}

function buildBalanceLifecycleMetadata(persistentState, periodId, fingerprints = {}) {
    return {
        ...(persistentState?.[BALANCE_STATE_LIFECYCLE_KEY] || {}),
        schemaVersion: 1,
        lastCommittedPeriod: periodId,
        inputFingerprint: fingerprints.inputFingerprint || null,
        baseStateFingerprint: fingerprints.baseStateFingerprint || null,
        candidateStateFingerprint: fingerprints.candidateStateFingerprint || null
    };
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
    const previousLastState = cloneBalanceState(persistentState.lastState || null);
    const preservedTaxState = previousLastState?.taxState
        ? { taxState: cloneBalanceState(previousLastState.taxState) }
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

export function persistBalanceUpdate({
    mode = BALANCE_UPDATE_MODE.PREVIEW,
    periodId = null,
    profilverbundRuns,
    profilverbundHandlers,
    storageManager,
    persistentState = {},
    inputData = {},
    modelResult = {},
    fingerprints = {}
}) {
    if (mode === BALANCE_UPDATE_MODE.PREVIEW) {
        return { persisted: false, kind: BALANCE_UPDATE_MODE.PREVIEW };
    }

    const hasProfilverbundRuns = profilverbundRuns !== null && profilverbundRuns !== undefined;
    if (
        hasProfilverbundRuns
        && (!Array.isArray(profilverbundRuns) || profilverbundRuns.length < 1)
    ) {
        throw new BalanceStateLifecycleError(
            'Profilverbund-Persistenz benoetigt mindestens einen gueltigen Profil-Run.',
            'profile_runs_required'
        );
    }

    if (mode === BALANCE_UPDATE_MODE.PERSIST_INPUTS) {
        if (hasProfilverbundRuns) {
            profilverbundHandlers.persistProfilverbundInputs(profilverbundRuns);
        } else {
            storageManager.saveState({
                ...persistentState,
                inputs: cloneBalanceState(inputData)
            });
        }
        return { persisted: true, kind: BALANCE_UPDATE_MODE.PERSIST_INPUTS };
    }

    if (mode !== BALANCE_UPDATE_MODE.COMMIT_PERIOD) {
        throw new BalanceStateLifecycleError(
            `Unbekannter Persistenzmodus: ${String(mode)}`,
            'invalid_update_mode',
            { mode }
        );
    }

    assertBalancePeriodCommit(persistentState, periodId);
    if (!modelResult?.newState || typeof modelResult.newState !== 'object') {
        throw new BalanceStateLifecycleError(
            'Der periodengebundene Balance-Commit hat keinen gueltigen Candidate-State.',
            'candidate_required',
            { periodId }
        );
    }

    const lifecycle = buildBalanceLifecycleMetadata(persistentState, periodId, fingerprints);
    if (hasProfilverbundRuns) {
        profilverbundHandlers.persistProfilverbundProfileStates(profilverbundRuns, {
            lifecycle
        });
    } else {
        storageManager.saveState({
            ...persistentState,
            inputs: cloneBalanceState(inputData),
            lastState: cloneBalanceState(modelResult.newState),
            [BALANCE_STATE_LIFECYCLE_KEY]: lifecycle
        });
    }
    return {
        persisted: true,
        kind: BALANCE_UPDATE_MODE.COMMIT_PERIOD,
        lifecycle
    };
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
