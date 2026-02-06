"use strict";

import { BREAK_ON_RUIN, HISTORICAL_DATA } from './simulator-data.js';
import { initializePortfolio, getCommonInputs, sumDepot } from './simulator-portfolio.js';
import { simulateOneYear } from './simulator-engine-wrapper.js';
import { formatCurrency, formatCurrencyShortLog } from './simulator-utils.js';
import { formatPercentValue } from './simulator-formatting.js';
import {
    BACKTEST_LOG_DETAIL_KEY,
    LEGACY_LOG_DETAIL_KEY,
    loadDetailLevel,
    persistDetailLevel,
    portfolioTotal
} from './simulator-results.js';
import {
    buildBacktestColumnDefinitions,
    computeAdjPctForYear,
    convertRowsToCsv,
    formatColumnValue,
    prepareRowsForExport,
    triggerDownload
} from './simulator-main-helpers.js';

const HIST_SERIES_START_YEAR = 1950;

/**
 * Pads a value to the left, ensuring consistent monospace alignment within the textual backtest log.
 * @param {string|number} value - Value to be padded.
 * @param {number} targetWidth - Desired width of the output string.
 * @returns {string} Left-padded string.
 */
function padLeft(value, targetWidth) {
    return String(value).padStart(targetWidth);
}

/**
 * Formats a numeric value as a percentage with one decimal place, applying left padding.
 * @param {number} value - Percentage value (e.g., 2.5 represents 2.5%).
 * @param {number} targetWidth - Desired width of the output string.
 * @returns {string} Formatted percentage string.
 */
function formatPercentOneDecimal(value, targetWidth) {
    const formatted = formatPercentValue(value || 0, { fractionDigits: 1, invalid: '0.0%' });
    return padLeft(formatted, targetWidth);
}

/**
 * Formats a numeric value as a percentage with zero decimals, applying left padding.
 * @param {number} value - Percentage value.
 * @param {number} targetWidth - Desired width of the output string.
 * @returns {string} Formatted integer percentage string.
 */
function formatPercentInteger(value, targetWidth) {
    const formatted = formatPercentValue(Math.round(value || 0), { fractionDigits: 0, invalid: '0%' });
    return padLeft(formatted, targetWidth);
}

/**
 * Führt einen historischen Backtest durch.
 * Lesen und Schreiben erfolgen weiterhin über das DOM, damit bestehende UI-Flows unverändert bleiben.
 */
