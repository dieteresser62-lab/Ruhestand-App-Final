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
     * Liefert die Indizes der Zufallsstichprobe als Array.
     * @returns {number[]} Indizes fuer detaillierte Logs.
     */
    getRandomSampleIndices() {
        return Array.from(this.randomSampleIndices);
    }

    /**
     * Liefert die Indizes der charakteristischen Szenarien (Worst, Perzentile, Care, Risiko).
     * @returns {number[]} Indizes, fuer die Logs nachgezogen werden sollen.
     */
    getCharacteristicIndices() {
        if (!this.meta.length) return [];
        // Hauptsortierung: Endvermögen (schlechteste bis beste Runs).
        const sortedByWealth = [...this.meta].sort((a, b) => a.endVermoegen - b.endVermoegen);
        const percentileIndex = (arr, p) => Math.min(Math.floor(arr.length * p), arr.length - 1);

        const indices = new Set();
        // Perzentil-Stützstellen für repräsentative Szenarien.
        const percentilePicks = [
            0,
            percentileIndex(sortedByWealth, 0.05),
            percentileIndex(sortedByWealth, 0.10),
            percentileIndex(sortedByWealth, 0.25),
            percentileIndex(sortedByWealth, 0.50),
            percentileIndex(sortedByWealth, 0.75),
            percentileIndex(sortedByWealth, 0.90),
            percentileIndex(sortedByWealth, 0.95),
            sortedByWealth.length - 1
        ];
        for (const idx of percentilePicks) {
            const meta = sortedByWealth[idx];
            if (meta) indices.add(meta.index);
        }

        // Pflege-Szenarien separat betrachten, da sie eine eigene Risiko-Dimension abbilden.
        const careScenarios = this.meta.filter(s => s.careEverActive);
        if (careScenarios.length > 0) {
            const worstWithCare = careScenarios.reduce((a, b) => a.endVermoegen < b.endVermoegen ? a : b);
            const longestCare = careScenarios.reduce((a, b) => a.totalCareYears > b.totalCareYears ? a : b);
            const highestCareCost = careScenarios.reduce((a, b) => a.totalCareCosts > b.totalCareCosts ? a : b);
            const earliestCare = careScenarios.filter(s => s.triggeredAge !== null)
                .reduce((a, b) => (a.triggeredAge < b.triggeredAge ? a : b), careScenarios[0]);
            indices.add(worstWithCare.index);
            indices.add(longestCare.index);
            indices.add(highestCareCost.index);
            if (earliestCare) indices.add(earliestCare.index);
        }

        // Extremfälle als "Stress-Szenarien".
        const longestLife = this.meta.reduce((a, b) => a.lebensdauer > b.lebensdauer ? a : b);
        const maxCut = this.meta.reduce((a, b) => a.maxKuerzung > b.maxKuerzung ? a : b);
        if (longestLife) indices.add(longestLife.index);
        if (maxCut) indices.add(maxCut.index);

        return Array.from(indices);
    }

    /**
     * Aktualisiert Log-Daten fuer bestimmte Runs.
     * @param {Map<number, Array>} logsByIndex - Map von Run-Index zu Log-Zeilen.
     */
    updateRunLogs(logsByIndex) {
        if (!logsByIndex || typeof logsByIndex.get !== 'function') return;
        for (const meta of this.meta) {
            if (logsByIndex.has(meta.index)) {
                meta.logDataRows = logsByIndex.get(meta.index);
            }
        }
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

export function extractKeyMetrics(meta = {}) {
    return {
        endVermoegen: Number.isFinite(meta.endVermoegen) ? meta.endVermoegen : 0,
        failed: !!meta.failed,
        lebensdauer: Number.isFinite(meta.lebensdauer) ? meta.lebensdauer : 0,
        careEverActive: !!meta.careEverActive,
        totalCareYears: Number.isFinite(meta.totalCareYears) ? meta.totalCareYears : 0,
        totalCareCosts: Number.isFinite(meta.totalCareCosts) ? meta.totalCareCosts : 0,
        maxKuerzung: Number.isFinite(meta.maxKuerzung) ? meta.maxKuerzung : 0,
        triggeredAge: Number.isFinite(meta.triggeredAge) ? meta.triggeredAge : null,
        isWidow: !!(meta.isWidow || meta.widowTriggered),
        isCrash: !!(meta.isCrash || meta.crashTriggered)
    };
}

export function analyzeScenario(meta = {}) {
    const metrics = extractKeyMetrics(meta);
    const tags = [];
    if (metrics.careEverActive) tags.push('care');
    if (metrics.totalCareCosts > 0) tags.push('care_costs');
    if (metrics.failed) tags.push('failed');
    if (metrics.triggeredAge !== null && metrics.triggeredAge <= 70) tags.push('early_care');
    if (metrics.maxKuerzung >= 50) tags.push('severe_cut');
    if (metrics.isWidow || meta.logDataRows?.some(row => row?.widow === true || row?.witwe === true)) tags.push('widow');
    if (metrics.isCrash || meta.logDataRows?.some(row => row?.crash === true || String(row?.action || '').includes('Notfall'))) tags.push('crash');
    return { ...metrics, tags };
}

export function compareScenarios(a = {}, b = {}) {
    const ma = extractKeyMetrics(a);
    const mb = extractKeyMetrics(b);
    const scoreA = ma.failed ? -1e15 : ma.endVermoegen;
    const scoreB = mb.failed ? -1e15 : mb.endVermoegen;
    if (scoreA === scoreB) return 0;
    return scoreA > scoreB ? 1 : -1;
}
