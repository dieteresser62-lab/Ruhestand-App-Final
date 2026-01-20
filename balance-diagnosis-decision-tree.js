"use strict";

export function buildDecisionTree(treeData = []) {
    const fragment = document.createDocumentFragment();
    treeData.forEach(item => {
        const li = document.createElement('li');
        let severity = item.severity || 'info';
        if (item.step.toLowerCase().includes('cap wirksam')) {
            severity = 'guardrail';
        }

        li.className = `${item.status} severity-${severity} ${item.status === 'inactive' ? 'decision-inactive' : ''}`;
        li.textContent = item.step + ' ';
        const impact = document.createElement('span');
        impact.className = 'impact';
        impact.textContent = item.impact;
        li.appendChild(impact);
        fragment.appendChild(li);
    });
    return fragment;
}
