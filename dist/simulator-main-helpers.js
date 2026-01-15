"use strict";


import { formatCurrencyShortLog } from './simulator-utils.js';
import { EngineAPI } from './engine/index.mjs';

const CSV_DELIMITER = ';';


/**
 * Computes the pension adjustment percentage for a specific simulation year.
 * @param {Object} ctx - Simulation context containing inputs, series and simStartYear.
 * @param {number} yearIdx - Zero-based year index within the simulation horizon.
 * @returns {number} Adjustment percentage (e.g., 2.0 represents 2%).
 */
export function computeAdjPctForYear(ctx, yearIdx) {
    const safeCtx = ctx && typeof ctx === 'object' ? ctx : {};
    const safeYearIdx = Number.isFinite(yearIdx) ? yearIdx : 0;

    const mode = safeCtx.inputs?.rentAdj?.mode || 'fix';
    if (mode === 'fix') {
        return Number(safeCtx.inputs?.rentAdj?.pct || 0);
    }

    const series = safeCtx.series && typeof safeCtx.series === 'object' ? safeCtx.series : {};
    const startYear = Number(series.startYear) || 0;
    const simStartYear = Number(safeCtx.simStartYear) || 0;
    const offsetIdx = simStartYear - startYear + safeYearIdx;

    const pickSeriesValue = (collection) => {
        const value = Array.isArray(collection) ? collection[offsetIdx] : undefined;
        return Number.isFinite(value) ? Number(value) : 0;
    };

    if (mode === 'wage') {
        return pickSeriesValue(series.wageGrowth);
    }
    if (mode === 'cpi') {
        return pickSeriesValue(series.inflationPct);
    }
    return 0;
}

/**
 * Applies simplified pension taxation rules and returns the net pension amount.
 * @param {number} pensionGross - Annual gross pension.
 * @param {Object} params - Tax parameters { sparerPauschbetrag, kirchensteuerPct, steuerquotePct }.
 * @returns {number} Net pension amount (never negative).
 */
export function applyPensionTax(pensionGross, params) {
    const gross = Number(pensionGross);
    if (!Number.isFinite(gross) || gross <= 0) {
        return 0;
    }

    const safeParams = params && typeof params === 'object' ? params : {};
    const steuerquotePct = Number(safeParams.steuerquotePct);

    if (Number.isFinite(steuerquotePct) && steuerquotePct > 0) {
        const netto = gross * (1 - steuerquotePct / 100);
        return Math.max(0, netto);
    }

    // Default branch: keep gross untouched when no valid tax rate is provided.
    return Math.max(0, gross);
}

/**
 * Safely resolves a nested property from an object using dot-notation.
 * @param {Object} obj - Source object.
 * @param {string} path - Dot-separated path (e.g., "a.b.c").
 * @returns {*} Resolved value or undefined when the path cannot be traversed.
 */
export function getNestedValue(obj, path) {
    if (!path) return obj;
    if (!obj || typeof obj !== 'object') return undefined;
    if (typeof path !== 'string') return undefined;

    return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

/**
 * Resolves the raw value for a column definition based on extractor or key.
 * @param {Object} column - Column definition.
 * @param {Object} row - Current row data.
 * @returns {*} Extracted raw value.
 */
export function resolveColumnRawValue(column, row) {
    if (typeof column?.extractor === 'function') {
        return column.extractor(row);
    }
    if (column?.key) {
        return getNestedValue(row, column.key);
    }
    return undefined;
}

/**
 * Formats a column value using column-level formatter hooks.
 * @param {Object} column - Column definition with optional formatter callbacks.
 * @param {Object} row - Current row data.
 * @returns {*} Formatted value or an empty string when undefined.
 */
export function formatColumnValue(column, row) {
    const rawValue = resolveColumnRawValue(column, row);
    if (typeof column?.valueFormatter === 'function') {
        return column.valueFormatter(rawValue, row);
    }
    if (typeof column?.fmt === 'function') {
        return column.fmt(rawValue, row);
    }
    return rawValue == null ? '' : String(rawValue);
}

/**
 * Pads a value for monospace display according to alignment rules.
 * @param {Object} column - Column definition containing width and alignment metadata.
 * @param {Object} row - Current row data.
 * @returns {string} Formatted cell string with padding applied.
 */
export function formatCellForDisplay(column, row) {
    const value = formatColumnValue(column, row);
    const align = column?.align === 'left' ? 'left' : 'right';
    const width = Number(column?.width) || 0;

    if (align === 'left') {
        return String(value).padEnd(width);
    }
    return String(value).padStart(width);
}

/**
 * Normalizes rows for export by mapping display headers to formatted values.
 * @param {Array<Object>} rows - Backtest log rows.
 * @param {Array<Object>} columns - Column definitions.
 * @returns {Array<Object>} Array of export-ready rows.
 */
export function prepareRowsForExport(rows, columns) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns = Array.isArray(columns) ? columns : [];

    return safeRows.map(row => {
        const prepared = {};
        for (const column of safeColumns) {
            const header = column.exportHeader || column.header;
            prepared[header] = formatColumnValue(column, row);
        }
        return prepared;
    });
}

