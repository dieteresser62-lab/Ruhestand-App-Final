'use strict';

const assert = require('assert');
const TransactionEngine = require('./TransactionEngine.js');
const { CONFIG } = require('../config.js');

/**
 * Prüft das Verhalten der TransactionEngine im ATH/Peak-Stable-Regime.
 *
 * Erwartung: Obwohl die Liquidität deutlich unterhalb des Ziels liegt,
 * wird im stabilen Höchststand kein neutraler Runway-Notfall ausgelöst,
 * sondern ein reguläres opportunistisches Rebalancing mit kombiniertem
 * Cash- und Gold-Aufbau durchgeführt.
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

    // Sicherstellen, dass kein neutraler Notfall-Runway-Schritt erzeugt wird.
    const hasNeutralRunwayStep = Array.isArray(action.diagnosisEntries)
        && action.diagnosisEntries.some(entry => (entry.step || '').includes('Runway-Notfüllung'));
    assert.strictEqual(hasNeutralRunwayStep, false, 'Runway-Notfüllung (neutral) sollte im Peak-Stable-Regime nicht auftreten.');

    // Erwartung: Reguläres Rebalancing mit Liquiditäts- und Gold-Komponenten.
    assert.ok(
        action.title.startsWith('Opportunistisches Rebalancing & Liquidität auffüllen'),
        'Es sollte ein reguläres opportunistisches Rebalancing ausgelöst werden.'
    );
    assert.strictEqual(action.type, 'TRANSACTION');
    assert.ok(action.verwendungen?.liquiditaet > 0, 'Liquidität sollte in Richtung Ziel aufgefüllt werden.');
    assert.ok(action.verwendungen?.gold >= 0, 'Gold-Aufstockung sollte berücksichtigt werden.');
}

if (require.main === module) {
    try {
        runAthRegimeGapTest();
        console.log('✅ ATH-Regime-Test: Kein neutraler Runway-Failsafe im Peak-Stable-Szenario.');
    } catch (error) {
        console.error('❌ ATH-Regime-Test fehlgeschlagen:', error.message);
        process.exit(1);
    }
}

module.exports = { runAthRegimeGapTest };
