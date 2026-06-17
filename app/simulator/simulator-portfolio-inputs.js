/**
 * Module: Simulator Portfolio Inputs
 * Purpose: Collecting input values from the UI.
 *          Handles complex parsing of form fields, care config, and partner details.
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: simulator-input-*.js
 */
"use strict";

import { readCareInputs } from './simulator-input-care.js';
import { readPartnerInputs, readPensionInputs, readWidowOptions } from './simulator-input-pension.js';
import {
    readAccumulationInputs,
    readBasePortfolioInputs,
    readDecumulationInputs,
    readDynamicFlexInputs,
    readStrategyInputs
} from './simulator-input-strategy.js';
import { readTrancheInputs } from './simulator-input-tranches.js';
import { normalizeTailRiskConfig } from './tail-risk-contract.js';

function readDomValue(id, fallback = '') {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    return el?.value ?? fallback;
}

function readDomChecked(id, fallback = false) {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    return typeof el?.checked === 'boolean' ? el.checked : fallback;
}

function readTailRiskInputs() {
    const tailRiskEnabled = readDomChecked('tailRiskEnabled', false);
    if (!tailRiskEnabled) {
        return normalizeTailRiskConfig({ tailRiskEnabled: false });
    }

    return normalizeTailRiskConfig({
        tailRiskEnabled,
        tailRiskAnnualProbabilityPct: readDomValue('tailRiskAnnualProbabilityPct', ''),
        tailRiskReturnShockPct: readDomValue('tailRiskReturnShockPct', ''),
        tailRiskInflationShockPct: readDomValue('tailRiskInflationShockPct', ''),
        tailRiskDurationYears: readDomValue('tailRiskDurationYears', ''),
        tailRiskCooldownYears: readDomValue('tailRiskCooldownYears', '')
    });
}

/**
 * Sammelt alle Eingabewerte aus dem UI
 */
export function getCommonInputs() {
    const win = typeof window !== 'undefined' ? window : null;
    const trancheInputs = readTrancheInputs();
    const baseInputs = readBasePortfolioInputs();
    const pensionInputs = readPensionInputs();
    const partnerInputs = readPartnerInputs();
    const widowInputs = readWidowOptions();
    const careInputs = readCareInputs({ gender: pensionInputs.geschlecht });
    const dynamicFlexInputs = readDynamicFlexInputs();
    const decumulationInputs = readDecumulationInputs();
    const strategyInputs = readStrategyInputs();
    const accumulationInputs = readAccumulationInputs({ startAlter: pensionInputs.startAlter });
    const tailRiskInputs = readTailRiskInputs();

    const result = {
        ...baseInputs,
        ...dynamicFlexInputs,
        ...pensionInputs,
        ...careInputs,
        ...decumulationInputs,
        ...partnerInputs,
        ...widowInputs,
        ...strategyInputs,
        ...accumulationInputs,
        ...tailRiskInputs,
        tailRiskHorizonYears: Number.parseInt(readDomValue('mcDauer', ''), 10),
        ...trancheInputs
    };

    if (typeof window !== 'undefined' && window.__profilverbundMinFlexProfilesOverride) {
        result.minimumFlexProfiles = window.__profilverbundMinFlexProfilesOverride;
    }

    if (Array.isArray(win?.__profilverbundMinimumFlexProfiles)) {
        result.minimumFlexProfiles = win.__profilverbundMinimumFlexProfiles.map(entry => ({ ...entry }));
    }

    return result;
}
