/**
 * Module: Balance Main Profilverbund
 * Purpose: Manages the "Profilverbund" (Profile Compound) logic, allowing simulation of multi-person households (e.g., couples).
 *          It handles aggregating inputs from multiple profiles, running simulations for each, and merging the results.
 * Usage: Used by balance-main.js to handle multi-profile scenarios.
 * Dependencies: profile-storage.js, profilverbund-balance.js, profilverbund-balance-ui.js, balance-guardrail-reset.js
 */
"use strict";

import { CONFIG } from './balance-config.js';
import { UIReader } from './balance-reader.js';
import { listProfiles, saveCurrentProfileFromLocalStorage, setProfileVerbundMembership, updateProfileData, getCurrentProfileId } from '../profile/profile-storage.js';
import {
    loadProfilverbundProfiles,
    aggregateProfilverbundInputs,
    calculateWithdrawalDistribution,
    buildProfilverbundAssetSummary,
    buildProfilverbundProfileSummaries
} from '../profile/profilverbund-balance.js';
import { renderProfilverbundProfileSelector, toggleProfilverbundMode } from '../profile/profilverbund-balance-ui.js';
import { shouldResetGuardrailState } from './balance-guardrail-reset.js';
import { applyThreeBucketLogic, appendBondReplenishment, isBondCategory, sumBondBucketValuation } from '../../engine/transactions/three-bucket-logic.mjs';
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

    const runProfilverbundProfileSimulations = (sharedInput, profiles) => {
        // Calculate total equity across all profiles for prorating bond targets
        const totalHouseholdEquity = profiles.reduce((sum, entry) => {
            const input = buildProfileEngineInput(sharedInput, entry);
                const equityOnly = (input.detailledTranches || []).reduce((trancheSum, t) => {
                    const isBond = isBondCategory(t.type) || isBondCategory(t.category);
                    return trancheSum + (!isBond ? (Number(t.marketValue) || 0) : 0);
                }, 0);
            return sum + equityOnly;
        }, 0);

        const runs = profiles.map(entry => {
            const input = buildProfileEngineInput(sharedInput, entry);
            const prevInputs = entry?.balanceState?.inputs || null;
            const previousLastState = entry?.balanceState?.lastState || null;
            const preservedTaxState = previousLastState?.taxState
                ? { taxState: previousLastState.taxState }
                : null;
            const lastState = shouldResetGuardrailState(prevInputs, input)
                ? preservedTaxState
                : previousLastState;
            const result = window.EngineAPI.simulateSingleYear(input, lastState);
            if (result?.error) {
                throw result.error;
            }

            let finalAction = result.ui?.action || {};
            if (input.decumulation && input.decumulation.mode === '3_bucket_jilge' && result.ui && result.ui.action) {
                const market = {
                    realReturnEq: (Number(result.newState?.marketData?.returns?.realEq) || 0),
                    sKey: result.ui?.market?.sKey || 'neutral'
                };
                const bondBucketBefore = sumBondBucketValuation(input.detailledTranches || []);
                const jahresEntnahmeTarget = Math.max(0, input.floorBedarf - (input.renteAktiv ? (input.renteMonatlich * 12) : 0)) + Math.max(0, input.flexBedarf);
                const threeBucketResult = applyThreeBucketLogic(
                    input.detailledTranches || [],
                    input,
                    market,
                    result.ui.action,
                    market.realReturnEq,
                    bondBucketBefore
                );

                // Prorate the target factor based on this profile's share of total household equity
                const profileEquity = (input.detailledTranches || []).reduce((trancheSum, t) => {
                    const isBond = isBondCategory(t.type) || isBondCategory(t.category);
                    return trancheSum + (!isBond ? (Number(t.marketValue) || 0) : 0);
                }, 0);
                const equityShare = totalHouseholdEquity > 0 ? (profileEquity / totalHouseholdEquity) : 0;
                const proratedEntnahmeTarget = jahresEntnahmeTarget * equityShare;

                // For simplicity, we apply the refill independently to each profile.
                const replenishResult = appendBondReplenishment(
                    input.detailledTranches || [],
                    input,
                    threeBucketResult.updatedAction,
                    market.realReturnEq,
                    proratedEntnahmeTarget,
                    bondBucketBefore, // This is individual bond bucket
                    market
                );

                finalAction = replenishResult.updatedAction;
                result.ui.action = finalAction;
            }

            return {
                profileId: entry.profileId,
                name: entry.name || entry.profileId,
                input,
                ui: result.ui,
                newState: result.newState,
                balanceState: entry.balanceState
            };
        });

        if (typeof window !== 'undefined') {
            window.__profilverbundActionResults = runs.map(run => ({
                profileId: run.profileId,
                name: run.name,
                action: run.ui?.action || {},
                input: run.input,
                spending: run.ui?.spending || {},
                targetLiquidity: run.ui?.zielLiquiditaet
            }));
        }
        return runs;
    };

    const mergeProfilverbundActions = (runs) => {
        const hasTransaction = runs.some(run => run.ui?.action?.type === 'TRANSACTION');
        const title = hasTransaction ? 'Profilverbund-Transaktionen' : (runs[0]?.ui?.action?.title || 'Kein Handlungsbedarf');
        const anweisungKlasse = hasTransaction ? 'anweisung-gelb' : (runs[0]?.ui?.action?.anweisungKlasse || 'anweisung-gruen');
        const mergedUses = runs.reduce((acc, run) => {
            const uses = run.ui?.action?.verwendungen || {};
            acc.liquiditaet += uses.liquiditaet || 0;
            acc.gold += uses.gold || 0;
            acc.aktien += uses.aktien || 0;
            acc.geldmarkt += uses.geldmarkt || 0;
            acc.bonds += uses.bonds || 0;
            return acc;
        }, { liquiditaet: 0, gold: 0, aktien: 0, geldmarkt: 0, bonds: 0 });

        return {
            type: hasTransaction ? 'TRANSACTION' : 'NONE',
            title,
            anweisungKlasse,
            nettoErlös: runs.reduce((sum, run) => sum + (run.ui?.action?.nettoErlös || 0), 0),
            steuer: runs.reduce((sum, run) => sum + (run.ui?.action?.steuer || 0), 0),
            verwendungen: mergedUses,
            quellen: runs.flatMap(run => run.ui?.action?.quellen || [])
        };
    };

    const persistProfilverbundProfileStates = (runs) => {
        runs.forEach(run => {
            const existing = (run.balanceState && typeof run.balanceState === 'object') ? run.balanceState : {};
            const nextState = { ...existing, inputs: run.input, lastState: run.newState };
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

        profiles.forEach(profile => {
            setProfileVerbundMembership(profile.id, true);
        });
        const refreshedProfiles = listProfiles();
        renderProfilverbundProfileSelector(refreshedProfiles, 'profilverbund-profile-list');

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
