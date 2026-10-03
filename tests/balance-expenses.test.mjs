import { initTranchenManagerPage } from '../app/tranches/tranchen-manager-page.js';
import { loadTranchesFromStorage } from '../app/tranches/tranchen-manager-state.js';
import { PersistenceFacade, persistenceStorage } from '../app/shared/persistence-facade.js';
import { createBalanceWealthHistoryService, createManualWealthHistoryController } from '../app/balance/balance-wealth-history.js';
import { createExpensesWealthCaptureController, readExpensesWealthQuoteEvidence, evaluateExpensesWealthQuoteFreshness } from '../app/balance/balance-expenses-wealth-capture.js';
import { UIReader, initUIReader } from '../app/balance/balance-reader.js';
import { createProfilverbundHandlers } from '../app/balance/balance-main-profilverbund.js';
import { loadProfilverbundProfiles } from '../app/profile/profilverbund-balance.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { EngineAPI } from '../engine/index.mjs';
import { UIRenderer } from '../app/balance/balance-renderer.js';
import { UIUtils } from '../app/balance/balance-utils.js';
import { initExpensesTab, updateExpensesBudget, rollExpensesYear } from '../app/balance/balance-expenses.js';
import { refreshBalanceExpensesHistory } from '../app/balance/balance-expenses-history-renderer.js';
import {
    EXPENSE_CSV_IMPORT_SUMMARY,
    ExpenseCsvImportError,
    parseCategoryCsv,
    parseExpenseAmount,
    splitCsvLine
} from '../app/balance/balance-expenses-csv.js';
import { computeSpent, computeYearStats, sumMonthProfiles } from '../app/balance/balance-expenses-metrics.js';
import {
    createEmptyExpensesStore,
    createExpensesCorruptionRecoveryDocument,
    EXPENSES_STORE_STATUS,
    ExpensesStoreCorruptionError,
    getExpensesMonthData,
    getExpensesYearData,
    loadExpensesStore,
    loadExpensesStoreResult,
    resetCorruptExpensesStore,
    saveExpensesStore
} from '../app/balance/balance-expenses-storage.js';
import assert from 'node:assert/strict';

console.log('--- Balance Expenses Tests ---');

const STORAGE_KEY = 'balance_expenses_v1';

function assertEqual(actual, expected, message) {
    assert.equal(actual, expected, message);
}

function assertClose(actual, expected, epsilon, message) {
    assert.ok(Math.abs(actual - expected) <= epsilon, message);
}

class MockLocalStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
        this.store.set(String(key), String(value));
    }

    removeItem(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }

    key(index) {
        return Array.from(this.store.keys())[index] || null;
    }

    get length() {
        return this.store.size;
    }
}

class MockClassList {
    constructor() {
        this._set = new Set();
    }

    add(...tokens) {
        tokens.forEach(token => this._set.add(token));
    }

    remove(...tokens) {
        tokens.forEach(token => this._set.delete(token));
    }

    contains(token) {
        return this._set.has(token);
    }
}

function dataAttrToKey(attrName) {
    return attrName
        .replace(/^data-/, '')
        .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

function matchesSelector(node, selector) {
    const trimmed = String(selector || '').trim();
    if (!trimmed) return false;

    const tagMatch = trimmed.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
    const tagName = tagMatch ? tagMatch[0].toUpperCase() : null;
    if (tagName && node.tagName !== tagName) return false;

    const attrMatches = [...trimmed.matchAll(/\[([^\]]+)\]/g)];
    for (const match of attrMatches) {
        const expr = match[1].trim();
        const eq = expr.indexOf('=');
        let attr = expr;
        let expected = null;
        if (eq !== -1) {
            attr = expr.slice(0, eq).trim();
            expected = expr.slice(eq + 1).trim().replace(/^"|"$/g, '');
        }

        let actual;
        if (attr.startsWith('data-')) {
            actual = node.dataset[dataAttrToKey(attr)];
        } else {
            actual = node.attributes[attr];
            if (actual === undefined && attr in node) actual = node[attr];
        }

        if (expected === null) {
            if (actual === undefined) return false;
        } else if (String(actual) !== expected) {
            return false;
        }
    }
    return true;
}

function hasAncestor(node, predicate, stopAt) {
    let current = node.parentNode;
    while (current && current !== stopAt) {
        if (predicate(current)) return true;
        current = current.parentNode;
    }
    return false;
}

function findFirst(root, predicate) {
    for (const child of root.children) {
        if (predicate(child)) return child;
        const nested = findFirst(child, predicate);
        if (nested) return nested;
    }
    return null;
}

class MockElement {
    constructor(tagName = 'div') {
        this.tagName = String(tagName).toUpperCase();
        this.children = [];
        this.parentNode = null;
        this.textContent = '';
        this.value = '';
        this.dataset = {};
        this.attributes = {};
        this.listeners = {};
        this.classList = new MockClassList();
        this.style = {};
        this.open = false;
        this.files = [];
    }

    set className(value) {
        this.classList = new MockClassList();
        String(value || '').split(/\s+/).filter(Boolean).forEach(token => this.classList.add(token));
    }

    get className() {
        return Array.from(this.classList._set).join(' ');
    }

    appendChild(child) {
        if (!child) return child;
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    append(...nodes) {
        nodes.forEach(node => this.appendChild(node));
    }

    replaceChildren(...nodes) {
        this.children.forEach(child => { child.parentNode = null; });
        this.children = [];
        nodes.forEach(node => this.appendChild(node));
    }

    addEventListener(type, listener) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(listener);
    }

    dispatchEvent(event) {
        const list = this.listeners[event.type] || [];
        list.forEach(listener => listener(event));
    }

    trigger(type, event = {}) {
        this.dispatchEvent({ ...event, type, target: event.target || this });
    }

    click() {
        this.trigger('click');
    }

    closest(selector) {
        let node = this;
        while (node) {
            if (matchesSelector(node, selector)) return node;
            node = node.parentNode;
        }
        return null;
    }

    querySelector(selector) {
        const trimmed = String(selector || '').trim();
        if (!trimmed) return null;

        const parts = trimmed.split(/\s+/);
        if (parts.length === 1) {
            return findFirst(this, node => matchesSelector(node, trimmed));
        }

        const childSelector = parts[parts.length - 1];
        const ancestorSelector = parts.slice(0, -1).join(' ');
        return findFirst(this, node => (
            matchesSelector(node, childSelector)
            && hasAncestor(node, anc => matchesSelector(anc, ancestorSelector), this.parentNode)
        ));
    }

