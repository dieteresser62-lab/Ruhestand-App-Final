"use strict";

import { syncTranchenToInputs } from './depot-tranchen-status.js';
import { listProfiles, getProfileData, getCurrentProfileId, setProfileVerbundMembership } from './profile-storage.js';
import { buildSimulatorInputsFromProfileData, combineSimulatorProfiles } from './simulator-profile-inputs.js';
import { updateStartPortfolioDisplay } from './simulator-portfolio.js';

export function initSimulatorProfileSelection() {
    const listContainer = document.getElementById('simProfileList');
    const statusEl = document.getElementById('simProfileStatus');
    if (!listContainer) return;

    const renderList = (profiles) => {
        listContainer.innerHTML = '';
        profiles.forEach(profile => {
            const row = document.createElement('label');
            row.className = 'profilverbund-profile-row';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = profile.id;
            checkbox.checked = profile.belongsToHousehold !== false;
            checkbox.dataset.profileId = profile.id;
            const label = document.createElement('span');
            label.textContent = profile.name || profile.id;
            row.appendChild(checkbox);
            row.appendChild(label);
            listContainer.appendChild(row);
        });
    };

    const updateStatus = (message, kind = '') => {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.dataset.kind = kind;
    };

    const applySelection = () => {
        const profiles = listProfiles();
        if (!profiles.length) {
            updateStatus('Keine Profile vorhanden.', 'error');
            return;
        }

        let selected = profiles.filter(p => p.belongsToHousehold !== false);
        if (!selected.length) {
            profiles.forEach(profile => setProfileVerbundMembership(profile.id, true));
            selected = profiles.slice();
            renderList(profiles);
        }

        const profileInputs = selected.map(meta => {
            const data = getProfileData(meta.id);
            const inputs = buildSimulatorInputsFromProfileData(data);
            return { profileId: meta.id, name: meta.name || meta.id, inputs };
        });

        const currentId = getCurrentProfileId();
        const primaryId = selected.find(p => p.id === currentId)?.id || selected[0]?.id;
        const { combined, warnings } = combineSimulatorProfiles(profileInputs, primaryId);

        if (!combined) {
            updateStatus('Profil-Daten fuer Simulator fehlen.', 'error');
            return;
        }

        if (typeof window !== 'undefined') {
            const override = Array.isArray(combined.detailledTranches) ? combined.detailledTranches : null;
            window.__profilverbundTranchenOverride = override;
            window.__profilverbundPreferAggregates = !override;
        }

        applyCombinedInputsToUI(combined, selected.length);
        syncTranchenToInputs({ silent: true });
        updateStartPortfolioDisplay();

        if (warnings && warnings.length) {
            updateStatus(warnings.join(' '), 'error');
        } else {
            updateStatus(`Aktive Profile: ${selected.length}.`, 'ok');
        }
    };

    const profiles = listProfiles();
    renderList(profiles);
    listContainer.addEventListener('change', (event) => {
        const target = event.target;
        if (!target || target.type !== 'checkbox') return;
        const profileId = target.dataset.profileId || target.value;
        if (!profileId) return;
        setProfileVerbundMembership(profileId, target.checked);
        applySelection();
    });

    applySelection();
}

function applyCombinedInputsToUI(combined, selectedCount) {
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = Number.isFinite(value) ? value : value;
    };
    const setChecked = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = Boolean(value);
    };
    const setSelect = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value;
    };

    setValue('simStartVermoegen', Math.round(combined.startVermoegen || 0));
    setValue('depotwertAlt', Math.round(combined.depotwertAlt || 0));
    setValue('tagesgeld', (combined.tagesgeld || 0).toLocaleString('de-DE'));
    setValue('geldmarktEtf', (combined.geldmarktEtf || 0).toLocaleString('de-DE'));
    setValue('einstandAlt', Math.round(combined.einstandAlt || 0));

    setValue('goldAllokationAktiv', combined.goldAktiv ? 'true' : 'false');
    setValue('goldAllokationProzent', combined.goldZielProzent || 0);
    setValue('goldFloorProzent', combined.goldFloorProzent || 0);
    setValue('rebalancingBand', combined.rebalancingBand || 0);
    setValue('goldSteuerfrei', combined.goldSteuerfrei ? 'true' : 'false');

    setValue('runwayMinMonths', combined.runwayMinMonths || 0);
    setValue('runwayTargetMonths', combined.runwayTargetMonths || 0);
    setValue('targetEq', combined.targetEq || 0);
    setValue('rebalBand', combined.rebalBand || 0);
    setValue('maxSkimPctOfEq', combined.maxSkimPctOfEq || 0);
    setValue('maxBearRefillPctOfEq', combined.maxBearRefillPctOfEq || 0);

    setValue('p1StartAlter', combined.startAlter || 0);
    setSelect('p1Geschlecht', combined.geschlecht || 'm');
    setValue('p1SparerPauschbetrag', combined.startSPB || 0);
    setSelect('p1KirchensteuerPct', Math.round((combined.kirchensteuerSatz || 0) * 100));
    setValue('p1Monatsrente', combined.renteMonatlich || 0);
    setValue('p1StartInJahren', combined.renteStartOffsetJahre || 0);
    setSelect('rentAdjMode', combined.rentAdjMode || 'fix');
    setValue('rentAdjPct', combined.rentAdjPct || 0);

    const hasPartner = selectedCount > 1;
    setChecked('chkPartnerAktiv', hasPartner);
    setSelect('r2Geschlecht', combined.partner?.geschlecht || 'w');
    setValue('r2StartAlter', combined.partner?.startAlter || 0);
    setValue('r2StartInJahren', combined.partner?.startInJahren || 0);
    setValue('r2Monatsrente', combined.partner?.monatsrente || 0);
    setValue('r2SparerPauschbetrag', combined.partner?.sparerPauschbetrag || 0);
    setValue('r2KirchensteuerPct', combined.partner?.kirchensteuerPct || 0);

    const lockIds = [
        'p1StartAlter',
        'p1Geschlecht',
        'rentAdjMode',
        'rentAdjPct',
        'chkPartnerAktiv',
        'r2Geschlecht',
        'r2StartAlter',
        'r2StartInJahren',
        'r2Monatsrente',
        'r2SparerPauschbetrag',
        'r2KirchensteuerPct'
    ];
    lockIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = true;
    });

    const sectionRente2 = document.getElementById('sectionRente2');
    if (sectionRente2) {
        sectionRente2.style.display = hasPartner ? 'block' : 'none';
    }

    const accumulationToggle = document.getElementById('enableAccumulationPhase');
    const accumulationDetails = document.getElementById('accumulationPhaseDetails');
    if (accumulationToggle) {
        accumulationToggle.checked = false;
        accumulationToggle.disabled = true;
    }
    if (accumulationDetails) {
        accumulationDetails.style.display = 'none';
    }
}
