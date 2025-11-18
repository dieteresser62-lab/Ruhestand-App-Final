#!/usr/bin/env node
/**
 * Dual Care Test Suite
 *
 * Tests three scenarios:
 * 1. Only P1 active (no partner) - should behave exactly as before
 * 2. P1 + P2 active, care disabled - should have additive pension income
 * 3. P1 + P2 active, care enabled - should have additive care costs
 */

import { rng } from './simulator-utils.js';
import {
    makeDefaultCareMeta,
    updateCareMeta,
    calcCareCost,
    computeCareMortalityMultiplier,
    computeHouseholdFlexFactor
} from './simulator-engine.js';

const SEED = 12345;

console.log('🧪 Dual Care Test Suite\n');
console.log('='.repeat(60));

// Test 1: RNG Fork Independence
console.log('\n📊 Test 1: RNG Fork Independence');
console.log('-'.repeat(60));

const mainRng = rng(SEED);
const fork1 = mainRng.fork('CARE_P1');
const fork2 = mainRng.fork('CARE_P2');

const mainSample = [mainRng(), mainRng(), mainRng()];
const fork1Sample = [fork1(), fork1(), fork1()];
const fork2Sample = [fork2(), fork2(), fork2()];

console.log('Main RNG samples:', mainSample.map(x => x.toFixed(4)).join(', '));
console.log('Fork1 samples:   ', fork1Sample.map(x => x.toFixed(4)).join(', '));
console.log('Fork2 samples:   ', fork2Sample.map(x => x.toFixed(4)).join(', '));

const allDifferent = (
    fork1Sample[0] !== fork2Sample[0] &&
    fork1Sample[0] !== mainSample[0] &&
    fork2Sample[0] !== mainSample[0]
);

if (allDifferent) {
    console.log('✅ PASS: Forks produce independent random streams');
} else {
    console.log('❌ FAIL: Forks are not independent');
    process.exit(1);
}

// Test 2: makeDefaultCareMeta
console.log('\n📊 Test 2: makeDefaultCareMeta');
console.log('-'.repeat(60));

const careMeta1 = makeDefaultCareMeta(true);
const careMeta2 = makeDefaultCareMeta(true);
const careMetaNull = makeDefaultCareMeta(false);

console.log('CareMeta1:', careMeta1);
console.log('CareMeta2:', careMeta2);
console.log('CareMetaNULL:', careMetaNull);

if (careMeta1 && careMeta2 && careMetaNull === null) {
    console.log('✅ PASS: makeDefaultCareMeta works correctly');
} else {
    console.log('❌ FAIL: makeDefaultCareMeta produced unexpected results');
    process.exit(1);
}

// Test 3: calcCareCost - both inactive
console.log('\n📊 Test 3: calcCareCost - Both Inactive');
console.log('-'.repeat(60));

const { zusatzFloor: zf1, flexFactor: ff1 } = calcCareCost(careMeta1, careMeta2);
console.log(`zusatzFloor: ${zf1}, flexFactor: ${ff1}`);

if (zf1 === 0 && ff1 === 1.0) {
    console.log('✅ PASS: Inactive care has no cost');
} else {
    console.log('❌ FAIL: Inactive care should have zero cost');
    process.exit(1);
}

// Test 4: calcCareCost - one active
console.log('\n📊 Test 4: calcCareCost - P1 Active');
console.log('-'.repeat(60));

careMeta1.active = true;
careMeta1.zusatzFloorZiel = 5000;
careMeta1.flexFactor = 0.8;

const { zusatzFloor: zf2, flexFactor: ff2 } = calcCareCost(careMeta1, careMeta2);
console.log(`zusatzFloor: ${zf2}, flexFactor: ${ff2}`);

if (zf2 === 5000 && ff2 === 0.8) {
    console.log('✅ PASS: Single active care correctly calculated');
} else {
    console.log('❌ FAIL: Single active care calculation incorrect');
    process.exit(1);
}

// Test 5: calcCareCost - both active
console.log('\n📊 Test 5: calcCareCost - Both Active (Additive)');
console.log('-'.repeat(60));

careMeta2.active = true;
careMeta2.zusatzFloorZiel = 3000;
careMeta2.flexFactor = 0.9;

const { zusatzFloor: zf3, flexFactor: ff3 } = calcCareCost(careMeta1, careMeta2);
console.log(`zusatzFloor: ${zf3} (should be 8000)`);
console.log(`flexFactor: ${ff3} (should be 0.8 = min(0.8, 0.9))`);

