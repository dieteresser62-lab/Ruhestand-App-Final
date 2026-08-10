// @ts-check

import {
    getActiveProfileId,
    getCurrentProfileId,
    saveCurrentProfileFromLocalStorage
} from '../profile/profile-storage.js';
import { PROFILE_STORAGE_KEYS, PROFILE_TRANCHES_KEY } from '../profile/profile-state.js';
import { PersistenceFacade, persistenceStorage } from '../shared/persistence-facade.js';
import { normalizeTrancheCollection } from '../../types/tranche-contract.js';
import { loadTranchesFromStorage, saveTranchesToStorage } from './tranchen-manager-state.js';

export const TRANCHE_RECONCILIATION_SCHEMA_VERSION = 1;
export const TRANCHE_RECONCILIATION_REGISTRY_FIELD = 'trancheReconciliation';
export const RECONCILIATION_EVENT_TYPES = Object.freeze({
    SALE: 'sale_reconciled',
    CASH_CONFIRMATION: 'cash_posting_confirmed',
    CASH_CORRECTION: 'cash_posting_corrected'
});
export const RECONCILIATION_CASH_STATUSES = Object.freeze({
    PENDING: 'pending_manual_posting',
    ALREADY_REFLECTED: 'confirmed_already_reflected',
    LEGACY_UNKNOWN: 'legacy_unknown',
    MANUALLY_CONFIRMED: 'confirmed_manual_posting',
    CORRECTED: 'confirmed_corrected'
});

const SHARE_EPSILON = 1e-10;
const SALE_ID_MAX_LENGTH = 128;
const CONFIRMATION_ID_MAX_LENGTH = 149;
const CORRECTION_ID_MAX_LENGTH = 154;
const CASH_CONFIRMATION_PREFIX = 'cash-confirmation:v1:';
const CASH_CORRECTION_PREFIX = 'cash-correction:v1:';
const MAX_CORRECTION_REVISION = 999999;

export class TrancheReconciliationError extends Error {
    constructor(code, message, options = {}) {
        super(message);
        this.name = 'TrancheReconciliationError';
        this.code = code;
        this.field = options.field || null;
        this.retryable = options.retryable === true;
        this.details = options.details || null;
        if (options.cause) this.cause = options.cause;
    }
}

function fail(code, message, options = {}) {
    throw new TrancheReconciliationError(code, message, options);
}

function hasOwn(value, field) {
    return Boolean(value) && Object.prototype.hasOwnProperty.call(value, field);
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeRequiredId(value, field, options = {}) {
    const {
        maxLength = SALE_ID_MAX_LENGTH,
        eventType = RECONCILIATION_EVENT_TYPES.SALE,
        allowReservedSalePrefix = true
    } = options;
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized || /[\u0000-\u001f\u007f]/.test(normalized)) {
        fail(
            'RECONCILIATION_ID_INVALID',
            `${eventType}.${field} muss eine nicht leere, stabile ID ohne Steuerzeichen sein.`,
            { field }
        );
    }
    if (normalized.length > maxLength) {
        fail(
            'RECONCILIATION_ID_INVALID',
            `${eventType}.${field} hat ${normalized.length} Zeichen; für diesen Eventtyp sind maximal ${maxLength} erlaubt.`,
            { field, details: { eventType, actualLength: normalized.length, maxLength } }
        );
    }
    if (!allowReservedSalePrefix
        && (normalized.startsWith('cash-confirmation:') || normalized.startsWith('cash-correction:'))) {
        fail(
            'RECONCILIATION_ACTION_ID_RESERVED',
            `${field} verwendet einen für Cash-Folgeereignisse reservierten Namensraum.`,
            { field }
        );
    }
    return normalized;
}

function normalizeTimestamp(value, field) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized || !/^\d{4}-\d{2}-\d{2}T/.test(normalized) || !Number.isFinite(Date.parse(normalized))) {
        fail('RECONCILIATION_TIMESTAMP_INVALID', `${field} muss ein gültiger ISO-Zeitpunkt sein.`, { field });
    }
    return normalized;
}

function normalizeCashStatus(value) {
    const normalized = value === undefined || value === null || value === ''
        ? RECONCILIATION_CASH_STATUSES.PENDING
        : String(value).trim();
    if (normalized !== RECONCILIATION_CASH_STATUSES.PENDING
        && normalized !== RECONCILIATION_CASH_STATUSES.ALREADY_REFLECTED) {
        fail(
            'RECONCILIATION_CASH_STATUS_INVALID',
            'cashStatus muss pending_manual_posting oder confirmed_already_reflected sein.',
            { field: 'cashStatus' }
        );
    }
    return normalized;
}

function normalizeCorrectionRevision(value) {
    if (typeof value !== 'number' || !Number.isInteger(value)
        || value < 1 || value > MAX_CORRECTION_REVISION) {
        fail(
            'RECONCILIATION_CORRECTION_REVISION_INVALID',
            `correctionRevision muss eine kanonische Ganzzahl von 1 bis ${MAX_CORRECTION_REVISION} sein.`,
            { field: 'correctionRevision' }
        );
    }
    return value;
}

function normalizeReason(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
        fail(
            'RECONCILIATION_CORRECTION_REASON_REQUIRED',
            'correctionReason darf nach dem Kürzen nicht leer sein.',
            { field: 'correctionReason' }
        );
    }
    return normalized;
}

function sameEuroCent(left, right) {
    return Math.round(Number(left) * 100) === Math.round(Number(right) * 100);
}

function normalizeNumber(value, field, options = {}) {
    const { min = null, greaterThan = null, optional = false } = options;
    if (optional && (value === '' || value === null || value === undefined)) return null;
    if (value === '' || value === null || value === undefined) {
        fail('RECONCILIATION_NUMBER_INVALID', `${field} muss eine endliche Zahl sein.`, { field });
    }
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) {
        fail('RECONCILIATION_NUMBER_INVALID', `${field} muss eine endliche Zahl sein.`, { field });
    }
    if (greaterThan !== null && number <= greaterThan) {
        fail('RECONCILIATION_NUMBER_OUT_OF_RANGE', `${field} muss größer als ${greaterThan} sein.`, { field });
    }
    if (min !== null && number < min) {
        fail('RECONCILIATION_NUMBER_OUT_OF_RANGE', `${field} muss mindestens ${min} sein.`, { field });
    }
    return number;
}

