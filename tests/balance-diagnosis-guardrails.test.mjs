import { buildGuardrails } from '../app/balance/balance-diagnosis-guardrails.js';

console.log('--- Balance Diagnosis Guardrails Tests ---');

class MockNode {
    constructor(tag) {
        this.tagName = tag;
        this.children = [];
        this.className = '';
        this.textContent = '';
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

const prevDocument = global.document;
try {
    global.document = mockDocument;

    // --- TEST 1: Bear-Market Chip created (regime bear_*) ---
    {
        const fragment = buildGuardrails([
            { name: 'Bear Market', value: 'bear_deep', threshold: '-', status: 'warn' }
        ]);
        assertEqual(fragment.children.length, 1, 'Bear Market card should be created');
        const card = fragment.children[0];
        assert(card.className.includes('status-warn'), 'Bear Market card should be warn');
        assertEqual(card.children[0].textContent, 'Bear Market', 'Bear Market label should be preserved');
    }

    // --- TEST 2: Runway warning at <75% ---
    {
        const fragment = buildGuardrails([
            { name: 'Runway', value: '70%', threshold: '75%', status: 'warn' }
        ]);
        const card = fragment.children[0];
        assert(card.className.includes('status-warn'), 'Runway < 75% should be warn');
    }

    // --- TEST 3: Alarm chip for activeAlarm > 0 ---
    {
        const fragment = buildGuardrails([
            { name: 'Alarm', value: 'AKTIV', threshold: '-', status: 'danger' }
        ]);
        const card = fragment.children[0];
        assert(card.className.includes('status-danger'), 'Alarm should be danger');
    }

    // --- TEST 4: Refill-Cap hint in Bear-Market ---
    {
        const fragment = buildGuardrails([
            { name: 'Refill-Cap', value: 'aktiv', threshold: '-', status: 'info' }
        ]);
        const card = fragment.children[0];
        assert(card.className.includes('status-info'), 'Refill-Cap hint should be info');
    }

    // --- TEST 5: Correct color coding classes ---
    {
        // Status-Klassen müssen dem Ampel-Schema folgen.
        const fragment = buildGuardrails([
            { name: 'OK', value: 'ok', threshold: '-', status: 'ok' },
            { name: 'Warn', value: 'warn', threshold: '-', status: 'warn' },
            { name: 'Danger', value: 'danger', threshold: '-', status: 'danger' }
        ]);
        assert(fragment.children[0].className.includes('status-ok'), 'OK should be green');
        assert(fragment.children[1].className.includes('status-warn'), 'Warn should be yellow');
        assert(fragment.children[2].className.includes('status-danger'), 'Danger should be red');
    }

    // --- TEST 6: Chip order preserved ---
    {
        const fragment = buildGuardrails([
            { name: 'First', value: '1', threshold: '-', status: 'ok' },
            { name: 'Second', value: '2', threshold: '-', status: 'warn' },
            { name: 'Third', value: '3', threshold: '-', status: 'danger' }
        ]);
        assertEqual(fragment.children[0].children[0].textContent, 'First', 'First card should be first');
        assertEqual(fragment.children[1].children[0].textContent, 'Second', 'Second card should be second');
        assertEqual(fragment.children[2].children[0].textContent, 'Third', 'Third card should be third');
    }

    console.log('✅ Balance diagnosis guardrails tests passed');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
}

console.log('--- Balance Diagnosis Guardrails Tests Completed ---');
