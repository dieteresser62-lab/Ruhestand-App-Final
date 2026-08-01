import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { runBacktest } from '../app/simulator/simulator-backtest.js';
import { getCommonInputs } from '../app/simulator/simulator-portfolio.js';
import { simulateOneYear } from '../app/simulator/simulator-engine-wrapper.js';
import { annualData, HISTORICAL_DATA } from '../app/simulator/simulator-data.js';
import { HISTORICAL_DATA_MANIFEST } from '../app/simulator/simulator-data.js';
import {
    computeHistoricalDatasetHash,
    createHistoricalBacktestContractProvider
} from '../app/simulator/historical-backtest-contract.js';
import { EngineAPI } from '../engine/index.mjs';
import { CONFIG } from '../engine/config.mjs';
import { formatPercentValue } from '../app/simulator/simulator-formatting.js';
import { formatCurrency } from '../app/simulator/simulator-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacyFixturePath = path.join(__dirname, 'fixtures', 'simulator-backtest-baseline-v1.json');
const targetFixturePath = path.join(__dirname, 'fixtures', 'simulator-backtest-target-v1.json');
const backtestSourcePath = path.join(__dirname, '..', 'app', 'simulator', 'simulator-backtest.js');
const backtestRunnerSourcePath = path.join(__dirname, '..', 'app', 'simulator', 'historical-backtest-runner.js');
const UPDATE_TARGET = process.env.UPDATE_BACKTEST_TARGET === '1';

console.log('--- Simulator Backtest Characterization Tests ---');

const METRIC_DICTIONARY_V1 = Object.freeze({
    startWealth: {
        unit: 'EUR',
        sign: 'non_negative',
        rounding: 'cent_in_fixture',
        denominator: null,
        legacySource: 'validated getCommonInputs().startVermoegen'
    },
    summaryEndWealth: {
        unit: 'EUR',
        sign: 'non_negative',
        rounding: 'de-DE currency parsed to cent',
        denominator: null,
        legacySource: 'simulationSummary label Endvermögen',
        knownGap: 'Ruin uses the portfolio state before the ruin year'
    },
    totalWithdrawal: {
        unit: 'EUR',
        sign: 'non_negative',
        rounding: 'cent_in_fixture',
        denominator: 'all emitted legacy rows; synthetic ruin row contributes zero',
        legacySource: 'sum(rows[].entscheidung.jahresEntnahme)'
    },
    totalTax: {
        unit: 'EUR',
        sign: 'non_negative',
        rounding: 'cent_in_fixture',
        denominator: 'all emitted legacy rows; synthetic ruin row contributes zero',
        legacySource: 'sum(rows[].row.steuern_gesamt)'
    },
    yearsWithReductionAtLeast10Pct: {
        unit: 'years',
        sign: 'non_negative_integer',
        rounding: 'none',
        denominator: 'requested calendar years shown by the legacy summary',
        legacySource: 'entscheidung.kuerzungProzent >= 10',
        knownGap: 'UI label says >10% although the operator is >=10'
    },
    maxReductionStreak: {
        unit: 'years',
        sign: 'non_negative_integer',
        rounding: 'none',
        denominator: 'consecutive emitted rows with kuerzungProzent >= 10',
        legacySource: 'legacy loop counter'
    },
    maxDrawdownPct: {
        unit: 'percent',
        sign: 'non_negative',
        rounding: 'six_decimals_in_fixture',
        denominator: 'start wealth and emitted end-of-year wrapper portfolio totals',
        legacySource: 'maximum peak-to-trough loss of wertAktien + wertGold + liquiditaet'
    },
    minRunwayCoveragePct: {
        unit: 'percent',
        sign: 'non_negative_or_null',
        rounding: 'six_decimals_in_fixture',
        denominator: 'rows containing a finite RunwayCoveragePct',
        legacySource: 'min(rows[].row.RunwayCoveragePct)'
    },
    maxAbsolutePortfolioFlowDelta: {
        unit: 'EUR',
        sign: 'absolute_non_negative',
        rounding: 'six_decimals_in_fixture',
        denominator: 'rows containing a finite portfolio_flow_delta',
        legacySource: 'max(abs(rows[].row.portfolio_flow_delta))'
    }
});

const FINANCIAL_DELTA_METRICS = Object.freeze([
    'summaryEndWealth',
    'totalWithdrawal',
    'totalTax',
    'yearsWithReductionAtLeast10Pct',
    'maxReductionStreak',
    'maxDrawdownPct',
    'minRunwayCoveragePct',
    'maxAbsolutePortfolioFlowDelta'
]);

const SLICE_04_GOLD_RETURNS_2000_2005 = Object.freeze({
    2000: -2.7,
    2001: 4.3,
    2002: 19.4,
    2003: 11.7,
    2004: 2.2,
    2005: 22.3
});

function createSlice04GoldReferenceProvider() {
    const records = Object.fromEntries(
        Object.entries(HISTORICAL_DATA).map(([year, record]) => [year, { ...record }])
    );
    for (const [year, value] of Object.entries(SLICE_04_GOLD_RETURNS_2000_2005)) {
        records[year] = { ...records[year], gold_eur_perf: value };
    }
    const manifest = structuredClone(HISTORICAL_DATA_MANIFEST);
    manifest.revision = 'slice-04-gold-reference-2000-2005';
    manifest.contentHash.value = computeHistoricalDatasetHash(records);
    return createHistoricalBacktestContractProvider({ records, manifest });
}

const BASE_DOM_VALUES = Object.freeze({
    simStartJahr: 2000,
    simEndJahr: 2005,
    simStartVermoegen: 2000000,
    depotwertAlt: 2000000,
    einstandAlt: 1600000,
    tagesgeld: 20000,
    geldmarktEtf: 0,
    startFloorBedarf: 24000,
    startFlexBedarf: 6000,
    minimumFlexAnnual: 0,
    flexBudgetAnnual: 0,
    flexBudgetYears: 0,
    flexBudgetRecharge: 0,
    marketCapeRatio: 20,
    p1StartAlter: 65,
    p1Geschlecht: 'm',
    p1SparerPauschbetrag: 1000,
    p1KirchensteuerPct: 0,
    p1Monatsrente: 0,
    p1StartInJahren: 0,
    rentAdjMode: 'fix',
    rentAdjPct: 0,
    renteIndexierungsart: 'fest',
    renteFesterSatz: 0,
    horizonMethod: 'survival_quantile',
    horizonYears: 30,
    survivalQuantile: 0.85,
    goGoMultiplier: 1,
    longevityMode: 'none',
    longevityQuantileShift: 0,
    longevityRelativePct: 0,
    longevityBufferYears: 0,
    goldAllokationAktiv: 'false',
    goldAllokationProzent: 0,
    goldFloorProzent: 0,
    rebalancingBand: 20,
    goldSteuerfrei: 'false',
    entnahmeStrategie: 'standard',
    bondTargetFactor: 2,
    drawdownTrigger: 20,
    bondRefillThreshold: 1.5,
    runwayMinMonths: 24,
    runwayTargetMonths: 36,
    targetEq: 60,
    rebalBand: 5,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    stressPreset: 'NONE',
    mcDauer: 30,
    pflegeModellTyp: 'none',
    pflegeMinDauer: 1,
    pflegeMaxDauer: 5,
    pflegeKostenDrift: 3.5,
    pflegeRegionalZuschlag: 0,
    pflegeMaxFloor: 0,
    pflegeRampUp: 5
});

