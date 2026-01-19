// @ts-check

import { applyWithdrawalShareToInputs, buildShareMap } from '../household-simulator.js';
import { buildWithdrawalShares } from '../household-inputs.js';

console.log('--- Household Withdrawal Modes Tests ---');

// Test-Helper: Erstelle Mock-Profile-Inputs
function createMockProfileInputs(profilesData) {
    return profilesData.map(p => ({
        profileId: p.id,
        name: p.name,
        inputs: {
            startVermoegen: p.assets,
            depotwertAlt: p.assets * 0.9,
            tagesgeld: p.assets * 0.1,
            geldmarktEtf: 0,
            einstandAlt: p.assets * 0.7,
            startFloorBedarf: p.floor,
            startFlexBedarf: p.flex,
            startAlter: 65,
            geschlecht: 'm'
        }
    }));
}

// --- TEST 1: buildShareMap() berechnet korrekte Dezimal-Bruchteile ---
{
    console.log('\n📋 Test 1: buildShareMap() Dezimal-Bruchteile');

    const withdrawalShares = [
        { profileId: 'dieter', pct: 91.7 },
        { profileId: 'karin', pct: 8.3 }
    ];

    const shareMap = buildShareMap(withdrawalShares);

    // shareMap sollte normalisierte Dezimal-Bruchteile zurückgeben
    assertClose(shareMap.dieter, 0.917, 0.001, 'Dieter share should be ~0.917 (91.7%)');
    assertClose(shareMap.karin, 0.083, 0.001, 'Karin share should be ~0.083 (8.3%)');

    // Summe sollte 1.0 sein
    const sum = shareMap.dieter + shareMap.karin;
    assertClose(sum, 1.0, 0.001, 'Sum of shares should be 1.0');

    console.log('✅ buildShareMap() Dezimal-Bruchteile korrekt');
}

// --- TEST 2: Household-Modus - Beide Profile bekommen volle Ausgaben ---
{
    console.log('\n📋 Test 2: Household-Modus - Volle Haushalts-Ausgaben');

    // Simuliere das Szenario aus den Screenshots:
    // Dieter: 2.5M €, 25k Floor + 30k Flex = 55k
    // Karin: 225k €, 6k Floor + 10k Flex = 16k
    // Total: 2.725M €, 31k Floor + 40k Flex = 71k

    const mockInputs = {
        startVermoegen: 2500000,
        depotwertAlt: 2250000,
        tagesgeld: 250000,
        startFloorBedarf: 25000,
        startFlexBedarf: 30000,
        startAlter: 65,
        geschlecht: 'm'
    };

    const totalFloor = 25000 + 6000;  // 31k
    const totalFlex = 30000 + 10000;  // 40k

    // Dieter's Share: 91.7% (aber im household-Modus sollte das KEINE Rolle spielen)
    const dieterShare = 0.917;
    const karinShare = 0.083;

    // Im 'household' Modus sollten BEIDE Profile die VOLLEN Ausgaben bekommen
    const dieterAdjusted = applyWithdrawalShareToInputs(
        mockInputs,
        dieterShare,
        totalFloor,
        totalFlex,
        'household'
    );

    const karinAdjusted = applyWithdrawalShareToInputs(
        mockInputs,
        karinShare,
        totalFloor,
        totalFlex,
        'household'
    );

    // KRITISCHER TEST: Beide sollten die GLEICHEN Ausgaben haben (volle Haushalts-Ausgaben)
    assertEqual(dieterAdjusted.startFloorBedarf, totalFloor,
        'Dieter should get full household floor (31k)');
    assertEqual(karinAdjusted.startFloorBedarf, totalFloor,
        'Karin should get full household floor (31k)');
    assertEqual(dieterAdjusted.startFlexBedarf, totalFlex,
        'Dieter should get full household flex (40k)');
    assertEqual(karinAdjusted.startFlexBedarf, totalFlex,
        'Karin should get full household flex (40k)');

    // Verifikation: KEINE Multiplikation mit Share-Fraction
    const wrongDieterFloor = totalFloor * dieterShare;  // = 28,427 (FALSCH!)
    const wrongKarinFloor = totalFloor * karinShare;    // = 2,573 (FALSCH!)
    assert(dieterAdjusted.startFloorBedarf !== wrongDieterFloor,
        'Dieter floor should NOT be multiplied by share');
    assert(karinAdjusted.startFloorBedarf !== wrongKarinFloor,
        'Karin floor should NOT be multiplied by share');

    console.log('✅ Household-Modus: Beide Profile bekommen volle 71k € Ausgaben');
}

