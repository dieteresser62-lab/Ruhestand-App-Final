"use strict";

import { NUM_FORMATTER } from './shared-formatting.js';

export function parseDisplayNumber(value) {
    if (!value) return 0;
    const raw = String(value).trim().replace(/\s/g, '');
    if (!raw) return 0;
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    let normalized = raw;
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
    return NUM_FORMATTER.format(Math.round(value));
}
