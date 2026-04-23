"use strict";

import {
    closeTrancheModal,
    openCreateTrancheModal,
    openEditTrancheModal,
    readTrancheFromForm
} from '../app/tranches/tranchen-manager-modal.js';

console.log('--- Tranchen Manager Modal Tests ---');

function createElement() {
    return {
        value: '',
        textContent: '',
        classList: {
            values: new Set(),
            add(v) { this.values.add(v); },
            remove(v) { this.values.delete(v); },
            has(v) { return this.values.has(v); }
        },
        reset() {
            this.value = '';
        }
    };
}

function createDocumentMock() {
    const elements = new Map();
    const ids = [
        'modalTitle', 'trancheModal', 'trancheForm', 'name', 'isin', 'ticker', 'shares',
        'purchasePrice', 'currentPrice', 'purchaseDate', 'category', 'type', 'tqf', 'notes'
    ];
    ids.forEach(id => elements.set(id, createElement()));
    return {
        getElementById(id) {
            return elements.get(id) || null;
        }
    };
}

console.log('Test 1: create modal resets form and opens');
{
    const doc = createDocumentMock();
    doc.getElementById('tqf').value = '0.1';
    openCreateTrancheModal(doc);
    assertEqual(doc.getElementById('modalTitle').textContent, 'Neue Tranche hinzufügen', 'Create modal should set title');
    assertEqual(doc.getElementById('tqf').value, '0.30', 'Create modal should reset default tqf');
    assert(doc.getElementById('trancheModal').classList.has('active'), 'Create modal should open modal');
}
console.log('✓ create modal resets form and opens OK');

console.log('Test 2: edit modal fills fields');
{
    const doc = createDocumentMock();
    openEditTrancheModal({
        name: 'ETF',
        isin: 'DE000123',
        ticker: 'VWCE',
        shares: 5,
        purchasePrice: 100,
        currentPrice: 120,
        purchaseDate: '2024-01-01',
        category: 'equity',
        type: 'aktien_neu',
        tqf: 0.3,
        notes: 'Test'
    }, doc);
    assertEqual(doc.getElementById('name').value, 'ETF', 'Edit modal should fill name');
    assertEqual(doc.getElementById('ticker').value, 'VWCE', 'Edit modal should fill ticker');
    assert(doc.getElementById('trancheModal').classList.has('active'), 'Edit modal should open modal');
}
console.log('✓ edit modal fills fields OK');

console.log('Test 3: readTrancheFromForm computes derived values');
{
    const doc = createDocumentMock();
    doc.getElementById('name').value = 'ETF';
    doc.getElementById('shares').value = '10';
    doc.getElementById('purchasePrice').value = '100';
    doc.getElementById('currentPrice').value = '120';
    doc.getElementById('purchaseDate').value = '2024-01-01';
    doc.getElementById('category').value = 'equity';
    doc.getElementById('type').value = 'aktien_neu';
    doc.getElementById('tqf').value = '0.3';
    const tranche = readTrancheFromForm('id-1', doc);
    assertEqual(tranche.trancheId, 'id-1', 'Form reader should preserve existing id');
    assertEqual(tranche.marketValue, 1200, 'Form reader should compute market value');
    assertEqual(tranche.costBasis, 1000, 'Form reader should compute cost basis');
}
console.log('✓ readTrancheFromForm computes derived values OK');

console.log('Test 4: close modal removes active class');
{
    const doc = createDocumentMock();
    doc.getElementById('trancheModal').classList.add('active');
    closeTrancheModal(doc);
    assertEqual(doc.getElementById('trancheModal').classList.has('active'), false, 'Close modal should remove active class');
}
console.log('✓ close modal removes active class OK');
