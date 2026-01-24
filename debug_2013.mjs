
import { simulateOneYear } from './simulator-engine-wrapper.js';
import { initializePortfolio } from './simulator-portfolio.js';

// Mock EngineAPI
import { CONFIG } from './engine/config.mjs';
import { MarketAnalyzer } from './engine/analyzers/MarketAnalyzer.mjs';
import { SpendingPlanner } from './engine/planners/SpendingPlanner.mjs';
import { TransactionEngine } from './engine/transactions/TransactionEngine.mjs';
import { InputValidator } from './engine/validators/InputValidator.mjs';
import { _internal_calculateModel } from './engine/core.mjs';

// Mock Window EngineAPI
global.EngineAPI = {
    simulateSingleYear: (input, lastState) => {
        return _internal_calculateModel(input, lastState);
    }
};

const inputs = {
    startAlter: 60,
    startVermoegen: 2700000,
    depotwertAlt: 551000, // From 2012 end
    einstandAlt: 300000,
    depotwertNeu: 0,
    tagesgeld: 9000, // From 2012 end
    geldmarktEtf: 0,
    floorBedarf: 100000, // Approx
    flexBedarf: 50000,
    renteAktiv: true,
    renteMonatlich: 1000,
    targetEq: 60,
    rebalancingBand: 35,
    goldAktiv: false
};

const portfolio = {
    depotTranchesAktien: [{
        marketValue: 551000,
        costBasis: 300000,
        type: 'aktien_alt',
        tqf: 0.30
    }],
    depotTranchesGold: [],
    depotTranchesGeldmarkt: [],
    liquiditaet: 9000,
    tagesgeld: 9000
};

const currentState = {
    portfolio: portfolio,
    baseFloor: 120000,
    baseFlex: 80000,
    lastState: null,
    currentAnnualPension: 12000,
    marketDataHist: {
        endeVJ: 100,
        endeVJ_1: 100,
        endeVJ_2: 100,
        endeVJ_3: 100,
        ath: 100,
        jahreSeitAth: 0,
        capeRatio: 20
    }
};

const yearData = {
    jahr: 2013,
    rendite: 0.236, // 23.6%
    gold_eur_perf: -10,
    zinssatz: 1.0,
    inflation: 2.0,
    msci_eur: 123.6
};

console.log('--- START SIMULATION ---');
console.log('Portfolio Start Stocks:', portfolio.depotTranchesAktien[0].marketValue);

const result = simulateOneYear(currentState, inputs, yearData, 13, null, 0, null, 1.0, global.EngineAPI);

console.log('--- END SIMULATION ---');
console.log('Logs:', result.logData.aktionUndGrund);
console.log('Net Sales (Handl.A):', (result.logData.vk?.vkAkt || 0) - (result.logData.kaufAkt || 0));
console.log('Stocks Final (Log):', result.logData.wertAktien);
console.log('Stocks In Portfolio Object:', result.newState.portfolio.depotTranchesAktien[0].marketValue);

if (result.newState.portfolio.depotTranchesAktien[0].marketValue > 10000) {
    console.log('FAIL: Stocks were not reduced!');
} else {
    console.log('SUCCESS: Stocks were reduced.');
}
