import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { runBacktest } from '../app/simulator/simulator-backtest.js';
import { getCommonInputs } from '../app/simulator/simulator-portfolio.js';
import { simulateOneYear } from '../app/simulator/simulator-engine-wrapper.js';
import { annualData, HISTORICAL_DATA } from '../app/simulator/simulator-data.js';
import { EngineAPI } from '../engine/index.mjs';
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
    maxAbsolutePortfolioFlowDelta: {
        unit: 'EUR',
        sign: 'absolute_non_negative',
        rounding: 'six_decimals_in_fixture',
        denominator: 'rows containing a finite portfolio_flow_delta',
        legacySource: 'max(abs(rows[].row.portfolio_flow_delta))'
    }
});

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
        style: { display: 'none' },
        classList: { add: () => {}, remove: () => {} },
        addEventListener: () => {},
        appendChild: () => {},
        setAttribute: () => {}
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

function observeOutcome({ data, rows, alerts, requestedYears }) {
    if (typeof data?.outcome?.kind === 'string') return data.outcome.kind;
    if (alerts.length > 0) return 'validation_alert_legacy';
    if (rows.some(entry => entry?.row?.Regime === 'BANKRUPT')) return 'ruin_legacy';
    if (rows.length === 0) return 'empty_result_rendered_as_completed_legacy';
    if (rows.length < requestedYears) return 'partial_result_rendered_as_completed_legacy';
    return 'completed_legacy';
}

function projectScenario({ id, oracleClass = 'target_expected', inputs, data, alerts, summaryHtml, expectedRowCount, notes = [] }) {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const requestedYears = Number.isInteger(Number(inputs?.__periodEnd)) && Number.isInteger(Number(inputs?.__periodStart))
        ? Number(inputs.__periodEnd) - Number(inputs.__periodStart) + 1
        : null;
    const normalizedInputs = { ...inputs };
    delete normalizedInputs.__periodStart;
    delete normalizedInputs.__periodEnd;
    const reductions = computeReductionMetrics(rows);
    const finiteFlowDeltas = rows
        .map(entry => Number(entry?.row?.portfolio_flow_delta))
        .filter(Number.isFinite)
        .map(Math.abs);
    const last = rows.at(-1);
    const wrapperEnd = last
        ? (Number(last.wertAktien) || 0) + (Number(last.wertGold) || 0) + (Number(last.liquiditaet) || 0)
        : null;
    return {
        id,
        oracleClass,
        notes,
        inputHash: stableHash(normalizedInputs),
        inputs: normalizedInputs,
        period: {
            startYear: inputs.__periodStart,
            endYear: inputs.__periodEnd,
            requestedYears
        },
        expectedRowCount,
        observedRowCount: rows.length,
        canonicalRowsHash: stableHash(rows),
        outcomeObservation: observeOutcome({ data, rows, alerts, requestedYears }),
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
        runBacktest();
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
                    valueRatio: round((current.msci_eur - previous.msci_eur) / previous.msci_eur, 12)
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
                    valueRatio: round((current.msci_eur - previous.msci_eur) / previous.msci_eur, 12)
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
                cause: 'D-01 realized fields use source year t; CAPE remains decision-as-of t-1'
            }]];
        }));
        return {
            id: entry.id,
            legacyOutcome: before?.outcomeObservation ?? null,
            targetOutcome: entry.outcomeObservation,
            rowProjectionChanged: before?.canonicalRowsHash !== entry.canonicalRowsHash,
            rowProjectionCause: before?.canonicalRowsHash !== entry.canonicalRowsHash
                ? 'D-01 time-axis alignment and signed negative-cash-interest reconciliation'
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
    const completedLong = runScenario({
        id: 'completed_1960_2020',
        values: { simStartJahr: 1960, simEndJahr: 2020, p1StartAlter: 18 },
        expectedRowCount: 61,
        notes: ['Long-horizon regression sentinel.']
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
        approvedContractChangePaths: ['alignmentOracle', 'cases', 'negativeCases'],
        metricDictionary: METRIC_DICTIONARY_V1,
        alignmentOracle: buildAlignmentOracle(),
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
            completedLong,
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

    assertEqual(actual.cases.length, 6, 'six runtime characterization cases should be present');
    assert(actual.reductionBoundaryOracle.countedByLegacyOperator, 'exact 10% must be counted by the legacy operator');
    assert(!actual.reductionBoundaryOracle.contradictorySummaryLabelPresent, 'legacy >10% label contradiction must be removed');
    assert(actual.reductionBoundaryOracle.canonicalSummaryLabelPresent, 'summary label must expose the inclusive ten-percent contract');
    assertEqual(actual.negativeCases.length, 5, 'five legacy negative cases should be present');
    assert(
        [...actual.cases, ...actual.negativeCases].every(testCase => testCase.oracleClass === 'target_expected'),
        'every case in the target fixture must be labeled target_expected'
    );
    assert(actual.cases.every(testCase => testCase.inputHash.length === 64), 'every runtime case should contain a canonical SHA-256 input hash');
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
