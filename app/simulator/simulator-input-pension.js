/**
 * Module: Simulator Input Pension
 * Purpose: Reads pension, partner, and widow pension simulator inputs.
 */
"use strict";

import { readChecked, readInt, readNumber, readValue } from './simulator-input-dom.js';

export function readPensionInputs(doc = globalThis.document) {
    const startAlter = readInt('p1StartAlter', readInt('startAlter', 65, doc), doc) || 65;
    const geschlecht = readValue('p1Geschlecht', readValue('geschlecht', 'w', doc), doc) || 'w';
    const startSPB = readNumber('p1SparerPauschbetrag', readNumber('startSPB', 0, doc), doc) || 0;
    const kirchensteuerPct = readNumber('p1KirchensteuerPct', readNumber('kirchensteuerSatz', 0, doc), doc) || 0;
    const renteMonatlich = readNumber('p1Monatsrente', readNumber('renteMonatlich', 0, doc), doc) || 0;
    const renteStartOffsetJahre = readInt('p1StartInJahren', readInt('renteStartOffsetJahre', 0, doc), doc) || 0;

    return {
        startAlter,
        geschlecht,
        startSPB,
        kirchensteuerSatz: kirchensteuerPct / 100,
        renteMonatlich,
        renteStartOffsetJahre,
        rentAdjMode: readValue('rentAdjMode', 'fix', doc) || 'fix',
        rentAdjPct: readNumber('rentAdjPct', 0, doc) || 0,
        // Legacy fields are still exposed for backward compatibility.
        renteIndexierungsart: readValue('renteIndexierungsart', 'fest', doc) || 'fest',
        renteFesterSatz: readNumber('renteFesterSatz', 0, doc) || 0
    };
}

export function readPartnerInputs(doc = globalThis.document) {
    let r2Monatsrente = readNumber('r2Monatsrente', 0, doc) || 0;
    if (!r2Monatsrente) {
        const r2BruttoJahr = readNumber('r2Brutto', 0, doc) || 0;
        if (r2BruttoJahr > 0) {
            r2Monatsrente = Math.round(r2BruttoJahr / 12);
        }
    }

    return {
        partner: {
            aktiv: readChecked('chkPartnerAktiv', false, doc) || false,
            geschlecht: readValue('r2Geschlecht', 'w', doc) || 'w',
            startAlter: readInt('r2StartAlter', 0, doc) || 0,
            startInJahren: readInt('r2StartInJahren', 0, doc) || 0,
            monatsrente: r2Monatsrente,
            sparerPauschbetrag: readNumber('r2SparerPauschbetrag', 0, doc) || 0,
            kirchensteuerPct: readNumber('r2KirchensteuerPct', 0, doc) || 0,
            steuerquotePct: readNumber('r2Steuerquote', 0, doc) || 0,
            // Legacy alias: annual gross pension from monthly pension.
            brutto: r2Monatsrente * 12
        }
    };
}

export function readWidowOptions(doc = globalThis.document) {
    const widowPctRaw = readNumber('widowPensionPct', NaN, doc);
    const widowMarriageOffsetRaw = readInt('widowMarriageOffsetYears', NaN, doc);
    const widowMinMarriageYearsRaw = readInt('widowMinMarriageYears', NaN, doc);
    const pct = Number.isFinite(widowPctRaw) ? widowPctRaw : 0;

    return {
        widowOptions: {
            mode: readValue('widowPensionMode', 'stop', doc) || 'stop',
            percent: Math.max(0, Math.min(100, pct)) / 100,
            marriageOffsetYears: Math.max(0, Number.isFinite(widowMarriageOffsetRaw) ? widowMarriageOffsetRaw : 0),
            minMarriageYears: Math.max(0, Number.isFinite(widowMinMarriageYearsRaw) ? widowMinMarriageYearsRaw : 0)
        }
    };
}
