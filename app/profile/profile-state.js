// @ts-check

import { CONFIG } from '../balance/balance-config.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

export const PROFILE_STORAGE_KEYS = {
    registry: 'rs_profiles_v1',
    current: 'rs_current_profile',
    active: 'rs_active_profile'
};

export const PROFILE_VALUE_KEYS = {
    tagesgeld: 'profile_tagesgeld',
    renteAktiv: 'profile_rente_aktiv',
    renteMonatlich: 'profile_rente_monatlich',
    sonstigeEinkuenfte: 'profile_sonstige_einkuenfte',
    alter: 'profile_aktuelles_alter',
    goldAktiv: 'profile_gold_aktiv',
    goldZiel: 'profile_gold_ziel_pct',
    goldFloor: 'profile_gold_floor_pct',
    goldSteuerfrei: 'profile_gold_steuerfrei',
    goldRebalBand: 'profile_gold_rebal_band'
};

export const PROFILE_TRANCHES_KEY = 'depot_tranchen';
export const PROFILE_HEALTH_BUCKET_KEY = 'profile_health_bucket';

export const DEFAULT_PROFILE_HEALTH_BUCKET = Object.freeze({
    enabled: false,
    initialAmount: 150000,
    assetSource: 'money_market_first_then_cash',
    triggerMinGrade: 4,
    triggerMode: 'OR',
    coverageMode: 'care_additional_floor_only',
    returnMode: 'cash_return',
    targetMode: 'inflation_indexed_diagnostic'
});

const HEALTH_BUCKET_OPTIONS = Object.freeze({
    assetSource: new Set(['money_market_first_then_cash']),
    triggerMode: new Set(['OR', 'AND']),
    coverageMode: new Set(['care_additional_floor_only', 'floor_when_care_active']),
    returnMode: new Set(['cash_return']),
    targetMode: new Set(['inflation_indexed_diagnostic', 'nominal_fixed'])
});

export const PROFILE_LOAD_STATUS = Object.freeze({
    VALID: 'valid',
    MISSING: 'missing',
    EMPTY: 'empty',
    CORRUPT: 'corrupt',
    UNAVAILABLE: 'unavailable'
});

export class ProfileStateLoadError extends Error {
    constructor(result, message) {
        super(message || result?.error?.message || 'Profilzustand konnte nicht sicher geladen werden.');
        this.name = 'ProfileStateLoadError';
        this.code = result?.error?.code || 'PROFILE_STATE_LOAD_FAILED';
        this.status = result?.status || PROFILE_LOAD_STATUS.CORRUPT;
        this.storageKey = result?.storageKey || null;
        this.raw = result?.raw ?? null;
        this.loadResult = result || null;
    }
}

export const PROFILE_SCOPED_FIXED_KEYS = [
    PROFILE_TRANCHES_KEY,
    PROFILE_HEALTH_BUCKET_KEY,
    ...Object.values(PROFILE_VALUE_KEYS),
    'showCareDetails',
    'logDetailLevel',
    'worstLogDetailLevel',
    'backtestLogDetailLevel'
];

function hasOwn(data, key) {
    return Boolean(data) && Object.prototype.hasOwnProperty.call(data, key);
}

function createProfileLoadResult(status, storageKey, {
    value = null,
    raw = null,
    error = null
} = {}) {
    return { status, storageKey, value, raw, error };
}

function readProfileDataField(data, storageKey) {
    if (data === null || data === undefined) {
        return createProfileLoadResult(PROFILE_LOAD_STATUS.MISSING, storageKey);
    }
    if (typeof data !== 'object' || Array.isArray(data)) {
        return createProfileLoadResult(PROFILE_LOAD_STATUS.CORRUPT, storageKey, {
            raw: data,
            error: {
                code: 'PROFILE_DATA_INVALID',
                message: 'Die gespeicherten Profildaten haben kein gueltiges Objektformat.'
            }
        });
    }
    try {
        if (!hasOwn(data, storageKey)) {
            return createProfileLoadResult(PROFILE_LOAD_STATUS.MISSING, storageKey);
        }
        const raw = data[storageKey];
        if (raw === null || raw === undefined) {
            return createProfileLoadResult(PROFILE_LOAD_STATUS.MISSING, storageKey);
        }
        if (raw === '') {
            return createProfileLoadResult(PROFILE_LOAD_STATUS.EMPTY, storageKey, { raw });
        }
        return createProfileLoadResult(PROFILE_LOAD_STATUS.VALID, storageKey, { raw });
    } catch (error) {
        return createProfileLoadResult(PROFILE_LOAD_STATUS.UNAVAILABLE, storageKey, {
            error: {
                code: 'PROFILE_DATA_UNAVAILABLE',
                message: 'Die gespeicherten Profildaten sind technisch nicht lesbar.',
                cause: error
            }
        });
    }
}

