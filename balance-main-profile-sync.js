"use strict";

import { UIReader } from './balance-reader.js';
import { UIUtils } from './balance-utils.js';
import { loadProfilverbundProfiles, buildProfilverbundAssetSummary } from './profilverbund-balance.js';

export function createProfileSyncHandlers({ dom, PROFILE_VALUE_KEYS }) {
    const syncProfileDerivedInputs = () => {
        const tagesgeldRaw = localStorage.getItem(PROFILE_VALUE_KEYS.tagesgeld);
        const renteAktivRaw = localStorage.getItem(PROFILE_VALUE_KEYS.renteAktiv);
        const renteMonatlichRaw = localStorage.getItem(PROFILE_VALUE_KEYS.renteMonatlich);
        const alterRaw = localStorage.getItem(PROFILE_VALUE_KEYS.alter);
        const goldAktivRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldAktiv);
        const goldZielRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldZiel);
        const goldFloorRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldFloor);
        const goldSteuerfreiRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldSteuerfrei);
        const goldRebalRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldRebalBand);

        const profilverbundProfiles = loadProfilverbundProfiles();
        if (profilverbundProfiles.length > 0) {
            const assetSummary = buildProfilverbundAssetSummary(profilverbundProfiles);
            const tagesgeld = assetSummary.totalTagesgeld;
            const renteMonatlich = assetSummary.totalRenteMonatlich;

            if (dom.inputs.tagesgeld && Number.isFinite(tagesgeld)) {
                dom.inputs.tagesgeld.value = Math.round(tagesgeld).toLocaleString('de-DE');
            }
            if (dom.inputs.renteAktiv) {
                dom.inputs.renteAktiv.value = renteMonatlich > 0 ? 'ja' : 'nein';
            }
            if (dom.inputs.renteMonatlich && Number.isFinite(renteMonatlich)) {
                dom.inputs.renteMonatlich.value = Math.round(renteMonatlich).toLocaleString('de-DE');
            }
            if (dom.inputs.fixedIncomeAnnual && Number.isFinite(renteMonatlich)) {
                dom.inputs.fixedIncomeAnnual.value = Math.round(renteMonatlich * 12).toLocaleString('de-DE');
            }
            if (dom.inputs.aktuellesAlter && alterRaw !== null) {
                const alter = UIUtils.parseCurrency(alterRaw);
                if (Number.isFinite(alter)) {
                    dom.inputs.aktuellesAlter.value = String(Math.round(alter));
                }
            }

            if (dom.inputs.geldmarktEtf && Number.isFinite(assetSummary.totalGeldmarkt)) {
                dom.inputs.geldmarktEtf.value = Math.round(assetSummary.totalGeldmarkt).toLocaleString('de-DE');
            }
            if (dom.inputs.depotwertAlt && Number.isFinite(assetSummary.totalDepotAlt)) {
                dom.inputs.depotwertAlt.value = Math.round(assetSummary.totalDepotAlt).toLocaleString('de-DE');
            }
            if (dom.inputs.depotwertNeu && Number.isFinite(assetSummary.totalDepotNeu)) {
                dom.inputs.depotwertNeu.value = Math.round(assetSummary.totalDepotNeu).toLocaleString('de-DE');
            }
            if (dom.inputs.depotwertGesamt) {
                const totalDepot = (assetSummary.totalDepotAlt || 0) + (assetSummary.totalDepotNeu || 0);
                dom.inputs.depotwertGesamt.value = Math.round(totalDepot).toLocaleString('de-DE');
            }
            if (dom.inputs.costBasisAlt && Number.isFinite(assetSummary.totalCostAlt)) {
                dom.inputs.costBasisAlt.value = Math.round(assetSummary.totalCostAlt).toLocaleString('de-DE');
            }
            if (dom.inputs.costBasisNeu && Number.isFinite(assetSummary.totalCostNeu)) {
                dom.inputs.costBasisNeu.value = Math.round(assetSummary.totalCostNeu).toLocaleString('de-DE');
            }
            if (dom.inputs.goldWert && Number.isFinite(assetSummary.totalGold)) {
                dom.inputs.goldWert.value = Math.round(assetSummary.totalGold).toLocaleString('de-DE');
            }
            if (dom.inputs.goldCost && Number.isFinite(assetSummary.totalGoldCost)) {
                dom.inputs.goldCost.value = Math.round(assetSummary.totalGoldCost).toLocaleString('de-DE');
            }

            if (typeof window !== 'undefined') {
                window.__profilverbundTranchenOverride = assetSummary.mergedTranches;
            }
        } else {
            if (dom.inputs.tagesgeld && tagesgeldRaw !== null) {
                const tagesgeld = UIUtils.parseCurrency(tagesgeldRaw);
                if (Number.isFinite(tagesgeld)) {
                    dom.inputs.tagesgeld.value = Math.round(tagesgeld).toLocaleString('de-DE');
                }
            }
            if (dom.inputs.renteAktiv && renteAktivRaw !== null) {
                const normalized = String(renteAktivRaw).toLowerCase() === 'true' ? 'ja' : 'nein';
                dom.inputs.renteAktiv.value = normalized;
            }
            if (dom.inputs.renteMonatlich && renteMonatlichRaw !== null) {
                const renteMonatlich = UIUtils.parseCurrency(renteMonatlichRaw);
                if (Number.isFinite(renteMonatlich)) {
                    dom.inputs.renteMonatlich.value = Math.round(renteMonatlich).toLocaleString('de-DE');
                }
            }
            if (dom.inputs.fixedIncomeAnnual) {
                const renteMonatlich = UIUtils.parseCurrency(renteMonatlichRaw);
                if (Number.isFinite(renteMonatlich)) {
                    dom.inputs.fixedIncomeAnnual.value = Math.round(renteMonatlich * 12).toLocaleString('de-DE');
                }
            }
            if (dom.inputs.aktuellesAlter && alterRaw !== null) {
                const alter = UIUtils.parseCurrency(alterRaw);
                if (Number.isFinite(alter)) {
                    dom.inputs.aktuellesAlter.value = String(Math.round(alter));
                }
            }
            if (dom.inputs.depotwertGesamt) {
                const depotAlt = dom.inputs.depotwertAlt ? UIUtils.parseCurrency(dom.inputs.depotwertAlt.value) : 0;
                const depotNeu = dom.inputs.depotwertNeu ? UIUtils.parseCurrency(dom.inputs.depotwertNeu.value) : 0;
                if (Number.isFinite(depotAlt) || Number.isFinite(depotNeu)) {
                    const totalDepot = (Number.isFinite(depotAlt) ? depotAlt : 0) + (Number.isFinite(depotNeu) ? depotNeu : 0);
                    dom.inputs.depotwertGesamt.value = Math.round(totalDepot).toLocaleString('de-DE');
                }
            }
            if (typeof window !== 'undefined') {
                window.__profilverbundTranchenOverride = null;
            }
        }

        if (dom.inputs.goldAktiv && goldAktivRaw !== null) {
            dom.inputs.goldAktiv.checked = String(goldAktivRaw).toLowerCase() === 'true';
        }
        if (dom.inputs.goldZielProzent && goldZielRaw !== null) {
            const ziel = UIUtils.parseCurrency(goldZielRaw);
            if (Number.isFinite(ziel)) dom.inputs.goldZielProzent.value = ziel;
        }
        if (dom.inputs.goldFloorProzent && goldFloorRaw !== null) {
            const floor = UIUtils.parseCurrency(goldFloorRaw);
            if (Number.isFinite(floor)) dom.inputs.goldFloorProzent.value = floor;
        }
        if (dom.inputs.goldSteuerfrei && goldSteuerfreiRaw !== null) {
            dom.inputs.goldSteuerfrei.checked = String(goldSteuerfreiRaw).toLowerCase() === 'true';
        }
        if (dom.inputs.rebalancingBand && goldRebalRaw !== null) {
            const band = UIUtils.parseCurrency(goldRebalRaw);
            if (Number.isFinite(band)) dom.inputs.rebalancingBand.value = band;
        }

        if (UIReader.applySideEffectsFromInputs) {
            UIReader.applySideEffectsFromInputs();
        }
    };

    return { syncProfileDerivedInputs };
}
