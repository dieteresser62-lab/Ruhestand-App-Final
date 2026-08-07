import fs from 'node:fs';
import { EngineAPI } from '../engine/index.mjs';
import {
    MONTE_CARLO_RUN_REQUEST_VERSION,
    MONTE_CARLO_RUN_RESULT_VERSION,
    MONTE_CARLO_RUN_RESULT_V2_VERSION,
    MONTE_CARLO_LEGACY_READ_ALIASES,
    createMonteCarloRunRequestV1,
    createMonteCarloRunResultV1,
    projectMonteCarloRunResultV2,
    extractMonteCarloReplayArgsV1,
    validateMonteCarloRunRequestV1,
    validateMonteCarloRunResultV1,
    validateMonteCarloRunResultV2
} from '../app/simulator/monte-carlo-contracts.js';
import {
    MONTE_CARLO_APP_VERSION,
    MONTE_CARLO_EXPORT_SCHEMA_ID,
    MONTE_CARLO_EXPORT_V1_VERSION,
    MONTE_CARLO_EXPORT_VERSION,
    MONTE_CARLO_EXPORT_V2_VERSION,
    buildMonteCarloExportV1,
    buildMonteCarloExportV2,
    captureMonteCarloEngineProvenance,
    createMonteCarloExportDownload,
    projectScenarioLogV2,
    readMonteCarloExport,
    readMonteCarloExportV1,
    readScenarioLogExport,
    serializeMonteCarloExportV1,
    serializeMonteCarloExportV2,
    serializeScenarioLogCsvV2,
    serializeScenarioLogExportV2
} from '../app/simulator/monte-carlo-export.js';
import { createMonteCarloUI, triggerMonteCarloDownload } from '../app/simulator/monte-carlo-ui.js';
import {
    MONTE_CARLO_HOUSEHOLD_LIFE_CONTRACT_VERSION,
    runMonteCarloSimulation
} from '../app/simulator/monte-carlo-runner.js';
import {
    compileScenario,
    getDataVersion,
    prepareHistoricalDataOnce
} from '../app/simulator/simulator-engine-helpers.js';
import { canonicalizeHistoricalContractValue } from '../app/simulator/historical-backtest-contract.js';

console.log('--- Monte Carlo Export Contract Tests ---');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function expectThrow(callback, code, label) {
    let error = null;
    try {
        callback();
    } catch (caught) {
        error = caught;
    }
    assert(error, `${label}: expected an error`);
    if (code) assertEqual(error.code, code, `${label}: stable error code`);
    return error;
}

function buildInputs() {
    return {
        startAlter: 65,
        accumulationPhase: { enabled: false },
        transitionYear: 0,
        startVermoegen: 500000,
        depotwertAlt: 500000,
        einstandAlt: 400000,
        tagesgeld: 20000,
        geldmarktEtf: 0,
        zielLiquiditaet: 20000,
        startFloorBedarf: 24000,
        startFlexBedarf: 6000,
        minimumFlexAnnual: 0,
        flexBudgetAnnual: 0,
        flexBudgetRecharge: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        rentAdjPct: 0,
        goldAktiv: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        goldSteuerfrei: false,
        risikoprofil: 'sicherheits-dynamisch',
        rebalancingBand: 20,
        runwayTargetMonths: 36,
        runwayMinMonths: 24,
        targetEq: 60,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        marketCapeRatio: 20,
        capeRatio: 20,
        kirchensteuerSatz: 0,
        startSPB: 1000,
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1,
        pflegefallLogikAktivieren: false,
        geschlecht: 'm',
        partner: { aktiv: false },
        stressPreset: 'NONE'
    };
}

const inputs = buildInputs();
const widowOptions = { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 };
const monteCarloParams = {
    anzahl: 8,
    maxDauer: 3,
    blockSize: 2,
    seed: 424242,
    methode: 'block',
    rngMode: 'per-run-seed',
    startYearMode: 'FILTER',
    startYearFilter: 1970,
    startYearHalfLife: 20,
    excludeEstimatedHistory: true
};
const execution = {
    mode: 'serial',
    workerCount: 0,
    timeBudgetMs: null,
    compareModeRequested: false,
    chunkConfiguration: {
        strategy: 'single-chunk-v1',
        minChunkRuns: null,
        baseTimeoutMs: null,
        stallTimeoutMs: null
    }
};

prepareHistoricalDataOnce();
const firstRun = await runMonteCarloSimulation({
    inputs,
    widowOptions,
    monteCarloParams,
    useCapeSampling: false,
    engine: EngineAPI
});
const { scenarioKey } = compileScenario(inputs, widowOptions, monteCarloParams.methode, false, inputs.stressPreset);
const request = createMonteCarloRunRequestV1({
    inputs,
    widowOptions,
    monteCarloParams,
    useCapeSampling: false,
    samplingDiagnostics: firstRun.samplingDiagnostics,
    dataVersion: getDataVersion(),
    execution,
    scenarioKey
});
const historicalStressRequest = createMonteCarloRunRequestV1({
    inputs: { ...inputs, stressPreset: 'STAGFLATION_70s' },
    widowOptions,
    monteCarloParams,
    useCapeSampling: false,
    samplingDiagnostics: firstRun.samplingDiagnostics,
    dataVersion: getDataVersion(),
    execution,
    scenarioKey: null
});
const result = createMonteCarloRunResultV1({
    aggregatedResults: firstRun.aggregatedResults,
    samplingDiagnostics: firstRun.samplingDiagnostics,
    executionDiagnostics: execution,
    requestedRuns: monteCarloParams.anzahl
});
const engine = captureMonteCarloEngineProvenance(EngineAPI);
const exportedAt = '2026-07-22T12:34:56.789Z';
const document = buildMonteCarloExportV1({ request, result, engine, exportedAt });
const resultV2 = projectMonteCarloRunResultV2(result);
const documentV2 = buildMonteCarloExportV2({ request, result: resultV2, engine, exportedAt });
const legacyV1Request = JSON.parse(JSON.stringify(request));
delete legacyV1Request.stress.provenance;
delete legacyV1Request.stress.pool;
const legacyV1Document = buildMonteCarloExportV1({
    request: legacyV1Request,
    result,
    engine,
    exportedAt
});
const schemaGolden = JSON.parse(fs.readFileSync(
    new URL('./fixtures/monte-carlo-export-v1-schema.json', import.meta.url),
    'utf8'
));

