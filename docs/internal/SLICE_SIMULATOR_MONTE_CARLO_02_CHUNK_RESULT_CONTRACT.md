# Slice 02: Zentraler Chunk-Result-Vertrag

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slice 01 gruen, reviewt und lokal committet

## Ziel

Ein `MonteCarloChunkResultV1` mit indexiertem `MonteCarloPathSummaryV1` ersetzt
die duplizierten manuellen Merge-Listen in UI-Orchestrierung und Auto-Optimize.
Neue KPI-Felder erhalten damit genau einen deterministischen Aggregationspfad.

## Akzeptanzkriterien

- Erzeugung, Formpruefung, Merge und Finalisierung liegen in einem DOM-freien
  Modul.
- Buffer-, Counter-, Listen- und Diagnostikfelder sind explizit registriert.
- Jeder Run wird ueber `start + localIndex` genau einem globalen Slot
  zugeordnet. Completion-Reihenfolge, Workerzahl und adaptive Chunkgrenze
  veraendern diese Zuordnung nicht.
- Per-Run-Summaries enthalten die in Abschnitt 3.3 des Hauptplans definierten
  Skalare. Bedingte Werte nutzen Wert-plus-Maske/Missingness-Code statt
  completion-order-abhaengiger Append-Listen.
- Vollstaendige Jahrespfade werden nicht transferiert. CaR und andere
  pfadbasierte Kennzahlen werden pro Run im Chunk berechnet und als Skalar samt
  Beobachtungszahl zurueckgegeben.
- Gleitkommaaggregate werden bei Finalisierung in globaler Runreihenfolge aus
  den Per-Run-Summaries berechnet. Integercounter duerfen direkt summiert
  werden; Tie-Breaks verwenden den kleinsten globalen Runindex.
- Inkompatible Versionen, Laengen oder Datentypen werden fail-closed abgewiesen.
- Merge ist assoziativ fuer zulaessige Chunks; Reihenfolge veraendert keine
  fachlichen Resultate. Es gibt keine fachlich relevante, nur dokumentierte
  Listenreihenfolge mehr.
- Simulator, Workerantwort und Auto-Optimize nutzen denselben Vertrag.
- Bestehende Seed-/Worker-Paritaet bleibt gruen.

## Scope

- zentraler Chunk-Result-Vertrag,
- Per-Run-Summary-, Missingness- und deterministischer Finalisierungsvertrag,
- Migration der beiden Consumer-Merges,
- Contract-, Merge- und Paritaetstests.

## Nicht-Scope

- keine inhaltliche Korrektur einzelner KPIs,
- keine Sampling- oder Worker-Lifecycle-Aenderung,
- keine Engine-Aenderung.

## Geplante Dateien

- neu `app/simulator/monte-carlo-chunk-result.js`,
- `app/simulator/simulator-monte-carlo.js`,
- `app/simulator/auto-optimize-worker.js`,
- falls fuer den Export noetig `workers/mc-worker.js`,
- Tests fuer Chunkvertrag und Paritaet.

Produktive Programmdateien: **maximal 4**.

## Diff-Risiko vor Coding

- Branch und vollstaendigen Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: riskant; der Mergepfad traegt alle Ergebnisfelder.
- Gefaehrdete Tests: MC-Runner, Worker-Contract, Worker-Paritaet, Auto-Optimize.
- Nicht anfassen: KPI-Formeln, Sampling, Engine, generierte Artefakte.
- Rollback: ausschliesslich die oben genannten Slice-Dateien auf den vor Slice 02
  reviewten Commit zurueckfuehren; neue Moduldatei nur nach Freigabe entfernen.

## Geplante Tests

- neue Contracttests fuer leere/einzelne/mehrere/fehlerhafte Chunks,
- Permutations- und Laengenfehlerfaelle,
- identische Ergebnisse bei absichtlich vertauschter Completion-Reihenfolge,
  1/2/4 Workern und mindestens drei Chunkaufteilungen,
- O(Runs)-Speicherinvariante; kein Jahrespfadarray im Workerresultat,
- bestehende `mc-worker-contract`, `worker-parity`, `simulator-monte-carlo` und
  Auto-Optimize-Suiten,
- `npm test`.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Risiko: ein nicht inventarisierter Consumer behielte eine eigene Feldliste.
  Vor Edit ist daher ein `rg`-Consumer-Inventar als Nachweis anzufuegen.
- C-07 wird bewusst nicht durch vollstaendige Pfaduebertragung geloest: Die
  vorhandenen Endwertbuffer sind bereits per Run; neu hinzukommende CaR- und
  Missingness-Skalare reichen fuer den beschlossenen Vertrag. Ein spaeteres
  Bootstrap-Quantil-CI waere ein eigener Contract und ist Nicht-Scope.

## Rueckdokumentation und Freigabe

Hauptplan nach Abschluss um finales Schema, Consumerliste und Testergebnisse
ergaenzen. Implementierung und Freigaben: ausstehend.

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
| C-01 | Claude | Aggregationsreihenfolge workerabhaengig | angenommen | global indexierte Summaries/Finalisierung geplant |
| C-07 | Claude | Pfadgranularitaet unklar | angenommen mit Praezisierung | Per-Run-Skalare, keine vollen Jahrespfade |
| C-09 | Claude | Snapshot-Workerconfig fehlt | angenommen | Contracttests variieren Worker/Chunks |
