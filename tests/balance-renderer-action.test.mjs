import { ActionRenderer } from '../app/balance/balance-renderer-action.js';

console.log('--- Balance Renderer Action Tests ---');

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.children = [];
        this.style = { cssText: '' };
        this.id = '';
        this.className = '';
        this.classList = {
            add: (...classes) => {
                const current = new Set((this.className || '').split(/\s+/).filter(Boolean));
                classes.forEach(c => current.add(c));
                this.className = Array.from(current).join(' ');
            },
            remove: (...classes) => {
                const current = new Set((this.className || '').split(/\s+/).filter(Boolean));
                classes.forEach(c => current.delete(c));
                this.className = Array.from(current).join(' ');
            },
            contains: (cls) => (this.className || '').split(/\s+/).includes(cls)
        };
        this.textContent = '';
        this.parentNode = null;
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    append(...nodes) {
        nodes.forEach(node => {
            if (typeof node === 'string') {
                const textNode = new FakeElement('#text');
                textNode.textContent = node;
                this.appendChild(textNode);
            } else {
                this.appendChild(node);
            }
        });
    }

    remove() {
        if (!this.parentNode) return;
        this.parentNode.children = this.parentNode.children.filter(node => node !== this);
        this.parentNode = null;
    }
}

function collectText(node) {
    let out = node?.textContent || '';
    const children = Array.isArray(node?.children) ? node.children : [];
    children.forEach(child => {
        out += collectText(child);
    });
    return out;
}

global.document = {
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (text) => {
        const node = new FakeElement('#text');
        node.textContent = String(text ?? '');
        return node;
    }
};

// Ensure renderer does not emit synthetic 0,00 lines for Profilverbund when no material profile actions exist.
{
    global.window = {
        __profilverbundActionResults: [
            { name: 'Dieter', action: { type: 'NONE', quellen: [], verwendungen: {}, steuer: 0 } },
            { name: 'Karin', action: { type: 'NONE', quellen: [], verwendungen: {}, steuer: 0 } }
        ],
        __profilverbundProfileSummaries: [
            { name: 'Dieter', totalAssets: 100000, tagesgeld: 10000, geldmarkt: 5000, gold: 0, depotAlt: 50000, depotNeu: 35000 },
            { name: 'Karin', totalAssets: 80000, tagesgeld: 8000, geldmarkt: 4000, gold: 0, depotAlt: 40000, depotNeu: 28000 }
        ]
    };

    const container = new FakeElement('div');
    const copyBtn = new FakeElement('button');
    copyBtn.id = 'copyAction';
    container.appendChild(copyBtn);

    const renderer = new ActionRenderer({
        outputs: { handlungsanweisung: container }
    });

    const warnBackup = console.warn;
    console.warn = () => { };
    renderer.renderAction(
        {
            type: 'TRANSACTION',
            title: 'Liquiditäts-Management',
            anweisungKlasse: 'anweisung-gelb',
            nettoErlös: 0,
            steuer: 0,
            quellen: [],
            verwendungen: {}
        },
        null,
        {},
        0
    );
    console.warn = warnBackup;

    const renderedText = collectText(container);
    assert(!renderedText.includes('Depotverkauf'), 'Should not render forced Depotverkauf zero rows');
    assert(!renderedText.includes('Tranchen'), 'Should not render forced Tranchen zero rows');
    assert(!renderedText.includes('Steuern (geschaetzt)'), 'Should not render forced Steuer zero rows');
}

