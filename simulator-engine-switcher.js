/**
 * ===================================================================
 * ENGINE SWITCHER UI - Interactive Mode Toggle
 * ===================================================================
 * UI-Komponente zum Umschalten zwischen Adapter und Direct API
 * ===================================================================
 */

'use strict';

import { featureFlags } from './feature-flags.js';

/**
 * Creates and manages the Engine Switcher UI
 */
class EngineSwitcher {
    constructor() {
        this.panel = null;
        this.isMinimized = false;
        this.unsubscribe = null;
    }

    /**
     * Initialize the switcher UI
     */
    init() {
        this.createPanel();
        this.attachEventListeners();
        this.updateDisplay();

        // Subscribe to flag changes
        this.unsubscribe = featureFlags.subscribe((flag, value) => {
            this.updateDisplay();
        });

        // Auto-update every 2 seconds (for live statistics during simulations)
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, 2000);

        console.log('[EngineSwitcher] Initialized');
    }

    /**
     * Create the UI panel
     */
    createPanel() {
        // Create container
        const panel = document.createElement('div');
        panel.id = 'engine-switcher-panel';
        panel.className = 'engine-switcher-panel';

        panel.innerHTML = `
            <div class="engine-switcher-header">
                <span class="engine-switcher-title">🔧 Engine Mode</span>
                <div class="engine-switcher-controls">
                    <button id="engine-switcher-minimize" class="btn-icon" title="Minimize">_</button>
                    <button id="engine-switcher-close" class="btn-icon" title="Close">×</button>
                </div>
            </div>
            <div class="engine-switcher-content">
                <div class="engine-mode-selector">
                    <label class="engine-mode-label">
                        <input type="radio" name="engine-mode" value="adapter" id="mode-adapter">
                        <span class="mode-name">Adapter</span>
                        <span class="mode-desc">(Legacy, 3-5 calls/year)</span>
                    </label>
                    <label class="engine-mode-label">
                        <input type="radio" name="engine-mode" value="direct" id="mode-direct">
                        <span class="mode-name">Direct API</span>
                        <span class="mode-desc">(New, 1 call/year)</span>
                    </label>
                </div>

                <div class="comparison-mode-toggle">
                    <label>
                        <input type="checkbox" id="comparison-mode">
                        <span>Side-by-Side Comparison Mode</span>
                    </label>
                </div>

                <div class="performance-stats" id="performance-stats">
                    <h4>Performance Statistics</h4>
                    <div class="stats-content">
                        <div class="stat-row">
                            <span class="stat-label">Adapter:</span>
                            <span class="stat-value" id="adapter-avg">-</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Direct:</span>
                            <span class="stat-value" id="direct-avg">-</span>
                        </div>
                        <div class="stat-row comparison-stat">
                            <span class="stat-label">Speedup:</span>
                            <span class="stat-value" id="speedup">-</span>
                        </div>
                        <button id="reset-metrics" class="btn-small">Reset Metrics</button>
                    </div>
                </div>

                <div class="engine-info" id="engine-info">
                    <div class="info-badge" id="current-mode-badge">
                        Current: <strong id="current-mode-text">Adapter</strong>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();

        // Append to body
        document.body.appendChild(panel);
        this.panel = panel;
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('engine-switcher-styles')) return;

        const style = document.createElement('style');
        style.id = 'engine-switcher-styles';
        style.textContent = `
            .engine-switcher-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                background: white;
                border: 2px solid #2563eb;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 14px;
            }

            .engine-switcher-panel.minimized {
                width: auto;
            }

            .engine-switcher-panel.minimized .engine-switcher-content {
                display: none;
            }

            .engine-switcher-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: #2563eb;
                color: white;
                border-radius: 6px 6px 0 0;
                cursor: move;
                user-select: none;
            }

            .engine-switcher-title {
                font-weight: 600;
                font-size: 15px;
            }

            .engine-switcher-controls {
                display: flex;
                gap: 8px;
            }

            .btn-icon {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0 6px;
                line-height: 1;
            }

            .btn-icon:hover {
                opacity: 0.8;
            }

            .engine-switcher-content {
                padding: 16px;
            }

            .engine-mode-selector {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 16px;
                padding-bottom: 16px;
                border-bottom: 1px solid #e5e7eb;
            }

            .engine-mode-label {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 12px;
                border: 2px solid #e5e7eb;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .engine-mode-label:hover {
                border-color: #2563eb;
                background: #eff6ff;
            }

            .engine-mode-label input[type="radio"] {
                margin-top: 3px;
            }

            .engine-mode-label input[type="radio"]:checked + .mode-name {
                color: #2563eb;
                font-weight: 600;
            }

            .mode-name {
                display: block;
                font-weight: 500;
                margin-bottom: 2px;
            }

            .mode-desc {
                display: block;
                font-size: 12px;
                color: #6b7280;
            }

            .comparison-mode-toggle {
                margin-bottom: 16px;
                padding: 12px;
                background: #fef3c7;
                border: 1px solid #fbbf24;
                border-radius: 6px;
            }

            .comparison-mode-toggle label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 13px;
            }

            .performance-stats {
                margin-bottom: 16px;
                padding: 12px;
                background: #f9fafb;
                border-radius: 6px;
            }

            .performance-stats h4 {
                margin: 0 0 12px 0;
                font-size: 13px;
                color: #374151;
                font-weight: 600;
            }

            .stats-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .stat-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 13px;
            }

            .stat-label {
                color: #6b7280;
            }

            .stat-value {
                font-weight: 600;
                color: #1f2937;
            }

            .comparison-stat {
                padding-top: 8px;
                border-top: 1px solid #e5e7eb;
                margin-top: 4px;
            }

            .comparison-stat .stat-value {
                color: #059669;
                font-weight: 700;
            }

            .btn-small {
                margin-top: 8px;
                padding: 6px 12px;
                background: white;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                width: 100%;
            }

            .btn-small:hover {
                background: #f9fafb;
            }

            .engine-info {
                padding: 10px;
                background: #eff6ff;
                border: 1px solid #2563eb;
                border-radius: 6px;
                text-align: center;
            }

            .info-badge {
                font-size: 13px;
                color: #1e40af;
            }

            .info-badge strong {
                color: #2563eb;
                text-transform: uppercase;
                font-weight: 700;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Mode radio buttons
        document.getElementById('mode-adapter').addEventListener('change', () => {
            featureFlags.setEngineMode('adapter');
        });

        document.getElementById('mode-direct').addEventListener('change', () => {
            featureFlags.setEngineMode('direct');
        });

        // Comparison mode checkbox
        document.getElementById('comparison-mode').addEventListener('change', (e) => {
            featureFlags.setComparisonMode(e.target.checked);
        });

        // Reset metrics button
        document.getElementById('reset-metrics').addEventListener('click', () => {
            featureFlags.resetMetrics();
            this.updateDisplay();
        });

        // Minimize button
        document.getElementById('engine-switcher-minimize').addEventListener('click', () => {
            this.isMinimized = !this.isMinimized;
            this.panel.classList.toggle('minimized', this.isMinimized);
        });

        // Close button
        document.getElementById('engine-switcher-close').addEventListener('click', () => {
            this.hide();
        });

        // Make draggable
        this.makeDraggable();
    }

    /**
     * Update display with current state
     */
    updateDisplay() {
        const mode = featureFlags.getEngineMode();
        const stats = featureFlags.getPerformanceStats();

        // Update radio buttons
        document.getElementById('mode-adapter').checked = (mode === 'adapter');
        document.getElementById('mode-direct').checked = (mode === 'direct');

        // Update comparison mode
        document.getElementById('comparison-mode').checked = featureFlags.isComparisonMode();

        // Update current mode badge
        document.getElementById('current-mode-text').textContent =
            mode === 'adapter' ? 'Adapter' : 'Direct API';

        // Update performance stats
        if (stats.adapter.totalRuns > 0) {
            document.getElementById('adapter-avg').textContent =
                `${stats.adapter.avgTime.toFixed(2)}ms (${stats.adapter.totalRuns} runs)`;
        } else {
            document.getElementById('adapter-avg').textContent = 'No data';
        }

        if (stats.direct.totalRuns > 0) {
            document.getElementById('direct-avg').textContent =
                `${stats.direct.avgTime.toFixed(2)}ms (${stats.direct.totalRuns} runs)`;
        } else {
            document.getElementById('direct-avg').textContent = 'No data';
        }

        if (stats.comparison.speedup !== null) {
            const speedupText = stats.comparison.speedup > 0
                ? `+${stats.comparison.speedup.toFixed(1)}%`
                : `${stats.comparison.speedup.toFixed(1)}%`;
            document.getElementById('speedup').textContent = speedupText;
        } else {
            document.getElementById('speedup').textContent = stats.comparison.message;
        }
    }

    /**
     * Make panel draggable
     */
    makeDraggable() {
        const header = this.panel.querySelector('.engine-switcher-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            initialX = e.clientX - this.panel.offsetLeft;
            initialY = e.clientY - this.panel.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                this.panel.style.left = currentX + 'px';
                this.panel.style.top = currentY + 'px';
                this.panel.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * Show the panel
     */
    show() {
        if (this.panel) {
            this.panel.style.display = 'block';
        }
    }

    /**
     * Hide the panel
     */
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    }

    /**
     * Destroy the switcher
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.panel) {
            this.panel.remove();
        }
    }
}

// Create and export singleton instance
export const engineSwitcher = new EngineSwitcher();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engineSwitcher.init());
} else {
    engineSwitcher.init();
}

// Make available globally
if (typeof window !== 'undefined') {
    window.engineSwitcher = engineSwitcher;
}

export default engineSwitcher;