{
    assertEqual(schemaGolden.schemaId, MONTE_CARLO_EXPORT_SCHEMA_ID, 'schema golden fixes the export schema id');
    assertEqual(schemaGolden.contracts.request, MONTE_CARLO_RUN_REQUEST_VERSION, 'schema golden fixes the request version');
    assertEqual(schemaGolden.contracts.result, MONTE_CARLO_RUN_RESULT_VERSION, 'schema golden fixes the result version');
    assertEqual(schemaGolden.contracts.export, MONTE_CARLO_EXPORT_V1_VERSION, 'schema golden fixes the V1 export version');
    assertEqual(schemaGolden.moneyFieldSuffixes.nominal, result.unitContract.nominalMoneyFieldSuffix, 'schema golden fixes nominal money units');
    assertEqual(schemaGolden.moneyFieldSuffixes.real, result.unitContract.realMoneyFieldSuffix, 'schema golden fixes real money units');
    assert(schemaGolden.requiredRequestFields.every(field => Object.hasOwn(request, field)), 'schema golden required request fields are present');
    assert(schemaGolden.requiredResultFields.every(field => Object.hasOwn(result, field)), 'schema golden required result fields are present');
}

{
    assertEqual(request.schemaVersion, MONTE_CARLO_RUN_REQUEST_VERSION, 'request uses the V1 schema');
    assertEqual(request.parameters.runs, 8, 'request retains the normalized run count');
    assertEqual(request.parameters.seed, 424242, 'request retains the deterministic seed');
    assertEqual(request.parameters.samplingMethod, 'block', 'request retains the sampling method');
    assertEqual(request.sampling.startYearMode, 'FILTER', 'request retains start-year weighting');
    assertEqual(request.stress.preset, 'NONE', 'request identifies the stress method and preset');
    assertEqual(request.stress.provenance.evidenceKind, 'none', 'request exports stress evidence provenance');
    assertEqual(request.stress.pool.policy, 'not_applicable', 'request exports the stress pool policy');
    assertEqual(historicalStressRequest.stress.provenance.evidenceKind, 'historical_filter',
        'historical stress exports its evidence kind');
    assertEqual(JSON.stringify(historicalStressRequest.stress.pool.rawCandidateYears), JSON.stringify([1946, 1948, 1973]),
        'historical stress export pins the complete raw candidate pool');
    assertEqual(request.scenario.schemaVersion, 'MonteCarloScenarioV1', 'request versions the scenario payload');
    assertEqual(request.scenario.normalizedInputs.startFloorBedarf, 24000, 'request carries only the normalized scenario used by the run');
    assert(/^[a-f0-9]{64}$/.test(request.scenario.fingerprint.value), 'scenario fingerprint is a SHA-256 hex value');
    assert(/^[a-f0-9]{64}$/.test(request.data.fingerprint.value), 'data fingerprint is a SHA-256 hex value');
    assertEqual(request.execution.chunkConfiguration.strategy, 'single-chunk-v1', 'request records the exact serial chunk policy');
    assertEqual(request.snapshotPolicy.currentReference, null, 'request must not advertise a pending snapshot as the current reference');
    assertEqual(
        request.snapshotPolicy.policy,
        'immutable-baseline-with-versioned-pending-candidates',
        'snapshot policy must describe unpromoted versioned candidates while the current reference is empty'
    );
    assertEqual(
        request.snapshotPolicy.promotionRule,
        'current-reference-remains-null-until-external-approval',
        'snapshot policy must make external approval the promotion boundary'
    );
    assertEqual(
        Object.hasOwn(request.snapshotPolicy, 'ignoredHistoricalFixtureFields'),
        false,
        'runtime exports must not carry fixture-specific comparison paths'
    );
    assert(Object.isFrozen(request) && Object.isFrozen(request.scenario.normalizedInputs), 'request is deeply immutable');
    validateMonteCarloRunRequestV1(request);
    validateMonteCarloRunRequestV1(legacyV1Request);
    assertEqual(readMonteCarloExportV1(JSON.stringify(legacyV1Document)).document.request.stress.preset, 'NONE',
        'reader accepts a pre-extension MonteCarloRunRequestV1 without stress provenance or pool');
}

