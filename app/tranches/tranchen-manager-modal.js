// @ts-check

import { calculateTrancheDerivedValues, generateTrancheId } from './tranchen-manager-state.js';
import {
    normalizeTranche,
    TRANCHE_CATEGORY_TYPES,
    TrancheValidationError
} from '../../types/tranche-contract.js';

const dialogStates = new WeakMap();
const boundDocuments = new WeakSet();
const FIELD_LABELS = Object.freeze({
    trancheId: 'Tranche-ID',
    name: 'Name',
    shares: 'Stückzahl',
    purchasePrice: 'Kaufpreis',
    currentPrice: 'aktueller Kurs',
    purchaseDate: 'Kaufdatum',
    category: 'Kategorie',
    type: 'Typ',
    tqf: 'Teilfreistellung'
});

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
    setFieldValue(doc, 'category', 'equity');
    syncTrancheTypeOptions(doc, 'aktien_neu');
    clearTrancheFormError(doc);
}

function getDialogState(doc) {
    if (!dialogStates.has(doc)) dialogStates.set(doc, { returnFocus: null });
    return dialogStates.get(doc);
}

function getFocusableElements(modal) {
    if (!modal?.querySelectorAll) return [];
    return Array.from(modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hidden && element.getAttribute?.('aria-hidden') !== 'true');
}

function activateDialog(doc, opener = null) {
    const modal = byId(doc, 'trancheModal');
    if (!modal) return;
    bindTrancheModalLifecycle(doc);
    const state = getDialogState(doc);
    state.returnFocus = opener || doc.activeElement || null;
    modal.classList.add('active');
    modal.setAttribute?.('aria-hidden', 'false');
    const initialFocus = byId(doc, 'name') || getFocusableElements(modal)[0];
    initialFocus?.focus?.();
}

export function syncTrancheTypeOptions(doc = document, preferredType = '') {
    const category = byId(doc, 'category')?.value || 'equity';
    const typeSelect = byId(doc, 'type');
    const allowedTypes = TRANCHE_CATEGORY_TYPES[category] || [];
    if (!typeSelect) return allowedTypes;
    Array.from(typeSelect.options || []).forEach(option => {
        const allowed = allowedTypes.includes(option.value);
        option.disabled = !allowed;
        option.hidden = !allowed;
    });
    const nextType = allowedTypes.includes(preferredType)
        ? preferredType
        : allowedTypes.includes(typeSelect.value) ? typeSelect.value : allowedTypes[0] || '';
    typeSelect.value = nextType;
    return allowedTypes;
}

export function openCreateTrancheModal(doc = document, opener = null) {
    byId(doc, 'modalTitle').textContent = 'Neue Tranche hinzufügen';
    resetTrancheForm(doc);
    activateDialog(doc, opener);
}

export function openEditTrancheModal(tranche, doc = document, opener = null) {
    if (!tranche) return false;
    byId(doc, 'modalTitle').textContent = 'Tranche bearbeiten';
    clearTrancheFormError(doc);
    setFieldValue(doc, 'name', tranche.name);
    setFieldValue(doc, 'isin', tranche.isin || '');
    setFieldValue(doc, 'ticker', tranche.ticker || '');
    setFieldValue(doc, 'shares', tranche.shares);
    setFieldValue(doc, 'purchasePrice', tranche.purchasePrice);
    setFieldValue(doc, 'currentPrice', tranche.currentPrice || '');
    setFieldValue(doc, 'purchaseDate', tranche.purchaseDate || '');
    setFieldValue(doc, 'category', tranche.category);
    syncTrancheTypeOptions(doc, tranche.type);
    setFieldValue(doc, 'tqf', tranche.tqf);
    setFieldValue(doc, 'notes', tranche.notes || '');
    activateDialog(doc, opener);
    return true;
}

export function closeTrancheModal(doc = document) {
    const modal = byId(doc, 'trancheModal');
    modal?.classList.remove('active');
    modal?.setAttribute?.('aria-hidden', 'true');
    clearTrancheFormError(doc);
    const state = getDialogState(doc);
    const returnFocus = state.returnFocus;
    state.returnFocus = null;
    returnFocus?.focus?.();
}

