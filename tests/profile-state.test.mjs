"use strict";

import {
    PROFILE_STORAGE_KEYS,
    PROFILE_HEALTH_BUCKET_KEY,
    PROFILE_TRANCHES_KEY,
    PROFILE_VALUE_KEYS,
    DEFAULT_PROFILE_HEALTH_BUCKET,
    normalizeProfileHealthBucket,
    parseProfileHealthBucketFromData,
    parseProfileOverridesFromData,
    parseStoredBalanceInputsFromData,
    parseStoredBool,
    parseStoredNumber,
    parseStoredTranchesFromData,
    readProfileOverridesFromStorage
} from '../app/profile/profile-state.js';
import { CONFIG } from '../app/balance/balance-config.js';

console.log('--- Profile State Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); }
    };
}

console.log('Test 1: Shared storage keys');
assertEqual(PROFILE_STORAGE_KEYS.registry, 'rs_profiles_v1', 'Registry key should stay stable');
assertEqual(PROFILE_STORAGE_KEYS.current, 'rs_current_profile', 'Current profile key should stay stable');
assertEqual(PROFILE_STORAGE_KEYS.active, 'rs_active_profile', 'Active profile key should stay stable');
assertEqual(PROFILE_TRANCHES_KEY, 'depot_tranchen', 'Tranches key should stay stable');
assertEqual(PROFILE_HEALTH_BUCKET_KEY, 'profile_health_bucket', 'Health bucket key should stay stable');
assertEqual(PROFILE_VALUE_KEYS.tagesgeld, 'profile_tagesgeld', 'Tagesgeld key should stay stable');
console.log('✓ Shared storage keys OK');

console.log('Test 2: Primitive parsing');
assertEqual(parseStoredNumber('7,5'), 7.5, 'Comma decimals should parse');
assertEqual(parseStoredNumber('', null), null, 'Empty number should return fallback');
assertEqual(parseStoredBool('true'), true, 'true should parse');
assertEqual(parseStoredBool('0'), false, '0 should parse as false');
assertEqual(parseStoredBool('maybe', null), null, 'Unknown bool should return fallback');
console.log('✓ Primitive parsing OK');

console.log('Test 3: Override parsing from data');
{
    const overrides = parseProfileOverridesFromData({
        profile_tagesgeld: '12000',
        profile_rente_aktiv: 'true',
        profile_rente_monatlich: '1500',
        profile_sonstige_einkuenfte: '250,5',
        profile_aktuelles_alter: '68',
        profile_gold_aktiv: 'false',
        profile_gold_ziel_pct: '7,5',
        profile_gold_floor_pct: '1,5',
        profile_gold_steuerfrei: 'true',
        profile_gold_rebal_band: '18'
    });

    assertEqual(overrides.profileTagesgeld, 12000, 'Tagesgeld override should parse');
    assertEqual(overrides.profileRenteAktiv, true, 'Rente aktiv override should parse');
    assertEqual(overrides.profileRenteMonatlich, 1500, 'Rente amount should parse');
    assertEqual(overrides.profileSonstigeEinkuenfte, 250.5, 'Other income should parse');
    assertEqual(overrides.profileAlter, 68, 'Age should parse');
    assertEqual(overrides.profileGoldAktiv, false, 'Gold active should parse');
    assertEqual(overrides.profileGoldZiel, 7.5, 'Gold target should parse');
    assertEqual(overrides.profileGoldFloor, 1.5, 'Gold floor should parse');
    assertEqual(overrides.profileGoldSteuerfrei, true, 'Gold tax flag should parse');
    assertEqual(overrides.profileGoldRebalBand, 18, 'Gold band should parse');
}
console.log('✓ Override parsing from data OK');

console.log('Test 4: Read overrides from storage');
{
    const storage = createLocalStorageMock();
    storage.setItem('profile_tagesgeld', '55000');
    storage.setItem('profile_gold_aktiv', 'true');

    const overrides = readProfileOverridesFromStorage(storage);
    assertEqual(overrides.profileTagesgeld, 55000, 'Storage should expose tagesgeld override');
    assertEqual(overrides.profileGoldAktiv, true, 'Storage should expose gold override');
    assertEqual(overrides.profileRenteMonatlich, null, 'Missing storage values should stay null');
}
console.log('✓ Read overrides from storage OK');

console.log('Test 5: Health bucket parsing');
{
    const parsed = parseProfileHealthBucketFromData({
        profile_health_bucket: JSON.stringify({
            enabled: 'true',
            initialAmount: '180000',
            assetSource: 'money_market_first_then_cash',
            triggerMinGrade: '5',
            triggerMode: 'and',
            coverageMode: 'floor_when_care_active',
            returnMode: 'cash_return',
            targetMode: 'nominal_fixed'
        })
    });

    assertEqual(parsed.enabled, true, 'Health bucket enabled should parse');
    assertEqual(parsed.initialAmount, 180000, 'Health bucket amount should parse');
    assertEqual(parsed.triggerMinGrade, 5, 'Health bucket grade should parse');
    assertEqual(parsed.triggerMode, 'AND', 'Health bucket trigger mode should normalize');
    assertEqual(parsed.coverageMode, 'floor_when_care_active', 'Health bucket coverage should parse');
    assertEqual(parsed.targetMode, 'nominal_fixed', 'Health bucket target mode should parse');

    const fallback = normalizeProfileHealthBucket({
        initialAmount: '-1',
        triggerMinGrade: '9',
        triggerMode: 'invalid'
    });
    assertEqual(fallback.initialAmount, 0, 'Health bucket amount should not go negative');
    assertEqual(fallback.triggerMinGrade, 5, 'Health bucket grade should clamp');
    assertEqual(fallback.triggerMode, DEFAULT_PROFILE_HEALTH_BUCKET.triggerMode, 'Unknown trigger mode should fallback');
}
console.log('✓ Health bucket parsing OK');

console.log('Test 6: Parse tranches and balance inputs');
{
    const data = {
        [PROFILE_TRANCHES_KEY]: JSON.stringify([{ trancheId: 't1', marketValue: 1000 }]),
        [CONFIG.STORAGE.LS_KEY]: JSON.stringify({ inputs: { floorBedarf: 24000, tagesgeld: 5000 } })
    };

    const tranches = parseStoredTranchesFromData(data);
    const balanceInputs = parseStoredBalanceInputsFromData(data);

    assert(Array.isArray(tranches), 'Tranches should parse into array');
    assertEqual(tranches.length, 1, 'One tranche should be returned');
    assertEqual(balanceInputs.floorBedarf, 24000, 'Balance inputs should be extracted from state');
    assertEqual(balanceInputs.tagesgeld, 5000, 'Balance tagesgeld should be extracted');
}
console.log('✓ Parse tranches and balance inputs OK');

console.log('✅ Profile state contract validated');
