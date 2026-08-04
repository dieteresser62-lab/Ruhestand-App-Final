"use strict";

import { syncTranchenToInputs } from '../tranches/depot-tranchen-status.js';
import {
    assertProfileContextReady,
    listProfiles,
    getProfileData,
    getCurrentProfileId,
    setProfileVerbundMembership
} from '../profile/profile-storage.js';
import { buildSimulatorInputsFromProfileData, combineSimulatorProfiles } from './simulator-profile-inputs.js';
import { updateStartPortfolioDisplay } from './simulator-portfolio.js';
import { refreshDynamicFlexControls, syncDynamicFlexPresetSelection } from './simulator-main-dynamic-flex.js';
import { refreshThreeBucketControls } from './simulator-main-3bucket.js';
import {
    HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS,
    initializeHouseholdSimulatorNeeds,
    resolveHouseholdSimulatorNeed,
    selectLegacyHouseholdSimulatorNeeds
} from './simulator-household-needs-persistence.js';

const PROFILE_RECOVERY_CONTROL_IDS = Object.freeze([
    'mcButton',
    'btButton',
    'sweepButton',
    'sweepSelfTestButton',
    'findBestButton',
    'sensitivityButton',
    'paretoButton',
    'ao_run_btn',
    'ao_apply_btn'
]);

const PROFILE_RECOVERY_GUARDED_ACTIONS = Object.freeze([
    'runMonteCarlo',
    'runBacktest',
    'runParameterSweep',
    'runSweepSelfTest',
    'findAndDisplayBest',
    'showSensitivityAnalysis',
    'showParetoDialog'
]);

function setProfileRecoveryControlsBlocked(blocked) {
    PROFILE_RECOVERY_CONTROL_IDS.forEach(id => {
        const control = document.getElementById(id);
        if (!control) return;
        if (blocked) {
            if (!Object.prototype.hasOwnProperty.call(control.dataset, 'profileRecoveryWasDisabled')) {
                control.dataset.profileRecoveryWasDisabled = control.disabled ? 'true' : 'false';
            }
            control.disabled = true;
            control.setAttribute('aria-disabled', 'true');
            return;
        }
        if (Object.prototype.hasOwnProperty.call(control.dataset, 'profileRecoveryWasDisabled')) {
            control.disabled = control.dataset.profileRecoveryWasDisabled === 'true';
            delete control.dataset.profileRecoveryWasDisabled;
        }
        control.removeAttribute('aria-disabled');
    });
}

function installProfileRecoveryActionGuards(updateStatus) {
    if (typeof window === 'undefined' || window.__profileRecoveryActionGuardsInstalled) return;
    PROFILE_RECOVERY_GUARDED_ACTIONS.forEach(actionName => {
        const action = window[actionName];
        if (typeof action !== 'function') return;
        window[actionName] = function guardedProfileAction(...args) {
            const blocker = window.__profileRecoveryBlocker;
            if (blocker) {
                updateStatus(
                    `Profil-Recovery erforderlich: ${blocker.message || 'Profildaten konnten nicht sicher geladen werden.'}`,
                    'error'
                );
                return false;
            }
            return action.apply(this, args);
        };
    });
    window.__profileRecoveryActionGuardsInstalled = true;
}

function installProfileRecoveryLocalActionGuards(updateStatus) {
    if (typeof window === 'undefined' || window.__profileRecoveryLocalActionGuardsInstalled) return;
    document.addEventListener('click', event => {
        const action = event.target?.closest?.('#ao_run_btn, #ao_apply_btn');
        const blocker = window.__profileRecoveryBlocker;
        if (!action || !blocker) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        setProfileRecoveryControlsBlocked(true);
        window.__profileRecoveryBlockedActionCount =
            (window.__profileRecoveryBlockedActionCount || 0) + 1;
        updateStatus(
            `Profil-Recovery erforderlich: ${blocker.message || 'Profildaten konnten nicht sicher geladen werden.'}`,
            'error'
        );
    }, true);

    const runButton = document.getElementById('ao_run_btn');
    if (runButton && typeof MutationObserver === 'function') {
        const observer = new MutationObserver(() => {
            if (window.__profileRecoveryBlocker && !runButton.disabled) {
                setProfileRecoveryControlsBlocked(true);
            }
        });
        observer.observe(runButton, {
            attributes: true,
            attributeFilter: ['disabled']
        });
        window.__profileRecoveryAutoOptimizeObserver = observer;
    }
    window.__profileRecoveryLocalActionGuardsInstalled = true;
}

