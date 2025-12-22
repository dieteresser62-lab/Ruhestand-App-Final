/**
 * ===================================================================
 * ENGINE CORE MODULE
 * ===================================================================
 * Orchestriert alle Module und stellt die EngineAPI bereit
 * ===================================================================
 */

import { ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG } from './config.mjs';
import { AppError, ValidationError } from './errors.mjs';
import InputValidator from './validators/InputValidator.mjs';
import MarketAnalyzer from './analyzers/MarketAnalyzer.mjs';
import SpendingPlanner from './planners/SpendingPlanner.mjs';
import TransactionEngine from './transactions/TransactionEngine.mjs';

/**
 * Interne Orchestrierungsfunktion - Berechnet ein komplettes Jahresergebnis
 *
 * Diese Funktion orchestriert alle Engine-Module und führt die Jahresberechnung durch:
 * 1. Validiert Eingaben
 * 2. Berechnet Grundwerte (Portfolio, Liquidität, Bedarf)
 * 3. Analysiert Marktbedingungen
 * 4. Bestimmt Ausgabenstrategie (mit Guardrails)
 * 5. Berechnet notwendige Transaktionen
 * 6. Erstellt umfassende Diagnose
 *
 * @private
 * @param {Object} input - Benutzereingaben mit allen Parametern (Vermögen, Bedarf, Alter, etc.)
 * @param {Object} lastState - Vorheriger Zustand mit Guardrail-History (flexRate, peakRealVermoegen, etc.)
 * @returns {Object} Ergebnis mit {input, newState, diagnosis, ui} oder {error} bei Fehler
 */
