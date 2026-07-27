# Slice 09 - Drawdown, Outcomes und faire Sweep-Vergleiche

**Stand:** 2026-07-27  
**Status:** freigegeben - unabhaengiges Re-Review (Claude & Gemini) abgeschlossen  

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini), optional Claude  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** SWP-01, SWP-08 und SWP-09  
**Prioritaet:** P1

Sweep-Metriken erhalten einen versionierten Ergebnis- und
Drawdown-Messvertrag. Der terminale Ruin fliesst vor dem Abbruch als
Vermoegenswert 0 in die Drawdownserie ein. Parameterkombinationen verwenden
je Run-Index dieselben Zufallspfade (Common Random Numbers, CRN), damit
beobachtete Differenzen nicht aus unterschiedlichen Seeds stammen.
Heatmap, Constraints, Pareto und Parametervergleich lesen denselben
validierten Metrikshape. Die Nutzeroberflaeche weist Runzahl,
Simulationsunsicherheit und den experimentellen Charakter von
Quantilrankings sichtbar aus.

## Verbindliche Entscheidungen

- **D-06:** `worst5Drawdown` ist P95 eines nichtnegativen
  Drawdown-Verlustmasses in Prozent. Groessere Werte sind schlechter.
  Terminalruin nach einem positiven Peak entspricht 100 Prozent.
- **D-07:** Alle Kombinationen verwenden fuer denselben Run-Index denselben
  abgeleiteten Run-Seed und denselben Setup-Seed. Ergebnisprovenienz
  dokumentiert Seedbasis, Ableitungsvertrag und Samplingmethode.
- Die Erfolgsquote erhaelt ein Wilson-95-Prozent-Intervall. Fuer
  Vermoegens- und Drawdownquantile wird kein unbelegtes Konfidenzintervall
  erfunden; die UI kennzeichnet solche Rankings als experimentellen
  Punktschaetzer.
- Ohne belastbaren Quantil-Unsicherheitsausweis wird keine Strategie als
  objektiv „beste“ oder „optimal“ bezeichnet. Angezeigt wird nur die im
  konkreten experimentellen Vergleich fuehrende Kombination.

## Akzeptanzkriterien

- O-14 ist gruen.
- Die handberechnete Verteilung 1 bis 100 liefert fuer
  `worst5Drawdown` das P95 des schlechten, grossen Verlusttails.
- Ein Verlauf von einem positiven Peak auf den terminalen Wert 0 liefert
  exakt 100 Prozent maximalen Drawdown.
- Zwei wirkungsgleiche Kombinationen erhalten fuer jeden Run-Index
  denselben Seed, identische Sampling-Rohpfade und identische Metriken.
- Seeds, CRN-Policy, Samplingmethode, Runzahl und Metrikdefinitionen sind im
  exportierbaren Sweep-Execution-/Resultshape enthalten.
- Erfolgsquote, Quantilwerte und Drawdown bleiben numerisch getrennte
  Felder. Metrikmetadaten dokumentieren Einheit, Richtung, Rohquelle,
  Quantil und Terminalruin-Semantik.
- Heatmap, Constraints, Pareto und Parametervergleich lehnen unversionierte,
  ungueltige oder nicht endliche Metrikwerte ab.
- Heatmap und Parametervergleich zeigen Runzahl, CRN-Status,
  Wilson-Intervall der Erfolgsquote und den experimentellen Hinweis fuer
  Quantil-/Rankingwerte.
- Serieller und Workerpfad bleiben fuer Metriken und Provenienz paritaetisch.

## Scope

### Programmdateien

- `app/simulator/simulator-results.js`
- `app/simulator/sweep-metrics-contract.js` (neu)
- `app/simulator/sweep-runner.js`
- `app/simulator/simulator-sweep.js`
- `app/simulator/simulator-heatmap.js`
- `app/simulator/simulator-optimizer.js`
- `app/simulator/simulator-visualization.js`
- `Simulator.html`

### Tests und Dokumentation

- `tests/sweep-metrics.test.mjs` (neu)
- `tests/simulator-sweep-consumers.test.mjs` (neu)
- `tests/simulator-sweep.test.mjs`
- `tests/results-metrics.test.mjs`
- `tests/monte-carlo-statistics.test.mjs`
- `tests/simulator-heatmap.test.mjs`
- `tests/worker-parity.test.mjs`
- `tests/README.md`
- `docs/internal/SLICE_SUITE_DATA_09_SWEEP_METRICS_COMPARABILITY.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine Aenderung der Monte-Carlo-Metriksemantik ausser Wiederverwendung des
  bestehenden Wilson-Schaetzers;
- keine Aenderung von `makeRunSeed()` oder der allgemeinen RNG-Implementierung;
- keine Aenderung der in Slice 07 festgelegten Samplingpraezedenz;
- keine Aenderung der Haushalts-, Pflege-, Longevity- oder
  Tail-Risk-Semantik aus Slice 08;
- keine Train-/Bestaetigungsseed-Trennung des Auto-Optimizers; diese folgt
  in Slice 10;
- keine Neudefinition der Auto-Optimizer-Zielmetriken aus Slice 11;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`.

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-27 vor Anlage dieser Slice-MD.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber. Slice 08 ist freigegeben
und lokal committed (`2789d89`). Der Branch besitzt keinen Upstream und ist
nur lokal.

## Diff-Risiko

```text
Geplante Dateien:
- app/simulator/simulator-results.js
- app/simulator/sweep-metrics-contract.js
- app/simulator/sweep-runner.js
- app/simulator/simulator-sweep.js
- app/simulator/simulator-heatmap.js
- app/simulator/simulator-optimizer.js
- app/simulator/simulator-visualization.js
- Simulator.html
- tests/sweep-metrics.test.mjs
- tests/simulator-sweep-consumers.test.mjs
- tests/simulator-sweep.test.mjs
- tests/results-metrics.test.mjs
- tests/monte-carlo-statistics.test.mjs
- tests/simulator-heatmap.test.mjs
- tests/worker-parity.test.mjs
- tests/README.md
- docs/internal/SLICE_SUITE_DATA_09_SWEEP_METRICS_COMPARABILITY.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Sweep-Runner, Chunk-Split und Worker-/Serial-Paritaet
- Samplingfingerprints und deterministische Seed-Paritaet aus Slice 07
- Haushalts-, Longevity- und Tail-Risk-Provenienz aus Slice 08
- Simulator-Heatmap und UI-Orchestrierung
- Constraint-, Pareto- und Parametervergleichslogik
- Monte-Carlo-Statistikvertrag fuer Wilson-Intervalle
- Browser-Sweep-Workflow

Nicht anfassen:
- makeRunSeed()- und RNG-Implementierung
- Samplingdispatch und Samplingpraezedenz
- Haushalts-, Pflege-, Longevity- und Tail-Risk-Semantik
- Auto-Optimizer-Train-/Bestaetigungsseedvertrag
- engine.js
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/simulator-results.js app/simulator/sweep-runner.js app/simulator/simulator-sweep.js app/simulator/simulator-heatmap.js app/simulator/simulator-optimizer.js app/simulator/simulator-visualization.js Simulator.html tests/simulator-sweep.test.mjs tests/results-metrics.test.mjs tests/monte-carlo-statistics.test.mjs tests/simulator-heatmap.test.mjs tests/worker-parity.test.mjs tests/README.md docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Contract-, Test- und Slice-Dateien nur nach ausdruecklicher Freigabe loeschen.
```

Es sind acht Programmdateien vorgesehen. Die projektweite Stop-Regel von
mehr als zehn Programmdateien und das Slice-Maximum von neun greifen nicht.
Der zusaetzliche DOM-freie Contract-Helfer verhindert die zyklische
Importkette `simulator-results -> results-renderers -> simulator-heatmap`.
Falls fuer den Metrikkern oder die Consumer eine neunte Datei erforderlich
wird, wird sie vor dem Edit hier nachgetragen. Bei einer zehnten Programmdatei
wird der Slice in `Sweep-Metrikkern` und `Sweep-Consumer/UI` geteilt.

## Geplante Umsetzung

1. Versionierten Sweep-Metrikshape und D-06-Metadaten definieren.
2. Quantile ueber den kanonischen Quantilhelfer berechnen und mit
   handberechneten Verteilungen pruefen.
3. Terminalen Ruinwert 0 vor dem Outcome-Abbruch in die Vermoegensserie
   aufnehmen.
4. Setup- und Run-Seeds je Run-Index ueber Kombinationen vereinheitlichen
   und die CRN-Policy in der Resultprovenienz ausweisen.
5. Runzahl, Wilson-Intervall und explizite Quantil-Unsicherheit in den
   Metrikshape aufnehmen.
6. Heatmap, Constraints, Pareto und Parametervergleich auf denselben
   versionierten Reader umstellen.
7. UI-Texte von „beste/optimal“ auf einen experimentellen,
   vergleichsbezogenen Status umstellen.
8. Direkte Orakel, Metamorphietest, Worker-/Serial-Paritaet, Gesamtsuite und
   Browser-Smoke ausfuehren.

## Geplante Tests

