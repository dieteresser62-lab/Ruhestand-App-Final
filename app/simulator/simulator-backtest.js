"use strict";

import { BREAK_ON_RUIN } from './simulator-data.js';
import { initializePortfolio, getCommonInputs } from './simulator-portfolio.js';
import { simulateOneYear } from './simulator-engine-wrapper.js';
import { formatCurrency } from './simulator-utils.js';
import { formatPercentValue } from './simulator-formatting.js';
import {
    BACKTEST_LOG_DETAIL_KEY,
    LEGACY_LOG_DETAIL_KEY,
    loadDetailLevel,
    persistDetailLevel,
    portfolioTotal
} from './simulator-results.js';
import { formatSimulatorValidationError, validateSimulatorInputs } from './simulator-input-validation.js';
import {
    buildBacktestColumnDefinitions,
    computeAdjPctForYear,
    formatColumnValue,
    triggerDownload
} from './simulator-main-helpers.js';
import { renderThreeBucketPortfolioChart } from './simulator-portfolio-chart.js';
import { STRATEGY_OPTIONS } from '../../types/strategy-options.js';
import { resolveDynamicFlexRunnerHorizon } from './dynamic-flex-runner-horizon.js';
import { createHistoricalBacktestContractProvider } from './historical-backtest-contract.js';
import { runHistoricalBacktest } from './historical-backtest-runner.js';
import { runHistoricalBacktestCohorts } from './historical-backtest-cohorts.js';
import {
    captureHistoricalBacktestEngineProvenance,
    createHistoricalBacktestDownload
} from './historical-backtest-export.js';
import {
    buildAccessibleBacktestTableHtml,
    configureHistoricalBacktestControls,
    createBacktestUiStatus,
    createImmutableCohortInventory,
    describeHistoricalBacktestResult,
    escapeBacktestHtml,
    focusBacktestElement,
    renderHistoricalBacktestCohorts,
    renderHistoricalBacktestNotices,
    renderHistoricalBacktestStatus,
    renderHistoricalBacktestValidation,
    validateHistoricalBacktestPeriod
} from './historical-backtest-ui.js';

const HISTORICAL_BACKTEST_PROVIDER = createHistoricalBacktestContractProvider();

const BACKTEST_RUNNING_STATUS = createBacktestUiStatus(
    'running',
    'BACKTEST_RUNNING',
    'Backtest läuft',
    'Der kanonische historische Lauf wird berechnet.',
    'Warten Sie auf den fachlichen Endstatus.'
);

function canonicalAttribute(value) {
    if (value === null || value === undefined) return '';
    return escapeBacktestHtml(String(value));
}

function summaryItem({ label, displayValue, rawValue, metricId = null, resultField = null, className = '' }) {
    const attributes = [
        metricId ? `data-metric-id="${escapeBacktestHtml(metricId)}"` : '',
        resultField ? `data-result-field="${escapeBacktestHtml(resultField)}"` : '',
        `data-canonical-value="${canonicalAttribute(rawValue)}"`
    ].filter(Boolean).join(' ');
    return `<div class="summary-item ${escapeBacktestHtml(className)}" ${attributes}><strong>${escapeBacktestHtml(label)}</strong><span>${escapeBacktestHtml(displayValue)}</span></div>`;
}

function currencyOrDash(value) {
    return typeof value === 'number' && Number.isFinite(value) ? formatCurrency(value) : '—';
}

