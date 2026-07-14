import {
    ANNUAL_PERIOD_STATUS,
    LEGACY_PERIOD_DECISION,
    checkAnnualPeriodCommit,
    completeAnnualPeriodCommit,
    createAnnualPeriodId,
    createAnnualPeriodMetadata,
    createAnnualPeriodPlan,
    deriveCompletedCalendarYear,
    preflightAnnualPeriod,
    resolveLegacyAnnualPeriod,
    startAnnualPeriodCommit
} from '../app/balance/balance-annual-period.js';

console.log('--- Balance Annual Period Contract Tests ---');

console.log('Test 1: target year and period id stay stable across execution dates');
{
    assertEqual(deriveCompletedCalendarYear(new Date(2026, 0, 1)), 2025, 'Jahresanfang schlaegt das abgeschlossene Vorjahr vor');
    assertEqual(deriveCompletedCalendarYear(new Date(2026, 6, 15)), 2025, 'Jahresmitte schlaegt dasselbe abgeschlossene Vorjahr vor');
    assertEqual(createAnnualPeriodId(2025), 'calendar-year:2025', 'Perioden-ID wird nur aus dem Zieljahr gebildet');
    assertEqual(deriveCompletedCalendarYear(new Date('invalid')), null, 'Ungueltiges Referenzdatum wird abgelehnt');
}

console.log('Test 2: ready preflight and plan describe one coherent annual transition');
{
    const metadata = createAnnualPeriodMetadata();
    const metadataBefore = JSON.stringify(metadata);
    const result = createAnnualPeriodPlan({ targetYear: 2025, currentAge: 67, metadata });

    assertEqual(result.status, ANNUAL_PERIOD_STATUS.READY, 'Initialisierte Metadaten sind bereit');
    assertEqual(result.plan.periodId, 'calendar-year:2025', 'Plan traegt stabile Perioden-ID');
    assertEqual(result.plan.age.before, 67, 'Plan dokumentiert Alter vorher');
    assertEqual(result.plan.age.after, 68, 'Plan dokumentiert Alter nachher');
    assertEqual(result.plan.inflation.year, 2025, 'Inflation gehoert zur Zielperiode');
    assertEqual(result.plan.marketData.year, 2025, 'Marktdaten gehoeren zur Zielperiode');
    assertEqual(result.plan.expenses.closingYear, 2025, 'Ausgabenabschluss gehoert zur Zielperiode');
    assertEqual(result.plan.expenses.nextYear, 2026, 'Ausgaben werden ins Folgejahr gerollt');
    assertEqual(JSON.stringify(metadata), metadataBefore, 'Planerstellung mutiert Metadaten nicht');
}

console.log('Test 3: invalid inputs return stable error objects');
{
    const result = preflightAnnualPeriod({ targetYear: 1899, currentAge: -1, metadata: createAnnualPeriodMetadata() });
    assertEqual(result.status, ANNUAL_PERIOD_STATUS.INVALID, 'Ungueltige Eingaben liefern invalid');
    assertEqual(result.errors[0].code, 'ANNUAL_PERIOD_TARGET_YEAR_INVALID', 'Jahresfehler hat stabilen Code');
    assertEqual(result.errors[0].field, 'targetYear', 'Jahresfehler hat stabiles Feld');
    assertEqual(result.errors[1].code, 'ANNUAL_PERIOD_CURRENT_AGE_INVALID', 'Altersfehler hat stabilen Code');
    assertEqual(createAnnualPeriodId(2025.5), null, 'Nicht-ganzzahliges Jahr erzeugt keine Perioden-ID');
}

console.log('Test 4: legacy state requires explicit confirmation without heuristics');
{
    const legacyState = { alter: 68, lastInflationAppliedAtAge: 68 };
    const legacyBefore = JSON.stringify(legacyState);
    const result = preflightAnnualPeriod({ targetYear: 2025, currentAge: 68 });

    assertEqual(result.status, ANNUAL_PERIOD_STATUS.LEGACY_CONFIRMATION_REQUIRED, 'Fehlende Metadaten verlangen Bestaetigung');
    assertEqual(result.proposedTargetYear, 2025, 'Zielperiode ist nur ein expliziter Vorschlag');
    assertEqual(result.errors[0].code, 'ANNUAL_PERIOD_LEGACY_CONFIRMATION_REQUIRED', 'Legacy-Status hat stabilen Fehlercode');
    assertEqual(JSON.stringify(legacyState), legacyBefore, 'Legacy-Nutzerdaten bleiben unberuehrt');
}

