"use strict";

import { shortenReasonText } from './simulator-utils.js';
import { HISTORICAL_DATA, PFLEGE_STUFE1_WAHRSCHEINLICHKEIT, annualData, REGIME_DATA, REGIME_TRANSITIONS } from './simulator-data.js';
import {
    computeYearlyPension, computeTwoPersonPensions, initializePortfolio, applySaleToPortfolio, summarizeSalesByAsset,
    buildInputsCtxFromPortfolio, sumDepot, buyGold, buyStocksNeu
} from './simulator-portfolio.js';
import { resolveProfileKey } from './simulator-heatmap.js';

/**
 * Berechnet Haushalts-Renten und SPB für Backtest (ohne Sterblichkeitslogik)
 * @param {Object} params - { yearIndex, yearData, lastAnnualPension, inputs }
 * @returns {Object} { pensionAnnual, nextLastAnnualPension: {a, b}, spbTotal }
 */
function computeHouseholdPensionAndSPB({ yearIndex, yearData, lastAnnualPension, inputs }) {
    // Backward-Kompatibilität: lastAnnualPension kann Zahl oder {a, b} sein
    const lastA = (lastAnnualPension && typeof lastAnnualPension === 'object')
        ? (lastAnnualPension.a || 0)
        : (lastAnnualPension || 0);
    const lastB = (lastAnnualPension && typeof lastAnnualPension === 'object')
        ? (lastAnnualPension.b || 0)
        : 0;

    // Person A (Hauptperson)
    const a = computeYearlyPension({
        yearIndex,
        baseMonthly: inputs.renteMonatlich,
        startOffset: inputs.renteStartOffsetJahre,
        lastAnnualPension: lastA,
        indexierungsArt: inputs.renteIndexierungsart,
        inflRate: yearData.inflation,
        lohnRate: yearData.lohn,
        festerSatz: inputs.renteFesterSatz
    });

    // Person B (Partner) – wenn vorhanden
    let b = 0;
    if (inputs.partner) {
        b = computeYearlyPension({
            yearIndex,
            baseMonthly: inputs.partner.renteMonatlich,
            startOffset: inputs.partner.renteStartOffsetJahre,
            lastAnnualPension: lastB,
            indexierungsArt: inputs.partner.renteIndexierungsart,
            inflRate: yearData.inflation,
            lohnRate: yearData.lohn,
            festerSatz: inputs.partner.renteFesterSatz
        });
    }

    // Backtest-Phase: beide "leben" immer → SPB addieren
    const spbTotal = (inputs.startSPB || 0) + (inputs.partner?.startSPB || 0);

    return {
        pensionAnnual: a + b,
        nextLastAnnualPension: { a, b },
        spbTotal
    };
}

/**
 * Simuliert ein Jahr des Ruhestandsszenarios
 * @param {Object} currentState - Aktuelles Portfolio und Marktstatus
 * @param {Object} inputs - Benutzereingaben und Konfiguration
 * @param {Object} yearData - Marktdaten für das Jahr
 * @param {number} yearIndex - Index des Simulationsjahres
 * @param {Object} pflegeMeta - Pflege-Metadata (optional)
 * @param {Object} personStatus - Status der Personen (optional, für Zwei-Personen-Haushalte)
 * @returns {Object} Simulationsergebnisse
 */
