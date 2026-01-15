
import { simulateOneYear } from '../simulator-engine-direct.js';
import { EngineAPI } from '../engine/index.mjs';
import { annualData } from '../simulator-data.js';
import { initializePortfolio, buildInputsCtxFromPortfolio, prepareHistoricalData } from '../simulator-portfolio.js';

// --- MOCKING GLOBAL STATE ---
if (typeof global.window === 'undefined') {
    global.window = {};
}

prepareHistoricalData(); // Fix 1: Ensure data ready

console.log('--- Headless Full Backtest Reproduction (Direct Mode) ---');

const baseInputs = {
    startAlter: 65,
    startVermoegen: 2700000,
    targetEq: 60,
    rebalancingBand: 10,
    renteAktiv: false,
    startFloorBedarf: 24000,
    startFlexBedarf: 12000,
    zielLiquiditaet: 250000,
    goldAktiv: true,
    goldZielProzent: 10,
    depotwertAlt: 0,
    depotwertNeu: 0,
    costBasisAlt: 0,
    costBasisNeu: 0,
    startSPB: 1000,
    kirchensteuerSatz: 0,
    runwayTargetMonths: 36,
    minRunwayMonths: 24,
    risikoprofil: 'sicherheits-dynamisch',
    rebalBand: 5,
    goldSteuerfrei: true,
    goldFloorProzent: 0
};

// Initialize State
let initialInput = { ...baseInputs };
let initialPortfolio = initializePortfolio(initialInput);

// Initial Current State (Full)
let currentState = {
    portfolio: initialPortfolio,
    marketDataHist: {
        ath: 2700000,
        endeVJ: 2700000,
        jahreSeitAth: 0,
        capeRatio: 20
    },
    baseFloor: initialInput.startFloorBedarf,
    baseFlex: initialInput.startFlexBedarf,
    currentAnnualPension: 12000,
    currentAnnualPension2: 0,
    lastState: {}, // Spending Planner state
    widowPensionP1: 0,
    widowPensionP2: 0
};

console.log(`Starting Simulation. Initial Liq: ${currentState.portfolio.liquiditaet}`);

(async () => {
    for (let year = 2000; year <= 2024; year++) {
        const marketData = annualData.find(d => d.jahr === year);
        if (!marketData) {
            console.warn(`Keine Marktdaten für ${year}, Stop.`);
            break;
        }

        try {
            // We use currentState.portfolio for inputs calc
            const inputsCtx = buildInputsCtxFromPortfolio(initialInput, currentState.portfolio, {
                pensionAnnual: currentState.currentAnnualPension,
                marketData
            });

            // Call Direct simulateOneYear
            const fullResult = simulateOneYear(
                currentState, // Pass FULL state
                inputsCtx,
                marketData,
                year - 2000,
                null,
                0,
                null,
                1.0,
                EngineAPI
            );

            // Update State
            if (!fullResult || !fullResult.portfolio) {
                console.error(`❌ fullResult invalid in Year ${year}:`, fullResult);
                throw new Error("Simulation returned invalid result");
            }

            // Persist State for next year
            if (fullResult.newState) {
                currentState = fullResult.newState;
            } else {
                // Fallback (should not happen with fixed engine)
                currentState.portfolio = fullResult.portfolio;
            }

            console.log(`✅ Year ${year} done. Liq: ${currentState.portfolio.liquiditaet.toFixed(0)}€, Stocks Buy: ${(fullResult.ui.action.details?.kaufAkt || 0)}`);


            if (currentState.portfolio.liquiditaet < 0) {
                console.error(`❌ NEGATIVE LIQUIDITY in Year ${year}!`);
            }

        } catch (e) {
            console.error(`❌ CRASH in Year ${year}:`, e);
            process.exit(1);
        }
    }
    console.log('✅ Simulation completed successfully.');
})();
