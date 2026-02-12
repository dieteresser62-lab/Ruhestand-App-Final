/**
 * Module: Engine Core
 * Purpose: Orchestrates the entire calculation logic of the engine.
 *          Coordinates InputValidator, MarketAnalyzer, SpendingPlanner, and TransactionEngine.
 * Usage: The brain of the simulation, called via EngineAPI.
 * Dependencies: config.mjs, errors.mjs, validators/InputValidator.mjs, analyzers/MarketAnalyzer.mjs, planners/SpendingPlanner.mjs, transactions/TransactionEngine.mjs
 */
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

const DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS = new Set(['mean', 'survival_quantile']);

function _coalesceCapeRatio(input) {
    if (Number.isFinite(input?.capeRatio) && input.capeRatio > 0) {
        return input.capeRatio;
    }
    if (Number.isFinite(input?.marketCapeRatio) && input.marketCapeRatio > 0) {
        return input.marketCapeRatio;
    }
    return undefined;
}

function _normalizeEngineInput(rawInput) {
    const input = { ...(rawInput || {}) };
    const capeRatio = _coalesceCapeRatio(input);
    if (capeRatio !== undefined) {
        input.capeRatio = capeRatio;
    }

    // Dynamic-Flex contract defaults (T01). T02 will consume these fields.
    input.dynamicFlex = input.dynamicFlex === true;
    input.horizonMethod = DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS.has(input.horizonMethod)
        ? input.horizonMethod
        : 'survival_quantile';
    if (!Number.isFinite(input.survivalQuantile)) {
        input.survivalQuantile = 0.85;
    }
    input.goGoActive = input.goGoActive === true;
    if (!Number.isFinite(input.goGoMultiplier)) {
        input.goGoMultiplier = 1.0;
    }

    return input;
}

function _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function _calculateVpwRate(realReturn, horizonYears) {
    const n = Math.max(1, Number(horizonYears) || 1);
    const r = Number(realReturn) || 0;
    if (Math.abs(r) < 0.001) {
        return 1 / n;
    }
    return r / (1 - Math.pow(1 + r, -n));
}

