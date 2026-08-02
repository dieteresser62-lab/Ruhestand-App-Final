// @ts-check

import {
    buildSimulatorInputsFromProfileData,
    combineSimulatorProfiles
} from '../app/simulator/simulator-profile-inputs.js';

console.log('--- Simulator Multi-Profile Aggregation ---');

{
    console.log('\n📋 Test 0: Persisted care drift keeps percent storage and one runtime normalization');
    const cases = [
        { stored: '0', expected: 0, label: 'zero' },
        { stored: '3.5', expected: 0.035, label: '3.5 percent' },
        { stored: '100', expected: 1, label: '100 percent' },
        { stored: '-1', expected: 0, label: 'negative' },
        { stored: 'invalid', expected: 0, label: 'invalid' }
    ];
    for (const testCase of cases) {
        const profileData = { sim_pflegeKostenDrift: testCase.stored };
        const parsed = buildSimulatorInputsFromProfileData(profileData);
        assertEqual(
            parsed.pflegeKostenDrift,
            testCase.expected,
            `Stored care drift ${testCase.label} should satisfy the runtime ratio contract`
        );
        assertEqual(
            profileData.sim_pflegeKostenDrift,
            testCase.stored,
            `Stored care drift ${testCase.label} should not be migrated or mutated`
        );
    }
    assertEqual(
        buildSimulatorInputsFromProfileData({}).pflegeKostenDrift,
        0,
        'Missing persisted care drift should keep the legacy 0 percent fallback'
    );
    const migratedLegacyRunway = buildSimulatorInputsFromProfileData({
        sim_runwayTargetMonths: '25'
    });
    assertEqual(
        migratedLegacyRunway.liquidityRunwayYears,
        2.5,
        'A profile created with the old 25-month UI value remains loadable without shortening its runway'
    );
}

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
            minimumFlexAnnual: 0,
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
            minimumFlexAnnual: 2500,
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
    // Primary profile = 'a', Partner aus Profil 'b'.
    const result = combineSimulatorProfiles(profileInputs, 'a');
    assert(result.combined, 'Combined inputs should be created');
    const combined = result.combined;
    assertEqual(combined.startVermoegen, 300000, 'Startvermoegen should sum across profiles');
    assertEqual(combined.startFloorBedarf, 22000, 'Floor Bedarf should sum across profiles');
    assertEqual(combined.startFlexBedarf, 10000, 'Flex Bedarf should sum across profiles');
    assertEqual(combined.minimumFlexAnnual, 2500, 'Mindest-Flex should sum across profiles');
    assertEqual(combined.minimumFlexProfiles.length, 2, 'Mindest-Flex profile split should be kept');
    assertEqual(combined.minimumFlexProfiles[0].minimumFlexAnnual, 0, 'Profile A minimum flex split should be 0');
    assertEqual(combined.minimumFlexProfiles[1].minimumFlexAnnual, 2500, 'Profile B minimum flex split should be retained');
    assertEqual(combined.renteMonatlich, 1000, 'Primary rent should remain after partner split');
    assertEqual(combined.partner.monatsrente, 500, 'Partner rent should reflect secondary profile');
    assertEqual(combined.partner.aktiv, true, 'Partner should be active for 2 profiles');
    assertEqual(combined.partner.startAlter, 63, 'Partner age should come from second profile');
    assertEqual(combined.geschlecht, 'm', 'Primary gender should come from primary profile');
}

{
    console.log('\n📋 Test 2: Health bucket remains primary household setting');
    const withHealthBucketDiffs = [
        {
            profileId: 'a',
            name: 'A',
            inputs: {
                ...profileInputs[0].inputs,
                healthBucket: {
                    enabled: true,
                    initialAmount: 150000,
                    assetSource: 'money_market_first_then_cash',
                    triggerMinGrade: 4,
                    triggerMode: 'OR',
                    coverageMode: 'care_additional_floor_only',
                    returnMode: 'cash_return',
                    targetMode: 'inflation_indexed_diagnostic'
                },
                healthBucketEnabled: true,
                healthBucketInitialAmount: 150000
            }
        },
        {
            profileId: 'b',
            name: 'B',
            inputs: {
                ...profileInputs[1].inputs,
                healthBucket: {
                    enabled: false,
                    initialAmount: 100000,
                    assetSource: 'money_market_first_then_cash',
                    triggerMinGrade: 5,
                    triggerMode: 'AND',
                    coverageMode: 'floor_when_care_active',
                    returnMode: 'cash_return',
                    targetMode: 'nominal_fixed'
                }
            }
        }
    ];

    const result = combineSimulatorProfiles(withHealthBucketDiffs, 'a');
    assertEqual(result.combined.healthBucket.initialAmount, 150000,
        'Primary profile health bucket should be retained');
    assert(result.warnings.some(msg => msg.includes('Pflegebucket-Konfiguration')),
        'Differing health bucket configs should warn');
}

