// @ts-check

import {
    aggregateProfilverbundInputs,
    calculateTaxPerEuro,
    calculateWithdrawalDistribution,
    selectTranchesForSale
} from '../profilverbund-balance.js';

console.log('--- Profilverbund Balance Tests ---');

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
