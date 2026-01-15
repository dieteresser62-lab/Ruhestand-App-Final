import assert from 'node:assert';
import { TransactionEngine } from './TransactionEngine.mjs';
import { CONFIG } from '../config.mjs';

/**
 * TestSuite: Gold Rebalancing Logic
 * 
 * Szenario: Gold ist stark überbewertet (z.B. > 30% statt 7.5%).
 * Erwartung: Die Engine muss einen Verkauf von Gold auslösen, um wieder in das Band zu kommen.
 */

function runGoldDriftTest() {
    console.log('--- Start: Gold Drift Simulation Test ---');

    const market = {
        sKey: 'side_long', // Normales Regime
        szenarioText: 'Seitwärtsphase',
        seiATH: 0.95 // Nahe ATH
    };

    // Szenario aus User-Log (Jahr 29 ca.):
    // Aktien: ~16.4M, Gold: ~7.1M, Liq: ~42k
    // Total Portfolio: ~23.5M
    // Gold Anteil: 7.1M / 23.5M ≈ 30%
    // Ziel: 7.5%
    // Band: 25% (von 7.5% -> 5.625% bis 9.375%)

    // Wir setzen Liq so, dass KEIN Liquiditätsbedarf besteht, um Isolierung zu testen.
    const zielLiquiditaet = 150000;
    const aktuelleLiquiditaet = 150000;

    const input = {
        tagesgeld: aktuelleLiquiditaet / 2,
        geldmarktEtf: aktuelleLiquiditaet / 2,

        depotwertAlt: 8000000,
        costBasisAlt: 4000000,
        tqfAlt: 0.30,
        depotwertNeu: 8439000,
        costBasisNeu: 6000000,
        tqfNeu: 0.30,

        goldAktiv: true,
        goldWert: 7187000, // Enormer Wert
        goldCost: 2000000,
        goldSteuerfrei: true,
        goldZielProzent: 7.5,
        rebalancingBand: 25, // +/- 25% vom Ziel (nicht PP!)
        rebalBand: 25,

        renteAktiv: false,
        renteMonatlich: 0,
        floorBedarf: 30000,
        flexBedarf: 10000,

        targetEq: 100 - 7.5, // Rest in Aktien (vereinfacht)
        maxSkimPctOfEq: 10,

        minGold: 0
    };

    const profil = CONFIG.PROFIL_MAP['sicherheits-dynamisch']; // Irrelevant hier
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu + input.goldWert;
    const minGold = 0;

    console.log(`Setup:
    Total Wealth: ${(depotwertGesamt + aktuelleLiquiditaet).toLocaleString()} €
    Gold Wert   : ${input.goldWert.toLocaleString()} €
    Gold Ziel   : ${(depotwertGesamt * 0.075).toLocaleString()} €
    Upper Limit : ${(depotwertGesamt * 0.075 * 1.25).toLocaleString()} €
    `);

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

    console.log('Action Result:', JSON.stringify(action, null, 2));

    // Assertions
    if (action.type !== 'TRANSACTION') {
        console.error('FAIL: Keine Transaktion ausgelöst trotz massivem Gold-Überschuss!');
        process.exit(1);
    }

    // Prüfen ob Gold verkauft wird
    // quellen array sollte eintrag mit kind: 'gold' haben
    const goldVerkauf = action.quellen?.find(q => q.kind === 'gold');
    if (!goldVerkauf || goldVerkauf.netto <= 0) {
        console.error('FAIL: Transaktion ausgelöst, aber kein Gold verkauft!');
        process.exit(1);
    }

    console.log(`SUCCESS: Gold-Verkauf ausgelöst. Netto: ${goldVerkauf.netto.toLocaleString()} €`);
}

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runGoldDriftTest();
}
