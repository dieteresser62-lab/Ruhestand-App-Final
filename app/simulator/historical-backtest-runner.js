"use strict";

import {
    deriveHistoricalBacktestMetrics,
    HISTORICAL_BACKTEST_METRICS_SCHEMA_VERSION
} from './historical-backtest-metrics.js';
import {
    canonicalizeHistoricalContractValue,
    sha256Hex
} from './historical-backtest-contract.js';

export const BACKTEST_REQUEST_SCHEMA_VERSION = 'BacktestRequestV1';
export const BACKTEST_RESULT_SCHEMA_VERSION = 'BacktestRunResultV1';

export const BACKTEST_OUTCOME_KINDS = Object.freeze({
    COMPLETED: 'completed',
    RUIN: 'ruin',
    INCOMPLETE: 'incomplete',
    TECHNICAL_ERROR: 'technical_error',
    CANCELLED: 'cancelled'
});

export const BACKTEST_TECHNICAL_ERROR_CODES = Object.freeze({
    DEPENDENCY_INVALID: 'BACKTEST_DEPENDENCY_INVALID',
    PERIOD_CONTRACT_ERROR: 'BACKTEST_PERIOD_CONTRACT_ERROR',
    INITIALIZATION_ERROR: 'BACKTEST_INITIALIZATION_ERROR',
    SIMULATOR_EXCEPTION: 'SIMULATOR_ADAPTER_EXCEPTION',
    SIMULATOR_RESULT_INVALID: 'SIMULATOR_RESULT_SHAPE_INVALID',
    RUIN_STATE_INVALID: 'SIMULATOR_RUIN_STATE_INVALID'
});

function cloneRunValue(value, seen = new WeakMap()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);

    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof RegExp) return new RegExp(value.source, value.flags);

    const copy = Array.isArray(value)
        ? []
        : Object.create(Object.getPrototypeOf(value));
    seen.set(value, copy);
    for (const key of Reflect.ownKeys(value)) {
        if (Array.isArray(value) && key === 'length') continue;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor) continue;
        if ('value' in descriptor) {
            Object.defineProperty(copy, key, {
                value: cloneRunValue(descriptor.value, seen),
                enumerable: descriptor.enumerable,
                configurable: true,
                writable: true
            });
        } else {
            Object.defineProperty(copy, key, descriptor);
        }
    }
    return copy;
}

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
}

function requireFunction(value, name) {
    if (typeof value !== 'function') {
        throw new TypeError(`runHistoricalBacktest requires ${name} to be a function`);
    }
    return value;
}

function prepareHistoricalPeriod(provider, period) {
    if (!provider || typeof provider !== 'object') {
        throw new TypeError('runHistoricalBacktest requires a historicalDataProvider');
    }
    const preparePeriod = requireFunction(provider.preparePeriod, 'historicalDataProvider.preparePeriod');
    const prepared = preparePeriod(period);
    if (!prepared || !['complete', 'incomplete'].includes(prepared.status)) {
        throw new TypeError('historicalDataProvider.preparePeriod returned an unsupported result');
    }
    return prepared;
}

function readInitialMarketValue(initialMarketHistory, field) {
    const value = Number(initialMarketHistory?.levels?.[field]?.value);
    if (!Number.isFinite(value) || value <= 0) {
        throw new TypeError(`historicalDataProvider returned invalid initialMarketHistory.${field}`);
    }
    return value;
}

function buildYearData(record) {
    return {
        jahr: record.simulationYear,
        rendite: record.realized.equityReturn.value,
        gold_eur_perf: record.realized.goldReturn.value,
        zinssatz: record.realized.cashBondReturn.value,
        inflation: record.realized.inflation.value,
        lohn: record.realized.wagePensionAdjustment.value,
        cape: record.decisionAsOf.capeRatio.value,
        capeRatio: record.decisionAsOf.capeRatio.value,
        temporal: deepFreeze({
            temporalConventionId: record.temporalConventionId,
            simulationYear: record.simulationYear,
            realizedSourceYears: {
                equityReturn: record.realized.equityReturn.sourceYear,
                goldReturn: record.realized.goldReturn.sourceYear,
                cashBondReturn: record.realized.cashBondReturn.sourceYear,
                inflation: record.realized.inflation.sourceYear,
                wagePensionAdjustment: record.realized.wagePensionAdjustment.sourceYear
            },
            decisionAsOf: {
                capeRatio: record.decisionAsOf.capeRatio.asOfYear
            }
        })
    };
}

