"use strict";

import { getCommonInputs, prepareHistoricalData } from './simulator-portfolio.js';
import { displayMonteCarloResults } from './simulator-results.js';
import { normalizeWidowOptions } from './simulator-sweep-utils.js';
import { readMonteCarloParameters, createMonteCarloUI } from './monte-carlo-ui.js';
import { ScenarioAnalyzer } from './scenario-analyzer.js';
import { runMonteCarloSimulation } from './monte-carlo-runner.js';

/**
 * Koordiniert die Monte-Carlo-Simulation (UI-Orchestrator)
 *
 * Diese Funktion ist der zentrale Einstiegspunkt für Monte-Carlo-Simulationen.
 * Sie orchestriert:
 * - UI-Vorbereitung (Fortschrittsbalken, Button-States)
 * - Eingabedaten-Sammlung (Portfolio, Renten, Pflege, MC-Parameter)
 * - Aufruf der DOM-freien Simulation (monte-carlo-runner.js)
 * - Szenario-Analyse und Auswahl charakteristischer Runs
 * - Ergebnis-Darstellung (Perzentile, KPIs, Worst-Run, Pflegefall-Statistik)
 *
 * Die eigentliche Simulationslogik ist DOM-frei; UI-spezifische Aufgaben
 * (Fortschrittsanzeige, Benutzereingaben, Ergebnisdarstellung) werden hier gebündelt.
 *
 * @async
 * @returns {Promise<void>} Promise, das nach Abschluss der Simulation aufgelöst wird
 * @throws {Error} Bei Validierungs- oder Berechnungsfehlern
 */
export async function runMonteCarlo() {
    const ui = createMonteCarloUI();
    ui.disableStart();
    ui.hideError(); // Reset error state

    try {
        prepareHistoricalData();
        const inputs = getCommonInputs();
        const widowOptions = normalizeWidowOptions(inputs.widowOptions);
        const { anzahl, maxDauer, blockSize, seed, methode } = readMonteCarloParameters();

        ui.showProgress();
        ui.updateProgress(0);

        const scenarioAnalyzer = new ScenarioAnalyzer(anzahl);
        const { aggregatedResults, failCount, worstRun, worstRunCare, pflegeTriggeredCount } = await runMonteCarloSimulation({
            inputs,
            widowOptions,
            monteCarloParams: { anzahl, maxDauer, blockSize, seed, methode },
            useCapeSampling: ui.readUseCapeSampling(),
            onProgress: pct => ui.updateProgress(pct),
            scenarioAnalyzer,
            engine: window.Ruhestandsmodell_v30
        });

        const scenarioLogs = scenarioAnalyzer.buildScenarioLogs();
        displayMonteCarloResults(aggregatedResults, anzahl, failCount, worstRun, {}, {}, pflegeTriggeredCount, inputs, worstRunCare, scenarioLogs);
    } catch (e) {
        console.error("Monte-Carlo Simulation Failed:", e);
        ui.showError(e);
    } finally {
        await ui.finishProgress();
        ui.enableStart();
    }
}
