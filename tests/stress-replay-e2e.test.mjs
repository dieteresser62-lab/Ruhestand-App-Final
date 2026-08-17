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
    createStressReplayVariantV1,
    previewStressReplayVariantPatchV1,
    applyStressReplayVariantV1
} from '../app/simulator/stress-replay-variant.js';
import {
    buildStressReplayComparisonExportV1,
    parseStressReplayComparisonExportV1,
    serializeStressReplayComparisonExportV1
} from '../app/simulator/stress-replay-export.js';
import { formatStressReplayUiError } from '../app/simulator/stress-replay-ui.js';
import { inspectStressReplayImportV1 } from '../app/simulator/stress-replay-persistence.js';

console.log('--- Stress Replay End-to-End Tests ---');

const baselineFixture = JSON.parse(fs.readFileSync(
    new URL('./fixtures/stress-replay-performance-baseline-v1.json', import.meta.url),
    'utf8'
));
const legacyExportFixture = fs.readFileSync(
    new URL('./fixtures/stress-replay-comparison-export-v1.json', import.meta.url),
    'utf8'
);

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

const baselineInputsBeforeNeedsReplay = JSON.stringify(inputs);
const pathFingerprintBeforeNeedsReplay = path.pathFingerprint.value;
const sourceFingerprintBeforeNeedsReplay = createStressReplayFingerprint(sourceMeta.logDataRows).value;
const needsAlternative = createStressReplayVariantV1({
    id: 'needs-v2',
    label: 'Bedarfe V2',
    baselineInputs: inputs,
    patch: {
        strategy: {
            startFloorBedarf: 30000,
            startFlexBedarf: 16000,
            minimumFlexAnnual: 8000
        }
    }
});
const needsReplay = runStressReplayPathV1({
    path,
    baselineInputs: inputs,
    variant: needsAlternative,
    engine: EngineAPI
});
assertEqual(needsAlternative.whitelistVersion, 'StressReplayVariantWhitelistV2',
    'New need variants must use the V2 whitelist');
assertEqual(needsReplay.pathFingerprint.value, pathFingerprintBeforeNeedsReplay,
    'A need variant must run on the unchanged materialized path');
assertEqual(JSON.stringify(inputs), baselineInputsBeforeNeedsReplay,
    'A need variant must not mutate the frozen baseline inputs');
assertEqual(createStressReplayFingerprint(sourceMeta.logDataRows).value, sourceFingerprintBeforeNeedsReplay,
    'A need variant must not mutate the source scenario log');
assert(needsReplay.summary.totalWithdrawalsEur !== baselineReplay.summary.totalWithdrawalsEur
    || needsReplay.summary.finalValueNominalEur !== baselineReplay.summary.finalValueNominalEur,
'Changed floor and flex needs must have an observable financial effect on the fixed path');
const needsFinancialRows = needsReplay.scenarioLog.records.filter(record => record.recordType === 'financial_year');
assert(needsFinancialRows.length > 0, 'The V2 need replay must expose financially evaluated years');
assertEqual(needsFinancialRows[0].minimumFlexConfiguredAnnualEur, 8000,
    'The configured V2 minimum flex must reach the first real yearly engine diagnostic');
for (let index = 1; index < needsFinancialRows.length; index++) {
    const previousRow = needsFinancialRows[index - 1];
    const currentRow = needsFinancialRows[index];
    const expectedMinimumFlex = previousRow.minimumFlexConfiguredAnnualEur
        * (1 + previousRow.inflation / 100);
    assert(Math.abs(currentRow.minimumFlexConfiguredAnnualEur - expectedMinimumFlex) < 0.000001,
        `Year ${index + 1} minimum flex must continue the prior year's nominal inflation trajectory`);
}
assert(Number.isFinite(needsReplay.summary.totalMinimumFlexShortfallEur),
    'The V2 minimum-flex run must expose its aggregated shortfall diagnostic');

let genuineNeedsError = null;
try {
    createStressReplayVariantV1({
        id: 'invalid-needs-v2',
        label: 'Unzulaessiger Mindest-Flex',
        baselineInputs: inputs,
        patch: { strategy: { startFlexBedarf: 5000, minimumFlexAnnual: 6000 } }
    });
} catch (error) {
    genuineNeedsError = error;
}
assertEqual(genuineNeedsError?.code, 'STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX',
    'The genuine contract must reject minimum flex above effective flex');
const genuineNeedsMessage = formatStressReplayUiError(genuineNeedsError);
assert(genuineNeedsMessage.includes('6.000') && genuineNeedsMessage.includes('5.000'),
    'The UI formatter must interpolate both amounts from the genuine contract error details');