{
    console.log('\n📋 Test 3: More than two profiles warning');
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
    assertEqual(result.combined.startVermoegen, 350000, 'Financial assets from third profile should remain included');
}

{
    console.log('\n📋 Test 4: Dynamic-Flex profile differences should not produce household warning');
    const withDynamicDiffs = [
        {
            profileId: 'a',
            name: 'A',
            inputs: {
                ...profileInputs[0].inputs,
                dynamicFlex: false,
                horizonMethod: 'survival_quantile',
                horizonYears: 30,
                survivalQuantile: 0.85,
                goGoActive: false,
                goGoMultiplier: 1.0
            }
        },
        {
            profileId: 'b',
            name: 'B',
            inputs: {
                ...profileInputs[1].inputs,
                dynamicFlex: true,
                horizonMethod: 'mean',
                horizonYears: 22,
                survivalQuantile: 0.75,
                goGoActive: true,
                goGoMultiplier: 1.2
            }
        }
    ];
    const result = combineSimulatorProfiles(withDynamicDiffs, 'a');
    const warningText = (result.warnings || []).join(' ');
    assert(!warningText.includes('Dynamic Flex unterscheidet sich'), 'No dynamic-flex mismatch warning expected');
    assert(!warningText.includes('Dynamic-Flex Horizon Jahre unterscheiden sich'), 'No dynamic-flex horizon warning expected');
    assert(!warningText.includes('Dynamic-Flex Survival-Quantil unterscheidet sich'), 'No dynamic-flex quantile warning expected');
    assert(!warningText.includes('Dynamic-Flex Go-Go Aktivierung unterscheidet sich'), 'No dynamic-flex go-go warning expected');
    assert(!warningText.includes('Dynamic-Flex Go-Go Multiplikator unterscheidet sich'), 'No dynamic-flex multiplier warning expected');
}

{
    console.log('\n📋 Test 5: Detailed tranches merge with unique profile-scoped ids');
    const withTranches = [
        {
            profileId: 'a',
            name: 'A',
            inputs: {
                ...profileInputs[0].inputs,
                startVermoegen: 999999,
                tagesgeld: 10000,
                geldmarktEtf: 5000,
                detailledTranches: [
                    {
                        trancheId: 'shared', marketValue: 80000, costBasis: 60000,
                        type: 'aktien_alt', metadata: { ownerLabel: 'A' }
                    },
                    {
                        trancheId: 'money', marketValue: 7000, costBasis: 7000,
                        type: 'geldmarkt', category: 'money_market'
                    }
                ]
            }
        },
        {
            profileId: 'b',
            name: 'B',
            inputs: {
                ...profileInputs[1].inputs,
                startVermoegen: 999999,
                tagesgeld: 20000,
                geldmarktEtf: 0,
                detailledTranches: [
                    { trancheId: 'shared', marketValue: 50000, costBasis: 45000, type: 'aktien_alt' },
                    { trancheId: 'gold', marketValue: 10000, costBasis: 9000, type: 'gold', category: 'gold' }
                ]
            }
        }
    ];

    const result = combineSimulatorProfiles(withTranches, 'a');
    const tranches = result.combined.detailledTranches;
    assertEqual(tranches.length, 4, 'All profile tranches should be merged');
    assertEqual(tranches[0].trancheId, 'a:shared', 'First profile tranche id should be profile-scoped');
    assertEqual(tranches[2].trancheId, 'b:shared', 'Second profile tranche id should be profile-scoped');
    assertEqual(tranches[3].sourceProfileId, 'b', 'Merged tranche should keep sourceProfileId');
    assertEqual(result.combined.geldmarktEtf, 7000,
        'Detailed money market should replace the overlapping aggregate value');
    assertEqual(result.combined.startVermoegen, 177000,
        'Startvermoegen should include detailed lots and cash exactly once');
    tranches[0].metadata.ownerLabel = 'mutated';
    assertEqual(withTranches[0].inputs.detailledTranches[0].metadata.ownerLabel, 'A',
        'Household merge should deep-copy nested tranche metadata');
}

{
    console.log('\n📋 Test 6: Zero-market tranches remain explicit and do not fall back');
    const withEmptyTranches = [
        {
            profileId: 'a',
            name: 'A',
            inputs: {
                ...profileInputs[0].inputs,
                startVermoegen: 100000,
                depotwertAlt: 90000,
                tagesgeld: 0,
                geldmarktEtf: 0,
                detailledTranches: [
                    { trancheId: 'empty', marketValue: 0, costBasis: 0, type: 'aktien_alt' }
                ]
            }
        }
    ];

    const result = combineSimulatorProfiles(withEmptyTranches, 'a');
    assertEqual(result.combined.detailledTranches.length, 1,
        'Zero-market detail input should remain explicit');
    assertEqual(result.combined.startVermoegen, 0,
        'Zero-market detail input must not fall back to aggregate start assets');
}

