// @ts-check

import { CONFIG } from '../balance/balance-config.js';
import {
    PROFILE_HEALTH_BUCKET_KEY,
    PROFILE_VALUE_KEYS,
    normalizeProfileHealthBucket,
    readProfileHealthBucketFromStorage,
    serializeProfileHealthBucket
} from './profile-state.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

export const DEFAULT_PROFILE_ASSET_VALUES = {
    tagesgeld: 0,
    renteAktiv: false,
    renteMonatlich: 0,
    sonstigeEinkuenfte: 0,
    alter: 0,
    goldAktiv: false,
    goldZiel: 7.5,
    goldFloor: 1,
    goldBand: 25,
    goldSteuerfrei: false,
    healthBucket: normalizeProfileHealthBucket()
};

const PROFILE_BOOLEAN_FIELDS = new Set(['goldAktiv', 'goldSteuerfrei']);
const HEALTH_BUCKET_OPTIONS = Object.freeze({
    assetSource: new Set(['money_market_first_then_cash']),
    triggerMode: new Set(['OR', 'AND']),
    coverageMode: new Set(['care_additional_floor_only', 'floor_when_care_active']),
    returnMode: new Set(['cash_return']),
    targetMode: new Set(['inflation_indexed_diagnostic', 'nominal_fixed'])
});

export class ProfileAssetValuesValidationError extends Error {
    constructor(errors) {
        super('Die Profilwerte sind ungültig.');
        this.name = 'ProfileAssetValuesValidationError';
        this.code = 'PROFILE_ASSET_VALUES_INVALID';
        this.errors = errors;
    }
}

function profileFieldError(field, message, value) {
    return { code: 'PROFILE_ASSET_FIELD_INVALID', field, message, value };
}

function readStrictNumber(raw, field, errors, options = {}) {
    const { min = null, max = null, integer = false } = options;
    if (raw === null || raw === undefined || String(raw).trim() === '') {
        errors.push(profileFieldError(field, `${field} ist erforderlich.`, raw));
        return null;
    }
    const value = typeof raw === 'number' ? raw : Number(String(raw).trim());
    if (!Number.isFinite(value)) {
        errors.push(profileFieldError(field, `${field} muss eine endliche Zahl sein.`, raw));
        return null;
    }
    if ((min !== null && value < min) || (max !== null && value > max) || (integer && !Number.isInteger(value))) {
        const interval = min !== null && max !== null
            ? `zwischen ${min} und ${max}`
            : min !== null ? `mindestens ${min}` : `höchstens ${max}`;
        errors.push(profileFieldError(field, `${field} muss ${interval}${integer ? ' und ganzzahlig' : ''} sein.`, raw));
    }
    return value;
}

function readStrictBool(raw, field, errors) {
    if (raw === true || raw === false) return raw;
    const value = String(raw ?? '').trim().toLowerCase();
    if (value === 'true') return true;
    if (value === 'false') return false;
    errors.push(profileFieldError(field, `${field} muss Ja oder Nein sein.`, raw));
    return false;
}

function readStrictOption(raw, field, allowed, errors, transform = value => value) {
    const value = transform(String(raw ?? '').trim());
    if (!allowed.has(value)) {
        errors.push(profileFieldError(field, `${field} enthält keine unterstützte Auswahl.`, raw));
    }
    return value;
}

export function validateProfileAssetValues(values = {}) {
    const errors = [];
    const healthBucket = values?.healthBucket && typeof values.healthBucket === 'object'
        ? values.healthBucket
        : {};
    const validated = {
        tagesgeld: readStrictNumber(values.tagesgeld, 'tagesgeld', errors, { min: 0 }),
        renteMonatlich: readStrictNumber(values.renteMonatlich, 'renteMonatlich', errors, { min: 0 }),
        sonstigeEinkuenfte: readStrictNumber(values.sonstigeEinkuenfte, 'sonstigeEinkuenfte', errors, { min: 0 }),
        alter: readStrictNumber(values.alter, 'alter', errors, { min: 0, integer: true }),
        goldAktiv: readStrictBool(values.goldAktiv, 'goldAktiv', errors),
        goldZiel: readStrictNumber(values.goldZiel, 'goldZiel', errors, { min: 0, max: 100 }),
        goldFloor: readStrictNumber(values.goldFloor, 'goldFloor', errors, { min: 0, max: 100 }),
        goldBand: readStrictNumber(values.goldBand, 'goldBand', errors, { min: 0, max: 100 }),
        goldSteuerfrei: readStrictBool(values.goldSteuerfrei, 'goldSteuerfrei', errors),
        healthBucket: {
            enabled: readStrictBool(healthBucket.enabled, 'healthBucket.enabled', errors),
            initialAmount: readStrictNumber(healthBucket.initialAmount, 'healthBucket.initialAmount', errors, { min: 0 }),
            assetSource: readStrictOption(healthBucket.assetSource, 'healthBucket.assetSource', HEALTH_BUCKET_OPTIONS.assetSource, errors),
            triggerMinGrade: readStrictNumber(healthBucket.triggerMinGrade, 'healthBucket.triggerMinGrade', errors, { min: 1, max: 5, integer: true }),
            triggerMode: readStrictOption(healthBucket.triggerMode, 'healthBucket.triggerMode', HEALTH_BUCKET_OPTIONS.triggerMode, errors, value => value.toUpperCase()),
            coverageMode: readStrictOption(healthBucket.coverageMode, 'healthBucket.coverageMode', HEALTH_BUCKET_OPTIONS.coverageMode, errors),
            returnMode: readStrictOption(healthBucket.returnMode, 'healthBucket.returnMode', HEALTH_BUCKET_OPTIONS.returnMode, errors),
            targetMode: readStrictOption(healthBucket.targetMode, 'healthBucket.targetMode', HEALTH_BUCKET_OPTIONS.targetMode, errors)
        }
    };

    for (const field of PROFILE_BOOLEAN_FIELDS) {
        if (typeof validated[field] !== 'boolean') {
            errors.push(profileFieldError(field, `${field} muss boolesch sein.`, values[field]));
        }
    }
    if (errors.length) throw new ProfileAssetValuesValidationError(errors);
    validated.renteAktiv = validated.renteMonatlich + validated.sonstigeEinkuenfte > 0;
    return validated;
}

