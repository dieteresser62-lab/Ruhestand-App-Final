// @ts-check

import { CONFIG } from '../balance/balance-config.js';

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

function parseStoredJson(raw, fallback = null) {
    if (raw === null || raw === undefined || raw === '') return fallback;
    if (typeof raw === 'object') return raw;
    try {
        const parsed = JSON.parse(String(raw));
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
        return fallback;
    }
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

export function parseProfileHealthBucketFromData(data) {
    if (!data || typeof data !== 'object') return normalizeProfileHealthBucket();
    return normalizeProfileHealthBucket(parseStoredJson(data[PROFILE_HEALTH_BUCKET_KEY], {}));
}

export function readProfileHealthBucketFromStorage(storage = localStorage) {
    return parseProfileHealthBucketFromData({
        [PROFILE_HEALTH_BUCKET_KEY]: readStoredProfileValue(storage, PROFILE_HEALTH_BUCKET_KEY)
    });
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

export function readProfileOverridesFromStorage(storage = localStorage) {
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
    if (!data || typeof data !== 'object') return null;
    const raw = data[CONFIG.STORAGE.LS_KEY];
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

export function parseStoredBalanceInputsFromData(data) {
    const parsed = parseStoredBalanceStateFromData(data);
    return parsed && typeof parsed.inputs === 'object' ? parsed.inputs : null;
}
