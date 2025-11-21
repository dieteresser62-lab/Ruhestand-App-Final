'use strict';

const assert = require('assert');
const TransactionEngine = require('./TransactionEngine.js');
const { CONFIG } = require('../config.js');

/**
 * Prüft das Verhalten der TransactionEngine im ATH/Peak-Stable-Regime.
 *
 * Erwartung: Unterhalb des Guardrails (max. von Mindest-Runway und 75%-Ziel)
 * wird eine transparente Runway-Notfüllung ausgelöst, inklusive Cap-Hinweis,
 * damit keine Opportunismus-Logik zwischen benachbarten Werten flackert.
 */
function runAthRegimeGapTest() {
    const market = {
        sKey: 'peak_stable',
        szenarioText: 'Stabiler Höchststand'
    };

    // Ziel-Liquidität (156k) vs. aktuelle Liquidität (80k) bei stabilem ATH.
    const aktuelleLiquiditaet = 80000;
    const zielLiquiditaet = 156000;

    const input = {
        // Liquiditätssplit
        tagesgeld: 40000,
        geldmarktEtf: 40000,
        // Depot & Gold
        depotwertAlt: 200000,
        costBasisAlt: 150000,
        tqfAlt: 0.30,
        depotwertNeu: 120000,
        costBasisNeu: 120000,
        tqfNeu: 0.30,
        goldAktiv: true,
        goldWert: 20000,
        goldCost: 18000,
        goldSteuerfrei: false,
        goldZielProzent: 10,
        goldFloorProzent: 0,
        rebalancingBand: 25,
        rebalBand: 25,
        // Bedarf & Runway
        renteAktiv: false,
        renteMonatlich: 0,
        floorBedarf: 24000,
        flexBedarf: 12000,
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        // Steuer & sonstiges
        sparerPauschbetrag: 2000,
        kirchensteuerSatz: 0,
        // Allokations-Guardrails
        targetEq: 60,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5
    };

    const profil = CONFIG.PROFIL_MAP['sicherheits-dynamisch'];
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu + input.goldWert;
    const minGold = 0;

    const action = TransactionEngine.determineAction({
        aktuelleLiquiditaet,
        depotwertGesamt,
        zielLiquiditaet,
        market,
        spending: {},
        minGold,
        profil,
        input
    });

    // Erwartung: Runway-Notfüllung mit Cap-Hinweis (Guardrail 117k -> Gap 37k, Cap 32k).
    assert.ok(action.title.startsWith('Runway-Notfüllung (neutral)'), 'Runway-Notfüllung (neutral) sollte aktiv sein.');
    assert.ok(action.title.includes('Cap aktiv'), 'Cap-Hinweis muss sichtbar sein.');
    assert.strictEqual(action.type, 'TRANSACTION');
    assert.strictEqual(Math.round(action.verwendungen?.liquiditaet ?? 0), 32000, 'Liquidität sollte gedeckelt auf 32.000€ aufgefüllt werden.');
    const hasNeutralRunwayStep = Array.isArray(action.diagnosisEntries)
        && action.diagnosisEntries.some(entry => (entry.step || '').includes('Runway-Notfüllung'));
    assert.strictEqual(hasNeutralRunwayStep, true, 'Diagnoseeintrag für Runway-Notfüllung fehlt.');
}

/**
 * Validiert, dass nahe beieinanderliegende Liquiditätsstände nicht in völlig
 * unterschiedliche Logik-Zweige springen (Cliff-Effekt vermeiden).
 */
function runGuardrailCliffTest() {
    const market = {
        sKey: 'peak_stable',
        szenarioText: 'Stabiler Höchststand'
    };

    const aktuelleLiquiditaet = 104000;
    const zielLiquiditaet = 156000;

    const input = {
        tagesgeld: 52000,
        geldmarktEtf: 52000,
        depotwertAlt: 200000,
        costBasisAlt: 150000,
        tqfAlt: 0.30,
        depotwertNeu: 120000,
        costBasisNeu: 120000,
        tqfNeu: 0.30,
        goldAktiv: false,
        goldWert: 0,
        goldCost: 0,
        goldSteuerfrei: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        rebalancingBand: 25,
        rebalBand: 25,
        renteAktiv: false,
        renteMonatlich: 0,
        floorBedarf: 24000,
        flexBedarf: 12000,
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        sparerPauschbetrag: 2000,
        kirchensteuerSatz: 0,
        targetEq: 60,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5
    };

    const profil = CONFIG.PROFIL_MAP['sicherheits-dynamisch'];
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu + input.goldWert;
    const minGold = 0;

    const action = TransactionEngine.determineAction({
        aktuelleLiquiditaet,
        depotwertGesamt,
        zielLiquiditaet,
        market,
        spending: {},
        minGold,
        profil,
        input
    });

    assert.ok(action.title.startsWith('Runway-Notfüllung (neutral)'), 'Guardrail-Refill sollte statt opportunistischem Rebalancing greifen.');
    assert.ok(!action.title.includes('Cap aktiv'), 'Cap sollte bei 13k Gap nicht aktiv sein.');
    assert.strictEqual(Math.round(action.verwendungen?.liquiditaet ?? 0), 13000, 'Auffüllen sollte das Guardrail (75% Ziel) adressieren.');
}

if (require.main === module) {
    try {
        runAthRegimeGapTest();
        runGuardrailCliffTest();
        console.log('✅ Runway-Failsafe-Tests: Guardrail greift transparent und ohne Cliff-Effekt.');
    } catch (error) {
        console.error('❌ ATH-Regime-Test fehlgeschlagen:', error.message);
        process.exit(1);
    }
}

module.exports = { runAthRegimeGapTest, runGuardrailCliffTest };