- `node tests/run-single.mjs tests/sweep-metrics.test.mjs`
- `node tests/run-single.mjs tests/simulator-sweep-consumers.test.mjs`
- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
- `node tests/run-single.mjs tests/results-metrics.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-statistics.test.mjs`
- `node tests/run-single.mjs tests/simulator-heatmap.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `npm test`
- `npm run test:browser`
- `git diff --check`

## Durchgefuehrte Aenderungen

1. Mit `SweepMetricsV3`, `SweepMetricMetadataV2`,
   `SweepDrawdownLossP95V1` und `SweepComparisonDiagnosticsV2` wurde ein
   versionierter, fail-closed lesbarer Sweep-Metrikvertrag eingefuehrt.
   Einheit, Optimierungsrichtung, Rohquelle, Quantil und
   Terminalruin-Semantik sind je entscheidungsrelevanter Metrik explizit.
2. `worst5Drawdown` verwendet den kanonischen Quantilhelfer auf
   aufsteigend sortierten, auf 0 bis 100 Prozent begrenzten
   Drawdown-Verlusten. Die Verteilung 1 bis 100 liefert damit exakt 95,05
   statt des zuvor nahezu spiegelverkehrten guten Tails.
3. Ein terminal gescheiterter Run fuegt vor dem Abbruch den Vermoegenswert
   0 in die Drawdownserie ein. Ein Ruin nach positivem Peak ergibt dadurch
   exakt 100 Prozent maximalen Drawdown.
4. `SweepCommonRandomNumbersV2`, `SweepResultProvenanceV2` und
   `SweepSamplingFingerprintV2` trennen Ergebniskoordinate und gemeinsame
   Seedkoordinate. Setup- und Run-Seeds werden fuer denselben Run-Index
   kombinationsuebergreifend identisch abgeleitet.
5. Ein angeforderter `legacy-stream` wird im Vergleichslauf bewusst auf
   `per-run-seed` aufgeloest. Nur so bleibt Run-Index-Paritaet erhalten,
   wenn eine Kombination frueher endet. Angeforderter und angewandter
   Modus sowie der Aufloesungsgrund bleiben in der Provenienz erhalten.
6. Die Erfolgsquote enthaelt ein Wilson-95-Prozent-Intervall. Quantil- und
   Drawdownrangings weisen explizit aus, dass kein Konfidenzintervall
   berechnet wurde und nur ein experimenteller Punktschaetzer vorliegt.
7. Heatmap, Constraints, Multiobjective-Vergleich, Pareto und
   Parametervergleich konsumieren denselben Contract-Reader. Legacy-Shapes,
   unbekannte oder nicht endliche Werte werden verworfen; echte Nullwerte
   bleiben erhalten.
8. Heatmap und Parametervergleich zeigen Runzahl, CRN-Status,
   Wilson-Intervall und den experimentellen Quantilhinweis. Die
   Nutzertexte bezeichnen kein Ergebnis mehr als objektiv „beste“ oder
   „optimale“ Strategie.
9. Der exportierbare `SweepExecutionV2`-Shape enthaelt neben den Resultaten
   die repraesentativen Metrikdefinitionen und die
   Vergleichszufalls-Provenienz.
10. Nach C09-1 weist die Vergleichsdiagnostik Terminalruinanzahl,
    Terminalruinanteil und ein im Ruinblock gesaettigtes Drawdown-P95 aus.
    Heatmap und Pareto zeigen diese Saettigung sichtbar. Exakte
    Ranking-Gleichstaende liefern keine willkuerlich erste Kombination mehr
    zur Parameteruebernahme.
11. Nach G09-1 verwenden P10, P25, Median und P75 des Endvermoegens denselben
    kanonischen interpolierten Quantilhelfer wie D-06; die Methode ist in den
    Metrikmetadaten festgeschrieben.
12. Die CRN-Provenienz garantiert nur noch gemeinsame Setup-/Run-Seeds und
    gemeinsame Rohpfadpraefixe bis zur strategieabhaengigen Terminierung.
    Vollstaendige Pfadgleichheit verschiedener Kombinationen wird
    ausdruecklich nicht behauptet.
13. Drawdownwerte ausserhalb 0 bis 100 werden nicht mehr geklemmt, sondern
    fail-closed abgewiesen. Consumer verlangen explizit mindestens eine
    Metrik und einen gueltigen Resultshape. Der terminale Ruin beendet den
    Sweep unabhaengig von der allgemeinen MC-Break-Konfiguration.
14. Legacy-/unversionierte Ergebnisse erhalten in Heatmap, Pareto und
    Parametervergleich einen sichtbaren Hinweis zum erneuten Ausfuehren.
    Der veraltete Demo-Constraint `worst5Drawdown <= 40` wurde entfernt und
    die neu eingefuehrten UI-Texte verwenden korrekte Umlaute sowie
    Singular/Plural.

## Ergebnisse

- `tests/sweep-metrics.test.mjs`: 24/24 Assertions gruen.
- `tests/simulator-sweep-consumers.test.mjs`: 12/12 Assertions gruen.
- `tests/simulator-sweep.test.mjs`: 254/254 Assertions gruen.
- `tests/results-metrics.test.mjs`: 48/48 Assertions gruen.
- `tests/monte-carlo-statistics.test.mjs`: 20/20 Assertions gruen.
- `tests/simulator-heatmap.test.mjs`: 17/17 Assertions gruen.
- `tests/worker-parity.test.mjs`: 430/430 Assertions gruen.
- `tests/simulator-ui-orchestration.test.mjs`: 56/56 Assertions gruen.
- `tests/mc-worker-contract.test.mjs`: 69/69 Assertions gruen.
- `npm test`: 134 Testdateien, 7.951/7.951 Assertions, 0
  fehlgeschlagene Dateien und 0 offene Handles.
- `npm run test:browser`: 16/16 Browser-Szenarien gruen.
- `git diff --check`: gruen.
- Keine Golden-/Snapshot-Aenderung und kein unerwartetes FlowDelta. Die
  Single-Combination-Sweep-/MC-Paritaet blieb gruen.

## Abweichungen vom Plan

- Der zunaechst nicht vorgesehene DOM-freie Helfer
  `sweep-metrics-contract.js` wurde vor seinem ersten Edit in Scope und
  Diff-Risiko nachgetragen. Er verhindert die vorhandene zyklische
  Importkette
  `simulator-results -> results-renderers -> simulator-heatmap`. Der
  Gesamtscope bleibt mit acht Programmdateien unter dem Slice-Maximum neun.
- `results-metrics.test.mjs` und `monte-carlo-statistics.test.mjs` mussten
  nicht geaendert werden; ihre bestehenden Orakel wurden unveraendert
  nachgefahren.
- Ein angeforderter Legacy-Stream kann D-07 bei unterschiedlich langen
  Kombinationen nicht garantieren. Der Sweep-Vergleich ersetzt ihn deshalb
  kontrolliert durch isolierte Per-Run-Seeds und dokumentiert diese
  Aufloesung, statt nur den Stream je Kombination zurueckzusetzen.
- Die Review-Nachbesserung hebt den erst im uncommitteten Slice eingefuehrten
  Metrikshape von V2 auf V3, die Metadaten auf V2 sowie Vergleichsdiagnostik
  und CRN-Provenienz jeweils auf V2. Damit sind die korrigierte
  Quantilmethode und die qualifizierte Pfad-/Saettigungssemantik nicht unter
  einer bereits reviewten Versionsmarke versteckt.

## Offene Risiken

- Quantilmetriken besitzen weiterhin kein geschaetztes
  Konfidenzintervall. Das wird nicht als numerische Sicherheit ausgegeben,
  sondern sichtbar als experimenteller Punktschaetzer dokumentiert.
- CRN reduziert Vergleichsrauschen, beseitigt aber weder Modellrisiko noch
  Stichprobenfehler.
- Wirkungsgleiche Kombinationen sind komplett pfadidentisch. Bei
  tatsaechlich verschiedenen Kombinationen koennen legitime fruehere
  Abbrueche zu verschieden langen Rohpfaden fuehren; gemeinsam bleibt dann
  der Seed und der Pfadpraefix je Run-Index.
- Die vollstaendigen Metrikmetadaten liegen bewusst in jedem Resultat. Das
  vergroessert den Payload, vermeidet aber mehrdeutige oder vom
  Einzelresultat getrennte Semantik.
- Sweep und Monte Carlo verwenden weiterhin unterschiedliche
  Drawdownvertraege: nur der Sweep setzt terminalen Ruin deklarativ auf 100
  Prozent. Die Metadaten und sichtbaren Vergleichshinweise kennzeichnen die
  fehlende direkte Vergleichbarkeit; eine Aenderung der MC-Semantik bleibt
  ausdruecklich Nicht-Scope.

## Rueckdokumentation in den Hauptplan

Der tatsaechliche Metrik-, Seed-, Provenienz-, Consumer-, UI- und Teststand
ist im Hauptplan rueckdokumentiert. Slice 09 ist dort als implementiert und
noch nicht reviewt markiert.

## Freigabestatus

Implementierung, Blocker-Nachbesserung und technische Validierung durch
Codex sowie die unabhängigen Re-Reviews von Claude und Gemini sind erfolgreich
abgeschlossen. Slice 09 ist freigegeben.


## Review-Feedback von Gemini

**Review-Datum:** 2026-07-27 (Erstes Review: Blocker identifiziert; Zweites Review: Abschlussreview nach Nachbesserung)  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Nachgebesserter Arbeitsstand von Codex auf `codex/suite-datenintegritaet-hardening` (8 Programmdateien, 4 Testdateien), Nachbesserungen zu C09-1..C09-9 sowie G09-1..G09-2, plus Re-Review-Ergebnisse von Claude.

### Evaluation des Re-Reviews von Claude

Das Re-Review von Claude wurde verifiziert:
1. **Verifizierung der Schliessung von C09-1 bis C09-9:** Claudes Re-Review dokumentiert nachvollziehbar die erfolgreiche Schliessung aller ursprünglichen Blocker und Restrisiken. Die Nachmessung über drei Ruinregime (hoch: 50%, mild: 4,5%, ruinfrei: 0%) belegt die Funktionsfähigkeit der neuen Sättigungsdiagnostik, der Gleichstandssperre in `findBestParameters` sowie der differenzierten CRN-Provenienz.
2. **Evaluierung der neuen Restrisiken D09-1 bis D09-9:** Claudes neu identifizierte Punkte D09-1 bis D09-9 sind fundierte Beobachtungen zur Systemdynamik von CRN und Quantilrangings (z. B. D09-1: Bitidentität von Ordnungsstatistiken führt bei CRN zu Gleichständen; D09-3: Fail-closed `RangeError`-Abbruchgranularität im Runner; D09-8: Unbeziffertes G09-1-Delta). Sie stellen korrekterweise keine Blocker dar, sondern sind als vertretbare Modellgrenzen/Restrisiken eingestuft.

### Systematische Abschlussprüfung durch Gemini

- **G09-1 (Quantil-Inkonsistenz): BEHOBEN.** `p10EndWealth`, `p25EndWealth`, `medianEndWealth` und `p75EndWealth` verwenden in `aggregateSweepMetrics` ([app/simulator/simulator-results.js](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-results.js#L704-L707)) nun ausnahmslos den kanonischen interpolierten Helfer `quantile(endWealths, q)`. Die Quantilmethodik ist im Vertrag (`SWEEP_METRIC_METADATA_VERSION = 'SweepMetricMetadataV2'`) explizit als `linear_interpolation_at_(n_minus_1)_q` deklariert.
- **G09-2 (UI-Migrationshinweis): BEHOBEN.** In `simulator-heatmap.js`, `simulator-visualization.js` und `simulator-optimizer.js` führen unversionierte / ungültige Ergebnisse zu klaren Nutzerhinweisen ("Ergebnisse stammen aus einem veralteten oder ungueltigen Format. Bitte Sweep erneut ausfuehren.").
- **C09-1 (Sättigungsdiagnostik & Sättigungswarnungen): BEHOBEN.** `SweepComparisonDiagnosticsV2` meldet Sättigung im Ruinblock (`quantileInTerminalRuinBlock: true`). Heatmap und Pareto zeigen sichtbare Warnhinweise, und Rankings verweigern bei Gleichstand die Auswahl einer scheinbar optimalen Strategie.
- **Formale Gates & Validierung:** `npm test` mit 7.951/7.951 Assertions zu 100% grün, 0 offene Handles, Worker-/Serial-Parität bestätigt, 16/16 Browser-Szenarien grün.

### Re-Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. (C09-1 und G09-1 sind vollständig behoben).
- Restrisiken: 
  1. D09-1 (Claude): CRN macht Ordnungsstatistiken bei wirkungsgleichen Läufen bitidentisch; Rankings verweigern bei Gleichstand richtigerweise die Empfehlung.
  2. D09-2 (Claude): `quantileInTerminalRuinBlock` verlangt exakt 100 % (Messerschneide bei z. B. 98,6 % Drawdown im milden Regime).
  3. D09-3 (Claude): Fail-closed `RangeError` bricht im Fehlerfall den gesamten Sweep-Batch ab statt nur eine Kombination.
  4. D09-4 bis D09-9 (Claude): Restrisiken und Hinweise (u. a. MC/Sweep Drawdown-Divergenz, unbeziffertes G09-1-Interpolations-Delta).
- Pre-Mortem: Die strikte Gleichstandssperre bei bitgleichen Quantilen (D09-1) führt bei ruinfreien Sweeps dazu, dass die UI "Keine eindeutig führende Kombination" anzeigt, was von Nutzern fälschlicherweise als Anwendungsfehler gemeldet werden könnte.
```

