# Slice 07: Schaetzerunsicherheit und Consumption at Risk

**Stand:** 2026-07-22
**Status:** Implementierung abgeschlossen; Gemini-/Nutzerreview ausstehend
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

- Branch vor Coding: `codex/simulator-monte-carlo-gap-plan`.
- Status vor Coding: ausschliesslich bereits vorgefundene unversionierte
  Playwright-Paketdateien unter `node_modules/`; keine versionierte Aenderung.
- Geplante Programmdateien:
  - neu `app/simulator/monte-carlo-statistics.js`,
  - `app/simulator/mc-run-metrics.js`,
  - `app/simulator/monte-carlo-aggregates.js`,
  - `app/simulator/monte-carlo-chunk-result.js`,
  - `app/simulator/results-metrics.js`,
  - optional `app/simulator/results-renderers.js`.
- Geplante Test-/Fixturedateien: fokussierte Statistik-, Run-Metrik-,
  Aggregates-, Chunk-, Results- und Worker-Paritaetstests sowie
  `tests/fixtures/monte-carlo-measurement/post-slice-07-v1.json` und das
  Delta-Ledger.
- Aenderungstiefe: mittel bis riskant; Nenner, Missingness und CaR-Stichprobe
  aendern sichtbare KPI-Werte.
- Gefaehrdete Tests/Snapshots: Aggregates, Chunk-/Runner-Vertraege, Results,
  Worker-Paritaet und gespeicherte Erwartungswerte.
- Nicht anfassen: Sampling, Engine, Outcomedefinition aus Slice 05 sowie die
  vorgefundenen unversionierten Playwright-Dateien.
- Rollback: `git checkout -- app/simulator/mc-run-metrics.js
  app/simulator/monte-carlo-aggregates.js
  app/simulator/monte-carlo-chunk-result.js app/simulator/results-metrics.js
  app/simulator/results-renderers.js`; neue Statistik-, Test- und
  Fixturedateien nur nach Freigabe entfernen. Bei unerwartetem KPI-,
  Snapshot-, Backtest- oder FlowDelta-Delta sofort stoppen und Nachrechnung
  beilegen.

## Geplante Tests

- Wilson-Grenzfaelle `0/n`, `n/n`, kleine und grosse `n`,
- definierte Behandlung technischer und zensierter Runs,
- CaR-Fixtures mit unterschiedlich langen Runs zur Erkennung von Length Bias,
- frueher Ruin mit Nullauffuellung, Tod vor Horizont, technischer Fehler,
  fehlende Dekumulationsbeobachtung und Stressfenster-Ruin,
- direkte/Worker-Paritaet, Results-Tests und `npm test`.

## Durchgefuehrte Aenderungen

- `monte-carlo-statistics.js` implementiert Wilson-95-Prozent-Intervalle fuer
  binaere Anteile, den fail-closed Floor-Schaetzer und die gleichgewichtete
  Aggregation eines realen Depotentnahme-P10-Skalars je evaluierbarem Run.
  Unter 1.000 Runs wird eine Klein-Stichproben-Warnung ausgegeben; die
  Interpretation grenzt Stichprobenfehler explizit von Modellrisiko ab.
- `MonteCarloOutcomeInventoryV1` traegt neben `floorCoveragePct` den
  vollstaendigen `floorCoverageEstimate` mit Zaehler, Nenner, Runzahl,
  Wilson-Intervall und Warnung. Bereits ein technischer Run unterdrueckt
  Punktschaetzer und Intervall, nicht aber das Outcome-Inventar.
- Der Runner erfasst nur Dekumulationsverpflichtungen. Ein unmittelbarer
  Ruinversuch zaehlt als Nullbeobachtung; nach Ruin fuehrt ein isolierter
  Life-State-Pfad nur Mortalitaet/Pflegezustand fort und schreibt fuer spaetere
  Verpflichtungen bis Tod oder Horizont weitere Nullen. Es werden dabei keine
  weiteren Marktdaten gezogen und keine Finanz-, Sampling- oder
  Pflegeaggregatmetriken fortgeschrieben.
