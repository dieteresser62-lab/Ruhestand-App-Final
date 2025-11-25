"use strict";

/**
 * ============================================================================
 * SWEEP FIX: ZWEI-PERSONEN-HAUSHALT - PARAMETER WHITELIST & RENTE-2-INVARIANZ
 * ============================================================================
 *
 * Datum: 2025-11-07
 *
 * ÄNDERUNGEN:
 * -----------
 * 1. **Whitelist statt Blacklist für Sweep-Parameter**
 *    - Nur explizit erlaubte Parameter (SWEEP_ALLOWED_KEYS) dürfen im Sweep variiert werden
 *    - Verhindert unbeabsichtigte Änderungen an Person-2-Parametern (Rente, Alter, etc.)
 *    - Blocklist (SWEEP_BLOCK_PATTERNS) für zusätzlichen Schutz von Person-2-Feldern
 *
 * 2. **Deep-Copy der Settings pro Sweep-Zelle**
 *    - deepClone() verwendet structuredClone() (Browser-Native) oder JSON-Fallback
 *    - Verhindert Side-Effects zwischen Sweep-Cases
 *    - baseInputs werden nur EINMAL gelesen und dann geklont
 *
 * 3. **Renten-Invarianz-Wächter für Person 2**
 *    - Extrahiert Rente-2-Serie aus Year-Logs (extractR2Series)
 *    - Vergleicht Rente-2 über alle Sweep-Cases (areR2SeriesEqual)
 *    - Setzt warningR2Varies-Flag bei Abweichungen
 *    - Referenz-Serie wird beim ersten Case gesetzt
 *
 * 4. **Heatmap-Badge & Tooltip für Verstöße**
 *    - Gelber Rand (stroke-width: 3px) bei warningR2Varies
 *    - Warn-Symbol ⚠ in betroffenen Heatmap-Zellen
 *    - Tooltip: "⚠ Rente 2 variierte im Sweep"
 *    - Keine KPI-Verfälschung, nur visuelle Markierung
 *
 * 5. **Developer-Tests mit fixem Seed**
 *    - runSweepSelfTest() für Mini-Sweep mit R2-Invarianz-Prüfung
 *    - Aktivierung via Dev-Mode Toggle (localStorage: sim.devMode=1)
 *    - Console-Logs mit [SWEEP] Prefix
 *    - Visuelle Bestätigung in UI (grün/rot)
 *
 * DEVELOPER-FLAGS:
 * ----------------
 * - Dev-Mode aktivieren: localStorage.setItem('sim.devMode', '1'); dann Reload
 *   oder: Klick auf "Dev-Mode" Toggle im UI (falls vorhanden)
 * - Self-Test Button erscheint dann im Parameter-Sweep Tab
 * - Fixed Seed für Tests: Wird in runSweepSelfTest() hartcodiert (baseSeed = 12345)
 *
 * BETROFFENE DATEIEN:
 * -------------------
 * - simulator-main.js:     Haupt-Sweep-Logik, Whitelist, Deep-Clone, R2-Assertion
 * - simulator-heatmap.js:  Heatmap-Rendering mit R2-Warning-Badge
 * - simulator-results.js:  Metriken-Aggregation (warningR2Varies)
 *
 * FUNKTIONEN:
 * -----------
 * - deepClone(obj)                     ~Zeile 100 (nach Imports)
 * - SWEEP_ALLOWED_KEYS                 ~Zeile 130 (Whitelist-Definition)
 * - SWEEP_BLOCK_PATTERNS               ~Zeile 145 (Blocklist für Person-2)
 * - isBlockedKey(key)                  ~Zeile 155 (Blocklist-Prüfung)
 * - extractR2Series(yearLog)           ~Zeile 164 (Rente-2-Serie extrahieren)
 * - areR2SeriesEqual(s1, s2, tol)      ~Zeile 186 (Rente-2-Vergleich)
 * - runParameterSweep()                ~Zeile 1278 (Haupt-Sweep-Logik)
 * - runSweepSelfTest()                 ~Zeile 1577 (Developer-Test)
 *
 * ============================================================================
 */

