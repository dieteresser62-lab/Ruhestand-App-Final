/**
 * Module: Balance Diagnosis Guardrails
 * Purpose: Renders the "Guardrails" section of the Diagnosis Panel.
 *          Displays individual guardrail metrics (e.g., withdrawal rate thresholds) as cards with status colors.
 * Usage: Used by balance-renderer-diagnosis.js to visualize guardrail statuses.
 * Dependencies: None
 */
"use strict";

export function buildGuardrails(guardrailData = []) {
    const fragment = document.createDocumentFragment();
    guardrailData.forEach(g => {
        const card = document.createElement('div');
        card.className = `guardrail-card status-${g.status} ${g.status === 'ok' ? 'guardrail-ok' : ''}`;
        const name = document.createElement('strong');
        name.textContent = g.name;
        const value = document.createElement('div');
        value.className = 'value';
        value.textContent = g.value;
        const threshold = document.createElement('div');
        threshold.className = 'threshold';
        threshold.textContent = `Schwelle: ${g.threshold}`;
        card.append(name, value, threshold);
        fragment.appendChild(card);
    });
    return fragment;
}
