# Slice 06: Sampling-Praezedenz und Diagnostik

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 01-02 und Entscheidung D-05

## Ziel

CAPE, Filter, Recency, Regime, Blockmethoden und Tail-Risk erhalten einen
versionierten, reproduzierbaren Praezedenzvertrag. Der tatsaechlich gezogene
Pfad wird diagnostizierbar, ohne grosse Rohdaten standardmaessig in der UI zu
halten.

## Akzeptanzkriterien

- Fixed-Block beginnt den vollstaendigen ersten Block am CAPE-Startrecord;
  zulaessige Startindices garantieren, dass der Block innerhalb der
  freigegebenen Datenfolge liegt.
- Stationary Bootstrap initialisiert seinen ersten Block ebenfalls am
  CAPE-Startrecord und wendet erst danach seine Wiederanlaufwahrscheinlichkeit
  an. Regime-Markov initialisiert das Startregime aus diesem Record; Regime-IID
  darf ab Jahr 2 unabhaengig ziehen.
- CAPE und Startgewichtung koennen nicht gleichzeitig unbemerkt gegensaetzliche
  Quellen steuern; ignorierte Optionen werden deaktiviert oder als Warnung
  ausgewiesen.
- Seed-Ableitung bleibt unabhaengig von Workerzahl und Chunking.
- Filter-/Recency-/Regime-/Tail-Risk-Reihenfolge ist als Tabelle dokumentiert.
- Diagnostik nennt mindestens Methode, Startquelle, Anzahl gezogener Jahre,
  Regime-/Tail-Risk-Zaehler und Datenversion.
- Alle Methoden bestehen deterministische Golden Cases und Worker-Paritaet.
- Erwartete Snapshot-Aenderungen werden vor Annahme als Contractaenderung zur
  Review vorgelegt; unerwartete Abweichungen stoppen den Slice.
- Ein Post-Slice-06-Snapshot und Delta-Ledger dokumentieren erwartete
  Pfadaenderungen; die Pre-Hardening-Referenz bleibt unveraendert.

## Scope

- `MonteCarloSamplingContractV1`,
- Startjahres- und Jahressampling,
- schlanke Samplingdiagnostik im Chunkresultat,
- UI-Hinweis auf wirksame/ignorierte Optionen,
- Contract-, Statistik- und Paritaetstests.

## Nicht-Scope

- keine empirische Wahl der "besten" Samplingmethode,
- keine Aenderung historischer Renditedaten,
- keine Tail-Risk-Kalibrierung oder Engine-Aenderung.

## Geplante Dateien

- `app/simulator/mc-year-sampling.js`,
- `app/simulator/monte-carlo-runner.js`,
- `app/simulator/mc-run-context.js`,
- `app/simulator/monte-carlo-chunk-result.js`,
- `app/simulator/monte-carlo-ui.js`,
- optional `app/simulator/simulator-monte-carlo.js`,
- Tests/Fixtures.

Produktive Programmdateien: **maximal 6**.

## Diff-Risiko vor Coding

- Branch und Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: riskant; identische Seeds koennen nach einer bewusst
  geaenderten Praezedenz andere Pfade erzeugen.
- Gefaehrdete Tests/Snapshots: Sampling, Startjahr, Stationary Bootstrap,
  Tail-Risk, Worker-Paritaet, Backtest nur bei ungewollter Kopplung.
- Nicht anfassen: Daten, Engine, KPI-Semantik ausser Diagnostik.
- Rollback: gelistete Dateien auf den Slice-02-Commit; bei unerwarteter
  Snapshot-/Backtestabweichung sofort stoppen und Diff dokumentieren.

## Geplante Tests

- Matrix aus Samplingmethode x CAPE x Filter x Recency x Regime x Tail-Risk,
- deterministische Startjahr-/Folgejahr-Golden-Cases,
- zusammenhaengender erster Fixed-/Stationary-Block und Regimeinitialisierung,
- Seed-/Chunk-/Workerinvarianz,
- Fehlerfaelle bei leerer Kandidatenmenge,
- bestehende Sampling-, Startjahr-, Worker-Paritaetstests und `npm test`.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Die vorgeschlagene Jahr-1-Regel ist eine fachlich sichtbare Contractaenderung
  und darf ohne erneute Freigabe der konkretisierten D-05-Entscheidung nicht
  implementiert werden.

## Rueckdokumentation und Freigabe

Finale Praezedenztabelle, Diagnostikfelder und bewusst geaenderte Snapshots im
Hauptplan dokumentieren. Implementierung und Freigaben: ausstehend.

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
| G-04 | Gemini | CAPE-Jahr bricht Blockautokorrelation | angenommen | erster Block startet am CAPE-Record |
| C-04 | Claude | Snapshotdrift | angenommen | Post-Slice-Snapshot/Delta-Ledger ergaenzt |
