"use strict";

import { CONFIG } from './balance-config.js';
import { UIReader } from './balance-reader.js';
import { listProfiles, saveCurrentProfileFromLocalStorage, setProfileVerbundMembership, updateProfileData, getCurrentProfileId } from './profile-storage.js';
import {
    loadProfilverbundProfiles,
    aggregateProfilverbundInputs,
    calculateWithdrawalDistribution,
    buildProfilverbundAssetSummary,
    buildProfilverbundProfileSummaries
} from './profilverbund-balance.js';
import { renderProfilverbundProfileSelector, toggleProfilverbundMode } from './profilverbund-balance-ui.js';
import { shouldResetGuardrailState } from './balance-guardrail-reset.js';

export function createProfilverbundHandlers({ dom, PROFILVERBUND_STORAGE_KEYS }) {
    const refreshProfilverbundBalance = () => {
        const mode = localStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized';

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
        const runs = profiles.map(entry => {
            const input = buildProfileEngineInput(sharedInput, entry);
            const prevInputs = entry?.balanceState?.inputs || null;
            const lastState = shouldResetGuardrailState(prevInputs, input) ? null : (entry?.balanceState?.lastState || null);
            const result = window.EngineAPI.simulateSingleYear(input, lastState);
            if (result?.error) {
                throw result.error;
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
            return acc;
        }, { liquiditaet: 0, gold: 0, aktien: 0, geldmarkt: 0 });

        return {
            type: hasTransaction ? 'TRANSACTION' : 'NONE',
            title,
            anweisungKlasse,
            nettoErlös: runs.reduce((sum, run) => sum + (run.ui?.action?.nettoErlös || 0), 0),
            steuer: runs.reduce((sum, run) => sum + (run.ui?.action?.steuer || 0), 0),
            verwendungen: mergedUses
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
                localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(nextState));
            }
        });
    };

    const initProfilverbundBalance = () => {
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

        const storedMode = localStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized';

        modeSelect.value = storedMode;
        toggleProfilverbundMode(true);

        modeSelect.addEventListener('change', () => {
            localStorage.setItem(PROFILVERBUND_STORAGE_KEYS.mode, modeSelect.value);
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

            const aggregated = aggregateProfilverbundInputs(profilverbundProfiles, {
                floorBedarf: inputData.floorBedarf,
                flexBedarf: inputData.flexBedarf,
                flexBudgetAnnual: inputData.flexBudgetAnnual,
                flexBudgetYears: inputData.flexBudgetYears,
                flexBudgetRecharge: inputData.flexBudgetRecharge
            });
            window.__profilverbundDistribution = calculateWithdrawalDistribution(profilverbundProfiles, aggregated, localStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized');
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
