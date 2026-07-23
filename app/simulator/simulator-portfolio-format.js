/**
 * Module: Simulator Portfolio Format
 * Purpose: Parsing and formatting numbers for display.
 *          Handles localized number formats (de-DE).
 * Usage: Called largely by inputs and display modules.
 * Dependencies: shared-formatting.js
 */
"use strict";

import { NUM_FORMATTER } from '../shared/shared-formatting.js';

const STRICT_NORMALIZED_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseDisplayNumber(value) {
    // Canonical application numbers must never pass through locale heuristics.
    // In particular, String(1.234) is ambiguous in de-DE and was previously
    // misread as the integer 1234.
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }
    if (value === null || value === undefined || value === '') return 0;
    const raw = String(value).trim().replace(/\s/g, '');
    if (!raw) return 0;
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    let normalized = raw;
    // Heuristic: detect decimal separator based on the last punctuation.
    if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
            if (!/^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(raw)) return 0;
            normalized = raw.replace(/\./g, '').replace(',', '.');
        } else {
            if (!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(raw)) return 0;
            normalized = raw.replace(/,/g, '');
        }
    } else if (lastComma !== -1) {
        if (!/^[+-]?\d+(?:,\d+)?$/.test(raw)) return 0;
        normalized = raw.replace(/\./g, '').replace(',', '.');
    } else if (lastDot !== -1) {
        const parts = raw.split('.');
        const tail = parts[parts.length - 1];
        if (tail.length === 3) {
            if (!/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(raw)) return 0;
            normalized = raw.replace(/\./g, '');
        } else if (!/^[+-]?\d+(?:\.\d+)?$/.test(raw)) {
            return 0;
        }
    }
    if (!STRICT_NORMALIZED_NUMBER_PATTERN.test(normalized)) return 0;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
}

export function formatDisplayNumber(value) {
    if (!Number.isFinite(value)) return '0';
    // Round to integer because display fields are currency-like.
    return NUM_FORMATTER.format(Math.round(value));
}
