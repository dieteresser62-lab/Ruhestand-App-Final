// @ts-check

import { SUPPORTED_PFLEGE_GRADES } from './simulator-data.js';
import { CONFIG } from './balance-config.js';

function readValue(data, key) {
    if (!data || typeof data !== 'object') return null;
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
}

function readString(data, key, fallback = '') {
    const raw = readValue(data, key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    return String(raw);
}

function readNumber(data, key, fallback = 0) {
    const raw = readValue(data, key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    const n = Number(String(raw).replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
}

function readInt(data, key, fallback = 0) {
    const raw = readValue(data, key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : fallback;
}

function readBool(data, key, fallback = false) {
    const raw = readValue(data, key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    if (raw === true || raw === false) return raw;
    const str = String(raw).toLowerCase();
    return str === 'true' || str === '1' || str === 'yes' || str === 'on';
}

function simKey(id) {
    return `sim_${id}`;
}

function parseWidowOptions(data) {
    const mode = readString(data, simKey('widowPensionMode'), 'stop');
    const pctRaw = readNumber(data, simKey('widowPensionPct'), 0);
    const marriageOffsetYears = Math.max(0, readInt(data, simKey('widowMarriageOffsetYears'), 0));
    const minMarriageYears = Math.max(0, readInt(data, simKey('widowMinMarriageYears'), 0));
    return {
        mode,
        percent: Math.max(0, Math.min(100, pctRaw)) / 100,
        marriageOffsetYears,
        minMarriageYears
    };
}

function parseProfileGoldOverrides(data) {
    const hasGoldAktiv = Object.prototype.hasOwnProperty.call(data, 'profile_gold_aktiv');
    const hasGoldZiel = Object.prototype.hasOwnProperty.call(data, 'profile_gold_ziel_pct');
    const hasGoldFloor = Object.prototype.hasOwnProperty.call(data, 'profile_gold_floor_pct');
    const hasGoldSteuerfrei = Object.prototype.hasOwnProperty.call(data, 'profile_gold_steuerfrei');
    const hasGoldBand = Object.prototype.hasOwnProperty.call(data, 'profile_gold_rebal_band');
    return {
        goldAktiv: hasGoldAktiv ? readBool(data, 'profile_gold_aktiv', false) : null,
        goldZielProzent: hasGoldZiel ? readNumber(data, 'profile_gold_ziel_pct', 0) : null,
        goldFloorProzent: hasGoldFloor ? readNumber(data, 'profile_gold_floor_pct', 0) : null,
        goldSteuerfrei: hasGoldSteuerfrei ? readBool(data, 'profile_gold_steuerfrei', false) : null,
        rebalancingBand: hasGoldBand ? readNumber(data, 'profile_gold_rebal_band', 0) : null
    };
}

function parsePflegeGradeConfigs(data) {
    const configs = {};
    SUPPORTED_PFLEGE_GRADES.forEach(grade => {
        const zusatz = readNumber(data, simKey(`pflegeStufe${grade}Zusatz`), 0);
        const flexPct = readNumber(data, simKey(`pflegeStufe${grade}FlexCut`), 100);
        const flexCut = Math.min(1, Math.max(0, flexPct / 100));
        const mortalityFactor = Math.max(0, readNumber(data, simKey(`pflegeStufe${grade}Mortality`), 0));
        configs[grade] = { zusatz, flexCut, mortalityFactor };
    });
    return configs;
}

function parseDetailledTranches(data) {
    const raw = readValue(data, 'depot_tranchen');
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function parseBalanceInputs(data) {
    const raw = readValue(data, CONFIG.STORAGE.LS_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && parsed.inputs ? parsed.inputs : null;
    } catch {
        return null;
    }
}

function sumTrancheTotals(tranches) {
    const totals = { equity: 0, equityCost: 0, gold: 0, moneyMarket: 0 };
    if (!Array.isArray(tranches)) return totals;
    tranches.forEach(tranche => {
        const marketValue = Number(tranche.marketValue) || 0;
        const costBasis = Number(tranche.costBasis) || 0;
        const category = String(tranche.category || '').toLowerCase();
        const type = String(tranche.type || '').toLowerCase();
        if (category === 'gold' || type.includes('gold')) {
            totals.gold += marketValue;
            return;
        }
        if (category === 'money_market' || type.includes('geldmarkt')) {
            totals.moneyMarket += marketValue;
            return;
        }
        totals.equity += marketValue;
        totals.equityCost += costBasis;
    });
    return totals;
}

export function buildSimulatorInputsFromProfileData(profileData) {
    const balanceInputs = parseBalanceInputs(profileData);
    const pflegeGradeConfigs = parsePflegeGradeConfigs(profileData);
    const detailedTranches = parseDetailledTranches(profileData);
    const trancheTotals = sumTrancheTotals(detailedTranches);
    const grade1Config = pflegeGradeConfigs[1] || { zusatz: 0, flexCut: 1 };
    const goldOverrides = parseProfileGoldOverrides(profileData);
    const hasProfileTagesgeld = Object.prototype.hasOwnProperty.call(profileData, 'profile_tagesgeld');
    const profileTagesgeld = hasProfileTagesgeld ? readNumber(profileData, 'profile_tagesgeld', 0) : 0;
    const hasProfileRenteAktiv = Object.prototype.hasOwnProperty.call(profileData, 'profile_rente_aktiv');
    const profileRenteAktiv = hasProfileRenteAktiv ? readBool(profileData, 'profile_rente_aktiv', false) : false;
    const profileRenteMonatlich = readNumber(profileData, 'profile_rente_monatlich', 0);

    const p1StartAlter = readInt(profileData, simKey('p1StartAlter'), 65);
    const p1Geschlecht = readString(profileData, simKey('p1Geschlecht'), 'm');
    const p1KirchensteuerPct = readNumber(profileData, simKey('p1KirchensteuerPct'), 0);

    const rentAdjMode = readString(profileData, simKey('rentAdjMode'), 'wage');
    const rentAdjPct = readNumber(profileData, simKey('rentAdjPct'), 0);

    const goldAktivFromProfile = goldOverrides.goldAktiv;
    const goldAktiv = (typeof goldAktivFromProfile === 'boolean')
        ? goldAktivFromProfile
        : readBool(profileData, simKey('goldAllokationAktiv'), true);
    const goldZielProzent = Number.isFinite(goldOverrides.goldZielProzent)
        ? goldOverrides.goldZielProzent
        : readNumber(profileData, simKey('goldAllokationProzent'), 0);
    const goldFloorProzent = Number.isFinite(goldOverrides.goldFloorProzent)
        ? goldOverrides.goldFloorProzent
        : readNumber(profileData, simKey('goldFloorProzent'), 0);
    const goldSteuerfrei = (typeof goldOverrides.goldSteuerfrei === 'boolean')
        ? goldOverrides.goldSteuerfrei
        : readBool(profileData, simKey('goldSteuerfrei'), false);
    const rebalancingBand = Number.isFinite(goldOverrides.rebalancingBand)
        ? goldOverrides.rebalancingBand
        : readNumber(profileData, simKey('rebalancingBand'), 25);

    const simTagesgeld = readNumber(profileData, simKey('tagesgeld'), 0);
    const tagesgeld = hasProfileTagesgeld ? profileTagesgeld : simTagesgeld;
    const baseInputs = {
        startVermoegen: readNumber(profileData, simKey('simStartVermoegen'), 0),
        depotwertAlt: readNumber(profileData, simKey('depotwertAlt'), 0),
        tagesgeld,
        geldmarktEtf: readNumber(profileData, simKey('geldmarktEtf'), 0),
        einstandAlt: readNumber(profileData, simKey('einstandAlt'), 0),
        zielLiquiditaet: tagesgeld + readNumber(profileData, simKey('geldmarktEtf'), 0),
        startFloorBedarf: readNumber(profileData, simKey('startFloorBedarf'), 0),
        startFlexBedarf: readNumber(profileData, simKey('startFlexBedarf'), 0),
        marketCapeRatio: readNumber(profileData, simKey('marketCapeRatio'), 0),
        risikoprofil: 'sicherheits-dynamisch',
        goldAktiv,
        goldZielProzent: goldAktiv ? goldZielProzent : 0,
        goldFloorProzent: goldAktiv ? goldFloorProzent : 0,
        rebalancingBand: goldAktiv ? rebalancingBand : 25,
        goldSteuerfrei: goldAktiv && goldSteuerfrei,
        startAlter: p1StartAlter,
        geschlecht: p1Geschlecht,
        startSPB: readNumber(profileData, simKey('p1SparerPauschbetrag'), 0),
        kirchensteuerSatz: p1KirchensteuerPct / 100,
        renteMonatlich: readNumber(profileData, simKey('p1Monatsrente'), 0),
        renteStartOffsetJahre: readInt(profileData, simKey('p1StartInJahren'), 0),
        rentAdjMode,
        rentAdjPct,
        renteIndexierungsart: readString(profileData, simKey('renteIndexierungsart'), 'fest'),
        renteFesterSatz: readNumber(profileData, simKey('renteFesterSatz'), 0),
        pflegefallLogikAktivieren: readBool(profileData, simKey('pflegefallLogikAktivieren'), false),
        pflegeModellTyp: readString(profileData, simKey('pflegeModellTyp'), 'kosten'),
        pflegeGradeConfigs,
        pflegeStufe1Zusatz: grade1Config.zusatz,
        pflegeStufe1FlexCut: grade1Config.flexCut,
        pflegeMaxFloor: readNumber(profileData, simKey('pflegeMaxFloor'), 0),
        pflegeRampUp: readInt(profileData, simKey('pflegeRampUp'), 5),
        pflegeMinDauer: readInt(profileData, simKey('pflegeMinDauer'), 5),
        pflegeMaxDauer: readInt(profileData, simKey('pflegeMaxDauer'), 10),
        pflegeKostenDrift: readNumber(profileData, simKey('pflegeKostenDrift'), 0) / 100,
        pflegeRegionalZuschlag: readNumber(profileData, simKey('pflegeRegionalZuschlag'), 0) / 100,
        decumulation: { mode: 'none' },
        stressPreset: readString(profileData, simKey('stressPreset'), 'NONE'),
        partner: {
            aktiv: readBool(profileData, 'sim_partnerAktiv', false),
            geschlecht: readString(profileData, simKey('r2Geschlecht'), 'w'),
            startAlter: readInt(profileData, simKey('r2StartAlter'), 0),
            startInJahren: readInt(profileData, simKey('r2StartInJahren'), 0),
            monatsrente: readNumber(profileData, simKey('r2Monatsrente'), 0),
            sparerPauschbetrag: readNumber(profileData, simKey('r2SparerPauschbetrag'), 0),
            kirchensteuerPct: readNumber(profileData, simKey('r2KirchensteuerPct'), 0),
            steuerquotePct: readNumber(profileData, simKey('r2Steuerquote'), 0),
            brutto: readNumber(profileData, simKey('r2Monatsrente'), 0) * 12
        },
        widowOptions: parseWidowOptions(profileData)
    };

    if (profileRenteAktiv && baseInputs.renteMonatlich <= 0 && profileRenteMonatlich > 0) {
        baseInputs.renteMonatlich = profileRenteMonatlich;
    }

    const hasTranches = Array.isArray(detailedTranches) && detailedTranches.length > 0;
    if (hasTranches) {
        const trancheSum = trancheTotals.equity + trancheTotals.gold + trancheTotals.moneyMarket;
        const derivedStart = trancheSum + (baseInputs.tagesgeld || 0) + (baseInputs.geldmarktEtf || 0);
        if (derivedStart > 0) {
            baseInputs.startVermoegen = derivedStart;
        }
    } else {
        baseInputs.depotwertAlt = 0;
        baseInputs.einstandAlt = 0;
        baseInputs.geldmarktEtf = 0;
        baseInputs.startVermoegen = (baseInputs.tagesgeld || 0);
        baseInputs.zielLiquiditaet = baseInputs.startVermoegen;
    }

    if ((!baseInputs.depotwertAlt || baseInputs.depotwertAlt <= 0) && trancheTotals.equity > 0) {
        baseInputs.depotwertAlt = trancheTotals.equity;
    }
    if ((!baseInputs.einstandAlt || baseInputs.einstandAlt <= 0) && trancheTotals.equityCost > 0) {
        baseInputs.einstandAlt = trancheTotals.equityCost;
    }
    if ((!baseInputs.geldmarktEtf || baseInputs.geldmarktEtf <= 0) && trancheTotals.moneyMarket > 0) {
        baseInputs.geldmarktEtf = trancheTotals.moneyMarket;
    }

    if ((!baseInputs.startFloorBedarf || baseInputs.startFloorBedarf <= 0) && balanceInputs) {
        baseInputs.startFloorBedarf = Number(balanceInputs.floorBedarf) || baseInputs.startFloorBedarf;
    }
    if ((!baseInputs.startFlexBedarf || baseInputs.startFlexBedarf <= 0) && balanceInputs) {
        baseInputs.startFlexBedarf = Number(balanceInputs.flexBedarf) || baseInputs.startFlexBedarf;
    }

    const strategyInputs = {
        runwayMinMonths: readInt(profileData, simKey('runwayMinMonths'), 24),
        runwayTargetMonths: readInt(profileData, simKey('runwayTargetMonths'), 36),
        targetEq: readInt(profileData, simKey('targetEq'), 60),
        rebalBand: readInt(profileData, simKey('rebalBand'), 5),
        maxSkimPctOfEq: readInt(profileData, simKey('maxSkimPctOfEq'), 10),
        maxBearRefillPctOfEq: readInt(profileData, simKey('maxBearRefillPctOfEq'), 5)
    };

    const accumulationPhase = {
        enabled: readBool(profileData, 'sim_accumulationPhaseEnabled', false),
        durationYears: readInt(profileData, 'sim_accumulationDurationYears', 0),
        sparrate: readNumber(profileData, 'sim_accumulationSparrate', 0),
        sparrateIndexing: readString(profileData, 'sim_sparrateIndexing', 'none')
    };

    const transitionYear = accumulationPhase.enabled ? accumulationPhase.durationYears : 0;
    const transitionAge = p1StartAlter + transitionYear;

    return {
        ...baseInputs,
        ...strategyInputs,
        accumulationPhase,
        transitionYear,
        transitionAge,
        detailledTranches: detailedTranches
    };
}

function sumNumbers(list, selector) {
    return list.reduce((acc, item) => acc + selector(item), 0);
}

function weightedAverage(list, selector, weightSelector, fallback = 0) {
    const totalWeight = sumNumbers(list, weightSelector);
    if (totalWeight <= 0) return fallback;
    const weighted = list.reduce((acc, item) => acc + selector(item) * weightSelector(item), 0);
    return weighted / totalWeight;
}

function maxNumber(list, selector, fallback = 0) {
    if (!list.length) return fallback;
    return Math.max(...list.map(selector));
}

function ensureValueMatch(list, selector) {
    if (!list.length) return true;
    const first = selector(list[0]);
    return list.every(item => selector(item) === first);
}

function profileAssetTotal(inputs) {
    if (!inputs) return 0;
    const start = inputs.startVermoegen || 0;
    const components = (inputs.depotwertAlt || 0) + (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0);
    return Math.max(start, components);
}

export function combineSimulatorProfiles(profileInputs, primaryProfileId) {
    if (!Array.isArray(profileInputs) || profileInputs.length === 0) {
        return { combined: null, warnings: ['Keine Profile fuer Simulator gefunden.'] };
    }

    const inputsList = profileInputs.map(entry => entry.inputs);
    const warnings = [];
    const mergedTranches = [];
    const usedTrancheIds = new Set();
    const normalizeTranche = (tranche, profileId, seq) => {
        const normalized = { ...tranche };
        const rawId = String(normalized.trancheId || normalized.id || '').trim();
        const baseId = rawId || `tranche_${seq}`;
        const prefixedId = `${profileId}:${baseId}`;
        let uniqueId = prefixedId;
        let suffix = 1;
        while (usedTrancheIds.has(uniqueId)) {
            uniqueId = `${prefixedId}_${suffix++}`;
        }
        usedTrancheIds.add(uniqueId);
        normalized.trancheId = uniqueId;
        normalized.sourceProfileId = profileId;
        if (normalized.isin) normalized.isin = String(normalized.isin).trim();
        if (normalized.name) normalized.name = String(normalized.name).trim();
        if (normalized.type) normalized.type = String(normalized.type).trim();
        if (normalized.category) normalized.category = String(normalized.category).trim();
        return normalized;
    };
    profileInputs.forEach(entry => {
        const input = entry?.inputs;
        if (Array.isArray(input?.detailledTranches) && input.detailledTranches.length > 0) {
            input.detailledTranches.forEach((tranche, idx) => {
                mergedTranches.push(normalizeTranche(tranche, entry.profileId || 'profil', idx));
            });
        }
    });

    const primaryEntry = profileInputs.find(entry => entry.profileId === primaryProfileId) || profileInputs[0];
    const primaryInputs = primaryEntry?.inputs;
    if (!primaryInputs) {
        return { combined: null, warnings: ['Keine gueltigen Profile gefunden.'] };
    }

    const sumStartVermoegen = sumNumbers(inputsList, i => profileAssetTotal(i));
    const sumDepotwertAlt = sumNumbers(inputsList, i => i.depotwertAlt || 0);
    const sumTagesgeld = sumNumbers(inputsList, i => i.tagesgeld || 0);
    const sumGeldmarkt = sumNumbers(inputsList, i => i.geldmarktEtf || 0);
    const sumEinstandAlt = sumNumbers(inputsList, i => i.einstandAlt || 0);
    const sumFloor = sumNumbers(inputsList, i => i.startFloorBedarf || 0);
    const sumFlex = sumNumbers(inputsList, i => i.startFlexBedarf || 0);

    const totalAssets = sumStartVermoegen || (sumDepotwertAlt + sumTagesgeld + sumGeldmarkt);

    if (totalAssets < (sumDepotwertAlt + sumTagesgeld + sumGeldmarkt)) {
        warnings.push('Startvermoegen ist kleiner als die Summe aus Depot + Liquiditaet. Bitte Profile pruefen.');
    }

    const combined = {
        ...primaryInputs,
        startVermoegen: totalAssets,
        depotwertAlt: sumDepotwertAlt,
        tagesgeld: sumTagesgeld,
        geldmarktEtf: sumGeldmarkt,
        einstandAlt: sumEinstandAlt,
        zielLiquiditaet: sumTagesgeld + sumGeldmarkt,
        startFloorBedarf: sumFloor,
        startFlexBedarf: sumFlex,
        detailledTranches: mergedTranches.length ? mergedTranches : null,
        startSPB: sumNumbers(inputsList, i => i.startSPB || 0),
        kirchensteuerSatz: weightedAverage(inputsList, i => i.kirchensteuerSatz || 0, i => i.startVermoegen || 0, primaryInputs.kirchensteuerSatz || 0),
        targetEq: Math.round(weightedAverage(inputsList, i => i.targetEq || 0, i => i.startVermoegen || 0, primaryInputs.targetEq || 0)),
        rebalBand: Math.round(weightedAverage(inputsList, i => i.rebalBand || 0, i => i.startVermoegen || 0, primaryInputs.rebalBand || 0)),
        maxSkimPctOfEq: Math.round(weightedAverage(inputsList, i => i.maxSkimPctOfEq || 0, i => i.startVermoegen || 0, primaryInputs.maxSkimPctOfEq || 0)),
        maxBearRefillPctOfEq: Math.round(weightedAverage(inputsList, i => i.maxBearRefillPctOfEq || 0, i => i.startVermoegen || 0, primaryInputs.maxBearRefillPctOfEq || 0)),
        goldAktiv: (() => {
            const goldProfiles = inputsList.filter(i => i.goldAktiv && (i.goldZielProzent || 0) > 0);
            return goldProfiles.length > 0;
        })(),
        goldZielProzent: (() => {
            const goldProfiles = inputsList.filter(i => i.goldAktiv && (i.goldZielProzent || 0) > 0);
            if (goldProfiles.length === 0) return 0;
            return weightedAverage(goldProfiles, i => i.goldZielProzent || 0, i => i.startVermoegen || 0, primaryInputs.goldZielProzent || 0);
        })(),
        goldFloorProzent: (() => {
            const goldProfiles = inputsList.filter(i => i.goldAktiv && (i.goldZielProzent || 0) > 0);
            if (goldProfiles.length === 0) return 0;
            return weightedAverage(goldProfiles, i => i.goldFloorProzent || 0, i => i.startVermoegen || 0, primaryInputs.goldFloorProzent || 0);
        })(),
        rebalancingBand: weightedAverage(inputsList, i => i.rebalancingBand || 0, i => i.startVermoegen || 0, primaryInputs.rebalancingBand || 0),
        runwayMinMonths: maxNumber(inputsList, i => i.runwayMinMonths || 0, primaryInputs.runwayMinMonths || 0),
        runwayTargetMonths: maxNumber(inputsList, i => i.runwayTargetMonths || 0, primaryInputs.runwayTargetMonths || 0),
        accumulationPhase: {
            enabled: false,
            durationYears: 0,
            sparrate: 0,
            sparrateIndexing: 'none'
        },
        transitionYear: 0,
        transitionAge: primaryInputs.startAlter
    };

    if (mergedTranches.length > 0) {
        const totals = sumTrancheTotals(mergedTranches);
        const trancheTotal = totals.equity + totals.gold + totals.moneyMarket;
        const trancheWithCash = trancheTotal + sumTagesgeld + sumGeldmarkt;
        combined.startVermoegen = trancheWithCash;
        if (trancheWithCash <= 0) {
            warnings.push('Tranchen ohne Marktwert erkannt; Additiv nutzt Aggregat.');
            combined.detailledTranches = null;
        }
    }

    if (!ensureValueMatch(inputsList, i => i.rentAdjMode)) {
        warnings.push('Rentenanpassung (Mode) unterscheidet sich zwischen Profilen. Es wird das Hauptprofil verwendet.');
    }
    if (!ensureValueMatch(inputsList, i => i.stressPreset)) {
        warnings.push('Stress-Preset unterscheidet sich zwischen Profilen. Es wird das Hauptprofil verwendet.');
    }
    if (!ensureValueMatch(inputsList, i => i.pflegeModellTyp)) {
        warnings.push('Pflege-Modell unterscheidet sich zwischen Profilen. Es wird das Hauptprofil verwendet.');
    }

    const secondaryEntry = profileInputs.find(entry => entry.profileId !== primaryEntry.profileId) || null;
    const secondaryInputs = secondaryEntry?.inputs || null;
    const totalRente = sumNumbers(profileInputs, entry => entry.inputs?.renteMonatlich || 0);
    const partnerRente = secondaryInputs ? (secondaryInputs.renteMonatlich || 0) : 0;
    const p1Rente = Math.max(0, totalRente - partnerRente);

    const partner = secondaryInputs ? {
        aktiv: true,
        geschlecht: secondaryInputs.geschlecht || 'w',
        startAlter: secondaryInputs.startAlter || 0,
        startInJahren: secondaryInputs.renteStartOffsetJahre || 0,
        monatsrente: partnerRente,
        sparerPauschbetrag: secondaryInputs.startSPB || 0,
        kirchensteuerPct: (secondaryInputs.kirchensteuerSatz || 0) * 100,
        steuerquotePct: 0,
        brutto: partnerRente * 12
    } : {
        ...combined.partner,
        aktiv: false,
        monatsrente: 0,
        brutto: 0
    };

    const merged = {
        ...combined,
        startAlter: primaryInputs.startAlter || combined.startAlter,
        geschlecht: primaryInputs.geschlecht || combined.geschlecht,
        renteMonatlich: p1Rente,
        renteStartOffsetJahre: primaryInputs.renteStartOffsetJahre || 0,
        rentAdjMode: primaryInputs.rentAdjMode || combined.rentAdjMode,
        rentAdjPct: Number.isFinite(primaryInputs.rentAdjPct) ? primaryInputs.rentAdjPct : combined.rentAdjPct,
        partner
    };

    if (profileInputs.length > 2) {
        warnings.push('Mehr als 2 Profile gewaehlt: Demografie auf 2 Personen begrenzt.');
    }

    return { combined: merged, warnings };
}