const workspace = createStressReplayWorkspaceV1({
    path,
    sourceScenarioLog: sourceMeta.logDataRows,
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
assertEqual(imported.workspace.sourceIdentity.identityFingerprint.value,
    workspace.sourceIdentity.identityFingerprint.value,
    'Export/import must retain the independently captured source identity');
const importedBaselineReplay = runStressReplayPathV1({
    path: imported.workspace.path,
    baselineInputs: imported.workspace.baselineSnapshot,
    sourceIdentity: imported.workspace.sourceIdentity,
    engine: EngineAPI
});
assertEqual(importedBaselineReplay.reconciliation.matched, true,
    'Imported baseline must reconcile from persisted source identity without original logs');

const exactFlexBaselineInputs = {
    ...inputs,
    startFlexBedarf: 90000,
    minimumFlexAnnual: 30000,
    horizonYears: 35
};
const exactFlexMonteCarloParams = { ...monteCarloParams, maxDauer: 35, seed: 20260817 };
const exactFlexSourceRequest = {
    ...sourceRequest,
    inputs: exactFlexBaselineInputs,
    monteCarloParams: exactFlexMonteCarloParams
};
const exactFlexSource = await runMonteCarloChunk({
    inputs: exactFlexBaselineInputs,
    widowOptions,
    monteCarloParams: exactFlexMonteCarloParams,
    useCapeSampling: false,
    runRange: { start: 0, count: 1 },
    logIndices: [0],
    stressReplayCapture: createStressReplayCaptureRequest([0]),
    engine: EngineAPI
});
const exactFlexSourceMeta = exactFlexSource.runMeta.find(entry => entry.index === 0);
assert(exactFlexSourceMeta?.stressReplayCapture,
    'The synthetic exact-flex run must publish its replay capture');
assertEqual(exactFlexSourceMeta.logDataRows.length, 35,
    'The synthetic exact-flex source log must contain all 35 years');
const exactFlexPath = materializeStressReplayPathV1({
    capture: exactFlexSourceMeta.stressReplayCapture,
    sourceLogRows: exactFlexSourceMeta.logDataRows,
    sourceRequest: exactFlexSourceRequest,
    dataFingerprint: createStressReplayFingerprint({ dataVersion: getDataVersion() }),
    engineFingerprint: createStressReplayFingerprint({ engineVersion: EngineAPI.version || 'EngineAPI' }),
    scenarioKey: 'synthetic-exact-flex-35-year-path',
    selectionMetric: 'nominal_terminal_wealth_eur'
});
assertEqual(exactFlexPath.effectiveLength, 35,
    'The synthetic exact-flex regression path must retain its complete 35-year horizon');

const exactFlexPatch = { strategy: { startFlexBedarf: 28000, minimumFlexAnnual: 12000 } };
const exactFlexPreview = previewStressReplayVariantPatchV1({
    baselineInputs: exactFlexBaselineInputs,
    patch: exactFlexPatch
});
assertEqual(exactFlexPreview.patch.strategy.startFlexBedarf, 28000,
    'Preview must preserve the requested 28,000 EUR flex need exactly');
assertEqual(exactFlexPreview.patch.strategy.minimumFlexAnnual, 12000,
    'Preview must preserve the requested 12,000 EUR minimum flex exactly');
const exactFlexVariant = createStressReplayVariantV1({
    id: 'exact-flex-reduction',
    label: 'Flex 28.000 / Mindest-Flex 12.000',
    baselineInputs: exactFlexBaselineInputs,
    patch: exactFlexPatch
});
const exactFlexAppliedInputs = applyStressReplayVariantV1({
    baselineInputs: exactFlexBaselineInputs,
    variant: exactFlexVariant
});
assertEqual(exactFlexAppliedInputs.startFlexBedarf, 28000,
    'Variant application must pass 28,000 EUR flex need through unchanged');
assertEqual(exactFlexAppliedInputs.minimumFlexAnnual, 12000,
    'Variant application must pass 12,000 EUR minimum flex through unchanged');

const exactFlexBaselineBefore = JSON.stringify(exactFlexBaselineInputs);
const exactFlexPathBefore = exactFlexPath.pathFingerprint.value;
const exactFlexSourceBefore = createStressReplayFingerprint(exactFlexSourceMeta.logDataRows).value;
const exactFlexBaselineReplay = runStressReplayPathV1({
    path: exactFlexPath,
    baselineInputs: exactFlexBaselineInputs,
    sourceScenarioLog: exactFlexSourceMeta.logDataRows,
    engine: EngineAPI
});
const exactFlexVariantReplay = runStressReplayPathV1({
    path: exactFlexPath,
    baselineInputs: exactFlexBaselineInputs,
    variant: exactFlexVariant,
    engine: EngineAPI
});
const exactFlexComparison = runStressReplayComparisonV1({
    path: exactFlexPath,
    baselineInputs: exactFlexBaselineInputs,
    sourceScenarioLog: exactFlexSourceMeta.logDataRows,
    alternatives: [exactFlexVariant],
    engine: EngineAPI
});
assertEqual(exactFlexComparison.overallStatus, 'complete',
    'The exact flex reduction must produce a complete fixed-path comparison');
assert(exactFlexComparison.variants.every(entry => entry.terminalStatus !== 'technical_error'),
    'Neither exact-flex comparison arm may contain a technical error');
assertEqual(exactFlexBaselineReplay.pathFingerprint.value, exactFlexVariantReplay.pathFingerprint.value,
    'Baseline and reduced-flex replay must use the same fixed path');
assert(exactFlexComparison.variants[0].variantFingerprint.value
    !== exactFlexComparison.variants[1].variantFingerprint.value,
'Baseline and reduced-flex alternative must retain distinct variant identities');
const exactBaselineFirstYear = exactFlexBaselineReplay.scenarioLog.records
    .find(record => record.recordType === 'financial_year');
const exactVariantFirstYear = exactFlexVariantReplay.scenarioLog.records
    .find(record => record.recordType === 'financial_year');
assertEqual(exactBaselineFirstYear.minimumFlexConfiguredAnnualEur, 30000,
    'The real baseline engine year must receive 30,000 EUR minimum flex unchanged');
assertEqual(exactVariantFirstYear.minimumFlexConfiguredAnnualEur, 12000,
    'The real variant engine year must receive 12,000 EUR minimum flex unchanged');
assertEqual(JSON.stringify(exactFlexBaselineInputs), exactFlexBaselineBefore,
    'Preview, creation, application and both replays must not mutate the exact-flex baseline');
assertEqual(exactFlexPath.pathFingerprint.value, exactFlexPathBefore,
    'The complete exact-flex workflow must not mutate the fixed path');
assertEqual(createStressReplayFingerprint(exactFlexSourceMeta.logDataRows).value, exactFlexSourceBefore,
    'The complete exact-flex workflow must not mutate the original source rows');

const exactFlexWorkspace = createStressReplayWorkspaceV1({
    path: exactFlexPath,
    sourceScenarioLog: exactFlexSourceMeta.logDataRows,
    baselineSnapshot: exactFlexBaselineInputs,
    variants: [
        createStressReplayBaselineVariantV1({ baselineInputs: exactFlexBaselineInputs }),
        exactFlexVariant
    ],
    createdAtUtc: '2026-08-17T10:00:00.000Z'
});
const exactFlexWorkspaceBefore = exactFlexWorkspace.workspaceFingerprint.value;
const exactFlexSerialized = serializeStressReplayComparisonExportV1(buildStressReplayComparisonExportV1({
    workspace: exactFlexWorkspace,
    comparison: exactFlexComparison,
    exportedAt: '2026-08-17T10:30:00.000Z'
}));
const exactFlexImported = parseStressReplayComparisonExportV1(exactFlexSerialized);
assertEqual(exactFlexImported.workspace.sourceIdentity.schemaVersion, 'StressReplaySourceIdentityV2',
    'Exact-flex export/import must retain executable V2 source evidence');
assertEqual(exactFlexImported.workspace.sourceIdentity.identityFingerprint.value,
    exactFlexWorkspace.sourceIdentity.identityFingerprint.value,
    'Exact-flex export/import must retain the V2 source identity fingerprint');
assertEqual(exactFlexImported.workspace.workspaceFingerprint.value, exactFlexWorkspaceBefore,
    'Exact-flex export/import must retain the unchanged workspace fingerprint');
assertEqual(exactFlexImported.comparison.comparisonFingerprint.value,
    exactFlexComparison.comparisonFingerprint.value,
    'Exact-flex export/import must retain the complete comparison fingerprint');
const exactFlexReloadedBaseline = runStressReplayPathV1({
    path: exactFlexImported.workspace.path,
    baselineInputs: exactFlexImported.workspace.baselineSnapshot,
    sourceIdentity: exactFlexImported.workspace.sourceIdentity,
    engine: EngineAPI
});
assertEqual(exactFlexReloadedBaseline.reconciliation.matched, true,
    'Reloaded exact-flex baseline must reconcile from persisted V2 values');
assertEqual(exactFlexReloadedBaseline.resultFingerprint.value, exactFlexBaselineReplay.resultFingerprint.value,
    'Direct and V2-reloaded exact-flex baseline runs must be identical');

const zeroBaselineInputs = { ...inputs, minimumFlexAnnual: 6000 };
const zeroAlternative = createStressReplayVariantV1({
    id: 'zero-needs-v2',
    label: 'Bedarfe explizit null',
    baselineInputs: zeroBaselineInputs,
    patch: {
        strategy: {
            startFloorBedarf: 0,
            startFlexBedarf: 0,
            minimumFlexAnnual: 0
        }
    }
});
const zeroWorkspace = createStressReplayWorkspaceV1({
    path,
    sourceScenarioLog: sourceMeta.logDataRows,
    baselineSnapshot: zeroBaselineInputs,
    variants: [createStressReplayBaselineVariantV1({ baselineInputs: zeroBaselineInputs }), zeroAlternative],
    createdAtUtc: '2026-08-15T12:00:00.000Z'
});
const importedZero = parseStressReplayComparisonExportV1(serializeStressReplayComparisonExportV1(
    buildStressReplayComparisonExportV1({
        workspace: zeroWorkspace,
        comparison: null,
        exportedAt: '2026-08-15T12:30:00.000Z'
    })
));
const importedZeroVariant = importedZero.workspace.variants.find(variant => variant.id === 'zero-needs-v2');
assertEqual(importedZeroVariant.patch.strategy.startFloorBedarf, 0,
    'Export/import must preserve an explicit zero floor need');
assertEqual(importedZeroVariant.patch.strategy.startFlexBedarf, 0,
    'Export/import must preserve an explicit zero flex need');
assertEqual(importedZeroVariant.patch.strategy.minimumFlexAnnual, 0,
    'Export/import must preserve an explicit zero minimum flex');
const importedZeroReplay = runStressReplayPathV1({
    path: importedZero.workspace.path,
    baselineInputs: importedZero.workspace.baselineSnapshot,
    variant: importedZeroVariant,
    engine: EngineAPI
});
assert(importedZeroReplay.scenarioLog.records
    .filter(record => record.recordType === 'financial_year')
    .every(record => record.minimumFlexConfiguredAnnualEur === 0),
'The imported explicit-zero variant must reach every applicable real engine year as zero');

const legacyImported = parseStressReplayComparisonExportV1(legacyExportFixture);
assert(legacyImported.workspace.variants.every(variant => (
    variant.whitelistVersion === 'StressReplayVariantWhitelistV1'
)), 'The golden legacy export fixture must retain V1 whitelist dispatch');
const legacyInspection = inspectStressReplayImportV1(legacyExportFixture, {
    currentCompatibility: {
        contractVersion: legacyImported.workspace.contractVersion,
        dataFingerprint: legacyImported.workspace.path.dataFingerprint,
        engineFingerprint: legacyImported.workspace.path.engineFingerprint
    }
});
assertEqual(legacyInspection.compatibility.status, 'read_only',
    'A legacy V1 source identity must remain inspectable but not executable');
assertEqual(legacyInspection.compatibility.mismatchReasons.join(','), 'source_identity_refix_required',
    'Legacy source evidence must expose the stable refix reason without migration');
const legacyBaselineVariant = createStressReplayBaselineVariantV1({
    baselineInputs: inputs,
    whitelistVersion: 'StressReplayVariantWhitelistV1'
});
const legacyAlternative = createStressReplayVariantV1({
    id: 'legacy-runway',
    label: 'Legacy-Runway',
    baselineInputs: inputs,
    whitelistVersion: 'StressReplayVariantWhitelistV1',
    patch: { strategy: { liquidityRunwayYears: 2.5 } }
});
const legacyComparison = runStressReplayComparisonV1({
    path,
    baselineInputs: inputs,
    sourceScenarioLog: sourceMeta.logDataRows,
    alternatives: [legacyAlternative],
    engine: EngineAPI
});
const legacyWorkspace = createStressReplayWorkspaceV1({
    path,
    sourceScenarioLog: sourceMeta.logDataRows,
    baselineSnapshot: inputs,
    variants: [legacyBaselineVariant, legacyAlternative],
    createdAtUtc: '2026-08-15T13:00:00.000Z'
});
const legacyRoundtrip = parseStressReplayComparisonExportV1(serializeStressReplayComparisonExportV1(
    buildStressReplayComparisonExportV1({
        workspace: legacyWorkspace,
        comparison: legacyComparison,
        exportedAt: '2026-08-15T13:30:00.000Z'
    })
));
const importedLegacyAlternative = legacyRoundtrip.workspace.variants
    .find(variant => variant.id === legacyAlternative.id);
const legacyReplay = runStressReplayPathV1({
    path: legacyRoundtrip.workspace.path,
    baselineInputs: legacyRoundtrip.workspace.baselineSnapshot,
    variant: importedLegacyAlternative,
    engine: EngineAPI
});
assertEqual(legacyReplay.technicalError, null,
    'A legacy V1 alternative without new leaves must remain executable');
const legacyFinancialRow = legacyReplay.scenarioLog.records.find(record => record.recordType === 'financial_year');
assertEqual(legacyFinancialRow.minimumFlexConfiguredAnnualEur, inputs.minimumFlexAnnual,
    'A missing legacy minimum-flex patch leaf must inherit the frozen baseline value');
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
