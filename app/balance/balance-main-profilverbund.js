/**
 * Module: Balance Main Profilverbund
 * Purpose: Manages the "Profilverbund" (Profile Compound) logic for multi-person households.
 *          It runs one household simulation and attributes the finalized action to profile-owned sources.
 * Usage: Used by balance-main.js to handle multi-profile scenarios.
 * Dependencies: profile-storage.js, profilverbund-balance.js, profilverbund-action-attribution.js,
 *               profilverbund-balance-ui.js
 */
"use strict";

import { CONFIG } from './balance-config.js';
import { UIReader } from './balance-reader.js';
import {
    createProfileOwnedBalanceState,
    listProfiles,
    saveCurrentProfileFromLocalStorage,
    setProfileVerbundMembership,
    updateProfileData,
    getCurrentProfileId
} from '../profile/profile-storage.js';
import {
    loadProfilverbundProfiles,
    aggregateProfilverbundInputs,
    calculateHouseholdWithdrawalNeed,
    calculateWithdrawalDistribution,
    buildProfilverbundAssetSummary,
    buildProfilverbundProfileSummaries
} from '../profile/profilverbund-balance.js';
import { renderProfilverbundProfileSelector, toggleProfilverbundMode } from '../profile/profilverbund-balance-ui.js';
import {
    attributeHouseholdAction,
    reconcileHouseholdLiquidityKpis
} from '../profile/profilverbund-action-attribution.js';
import { persistenceStorage } from '../shared/persistence-facade.js';
import { StorageManager } from './balance-storage.js';