### Aktualisierte Entscheidungstabelle

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| G09-1 | Gemini 2026-07-27 | Inkonsistente Quantilberechnung in `aggregateSweepMetrics`: `worst5Drawdown` nutzt `quantile()`, waehrend Vermoegensperzentile (`p10`..`p75`) weiterhin uninterpoliert ueber `Math.floor()` berechnet werden. Violates Plan-Vorgabe. | angenommen | **geschlossen** - alle Vermoegensperzentile auf kanonisches `quantile()` umgestellt (V2-Metadaten) |
| G09-2 | Gemini 2026-07-27 | `readSweepMetricValue` verwirft Legacy-Shapes stumm ohne Migration/Hinweis in der UI. | angenommen | **geschlossen** - sichtbare UI-Neustarthinweise in allen Consumern umgesetzt |



## Review-Feedback von Claude

**Review-Datum:** 2026-07-27

**Reviewer:** Claude (Opus 5)

**Pruefgegenstand:** unkommittierter Arbeitsstand ueber `2789d89` - acht
Programmdateien (`sweep-metrics-contract.js` neu, `simulator-results.js`,
`sweep-runner.js`, `simulator-sweep.js`, `simulator-heatmap.js`,
`simulator-optimizer.js`, `simulator-visualization.js`, `Simulator.html`),
vier Testdateien (`sweep-metrics.test.mjs` und
`simulator-sweep-consumers.test.mjs` neu), `tests/README.md`.

**Verifikationsbasis:** Der Vergleichsstand wurde aus `HEAD` extrahiert
(`sweep-runner.js` und `aggregateSweepMetrics` vor dem Slice) und gegen den
aktuellen Stand auf identischen Gittern gefahren: 15 Kombinationen
(targetEq 40/50/60/70/80 x maxSkimPct 5/10/20), 200 Laeufe je Kombination,
Blocksampling, Seed 20260727, 30 Jahre Horizont, jeweils in einer Variante mit
hoher (rund 50 Prozent) und einer mit niedriger (rund 4,5 Prozent) Ruinquote.
Zusaetzlich wurden Heatmap-, Pareto- und Constraint-Consumer direkt auf diesen
Ergebnissen ausgefuehrt und die Saettigungsgrenze von `worst5Drawdown` ueber
synthetische Verteilungen mit gestufter Ruinquote vermessen.

**Nachgefahrene Gates:** `npm test` 7.930/7.930 Assertions, 0 fehlgeschlagene
Dateien, 0 offene Handles. `git diff --check` gruen. Keine Golden-, Fixture-
oder `dist/`-Datei beruehrt. Die von Codex berichteten Zahlen sind damit
unabhaengig bestaetigt.

### Findings-Lifecycle

| ID | Status vorher | Status jetzt | Begruendung |
| --- | --- | --- | --- |
| C09-1 | - | **neuer Blocker** | `worst5Drawdown` saettigt oberhalb rund 5 Prozent Ruinquote auf konstant 100 und verliert jede Unterscheidungskraft, ohne dass Heatmap, Pareto oder Vergleichsdiagnostik das ausweisen |
| C09-2 | - | neues Restrisiko | der mitgelieferte Default-Constraint `worst5Drawdown <= 40` ist auf die alte, invertierte Skala kalibriert und jetzt unerfuellbar |
| C09-3 | - | neues Restrisiko | `commonAcrossCombinations: true` ist ein statisches Literal; die Rohpfade divergieren zwischen unterschiedlichen Kombinationen nachweislich |
| C09-4 | - | neues Restrisiko | Sweep und Monte Carlo definieren den maximalen Drawdown seit diesem Slice unterschiedlich; nur die Sweep-Variante ist versioniert |
| C09-5 | - | neues Restrisiko | der Fixturebestand ist strukturell blind fuer die CRN-Umstellung; die gruene Suite belegt deren Unbedenklichkeit nicht |
| C09-6 | - | neuer Hinweis | korrekte Umlaute wurden in nutzersichtbaren Texten durch ASCII-Ersatzschreibung ersetzt und per Test festgeschrieben |
| C09-7 | - | neuer Hinweis | die Drawdown-Klemmung auf 0..100 ist fail-open und im Test bewusst so gepinnt |
| C09-8 | - | neuer Hinweis | `isValidSweepResult(result, [])` ist vakuum-wahr; der Default kodiert "alles gueltig" |
| C09-9 | - | neuer Hinweis | der terminale Nullpunkt ist nur unter `BREAK_ON_RUIN === true` terminal |

### Belegt korrekt umgesetzt

Der Kern von D-06 sitzt richtig. Die Vorversion sortierte absteigend und griff
`drawdowns[Math.floor(n * 0.95)]` ab - das ist der **gute** Tail. Auf demselben
Gitter mit rund 50 Prozent Ruinquote liefert die alte Formel eine Spanne von
6,47 bis 14,60 Prozent, waehrend real jeder zweite Lauf das Depot vollstaendig
verliert. Die neue Formel liest ueber den kanonischen Quantilhelfer aufsteigend
und trifft den schlechten Tail.

`quantile` kopiert das Eingabearray in ein `Float64Array` und sortiert per
Quickselect intern. Die Uebergabe eines unsortierten Arrays ist damit korrekt,
und das Array des Aufrufers wird nicht mutiert - beides nachgeprueft.

`readSweepMetricValue` ist fail-closed und diskriminierend: eine unversionierte
Metrikhuelle und ein `NaN`-Wert werden beide zu `null`, ein echter Nullwert
bleibt erhalten. Die Consumer verwerfen dadurch Legacy-Shapes, statt sie ueber
`|| 0` in eine Rangfolge zu ziehen. Der frueher moegliche Pfad
"`result.metrics[metricKey] || 0`" ist an allen vier Consumern beseitigt.

