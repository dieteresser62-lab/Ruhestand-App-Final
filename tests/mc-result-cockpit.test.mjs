import fs from 'node:fs';
import {
    activateMonteCarloResultView,
    completeMonteCarloCockpitRun,
    initMonteCarloResultCockpit,
    syncMonteCarloCockpitStartState,
    updateMonteCarloReplayVariantBadge,
    updateMonteCarloSetupSummary
} from '../app/simulator/mc-result-cockpit.js';

class FakeElement {
    constructor(id, properties = {}) {
        this.id = id;
        this.value = '';
        this.textContent = '';
        this.disabled = false;
        this.open = false;
        this.hidden = false;
        this.focusCount = 0;
        this.containedElements = new Set();
        this.listeners = new Map();
        this.attributes = new Map();
        this.clickCount = 0;
        Object.assign(this, properties);
    }

    addEventListener(type, handler) {
        const handlers = this.listeners.get(type) || [];
        handlers.push(handler);
        this.listeners.set(type, handlers);
    }

    dispatch(type, event = {}) {
        for (const handler of this.listeners.get(type) || []) handler({ preventDefault() {}, ...event });
    }

    click() {
        this.clickCount += 1;
        this.dispatch('click');
    }

    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    contains(element) { return this.containedElements.has(element); }
    focus() { this.focusCount += 1; }
    querySelectorAll(selector) {
        return selector === 'li[data-variant-id]' ? Array.from({ length: this.variantItems || 0 }, () => ({})) : [];
    }
}

function createDocument() {
    const elements = new Map();
    const register = (id, properties) => {
        const element = new FakeElement(id, properties);
        elements.set(id, element);
        return element;
    };
    const methodOptions = [
        { value: 'regime_markov', textContent: 'Regime-Sampling (Markov-Chain)' },
        { value: 'stationary', textContent: 'Stationary Bootstrap' }
    ];
    register('mcSetupDisclosure', { open: true });
    register('mcButton');
    register('mcRecalculateButton');
    register('mcAnzahl', { value: '10000' });
    register('mcDauer', { value: '35' });
    register('mcSeed', { value: '12345' });
    register('mcMethode', { value: 'regime_markov', options: methodOptions });
    for (const id of ['mcSetupSummaryRuns', 'mcSetupSummaryDuration', 'mcSetupSummaryMethod', 'mcSetupSummarySeed']) {
        register(id);
    }
    const selectorElements = new Map();
    for (const viewId of ['overview', 'risk', 'care', 'logs', 'replay']) {
        const capitalized = viewId[0].toUpperCase() + viewId.slice(1);
        const tab = register(`mcViewTab${capitalized}`);
        const panel = register(`mcViewPanel${capitalized}`, { hidden: viewId !== 'overview' });
        selectorElements.set(`[role="tab"][data-mc-view="${viewId}"]`, tab);
        selectorElements.set(`[role="tabpanel"][data-mc-view-panel="${viewId}"]`, panel);
    }
    register('mcReplayVariantBadge', { hidden: true });
    register('stressReplayVariantList', { variantItems: 0 });
    return {
        elements,
        getElementById: id => elements.get(id) || null,
        querySelector: selector => selectorElements.get(selector) || null
    };
}

console.log('Test 1: cockpit initialization is idempotent and projects raw setup values');
{
    const documentRef = createDocument();
    const first = initMonteCarloResultCockpit({ documentRef, MutationObserverCtor: null });
    const second = initMonteCarloResultCockpit({ documentRef, MutationObserverCtor: null });
    assert(first === second, 'cockpit is initialized exactly once per document');
    assertEqual(documentRef.getElementById('mcSetupSummaryRuns').textContent, '10000', 'run count is projected without normalization');
    assertEqual(documentRef.getElementById('mcSetupSummaryDuration').textContent, '35', 'duration is projected without normalization');
    assertEqual(documentRef.getElementById('mcSetupSummaryMethod').textContent, 'Regime-Sampling (Markov-Chain)', 'selected method label is projected');
    assertEqual(documentRef.getElementById('mcSetupSummarySeed').textContent, '12345', 'seed is projected without normalization');

    const runs = documentRef.getElementById('mcAnzahl');
    runs.value = '00042';
    runs.dispatch('input');
    assertEqual(documentRef.getElementById('mcSetupSummaryRuns').textContent, '00042', 'summary preserves the current UI string');
}

console.log('Test 2: recalculate delegates once and mirrors the canonical start state');
{
    const documentRef = createDocument();
    initMonteCarloResultCockpit({ documentRef, MutationObserverCtor: null });
    const primary = documentRef.getElementById('mcButton');
    const recalculate = documentRef.getElementById('mcRecalculateButton');
    recalculate.click();
    assertEqual(primary.clickCount, 1, 'recalculate delegates to the canonical start button exactly once');

    primary.disabled = true;
    primary.setAttribute('aria-busy', 'true');
    syncMonteCarloCockpitStartState({ documentRef });
    assert(recalculate.disabled, 'recalculate is disabled with the canonical start action');
    assertEqual(recalculate.getAttribute('aria-busy'), 'true', 'recalculate mirrors the busy state');
    recalculate.click();
    assertEqual(primary.clickCount, 1, 'disabled recalculation does not start a second path');

    primary.disabled = false;
    primary.removeAttribute('aria-busy');
    syncMonteCarloCockpitStartState({ documentRef });
    assert(!recalculate.disabled, 'recalculate is restored with the canonical start action');
    assertEqual(recalculate.getAttribute('aria-busy'), null, 'stale busy state is removed');
}