if (zf3 === 8000 && ff3 === 0.8) {
    console.log('✅ PASS: Dual active care correctly additive');
} else {
    console.log('❌ FAIL: Dual care calculation incorrect');
    console.log(`  Expected: zusatzFloor=8000, flexFactor=0.8`);
    console.log(`  Got: zusatzFloor=${zf3}, flexFactor=${ff3}`);
    process.exit(1);
}

// Test 6: calcCareCost - P2 only active
console.log('\n📊 Test 6: calcCareCost - P2 Only Active');
console.log('-'.repeat(60));

careMeta1.active = false;

const { zusatzFloor: zf4, flexFactor: ff4 } = calcCareCost(careMeta1, careMeta2);
console.log(`zusatzFloor: ${zf4} (should be 3000)`);
console.log(`flexFactor: ${ff4} (should be 0.9)`);

if (zf4 === 3000 && ff4 === 0.9) {
    console.log('✅ PASS: P2-only care correctly calculated');
} else {
    console.log('❌ FAIL: P2-only care calculation incorrect');
    process.exit(1);
}

// Test 7: calcCareCost - with null P2
console.log('\n📊 Test 7: calcCareCost - Null P2 (No Partner)');
console.log('-'.repeat(60));

careMeta1.active = true;
const { zusatzFloor: zf5, flexFactor: ff5 } = calcCareCost(careMeta1, null);
console.log(`zusatzFloor: ${zf5} (should be 5000)`);
console.log(`flexFactor: ${ff5} (should be 0.8)`);

if (zf5 === 5000 && ff5 === 0.8) {
    console.log('✅ PASS: Null P2 handled correctly');
} else {
    console.log('❌ FAIL: Null P2 calculation incorrect');
    process.exit(1);
}

// Test 8: Pflege-Dauer & Mortalitäts-Ramp
console.log('\n📊 Test 8: Pflege-Dauer & Mortalitäts-Ramp');
console.log('-'.repeat(60));

const rampGradeConfigs = {
    1: { zusatz: 2000, flexCut: 0.6, mortalityFactor: 1 },
    2: { zusatz: 4000, flexCut: 0.55, mortalityFactor: 2 },
    3: { zusatz: 6000, flexCut: 0.5, mortalityFactor: 4 }
};

const rampInputs = {
    pflegefallLogikAktivieren: true,
    pflegeModellTyp: 'akut',
    pflegeRampUp: 4,
    pflegeGradeConfigs: rampGradeConfigs,
    pflegeStufe1Zusatz: rampGradeConfigs[1].zusatz,
    pflegeStufe1FlexCut: rampGradeConfigs[1].flexCut,
    pflegeMaxFloor: 60000,
    pflegeKostenDrift: 0,
    startFloorBedarf: 40000,
    startFlexBedarf: 20000,
    pflegeMinDauer: 4,
    pflegeMaxDauer: 4
};

const rampCare = makeDefaultCareMeta(true);
Object.assign(rampCare, {
    active: true,
    triggered: true,
    grade: 3,
    gradeLabel: 'Pflegegrad 3',
    durationYears: 4,
    floorAtTrigger: rampInputs.startFloorBedarf,
    flexAtTrigger: rampInputs.startFlexBedarf,
    maxFloorAtTrigger: rampInputs.pflegeMaxFloor,
    currentYearInCare: 0,
    zusatzFloorZiel: 0,
    kumulierteKosten: 0,
    mortalityFactor: rampGradeConfigs[3].mortalityFactor
});

let rampOk = true;
const dummyRand = () => 0.99;
for (let year = 1; year <= 4; year++) {
    updateCareMeta(rampCare, rampInputs, 70 + year, { inflation: 2 }, dummyRand);
    if (rampCare.currentYearInCare !== year) rampOk = false;
    if (!rampCare.active) rampOk = false;
    const rampYears = Math.max(1, rampInputs.pflegeRampUp);
    const expectedProgress = Math.min(year, rampYears) / rampYears;
    const targetFactor = rampInputs.pflegeGradeConfigs[3].mortalityFactor;
    const expectedFactor = 1 + (targetFactor - 1) * expectedProgress;
    const actualFactor = computeCareMortalityMultiplier(rampCare, rampInputs);
    if (Math.abs(actualFactor - expectedFactor) > 1e-6) rampOk = false;
}
updateCareMeta(rampCare, rampInputs, 75, { inflation: 2 }, dummyRand);
const durationOk = !rampCare.active && rampCare.currentYearInCare === 4;