export function simulateOneYear(currentState, inputs, yearData, yearIndex, pflegeMeta = null, personStatus = null) {
    let { portfolio, baseFloor, baseFlex, lastState, currentAnnualPension, currentPensions, marketDataHist } = currentState;
    let { depotTranchesAktien, depotTranchesGold } = portfolio;
    let liquiditaet = portfolio.liquiditaet;
    let totalTaxesThisYear = 0;

    const rA = isFinite(yearData.rendite) ? yearData.rendite : 0;
    const rG = isFinite(yearData.gold_eur_perf) ? yearData.gold_eur_perf / 100 : 0;
    const rC = isFinite(yearData.zinssatz) ? yearData.zinssatz / 100 : 0;

    // Optimiert: for-Loop statt forEach für bessere Performance
    for (let i = 0; i < depotTranchesAktien.length; i++) {
        depotTranchesAktien[i].marketValue *= (1 + rA);
    }
    for (let i = 0; i < depotTranchesGold.length; i++) {
        depotTranchesGold[i].marketValue *= (1 + rG);
    }

    const marketDataCurrentYear = { ...marketDataHist, inflation: yearData.inflation };

    // Berechne Renten und SPB für Ein- oder Zwei-Personen-Haushalt
    let pensionAnnual, pension1, pension2;
    let nextLastAnnualPension = currentAnnualPension;
    let spbToUse = inputs.startSPB;

    if (inputs.zweiPersonenHaushalt && currentPensions) {
        // Monte-Carlo mit Sterblichkeit - ZWEI separate Renten-Berechnungen
        const lastP1 = currentAnnualPension1 || currentPensions.person1 || 0;
        const lastP2 = currentAnnualPension2 || currentPensions.person2 || 0;

        // Person 1 Rente
        const rent1 = computeYearlyPension({
            yearIndex,
            baseMonthly: inputs.renteMonatlich,
            startOffset: inputs.renteStartOffsetJahre,
            lastAnnualPension: lastP1,
            indexierungsArt: inputs.renteIndexierungsart,
            inflRate: yearData.inflation,
            lohnRate: yearData.lohn,
            festerSatz: inputs.renteFesterSatz
        });

        // Person 2 Rente
        const rent2 = computeYearlyPension({
            yearIndex,
            baseMonthly: inputs.partnerRenteMonatlich,
            startOffset: inputs.partnerRenteStartOffsetJahre,
            lastAnnualPension: lastP2,
            indexierungsArt: inputs.partnerRenteIndexierungsart || inputs.renteIndexierungsart,
            inflRate: yearData.inflation,
            lohnRate: yearData.lohn,
            festerSatz: inputs.partnerRenteFesterSatz || 0
        });

        // Gesamt
        pensionAnnual = (rent1 || 0) + (rent2 || 0);
        pension1 = rent1;
        pension2 = rent2;
    } else if (inputs.partner) {
        // Backtest Zwei-Personen-Haushalt (ohne Sterblichkeit)
        const hh = computeHouseholdPensionAndSPB({ yearIndex, yearData, lastAnnualPension: currentAnnualPension, inputs });
        pensionAnnual = hh.pensionAnnual;
        nextLastAnnualPension = hh.nextLastAnnualPension;
        spbToUse = hh.spbTotal;
        pension1 = hh.nextLastAnnualPension.a;
        pension2 = hh.nextLastAnnualPension.b;
    } else {
        // Single-Person
        pensionAnnual = computeYearlyPension({
            yearIndex,
            baseMonthly: inputs.renteMonatlich,
            startOffset: inputs.renteStartOffsetJahre,
            lastAnnualPension: currentAnnualPension,
            indexierungsArt: inputs.renteIndexierungsart,
            inflRate: yearData.inflation,
            lohnRate: yearData.lohn,
            festerSatz: inputs.renteFesterSatz
        });
        pension1 = pensionAnnual;
        pension2 = 0;
    }

    const inflatedFloor = Math.max(0, baseFloor - pensionAnnual);
    const inflatedFlex  = baseFlex;
    const algoInput = { ...inputs, floorBedarf: baseFloor, flexBedarf: baseFlex, startSPB: spbToUse };
    const market = window.Ruhestandsmodell_v30.analyzeMarket(marketDataCurrentYear);

    const jahresbedarfAusPortfolio = inflatedFloor + inflatedFlex;
    const runwayMonths = jahresbedarfAusPortfolio > 0 ? (liquiditaet / (jahresbedarfAusPortfolio / 12)) : Infinity;

    const profileKey = resolveProfileKey(algoInput.risikoprofil);
    let profile = window.Ruhestandsmodell_v30.CONFIG.PROFIL_MAP[profileKey];

    if (!profile) {
        const fallbackKey = Object.keys(window.Ruhestandsmodell_v30.CONFIG.PROFIL_MAP)[0];
        profile = window.Ruhestandsmodell_v30.CONFIG.PROFIL_MAP[fallbackKey];
    }
    const zielLiquiditaet = window.Ruhestandsmodell_v30.calculateTargetLiquidity(profile, market, {floor: inflatedFloor, flex: inflatedFlex});

    const depotwertGesamt = sumDepot(portfolio);
    const totalWealth     = depotwertGesamt + liquiditaet;

    const inputsCtx = buildInputsCtxFromPortfolio(algoInput, portfolio, {pensionAnnual, marketData: marketDataCurrentYear, personStatus});

    const { spendingResult, newState: spendingNewState } = window.Ruhestandsmodell_v30.determineSpending({
        market, lastState, inflatedFloor, inflatedFlex, round5: algoInput.round5,
        runwayMonths, liquidNow: liquiditaet, profile, depotValue: depotwertGesamt, totalWealth, inputsCtx
    });

    const results = {
        aktuelleLiquiditaet: liquiditaet, depotwertGesamt, zielLiquiditaet, gesamtwert: totalWealth,
        inflatedFloor, grossFloor: baseFloor, spending: spendingResult, market,
        minGold: algoInput.goldAktiv ? (algoInput.goldFloorProzent/100)*totalWealth : 0
    };
    const actionResult = window.Ruhestandsmodell_v30.determineAction(results, inputsCtx);

    let mergedSaleResult = actionResult.saleResult;
    if (actionResult.saleResult) {
        totalTaxesThisYear += (actionResult.saleResult.steuerGesamt || 0);
        applySaleToPortfolio(portfolio, actionResult.saleResult);
    }

    liquiditaet = actionResult.liqNachTransaktion.total;

    if (actionResult.kaufGold > 0) {
        buyGold(portfolio, actionResult.kaufGold);
    }
    if (actionResult.kaufAktien > 0) {
        buyStocksNeu(portfolio, actionResult.kaufAktien);
    }

    const depotWertVorEntnahme = sumDepot(portfolio);
    let emergencyRefillHappened = false;
    const jahresEntnahme = spendingResult.monatlicheEntnahme * 12;

    if (liquiditaet < jahresEntnahme && depotWertVorEntnahme > 0) {
        const shortfall = jahresEntnahme - liquiditaet;
        const emergencyCtx = buildInputsCtxFromPortfolio(algoInput, { depotTranchesAktien: portfolio.depotTranchesAktien.map(t => ({...t})), depotTranchesGold: portfolio.depotTranchesGold.map(t => ({...t})), liquiditaet: liquiditaet}, { pensionAnnual, marketData: marketDataCurrentYear, personStatus });
        const { saleResult: emergencySale } = window.Ruhestandsmodell_v30.calculateSaleAndTax(shortfall, emergencyCtx, { minGold: results.minGold }, market);

        if (emergencySale && emergencySale.achievedRefill > 0) {
            liquiditaet += emergencySale.achievedRefill;
            totalTaxesThisYear += (emergencySale.steuerGesamt || 0);
            applySaleToPortfolio(portfolio, emergencySale);
            mergedSaleResult = mergedSaleResult ? window.Ruhestandsmodell_v30.mergeSaleResults(mergedSaleResult, emergencySale) : emergencySale;
            emergencyRefillHappened = true;
        }
    }

    if (liquiditaet < jahresEntnahme) {
        return { isRuin: true };
    }
    liquiditaet -= jahresEntnahme;

    let kaufAkt = 0, kaufGld = 0;
    const ueberschuss = liquiditaet - zielLiquiditaet;
    if (ueberschuss > 500) {
        liquiditaet -= ueberschuss;
        const aktienAnteilQuote = algoInput.targetEq / (100 - (algoInput.goldAktiv ? algoInput.goldZielProzent : 0));
        const goldTeil = algoInput.goldAktiv ? ueberschuss * (1 - aktienAnteilQuote) : 0;
        const aktienTeil = ueberschuss - goldTeil;
        kaufGld = goldTeil;
        kaufAkt = aktienTeil;
        buyGold(portfolio, goldTeil);
        buyStocksNeu(portfolio, aktienTeil);
    }

    liquiditaet *= (1 + rC);
    if (!isFinite(liquiditaet)) liquiditaet = 0;

    const newMarketDataHist = {
        endeVJ_3: marketDataHist.endeVJ_2,
        endeVJ_2: marketDataHist.endeVJ_1,
        endeVJ_1: marketDataHist.endeVJ,
        endeVJ: marketDataHist.endeVJ * (1 + rA),
        ath: Math.max(marketDataHist.ath, marketDataHist.endeVJ * (1 + rA)),
        jahreSeitAth: (marketDataHist.endeVJ * (1 + rA) >= marketDataHist.ath) ? 0 : marketDataHist.jahreSeitAth + 1,
        inflation: yearData.inflation
    };

    const vk = summarizeSalesByAsset(mergedSaleResult);
    const kaufAktTotal = (actionResult.kaufAktien || 0) + (kaufAkt || 0);
    const totalGoldKauf = (actionResult.kaufGold || 0) + kaufGld;

    let aktionText = shortenReasonText(actionResult.reason || 'none', actionResult.title || market.szenarioText);
    if (emergencyRefillHappened) { aktionText += " / Not-VK"; }
    if (totalGoldKauf > 0 && actionResult.reason !== 'rebalance_up') { aktionText += " / Rebal.(G+)"; }
    if (kaufAktTotal > 0 && !actionResult.title.includes("→ Aktien")) { aktionText += " / Rebal.(A+)"; }

    const actionTitle = actionResult.title || '';
    const isRebalanceEvent = actionTitle.toLowerCase().includes('rebalancing') && !actionTitle.toLowerCase().includes('puffer');

    const inflFactorThisYear = 1 + (yearData.inflation / 100);
    const naechsterBaseFloor = baseFloor * inflFactorThisYear;
    const naechsterBaseFlex = baseFlex * inflFactorThisYear;

    // Bei Zwei-Personen-Haushalt: Separate Pension-States aktualisieren
    const newStateBase = {
        portfolio: { ...portfolio, liquiditaet },
        baseFloor: naechsterBaseFloor,
        baseFlex: naechsterBaseFlex,
        lastState: spendingNewState,
        currentAnnualPension: inputs.partner ? nextLastAnnualPension : pensionAnnual,
        currentAnnualPension1: pension1 || 0,
        currentAnnualPension2: pension2 || 0,
        age1: (currentState.age1 || inputs.startAlter) + 1,
        age2: (currentState.age2 || inputs.partnerStartAlter || inputs.startAlter) + 1,
        marketDataHist: newMarketDataHist,
        samplerState: currentState.samplerState
    };

    if (inputs.zweiPersonenHaushalt && currentPensions) {
        newStateBase.currentPensions = { person1: pension1, person2: pension2 };
    }

    return {
        isRuin: false,
        newState: newStateBase,
        logData: {
            entscheidung: { ...spendingResult, jahresEntnahme, runwayMonths, kuerzungProzent: spendingResult.kuerzungProzent },
            FlexRatePct: spendingResult.details.flexRate,
            CutReason: spendingResult.kuerzungQuelle,
            Alarm: spendingNewState.alarmActive,
            Regime: spendingNewState.lastMarketSKey,
            QuoteEndPct: spendingResult.details.entnahmequoteDepot * 100,
            RunwayCoveragePct: (zielLiquiditaet > 0 ? (actionResult.liqNachTransaktion.total / zielLiquiditaet) : 1) * 100,
            RealReturnEquityPct: (1 + rA) / (1 + yearData.inflation/100) - 1,
            RealReturnGoldPct: (1 + rG) / (1 + yearData.inflation/100) - 1,
            entnahmequote: depotWertVorEntnahme > 0 ? (jahresEntnahme / depotWertVorEntnahme) : 0,
            steuern_gesamt: totalTaxesThisYear,
            vk,
            kaufAkt: kaufAktTotal,
            kaufGld: totalGoldKauf,
            wertAktien: sumDepot({depotTranchesAktien: portfolio.depotTranchesAktien}),
            wertGold: sumDepot({depotTranchesGold: portfolio.depotTranchesGold}),
            liquiditaet, aktionUndGrund: aktionText,
            usedSPB: mergedSaleResult ? (mergedSaleResult.pauschbetragVerbraucht || 0) : 0,
            floor_brutto: baseFloor,
            pension_annual: pensionAnnual,
            pension_person1: pension1,
            pension_person2: pension2,
            floor_aus_depot: inflatedFloor,
            flex_brutto: baseFlex,
            flex_erfuellt_nominal: jahresEntnahme > inflatedFloor ? jahresEntnahme - inflatedFloor : 0,
            inflation_factor_cum: spendingNewState.cumulativeInflationFactor,
            jahresentnahme_real: jahresEntnahme / spendingNewState.cumulativeInflationFactor,
            pflege_aktiv: pflegeMeta?.active ?? false,
            pflege_zusatz_floor: pflegeMeta?.zusatzFloorZiel ?? 0,
            pflege_zusatz_floor_delta: pflegeMeta?.zusatzFloorDelta ?? 0,
            pflege_flex_faktor: pflegeMeta?.flexFactor ?? 1.0,
            pflege_kumuliert: pflegeMeta?.kumulierteKosten ?? 0
        },
        totalTaxesThisYear
    };
}

