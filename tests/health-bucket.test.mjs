import {
    applyHealthBucketCoverage,
    applyHealthBucketInterest,
    buildHealthBucketDiagnostics,
    computeHealthBucketEligibleNeed,
    evaluateHealthBucketTrigger,
    resolveHealthBucketCareState
} from '../app/simulator/simulator-health-bucket.js';

console.log('--- Health Bucket Tests ---');

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: Actual ${actual} != Expected ${expected}`);
    }
}

{
    const careState = resolveHealthBucketCareState({
        householdContext: {
            p1Alive: true,
            p2Alive: true,
            care: {
                p1: { active: true, grade: 4, zusatzFloorZiel: 12000 },
                p2: { active: false, grade: 0 }
            }
        }
    });
    assert(careState.p1.active === true, 'P1 care should be read from householdContext.care');
    assert(careState.p1.grade === 4, 'P1 grade should be read');
    assert(careState.p2.active === false, 'P2 inactive care should be preserved');
    console.log('✅ Health bucket care state resolution passed');
}

{
    const inputs = {
        healthBucket: {
            enabled: true,
            triggerMinGrade: 4,
            triggerMode: 'OR'
        }
    };
    const trigger = evaluateHealthBucketTrigger({
        inputs,
        householdContext: {
            care: {
                p1: { active: true, grade: 3, zusatzFloorZiel: 10000 },
                p2: { active: true, grade: 4, zusatzFloorZiel: 18000 }
            }
        }
    });
    assert(trigger.triggered === true, 'OR trigger should fire if one person reaches min grade');
    assert(trigger.qualifyingPersons.length === 1, 'OR trigger should expose qualifying person');

    const andTrigger = evaluateHealthBucketTrigger({
        inputs: { healthBucket: { ...inputs.healthBucket, triggerMode: 'AND' } },
        householdContext: {
            care: {
                p1: { active: true, grade: 4, zusatzFloorZiel: 10000 },
                p2: { active: true, grade: 3, zusatzFloorZiel: 18000 }
            }
        }
    });
    assert(andTrigger.triggered === false, 'AND trigger should require both active persons at min grade');
    console.log('✅ Health bucket trigger modes passed');
}

{
    const trigger = {
        triggered: true,
        qualifyingPersons: [
            { additionalFloor: 12000 },
            { additionalFloor: 8000 }
        ]
    };
    assertClose(
        computeHealthBucketEligibleNeed({
            forcedShortfall: 30000,
            coverageMode: 'care_additional_floor_only',
            trigger
        }),
        20000,
        1e-9,
        'Care-only coverage should cap at qualifying care need'
    );
    assertClose(
        computeHealthBucketEligibleNeed({
            forcedShortfall: 30000,
            coverageMode: 'floor_when_care_active',
            trigger
        }),
        30000,
        1e-9,
        'Floor coverage should cover full shortfall while care trigger is active'
    );
    console.log('✅ Health bucket eligible need modes passed');
}

{
    const portfolio = {
        healthBucketConfig: {
            enabled: true,
            triggerMinGrade: 4,
            triggerMode: 'OR',
            coverageMode: 'care_additional_floor_only'
        },
        healthBucketGeldmarkt: 50000,
        healthBucketTranches: [
            { trancheId: 'hb-1', marketValue: 30000, costBasis: 28000, type: 'geldmarkt', category: 'money_market' },
            { trancheId: 'hb-2', marketValue: 20000, costBasis: 20000, type: 'geldmarkt', category: 'money_market' }
        ],
        healthBucketCashAmount: 0
    };
    const result = applyHealthBucketCoverage({
        portfolio,
        forcedShortfall: 25000,
        householdContext: {
            care: {
                p1: { active: true, grade: 4, zusatzFloorZiel: 18000 }
            }
        }
    });
    assertClose(result.used, 18000, 1e-9, 'Coverage should use care-only eligible amount');
    assertClose(portfolio.healthBucketGeldmarkt, 32000, 1e-9, 'Coverage should reduce bucket amount');
    assertClose(portfolio.healthBucketTranches[0].marketValue, 12000, 1e-9, 'Coverage should reduce bucket tranche FIFO');
    assertClose(result.realizedGainRaw, 1200, 1e-9, 'Coverage should track raw gain from money-market tranche');
    console.log('✅ Health bucket coverage passed');
}

{
    const portfolio = {
        healthBucketConfig: {
            enabled: true,
            initialAmount: 100000,
            returnMode: 'cash_return',
            targetMode: 'inflation_indexed_diagnostic'
        },
        healthBucketGeldmarkt: 100000,
        healthBucketTranches: [
            { trancheId: 'hb-1', marketValue: 60000, costBasis: 60000, type: 'geldmarkt', category: 'money_market' }
        ],
        healthBucketCashAmount: 40000
    };
    const interest = applyHealthBucketInterest({ portfolio, rC: 0.03 });
    assertClose(interest.interest, 3000, 1e-9, 'Interest should follow rC');
    assertClose(portfolio.healthBucketGeldmarkt, 103000, 1e-9, 'Interest should increase bucket amount');
    assertClose(portfolio.healthBucketTranches[0].marketValue, 61800, 1e-9, 'Interest should be distributed to tranche source');
    assertClose(portfolio.healthBucketCashAmount, 41200, 1e-9, 'Interest should be distributed to cash source');

    const diagnostics = buildHealthBucketDiagnostics({
        portfolio,
        cumulativeInflationFactor: 1.1
    });
    assertClose(diagnostics.inflationAdjustedTarget, 110000, 1e-9, 'Diagnostics should index target by inflation');
    assertClose(diagnostics.realCoveragePct, 93.6363636364, 1e-6, 'Diagnostics should compute real coverage percent');
    assertClose(diagnostics.targetGap, 7000, 1e-9, 'Diagnostics should compute target gap');
    console.log('✅ Health bucket interest and diagnostics passed');
}

console.log('--- Health Bucket Tests Completed ---');

