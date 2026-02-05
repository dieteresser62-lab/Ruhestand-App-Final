/**
 * Module: Balance Expenses (Ausgaben-Check)
 * Purpose: Monatliche Kategorien-Importe verwalten und gegen Budget prüfen.
 * Usage: Initialisiert in balance-main.js, arbeitet rein im Browser (localStorage).
 */
"use strict";

import { UIUtils } from './balance-utils.js';
import { UIRenderer } from './balance-renderer.js';
import { loadProfilverbundProfiles } from './profilverbund-balance.js';

const STORAGE_KEY = 'balance_expenses_v1';
const MONTHS = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

let dom = null;
const state = {
    year: new Date().getFullYear(),
    monthlyBudget: 0,
    annualBudget: 0,
    profileIds: []
};
let pendingImport = null;

function loadStore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { version: 1, years: {} };
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return { version: 1, years: {} };
        if (!parsed.years || typeof parsed.years !== 'object') parsed.years = {};
        return parsed;
    } catch {
        return { version: 1, years: {} };
    }
}

function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getYearData(store, year) {
    const key = String(year);
    if (!store.years[key]) store.years[key] = { months: {} };
    if (!store.years[key].months) store.years[key].months = {};
    return store.years[key];
}

function getMonthData(yearData, month) {
    const key = String(month);
    if (!yearData.months[key]) yearData.months[key] = { profiles: {} };
    if (!yearData.months[key].profiles) yearData.months[key].profiles = {};
    return yearData.months[key];
}

function getProfiles() {
    const profiles = loadProfilverbundProfiles();
    if (profiles.length > 0) return profiles;
    return [{ profileId: 'default', name: 'Profil', inputs: {} }];
}

function splitCsvLine(line, delimiter) {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === delimiter && !inQuotes) {
            cells.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    cells.push(current);
    return cells;
}

function detectDelimiter(line) {
    const candidates = [';', '\t', ','];
    let best = { delim: ';', count: -1 };
    candidates.forEach(delim => {
        const count = line.split(delim).length - 1;
        if (count > best.count) best = { delim, count };
    });
    return best.delim;
}

function parseAmount(raw) {
    if (!raw) return NaN;
    const cleaned = String(raw).replace(/€/g, '').trim();
    if (!cleaned) return NaN;
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalized = cleaned.replace(/\s/g, '');
    if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else {
            normalized = normalized.replace(/,/g, '');
        }
    } else if (lastComma !== -1) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (lastDot !== -1) {
        const parts = normalized.split('.');
        const tail = parts[parts.length - 1];
        if (tail.length === 3) {
            normalized = normalized.replace(/\./g, '');
        }
    }
    const num = parseFloat(normalized);
    return Number.isFinite(num) ? num : NaN;
}

function parseCategoryCsv(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Leere CSV-Datei.');
    const delimiter = detectDelimiter(lines[0]);
    const header = splitCsvLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
    let categoryIndex = header.findIndex(h => h.includes('kategorie'));
    let amountIndex = header.findIndex(h => h.includes('betrag'));
    if (categoryIndex === -1 || amountIndex === -1) {
        if (header.length >= 2) {
            categoryIndex = 0;
            amountIndex = 1;
        } else {
            throw new Error('CSV-Header braucht Spalten wie "Kategorie" und "Betrag".');
        }
    }

    const categories = {};
    for (let i = 1; i < lines.length; i++) {
        const row = splitCsvLine(lines[i], delimiter);
        if (!row.length) continue;
        const category = (row[categoryIndex] || '').trim();
        const amount = parseAmount(row[amountIndex]);
        if (!category || !Number.isFinite(amount)) continue;
        categories[category] = (categories[category] || 0) + amount;
    }

    if (Object.keys(categories).length === 0) {
        throw new Error('Keine gültigen Kategorien gefunden.');
    }

    return categories;
}

function computeSpent(categories) {
    const values = Object.values(categories || {});
    const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
    const spent = sum < 0 ? -sum : sum;
    return { sum, spent };
}

function formatCurrency(value) {
    return UIUtils.formatCurrency(Math.abs(value || 0));
}

