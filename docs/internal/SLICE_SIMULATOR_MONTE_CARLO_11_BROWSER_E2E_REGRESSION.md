# Slice 11: Browser-E2E und Regressionsnachweis

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 03-10

## Ziel

Ein echter Browserlauf prueft den Monte-Carlo-Nutzerworkflow und die kritischen
Fehler-/Race-Pfade. Contracttests werden durch beobachtbares UI-Verhalten und
direkte/Worker-/Fallback-Paritaet ergaenzt.

## Akzeptanzkriterien

- E2E startet einen kleinen deterministischen MC-Lauf ueber die sichtbare UI.
- Ergebnis zeigt Outcome-Inventar, korrigierte KPIs, Unsicherheit und
  Samplingdiagnostik mit den erwarteten Labels.
- Export wird ausgeloest und gegen `MonteCarloExportV1` validiert.
- Mindestens Worker-Erfolg, erzwungener Fallback, technischer Fehler, Cancel und
  Neustart-mit-spaeter-Altantwort werden abgedeckt.
- Tastaturbedienung und zentrale ARIA-Attribute werden im Browser geprueft.
- Tests verwenden kleine Fixtures/Fake-Worker und bleiben deterministisch;
  keine externen Netzaufrufe oder festen Sleeps.
- Direkter und Workerpfad stimmen fuer den Golden Request im vereinbarten
  Contract ueberein.
- Eine deterministische Paritaetsmatrix variiert Workerzahl und Chunkgrenzen;
  diskrete und endliche Float-Per-Run-Felder stimmen innerhalb derselben
  Runtime exakt ueberein. Die Slice-01-Toleranz gilt nur fuer dokumentierte
  runtimeuebergreifende Snapshots.
- Kein neuer V1-Export oder UI-Consumer schreibt oder liest noch die
  befristeten Legacy-KPI-Aliase; ein Negativtest weist ihre Entfernung nach.

## Scope

- Browser-Testfixtures und MC-E2E-Faelle,
- nur minimale produktive Testhooks, falls ohne Produktionssonderpfad moeglich,
- Coverage-Inventar fuer zuvor ungetestete Orchestrierungs-/Rendererpfade.

## Nicht-Scope

- keine neue Fachfunktion,
- keine Pixelperfektion oder umfassende Cross-Browser-Matrix,
- kein Performancebenchmark auf Nutzerhardware.

## Geplante Dateien

- bestehende/neue Browser-Tests und Fixtures unter `tests/`,
- optional ein DOM-freier Worker-Testadapter,
- produktive Aenderungen nur bei nachgewiesener Testbarkeitsluecke und nach
  erneutem Diff-Risiko-Check.

Produktive Programmdateien: **0 geplant, maximal 2 nach Review**.

## Diff-Risiko vor Coding

- Branch und Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: mittel; asynchrone Browserfaelle koennen flakey werden.
- Gefaehrdete Tests: Browser-Smoke, Worker-Lifecycle, Downloadhandling.
- Nicht anfassen: Fachlogik, Engine, generierte Artefakte, produktive
  Test-Sonderpfade ohne Review.
- Rollback: neue Testdateien nur nach Freigabe entfernen; optionale Testadapter
  einzeln auf den Slice-10-Commit zurueckfuehren.

## Geplante Tests

- neue MC-E2E-Matrix fuer Erfolg/Fallback/Fehler/Cancel/Restart/Export,
- 1-/2-/4-Worker- und verschiedene Chunkaufteilungen fuer denselben Seed,
- Seedkonfiguration ueber den normalen MC-Request-/Profilvertrag, nicht ueber
  URL-Sonderparameter oder testexklusives LocalStorage,
- wiederholte Start-/Cancel-Interaktion ohne Worker-Churn,
- bestehendes `npm run test:browser`,
- relevante Worker-/Orchestrierungs-Unit-Suiten,
- `npm test`.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Browser-Download- und Workerfehler muessen ueber kontrollierte Testadapter
  injiziert werden; echte Zeitouts waeren ein Flakiness-Risiko.

## Rueckdokumentation und Freigabe

E2E-Fallmatrix, Laufzeiten, Coverage-Deltas und verbleibende Browserluecken in
den Hauptplan uebernehmen. Implementierung und Freigaben: ausstehend.

## Review-Feedback von Gemini

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice-spezifische Re-Review ist ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| C-01 | Claude | workerabhaengige Aggregation | angenommen | Worker-/Chunk-Paritaetsmatrix ergaenzt |
| G-05 | Gemini | Restart-Worker-Churn | angenommen | Browserfall fuer single-flight Cancel/Restart |
| Gemini Vertrag | Legacy-Aliase zeitlich begrenzen | angenommen | Entfernung als Negativtest |
