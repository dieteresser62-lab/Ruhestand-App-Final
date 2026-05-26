/**
 * Module: Balance Main Profile Sync
 * Purpose: Synchronizes profile-specific derived inputs (like "Rente Aktiv" or "Alter") from LocalStorage to the main UI.
 *          Ensures that even in single-user mode, the inputs reflect the underlying profile data.
 * Usage: Used by balance-main.js to keep UI inputs in sync with profile storage.
 * Dependencies: balance-reader.js, balance-utils.js, profilverbund-balance.js
 */
"use strict";

import { UIReader } from './balance-reader.js';
import { UIUtils } from './balance-utils.js';
import { loadProfilverbundProfiles, buildProfilverbundAssetSummary } from '../profile/profilverbund-balance.js';
import { readProfileOverridesFromStorage } from '../profile/profile-state.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

export function createProfileSyncHandlers({ dom, PROFILE_VALUE_KEYS }) {
    const syncProfileDerivedInputs = () => {
        const overrides = readProfileOverridesFromStorage(persistenceStorage);
        const alterRaw = persistenceStorage.getItem(PROFILE_VALUE_KEYS.alter);

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
            if (dom.inputs.tagesgeld && Number.isFinite(overrides.profileTagesgeld)) {
                const tagesgeld = overrides.profileTagesgeld;
                if (Number.isFinite(tagesgeld)) {
                    dom.inputs.tagesgeld.value = Math.round(tagesgeld).toLocaleString('de-DE');
                }
            }
            if (dom.inputs.renteAktiv && typeof overrides.profileRenteAktiv === 'boolean') {
                dom.inputs.renteAktiv.value = overrides.profileRenteAktiv ? 'ja' : 'nein';
            }
            const renteMonatlich = overrides.profileRenteMonatlich;
            const sonstigeEinkuenfte = overrides.profileSonstigeEinkuenfte;
            const renteSumme = (Number.isFinite(renteMonatlich) ? renteMonatlich : 0)
                + (Number.isFinite(sonstigeEinkuenfte) ? sonstigeEinkuenfte : 0);

            if (dom.inputs.renteMonatlich && Number.isFinite(renteSumme)) {
                dom.inputs.renteMonatlich.value = Math.round(renteSumme).toLocaleString('de-DE');
            }
            if (dom.inputs.fixedIncomeAnnual && Number.isFinite(renteSumme)) {
                dom.inputs.fixedIncomeAnnual.value = Math.round(renteSumme * 12).toLocaleString('de-DE');
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

        if (dom.inputs.goldAktiv && typeof overrides.profileGoldAktiv === 'boolean') {
            dom.inputs.goldAktiv.checked = overrides.profileGoldAktiv;
        }
        if (dom.inputs.goldZielProzent && Number.isFinite(overrides.profileGoldZiel)) {
            const ziel = overrides.profileGoldZiel;
            if (Number.isFinite(ziel)) dom.inputs.goldZielProzent.value = ziel;
        }
        if (dom.inputs.goldFloorProzent && Number.isFinite(overrides.profileGoldFloor)) {
            const floor = overrides.profileGoldFloor;
            if (Number.isFinite(floor)) dom.inputs.goldFloorProzent.value = floor;
        }
        if (dom.inputs.goldSteuerfrei && typeof overrides.profileGoldSteuerfrei === 'boolean') {
            dom.inputs.goldSteuerfrei.checked = overrides.profileGoldSteuerfrei;
        }
        if (dom.inputs.rebalancingBand && Number.isFinite(overrides.profileGoldRebalBand)) {
            const band = overrides.profileGoldRebalBand;
            if (Number.isFinite(band)) dom.inputs.rebalancingBand.value = band;
        }

        if (UIReader.applySideEffectsFromInputs) {
            UIReader.applySideEffectsFromInputs();
        }
    };

    return { syncProfileDerivedInputs };
}