function updateSummary() {
    if (!dom?.expenses) return;
    const annualBudget = Number.isFinite(state.annualBudget) ? state.annualBudget : 0;
    const monthlyBudget = Number.isFinite(state.monthlyBudget) ? state.monthlyBudget : 0;
    if (dom.expenses.annualBudget) {
        dom.expenses.annualBudget.textContent = annualBudget > 0 ? UIUtils.formatCurrency(annualBudget) : '—';
    }
    if (dom.expenses.monthlyBudget) {
        dom.expenses.monthlyBudget.textContent = monthlyBudget > 0
            ? `Monatsbudget: ${UIUtils.formatCurrency(monthlyBudget)}`
            : 'Monatsbudget: —';
    }

    const { annualUsed, annualRemaining } = computeAnnualTotals();
    if (dom.expenses.annualUsed) {
        dom.expenses.annualUsed.textContent = annualBudget > 0
            ? `Verbraucht: ${UIUtils.formatCurrency(annualUsed)}`
            : 'Verbraucht: —';
    }
    if (dom.expenses.annualRemaining) {
        if (annualBudget > 0) {
            const remaining = Math.max(0, annualRemaining);
            dom.expenses.annualRemaining.textContent = UIUtils.formatCurrency(remaining);
        } else {
            dom.expenses.annualRemaining.textContent = '—';
        }
    }
}

function computeAnnualTotals() {
    const store = loadStore();
    const yearData = getYearData(store, state.year);
    let annualUsed = 0;
    for (let month = 1; month <= 12; month++) {
        const monthData = getMonthData(yearData, month);
        const monthTotal = sumMonthProfiles(monthData);
        annualUsed += monthTotal;
    }
    const annualRemaining = (state.annualBudget || 0) - annualUsed;
    return { annualUsed, annualRemaining };
}

function sumMonthProfiles(monthData) {
    const profiles = monthData?.profiles || {};
    return Object.values(profiles).reduce((acc, entry) => {
        const { spent } = computeSpent(entry?.categories || {});
        return acc + spent;
    }, 0);
}

function renderTable() {
    if (!dom?.expenses?.table) return;
    const profiles = getProfiles();
    const profileIds = profiles.map(p => p.profileId);
    const needsRebuild = profileIds.join('|') !== state.profileIds.join('|');

    if (!needsRebuild) {
        refreshTableValues();
        return;
    }

    state.profileIds = profileIds;
    const table = document.createElement('table');
    table.className = 'expenses-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const monthHead = document.createElement('th');
    monthHead.textContent = 'Monat';
    headerRow.appendChild(monthHead);

    profiles.forEach(profile => {
        const th = document.createElement('th');
        th.textContent = profile.name || profile.profileId;
        headerRow.appendChild(th);
    });

    const totalHead = document.createElement('th');
    totalHead.textContent = 'Gesamt';
    headerRow.appendChild(totalHead);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let m = 1; m <= 12; m++) {
        const tr = document.createElement('tr');
        const monthCell = document.createElement('td');
        monthCell.className = 'month-cell';
        monthCell.textContent = MONTHS[m - 1];
        tr.appendChild(monthCell);

        profiles.forEach(profile => {
            const td = document.createElement('td');
            td.className = 'profile-cell';
            td.dataset.month = String(m);
            td.dataset.profile = profile.profileId;

            const value = document.createElement('div');
            value.className = 'expense-value';
            value.dataset.role = 'value';
            value.textContent = '—';

            const actions = document.createElement('div');
            actions.className = 'expense-actions';

            const importBtn = document.createElement('button');
            importBtn.type = 'button';
            importBtn.className = 'btn btn-utility btn-sm';
            importBtn.dataset.action = 'import';
            importBtn.dataset.month = String(m);
            importBtn.dataset.profile = profile.profileId;
            importBtn.textContent = 'CSV';

            const detailBtn = document.createElement('button');
            detailBtn.type = 'button';
            detailBtn.className = 'btn btn-utility btn-sm';
            detailBtn.dataset.action = 'details';
            detailBtn.dataset.month = String(m);
            detailBtn.dataset.profile = profile.profileId;
            detailBtn.textContent = 'Details';

            actions.append(importBtn, detailBtn);
            td.append(value, actions);
            tr.appendChild(td);
        });

        const totalCell = document.createElement('td');
        totalCell.className = 'total-cell';
        totalCell.dataset.monthTotal = String(m);
        const totalValue = document.createElement('div');
        totalValue.className = 'expense-value';
        totalValue.dataset.role = 'total';
        totalValue.textContent = '—';
        totalCell.appendChild(totalValue);
        tr.appendChild(totalCell);

        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    dom.expenses.table.replaceChildren(table);
    refreshTableValues();
}