if (rampOk && durationOk) {
    console.log('✅ PASS: Pflege-Dauer & Mortalitäts-Ramp stimmen');
} else {
    console.log('❌ FAIL: Pflege-Dauer oder Mortalitäts-Ramp fehlerhaft');
    process.exit(1);
}

// Test 9: Pflegegrade beeinflussen Zusatzkosten
console.log('\n📊 Test 9: Pflegegrade steuern Zusatzbedarf & Flex-Faktor');
console.log('-'.repeat(60));

const gradeInputs = {
    ...rampInputs,
    pflegeModellTyp: 'chronisch',
    pflegeGradeConfigs: {
        1: { zusatz: 1000, flexCut: 0.7, mortalityFactor: 0 },
        3: { zusatz: 8000, flexCut: 0.4, mortalityFactor: 2 }
    }
};

const gradeCare = makeDefaultCareMeta(true);
Object.assign(gradeCare, {
    active: true,
    triggered: true,
    grade: 3,
    gradeLabel: 'Pflegegrad 3',
    floorAtTrigger: gradeInputs.startFloorBedarf,
    flexAtTrigger: gradeInputs.startFlexBedarf,
    maxFloorAtTrigger: gradeInputs.pflegeMaxFloor,
    currentYearInCare: 0,
    zusatzFloorZiel: 0,
    kumulierteKosten: 0
});

updateCareMeta(gradeCare, gradeInputs, 82, { inflation: 2 }, () => 0);
const expectedFlex = gradeInputs.pflegeGradeConfigs[3].flexCut;
const inflationPct = 2;
const expectedZusatz = gradeInputs.pflegeGradeConfigs[3].zusatz * (1 + inflationPct / 100);
const tol = 1e-6;
const gradeOk = Math.abs(gradeCare.flexFactor - expectedFlex) < tol && Math.abs(gradeCare.zusatzFloorZiel - expectedZusatz) < tol;

if (gradeOk) {
    console.log('✅ PASS: Pflegegrad 3 verwendet eigene Konfiguration.');
} else {
    console.log('❌ FAIL: Pflegegrad-Konfiguration wurde nicht angewandt.');
    process.exit(1);
}

// Test 10: Drift-Prozent und Ramp nur bei Cap-Überschreitung
console.log('\n📊 Test 10: Drift als Prozentwert & Ramp bei Cap-Überschreitung');
console.log('-'.repeat(60));

const driftInputs = {
    pflegefallLogikAktivieren: true,
    pflegeModellTyp: 'chronisch',
    pflegeRampUp: 4,
    pflegeGradeConfigs: {
        2: { zusatz: 40000, flexCut: 0.5, mortalityFactor: 1.2 },
        4: { zusatz: 120000, flexCut: 0.2, mortalityFactor: 3.5 }
    },
    pflegeMaxFloor: 70000,
    pflegeKostenDrift: 3.5,
    startFloorBedarf: 20000,
    startFlexBedarf: 10000
};

const driftCare = makeDefaultCareMeta(true);
Object.assign(driftCare, {
    active: true,
    triggered: true,
    grade: 2,
    gradeLabel: 'Pflegegrad 2',
    floorAtTrigger: driftInputs.startFloorBedarf,
    flexAtTrigger: driftInputs.startFlexBedarf,
    maxFloorAtTrigger: driftInputs.pflegeMaxFloor,
    currentYearInCare: 0,
    zusatzFloorZiel: 0,
    kumulierteKosten: 0
});

updateCareMeta(driftCare, driftInputs, 80, { inflation: 2 }, () => 0.5);
const expectedMultiplier = (1 + 2/100) * (1 + 3.5/100);
const expectedFirstYearZusatz = driftInputs.pflegeGradeConfigs[2].zusatz * expectedMultiplier;
const driftOk = Math.abs(driftCare.zusatzFloorZiel - expectedFirstYearZusatz) < tol;

const driftRampCare = makeDefaultCareMeta(true);
Object.assign(driftRampCare, {
    active: true,
    triggered: true,
    grade: 4,
    gradeLabel: 'Pflegegrad 4',
    floorAtTrigger: driftInputs.startFloorBedarf,
    flexAtTrigger: driftInputs.startFlexBedarf,
    maxFloorAtTrigger: driftInputs.pflegeMaxFloor,
    currentYearInCare: 0,
    zusatzFloorZiel: 0,
    kumulierteKosten: 0
});

