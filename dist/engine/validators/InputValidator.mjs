/**
 * ===================================================================
 * INPUT VALIDATOR MODULE
 * ===================================================================
 * Validiert Benutzereingaben und gibt strukturierte Fehler zurück
 * ===================================================================
 */

export const InputValidator = {
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

        // 1. Altersvalidierung
        // Plausibilitätsprüfung: 18 (Volljährigkeit) bis 120 Jahre
        check(
            input.aktuellesAlter < 18 || input.aktuellesAlter > 120,
            'aktuellesAlter',
            'Alter muss zwischen 18 und 120 liegen.'
        );

        // 2. Inflationsvalidierung
        // Erlaubt Deflation (-10%) bis extreme Inflation (50%)
        check(
            input.inflation < -10 || input.inflation > 50,
            'inflation',
            'Inflation außerhalb plausibler Grenzen (-10% bis 50%).'
        );

        // 3. Vermögenswerte dürfen nicht negativ sein
        // Prüft alle Depot- und Kostenbasis-Felder
        ['tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu', 'goldWert',
         'floorBedarf', 'flexBedarf', 'costBasisAlt', 'costBasisNeu', 'goldCost',
         'sparerPauschbetrag'].forEach(field => {
            check(input[field] < 0, field, 'Wert darf nicht negativ sein.');
        });

        // Marktdaten dürfen nicht negativ sein
        ['endeVJ', 'endeVJ_1', 'endeVJ_2', 'endeVJ_3', 'ath'].forEach(field => {
            check(input[field] < 0, field, 'Marktdaten dürfen nicht negativ sein.');
        });

        // 4. Gold-spezifische Validierung (nur wenn Gold aktiv)
        // Gold-Allokation sollte nicht mehr als 50% des Portfolios sein
        // Gold-Floor (Mindestbestand) sollte nicht mehr als 20% sein
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

        // 5. Runway-Validierung (Liquiditäts-Reichweite)
        // Minimum: 12-60 Monate (1-5 Jahre)
        // Ziel: 18-72 Monate (1.5-6 Jahre)
        // Ziel muss >= Minimum sein
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
        // Erweiterte Grenze für Parameter Sweep (bis 50% statt 25%)
        check(
            input.maxSkimPctOfEq < 0 || input.maxSkimPctOfEq > 50,
            'maxSkimPctOfEq',
            'Max. Abschöpfen muss zwischen 0% and 50% liegen.'
        );

        // Max. Auffüllen (Bär)
        // Erweiterte Grenze für Parameter Sweep (bis 70% statt 15%)
        check(
            input.maxBearRefillPctOfEq < 0 || input.maxBearRefillPctOfEq > 70,
            'maxBearRefillPctOfEq',
            'Max. Auffüllen (Bär) muss zwischen 0% und 70% liegen.'
        );

        return { valid: errors.length === 0, errors };
    }
};

export default InputValidator;