- `MonteCarloPathSummaryV1` transportiert Haupt- und Stress-P10,
  Beobachtungszahl sowie Missingness global indexiert. Der Transferbedarf
  steigt von 75 auf 93 Byte je Run. Die fruehere `runIdx % 100`-Jahresstichprobe
  bleibt im kompatiblen Legacy-Shape leer und wird nicht mehr aggregiert.
- Das kanonische Aggregat `realWithdrawalP10` enthaelt P10/P50,
  `sampleSize`, Ausschluesse und Missingness. Der Stresspfad verwendet
  denselben Vertrag innerhalb seines festen Fensters. Die bisherigen
  CaR-Skalare bleiben vorlaeufig als deprecated Read-Aliase erhalten.
- Die Ergebnisoberflaeche zeigt Floor-Punktwert, Wilson-Intervall, Runzahl und
  Warnung sowie `Reale Depotentnahme P10` und den Stresswert mit
  Stichprobengroesse/Missingness. Fehlende Werte erscheinen als Gedankenstrich;
  fuer Quantile wird kein Konfidenzintervall behauptet.
- Golden Case `GC-CAR-01`, Post-Slice-07-Snapshot und zwei Delta-Ledger-Eintraege
  fixieren Wilson- und runbasierte CaR-Semantik einschliesslich Workerparitaet.

## Ausgefuehrte Tests

- Syntaxcheck der sechs produktiven Programmdateien: erfolgreich.
- Fokussierte Statistik-, Outcome-/Horizont-, Chunk-, Results-, Runner-,
  Worker-, Auto-Optimize-, Real-Withdrawal-, Pflege- und Messvertragssuiten:
  1438/1438 Assertions erfolgreich.
- `npm test`: 6630/6631 Assertions erfolgreich. Einzige Abweichung ist der
  bereits vor Slice 07 dokumentierte Architektur-Evidence-Fehler mit sechs
  toten Links auf zwei fehlende Forschungsdokumente. Alle uebrigen 124
  Testdateien sind gruen; keine neue Snapshot-, Backtest-, Worker- oder
  FlowDelta-Abweichung.

## Abweichungen vom Plan

- `mc-run-metrics.js` und `results-renderers.js` mussten nicht geaendert werden.
  Stattdessen wurden `monte-carlo-runner.js` fuer das standardisierte
  Bewertungsfenster und `mc-stress-tracker.js` fuer die Stress-Nullauffuellung
  angepasst. Die Grenze von sechs produktiven Programmdateien bleibt damit
  eingehalten.
- Der alte `allRealWithdrawalsSample`-Shape bleibt fuer bestehende
  Chunk-Consumer vorlaeufig vorhanden, wird produktiv aber leer geliefert und
  von der Aggregation ignoriert. Seine vollstaendige Entfernung bleibt Teil
  der geplanten Aliasbereinigung.

## Offene Risiken

- Ein Konfidenzintervall quantifiziert Simulationsfehler, nicht Modellrisiko;
  diese Aussage muss neben der Anzeige dokumentiert sein.
- Die Nullauffuellung beschreibt reale **Depotentnahme**, nicht gesamten
  Haushaltskonsum oder garantierte Versorgung. Deshalb ist die Umbenennung des
  UI-Feldes Teil des Akzeptanzkriteriums.
- Die Nach-Ruin-Fortschreibung simuliert bewusst nur den Life-State. Aenderungen
  an Mortalitaets- oder Pflegezustandsvertraegen muessen weiterhin nachweisen,
  dass die Anzahl der aufzufuellenden Verpflichtungsjahre direkt und im Worker
  identisch bleibt.

## Rueckdokumentation und Freigabe

