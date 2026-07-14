/**
 * Module: Balance Expenses Storage
 * Purpose: localStorage access and schema helpers for the expenses check.
 */
"use strict";

import { persistenceStorage } from '../shared/persistence-facade.js';

export const EXPENSES_STORAGE_KEY = 'balance_expenses_v1';
export const EXPENSES_STORE_STATUS = Object.freeze({
    OK: 'ok',
    EMPTY: 'empty',
    CORRUPT: 'corrupt'
});

const EXPENSES_RECOVERY_APP_ID = 'ruhe-stand-suite.balance';
const EXPENSES_RECOVERY_SCHEMA = 'balance-expenses-corrupt-recovery';

export class ExpensesStoreCorruptionError extends Error {
    constructor(result) {
        super(result?.error?.message || 'Der Ausgabenstore ist beschaedigt.');
        this.name = 'ExpensesStoreCorruptionError';
        this.code = result?.error?.code || 'expenses-store-corrupt';
        this.status = EXPENSES_STORE_STATUS.CORRUPT;
    }
}

export function createEmptyExpensesStore(activeYear = new Date().getFullYear()) {
    return { version: 1, activeYear, years: {} };
}

function createCorruptionResult(raw, code, message) {
    return {
        status: EXPENSES_STORE_STATUS.CORRUPT,
        store: null,
        raw,
        error: { code, message }
    };
}

function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function loadExpensesStoreResult(storage = persistenceStorage) {
    let raw;
    try {
        raw = storage?.getItem(EXPENSES_STORAGE_KEY);
    } catch {
        return createCorruptionResult(
            null,
            'expenses-store-read-failed',
            'Der gespeicherte Ausgabenbereich konnte nicht gelesen werden.'
        );
    }

    if (raw === null || raw === undefined) {
        return {
            status: EXPENSES_STORE_STATUS.EMPTY,
            store: createEmptyExpensesStore(),
            raw: null,
            error: null
        };
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return createCorruptionResult(
            raw,
            'expenses-store-json-invalid',
            'Die gespeicherten Ausgabendaten enthalten kein gueltiges JSON.'
        );
    }

    if (!isRecord(parsed)) {
        return createCorruptionResult(
            raw,
            'expenses-store-root-invalid',
            'Die gespeicherten Ausgabendaten haben keinen gueltigen Objektaufbau.'
        );
    }
    if (parsed.version !== undefined && Number(parsed.version) !== 1) {
        return createCorruptionResult(
            raw,
            'expenses-store-version-unsupported',
            'Die gespeicherten Ausgabendaten verwenden eine nicht unterstuetzte Version.'
        );
    }
    if (parsed.years !== undefined && !isRecord(parsed.years)) {
        return createCorruptionResult(
            raw,
            'expenses-store-years-invalid',
            'Die gespeicherten Ausgabenjahre haben keinen gueltigen Objektaufbau.'
        );
    }

    const activeYear = Number(parsed.activeYear);
    const store = {
        ...parsed,
        version: 1,
        activeYear: Number.isFinite(activeYear) && activeYear > 0
            ? activeYear
            : new Date().getFullYear(),
        years: parsed.years || {}
    };
    return {
        status: EXPENSES_STORE_STATUS.OK,
        store,
        raw,
        error: null
    };
}

export function loadExpensesStore(storage = persistenceStorage) {
    const result = loadExpensesStoreResult(storage);
    if (result.status === EXPENSES_STORE_STATUS.CORRUPT) {
        throw new ExpensesStoreCorruptionError(result);
    }
    return result.store;
}

export function saveExpensesStore(store, storage = persistenceStorage) {
    const current = loadExpensesStoreResult(storage);
    if (current.status === EXPENSES_STORE_STATUS.CORRUPT) {
        throw new ExpensesStoreCorruptionError(current);
    }
    storage?.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(store));
}

export function createExpensesCorruptionRecoveryDocument(result, options = {}) {
    if (result?.status !== EXPENSES_STORE_STATUS.CORRUPT || typeof result.raw !== 'string') {
        throw new Error('Fuer diesen Ausgabenstore stehen keine exportierbaren Korruptionsrohdaten bereit.');
    }
    return {
        appId: EXPENSES_RECOVERY_APP_ID,
        schema: EXPENSES_RECOVERY_SCHEMA,
        schemaVersion: 1,
        exportedAt: options.exportedAt || new Date().toISOString(),
        affectedArea: 'Ausgaben-Check',
        backend: String(options.backend || 'unknown'),
        corruption: {
            code: result.error?.code || 'expenses-store-corrupt',
            message: result.error?.message || 'Der Ausgabenstore ist beschaedigt.'
        },
        raw: result.raw
    };
}

export function resetCorruptExpensesStore(result, options = {}) {
    const storage = options.storage || persistenceStorage;
    if (result?.status !== EXPENSES_STORE_STATUS.CORRUPT || typeof result.raw !== 'string') {
        throw new Error('Der Ausgabenstore kann nicht als bestaetigter Korruptionsfall zurueckgesetzt werden.');
    }
    if (options.rawPreserved !== true && !options.quarantineReference) {
        throw new Error('Vor dem Zuruecksetzen muss der korrupte Rohinhalt exportiert oder quarantiniert sein.');
    }

    const currentRaw = storage?.getItem(EXPENSES_STORAGE_KEY);
    if (currentRaw !== result.raw) {
        throw new Error('Die gespeicherten Ausgabendaten haben sich seit der Recovery-Anzeige geaendert. Bitte neu laden.');
    }

    const emptyStore = createEmptyExpensesStore(options.activeYear);
    storage?.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(emptyStore));
    return emptyStore;
}

export function getExpensesYearData(store, year) {
    const key = String(year);
    if (!store.years) store.years = {};
    if (!store.years[key]) store.years[key] = { months: {} };
    if (!store.years[key].months) store.years[key].months = {};
    return store.years[key];
}

export function getExpensesMonthData(yearData, month) {
    const key = String(month);
    if (!yearData.months) yearData.months = {};
    if (!yearData.months[key]) yearData.months[key] = { profiles: {} };
    if (!yearData.months[key].profiles) yearData.months[key].profiles = {};
    return yearData.months[key];
}

export function setExpensesActiveYear(year, storage = persistenceStorage) {
    const store = loadExpensesStore(storage);
    store.activeYear = year;
    getExpensesYearData(store, year);
    saveExpensesStore(store, storage);
}

export function resolveExpensesInitialYear(storage = persistenceStorage, fallback = new Date().getFullYear()) {
    const store = loadExpensesStore(storage);
    const activeYear = Number(store.activeYear);
    return Number.isFinite(activeYear) ? activeYear : fallback;
}

export function listExpensesYears({ store, activeYear, currentYear = new Date().getFullYear() }) {
    const years = new Set([currentYear, activeYear]);
    Object.keys(store?.years || {}).forEach(key => {
        const val = Number(key);
        if (Number.isFinite(val)) years.add(val);
    });
    return Array.from(years).sort((a, b) => a - b);
}
