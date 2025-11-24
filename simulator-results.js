"use strict";

import { formatCurrency, formatCurrencyShortLog, shortenText } from './simulator-utils.js';
import { STRESS_PRESETS } from './simulator-data.js';
import { renderHeatmapSVG } from './simulator-heatmap.js';

/**
 * Storage keys for log detail preferences.
 * Separate keys prevent the backtest log checkbox from leaking into the
 * worst-case log (and vice versa). A legacy key is still understood to avoid
 * breaking existing localStorage data when users upgrade.
 */
export const LEGACY_LOG_DETAIL_KEY = 'logDetailLevel';
export const WORST_LOG_DETAIL_KEY = 'worstLogDetailLevel';
export const BACKTEST_LOG_DETAIL_KEY = 'backtestLogDetailLevel';

/**
 * Reads the persisted detail level with a defensive fallback.
 *
 * @param {string} storageKey - Primary localStorage key for the preference.
 * @param {string|null} legacyKey - Optional legacy key to read for backward compatibility.
 * @returns {('normal'|'detailed')} Sanitized detail level, defaults to 'normal'.
 */
export function loadDetailLevel(storageKey, legacyKey = LEGACY_LOG_DETAIL_KEY) {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'detailed' || stored === 'normal') {
        return stored;
    }

    if (legacyKey) {
        const legacy = localStorage.getItem(legacyKey);
        if (legacy === 'detailed') return 'detailed';
    }

    return 'normal';
}

/**
 * Persists a detail level and removes the legacy key to avoid cross-contamination
 * between different log UIs.
 *
 * @param {string} storageKey - Primary localStorage key for the preference.
 * @param {string} level - Desired level, anything but 'detailed' collapses to 'normal'.
 * @returns {('normal'|'detailed')} The sanitized value that was stored.
 */
export function persistDetailLevel(storageKey, level) {
    const sanitizedLevel = level === 'detailed' ? 'detailed' : 'normal';
    localStorage.setItem(storageKey, sanitizedLevel);
    if (storageKey !== LEGACY_LOG_DETAIL_KEY) {
        localStorage.removeItem(LEGACY_LOG_DETAIL_KEY);
    }
    return sanitizedLevel;
}

/**
 * Erstellt eine KPI-Karte mit Zahlenwert
 */
export function createKpiCard(title, value, unit, description, colorClass = '') {
    const val = (value != null && isFinite(value)) ? value.toFixed(1).replace('.', ',') : '—';
    const unitStr = unit ? ` ${unit}` : '';
    return `
    <div class="kpi-card ${colorClass}">
      <strong>${title}</strong>
      <div class="value-line">${val}${unitStr}</div>
      <div class="kpi-description">${description || ''}</div>
    </div>`;
}

/**
 * Erstellt eine KPI-Karte mit Währungswert
 */
export function createCurrencyKpiCard(title, value, description, colorClass = '') {
    const val = (value != null && isFinite(value)) ? formatCurrency(value) : '—';
    return `
    <div class="kpi-card ${colorClass}">
      <strong>${title}</strong>
      <div class="value-line">${val}</div>
      <div class="kpi-description">${description || ''}</div>
    </div>`;
}

/**
 * Zeigt die Monte-Carlo-Ergebnisse an
 */
