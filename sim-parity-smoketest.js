"use strict";

/**
 * ===================================================================
 * PARITY SMOKE TEST: Engine vs Simulator
 * ===================================================================
 *
 * Vergleicht die Kernlogik von Engine (EngineAPI) und Simulator
 * über mehrere Jahre hinweg, um strukturelle Abweichungen zu finden.
 */

window.runParitySmokeTest = function({ years = 3 } = {}) {
    console.log(`%c=== Parity Smoke Test: ${years} Jahre ===`, 'font-weight:bold; font-size:14px; color:#2196F3');

    // --- Sammle Default-Inputs aus Simulator.html ---
    const simInputs = collectSimulatorInputs();
    const { initialState, engineInput } = buildInitialStates(simInputs);

    let simState = initialState;
    let engineState = null;
    let mismatches = [];

    // --- Simuliere Jahr für Jahr ---
    for (let year = 1; year <= years; year++) {
        const yearData = sampleHistoricalYear(year);

        // 1. Simulator-Jahr
        const simResult = runSimulatorYear(simState, simInputs, yearData, year);
        if (simResult.isRuin) {
            console.error(`%c❌ Simulator: Ruin @Jahr ${year}`, 'color:red; font-weight:bold');
            break;
        }

        // 2. Engine-Jahr
        const engineResult = runEngineYear(engineInput, engineState, yearData, simInputs);
        if (engineResult.error) {
            console.error(`%c❌ Engine: Error @Jahr ${year}`, 'color:red; font-weight:bold', engineResult.error);
            break;
        }

        // 3. Vergleiche Kernzustände
        const diff = compareStates(year, simResult, engineResult);
        if (diff.length > 0) {
            mismatches.push(...diff);
        }

        // 4. Update States für nächstes Jahr
        simState = simResult.newState;
        engineState = engineResult.newState;

        // Update Engine-Input mit neuen Marktdaten
        updateEngineInputForNextYear(engineInput, yearData);
    }

    // --- Ergebnis ---
    if (mismatches.length === 0) {
        console.log(`%c✅ OK - Keine Mismatches über ${years} Jahre`, 'color:green; font-weight:bold');
    } else {
        console.log(`%c⚠️ ${mismatches.length} Mismatch(es) gefunden:`, 'color:orange; font-weight:bold');
        mismatches.forEach(m => console.log(m));
    }
};

// ===================================================================
// HILFSFUNKTIONEN
// ===================================================================

function collectSimulatorInputs() {
    const goldAktiv = document.getElementById('goldAllokationAktiv').checked;
    return {
        startVermoegen: parseFloat(document.getElementById('simStartVermoegen').value) || 0,
        depotwertAlt: parseFloat(document.getElementById('depotwertAlt').value) || 0,
        einstandAlt: parseFloat(document.getElementById('einstandAlt').value) || 0,
        zielLiquiditaet: parseFloat(document.getElementById('zielLiquiditaet').value) || 0,
        startFloorBedarf: parseFloat(document.getElementById('startFloorBedarf').value) || 0,
        startFlexBedarf: parseFloat(document.getElementById('startFlexBedarf').value) || 0,
        risikoprofil: 'sicherheits-dynamisch',
        goldAktiv: goldAktiv,
        goldZielProzent: goldAktiv ? parseFloat(document.getElementById('goldAllokationProzent').value) : 0,
        goldFloorProzent: goldAktiv ? parseFloat(document.getElementById('goldFloorProzent').value) : 0,
        rebalancingBand: goldAktiv ? parseFloat(document.getElementById('rebalancingBand').value) : 25,
        goldSteuerfrei: goldAktiv && document.getElementById('goldSteuerfrei').checked,
        startSPB: parseFloat(document.getElementById('startSPB').value) || 0,
        kirchensteuerSatz: parseFloat(document.getElementById('kirchensteuerSatz').value) || 0,
        round5: document.getElementById('round5').checked,
        renteMonatlich: parseFloat(document.getElementById('renteMonatlich').value) || 0,
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        targetEq: 60,
        rebalBand: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5
    };
}

