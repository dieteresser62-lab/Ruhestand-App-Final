"use strict";

/**
 * ===================================================================================
 * BALANCE-APP UI-EINGABE-LESER
 * ===================================================================================
 */

import { UIUtils } from './balance-utils.js';
import { calculateAggregatedValues } from './depot-tranchen-status.js';

// Module-level DOM reference
let dom = null;
let hasLoggedTranchenAggregation = false;

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

        // Lade detaillierte Tranchen aus localStorage (falls vorhanden)
        let detailledTranches = null;
        try {
            const saved = localStorage.getItem('depot_tranchen');
            if (saved) {
                detailledTranches = JSON.parse(saved);
                console.log('✅ Detaillierte Depot-Tranchen geladen:', detailledTranches.length, 'Positionen');
            }
        } catch (err) {
            console.warn('Fehler beim Laden der Depot-Tranchen:', err);
        }

        const aggregated = (detailledTranches && Array.isArray(detailledTranches) && detailledTranches.length)
            ? calculateAggregatedValues()
            : null;

        const useAggregates = aggregated && (
            aggregated.depotwertAlt > 0 ||
            aggregated.depotwertNeu > 0 ||
            aggregated.geldmarktEtf > 0 ||
            aggregated.goldWert > 0
        );

        if (useAggregates && !hasLoggedTranchenAggregation) {
            console.log('Tranchen-Aggregate werden fuer Balance-Eingaben verwendet.');
            hasLoggedTranchenAggregation = true;
        }

        return {
            aktuellesAlter: parseInt(val('aktuellesAlter')) || 0,
            floorBedarf: num('floorBedarf'),
            flexBedarf: num('flexBedarf'),
            inflation: parseFloat(val('inflation')) || 0,
            tagesgeld: num('tagesgeld'),
            geldmarktEtf: useAggregates ? aggregated.geldmarktEtf : num('geldmarktEtf'),
            depotwertAlt: useAggregates ? aggregated.depotwertAlt : num('depotwertAlt'),
            depotwertNeu: useAggregates ? aggregated.depotwertNeu : num('depotwertNeu'),
            goldWert: useAggregates ? aggregated.goldWert : num('goldWert'),
            endeVJ: parseFloat(val('endeVJ')) || 0,
            endeVJ_1: parseFloat(val('endeVJ_1')) || 0,
            endeVJ_2: parseFloat(val('endeVJ_2')) || 0,
            endeVJ_3: parseFloat(val('endeVJ_3')) || 0,
            ath: parseFloat(val('ath')) || 0,
            jahreSeitAth: parseFloat(val('jahreSeitAth')) || 0,
            renteAktiv: val('renteAktiv') === 'ja',
            renteMonatlich: num('renteMonatlich'),
            risikoprofil: 'sicherheits-dynamisch',
            goldAktiv: checked('goldAktiv'),
            goldZielProzent: parseFloat(val('goldZielProzent')) || 0,
            goldFloorProzent: parseFloat(val('goldFloorProzent')) || 0,
            goldSteuerfrei: checked('goldSteuerfrei'),
            rebalancingBand: parseFloat(val('rebalancingBand')) || 0,
            costBasisAlt: useAggregates ? aggregated.costBasisAlt : num('costBasisAlt'),
            costBasisNeu: useAggregates ? aggregated.costBasisNeu : num('costBasisNeu'),
            tqfAlt: parseFloat(val('tqfAlt')) || 0,
            tqfNeu: parseFloat(val('tqfNeu')) || 0,
            goldCost: useAggregates ? aggregated.goldCost : num('goldCost'),
            kirchensteuerSatz: parseFloat(val('kirchensteuerSatz')) || 0,
            sparerPauschbetrag: num('sparerPauschbetrag'),
            runwayMinMonths: parseInt(document.getElementById('runwayMinMonths').value) || 24,
            runwayTargetMonths: parseInt(document.getElementById('runwayTargetMonths').value) || 36,
            minCashBufferMonths: parseInt(document.getElementById('minCashBufferMonths')?.value) || 2, // Default: 2 Monate Puffer
            targetEq: parseFloat(document.getElementById('targetEq').value) || 60,
            rebalBand: parseFloat(val('rebalBand')) || 0,
            maxSkimPctOfEq: parseFloat(val('maxSkimPctOfEq')) || 0,
            maxBearRefillPctOfEq: parseFloat(val('maxBearRefillPctOfEq')) || 0,
            profilName: val('profilName') || '',
            // NEU: Detaillierte Tranchen für FIFO und präzise Steuerberechnung
            detailledTranches: detailledTranches
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
                if (el.type === 'checkbox') {
                    el.checked = storedInputs[key];
                } else if (el.classList.contains('currency')) {
                    el.value = UIUtils.formatNumber(UIUtils.parseCurrency(storedInputs[key]));
                } else if (key === 'renteAktiv' && typeof storedInputs[key] === 'boolean') {
                    // Fix: Convert saved boolean back to "ja"/"nein" for the select element
                    el.value = storedInputs[key] ? 'ja' : 'nein';
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