function renderBacktestSummary(result) {
    const summaryElement = document.getElementById('simulationSummary');
    if (!summaryElement) return;
    const metrics = result?.metrics?.values || {};
    const healthBucket = result?.summary?.healthBucket || {};
    const outcome = result?.outcome?.kind || 'technical_error';
    const outcomeLabel = {
        completed: 'Vollständig',
        ruin: 'Ruin',
        incomplete: 'Unvollständig',
        technical_error: 'Technischer Fehler'
    }[outcome] || outcome;
    const healthCoverage = typeof healthBucket.realCoveragePct === 'number' && Number.isFinite(healthBucket.realCoveragePct)
        ? formatPercentValue(healthBucket.realCoveragePct, { fractionDigits: 0, invalid: '—' })
        : '—';

    summaryElement.innerHTML = `<div class="summary-grid">
        ${summaryItem({ label: 'Startjahr', displayValue: result.request?.startYear ?? '—', rawValue: result.request?.startYear, resultField: 'period_start' })}
        ${summaryItem({ label: 'Endjahr', displayValue: result.request?.endYear ?? '—', rawValue: result.request?.endYear, resultField: 'period_end' })}
        ${summaryItem({ label: 'Outcome', displayValue: outcomeLabel, rawValue: outcome, resultField: 'outcome' })}
        ${summaryItem({ label: 'Angeforderte Jahre', displayValue: result.requestedYears ?? '—', rawValue: result.requestedYears, resultField: 'requested_years' })}
        ${summaryItem({ label: 'Wirtschaftlich ausgewertete Jahre', displayValue: result.completedYears ?? '—', rawValue: result.completedYears, resultField: 'completed_years' })}
        ${summaryItem({ label: 'Jahreszeilen', displayValue: result.rows?.length ?? 0, rawValue: result.rows?.length ?? 0, resultField: 'row_count' })}
        ${summaryItem({ label: 'Startvermögen', displayValue: currencyOrDash(metrics.wealth_start_nominal_eur), rawValue: metrics.wealth_start_nominal_eur, metricId: 'wealth_start_nominal_eur' })}
        ${summaryItem({ label: 'Endvermögen', displayValue: currencyOrDash(metrics.wealth_end_nominal_eur), rawValue: metrics.wealth_end_nominal_eur, metricId: 'wealth_end_nominal_eur' })}
        ${summaryItem({ label: 'Gesamte Entnahmen', displayValue: currencyOrDash(metrics.withdrawal_total_nominal_eur), rawValue: metrics.withdrawal_total_nominal_eur, metricId: 'withdrawal_total_nominal_eur', className: 'highlight' })}
        ${summaryItem({ label: 'Max. Kürzungsdauer (≥ 10 %)', displayValue: `${metrics.flex_reduction_longest_streak_gte_10_pct ?? '—'} Jahre`, rawValue: metrics.flex_reduction_longest_streak_gte_10_pct, metricId: 'flex_reduction_longest_streak_gte_10_pct' })}
        ${summaryItem({ label: 'Jahre mit Kürzung (≥ 10 %)', displayValue: `${metrics.flex_reduction_years_gte_10_pct ?? '—'} von ${result.completedYears ?? '—'}`, rawValue: metrics.flex_reduction_years_gte_10_pct, metricId: 'flex_reduction_years_gte_10_pct' })}
        ${summaryItem({ label: 'Gezahlte Steuern', displayValue: currencyOrDash(metrics.tax_total_nominal_eur), rawValue: metrics.tax_total_nominal_eur, metricId: 'tax_total_nominal_eur', className: 'tax' })}
        ${summaryItem({ label: healthBucket.enabled ? 'Pflegebucket am Laufende' : 'Pflegebucket am Laufende (deaktiviert)', displayValue: currencyOrDash(metrics.health_bucket_end_nominal_eur), rawValue: metrics.health_bucket_end_nominal_eur, metricId: 'health_bucket_end_nominal_eur' })}
        ${summaryItem({ label: 'Pflegebucket-Zieldeckung', displayValue: healthCoverage, rawValue: healthBucket.realCoveragePct, resultField: 'health_bucket_coverage_pct' })}
        ${summaryItem({ label: 'Pflegebucket-Ziellücke', displayValue: currencyOrDash(healthBucket.targetGap), rawValue: healthBucket.targetGap, resultField: 'health_bucket_target_gap' })}
    </div>`;
}

function setBacktestResultsVisible(visible) {
    const results = document.getElementById('simulationResults');
    if (results) results.style.display = visible ? 'block' : 'none';
}

function setBacktestExportEnabled(enabled) {
    for (const id of ['exportBacktestJson', 'exportBacktestCsv']) {
        const button = document.getElementById(id);
        if (button) button.disabled = !enabled;
    }
}

function clearBacktestResultProjection() {
    const summary = document.getElementById('simulationSummary');
    const log = document.getElementById('simulationLog');
    const chart = document.getElementById('portfolioCompositionChart');
    if (summary) summary.innerHTML = '';
    if (log) log.textContent = 'Keine Daten';
    if (chart) chart.style.display = 'none';
    renderHistoricalBacktestCohorts(document, null, null);
    setBacktestResultsVisible(false);
    setBacktestExportEnabled(false);
}

