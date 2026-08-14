import { sumDepot } from './simulator-portfolio.js';

function buildTailRiskLogFields(tailRiskOverlay = null) {
    return {
        tailRiskActive: tailRiskOverlay?.tailRiskActive === true,
        tailRiskApplied: tailRiskOverlay?.tailRiskApplied === true,
        tailRiskSkippedReason: tailRiskOverlay?.tailRiskSkippedReason ?? null,
        tailRiskEventType: tailRiskOverlay?.tailRiskEventType ?? null,
        tailRiskEventId: tailRiskOverlay?.tailRiskEventId ?? null,
        tailRiskEventYearOffset: tailRiskOverlay?.tailRiskEventYearOffset ?? null,
        tailRiskReturnShockPct: tailRiskOverlay?.tailRiskReturnShockPct ?? 0,
        tailRiskInflationShockPct: tailRiskOverlay?.tailRiskInflationShockPct ?? 0,
        tailRiskHistoricalReturnPct: tailRiskOverlay?.historicalReturnPct ?? null,
        tailRiskEffectiveReturnPct: tailRiskOverlay?.effectiveReturnPct ?? null,
        tailRiskHistoricalInflationPct: tailRiskOverlay?.historicalInflationPct ?? null,
        tailRiskEffectiveInflationPct: tailRiskOverlay?.effectiveInflationPct ?? null,
        tailRiskHistoricalCrisis: tailRiskOverlay?.historicalCrisis === true,
        tailRiskHistoricalCrisisReasons: Array.isArray(tailRiskOverlay?.historicalCrisisReasons)
            ? tailRiskOverlay.historicalCrisisReasons.join(',')
            : ''
    };
}

function buildMonteCarloLifeLogFields({
    hasPartner,
    p1Alive,
    p2Alive,
    careMetaP1,
    careMetaP2,
    p1ActiveThisYear,
    p2ActiveThisYear,
    includeLegacyCareGrade = false
}) {
    const fields = {
        Person1Alive: p1Alive ? 1 : 0,
        Person2Alive: hasPartner ? (p2Alive ? 1 : 0) : null,
        pflege_aktiv: !!(careMetaP1 && careMetaP1.active)
    };

    if (includeLegacyCareGrade) {
        fields.pflege_grade = careMetaP1?.grade ?? null;
        fields.pflege_grade_label = careMetaP1?.gradeLabel ?? '';
    }

    return {
        ...fields,
        pflege_zusatz_floor: careMetaP1?.zusatzFloorZiel ?? 0,
        pflege_zusatz_floor_delta: careMetaP1?.zusatzFloorDelta ?? 0,
        pflege_flex_faktor: careMetaP1?.flexFactor ?? 1,
        pflege_kumuliert: careMetaP1?.kumulierteKosten ?? 0,
        pflege_floor_anchor: careMetaP1?.log_floor_anchor ?? 0,
        pflege_maxfloor_anchor: careMetaP1?.log_maxfloor_anchor ?? 0,
        pflege_cap_zusatz: careMetaP1?.log_cap_zusatz ?? 0,
        pflege_delta_flex: careMetaP1?.log_delta_flex ?? 0,
        CareP1_Active: p1ActiveThisYear ? 1 : 0,
        CareP1_Cost: p1ActiveThisYear ? (careMetaP1?.zusatzFloorZiel ?? 0) : 0,
        CareP1_Grade: p1ActiveThisYear ? (careMetaP1?.grade ?? null) : null,
        CareP1_GradeLabel: p1ActiveThisYear ? (careMetaP1?.gradeLabel ?? '') : '',
        CareP2_Active: p2ActiveThisYear ? 1 : 0,
        CareP2_Cost: p2ActiveThisYear ? (careMetaP2?.zusatzFloorZiel ?? 0) : 0,
        CareP2_Grade: p2ActiveThisYear ? (careMetaP2?.grade ?? null) : null,
        CareP2_GradeLabel: p2ActiveThisYear ? (careMetaP2?.gradeLabel ?? '') : ''
    };
}

export function buildMonteCarloRuinLogRow({
    simulationsJahr,
    yearData,
    inputs,
    lifeLogContext,
    tailRiskOverlay = null
}) {
    return {
        recordType: 'terminal_ruin',
        financiallyEvaluable: false,
        jahr: simulationsJahr + 1,
        histJahr: yearData.jahr,
        inflation: yearData.inflation,
        ...buildTailRiskLogFields(tailRiskOverlay),
        aktionUndGrund: '>>> RUIN <<<',
        wertAktien: 0,
        wertGold: 0,
        liquiditaet: 0,
        entscheidung: { jahresEntnahme: 0 },
        floor_brutto: 0,
        rente1: inputs.rente1 || 0,
        rente2: inputs.rente2 || 0,
        renteSum: (inputs.rente1 || 0) + (inputs.rente2 || 0),
        FlexRatePct: 0,
        flex_erfuellt_nominal: 0,
        QuoteEndPct: 0,
        RunwayCoveragePct: null,
        RunwayMeasurementPhase: 'not_applicable_terminal_ruin',
        RunwayCoveragePostPayoutEndOfYearPct: null,
        runway_after_transaction_before_payout_months: null,
        runway_post_payout_end_of_year_months: null,
        RealReturnEquityPct: 0,
        RealReturnGoldPct: 0,
        jahresentnahme_real: 0,
        ...buildMonteCarloLifeLogFields({
            ...lifeLogContext,
            includeLegacyCareGrade: true
        }),
        vpw: null
    };
}

