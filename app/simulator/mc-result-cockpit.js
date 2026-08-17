"use strict";

const cockpitInstances = new WeakMap();

function getMethodLabel(methodSelect) {
    const selectedOption = methodSelect?.selectedOptions?.[0]
        || Array.from(methodSelect?.options || []).find(option => option.selected || option.value === methodSelect.value);
    return selectedOption?.textContent?.trim() || methodSelect?.value || '—';
}

function readDisplayValue(documentRef, id) {
    const value = documentRef?.getElementById?.(id)?.value;
    return value === undefined || value === null || value === '' ? '—' : String(value);
}

export function updateMonteCarloSetupSummary({ documentRef = globalThis.document } = {}) {
    const values = {
        mcSetupSummaryRuns: readDisplayValue(documentRef, 'mcAnzahl'),
        mcSetupSummaryDuration: readDisplayValue(documentRef, 'mcDauer'),
        mcSetupSummaryMethod: getMethodLabel(documentRef?.getElementById?.('mcMethode')),
        mcSetupSummarySeed: readDisplayValue(documentRef, 'mcSeed')
    };
    for (const [id, value] of Object.entries(values)) {
        const output = documentRef?.getElementById?.(id);
        if (output) output.textContent = value;
    }
    return values;
}

export function syncMonteCarloCockpitStartState({ documentRef = globalThis.document } = {}) {
    const primaryButton = documentRef?.getElementById?.('mcButton');
    const recalculateButton = documentRef?.getElementById?.('mcRecalculateButton');
    if (!primaryButton || !recalculateButton) return false;

    recalculateButton.disabled = primaryButton.disabled === true;
    const busy = primaryButton.getAttribute?.('aria-busy') === 'true';
    if (busy) recalculateButton.setAttribute?.('aria-busy', 'true');
    else recalculateButton.removeAttribute?.('aria-busy');
    return true;
}

export function completeMonteCarloCockpitRun({ documentRef = globalThis.document } = {}) {
    updateMonteCarloSetupSummary({ documentRef });
    const setupDisclosure = documentRef?.getElementById?.('mcSetupDisclosure');
    if (!setupDisclosure) return false;
    setupDisclosure.open = false;
    return true;
}

export function initMonteCarloResultCockpit({
    documentRef = globalThis.document,
    MutationObserverCtor = globalThis.MutationObserver
} = {}) {
    if (!documentRef) return null;
    const existing = cockpitInstances.get(documentRef);
    if (existing) return existing;

    const setupDisclosure = documentRef.getElementById?.('mcSetupDisclosure');
    const primaryButton = documentRef.getElementById?.('mcButton');
    const recalculateButton = documentRef.getElementById?.('mcRecalculateButton');
    if (!setupDisclosure || !primaryButton || !recalculateButton) return null;

    const updateSummary = () => updateMonteCarloSetupSummary({ documentRef });
    const syncStartState = () => syncMonteCarloCockpitStartState({ documentRef });
    const parameterIds = ['mcAnzahl', 'mcDauer', 'mcMethode', 'mcSeed'];
    for (const id of parameterIds) {
        const input = documentRef.getElementById?.(id);
        input?.addEventListener?.('input', updateSummary);
        input?.addEventListener?.('change', updateSummary);
    }

    recalculateButton.addEventListener?.('click', event => {
        event?.preventDefault?.();
        syncStartState();
        if (!recalculateButton.disabled) primaryButton.click();
    });

    let observer = null;
    if (typeof MutationObserverCtor === 'function') {
        observer = new MutationObserverCtor(syncStartState);
        observer.observe(primaryButton, { attributes: true, attributeFilter: ['disabled', 'aria-busy'] });
    }

    updateSummary();
    syncStartState();
    const instance = { setupDisclosure, updateSummary, syncStartState, observer };
    cockpitInstances.set(documentRef, instance);
    return instance;
}