function _internal_calculateModel(input, lastState) {
    // 1. Validierung der Eingabedaten
    // Prüft alle Eingaben auf Plausibilität und Vollständigkeit
    const validationResult = InputValidator.validate(input);
    if (!validationResult.valid) {
        return { error: new ValidationError(validationResult.errors) };
    }

    // 2. Grundwerte berechnen
    // Profil-Konfiguration laden (Runway-Ziele, Allokationsstrategie)
    // Profil-Konfiguration laden (Runway-Ziele, Allokationsstrategie)
    let profil = CONFIG.PROFIL_MAP[input.risikoprofil];
    if (!profil) {
        // Fallback für Tests oder invalide Eingaben
        profil = CONFIG.PROFIL_MAP['sicherheits-dynamisch'];
    }


    // Aktuelle Liquidität = Tagesgeld + Geldmarkt-ETF (oder direkter Override)
    const aktuelleLiquiditaet = (input.aktuelleLiquiditaet !== undefined)
        ? input.aktuelleLiquiditaet
        : (input.tagesgeld + input.geldmarktEtf);

    // Gesamtes Depotvermögen (Aktien alt + neu + optional Gold)
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu +
        (input.goldAktiv ? input.goldWert : 0);

    // Gesamtvermögen = Depot + Liquidität
    const gesamtwert = depotwertGesamt + aktuelleLiquiditaet;

    // 3. Marktanalyse durchführen
    // Bestimmt Marktszenario (Bär, Bulle, Seitwärts, etc.) basierend auf historischen Daten
    const market = MarketAnalyzer.analyzeMarket(input);

    // 4. Gold-Floor berechnen (Mindestbestand)
    // Definiert minimalen Gold-Bestand als Prozentsatz des Gesamtvermögens
    const goldFloorAbs = (input.goldFloorProzent / 100) * gesamtwert;
    const minGold = input.goldAktiv ? goldFloorAbs : 0;

    // 5. Inflationsangepassten Bedarf berechnen
    // Bedarf wird um Renteneinkünfte reduziert (netto)
    const renteJahr = input.renteAktiv ? (input.renteMonatlich * 12) : 0;
    // Fix: Überschussrente auf den Flex-Bedarf anrechnen
    const pensionSurplus = Math.max(0, renteJahr - input.floorBedarf);

    const inflatedBedarf = {
        floor: Math.max(0, input.floorBedarf - renteJahr),  // Grundbedarf (essentiell)
        flex: input.flexBedarf                              // Flexibler Bedarf (optional)
    };

    if (pensionSurplus > 0) {
        inflatedBedarf.flex = Math.max(0, inflatedBedarf.flex - pensionSurplus);
    }
    const neuerBedarf = inflatedBedarf.floor + inflatedBedarf.flex;

    // 6. Runway berechnen (Liquiditäts-Reichweite in Monaten)
    // Wie lange reicht die aktuelle Liquidität bei aktuellem Bedarf?
    const reichweiteMonate = (inflatedBedarf.floor + inflatedBedarf.flex) > 0
        ? (aktuelleLiquiditaet / ((inflatedBedarf.floor + inflatedBedarf.flex) / 12))
        : Infinity;

    // 7. Ausgabenplanung mit Guardrails
    // SpendingPlanner bestimmt die optimale Entnahmestrategie basierend auf:
    // - Marktsituation (Bär vs. Bulle)
    // - Runway-Status (kritisch, ok, gut)
    // - Historischem Peak (Drawdown-Berechnung)
    // - Entnahmequote und Alarmbedingungen
    const { spendingResult, newState, diagnosis } = SpendingPlanner.determineSpending({
        market,
        lastState,
        inflatedBedarf,
        runwayMonate: reichweiteMonate,
        profil,
        depotwertGesamt,
        gesamtwert,
        renteJahr,
        input
    });

    // 8. Ziel-Liquidität berechnen
    // Bestimmt die optimale Liquiditätshöhe basierend auf Profil und Marktsituation
    // Im Bärenmarkt: höhere Liquidität (z.B. 60 Monate)
    // Im Bullenmarkt: niedrigere Liquidität (z.B. 36 Monate)
    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(
        profil,
        market,
        inflatedBedarf,
        input
    );

    // 9. Transaktionsaktion bestimmen
    // Entscheidet, ob und welche Transaktionen notwendig sind:
    // - Depot-Verkauf zur Liquiditäts-Auffüllung
    // - Rebalancing (Aktien/Gold)
    // - Notfall-Verkäufe bei kritischem Runway
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
    // Transaktionen können eigene Diagnose-Einträge erzeugen (z.B. Caps, Guardrails)
    if (Array.isArray(action.diagnosisEntries) && action.diagnosisEntries.length) {
        diagnosis.decisionTree.push(...action.diagnosisEntries);
    }

    // 10. Liquidität nach Transaktion berechnen
    // Berücksichtigt Depot-Verkäufe zur Liquiditäts-Auffüllung
    const liqNachTransaktion = aktuelleLiquiditaet + (action.verwendungen?.liquiditaet || 0);
    const jahresGesamtbedarf = inflatedBedarf.floor + inflatedBedarf.flex;

    // KPI: Liquiditätsdeckung relativ zum Zielwert vor/nach Transaktion
    // Wird als Diagnose-KPI und für die UI wiederverwendet, deshalb einmalig berechnet
    const computeCoverage = (liquiditaetWert) => (zielLiquiditaet > 0)
        ? (liquiditaetWert / zielLiquiditaet) * 100
        : 100;
    const deckungVorher = computeCoverage(aktuelleLiquiditaet);
    const deckungNachher = computeCoverage(liqNachTransaktion);

    // Neue Runway nach Transaktion berechnen
    const runwayMonths = (jahresGesamtbedarf > 0)
        ? (liqNachTransaktion / (jahresGesamtbedarf / 12))
        : Infinity;

    // 11. Runway-Status bestimmen
    // - 'ok': Runway >= Ziel (z.B. 36+ Monate)
    // - 'warn': Runway >= Minimum aber < Ziel (z.B. 24-36 Monate)
    // - 'bad': Runway < Minimum (< 24 Monate) - kritisch!
    let runwayStatus = 'bad';
    if (runwayMonths >= input.runwayTargetMonths) {
        runwayStatus = 'ok';
    } else if (runwayMonths >= input.runwayMinMonths) {
        runwayStatus = 'warn';
    }

    // Diagnose-Objekt mit finalem Runway-Status und Zielwert anreichern
    diagnosis.general = diagnosis.general || {};
    diagnosis.general.runwayStatus = runwayStatus;
    diagnosis.general.runwayMonate = runwayMonths;
    diagnosis.general.deckungVorher = deckungVorher;
    diagnosis.general.deckungNachher = deckungNachher;
    const validInputRunwayTarget = (typeof input.runwayTargetMonths === 'number' && isFinite(input.runwayTargetMonths) && input.runwayTargetMonths > 0)
        ? input.runwayTargetMonths
        : null;
    const hasValidTarget = (typeof diagnosis.general.runwayTargetMonate === 'number' && isFinite(diagnosis.general.runwayTargetMonate));
    if (!hasValidTarget && validInputRunwayTarget) {
        diagnosis.general.runwayTargetMonate = validInputRunwayTarget;
    }
    if (typeof diagnosis.general.runwayTargetQuelle !== 'string' || !diagnosis.general.runwayTargetQuelle.trim()) {
        diagnosis.general.runwayTargetQuelle = validInputRunwayTarget ? 'input' : 'legacy';
    }

    if (Array.isArray(diagnosis.guardrails)) {
        diagnosis.guardrails = diagnosis.guardrails.map(guardrail => {
            if (guardrail && guardrail.type === 'months' && guardrail.rule === 'min' && guardrail.name.startsWith('Runway')) {
                return { ...guardrail, value: runwayMonths };
            }
            return guardrail;
        });
    }

    // 12. Ergebnis zusammenstellen
    // Struktur: {input, newState, diagnosis, ui}
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
                deckungVorher,
                deckungNachher
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
    getVersion: function () {
        return { api: ENGINE_API_VERSION, build: ENGINE_BUILD_ID };
    },

    /**
     * Gibt Konfiguration zurück
     */
    getConfig: function () {
        return CONFIG;
    },

    /**
     * Analysiert Marktbedingungen
     */
    analyzeMarket: function (input) {
        try {
            return MarketAnalyzer.analyzeMarket(input);
        } catch (e) {
            return { error: e.message };
        }
    },

    /**
     * Berechnet Ziel-Liquidität
     */
    calculateTargetLiquidity: function (profil, market, inflatedBedarf) {
        return TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf);
    },

    /**
     * Simuliert ein einzelnes Jahr
     */
    simulateSingleYear: function (input, lastState) {
        try {
            return _internal_calculateModel(input, lastState);
        } catch (e) {
            console.error('[EngineAPI] Critical Error in simulateSingleYear:', e);
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
    addDecision: function (step, impact, status, severity) {
        console.warn("EngineAPI.addDecision ist veraltet.");
    },

    /**
     * @deprecated Veraltete Methode
     */
    updateDecision: function () { },

    /**
     * @deprecated Veraltete Methode
     */
    removeDecision: function () { }
};

// Exporte
export { EngineAPI, _internal_calculateModel };
export default { EngineAPI, _internal_calculateModel };
