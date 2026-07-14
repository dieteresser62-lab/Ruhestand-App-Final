// @ts-check

import {
    aggregateProfilverbundInputs,
    buildProfilverbundAssetSummary,
    buildProfileOwnedTranches,
    buildProfilverbundProfileSummaries,
    calculateHouseholdWithdrawalNeed,
    calculateTaxPerEuro,
    calculateWithdrawalDistribution,
    loadProfilverbundProfiles,
    selectTranchesForSale
} from '../app/profile/profilverbund-balance.js';
import {
    attributeHouseholdAction,
    calculateActionLiquidityDelta,
    reconcileHouseholdLiquidityKpis
} from '../app/profile/profilverbund-action-attribution.js';
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

// --- TEST 4b: Runway-first Distribution ---
{
    console.log('\n📋 Test 4b: runway-first distribution');
    const aggregated = { netWithdrawal: 1000 };
    const profileInputs = [
        {
            profileId: 'a',
            name: 'A',
            inputs: { depotwertAlt: 5000, tagesgeld: 0, geldmarktEtf: 0, runwayTargetMonths: 36 }
        },
        {
            profileId: 'b',
            name: 'B',
            inputs: { depotwertAlt: 5000, tagesgeld: 0, geldmarktEtf: 0, runwayTargetMonths: 12 }
        }
    ];
    const result = calculateWithdrawalDistribution(profileInputs, aggregated, 'runway_first');
    const a = result.items.find(item => item.profileId === 'a');
    const b = result.items.find(item => item.profileId === 'b');
    assertClose(a.withdrawalAmount, 750, 0.001, 'Profile A should get 75% by runway target weight');
    assertClose(b.withdrawalAmount, 250, 0.001, 'Profile B should get 25% by runway target weight');
    assertEqual(result.remaining, 0, 'Runway-first distribution should allocate full need');
}