function clearBacktestNotices() {
    const section = document.getElementById('backtestNotices');
    const list = document.getElementById('backtestNoticeList');
    if (section) section.hidden = true;
    if (list) list.innerHTML = '';
}

/**
 * Führt einen historischen Backtest durch.
 * Lesen und Schreiben erfolgen über den UI-Adapter; fachliche Abhängigkeiten sind für Browser-Gates injizierbar.
 */
export function runBacktest(options = {}) {
    const button = document.getElementById('btButton');
    try {
        if (button) button.disabled = true;
        clearBacktestNotices();
        const dependencies = options && typeof options === 'object' ? options : {};
        const historicalDataProvider = dependencies.historicalDataProvider || HISTORICAL_BACKTEST_PROVIDER;
        const cohortCheckbox = document.getElementById('runBacktestCohorts');
        const cohortHorizonInput = document.getElementById('backtestCohortHorizon');
        const validation = validateHistoricalBacktestPeriod({
            startRaw: document.getElementById('simStartJahr')?.value,
            endRaw: document.getElementById('simEndJahr')?.value,
            bounds: historicalDataProvider.bounds,
            cohortsEnabled: Boolean(cohortCheckbox?.checked),
            cohortHorizonRaw: cohortHorizonInput?.value
        });
        renderHistoricalBacktestValidation(document, validation);
        if (!validation.valid) {
            window.globalBacktestData = null;
            clearBacktestResultProjection();
            renderHistoricalBacktestStatus(document, createBacktestUiStatus(
                'validation_error',
                'BACKTEST_PERIOD_INVALID',
                'Zeitraum korrigieren',
                'Mindestens ein Zeitraumfeld ist leer, nicht ganzzahlig, rückwärts oder außerhalb der Datensatzgrenzen.',
                'Korrigieren Sie das markierte Feld und starten Sie den Backtest erneut.'
            ));
            return null;
        }

        renderHistoricalBacktestStatus(document, BACKTEST_RUNNING_STATUS);
        const inputs = validateSimulatorInputs(getCommonInputs());
        const engineApi = dependencies.engineApi || window?.EngineAPI;
        const runSinglePath = dependencies.runSinglePath || runHistoricalBacktest;
        const backtestResult = runSinglePath({
            inputs,
            period: { startYear: validation.startYear, endYear: validation.endYear },
            historicalDataProvider,
            simulateYear: dependencies.simulateYear || simulateOneYear,
            initializePortfolio: dependencies.initializePortfolio || initializePortfolio,
            computeAdjustmentPct: dependencies.computeAdjustmentPct || computeAdjPctForYear,
            resolveHorizon: dependencies.resolveHorizon || resolveDynamicFlexRunnerHorizon,
            totalPortfolio: dependencies.totalPortfolio || portfolioTotal,
            breakOnRuin: dependencies.breakOnRuin ?? BREAK_ON_RUIN,
            engineProvenance: captureHistoricalBacktestEngineProvenance(engineApi)
        });

        let cohortInventory = null;
        if (validation.cohortsEnabled && ['completed', 'ruin'].includes(backtestResult.outcome?.kind)) {
            const runCohorts = dependencies.runCohorts || runHistoricalBacktestCohorts;
            const cohortResult = runCohorts({
                inputs,
                range: { startYear: validation.startYear, endYear: validation.endYear },
                cohortHorizonYears: validation.cohortHorizonYears,
                historicalDataProvider,
                simulateYear: dependencies.simulateYear || simulateOneYear,
                initializePortfolio: dependencies.initializePortfolio || initializePortfolio,
                computeAdjustmentPct: dependencies.computeAdjustmentPct || computeAdjPctForYear,
                resolveHorizon: dependencies.resolveHorizon || resolveDynamicFlexRunnerHorizon,
                totalPortfolio: dependencies.totalPortfolio || portfolioTotal,
                breakOnRuin: dependencies.breakOnRuin ?? BREAK_ON_RUIN,
                runSinglePath
            });
            cohortInventory = createImmutableCohortInventory(cohortResult.inventory);
        }

        // UI, Summary, Tabelle und Export teilen exakt diese immutable Runner-Instanz.
        window.globalBacktestData = Object.freeze({
            result: backtestResult,
            rows: backtestResult.rows,
            startJahr: validation.startYear,
            schemaVersion: backtestResult.schemaVersion,
            outcome: backtestResult.outcome,
            requestedYears: backtestResult.requestedYears,
            completedYears: backtestResult.completedYears,
            breakOnRuin: backtestResult.breakOnRuin,
            ...(cohortInventory ? {
                cohortInventory,
                cohortHorizonYears: validation.cohortHorizonYears
            } : {}),
            decumulationMode: inputs?.decumulation?.mode || STRATEGY_OPTIONS.STANDARD,
            goldAktiv: inputs?.goldAktiv,
            minimumFlexProfiles: Array.isArray(inputs?.minimumFlexProfiles)
                ? inputs.minimumFlexProfiles.map(entry => ({ ...entry }))
                : []
        });
        renderHistoricalBacktestStatus(document, describeHistoricalBacktestResult(backtestResult), { focus: true });
        renderHistoricalBacktestNotices(document, backtestResult, cohortInventory);

        if (['completed', 'ruin'].includes(backtestResult.outcome?.kind)) {
            setBacktestResultsVisible(true);
            setBacktestExportEnabled(true);
            renderBacktestSummary(backtestResult);
            renderHistoricalBacktestCohorts(document, cohortInventory, validation.cohortHorizonYears);
            renderBacktestLog();
        } else {
            clearBacktestResultProjection();
        }
        return backtestResult;
    } catch (error) {
        window.globalBacktestData = null;
        clearBacktestResultProjection();
        const isInputValidation = error?.name === 'SimulatorValidationError';
        renderHistoricalBacktestStatus(document, createBacktestUiStatus(
            isInputValidation ? 'validation_error' : 'technical_error',
            isInputValidation ? 'BACKTEST_INPUT_INVALID' : 'BACKTEST_UI_EXCEPTION',
            isInputValidation ? 'Simulator-Eingabe korrigieren' : 'Backtest technisch abgebrochen',
            isInputValidation
                ? formatSimulatorValidationError(error)
                : 'Die Eingaben oder der Lauf konnten technisch nicht sicher verarbeitet werden.',
            isInputValidation
                ? 'Korrigieren Sie die betroffene Simulator-Eingabe und starten Sie erneut.'
                : 'Prüfen Sie die Eingaben und starten Sie erneut. Bleibt der Code bestehen, melden Sie ihn zur Diagnose.'
        ), { focus: !isInputValidation });
        if (isInputValidation) focusBacktestElement(document, error?.errors?.[0]?.fieldId);
        return null;
    } finally {
        if (button) button.disabled = false;
    }
}