function buildInitialStates(simInputs) {
    // Portfolio-Berechnung (wie in simulator-portfolio.js)
    const flexiblesVermoegen = Math.max(0, simInputs.startVermoegen - simInputs.depotwertAlt);
    const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - simInputs.zielLiquiditaet);
    const investitionsKapitalGesamt = simInputs.depotwertAlt + investitionsKapitalNeu;
    const zielwertGold = simInputs.goldAktiv ? investitionsKapitalGesamt * (simInputs.goldZielProzent / 100) : 0;
    const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

    // Simulator-State
    const portfolio = {
        depotTranchesAktien: [
            { marketValue: simInputs.depotwertAlt, costBasis: simInputs.einstandAlt, tqf: 0.30, type: 'aktien_alt' },
            { marketValue: depotwertNeu, costBasis: depotwertNeu, tqf: 0.30, type: 'aktien_neu' }
        ].filter(t => t.marketValue > 1),
        depotTranchesGold: zielwertGold > 1 ? [{ marketValue: zielwertGold, costBasis: zielwertGold, tqf: simInputs.goldSteuerfrei ? 1.0 : 0.0, type: 'gold' }] : [],
        liquiditaet: simInputs.zielLiquiditaet
    };

    const marketDataHist = {
        endeVJ: 2318, endeVJ_1: 1960, endeVJ_2: 1850, endeVJ_3: 1706,
        ath: 2318, jahreSeitAth: 0, inflation: 1.7
    };

    const initialState = {
        portfolio,
        baseFloor: simInputs.startFloorBedarf,
        baseFlex: simInputs.startFlexBedarf,
        lastState: null,
        currentAnnualPension: 0,
        marketDataHist,
        samplerState: {}
    };

    // Engine-Input
    const engineInput = {
        aktuellesAlter: 65,
        inflation: 1.7,
        tagesgeld: simInputs.zielLiquiditaet * 0.5,
        geldmarktEtf: simInputs.zielLiquiditaet * 0.5,
        depotwertAlt: simInputs.depotwertAlt,
        depotwertNeu: depotwertNeu,
        goldWert: zielwertGold,
        endeVJ: 2318, endeVJ_1: 1960, endeVJ_2: 1850, endeVJ_3: 1706,
        ath: 2318, jahreSeitAth: 0,
        renteAktiv: simInputs.renteMonatlich > 0 ? 'ja' : 'nein',
        renteMonatlich: simInputs.renteMonatlich,
        floorBedarf: simInputs.startFloorBedarf,
        flexBedarf: simInputs.startFlexBedarf,
        risikoprofil: simInputs.risikoprofil,
        kirchensteuerSatz: simInputs.kirchensteuerSatz,
        sparerPauschbetrag: simInputs.startSPB,
        round5: simInputs.round5,
        goldAktiv: simInputs.goldAktiv,
        goldZielProzent: simInputs.goldZielProzent,
        goldFloorProzent: simInputs.goldFloorProzent,
        rebalancingBand: simInputs.rebalancingBand,
        goldSteuerfrei: simInputs.goldSteuerfrei,
        costBasisAlt: simInputs.einstandAlt,
        costBasisNeu: depotwertNeu,
        goldCost: zielwertGold,
        tqfAlt: 0.30,
        tqfNeu: 0.30,
        runwayMinMonths: simInputs.runwayMinMonths,
        runwayTargetMonths: simInputs.runwayTargetMonths,
        targetEq: simInputs.targetEq,
        rebalBand: simInputs.rebalBand,
        maxSkimPctOfEq: simInputs.maxSkimPctOfEq,
        maxBearRefillPctOfEq: simInputs.maxBearRefillPctOfEq
    };

    return { initialState, engineInput };
}