export function createProfilverbundHandlers({ dom, PROFILVERBUND_STORAGE_KEYS }) {
    let profilverbundBound = false;

    const renderProfileRecoveryBlocker = (error) => {
        if (typeof window !== 'undefined') {
            window.__profilverbundDistribution = null;
            window.__profilverbundProfileSummaries = null;
        }
        const container = dom?.containers?.error;
        if (container) {
            container.className = 'error-warn';
            container.textContent = `Profil-Recovery erforderlich: ${error?.message || 'Profildaten konnten nicht sicher geladen werden.'}`;
        }
        return false;
    };

    const refreshProfilverbundBalance = () => {
        const mode = persistenceStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized';

        let profileInputs;
        try {
            saveCurrentProfileFromLocalStorage();
            profileInputs = loadProfilverbundProfiles();
        } catch (error) {
            return renderProfileRecoveryBlocker(error);
        }
        if (profileInputs.length < 1) {
            return false;
        }

        const currentInputs = UIReader.readAllInputs();
        const aggregated = aggregateProfilverbundInputs(profileInputs, {
            floorBedarf: currentInputs.floorBedarf,
            flexBedarf: currentInputs.flexBedarf,
            flexBudgetAnnual: currentInputs.flexBudgetAnnual,
            flexBudgetYears: currentInputs.flexBudgetYears,
            flexBudgetRecharge: currentInputs.flexBudgetRecharge
        });
        calculateWithdrawalDistribution(profileInputs, aggregated, mode);
        calculateWithdrawalDistribution(profileInputs, aggregated, 'proportional');
        return true;
    };

    const buildProfileEngineInput = (sharedInput, entry) => {
        const inputs = entry?.inputs || {};
        const output = { ...sharedInput };
        const perProfileKeys = [
            'aktuellesAlter',
            'tagesgeld',
            'geldmarktEtf',
            'depotwertAlt',
            'depotwertNeu',
            'goldWert',
            'costBasisAlt',
            'costBasisNeu',
            'goldCost',
            'tqfAlt',
            'tqfNeu',
            'renteAktiv',
            'renteMonatlich',
            'kirchensteuerSatz',
            'sparerPauschbetrag',
            'goldAktiv',
            'goldZielProzent',
            'goldFloorProzent',
            'goldSteuerfrei',
            'rebalancingBand'
        ];
        perProfileKeys.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(inputs, key)) {
                output[key] = inputs[key];
            }
        });
        output.detailledTranches = Array.isArray(entry?.tranches) ? entry.tranches : [];
        return output;
    };

    const runProfilverbundProfileSimulations = (sharedInput, profiles, householdLastState = null) => {
        const mode = persistenceStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized';
        const householdNeed = calculateHouseholdWithdrawalNeed(profiles, {
            floorBedarf: sharedInput.floorBedarf,
            flexBedarf: sharedInput.flexBedarf,
            flexBudgetAnnual: sharedInput.flexBudgetAnnual,
            flexBudgetYears: sharedInput.flexBudgetYears,
            flexBudgetRecharge: sharedInput.flexBudgetRecharge
        });
        const householdInput = {
            ...sharedInput,
            detailledTranches: buildProfilverbundAssetSummary(profiles).mergedTranches,
            finalizeThreeBucketAction: true,
            deferTaxSettlement: true
        };
        const householdResult = window.EngineAPI.simulateSingleYear(householdInput, householdLastState);
        if (householdResult?.error) {
            throw householdResult.error;
        }
        const decidedAnnualWithdrawal = Number(householdResult?.ui?.spending?.monatlicheEntnahme) * 12;
        if (!Number.isFinite(decidedAnnualWithdrawal) || decidedAnnualWithdrawal < 0) {
            throw new Error('Profilverbund: Haushalts-Engine lieferte keinen gueltigen Entnahmebedarf.');
        }

        const distribution = calculateWithdrawalDistribution(
            profiles,
            { ...householdNeed, netWithdrawal: decidedAnnualWithdrawal },
            mode
        );
        const allocatedTotal = distribution.items.reduce((sum, item) => sum + (item.withdrawalAmount || 0), 0);
        if (distribution.remaining > 0.01 || Math.abs(allocatedTotal - distribution.totalNeed) > 0.01) {
            throw new Error(`Profilverbund: ${distribution.remaining.toFixed(2)} EUR Haushaltsbedarf konnten keinem Profil zugeordnet werden.`);
        }
        const allocationByProfile = new Map(distribution.items.map(item => [item.profileId, item.withdrawalAmount]));

        const finalizedHouseholdAction = householdResult.ui?.action || {};
        const threeBucketDiagnosis = householdResult.ui?.threeBucket || null;

        const attribution = attributeHouseholdAction({
            householdAction: finalizedHouseholdAction,
            profiles,
            mode
        });
        householdResult.ui.action = attribution.finalAction;
        householdResult.diagnosis = householdResult.diagnosis || {};
        householdResult.diagnosis.keyParams = householdResult.diagnosis.keyParams || {};
        householdResult.diagnosis.keyParams.taxSettlement = attribution.finalAction.taxSettlement;
        reconcileHouseholdLiquidityKpis({
            modelResult: householdResult,
            inputData: householdInput,
            action: attribution.finalAction
        });
        const attributedByProfile = new Map(attribution.profileActions.map(entry => [entry.profileId, entry]));
        const runs = profiles.map(entry => {
            const attributed = attributedByProfile.get(entry.profileId);
            if (!attributed) {
                throw new Error(`Profilverbund: Keine Action-Attribution fuer Profil ${entry.profileId}.`);
            }
            const persistedInput = buildProfileEngineInput(sharedInput, entry);
            const previousLastState = entry?.balanceState?.lastState || {};
            const withdrawalAmount = allocationByProfile.get(entry.profileId) || 0;
            return {
                profileId: entry.profileId,
                name: entry.name || entry.profileId,
                input: persistedInput,
                persistedInput,
                ui: {
                    action: attributed.action,
                    spending: { monatlicheEntnahme: withdrawalAmount / 12 },
                    zielLiquiditaet: null
                },
                newState: {
                    ...previousLastState,
                    taxState: attributed.taxStateNext
                },
                balanceState: entry.balanceState
            };
        });

        if (typeof window !== 'undefined') {
            window.__profilverbundDistribution = distribution;
            window.__profilverbundActionResults = runs.map(run => ({
                profileId: run.profileId,
                name: run.name,
                action: run.ui?.action || {},
                input: run.input,
                spending: run.ui?.spending || {},
                targetLiquidity: run.ui?.zielLiquiditaet
            }));
        }
        runs.householdResult = householdResult;
        runs.householdInput = householdInput;
        runs.distribution = distribution;
        runs.finalAction = attribution.finalAction;
        runs.taxSettlements = attribution.settlements;
        runs.threeBucketDiagnosis = threeBucketDiagnosis;
        return runs;
    };

    const mergeProfilverbundActions = (runs) => {
        if (!runs?.finalAction) {
            throw new Error('Profilverbund: Finalisierte Haushaltsaktion fehlt.');
        }
        return runs.finalAction;
    };

    const writeProfileBalanceState = (profileId, nextState, { mainStatePatch = {} } = {}) => {
        const isActiveProfile = profileId === getCurrentProfileId();
        const profileState = createProfileOwnedBalanceState(nextState);
        updateProfileData(profileId, {
            [CONFIG.STORAGE.LS_KEY]: JSON.stringify(profileState)
        });
        if (isActiveProfile) {
            const currentMainState = StorageManager.loadState();
            StorageManager.saveState({
                ...currentMainState,
                ...mainStatePatch
            });
        }
    };

    const persistProfilverbundInputs = (runs) => {
        runs.forEach(run => {
            const existing = (run.balanceState && typeof run.balanceState === 'object') ? run.balanceState : {};
            const nextState = {
                ...existing,
                inputs: run.persistedInput || run.input,
                profilverbundHouseholdInputs: runs.householdInput || existing.profilverbundHouseholdInputs
            };
            writeProfileBalanceState(run.profileId, nextState, {
                mainStatePatch: {
                    inputs: nextState.inputs,
                    profilverbundHouseholdInputs: nextState.profilverbundHouseholdInputs
                }
            });
        });
    };

    const persistProfilverbundProfileStates = (runs, { lifecycle = null } = {}) => {
        // Steuerliche Verlustvortraege sind pro Profil autoritativ. Der
        // Haushalts-State dient nur als gemeinsamer Guardrail-Kontext und darf
        // keinen zweiten, konkurrierenden Verlusttopf fortschreiben.
        const householdNewState = runs.householdResult?.newState
            ? { ...runs.householdResult.newState, taxState: { lossCarry: 0 } }
            : null;
        runs.forEach(run => {
            const existing = (run.balanceState && typeof run.balanceState === 'object') ? run.balanceState : {};
            const nextState = {
                ...existing,
                inputs: run.persistedInput || run.input,
                lastState: run.newState,
                profilverbundHouseholdInputs: runs.householdInput || existing.profilverbundHouseholdInputs,
                profilverbundHouseholdLastState: householdNewState || existing.profilverbundHouseholdLastState
            };
            writeProfileBalanceState(run.profileId, nextState, {
                mainStatePatch: {
                    inputs: nextState.inputs,
                    lastState: nextState.lastState,
                    profilverbundHouseholdInputs: nextState.profilverbundHouseholdInputs,
                    profilverbundHouseholdLastState: nextState.profilverbundHouseholdLastState,
                    ...(lifecycle ? { balanceStateLifecycle: lifecycle } : {})
                }
            });
        });
    };

    const initProfilverbundBalance = () => {
        if (profilverbundBound) return;
        const modeSelect = document.getElementById('profilverbund-withdrawal-mode');
        const profileList = document.getElementById('profilverbund-profile-list');

        if (!modeSelect || !profileList) return;

        let profiles;
        try {
            profiles = listProfiles();
        } catch (error) {
            renderProfileRecoveryBlocker(error);
            return;
        }
        if (profiles.length < 1) {
            toggleProfilverbundMode(false);
            return;
        }

        renderProfilverbundProfileSelector(profiles, 'profilverbund-profile-list');

        const storedMode = persistenceStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized';

        modeSelect.value = storedMode;
        toggleProfilverbundMode(true);

        modeSelect.addEventListener('change', () => {
            persistenceStorage.setItem(PROFILVERBUND_STORAGE_KEYS.mode, modeSelect.value);
            refreshProfilverbundBalance();
        });

        profileList.addEventListener('change', event => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            const profileId = target.dataset.profileId;
            if (!profileId) return;
            setProfileVerbundMembership(profileId, target.checked);
            refreshProfilverbundBalance();
        });

        profilverbundBound = true;
        refreshProfilverbundBalance();
    };

    const updateProfilverbundGlobals = (profilverbundProfiles, inputData) => {
        if (profilverbundProfiles.length > 0) {
            const assetSummary = buildProfilverbundAssetSummary(profilverbundProfiles);
            const totalRenteMonatlich = assetSummary.totalRenteMonatlich;
            inputData.tagesgeld = assetSummary.totalTagesgeld;
            inputData.geldmarktEtf = assetSummary.totalGeldmarkt;
            inputData.depotwertAlt = assetSummary.totalDepotAlt;
            inputData.depotwertNeu = assetSummary.totalDepotNeu;
            inputData.costBasisAlt = assetSummary.totalCostAlt;
            inputData.costBasisNeu = assetSummary.totalCostNeu;
            inputData.goldWert = assetSummary.totalGold;
            inputData.goldCost = assetSummary.totalGoldCost;
            inputData.detailledTranches = assetSummary.mergedTranches;
            inputData.goldAktiv = assetSummary.goldStrategy.goldAktiv;
            inputData.goldBasisVermoegen = assetSummary.goldStrategy.goldBasisVermoegen;
            inputData.goldZielBetrag = assetSummary.goldStrategy.goldZielBetrag;
            inputData.goldFloorBetrag = assetSummary.goldStrategy.goldFloorBetrag;
            inputData.goldZielProzent = assetSummary.goldStrategy.goldZielProzent;
            inputData.goldFloorProzent = assetSummary.goldStrategy.goldFloorProzent;
            inputData.goldSteuerfrei = assetSummary.goldStrategy.goldSteuerfrei;
            inputData.rebalancingBand = assetSummary.goldStrategy.rebalancingBand;
            inputData.goldStrategyDiagnostics = assetSummary.goldStrategy.diagnostics;
            inputData.renteAktiv = totalRenteMonatlich > 0;
            inputData.renteMonatlich = totalRenteMonatlich;
            if (assetSummary.primaryHealthBucket) {
                inputData.healthBucket = assetSummary.primaryHealthBucket;
                inputData.healthBucketEnabled = assetSummary.primaryHealthBucket.enabled;
                inputData.healthBucketInitialAmount = assetSummary.primaryHealthBucket.initialAmount;
            }

            const aggregated = aggregateProfilverbundInputs(profilverbundProfiles, {
                floorBedarf: inputData.floorBedarf,
                flexBedarf: inputData.flexBedarf,
                flexBudgetAnnual: inputData.flexBudgetAnnual,
                flexBudgetYears: inputData.flexBudgetYears,
                flexBudgetRecharge: inputData.flexBudgetRecharge
            });
            window.__profilverbundDistribution = calculateWithdrawalDistribution(profilverbundProfiles, aggregated, persistenceStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized');
            window.__profilverbundProfileSummaries = buildProfilverbundProfileSummaries(profilverbundProfiles);
        } else {
            window.__profilverbundDistribution = null;
            window.__profilverbundProfileSummaries = null;
        }
    };

    return {
        refreshProfilverbundBalance,
        runProfilverbundProfileSimulations,
        mergeProfilverbundActions,
        persistProfilverbundInputs,
        persistProfilverbundProfileStates,
        initProfilverbundBalance,
        updateProfilverbundGlobals
    };
}
