"use strict";

/**
 * Verantwortlich für Tracking, Auswahl und Aufbereitung charakteristischer Szenarien.
 * Die Simulation kann Meta-Daten pro Run registrieren, ohne selbst UI-Logik zu kennen.
 */
export class ScenarioAnalyzer {
    /**
     * @param {number} totalRuns - Anzahl der geplanten Simulationen (für Sampling-Strategien).
     */
    constructor(totalRuns) {
        this.totalRuns = totalRuns;
        this.meta = [];
        this.randomSampleIndices = this.buildRandomSampleIndices(totalRuns);
    }

    /**
     * Berechnet gleichmäßig verteilte Sample-Indizes für Zufallsszenarien.
     * @param {number} totalRuns - Anzahl Simulationen.
     * @returns {Set<number>} Menge an Indizes, die detailliert geloggt werden sollen.
     */
    buildRandomSampleIndices(totalRuns) {
        const indices = new Set();
        const sampleStep = Math.max(1, Math.floor(totalRuns / 15));
        for (let s = 0; s < 15 && s * sampleStep < totalRuns; s++) {
            indices.add(s * sampleStep + Math.floor(sampleStep / 2));
        }
        return indices;
    }

    /**
     * Prüft, ob für einen Run ein Detail-Log gespeichert werden soll.
     * @param {number} index - Aktueller Run-Index.
     * @returns {boolean} True, wenn der Run als Zufallsprobe festgelegt ist.
     */
    shouldCaptureRandomSample(index) {
        return this.randomSampleIndices.has(index);
    }

    /**
     * Registriert die Meta-Daten eines Runs für spätere Auswertung.
     * @param {object} meta - Zusammenfassung eines Runs inklusive Log-Daten.
     */
    addRun(meta) {
        this.meta.push(meta);
    }

    /**
     * Erzeugt strukturierte Szenario-Logs basierend auf den gesammelten Meta-Daten.
     * @returns {{ characteristic: Array, random: Array }} Aggregierte Szenario-Logs.
     */
    buildScenarioLogs() {
        if (this.meta.length === 0) {
            return { characteristic: [], random: [] };
        }

        const sortedByWealth = [...this.meta].sort((a, b) => a.endVermoegen - b.endVermoegen);
        const percentileIndex = (arr, p) => Math.min(Math.floor(arr.length * p), arr.length - 1);

        const wealthPercentiles = [
            { key: 'worst', label: 'Worst Case', scenario: sortedByWealth[0] },
            { key: 'p5', label: 'P5', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.05)] },
            { key: 'p10', label: 'P10', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.10)] },
            { key: 'p25', label: 'P25', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.25)] },
            { key: 'p50', label: 'Median', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.50)] },
            { key: 'p75', label: 'P75', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.75)] },
            { key: 'p90', label: 'P90', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.90)] },
            { key: 'p95', label: 'P95', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.95)] },
            { key: 'best', label: 'Best Case', scenario: sortedByWealth[sortedByWealth.length - 1] }
        ];

        const careScenarios = this.meta.filter(s => s.careEverActive);
        const careSpecific = [];
        if (careScenarios.length > 0) {
            const worstWithCare = careScenarios.reduce((a, b) => a.endVermoegen < b.endVermoegen ? a : b);
            careSpecific.push({ key: 'worstCare', label: 'Worst MIT Pflege', scenario: worstWithCare });

            const longestCare = careScenarios.reduce((a, b) => a.totalCareYears > b.totalCareYears ? a : b);
            careSpecific.push({ key: 'longestCare', label: 'Längste Pflegedauer', scenario: longestCare });

            const highestCareCost = careScenarios.reduce((a, b) => a.totalCareCosts > b.totalCareCosts ? a : b);
            careSpecific.push({ key: 'highestCareCost', label: 'Höchste Pflegekosten', scenario: highestCareCost });

            const earliestCare = careScenarios.filter(s => s.triggeredAge !== null)
                .reduce((a, b) => (a.triggeredAge < b.triggeredAge ? a : b), careScenarios[0]);
            careSpecific.push({ key: 'earliestCare', label: 'Frühester Pflegeeintritt', scenario: earliestCare });
        }

        const longestLife = this.meta.reduce((a, b) => a.lebensdauer > b.lebensdauer ? a : b);
        const maxCut = this.meta.reduce((a, b) => a.maxKuerzung > b.maxKuerzung ? a : b);
        const riskScenarios = [
            { key: 'longestLife', label: 'Längste Lebensdauer', scenario: longestLife },
            { key: 'maxCut', label: 'Maximale Kürzung', scenario: maxCut }
        ];

        const randomScenarios = this.meta
            .filter(s => s.isRandomSample)
            .map((s) => ({
                key: `random_${s.index}`,
                label: `Zufällig #${s.index + 1}`,
                scenario: s
            }));

        const characteristicScenarios = [...wealthPercentiles, ...careSpecific, ...riskScenarios];

        return {
            characteristic: characteristicScenarios.map(s => ({
                key: s.key,
                label: s.label,
                endVermoegen: s.scenario.endVermoegen,
                failed: s.scenario.failed,
                lebensdauer: s.scenario.lebensdauer,
                careEverActive: s.scenario.careEverActive,
                totalCareYears: s.scenario.totalCareYears,
                logDataRows: s.scenario.logDataRows
            })),
            random: randomScenarios.map(s => ({
                key: s.key,
                label: s.label,
                endVermoegen: s.scenario.endVermoegen,
                failed: s.scenario.failed,
                lebensdauer: s.scenario.lebensdauer,
                careEverActive: s.scenario.careEverActive,
                totalCareYears: s.scenario.totalCareYears,
                logDataRows: s.scenario.logDataRows
            }))
        };
    }
}
