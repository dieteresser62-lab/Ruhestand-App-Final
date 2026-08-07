"use strict";

import { formatCurrencySafe } from './results-formatting.js';
import { renderHeatmapSVG } from './simulator-heatmap.js';

/**
 * Erstellt eine KPI-Karte als HTML-String.
 *
 * @param {import('./results-metrics.js').KpiDescriptor} kpi - Beschreibungsobjekt der Kennzahl.
 * @returns {string} HTML-Fragment der KPI-Karte.
 */
export function renderKpiCard(kpi) {
    const toneClass = mapToneToClass(kpi.tone);
    const layoutClass = kpi.layout === 'exact-risk' ? ' kpi-exact-value' : '';
    const description = kpi.description || '';
    const tooltip = kpi.tooltip || description || kpi.title;
    const statusLine = kpi.statusLine
        ? `<div class="kpi-status-line">${kpi.statusLine}</div>`
        : '';
    const secondaryLine = kpi.secondaryLabel
        ? `<div class="kpi-secondary-value"><span>${kpi.secondaryLabel}</span><strong>${kpi.secondaryValue || '—'}</strong>${kpi.secondaryStatusLine ? `<small>${kpi.secondaryStatusLine}</small>` : ''}</div>`
        : '';
    return `
    <div class="kpi-card ${toneClass}${layoutClass}" title="${tooltip}">
      <strong>${kpi.title}</strong>
      <div class="value-line">${kpi.value}</div>
      ${statusLine}
      ${secondaryLine}
      <div class="kpi-description">${description}</div>
    </div>`;
}

/**
 * Rendert die Summary-KPIs in den übergebenen Container.
 *
 * @param {HTMLElement} container - Ziel-Container im DOM.
 * @param {Array<import('./results-metrics.js').KpiDescriptor>} summaryCards - Zusammenfassende KPIs.
 */
export function renderSummary(container, summaryCards) {
    if (!container || !Array.isArray(summaryCards)) return;

    // In simple mode, show only the 3 most important cards.
    const isSimpleMode = document.body.classList.contains('mode-simple');
    const cardsToShow = isSimpleMode
        ? summaryCards.filter((card, index) => index < 3 || card.decisionCritical === true)
        : summaryCards;

    const summaryHtml = `
        <div class="summary-grid">
          ${cardsToShow.map(card => {
              const tooltip = card.tooltip || card.description || card.title;
              const layoutClass = card.layout === 'exact-risk' ? ' summary-exact-value' : '';
              const statusLine = card.statusLine
                  ? `<small class="summary-status-line">${card.statusLine}</small>`
                  : '';
              return `<div class="summary-item${mapToneToSummaryClass(card.tone)}${layoutClass}" title="${tooltip}"><strong>${card.title}</strong><span>${card.value}</span>${statusLine}</div>`;
          }).join('')}
        </div>`;
    container.innerHTML = summaryHtml;
}

/**
 * Rendert das KPI-Dashboard (Primär- und Detail-Karten) in den Container.
 *
 * @param {HTMLElement} container - Ziel-Container im DOM.
 * @param {{ primary: Array, detailSections: Array<{title: string, kpis: Array}> }} dashboard - Struktur aus dem Logikmodul.
 */
export function renderKpiDashboard(container, dashboard) {
    if (!container || !dashboard) return;

    let html = '<h3 class="unified-kpi-header">Wichtigste Kennzahlen</h3><div class="kpi-grid">';
    html += dashboard.primary.map(renderKpiCard).join('');
    html += '</div>';

    if (Array.isArray(dashboard.drawdownKpis) && dashboard.drawdownKpis.length > 0) {
        html += '<h4 class="drawdown-pair-heading">Maximum-Drawdown: nominal und real</h4>';
        html += '<div class="kpi-grid kpi-grid-pair">';
        html += dashboard.drawdownKpis.map(renderKpiCard).join('');
        html += '</div>';
    }

    if (dashboard.reportingReferenceNotice) {
        html += `<p class="reporting-reference-note">${dashboard.reportingReferenceNotice}</p>`;
    }

    html += '<details class="details-card" style="margin-top: 15px; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px;"><summary style="cursor: pointer; font-weight: 600; color: var(--primary-color); font-size: 0.95rem;">📊 Weitere Detail-KPIs anzeigen</summary>';
    html += '<div style="margin-top: 15px;">';

    for (const section of dashboard.detailSections) {
        html += `<h4 style="font-size: 0.9rem; color: var(--primary-color); margin: 10px 0 8px 0; padding-bottom: 5px; border-bottom: 1px solid var(--border-color);">${section.title}</h4><div class="kpi-grid">`;
        html += section.kpis.map(renderKpiCard).join('');
        html += '</div>';
    }

    html += '</div></details>';

    container.innerHTML = html;
    container.style.display = 'block';
}

