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

export function ensureReconciliationCashControls(doc = document) {
    const form = doc.getElementById?.('reconciliationForm');
    if (!form || typeof doc.createElement !== 'function') return null;
    let choice = doc.getElementById?.('reconciliationCashChoice');
    if (!choice) {
        choice = doc.createElement('fieldset');
        choice.id = 'reconciliationCashChoice';
        choice.className = 'reconciliation-cash-choice';
        choice.setAttribute?.('style', 'margin:0;padding:1rem;border:1px solid rgba(0,0,0,0.16);border-radius:8px;');
        choice.innerHTML = `
            <legend>Cashstatus nach dem Verkauf *</legend>
            <div class="form-group">
                <label for="reconcileCashStatus">Ist der Nettoerlös bereits in der freien Liquidität enthalten?</label>
                <select id="reconcileCashStatus">
                    <option value="pending_manual_posting" selected>Nein / noch unklar – manuell offen halten</option>
                    <option value="confirmed_already_reflected">Ja – bereits im erfassten Cashstand enthalten</option>
                </select>
                <small>Es erfolgt niemals eine automatische Cashbuchung.</small>
            </div>
            <div id="reconcileInitialCashBalanceGroup" class="form-group" hidden>
                <label for="reconcileInitialCashBalance">Bestätigter Cashstand nach Berücksichtigung (€) *</label>
                <input id="reconcileInitialCashBalance" type="number" step="0.01">
                <small>Dieser Stand wird zusammen mit Nettoerlös und Zeitpunkt append-only dokumentiert.</small>
            </div>`;
        const firstActions = form.querySelector?.('.reconciliation-actions');
        if (firstActions?.parentNode?.insertBefore) firstActions.parentNode.insertBefore(choice, firstActions);
        else form.appendChild?.(choice);
    }

    let statusContainer = doc.getElementById?.('reconciliationCashStatuses');
    if (!statusContainer) {
        statusContainer = doc.createElement('div');
        statusContainer.id = 'reconciliationCashStatuses';
        statusContainer.className = 'reconciliation-preview';
        statusContainer.setAttribute?.('aria-live', 'polite');
        form.parentNode?.appendChild?.(statusContainer);
    }
    return statusContainer;
}

export function buildReconciliationCashStatusesHtml(statuses = [], { errorMessage = '' } = {}) {
    if (errorMessage) {
        return `
            <h3>Cashstatus der Realverkäufe</h3>
            <p class="reconciliation-status" data-kind="error" role="alert"><strong>Cashstatus-Audit nicht lesbar – die Liste ist unvollständig.</strong><br>${escapeHtml(errorMessage)}</p>`;
    }
    if (!Array.isArray(statuses) || statuses.length === 0) {
        return `
            <h3>Cashstatus der Realverkäufe</h3>
            <p>Noch keine dokumentierten Realverkäufe für dieses Profil.</p>`;
    }
    const rows = statuses.map(status => {
        const targetActionId = escapeHtml(status.targetActionId);
        const label = escapeHtml(status.statusLabel || 'Cashstatus unbekannt');
        const net = formatMoney(status.confirmedNetProceedsEur);
        const cashBalance = status.cashBalanceAfterPostingEur === null
            ? '-'
            : `${formatMoney(status.cashBalanceAfterPostingEur)} €`;
        const evidence = status.effectiveActionId
            ? `<div><strong>Wirksamer Auditnachweis:</strong> ${escapeHtml(status.effectiveActionId)}</div>`
            : '';
        const correction = status.correctionRevision > 0
            ? `<div><strong>Korrektur:</strong> Revision ${Number(status.correctionRevision)} · ${escapeHtml(status.correctionReason || '')}</div>`
            : '';
        const confirmLabel = status.isLegacy ? 'Cashnachweis freiwillig ergänzen' : 'Cashbuchung manuell bestätigen';
        const action = status.canConfirm
            ? `<button type="button" class="btn-primary" data-cash-action="confirm" data-target-action-id="${targetActionId}">${confirmLabel}</button>`
            : status.canCorrect
                ? `<button type="button" class="btn-secondary" data-cash-action="correct" data-target-action-id="${targetActionId}">Bestätigten Cashstand korrigieren</button>`
                : '';
        return `
            <article data-cash-status="${escapeHtml(status.cashStatus)}" style="padding: 0.8rem 0; border-top: 1px solid rgba(0,0,0,0.12);">
                <div><strong>${label}</strong></div>
                <div><strong>Zielverkauf:</strong> ${targetActionId}</div>
                <div><strong>Nettoerlös:</strong> ${net} € · <strong>bestätigter Cashstand:</strong> ${cashBalance}</div>
                ${evidence}${correction}
                <div class="reconciliation-actions">${action}</div>
            </article>`;
    }).join('');
    const pendingCount = statuses.filter(status => status.isPending).length;
    const legacyCount = statuses.filter(status => status.isLegacy).length;
    const summary = [
        pendingCount > 0
            ? `${pendingCount} Verkauf/Verkäufe mit offener manueller Cashbuchung.`
            : 'Kein offener manueller Cashrückstand.',
        legacyCount > 0
            ? `${legacyCount} Altverkauf/Altverkäufe ohne dokumentierten Cashstatus; operativ abgeschlossen, aber nicht als cashbestätigt ausgewiesen.`
            : ''
    ].filter(Boolean).join(' ');
    return `
        <h3>Cashstatus der Realverkäufe</h3>
        <p>${summary}</p>
        ${rows}`;
}

export function renderReconciliationCashStatuses(container, statuses = [], options = {}) {
    if (!container) return;
    container.innerHTML = buildReconciliationCashStatusesHtml(statuses, options);
}