{
    assertEqual(result.schemaVersion, MONTE_CARLO_RUN_RESULT_VERSION, 'result uses the V1 schema');
    assertEqual(result.sampleSize.requestedRuns, 8, 'result exposes requested sample size');
    assertEqual(result.sampleSize.financiallyEvaluableRuns + result.technicalErrorCount, 8, 'result classifies every requested run');
    assertEqual(
        result.outcomeInventory.ruin + result.outcomeInventory.all_dead
            + result.outcomeInventory.horizon_exhausted + result.outcomeInventory.technical_error,
        8,
        'result outcome inventory classifies every requested run exactly once'
    );
    assert(result.kpis.finalWealthNominalEur.p50 !== undefined, 'result exports canonical nominal wealth KPIs');
    assert(result.kpis.realWithdrawalP10RealEur.p10RealEur !== undefined, 'result exports explicitly real withdrawal money');
    assertEqual(result.kpis.care.p1.additionalNeedRealEurP50, null, 'unobserved care money stays null');
    assertEqual(result.kpis.healthBucketNominalEur.totalUsedNominalEur, 0, 'an observed zero remains distinguishable from null');
    assertEqual(result.unitContract.nominalMoneyFieldSuffix, 'NominalEur', 'unit contract requires explicit nominal money suffixes');
    assertEqual(result.unitContract.realMoneyFieldSuffix, 'RealEur', 'unit contract requires explicit real money suffixes');
    assert(result.diagnostics.sampling.initialStartYearCounts, 'result includes sampling diagnostics');
    assertEqual(
        result.diagnostics.sampling.modelContracts?.householdLife?.schemaVersion,
        MONTE_CARLO_HOUSEHOLD_LIFE_CONTRACT_VERSION,
        'result contract exports the versioned household life semantics'
    );
    assertEqual(
        result.diagnostics.sampling.modelContracts?.householdLife?.deltaLedgerId,
        'A08-2',
        'result contract links the partner-mortality correction to its delta-ledger entry'
    );
    assertEqual(
        result.diagnostics.sampling.modelContracts?.householdLife?.householdFlexProfilePolicy,
        'partner-activation-independent-of-care-metadata',
        'result contract exports care-independent household flex membership'
    );
    assert(
        result.diagnostics.sampling.modelContracts?.householdLife?.deltaLedgerIds?.includes('A08-8'),
        'result contract links the household-flex correction to A08-8'
    );
    assertEqual(result.diagnostics.execution.mode, 'serial', 'result includes execution diagnostics');
    assert(!Object.hasOwn(result.kpis, 'kpiKuerzungsjahre'), 'new result does not write the deprecated cut-year alias');
    assert(!Object.hasOwn(result.kpis, 'extraKPI'), 'new result does not write the deprecated extraKPI alias container');
    assert(!Object.hasOwn(result.kpis, 'stressKPI'), 'new result does not write the deprecated stressKPI alias container');
    validateMonteCarloRunResultV1(result);
}

{
    assertEqual(document.schemaId, MONTE_CARLO_EXPORT_SCHEMA_ID, 'export uses the stable Monte-Carlo schema id');
    assertEqual(document.schemaVersion, MONTE_CARLO_EXPORT_V1_VERSION, 'export uses the V1 schema');
    assertEqual(document.exportedAtUtc, exportedAt, 'export timestamp is normalized to UTC');
    assertEqual(document.app.packageVersion, MONTE_CARLO_APP_VERSION.packageVersion, 'export identifies the app package version');
    assertEqual(document.engine.apiVersion, EngineAPI.getVersion().api, 'export identifies the Engine API version');
    assertEqual(document.snapshotPolicy.schemaVersion, 'MonteCarloSnapshotPolicyV1', 'export identifies the snapshot policy version');
    assert(document.identifiers.requestId.startsWith('mcrq_'), 'export exposes a stable request id');
    assert(document.identifiers.runId.startsWith('mcrun_'), 'export exposes a stable run id');
    assert(/^[a-f0-9]{64}$/.test(document.fingerprint.value), 'export fingerprint is a SHA-256 hex value');
    assertEqual(document.compatibility.newExportsWriteDeprecatedAliases, false, 'export declares that deprecated aliases are read-only');
    assertEqual(document.privacy.scope, 'only-the-normalized-scenario-used-by-this-run', 'export declares its privacy scope');
    assert(Object.isFrozen(document) && Object.isFrozen(document.result.kpis), 'export document is deeply immutable');
}

{
    const serialized = serializeMonteCarloExportV1(document);
    const roundtrip = readMonteCarloExportV1(serialized);
    assertEqual(
        canonicalizeHistoricalContractValue(roundtrip.document),
        canonicalizeHistoricalContractValue(document),
        'V1 JSON roundtrips without display formatting or recomputation'
    );
    assert(!serialized.includes('<span'), 'raw JSON contains no UI formatter HTML');
    assert(!serialized.includes('C:\\\\Users\\\\'), 'raw JSON contains no local Windows path');
    assert(!serialized.includes('/Users/'), 'raw JSON contains no local macOS path');
    assert(!serialized.includes('/home/'), 'raw JSON contains no local Linux path');

    const withFutureField = clone(document);
    withFutureField.futureTopLevel = { retainedByFutureWriter: true };
    const telemetry = [];
    const futureRead = readMonteCarloExportV1(withFutureField, { onTelemetry: event => telemetry.push(event) });
    assert(futureRead.compatibility.unknownFields.includes('$.futureTopLevel'), 'forward policy reports an unknown top-level field');
    assert(telemetry.some(event => event.event === 'monte_carlo_unknown_field_ignored'), 'unknown fields emit compatibility telemetry');
}

{
    const changedTime = buildMonteCarloExportV1({
        request,
        result,
        engine,
        exportedAt: '2026-07-23T01:02:03.004Z'
    });
    assertEqual(changedTime.fingerprint.value, document.fingerprint.value, 'export timestamp does not alter the run fingerprint');
    assertEqual(changedTime.identifiers.runId, document.identifiers.runId, 'export timestamp does not alter the run id');

    const tampered = clone(document);
    tampered.result.kpis.finalWealthNominalEur.p50 += 1;
    expectThrow(
        () => readMonteCarloExportV1(tampered),
        'MC_EXPORT_FINGERPRINT_MISMATCH',
        'tampered result fails closed'
    );
}

