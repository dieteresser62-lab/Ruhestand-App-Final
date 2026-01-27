import { TransactionEngine } from '../engine/transactions/TransactionEngine.mjs';

console.log('--- Gold Buy vs Liquidity Gap Tests ---');

// Minimal profile with runway targets used by TransactionEngine.
const mockProfile = {
    minRunwayMonths: 24,
    isDynamic: true,
    runway: {
        'bear': { total: 60 },
        'peak': { total: 48 },
        'recovery_in_bear': { total: 48 },
        'hot_neutral': { total: 36 }
    }
};

// Create a default scenario with a liquidity gap (target > current).
function getBaseParams() {
    return {
        aktuelleLiquiditaet: 50000,
        depotwertGesamt: 500000,
        zielLiquiditaet: 130000,
        market: { sKey: 'hot_neutral', szenarioText: 'Normal', seiATH: 1 },
        spending: { monatlicheEntnahme: 3600 },
        minGold: 0,
        profil: mockProfile,
        input: {
            floorBedarf: 24000,
            flexBedarf: 20000,
            renteAktiv: false,
            renteMonatlich: 0,
            targetEq: 80,
            rebalancingBand: 25,
            rebalBand: 5,
            maxSkimPctOfEq: 5,
            maxBearRefillPctOfEq: 5,
            runwayMinMonths: 24,
            runwayTargetMonths: 36,

            depotwertAlt: 300000,
            costBasisAlt: 200000,
            tqfAlt: 0.30,
            depotwertNeu: 200000,
            costBasisNeu: 180000,
            tqfNeu: 0.30,

            goldAktiv: true,
            goldZielProzent: 7.5,
            goldWert: 0,
            goldCost: 0,

            tagesgeld: 50000,
            geldmarktEtf: 0,
            kirchensteuerSatz: 0,
            sparerPauschbetrag: 0
        }
    };
}

// --- TEST 1: No gold buy when liquidity below target ---
{
    const params = getBaseParams();
    const result = TransactionEngine.determineAction(params);

    assert(result.type !== 'NONE', 'Should trigger a transaction when liquidity is below target');
    assert(!(result.verwendungen?.gold > 0), 'Should not buy gold while liquidity gap exists');

    console.log('✅ Gold buy blocked under liquidity gap passed');
}

// --- TEST 2: Gold buy allowed when liquidity surplus exists ---
{
    const params = getBaseParams();
    // Flip to surplus cash to ensure gold purchases are allowed.
    params.aktuelleLiquiditaet = 200000;
    params.zielLiquiditaet = 130000;
    params.input.tagesgeld = 200000;

    const result = TransactionEngine.determineAction(params);

    assert(result.type !== 'NONE', 'Should trigger a transaction when surplus exists');
    assert(result.verwendungen?.gold > 0, 'Should allow gold buy from surplus cash');

    console.log('✅ Gold buy from surplus passed');
}

console.log('--- Gold Buy vs Liquidity Gap Tests Completed ---');