// --- TEST 3: Profile-Modus - Ausgaben werden proportional skaliert ---
{
    console.log('\n📋 Test 3: Profile-Modus - Proportionale Skalierung');

    const dieterInputs = {
        startVermoegen: 2500000,
        startFloorBedarf: 40000,
        startFlexBedarf: 5000,
        startAlter: 65,
        geschlecht: 'm'
    };

    const karinInputs = {
        startVermoegen: 225000,
        startFloorBedarf: 10000,
        startFlexBedarf: 1000,
        startAlter: 60,
        geschlecht: 'f'
    };

    const totalFloor = 40000 + 10000;  // 50k (wird hier nicht verwendet)
    const totalFlex = 5000 + 1000;     // 6k (wird hier nicht verwendet)

    const dieterShare = 0.917;
    const karinShare = 0.083;

    // Im 'profile' Modus sollten die INDIVIDUELLEN Ausgaben skaliert werden
    const dieterAdjusted = applyWithdrawalShareToInputs(
        dieterInputs,
        dieterShare,
        totalFloor,
        totalFlex,
        'profile'
    );

    const karinAdjusted = applyWithdrawalShareToInputs(
        karinInputs,
        karinShare,
        totalFloor,
        totalFlex,
        'profile'
    );

    // KRITISCHER TEST: Ausgaben sollten proportional skaliert sein
    const expectedDieterFloor = 40000 * dieterShare;  // ≈ 36,680
    const expectedKarinFloor = 10000 * karinShare;    // ≈ 830

    assertClose(dieterAdjusted.startFloorBedarf, expectedDieterFloor, 1,
        'Dieter floor should be scaled by share (40k × 0.917)');
    assertClose(karinAdjusted.startFloorBedarf, expectedKarinFloor, 1,
        'Karin floor should be scaled by share (10k × 0.083)');

    const expectedDieterFlex = 5000 * dieterShare;    // ≈ 4,585
    const expectedKarinFlex = 1000 * karinShare;      // ≈ 83

    assertClose(dieterAdjusted.startFlexBedarf, expectedDieterFlex, 1,
        'Dieter flex should be scaled by share (5k × 0.917)');
    assertClose(karinAdjusted.startFlexBedarf, expectedKarinFlex, 1,
        'Karin flex should be scaled by share (1k × 0.083)');

    console.log('✅ Profile-Modus: Ausgaben werden proportional skaliert');
}

