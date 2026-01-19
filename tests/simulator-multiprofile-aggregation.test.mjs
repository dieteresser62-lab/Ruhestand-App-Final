// @ts-check

import { combineSimulatorProfiles } from '../simulator-profile-inputs.js';

console.log('--- Simulator Multi-Profile Aggregation ---');

const profileInputs = [
    {
        profileId: 'a',
        name: 'A',
        inputs: {
            startVermoegen: 100000,
            depotwertAlt: 80000,
            tagesgeld: 10000,
            geldmarktEtf: 10000,
            einstandAlt: 50000,
            startFloorBedarf: 12000,
            startFlexBedarf: 6000,
            renteMonatlich: 1000,
            startAlter: 65,
            geschlecht: 'm',
            startSPB: 1000,
            kirchensteuerSatz: 0.09,
            renteStartOffsetJahre: 0,
            rentAdjMode: 'fix',
            rentAdjPct: 2,
            goldAktiv: true,
            goldZielProzent: 8,
            goldFloorProzent: 1,
            rebalancingBand: 25,
            goldSteuerfrei: true,
            targetEq: 60,
            rebalBand: 5,
            maxSkimPctOfEq: 10,
            maxBearRefillPctOfEq: 5
        }
    },
    {
        profileId: 'b',
        name: 'B',
        inputs: {
            startVermoegen: 200000,
            depotwertAlt: 150000,
            tagesgeld: 20000,
            geldmarktEtf: 30000,
            einstandAlt: 120000,
            startFloorBedarf: 10000,
            startFlexBedarf: 4000,
            renteMonatlich: 500,
            startAlter: 63,
            geschlecht: 'w',
            startSPB: 800,
            kirchensteuerSatz: 0.08,
            renteStartOffsetJahre: 1,
            rentAdjMode: 'fix',
            rentAdjPct: 2,
            goldAktiv: false,
            goldZielProzent: 0,
            goldFloorProzent: 0,
            rebalancingBand: 25,
            goldSteuerfrei: false,
            targetEq: 55,
            rebalBand: 6,
            maxSkimPctOfEq: 12,
            maxBearRefillPctOfEq: 4
        }
    }
];

{
    console.log('\n📋 Test 1: Two profiles');
    const result = combineSimulatorProfiles(profileInputs, 'a');
    assert(result.combined, 'Combined inputs should be created');
    const combined = result.combined;
    assertEqual(combined.startVermoegen, 300000, 'Startvermoegen should sum across profiles');
    assertEqual(combined.startFloorBedarf, 22000, 'Floor Bedarf should sum across profiles');
    assertEqual(combined.startFlexBedarf, 10000, 'Flex Bedarf should sum across profiles');
    assertEqual(combined.renteMonatlich, 1000, 'Primary rent should remain after partner split');
    assertEqual(combined.partner.monatsrente, 500, 'Partner rent should reflect secondary profile');
    assertEqual(combined.partner.aktiv, true, 'Partner should be active for 2 profiles');
    assertEqual(combined.partner.startAlter, 63, 'Partner age should come from second profile');
    assertEqual(combined.geschlecht, 'm', 'Primary gender should come from primary profile');
}

{
    console.log('\n📋 Test 2: More than two profiles warning');
    const extended = profileInputs.concat({
        profileId: 'c',
        name: 'C',
        inputs: {
            startVermoegen: 50000,
            depotwertAlt: 30000,
            tagesgeld: 10000,
            geldmarktEtf: 10000,
            einstandAlt: 20000,
            startFloorBedarf: 5000,
            startFlexBedarf: 2000,
            renteMonatlich: 300,
            startAlter: 60,
            geschlecht: 'w',
            startSPB: 700,
            kirchensteuerSatz: 0.09,
            renteStartOffsetJahre: 0,
            rentAdjMode: 'fix',
            rentAdjPct: 2,
            goldAktiv: false
        }
    });
    const result = combineSimulatorProfiles(extended, 'a');
    assert(result.warnings.some(msg => msg.includes('Mehr als 2 Profile')), 'Warning should mention >2 profiles');
}
