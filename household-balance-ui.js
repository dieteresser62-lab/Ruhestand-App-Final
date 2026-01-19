// @ts-check

import { UIUtils } from './balance-utils.js';

function byId(id) {
    return document.getElementById(id);
}

function formatCurrency(value) {
    return UIUtils.formatCurrency(value);
}

function formatMonths(value) {
    if (!Number.isFinite(value)) return 'N/A';
    return `${UIUtils.formatNumber(value)} Monate`;
}

export function renderHouseholdOverview(aggregated, containerId = 'household-overview') {
    const container = byId(containerId);
    if (!container) return;
    if (!aggregated) {
        container.innerHTML = '';
        return;
    }

    const items = [
        { label: 'Gesamtbedarf (Jahr)', value: formatCurrency(aggregated.totalBedarf) },
        { label: 'Gesamtrente (Jahr)', value: formatCurrency(aggregated.totalRenteJahr) },
        { label: 'Netto-Entnahme', value: formatCurrency(aggregated.netWithdrawal) },
        { label: 'Depot gesamt', value: formatCurrency(aggregated.totalDepot) },
        { label: 'Liquiditaet gesamt', value: formatCurrency(aggregated.totalLiquid) },
        { label: 'Runway Minimum', value: formatMonths(aggregated.runwayMinMonths) }
    ];

    container.innerHTML = `
        <div class="results-kpi-grid">
            ${items.map(item => `
                <div class="result-item">
                    <strong>${item.label}</strong>
                    <span>${item.value}</span>
                </div>
            `).join('')}
        </div>
    `;
}

export function renderWithdrawalRecommendation(distribution, containerId = 'withdrawal-recommendation') {
    const container = byId(containerId);
    if (!container) return;
    if (!distribution || !Array.isArray(distribution.items) || distribution.items.length === 0) {
        container.innerHTML = '<p class="muted-text">Keine Entnahme erforderlich.</p>';
        return;
    }

    const cards = distribution.items.map(item => {
        const sourceLines = [];
        if (item.tagesgeldUsed > 0) {
            sourceLines.push(`Tagesgeld: ${formatCurrency(item.tagesgeldUsed)}`);
        }
        if (item.geldmarktUsed > 0) {
            sourceLines.push(`Geldmarkt-ETF: ${formatCurrency(item.geldmarktUsed)}`);
        }
        if (item.sellAmount > 0) {
            sourceLines.push(`Depotverkauf: ${formatCurrency(item.sellAmount)}`);
        }

        const trancheList = item.tranches && item.tranches.length
            ? `<ul class="household-tranche-list">
                    ${item.tranches.map(entry => {
                        const name = entry.tranche?.name || entry.tranche?.isin || 'Tranche';
                        return `<li>${name}: ${formatCurrency(entry.sellAmount)} (Steuer ~ ${formatCurrency(entry.taxAmount)})</li>`;
                    }).join('')}
               </ul>`
            : '';

        return `
            <div class="household-card">
                <div class="household-card-header">
                    <strong>${item.name}</strong>
                    <span>${formatCurrency(item.withdrawalAmount)}</span>
                </div>
                <div class="household-card-meta">
                    <div>Geplanter Verkauf: ${formatCurrency(item.sellAmount)}</div>
                    <div>Steuer Schaetzung: ${formatCurrency(item.taxEstimate)}</div>
                </div>
                ${sourceLines.length ? `<div class="household-card-meta"><div>Quellen: ${sourceLines.join(' | ')}</div></div>` : ''}
                ${trancheList}
            </div>
        `;
    }).join('');

    const remainderNote = distribution.remaining > 0
        ? `<div class="household-warning">Nicht gedeckte Entnahme: ${formatCurrency(distribution.remaining)}</div>`
        : '';

    container.innerHTML = `
        <div class="household-cards">
            ${cards}
        </div>
        ${remainderNote}
    `;
}

export function renderTaxComparison(taxOptimized, proportional, containerId = 'tax-comparison') {
    const container = byId(containerId);
    if (!container) return;
    if (!taxOptimized || !proportional) {
        container.innerHTML = '';
        return;
    }
    const savings = (proportional.totalTaxEstimate || 0) - (taxOptimized.totalTaxEstimate || 0);
    container.innerHTML = `
        <div class="result-item">
            <strong>Steuerersparnis (vs. proportional)</strong>
            <span>${formatCurrency(savings)}</span>
        </div>
    `;
}

export function renderHouseholdProfileSelector(profiles, containerId = 'household-profile-list') {
    const container = byId(containerId);
    if (!container) return;
    container.innerHTML = '';
    profiles.forEach(profile => {
        const row = document.createElement('label');
        row.className = 'household-profile-row';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = profile.id;
        checkbox.checked = profile.belongsToHousehold !== false;
        checkbox.dataset.profileId = profile.id;
        const label = document.createElement('span');
        label.textContent = profile.name || profile.id;
        row.appendChild(checkbox);
        row.appendChild(label);
        container.appendChild(row);
    });
}

export function toggleHouseholdMode(enabled) {
    const section = byId('household-section');
    if (!section) return;
    section.style.display = enabled ? 'block' : 'none';
}