function normalizeExecutionDate(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    const date = match ? new Date(`${normalized}T00:00:00.000Z`) : null;
    if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
        fail(
            'RECONCILIATION_DATE_INVALID',
            'executedAt muss ein gültiger Kalendertag im Format JJJJ-MM-TT sein.',
            { field: 'executedAt' }
        );
    }
    return normalized;
}

function normalizeRecommendation(raw = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const sharesSold = normalizeNumber(raw.sharesSold, 'recommendation.sharesSold', {
        optional: true,
        greaterThan: 0
    });
    const grossProceeds = normalizeNumber(raw.grossProceeds, 'recommendation.grossProceeds', {
        optional: true,
        min: 0
    });
    if (sharesSold === null && grossProceeds === null) return null;
    return {
        ...(sharesSold !== null ? { sharesSold } : {}),
        ...(grossProceeds !== null ? { grossProceeds } : {})
    };
}

export function normalizeReconciliationAction(raw, expectedProfileId = null) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        fail('RECONCILIATION_ACTION_INVALID', 'Die tatsächliche Ausführung muss als Objekt angegeben werden.');
    }
    const actionId = normalizeRequiredId(raw.actionId, 'actionId', {
        eventType: RECONCILIATION_EVENT_TYPES.SALE,
        allowReservedSalePrefix: false
    });
    const profileId = normalizeRequiredId(raw.profileId, 'profileId');
    const trancheId = normalizeRequiredId(raw.trancheId, 'trancheId');
    if (expectedProfileId !== null && profileId !== expectedProfileId) {
        fail(
            'RECONCILIATION_PROFILE_MISMATCH',
            `Die Ausführung gehört zu Profil ${profileId}, geöffnet ist jedoch ${expectedProfileId}.`,
            { field: 'profileId', details: { expectedProfileId, actualProfileId: profileId } }
        );
    }

    const sharesSold = normalizeNumber(raw.sharesSold, 'sharesSold', { greaterThan: 0 });
    const grossProceeds = normalizeNumber(raw.grossProceeds, 'grossProceeds', { greaterThan: 0 });
    const fees = normalizeNumber(raw.fees ?? 0, 'fees', { min: 0 });
    if (fees > grossProceeds) {
        fail(
            'RECONCILIATION_FEES_EXCEED_PROCEEDS',
            'Gebühren dürfen den tatsächlichen Bruttoerlös nicht übersteigen.',
            { field: 'fees' }
        );
    }

    const cashStatus = normalizeCashStatus(raw.cashStatus);
    const cashFields = cashStatus === RECONCILIATION_CASH_STATUSES.ALREADY_REFLECTED
        ? {
            cashBalanceAfterPostingEur: normalizeNumber(
                raw.cashBalanceAfterPostingEur,
                'cashBalanceAfterPostingEur'
            ),
            cashConfirmedAt: normalizeTimestamp(raw.cashConfirmedAt, 'cashConfirmedAt')
        }
        : {};
    if (cashStatus === RECONCILIATION_CASH_STATUSES.PENDING
        && (hasOwn(raw, 'cashBalanceAfterPostingEur') || hasOwn(raw, 'cashConfirmedAt'))) {
        fail(
            'RECONCILIATION_CASH_FIELDS_UNEXPECTED',
            'Ein offener Cashstatus darf noch keinen bestätigten Cashstand oder Bestätigungszeitpunkt tragen.',
            { field: 'cashStatus' }
        );
    }

    return {
        actionId,
        profileId,
        trancheId,
        executedAt: normalizeExecutionDate(raw.executedAt),
        sharesSold,
        grossProceeds,
        fees,
        netProceeds: grossProceeds - fees,
        recommendation: normalizeRecommendation(raw.recommendation),
        cashStatus,
        ...cashFields
    };
}

function parseRegistry(raw) {
    let registry = raw;
    if (typeof raw === 'string') {
        try {
            registry = JSON.parse(raw);
        } catch (cause) {
            fail('RECONCILIATION_REGISTRY_INVALID', 'Die Profilregistry ist syntaktisch beschädigt.', { cause });
        }
    }
    if (!registry || typeof registry !== 'object' || Array.isArray(registry)
        || !registry.profiles || typeof registry.profiles !== 'object' || Array.isArray(registry.profiles)) {
        fail('RECONCILIATION_REGISTRY_INVALID', 'Die Profilregistry besitzt keinen gültigen Profilbestand.');
    }
    return registry;
}

export function deriveCashConfirmationActionId(targetActionId) {
    const normalizedTargetActionId = normalizeRequiredId(targetActionId, 'targetActionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION,
        maxLength: SALE_ID_MAX_LENGTH
    });
    return `${CASH_CONFIRMATION_PREFIX}${normalizedTargetActionId}`;
}

export function deriveCashCorrectionActionId(targetActionId, revision) {
    const normalizedTargetActionId = normalizeRequiredId(targetActionId, 'targetActionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
        maxLength: SALE_ID_MAX_LENGTH
    });
    const normalizedRevision = normalizeCorrectionRevision(revision);
    return `${CASH_CORRECTION_PREFIX}${normalizedTargetActionId}:${normalizedRevision}`;
}

function readEventType(record, index) {
    if (!hasOwn(record, 'eventType')) return { eventType: RECONCILIATION_EVENT_TYPES.SALE, legacy: true };
    const eventType = typeof record.eventType === 'string' ? record.eventType.trim() : '';
    if (!Object.values(RECONCILIATION_EVENT_TYPES).includes(eventType)) {
        fail(
            'RECONCILIATION_EVENT_TYPE_UNSUPPORTED',
            `Reconcile-Eintrag ${index + 1} besitzt den unbekannten Eventtyp ${eventType || '<leer>'}.`,
            { field: 'eventType', details: { index, eventType } }
        );
    }
    return { eventType, legacy: false };
}

