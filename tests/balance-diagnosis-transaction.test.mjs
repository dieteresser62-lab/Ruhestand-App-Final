import { buildTransactionDiagnostics } from '../app/balance/balance-diagnosis-transaction.js';

console.log('--- Balance Diagnosis Transaction Tests ---');

class MockNode {
    constructor(tag) {
        this.tagName = tag;
        this.children = [];
        this.className = '';
        this.textContent = '';
        this.title = '';
    }
    append(...nodes) {
        nodes.forEach(node => this.appendChild(node));
    }
    appendChild(node) {
        this.children.push(node);
        return node;
    }
}

const mockDocument = {
    createElement: (tag) => new MockNode(tag),
    createDocumentFragment: () => new MockNode('fragment')
};

// Flatten node tree to string to assert content.
function collectText(node) {
    if (!node) return '';
    if (typeof node.textContent === 'string' && node.children.length === 0) return node.textContent;
    let text = node.textContent || '';
    if (Array.isArray(node.children)) {
        node.children.forEach(child => {
            text += collectText(child);
        });
    }
    return text;
}

const previousDocument = global.document;
try {
    global.document = mockDocument;

    // --- TEST 1: Empty diagnostics ---
    {
        const fragment = buildTransactionDiagnostics(null);
        assert(fragment.children.length === 1, 'Empty diagnostics should return one element');
        assert(fragment.children[0].className.includes('diag-empty-state'), 'Empty state should be marked');
    }

    // --- TEST 2: Guardrail block status ---
    {
        const diag = {
            wasTriggered: true,
            blockReason: 'guardrail_block',
            blockedAmount: 500,
            potentialTrade: { direction: 'Verkauf', netAmount: 1000 }
        };
        const fragment = buildTransactionDiagnostics(diag);
        const card = fragment.children[0];
        assert(card.className.includes('status-danger'), 'Guardrail block should be danger status');
        const text = collectText(card);
        assert(text.includes('Ja'), 'Summary should indicate triggered');
        assert(text.includes('Verkauf'), 'Potential trade should be shown');
    }

    // --- TEST 3: Emergency / cap block ---
    {
        const diag = {
            wasTriggered: false,
            blockReason: 'cap_active',
            blockedAmount: 0
        };
        const fragment = buildTransactionDiagnostics(diag);
        const card = fragment.children[0];
        assert(card.className.includes('status-warn'), 'Cap active should be warn status');
        const text = collectText(card);
        assert(text.includes('Keine geplante Aktion'), 'Empty trade should render "Keine geplante Aktion"');
        assert(!text.includes('Unbekannte Aktion'), 'Empty trade should not render "Unbekannte Aktion"');
    }

    // --- TEST 4: Tranche selection rendering ---
    {
        const diag = {
            wasTriggered: true,
            blockReason: 'none',
            blockedAmount: 0,
            selectedTranches: [
                { name: 'ETF A', kind: 'aktien', taxPerEuro: 0.1, brutto: 500, steuer: 50 }
            ]
        };
        const fragment = buildTransactionDiagnostics(diag);
        const last = fragment.children[fragment.children.length - 1];
        const text = collectText(last);
        assert(text.includes('Tranchenauswahl'), 'Tranche selection card should be present');
        assert(text.includes('ETF A'), 'Tranche row should include name');
    }

    console.log('✅ Balance diagnosis transaction tests passed');
} finally {
    if (previousDocument === undefined) delete global.document; else global.document = previousDocument;
}

console.log('--- Balance Diagnosis Transaction Tests Completed ---');