// --- TEST 4c: Cash first before tranche sales ---
{
    console.log('\n📋 Test 4c: tax optimized cash first and tranche sale');
    const aggregated = { netWithdrawal: 220 };
    const profileInputs = [
        {
            profileId: 'a',
            name: 'A',
            inputs: {
                depotwertAlt: 500,
                depotwertNeu: 0,
                costBasisAlt: 450,
                costBasisNeu: 0,
                tagesgeld: 100,
                geldmarktEtf: 50
            },
            tranches: [
                { trancheId: 'old-low', marketValue: 200, costBasis: 190, category: 'equity', purchaseDate: '2010-01-01' },
                { trancheId: 'new-high', marketValue: 200, costBasis: 100, category: 'equity', purchaseDate: '2020-01-01' }
            ]
        }
    ];
    const result = calculateWithdrawalDistribution(profileInputs, aggregated, 'tax_optimized');
    const item = result.items[0];
    assertClose(item.cashUsed, 150, 0.001, 'Distribution should consume Tagesgeld and Geldmarkt first');
    assertClose(item.sellAmount, 70, 0.001, 'Only remaining need should be sold from tranches');
    assertEqual(item.tranches.length, 1, 'Only one tranche should be needed after cash usage');
    assertEqual(item.tranches[0].tranche.trancheId, 'old-low', 'Lower-tax tranche should be selected first');
    assertClose(item.tranches[0].sellAmount, 70, 0.001, 'Tranche sale should cover remaining need');
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

// --- TEST 8: Asset summaries prefer detailed tranches over aggregate fields ---
{
    console.log('\n📋 Test 8: asset summaries avoid double counting tranches');
    const profileInputs = [
        {
            profileId: 'a',
            name: 'A',
            inputs: {
                tagesgeld: 10,
                geldmarktEtf: 999,
                depotwertAlt: 999,
                depotwertNeu: 999,
                goldWert: 999,
                costBasisAlt: 999,
                costBasisNeu: 999,
                goldCost: 999,
                renteAktiv: true,
                renteMonatlich: 100
            },
            tranches: [
                { trancheId: 'alt', marketValue: 100, costBasis: 70, type: 'aktien_alt' },
                { trancheId: 'neu', marketValue: 50, costBasis: 45, type: 'aktien_neu' },
                { trancheId: 'bond', marketValue: 40, costBasis: 38, category: 'bonds', type: 'anleihe' },
                { trancheId: 'gold', marketValue: 20, costBasis: 15, category: 'gold', type: 'gold' },
                { trancheId: 'mm', marketValue: 30, costBasis: 30, category: 'money_market', type: 'geldmarkt' }
            ]
        }
    ];

    const summary = buildProfilverbundAssetSummary(profileInputs);
    assertEqual(summary.totalDepotAlt, 100, 'Summary should use alt tranche value');
    assertEqual(summary.totalDepotNeu, 90, 'Summary should include equity and bond tranches in the legacy neu total');
    assertEqual(summary.totalGold, 20, 'Summary should use gold tranche value');
    assertEqual(summary.totalGeldmarkt, 30, 'Summary should use money-market tranche value');
    assertEqual(summary.totalTagesgeld, 10, 'Summary should still include Tagesgeld input');
    assertEqual(summary.totalCostAlt, 70, 'Summary should use alt tranche cost basis');
    assertEqual(summary.mergedTranches[0].sourceProfileId, 'a', 'Merged tranche should retain profile provenance');
    assertEqual(profileInputs[0].tranches[0].sourceProfileId, undefined, 'Provenance tagging must not mutate stored tranches');

    const profileSummary = buildProfilverbundProfileSummaries(profileInputs)[0];
    assertEqual(profileSummary.depotAlt, 100, 'Profile summary should use alt tranche value');
    assertEqual(profileSummary.depotNeu, 90, 'Profile summary should include the bond tranche in the legacy neu total');
    assertEqual(profileSummary.gold, 20, 'Profile summary should use gold tranche value');
    assertEqual(profileSummary.geldmarkt, 30, 'Profile summary should use money-market tranche value');
    assertEqual(profileSummary.totalAssets, 250, 'Profile summary should not double-count aggregate asset fields');
}

// --- TEST 8b: Profiles without stored tranches receive attributable synthetic fallbacks ---
{
    console.log('\n📋 Test 8b: synthetic household tranches retain profile ownership');
    const entry = {
        profileId: 'fallback-a',
        name: 'Fallback A',
        inputs: {
            depotwertAlt: 100,
            costBasisAlt: 70,
            tqfAlt: 1,
            depotwertNeu: 50,
            costBasisNeu: 40,
            tqfNeu: 0.3,
            goldWert: 20,
            goldCost: 10,
            goldSteuerfrei: true,
            geldmarktEtf: 30
        },
        tranches: []
    };
    const owned = buildProfileOwnedTranches(entry);
    assertEqual(owned.length, 4, 'Fallback should expose every positive profile asset exactly once');
    assert(owned.every(tranche => tranche.sourceProfileId === 'fallback-a'), 'Every fallback tranche should have one sourceProfileId');
    assert(owned.every(tranche => tranche.syntheticProfileFallback === true), 'Fallback tranches should remain diagnostically identifiable');
}

// --- TEST 9: Household need counts shared spending and all income exactly once ---
{
    console.log('\n📋 Test 9: household withdrawal need is calculated once');
    const profiles = [
        { profileId: 'a', inputs: { floorBedarf: 99999, flexBedarf: 99999, renteAktiv: true, renteMonatlich: 1000 } },
        { profileId: 'b', inputs: { floorBedarf: 99999, flexBedarf: 99999, renteAktiv: true, renteMonatlich: 500 } }
    ];
    const need = calculateHouseholdWithdrawalNeed(profiles, { floorBedarf: 40000, flexBedarf: 10000 });
    assertEqual(need.grossNeed, 50000, 'Household floor and flex overrides should be used once');
    assertEqual(need.incomeAnnual, 18000, 'Different profile incomes should be counted once');
    assertEqual(need.netWithdrawal, 32000, 'Net withdrawal should subtract household income once');
}

// --- TEST 12: Household action attribution prevents profile-level countermovements ---
{
    console.log('\n📋 Test 12: household purposes remain authoritative');
    const profiles = [
        {
            profileId: 'cash-profile',
            name: 'Cash Profile',
            inputs: { tagesgeld: 20000, geldmarktEtf: 0, sparerPauschbetrag: 1000, kirchensteuerSatz: 0 },
            balanceState: { lastState: { taxState: { lossCarry: 0 } } }
        },
        {
            profileId: 'sale-profile',
            name: 'Sale Profile',
            inputs: { tagesgeld: 0, geldmarktEtf: 0, sparerPauschbetrag: 1000, kirchensteuerSatz: 0 },
            balanceState: { lastState: { taxState: { lossCarry: 0 } } }
        }
    ];
    const householdAction = {
        type: 'TRANSACTION',
        title: 'Liquiditaet auffuellen',
        quellen: [{
            kind: 'aktien_neu',
            category: 'equity',
            sourceProfileId: 'sale-profile',
            brutto: 40000,
            steuer: 0,
            netto: 40000,
            realizedGainSigned: 0,
            taxableAfterTqfSigned: 0
        }],
        verwendungen: { liquiditaet: 40000, aktien: 0, gold: 0 }
    };
    const attributed = attributeHouseholdAction({ householdAction, profiles, mode: 'tax_optimized' });
    assertEqual(attributed.finalAction.quellen.length, 1, 'Attribution must not add a cash-funded counter-purchase');
    assertEqual(attributed.finalAction.quellen[0].sourceProfileId, 'sale-profile', 'Selected household sale keeps its owner');
    assertClose(attributed.finalAction.verwendungen.liquiditaet, 40000, 0.001, 'Household liquidity purpose remains unchanged');
    assertClose(calculateActionLiquidityDelta(attributed.finalAction), 40000, 0.001, 'Final action increases liquidity by the household amount');
    const cashProfileAction = attributed.profileActions.find(entry => entry.profileId === 'cash-profile').action;
    assertEqual(cashProfileAction.quellen.length, 0, 'Profile with cash receives no invented purchase source');
    assertClose(cashProfileAction.verwendungen.aktien, 0, 0.001, 'Profile with cash receives no invented equity purchase');
}

// --- TEST 13: Profile tax settlements use only attributed sales and preserve no-sale carry ---
{
    console.log('\n📋 Test 13: per-profile tax settlement and loss carry');
    const profiles = [
        {
            profileId: 'gain',
            inputs: { tagesgeld: 0, geldmarktEtf: 0, sparerPauschbetrag: 1000, kirchensteuerSatz: 0 },
            balanceState: { lastState: { taxState: { lossCarry: 1000 }, guardrail: 'keep' } }
        },
        {
            profileId: 'loss',
            inputs: { tagesgeld: 0, geldmarktEtf: 0, sparerPauschbetrag: 1000, kirchensteuerSatz: 0.08 },
            balanceState: { lastState: { taxState: { lossCarry: 0 } } }
        },
        {
            profileId: 'no-sale',
            inputs: { tagesgeld: 0, geldmarktEtf: 0, sparerPauschbetrag: 1000, kirchensteuerSatz: 0 },
            balanceState: { lastState: { taxState: { lossCarry: 123.45 } } }
        }
    ];
    const householdAction = {
        type: 'TRANSACTION',
        quellen: [
            {
                kind: 'aktien_neu', sourceProfileId: 'gain', brutto: 10000, steuer: 0, netto: 10000,
                realizedGainSigned: 5000, taxableAfterTqfSigned: 3500
            },
            {
                kind: 'aktien_neu', sourceProfileId: 'loss', brutto: 5000, steuer: 0, netto: 5000,
                realizedGainSigned: -1000, taxableAfterTqfSigned: -700
            }
        ],
        verwendungen: { liquiditaet: 14604.375 }
    };
    const attributed = attributeHouseholdAction({ householdAction, profiles });
    const gainSettlement = attributed.settlements.find(entry => entry.profileId === 'gain');
    const lossSettlement = attributed.settlements.find(entry => entry.profileId === 'loss');
    const noSaleSettlement = attributed.settlements.find(entry => entry.profileId === 'no-sale');
    assertClose(gainSettlement.taxDue, 395.625, 0.001, 'Gain profile applies only its own loss carry and allowance');
    assertClose(gainSettlement.taxStateNext.lossCarry, 0, 0.001, 'Consumed gain-profile loss carry is cleared');
    assertClose(lossSettlement.taxDue, 0, 0.001, 'Loss profile owes no tax');
    assertClose(lossSettlement.taxStateNext.lossCarry, 700, 0.001, 'Loss increases only the selling profile carry');
    assertClose(noSaleSettlement.taxStateNext.lossCarry, 123.45, 0.001, 'Profile without sale preserves its loss carry exactly');
    assertClose(attributed.finalAction.steuer, 395.625, 0.001, 'Household tax equals the sum of final profile settlements');
    assertClose(
        attributed.finalAction.quellen.reduce((total, source) => total + source.netto, 0),
        attributed.finalAction.verwendungen.liquiditaet,
        0.01,
        'Final gross-tax-net flow finances the household purpose'
    );
}

// --- TEST 14: Cash-funded household purchase is attributed without an offsetting sale ---
{
    console.log('\n📋 Test 14: cash purchase attribution');
    const profiles = [
        {
            profileId: 'cash-owner',
            inputs: { tagesgeld: 20000, geldmarktEtf: 0, sparerPauschbetrag: 0, kirchensteuerSatz: 0 },
            balanceState: { lastState: { taxState: { lossCarry: 0 } } }
        },
        {
            profileId: 'other',
            inputs: { tagesgeld: 0, geldmarktEtf: 0, sparerPauschbetrag: 0, kirchensteuerSatz: 0 },
            balanceState: { lastState: { taxState: { lossCarry: 0 } } }
        }
    ];
    const result = attributeHouseholdAction({
        profiles,
        householdAction: {
            type: 'TRANSACTION',
            quellen: [{ kind: 'liquiditaet', source: 'Liquidität', brutto: 17000, netto: 17000, steuer: 0 }],
            verwendungen: { aktien: 17000, liquiditaet: 0 }
        }
    });
    assertEqual(result.finalAction.quellen.length, 1, 'Cash purchase needs exactly one available profile source');
    assertEqual(result.finalAction.quellen[0].sourceProfileId, 'cash-owner', 'Cash source is assigned to its available owner');
    assertEqual(result.finalAction.quellen.some(source => source.kind !== 'liquiditaet'), false, 'Attribution adds no offsetting asset sale');
    assertClose(calculateActionLiquidityDelta(result.finalAction), -17000, 0.001, 'Cash purchase lowers household liquidity by its source amount');
}

// --- TEST 15: Missing sale provenance and KPI divergence fail closed ---
{
    console.log('\n📋 Test 15: provenance and liquidity KPI contracts');
    const profiles = [
        { profileId: 'a', inputs: { tagesgeld: 0 }, balanceState: { lastState: { taxState: { lossCarry: 0 } } } },
        { profileId: 'b', inputs: { tagesgeld: 0 }, balanceState: { lastState: { taxState: { lossCarry: 0 } } } }
    ];
    let provenanceError = null;
    try {
        attributeHouseholdAction({
            profiles,
            householdAction: {
                type: 'TRANSACTION',
                quellen: [{ kind: 'aktien_neu', brutto: 1000, realizedGainSigned: 0, taxableAfterTqfSigned: 0 }],
                verwendungen: { liquiditaet: 1000 }
            }
        });
    } catch (error) {
        provenanceError = error;
    }
    assert(provenanceError?.message.includes('sourceProfileId'), 'Missing sale provenance must fail closed');

    const action = {
        quellen: [{ kind: 'liquiditaet', brutto: 10000 }],
        verwendungen: { liquiditaet: 0, aktien: 10000 }
    };
    const modelResult = {
        ui: {
            zielLiquiditaet: 100000,
            spending: { monatlicheEntnahme: 1000 },
            liquiditaet: { deckungVorher: 999, deckungNachher: 999 },
            runway: { months: 999 }
        },
        diagnosis: { general: { deckungNachher: 999 } }
    };
    const kpis = reconcileHouseholdLiquidityKpis({
        modelResult,
        inputData: { tagesgeld: 60000, geldmarktEtf: 40000 },
        action
    });
    assertClose(kpis.liquidityAfter, 90000, 0.001, 'KPI uses the structured cash outflow');
    assertClose(modelResult.ui.liquiditaet.deckungNachher, 90, 0.001, 'UI coverage derives from the final action');
    assertClose(modelResult.diagnosis.general.deckungNachher, 90, 0.001, 'Diagnosis coverage matches UI coverage');
    assertClose(modelResult.ui.runway.months, 90, 0.001, 'Runway derives from final post-action liquidity');
}

// --- TEST 16: Tax-optimized attribution replans globally with profile tax state ---
{
    console.log('\n📋 Test 16: global tax-optimized source selection');
    const profiles = [
        {
            profileId: 'taxable-owner',
            inputs: { depotwertNeu: 20000, tagesgeld: 0, sparerPauschbetrag: 0, kirchensteuerSatz: 0 },
            tranches: [{
                trancheId: 'taxable-equity', type: 'aktien_neu', category: 'equity',
                marketValue: 20000, costBasis: 10000, tqf: 0
            }],
            balanceState: { lastState: { taxState: { lossCarry: 0 } } }
        },
        {
            profileId: 'shielded-owner',
            inputs: { depotwertNeu: 20000, tagesgeld: 0, sparerPauschbetrag: 0, kirchensteuerSatz: 0 },
            tranches: [{
                trancheId: 'shielded-equity', type: 'aktien_neu', category: 'equity',
                marketValue: 20000, costBasis: 2000, tqf: 0
            }],
            balanceState: { lastState: { taxState: { lossCarry: 20000 } } }
        }
    ];
    const householdAction = {
        type: 'TRANSACTION',
        quellen: [{
            kind: 'aktien_neu', category: 'equity', sourceProfileId: 'taxable-owner',
            trancheId: 'taxable-equity', brutto: 10000, steuer: 1318.75, netto: 8681.25,
            tqf: 0, realizedGainSigned: 5000, taxableAfterTqfSigned: 5000
        }],
        verwendungen: { liquiditaet: 10000 }
    };

    const optimized = attributeHouseholdAction({ householdAction, profiles, mode: 'tax_optimized' });
    assertEqual(optimized.finalAction.quellen.length, 1, 'Tax optimization should need one shielded tranche');
    assertEqual(optimized.finalAction.quellen[0].sourceProfileId, 'shielded-owner', 'Profile loss carry should win global source selection');
    assertClose(optimized.finalAction.steuer, 0, 0.001, 'Shielded sale should not create current tax');
    assertClose(optimized.finalAction.nettoErlös, 10000, 0.01, 'Replanned source should still finance the unchanged household purpose');

    const proportional = attributeHouseholdAction({ householdAction, profiles, mode: 'proportional' });
    const proportionalOwners = new Set(proportional.finalAction.quellen.map(source => source.sourceProfileId));
    assertEqual(proportionalOwners.size, 2, 'Proportional mode should attribute the sale across both equally weighted owners');
    assertClose(proportional.finalAction.nettoErlös, 10000, 0.01, 'Mode may change sources but not the household total');
}

// --- TEST 17: Money-market tranches never become equity-sale candidates ---
{
    console.log('\n📋 Test 17: money-market liquidity is not an equity source');
    const profiles = [
        {
            profileId: 'equity-owner',
            inputs: { depotwertNeu: 20000, tagesgeld: 0, geldmarktEtf: 0, sparerPauschbetrag: 0, kirchensteuerSatz: 0 },
            tranches: [{
                trancheId: 'real-equity', name: 'Real Equity', type: 'aktien_neu', category: 'equity',
                marketValue: 20000, costBasis: 10000, tqf: 0
            }],
            balanceState: { lastState: { taxState: { lossCarry: 0 } } }
        },
        {
            profileId: 'money-market-owner',
            inputs: { depotwertNeu: 0, tagesgeld: 0, geldmarktEtf: 20000, sparerPauschbetrag: 0, kirchensteuerSatz: 0 },
            tranches: [{
                trancheId: 'legacy-money-market', name: 'Overnight Rate ETF',
                type: 'aktien_neu', category: 'money_market',
                marketValue: 20000, costBasis: 20000, tqf: 0
            }],
            balanceState: { lastState: { taxState: { lossCarry: 0 } } }
        }
    ];
    const householdAction = {
        type: 'TRANSACTION',
        quellen: [{
            kind: 'aktien_neu', category: 'equity', sourceProfileId: 'equity-owner',
            trancheId: 'real-equity', brutto: 10000, steuer: 1318.75, netto: 8681.25,
            tqf: 0, realizedGainSigned: 5000, taxableAfterTqfSigned: 5000
        }],
        verwendungen: { liquiditaet: 10000 }
    };

    const result = attributeHouseholdAction({ householdAction, profiles, mode: 'tax_optimized' });
    assertEqual(result.finalAction.quellen.length, 1, 'The unchanged household purpose should need one equity source');
    assertEqual(result.finalAction.quellen[0].trancheId, 'real-equity', 'Explicit money-market category must override a stale equity type');
    assertEqual(result.finalAction.quellen[0].sourceProfileId, 'equity-owner', 'Money-market owner must not receive an equity sale');
    assertClose(calculateActionLiquidityDelta({
        quellen: [{ kind: 'geldmarkt', category: 'money_market', brutto: 10000 }],
        verwendungen: { liquiditaet: 10000 }
    }), 0, 0.001, 'Moving money market to cash must not increase total household liquidity');
}

// --- TEST 10: Proportional allocation is cent-exact and deterministic ---
{
    console.log('\n📋 Test 10: proportional cent rounding');
    const profiles = [
        { profileId: 'a', inputs: { depotwertAlt: 1 } },
        { profileId: 'b', inputs: { depotwertAlt: 1 } },
        { profileId: 'c', inputs: { depotwertAlt: 1 } }
    ];
    const result = calculateWithdrawalDistribution(profiles, { netWithdrawal: 100 }, 'proportional');
    assertEqual(result.items[0].withdrawalAmount, 33.34, 'First stable profile should receive the rounding cent');
    assertEqual(result.items[1].withdrawalAmount, 33.33, 'Second profile should receive its cent-exact share');
    assertEqual(result.items[2].withdrawalAmount, 33.33, 'Third profile should receive its cent-exact share');
    assertClose(result.items.reduce((sum, item) => sum + item.withdrawalAmount, 0), 100, 0.001, 'Rounded shares should preserve total need');
}

// --- TEST 11: Need without financeable assets remains visible ---
{
    console.log('\n📋 Test 11: zero assets fail closed');
    const profiles = [
        { profileId: 'a', inputs: { depotwertAlt: 0, tagesgeld: 0, runwayTargetMonths: 36 } },
        { profileId: 'b', inputs: { depotwertAlt: 0, tagesgeld: 0, runwayTargetMonths: 12 } }
    ];
    ['tax_optimized', 'proportional', 'runway_first'].forEach(mode => {
        const result = calculateWithdrawalDistribution(profiles, { netWithdrawal: 1000 }, mode);
        assertEqual(result.remaining, 1000, `${mode} should retain unfinanceable household need`);
        assertEqual(result.items.reduce((sum, item) => sum + item.withdrawalAmount, 0), 0, `${mode} should not invent allocations`);
    });
}

global.localStorage = prevLocalStorage;