function parseProfileJsonObject(fieldResult, corruptCode, corruptMessage) {
    if (fieldResult.status !== PROFILE_LOAD_STATUS.VALID) return fieldResult;
    try {
        const parsed = typeof fieldResult.raw === 'string'
            ? JSON.parse(fieldResult.raw)
            : fieldResult.raw;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return createProfileLoadResult(PROFILE_LOAD_STATUS.CORRUPT, fieldResult.storageKey, {
                raw: fieldResult.raw,
                error: { code: corruptCode, message: corruptMessage }
            });
        }
        return { ...fieldResult, value: parsed };
    } catch (error) {
        return createProfileLoadResult(PROFILE_LOAD_STATUS.CORRUPT, fieldResult.storageKey, {
            raw: fieldResult.raw,
            error: { code: corruptCode, message: corruptMessage, cause: error }
        });
    }
}

function invalidHealthBucketField(source, field) {
    if (!hasOwn(source, field)) return false;
    const value = source[field];
    switch (field) {
        case 'enabled':
            return parseStoredBool(value, null) === null;
        case 'initialAmount': {
            const parsed = parseStoredNumber(value, null);
            return !Number.isFinite(parsed) || parsed < 0;
        }
        case 'triggerMinGrade': {
            const parsed = parseStoredNumber(value, null);
            return !Number.isInteger(parsed) || parsed < 1 || parsed > 5;
        }
        case 'assetSource':
            return !HEALTH_BUCKET_OPTIONS.assetSource.has(String(value).trim());
        case 'triggerMode':
            return !HEALTH_BUCKET_OPTIONS.triggerMode.has(String(value).trim().toUpperCase());
        case 'coverageMode':
            return !HEALTH_BUCKET_OPTIONS.coverageMode.has(String(value).trim());
        case 'returnMode':
            return !HEALTH_BUCKET_OPTIONS.returnMode.has(String(value).trim());
        case 'targetMode':
            return !HEALTH_BUCKET_OPTIONS.targetMode.has(String(value).trim());
        default:
            return false;
    }
}

function validateHealthBucketResult(parsedResult) {
    if (parsedResult.status !== PROFILE_LOAD_STATUS.VALID) return parsedResult;
    const fields = [
        'enabled',
        'initialAmount',
        'assetSource',
        'triggerMinGrade',
        'triggerMode',
        'coverageMode',
        'returnMode',
        'targetMode'
    ];
    const invalidField = fields.find(field => invalidHealthBucketField(parsedResult.value, field));
    if (invalidField) {
        return createProfileLoadResult(PROFILE_LOAD_STATUS.CORRUPT, parsedResult.storageKey, {
            raw: parsedResult.raw,
            error: {
                code: 'PROFILE_HEALTH_BUCKET_INVALID',
                message: `Der profilbezogene Pflegebucket enthaelt im Feld ${invalidField} einen ungueltigen Wert.`,
                field: invalidField
            }
        });
    }
    return {
        ...parsedResult,
        value: normalizeProfileHealthBucket(parsedResult.value)
    };
}

function validateBalanceStateResult(parsedResult) {
    if (parsedResult.status !== PROFILE_LOAD_STATUS.VALID) return parsedResult;
    const value = parsedResult.value;
    if (Object.keys(value).length === 0) {
        return { ...parsedResult, status: PROFILE_LOAD_STATUS.EMPTY };
    }
    const requiredObjectFields = [
        'inputs',
        'profilverbundHouseholdInputs'
    ];
    const nullableObjectFields = [
        'lastState',
        'profilverbundHouseholdLastState'
    ];
    const invalidField = requiredObjectFields.find(field => (
        hasOwn(value, field)
        && (!value[field] || typeof value[field] !== 'object' || Array.isArray(value[field]))
    )) || nullableObjectFields.find(field => (
        hasOwn(value, field)
        && value[field] !== null
        && (typeof value[field] !== 'object' || Array.isArray(value[field]))
    ));
    if (invalidField) {
        return createProfileLoadResult(PROFILE_LOAD_STATUS.CORRUPT, parsedResult.storageKey, {
            raw: parsedResult.raw,
            error: {
                code: 'PROFILE_BALANCE_STATE_INVALID',
                message: `Der profilbezogene Balance-State enthaelt im Feld ${invalidField} kein gueltiges Objekt.`,
                field: invalidField
            }
        });
    }
    return parsedResult;
}

