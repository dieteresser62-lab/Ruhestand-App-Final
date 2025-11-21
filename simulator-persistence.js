"use strict";

/**
 * ============================================================================
 * SIMULATOR-PERSISTENCE.JS - Export/Import Funktionen
 * ============================================================================
 *
 * Dieses Modul enthält Funktionen für den Datenexport aus der Simulation.
 *
 * Exportierte Funktionen:
 * - triggerDownload() - Download-Blob erstellen
 * - exportWorstRunLogData() - Worst-Case-Log exportieren
 * - exportBacktestLogData() - Backtest-Log exportieren
 * - getNestedValue() - Verschachtelte Werte auslesen
 * - formatColumnValue() - Spaltenwerte formatieren
 * - convertRowsToCsv() - Zeilen zu CSV konvertieren
 * ============================================================================
 */

import { formatCurrencyShortLog } from './simulator-utils.js';
import {
    getWorstRunColumnDefinitions,
    loadDetailLevel,
    WORST_LOG_DETAIL_KEY,
    BACKTEST_LOG_DETAIL_KEY,
    LEGACY_LOG_DETAIL_KEY
} from './simulator-results.js';

const CSV_DELIMITER = ';';

/**
 * Liest verschachtelten Wert aus Objekt
 */
export function getNestedValue(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

/**
 * Extrahiert Rohwert aus Spalte
 */
export function resolveColumnRawValue(column, row) {
    if (typeof column.extractor === 'function') {
        return column.extractor(row);
    }
    if (column.key) {
        return getNestedValue(row, column.key);
    }
    return undefined;
}

/**
 * Formatiert Spaltenwert
 */
export function formatColumnValue(column, row) {
    const rawValue = resolveColumnRawValue(column, row);
    if (typeof column.valueFormatter === 'function') {
        return column.valueFormatter(rawValue, row);
    }
    if (typeof column.fmt === 'function') {
        return column.fmt(rawValue, row);
    }
    return rawValue == null ? '' : String(rawValue);
}

/**
 * Formatiert Zelle für Anzeige
 */
export function formatCellForDisplay(column, row) {
    const value = formatColumnValue(column, row);
    const align = column.align === 'left' ? 'left' : 'right';
    return align === 'left'
        ? String(value).padEnd(column.width)
        : String(value).padStart(column.width);
}

/**
 * Bereitet Zeilen für Export vor
 */
export function prepareRowsForExport(rows, columns) {
    return rows.map(row => {
        const prepared = {};
        for (const column of columns) {
            const header = column.exportHeader || column.header;
            prepared[header] = formatColumnValue(column, row);
        }
        return prepared;
    });
}

/**
 * Konvertiert Zeilen zu CSV
 */
export function convertRowsToCsv(rows, columns) {
    const escapeCell = (value) => {
        const safeValue = value == null ? '' : String(value);
        return /["\n;]/.test(safeValue)
            ? `"${safeValue.replace(/"/g, '""')}"`
            : safeValue;
    };

    const headerLine = columns.map(col => escapeCell(col.exportHeader || col.header)).join(CSV_DELIMITER);
    const dataLines = rows.map(row =>
        columns.map(col => escapeCell(formatColumnValue(col, row))).join(CSV_DELIMITER)
    );
    return [headerLine, ...dataLines].join('\n');
}

/**
 * Erstellt Backtest-Spaltendefinitionen
 */
export function buildBacktestColumnDefinitions(detailLevel = 'normal') {
    const isDetailed = detailLevel === 'detailed';
    const formatPercent = (value, decimals = 1) => `${(Number(value) || 0).toFixed(decimals)}%`;
    const formatPercentInt = (value) => `${Math.round(Number(value) || 0)}%`;

    const columns = [
        { header: 'Jahr', width: 4, key: 'jahr', valueFormatter: v => v ?? '', align: 'right' },
        { header: 'Entn.', width: 7, key: 'entscheidung.jahresEntnahme', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
        { header: 'Floor', width: 7, key: 'row.floor_brutto', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' }
    ];

    if (isDetailed) {
        columns.push(
            { header: 'Rente1', width: 7, key: 'row.rente1', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'Rente2', width: 7, key: 'row.rente2', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' }
        );
    }

    columns.push({ header: 'RenteSum', width: 8, key: 'row.renteSum', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' });

    if (isDetailed) {
        columns.push({ header: 'FloorDep', width: 8, key: 'row.floor_aus_depot', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' });
    }

    columns.push(
        { header: 'Flex%', width: 5, key: 'row.FlexRatePct', valueFormatter: v => formatPercentInt(v), align: 'right' },
        { header: 'Flex€', width: 7, key: 'row.flex_erfuellt_nominal', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' }
    );

    if (isDetailed) {
        columns.push(
            { header: 'Entn_real', width: 9, key: 'row.jahresentnahme_real', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'Adj%', width: 5, key: 'adjPct', valueFormatter: v => formatPercent(v), align: 'right' }
        );
    }

    columns.push(
        { header: 'Status', width: 16, key: 'row.aktionUndGrund', valueFormatter: v => (v || '').substring(0, 15), align: 'left' },
        { header: 'Quote%', width: 6, key: 'row.QuoteEndPct', valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'Runway%', width: 7, key: 'row.RunwayCoveragePct', valueFormatter: v => formatPercentInt(v), align: 'right' },
        { header: 'R.Aktien', width: 8, extractor: row => (row.row?.RealReturnEquityPct || 0) * 100, valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'R.Gold', width: 8, extractor: row => (row.row?.RealReturnGoldPct || 0) * 100, valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'Infl.', width: 5, key: 'inflationVJ', valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'Handl.A', width: 8, key: 'netA', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
        { header: 'Handl.G', width: 8, key: 'netG', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
        { header: 'St.', width: 6, key: 'row.steuern_gesamt', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
        { header: 'Aktien', width: 8, key: 'wertAktien', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
        { header: 'Gold', width: 7, key: 'wertGold', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
        { header: 'Liq.', width: 7, key: 'liquiditaet', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' }
    );

    if (isDetailed) {
        columns.push(
            { header: 'NeedLiq', width: 8, key: 'row.NeedLiq', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'GuardG', width: 7, key: 'row.GuardGold', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'GuardA', width: 7, key: 'row.GuardEq', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'GuardNote', width: 16, key: 'row.GuardNote', valueFormatter: v => (v || '').substring(0, 16), align: 'right' }
        );
    }

    return columns;
}

/**
 * Erstellt einen Download-Blob und löst den Speicherdialog aus
 */
export function triggerDownload(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/**
 * Exportiert Worst-Case-Log-Daten
 */
export function exportWorstRunLogData(format = 'json') {
    const worstData = window.globalWorstRunData;
    if (!worstData || !Array.isArray(worstData.rows) || worstData.rows.length === 0) {
        alert('Es sind keine Worst-Case-Log-Daten zum Export verfügbar. Bitte zuerst eine Monte-Carlo-Simulation durchführen.');
        return;
    }

    const showCareDetails = localStorage.getItem('showCareDetails') === '1';
    const detailLevel = loadDetailLevel(WORST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY);
    const columns = getWorstRunColumnDefinitions({ showCareDetails, logDetailLevel: detailLevel });
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    const filenameBase = `worst-case-log-${timestamp}`;

    if (format === 'json') {
        const payload = {
            exportedAt: new Date().toISOString(),
            options: { showCareDetails, detailLevel, caR_Threshold: worstData.caR_Threshold ?? null },
            rows: prepareRowsForExport(worstData.rows, columns)
        };
        triggerDownload(`${filenameBase}.json`, JSON.stringify(payload, null, 2), 'application/json');
    } else if (format === 'csv') {
        const csvContent = convertRowsToCsv(worstData.rows, columns);
        triggerDownload(`${filenameBase}.csv`, csvContent, 'text/csv;charset=utf-8');
    } else {
        console.warn('Unbekanntes Exportformat:', format);
    }
}

/**
 * Exportiert Backtest-Log-Daten
 */
export function exportBacktestLogData(format = 'json') {
    const backtestData = window.globalBacktestData;
    if (!backtestData || !Array.isArray(backtestData.rows) || backtestData.rows.length === 0) {
        alert('Es sind keine Backtest-Daten zum Export verfügbar. Bitte zuerst einen Backtest ausführen.');
        return;
    }

    const detailLevel = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY);
    const columns = buildBacktestColumnDefinitions(detailLevel);
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
    } else {
        console.warn('Unbekanntes Exportformat:', format);
    }
}

/**
 * Rendert das Backtest-Log neu
 */
export function renderBacktestLog() {
    if (!window.globalBacktestData || !Array.isArray(window.globalBacktestData.rows) || window.globalBacktestData.rows.length === 0) {
        return;
    }

    const logDetailLevel = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY);
    const { rows: logRows } = window.globalBacktestData;
    const columns = buildBacktestColumnDefinitions(logDetailLevel);

    const headerLine = columns.map(col => {
        const headerText = col.header || '';
        const align = col.align === 'left' ? 'left' : 'right';
        return align === 'left'
            ? headerText.padEnd(col.width)
            : headerText.padStart(col.width);
    }).join('  ');
    let log = headerLine + '\n' + '='.repeat(headerLine.length) + '\n';

    for (const row of logRows) {
        const line = columns.map(col => formatCellForDisplay(col, row)).join('  ');
        log += line + '\n';
    }

    document.getElementById('simulationLog').textContent = log;
}
