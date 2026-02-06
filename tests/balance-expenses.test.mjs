import { initExpensesTab, updateExpensesBudget, rollExpensesYear } from '../app/balance/balance-expenses.js';

console.log('--- Balance Expenses Tests ---');

const STORAGE_KEY = 'balance_expenses_v1';

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

try {
    global.localStorage = new MockLocalStorage();
    global.window = { localStorage: global.localStorage };
    global.document = new MockDocument();

    writeStore({ version: 1, activeYear: 2026, years: { '2026': { months: {} } } });
    seedMonth(2026, 1, { 'Miete': -1000 });

    const dom = createDomRefs();
    initExpensesTab(dom);
    updateExpensesBudget({ monthlyBudget: 1000, annualBudget: 12000 });

    // 1) Ein Datenmonat => Ø/Monat
    assert(dom.expenses.forecastSub.textContent.includes('Ø/Monat'), 'Forecast sollte bei 1 Datenmonat mit Durchschnitt arbeiten');
    assert(dom.expenses.forecastSub.textContent.includes('Datenmonate: 1/12'), 'Forecast-Unterzeile sollte 1 Datenmonat anzeigen');
    const janTotal = dom.expenses.table.querySelector('[data-month-total="1"] [data-role="total"]');
    assert(janTotal && janTotal.classList.contains('budget-ok'), 'Januar-Gesamt sollte bei Budgettreffer als OK markiert sein');
    assert(dom.expenses.ytdValue.classList.contains('budget-ok'), 'YTD sollte bei exaktem Soll als OK markiert sein');

    // 2) Zwei Datenmonate => Median + 5%-Warnzone
    seedMonth(2026, 2, { 'Versicherung': -1040 });
    updateExpensesBudget({ monthlyBudget: 1000, annualBudget: 12000 });
    assert(dom.expenses.forecastSub.textContent.includes('Median/Monat'), 'Forecast sollte ab 2 Datenmonaten den Median nutzen');
    assert(dom.expenses.forecastSub.textContent.includes('Datenmonate: 2/12'), 'Forecast-Unterzeile sollte 2 Datenmonate anzeigen');
    assert(dom.expenses.annualForecast.classList.contains('budget-warn'), 'Jahresprognose in 5%-Band sollte Warnstatus haben');
    assert(dom.expenses.ytdValue.classList.contains('budget-warn'), 'YTD in 5%-Band sollte Warnstatus haben');
    const febTotal = dom.expenses.table.querySelector('[data-month-total="2"] [data-role="total"]');
    assert(febTotal && febTotal.classList.contains('budget-warn'), 'Februar-Gesamt in 5%-Band sollte Warnstatus haben');

    // 3) CSV-Import: Aggregation + DE-Zahlenformat
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

    // 4) Jahresabschluss: neues Jahr aktiv, Historie bleibt
    const newYear = rollExpensesYear();
    assertEqual(newYear, 2027, 'rollExpensesYear sollte auf Folgejahr wechseln');
    const rolledStore = readStore();
    assertEqual(Number(rolledStore.activeYear), 2027, 'Aktives Jahr sollte nach Roll auf Folgejahr stehen');
    assert(rolledStore.years['2026']?.months?.['1'], 'Historische Monatsdaten müssen erhalten bleiben');
    assert(rolledStore.years['2027'] && typeof rolledStore.years['2027'] === 'object', 'Folgejahr sollte angelegt werden');
    assertEqual(Object.keys(rolledStore.years['2027'].months || {}).length, 0, 'Folgejahr sollte ohne Monatsdaten starten');
    assertEqual(dom.expenses.yearSelect.value, '2027', 'Jahr-Select sollte nach Roll auf Folgejahr springen');
    assertEqual(dom.expenses.ytdSub.textContent, 'Soll: —', 'YTD-Soll sollte im leeren Folgejahr nicht auf Kalender, sondern Datenmonate basieren');

    console.log('✅ Balance expenses tests passed');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('--- Balance Expenses Tests Completed ---');
