"use strict";

/**
 * ============================================================================
 * SIMULATOR-SWEEP.JS - Parameter Sweep Logik
 * ============================================================================
 *
 * Dieses Modul enthält die Parameter-Sweep-Funktionalität für die Monte-Carlo-
 * Simulation. Es ermöglicht das systematische Durchsuchen von Parameterräumen.
 *
 * Exportierte Funktionen:
 * - runParameterSweep() - Haupt-Sweep-Funktion
 * - displaySweepResults() - Heatmap-Darstellung
 * - initSweepDefaultsWithLocalStorageFallback() - UI-Initialisierung
 * - runSweepSelfTest() - Developer-Tests
 *
 * Helper-Funktionen (intern):
 * - deepClone() - Deep-Copy für Sweep-Parameter
 * - setNested() - Verschachtelte Pfade setzen
 * - isBlockedKey() - Blockliste-Prüfung
 * - extractP2Invariants() - P2-Basis-Parameter extrahieren
 * - areP2InvariantsEqual() - P2-Invarianten vergleichen
 * ============================================================================
 */

import { rng, parseRangeInput, cartesianProductLimited } from './simulator-utils.js';
import { BREAK_ON_RUIN, MORTALITY_TABLE, annualData } from './simulator-data.js';
import {
    getCommonInputs, prepareHistoricalData, buildStressContext, applyStressOverride, computeRentAdjRate
} from './simulator-portfolio.js';
import {
    simulateOneYear,
    initMcRunState,
    makeDefaultCareMeta,
    sampleNextYearData,
    computeRunStatsFromSeries,
    updateCareMeta,
    calcCareCost,
    computeCareMortalityMultiplier
} from './simulator-engine.js';
import {
    portfolioTotal,
    aggregateSweepMetrics
} from './simulator-results.js';
import { renderSweepHeatmapSVG } from './simulator-heatmap.js';

/**
 * Schnelles strukturiertes Cloning für Stress-Context
 */
function cloneStressContext(ctx) {
    if (!ctx) return null;
    return {
        type: ctx.type,
        remainingYears: ctx.remainingYears,
        pickableIndices: ctx.pickableIndices,
        preset: ctx.preset
    };
}

/**
 * Robuste Deep-Clone-Funktion für Sweep-Parameter
 * @param {Object} obj - Das zu klonende Objekt
 * @returns {Object} Tiefe, unabhängige Kopie des Objekts
 */