export function runBacktest() {
    try {
        // Reuse MC extra KPIs when available for context in the log UI.
        const extraKPI = document.getElementById('monteCarloResults').style.display === 'block' ? (window.lastMcRunExtraKPI || {}) : {};
        document.getElementById('btButton').disabled = true;
        const inputs = getCommonInputs();
        const startJahr = parseInt(document.getElementById('simStartJahr').value);
        const endJahr = parseInt(document.getElementById('simEndJahr').value);
        if (startJahr < 1951 || endJahr > 2024 || startJahr >= endJahr) {
            alert(`Fehler: Bitte einen gültigen Zeitraum eingeben.\n- Der Zeitraum muss zwischen 1951 und 2024 liegen.`);
            document.getElementById('btButton').disabled = false; return;
        }

        // Historische Reihen als Arrays aufbauen (1970-2024)
        const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b).filter(y => y >= 1950);
        const wageGrowthArray = histYears.map(y => HISTORICAL_DATA[y].lohn_de || 0);
        const inflationPctArray = histYears.map(y => HISTORICAL_DATA[y].inflation_de || 0);

        // Backtest-Kontext für Rentenanpassung
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

        // Helper to safely get historical data
        const getHistVal = (y, prop) => (HISTORICAL_DATA[y] ? HISTORICAL_DATA[y][prop] : 0);

        let simState = {
            portfolio: initializePortfolio(inputs),
            baseFloor: inputs.startFloorBedarf,
            baseFlex: inputs.startFlexBedarf,
            baseFlexBudgetAnnual: inputs.flexBudgetAnnual || 0,
            baseFlexBudgetRecharge: inputs.flexBudgetRecharge || 0,
            lastState: null,
            currentAnnualPension: (inputs.renteMonatlich || 0) * 12,
            currentAnnualPension2: (inputs.partner?.brutto || 0),
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

        let totalEntnahme = 0, kuerzungJahreAmStueck = 0, maxKuerzungStreak = 0, jahreMitKuerzung = 0, totalSteuern = 0;
        const logRows = []; // Speichere Log-Daten für späteres Neu-Rendern

        // Lese Detail-Level für Backtests aus localStorage (entkoppelt vom Worst-Log)
        const logDetailLevel = loadDetailLevel(BACKTEST_LOG_DETAIL_KEY, LEGACY_LOG_DETAIL_KEY);

        // Header basierend auf Detail-Level
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
        headerCols.push(
            "Flex%".padStart(5),
            "MinF%".padStart(5),
            "WRed%".padStart(5),
            "WQ%".padStart(4),
            "Flex€".padStart(7)
        );
        if (logDetailLevel === 'detailed') {
            headerCols.push("Entn_real".padStart(9), "Adj%".padStart(5));
        }
        headerCols.push(
            "Status".padEnd(16), "Cut".padEnd(12), "Alarm".padEnd(6), "Quote%".padStart(6), "Runway%".padStart(7),
            "Pf.Akt%".padStart(8), "Pf.Gld%".padStart(8), "Infl.".padStart(5),
            "Handl.A".padStart(8), "Handl.G".padStart(8), "St.".padStart(6),
            "Aktien".padStart(8), "Gold".padStart(7), "Liq.".padStart(7)
        );
        if (logDetailLevel === 'detailed') {
            headerCols.push(
                "Liq@rC-".padStart(9), "Zins€".padStart(7), "Liq@rC+".padStart(9),
                "ZielLiq".padStart(8), "NeedLiq".padStart(8), "GuardG".padStart(7), "GuardA".padStart(7), "GuardNote".padStart(16),
                "Akt_vorR".padStart(9), "Akt_nachR".padStart(9), "Akt_nachV".padStart(9), "Akt_nachK".padStart(9),
                "Gld_vorR".padStart(9), "Gld_nachR".padStart(9), "Gld_nachV".padStart(9), "Gld_nachK".padStart(9)
            );
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

            // Berechne dynamische Rentenanpassung mit neuer Helper-Funktion
            const adjPct = computeAdjPctForYear(backtestCtx, yearIndex);

            // Übergebe die berechnete Anpassungsrate an simulateOneYear
            const adjustedInputs = { ...inputs, rentAdjPct: adjPct };
            const result = simulateOneYear(simState, adjustedInputs, yearData, yearIndex);

            if (result.isRuin) {
                log += `${String(jahr).padEnd(5)}... RUIN ...\n`; 
                
                // Expliziter Ruin-Eintrag für die Tabelle erzwingen
                logRows.push({
                    jahr,
                    row: {
                        floor_brutto: simState.baseFloor,
                        renteSum: 0,
                        aktionUndGrund: "!!! RUIN !!!",
                        Regime: "BANKRUPT",
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
                    adjPct: adjPct,
                    inflationVJ: dataVJ.inflation_de
                });

                if (BREAK_ON_RUIN) break;
            }

            simState = result.newState;
            totalSteuern += result.totalTaxesThisYear;
            const row = result.logData;
            const { entscheidung, wertAktien, wertGold, liquiditaet } = row;
            totalEntnahme += entscheidung.jahresEntnahme;

            const netA = Number.isFinite(row.netTradeEq)
                ? row.netTradeEq
                : (row.vk?.vkAkt || 0) - (row.kaufAkt || 0);
            const netG = Number.isFinite(row.netTradeGold)
                ? row.netTradeGold
                : (row.vk?.vkGld || 0) - (row.kaufGld || 0);

            // Speichere Log-Daten für späteres Neu-Rendern
            logRows.push({
                jahr, row, entscheidung, wertAktien, wertGold, liquiditaet,
                netA, netG, adjPct, inflationVJ: dataVJ.inflation_de
            });

            // Log-Zeile basierend auf Detail-Level
            let logCols = [
                padLeft(jahr, 4),
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
                formatPercentInteger(row.FlexRatePct, 5),
                formatPercentInteger(row.MinFlexRatePct || 0, 5),
                formatPercentInteger(row.WealthRedF || 0, 5),
                formatPercentInteger(row.WealthQuoteUsedPct || 0, 4),
                formatCurrencyShortLog(row.flex_erfuellt_nominal).padStart(7)
            );
            if (logDetailLevel === 'detailed') {
                logCols.push(
                    formatCurrencyShortLog(row.jahresentnahme_real).padStart(9),
                    formatPercentOneDecimal(adjPct, 5)
                );
            }
            logCols.push(
                row.aktionUndGrund.substring(0, 15).padEnd(16),
                (row.CutReason || '').substring(0, 12).padEnd(12),
                (row.Alarm ? 'A' : '').padEnd(6),
                formatPercentOneDecimal(row.QuoteEndPct, 6),
                formatPercentInteger(row.RunwayCoveragePct, 7),
                formatPercentOneDecimal((row.NominalReturnEquityPct || 0) * 100, 8),
                formatPercentOneDecimal((row.NominalReturnGoldPct || 0) * 100, 8),
                formatPercentOneDecimal(dataVJ.inflation_de, 5),
                formatCurrencyShortLog(netA).padStart(8),
                formatCurrencyShortLog(netG).padStart(8),
                formatCurrencyShortLog(row.steuern_gesamt || 0).padStart(6),
                formatCurrencyShortLog(wertAktien).padStart(8),
                formatCurrencyShortLog(wertGold).padStart(7),
                formatCurrencyShortLog(liquiditaet).padStart(7)
            );
            if (logDetailLevel === 'detailed') {
                logCols.push(
                    formatCurrencyShortLog(row.liqStart || 0).padStart(9),
                    formatCurrencyShortLog(row.cashInterestEarned || 0).padStart(7),
                    formatCurrencyShortLog(row.liqEnd || 0).padStart(9),
                    formatCurrencyShortLog(row.zielLiquiditaet || 0).padStart(8),
                    formatCurrencyShortLog(row.NeedLiq || 0).padStart(8),
                    formatCurrencyShortLog(row.GuardGold || 0).padStart(7),
                    formatCurrencyShortLog(row.GuardEq || 0).padStart(7),
                    String(row.GuardNote || '').substring(0, 16).padStart(16),
                    formatCurrencyShortLog(row.eq_before_return || 0).padStart(9),
                    formatCurrencyShortLog(row.eq_after_return || 0).padStart(9),
                    formatCurrencyShortLog(row.eq_after_sales || 0).padStart(9),
                    formatCurrencyShortLog(row.eq_after_buys || 0).padStart(9),
                    formatCurrencyShortLog(row.gold_before_return || 0).padStart(9),
                    formatCurrencyShortLog(row.gold_after_return || 0).padStart(9),
                    formatCurrencyShortLog(row.gold_after_sales || 0).padStart(9),
                    formatCurrencyShortLog(row.gold_after_buys || 0).padStart(9)
                );
            }
            log += logCols.join("  ") + "\n";

            if (entscheidung.kuerzungProzent >= 10) { jahreMitKuerzung++; kuerzungJahreAmStueck++; }
            else { maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck); kuerzungJahreAmStueck = 0; }
        }
        maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck);
        const endVermoegen = portfolioTotal(simState.portfolio);

        // Speichere Log-Daten für späteres Neu-Rendern
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
    const columns = buildBacktestColumnDefinitions(logDetailLevel);

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
