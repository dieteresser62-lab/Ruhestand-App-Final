// @ts-check

import { CONFIG } from '../balance-config.js';
import { loadHouseholdProfiles } from '../household-balance.js';

console.log('--- Household Profile Gold Overrides ---');

const store = new Map();
const localStorageMock = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
        store.set(key, String(value));
    },
    removeItem: (key) => {
        store.delete(key);
    },
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] || null,
    get length() {
        return store.size;
    }
};

global.localStorage = localStorageMock;

const PROFILE_STORAGE_KEY = 'rs_profiles_v1';

const registry = {
    version: 1,
    profiles: {
        dieter: {
            meta: {
                id: 'dieter',
                name: 'Dieter',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                belongsToHousehold: true
            },
            data: {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify({
                    inputs: {
                        goldAktiv: true,
                        goldZielProzent: 12,
                        goldFloorProzent: 3,
                        goldSteuerfrei: true,
                        rebalancingBand: 10
                    }
                }),
                profile_gold_aktiv: 'false',
                profile_gold_ziel_pct: '5',
                profile_gold_floor_pct: '1',
                profile_gold_steuerfrei: 'false',
                profile_gold_rebal_band: '20'
            }
        },
        karin: {
            meta: {
                id: 'karin',
                name: 'Karin',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                belongsToHousehold: true
            },
            data: {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify({
                    inputs: {
                        goldAktiv: true,
                        goldZielProzent: 8,
                        goldFloorProzent: 2,
                        goldSteuerfrei: false,
                        rebalancingBand: 15
                    }
                })
            }
        },
        petra: {
            meta: {
                id: 'petra',
                name: 'Petra',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                belongsToHousehold: true
            },
            data: {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify({
                    inputs: {
                        goldAktiv: false,
                        goldZielProzent: 6,
                        goldFloorProzent: 1,
                        goldSteuerfrei: false,
                        rebalancingBand: 12
                    }
                }),
                profile_gold_aktiv: 'true',
                profile_gold_ziel_pct: '7,5',
                profile_gold_floor_pct: '2,5',
                profile_gold_steuerfrei: 'true',
                profile_gold_rebal_band: '18'
            }
        },
        lone: {
            meta: {
                id: 'lone',
                name: 'Lone',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                belongsToHousehold: false
            },
            data: {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify({
                    inputs: {
                        goldAktiv: true,
                        goldZielProzent: 9,
                        goldFloorProzent: 2,
                        goldSteuerfrei: true,
                        rebalancingBand: 11
                    }
                })
            }
        }
    }
};

localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(registry));

const profiles = loadHouseholdProfiles();
const dieter = profiles.find(entry => entry.profileId === 'dieter');
const karin = profiles.find(entry => entry.profileId === 'karin');
const petra = profiles.find(entry => entry.profileId === 'petra');
const lone = profiles.find(entry => entry.profileId === 'lone');

assert(!!dieter, 'Dieter profile should be loaded');
assert(!!karin, 'Karin profile should be loaded');
assert(!!petra, 'Petra profile should be loaded');
assertEqual(lone, undefined, 'Profiles excluded from household should not be loaded');

assertEqual(dieter.inputs.goldAktiv, false, 'Dieter should use profile gold aktiv override');
assertEqual(dieter.inputs.goldZielProzent, 5, 'Dieter gold target should use profile override');
assertEqual(dieter.inputs.goldFloorProzent, 1, 'Dieter gold floor should use profile override');
assertEqual(dieter.inputs.goldSteuerfrei, false, 'Dieter gold steuerfrei should use profile override');
assertEqual(dieter.inputs.rebalancingBand, 20, 'Dieter rebalancing band should use profile override');

assertEqual(karin.inputs.goldAktiv, true, 'Karin should keep input gold aktiv when no override');
assertEqual(karin.inputs.goldZielProzent, 8, 'Karin gold target should stay from inputs');
assertEqual(karin.inputs.goldFloorProzent, 2, 'Karin gold floor should stay from inputs');
assertEqual(karin.inputs.goldSteuerfrei, false, 'Karin gold steuerfrei should stay from inputs');
assertEqual(karin.inputs.rebalancingBand, 15, 'Karin rebalancing band should stay from inputs');

assertEqual(petra.inputs.goldAktiv, true, 'Petra should honor gold aktiv override true');
assertClose(petra.inputs.goldZielProzent, 7.5, 0.0001, 'Petra gold target should parse comma override');
assertClose(petra.inputs.goldFloorProzent, 2.5, 0.0001, 'Petra gold floor should parse comma override');
assertEqual(petra.inputs.goldSteuerfrei, true, 'Petra gold steuerfrei should honor override');
assertEqual(petra.inputs.rebalancingBand, 18, 'Petra rebalancing band should honor override');
