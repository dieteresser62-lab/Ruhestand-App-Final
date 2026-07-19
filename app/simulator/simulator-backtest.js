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
    convertRowsToCsv,
    formatColumnValue,
    prepareRowsForExport,
    triggerDownload
} from './simulator-main-helpers.js';
import { renderThreeBucketPortfolioChart } from './simulator-portfolio-chart.js';
import { STRATEGY_OPTIONS } from '../../types/strategy-options.js';
import { resolveDynamicFlexRunnerHorizon } from './dynamic-flex-runner-horizon.js';
import { createHistoricalBacktestContractProvider } from './historical-backtest-contract.js';
import { runHistoricalBacktest } from './historical-backtest-runner.js';

const HISTORICAL_BACKTEST_PROVIDER = createHistoricalBacktestContractProvider();

/**
 * Führt einen historischen Backtest durch.
 * Lesen und Schreiben erfolgen weiterhin über das DOM, damit bestehende UI-Flows unverändert bleiben.
 */
export function runBacktest() {
    try {
        document.getElementById('btButton').disabled = true;
        const inputs = validateSimulatorInputs(getCommonInputs());
        const startJahr = Number(document.getElementById('simStartJahr').value);
        const endJahr = Number(document.getElementById('simEndJahr').value);
        const { startYear: earliestStartYear, endYear: latestEndYear } = HISTORICAL_BACKTEST_PROVIDER.bounds;
        if (!Number.isInteger(startJahr)
            || !Number.isInteger(endJahr)
            || startJahr < earliestStartYear
            || endJahr > latestEndYear
            || startJahr > endJahr) {
            alert(`Fehler: Bitte einen gültigen Zeitraum eingeben.\n- Der Zeitraum muss zwischen ${earliestStartYear} und ${latestEndYear} liegen.`);
            document.getElementById('btButton').disabled = false; return;
        }

        const backtestResult = runHistoricalBacktest({
            inputs,
            period: { startYear: startJahr, endYear: endJahr },
            historicalDataProvider: HISTORICAL_BACKTEST_PROVIDER,
            simulateYear: simulateOneYear,
            initializePortfolio,
            computeAdjustmentPct: computeAdjPctForYear,
            resolveHorizon: resolveDynamicFlexRunnerHorizon,
            totalPortfolio: portfolioTotal,
            breakOnRuin: BREAK_ON_RUIN
        });
        if (backtestResult.outcome?.kind === 'incomplete') {
            const reason = backtestResult.incompleteReason?.code || 'unvollstaendige_historische_daten';
            alert(`Der Backtest wurde nicht gestartet, weil die historischen Daten unvollständig sind (${reason}).`);
            return;
        }
        if (backtestResult.outcome?.kind === 'technical_error') {
            alert(backtestResult.outcome.error?.message || 'Der Backtest wurde wegen eines technischen Fehlers beendet.');
            return;
        }
        const logRows = backtestResult.rows;
        const summary = backtestResult.summary;
        const {
            totalWithdrawal: totalEntnahme,
            maxReductionStreak: maxKuerzungStreak,
            reductionYears: jahreMitKuerzung,
            totalTaxes: totalSteuern
        } = summary;

        // Speichere Log-Daten für späteres Neu-Rendern
        window.globalBacktestData = {
            rows: logRows,
            startJahr,
            schemaVersion: backtestResult.schemaVersion,
            outcome: backtestResult.outcome,
            requestedYears: backtestResult.requestedYears,
            completedYears: backtestResult.completedYears,
            breakOnRuin: backtestResult.breakOnRuin,
            decumulationMode: inputs?.decumulation?.mode || STRATEGY_OPTIONS.STANDARD,
            goldAktiv: inputs?.goldAktiv,
            minimumFlexProfiles: Array.isArray(inputs?.minimumFlexProfiles)
                ? inputs.minimumFlexProfiles.map(entry => ({ ...entry }))
                : []
        };

        document.getElementById('simulationResults').style.display = 'block';
        const lastCanonicalRow = logRows[logRows.length - 1]?.row || null;
        const healthBucket = summary.healthBucket?.enabled
            ? summary.healthBucket
            : (lastCanonicalRow?.health_bucket_enabled === true
                ? {
                    enabled: true,
                    end: Number(lastCanonicalRow.health_bucket_end) || 0,
                    realCoveragePct: Number.isFinite(Number(lastCanonicalRow.health_bucket_real_coverage_pct))
                        ? Number(lastCanonicalRow.health_bucket_real_coverage_pct)
                        : null,
                    targetGap: Number(lastCanonicalRow.health_bucket_target_gap) || 0
                }
                : summary.healthBucket);
        const healthBucketSummary = healthBucket?.enabled
            ? `
            <div class="summary-item"><strong>Pflegebucket</strong><span>${formatCurrency(healthBucket.end || 0)}</span></div>
            <div class="summary-item"><strong>Pflegebucket-Zieldeckung</strong><span>${Number.isFinite(Number(healthBucket.realCoveragePct))
                ? formatPercentValue(Number(healthBucket.realCoveragePct), { fractionDigits: 0, invalid: '—' })
                : '—'}</span></div>
            <div class="summary-item"><strong>Pflegebucket-Ziellücke</strong><span>${formatCurrency(healthBucket.targetGap || 0)}</span></div>`
            : '';
        document.getElementById('simulationSummary').innerHTML = `
         <div class="summary-grid">
            <div class="summary-item"><strong>Startvermögen</strong><span>${formatCurrency(summary.startWealth)}</span></div>
            <div class="summary-item"><strong>Endvermögen</strong><span>${formatCurrency(summary.endWealth)}</span></div>
            <div class="summary-item highlight"><strong>Gesamte Entnahmen</strong><span>${formatCurrency(totalEntnahme)}</span></div>
            <div class="summary-item"><strong>Max. Kürzungsdauer</strong><span>${maxKuerzungStreak} Jahre</span></div>
            <div class="summary-item"><strong>Jahre mit Kürzung (>10%)</strong><span>${jahreMitKuerzung} von ${summary.reductionDenominator}</span></div>
            <div class="summary-item tax"><strong>Gezahlte Steuern</strong><span>${formatCurrency(totalSteuern)}</span></div>
            ${healthBucketSummary}
        </div>`;
        renderBacktestLog();
    } catch (error) {
        alert("Ein Fehler ist im Backtest aufgetreten:\n\n" + formatSimulatorValidationError(error));
        console.error("Fehler in runBacktest():", error);
    } finally { document.getElementById('btButton').disabled = false; }
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

    // Generate HTML table
    let html = '<table><thead><tr>';
    for (const col of columns) {
        html += `<th>${col.header || ''}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < logRows.length; i++) {
        const row = logRows[i];
        const rowClass = i % 2 === 0 ? 'even' : 'odd';
        html += `<tr class="${rowClass}">`;

        for (const col of columns) {
            const value = formatColumnValue(col, row);
            html += `<td>${value}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';

    document.getElementById('simulationLog').innerHTML = html;
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
    if (!backtestData || !Array.isArray(backtestData.rows) || backtestData.rows.length === 0) {
        alert('Es sind keine Backtest-Daten zum Export verfügbar. Bitte zuerst einen Backtest ausführen.');
        return;
    }

    const detailLevel = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY);
    const columns = buildBacktestColumnDefinitions(detailLevel, {
        strategyMode: backtestData?.decumulationMode,
        goldAktiv: backtestData?.goldAktiv
    });
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    const filenameBase = `backtest-log-${timestamp}`;

    if (format === 'json') {
        const payload = {
            exportedAt: new Date().toISOString(),
            options: { detailLevel, startJahr: backtestData.startJahr ?? null },
            rows: prepareRowsForExport(backtestData.rows, columns)
        };
        triggerDownload(`${filenameBase}.json`, JSON.stringify(payload, null, 2), 'application/json');
    } else if (format === 'csv') {
        const csvContent = convertRowsToCsv(backtestData.rows, columns);
        triggerDownload(`${filenameBase}.csv`, csvContent, 'text/csv;charset=utf-8');
    }
}

