/**
 * Module: Security Utilities
 * Purpose: HTML escaping and input sanitization for safe DOM rendering.
 * Usage: Import escapeHtml() before interpolating user data into innerHTML.
 * Dependencies: None
 */
"use strict";

/**
 * Escapes HTML special characters to prevent XSS when inserting into innerHTML.
 * @param {*} str - Value to escape (non-strings return empty string)
 * @returns {string} Escaped HTML-safe string
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
