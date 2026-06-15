/**
 * Module: Transaction Utils
 * Purpose: Helper functions for transactions.
 *          Includes Target Liquidity calculation, Min-Trade-Gate logic, and Anti-Pseudo-Accuracy quantization.
 * Usage: Shared utility for transaction modules.
 * Dependencies: config.mjs
 */
import { CONFIG } from '../config.mjs';
import { calculateSmoothedRunwayTargetMonths } from '../analyzers/regime-signals.mjs';

/**
 * Berechnet Ziel-Liquidität und Diagnose-Metadaten basierend auf Profil und Markt.
 */
export function calculateTargetLiquidityDetails(profil, market, inflatedBedarf, input = null) {
    // 1. Runway-Logik (Netto-Bedarf, falls man so will, aber hier wird oft Brutto verwendet)
    // Die aktuelle Implementierung nutzt Full Flex oder 50% Flex je nach Regime für die Ziel-Berechnung.
    // Das ist okay als "Runway"-Ziel.

    let calculatedTarget = 0;
    let runwayTargetDiagnostics = null;

    if (!profil.isDynamic) {
        calculatedTarget = (inflatedBedarf.floor + inflatedBedarf.flex) * 2;
        runwayTargetDiagnostics = {
            smoothingEnabled: false,
            smoothingActive: false,
            smoothingApplied: false,
            smoothingFallback: false,
            fallbackReason: 'static_profile',
            rawTargetMonths: null,
            targetMonths: null,
            lowerTargetMonths: null,
            upperTargetMonths: null,
            severity: 0,
            severityPct: 0,
            minRunwayMonths: input?.runwayMinMonths || profil.minRunwayMonths || null,
            hardMinimumMonths: input?.runwayMinMonths || profil.minRunwayMonths || null,
            source: 'input'
        };
    } else {
        const regime = CONFIG.TEXTS.REGIME_MAP[market.sKey];
        const profilMax = profil.runway[regime]?.total || profil.runway.hot_neutral.total;
        const minMonths = input?.runwayMinMonths || profil.minRunwayMonths;
        const hasExplicitRunwayTarget = Number.isFinite(input?.runwayTargetMonths) && input.runwayTargetMonths > 0;
        const smoothingConfig = CONFIG.REGIME_SMOOTHING || {};
        const runwaySmoothingConfig = smoothingConfig.RUNWAY_TARGETS || {};
        const smoothedTarget = calculateSmoothedRunwayTargetMonths({
            enabled: Boolean(smoothingConfig.TARGETS_ENABLED) && !hasExplicitRunwayTarget,
            profil,
            discreteTargetMonths: profilMax,
            minRunwayMonths: minMonths,
            severity: market?.regimeSignalSeverities?.drawdownSeverity,
            neutralRegime: runwaySmoothingConfig.NEUTRAL_REGIME,
            stressRegime: runwaySmoothingConfig.STRESS_REGIME
        });
        const effectiveProfilMax = smoothedTarget.targetMonths;
        const userTarget = hasExplicitRunwayTarget ? input.runwayTargetMonths : effectiveProfilMax;
        const smoothingEnabled = Boolean(smoothingConfig.TARGETS_ENABLED) && !hasExplicitRunwayTarget;
        const smoothingFallback = smoothingEnabled && !smoothedTarget.smoothingActive;
        runwayTargetDiagnostics = {
            smoothingEnabled,
            smoothingActive: Boolean(smoothedTarget.smoothingActive),
            smoothingApplied: Boolean(smoothedTarget.smoothingApplied),
            smoothingFallback,
            fallbackReason: smoothedTarget.fallbackReason || null,
            rawTargetMonths: Number.isFinite(smoothedTarget.rawTargetMonths) ? smoothedTarget.rawTargetMonths : null,
            targetMonths: Number.isFinite(userTarget) ? userTarget : null,
            lowerTargetMonths: Number.isFinite(smoothedTarget.lowerTargetMonths) ? smoothedTarget.lowerTargetMonths : null,
            upperTargetMonths: Number.isFinite(smoothedTarget.upperTargetMonths) ? smoothedTarget.upperTargetMonths : null,
            severity: Number.isFinite(smoothedTarget.severity) ? smoothedTarget.severity : 0,
            severityPct: Number.isFinite(smoothedTarget.severity) ? Math.round(smoothedTarget.severity * 100) : 0,
            minRunwayMonths: Number.isFinite(minMonths) ? minMonths : null,
            hardMinimumMonths: Number.isFinite(minMonths) ? minMonths : null,
            source: hasExplicitRunwayTarget
                ? 'input'
                : (smoothedTarget.smoothingActive ? 'profil:smoothed' : `profil:${regime}`)
        };

        // Bidirektionale ATH-Skalierung:
        // Über ATH -> mehr Puffer; unter ATH -> Puffer schrittweise reduzieren.
        const seiATH = market.seiATH || 1;
        let zielMonate;
        if (seiATH >= 1) {
            const aboveAthFactor = Math.min((seiATH - 1) * 5, 1);
            zielMonate = userTarget + aboveAthFactor * (effectiveProfilMax - userTarget);
        } else {
            const belowAthFactor = Math.min((1 - seiATH) * 2.5, 1);
            zielMonate = userTarget - belowAthFactor * (userTarget - minMonths);
        }

        // In Peak/Hot: voller Flex-Bedarf für den Ziel-Runway.
        // In schwierigeren Regimen: nur 50% Flex, um Ziel realistischer zu halten.
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
    const targetLiquidity = Math.ceil(calculatedTarget / 100) * 100;
    return {
        targetLiquidity,
        runwayTargetDiagnostics
    };
}

/**
 * Berechnet Ziel-Liquidität basierend auf Profil und Markt.
 */
export function calculateTargetLiquidity(profil, market, inflatedBedarf, input = null) {
    return calculateTargetLiquidityDetails(profil, market, inflatedBedarf, input).targetLiquidity;
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
    // Bei kritischer Liquidität: erhöhtes Cap erlauben
    // Wenn keine Aktien vorhanden (nur Gold), Cap auf Liquiditätsbedarf setzen,
    // um Verkauf aus Gold zu ermöglichen
    let effectiveMaxCap;
    if (isCriticalLiquidity) {
        if (aktienwert > 0) {
            effectiveMaxCap = Math.max(maxCapEuro, aktienwert * 0.10);
        } else {
            // Kein Aktienbestand - Cap auf Bedarf setzen um Gold-Verkauf zu erlauben
            effectiveMaxCap = liquiditaetsbedarf;
        }
    } else {
        effectiveMaxCap = maxCapEuro;
    }

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
