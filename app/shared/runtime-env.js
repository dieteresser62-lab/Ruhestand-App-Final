// @ts-check

export function detectRuntime(win = globalThis.window) {
    if (!win || typeof win !== 'object') return 'unknown';
    if (win.__TAURI__ || win.__TAURI_INTERNALS__ || win.__TAURI_METADATA__) {
        return 'tauri';
    }
    return 'browser';
}

export function isTauriRuntime(win = globalThis.window) {
    return detectRuntime(win) === 'tauri';
}