/**
 * Registriert UI-spezifische Backtest-Handler (Detail-Level und Export).
 * Diese Logik wurde extrahiert, um Simulator-Main zu entlasten und Wiederverwendung zu vereinfachen.
 */
export function initializeBacktestUI() {
    const backtestDetailCheckbox = document.getElementById('toggle-backtest-detail');
    if (backtestDetailCheckbox) {
        backtestDetailCheckbox.checked = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY) === 'detailed';
        backtestDetailCheckbox.addEventListener('change', (e) => {
            const detailLevel = e.currentTarget.checked ? 'detailed' : 'normal';
            // Backtest detail level is isolated to keep the worst-case log unchanged.
            persistDetailLevel(BACKTEST_LOG_DETAIL_KEY, detailLevel);

            // Re-render Backtest-Log mit neuem Detail-Level
            if (typeof window.renderBacktestLog === 'function') {
                window.renderBacktestLog();
            }
        });
    }

    const exportBacktestJsonBtn = document.getElementById('exportBacktestJson');
    if (exportBacktestJsonBtn) {
        exportBacktestJsonBtn.addEventListener('click', () => exportBacktestLogData('json'));
    }
    const exportBacktestCsvBtn = document.getElementById('exportBacktestCsv');
    if (exportBacktestCsvBtn) {
        exportBacktestCsvBtn.addEventListener('click', () => exportBacktestLogData('csv'));
    }
}
