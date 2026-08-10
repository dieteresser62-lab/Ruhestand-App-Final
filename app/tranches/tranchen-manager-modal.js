// @ts-check

import { calculateTrancheDerivedValues, generateTrancheId } from './tranchen-manager-state.js';
import {
    normalizeTranche,
    TRANCHE_CATEGORY_TYPES,
    TrancheValidationError
} from '../../types/tranche-contract.js';

const dialogStates = new WeakMap();
const boundDocuments = new WeakSet();
const cashDialogStates = new WeakMap();
const cashBoundDocuments = new WeakSet();
const FIELD_LABELS = Object.freeze({
    trancheId: 'Tranche-ID',
    name: 'Name',
    shares: 'Stückzahl',
    purchasePrice: 'Kaufpreis',
    currentPrice: 'aktueller Kurs',
    purchaseDate: 'Kaufdatum',
    category: 'Kategorie',
    type: 'Typ',
    tqf: 'Teilfreistellung',
    taxExempt: 'Steuerfreiheit'
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
    setFieldValue(doc, 'tqf', '0');
    if (byId(doc, 'taxExempt')) byId(doc, 'taxExempt').checked = false;
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
    if (byId(doc, 'taxExempt')) byId(doc, 'taxExempt').checked = tranche.taxExempt === true;
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

export function ensureCashPostingModal(doc = document) {
    let modal = byId(doc, 'cashPostingModal');
    if (modal || typeof doc.createElement !== 'function') return modal;
    modal = doc.createElement('div');
    modal.id = 'cashPostingModal';
    modal.className = 'modal';
    modal.setAttribute?.('role', 'dialog');
    modal.setAttribute?.('aria-modal', 'true');
    modal.setAttribute?.('aria-labelledby', 'cashPostingModalTitle');
    modal.setAttribute?.('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="modal-content" role="document">
            <h2 id="cashPostingModalTitle">Cashstatus bearbeiten</h2>
            <pre id="cashPostingModalSummary" style="white-space: pre-wrap;"></pre>
            <form id="cashPostingForm">
                <div class="form-group">
                    <label for="cashPostingBalance">Cashstand nach Berücksichtigung (€) *</label>
                    <input id="cashPostingBalance" type="number" step="0.01" required>
                </div>
                <div id="cashPostingReasonGroup" class="form-group" hidden>
                    <label for="cashPostingReason">Korrekturgrund *</label>
                    <textarea id="cashPostingReason" rows="3"></textarea>
                </div>
                <div id="cashPostingFormError" class="reconciliation-status" data-kind="error" role="alert" hidden></div>
                <div class="reconciliation-actions">
                    <button id="cashPostingCancelBtn" type="button" class="btn-secondary">Abbrechen – nichts ändern</button>
                    <button id="cashPostingSubmitBtn" type="submit" class="btn-danger">Cashstatus dauerhaft bestätigen</button>
                </div>
            </form>
        </div>`;
    doc.body?.appendChild?.(modal);
    return modal;
}

function formatCashDialogMoney(value) {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

export function openCashPostingModal(context, doc = document, opener = null) {
    const modal = ensureCashPostingModal(doc);
    if (!modal || !context) return false;
    bindCashPostingModalLifecycle(doc);
    const mode = context.mode === 'correct' ? 'correct' : 'confirm';
    const state = {
        context: { ...context, mode },
        returnFocus: opener || doc.activeElement || null
    };
    cashDialogStates.set(doc, state);
    const title = byId(doc, 'cashPostingModalTitle');
    if (title) title.textContent = mode === 'correct'
        ? 'Bestätigten Cashstand append-only korrigieren'
        : 'Manuelle Cashbuchung bestätigen';
    const previousBalance = context.cashBalanceAfterPostingEur === null
        || context.cashBalanceAfterPostingEur === undefined
        ? 'nicht dokumentiert'
        : formatCashDialogMoney(context.cashBalanceAfterPostingEur);
    const summary = byId(doc, 'cashPostingModalSummary');
    if (summary) {
        summary.textContent = [
            `Zielverkauf: ${context.targetActionId}`,
            `Nettoerlös (unveränderlich): ${formatCashDialogMoney(context.confirmedNetProceedsEur)}`,
            `Bisher wirksamer Cashstand: ${previousBalance}`,
            `Nächster Auditnachweis: ${context.nextActionId}`,
            mode === 'correct' ? `Nächste Korrekturrevision: ${context.nextRevision}` : 'Es erfolgt keine automatische Cashbuchung.'
        ].join('\n');
    }
    setFieldValue(doc, 'cashPostingBalance', context.cashBalanceAfterPostingEur ?? '');
    setFieldValue(doc, 'cashPostingReason', '');
    const reasonGroup = byId(doc, 'cashPostingReasonGroup');
    if (reasonGroup) reasonGroup.hidden = mode !== 'correct';
    const reason = byId(doc, 'cashPostingReason');
    if (reason) reason.required = mode === 'correct';
    const submit = byId(doc, 'cashPostingSubmitBtn');
    if (submit) submit.textContent = mode === 'correct'
        ? 'Korrektur append-only bestätigen'
        : 'Cashbuchung append-only bestätigen';
    clearCashPostingFormError(doc);
    modal.classList.add('active');
    modal.setAttribute?.('aria-hidden', 'false');
    byId(doc, 'cashPostingBalance')?.focus?.();
    return true;
}

export function closeCashPostingModal(doc = document) {
    const modal = byId(doc, 'cashPostingModal');
    modal?.classList.remove('active');
    modal?.setAttribute?.('aria-hidden', 'true');
    clearCashPostingFormError(doc);
    const state = cashDialogStates.get(doc);
    cashDialogStates.delete(doc);
    state?.returnFocus?.focus?.();
}

export function readCashPostingForm(doc = document) {
    const state = cashDialogStates.get(doc);
    if (!state?.context) return null;
    const rawBalance = byId(doc, 'cashPostingBalance')?.value;
    return {
        ...state.context,
        cashBalanceAfterPostingEur: rawBalance === '' || rawBalance === null || rawBalance === undefined
            ? Number.NaN
            : Number(rawBalance),
        correctionReason: byId(doc, 'cashPostingReason')?.value || ''
    };
}

export function clearCashPostingFormError(doc = document) {
    const target = byId(doc, 'cashPostingFormError');
    if (target) {
        target.textContent = '';
        target.hidden = true;
    }
    byId(doc, 'cashPostingBalance')?.removeAttribute?.('aria-invalid');
    byId(doc, 'cashPostingReason')?.removeAttribute?.('aria-invalid');
}

export function showCashPostingFormError(message, field = null, doc = document) {
    clearCashPostingFormError(doc);
    const target = byId(doc, 'cashPostingFormError');
    if (target) {
        target.textContent = message || 'Cashstatus konnte nicht verarbeitet werden.';
        target.hidden = false;
    }
    const input = field ? byId(doc, field) : null;
    input?.setAttribute?.('aria-invalid', 'true');
    input?.focus?.();
}

export function bindCashPostingModalLifecycle(doc = document) {
    if (cashBoundDocuments.has(doc)) return;
    const modal = ensureCashPostingModal(doc);
    if (!modal) return;
    byId(doc, 'cashPostingCancelBtn')?.addEventListener?.('click', () => closeCashPostingModal(doc));
    modal.addEventListener?.('keydown', event => {
        if (!modal.classList.contains?.('active')) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeCashPostingModal(doc);
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
    cashBoundDocuments.add(doc);
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
        schemaVersion: 2,
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
        taxExempt: byId(doc, 'taxExempt')?.checked === true,
        notes: byId(doc, 'notes').value
    });
    return normalizeTranche(derived, { mode: 'persisted' });
}
