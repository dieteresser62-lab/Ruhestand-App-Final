import {
    buildHistoricalBacktestRawExport,
    captureHistoricalBacktestEngineProvenance,
    createHistoricalBacktestDownload,
    HISTORICAL_BACKTEST_CSV_COLUMNS,
    HISTORICAL_BACKTEST_CSV_CONTRACT,
    HISTORICAL_BACKTEST_EXPORT_SCHEMA_ID,
    HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION,
    serializeHistoricalBacktestCsv,
    serializeHistoricalBacktestJson
} from '../app/simulator/historical-backtest-export.js';
import { exportBacktestLogData } from '../app/simulator/simulator-backtest.js';
import { canonicalizeHistoricalContractValue } from '../app/simulator/historical-backtest-contract.js';

console.log('--- Historical Backtest Export Tests ---');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function baseResult(outcomeKind = 'completed') {
    const technicalError = outcomeKind === 'technical_error'
        ? {
            code: 'SIMULATOR_ADAPTER_EXCEPTION',
            message: 'Technischer Fehler ohne lokalen Pfad',
            stack: 'C:\\Users\\Someone\\private\\simulator.js:42'
        }
        : null;
    return {
        schemaVersion: 'BacktestRunResultV1',
        request: {
            schemaVersion: 'BacktestRequestV1',
            startYear: 2000,
            endYear: 2001,
            executionMode: 'single_path',
            breakOnRuin: true,
            temporalConventionId: 'realized_t_decision_t_minus_1_v1',
            dataset: {
                datasetId: 'fixture-dataset',
                revision: 'fixture-r1',
                contentHash: 'a'.repeat(64),
                manifestSchemaVersion: 'HistoricalDataManifestV1',
                manifestHash: { algorithm: 'sha256-canonical-json-v1', value: 'b'.repeat(64) }
            },
            engine: {
                apiVersion: '31.0',
                buildId: 'fixture-build',
                configFingerprint: { algorithm: 'sha256-canonical-json-v1', value: 'c'.repeat(64) }
            },
            inputs: {
                startFloorBedarf: 24000,
                nested: { enabled: true }
            }
        },
        outcome: technicalError
            ? { kind: outcomeKind, error: technicalError, lastCompletedYear: 2000 }
            : { kind: outcomeKind, lastCompletedYear: 2001, ...(outcomeKind === 'ruin' ? { ruinYear: 2001 } : {}) },
        warnings: [{ code: 'FIXTURE_WARNING', message: 'Warnung', stack: 'must-not-export' }],
        error: technicalError,
        requestedYears: 2,
        completedYears: outcomeKind === 'completed' ? 2 : 1,
        firstYear: 2000,
        lastCompletedYear: outcomeKind === 'completed' ? 2001 : 2000,
        ruinYear: outcomeKind === 'ruin' ? 2001 : null,
        breakOnRuin: true,
        dataStatus: outcomeKind === 'incomplete' ? 'incomplete' : 'complete',
        incompleteReason: outcomeKind === 'incomplete'
            ? { code: 'HISTORICAL_PERIOD_MISSING_YEAR', year: 2001 }
            : null,
        portfolioStart: 100000,
        portfolioEnd: 90234.56,
        portfolioSnapshots: {
            start: { depotTranchesAktien: [{ marketValue: 80000 }], liquiditaet: 20000 },
            end: { depotTranchesAktien: [{ marketValue: 70000 }], liquiditaet: 20234.56 }
        },
        historicalYearRecords: [{
            schemaVersion: 'HistoricalYearRecordV1',
            simulationYear: 2000,
            temporalConventionId: 'realized_t_decision_t_minus_1_v1',
            realized: {
                equityReturn: { value: -0.125, unit: 'ratio', sourceYear: 2000 },
                goldReturn: { value: 4.5, unit: 'percent_per_year', sourceYear: 2000 },
                cashBondReturn: { value: 2.25, unit: 'percent_per_year', sourceYear: 2000 },
                inflation: { value: 1.75, unit: 'percent_per_year', sourceYear: 2000 },
                wagePensionAdjustment: { value: 2, unit: 'percent_per_year', sourceYear: 2000 }
            },
            decisionAsOf: { capeRatio: { value: 21.5, unit: 'ratio', asOfYear: 1999 } }
        }],
        rows: outcomeKind === 'incomplete' || outcomeKind === 'technical_error' ? [] : [{
            jahr: 2000,
            entscheidung: { jahresEntnahme: 12345.67, kuerzungProzent: 10 },
            row: {
                aktionUndGrund: '=CMD("quoted";\nnext)',
                CutReason: '+unsafe',
                minimumFlexStatus: '-unsafe',
                floor_brutto: 24000,
                renteSum: 12000,
                flex_erfuellt_nominal: 3456.78,
                minimumFlexAnnual: 3000,
                portfolio_total_end: 90234.56,
                steuern_gesamt: 456.78,
                lossCarryEnd: 12.34,
                floor_shortfall_nominal: outcomeKind === 'ruin' ? 1234.5 : 0
            },
            wertAktien: 70000,
            wertGold: 0,
            liquiditaet: 20234.56,
            netA: -1000,
            netG: 0
        }],
        metrics: {
            schemaVersion: 'HistoricalBacktestMetricsV1',
            values: {
                wealth_start_nominal_eur: 100000,
                wealth_end_nominal_eur: 90234.56,
                tax_total_nominal_eur: 456.78
            }
        },
        summary: {
            startWealth: 100000,
            endWealth: 90234.56,
            totalTaxes: 456.78,
            metrics: {
                wealth_start_nominal_eur: 100000,
                wealth_end_nominal_eur: 90234.56,
                tax_total_nominal_eur: 456.78
            }
        },
        diagnostics: {
            cause: new Error('C:\\Users\\Someone\\private\\data.json'),
            localPath: 'C:\\Users\\Someone\\private\\data.json'
        }
    };
}

