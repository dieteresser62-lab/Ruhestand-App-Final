console.log('--- Scenario Analyzer Tests ---');

import { analyzeScenario, compareScenarios, extractKeyMetrics } from '../app/simulator/scenario-analyzer.js';

// --- TEST 1: extractKeyMetrics defaults and coercion ---
{
    // Input enthält absichtlich fehlerhafte Typen.
    const metrics = extractKeyMetrics({
        endVermoegen: 'not-a-number',
        failed: 0,
        lebensdauer: undefined,
        careEverActive: 'yes',
        totalCareYears: NaN,
        totalCareCosts: 1000,
        maxKuerzung: 49,
        triggeredAge: 'x',
        widowTriggered: true,
        crashTriggered: false
    });

    assertEqual(metrics.endVermoegen, 0, 'extractKeyMetrics should default non-finite endVermoegen to 0');
    assertEqual(metrics.failed, false, 'extractKeyMetrics should coerce failed to boolean');
    assertEqual(metrics.lebensdauer, 0, 'extractKeyMetrics should default non-finite lebensdauer to 0');
    assertEqual(metrics.careEverActive, true, 'extractKeyMetrics should coerce careEverActive to boolean');
    assertEqual(metrics.totalCareYears, 0, 'extractKeyMetrics should default non-finite totalCareYears to 0');
    assertEqual(metrics.totalCareCosts, 1000, 'extractKeyMetrics should preserve numeric totalCareCosts');
    assertEqual(metrics.maxKuerzung, 49, 'extractKeyMetrics should preserve numeric maxKuerzung');
    assertEqual(metrics.triggeredAge, null, 'extractKeyMetrics should set triggeredAge to null when non-finite');
    assertEqual(metrics.isWidow, true, 'extractKeyMetrics should detect widowTriggered');
    assertEqual(metrics.isCrash, false, 'extractKeyMetrics should detect crashTriggered');
}

// --- TEST 2: analyzeScenario tags from flags ---
{
    const result = analyzeScenario({
        careEverActive: true,
        totalCareCosts: 5000,
        failed: true,
        triggeredAge: 68,
        maxKuerzung: 55,
        isWidow: true,
        isCrash: true
    });

    assert(result.tags.includes('care'), 'analyzeScenario should tag care when careEverActive');
    assert(result.tags.includes('care_costs'), 'analyzeScenario should tag care_costs when costs > 0');
    assert(result.tags.includes('failed'), 'analyzeScenario should tag failed when failed');
    assert(result.tags.includes('early_care'), 'analyzeScenario should tag early_care when triggeredAge <= 70');
    assert(result.tags.includes('severe_cut'), 'analyzeScenario should tag severe_cut when maxKuerzung >= 50');
    assert(result.tags.includes('widow'), 'analyzeScenario should tag widow when isWidow is true');
    assert(result.tags.includes('crash'), 'analyzeScenario should tag crash when isCrash is true');
}

// --- TEST 3: analyzeScenario tags from logDataRows ---
{
    const result = analyzeScenario({
        logDataRows: [
            { widow: true },
            { action: 'Notfall-Transaktion' },
            { crash: false }
        ]
    });

    assert(result.tags.includes('widow'), 'analyzeScenario should tag widow from logDataRows');
    assert(result.tags.includes('crash'), 'analyzeScenario should tag crash from logDataRows action');
}

// --- TEST 4: compareScenarios ordering ---
{
    const a = { endVermoegen: 1000, failed: false };
    const b = { endVermoegen: 2000, failed: false };
    assertEqual(compareScenarios(a, b), -1, 'compareScenarios should rank higher endVermoegen as better');
    assertEqual(compareScenarios(b, a), 1, 'compareScenarios should rank lower endVermoegen as worse');
}

// --- TEST 5: compareScenarios failed loses even with higher wealth ---
{
    const a = { endVermoegen: 1e9, failed: true };
    const b = { endVermoegen: 1, failed: false };
    assertEqual(compareScenarios(a, b), -1, 'compareScenarios should rank failed scenarios as worse');
}

// --- TEST 6: compareScenarios equality ---
{
    const a = { endVermoegen: 5000, failed: false };
    const b = { endVermoegen: 5000, failed: false };
    assertEqual(compareScenarios(a, b), 0, 'compareScenarios should return 0 for equal scores');
}

console.log('✅ Scenario analyzer tests passed');
console.log('--- Scenario Analyzer Tests Completed ---');
