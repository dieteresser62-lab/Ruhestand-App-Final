"use strict";

import {
    bindTrancheModalLifecycle,
    closeTrancheModal,
    createUniqueTrancheId,
    openCreateTrancheModal,
    openEditTrancheModal,
    readTrancheFromForm,
    syncTrancheTypeOptions
} from '../app/tranches/tranchen-manager-modal.js';
import { TrancheValidationError } from '../types/tranche-contract.js';

console.log('--- Tranchen Manager Modal Tests ---');

function createElement(id, doc) {
    return {
        id,
        value: '',
        textContent: '',
        hidden: false,
        disabled: false,
        options: [],
        listeners: {},
        attributes: new Map(),
        classList: {
            values: new Set(),
            add(v) { this.values.add(v); },
            remove(v) { this.values.delete(v); },
            has(v) { return this.values.has(v); },
            contains(v) { return this.values.has(v); }
        },
        addEventListener(type, handler) { this.listeners[type] = handler; },
        setAttribute(name, value) { this.attributes.set(name, String(value)); },
        removeAttribute(name) { this.attributes.delete(name); },
        getAttribute(name) { return this.attributes.get(name) ?? null; },
        focus() { doc.activeElement = this; },
        reset() {
            this.value = '';
        }
    };
}

function createDocumentMock() {
    const doc = { activeElement: null };
    const elements = new Map();
    const ids = [
        'modalTitle', 'trancheModal', 'trancheForm', 'name', 'isin', 'ticker', 'shares',
        'purchasePrice', 'currentPrice', 'purchaseDate', 'category', 'type', 'tqf', 'notes',
        'trancheFormError', 'closeTrancheModalBtn', 'saveTrancheBtn', 'opener'
    ];
    ids.forEach(id => elements.set(id, createElement(id, doc)));
    elements.get('category').value = 'equity';
    elements.get('type').value = 'aktien_neu';
    elements.get('type').options = ['aktien_alt', 'aktien_neu', 'anleihe', 'geldmarkt', 'gold']
        .map(value => ({ value, disabled: false, hidden: false }));
    const focusOrder = [
        'name', 'isin', 'ticker', 'shares', 'purchasePrice', 'currentPrice', 'purchaseDate',
        'category', 'type', 'tqf', 'notes', 'closeTrancheModalBtn', 'saveTrancheBtn'
    ].map(id => elements.get(id));
    elements.get('trancheModal').querySelectorAll = () => focusOrder;
    doc.getElementById = id => elements.get(id) || null;
    return doc;
}

console.log('Test 1: create modal resets form and opens');
{
    const doc = createDocumentMock();
    doc.getElementById('tqf').value = '0.1';
    openCreateTrancheModal(doc);
    assertEqual(doc.getElementById('modalTitle').textContent, 'Neue Tranche hinzufügen', 'Create modal should set title');
    assertEqual(doc.getElementById('tqf').value, '0.30', 'Create modal should reset default tqf');
    assert(doc.getElementById('trancheModal').classList.has('active'), 'Create modal should open modal');
    assertEqual(doc.activeElement.id, 'name', 'Create modal should focus the first form field');
    assert(doc.getElementById('type').options.find(option => option.value === 'gold').disabled, 'Create modal should hide incompatible types');
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

console.log('Test 5: form reader rejects category/type mismatch with field context');
{
    const doc = createDocumentMock();
    doc.getElementById('name').value = 'Mismatch';
    doc.getElementById('shares').value = '1';
    doc.getElementById('purchasePrice').value = '100';
    doc.getElementById('currentPrice').value = '100';
    doc.getElementById('category').value = 'equity';
    doc.getElementById('type').value = 'anleihe';
    doc.getElementById('tqf').value = '0';
    let error = null;
    try {
        readTrancheFromForm('mismatch-id', doc);
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof TrancheValidationError, 'Mismatch should throw contract validation error');
    assert(error.errors.some(item => item.code === 'TRANCHE_CLASSIFICATION_MISMATCH'), 'Mismatch should expose stable error code');
    assert(error.errors.some(item => item.trancheId === 'mismatch-id' && item.field === 'category'), 'Mismatch should expose tranche and field context');
}
console.log('✓ form mismatch validation OK');

console.log('Test 6: blank TQF is not converted to zero');
{
    const doc = createDocumentMock();
    doc.getElementById('name').value = 'ETF';
    doc.getElementById('shares').value = '1';
    doc.getElementById('purchasePrice').value = '100';
    doc.getElementById('category').value = 'equity';
    doc.getElementById('type').value = 'aktien_neu';
    doc.getElementById('tqf').value = '';
    let error = null;
    try {
        readTrancheFromForm('tqf-id', doc);
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof TrancheValidationError, 'Blank TQF should throw contract validation error');
    assert(error.errors.some(item => item.field === 'tqf'), 'Blank TQF should retain field context');
}
console.log('✓ blank TQF validation OK');

console.log('Test 7: category selection exposes only canonical types');
{
    const doc = createDocumentMock();
    doc.getElementById('category').value = 'gold';
    const allowed = syncTrancheTypeOptions(doc);
    assertEqual(allowed.join(','), 'gold', 'Gold category should expose only gold type');
    assertEqual(doc.getElementById('type').value, 'gold', 'Gold category should select gold type');
    assert(doc.getElementById('type').options.find(option => option.value === 'aktien_neu').disabled, 'Equity type should be disabled for gold');
}
console.log('✓ canonical type options OK');

console.log('Test 8: generated ids retry collisions before returning');
{
    const candidates = ['duplicate-id', 'unique-id'];
    const trancheId = createUniqueTrancheId(['duplicate-id'], () => candidates.shift());
    assertEqual(trancheId, 'unique-id', 'ID generator should retry an occupied id');
}
console.log('✓ collision-safe id generation OK');

console.log('Test 9: non-finite and overflowing financial values are rejected');
{
    const doc = createDocumentMock();
    doc.getElementById('name').value = 'Overflow';
    doc.getElementById('shares').value = '1e308';
    doc.getElementById('purchasePrice').value = '1e308';
    doc.getElementById('currentPrice').value = '1e308';
    doc.getElementById('category').value = 'equity';
    doc.getElementById('type').value = 'aktien_neu';
    doc.getElementById('tqf').value = '0.3';
    let error = null;
    try {
        readTrancheFromForm('overflow-id', doc);
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof TrancheValidationError, 'Overflowing derived values should be rejected');
    assert(error.errors.some(item => item.code === 'TRANCHE_NUMBER_NON_FINITE'), 'Overflow should retain a stable non-finite code');
}
console.log('✓ finite financial validation OK');

console.log('Test 10: Escape closes dialog and focus trap returns to opener');
{
    const doc = createDocumentMock();
    const opener = doc.getElementById('opener');
    opener.focus();
    bindTrancheModalLifecycle(doc);
    openCreateTrancheModal(doc, opener);
    const modal = doc.getElementById('trancheModal');
    let prevented = false;
    modal.listeners.keydown({ key: 'Tab', shiftKey: true, preventDefault() { prevented = true; } });
    assert(prevented, 'Shift+Tab on first field should be trapped');
    assertEqual(doc.activeElement.id, 'saveTrancheBtn', 'Focus trap should wrap to last control');
    modal.listeners.keydown({ key: 'Escape', preventDefault() {} });
    assertEqual(modal.classList.has('active'), false, 'Escape should close dialog');
    assertEqual(doc.activeElement.id, 'opener', 'Closing should restore focus to opener');
}
console.log('✓ dialog keyboard lifecycle OK');