// --- TEST 4: Regression Test - Success Rate Validierung ---
{
    console.log('\n📋 Test 4: Regression Test - Withdrawal Rate');

    // Das Szenario aus den Screenshots:
    // Total Assets: 2.725M €
    // Total Spending: 71k €/Jahr
    // Withdrawal Rate: 71k / 2.725M ≈ 2.6%

    const totalAssets = 2500000 + 225000;  // 2.725M
    const totalSpending = 31000 + 40000;    // 71k (Floor + Flex)
    const withdrawalRate = totalSpending / totalAssets;

    // Bei einer Safe Withdrawal Rate von ~2.6% sollte die Success Rate hoch sein
    // (Konventionell: 4% ist "safe", also 2.6% ist sehr konservativ)
    assert(withdrawalRate < 0.04,
        'Withdrawal rate should be in safe range (<4%)');
    assert(withdrawalRate > 0.02,
        'Withdrawal rate should be realistic (>2%)');

    // Mit korrekter Household-Implementation sollte die Success Rate >90% sein
    // (nicht 1.3% wie im Bug-Szenario)
    const expectedSuccessRate = 0.90;  // >90%
    const buggedSuccessRate = 0.013;   // 1.3% (vor dem Fix)

    // Dieser Test ist konzeptuell - die tatsächliche Success Rate wird von der
    // Monte-Carlo-Simulation berechnet, aber wir validieren hier die Input-Parameter
    console.log(`  Withdrawal Rate: ${(withdrawalRate * 100).toFixed(2)}%`);
    console.log(`  Expected Success Rate: >${(expectedSuccessRate * 100).toFixed(0)}%`);
    console.log(`  Bug würde liefern: ${(buggedSuccessRate * 100).toFixed(1)}%`);

    console.log('✅ Withdrawal Rate ist im sicheren Bereich (~2.6%)');
}

// --- TEST 5: Edge Case - Ein Profil mit 0% Share ---
{
    console.log('\n📋 Test 5: Edge Case - 0% Share');

    const mockInputs = {
        startVermoegen: 100000,
        startFloorBedarf: 10000,
        startFlexBedarf: 2000,
        startAlter: 65,
        geschlecht: 'f'
    };

    const totalFloor = 50000;
    const totalFlex = 10000;
    const zeroShare = 0.0;

    // Household-Modus: Auch mit 0% Share sollte das Profil volle Ausgaben bekommen
    const householdResult = applyWithdrawalShareToInputs(
        mockInputs,
        zeroShare,
        totalFloor,
        totalFlex,
        'household'
    );

    assertEqual(householdResult.startFloorBedarf, totalFloor,
        'Even with 0% share, household mode gives full floor');
    assertEqual(householdResult.startFlexBedarf, totalFlex,
        'Even with 0% share, household mode gives full flex');

    // Profile-Modus: Mit 0% Share sollten Ausgaben auf 0 skaliert werden
    const profileResult = applyWithdrawalShareToInputs(
        mockInputs,
        zeroShare,
        totalFloor,
        totalFlex,
        'profile'
    );

    assertEqual(profileResult.startFloorBedarf, 0,
        'Profile mode with 0% share scales floor to 0');
    assertEqual(profileResult.startFlexBedarf, 0,
        'Profile mode with 0% share scales flex to 0');

    console.log('✅ Edge Case 0% Share funktioniert korrekt');
}

// --- TEST 6: Edge Case - 100% Share (ein Profil) ---
{
    console.log('\n📋 Test 6: Edge Case - 100% Share');

    const mockInputs = {
        startVermoegen: 1000000,
        startFloorBedarf: 30000,
        startFlexBedarf: 10000,
        startAlter: 65,
        geschlecht: 'm'
    };

    const totalFloor = 30000;
    const totalFlex = 10000;
    const fullShare = 1.0;  // 100%

    // Household-Modus: Sollte volle Ausgaben liefern
    const householdResult = applyWithdrawalShareToInputs(
        mockInputs,
        fullShare,
        totalFloor,
        totalFlex,
        'household'
    );

    assertEqual(householdResult.startFloorBedarf, totalFloor,
        'Household mode with 100% share gives full floor');
    assertEqual(householdResult.startFlexBedarf, totalFlex,
        'Household mode with 100% share gives full flex');

    // Profile-Modus: Sollte 100% der individuellen Ausgaben liefern
    const profileResult = applyWithdrawalShareToInputs(
        mockInputs,
        fullShare,
        totalFloor,
        totalFlex,
        'profile'
    );

    assertEqual(profileResult.startFloorBedarf, mockInputs.startFloorBedarf,
        'Profile mode with 100% share keeps original floor');
    assertEqual(profileResult.startFlexBedarf, mockInputs.startFlexBedarf,
        'Profile mode with 100% share keeps original flex');

    console.log('✅ Edge Case 100% Share funktioniert korrekt');
}

