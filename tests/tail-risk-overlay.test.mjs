import {
    TAIL_RISK_EVENT_TYPE_CRASH_INFLATION,
    applyTailRiskOverlay,
    createTailRiskSchedule,
    summarizeTailRiskEvents
} from '../app/simulator/tail-risk-overlay.js';

console.log('--- Tail Risk Overlay Tests ---');

const enabledConfig = {
    tailRiskEnabled: true,
    tailRiskAnnualProbabilityPct: 5,
    tailRiskReturnShockPct: -35,
    tailRiskInflationShockPct: 6,
    tailRiskDurationYears: 2,
    tailRiskCooldownYears: 3
};

{
    const disabled = createTailRiskSchedule(42, { ...enabledConfig, tailRiskEnabled: false }, 20);
    assertEqual(disabled.schedule.length, 20, 'Disabled schedule should preserve horizon length');
    assertEqual(disabled.events.length, 0, 'Disabled tail risk should not create events');
    assertEqual(disabled.schedule.every(entry => entry === null), true, 'Disabled schedule should be empty');

    const zeroProbability = createTailRiskSchedule(42, { ...enabledConfig, tailRiskAnnualProbabilityPct: 0 }, 20);
    assertEqual(zeroProbability.events.length, 0, 'Zero probability should not create events');
}

{
    const first = createTailRiskSchedule(42, enabledConfig, 30);
    const second = createTailRiskSchedule(42, enabledConfig, 30);
    assertEqual(JSON.stringify(first.events), JSON.stringify(second.events), 'Same seed/config/horizon should produce identical events');
    assertEqual(JSON.stringify(first.schedule), JSON.stringify(second.schedule), 'Same seed/config/horizon should produce identical schedules');

    const differentSeed = createTailRiskSchedule(777, enabledConfig, 30);
    assert(
        JSON.stringify(first.schedule) !== JSON.stringify(differentSeed.schedule),
        'Different seeds can produce different schedules'
    );
}

{
    const scheduleResult = createTailRiskSchedule(0, enabledConfig, 15);
    const activeIndices = scheduleResult.schedule
        .map((entry, index) => entry ? index : null)
        .filter(index => index !== null);
    assertEqual(JSON.stringify(activeIndices), JSON.stringify([0, 1, 5, 6, 10, 11]), 'Duration and cooldown should be enforced without overlap');
    assertEqual(scheduleResult.events.length, 3, 'Seed 0 all-low draws should create every allowed non-overlapping event');
    assertEqual(scheduleResult.schedule[0].tailRiskEventType, TAIL_RISK_EVENT_TYPE_CRASH_INFLATION, 'Event type should be contractual');
    assertEqual(scheduleResult.schedule[1].eventYearOffset, 1, 'Second active year should expose event offset');
    assertEqual(scheduleResult.schedule[2], null, 'Cooldown years should remain inactive');
}

{
    const invalid = createTailRiskSchedule(42, { ...enabledConfig, tailRiskDurationYears: 3 }, 2);
    assertEqual(invalid.valid, false, 'Duration beyond horizon should be invalid');
    assertEqual(invalid.events.length, 0, 'Invalid schedule should not create events');
    assert(invalid.errors.some(error => error.fieldId === 'tailRiskDurationYears'), 'Invalid schedule should expose duration error');
}

{
    const yearData = Object.freeze({ jahr: 2001, rendite: -0.1, inflation: 3, regime: 'SIDEWAYS' });
    const event = createTailRiskSchedule(0, enabledConfig, 5).schedule[0];
    const result = applyTailRiskOverlay(yearData, event);
    assertEqual(result.tailRiskActive, true, 'Scheduled event should mark tail risk active');
    assertEqual(result.tailRiskApplied, true, 'Eligible non-crisis year should receive overlay');
    assertClose(result.yearData.rendite, -0.45, 1e-12, 'Effective return should be written as decimal rendite');
    assertClose(result.yearData.inflation, 9, 1e-12, 'Effective inflation should be written as percent inflation');
    assertEqual(yearData.rendite, -0.1, 'Overlay must not mutate source rendite');
    assertEqual(yearData.inflation, 3, 'Overlay must not mutate source inflation');
}

{
    const event = createTailRiskSchedule(0, enabledConfig, 5).schedule[0];
    const result = applyTailRiskOverlay({ jahr: 2008, rendite: -0.3, inflation: 2, regime: 'BEAR' }, event);
    assertEqual(result.tailRiskActive, true, 'Historical crisis year still records active tail event');
    assertEqual(result.tailRiskApplied, false, 'Historical crisis year should skip additional shock');
    assertEqual(result.tailRiskSkippedReason, 'historical_crisis', 'Historical crisis skip reason should be explicit');
    assertClose(result.yearData.rendite, -0.3, 1e-12, 'Skipped crisis year should keep original return');
}

{
    const event = createTailRiskSchedule(0, {
        ...enabledConfig,
        tailRiskReturnShockPct: -60,
        tailRiskInflationShockPct: 15,
        tailRiskDurationYears: 1,
        tailRiskCooldownYears: 0
    }, 1).schedule[0];
    const result = applyTailRiskOverlay({ rendite: -0.1, inflation: 7 }, event);
    assertClose(result.effectiveReturnPct, -65, 1e-12, 'Effective return should be floored at -65%');
    assertClose(result.effectiveInflationPct, 15, 1e-12, 'Effective inflation should be capped at 15%');
}

{
    const event = createTailRiskSchedule(0, enabledConfig, 5).schedule[0];
    const inactive = applyTailRiskOverlay({ rendite: 0.02, inflation: 2 }, null);
    const applied = applyTailRiskOverlay({ rendite: 0.02, inflation: 2 }, event);
    const skipped = applyTailRiskOverlay({ rendite: -0.3, inflation: 2 }, event);
    const summary = summarizeTailRiskEvents([inactive, applied, skipped]);
    assertEqual(summary.tailRiskEventCount, 1, 'Summary should count unique event ids');
    assertEqual(summary.tailRiskActiveYears, 2, 'Summary should count active years only');
    assertEqual(summary.tailRiskAppliedYears, 1, 'Summary should count applied years');
    assertEqual(summary.tailRiskSkippedHistoricalCrisisYears, 1, 'Summary should count historical crisis skips');
}

console.log('--- Tail Risk Overlay Tests Completed ---');
