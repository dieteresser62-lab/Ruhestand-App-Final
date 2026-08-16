"use strict";

const KPI_LABELS = Object.freeze({
    finalValueNominalEur: 'Endvermögen nominal',
    finalValueRealEur: 'Endvermögen real',
    maximumDrawdownNominalPct: 'Maximaler Drawdown nominal',
    maximumDrawdownRealPct: 'Maximaler Drawdown real',
    totalWithdrawalsEur: 'Entnahmen gesamt',
    totalFlexFulfilledEur: 'Erfülltes Flexbudget',
    totalMinimumFlexShortfallEur: 'Mindest-Flex-Lücke',
    totalTaxesEur: 'Steuern gesamt',
    totalHealthBucketUsedEur: 'Pflege-Bucket genutzt',
    financiallyEvaluatedYears: 'Finanziell ausgewertete Jahre',
    ruinYear: 'Jahr des Vermögensaufbrauchs'
});

const GROUP_LABELS = Object.freeze({
    decumulation: 'Entnahmestrategie',
    longevity: 'Langlebigkeitsannahme',
    liquidityRunwayYears: 'Liquiditätsreichweite',
    maxSkimPctOfEq: 'Gewinnmitnahme',
    maxBearRefillPctOfEq: 'Nachfüllgrenze im Bärenmarkt',
    dynamicFlex: 'Dynamische Flexausgaben',
    horizonMethod: 'Horizontmethode',
    horizonYears: 'Planungshorizont',
    survivalQuantile: 'Überlebensquantil',
    goGoActive: 'Go-Go-Phase',
    goGoMultiplier: 'Go-Go-Multiplikator'
});

const MARKER_LABELS = Object.freeze({
    portfolio_state: 'Portfoliowert',
    policy_decision: 'Strategieentscheidung',
    household_flex: 'Flexausgaben',
    minimum_flex_shortfall: 'Mindest-Flex-Lücke',
    rebalancing: 'Umschichtung',
    forced_sale: 'Erzwungener Verkauf',
    terminal_status: 'Terminalstatus'
});

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatNumber(value, digits = 1) {
    return Number.isFinite(value)
        ? new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(value)
        : 'nicht beobachtet';
}

function formatCurrency(value) {
    return Number.isFinite(value)
        ? new Intl.NumberFormat('de-DE', {
            style: 'currency', currency: 'EUR', maximumFractionDigits: 0
        }).format(value)
        : 'nicht beobachtet';
}

function formatKpi(field, value) {
    if (!Number.isFinite(value)) return value === null ? 'nicht beobachtet' : '—';
    if (field.endsWith('Eur')) return formatCurrency(value);
    if (field.endsWith('Pct')) return `${formatNumber(value)} %`;
    if (field === 'ruinYear') return `Jahr ${value + 1}`;
    return formatNumber(value, 0);
}

function formatYearDelta(value) {
    return `${formatNumber(value, 0)} ${Math.abs(value) === 1 ? 'Jahr' : 'Jahre'}`;
}

function formatKpiDelta(delta) {
    if (!Number.isFinite(delta?.absoluteDelta)) {
        return delta?.applicability === 'not_applicable_neither_ruined'
            ? 'nicht anwendbar'
            : 'Δ nicht beobachtet';
    }
    const value = delta.absoluteDelta;
    if (delta.unit === 'nominal_eur' || delta.unit === 'real_eur') return `Δ ${formatCurrency(value)}`;
    if (delta.unit === 'percentage_points') {
        return `Δ ${formatNumber(value)} ${Math.abs(value) === 1 ? 'Prozentpunkt' : 'Prozentpunkte'}`;
    }
    if (delta.unit === 'years' || delta.unit === 'zero_based_year_index') return `Δ ${formatYearDelta(value)}`;
    return `Δ ${formatNumber(value)}`;
}

function resultMap(results) {
    if (results instanceof Map) return results;
    return new Map((results || []).map(result => [result.variantId, result]));
}