function sampleHistoricalYear(yearIndex) {
    // Nutze historische Daten aus simulator-data.js (falls verfügbar)
    // Fallback: Synthetisches Jahr
    if (window.annualData && window.annualData.length > 0) {
        const idx = (yearIndex - 1) % window.annualData.length;
        return window.annualData[idx];
    }
    return {
        jahr: 2000 + yearIndex,
        msci_eur: 2318 * (1 + (Math.random() * 0.2 - 0.1)),
        rendite: (Math.random() * 0.2 - 0.1),
        inflation_de: 1.5 + Math.random() * 2,
        zinssatz: 0.5 + Math.random() * 2,
        gold_eur_perf: (Math.random() * 20 - 10),
        lohn: 2.0 + Math.random()
    };
}

function runSimulatorYear(state, inputs, yearData, yearIndex) {
    // Nutze die globale simulateOneYear-Funktion (aus simulator-engine.js)
    if (typeof window.simulateOneYear !== 'function') {
        console.error('simulateOneYear nicht verfügbar - simulator-engine.js nicht geladen?');
        return { isRuin: true };
    }
    return window.simulateOneYear(state, inputs, yearData, yearIndex, null);
}

function runEngineYear(engineInput, lastState, yearData, simInputs) {
    // Aktualisiere Inflation im Input
    engineInput.inflation = yearData.inflation_de || yearData.inflation || 1.7;

    // Wende Marktrenditen an (vor Engine-Call, da Engine nur Entscheidungen trifft)
    const rA = isFinite(yearData.rendite) ? yearData.rendite : 0;
    const rG = isFinite(yearData.gold_eur_perf) ? yearData.gold_eur_perf / 100 : 0;
    const rC = isFinite(yearData.zinssatz) ? yearData.zinssatz / 100 : 0;

    engineInput.depotwertAlt *= (1 + rA);
    engineInput.depotwertNeu *= (1 + rA);
    engineInput.goldWert *= (1 + rG);

    // Engine-Call
    const result = window.EngineAPI.simulateSingleYear(engineInput, lastState);
    if (result.error) {
        return { error: result.error };
    }

    // Wende Transaktionen an
    if (result.ui.action.type === 'TRANSACTION') {
        const quellen = result.ui.action.quellen || [];
        quellen.forEach(q => {
            if (q.kind === 'aktien_alt') {
                const anteil = engineInput.depotwertAlt > 0 ? q.brutto / engineInput.depotwertAlt : 0;
                engineInput.depotwertAlt -= q.brutto;
                engineInput.costBasisAlt -= engineInput.costBasisAlt * anteil;
            }
            if (q.kind === 'aktien_neu') {
                const anteil = engineInput.depotwertNeu > 0 ? q.brutto / engineInput.depotwertNeu : 0;
                engineInput.depotwertNeu -= q.brutto;
                engineInput.costBasisNeu -= engineInput.costBasisNeu * anteil;
            }
            if (q.kind === 'gold') {
                const anteil = engineInput.goldWert > 0 ? q.brutto / engineInput.goldWert : 0;
                engineInput.goldWert -= q.brutto;
                engineInput.goldCost -= engineInput.goldCost * anteil;
            }
        });
        const liqErhöhung = result.ui.action.verwendungen?.liquiditaet || 0;
        const liqGesamt = engineInput.tagesgeld + engineInput.geldmarktEtf;
        const split = liqGesamt > 0 ? engineInput.tagesgeld / liqGesamt : 0.5;
        engineInput.tagesgeld += liqErhöhung * split;
        engineInput.geldmarktEtf += liqErhöhung * (1 - split);
    }

    // Wende Käufe an (nur bei TRANSACTION)
    if (result.ui.action.verwendungen) {
        if (result.ui.action.verwendungen.aktien > 0) {
            engineInput.depotwertNeu += result.ui.action.verwendungen.aktien;
            engineInput.costBasisNeu += result.ui.action.verwendungen.aktien;
        }
        if (result.ui.action.verwendungen.gold > 0) {
            engineInput.goldWert += result.ui.action.verwendungen.gold;
            engineInput.goldCost += result.ui.action.verwendungen.gold;
        }
    }

    // Entnahme
    const jahresEntnahme = result.ui.spending.monatlicheEntnahme * 12;
    const liqGesamt2 = engineInput.tagesgeld + engineInput.geldmarktEtf;
    const split2 = liqGesamt2 > 0 ? engineInput.tagesgeld / liqGesamt2 : 0.5;
    engineInput.tagesgeld -= jahresEntnahme * split2;
    engineInput.geldmarktEtf -= jahresEntnahme * (1 - split2);

    // Verzinsung
    engineInput.tagesgeld *= (1 + rC);
    engineInput.geldmarktEtf *= (1 + rC);

    // Inflationsanpassung des Bedarfs
    const inflFactor = 1 + (yearData.inflation_de || 1.7) / 100;
    engineInput.floorBedarf *= inflFactor;
    engineInput.flexBedarf *= inflFactor;

    return { newState: result.newState, result, engineInput };
}