`window.sweepResults` wird nirgends persistiert oder wiederhergestellt
(nachgeprueft ueber alle Zugriffe in `app/`). Die harte Ablehnung
unversionierter Shapes kann deshalb keinen bestehenden gespeicherten Sweep
unbrauchbar machen. Der leere Fall ist in `renderSweepHeatmapSVG` und
`renderParetoFrontier` jeweils mit einer Klartextmeldung abgefangen, die
Achsenskalierung ist gegen `range === 0` gehaertet.

`aggregateSweepMetrics` hat seine Rueckgabeform geaendert. Ausserhalb von
`sweep-runner.js` und den Tests gibt es keinen Konsumenten - ueber alle
Aufrufstellen verifiziert.

Der terminale Nullpunkt ist konsistent mit der bereits vorhandenen Konvention
`endVermoegen = failed ? 0 : portfolioTotal(...)`. `isRuin` bedeutet, dass der
Floor auch nach Verwertung von Aktien und Gold nicht gedeckt werden kann; ein
Restbestand kann rechnerisch verbleiben. Die 100 Prozent sind daher eine
deklarierte Konvention, keine Messung - immerhin ist sie mit
`terminalRuinLossPct: 100` ausdruecklich im Vertrag ausgewiesen.

Die Worker-/Serial-Paritaet wurde um vier Assertions auf Schemaversion,
Metrikmetadaten, Vergleichsdiagnostik und CRN-Provenienz erweitert; die
V2-Marke ueberlebt den Structured Clone.

### C09-1 - Blocker: `worst5Drawdown` saettigt und wird zur Konstanten

Oberhalb einer Ruinquote von 5 Prozent besteht der obere Tail der
Verlustverteilung ausschliesslich aus Terminalruinen. Das P95 rastet dann auf
exakt 100 ein - unabhaengig davon, was die Strategie sonst tut. Gemessen bei
200 Laeufen:

| Ruinquote | `worst5Drawdown` |
| --- | --- |
| 0 Prozent | 34,0000 |
| 4 Prozent | 34,0000 |
| 5,0 Prozent | 37,3000 |
| 5,5 Prozent | **100,0000** |
| 10 Prozent | **100,0000** |
| 50 Prozent | **100,0000** |

Auf dem realen Gitter mit rund 50 Prozent Ruinquote liefern **alle 15
Kombinationen denselben Wert 100,0000**. Die Folgen wurden end-to-end
nachgefahren:

- Heatmap: `range === 0`, alle 15 Zellen werden in `viridis(0.5)` gerendert -
  eine vollstaendig einfarbige Flaeche. Im erzeugten SVG steht kein Hinweis auf
  Entartung; der neue Vergleichshinweis nennt Runzahl, CRN-Status,
  Wilson-Intervall und die Quantilunsicherheit, aber nicht, dass die
  dargestellte Metrik ueber alle Kombinationen konstant ist.
- Pareto mit dem Paar (`medianEndWealth` maximieren, `worst5Drawdown`
  minimieren): die Frontier kollabiert auf **1 von 15 Punkten**. Die zweite
  Zielgroesse traegt nichts mehr bei, die Analyse degeneriert stillschweigend
  zur Einzelmetrik-Rangfolge.
- Ranking: bei identischen Werten entscheidet in `findBestParameters` die
  Array-Reihenfolge, also der Kombinationsindex.

Die Vorversion war falsch, aber variabel (6,47 bis 14,60). Die neue Version ist
per D-06 definitionsrichtig und informationsleer - und zwar genau in dem
Bereich, in dem ein Nutzer einen Parametersweep ueberhaupt fahren wuerde. Das
ist kein Widerspruch zu D-06: D-06 legt das **Verlustmass je Lauf** fest, nicht
die Frage, ob eine ueber alle Kombinationen konstante Metrik ohne Kennzeichnung
als Entscheidungsgrundlage praesentiert werden darf. Genau diese Kennzeichnung
fehlt, obwohl der Slice ein eigenes, versioniertes Diagnoseobjekt
(`SweepComparisonDiagnosticsV1`) einfuehrt, in das sie gehoerte.

Der Blocker liegt damit im Scope dieses Slice und ist klein zu schliessen: die
Vergleichsdiagnostik muesste die Saettigung ausweisen (etwa Anteil der Laeufe
mit Terminalruin und ein Kennzeichen, dass das P95 im Ruinblock liegt), und
Heatmap sowie Pareto muessten das sichtbar machen, statt eine einfarbige
Flaeche beziehungsweise eine entartete Frontier ohne Kommentar zu zeigen.

### C09-2 - Restrisiko: Default-Constraint auf der alten Skala kalibriert

`runConstraintBasedDemo` in `simulator-sweep.js` fuehrt
`{ metricKey: 'worst5Drawdown', operator: '<=', value: 40 }` mit. Der
Schwellwert stammt aus der alten, invertierten Skala. Mit dem Consumer
tatsaechlich ausgefuehrt, im **milden** Szenario mit nur 4,5 Prozent Ruinquote:
`feasibleCount = 0 von 15`, weil die Werte dort zwischen 92,84 und 98,60
liegen. Auf der alten Skala (0,00 bis 8,76) haetten alle 15 Kombinationen die
Bedingung erfuellt. Der Nutzer saehe "0 von 15 Kombinationen erfuellen alle
Constraints" ohne Anhaltspunkt, dass die Schwelle und nicht die Strategie das
Problem ist.

Abgeschwaecht wird das dadurch, dass `runConstraintBasedDemo` nur als
`window`-Funktion existiert und in `Simulator.html` an keine Schaltflaeche
gebunden ist - nachgeprueft. Es bleibt aber das einzige Beispiel fuer eine
Drawdown-Schwelle im Repository und damit die Vorlage fuer jede kuenftige
Verdrahtung. In "Abweichungen vom Plan" ist die Skalenumkehr fuer Schwellwerte
nicht erwaehnt.

### C09-3 - Restrisiko: `commonAcrossCombinations` ist ein Literal, keine Messung

`buildSweepComparisonRandomness` setzt `commonAcrossCombinations: true`
unbedingt. Gemessen an drei tatsaechlich verschiedenen Kombinationen
(targetEq 40 / 70 / 80, gleiche Seeds, 200 Laeufe):

| Groesse | targetEq 40 | targetEq 70 | targetEq 80 |
| --- | --- | --- | --- |
| `samplingFingerprint.hash` | `a05e043b` | `7169afea` | `f417f9bd` |
| `tracedRuns` (Laeufe 0 bis 2) | identisch | identisch | identisch |
| `commonAcrossCombinations` | `true` | `true` | `true` |

Die ersten drei Laeufe teilen die Rohpfade tatsaechlich - CRN wirkt. Der
vollstaendige Fingerprint unterscheidet sich jedoch, sobald ein Lauf frueher
ruiniert und dadurch weniger Jahre zieht. Codex beschreibt diesen Effekt unter
"Offene Risiken" korrekt; der exportierte Vertrag behauptet daneben
unqualifiziert das Gegenteil. Nach dem Wahrhaftigkeitsmassstab aus Slice 06
gehoert an diese Stelle eine gemessene oder wenigstens bedingte Aussage.

Der Test kann das nicht bemerken: Test 45 vergleicht ausschliesslich zwei
**wirkungsgleiche** Kombinationen. Dort ist die Gleichheit von `hash` und
`tracedRuns` konstruktionsbedingt garantiert. Fuer verschiedene Kombinationen
gibt es kein Orakel, obwohl das der eigentliche Anwendungsfall von CRN ist.

### C09-4 - Restrisiko: zwei Definitionen desselben Drawdowns

Der Nullpunkt wird nur in `sweep-runner.js` vor dem Abbruch eingefuegt. Der
Monte-Carlo-Runner bricht bei Ruin ohne diesen Schritt ab. Auf demselben
Szenario und derselben Seedbasis gemessen:

| Groesse | Sweep | Monte Carlo |
| --- | --- | --- |
| Ruinhaeufigkeit | 49,50 Prozent (`successProbFloor` 50,50) | 49,50 Prozent (`failCount` 99 von 200) |
| Anteil Laeufe mit Drawdown >= 99,999 Prozent | 49,50 Prozent (konstruktiv jeder gescheiterte Lauf) | **5,50 Prozent** |
| Median `maxDrawdown` | - | 90,11 Prozent |

Beide Runner sind sich ueber die Ruinhaeufigkeit einig und weichen beim
Drawdown um den Faktor neun voneinander ab. Der Nicht-Scope schliesst
Aenderungen an der Monte-Carlo-Metriksemantik ausdruecklich aus - die
Divergenz ist also gewollt und nicht als Fehler zu werten. Sie ist aber weder
unter "Offene Risiken" genannt noch fuer den Nutzer erkennbar: nur die
Sweep-Variante traegt mit `SweepDrawdownLossP95V1` eine Version, die
MC-Kennzahl aus `buildDrawdownKpis` traegt keine. In derselben Oberflaeche
stehen damit zwei gleichnamige, unterschiedlich definierte Groessen ohne
Unterscheidungsmerkmal.

### C09-5 - Restrisiko: die Suite ist blind fuer die CRN-Umstellung

Die Umstellung ersetzt `makeRunSeed(baseSeed, comboIdx, i)` durch
`makeRunSeed(baseSeed, 0, i)`. Fuer `comboIdx === 0` ist das
konstruktionsbedingt eine Nulloperation. Von rund 40 `comboRange`-Fixtures der
Gesamtsuite verwendet genau eines `start: 1` (Test 35, und dort werden nur
Provenienzlabels geprueft), und zwei fahren mehr als eine Kombination
(Test 22 mit reinen `typeof`-Assertions, sowie der neue Test 45). Alle uebrigen
laufen auf Kombinationsindex 0.