export function createUniqueTrancheId(existingIds = [], idFactory = generateTrancheId) {
    const occupied = new Set(existingIds);
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const trancheId = idFactory();
        if (typeof trancheId === 'string' && trancheId.trim() && !occupied.has(trancheId)) return trancheId;
    }
    throw new TrancheValidationError([{
        code: 'TRANCHE_ID_GENERATION_FAILED',
        field: 'trancheId',
        index: -1,
        trancheId: null,
        message: 'Es konnte keine eindeutige Tranche-ID erzeugt werden.'
    }]);
}

export function formatTrancheValidationError(error) {
    if (!(error instanceof TrancheValidationError) && error?.code !== 'TRANCHE_VALIDATION_FAILED') {
        return 'Die Tranche konnte nicht validiert werden.';
    }
    const first = Array.isArray(error.errors) ? error.errors[0] : null;
    if (!first) return error.message || 'Die Tranchendaten sind ungültig.';
    const tranche = first.trancheId ? `Tranche ${first.trancheId}, ` : '';
    const field = FIELD_LABELS[first.field] || first.field || 'Datensatz';
    return `${tranche}Feld ${field}: ${first.message} (${first.code})`;
}

export function clearTrancheFormError(doc = document) {
    const status = byId(doc, 'trancheFormError');
    if (status) {
        status.textContent = '';
        status.hidden = true;
    }
    Object.keys(FIELD_LABELS).forEach(field => byId(doc, field)?.removeAttribute?.('aria-invalid'));
}

export function showTrancheFormError(error, doc = document) {
    clearTrancheFormError(doc);
    const status = byId(doc, 'trancheFormError');
    const message = `Speichern blockiert. ${formatTrancheValidationError(error)}`;
    if (status) {
        status.textContent = message;
        status.hidden = false;
    }
    const firstField = Array.isArray(error?.errors) ? error.errors[0]?.field : null;
    const field = firstField ? byId(doc, firstField) : null;
    field?.setAttribute?.('aria-invalid', 'true');
    field?.focus?.();
    return message;
}

export function bindTrancheModalLifecycle(doc = document) {
    if (boundDocuments.has(doc)) return;
    const modal = byId(doc, 'trancheModal');
    const category = byId(doc, 'category');
    modal?.addEventListener?.('keydown', event => {
        if (!modal.classList.contains?.('active')) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeTrancheModal(doc);
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = getFocusableElements(modal);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && doc.activeElement === first) {
            event.preventDefault();
            last.focus?.();
        } else if (!event.shiftKey && doc.activeElement === last) {
            event.preventDefault();
            first.focus?.();
        }
    });
    category?.addEventListener?.('change', () => syncTrancheTypeOptions(doc));
    boundDocuments.add(doc);
}

export function readTrancheFromForm(existingId = null, doc = document, options = {}) {
    const purchasePrice = Number(byId(doc, 'purchasePrice').value);
    const currentPriceInput = byId(doc, 'currentPrice').value.trim();
    const tqfInput = byId(doc, 'tqf').value.trim();
    const derived = calculateTrancheDerivedValues({
        schemaVersion: 1,
        trancheId: existingId || createUniqueTrancheId(options.existingIds, options.idFactory),
        name: byId(doc, 'name').value,
        isin: byId(doc, 'isin').value,
        ticker: byId(doc, 'ticker').value,
        shares: Number(byId(doc, 'shares').value),
        purchasePrice,
        currentPrice: currentPriceInput === '' ? purchasePrice : Number(currentPriceInput),
        purchaseDate: byId(doc, 'purchaseDate').value,
        category: byId(doc, 'category').value,
        type: byId(doc, 'type').value,
        tqf: tqfInput === '' ? '' : Number(tqfInput),
        notes: byId(doc, 'notes').value
    });
    return normalizeTranche(derived, { mode: 'persisted' });
}