function normalizeSaleHistoryRecord(record, { legacy }) {
    if (record.schemaVersion !== TRANCHE_RECONCILIATION_SCHEMA_VERSION) {
        fail('RECONCILIATION_HISTORY_INVALID', 'Verkaufsrecord besitzt eine nicht unterstützte Schemaversion.');
    }
    const actionId = normalizeRequiredId(record.actionId, 'actionId', {
        eventType: RECONCILIATION_EVENT_TYPES.SALE,
        maxLength: SALE_ID_MAX_LENGTH,
        allowReservedSalePrefix: legacy
    });
    const actual = record.actual;
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
        fail('RECONCILIATION_HISTORY_INVALID', `Verkauf ${actionId} besitzt keine gültigen Ausführungsdaten.`);
    }
    const sharesSold = normalizeNumber(actual.sharesSold, 'actual.sharesSold', { greaterThan: 0 });
    const grossProceeds = normalizeNumber(actual.grossProceeds, 'actual.grossProceeds', { greaterThan: 0 });
    const fees = normalizeNumber(actual.fees, 'actual.fees', { min: 0 });
    const netProceeds = normalizeNumber(actual.netProceeds, 'actual.netProceeds');
    if (fees > grossProceeds || !sameEuroCent(netProceeds, grossProceeds - fees)) {
        fail(
            'RECONCILIATION_HISTORY_INVALID',
            `Verkauf ${actionId} besitzt einen inkonsistenten Nettoerlös.`,
            { field: 'actual.netProceeds' }
        );
    }

    const projected = {
        ...cloneJson(record),
        eventType: RECONCILIATION_EVENT_TYPES.SALE,
        actionId,
        profileId: normalizeRequiredId(record.profileId, 'profileId'),
        trancheId: normalizeRequiredId(record.trancheId, 'trancheId'),
        executedAt: normalizeExecutionDate(record.executedAt),
        actual: { ...cloneJson(actual), sharesSold, grossProceeds, fees, netProceeds }
    };

    if (legacy) {
        projected.cashStatus = RECONCILIATION_CASH_STATUSES.LEGACY_UNKNOWN;
        delete projected.cashBalanceAfterPostingEur;
        delete projected.cashConfirmedAt;
        return projected;
    }

    if (!hasOwn(record, 'cashStatus')) {
        fail(
            'RECONCILIATION_CASH_STATUS_INVALID',
            `Neuer Verkauf ${actionId} besitzt keinen expliziten initialen Cashstatus.`,
            { field: 'cashStatus' }
        );
    }
    const cashStatus = normalizeCashStatus(record.cashStatus);
    projected.cashStatus = cashStatus;
    if (cashStatus === RECONCILIATION_CASH_STATUSES.ALREADY_REFLECTED) {
        projected.cashBalanceAfterPostingEur = normalizeNumber(
            record.cashBalanceAfterPostingEur,
            'cashBalanceAfterPostingEur'
        );
        projected.cashConfirmedAt = normalizeTimestamp(record.cashConfirmedAt, 'cashConfirmedAt');
    } else if (hasOwn(record, 'cashBalanceAfterPostingEur') || hasOwn(record, 'cashConfirmedAt')) {
        fail(
            'RECONCILIATION_CASH_FIELDS_UNEXPECTED',
            `Offener Verkauf ${actionId} darf keine Bestätigungsfelder tragen.`,
            { field: 'cashStatus' }
        );
    }
    return projected;
}

function normalizeConfirmationHistoryRecord(record) {
    if (record.schemaVersion !== TRANCHE_RECONCILIATION_SCHEMA_VERSION) {
        fail('RECONCILIATION_HISTORY_INVALID', 'Cashabschluss besitzt eine nicht unterstützte Schemaversion.');
    }
    const actionId = normalizeRequiredId(record.actionId, 'actionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION,
        maxLength: CONFIRMATION_ID_MAX_LENGTH
    });
    const confirmationActionId = normalizeRequiredId(record.confirmationActionId, 'confirmationActionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION,
        maxLength: CONFIRMATION_ID_MAX_LENGTH
    });
    const targetActionId = normalizeRequiredId(record.targetActionId, 'targetActionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION,
        maxLength: SALE_ID_MAX_LENGTH
    });
    const canonicalId = deriveCashConfirmationActionId(targetActionId);
    if (actionId !== confirmationActionId || actionId !== canonicalId) {
        fail(
            'RECONCILIATION_CONFIRMATION_ID_INVALID',
            `Cashabschluss für ${targetActionId} muss die kanonische ID ${canonicalId} in actionId und confirmationActionId tragen.`,
            { field: 'confirmationActionId' }
        );
    }
    return {
        ...cloneJson(record),
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION,
        actionId,
        confirmationActionId,
        targetActionId,
        profileId: normalizeRequiredId(record.profileId, 'profileId'),
        confirmedNetProceedsEur: normalizeNumber(record.confirmedNetProceedsEur, 'confirmedNetProceedsEur'),
        cashBalanceAfterPostingEur: normalizeNumber(record.cashBalanceAfterPostingEur, 'cashBalanceAfterPostingEur'),
        confirmedAt: normalizeTimestamp(record.confirmedAt, 'confirmedAt')
    };
}

function normalizeCorrectionHistoryRecord(record) {
    if (record.schemaVersion !== TRANCHE_RECONCILIATION_SCHEMA_VERSION) {
        fail('RECONCILIATION_HISTORY_INVALID', 'Cashkorrektur besitzt eine nicht unterstützte Schemaversion.');
    }
    const actionId = normalizeRequiredId(record.actionId, 'actionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
        maxLength: CORRECTION_ID_MAX_LENGTH
    });
    const correctionActionId = normalizeRequiredId(record.correctionActionId, 'correctionActionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
        maxLength: CORRECTION_ID_MAX_LENGTH
    });
    const targetActionId = normalizeRequiredId(record.targetActionId, 'targetActionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
        maxLength: SALE_ID_MAX_LENGTH
    });
    const correctionRevision = normalizeCorrectionRevision(record.correctionRevision);
    const canonicalId = deriveCashCorrectionActionId(targetActionId, correctionRevision);
    if (actionId !== correctionActionId || actionId !== canonicalId) {
        fail(
            'RECONCILIATION_CORRECTION_ID_INVALID',
            `Cashkorrektur für ${targetActionId} muss die kanonische ID ${canonicalId} in actionId und correctionActionId tragen.`,
            { field: 'correctionActionId' }
        );
    }
    return {
        ...cloneJson(record),
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
        actionId,
        correctionActionId,
        targetActionId,
        correctsActionId: normalizeRequiredId(record.correctsActionId, 'correctsActionId', {
            eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
            maxLength: CORRECTION_ID_MAX_LENGTH
        }),
        correctionRevision,
        profileId: normalizeRequiredId(record.profileId, 'profileId'),
        confirmedNetProceedsEur: normalizeNumber(record.confirmedNetProceedsEur, 'confirmedNetProceedsEur'),
        cashBalanceAfterPostingEur: normalizeNumber(record.cashBalanceAfterPostingEur, 'cashBalanceAfterPostingEur'),
        correctionReason: normalizeReason(record.correctionReason),
        correctedAt: normalizeTimestamp(record.correctedAt, 'correctedAt')
    };
}