/**
 * Initialisiert den Startzustand für einen Monte-Carlo-Lauf
 */
export function initMcRunState(inputs, startYearIndex) {
    const startPortfolio = initializePortfolio(inputs);

    const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a,b)=>a-b);
    const validStartIndices = annualData.map((d, i) => i).filter(i => i >= 4);
    const effectiveIndex = validStartIndices[startYearIndex % validStartIndices.length];
    const startJahr = annualData[effectiveIndex].jahr;

    const marketDataHist = {
        endeVJ:   HISTORICAL_DATA[startJahr - 1]?.msci_eur || 1000,
        endeVJ_1: HISTORICAL_DATA[startJahr - 2]?.msci_eur || 1000,
        endeVJ_2: HISTORICAL_DATA[startJahr - 3]?.msci_eur || 1000,
        endeVJ_3: HISTORICAL_DATA[startJahr - 4]?.msci_eur || 1000,
        ath: 0,
        jahreSeitAth: 0,
        inflation: HISTORICAL_DATA[startJahr - 1]?.inflation_de || 2.0
    };

    const pastValues = histYears.filter(y => y < startJahr).map(y => HISTORICAL_DATA[y].msci_eur);
    marketDataHist.ath = pastValues.length > 0 ? Math.max(...pastValues, marketDataHist.endeVJ) : marketDataHist.endeVJ;
    if (marketDataHist.endeVJ < marketDataHist.ath) {
       let lastAthYear = Math.max(...histYears.filter(y => y < startJahr && HISTORICAL_DATA[y].msci_eur >= marketDataHist.ath));
       marketDataHist.jahreSeitAth = (startJahr - 1) - lastAthYear;
    }

    const startA1 = inputs.startAlter;
    const startA2 = inputs.partnerStartAlter || inputs.startAlter;

    const initialState = {
        portfolio: startPortfolio,
        baseFloor: inputs.startFloorBedarf,
        baseFlex: inputs.startFlexBedarf,
        lastState: null,
        currentAnnualPension: 0,
        currentAnnualPension1: 0,
        currentAnnualPension2: 0,
        age1: startA1,
        age2: startA2,
        marketDataHist: marketDataHist,
        samplerState: {}
    };

    // Für Zwei-Personen-Haushalte: Separate Rententracking
    if (inputs.zweiPersonenHaushalt) {
        initialState.currentPensions = { person1: 0, person2: 0 };
        initialState.personStatus = { person1Alive: true, person2Alive: true };
    }

    return initialState;
}

