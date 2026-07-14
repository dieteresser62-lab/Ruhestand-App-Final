/**
 * Module: Balance Main Profilverbund
 * Purpose: Manages the "Profilverbund" (Profile Compound) logic for multi-person households.
 *          It runs one household simulation and attributes the finalized action to profile-owned sources.
 * Usage: Used by balance-main.js to handle multi-profile scenarios.
 * Dependencies: profile-storage.js, profilverbund-balance.js, profilverbund-action-attribution.js,
 *               profilverbund-balance-ui.js, three-bucket-logic.mjs
 */
"use strict";

import { CONFIG } from './balance-config.js';
import { UIReader } from './balance-reader.js';
import { listProfiles, saveCurrentProfileFromLocalStorage, setProfileVerbundMembership, updateProfileData, getCurrentProfileId } from '../profile/profile-storage.js';
import {
    loadProfilverbundProfiles,
    aggregateProfilverbundInputs,
    calculateHouseholdWithdrawalNeed,
    calculateWithdrawalDistribution,
    buildProfilverbundAssetSummary,
    buildProfilverbundProfileSummaries
} from '../profile/profilverbund-balance.js';
import { renderProfilverbundProfileSelector, toggleProfilverbundMode } from '../profile/profilverbund-balance-ui.js';
import { applyThreeBucketLogic, appendBondReplenishment, sumBondBucketValuation } from '../../engine/transactions/three-bucket-logic.mjs';
import {
    attributeHouseholdAction,
    reconcileHouseholdLiquidityKpis
} from '../profile/profilverbund-action-attribution.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

export function createProfilverbundHandlers({ dom, PROFILVERBUND_STORAGE_KEYS }) {
    let profilverbundBound = false;

    const refreshProfilverbundBalance = () => {
        const mode = persistenceStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized';

        saveCurrentProfileFromLocalStorage();
        const profileInputs = loadProfilverbundProfiles();
        if (profileInputs.length < 1) {
            return;
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
            detailledTranches: buildProfilverbundAssetSummary(profiles).mergedTranches
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

        let finalizedHouseholdAction = householdResult.ui?.action || {};
        let threeBucketDiagnosis = null;
        if (householdInput.decumulation?.mode === '3_bucket_jilge' && householdResult.ui?.action) {
            const market = {
                realReturnEq: Number(householdResult.newState?.marketData?.returns?.realEq) || 0,
                sKey: householdResult.ui?.market?.sKey || 'neutral'
            };
            const bondBucketBefore = sumBondBucketValuation(householdInput.detailledTranches || []);
            const threeBucketResult = applyThreeBucketLogic(
                householdInput.detailledTranches || [],
                householdInput,
                market,
                finalizedHouseholdAction,
                market.realReturnEq,
                bondBucketBefore
            );
            const annualWithdrawalTarget = Math.max(
                0,
                (Number(householdResult.ui?.spending?.monatlicheEntnahme) || 0) * 12
            );
            const replenishResult = appendBondReplenishment(
                householdInput.detailledTranches || [],
                householdInput,
                threeBucketResult.updatedAction,
                market.realReturnEq,
                annualWithdrawalTarget,
                bondBucketBefore,
                market
            );
            finalizedHouseholdAction = replenishResult.updatedAction;
            threeBucketDiagnosis = {
                ...threeBucketResult.threeBucketState,
                bondRefillNet: Number(replenishResult.bondReplenishmentAmount) || 0,
                bondRefillGross: Number(replenishResult.addedActionDelta?.quellen?.reduce(
                    (total, source) => total + (Number(source?.brutto) || 0),
                    0
                )) || 0,
                bondRefillTax: Number(replenishResult.addedActionDelta?.steuer) || 0
            };
        }

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

    const persistProfilverbundProfileStates = (runs) => {
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
            updateProfileData(run.profileId, {
                [CONFIG.STORAGE.LS_KEY]: JSON.stringify(nextState)
            });
            if (run.profileId === getCurrentProfileId()) {
                persistenceStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(nextState));
            }
        });
    };

    const initProfilverbundBalance = () => {
        if (profilverbundBound) return;
        const modeSelect = document.getElementById('profilverbund-withdrawal-mode');
        const profileList = document.getElementById('profilverbund-profile-list');

        if (!modeSelect || !profileList) return;

        const profiles = listProfiles();
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
        persistProfilverbundProfileStates,
        initProfilverbundBalance,
        updateProfilverbundGlobals
    };
}