function createSaleCashProjection(sale) {
    const base = {
        targetActionId: sale.actionId,
        profileId: sale.profileId,
        trancheId: sale.trancheId,
        executedAt: sale.executedAt,
        saleRecord: sale,
        confirmedNetProceedsEur: sale.actual.netProceeds,
        cashBalanceAfterPostingEur: null,
        confirmedAt: null,
        correctionReason: null,
        correctionRevision: 0,
        effectiveActionId: null,
        evidenceEventType: null,
        isPending: false,
        isConfirmed: false,
        isLegacy: false,
        canConfirm: false,
        canCorrect: false,
        operationallyComplete: false,
        statusLabel: ''
    };
    if (sale.cashStatus === RECONCILIATION_CASH_STATUSES.PENDING) {
        return {
            ...base,
            cashStatus: RECONCILIATION_CASH_STATUSES.PENDING,
            isPending: true,
            canConfirm: true,
            statusLabel: 'Offen – Nettoerlös noch manuell in der freien Liquidität nachführen'
        };
    }
    if (sale.cashStatus === RECONCILIATION_CASH_STATUSES.LEGACY_UNKNOWN) {
        return {
            ...base,
            cashStatus: RECONCILIATION_CASH_STATUSES.LEGACY_UNKNOWN,
            isLegacy: true,
            canConfirm: true,
            operationallyComplete: true,
            statusLabel: 'Abgeschlossen (Altfall – Cashstatus nicht dokumentiert)'
        };
    }
    return {
        ...base,
        cashStatus: RECONCILIATION_CASH_STATUSES.ALREADY_REFLECTED,
        cashBalanceAfterPostingEur: sale.cashBalanceAfterPostingEur,
        confirmedAt: sale.cashConfirmedAt,
        effectiveActionId: sale.actionId,
        evidenceEventType: RECONCILIATION_EVENT_TYPES.SALE,
        isConfirmed: true,
        canCorrect: true,
        operationallyComplete: true,
        statusLabel: 'Cash bestätigt – bereits in der freien Liquidität berücksichtigt'
    };
}

function validateAndProjectHistory(registryOrRaw) {
    const registry = parseRegistry(registryOrRaw);
    const history = registry[TRANCHE_RECONCILIATION_REGISTRY_FIELD];
    if (history === undefined) return { actions: [], cashStates: new Map() };
    if (!history || typeof history !== 'object' || Array.isArray(history)
        || history.schemaVersion !== TRANCHE_RECONCILIATION_SCHEMA_VERSION
        || !Array.isArray(history.actions)) {
        fail('RECONCILIATION_HISTORY_INVALID', 'Der Reconcile-Verlauf ist beschädigt oder nicht unterstützt.');
    }
    const seen = new Set();
    const cashStates = new Map();
    const actions = history.actions.map((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
            fail('RECONCILIATION_HISTORY_INVALID', `Reconcile-Eintrag ${index + 1} ist ungültig.`);
        }
        const type = readEventType(record, index);
        const projected = type.eventType === RECONCILIATION_EVENT_TYPES.SALE
            ? normalizeSaleHistoryRecord(record, type)
            : type.eventType === RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION
                ? normalizeConfirmationHistoryRecord(record)
                : normalizeCorrectionHistoryRecord(record);
        const actionId = projected.actionId;
        if (seen.has(actionId)) {
            fail('RECONCILIATION_HISTORY_INVALID', `actionId ${actionId} ist im Reconcile-Verlauf doppelt vorhanden.`);
        }
        seen.add(actionId);

        if (projected.eventType === RECONCILIATION_EVENT_TYPES.SALE) {
            cashStates.set(actionId, createSaleCashProjection(projected));
            return projected;
        }

        const sale = cashStates.get(projected.targetActionId);
        if (!sale) {
            fail(
                'RECONCILIATION_CASH_TARGET_INVALID',
                `${projected.eventType} verweist nicht auf einen vorherigen Verkauf ${projected.targetActionId}.`,
                { field: 'targetActionId' }
            );
        }
        if (projected.profileId !== sale.profileId) {
            fail(
                'RECONCILIATION_PROFILE_MISMATCH',
                `${projected.eventType} und Zielverkauf gehören zu unterschiedlichen Profilen.`,
                { field: 'profileId' }
            );
        }
        if (!sameEuroCent(projected.confirmedNetProceedsEur, sale.confirmedNetProceedsEur)) {
            fail(
                'RECONCILIATION_NET_PROCEEDS_MISMATCH',
                `${projected.eventType} verändert den Nettoerlös des Zielverkaufs.`,
                { field: 'confirmedNetProceedsEur' }
            );
        }

        if (projected.eventType === RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION) {
            if (sale.isConfirmed) {
                fail(
                    'RECONCILIATION_CASH_ALREADY_CONFIRMED',
                    `Für Verkauf ${projected.targetActionId} existiert bereits ein wirksamer Cashabschluss.`,
                    { field: 'targetActionId' }
                );
            }
            cashStates.set(projected.targetActionId, {
                ...sale,
                cashStatus: RECONCILIATION_CASH_STATUSES.MANUALLY_CONFIRMED,
                cashBalanceAfterPostingEur: projected.cashBalanceAfterPostingEur,
                confirmedAt: projected.confirmedAt,
                effectiveActionId: projected.actionId,
                evidenceEventType: RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION,
                isPending: false,
                isConfirmed: true,
                canConfirm: false,
                canCorrect: true,
                operationallyComplete: true,
                statusLabel: 'Cash bestätigt – manuell in der freien Liquidität nachgeführt'
            });
            return projected;
        }

        if (!sale.isConfirmed || !sale.effectiveActionId) {
            fail(
                'RECONCILIATION_CORRECTION_WITHOUT_CONFIRMATION',
                `Cashkorrektur ${projected.actionId} besitzt keinen wirksamen Vorgänger.`,
                { field: 'targetActionId' }
            );
        }
        const expectedRevision = sale.correctionRevision + 1;
        if (projected.correctionRevision !== expectedRevision
            || projected.correctsActionId !== sale.effectiveActionId) {
            fail(
                'RECONCILIATION_CORRECTION_CHAIN_INVALID',
                `Cashkorrektur ${projected.actionId} muss Revision ${expectedRevision} und Vorgänger ${sale.effectiveActionId} verwenden.`,
                { field: 'correctsActionId' }
            );
        }
        cashStates.set(projected.targetActionId, {
            ...sale,
            cashStatus: RECONCILIATION_CASH_STATUSES.CORRECTED,
            cashBalanceAfterPostingEur: projected.cashBalanceAfterPostingEur,
            confirmedAt: projected.correctedAt,
            correctionReason: projected.correctionReason,
            correctionRevision: projected.correctionRevision,
            effectiveActionId: projected.actionId,
            evidenceEventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
            statusLabel: `Cash bestätigt – Cashstand mit Revision ${projected.correctionRevision} korrigiert`
        });
        return projected;
    });
    return { actions, cashStates };
}