export function renderStressReplayPatchPreviewV1({ preview = null, error = null } = {}) {
    if (error) {
        return `<p class="stress-replay-message stress-replay-message-error" role="alert">Patch nicht zulässig: ${escapeHtml(error.message || error)}</p>`;
    }
    if (!preview || preview.materialChangeGroups?.length === 0) {
        return '<p class="stress-replay-message">Noch keine materielle Abweichung von der eingefrorenen Baseline.</p>';
    }
    const groups = preview.materialChangeGroups
        .map(group => `<li>${escapeHtml(GROUP_LABELS[group] || group)}</li>`).join('');
    const multi = preview.warnings?.length
        ? '<p class="stress-replay-message stress-replay-message-warning">Mehrere Faktoren werden gleichzeitig geändert. Beobachtete Unterschiede lassen sich keinem einzelnen Faktor zuschreiben.</p>'
        : '<p class="stress-replay-message">Ein einzelner Strategiefaktor wird auf demselben fixierten Pfad verändert.</p>';
    return `${multi}<p><strong>Materielle Änderungen gegenüber der Baseline:</strong></p><ul>${groups}</ul>`;
}

export function renderStressReplayVariantListV1({ workspace, busy = false, readOnly = false } = {}) {
    if (!workspace) return '<p>Kein aktiver Stresspfad.</p>';
    return `<ul class="stress-replay-variant-list">${workspace.variants.map(variant => {
        const baseline = variant.role === 'baseline';
        const groups = variant.materialChangeGroups?.map(group => GROUP_LABELS[group] || group).join(', ');
        return `<li data-variant-id="${escapeHtml(variant.id)}">
            <span><strong>${escapeHtml(variant.label)}</strong>${baseline
                ? ' – unveränderliche Baseline'
                : ` – Patch: ${escapeHtml(groups || 'Strategieänderung')}`}</span>
            ${baseline ? '' : `<span class="stress-replay-variant-actions">
                <button type="button" data-stress-replay-action="recompute" data-variant-id="${escapeHtml(variant.id)}"${busy || readOnly ? ' disabled' : ''}>Neu berechnen</button>
                <button type="button" data-stress-replay-action="remove" data-variant-id="${escapeHtml(variant.id)}"${busy || readOnly ? ' disabled' : ''}>Entfernen</button>
            </span>`}
        </li>`;
    }).join('')}</ul>`;
}

