// @ts-check
import { UIUtils } from './balance-utils.js';
import { StorageManager } from './balance-storage.js';
import { readWealthHistory } from '../../types/wealth-history-contract.js';
import { prepareWealthHistoryMetrics } from './balance-wealth-history-metrics.js';

const EMPTY = 'Noch keine Stände erfasst. Nutzen Sie „Stand jetzt erfassen“. Automatische Jahresabschlussstände beginnen mit dem Abschlussjahr 2026.';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const euro = value => escape(UIUtils.formatCurrency(value));
const dateLabel = value => value.split('-').reverse().join('.');

function chartMarkup(rows) {
    const width = Math.max(640, 110 + rows.length * 100);
    const baseline = 260;
    const plotHeight = 210;
    const maximum = rows.reduce((max, row) => Math.max(max, row.total), 1);
    // Erst normieren, dann multiplizieren: auch sehr große gültige Beträge bleiben endlich.
    const y = value => baseline - (value / maximum) * plotHeight;
    const axis = [0, 0.25, 0.5, 0.75, 1].map(fraction => {
        const amount = maximum * fraction;
        return `<line x1="100" x2="${width - 10}" y1="${y(amount)}" y2="${y(amount)}" class="wealth-grid"/><text x="94" y="${y(amount) + 4}" text-anchor="end">${euro(amount)}</text>`;
    }).join('');
    const bars = rows.map((row, index) => {
        const x = 125 + index * 100;
        const segments = row.segments.map(segment => `<rect class="wealth-${segment.key}" x="${x}" y="${y(segment.upper)}" width="44" height="${(segment.value / maximum) * plotHeight}"/>`).join('');
        const dashed = row.reason === 'manual' ? ' stroke-dasharray="4 3"' : '';
        return `<g><title>${escape(dateLabel(row.asOf))}: ${row.label}, Summe ${euro(row.total)}</title>${segments}<rect class="wealth-outline" x="${x}" y="${y(row.total)}" width="44" height="${(row.total / maximum) * plotHeight}"${dashed}/><text x="${x + 22}" y="${baseline + 20}" text-anchor="middle">${dateLabel(row.asOf)}</text><text x="${x + 22}" y="${baseline + 40}" text-anchor="middle">${row.marker} ${row.label}</text></g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 325" style="min-width:${width}px" role="img" aria-labelledby="wealthChartTitle" aria-describedby="wealthChartDesc"><title id="wealthChartTitle">Vermögensverlauf in nominalen Euro</title><desc id="wealthChartDesc">Gestapelte Säulen für Liquidität, Geldmarkt-ETF und Aktien-ETF. Jahresabschluss: Quadrat und durchgezogener Rahmen. Unterjährig: Raute und gestrichelter Rahmen. Alle Werte und beide Teildepots stehen in der folgenden Tabelle.</desc><text x="100" y="20">Euro (€)</text>${axis}${bars}</svg>`;
}

function tableMarkup(rows) {
    const headers = ['Datum', 'Anlass', 'Liquidität (Tagesgeld)', 'Geldmarkt-ETF', 'Aktien-ETF', 'Alt-Depot', 'Neu-Depot', 'Summe'];
    return `<table><caption>Erfasste Vermögensstände in nominalen Euro</caption><thead><tr>${headers.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${dateLabel(row.asOf)}</th><td>${row.marker} ${row.label}</td>${['tagesgeld', 'geldmarktEtf', 'aktienEtf', 'depotwertAlt', 'depotwertNeu', 'total'].map(key => `<td>${euro(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

// Sichtbarkeit gehört ausschließlich zum DOM, weder zum Profil noch zum Export.
const displayErrors = new WeakMap();

function clearDetails(dom) {
    if (dom.chart) dom.chart.innerHTML = '';
    if (dom.table) dom.table.innerHTML = '';
    if (dom.hint) dom.hint.textContent = '';
}

export function initializeBalanceWealthHistory(dom, loadState = () => StorageManager.loadState()) {
    if (dom?.status) dom.status.textContent = '';
    return refreshBalanceWealthHistory(dom, loadState);
}

/** Inaktiv nur validieren/zählen/datieren; aktiv jede Datenbasis vollständig ersetzen. */
export function renderBalanceWealthHistory(dom, state, error = null) {
    if (!dom) return false;
    clearDetails(dom);
    if (dom.count) dom.count.textContent = '';
    if (dom.date) dom.date.textContent = '';
    if (dom.status && dom.status.textContent === displayErrors.get(dom)) dom.status.textContent = '';
    displayErrors.delete(dom);
    try {
        if (error) throw error;
        const history = readWealthHistory(state);
        if (dom.count) dom.count.textContent = history.entries.length
            ? `${history.entries.length} ${history.entries.length === 1 ? 'Stand' : 'Stände'}` : '';
        const latest = history.entries.reduce((max, entry) => entry.asOf > max ? entry.asOf : max, '');
        if (dom.date) dom.date.textContent = latest
            ? `Zuletzt erfasst am ${dateLabel(latest)}` : 'Noch keine Stände erfasst';
        if (!dom.panel?.classList.contains('active')) return true;
        const rows = prepareWealthHistoryMetrics(state);
        if (dom.hint) dom.hint.textContent = rows.length ? '' : EMPTY;
        if (rows.length) {
            if (dom.chart) dom.chart.innerHTML = chartMarkup(rows);
            if (dom.table) dom.table.innerHTML = tableMarkup(rows);
        }
        return true;
    } catch (failure) {
        clearDetails(dom);
        if (dom.count) dom.count.textContent = '';
        if (dom.date) dom.date.textContent = '';
        const text = `Vermögensverlauf kann nicht angezeigt werden: ${failure.message || failure}`;
        if (dom.status) dom.status.textContent = text;
        else if (dom.hint) dom.hint.textContent = text;
        displayErrors.set(dom, text);
        return false;
    }
}

export function refreshBalanceWealthHistory(dom, loadState = () => StorageManager.loadState()) {
    try { return renderBalanceWealthHistory(dom, loadState()); }
    catch (error) { return renderBalanceWealthHistory(dom, null, error); }
}