export function readReconciliationHistory(registryOrRaw) {
    const { actions } = validateAndProjectHistory(registryOrRaw);
    return Object.freeze(actions);
}

export function projectReconciliationCashStatuses(registryOrRaw, profileId = null) {
    const normalizedProfileId = profileId === null
        ? null
        : normalizeRequiredId(profileId, 'profileId');
    const { cashStates } = validateAndProjectHistory(registryOrRaw);
    return Object.freeze([...cashStates.values()]
        .filter(status => normalizedProfileId === null || status.profileId === normalizedProfileId)
        .map(status => Object.freeze({ ...status, saleRecord: Object.freeze(cloneJson(status.saleRecord)) })));
}

function comparableAction(action) {
    return {
        actionId: action.actionId,
        profileId: action.profileId,
        trancheId: action.trancheId,
        executedAt: action.executedAt,
        actual: {
            sharesSold: action.sharesSold ?? action.actual?.sharesSold,
            grossProceeds: action.grossProceeds ?? action.actual?.grossProceeds,
            fees: action.fees ?? action.actual?.fees
        },
        recommendation: action.recommendation || null
    };
}

function sameExecution(record, action) {
    return JSON.stringify(comparableAction(record)) === JSON.stringify(comparableAction(action));
}

function summarizeLot(lot) {
    if (!lot) return null;
    return {
        shares: lot.shares,
        marketValue: lot.marketValue,
        costBasis: lot.costBasis
    };
}

function createAuditRecord(action, before, after) {
    return {
        schemaVersion: TRANCHE_RECONCILIATION_SCHEMA_VERSION,
        eventType: RECONCILIATION_EVENT_TYPES.SALE,
        actionId: action.actionId,
        profileId: action.profileId,
        trancheId: action.trancheId,
        executedAt: action.executedAt,
        actual: {
            sharesSold: action.sharesSold,
            grossProceeds: action.grossProceeds,
            fees: action.fees,
            netProceeds: action.netProceeds
        },
        cashStatus: action.cashStatus,
        ...(action.cashStatus === RECONCILIATION_CASH_STATUSES.ALREADY_REFLECTED
            ? {
                cashBalanceAfterPostingEur: action.cashBalanceAfterPostingEur,
                cashConfirmedAt: action.cashConfirmedAt
            }
            : {}),
        ...(action.recommendation ? { recommendation: cloneJson(action.recommendation) } : {}),
        result: {
            beforeShares: before.shares,
            remainingShares: after?.shares ?? 0,
            trancheRemoved: !after
        }
    };
}

function createDeviation(action) {
    if (!action.recommendation) return null;
    return {
        ...(hasOwn(action.recommendation, 'sharesSold')
            ? { sharesSold: action.sharesSold - action.recommendation.sharesSold }
            : {}),
        ...(hasOwn(action.recommendation, 'grossProceeds')
            ? { grossProceeds: action.grossProceeds - action.recommendation.grossProceeds }
            : {})
    };
}

export function previewTrancheReconciliation({ profileId, tranches, action, registry }) {
    const expectedProfileId = normalizeRequiredId(profileId, 'profileId');
    const normalizedAction = normalizeReconciliationAction(action, expectedProfileId);
    const parsedRegistry = parseRegistry(registry);
    if (!hasOwn(parsedRegistry.profiles, expectedProfileId)) {
        fail(
            'RECONCILIATION_PROFILE_UNKNOWN',
            `Profil ${expectedProfileId} ist in der Profilregistry nicht vorhanden.`,
            { field: 'profileId' }
        );
    }
    const normalizedTranches = normalizeTrancheCollection(tranches, { mode: 'persisted' });
    const history = readReconciliationHistory(parsedRegistry);
    const existing = history.find(record => (
        record.eventType === RECONCILIATION_EVENT_TYPES.SALE
        && record.actionId === normalizedAction.actionId
    ));
    if (existing) {
        if (!sameExecution(existing, normalizedAction)) {
            fail(
                'RECONCILIATION_ACTION_CONFLICT',
                `actionId ${normalizedAction.actionId} wurde bereits für eine andere Ausführung verwendet.`,
                { field: 'actionId' }
            );
        }
        return Object.freeze({
            status: 'duplicate',
            action: Object.freeze(normalizedAction),
            execution: Object.freeze({ ...existing.actual }),
            before: null,
            after: Object.freeze({
                shares: existing.result?.remainingShares ?? 0,
                marketValue: null,
                costBasis: null
            }),
            deviation: createDeviation(normalizedAction),
            nextTranches: Object.freeze(normalizedTranches),
            auditRecord: Object.freeze(existing)
        });
    }

    const trancheIndex = normalizedTranches.findIndex(item => item.trancheId === normalizedAction.trancheId);
    if (trancheIndex < 0) {
        fail(
            'RECONCILIATION_TRANCHE_UNKNOWN',
            `Tranche ${normalizedAction.trancheId} ist in Profil ${expectedProfileId} nicht vorhanden.`,
            { field: 'trancheId' }
        );
    }
    const beforeLot = normalizedTranches[trancheIndex];
    if (normalizedAction.sharesSold - beforeLot.shares > SHARE_EPSILON) {
        fail(
            'RECONCILIATION_SHARES_EXCEED_HOLDING',
            `Die tatsächliche Verkaufsmenge ${normalizedAction.sharesSold} übersteigt den Bestand ${beforeLot.shares}.`,
            { field: 'sharesSold' }
        );
    }

    const remainingShares = beforeLot.shares - normalizedAction.sharesSold;
    let afterLot = null;
    let nextTranches;
    if (remainingShares <= SHARE_EPSILON) {
        nextTranches = normalizedTranches.filter((_, index) => index !== trancheIndex);
    } else {
        afterLot = normalizeTrancheCollection([{
            ...beforeLot,
            shares: remainingShares
        }], { mode: 'persisted' })[0];
        nextTranches = normalizedTranches.map((item, index) => index === trancheIndex ? afterLot : item);
    }
    nextTranches = normalizeTrancheCollection(nextTranches, { mode: 'persisted' });
    const before = summarizeLot(beforeLot);
    const after = summarizeLot(afterLot);
    const auditRecord = createAuditRecord(normalizedAction, before, after);

    return Object.freeze({
        status: 'ready',
        action: Object.freeze(normalizedAction),
        execution: Object.freeze({
            sharesSold: normalizedAction.sharesSold,
            grossProceeds: normalizedAction.grossProceeds,
            fees: normalizedAction.fees,
            netProceeds: normalizedAction.netProceeds
        }),
        before: Object.freeze(before),
        after: after ? Object.freeze(after) : null,
        deviation: createDeviation(normalizedAction),
        nextTranches: Object.freeze(nextTranches),
        auditRecord: Object.freeze(auditRecord)
    });
}

