console.log('--- TransactionEngine ATH Tests ---');

import TransactionEngine from '../engine/transactions/TransactionEngine.mjs';
import { CONFIG } from '../engine/config.mjs';

/**
 * Prüft das Verhalten der TransactionEngine im ATH/Peak-Stable-Regime.
 *
 * Erwartung: Bei ATH ohne echte Runway-Lücke (Runway > Minimum) soll
 * opportunistisches Rebalancing greifen, NICHT die Notfüllung.
 * Die Notfüllung ist für Stress-Regimes und echte Runway-Lücken reserviert.
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

    // Erwartung: Bei ATH ohne Runway-Lücke (27 Monate > 24 Minimum) → Opportunistisches Rebalancing
    // NICHT Runway-Notfüllung, da ATH der optimale Zeitpunkt für normale Auffüllung ist.
    assertEqual(action.type, 'TRANSACTION', 'ATH: Action type should be TRANSACTION');
    assert(!action.title.includes('Notfüllung'), 'ATH: Bei ATH ohne Runway-Lücke sollte KEINE Notfüllung erfolgen.');
    assert(action.title.includes('Auffüllen') || action.title.includes('Rebalancing') || action.title.startsWith('Aktien'),
        'ATH: Opportunistisches Rebalancing/Auffüllen sollte aktiv sein: ' + action.title);
    // Prüfe dass Liquidität aufgefüllt wird
    assert(action.verwendungen?.liquiditaet > 0, 'ATH: Liquidität sollte aufgefüllt werden.');
    assert(action.quellen && action.quellen.length > 0, 'ATH: Quellen sollten gesetzt sein');
    assert(!Number.isNaN(action.verwendungen?.liquiditaet), 'ATH: Liquidität darf nicht NaN sein');
}

/**
 * Validiert, dass bei ATH mit höherer Deckung (aber immer noch unter Ziel)
 * das opportunistische Rebalancing greift - nicht die Notfüllung.
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

    // Bei ATH ohne Runway-Lücke sollte opportunistisches Rebalancing greifen
    assert(!action.title.includes('Notfüllung'), 'ATH Guardrail: Keine Notfüllung bei ATH ohne Runway-Lücke.');
    assertEqual(action.type, 'TRANSACTION', 'ATH Guardrail: Action type should be TRANSACTION');
    // Liquidität wird aufgefüllt (52k Gap zum Ziel)
    assert(action.verwendungen?.liquiditaet > 0, 'ATH Guardrail: Liquidität sollte aufgefüllt werden.');
    assert(action.quellen && action.quellen.length > 0, 'ATH Guardrail: Quellen sollten gesetzt sein');
}

runAthRegimeGapTest();
runGuardrailCliffTest();

console.log('✅ TransactionEngine ATH tests passed');
console.log('--- TransactionEngine ATH Tests Completed ---');