export function displayMonteCarloResults(results, anzahl, failCount, worstRun, resultsMitPflege, resultsOhnePflege, pflegefallEingetretenCount, inputs, worstRunCare, scenarioLogs = null) {

    // 1. Haupt-Zusammenfassung (Summary)
    document.getElementById('monteCarloSummary').innerHTML = `
        <div class="summary-grid">
          <div class="summary-item"><strong>Erfolgsquote</strong><span style="color:var(--success-color);">${(((anzahl - failCount) / anzahl) * 100).toFixed(1)}%</span></div>
          <div class="summary-item"><strong>Shortfalls</strong><span>${failCount} von ${anzahl}</span></div>
          <div class="summary-item"><strong>Median (alle)</strong><span>${formatCurrency(results.finalOutcomes.p50)}</span></div>
          <div class="summary-item"><strong>Median (erfolgreiche)</strong><span>${formatCurrency(results.finalOutcomes.p50_successful)}</span></div>
          <div class="summary-item"><strong>10%/90% Perzentil</strong><span>${formatCurrency(results.finalOutcomes.p10)} / ${formatCurrency(results.finalOutcomes.p90)}</span></div>
          <div class="summary-item tax"><strong>Median Steuern</strong><span>${formatCurrency(results.taxOutcomes.p50)}</span></div>
        </div>`;

    // 2. KPI Dashboards
    const dashboard = document.getElementById('unifiedKpiDashboard');
    let dashboardHtml = '';

    // Wichtigste KPIs (immer sichtbar)
    dashboardHtml += '<h3 class="unified-kpi-header">Wichtigste Kennzahlen</h3><div class="kpi-grid">';
    dashboardHtml += createKpiCard('Ø Lebensdauer', results.kpiLebensdauer?.mean, 'Jahre', 'Die durchschnittliche simulierte Lebensdauer über alle Läufe.');
    const deQuote = results.depotErschoepfungsQuote;
    const qClass = deQuote > 20 ? 'is-red' : (deQuote > 5 ? 'is-amber' : 'is-green');
    dashboardHtml += createKpiCard('Depot-Erschöpfungs-Quote', deQuote, '%', 'Anteil der Simulationen, in denen das Depot (Aktien/Gold) vollständig aufgebraucht wird.', qClass);
    dashboardHtml += createKpiCard('Anteil Kürzungsjahre (>10%)', results.kpiKuerzungsjahre?.p50, '%', 'Medianer Anteil der Jahre, in denen der Flex-Anteil um mehr als 10% gekürzt wurde.');
    if (isFinite(results.maxDrawdowns?.p50)) dashboardHtml += createKpiCard('Max. Drawdown (Median)', results.maxDrawdowns.p50, '%', 'Größter Verlust von Peak-zu-Tief im Depot (Median).', 'is-amber');
    if (isFinite(results.maxDrawdowns?.p90)) dashboardHtml += createKpiCard('Max. Drawdown (P90)', results.maxDrawdowns.p90, '%', 'Der 90%-Wert: Nur 10% der Läufe hatten einen größeren Drawdown.', 'is-red');
    dashboardHtml += '</div>';

    // Detail-KPIs in zusammenklappbarem Bereich
    dashboardHtml += '<details class="details-card" style="margin-top: 15px; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px;"><summary style="cursor: pointer; font-weight: 600; color: var(--primary-color); font-size: 0.95rem;">📊 Weitere Detail-KPIs anzeigen</summary>';
    dashboardHtml += '<div style="margin-top: 15px;">';

    // Operative Details
    dashboardHtml += '<h4 style="font-size: 0.9rem; color: var(--primary-color); margin: 10px 0 8px 0; padding-bottom: 5px; border-bottom: 1px solid var(--border-color);">Operative Details</h4><div class="kpi-grid">';
    dashboardHtml += createKpiCard('Max. Kürzung (Flex)', results.kpiMaxKuerzung?.p50, '%', 'Die im Median maximal aufgetretene Kürzung des Flex-Anteils in einem einzelnen Jahr.');
    const alterErs = (results.alterBeiErschoepfung?.p50 || 0) > 0 ? results.alterBeiErschoepfung.p50 : null;
    dashboardHtml += createKpiCard('Median-Alter bei Erschöpfung', alterErs, 'Jahre', 'Das Alter, das im Median bei Eintritt der Depot-Erschöpfung erreicht wird (nur für erschöpfte Fälle).');
    dashboardHtml += createKpiCard('Median-Anteil Jahre ohne Flex', results.anteilJahreOhneFlex?.p50, '%', 'Medianer Anteil der Jahre, in denen der Flex-Bedarf zu 100% gekürzt werden musste.');
    dashboardHtml += '</div>';

    // Risiko-Details
    if (isFinite(results.volatilities?.p50) || results.extraKPI) {
        dashboardHtml += '<h4 style="font-size: 0.9rem; color: var(--primary-color); margin: 15px 0 8px 0; padding-bottom: 5px; border-bottom: 1px solid var(--border-color);">Risiko-Details</h4><div class="kpi-grid">';
        if (isFinite(results.volatilities?.p50)) dashboardHtml += createKpiCard('Median Portfoliovolatilität', results.volatilities.p50, '%', 'Annualisierte Standardabweichung der Portfolio-Renditen (Median).');
        if (results.extraKPI) {
            const timeShare = isFinite(results.extraKPI.timeShareQuoteAbove45) ? (results.extraKPI.timeShareQuoteAbove45 * 100) : null;
            dashboardHtml += createKpiCard('Zeitanteil Quote > 4.5%', timeShare, '%', 'Anteil aller simulierten Jahre mit einer Entnahmerate über dem kritischen Schwellenwert von 4.5%.');
            if (isFinite(results.extraKPI.consumptionAtRiskP10Real)) {
                dashboardHtml += createCurrencyKpiCard('Reale Entnahme (P10)', results.extraKPI.consumptionAtRiskP10Real, 'Worst-Case (10%-Quantil) der inflationsbereinigten Jahresentnahmen.');
            }
        }
        dashboardHtml += '</div>';
    }

    dashboardHtml += '</div></details>';

    dashboard.innerHTML = dashboardHtml;
    dashboard.style.display = 'block';

    // Logik zur Anzeige der Stress-KPIs
    const stressKPIs = results.stressKPI;
    const existingStressContainer = document.getElementById('stressKpiResults');

    if (existingStressContainer) {
        existingStressContainer.remove();
    }

    if (stressKPIs && stressKPIs.years > 0 && stressKPIs.presetKey !== 'NONE') {
        const presetLabel = STRESS_PRESETS[stressKPIs.presetKey]?.label || 'Stress-Szenario';
        const newContainer = document.createElement('div');
        newContainer.id = 'stressKpiResults';

        let stressHtml = `
            <h3 class="unified-kpi-header" style="border-color: var(--danger-color);">Ergebnisse des Stress-Szenarios</h3>
            <div style="text-align: center; margin-bottom: 15px; font-size: 1rem;">
                <strong>${presetLabel}</strong> (betrifft die ersten ${stressKPIs.years} Jahre)
            </div>
            <div class="kpi-grid">
                ${createKpiCard('Max. Drawdown (Median, Stress)', stressKPIs.maxDD.p50, '%', `Größter Depot-Verlust während der ${stressKPIs.years}-jährigen Stressphase (Median).`, 'is-amber')}
                ${createKpiCard('Max. Drawdown (P90, Stress)', stressKPIs.maxDD.p90, '%', `90% der Läufe hatten einen geringeren Drawdown in der Stressphase.`, 'is-red')}
                ${createKpiCard('Zeit mit Quote >4.5% (Stress)', stressKPIs.timeShareAbove45.p50, '%', `Medianer Anteil der Stress-Jahre mit einer kritischen Entnahmerate.`, 'is-amber')}
            </div>
            <div class="kpi-grid" style="margin-top:15px;">
                ${createKpiCard('Kürzungsjahre >10% (Stress)', stressKPIs.cutYears.p50, 'Jahre', `Anzahl der Jahre mit >10% Flex-Kürzung im Stressfenster (Median).`, 'is-amber')}
                ${createCurrencyKpiCard('Consumption-at-Risk P10 (Stress)', stressKPIs.consumptionAtRiskP10Real.p50, `Inflationsbereinigte Jahresentnahme im P10 über die Stressjahre (Median).`, 'is-red')}
                ${createKpiCard('Erholung nach Stress (Median)', stressKPIs.recoveryYears.p50, 'Jahre', `Jahre vom Ende des Stressfensters bis die Entnahmerate wieder unter 3,5% fällt (Median).`)}
            </div>
        `;

        newContainer.innerHTML = stressHtml;
        dashboard.parentNode.insertBefore(newContainer, dashboard.nextSibling);
    }

    // 3. Heatmap rendern
    const advancedDashboard = document.getElementById('advancedKpiDashboard');
    const timeShare = (results.extraKPI && typeof results.extraKPI.timeShareQuoteAbove45 === 'number')
        ? results.extraKPI.timeShareQuoteAbove45 : 0;

    advancedDashboard.innerHTML = renderHeatmapSVG(
        results.heatmap,
        results.bins,
        anzahl,
        results.extraKPI,
        { width: 980, height: 420 }
    );
    advancedDashboard.style.display = 'block';

    // 4. Pflege-KPIs
    const pflegeResultsContainer = document.getElementById('pflegeKpiResults');
    if (results.extraKPI?.pflege && inputs.pflegefallLogikAktivieren) {
        const pf = results.extraKPI.pflege;
        const summaryBox = document.getElementById('pflegeKpiSummary');
        let kpiHtml = createKpiCard('Pflegefall-Eintrittsquote P1', pf.entryRatePct, '%', 'Anteil der Simulationen, in denen Person 1 Pflegefall eintritt.');
        kpiHtml += createKpiCard('Median Eintrittsalter P1', pf.entryAgeMedian > 0 ? pf.entryAgeMedian : null, 'Jahre', 'Typisches Alter bei Eintritt des Pflegefalls Person 1.');
        kpiHtml += createKpiCard('Median Pflegejahre P1', pf.p1CareYears > 0 ? pf.p1CareYears : null, 'Jahre', 'Typische Anzahl Jahre in Pflege (Person 1).');

        // P2 Care KPIs (only if partner active)
        if (inputs.partner?.aktiv) {
            kpiHtml += createKpiCard('Pflegefall-Eintrittsquote P2', pf.p2EntryRatePct, '%', 'Anteil der Simulationen, in denen Person 2 Pflegefall eintritt.');
            kpiHtml += createKpiCard('Median Eintrittsalter P2', pf.p2EntryAgeMedian > 0 ? pf.p2EntryAgeMedian : null, 'Jahre', 'Typisches Alter bei Eintritt des Pflegefalls Person 2.');
            kpiHtml += createKpiCard('Median Pflegejahre P2', pf.p2CareYears > 0 ? pf.p2CareYears : null, 'Jahre', 'Typische Anzahl Jahre in Pflege (Person 2).');
            kpiHtml += createKpiCard('Median Jahre beide in Pflege', pf.bothCareYears > 0 ? pf.bothCareYears : null, 'Jahre', 'Typische Anzahl Jahre, in denen beide Personen gleichzeitig in Pflege sind.');
            kpiHtml += createCurrencyKpiCard('Max. jährl. Pflege-Ausgaben', pf.maxAnnualCareSpend, 'Median der maximalen jährlichen Pflege-Gesamtkosten (P1+P2).');
        }

        kpiHtml += createKpiCard('Bedingte Shortfall-Rate', pf.shortfallRate_condCare, '%', 'Anteil der Fehlschläge, WENN ein Pflegefall eingetreten ist.');
        kpiHtml += createKpiCard('Shortfall-Rate (o. Pflege)', pf.shortfallRate_noCareProxy, '%', 'Geschätzte Fehlschlag-Rate der identischen Läufe, wenn kein Pflegefall eingetreten wäre.');
        kpiHtml += createCurrencyKpiCard('Median Endvermögen (m. Pflege)', pf.endwealthWithCare_median, 'Typisches Endvermögen unter Berücksichtigung des Pflegerisikos.');
        kpiHtml += createCurrencyKpiCard('Median Endvermögen (o. Pflege)', pf.endwealthNoCare_median, 'Geschätztes typisches Endvermögen ohne die Last des Pflegefalls.');
        kpiHtml += createCurrencyKpiCard('Median Gesamtkosten (Depot)', pf.depotCosts_median, 'Typische Summe der aus dem Depot finanzierten Pflege-Mehrkosten (nur betroffene Läufe).');
        kpiHtml += createCurrencyKpiCard('Shortfall-Delta vs. ohne Pflege', pf.shortfallDelta_vs_noCare, 'Unterschied im Median-Endvermögen mit vs. ohne Pflege.');
        summaryBox.innerHTML = kpiHtml;
        pflegeResultsContainer.style.display = 'block';
    } else {
        pflegeResultsContainer.style.display = 'none';
    }

    // 5. Szenario-Log Auswahl (ersetzt den alten Worst-Run-Log)
    const scenarioContainer = document.getElementById('scenarioLogContainer');
    if (scenarioLogs && scenarioContainer) {
        const caR = results.extraKPI?.consumptionAtRiskP10Real;
        window.globalScenarioLogs = scenarioLogs;
        window.globalScenarioCarThreshold = caR;
        window.globalCurrentScenarioData = null;

        // Dropdown erstellen im scenarioSelector
        const selectorDiv = document.getElementById('scenarioSelector');
        let dropdownHtml = `
            <div class="scenario-selector" style="margin-bottom: 15px; text-align: center;">
                <label for="scenarioSelect" style="font-weight: 600; margin-right: 10px;">Szenario-Log anzeigen:</label>
                <select id="scenarioSelect" style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); min-width: 300px; font-size: 0.9rem;">
                    <option value="">— Szenario auswählen —</option>
                    <optgroup label="📊 Charakteristische Szenarien">`;

        // Charakteristische Szenarien mit Endvermögen
        for (const s of scenarioLogs.characteristic) {
            const vermLabel = s.failed ? '⚠️ FAILED' : formatCurrency(s.endVermoegen);
            const careLabel = s.careEverActive ? ' 🏥' : '';
            dropdownHtml += `<option value="char_${s.key}">${s.label} (${vermLabel})${careLabel}</option>`;
        }

        dropdownHtml += `</optgroup>
                    <optgroup label="🎲 Zufällige Szenarien">`;

        // Zufällige Szenarien
        for (const s of scenarioLogs.random) {
            const vermLabel = s.failed ? '⚠️ FAILED' : formatCurrency(s.endVermoegen);
            const careLabel = s.careEverActive ? ' 🏥' : '';
            dropdownHtml += `<option value="rand_${s.key}">${s.label} (${vermLabel})${careLabel}</option>`;
        }

        dropdownHtml += `</optgroup>
                </select>
            </div>`;

        selectorDiv.innerHTML = dropdownHtml;
        scenarioContainer.style.display = 'block';

        const select = document.getElementById('scenarioSelect');
        const output = document.getElementById('scenarioLogOutput');
        const exportButtons = document.getElementById('scenarioExportButtons');

        // Funktion zum Rendern des ausgewählten Szenarios
        const renderSelectedScenario = () => {
            const val = select.value;
            if (!val) {
                output.style.display = 'none';
                exportButtons.style.display = 'none';
                window.globalCurrentScenarioData = null;
                return;
            }

            let scenario = null;
            if (val.startsWith('char_')) {
                const key = val.replace('char_', '');
                scenario = scenarioLogs.characteristic.find(s => s.key === key);
            } else if (val.startsWith('rand_')) {
                const key = val.replace('rand_', '');
                scenario = scenarioLogs.random.find(s => s.key === key);
            }

            if (scenario && scenario.logDataRows && scenario.logDataRows.length > 0) {
                const showCareDetails = (localStorage.getItem('showCareDetails') === '1');
                const logDetailLevel = loadDetailLevel(WORST_LOG_DETAIL_KEY);
                output.innerHTML = renderWorstRunLog(scenario.logDataRows, caR, {
                    showCareDetails: showCareDetails,
                    logDetailLevel: logDetailLevel
                });
                output.style.display = 'block';
                exportButtons.style.display = 'flex';
                window.globalCurrentScenarioData = { rows: scenario.logDataRows, caR_Threshold: caR };
            } else {
                output.innerHTML = '<p style="color: var(--text-muted); padding: 10px;">Keine Log-Daten für dieses Szenario verfügbar.</p>';
                output.style.display = 'block';
                exportButtons.style.display = 'none';
                window.globalCurrentScenarioData = null;
            }
        };

        // Event-Handler für Dropdown
        select.addEventListener('change', renderSelectedScenario);

        // Event-Handler für Checkboxen (re-render bei Änderung)
        const careDetailsCheckbox = document.getElementById('toggle-care-details');
        const logDetailCheckbox = document.getElementById('toggle-log-detail');

        if (careDetailsCheckbox) {
            careDetailsCheckbox.checked = (localStorage.getItem('showCareDetails') === '1');
            careDetailsCheckbox.addEventListener('change', () => {
                localStorage.setItem('showCareDetails', careDetailsCheckbox.checked ? '1' : '0');
                renderSelectedScenario();
            });
        }

        if (logDetailCheckbox) {
            logDetailCheckbox.checked = (loadDetailLevel(WORST_LOG_DETAIL_KEY) === 'detailed');
            logDetailCheckbox.addEventListener('change', () => {
                const newLevel = logDetailCheckbox.checked ? 'detailed' : 'normal';
                persistDetailLevel(WORST_LOG_DETAIL_KEY, newLevel);
                renderSelectedScenario();
            });
        }

        // Export-Buttons Event-Handler
        const jsonBtn = document.getElementById('exportScenarioLogJson');
        const csvBtn = document.getElementById('exportScenarioLogCsv');

        if (jsonBtn) {
            jsonBtn.onclick = () => {
                if (window.globalCurrentScenarioData?.rows) {
                    const blob = new Blob([JSON.stringify(window.globalCurrentScenarioData.rows, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'scenario-log.json';
                    a.click();
                    URL.revokeObjectURL(url);
                }
            };
        }

        if (csvBtn) {
            csvBtn.onclick = () => {
                if (window.globalCurrentScenarioData?.rows && window.globalCurrentScenarioData.rows.length > 0) {
                    const rows = window.globalCurrentScenarioData.rows;
                    const headers = Object.keys(rows[0]);
                    const csvContent = [
                        headers.join(';'),
                        ...rows.map(row => headers.map(h => {
                            const val = row[h];
                            if (val === null || val === undefined) return '';
                            if (typeof val === 'object') return JSON.stringify(val);
                            return String(val);
                        }).join(';'))
                    ].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'scenario-log.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                }
            };
        }

        // Worst Case standardmäßig auswählen
        select.value = 'char_worst';
        renderSelectedScenario();

    } else if (scenarioContainer) {
        scenarioContainer.style.display = 'none';
    }

    // 6. Gesamten Ergebnis-Container sichtbar machen
    document.getElementById('monteCarloResults').style.display = 'block';
}

/**
 * Rendert das Worst-Run-Log als Textausgabe
 */
export function getWorstRunColumnDefinitions(opts = {}) {
    const options = { showCareDetails: false, logDetailLevel: 'normal', ...opts };

    const formatPctOrDash = (value, fallback = '—') => {
        if (value == null || !isFinite(value)) return fallback;
        return `${Math.round(value * 100)}%`;
    };

    const baseCols = [];
    baseCols.push({ key: 'jahr', header: 'Jahr', width: 4 });
    baseCols.push({ key: 'histJahr', header: 'Hist', width: 4, title: 'Historisches Jahr (Quelle der Marktdaten)' });
    baseCols.push({
        key: 'Person1Alive',
        header: 'P1L',
        width: 3,
        fmt: formatAliveStatus,
        title: 'Lebt Person 1 noch (✓) oder ist sie bereits verstorben (✗)?'
    });
    // Care status for Person 1 (always visible if care data exists)
    baseCols.push({
        key: 'CareP1_Active',
        header: 'P1',
        width: 2,
        fmt: v => v ? '✓' : '—',
        title: 'Person 1 in Pflege'
    });
    baseCols.push({
        key: 'CareP1_Grade',
        header: 'P1_PG',
        width: 5,
        fmt: (v, row) => (row.CareP1_Active ? `PG${v ?? '—'}` : '—'),
        title: 'Pflegegrad Person 1'
    });
    baseCols.push({
        key: 'Person2Alive',
        header: 'P2L',
        width: 3,
        fmt: formatAliveStatus,
        title: 'Lebt Person 2 noch? (— = kein Partner)'
    });
    // Care status for Person 2 (always visible if care data exists)
    baseCols.push({
        key: 'CareP2_Active',
        header: 'P2',
        width: 2,
        fmt: v => v ? '✓' : '—',
        title: 'Person 2 in Pflege'
    });
    baseCols.push({
        key: 'CareP2_Grade',
        header: 'P2_PG',
        width: 5,
        fmt: (v, row) => (row.CareP2_Active ? `PG${v ?? '—'}` : '—'),
        title: 'Pflegegrad Person 2'
    });
    baseCols.push({ key: 'entscheidung.jahresEntnahme', header: 'Entnahme', width: 8, fmt: formatCurrencyShortLog });
    baseCols.push({ key: 'floor_brutto', header: 'Floor', width: 7, fmt: formatCurrencyShortLog });

    if (options.logDetailLevel === 'detailed' || options.showCareDetails) {
        baseCols.push({ key: 'rente1', header: 'Rente1', width: 7, fmt: formatCurrencyShortLog });
        baseCols.push({ key: 'rente2', header: 'Rente2', width: 7, fmt: formatCurrencyShortLog });
    }
    baseCols.push({ key: 'renteSum', header: 'RenteSum', width: 8, fmt: formatCurrencyShortLog });

    const careColsMinimal = [
        { key: 'pflege_zusatz_floor', header: 'PflegeZiel', width: 10, fmt: formatCurrencyShortLog, title: "Zusatz-Floor in diesem Jahr (nominal), gecappt durch MaxPflege-Floor – Floor@Eintritt; wächst jährlich mit Inflation/Drift." },
        {
            key: null, header: 'PflegeΣ', width: 8,
            fmt: (v, row) => formatCurrencyShortLog((row.CareP1_Cost || 0) + (row.CareP2_Cost || 0)),
            title: "Gesamte Pflege-Zusatzkosten dieses Jahres (P1 + P2)"
        },
        { key: 'CareP1_Cost', header: 'P1€', width: 7, fmt: formatCurrencyShortLog, title: 'Zusätzliche Pflege-Kosten P1' },
        { key: 'CareP2_Cost', header: 'P2€', width: 7, fmt: formatCurrencyShortLog, title: 'Zusätzliche Pflege-Kosten P2' },
    ];

    const careColsDetailed = [
        { key: 'pflege_floor_anchor', header: 'Floor@Eintritt', width: 14, fmt: formatCurrencyShortLog },
        { key: 'pflege_maxfloor_anchor', header: 'MaxPflege@Jahr', width: 15, fmt: formatCurrencyShortLog },
        { key: 'pflege_cap_zusatz', header: 'CapZusatz@Jahr', width: 15, fmt: formatCurrencyShortLog },
        { key: 'pflege_delta_flex', header: 'PflegeΔ_Flex', width: 12, fmt: formatCurrencyShortLog },
        { key: 'pflege_zusatz_floor', header: 'PflegeZiel', width: 10, fmt: formatCurrencyShortLog, title: "Zusatz-Floor in diesem Jahr (nominal), gecappt durch MaxPflege-Floor – Floor@Eintritt; wächst jährlich mit Inflation/Drift." },
        { key: 'pflege_zusatz_floor_delta', header: 'PflegeΔ', width: 8, fmt: formatCurrencyShortLog },
        {
            key: null, header: 'PflegeΣ', width: 8,
            fmt: (v, row) => formatCurrencyShortLog((row.CareP1_Cost || 0) + (row.CareP2_Cost || 0)),
            title: "Gesamte Pflege-Zusatzkosten dieses Jahres (P1 + P2)"
        },
        { key: 'pflege_flex_faktor', header: 'FlexPfl%', width: 8, fmt: (v, row) => (row.pflege_aktiv ? formatPctOrDash(v) : '—') },
        { key: 'CareP1_Cost', header: 'P1€', width: 7, fmt: formatCurrencyShortLog, title: 'Zusätzliche Pflege-Kosten P1' },
        { key: 'CareP2_Cost', header: 'P2€', width: 7, fmt: formatCurrencyShortLog, title: 'Zusätzliche Pflege-Kosten P2' },
    ];

    const activeCareCols = options.showCareDetails ? (options.logDetailLevel === 'detailed' ? careColsDetailed : careColsMinimal) : [];

    const finalCols = [
        { key: 'FlexRatePct', header: 'Flex%', width: 5, fmt: v => `${Math.round(v || 0)}%` },
        { key: 'flex_erfuellt_nominal', header: 'Flex', width: 7, fmt: formatCurrencyShortLog },
        {
            key: 'aktionUndGrund', header: 'Status', width: 22, fmt: (v, row) => {
                const alarmMarker = row.Alarm ? '(A) ' : '';
                const regimeShort = shortenText(window.Ruhestandsmodell_v30.CONFIG.SCENARIO_TEXT[row.Regime] || '');
                const status = `${alarmMarker}${row.CutReason || 'NONE'}/${regimeShort}`;
                return (v || status).substring(0, 21);
            }
        },
        { key: 'QuoteEndPct', header: 'Quote%', width: 6, fmt: v => `${(v || 0).toFixed(1)}%` },
        { key: 'RunwayCoveragePct', header: 'Runway%', width: 7, fmt: v => `${Math.round(v || 0)}%` },
        { key: 'RealReturnEquityPct', header: 'R.Aktien', width: 8, fmt: v => `${((v || 0) * 100).toFixed(1)}%` },
        { key: 'RealReturnGoldPct', header: 'R.Gold', width: 8, fmt: v => `${((v || 0) * 100).toFixed(1)}%` },
        { key: 'inflation', header: 'Infl.', width: 5, fmt: v => `${(v || 0).toFixed(1)}%` },
        {
            key: null, header: 'Handl.A', width: 8,
            fmt: (v, row) => {
                const val = (row.vk?.vkAkt || 0) - (row.kaufAkt || 0);
                const formatted = formatCurrencyShortLog(val);
                if (val > 0) return `<span style="color: darkblue; font-weight: bold">${formatted}</span>`;
                if (val < 0) return `<span style="color: darkred; font-weight: bold">${formatted}</span>`;
                return formatted;
            }
        },
        {
            key: null, header: 'Handl.G', width: 8,
            fmt: (v, row) => {
                const val = (row.vk?.vkGld || 0) - (row.kaufGld || 0);
                const formatted = formatCurrencyShortLog(val);
                if (val > 0) return `<span style="color: darkblue; font-weight: bold">${formatted}</span>`;
                if (val < 0) return `<span style="color: darkred; font-weight: bold">${formatted}</span>`;
                return formatted;
            }
        },
        { key: 'steuern_gesamt', header: 'St.', width: 6, fmt: formatCurrencyShortLog },
        { key: 'wertAktien', header: 'Aktien', width: 8, fmt: formatCurrencyShortLog },
        { key: 'wertGold', header: 'Gold', width: 7, fmt: formatCurrencyShortLog },
        { key: 'liquiditaet', header: 'Liq.', width: 7, fmt: formatCurrencyShortLog },
    ];

    const detailCols = options.logDetailLevel === 'detailed' ? [
        { key: 'jahresentnahme_real', header: 'Entn_real', width: 9, fmt: formatCurrencyShortLog },
        { key: 'floor_aus_depot', header: 'FloorDep', width: 8, fmt: formatCurrencyShortLog },
    ] : [];

    const guardCols = options.logDetailLevel === 'detailed' ? [
        { key: 'NeedLiq', header: 'NeedLiq', width: 8, fmt: formatCurrencyShortLog, title: 'Benötigte Liquidität für Floor-Runway' },
        { key: 'GuardGold', header: 'GuardG', width: 7, fmt: formatCurrencyShortLog, title: 'FAIL-SAFE: Gold verkauft' },
        { key: 'GuardEq', header: 'GuardA', width: 7, fmt: formatCurrencyShortLog, title: 'FAIL-SAFE: Aktien verkauft' },
        { key: 'GuardNote', header: 'GuardNote', width: 16, fmt: v => (v || '').substring(0, 16), title: 'FAIL-SAFE: Grund/Status' }
    ] : [];

    return [...baseCols, ...activeCareCols, ...finalCols, ...detailCols, ...guardCols];
}

/**
 * Formatiert den Lebensstatus einer Person für das Worst-Run-Log.
 * @param {number|null|undefined} value - 1, 0 oder null/undefined
 * @returns {string} "✓" für lebend, "✗" für verstorben, "—" wenn nicht vorhanden
 */
function formatAliveStatus(value) {
    if (value == null) return '—';
    return value ? '✓' : '✗';
}

export function renderWorstRunLog(logRows, caR_Threshold, opts = {}) {
    const options = { showCareDetails: false, logDetailLevel: 'normal', ...opts };
    const allCols = getWorstRunColumnDefinitions(options);

    const getNestedValue = (obj, path) => {
        if (!path) return obj;
        return path.split('.').reduce((o, k) => (o && o[k] != null) ? o[k] : undefined, obj);
    };

    // Generate HTML table
    let html = '<table><thead><tr>';
    for (const col of allCols) {
        html += `<th>${col.header}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let i = 0; i < logRows.length; i++) {
        const row = logRows[i];
        const isBelowCaR = caR_Threshold !== undefined && row.jahresentnahme_real < caR_Threshold;
        const rowClass = i % 2 === 0 ? 'even' : 'odd';
        html += `<tr class="${rowClass}${isBelowCaR ? ' below-car' : ''}">`;

        for (const col of allCols) {
            const rawValue = col.key === null ? null : getNestedValue(row, col.key);
            const formattedValue = col.fmt ? col.fmt(rawValue, row) : String(rawValue || '');
            html += `<td>${formattedValue}${col === allCols[allCols.length - 1] && isBelowCaR ? ' <CaR!' : ''}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
}

/**
 * Berechnet das Gesamtvermögen eines Portfolios
 */
export function portfolioTotal(p) {
    const sumTr = (arr) => Array.isArray(arr)
        ? arr.reduce((s, t) => s + (Number(t?.marketValue) || 0), 0)
        : 0;
    return sumTr(p?.depotTranchesAktien) + sumTr(p?.depotTranchesGold) + (Number(p?.liquiditaet) || 0);
}

/**
 * Aggregiert Metriken für eine Reihe von Monte-Carlo-Läufen
 * @param {Array} runOutcomes - Array mit Ergebnissen einzelner Läufe
 * @returns {Object} Aggregierte Metriken
 */
export function aggregateSweepMetrics(runOutcomes) {
    if (!runOutcomes || runOutcomes.length === 0) {
        return {
            successProbFloor: 0,
            p10EndWealth: 0,
            worst5Drawdown: 0,
            minRunwayObserved: 0
        };
    }

    const successCount = runOutcomes.filter(r => !r.failed).length;
    const successProbFloor = (successCount / runOutcomes.length) * 100;

    const endWealths = runOutcomes.map(r => r.finalVermoegen || 0);
    endWealths.sort((a, b) => a - b);
    const p10Index = Math.floor(endWealths.length * 0.10);
    const p10EndWealth = endWealths[p10Index] || 0;

    const drawdowns = runOutcomes.map(r => r.maxDrawdown || 0);
    drawdowns.sort((a, b) => b - a);
    const p95Index = Math.floor(drawdowns.length * 0.95);
    const worst5Drawdown = drawdowns[p95Index] || 0;

    const runways = runOutcomes.map(r => r.minRunway || 0);
    const minRunwayObserved = Math.min(...runways);

    return {
        successProbFloor,
        p10EndWealth,
        worst5Drawdown,
        minRunwayObserved
    };
}