/**
 * Erstellt ein Standard-Pflege-Metadata-Objekt
 * Für Zwei-Personen-Haushalte werden zwei separate CareMeta-Objekte erstellt
 */
export function makeDefaultCareMeta(enabled, zweiPersonen = false) {
    if (!enabled) return zweiPersonen ? { person1: null, person2: null } : null;

    const singleCareMeta = {
        active: false,
        triggered: false,
        startAge: -1,
        durationYears: 0,
        currentYearInCare: 0,
        zusatzFloorZiel: 0,
        zusatzFloorDelta: 0,
        flexFactor: 1.0,
        kumulierteKosten: 0,
        floorAtTrigger: 0,
        flexAtTrigger: 0,
        maxFloorAtTrigger: 0
    };

    if (zweiPersonen) {
        return {
            person1: { ...singleCareMeta },
            person2: { ...singleCareMeta }
        };
    }

    return singleCareMeta;
}

/**
 * Wählt Marktdaten für das nächste Jahr gemäß der MC-Methode aus
 */
export function sampleNextYearData(state, methode, blockSize, rand, stressCtx) {
    const samplerState = state.samplerState;

    if (stressCtx && stressCtx.type === 'conditional_bootstrap' && stressCtx.remainingYears > 0) {
        const randomIndex = Math.floor(rand() * stressCtx.pickableIndices.length);
        const chosenYearIndex = stressCtx.pickableIndices[randomIndex];
        return { ...annualData[chosenYearIndex] };
    }

    if (methode === 'block') {
        if (!samplerState.blockStartIndex || samplerState.yearInBlock >= blockSize) {
            const maxIndex = annualData.length - blockSize;
            samplerState.blockStartIndex = Math.floor(rand() * maxIndex);
            samplerState.yearInBlock = 0;
        }
        const data = annualData[samplerState.blockStartIndex + samplerState.yearInBlock];
        samplerState.yearInBlock++;
        return { ...data };
    }

    let regime;
    if (methode === 'regime_iid') {
        const regimes = Object.keys(REGIME_DATA);
        regime = regimes[Math.floor(rand() * regimes.length)];
    } else {
        if (!samplerState.currentRegime) {
            samplerState.currentRegime = annualData[Math.floor(rand() * annualData.length)].regime;
        }

        const transitions = REGIME_TRANSITIONS[samplerState.currentRegime];
        const r = rand();
        let cumulativeProb = 0;
        let nextRegime = 'SIDEWAYS';
        for (const [targetRegime, count] of Object.entries(transitions)) {
            if (targetRegime === 'total') continue;
            cumulativeProb += (count / transitions.total);
            if (r <= cumulativeProb) {
                nextRegime = targetRegime;
                break;
            }
        }
        regime = nextRegime;
        samplerState.currentRegime = nextRegime;
    }

    const possibleYears = REGIME_DATA[regime];
    const chosenYear = possibleYears[Math.floor(rand() * possibleYears.length)];
    return { ...chosenYear };
}