{
    assertEqual(resultV2.schemaVersion, MONTE_CARLO_RUN_RESULT_V2_VERSION, 'V2 result uses its own schema');
    assertEqual(MONTE_CARLO_EXPORT_VERSION, MONTE_CARLO_EXPORT_V1_VERSION,
        'deprecated unqualified export version retains its historical V1 meaning');
    assertEqual(documentV2.schemaVersion, MONTE_CARLO_EXPORT_V2_VERSION, 'V2 export uses the explicit V2 schema');
    const heatmap = resultV2.diagnostics.withdrawalRateHeatmap;
    assertEqual(heatmap.bins.length, 11, 'V2 heatmap projects eleven intervals from twelve boundaries');
    assert(heatmap.countsByPlanYear.every(row => row.length === heatmap.bins.length),
        'Every V2 heatmap count row has exactly one value per interval');
    assertEqual(heatmap.bins[0].lowerBoundPct, 0, 'First heatmap interval includes zero');
    assertEqual(heatmap.bins.at(-1).upperBoundPct, null, 'Last heatmap interval is open ended');
    assertEqual(heatmap.bins.at(-1).openEnded, true, 'Open-ended heatmap interval is explicit');
    for (const bin of heatmap.bins) {
        const valueAtLowerBoundary = bin.lowerBoundPct;
        const matchingIndex = heatmap.bins.findIndex(candidate => (
            valueAtLowerBoundary >= candidate.lowerBoundPct
            && (candidate.upperBoundPct === null || valueAtLowerBoundary < candidate.upperBoundPct)
        ));
        assertEqual(matchingIndex, bin.index, `Lower boundary ${valueAtLowerBoundary} belongs to interval ${bin.index}`);
        const expectedCount = heatmap.countsByPlanYear.reduce((sum, row) => sum + row[bin.index], 0);
        assertEqual(bin.observationCount.total, expectedCount, `Heatmap interval ${bin.index} carries its exact count`);
    }
    const unit = resultV2.unitContract;
    assertEqual(unit.withdrawalRateHeatmap.basisField, 'realizedWithdrawalRatePct', 'Heatmap names the realized-rate basis');
    assertEqual(unit.withdrawalRateHeatmap.thresholdPct, 4.5, 'Heatmap contract fixes the 4.5 percent reporting reference');
    assertEqual(unit.withdrawalRateHeatmap.comparison, 'greater_than_or_equal_at_bin_resolution', 'Heatmap overlay uses bin-resolution >=');
    assertEqual(unit.timeShareRealizedWithdrawalRateAbove45Ratio.comparison, 'strictly_greater_than', 'Time-share KPI retains strict >');
    assertEqual(unit.withdrawalRateHeatmap.thresholdRole, 'reporting_reference_not_guardrail_trigger', 'Threshold is not presented as a guardrail trigger');
    assertEqual(4.5 > unit.timeShareRealizedWithdrawalRateAbove45Ratio.thresholdPct, false, 'Exactly 4.5 is excluded from the strict KPI');
    assertEqual(heatmap.bins.find(bin => bin.lowerBoundPct === 4.5)?.index, 4, 'Exactly 4.5 starts the heatmap overlay interval');
    assertEqual(resultV2.kpis.timeShareRealizedWithdrawalRateAbove45Ratio, result.kpis.timeShareWithdrawalRateAbove45Ratio,
        'Ratio KPI is renamed without a factor change');
    assertEqual(unit.ratioFieldSuffix, 'Ratio', 'Ratios have an explicit suffix');
    assertEqual(unit.percentagePointFieldSuffix, 'Pct', 'Percentage points have an explicit suffix');

    const assertIntegerLeaves = (value, label) => {
        assert(value && typeof value === 'object' && !Array.isArray(value), `${label} is a JSON object`);
        let leaves = 0;
        const visit = node => {
            for (const child of Object.values(node)) {
                if (child && typeof child === 'object' && !Array.isArray(child)) visit(child);
                else {
                    assert(Number.isSafeInteger(child) && child >= 0, `${label} contains only non-negative integer leaves`);
                    leaves++;
                }
            }
        };
        visit(value);
        assert(leaves > 0, `${label} is not an empty object lost from a Map`);
    };
    assertIntegerLeaves(resultV2.kpis.realWithdrawalP10RealEur.observationCount, 'Withdrawal observationCount');
    assertIntegerLeaves(resultV2.kpis.maximumDrawdownRealPct.observationCount, 'Real drawdown observationCount');
    assertIntegerLeaves(heatmap.observationCount, 'Heatmap observationCount');

    const v2Roundtrip = readMonteCarloExport(serializeMonteCarloExportV2(documentV2));
    assertEqual(v2Roundtrip.document.schemaVersion, MONTE_CARLO_EXPORT_V2_VERSION, 'Version dispatcher reads V2');
    assertEqual(v2Roundtrip.compatibilityWarnings.length, 0, 'V2 read has no legacy warning');
    const v1Dispatch = readMonteCarloExport(serializeMonteCarloExportV1(document));
    assert(v1Dispatch.compatibilityWarnings.some(warning => warning.code === 'monte_carlo_v1_legacy_bin_and_unit_semantics'),
        'Version dispatcher visibly warns about V1 bin and unit semantics');
    const unknownDispatchError = expectThrow(
        () => readMonteCarloExport({ schemaVersion: 'MonteCarloExportV999' }),
        'MC_EXPORT_VERSION_UNSUPPORTED',
        'dispatcher rejects unknown Monte Carlo versions'
    );
    assert(unknownDispatchError.message.startsWith('MonteCarloExportV2:'),
        'Current dispatcher errors use the explicit V2 context');
}