console.log('Test 3: only successful completion closes setup and refreshes its summary');
{
    const documentRef = createDocument();
    initMonteCarloResultCockpit({ documentRef, MutationObserverCtor: null });
    const disclosure = documentRef.getElementById('mcSetupDisclosure');
    disclosure.open = true;
    syncMonteCarloCockpitStartState({ documentRef });
    assert(disclosure.open, 'run-state synchronization does not close setup');
    documentRef.getElementById('mcSeed').value = '9876';
    completeMonteCarloCockpitRun({ documentRef });
    assert(!disclosure.open, 'successful completion closes setup');
    assertEqual(documentRef.getElementById('mcSetupSummarySeed').textContent, '9876', 'completion refreshes the visible summary');
}

console.log('Test 4: Simulator DOM keeps cockpit contracts and ordering');
{
    const html = fs.readFileSync(new URL('../Simulator.html', import.meta.url), 'utf8');
    for (const id of ['mcButton', 'mcCancelButton', 'mcRunStatus', 'monteCarloResults', 'stressReplayWorkspace', 'scenarioSelector', 'print-footer']) {
        assertEqual((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `${id} remains unique`);
    }
    assert(/<details id="mcSetupDisclosure"[^>]* open>/.test(html), 'native setup disclosure starts open');
    const setup = html.match(/<details id="mcSetupDisclosure"[\s\S]*?<\/details>/)?.[0] || '';
    assertEqual((setup.match(/<fieldset/g) || []).length, 4, 'setup disclosure contains the four parameter fieldsets');
    assert(setup.includes('id="mcButton"'), 'canonical start button remains inside setup');
    assert(!setup.includes('max-height'), 'setup disclosure has no fixed clipping height');
    assert(html.indexOf('id="monteCarloResults"') < html.indexOf('id="stressReplayWorkspace"'), 'results precede replay deep-dive');
    assertEqual((html.match(/class="[^"]*\btab-btn\b[^"]*"/g) || []).length, 4, 'Simulator keeps exactly four main tabs');
    assertEqual((html.match(/class="mc-view-tab"/g) || []).length, 5, 'cockpit exposes exactly five dedicated result tabs');
    assertEqual((html.match(/class="mc-view-panel"/g) || []).length, 5, 'cockpit exposes exactly five dedicated result panels');
}

console.log('Test 5: result tabs use one activation path for view ids and contained targets');
{
    const documentRef = createDocument();
    const overviewTarget = new FakeElement('overviewTarget');
    documentRef.getElementById('mcViewPanelOverview').containedElements.add(overviewTarget);
    initMonteCarloResultCockpit({ documentRef, MutationObserverCtor: null });

    assertEqual(activateMonteCarloResultView('replay', { documentRef }), 'replay', 'view id activates replay');
    assertEqual(documentRef.getElementById('mcViewTabReplay').getAttribute('aria-selected'), 'true', 'active tab is selected');
    assertEqual(documentRef.getElementById('mcViewTabReplay').getAttribute('tabindex'), '0', 'active tab owns the roving tabindex');
    assert(!documentRef.getElementById('mcViewPanelReplay').hidden, 'active panel is exposed');
    assert(documentRef.getElementById('mcViewPanelOverview').hidden, 'inactive panel is hidden');

    assertEqual(activateMonteCarloResultView(overviewTarget, { documentRef }), 'overview', 'contained target resolves its panel');
    documentRef.getElementById('mcViewTabOverview').dispatch('keydown', { key: 'End' });
    assertEqual(documentRef.getElementById('mcViewTabReplay').focusCount, 1, 'End activates and focuses the final result tab');
    documentRef.getElementById('mcViewTabReplay').dispatch('keydown', { key: 'ArrowRight' });
    assertEqual(documentRef.getElementById('mcViewTabOverview').focusCount, 1, 'ArrowRight wraps and focuses the first result tab');
}

console.log('Test 6: replay variant badge reports alternatives only');
{
    const documentRef = createDocument();
    const list = documentRef.getElementById('stressReplayVariantList');
    const badge = documentRef.getElementById('mcReplayVariantBadge');
    list.variantItems = 1;
    assertEqual(updateMonteCarloReplayVariantBadge({ documentRef }), 0, 'baseline alone is not counted as a variant');
    assert(badge.hidden, 'zero alternatives keep the badge hidden');
    list.variantItems = 3;
    assertEqual(updateMonteCarloReplayVariantBadge({ documentRef }), 2, 'alternatives are derived from the rendered workspace list');
    assert(!badge.hidden, 'positive alternative count exposes the badge');
    assertEqual(badge.textContent, '2', 'badge displays the alternative count');
}

updateMonteCarloSetupSummary({ documentRef: null });
assert(true, 'summary update tolerates an unavailable document');
