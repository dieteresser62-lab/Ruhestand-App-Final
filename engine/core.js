'use strict';

/**
 * ===================================================================
 * ENGINE CORE MODULE
 * ===================================================================
 * Orchestriert alle Module und stellt die EngineAPI bereit
 * ===================================================================
 */

const { ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG } = require('./config.js');
const { AppError, ValidationError } = require('./errors.js');
const InputValidator = require('./validators/InputValidator.js');
const MarketAnalyzer = require('./analyzers/MarketAnalyzer.js');
const SpendingPlanner = require('./planners/SpendingPlanner.js');
const TransactionEngine = require('./transactions/TransactionEngine.js');

/**
 * Interne Orchestrierungsfunktion
 * Führt alle Module zusammen und berechnet ein Jahresergebnis
 * @private
 */
function _internal_calculateModel(input, lastState) {
    // 1. Validierung
    const validationResult = InputValidator.validate(input);
    if (!validationResult.valid) {
        return { error: new ValidationError(validationResult.errors) };
    }

    // 2. Grundwerte berechnen
    const profil = CONFIG.PROFIL_MAP[input.risikoprofil];
    const aktuelleLiquiditaet = input.tagesgeld + input.geldmarktEtf;
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu +
        (input.goldAktiv ? input.goldWert : 0);
    const gesamtwert = depotwertGesamt + aktuelleLiquiditaet;

    // 3. Marktanalyse
    const market = MarketAnalyzer.analyzeMarket(input);

    // 4. Gold-Floor berechnen
    const goldFloorAbs = (input.goldFloorProzent / 100) * gesamtwert;
    const minGold = input.goldAktiv ? goldFloorAbs : 0;

    // 5. Inflationsangepassten Bedarf berechnen
    const renteJahr = input.renteAktiv ? (input.renteMonatlich * 12) : 0;
    const inflatedBedarf = {
        floor: Math.max(0, input.floorBedarf - renteJahr),
        flex: input.flexBedarf
    };
    const neuerBedarf = inflatedBedarf.floor + inflatedBedarf.flex;

    // 6. Runway berechnen
    const reichweiteMonate = (inflatedBedarf.floor + inflatedBedarf.flex) > 0
        ? (aktuelleLiquiditaet / ((inflatedBedarf.floor + inflatedBedarf.flex) / 12))
        : Infinity;

    // 7. Ausgabenplanung
    const { spendingResult, newState, diagnosis } = SpendingPlanner.determineSpending({
        market,
        lastState,
        inflatedBedarf,
        round5: input.round5,
        runwayMonate: reichweiteMonate,
        profil,
        depotwertGesamt,
        gesamtwert,
        renteJahr,
        input
    });

    // 8. Ziel-Liquidität berechnen
    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(
        profil,
        market,
        inflatedBedarf
    );

    // 9. Transaktionsaktion bestimmen
    const action = TransactionEngine.determineAction({
        aktuelleLiquiditaet,
        depotwertGesamt,
        zielLiquiditaet,
        market,
        spending: spendingResult,
        minGold,
        profil,
        input
    });

    // Diagnose-Einträge von Transaktion hinzufügen
    if (Array.isArray(action.diagnosisEntries) && action.diagnosisEntries.length) {
        diagnosis.decisionTree.push(...action.diagnosisEntries);
    }

    // 10. Liquidität nach Transaktion berechnen
    const liqNachTransaktion = aktuelleLiquiditaet + (action.verwendungen?.liquiditaet || 0);
    const jahresGesamtbedarf = inflatedBedarf.floor + inflatedBedarf.flex;
    const runwayMonths = (jahresGesamtbedarf > 0)
        ? (liqNachTransaktion / (jahresGesamtbedarf / 12))
        : Infinity;

    // 11. Runway-Status
    let runwayStatus = 'bad';
    if (runwayMonths >= input.runwayTargetMonths) {
        runwayStatus = 'ok';
    } else if (runwayMonths >= input.runwayMinMonths) {
        runwayStatus = 'warn';
    }

    // 12. Ergebnis zusammenstellen
    return {
        input,
        newState,
        diagnosis,
        ui: {
            depotwertGesamt,
            neuerBedarf,
            minGold,
            zielLiquiditaet,
            market,
            spending: spendingResult,
            action,
            liquiditaet: {
                deckungVorher: zielLiquiditaet > 0
                    ? (aktuelleLiquiditaet / zielLiquiditaet) * 100
                    : 100,
                deckungNachher: zielLiquiditaet > 0
                    ? (liqNachTransaktion / zielLiquiditaet) * 100
                    : 100,
            },
            runway: { months: runwayMonths, status: runwayStatus }
        }
    };
}

/**
 * ===================================================================
 * ENGINE API (v31)
 * ===================================================================
 * Moderne, zustandslose API für Balance App v38+
 * ===================================================================
 */
const EngineAPI = {
    /**
     * Gibt Versionsinformationen zurück
     */
    getVersion: function() {
        return { api: ENGINE_API_VERSION, build: ENGINE_BUILD_ID };
    },

    /**
     * Gibt Konfiguration zurück
     */
    getConfig: function() {
        return CONFIG;
    },

    /**
     * Analysiert Marktbedingungen
     */
    analyzeMarket: function(input) {
        try {
            return MarketAnalyzer.analyzeMarket(input);
        } catch (e) {
            return { error: e.message };
        }
    },

    /**
     * Berechnet Ziel-Liquidität
     */
    calculateTargetLiquidity: function(profil, market, inflatedBedarf) {
        return TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf);
    },

    /**
     * Simuliert ein einzelnes Jahr
     */
    simulateSingleYear: function(input, lastState) {
        try {
            return _internal_calculateModel(input, lastState);
        } catch (e) {
            if (e instanceof AppError) {
                return { error: e };
            }
            return {
                error: new AppError(
                    "Ein unerwarteter Engine-Fehler ist aufgetreten.",
                    { originalError: e }
                )
            };
        }
    },

    /**
     * @deprecated Veraltete Methode
     */
    addDecision: function(step, impact, status, severity) {
        console.warn("EngineAPI.addDecision ist veraltet.");
    },

    /**
     * @deprecated Veraltete Methode
     */
    updateDecision: function() {},

    /**
     * @deprecated Veraltete Methode
     */
    removeDecision: function() {}
};

// Exporte
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EngineAPI, _internal_calculateModel };
}
