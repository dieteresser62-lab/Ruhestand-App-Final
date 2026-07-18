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

function snapshotHistoricalData(provider) {
    if (!provider || typeof provider !== 'object') {
        throw new TypeError('runHistoricalBacktest requires a historicalDataProvider');
    }
    const getYears = requireFunction(provider.getYears, 'historicalDataProvider.getYears');
    const getYear = requireFunction(provider.getYear, 'historicalDataProvider.getYear');
    const years = getYears()
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
    const records = new Map();
    for (const year of years) {
        if (records.has(year)) continue;
        const record = getYear(year);
        if (record !== undefined) records.set(year, cloneRunValue(record));
    }
    return { years: [...records.keys()], records };
}

function resolveBacktestCape(yearData, inputs, marketDataHist) {
    const yearCape = Number(yearData?.cape);
    if (Number.isFinite(yearCape) && yearCape > 0) return yearCape;
    const inputCape = Number(inputs?.capeRatio);
    if (Number.isFinite(inputCape) && inputCape > 0) return inputCape;
    const inputLegacyCape = Number(inputs?.marketCapeRatio);
    if (Number.isFinite(inputLegacyCape) && inputLegacyCape > 0) return inputLegacyCape;
    const histCape = Number(marketDataHist?.capeRatio);
    if (Number.isFinite(histCape) && histCape > 0) return histCape;
    return 0;
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

export function createHistoricalDataProvider(records) {
    if (!records || typeof records !== 'object') {
        throw new TypeError('createHistoricalDataProvider requires a records object');
    }
    return {
        getYears: () => Object.keys(records).map(Number),
        getYear: year => records[year]
    };
}

/**
 * Executes the legacy historical year loop against isolated run-owned copies.
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
    historicalSeriesStartYear = 1950
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
        inputs: requestInputs
    });
    const historical = snapshotHistoricalData(historicalDataProvider);
    const getHistoricalRecord = year => historical.records.get(Number(year));

    const historicalSeriesYears = historical.years.filter(year => year >= historicalSeriesStartYear);
    const backtestContext = {
        inputs: {
            rentAdj: {
                mode: runInputs.rentAdjMode || 'fix',
                pct: runInputs.rentAdjPct || 0
            }
        },
        series: {
            wageGrowth: historicalSeriesYears.map(year => getHistoricalRecord(year).lohn_de || 0),
            inflationPct: historicalSeriesYears.map(year => getHistoricalRecord(year).inflation_de || 0),
            startYear: historicalSeriesStartYear
        },
        simStartYear: startYear
    };

    const getHistoricalValue = (year, property) => {
        const record = getHistoricalRecord(year);
        return record ? record[property] : 0;
    };
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
            endeVJ: getHistoricalValue(startYear - 1, 'msci_eur'),
            endeVJ_1: getHistoricalValue(startYear - 2, 'msci_eur'),
            endeVJ_2: getHistoricalValue(startYear - 3, 'msci_eur'),
            endeVJ_3: getHistoricalValue(startYear - 4, 'msci_eur'),
            ath: 0,
            jahreSeitAth: 0,
            capeRatio: runInputs.marketCapeRatio || 0
        }
    };
    const portfolioStart = computePortfolioTotal(simulationState.portfolio);
    const previousYearValues = historical.years
        .filter(year => year < startYear)
        .map(year => getHistoricalRecord(year).msci_eur);
    simulationState.marketDataHist.ath = previousYearValues.length > 0
        ? Math.max(...previousYearValues)
        : (simulationState.marketDataHist.endeVJ || 0);

    let totalWithdrawal = 0;
    let currentReductionStreak = 0;
    let maxReductionStreak = 0;
    let reductionYears = 0;
    let totalTaxes = 0;
    let successfulYears = 0;
    let ruinEncountered = false;
    const rows = [];

    for (let year = startYear; year <= endYear; year++) {
        const previousYearData = getHistoricalRecord(year - 1);
        const currentYearData = getHistoricalRecord(year);
        if (!previousYearData || !currentYearData) continue;

        const equityReturn = (currentYearData.msci_eur - previousYearData.msci_eur) / previousYearData.msci_eur;
        const yearData = {
            ...cloneRunValue(previousYearData),
            rendite: equityReturn,
            gold_eur_perf: previousYearData.gold_eur_perf,
            zinssatz: previousYearData.zinssatz_de,
            inflation: previousYearData.inflation_de,
            jahr: year
        };
        const resolvedCapeRatio = resolveBacktestCape(yearData, runInputs, simulationState.marketDataHist);
        const yearIndex = year - startYear;
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
        yearData.capeRatio = resolvedCapeRatio;
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
                inflationVJ: previousYearData.inflation_de
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
            inflationVJ: previousYearData.inflation_de
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
        legacyOutcome: buildLegacyOutcome(rows, requestedYears, ruinEncountered),
        legacyMetrics: {
            totalWithdrawal,
            maxReductionStreak,
            reductionYears,
            totalTaxes
        }
    };
}
