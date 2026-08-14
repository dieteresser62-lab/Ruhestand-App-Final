import fs from 'node:fs';
import os from 'node:os';
import { performance } from 'node:perf_hooks';

import { EngineAPI } from '../engine/index.mjs';
import { prepareHistoricalDataOnce, getDataVersion } from '../app/simulator/simulator-engine-helpers.js';
import { runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';
import {
    createStressReplayCaptureRequest,
    materializeStressReplayPathV1
} from '../app/simulator/stress-replay-path-materializer.js';
import {
    createStressReplayFingerprint,
    createStressReplayWorkspaceV1
} from '../app/simulator/stress-replay-contract.js';
import { runStressReplayComparisonV1 } from '../app/simulator/stress-replay-comparison.js';
import { runStressReplayPathV1 } from '../app/simulator/stress-replay-runner.js';
import {
    createStressReplayBaselineVariantV1,
    createStressReplayVariantV1
} from '../app/simulator/stress-replay-variant.js';
import {
    buildStressReplayComparisonExportV1,
    parseStressReplayComparisonExportV1,
    serializeStressReplayComparisonExportV1
} from '../app/simulator/stress-replay-export.js';

console.log('--- Stress Replay End-to-End Tests ---');

const baselineFixture = JSON.parse(fs.readFileSync(
    new URL('./fixtures/stress-replay-performance-baseline-v1.json', import.meta.url),
    'utf8'
));

function median(values) {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.floor(sorted.length / 2)];
}

prepareHistoricalDataOnce();

const inputs = {
    startAlter: 18,
    geschlecht: 'm',
    startVermoegen: 3000000,
    depotwertAlt: 2800000,
    einstandAlt: 2200000,
    tagesgeld: 200000,
    geldmarktEtf: 0,
    zielLiquiditaet: 180000,
    startFloorBedarf: 24000,
    startFlexBedarf: 12000,
    minimumFlexAnnual: 0,
    flexBudgetAnnual: 0,
    flexBudgetRecharge: 0,
    rebalancingBand: 25,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    liquidityRunwayYears: 3,
    runwayTargetMonths: 36,
    runwayMinMonths: 24,
    targetEq: 60,
    goldAktiv: false,
    goldZielProzent: 0,
    goldFloorProzent: 0,
    goldSteuerfrei: true,
    startSPB: 1000,
    kirchensteuerSatz: 0,
    rentAdjMode: 'fix',
    rentAdjPct: 0,
    renteMonatlich: 0,
    renteStartOffsetJahre: 0,
    dynamicFlex: false,
    horizonMethod: 'mean',
    horizonYears: 60,
    survivalQuantile: 0.85,
    goGoActive: false,
    goGoMultiplier: 1,
    capeRatio: 0,
    marketCapeRatio: 0,
    stressPreset: 'NONE',
    pflegefallLogikAktivieren: false,
    partner: { aktiv: false },
    accumulationPhase: { enabled: false },
    transitionYear: 0,
    decumulation: { mode: 'standard' },
    longevityMode: 'none',
    longevityQuantileShift: 0,
    longevityRelativePct: 0,
    longevityBufferYears: 0
};
const widowOptions = { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 };
const monteCarloParams = {
    anzahl: 1,
    maxDauer: 60,
    blockSize: 5,
    seed: 20260815,
    methode: 'block',
    rngMode: 'per-run-seed'
};
const sourceRequest = {
    schemaVersion: 'StressReplayE2ESourceRequestV1',
    inputs,
    widowOptions,
    monteCarloParams,
    useCapeSampling: false
};

const source = await runMonteCarloChunk({
    inputs,
    widowOptions,
    monteCarloParams,
    useCapeSampling: false,
    runRange: { start: 0, count: 1 },
    logIndices: [0],
    stressReplayCapture: createStressReplayCaptureRequest([0]),
    engine: EngineAPI
});
const sourceMeta = source.runMeta.find(entry => entry.index === 0);
assert(sourceMeta?.stressReplayCapture, 'The selected MC run must publish its opt-in replay capture');
assertEqual(sourceMeta.logDataRows.length, 60, 'The reference path must contain 60 source years');

