/**
 * Module: Simulator Input DOM
 * Purpose: Small defensive DOM readers used by simulator input modules.
 */
"use strict";

import { parseDisplayNumber } from './simulator-portfolio-format.js';

const STRICT_DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Parses a DOM numeric value without accepting partial strings.
 * A single decimal comma is supported for programmatic/legacy DOM fixtures;
 * thousands separators belong to the explicit display-number reader.
 */
export function parseFiniteInputNumber(rawValue, fallback = 0) {
    if (typeof rawValue === 'number') {
        return Number.isFinite(rawValue) ? rawValue : fallback;
    }
    if (rawValue === null || rawValue === undefined) return fallback;
    const raw = String(rawValue).trim();
    if (!raw) return fallback;
    if (raw.includes('.') && raw.includes(',')) return fallback;
    const normalized = raw.includes(',') ? raw.replace(',', '.') : raw;
    if (!STRICT_DECIMAL_PATTERN.test(normalized)) return fallback;
    const value = Number(normalized);
    return Number.isFinite(value) ? value : fallback;
}

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
    return parseFiniteInputNumber(readValue(id, '', doc), fallback);
}

export function readInt(id, fallback = 0, doc = globalThis.document) {
    const n = parseFiniteInputNumber(readValue(id, '', doc), Number.NaN);
    return Number.isInteger(n) ? n : fallback;
}

export function readDisplayNumber(id, doc = globalThis.document) {
    return parseDisplayNumber(readValue(id, '', doc));
}

export function parseBoundedNumber(rawValue, fallback, min, max) {
    const n = parseFiniteInputNumber(rawValue, Number.NaN);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

export function readBoundedNumber(id, fallback, min, max, doc = globalThis.document) {
    return parseBoundedNumber(readValue(id, '', doc), fallback, min, max);
}
