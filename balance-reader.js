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
        const num = (id) => dom.inputs[id] ? UIUtils.parseCurrency(dom.inputs[id].value) : 0;
        const val = (id) => dom.inputs[id] ? dom.inputs[id].value : '';
        const checked = (id) => dom.inputs[id] ? dom.inputs[id].checked : false;
        const readProfileNumber = (key) => {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined || raw === '') return null;
            const n = UIUtils.parseCurrency(raw);
            return Number.isFinite(n) ? n : null;
        };
        const readProfileBool = (key) => {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined || raw === '') return null;
            const normalized = String(raw).toLowerCase();
            if (normalized === 'true') return true;
            if (normalized === 'false') return false;
            return null;
        };

        const profileTagesgeld = readProfileNumber('profile_tagesgeld');
        const profileRenteAktiv = readProfileBool('profile_rente_aktiv');
        const profileRenteMonatlich = readProfileNumber('profile_rente_monatlich');
        const profileSonstigeEinkuenfte = readProfileNumber('profile_sonstige_einkuenfte');
        const profileAlter = readProfileNumber('profile_aktuelles_alter');
        const profileGoldAktiv = readProfileBool('profile_gold_aktiv');
        const profileGoldZiel = readProfileNumber('profile_gold_ziel_pct');
        const profileGoldFloor = readProfileNumber('profile_gold_floor_pct');
        const profileGoldSteuerfrei = readProfileBool('profile_gold_steuerfrei');
        const profileGoldRebalBand = readProfileNumber('profile_gold_rebal_band');

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

        const DEFAULT_GOLD_ZIEL = 7.5;
        const DEFAULT_GOLD_FLOOR = 1;
        const DEFAULT_GOLD_BAND = 25;

        let goldAktivFinal = (typeof profileGoldAktiv === 'boolean') ? profileGoldAktiv : checked('goldAktiv');
        let goldZielFinal = Number.isFinite(profileGoldZiel) ? profileGoldZiel : (parseFloat(val('goldZielProzent')) || 0);
        let goldFloorFinal = Number.isFinite(profileGoldFloor) ? profileGoldFloor : (parseFloat(val('goldFloorProzent')) || 0);
        let goldSteuerfreiFinal = (typeof profileGoldSteuerfrei === 'boolean') ? profileGoldSteuerfrei : checked('goldSteuerfrei');
        let rebalancingBandFinal = Number.isFinite(profileGoldRebalBand) ? profileGoldRebalBand : (parseFloat(val('rebalancingBand')) || 0);

        if (!Number.isFinite(goldZielFinal) || goldZielFinal <= 0 || goldZielFinal > 50) {
            goldZielFinal = DEFAULT_GOLD_ZIEL;
        }
        if (!Number.isFinite(goldFloorFinal) || goldFloorFinal < 0 || goldFloorFinal > 50) {
            goldFloorFinal = DEFAULT_GOLD_FLOOR;
        }
        if (goldAktivFinal && rebalancingBandFinal <= 0) {
            rebalancingBandFinal = DEFAULT_GOLD_BAND;
        }

        const hasProfileRenteSum = Number.isFinite(profileRenteMonatlich)
            || Number.isFinite(profileSonstigeEinkuenfte);
        const renteMonatlichFinal = hasProfileRenteSum
            ? (Number.isFinite(profileRenteMonatlich) ? profileRenteMonatlich : 0)
                + (Number.isFinite(profileSonstigeEinkuenfte) ? profileSonstigeEinkuenfte : 0)
            : num('renteMonatlich');
        const renteAktivFinal = hasProfileRenteSum
            ? renteMonatlichFinal > 0
            : ((typeof profileRenteAktiv === 'boolean') ? profileRenteAktiv : val('renteAktiv') === 'ja');

        return {
            aktuellesAlter: Number.isFinite(profileAlter) ? profileAlter : (parseInt(val('aktuellesAlter')) || 0),
            floorBedarf: num('floorBedarf'),
            flexBedarf: num('flexBedarf'),
            inflation: parseFloat(val('inflation')) || 0,
            tagesgeld: Number.isFinite(profileTagesgeld) ? profileTagesgeld : num('tagesgeld'),
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
            renteAktiv: renteAktivFinal,
            renteMonatlich: renteMonatlichFinal,
            risikoprofil: 'sicherheits-dynamisch',
            goldAktiv: goldAktivFinal,
            goldZielProzent: goldZielFinal,
            goldFloorProzent: goldFloorFinal,
            goldSteuerfrei: goldSteuerfreiFinal,
            rebalancingBand: rebalancingBandFinal,
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
        const goldAktivInput = dom.inputs.goldAktiv;
        const goldPanel = dom.controls.goldPanel;
        const isGoldActive = goldAktivInput ? goldAktivInput.checked : false;
        if (goldPanel) {
            goldPanel.style.display = isGoldActive ? 'block' : 'none';
        }

        const renteAktivInput = dom.inputs.renteAktiv;
        const renteMonatlichInput = dom.inputs.renteMonatlich;
        if (renteAktivInput && renteMonatlichInput) {
            const isRenteAktiv = renteAktivInput.value === 'ja';
            renteMonatlichInput.disabled = !isRenteAktiv;
            if (!isRenteAktiv) {
                renteMonatlichInput.value = UIUtils.formatNumber(0);
            }
        }
    }
};
