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
 */
export function initUIReader(domRefs) {
    dom = domRefs;
}

export const UIReader = {
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
            round5: checked('round5'),
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