    showModal() {
        this.open = true;
    }

    close() {
        this.open = false;
    }
}

class MockDocument {
    constructor() { this.elements = new Map(); }
    getElementById(id) { return this.elements.get(id) || null; }
    addEventListener() {}
    createElement(tagName) {
        return new MockElement(tagName);
    }
}

function createDomRefs() {
    const tableHost = new MockElement('div');
    const csvInput = new MockElement('input');
    csvInput.clickCount = 0;
    csvInput.click = function () { this.clickCount += 1; };

    return {
        expenses: {
            annualBudget: new MockElement('div'),
            monthlyBudget: new MockElement('div'),
            annualRemaining: new MockElement('div'),
            annualUsed: new MockElement('div'),
            annualForecast: new MockElement('div'),
            forecastSub: new MockElement('div'),
            ytdValue: new MockElement('div'),
            ytdSub: new MockElement('div'),
            yearSelect: new MockElement('select'),
            table: tableHost,
            csvInput,
            detailDialog: new MockElement('dialog'),
            detailTitle: new MockElement('div'),
            detailBody: new MockElement('div'),
            detailClose: new MockElement('button')
        }
    };
}

function readStore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { version: 1, years: {} };
}

function writeStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function seedMonth(year, month, categories) {
    const store = readStore();
    const yKey = String(year);
    const mKey = String(month);
    if (!store.version) store.version = 1;
    if (!store.years) store.years = {};
    if (!store.years[yKey]) store.years[yKey] = { months: {} };
    if (!store.years[yKey].months) store.years[yKey].months = {};
    if (!store.years[yKey].months[mKey]) store.years[yKey].months[mKey] = { profiles: {} };
    store.years[yKey].months[mKey].profiles.default = {
        categories: { ...categories },
        updatedAt: '2026-01-01T00:00:00.000Z'
    };
    writeStore(store);
}

const prevLocalStorage = global.localStorage;
const prevWindow = global.window;
const prevDocument = global.document;
const prevConfirm = global.confirm;
const prevActionError = UIRenderer.handleActionError;
const prevClearActionError = UIRenderer.clearActionError;
const actionErrors = [];
const actionClears = [];
UIRenderer.handleActionError = (error, scope) => { actionErrors.push({ error, scope }); };
UIRenderer.clearActionError = scope => { actionClears.push(scope); };