/**
 * Rendert die Backtest-Logtabelle basierend auf dem gespeicherten Log-Level.
 * Nutzt die zuvor abgelegten globalBacktestData, um Re-Renders ohne erneuten Lauf zu ermöglichen.
 */
export function renderBacktestLog() {
    if (!window.globalBacktestData || !Array.isArray(window.globalBacktestData.rows) || window.globalBacktestData.rows.length === 0) {
        return;
    }

    const logDetailLevel = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY);
    const { rows: logRows } = window.globalBacktestData;
    const columns = buildBacktestColumnDefinitions(logDetailLevel, {
        strategyMode: window.globalBacktestData?.decumulationMode,
        goldAktiv: window.globalBacktestData?.goldAktiv
    });

    document.getElementById('simulationLog').innerHTML = buildAccessibleBacktestTableHtml(
        logRows,
        columns,
        formatColumnValue
    );
    const chartContainer = document.getElementById('portfolioCompositionChart');
    if (chartContainer) {
        chartContainer.style.display = 'block';
        renderThreeBucketPortfolioChart(chartContainer, logRows);
    }
}

/**
 * Exportiert die Backtest-Logdaten im JSON- oder CSV-Format.
 * Validiert Eingaben defensiv und belässt Fehlermeldungen unverändert zur UI-Kompatibilität.
 * @param {'json'|'csv'} format - Gewünschtes Exportformat.
 */
