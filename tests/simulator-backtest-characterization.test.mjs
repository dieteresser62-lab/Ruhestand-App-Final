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
const slice06DeltaFixturePath = path.join(__dirname, 'fixtures', 'cape-wage-backtest-delta-v3.json');
const slice07DeltaFixturePath = path.join(__dirname, 'fixtures', 'demography-care-survivor-backtest-delta-v1.json');
const slice08MeasurementFixturePath = path.join(__dirname, 'fixtures', 'liquidity-runway-slice-08-measurement-v1.json');
const slice09MeasurementFixturePath = path.join(__dirname, 'fixtures', 'minimum-flex-slice-09-measurement-v1.json');
const slice09AddedCaseFinancialFixturePath = path.join(__dirname, 'fixtures', 'minimum-flex-slice-09-added-case-financial-v1.json');
const slice10MeasurementFixturePath = path.join(__dirname, 'fixtures', 'tax-logic-slice-10-backtest-measurement-v1.json');
const backtestSourcePath = path.join(__dirname, '..', 'app', 'simulator', 'simulator-backtest.js');
const backtestRunnerSourcePath = path.join(__dirname, '..', 'app', 'simulator', 'historical-backtest-runner.js');
const UPDATE_TARGET = process.env.UPDATE_BACKTEST_TARGET === '1';
const UPDATE_SLICE10_MEASUREMENT = process.env.UPDATE_BACKTEST_DATA_10 === '1';

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

const CAPE_DISABLED_ALLOWED_LEAF_PATHS = Object.freeze([
    'result.historicalYearRecords[].dataset.contentHash',
    'result.historicalYearRecords[].dataset.revision',
    'result.historicalYearRecords[].decisionAsOf.capeRatio.value',
    'result.request.dataset.contentHash',
    'result.request.dataset.manifestHash.value',
    'result.request.dataset.revision',
    'result.rows[].vpw.capeRatioUsed',
    'result.rows[].vpw.expectedReturnCape',
    'rows[].vpw.capeRatioUsed',
    'rows[].vpw.expectedReturnCape'
]);

const SLICE_04_GOLD_RETURNS_2000_2005 = Object.freeze({
    2000: -2.7,
    2001: 4.3,
    2002: 19.4,
    2003: 11.7,
    2004: 2.2,
    2005: 22.3
});
const SLICE_05_EFFECTIVE_CAPE_SIGNALS = Object.freeze(JSON.parse(fs.readFileSync(
    path.join(__dirname, 'fixtures', 'cape-effective-signals-slice-05-v1.json'),
    'utf8'
)));
const SLICE_05_WAGE_RATES_2000_2005 = Object.freeze({
    2000: 2.5,
    2001: 1.9,
    2002: 2.1,
    2003: 1.2,
    2004: 1.1,
    2005: 0.8
});
const SLICE_05_EARLY_WAGE_RATES_1925_1946 = Object.freeze(Object.fromEntries(
    Array.from({ length: 22 }, (_value, index) => [1925 + index, 3])
));

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

function createSlice05CapeWageReferenceProvider({
    cape = false,
    wage = false,
    wageRates = null,
    revision
}) {
    const records = Object.fromEntries(
        Object.entries(HISTORICAL_DATA).map(([year, record]) => [year, { ...record }])
    );
    if (cape) {
        for (const [year, value] of Object.entries(SLICE_05_EFFECTIVE_CAPE_SIGNALS)) {
            records[year] = { ...records[year], cape: value };
        }
    }
    const selectedWageRates = wageRates ?? (wage ? SLICE_05_WAGE_RATES_2000_2005 : null);
    if (selectedWageRates) {
        for (const [year, value] of Object.entries(selectedWageRates)) {
            records[year] = { ...records[year], lohn_de: value };
        }
    }
    const manifest = structuredClone(HISTORICAL_DATA_MANIFEST);
    manifest.revision = revision;
    manifest.contentHash.value = computeHistoricalDatasetHash(records);
    return createHistoricalBacktestContractProvider({ records, manifest });
}

function buildFinancialDataDeltaOracle({ scenarioId, cause, before, after, beforeProvider }) {
    return {
        scenarioId,
        cause,
        beforeProvider,
        afterProvider: {
            revision: HISTORICAL_DATA_MANIFEST.revision,
            contentHash: HISTORICAL_DATA_MANIFEST.contentHash.value
        },
        outcome: {
            before: before.outcomeObservation,
            after: after.outcomeObservation
        },
        canonicalRowsHash: {
            before: before.canonicalRowsHash,
            after: after.canonicalRowsHash,
            changed: before.canonicalRowsHash !== after.canonicalRowsHash
        },
        financialMetrics: Object.fromEntries(FINANCIAL_DELTA_METRICS.map(metricName => {
            const beforeValue = before.values[metricName];
            const afterValue = after.values[metricName];
            return [metricName, {
                before: beforeValue,
                after: afterValue,
                delta: beforeValue === null || afterValue === null ? null : round(afterValue - beforeValue, 9)
            }];
        }))
    };
}

function capeLegacyStepAssessment(capeRatio) {
    const valuation = CONFIG.MARKET_VALUATION;
    const signal = capeRatio >= valuation.EXTREME_OVERVALUED_CAPE
        ? 'extreme_overvalued'
        : capeRatio >= valuation.OVERVALUED_CAPE
            ? 'overvalued'
            : capeRatio <= valuation.UNDERVALUED_CAPE
                ? 'undervalued'
                : 'fair';
    return {
        signal,
        expectedReturn: valuation.EXPECTED_RETURN_BY_SIGNAL[signal]
    };
}