export function initSimulatorProfileSelection() {
    const listContainer = document.getElementById('simProfileList');
    const statusEl = document.getElementById('simProfileStatus');
    if (!listContainer) {
        if (typeof window !== 'undefined') {
            window.__profileRecoveryBlocker = {
                message: 'Profilverbund konnte nicht initialisiert werden; die Bedarfsmigration bleibt ausstehend.'
            };
        }
        setProfileRecoveryControlsBlocked(true);
        if (statusEl) {
            statusEl.dataset.kind = 'error';
            statusEl.textContent = 'Profil-Recovery erforderlich: Profilverbund-Steuerelement fehlt.';
        }
        return;
    }
    const MAX_HOUSEHOLD_PROFILES = 2;

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

    const blockProfileSimulation = (blocker) => {
        if (typeof window !== 'undefined') {
            window.__profilverbundTranchenOverride = null;
            window.__profilverbundPreferAggregates = false;
            window.__profilverbundMinimumFlexProfiles = null;
            window.__profileRecoveryBlocker = blocker || {
                message: 'Profildaten konnten nicht sicher geladen werden.'
            };
        }
        setProfileRecoveryControlsBlocked(true);
    };

    const unblockProfileSimulation = () => {
        if (typeof window !== 'undefined') {
            window.__profileRecoveryBlocker = null;
        }
        setProfileRecoveryControlsBlocked(false);
    };

    installProfileRecoveryActionGuards(updateStatus);
    installProfileRecoveryLocalActionGuards(updateStatus);

    // Enforce at most two profiles per household; keep current if possible.
    const limitSelection = (selected, currentId) => {
        if (selected.length <= MAX_HOUSEHOLD_PROFILES) return selected;
        const current = selected.find(p => p.id === currentId);
        const limited = [];
        if (current) limited.push(current);
        for (const profile of selected) {
            if (limited.length >= MAX_HOUSEHOLD_PROFILES) break;
            if (!current || profile.id !== current.id) limited.push(profile);
        }
        return limited;
    };

    const applySelectionUnchecked = () => {
        assertProfileContextReady();
        const profiles = listProfiles();
        if (!profiles.length) {
            blockProfileSimulation({ message: 'Keine Profile vorhanden.' });
            updateStatus('Keine Profile vorhanden.', 'error');
            return false;
        }

        let selected = profiles.filter(p => p.belongsToHousehold !== false);
        if (!selected.length) {
            const currentId = getCurrentProfileId();
            const preferred = profiles.find(p => p.id === currentId) || profiles[0];
            profiles.forEach(profile => setProfileVerbundMembership(profile.id, profile.id === preferred?.id));
            selected = preferred ? [preferred] : [];
            renderList(profiles);
        }

        const currentId = getCurrentProfileId();
        let selectionWarning = '';
        if (selected.length > MAX_HOUSEHOLD_PROFILES) {
            const limited = limitSelection(selected, currentId);
            const limitedIds = new Set(limited.map(p => p.id));
            profiles.forEach(profile => setProfileVerbundMembership(profile.id, limitedIds.has(profile.id)));
            renderList(profiles);
            selected = limited;
            selectionWarning = 'Haushalte im Simulator sind auf 2 Personen begrenzt. Auswahl wurde gekuerzt.';
        }

        // Convert each profile into simulator inputs before aggregation.
        const profileInputs = selected.map(meta => {
            const data = getProfileData(meta.id);
            try {
                const inputs = buildSimulatorInputsFromProfileData(data);
                const legacyHouseholdNeeds = Object.fromEntries(
                    HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS.map(fieldId => [
                        fieldId,
                        data?.[`sim_${fieldId}`]
                    ])
                );
                return {
                    profileId: meta.id,
                    name: meta.name || meta.id,
                    inputs,
                    legacyHouseholdNeeds
                };
            } catch (error) {
                const profileError = new Error(
                    `Profil ${meta.name || meta.id}: ${error?.message || 'Profildaten konnten nicht sicher geladen werden.'}`
                );
                profileError.name = 'SimulatorProfileStateError';
                profileError.code = error?.code || 'PROFILE_STATE_LOAD_FAILED';
                profileError.profileId = meta.id;
                profileError.storageKey = error?.storageKey || null;
                profileError.raw = error?.raw ?? null;
                profileError.cause = error;
                throw profileError;
            }
        });

        const primaryId = selected.find(p => p.id === currentId)?.id || selected[0]?.id;
        const { combined, warnings } = combineSimulatorProfiles(profileInputs, primaryId);

        if (!combined) {
            const blockingMessage = Array.isArray(warnings) && warnings.length
                ? warnings.join(' ')
                : 'Profil-Daten fuer Simulator fehlen.';
            blockProfileSimulation({ message: blockingMessage });
            updateStatus(blockingMessage, 'error');
            return false;
        }

        const legacySelection = selectLegacyHouseholdSimulatorNeeds(profileInputs.map(entry => ({
            legacyValues: entry.legacyHouseholdNeeds,
            profileDefaults: {
                startFloorBedarf: entry.inputs.startFloorBedarf,
                startFlexBedarf: entry.inputs.startFlexBedarf,
                minimumFlexAnnual: entry.inputs.minimumFlexAnnual
            }
        })));
        const householdNeedsState = initializeHouseholdSimulatorNeeds(legacySelection);
        const householdNeedOverrides = householdNeedsState.values;
        const minimumFlexOverridden = Object.prototype.hasOwnProperty.call(
            householdNeedOverrides || {},
            'minimumFlexAnnual'
        );

        if (typeof window !== 'undefined') {
            // Overrides allow the simulator to use aggregated tranche data.
            const override = Array.isArray(combined.detailledTranches) ? combined.detailledTranches : null;
            window.__profilverbundTranchenOverride = override;
            window.__profilverbundPreferAggregates = !override;
            // A manual household minimum has no attributable per-profile split.
            window.__profilverbundMinimumFlexProfiles = !minimumFlexOverridden
                && Array.isArray(combined.minimumFlexProfiles)
                ? combined.minimumFlexProfiles
                : null;
        }

        applyCombinedInputsToUI(combined, selected.length, householdNeedOverrides);
        syncTranchenToInputs({ silent: true });
        updateStartPortfolioDisplay();
        unblockProfileSimulation();

        const statusWarnings = [
            ...(Array.isArray(warnings) ? warnings : []),
            selectionWarning,
            householdNeedsState.warning
        ].filter(Boolean);
        if (statusWarnings.length > 0) {
            updateStatus(statusWarnings.join(' '), 'error');
        } else {
            updateStatus(`Aktive Profile: ${selected.length}.`, 'ok');
        }
    };

    const applySelection = () => {
        try {
            return applySelectionUnchecked();
        } catch (error) {
            listContainer.innerHTML = '';
            blockProfileSimulation(error);
            updateStatus(
                `Profil-Recovery erforderlich: ${error?.message || 'Profildaten konnten nicht sicher geladen werden.'}`,
                'error'
            );
            return false;
        }
    };

    let profiles;
    try {
        profiles = listProfiles();
    } catch (error) {
        blockProfileSimulation(error);
        updateStatus(
            `Profil-Recovery erforderlich: ${error?.message || 'Die Profilregistry konnte nicht sicher geladen werden.'}`,
            'error'
        );
        return;
    }
    renderList(profiles);
    listContainer.addEventListener('change', (event) => {
        const target = event.target;
        if (!target || target.type !== 'checkbox') return;
        const profileId = target.dataset.profileId || target.value;
        if (!profileId) return;
        if (target.checked) {
            const checked = listContainer.querySelectorAll('input[type="checkbox"]:checked');
            if (checked.length > MAX_HOUSEHOLD_PROFILES) {
                target.checked = false;
                setProfileVerbundMembership(profileId, false);
                updateStatus('Haushalte im Simulator sind auf 2 Personen begrenzt.', 'error');
                return;
            }
        }
        setProfileVerbundMembership(profileId, target.checked);
        applySelection();
    });

    applySelection();
}

