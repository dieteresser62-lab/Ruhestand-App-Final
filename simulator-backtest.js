"use strict";

/**
 * Backtest-Modul, ausgelagert aus `simulator-main.js`, um die Datei aufzuteilen und
 * die Backtest-spezifischen Helfer (Log-Aufbereitung, Exporte) gebündelt zu halten.
 */
import { formatCurrency, formatCurrencyShortLog } from './simulator-utils.js';
import { HISTORICAL_DATA, BREAK_ON_RUIN } from './simulator-data.js';
import { getCommonInputs, initializePortfolio } from './simulator-portfolio.js';
import { simulateOneYear } from './simulator-engine.js';
import { loadDetailLevel, BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY, portfolioTotal } from './simulator-results.js';

/**
 * Berechnet die Rentenanpassungsrate für ein Backtest-Jahr basierend auf dem Modus.
 * Unterstützt fixe Anpassung sowie Kopplung an Lohn- oder Inflationsreihen.
 *
 * @param {{inputs: {rentAdj?: {mode?: string, pct?: number}}, series: {wageGrowth?: number[], inflationPct?: number[], startYear?: number}, simStartYear: number}} ctx
 *        Kontext-Objekt mit Eingaben und historischen Reihen.
 * @param {number} yearIdx Index des Simulationsjahres (0-basiert ab simStartYear).
 * @returns {number} Berechnete Anpassungsrate in Prozentpunkten.
 */
function computeAdjPctForYear(ctx, yearIdx) {
    const mode = ctx.inputs.rentAdj?.mode || "fix";
    if (mode === "fix") return Number(ctx.inputs.rentAdj?.pct || 0);

    const series = ctx.series || {};
    const offsetIdx = (ctx.simStartYear ?? 0) - (series.startYear ?? 0) + yearIdx;

    if (mode === "wage") {
        const value = Array.isArray(series.wageGrowth) ? series.wageGrowth[offsetIdx] : undefined;
        return Number.isFinite(value) ? Number(value) : 0;
    }

    if (mode === "cpi") {
        const value = Array.isArray(series.inflationPct) ? series.inflationPct[offsetIdx] : undefined;
        return Number.isFinite(value) ? Number(value) : 0;
    }

    return 0;
}

/**
 * Liest einen verschachtelten Wert aus einem Objekt anhand eines dot-notierten Pfads.
 *
 * @param {object} obj Ausgangsobjekt mit verschachtelten Feldern.
 * @param {string} path Pfad mit Punkten (z. B. "row.rente1").
 * @returns {*} Gefundener Wert oder undefined.
 */