{
    console.log('\n📋 Test 7: Explicit empty and corrupt profile inputs fail closed');
    const parsedEmpty = buildSimulatorInputsFromProfileData({
        depot_tranchen: '[]',
        profile_tagesgeld: '5000',
        sim_simStartVermoegen: '100000',
        sim_depotwertAlt: '90000',
        sim_geldmarktEtf: '5000'
    });
    assertEqual(parsedEmpty.trancheInputState, 'empty', 'Profile parser should preserve explicit empty state');
    assertEqual(parsedEmpty.detailledTranches.length, 0, 'Profile parser should preserve explicit empty list');
    assertEqual(parsedEmpty.startVermoegen, 5000, 'Profile parser must not restore aggregate assets for explicit empty lots');

    const emptyResult = combineSimulatorProfiles([{
        profileId: 'a',
        name: 'A',
        inputs: {
            ...profileInputs[0].inputs,
            startVermoegen: 100000,
            depotwertAlt: 90000,
            tagesgeld: 5000,
            geldmarktEtf: 5000,
            detailledTranches: [],
            trancheInputState: 'empty'
        }
    }], 'a');
    assert(Array.isArray(emptyResult.combined.detailledTranches), 'Explicit empty list should remain an array');
    assertEqual(emptyResult.combined.detailledTranches.length, 0, 'Explicit empty list should remain empty');
    assertEqual(emptyResult.combined.startVermoegen, 5000, 'Only separate cash should remain for explicit empty lots');

    const parsedCorrupt = buildSimulatorInputsFromProfileData({ depot_tranchen: '{invalid' });
    assertEqual(parsedCorrupt.trancheInputState, 'corrupt', 'Profile parser should expose corrupt state');
    const corruptResult = combineSimulatorProfiles([{
        profileId: 'a',
        name: 'A',
        inputs: { ...profileInputs[0].inputs, ...parsedCorrupt }
    }], 'a');
    assertEqual(corruptResult.combined, null, 'Corrupt tranche input should block household aggregation');
    assert(corruptResult.warnings.some(message => message.includes('fehlerhaft')),
        'Corrupt tranche input should expose a blocking warning');
}

{
    console.log('\n📋 Test 8: O-06 hybrid detail and aggregate profiles fail closed');
    const hybridProfiles = [
        {
            profileId: 'detail',
            name: 'Detail',
            inputs: {
                ...profileInputs[0].inputs,
                startVermoegen: 90000,
                depotwertAlt: 80000,
                tagesgeld: 10000,
                geldmarktEtf: 0,
                detailledTranches: [
                    {
                        trancheId: 'detail-equity',
                        marketValue: 80000,
                        costBasis: 60000,
                        type: 'aktien_alt',
                        category: 'equity'
                    }
                ],
                trancheInputState: 'valid'
            }
        },
        {
            profileId: 'aggregate',
            name: 'Aggregat',
            inputs: {
                ...profileInputs[1].inputs,
                startVermoegen: 200000,
                depotwertAlt: 150000,
                tagesgeld: 20000,
                geldmarktEtf: 30000,
                detailledTranches: null,
                trancheInputState: 'absent'
            }
        }
    ];

    const result = combineSimulatorProfiles(hybridProfiles, 'detail');
    assertEqual(result.combined, null,
        'O-06 must block a hybrid household instead of returning 110000 or 140000 EUR');
    assert(result.warnings.some(message => message.includes('Aggregat')),
        'O-06 blocking message should identify the aggregate-only profile');
    assertEqual(result.errorCode, 'SIMULATOR_PROFILE_ASSET_PROVENANCE_MISSING',
        'O-06 should expose a stable fail-closed error code');
}

