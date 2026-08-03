import {
    buildHistoricalBacktestRawExport,
    captureHistoricalBacktestEngineProvenance,
    createHistoricalBacktestDownload,
    HISTORICAL_BACKTEST_CSV_COLUMNS,
    HISTORICAL_BACKTEST_CSV_CONTRACT,
    HISTORICAL_BACKTEST_CSV_SCHEMA_VERSION,
    HISTORICAL_BACKTEST_EXPORT_SCHEMA_ID,
    HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION,
    HISTORICAL_BACKTEST_INPUT_SEMANTICS_SCHEMA_VERSION,
    HISTORICAL_BACKTEST_PORTFOLIO_BOUNDARY_SCHEMA_VERSION,
    HISTORICAL_BACKTEST_QUANTIZATION_SCHEMA_VERSION,
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
                sourceCommit: 'd'.repeat(40),
                sourceTreeStatus: 'clean',
                sourceProvenanceProvider: 'test_fixture',
                configFingerprint: { algorithm: 'sha256-canonical-json-v1', value: 'c'.repeat(64) },
                quantizationContract: {
                    schemaVersion: HISTORICAL_BACKTEST_QUANTIZATION_SCHEMA_VERSION,
                    enabled: true,
                    transactionAnnualTiers: [
                        { index: 1, upperBoundExclusive: 10000, unbounded: false, step: 1000 },
                        { index: 2, upperBoundExclusive: null, unbounded: true, step: 25000 }
                    ],
                    withdrawalMonthlyTiers: [
                        { index: 1, upperBoundExclusive: 2000, unbounded: false, step: 50 },
                        { index: 2, upperBoundExclusive: null, unbounded: true, step: 250 }
                    ],
                    withdrawalRounding: {
                        phase: 'after_floor_plus_flex_decision_before_final_annual_withdrawal',
                        monthlyMode: 'floor',
                        annualizationFactor: 12,
                        floorProtection: 'max_floor_annual'
                    },
                    metricDisplayRounding: 'descriptor_only_not_applied_to_raw_metric_values'
                }
            },
            inputs: {
                startFloorBedarf: 24000,
                nested: { enabled: true },
                detailTranches: [{
                    trancheId: 'start-lot-1',
                    category: 'equity',
                    type: 'aktien_alt',
                    marketValue: 80000,
                    costBasis: 50000,
                    tqf: 0.3,
                    taxExempt: false
                }]
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
                flex_brutto_haushalt: 6000,
                flex_rentenueberschuss: 1000,
                flex_aus_depot_bedarf: 5000,
                flex_aus_depot_erfuellt: 3456.78,
                flex_haushalt_erfuellt: 4456.78,
                flex_haushalt_kuerzung_pct: 25.72033333333333,
                minimumFlexAnnual: 3000,
                minimumFlexEffectiveFinal: 2500,
                minimumFlexShortfallAnnual: 500,
                portfolio_total_start: 100000,
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
            flexBasisContract: {
                allowed: ['gross_household_flex_required'],
                observed: ['gross_household_flex_required'],
                effective: 'gross_household_flex_required',
                consistent: true,
                decumulationRowCount: 1
            },
            values: {
                wealth_start_nominal_eur: ['completed', 'ruin'].includes(outcomeKind) ? 100000 : null,
                wealth_end_nominal_eur: ['completed', 'ruin'].includes(outcomeKind) ? 90234.56 : null,
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
    assertEqual(raw.schemaVersion, HISTORICAL_BACKTEST_EXPORT_SCHEMA_VERSION, 'raw JSON uses the V2 export schema');
    assert(raw.identifiers.requestId.startsWith('btrq_'), 'raw JSON exposes a request id');
    assert(raw.identifiers.runId.startsWith('btrun_'), 'raw JSON exposes a run id');
    assertEqual(raw.request.executionMode, 'single_path', 'raw JSON retains the execution mode');
    assertEqual(raw.request.breakOnRuin, true, 'raw JSON retains breakOnRuin');
    assertEqual(raw.request.inputs.detailTranches[0].tqf, 0.3,
        'Raw request should retain the explicit start-lot TQF');
    assertEqual(raw.request.inputs.detailTranches[0].taxExempt, false,
        'Raw request should retain the explicit start-lot tax exemption');
    assertEqual(raw.result.completedYears, 2, 'raw JSON retains completion semantics');
    assertEqual(raw.result.provenance.dataset.manifestSchemaVersion, 'HistoricalDataManifestV1', 'raw JSON retains manifest provenance');
    assertEqual(raw.result.provenance.engine.buildId, 'fixture-build', 'raw JSON retains the engine build id');
    assertEqual(raw.result.period.inclusiveYears, 2, 'raw JSON states the inclusive period length');
    assertEqual(raw.result.period.projectionClaim, 'observed_requested_calendar_window_not_fixed_30_year_horizon',
        'raw JSON does not claim a fixed 30-year horizon');
    assertEqual(raw.result.portfolioBoundaries.schemaVersion, HISTORICAL_BACKTEST_PORTFOLIO_BOUNDARY_SCHEMA_VERSION,
        'raw JSON uses the non-restartable portfolio-boundary contract');
    assertEqual(raw.result.portfolioBoundaries.restartable, false, 'historical portfolio boundaries are not restartable');
    assertEqual(raw.result.portfolioBoundaries.totalComposition.healthBucketRelation,
        'included_in_total_do_not_add',
        'portfolio boundary contract states that the health bucket is already included');
    assert(raw.result.portfolioBoundaries.totalComposition.includes.includes('health_bucket'),
        'portfolio boundary composition inventories the health bucket');
    assertEqual(raw.result.portfolioBoundaries.end.totalNominalEur, 90234.56, 'terminal boundary reconciles to the canonical metric');
    assert(raw.result.portfolioSnapshots === undefined && !JSON.stringify(raw.result.portfolioBoundaries).includes('depotTranchesAktien'),
        'raw JSON omits internal portfolio snapshots and detail lots');
    assertEqual(raw.contracts.inputSemantics.schemaVersion, HISTORICAL_BACKTEST_INPUT_SEMANTICS_SCHEMA_VERSION,
        'raw JSON exposes the input-semantic contract');
    assertEqual(raw.contracts.inputSemantics.zielLiquiditaet.not, 'strategy_target',
        'legacy zielLiquiditaet is not presented as the strategy target');
    assertEqual(raw.contracts.flexReductionMaximum.interpretation, 'maximum_household_flex_reduction_not_person_reduction',
        'maximum flex reduction remains bound to the household metric');
    assertEqual(raw.contracts.flexReductionMaximum.basis, 'gross_household_flex_required',
        'maximum flex reduction exports the effective canonical household basis');
    assertEqual(raw.request.engine.sourceCommit, 'd'.repeat(40), 'raw JSON binds the exact source commit');
    assertEqual(raw.request.engine.quantizationContract.schemaVersion, HISTORICAL_BACKTEST_QUANTIZATION_SCHEMA_VERSION,
        'raw JSON binds the quantization contract');
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
    reorderedInputs.request.inputs = {
        detailTranches: [{
            taxExempt: false,
            tqf: 0.3,
            costBasis: 50000,
            marketValue: 80000,
            type: 'aktien_alt',
            category: 'equity',
            trancheId: 'start-lot-1'
        }],
        nested: { enabled: true },
        startFloorBedarf: 24000
    };
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
    const changedTaxExemption = baseResult();
    changedTaxExemption.request.inputs.detailTranches[0].taxExempt = true;
    const changedSourceCommit = baseResult();
    changedSourceCommit.request.engine.sourceCommit = 'e'.repeat(40);
    const changedQuantization = baseResult();
    changedQuantization.request.engine.quantizationContract.withdrawalMonthlyTiers[0].step = 100;
    assert(first.fingerprint.value !== buildHistoricalBacktestRawExport(changedConfig, { exportedAt: first.exportedAt }).fingerprint.value, 'config changes alter the result fingerprint');
    assert(first.fingerprint.value !== buildHistoricalBacktestRawExport(changedDataset, { exportedAt: first.exportedAt }).fingerprint.value, 'dataset changes alter the result fingerprint');
    assert(first.fingerprint.value !== buildHistoricalBacktestRawExport(changedTemporal, { exportedAt: first.exportedAt }).fingerprint.value, 'temporal convention changes alter the result fingerprint');
    assert(first.fingerprint.value !== buildHistoricalBacktestRawExport(changedTaxExemption, { exportedAt: first.exportedAt }).fingerprint.value,
        'Explicit start-lot tax exemption participates in the replay fingerprint');
    assert(first.fingerprint.value !== buildHistoricalBacktestRawExport(changedSourceCommit, { exportedAt: first.exportedAt }).fingerprint.value,
        'source commit participates in the replay fingerprint');
    assert(first.fingerprint.value !== buildHistoricalBacktestRawExport(changedQuantization, { exportedAt: first.exportedAt }).fingerprint.value,
        'quantization contract participates in the replay fingerprint');
    const withCohorts = buildHistoricalBacktestRawExport(result, {
        exportedAt: first.exportedAt,
        cohortInventory: { schemaVersion: 'HistoricalBacktestCohortsV1', inventory: { eligible: 2 } }
    });
    assertEqual(withCohorts.result.cohortInventory.inventory.eligible, 2, 'optional cohort inventory is exported without recalculation');
    assert(first.fingerprint.value !== withCohorts.fingerprint.value, 'optional cohort inventory participates in the result fingerprint');
    assertEqual(first.fingerprint.value, '00a3f3aa4b5b735beb868e8cfb0bb5d856e64150c2ba8d3297980660fdfdc506',
        'canonical V2 fixture fingerprint remains byte-for-byte stable');
}

{
    const missingSource = baseResult();
    delete missingSource.request.engine.sourceCommit;
    let missingError = null;
    try {
        buildHistoricalBacktestRawExport(missingSource);
    } catch (error) {
        missingError = error;
    }
    assertEqual(missingError?.code, 'HISTORICAL_EXPORT_SOURCE_COMMIT_REQUIRED',
        'missing source commit blocks the Raw export fail-closed');

    const dirtySource = baseResult();
    dirtySource.request.engine.sourceTreeStatus = 'dirty';
    let dirtyError = null;
    try {
        buildHistoricalBacktestRawExport(dirtySource);
    } catch (error) {
        dirtyError = error;
    }
    assertEqual(dirtyError?.code, 'HISTORICAL_EXPORT_SOURCE_TREE_DIRTY',
        'dirty source tree blocks the Raw export fail-closed');

    const unavailableAtRun = baseResult();
    unavailableAtRun.request.engine.sourceCommit = 'a'.repeat(40);
    unavailableAtRun.request.engine.sourceTreeStatus = 'unavailable';
    let unavailableError = null;
    try {
        buildHistoricalBacktestRawExport(unavailableAtRun, {
            runtimeBuildProvenance: {
                schemaVersion: 'RuntimeBuildProvenanceV1',
                sourceCommit: 'f'.repeat(40),
                sourceTreeStatus: 'clean',
                provider: 'must_not_override'
            }
        });
    } catch (error) {
        unavailableError = error;
    }
    assertEqual(unavailableError?.code, 'HISTORICAL_EXPORT_SOURCE_TREE_DIRTY',
        'unknown run-time tree status remains fail-closed instead of accepting export-time provenance');
    assertEqual(unavailableError?.details?.sourceTreeStatus, 'unavailable',
        'unknown captured tree status reaches the stable export error details');
    assertEqual(unavailableAtRun.request.engine.sourceCommit, 'a'.repeat(40),
        'export validation never mutates or replaces the commit captured at run start');

    const incompleteQuantization = baseResult();
    incompleteQuantization.request.engine.quantizationContract = {
        schemaVersion: HISTORICAL_BACKTEST_QUANTIZATION_SCHEMA_VERSION,
        enabled: true
    };
    let quantizationError = null;
    try {
        buildHistoricalBacktestRawExport(incompleteQuantization);
    } catch (error) {
        quantizationError = error;
    }
    assertEqual(quantizationError?.code, 'HISTORICAL_EXPORT_QUANTIZATION_CONTRACT_REQUIRED',
        'schema-only quantization contracts fail closed without tiers and rounding semantics');

    const mismatchedBoundary = baseResult();
    mismatchedBoundary.rows[0].row.portfolio_total_end = 1;
    let boundaryError = null;
    try {
        buildHistoricalBacktestRawExport(mismatchedBoundary);
    } catch (error) {
        boundaryError = error;
    }
    assertEqual(boundaryError?.code, 'HISTORICAL_EXPORT_PORTFOLIO_BOUNDARY_MISMATCH',
        'mismatched canonical metric and independent terminal row block the export');
    const mismatchedStartBoundary = baseResult();
    mismatchedStartBoundary.rows[0].row.portfolio_total_start = 99999;
    let startBoundaryError = null;
    try {
        buildHistoricalBacktestRawExport(mismatchedStartBoundary);
    } catch (error) {
        startBoundaryError = error;
    }
    assertEqual(startBoundaryError?.code, 'HISTORICAL_EXPORT_PORTFOLIO_BOUNDARY_MISMATCH',
        'mismatched canonical metric and independently calculated opening row block the export');

    const partialTechnical = baseResult('technical_error');
    partialTechnical.rows = [structuredClone(baseResult().rows[0])];
    const partialTechnicalExport = buildHistoricalBacktestRawExport(partialTechnical);
    assertEqual(partialTechnicalExport.result.portfolioBoundaries.start, null,
        'partial technical results do not claim a financially reconciled start boundary');
    assertEqual(partialTechnicalExport.result.portfolioBoundaries.end, null,
        'partial technical results do not claim a financially reconciled end boundary');
}

{
    const result = baseResult();
    const csv = serializeHistoricalBacktestCsv(result);
    const lines = csv.split('\n');
    assertEqual(HISTORICAL_BACKTEST_CSV_SCHEMA_VERSION, 'HistoricalBacktestCsvV2',
        'leading run identity is explicitly versioned as CSV V2');
    assertEqual(HISTORICAL_BACKTEST_CSV_COLUMNS.length, 34,
        'CSV V2 fixes the 34-column contract');
    const expectedCsvV2GoldenHeader = 'run_id;simulation_year_calendar_year;outcome_code;action_code;cut_reason_code;minimum_flex_status_code;equity_return_ratio;gold_return_pct;cash_bond_return_pct;inflation_pct;wage_pension_adjustment_pct;cape_ratio;withdrawal_nominal_eur;floor_required_nominal_eur;pension_total_nominal_eur;flex_fulfilled_nominal_eur;flex_household_required_nominal_eur;flex_pension_contribution_nominal_eur;flex_required_from_portfolio_nominal_eur;flex_fulfilled_from_portfolio_nominal_eur;flex_household_fulfilled_nominal_eur;flex_household_reduction_pct;minimum_flex_annual_nominal_eur;minimum_flex_effective_final_nominal_eur;minimum_flex_shortfall_nominal_eur;flex_reduction_pct;portfolio_equity_end_nominal_eur;portfolio_gold_end_nominal_eur;portfolio_cash_end_nominal_eur;health_bucket_end_nominal_eur;portfolio_total_end_nominal_eur;tax_total_nominal_eur;loss_carry_end_nominal_eur;floor_shortfall_nominal_eur';
    assertEqual(lines[0], expectedCsvV2GoldenHeader,
        'CSV V2 uses the independently pinned literal 34-column golden header');
    assert(lines[0].includes('portfolio_total_end_nominal_eur'), 'CSV headers expose units');
    assert(csv.includes('-0.125'), 'CSV retains raw signed ratios with a dot decimal separator');
    assert(csv.includes('12345.67'), 'CSV retains raw financial numbers without localized grouping');
    assert(csv.includes('"\'=CMD(""quoted"";'), 'CSV protects formula text and escapes delimiters and quotes');
    assert(csv.includes("'+unsafe") && csv.includes("'-unsafe"), 'CSV protects plus/minus formula prefixes');
    assert(!csv.includes('<span'), 'CSV never calls HTML display formatters');
    assertEqual(HISTORICAL_BACKTEST_CSV_CONTRACT.missingValue, '', 'CSV missing values use empty cells');
    const csvContext = { entry: result.rows[0], result, record: result.historicalYearRecords[0] };
    const readColumn = id => HISTORICAL_BACKTEST_CSV_COLUMNS.find(column => column.id === id)?.read(csvContext);
    assertEqual(readColumn('flex_household_required_nominal_eur'), 6000,
        'CSV exports the explicit gross household-flex basis');
    assertEqual(readColumn('flex_household_fulfilled_nominal_eur'), 4456.78,
        'CSV exports fulfilled household flex after pension/depot reconciliation');
    assertEqual(readColumn('minimum_flex_effective_final_nominal_eur'), 2500,
        'CSV exports final effective minimum flex');
    assertEqual(readColumn('minimum_flex_shortfall_nominal_eur'), 500,
        'CSV exports the nominal minimum-flex shortfall');
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
    const quantization = {
        ANTI_PSEUDO_ACCURACY: {
            ENABLED: true,
            QUANTIZATION_TIERS: [{ limit: 10000, step: 1000 }, { limit: Infinity, step: 25000 }],
            QUANTIZATION_TIERS_MONTHLY: [{ limit: 2000, step: 50 }, { limit: Infinity, step: 250 }],
            WITHDRAWAL_ROUNDING: {
                phase: 'after_floor_plus_flex_decision_before_final_annual_withdrawal',
                monthlyMode: 'floor',
                annualizationFactor: 12,
                floorProtection: 'max_floor_annual'
            },
            METRIC_DISPLAY_ROUNDING: 'descriptor_only_not_applied_to_raw_metric_values'
        }
    };
    const engineApi = {
        getVersion: () => ({ api: '31.0', build: 'build-1' }),
        getConfig: () => ({ z: 2, a: 1, upperBound: Infinity, ...quantization })
    };
    const runtime = {
        schemaVersion: 'RuntimeBuildProvenanceV1',
        sourceCommit: 'f'.repeat(40),
        sourceTreeStatus: 'clean',
        provider: 'test_fixture'
    };
    const first = captureHistoricalBacktestEngineProvenance(engineApi, runtime);
    const sameDifferentOrder = captureHistoricalBacktestEngineProvenance({
        getVersion: () => ({ api: '31.0', build: 'build-1' }),
        getConfig: () => ({ upperBound: Infinity, ...quantization, a: 1, z: 2 })
    }, runtime);
    const changed = captureHistoricalBacktestEngineProvenance({
        ...engineApi,
        getConfig: () => ({ z: 3, a: 1, upperBound: Infinity, ...quantization })
    }, runtime);
    assertEqual(first.configFingerprint.value, sameDifferentOrder.configFingerprint.value, 'config fingerprint is key-order independent');
    assert(first.configFingerprint.value !== changed.configFingerprint.value, 'config fingerprint detects config changes');
    assertEqual(first.buildId, 'build-1', 'engine provenance captures the build id');
    assertEqual(first.sourceCommit, 'f'.repeat(40), 'engine provenance captures the runtime source commit');
    assertEqual(first.quantizationContract.withdrawalMonthlyTiers.at(-1).unbounded, true,
        'engine provenance serializes the unbounded monthly tier without Infinity');
    assertEqual(first.quantizationContract.withdrawalRounding.monthlyMode, 'floor',
        'engine provenance copies the rounding mode consumed by calculateFinalWithdrawal');
    const malformedQuantization = captureHistoricalBacktestEngineProvenance({
        ...engineApi,
        getConfig: () => ({
            ANTI_PSEUDO_ACCURACY: {
                ENABLED: true,
                QUANTIZATION_TIERS: [{ limit: Number.NaN, step: 1000 }],
                QUANTIZATION_TIERS_MONTHLY: [{ limit: Infinity, step: 50 }]
            }
        })
    }, runtime);
    assertEqual(malformedQuantization.quantizationContract, null,
        'invalid non-finite tier limits fail closed instead of masquerading as unbounded');
}

{
    const download = createHistoricalBacktestDownload(baseResult(), 'json', { exportedAt: '2026-07-19T10:00:00.000Z' });
    assert(/^backtest-2000-2001-run-[a-f0-9]{12}-result-[a-f0-9]{12}-2026-07-19T10-00-00\.000Z\.json$/.test(download.filename),
        'JSON filename carries period, run identity, result fingerprint and timestamp');
    assertEqual(download.mimeType, 'application/json', 'JSON download uses the JSON MIME type');
    const csvDownload = createHistoricalBacktestDownload(baseResult(), 'csv', { exportedAt: '2026-07-19T10:00:00.000Z' });
    assert(csvDownload.filename.endsWith('.csv'), 'CSV download uses the CSV extension');
    assertEqual(csvDownload.fingerprint.algorithm, 'sha256-csv-utf8-v1', 'CSV identifies its own byte projection');
    assert(csvDownload.fingerprint.value !== download.fingerprint.value, 'CSV and Raw JSON use format-specific fingerprints');
    const rawDocument = JSON.parse(download.content);
    assertEqual(csvDownload.content.split('\n')[1].split(';')[0], rawDocument.identifiers.runId,
        'CSV embeds the same canonical run identity as Raw JSON');
    const sharedRunToken = rawDocument.identifiers.runId.slice(-64, -52);
    assert(download.filename.includes(`-run-${sharedRunToken}-`)
        && csvDownload.filename.includes(`-run-${sharedRunToken}-`),
    'JSON and CSV filenames identify the same canonical run');
    assert(download.filename.includes(`-result-${download.fingerprint.value.slice(0, 12)}-`),
        'JSON filename remains traceable to the Raw result fingerprint');
    assert(csvDownload.filename.includes(`-csv-${csvDownload.fingerprint.value.slice(0, 12)}-`),
        'CSV filename remains traceable to its byte fingerprint');

    const missingAtRun = baseResult();
    delete missingAtRun.request.engine.sourceCommit;
    missingAtRun.request.engine.sourceTreeStatus = 'unavailable';
    const csvWithoutSource = createHistoricalBacktestDownload(missingAtRun, 'csv', {
        exportedAt: '2026-07-19T10:00:00.000Z'
    });
    assert(csvWithoutSource.content.startsWith('run_id;simulation_year_calendar_year;'),
        'technical CSV remains available when Raw JSON source provenance is unavailable');
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
    const backtestStatus = {
        dataset: {},
        className: '',
        hidden: true,
        innerHTML: '',
        setAttribute() {},
        focus() {}
    };
    try {
        globalThis.window = { globalBacktestData: { result: baseResult() } };
        globalThis.document = {
            getElementById: id => ({ toastContainer, backtestStatus }[id] || null),
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

        const dirtyResult = baseResult();
        dirtyResult.request.engine.sourceTreeStatus = 'dirty';
        globalThis.window.globalBacktestData = { result: dirtyResult };
        exportBacktestLogData('json');
        assertEqual(clickCount, 1, 'blocked Raw JSON export does not trigger a download');
        assert(backtestStatus.innerHTML.includes('HISTORICAL_EXPORT_SOURCE_TREE_DIRTY'),
            'stable Raw JSON provenance error code reaches the visible UI status');
        assert(backtestStatus.innerHTML.includes('dirty'), 'Raw JSON UI status names the actionable dirty-tree cause');

        exportBacktestLogData('csv');
        assertEqual(clickCount, 2, 'CSV export remains available when only Raw JSON provenance is blocked');
        assert((await capturedBlob.text()).startsWith('run_id;simulation_year_calendar_year;'),
            'UI CSV download remains the technical row projection');
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete globalThis[key];
            else globalThis[key] = value;
        }
    }
}

console.log('✅ Historical backtest export tests passed');