function getNestedValue(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

/**
 * Ermittelt den Rohwert einer Spalte anhand von Extractor oder Key.
 *
 * @param {object} column Spalten-Definition inkl. extractor/key.
 * @param {object} row Aktuelle Datenzeile.
 * @returns {*} Rohwert für weitere Formatierung.
 */
function resolveColumnRawValue(column, row) {
    if (typeof column.extractor === 'function') {
        return column.extractor(row);
    }
    if (column.key) {
        return getNestedValue(row, column.key);
    }
    return undefined;
}

/**
 * Formatiert einen Spaltenwert mit optionalen Formatierern.
 *
 * @param {object} column Spalten-Definition mit valueFormatter/fmt.
 * @param {object} row Aktuelle Datenzeile.
 * @returns {string|*} Formatierter Wert oder Rohwert als Fallback.
 */
function formatColumnValue(column, row) {
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
 * Bereitet Datensätze für den Export vor, indem Spaltenwerte formatiert werden.
 *
 * @param {object[]} rows Log-Zeilen.
 * @param {object[]} columns Spalten-Definitionen.
 * @returns {object[]} Export-taugliche Objekte.
 */
function prepareRowsForExport(rows, columns) {
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
 * Konvertiert Log-Zeilen in CSV-Text mit sicherem Escaping.
 *
 * @param {object[]} rows Log-Zeilen.
 * @param {object[]} columns Spalten-Definitionen.
 * @returns {string} CSV-Text.
 */
function convertRowsToCsv(rows, columns) {
    const CSV_DELIMITER = ';';
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
 * Baut die Spalten-Definitionen für die Backtest-Logtabelle abhängig vom Detail-Level.
 *
 * @param {('normal'|'detailed')} detailLevel Gewählter Detailgrad.
 * @returns {object[]} Spalten-Definitionen mit Headern und Formatierern.
 */
function buildBacktestColumnDefinitions(detailLevel = 'normal') {
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
                const regimeText = window.Ruhestandsmodell_v30?.CONFIG?.SCENARIO_TEXT?.[v] || v || '';
                return regimeText.substring(0, 12);
            },
            align: 'left'
        },
        { header: 'Status', width: 16, key: 'row.aktionUndGrund', valueFormatter: v => (v || '').substring(0, 15), align: 'left' },
        { header: 'Quote%', width: 6, key: 'row.QuoteEndPct', valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'Runway%', width: 7, key: 'row.RunwayCoveragePct', valueFormatter: v => formatPercentInt(v), align: 'right' },
        { header: 'R.Aktien', width: 8, extractor: row => (row.row?.RealReturnEquityPct || 0) * 100, valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'R.Gold', width: 8, extractor: row => (row.row?.RealReturnGoldPct || 0) * 100, valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'Infl.', width: 5, key: 'inflationVJ', valueFormatter: v => formatPercent(v), align: 'right' },
        { header: 'Handl.A', width: 8, key: 'netA', valueFormatter: v => {
            const formatted = formatCurrencyShortLog(v);
            if (v > 0) return `<span style="color: darkblue; font-weight: bold">${formatted}</span>`;
            if (v < 0) return `<span style="color: darkred; font-weight: bold">${formatted}</span>`;
            return formatted;
        }, align: 'right' },
        { header: 'Handl.G', width: 8, key: 'netG', valueFormatter: v => {
            const formatted = formatCurrencyShortLog(v);
            if (v > 0) return `<span style="color: darkblue; font-weight: bold">${formatted}</span>`;
            if (v < 0) return `<span style="color: darkred; font-weight: bold">${formatted}</span>`;
            return formatted;
        }, align: 'right' },
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
 * Rendert das Backtest-Log als HTML-Tabelle basierend auf globalen Log-Daten.
 */
function renderBacktestLog() {
    if (!window.globalBacktestData || !Array.isArray(window.globalBacktestData.rows) || window.globalBacktestData.rows.length === 0) {
        return;
    }

    const logDetailLevel = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY);
    const { rows: logRows } = window.globalBacktestData;
    const columns = buildBacktestColumnDefinitions(logDetailLevel);

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
}

/**
 * Erstellt einen Download-Blob und triggert den Download-Dialog.
 *
 * @param {string} filename Empfohlener Dateiname.
 * @param {string} content Dateiinhalte als String.
 * @param {string} mimeType MIME-Type wie "application/json".
 */
function triggerDownload(filename, content, mimeType) {
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
 * Exportiert das zuletzt berechnete Backtest-Log als JSON oder CSV.
 *
 * @param {('json'|'csv')} format Exportformat.
 */
function exportBacktestLogData(format = 'json') {
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
 * Führt einen historischen Backtest durch, sammelt Log-Daten und rendert Ergebnisse.
 */
function runBacktest() {
    try {
        const extraKPI = document.getElementById('monteCarloResults').style.display === 'block' ? (window.lastMcRunExtraKPI || {}) : {};
        document.getElementById('btButton').disabled = true;
        const inputs = getCommonInputs();
        const startJahr = parseInt(document.getElementById('simStartJahr').value);
        const endJahr = parseInt(document.getElementById('simEndJahr').value);

        if (startJahr < 1951 || endJahr > 2024 || startJahr >= endJahr) {
            alert(`Fehler: Bitte einen gültigen Zeitraum eingeben.\n- Der Zeitraum muss zwischen 1951 und 2024 liegen.`);
            document.getElementById('btButton').disabled = false;
            return;
        }

        const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b).filter(y => y >= 1950);
        const wageGrowthArray = histYears.map(y => HISTORICAL_DATA[y].lohn_de || 0);
        const inflationPctArray = histYears.map(y => HISTORICAL_DATA[y].inflation_de || 0);
        const HIST_SERIES_START_YEAR = 1950;

        const backtestCtx = {
            inputs: {
                rentAdj: {
                    mode: inputs.rentAdjMode || 'fix',
                    pct: inputs.rentAdjPct || 0
                }
            },
            series: {
                wageGrowth: wageGrowthArray,
                inflationPct: inflationPctArray,
                startYear: HIST_SERIES_START_YEAR
            },
            simStartYear: startJahr
        };

        const getHistVal = (y, prop) => (HISTORICAL_DATA[y] ? HISTORICAL_DATA[y][prop] : 0);

        let simState = {
            portfolio: initializePortfolio(inputs),
            baseFloor: inputs.startFloorBedarf,
            baseFlex: inputs.startFlexBedarf,
            lastState: null,
            currentAnnualPension: 0,
            currentAnnualPension2: 0,
            marketDataHist: {
                endeVJ: getHistVal(startJahr - 1, 'msci_eur'),
                endeVJ_1: getHistVal(startJahr - 2, 'msci_eur'),
                endeVJ_2: getHistVal(startJahr - 3, 'msci_eur'),
                endeVJ_3: getHistVal(startJahr - 4, 'msci_eur'),
                ath: 0,
                jahreSeitAth: 0,
                capeRatio: inputs.marketCapeRatio || 0
            }
        };

        const prevYearsVals = Object.keys(HISTORICAL_DATA)
            .filter(y => y < startJahr)
            .map(y => HISTORICAL_DATA[y].msci_eur);
        simState.marketDataHist.ath = prevYearsVals.length > 0 ? Math.max(...prevYearsVals) : (simState.marketDataHist.endeVJ || 0);

        let totalEntnahme = 0;
        let kuerzungJahreAmStueck = 0;
        let maxKuerzungStreak = 0;
        let jahreMitKuerzung = 0;
        let totalSteuern = 0;
        const logRows = [];

        const p = (str, len) => String(str).padStart(len);
        const pf = (val, len) => p(`${(val || 0).toFixed(1)}%`, len);
        const pfInt = (val, len) => p(`${Math.round(val || 0)}%`, len);

        const logDetailLevel = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY);

        let headerCols = [
            "Jahr".padEnd(4), "Entn.".padStart(7), "Floor".padStart(7)
        ];
        if (logDetailLevel === 'detailed') {
            headerCols.push("Rente1".padStart(7), "Rente2".padStart(7));
        }
        headerCols.push("RenteSum".padStart(8));
        if (logDetailLevel === 'detailed') {
            headerCols.push("FloorDep".padStart(8));
        }
        headerCols.push("Flex%".padStart(5), "Flex€".padStart(7));
        if (logDetailLevel === 'detailed') {
            headerCols.push("Entn_real".padStart(9), "Adj%".padStart(5));
        }
        headerCols.push(
            "Status".padEnd(16), "Quote%".padStart(6), "Runway%".padStart(7),
            "R.Aktien".padStart(8), "R.Gold".padStart(8), "Infl.".padStart(5),
            "Handl.A".padStart(8), "Handl.G".padStart(8), "St.".padStart(6),
            "Aktien".padStart(8), "Gold".padStart(7), "Liq.".padStart(7)
        );
        if (logDetailLevel === 'detailed') {
            headerCols.push("NeedLiq".padStart(8), "GuardG".padStart(7), "GuardA".padStart(7), "GuardNote".padStart(16));
        }
        let header = headerCols.join("  ");
        let log = header + "\n" + "=".repeat(header.length) + "\n";

        for (let jahr = startJahr; jahr <= endJahr; jahr++) {
            const dataVJ = HISTORICAL_DATA[jahr - 1];
            if (!dataVJ || !HISTORICAL_DATA[jahr]) { log += `${jahr}: Fehlende Daten.\n`; continue; }

            const jahresrenditeAktien = (HISTORICAL_DATA[jahr].msci_eur - dataVJ.msci_eur) / dataVJ.msci_eur;
            const jahresrenditeGold = (dataVJ.gold_eur_perf || 0) / 100;
            const yearData = { ...dataVJ, rendite: jahresrenditeAktien, gold_eur_perf: dataVJ.gold_eur_perf, zinssatz: dataVJ.zinssatz_de, inflation: dataVJ.inflation_de, jahr };

            const yearIndex = jahr - startJahr;
            const adjPct = computeAdjPctForYear(backtestCtx, yearIndex);
            const adjustedInputs = { ...inputs, rentAdjPct: adjPct };
            const result = simulateOneYear(simState, adjustedInputs, yearData, yearIndex);

            if (result.isRuin) {
                log += `${String(jahr).padEnd(5)}... RUIN ...\n`;
                if (BREAK_ON_RUIN) break;
            }

            simState = result.newState;
            totalSteuern += result.totalTaxesThisYear;
            const row = result.logData;
            const { entscheidung, wertAktien, wertGold, liquiditaet } = row;
            totalEntnahme += entscheidung.jahresEntnahme;

            const netA = (row.vk?.vkAkt || 0) - (row.kaufAkt || 0);
            const netG = (row.vk?.vkGld || 0) - (row.kaufGld || 0);

            logRows.push({
                jahr, row, entscheidung, wertAktien, wertGold, liquiditaet,
                netA, netG, adjPct, inflationVJ: dataVJ.inflation_de
            });

            let logCols = [
                p(jahr, 4),
                formatCurrencyShortLog(entscheidung.jahresEntnahme).padStart(7),
                formatCurrencyShortLog(row.floor_brutto).padStart(7)
            ];
            if (logDetailLevel === 'detailed') {
                logCols.push(
                    formatCurrencyShortLog(row.rente1 || 0).padStart(7),
                    formatCurrencyShortLog(row.rente2 || 0).padStart(7)
                );
            }
            logCols.push(formatCurrencyShortLog(row.renteSum || 0).padStart(8));
            if (logDetailLevel === 'detailed') {
                logCols.push(formatCurrencyShortLog(row.floor_aus_depot).padStart(8));
            }
            logCols.push(
                pfInt(row.FlexRatePct, 5),
                formatCurrencyShortLog(row.flex_erfuellt_nominal).padStart(7)
            );
            if (logDetailLevel === 'detailed') {
                logCols.push(
                    formatCurrencyShortLog(row.jahresentnahme_real).padStart(9),
                    pf(adjPct, 5)
                );
            }
            logCols.push(
                row.aktionUndGrund.substring(0, 15).padEnd(16),
                pf(row.QuoteEndPct, 6),
                pfInt(row.RunwayCoveragePct, 7),
                pf((row.RealReturnEquityPct || 0) * 100, 8),
                pf((row.RealReturnGoldPct || 0) * 100, 8),
                pf(dataVJ.inflation_de, 5),
                formatCurrencyShortLog(netA).padStart(8),
                formatCurrencyShortLog(netG).padStart(8),
                formatCurrencyShortLog(row.steuern_gesamt || 0).padStart(6),
                formatCurrencyShortLog(wertAktien).padStart(8),
                formatCurrencyShortLog(wertGold).padStart(7),
                formatCurrencyShortLog(liquiditaet).padStart(7)
            );
            if (logDetailLevel === 'detailed') {
                logCols.push(
                    formatCurrencyShortLog(row.NeedLiq || 0).padStart(8),
                    formatCurrencyShortLog(row.GuardGold || 0).padStart(7),
                    formatCurrencyShortLog(row.GuardEq || 0).padStart(7),
                    String(row.GuardNote || '').substring(0, 16).padStart(16)
                );
            }
            log += logCols.join("  ") + "\n";

            if (entscheidung.kuerzungProzent >= 10) {
                jahreMitKuerzung++;
                kuerzungJahreAmStueck++;
            } else {
                maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck);
                kuerzungJahreAmStueck = 0;
            }
        }
        maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck);
        const endVermoegen = portfolioTotal(simState.portfolio);

        window.globalBacktestData = { rows: logRows, startJahr };

        document.getElementById('simulationResults').style.display = 'block';
        document.getElementById('simulationSummary').innerHTML = `
         <div class="summary-grid">
            <div class="summary-item"><strong>Startvermögen</strong><span>${formatCurrency(inputs.startVermoegen)}</span></div>
            <div class="summary-item"><strong>Endvermögen</strong><span>${formatCurrency(endVermoegen)}</span></div>
            <div class="summary-item highlight"><strong>Gesamte Entnahmen</strong><span>${formatCurrency(totalEntnahme)}</span></div>
            <div class="summary-item"><strong>Max. Kürzungsdauer</strong><span>${maxKuerzungStreak} Jahre</span></div>
            <div class="summary-item"><strong>Jahre mit Kürzung (>10%)</strong><span>${jahreMitKuerzung} von ${endJahr - startJahr + 1}</span></div>
            <div class="summary-item tax"><strong>Gezahlte Steuern</strong><span>${formatCurrency(totalSteuern)}</span></div>
        </div>`;
        renderBacktestLog();
    } catch (error) {
        alert("Ein Fehler ist im Backtest aufgetreten:\n\n" + error.message + "\n" + error.stack);
        console.error("Fehler in runBacktest():", error);
    } finally {
        document.getElementById('btButton').disabled = false;
    }
}

export { runBacktest, renderBacktestLog, exportBacktestLogData };