{
    console.log('\n📋 Test 9: Detail plus explicit empty or cash-only missing profile remains lossless');
    const detailProfile = {
        profileId: 'detail',
        name: 'Detail',
        inputs: {
            ...profileInputs[0].inputs,
            startVermoegen: 90000,
            depotwertAlt: 80000,
            tagesgeld: 10000,
            geldmarktEtf: 0,
            detailledTranches: [
                {
                    trancheId: 'detail-equity',
                    marketValue: 80000,
                    costBasis: 60000,
                    type: 'aktien_alt',
                    category: 'equity'
                }
            ],
            trancheInputState: 'valid'
        }
    };
    const explicitEmpty = {
        profileId: 'empty',
        name: 'Leer',
        inputs: {
            ...profileInputs[1].inputs,
            startVermoegen: 20000,
            depotwertAlt: 0,
            tagesgeld: 20000,
            geldmarktEtf: 0,
            detailledTranches: [],
            trancheInputState: 'empty'
        }
    };
    const cashOnlyMissing = {
        profileId: 'cash',
        name: 'Cash',
        inputs: {
            ...profileInputs[1].inputs,
            startVermoegen: 15000,
            depotwertAlt: 0,
            tagesgeld: 15000,
            geldmarktEtf: 0,
            detailledTranches: null,
            trancheInputState: 'absent'
        }
    };

    const emptyResult = combineSimulatorProfiles([detailProfile, explicitEmpty], 'detail');
    assertEqual(emptyResult.combined.startVermoegen, 110000,
        'Explicit empty profile should retain separate cash exactly once');
    const cashResult = combineSimulatorProfiles([detailProfile, cashOnlyMissing], 'detail');
    assertEqual(cashResult.combined.startVermoegen, 105000,
        'Missing tranche data with cash only should retain provenanced cash exactly once');
}

{
    console.log('\n📋 Test 10: O-07 profile gold targets aggregate as euros, independent of primary profile');
    const goldProfiles = [
        {
            profileId: 'gold',
            name: 'Gold',
            inputs: {
                ...profileInputs[0].inputs,
                startVermoegen: 100000,
                depotwertAlt: 100000,
                tagesgeld: 0,
                geldmarktEtf: 0,
                goldAktiv: true,
                goldZielProzent: 8,
                goldFloorProzent: 1
            }
        },
        {
            profileId: 'plain',
            name: 'Ohne Gold',
            inputs: {
                ...profileInputs[1].inputs,
                startVermoegen: 900000,
                depotwertAlt: 900000,
                tagesgeld: 0,
                geldmarktEtf: 0,
                goldAktiv: false,
                goldZielProzent: 0,
                goldFloorProzent: 0
            }
        }
    ];

    const goldPrimary = combineSimulatorProfiles(goldProfiles, 'gold').combined;
    const plainPrimary = combineSimulatorProfiles(goldProfiles, 'plain').combined;
    assertClose(goldPrimary.goldZielBetrag, 8000, 0.0001,
        'O-07 absolute household gold target should be 8000 EUR');
    assertClose(goldPrimary.goldFloorBetrag, 1000, 0.0001,
        'Profile gold floor should aggregate as an absolute euro amount');
    assertClose(goldPrimary.goldZielProzent, 0.8, 0.0000001,
        'O-07 adapter household percentage should be 0.8 percent');
    assertClose(plainPrimary.goldZielBetrag, goldPrimary.goldZielBetrag, 0.0001,
        'Active primary profile must not change the absolute gold target');
    assertClose(plainPrimary.goldZielProzent, goldPrimary.goldZielProzent, 0.0000001,
        'Active primary profile must not change the adapter household percentage');
    assertEqual(goldPrimary.goldStrategyDiagnostics.length, 2,
        'Gold strategy should retain one diagnostic entry per selected profile');
}

{
    console.log('\n📋 Test 11: Care bucket is excluded from each profile gold base');
    const careProfiles = [
        {
            profileId: 'care',
            name: 'Pflege',
            inputs: {
                ...profileInputs[0].inputs,
                startVermoegen: 100000,
                depotwertAlt: 60000,
                tagesgeld: 20000,
                geldmarktEtf: 20000,
                goldAktiv: true,
                goldZielProzent: 8,
                goldFloorProzent: 1,
                healthBucket: {
                    enabled: true,
                    initialAmount: 30000
                }
            }
        },
        {
            profileId: 'plain',
            name: 'Ohne Gold',
            inputs: {
                ...profileInputs[1].inputs,
                startVermoegen: 900000,
                depotwertAlt: 900000,
                tagesgeld: 0,
                geldmarktEtf: 0,
                goldAktiv: false,
                goldZielProzent: 0,
                goldFloorProzent: 0
            }
        }
    ];

    const combined = combineSimulatorProfiles(careProfiles, 'care').combined;
    assertClose(combined.goldBasisVermoegen, 970000, 0.0001,
        'Household gold base should exclude the 30000 EUR care bucket');
    assertClose(combined.goldZielBetrag, 5600, 0.0001,
        'Care profile target should use its 70000 EUR free base');
    assertClose(combined.goldZielProzent, (5600 / 970000) * 100, 0.0000001,
        'Household quote should reconcile absolute target to the free household base');
    const careDiagnostic = combined.goldStrategyDiagnostics.find(entry => entry.profileId === 'care');
    assertClose(careDiagnostic.excludedHealthBucket, 30000, 0.0001,
        'Profile diagnostic should expose the care-bucket exclusion');
}
