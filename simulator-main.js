"use strict";

/**
 * ============================================================================
 * SWEEP FIX: ZWEI-PERSONEN-HAUSHALT - PARAMETER WHITELIST & RENTE-2-INVARIANZ
 * ============================================================================
 *
 * Datum: 2025-11-07
 *
 * ÄNDERUNGEN:
 * -----------
 * 1. **Whitelist statt Blacklist für Sweep-Parameter**
 *    - Nur explizit erlaubte Parameter (SWEEP_ALLOWED_KEYS) dürfen im Sweep variiert werden
 *    - Verhindert unbeabsichtigte Änderungen an Person-2-Parametern (Rente, Alter, etc.)
 *    - Blocklist (SWEEP_BLOCK_PATTERNS) für zusätzlichen Schutz von Person-2-Feldern
 *
 * 2. **Deep-Copy der Settings pro Sweep-Zelle**
 *    - deepClone() verwendet structuredClone() (Browser-Native) oder JSON-Fallback
 *    - Verhindert Side-Effects zwischen Sweep-Cases
 *    - baseInputs werden nur EINMAL gelesen und dann geklont
 *
 * 3. **Renten-Invarianz-Wächter für Person 2**
 *    - Extrahiert Rente-2-Serie aus Year-Logs (extractR2Series)
 *    - Vergleicht Rente-2 über alle Sweep-Cases (areR2SeriesEqual)
 *    - Setzt warningR2Varies-Flag bei Abweichungen
 *    - Referenz-Serie wird beim ersten Case gesetzt
 *
 * 4. **Heatmap-Badge & Tooltip für Verstöße**
 *    - Gelber Rand (stroke-width: 3px) bei warningR2Varies
 *    - Warn-Symbol ⚠ in betroffenen Heatmap-Zellen
 *    - Tooltip: "⚠ Rente 2 variierte im Sweep"
 *    - Keine KPI-Verfälschung, nur visuelle Markierung
 * - Fixed Seed für Tests: Wird in runSweepSelfTest() hartcodiert (baseSeed = 12345)
 *
 * BETROFFENE DATEIEN:
 * -------------------
 * - simulator-main.js:     UI-Init, Monte-Carlo und Sweep-Integration (Sweep-Logik ausgelagert)
 * - simulator-sweep.js:    Sweep-Logik, Range-Parsing, Whitelist/Blocklist-Enforcement
 * - simulator-heatmap.js:  Heatmap-Rendering mit R2-Warning-Badge
 * - simulator-results.js:  Metriken-Aggregation (warningR2Varies)
 *
 * ============================================================================
 */

import { simulateOneYear } from './simulator-engine-wrapper.js';
import { formatCurrency } from './simulator-utils.js';
import { annualData } from './simulator-data.js';
import { runMonteCarlo } from './simulator-monte-carlo.js';
import { displaySweepResults, runParameterSweep } from './simulator-sweep.js';
import { exportBacktestLogData, renderBacktestLog, runBacktest } from './simulator-backtest.js';
import { initializeSimulatorApp } from './simulator-main-init.js';
import { runSweepSelfTest } from './simulator-main-sweep-selftest.js';

/**
 * DOM-Initialisierung und Event-Handler
 */
window.onload = function () {
    initializeSimulatorApp();
};

// Globale Funktionen für HTML onclick-Handler
window.runMonteCarlo = runMonteCarlo;
window.runBacktest = runBacktest;
window.runParameterSweep = runParameterSweep;
window.displaySweepResults = displaySweepResults;
window.formatCurrency = formatCurrency;
window.runSweepSelfTest = runSweepSelfTest;
window.renderBacktestLog = renderBacktestLog;
window.exportBacktestLogData = exportBacktestLogData;

// Für Parity Smoke Test
window.simulateOneYear = simulateOneYear;
window.annualData = annualData;