// Split lines should hide zero-value Geldmarkt/Tagesgeld entries in Profilverbund rendering.
{
    global.window = {
        __profilverbundActionResults: [
            {
                name: 'Dieter',
                action: {
                    type: 'TRANSACTION',
                    quellen: [{ kind: 'liquiditaet', brutto: 59540.23, netto: 59540.23, steuer: 0 }],
                    verwendungen: { geldmarkt: 59540.23 },
                    steuer: 0,
                    nettoErlös: 0
                },
                input: { tagesgeld: 174000, geldmarktEtf: 370973 },
                spending: { monatlicheEntnahme: 2200 },
                targetLiquidity: 26800
            },
            {
                name: 'Karin',
                action: {
                    type: 'TRANSACTION',
                    quellen: [{ kind: 'liquiditaet', brutto: 80459.77, netto: 80459.77, steuer: 0 }],
                    verwendungen: { geldmarkt: 80459.77 },
                    steuer: 0,
                    nettoErlös: 0
                },
                input: { tagesgeld: 174000, geldmarktEtf: 370973 },
                spending: { monatlicheEntnahme: 2200 },
                targetLiquidity: 26800
            }
        ],
        __profilverbundProfileSummaries: []
    };

    const container = new FakeElement('div');
    const copyBtn = new FakeElement('button');
    copyBtn.id = 'copyAction';
    container.appendChild(copyBtn);

    const renderer = new ActionRenderer({
        outputs: { handlungsanweisung: container }
    });

    renderer.renderAction(
        {
            type: 'TRANSACTION',
            title: 'Liquiditäts-Management',
            anweisungKlasse: 'anweisung-gelb',
            nettoErlös: 0,
            steuer: 0,
            quellen: [{ kind: 'liquiditaet', brutto: 140000 }],
            verwendungen: { geldmarkt: 140000 }
        },
        { tagesgeld: 174000, geldmarktEtf: 370973 },
        { monatlicheEntnahme: 2200 },
        26800
    );

    const renderedText = collectText(container);
    assert(!renderedText.includes(': Geldmarkt-ETF0,00'), 'Should not show Profilverbund Geldmarkt-ETF rows with 0,00 €');
}

// Settlement breakdown should be rendered when taxSettlement data exists.
{
    global.window = {
        __profilverbundActionResults: null,
        __profilverbundProfileSummaries: null
    };

    const container = new FakeElement('div');
    const copyBtn = new FakeElement('button');
    copyBtn.id = 'copyAction';
    container.appendChild(copyBtn);

    const renderer = new ActionRenderer({
        outputs: { handlungsanweisung: container }
    });

    renderer.renderAction(
        {
            type: 'TRANSACTION',
            title: 'Verkauf',
            anweisungKlasse: 'anweisung-gelb',
            nettoErlös: 10000,
            steuer: 500,
            quellen: [{ kind: 'aktien_alt', brutto: 10500, netto: 10000, steuer: 500 }],
            verwendungen: {},
            taxSettlement: {
                taxBeforeLossCarry: 800,
                taxAfterLossCarry: 500,
                taxSavedByLossCarry: 300
            }
        },
        null,
        {},
        0
    );

    const renderedText = collectText(container);
    assert(renderedText.includes('Steuern vor Verlusttopf:'), 'Should render tax-before-loss-carry row');
    assert(renderedText.includes('Steuern nach Verlusttopf:'), 'Should render tax-after-loss-carry row');
    assert(renderedText.includes('Steuerersparnis Verlusttopf:'), 'Should render tax-saved row');
    assert(renderedText.includes('Steuern (final, Settlement)'), 'Should render final settlement tax row label');
}

// Zero settlement values should be hidden to stay consistent with other 0-row filters.
{
    global.window = {
        __profilverbundActionResults: null,
        __profilverbundProfileSummaries: null
    };

    const container = new FakeElement('div');
    const copyBtn = new FakeElement('button');
    copyBtn.id = 'copyAction';
    container.appendChild(copyBtn);

    const renderer = new ActionRenderer({
        outputs: { handlungsanweisung: container }
    });

    renderer.renderAction(
        {
            type: 'TRANSACTION',
            title: 'Verkauf',
            anweisungKlasse: 'anweisung-gelb',
            nettoErlös: 0,
            steuer: 0,
            quellen: [{ kind: 'aktien_alt', brutto: 0, netto: 0, steuer: 0 }],
            verwendungen: {},
            taxSettlement: {
                taxBeforeLossCarry: 0,
                taxAfterLossCarry: 0,
                taxSavedByLossCarry: 0
            }
        },
        null,
        {},
        0
    );

    const renderedText = collectText(container);
    assert(!renderedText.includes('Steuern vor Verlusttopf:'), 'Should hide tax-before row when value is 0');
    assert(!renderedText.includes('Steuern nach Verlusttopf:'), 'Should hide tax-after row when value is 0');
    assert(!renderedText.includes('Steuerersparnis Verlusttopf:'), 'Should hide tax-saved row when value is 0');
    assert(!renderedText.includes('Steuern (final, Settlement)'), 'Should hide final settlement tax row when value is 0');
}

console.log('✅ Balance renderer action tests passed');