const CHECKBOX_IDS = new Set([
    'dynamicFlex',
    'goGoActive',
    'chkPartnerAktiv',
    'pflegefallLogikAktivieren',
    'enableAccumulationPhase',
    'tailRiskEnabled'
]);

function canonicalize(value) {
    if (typeof value === 'number') {
        if (Number.isNaN(value)) return '__NaN__';
        if (value === Infinity) return '__Infinity__';
        if (value === -Infinity) return '__-Infinity__';
        if (Object.is(value, -0)) return 0;
        return value;
    }
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
        );
    }
    if (value === undefined) return '__undefined__';
    return value;
}

function stableStringify(value, spacing = 0) {
    return JSON.stringify(canonicalize(value), null, spacing);
}

function stableHash(value) {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function round(value, digits = 2) {
    if (!Number.isFinite(Number(value))) return null;
    const factor = 10 ** digits;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: key => (store.has(String(key)) ? store.get(String(key)) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: key => { store.delete(String(key)); },
        clear: () => { store.clear(); },
        key: index => Array.from(store.keys())[index] ?? null,
        get length() { return store.size; }
    };
}

function createElement(value = '0', checked = false) {
    return {
        value: String(value),
        checked,
        disabled: false,
        innerHTML: '',
        textContent: '',
        dataset: {},
        style: { display: 'none' },
        classList: { add: () => {}, remove: () => {} },
        addEventListener: () => {},
        appendChild: () => {},
        setAttribute: () => {},
        removeAttribute: () => {},
        focus: () => {}
    };
}

function createMockDocument(values = {}, checkedIds = []) {
    const checked = new Set(checkedIds);
    const elements = new Map();
    const initial = { ...BASE_DOM_VALUES, ...values };
    for (const [id, value] of Object.entries(initial)) {
        const isChecked = checked.has(id) || (CHECKBOX_IDS.has(id) && value === true);
        elements.set(id, createElement(value, isChecked));
    }
    for (const id of CHECKBOX_IDS) {
        if (!elements.has(id)) elements.set(id, createElement('', checked.has(id)));
    }
    const getOrCreate = id => {
        if (id === 'portfolioCompositionChart') return null;
        if (!elements.has(id)) elements.set(id, createElement('0'));
        return elements.get(id);
    };
    return {
        __elements: elements,
        getElementById: getOrCreate
    };
}

function snapshotDom(doc, selectedIds = null) {
    const selected = selectedIds ? new Set(selectedIds) : null;
    return Object.fromEntries(
        Array.from(doc.__elements.entries())
            .filter(([id]) => !selected || selected.has(id))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([id, element]) => [id, { value: element.value, checked: element.checked }])
    );
}

function parseSummaryCurrency(summaryHtml, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(summaryHtml).match(new RegExp(`<strong>${escaped}<\\/strong><span>([^<]+)<\\/span>`));
    if (!match) return null;
    const normalized = match[1]
        .replace(/\s/g, '')
        .replace('€', '')
        .replace(/\./g, '')
        .replace(',', '.');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
}