function registryWithAuditRecord(registryOrRaw, auditRecord) {
    const registry = cloneJson(parseRegistry(registryOrRaw));
    const projectedActions = [...readReconciliationHistory(registry)];
    if (projectedActions.some(record => record.actionId === auditRecord.actionId)) {
        fail('RECONCILIATION_ACTION_CONFLICT', `actionId ${auditRecord.actionId} ist bereits gespeichert.`);
    }
    const persistedActions = registry[TRANCHE_RECONCILIATION_REGISTRY_FIELD]?.actions || [];
    registry[TRANCHE_RECONCILIATION_REGISTRY_FIELD] = {
        schemaVersion: TRANCHE_RECONCILIATION_SCHEMA_VERSION,
        actions: [
            ...cloneJson(persistedActions),
            cloneJson(auditRecord)
        ]
    };
    return registry;
}

function restoreRaw(storage, key, raw) {
    try {
        if (raw === null || raw === undefined) storage.removeItem(key);
        else storage.setItem(key, raw);
    } catch {
        // Der aufrufende Manager behaelt den letzten bestaetigten In-Memory-Stand sichtbar.
    }
}

function assertProfileContext(profileId, dependencies) {
    const currentProfileId = dependencies.getCurrentProfileId();
    const activeProfileId = dependencies.getActiveProfileId();
    if (currentProfileId !== profileId || activeProfileId !== profileId) {
        fail(
            'RECONCILIATION_PROFILE_CONTEXT_CHANGED',
            `Der aktive Profilkontext hat sich geändert (erwartet ${profileId}, aktuell ${currentProfileId || '-'} / ${activeProfileId || '-'}).`,
            { field: 'profileId', details: { profileId, currentProfileId, activeProfileId } }
        );
    }
}

export async function commitTrancheReconciliation(request, options = {}) {
    const storage = options.storage || persistenceStorage;
    const dependencies = {
        getCurrentProfileId: options.getCurrentProfileId || getCurrentProfileId,
        getActiveProfileId: options.getActiveProfileId || getActiveProfileId,
        saveCurrentProfile: options.saveCurrentProfile || saveCurrentProfileFromLocalStorage,
        flush: options.flush || (() => PersistenceFacade.flush()),
        clock: options.clock || (() => new Date().toISOString())
    };
    const profileId = normalizeRequiredId(request?.profileId, 'profileId');
    assertProfileContext(profileId, dependencies);

    const previousTranchesRaw = storage.getItem(PROFILE_TRANCHES_KEY);
    const previousRegistryRaw = storage.getItem(PROFILE_STORAGE_KEYS.registry);
    if (request.expectedTranchesRaw !== undefined && request.expectedTranchesRaw !== previousTranchesRaw) {
        fail(
            'RECONCILIATION_PREVIEW_STALE',
            'Der Tranchenbestand hat sich seit der Vorschau geändert. Bitte Vorschau neu erstellen.',
            { retryable: false }
        );
    }
    const registry = parseRegistry(previousRegistryRaw);
    const profile = registry.profiles[profileId];
    if (!profile) {
        fail('RECONCILIATION_PROFILE_UNKNOWN', `Profil ${profileId} ist nicht vorhanden.`);
    }
    const profileTranchesRaw = profile.data?.[PROFILE_TRANCHES_KEY] ?? null;
    if ((profileTranchesRaw ?? null) !== (previousTranchesRaw ?? null)) {
        fail(
            'RECONCILIATION_PROFILE_STATE_STALE',
            'Live-Bestand und profilgebundener Bestand stimmen nicht überein. Profil bitte neu laden.',
            { retryable: false }
        );
    }

    const loaded = loadTranchesFromStorage(storage);
    if (loaded.status === 'corrupt' || loaded.status === 'unavailable') {
        fail(
            'RECONCILIATION_TRANCHE_STORAGE_INVALID',
            'Der Tranchenbestand ist beschädigt oder momentan nicht lesbar.',
            { retryable: loaded.status === 'unavailable' }
        );
    }
    const preview = previewTrancheReconciliation({
        profileId,
        tranches: loaded.tranches || [],
        action: request.action,
        registry
    });
    if (preview.status === 'duplicate') {
        return Object.freeze({ status: 'duplicate', preview, tranches: preview.nextTranches });
    }

    let writesStarted = false;
    try {
        assertProfileContext(profileId, dependencies);
        writesStarted = true;
        const persistedTranches = saveTranchesToStorage(preview.nextTranches, storage);
        if (!dependencies.saveCurrentProfile()) {
            throw new Error('PROFILE_SAVE_FAILED');
        }
        assertProfileContext(profileId, dependencies);
        const registryAfterProfileSave = storage.getItem(PROFILE_STORAGE_KEYS.registry);
        const nextRegistry = registryWithAuditRecord(
            registryAfterProfileSave,
            { ...preview.auditRecord, reconciledAt: dependencies.clock() }
        );
        storage.setItem(PROFILE_STORAGE_KEYS.registry, JSON.stringify(nextRegistry));
        await dependencies.flush();
        return Object.freeze({
            status: 'applied',
            preview,
            tranches: Object.freeze(persistedTranches),
            registry: Object.freeze(nextRegistry)
        });
    } catch (cause) {
        if (writesStarted) {
            restoreRaw(storage, PROFILE_TRANCHES_KEY, previousTranchesRaw);
            restoreRaw(storage, PROFILE_STORAGE_KEYS.registry, previousRegistryRaw);
        }
        if (cause instanceof TrancheReconciliationError) throw cause;
        throw new TrancheReconciliationError(
            'RECONCILIATION_PERSISTENCE_FAILED',
            'Die tatsächliche Ausführung konnte nicht dauerhaft bestätigt werden. Der letzte bestätigte Stand wurde wiederhergestellt.',
            { retryable: true, cause }
        );
    }
}