{
    for (const accepted of [0, 34.25, 100]) {
        const candidate = clone(resultV2);
        candidate.kpis.maximumDrawdownNominalPct.p50 = accepted;
        candidate.kpis.maximumDrawdownRealPct.p50 = accepted;
        validateMonteCarloRunResultV2(candidate);
        assertEqual(candidate.kpis.maximumDrawdownRealPct.p50, accepted, `Drawdown ${accepted} is preserved without repair`);
    }
    for (const rejected of [-0.01, -34.25, 100.01, Number.NaN, Number.POSITIVE_INFINITY]) {
        const candidate = clone(resultV2);
        candidate.kpis.maximumDrawdownRealPct.p50 = rejected;
        expectThrow(
            () => validateMonteCarloRunResultV2(candidate),
            'MC_RESULT_V2_DRAWDOWN_DOMAIN_INVALID',
            `real drawdown ${String(rejected)} fails closed`
        );
    }
    const projectorMustNotRepair = clone(result);
    projectorMustNotRepair.kpis.maximumDrawdownPct.p50 = -34.25;
    expectThrow(
        () => projectMonteCarloRunResultV2(projectorMustNotRepair),
        'MC_RESULT_V2_DRAWDOWN_DOMAIN_INVALID',
        'V2 projector does not apply absolute value to a signed drawdown'
    );
    const mapObservationCount = clone(resultV2);
    mapObservationCount.kpis.realWithdrawalP10RealEur.observationCount = new Map([['years', 3]]);
    expectThrow(
        () => validateMonteCarloRunResultV2(mapObservationCount),
        'MC_RESULT_V2_OBSERVATION_COUNT_EMPTY',
        'Map observationCount cannot disappear into an empty JSON object'
    );
    const wrongHeatmapBoundary = clone(resultV2);
    wrongHeatmapBoundary.diagnostics.withdrawalRateHeatmap.bins[4].lowerBoundPct = 4.4;
    expectThrow(
        () => validateMonteCarloRunResultV2(wrongHeatmapBoundary),
        'MC_RESULT_V2_HEATMAP_INTERVAL_INVALID',
        'V2 reader rejects a shifted heatmap interval'
    );
    const wrongDrawdownUnit = clone(resultV2);
    wrongDrawdownUnit.unitContract.drawdowns.maximumDrawdownRealPct.priceBasis = 'nominal';
    const wrongDrawdownUnitError = expectThrow(
        () => validateMonteCarloRunResultV2(wrongDrawdownUnit),
        'MC_RESULT_V2_UNIT_CONTRACT_INVALID',
        'V2 reader rejects mutated real-drawdown unit semantics'
    );
    assert(wrongDrawdownUnitError.message.startsWith('MonteCarloRunResultV2:'),
        'V2 result errors retain their explicit V2 contract context');
}