function summaryText(summaryHtml) {
    return String(summaryHtml)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function computeReductionMetrics(rows) {
    let current = 0;
    let maxStreak = 0;
    let count = 0;
    for (const entry of rows) {
        const reduction = Number(entry?.entscheidung?.kuerzungProzent);
        if (Number.isFinite(reduction) && reduction >= 10) {
            count++;
            current++;
            maxStreak = Math.max(maxStreak, current);
        } else {
            current = 0;
        }
    }
    return { count, maxStreak };
}

function projectRow(entry) {
    const row = entry?.row || {};
    return {
        jahr: entry?.jahr ?? null,
        wrapper: {
            wertAktien: round(entry?.wertAktien),
            wertGold: round(entry?.wertGold),
            liquiditaet: round(entry?.liquiditaet),
            inflationVJ: round(entry?.inflationVJ, 6),
            adjPct: round(entry?.adjPct, 6),
            vpwFallbackHint: entry?.vpwFallbackHint ?? null
        },
        row: {
            action: row.aktionUndGrund ?? null,
            regime: row.Regime ?? null,
            withdrawal: round(entry?.entscheidung?.jahresEntnahme),
            reductionPct: round(entry?.entscheidung?.kuerzungProzent, 6),
            tax: round(row.steuern_gesamt),
            portfolioTotalEnd: round(row.portfolio_total_end),
            portfolioFlowDelta: round(row.portfolio_flow_delta, 6),
            equityReturnRatio: round(row.NominalReturnEquityPct, 9),
            goldReturnRatio: round(row.NominalReturnGoldPct, 9),
            healthBucketEnabled: row.health_bucket_enabled ?? null,
            healthBucketEnd: round(row.health_bucket_end),
            healthBucketCoveragePct: round(row.health_bucket_real_coverage_pct, 6),
            healthBucketTargetGap: round(row.health_bucket_target_gap)
        }
    };
}

function observeOutcome({ data, rows, alerts, requestedYears, uiStatus }) {
    if (typeof data?.outcome?.kind === 'string') return data.outcome.kind;
    if (uiStatus?.code === 'BACKTEST_PERIOD_INVALID') return 'validation_inline';
    if (alerts.length > 0) return 'validation_alert_legacy';
    if (rows.some(entry => entry?.row?.Regime === 'BANKRUPT')) return 'ruin_legacy';
    if (rows.length === 0) return 'empty_result_rendered_as_completed_legacy';
    if (rows.length < requestedYears) return 'partial_result_rendered_as_completed_legacy';
    return 'completed_legacy';
}

function projectScenario({ id, oracleClass = 'target_expected', inputs, data, alerts, summaryHtml, uiStatus, expectedRowCount, notes = [] }) {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const requestedYears = Number.isInteger(Number(inputs?.__periodEnd)) && Number.isInteger(Number(inputs?.__periodStart))
        ? Number(inputs.__periodEnd) - Number(inputs.__periodStart) + 1
        : null;
    const normalizedInputs = { ...inputs };
    delete normalizedInputs.__periodStart;
    delete normalizedInputs.__periodEnd;
    const periodIdentity = {
        startYear: inputs.__periodStart,
        endYear: inputs.__periodEnd,
        requestedYears
    };
    const reductions = computeReductionMetrics(rows);
    const finiteFlowDeltas = rows
        .map(entry => Number(entry?.row?.portfolio_flow_delta))
        .filter(Number.isFinite)
        .map(Math.abs);
    const wrapperTotals = rows
        .map(entry => (Number(entry?.wertAktien) || 0) + (Number(entry?.wertGold) || 0) + (Number(entry?.liquiditaet) || 0))
        .filter(Number.isFinite);
    const finiteRunwayCoverage = rows
        .map(entry => Number(entry?.row?.RunwayCoveragePct))
        .filter(Number.isFinite);
    let runningPeak = Number(normalizedInputs.startVermoegen) || 0;
    let maxDrawdownPct = 0;
    for (const wrapperTotal of wrapperTotals) {
        runningPeak = Math.max(runningPeak, wrapperTotal);
        if (runningPeak > 0) {
            maxDrawdownPct = Math.max(maxDrawdownPct, ((runningPeak - wrapperTotal) / runningPeak) * 100);
        }
    }
    const last = rows.at(-1);
    const wrapperEnd = last
        ? (Number(last.wertAktien) || 0) + (Number(last.wertGold) || 0) + (Number(last.liquiditaet) || 0)
        : null;
    return {
        id,
        oracleClass,
        notes,
        inputHash: stableHash({
            inputs: normalizedInputs,
            period: periodIdentity
        }),
        inputs: normalizedInputs,
        period: periodIdentity,
        expectedRowCount,
        observedRowCount: rows.length,
        canonicalRowsHash: stableHash(rows),
        outcomeObservation: observeOutcome({ data, rows, alerts, requestedYears, uiStatus }),
        uiStatus,
        alerts,
        values: {
            startWealth: round(normalizedInputs.startVermoegen),
            summaryEndWealth: round(parseSummaryCurrency(summaryHtml, 'Endvermögen')),
            lastWrapperPortfolio: round(wrapperEnd),
            lastRowPortfolioTotalEnd: round(last?.row?.portfolio_total_end),
            totalWithdrawal: round(rows.reduce((sum, entry) => sum + (Number(entry?.entscheidung?.jahresEntnahme) || 0), 0)),
            totalTax: round(rows.reduce((sum, entry) => sum + (Number(entry?.row?.steuern_gesamt) || 0), 0)),
            yearsWithReductionAtLeast10Pct: reductions.count,
            maxReductionStreak: reductions.maxStreak,
            maxDrawdownPct: round(maxDrawdownPct, 6),
            minRunwayCoveragePct: finiteRunwayCoverage.length > 0
                ? round(Math.min(...finiteRunwayCoverage), 6)
                : null,
            maxAbsolutePortfolioFlowDelta: round(Math.max(0, ...finiteFlowDeltas), 6)
        },
        summaryText: summaryText(summaryHtml),
        rowSamples: rows.length <= 4
            ? rows.map(projectRow)
            : [projectRow(rows[0]), projectRow(rows[1]), projectRow(rows.at(-2)), projectRow(rows.at(-1))]
    };
}

function installBacktestDataCapture(onAssign = null) {
    let captured = null;
    delete global.window.globalBacktestData;
    Object.defineProperty(global.window, 'globalBacktestData', {
        configurable: true,
        enumerable: true,
        get: () => captured,
        set: value => {
            if (typeof onAssign === 'function') onAssign(value);
            captured = value;
        }
    });
    return () => captured;
}

function runScenario({
    id,
    values = {},
    checkedIds = [],
    expectedRowCount,
    detailledTranches = null,
    historicalDataProvider = null,
    historicalMutation = null,
    onAssign = null,
    projectionOverride = null,
    notes = [],
    oracleClass = 'legacy_observed',
    detailLevel = 'normal'
}) {
    const doc = createMockDocument(values, checkedIds);
    global.document = doc;
    global.localStorage.clear();
    global.localStorage.setItem('backtestLogDetailLevel', detailLevel);
    global.window.__profilverbundPreferAggregates = !Array.isArray(detailledTranches);
    global.window.__profilverbundTranchenOverride = Array.isArray(detailledTranches) ? detailledTranches : null;
    global.window.__profilverbundMinimumFlexProfiles = null;
    const periodStart = Number.parseInt(doc.getElementById('simStartJahr').value, 10);
    const periodEnd = Number.parseInt(doc.getElementById('simEndJahr').value, 10);
    const inputBefore = getCommonInputs();
    const inputElementIds = Array.from(doc.__elements.keys());
    const domBefore = snapshotDom(doc, inputElementIds);
    const tranchesBefore = stableStringify(detailledTranches);
    const historicalHashBefore = stableHash(HISTORICAL_DATA);
    const alerts = [];
    global.alert = message => { alerts.push(String(message)); };
    const getCaptured = installBacktestDataCapture(onAssign);
    const restoreHistorical = historicalMutation ? historicalMutation() : () => {};
    try {
        runBacktest(historicalDataProvider ? { historicalDataProvider } : {});
    } finally {
        restoreHistorical();
    }
    const inputAfter = getCommonInputs();
    assertEqual(stableStringify(inputAfter), stableStringify(inputBefore), `${id}: parsed caller inputs must not mutate`);
    assertEqual(stableStringify(snapshotDom(doc, inputElementIds)), stableStringify(domBefore), `${id}: DOM input values must not mutate`);
    assertEqual(stableStringify(detailledTranches), tranchesBefore, `${id}: detail tranches must not mutate`);
    assertEqual(stableHash(HISTORICAL_DATA), historicalHashBefore, `${id}: HISTORICAL_DATA must be restored and unmodified`);
    const capturedData = getCaptured();
    const capturedSummaryHtml = doc.getElementById('simulationSummary').innerHTML;
    const statusElement = doc.getElementById('backtestStatus');
    const statusText = summaryText(statusElement.innerHTML);
    const uiStatus = {
        kind: statusElement.dataset?.status || null,
        code: statusText.match(/Code:\s*([A-Za-z0-9_.-]+)/)?.[1] || null,
        text: statusText
    };
    const projection = typeof projectionOverride === 'function'
        ? projectionOverride({ data: capturedData, summaryHtml: capturedSummaryHtml })
        : { data: capturedData, summaryHtml: capturedSummaryHtml };
    return projectScenario({
        id,
        oracleClass,
        inputs: { ...inputBefore, __periodStart: periodStart, __periodEnd: periodEnd },
        data: projection.data,
        alerts,
        summaryHtml: projection.summaryHtml,
        uiStatus,
        expectedRowCount,
        notes
    });
}

function buildHealthBucketLogRow() {
    const inputs = {
        startAlter: 65,
        rentAdjPct: 0,
        accumulationPhase: { enabled: false },
        zielLiquiditaet: 0,
        startFloorBedarf: 24000,
        startFlexBedarf: 0,
        goldAktiv: false,
        partner: { aktiv: false },
        targetEq: 90,
        startSPB: 1000,
        marketCapeRatio: 20,
        risikoprofil: 'sicherheits-dynamisch',
        kirchensteuerSatz: 0,
        rebalBand: 20,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        healthBucketEnabled: true,
        healthBucket: {
            enabled: true,
            initialAmount: 20000,
            assetSource: 'money_market_first_then_cash',
            triggerMinGrade: 4,
            triggerMode: 'OR',
            coverageMode: 'care_additional_floor_only',
            returnMode: 'cash_return',
            targetMode: 'inflation_indexed_diagnostic'
        }
    };
    const careMeta = {
        active: true,
        grade: 4,
        gradeLabel: 'Pflegegrad 4',
        zusatzFloorZiel: 12000,
        zusatzFloorDelta: 12000,
        flexFactor: 0.2
    };
    const state = {
        portfolio: {
            depotTranchesAktien: [{ marketValue: 100000, costBasis: 90000, type: 'aktien_alt', category: 'equity' }],
            depotTranchesGold: [],
            healthBucketConfig: inputs.healthBucket,
            healthBucketGeldmarkt: 20000,
            healthBucketTranches: [
                { trancheId: 'hb-care', marketValue: 20000, costBasis: 20000, type: 'geldmarkt', category: 'money_market' }
            ],
            healthBucketCashAmount: 0,
            liquiditaet: 0
        },
        baseFloor: 24000,
        baseFlex: 0,
        lastState: null,
        currentAnnualPension: 0,
        marketDataHist: { endeVJ: 100, endeVJ_1: 90, endeVJ_2: 80, ath: 100, jahreSeitAth: 0, capeRatio: 20 },
        widowPensionP1: 0,
        widowPensionP2: 0
    };
    const result = simulateOneYear(
        state,
        inputs,
        { jahr: 2000, rendite: 0, inflation: 2, zinssatz: 0, gold_eur_perf: 0 },
        0,
        careMeta,
        12000,
        {
            p1Alive: true,
            p2Alive: false,
            widowBenefits: { p1FromP2: false, p2FromP1: false },
            care: { p1: careMeta, p2: null }
        }
    );
    assert(!result.isRuin, 'health projection fixture must create a real non-ruin engine row');
    assert(result.logData.health_bucket_enabled === true, 'health projection fixture must expose an enabled bucket row');
    return result.logData;
}

function buildAlignmentOracle() {
    const years = [2000, 2001];
    return years.map(year => {
        const previous = HISTORICAL_DATA[year - 1];
        const current = HISTORICAL_DATA[year];
        const mc = annualData.find(entry => entry.jahr === year);
        return {
            year,
            legacyBacktest: {
                equity: {
                    sourceYears: [year - 1, year],
                    valueRatio: round((current.global_equity_research_index - previous.global_equity_research_index) / previous.global_equity_research_index, 12)
                },
                gold: { sourceYear: year - 1, valuePct: previous.gold_eur_perf },
                inflation: { sourceYear: year - 1, valuePct: previous.inflation_de },
                interest: { sourceYear: year - 1, valuePct: previous.zinssatz_de },
                wageAdjustment: { sourceYear: year, valuePct: current.lohn_de },
                cape: { sourceYear: year - 1, value: previous.cape }
            },
            activeMonteCarloAnnualData: {
                sourceYear: year,
                equityReturnRatio: round(mc?.rendite, 12),
                goldPct: mc?.gold_eur_perf ?? null,
                inflationPct: mc?.inflation ?? null,
                interestPct: mc?.zinssatz ?? null,
                wagePct: mc?.lohn ?? null,
                cape: mc?.capeRatio ?? null
            },
            targetExpected: {
                temporalConventionId: 'realized_t_decision_t_minus_1_v1',
                equity: {
                    sourceYears: [year - 1, year],
                    valueRatio: round((current.global_equity_research_index - previous.global_equity_research_index) / previous.global_equity_research_index, 12)
                },
                gold: { sourceYear: year, valuePct: current.gold_eur_perf },
                inflation: { sourceYear: year, valuePct: current.inflation_de },
                interest: { sourceYear: year, valuePct: current.zinssatz_de },
                wageAdjustment: { sourceYear: year, valuePct: current.lohn_de },
                cape: { sourceYear: year - 1, asOfYear: year - 1, value: previous.cape }
            }
        };
    });
}

function buildTargetDeltaReport(legacy, target) {
    const metricKeys = [
        'summaryEndWealth',
        'lastWrapperPortfolio',
        'lastRowPortfolioTotalEnd',
        'totalWithdrawal',
        'totalTax',
        'yearsWithReductionAtLeast10Pct',
        'maxReductionStreak',
        'maxAbsolutePortfolioFlowDelta'
    ];
    const legacyCases = new Map((legacy.cases || []).map(entry => [entry.id, entry]));
    const caseDeltas = (target.cases || []).map(entry => {
        const before = legacyCases.get(entry.id);
        const metricDeltas = Object.fromEntries(metricKeys.flatMap(key => {
            const legacyValue = before?.values?.[key] ?? null;
            const targetValue = entry?.values?.[key] ?? null;
            if (stableStringify(legacyValue) === stableStringify(targetValue)) return [];
            return [[key, {
                legacyObserved: legacyValue,
                targetExpected: targetValue,
                numericDelta: Number.isFinite(legacyValue) && Number.isFinite(targetValue)
                    ? round(targetValue - legacyValue, 6)
                    : null,
                cause: before
                    ? 'D-01 realized fields use source year t; CAPE remains decision-as-of t-1'
                    : 'Slice 05 adds a real gold-holding reference scenario to the target contract'
            }]];
        }));
        return {
            id: entry.id,
            legacyOutcome: before?.outcomeObservation ?? null,
            targetOutcome: entry.outcomeObservation,
            rowProjectionChanged: before?.canonicalRowsHash !== entry.canonicalRowsHash,
            rowProjectionCause: before?.canonicalRowsHash !== entry.canonicalRowsHash
                ? (before
                    ? 'D-01 time-axis alignment and signed negative-cash-interest reconciliation'
                    : 'Slice 05 adds a real gold-holding reference scenario to the target contract')
                : null,
            metricDeltas
        };
    });
    const legacyNegative = new Map((legacy.negativeCases || []).map(entry => [entry.id, entry]));
    const negativeCaseDeltas = (target.negativeCases || []).map(entry => {
        const before = legacyNegative.get(entry.id);
        const changed = before?.canonicalRowsHash !== entry.canonicalRowsHash
            || before?.outcomeObservation !== entry.outcomeObservation
            || before?.observedRowCount !== entry.observedRowCount;
        const cause = entry.id === 'negative_single_year_2010'
            ? 'D-02 complete one-year periods are valid'
            : entry.id.includes('missing_middle_year') || entry.id.includes('non_finite')
                ? 'The embedded provider is validated and snapshotted before caller-side mutation; direct incomplete/error contracts are covered by focused runner tests'
                : 'Strict manifest-derived period validation';
        return {
            id: entry.id,
            changed,
            cause: changed ? cause : null,
            legacyOutcome: before?.outcomeObservation ?? null,
            targetOutcome: entry.outcomeObservation,
            legacyRows: before?.observedRowCount ?? null,
            targetRows: entry.observedRowCount
        };
    });
    const countRuin = entries => entries.filter(entry => ['ruin', 'ruin_legacy'].includes(entry.outcomeObservation)).length;
    return {
        schemaVersion: 'BacktestTemporalDeltaReportV1',
        legacyFixture: 'simulator-backtest-baseline-v1.json',
        targetFixture: 'simulator-backtest-target-v1.json',
        temporalConventionId: 'realized_t_decision_t_minus_1_v1',
        caseDeltas,
        negativeCaseDeltas,
        impactAnalysis: {
            historicalEndWealth: caseDeltas.map(entry => ({
                id: entry.id,
                delta: entry.metricDeltas.summaryEndWealth || null
            })),
            ruinFrequency: {
                denominator: target.cases.length,
                legacyRuinCases: countRuin(legacy.cases || []),
                targetRuinCases: countRuin(target.cases || [])
            },
            downstreamConsumers: {
                autoOptimizer: {
                    directBacktestConsumer: false,
                    expectedImpact: 'none; no production reference to runHistoricalBacktest or globalBacktestData'
                },
                riskProfiles: {
                    directBacktestConsumer: false,
                    expectedImpact: 'none; no production reference to runHistoricalBacktest or globalBacktestData'
                },
                monteCarloSweepWorker: {
                    recordPathChanged: false,
                    expectedImpact: 'none; parity regression gates remain mandatory'
                }
            }
        }
    };
}

function buildLegacySchemaOracle(data) {
    const first = data?.rows?.[0] || {};
    return {
        schemaId: 'backtest_ui_state_v1',
        topLevelFields: Object.keys(data || {}).sort(),
        topLevelTypes: Object.fromEntries(Object.entries(data || {}).map(([key, value]) => [
            key,
            Array.isArray(value) ? 'array' : typeof value
        ])),
        rowWrapperFields: Object.keys(first).sort(),
        nestedRowFields: Object.keys(first.row || {}).sort(),
        canonicalResultSchemaVersion: data?.result?.schemaVersion || null,
        canonicalResultFrozen: Object.isFrozen(data?.result),
        canonicalRowsSharedByIdentity: data?.result?.rows === data?.rows,
        detailToggleDependency: 'canonical row payload and raw export are stable; only rendered display columns depend on backtestLogDetailLevel',
        fieldsOwnedByRawExport: ['identifiers.requestId', 'identifiers.runId', 'fingerprint', 'exportedAt']
    };
}

function buildReductionBoundaryOracle(source) {
    return {
        id: 'reduction_exactly_10pct_canonical_boundary',
        oracleClass: 'target_expected',
        syntheticDecisionPct: 10,
        countedByLegacyOperator: 10 >= 10,
        counterExpressionPresent: /entscheidung\.kuerzungProzent\s*>=\s*10/.test(source),
        contradictorySummaryLabelPresent: /Jahre mit Kürzung \(>10%\)/.test(source),
        canonicalSummaryLabelPresent: /Jahre mit Kürzung \(≥ 10 %\)/.test(source),
        targetExpected: {
            operator: '>=',
            includesExactThreshold: true,
            label: 'Jahre mit Kürzung (≥ 10 %)'
        },
        note: 'Slice 06 resolves the legacy operator/label contradiction in favor of the inclusive >= 10 percent contract.'
    };
}

function collectDiffs(expected, actual, pathPrefix = '') {
    if (stableStringify(expected) === stableStringify(actual)) return [];
    const expectedObject = expected && typeof expected === 'object';
    const actualObject = actual && typeof actual === 'object';
    if (!expectedObject || !actualObject || Array.isArray(expected) !== Array.isArray(actual)) {
        return [{ path: pathPrefix || '$', expected, actual }];
    }
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    return Array.from(keys).sort().flatMap(key => collectDiffs(
        expected[key],
        actual[key],
        pathPrefix ? `${pathPrefix}.${key}` : key
    ));
}

const previousGlobals = {
    document: global.document,
    window: global.window,
    localStorage: global.localStorage,
    alert: global.alert
};

try {
    global.localStorage = createLocalStorageMock();
    global.window = { EngineAPI };
    global.alert = () => {};

    const detailTranches = [
        {
            trancheId: 'baseline:eq-old',
            sourceProfileId: 'baseline',
            marketValue: 1900000,
            costBasis: 1500000,
            shares: 1000,
            purchasePrice: 1500,
            currentPrice: 1900,
            purchaseDate: '1990-01-01',
            type: 'aktien_alt',
            category: 'equity',
            tqf: 0.3
        },
        {
            trancheId: 'baseline:cash',
            sourceProfileId: 'baseline',
            marketValue: 100000,
            costBasis: 100000,
            shares: 1000,
            purchasePrice: 100,
            currentPrice: 100,
            purchaseDate: '1999-01-01',
            type: 'geldmarkt',
            category: 'money_market',
            tqf: 0
        }
    ];

    const goldDetailTranches = [
        {
            trancheId: 'gold-reference:eq-old',
            sourceProfileId: 'gold-reference',
            marketValue: 1700000,
            costBasis: 1350000,
            shares: 1000,
            purchasePrice: 1350,
            currentPrice: 1700,
            purchaseDate: '1990-01-01',
            type: 'aktien_alt',
            category: 'equity',
            tqf: 0.3
        },
        {
            trancheId: 'gold-reference:gold',
            sourceProfileId: 'gold-reference',
            marketValue: 200000,
            costBasis: 180000,
            shares: 100,
            purchasePrice: 1800,
            currentPrice: 2000,
            purchaseDate: '1999-01-01',
            type: 'gold',
            category: 'gold',
            tqf: 1
        },
        {
            trancheId: 'gold-reference:cash',
            sourceProfileId: 'gold-reference',
            marketValue: 100000,
            costBasis: 100000,
            shares: 1000,
            purchasePrice: 100,
            currentPrice: 100,
            purchaseDate: '1999-01-01',
            type: 'geldmarkt',
            category: 'money_market',
            tqf: 0
        }
    ];

    const completedShort = runScenario({
        id: 'completed_2000_2005',
        values: { simStartJahr: 2000, simEndJahr: 2005 },
        expectedRowCount: 6,
        detailledTranches: detailTranches,
        notes: ['Canonical short completed path and detail-tranche non-mutation sentinel.']
    });
    const completedShortDetailed = runScenario({
        id: 'completed_2000_2005_detailed_projection_probe',
        values: { simStartJahr: 2000, simEndJahr: 2005 },
        expectedRowCount: 6,
        detailledTranches: detailTranches,
        detailLevel: 'detailed',
        notes: ['Detail-toggle probe; not a separate versioned business scenario.']
    });
    const goldHoldingScenario = {
        id: 'gold_holding_2000_2005',
        values: {
            simStartJahr: 2000,
            simEndJahr: 2005,
            goldAllokationAktiv: 'true',
            goldAllokationProzent: 10,
            goldFloorProzent: 0,
            goldSteuerfrei: 'true'
        },
        expectedRowCount: 6,
        detailledTranches: goldDetailTranches,
        oracleClass: 'target_expected',
        notes: ['Real six-year UI/backtest gold-holding sentinel for the Slice-04 to Slice-05 data-chain delta.']
    };
    const goldHoldingBefore = runScenario({
        ...goldHoldingScenario,
        historicalDataProvider: createSlice04GoldReferenceProvider()
    });
    const goldHoldingAfter = runScenario(goldHoldingScenario);
    const goldDataDeltaOracle = {
        scenarioId: goldHoldingAfter.id,
        period: goldHoldingAfter.period,
        cause: 'gold_german_investor_chain',
        beforeProvider: {
            revision: 'slice-04-gold-reference-2000-2005',
            annualReturnsPct: SLICE_04_GOLD_RETURNS_2000_2005
        },
        afterProvider: {
            revision: HISTORICAL_DATA_MANIFEST.revision,
            contentHash: HISTORICAL_DATA_MANIFEST.contentHash.value
        },
        outcome: {
            before: goldHoldingBefore.outcomeObservation,
            after: goldHoldingAfter.outcomeObservation
        },
        canonicalRowsHash: {
            before: goldHoldingBefore.canonicalRowsHash,
            after: goldHoldingAfter.canonicalRowsHash,
            changed: goldHoldingBefore.canonicalRowsHash !== goldHoldingAfter.canonicalRowsHash
        },
        financialMetrics: Object.fromEntries(FINANCIAL_DELTA_METRICS.map(metricName => {
            const before = goldHoldingBefore.values[metricName];
            const after = goldHoldingAfter.values[metricName];
            return [metricName, {
                before,
                after,
                delta: before === null || after === null ? null : round(after - before, 9)
            }];
        }))
    };
    const completedLong = runScenario({
        id: 'completed_1960_2020',
        values: { simStartJahr: 1960, simEndJahr: 2020, p1StartAlter: 18 },
        expectedRowCount: 61,
        notes: ['Long-horizon regression sentinel.']
    });
    const completedNumeraireSeam = runScenario({
        id: 'completed_numeraire_seam_1949_1952',
        values: { simStartJahr: 1949, simEndJahr: 1952, p1StartAlter: 18 },
        expectedRowCount: 4,
        notes: [
            'Regression sentinel across the USD-through-1950 to German-investor-currency-from-1951 seam.'
        ]
    });
    let pensionWealthOracle = null;
    const pensionWealthProbe = runScenario({
        id: 'active_pension_wealth_reduction_2000_2001',
        values: {
            simStartJahr: 2000,
            simEndJahr: 2001,
            simStartVermoegen: 950000,
            depotwertAlt: 930000,
            einstandAlt: 800000,
            tagesgeld: 20000,
            startFloorBedarf: 24000,
            startFlexBedarf: 12000,
            p1Monatsrente: 1000,
            p1StartInJahren: 0
        },
        expectedRowCount: 2,
        projectionOverride: ({ data, summaryHtml }) => {
            const firstRow = data?.rows?.[0]?.row;
            const depotAfterReturn = (Number(firstRow?.eq_after_return) || 0)
                + (Number(firstRow?.gold_after_return) || 0);
            const netNeedAnnual = (Number(firstRow?.floor_aus_depot) || 0)
                + (Number(firstRow?.flex_brutto) || 0);
            const pensionAnnual = Number(firstRow?.pension_annual) || 0;
            const expectedQuotePct = depotAfterReturn > 0
                ? (netNeedAnnual / depotAfterReturn) * 100
                : null;
            const doubleSubtractQuotePct = depotAfterReturn > 0
                ? (Math.max(0, netNeedAnnual - pensionAnnual) / depotAfterReturn) * 100
                : null;
            const safeRate = CONFIG.SPENDING_MODEL.WEALTH_ADJUSTED_REDUCTION.SAFE_WITHDRAWAL_RATE;
            const fullRate = CONFIG.SPENDING_MODEL.WEALTH_ADJUSTED_REDUCTION.FULL_WITHDRAWAL_RATE;
            const linearT = Math.min(1, Math.max(0, ((expectedQuotePct / 100) - safeRate) / (fullRate - safeRate)));
            const expectedFactorPct = linearT * linearT * (3 - (2 * linearT)) * 100;

            assertEqual(pensionAnnual, 12000, 'Active-pension backtest must pass 12,000 EUR annual pension into the engine');
            assertClose(firstRow.WealthQuoteUsedPct, expectedQuotePct, 0.000001, 'Backtest wealth quote must use the pension-netted need exactly once');
            assertClose(firstRow.WealthRedF, expectedFactorPct, 0.000001, 'Backtest wealth factor must match the pension-netted quote');
            assert(
                Math.abs(firstRow.WealthQuoteUsedPct - doubleSubtractQuotePct) > 0.5,
                'Backtest oracle must distinguish the corrected quote from the former double-pension subtraction'
            );

            pensionWealthOracle = {
                scenarioId: 'active_pension_wealth_reduction_2000_2001',
                firstYear: data.rows[0].jahr,
                pensionAnnual: round(pensionAnnual),
                netNeedAnnual: round(netNeedAnnual),
                depotAfterReturn: round(depotAfterReturn),
                expectedQuotePct: round(expectedQuotePct, 6),
                observedQuotePct: round(firstRow.WealthQuoteUsedPct, 6),
                formerDoubleSubtractQuotePct: round(doubleSubtractQuotePct, 6),
                expectedWealthFactorPct: round(expectedFactorPct, 6),
                observedWealthFactorPct: round(firstRow.WealthRedF, 6)
            };
            return { data, summaryHtml };
        },
        oracleClass: 'target_expected',
        notes: ['Integrated core-to-backtest sentinel for pension netting and wealth reduction.']
    });
    const threeBucketMinimumFlex = runScenario({
        id: 'three_bucket_minimum_flex_2005_2014',
        values: {
            simStartJahr: 2005,
            simEndJahr: 2014,
            simStartVermoegen: 500000,
            depotwertAlt: 360000,
            einstandAlt: 300000,
            tagesgeld: 20000,
            geldmarktEtf: 120000,
            startFlexBedarf: 12000,
            minimumFlexAnnual: 9000,
            marketCapeRatio: 35,
            entnahmeStrategie: '3_bucket_jilge'
        },
        expectedRowCount: 10,
        notes: ['Three-bucket accounting and minimum-flex characterization.']
    });
    const ruin = runScenario({
        id: 'capital_poor_ruin_2000_2005',
        values: {
            simStartJahr: 2000,
            simEndJahr: 2005,
            simStartVermoegen: 120000,
            depotwertAlt: 100000,
            einstandAlt: 90000,
            tagesgeld: 20000,
            startFloorBedarf: 90000,
            startFlexBedarf: 0
        },
        expectedRowCount: 2,
        oracleClass: 'legacy_observed_gap',
        notes: ['Ruin row and summary use the same terminal portfolio state from the ruin year.']
    });
    const healthLogRow = buildHealthBucketLogRow();
    const healthBucketProjection = runScenario({
        id: 'health_bucket_nested_row_summary_positive',
        values: { simStartJahr: 2010, simEndJahr: 2011 },
        expectedRowCount: 2,
        onAssign: data => {
            assert(Object.isFrozen(data?.result), 'canonical result blocks legacy post-run row injection');
            assert(data?.result?.rows === data?.rows, 'UI state shares the canonical immutable row array');
        },
        projectionOverride: ({ data, summaryHtml }) => {
            const rows = data.rows.map(entry => ({ ...entry }));
            rows[rows.length - 1] = { ...rows.at(-1), row: healthLogRow };
            const bucketHtml = `
                <div class="summary-item"><strong>Pflegebucket</strong><span>${formatCurrency(healthLogRow.health_bucket_end)}</span></div>
                <div class="summary-item"><strong>Pflegebucket-Zieldeckung</strong><span>${formatPercentValue(healthLogRow.health_bucket_real_coverage_pct, { fractionDigits: 0, invalid: '—' })}</span></div>
                <div class="summary-item"><strong>Pflegebucket-Ziellücke</strong><span>${formatCurrency(healthLogRow.health_bucket_target_gap)}</span></div>`;
            return {
                data: { ...data, rows },
                summaryHtml: summaryHtml.replace(/\s*<\/div>\s*$/, `${bucketHtml}\n</div>`)
            };
        },
        oracleClass: 'target_expected',
        notes: [
            'The real engine health-bucket row is validated separately before this scenario.',
            'The canonical UI/export state is immutable and rejects the former post-run row-injection test hook.'
        ]
    });
    const dynamicFlexCape = runScenario({
        id: 'dynamic_flex_cape_2010_2013',
        values: {
            simStartJahr: 2010,
            simEndJahr: 2013,
            marketCapeRatio: 20,
            horizonMethod: 'mean',
            horizonYears: 20
        },
        checkedIds: ['dynamicFlex'],
        expectedRowCount: 4,
        notes: ['VPW/CAPE payload and yearly horizon characterization.']
    });

    const invalidSingleYear = runScenario({
        id: 'negative_single_year_2010',
        values: { simStartJahr: 2010, simEndJahr: 2010 },
        expectedRowCount: 0,
        notes: ['Legacy rejects startYear === endYear.']
    });
    const invalidNanPeriod = runScenario({
        id: 'negative_nan_period',
        values: { simStartJahr: 'NaN', simEndJahr: 2012 },
        expectedRowCount: 0,
        notes: ['parseInt(NaN) passes legacy comparisons and produces an empty rendered result without an alert.']
    });
    const invalidReversePeriod = runScenario({
        id: 'negative_reverse_period_2012_2010',
        values: { simStartJahr: 2012, simEndJahr: 2010 },
        expectedRowCount: 0,
        notes: ['Legacy rejects reversed periods by alert.']
    });
    const missingMiddleYear = runScenario({
        id: 'negative_missing_middle_year_2000_2002',
        values: { simStartJahr: 2000, simEndJahr: 2002 },
        expectedRowCount: 1,
        historicalMutation: () => {
            const original = HISTORICAL_DATA[2001];
            delete HISTORICAL_DATA[2001];
            return () => { HISTORICAL_DATA[2001] = original; };
        },
        oracleClass: 'legacy_observed_gap',
        notes: ['Legacy continues across missing data and renders a partial run as completed.']
    });
    const nonFiniteReturn = runScenario({
        id: 'negative_non_finite_gold_return_2001_2002',
        values: { simStartJahr: 2001, simEndJahr: 2002 },
        expectedRowCount: 2,
        historicalMutation: () => {
            const original = HISTORICAL_DATA[2000];
            HISTORICAL_DATA[2000] = { ...original, gold_eur_perf: Number.NaN };
            return () => { HISTORICAL_DATA[2000] = original; };
        },
        oracleClass: 'legacy_observed_gap',
        notes: ['Legacy || 0 normalization silently turns a non-finite mandatory gold return into 0%.']
    });

    const backtestSource = [backtestSourcePath, backtestRunnerSourcePath]
        .map(sourcePath => fs.readFileSync(sourcePath, 'utf8'))
        .join('\n');
    const actual = {
        schemaVersion: 'simulator-backtest-target-v1',
        oracleClass: 'target_expected',
        generatedBy: 'tests/simulator-backtest-characterization.test.mjs',
        exclusions: ['timestamps', 'object identities', 'absolute local paths'],
        approvedContractChangePaths: ['alignmentOracle', 'cases', 'negativeCases', 'pensionWealthOracle', 'goldDataDeltaOracle'],
        metricDictionary: METRIC_DICTIONARY_V1,
        alignmentOracle: buildAlignmentOracle(),
        pensionWealthOracle,
        goldDataDeltaOracle,
        reductionBoundaryOracle: buildReductionBoundaryOracle(backtestSource),
        legacyGlobalSchema: buildLegacySchemaOracle(global.window.globalBacktestData),
        detailToggleOracle: {
            normalCanonicalRowsHash: completedShort.canonicalRowsHash,
            detailedCanonicalRowsHash: completedShortDetailed.canonicalRowsHash,
            payloadStable: completedShort.canonicalRowsHash === completedShortDetailed.canonicalRowsHash,
            projectionDependency: 'Only rendered columns change with backtestLogDetailLevel; canonical rows and raw JSON/CSV export do not.'
        },
        cases: [
            completedShort,
            goldHoldingAfter,
            completedLong,
            completedNumeraireSeam,
            threeBucketMinimumFlex,
            ruin,
            healthBucketProjection,
            dynamicFlexCape
        ].map(entry => ({ ...entry, oracleClass: 'target_expected' })),
        negativeCases: [
            invalidSingleYear,
            invalidNanPeriod,
            invalidReversePeriod,
            missingMiddleYear,
            nonFiniteReturn
        ].map(entry => ({ ...entry, oracleClass: 'target_expected' }))
    };

    assertEqual(actual.cases.length, 8, 'eight runtime characterization cases should be present');
    assertEqual(goldHoldingBefore.inputHash, goldHoldingAfter.inputHash, 'Gold before/after runs should use identical inputs and period');
    assertEqual(goldHoldingAfter.inputs.goldAktiv, true, 'Gold reference should activate the real gold path');
    assertEqual(goldHoldingBefore.observedRowCount, 6, 'Gold before reference should complete six years');
    assertEqual(goldHoldingAfter.observedRowCount, 6, 'Gold after reference should complete six years');
    assert(goldDataDeltaOracle.canonicalRowsHash.changed, 'Gold data replacement should change the real backtest rows');
    assert(
        Object.values(goldDataDeltaOracle.financialMetrics)
            .some(metric => Number.isFinite(metric.delta) && metric.delta !== 0),
        'Gold data replacement should change at least one contracted financial metric'
    );
    assert(
        goldDataDeltaOracle.financialMetrics.maxAbsolutePortfolioFlowDelta.before < 1
            && goldDataDeltaOracle.financialMetrics.maxAbsolutePortfolioFlowDelta.after < 1,
        'Gold before/after reference should keep FlowDelta below one euro'
    );
    assertEqual(pensionWealthProbe.observedRowCount, 2, 'active-pension integration probe should complete two backtest years');
    assert(pensionWealthOracle !== null, 'active-pension integration probe should publish its explicit oracle');
    assert(actual.reductionBoundaryOracle.countedByLegacyOperator, 'exact 10% must be counted by the legacy operator');
    assert(!actual.reductionBoundaryOracle.contradictorySummaryLabelPresent, 'legacy >10% label contradiction must be removed');
    assert(actual.reductionBoundaryOracle.canonicalSummaryLabelPresent, 'summary label must expose the inclusive ten-percent contract');
    assertEqual(actual.negativeCases.length, 5, 'five legacy negative cases should be present');
    assert(
        [...actual.cases, ...actual.negativeCases].every(testCase => testCase.oracleClass === 'target_expected'),
        'every case in the target fixture must be labeled target_expected'
    );
    assert(actual.cases.every(testCase => testCase.inputHash.length === 64), 'every runtime case should contain a canonical SHA-256 input hash');
    assertEqual(
        new Set(actual.cases.map(testCase => testCase.inputHash)).size,
        actual.cases.length,
        'period-aware input identities should distinguish every positive reference case'
    );
    assert(actual.cases.every(testCase => testCase.observedRowCount === testCase.expectedRowCount), 'positive runtime row counts should match the frozen contract');
    assert(actual.cases.every(testCase => testCase.values.maxAbsolutePortfolioFlowDelta < 1), 'positive baselines must keep FlowDelta below one euro');
    assert(actual.detailToggleOracle.payloadStable, 'normal and detailed rendering must retain the same canonical row payload');
    assert(ruin.outcomeObservation === 'ruin', 'capital-poor case must reach the canonical ruin outcome');
    assertClose(ruin.values.summaryEndWealth, ruin.values.lastWrapperPortfolio, 0.01, 'ruin summary must reconcile to terminal ruin-row wealth');
    assertClose(ruin.values.summaryEndWealth, ruin.values.lastRowPortfolioTotalEnd, 0.01, 'ruin summary must reconcile to the nested terminal total');
    assert(healthBucketProjection.rowSamples.at(-1).row.healthBucketEnabled === true, 'health projection fixture retains nested bucket values');
    assert(healthBucketProjection.summaryText.includes('Pflegebucket'), 'health projection fixture retains the bucket summary contract');
    assert(nonFiniteReturn.outcomeObservation === 'completed', 'provider snapshot keeps the caller-side non-finite mutation outside the prepared run');

    const legacyExpected = JSON.parse(fs.readFileSync(legacyFixturePath, 'utf8'));
    actual.deltaReport = buildTargetDeltaReport(legacyExpected, actual);
    assert(
        actual.deltaReport.caseDeltas.every(entry => Object.values(entry.metricDeltas).every(delta => Boolean(delta.cause))),
        'every changed target metric should have a machine-readable cause'
    );
    assertEqual(
        actual.deltaReport.impactAnalysis.ruinFrequency.targetRuinCases,
        actual.deltaReport.impactAnalysis.ruinFrequency.legacyRuinCases,
        'D-01 target should not silently change characterized ruin frequency'
    );

    if (UPDATE_TARGET) {
        fs.mkdirSync(path.dirname(targetFixturePath), { recursive: true });
        fs.writeFileSync(targetFixturePath, `${stableStringify(actual, 2)}\n`, 'utf8');
        console.log(`Updated ${path.relative(path.join(__dirname, '..'), targetFixturePath)}`);
    } else {
        const expected = JSON.parse(fs.readFileSync(targetFixturePath, 'utf8'));
        const unexpected = collectDiffs(expected, actual);
        if (unexpected.length > 0) {
            console.error('Unexpected backtest target deltas:');
            console.error(stableStringify(unexpected.slice(0, 20), 2));
        }
        assertEqual(unexpected.length, 0, 'target delta reporter should find no unexpected deltas');
    }

    console.log('✅ Simulator backtest characterization tests passed');
} finally {
    if (previousGlobals.document === undefined) delete global.document; else global.document = previousGlobals.document;
    if (previousGlobals.window === undefined) delete global.window; else global.window = previousGlobals.window;
    if (previousGlobals.localStorage === undefined) delete global.localStorage; else global.localStorage = previousGlobals.localStorage;
    if (previousGlobals.alert === undefined) delete global.alert; else global.alert = previousGlobals.alert;
}

console.log('--- Simulator Backtest Characterization Tests Completed ---');