Die 7.930 gruenen Assertions belegen deshalb nicht, dass die Seedumstellung
unbedenklich ist - sie koennen sie ueberwiegend gar nicht sehen. Die reale
Wirkung ist erheblich: auf dem 15er-Gitter aendern 13 von 15 Kombinationen ihr
Median-Endvermoegen, und die **Empfehlung** verschiebt sich.

| Auswahlkriterium | bester Index vorher | bester Index nachher |
| --- | --- | --- |
| `medianEndWealth` (hohe Ruinquote) | 12 | 10 |
| `successProbFloor` (hohe Ruinquote) | 12 | 10 |
| `medianEndWealth` (niedrige Ruinquote) | 9 | 12 |
| `successProbFloor` (niedrige Ruinquote) | 11 | 1 |

Dass sich die Empfehlung verschiebt, ist der Zweck der Massnahme und kein
Mangel - ein Teil der frueheren Unterschiede war reines Seedrauschen. Der
Mangel ist, dass diese Verschiebung nirgends beziffert ist, waehrend Slice 08
fuer vergleichbare Effekte einen bezifferten Delta-Ledger verlangt hat.

### C09-6 - Hinweis: Umlaute in nutzersichtbaren Texten ersetzt

Der Slice ersetzt in `simulator-optimizer.js` bestehende, korrekt gesetzte
Umlaute durch ASCII-Ersatzschreibung. Die drei Nutzerdialoge beim Uebernehmen
der Parameter lauteten zuvor "... wurden uebernommen" mit korrektem u-Umlaut
und lauten jetzt "uebernommen" in Ersatzschreibung. Neu eingefuehrt werden
unter anderem
`Laeufe` (4-mal), `Punktschaetzer` (5-mal), `fuehrende`/`fuehrenden` (7-mal),
`verfuegbar`, `gueltigen`. Die umgebende Oberflaeche verwendet weiterhin
korrekte Umlaute (`Optimiert fuer` mit Umlaut, `Vermoegensaufteilung`,
`Waehle`), sodass innerhalb derselben Ansicht beide Schreibweisen
nebeneinander stehen.

Zusaetzlich schreibt `simulator-heatmap.test.mjs` die Zeichenkette
`'1 Laeufe je Kombination'` fest und pinnt damit auch den grammatischen Fehler
im Singular.

### C09-7 - Hinweis: die Drawdown-Klemmung ist fail-open

`Math.min(100, Math.max(0, value))` in `aggregateSweepMetrics` verwirft
Werte ausserhalb des Definitionsbereichs stillschweigend. Ein kuenftiger Fehler,
der 140 Prozent liefert, wird zu 100 und ist dann nicht mehr von einem echten
Terminalruin zu unterscheiden. Das ist dieselbe Fehlerklasse wie A08-7 aus
Slice 08. Der Test in `sweep-metrics.test.mjs` pinnt dieses Verhalten
ausdruecklich als gewollt - damit ist es eine bewusste Entscheidung, aber eine,
die den einzigen Kanal schliesst, ueber den ein Defekt sichtbar wuerde.

### C09-8 - Hinweis: vakuum-wahre Gueltigkeitspruefung

`isValidSweepResult(result, metricKeys = [])` liefert in beiden neuen
Implementierungen (`simulator-optimizer.js`, `simulator-visualization.js`) fuer
eine leere Schluesselliste `true` - fuer jedes Argument, auch `null` oder eine
als ungueltig markierte Kombination. Die Vorversion pruefte zuerst
`!result || !result.metrics || invalidCombination === true`. Alle heutigen
Aufrufstellen uebergeben mindestens einen Schluessel, der Pfad ist derzeit also
unerreichbar; der Defaultwert kodiert aber nun "alles gueltig" statt
"nichts geprueft". In `findBestParametersMultiObjective` mit leerer
Zielliste erhielten dadurch alle Kombinationen den Score 0 und die erste
gewaenne.

### C09-9 - Hinweis: der Nullpunkt ist nur unter `BREAK_ON_RUIN` terminal

`depotWertHistorie.push(0)` steht vor `if (BREAK_ON_RUIN) break;`. `simState`
wird im Ruinzweig nicht fortgeschrieben. Mit `BREAK_ON_RUIN === false` wuerde
die Schleife vom unveraenderten Vorzustand weiterlaufen und wieder positive
Werte anhaengen - der Nullpunkt laege dann mitten in der Serie und erzeugte
einen dauerhaften 100-Prozent-Ausschlag mit anschliessender "Erholung". Aktuell
ist `BREAK_ON_RUIN = true` in `simulator-data.js`, das Verhalten also terminal
und korrekt. Der Kommentar spricht vom "terminalen Nullpunkt", der Code
garantiert das aber nicht selbst.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache:

Ein Nutzer meldet, die Drawdown-Heatmap sei "kaputt", weil sie einfarbig ist
und jede Zelle 100,0 Prozent anzeigt. Gesucht wird im Renderer, in der
Farbskala und in der Metrikuebergabe. Tatsaechlich ist die Metrik korrekt: das
P95 rastet oberhalb von 5 Prozent Ruinquote auf den Terminalruin ein. Weil der
neue Vergleichshinweis ausfuehrlich ueber Runzahl, CRN und Quantilunsicherheit
informiert, aber genau diesen einen Zustand nicht ausweist, wird die Diagnose
an der falschen Stelle gefuehrt - und der naheliegende "Fix" waere, die
Saettigung wieder wegzudefinieren und damit D-06 zurueckzunehmen.

## Review-Ergebnis

- Status: **blockiert**
- Blocker: C09-1 - `worst5Drawdown` ist oberhalb rund 5 Prozent Ruinquote ueber
  alle Kombinationen konstant 100; Heatmap (15 von 15 Zellen in der Mittelfarbe),
  Pareto (Frontier auf 1 von 15 Punkten kollabiert) und Ranking degenerieren
  stillschweigend, ohne dass die neu eingefuehrte Vergleichsdiagnostik diesen
  Zustand ausweist.
- Restrisiken: C09-2 (Default-Constraint `worst5Drawdown <= 40` unerfuellbar,
  gemessen 0 von 15 zulaessigen Kombinationen), C09-3
  (`commonAcrossCombinations` als Literal gegen nachweislich divergierende
  Fingerprints), C09-4 (Sweep und Monte Carlo definieren den Drawdown
  unterschiedlich; Anteil der 100-Prozent-Laeufe 49,50 gegen 5,50 Prozent),
  C09-5 (Fixturebestand blind fuer die CRN-Umstellung; Empfehlung verschiebt
  sich unbeziffert), C09-6 bis C09-9 als Hinweise.
- Pre-Mortem: siehe oben - eine definitorisch korrekte, aber gesaettigte Metrik
  wird als Renderfehler fehldiagnostiziert.

## Re-Review durch Claude nach der Codex-Nachbesserung

**Review-Datum:** 2026-07-27 (zweiter Durchgang)

**Reviewer:** Claude (Opus 5)

**Pruefgegenstand:** unkommittierter Arbeitsstand ueber `2789d89`. Gegenueber
dem ersten Durchgang geaendert: `sweep-metrics-contract.js` (V3, Metadaten V2,
Vergleichsdiagnostik V2), `simulator-results.js` (interpolierte
Vermoegensquantile, Saettigungsdiagnostik, Fail-closed-Bereichspruefung),
`sweep-runner.js` (CRN-Provenienz V2, unbedingter Ruinabbruch),
`simulator-optimizer.js` (Gleichstandserkennung, Legacy-Hinweise),
`simulator-heatmap.js` und `simulator-visualization.js` (Saettigungshinweise,
Umlaute), `simulator-sweep.js` (Demo-Constraint entfernt) sowie die vier
Testdateien.

**Verifikationsbasis:** dieselben Gitter wie im ersten Durchgang
(15 Kombinationen targetEq 40..80 x maxSkimPct 5/10/20, 200 Laeufe je
Kombination, Seed 20260727, 30 Jahre), diesmal in drei Ruinregimen: hoch
(50,0 Prozent), mild (4,5 Prozent) und ruinfrei (0,0 Prozent). Heatmap-,
Pareto- und Ranking-Consumer wurden auf diesen Ergebnissen direkt ausgefuehrt.
Der Methodenwechsel aus G09-1 wurde isoliert vermessen, indem der
Vor-Slice-Runner aus `HEAD` beide Quantilmethoden auf denselben `runOutcomes`
berechnet.

**Nachgefahrene Gates:** `npm test` 7.951/7.951 Assertions, 0 fehlgeschlagene
Dateien, 0 offene Handles. `git diff --check` gruen. Keine Golden-, Fixture-
oder `dist/`-Datei beruehrt.

### Findings-Lifecycle

