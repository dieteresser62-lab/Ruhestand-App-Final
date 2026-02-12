/**
 * Module: Input Validator
 * Purpose: Validates user inputs for plausibility and constraints (e.g., age, inflation, asset values).
 * Usage: Called by Engine Core before simulation starts.
 * Dependencies: None
 */
import { CONFIG } from '../config.mjs';

const InputValidator = {
    /**
     * Validiert alle Benutzereingaben auf Plausibilität
     *
     * Prüft folgende Kategorien:
     * - Alter (18-120 Jahre)
     * - Inflation (-10% bis +50%)
     * - Vermögenswerte (>= 0)
     * - Gold-Parameter (bei Aktivierung)
     * - Runway-Werte (min/target)
     * - Aktien-Zielquote (20-90%)
     * - Rebalancing-Parameter
     *
     * @param {Object} input - Benutzereingaben mit allen Parametern
     * @returns {Object} {valid: boolean, errors: Array<{fieldId, message}>}
     */
    validate(input) {
    const errors = [];

    // Hilfsfunktion für Validierungsprüfungen
    const check = (condition, fieldId, message) => {
        if (condition) {
            errors.push({ fieldId, message });
        }
    };

    // Helper: rejects NaN/Infinity before range check (skips undefined/null for optional fields)
    const checkFiniteRange = (value, min, max, fieldId, message) => {
        if (value == null) return;
        if (!Number.isFinite(value)) {
            errors.push({ fieldId, message: `${fieldId} muss eine gültige Zahl sein.` });
        } else if (value < min || value > max) {
            errors.push({ fieldId, message });
        }
    };

    // 1. Altersvalidierung
    // Plausibilitätsprüfung: 18 (Volljährigkeit) bis 120 Jahre
    checkFiniteRange(
        input.aktuellesAlter, 18, 120,
        'aktuellesAlter',
        'Alter muss zwischen 18 und 120 liegen.'
    );

    // 2. Inflationsvalidierung
    // Erlaubt Deflation (-10%) bis extreme Inflation (50%)
    checkFiniteRange(
        input.inflation, -10, 50,
        'inflation',
        'Inflation außerhalb plausibler Grenzen (-10% bis 50%).'
    );

    // 3. Vermögenswerte dürfen nicht negativ sein
    // Prüft alle Depot- und Kostenbasis-Felder
    ['tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu', 'goldWert',
        'floorBedarf', 'flexBedarf', 'flexBudgetAnnual', 'flexBudgetRecharge',
        'costBasisAlt', 'costBasisNeu', 'goldCost', 'sparerPauschbetrag'].forEach(field => {
            if (input[field] != null) {
                check(!Number.isFinite(input[field]) || input[field] < 0, field, 'Wert muss eine gültige nicht-negative Zahl sein.');
            }
        });

    // Marktdaten dürfen nicht negativ sein
    ['endeVJ', 'endeVJ_1', 'endeVJ_2', 'endeVJ_3', 'ath'].forEach(field => {
        if (input[field] != null) {
            check(!Number.isFinite(input[field]) || input[field] < 0, field, 'Marktdaten müssen eine gültige nicht-negative Zahl sein.');
        }
    });

    // 4. Gold-spezifische Validierung (nur wenn Gold aktiv)
    // Gold-Allokation sollte nicht mehr als 50% des Portfolios sein
    // Gold-Floor (Mindestbestand) sollte nicht mehr als 20% sein
    if (input.goldAktiv) {
        checkFiniteRange(
            input.goldZielProzent, 0.01, 50,
            'goldZielProzent',
            'Ziel-Allokation unrealistisch (0-50%).'
        );
        checkFiniteRange(
            input.goldFloorProzent, 0, 20,
            'goldFloorProzent',
            'Floor-Prozent unrealistisch (0-20%).'
        );
    }

    // 5. Runway-Validierung (Liquiditäts-Reichweite)
    // Minimum: 12-60 Monate (1-5 Jahre)
    // Ziel: 18-72 Monate (1.5-6 Jahre)
    // Ziel muss >= Minimum sein
    checkFiniteRange(
        input.runwayMinMonths, 12, 60,
        'runwayMinMonths',
        'Runway Minimum muss zwischen 12 und 60 Monaten liegen.'
    );
    checkFiniteRange(
        input.runwayTargetMonths, 18, 72,
        'runwayTargetMonths',
        'Runway Ziel muss zwischen 18 und 72 Monaten liegen.'
    );
    check(
        input.runwayTargetMonths < input.runwayMinMonths,
        'runwayTargetMonths',
        'Runway Ziel darf nicht kleiner als das Minimum sein.'
    );

    // Aktien-Zielquote
    checkFiniteRange(
        input.targetEq, 20, 90,
        'targetEq',
        'Aktien-Zielquote muss zwischen 20% und 90% liegen.'
    );

    // Rebalancing-Band
    checkFiniteRange(
        input.rebalBand, 1, 20,
        'rebalBand',
        'Rebalancing-Band muss zwischen 1% und 20% liegen.'
    );

    if (Number.isFinite(input.flexBudgetYears)) {
        checkFiniteRange(
            input.flexBudgetYears, 0, 10,
            'flexBudgetYears',
            'Flex-Budget Jahre müssen zwischen 0 und 10 liegen.'
        );
    }

    // Max. Abschöpfen
    // Erweiterte Grenze für Parameter Sweep (bis 50% statt 25%)
    checkFiniteRange(
        input.maxSkimPctOfEq, 0, 50,
        'maxSkimPctOfEq',
        'Max. Abschöpfen muss zwischen 0% and 50% liegen.'
    );

    // Max. Auffüllen (Bär)
    // Erweiterte Grenze für Parameter Sweep (bis 70% statt 15%)
    checkFiniteRange(
        input.maxBearRefillPctOfEq, 0, 70,
        'maxBearRefillPctOfEq',
        'Max. Auffüllen (Bär) muss zwischen 0% und 70% liegen.'
    );

    // T01: Dynamic-Flex Contract Validation
    if (input.dynamicFlex != null) {
        check(typeof input.dynamicFlex !== 'boolean', 'dynamicFlex', 'dynamicFlex muss ein Boolean sein.');
    }
    if (input.goGoActive != null) {
        check(typeof input.goGoActive !== 'boolean', 'goGoActive', 'goGoActive muss ein Boolean sein.');
    }
    if (input.horizonMethod != null) {
        const validMethod = (input.horizonMethod === 'mean' || input.horizonMethod === 'survival_quantile');
        check(!validMethod, 'horizonMethod', "horizonMethod muss 'mean' oder 'survival_quantile' sein.");
    }

    if (input.dynamicFlex === true) {
        const maxGoGoMultiplier = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.MAX_GO_GO_MULTIPLIER;
        checkFiniteRange(
            input.horizonYears, 1, 60,
            'horizonYears',
            'horizonYears muss zwischen 1 und 60 liegen.'
        );
        checkFiniteRange(
            input.survivalQuantile, 0.5, 0.99,
            'survivalQuantile',
            'survivalQuantile muss zwischen 0.5 und 0.99 liegen.'
        );
        checkFiniteRange(
            input.goGoMultiplier, 1.0, maxGoGoMultiplier,
            'goGoMultiplier',
            `goGoMultiplier muss zwischen 1.0 und ${maxGoGoMultiplier.toFixed(1)} liegen.`
        );
    }

    // CAPE alias contract: both fields are accepted, both must be plausible if present.
    checkFiniteRange(
        input.capeRatio, 0, 100,
        'capeRatio',
        'CAPE muss zwischen 0 und 100 liegen.'
    );
    checkFiniteRange(
        input.marketCapeRatio, 0, 100,
        'marketCapeRatio',
        'marketCapeRatio muss zwischen 0 und 100 liegen.'
    );

        return { valid: errors.length === 0, errors };
    }
};

export default InputValidator;
