"use strict";

import { getCommonInputs, prepareHistoricalData } from './simulator-portfolio.js';
import { displayMonteCarloResults } from './simulator-results.js';
import { normalizeWidowOptions } from './simulator-sweep-utils.js';
import { readMonteCarloParameters, createMonteCarloUI } from './monte-carlo-ui.js';
import { ScenarioAnalyzer } from './scenario-analyzer.js';
import { runMonteCarloSimulation } from './monte-carlo-runner.js';

/**
 * Koordiniert die Monte-Carlo-Simulation, indem UI, Runner und Analyzer zusammengeführt werden.
 * Die Simulation selbst ist DOM-frei; UI-spezifische Aufgaben werden hier gebündelt.
 * @returns {Promise<void>} Promise, das nach Abschluss der Simulation aufgelöst wird.
 */
export async function runMonteCarlo() {
    const ui = createMonteCarloUI();
    ui.disableStart();

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
            scenarioAnalyzer
        });

        const scenarioLogs = scenarioAnalyzer.buildScenarioLogs();
        displayMonteCarloResults(aggregatedResults, anzahl, failCount, worstRun, {}, {}, pflegeTriggeredCount, inputs, worstRunCare, scenarioLogs);
    } catch (e) {
        alert("Fehler in der Monte-Carlo-Simulation:\n\n" + e.message + "\n" + e.stack); console.error(e);
    } finally {
        await ui.finishProgress();
        ui.enableStart();
    }
}