| ID | Status vorher | Status jetzt | Begruendung |
| --- | --- | --- | --- |
| C09-1 | Blocker | **geschlossen** | Saettigung wird in Diagnostik, Heatmap, Pareto und Ranking ausgewiesen; im gesaettigten Fall wird keine Fuehrung mehr behauptet |
| C09-2 | Restrisiko | **geschlossen** | veralteter Demo-Schwellwert entfernt |
| C09-3 | Restrisiko | **geschlossen** | qualifizierte Aussage ist messbar zutreffend: bei 0 Prozent Ruin genau ein Fingerprint ueber 15 Kombinationen |
| C09-4 | Restrisiko | **geschlossen** | Runnergrenze in Metadaten und in allen drei Consumern sichtbar |
| C09-5 | Restrisiko | **geschlossen** | wirkungsverschiedener Zwei-Kombinationen-Regressionsfall ergaenzt, der die alte Combo-Index-Ableitung erkennt |
| C09-6 | Hinweis | **geschlossen** | Umlaute wiederhergestellt, Singular/Plural korrekt |
| C09-7 | Hinweis | **geschlossen** | Bereichsverletzung wirft `RangeError` statt zu klemmen; Restrisiko zur Abbruchgranularitaet siehe D09-3 |
| C09-8 | Hinweis | **geschlossen** | beide Implementierungen verlangen mindestens einen Metrikschluessel |
| C09-9 | Hinweis | **geschlossen** | Ruinabbruch im Sweep ist unbedingt; Restrisiko siehe D09-6 |
| D09-1 | - | neues Restrisiko | CRN macht Ordnungsstatistiken identisch; die Gleichstandsregel verweigert dadurch flaechendeckend die Antwort |
| D09-2 | - | neues Restrisiko | der Saettigungsdetektor ist eine Messerschneide und erkennt den nahegesaettigten Bereich nicht |
| D09-3 | - | neues Restrisiko | die Fail-closed-Pruefung reisst den gesamten Sweep ab statt der einen Kombination |
| D09-4 | - | neuer Hinweis | `degenerateMetricKeys` wird berechnet, aber nie angezeigt |
| D09-5 | - | neuer Hinweis | die Gleichstandsregel macht den Zwei-Kandidaten-Multiobjective-Vergleich strukturell ergebnislos |
| D09-6 | - | neuer Hinweis | der Sweep nimmt nicht mehr am projektweiten `BREAK_ON_RUIN` teil |
| D09-7 | - | neuer Hinweis | `terminalRuinRuns` ist ein zweiter Name fuer `failedRuns` |
| D09-8 | - | neuer Hinweis | G09-1 ist unbeziffert; gemessen bis 4,77 Prozent und 120.655,82 EUR |
| D09-9 | - | neuer Hinweis | Spread-Operator-Grenze bei rund 125.000 Laeufen, neu dupliziert |

### C09-1 - geschlossen

Die Vergleichsdiagnostik traegt jetzt `terminalRuinRuns`,
`terminalRuinSharePct`, `quantileInTerminalRuinBlock` und einen Klartextstatus.
Auf denselben drei Gittern nachgemessen:

| Regime | Terminalruinanteil | `worst5Drawdown` Spanne | als gesaettigt markiert | Heatmap-Hinweis | Pareto-Hinweis | `findBestParameters` |
| --- | --- | --- | --- | --- | --- | --- |
| hoch | 50,00 Prozent | 100,00 bis 100,00 | 15 von 15 | vorhanden | vorhanden | verweigert, `tiedBestCount` 15 |
| mild | 4,50 Prozent | 92,84 bis 98,60 | 0 von 15 | keiner | keiner | eindeutige Fuehrung |
| ruinfrei | 0,00 Prozent | 65,13 bis 65,30 | 0 von 15 | keiner | keiner | verweigert, `tiedBestCount` 5 |

Der im ersten Durchgang beanstandete Zustand ist damit beseitigt: im
gesaettigten Fall wird keine Fuehrung mehr behauptet, die einfarbige Heatmap
traegt den roten Hinweis samt Zusatz "Die Metrik unterscheidet die
dargestellten Kombinationen nicht", und die entartete Pareto-Frontier weist
aus, dass die Zielgroesse nichts beitraegt. Die Ranking-Verweigerung ist die
eigentliche Verbesserung, weil sie den frueheren Array-Index-Gewinner
ersetzt.

### C09-3 - geschlossen, mit belastbarer Messung

Das unqualifizierte Literal ist durch drei getrennte Aussagen ersetzt
(`commonSeedScheduleAcrossCombinations`, `commonDrawsUntilStrategyTermination`,
`completeRawPathsCommonAcrossCombinations: false` plus `pathEqualityScope`).
Diese Fassung ist nachweislich richtig, und der Nachweis ist scharf:

| Regime | distinkte Sampling-Fingerprints ueber 15 Kombinationen |
| --- | --- |
| ruinfrei (0,0 Prozent) | **1** |
| mild (4,5 Prozent) | 7 |
| hoch (50,0 Prozent) | 14 |

Solange keine Kombination frueher terminiert, sind die Rohpfade vollstaendig
identisch; die Divergenz waechst genau mit dem Anteil frueh beendeter Laeufe.
Damit ist sowohl die alte, unbedingte Behauptung als falsch als auch die neue,
bedingte als zutreffend belegt.

### C09-5 - geschlossen

Der ergaenzte Fall faehrt zwei wirkungsverschiedene Kombinationen (targetEq 40
gegen 80) ueber vier Jahre ohne Ruin und vergleicht die Rohpfadtraces. Unter
der alten `comboIdx`-Ableitung waeren die Traces verschieden; der Fall ist
also diskriminierend. Er pinnt bewusst nur den Trace und nicht den
vollstaendigen Fingerprint - das ist konsistent mit der jetzt qualifizierten
Zusage aus C09-3.

### D09-1 - Restrisiko: CRN und Quantilmetriken arbeiten gegeneinander

Je besser CRN wirkt, desto haeufiger waehlen Ordnungsstatistiken ueber
verschiedene Kombinationen denselben Lauf aus - und liefern dann bitgleiche
Werte. Anzahl **distinkter** Metrikwerte ueber 15 Kombinationen:

| Metrik | hoch | mild | ruinfrei |
| --- | --- | --- | --- |
| `successProbFloor` | 5/15 | 3/15 | **1/15** |
| `p10EndWealth` | **1/15** | 12/15 | 4/15 |
| `p25EndWealth` | **1/15** | 7/15 | 2/15 |
| `medianEndWealth` | 5/15 | 5/15 | **1/15** |
| `p75EndWealth` | 12/15 | 6/15 | 2/15 |
| `meanEndWealth` | 15/15 | 15/15 | 6/15 |
| `maxEndWealth` | 7/15 | 2/15 | **1/15** |
| `worst5Drawdown` | **1/15** | 12/15 | 2/15 |
| `minRunwayObserved` | **1/15** | **1/15** | **1/15** |

`meanEndWealth` ist die einzige Metrik, die in jedem Regime durchgaengig
unterscheidet - sie aggregiert alle Laeufe, statt eine Ordnungsstatistik zu
greifen. Auf die Gleichstandsregel angewandt verweigert `findBestParameters`
in **8 von 12** gemessenen Metrik-Regime-Kombinationen jede Parameterausgabe,
darunter im wuenschenswerten ruinfreien Fall alle vier geprueften Metriken
einschliesslich der in der Oberflaeche vorausgewaehlten `successProbFloor`.
`minRunwayObserved` ist in allen drei Regimen konstant 0 und damit als
Vergleichsmetrik dauerhaft unbenutzbar - es ist ein Minimum ueber 200 Laeufe.

Die Verweigerung selbst ist inhaltlich richtig: es gibt dort keinen eindeutigen
Sieger, und die Vorversion hat genau das verschwiegen. Zu beanstanden ist
nicht das Verhalten, sondern dass es nirgends vermessen oder dokumentiert ist.
D-07 und die Quantilmetriken stehen in einer systematischen Wechselwirkung, die
weder in den "Offenen Risiken" noch in der Vergleichsdiagnostik auftaucht. Die
Nutzermeldung nennt weder die Ursache noch die gleichauf liegenden Kandidaten;
sie zu zeigen waere nuetzlicher, als gar nichts zu zeigen. Nach dem Massstab,
den Slice 08 an A08-2 angelegt hat, gehoert dieser Verhaltensdelta beziffert in
den Ledger.

### D09-2 - Restrisiko: der Saettigungsdetektor ist eine Messerschneide

`quantileInTerminalRuinBlock` verlangt `Math.abs(worst5Drawdown - 100) <= 1e-12`.
Bei 4,5 Prozent Terminalruin liegt das P95 gemessen zwischen 92,84 und 98,60,
der Status lautet `not_saturated_by_terminal_ruin`, es erscheint kein Hinweis,
und eine "fuehrende Kombination" wird ohne Vorbehalt ausgewiesen. Der Uebergang
ist unstetig: 4,5 Prozent Ruin liefert 92,84 bis 98,60 ohne jede Warnung,
5,5 Prozent liefert exakt 100,00 mit voller Warnung. Zwei Sweeps beiderseits
dieser Grenze wirken qualitativ verschieden, ohne dass die Diagnostik die Naehe
zum Ruinblock abbildet. `terminalRuinSharePct` liegt bereits vor; eine
abgestufte Warnung waere ohne neue Groessen moeglich.

### D09-3 - Restrisiko: falsche Abbruchgranularitaet der Fail-closed-Pruefung

