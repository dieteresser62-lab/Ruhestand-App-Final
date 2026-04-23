"use strict";

import {
    loadProfileAssetValues,
    normalizeProfileAssetValues,
    saveProfileAssetValues
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
        goldSteuerfrei: 'false'
    });
    assertEqual(values.renteAktiv, true, 'Rente aktiv should derive from positive monthly income');
    assertEqual(values.goldAktiv, true, 'Gold active should parse');
    assertEqual(values.goldSteuerfrei, false, 'Gold tax flag should parse');
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
        goldSteuerfrei: true
    }, storage);
    assertEqual(saved.renteAktiv, true, 'save should normalize renteAktiv');
    assertEqual(storage.getItem('profile_tagesgeld'), '30000', 'Tagesgeld should be stored');
    assertEqual(storage.getItem('profile_rente_aktiv'), 'true', 'Derived renteAktiv should be stored');
    assertEqual(storage.getItem('profile_gold_rebal_band'), '25', 'Gold band should be stored');
}
console.log('✓ save writes normalized profile keys OK');