function readNumber(raw, fallback = 0) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

function readBool(raw, fallback = false) {
    if (raw === true || raw === false) return raw;
    if (raw === null || raw === undefined || raw === '') return fallback;
    return String(raw).toLowerCase() === 'true';
}

export function readProfileStoredInputs(storage = persistenceStorage) {
    const raw = storage.getItem(CONFIG.STORAGE.LS_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed?.inputs || {};
    } catch {
        return {};
    }
}

export function normalizeProfileAssetValues(values = {}) {
    const renteMonatlich = readNumber(values.renteMonatlich, 0);
    const sonstigeEinkuenfte = readNumber(values.sonstigeEinkuenfte, 0);
    return {
        tagesgeld: readNumber(values.tagesgeld, 0),
        renteAktiv: renteMonatlich + sonstigeEinkuenfte > 0,
        renteMonatlich,
        sonstigeEinkuenfte,
        alter: readNumber(values.alter, 0),
        goldAktiv: readBool(values.goldAktiv, false),
        goldZiel: readNumber(values.goldZiel, DEFAULT_PROFILE_ASSET_VALUES.goldZiel),
        goldFloor: readNumber(values.goldFloor, DEFAULT_PROFILE_ASSET_VALUES.goldFloor),
        goldBand: readNumber(values.goldBand, DEFAULT_PROFILE_ASSET_VALUES.goldBand),
        goldSteuerfrei: readBool(values.goldSteuerfrei, false),
        healthBucket: normalizeProfileHealthBucket(values.healthBucket)
    };
}

export function loadProfileAssetValues(storage = persistenceStorage) {
    const storedInputs = readProfileStoredInputs(storage);
    const healthBucket = readProfileHealthBucketFromStorage(storage);
    const tagesgeldRaw = storage.getItem(PROFILE_VALUE_KEYS.tagesgeld);
    const renteMonatlichRaw = storage.getItem(PROFILE_VALUE_KEYS.renteMonatlich);
    const sonstigeEinkuenfteRaw = storage.getItem(PROFILE_VALUE_KEYS.sonstigeEinkuenfte);
    const alterRaw = storage.getItem(PROFILE_VALUE_KEYS.alter);
    const goldAktivRaw = storage.getItem(PROFILE_VALUE_KEYS.goldAktiv);
    const goldZielRaw = storage.getItem(PROFILE_VALUE_KEYS.goldZiel);
    const goldFloorRaw = storage.getItem(PROFILE_VALUE_KEYS.goldFloor);
    const goldBandRaw = storage.getItem(PROFILE_VALUE_KEYS.goldRebalBand);
    const goldSteuerfreiRaw = storage.getItem(PROFILE_VALUE_KEYS.goldSteuerfrei);

    return normalizeProfileAssetValues({
        tagesgeld: tagesgeldRaw !== null ? tagesgeldRaw : storedInputs.tagesgeld,
        renteMonatlich: renteMonatlichRaw !== null ? renteMonatlichRaw : storedInputs.renteMonatlich,
        sonstigeEinkuenfte: sonstigeEinkuenfteRaw !== null ? sonstigeEinkuenfteRaw : storedInputs.sonstigeEinkuenfte,
        alter: alterRaw !== null ? alterRaw : storedInputs.aktuellesAlter,
        goldAktiv: goldAktivRaw !== null ? goldAktivRaw : storedInputs.goldAktiv,
        goldZiel: goldZielRaw !== null ? goldZielRaw : storedInputs.goldZielProzent,
        goldFloor: goldFloorRaw !== null ? goldFloorRaw : storedInputs.goldFloorProzent,
        goldBand: goldBandRaw !== null ? goldBandRaw : storedInputs.rebalancingBand,
        goldSteuerfrei: goldSteuerfreiRaw !== null ? goldSteuerfreiRaw : storedInputs.goldSteuerfrei,
        healthBucket
    });
}

