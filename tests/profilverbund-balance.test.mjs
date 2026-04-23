// @ts-check

import {
    aggregateProfilverbundInputs,
    calculateTaxPerEuro,
    calculateWithdrawalDistribution,
    loadProfilverbundProfiles,
    selectTranchesForSale
} from '../app/profile/profilverbund-balance.js';
import {
    createProfile,
    ensureProfileRegistry,
    updateProfileData
} from '../app/profile/profile-storage.js';

console.log('--- Profilverbund Balance Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); },
        key: (index) => Array.from(store.keys())[index] || null,
        get length() { return store.size; }
    };
}

const prevLocalStorage = global.localStorage;
global.localStorage = createLocalStorageMock();

// --- TEST 1: Aggregation ---
{
    console.log('\n📋 Test 1: aggregateProfilverbundInputs');
    const profileInputs = [
        {
            profileId: 'a',
            name: 'A',
            inputs: {
                floorBedarf: 20000,
                flexBedarf: 10000,
                renteAktiv: true,
                renteMonatlich: 1000,
                tagesgeld: 10000,
                geldmarktEtf: 5000,
                depotwertAlt: 200000,
                depotwertNeu: 100000,
                goldWert: 0,
                runwayMinMonths: 24,
                runwayTargetMonths: 36
            }
        },
        {
            profileId: 'b',
            name: 'B',
            inputs: {
                floorBedarf: 15000,
                flexBedarf: 5000,
                renteAktiv: false,
                renteMonatlich: 0,
                tagesgeld: 8000,
                geldmarktEtf: 2000,
                depotwertAlt: 50000,
                depotwertNeu: 50000,
                goldWert: 10000,
                runwayMinMonths: 18,
                runwayTargetMonths: 24
            }
        }
    ];

    // Aggregation: Summe aus Bedarf, Renten, Depots, Liquidität, konservative Runway-Min.
    const aggregated = aggregateProfilverbundInputs(profileInputs);
    assertEqual(aggregated.totalBedarf, 50000, 'Total Bedarf should sum floor+flex');
    assertEqual(aggregated.totalRenteJahr, 12000, 'Total Rente should be monthly * 12');
    assertEqual(aggregated.netWithdrawal, 38000, 'Net withdrawal should be Bedarf - Rente');
    assertEqual(aggregated.totalDepot, 410000, 'Total depot should include alt+neu+gold');
    assertEqual(aggregated.totalLiquid, 25000, 'Total liquid should sum tagesgeld+geldmarkt');
    assertEqual(aggregated.runwayMinMonths, 18, 'Runway min should be conservative min');
}

// --- TEST 2: Tax per Euro ---
{
    console.log('\n📋 Test 2: calculateTaxPerEuro');
    const inputs = {
        depotwertAlt: 100,
        depotwertNeu: 0,
        costBasisAlt: 50,
        costBasisNeu: 0,
        kirchensteuerSatz: 9
    };
    const taxPerEuro = calculateTaxPerEuro(inputs);
    assertClose(taxPerEuro, 0.143125, 0.0001, 'Tax per euro should reflect gain ratio and tax rate');
}

// --- TEST 3: Proportional Distribution ---
{
    console.log('\n📋 Test 3: proportional distribution');
    const aggregated = { netWithdrawal: 1000 };
    const profileInputs = [
        { profileId: 'a', name: 'A', inputs: { depotwertAlt: 6000, depotwertNeu: 0, tagesgeld: 0, geldmarktEtf: 0 } },
        { profileId: 'b', name: 'B', inputs: { depotwertAlt: 4000, depotwertNeu: 0, tagesgeld: 0, geldmarktEtf: 0 } }
    ];
    const result = calculateWithdrawalDistribution(profileInputs, aggregated, 'proportional');
    const a = result.items.find(item => item.profileId === 'a');
    const b = result.items.find(item => item.profileId === 'b');
    assertClose(a.withdrawalAmount, 600, 0.001, 'Profile A should get 60% of withdrawal');
    assertClose(b.withdrawalAmount, 400, 0.001, 'Profile B should get 40% of withdrawal');
}