function buildVpwFallbackHint(vpwPayload) {
    if (!vpwPayload || typeof vpwPayload !== 'object') return 'no_vpw';
    const status = String(vpwPayload.status || '');
    if (status === 'disabled') return 'dynamic_flex_off';
    if (status === 'contract_ready') return 'contract_not_active';
    if (status === 'safety_static_flex') return 'safety_static_flex';
    if (status !== 'active') return 'unknown_status';
    if (!Number.isFinite(vpwPayload.capeRatioUsed) || vpwPayload.capeRatioUsed <= 0) return 'fallback_no_cape';
    if (!Number.isFinite(vpwPayload.expectedReturnCape)) return 'fallback_no_cape_return';
    if (!Number.isFinite(vpwPayload.expectedRealReturn)) return 'fallback_no_real_return';
    return 'ok';
}

function sumTranches(tranches) {
    return Array.isArray(tranches)
        ? tranches.reduce((sum, tranche) => sum + (Number(tranche?.marketValue) || 0), 0)
        : 0;
}

function readPortfolioParts(portfolio) {
    return {
        wertAktien: sumTranches(portfolio?.depotTranchesAktien),
        wertGold: sumTranches(portfolio?.depotTranchesGold),
        liquiditaet: Number(portfolio?.liquiditaet) || 0,
        healthBucketEnd: Number(portfolio?.healthBucketGeldmarkt) || 0
    };
}

function normalizeTechnicalError(error, fallbackCode) {
    const code = typeof error?.code === 'string' && error.code.trim()
        ? error.code.trim()
        : fallbackCode;
    const providedMessage = typeof error?.message === 'string' ? error.message.trim() : '';
    const message = providedMessage.includes(code)
        ? providedMessage
        : `Der Backtest wurde wegen eines technischen Fehlers beendet (${code}).`;
    return { code, message };
}

function buildIncompleteOutcome(reason) {
    const missingYears = Number.isInteger(reason?.year) ? [reason.year] : [];
    const missingFields = Array.isArray(reason?.missingFields)
        ? reason.missingFields.map(String)
        : (missingYears.length > 0 ? ['historicalYearRecord'] : []);
    return {
        kind: BACKTEST_OUTCOME_KINDS.INCOMPLETE,
        lastCompletedYear: null,
        missingYears,
        missingFields,
        exclusionReason: reason?.code || 'historical_data_incomplete'
    };
}

function buildHealthBucketSummary(rows) {
    for (let index = rows.length - 1; index >= 0; index--) {
        const row = rows[index]?.row;
        if (!row || row.health_bucket_enabled !== true) continue;
        return {
            enabled: true,
            end: Number(row.health_bucket_end) || 0,
            realCoveragePct: Number.isFinite(Number(row.health_bucket_real_coverage_pct))
                ? Number(row.health_bucket_real_coverage_pct)
                : null,
            targetGap: Number(row.health_bucket_target_gap) || 0
        };
    }
    return { enabled: false, end: 0, realCoveragePct: null, targetGap: 0 };
}

function buildSummary({
    rows,
    portfolioStart,
    portfolioEnd,
    completedYears,
    totalWithdrawal,
    maxReductionStreak,
    reductionYears,
    totalTaxes
}) {
    return {
        startWealth: portfolioStart,
        endWealth: portfolioEnd,
        totalWithdrawal,
        maxReductionStreak,
        reductionYears,
        reductionDenominator: completedYears,
        totalTaxes,
        healthBucket: buildHealthBucketSummary(rows)
    };
}

function attachCanonicalMetrics(result) {
    const metrics = deriveHistoricalBacktestMetrics(result);
    const values = metrics.values;
    return deepFreeze({
        ...result,
        metrics,
        summary: {
            ...result.summary,
            startWealth: values.wealth_start_nominal_eur ?? result.summary.startWealth,
            endWealth: values.wealth_end_nominal_eur ?? result.summary.endWealth,
            totalWithdrawal: values.withdrawal_total_nominal_eur ?? result.summary.totalWithdrawal,
            maxReductionStreak: values.flex_reduction_longest_streak_gte_10_pct
                ?? result.summary.maxReductionStreak,
            reductionYears: values.flex_reduction_years_gte_10_pct ?? result.summary.reductionYears,
            totalTaxes: values.tax_total_nominal_eur ?? result.summary.totalTaxes,
            metricSchemaVersion: HISTORICAL_BACKTEST_METRICS_SCHEMA_VERSION,
            metrics: values
        }
    });
}