function applyCombinedInputsToUI(combined, selectedCount, householdNeedOverrides) {
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
    const setHouseholdNeedValue = (id, value) => {
        setValue(id, value);
        const el = document.getElementById(id);
        if (el) el.dataset.householdNeedLastValidValue = String(value);
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

    setValue('liquidityRunwayYears', combined.liquidityRunwayYears || 5);
    setValue('entnahmeStrategie', combined.decumulation?.mode || 'standard');
    setValue('bondTargetFactor', combined.decumulation?.bondTargetFactor ?? '');
    setValue('drawdownTrigger', combined.decumulation?.drawdownTrigger ?? '');
    setValue('bondRefillThreshold', combined.decumulation?.bondRefillThreshold ?? '');
    setValue('maxSkimPctOfEq', combined.maxSkimPctOfEq || 0);
    setValue('maxBearRefillPctOfEq', combined.maxBearRefillPctOfEq || 0);
    // Dynamic-Flex bleibt bewusst bei den aktuell gesetzten Rahmendaten.
    // Profilverbund-Aggregation überschreibt diese Felder nicht.
    syncDynamicFlexPresetSelection();
    refreshDynamicFlexControls();
    refreshThreeBucketControls();
    setHouseholdNeedValue('startFloorBedarf', resolveHouseholdSimulatorNeed(
        'startFloorBedarf', combined.startFloorBedarf || 0, householdNeedOverrides
    ));
    setHouseholdNeedValue('startFlexBedarf', resolveHouseholdSimulatorNeed(
        'startFlexBedarf', combined.startFlexBedarf || 0, householdNeedOverrides
    ));
    setHouseholdNeedValue('minimumFlexAnnual', resolveHouseholdSimulatorNeed(
        'minimumFlexAnnual', combined.minimumFlexAnnual || 0, householdNeedOverrides
    ));
    setValue('marketCapeRatio', combined.marketCapeRatio || 0);

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
        'chkPartnerAktiv'
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
