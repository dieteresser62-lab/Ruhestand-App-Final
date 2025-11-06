'use strict';

/**
 * ===================================================================
 * INPUT VALIDATOR MODULE
 * ===================================================================
 * Validiert Benutzereingaben und gibt strukturierte Fehler zurück
 * ===================================================================
 */

const InputValidator = {
    validate(input) {
        const errors = [];
        const check = (condition, fieldId, message) => {
            if (condition) {
                errors.push({ fieldId, message });
            }
        };

        // Altersvalidierung
        check(
            input.aktuellesAlter < 18 || input.aktuellesAlter > 120,
            'aktuellesAlter',
            'Alter muss zwischen 18 und 120 liegen.'
        );

        // Inflationsvalidierung
        check(
            input.inflation < -10 || input.inflation > 50,
            'inflation',
            'Inflation außerhalb plausibler Grenzen (-10% bis 50%).'
        );

        // Vermögenswerte dürfen nicht negativ sein
        ['tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu', 'goldWert',
         'floorBedarf', 'flexBedarf', 'costBasisAlt', 'costBasisNeu', 'goldCost',
         'sparerPauschbetrag'].forEach(field => {
            check(input[field] < 0, field, 'Wert darf nicht negativ sein.');
        });

        // Marktdaten dürfen nicht negativ sein
        ['endeVJ', 'endeVJ_1', 'endeVJ_2', 'endeVJ_3', 'ath'].forEach(field => {
            check(input[field] < 0, field, 'Marktdaten dürfen nicht negativ sein.');
        });

        // Gold-spezifische Validierung
        if(input.goldAktiv) {
            check(
                input.goldZielProzent <= 0 || input.goldZielProzent > 50,
                'goldZielProzent',
                'Ziel-Allokation unrealistisch (0-50%).'
            );
            check(
                input.goldFloorProzent < 0 || input.goldFloorProzent > 20,
                'goldFloorProzent',
                'Floor-Prozent unrealistisch (0-20%).'
            );
        }

        // Runway-Validierung
        check(
            input.runwayMinMonths < 12 || input.runwayMinMonths > 60,
            'runwayMinMonths',
            'Runway Minimum muss zwischen 12 und 60 Monaten liegen.'
        );
        check(
            input.runwayTargetMonths < 18 || input.runwayTargetMonths > 72,
            'runwayTargetMonths',
            'Runway Ziel muss zwischen 18 und 72 Monaten liegen.'
        );
        check(
            input.runwayTargetMonths < input.runwayMinMonths,
            'runwayTargetMonths',
            'Runway Ziel darf nicht kleiner als das Minimum sein.'
        );

        // Aktien-Zielquote
        check(
            input.targetEq < 20 || input.targetEq > 90,
            'targetEq',
            'Aktien-Zielquote muss zwischen 20% und 90% liegen.'
        );

        // Rebalancing-Band
        check(
            input.rebalBand < 1 || input.rebalBand > 20,
            'rebalBand',
            'Rebalancing-Band muss zwischen 1% und 20% liegen.'
        );

        // Max. Abschöpfen
        check(
            input.maxSkimPctOfEq < 0 || input.maxSkimPctOfEq > 25,
            'maxSkimPctOfEq',
            'Max. Abschöpfen muss zwischen 0% and 25% liegen.'
        );

        // Max. Auffüllen (Bär)
        check(
            input.maxBearRefillPctOfEq < 0 || input.maxBearRefillPctOfEq > 15,
            'maxBearRefillPctOfEq',
            'Max. Auffüllen (Bär) muss zwischen 0% und 15% liegen.'
        );

        return { valid: errors.length === 0, errors };
    }
};

// Exporte
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputValidator;
}