Die Bereichspruefung aus C09-7 wirft einen `RangeError` innerhalb von
`aggregateSweepMetrics`. Der Aufruf in `runSweepChunk` steht nicht in einem
`try`. Ein einziger Lauf einer einzigen Kombination mit einem Drawdown
ausserhalb 0 bis 100 verwirft damit die Ergebnisse **aller** Kombinationen -
im Workerpfad als `SWEEP_WORKER_ERROR`, seriell als generische Fehlermeldung.
Das Modul besitzt mit `invalidComboReason` und `makeInvalidSweepMetrics` bereits
den Mechanismus fuer genau diese Situation auf Kombinationsebene; er wird hier
nicht genutzt. Die Vorbedingung ist derzeit nicht erreichbar, weil
`computeRunStatsFromSeries` mathematisch auf 0 bis 100 begrenzt ist, solange
die Vermoegensserie nichtnegativ bleibt - die Pruefung ist also eine
Verteidigung gegen einen kuenftigen Defekt. Genau dann ist die Granularitaet
entscheidend, weil ein solcher Defekt einen langlaufenden Sweep vollstaendig
entwertet.

### D09-4 - Hinweis: berechnete, aber unsichtbare Entartungsdiagnose

`findBestParametersMultiObjective` ermittelt ueber
`normalized[metricKey].range === 0`, welche Zielgroessen fuer jede Kombination
denselben neutralen Wert 0,5 beitragen, und liefert das Ergebnis als
`rankingDiagnostics.degenerateMetricKeys` zurueck. `renderComparisonNotice`
liest jedoch nur `status` und `tiedBestCount`. Der Multiobjective-Vergleich
verschweigt damit weiterhin, dass eine seiner beiden Zielgroessen nichts
beigetragen hat - also genau die Lage, wegen der C09-1 aufgemacht wurde, in dem
einen Consumer, der in diesem Fall noch ein Ergebnis anzeigt.

### D09-5 - Hinweis: Zwei-Kandidaten-Multiobjective ist strukturell ergebnislos

Die Min-Max-Normalisierung bildet bei genau zwei Kandidaten jede Metrik auf
{0, 1} ab. Gewinnt jeder Kandidat eine Zielgroesse und sind die Gewichte
gleich, ist der Score zwingend 0,5 zu 0,5, die Gleichstandsregel greift und es
wird kein Parameter ausgegeben. Der mitgelieferte Consumertest schreibt genau
diesen Ausgang fest (konservativ 100.000 EUR bei 20 Prozent Drawdown gegen
aggressiv 200.000 EUR bei 50 Prozent). Ein regulaerer Zielkonflikt bleibt damit
unbeantwortet, obwohl Gewichte gerade zu seiner Aufloesung existieren. Der
mitgelieferte Demoaufruf verwendet 0,6 zu 0,4 und trifft den Fall nicht.

### D09-6 - Hinweis: der Sweep verlaesst den projektweiten Ruinschalter

`BREAK_ON_RUIN` wird in `sweep-runner.js` nicht mehr importiert, der Abbruch
ist unbedingt. Der Monte-Carlo-Runner und der historische Backtest lesen die
Konstante weiterhin. Aktuell ist sie hart auf `true` gesetzt, das Verhalten
also unveraendert. Dass der Sweep aus diesem Schalter ausgeschert ist, steht
weder im Metrikvertrag noch im Nicht-Scope.

### D09-7 - Hinweis: zwei Namen fuer dieselbe Zahl

`terminalRuinRuns` zaehlt `outcome?.failed === true`, `failedRuns` ergibt sich
als `runCount - successCount` mit `successCount` als Zahl der `!r.failed`.
Fuer boolesche Werte sind beide identisch; sie laufen nur bei einem truthy,
aber nicht strikt gleichen `failed` auseinander, und zwar in gegenlaeufige
Richtung. Zwei Felder desselben versionierten Objekts geben vor, verschiedene
Groessen zu messen, und messen dieselbe.

### D09-8 - Hinweis: G09-1 ist unbeziffert

Die Umstellung der Vermoegensquantile auf lineare Interpolation ist ohne
Zahlendelta dokumentiert. Isoliert vermessen (identische `runOutcomes`, nur die
Methode unterscheidet sich, 200 Laeufe je Kombination):

| Metrik | hoch | mild | ruinfrei |
| --- | --- | --- | --- |
| P10 | 0 von 15 geaendert | 14 von 15, max. 3,62 Prozent | 15 von 15, max. 0,49 Prozent |
| P25 | 0 von 15 | 15 von 15, max. 1,11 Prozent | 15 von 15, max. 0,83 Prozent |
| Median | 6 von 15, max. 50,00 Prozent (7.173,73 EUR) | 15 von 15, max. 1,32 Prozent | 15 von 15, max. 2,51 Prozent (33.180,91 EUR) |
| P75 | 14 von 15, max. 3,62 Prozent (16.650,84 EUR) | 15 von 15, max. 4,77 Prozent (81.331,73 EUR) | 15 von 15, max. 4,45 Prozent (120.655,82 EUR) |
| Max | unveraendert | unveraendert | unveraendert |

Der Medianeffekt im hohen Ruinregime ist qualitativ: die Aussage "das
Median-Endvermoegen ist 0" kann in einen positiven Betrag kippen, weil zwischen
einem ruinierten und einem positiven Lauf interpoliert wird. Das ist eine
nutzersichtbare Zahlenaenderung ohne Eintrag im Delta-Ledger.

### D09-9 - Hinweis: Spread-Operator-Grenze

`maxEndWealth` wird jetzt ueber `Math.max(...endWealths)` statt ueber das
letzte Element des sortierten Arrays gebildet. Gemessen: 100.000 Laeufe laufen
durch, 125.000 liefern `RangeError: Maximum call stack size exceeded`. Der
Parametervertrag erlaubt `anzahl` bis 1.000.000. Die Fehlerklasse ist nicht
neu - `Math.min(...runways)` besteht unveraendert seit vor dem Slice, die
Schwelle bleibt also gleich. Der Slice hat allerdings eine spreadfreie Stelle
durch eine zweite Spread-Stelle ersetzt, statt die Klasse zu beseitigen.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache:

Ein Nutzer meldet, der Parametervergleich "funktioniere nicht mehr": nach jedem
Sweep erscheint "Keine eindeutig fuehrende Kombination", und es werden keine
Parameter zur Uebernahme angeboten. Gesucht wird in der Gleichstandserkennung
und in `metricValuesEqual`. Tatsaechlich arbeitet die Regel korrekt - die
Werte sind wirklich gleich, weil Common Random Numbers dafuer sorgen, dass
Ordnungsstatistiken ueber alle Kombinationen denselben Lauf greifen. Weil diese
Wechselwirkung nirgends vermessen oder dokumentiert ist, wird die
Gleichstandsregel als Fehler behandelt und aufgeweicht - womit die
Array-Index-Auswahl zurueckkaeme, die C09-1 gerade beseitigt hat.

## Re-Review-Ergebnis

- Status: **freigegeben**
- Blocker: keine. C09-1 ist geschlossen und die Wirkung in allen drei
  Ruinregimen nachgemessen; C09-2 bis C09-9 sind ebenfalls geschlossen.
- Restrisiken: D09-1 (CRN macht Ordnungsstatistiken identisch; gemessen
  verweigert das Ranking in 8 von 12 Metrik-Regime-Kombinationen, im ruinfreien
  Fall bei allen vier geprueften Metriken - unvermessen und undokumentiert),
  D09-2 (Saettigungsdetektor als Messerschneide; 4,5 Prozent Ruin bleibt
  ungekennzeichnet), D09-3 (Fail-closed-Pruefung reisst den gesamten Sweep ab
  statt der Kombination), D09-4 bis D09-9 als Hinweise, darunter das
  unbezifferte G09-1-Delta von bis zu 4,77 Prozent beziehungsweise
  120.655,82 EUR.
- Pre-Mortem: siehe oben - die korrekt arbeitende Gleichstandsregel wird als
  Defekt fehlgedeutet und rueckgaengig gemacht.

## Review-Antworten von Codex

**Nachbesserungsdatum:** 2026-07-27

- **C09-1 angenommen und technisch behoben:** `SweepComparisonDiagnosticsV2`
  weist `terminalRuinRuns`, `terminalRuinSharePct` und
  `quantileInTerminalRuinBlock` aus. Heatmap und Pareto warnen sichtbar vor
  der Saettigung. Single-, Multiobjective- und Constraint-Rankings geben bei
  exaktem Gleichstand keine nach Array-Reihenfolge ausgewaehlten Parameter
  mehr zur Uebernahme frei.
- **G09-1 angenommen und technisch behoben:** P10, P25, Median und P75
  verwenden jetzt durchgaengig `quantile()` mit linearer Interpolation an
  `(n - 1) * q`. Vier handberechnete Orakel und das Sweep-/MC-Rohpfadorakel
  diskriminieren die alte `Math.floor(n * q)`-Methode.
- **G09-2 angenommen und technisch behoben:** Heatmap, Pareto sowie Single-,
  Multiobjective- und Constraint-Vergleich nennen bei einem
  Legacy-/unversionierten Shape den veralteten Ergebnisvertrag und fordern
  einen neuen Sweep an.
- **C09-2 angenommen und technisch behoben:** Der nicht fachlich
  neukalibrierte Demo-Schwellwert `worst5Drawdown <= 40` wurde entfernt.
  Der Demo enthaelt nur noch den bereits beschriebenen
  Erfolgsquoten-Constraint.
- **C09-3 angenommen und technisch behoben:** `SweepCommonRandomNumbersV2`
  ersetzt das unqualifizierte Literal durch getrennte Garantien fuer
  gemeinsame Seedplaene, gemeinsame Ziehungen bis zur
  strategieabhaengigen Terminierung und ausdruecklich nicht garantierte
  vollstaendige Rohpfadgleichheit. Ein Test mit wirkungsverschiedenen
  Kombinationen diskriminiert die alte Combo-Index-Seeds.