// --- TEST 4: Tax-Optimized Distribution ---
{
    console.log('\n📋 Test 4: tax optimized distribution');
    const aggregated = { netWithdrawal: 800 };
    const profileInputs = [
        {
            profileId: 'a',
            name: 'A',
            inputs: { depotwertAlt: 300, depotwertNeu: 0, costBasisAlt: 290, costBasisNeu: 0 }
        },
        {
            profileId: 'b',
            name: 'B',
            inputs: { depotwertAlt: 700, depotwertNeu: 0, costBasisAlt: 100, costBasisNeu: 0 }
        }
    ];
    const result = calculateWithdrawalDistribution(profileInputs, aggregated, 'tax_optimized');
    const a = result.items.find(item => item.profileId === 'a');
    const b = result.items.find(item => item.profileId === 'b');
    assertClose(a.withdrawalAmount, 300, 0.001, 'Lower tax profile should be used first');
    assertClose(b.withdrawalAmount, 500, 0.001, 'Remaining withdrawal should go to next profile');
    assertEqual(result.remaining, 0, 'Remaining should be zero when assets cover need');
}

// --- TEST 5: Tranche Selection ---
{
    console.log('\n📋 Test 5: selectTranchesForSale');
    const tranches = [
        { marketValue: 100, costBasis: 90, category: 'equity', purchaseDate: '2020-01-01' },
        { marketValue: 100, costBasis: 10, category: 'equity', purchaseDate: '2019-01-01' }
    ];
    const selections = selectTranchesForSale(tranches, 150);
    assertEqual(selections.length, 2, 'Two tranches should be used to reach target');
    assertEqual(selections[0].sellAmount, 100, 'First tranche should be fully sold');
    assertEqual(selections[1].sellAmount, 50, 'Second tranche should cover remaining amount');
}

// --- TEST 6: Tranche Selection ignores non-equity + tie-break by date ---
{
    console.log('\n📋 Test 6: selectTranchesForSale mixed categories');
    const tranches = [
        { marketValue: 100, costBasis: 90, category: 'equity', purchaseDate: '2010-01-01', name: 'A' }, // low tax, older
        { marketValue: 50, costBasis: 45, category: 'equity', purchaseDate: '2020-01-01', name: 'B' },  // low tax, newer
        { marketValue: 100, costBasis: 50, category: 'equity', purchaseDate: '2015-01-01', name: 'C' }, // higher tax
        { marketValue: 80, costBasis: 80, category: 'gold', purchaseDate: '2012-01-01', name: 'Gold' },
        { marketValue: 60, costBasis: 60, category: 'money_market', purchaseDate: '2011-01-01', name: 'MM' }
    ];

    const selections = selectTranchesForSale(tranches, 120);
    assertEqual(selections.length, 2, 'Should use two equity tranches to reach target');
    assertEqual(selections[0].tranche.name, 'A', 'Lower tax + older tranche should be sold first');
    assertEqual(selections[1].tranche.name, 'B', 'Second low-tax tranche should fill remaining');
    assertEqual(selections[0].sellAmount, 100, 'First tranche fully sold');
    assertEqual(selections[1].sellAmount, 20, 'Second tranche partially sold to reach target');
}

// --- TEST 7: Profiles without saved balance state still load via overrides/tranches ---
{
    console.log('\n📋 Test 7: loadProfilverbundProfiles fallback ohne Balance-State');
    localStorage.clear();
    ensureProfileRegistry();

    const profile = createProfile('Nur Assets');
    updateProfileData(profile.id, {
        profile_tagesgeld: '25000',
        profile_rente_monatlich: '1200',
        depot_tranchen: JSON.stringify([
            { trancheId: 't1', marketValue: 100000, costBasis: 80000, category: 'equity', type: 'aktien_alt' },
            { trancheId: 't2', marketValue: 15000, costBasis: 15000, category: 'money_market', type: 'geldmarkt' }
        ])
    });

    const profiles = loadProfilverbundProfiles();
    const loaded = profiles.find(entry => entry.profileId === profile.id);

    assert(loaded, 'Profil sollte auch ohne Balance-State geladen werden');
    assertEqual(loaded.inputs.tagesgeld, 25000, 'Tagesgeld-Override sollte übernommen werden');
    assertEqual(loaded.inputs.renteMonatlich, 1200, 'Rente-Override sollte übernommen werden');
    assertEqual(loaded.inputs.depotwertAlt, 100000, 'Equity-Tranche sollte als Depotwert übernommen werden');
    assertEqual(loaded.inputs.geldmarktEtf, 15000, 'Money-Market-Tranche sollte übernommen werden');
    assertEqual(loaded.tranches.length, 2, 'Tranchen sollten erhalten bleiben');
}

global.localStorage = prevLocalStorage;
