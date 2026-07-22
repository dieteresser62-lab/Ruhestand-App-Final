# Slice 05: Outcome- und Horizontvertrag

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 01-02 und Entscheidungen D-01/D-02

## Ziel

Jeder Run erhaelt genau einen terminalen Zustand. Horizontende, Tod,
Depotunterschreitung und technischer Fehler werden nicht mehr zu einer
mehrdeutigen Erfolgsquote verdichtet. Dauer-, Alters- und Buffergrenzen werden
explizit validiert.

## Akzeptanzkriterien

- `ruin`, `all_dead`, `horizon_exhausted` und `technical_error` sind disjunkt
  und vollstaendig; ihre Summe entspricht der angeforderten Runzahl.
- Technische Fehler erscheinen separat und zaehlen nie als fachlicher Erfolg.
- Sobald mindestens ein `technical_error` vorliegt, werden Floor-Deckungsquote
  und Intervall fuer den Gesamtbatch fail-closed `null`; das Outcome-Inventar
  bleibt zur Diagnose sichtbar. Bei fehlerfreiem Batch ist
  `all_dead + horizon_exhausted` der Zaehler und `requestedRuns` der Nenner.
- Terminale Auswahl folgt einer getesteten Jahreschronologie: technischer
  Fehler invalidiert; Ruin in einem begonnenen Finanzjahr bleibt Ruin;
  `all_dead` gilt nur vor der naechsten finanziellen Verpflichtung ohne
  vorherigen Ruin; Horizontende ist der letzte Fallback fuer lebende Runs.
- Falls ein Adapter widerspruechliche Terminalflags ausserhalb dieser
  Chronologie liefert, entsteht `technical_error` statt stiller Reparatur.
- Bei Horizontende lebende Faelle werden als zensiert/`horizon_exhausted`
  ausgewiesen.
- UI und Export verwenden die in D-01 beschlossene Bezeichnung.
- Erschoepfungsalter und Laufdauer koennen alle zulaessigen Werte ohne
  `Uint8`-Ueberlauf oder mehrdeutigen Sentinel abbilden.
- Mortalitaet ausserhalb des Tabellenbereichs wird in allen Simulatorpfaden
  identisch und fail-closed behandelt; keine stillen gegensaetzlichen Fallbacks.
- Grenzen bei Alter 110, maximalem Horizont und Tod im letzten Jahr sind durch
  Golden Cases belegt.
- Ein Post-Slice-05-Snapshot und Delta-Ledger dokumentieren das erwartete
  Outcome-/Bufferdelta; die Pre-Hardening-Referenz bleibt unveraendert.

## Scope

- terminale Zustandsmaschine und Inventar,
- Run-Metrikbuffer fuer Dauer/Alter/Outcome,
- Simulatorseitige Mortalitaetsgrenzen,
- Ergebnisaggregation und -darstellung.

## Nicht-Scope

- keine Aenderung der Mortalitaetstabelle oder ihrer empirischen Kalibrierung,
- keine Engine-Semantikaenderung,
- keine neue Lebenserwartungsmodellierung.

## Geplante Dateien

- `app/simulator/monte-carlo-runner.js`,
- `app/simulator/mc-run-metrics.js`,
- `app/simulator/monte-carlo-aggregates.js`,
- `app/simulator/monte-carlo-chunk-result.js`,
- `app/simulator/results-metrics.js`,
- optional `app/simulator/results-renderers.js`,
- optional gemeinsamer Simulator-Mortalitaetshelfer,
- Tests/Fixtures.

Produktive Programmdateien: **maximal 7**.

## Diff-Risiko vor Coding

- Branch und Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: riskant; Headline-KPI, Bufferbreite und Endbedingung sind
  betroffen.
- Gefaehrdete Tests/Snapshots: Runner, Results, Worker-Paritaet, Sweep-/MC-
  Grenzfaelle und Backtests bei gemeinsamem Helfer.
- Nicht anfassen: Engine, Mortalitaetsdaten, Sampling, generierte Artefakte.
- Rollback: nur gelistete Dateien auf den letzten freigegebenen Commit; bei
  Snapshot-/Backtest-/FlowDelta-Abweichung sofort stoppen.

## Geplante Tests

- je ein deterministischer Fall pro terminalem Zustand,
- Ruin und Todesstatus im selben begonnenen Finanzjahr, Tod vor Jahrespflicht
  sowie widerspruechliche Adapterflags,
- Invariante `sum(outcomes) === requestedRuns`,
- Alters-/Dauergrenzen und Sentinel-Migration,
- MC-/Sweep-Fallback-Paritaet, sofern derselbe Simulatorcontract gilt,
- Worker-Paritaet, Results-Tests und `npm test`.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Sollte ein gemeinsamer Mortalitaetscontract Engine-Semantik beruehren, greift
  die Stop-Regel; der Slice darf dann nicht eigenmaechtig fortgesetzt werden.
- Die Prioritaetsregel behauptet nicht, Ruin verursache Tod; sie ordnet nur
  bereits phasenweise festgestellte Terminalereignisse deterministisch zu.

## Rueckdokumentation und Freigabe

Outcome-Inventar, UI-Begriff, Bufferentscheidung und Grenztests in Hauptplan
und GAP-Matrix dokumentieren. Implementierung und Freigaben: ausstehend.

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
| G-03 | Gemini | Ruin/Tod-Prioritaet unklar | angenommen mit Phasenpraezisierung | Jahreschronologie und Konflikttests ergaenzt |
| C-04 | Claude | Snapshotdrift | angenommen | Post-Slice-Snapshot/Delta-Ledger ergaenzt |
| C-05 | Claude | Gemini-Blocker formal offen | angenommen | D-02 und Akzeptanzkriterien konkretisiert |