export function parseStoredNumber(raw, fallback = null) {
    if (raw === null || raw === undefined || raw === '') return fallback;
    const n = Number(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
}

export function parseStoredBool(raw, fallback = null) {
    if (raw === null || raw === undefined || raw === '') return fallback;
    if (raw === true || raw === false) return raw;
    const normalized = String(raw).toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
    return fallback;
}

export function readStoredProfileValue(storage, key) {
    if (!storage || typeof storage.getItem !== 'function') return null;
    return storage.getItem(key);
}

export function readStoredProfileNumber(storage, key, fallback = null) {
    return parseStoredNumber(readStoredProfileValue(storage, key), fallback);
}

export function readStoredProfileBool(storage, key, fallback = null) {
    return parseStoredBool(readStoredProfileValue(storage, key), fallback);
}

function normalizeOption(raw, allowed, fallback, transform = value => value) {
    const value = raw === null || raw === undefined || raw === ''
        ? fallback
        : transform(String(raw).trim());
    return allowed.has(value) ? value : fallback;
}

function clampNumber(value, min, max, fallback) {
    const n = parseStoredNumber(value, fallback);
    const safe = Number.isFinite(n) ? n : fallback;
    return Math.max(min, Math.min(max, safe));
}

export function normalizeProfileHealthBucket(raw = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const defaults = DEFAULT_PROFILE_HEALTH_BUCKET;
    return {
        enabled: parseStoredBool(source.enabled, defaults.enabled),
        initialAmount: Math.max(0, parseStoredNumber(source.initialAmount, defaults.initialAmount)),
        assetSource: normalizeOption(source.assetSource, HEALTH_BUCKET_OPTIONS.assetSource, defaults.assetSource),
        triggerMinGrade: Math.round(clampNumber(source.triggerMinGrade, 1, 5, defaults.triggerMinGrade)),
        triggerMode: normalizeOption(source.triggerMode, HEALTH_BUCKET_OPTIONS.triggerMode, defaults.triggerMode, value => value.toUpperCase()),
        coverageMode: normalizeOption(source.coverageMode, HEALTH_BUCKET_OPTIONS.coverageMode, defaults.coverageMode),
        returnMode: normalizeOption(source.returnMode, HEALTH_BUCKET_OPTIONS.returnMode, defaults.returnMode),
        targetMode: normalizeOption(source.targetMode, HEALTH_BUCKET_OPTIONS.targetMode, defaults.targetMode)
    };
}

export function loadProfileHealthBucketFromData(data) {
    const fieldResult = readProfileDataField(data, PROFILE_HEALTH_BUCKET_KEY);
    if (fieldResult.status === PROFILE_LOAD_STATUS.MISSING
        || fieldResult.status === PROFILE_LOAD_STATUS.EMPTY) {
        return {
            ...fieldResult,
            value: normalizeProfileHealthBucket()
        };
    }
    return validateHealthBucketResult(parseProfileJsonObject(
        fieldResult,
        'PROFILE_HEALTH_BUCKET_CORRUPT',
        'Der profilbezogene Pflegebucket enthaelt kein gueltiges JSON-Objekt.'
    ));
}

export function parseProfileHealthBucketFromData(data) {
    const result = loadProfileHealthBucketFromData(data);
    if (result.status === PROFILE_LOAD_STATUS.CORRUPT
        || result.status === PROFILE_LOAD_STATUS.UNAVAILABLE) {
        throw new ProfileStateLoadError(result);
    }
    return result.value;
}

export function loadProfileHealthBucketFromStorage(storage = persistenceStorage) {
    let raw;
    try {
        raw = readStoredProfileValue(storage, PROFILE_HEALTH_BUCKET_KEY);
    } catch (error) {
        return createProfileLoadResult(PROFILE_LOAD_STATUS.UNAVAILABLE, PROFILE_HEALTH_BUCKET_KEY, {
            error: {
                code: 'PROFILE_HEALTH_BUCKET_UNAVAILABLE',
                message: 'Der profilbezogene Pflegebucket ist technisch nicht lesbar.',
                cause: error
            }
        });
    }
    return loadProfileHealthBucketFromData({ [PROFILE_HEALTH_BUCKET_KEY]: raw });
}

export function readProfileHealthBucketFromStorage(storage = persistenceStorage) {
    const result = loadProfileHealthBucketFromStorage(storage);
    if (result.status === PROFILE_LOAD_STATUS.CORRUPT
        || result.status === PROFILE_LOAD_STATUS.UNAVAILABLE) {
        throw new ProfileStateLoadError(result);
    }
    return result.value;
}

export function serializeProfileHealthBucket(value) {
    return JSON.stringify(normalizeProfileHealthBucket(value));
}

export function parseProfileOverridesFromData(data) {
    if (!data || typeof data !== 'object') return {};
    return {
        profileTagesgeld: hasOwn(data, PROFILE_VALUE_KEYS.tagesgeld)
            ? parseStoredNumber(data[PROFILE_VALUE_KEYS.tagesgeld], null)
            : null,
        profileRenteAktiv: hasOwn(data, PROFILE_VALUE_KEYS.renteAktiv)
            ? parseStoredBool(data[PROFILE_VALUE_KEYS.renteAktiv], null)
            : null,
        profileRenteMonatlich: hasOwn(data, PROFILE_VALUE_KEYS.renteMonatlich)
            ? parseStoredNumber(data[PROFILE_VALUE_KEYS.renteMonatlich], null)
            : null,
        profileSonstigeEinkuenfte: hasOwn(data, PROFILE_VALUE_KEYS.sonstigeEinkuenfte)
            ? parseStoredNumber(data[PROFILE_VALUE_KEYS.sonstigeEinkuenfte], null)
            : null,
        profileAlter: hasOwn(data, PROFILE_VALUE_KEYS.alter)
            ? parseStoredNumber(data[PROFILE_VALUE_KEYS.alter], null)
            : null,
        profileGoldAktiv: hasOwn(data, PROFILE_VALUE_KEYS.goldAktiv)
            ? parseStoredBool(data[PROFILE_VALUE_KEYS.goldAktiv], null)
            : null,
        profileGoldZiel: hasOwn(data, PROFILE_VALUE_KEYS.goldZiel)
            ? parseStoredNumber(data[PROFILE_VALUE_KEYS.goldZiel], null)
            : null,
        profileGoldFloor: hasOwn(data, PROFILE_VALUE_KEYS.goldFloor)
            ? parseStoredNumber(data[PROFILE_VALUE_KEYS.goldFloor], null)
            : null,
        profileGoldSteuerfrei: hasOwn(data, PROFILE_VALUE_KEYS.goldSteuerfrei)
            ? parseStoredBool(data[PROFILE_VALUE_KEYS.goldSteuerfrei], null)
            : null,
        profileGoldRebalBand: hasOwn(data, PROFILE_VALUE_KEYS.goldRebalBand)
            ? parseStoredNumber(data[PROFILE_VALUE_KEYS.goldRebalBand], null)
            : null
    };
}

export function readProfileOverridesFromStorage(storage = persistenceStorage) {
    return parseProfileOverridesFromData({
        [PROFILE_VALUE_KEYS.tagesgeld]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.tagesgeld),
        [PROFILE_VALUE_KEYS.renteAktiv]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.renteAktiv),
        [PROFILE_VALUE_KEYS.renteMonatlich]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.renteMonatlich),
        [PROFILE_VALUE_KEYS.sonstigeEinkuenfte]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.sonstigeEinkuenfte),
        [PROFILE_VALUE_KEYS.alter]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.alter),
        [PROFILE_VALUE_KEYS.goldAktiv]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.goldAktiv),
        [PROFILE_VALUE_KEYS.goldZiel]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.goldZiel),
        [PROFILE_VALUE_KEYS.goldFloor]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.goldFloor),
        [PROFILE_VALUE_KEYS.goldSteuerfrei]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.goldSteuerfrei),
        [PROFILE_VALUE_KEYS.goldRebalBand]: readStoredProfileValue(storage, PROFILE_VALUE_KEYS.goldRebalBand)
    });
}