{
    const result = baseResult();
    const raw = buildHistoricalBacktestRawExport(result, { exportedAt: '2026-07-19T10:00:00.000Z' });
    assertEqual(raw.schemaId, HISTORICAL_BACKTEST_EXPORT_SCHEMA_ID, 'raw JSON uses the stable schema id');
    assertEqual(raw.schemaVersion, HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION, 'raw JSON uses the V1 export schema');
    assert(raw.identifiers.requestId.startsWith('btrq_'), 'raw JSON exposes a request id');
    assert(raw.identifiers.runId.startsWith('btrun_'), 'raw JSON exposes a run id');
    assertEqual(raw.request.executionMode, 'single_path', 'raw JSON retains the execution mode');
    assertEqual(raw.request.breakOnRuin, true, 'raw JSON retains breakOnRuin');
    assertEqual(raw.result.completedYears, 2, 'raw JSON retains completion semantics');
    assertEqual(raw.result.provenance.dataset.manifestSchemaVersion, 'HistoricalDataManifestV1', 'raw JSON retains manifest provenance');
    assertEqual(raw.result.provenance.engine.buildId, 'fixture-build', 'raw JSON retains the engine build id');
    assertEqual(raw.result.portfolioSnapshots.end.liquiditaet, 20234.56, 'raw JSON retains canonical portfolio snapshots');
    assertEqual(raw.result.metrics.values.wealth_end_nominal_eur, result.metrics.values.wealth_end_nominal_eur, 'export consumes the canonical metric raw value');
    assertEqual(raw.result.summary.metrics.wealth_end_nominal_eur, raw.result.metrics.values.wealth_end_nominal_eur, 'raw metric and summary projection reconcile');
    assert(typeof raw.result.metrics.values.wealth_end_nominal_eur === 'number', 'JSON financial values remain numbers');
    assert(Object.isFrozen(raw) && Object.isFrozen(raw.result.rows), 'raw export document is immutable');

    const json = serializeHistoricalBacktestJson(result, { exportedAt: '2026-07-19T10:00:00.000Z' });
    assert(!json.includes('<span'), 'JSON does not contain display formatter HTML');
    assert(!json.includes('must-not-export'), 'JSON strips stack-like warning metadata');
    assert(!json.includes('C:\\\\Users'), 'JSON excludes internal diagnostics and local paths');
    assertEqual(
        canonicalizeHistoricalContractValue(JSON.parse(json)),
        canonicalizeHistoricalContractValue(raw),
        'JSON serialization roundtrips without changing the export document'
    );
}