/**
 * Rendert die Stress-KPI-Sektion direkt unterhalb eines Bezugscontainers.
 *
 * @param {HTMLElement} referenceContainer - Container, unter dem die Stress-KPI-Sektion eingefügt wird.
 * @param {Object|null} stressMetrics - Von buildStressMetrics erzeugte Struktur.
 */
export function renderStressSection(referenceContainer, stressMetrics) {
    if (!referenceContainer) return;

    const existing = document.getElementById('stressKpiResults');
    if (existing) existing.remove();

    if (!stressMetrics) return;

    const newContainer = document.createElement('div');
    newContainer.id = 'stressKpiResults';

    const { presetLabel, years, kpis } = stressMetrics;
    let html = `
        <h3 class="unified-kpi-header" style="border-color: var(--danger-color);">Ergebnisse des Stress-Szenarios</h3>
        <div style="text-align: center; margin-bottom: 15px; font-size: 1rem;">
            <strong>${presetLabel}</strong> (betrifft die ersten ${years} Jahre)
        </div>
        <div class="kpi-grid">`;
    html += kpis.slice(0, 3).map(renderKpiCard).join('');
    html += '</div><div class="kpi-grid" style="margin-top:15px;">';
    html += kpis.slice(3).map(renderKpiCard).join('');
    html += '</div>';

    newContainer.innerHTML = html;
    referenceContainer.parentNode.insertBefore(newContainer, referenceContainer.nextSibling);
}

/**
 * Rendert den Heatmap-Bereich basierend auf den vorbereiteten Daten.
 *
 * @param {HTMLElement} container - Ziel-Container.
 * @param {Object} heatmapData - Objekt mit Heatmap-Daten und Metadaten.
 */
export function renderHeatmap(container, heatmapData) {
    if (!container || !heatmapData) return;

    // Fixed dimensions keep the SVG layout consistent across renders.
    container.innerHTML = renderHeatmapSVG(
        heatmapData.heatmap,
        heatmapData.bins,
        heatmapData.totalRuns,
        heatmapData.extraKPI,
        { width: 980, height: 420 }
    );
    container.style.display = 'block';
}

/**
 * Rendert die Pflege-KPIs oder blendet den Abschnitt aus, wenn keine vorliegen.
 *
 * @param {HTMLElement} summaryBox - Container für die KPI-Karten.
 * @param {HTMLElement} container - Gesamter Pflegebereich, der ein-/ausgeblendet wird.
 * @param {Object|null} careMetrics - Struktur aus buildCareMetrics.
 */
export function renderCareSection(summaryBox, container, careMetrics) {
    if (!summaryBox || !container) return;

    if (!careMetrics) {
        container.style.display = 'none';
        return;
    }

    const html = careMetrics.cards.map(renderKpiCard).join('');
    summaryBox.innerHTML = html;
    container.style.display = 'block';
}

/**
 * Hilfsfunktion: mappt die semantische Tonalität auf CSS-Klassen.
 *
 * @param {('default'|'success'|'warning'|'danger')} tone - Kennzeichnet die Tonalität.
 * @returns {string} CSS-Klasse.
 */
function mapToneToClass(tone) {
    switch (tone) {
        case 'success':
            return 'is-green';
        case 'warning':
            return 'is-amber';
        case 'danger':
            return 'is-red';
        default:
            return '';
    }
}

/**
 * Übersetzt die Tonalität auf Summary-spezifische Klassen.
 *
 * @param {('default'|'success'|'warning'|'danger')} tone - Tonalität der Karte.
 * @returns {string} CSS-Klasse für Summary-Elemente.
 */
function mapToneToSummaryClass(tone) {
    if (tone === 'success') return ' is-success';
    if (tone === 'warning') return ' is-warning';
    if (tone === 'danger') return ' is-danger';
    return '';
}

// Re-Export für bestehende Stellen, die Währungs-KPIs mit Abkürzung benötigen.
export const formatCurrency = formatCurrencySafe;