const path = materializeStressReplayPathV1({
    capture: sourceMeta.stressReplayCapture,
    sourceLogRows: sourceMeta.logDataRows,
    sourceRequest,
    dataFingerprint: createStressReplayFingerprint({ dataVersion: getDataVersion() }),
    engineFingerprint: createStressReplayFingerprint({ engineVersion: EngineAPI.version || 'EngineAPI' }),
    scenarioKey: 'e2e-fixed-60-year-path',
    selectionMetric: 'nominal_terminal_wealth_eur'
});
assertEqual(path.effectiveLength, 60, 'Materialization must preserve the complete 60-year exogenous path');
assertEqual(path.reconciliation.sourcePrefixMatched, true, 'Materialization must reconcile against the selected MC log');

const alternative = createStressReplayVariantV1({
    id: 'shorter-runway',
    label: 'Kuerzerer Liquiditaets-Runway',
    baselineInputs: inputs,
    patch: { strategy: { liquidityRunwayYears: 2.5 } }
});
const runComparison = () => runStressReplayComparisonV1({
    path,
    baselineInputs: inputs,
    sourceScenarioLog: sourceMeta.logDataRows,
    alternatives: [alternative],
    engine: EngineAPI
});

const first = runComparison();
const second = runComparison();
const baselineReplay = runStressReplayPathV1({
    path,
    baselineInputs: inputs,
    sourceScenarioLog: sourceMeta.logDataRows,
    engine: EngineAPI
});
assertEqual(first.overallStatus, 'complete', 'Baseline and alternative must complete without a technical error');
assertEqual(first.variantOrder.join(','), 'baseline,shorter-runway', 'Comparison order must remain baseline-first');
assertEqual(first.comparisonFingerprint.value, second.comparisonFingerprint.value,
    'The complete fixed-path comparison must be deterministic');
assertEqual(baselineReplay.reconciliation.matched, true,
    'The baseline replay must reconcile with the original MC scenario log');
assertEqual(first.financialRankingAllowed, false,
    'The end-to-end result must remain a paired counterfactual, not a general ranking');

const workspace = createStressReplayWorkspaceV1({
    path,
    baselineSnapshot: inputs,
    variants: [createStressReplayBaselineVariantV1({ baselineInputs: inputs }), alternative],
    createdAtUtc: '2026-08-15T10:00:00.000Z'
});
const exported = buildStressReplayComparisonExportV1({
    workspace,
    comparison: first,
    exportedAt: '2026-08-15T11:00:00.000Z'
});
const serialized = serializeStressReplayComparisonExportV1(exported);
const imported = parseStressReplayComparisonExportV1(serialized);
const exportBytes = Buffer.byteLength(serialized, 'utf8');
assertEqual(imported.workspace.workspaceFingerprint.value, workspace.workspaceFingerprint.value,
    'Export/import must retain the complete fixed workspace identity');
assertEqual(imported.comparison.comparisonFingerprint.value, first.comparisonFingerprint.value,
    'Export/import must retain the deterministic comparison identity');
const maximumRelativeExportBytes = Math.ceil(
    baselineFixture.measurement.exportBytes * baselineFixture.budgets.maximumExportMultiplier
);
assert(exportBytes <= Math.min(baselineFixture.budgets.maximumExportBytes, maximumRelativeExportBytes),
    'The comparison export must stay within the documented relative and contract size budgets');

for (let index = 0; index < baselineFixture.measurement.warmupRuns; index++) runComparison();
const durationsMs = [];
for (let index = 0; index < baselineFixture.measurement.measuredRuns; index++) {
    const startedAt = performance.now();
    runComparison();
    durationsMs.push(performance.now() - startedAt);
}
const observedMedianMs = median(durationsMs);
const maximumMedianMs = Math.max(
    baselineFixture.budgets.minimumAbsoluteMedianMs,
    baselineFixture.measurement.medianMs * baselineFixture.budgets.maximumMedianMultiplier
);
console.log('Stress replay 60-year performance:', JSON.stringify({
    platform: `${os.platform()}-${os.arch()}`,
    node: process.version,
    durationsMs: durationsMs.map(value => Number(value.toFixed(3))),
    observedMedianMs: Number(observedMedianMs.toFixed(3)),
    maximumMedianMs,
    exportBytes
}));
assert(observedMedianMs <= maximumMedianMs,
    `60-year replay median must remain within the relative ${maximumMedianMs.toFixed(3)} ms budget`);

console.log('Stress replay end-to-end tests passed.');
