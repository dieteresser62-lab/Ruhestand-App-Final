import fs from 'node:fs';
import { EngineAPI } from '../engine/index.mjs';
import {
    MONTE_CARLO_RUN_REQUEST_VERSION,
    MONTE_CARLO_RUN_RESULT_VERSION,
    createMonteCarloRunRequestV1,
    createMonteCarloRunResultV1,
    extractMonteCarloReplayArgsV1,
    validateMonteCarloRunRequestV1,
    validateMonteCarloRunResultV1
} from '../app/simulator/monte-carlo-contracts.js';
import {
    MONTE_CARLO_APP_VERSION,
    MONTE_CARLO_EXPORT_SCHEMA_ID,
    MONTE_CARLO_EXPORT_VERSION,
    buildMonteCarloExportV1,
    captureMonteCarloEngineProvenance,
    createMonteCarloExportDownload,
    readMonteCarloExportV1,
    serializeMonteCarloExportV1
} from '../app/simulator/monte-carlo-export.js';
import { createMonteCarloUI, triggerMonteCarloDownload } from '../app/simulator/monte-carlo-ui.js';
import { runMonteCarloSimulation } from '../app/simulator/monte-carlo-runner.js';
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
const result = createMonteCarloRunResultV1({
    aggregatedResults: firstRun.aggregatedResults,
    samplingDiagnostics: firstRun.samplingDiagnostics,
    executionDiagnostics: execution,
    requestedRuns: monteCarloParams.anzahl
});
const engine = captureMonteCarloEngineProvenance(EngineAPI);
const exportedAt = '2026-07-22T12:34:56.789Z';
const document = buildMonteCarloExportV1({ request, result, engine, exportedAt });
const schemaGolden = JSON.parse(fs.readFileSync(
    new URL('./fixtures/monte-carlo-export-v1-schema.json', import.meta.url),
    'utf8'
));

{
    assertEqual(schemaGolden.schemaId, MONTE_CARLO_EXPORT_SCHEMA_ID, 'schema golden fixes the export schema id');
    assertEqual(schemaGolden.contracts.request, MONTE_CARLO_RUN_REQUEST_VERSION, 'schema golden fixes the request version');
    assertEqual(schemaGolden.contracts.result, MONTE_CARLO_RUN_RESULT_VERSION, 'schema golden fixes the result version');
    assertEqual(schemaGolden.contracts.export, MONTE_CARLO_EXPORT_VERSION, 'schema golden fixes the export version');
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
    assertEqual(request.scenario.schemaVersion, 'MonteCarloScenarioV1', 'request versions the scenario payload');
    assertEqual(request.scenario.normalizedInputs.startFloorBedarf, 24000, 'request carries only the normalized scenario used by the run');
    assert(/^[a-f0-9]{64}$/.test(request.scenario.fingerprint.value), 'scenario fingerprint is a SHA-256 hex value');
    assert(/^[a-f0-9]{64}$/.test(request.data.fingerprint.value), 'data fingerprint is a SHA-256 hex value');
    assertEqual(request.execution.chunkConfiguration.strategy, 'single-chunk-v1', 'request records the exact serial chunk policy');
    assertEqual(request.snapshotPolicy.currentReference, 'post-slice-07-v1', 'request identifies the versioned snapshot reference');
    assert(Object.isFrozen(request) && Object.isFrozen(request.scenario.normalizedInputs), 'request is deeply immutable');
    validateMonteCarloRunRequestV1(request);
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
    assertEqual(result.diagnostics.execution.mode, 'serial', 'result includes execution diagnostics');
    assert(!Object.hasOwn(result.kpis, 'kpiKuerzungsjahre'), 'new result does not write the deprecated cut-year alias');
    assert(!Object.hasOwn(result.kpis, 'extraKPI'), 'new result does not write the deprecated extraKPI alias container');
    assert(!Object.hasOwn(result.kpis, 'stressKPI'), 'new result does not write the deprecated stressKPI alias container');
    validateMonteCarloRunResultV1(result);
}

{
    assertEqual(document.schemaId, MONTE_CARLO_EXPORT_SCHEMA_ID, 'export uses the stable Monte-Carlo schema id');
    assertEqual(document.schemaVersion, MONTE_CARLO_EXPORT_VERSION, 'export uses the V1 schema');
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
    const wrongExportVersion = clone(document);
    wrongExportVersion.schemaVersion = 'MonteCarloExportV2';
    expectThrow(() => readMonteCarloExportV1(wrongExportVersion), 'MC_EXPORT_VERSION_UNSUPPORTED', 'unknown export version');

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
    assert(read.compatibility.deprecatedAliases.includes('result.kpis.extraKPI.consumptionAtRiskP10Real'), 'reader inventories a deprecated alias');
    assert(telemetry.some(event => event.event === 'monte_carlo_deprecated_alias_read'), 'deprecated alias read emits telemetry');
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
    assertEqual(JSON.parse(await capturedBlob.text()).schemaVersion, MONTE_CARLO_EXPORT_VERSION, 'browser download contains the versioned V1 document');
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
