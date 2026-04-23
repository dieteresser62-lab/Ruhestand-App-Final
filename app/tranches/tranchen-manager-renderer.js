// @ts-check

import { escapeHtml } from '../shared/security-utils.js';

function formatMoney(value) {
    return Number(value || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
        const typeBadge =
            t.type === 'aktien_alt' ? '<span class="badge badge-alt">Alt</span>' :
            t.type === 'aktien_neu' ? '<span class="badge badge-neu">Neu</span>' :
            t.type === 'anleihe' ? '<span class="badge badge-geldmarkt">Bond</span>' :
            '<span class="badge badge-geldmarkt">Geldmarkt</span>';
        const taxBadge = t.tqf >= 1.0 ? '<span class="badge badge-steuerfrei">Steuerfrei</span>' : '';
        const originalIndex = tranchen.indexOf(t);

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
                <td class="${gain >= 0 ? 'positive' : 'negative'}">${gain >= 0 ? '+' : ''}${formatMoney(gain)} € (${gainPct.toFixed(2)}%)</td>
                <td>${typeBadge} ${taxBadge}</td>
                <td>
                    <button class="btn-primary" style="padding: 4px 8px; font-size: 12px; margin-right: 5px;" data-action="edit-tranche" data-index="${originalIndex}">✏️</button>
                    <button class="delete-btn" data-action="delete-tranche" data-index="${originalIndex}">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <table>
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
                    <th>Typ</th>
                    <th>Aktionen</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

export function renderTranchenStats(container, tranchen) {
    container.innerHTML = buildTranchenStatsHtml(tranchen);
}

export function renderTranchenTable(container, tranchen) {
    container.innerHTML = buildTranchenTableHtml(tranchen);
}
