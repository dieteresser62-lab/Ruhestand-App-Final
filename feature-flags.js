/**
 * ===================================================================
 * FEATURE FLAGS - Adaptive Engine Selection
 * ===================================================================
 * Ermöglicht das dynamische Umschalten zwischen Adapter und Direct API
 * ===================================================================
 */

'use strict';

/**
 * Feature Flags Configuration
 */
const DEFAULT_FLAGS = {
    // Engine Mode: 'adapter' oder 'direct'
    engineMode: 'adapter',

    // Worker Usage (Monte-Carlo/Sweep)
    useWorkers: false,

    // Side-by-Side Comparison Mode
    comparisonMode: false,

    // Performance Monitoring
    performanceMonitoring: true,

    // Debug Logging
    debugLogging: false
};

/**
 * Feature Flags Manager
 */
class FeatureFlags {
    constructor() {
        this.flags = { ...DEFAULT_FLAGS };
        this.listeners = [];
        this.performanceMetrics = {
            adapter: { totalTime: 0, count: 0, errors: 0 },
            direct: { totalTime: 0, count: 0, errors: 0 }
        };

        // Load from localStorage if available
        this.loadFromStorage();
    }

    /**
     * Get current engine mode
     * @returns {'adapter' | 'direct'}
     */
    getEngineMode() {
        return this.flags.engineMode;
    }

    /**
     * Set engine mode
     * @param {'adapter' | 'direct'} mode
     */
    setEngineMode(mode) {
        if (mode !== 'adapter' && mode !== 'direct') {
            throw new Error(`Invalid engine mode: ${mode}. Must be 'adapter' or 'direct'.`);
        }

        this.flags.engineMode = mode;
        this.saveToStorage();
        this.notifyListeners('engineMode', mode);

        if (this.flags.debugLogging) {
            console.log(`[FeatureFlags] Engine mode changed to: ${mode}`);
        }
    }

    /**
     * Toggle between adapter and direct
     * @returns {string} New mode
     */
    toggleEngineMode() {
        const newMode = this.flags.engineMode === 'adapter' ? 'direct' : 'adapter';
        this.setEngineMode(newMode);
        return newMode;
    }

    /**
     * Enable/disable worker execution for simulations
     * @param {boolean} enabled
     */
    setUseWorkers(enabled) {
        this.flags.useWorkers = Boolean(enabled);
        this.saveToStorage();
        this.notifyListeners('useWorkers', this.flags.useWorkers);

        if (this.flags.debugLogging) {
            console.log(`[FeatureFlags] useWorkers changed to: ${this.flags.useWorkers}`);
        }
    }

    /**
     * Check if worker execution is enabled
     * @returns {boolean}
     */
    isWorkersEnabled() {
        return this.flags.useWorkers === true;
    }

    /**
     * Enable/disable comparison mode (runs both engines)
     * @param {boolean} enabled
     */
    setComparisonMode(enabled) {
        this.flags.comparisonMode = enabled;
        this.saveToStorage();
        this.notifyListeners('comparisonMode', enabled);
    }

    /**
     * Check if comparison mode is active
     * @returns {boolean}
     */
    isComparisonMode() {
        return this.flags.comparisonMode;
    }

    /**
     * Get engine reference based on current mode
     * @returns {Object} Engine API or Adapter
     */
    getEngine() {
        if (typeof window === 'undefined') {
            return null;
        }

        if (this.flags.engineMode === 'direct') {
            return window.EngineAPI || null;
        } else {
            return window.Ruhestandsmodell_v30 || null;
        }
    }

    /**
     * Get simulator function based on current mode
     * @returns {Function} simulateOneYear function
     */
    getSimulatorFunction() {
        if (this.flags.engineMode === 'direct') {
            // Import from simulator-engine-direct.js
            return window.simulateOneYearDirect || null;
        } else {
            // Import from simulator-engine.js
            return window.simulateOneYearAdapter || null;
        }
    }

    /**
     * Record performance metric
     * @param {'adapter' | 'direct'} mode
     * @param {number} timeMs
     * @param {boolean} hadError
     */
    recordPerformance(mode, timeMs, hadError = false) {
        if (!this.flags.performanceMonitoring) return;

        const metrics = this.performanceMetrics[mode];
        if (metrics) {
            metrics.totalTime += timeMs;
            metrics.count++;
            if (hadError) metrics.errors++;
        }
    }

    /**
     * Get performance statistics
     * @returns {Object}
     */
    getPerformanceStats() {
        const adapter = this.performanceMetrics.adapter;
        const direct = this.performanceMetrics.direct;

        return {
            adapter: {
                avgTime: adapter.count > 0 ? adapter.totalTime / adapter.count : 0,
                totalRuns: adapter.count,
                errors: adapter.errors,
                errorRate: adapter.count > 0 ? (adapter.errors / adapter.count) * 100 : 0
            },
            direct: {
                avgTime: direct.count > 0 ? direct.totalTime / direct.count : 0,
                totalRuns: direct.count,
                errors: direct.errors,
                errorRate: direct.count > 0 ? (direct.errors / direct.count) * 100 : 0
            },
            comparison: this.getComparison()
        };
    }

    /**
     * Get performance comparison
     * @returns {Object}
     */
    getComparison() {
        const adapter = this.performanceMetrics.adapter;
        const direct = this.performanceMetrics.direct;

        if (adapter.count === 0 || direct.count === 0) {
            return { speedup: null, message: 'Insufficient data' };
        }

        const adapterAvg = adapter.totalTime / adapter.count;
        const directAvg = direct.totalTime / direct.count;
        const speedup = ((adapterAvg - directAvg) / adapterAvg) * 100;

        return {
            speedup,
            message: speedup > 0
                ? `Direct is ${speedup.toFixed(1)}% faster`
                : `Adapter is ${Math.abs(speedup).toFixed(1)}% faster`
        };
    }

    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this.performanceMetrics = {
            adapter: { totalTime: 0, count: 0, errors: 0 },
            direct: { totalTime: 0, count: 0, errors: 0 }
        };
    }

    /**
     * Subscribe to flag changes
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all listeners of a flag change
     * @private
     */
    notifyListeners(flag, value) {
        this.listeners.forEach(callback => {
            try {
                callback(flag, value);
            } catch (e) {
                console.error('[FeatureFlags] Listener error:', e);
            }
        });
    }

    /**
     * Save flags to localStorage
     * @private
     */
    saveToStorage() {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('featureFlags', JSON.stringify(this.flags));
            } catch (e) {
                console.warn('[FeatureFlags] Could not save to localStorage:', e);
            }
        }
    }

    /**
     * Load flags from localStorage
     * @private
     */
    loadFromStorage() {
        if (typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem('featureFlags');
                if (stored) {
                    this.flags = { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
                }
            } catch (e) {
                console.warn('[FeatureFlags] Could not load from localStorage:', e);
            }
        }
    }

    /**
     * Get all flags
     * @returns {Object}
     */
    getAllFlags() {
        return { ...this.flags };
    }

    /**
     * Reset all flags to defaults
     */
    reset() {
        this.flags = { ...DEFAULT_FLAGS };
        this.resetMetrics();
        this.saveToStorage();
        this.notifyListeners('reset', null);
    }
}

// Global singleton instance
export const featureFlags = new FeatureFlags();

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.featureFlags = featureFlags;
}

export default featureFlags;


