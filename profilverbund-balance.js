// @ts-check

import { CONFIG } from './balance-config.js';
import { listProfiles, getProfileData } from './profile-storage.js';

const DEFAULT_TAX_RATE = 0.25 * (1 + 0.055);

function readNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
}

function parseBalanceState(profileData) {
    if (!profileData || typeof profileData !== 'object') return null;
    const raw = profileData[CONFIG.STORAGE.LS_KEY];
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function parseProfileOverrides(profileData) {
    if (!profileData || typeof profileData !== 'object') return {};
    const hasRenteAktiv = Object.prototype.hasOwnProperty.call(profileData, 'profile_rente_aktiv');
    const hasGoldAktiv = Object.prototype.hasOwnProperty.call(profileData, 'profile_gold_aktiv');
    return {
        profileTagesgeld: readNumber(profileData.profile_tagesgeld, null),
        profileRenteAktiv: hasRenteAktiv
            ? String(profileData.profile_rente_aktiv || '').toLowerCase() === 'true'
            : null,
        profileRenteMonatlich: readNumber(profileData.profile_rente_monatlich, null),
        profileSonstigeEinkuenfte: readNumber(profileData.profile_sonstige_einkuenfte, null),
        profileGoldAktiv: hasGoldAktiv
            ? String(profileData.profile_gold_aktiv || '').toLowerCase() === 'true'
            : null,
        profileGoldZiel: readNumber(profileData.profile_gold_ziel_pct, null),
        profileGoldFloor: readNumber(profileData.profile_gold_floor_pct, null),
        profileGoldSteuerfrei: Object.prototype.hasOwnProperty.call(profileData, 'profile_gold_steuerfrei')
            ? String(profileData.profile_gold_steuerfrei || '').toLowerCase() === 'true'
            : null,
        profileGoldRebalBand: readNumber(profileData.profile_gold_rebal_band, null)
    };
}

function parseTranches(profileData) {
    if (!profileData || typeof profileData !== 'object') return [];
    const raw = profileData.depot_tranchen;
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function normalizeBalanceInputs(inputs, overrides = {}) {
    if (!inputs || typeof inputs !== 'object') return null;
    const tagesgeldOverride = overrides.profileTagesgeld;
    const renteMonatlichOverride = overrides.profileRenteMonatlich;
    const renteAktivOverride = overrides.profileRenteAktiv;
    const sonstigeEinkuenfteOverride = overrides.profileSonstigeEinkuenfte;
    const goldAktivOverride = overrides.profileGoldAktiv;
    const goldZielOverride = overrides.profileGoldZiel;
    const goldFloorOverride = overrides.profileGoldFloor;
    const goldSteuerfreiOverride = overrides.profileGoldSteuerfrei;
    const goldRebalBandOverride = overrides.profileGoldRebalBand;
    const renteMonatlich = Number.isFinite(renteMonatlichOverride)
        ? renteMonatlichOverride
        : readNumber(inputs.renteMonatlich, 0);
    const sonstigeEinkuenfte = Number.isFinite(sonstigeEinkuenfteOverride)
        ? sonstigeEinkuenfteOverride
        : 0;
    const renteSumme = renteMonatlich + sonstigeEinkuenfte;
    return {
        floorBedarf: readNumber(inputs.floorBedarf, 0),
        flexBedarf: readNumber(inputs.flexBedarf, 0),
        renteAktiv: typeof renteAktivOverride === 'boolean' ? renteAktivOverride : (renteSumme > 0),
        renteMonatlich: renteSumme,
        tagesgeld: Number.isFinite(tagesgeldOverride) ? tagesgeldOverride : readNumber(inputs.tagesgeld, 0),
        geldmarktEtf: readNumber(inputs.geldmarktEtf, 0),
        depotwertAlt: readNumber(inputs.depotwertAlt, 0),
        depotwertNeu: readNumber(inputs.depotwertNeu, 0),
        goldWert: readNumber(inputs.goldWert, 0),
        costBasisAlt: readNumber(inputs.costBasisAlt, 0),
        costBasisNeu: readNumber(inputs.costBasisNeu, 0),
        goldCost: readNumber(inputs.goldCost, 0),
        tqfAlt: readNumber(inputs.tqfAlt, 0),
        tqfNeu: readNumber(inputs.tqfNeu, 0),
        goldAktiv: typeof goldAktivOverride === 'boolean' ? goldAktivOverride : Boolean(inputs.goldAktiv),
        goldZielProzent: Number.isFinite(goldZielOverride) ? goldZielOverride : readNumber(inputs.goldZielProzent, 0),
        goldFloorProzent: Number.isFinite(goldFloorOverride) ? goldFloorOverride : readNumber(inputs.goldFloorProzent, 0),
        goldSteuerfrei: typeof goldSteuerfreiOverride === 'boolean' ? goldSteuerfreiOverride : Boolean(inputs.goldSteuerfrei),
        rebalancingBand: Number.isFinite(goldRebalBandOverride) ? goldRebalBandOverride : readNumber(inputs.rebalancingBand, 0),
        kirchensteuerSatz: readNumber(inputs.kirchensteuerSatz, 0),
        sparerPauschbetrag: readNumber(inputs.sparerPauschbetrag, 0),
        runwayMinMonths: readNumber(inputs.runwayMinMonths, 0),
        runwayTargetMonths: readNumber(inputs.runwayTargetMonths, 0)
    };
}

function profileAssetTotal(inputs) {
    if (!inputs) return 0;
    return (inputs.depotwertAlt || 0)
        + (inputs.depotwertNeu || 0)
        + (inputs.goldWert || 0)
        + (inputs.tagesgeld || 0)
        + (inputs.geldmarktEtf || 0);
}

function profileLiquidity(inputs) {
    if (!inputs) return 0;
    return (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0);
}

function computeTaxRate(inputs) {
    const kirchen = Math.max(0, readNumber(inputs?.kirchensteuerSatz, 0)) / 100;
    return 0.25 * (1 + 0.055 + kirchen);
}

function computeProfitRatio(marketValue, costBasis) {
    if (!Number.isFinite(marketValue) || marketValue <= 0) return 0;
    const gain = Math.max(0, (marketValue || 0) - (costBasis || 0));
    return Math.max(0, gain / marketValue);
}

function resolveTrancheCategory(tranche) {
    const category = String(tranche?.category || '').toLowerCase();
    const type = String(tranche?.type || '').toLowerCase();
    if (category) return category;
    if (type.includes('gold')) return 'gold';
    if (type.includes('geldmarkt') || type.includes('money')) return 'money_market';
    return 'equity';
}

function resolveTrancheSplitTotals(tranches) {
    const totals = {
        altValue: 0,
        altCost: 0,
        neuValue: 0,
        neuCost: 0,
        goldValue: 0,
        goldCost: 0,
        moneyValue: 0,
        moneyCost: 0
    };
    if (!Array.isArray(tranches)) return totals;
    tranches.forEach(tranche => {
        const marketValue = readNumber(tranche.marketValue, 0);
        const costBasis = readNumber(tranche.costBasis, 0);
        const type = String(tranche.type || tranche.kind || '').toLowerCase();
        const category = String(tranche.category || '').toLowerCase();

        if (category === 'gold' || type.includes('gold')) {
            totals.goldValue += marketValue;
            totals.goldCost += costBasis;
            return;
        }

        if (category === 'money_market' || type.includes('geldmarkt') || type.includes('money')) {
            totals.moneyValue += marketValue;
            totals.moneyCost += costBasis;
            return;
        }

        if (type === 'aktien_alt') {
            totals.altValue += marketValue;
            totals.altCost += costBasis;
            return;
        }

        if (type === 'aktien_neu') {
            totals.neuValue += marketValue;
            totals.neuCost += costBasis;
            return;
        }

        if (category === 'equity') {
            const isAltByTax = Number(tranche.tqf) === 1;
            if (isAltByTax) {
                totals.altValue += marketValue;
                totals.altCost += costBasis;
            } else {
                totals.neuValue += marketValue;
                totals.neuCost += costBasis;
            }
        }
    });
    return totals;
}

function normalizeTrancheDate(tranche) {
    const raw = tranche?.purchaseDate;
    if (!raw) return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

// Lade alle Profile, die zum Profilverbund gehören
export function loadProfilverbundProfiles() {
    const profiles = listProfiles();
    const selected = profiles.filter(p => p.belongsToHousehold !== false);
    return selected.map(meta => {
        const data = getProfileData(meta.id);
        const balanceState = parseBalanceState(data);
        const overrides = parseProfileOverrides(data);
        const normalized = normalizeBalanceInputs(balanceState?.inputs, overrides);
        if (!normalized) return null;
        return {
            profileId: meta.id,
            name: meta.name || meta.id,
            inputs: normalized,
            tranches: parseTranches(data),
            balanceState
        };
    }).filter(Boolean);
}

// Aggregiere Profilverbund-Werte (Bedarf, Rente, Depot, etc.)
export function aggregateProfilverbundInputs(profileInputs, overrides = {}) {
    const list = Array.isArray(profileInputs) ? profileInputs : [];
    const totals = list.reduce((acc, entry) => {
        const inputs = entry.inputs || {};
        const floor = inputs.floorBedarf || 0;
        const flex = inputs.flexBedarf || 0;
        const flexBudgetAnnual = inputs.flexBudgetAnnual || 0;
        const flexBudgetRecharge = inputs.flexBudgetRecharge || 0;
        const flexBudgetYears = inputs.flexBudgetYears || 0;
        const renteMonatlich = inputs.renteAktiv ? (inputs.renteMonatlich || 0) : 0;
        acc.totalFloor += floor;
        acc.totalFlex += flex;
        acc.totalFlexBudgetAnnual += flexBudgetAnnual;
        acc.totalFlexBudgetRecharge += flexBudgetRecharge;
        acc.totalRenteMonatlich += renteMonatlich;
        acc.totalTagesgeld += inputs.tagesgeld || 0;
        acc.totalGeldmarkt += inputs.geldmarktEtf || 0;
        acc.totalDepotAlt += inputs.depotwertAlt || 0;
        acc.totalDepotNeu += inputs.depotwertNeu || 0;
        acc.totalGold += inputs.goldWert || 0;
        acc.runwayMin = acc.runwayMin === null ? inputs.runwayMinMonths || 0 : Math.min(acc.runwayMin, inputs.runwayMinMonths || 0);
        acc.runwayTarget = acc.runwayTarget === null ? inputs.runwayTargetMonths || 0 : Math.min(acc.runwayTarget, inputs.runwayTargetMonths || 0);
        acc.flexBudgetYears = acc.flexBudgetYears === null ? flexBudgetYears : Math.min(acc.flexBudgetYears, flexBudgetYears || acc.flexBudgetYears || 0);
        return acc;
    }, {
        totalFloor: 0,
        totalFlex: 0,
        totalFlexBudgetAnnual: 0,
        totalFlexBudgetRecharge: 0,
        totalRenteMonatlich: 0,
        totalTagesgeld: 0,
        totalGeldmarkt: 0,
        totalDepotAlt: 0,
        totalDepotNeu: 0,
        totalGold: 0,
        runwayMin: null,
        runwayTarget: null,
        flexBudgetYears: null
    });

    const overrideFloor = Number.isFinite(overrides.floorBedarf) ? overrides.floorBedarf : null;
    const overrideFlex = Number.isFinite(overrides.flexBedarf) ? overrides.flexBedarf : null;
    const overrideFlexBudgetAnnual = Number.isFinite(overrides.flexBudgetAnnual) ? overrides.flexBudgetAnnual : null;
    const overrideFlexBudgetRecharge = Number.isFinite(overrides.flexBudgetRecharge) ? overrides.flexBudgetRecharge : null;
    const overrideFlexBudgetYears = Number.isFinite(overrides.flexBudgetYears) ? overrides.flexBudgetYears : null;
    const totalFloor = overrideFloor !== null ? overrideFloor : totals.totalFloor;
    const totalFlex = overrideFlex !== null ? overrideFlex : totals.totalFlex;
    const totalFlexBudgetAnnual = overrideFlexBudgetAnnual !== null ? overrideFlexBudgetAnnual : totals.totalFlexBudgetAnnual;
    const totalFlexBudgetRecharge = overrideFlexBudgetRecharge !== null ? overrideFlexBudgetRecharge : totals.totalFlexBudgetRecharge;
    const totalFlexBudgetYears = overrideFlexBudgetYears !== null ? overrideFlexBudgetYears : (totals.flexBudgetYears || 0);
    const totalBedarf = totalFloor + totalFlex;
    const totalRente = totals.totalRenteMonatlich * 12;
    const netWithdrawal = Math.max(0, totalBedarf - totalRente);
    const totalDepot = totals.totalDepotAlt + totals.totalDepotNeu + totals.totalGold;
    const totalLiquid = totals.totalTagesgeld + totals.totalGeldmarkt;
    const totalAssets = totalDepot + totalLiquid;

    return {
        profilesCount: list.length,
        totalFloor,
        totalFlex,
        totalFlexBudgetAnnual,
        totalFlexBudgetRecharge,
        totalFlexBudgetYears,
        totalBedarf,
        totalRenteMonatlich: totals.totalRenteMonatlich,
        totalRenteJahr: totalRente,
        netWithdrawal,
        totalDepotAlt: totals.totalDepotAlt,
        totalDepotNeu: totals.totalDepotNeu,
        totalGold: totals.totalGold,
        totalDepot,
        totalTagesgeld: totals.totalTagesgeld,
        totalGeldmarkt: totals.totalGeldmarkt,
        totalLiquid,
        totalAssets,
        runwayMinMonths: totals.runwayMin ?? 0,
        runwayTargetMonths: totals.runwayTarget ?? 0
    };
}

// Berechne Steuerlast pro Euro für ein Profil
export function calculateTaxPerEuro(inputs) {
    if (!inputs) return 0;
    const marketValue = (inputs.depotwertAlt || 0) + (inputs.depotwertNeu || 0);
    const costBasis = (inputs.costBasisAlt || 0) + (inputs.costBasisNeu || 0);
    const profitRatio = computeProfitRatio(marketValue, costBasis);
    return profitRatio * computeTaxRate(inputs);
}

// Wähle optimale Tranchen für Verkauf (wenn depot_tranchen vorhanden)
export function selectTranchesForSale(tranches, targetAmount, taxRate = DEFAULT_TAX_RATE) {
    if (!Array.isArray(tranches) || tranches.length === 0 || targetAmount <= 0) return [];
    const candidates = tranches
        .filter(t => resolveTrancheCategory(t) === 'equity')
        .map(t => {
            const marketValue = readNumber(t.marketValue, 0);
            const costBasis = readNumber(t.costBasis, 0);
            const profitRatio = computeProfitRatio(marketValue, costBasis);
            return {
                tranche: t,
                marketValue,
                taxPerEuro: profitRatio * taxRate,
                purchaseStamp: normalizeTrancheDate(t)
            };
        })
        .filter(item => item.marketValue > 0);

    candidates.sort((a, b) => {
        if (a.taxPerEuro !== b.taxPerEuro) return a.taxPerEuro - b.taxPerEuro;
        return a.purchaseStamp - b.purchaseStamp;
    });

    let remaining = targetAmount;
    const selections = [];
    for (const item of candidates) {
        if (remaining <= 0) break;
        const sellAmount = Math.min(item.marketValue, remaining);
        const taxAmount = sellAmount * item.taxPerEuro;
        selections.push({
            tranche: item.tranche,
            sellAmount,
            taxAmount
        });
        remaining -= sellAmount;
    }

    return selections;
}

// Berechne Entnahmeverteilung nach Modus
export function calculateWithdrawalDistribution(profileInputs, aggregated, mode = 'tax_optimized') {
    const list = Array.isArray(profileInputs) ? profileInputs : [];
    const totalNeed = Math.max(0, aggregated?.netWithdrawal || 0);
    if (list.length === 0 || totalNeed <= 0) {
        return { items: [], totalNeed, remaining: totalNeed, totalTaxEstimate: 0, mode };
    }

    const entries = list.map(entry => {
        const inputs = entry.inputs || {};
        const taxPerEuro = calculateTaxPerEuro(inputs);
        const taxRate = computeTaxRate(inputs);
        const trancheSplit = resolveTrancheSplitTotals(entry.tranches || []);
        const derivedMoneyMarket = trancheSplit.moneyValue || 0;
        return {
            profileId: entry.profileId,
            name: entry.name || entry.profileId,
            inputs,
            tranches: Array.isArray(entry.tranches) ? entry.tranches : [],
            taxPerEuro,
            taxRate,
            runwayTargetMonths: inputs.runwayTargetMonths || 0,
            assets: profileAssetTotal(inputs),
            liquidity: profileLiquidity(inputs),
            derivedMoneyMarket,
            rentAnnual: (inputs.renteAktiv ? (inputs.renteMonatlich || 0) : 0) * 12
        };
    });

    let remaining = totalNeed;
    let allocations = [];

    if (mode === 'tax_optimized') {
        const sorted = entries.slice().sort((a, b) => a.taxPerEuro - b.taxPerEuro);
        allocations = sorted.map(entry => {
            const maxShare = entry.assets || 0;
            const amount = Math.max(0, Math.min(remaining, maxShare));
            remaining -= amount;
            return { entry, amount };
        });
    } else {
        const weights = entries.map(entry => {
            if (mode === 'runway_first') {
                return Math.max(0, entry.runwayTargetMonths || 0);
            }
            return Math.max(0, entry.assets || 0);
        });
        const totalWeight = weights.reduce((sum, val) => sum + val, 0);
        allocations = entries.map((entry, idx) => {
            const pct = totalWeight > 0 ? weights[idx] / totalWeight : 0;
            const amount = totalNeed * pct;
            return { entry, amount };
        });
        remaining = 0;
    }

    let totalTaxEstimate = 0;
    const items = allocations.map(({ entry, amount }) => {
        const tagesgeldAvailable = entry.inputs?.tagesgeld || 0;
        const geldmarktInput = entry.inputs?.geldmarktEtf || 0;
        const geldmarktAvailable = geldmarktInput > 0 ? geldmarktInput : (entry.derivedMoneyMarket || 0);
        const tagesgeldUsed = Math.min(tagesgeldAvailable, amount);
        const remainingAfterTagesgeld = Math.max(0, amount - tagesgeldUsed);
        const geldmarktUsed = Math.min(geldmarktAvailable, remainingAfterTagesgeld);
        const cashUsed = tagesgeldUsed + geldmarktUsed;
        const sellAmount = Math.max(0, amount - cashUsed);
        const trancheSelections = sellAmount > 0
            ? selectTranchesForSale(entry.tranches, sellAmount, entry.taxRate)
            : [];
        const trancheTax = trancheSelections.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
        const taxEstimate = trancheSelections.length
            ? trancheTax
            : sellAmount * entry.taxPerEuro;
        totalTaxEstimate += taxEstimate;
        return {
            profileId: entry.profileId,
            name: entry.name,
            withdrawalAmount: amount,
            cashUsed,
            tagesgeldUsed,
            geldmarktUsed,
            sellAmount,
            taxEstimate,
            taxPerEuro: entry.taxPerEuro,
            rentAnnual: entry.rentAnnual,
            liquidity: entry.liquidity,
            assetTotal: entry.assets,
            tranches: trancheSelections
        };
    });

    return { items, totalNeed, remaining, totalTaxEstimate, mode };
}

export function buildProfilverbundAssetSummary(profileInputs) {
    const list = Array.isArray(profileInputs) ? profileInputs : [];
    const summary = {
        totalTagesgeld: 0,
        totalGeldmarkt: 0,
        totalDepotAlt: 0,
        totalDepotNeu: 0,
        totalGold: 0,
        totalCostAlt: 0,
        totalCostNeu: 0,
        totalGoldCost: 0,
        totalRenteMonatlich: 0,
        mergedTranches: []
    };

    list.forEach(entry => {
        const inputs = entry.inputs || {};
        const tranches = Array.isArray(entry.tranches) ? entry.tranches : [];
        const split = resolveTrancheSplitTotals(tranches);
        const hasTranches = tranches.length > 0 && (split.altValue + split.neuValue + split.goldValue + split.moneyValue) > 0;

        summary.totalTagesgeld += inputs.tagesgeld || 0;
        summary.totalRenteMonatlich += inputs.renteAktiv ? (inputs.renteMonatlich || 0) : 0;

        if (hasTranches) {
            summary.totalDepotAlt += split.altValue;
            summary.totalDepotNeu += split.neuValue;
            summary.totalGold += split.goldValue;
            summary.totalGeldmarkt += split.moneyValue;
            summary.totalCostAlt += split.altCost;
            summary.totalCostNeu += split.neuCost;
            summary.totalGoldCost += split.goldCost;
        } else {
            summary.totalDepotAlt += inputs.depotwertAlt || 0;
            summary.totalDepotNeu += inputs.depotwertNeu || 0;
            summary.totalGold += inputs.goldWert || 0;
            summary.totalGeldmarkt += inputs.geldmarktEtf || 0;
            summary.totalCostAlt += inputs.costBasisAlt || 0;
            summary.totalCostNeu += inputs.costBasisNeu || 0;
            summary.totalGoldCost += inputs.goldCost || 0;
        }

        if (tranches.length) {
            summary.mergedTranches.push(...tranches);
        }
    });

    return summary;
}

export function buildProfilverbundProfileSummaries(profileInputs) {
    const list = Array.isArray(profileInputs) ? profileInputs : [];
    return list.map(entry => {
        const inputs = entry.inputs || {};
        const tranches = Array.isArray(entry.tranches) ? entry.tranches : [];
        const split = resolveTrancheSplitTotals(tranches);
        const hasTranches = tranches.length > 0 && (split.altValue + split.neuValue + split.goldValue + split.moneyValue) > 0;

        const depotAlt = hasTranches ? split.altValue : (inputs.depotwertAlt || 0);
        const depotNeu = hasTranches ? split.neuValue : (inputs.depotwertNeu || 0);
        const gold = hasTranches ? split.goldValue : (inputs.goldWert || 0);
        const geldmarkt = hasTranches ? split.moneyValue : (inputs.geldmarktEtf || 0);
        const tagesgeld = inputs.tagesgeld || 0;
        const totalAssets = depotAlt + depotNeu + gold + geldmarkt + tagesgeld;

        return {
            profileId: entry.profileId,
            name: entry.name || entry.profileId,
            tagesgeld,
            geldmarkt,
            depotAlt,
            depotNeu,
            gold,
            totalAssets
        };
    });
}
