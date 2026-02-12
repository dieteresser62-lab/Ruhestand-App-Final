/**
 * Module: Balance Binder Annual
 * Purpose: specific binder module for Annual Update workflows.
 *          It groups functionality for Inflation, Market Data updates, and the Annual Update Modal.
 * Usage: Used by balance-binder.js to organize annual update logic.
 * Dependencies: balance-annual-inflation.js, balance-annual-marketdata.js, balance-annual-modal.js, balance-annual-orchestrator.js
 */
import { createInflationHandlers } from './balance-annual-inflation.js';
import { createMarketdataHandlers } from './balance-annual-marketdata.js';
import { createAnnualModalHandlers } from './balance-annual-modal.js';
import { createAnnualOrchestrator } from './balance-annual-orchestrator.js';

export function createAnnualHandlers({
    dom,
    appState,
    update,
    debouncedUpdate,
    getLastUpdateResults,
    setLastUpdateResults
}) {
    const inflation = createInflationHandlers({ dom, update, debouncedUpdate });
    const marketdata = createMarketdataHandlers({
        dom,
        appState,
        debouncedUpdate,
        applyAnnualInflation: inflation.applyAnnualInflation
    });
    const modal = createAnnualModalHandlers({ getLastUpdateResults });
    const orchestrator = createAnnualOrchestrator({
        dom,
        debouncedUpdate,
        handleFetchInflation: inflation.handleFetchInflation,
        handleNachrueckenMitETF: marketdata.handleNachrueckenMitETF,
        handleFetchCapeAuto: marketdata.handleFetchCapeAuto,
        showUpdateResultModal: modal.showUpdateResultModal,
        setLastUpdateResults
    });

    return {
        applyInflationToBedarfe: inflation.applyInflationToBedarfe,
        applyAnnualInflation: inflation.applyAnnualInflation,
        handleNachruecken: marketdata.handleNachruecken,
        handleUndoNachruecken: marketdata.handleUndoNachruecken,
        handleFetchInflation: inflation.handleFetchInflation,
        handleJahresUpdate: orchestrator.handleJahresUpdate,
        showUpdateResultModal: modal.showUpdateResultModal,
        handleShowUpdateLog: modal.handleShowUpdateLog,
        handleNachrueckenMitETF: marketdata.handleNachrueckenMitETF,
        handleFetchCapeAuto: marketdata.handleFetchCapeAuto
    };
}
