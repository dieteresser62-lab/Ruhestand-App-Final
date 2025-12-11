"use strict";

/**
 * Initialisiert die Renten-spezifische UI (Person 1 und Partner) und synchronisiert sie mit localStorage.
 *
 * Annahmen zu gespeicherten Werten:
 * - Alle Werte werden als String in localStorage abgelegt und unverändert in die Input-Felder geschrieben.
 * - Numerische Felder (z. B. Rentenbeträge oder Altersangaben) werden von den Browser-Inputs bei Bedarf selbst
 *   nach Number konvertiert; wir parsen nur dort aktiv, wo Legacy-Migrationen Berechnungen erfordern.
 * - Legacy-Keys enthalten ggf. Jahresbeträge (r2Brutto) oder Anpassungsprozente (anpassung_OLD); beide werden
 *   defensiv validiert, bevor eine Migration erfolgt.
 *
 * @returns {void}
 */
export function initRente2ConfigWithLocalStorage() {
    const defaults = {
        // Person 1
        p1StartAlter: "",
        p1Geschlecht: "m",
        p1SparerPB: "",
        p1KirchensteuerPct: 9,
        p1Monatsrente: "",
        p1StartInJahren: "",
        rentAdjMode: "wage",
        rentAdjPct: "",
        // Person 2
        aktiv: false,
        r2Geschlecht: "w",
        r2StartAlter: "",
        r2StartInJahren: "",
        r2Monatsrente: "",
        r2SparerPB: "",
        r2KirchensteuerPct: 0,
        r2Steuerquote: ""
    };

    const storageKeys = {
        // Person 1
        p1StartAlter: "sim_p1StartAlter",
        p1Geschlecht: "sim_p1Geschlecht",
        p1SparerPB: "sim_p1SparerPauschbetrag",
        p1KirchensteuerPct: "sim_p1KirchensteuerPct",
        p1Monatsrente: "sim_p1Monatsrente",
        p1StartInJahren: "sim_p1StartInJahren",
        rentAdjMode: "sim_rentAdjMode",
        rentAdjPct: "sim_rentAdjPct",
        // Person 2
        aktiv: "sim_partnerAktiv",
        r2Geschlecht: "sim_r2Geschlecht",
        r2StartAlter: "sim_r2StartAlter",
        r2StartInJahren: "sim_r2StartInJahren",
        r2Monatsrente: "sim_r2Monatsrente",
        r2SparerPB: "sim_r2SparerPauschbetrag",
        r2KirchensteuerPct: "sim_r2KirchensteuerPct",
        r2Steuerquote: "sim_r2Steuerquote",
        // VERALTET: Alte Keys für Abwärtskompatibilität
        r2Brutto_OLD: "sim_r2Brutto",
        anpassung_OLD: "sim_r2Anpassung"
    };

    // Person 1 Felder
    const p1StartAlter = document.getElementById("p1StartAlter");
    const p1Geschlecht = document.getElementById("p1Geschlecht");
    const p1SparerPB = document.getElementById("p1SparerPauschbetrag");
    const p1KirchensteuerPct = document.getElementById("p1KirchensteuerPct");
    const p1Monatsrente = document.getElementById("p1Monatsrente");
    const p1StartInJahren = document.getElementById("p1StartInJahren");
    const rentAdjMode = document.getElementById("rentAdjMode");
    const rentAdjPct = document.getElementById("rentAdjPct");

    // Person 2 Felder
    const chkPartnerAktiv = document.getElementById("chkPartnerAktiv");
    const sectionRente2 = document.getElementById("sectionRente2");
    const r2Geschlecht = document.getElementById("r2Geschlecht");
    const r2StartAlter = document.getElementById("r2StartAlter");
    const r2StartInJahren = document.getElementById("r2StartInJahren");
    const r2Monatsrente = document.getElementById("r2Monatsrente");
    const r2SparerPB = document.getElementById("r2SparerPauschbetrag");
    const r2KirchensteuerPct = document.getElementById("r2KirchensteuerPct");
    const r2Steuerquote = document.getElementById("r2Steuerquote");

    // ========== Person 1 Initialisierung ==========
    applyInitialValueWithPersistence(p1StartAlter, storageKeys.p1StartAlter, defaults.p1StartAlter, ["input"]);
    applyInitialValueWithPersistence(p1Geschlecht, storageKeys.p1Geschlecht, defaults.p1Geschlecht, ["change"]);
    applyInitialValueWithPersistence(p1SparerPB, storageKeys.p1SparerPB, defaults.p1SparerPB, ["input"]);
    applyInitialValueWithPersistence(p1KirchensteuerPct, storageKeys.p1KirchensteuerPct, defaults.p1KirchensteuerPct, ["change"]);
    applyInitialValueWithPersistence(p1Monatsrente, storageKeys.p1Monatsrente, defaults.p1Monatsrente, ["input"]);
    applyInitialValueWithPersistence(p1StartInJahren, storageKeys.p1StartInJahren, defaults.p1StartInJahren, ["input"]);

    migrateRentAdjustmentIfNeeded(rentAdjPct, storageKeys);
    applyInitialValueWithPersistence(rentAdjMode, storageKeys.rentAdjMode, defaults.rentAdjMode, ["change"]);
    applyInitialValueWithPersistence(rentAdjPct, storageKeys.rentAdjPct, defaults.rentAdjPct, ["input"]);

    // ========== Person 2 Initialisierung ==========
    if (!chkPartnerAktiv || !sectionRente2) {
        return; // Ohne Checkbox oder Rente-2-Section macht weitere Initialisierung keinen Sinn.
    }

    const savedAktiv = localStorage.getItem(storageKeys.aktiv);
    chkPartnerAktiv.checked = savedAktiv === "1";
    sectionRente2.style.display = chkPartnerAktiv.checked ? "block" : "none";

    applyInitialValueWithPersistence(r2Geschlecht, storageKeys.r2Geschlecht, defaults.r2Geschlecht, ["change"]);
    applyInitialValueWithPersistence(r2StartAlter, storageKeys.r2StartAlter, defaults.r2StartAlter, ["input"]);
    applyInitialValueWithPersistence(r2StartInJahren, storageKeys.r2StartInJahren, defaults.r2StartInJahren, ["input"]);

    migrateMonthlyPensionIfNeeded(r2Monatsrente, storageKeys);
    applyInitialValueWithPersistence(r2Monatsrente, storageKeys.r2Monatsrente, defaults.r2Monatsrente, ["input"]);

    applyInitialValueWithPersistence(r2SparerPB, storageKeys.r2SparerPB, defaults.r2SparerPB, ["input"]);
    applyInitialValueWithPersistence(r2KirchensteuerPct, storageKeys.r2KirchensteuerPct, defaults.r2KirchensteuerPct, ["change"]);
    applyInitialValueWithPersistence(r2Steuerquote, storageKeys.r2Steuerquote, defaults.r2Steuerquote, ["input"]);

    syncP1LegacyFields(
        {
            startAlter: document.getElementById("startAlter"),
            geschlecht: document.getElementById("geschlecht"),
            startSPB: document.getElementById("startSPB"),
            kirchensteuerSatz: document.getElementById("kirchensteuerSatz"),
            renteMonatlich: document.getElementById("renteMonatlich"),
            renteStartOffsetJahre: document.getElementById("renteStartOffsetJahre")
        },
        { p1StartAlter, p1Geschlecht, p1SparerPB, p1KirchensteuerPct, p1Monatsrente, p1StartInJahren }
    );
}

