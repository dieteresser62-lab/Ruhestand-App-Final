import { prepareWealthHistoryMetrics } from '../app/balance/balance-wealth-history-metrics.js';
import { renderBalanceWealthHistory, refreshBalanceWealthHistory, initializeBalanceWealthHistory } from '../app/balance/balance-wealth-history-renderer.js';
import { createAnnualWealthHistoryEntry, createManualWealthHistoryEntry } from '../types/wealth-history-contract.js';
import { UIUtils } from '../app/balance/balance-utils.js';
import { readFileSync } from 'node:fs';

console.log('--- Vermögensverlauf: Aufbereitung und SVG ---');
const html = readFileSync(new URL('../Balance.html', import.meta.url), 'utf8');
const tabs = [...html.matchAll(/<button class="tab-btn(?: active)?" data-tab="([^"]+)">([^<]+)<\/button>/g)];
assertEqual(tabs.map(tab => tab[1]).join(','), 'update,settings,ausgaben,wealth', 'Genau vier Tabs in bisheriger Reihenfolge');
assertEqual(tabs[3][2], 'Auswertung', 'Vierter Tab korrekt benannt');
assert(/id="tab-update" class="tab-panel active"/.test(html), 'Nur Jahres-Update startet aktiv');
assert(/id="tab-wealth" class="tab-panel wealth-history"/.test(html), 'Verlaufspanel initial inaktiv');
assert(html.includes('aria-labelledby="evaluationTitle"'), 'Auswertung hat eine eigene Gesamtbenennung');
assert(html.indexOf('id="wealthHistoryTitle"') < html.indexOf('id="expensesHistoryTitle"'), 'Vermögensverlauf steht vor Ausgaben je Jahr');
for (const id of ['wealthHistoryChart', 'wealthHistoryTable', 'expensesHistoryChart', 'expensesHistoryTable']) {
    const element = html.match(new RegExp(`<div id="${id}"[^>]+>`))?.[0] || '';
    assert(element.includes('tabindex="0"') && element.includes('role="region"') && element.includes('aria-label='), `${id}: benannte Tastaturregion`);
}
assert(html.includes('Jahresbudgets werden nicht historisch gespeichert') && html.includes('Ø pro Monat'), 'Budgetgrenze und Teiljahresvergleich sind sichtbar erklärt');
assertEqual((html.match(/id="captureWealthBtn"/g) || []).length, 1, 'Genau eine Capturetaste');
assert(html.indexOf('id="tab-wealth"') < html.indexOf('id="captureWealthBtn"') && html.indexOf('id="captureWealthBtn"') < html.indexOf('class="results-column'), 'Capture im vierten Panel vor Ergebnisspalte');
assert(!html.slice(html.indexOf('class="results-column')).includes('wealth-history'), 'Kein Verlauf in Ergebnisspalte');
assert(!html.includes('toggleWealthHistoryBtn'), 'Kein Toggle im Markup');
const actions = html.match(/<div class="wealth-actions">([\s\S]*?)<\/div>/)?.[1] || '';
for (const id of ['captureWealthBtn', 'wealthHistoryCount', 'wealthHistoryDate']) {
    assert(actions.includes(`id="${id}"`), `${id} gehört zum gemeinsamen Aktionscontainer`);
    assertEqual((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} bleibt eindeutig`);
}
const dateElement = actions.match(/<span\b[^>]*id="wealthHistoryDate"[^>]*>/)?.[0] || '';
assert(dateElement.includes('aria-live="polite"'), 'Datum bleibt eine höfliche Live-Ankündigung');
assert(!/\btabindex\s*=/.test(dateElement), 'Inline-Datum bleibt außerhalb der Fokusfolge');
assert(!actions.includes('id="wealthHistoryStatus"') && /<p id="wealthHistoryStatus" role="status" aria-live="polite">/.test(html), 'Status bleibt eine eigene Region');
function panel(active = false) {
    return { classList: { contains: name => name === 'active' && active,
        add: () => { active = true; }, remove: () => { active = false; } } };
}
const source = { tagesgeld: 12000, geldmarktEtf: 23000, depotwertAlt: 34000, depotwertNeu: 45000 };
const annual = createAnnualWealthHistoryEntry(source, 2026);
const manual = createManualWealthHistoryEntry(source, '2026-12-31');
const earlier = createManualWealthHistoryEntry({ ...source, tagesgeld: 1 }, '2026-06-01');
const state = { wealthHistory: { schemaVersion: 1, entries: [manual, annual, earlier] } };
const original = JSON.stringify(state);
const chartDescription = 'Gestapelte Säulen für Liquidität, Geldmarkt-ETF und Aktien-ETF. Jahresabschluss: Quadrat und durchgezogener Rahmen. Unterjährig: Raute und gestrichelter Rahmen. Alle Werte und beide Teildepots stehen in der folgenden Tabelle.';

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
assertEqual(rows[0].label, 'Unterjährig', 'Sichtbarer Anlass ist Unterjährig');
assertEqual(rows[0].reason, 'manual', 'Gespeicherter Anlass bleibt manual');
assertEqual(rows.map(row => row.id).join(','), 'manual:2026-06-01,annual:2026,manual:2026-12-31', 'Chronologisch; Jahresabschluss vor manuell am gleichen Tag');
assertEqual(JSON.stringify(state), original, 'Aufbereitung verändert keine gespeicherten Werte oder Reihenfolgen');
assertEqual(rows[1].segments.length, 3, 'Genau drei Stapelgruppen');
assertEqual(rows[1].segments.map(segment => segment.value).join(','), '12000,23000,79000', 'Alt und Neu bilden eine Aktiengruppe');
assertEqual(rows[1].segments.map(segment => segment.lower).join(','), '0,12000,35000', 'Untere Stapelgrenzen entsprechen Quellwerten');
assertEqual(rows[1].segments.map(segment => segment.upper).join(','), '12000,35000,114000', 'Obere Grenzen ergeben die Summe');
assertEqual(rows[1].total, 114000, 'Summe enthält keine doppelt gestapelten Teildepots');

const dom = { panel: panel(true), date: { textContent: '' }, chart: { innerHTML: '' }, table: { innerHTML: '' }, hint: { textContent: '' } };
assert(renderBalanceWealthHistory(dom, state), 'Unsortierter Verlauf wird dargestellt');
assertEqual(dom.date.textContent, 'Zuletzt erfasst am 31.12.2026', 'Maximaler Stichtag bei unsortiertem Verlauf und zwei Anlässen');
const svg = dom.chart.innerHTML;
assertChartAccessibility(svg);
assert(svg.includes('Euro (€)') && svg.includes('31.12.2026'), 'Datum und Euro-Skala sichtbar');
assertEqual((svg.match(/class="wealth-tagesgeld"/g) || []).length, 3, 'Pro Stand genau ein Liquiditätssegment');
assertEqual((svg.match(/class="wealth-aktienEtf"/g) || []).length, 3, 'Teildepots nicht zusätzlich gestapelt');
assert(svg.includes('■ Jahresabschluss') && svg.includes('◇ Unterjährig') && svg.includes('stroke-dasharray="4 3"'), 'Anlass mit Text, Form und Rahmen');
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
assertEqual(dom.date.textContent, 'Noch keine Stände erfasst', 'Exakter Legacy-Leertext');
assert(dom.hint.textContent.includes('Stand jetzt erfassen') && dom.hint.textContent.includes('2026'), 'Leerhinweis erklärt beide Erfassungswege');
assert(renderBalanceWealthHistory(dom, { wealthHistory: { schemaVersion: 1, entries: [] } }), 'Explizit leere Historie gültig');
assertEqual(dom.date.textContent, 'Noch keine Stände erfasst', 'Exakter Datumstext bei leerem Array');
renderBalanceWealthHistory(dom, state);
assert(renderBalanceWealthHistory(dom, { inputs: {} }), 'Import ohne Feld als leer dargestellt');
assertEqual(dom.chart.innerHTML + dom.table.innerHTML, '', 'Replace ohne Verlauf hinterlässt keine fremden Inhalte');
for (const invalid of [{ schemaVersion: 9, entries: [] }, { schemaVersion: 1, entries: [{ ...manual, total: 1 }] },
    { schemaVersion: 1, entries: [{ ...manual, reason: '<img src=x onerror=alert(1)>' }] }]) {
    renderBalanceWealthHistory(dom, state);
    assert(!renderBalanceWealthHistory(dom, { wealthHistory: invalid }), 'Beschädigter Verlauf liefert Fehlerzustand');
    assertEqual(dom.chart.innerHTML + dom.table.innerHTML, '', 'Fehlerzustand entfernt alte Chart- und Tabellenwerte');
    assert(dom.hint.textContent.includes('kann nicht angezeigt werden'), 'Fehler ist sichtbar');
    assertEqual(dom.date.textContent, '', 'Beschädigung hinterlässt kein altes Datum');
}
assert(!refreshBalanceWealthHistory(dom, () => { throw new Error('<script>beschädigt</script>'); }), 'Ladefehler wird dargestellt');
assert(dom.hint.textContent.includes('<script>beschädigt</script>'), 'Fehlertext wird als Text statt HTML gesetzt');


// Inaktive Refreshs dürfen nicht einmal vorübergehend Inhalte erzeugen.
let generated = 0;
const controlled = {
    panel: panel(), date: { textContent: '' },
    count: { textContent: '' }, status: { textContent: '' }, hint: { textContent: '' }
};
for (const key of ['chart', 'table']) {
    let markup = 'veraltet';
    controlled[key] = {
        get innerHTML() { return markup; },
        set innerHTML(value) {
            if (value) generated += 1;
            assert(controlled.panel.classList.contains('active') || value === '', 'Inaktiv niemals SVG oder Tabelle erzeugen');
            markup = value;
        }
    };
}
let current = state;
let reads = 0;
const load = () => { reads += 1; return current; };
assert(initializeBalanceWealthHistory(controlled, load), 'Initialisierung validiert gefüllte Historie ohne Darstellung');
assert(!controlled.panel.classList.contains('active'), 'Initialisierung aktiviert keinen Tab');
assertEqual(controlled.count.textContent, '3 Stände', 'Anzahl bei inaktivem Tab');
assertEqual(controlled.date.textContent, 'Zuletzt erfasst am 31.12.2026', 'Datum bei inaktivem Tab');
for (let i = 0; i < 3; i++) refreshBalanceWealthHistory(controlled, load);
assertEqual(generated, 0, 'Null Inhaltserzeugung bei beliebigen inaktiven Refreshs');
controlled.panel.classList.add('active');
assert(refreshBalanceWealthHistory(controlled, load), 'Aktivierung liest aktuelle Daten');
assertChartAccessibility(controlled.chart.innerHTML);
assertEqual(reads, 5, 'Aktivierung liest erneut');
controlled.panel.classList.remove('active');
refreshBalanceWealthHistory(controlled, load);
assertEqual(controlled.chart.innerHTML + controlled.table.innerHTML + controlled.hint.textContent, '', 'Deaktivierung leert Inhalte');
current = { wealthHistory: { schemaVersion: 1, entries: [earlier, annual] } };
refreshBalanceWealthHistory(controlled, load);
assertEqual(controlled.date.textContent, 'Zuletzt erfasst am 31.12.2026', 'Jüngerer Jahresabschluss zählt gegenüber älterem manuellen Stand');
current = { wealthHistory: { schemaVersion: 1, entries: [earlier] } };
assert(refreshBalanceWealthHistory(controlled, load), 'Inaktive neue Datenbasis gültig');
assertEqual(controlled.count.textContent, '1 Stand', 'Aktuelle Anzahl ohne Darstellung');
controlled.panel.classList.add('active');
refreshBalanceWealthHistory(controlled, load);
assert(controlled.table.innerHTML.includes('01.06.2026') && !controlled.table.innerHTML.includes('31.12.2026'), 'Erneute Aktivierung zeigt ausschließlich aktuellen State');
assertEqual(JSON.stringify(state), original, 'Anzeige mutiert die Quelle nicht');
controlled.panel.classList.remove('active');
current = { wealthHistory: { schemaVersion: 9, entries: [] } };
assert(!refreshBalanceWealthHistory(controlled, load), 'Auch inaktiv validieren');
assert(controlled.status.textContent.includes('kann nicht angezeigt werden'), 'Fehlertext bleibt im Panel');
assertEqual(controlled.count.textContent + controlled.date.textContent, '', 'Fehler erfindet weder Anzahl noch Datum');
current = {};
refreshBalanceWealthHistory(controlled, load);
assertEqual(controlled.status.textContent, '', 'Erholter State entfernt Darstellungsfehler');
assertEqual(controlled.date.textContent, 'Noch keine Stände erfasst', 'Fehlender Verlauf mit exaktem Datumstext');
assertEqual(controlled.hint.textContent, '', 'Leerhinweis bleibt inaktiv verborgen');
controlled.panel.classList.add('active');
refreshBalanceWealthHistory(controlled, load);
assert(controlled.hint.textContent.includes('Noch keine Stände'), 'Aktive leere Historie zeigt Hinweis');
