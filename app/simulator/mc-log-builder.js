import { sumDepot } from './simulator-portfolio.js';

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
    lifeLogContext
}) {
    return {
        jahr: simulationsJahr + 1,
        histJahr: yearData.jahr,
        inflation: yearData.inflation,
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
        RunwayCoveragePct: 0,
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
    lifeLogContext
}) {
    return {
        jahr: simulationsJahr + 1,
        histJahr: yearData.jahr,
        inflation: yearData.inflation,
        ...result.logData,
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
        jahr: deathLogContext?.jahr ?? (currentRunLogLength + 1),
        histJahr: deathLogContext?.histJahr ?? null,
        inflation: deathLogContext?.inflation ?? null,
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
        RunwayCoveragePct: 0,
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
