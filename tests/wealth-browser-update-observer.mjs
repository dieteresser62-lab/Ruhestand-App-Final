// DOM-freier Import: Erst die explizite Installation greift auf das Seitenfenster zu.
// addInitScript serialisiert die Funktion; sie benötigt keine freien Modulvariablen.
export function installWealthBrowserUpdateObserver(debounceMs) {
    if (window.__wealthPendingUpdates) return;
    const pending = window.__wealthPendingUpdates = new Set();
    // page.clock ersetzt Timerfunktionen auch nach dem Init-Skript per Zuweisung.
    // Die Accessors wickeln deshalb auch nachträglich gesetzte Implementierungen ein.
    const wrapSchedule = schedule => (callback, delay, ...args) => {
        if (delay !== debounceMs || typeof callback !== 'function') return schedule(callback, delay, ...args);
        const id = schedule(() => { try { callback(...args); } finally { pending.delete(id); } }, delay);
        pending.add(id);
        return id;
    };
    const wrapCancel = cancel => id => { pending.delete(id); return cancel(id); };
    let scheduleImpl = wrapSchedule(window.setTimeout.bind(window));
    let cancelImpl = wrapCancel(window.clearTimeout.bind(window));
    Object.defineProperty(window, 'setTimeout', { configurable: true,
        get: () => scheduleImpl, set: implementation => { scheduleImpl = wrapSchedule(implementation); } });
    Object.defineProperty(window, 'clearTimeout', { configurable: true,
        get: () => cancelImpl, set: implementation => { cancelImpl = wrapCancel(implementation); } });
}
