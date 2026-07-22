console.log('--- Scenario Analyzer Tests ---');

import { ScenarioAnalyzer, analyzeScenario, compareScenarios, extractKeyMetrics } from '../app/simulator/scenario-analyzer.js';

// --- TEST 1: extractKeyMetrics defaults and coercion ---
{
    // Input enthält absichtlich fehlerhafte Typen.
    const metrics = extractKeyMetrics({
        endVermoegen: 'not-a-number',
        failed: 0,
        lebensdauer: undefined,
        careEverActive: 'yes',
        totalCareYears: NaN,
        totalCareAdditionalNeedRealEur: 1000,
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
    assertEqual(metrics.totalCareAdditionalNeedRealEur, 1000, 'extractKeyMetrics should preserve real care need');
    assertEqual(metrics.maxKuerzung, 49, 'extractKeyMetrics should preserve numeric maxKuerzung');
    assertEqual(metrics.p1CareEntryAge, null, 'extractKeyMetrics should set P1 entry age to null when non-finite');
    assertEqual(metrics.isWidow, true, 'extractKeyMetrics should detect widowTriggered');
    assertEqual(metrics.isCrash, false, 'extractKeyMetrics should detect crashTriggered');
}

// --- TEST 2: analyzeScenario tags from flags ---
{
    const result = analyzeScenario({
        careEverActive: true,
        totalCareAdditionalNeedRealEur: 5000,
        failed: true,
        triggeredAge: 68,
        maxKuerzung: 55,
        isWidow: true,
        isCrash: true
    });

    assert(result.tags.includes('care'), 'analyzeScenario should tag care when careEverActive');
    assert(result.tags.includes('care_need'), 'analyzeScenario should tag care_need when modelled need is positive');
    assert(result.tags.includes('failed'), 'analyzeScenario should tag failed when failed');
    assert(result.tags.includes('early_care'), 'analyzeScenario should tag early_care when triggeredAge <= 70');
    assert(result.tags.includes('severe_cut'), 'analyzeScenario should tag severe_cut when maxKuerzung >= 50');
    assert(result.tags.includes('widow'), 'analyzeScenario should tag widow when isWidow is true');
    assert(result.tags.includes('crash'), 'analyzeScenario should tag crash when isCrash is true');
}

// --- TEST 2b: P2-only early care and characteristic selection stay person-specific ---
{
    const result = analyzeScenario({
        careEverActive: true,
        p1CareEntryAge: null,
        p2CareEntryAge: 69
    });
    assert(result.tags.includes('early_care'), 'P2-only early care should receive the early-care tag');

    const analyzer = new ScenarioAnalyzer(3);
    analyzer.addRun({
        index: 0,
        endVermoegen: 100,
        failed: false,
        lebensdauer: 10,
        careEverActive: true,
        totalCareYears: 1,
        totalCareAdditionalNeedRealEur: 1000,
        p1CareEntryAge: 74,
        p2CareEntryAge: null,
        maxKuerzung: 0,
        logDataRows: []
    });
    analyzer.addRun({
        index: 1,
        endVermoegen: 200,
        failed: false,
        lebensdauer: 10,
        careEverActive: true,
        totalCareYears: 1,
        totalCareAdditionalNeedRealEur: 2000,
        p1CareEntryAge: null,
        p2CareEntryAge: 68,
        maxKuerzung: 0,
        logDataRows: []
    });
    analyzer.addRun({
        index: 2,
        endVermoegen: 300,
        failed: false,
        lebensdauer: 10,
        careEverActive: false,
        totalCareYears: 0,
        totalCareAdditionalNeedRealEur: 0,
        p1CareEntryAge: null,
        p2CareEntryAge: null,
        maxKuerzung: 0,
        logDataRows: []
    });
    const scenarios = analyzer.buildScenarioLogs().characteristic;
    assertEqual(scenarios.find(entry => entry.key === 'earliestCareP1')?.p1CareEntryAge, 74, 'Scenario analysis should select earliest P1 care independently');
    assertEqual(scenarios.find(entry => entry.key === 'earliestCareP2')?.p2CareEntryAge, 68, 'Scenario analysis should select earliest P2 care independently');
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
