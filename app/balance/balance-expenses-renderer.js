/**
 * Module: Balance Expenses Renderer
 * Purpose: DOM rendering helpers for the expenses check.
 */
"use strict";

import { computeSpent, sortExpenseEntries, sumMonthProfiles } from './balance-expenses-metrics.js';

export const EXPENSE_MONTHS = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function setBudgetStatusClass(el, actual, target) {
    el.classList.remove('budget-ok', 'budget-warn', 'budget-bad');
    if (target <= 0) return;
    if (actual <= target) {
        el.classList.add('budget-ok');
    } else if (actual <= target * 1.05) {
        el.classList.add('budget-warn');
    } else {
        el.classList.add('budget-bad');
    }
}

export function renderExpensesYearSelect({ select, years, activeYear, doc = globalThis.document }) {
    if (!select) return;
    select.replaceChildren();
    years.forEach(year => {
        const option = doc.createElement('option');
        option.value = String(year);
        option.textContent = String(year);
        select.appendChild(option);
    });
    select.value = String(activeYear);
}

export function renderExpensesSummary({ refs, stats, annualBudget, monthlyBudget, formatCurrency }) {
    if (!refs) return;
    const safeAnnualBudget = Number.isFinite(annualBudget) ? annualBudget : 0;
    const safeMonthlyBudget = Number.isFinite(monthlyBudget) ? monthlyBudget : 0;

    if (refs.annualBudget) {
        refs.annualBudget.textContent = safeAnnualBudget > 0 ? formatCurrency(safeAnnualBudget) : '—';
    }
    if (refs.monthlyBudget) {
        refs.monthlyBudget.textContent = safeMonthlyBudget > 0
            ? `Monatsbudget: ${formatCurrency(safeMonthlyBudget)}`
            : 'Monatsbudget: —';
    }
    if (refs.annualUsed) {
        refs.annualUsed.textContent = safeAnnualBudget > 0
            ? `Verbraucht: ${formatCurrency(stats.annualUsed)}`
            : 'Verbraucht: —';
    }
    if (refs.annualRemaining) {
        refs.annualRemaining.textContent = safeAnnualBudget > 0
            ? formatCurrency(Math.max(0, stats.annualRemaining))
            : '—';
    }
    if (refs.annualForecast) {
        refs.annualForecast.textContent = stats.annualForecast > 0 ? formatCurrency(stats.annualForecast) : '—';
        setBudgetStatusClass(refs.annualForecast, stats.annualForecast, safeAnnualBudget);
    }
    if (refs.forecastSub) {
        if (stats.annualForecast > 0) {
            const baseLabel = stats.monthsWithData >= 2 ? 'Median/Monat' : 'Ø/Monat';
            const baseValue = stats.monthsWithData >= 2 ? stats.medianMonthly : stats.avgMonthly;
            refs.forecastSub.textContent = `${baseLabel}: ${formatCurrency(baseValue)} · Datenmonate: ${stats.monthsWithData}/12`;
        } else {
            refs.forecastSub.textContent = 'Ø/Monat: —';
        }
    }
    if (refs.ytdValue) {
        refs.ytdValue.textContent = stats.ytdUsed > 0 ? formatCurrency(stats.ytdUsed) : '—';
        setBudgetStatusClass(refs.ytdValue, stats.ytdUsed, stats.ytdBudget);
    }
    if (refs.ytdSub) {
        refs.ytdSub.textContent = stats.ytdBudget > 0
            ? `Soll: ${formatCurrency(stats.ytdBudget)} · Δ ${formatCurrency(stats.ytdDelta)}`
            : 'Soll: —';
    }
}