import { rng, quantile, sum, mean, formatCurrency, parseRange, parseRangeInput, cartesianProduct, cartesianProductLimited } from './simulator-utils.js';
import { getStartYearCandidates } from './cape-utils.js';
import { ENGINE_VERSION, ENGINE_HASH, STRESS_PRESETS, BREAK_ON_RUIN, MORTALITY_TABLE, HISTORICAL_DATA, annualData, SUPPORTED_PFLEGE_GRADES } from './simulator-data.js';
import {
    getCommonInputs,
    updateStartPortfolioDisplay,
    initializePortfolio,
    prepareHistoricalData,
    buildStressContext,
    applyStressOverride,
    computeRentAdjRate
} from './simulator-portfolio.js';
import {
    simulateOneYear,
    initMcRunState,
    makeDefaultCareMeta,
    sampleNextYearData,
    computeRunStatsFromSeries,
    updateCareMeta,
    calcCareCost,
    computeCareMortalityMultiplier,
    computeHouseholdFlexFactor
} from './simulator-engine.js';
import {
    portfolioTotal,
    displayMonteCarloResults,
    renderWorstRunLog,
    aggregateSweepMetrics,
    getWorstRunColumnDefinitions,
    loadDetailLevel,
    persistDetailLevel,
    WORST_LOG_DETAIL_KEY,
    BACKTEST_LOG_DETAIL_KEY,
    LEGACY_LOG_DETAIL_KEY
} from './simulator-results.js';
import { formatCurrencyShortLog } from './simulator-utils.js';
import { sumDepot } from './simulator-portfolio.js';
import { renderSweepHeatmapSVG } from './simulator-heatmap.js';
import {
    applyPflegeKostenPreset,
    updatePflegePresetHint,
    updatePflegeUIInfo,
    initializePflegeUIControls
} from './simulator-ui-pflege.js';
import { initRente2ConfigWithLocalStorage } from './simulator-ui-rente.js';
import { runMonteCarlo } from './simulator-monte-carlo.js';
import {
    cloneStressContext,
    normalizeWidowOptions,
    computeMarriageYearsCompleted,
    deepClone,
    setNested,
    SWEEP_ALLOWED_KEYS,
    SWEEP_BLOCK_PATTERNS,
    isBlockedKey,
    extractP2Invariants,
    areP2InvariantsEqual,
    extractR2Series,
    areR2SeriesEqual,
    withNoLSWrites
} from './simulator-sweep-utils.js';
import {
    applyPensionTax,
    buildBacktestColumnDefinitions,
    computeAdjPctForYear,
    convertRowsToCsv,
    formatCellForDisplay,
    formatColumnValue,
    getNestedValue,
    prepareRowsForExport,
    resolveColumnRawValue,
    triggerDownload
} from './simulator-main-helpers.js';

const CARE_GRADE_FIELD_IDS = SUPPORTED_PFLEGE_GRADES.flatMap(grade => [
    `pflegeStufe${grade}Zusatz`,
    `pflegeStufe${grade}FlexCut`,
    `pflegeStufe${grade}Mortality`
]);


/**
 * Führt die Monte-Carlo-Simulation durch
 */
/**
 * Führt einen historischen Backtest durch
 */