function buildDatasetProvenance(historicalDataProvider) {
    const manifest = historicalDataProvider?.manifest;
    return {
        datasetId: historicalDataProvider?.datasetId || null,
        revision: historicalDataProvider?.revision || null,
        contentHash: historicalDataProvider?.contentHash || null,
        manifestSchemaVersion: manifest?.schemaVersion || null,
        manifestHash: manifest && typeof manifest === 'object'
            ? {
                algorithm: 'sha256-canonical-json-v1',
                value: sha256Hex(canonicalizeHistoricalContractValue(manifest))
            }
            : null
    };
}

function buildEngineProvenance(engineProvenance) {
    const configFingerprint = engineProvenance?.configFingerprint;
    return {
        apiVersion: typeof engineProvenance?.apiVersion === 'string' ? engineProvenance.apiVersion : null,
        buildId: typeof engineProvenance?.buildId === 'string' ? engineProvenance.buildId : null,
        configFingerprint: configFingerprint
            && typeof configFingerprint.algorithm === 'string'
            && typeof configFingerprint.value === 'string'
            ? {
                algorithm: configFingerprint.algorithm,
                value: configFingerprint.value
            }
            : null
    };
}

/**
 * Executes the historical year loop against one preflighted V1 record per year.
 * All environment-facing dependencies are supplied by the caller.
 */
