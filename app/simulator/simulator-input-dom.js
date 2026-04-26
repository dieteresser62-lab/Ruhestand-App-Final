/**
 * Module: Simulator Input DOM
 * Purpose: Small defensive DOM readers used by simulator input modules.
 */
"use strict";

import { parseDisplayNumber } from './simulator-portfolio-format.js';

export function getInputElement(id, doc = globalThis.document) {
    if (!doc || typeof doc.getElementById !== 'function') return null;
    return doc.getElementById(id);
}

export function readValue(id, fallback = '', doc = globalThis.document) {
    const el = getInputElement(id, doc);
    const value = el?.value;
    return value === undefined || value === null ? fallback : value;
}

export function readChecked(id, fallback = false, doc = globalThis.document) {
    const el = getInputElement(id, doc);
    return typeof el?.checked === 'boolean' ? el.checked : fallback;
}

export function readNumber(id, fallback = 0, doc = globalThis.document) {
    const n = Number.parseFloat(readValue(id, '', doc));
    return Number.isFinite(n) ? n : fallback;
}

export function readInt(id, fallback = 0, doc = globalThis.document) {
    const n = Number.parseInt(readValue(id, '', doc), 10);
    return Number.isFinite(n) ? n : fallback;
}

export function readDisplayNumber(id, doc = globalThis.document) {
    return parseDisplayNumber(readValue(id, '', doc));
}

export function parseBoundedNumber(rawValue, fallback, min, max) {
    const n = Number.parseFloat(String(rawValue ?? '').replace(',', '.'));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

export function readBoundedNumber(id, fallback, min, max, doc = globalThis.document) {
    return parseBoundedNumber(readValue(id, '', doc), fallback, min, max);
}
