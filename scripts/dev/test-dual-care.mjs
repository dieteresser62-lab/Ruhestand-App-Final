console.log('\n📊 Test 14: Healthy Partner with NULL Meta (Logic Verification)');
console.log('-'.repeat(60));

// COPY OF THE FIX for verification
// This verifies that the algorithm itself behaves as expected
function resolveIndividualFlexFactor(careMeta) {
    if (!careMeta || !careMeta.active) {
        return 1.0;
    }
    const rawFactor = careMeta.flexFactor;
    if (typeof rawFactor !== 'number' || !Number.isFinite(rawFactor)) {
        return 1.0;
    }
    return Math.min(1, Math.max(0, rawFactor));
}

function computeHouseholdFlexFactor({ p1Alive, careMetaP1, p2Alive, careMetaP2 }) {
    const aliveFactors = [];

    if (p1Alive) {
        aliveFactors.push(resolveIndividualFlexFactor(careMetaP1));
    }

    if (p2Alive) {
        aliveFactors.push(resolveIndividualFlexFactor(careMetaP2));
    }

    if (aliveFactors.length === 0) {
        return 1;
    }

    const equalShare = 1 / aliveFactors.length;
    return aliveFactors.reduce((sum, factor) => sum + equalShare * factor, 0);
}

// Test Case: P1 Sick (0%), P2 Healthy (Null Meta)
const p1ZeroFlex = { flexFactor: 0.0, active: true };
const robustnessFactor = computeHouseholdFlexFactor({
    p1Alive: true,
    careMetaP1: p1ZeroFlex,
    p2Alive: true,
    careMetaP2: null
});

console.log(`P1 (0%) + P2 (Alive, NULL Meta) → Faktor: ${robustnessFactor.toFixed(3)} (erwartet 0.500)`);

if (Math.abs(robustnessFactor - 0.5) < 1e-6) {
    console.log('✅ PASS: Algorithm handles Null Meta correctly.');
} else {
    console.log(`❌ FAIL: Algorithm resulted in ${robustnessFactor * 100}%.`);
    process.exit(1);
}
