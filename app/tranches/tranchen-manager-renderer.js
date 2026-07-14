// @ts-check

import { escapeHtml } from '../shared/security-utils.js';

function formatMoney(value) {
    return Number(value || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSignedMoney(value) {
    const number = Number(value) || 0;
    if (number < 0) return `-${formatMoney(Math.abs(number))}`;
    if (number > 0) return `+${formatMoney(number)}`;
    return formatMoney(0);
}

function formatSignedPercent(value) {
    const number = Number(value) || 0;
    if (number < 0) return `-${Math.abs(number).toFixed(2)} %`;
    if (number > 0) return `+${number.toFixed(2)} %`;
    return '0.00 %';
}

const CLASSIFICATION_LABELS = Object.freeze({
    aktien_alt: { category: 'Aktien', type: 'Altbestand', className: 'badge-alt' },
    aktien_neu: { category: 'Aktien', type: 'Neubestand', className: 'badge-neu' },
    anleihe: { category: 'Anleihen', type: 'Anleihe', className: 'badge-geldmarkt' },
    geldmarkt: { category: 'Geldmarkt', type: 'Geldmarkt-ETF', className: 'badge-geldmarkt' },
    gold: { category: 'Gold', type: 'Gold-ETC', className: 'badge-gold' }
});

export function buildTranchenStatsHtml(tranchen) {
    const totalValue = tranchen.reduce((sum, t) => sum + (Number(t.marketValue) || 0), 0);
    const totalCost = tranchen.reduce((sum, t) => sum + (Number(t.costBasis) || 0), 0);
    const totalGain = totalValue - totalCost;
    const gainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    return `
        <div class="stat-card">
            <div class="stat-label">Gesamtwert</div>
            <div class="stat-value">${formatMoney(totalValue)} €</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Einstandswert</div>
            <div class="stat-value">${formatMoney(totalCost)} €</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Gewinn absolut</div>
            <div class="stat-value">${formatMoney(totalGain)} €</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Gewinn relativ</div>
            <div class="stat-value">${gainPct.toFixed(2)} %</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Anzahl Tranchen</div>
            <div class="stat-value">${tranchen.length}</div>
        </div>
    `;
}

export function buildEmptyTranchenHtml() {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <h3>Keine Tranchen vorhanden</h3>
            <p>Fügen Sie Ihre erste Tranche hinzu.</p>
        </div>
    `;
}

export function buildTranchenTableHtml(tranchen) {
    if (!tranchen.length) {
        return buildEmptyTranchenHtml();
    }

    const sorted = [...tranchen].sort((a, b) => {
        const dateA = a.purchaseDate ? new Date(a.purchaseDate) : new Date('1900-01-01');
        const dateB = b.purchaseDate ? new Date(b.purchaseDate) : new Date('1900-01-01');
        return dateA - dateB;
    });

    const rows = sorted.map((t) => {
        const gain = (Number(t.marketValue) || 0) - (Number(t.costBasis) || 0);
        const gainPct = t.costBasis > 0 ? (gain / t.costBasis) * 100 : 0;
        const classification = CLASSIFICATION_LABELS[t.type] || {
            category: t.category || 'Unbekannt',
            type: t.type || 'Unbekannt',
            className: 'badge-geldmarkt'
        };
        const typeBadge = `<span class="badge ${classification.className}">${escapeHtml(classification.type)}</span>`;
        const categoryLabel = `<span class="classification-category">${escapeHtml(classification.category)}</span>`;
        const taxBadge = t.tqf >= 1.0 ? '<span class="badge badge-steuerfrei">Steuerfrei</span>' : '';
        const originalIndex = tranchen.indexOf(t);
        const accessibleName = escapeHtml(t.name || `Tranche ${originalIndex + 1}`);

        return `
            <tr class="tranche-row">
                <td>${escapeHtml(t.purchaseDate) || '-'}</td>
                <td>
                    <strong>${escapeHtml(t.name)}</strong><br>
                    <small style="color: #718096;">${escapeHtml(t.isin) || '-'}</small><br>
                    <small style="color: #718096;">${escapeHtml(t.ticker) || '-'}</small>
                </td>
                <td>${Number(t.shares || 0).toLocaleString('de-DE')}</td>
                <td>${Number(t.purchasePrice || 0).toFixed(2)} €</td>
                <td>${Number(t.currentPrice || 0).toFixed(2)} €</td>
                <td>${formatMoney(t.costBasis)} €</td>
                <td>${formatMoney(t.marketValue)} €</td>
                <td class="${gain >= 0 ? 'positive' : 'negative'}">${formatSignedMoney(gain)} € (${formatSignedPercent(gainPct)})</td>
                <td>${categoryLabel}<br>${typeBadge} ${taxBadge}</td>
                <td class="table-actions">
                    <button class="btn-primary icon-action" type="button" data-action="edit-tranche" data-index="${originalIndex}" aria-label="Tranche ${accessibleName} bearbeiten" title="Tranche bearbeiten"><span aria-hidden="true">✏️</span></button>
                    <button class="delete-btn icon-action" type="button" data-action="delete-tranche" data-index="${originalIndex}" aria-label="Tranche ${accessibleName} löschen" title="Tranche löschen"><span aria-hidden="true">🗑️</span></button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="table-scroll" role="region" aria-label="Tranchen-Tabelle, horizontal scrollbar" tabindex="0">
        <table>
            <caption class="visually-hidden">Gespeicherte Tranchen mit Kategorie, Typ, Bewertung und Aktionen</caption>
            <thead>
                <tr>
                    <th>Kaufdatum</th>
                    <th>Name / ISIN</th>
                    <th>Stücke</th>
                    <th>Kaufpreis</th>
                    <th>Aktuell</th>
                    <th>Einstand</th>
                    <th>Marktwert</th>
                    <th>Gewinn</th>
                    <th>Kategorie / Typ</th>
                    <th>Aktionen</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        </div>
    `;
}

export function renderTranchenStats(container, tranchen) {
    container.innerHTML = buildTranchenStatsHtml(tranchen);
}

export function renderTranchenTable(container, tranchen) {
    container.innerHTML = buildTranchenTableHtml(tranchen);
}
