# Slice 03: Risiko-KPI-Semantik

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 01-02 und Entscheidung D-03

## Ziel

Volatilitaet und Kuerzungsanteil werden mathematisch korrekt, einheitlich
benannt und ueber alle Resultpfade transportiert.

## Akzeptanzkriterien

- Das Volatilitaetsfeld enthaelt `volPct`, nicht `maxDDpct`.
- Volatilitaet und maximaler Drawdown werden durch getrennte Golden Cases
  nachgerechnet; Einheiten und Annualisierung sind dokumentiert.
- Kuerzungsanteil speichert einen Anteil mit eindeutigem Nenner und identischer
  `>=`/`>`-Schwelle in Berechnung, Feldname, Tooltip und Export.
- Zaehler sind erfolgreich abgeschlossene Dekumulationsjahre mit Kuerzung
  `>= 10 %`; Nenner sind erfolgreich abgeschlossene Dekumulationsjahre mit
  endlicher Kuerzungsentscheidung. Nenner 0 ergibt nullable Missingness, nie
  0 oder NaN; ein beobachteter Anteil 0 bleibt davon unterscheidbar.
- Sofortiger Ruin, einjaehriger Horizont, keine Kuerzung und ausschliesslich
  starke Kuerzung sind definiert.
- Direkter, Worker- und Auto-Optimize-Pfad liefern dasselbe Ergebnis.
- Ein Post-Slice-03-Snapshot und ein Delta-Ledger dokumentieren getrennt die
  erwartete Volatilitaets- und Kuerzungssemantikaenderung, ohne die
  Pre-Hardening-Referenz zu ueberschreiben.

## Scope

- Risiko- und Kuerzungsberechnung im Runner/Metrikmodul,
- Buffer-/Aggregatfelder im V1-Chunkvertrag,
- Ergebnisaufbereitung und Labels,
- Golden Cases und Pfadparitaet.

## Nicht-Scope

- keine Pflege-KPIs, keine neue Erfolgsquote,
- keine Aenderung der zugrunde liegenden Engine-Entnahmeregel,
- keine empirische Risikomodellfreigabe.

## Geplante Dateien

- `app/simulator/monte-carlo-runner.js`,
- `app/simulator/mc-run-metrics.js`,
- `app/simulator/monte-carlo-chunk-result.js`,
- `app/simulator/results-metrics.js`,
- optional `app/simulator/results-renderers.js`,
- Tests/Fixtures.

Produktive Programmdateien: **maximal 5**.

## Diff-Risiko vor Coding

- Branch und Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: riskant, weil bestehende Felder ihre bisher falsche Semantik
  verlieren.
- Gefaehrdete Tests/Snapshots: MC-Runner, Results-Metrics, Worker-Paritaet,
  gespeicherte Erwartungswerte.
- Nicht anfassen: Engine-Helferformel, Pflege, Sampling, Worker-Lifecycle.
- Rollback: nur gelistete Produktiv- und neue Testdateien auf den Slice-02-Commit
  zurueckfuehren; bei unerwarteten Snapshots sofort stoppen.

## Geplante Tests

- Golden Cases mit bekannter Renditereihe fuer Volatilitaet und Drawdown,
- Kuerzungsnenner-/Schwellenfaelle,
- UI-/Exportfall fuer `null` versus beobachtete 0,
- direkte/Worker-/Auto-Optimize-Paritaet,
- Results-Label-/Formattertests,
- `npm test`.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- D-03 muss vor Coding auch den Nenner festlegen. Eine stille Umdeutung alter
  gespeicherter Resultate ist unzulaessig. D-03 ist in Revision 1 konkretisiert
  und wartet auf Re-Review.

## Rueckdokumentation und Freigabe

Finale Formeln, Feldmigration und Testergebnisse in Hauptplan und GAP-Matrix
zuruecktragen. Implementierung und Freigaben: ausstehend.

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
| G-02 | Gemini | Nullnenner bei sofortigem Ruin | angenommen | nullable Nennervertrag und Golden Cases ergaenzt |
| C-04 | Claude | Snapshotdrift | angenommen | Post-Slice-Snapshot/Delta-Ledger ergaenzt |
