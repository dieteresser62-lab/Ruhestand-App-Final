import { CONFIG } from '../config.mjs';

/**
 * Berechnet Ziel-Liquidität basierend auf Profil und Markt
 */
export function calculateTargetLiquidity(profil, market, inflatedBedarf, input = null) {
    // 1. Runway-Logik (Netto-Bedarf, falls man so will, aber hier wird oft Brutto verwendet)
    // Die aktuelle Implementierung nutzt Full Flex oder 50% Flex je nach Regime für die Ziel-Berechnung.
    // Das ist okay als "Runway"-Ziel.

    let calculatedTarget = 0;

    if (!profil.isDynamic) {
        calculatedTarget = (inflatedBedarf.floor + inflatedBedarf.flex) * 2;
    } else {
        const regime = CONFIG.TEXTS.REGIME_MAP[market.sKey];
        const profilMax = profil.runway[regime]?.total || profil.runway.hot_neutral.total;
        const minMonths = input?.runwayMinMonths || profil.minRunwayMonths;
        const userTarget = input?.runwayTargetMonths || profilMax;

        // Bidirektionale ATH-Skalierung
        const seiATH = market.seiATH || 1;
        let zielMonate;
        if (seiATH >= 1) {
            const aboveAthFactor = Math.min((seiATH - 1) * 5, 1);
            zielMonate = userTarget + aboveAthFactor * (profilMax - userTarget);
        } else {
            const belowAthFactor = Math.min((1 - seiATH) * 2.5, 1);
            zielMonate = userTarget - belowAthFactor * (userTarget - minMonths);
        }

        const useFullFlex = (regime === 'peak' || regime === 'hot_neutral');
        const anpassbarerBedarf = useFullFlex
            ? (inflatedBedarf.floor + inflatedBedarf.flex)
            : (inflatedBedarf.floor + 0.5 * inflatedBedarf.flex);

        calculatedTarget = (Math.max(1, anpassbarerBedarf) / 12) * zielMonate;
    }

    // 2. Mindest-Puffer (Brutto)
    // "sicherheitsPuffer" im Sinne von: Waschmaschine muss bezahlbar sein.
    // Auch wenn durch Rente monatliche Entnahme 0 ist.
    const minBufferMonths = (input && input.minCashBufferMonths !== undefined)
        ? input.minCashBufferMonths
        : 2; // Default 2 Monate

    // FIX: inflatedBedarf ist bereits um die Rente reduziert (Netto).
    // Wir brauchen hier aber den Brutto-Bedarf für den "Waschmaschinen-Puffer".
    // Daher nutzen wir die Werte aus dem Input, falls verfügbar.
    let bruttoJahresbedarf = inflatedBedarf.floor + inflatedBedarf.flex;

    if (input && (input.floorBedarf !== undefined || input.flexBedarf !== undefined)) {
        const fBedarf = Number(input.floorBedarf) || 0;
        const flexB = Number(input.flexBedarf) || 0;
        bruttoJahresbedarf = fBedarf + flexB;
    }

    const bruttoMonatsbedarf = bruttoJahresbedarf / 12;
    const absoluteBufferTarget = bruttoMonatsbedarf * minBufferMonths;

    calculatedTarget = Math.max(calculatedTarget, absoluteBufferTarget);

    // Rundung auf 100er
    return Math.ceil(calculatedTarget / 100) * 100;
}

/**
 * Berechnet gewichtete Allokation
 */
export function computeWeights(input, gesamtwert) {
    if (gesamtwert <= 0) {
        return { eqWeight: 0, goldWeight: 0, liqWeight: 0 };
    }

    const aktienwert = input.depotwertAlt + input.depotwertNeu;
    const goldwert = input.goldAktiv ? input.goldWert : 0;
    const liquiditaet = input.tagesgeld + input.geldmarktEtf;

    return {
        eqWeight: aktienwert / gesamtwert,
        goldWeight: goldwert / gesamtwert,
        liqWeight: liquiditaet / gesamtwert
    };
}

/**
 * Quantisiert einen Betrag gemäß Anti-Pseudo-Accuracy Regeln
 */
export function quantizeAmount(amount, mode = 'ceil') {
    if (!CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED) return amount;

    const tiers = CONFIG.ANTI_PSEUDO_ACCURACY.QUANTIZATION_TIERS;
    const tier = tiers.find(t => amount < t.limit);
    const step = tier ? tier.step : 25000;

    if (mode === 'ceil') {
        return Math.ceil(amount / step) * step;
    }
    return Math.floor(amount / step) * step;
}

/**
 * Berechnet begrenztes Auffüllen (mit Cap)
 */
