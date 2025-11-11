"use strict";

import { formatCurrency, formatCurrencyShortLog, shortenText } from './simulator-utils.js';
import { STRESS_PRESETS } from './simulator-data.js';
import { renderHeatmapSVG, renderWorstRunToggle } from './simulator-heatmap.js';

// Globale Variable für Worst-Run Re-Rendering
window.globalWorstRunData = { rows: [], caR_Threshold: undefined };

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
export function displayMonteCarloResults(results, anzahl, failCount, worstRun, resultsMitPflege, resultsOhnePflege, pflegefallEingetretenCount, inputs, worstRunCare) {

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

    // 5. Worst-Run-Log mit Umschalter
    const worstContainer = document.getElementById('worstRunLogContainer');
    const worstEl = document.getElementById('worstRunLog');
    const controlsContainer = document.getElementById('worst-controls');

    const hasCareWorst = !!(worstRunCare && worstRunCare.hasCare && Array.isArray(worstRunCare.logDataRows) && worstRunCare.logDataRows.length > 0);

    if (controlsContainer && !document.getElementById('btnWorstAll')) {
        controlsContainer.insertAdjacentHTML('afterbegin', renderWorstRunToggle(hasCareWorst));
    }

    let view = localStorage.getItem('worstRunView') || 'all';
    if (view === 'care' && !hasCareWorst) view = 'all';

    const paintWorst = () => {
        const wr = (view === 'care' && hasCareWorst) ? worstRunCare : worstRun;

        const btnAll = document.getElementById('btnWorstAll');
        const btnCare = document.getElementById('btnWorstCare');
        if (btnAll) btnAll.classList.toggle('active', view === 'all');
        if (btnCare) btnCare.classList.toggle('active', view === 'care');

        if (wr && Array.isArray(wr.logDataRows) && wr.logDataRows.length > 0) {
            const caR = results.extraKPI?.consumptionAtRiskP10Real;
            window.globalWorstRunData = { rows: wr.logDataRows, caR_Threshold: caR };
            const showCareDetails = (localStorage.getItem('showCareDetails') === '1');
            const logDetailLevel = (localStorage.getItem('logDetailLevel') || 'normal');
            worstEl.textContent = renderWorstRunLog(wr.logDataRows, caR, {
                showCareDetails: showCareDetails,
                logDetailLevel: logDetailLevel
            });
            worstContainer.style.display = 'block';
        } else {
            worstContainer.style.display = 'none';
        }
    };

    const btnAll = document.getElementById('btnWorstAll');
    const btnCare = document.getElementById('btnWorstCare');
    if (btnAll && !btnAll.onclick) {
        btnAll.onclick = () => { view = 'all'; localStorage.setItem('worstRunView', 'all'); paintWorst(); };
    }
    if (btnCare && !btnCare.onclick && hasCareWorst) {
        btnCare.onclick = () => { view = 'care'; localStorage.setItem('worstRunView', 'care'); paintWorst(); };
    }

    paintWorst();

    // 6. Gesamten Ergebnis-Container sichtbar machen
    document.getElementById('monteCarloResults').style.display = 'block';
}

/**
 * Rendert das Worst-Run-Log als Textausgabe
 */
