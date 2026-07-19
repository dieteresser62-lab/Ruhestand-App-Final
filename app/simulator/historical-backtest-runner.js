"use strict";

export const BACKTEST_REQUEST_SCHEMA_VERSION = 'BacktestRequestV0';
export const BACKTEST_RESULT_SCHEMA_VERSION = 'BacktestRunResultV0';

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

function buildLegacyOutcome(rows, requestedYears, ruinEncountered) {
    if (ruinEncountered) return 'ruin_legacy';
    if (rows.length === 0) return 'empty_result_rendered_as_completed_legacy';
    if (Number.isInteger(requestedYears) && rows.length < requestedYears) {
        return 'partial_result_rendered_as_completed_legacy';
    }
    return 'completed_legacy';
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
    breakOnRuin = false
}) {
    const simulate = requireFunction(simulateYear, 'simulateYear');
    const initialize = requireFunction(initializePortfolio, 'initializePortfolio');
    const computeAdjustment = requireFunction(computeAdjustmentPct, 'computeAdjustmentPct');
    const resolveYearHorizon = requireFunction(resolveHorizon, 'resolveHorizon');
    const computePortfolioTotal = requireFunction(totalPortfolio, 'totalPortfolio');

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
        dataset: {
            datasetId: historicalDataProvider?.datasetId || null,
            revision: historicalDataProvider?.revision || null,
            contentHash: historicalDataProvider?.contentHash || null
        },
        inputs: requestInputs
    });
    const prepared = prepareHistoricalPeriod(historicalDataProvider, { startYear, endYear });
    if (prepared.status === 'incomplete') {
        return {
            schemaVersion: BACKTEST_RESULT_SCHEMA_VERSION,
            request,
            rows: [],
            requestedYears,
            completedYears: 0,
            portfolioStart: null,
            portfolioEnd: null,
            dataStatus: 'incomplete',
            incompleteReason: prepared.reason,
            legacyOutcome: 'incomplete',
            historicalYearRecords: [],
            legacyMetrics: {
                totalWithdrawal: 0,
                maxReductionStreak: 0,
                reductionYears: 0,
                totalTaxes: 0
            }
        };
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
    let simulationState = {
        portfolio: initialize(runInputs),
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

    let totalWithdrawal = 0;
    let currentReductionStreak = 0;
    let maxReductionStreak = 0;
    let reductionYears = 0;
    let totalTaxes = 0;
    let successfulYears = 0;
    let ruinEncountered = false;
    const rows = [];

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
        const result = simulate(simulationState, adjustedInputs, yearData, yearIndex);

        if (result.isRuin) {
            ruinEncountered = true;
            rows.push({
                jahr: year,
                row: {
                    floor_brutto: simulationState.baseFloor,
                    renteSum: 0,
                    aktionUndGrund: '!!! RUIN !!!',
                    Regime: 'BANKRUPT',
                    liquiditaet: 0,
                    wertAktien: 0,
                    wertGold: 0,
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
                    GuardNote: result.reason || 'Pleite'
                },
                entscheidung: { jahresEntnahme: 0 },
                wertAktien: 0,
                wertGold: 0,
                liquiditaet: 0,
                netA: 0,
                netG: 0,
                vpw: null,
                vpwFallbackHint: 'no_vpw',
                adjPct: adjustmentPct,
                inflationVJ: historicalRecord.realized.inflation.value
            });
            if (breakOnRuin) break;
        }

        simulationState = result.newState;
        totalTaxes += result.totalTaxesThisYear;
        const row = result.logData;
        const { entscheidung, wertAktien, wertGold, liquiditaet } = row;
        totalWithdrawal += entscheidung.jahresEntnahme;
        successfulYears++;

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
    const portfolioEnd = computePortfolioTotal(simulationState.portfolio);

    return {
        schemaVersion: BACKTEST_RESULT_SCHEMA_VERSION,
        request,
        rows,
        requestedYears,
        completedYears: successfulYears,
        portfolioStart,
        portfolioEnd,
        dataStatus: 'complete',
        incompleteReason: null,
        historicalYearRecords: historicalRecords,
        legacyOutcome: buildLegacyOutcome(rows, requestedYears, ruinEncountered),
        legacyMetrics: {
            totalWithdrawal,
            maxReductionStreak,
            reductionYears,
            totalTaxes
        }
    };
}