updateCareMeta(driftRampCare, driftInputs, 80, { inflation: 2 }, () => 0.25);
const capFirstYear = Math.max(0,
    driftInputs.pflegeMaxFloor * expectedMultiplier - driftInputs.startFloorBedarf * (1 + 2/100)
);
const expectedRampTarget = Math.min(capFirstYear,
    driftInputs.pflegeGradeConfigs[4].zusatz * expectedMultiplier / driftInputs.pflegeRampUp
);
const driftRampOk = Math.abs(driftRampCare.zusatzFloorZiel - expectedRampTarget) < tol;

if (driftOk && driftRampOk) {
    console.log('✅ PASS: Drift wird korrekt als Prozent verarbeitet und Ramp greift nur wenn nötig.');
} else {
    console.log('❌ FAIL: Drift- oder Ramp-Logik fehlerhaft.');
    process.exit(1);
}

// Test 11: Einstiegsgrade & keine Progression im Eintrittsjahr
console.log('\n📊 Test 11: Einstieg nur in PG1/PG2 & keine Progression im Eintrittsjahr');
console.log('-'.repeat(60));

const entryInputs = {
    pflegefallLogikAktivieren: true,
    pflegeModellTyp: 'chronisch',
    pflegeRampUp: 5,
    pflegeGradeConfigs: {
        1: { zusatz: 5000, flexCut: 0.8, mortalityFactor: 0 },
        2: { zusatz: 10000, flexCut: 0.6, mortalityFactor: 1 }
    },
    pflegeMaxFloor: 80000,
    pflegeKostenDrift: 0,
    startFloorBedarf: 30000,
    startFlexBedarf: 15000,
    pflegeMinDauer: 5,
    pflegeMaxDauer: 5
};

const entryCare = makeDefaultCareMeta(true);
const scriptedRolls = [0.025, 0];
let rollIndex = 0;
const scriptedRand = () => {
    const value = typeof scriptedRolls[rollIndex] === 'number' ? scriptedRolls[rollIndex] : 1;
    rollIndex += 1;
    return value;
};

updateCareMeta(entryCare, entryInputs, 72, { inflation: 2 }, scriptedRand);

const entryOk = entryCare.grade === 2 && entryCare.currentYearInCare === 1;

if (entryOk) {
    console.log('✅ PASS: Einstieg erfolgt maximal in PG2 und es gibt keine Sofort-Progression.');
} else {
    console.log('❌ FAIL: Einstiegsgrade oder Progressions-Gate fehlerhaft.');
    process.exit(1);
}

// Test 12: Flexanteile personenbasiert gewichten
console.log('\n📊 Test 12: Flexanteile werden pro Person separat gekürzt');
console.log('-'.repeat(60));

const shareMetaP1 = { flexFactor: 0.25, active: true };
const shareMetaP2 = { flexFactor: 0.9, active: false };

const bothAliveFactor = computeHouseholdFlexFactor({
    p1Alive: true,
    careMetaP1: shareMetaP1,
    p2Alive: true,
    careMetaP2: shareMetaP2
});
const singleAliveFactor = computeHouseholdFlexFactor({
    p1Alive: true,
    careMetaP1: shareMetaP1,
    p2Alive: false,
    careMetaP2: shareMetaP2
});

const expectedBothAlive = 0.5 * shareMetaP1.flexFactor + 0.5 * shareMetaP2.flexFactor;
const expectedSingle = shareMetaP1.flexFactor;

console.log(`Beide leben → Faktor: ${bothAliveFactor.toFixed(3)} (erwartet ${expectedBothAlive.toFixed(3)})`);
console.log(`Nur P1 lebt → Faktor: ${singleAliveFactor.toFixed(3)} (erwartet ${expectedSingle.toFixed(3)})`);

if (Math.abs(bothAliveFactor - expectedBothAlive) < 1e-6 && Math.abs(singleAliveFactor - expectedSingle) < 1e-6) {
    console.log('✅ PASS: Flexanteile werden personenbasiert verteilt.');
} else {
    console.log('❌ FAIL: Flexanteile werden nicht korrekt pro Person gewichtet.');
    process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('🎉 All Tests Passed!');
console.log('='.repeat(60));
console.log('\nDual Care Implementation verified:');
console.log('  ✓ RNG fork produces independent streams');
console.log('  ✓ CareMeta initialization works');
console.log('  ✓ Cost calculation handles inactive care');
console.log('  ✓ Cost calculation handles single active care');
console.log('  ✓ Cost calculation handles dual active care (additive)');
console.log('  ✓ Cost calculation handles P2-only active care');
console.log('  ✓ Cost calculation handles null P2 (no partner)');
console.log('  ✓ Flex-Anteile werden pro Person gewichtet gekürzt');
console.log('\n✅ Ready for integration testing\n');
