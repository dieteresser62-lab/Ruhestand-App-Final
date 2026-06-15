import { buildDiagnosisChips, createChip, getChipColor, formatChipValue } from '../app/balance/balance-diagnosis-chips.js';

console.log('--- Balance Diagnosis Chips Tests ---');

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
    createTextNode: (text) => ({ nodeType: 3, textContent: String(text) }),
    createDocumentFragment: () => new MockNode('fragment')
};

const previousDocument = global.document;
try {
    global.document = mockDocument;

    // --- TEST 1: formatChipValue edge cases ---
    {
        // Fallbacks müssen auch bei leerem String greifen.
        assertEqual(formatChipValue(null, null, 'n/a'), 'n/a', 'Null should return fallback');
        assertEqual(formatChipValue(undefined, null, 'n/a'), 'n/a', 'Undefined should return fallback');
        assertEqual(formatChipValue('', null, 'n/a'), 'n/a', 'Empty string should return fallback');
        assertEqual(formatChipValue(-5, (v) => `v:${v}`), 'v:-5', 'Formatter should handle negative numbers');
    }

    // --- TEST 2: getChipColor thresholds + bounds ---
    {
        const thresholds = { warn: 4, danger: 6 };
        assertEqual(getChipColor(3, thresholds), 'ok', 'Below warn should be ok');
        assertEqual(getChipColor(4, thresholds), 'warn', 'At warn threshold should be warn');
        assertEqual(getChipColor(5, thresholds), 'warn', 'Between warn and danger should be warn');
        assertEqual(getChipColor(6, thresholds), 'danger', 'At danger threshold should be danger');
        assertEqual(getChipColor('warn'), 'warn', 'Status string should map to itself');
        assertEqual(getChipColor('unknown'), 'info', 'Unknown status should fall back to info');
    }

    // --- TEST 3: createChip basics ---
    {
        const chip = createChip('warn', 'Test', '42', 'Title');
        assert(chip.className.includes('status-warn'), 'Chip should include status class');
        assertEqual(chip.title, 'Title', 'Chip title should be set');
        const label = chip.children[0];
        assertEqual(label.textContent, 'Test', 'Label text should be set');
        const valueNode = chip.children[1];
        assertEqual(valueNode.textContent, '42', 'Value node should be appended');
    }

    // --- TEST 4: Runway smoothing note is visible ---
    {
        const fragment = buildDiagnosisChips({
            keyParams: {
                entnahmequoteDepot: 0.04,
                realerDepotDrawdown: 0.18
            },
            general: {
                marketSzenario: 'Bear',
                alarmActive: false,
                runwayMonate: 30,
                runwayTargetMonate: 48,
                runwayStatus: 'warn',
                runwayTargetQuelle: 'profil:smoothed',
                runwayTargetSmoothing: {
                    smoothingActive: true,
                    smoothingApplied: true,
                    rawTargetMonths: 60,
                    targetMonths: 48,
                    lowerTargetMonths: 36,
                    upperTargetMonths: 60,
                    severityPct: 50,
                    hardMinimumMonths: 24
                },
                deckungVorher: 80,
                deckungNachher: 95
            }
        });
        const note = fragment.children.find(node => node?.className === 'chip-note runway-source-note');
        assert(note?.textContent.includes('50% zwischen Normalziel'), 'Runway source note should explain smoothing severity');
        const runwayChip = fragment.children.find(node => node?.className?.includes('diag-chip') && node?.children?.[0]?.textContent === 'Runway');
        assert(runwayChip?.title.includes('Harte Mindestgrenze'), 'Runway chip tooltip should explain hard minimum');
    }

    console.log('✅ Balance diagnosis chips tests passed');
} finally {
    if (previousDocument === undefined) delete global.document; else global.document = previousDocument;
}

console.log('--- Balance Diagnosis Chips Tests Completed ---');