- **C09-4 als verbleibende Modellgrenze angenommen und sichtbar gemacht:**
  `SweepMetricMetadataV2` markiert die Sweep-spezifische Definition und die
  fehlende direkte Vergleichbarkeit zur unversionierten MC-Kennzahl.
  Heatmap, Pareto und Parametervergleich zeigen denselben Hinweis. Die
  MC-Metriksemantik bleibt gemaess Nicht-Scope unveraendert.
- **C09-5 angenommen und technisch nachgebessert:** Ein
  wirkungsverschiedener Zwei-Kombinationen-Test prueft gemeinsame
  Rohpfadtraces und wuerde die alte Ableitung mit `comboIdx` erkennen. Die
  vom Reviewer gemessenen Empfehlungsverschiebungen bleiben als
  Attributionsnachweis im Review dokumentiert; es wurde kein Golden-Target
  geaendert.
- **C09-6 bis C09-9 angenommen und technisch behoben:** neue sichtbare Texte
  verwenden korrekte Umlaute und Singular/Plural; Drawdownwerte ausserhalb
  0 bis 100 werfen fail-closed; leere Metriklisten sind nicht gueltig; der
  Sweep beendet einen terminalen Ruin nach Aufnahme des Nullpunkts immer.

**Technische Nachvalidierung:** `npm test` mit 7.951/7.951 Assertions, 0
offenen Handles; 16/16 Browser-Szenarien; `git diff --check` gruen.
Eigenfreigabe ist ausgeschlossen, ein unabhaengiges Re-Review steht aus.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U09-1 | Nutzer | Slice 09 implementieren | angenommen | technisch umgesetzt; Re-Review ausstehend |
| C09-1 | Claude 2026-07-27 | `worst5Drawdown` ist oberhalb rund 5 Prozent Ruinquote ueber alle Kombinationen konstant 100; gemessen 15 von 15 Heatmapzellen in der Mittelfarbe, Pareto-Frontier auf 1 von 15 Punkten kollabiert, kein Ausweis in der Vergleichsdiagnostik | angenommen | Saettigungsdiagnostik und sichtbare Consumerwarnungen umgesetzt; Re-Review ausstehend |
| C09-2 | Claude 2026-07-27 | der Default-Constraint `worst5Drawdown <= 40` aus `runConstraintBasedDemo` ist auf die alte, invertierte Skala kalibriert; end-to-end gemessen 0 von 15 zulaessigen Kombinationen schon bei 4,5 Prozent Ruinquote | angenommen | veralteten Demo-Constraint entfernt |
| C09-3 | Claude 2026-07-27 | `commonAcrossCombinations: true` ist ein statisches Literal; bei drei verschiedenen Kombinationen mit identischen Seeds divergieren die vollstaendigen Samplingfingerprints nachweislich (a05e043b / 7169afea / f417f9bd) | angenommen | qualifizierte CRN-Provenienz V2 und wirkungsverschiedenes Orakel umgesetzt |
| C09-4 | Claude 2026-07-27 | Sweep und Monte Carlo definieren den maximalen Drawdown seit diesem Slice unterschiedlich; bei gleicher Ruinhaeufigkeit von 49,50 Prozent erreichen im Sweep konstruktiv alle gescheiterten Laeufe 100 Prozent, im MC nur 5,50 Prozent - nur die Sweep-Variante ist versioniert | angenommen als Modellgrenze | in Metadaten und UI sichtbar abgegrenzt; MC-Semantik bleibt Nicht-Scope |
| C09-5 | Claude 2026-07-27 | der Fixturebestand ist strukturell blind fuer die CRN-Umstellung: von rund 40 comboRange-Fixtures nutzt genau eines start 1; die reale Empfehlung verschiebt sich unbeziffert (bester Index 12 auf 10 beziehungsweise 11 auf 1) | angenommen | wirkungsverschiedener CRN-Regressionsfall ergaenzt; Reviewmessung als Attribution dokumentiert |
| C09-6 | Claude 2026-07-27 | korrekte Umlaute wurden in nutzersichtbaren Texten durch ASCII-Ersatzschreibung ersetzt und mit `1 Laeufe je Kombination` samt Singularfehler per Test festgeschrieben | angenommen | Umlaute und Singular/Plural korrigiert |
| C09-7 | Claude 2026-07-27 | die Drawdown-Klemmung auf 0 bis 100 ist fail-open und im Test bewusst so gepinnt; ein Wert von 140 wird stumm zu 100 und ist dann nicht mehr vom Terminalruin unterscheidbar | angenommen | Bereichsverletzung wirft fail-closed |
| C09-8 | Claude 2026-07-27 | `isValidSweepResult(result, [])` ist vakuum-wahr; der Defaultwert kodiert nun "alles gueltig" statt "nichts geprueft" | angenommen | expliziter Resultshape und mindestens ein Metrikschluessel erforderlich |
| C09-9 | Claude 2026-07-27 | der terminale Nullpunkt ist nur unter `BREAK_ON_RUIN === true` terminal; bei false entstuende ein 100-Prozent-Ausschlag mitten in der Serie mit anschliessender Scheinerholung | angenommen | Sweep-Ruin nach Nullpunkt immer terminal |
| G09-1 | Gemini 2026-07-27 | Vermoegensquantile verwenden eine andere Methode als D-06 | angenommen | alle vier Quantile auf kanonische Interpolation umgestellt; Re-Review ausstehend |
| G09-2 | Gemini 2026-07-27 | Legacy-Shapes werden ohne UI-Migrationshinweis verworfen | angenommen | Neustarthinweise in allen sichtbaren Sweep-Consumern umgesetzt |
| C09-1 | Claude 2026-07-27 | Re-Review: Saettigung in Diagnostik, Heatmap, Pareto und Ranking ausgewiesen; nachgemessen 15 von 15 als gesaettigt markiert, Ranking verweigert die Fuehrung | geschlossen | ausstehend |
| C09-3 | Claude 2026-07-27 | Re-Review: qualifizierte CRN-Zusage ist messbar zutreffend - bei 0 Prozent Ruin genau 1 distinkter Fingerprint ueber 15 Kombinationen, bei 4,5 Prozent 7, bei 50 Prozent 14 | geschlossen | ausstehend |
| C09-5 | Claude 2026-07-27 | Re-Review: wirkungsverschiedener Zwei-Kombinationen-Fall ergaenzt, der die alte Combo-Index-Ableitung erkennt | geschlossen | ausstehend |
| C09-7 | Claude 2026-07-27 | Re-Review: Bereichsverletzung wirft fail-closed; Restrisiko zur Abbruchgranularitaet siehe D09-3 | geschlossen | ausstehend |
| D09-1 | Claude 2026-07-27 | CRN macht Ordnungsstatistiken ueber Kombinationen bitgleich; gemessen verweigert `findBestParameters` in 8 von 12 Metrik-Regime-Kombinationen jede Parameterausgabe, im ruinfreien Fall bei allen vier geprueften Metriken. Verhalten ist inhaltlich richtig, aber unvermessen und undokumentiert | offen - Restrisiko | ausstehend |
| D09-2 | Claude 2026-07-27 | `quantileInTerminalRuinBlock` verlangt exakt 100 (Toleranz 1e-12); bei 4,5 Prozent Terminalruin liegt das P95 gemessen zwischen 92,84 und 98,60 und bleibt vollstaendig ungekennzeichnet | offen - Restrisiko | ausstehend |
| D09-3 | Claude 2026-07-27 | der `RangeError` aus der Bereichspruefung wird in `runSweepChunk` nicht gefangen; ein einziger Lauf einer Kombination verwirft die Ergebnisse aller Kombinationen, obwohl `invalidComboReason` fuer genau diesen Fall existiert | offen - Restrisiko | ausstehend |
| D09-4 | Claude 2026-07-27 | `rankingDiagnostics.degenerateMetricKeys` wird berechnet und zurueckgegeben, aber von `renderComparisonNotice` nie angezeigt | offen - Hinweis | ausstehend |
| D09-5 | Claude 2026-07-27 | bei genau zwei Kandidaten mit gleichen Gewichten erzwingt die Min-Max-Normalisierung den Score 0,5 zu 0,5; der Multiobjective-Vergleich bleibt bei einem regulaeren Zielkonflikt ergebnislos, was der Consumertest festschreibt | offen - Hinweis | ausstehend |
| D09-6 | Claude 2026-07-27 | `BREAK_ON_RUIN` wird im Sweep nicht mehr gelesen, waehrend MC-Runner und Backtest die Konstante weiterhin auswerten; die Ausnahme steht weder im Metrikvertrag noch im Nicht-Scope | offen - Hinweis | ausstehend |
| D09-7 | Claude 2026-07-27 | `terminalRuinRuns` und `failedRuns` messen dieselbe Groesse unter zwei Namen und laufen nur bei nicht-booleschem `failed` gegenlaeufig auseinander | offen - Hinweis | ausstehend |
| D09-8 | Claude 2026-07-27 | das G09-1-Delta ist unbeziffert; isoliert gemessen bis 4,77 Prozent beziehungsweise 120.655,82 EUR im P75, und im hohen Ruinregime kippt der Median in 6 von 15 Kombinationen von 0 auf einen positiven Betrag | offen - Hinweis | ausstehend |
| D09-9 | Claude 2026-07-27 | gemessene Spread-Operator-Grenze bei rund 125.000 Laeufen; die Klasse ist nicht neu, wurde aber durch `Math.max(...endWealths)` ein zweites Mal eingefuehrt statt beseitigt | offen - Hinweis | ausstehend |