/**
 * Liest einen Wert aus localStorage, trägt ihn in das Element ein und hängt Persistierung an.
 *
 * @param {HTMLInputElement|HTMLSelectElement|null} element - Das DOM-Element, das befüllt und überwacht werden soll.
 * @param {string} storageKey - Der lokale Storage-Key, unter dem gespeichert wird.
 * @param {string|number} defaultValue - Fallback-Wert, falls kein gespeicherter Wert existiert.
 * @param {Array<string>} eventTypes - Liste der Events, die eine Speicherung auslösen (z. B. ["input"], ["change"]).
 * @returns {void}
 */
function applyInitialValueWithPersistence(element, storageKey, defaultValue, eventTypes) {
    if (!element) {
        return; // Defensive Guard: Element existiert nicht.
    }

    const storedValue = localStorage.getItem(storageKey);
    // Leere Strings, null oder undefined sollen zum Default führen.
    const valueToApply = storedValue !== null && storedValue !== undefined && storedValue !== "" ? storedValue : defaultValue;
    element.value = valueToApply;

    // Alle angegebenen Events lösen ein Speichern aus.
    eventTypes.forEach(eventType => {
        element.addEventListener(eventType, () => localStorage.setItem(storageKey, element.value));
    });
}

/**
 * Migriert die Rentenanpassung von einem Legacy-Key, falls kein neuer Wert gesetzt ist.
 *
 * @param {HTMLInputElement|null} rentAdjustmentInput - Input-Feld für die Rentenanpassung.
 * @param {Record<string, string>} storageKeys - Alle relevanten localStorage-Keys.
 * @returns {void}
 */
