// @ts-check

import { CONFIG } from '../balance/balance-config.js';
import {
    PROFILE_HEALTH_BUCKET_KEY,
    PROFILE_VALUE_KEYS,
    normalizeProfileHealthBucket,
    readProfileHealthBucketFromStorage,
    serializeProfileHealthBucket
} from './profile-state.js';

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

function readNumber(raw, fallback = 0) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

function readBool(raw, fallback = false) {
    if (raw === true || raw === false) return raw;
    if (raw === null || raw === undefined || raw === '') return fallback;
    return String(raw).toLowerCase() === 'true';
}

export function readProfileStoredInputs(storage = localStorage) {
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

export function loadProfileAssetValues(storage = localStorage) {
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
    return normalizeProfileAssetValues({
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

export function saveProfileAssetValues(values, storage = localStorage) {
    const normalized = normalizeProfileAssetValues(values);
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