function buildCapeLegacyStepThresholdOracle() {
    const changes = [];
    for (let returnYear = 1926; returnYear <= 2025; returnYear += 1) {
        const beforeCape = SLICE_05_EFFECTIVE_CAPE_SIGNALS[returnYear];
        const afterCape = HISTORICAL_DATA[returnYear].cape;
        const beforeAssessment = capeLegacyStepAssessment(beforeCape);
        const afterAssessment = capeLegacyStepAssessment(afterCape);
        if (beforeAssessment.signal !== afterAssessment.signal
            || beforeAssessment.expectedReturn !== afterAssessment.expectedReturn) {
            changes.push({
                returnYear,
                beforeCape,
                afterCape,
                beforeSignal: beforeAssessment.signal,
                afterSignal: afterAssessment.signal,
                beforeExpectedReturn: beforeAssessment.expectedReturn,
                afterExpectedReturn: afterAssessment.expectedReturn
            });
        }
    }
    return {
        policy: 'legacy_step',
        comparisonStartYear: 1926,
        comparisonEndYear: 2025,
        comparisonYearCount: 100,
        changedYearCount: changes.length,
        unchangedYearCount: 100 - changes.length,
        changes
    };
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
    liquidityRunwayYears: 3,
    rebalancingBand: 25,
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
            healthBucketTargetGap: round(row.health_bucket_target_gap),
            minimumFlexAnnual: round(row.minimumFlexAnnual),
            minimumFlexStatus: row.minimumFlexStatus ?? null,
            minimumFlexEffectiveFinal: round(row.minimumFlexEffectiveFinal),
            minimumFlexShortfallAnnual: round(row.minimumFlexShortfallAnnual),
            householdFlexRequired: round(row.flex_brutto_haushalt),
            householdFlexFulfilled: round(row.flex_haushalt_erfuellt),
            householdFlexReductionPct: round(row.flex_haushalt_kuerzung_pct, 6)
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
        .map(entry => entry?.row?.RunwayCoveragePct)
        .filter(value => typeof value === 'number' && Number.isFinite(value));
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
        minimumFlexWitness: Object.fromEntries(
            [2001, 2005, 2009, 2010]
                .map(year => rows.find(entry => entry?.jahr === year))
                .filter(Boolean)
                .map(entry => [entry.jahr, {
                    minimumFlexAnnual: round(entry.row?.minimumFlexAnnual),
                    status: entry.row?.minimumFlexStatus ?? null,
                    effectiveFinal: round(entry.row?.minimumFlexEffectiveFinal),
                    shortfallAnnual: round(entry.row?.minimumFlexShortfallAnnual)
                }])
        ),
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
        startSPB: 1000,
        marketCapeRatio: 20,
        risikoprofil: 'sicherheits-dynamisch',
        kirchensteuerSatz: 0,
        rebalancingBand: 20,
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
                cape: {
                    sourceYear: year - 1,
                    observationYear: year - 1,
                    observationMonth: 12,
                    asOfYear: year - 1,
                    decisionYear: year,
                    value: current.cape
                }
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

function normalizeArrayIndices(pathValue) {
    return pathValue.replace(/\.\d+(?=\.|$)/g, '[]');
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

    let completedShortCapturedData = null;
    let completedShortCapeBeforeCapturedData = null;
    const completedShort = runScenario({
        id: 'completed_2000_2005',
        values: { simStartJahr: 2000, simEndJahr: 2005 },
        expectedRowCount: 6,
        detailledTranches: detailTranches,
        projectionOverride: ({ data, summaryHtml }) => {
            completedShortCapturedData = data;
            return { data, summaryHtml };
        },
        notes: ['Canonical short completed path and detail-tranche non-mutation sentinel.']
    });
    const completedShortCapeBefore = runScenario({
        id: 'completed_2000_2005',
        values: { simStartJahr: 2000, simEndJahr: 2005 },
        expectedRowCount: 6,
        detailledTranches: detailTranches,
        historicalDataProvider: createSlice05CapeWageReferenceProvider({
            cape: true,
            revision: 'slice-05-effective-cape-reference'
        }),
        projectionOverride: ({ data, summaryHtml }) => {
            completedShortCapeBeforeCapturedData = data;
            return { data, summaryHtml };
        },
        notes: ['Slice-05 effective CAPE reference for the Dynamic-Flex-disabled neutrality proof.']
    });
    const capeDisabledDeltaOracle = buildFinancialDataDeltaOracle({
        scenarioId: completedShort.id,
        cause: 'cape_chain_with_dynamic_flex_disabled',
        before: completedShortCapeBefore,
        after: completedShort,
        beforeProvider: {
            revision: 'slice-05-effective-cape-reference',
            effectiveDecisionSignals: SLICE_05_EFFECTIVE_CAPE_SIGNALS
        }
    });
    const capeDisabledLeafDiffs = collectDiffs(
        completedShortCapeBeforeCapturedData,
        completedShortCapturedData
    );
    const normalizedCapeDisabledLeafPaths = Array.from(new Set(
        capeDisabledLeafDiffs.map(entry => normalizeArrayIndices(entry.path))
    )).sort();
    capeDisabledDeltaOracle.leafFieldBoundary = {
        contract: 'Financial and outcome fields are invariant in this Dynamic-Flex-disabled scenario. Changes are limited to dataset provenance, the CAPE decision input and VPW CAPE inputs that are scenario-inactive here but causally active when Dynamic Flex is enabled.',
        changedLeafCount: capeDisabledLeafDiffs.length,
        changedLeafPaths: capeDisabledLeafDiffs.map(entry => entry.path),
        normalizedChangedLeafPaths: normalizedCapeDisabledLeafPaths,
        allowedNormalizedLeafPaths: [...CAPE_DISABLED_ALLOWED_LEAF_PATHS].sort(),
        scenarioInactiveVpwInputs: ['capeRatioUsed', 'expectedReturnCape'],
        unexpectedLeafPaths: normalizedCapeDisabledLeafPaths.filter(pathValue => !CAPE_DISABLED_ALLOWED_LEAF_PATHS.includes(pathValue))
    };
    if (process.env.PRINT_CAPE_DISABLED_LEAF_DIFFS === '1') {
        console.log('__CAPE_DISABLED_LEAF_DIFFS_START__');
        console.log(JSON.stringify(capeDisabledLeafDiffs, null, 2));
        console.log('__CAPE_DISABLED_LEAF_DIFFS_END__');
    }
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
    const wageActiveScenario = {
        id: 'wage_indexed_pension_2000_2005',
        values: {
            simStartJahr: 2000,
            simEndJahr: 2005,
            p1Monatsrente: 1500,
            p1StartInJahren: 0,
            rentAdjMode: 'wage',
            renteIndexierungsart: 'lohn'
        },
        expectedRowCount: 6,
        notes: ['Active wage-indexed pension sentinel for the Slice-05 to Slice-06 wage-chain delta.']
    };
    const wageActiveBefore = runScenario({
        ...wageActiveScenario,
        historicalDataProvider: createSlice05CapeWageReferenceProvider({
            wage: true,
            revision: 'slice-05-wage-reference-2000-2005'
        })
    });
    const wageActiveAfter = runScenario(wageActiveScenario);
    const wageDataDeltaOracle = buildFinancialDataDeltaOracle({
        scenarioId: wageActiveAfter.id,
        cause: 'german_gross_wage_growth_chain',
        before: wageActiveBefore,
        after: wageActiveAfter,
        beforeProvider: {
            revision: 'slice-05-wage-reference-2000-2005',
            annualGrowthPct: SLICE_05_WAGE_RATES_2000_2005
        }
    });
    const earlyWageScenarios = [
        {
            id: 'wage_indexed_pension_jst_1930_1940',
            values: {
                simStartJahr: 1930,
                simEndJahr: 1940,
                p1Monatsrente: 1500,
                p1StartInJahren: 0,
                rentAdjMode: 'wage',
                renteIndexierungsart: 'lohn'
            },
            expectedRowCount: 11,
            notes: ['Golden case for the large JST-versus-3-percent wage effect across depression and recovery years.']
        },
        {
            id: 'wage_indexed_pension_jst_1935_1946',
            values: {
                simStartJahr: 1935,
                simEndJahr: 1946,
                p1Monatsrente: 1500,
                p1StartInJahren: 0,
                rentAdjMode: 'wage',
                renteIndexierungsart: 'lohn'
            },
            expectedRowCount: 12,
            notes: ['Golden case for the qualitative reduction-year reversal caused by the early JST wage segment.']
        }
    ];
    const earlyWageComparisons = earlyWageScenarios.map(scenario => {
        const before = runScenario({
            ...scenario,
            historicalDataProvider: createSlice05CapeWageReferenceProvider({
                wageRates: SLICE_05_EARLY_WAGE_RATES_1925_1946,
                revision: `slice-05-constant-wage-reference-${scenario.values.simStartJahr}-${scenario.values.simEndJahr}`
            })
        });
        const after = runScenario(scenario);
        return {
            after,
            oracle: buildFinancialDataDeltaOracle({
                scenarioId: after.id,
                cause: 'german_gross_wage_growth_chain_jst_early_segment',
                before,
                after,
                beforeProvider: {
                    revision: `slice-05-constant-wage-reference-${scenario.values.simStartJahr}-${scenario.values.simEndJahr}`,
                    annualGrowthPct: SLICE_05_EARLY_WAGE_RATES_1925_1946,
                    supersededAssumption: 'constant_3_percent_1925_1946'
                }
            })
        };
    });
    const earlyWageCases = earlyWageComparisons.map(entry => entry.after);
    const earlyWageDataDeltaOracles = earlyWageComparisons.map(entry => entry.oracle);
    const wageSourceSeam = runScenario({
        id: 'wage_indexed_pension_source_seam_1944_1950',
        values: {
            simStartJahr: 1944,
            simEndJahr: 1950,
            p1Monatsrente: 1500,
            p1StartInJahren: 0,
            rentAdjMode: 'wage',
            renteIndexierungsart: 'lohn'
        },
        expectedRowCount: 7,
        notes: [
            'Golden case crossing the JST-through-1946 to published-Destatis-from-1947 source seam.',
            'The 1947 rate is consumed as its published year-t change; no cross-source level ratio is permitted.'
        ]
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
    const minimumFlexD17 = runScenario({
        id: 'minimum_flex_d17_2000_2010',
        values: {
            simStartJahr: 2000,
            simEndJahr: 2010,
            simStartVermoegen: 2000000,
            depotwertAlt: 1800000,
            einstandAlt: 1400000,
            tagesgeld: 200000,
            geldmarktEtf: 0,
            startFloorBedarf: 24000,
            startFlexBedarf: 12000,
            minimumFlexAnnual: 9000,
            flexBudgetAnnual: 6000,
            flexBudgetYears: 5,
            flexBudgetRecharge: 0
        },
        expectedRowCount: 11,
        notes: ['Slice-09 D-17 witness for 2001, 2005, 2009 and 2010.']
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
    const dynamicFlexCapeScenario = {
        id: 'dynamic_flex_cape_legacy_step_2018_2025',
        values: {
            simStartJahr: 2018,
            simEndJahr: 2025,
            marketCapeRatio: 20
        },
        checkedIds: ['dynamicFlex'],
        expectedRowCount: 8,
        notes: ['Released default legacy_step Dynamic-Flex/CAPE path across the strongest measured Slice-06 threshold-change window.']
    };
    assertEqual(CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY, 'legacy_step', 'Golden case must exercise the released Dynamic-Flex return policy');
    const dynamicFlexCapeBefore = runScenario({
        ...dynamicFlexCapeScenario,
        historicalDataProvider: createSlice05CapeWageReferenceProvider({
            cape: true,
            revision: 'slice-05-effective-cape-reference'
        })
    });
    const dynamicFlexCape = runScenario(dynamicFlexCapeScenario);
    const capeLegacyStepDeltaOracle = {
        returnPolicy: CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY,
        ...buildFinancialDataDeltaOracle({
        scenarioId: dynamicFlexCape.id,
        cause: 'cape_chain_with_dynamic_flex_enabled_default_legacy_step',
        before: dynamicFlexCapeBefore,
        after: dynamicFlexCape,
        beforeProvider: {
            revision: 'slice-05-effective-cape-reference',
            effectiveDecisionSignals: SLICE_05_EFFECTIVE_CAPE_SIGNALS
        }
        })
    };
    const capeLegacyStepThresholdOracle = buildCapeLegacyStepThresholdOracle();

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
        approvedContractChangePaths: [
            'alignmentOracle',
            'cases',
            'negativeCases',
            'pensionWealthOracle',
            'goldDataDeltaOracle',
            'capeDisabledDeltaOracle',
            'capeLegacyStepDeltaOracle',
            'capeLegacyStepThresholdOracle',
            'wageDataDeltaOracle',
            'earlyWageDataDeltaOracles'
        ],
        metricDictionary: METRIC_DICTIONARY_V1,
        alignmentOracle: buildAlignmentOracle(),
        pensionWealthOracle,
        goldDataDeltaOracle,
        capeDisabledDeltaOracle,
        capeLegacyStepDeltaOracle,
        capeLegacyStepThresholdOracle,
        wageDataDeltaOracle,
        earlyWageDataDeltaOracles,
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
            minimumFlexD17,
            ruin,
            healthBucketProjection,
            dynamicFlexCape,
            wageSourceSeam,
            ...earlyWageCases
        ].map(entry => ({ ...entry, oracleClass: 'target_expected' })),
        negativeCases: [
            invalidSingleYear,
            invalidNanPeriod,
            invalidReversePeriod,
            missingMiddleYear,
            nonFiniteReturn
        ].map(entry => ({ ...entry, oracleClass: 'target_expected' }))
    };

    assertEqual(actual.cases.length, 12, 'twelve runtime characterization cases including the Slice-09 D-17 witness should be present');
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
    assert(
        Object.values(capeDisabledDeltaOracle.financialMetrics)
            .every(metric => metric.delta === 0 || metric.delta === null),
        'CAPE-only replacement must be financially neutral while Dynamic Flex is disabled'
    );
    assertEqual(capeDisabledDeltaOracle.outcome.before, capeDisabledDeltaOracle.outcome.after, 'CAPE-disabled outcome must remain invariant');
    assertEqual(capeDisabledDeltaOracle.leafFieldBoundary.changedLeafCount, 35, 'CAPE-disabled full payload should retain the measured 35-leaf boundary');
    assertEqual(
        stableStringify(capeDisabledDeltaOracle.leafFieldBoundary.normalizedChangedLeafPaths),
        stableStringify(capeDisabledDeltaOracle.leafFieldBoundary.allowedNormalizedLeafPaths),
        'CAPE-disabled payload must not change a field outside the explicit provenance/input/diagnostic allowlist'
    );
    assertEqual(capeDisabledDeltaOracle.leafFieldBoundary.unexpectedLeafPaths.length, 0, 'CAPE-disabled payload should have no unexpected leaf changes');
    assert(
        Object.values(capeLegacyStepDeltaOracle.financialMetrics)
            .some(metric => Number.isFinite(metric.delta) && metric.delta !== 0),
        'CAPE-only replacement should be observable when Dynamic Flex is enabled'
    );
    assertEqual(capeLegacyStepDeltaOracle.returnPolicy, 'legacy_step', 'CAPE active delta must measure the released default policy');
    assertEqual(capeLegacyStepThresholdOracle.comparisonYearCount, 100, 'Legacy-step threshold oracle should cover every comparable decision year');
    assertEqual(capeLegacyStepThresholdOracle.changedYearCount, 21, 'CAPE replacement should retain the measured 21 legacy-step threshold changes');
    const threshold2023 = capeLegacyStepThresholdOracle.changes.find(entry => entry.returnYear === 2023);
    assertEqual(threshold2023?.beforeExpectedReturn, 0.04, '2023 baseline should use the extreme-overvaluation return step');
    assertEqual(threshold2023?.afterExpectedReturn, 0.07, '2023 target should use the fair-value return step');
    assert(
        Object.values(wageDataDeltaOracle.financialMetrics)
            .some(metric => Number.isFinite(metric.delta) && metric.delta !== 0),
        'Wage replacement should be observable when wage-indexed pension escalation is enabled'
    );
    assertEqual(earlyWageDataDeltaOracles.length, 2, 'Both early JST wage windows must have a delta oracle');
    assertEqual(wageSourceSeam.observedRowCount, 7, '1944-1950 wage source-seam case should emit every requested year');
    assertEqual(wageSourceSeam.outcomeObservation, 'completed', '1944-1950 wage source-seam case should complete');
    const earlyWage1930 = earlyWageDataDeltaOracles.find(entry => entry.scenarioId === 'wage_indexed_pension_jst_1930_1940');
    if (process.env.PRINT_BACKTEST_DATA_08 === '1') {
        console.log('__SLICE_08_EARLY_WAGE_ORACLES__');
        console.log(stableStringify(earlyWageDataDeltaOracles.map(entry => ({
            scenarioId: entry.scenarioId,
            financialMetrics: entry.financialMetrics
        })), 2));
    }
    assertEqual(earlyWage1930?.outcome.before, 'completed', '1930-1940 baseline should complete');
    assertEqual(earlyWage1930?.outcome.after, 'completed', '1930-1940 JST case should complete');
    const earlyWage1935 = earlyWageDataDeltaOracles.find(entry => entry.scenarioId === 'wage_indexed_pension_jst_1935_1946');
    assertEqual(earlyWage1935?.outcome.before, 'completed', '1935-1946 baseline should complete');
    assertEqual(earlyWage1935?.outcome.after, 'completed', '1935-1946 JST case should complete');
    for (const deltaOracle of [
        capeDisabledDeltaOracle,
        capeLegacyStepDeltaOracle,
        wageDataDeltaOracle,
        ...earlyWageDataDeltaOracles
    ]) {
        assert(
            deltaOracle.financialMetrics.maxAbsolutePortfolioFlowDelta.before < 1
                && deltaOracle.financialMetrics.maxAbsolutePortfolioFlowDelta.after < 1,
            `${deltaOracle.cause} should keep FlowDelta below one euro`
        );
    }
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
    assertEqual(Object.keys(minimumFlexD17.minimumFlexWitness).length, 4,
        'D-17 witness must contain all four reported historical years');
    for (const year of [2001, 2005, 2009, 2010]) {
        const witness = minimumFlexD17.minimumFlexWitness[year];
        assert(witness.minimumFlexAnnual > 0, `D-17 ${year} must retain the active nominal minimum-flex target`);
        assert(witness.status && witness.status !== 'inactive_zero', `D-17 ${year} must retain an active minimum-flex status`);
        assert(Number.isFinite(witness.effectiveFinal), `D-17 ${year} must export final effective minimum flex`);
        assert(Number.isFinite(witness.shortfallAnnual), `D-17 ${year} must export the nominal minimum-flex shortfall`);
    }

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

    assert(UPDATE_TARGET === false, 'The immutable Slice-07 target must never be overwritten by Slice 08');
    const archivedTargetBytes = fs.readFileSync(targetFixturePath);
    assertEqual(
        createHash('sha256').update(archivedTargetBytes).digest('hex'),
        'cdf879d5dde9d9318d46d2fb13749078a97c1ee579dc8a7267dc687296a05cf9',
        'Immutable Slice-07 backtest target should remain byte-identical'
    );
    const archivedSlice06Bytes = fs.readFileSync(slice06DeltaFixturePath);
    assertEqual(
        createHash('sha256').update(archivedSlice06Bytes).digest('hex'),
        '71bad07c8f09b4a41829a315055ee54bcbdf3f6d74c2f943ac50469bc92f8097',
        'Immutable Slice-06 CAPE/wage evidence must remain byte-identical'
    );
    const archivedSlice07Bytes = fs.readFileSync(slice07DeltaFixturePath);
    assertEqual(
        createHash('sha256').update(archivedSlice07Bytes).digest('hex'),
        '956a353927d36f256649350777bff7455458b64c6b89476c717a508f29825ba3',
        'Immutable Slice-07 delta evidence must remain byte-identical'
    );
    const archivedSlice07Evidence = JSON.parse(archivedSlice07Bytes.toString('utf8'));
    const slice06To07 = archivedSlice07Evidence.slice06To07BacktestDeltaOracle;
    assertEqual(slice06To07.activeCapeProviderArm.financialMetrics.summaryEndWealth.delta, -19225.84, 'Archived Slice 06 to 07 active-arm end wealth must stay exact');
    assertEqual(slice06To07.activeCapeProviderArm.financialMetrics.totalWithdrawal.delta, 3000, 'Archived Slice 06 to 07 active-arm withdrawal must stay exact');
    assertEqual(slice06To07.activeCapeProviderArm.financialMetrics.totalTax.delta, 1124.01, 'Archived Slice 06 to 07 active-arm tax must stay exact');
    assertEqual(slice06To07.activeCapeProviderArm.financialMetrics.minRunwayCoveragePct.delta, -3.740149, 'Archived Slice 06 to 07 active-arm runway must stay exact');
    assertEqual(slice06To07.legacyCapeReferenceArm.financialMetrics.summaryEndWealth.delta, 12940.41, 'Archived Slice 06 to 07 reference-arm end wealth must stay exact');
    assertEqual(slice06To07.legacyCapeReferenceArm.financialMetrics.totalWithdrawal.delta, -24000, 'Archived Slice 06 to 07 reference-arm withdrawal must stay exact');
    assertEqual(slice06To07.legacyCapeReferenceArm.financialMetrics.totalTax.delta, 4458.88, 'Archived Slice 06 to 07 reference-arm tax must stay exact');
    assertEqual(slice06To07.legacyCapeReferenceArm.financialMetrics.minRunwayCoveragePct.delta, -2.543821, 'Archived Slice 06 to 07 reference-arm runway must stay exact');
    assertEqual(slice06To07.activeCapeProviderArm.financialMetrics.maxAbsolutePortfolioFlowDelta.delta, 0, 'Archived Slice 06 to 07 active-arm FlowDelta must stay zero');
    assertEqual(slice06To07.legacyCapeReferenceArm.financialMetrics.maxAbsolutePortfolioFlowDelta.delta, 0, 'Archived Slice 06 to 07 reference-arm FlowDelta must stay zero');

    const crossSliceMetricKeys = [
        'summaryEndWealth',
        'totalWithdrawal',
        'totalTax',
        'minRunwayCoveragePct',
        'maxDrawdownPct',
        'maxAbsolutePortfolioFlowDelta'
    ];
    const buildSlice07To08Arm = arm => ({
        capeProviderArm: arm,
        financialMetrics: Object.fromEntries(crossSliceMetricKeys.map(metricKey => {
            const before = archivedSlice07Evidence.capeLegacyStepDeltaOracle.financialMetrics[metricKey][arm];
            const after = capeLegacyStepDeltaOracle.financialMetrics[metricKey][arm];
            return [metricKey, { before, after, delta: round(after - before, 6) }];
        }))
    });
    const slice07To08BacktestDeltaOracle = {
        schemaVersion: 'Slice07To08LiquidityRunwayBacktestDeltaV1',
        sourceReference: 'demography-care-survivor-backtest-delta-v1',
        targetReference: 'post-backtest-data-08-v1',
        activeCapeProviderArm: buildSlice07To08Arm('after'),
        legacyCapeReferenceArm: buildSlice07To08Arm('before')
    };
    const crossSliceOracleProjection = {
        capeLegacyStepEffect: {
            summaryEndWealthDelta: capeLegacyStepDeltaOracle.financialMetrics.summaryEndWealth.delta,
            totalWithdrawalDelta: capeLegacyStepDeltaOracle.financialMetrics.totalWithdrawal.delta,
            totalTaxDelta: capeLegacyStepDeltaOracle.financialMetrics.totalTax.delta,
            minRunwayCoveragePctDelta: capeLegacyStepDeltaOracle.financialMetrics.minRunwayCoveragePct.delta
        },
        earlyWage1930To1940: {
            summaryEndWealthBefore: earlyWage1930?.financialMetrics.summaryEndWealth.before,
            summaryEndWealthAfter: earlyWage1930?.financialMetrics.summaryEndWealth.after,
            summaryEndWealthDelta: earlyWage1930?.financialMetrics.summaryEndWealth.delta,
            totalWithdrawalDelta: earlyWage1930?.financialMetrics.totalWithdrawal.delta,
            totalTaxDelta: earlyWage1930?.financialMetrics.totalTax.delta,
            reductionYearsBefore: earlyWage1930?.financialMetrics.yearsWithReductionAtLeast10Pct.before,
            reductionYearsAfter: earlyWage1930?.financialMetrics.yearsWithReductionAtLeast10Pct.after
        },
        earlyWage1935To1946: {
            summaryEndWealthBefore: earlyWage1935?.financialMetrics.summaryEndWealth.before,
            summaryEndWealthAfter: earlyWage1935?.financialMetrics.summaryEndWealth.after,
            summaryEndWealthDelta: earlyWage1935?.financialMetrics.summaryEndWealth.delta,
            totalWithdrawalDelta: earlyWage1935?.financialMetrics.totalWithdrawal.delta,
            totalTaxDelta: earlyWage1935?.financialMetrics.totalTax.delta,
            reductionYearsBefore: earlyWage1935?.financialMetrics.yearsWithReductionAtLeast10Pct.before,
            reductionYearsAfter: earlyWage1935?.financialMetrics.yearsWithReductionAtLeast10Pct.after
        },
        slice07To08BacktestDeltaOracle: {
            activeCapeProviderArm: Object.fromEntries(crossSliceMetricKeys.map(key => [
                key,
                slice07To08BacktestDeltaOracle.activeCapeProviderArm.financialMetrics[key].delta
            ])),
            legacyCapeReferenceArm: Object.fromEntries(crossSliceMetricKeys.map(key => [
                key,
                slice07To08BacktestDeltaOracle.legacyCapeReferenceArm.financialMetrics[key].delta
            ]))
        }
    };

    const archivedSlice08Bytes = fs.readFileSync(slice08MeasurementFixturePath);
    const archivedSlice08Sha256 = createHash('sha256').update(archivedSlice08Bytes).digest('hex');
    assertEqual(
        archivedSlice08Sha256,
        '6642194525836a0c886d091001131d994625040159984618a95cace4d4279b49',
        'Immutable Slice-08 measurement must remain byte-identical as the Slice-09 input'
    );
    const archivedSlice08Measurement = JSON.parse(archivedSlice08Bytes.toString('utf8'));
    const archivedCaseOracles = new Map(archivedSlice08Measurement.caseOracles.map(entry => [entry.id, entry]));
    const existingCaseFinancialDeltas = actual.cases
        .filter(entry => archivedCaseOracles.has(entry.id))
        .map(entry => {
            const before = archivedCaseOracles.get(entry.id);
            return {
                id: entry.id,
                outcomeChanged: before.outcomeObservation !== entry.outcomeObservation,
                summaryEndWealthDelta: round(entry.values.summaryEndWealth - before.summaryEndWealth),
                totalWithdrawalDelta: round(entry.values.totalWithdrawal - before.totalWithdrawal),
                totalTaxDelta: round(entry.values.totalTax - before.totalTax),
                maxAbsolutePortfolioFlowDeltaDelta: round(
                    entry.values.maxAbsolutePortfolioFlowDelta - before.maxAbsolutePortfolioFlowDelta,
                    6
                )
            };
        });
    const slice09Measurement = {
        schemaVersion: 'MinimumFlexSlice09BacktestMeasurementV1',
        snapshotId: 'post-backtest-data-09-v1',
        sourceReference: archivedSlice08Measurement.snapshotId,
        sourceFixtureSha256: archivedSlice08Sha256,
        sourceActualSha256: archivedSlice08Measurement.actualSha256,
        reviewStatus: 'pending',
        targetActualSha256: createHash('sha256').update(stableStringify(actual)).digest('hex'),
        caseCount: actual.cases.length,
        negativeCaseCount: actual.negativeCases.length,
        ruinCaseCount: actual.cases.filter(entry => entry.outcomeObservation === 'ruin').length,
        maxAbsolutePortfolioFlowDelta: round(Math.max(...actual.cases.map(entry => entry.values.maxAbsolutePortfolioFlowDelta)), 6),
        existingCaseFinancialDeltas,
        d17Witness: minimumFlexD17.minimumFlexWitness
    };
    if (process.env.PRINT_BACKTEST_DATA_09 === '1') {
        console.log('__BACKTEST_DATA_09_MEASUREMENT_START__');
        console.log(stableStringify(slice09Measurement, 2));
        console.log('__BACKTEST_DATA_09_MEASUREMENT_END__');
    }
    const slice09FixtureBytes = fs.readFileSync(slice09MeasurementFixturePath);
    const expectedSlice09Measurement = JSON.parse(slice09FixtureBytes.toString('utf8'));
    const slice09AddedCaseFinancialBytes = fs.readFileSync(slice09AddedCaseFinancialFixturePath);
    const slice09AddedCaseFinancial = JSON.parse(slice09AddedCaseFinancialBytes.toString('utf8'));
    assertEqual(
        slice09AddedCaseFinancial.sourceCommit,
        '2e4867f5fa1817a050fd06029b3298b10342764e',
        'CR10-14 source baseline must identify the approved Slice-09 commit'
    );
    const sourceCaseDeltas = new Map(expectedSlice09Measurement.existingCaseFinancialDeltas.map(entry => [entry.id, entry]));
    const sourceSlice09Cases = new Map([...archivedCaseOracles.entries()].map(([id, archived]) => {
        const delta = sourceCaseDeltas.get(id);
        if (!delta) return [id, null];
        assertEqual(delta.outcomeChanged, false, `${id}: Slice-09 source outcome remains reconstructible`);
        return [id, {
            id,
            outcomeObservation: archived.outcomeObservation,
            summaryEndWealth: round(archived.summaryEndWealth + delta.summaryEndWealthDelta),
            totalWithdrawal: round(archived.totalWithdrawal + delta.totalWithdrawalDelta),
            totalTax: round(archived.totalTax + delta.totalTaxDelta),
            maxAbsolutePortfolioFlowDelta: round(
                archived.maxAbsolutePortfolioFlowDelta + delta.maxAbsolutePortfolioFlowDeltaDelta,
                6
            )
        }];
    }).filter(([, entry]) => entry !== null));
    sourceSlice09Cases.set(slice09AddedCaseFinancial.case.id, slice09AddedCaseFinancial.case);
    const slice09To10D17 = Object.fromEntries(Object.entries(slice09Measurement.d17Witness).map(([year, target]) => {
        const source = expectedSlice09Measurement.d17Witness[year];
        return [year, {
            source,
            slice10: {
                effectiveFinalDelta: round(target.effectiveFinal - source.effectiveFinal),
                minimumFlexAnnualDelta: round(target.minimumFlexAnnual - source.minimumFlexAnnual),
                shortfallAnnualDelta: round(target.shortfallAnnual - source.shortfallAnnual),
                status: target.status
            }
        }];
    }));

    const slice09To10CaseDeltas = actual.cases.map(current => {
        const source = sourceSlice09Cases.get(current.id);
        assert(source, `${current.id}: every Slice-10 case requires a Slice-09 financial source baseline`);
        return {
            id: current.id,
            sourceSlice09: {
                outcomeObservation: source.outcomeObservation,
                summaryEndWealth: source.summaryEndWealth,
                totalWithdrawal: source.totalWithdrawal,
                totalTax: source.totalTax,
                maxAbsolutePortfolioFlowDelta: source.maxAbsolutePortfolioFlowDelta
            },
            slice10: {
                outcomeObservation: current.outcomeObservation,
                summaryEndWealth: current.values.summaryEndWealth,
                totalWithdrawal: current.values.totalWithdrawal,
                totalTax: current.values.totalTax,
                maxAbsolutePortfolioFlowDelta: current.values.maxAbsolutePortfolioFlowDelta
            },
            delta: {
                outcomeChanged: current.outcomeObservation !== source.outcomeObservation,
                summaryEndWealth: round(current.values.summaryEndWealth - source.summaryEndWealth),
                totalWithdrawal: round(current.values.totalWithdrawal - source.totalWithdrawal),
                totalTax: round(current.values.totalTax - source.totalTax),
                maxAbsolutePortfolioFlowDelta: round(
                    current.values.maxAbsolutePortfolioFlowDelta - source.maxAbsolutePortfolioFlowDelta,
                    6
                )
            }
        };
    });
    const slice09To10CompleteLedger = {
        schemaVersion: 'Slice09To10FinancialDeltaLedgerV2',
        sourceReference: expectedSlice09Measurement.snapshotId,
        targetReference: 'post-backtest-data-10-v1',
        sourceCaseCount: expectedSlice09Measurement.caseCount,
        targetCaseCount: actual.cases.length,
        sourceAddedCaseEvidence: {
            schemaVersion: slice09AddedCaseFinancial.schemaVersion,
            sourceCommit: slice09AddedCaseFinancial.sourceCommit,
            sha256: createHash('sha256').update(slice09AddedCaseFinancialBytes).digest('hex')
        },
        d17Witness: slice09To10D17,
        cases: slice09To10CaseDeltas
    };
    const slice10Measurement = {
        schemaVersion: 'TaxLogicSlice10BacktestMeasurementV1',
        snapshotId: 'post-backtest-data-10-v1',
        sourceReference: 'post-backtest-data-09-v1',
        sourceFixtureSha256: createHash('sha256').update(slice09FixtureBytes).digest('hex'),
        sourceActualSha256: expectedSlice09Measurement.targetActualSha256,
        targetResultDocument: 'docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_10_HEUTIGE_STEUERLOGIK.md',
        reviewStatus: 'pending',
        targetActualSha256: createHash('sha256').update(stableStringify(actual)).digest('hex'),
        caseCount: actual.cases.length,
        negativeCaseCount: actual.negativeCases.length,
        ruinCaseCount: actual.cases.filter(entry => entry.outcomeObservation === 'ruin').length,
        maxAbsolutePortfolioFlowDelta: round(Math.max(...actual.cases.map(entry => entry.values.maxAbsolutePortfolioFlowDelta)), 6),
        crossSliceOracleProjection,
        slice09To10DeltaLedger: slice09To10CompleteLedger
    };
    if (UPDATE_SLICE10_MEASUREMENT) {
        fs.writeFileSync(slice10MeasurementFixturePath, stableStringify(slice10Measurement, 2), 'utf8');
        console.log(`Updated Slice-10 measurement fixture: ${slice10MeasurementFixturePath}`);
    } else if (process.env.PRINT_BACKTEST_DATA_10 === '1') {
        console.log('__BACKTEST_DATA_10_MEASUREMENT_START__');
        console.log(stableStringify(slice10Measurement, 2));
        console.log('__BACKTEST_DATA_10_MEASUREMENT_END__');
    } else {
        const expectedSlice10Measurement = JSON.parse(fs.readFileSync(slice10MeasurementFixturePath, 'utf8'));
        const unexpected = collectDiffs(expectedSlice10Measurement, slice10Measurement);
        if (unexpected.length > 0) {
            console.error('Unexpected Slice-10 backtest measurement deltas:');
            console.error(stableStringify(unexpected.slice(0, 20), 2));
        }
        assertEqual(unexpected.length, 0, 'Slice-10 backtest measurement should reproduce exactly with field-level diagnostics');
    }
    assertEqual(
        archivedSlice07Evidence.schemaVersion,
        'DemographyCareSurvivorBacktestDeltaEvidenceV1',
        'Archived Slice-07 delta evidence should retain its schema identity'
    );

    console.log('✅ Simulator backtest characterization tests passed');
} finally {
    if (previousGlobals.document === undefined) delete global.document; else global.document = previousGlobals.document;
    if (previousGlobals.window === undefined) delete global.window; else global.window = previousGlobals.window;
    if (previousGlobals.localStorage === undefined) delete global.localStorage; else global.localStorage = previousGlobals.localStorage;
    if (previousGlobals.alert === undefined) delete global.alert; else global.alert = previousGlobals.alert;
}

console.log('--- Simulator Backtest Characterization Tests Completed ---');