{
    const financialRow = {
        recordType: 'financial_year',
        financiallyEvaluable: true,
        jahr: 1,
        RealReturnEquityPct: 0.08,
        RealReturnGoldPct: -0.03,
        NominalReturnEquityPct: 0.10,
        NominalReturnGoldPct: -0.01,
        entnahmequote: 0.045,
        QuoteEndPct: 4.25,
        minimumFlexAnnual: 1200,
        minimumFlexEffectiveAfter: 800,
        minimumFlexEffectiveFinal: 650,
        entscheidung: {
            note: 'A;"B"\r\nC',
            details: {
                minimumFlexEffectiveFinal: 775,
                retainedDiagnostic: 'kept'
            }
        }
    };
    const terminalRow = {
        recordType: 'terminal_death',
        financiallyEvaluable: false,
        jahr: 2,
        terminalOnlyNote: 'Ende;"jetzt"\r\nzweite Zeile',
        RealReturnEquityPct: 0,
        RealReturnGoldPct: 0,
        NominalReturnEquityPct: 0,
        NominalReturnGoldPct: 0,
        entnahmequote: 0,
        QuoteEndPct: 0,
        minimumFlexAnnual: 0,
        minimumFlexEffectiveAfter: 0,
        minimumFlexEffectiveFinal: 0
    };
    const scenario = projectScenarioLogV2([financialRow, terminalRow]);
    assertEqual(scenario.schemaVersion, 'ScenarioLogExportV2', 'Scenario JSON uses a V2 envelope');
    assertEqual(scenario.unitContract.schemaVersion, 'ScenarioLogUnitContractV2', 'Scenario unit contract is versioned');
    assertEqual(scenario.records[0].realReturnEquityRatio, 0.08, 'Return ratio is renamed without scaling');
    assertEqual(scenario.records[0].realizedWithdrawalRatePct, 4.5, 'Realized withdrawal ratio is converted to percentage points');
    assertEqual(scenario.records[0].preDecisionWithdrawalRatePct, 4.25, 'Pre-decision percentage points are not scaled twice');
    assertEqual(scenario.records[0].minimumFlexPolicyEffectiveAnnualEur, 775,
        'Policy minimum flex comes from the post-policy planning value rather than the earlier minimum-flex step');
    assertEqual(scenario.records[0].minimumFlexFulfilledAnnualEur, 650, 'Fulfilled minimum flex has its own V2 field');
    assertEqual(scenario.records[0].entscheidung.details.retainedDiagnostic, 'kept',
        'Unrelated decision diagnostics remain available');
    assert(!Object.hasOwn(scenario.records[0].entscheidung.details, 'minimumFlexEffectiveFinal'),
        'Ambiguous nested minimumFlexEffectiveFinal is removed from V2');
    assert(scenario.unitContract.percentagePointFields.preDecisionWithdrawalRatePct.description.includes('Vorjahres-Flexrate'),
        'Pre-decision rate contract names the previous-year flex rate');
    assert(scenario.unitContract.percentagePointFields.preDecisionWithdrawalRatePct.description.includes('vor Transaktions- und Auszahlungsphase'),
        'Pre-decision rate contract names the measurement phase');
    assert(scenario.unitContract.percentagePointFields.preDecisionWithdrawalRatePct.description.includes('ohne Liquiditaet und Health-Bucket'),
        'Pre-decision rate contract names the denominator scope');
    assertEqual(scenario.records[1].financiallyEvaluable, false, 'Terminal record is not financially evaluable');
    assertEqual(scenario.records[1].realizedWithdrawalRatePct, null, 'Terminal rate is null instead of a synthetic zero');
    assertEqual(scenario.records[1].minimumFlexFulfilledAnnualEur, null, 'Terminal minimum-flex fulfillment is null');
    assertEqual(scenario.records[1].measurementMissingness.withdrawalRates.reason, 'not_applicable_terminal_record',
        'Terminal measurements carry a stable non-applicability reason');
    assertEqual(scenario.records[1].measurementMissingness.withdrawalRates.observationCount.observations, 0,
        'Terminal measurements carry an explicit zero observation count');

    const accumulationScenario = projectScenarioLogV2([{
        ...financialRow,
        Regime: 'accumulation',
        entnahmequote: 0,
        QuoteEndPct: 0
    }]);
    const accumulationRecord = accumulationScenario.records[0];
    assertEqual(accumulationRecord.realizedWithdrawalRatePct, null,
        'Accumulation placeholder withdrawal ratio is not exported as an observed zero');
    assertEqual(accumulationRecord.preDecisionWithdrawalRatePct, null,
        'Accumulation placeholder pre-decision rate is not exported as an observed zero');
    assertEqual(accumulationRecord.minimumFlexPolicyEffectiveAnnualEur, null,
        'Minimum-flex policy measurement is not applicable during accumulation');
    assertEqual(accumulationRecord.measurementMissingness.withdrawalRates.reason, 'not_applicable_accumulation_year',
        'Accumulation withdrawal rates carry a stable non-applicability reason');
    assertEqual(accumulationRecord.measurementMissingness.withdrawalRates.observationCount.observations, 0,
        'Accumulation withdrawal rates carry zero observations');
    assertEqual(accumulationRecord.measurementMissingness.minimumFlex.reason, 'not_applicable_accumulation_year',
        'Accumulation minimum-flex measurements carry their non-applicability reason');
    assertEqual(accumulationRecord.realReturnEquityRatio, 0.08,
        'Actual accumulation-year market returns remain financially observable');
    const fabricatedAccumulationZero = clone(accumulationScenario);
    fabricatedAccumulationZero.records[0].realizedWithdrawalRatePct = 0;
    expectThrow(
        () => readScenarioLogExport(fabricatedAccumulationZero),
        'SCENARIO_LOG_ACCUMULATION_MISSINGNESS_INVALID',
        'Scenario reader rejects fabricated observed withdrawal zero during accumulation'
    );

    const json = serializeScenarioLogExportV2(scenario);
    assertEqual(JSON.parse(json).records.length, 2, 'Scenario JSON roundtrip preserves every record');
    const csv = serializeScenarioLogCsvV2(scenario);
    const [header] = csv.split('\r\n');
    const headers = header.split(';');
    assertEqual(JSON.stringify(headers), JSON.stringify([...headers].sort()), 'Scenario CSV header is deterministically sorted');
    assert(headers.includes('terminalOnlyNote'), 'Scenario CSV union header retains terminal-only fields');
    assert(headers.includes('scenarioLogSchemaVersion'), 'Every CSV row exposes the scenario contract version');
    assert(headers.includes('unitContractVersion'), 'Every CSV row exposes the unit contract version');
    assertEqual((csv.match(/ScenarioLogExportV2/g) || []).length, 2, 'Scenario CSV contains every projected record');
    assert(csv.includes('""jetzt""'), 'Scenario CSV doubles quotes inside quoted cells');
    assert(csv.includes('""note"":') && csv.includes('A;') && csv.includes('\\r\\nC'),
        'Nested object cells use canonical JSON and CSV quoting');

    const legacyRead = readScenarioLogExport(JSON.stringify([financialRow]));
    const warningCodes = legacyRead.compatibilityWarnings.map(warning => warning.code);
    for (const code of [
        'scenario_log_v1_unversioned',
        'legacy_ratio_field_names',
        'legacy_withdrawal_rate_ambiguity',
        'legacy_terminal_rows_untyped',
        'legacy_minimum_flex_name_collision'
    ]) assert(warningCodes.includes(code), `Legacy scenario reader emits ${code}`);
    assertEqual(readScenarioLogExport(json).compatibilityWarnings.length, 0, 'Scenario dispatcher reads V2 without legacy warnings');
    const wrongScenarioUnit = clone(scenario);
    wrongScenarioUnit.unitContract.percentagePointFields.preDecisionWithdrawalRatePct.measurementTime = 'after_payout';
    expectThrow(
        () => readScenarioLogExport(wrongScenarioUnit),
        'SCENARIO_LOG_UNIT_CONTRACT_INVALID',
        'Scenario V2 reader rejects mutated measurement timing'
    );
    const wrongScenarioMissingness = clone(scenario);
    wrongScenarioMissingness.records[0].measurementMissingness.withdrawalRates.observationCount.observations = 0;
    expectThrow(
        () => readScenarioLogExport(wrongScenarioMissingness),
        'SCENARIO_LOG_MISSINGNESS_INVALID',
        'Scenario V2 reader rejects observation counts inconsistent with projected values'
    );
    expectThrow(
        () => readScenarioLogExport({ schemaVersion: 'ScenarioLogExportV999', records: [] }),
        'SCENARIO_LOG_VERSION_UNSUPPORTED',
        'Scenario dispatcher rejects unknown object versions'
    );
    expectThrow(
        () => projectScenarioLogV2([{ ...terminalRow, recordType: 'unknown_terminal' }]),
        'SCENARIO_LOG_RECORD_TYPE_INVALID',
        'Scenario projector never infers record type from localized text'
    );

    const upperDurationRows = Array.from({ length: 46 }, (_, index) => ({
        ...financialRow,
        jahr: index + 1
    }));
    const upperDurationExport = projectScenarioLogV2(upperDurationRows);
    assertEqual(JSON.parse(serializeScenarioLogExportV2(upperDurationExport)).records.length, 46,
        'Upper valid age-65 duration retains every JSON record');
    assertEqual((serializeScenarioLogCsvV2(upperDurationExport).match(/ScenarioLogExportV2/g) || []).length, 46,
        'Upper valid age-65 duration retains every CSV record');
}

{
    const runtimeRows = firstRun.worstRun?.logDataRows || [];
    assert(runtimeRows.length > 0, 'Deterministic Monte Carlo run materializes a selected scenario path');
    assert(runtimeRows.every(row => ['financial_year', 'terminal_ruin', 'terminal_death'].includes(row.recordType)),
        'Every runtime scenario row is typed by its builder');
    const runtimeScenarioV2 = projectScenarioLogV2(runtimeRows);
    assertEqual(runtimeScenarioV2.records.length, runtimeRows.length,
        'V2 scenario projector accepts and preserves the actual selected runtime path');
    const policySourceIndex = runtimeRows.findIndex(row => (
        row.recordType === 'financial_year'
        && Number.isFinite(row.entscheidung?.details?.minimumFlexEffectiveFinal)
    ));
    assert(policySourceIndex >= 0, 'Actual runtime path exposes a post-policy minimum-flex planning value');
    assertEqual(
        runtimeScenarioV2.records[policySourceIndex].minimumFlexPolicyEffectiveAnnualEur,
        runtimeRows[policySourceIndex].entscheidung.details.minimumFlexEffectiveFinal,
        'Actual runtime V2 projection uses the post-policy value as its policy measurement'
    );
    assert(!Object.hasOwn(runtimeScenarioV2.records[policySourceIndex].entscheidung.details, 'minimumFlexEffectiveFinal'),
        'Actual runtime V2 record removes the ambiguous nested legacy name');
}

