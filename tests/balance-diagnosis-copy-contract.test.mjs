import { createDiagnosisHandlers } from '../app/balance/balance-binder-diagnosis.js';

console.log('--- Balance Diagnosis Copy Contract Tests ---');

function countOccurrences(text, needle) {
    return text.split(needle).length - 1;
}

const dom = {
    diagnosis: {
        filterToggle: { checked: false }
    }
};

const appState = {
    lastUpdateTimestamp: '2026-05-12T08:30:00.000Z',
    diagnosisData: {
        general: {
            marketSzenario: 'bear_deep',
            alarmActive: true,
            deckungVorher: 72,
            deckungNachher: 105,
            runwayMonate: 18,
            runwayTargetMonate: 36,
            runwayTargetQuelle: 'dynamic',
            runwayStatus: 'warn'
        },
        keyParams: {
            entnahmequoteDepot: 0.041,
            realerDepotDrawdown: -0.18,
            peakRealVermoegen: 1000000,
            currentRealVermoegen: 820000,
            cumulativeInflationFactor: 1.18,
            aktuelleFlexRate: 78,
            minFlexRatePct: 65,
            kuerzungProzent: 22,
            jahresentnahme: 42000,
            vpw: {
                enabled: true,
                status: 'active',
                horizonMethod: 'survival_quantile',
                horizonYears: 10,
                survivalQuantile: 0.9,
                vpwRate: 0.085,
                expectedRealReturn: -0.01,
                expectedReturnCape: 0.052,
                capeRatioUsed: 30.5,
                goGoActive: true,
                goGoMultiplier: 1.15,
                safetyStage: 2,
                gesamtwert: 820000,
                vpwTotal: 65000,
                staticFlexBaseline: 36000,
                dynamicFlex: 52000
            },
            healthBucket: {
                enabled: true,
                lockedAmount: 150000,
                operativeLiquidity: 40000,
                targetCoveragePct: 75,
                targetGap: 50000,
                releaseReason: 'Balance zeigt den Pflegebucket nur als Zweckbindung.'
            }
        },
        decisionTree: [
            { status: 'active', step: 'Runway pruefen', impact: 'Refill noetig' },
            { status: 'inactive', step: 'Gold kaufen', impact: 'Nicht ausgeloest' }
        ],
        guardrails: [
            { name: 'Runway', value: '18 Monate', threshold: '> 36 Monate', status: 'danger' },
            { name: 'Drawdown', value: '-18,0 %', threshold: '< 20,0 %', status: 'ok' }
        ],
        transactionDiagnostics: {
            wasTriggered: true,
            blockReason: 'cap_active',
            blockedAmount: 12500,
            potentialTrade: {
                direction: 'Verkauf',
                netAmount: 50000
            },
            equityThresholds: {
                maxSellAmount: 50000,
                capRatePct: 12
            },
            goldThresholds: {
                targetGoldValue: 45000,
                currentGoldValue: 30000
            }
        }
    }
};

const handlers = createDiagnosisHandlers({ dom, appState });
const text = handlers.generateDiagnosisText(appState.diagnosisData);

assertEqual(countOccurrences(text, '--- Status-Übersicht ---'), 1, 'Diagnose-Copytext sollte den Statusblock nur einmal enthalten');
assert(text.includes('--- Transaktionsdiagnostik ---'), 'Copytext sollte Transaktionsdiagnostik enthalten');
assert(text.includes('Status: WARN (Cap begrenzt Trade)'), 'Copytext sollte Blockgrund lesbar uebersetzen');
assert(text.includes('Geplante Aktion: Verkauf'), 'Copytext sollte geplante Aktion ausgeben');
assert(text.includes('Aktien-Grenzen:'), 'Copytext sollte Aktien-Grenzen ausgeben');
assert(text.includes('Gold-Grenzen:'), 'Copytext sollte Gold-Grenzen ausgeben');
assert(text.includes('--- Dynamic Flex (VPW) ---'), 'Copytext sollte VPW-Block enthalten');
assert(text.includes('VPW-Sicherheitsmodus: Stufe 2'), 'Copytext sollte VPW-Sicherheitsmodus ausgeben');
assert(text.includes('Warnsignale:'), 'Copytext sollte VPW-Warnsignale ausgeben');
assert(text.includes('automatische Freigabe: Nein'), 'Copytext sollte die Balance-Freigabepolicy ausgeben');
assert(text.includes('Pflegebucket-Policy:'), 'Copytext sollte die Pflegebucket-Policy begruenden');

console.log('Balance diagnosis copy contract tests passed');
console.log('--- Balance Diagnosis Copy Contract Tests Completed ---');