/**
 * Converts prepared rows into a CSV payload with escaped cells.
 * @param {Array<Object>} rows - Source rows to export.
 * @param {Array<Object>} columns - Column definitions controlling formatting.
 * @returns {string} CSV string containing header and data lines.
 */
export function convertRowsToCsv(rows, columns) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns = Array.isArray(columns) ? columns : [];

    const escapeCell = (value) => {
        const safeValue = value == null ? '' : String(value);
        return /["\n;]/.test(safeValue)
            ? `"${safeValue.replace(/"/g, '""')}"`
            : safeValue;
    };

    const headerLine = safeColumns.map(col => escapeCell(col.exportHeader || col.header)).join(CSV_DELIMITER);
    const dataLines = safeRows.map(row =>
        safeColumns.map(col => escapeCell(formatColumnValue(col, row))).join(CSV_DELIMITER)
    );
    return [headerLine, ...dataLines].join('\n');
}

/**
 * Triggers a browser download for the provided content.
 * @param {string} filename - Suggested file name for the download.
 * @param {string} content - File content to persist.
 * @param {string} mimeType - MIME type (e.g., text/csv).
 */
export function triggerDownload(filename, content, mimeType) {
    if (!filename || typeof filename !== 'string') {
        console.warn('triggerDownload: missing filename');
        return;
    }
    if (typeof content !== 'string') {
        console.warn('triggerDownload: content must be a string');
        return;
    }

    const blob = new Blob([content], { type: mimeType || 'application/octet-stream' });
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
 * Builds column definitions for the backtest log based on detail level.
 * @param {string} detailLevel - Either 'normal' or 'detailed'.
 * @returns {Array<Object>} Column definitions for rendering/export.
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
        {
            header: 'Markt', width: 12, key: 'row.Regime',
            valueFormatter: (v, row) => {
                const config = EngineAPI.getConfig();
                const map = config.TEXTS ? config.TEXTS.SCENARIO : {};
                const regimeText = map[v] || v || '';
                return regimeText.substring(0, 12);
            },
            align: 'left'
        },
        { header: 'Status', width: 16, key: 'row.aktionUndGrund', valueFormatter: v => (v || '').substring(0, 15), align: 'left' },
        { header: 'Quote%', width: 6, key: 'row.QuoteEndPct', valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'Runway%', width: 7, key: 'row.RunwayCoveragePct', valueFormatter: v => formatPercentInt(v), align: 'right' },
        { header: 'Pf.Akt%', width: 8, extractor: row => (row.row?.NominalReturnEquityPct || 0) * 100, valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'Pf.Gld%', width: 8, extractor: row => (row.row?.NominalReturnGoldPct || 0) * 100, valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'Infl.', width: 5, key: 'inflationVJ', valueFormatter: v => formatPercent(v), align: 'right' },
        {
            header: 'Handl.A', width: 8, key: 'netA', valueFormatter: v => {
                const formatted = formatCurrencyShortLog(v);
                if (v > 0) return `<span style="color: darkblue; font-weight: bold">${formatted}</span>`;
                if (v < 0) return `<span style="color: darkred; font-weight: bold">${formatted}</span>`;
                return formatted;
            }, align: 'right'
        },
        {
            header: 'Handl.G', width: 8, key: 'netG', valueFormatter: v => {
                const formatted = formatCurrencyShortLog(v);
                if (v > 0) return `<span style="color: darkblue; font-weight: bold">${formatted}</span>`;
                if (v < 0) return `<span style="color: darkred; font-weight: bold">${formatted}</span>`;
                return formatted;
            }, align: 'right'
        },
        { header: 'St.', width: 6, key: 'row.steuern_gesamt', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
        { header: 'Aktien', width: 8, key: 'wertAktien', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
        { header: 'Gold', width: 7, key: 'wertGold', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
        { header: 'Liq.', width: 7, key: 'liquiditaet', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' }
    );

    if (isDetailed) {
        columns.push(
            { header: 'Liq@rC-', width: 9, key: 'row.liqStart', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'Zins€', width: 7, key: 'row.cashInterestEarned', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'Liq@rC+', width: 9, key: 'row.liqEnd', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'ZielLiq', width: 8, key: 'row.zielLiquiditaet', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'NeedLiq', width: 8, key: 'row.NeedLiq', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'GuardG', width: 7, key: 'row.GuardGold', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'GuardA', width: 7, key: 'row.GuardEq', valueFormatter: v => formatCurrencyShortLog(v), align: 'right' },
            { header: 'GuardNote', width: 16, key: 'row.GuardNote', valueFormatter: v => (v || '').substring(0, 16), align: 'right' }
        );
    }

    return columns;
}