/**
 * Berechnet Volatilität und maximalen Drawdown aus einer Serie
 */
export function computeRunStatsFromSeries(series) {
    if (!Array.isArray(series) || series.length < 2) {
        return { volPct: 0, maxDDpct: 0 };
    }
    const returns = [];
    for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1] || 0;
        const cur  = series[i] || 0;
        const r = (prev > 0 && isFinite(prev) && isFinite(cur)) ? (cur / prev - 1) : 0;
        returns.push(r);
    }
    const mu = returns.length > 0 ? returns.reduce((a,b)=>a+b,0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((s,x)=>s + (x-mu)*(x-mu), 0) / (returns.length - 1) : 0;
    const volPct = Math.sqrt(Math.max(variance, 0)) * 100;

    let peak = series[0];
    let maxDD = 0;
    for (let i = 1; i < series.length; i++) {
        peak = Math.max(peak, series[i]);
        if (peak > 0) {
            const dd = (series[i] - peak) / peak;
            if (isFinite(dd)) maxDD = Math.min(maxDD, dd);
        }
    }
    const maxDDpct = Math.abs(maxDD) * 100;
    return { volPct, maxDDpct };
}

/**
 * Aktualisiert Pflege-Metadata für Zwei-Personen-Haushalte
 */
export function updateCareMetaTwoPersons(careObj, inputs, age1, age2, yearData, rand) {
    if (!inputs.pflegefallLogikAktivieren || !careObj) return careObj;

    careObj.person1 = updateCareMeta(careObj.person1, inputs, age1, yearData, rand);
    careObj.person2 = updateCareMeta(careObj.person2, inputs, age2, yearData, rand);

    return careObj;
}