function migrateRentAdjustmentIfNeeded(rentAdjustmentInput, storageKeys) {
    if (!rentAdjustmentInput) {
        return; // Keine UI vorhanden, daher keine Migration nötig.
    }

    const currentValue = localStorage.getItem(storageKeys.rentAdjPct);
    // Nur migrieren, wenn kein aktueller Wert gesetzt ist.
    if (currentValue && currentValue !== "") {
        return;
    }

    const oldAdjustment = localStorage.getItem(storageKeys.anpassung_OLD);
    if (!oldAdjustment || oldAdjustment === "") {
        return;
    }

    // Wert direkt übernehmen, da es sich ebenfalls um einen Prozentwert handelt.
    localStorage.setItem(storageKeys.rentAdjPct, oldAdjustment);
}

/**
 * Migriert eine gespeicherte Jahresrente (r2Brutto) auf Monatsbasis (r2Monatsrente), falls nötig.
 *
 * @param {HTMLInputElement|null} monthlyPensionInput - Input-Feld für die Monatsrente.
 * @param {Record<string, string>} storageKeys - Alle relevanten localStorage-Keys.
 * @returns {void}
 */
function migrateMonthlyPensionIfNeeded(monthlyPensionInput, storageKeys) {
    if (!monthlyPensionInput) {
        return; // Ohne Input kein Bedarf.
    }

    let savedMonthly = localStorage.getItem(storageKeys.r2Monatsrente);
    if (savedMonthly && savedMonthly !== "" && savedMonthly !== "0") {
        return; // Bereits ein gültiger Monatswert vorhanden.
    }

    const legacyAnnual = localStorage.getItem(storageKeys.r2Brutto_OLD);
    const legacyValue = legacyAnnual ? parseFloat(legacyAnnual) : NaN;
    if (Number.isNaN(legacyValue) || legacyValue <= 0) {
        return; // Kein migrierbarer Legacy-Wert vorhanden.
    }

    // Legacy-Wert von Jahres- auf Monatsbetrag umrechnen und runden.
    savedMonthly = String(Math.round(legacyValue / 12));
    localStorage.setItem(storageKeys.r2Monatsrente, savedMonthly);
}

/**
 * Hält alte, versteckte Person-1-Felder synchron, damit Legacy-Auswertungen weiterhin funktionieren.
 *
 * @param {Object} legacyFields - Sammlung der Legacy-Inputs (alle optional).
 * @param {Object} p1Fields - Sammlung der modernen Person-1-Inputs.
 * @returns {void}
 */
function syncP1LegacyFields(legacyFields, p1Fields) {
    const { startAlter, geschlecht, startSPB, kirchensteuerSatz, renteMonatlich, renteStartOffsetJahre } = legacyFields;
    const { p1StartAlter, p1Geschlecht, p1SparerPB, p1KirchensteuerPct, p1Monatsrente, p1StartInJahren } = p1Fields;

    const performSync = () => {
        if (startAlter && p1StartAlter) startAlter.value = p1StartAlter.value;
        if (geschlecht && p1Geschlecht) geschlecht.value = p1Geschlecht.value;
        if (startSPB && p1SparerPB) startSPB.value = p1SparerPB.value;
        if (kirchensteuerSatz && p1KirchensteuerPct) kirchensteuerSatz.value = (parseFloat(p1KirchensteuerPct.value) / 100).toFixed(2);
        if (renteMonatlich && p1Monatsrente) renteMonatlich.value = p1Monatsrente.value;
        if (renteStartOffsetJahre && p1StartInJahren) renteStartOffsetJahre.value = p1StartInJahren.value;
    };

    performSync();

    // Alle relevanten Felder triggern ein Legacy-Sync, sobald sie sich ändern.
    [p1StartAlter, p1Geschlecht, p1SparerPB, p1KirchensteuerPct, p1Monatsrente, p1StartInJahren].forEach(element => {
        if (!element) {
            return;
        }
        element.addEventListener("input", performSync);
        element.addEventListener("change", performSync);
    });
}
