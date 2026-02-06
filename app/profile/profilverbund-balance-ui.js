/**
 * Module: Profilverbund Balance UI
 * Purpose: Handles DOM operations specific to the Profilverbund UI (e.g., Profile Selector).
 *          Manages the list of checkboxes for selecting active profiles.
 * Usage: Used by balance-main-profilverbund.js to toggle multi-user mode.
 * Dependencies: None
 */
"use strict";

export function renderProfilverbundProfileSelector(profiles, containerId = 'profilverbund-profile-list') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = Array.isArray(profiles) ? profiles : [];
    container.innerHTML = '';
    list.forEach(profile => {
        const row = document.createElement('label');
        row.className = 'profilverbund-profile-row';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = profile.id;
        checkbox.dataset.profileId = profile.id;
        checkbox.checked = profile.belongsToHousehold !== false;
        const label = document.createElement('span');
        label.textContent = profile.name || profile.id;
        row.appendChild(checkbox);
        row.appendChild(label);
        container.appendChild(row);
    });
}

export function toggleProfilverbundMode(enabled) {
    const targets = document.querySelectorAll('.profilverbund-toggle-target');
    targets.forEach(el => {
        el.style.display = enabled ? 'block' : 'none';
    });
}