function _calculateExpectedRealReturn(params) {
    const cfg = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX;
    const inflRate = Number.isFinite(params?.inflation) ? (params.inflation / 100) : 0.02;
    const equityNominal = Number.isFinite(params?.expectedReturnCape)
        ? params.expectedReturnCape
        : (cfg.FALLBACK_REAL_RETURN + inflRate);
    const eqPct = Number.isFinite(params?.targetEq) ? (params.targetEq / 100) : 0.60;
    const goldPctRaw = (params?.goldAktiv && Number.isFinite(params?.goldZielProzent))
        ? (params.goldZielProzent / 100)
        : 0;
    const goldPct = _clamp(goldPctRaw, 0, 1);
    const safePct = Math.max(0, 1 - eqPct - goldPct);
    const rawReal = (eqPct * (equityNominal - inflRate)) +
        (goldPct * cfg.GOLD_REAL_RETURN) +
        (safePct * cfg.SAFE_ASSET_REAL_RETURN);
    const clampedReal = _clamp(rawReal, cfg.MIN_REAL_RETURN, cfg.MAX_REAL_RETURN);
    const prior = Number.isFinite(params?.lastExpectedRealReturn)
        ? params.lastExpectedRealReturn
        // Erstjahr: kein Vorwert vorhanden -> direkte Uebernahme des geclampten Werts.
        : clampedReal;
    const alpha = _clamp(cfg.EXPECTED_RETURN_SMOOTHING_ALPHA, 0, 1);
    return prior + alpha * (clampedReal - prior);
}

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
    const normalizedInput = _normalizeEngineInput(input);
    // 1. Validierung der Eingabedaten
    // Prüft alle Eingaben auf Plausibilität und Vollständigkeit
    // Harte Eingabevalidierung vor jeder Modellrechnung (fail-fast).
    const validationResult = InputValidator.validate(normalizedInput);
    if (!validationResult.valid) {
        // DEBUG: Log validation errors
        console.error('[VALIDATION ERROR] Invalid input fields:', validationResult.errors);
        return { error: new ValidationError(validationResult.errors) };
    }

    // 2. Grundwerte berechnen
    // Profil-Konfiguration laden (Runway-Ziele, Allokationsstrategie)
    // Profil-Konfiguration laden (Runway-Ziele, Allokationsstrategie)
    // Risikoprofil steuert Runway-Ziele, Guardrails und Entnahme-Logik.
    let profil = CONFIG.PROFIL_MAP[normalizedInput.risikoprofil];
    if (!profil) {
        // Fallback für Tests oder invalide Eingaben
        profil = CONFIG.PROFIL_MAP['sicherheits-dynamisch'];
    }


    // Aktuelle Liquidität = Tagesgeld + Geldmarkt-ETF (oder direkter Override)
    // Liquidität kann direkt überschrieben werden (z. B. Simulator/Tests).
    const aktuelleLiquiditaet = (normalizedInput.aktuelleLiquiditaet !== undefined)
        ? normalizedInput.aktuelleLiquiditaet
        : (normalizedInput.tagesgeld + normalizedInput.geldmarktEtf);

    // Gesamtes Depotvermögen (Aktien alt + neu + optional Gold)
    const depotwertGesamt = normalizedInput.depotwertAlt + normalizedInput.depotwertNeu +
        (normalizedInput.goldAktiv ? normalizedInput.goldWert : 0);

    // Gesamtvermögen = Depot + Liquidität
    const gesamtwert = depotwertGesamt + aktuelleLiquiditaet;

    // 3. Marktanalyse durchführen
    // Bestimmt Marktszenario (Bär, Bulle, Seitwärts, etc.) basierend auf historischen Daten
    const market = MarketAnalyzer.analyzeMarket(normalizedInput);

    // 4. Gold-Floor berechnen (Mindestbestand)
    // Definiert minimalen Gold-Bestand als Prozentsatz des Gesamtvermögens
    const goldFloorAbs = (normalizedInput.goldFloorProzent / 100) * gesamtwert;
    const minGold = normalizedInput.goldAktiv ? goldFloorAbs : 0;

    // 5. Inflationsangepassten Bedarf berechnen
    // Bedarf wird um Renteneinkünfte reduziert (netto)
    const renteJahr = normalizedInput.renteAktiv ? (normalizedInput.renteMonatlich * 12) : 0;
    // Fix: Überschussrente auf den Flex-Bedarf anrechnen
    // Überschussrente reduziert zuerst den Flex-Bedarf (Floor bleibt geschützt).
    const pensionSurplus = Math.max(0, renteJahr - normalizedInput.floorBedarf);

    const inflatedBedarf = {
        floor: Math.max(0, normalizedInput.floorBedarf - renteJahr),  // Grundbedarf (essentiell)
        flex: normalizedInput.flexBedarf                              // Flexibler Bedarf (optional)
    };

    if (pensionSurplus > 0) {
        inflatedBedarf.flex = Math.max(0, inflatedBedarf.flex - pensionSurplus);
    }
    const dynamicFlexCfg = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX;
    let vpwExpectedRealReturn = Number.isFinite(lastState?.vpwExpectedRealReturn)
        ? lastState.vpwExpectedRealReturn
        : null;
    let vpwDiagnostics = null;
    if (normalizedInput.dynamicFlex && Number.isFinite(normalizedInput.horizonYears) && normalizedInput.horizonYears > 0) {
        const horizonYears = _clamp(
            normalizedInput.horizonYears,
            dynamicFlexCfg.MIN_HORIZON_YEARS,
            dynamicFlexCfg.MAX_HORIZON_YEARS
        );
        const expectedRealReturn = _calculateExpectedRealReturn({
            expectedReturnCape: market.expectedReturnCape,
            inflation: normalizedInput.inflation,
            targetEq: normalizedInput.targetEq,
            goldAktiv: normalizedInput.goldAktiv,
            goldZielProzent: normalizedInput.goldZielProzent,
            lastExpectedRealReturn: vpwExpectedRealReturn
        });
        vpwExpectedRealReturn = expectedRealReturn;
        const vpwRate = _calculateVpwRate(expectedRealReturn, horizonYears);
        let vpwTotal = gesamtwert * vpwRate;
        const goGoMultiplier = normalizedInput.goGoActive
            ? _clamp(normalizedInput.goGoMultiplier, 1.0, dynamicFlexCfg.MAX_GO_GO_MULTIPLIER)
            : 1.0;
        vpwTotal *= goGoMultiplier;

        // VPW setzt den Flex-Anteil neu auf Basis von Netto-Floor (nach Rentenabzug).
        // Die vorherige statische Flex-/Pensions-Reduktion dient nur dem Legacy-Pfad.
        inflatedBedarf.flex = Math.max(0, vpwTotal - inflatedBedarf.floor);
        vpwDiagnostics = {
            enabled: true,
            status: 'active',
            gesamtwert: Math.round(gesamtwert),
            horizonYears,
            horizonMethod: normalizedInput.horizonMethod,
            survivalQuantile: normalizedInput.survivalQuantile,
            goGoActive: normalizedInput.goGoActive,
            goGoMultiplier,
            capeRatioUsed: Number.isFinite(market?.capeRatio) ? market.capeRatio : null,
            expectedReturnCape: Number.isFinite(market?.expectedReturnCape) ? market.expectedReturnCape : null,
            expectedRealReturn,
            vpwRate,
            vpwTotal,
            dynamicFlex: inflatedBedarf.flex
        };
    }
    const neuerBedarf = inflatedBedarf.floor + inflatedBedarf.flex;

    // 6. Runway berechnen (Liquiditäts-Reichweite in Monaten)
    // Wie lange reicht die aktuelle Liquidität bei aktuellem Bedarf?
    // Runway: Wie viele Monate deckt die Liquidität den aktuellen Bedarf?
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
        input: normalizedInput
    });

    // 8. Ziel-Liquidität berechnen
    // Bestimmt die optimale Liquiditätshöhe basierend auf Profil und Marktsituation
    // Im Bärenmarkt: höhere Liquidität (z.B. 60 Monate)
    // Im Bullenmarkt: niedrigere Liquidität (z.B. 36 Monate)
    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(
        profil,
        market,
        inflatedBedarf,
        normalizedInput
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
        input: normalizedInput
    });

    // Diagnose-Einträge von Transaktion hinzufügen
    // Transaktionen können eigene Diagnose-Einträge erzeugen (z.B. Caps, Guardrails)
    if (Array.isArray(action.diagnosisEntries) && action.diagnosisEntries.length) {
        diagnosis.decisionTree.push(...action.diagnosisEntries);
    }
    if (action.transactionDiagnostics) {
        diagnosis.transactionDiagnostics = action.transactionDiagnostics;
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
    if (runwayMonths >= normalizedInput.runwayTargetMonths) {
        runwayStatus = 'ok';
    } else if (runwayMonths >= normalizedInput.runwayMinMonths) {
        runwayStatus = 'warn';
    }

    // Diagnose-Objekt mit finalem Runway-Status und Zielwert anreichern
    diagnosis.general = diagnosis.general || {};
    diagnosis.general.runwayStatus = runwayStatus;
    diagnosis.general.runwayMonate = runwayMonths;
    diagnosis.general.deckungVorher = deckungVorher;
    diagnosis.general.deckungNachher = deckungNachher;
    const validInputRunwayTarget = (typeof normalizedInput.runwayTargetMonths === 'number' && isFinite(normalizedInput.runwayTargetMonths) && normalizedInput.runwayTargetMonths > 0)
        ? normalizedInput.runwayTargetMonths
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

    const resultForUI = {
        depotwertGesamt,
        neuerBedarf,
        minGold,
        zielLiquiditaet, // Explicitly check this!
        market,
        spending: spendingResult,
        action,
        liquiditaet: {
            deckungVorher,
            deckungNachher
        },
        runway: { months: runwayMonths, status: runwayStatus },
        // Stable schema for Dynamic-Flex contract (T01/T02).
        vpw: vpwDiagnostics || {
            enabled: normalizedInput.dynamicFlex,
            gesamtwert: Math.round(gesamtwert),
            horizonYears: Number.isFinite(normalizedInput.horizonYears) ? normalizedInput.horizonYears : null,
            horizonMethod: normalizedInput.horizonMethod,
            survivalQuantile: Number.isFinite(normalizedInput.survivalQuantile) ? normalizedInput.survivalQuantile : null,
            goGoActive: normalizedInput.goGoActive,
            goGoMultiplier: Number.isFinite(normalizedInput.goGoMultiplier) ? normalizedInput.goGoMultiplier : 1.0,
            capeRatioUsed: Number.isFinite(market?.capeRatio) ? market.capeRatio : null,
            expectedReturnCape: Number.isFinite(market?.expectedReturnCape) ? market.expectedReturnCape : null,
            status: normalizedInput.dynamicFlex ? 'contract_ready' : 'disabled'
        }
    };

    if (newState && typeof newState === 'object') {
        if (Number.isFinite(vpwExpectedRealReturn)) {
            newState.vpwExpectedRealReturn = vpwExpectedRealReturn;
        } else {
            delete newState.vpwExpectedRealReturn;
        }
    }

    return {
        input: normalizedInput,
        newState,
        diagnosis,
        ui: resultForUI
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