export function runHistoricalBacktest({
    inputs,
    period,
    historicalDataProvider,
    simulateYear,
    initializePortfolio,
    computeAdjustmentPct,
    resolveHorizon,
    totalPortfolio,
    breakOnRuin = false,
    engineProvenance = null
}) {
    const startYear = Number(period?.startYear);
    const endYear = Number(period?.endYear);
    const requestedYears = Number.isInteger(startYear) && Number.isInteger(endYear)
        ? endYear - startYear + 1
        : null;
    const requestInputs = deepFreeze(cloneRunValue(inputs || {}));
    const runInputs = cloneRunValue(requestInputs);
    const request = deepFreeze({
        schemaVersion: BACKTEST_REQUEST_SCHEMA_VERSION,
        startYear,
        endYear,
        executionMode: 'single_path',
        breakOnRuin: Boolean(breakOnRuin),
        temporalConventionId: historicalDataProvider?.temporalConventionId || null,
        dataset: buildDatasetProvenance(historicalDataProvider),
        engine: buildEngineProvenance(engineProvenance),
        inputs: requestInputs
    });

    let simulate;
    let initialize;
    let computeAdjustment;
    let resolveYearHorizon;
    let computePortfolioTotal;
    let prepared;
    let dependencyCause = null;
    try {
        simulate = requireFunction(simulateYear, 'simulateYear');
        initialize = requireFunction(initializePortfolio, 'initializePortfolio');
        computeAdjustment = requireFunction(computeAdjustmentPct, 'computeAdjustmentPct');
        resolveYearHorizon = requireFunction(resolveHorizon, 'resolveHorizon');
        computePortfolioTotal = requireFunction(totalPortfolio, 'totalPortfolio');
    } catch (cause) {
        dependencyCause = cause;
    }

    const emptyMetrics = {
        totalWithdrawal: 0,
        maxReductionStreak: 0,
        reductionYears: 0,
        totalTaxes: 0
    };
    const buildEarlyResult = ({ outcome, dataStatus, incompleteReason = null, diagnostics = null }) => (
        attachCanonicalMetrics({
            schemaVersion: BACKTEST_RESULT_SCHEMA_VERSION,
            request,
            outcome,
            warnings: [],
            error: outcome.kind === BACKTEST_OUTCOME_KINDS.TECHNICAL_ERROR ? outcome.error : null,
            rows: [],
            requestedYears,
            completedYears: 0,
            firstYear: Number.isInteger(startYear) ? startYear : null,
            lastCompletedYear: null,
            ruinYear: null,
            breakOnRuin: request.breakOnRuin,
            portfolioStart: null,
            portfolioEnd: null,
            portfolioSnapshots: { start: null, end: null },
            dataStatus,
            incompleteReason,
            historicalYearRecords: [],
            legacyOutcome: outcome.kind,
            legacyMetrics: emptyMetrics,
            summary: buildSummary({
                rows: [],
                portfolioStart: null,
                portfolioEnd: null,
                completedYears: 0,
                ...emptyMetrics
            }),
            diagnostics
        })
    );

    if (dependencyCause) {
        const error = normalizeTechnicalError(null, BACKTEST_TECHNICAL_ERROR_CODES.DEPENDENCY_INVALID);
        return buildEarlyResult({
            outcome: { kind: BACKTEST_OUTCOME_KINDS.TECHNICAL_ERROR, error, lastCompletedYear: null },
            dataStatus: 'not_checked',
            diagnostics: { cause: dependencyCause }
        });
    }

    try {
        prepared = prepareHistoricalPeriod(historicalDataProvider, { startYear, endYear });
    } catch (cause) {
        const error = normalizeTechnicalError(null, BACKTEST_TECHNICAL_ERROR_CODES.PERIOD_CONTRACT_ERROR);
        return buildEarlyResult({
            outcome: { kind: BACKTEST_OUTCOME_KINDS.TECHNICAL_ERROR, error, lastCompletedYear: null },
            dataStatus: 'not_checked',
            diagnostics: { cause }
        });
    }
    if (prepared.status === 'incomplete') {
        return buildEarlyResult({
            outcome: buildIncompleteOutcome(prepared.reason),
            dataStatus: 'incomplete',
            incompleteReason: prepared.reason
        });
    }
    const historicalRecords = prepared.records;
    const backtestContext = {
        inputs: {
            rentAdj: {
                mode: runInputs.rentAdjMode || 'fix',
                pct: runInputs.rentAdjPct || 0
            }
        },
        series: {
            wageGrowth: historicalRecords.map(record => record.realized.wagePensionAdjustment.value),
            inflationPct: historicalRecords.map(record => record.realized.inflation.value),
            startYear
        },
        simStartYear: startYear
    };
    const initialMarketHistory = prepared.initialMarketHistory;
    const initialCapeRatio = historicalRecords[0].decisionAsOf.capeRatio.value;
    let initialPortfolio;
    try {
        initialPortfolio = initialize(runInputs);
    } catch (cause) {
        const error = normalizeTechnicalError(null, BACKTEST_TECHNICAL_ERROR_CODES.INITIALIZATION_ERROR);
        return buildEarlyResult({
            outcome: { kind: BACKTEST_OUTCOME_KINDS.TECHNICAL_ERROR, error, lastCompletedYear: null },
            dataStatus: 'complete',
            diagnostics: { cause }
        });
    }
    let simulationState = {
        portfolio: initialPortfolio,
        baseFloor: runInputs.startFloorBedarf,
        baseFlex: runInputs.startFlexBedarf,
        baseMinimumFlexAnnual: runInputs.minimumFlexAnnual || 0,
        baseFlexBudgetAnnual: runInputs.flexBudgetAnnual || 0,
        baseFlexBudgetRecharge: runInputs.flexBudgetRecharge || 0,
        lastState: null,
        currentAnnualPension: (runInputs.renteMonatlich || 0) * 12,
        currentAnnualPension2: runInputs.partner?.brutto || 0,
        marketDataHist: {
            endeVJ: readInitialMarketValue(initialMarketHistory, 'endeVJ'),
            endeVJ_1: readInitialMarketValue(initialMarketHistory, 'endeVJ_1'),
            endeVJ_2: readInitialMarketValue(initialMarketHistory, 'endeVJ_2'),
            endeVJ_3: readInitialMarketValue(initialMarketHistory, 'endeVJ_3'),
            ath: initialMarketHistory.allTimeHigh.value,
            jahreSeitAth: initialMarketHistory.yearsSinceAllTimeHigh,
            capeRatio: initialCapeRatio
        }
    };
    const portfolioStart = computePortfolioTotal(simulationState.portfolio);
    const portfolioStartSnapshot = deepFreeze(cloneRunValue(simulationState.portfolio));

    let totalWithdrawal = 0;
    let currentReductionStreak = 0;
    let maxReductionStreak = 0;
    let reductionYears = 0;
    let totalTaxes = 0;
    let successfulYears = 0;
    let ruinEncountered = false;
    let ruinYear = null;
    let ruinReason = null;
    let lastCompletedYear = null;
    const rows = [];

    const finishResult = ({ outcome, diagnostics = null }) => {
        const portfolioEnd = simulationState?.portfolio
            ? computePortfolioTotal(simulationState.portfolio)
            : null;
        const legacyMetrics = {
            totalWithdrawal,
            maxReductionStreak: Math.max(maxReductionStreak, currentReductionStreak),
            reductionYears,
            totalTaxes
        };
        return attachCanonicalMetrics({
            schemaVersion: BACKTEST_RESULT_SCHEMA_VERSION,
            request,
            outcome,
            warnings: [],
            error: outcome.kind === BACKTEST_OUTCOME_KINDS.TECHNICAL_ERROR ? outcome.error : null,
            rows,
            requestedYears,
            completedYears: successfulYears,
            firstYear: startYear,
            lastCompletedYear,
            ruinYear: outcome.ruinYear ?? null,
            breakOnRuin: request.breakOnRuin,
            portfolioStart,
            portfolioEnd,
            portfolioSnapshots: {
                start: portfolioStartSnapshot,
                end: simulationState?.portfolio ? cloneRunValue(simulationState.portfolio) : null
            },
            dataStatus: 'complete',
            incompleteReason: null,
            historicalYearRecords: historicalRecords,
            legacyOutcome: outcome.kind,
            legacyMetrics,
            summary: buildSummary({
                rows,
                portfolioStart,
                portfolioEnd,
                completedYears: successfulYears,
                ...legacyMetrics
            }),
            diagnostics
        });
    };

    for (let yearIndex = 0; yearIndex < historicalRecords.length; yearIndex++) {
        const historicalRecord = historicalRecords[yearIndex];
        const year = historicalRecord.simulationYear;
        const yearData = buildYearData(historicalRecord);
        const resolvedCapeRatio = historicalRecord.decisionAsOf.capeRatio.value;
        const adjustmentPct = computeAdjustment(backtestContext, yearIndex);
        const horizonResolution = resolveYearHorizon(runInputs, { yearIndex });
        const adjustedInputs = {
            ...runInputs,
            rentAdjPct: adjustmentPct,
            capeRatio: resolvedCapeRatio,
            marketCapeRatio: resolvedCapeRatio,
            horizonYears: horizonResolution.horizonYears,
            ...(horizonResolution.diagnostics?.longevityMode !== 'none'
                ? { longevityHorizonDiagnostics: horizonResolution.diagnostics }
                : {})
        };
        const stateBeforeYear = cloneRunValue(simulationState);
        let result;
        try {
            result = simulate(simulationState, adjustedInputs, yearData, yearIndex);
        } catch (cause) {
            simulationState = stateBeforeYear;
            const error = normalizeTechnicalError(null, BACKTEST_TECHNICAL_ERROR_CODES.SIMULATOR_EXCEPTION);
            return finishResult({
                outcome: { kind: BACKTEST_OUTCOME_KINDS.TECHNICAL_ERROR, error, lastCompletedYear },
                diagnostics: { cause, failedYear: year }
            });
        }

        if (result?.kind === 'technical_error' || result?.error) {
            simulationState = stateBeforeYear;
            const error = normalizeTechnicalError(result?.error, BACKTEST_TECHNICAL_ERROR_CODES.SIMULATOR_RESULT_INVALID);
            return finishResult({
                outcome: { kind: BACKTEST_OUTCOME_KINDS.TECHNICAL_ERROR, error, lastCompletedYear },
                diagnostics: { cause: result?.error?.cause || result?.error || null, failedYear: year }
            });
        }

        if (result?.kind === 'ruin' || result?.isRuin === true) {
            if (!result?.newState?.portfolio) {
                simulationState = stateBeforeYear;
                const error = normalizeTechnicalError(null, BACKTEST_TECHNICAL_ERROR_CODES.RUIN_STATE_INVALID);
                return finishResult({
                    outcome: { kind: BACKTEST_OUTCOME_KINDS.TECHNICAL_ERROR, error, lastCompletedYear },
                    diagnostics: { cause: result, failedYear: year }
                });
            }
            ruinEncountered = true;
            ruinYear ??= year;
            ruinReason ??= result.reason || 'Floor-Deckungsausfall';
            simulationState = result.newState;
            const terminal = readPortfolioParts(simulationState.portfolio);
            const terminalPortfolioTotal = computePortfolioTotal(simulationState.portfolio);
            const requiredFloorNominal = Number.isFinite(result?.ruinDetails?.requiredFloorNominal)
                ? result.ruinDetails.requiredFloorNominal
                : null;
            const coveredFloorNominal = Number.isFinite(result?.ruinDetails?.coveredFloorNominal)
                ? result.ruinDetails.coveredFloorNominal
                : null;
            const floorShortfallNominal = Number.isFinite(result?.ruinDetails?.shortfallNominal)
                ? result.ruinDetails.shortfallNominal
                : null;
            rows.push({
                jahr: year,
                row: {
                    floor_brutto: simulationState.baseFloor,
                    renteSum: 0,
                    aktionUndGrund: '!!! RUIN !!!',
                    Regime: 'BANKRUPT',
                    liquiditaet: terminal.liquiditaet,
                    wertAktien: terminal.wertAktien,
                    wertGold: terminal.wertGold,
                    FlexRatePct: 0,
                    flex_erfuellt_nominal: 0,
                    QuoteEndPct: 0,
                    RunwayCoveragePct: 0,
                    NominalReturnEquityPct: 0,
                    NominalReturnGoldPct: 0,
                    steuern_gesamt: 0,
                    NeedLiq: 0,
                    GuardGold: 0,
                    GuardEq: 0,
                    GuardNote: result.reason || 'Floor-Deckungsausfall',
                    health_bucket_enabled: terminal.healthBucketEnd > 0,
                    health_bucket_end: terminal.healthBucketEnd,
                    floor_coverage_required_nominal: requiredFloorNominal,
                    floor_coverage_covered_nominal: coveredFloorNominal,
                    floor_shortfall_nominal: floorShortfallNominal,
                    taxSavedByLossCarry: 0,
                    lossCarryEnd: Number(simulationState?.lastState?.taxState?.lossCarry) || 0,
                    portfolio_total_end: terminalPortfolioTotal
                },
                entscheidung: { jahresEntnahme: 0 },
                wertAktien: terminal.wertAktien,
                wertGold: terminal.wertGold,
                liquiditaet: terminal.liquiditaet,
                netA: 0,
                netG: 0,
                vpw: null,
                vpwFallbackHint: 'no_vpw',
                adjPct: adjustmentPct,
                inflationVJ: historicalRecord.realized.inflation.value
            });
            if (breakOnRuin) break;
            continue;
        }

        if (!result?.newState?.portfolio || !result?.logData) {
            simulationState = stateBeforeYear;
            const error = normalizeTechnicalError(null, BACKTEST_TECHNICAL_ERROR_CODES.SIMULATOR_RESULT_INVALID);
            return finishResult({
                outcome: { kind: BACKTEST_OUTCOME_KINDS.TECHNICAL_ERROR, error, lastCompletedYear },
                diagnostics: { cause: result, failedYear: year }
            });
        }

        simulationState = result.newState;
        totalTaxes += result.totalTaxesThisYear;
        const row = result.logData;
        const { entscheidung, wertAktien, wertGold, liquiditaet } = row;
        totalWithdrawal += entscheidung.jahresEntnahme;
        successfulYears++;
        lastCompletedYear = year;

        const netA = Number.isFinite(row.netTradeEq)
            ? row.netTradeEq
            : (row.vk?.vkAkt || 0) - (row.kaufAkt || 0);
        const netG = Number.isFinite(row.netTradeGold)
            ? row.netTradeGold
            : (row.vk?.vkGld || 0) - (row.kaufGld || 0);
        const vpwPayload = result.ui?.vpw || null;
        rows.push({
            jahr: year,
            row,
            entscheidung,
            wertAktien,
            wertGold,
            liquiditaet,
            netA,
            netG,
            vpw: vpwPayload,
            vpwFallbackHint: buildVpwFallbackHint(vpwPayload),
            adjPct: adjustmentPct,
            inflationVJ: historicalRecord.realized.inflation.value
        });

        if (entscheidung.kuerzungProzent >= 10) {
            reductionYears++;
            currentReductionStreak++;
        } else {
            maxReductionStreak = Math.max(maxReductionStreak, currentReductionStreak);
            currentReductionStreak = 0;
        }
    }

    maxReductionStreak = Math.max(maxReductionStreak, currentReductionStreak);
    return finishResult({
        outcome: ruinEncountered
            ? {
                kind: BACKTEST_OUTCOME_KINDS.RUIN,
                ruinYear,
                reason: ruinReason,
                lastCompletedYear
            }
            : {
                kind: BACKTEST_OUTCOME_KINDS.COMPLETED,
                lastCompletedYear
            }
    });
}
