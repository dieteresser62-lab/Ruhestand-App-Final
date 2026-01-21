"use strict";

import { prepareHistoricalData, updateStartPortfolioDisplay } from './simulator-portfolio.js';
import { initTranchenStatus, syncTranchenToInputs } from './depot-tranchen-status.js';
import { initializePflegeUIControls } from './simulator-ui-pflege.js';
import { initRente2ConfigWithLocalStorage } from './simulator-ui-rente.js';
import { initAutoOptimizeUI, setAutoOptimizeDefaults } from './auto_optimize_ui.js';
import { initSweepDefaultsWithLocalStorageFallback } from './simulator-sweep.js';
import { initializeBacktestUI } from './simulator-backtest.js';
import { initInputPersistence } from './simulator-main-input-persist.js';
import { initRentAdjModeUI } from './simulator-main-rent-adjust.js';
import { initAccumulationControls } from './simulator-main-accumulation.js';
import { initSweepUIControls } from './simulator-main-sweep-ui.js';
import { initTabSwitching } from './simulator-main-tabs.js';
import { initResetButton } from './simulator-main-reset.js';
import { initPartnerToggle } from './simulator-main-partner.js';
import { initStressPresetOptions } from './simulator-main-stress.js';
import { initSimulatorProfileSelection } from './simulator-main-profiles.js';
import { initMonteCarloStartYearControls } from './monte-carlo-ui.js';

/**
 * Prüft Engine-Version
 */
export function selfCheckEngine() {
    if (typeof window.EngineAPI === 'undefined' || typeof window.EngineAPI.getVersion !== 'function') {
        const footer = document.getElementById('engine-mismatch-footer');
        if (footer) {
            footer.textContent = `FEHLER: Die Engine-Datei 'engine.js' konnte nicht geladen werden!`;
            footer.style.display = 'block';
        }
        return;
    }

    const version = window.EngineAPI.getVersion();
    void version;
}

export function initializeSimulatorApp() {
    selfCheckEngine();
    prepareHistoricalData();

    updateStartPortfolioDisplay();

    initInputPersistence();
    initializePflegeUIControls();

    const mcMethodeSelect = document.getElementById('mcMethode');
    mcMethodeSelect.addEventListener('change', () => {
        document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block';
    });

    initRentAdjModeUI();

    initPartnerToggle();
    initAccumulationControls();

    // Backtest-spezifische UI-Hooks sind ausgelagert, um die Main-Initialisierung zu entschlacken.
    initializeBacktestUI();

    initStressPresetOptions();
    initMonteCarloStartYearControls();

    document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block';

    initSweepUIControls();
    initTabSwitching();

    // Sweep defaults with localStorage persistence
    initSweepDefaultsWithLocalStorageFallback();

    // Auto-Optimize UI initialization
    setAutoOptimizeDefaults();
    initAutoOptimizeUI();

    // Partner/Rente-2 configuration with localStorage persistence
    initRente2ConfigWithLocalStorage();

    initSimulatorProfileSelection();
    initResetButton();

    // Tranchen automatisch in die Eingabefelder übernehmen (ohne Alert)
    syncTranchenToInputs({ silent: true });
    updateStartPortfolioDisplay();

    // Depot-Tranchen Status Badge
    // Zeigt Status der geladenen detaillierten Tranchen an
    initTranchenStatus('tranchenStatusBadge');
}
