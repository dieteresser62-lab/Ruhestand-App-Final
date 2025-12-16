
import { simulateOneYear } from '../simulator-engine.js';
import { EngineAPI, Ruhestandsmodell_v30 } from '../engine/index.mjs';

// --- MOCKING GLOBAL STATE ---
if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.Ruhestandsmodell_v30 = Ruhestandsmodell_v30;
global.window.EngineAPI = EngineAPI;

console.log('--- Parity Test: Simulator vs EngineAPI ---');

const inputs = {
    startAlter: 65,
    rentAdjPct: 0,
    accumulationPhase: { enabled: false },
    zielLiquiditaet: 20000,
    startFloorBedarf: 24000,
    startFlexBedarf: 10000,
    goldAktiv: false,
    partner: { aktiv: false },
    targetEq: 90,
    startSPB: 1000,
    marketCapeRatio: 20,
    risikoprofil: 'sicherheits-dynamisch',
    kirchensteuerSatz: 0,
    rebalBand: 20,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    entnahmeIntervall: 'monatlich',
    steuerfreibetrag: 1000,
    kvSatz: 0,
    pvSatz: 0
};

const state = {
    portfolio: {
        depotTranchesAktien: [{ marketValue: 500000, costBasis: 400000, type: 'aktien_alt' }],
        depotTranchesGold: [],
        liquiditaet: 20000
    },
    baseFloor: 24000,
    baseFlex: 10000,
    currentAnnualPension: 20000,
    widowPensionP1: 0,
    widowPensionP2: 0,
    marketDataHist: {
        endeVJ: 100, endeVJ_1: 90, endeVJ_2: 80, ath: 100, jahreSeitAth: 0, capeRatio: 20
    }
};

const yearData = { jahr: 2025, rendite: 0.05, inflation: 1.02, zinssatz: 0.01, gold_eur_perf: 0, regime: 'growth' };

try {
    // 1. Run Simulator (The "Reference")
    const stateSim = JSON.parse(JSON.stringify(state));
    const resultSim = simulateOneYear(stateSim, inputs, yearData, 0);

    // 2. Run EngineAPI (The "Target")
    const engineInput = {
        ...inputs,
        // Portfolio flattened for Engine
        tagesgeld: state.portfolio.liquiditaet,
        geldmarktEtf: 0,
        depotwertAlt: state.portfolio.depotTranchesAktien[0].marketValue,
        costBasisAlt: state.portfolio.depotTranchesAktien[0].costBasis,
        tqfAlt: 0.30,
        depotwertNeu: 0,
        costBasisNeu: 0,
        tqfNeu: 0.30,
        goldWert: 0,
        goldCost: 0,
        goldSteuerfrei: false,
        sparerPauschbetrag: inputs.startSPB,

        // Pension & Market
        pensionAnnual: state.currentAnnualPension,
        marketData: yearData,

        // History for Regime Detection
        endeVJ: state.marketDataHist.endeVJ,
        endeVJ_1: state.marketDataHist.endeVJ_1,
        endeVJ_2: state.marketDataHist.endeVJ_2,
        ath: state.marketDataHist.ath,
        jahreSeitAth: state.marketDataHist.jahreSeitAth,

        // Config flags
        renteAktiv: true,
        renteMonatlich: state.currentAnnualPension / 12,
        anlagesumme: 500000 + 20000,

        // Correct Input Names for Engine Core
        floorBedarf: inputs.startFloorBedarf,
        flexBedarf: inputs.startFlexBedarf
    };

    // State for Engine
    const engineState = {
        baseFloor: state.baseFloor,
        baseFlex: state.baseFlex,
        cumulativeInflationFactor: 1.0,
        lastTotalBudget: state.baseFloor + state.baseFlex,
        transactionDiagnostics: {},
        alarmActive: false
    };

    const resultEngine = EngineAPI.simulateSingleYear(engineInput, engineState);

    if (resultEngine.error) {
        console.error('EngineAPI Error:', resultEngine.error);
        throw resultEngine.error;
    }

    // 3. Compare Results
    const simSpending = resultSim.logData?.entscheidung?.monatlicheEntnahme;
    const engSpending = resultEngine.ui?.spending?.monatlicheEntnahme;

    console.log(`Spending Sim: ${simSpending?.toFixed(2)}`);
    console.log(`Spending Eng: ${engSpending?.toFixed(2)}`);

    // Validate Regime Detection Match
    const simRegime = resultSim.logData?.Regime; // e.g. "peak_hot"
    const engRegime = resultEngine.diagnosis?.general?.marketSKey;

    if (simRegime !== engRegime) {
        console.warn(`Regime Mismatch: Sim=${simRegime}, Eng=${engRegime}`);
    }

    assertClose(simSpending, engSpending, 0.01, 'Spending should match exactly');

    console.log('✅ Parity Confirmed: Simulator and Engine produce identical spending for same inputs.');

} catch (e) {
    console.error('Parity Test Failed', e);
    throw e;
}
