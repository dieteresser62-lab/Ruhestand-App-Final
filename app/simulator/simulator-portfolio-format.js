/**
 * Module: Simulator Portfolio Format
 * Purpose: Parsing and formatting numbers for display.
 *          Handles localized number formats (de-DE).
 * Usage: Called largely by inputs and display modules.
 * Dependencies: shared-formatting.js
 */
"use strict";

import { NUM_FORMATTER } from '../shared/shared-formatting.js';

export function parseDisplayNumber(value) {
    if (!value) return 0;
    const raw = String(value).trim().replace(/\s/g, '');
    if (!raw) return 0;
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    let normalized = raw;
    // Heuristic: detect decimal separator based on the last punctuation.
    if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
            normalized = raw.replace(/\./g, '').replace(',', '.');
        } else {
            normalized = raw.replace(/,/g, '');
        }
    } else if (lastComma !== -1) {
        normalized = raw.replace(/\./g, '').replace(',', '.');
    } else if (lastDot !== -1) {
        const parts = raw.split('.');
        const tail = parts[parts.length - 1];
        if (tail.length === 3) {
            normalized = raw.replace(/\./g, '');
        }
    }
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
}

export function formatDisplayNumber(value) {
    if (!Number.isFinite(value)) return '0';
    // Round to integer because display fields are currency-like.
    return NUM_FORMATTER.format(Math.round(value));
}
