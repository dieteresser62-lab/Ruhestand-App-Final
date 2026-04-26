/**
 * Module: Simulator Input Tranches
 * Purpose: Reads detailed tranche inputs from profile overrides or localStorage.
 */
"use strict";

export function readTrancheInputs({ win = globalThis.window, storage = globalThis.localStorage } = {}) {
    let detailledTranches = null;
    try {
        const override = win ? win.__profilverbundTranchenOverride : null;
        const preferAggregates = Boolean(win && win.__profilverbundPreferAggregates);
        if (Array.isArray(override) && override.length > 0) {
            detailledTranches = override;
        } else if (!preferAggregates && storage && typeof storage.getItem === 'function') {
            const saved = storage.getItem('depot_tranchen');
            if (saved) {
                detailledTranches = JSON.parse(saved);
            }
        }
    } catch {
        detailledTranches = null;
    }

    return { detailledTranches };
}