/**
 * Aktualisiert Pflege-Metadata basierend auf Wahrscheinlichkeit und Status
 */
export function updateCareMeta(care, inputs, age, yearData, rand) {
    if (!inputs.pflegefallLogikAktivieren || !care) return care;

    if (care.active) {
        care.currentYearInCare++;
        if (inputs.pflegeModellTyp === 'akut' && care.currentYearInCare > care.durationYears) {
            care.active = false;
            return care;
        }

        const yearsSinceStart = care.currentYearInCare -1;
        const inflationsAnpassung = (1 + yearData.inflation/100) * (1 + inputs.pflegeKostenDrift);

        const floorAtTriggerAdjusted = care.floorAtTrigger * Math.pow(1 + yearData.inflation/100, yearsSinceStart + 1);
        const flexAtTriggerAdjusted = care.flexAtTrigger * Math.pow(1 + yearData.inflation/100, yearsSinceStart + 1);
        const maxFloorAdjusted = care.maxFloorAtTrigger * inflationsAnpassung;

        const capZusatz = Math.max(0, maxFloorAdjusted - floorAtTriggerAdjusted);

        const zielRoh = inputs.pflegeStufe1Zusatz * inflationsAnpassung;
        const rampUpFactor = Math.min(1.0, care.currentYearInCare / Math.max(1, inputs.pflegeRampUp));
        const zielMitRampUp = zielRoh * rampUpFactor;

        const zusatzFloorZielFinal = Math.min(capZusatz, zielMitRampUp);

        const zusatzFloorDelta = Math.max(0, zusatzFloorZielFinal - care.zusatzFloorZiel);
        care.zusatzFloorZiel = zusatzFloorZielFinal;
        care.flexFactor = inputs.pflegeStufe1FlexCut;

        const flexVerlust = flexAtTriggerAdjusted * (1 - care.flexFactor);
        care.kumulierteKosten += zusatzFloorDelta + flexVerlust;

        care.log_floor_anchor = floorAtTriggerAdjusted;
        care.log_maxfloor_anchor = maxFloorAdjusted;
        care.log_cap_zusatz = capZusatz;
        care.log_delta_flex = flexVerlust;

        return care;
    }

    if (!care.triggered) {
        const ageBucket = Math.floor(age / 5) * 5;
        const triggerWahrscheinlichkeit = PFLEGE_STUFE1_WAHRSCHEINLICHKEIT[ageBucket] || 0;

        if (rand() < triggerWahrscheinlichkeit) {
            care.triggered = true;
            care.active = true;
            care.startAge = age;
            care.currentYearInCare = 1;

            care.floorAtTrigger = inputs.startFloorBedarf;
            care.flexAtTrigger = inputs.startFlexBedarf;
            care.maxFloorAtTrigger = inputs.pflegeMaxFloor;

            if (inputs.pflegeModellTyp === 'akut') {
                const min = inputs.pflegeMinDauer, max = inputs.pflegeMaxDauer;
                care.durationYears = Math.floor(rand() * (max - min + 1)) + min;
            } else {
                care.durationYears = 999;
            }

            return updateCareMeta(care, inputs, age, yearData, rand);
        }
    }

    return care;
}
