import {
    formatCurrency,
    renderCareSection,
    renderHeatmap,
    renderKpiCard,
    renderKpiDashboard,
    renderStressSection,
    renderSummary
} from '../app/simulator/results-renderers.js';

console.log('--- Results Renderers Tests ---');

const previousDocument = globalThis.document;

class MockElement {
    constructor(tagName = 'div', ownerDocument = null) {
        this.tagName = tagName.toUpperCase();
        this.ownerDocument = ownerDocument;
        this.id = '';
        this.innerHTML = '';
        this.style = {};
        this.parentNode = null;
        this.nextSibling = null;
        this.insertions = [];
        this.removed = false;
    }

    insertBefore(node, referenceNode) {
        node.parentNode = this;
        this.insertions.push({ node, referenceNode });
        if (node.id) this.ownerDocument?.elements.set(node.id, node);
        return node;
    }

    remove() {
        this.removed = true;
        if (this.id) this.ownerDocument?.elements.delete(this.id);
    }
}

function createDocument() {
    const simpleMode = { enabled: false };
    const documentRef = {
        elements: new Map(),
        body: {
            classList: {
                contains(className) {
                    return className === 'mode-simple' && simpleMode.enabled;
                }
            }
        },
        createElement(tagName) {
            return new MockElement(tagName, documentRef);
        },
        getElementById(id) {
            return documentRef.elements.get(id) || null;
        }
    };
    return { documentRef, simpleMode };
}

function card(title, tone = 'default') {
    return {
        title,
        value: `${title}-value`,
        description: `${title}-description`,
        tooltip: `${title}-tooltip`,
        tone
    };
}

const { documentRef, simpleMode } = createDocument();
globalThis.document = documentRef;

try {
    const toneCards = [
        card('Default'),
        card('Success', 'success'),
        card('Warning', 'warning'),
        card('Danger', 'danger')
    ];
    const cardHtml = toneCards.map(renderKpiCard).join('');
    assert(cardHtml.includes('kpi-card ') && cardHtml.includes('Default-tooltip'), 'KPI card should render its default tone and tooltip');
    assert(cardHtml.includes('is-green') && cardHtml.includes('is-amber') && cardHtml.includes('is-red'), 'KPI card should map all semantic tones');
    assert(renderKpiCard({ title: 'Fallback', value: '1', tone: 'unknown' }).includes('title="Fallback"'), 'KPI card should fall back from missing tooltip and description to its title');

    const summary = new MockElement('div', documentRef);
    renderSummary(summary, toneCards);
    assert(summary.innerHTML.includes('Default') && summary.innerHTML.includes('Danger'), 'Expanded summary should render every card');
    assert(summary.innerHTML.includes('is-success') && summary.innerHTML.includes('is-warning') && summary.innerHTML.includes('is-danger'), 'Summary should map all semantic tones');

    simpleMode.enabled = true;
    renderSummary(summary, toneCards);
    assert(summary.innerHTML.includes('Warning') && !summary.innerHTML.includes('Danger'), 'Simple summary should render only the first three cards');
    const unchangedSummary = summary.innerHTML;
    renderSummary(null, toneCards);
    renderSummary(summary, null);
    assertEqual(summary.innerHTML, unchangedSummary, 'Summary should ignore missing containers or card arrays');
    simpleMode.enabled = false;

    const dashboard = new MockElement('div', documentRef);
    renderKpiDashboard(dashboard, {
        primary: [card('Primary', 'success')],
        detailSections: [
            { title: 'Risk details', kpis: [card('Risk', 'warning')] },
            { title: 'Care details', kpis: [card('Care', 'danger')] }
        ]
    });
    assert(dashboard.innerHTML.includes('Wichtigste Kennzahlen') && dashboard.innerHTML.includes('Risk details') && dashboard.innerHTML.includes('Care details'), 'Dashboard should render primary and detail sections');
    assertEqual(dashboard.style.display, 'block', 'Dashboard should become visible after rendering');
    const unchangedDashboard = dashboard.innerHTML;
    renderKpiDashboard(null, { primary: [], detailSections: [] });
    renderKpiDashboard(dashboard, null);
    assertEqual(dashboard.innerHTML, unchangedDashboard, 'Dashboard should ignore missing input contracts');

    const stressParent = new MockElement('section', documentRef);
    const stressReference = new MockElement('div', documentRef);
    stressReference.parentNode = stressParent;
    const existingStress = new MockElement('div', documentRef);
    existingStress.id = 'stressKpiResults';
    documentRef.elements.set(existingStress.id, existingStress);
    renderStressSection(stressReference, null);
    assert(existingStress.removed, 'Stress renderer should remove a stale section before handling a null result');
    assertEqual(stressParent.insertions.length, 0, 'Null stress metrics should not insert a replacement section');

    renderStressSection(stressReference, {
        presetLabel: 'Crash fixture',
        years: 4,
        kpis: toneCards
    });
    assertEqual(stressParent.insertions.length, 1, 'Stress renderer should insert exactly one current section');
    const insertedStress = stressParent.insertions[0];
    assertEqual(insertedStress.referenceNode, stressReference.nextSibling, 'Stress renderer should insert after the reference container');
    assert(insertedStress.node.innerHTML.includes('Crash fixture') && insertedStress.node.innerHTML.includes('ersten 4 Jahre'), 'Stress renderer should expose preset and duration');
    const insertionCount = stressParent.insertions.length;
    renderStressSection(null, { presetLabel: 'ignored', years: 1, kpis: [] });
    assertEqual(stressParent.insertions.length, insertionCount, 'Stress renderer should ignore a missing reference container');

    const heatmap = new MockElement('div', documentRef);
    renderHeatmap(heatmap, {
        heatmap: [new Uint32Array([1, 0])],
        bins: [0, 1, Infinity],
        totalRuns: 1,
        extraKPI: { timeShareQuoteAbove45: 0 }
    });
    assert(heatmap.innerHTML.includes('<svg') && heatmap.innerHTML.includes('</svg>'), 'Heatmap renderer should project the prepared matrix to SVG');
    assertEqual(heatmap.style.display, 'block', 'Heatmap should become visible after rendering');
    const unchangedHeatmap = heatmap.innerHTML;
    renderHeatmap(null, {});
    renderHeatmap(heatmap, null);
    assertEqual(heatmap.innerHTML, unchangedHeatmap, 'Heatmap renderer should ignore missing contracts');

    const careSummary = new MockElement('div', documentRef);
    const careContainer = new MockElement('section', documentRef);
    renderCareSection(careSummary, careContainer, null);
    assertEqual(careContainer.style.display, 'none', 'Care renderer should hide an empty care section');
    renderCareSection(careSummary, careContainer, { cards: [card('P1'), card('P2', 'warning')] });
    assert(careSummary.innerHTML.includes('P1') && careSummary.innerHTML.includes('P2'), 'Care renderer should render every prepared care card');
    assertEqual(careContainer.style.display, 'block', 'Care renderer should reveal a populated section');
    const unchangedCare = careSummary.innerHTML;
    renderCareSection(null, careContainer, { cards: [] });
    renderCareSection(careSummary, null, { cards: [] });
    assertEqual(careSummary.innerHTML, unchangedCare, 'Care renderer should ignore missing target containers');

    const formatted = formatCurrency(1234.5);
    assert(typeof formatted === 'string' && formatted.length > 0, 'Currency re-export should retain the safe formatter contract');
} finally {
    if (previousDocument === undefined) {
        delete globalThis.document;
    } else {
        globalThis.document = previousDocument;
    }
}

console.log('--- Results Renderers Tests Completed ---');