function requireTargetSale(registry, profileId, targetActionId) {
    if (!hasOwn(registry.profiles, profileId)) {
        fail('RECONCILIATION_PROFILE_UNKNOWN', `Profil ${profileId} ist in der Profilregistry nicht vorhanden.`);
    }
    const history = readReconciliationHistory(registry);
    const sale = history.find(record => (
        record.eventType === RECONCILIATION_EVENT_TYPES.SALE
        && record.actionId === targetActionId
    ));
    if (!sale) {
        fail(
            'RECONCILIATION_CASH_TARGET_INVALID',
            `Der Zielverkauf ${targetActionId} ist nicht vorhanden.`,
            { field: 'targetActionId' }
        );
    }
    if (sale.profileId !== profileId) {
        fail(
            'RECONCILIATION_PROFILE_MISMATCH',
            `Der Zielverkauf ${targetActionId} gehört zu Profil ${sale.profileId}, geöffnet ist ${profileId}.`,
            { field: 'profileId' }
        );
    }
    const status = projectReconciliationCashStatuses(registry, profileId)
        .find(item => item.targetActionId === targetActionId);
    if (!status) {
        fail('RECONCILIATION_CASH_TARGET_INVALID', `Für Verkauf ${targetActionId} ist kein Cashstatus ableitbar.`);
    }
    return { history, sale, status };
}

function sameConfirmationRecord(left, right) {
    return left.eventType === right.eventType
        && left.actionId === right.actionId
        && left.confirmationActionId === right.confirmationActionId
        && left.targetActionId === right.targetActionId
        && left.profileId === right.profileId
        && sameEuroCent(left.confirmedNetProceedsEur, right.confirmedNetProceedsEur)
        && Number(left.cashBalanceAfterPostingEur) === Number(right.cashBalanceAfterPostingEur);
}

function sameCorrectionRecord(left, right) {
    return left.eventType === right.eventType
        && left.actionId === right.actionId
        && left.correctionActionId === right.correctionActionId
        && left.targetActionId === right.targetActionId
        && left.correctsActionId === right.correctsActionId
        && left.correctionRevision === right.correctionRevision
        && left.profileId === right.profileId
        && sameEuroCent(left.confirmedNetProceedsEur, right.confirmedNetProceedsEur)
        && Number(left.cashBalanceAfterPostingEur) === Number(right.cashBalanceAfterPostingEur)
        && left.correctionReason === right.correctionReason;
}

export function previewCashPostingConfirmation(request) {
    const profileId = normalizeRequiredId(request?.profileId, 'profileId');
    const targetActionId = normalizeRequiredId(request?.targetActionId, 'targetActionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION,
        maxLength: SALE_ID_MAX_LENGTH
    });
    const registry = parseRegistry(request?.registry);
    const { history, sale, status } = requireTargetSale(registry, profileId, targetActionId);
    const confirmationActionId = deriveCashConfirmationActionId(targetActionId);
    const auditRecord = {
        schemaVersion: TRANCHE_RECONCILIATION_SCHEMA_VERSION,
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION,
        actionId: confirmationActionId,
        confirmationActionId,
        targetActionId,
        profileId,
        confirmedNetProceedsEur: sale.actual.netProceeds,
        cashBalanceAfterPostingEur: normalizeNumber(
            request?.cashBalanceAfterPostingEur,
            'cashBalanceAfterPostingEur'
        ),
        confirmedAt: normalizeTimestamp(request?.confirmedAt, 'confirmedAt')
    };
    const existing = history.find(record => record.actionId === confirmationActionId);
    if (existing) {
        if (existing.eventType === RECONCILIATION_EVENT_TYPES.CASH_CONFIRMATION
            && sameConfirmationRecord(existing, auditRecord)) {
            return Object.freeze({
                status: 'duplicate',
                auditRecord: Object.freeze(existing),
                cashStatus: Object.freeze(status)
            });
        }
        fail(
            'RECONCILIATION_ACTION_CONFLICT',
            `actionId ${confirmationActionId} ist bereits mit einem abweichenden Payload belegt.`,
            { field: 'confirmationActionId' }
        );
    }
    if (status.isConfirmed || !status.canConfirm) {
        fail(
            'RECONCILIATION_CASH_ALREADY_CONFIRMED',
            `Verkauf ${targetActionId} besitzt bereits einen wirksamen Cashabschluss.`,
            { field: 'targetActionId' }
        );
    }
    return Object.freeze({
        status: 'ready',
        auditRecord: Object.freeze(auditRecord),
        cashStatus: Object.freeze(status)
    });
}