export function renderWorstRunLog(logRows, caR_Threshold, opts = {}) {
    const options = { showCareDetails: false, logDetailLevel: 'normal', ...opts };

    const formatPctOrDash = (value, fallback = '—') => {
        if (value == null || !isFinite(value)) return fallback;
        return `${Math.round(value * 100)}%`;
    };

    // Basis-Spalten abhängig vom Detail-Level
    const baseCols = [];
    baseCols.push({ key: 'jahr', header: 'Jahr', width: 4 });
    if (options.logDetailLevel === 'detailed') {
        baseCols.push({ key: 'histJahr', header: 'Hist', width: 4 });
    }
    baseCols.push({ key: 'entscheidung.jahresEntnahme', header: 'Entnahme', width: 8, fmt: formatCurrencyShortLog });
    baseCols.push({ key: 'floor_brutto', header: 'Floor', width: 7, fmt: formatCurrencyShortLog });

    // Renten-Spalten: Im Normal-Modus nur Summe, im Detail-Modus alle
    if (options.logDetailLevel === 'detailed' || options.showCareDetails) {
        baseCols.push({ key: 'rente1', header: 'Rente1', width: 7, fmt: formatCurrencyShortLog });
        baseCols.push({ key: 'rente2', header: 'Rente2', width: 7, fmt: formatCurrencyShortLog });
    }
    baseCols.push({ key: 'renteSum', header: 'RenteSum', width: 8, fmt: formatCurrencyShortLog });

    const careColsMinimal = [
        { key: 'pflege_zusatz_floor', header: 'PflegeZiel', width: 10, fmt: formatCurrencyShortLog, title: "Zusatz-Floor in diesem Jahr (nominal), gecappt durch MaxPflege-Floor – Floor@Eintritt; wächst jährlich mit Inflation/Drift." },
        { key: 'pflege_kumuliert', header: 'PflegeΣ', width: 8, fmt: formatCurrencyShortLog, title: "Kumulierte Pflege-Mehrkosten (Zusatz-Floor-Deltas + Flex-Verlust), nominal." },
        // Dual Care Columns
        { key: 'CareP1_Active', header: 'P1', width: 2, fmt: v => v ? '✓' : '—', title: 'Person 1 in Pflege' },
        { key: 'CareP1_Cost', header: 'P1€', width: 7, fmt: formatCurrencyShortLog, title: 'Zusätzliche Pflege-Kosten P1' },
        { key: 'CareP2_Active', header: 'P2', width: 2, fmt: v => v ? '✓' : '—', title: 'Person 2 in Pflege' },
        { key: 'CareP2_Cost', header: 'P2€', width: 7, fmt: formatCurrencyShortLog, title: 'Zusätzliche Pflege-Kosten P2' },
    ];

    const careColsDetailed = [
        { key: 'pflege_floor_anchor', header: 'Floor@Eintritt', width: 14, fmt: formatCurrencyShortLog },
        { key: 'pflege_maxfloor_anchor', header: 'MaxPflege@Jahr', width: 15, fmt: formatCurrencyShortLog },
        { key: 'pflege_cap_zusatz', header: 'CapZusatz@Jahr', width: 15, fmt: formatCurrencyShortLog },
        { key: 'pflege_delta_flex', header: 'PflegeΔ_Flex', width: 12, fmt: formatCurrencyShortLog },
        { key: 'pflege_zusatz_floor', header: 'PflegeZiel', width: 10, fmt: formatCurrencyShortLog, title: "Zusatz-Floor in diesem Jahr (nominal), gecappt durch MaxPflege-Floor – Floor@Eintritt; wächst jährlich mit Inflation/Drift." },
        { key: 'pflege_zusatz_floor_delta', header: 'PflegeΔ', width: 8, fmt: formatCurrencyShortLog },
        { key: 'pflege_kumuliert', header: 'PflegeΣ', width: 8, fmt: formatCurrencyShortLog, title: "Kumulierte Pflege-Mehrkosten (Zusatz-Floor-Deltas + Flex-Verlust), nominal." },
        { key: 'pflege_flex_faktor', header: 'FlexPfl%', width: 8, fmt: (v, row) => (row.pflege_aktiv ? formatPctOrDash(v) : '—') },
    ];

    // Pflege-Spalten nur wenn showCareDetails aktiviert ist
    const activeCareCols = options.showCareDetails ? (options.logDetailLevel === 'detailed' ? careColsDetailed : careColsMinimal) : [];

    const finalCols = [
        { key: 'FlexRatePct', header: 'Flex%', width: 5, fmt: v => `${Math.round(v || 0)}%` },
        { key: 'flex_erfuellt_nominal', header: 'Flex', width: 7, fmt: formatCurrencyShortLog },
        { key: 'aktionUndGrund', header: 'Status', width: 22, fmt: (v, row) => {
            const alarmMarker = row.Alarm ? '(A) ' : '';
            const regimeShort = shortenText(window.Ruhestandsmodell_v30.CONFIG.SCENARIO_TEXT[row.Regime] || '');
            const status = `${alarmMarker}${row.CutReason || 'NONE'}/${regimeShort}`;
            return (v || status).substring(0, 21);
        }},
        { key: 'QuoteEndPct', header: 'Quote%', width: 6, fmt: v => `${(v || 0).toFixed(1)}%` },
        { key: 'RunwayCoveragePct', header: 'Runway%', width: 7, fmt: v => `${Math.round(v || 0)}%` },
        { key: 'RealReturnEquityPct', header: 'R.Aktien', width: 8, fmt: v => `${((v||0)*100).toFixed(1)}%` },
        { key: 'RealReturnGoldPct', header: 'R.Gold', width: 8, fmt: v => `${((v||0)*100).toFixed(1)}%` },
        { key: 'inflation', header: 'Infl.', width: 5, fmt: v => `${(v || 0).toFixed(1)}%` },
        { key: null, header: 'Handl.A', width: 8,
          fmt: (v, row) => formatCurrencyShortLog((row.vk?.vkAkt || 0) - (row.kaufAkt || 0)) },
        { key: null, header: 'Handl.G', width: 8,
          fmt: (v, row) => formatCurrencyShortLog((row.vk?.vkGld || 0) - (row.kaufGld || 0)) },
        { key: 'steuern_gesamt', header: 'St.', width: 6, fmt: formatCurrencyShortLog },
        { key: 'wertAktien', header: 'Aktien', width: 8, fmt: formatCurrencyShortLog },
        { key: 'wertGold', header: 'Gold', width: 7, fmt: formatCurrencyShortLog },
        { key: 'liquiditaet', header: 'Liq.', width: 7, fmt: formatCurrencyShortLog },
    ];

    // Detail-Spalten nur im detailed-Modus
    const detailCols = options.logDetailLevel === 'detailed' ? [
        { key: 'jahresentnahme_real', header: 'Entn_real', width: 9, fmt: formatCurrencyShortLog },
        { key: 'floor_aus_depot', header: 'FloorDep', width: 8, fmt: formatCurrencyShortLog },
    ] : [];

    // FAIL-SAFE Guard Debug-Spalten nur im detailed-Modus
    const guardCols = options.logDetailLevel === 'detailed' ? [
        { key: 'NeedLiq', header: 'NeedLiq', width: 8, fmt: formatCurrencyShortLog, title: 'Benötigte Liquidität für Floor-Runway' },
        { key: 'GuardGold', header: 'GuardG', width: 7, fmt: formatCurrencyShortLog, title: 'FAIL-SAFE: Gold verkauft' },
        { key: 'GuardEq', header: 'GuardA', width: 7, fmt: formatCurrencyShortLog, title: 'FAIL-SAFE: Aktien verkauft' },
        { key: 'GuardNote', header: 'GuardNote', width: 16, fmt: v => (v || '').substring(0, 16), title: 'FAIL-SAFE: Grund/Status' }
    ] : [];

    const allCols = [...baseCols, ...activeCareCols, ...finalCols, ...detailCols, ...guardCols];

    const getNestedValue = (obj, path) => {
        if (!path) return obj;
        return path.split('.').reduce((o, k) => (o && o[k] != null) ? o[k] : undefined, obj);
    };

    let textHeader = allCols.map(c => c.header.padStart(c.width)).join("  ");
    let log = textHeader + "\n" + "=".repeat(textHeader.length) + "\n";

    for (const row of logRows) {
        const rowValues = allCols.map(col => {
            const rawValue = col.key === null ? null : getNestedValue(row, col.key);
            const formattedValue = col.fmt ? col.fmt(rawValue, row) : String(rawValue || '');
            return String(formattedValue).padStart(col.width);
        });

        const isBelowCaR = caR_Threshold !== undefined && row.jahresentnahme_real < caR_Threshold;
        log += rowValues.join("  ") + (isBelowCaR ? " <CaR!" : "") + "\n";
    }
    return log;
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
