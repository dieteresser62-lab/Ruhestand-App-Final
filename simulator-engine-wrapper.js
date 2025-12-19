/**
 * ===================================================================
 * ENGINE WRAPPER - Direct API (Standardized)
 * ===================================================================
 * Wrapper that now exclusively uses the Direct API (EngineAPI).
 * Adapter references have been removed.
 * ===================================================================
 */

'use strict';

import { featureFlags } from './feature-flags.js';
import { simulateOneYear as simulateOneYearDirect } from './simulator-engine-direct.js';

// Re-export full initMcRunState from helpers to ensure tests get valid state
export * from './simulator-engine-helpers.js';

/**
 * Standard simulateOneYear function that uses the Direct Engine.
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
    const performanceMonitoring = featureFlags.getAllFlags().performanceMonitoring;
    let startTime;

    try {
        if (performanceMonitoring) {
            startTime = performance.now();
        }

        // Use Direct API version (Exclusive)
        const engine = engineAPI || (typeof window !== 'undefined' ? window.EngineAPI : null);
        const result = simulateOneYearDirect(
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

        if (performanceMonitoring && startTime) {
            const elapsed = performance.now() - startTime;
            featureFlags.recordPerformance('direct', elapsed, false);

            if (featureFlags.getAllFlags().debugLogging) {
                console.log(`[Performance] Direct: ${elapsed.toFixed(3)}ms`);
            }
        }

        return result;

    } catch (error) {
        if (performanceMonitoring && startTime) {
            const elapsed = performance.now() - startTime;
            featureFlags.recordPerformance('direct', elapsed, true);
        }
        throw error;
    }
}

/**
 * Get the appropriate engine
 * @returns {Object} EngineAPI instance
 */
export function getEngine() {
    return typeof window !== 'undefined' ? window.EngineAPI : null;
}

/**
 * Get the appropriate simulator function
 * @returns {Function} simulateOneYear function
 */
export function getSimulatorFunction() {
    return simulateOneYearDirect;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.simulateOneYear = simulateOneYear;
    window.simulateOneYearDirect = simulateOneYearDirect;
}
