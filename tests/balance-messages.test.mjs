import fs from 'node:fs';
import { initUIRenderer, UIRenderer } from '../app/balance/balance-renderer.js';
import { AppError, ValidationError } from '../app/balance/balance-config.js';
import { createBalanceExportDocument, createImportExportHandlers } from '../app/balance/balance-binder-imports.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import { getTestExecutionPolicy, getTestFiles } from './run-tests.mjs';

// Nur benötigte DOM-Operationen; textContent folgt der echten Kindknoten-Semantik.
class Element {
    constructor() {
        this.children = [];
        this.className = '';
        this.attributes = {};
        this.dataset = {};
        this.listeners = {};
        this.classList = {
            add: name => { this.className = `${this.className} ${name}`.trim(); },
            remove: name => { this.className = this.className.split(' ').filter(c => c !== name).join(' '); }
        };
    }
    set textContent(value) { this.children = []; this.text = String(value); }
    get textContent() { return (this.text || '') + this.children.map(child => child.textContent).join(''); }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    appendChild(child) { child.parentNode = this; this.children.push(child); }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    click() { this.listeners.click?.(); }
    focus() { document.activeElement = this; }
    replaceChildren(...children) { this.text = ''; this.children = children; }
}

class Clock {
    now = 0;
    nextId = 0;
    pending = new Map();
    callbacks = new Map();
    setTimeout = (callback, delay) => {
        const id = ++this.nextId;
        this.pending.set(id, { callback, due: this.now + delay });
        this.callbacks.set(id, callback);
        return id;
    };
    clearTimeout = id => { this.pending.delete(id); };
    advance(ms) {
        const end = this.now + ms;
        while (true) {
            const next = [...this.pending.entries()].filter(([, timer]) => timer.due <= end)
                .sort((a, b) => a[1].due - b[1].due)[0];
            if (!next) break;
            const [id, timer] = next;
            this.now = timer.due;
            this.pending.delete(id);
            timer.callback();
        }
        this.now = end;
    }
}