function compareStates(year, simResult, engineResult) {
    const mismatches = [];
    const tolerance = 0.01; // 1% relativer Fehler

    const simLiq = simResult.newState.portfolio.liquiditaet;
    const engineLiq = engineResult.engineInput.tagesgeld + engineResult.engineInput.geldmarktEtf;
    if (Math.abs(simLiq - engineLiq) / Math.max(simLiq, engineLiq, 1) > tolerance) {
        mismatches.push(`Mismatch @Year ${year}: liquidity -> sim=${simLiq.toFixed(0)}, engine=${engineLiq.toFixed(0)}`);
    }

    const simEquity = simResult.newState.portfolio.depotTranchesAktien.reduce((sum, t) => sum + t.marketValue, 0);
    const engineEquity = engineResult.engineInput.depotwertAlt + engineResult.engineInput.depotwertNeu;
    if (Math.abs(simEquity - engineEquity) / Math.max(simEquity, engineEquity, 1) > tolerance) {
        mismatches.push(`Mismatch @Year ${year}: equity -> sim=${simEquity.toFixed(0)}, engine=${engineEquity.toFixed(0)}`);
    }

    const simGold = simResult.newState.portfolio.depotTranchesGold.reduce((sum, t) => sum + t.marketValue, 0);
    const engineGold = engineResult.engineInput.goldWert;
    if (Math.abs(simGold - engineGold) / Math.max(simGold, engineGold, 1) > tolerance) {
        mismatches.push(`Mismatch @Year ${year}: gold -> sim=${simGold.toFixed(0)}, engine=${engineGold.toFixed(0)}`);
    }

    const simEndeVJ = simResult.newState.marketDataHist.endeVJ;
    const engineEndeVJ = engineResult.engineInput.endeVJ;
    if (Math.abs(simEndeVJ - engineEndeVJ) / Math.max(simEndeVJ, engineEndeVJ, 1) > tolerance) {
        mismatches.push(`Mismatch @Year ${year}: endeVJ -> sim=${simEndeVJ.toFixed(0)}, engine=${engineEndeVJ.toFixed(0)}`);
    }

    return mismatches;
}

function updateEngineInputForNextYear(engineInput, yearData) {
    const rA = isFinite(yearData.rendite) ? yearData.rendite : 0;
    engineInput.endeVJ_3 = engineInput.endeVJ_2;
    engineInput.endeVJ_2 = engineInput.endeVJ_1;
    engineInput.endeVJ_1 = engineInput.endeVJ;
    engineInput.endeVJ = engineInput.endeVJ * (1 + rA);
    engineInput.ath = Math.max(engineInput.ath, engineInput.endeVJ);
    engineInput.jahreSeitAth = engineInput.endeVJ >= engineInput.ath ? 0 : engineInput.jahreSeitAth + 1;
}
