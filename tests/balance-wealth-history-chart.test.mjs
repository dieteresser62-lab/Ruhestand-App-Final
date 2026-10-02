import { prepareWealthHistoryMetrics } from '../app/balance/balance-wealth-history-metrics.js';
import { renderBalanceWealthHistory, refreshBalanceWealthHistory } from '../app/balance/balance-wealth-history-renderer.js';
import { createAnnualWealthHistoryEntry, createManualWealthHistoryEntry } from '../types/wealth-history-contract.js';
import { UIUtils } from '../app/balance/balance-utils.js';

console.log('--- Vermögensverlauf: Aufbereitung und SVG ---');
const source = { tagesgeld: 12000, geldmarktEtf: 23000, depotwertAlt: 34000, depotwertNeu: 45000 };
const annual = createAnnualWealthHistoryEntry(source, 2026);
const manual = createManualWealthHistoryEntry(source, '2026-12-31');
const earlier = createManualWealthHistoryEntry({ ...source, tagesgeld: 1 }, '2026-06-01');
const state = { wealthHistory: { schemaVersion: 1, entries: [manual, annual, earlier] } };
const original = JSON.stringify(state);
const rows = prepareWealthHistoryMetrics(state);
assertEqual(rows.map(row => row.id).join(','), 'manual:2026-06-01,annual:2026,manual:2026-12-31', 'Chronologisch; Jahresabschluss vor manuell am gleichen Tag');
assertEqual(JSON.stringify(state), original, 'Aufbereitung verändert keine gespeicherten Werte oder Reihenfolgen');
assertEqual(rows[1].segments.length, 3, 'Genau drei Stapelgruppen');
assertEqual(rows[1].segments.map(segment => segment.value).join(','), '12000,23000,79000', 'Alt und Neu bilden eine Aktiengruppe');
assertEqual(rows[1].segments.map(segment => segment.lower).join(','), '0,12000,35000', 'Untere Stapelgrenzen entsprechen Quellwerten');
assertEqual(rows[1].segments.map(segment => segment.upper).join(','), '12000,35000,114000', 'Obere Grenzen ergeben die Summe');
assertEqual(rows[1].total, 114000, 'Summe enthält keine doppelt gestapelten Teildepots');

const dom = { chart: { innerHTML: '' }, table: { innerHTML: '' }, hint: { textContent: '' } };
assert(renderBalanceWealthHistory(dom, state), 'Unsortierter Verlauf wird dargestellt');
const svg = dom.chart.innerHTML;
assert(svg.includes('role="img"') && svg.includes('aria-labelledby='), 'SVG hat zugänglichen Namen und Beschreibung');
assert(svg.includes('Euro (€)') && svg.includes('31.12.2026'), 'Datum und Euro-Skala sichtbar');
assertEqual((svg.match(/class="wealth-tagesgeld"/g) || []).length, 3, 'Pro Stand genau ein Liquiditätssegment');
assertEqual((svg.match(/class="wealth-aktienEtf"/g) || []).length, 3, 'Teildepots nicht zusätzlich gestapelt');
assert(svg.includes('■ Jahresabschluss') && svg.includes('◇ Manuell') && svg.includes('stroke-dasharray="4 3"'), 'Anlass mit Text, Form und Rahmen');
assert(dom.table.innerHTML.includes('<caption>') && dom.table.innerHTML.includes('scope="col"') && dom.table.innerHTML.includes('scope="row"'), 'Datentabelle hat Caption und semantische Überschriften');
for (const value of [12000, 23000, 34000, 45000, 79000, 114000]) {
    assert(dom.table.innerHTML.includes(UIUtils.formatCurrency(value)), `Quellwert ${value} in zugänglicher Tabelle`);
}
assert(dom.table.innerHTML.includes('Alt-Depot') && dom.table.innerHTML.includes('Neu-Depot'), 'Beide Teildepots ausdrücklich benannt');

for (const values of [source, { tagesgeld: 0, geldmarktEtf: 0, depotwertAlt: 0, depotwertNeu: 0 },
    { tagesgeld: 1e300, geldmarktEtf: 2e300, depotwertAlt: 3e300, depotwertNeu: 4e300 }]) {
    const entry = createManualWealthHistoryEntry(values, '2026-10-01');
    assert(renderBalanceWealthHistory(dom, { wealthHistory: { schemaVersion: 1, entries: [entry] } }), 'Einzelstand, Nullstand und sehr große endliche Werte gültig');
    assert(!/NaN|Infinity|undefined/.test(dom.chart.innerHTML), 'SVG enthält keine ungültigen Werte');
    const coordinates = [...dom.chart.innerHTML.matchAll(/\s(?:x|y|width|height|x1|x2|y1|y2)="([^"]+)"/g)];
    assert(coordinates.length > 0 && coordinates.every(match => Number.isFinite(Number(match[1]))), 'Alle SVG-Koordinaten endlich');
    const heights = [...dom.chart.innerHTML.matchAll(/class="wealth-(?:tagesgeld|geldmarktEtf|aktienEtf)"[^>]+height="([^"]+)"/g)].map(match => Number(match[1]));
    const expected = entry.total === 0 ? 0 : 210;
    assert(Math.abs(heights.reduce((sum, value) => sum + value, 0) - expected) < 1e-9, 'Stapelhöhe entspricht skaliertem Gesamtwert');
}

assert(refreshBalanceWealthHistory(dom, () => ({})), 'Reload eines Legacy-Profils erfolgreich');
assertEqual(dom.chart.innerHTML, '', 'Reload ohne Verlauf entfernt das bisherige Diagramm');
assertEqual(dom.table.innerHTML, '', 'Reload ohne Verlauf entfernt die bisherige Tabelle');
assert(dom.hint.textContent.includes('Stand jetzt erfassen') && dom.hint.textContent.includes('2026'), 'Leerhinweis erklärt beide Erfassungswege');
renderBalanceWealthHistory(dom, state);
assert(renderBalanceWealthHistory(dom, { inputs: {} }), 'Import ohne Feld als leer dargestellt');
assertEqual(dom.chart.innerHTML + dom.table.innerHTML, '', 'Replace ohne Verlauf hinterlässt keine fremden Inhalte');
for (const invalid of [{ schemaVersion: 9, entries: [] }, { schemaVersion: 1, entries: [{ ...manual, total: 1 }] },
    { schemaVersion: 1, entries: [{ ...manual, reason: '<img src=x onerror=alert(1)>' }] }]) {
    renderBalanceWealthHistory(dom, state);
    assert(!renderBalanceWealthHistory(dom, { wealthHistory: invalid }), 'Beschädigter Verlauf liefert Fehlerzustand');
    assertEqual(dom.chart.innerHTML + dom.table.innerHTML, '', 'Fehlerzustand entfernt alte Chart- und Tabellenwerte');
    assert(dom.hint.textContent.includes('kann nicht angezeigt werden'), 'Fehler ist sichtbar');
}
assert(!refreshBalanceWealthHistory(dom, () => { throw new Error('<script>beschädigt</script>'); }), 'Ladefehler wird dargestellt');
assert(dom.hint.textContent.includes('<script>beschädigt</script>'), 'Fehlertext wird als Text statt HTML gesetzt');