function refreshTableValues() {
    if (!dom?.expenses?.table) return;
    const store = loadStore();
    const yearData = getYearData(store, state.year);

    for (let month = 1; month <= 12; month++) {
        const monthData = getMonthData(yearData, month);
        let monthTotal = 0;

        state.profileIds.forEach(profileId => {
            const profileData = monthData.profiles?.[profileId] || null;
            const categories = profileData?.categories || {};
            const { spent } = computeSpent(categories);
            monthTotal += spent;

            const cell = dom.expenses.table.querySelector(`[data-month="${month}"][data-profile="${profileId}"] [data-role="value"]`);
            if (cell) cell.textContent = spent > 0 ? formatCurrency(spent) : '—';
        });

        const totalCell = dom.expenses.table.querySelector(`[data-month-total="${month}"] [data-role="total"]`);
        if (totalCell) {
            totalCell.textContent = monthTotal > 0 ? formatCurrency(monthTotal) : '—';
            totalCell.classList.remove('budget-ok', 'budget-warn', 'budget-bad');
            if (state.monthlyBudget > 0) {
                if (monthTotal <= state.monthlyBudget) {
                    totalCell.classList.add('budget-ok');
                } else if (monthTotal <= state.monthlyBudget * 1.1) {
                    totalCell.classList.add('budget-warn');
                } else {
                    totalCell.classList.add('budget-bad');
                }
            }
        }
    }

    updateSummary();
}

function openDetails(month, profileId) {
    if (!dom?.expenses?.detailDialog) return;
    const store = loadStore();
    const yearData = getYearData(store, state.year);
    const monthData = getMonthData(yearData, month);
    const profileData = monthData.profiles?.[profileId];
    const categories = profileData?.categories || {};
    const entries = Object.entries(categories)
        .map(([name, value]) => ({ name, value: Number(value) || 0 }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const title = dom.expenses.detailTitle;
    if (title) {
        const profileName = getProfiles().find(p => p.profileId === profileId)?.name || profileId;
        title.textContent = `${MONTHS[month - 1]} · ${profileName}`;
    }

    if (dom.expenses.detailBody) {
        dom.expenses.detailBody.replaceChildren();
        if (!entries.length) {
            const empty = document.createElement('div');
            empty.className = 'expense-empty';
            empty.textContent = 'Keine Kategorien hinterlegt.';
            dom.expenses.detailBody.appendChild(empty);
        } else {
            const list = document.createElement('table');
            list.className = 'expense-detail-table';
            const tbody = document.createElement('tbody');
            entries.forEach(entry => {
                const row = document.createElement('tr');
                const name = document.createElement('td');
                name.textContent = entry.name;
                const value = document.createElement('td');
                value.textContent = formatCurrency(entry.value);
                value.className = 'expense-detail-value';
                row.append(name, value);
                tbody.appendChild(row);
            });
            list.appendChild(tbody);
            dom.expenses.detailBody.appendChild(list);
        }
    }

    dom.expenses.detailDialog.showModal();
}

async function handleCsvImport(file, month, profileId) {
    const text = await file.text();
    const categories = parseCategoryCsv(text);

    const store = loadStore();
    const yearData = getYearData(store, state.year);
    const monthData = getMonthData(yearData, month);
    if (!monthData.profiles) monthData.profiles = {};
    monthData.profiles[profileId] = {
        categories,
        updatedAt: new Date().toISOString()
    };
    saveStore(store);

    refreshTableValues();
    UIRenderer.toast('CSV importiert.');
}

function handleTableClick(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const month = Number(button.dataset.month);
    const profileId = button.dataset.profile;
    if (!month || !profileId) return;

    if (action === 'import') {
        pendingImport = { month, profileId };
        dom.expenses.csvInput.click();
        return;
    }

    if (action === 'details') {
        openDetails(month, profileId);
    }
}

function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !pendingImport) return;
    const { month, profileId } = pendingImport;
    pendingImport = null;

    handleCsvImport(file, month, profileId).catch(err => {
        UIRenderer.handleError(err);
    }).finally(() => {
        e.target.value = '';
    });
}

function bindEvents() {
    if (dom?.expenses?.table) {
        dom.expenses.table.addEventListener('click', handleTableClick);
    }
    if (dom?.expenses?.csvInput) {
        dom.expenses.csvInput.addEventListener('change', handleFileChange);
    }
    if (dom?.expenses?.detailClose) {
        dom.expenses.detailClose.addEventListener('click', () => dom.expenses.detailDialog.close());
    }
    if (dom?.expenses?.detailDialog) {
        dom.expenses.detailDialog.addEventListener('click', (event) => {
            if (event.target === dom.expenses.detailDialog) dom.expenses.detailDialog.close();
        });
    }
}

export function initExpensesTab(domRefs) {
    dom = domRefs;
    bindEvents();
    renderTable();
    updateSummary();
}

export function updateExpensesBudget({ monthlyBudget, annualBudget }) {
    state.monthlyBudget = Number.isFinite(monthlyBudget) ? monthlyBudget : 0;
    state.annualBudget = Number.isFinite(annualBudget) ? annualBudget : 0;
    renderTable();
}
