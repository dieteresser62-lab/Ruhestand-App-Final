// @ts-check
import { UIUtils } from './balance-utils.js';
import { PersistenceFacade } from '../shared/persistence-facade.js';
import { loadExpensesStoreResult } from './balance-expenses-storage.js';
import { prepareExpensesHistoryMetrics } from './balance-expenses-metrics.js';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const euro = value => escape(UIUtils.formatCurrency(value));
const yearLabel = row => `${row.year}${row.isCurrentPartialYear ? ' – laufendes Teiljahr' : ''}`;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const diagnoses = {
    'expenses-store-read-failed': 'Der gespeicherte Ausgabenbereich konnte nicht gelesen werden.',
    'expenses-store-json-invalid': 'Die gespeicherten Ausgabendaten enthalten kein gueltiges JSON.',
    'expenses-store-root-invalid': 'Die gespeicherten Ausgabendaten haben keinen gueltigen Objektaufbau.',
    'expenses-store-version-unsupported': 'Die gespeicherten Ausgabendaten verwenden eine nicht unterstuetzte Version.',
    'expenses-store-years-invalid': 'Die gespeicherten Ausgabenjahre haben keinen gueltigen Objektaufbau.'
};

// Die Speicherprüfung erkennt Wurzelfehler; Untercontainer hier ausschließlich lesen.
function validateContainers(store) {
    if (!isRecord(store?.years)) throw new Error('structure');
    for (const year of Object.values(store.years)) {
        if (!isRecord(year) || (year.months !== undefined && !isRecord(year.months))) throw new Error('structure');
        for (const month of Object.values(year.months || {})) {
            if (!isRecord(month) || (month.profiles !== undefined && !isRecord(month.profiles))) throw new Error('structure');
            for (const profile of Object.values(month.profiles || {})) {
                if (!isRecord(profile) || !isRecord(profile.categories)
                    || Object.values(profile.categories).some(value =>
                        !['number', 'string'].includes(typeof value) || !Number.isFinite(Number(value)))) throw new Error('structure');
            }
        }
    }
}

function chartMarkup(rows) {
    const width = Math.max(640, 110 + rows.length * 120);
    const baseline = 260, height = 210;
    const maximum = rows.reduce((max, row) => Math.max(max, row.annualUsed), 1);
    const y = value => baseline - (value / maximum) * height;
    const axis = [0, .25, .5, .75, 1].map(fraction => {
        const amount = maximum * fraction;
        return `<line x1="100" x2="${width - 10}" y1="${y(amount)}" y2="${y(amount)}" class="wealth-grid"/><text x="94" y="${y(amount) + 4}" text-anchor="end">${euro(amount)}</text>`;
    }).join('');
    const bars = rows.map((row, index) => {
        const x = 125 + index * 120;
        return `<g><title>${escape(yearLabel(row))}: Ausgaben gesamt ${euro(row.annualUsed)}, ${row.monthsWithData} Monate mit Daten, Ø pro Monat ${euro(row.avgMonthly)}</title><rect class="expenses-year-bar" x="${x}" y="${y(row.annualUsed)}" width="44" height="${(row.annualUsed / maximum) * height}"/><text x="${x + 22}" y="280" text-anchor="middle">${row.year}</text><text x="${x + 22}" y="300" text-anchor="middle">${row.isCurrentPartialYear ? 'laufendes Teiljahr' : `${row.monthsWithData} Monate mit Daten`}</text></g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 325" style="min-width:${width}px" role="img" aria-labelledby="expensesChartTitle" aria-describedby="expensesChartDesc"><title id="expensesChartTitle">Ausgaben je Jahr in nominalen Euro</title><desc id="expensesChartDesc">Säulen zeigen tatsächliche Jahresausgaben aller gespeicherten Profile. Laufende Teiljahre sind textlich markiert. Die folgende Tabelle enthält je Jahr die Ausgaben gesamt, Monate mit Daten und Ø pro Monat. Monate mit Daten sind Monate mit positiven Ausgaben; Nullimporte zählen nicht. Für den Vergleich unvollständiger Jahre dient Ø pro Monat, ohne Hochrechnung. Historische Jahresbudgets werden nicht gespeichert.</desc><text x="100" y="20">Euro (€)</text>${axis}${bars}</svg>`;
}

function tableMarkup(rows) {
    return `<table><caption>Ausgaben je Jahr in nominalen Euro – Ø pro Monat zum Vergleich unvollständiger Jahre</caption><thead><tr>${['Jahr / Status', 'Ausgaben gesamt', 'Monate mit Daten', 'Ø pro Monat'].map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${escape(yearLabel(row))}</th><td>${euro(row.annualUsed)}</td><td>${row.monthsWithData}</td><td>${euro(row.avgMonthly)}</td></tr>`).join('')}</tbody></table>`;
}

export function renderBalanceExpensesHistory(dom, result, currentYear, backend = 'unknown') {
    if (!dom) return false;
    if (dom.chart) dom.chart.innerHTML = '';
    if (dom.table) dom.table.innerHTML = '';
    if (dom.hint) dom.hint.textContent = '';
    if (!dom.panel?.classList.contains('active')) return true;
    try {
        if (!result || result.status === 'corrupt') throw new Error('store');
        validateContainers(result.store);
        const rows = prepareExpensesHistoryMetrics(result.store, currentYear);
        if (rows.some(row => !Number.isFinite(row.annualUsed) || !Number.isFinite(row.avgMonthly))) throw new Error('amount');
        if (rows.length) {
            if (dom.chart) dom.chart.innerHTML = chartMarkup(rows);
            if (dom.table) dom.table.innerHTML = tableMarkup(rows);
        } else if (dom.hint) dom.hint.textContent = 'Noch keine Ausgabendaten vorhanden.';
        return true;
    } catch {
        // Keine Fehlermeldung aus JSON/Finanzrohdaten in die Oberfläche übernehmen.
        const diagnosis = Object.hasOwn(diagnoses, result?.error?.code)
            ? diagnoses[result.error.code] : 'Die gespeicherten Ausgabendaten sind beschädigt oder nicht lesbar.';
        if (dom.hint) dom.hint.textContent = `Ausgaben je Jahr können nicht angezeigt werden. Betroffener Datenbereich: Ausgaben-Check. Backend: ${backend}. ${diagnosis} Bitte die Recovery im Ausgaben-Check verwenden; hier werden keine Daten zurückgesetzt.`;
        return false;
    }
}

export function refreshBalanceExpensesHistory(dom, options = {}) {
    if (!dom) return false;
    let backend = 'unknown';
    try { backend = String((options.getPersistenceStatus || (() => PersistenceFacade.getPersistenceStatus()))()?.backend || 'unknown'); } catch { /* Diagnose bleibt lesbar. */ }
    try {
        return renderBalanceExpensesHistory(dom,
            (options.loadStore || (() => loadExpensesStoreResult(options.storage)))(),
            (options.now || (() => new Date()))().getFullYear(), backend);
    } catch {
        return renderBalanceExpensesHistory(dom, null, 0, backend);
    }
}