try {
    // 0) Extrahierte DOM-freie Module: CSV, Metriken und Storage-Shape
    assert.deepEqual(splitCsvLine('"A;B";"C""D"', ';'), ['A;B', 'C"D'], 'CSV-Split sollte Quotes und escaped Quotes behandeln');
    assertClose(parseExpenseAmount('1.234,56 €'), 1234.56, 1e-9, 'DE-Betragsformat sollte korrekt parsen');
    assertClose(parseExpenseAmount('1,234.56'), 1234.56, 1e-9, 'EN-Betragsformat sollte korrekt parsen');
    assert(Number.isNaN(parseExpenseAmount('12abc')), 'Betrag mit angehaengtem Text wird vollstaendig abgewiesen');
    assert(Number.isNaN(parseExpenseAmount('1,23.4')), 'Mehrdeutige Betragstrenner werden abgewiesen');
    assert(Number.isNaN(parseExpenseAmount('Infinity')), 'Nicht-endlicher Betrag wird abgewiesen');
    const parsedCategories = parseCategoryCsv([
        'Kategorie;Betrag',
        'Miete;-1.000,00',
        'Miete;-250,50'
    ].join('\n'));
    assertClose(parsedCategories.Miete, -1250.5, 1e-9, 'CSV-Parser sollte Kategorien aggregieren');
    assertEqual(Object.getPrototypeOf(parsedCategories), null, 'Kategorienmap verwendet ein Null-Prototyp-Objekt');
    assertEqual(parsedCategories[EXPENSE_CSV_IMPORT_SUMMARY].totalRows, 2, 'Erfolgreicher Import liefert eine Zeilenzusammenfassung');
    assertEqual(parsedCategories[EXPENSE_CSV_IMPORT_SUMMARY].importedRows, 2, 'Zusammenfassung nennt alle importierten Zeilen');

    const reservedCategories = parseCategoryCsv([
        'Kategorie;Betrag',
        '__proto__;10',
        'constructor;20',
        'toString;30',
        'importSummary;40'
    ].join('\n'));
    assertEqual(reservedCategories.__proto__, 10, 'Reservierter Key __proto__ bleibt eine normale Kategorie');
    assertEqual(reservedCategories.constructor, 20, 'Reservierter Key constructor bleibt eine normale Kategorie');
    assertEqual(reservedCategories.toString, 30, 'Reservierter Key toString bleibt eine normale Kategorie');
    assertEqual(reservedCategories.importSummary, 40, 'Kategorie importSummary kollidiert nicht mit Parsermetadaten');
    assertEqual(Object.keys(reservedCategories).length, 4, 'Reservierte Keys erzeugen keine Prototyp-Seiteneffekte');

    let rejectedCsvError = null;
    try {
        parseCategoryCsv([
            'Kategorie;Betrag',
            'Miete;-1000',
            'Ignorieren;12abc',
            ';20'
        ].join('\n'));
    } catch (error) {
        rejectedCsvError = error;
    }
    assert(rejectedCsvError instanceof ExpenseCsvImportError, 'Ungueltige Zeilen liefern einen strukturierten CSV-Fehler');
    assertEqual(rejectedCsvError.code, 'expenses_csv_invalid_rows', 'Zeilenfehler hat einen stabilen Fehlercode');
    assertEqual(rejectedCsvError.details.summary.totalRows, 3, 'Fehlerzusammenfassung nennt die Gesamtzeilen');
    assertEqual(rejectedCsvError.details.summary.importedRows, 1, 'Fehlerzusammenfassung nennt vorab valide Zeilen');
    assertEqual(rejectedCsvError.details.summary.rejectedRows.length, 2, 'Fehlerzusammenfassung nennt alle verworfenen Zeilen');
    assert(rejectedCsvError.message.includes('2 von 3'), 'Nutzertext fasst verworfene Zeilen sichtbar zusammen');

    let ambiguousDelimiterError = null;
    try {
        parseCategoryCsv([
            'Kategorie,Betrag',
            'Miete,-1.234,56'
        ].join('\n'));
    } catch (error) {
        ambiguousDelimiterError = error;
    }
    assertEqual(ambiguousDelimiterError?.code, 'expenses_csv_invalid_rows', 'Nicht quotierter Dezimalseparator darf keine Zusatzspalte erzeugen');
    assert(ambiguousDelimiterError.message.includes('Spaltenanzahl 3 statt 2'), 'Spaltenfehler wird in der Importzusammenfassung sichtbar');

    const emptyStore = createEmptyExpensesStore(2026);
    const yearData = getExpensesYearData(emptyStore, 2026);
    getExpensesMonthData(yearData, 1).profiles.default = { categories: { Miete: -1000 } };
    getExpensesMonthData(yearData, 2).profiles.default = { categories: { Versicherung: -1040 } };
    const stats = computeYearStats({ yearData, annualBudget: 12000, monthlyBudget: 1000 });
    assertEqual(computeSpent({ A: -20, B: 5 }).spent, 15, 'computeSpent sollte Vorzeichen-symmetrisch summieren');
    assertEqual(stats.monthsWithData, 2, 'Metriken sollten Datenmonate zählen');
    assertEqual(stats.ytdBudget, 2000, 'YTD-Budget sollte nur Datenmonate berücksichtigen');
    assertClose(stats.annualForecast, 12240, 1e-9, 'Forecast sollte ab 2 Monaten den Median nutzen');

    const multiProfileMonth = { profiles: {
        selected: { categories: { Ausgabe: -100, Erstattung: 20 } },
        hidden: { categories: { Ausgabe: 30 } }
    } };
    const multiProfileStats = computeYearStats({
        yearData: { months: { '1': multiProfileMonth, '2': { profiles: {
            hidden: { categories: { Ausgabe: -10, Erstattung: 10 } }
        } } } }, annualBudget: 1200, monthlyBudget: 100
    });
    assertEqual(sumMonthProfiles(multiProfileMonth), 110, 'Auch ausgeblendete Profile zählen; Betrag wird je Profil gebildet');
    assertEqual(multiProfileStats.annualUsed, 110, 'Profilsummen werden nicht vor Betragsbildung verrechnet');
    assertEqual(multiProfileStats.monthsWithData, 1, 'Zwei Profile im selben Monat zählen einmal, Nullimport nicht');
    assertEqual(multiProfileStats.avgMonthly, 110, 'Durchschnitt berücksichtigt denselben einen Datenmonat');
    assertEqual(multiProfileStats.ytdBudget, 100, 'YTD-Soll behält die bestehende Datenmonatssemantik');
    assertEqual(multiProfileStats.ytdDelta, 10, 'Bestehende Abweichungsberechnung bleibt unverändert');
    assertEqual(multiProfileStats.annualForecast, 1320, 'Ein Datenmonat verwendet weiterhin den Durchschnitt für die Prognose');

    global.localStorage = new MockLocalStorage();
    global.window = { localStorage: global.localStorage };
    global.document = new MockDocument();

    // 0b) Korrupte Persistenz bleibt sichtbar und ist bis zu einer bestaetigten Recovery gesperrt.
    const corruptRaw = '{"version":1,"years":';
    global.localStorage.setItem(STORAGE_KEY, corruptRaw);
    const corruptResult = loadExpensesStoreResult(global.localStorage);
    assertEqual(corruptResult.status, EXPENSES_STORE_STATUS.CORRUPT, 'Parsefehler liefert strukturierten Korruptionsstatus');
    assertEqual(corruptResult.error.code, 'expenses-store-json-invalid', 'Korruptionsstatus nennt einen stabilen Fehlercode');
    assertEqual(corruptResult.raw, corruptRaw, 'Korruptionsstatus bewahrt den bytegleichen Rohinhalt');
    const invalidShapeStorage = new MockLocalStorage();
    invalidShapeStorage.setItem(STORAGE_KEY, '{"version":1,"years":[]}');
    assertEqual(
        loadExpensesStoreResult(invalidShapeStorage).error.code,
        'expenses-store-years-invalid',
        'Ein syntaktisch gueltiger, aber unbrauchbarer Store wird ebenfalls als korrupt gemeldet'
    );
    assertEqual(
        loadExpensesStoreResult({ getItem() { throw new Error('Test-Lesefehler'); } }).error.code,
        'expenses-store-read-failed',
        'Storage-Lesefehler werden strukturiert und ohne erfundenen Leerzustand gemeldet'
    );
    assert.throws(
        () => loadExpensesStore(global.localStorage),
        ExpensesStoreCorruptionError,
        'Kompatibilitaetsloader darf Korruption nicht als leeren Store ausgeben'
    );
    assert.throws(
        () => saveExpensesStore(createEmptyExpensesStore(2026), global.localStorage),
        ExpensesStoreCorruptionError,
        'Normaler Schreibpfad bleibt bei Korruption gesperrt'
    );
    assertEqual(global.localStorage.getItem(STORAGE_KEY), corruptRaw, 'Gesperrter Schreibpfad laesst Rohinhalt unveraendert');

    const recoveryDocument = createExpensesCorruptionRecoveryDocument(corruptResult, {
        backend: 'Test-Backend',
        exportedAt: '2026-07-14T10:00:00.000Z'
    });
    assertEqual(recoveryDocument.affectedArea, 'Ausgaben-Check', 'Recovery-Dokument nennt den betroffenen Datenbereich');
    assertEqual(recoveryDocument.backend, 'Test-Backend', 'Recovery-Dokument nennt das Backend');
    assertEqual(recoveryDocument.raw, corruptRaw, 'Recovery-Dokument enthaelt den unveraenderten Rohinhalt');
    assert.throws(
        () => resetCorruptExpensesStore(corruptResult, { storage: global.localStorage, activeYear: 2026 }),
        /exportiert oder quarantiniert/,
        'Reset ohne bestaetigte Rohdatensicherung bleibt gesperrt'
    );
    resetCorruptExpensesStore(corruptResult, {
        storage: global.localStorage,
        activeYear: 2026,
        rawPreserved: true
    });
    assertEqual(JSON.parse(global.localStorage.getItem(STORAGE_KEY)).activeYear, 2026, 'Expliziter Reset erzeugt erst nach Recovery-Freigabe einen leeren Store');

    writeStore({ version: 1, activeYear: 2026, years: { '2026': { months: {} } } });
    seedMonth(2026, 1, { 'Miete': -1000, 'Erstattung': 30 });
    const withHiddenProfile = readStore();
    withHiddenProfile.years['2026'].months['1'].profiles.hidden = { categories: { Ausgabe: 30 } };
    writeStore(withHiddenProfile);

    const dom = createDomRefs();
    let overviewActive = false, changeCalls = 0, completeChange;
    const overview = { panel: { classList: { contains: () => overviewActive } },
        chart: { innerHTML: '' }, table: { innerHTML: '' }, hint: { textContent: '' } };
    const refreshOverview = () => refreshBalanceExpensesHistory(overview, {
        storage: global.localStorage, now: () => new Date(2026, 9, 3)
    });
    const onChange = () => { changeCalls++; refreshOverview(); completeChange?.(); };
    initExpensesTab(dom, { onChange });
    assertEqual(changeCalls, 0, 'Initialisierung ist kein Datenänderungsrückruf');
    refreshOverview();
    assertEqual(overview.chart.innerHTML + overview.table.innerHTML, '', 'Gefüllte Übersicht bleibt initial inaktiv leer');
    updateExpensesBudget({ monthlyBudget: 1000, annualBudget: 12000 });

    // 1) Performance: refreshTableValues darf nur einmal auf STORAGE lesen
    const originalGetItem = global.localStorage.getItem.bind(global.localStorage);
    let storageReads = 0;
    global.localStorage.getItem = function (key) {
        if (key === STORAGE_KEY) storageReads += 1;
        return originalGetItem(key);
    };
    updateExpensesBudget({ monthlyBudget: 1000, annualBudget: 12000 });
    assertEqual(storageReads, 1, 'refreshTableValues-Zyklus sollte STORAGE nur einmal laden');
    global.localStorage.getItem = originalGetItem;

    // 2) Ein Datenmonat => Ø/Monat
    assert(dom.expenses.forecastSub.textContent.includes('Ø/Monat'), 'Forecast sollte bei 1 Datenmonat mit Durchschnitt arbeiten');
    assert(dom.expenses.forecastSub.textContent.includes('Datenmonate: 1/12'), 'Forecast-Unterzeile sollte 1 Datenmonat anzeigen');
    const janTotal = dom.expenses.table.querySelector('[data-month-total="1"] [data-role="total"]');
    assertEqual(dom.expenses.table.querySelector('[data-month="1"][data-profile="hidden"]'), null,
        'Gespeichertes Fremdprofil hat keine sichtbare Profilspalte');
    assert(janTotal && janTotal.classList.contains('budget-ok'), 'Januar-Gesamt sollte bei Budgettreffer als OK markiert sein');
    assert(dom.expenses.ytdValue.classList.contains('budget-ok'), 'YTD sollte bei exaktem Soll als OK markiert sein');

    // 3) Zwei Datenmonate => Median + 5%-Warnzone
    seedMonth(2026, 2, { 'Versicherung': -1040 });
    updateExpensesBudget({ monthlyBudget: 1000, annualBudget: 12000 });
    assert(dom.expenses.forecastSub.textContent.includes('Median/Monat'), 'Forecast sollte ab 2 Datenmonaten den Median nutzen');
    assert(dom.expenses.forecastSub.textContent.includes('Datenmonate: 2/12'), 'Forecast-Unterzeile sollte 2 Datenmonate anzeigen');
    assert(dom.expenses.annualForecast.classList.contains('budget-warn'), 'Jahresprognose in 5%-Band sollte Warnstatus haben');
    assert(dom.expenses.ytdValue.classList.contains('budget-warn'), 'YTD in 5%-Band sollte Warnstatus haben');
    const febTotal = dom.expenses.table.querySelector('[data-month-total="2"] [data-role="total"]');
    assert(febTotal && febTotal.classList.contains('budget-warn'), 'Februar-Gesamt in 5%-Band sollte Warnstatus haben');

    // 4) CSV-Import: Aggregation + DE-Zahlenformat
    const importBtn = {
        dataset: { action: 'import', month: '3', profile: 'default' }
    };
    dom.expenses.table.trigger('click', {
        target: {
            closest: (selector) => selector === 'button[data-action]' ? importBtn : null
        }
    });
    assertEqual(dom.expenses.csvInput.clickCount, 1, 'Import-Klick sollte CSV-Input öffnen');

    let releaseText;
    const file = {
        text: () => new Promise(resolve => { releaseText = () => resolve([
            'Kategorie;Betrag',
            'Versicherungen;-1.200,50',
            'Versicherungen;-300',
            'Krankenkasse;-99,50'
        ].join('\n')); })
    };
    dom.expenses.csvInput.value = 'selected.csv';
    dom.expenses.csvInput.trigger('change', {
        target: {
            files: [file],
            value: 'selected.csv'
        }
    });
    assertEqual(changeCalls, 0, 'Offenes Dateilesen benachrichtigt noch nicht');
    overviewActive = true;
    refreshOverview();
    const changed = new Promise(resolve => { completeChange = resolve; });
    await Promise.resolve();
    releaseText();
    await changed;
    completeChange = null;
    assertEqual(changeCalls, 1, 'Ein realer Import benachrichtigt genau einmal nach Speicherung');
    assert(overview.table.innerHTML.includes(UIUtils.formatCurrency(3640)), 'Aktive Übersicht zeigt importierte Jahressumme ohne Tabwechsel');

    const importedStore = readStore();
    const marchCategories = importedStore.years['2026'].months['3'].profiles.default.categories;
    assertClose(marchCategories.Versicherungen, -1500.5, 1e-9, 'CSV-Import sollte Kategorien aggregieren');
    assertClose(marchCategories.Krankenkasse, -99.5, 1e-9, 'CSV-Import sollte DE-Format korrekt parsen');

    // 4b) Delete: vorhandene Monatsdaten entfernen
    let confirmMessage = null;
    global.confirm = (msg) => {
        confirmMessage = msg;
        return true;
    };
    const deleteBtn = dom.expenses.table.querySelector('[data-month="3"][data-profile="default"] [data-action="delete"]');
    assert(deleteBtn, 'Delete-Button sollte existieren');
    assertEqual(deleteBtn.classList.contains('btn-hidden'), false, 'Delete-Button sollte bei vorhandenen Daten sichtbar sein');
    assertEqual(deleteBtn.tabIndex, 0, 'Sichtbarer Delete-Button sollte per Tastatur erreichbar sein');
    assertEqual(deleteBtn.ariaHidden, 'false', 'Sichtbarer Delete-Button darf nicht aria-hidden sein');
    dom.expenses.table.trigger('click', {
        target: {
            closest: (selector) => selector === 'button[data-action]' ? deleteBtn : null
        }
    });
    assertEqual(confirmMessage, 'Monatsdaten für März löschen?', 'Delete-Confirm sollte den Monatstext exakt anzeigen');
    const afterDeleteStore = readStore();
    assertEqual(changeCalls, 2, 'Löschung benachrichtigt genau einmal');
    assert(overview.table.innerHTML.includes(UIUtils.formatCurrency(2040))
        && !overview.table.innerHTML.includes(UIUtils.formatCurrency(3640)), 'Löschung entfernt alte Jahreswerte unmittelbar');
    assertEqual(afterDeleteStore.years['2026'].months['3'].profiles.default, undefined, 'Delete sollte den Profileintrag entfernen');
    const marchCell = dom.expenses.table.querySelector('[data-month="3"][data-profile="default"] [data-role="value"]');
    assertEqual(marchCell?.textContent, '—', 'Delete sollte die Tabellenzelle neu rendern');
    assertEqual(deleteBtn.classList.contains('btn-hidden'), true, 'Delete-Button sollte ohne Daten unsichtbar bleiben');
    assertEqual(deleteBtn.tabIndex, -1, 'Unsichtbarer Delete-Button darf nicht per Tastatur erreichbar sein');
    assertEqual(deleteBtn.ariaHidden, 'true', 'Unsichtbarer Delete-Button sollte für Assistive Tech verborgen sein');

    // 4c) Delete-No-Op: nicht vorhandener Eintrag über Handler-Pfad
    const beforeNoOp = JSON.stringify(readStore());
    global.confirm = () => true;
    const phantomDeleteBtn = {
        dataset: { action: 'delete', month: '11', profile: 'default' }
    };
    dom.expenses.table.trigger('click', {
        target: {
            closest: (selector) => selector === 'button[data-action]' ? phantomDeleteBtn : null
        }
    });
    const afterNoOp = JSON.stringify(readStore());
    assertEqual(afterNoOp, beforeNoOp, 'Delete ohne vorhandenen Eintrag muss No-Op sein');
    assertEqual(changeCalls, 2, 'Wirkungslose Löschung benachrichtigt nicht');

    // 5) Jahresabschluss: neues Jahr aktiv, Historie bleibt
    const newYear = rollExpensesYear();
    assertEqual(newYear, 2027, 'rollExpensesYear sollte auf Folgejahr wechseln');
    const rolledStore = readStore();
    assertEqual(Number(rolledStore.activeYear), 2027, 'Aktives Jahr sollte nach Roll auf Folgejahr stehen');
    assert(rolledStore.years['2026']?.months?.['1'], 'Historische Monatsdaten müssen erhalten bleiben');
    assert(rolledStore.years['2027'] && typeof rolledStore.years['2027'] === 'object', 'Folgejahr sollte angelegt werden');
    assertEqual(Object.keys(rolledStore.years['2027'].months || {}).length, 0, 'Folgejahr sollte ohne Monatsdaten starten');
    assertEqual(dom.expenses.yearSelect.value, '2027', 'Jahr-Select sollte nach Roll auf Folgejahr springen');
    assertEqual(dom.expenses.ytdSub.textContent, 'Soll: —', 'YTD-Soll sollte im leeren Folgejahr nicht auf Kalender, sondern Datenmonate basieren');
    assertEqual(changeCalls, 3, 'Jahreswechsel benachrichtigt genau einmal');
    assert(overview.table.innerHTML.includes('2026 – laufendes Teiljahr') && !overview.table.innerHTML.includes('2027'), 'Auswahljahr ändert Kalenderjahrmarkierung und importierte Jahresliste nicht');
    overviewActive = false;
    refreshOverview();
    dom.expenses.yearSelect.trigger('change', { target: { value: '2026' } });
    assertEqual(changeCalls, 4, 'Jahresauswahl benachrichtigt');
    assertEqual(overview.chart.innerHTML + overview.table.innerHTML, '', 'Jahresauswahl zeichnet inaktiv keine Inhalte');

    // 6) Recovery-UI: Bereich/Backend und sichere Optionen; kein Reset ohne Export+Bestaetigung.
    global.localStorage.setItem(STORAGE_KEY, corruptRaw);
    const cancelledDom = createDomRefs();
    const cancelledInit = initExpensesTab(cancelledDom, {
        storage: global.localStorage,
        getPersistenceStatus: () => ({ backend: 'IndexedDB-Test' }),
        downloadRecovery: async () => {},
        confirmReset: () => true,
        now: () => new Date('2026-07-14T10:00:00.000Z')
    });
    assertEqual(cancelledInit.status, EXPENSES_STORE_STATUS.CORRUPT, 'Expenses-Init gibt Korruptionsstatus an den Aufrufer zurueck');
    const cancelledPanel = cancelledDom.expenses.table.querySelector('[data-expenses-recovery="corrupt"]');
    const cancelledMessage = cancelledPanel?.querySelector('[data-role="expenses-recovery-message"]');
    assert(cancelledPanel, 'Korruption rendert einen sichtbaren Recovery-Bereich');
    assert(cancelledMessage?.textContent.includes('Ausgaben-Check'), 'Recovery-UI nennt den betroffenen Datenbereich');
    assert(cancelledMessage?.textContent.includes('IndexedDB-Test'), 'Recovery-UI nennt das aktive Backend');
    const cancelButton = cancelledPanel.querySelector('[data-action="expenses-recovery-cancel"]');
    cancelButton.click();
    assertEqual(global.localStorage.getItem(STORAGE_KEY), corruptRaw, 'Abbrechen veraendert den korrupten Rohinhalt nicht');
    assert(
        cancelledDom.expenses.table.querySelector('[data-role="expenses-recovery-cancelled"]'),
        'Abbrechen zeigt den weiterhin gesperrten Zustand an'
    );

    let downloadedRecovery = null;
    let downloadedFilename = '';
    let approveReset = false;
    let failResetFlush = true;
    const resetPrompts = [];
    const recoveryDom = createDomRefs();
    overviewActive = true;
    refreshOverview();
    const beforeResetCalls = changeCalls;
    initExpensesTab(recoveryDom, {
        onChange,
        storage: global.localStorage,
        getPersistenceStatus: () => ({ backend: 'IndexedDB-Test' }),
        downloadRecovery: async (document, filename) => {
            downloadedRecovery = document;
            downloadedFilename = filename;
        },
        confirmReset: (message) => {
            resetPrompts.push(message);
            return approveReset;
        },
        flush: async () => {
            if (failResetFlush) throw new Error('Test-Quota');
        },
        now: () => new Date('2026-07-14T10:00:00.000Z')
    });
    let recoveryPanel = recoveryDom.expenses.table.querySelector('[data-expenses-recovery="corrupt"]');
    const resetBeforeExport = recoveryPanel.querySelector('[data-action="expenses-recovery-reset"]');
    assertEqual(resetBeforeExport.disabled, true, 'Reset bleibt vor einem Recovery-Export sichtbar, aber gesperrt');
    const clearsBeforeBlocked = actionClears.length;
    resetBeforeExport.click();
    assertEqual(actionClears.length, clearsBeforeBlocked, 'Gesperrter Recoveryreset entfernt keinen Aktionsfehler');
    assertEqual(resetPrompts.length, 0, 'Gesperrter Reset fragt nicht nach Bestaetigung');
    assertEqual(global.localStorage.getItem(STORAGE_KEY), corruptRaw, 'Gesperrter Reset ueberschreibt keine Daten');

    recoveryPanel.querySelector('[data-action="expenses-recovery-export"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assertEqual(downloadedRecovery.raw, corruptRaw, 'UI-Recovery exportiert den bytegleichen Rohinhalt');
    assert(downloadedFilename.startsWith('balance-ausgaben-recovery-2026-07-14'), 'Recovery-Dateiname ist datiert und generisch');
    recoveryPanel = recoveryDom.expenses.table.querySelector('[data-expenses-recovery="corrupt"]');
    const resetAfterExport = recoveryPanel.querySelector('[data-action="expenses-recovery-reset"]');
    assertEqual(resetAfterExport.disabled, false, 'Erfolgreicher Recovery-Export schaltet Reset frei');

    const clearsBeforeCancel = actionClears.length;
    resetAfterExport.click();
    assertEqual(actionClears.length, clearsBeforeCancel, 'Abgebrochene Recoverybestätigung entfernt keinen Aktionsfehler');
    assertEqual(resetPrompts.length, 1, 'Reset verlangt eine explizite Bestaetigung');
    assertEqual(global.localStorage.getItem(STORAGE_KEY), corruptRaw, 'Abgelehnter Reset laesst Rohinhalt unveraendert');
    approveReset = true;
    resetAfterExport.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assertEqual(global.localStorage.getItem(STORAGE_KEY), corruptRaw, 'Quota-/Flush-Fehler stellt den korrupten Rohinhalt im aktiven Store wieder her');
    assert(
        recoveryDom.expenses.table.querySelector('[data-expenses-recovery="corrupt"]'),
        'Quota-/Flush-Fehler bleibt im sichtbaren Recovery-Zustand'
    );

    assertEqual(actionErrors.at(-1)?.scope, 'expenses-recovery', 'Fehlgeschlagener Reset gehört zum Recoverybereich');
    assertEqual(changeCalls, beforeResetCalls, 'Gesperrter, abgebrochener oder fehlgeschlagener Reset benachrichtigt nicht');
    assert(actionErrors.at(-1)?.error.message.includes('nicht zurueckgesetzt'), 'Recoveryfehler behält seinen sicheren Wortlaut');
    failResetFlush = false;
    recoveryDom.expenses.table.querySelector('[data-action="expenses-recovery-reset"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    const resetStore = JSON.parse(global.localStorage.getItem(STORAGE_KEY));
    assertEqual(resetPrompts.length, 3, 'Jeder Reset-Versuch nutzt einen eigenen Bestaetigungsschritt');
    assertEqual(resetStore.version, 1, 'Bestaetigter Reset erzeugt einen gueltigen Ausgabenstore');
    assertEqual(Object.keys(resetStore.years).length, 0, 'Bestaetigter Reset startet ohne erfundene Finanzdaten');
    assertEqual(changeCalls, beforeResetCalls + 1, 'Nur bestätigter und geflushter Reset benachrichtigt');
    assertEqual(overview.chart.innerHTML + overview.table.innerHTML, '', 'Reset entfernt alte Übersichtsinhalte');
    assertEqual(overview.hint.textContent, 'Noch keine Ausgabendaten vorhanden.', 'Reset ersetzt Korruptionshinweis durch Leerzustand');
    assertEqual(
        recoveryDom.expenses.table.querySelector('[data-expenses-recovery="corrupt"]'),
        null,
        'Nach bestaetigtem Reset wird der gesperrte Recovery-Bereich verlassen'
    );

    // 7) Produktive Kette: undatierte Altdaten -> echter Kurslistener -> bestätigter
    // Speicher/Reload -> echte Eingabeprojektion/Engine-PREVIEW -> CSV-Listener.
    {
        const key = CONFIG.STORAGE.LS_KEY;
        const savedInputs = { aktuellesAlter: 67, floorBedarf: 12000, flexBedarf: 24000,
            minimumFlexAnnual: 0, tagesgeld: 100000, geldmarktEtf: 0, depotwertAlt: 0, depotwertNeu: 0,
            inflation: 2, endeVJ: 100, endeVJ_1: 95, endeVJ_2: 90, endeVJ_3: 85,
            ath: 105, jahreSeitAth: 1, marketCapeRatio: 25, capeRatio: 25 };
        const balanceRaw = JSON.stringify({ inputs: savedInputs, lastState: { cumulativeInflationFactor: 1 },
            annualPeriodMetadata: { schemaVersion: 1, lastCommittedPeriod: null, pendingCommit: null } });
        const trancheRaw = JSON.stringify([{ schemaVersion: 2, trancheId: 'quote-integration',
            name: 'ETF', ticker: 'FLOW.DE', shares: 1000, purchasePrice: 80, currentPrice: 100,
            purchaseDate: '2020-01-01', category: 'equity', type: 'aktien_neu', tqf: 0.3, taxExempt: false }]);
        const meta = id => ({ id, name: id, createdAt: '2026-01-01T00:00:00Z',
            updatedAt: new Date().toISOString(), belongsToHousehold: true });
        const backend = new Map([[key, balanceRaw], ['depot_tranchen', trancheRaw],
            ['profile_tagesgeld', '100000'], ['profile_aktuelles_alter', '67'],
            ['rs_current_profile', 'default'], ['rs_active_profile', 'default'],
            ['rs_profiles_v1', JSON.stringify({ version: 1, profiles: {
                default: { meta: meta('default'), data: { [key]: balanceRaw, depot_tranchen: trancheRaw,
                    profile_tagesgeld: '100000', profile_aktuelles_alter: '67' } }
            } })], [STORAGE_KEY, JSON.stringify({ version: 1, activeYear: 2025, years: {} })]]);
        let fault = '', failExpenseFlush = false, historyBatches = 0;
        const adapter = { name: 'import-quote-memory', async open() {},
            async loadAll() { return Object.fromEntries(backend); },
            async saveBatch(batch) {
                if (failExpenseFlush && batch.upserts.some(([k]) => k === STORAGE_KEY)) throw new Error('Importflush fehlgeschlagen');
                if (fault === 'write' && batch.upserts.some(([k]) => k === key)) throw new Error('Verlaufwrite fehlgeschlagen');
                if (batch.upserts.some(([k, v]) => k === key && JSON.parse(v).wealthHistory)) historyBatches++;
                batch.deletes.forEach(k => backend.delete(k));
                batch.upserts.forEach(([k, v]) => backend.set(k, String(v)));
            } };
        PersistenceFacade.resetPersistenceForTests(adapter);
        await PersistenceFacade.init();
        const documentRef = new MockDocument();
        for (const id of ['updatePricesBtn', 'priceUpdateStatus', 'tranchePersistenceStatus', 'stats', 'tranchenTable']) {
            const element = new MockElement(id === 'updatePricesBtn' ? 'button' : 'div');
            element.id = id; documentRef.elements.set(id, element);
        }
        global.document = documentRef;
        global.window = { localStorage: global.localStorage, EngineAPI };
        const refs = createDomRefs();
        refs.inputs = Object.fromEntries(Object.entries(savedInputs).map(([id, value]) => {
            const element = new MockElement('input'); element.value = String(value); return [id, element];
        }));
        initUIReader(refs);
        const profileHandlers = createProfilverbundHandlers({ dom: refs, PROFILVERBUND_STORAGE_KEYS: { mode: 'profilverbund_mode' } });
        let previews = 0, attempts = 0;
        const update = options => {
            previews++;
            assertEqual(options.mode, 'preview', 'Echter Import fordert eine PREVIEW an');
            if (fault === 'preview') throw new Error('Vorschau fehlgeschlagen');
            const inputData = UIReader.readAllInputs();
            profileHandlers.updateProfilverbundGlobals(loadProfilverbundProfiles(), inputData);
            const modelResult = EngineAPI.simulateSingleYear(inputData, { cumulativeInflationFactor: 1 });
            if (modelResult.error) throw modelResult.error;
            return { ok: true, inputData, modelResult };
        };
        const service = createBalanceWealthHistoryService();
        const originalCapture = service.captureManual;
        service.captureManual = options => { attempts++; return originalCapture(options); };
        const messages = [], errors = [];
        const originalToast = UIRenderer.toast;
        UIRenderer.toast = (text, type) => { messages.push({ text, type }); };
        const controller = createExpensesWealthCaptureController({ service, update,
            toast: (text, type) => UIRenderer.toast(text, type),
            reportError: (error, scope) => errors.push({ error, scope }) });
        const initImport = extra => initExpensesTab(refs, { storage: persistenceStorage,
            onImportSuccess: () => controller.afterImport(), ...extra });
        const choose = month => refs.expenses.table.listeners.click[0]({ target: {
            closest: () => ({ dataset: { action: 'import', month: String(month), profile: 'default' } }) } });
        const importCsv = async (month, text = 'Kategorie;Betrag\nAusgabe;-250') => {
            choose(month);
            return refs.expenses.csvInput.listeners.change.at(-1)({ target: {
                files: [{ text: async () => text }], value: 'ausgaben.csv' } });
        };
        try {
            const before = update({ mode: 'preview' }).inputData;
            assertEqual(evaluateExpensesWealthQuoteFreshness(readExpensesWealthQuoteEvidence(before), new Date()).status,
                'unknown', 'Produktiver Leser erkennt undatierte Manager-Altdaten');
            initImport();
            await importCsv(1);
            assertEqual(attempts, 0, 'Undatierter Bestand verhindert produktiv die Sicherung');
            assertEqual(messages.at(-1).type, 'info', 'Unbekannter realer Kurs meldet info');
            const quoteAsOf = Math.floor(Date.now() / 1000);
            const oldFetch = global.fetch;
            global.fetch = async () => ({ ok: true, status: 200,
                json: async () => ({ symbol: 'FLOW.DE', price: 120, currency: 'EUR', asOf: quoteAsOf, source: 'yahoo-chart' }) });
            try {
                await initTranchenManagerPage({ profileId: 'default' });
                await documentRef.getElementById('updatePricesBtn').listeners.click[0]();
            } finally { if (oldFetch === undefined) delete global.fetch; else global.fetch = oldFetch; }
            assertEqual(JSON.parse(backend.get('depot_tranchen'))[0].asOf, quoteAsOf, 'Managerlistener bestätigt quote.asOf im Backend');
            assertEqual(JSON.parse(JSON.parse(backend.get('rs_profiles_v1')).profiles.default.data.depot_tranchen)[0].currentPrice,
                120, 'Managerpreis ist in aktiver Registry bestätigt');
            assertEqual(loadTranchesFromStorage(persistenceStorage).tranches[0].asOf, quoteAsOf, 'Reload erhält Preiszeit');
            const previewBefore = previews;
            const messageIndex = messages.length;
            await importCsv(2);
            assertEqual(previews - previewBefore, 1, 'Erfolgreicher realer Import fährt genau eine PREVIEW');
            assertEqual(attempts, 1, 'Frischer Managerkurs gibt genau einen Versuch frei');
            assertEqual(historyBatches, 1, 'Genau eine bestätigte Verlaufstransaktion');
            const captured = JSON.parse(backend.get(key)).wealthHistory.entries[0];
            assertEqual(captured.depotwertNeu, 120000, 'Erfassung verwendet den produktiv gespeicherten Managerpreis');
            assertEqual(captured.reason, 'manual', 'Unverändertes Legacy-Speicherformat');
            assertEqual(captured.periodId, null, 'Kein Periodencommit beim Import');
            assertEqual(messages[messageIndex].text, 'CSV importiert.', 'Importbestätigung kommt vor Sicherung');
            assertEqual(errors.length, 0, `Kein Sicherungsfehler: ${errors.at(-1)?.error?.message}`);
            assert(messages[messageIndex + 1].text.startsWith('Vermögensstand gesichert (Kurse vom'), 'Gespeicherter Kurs erzeugt Erfolg');
            assert(JSON.parse(backend.get(STORAGE_KEY)).years['2025'].months['2'].profiles.default, 'Import bleibt unabhängig gespeichert');
            const manual = createManualWealthHistoryController({ service, update, refresh: () => {} });
            await manual.capture();
            assertEqual(JSON.stringify(JSON.parse(backend.get(key)).wealthHistory.entries[0]), JSON.stringify(captured),
                'Manuelle und automatische echte Vorschau erzeugen identische Komponenten');
            assertEqual(JSON.parse(backend.get('rs_profiles_v1')).profiles.default.data[key], backend.get(key), 'Readback hält Live-State und Registry synchron');
            const stable = backend.get(key);
            const baseAttempts = attempts;
            // Ablehnungen starten keinerlei Sicherung.
            await importCsv(3, 'Kategorie;Betrag\nAusgabe;ungueltig');
            choose(3); await refs.expenses.csvInput.listeners.change.at(-1)({ target: { files: [], value: '' } });
            choose(3); await refs.expenses.csvInput.listeners.change.at(-1)({ target: { files: [{ text: async () => { throw new Error('Lesefehler'); } }], value: '' } });
            let failStore = false;
            initImport({ storage: { getItem: k => persistenceStorage.getItem(k), setItem: (k, v) => { if (failStore) throw new Error('Storefehler'); persistenceStorage.setItem(k, v); } } });
            failStore = true;
            await importCsv(3);
            initImport();
            failExpenseFlush = true;
            await importCsv(3);
            failExpenseFlush = false;
            await PersistenceFacade.flush();
            assertEqual(attempts, baseAttempts, 'Parser-, Datei-, Store- und Flushfehler sowie leere Auswahl ohne Sicherungsversuch');
            // Optionale Vorschau-/Schreibfehler bestätigen den Import weiterhin.
            for (const optionalFault of ['preview', 'write']) {
                fault = optionalFault;
                const index = messages.length;
                await importCsv(4);
                assertEqual(messages[index].text, 'CSV importiert.', 'Optionaler Fehler erhält Importbestätigung');
                assertEqual(errors.at(-1).scope, 'expenses-wealth', 'Optionaler Fehler ist kein CSV-Importfehler');
                assertEqual(backend.get(key), stable, 'Optionaler Fehler bewahrt bestätigten Verlauf');
                assert(JSON.parse(backend.get(STORAGE_KEY)).years['2025'].months['4'].profiles.default, 'Import trotz Sicherungsfehler gespeichert');
                fault = '';
            }
            // Mehrere reale Verbundprofile: frisch im aktiven Profil reicht nicht.
            const registry = JSON.parse(persistenceStorage.getItem('rs_profiles_v1'));
            registry.profiles.partner = { meta: meta('partner'), data: { [key]: balanceRaw, depot_tranchen: trancheRaw } };
            persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(registry)); await PersistenceFacade.flush();
            let data = update({ mode: 'preview' }).inputData;
            assertEqual(data.detailledTranches.length, 2, 'Reale PREVIEW enthält beide beitragenden Profile');
            assertEqual(evaluateExpensesWealthQuoteFreshness(readExpensesWealthQuoteEvidence(data), new Date()).status,
                'unknown', 'Undatierter beitragender Partner blockiert trotz frischem aktiven Kurs');
            const beforePartnerAttempts = attempts;
            await importCsv(5);
            assertEqual(attempts, beforePartnerAttempts, 'Realer Import mit undatiertem Partner startet keinen Sicherungsversuch');
            const partnerLots = JSON.parse(trancheRaw); partnerLots[0].asOf = quoteAsOf - 604801;
            registry.profiles.partner.data.depot_tranchen = JSON.stringify(partnerLots);
            persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(registry)); await PersistenceFacade.flush();
            data = update({ mode: 'preview' }).inputData;
            assertEqual(evaluateExpensesWealthQuoteFreshness(readExpensesWealthQuoteEvidence(data), new Date()).status,
                'old', 'Alter beitragender Partnerkurs blockiert produktiv');
            await importCsv(5);
            assertEqual(attempts, beforePartnerAttempts, 'Realer Import mit altem Partner startet keinen Sicherungsversuch');
            partnerLots[0].asOf = quoteAsOf;
            registry.profiles.partner.data.depot_tranchen = JSON.stringify(partnerLots);
            persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(registry)); await PersistenceFacade.flush();
            await importCsv(5);
            assertEqual(JSON.parse(backend.get(key)).wealthHistory.entries[0].depotwertNeu, 220000, 'Alle frisch bewerteten Verbundbestände werden erfasst');
            registry.profiles.default.data.depot_tranchen = '[]';
            registry.profiles.partner.data.depot_tranchen = '[]';
            // Aktive Registrykopie darf nicht auf den alten Stand vor Erfassung zurückgesetzt werden.
            registry.profiles.default.data[key] = persistenceStorage.getItem(key);
            persistenceStorage.setItem('depot_tranchen', '[]');
            persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(registry)); await PersistenceFacade.flush();
            await importCsv(6);
            assertEqual(messages.at(-1).text, 'Vermögensstand gesichert (keine kursabhängigen Bestände).',
                'Produktiver Import ohne ETF-Bestände wird direkt bestätigt');
            assertEqual(JSON.parse(backend.get(key)).wealthHistory.entries[0].aktienEtf, 0, 'Produktive kursfreie Vorschau erfasst keine ETF-Werte');

            const beforeRecoveryAttempts = attempts;
            const expensesRaw = persistenceStorage.getItem(STORAGE_KEY);
            persistenceStorage.setItem(STORAGE_KEY, '{korrupt'); await PersistenceFacade.flush();
            initImport(); await importCsv(6);
            assertEqual(attempts, beforeRecoveryAttempts, 'Reale Recovery-Sperre startet null Sicherungsversuche');
            persistenceStorage.setItem(STORAGE_KEY, expensesRaw); await PersistenceFacade.flush();
            initImport();
            // Auch zwei unmittelbar gestartete Dateivorgänge werden bestätigt je einmal bearbeitet.
            const beforeQuick = attempts;
            await Promise.all([importCsv(7), importCsv(8)]);
            assertEqual(attempts - beforeQuick, 2, 'Zwei schnelle reale Imports verlieren keine Erfassung');
            assert(JSON.parse(backend.get(STORAGE_KEY)).years['2025'].months['7'].profiles.default
                && JSON.parse(backend.get(STORAGE_KEY)).years['2025'].months['8'].profiles.default,
                'Beide schnellen Imports bleiben gespeichert');

        } finally {
            UIRenderer.toast = originalToast;
            PersistenceFacade.resetPersistenceForTests();
        }
    }
    console.log('✅ Balance expenses tests passed');
} finally {
    UIRenderer.handleActionError = prevActionError;
    UIRenderer.clearActionError = prevClearActionError;
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevConfirm === undefined) delete global.confirm; else global.confirm = prevConfirm;
}

console.log('--- Balance Expenses Tests Completed ---');