{
    const result = baseResult();
    const first = buildHistoricalBacktestRawExport(result, { exportedAt: '2026-07-19T10:00:00.000Z' });
    const second = buildHistoricalBacktestRawExport(result, {
        exportedAt: '2026-07-20T12:30:00.000Z',
        detailLevel: 'detailed'
    });
    assertEqual(first.fingerprint.value, second.fingerprint.value, 'exportedAt and display detail do not change the result fingerprint');
    assertEqual(first.identifiers.runId, second.identifiers.runId, 'run id stays stable across export timestamps');
    assertEqual(JSON.stringify(first.result), JSON.stringify(second.result), 'display detail does not change the raw export scope');
    assert(first.exportedAt !== second.exportedAt, 'exportedAt remains export metadata');
    const reorderedInputs = baseResult();
    reorderedInputs.request.inputs = { nested: { enabled: true }, startFloorBedarf: 24000 };
    assertEqual(
        serializeHistoricalBacktestJson(result, { exportedAt: first.exportedAt }),
        serializeHistoricalBacktestJson(reorderedInputs, { exportedAt: first.exportedAt }),
        'canonical JSON bytes are stable across equivalent object key insertion order'
    );

    const changedConfig = baseResult();
    changedConfig.request.engine.configFingerprint.value = 'd'.repeat(64);
    const changedDataset = baseResult();
    changedDataset.request.dataset.contentHash = 'e'.repeat(64);
    const changedTemporal = baseResult();
    changedTemporal.request.temporalConventionId = 'different_temporal_v2';
    assert(first.fingerprint.value !== buildHistoricalBacktestRawExport(changedConfig, { exportedAt: first.exportedAt }).fingerprint.value, 'config changes alter the result fingerprint');
    assert(first.fingerprint.value !== buildHistoricalBacktestRawExport(changedDataset, { exportedAt: first.exportedAt }).fingerprint.value, 'dataset changes alter the result fingerprint');
    assert(first.fingerprint.value !== buildHistoricalBacktestRawExport(changedTemporal, { exportedAt: first.exportedAt }).fingerprint.value, 'temporal convention changes alter the result fingerprint');
    const withCohorts = buildHistoricalBacktestRawExport(result, {
        exportedAt: first.exportedAt,
        cohortInventory: { schemaVersion: 'HistoricalBacktestCohortsV1', inventory: { eligible: 2 } }
    });
    assertEqual(withCohorts.result.cohortInventory.inventory.eligible, 2, 'optional cohort inventory is exported without recalculation');
    assert(first.fingerprint.value !== withCohorts.fingerprint.value, 'optional cohort inventory participates in the result fingerprint');
    assertEqual(first.fingerprint.value, '1a9093fcbd28ff650c8079a7501ba4f534c3aea45bd13f5a96221335249a59b3', 'canonical fixture fingerprint remains golden');
}

{
    const result = baseResult();
    const csv = serializeHistoricalBacktestCsv(result);
    const lines = csv.split('\n');
    assertEqual(lines[0], HISTORICAL_BACKTEST_CSV_COLUMNS.map(column => column.id).join(';'), 'CSV uses stable technical headers');
    assert(lines[0].includes('portfolio_total_end_nominal_eur'), 'CSV headers expose units');
    assert(csv.includes('-0.125'), 'CSV retains raw signed ratios with a dot decimal separator');
    assert(csv.includes('12345.67'), 'CSV retains raw financial numbers without localized grouping');
    assert(csv.includes('"\'=CMD(""quoted"";'), 'CSV protects formula text and escapes delimiters and quotes');
    assert(csv.includes("'+unsafe") && csv.includes("'-unsafe"), 'CSV protects plus/minus formula prefixes');
    assert(!csv.includes('<span'), 'CSV never calls HTML display formatters');
    assertEqual(HISTORICAL_BACKTEST_CSV_CONTRACT.missingValue, '', 'CSV missing values use empty cells');
}