export function runBacktest() {
    try {
        const extraKPI = document.getElementById('monteCarloResults').style.display === 'block' ? (window.lastMcRunExtraKPI || {}) : {};
        document.getElementById('btButton').disabled = true;
        const inputs = getCommonInputs();
        const startJahr = parseInt(document.getElementById('simStartJahr').value); const endJahr = parseInt(document.getElementById('simEndJahr').value);
        if (startJahr < 1951 || endJahr > 2024 || startJahr >= endJahr) {
            alert(`Fehler: Bitte einen gültigen Zeitraum eingeben.\n- Der Zeitraum muss zwischen 1951 und 2024 liegen.`);
            document.getElementById('btButton').disabled = false; return;
        }

        // Historische Reihen als Arrays aufbauen (1970-2024)
        const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b).filter(y => y >= 1950);
        const wageGrowthArray = histYears.map(y => HISTORICAL_DATA[y].lohn_de || 0);
        const inflationPctArray = histYears.map(y => HISTORICAL_DATA[y].inflation_de || 0);
        const HIST_SERIES_START_YEAR = 1950;

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

        let totalEntnahme = 0, kuerzungJahreAmStueck = 0, maxKuerzungStreak = 0, jahreMitKuerzung = 0, totalSteuern = 0;
        const logRows = []; // Speichere Log-Daten für späteres Neu-Rendern

        const p = (str, len) => String(str).padStart(len);
        const pf = (val, len) => p(`${(val || 0).toFixed(1)}%`, len);
        const pfInt = (val, len) => p(`${Math.round(val || 0)}%`, len);

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

            // Berechne dynamische Rentenanpassung mit neuer Helper-Funktion
            const adjPct = computeAdjPctForYear(backtestCtx, yearIndex);

            // Übergebe die berechnete Anpassungsrate an simulateOneYear
            const adjustedInputs = { ...inputs, rentAdjPct: adjPct };
            const result = simulateOneYear(simState, adjustedInputs, yearData, yearIndex);

            if (result.isRuin) {
                log += `${String(jahr).padEnd(5)}... RUIN ...\n`; if (BREAK_ON_RUIN) break;
            }

            simState = result.newState;
            totalSteuern += result.totalTaxesThisYear;
            const row = result.logData;
            const { entscheidung, wertAktien, wertGold, liquiditaet } = row;
            totalEntnahme += entscheidung.jahresEntnahme;

            const netA = (row.vk?.vkAkt || 0) - (row.kaufAkt || 0);
            const netG = (row.vk?.vkGld || 0) - (row.kaufGld || 0);

            // Speichere Log-Daten für späteres Neu-Rendern
            logRows.push({
                jahr, row, entscheidung, wertAktien, wertGold, liquiditaet,
                netA, netG, adjPct, inflationVJ: dataVJ.inflation_de
            });

            // Log-Zeile basierend auf Detail-Level
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

function renderBacktestLog() {
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

// Mache die Funktion global verfügbar
window.renderBacktestLog = renderBacktestLog;
window.exportBacktestLogData = exportBacktestLogData;

/**
 * Prüft Engine-Version und -Hash
 */
export function selfCheckEngine() {
    if (typeof window.Ruhestandsmodell_v30 === 'undefined') {
        const footer = document.getElementById('engine-mismatch-footer');
        if (footer) {
            footer.textContent = `FEHLER: Die Engine-Datei 'engine.js' konnte nicht geladen werden!`;
            footer.style.display = 'block';
        }
        return;
    };

    const fnBody = Object.values(window.Ruhestandsmodell_v30).reduce((s, fn) => s + (typeof fn === 'function' ? fn.toString() : ''), '');
    let hash = 0;
    for (let i = 0; i < fnBody.length; i++) {
        hash = ((hash << 5) - hash) + fnBody.charCodeAt(i);
        hash |= 0;
    }
    const currentHash = String(Math.abs(hash));
    const mismatch = window.Ruhestandsmodell_v30.VERSION !== ENGINE_VERSION;

    const footer = document.getElementById('engine-mismatch-footer');
    if (mismatch && footer) {
        footer.textContent = `WARNUNG: Engine-Version veraltet! Erwartet: ${ENGINE_VERSION}, gefunden: ${window.Ruhestandsmodell_v30.VERSION}`;
        footer.style.display = 'block';
    }
}

/**
 * DOM-Initialisierung und Event-Handler
 */
window.onload = function () {
    selfCheckEngine();
    prepareHistoricalData();

    updateStartPortfolioDisplay();

    const allInputs = [
        'simStartVermoegen', 'depotwertAlt', 'zielLiquiditaet',
        'goldAllokationAktiv', 'goldAllokationProzent', 'goldFloorProzent', 'rebalancingBand',
        'goldSteuerfrei', 'startFloorBedarf', 'startFlexBedarf',
        'einstandAlt', 'p1StartAlter', 'p1Geschlecht', 'p1SparerPauschbetrag', 'p1KirchensteuerPct',
        'p1Monatsrente', 'p1StartInJahren', 'rentAdjMode', 'rentAdjPct',
        'pflegefallLogikAktivieren', 'pflegeModellTyp', ...CARE_GRADE_FIELD_IDS,
        'pflegeMaxFloor', 'pflegeRampUp', 'pflegeMinDauer', 'pflegeMaxDauer', 'pflegeKostenDrift',
        'pflegeRegionalZuschlag', 'pflegeKostenStaffelPreset'
    ];
    allInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const eventType = (element.type === 'radio' || element.type === 'checkbox') ? 'change' : 'input';
            element.addEventListener(eventType, updateStartPortfolioDisplay);
        }
    });

    initializePflegeUIControls();

    const mcMethodeSelect = document.getElementById('mcMethode');
    mcMethodeSelect.addEventListener('change', () => { document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block'; });

    // Rentenanpassungs-Modus: Enable/Disable + Show/Hide Prozentfeld
    const rentAdjModeSelect = document.getElementById('rentAdjMode');
    const rentAdjPctInput = document.getElementById('rentAdjPct');
    if (rentAdjModeSelect && rentAdjPctInput) {
        const rentAdjPctGroup = rentAdjPctInput.closest('.form-group');

        rentAdjModeSelect.addEventListener('change', () => {
            const mode = rentAdjModeSelect.value;
            if (mode === 'fix') {
                rentAdjPctInput.disabled = false;
                rentAdjPctInput.title = 'Gemeinsame Rentenanpassung für beide Personen';
                if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'flex';
            } else {
                rentAdjPctInput.disabled = true;
                rentAdjPctInput.title = 'Wird automatisch über Koppelung gesteuert (' + (mode === 'wage' ? 'Lohnentwicklung' : 'Inflation') + ')';
                if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'none';
            }
        });
        // Initial state
        const initialMode = rentAdjModeSelect.value || 'fix';
        rentAdjPctInput.disabled = initialMode !== 'fix';
        if (initialMode !== 'fix') {
            rentAdjPctInput.title = 'Wird automatisch über Koppelung gesteuert (' + (initialMode === 'wage' ? 'Lohnentwicklung' : 'Inflation') + ')';
            if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'none';
        } else {
            rentAdjPctInput.title = 'Gemeinsame Rentenanpassung für beide Personen';
            if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'flex';
        }
    }

    // VERALTET: Alte Indexierungs-Logik (deaktiviert, versteckt)
    // const renteIndexArtSelect = document.getElementById('renteIndexierungsart');
    // renteIndexArtSelect.addEventListener('change', () => { document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none'; });

    // Legacy Hook: Checkbox wurde im UI entfernt, darf aber kein ReferenceError mehr auslösen
    const pflegeMortalitaetCheckbox = document.getElementById('pflegeMortalitaetOverride');

    // Partner/Rente-2-Einstellungen: Toggle Show/Hide
    const chkPartnerAktiv = document.getElementById('chkPartnerAktiv');
    const sectionRente2 = document.getElementById('sectionRente2');
    if (chkPartnerAktiv && sectionRente2) {
        chkPartnerAktiv.addEventListener('change', () => {
            const aktiv = chkPartnerAktiv.checked;
            sectionRente2.style.display = aktiv ? 'block' : 'none';
            localStorage.setItem('sim_partnerAktiv', aktiv ? '1' : '0');
        });
    }

    const careDetailsCheckbox = document.getElementById('toggle-care-details');
    // Checkbox-Handler für Szenario-Logs werden in displayMonteCarloResults registriert

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

    const stressSelect = document.getElementById('stressPreset');
    if (stressSelect) {
        Object.entries(STRESS_PRESETS).forEach(([key, preset]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.label;
            stressSelect.appendChild(option);
        });
    }

    document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block';
    // VERALTET: document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none';
    initializeLegacyMortalityToggleIfPresent(pflegeMortalitaetCheckbox);

    const sweepMetricSelect = document.getElementById('sweepMetric');
    const sweepAxisXSelect = document.getElementById('sweepAxisX');
    const sweepAxisYSelect = document.getElementById('sweepAxisY');

    if (sweepMetricSelect) {
        sweepMetricSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    if (sweepAxisXSelect) {
        sweepAxisXSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    if (sweepAxisYSelect) {
        sweepAxisYSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    // Grid-Size-Counter für Parameter-Sweep
    function updateSweepGridSize() {
        const rangeInputs = {
            runwayMin: document.getElementById('sweepRunwayMin').value,
            runwayTarget: document.getElementById('sweepRunwayTarget').value,
            targetEq: document.getElementById('sweepTargetEq').value,
            rebalBand: document.getElementById('sweepRebalBand').value,
            maxSkimPct: document.getElementById('sweepMaxSkimPct').value,
            maxBearRefillPct: document.getElementById('sweepMaxBearRefillPct').value,
            goldTargetPct: document.getElementById('sweepGoldTargetPct').value
        };

        let totalSize = 1;
        let hasError = false;

        try {
            for (const rangeStr of Object.values(rangeInputs)) {
                if (!rangeStr || !rangeStr.trim()) {
                    hasError = true;
                    break;
                }
                const values = parseRangeInput(rangeStr);
                if (values.length === 0) {
                    hasError = true;
                    break;
                }
                totalSize *= values.length;
            }
        } catch (error) {
            hasError = true;
        }

        const gridSizeEl = document.getElementById('sweepGridSize');
        if (gridSizeEl) {
            if (hasError) {
                gridSizeEl.textContent = 'Grid: ? Kombis';
                gridSizeEl.style.color = '#999';
            } else if (totalSize > 300) {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis (⚠ Max: 300)`;
                gridSizeEl.style.color = '#d32f2f';
            } else {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis`;
                gridSizeEl.style.color = 'var(--secondary-color)';
            }
        }
    }

    // Add event listeners to all sweep input fields
    const sweepInputIds = [
        'sweepRunwayMin', 'sweepRunwayTarget', 'sweepTargetEq', 'sweepRebalBand',
        'sweepMaxSkimPct', 'sweepMaxBearRefillPct', 'sweepGoldTargetPct'
    ];

    sweepInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateSweepGridSize);
        }
    });

    // Initial update
    updateSweepGridSize();

    // Tab switching logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked button and corresponding panel
            button.classList.add('active');
            const tabId = 'tab-' + button.dataset.tab;
            const targetPanel = document.getElementById(tabId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Sweep defaults with localStorage persistence
    initSweepDefaultsWithLocalStorageFallback();

    // Partner/Rente-2 configuration with localStorage persistence
    initRente2ConfigWithLocalStorage();
};

/**
 * Initialisiert (falls vorhanden) den alten Pflege-Mortalitäts-Toggle.
 *
 * Einige Historienstände erwarten weiterhin eine Checkbox mit der ID
 * "pflegeMortalitaetOverride" sowie eine Funktion `syncMortalityToggle`.
 * Die aktuelle UI stellt diesen Schalter nicht mehr dar, weshalb die Referenzen
 * bislang zu einem ReferenceError führten und die komplette onload-Routine
 * (inkl. Tab-Handlern) gestoppt wurde. Die Defensive Guards sorgen dafür, dass
 * wir den Toggle nur dann benutzen, wenn er wirklich existiert und ein Sync-
 * Callback verfügbar ist.
 *
 * @param {HTMLInputElement|null} checkbox - Optionaler Legacy-Toggle.
 * @returns {void}
 */
function initializeLegacyMortalityToggleIfPresent(checkbox) {
    if (!checkbox) {
        return; // Keine Legacy-Checkbox – frühzeitig aussteigen.
    }

    const invokeSyncIfAvailable = () => {
        if (typeof window.syncMortalityToggle === 'function') {
            window.syncMortalityToggle();
        }
    };

    // Initiale Synchronisierung nach dem DOM-Load.
    invokeSyncIfAvailable();

    // Re-Sync sobald der (Legacy-)Toggle verändert wird.
    checkbox.addEventListener('change', invokeSyncIfAvailable);
}

/**
 * Initialisiert Sweep-Defaults mit localStorage-Fallback
 */
function initSweepDefaultsWithLocalStorageFallback() {
    const map = [
        ["sweepRunwayMin", "sim.sweep.runwayMin"],
        ["sweepRunwayTarget", "sim.sweep.runwayTarget"],
        ["sweepTargetEq", "sim.sweep.targetEq"],
        ["sweepRebalBand", "sim.sweep.rebalBand"],
        ["sweepMaxSkimPct", "sim.sweep.maxSkimPct"],
        ["sweepMaxBearRefillPct", "sim.sweep.maxBearRefillPct"],
        ["sweepGoldTargetPct", "sim.sweep.goldTarget"]
    ];

    for (const [id, key] of map) {
        const el = document.getElementById(id);
        if (!el) continue;

        const saved = localStorage.getItem(key);
        if (saved !== null && saved !== undefined && saved !== '') {
            el.value = saved;
        }

        el.addEventListener("change", () => localStorage.setItem(key, el.value));
        el.addEventListener("input", () => localStorage.setItem(key, el.value));
    }
}

/**
 * Führt einen Parameter-Sweep durch
 */
export async function runParameterSweep() {
    const sweepButton = document.getElementById('sweepButton');
    sweepButton.disabled = true;
    const progressBarContainer = document.getElementById('sweep-progress-bar-container');
    const progressBar = document.getElementById('sweep-progress-bar');

    try {
        prepareHistoricalData();

        const rangeInputs = {
            runwayMin: document.getElementById('sweepRunwayMin').value,
            runwayTarget: document.getElementById('sweepRunwayTarget').value,
            targetEq: document.getElementById('sweepTargetEq').value,
            rebalBand: document.getElementById('sweepRebalBand').value,
            maxSkimPct: document.getElementById('sweepMaxSkimPct').value,
            maxBearRefillPct: document.getElementById('sweepMaxBearRefillPct').value,
            goldTargetPct: document.getElementById('sweepGoldTargetPct').value
        };

        const paramLabels = {
            runwayMin: 'Runway Min',
            runwayTarget: 'Runway Target',
            targetEq: 'Target Eq',
            rebalBand: 'Rebal Band',
            maxSkimPct: 'Max Skim %',
            maxBearRefillPct: 'Max Bear Refill %',
            goldTargetPct: 'Gold Target %'
        };

        const paramRanges = {};
        try {
            for (const [key, rangeStr] of Object.entries(rangeInputs)) {
                const values = parseRangeInput(rangeStr);
                if (values.length === 0) {
                    alert(`Leeres Range-Input für ${paramLabels[key] || key}.\n\nBitte geben Sie einen Wert ein:\n- Einzelwert: 24\n- Liste: 24,36,48\n- Range: 24:12:48`);
                    return;
                }
                paramRanges[key] = values;
            }
        } catch (error) {
            alert(`Fehler beim Parsen der Range-Eingaben:\n\n${error.message}\n\nErlaubte Formate:\n- Einzelwert: 24\n- Kommaliste: 50,60,70\n- Range: start:step:end (z.B. 18:6:36)`);
            return;
        }

        // Calculate combinations with limit check
        const arrays = Object.values(paramRanges);
        const { combos, tooMany, size } = cartesianProductLimited(arrays, 300);

        if (tooMany) {
            alert(`Zu viele Kombinationen: ${size} (theoretisch)\n\nMaximum: 300\n\nBitte reduzieren Sie die Anzahl der Parameter-Werte.`);
            return;
        }

        if (combos.length === 0) {
            alert('Keine Parameter-Kombinationen gefunden.');
            return;
        }

        // Convert back to object format
        const paramKeys = Object.keys(paramRanges);
        const paramCombinations = combos.map(combo => {
            const obj = {};
            paramKeys.forEach((key, i) => {
                obj[key] = combo[i];
            });
            return obj;
        });

        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        // WICHTIG: Basis-Inputs nur EINMAL lesen und einfrieren (Deep Clone)
        const baseInputs = deepClone(getCommonInputs());
        const anzahlRuns = parseInt(document.getElementById('mcAnzahl').value) || 100;
        const maxDauer = parseInt(document.getElementById('mcDauer').value) || 35;
        const blockSize = parseInt(document.getElementById('mcBlockSize').value) || 5;
        const baseSeed = parseInt(document.getElementById('mcSeed').value) || 12345;
        const methode = document.getElementById('mcMethode').value;

        const sweepResults = [];

        // P2-Invarianz-Guard: Referenz-Invarianten für Person 2 (wird beim ersten Case gesetzt)
        let REF_P2_INVARIANTS = null;

        for (let comboIdx = 0; comboIdx < paramCombinations.length; comboIdx++) {
            const params = paramCombinations[comboIdx];

            // Erstelle Case-spezifische Inputs durch Deep Clone der Basis
            const inputs = deepClone(baseInputs);

            // Überschreibe nur erlaubte Parameter (Whitelist + Blockliste prüfen)
            const caseOverrides = {
                runwayMinMonths: params.runwayMin,
                runwayTargetMonths: params.runwayTarget,
                targetEq: params.targetEq,
                rebalBand: params.rebalBand,
                maxSkimPctOfEq: params.maxSkimPct,
                maxBearRefillPctOfEq: params.maxBearRefillPct
            };

            if (params.goldTargetPct !== undefined) {
                caseOverrides.goldZielProzent = params.goldTargetPct;
                caseOverrides.goldAktiv = params.goldTargetPct > 0;
            }

            // Wende Overrides an mit Whitelist/Blockliste-Prüfung
            for (const [k, v] of Object.entries(caseOverrides)) {
                if (isBlockedKey(k)) {
                    console.warn(`[SWEEP] Ignoriere Person-2-Key im Sweep: ${k}`);
                    continue;
                }
                if (SWEEP_ALLOWED_KEYS.size && !SWEEP_ALLOWED_KEYS.has(k)) {
                    console.warn(`[SWEEP] Key nicht auf Whitelist, übersprungen: ${k}`);
                    continue;
                }
                // Setze erlaubten Parameter
                inputs[k] = v;
            }

            // P2-Invarianz-Guard: Extrahiere Basis-Parameter (NICHT abgeleitete Zeitserien!)
            const p2Invariants = extractP2Invariants(inputs);

            if (REF_P2_INVARIANTS === null) {
                // Erste Case-Referenz setzen
                REF_P2_INVARIANTS = p2Invariants;
                console.log(`[SWEEP] Referenz-P2-Invarianten gesetzt (Case ${comboIdx}):`, p2Invariants);
            }

            // Prüfe P2-Invarianz VOR der Simulation (keine YearLogs mehr nötig!)
            const p2VarianceWarning = !areP2InvariantsEqual(p2Invariants, REF_P2_INVARIANTS);

            if (p2VarianceWarning) {
                console.warn(`[SWEEP][ASSERT] P2-Basis-Parameter variieren im Sweep (Case ${comboIdx}), sollten konstant bleiben!`);
                console.warn('[SWEEP] Referenz:', REF_P2_INVARIANTS);
                console.warn('[SWEEP] Aktuell:', p2Invariants);
            }

            const rand = rng(baseSeed + comboIdx);
            const stressCtxMaster = buildStressContext(inputs.stressPreset, rand);

            const runOutcomes = [];

            for (let i = 0; i < anzahlRuns; i++) {
                let failed = false;
                const startYearIndex = Math.floor(rand() * annualData.length);
                let simState = initMcRunState(inputs, startYearIndex);

                const depotWertHistorie = [portfolioTotal(simState.portfolio)];
                let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.geschlecht);
                let stressCtx = cloneStressContext(stressCtxMaster);

                let minRunway = Infinity;

                for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                    const currentAge = inputs.startAlter + simulationsJahr;

                    let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                    yearData = applyStressOverride(yearData, stressCtx, rand);

                    careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);

                    let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
                    const careFactor = computeCareMortalityMultiplier(careMeta, inputs);
                    if (careFactor > 1) {
                        qx = Math.min(1.0, qx * careFactor);
                    }

                    if (rand() < qx) break;

                    // Berechne dynamische Rentenanpassung basierend auf Modus (fix/wage/cpi)
                    const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                    const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct };

                    // Calculate care floor addition (if active)
                    const { zusatzFloor: careFloor } = calcCareCost(careMeta, null);

                    const result = simulateOneYear(simState, adjustedInputs, yearData, simulationsJahr, careMeta, careFloor);

                    if (result.isRuin) {
                        failed = true;
                        if (BREAK_ON_RUIN) break;
                    } else {
                        simState = result.newState;
                        depotWertHistorie.push(portfolioTotal(simState.portfolio));

                        const runway = result.logData.RunwayCoveragePct || 0;
                        if (runway < minRunway) minRunway = runway;
                    }
                }

                const endVermoegen = failed ? 0 : portfolioTotal(simState.portfolio);
                const { maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);

                runOutcomes.push({
                    finalVermoegen: endVermoegen,
                    maxDrawdown: maxDDpct,
                    minRunway: minRunway === Infinity ? 0 : minRunway,
                    failed: failed
                });
            }

            const metrics = aggregateSweepMetrics(runOutcomes);
            metrics.warningR2Varies = p2VarianceWarning; // Füge Warnung zu Metriken hinzu
            sweepResults.push({ params, metrics });

            const progress = ((comboIdx + 1) / paramCombinations.length) * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${Math.round(progress)}%`;

            if (comboIdx % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        window.sweepResults = sweepResults;
        window.sweepParamRanges = paramRanges;

        displaySweepResults();

        document.getElementById('sweepResults').style.display = 'block';

    } catch (e) {
        alert("Fehler im Parameter-Sweep:\n\n" + e.message);
        console.error('Parameter-Sweep Fehler:', e);

        // Reset UI on error
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
    } finally {
        if (progressBar.style.width !== '0%') {
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
        }
        setTimeout(() => { progressBarContainer.style.display = 'none'; }, 250);
        sweepButton.disabled = false;
    }
}

/**
 * Zeigt die Sweep-Ergebnisse als Heatmap an
 */
function displaySweepResults() {
    try {
        const metricKey = document.getElementById('sweepMetric').value;
        const xParam = document.getElementById('sweepAxisX').value;
        const yParam = document.getElementById('sweepAxisY').value;

        const xValues = window.sweepParamRanges[xParam] || [];
        const yValues = window.sweepParamRanges[yParam] || [];

        const heatmapHtml = renderSweepHeatmapSVG(
            window.sweepResults,
            metricKey,
            xParam,
            yParam,
            xValues,
            yValues
        );

        document.getElementById('sweepHeatmap').innerHTML = heatmapHtml;
    } catch (error) {
        alert("Fehler beim Rendern der Sweep-Heatmap:\n\n" + error.message);
        console.error('displaySweepResults Fehler:', error);
        document.getElementById('sweepHeatmap').innerHTML = '<p style="color: red;">Fehler beim Rendern der Heatmap. Siehe Konsole für Details.</p>';
    }
}

/**
 * Führt einen umfassenden Sweep-Selbsttest durch (Developer-Modus)
 *
 * Tests:
 * 1. Baseline-Test: Rente2 bleibt über Cases konstant (Whitelist greift)
 * 2. Negativtest: Simuliert absichtliche R2-Änderung (sollte erkannt werden)
 * 3. Deep-Copy-Test: baseInputs bleiben nach Sweep unverändert
 *
 * Aktivierung: Dev-Mode Toggle oder localStorage.setItem('sim.devMode', '1')
 */
async function runSweepSelfTest() {
    const resultsDiv = document.getElementById('sweepSelfTestResults');
    const button = document.getElementById('sweepSelfTestButton');

    button.disabled = true;
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="color: #666;">🔬 Sweep-Tests laufen...</p>';

    console.log('[SWEEP-TEST] ========================================');
    console.log('[SWEEP-TEST] Starte Sweep-Selbsttest-Suite');
    console.log('[SWEEP-TEST] ========================================');

    try {
        prepareHistoricalData();

        const logMessages = [];
        let allTestsPassed = true;

        // =====================================================================
        // TEST 1: Baseline - P2-Invarianten bleiben über Cases konstant
        // =====================================================================
        console.log('[SWEEP-TEST] Test 1: Baseline (P2-Invarianz)');
        logMessages.push('<strong>Test 1: Baseline (P2-Invarianz) - NEUE PRÜFUNG</strong>');

        const testCases = [
            { rebalBand: 5, targetEq: 60 },
            { rebalBand: 10, targetEq: 60 },
            { rebalBand: 15, targetEq: 60 }
        ];

        const baseInputs = deepClone(getCommonInputs());
        const baseInputsJson = JSON.stringify(baseInputs); // Für Deep-Copy-Test
        const anzahlRuns = 10;
        const maxDauer = 10;
        const baseSeed = 12345;
        const methode = 'regime_markov';

        let REF_P2_INV = null;
        let test1Passed = true;

        for (let caseIdx = 0; caseIdx < testCases.length; caseIdx++) {
            const testCase = testCases[caseIdx];
            const inputs = deepClone(baseInputs);
            inputs.rebalBand = testCase.rebalBand;
            inputs.targetEq = testCase.targetEq;

            // NEUE PRÜFUNG: Extrahiere P2-Basis-Parameter (keine Simulation nötig!)
            const p2Inv = extractP2Invariants(inputs);

            if (REF_P2_INV === null) {
                REF_P2_INV = p2Inv;
                console.log(`[SWEEP-TEST] ✓ Case ${caseIdx + 1}: Referenz gesetzt (rebalBand=${testCase.rebalBand})`);
                console.log(`[SWEEP-TEST]   P2-Invarianten:`, p2Inv);
                logMessages.push(`&nbsp;&nbsp;✓ Case ${caseIdx + 1}: Referenz gesetzt (rebalBand=${testCase.rebalBand})`);
                logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;aktiv=${p2Inv.aktiv}, brutto=${p2Inv.brutto}, rentAdjPct=${p2Inv.rentAdjPct}`);
            } else {
                if (areP2InvariantsEqual(p2Inv, REF_P2_INV)) {
                    console.log(`[SWEEP-TEST] ✓ Case ${caseIdx + 1}: P2-Invarianten konstant (rebalBand=${testCase.rebalBand})`);
                    logMessages.push(`&nbsp;&nbsp;✓ Case ${caseIdx + 1}: P2-Invarianten konstant (rebalBand=${testCase.rebalBand})`);
                } else {
                    test1Passed = false;
                    allTestsPassed = false;
                    console.error(`[SWEEP-TEST] ✗ Case ${caseIdx + 1}: P2-Invarianten variieren! (rebalBand=${testCase.rebalBand})`);
                    console.error(`[SWEEP-TEST]   Referenz:`, REF_P2_INV);
                    console.error(`[SWEEP-TEST]   Aktuell:`, p2Inv);
                    logMessages.push(`&nbsp;&nbsp;<span style="color: red;">✗ Case ${caseIdx + 1}: P2-Invarianten variieren! (rebalBand=${testCase.rebalBand})</span>`);
                    logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;Referenz: ${JSON.stringify(REF_P2_INV)}`);
                    logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;Aktuell: ${JSON.stringify(p2Inv)}`);
                }
            }
        }

        logMessages.push(test1Passed ? '<span style="color: green;">✓ Test 1 bestanden</span>' : '<span style="color: red;">✗ Test 1 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // TEST 2: Deep-Copy-Test - baseInputs bleiben unverändert
        // =====================================================================
        console.log('[SWEEP-TEST] Test 2: Deep-Copy-Schutz');
        logMessages.push('<strong>Test 2: Deep-Copy-Schutz</strong>');

        const baseInputsAfter = JSON.stringify(baseInputs);
        const test2Passed = baseInputsJson === baseInputsAfter;

        if (test2Passed) {
            console.log('[SWEEP-TEST] ✓ baseInputs blieben unverändert nach Cases');
            logMessages.push('&nbsp;&nbsp;✓ baseInputs blieben unverändert nach Cases');
        } else {
            console.error('[SWEEP-TEST] ✗ baseInputs wurden modifiziert! Deep-Copy fehlerhaft!');
            logMessages.push('&nbsp;&nbsp;<span style="color: red;">✗ baseInputs wurden modifiziert! Deep-Copy fehlerhaft!</span>');
            allTestsPassed = false;
        }

        logMessages.push(test2Passed ? '<span style="color: green;">✓ Test 2 bestanden</span>' : '<span style="color: red;">✗ Test 2 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // TEST 3: Negativtest - P2-Änderung sollte erkannt werden
        // =====================================================================
        console.log('[SWEEP-TEST] Test 3: Negativtest (P2-Änderung sollte erkannt werden)');
        logMessages.push('<strong>Test 3: Negativtest (P2-Änderung erkennen) - NEUE PRÜFUNG</strong>');

        // Simuliere zwei Cases, wobei beim zweiten absichtlich partner.brutto geändert wird
        const negTestCases = [
            { rebalBand: 10, p2Change: false },
            { rebalBand: 15, p2Change: true } // Hier ändern wir absichtlich partner.brutto
        ];

        let NEG_REF_P2_INV = null;
        let test3Passed = false; // Sollte NACH dem zweiten Case true werden (wenn Änderung erkannt wurde)

        for (let caseIdx = 0; caseIdx < negTestCases.length; caseIdx++) {
            const testCase = negTestCases[caseIdx];
            const inputs = deepClone(baseInputs);
            inputs.rebalBand = testCase.rebalBand;

            // ABSICHTLICH P2 ändern beim zweiten Case (nur für Test!)
            if (testCase.p2Change && inputs.partner && inputs.partner.aktiv) {
                inputs.partner.brutto = inputs.partner.brutto * 1.5; // +50%
                console.log('[SWEEP-TEST] ⚠ Absichtlich partner.brutto geändert (für Negativtest)');
            }

            // NEUE PRÜFUNG: Extrahiere P2-Invarianten (keine Simulation nötig!)
            const p2Inv = extractP2Invariants(inputs);

            if (NEG_REF_P2_INV === null) {
                NEG_REF_P2_INV = p2Inv;
                console.log(`[SWEEP-TEST] ✓ Neg-Case ${caseIdx + 1}: Referenz gesetzt`);
                logMessages.push(`&nbsp;&nbsp;✓ Neg-Case ${caseIdx + 1}: Referenz gesetzt`);
            } else {
                if (areP2InvariantsEqual(p2Inv, NEG_REF_P2_INV)) {
                    console.error(`[SWEEP-TEST] ✗ Neg-Case ${caseIdx + 1}: P2-Änderung wurde NICHT erkannt!`);
                    logMessages.push(`&nbsp;&nbsp;<span style="color: red;">✗ Neg-Case ${caseIdx + 1}: P2-Änderung wurde NICHT erkannt!</span>`);
                    allTestsPassed = false;
                } else {
                    console.log(`[SWEEP-TEST] ✓ Neg-Case ${caseIdx + 1}: P2-Änderung korrekt erkannt!`);
                    console.log(`[SWEEP-TEST]   Referenz:`, NEG_REF_P2_INV);
                    console.log(`[SWEEP-TEST]   Geändert:`, p2Inv);
                    logMessages.push(`&nbsp;&nbsp;<span style="color: green;">✓ Neg-Case ${caseIdx + 1}: P2-Änderung korrekt erkannt!</span>`);
                    logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;brutto: ${NEG_REF_P2_INV.brutto} → ${p2Inv.brutto}`);
                    test3Passed = true;
                }
            }
        }

        logMessages.push(test3Passed ? '<span style="color: green;">✓ Test 3 bestanden</span>' : '<span style="color: red;">✗ Test 3 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // Gesamtergebnis
        // =====================================================================
        console.log('[SWEEP-TEST] ========================================');
        console.log('[SWEEP-TEST] Gesamtergebnis: ' + (allTestsPassed ? '✓ ALLE TESTS BESTANDEN' : '✗ TESTS FEHLGESCHLAGEN'));
        console.log('[SWEEP-TEST] ========================================');

        const statusColor = allTestsPassed ? 'green' : 'red';
        const statusText = allTestsPassed ? '✓ Alle Tests bestanden' : '✗ Einige Tests fehlgeschlagen';

        let html = `<div style="padding: 15px; background-color: ${allTestsPassed ? '#e8f5e9' : '#ffebee'}; border-radius: 4px; border: 1px solid ${statusColor};">`;
        html += `<strong style="color: ${statusColor}; font-size: 1.1rem;">${statusText}</strong><br><br>`;
        html += `<div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">`;
        html += logMessages.join('<br>');
        html += `</div>`;
        html += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 0.8rem; color: #666;">`;
        html += `Hinweis: Console-Logs enthalten detaillierte Test-Ausgaben mit [SWEEP-TEST] Prefix.`;
        html += `</div></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
        console.error('[SWEEP-TEST] Fehler:', error);
    } finally {
        button.disabled = false;
    }
}

// Globale Funktionen für HTML onclick-Handler
window.runMonteCarlo = runMonteCarlo;
window.runBacktest = runBacktest;
window.runParameterSweep = runParameterSweep;
window.displaySweepResults = displaySweepResults;
window.formatCurrency = formatCurrency;
window.runSweepSelfTest = runSweepSelfTest;

// Für Parity Smoke Test
window.simulateOneYear = simulateOneYear;
window.annualData = annualData;
