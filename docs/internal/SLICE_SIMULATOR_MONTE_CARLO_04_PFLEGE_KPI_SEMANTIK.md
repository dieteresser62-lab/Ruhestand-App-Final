# Slice 04: Pflege-KPI-Semantik

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 01-02 und Entscheidung D-04

## Ziel

Pflegeeintritt, -alter, -dauer, Haushaltskosten und Vergleichsdeltas werden
personenbezogen beziehungsweise haushaltsbezogen eindeutig getrennt.

## Akzeptanzkriterien

- P1- und P2-Eintrittsquoten haben getrennte Zaehler und passende Nenner.
- P1-/P2-Eintrittsalter enthalten keine `0`-Sentinels fuer Nicht-Eintritte.
- Leere bedingte Verteilungen liefern `null`, `sampleSize=0` und einen
  Missingness-Grund; das UI zeigt einen Gedankenstrich statt 0 oder NaN.
- P1-Pflegejahre werden nur P1, P2-Pflegejahre nur P2 zugeordnet.
- Gleichzeitige Pflegekosten werden als tatsaechliche Jahressumme und nicht als
  Maximum zweier Zielwerte erfasst.
- Ein "depotfinanzierter Pflegebetrag" wird nur angezeigt, wenn er direkt aus
  nachvollziehbaren Cashflows herleitbar ist; andernfalls wird das heutige Feld
  entfernt oder ehrlich umbenannt.
- Das Delta "ohne Pflege minus mit Pflege" besitzt die zum Label passende
  Vorzeichenkonvention.
- Monetare Pflege-KPIs im UI sind reale Euro zur Preisbasis des
  Simulationsstarts. Zusaetzliche Nominalwerte tragen im Export ein
  `NominalEur`-Suffix und werden nicht mit Realwerten aggregiert.
- P1-only, P2-only, beide, niemand und gleichzeitige Pflege sind Golden Cases.
- Ein Post-Slice-04-Snapshot und Delta-Ledger dokumentieren die erwarteten
  Semantikdeltas, ohne die Pre-Hardening-Referenz zu ueberschreiben.

## Scope

- Life-Event-/Run-Metriken und Pflegeaggregate,
- Szenarioanalyse fuer fruehe Pflegefaelle,
- Ergebnislabels/Tooltips und V1-Exportfelder,
- direkte/Worker-Paritaet.

## Nicht-Scope

- keine Aenderung der Pflegewahrscheinlichkeiten oder Tabellen,
- keine fachliche Neukalibrierung von Pflegekosten,
- keine Engine-Semantikaenderung.

## Geplante Dateien

- `app/simulator/mc-life-events.js`,
- `app/simulator/mc-run-metrics.js`,
- `app/simulator/monte-carlo-aggregates.js`,
- `app/simulator/scenario-analyzer.js`,
- `app/simulator/results-metrics.js`,
- `app/simulator/monte-carlo-chunk-result.js`,
- optional `app/simulator/results-renderers.js`,
- Tests/Fixtures.

Produktive Programmdateien: **maximal 7**.

## Diff-Risiko vor Coding

- Branch und vollstaendigen Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: riskant; mehrere bisher vermischte Bedeutungen werden
  aufgeteilt.
- Gefaehrdete Tests: Pflegeevents, Aggregates, Szenarioanalyse, Worker-Paritaet,
  Result-Renderer.
- Nicht anfassen: Pflegekalibrierung, Engine, Sampling, generierte Artefakte.
- Rollback: nur gelistete Slice-Dateien auf den Slice-02-Commit zurueckfuehren;
  bei unerwarteter Policy-/Engine-Abweichung stoppen.

## Geplante Tests

- fuenf deterministische Pflege-Golden-Cases,
- Verteilungsinvarianten ohne Null-Sentinels,
- Pflegewahrscheinlichkeit 0 und getrennte Tests fuer nullable Ergebnis,
  beobachtete 0 sowie reale/nominale Einheit,
- Kosten- und Delta-Vorzeichentests,
- Szenarioanalyse P1/P2,
- Worker-Paritaet und `npm test`.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Groesstes Risiko ist eine nicht direkt messbare Depotkostenmetrik. Falls der
  Cashflow-Contract sie nicht traegt, ist Entfernung der ehrliche Zielzustand.

## Rueckdokumentation und Freigabe

Finales Pflegedatenmodell, entfernte/umbenannte Felder und Tests in den
Hauptplan zuruecktragen. Implementierung und Freigaben: ausstehend.

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
| G-06 | Gemini | Leere Pflegeverteilungen | angenommen | null/sampleSize/UI-Gedankenstrich festgelegt |
| C-10 | Claude | Pflegekosteneinheit fehlt | angenommen | UI real zur Startpreisbasis, Exportfelder explizit |
| C-04 | Claude | Snapshotdrift | angenommen | Post-Slice-Snapshot/Delta-Ledger ergaenzt |
