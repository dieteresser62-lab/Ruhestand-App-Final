// @ts-check

import { calculateTrancheDerivedValues, generateTrancheId } from './tranchen-manager-state.js';

function byId(doc, id) {
    return doc.getElementById(id);
}

function setFieldValue(doc, id, value) {
    const el = byId(doc, id);
    if (el) el.value = value ?? '';
}

export function resetTrancheForm(doc = document) {
    byId(doc, 'trancheForm')?.reset();
    setFieldValue(doc, 'tqf', '0.30');
}

export function openCreateTrancheModal(doc = document) {
    byId(doc, 'modalTitle').textContent = 'Neue Tranche hinzufügen';
    resetTrancheForm(doc);
    byId(doc, 'trancheModal')?.classList.add('active');
}

export function openEditTrancheModal(tranche, doc = document) {
    if (!tranche) return false;
    byId(doc, 'modalTitle').textContent = 'Tranche bearbeiten';
    setFieldValue(doc, 'name', tranche.name);
    setFieldValue(doc, 'isin', tranche.isin || '');
    setFieldValue(doc, 'ticker', tranche.ticker || '');
    setFieldValue(doc, 'shares', tranche.shares);
    setFieldValue(doc, 'purchasePrice', tranche.purchasePrice);
    setFieldValue(doc, 'currentPrice', tranche.currentPrice || '');
    setFieldValue(doc, 'purchaseDate', tranche.purchaseDate || '');
    setFieldValue(doc, 'category', tranche.category);
    setFieldValue(doc, 'type', tranche.type);
    setFieldValue(doc, 'tqf', tranche.tqf);
    setFieldValue(doc, 'notes', tranche.notes || '');
    byId(doc, 'trancheModal')?.classList.add('active');
    return true;
}

export function closeTrancheModal(doc = document) {
    byId(doc, 'trancheModal')?.classList.remove('active');
}

export function readTrancheFromForm(existingId = null, doc = document) {
    return calculateTrancheDerivedValues({
        trancheId: existingId || generateTrancheId(),
        name: byId(doc, 'name').value,
        isin: byId(doc, 'isin').value,
        ticker: byId(doc, 'ticker').value,
        shares: parseFloat(byId(doc, 'shares').value),
        purchasePrice: parseFloat(byId(doc, 'purchasePrice').value),
        currentPrice: parseFloat(byId(doc, 'currentPrice').value) || parseFloat(byId(doc, 'purchasePrice').value),
        purchaseDate: byId(doc, 'purchaseDate').value,
        category: byId(doc, 'category').value,
        type: byId(doc, 'type').value,
        tqf: parseFloat(byId(doc, 'tqf').value),
        notes: byId(doc, 'notes').value
    });
}