function renderKpiTable(comparison) {
    const baseline = comparison.variants[0];
    const alternatives = comparison.variants.slice(1);
    if (alternatives.length === 0) return '<p>Fügen Sie eine Variante hinzu, um Kennzahlen zu vergleichen.</p>';
    const header = alternatives.map(entry => `<th scope="col">${escapeHtml(entry.label)}</th>`).join('');
    const rows = Object.keys(KPI_LABELS).map(field => {
        const cells = alternatives.map(entry => {
            const pair = comparison.pairwise.find(candidate => candidate.variantId === entry.variantId);
            if (!pair?.comparable) return '<td>Vergleich wegen technischem Fehler gesperrt</td>';
            const delta = pair.kpiDeltas?.[field];
            const deltaText = formatKpiDelta(delta);
            return `<td>${formatKpi(field, entry.summary?.[field])}<small>${escapeHtml(deltaText)}</small></td>`;
        }).join('');
        return `<tr><th scope="row">${escapeHtml(KPI_LABELS[field])}</th><td>${formatKpi(field, baseline.summary?.[field])}</td>${cells}</tr>`;
    }).join('');
    return `<div class="stress-replay-table-scroll" tabindex="0" aria-label="Kennzahlenvergleich horizontal scrollbar">
        <table><thead><tr><th scope="col">Kennzahl</th><th scope="col">${escapeHtml(baseline.label)}</th>${header}</tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

function renderDeltaTimeline(comparison) {
    if (comparison.pairwise.length === 0) return '<p>Noch keine Delta-Timeline verfügbar.</p>';
    return comparison.pairwise.map(pair => {
        const variant = comparison.variants.find(entry => entry.variantId === pair.variantId);
        if (!pair.comparable) {
            return `<section><h6>${escapeHtml(variant?.label)}</h6><p role="alert">Technischer Fehler: Finanzielle Deltas werden nicht angezeigt.</p></section>`;
        }
        const markers = pair.firstDeltaMarkers.length === 0
            ? '<li>Keine beobachtete Abweichung auf diesem Pfad.</li>'
            : pair.firstDeltaMarkers.map(marker => `<li><strong>Jahr ${marker.yearIndex + 1}:</strong> ${escapeHtml(MARKER_LABELS[marker.category] || marker.category)} (${escapeHtml(marker.causeCode)})</li>`).join('');
        const attribution = pair.factorMode === 'multi_factor'
            ? 'Mehrfaktor-Variante: keine Zuordnung zu einem einzelnen Auslöser.'
            : 'Erste beobachtete Abweichung, keine Kausalitätsaussage.';
        return `<section><h6>${escapeHtml(variant?.label)}</h6><p>${attribution}</p><ol>${markers}</ol></section>`;
    }).join('');
}

function renderYearTable(comparison, results) {
    const byId = resultMap(results);
    const years = new Set();
    for (const result of byId.values()) {
        for (const year of result?.yearResults || []) years.add(year.yearIndex);
    }
    if (years.size === 0) return '<p>Keine Jahreswerte verfügbar.</p>';
    const orderedYears = [...years].sort((left, right) => left - right);
    const headers = comparison.variants.map(entry => `<th scope="col">${escapeHtml(entry.label)}</th>`).join('');
    const rows = orderedYears.map(yearIndex => {
        const cells = comparison.variants.map(entry => {
            const year = byId.get(entry.variantId)?.yearResults?.find(candidate => candidate.yearIndex === yearIndex);
            return `<td>${year ? formatCurrency(year.nominalValueEur) : '—'}</td>`;
        }).join('');
        const historicalYear = [...byId.values()].map(result => result?.yearResults?.find(year => year.yearIndex === yearIndex)?.historicalYear).find(Number.isFinite);
        return `<tr><th scope="row">${yearIndex + 1}${Number.isFinite(historicalYear) ? ` (${historicalYear})` : ''}</th>${cells}</tr>`;
    }).join('');
    return `<div class="stress-replay-table-scroll" tabindex="0" aria-label="Jahresvergleich horizontal scrollbar">
        <table><thead><tr><th scope="col">Pfadjahr</th>${headers}</tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

export function renderStressReplayComparisonV1({ comparison = null, results = [] } = {}) {
    if (!comparison) return '<p>Noch kein Variantenvergleich berechnet.</p>';
    const blocked = comparison.overallStatus === 'blocked_technical_error'
        ? '<p class="stress-replay-message stress-replay-message-error" role="alert">Mindestens eine Berechnung endete mit einem technischen Fehler. Finanzielle Paarvergleiche sind für die betroffene Variante gesperrt.</p>'
        : '';
    return `${blocked}
        <p class="stress-replay-interpretation">Vergleich auf genau diesem fixierten Stresspfad; keine allgemeine Rangfolge oder Strategieempfehlung.</p>
        <section aria-labelledby="stressReplayKpiHeading"><h5 id="stressReplayKpiHeading">KPI-Tabelle</h5>${renderKpiTable(comparison)}</section>
        <section aria-labelledby="stressReplayDeltaHeading"><h5 id="stressReplayDeltaHeading">Delta-Timeline</h5>${renderDeltaTimeline(comparison)}</section>
        <section aria-labelledby="stressReplayYearHeading"><h5 id="stressReplayYearHeading">Jahrestabelle</h5>${renderYearTable(comparison, results)}</section>`;
}

export function renderStressReplayViewsV1({ documentRef = globalThis.document, workspace, comparison, results, preview, previewError, busy = false, readOnly = false } = {}) {
    const previewTarget = documentRef?.getElementById?.('stressReplayPatchPreview');
    const listTarget = documentRef?.getElementById?.('stressReplayVariantList');
    const comparisonTarget = documentRef?.getElementById?.('stressReplayComparison');
    if (previewTarget) previewTarget.innerHTML = renderStressReplayPatchPreviewV1({ preview, error: previewError });
    if (listTarget) listTarget.innerHTML = renderStressReplayVariantListV1({ workspace, busy, readOnly });
    if (comparisonTarget) comparisonTarget.innerHTML = renderStressReplayComparisonV1({ comparison, results });
}