export function hasProfileOverrides(overrides) {
    if (!overrides || typeof overrides !== 'object') return false;
    return Object.values(overrides).some(value => value !== null && value !== undefined);
}

export function parseStoredTranchesFromData(data) {
    if (!data || typeof data !== 'object') return [];
    const raw = data[PROFILE_TRANCHES_KEY];
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function parseStoredBalanceStateFromData(data) {
    const result = loadStoredBalanceStateFromData(data);
    if (result.status === PROFILE_LOAD_STATUS.CORRUPT
        || result.status === PROFILE_LOAD_STATUS.UNAVAILABLE) {
        throw new ProfileStateLoadError(result);
    }
    return result.value;
}

export function loadStoredBalanceStateFromData(data) {
    const fieldResult = readProfileDataField(data, CONFIG.STORAGE.LS_KEY);
    if (fieldResult.status === PROFILE_LOAD_STATUS.MISSING
        || fieldResult.status === PROFILE_LOAD_STATUS.EMPTY) {
        return { ...fieldResult, value: null };
    }
    return validateBalanceStateResult(parseProfileJsonObject(
        fieldResult,
        'PROFILE_BALANCE_STATE_CORRUPT',
        'Der profilbezogene Balance-State enthaelt kein gueltiges JSON-Objekt.'
    ));
}

export function parseStoredBalanceInputsFromData(data) {
    const parsed = parseStoredBalanceStateFromData(data);
    return parsed && typeof parsed.inputs === 'object' ? parsed.inputs : null;
}