export function exportBacktestLogData(format = 'json') {
    const backtestData = window.globalBacktestData;
    if (!backtestData?.result) {
        renderHistoricalBacktestStatus(document, createBacktestUiStatus(
            'technical_error',
            'BACKTEST_EXPORT_RESULT_MISSING',
            'Kein Backtest für den Export vorhanden',
            'Es liegt kein kanonisches Backtest-Resultat vor.',
            'Führen Sie zuerst einen vollständigen Backtest aus.'
        ), { focus: true });
        return;
    }

    try {
        const download = createHistoricalBacktestDownload(backtestData.result, format, {
            cohortInventory: backtestData.cohortInventory
        });
        triggerDownload(download.filename, download.content, download.mimeType);
    } catch (error) {
        void error;
        renderHistoricalBacktestStatus(document, createBacktestUiStatus(
            'technical_error',
            'BACKTEST_EXPORT_FAILED',
            'Backtest-Export fehlgeschlagen',
            'Der kanonische Raw-Export konnte technisch nicht erstellt werden.',
            'Führen Sie den Backtest erneut aus und wiederholen Sie den Download.'
        ), { focus: true });
    }
}

function bindBacktestEventOnce(element, eventName, key, handler) {
    if (!element) return;
    if (!element.dataset) element.dataset = {};
    const marker = `backtestBound${key}`;
    if (element.dataset[marker] === 'true') return;
    element.addEventListener(eventName, handler);
    element.dataset[marker] = 'true';
}

function clearBacktestFieldError(fieldId, errorId) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (typeof field?.removeAttribute === 'function') field.removeAttribute('aria-invalid');
    else if (field) delete field['aria-invalid'];
    if (error) {
        error.textContent = '';
        error.hidden = true;
    }
}

/**
 * Registriert UI-spezifische Backtest-Handler (Detail-Level und Export).
 * Diese Logik wurde extrahiert, um Simulator-Main zu entlasten und Wiederverwendung zu vereinfachen.
 */
export function initializeBacktestUI() {
    configureHistoricalBacktestControls(document, HISTORICAL_BACKTEST_PROVIDER);
    setBacktestExportEnabled(Boolean(window.globalBacktestData?.result));

    const startButton = document.getElementById('btButton');
    bindBacktestEventOnce(startButton, 'click', 'Start', () => runBacktest());

    const cohortCheckbox = document.getElementById('runBacktestCohorts');
    const cohortHorizonInput = document.getElementById('backtestCohortHorizon');
    const syncCohortControl = () => {
        if (cohortHorizonInput) cohortHorizonInput.disabled = !cohortCheckbox?.checked;
        if (!cohortCheckbox?.checked) clearBacktestFieldError('backtestCohortHorizon', 'backtestCohortHorizonError');
    };
    bindBacktestEventOnce(cohortCheckbox, 'change', 'CohortToggle', syncCohortControl);
    syncCohortControl();

    for (const [fieldId, errorId] of [
        ['simStartJahr', 'simStartJahrError'],
        ['simEndJahr', 'simEndJahrError'],
        ['backtestCohortHorizon', 'backtestCohortHorizonError']
    ]) {
        const field = document.getElementById(fieldId);
        bindBacktestEventOnce(field, 'input', `Clear${fieldId}`, () => clearBacktestFieldError(fieldId, errorId));
    }

    const backtestDetailCheckbox = document.getElementById('toggle-backtest-detail');
    if (backtestDetailCheckbox) {
        backtestDetailCheckbox.checked = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY) === 'detailed';
        bindBacktestEventOnce(backtestDetailCheckbox, 'change', 'Detail', (event) => {
            const detailLevel = (event.currentTarget || backtestDetailCheckbox).checked ? 'detailed' : 'normal';
            // Backtest detail level is isolated to keep the worst-case log unchanged.
            persistDetailLevel(BACKTEST_LOG_DETAIL_KEY, detailLevel);

            // Re-render Backtest-Log mit neuem Detail-Level
            if (typeof window.renderBacktestLog === 'function') {
                window.renderBacktestLog();
            } else {
                renderBacktestLog();
            }
        });
    }

    const exportBacktestJsonBtn = document.getElementById('exportBacktestJson');
    bindBacktestEventOnce(exportBacktestJsonBtn, 'click', 'ExportJson', () => exportBacktestLogData('json'));
    const exportBacktestCsvBtn = document.getElementById('exportBacktestCsv');
    bindBacktestEventOnce(exportBacktestCsvBtn, 'click', 'ExportCsv', () => exportBacktestLogData('csv'));
}