console.log('Test 5: legacy not-committed confirmation creates a ready baseline');
{
    const resolved = resolveLegacyAnnualPeriod({
        targetYear: 2025,
        decision: LEGACY_PERIOD_DECISION.NOT_COMMITTED
    });
    assertEqual(resolved.status, ANNUAL_PERIOD_STATUS.READY, 'Noch nicht abgeschlossene Periode wird bereit');
    assertEqual(resolved.metadata.lastCommittedPeriod, null, 'Baseline markiert keine Periode als abgeschlossen');
    assertEqual(
        preflightAnnualPeriod({ targetYear: 2025, currentAge: 67, metadata: resolved.metadata }).status,
        ANNUAL_PERIOD_STATUS.READY,
        'Bestaetigte Baseline darf genau einmal committen'
    );
}

console.log('Test 6: legacy already-committed confirmation blocks duplicate work');
{
    const resolved = resolveLegacyAnnualPeriod({
        targetYear: 2025,
        decision: LEGACY_PERIOD_DECISION.ALREADY_COMMITTED
    });
    assertEqual(resolved.status, ANNUAL_PERIOD_STATUS.ALREADY_COMMITTED, 'Bestaetigte Altperiode gilt als abgeschlossen');
    assertEqual(resolved.metadata.lastCommittedPeriod, 'calendar-year:2025', 'Baseline speichert bestaetigte Periode');
    assertEqual(
        createAnnualPeriodPlan({ targetYear: 2025, currentAge: 68, metadata: resolved.metadata }).plan,
        null,
        'Bereits abgeschlossene Legacy-Periode erzeugt keinen Mutationsplan'
    );
}

console.log('Test 7: cancelled legacy confirmation leaves metadata absent and remains blocked');
{
    const cancelled = resolveLegacyAnnualPeriod({ targetYear: 2025, decision: LEGACY_PERIOD_DECISION.CANCEL });
    assertEqual(cancelled.status, ANNUAL_PERIOD_STATUS.LEGACY_CONFIRMATION_REQUIRED, 'Abbruch bleibt bestaetigungspflichtig');
    assertEqual(cancelled.metadata, null, 'Abbruch erzeugt keine Baseline-Metadaten');
    assertEqual(
        preflightAnnualPeriod({ targetYear: 2025, currentAge: 67, metadata: cancelled.metadata }).status,
        ANNUAL_PERIOD_STATUS.LEGACY_CONFIRMATION_REQUIRED,
        'Wiederholung nach Abbruch bleibt blockiert'
    );
}

console.log('Test 8: partially present new metadata is invalid, not legacy');
{
    const result = preflightAnnualPeriod({
        targetYear: 2025,
        currentAge: 67,
        metadata: { schemaVersion: 1, lastCommittedPeriod: null }
    });
    assertEqual(result.status, ANNUAL_PERIOD_STATUS.INVALID, 'Teilmetadaten werden fail-closed abgelehnt');
    assertEqual(result.errors[0].code, 'ANNUAL_PERIOD_PENDING_COMMIT_INVALID', 'Fehlendes pendingCommit hat stabilen Code');
}

console.log('Test 9: commit transitions require a snapshot and expose recovery state');
{
    const metadata = createAnnualPeriodMetadata();
    const plan = createAnnualPeriodPlan({ targetYear: 2025, currentAge: 67, metadata }).plan;
    const missingSnapshot = startAnnualPeriodCommit({ plan, metadata, snapshotId: ' ' });
    assertEqual(missingSnapshot.status, ANNUAL_PERIOD_STATUS.INVALID, 'Commit ohne Snapshot wird blockiert');
    assertEqual(missingSnapshot.errors[0].code, 'ANNUAL_PERIOD_SNAPSHOT_ID_INVALID', 'Snapshot-Fehlercode bleibt stabil');

    const started = startAnnualPeriodCommit({ plan, metadata, snapshotId: 'snapshot-2025' });
    assertEqual(started.status, ANNUAL_PERIOD_STATUS.INCOMPLETE_RECOVERY, 'Gestarteter Commit ist bis Abschluss recovery-pflichtig');
    assertEqual(started.metadata.pendingCommit.periodId, plan.periodId, 'Recovery-Eintrag bindet die Periode');
    assertEqual(metadata.pendingCommit, null, 'Commit-Start mutiert Ausgangsmetadaten nicht');

    const recovery = preflightAnnualPeriod({ targetYear: 2025, currentAge: 67, metadata: started.metadata });
    assertEqual(recovery.status, ANNUAL_PERIOD_STATUS.INCOMPLETE_RECOVERY, 'Wiederholung erkennt halbfertigen Commit');
    assertEqual(recovery.recovery.snapshotId, 'snapshot-2025', 'Recovery liefert bestaetigten Snapshot');
}

