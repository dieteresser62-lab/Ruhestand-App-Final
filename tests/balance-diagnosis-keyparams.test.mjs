import { buildKeyParams } from '../app/balance/balance-diagnosis-keyparams.js';

console.log('--- Balance Diagnosis KeyParams Tests ---');

function setupDom() {
    if (typeof document !== 'undefined') return;
    class Node {
        constructor(tag) {
            this.tagName = tag;
            this.children = [];
            this.className = '';
            this.dataset = {};
            this.textContent = '';
        }
        append(...nodes) {
            nodes.forEach(n => {
                if (n) this.children.push(n);
            });
        }
    }
    global.document = {
        createElement: (tag) => new Node(tag)
    };
}

function flattenText(node) {
    if (!node) return '';
    let out = node.textContent || '';
    const kids = Array.isArray(node.children) ? node.children : [];
    kids.forEach(k => {
        out += flattenText(k);
    });
    return out;
}

function findCardByLabel(grid, labelText) {
    const cards = Array.isArray(grid?.children) ? grid.children : [];
    return cards.find(card => {
        const children = Array.isArray(card?.children) ? card.children : [];
        const labelNode = children.find(ch => ch?.className === 'label');
        return labelNode?.textContent === labelText;
    }) || null;
}

setupDom();

{
    const grid = buildKeyParams({
        peakRealVermoegen: 1000000,
        currentRealVermoegen: 950000,
        cumulativeInflationFactor: 1.25,
        jahresentnahme: 48000,
        vpw: {
            enabled: true,
            status: 'active',
            horizonMethod: 'survival_quantile',
            horizonYears: 24,
            survivalQuantile: 0.9,
            vpwRate: 0.052,
            expectedRealReturn: 0.031,
            expectedReturnCape: 0.071,
            capeRatioUsed: 28.4,
            goGoActive: false,
            goGoMultiplier: 1.0,
            gesamtwert: 2150000,
            vpwTotal: 112000,
            dynamicFlex: 86000
        }
    });
    const txt = flattenText(grid);
    assert(txt.includes('Dynamic Flex (VPW)'), 'VPW status metric should be rendered');
    assert(txt.includes('VPW-Rate'), 'VPW rate metric should be rendered');
    assert(txt.includes('ER(real)'), 'ER(real) metric should be rendered');
    assert(txt.includes('ER(CAPE)'), 'ER(CAPE) metric should be rendered');
    assert(txt.includes('Go-Go-Phase'), 'Go-Go metric should be rendered');
    assert(txt.includes('VPW-Basisvermögen'), 'VPW basis wealth metric should be rendered');
}

{
    const grid = buildKeyParams({
        vpw: {
            enabled: true,
            status: 'active',
            horizonMethod: 'survival_quantile',
            horizonYears: 10,
            survivalQuantile: 0.9,
            vpwRate: 0.085,
            expectedRealReturn: -0.01,
            goGoActive: false,
            goGoMultiplier: 1.0
        }
    });

    const rateCard = findCardByLabel(grid, 'VPW-Rate');
    const horizonCard = findCardByLabel(grid, 'VPW-Horizont');
    const realCard = findCardByLabel(grid, 'ER(real)');
    assert(rateCard?.dataset?.trend === 'down', 'High VPW rate should be marked as warning trend');
    assert(horizonCard?.dataset?.trend === 'down', 'Very short horizon should be marked as warning trend');
    assert(realCard?.dataset?.trend === 'down', 'Negative ER(real) should be marked as warning trend');
    const txt = flattenText(grid);
    assert(txt.includes('Warnsignal'), 'Warning hint text should be visible');
}

console.log('✅ Balance diagnosis keyparams tests passed');