export function computeCappedRefill({
    isBearContext,
    liquiditaetsbedarf,
    aktienwert,
    input,
    isCriticalLiquidity = false
}) {
    const capConfig = isBearContext
        ? {
            pct: input.maxBearRefillPctOfEq,
            title: 'Bärenmarkt-Auffüllung (Drip)',
            diagStep: 'Cap wirksam (Bär)'
        }
        : {
            pct: input.maxSkimPctOfEq,
            title: 'Opportunistisches Rebalancing (Skim & Fill)',
            diagStep: 'Cap wirksam (Skim)'
        };

    const maxCapEuro = (capConfig.pct / 100) * aktienwert;
    // Bei kritischer Liquidität: erhöhtes Cap erlauben (10% des Aktienwerts)
    let effectiveMaxCap = isCriticalLiquidity
        ? Math.max(maxCapEuro, aktienwert * 0.10)
        : maxCapEuro;

    // ANTI-PSEUDO-ACCURACY: Auch das Cap runden (abrunden, um Limit einzuhalten)
    effectiveMaxCap = quantizeAmount(effectiveMaxCap, 'floor');

    // ANTI-PSEUDO-ACCURACY: Liquiditätsbedarf 'aufrunden', um glatte Summe zu erhalten
    const quantizedBedarf = quantizeAmount(liquiditaetsbedarf, 'ceil');

    const nettoBedarf = Math.min(quantizedBedarf, effectiveMaxCap);
    const isCapped = nettoBedarf < liquiditaetsbedarf;

    // Bei kritischer Liquidität: stark reduzierte Mindestschwelle verwenden
    // Wenn isCriticalLiquidity true ist, setzen wir das Limit auf 0, um JEDE notwendige Auffüllung zu erlauben
    // und so den "Notfall-Verkauf" im Folgejahr zu verhindern.
    const effectiveMinRefill = isCriticalLiquidity
        ? 0
        : CONFIG.THRESHOLDS.STRATEGY.minRefillAmount;

    if (nettoBedarf < effectiveMinRefill) {
        if (liquiditaetsbedarf >= effectiveMinRefill) {
            return {
                bedarf: 0,
                title: '',
                diagnosisEntries: [{
                    step: "Aktion unterdrückt",
                    impact: `Geplanter Verkauf (${nettoBedarf.toFixed(0)}€) unter Mindestgröße nach Capping.`,
                    status: 'inactive',
                    severity: 'guardrail'
                }],
                isCapped
            };
        }
        return { bedarf: 0, title: '', diagnosisEntries: [], isCapped };
    }

    const title = isCapped ? `${capConfig.title} (Cap aktiv)` : capConfig.title;
    const diagnosisEntries = isCapped
        ? [{
            step: capConfig.diagStep,
            impact: `Auffüllen auf ${nettoBedarf.toFixed(0)}€ (${capConfig.pct}%) begrenzt.`,
            status: 'active',
            severity: 'guardrail'
        }]
        : [];

    return { bedarf: nettoBedarf, title, diagnosisEntries, isCapped };
}

/**
 * Ermittelt die anwendbare Mindest-Trade-Schwelle für liquiditätsgetriebene Aktionen.
 *
 * @param {Object} params - Parameterobjekt
 * @param {number} params.investiertesKapital - Gesamtwert des Portfolios inkl. Liquidität
 * @param {number} params.liquiditaetsBedarf - Geplanter Liquiditätszufluss (ohne Gold)
 * @param {number} params.totalerBedarf - Gesamter Zielzufluss (inklusive etwaiger Gold-Beschaffungen)
 * @returns {{ appliedMinTradeGate: number, minTradeResultOverride: (number|null), diagnosisEntry: (Object|null) }}
 */
export function computeAppliedMinTradeGate({ investiertesKapital, liquiditaetsBedarf, totalerBedarf }) {
    const basisMinTrade = Math.max(
        CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
        investiertesKapital * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
    );
    const liquidityEmergencyGate = Math.max(
        CONFIG.THRESHOLDS.STRATEGY.minRefillAmount || 0,
        CONFIG.THRESHOLDS.STRATEGY.cashRebalanceThreshold || 0
    );

    let appliedMinTradeGate = basisMinTrade;
    let minTradeResultOverride = null;
    let diagnosisEntry = null;

    const shouldRelaxMinTradeGate =
        liquiditaetsBedarf > 0 && totalerBedarf > 0 && totalerBedarf < basisMinTrade;

    if (shouldRelaxMinTradeGate) {
        appliedMinTradeGate = Math.min(basisMinTrade, liquidityEmergencyGate);

        if (appliedMinTradeGate < basisMinTrade) {
            minTradeResultOverride = appliedMinTradeGate;
            diagnosisEntry = {
                step: 'Liquiditäts-Priorität',
                impact: `Mindestschwelle temporär auf ${appliedMinTradeGate.toFixed(0)}€ gesenkt (statt ${basisMinTrade.toFixed(0)}€).`,
                status: 'active',
                severity: 'info'
            };
        }
    }

    return { appliedMinTradeGate, minTradeResultOverride, diagnosisEntry };
}