export function previewCashPostingCorrection(request) {
    const profileId = normalizeRequiredId(request?.profileId, 'profileId');
    const targetActionId = normalizeRequiredId(request?.targetActionId, 'targetActionId', {
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
        maxLength: SALE_ID_MAX_LENGTH
    });
    const registry = parseRegistry(request?.registry);
    const { history, sale, status } = requireTargetSale(registry, profileId, targetActionId);
    if (!status.isConfirmed || !status.canCorrect || !status.effectiveActionId) {
        fail(
            'RECONCILIATION_CORRECTION_WITHOUT_CONFIRMATION',
            `Verkauf ${targetActionId} besitzt keinen korrigierbaren Cashabschluss.`,
            { field: 'targetActionId' }
        );
    }

    const correctionRevision = request?.correctionRevision === undefined
        ? status.correctionRevision + 1
        : normalizeCorrectionRevision(request.correctionRevision);
    const canonicalActionId = deriveCashCorrectionActionId(targetActionId, correctionRevision);
    const correctionActionId = request?.correctionActionId === undefined
        ? canonicalActionId
        : normalizeRequiredId(request.correctionActionId, 'correctionActionId', {
            eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
            maxLength: CORRECTION_ID_MAX_LENGTH
        });
    const actionId = request?.actionId === undefined
        ? correctionActionId
        : normalizeRequiredId(request.actionId, 'actionId', {
            eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
            maxLength: CORRECTION_ID_MAX_LENGTH
        });
    const correctsActionId = request?.correctsActionId === undefined
        ? status.effectiveActionId
        : normalizeRequiredId(request.correctsActionId, 'correctsActionId', {
            eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
            maxLength: CORRECTION_ID_MAX_LENGTH
        });
    if (actionId !== correctionActionId || actionId !== canonicalActionId) {
        fail(
            'RECONCILIATION_CORRECTION_ID_INVALID',
            `Cashkorrektur muss die kanonische ID ${canonicalActionId} verwenden.`,
            { field: 'correctionActionId' }
        );
    }

    const auditRecord = {
        schemaVersion: TRANCHE_RECONCILIATION_SCHEMA_VERSION,
        eventType: RECONCILIATION_EVENT_TYPES.CASH_CORRECTION,
        actionId,
        correctionActionId,
        targetActionId,
        correctsActionId,
        correctionRevision,
        profileId,
        confirmedNetProceedsEur: sale.actual.netProceeds,
        cashBalanceAfterPostingEur: normalizeNumber(
            request?.cashBalanceAfterPostingEur,
            'cashBalanceAfterPostingEur'
        ),
        correctionReason: normalizeReason(request?.correctionReason),
        correctedAt: normalizeTimestamp(request?.correctedAt, 'correctedAt')
    };
    const existing = history.find(record => record.actionId === actionId);
    if (existing) {
        if (existing.eventType === RECONCILIATION_EVENT_TYPES.CASH_CORRECTION
            && sameCorrectionRecord(existing, auditRecord)) {
            return Object.freeze({
                status: 'duplicate',
                auditRecord: Object.freeze(existing),
                cashStatus: Object.freeze(status)
            });
        }
        fail(
            'RECONCILIATION_ACTION_CONFLICT',
            `actionId ${actionId} ist bereits mit einem abweichenden Payload belegt.`,
            { field: 'correctionActionId' }
        );
    }
    const expectedRevision = status.correctionRevision + 1;
    if (correctionRevision !== expectedRevision || correctsActionId !== status.effectiveActionId) {
        fail(
            'RECONCILIATION_CORRECTION_CHAIN_STALE',
            `Cashkorrektur muss Revision ${expectedRevision} und Vorgänger ${status.effectiveActionId} verwenden. Bitte aktuellen Stand neu laden.`,
            { field: 'correctsActionId' }
        );
    }
    return Object.freeze({
        status: 'ready',
        auditRecord: Object.freeze(auditRecord),
        cashStatus: Object.freeze(status)
    });
}

async function commitCashPostingEvent(request, options, previewer) {
    const storage = options.storage || persistenceStorage;
    const dependencies = {
        getCurrentProfileId: options.getCurrentProfileId || getCurrentProfileId,
        getActiveProfileId: options.getActiveProfileId || getActiveProfileId,
        flush: options.flush || (() => PersistenceFacade.flush())
    };
    const profileId = normalizeRequiredId(request?.profileId, 'profileId');
    assertProfileContext(profileId, dependencies);
    const previousRegistryRaw = storage.getItem(PROFILE_STORAGE_KEYS.registry);
    const preview = previewer({ ...request, profileId, registry: previousRegistryRaw });
    if (preview.status === 'duplicate') {
        return Object.freeze({
            status: 'duplicate',
            preview,
            registry: Object.freeze(parseRegistry(previousRegistryRaw))
        });
    }
    if (request.expectedRegistryRaw !== undefined && request.expectedRegistryRaw !== previousRegistryRaw) {
        fail(
            'RECONCILIATION_PREVIEW_STALE',
            'Der Reconcile-Verlauf hat sich seit dem Dialog geändert. Bitte aktuellen Stand neu laden.',
            { retryable: false }
        );
    }

    let writesStarted = false;
    try {
        assertProfileContext(profileId, dependencies);
        const nextRegistry = registryWithAuditRecord(previousRegistryRaw, preview.auditRecord);
        readReconciliationHistory(nextRegistry);
        writesStarted = true;
        storage.setItem(PROFILE_STORAGE_KEYS.registry, JSON.stringify(nextRegistry));
        await dependencies.flush();
        return Object.freeze({
            status: 'applied',
            preview,
            registry: Object.freeze(nextRegistry),
            cashStatuses: projectReconciliationCashStatuses(nextRegistry, profileId)
        });
    } catch (cause) {
        if (writesStarted) restoreRaw(storage, PROFILE_STORAGE_KEYS.registry, previousRegistryRaw);
        if (cause instanceof TrancheReconciliationError) throw cause;
        throw new TrancheReconciliationError(
            'RECONCILIATION_PERSISTENCE_FAILED',
            'Der Cashstatus konnte nicht dauerhaft gespeichert werden. Der letzte bestätigte Auditstand wurde wiederhergestellt.',
            { retryable: true, cause }
        );
    }
}

export function commitCashPostingConfirmation(request, options = {}) {
    return commitCashPostingEvent(request, options, previewCashPostingConfirmation);
}

export function commitCashPostingCorrection(request, options = {}) {
    return commitCashPostingEvent(request, options, previewCashPostingCorrection);
}
