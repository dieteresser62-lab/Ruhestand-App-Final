import { initExpensesTab, updateExpensesBudget, rollExpensesYear } from '../app/balance/balance-expenses.js';
import { parseCategoryCsv, parseExpenseAmount, splitCsvLine } from '../app/balance/balance-expenses-csv.js';
import { computeSpent, computeYearStats } from '../app/balance/balance-expenses-metrics.js';
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

try {
    // 0) Extrahierte DOM-freie Module: CSV, Metriken und Storage-Shape
    assert.deepEqual(splitCsvLine('"A;B";"C""D"', ';'), ['A;B', 'C"D'], 'CSV-Split sollte Quotes und escaped Quotes behandeln');
    assertClose(parseExpenseAmount('1.234,56 €'), 1234.56, 1e-9, 'DE-Betragsformat sollte korrekt parsen');
    assertClose(parseExpenseAmount('1,234.56'), 1234.56, 1e-9, 'EN-Betragsformat sollte korrekt parsen');
    const parsedCategories = parseCategoryCsv([
        'Kategorie;Betrag',
        'Miete;-1.000,00',
        'Miete;-250,50',
        'Ignore;abc'
    ].join('\n'));
    assertClose(parsedCategories.Miete, -1250.5, 1e-9, 'CSV-Parser sollte Kategorien aggregieren');

    const emptyStore = createEmptyExpensesStore(2026);
    const yearData = getExpensesYearData(emptyStore, 2026);
    getExpensesMonthData(yearData, 1).profiles.default = { categories: { Miete: -1000 } };
    getExpensesMonthData(yearData, 2).profiles.default = { categories: { Versicherung: -1040 } };
    const stats = computeYearStats({ yearData, annualBudget: 12000, monthlyBudget: 1000 });
    assertEqual(computeSpent({ A: -20, B: 5 }).spent, 15, 'computeSpent sollte Vorzeichen-symmetrisch summieren');
    assertEqual(stats.monthsWithData, 2, 'Metriken sollten Datenmonate zählen');
    assertEqual(stats.ytdBudget, 2000, 'YTD-Budget sollte nur Datenmonate berücksichtigen');
    assertClose(stats.annualForecast, 12240, 1e-9, 'Forecast sollte ab 2 Monaten den Median nutzen');

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
    seedMonth(2026, 1, { 'Miete': -1000 });

    const dom = createDomRefs();
    initExpensesTab(dom);
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

    const file = {
        text: async () => [
            'Kategorie;Betrag',
            'Versicherungen;-1.200,50',
            'Versicherungen;-300',
            'Krankenkasse;-99,50',
            'Ignorieren;abc'
        ].join('\n')
    };
    dom.expenses.csvInput.value = 'selected.csv';
    dom.expenses.csvInput.trigger('change', {
        target: {
            files: [file],
            value: 'selected.csv'
        }
    });
    await new Promise(resolve => setTimeout(resolve, 0));

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
    initExpensesTab(recoveryDom, {
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
    resetBeforeExport.click();
    assertEqual(resetPrompts.length, 0, 'Gesperrter Reset fragt nicht nach Bestaetigung');
    assertEqual(global.localStorage.getItem(STORAGE_KEY), corruptRaw, 'Gesperrter Reset ueberschreibt keine Daten');

    recoveryPanel.querySelector('[data-action="expenses-recovery-export"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assertEqual(downloadedRecovery.raw, corruptRaw, 'UI-Recovery exportiert den bytegleichen Rohinhalt');
    assert(downloadedFilename.startsWith('balance-ausgaben-recovery-2026-07-14'), 'Recovery-Dateiname ist datiert und generisch');
    recoveryPanel = recoveryDom.expenses.table.querySelector('[data-expenses-recovery="corrupt"]');
    const resetAfterExport = recoveryPanel.querySelector('[data-action="expenses-recovery-reset"]');
    assertEqual(resetAfterExport.disabled, false, 'Erfolgreicher Recovery-Export schaltet Reset frei');

    resetAfterExport.click();
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

    failResetFlush = false;
    recoveryDom.expenses.table.querySelector('[data-action="expenses-recovery-reset"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    const resetStore = JSON.parse(global.localStorage.getItem(STORAGE_KEY));
    assertEqual(resetPrompts.length, 3, 'Jeder Reset-Versuch nutzt einen eigenen Bestaetigungsschritt');
    assertEqual(resetStore.version, 1, 'Bestaetigter Reset erzeugt einen gueltigen Ausgabenstore');
    assertEqual(Object.keys(resetStore.years).length, 0, 'Bestaetigter Reset startet ohne erfundene Finanzdaten');
    assertEqual(
        recoveryDom.expenses.table.querySelector('[data-expenses-recovery="corrupt"]'),
        null,
        'Nach bestaetigtem Reset wird der gesperrte Recovery-Bereich verlassen'
    );

    console.log('✅ Balance expenses tests passed');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevConfirm === undefined) delete global.confirm; else global.confirm = prevConfirm;
}

console.log('--- Balance Expenses Tests Completed ---');
