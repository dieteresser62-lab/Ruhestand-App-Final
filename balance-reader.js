"use strict";

/**
 * ===================================================================================
 * BALANCE-APP UI-EINGABE-LESER
 * ===================================================================================
 */

import { UIUtils } from './balance-utils.js';

// Module-level DOM reference
let dom = null;

/**
 * Initialisiert den UIReader mit DOM-Referenzen
 *
 * @param {Object} domRefs - Objekt mit DOM-Elementreferenzen (inputs, controls)
 */
export function initUIReader(domRefs) {
    dom = domRefs;
}

export const UIReader = {
    /**
     * Liest alle Benutzereingaben aus dem Formular
     *
     * Sammelt sämtliche Input-Werte (Alter, Vermögen, Bedarf, Marktdaten,
     * Steuern, Guardrail-Parameter etc.) und konvertiert sie in die
     * für die Engine erforderlichen Datentypen.
     *
     * @returns {Object} Strukturiertes Eingabeobjekt mit allen Parametern
     * @property {number} aktuellesAlter - Aktuelles Lebensalter
     * @property {number} floorBedarf - Jährlicher Grundbedarf (€)
     * @property {number} flexBedarf - Jährlicher flexibler Zusatzbedarf (€)
     * @property {number} inflation - Inflationsrate (%)
     * @property {number} tagesgeld - Tagesgeld-Guthaben (€)
     * @property {number} geldmarktEtf - Geldmarkt-ETF-Wert (€)
     * @property {number} depotwertAlt - Wert des Alt-Depots (€)
     * @property {number} depotwertNeu - Wert des Neu-Depots (€)
     * @property {number} goldWert - Wert der Goldbestände (€)
     * @property {number} endeVJ - ETF-Kurs Jahresende (%)
     * @property {number} endeVJ_1 - ETF-Kurs vor 1 Jahr (%)
     * @property {number} endeVJ_2 - ETF-Kurs vor 2 Jahren (%)
     * @property {number} endeVJ_3 - ETF-Kurs vor 3 Jahren (%)
     * @property {number} ath - All-Time-High des ETF (%)
     * @property {number} jahreSeitAth - Jahre seit ATH
     * @property {boolean} renteAktiv - Rente bereits aktiv
     * @property {number} renteMonatlich - Monatliche Rente (€)
     * @property {string} risikoprofil - Risikoprofil (immer 'sicherheits-dynamisch')
     * @property {boolean} goldAktiv - Gold-Modul aktiviert
     * @property {number} goldZielProzent - Gold-Zielanteil (%)
     * @property {number} goldFloorProzent - Gold-Floor-Anteil (%)
     * @property {boolean} goldSteuerfrei - Gold steuerfrei nach 1 Jahr
     * @property {number} rebalancingBand - Rebalancing-Band (%)
     * @property {number} costBasisAlt - Kostenbasis Alt-Depot (€)
     * @property {number} costBasisNeu - Kostenbasis Neu-Depot (€)
     * @property {number} tqfAlt - Teilfreistellungsquote Alt-Depot (%)
     * @property {number} tqfNeu - Teilfreistellungsquote Neu-Depot (%)
     * @property {number} goldCost - Kostenbasis Gold (€)
     * @property {number} kirchensteuerSatz - Kirchensteuersatz (%)
     * @property {number} sparerPauschbetrag - Sparerpauschbetrag (€)
     * @property {number} runwayMinMonths - Minimum Liquiditäts-Runway (Monate)
     * @property {number} runwayTargetMonths - Ziel Liquiditäts-Runway (Monate)
     * @property {number} targetEq - Ziel-Aktienquote (%)
     * @property {number} rebalBand - Rebalancing-Band für Equity (%)
     * @property {number} maxSkimPctOfEq - Max. Skimming-Prozent von Equity (%)
     * @property {number} maxBearRefillPctOfEq - Max. Bear-Refill-Prozent von Equity (%)
     */
    readAllInputs() {
        const num = (id) => UIUtils.parseCurrency(dom.inputs[id].value);
        const val = (id) => dom.inputs[id].value;
        const checked = (id) => dom.inputs[id].checked;
        return {
            aktuellesAlter: parseInt(val('aktuellesAlter')),
            floorBedarf: num('floorBedarf'),
            flexBedarf: num('flexBedarf'),
            inflation: parseFloat(val('inflation')),
            tagesgeld: num('tagesgeld'),
            geldmarktEtf: num('geldmarktEtf'),
            depotwertAlt: num('depotwertAlt'),
            depotwertNeu: num('depotwertNeu'),
            goldWert: num('goldWert'),
            endeVJ: parseFloat(val('endeVJ')),
            endeVJ_1: parseFloat(val('endeVJ_1')),
            endeVJ_2: parseFloat(val('endeVJ_2')),
            endeVJ_3: parseFloat(val('endeVJ_3')),
            ath: parseFloat(val('ath')),
            jahreSeitAth: parseFloat(val('jahreSeitAth')),
            renteAktiv: val('renteAktiv') === 'ja',
            renteMonatlich: num('renteMonatlich'),
            risikoprofil: 'sicherheits-dynamisch',
            goldAktiv: checked('goldAktiv'),
            goldZielProzent: parseFloat(val('goldZielProzent')),
            goldFloorProzent: parseFloat(val('goldFloorProzent')),
            goldSteuerfrei: checked('goldSteuerfrei'),
            rebalancingBand: parseFloat(val('rebalancingBand')),
            costBasisAlt: num('costBasisAlt'),
            costBasisNeu: num('costBasisNeu'),
            tqfAlt: parseFloat(val('tqfAlt')),
            tqfNeu: parseFloat(val('tqfNeu')),
            goldCost: num('goldCost'),
            kirchensteuerSatz: parseFloat(val('kirchensteuerSatz')),
            sparerPauschbetrag: num('sparerPauschbetrag'),
            runwayMinMonths: parseInt(val('runwayMinMonths'), 10),
            runwayTargetMonths: parseInt(val('runwayTargetMonths'), 10),
            targetEq: parseFloat(val('targetEq')),
            rebalBand: parseFloat(val('rebalBand')),
            maxSkimPctOfEq: parseFloat(val('maxSkimPctOfEq')),
            maxBearRefillPctOfEq: parseFloat(val('maxBearRefillPctOfEq'))
        };
    },

    /**
     * Wendet gespeicherte Eingabewerte auf das Formular an
     *
     * Lädt Werte aus dem übergebenen Objekt und setzt die entsprechenden
     * DOM-Elemente. Behandelt verschiedene Input-Typen korrekt:
     * - Checkboxen: checked-Attribut
     * - Währungsfelder: Formatierung mit Tausendertrennzeichen
     * - Andere Felder: Direktzuweisung
     *
     * Ruft anschließend applySideEffectsFromInputs() auf, um UI-Panels
     * entsprechend anzuzeigen/zu verbergen.
     *
     * @param {Object} [storedInputs={}] - Gespeicherte Eingabewerte
     */
    applyStoredInputs(storedInputs = {}) {
        Object.keys(dom.inputs).forEach(key => {
            const el = dom.inputs[key];
            if (el && key in storedInputs) {
                if(el.type === 'checkbox') {
                    el.checked = storedInputs[key];
                } else if (el.classList.contains('currency')) {
                    el.value = UIUtils.formatNumber(UIUtils.parseCurrency(storedInputs[key]));
                } else {
                    el.value = storedInputs[key];
                }
            }
        });
        this.applySideEffectsFromInputs();
    },

    /**
     * Wendet UI-Seiteneffekte basierend auf Eingabewerten an
     *
     * Zeigt/verbirgt Panels und aktiviert/deaktiviert Felder abhängig
     * von bestimmten Eingabewerten:
     * - Gold-Panel: nur sichtbar wenn goldAktiv aktiviert
     * - Renten-Feld: nur aktiviert wenn renteAktiv = 'ja'
     * - Setzt inaktive Felder auf 0 zurück
     *
     * Wird automatisch von applyStoredInputs() aufgerufen.
     */
    applySideEffectsFromInputs() {
        const isGoldActive = dom.inputs.goldAktiv.checked;
        dom.controls.goldPanel.style.display = isGoldActive ? 'block' : 'none';
        document.getElementById('goldWertGroup').style.display = isGoldActive ? '' : 'none';
        if (!isGoldActive) {
            dom.inputs.goldWert.value = UIUtils.formatNumber(0);
        }

        const isRenteAktiv = dom.inputs.renteAktiv.value === 'ja';
        dom.inputs.renteMonatlich.disabled = !isRenteAktiv;
        if (!isRenteAktiv) {
            dom.inputs.renteMonatlich.value = UIUtils.formatNumber(0);
        }
    }
};
