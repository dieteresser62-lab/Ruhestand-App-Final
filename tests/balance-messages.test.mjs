import fs from 'node:fs';
import { initUIRenderer, UIRenderer } from '../app/balance/balance-renderer.js';
import { ValidationError } from '../app/balance/balance-config.js';
import { getTestExecutionPolicy, getTestFiles } from './run-tests.mjs';

// Nur benötigte DOM-Operationen; textContent folgt der echten Kindknoten-Semantik.
class Element {
    constructor() {
        this.children = [];
        this.className = '';
        this.attributes = {};
        this.classList = {
            add: name => { this.className = `${this.className} ${name}`.trim(); },
            remove: name => { this.className = this.className.split(' ').filter(c => c !== name).join(' '); }
        };
    }
    set textContent(value) { this.children = []; this.text = String(value); }
    get textContent() { return (this.text || '') + this.children.map(child => child.textContent).join(''); }
    setAttribute(name, value) { this.attributes[name] = value; }
    appendChild(child) { this.children.push(child); }
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
const refs = () => ({ containers: { error: new Element(), toast: new Element() }, inputs: { field: new Element() } });
const toastText = dom => dom.containers.toast.children.find(child => child.className === 'toast-text')?.textContent || '';

try {
    globalThis.document = { createElement: () => new Element() };
    globalThis.setTimeout = clock.setTimeout;
    globalThis.clearTimeout = clock.clearTimeout;
    const dom = refs();
    initUIRenderer(dom, null);
    const html = fs.readFileSync(new URL('../Balance.html', import.meta.url), 'utf8');
    assert(/id="error-container"[^>]*><\/div>\s*<div id="toast-container" role="status" aria-live="polite" aria-atomic="true"/.test(html),
        'Der unabhängige atomare Statusbereich steht unmittelbar neben dem Fehlerkanal');
    assertEqual(getTestExecutionPolicy('balance-messages.test.mjs').mode, 'isolated', 'Die Suite isoliert DOM und Uhr');
    assert(getTestFiles(new URL('.', import.meta.url)).includes('balance-messages.test.mjs'),
        'Der bestehende Runner entdeckt die neue Testdatei');

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

    UIRenderer.toast('Alter DOM');
    const beforeInitId = clock.nextId;
    const newDom = refs();
    initUIRenderer(newDom, null);
    assertEqual(clock.pending.size, 0, 'Neuinitialisierung storniert alte Timer');
    assertEqual(toastText(dom), '', 'Neuinitialisierung entfernt alten Toastzustand');
    UIRenderer.toast('Neuer DOM');
    clock.callbacks.get(beforeInitId)();
    assertEqual(toastText(newDom), 'Neuer DOM', 'Alter Callback kann den neu gebundenen Container nicht löschen');
    const sameContainerId = clock.nextId;
    initUIRenderer(newDom, null);
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
} finally {
    initUIRenderer(null, null);
    for (const [key, descriptor] of Object.entries(savedGlobals)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
    }
}
assertEqual(clock.pending.size, 0, 'Cleanup hinterlässt keinen Toasttimer');