export function buildMonteCarloYearLogRow({
    simulationsJahr,
    yearData,
    result,
    lifeLogContext,
    tailRiskOverlay = null
}) {
    return {
        jahr: simulationsJahr + 1,
        histJahr: yearData.jahr,
        inflation: yearData.inflation,
        ...buildTailRiskLogFields(tailRiskOverlay),
        ...result.logData,
        recordType: 'financial_year',
        financiallyEvaluable: true,
        ...buildMonteCarloLifeLogFields(lifeLogContext),
        vpw: result.ui?.vpw || null
    };
}

export function buildMonteCarloDeathLogRow({
    deathLogContext,
    currentRunLogLength,
    portfolioSnapshot,
    inputs,
    lifeLogContext
}) {
    return {
        recordType: 'terminal_death',
        financiallyEvaluable: false,
        jahr: deathLogContext?.jahr ?? (currentRunLogLength + 1),
        histJahr: deathLogContext?.histJahr ?? null,
        inflation: deathLogContext?.inflation ?? null,
        ...buildTailRiskLogFields(deathLogContext?.tailRiskOverlay ?? null),
        aktionUndGrund: '>>> ENDE: Alle Personen verstorben <<<',
        wertAktien: sumDepot({ depotTranchesAktien: portfolioSnapshot.depotTranchesAktien }),
        wertGold: sumDepot({ depotTranchesGold: portfolioSnapshot.depotTranchesGold }),
        liquiditaet: portfolioSnapshot.liquiditaet ?? 0,
        entscheidung: { jahresEntnahme: 0 },
        floor_brutto: 0,
        rente1: inputs.rente1 || 0,
        rente2: inputs.rente2 || 0,
        renteSum: (inputs.rente1 || 0) + (inputs.rente2 || 0),
        FlexRatePct: 0,
        flex_erfuellt_nominal: 0,
        QuoteEndPct: 0,
        RunwayCoveragePct: null,
        RunwayMeasurementPhase: 'not_applicable_all_persons_deceased',
        RunwayCoveragePostPayoutEndOfYearPct: null,
        runway_after_transaction_before_payout_months: null,
        runway_post_payout_end_of_year_months: null,
        RealReturnEquityPct: 0,
        RealReturnGoldPct: 0,
        jahresentnahme_real: 0,
        ...buildMonteCarloLifeLogFields({
            ...lifeLogContext,
            includeLegacyCareGrade: true
        }),
        vpw: null
    };
}

function cloneReplayLogValue(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

/**
 * Rebuilds the exact simulator-facing annual data shape from a materialized
 * replay record. No sampling or fallback return is allowed here.
 */
export function buildStressReplayYearData(record) {
    if (!record || typeof record !== 'object') {
        throw new TypeError('A materialized stress replay year is required.');
    }
    const financiallyRunnable = record.recordType === 'financial_year'
        || record.recordType === 'terminal_ruin';
    if (!financiallyRunnable) {
        return {
            jahr: record.historicalYear ?? null,
            inflation: record.inflationPct ?? null
        };
    }
    return {
        jahr: record.historicalYear,
        rendite: record.equityReturnPct / 100,
        gold_eur_perf: record.goldReturnPct,
        zinssatz: record.cashReturnPct,
        inflation: record.inflationPct,
        lohn: record.wageGrowthPct,
        capeRatio: record.capeRatio,
        regime: record.regime
    };
}

/** Projects the stored household event into the existing MC log contract. */
export function buildStressReplayLifeLogContext(record) {
    const event = Array.isArray(record?.householdEvents)
        ? record.householdEvents.find(candidate => candidate?.type === 'household_state')
        : null;
    if (!event) return null;
    const hasPartner = event.p2Alive !== null && event.p2Alive !== undefined;
    return {
        hasPartner,
        p1Alive: event.p1Alive === 1 || event.p1Alive === true,
        p2Alive: hasPartner && (event.p2Alive === 1 || event.p2Alive === true),
        careMetaP1: cloneReplayLogValue(event.careMetaP1),
        careMetaP2: cloneReplayLogValue(event.careMetaP2),
        p1ActiveThisYear: event.p1CareActive === true,
        p2ActiveThisYear: event.p2CareActive === true
    };
}

/**
 * Builds ScenarioLog-compatible output without consulting an RNG or the DOM.
 */
export function buildStressReplayLogRow({
    record,
    result = null,
    inputs,
    portfolioSnapshot = {},
    currentRunLogLength = 0
}) {
    const yearData = buildStressReplayYearData(record);
    const lifeLogContext = buildStressReplayLifeLogContext(record);
    if (!lifeLogContext) {
        const error = new TypeError('Stress replay household state is missing.');
        error.code = 'STRESS_REPLAY_HOUSEHOLD_EVENT_MISSING';
        throw error;
    }
    const tailRiskOverlay = Array.isArray(record.tailRiskEvents) && record.tailRiskEvents.length > 0
        ? cloneReplayLogValue(record.tailRiskEvents.at(-1))
        : null;

    if (record.recordType === 'terminal_death') {
        return buildMonteCarloDeathLogRow({
            deathLogContext: {
                jahr: record.yearIndex + 1,
                histJahr: record.historicalYear ?? null,
                inflation: record.inflationPct ?? null,
                tailRiskOverlay
            },
            currentRunLogLength,
            portfolioSnapshot,
            inputs,
            lifeLogContext
        });
    }
    if (result?.kind === 'ruin' || result?.isRuin === true) {
        return buildMonteCarloRuinLogRow({
            simulationsJahr: record.yearIndex,
            yearData,
            inputs,
            lifeLogContext,
            tailRiskOverlay
        });
    }
    return buildMonteCarloYearLogRow({
        simulationsJahr: record.yearIndex,
        yearData,
        result,
        lifeLogContext,
        tailRiskOverlay
    });
}
