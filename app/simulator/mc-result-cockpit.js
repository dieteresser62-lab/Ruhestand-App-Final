"use strict";

const cockpitInstances = new WeakMap();
const RESULT_VIEW_IDS = Object.freeze(['overview', 'risk', 'care', 'logs', 'replay']);

function getResultViewElements(documentRef) {
    return RESULT_VIEW_IDS.map(viewId => ({
        viewId,
        tab: documentRef?.querySelector?.(`[role="tab"][data-mc-view="${viewId}"]`) || null,
        panel: documentRef?.querySelector?.(`[role="tabpanel"][data-mc-view-panel="${viewId}"]`) || null
    }));
}

function resolveResultView(viewOrTarget, views) {
    if (typeof viewOrTarget === 'string') {
        return views.find(view => view.viewId === viewOrTarget) || null;
    }
    if (!viewOrTarget) return null;
    return views.find(view => view.tab === viewOrTarget
        || view.panel === viewOrTarget
        || view.panel?.contains?.(viewOrTarget)) || null;
}

/**
 * Aktiviert genau eine Monte-Carlo-Ergebnisansicht. Der Aufrufer kann entweder
 * die lokale View-ID oder einen Zielknoten innerhalb eines Panels übergeben.
 */
export function activateMonteCarloResultView(viewOrTarget, {
    documentRef = globalThis.document,
    focusTab = false
} = {}) {
    const views = getResultViewElements(documentRef);
    if (views.length !== RESULT_VIEW_IDS.length || views.some(view => !view.tab || !view.panel)) return null;
    const selected = resolveResultView(viewOrTarget, views);
    if (!selected) return null;

    for (const view of views) {
        const active = view === selected;
        view.tab.setAttribute?.('aria-selected', String(active));
        view.tab.setAttribute?.('tabindex', active ? '0' : '-1');
        view.panel.hidden = !active;
    }
    if (focusTab && typeof selected.tab.focus === 'function') selected.tab.focus();
    return selected.viewId;
}

export function updateMonteCarloReplayVariantBadge({ documentRef = globalThis.document } = {}) {
    const badge = documentRef?.getElementById?.('mcReplayVariantBadge');
    const list = documentRef?.getElementById?.('stressReplayVariantList');
    if (!badge || !list) return 0;
    const variantCount = Math.max(0, (list.querySelectorAll?.('li[data-variant-id]')?.length || 0) - 1);
    badge.textContent = String(variantCount);
    badge.hidden = variantCount === 0;
    badge.setAttribute?.('aria-label', `${variantCount} ${variantCount === 1 ? 'Variante' : 'Varianten'}`);
    return variantCount;
}

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
    const viewTabs = getResultViewElements(documentRef).map(view => view.tab).filter(Boolean);
    if (!setupDisclosure || !primaryButton || !recalculateButton || viewTabs.length !== RESULT_VIEW_IDS.length) return null;

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

    for (const [index, tab] of viewTabs.entries()) {
        tab.addEventListener?.('click', () => {
            activateMonteCarloResultView(tab, { documentRef });
        });
        tab.addEventListener?.('keydown', event => {
            let nextIndex = null;
            if (event.key === 'ArrowRight') nextIndex = (index + 1) % viewTabs.length;
            else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + viewTabs.length) % viewTabs.length;
            else if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = viewTabs.length - 1;
            if (nextIndex === null) return;
            event.preventDefault?.();
            activateMonteCarloResultView(viewTabs[nextIndex], { documentRef, focusTab: true });
        });
    }

    let observer = null;
    let variantObserver = null;
    if (typeof MutationObserverCtor === 'function') {
        observer = new MutationObserverCtor(syncStartState);
        observer.observe(primaryButton, { attributes: true, attributeFilter: ['disabled', 'aria-busy'] });
        const variantList = documentRef.getElementById?.('stressReplayVariantList');
        if (variantList) {
            variantObserver = new MutationObserverCtor(() => updateMonteCarloReplayVariantBadge({ documentRef }));
            variantObserver.observe(variantList, { childList: true, subtree: true });
        }
    }

    updateSummary();
    syncStartState();
    activateMonteCarloResultView('overview', { documentRef });
    updateMonteCarloReplayVariantBadge({ documentRef });
    const instance = { setupDisclosure, updateSummary, syncStartState, observer, variantObserver };
    cockpitInstances.set(documentRef, instance);
    return instance;
}
