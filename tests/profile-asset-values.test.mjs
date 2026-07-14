"use strict";

import {
    loadProfileAssetValues,
    normalizeProfileAssetValues,
    ProfileAssetValuesValidationError,
    readProfileAssetValuesFromDom,
    saveProfileAssetValues,
    validateProfileAssetValues
} from '../app/profile/profile-asset-values.js';
import { CONFIG } from '../app/balance/balance-config.js';

console.log('--- Profile Asset Values Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); }
    };
}

console.log('Test 1: normalize derives renteAktiv from incomes');
{
    const values = normalizeProfileAssetValues({
        renteMonatlich: '1000',
        sonstigeEinkuenfte: '250',
        goldAktiv: 'true',
        goldSteuerfrei: 'false',
        healthBucket: {
            enabled: 'true',
            initialAmount: '175000',
            triggerMinGrade: '4',
            triggerMode: 'or'
        }
    });
    assertEqual(values.renteAktiv, true, 'Rente aktiv should derive from positive monthly income');
    assertEqual(values.goldAktiv, true, 'Gold active should parse');
    assertEqual(values.goldSteuerfrei, false, 'Gold tax flag should parse');
    assertEqual(values.healthBucket.enabled, true, 'Health bucket active should parse');
    assertEqual(values.healthBucket.initialAmount, 175000, 'Health bucket amount should parse');
    assertEqual(values.healthBucket.triggerMode, 'OR', 'Health bucket trigger mode should normalize');
}
console.log('✓ normalize derives renteAktiv OK');

console.log('Test 2: load falls back to stored balance inputs');
{
    const storage = createLocalStorageMock();
    storage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
        inputs: {
            tagesgeld: 15000,
            renteMonatlich: 1200,
            aktuellesAlter: 66,
            goldAktiv: true,
            goldZielProzent: 8,
            goldFloorProzent: 2,
            rebalancingBand: 20,
            goldSteuerfrei: true
        }
    }));

    const values = loadProfileAssetValues(storage);
    assertEqual(values.tagesgeld, 15000, 'Tagesgeld should fallback from balance inputs');
    assertEqual(values.renteMonatlich, 1200, 'Rente should fallback from balance inputs');
    assertEqual(values.alter, 66, 'Age should fallback from balance inputs');
    assertEqual(values.goldAktiv, true, 'Gold active should fallback from balance inputs');
}
console.log('✓ load falls back to stored balance inputs OK');

console.log('Test 3: save writes normalized profile keys');
{
    const storage = createLocalStorageMock();
    const saved = saveProfileAssetValues({
        tagesgeld: 30000,
        renteMonatlich: 800,
        sonstigeEinkuenfte: 200,
        alter: 67,
        goldAktiv: true,
        goldZiel: 7.5,
        goldFloor: 1,
        goldBand: 25,
        goldSteuerfrei: true,
        healthBucket: {
            enabled: true,
            initialAmount: 150000,
            assetSource: 'money_market_first_then_cash',
            triggerMinGrade: 4,
            triggerMode: 'OR',
            coverageMode: 'care_additional_floor_only',
            returnMode: 'cash_return',
            targetMode: 'inflation_indexed_diagnostic'
        }
    }, storage);
    assertEqual(saved.renteAktiv, true, 'save should normalize renteAktiv');
    assertEqual(storage.getItem('profile_tagesgeld'), '30000', 'Tagesgeld should be stored');
    assertEqual(storage.getItem('profile_rente_aktiv'), 'true', 'Derived renteAktiv should be stored');
    assertEqual(storage.getItem('profile_gold_rebal_band'), '25', 'Gold band should be stored');
    const healthBucket = JSON.parse(storage.getItem('profile_health_bucket'));
    assertEqual(healthBucket.enabled, true, 'Health bucket should be stored');
    assertEqual(healthBucket.initialAmount, 150000, 'Health bucket amount should be stored');
}
console.log('✓ save writes normalized profile keys OK');

function createValidProfileValues() {
    return {
        tagesgeld: '30000',
        renteMonatlich: '800',
        sonstigeEinkuenfte: '200',
        alter: '67',
        goldAktiv: 'true',
        goldZiel: '7.5',
        goldFloor: '1',
        goldBand: '25',
        goldSteuerfrei: 'false',
        healthBucket: {
            enabled: 'true',
            initialAmount: '150000',
            assetSource: 'money_market_first_then_cash',
            triggerMinGrade: '4',
            triggerMode: 'OR',
            coverageMode: 'care_additional_floor_only',
            returnMode: 'cash_return',
            targetMode: 'inflation_indexed_diagnostic'
        }
    };
}

console.log('Test 4: strict validation rejects negative, blank and non-finite inputs');
{
    for (const [field, value] of [['tagesgeld', '-1'], ['alter', ''], ['goldZiel', 'Infinity']]) {
        let error = null;
        try {
            validateProfileAssetValues({ ...createValidProfileValues(), [field]: value });
        } catch (caught) {
            error = caught;
        }
        assert(error instanceof ProfileAssetValuesValidationError, `${field} should fail strict validation`);
        assert(error.errors.some(item => item.field === field), `${field} should retain field context`);
    }
}
console.log('✓ strict profile validation OK');

console.log('Test 5: DOM reader rejects an intermediate blank without producing NaN defaults');
{
    const values = createValidProfileValues();
    const byId = {
        profileTagesgeld: values.tagesgeld,
        profileRenteMonatlich: '',
        profileSonstigeEinkuenfte: values.sonstigeEinkuenfte,
        profileAlter: values.alter,
        profileGoldAktiv: values.goldAktiv,
        profileGoldZiel: values.goldZiel,
        profileGoldFloor: values.goldFloor,
        profileGoldBand: values.goldBand,
        profileGoldSteuerfrei: values.goldSteuerfrei,
        profileHealthBucketEnabled: values.healthBucket.enabled,
        profileHealthBucketInitialAmount: values.healthBucket.initialAmount,
        profileHealthBucketAssetSource: values.healthBucket.assetSource,
        profileHealthBucketTriggerMinGrade: values.healthBucket.triggerMinGrade,
        profileHealthBucketTriggerMode: values.healthBucket.triggerMode,
        profileHealthBucketCoverageMode: values.healthBucket.coverageMode,
        profileHealthBucketReturnMode: values.healthBucket.returnMode,
        profileHealthBucketTargetMode: values.healthBucket.targetMode
    };
    let error = null;
    try {
        readProfileAssetValuesFromDom({ getElementById: id => ({ value: byId[id] }) });
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof ProfileAssetValuesValidationError, 'Intermediate blank should block the DOM read');
    assert(error.errors.some(item => item.field === 'renteMonatlich'), 'Blank field should be identified');
}
console.log('✓ intermediate DOM input validation OK');