{
    for (const kind of ['completed', 'ruin', 'incomplete', 'technical_error']) {
        const raw = buildHistoricalBacktestRawExport(baseResult(kind), { exportedAt: '2026-07-19T10:00:00.000Z' });
        assertEqual(raw.result.outcome.kind, kind, `${kind} remains a distinct export outcome`);
        assert(serializeHistoricalBacktestCsv(baseResult(kind)).includes(`;${kind};`), `${kind} remains visible in the CSV outcome column`);
        if (kind === 'technical_error') {
            assertEqual(raw.result.error.code, 'SIMULATOR_ADAPTER_EXCEPTION', 'technical export retains the stable error code');
            assert(!JSON.stringify(raw).includes('simulator.js:42'), 'technical export omits the stack trace');
        }
    }
}

{
    const engineApi = {
        getVersion: () => ({ api: '31.0', build: 'build-1' }),
        getConfig: () => ({ z: 2, a: 1, upperBound: Infinity })
    };
    const first = captureHistoricalBacktestEngineProvenance(engineApi);
    const sameDifferentOrder = captureHistoricalBacktestEngineProvenance({
        getVersion: () => ({ api: '31.0', build: 'build-1' }),
        getConfig: () => ({ upperBound: Infinity, a: 1, z: 2 })
    });
    const changed = captureHistoricalBacktestEngineProvenance({
        ...engineApi,
        getConfig: () => ({ z: 3, a: 1, upperBound: Infinity })
    });
    assertEqual(first.configFingerprint.value, sameDifferentOrder.configFingerprint.value, 'config fingerprint is key-order independent');
    assert(first.configFingerprint.value !== changed.configFingerprint.value, 'config fingerprint detects config changes');
    assertEqual(first.buildId, 'build-1', 'engine provenance captures the build id');
}

{
    const download = createHistoricalBacktestDownload(baseResult(), 'json', { exportedAt: '2026-07-19T10:00:00.000Z' });
    assert(/^backtest-2000-2001-[a-f0-9]{12}-2026-07-19T10-00-00\.000Z\.json$/.test(download.filename), 'download filename carries period, fingerprint and timestamp');
    assertEqual(download.mimeType, 'application/json', 'JSON download uses the JSON MIME type');
    const csvDownload = createHistoricalBacktestDownload(baseResult(), 'csv', { exportedAt: '2026-07-19T10:00:00.000Z' });
    assert(csvDownload.filename.endsWith('.csv'), 'CSV download uses the CSV extension');
    assertEqual(csvDownload.fingerprint.value, download.fingerprint.value, 'JSON and CSV identify the same canonical run');
}

{
    const previous = {
        window: globalThis.window,
        document: globalThis.document,
        URL: globalThis.URL,
        alert: globalThis.alert,
        requestAnimationFrame: globalThis.requestAnimationFrame,
        setTimeout: globalThis.setTimeout
    };
    let clickCount = 0;
    let capturedBlob = null;
    const toastContainer = { appendChild() {} };
    try {
        globalThis.window = { globalBacktestData: { result: baseResult() } };
        globalThis.document = {
            getElementById: id => (id === 'toastContainer' ? toastContainer : null),
            createElement: tag => (tag === 'a'
                ? {
                    href: '',
                    download: '',
                    click() { clickCount++; }
                }
                : {
                    className: '',
                    textContent: '',
                    classList: { add() {}, remove() {} },
                    addEventListener() {},
                    remove() {}
                }),
            body: { appendChild() {}, removeChild() {} }
        };
        globalThis.URL = {
            createObjectURL(blob) {
                capturedBlob = blob;
                return 'blob:historical-backtest-export';
            },
            revokeObjectURL() {}
        };
        globalThis.alert = message => { throw new Error(`Unexpected alert: ${message}`); };
        globalThis.requestAnimationFrame = callback => callback();
        globalThis.setTimeout = () => 1;

        assertEqual(clickCount, 0, 'holding a canonical run does not trigger an automatic export');
        exportBacktestLogData('json');
        assertEqual(clickCount, 1, 'explicit JSON export action triggers exactly one download');
        const downloaded = JSON.parse(await capturedBlob.text());
        assertEqual(downloaded.schemaVersion, HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION, 'UI download uses the versioned raw serializer');
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete globalThis[key];
            else globalThis[key] = value;
        }
    }
}

console.log('✅ Historical backtest export tests passed');