{
    const wrongExportVersion = clone(document);
    wrongExportVersion.schemaVersion = 'MonteCarloExportV2';
    const v1VersionError = expectThrow(
        () => readMonteCarloExportV1(wrongExportVersion),
        'MC_EXPORT_VERSION_UNSUPPORTED',
        'unknown export version'
    );
    assert(v1VersionError.message.startsWith('MonteCarloExportV1:'),
        'Explicit V1 reader retains the historical V1 error context');

    const wrongRequestVersion = clone(request);
    wrongRequestVersion.schemaVersion = 'MonteCarloRunRequestV2';
    expectThrow(() => validateMonteCarloRunRequestV1(wrongRequestVersion), 'MC_REQUEST_VERSION_UNSUPPORTED', 'unknown request version');

    const wrongResultVersion = clone(result);
    wrongResultVersion.schemaVersion = 'MonteCarloRunResultV2';
    expectThrow(() => validateMonteCarloRunResultV1(wrongResultVersion), 'MC_RESULT_VERSION_UNSUPPORTED', 'unknown result version');

    const missingResultField = clone(result);
    delete missingResultField.outcomeInventory;
    expectThrow(() => validateMonteCarloRunResultV1(missingResultField), 'MC_CONTRACT_REQUIRED_OBJECT', 'missing result field');

    expectThrow(
        () => createMonteCarloRunRequestV1({
            inputs: { ...inputs, invalidNumber: Number.NaN },
            widowOptions,
            monteCarloParams,
            samplingDiagnostics: firstRun.samplingDiagnostics,
            dataVersion: getDataVersion(),
            execution
        }),
        'MC_EXPORT_NON_FINITE_NUMBER',
        'NaN request input'
    );
    expectThrow(
        () => createMonteCarloRunRequestV1({
            inputs: { ...inputs, invalidNumber: Number.POSITIVE_INFINITY },
            widowOptions,
            monteCarloParams,
            samplingDiagnostics: firstRun.samplingDiagnostics,
            dataVersion: getDataVersion(),
            execution
        }),
        'MC_EXPORT_NON_FINITE_NUMBER',
        'Infinity request input'
    );
    expectThrow(
        () => createMonteCarloRunRequestV1({
            inputs: { ...inputs, privateNote: 'C:\\Users\\Someone\\private\\scenario.json' },
            widowOptions,
            monteCarloParams,
            samplingDiagnostics: firstRun.samplingDiagnostics,
            dataVersion: getDataVersion(),
            execution
        }),
        'MC_EXPORT_LOCAL_PATH_FORBIDDEN',
        'local path request input'
    );
    expectThrow(
        () => createMonteCarloRunRequestV1({
            inputs: { ...inputs, apiToken: 'must-not-export' },
            widowOptions,
            monteCarloParams,
            samplingDiagnostics: firstRun.samplingDiagnostics,
            dataVersion: getDataVersion(),
            execution
        }),
        'MC_EXPORT_PRIVATE_KEY_FORBIDDEN',
        'secret request key'
    );
}

{
    const workerRequest = createMonteCarloRunRequestV1({
        inputs,
        widowOptions,
        monteCarloParams,
        useCapeSampling: false,
        samplingDiagnostics: firstRun.samplingDiagnostics,
        dataVersion: getDataVersion(),
        execution: {
            mode: 'worker',
            workerCount: 4,
            timeBudgetMs: 500,
            compareModeRequested: true,
            chunkConfiguration: {
                minChunkRuns: 10,
                baseTimeoutMs: 5000,
                stallTimeoutMs: 20000
            }
        },
        scenarioKey
    });
    assertEqual(workerRequest.execution.mode, 'worker', 'worker request records the actual execution mode');
    assertEqual(workerRequest.execution.workerCount, 4, 'worker request records the actual worker count');
    assertEqual(workerRequest.execution.timeBudgetMs, 500, 'worker request records the job budget');
    assertEqual(workerRequest.execution.chunkConfiguration.minChunkRuns, 10, 'worker request records the adaptive chunk floor');
    assertEqual(workerRequest.execution.compareModeRequested, true, 'worker request records a requested compare run');
}

{
    const legacy = clone(document);
    legacy.result.kpis.extraKPI = { consumptionAtRiskP10Real: 1234 };
    const telemetry = [];
    const read = readMonteCarloExportV1(legacy, {
        verifyFingerprint: false,
        onTelemetry: event => telemetry.push(event)
    });
    assertEqual(MONTE_CARLO_LEGACY_READ_ALIASES.length, 0, 'Slice 11 removes every time-boxed V1 read alias');
    assertEqual(read.compatibility.deprecatedAliases.length, 0, 'reader no longer inventories a removed KPI alias');
    assert(!telemetry.some(event => event.event === 'monte_carlo_deprecated_alias_read'), 'removed aliases no longer emit read telemetry');
    assertEqual(document.compatibility.deprecatedReadAliases.length, 0, 'new exports publish an empty deprecated-alias registry');
}