console.log('Test 10: completed period cannot be committed twice');
{
    const metadata = createAnnualPeriodMetadata();
    const plan = createAnnualPeriodPlan({ targetYear: 2025, currentAge: 67, metadata }).plan;
    const started = startAnnualPeriodCommit({ plan, metadata, snapshotId: 'snapshot-2025' });
    const completed = completeAnnualPeriodCommit({ periodId: plan.periodId, metadata: started.metadata });

    assertEqual(completed.status, ANNUAL_PERIOD_STATUS.ALREADY_COMMITTED, 'Abschluss setzt committed-Status');
    assertEqual(completed.metadata.pendingCommit, null, 'Abschluss entfernt Recovery-Eintrag');
    assertEqual(completed.metadata.lastCommittedPeriod, plan.periodId, 'Abschluss speichert stabile Perioden-ID');

    const duplicate = checkAnnualPeriodCommit({ plan, metadata: completed.metadata });
    assertEqual(duplicate.status, ANNUAL_PERIOD_STATUS.ALREADY_COMMITTED, 'Wiederholter Commit wird erkannt');
    assertEqual(duplicate.canCommit, false, 'Dieselbe Periode darf nicht erneut committen');
}

console.log('Test 11: older periods and mismatched completion fail closed');
{
    const metadata = createAnnualPeriodMetadata({ lastCommittedPeriod: 'calendar-year:2026' });
    const older = preflightAnnualPeriod({ targetYear: 2025, currentAge: 68, metadata });
    assertEqual(older.status, ANNUAL_PERIOD_STATUS.INVALID, 'Rueckwaerts-Commit wird abgelehnt');
    assertEqual(older.errors[0].code, 'ANNUAL_PERIOD_BEFORE_LAST_COMMITTED', 'Rueckwaertsfehler hat stabilen Code');

    const readyMetadata = createAnnualPeriodMetadata();
    const plan = createAnnualPeriodPlan({ targetYear: 2025, currentAge: 67, metadata: readyMetadata }).plan;
    const started = startAnnualPeriodCommit({ plan, metadata: readyMetadata, snapshotId: 'snapshot-2025' });
    const mismatch = completeAnnualPeriodCommit({ periodId: 'calendar-year:2024', metadata: started.metadata });
    assertEqual(mismatch.status, ANNUAL_PERIOD_STATUS.INVALID, 'Falsche Completion-Periode wird abgelehnt');
    assertEqual(mismatch.errors[0].code, 'ANNUAL_PERIOD_COMMIT_MISMATCH', 'Mismatch hat stabilen Code');
}

console.log('Test 12: tampered derived plan fields cannot pass the commit check');
{
    const metadata = createAnnualPeriodMetadata();
    const plan = createAnnualPeriodPlan({ targetYear: 2025, currentAge: 67, metadata }).plan;
    const tamperedPlan = {
        ...plan,
        marketData: { year: 2026 }
    };
    const result = checkAnnualPeriodCommit({ plan: tamperedPlan, metadata });
    assertEqual(result.status, ANNUAL_PERIOD_STATUS.INVALID, 'Inkonsistentes Marktdatenjahr wird abgelehnt');
    assertEqual(result.errors[0].code, 'ANNUAL_PERIOD_PLAN_INVALID', 'Manipulierter Plan hat stabilen Fehlercode');
    assertEqual(result.canCommit, false, 'Manipulierter Plan darf nicht committen');
}

console.log('--- Balance Annual Period Contract Tests Completed ---');
