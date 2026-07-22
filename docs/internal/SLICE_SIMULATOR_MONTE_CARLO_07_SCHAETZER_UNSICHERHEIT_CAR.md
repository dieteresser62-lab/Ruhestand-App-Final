# Slice 07: Schaetzerunsicherheit und Consumption at Risk

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 03 und 05 sowie Entscheidung D-06

## Ziel

Punktschaetzer werden mit Stichprobengroesse und Unsicherheit ausgewiesen. Die
bisherige Consumption-at-Risk-Karte wird als `Reale Depotentnahme P10`
transparent und runbasiert definiert.

## Akzeptanzkriterien

- Die Floor-Deckungsquote zeigt Runzahl, Schaetzer und ein reviewtes
  Konfidenzintervall (Vorschlag: Wilson 95 Prozent).
- Bei fehlerfreiem Batch ist `requestedRuns` der Nenner und
  `all_dead + horizon_exhausted` der Zaehler. `horizon_exhausted` bleibt als
  zensiertes Outcome separat sichtbar. Sobald ein `technical_error` vorliegt,
  werden Quote und Intervall fuer den Gesamtbatch fail-closed als `null`
  unterdrueckt; das Outcome-Inventar bleibt sichtbar.
- Kleine Runzahlen erzeugen eine sichtbare Unsicherheitswarnung, keine falsche
  Praezision.
- Das Per-Run-Bewertungsfenster beginnt mit der ersten geplanten
  Dekumulationsverpflichtung einschliesslich eines sofortigen Ruinversuchs und
  endet bei Tod aller Personen oder Horizont. Nach Ruin werden Jahre, in denen
  noch mindestens eine Person lebt, mit realer Depotentnahme 0 aufgefuellt.
- Technische Fehler und Tod aller Personen vor jeder
  Dekumulationsverpflichtung liefern `null` plus Missingness-Grund. Ruin bei
  der ersten Verpflichtung und noch lebende Personen erzeugt durch die
  Nullauffuellung einen beobachteten Per-Run-P10 von 0.
- Der Chunk berechnet P10 und Beobachtungszahl pro Run und uebertraegt diese
  indexiert im `MonteCarloPathSummaryV1`; keine volle Jahresreihe und keine
  `runIdx % 100`-Stichprobe wird uebertragen.
- Ueber evaluierbare Runs zeigt das Ergebnis P10, P50, `sampleSize` und
  Missingness-Inventar. Der Stress-CaR-Pfad nutzt dieselbe Nullauffuellung
  innerhalb seines festen Stressfensters.
- Direkter und Workerpfad liefern identische Schaetzer.
- Wilson-Intervalle gelten nur fuer binaere Floor-Deckungsquoten. Dieser Slice
  verspricht kein Bootstrap-Konfidenzintervall fuer Quantile; eine solche
  Erweiterung waere wegen Abhaengigkeits- und Pfaddatenvertrag separat zu
  reviewen.
- Ein Post-Slice-07-Snapshot und Delta-Ledger dokumentieren das erwartete
  CaR-/Unsicherheitsdelta.

## Scope

- reine Statistikhelfer fuer Anteil/Intervall und runbasierte CaR-Aggregation,
- erforderliche Run-/Chunkfelder,
- Ergebnisdarstellung, Tooltips und Tests.

## Nicht-Scope

- keine formale Modellvalidierung oder Garantie eines realen Erfolgsniveaus,
- kein Bayes-Modell, keine adaptive Runzahl,
- keine Aenderung der Entnahmepolicy.

## Geplante Dateien

- neu oder bestehend `app/simulator/monte-carlo-statistics.js`,
- `app/simulator/mc-run-metrics.js`,
- `app/simulator/monte-carlo-aggregates.js`,
- `app/simulator/monte-carlo-chunk-result.js`,
- `app/simulator/results-metrics.js`,
- optional `app/simulator/results-renderers.js`,
- Tests/Fixtures.

Produktive Programmdateien: **maximal 6**.

## Diff-Risiko vor Coding

- Branch und Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: mittel bis riskant; Nenner und CaR-Stichprobe aendern
  angezeigte Werte.
- Gefaehrdete Tests: Aggregates, Results, Worker-Paritaet und gespeicherte
  Erwartungswerte.
- Nicht anfassen: Sampling, Engine, Outcomedefinition aus Slice 05.
- Rollback: nur gelistete Dateien auf die freigegebenen Slices 03/05; bei
  unerwarteten KPI-Deltas stoppen und Nachrechnung beilegen.

## Geplante Tests

- Wilson-Grenzfaelle `0/n`, `n/n`, kleine und grosse `n`,
- definierte Behandlung technischer und zensierter Runs,
- CaR-Fixtures mit unterschiedlich langen Runs zur Erkennung von Length Bias,
- frueher Ruin mit Nullauffuellung, Tod vor Horizont, technischer Fehler,
  fehlende Dekumulationsbeobachtung und Stressfenster-Ruin,
- direkte/Worker-Paritaet, Results-Tests und `npm test`.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Ein Konfidenzintervall quantifiziert Simulationsfehler, nicht Modellrisiko;
  diese Aussage muss neben der Anzeige dokumentiert sein.
- Die Nullauffuellung beschreibt reale **Depotentnahme**, nicht gesamten
  Haushaltskonsum oder garantierte Versorgung. Deshalb ist die Umbenennung des
  UI-Feldes Teil des Akzeptanzkriteriums.

## Rueckdokumentation und Freigabe

Formeln, Nenner, Warnschwelle und CaR-Definition im Hauptplan dokumentieren.
Implementierung und Freigaben: ausstehend.

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
| G-01 | Gemini | Ruin-Paradoxon bei CaR | angenommen | standardisiertes Fenster und Nullauffuellung festgelegt |
| C-05 | Claude | G-01 formal ungeloest | angenommen | D-06 und Slice-Akzeptanz konkretisiert |
| C-07 | Claude | Pfadgranularitaet fehlt | angenommen mit Praezisierung | Per-Run-P10 statt voller Jahrespfade |
| C-04 | Claude | Snapshotdrift | angenommen | Post-Slice-Snapshot/Delta-Ledger ergaenzt |