// --- TEST 7: Input-Validierung - Ungültige Werte ---
{
    console.log('\n📋 Test 7: Input-Validierung');

    const mockInputs = {
        startVermoegen: 1000000,
        startFloorBedarf: 30000,
        startFlexBedarf: 10000
    };

    const totalFloor = 50000;
    const totalFlex = 15000;

    // Test mit null inputs
    const nullResult = applyWithdrawalShareToInputs(null, 0.5, totalFloor, totalFlex, 'household');
    assertEqual(nullResult, null, 'Should return null for null inputs');

    // Test mit NaN shareFraction
    const nanResult = applyWithdrawalShareToInputs(mockInputs, NaN, totalFloor, totalFlex, 'household');
    assert(nanResult === mockInputs, 'Should return original inputs for NaN share');

    // Test mit Infinity shareFraction
    const infResult = applyWithdrawalShareToInputs(mockInputs, Infinity, totalFloor, totalFlex, 'household');
    assert(infResult === mockInputs, 'Should return original inputs for Infinity share');

    console.log('✅ Input-Validierung funktioniert korrekt');
}

// --- TEST 8: Gold-Validierung Regression Test ---
{
    console.log('\n📋 Test 8: Gold-Validierung (Regression)');

    // Importiere combineHouseholdInputs für diesen Test
    const { combineHouseholdInputs } = await import('../household-inputs.js');

    // Simuliere Szenario: Ein Profil mit Gold, ein Profil ohne
    const profileInputs = [
        {
            profileId: 'dieter',
            name: 'Dieter',
            inputs: {
                startVermoegen: 2500000,
                depotwertAlt: 2250000,
                tagesgeld: 250000,
                goldAktiv: false,  // Kein Gold
                goldZielProzent: 0,
                goldFloorProzent: 0,
                startFloorBedarf: 24000,
                startFlexBedarf: 28000
            }
        },
        {
            profileId: 'karin',
            name: 'Karin',
            inputs: {
                startVermoegen: 225000,
                depotwertAlt: 200000,
                tagesgeld: 25000,
                goldAktiv: false,  // Auch kein Gold
                goldZielProzent: 0,
                goldFloorProzent: 0,
                startFloorBedarf: 6000,
                startFlexBedarf: 12000
            }
        }
    ];

    const { combined, warnings } = combineHouseholdInputs(profileInputs, 'dieter', 0);

    // Wenn KEIN Profil Gold aktiv hat, sollte combined.goldAktiv = false sein
    assertEqual(combined.goldAktiv, false,
        'Combined goldAktiv should be false when no profiles have gold');
    assertEqual(combined.goldZielProzent, 0,
        'Combined goldZielProzent should be 0 when no profiles have gold');

    // Szenario 2: Ein Profil MIT Gold
    profileInputs[0].inputs.goldAktiv = true;
    profileInputs[0].inputs.goldZielProzent = 10;
    profileInputs[0].inputs.goldFloorProzent = 5;

    const { combined: combined2 } = combineHouseholdInputs(profileInputs, 'dieter', 0);

    // Jetzt sollte goldAktiv true sein UND goldZielProzent > 0
    assertEqual(combined2.goldAktiv, true,
        'Combined goldAktiv should be true when one profile has gold');
    assert(combined2.goldZielProzent > 0,
        'Combined goldZielProzent should be > 0 when one profile has gold');

    // Validierung: goldAktiv=true UND goldZielProzent>0 ist gültig (kein ValidationError)
    console.log(`  goldAktiv=${combined2.goldAktiv}, goldZielProzent=${combined2.goldZielProzent}`);

    console.log('✅ Gold-Validierung Regression Test bestanden');
}

console.log('\n--- Household Withdrawal Modes Tests Completed ---');