Formeln, Nenner, Warnschwelle, CaR-Definition, Bufferdelta und
Missingness-Semantik sind im Hauptplan und in den Referenzdokumenten
rueckdokumentiert. Implementierung: abgeschlossen. Codex erteilt keine eigene
Freigabe und erstellt keinen Commit; Gemini-/Nutzerreview und Freigabe sind
ausstehend.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 07 löst P0-GAP MC-08 und MC-09 vollständig.
  - **MC-08 (Wilson-Konfidenzintervall & Stichprobenwarnung):** `computeBinomialProportionConfidenceIntervalV1` berechnet das exakte Wilson 95%-Konfidenzintervall. Das UI zeigt das Intervall transparent hinter der Floor-Deckung (`95.0% (95%-KI 94.5%–95.4%)`). Liegt die Runzahl unter 1000, wird ein visueller Hinweis und die Tone `warning` gesetzt.
  - **MC-09 (Reale Depotentnahme P10 / Ruin-Auffüllung mit 0 €):** Im Stress-Tracker (`mc-stress-tracker.js`) wird nach Ruin in verbleibenden Dekumulationsjahren explizit mit 0 Euro aufgefüllt (D-06). Das UI deklariert die Ruin-Auffüllung und stellt klar, dass für Quantile kein Konfidenzintervall geschätzt wird (*"Kein Quantil-Konfidenzintervall geschätzt"*).
* **Vertragstreue:** `monte-carlo-statistics.js` stellt einen isolierten, sauberen Statistik-Vertrag für Binomialproportionen und Quantile bereit.
* **Fehlerbehandlung:** 20 dedizierte Tests in `tests/monte-carlo-statistics.test.mjs` und 52 Tests in `tests/simulator-real-withdrawal-contract.test.mjs` belegen Fail-Closed-Verhalten bei 0/n, n/n oder technischen Fehlern im Batch.
* **Seiteneffekte:** Punktgenau **6 produktive Programmdateien** verändert (`mc-stress-tracker.js`, `monte-carlo-aggregates.js`, `monte-carlo-chunk-result.js`, `monte-carlo-runner.js`, `results-metrics.js`, `monte-carlo-statistics.js`). Alle Dokumentationen (`README.md`, `TECHNICAL.md`, `SIMULATOR_MODULES_README.md`, Hauptplan, GAP-Analyse, Slice-Dokument) wurden konsistent aktualisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Das Wilson-Intervall misst die Stichprobenunsicherheit der Simulation (Monte-Carlo-Fehler bei $N$ Läufen), NICHT das Modellrisiko (z. B. falsche Renditeannahmen). Diese Abgrenzung muss im UI-Tooltip deutlich bleiben.

### 2. Nummerierte Findings
* **Finding G-01-S7 (Strikte Trennung von Simulationsfehler und Modellrisiko):** Die Ausweisung des Wilson-95%-KI im UI ist explizit als Maßeinheit für die Simulationspräzision gekennzeichnet, um falsche Gewissheiten über reale Märkte zu vermeiden.
* **Finding G-02-S7 (Vollständige 0-Euro-Auffüllung nach Ruin bei CaR):** Durch die Ruin-Auffüllung mit 0 € spiegeln die Entnahme-P10-Werte im Ruinfall ehrliche Kaufeinbußen wider.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre die Verwechslung des schmalen Wilson-Konfidenzintervalls (bei z. B. 10.000 Läufen) mit der statistischen Sicherheit für das reale Depot durch den Nutzer. Abgesichert durch die deutliche Tooltip-Erklärung im UI.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Klare Trennung zwischen Simulationsfehler (Wilson-KI) und Modellrisiko für den Anwender aufrechterhalten.
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 07 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S7 | Gemini | Trennung Simulationsfehler vs Modellrisiko | angenommen | In `results-metrics.js` und Tooltip-Text umgesetzt |
| G-02-S7 | Gemini | 0-Euro-Auffüllung nach Ruin | angenommen | In `mc-stress-tracker.js` umgesetzt |
| G-01 | Gemini | Ruin-Paradoxon bei CaR | angenommen | standardisiertes Fenster und Nullauffuellung festgelegt |
| C-05 | Claude | G-01 formal ungeloest | angenommen | D-06 und Slice-Akzeptanz konkretisiert |
| C-07 | Claude | Pfadgranularitaet fehlt | angenommen mit Praezisierung | Per-Run-P10 statt voller Jahrespfade |
| C-04 | Claude | Snapshotdrift | angenommen | Post-Slice-Snapshot/Delta-Ledger ergaenzt |
