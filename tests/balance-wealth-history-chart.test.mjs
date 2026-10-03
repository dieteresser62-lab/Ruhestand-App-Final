import { prepareWealthHistoryMetrics } from '../app/balance/balance-wealth-history-metrics.js';
import { renderBalanceWealthHistory, refreshBalanceWealthHistory, initializeBalanceWealthHistory, toggleBalanceWealthHistory, closeBalanceWealthHistory } from '../app/balance/balance-wealth-history-renderer.js';
import { createAnnualWealthHistoryEntry, createManualWealthHistoryEntry } from '../types/wealth-history-contract.js';
import { UIUtils } from '../app/balance/balance-utils.js';
import { readFileSync } from 'node:fs';

console.log('--- Vermögensverlauf: Aufbereitung und SVG ---');
const html = readFileSync(new URL('../Balance.html', import.meta.url), 'utf8');
assert(/<div id="wealthHistoryDetails" hidden>/.test(html), 'Details schon im ausgelieferten Markup geschlossen');
assert(/id="toggleWealthHistoryBtn"[^>]*type="button"[^>]*aria-expanded="false"[^>]*aria-controls="wealthHistoryDetails"/.test(html), 'Nativer Umschaltknopf mit initial geschlossenem ARIA-Vertrag');
const source = { tagesgeld: 12000, geldmarktEtf: 23000, depotwertAlt: 34000, depotwertNeu: 45000 };
const annual = createAnnualWealthHistoryEntry(source, 2026);
const manual = createManualWealthHistoryEntry(source, '2026-12-31');
const earlier = createManualWealthHistoryEntry({ ...source, tagesgeld: 1 }, '2026-06-01');
const state = { wealthHistory: { schemaVersion: 1, entries: [manual, annual, earlier] } };
const original = JSON.stringify(state);
const chartDescription = 'Gestapelte Säulen für Liquidität, Geldmarkt-ETF und Aktien-ETF. Jahresabschluss: Quadrat und durchgezogener Rahmen. Manuell: Raute und gestrichelter Rahmen. Alle Werte und beide Teildepots stehen in der folgenden Tabelle.';

function assertChartAccessibility(svg) {
    const openingTag = svg.match(/^<svg\b[^>]*>/)?.[0] || '';
    assertEqual(openingTag.match(/\srole="([^"]*)"/)?.[1], 'img', 'Das SVG hat die Rolle img');
    assertEqual(openingTag.match(/\saria-labelledby="([^"]*)"/)?.[1], 'wealthChartTitle', 'Nur der Titel benennt das SVG');
    assertEqual(openingTag.match(/\saria-describedby="([^"]*)"/)?.[1], 'wealthChartDesc', 'Die Beschreibung ist separat zugeordnet');
    const titles = [...svg.matchAll(/<title id="wealthChartTitle">([^<]*)<\/title>/g)];
    const descriptions = [...svg.matchAll(/<desc id="wealthChartDesc">([^<]*)<\/desc>/g)];
    assertEqual(titles.length, 1, 'Genau ein referenziertes Titelelement');
    assertEqual(descriptions.length, 1, 'Genau ein referenziertes Beschreibungselement');
    assertEqual(titles[0]?.[1], 'Vermögensverlauf in nominalen Euro', 'Der zugängliche Titel ist exakt erhalten');
    assertEqual(descriptions[0]?.[1], chartDescription, 'Die vollständige Langbeschreibung ist erhalten');
}

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
assertChartAccessibility(svg);
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
    assertChartAccessibility(dom.chart.innerHTML);
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


// Der geschlossene Pfad darf nicht einmal vorübergehend Inhalte erzeugen.
const documentFake = { activeElement: null };
const attributes = {};
const controlled = {
    details: { hidden: false, ownerDocument: documentFake, contains: el => el === controlled.chart },
    toggle: { textContent: '', setAttribute: (key, value) => { attributes[key] = value; },
        focus: () => { documentFake.activeElement = controlled.toggle; } },
    count: { textContent: '' }, status: { textContent: '' }, hint: { textContent: '' }
};
for (const key of ['chart', 'table']) {
    let markup = 'veraltet';
    controlled[key] = {
        get innerHTML() { return markup; },
        set innerHTML(value) {
            assert(!controlled.details.hidden || value === '', 'Geschlossen niemals SVG oder Tabelle erzeugen');
            markup = value;
        }
    };
}
let current = state;
let reads = 0;
const load = () => { reads += 1; return current; };
documentFake.activeElement = controlled.chart;
assert(initializeBalanceWealthHistory(controlled, load), 'Initialisierung schließt auch gefüllte Historie');
assert(controlled.details.hidden, 'Details initial geschlossen');
assertEqual(documentFake.activeElement, controlled.toggle, 'Programmatisches Schließen führt Detailfokus zurück');
assertEqual(attributes['aria-expanded'], 'false', 'ARIA geschlossen');
assertEqual(controlled.toggle.textContent, 'Verlauf anzeigen', 'Name geschlossen');
assertEqual(controlled.count.textContent, '3 Stände', 'Anzahl außerhalb der Details');
assertEqual(controlled.chart.innerHTML + controlled.table.innerHTML + controlled.hint.textContent, '', 'Keine Details beim Start');
assert(toggleBalanceWealthHistory(controlled, load), 'Öffnen lädt aktuelle Daten');
assert(!controlled.details.hidden && attributes['aria-expanded'] === 'true', 'Sichtbarkeit und ARIA offen');
assertEqual(controlled.toggle.textContent, 'Verlauf ausblenden', 'Name offen');
assertChartAccessibility(controlled.chart.innerHTML);
assertEqual(reads, 2, 'Öffnen liest erneut');
const outside = {};
documentFake.activeElement = outside;
closeBalanceWealthHistory(controlled);
assertEqual(documentFake.activeElement, outside, 'Fokus außerhalb wird nicht gestohlen');
current = { wealthHistory: { schemaVersion: 1, entries: [earlier] } };
assert(refreshBalanceWealthHistory(controlled, load), 'Geschlossene neue Datenbasis gültig');
assertEqual(controlled.count.textContent, '1 Stand', 'Aktuelle Anzahl ohne Darstellung');
toggleBalanceWealthHistory(controlled, load);
assert(controlled.table.innerHTML.includes('01.06.2026') && !controlled.table.innerHTML.includes('31.12.2026'), 'Wiederöffnen zeigt ausschließlich den aktuellen State');
assertEqual(JSON.stringify(state), original, 'Umschalten mutiert die Quelle nicht');
closeBalanceWealthHistory(controlled);
current = { wealthHistory: { schemaVersion: 9, entries: [] } };
assert(!refreshBalanceWealthHistory(controlled, load), 'Auch geschlossen validieren');
assert(controlled.status.textContent.includes('kann nicht angezeigt werden'), 'Geschlossener Fehler außerhalb sichtbar');
assertEqual(controlled.count.textContent, '', 'Fehler wird nicht als leere Anzahl ausgegeben');
current = {};
refreshBalanceWealthHistory(controlled, load);
assertEqual(controlled.status.textContent, '', 'Erholter State entfernt Darstellungsfehler');
assertEqual(controlled.hint.textContent, '', 'Leerhinweis bleibt geschlossen verborgen');
toggleBalanceWealthHistory(controlled, load);
assert(controlled.hint.textContent.includes('Noch keine Stände'), 'Leere Historie lässt sich öffnen');