export function deepClone(obj) {
    if (typeof structuredClone === 'function') {
        return structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Setzt verschachtelten Pfad in Objekt
 * @param {object} obj - Zielobjekt
 * @param {string} path - Pfad (z.B. "a.b.c")
 * @param {any} value - Wert zum Setzen
 */
export function setNested(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    current[parts[parts.length - 1]] = value;
}

/**
 * Whitelist für erlaubte Sweep-Parameter
 */
const SWEEP_ALLOWED_KEYS = new Set([
    'runwayMinMonths', 'runwayTargetMonths',
    'targetEq', 'rebalBand',
    'maxSkimPctOfEq', 'maxBearRefillPctOfEq',
    'goldZielProzent', 'goldFloorProzent', 'goldAktiv',
    'rentAdjMode', 'rentAdjPct',
    'startFloorBedarf', 'startFlexBedarf',
]);

/**
 * Blockliste: Regex-Patterns für Person-2-Felder
 */
const SWEEP_BLOCK_PATTERNS = [
    /^partner(\.|$)/i,
    /^r2[A-Z_]/,
    /^p2[A-Z_]/,
];

/**
 * Prüft, ob ein Key auf der Blockliste steht
 */
function isBlockedKey(key) {
    return SWEEP_BLOCK_PATTERNS.some(rx => rx.test(key));
}

/**
 * Extrahiert Basis-Parameter von Person 2 für Invarianz-Prüfung
 */
export function extractP2Invariants(inputs) {
    if (!inputs || !inputs.partner) {
        return {
            aktiv: false,
            brutto: 0,
            startAlter: 0,
            startInJahren: 0,
            steuerquotePct: 0,
            rentAdjPct: 0
        };
    }

    return {
        aktiv: !!inputs.partner.aktiv,
        brutto: Number(inputs.partner.brutto) || 0,
        startAlter: Number(inputs.partner.startAlter) || 0,
        startInJahren: Number(inputs.partner.startInJahren) || 0,
        steuerquotePct: Number(inputs.partner.steuerquotePct) || 0,
        rentAdjPct: Number(inputs.rentAdjPct) || 0
    };
}

/**
 * Prüft, ob zwei P2-Invarianten-Objekte identisch sind
 */
export function areP2InvariantsEqual(inv1, inv2) {
    if (!inv1 || !inv2) return false;
    return JSON.stringify(inv1) === JSON.stringify(inv2);
}

/**
 * Initialisiert Sweep-Defaults mit localStorage-Fallback
 */
export function initSweepDefaultsWithLocalStorageFallback() {
    const map = [
        ["sweepRunwayMin", "sim.sweep.runwayMin"],
        ["sweepRunwayTarget", "sim.sweep.runwayTarget"],
        ["sweepTargetEq", "sim.sweep.targetEq"],
        ["sweepRebalBand", "sim.sweep.rebalBand"],
        ["sweepMaxSkimPct", "sim.sweep.maxSkimPct"],
        ["sweepMaxBearRefillPct", "sim.sweep.maxBearRefillPct"],
        ["sweepGoldTargetPct", "sim.sweep.goldTarget"]
    ];

    for (const [id, key] of map) {
        const el = document.getElementById(id);
        if (!el) continue;

        const saved = localStorage.getItem(key);
        if (saved !== null && saved !== undefined && saved !== '') {
            el.value = saved;
        }

        el.addEventListener("change", () => localStorage.setItem(key, el.value));
        el.addEventListener("input", () => localStorage.setItem(key, el.value));
    }
}

/**
 * Führt einen Parameter-Sweep durch
 */
export async function runParameterSweep() {
    const sweepButton = document.getElementById('sweepButton');
    sweepButton.disabled = true;
    const progressBarContainer = document.getElementById('sweep-progress-bar-container');
    const progressBar = document.getElementById('sweep-progress-bar');

    try {
        prepareHistoricalData();

        const rangeInputs = {
            runwayMin: document.getElementById('sweepRunwayMin').value,
            runwayTarget: document.getElementById('sweepRunwayTarget').value,
            targetEq: document.getElementById('sweepTargetEq').value,
            rebalBand: document.getElementById('sweepRebalBand').value,
            maxSkimPct: document.getElementById('sweepMaxSkimPct').value,
            maxBearRefillPct: document.getElementById('sweepMaxBearRefillPct').value,
            goldTargetPct: document.getElementById('sweepGoldTargetPct').value
        };

        const paramLabels = {
            runwayMin: 'Runway Min',
            runwayTarget: 'Runway Target',
            targetEq: 'Target Eq',
            rebalBand: 'Rebal Band',
            maxSkimPct: 'Max Skim %',
            maxBearRefillPct: 'Max Bear Refill %',
            goldTargetPct: 'Gold Target %'
        };

        const paramRanges = {};
        try {
            for (const [key, rangeStr] of Object.entries(rangeInputs)) {
                const values = parseRangeInput(rangeStr);
                if (values.length === 0) {
                    alert(`Leeres Range-Input für ${paramLabels[key] || key}.\n\nBitte geben Sie einen Wert ein:\n- Einzelwert: 24\n- Liste: 24,36,48\n- Range: 24:12:48`);
                    return;
                }
                paramRanges[key] = values;
            }
        } catch (error) {
            alert(`Fehler beim Parsen der Range-Eingaben:\n\n${error.message}\n\nErlaubte Formate:\n- Einzelwert: 24\n- Kommaliste: 50,60,70\n- Range: start:step:end (z.B. 18:6:36)`);
            return;
        }

        const arrays = Object.values(paramRanges);
        const { combos, tooMany, size } = cartesianProductLimited(arrays, 300);

        if (tooMany) {
            alert(`Zu viele Kombinationen: ${size} (theoretisch)\n\nMaximum: 300\n\nBitte reduzieren Sie die Anzahl der Parameter-Werte.`);
            return;
        }

        if (combos.length === 0) {
            alert('Keine Parameter-Kombinationen gefunden.');
            return;
        }

        const paramKeys = Object.keys(paramRanges);
        const paramCombinations = combos.map(combo => {
            const obj = {};
            paramKeys.forEach((key, i) => {
                obj[key] = combo[i];
            });
            return obj;
        });

        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        const baseInputs = deepClone(getCommonInputs());
        const anzahlRuns = parseInt(document.getElementById('mcAnzahl').value) || 100;
        const maxDauer = parseInt(document.getElementById('mcDauer').value) || 35;
        const blockSize = parseInt(document.getElementById('mcBlockSize').value) || 5;
        const baseSeed = parseInt(document.getElementById('mcSeed').value) || 12345;
        const methode = document.getElementById('mcMethode').value;

        const sweepResults = [];
        let REF_P2_INVARIANTS = null;

        for (let comboIdx = 0; comboIdx < paramCombinations.length; comboIdx++) {
            const params = paramCombinations[comboIdx];
            const inputs = deepClone(baseInputs);

            const caseOverrides = {
                runwayMinMonths: params.runwayMin,
                runwayTargetMonths: params.runwayTarget,
                targetEq: params.targetEq,
                rebalBand: params.rebalBand,
                maxSkimPctOfEq: params.maxSkimPct,
                maxBearRefillPctOfEq: params.maxBearRefillPct
            };

            if (params.goldTargetPct !== undefined) {
                caseOverrides.goldZielProzent = params.goldTargetPct;
                caseOverrides.goldAktiv = params.goldTargetPct > 0;
            }

            for (const [k, v] of Object.entries(caseOverrides)) {
                if (isBlockedKey(k)) {
                    console.warn(`[SWEEP] Ignoriere Person-2-Key im Sweep: ${k}`);
                    continue;
                }
                if (SWEEP_ALLOWED_KEYS.size && !SWEEP_ALLOWED_KEYS.has(k)) {
                    console.warn(`[SWEEP] Key nicht auf Whitelist, übersprungen: ${k}`);
                    continue;
                }
                inputs[k] = v;
            }

            const p2Invariants = extractP2Invariants(inputs);

            if (REF_P2_INVARIANTS === null) {
                REF_P2_INVARIANTS = p2Invariants;
                console.log(`[SWEEP] Referenz-P2-Invarianten gesetzt (Case ${comboIdx}):`, p2Invariants);
            }

            const p2VarianceWarning = !areP2InvariantsEqual(p2Invariants, REF_P2_INVARIANTS);

            if (p2VarianceWarning) {
                console.warn(`[SWEEP][ASSERT] P2-Basis-Parameter variieren im Sweep (Case ${comboIdx})`);
            }

            const rand = rng(baseSeed + comboIdx);
            const stressCtxMaster = buildStressContext(inputs.stressPreset, rand);

            const runOutcomes = [];

            for (let i = 0; i < anzahlRuns; i++) {
                let failed = false;
                const startYearIndex = Math.floor(rand() * annualData.length);
                let simState = initMcRunState(inputs, startYearIndex);

                const depotWertHistorie = [portfolioTotal(simState.portfolio)];
                let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.geschlecht);
                let stressCtx = cloneStressContext(stressCtxMaster);

                let minRunway = Infinity;

                for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                    const currentAge = inputs.startAlter + simulationsJahr;

                    let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                    yearData = applyStressOverride(yearData, stressCtx, rand);

                    careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);

                    let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
                    const careFactor = computeCareMortalityMultiplier(careMeta, inputs);
                    if (careFactor > 1) {
                        qx = Math.min(1.0, qx * careFactor);
                    }

                    if (rand() < qx) break;

                    const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                    const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct };
                    const { zusatzFloor: careFloor } = calcCareCost(careMeta, null);

                    const result = simulateOneYear(simState, adjustedInputs, yearData, simulationsJahr, careMeta, careFloor);

                    if (result.isRuin) {
                        failed = true;
                        if (BREAK_ON_RUIN) break;
                    } else {
                        simState = result.newState;
                        depotWertHistorie.push(portfolioTotal(simState.portfolio));

                        const runway = result.logData.RunwayCoveragePct || 0;
                        if (runway < minRunway) minRunway = runway;
                    }
                }

                const endVermoegen = failed ? 0 : portfolioTotal(simState.portfolio);
                const { maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);

                runOutcomes.push({
                    finalVermoegen: endVermoegen,
                    maxDrawdown: maxDDpct,
                    minRunway: minRunway === Infinity ? 0 : minRunway,
                    failed: failed
                });
            }

            const metrics = aggregateSweepMetrics(runOutcomes);
            metrics.warningR2Varies = p2VarianceWarning;
            sweepResults.push({ params, metrics });

            const progress = ((comboIdx + 1) / paramCombinations.length) * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${Math.round(progress)}%`;

            if (comboIdx % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        window.sweepResults = sweepResults;
        window.sweepParamRanges = paramRanges;

        displaySweepResults();

        document.getElementById('sweepResults').style.display = 'block';

    } catch (e) {
        alert("Fehler im Parameter-Sweep:\n\n" + e.message);
        console.error('Parameter-Sweep Fehler:', e);

        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
    } finally {
        if (progressBar.style.width !== '0%') {
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
        }
        setTimeout(() => { progressBarContainer.style.display = 'none'; }, 250);
        sweepButton.disabled = false;
    }
}

/**
 * Zeigt die Sweep-Ergebnisse als Heatmap an
 */
export function displaySweepResults() {
    try {
        const metricKey = document.getElementById('sweepMetric').value;
        const xParam = document.getElementById('sweepAxisX').value;
        const yParam = document.getElementById('sweepAxisY').value;

        const xValues = window.sweepParamRanges[xParam] || [];
        const yValues = window.sweepParamRanges[yParam] || [];

        const heatmapHtml = renderSweepHeatmapSVG(
            window.sweepResults,
            metricKey,
            xParam,
            yParam,
            xValues,
            yValues
        );

        document.getElementById('sweepHeatmap').innerHTML = heatmapHtml;
    } catch (error) {
        alert("Fehler beim Rendern der Sweep-Heatmap:\n\n" + error.message);
        console.error('displaySweepResults Fehler:', error);
        document.getElementById('sweepHeatmap').innerHTML = '<p style="color: red;">Fehler beim Rendern der Heatmap.</p>';
    }
}

/**
 * Führt einen umfassenden Sweep-Selbsttest durch (Developer-Modus)
 */
export async function runSweepSelfTest() {
    const resultsDiv = document.getElementById('sweepSelfTestResults');
    const button = document.getElementById('sweepSelfTestButton');

    button.disabled = true;
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="color: #666;">Sweep-Tests laufen...</p>';

    console.log('[SWEEP-TEST] Starte Sweep-Selbsttest-Suite');

    try {
        prepareHistoricalData();

        const logMessages = [];
        let allTestsPassed = true;

        // TEST 1: Baseline - P2-Invarianten bleiben über Cases konstant
        console.log('[SWEEP-TEST] Test 1: Baseline (P2-Invarianz)');
        logMessages.push('<strong>Test 1: Baseline (P2-Invarianz)</strong>');

        const testCases = [
            { rebalBand: 5, targetEq: 60 },
            { rebalBand: 10, targetEq: 60 },
            { rebalBand: 15, targetEq: 60 }
        ];

        const baseInputs = deepClone(getCommonInputs());
        const baseInputsJson = JSON.stringify(baseInputs);

        let REF_P2_INV = null;
        let test1Passed = true;

        for (let caseIdx = 0; caseIdx < testCases.length; caseIdx++) {
            const testCase = testCases[caseIdx];
            const inputs = deepClone(baseInputs);
            inputs.rebalBand = testCase.rebalBand;
            inputs.targetEq = testCase.targetEq;

            const p2Inv = extractP2Invariants(inputs);

            if (REF_P2_INV === null) {
                REF_P2_INV = p2Inv;
                logMessages.push(`&nbsp;&nbsp;Case ${caseIdx + 1}: Referenz gesetzt`);
            } else {
                if (areP2InvariantsEqual(p2Inv, REF_P2_INV)) {
                    logMessages.push(`&nbsp;&nbsp;Case ${caseIdx + 1}: P2-Invarianten konstant`);
                } else {
                    test1Passed = false;
                    allTestsPassed = false;
                    logMessages.push(`&nbsp;&nbsp;<span style="color: red;">Case ${caseIdx + 1}: P2-Invarianten variieren!</span>`);
                }
            }
        }

        logMessages.push(test1Passed ? '<span style="color: green;">Test 1 bestanden</span>' : '<span style="color: red;">Test 1 fehlgeschlagen</span>');
        logMessages.push('');

        // TEST 2: Deep-Copy-Test
        console.log('[SWEEP-TEST] Test 2: Deep-Copy-Schutz');
        logMessages.push('<strong>Test 2: Deep-Copy-Schutz</strong>');

        const baseInputsAfter = JSON.stringify(baseInputs);
        const test2Passed = baseInputsJson === baseInputsAfter;

        if (test2Passed) {
            logMessages.push('&nbsp;&nbsp;baseInputs blieben unverändert');
        } else {
            logMessages.push('&nbsp;&nbsp;<span style="color: red;">baseInputs wurden modifiziert!</span>');
            allTestsPassed = false;
        }

        logMessages.push(test2Passed ? '<span style="color: green;">Test 2 bestanden</span>' : '<span style="color: red;">Test 2 fehlgeschlagen</span>');
        logMessages.push('');

        // TEST 3: Negativtest
        console.log('[SWEEP-TEST] Test 3: Negativtest');
        logMessages.push('<strong>Test 3: Negativtest (P2-Änderung erkennen)</strong>');

        const negTestCases = [
            { rebalBand: 10, p2Change: false },
            { rebalBand: 15, p2Change: true }
        ];

        let NEG_REF_P2_INV = null;
        let test3Passed = false;

        for (let caseIdx = 0; caseIdx < negTestCases.length; caseIdx++) {
            const testCase = negTestCases[caseIdx];
            const inputs = deepClone(baseInputs);
            inputs.rebalBand = testCase.rebalBand;

            if (testCase.p2Change && inputs.partner && inputs.partner.aktiv) {
                inputs.partner.brutto = inputs.partner.brutto * 1.5;
            }

            const p2Inv = extractP2Invariants(inputs);

            if (NEG_REF_P2_INV === null) {
                NEG_REF_P2_INV = p2Inv;
                logMessages.push(`&nbsp;&nbsp;Neg-Case ${caseIdx + 1}: Referenz gesetzt`);
            } else {
                if (areP2InvariantsEqual(p2Inv, NEG_REF_P2_INV)) {
                    logMessages.push(`&nbsp;&nbsp;<span style="color: red;">Neg-Case ${caseIdx + 1}: Änderung NICHT erkannt!</span>`);
                    allTestsPassed = false;
                } else {
                    logMessages.push(`&nbsp;&nbsp;<span style="color: green;">Neg-Case ${caseIdx + 1}: Änderung korrekt erkannt</span>`);
                    test3Passed = true;
                }
            }
        }

        logMessages.push(test3Passed ? '<span style="color: green;">Test 3 bestanden</span>' : '<span style="color: red;">Test 3 fehlgeschlagen</span>');

        // Gesamtergebnis
        const statusColor = allTestsPassed ? 'green' : 'red';
        const statusText = allTestsPassed ? 'Alle Tests bestanden' : 'Einige Tests fehlgeschlagen';

        let html = `<div style="padding: 15px; background-color: ${allTestsPassed ? '#e8f5e9' : '#ffebee'}; border-radius: 4px;">`;
        html += `<strong style="color: ${statusColor};">${statusText}</strong><br><br>`;
        html += `<div style="font-family: monospace; font-size: 0.85rem;">`;
        html += logMessages.join('<br>');
        html += `</div></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
        console.error('[SWEEP-TEST] Fehler:', error);
    } finally {
        button.disabled = false;
    }
}
