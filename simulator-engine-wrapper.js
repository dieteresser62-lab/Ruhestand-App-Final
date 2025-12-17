/**
 * ===================================================================
 * ENGINE WRAPPER - Adaptive Engine Selection
 * ===================================================================
 * Wrapper der automatisch zwischen Adapter und Direct API wählt
 * basierend auf Feature Flags
 * ===================================================================
 */

'use strict';

import { featureFlags } from './feature-flags.js';
import { simulateOneYear as simulateOneYearAdapter } from './simulator-engine.js';
import { simulateOneYear as simulateOneYearDirect } from './simulator-engine-direct.js';

/**
 * Adaptive simulateOneYear function that automatically selects the engine
 * based on feature flags and records performance metrics
 *
 * @param {Object} currentState - Current state
 * @param {Object} inputs - Input parameters
 * @param {Object} yearData - Year data
 * @param {number} yearIndex - Year index
 * @param {Object} pflegeMeta - Care metadata
 * @param {number} careFloorAddition - Care floor addition
 * @param {Object} householdContext - Household context
 * @param {number} temporaryFlexFactor - Temporary flex factor
 * @param {Object} engineAPI - Optional engine override
 * @returns {Object} Simulation result
 */
export function simulateOneYear(
    currentState,
    inputs,
    yearData,
    yearIndex,
    pflegeMeta = null,
    careFloorAddition = 0,
    householdContext = null,
    temporaryFlexFactor = 1.0,
    engineAPI = null
) {
    const mode = featureFlags.getEngineMode();
    const performanceMonitoring = featureFlags.getAllFlags().performanceMonitoring;

    let result;
    let startTime;
    let hadError = false;

    try {
        if (performanceMonitoring) {
            startTime = performance.now();
        }

        if (mode === 'direct') {
            // Use Direct API version
            const engine = engineAPI || (typeof window !== 'undefined' ? window.EngineAPI : null);
            result = simulateOneYearDirect(
                currentState,
                inputs,
                yearData,
                yearIndex,
                pflegeMeta,
                careFloorAddition,
                householdContext,
                temporaryFlexFactor,
                engine
            );
        } else {
            // Use Adapter version
            const engine = engineAPI || (typeof window !== 'undefined' ? window.Ruhestandsmodell_v30 : null);
            result = simulateOneYearAdapter(
                currentState,
                inputs,
                yearData,
                yearIndex,
                pflegeMeta,
                careFloorAddition,
                householdContext,
                temporaryFlexFactor,
                engine
            );
        }

        if (performanceMonitoring && startTime) {
            const elapsed = performance.now() - startTime;
            featureFlags.recordPerformance(mode, elapsed, false);
        }

        return result;

    } catch (error) {
        hadError = true;

        if (performanceMonitoring && startTime) {
            const elapsed = performance.now() - startTime;
            featureFlags.recordPerformance(mode, elapsed, true);
        }

        throw error;
    }
}

/**
 * Run simulation in comparison mode (both engines)
 * Returns results from both engines for comparison
 *
 * @param {...args} Same as simulateOneYear
 * @returns {{adapter: Object, direct: Object, match: boolean, differences: Array}}
 */
export function simulateOneYearComparison(...args) {
    const [
        currentState,
        inputs,
        yearData,
        yearIndex,
        pflegeMeta,
        careFloorAddition,
        householdContext,
        temporaryFlexFactor,
        engineAPI
    ] = args;

    // Clone state for adapter
    const stateAdapter = structuredClone(currentState);
    const stateDirect = structuredClone(currentState);

    let resultAdapter, resultDirect;
    let timeAdapter, timeDirect;
    let errorAdapter, errorDirect;

    // Run Adapter version
    try {
        const startAdapter = performance.now();
        const engine = typeof window !== 'undefined' ? window.Ruhestandsmodell_v30 : null;
        resultAdapter = simulateOneYearAdapter(
            stateAdapter,
            inputs,
            yearData,
            yearIndex,
            pflegeMeta,
            careFloorAddition,
            householdContext,
            temporaryFlexFactor,
            engine
        );
        timeAdapter = performance.now() - startAdapter;
        featureFlags.recordPerformance('adapter', timeAdapter, false);
    } catch (error) {
        errorAdapter = error;
        featureFlags.recordPerformance('adapter', 0, true);
    }

    // Run Direct version
    try {
        const startDirect = performance.now();
        const engine = typeof window !== 'undefined' ? window.EngineAPI : null;
        resultDirect = simulateOneYearDirect(
            stateDirect,
            inputs,
            yearData,
            yearIndex,
            pflegeMeta,
            careFloorAddition,
            householdContext,
            temporaryFlexFactor,
            engine
        );
        timeDirect = performance.now() - startDirect;
        featureFlags.recordPerformance('direct', timeDirect, false);
    } catch (error) {
        errorDirect = error;
        featureFlags.recordPerformance('direct', 0, true);
    }

    // Compare results
    const differences = [];
    let match = true;

    if (errorAdapter || errorDirect) {
        match = false;
        if (errorAdapter && !errorDirect) {
            differences.push({ field: 'error', adapter: errorAdapter.message, direct: 'success' });
        } else if (!errorAdapter && errorDirect) {
            differences.push({ field: 'error', adapter: 'success', direct: errorDirect.message });
        } else {
            differences.push({ field: 'error', adapter: errorAdapter.message, direct: errorDirect.message });
        }
    } else {
        // Compare key fields
        const fieldsToCompare = [
            'newState.portfolio.liquiditaet',
            'logData.liquiditaet',
            'logData.entscheidung.jahresEntnahme',
            'logData.wertAktien',
            'logData.wertGold',
            'logData.steuern_gesamt',
            'totalTaxesThisYear'
        ];

        for (const field of fieldsToCompare) {
            const adapterVal = getNestedValue(resultAdapter, field);
            const directVal = getNestedValue(resultDirect, field);

            if (adapterVal !== undefined && directVal !== undefined) {
                const diff = Math.abs(adapterVal - directVal);
                const avg = (Math.abs(adapterVal) + Math.abs(directVal)) / 2;
                const diffPct = avg > 0 ? (diff / avg) * 100 : 0;

                if (diffPct > 1 && diff > 1) {
                    match = false;
                    differences.push({
                        field,
                        adapter: adapterVal,
                        direct: directVal,
                        diffPct: diffPct.toFixed(2)
                    });
                }
            }
        }
    }

    return {
        adapter: resultAdapter,
        direct: resultDirect,
        timeAdapter,
        timeDirect,
        speedup: timeAdapter > 0 ? ((timeAdapter - timeDirect) / timeAdapter) * 100 : null,
        match,
        differences,
        errorAdapter,
        errorDirect
    };
}

/**
 * Helper function to get nested object values
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Get the appropriate engine based on mode
 * @returns {Object} Engine instance (Adapter or EngineAPI)
 */
export function getEngine() {
    return featureFlags.getEngine();
}

/**
 * Get the appropriate simulator function based on mode
 * @returns {Function} simulateOneYear function
 */
export function getSimulatorFunction() {
    const mode = featureFlags.getEngineMode();
    return mode === 'direct' ? simulateOneYearDirect : simulateOneYearAdapter;
}

// Export everything from original simulator-engine for backward compatibility
export * from './simulator-engine.js';

// Make available globally
if (typeof window !== 'undefined') {
    window.simulateOneYearAdapter = simulateOneYearAdapter;
    window.simulateOneYearDirect = simulateOneYearDirect;
    window.simulateOneYearComparison = simulateOneYearComparison;
}