{
    const technicalAggregate = {
        ...clone(firstRun.aggregatedResults),
        batchStatus: 'technical_error',
        financialMetricsValid: false,
        outcomeInventory: {
            ...clone(firstRun.aggregatedResults.outcomeInventory),
            ruin: 0,
            all_dead: 0,
            horizon_exhausted: 7,
            technical_error: 1,
            requestedRuns: 8,
            floorCoveragePct: null,
            floorCoverageEstimate: null
        },
        technicalInventory: {
            requested: 8,
            financiallyEvaluable: 7,
            technicalError: 1,
            errors: [{
                runIndex: 7,
                simulationYearIndex: 1,
                code: 'FIXTURE_TECHNICAL_ERROR',
                message: 'Fehler in C:\\Users\\Someone\\private\\runner.js:42'
            }]
        }
    };
    const technicalResult = createMonteCarloRunResultV1({
        aggregatedResults: technicalAggregate,
        samplingDiagnostics: firstRun.samplingDiagnostics,
        executionDiagnostics: execution,
        requestedRuns: 8
    });
    assertEqual(technicalResult.technicalErrorCount, 1, 'technical result exposes technical error count');
    assertEqual(technicalResult.financialMetricsValid, false, 'technical result marks financial metrics invalid');
    assert(technicalResult.diagnostics.technicalErrors[0].message.includes('[lokaler Pfad entfernt]'), 'technical diagnostics redact local paths');
    assert(technicalResult.warnings.some(warning => warning.code === 'technical_errors_present'), 'technical result carries a fail-closed warning');
}

{
    const replayArgs = extractMonteCarloReplayArgsV1(request);
    const replayRun = await runMonteCarloSimulation({
        inputs: replayArgs.inputs,
        widowOptions: replayArgs.widowOptions,
        monteCarloParams: replayArgs.monteCarloParams,
        useCapeSampling: replayArgs.useCapeSampling,
        engine: EngineAPI
    });
    const replayResult = createMonteCarloRunResultV1({
        aggregatedResults: replayRun.aggregatedResults,
        samplingDiagnostics: replayRun.samplingDiagnostics,
        executionDiagnostics: replayArgs.execution,
        requestedRuns: replayArgs.monteCarloParams.anzahl
    });
    assertEqual(JSON.stringify(replayResult.outcomeInventory), JSON.stringify(result.outcomeInventory), 'deterministic replay exactly matches discrete outcomes');
    assertEqual(JSON.stringify(replayResult.kpis), JSON.stringify(result.kpis), 'deterministic replay exactly matches finite KPI values in the same runtime');
    assertEqual(JSON.stringify(replayResult.diagnostics.sampling), JSON.stringify(result.diagnostics.sampling), 'deterministic replay exactly matches sampling diagnostics');
}

{
    const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    const tauriConfig = JSON.parse(fs.readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
    assertEqual(MONTE_CARLO_APP_VERSION.packageVersion, packageJson.version, 'export package version stays synchronized with package.json');
    assertEqual(MONTE_CARLO_APP_VERSION.desktopBundleVersion, tauriConfig.version, 'export desktop version stays synchronized with tauri.conf.json');
}

{
    const download = createMonteCarloExportDownload({ request, result, engine, exportedAt });
    assert(/^monte-carlo-[a-f0-9]{12}-2026-07-22T12-34-56-789Z\.json$/.test(download.filename), 'download filename is unique and filesystem-safe');
    assertEqual(download.mimeType, 'application/json', 'download uses the JSON MIME type');

    let capturedBlob = null;
    let clicked = 0;
    let revoked = 0;
    const anchor = {
        href: '',
        download: '',
        click() { clicked++; },
        remove() {}
    };
    const filename = triggerMonteCarloDownload(download, {
        documentRef: {
            createElement: () => anchor,
            body: { appendChild() {} }
        },
        urlApi: {
            createObjectURL(blob) {
                capturedBlob = blob;
                return 'blob:monte-carlo-export';
            },
            revokeObjectURL() { revoked++; }
        },
        BlobCtor: Blob
    });
    assertEqual(filename, download.filename, 'explicit UI action reports the downloaded filename');
    assertEqual(clicked, 1, 'explicit UI action triggers exactly one browser download');
    assertEqual(revoked, 1, 'browser download revokes its object URL');
    assertEqual(JSON.parse(await capturedBlob.text()).schemaVersion, MONTE_CARLO_EXPORT_V2_VERSION, 'browser download contains the current V2 document');
}

{
    const download = createMonteCarloExportDownload({ request, result, engine, exportedAt });
    const previousDocument = globalThis.document;
    const previousUrl = globalThis.URL;
    let clicked = 0;
    const elements = Object.fromEntries([
        'mcButton',
        'mc-progress-bar-container',
        'mc-progress-bar',
        'mcRunExportActions',
        'exportMonteCarloRunJson',
        'mcRunExportStatus'
    ].map(id => [id, { id, style: {}, hidden: false, disabled: false, onclick: null, textContent: '' }]));
    try {
        globalThis.document = {
            getElementById: id => elements[id] || null,
            createElement: () => ({
                href: '',
                download: '',
                click() { clicked++; },
                remove() {}
            }),
            body: { appendChild() {} }
        };
        globalThis.URL = {
            createObjectURL: () => 'blob:ui-contract',
            revokeObjectURL() {}
        };
        const ui = createMonteCarloUI();
        ui.clearRunExport();
        assertEqual(elements.mcRunExportActions.hidden, true, 'new run clears the previous export action');
        assertEqual(elements.exportMonteCarloRunJson.disabled, true, 'new run disables the previous export button');
        assertEqual(ui.publishRunExport(download), true, 'completed run publishes the versioned export action');
        assertEqual(elements.mcRunExportActions.hidden, false, 'published export action becomes visible');
        assertEqual(elements.exportMonteCarloRunJson.disabled, false, 'published export button becomes enabled');
        elements.exportMonteCarloRunJson.onclick();
        assertEqual(clicked, 1, 'published export remains user-triggered and downloads once');
        assert(elements.mcRunExportStatus.textContent.includes(download.filename), 'UI status names the downloaded safe filename');
    } finally {
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
        if (previousUrl === undefined) delete globalThis.URL;
        else globalThis.URL = previousUrl;
    }
}

console.log('✅ Monte Carlo export contract tests passed');
