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

const SHARE_EPSILON = 1e-10;

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

function normalizeRequiredId(value, field) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized || normalized.length > 128 || /[\u0000-\u001f\u007f]/.test(normalized)) {
        fail(
            'RECONCILIATION_ID_INVALID',
            `${field} muss eine nicht leere, stabile ID mit maximal 128 Zeichen sein.`,
            { field }
        );
    }
    return normalized;
}

function normalizeNumber(value, field, options = {}) {
    const number = typeof value === 'number' ? value : Number(value);
    const { min = null, greaterThan = null, optional = false } = options;
    if (optional && (value === '' || value === null || value === undefined)) return null;
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
    const actionId = normalizeRequiredId(raw.actionId, 'actionId');
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

    return {
        actionId,
        profileId,
        trancheId,
        executedAt: normalizeExecutionDate(raw.executedAt),
        sharesSold,
        grossProceeds,
        fees,
        netProceeds: grossProceeds - fees,
        recommendation: normalizeRecommendation(raw.recommendation)
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

export function readReconciliationHistory(registryOrRaw) {
    const registry = parseRegistry(registryOrRaw);
    const history = registry[TRANCHE_RECONCILIATION_REGISTRY_FIELD];
    if (history === undefined) return Object.freeze([]);
    if (!history || typeof history !== 'object' || Array.isArray(history)
        || history.schemaVersion !== TRANCHE_RECONCILIATION_SCHEMA_VERSION
        || !Array.isArray(history.actions)) {
        fail('RECONCILIATION_HISTORY_INVALID', 'Der Reconcile-Verlauf ist beschädigt oder nicht unterstützt.');
    }
    const seen = new Set();
    const actions = history.actions.map((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
            fail('RECONCILIATION_HISTORY_INVALID', `Reconcile-Eintrag ${index + 1} ist ungültig.`);
        }
        const actionId = normalizeRequiredId(record.actionId, 'actionId');
        if (seen.has(actionId)) {
            fail('RECONCILIATION_HISTORY_INVALID', `actionId ${actionId} ist im Reconcile-Verlauf doppelt vorhanden.`);
        }
        seen.add(actionId);
        return cloneJson(record);
    });
    return Object.freeze(actions);
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
    const existing = history.find(record => record.actionId === normalizedAction.actionId);
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

function registryWithAuditRecord(registryOrRaw, auditRecord, reconciledAt) {
    const registry = cloneJson(parseRegistry(registryOrRaw));
    const actions = [...readReconciliationHistory(registry)];
    if (actions.some(record => record.actionId === auditRecord.actionId)) {
        fail('RECONCILIATION_ACTION_CONFLICT', `actionId ${auditRecord.actionId} ist bereits gespeichert.`);
    }
    registry[TRANCHE_RECONCILIATION_REGISTRY_FIELD] = {
        schemaVersion: TRANCHE_RECONCILIATION_SCHEMA_VERSION,
        actions: [
            ...actions,
            { ...cloneJson(auditRecord), reconciledAt }
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
            preview.auditRecord,
            dependencies.clock()
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