const savedGlobals = Object.fromEntries(['document', 'setTimeout', 'clearTimeout']
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const clock = new Clock();
const refs = () => ({ containers: { error: new Element(), toast: new Element(), actionError: new Element() }, inputs: { field: new Element() } });
const toastText = dom => dom.containers.toast.children.find(child => child.className === 'toast-text')?.textContent || '';

try {
    const diagnosisButton = new Element();
    globalThis.document = {
        createElement: () => new Element(),
        getElementById: id => id === 'openDiagnosisBtn' ? diagnosisButton : null,
        activeElement: null
    };
    globalThis.setTimeout = clock.setTimeout;
    globalThis.clearTimeout = clock.clearTimeout;
    const dom = refs();
    initUIRenderer(dom, null);
    const html = fs.readFileSync(new URL('../Balance.html', import.meta.url), 'utf8');
    assert(/id="error-container"[^>]*><\/div>\s*<div id="toast-container" role="status" aria-live="polite" aria-atomic="true"/.test(html),
        'Der unabhängige atomare Statusbereich steht unmittelbar neben dem Fehlerkanal');
    assert(/id="action-error-container" role="alert" aria-live="assertive"/.test(html),
        'Aktionsfehler besitzen eine unabhängige zugängliche Meldungsregion');
    const actionTag = html.match(/<div id="action-error-container"[^>]*>/)[0];
    assert(actionTag.includes('tabindex="-1"') && !actionTag.includes('aria-label='),
        'Die leere HTML-Fehlerliste erzeugt auch vor der Initialisierung keinen beschrifteten Tab-Stopp');
    const assertEmptyActionContainer = container => {
        assertEqual(container.children.length, 0, 'Fehlerliste ist leer');
        assertEqual(container.attributes.tabindex, '-1', 'Leere Fehlerliste bleibt außerhalb der Tab-Reihenfolge');
        assertEqual(container.attributes['aria-label'], undefined, 'Leere Fehlerliste besitzt keine Warnregionsbeschriftung');
    };
    assertEmptyActionContainer(dom.containers.actionError);
    assertEqual(getTestExecutionPolicy('balance-messages.test.mjs').mode, 'isolated', 'Die Suite isoliert DOM und Uhr');
    assert(getTestFiles(new URL('.', import.meta.url)).includes('balance-messages.test.mjs'),
        'Der bestehende Runner entdeckt die neue Testdatei');

    // Jeder Typ muss denselben Laufzeit- und Kanalvertrag erfüllen, auch bei gleichen Texten.
    for (const [argument, name, symbol, className] of [
        [true, 'Erfolg: ', '✓', 'toast-success'],
        [false, 'Fehler: ', '!', 'toast-error'],
        ['info', 'Hinweis: ', 'i', 'toast-info']
    ]) {
        let typedDom = refs();
        initUIRenderer(typedDom, null);
        const original = '⚠️ ✅ <b>Originaltext</b>\nÄnderung unverändert.';
        UIRenderer.toast(original, argument);
        const [icon, type, text] = typedDom.containers.toast.children;
        assertEqual(icon.textContent, symbol, `${className}: eigenes Symbol`);
        assertEqual(icon.attributes['aria-hidden'], 'true', `${className}: Symbol ist dekorativ`);
        assertEqual(type.textContent, name, `${className}: zugänglicher Typ`);
        assertEqual(typedDom.containers.toast.className, className, `${className}: eigene Formklasse`);
        assertEqual(text.textContent, original, `${className}: Original einschließlich Symbolen bleibt bytegleich`);
        assertEqual(text.children.length, 0, `${className}: Original bleibt reiner Text`);
        clock.advance(5999);
        assertEqual(toastText(typedDom), original, `${className}: sichtbar bis 5999 ms`);
        clock.advance(1);
        assertEqual(toastText(typedDom), '', `${className}: Ablauf bei 6000 ms`);

        UIRenderer.toast('Vorher', argument);
        const replacedId = clock.nextId;
        clock.advance(1000);
        UIRenderer.toast(original, argument);
        assert(!clock.pending.has(replacedId), `${className}: ersetzter Timer ist storniert`);
        clock.callbacks.get(replacedId)();
        assertEqual(toastText(typedDom), original, `${className}: alter Callback erhält Folgetext`);
        const identicalId = clock.nextId;
        clock.advance(2500);
        UIRenderer.toast(original, argument);
        assert(!clock.pending.has(identicalId), `${className}: identischer Folgetext ersetzt Timer`);
        clock.callbacks.get(identicalId)();
        assertEqual(clock.pending.size, 1, `${className}: alte Callbacks verändern aktuellen Timer nicht`);
        clock.advance(5999);
        assertEqual(toastText(typedDom), original, `${className}: identischer Folgetext erhält volle Frist`);
        clock.advance(1);
        assertEqual(toastText(typedDom), '', `${className}: identischer Folgetext läuft regulär ab`);

        UIRenderer.handleError(new ValidationError([{ fieldId: 'field', message: 'Berechnungsdetail' }]));
        UIRenderer.handleActionError(new Error('Aktionsdetail'), 'annual');
        const calculationText = typedDom.containers.error.textContent;
        const actionText = typedDom.containers.actionError.textContent;
        UIRenderer.toast(original, argument);
        assertEqual(typedDom.containers.error.textContent, calculationText, `${className}: Toast erhält Berechnungsfehler`);
        assertEqual(typedDom.containers.actionError.textContent, actionText, `${className}: Toast erhält Aktionsfehler`);
        UIRenderer.clearError();
        assertEqual(toastText(typedDom), original, `${className}: Berechnungsbereinigung erhält Toast`);
        UIRenderer.handleError(new Error('Gleichzeitiger Fehler'));
        clock.advance(6000);
        assert(typedDom.containers.error.textContent.includes('Gleichzeitiger Fehler'), `${className}: Ablauf erhält Berechnungsfehler`);
        assertEqual(typedDom.containers.actionError.textContent, actionText, `${className}: Ablauf erhält Aktionsfehler`);

        UIRenderer.toast(original, argument);
        const beforeInit = clock.nextId;
        const oldDom = typedDom;
        typedDom = refs();
        initUIRenderer(typedDom, null);
        assertEqual(toastText(oldDom), '', `${className}: Neuinitialisierung leert alten Container`);
        assertEqual(clock.pending.size, 0, `${className}: Neuinitialisierung storniert Timer`);
        UIRenderer.toast(original, argument);
        clock.callbacks.get(beforeInit)();
        assertEqual(toastText(typedDom), original, `${className}: alter Callback erhält neuen Container`);
        const sameContainerId = clock.nextId;
        initUIRenderer(typedDom, null);
        assertEqual(toastText(typedDom), '', `${className}: Neuinitialisierung leert denselben Container`);
        UIRenderer.toast(original, argument);
        clock.callbacks.get(sameContainerId)();
        clock.advance(5999);
        assertEqual(toastText(typedDom), original, `${className}: Neuinitialisierung schützt volle Frist`);
        clock.advance(1);
        assertEqual(toastText(typedDom), '', `${className}: neue Initialisierung läuft regulär ab`);
    }
    initUIRenderer(dom, null);

    const literal = '<img src=x onerror=alert(1)> Vermögensstand gesichert.';
    UIRenderer.toast(literal);
    assertEqual(toastText(dom), literal, 'Meldungswortlaut einschließlich Sonderzeichen bleibt reiner Text');
    assertEqual(dom.containers.error.textContent, '', 'Toast schreibt nicht in den Fehlerkanal');
    const [successIcon, successType, text] = dom.containers.toast.children;
    assertEqual(successType.textContent, 'Erfolg: ', 'Erfolg wird zugänglich gekennzeichnet');
    assertEqual(successIcon.attributes['aria-hidden'], 'true', 'Dekoratives Symbol wird nicht angekündigt');
    assertEqual(text.children.length, 0, 'Meldung wird nicht als HTML interpretiert');
    clock.advance(5999);
    assertEqual(toastText(dom), literal, 'Toast bleibt bis unmittelbar vor 6000 ms sichtbar');
    clock.advance(1);
    assertEqual(dom.containers.toast.textContent, '', 'Toast verschwindet bei 6000 ms');
    assertEqual(clock.pending.size, 0, 'Ablauf hinterlässt keinen Timer');

    UIRenderer.toast('Vorher');
    const oldId = clock.nextId;
    clock.advance(1000);
    UIRenderer.toast('Nachher', false);
    assert(!clock.pending.has(oldId), 'Neuer Toast storniert den alten Timer');
    const [errorIcon, errorType] = dom.containers.toast.children;
    assertEqual(errorType.textContent, 'Fehler: ', 'Fehlertoast wird zugänglich gekennzeichnet');
    assert(errorIcon.textContent !== successIcon.textContent, 'Die Typen verwenden unterschiedliche Symbole');
    assertEqual(dom.containers.toast.className, 'toast-error', 'Fehlertoast verwendet die eigene Formklasse');
    clock.callbacks.get(oldId)();
    assertEqual(toastText(dom), 'Nachher', 'Explizit ausgeführter alter Callback löscht keinen neuen Toast');
    assertEqual(clock.pending.size, 1, 'Alter Callback verändert den aktuellen Timer nicht');
    clock.advance(5999);
    assertEqual(toastText(dom), 'Nachher', 'Nachfolgetoast hat eine eigene vollständige Frist');
    clock.advance(1);
    assertEqual(toastText(dom), '', 'Nachfolgetoast läuft genau an seiner Frist ab');

    UIRenderer.toast('Identisch');
    const identicalId = clock.nextId;
    clock.advance(2500);
    UIRenderer.toast('Identisch');
    clock.callbacks.get(identicalId)();
    clock.advance(5999);
    assertEqual(toastText(dom), 'Identisch', 'Identischer Folgetext erhält eine neue Identität und volle Frist');
    clock.advance(1);
    assertEqual(toastText(dom), '', 'Auch identischer Folgetext läuft erst an seiner eigenen Frist ab');

    UIRenderer.toast('Unabhängig');
    UIRenderer.handleError(new ValidationError([{ fieldId: 'field', message: 'Detail' }]));
    assert(dom.containers.error.textContent.includes('Detail'), 'Validierungsdetails bleiben im Fehlerkanal');
    assert(dom.inputs.field.className.includes('input-error'), 'Berechnungsfehler markiert sein Feld');
    UIRenderer.clearError();
    assertEqual(dom.containers.error.textContent, '', 'clearError leert weiterhin den Fehlerkanal');
    assertEqual(dom.inputs.field.className, '', 'clearError entfernt weiterhin Feldmarkierungen');
    assertEqual(toastText(dom), 'Unabhängig', 'clearError lässt den Toast unverändert');
    UIRenderer.handleError(new Error('Gleichzeitig'));
    clock.advance(6000);
    assert(dom.containers.error.textContent.includes('Gleichzeitig'), 'Toastablauf löscht keinen gleichzeitigen Fehler');

    UIRenderer.handleActionError(new AppError('Import mit Recovery [rollback]'), 'balance-import');
    assertEqual(dom.containers.actionError.attributes.tabindex, '0', 'Erster Fehler aktiviert den Tastaturzugang zur Liste');
    assertEqual(dom.containers.actionError.attributes['aria-label'], 'Aktionsfehler', 'Befüllte Liste besitzt ihre Beschriftung');
    UIRenderer.handleActionError(new ValidationError([{ fieldId: 'field', message: 'Aktionsdetail' }]), 'annual');
    const actionContainer = dom.containers.actionError;
    assertEqual(actionContainer.children.length, 2, 'Zwei Bereiche bleiben gleichzeitig sichtbar');
    const importEntry = actionContainer.children[0];
    const annualEntry = actionContainer.children[1];
    assertEqual(importEntry.children[0].textContent, 'Ein interner Fehler ist aufgetreten: Import mit Recovery [rollback]',
        'Aktionsfehler erhält den AppError-Präfix samt Code und Recoverytext');
    assert(annualEntry.children[0].textContent.includes('Aktionsdetail'), 'ValidationError in einer Aktion behält seine Liste');
    assertEqual(dom.inputs.field.className, '', 'Aktionsvalidierung markiert keine Berechnungsfelder');
    UIRenderer.handleError(new ValidationError([{ fieldId: 'field', message: 'Berechnungsdetail' }]));
    assert(dom.inputs.field.className.includes('input-error'), 'Gleichzeitige Berechnungsvalidierung markiert ihr Feld');
    UIRenderer.toast('Weiter');
    UIRenderer.clearError();
    clock.advance(6000);
    assertEqual(actionContainer.children.length, 2, 'Berechnungsbereinigung und Toastablauf erhalten beide Aktionsfehler');
    const close = importEntry.children[1];
    assertEqual(close.type, 'button', 'Schließen ist ein echter Knopf ohne Formularsubmit');
    assertEqual(close.attributes['aria-label'], 'Fehlermeldung schließen', 'Schließen besitzt den kurzen exakten zugänglichen Namen');
    const assertDescriptions = container => {
        const ids = container.children.map(entry => entry.children[0].id);
        assertEqual(new Set(ids).size, ids.length, 'Alle aktuellen Fehlertexte haben unterschiedliche IDs');
        for (const entry of container.children) {
            assert(Boolean(entry.children[0].id), 'Fehlertext besitzt eine ID');
            assertEqual(entry.children[1].attributes['aria-describedby'], entry.children[0].id,
                'Beschreibung verweist auf den eigenen vorhandenen Fehlertext');
        }
    };
    assertDescriptions(actionContainer);
    close.focus();
    close.click();
    assertEqual(actionContainer.children.length, 1, 'Schließen entfernt genau einen Bereich');
    assertEqual(actionContainer.children[0], annualEntry, 'Anderer Bereich bleibt unverändert');
    assertEqual(actionContainer.attributes.tabindex, '0', 'Verbleibender Fehler erhält den Tastaturzugang zur Liste');
    assertEqual(document.activeElement, annualEntry.children[1], 'Schließen fokussiert den nächsten Knopf');
    UIRenderer.handleActionError(new Error('Neu'), 'balance-import');
    close.click();
    assertEqual(actionContainer.children.length, 2, 'Ein veralteter Schließenknopf entfernt keinen neuen Fehler');
    assertEqual(document.activeElement, annualEntry.children[1], 'Veralteter Knopf zieht keinen Fokus ab');
    const replacementBefore = actionContainer.children[1];
    UIRenderer.handleActionError(new Error('Ersatz'), 'balance-import');
    const replacement = actionContainer.children[1];
    assert(replacement.children[0].id !== replacementBefore.children[0].id, 'Ersatzfehler erhält eine neue Text-ID');
    assertEqual(actionContainer.attributes.tabindex, '0', 'Fehlerersatz erhält den Tastaturzugang');
    assertDescriptions(actionContainer);
    diagnosisButton.focus();
    replacementBefore.children[1].click();
    assertEqual(document.activeElement, diagnosisButton, 'Knopf des ersetzten Fehlers bleibt ohne Fokuswirkung');
    replacement.children[1].focus();
    replacement.children[1].click();
    assertEqual(document.activeElement, annualEntry.children[1], 'Letzter Listeneintrag fokussiert den verbleibenden Nachbarn');
    annualEntry.children[1].click();
    assertEqual(document.activeElement, diagnosisButton, 'Letzter Fehler übergibt Fokus an den Diagnoseknopf');
    assertEmptyActionContainer(actionContainer);
    UIRenderer.handleActionError(new Error('Automatische Bereinigung'), 'automatic');
    assertEqual(actionContainer.attributes.tabindex, '0', 'Erneuter Fehler aktiviert den Tastaturzugang wieder');
    UIRenderer.clearActionError('automatic');
    assertEmptyActionContainer(actionContainer);
    UIRenderer.handleActionError(new Error('Neu'), 'balance-import');
    UIRenderer.handleActionError(new Error('Jahr'), 'annual');
    diagnosisButton.focus();
    UIRenderer.clearActionError('annual');
    assertEqual(actionContainer.children.length, 1, 'Gezieltes Rücksetzen lässt andere Bereiche stehen');
    assertEqual(document.activeElement, diagnosisButton, 'Automatische Bereichsbereinigung verändert den Fokus nicht');
    const beforeReinit = actionContainer.children[0];

    UIRenderer.toast('Alter DOM');
    const beforeInitId = clock.nextId;
    const newDom = refs();
    newDom.containers.actionError.setAttribute('tabindex', '0');
    newDom.containers.actionError.setAttribute('aria-label', 'Aktionsfehler');
    newDom.containers.actionError.appendChild(new Element());
    initUIRenderer(newDom, null);
    assertEqual(clock.pending.size, 0, 'Neuinitialisierung storniert alte Timer');
    assertEqual(actionContainer.children.length, 0, 'Neuinitialisierung beendet den flüchtigen Aktionszustand');
    assertEmptyActionContainer(actionContainer);
    assertEmptyActionContainer(newDom.containers.actionError);
    UIRenderer.handleActionError(new Error('Nach Neuinitialisierung'), 'balance-import');
    assertEqual(newDom.containers.actionError.attributes.tabindex, '0', 'Fehler nach Neuinitialisierung aktiviert den Tastaturzugang');
    assert(newDom.containers.actionError.children[0].children[0].id !== beforeReinit.children[0].id,
        'Neuinitialisierung verwendet keine alte Text-ID erneut');
    beforeReinit.children[1].click();
    assertEqual(newDom.containers.actionError.children.length, 1, 'Alter Knopf bleibt nach Neuinitialisierung wirkungslos');
    assertEqual(document.activeElement, diagnosisButton, 'Alter Knopf nach Neuinitialisierung verändert den Fokus nicht');
    assertDescriptions(newDom.containers.actionError);
    assertEqual(toastText(dom), '', 'Neuinitialisierung entfernt alten Toastzustand');
    UIRenderer.toast('Neuer DOM');
    clock.callbacks.get(beforeInitId)();
    assertEqual(toastText(newDom), 'Neuer DOM', 'Alter Callback kann den neu gebundenen Container nicht löschen');
    const sameContainerId = clock.nextId;
    initUIRenderer(newDom, null);
    assertEmptyActionContainer(newDom.containers.actionError);
    assertEqual(toastText(newDom), '', 'Neuinitialisierung desselben Containers setzt den Zustand zurück');
    UIRenderer.toast('Neue Initialisierung');
    clock.callbacks.get(sameContainerId)();
    assertEqual(toastText(newDom), 'Neue Initialisierung', 'Identitätsprüfung schützt auch denselben Container');
    clock.advance(5999);
    assertEqual(toastText(newDom), 'Neue Initialisierung', 'Neuer Initialisierungszustand hat die volle Frist');
    clock.advance(1);
    assertEqual(toastText(newDom), '', 'Neuer Initialisierungszustand läuft regulär ab');

    const noToast = { containers: { error: new Element() }, inputs: {} };
    initUIRenderer(noToast, null);
    UIRenderer.handleError(new Error('Erhalten'));
    UIRenderer.toast('Kein Fallback');
    assert(noToast.containers.error.textContent.includes('Erhalten'), 'Fehlender Toastbereich überschreibt keinen Fehler');
    assertEqual(clock.pending.size, 0, 'Fehlender Toastbereich erzeugt keinen Timer');

    // Tatsächlicher Exporthandler: Warnung ist Hinweis, bestätigter Export bleibt Erfolg.
    const loadState = StorageManager.loadState;
    try {
        const exportDom = refs();
        initUIRenderer(exportDom, null);
        const handlers = createImportExportHandlers({ dom: exportDom, update: () => {}, debouncedUpdate: () => {} });
        const validState = {
            inputs: { aktuellesAlter: 67, floorBedarf: 24000, flexBedarf: 12000, minimumFlexAnnual: 2000, tagesgeld: 50000 },
            lastState: { cumulativeInflationFactor: 1, lastInflationAppliedAtAge: 66, taxState: { lossCarry: 0 } }
        };
        for (const state of [validState, { ...validState, wealthHistory: { schemaVersion: 2, entries: [] } }]) {
            StorageManager.loadState = () => state;
            const warning = createBalanceExportDocument(state).validationWarnings?.[0];
            assertEqual(Boolean(warning), Boolean(state.wealthHistory), 'Exportfixture deckt Erfolg und Validierungswarnung ab');
            handlers.handleExport();
            assertEqual(toastText(exportDom), warning
                ? `Export erstellt mit Validierungshinweis [${warning.code}]: ${warning.message}`
                : 'Export erstellt.', 'Exporttext bleibt unverändert');
            assertEqual(exportDom.containers.toast.className, warning ? 'toast-info' : 'toast-success',
                'Export mit Warnung ist Hinweis; bestätigter Export bleibt Erfolg');
        }
    } finally {
        StorageManager.loadState = loadState;
    }
} finally {
    initUIRenderer(null, null);
    for (const [key, descriptor] of Object.entries(savedGlobals)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
    }
}
assertEqual(clock.pending.size, 0, 'Cleanup hinterlässt keinen Toasttimer');
