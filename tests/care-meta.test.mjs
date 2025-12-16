
import { updateCareMeta, computeHouseholdFlexFactor, makeDefaultCareMeta } from '../simulator-engine.js';
// Note: sampleCareGrade is not exported directly, but updateCareMeta uses it. 
// We will test sampling implicitly via updateCareMeta or export it if needed.
// Actually, sampleCareGrade IS NOT exported. I have to rely on updateCareMeta.

const consoleLog = console.log;

console.log('--- Care Logic Meta Tests ---');

// --- Helper: Mock RNG ---
function createMockRng(sequence) {
    let index = 0;
    return () => {
        if (index >= sequence.length) return 0.5;
        return sequence[index++];
    };
}

// --- Helper: Basic Inputs for Care Logic ---
function getCareInputs() {
    return {
        pflegefallLogikAktivieren: true,
        pflegeModellTyp: 'chronisch', // standard
        pflegeRampUp: 5,
        pflegeKostenDrift: 0, // easier to test base inflation first
        pflegeRegionalZuschlag: 0,
        pflegeGradeConfigs: {
            1: { zusatz: 1000, flexCut: 1.0, mortalityFactor: 1.0 },
            2: { zusatz: 2000, flexCut: 0.8, mortalityFactor: 1.5 },
            3: { zusatz: 3000, flexCut: 0.5, mortalityFactor: 2.0 },
            4: { zusatz: 4000, flexCut: 0.2, mortalityFactor: 3.0 },
            5: { zusatz: 5000, flexCut: 0.0, mortalityFactor: 4.0 }
        }
    };
}

// --- TEST 1: Initial Trigger (Sampling) ---
{
    // updateCareMeta calls sampleCareGrade if !active && !triggered.
    // We need an age that has non-zero probability (e.g. 80).
    const inputs = getCareInputs();
    const careMeta = makeDefaultCareMeta(true, 'm');
    const age = 80;

    // Mock RNG: 0.001 -> Should trigger entry (prob for PG1 at 80 is ~0.055).
    const rand = createMockRng([0.001]);

    const yearData = { inflation: 0 };

    const result = updateCareMeta(careMeta, inputs, age, yearData, rand);

    assert(result.active === true, 'Should trigger care active');
    assert(result.grade > 0, 'Should have a care grade');
    console.log(`✅ Initial Sampling Triggered (Grade: ${result.grade})`);
}

// --- TEST 2: Cost Inflation & Ramp-Up ---
{
    // Check if zusatzFloor scales with RampUp (5 years)
    const inputs = getCareInputs();
    const careMeta = makeDefaultCareMeta(true, 'm');
    careMeta.active = true;
    careMeta.grade = 2; // Config: 2000 zusatz.
    careMeta.triggered = true;
    careMeta.currentYearInCare = 0;

    // Valid Anchors needed for Cap Calculation
    // Set capZusatz = 1000. (Max 2000 - Floor 1000).
    // zielRoh = 2000.
    // 2000 > 1000 -> needsRamp = true.
    careMeta.floorAtTrigger = 1000;
    careMeta.maxFloorAtTrigger = 2000;

    // Year 1 (Index 1): Ramp 1/5 = 20%. Target = 2000 * 0.2 = 400. 
    // 400 < 1000 (Cap). Result 400.
    const rand = () => 0.99;
    const yearData = { inflation: 0 };

    // Call for Year 1
    const res1 = updateCareMeta(careMeta, inputs, 80, yearData, rand);

    assertClose(res1.zusatzFloorZiel, 400, 1, 'Year 1 Cost should be 20% (RampUp)');

    // Year 5 (Index 5): Ramp 5/5 = 100%. Target = 2000 * 1.0 = 2000.
    // 2000 > 1000 (Cap). Result 1000.
    careMeta.currentYearInCare = 4; // entering year 5
    const res5 = updateCareMeta(careMeta, inputs, 84, yearData, rand);

    assertClose(res5.zusatzFloorZiel, 1000, 1, 'Year 5 Cost should be Capped at 1000');

    console.log('✅ Cost Ramp-Up Verification Passed');
}

// --- TEST 3: Household Flex Logic (Dual Care) ---
{
    // Test the "75% Rule" implementation

    const p1Meta = { active: false, flexFactor: 1.0 }; // Healthy
    const p2Meta = { active: false, flexFactor: 1.0 }; // Healthy

    // 1. Both Healthy -> 100%
    const fBothHealthy = computeHouseholdFlexFactor({
        p1Alive: true, careMetaP1: p1Meta,
        p2Alive: true, careMetaP2: p2Meta
    });
    assertClose(fBothHealthy, 1.0, 0.01, 'Both Healthy -> 1.0');

    // 2. P1 Care (FlexCut 0%), P2 Healthy -> 75%
    // Formula: (0.5 * 1.0) + (0.25 * 0) + (0.25 * 1.0) = 0.75
    const p1Care = { active: true, flexFactor: 0.0 };
    const fP1Care = computeHouseholdFlexFactor({
        p1Alive: true, careMetaP1: p1Care,
        p2Alive: true, careMetaP2: p2Meta
    });
    assertClose(fP1Care, 0.75, 0.01, 'One Care (0%) -> 0.75');

    // 3. P1 Dead, P2 Healthy -> 75%
    const fP1Dead = computeHouseholdFlexFactor({
        p1Alive: false, careMetaP1: p1Care, // P1 dead
        p2Alive: true, careMetaP2: p2Meta
    });
    assertClose(fP1Dead, 0.75, 0.01, 'One Dead, One Healthy -> 0.75');

    // 4. Both Care (0%) -> 0%
    const p2Care = { active: true, flexFactor: 0.0 };
    const fBothCare = computeHouseholdFlexFactor({
        p1Alive: true, careMetaP1: p1Care,
        p2Alive: true, careMetaP2: p2Care
    });
    assertClose(fBothCare, 0.0, 0.01, 'Both Care (0%) -> 0.0');

    console.log('✅ Household Flex Logic (Dual) Passed');
}

console.log('--- Care Logic Tests Completed ---');