export function renderExpensesTableStructure({ host, profiles, doc = globalThis.document }) {
    if (!host) return;
    const table = doc.createElement('table');
    table.className = 'expenses-table';

    const thead = doc.createElement('thead');
    const headerRow = doc.createElement('tr');
    const monthHead = doc.createElement('th');
    monthHead.textContent = 'Monat';
    headerRow.appendChild(monthHead);

    profiles.forEach(profile => {
        const th = doc.createElement('th');
        th.textContent = profile.name || profile.profileId;
        headerRow.appendChild(th);
    });

    const totalHead = doc.createElement('th');
    totalHead.textContent = 'Gesamt';
    headerRow.appendChild(totalHead);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = doc.createElement('tbody');
    for (let m = 1; m <= 12; m++) {
        const tr = doc.createElement('tr');
        const monthCell = doc.createElement('td');
        monthCell.className = 'month-cell';
        monthCell.textContent = EXPENSE_MONTHS[m - 1];
        tr.appendChild(monthCell);

        profiles.forEach(profile => {
            const td = doc.createElement('td');
            td.className = 'profile-cell';
            td.dataset.month = String(m);
            td.dataset.profile = profile.profileId;

            const inner = doc.createElement('div');
            inner.className = 'profile-cell-inner';

            const value = doc.createElement('div');
            value.className = 'expense-value';
            value.dataset.role = 'value';
            value.textContent = '—';

            const actions = doc.createElement('div');
            actions.className = 'expense-actions';

            const importBtn = doc.createElement('button');
            importBtn.type = 'button';
            importBtn.className = 'btn btn-utility btn-sm';
            importBtn.dataset.action = 'import';
            importBtn.dataset.month = String(m);
            importBtn.dataset.profile = profile.profileId;
            importBtn.textContent = '📥';
            importBtn.title = 'CSV importieren';
            importBtn.ariaLabel = 'CSV importieren';

            const detailBtn = doc.createElement('button');
            detailBtn.type = 'button';
            detailBtn.className = 'btn btn-utility btn-sm';
            detailBtn.dataset.action = 'details';
            detailBtn.dataset.month = String(m);
            detailBtn.dataset.profile = profile.profileId;
            detailBtn.textContent = '🔍';
            detailBtn.title = 'Details anzeigen';
            detailBtn.ariaLabel = 'Details anzeigen';

            const deleteBtn = doc.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-utility btn-sm';
            deleteBtn.dataset.action = 'delete';
            deleteBtn.dataset.month = String(m);
            deleteBtn.dataset.profile = profile.profileId;
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = 'Monatsdaten löschen';
            deleteBtn.ariaLabel = 'Monatsdaten löschen';
            deleteBtn.classList.add('btn-hidden');
            deleteBtn.tabIndex = -1;
            deleteBtn.ariaHidden = 'true';

            actions.append(importBtn, detailBtn, deleteBtn);
            inner.append(value, actions);
            td.appendChild(inner);
            tr.appendChild(td);
        });

        const totalCell = doc.createElement('td');
        totalCell.className = 'total-cell';
        totalCell.dataset.monthTotal = String(m);
        const totalValue = doc.createElement('div');
        totalValue.className = 'expense-value';
        totalValue.dataset.role = 'total';
        totalValue.textContent = '—';
        totalCell.appendChild(totalValue);
        tr.appendChild(totalCell);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    host.replaceChildren(table);
}

export function refreshExpensesTableValues({ host, yearData, profileIds, monthlyBudget, formatCurrency }) {
    if (!host) return;
    for (let month = 1; month <= 12; month++) {
        const monthData = yearData?.months?.[String(month)] || { profiles: {} };
        let monthTotal = 0;

        profileIds.forEach(profileId => {
            const profileData = monthData.profiles?.[profileId] || null;
            const categories = profileData?.categories || {};
            const { spent } = computeSpent(categories);
            monthTotal += spent;

            const cell = host.querySelector(`[data-month="${month}"][data-profile="${profileId}"] [data-role="value"]`);
            if (cell) cell.textContent = spent > 0 ? formatCurrency(spent) : '—';
            const deleteButton = host.querySelector(`[data-month="${month}"][data-profile="${profileId}"] [data-action="delete"]`);
            if (deleteButton) {
                const hasProfileData = Boolean(profileData);
                deleteButton.classList[hasProfileData ? 'remove' : 'add']('btn-hidden');
                deleteButton.tabIndex = hasProfileData ? 0 : -1;
                deleteButton.ariaHidden = hasProfileData ? 'false' : 'true';
            }
        });

        const totalCell = host.querySelector(`[data-month-total="${month}"] [data-role="total"]`);
        if (totalCell) {
            totalCell.textContent = monthTotal > 0 ? formatCurrency(monthTotal) : '—';
            setBudgetStatusClass(totalCell, monthTotal, monthlyBudget || 0);
        }
    }
}

export function renderExpensesDetails({ refs, monthName, profileName, categories, doc = globalThis.document, formatCurrency }) {
    if (!refs?.detailDialog) return;
    const entries = sortExpenseEntries(categories);

    if (refs.detailTitle) {
        refs.detailTitle.textContent = `${monthName} · ${profileName}`;
    }

    if (refs.detailBody) {
        refs.detailBody.replaceChildren();
        if (!entries.length) {
            const empty = doc.createElement('div');
            empty.className = 'expense-empty';
            empty.textContent = 'Keine Kategorien hinterlegt.';
            refs.detailBody.appendChild(empty);
        } else {
            const topWrap = doc.createElement('div');
            topWrap.className = 'expense-top';
            const topTitle = doc.createElement('div');
            topTitle.className = 'expense-top-title';
            topTitle.textContent = 'Top 3 Kategorien';
            topWrap.appendChild(topTitle);
            const topList = doc.createElement('div');
            topList.className = 'expense-top-list';
            entries.slice(0, 3).forEach(entry => {
                const item = doc.createElement('div');
                item.className = 'expense-top-item';
                const name = doc.createElement('span');
                name.className = 'expense-top-name';
                name.textContent = entry.name;
                const value = doc.createElement('span');
                value.className = 'expense-top-value';
                value.textContent = formatCurrency(entry.value);
                item.append(name, value);
                topList.appendChild(item);
            });
            topWrap.appendChild(topList);
            refs.detailBody.appendChild(topWrap);

            const list = doc.createElement('table');
            list.className = 'expense-detail-table';
            const tbody = doc.createElement('tbody');
            entries.forEach(entry => {
                const row = doc.createElement('tr');
                const name = doc.createElement('td');
                name.textContent = entry.name;
                const value = doc.createElement('td');
                value.textContent = formatCurrency(entry.value);
                value.className = 'expense-detail-value';
                row.append(name, value);
                tbody.appendChild(row);
            });
            list.appendChild(tbody);
            refs.detailBody.appendChild(list);
        }
    }

    refs.detailDialog.showModal();
}