export function applyProfileAssetValuesToDom(values, doc = document) {
    const normalized = normalizeProfileAssetValues(values);
    const assign = (id, value, transform = v => v) => {
        const el = doc.getElementById(id);
        if (!el) return;
        el.value = transform(value);
    };

    assign('profileTagesgeld', normalized.tagesgeld);
    assign('profileRenteAktiv', normalized.renteAktiv, v => v ? 'true' : 'false');
    const renteAktivInput = doc.getElementById('profileRenteAktiv');
    if (renteAktivInput) renteAktivInput.disabled = true;
    assign('profileRenteMonatlich', normalized.renteMonatlich);
    assign('profileSonstigeEinkuenfte', normalized.sonstigeEinkuenfte);
    assign('profileAlter', normalized.alter);
    assign('profileGoldAktiv', normalized.goldAktiv, v => v ? 'true' : 'false');
    assign('profileGoldZiel', normalized.goldZiel);
    assign('profileGoldFloor', normalized.goldFloor);
    assign('profileGoldBand', normalized.goldBand);
    assign('profileGoldSteuerfrei', normalized.goldSteuerfrei, v => v ? 'true' : 'false');
    assign('profileHealthBucketEnabled', normalized.healthBucket.enabled, v => v ? 'true' : 'false');
    assign('profileHealthBucketInitialAmount', normalized.healthBucket.initialAmount);
    assign('profileHealthBucketAssetSource', normalized.healthBucket.assetSource);
    assign('profileHealthBucketTriggerMinGrade', normalized.healthBucket.triggerMinGrade);
    assign('profileHealthBucketTriggerMode', normalized.healthBucket.triggerMode);
    assign('profileHealthBucketCoverageMode', normalized.healthBucket.coverageMode);
    assign('profileHealthBucketReturnMode', normalized.healthBucket.returnMode);
    assign('profileHealthBucketTargetMode', normalized.healthBucket.targetMode);
}

export function readProfileAssetValuesFromDom(doc = document) {
    const read = (id) => doc.getElementById(id)?.value ?? '';
    return validateProfileAssetValues({
        tagesgeld: read('profileTagesgeld'),
        renteMonatlich: read('profileRenteMonatlich'),
        sonstigeEinkuenfte: read('profileSonstigeEinkuenfte'),
        alter: read('profileAlter'),
        goldAktiv: read('profileGoldAktiv'),
        goldZiel: read('profileGoldZiel'),
        goldFloor: read('profileGoldFloor'),
        goldBand: read('profileGoldBand'),
        goldSteuerfrei: read('profileGoldSteuerfrei'),
        healthBucket: {
            enabled: read('profileHealthBucketEnabled'),
            initialAmount: read('profileHealthBucketInitialAmount'),
            assetSource: read('profileHealthBucketAssetSource'),
            triggerMinGrade: read('profileHealthBucketTriggerMinGrade'),
            triggerMode: read('profileHealthBucketTriggerMode'),
            coverageMode: read('profileHealthBucketCoverageMode'),
            returnMode: read('profileHealthBucketReturnMode'),
            targetMode: read('profileHealthBucketTargetMode')
        }
    });
}

export function saveProfileAssetValues(values, storage = persistenceStorage) {
    const normalized = validateProfileAssetValues(values);
    storage.setItem(PROFILE_VALUE_KEYS.tagesgeld, String(normalized.tagesgeld));
    storage.setItem(PROFILE_VALUE_KEYS.renteAktiv, normalized.renteAktiv ? 'true' : 'false');
    storage.setItem(PROFILE_VALUE_KEYS.renteMonatlich, String(normalized.renteMonatlich));
    storage.setItem(PROFILE_VALUE_KEYS.sonstigeEinkuenfte, String(normalized.sonstigeEinkuenfte));
    storage.setItem(PROFILE_VALUE_KEYS.alter, String(normalized.alter));
    storage.setItem(PROFILE_VALUE_KEYS.goldAktiv, normalized.goldAktiv ? 'true' : 'false');
    storage.setItem(PROFILE_VALUE_KEYS.goldZiel, String(normalized.goldZiel));
    storage.setItem(PROFILE_VALUE_KEYS.goldFloor, String(normalized.goldFloor));
    storage.setItem(PROFILE_VALUE_KEYS.goldRebalBand, String(normalized.goldBand));
    storage.setItem(PROFILE_VALUE_KEYS.goldSteuerfrei, normalized.goldSteuerfrei ? 'true' : 'false');
    storage.setItem(PROFILE_HEALTH_BUCKET_KEY, serializeProfileHealthBucket(normalized.healthBucket));
    return normalized;
}
