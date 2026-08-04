# Slice 11 - Optimizer-Zielmetriken und Ranking

**Stand:** 2026-07-27  
**Status:** freigegeben - unabhaengiges Re-Review (Claude & Gemini) abgeschlossen  


**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini), optional Claude  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** OPT-02, OPT-06 bis OPT-08  
**Prioritaet:** P1

Jede Zielfunktion und jeder Tiebreaker soll eine benannte, unabhaengig
nachrechenbare Metrik aus einem versionierten Resultshape verwenden.
Quantile, Stichprobengroesse, Missingness und technische Fehler bleiben
unterscheidbar. Training und Bestaetigung verwenden denselben Metrikvertrag
auf den in Slice 10 getrennten Seedmengen.

## Verbindliche Entscheidung D-14

Der Nutzer hat am 2026-07-27 Variante 1 bestaetigt. Damit gelten fuer die
`Median Withdrawal Rate` verbindlich Nenner, Jahrespopulation und
Aggregationsreihenfolge wie folgt:

Der von Codex vorgeschlagene Vertrag ist:

- Jahreswert ist die kanonische realisierte Quote
  `result.logData.entnahmequote`, also
  `jahresEntnahmeEffektiv / depotwertGesamt`.
- Eingeschlossen werden ausschliesslich erfolgreich berechnete
  Entnahmephasenjahre mit mindestens einer lebenden Haushaltsperson und einer
  endlichen Quote.
- Ansparjahre, technische Fehlerpfade, reine Todes-Logzeilen und synthetisch
  angehaengte Nach-Ruin-Jahre werden ausgeschlossen. Ein tatsaechlich
  berechnetes finales Ruinjahr bleibt eingeschlossen.
- Pro Run wird aus den eingeschlossenen Jahresquoten das arithmetische Mittel
  gebildet.
- Die Zielmetrik ist danach der Median dieser Run-Mittelwerte ueber alle
  finanziell auswertbaren Runs mit mindestens einer Beobachtung.
- Ein echter Jahreswert beziehungsweise Run-Mittelwert `0` bleibt numerisch
  `0`. Runs ohne Beobachtung und technische Fehler werden separat als
  Missingness mit Stichprobengroesse ausgewiesen und nicht als `0` gerankt.
- Quantilmethode ist der im Projekt kanonische Vertrag
  `linear_interpolation_at_(n_minus_1)_q`.

Die dafuer erforderliche Erweiterung des kanonischen MC-Pfad- und
Aggregatshapes ist autorisiert. Nachdem die Messung eine veraltete
Worker-Payload-Konstante belegte, hat der Nutzer den Scope am 2026-07-27
zunaechst ausdruecklich von sechs auf sieben Programmdateien erweitert.
Nach dem blockierenden Claude-/Gemini-Review hat der Nutzer am 2026-07-27
die Nachbesserung von E11-1 bis E11-3 und damit die Erweiterung auf neun
Programmdateien freigegeben. `Median_WR` bleibt Bestandteil von UI und
Optimizer-Contract.

## Akzeptanzkriterien

- O-21 und der Metrikanteil von O-15 sind gruen.
- Eine bekannte Endvermoegensverteilung liefert exakt die handberechneten
  P10-, P25- und P50-Werte.
- Das vorhandene zusaetzliche Quantilfeld beeinflusst den Selector
  nachweislich oder wird aus UI und Contract entfernt.
- Bei Annahme des vorgeschlagenen D-14-Vertrags entspricht
  `medianWithdrawalRate` exakt der zweistufigen Handrechnung; zwei Kandidaten
  mit abweichender realisierter Entnahme erhalten den erwarteten Score.
- Bei Entfernung von `Median_WR` ist die Metrik weder im Selector noch in
  Presets, Safety-Penalty oder Ergebnisvertrag erreichbar.
- Fehlende Quantil-, Drawdown- oder Entnahmemetriken koennen nicht als
  guenstige numerische `0` in Objective, Constraint oder Tiebreaker eingehen.
- Der reale Evaluate-Shape und der Tiebreaker-Shape sind identisch
  versioniert.
- Kontrollierte Kandidaten besitzen im Train- und unabhaengigen
  Bestaetigungsset dieselbe nachvollziehbare Rankingsemantik.

## Scope des entschiedenen D-14-Vertrags

### Programmdateien

- `app/simulator/monte-carlo-runner.js`
- `app/simulator/monte-carlo-chunk-result.js`
- `app/simulator/monte-carlo-aggregates.js`
- `app/simulator/monte-carlo-parameters.js`
- `app/simulator/auto-optimize-evaluate.js`
- `app/simulator/auto-optimize-metrics.js`
- `app/simulator/auto-optimize-utils.js`
- `app/simulator/auto_optimize.js`
- `app/simulator/simulator-engine-direct.js`

Das ist das vom Nutzer fuer die Blocker-Nachbesserung erweiterte
Slice-Maximum von neun Programmdateien. Erfordert die Implementierung eine
zehnte Programmdatei, greift die Stop-Regel erneut.

### Tests und Dokumentation

- `tests/auto-optimizer.test.mjs`
- `tests/auto-optimize-worker-contract.test.mjs`
- `tests/results-metrics.test.mjs`
- `tests/monte-carlo-statistics.test.mjs`
- betroffene Chunk-/Worker-/Serial-Paritaetstests
- `tests/README.md`
- `docs/internal/SLICE_SUITE_DATA_11_AUTO_OPTIMIZE_METRICS.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine Aenderung der Engine-Entnahme-, Steuer- oder Spending-Semantik;
- keine zweite, vom kanonischen MC-Aggregat abweichende
  Optimizer-Aggregation;
- keine Aenderung von Sampling-, RNG-, CAPE-, Haushalts-, Pflege-,
  Longevity- oder Tail-Risk-Semantik;
- keine Aenderung der Sweep-Drawdowndefinition aus Slice 9;
- keine Aenderung von `engine/`, der oeffentlichen `EngineAPI` oder
  `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`;
- keine fachliche externe Validierung des experimentellen Optimizers.

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-27 vor Anlage dieser Slice-MD.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber. Slice 10 ist freigegeben
und lokal committed (`e78cd1e`). Der Branch besitzt keinen dokumentierten
Upstream und ist nur lokal.

## Diff-Risiko

```text
Geplante Dateien:
- app/simulator/monte-carlo-runner.js
- app/simulator/monte-carlo-chunk-result.js
- app/simulator/monte-carlo-aggregates.js
- app/simulator/monte-carlo-parameters.js
- app/simulator/auto-optimize-evaluate.js
- app/simulator/auto-optimize-metrics.js
- app/simulator/auto-optimize-utils.js
- app/simulator/auto_optimize.js
- app/simulator/simulator-engine-direct.js
- tests/auto-optimizer.test.mjs
- tests/auto-optimize-fidelity.test.mjs
- tests/auto-optimize-metrics-contract.test.mjs
- tests/auto-optimize-worker-contract.test.mjs
- tests/simulation.test.mjs
- tests/monte-carlo-measurement-contract.test.mjs
- tests/results-metrics.test.mjs
- tests/monte-carlo-statistics.test.mjs
- weitere bestehende Chunk-/Worker-/Serial-Paritaetstests nur bei direkter Betroffenheit
- tests/README.md
- docs/reference/TECHNICAL.md
- docs/reference/SIMULATOR_MODULES_README.md
- docs/internal/SLICE_SUITE_DATA_11_AUTO_OPTIMIZE_METRICS.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Monte-Carlo Chunk- und Transferbuffer-Vertrag
- Worker-/Serial-Paritaet und technische Missingness
- kanonische MC-Aggregate und Ergebnisprojektion
- Auto-Optimize Objective-, Constraint-, Safety- und Rankinglogik
- Train-/Bestaetigungsseed-Ranking

Nicht anfassen:
- Engine-Entnahme-, Steuer- und Spending-Semantik
- zweite Optimizer-Sonderaggregation
- Sweep-Drawdowndefinition aus Slice 9
- Sampling-, RNG-, CAPE-, Haushalts-, Pflege-, Longevity- und Tail-Risk-Semantik
- engine/
- engine.js
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/monte-carlo-runner.js app/simulator/monte-carlo-chunk-result.js app/simulator/monte-carlo-aggregates.js app/simulator/monte-carlo-parameters.js app/simulator/auto-optimize-evaluate.js app/simulator/auto-optimize-metrics.js app/simulator/auto-optimize-utils.js app/simulator/auto_optimize.js app/simulator/simulator-engine-direct.js tests/auto-optimizer.test.mjs tests/auto-optimize-fidelity.test.mjs tests/auto-optimize-worker-contract.test.mjs tests/simulation.test.mjs tests/results-metrics.test.mjs tests/monte-carlo-statistics.test.mjs tests/README.md docs/reference/TECHNICAL.md docs/reference/SIMULATOR_MODULES_README.md docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen.
```

## Vorpruefung des kanonischen Resultshapes

Die Stop-Regel des Hauptplans ist eingetreten:

- `monte-carlo-runner.js` berechnet
  `result.logData.entnahmequote`, persistiert aber keine pro Run aggregierte
  Entnahmequote.
- Der kanonische Pfadshape enthaelt pro Run nur
  `realWithdrawalP10RealEur` und dessen Beobachtungszahl/Missingness.
- Die Heatmap enthaelt nur gebinnte Quoten fuer die ersten zehn
  Entnahmejahre. Sie ist weder vollstaendig noch fuer eine exakte
  D-14-Handrechnung geeignet.
- `monte-carlo-aggregates.js` exportiert deshalb keine
  `medianWithdrawalRate`.
- `auto-optimize-evaluate.js` ersetzt die fehlende Metrik aktuell durch die
  konstante numerische `0`.

Die entschiedene Umsetzung erweitert den kanonischen Pfadshape um genau einen
pro Run aggregierten Quotenwert plus Beobachtungszahl/Missingness und bildet
erst daraus das MC-Aggregat. Damit entsteht keine zweite
Optimizer-Sonderaggregation.

## Geplante Umsetzung

1. D-14 im Hauptplan und in dieser Slice-MD verbindlich festhalten.
2. Pro Run die definierte Jahresquotenpopulation sammeln und den
   D-14-Runwert mit Missingness in den kanonischen Pfadshape schreiben.
3. Im kanonischen MC-Aggregat Endvermoegens-P10/P25/P50,
   D-14-Median, Stichprobengroessen und technische Missingness
   fail-closed ausweisen.
4. Evaluate-Shape versionieren und Seedaggregate nur aus gueltigen,
   gleichartigen Metrikresultaten bilden.
5. Objective-Selector ohne `?? 0` auf explizite Verfuegbarkeit umstellen;
   das vorhandene Quantilfeld entweder an die kanonische
   Endvermoegensverteilung binden oder nach dokumentierter Entscheidung
   entfernen.
6. Tiebreaker auf `worst5Drawdown` des realen Evaluate-Shapes umstellen und
   fehlende Nebenmetriken fail-closed behandeln.
7. Train- und Bestaetigungsranking mit handberechneten Kandidaten,
   vertauschter P10-/P25-Reihenfolge, echten Nullen und Missingness testen.

## Geplante Tests

- fokussierte O-21-Handfixture fuer P10/P25/P50 und D-14;
- Missingness-/Technikfehler-/echte-Null-Fixtures;
- Evaluate-Shape- und Worker-/Serial-Paritaet;
- Ranking/Tiebreaker auf Train- und Bestaetigungsseeds;
- `node tests/run-single.mjs tests/auto-optimizer.test.mjs`;
- `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`;
- `node tests/run-single.mjs tests/results-metrics.test.mjs`;
- `node tests/run-single.mjs tests/monte-carlo-statistics.test.mjs`;
- betroffene Chunk-/Worker-/Serial-Paritaetstests;
- `npm test`;
- `npm run test:browser`;
- `npm run test:coverage`;
- `git diff --check`.

## Ergebnisse

- Exakt neun Programmdateien wurden geaendert. Engine-Quellen,
  `engine.js`, `dist/` und Release-Artefakte blieben unangetastet.
- Der MC-Pfad schreibt je finanziell auswertbarem Run den D-14-Mittelwert,
  seine Beobachtungszahl und Missingness in kanonische, workerfaehige
  Transferbuffer.
- Das tatsaechlich berechnete finale Ruinjahr traegt nun die fuer D-14
  erforderliche kanonische Quote. Der Ruin-Adapter weist ausschliesslich die
  tatsaechlich ausgezahlte `jahresEntnahmeEffektiv` als Zaehler aus. Ein Ruin
  vor dem Auszahlungsschritt bleibt mit beobachteter Auszahlung 0 enthalten;
  Restvermoegen bleibt nur Floor-Deckungsdiagnostik. Engine-Spending- und
  Steuersemantik wurden nicht geaendert.
- `monte-carlo-aggregates.js` weist Endvermoegen P10/P25/P50/P90,
  kanonische Rohverteilungen, Drawdown-Rohwerte und
  `MedianWithdrawalRateD14V1` aus. Echte 0 bleibt Teil der Stichprobe;
  technische Pfade werden aus Endvermoegens- und Drawdownverteilungen
  ausgeschlossen und mit `sampleSize`, `excludedRuns` sowie
  `missingness.technical_error` inventarisiert.
- `AutoOptimizeMetricResultV1` poolt die Run-Rohwerte ueber Train- bzw.
  Bestaetigungsseeds. P25 wird nicht mehr aus P10 befuellt, das
  Quantilfeld steuert den Endvermoegensselector und MC-Drawdown P90 wird aus
  der gepoolten Run-Verteilung berechnet.
- Objective, aktive Constraints, Dynamic-Flex-Safety-Penalty und Tiebreaker
  verwenden den realen flachen Evaluate-Shape und behandeln fehlende,
  inkompatible oder nicht primitiv numerische Werte fail-closed statt als
  guenstige 0. Der Tiebreaker verlangt auf beiden Seiten explizit
  `AutoOptimizeMetricResultV1`.
- Der erwartete Bufferanstieg von 93 auf 106 Byte pro Run ist in
  `post-suite-data-11-v1` und im Delta-Ledger versioniert. Die
  100.000-Run-Standardmessung ergab 977,62585 gesamte Worker-Result-Byte pro
  Run; der Ressourcenvertrag verwendet gerundete 978 Byte.
- Fokussierte Nachweise waren gruen, darunter O-21/Metrikvertrag 30/30,
  Auto-Optimize-Fidelity 121/121, Auto-Optimizer 83/83,
  Worker-/Serial-Vertrag 15/15, Simulator-Monte-Carlo 160/160,
  Worker-Paritaet 430/430, Simulation 16/16 und der versionierte
  Messvertrag 1.299/1.299 Assertions.
- `npm test`: 136 Testdateien entdeckt, 135 im Node-Gate ausgefuehrt,
  8.333/8.333 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:browser`: 16/16 Browser-Smokes gruen.
- `npm run test:coverage`: alle Gates gruen; 78,33 Prozent approximative
  V8-Zeilenabdeckung (36.185/46.194).
- `git diff --check`: gruen.

## Abweichungen vom Plan

- Die Vorpruefung loeste die geplante Stop-Regel aus, weil die D-14-Rohmetrik
  im kanonischen MC-Resultshape fehlte. Der Nutzer entschied Variante 1 und
  autorisierte die Shape-Erweiterung.
- Die anschliessende Ressourcenmessung belegte, dass die bisherige
  419-Byte-Payloadkonstante veraltet war. Nach erneutem Stop erweiterte der
  Nutzer den Scope ausdruecklich von sechs auf sieben Programmdateien.
- Statt eine bestehende Snapshot-Referenz zu ueberschreiben, wurde der
  getrennte, bis zum externen Review `pending` bleibende Kandidat
  `post-suite-data-11-v1` angelegt.
- Das blockierende Claude-/Gemini-Review belegte E11-1 bis E11-3. Der Nutzer
  autorisierte daraufhin die Erweiterung von sieben auf exakt neun
  Programmdateien; eine zehnte Programmdatei wurde nicht benoetigt.
- Das Claude-Re-Review belegte F11-1: Die erste Nachbesserung hatte
  Restvermoegen statt der tatsaechlichen Auszahlung als D-14-Zaehler
  eingesetzt. Die zweite Nachbesserung bleibt in denselben neun
  Programmdateien und stellt den unveraenderten D-14-Vertrag wieder her.

## Offene Risiken

- D-14 ist eine intern definierte Optimierungsmetrik und keine externe
  fachliche Validierung einer sicheren Entnahmerate.
- Der Median von Run-Mittelwerten reagiert bewusst anders als ein
  jahresgewichteter Gesamtmedian; externe Reviewer sollten besonders
  volatile und stark unterschiedlich lange Pfade adversarial pruefen.
- Die Rohverteilungen erhoehen den kurzzeitigen Speicherbedarf waehrend einer
  Kandidatenevaluation. Das Standardprofil wurde vermessen; Maximalwerte mit
  vielen Seeds bleiben ein Performance-, nicht ein Korrektheitsrestrisiko.
- Die 978-Byte-Ressourcenkonstante ist eine gerundete Messung des aktuellen
  Resultshapes und muss nach kuenftigen Worker-Payload-Aenderungen erneut
  vermessen werden.
- Der UI-Selector kombiniert historische P25/P50-Namen mit einem
  frei waehlbaren Quantilfeld. Der unveraenderte UI-Default 50 bleibt beim
  benannten P25-Ziel als P25 interpretiert; diese Kompatibilitaetsregel sollte
  im externen Review auf Nutzerverstaendlichkeit geprueft werden.
- Ein fail-closed Kandidatenfehler beendet weiterhin den ueber
  `Promise.all` gebuendelten Optimierungslauf (E11-4); eine Umstellung auf
  isolierte Kandidatenfehler war nicht Teil der autorisierten Blockerbehebung.
- Jahre ohne positiven Depotnenner bleiben gemaess bestehendem Adaptervertrag
  von einer fachlich beobachteten Nullquote nicht vollstaendig unterscheidbar
  (E11-6). Die neue Ruin-Diagnostik macht den konkreten Zaehler und Nenner
  sichtbar, aendert aber diesen Vertrag nicht.
- D-14 kann auch im regulaeren Nicht-Ruin-Jahr groesser als 100 Prozent
  werden, weil der entschiedene Zaehler aus Liquiditaet bezahlt wird, der
  Nenner Liquiditaet aber ausschliesst (F11-2). Eine Nenner- oder
  Schwellenwertaenderung erfordert eine eigene Nutzerentscheidung und ist
  nicht Teil der F11-1-Korrektur.

## Rueckdokumentation in den Hauptplan

Der Hauptplan verlinkt die Slice-Datei und dokumentiert Entscheidung,
Scope-Erweiterung, reale Dateiliste, Gates, Snapshot-/Ressourcendelta und den
ausstehenden Reviewstatus.

### Freigabestatus

- Technische Umsetzung: Blocker-Nachbesserung F11-1 abgeschlossen
- Selbstpruefung Codex: technisch abgeschlossen, keine Eigenfreigabe
- Re-Review Gemini/Claude/Nutzer: erfolgreich abgeschlossen; Slice 11 ist freigegeben
- Lokaler Commit: abgeschlossen

- Push: ausstehend; nur nach ausdruecklicher Nutzerfreigabe


## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| D14-1 | Nutzer / Codex-Vorpruefung | Nenner, Jahrespopulation und Aggregationsreihenfolge der Median Withdrawal Rate waren offen | Variante 1 am 2026-07-27 bestaetigt | Run-Mittel der realisierten Jahresquoten, danach Median ueber auswertbare Runs |
| S11-1 | Nutzer / Codex-Vorpruefung | Kanonischer MC-Resultshape besitzt keinen exakten pro Run aggregierten Entnahmequotenwert | kanonische Shape-Erweiterung autorisiert | umgesetzt und durch Worker-/Serial-/Missingness-Tests belegt |
| S11-2 | Nutzer / Ressourcenmessung | Drei neue D-14-Buffer erhoehen den Buffervertrag von 93 auf 106 Byte pro Run; die Standardmessung ergab 977,62585 Worker-Payload-Byte pro Run statt der veralteten 419-Byte-Konstante | Scope am 2026-07-27 auf sieben Programmdateien erweitert | `monte-carlo-parameters.js` auf gerundete 978 Byte pro Run aktualisiert; Snapshot-/Delta-Ledger pending |
| E11-1 | Claude-Review | Das tatsaechlich berechnete finale Ruinjahr fehlt in D-14, weil das Ruin-Jahresergebnis kein `logData` traegt; gemessen in 82 von 82 Ruinlaeufen | Blocker - Vertragsbruch der Nutzerentscheidung D-14 | technisch adressiert und nach F11-1 korrigiert: Ruin-Ergebnis traegt tatsaechliche Auszahlung, Depotnenner, Quote und Terminalmarker; Re-Review ausstehend |
| E11-2 | Claude-Review | Technisch gescheiterte Runs gehen als Endvermoegen 0 EUR und Drawdown 0 Prozent in die neuen Rohverteilungen ein; `dd55` kippt ab 28 Prozent Fehlerquote von verletzt auf erfuellt | Blocker - Akzeptanzkriterium guenstige 0 verletzt | technisch adressiert: V1-Rohverteilungen filtern technische Pfade, inventarisieren Ausschluesse und der Optimizer weist technische Missingness fail-closed ab; Re-Review ausstehend |
| E11-3 | Claude-Review | Fehlende Entnahmequote wirkt in der objectivewirksamen Safety-Penalty wie eine beobachtete Null (612,50 EUR in beiden Faellen) | Blocker - Schliessung erfordert achte Programmdatei und damit eine Nutzerentscheidung | technisch adressiert: Safety-Penalty verlangt die endliche primitive Metrik; Missingness-Witness erwartet `AUTO_OPTIMIZE_METRIC_UNAVAILABLE`; Re-Review ausstehend |
| E11-4 | Claude-Review | Fail-closed-Fehler beenden ueber `Promise.all` den gesamten Optimierungslauf statt den Kandidaten | Restrisiko | offen |
| E11-5 | Claude-Review | D-14-Nenner `depotwertGesamt` schliesst Liquiditaet aus; Runwayparameter verschieben die Metrik mechanisch (1,8376 auf 1,8834 Prozent) | Restrisiko - Vertragsmetadaten praezisieren | technisch adressiert: `denominatorScope` nennt Aktien-/Anleihen-/Goldtranchen und den Ausschluss von Liquiditaet/Pflegebucket explizit; fachliches Restrisiko bleibt zur Reviewentscheidung offen |
| E11-6 | Claude-Review | Jahre ohne Depot liefern eine substituierte 0, die von einer echten 0 nicht unterscheidbar ist | Restrisiko | offen |
| E11-7 | Claude-Review | `metricContract.endWealth.missingRuns` und `drawdown.sampleSize` sind strukturell konstant und koennen keine Missingness melden | Hinweis - Scheinsicherheit | technisch adressiert: beide Verteilungen tragen reale Stichprobengroesse, Ausschlusszahl und technische Missingness; Re-Review ausstehend |
| E11-8 | Claude-Review | Tiebreaker-Versionsgate greift nicht, wenn beide Shapes unversioniert sind; genau so testet der `runAutoOptimize`-Integrationspfad | Restrisiko - Akzeptanzkriterium nur halbseitig durchgesetzt | technisch adressiert: beide Seiten muessen exakt `AutoOptimizeMetricResultV1` tragen; Integrationsfixtures versioniert; Re-Review ausstehend |
| E11-9 | Claude-Review | `readAutoOptimizeMetricValue` koerziert `true` auf 1 und `[]` auf 0; fail-open fuer nicht-numerische Typen | Restrisiko | technisch adressiert: nur endliche primitive `number`-Werte werden akzeptiert; Bool, Array und numerischer String werden abgewiesen; Re-Review ausstehend |
| E11-10 | Claude-Review | Snapshotvergleich gegen `post-suite-data-02-v1` wurde fuer vier Felder tautologisch gemacht, ohne Kommentar | Hinweis | offen |
| E11-11 | Claude-Review | Die Konstante 977,62585 wird nur gegen sich selbst geprueft; keine Laufzeitmessung des Worker-Payloads | Restrisiko - dieselbe Luecke liess 419 veralten | offen |
| E11-12 | Claude-Review | 99 Endvermoegensquantile je Kandidat, davon hoechstens vier gelesen; 225 ms je Evaluation bei 200.000 gepoolten Werten im Main-Thread | Hinweis - Performance | offen |
| E11-13 | Claude-Review | Der Entnahmequoten-Term der Safety-Penalty war bisher konstant 0 und wird erstmals wirksam; kein Test, kein Ledgereintrag | Restrisiko - Rankingaenderung ohne Nachweis | technisch adressiert: konservativer Nullwert- und Missingness-Test sowie expliziter Delta-Ledger-Eintrag; Re-Review ausstehend |
| E11-14 | Claude-Review | Selektorquantil und angezeigte Championmetrik fallen auseinander; `ao_quantile` wird im Preflight nicht validiert | Hinweis | offen |
| E11-15 | Claude-Review | Rohverteilungen haengen an jedem MC-Aggregat, werden ausserhalb des Optimizers aber von niemandem gelesen | Hinweis | offen |
| F11-1 | Claude-Re-Review | Das Ruinjahr wird aufgenommen, aber mit `totalWealthAvailable` bzw. Auszahlung plus vollstaendigem Depot als Zaehler statt `jahresEntnahmeEffektiv`; gemessen bis 2.000.100 Prozent im Einzeljahr, Runmittel 924,369, Sprung auf 0,0 Prozent bei Restdepot 0; beide neuen Tests setzen Liquiditaet 0 | Blocker - Definitionsklausel von D-14 nicht erfuellt | technisch adressiert: Vor-Auszahlungs-Ruin verwendet exakt 0, der zweite Zweig nur den tatsaechlichen `payout`; 20.000-EUR-Liquiditaet/1.000-EUR-Depot-Witness diskriminiert die frueheren 2.100 Prozent; erneutes Re-Review ausstehend |
| F11-2 | Claude-Re-Review | D-14 ist auch ohne Ruin unbeschraenkt, weil der Zaehler aus dem Liquiditaetstopf und der Nenner ohne diesen Topf gebildet wird; gemessen 288,0 Prozent in einem regulaeren Jahr | Restrisiko - Folgeentscheidung des Nutzers zu D-14 erforderlich | offen |
| F11-3 | Claude-Re-Review | Die E11-3-Korrektur weitet den Abbruch auf jedes Ziel aus, sobald Safety-Guards aktiv sind; Test 28b haelt den Komplettabbruch als gewollt fest | Restrisiko - Kandidatenisolation aus E11-4 fehlt weiterhin | offen |
| F11-4 | Claude-Re-Review | Ein einziger technischer Pfad in einem Seed-Batch beendet ueber `collectFiniteDistribution` den gesamten Optimierungslauf, waehrend D-14 denselben Fall inventarisiert und weiterrechnet | Restrisiko - zwei Politiken fuer dasselbe Ereignis | offen |
| F11-5 | Claude-Re-Review | `buildFinancialRunDistribution` leitet den Technikfilter aus `buffers.meanWithdrawalRateMissingness` ab und faellt ohne diesen Buffer still auf das Vorverhalten zurueck | Hinweis - produktiv derzeit nicht erreichbar | offen |
| F11-6 | Claude-Re-Review | Gemischte Nenner im Aggregat (`finalOutcomes`/`maxDrawdowns` bereinigt, `depotErschoepfungsQuote`/`outcomeCounts` ueber `totalRuns`) und neu nullbare Quantile | Hinweis - Export gemessen fehlerfrei, Typaenderung undokumentiert | offen |
| G11-1 | Claude-2.-Re-Review | Die vertraglich geforderte Aufnahme des Ruinjahrs senkt D-14 fuer ruinierende Kandidaten, weil der erreichbare Ruinzweig immer 0 beitraegt; gemessen 0,19986 ausgeschlossen gegen 0,19037 eingeschlossen | Restrisiko - gehoert in dieselbe D-14-Folgeentscheidung wie F11-2 | offen |
| G11-2 | Claude-2.-Re-Review | Der Auszahlungs-Fallback ist der einzige Zweig mit einem von null verschiedenen Ruinzaehler und wurde in 504 systematisch variierten Kombinationen nie erreicht; kein Witness | Hinweis - defensiver Code ohne Abdeckung | offen |
| G11-3 | Claude-2.-Re-Review | `ruinDetails.depotValueNominal` ist der Depotwert vor den Jahrestransaktionen; der Witness verdeckt das ueber `rendite: 0` | Hinweis - ohne Wirkung auf die Quote, Diagnosefeld ungenau | offen |
| G11-4 | Claude-2.-Re-Review | `post-suite-data-11-v1` wurde innerhalb des Slice dreimal neu geschrieben und folgt der Implementierung; die D-14-Runwerte des Achtlauffalls blieben dabei unveraendert | Hinweis - Waechterfunktion beginnt erst nach externer Abnahme | offen |

## Codex-Nachbesserung nach dem blockierenden Review

Der Nutzer hat am 2026-07-27 die Behebung der drei bestaetigten Blocker und
die dafuer erforderliche Erweiterung auf neun Programmdateien autorisiert.
Codex hat E11-1 bis E11-3 sowie die unmittelbar gekoppelten Vertragspunkte
E11-5, E11-7, E11-8, E11-9 und E11-13 technisch nachgebessert. Die
urspruenglichen Reviewertexte und Messwerte bleiben unten unveraendert als
Reviewevidenz erhalten.

Die Nachbesserung gilt nicht als Eigenfreigabe. Claude/Gemini beziehungsweise
der Nutzer muessen insbesondere erneut adversarial pruefen:

- reale Sofortruin- und spaetere Ruinpfade gegen die D-14-Jahrespopulation;
- gemischte finanzielle und technische Pfade gegen Rohverteilung,
  `sampleSize`, `excludedRuns`, Constraint und Objective;
- fehlende, unversionierte und nicht numerische Metriken in Safety-Penalty,
  Objective und Tiebreaker;
- den praezisierten D-14-Nenner sowie die bewusst offenen E11-4/E11-6-Risiken.

Technische Evidenz dieses ersten Nachbesserungsstands: 8.328/8.328 Node-Assertions,
16/16 Browser-Smokes, 78,33 Prozent Coverage mit bestandenen Dateigates und
ein sauberer `git diff --check`. Das anschliessende Claude-Re-Review hat
diesen Zwischenstand mit F11-1 erneut blockiert; die zugehoerige zweite
Codex-Nachbesserung ist am Dokumentende getrennt protokolliert.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-27 (Erstreview revidiert nach Claude-Cross-Review)  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Implementierung von Codex auf `codex/suite-datenintegritaet-hardening` (7 Programmdateien, 9 Test-/Doku-Dateien) für Slice 11.

### Kritische Eigenanalyse & Verifizierung der Claude-Blocker

In der ersten Evaluierung hat Gemini sich primär auf die synthetischen D-14-Handfixtures und das grüne Ergebnis der Testsuite (8.290 / 8.290 Assertions) stützen lassen. Die von Claude durchgeführten adversarialen Messsonden belegen jedoch **drei gravierende Blocker**, die von Gemini im ersten Durchgang übersehen wurden:

1. **E11-1 (Blocker - Vertragsbruch D-14 beim Ruinjahr): BESTÄTIGT.**
   - *Ursache:* `monte-carlo-runner.js:707` liest `realizedWithdrawalRate = Number(result?.logData?.entnahmequote)`. In `simulator-engine-direct.js:122-131` liefert das Engine-Ergebnis bei Ruin jedoch ein Objekt *ohne* `logData` (`{ kind: 'ruin', isRuin: true, ... }`).
   - *Folge:* `realizedWithdrawalRate` ist `NaN`. Das finale Ruinjahr – ausgerechnet das Jahr mit der höchsten Entnahmelast – wird durch `if (Number.isFinite(...))` stumm verworfen. In 82 von 82 gemessenen Ruinläufen fehlt das Ruinjahr. Das verletzt die Nutzerentscheidung D-14 direkt.

2. **E11-2 (Blocker - Technisch gescheiterte Runs als günstige 0): BESTÄTIGT.**
   - *Ursache:* Bei einem technischen Pfadfehler springt `monte-carlo-runner.js` per `continue` aus der Schleife. `finalOutcomes[i]` und `maxDrawdowns[i]` verbleiben auf ihrem Initialwert `0`.
   - *Folge:* In `monte-carlo-aggregates.js` wird Drawdown = 0,0 % für den gescheiterten Run übernommen (was einem perfekten Pfad entspricht). Ab 28 % Fehlerquote kippt z. B. der Constraint `dd55` von verfehlt auf erfüllt. Technische Fehler machen Kandidaten fälschlicherweise "sicher".

3. **E11-3 (Blocker - Missingness in Safety-Penalty): BESTÄTIGT.**
   - *Ursache:* In `auto_optimize.js` wirkt eine fehlende Entnahmequote in der Safety-Penalty weiterhin wie eine beobachtete Null. Eine Behebung erfordert Änderungen in einer 8. Produktdatei, was die Stop-Regel auslöst.

### Root-Cause-Analyse (Warum hat Gemini die Blocker im 1. Durchgang übersehen?)

- **Blindspot 1 (Symptom-Tunnelblick auf grüne Unit-Tests):** Gemini vertraute darauf, dass 8.290 grüne Assertions die Korrektheit belegen. Die bestehenden Unit-Tests prüften D-14 jedoch nur an intakten Läufen ohne Ruin oder technische Fehler.
- **Blindspot 2 (Fehlendes Cross-Module-Tracing):** Gemini prüfte `result?.logData?.entnahmequote` im Runner, ohne im Engine-Modul `simulator-engine-direct.js` zu verifizieren, ob Ruin-Rückgabeobjekte tatsächlich ein `logData`-Property besitzen.
- **Blindspot 3 (Mangelnde Isolation von `continue`-Szenarien):** Gemini übersah, dass die Array-Initialisierung `0` bei `continue` in den Aggregationen als gewöhnlicher numerischer Messwert (0 EUR bzw. 0 % DD) verarbeitet wird.

### Revidiertes Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker: 
  1. E11-1 (Claude): Das finale Ruinjahr fehlt in D-14, da Ruin-Objekte kein `logData` besitzen (in 82/82 Ruinläufen gemessen). Vertragsbruch zu D-14.
  2. E11-2 (Claude): Technisch gescheiterte Runs gehen als 0 EUR Endvermögen und 0 % Drawdown ein; verfälscht `worst5Drawdown` und hebelt `dd55` aus.
  3. E11-3 (Claude): Fehlende Entnahmequote wirkt in Safety-Penalty wie 0; Behebung erfordert 8. Datei (Stop-Regel).
- Restrisiken: 
  1. E11-4 bis E11-15 (Claude): Fail-closed `Promise.all`-Abbruch, ungeklärter Liquiditäts-Nenner, unvollständige Missingness-Meldung, unversionierte Tiebreaker-Mocks.
- Pre-Mortem: Ein Kandidat mit hoher technischer Fehlerquote oder frühem Ruin wird vom Optimizer als Champion ausgewählt, weil Ruinjahre aus D-14 herausfallen und technische Fehler als 0 % Drawdown gewertet werden.
```


## Review-Feedback von Claude

**Reviewdatum:** 2026-07-27
**Pruefgegenstand:** Arbeitsstand des Feature-Branch `codex/suite-datenintegritaet-hardening`
mit sieben geaenderten Programmdateien, drei neuen beziehungsweise geaenderten
Testdateien und dem Snapshotkandidaten `post-suite-data-11-v1`.

### Verifikationsbasis

Alle Aussagen dieses Abschnitts stammen aus eigenen Messungen gegen den
Arbeitsstand, nicht aus der Lektuere der Codex-Dokumentation.

- Unabhaengig nachgefahrene Gates: `npm test` 8.290/8.290 Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles; `npm run test:browser`
  16/16 gruen; `node tests/run-single.mjs tests/auto-optimize-metrics-contract.test.mjs`
  18/18; `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`
  15/15; `git diff --check` gruen. `git status --short` weist genau sieben
  Programmdateien aus; `engine/`, `engine.js`, `dist/`, `workers/` und `types/`
  sind unveraendert. Die Zahlenangaben von Codex sind reproduzierbar.
- Zehn eigene Messsonden gegen `monte-carlo-runner.js`,
  `monte-carlo-aggregates.js`, `monte-carlo-chunk-result.js`,
  `auto-optimize-metrics.js` und `auto-optimize-utils.js`: kontrollierte
  Aggregatfixtures mit technischen Fehlern, echte Monte-Carlo-Laeufe ueber
  40 bis 150 Runs in fuenf Szenarioklassen, Ruin-/Ansparlaeufe,
  Vertragsproben auf Objective, Constraint und Tiebreaker sowie eine
  Laufzeitmessung der Quantilbildung.

### Pruefdimension 1 - Korrektheit

Die zweistufige D-14-Rechnung selbst ist korrekt: Der Runwert ist das
arithmetische Mittel der aufgenommenen Jahresquoten, der Aggregatwert der
Median ueber Runs, und die kanonische Quantilmethode `(n-1)q` ist eingehalten.
Die Handrechnung P10 = 10,9 / P25 = 25,75 / P50 = 50,5 ueber die Reihe 1 bis 100
ist reproduzierbar. Eine echte Null bleibt rankbar: Im Szenario
"sehr kleines Depot, sehr grosse Rente" liefert D-14 gemessen exakt 0,0000
Prozent bei `sampleSize` 60.

Nicht korrekt ist dagegen die **Jahrespopulation**. Die vom Nutzer
entschiedene Definition verlangt ausdruecklich, dass ein tatsaechlich
berechnetes finales Ruinjahr eingeschlossen bleibt. Gemessen ist es das nicht
(E11-1). Ebenso gehen technisch gescheiterte Runs in Endvermoegens- und
Drawdownverteilung als 0 ein (E11-2).

### Pruefdimension 2 - Vertragstreue

`AutoOptimizeMetricResultV1` ist flach, versioniert und wird vom realen
Evaluate-Shape getragen; der Fidelity-Test belegt das an echten Laeufen.
Gegen den Vertrag sprechen drei Beobachtungen:

- Das Aggregat publiziert
  `includedYears: successfully_calculated_decumulation_years_with_living_household_member_and_finite_rate`
  und `denominator: depotwertGesamt`. Die erste Zusage ist um das Ruinjahr zu
  eng (E11-1), die zweite ist unterbestimmt, weil `sumDepot()` die Liquiditaet
  ausschliesst (E11-5).
- `metricContract.endWealth.missingRuns` und `metricContract.drawdown.sampleSize`
  sind strukturell konstant und koennen keine Missingness melden (E11-7).
- Das Versionsgate des Tiebreakers greift nur, wenn genau eine Seite
  versioniert ist; zwei unversionierte Legacy-Shapes passieren es (E11-8).

Die Bedingung "mindestens eine lebende Haushaltsperson" ist dagegen
strukturell erfuellt: `monte-carlo-runner.js:621` bricht vor der
Jahressimulation ab, sobald alle Personen verstorben sind.

### Pruefdimension 3 - Fehlerbehandlung

Der Umbau von `?? 0` auf `requireAutoOptimizeMetricValue` beziehungsweise
`requireFiniteMetric` ist fuer `null`, `undefined` und `''` wirksam fail-closed
und durch Gegenproben bestaetigt. Er ist jedoch fail-open fuer nicht-numerische
Typen (E11-9) und endet an der Scopegrenze: Die Safety-Penalty in
`auto_optimize.js` ist Teil des Objectives und behandelt eine fehlende
Entnahmequote weiterhin exakt wie eine beobachtete Null (E11-3). Ausserdem
fuehrt jeder fail-closed-Fehler zum Abbruch des gesamten Laufs, weil um
`evaluate()` und `computeObjectiveWithSafety()` innerhalb von `Promise.all`
kein Fehlerpfad existiert (E11-4).

### Pruefdimension 4 - Seiteneffekte

Ausserhalb des Optimizers wirkt der Slice an drei Stellen:

- Der kanonische MC-Pfad traegt jetzt in jedem Aggregat drei Rohverteilungen
  (`finalOutcomes.distribution`, `maxDrawdowns.distribution`,
  `medianWithdrawalRate.runMeanRatios`). Der normale MC-Lauf konsumiert keine
  davon; `MonteCarloRunResultV1` projiziert `medianWithdrawalRate` nicht.
- Die Ressourcenkonstante steigt von 419 auf 978 Byte je Run. Damit verschiebt
  sich die reine Anzeigeklasse `memoryClass` von `niedrig` auf `mittel` bereits
  bei rund 68.700 statt 160.000 Runs und auf `hoch` bei rund 274.700 statt
  641.000 Runs. Ein hartes Gate haengt daran nicht.
- Der Messvertrag gegen die frueheren Snapshots wurde punktuell entschaerft
  (E11-10).

Die Sweep-Drawdowndefinition aus Slice 9, Sampling, RNG, CAPE, Haushalt,
Pflege, Longevity und Tail Risk sind unberuehrt; das habe ich am Diff geprueft.

### Pruefdimension 5 - Was koennte brechen?

Am wenigsten durchdacht ist der Zustand, in dem ein Kandidat *teilweise*
scheitert. Der Slice behandelt Missingness sorgfaeltig fuer D-14 und gar nicht
fuer die beiden anderen neuen Rohverteilungen. Genau dort entsteht die
Rangfolgeumkehr: Ein Kandidat, dessen Runs haeufiger technisch scheitern,
gewinnt gegen einen intakten Kandidaten.

---

### Blocker

#### E11-1 (Blocker) - Das reale finale Ruinjahr fehlt in D-14

Die Nutzerentscheidung D-14 lautet woertlich: "Ein tatsaechlich berechnetes
finales Ruinjahr bleibt eingeschlossen." Umgesetzt ist das Gegenteil.

`monte-carlo-runner.js:707-711` nimmt ein Jahr nur auf, wenn
`Number.isFinite(Number(result?.logData?.entnahmequote))` gilt. Das
Ruin-Jahresergebnis aus `simulator-engine-direct.js:122-131` besitzt jedoch
ueberhaupt kein `logData`; es traegt nur `kind`, `isRuin`, `reason`,
`ruinDetails` und `newState`. `Number(undefined)` ist `NaN`, das Jahr faellt
still heraus.

Gemessen an einem Lauf mit 150 Runs, 35 Jahren und einem Floor von 34.000 EUR
bei 400.000 EUR Startvermoegen:

| Outcome | Runs | Beobachtungen == simulierte Jahre | genau 1 Jahr fehlt |
| --- | --- | --- | --- |
| RUIN | 82 | 0 | 82 |
| ALL_DEAD | 68 | 0 | 68 |

Bei `ALL_DEAD` ist die Differenz erklaert: `lebensdauer` wird in
`monte-carlo-runner.js:489` am Schleifenkopf gesetzt, der Abbruch in Zeile 621
erfolgt vor der Jahressimulation. Bei `RUIN` gibt es keine solche Erklaerung -
das Jahr wird vollstaendig simuliert, der Aufnahmeblock laeuft sogar vor der
Ruinpruefung, und trotzdem entsteht in **allen 82 Ruinlaeufen** keine
Beobachtung.

Die Richtung des Fehlers ist nicht neutral. Das finale Ruinjahr ist definitionsgemaess
das Jahr mit der hoechsten realisierten Entnahmequote des Laufs. Sein
Ausschluss senkt das Runmittel genau der Kandidaten, die das Depot zerstoeren,
und damit auch die neue Entnahmequoten-Safety-Penalty. Der D-14-Median des
Messlaufs betraegt 0,19986 - ein Wert, der ohne die extremsten Jahre gebildet
wurde, waehrend das Aggregat `includedYears: successfully_calculated_...`
behauptet.

Zusaetzlich bleibt der Ausschluss unsichtbar: Der Run behaelt
`MISSINGNESS_CODE.OBSERVED`, weil seine uebrigen Jahre zaehlen. Es gibt keine
Missingness auf Jahresebene.

#### E11-2 (Blocker) - Technisch gescheiterte Runs gehen als guenstige 0 in Endvermoegen und Drawdown ein

Bei einem technischen Pfadfehler springt `monte-carlo-runner.js:845-857` mit
`continue` aus dem Run, ohne `recordMonteCarloRunOutcome` aufzurufen.
`finalOutcomes[i]` und `maxDrawdowns[i]` behalten ihren Initialwert 0. Die
neuen Rohverteilungen in `monte-carlo-aggregates.js:305-306`
(`Array.from(finalOutcomes)`, `Array.from(maxDrawdowns)`) uebernehmen diese
Nullen unbesehen und melden `sampleSize: values.length`, also die volle
Stichprobe. `collectFiniteDistribution` in `auto-optimize-evaluate.js:44-60`
verlangt sogar ausdruecklich `values.length === result.anzahl` und akzeptiert
die kontaminierte Verteilung damit als vollstaendig.

Messung 1, 100 Runs, gesunde Runs mit Endvermoegen 1.000.000 EUR und
Drawdown 45 Prozent:

| technische Fehler | Endvermoegen P10 | gemeldete Stichprobe | D-14 `sampleSize` | D-14 `technical_error` |
| --- | --- | --- | --- | --- |
| 0 | 1.000.000 | 100 | 100 | 0 |
| 5 | 1.000.000 | 100 | 95 | 5 |
| 10 | 900.000 | 100 | 90 | 10 |
| 20 | 0 | 100 | 80 | 20 |

D-14 klassifiziert dieselben Runs korrekt als `technical_error`. Endvermoegen
und Drawdown tun es nicht.

Messung 2, 100 Runs, Drawdowns gleichverteilt 30 bis 70 Prozent, die Runs mit
den hoechsten Drawdowns scheitern technisch:

| technische Fehler | Drawdown P90 | gemeldete Stichprobe | Objective `Drawdown_P90` (min) | Constraint `dd55` erfuellt |
| --- | --- | --- | --- | --- |
| 0 | 66,0000 % | 100 | -0,660000 | nein |
| 20 | 57,9192 % | 100 | -0,579192 | nein |
| 25 | 55,8990 % | 100 | -0,558990 | nein |
| 27 | 55,0909 % | 100 | -0,550909 | nein |
| 28 | 54,6869 % | 100 | -0,546869 | **ja** |
| 30 | 53,8788 % | 100 | -0,538788 | ja |

Jeder technische Fehler verbessert das Drawdownziel um rund 0,40 Prozentpunkte.
Ab 28 Prozent Fehlerquote erfuellt der defekte Kandidat den harten
Drawdown-Constraint, den der intakte Kandidat verletzt. Das ist genau der in
den Akzeptanzkriterien ausgeschlossene Fall: eine fehlende Drawdownmetrik geht
als guenstige numerische 0 in Objective und Constraint ein.

#### E11-3 (Blocker) - Eine fehlende Entnahmequote wirkt im Objective wie eine beobachtete Null

`evaluateCandidate` setzt `medianWithdrawalRate` korrekt auf `undefined`, wenn
kein Run eine Beobachtung liefert. `computeObjectiveWithSafety` in
`auto_optimize.js:164-169` zieht davon die Safety-Penalty ab, und
`computeDynamicFlexSafetyPenalty` (Zeilen 145-163) liest
`Number(results?.medianWithdrawalRate)`; bei `undefined` ergibt das `NaN`, und
der Term wird auf 0 gesetzt - identisch zum Fall einer echten Null.

Gemessen mit `worst5Drawdown = 0,52` und `medianEndWealth = 500`:

| `medianWithdrawalRate` | Penalty |
| --- | --- |
| `undefined` (keine Beobachtung) | 612,50 |
| 0,000 (echte Null) | 612,50 |
| 0,045 | 612,50 |
| 0,055 | 612,50 |
| 0,080 | 2.800,00 |
| 0,298 | 21.875,00 |

Der Zustand ist erreichbar. Ein Lauf mit reiner Ansparphase (Uebergangsjahr 20,
Horizont 15 Jahre, 40 Runs) liefert gemessen
`sampleSize: 0`, `excludedRuns: 40`, `missingness.no_observations: 40` und
damit `medianWithdrawalRate: undefined`.

Ich halte fest, dass `auto_optimize.js` nicht zu den sieben freigegebenen
Programmdateien gehoert. Das erklaert die Luecke, schliesst sie aber nicht: Das
Akzeptanzkriterium "Fehlende Quantil-, Drawdown- oder Entnahmemetriken koennen
nicht als guenstige numerische 0 in Objective, Constraint oder Tiebreaker
eingehen" ist damit nicht erfuellt. Eine Schliessung erfordert eine achte
Programmdatei und loest die Stop-Regel erneut aus; das ist eine
Nutzerentscheidung, keine Codex-Entscheidung.

---

### Restrisiken und Hinweise

#### E11-4 - Jeder fail-closed-Fehler beendet den gesamten Optimierungslauf

In `auto_optimize.js:340-365` und `403-425` laufen `evaluate()`,
`checkConstraints()` und `computeObjectiveWithSafety()` innerhalb von
`Promise.all` ohne Fehlerpfad. Wirft `getObjectiveValue` fuer den Zielwert
`Median_WR` `AUTO_OPTIMIZE_METRIC_UNAVAILABLE` - gemessen im Ansparszenario aus
E11-3 -, bricht nicht der Kandidat ab, sondern der komplette Lauf. Fachlich ist
das fail-closed und damit richtiger als ein falsches Ergebnis; operativ verliert
der Nutzer eine mehrminuetige Rechnung an einer Metrik, die im Selector frei
waehlbar ist (`Simulator.html:1187`). Eine Behandlung als verworfener Kandidat
waere angemessener.

#### E11-5 - Der D-14-Nenner schliesst die Liquiditaet aus

`simulator-year-result.js:225` bildet `jahresEntnahmeEffektiv / depotwertGesamt`,
und `depotwertGesamt` stammt aus `sumDepot()`
(`simulator-portfolio-tranches.js:371-374`): ausschliesslich Aktien- und
Goldtranchen, ohne Tagesgeld und Geldmarkt. Der publizierte Metrikvertrag nennt
nur `denominator: 'depotwertGesamt'` und macht diesen Ausschluss nicht sichtbar.

Fachlich bedeutet das, dass die Runway-Parameter die Metrik mechanisch
verschieben, ohne dass sich das Ausgabeverhalten aendert. Gemessen ueber
120 Runs bei konstantem Gesamtvermoegen:

| `runwayMinMonths` / `runwayTargetMonths` | D-14 | Endvermoegen P50 |
| --- | --- | --- |
| 12 / 24 | 1,8376 % | 2.007.611 |
| 24 / 36 | 1,8522 % | 1.989.616 |
| 36 / 60 | 1,8668 % | 1.937.739 |
| 48 / 72 | 1,8834 % | 1.877.601 |

Der Effekt ist monoton und im benignen Szenario klein. Er wirkt aber auf genau
zwei Dimensionen, die der Optimizer seit Slice 10 selbst variiert, und er
addiert sich in gestressten Szenarien zur Safety-Penalty-Schwelle von
5,5 Prozent.

#### E11-6 - Jahre ohne Depot liefern eine substituierte, nicht unterscheidbare Null

`simulator-year-result.js:225` schreibt
`depotwertGesamt > 0 ? (jahresEntnahmeEffektiv / depotwertGesamt) : 0`. Bei
leerem Depot ist der publizierte Quotient nicht definiert, wird aber als
endliche 0 geliefert und von D-14 als regulaere Beobachtung aufgenommen. Der
Metrikvertrag kann diese substituierte Null nicht von einer echten Null
(Rente deckt den Bedarf, Depot unangetastet) trennen.

#### E11-7 - Zwei Missingnessfelder des Metrikvertrags sind strukturell konstant

`auto-optimize-evaluate.js:44-60` wirft, sobald
`values.length !== result.anzahl` gilt, und `Zeile 233-236` wirft erneut, sobald
die Summe nicht `requestedRuns` entspricht. Danach ist
`metricContract.endWealth.missingRuns` zwangslaeufig 0 und
`metricContract.drawdown.sampleSize` zwangslaeufig `requestedRuns`. Beide Felder
koennen nie etwas anderes melden. Neben dem korrekt gefuehrten
`withdrawalRate.missingness` erwecken sie den Eindruck, Endvermoegen und
Drawdown seien gleichwertig auf Missingness geprueft - das sind sie nicht
(siehe E11-2).

#### E11-8 - Das Versionsgate des Tiebreakers greift nicht bei zwei unversionierten Shapes

`auto-optimize-utils.js:42-51` prueft die Schemaversion nur, wenn mindestens
eine Seite `metricContract.schemaVersion` traegt. Gemessen:

| Konstellation | Ergebnis |
| --- | --- |
| beide versioniert | OK |
| nur a versioniert | `AUTO_OPTIMIZE_TIEBREAKER_CONTRACT_MISMATCH` |
| **keiner versioniert** | **OK, kein Fehler** |

Das ist kein rein theoretischer Fall: `tests/auto-optimizer.test.mjs` Test 21
und 22 vergleichen genau solche unversionierten Shapes, und alle
`evaluateCandidateFn`-Mocks des Integrationstests liefern
`{ medianEndWealth, successProbFloor, worst5Drawdown, timeShareWRgt45 }` ohne
`metricContract`. Der gesamte `runAutoOptimize`-Integrationspfad wird damit
gegen einen Shape getestet, den der neue Vertrag nicht kennt. Das
Akzeptanzkriterium "Der reale Evaluate-Shape und der Tiebreaker-Shape sind
identisch versioniert" ist nur halbseitig durchgesetzt.

#### E11-9 - `readAutoOptimizeMetricValue` ist fail-open fuer nicht-numerische Typen

`auto-optimize-metrics.js:12-17` verwendet `Number(value)` ohne Typpruefung.
Gemessen: `successProbFloor: true` wird zu 1 und erfuellt `sr99`;
`successProbFloor: '0.995'` erfuellt `sr99`; `worst5Drawdown: []` wird zu 0 und
erfuellt `dd55`. Ein strukturell defektes Feld wird also nicht als fehlend
erkannt, sondern als besonders guenstiger Wert. Das ist dieselbe Fehlerklasse,
die Slice 3 in `parseDisplayNumber` geschlossen hat.

#### E11-10 - Der Snapshotvergleich gegen `post-suite-data-02-v1` wurde punktuell neutralisiert

`tests/monte-carlo-measurement-contract.test.mjs` kopiert vor dem Vergleich drei
Werte aus dem Erwartungssnapshot in die Istprojektion und loescht einen Teilbaum:

```
priorCarProjection.bufferBytes = postSuiteData02.carResult.bufferBytes;
priorCarProjection.bufferBytesPerRun = postSuiteData02.carResult.bufferBytesPerRun;
priorFinalProjection.resourceContract.measuredWorkerResultBytesPerRun = ...;
priorFinalProjection.result.bufferBytesPerRun = ...;
delete priorFinalProjection.result.riskKpis.maximumDrawdownPct.distribution;
```

Fuer diese vier Felder ist der Vergleich gegen die immutable Referenz jetzt
tautologisch. Der Schritt ist nachvollziehbar - die alte Referenz kennt die
neuen Felder nicht - und die Abdeckung wandert nach `post-suite-data-11-v1`,
das ungefiltert verglichen wird. Er ist aber unkommentiert, und mit ihm faellt
die aelteste Referenz dauerhaft als Waechter fuer Buffer- und
Ressourcenaenderungen aus.

#### E11-11 - Die neue Ressourcenkonstante ist nirgends automatisch nachgemessen

Der Test prueft `resourceEvidence.measuredWorkerPayloadBytesPerRun` gegen das
Literal `977.62585` mit Toleranz 0 und danach, ob
`Math.round(977,62585) === 978` gilt. Beides vergleicht die Fixture mit sich
selbst; eine Laufzeitmessung des Worker-Payloads existiert nicht.
`bufferBytesPerRun: 106` ist dagegen echt aus der Projektion abgeleitet. Genau
diese Luecke hat die alte Konstante 419 veralten lassen, ohne dass ein Gate
angeschlagen hat. Der Slice ersetzt eine unverifizierte Konstante durch eine
neue unverifizierte Konstante und dokumentiert das Nachmessen als Handarbeit.

#### E11-12 - 99 Quantile je Kandidat, von denen hoechstens vier gelesen werden

`buildIntegerQuantiles` in `auto-optimize-evaluate.js:112-118` berechnet fuer
jede Kandidatenevaluation alle Perzentile 1 bis 99 der gepoolten
Endvermoegensverteilung. Gelesen werden davon der Selektorwert sowie
`p10EndWealth`, `p25EndWealth` und `medianEndWealth`. Jeder Aufruf von
`quantile()` legt zusaetzlich eine vollstaendige `Float64Array`-Kopie an.

Gemessene Kosten je Evaluation auf dem Main-Thread:

| gepoolte Runwerte | 99 Quantile | nur die benoetigten 3 | Faktor |
| --- | --- | --- | --- |
| 600 | 1,798 ms | 0,012 ms | 155,5 |
| 10.000 | 11,454 ms | 0,425 ms | 26,9 |
| 50.000 | 58,920 ms | 1,944 ms | 30,3 |
| 200.000 | 225,213 ms | 6,876 ms | 32,8 |

Die Maximalkonfiguration der UI (10.000 Runs je Kandidat mal 20 Trainseeds) ist
genau der 200.000-Fall. Bei rund 230 Kandidaten summiert sich das auf etwa
52 Sekunden reine Quantilrechnung im UI-Thread. Ein Korrektheitsproblem ist es
nicht.

#### E11-13 - Ein bisher toter Safety-Penalty-Term wird erstmals wirksam, ohne Test

Vor diesem Slice war `medianWithdrawalRate` konstant 0, womit
`wrPenalty = max(0, (0 - 0,055)/0,020)` immer 0 ergab. Der Term ist damit erst
jetzt aktiv. Die Messung in E11-3 zeigt den Sprung von 612,50 EUR auf
21.875,00 EUR zwischen einer Quote von 0,055 und 0,298. In einem gemessenen
Depoterschoepfungsszenario liegt der reale D-14-Median bei 29,80 Prozent, das
heisst der Term saettigt dort. Die Championauswahl mit aktiven Safety-Guards -
der Default - aendert sich damit gegenueber allen frueheren Laeufen. Kein Test
deckt `computeDynamicFlexSafetyPenalty` mit einer von Null verschiedenen
Entnahmequote ab; die Aenderung ist weder als Entscheidung erfasst noch im
Delta-Ledger benannt.

#### E11-14 - Selektorquantil und angezeigte Championmetrik koennen auseinanderfallen

Das Quantilfeld steuert den Selektor jetzt nachweislich: `EndWealth_P50` mit
Quantil 25 liefert gemessen 250 statt 500. Das Ergebnispanel zeigt jedoch
unveraendert "End Wealth P50" aus `metricsTest.medianEndWealth`
(`auto-optimize-renderer.js:204`) und `deltaVsCurrent.endWealthP50`
(`auto_optimize.js:516`). Das tatsaechlich optimierte Quantil taucht im
Ergebnis nicht auf. Zusaetzlich validiert `readAutoOptimizeConfigFromUI` das
Feld nicht: ein leerer Wert oder 25,5 fuehrt erst tief im Kandidatenloop zu
`AUTO_OPTIMIZE_QUANTILE_INVALID` statt zu einer Formularmeldung im Preflight.

#### E11-15 - Rohverteilungen ohne Konsument im normalen MC-Pfad

`buildMonteCarloAggregates` haengt die drei neuen Rohverteilungen an jedes
Aggregat, auch im normalen Monte-Carlo-Lauf (`simulator-monte-carlo.js:258`).
`MonteCarloRunResultV1` projiziert weder `medianWithdrawalRate` noch die
Verteilungen, und keine UI ausserhalb des Optimizers liest sie. Bei 100.000
Runs sind das rund 2,4 MB transiente Arrays je Lauf ohne Abnehmer.

---

### Pre-Mortem

> Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
> Produktivbetrieb - was ist die wahrscheinlichste Ursache?

Ein Nutzer laesst Auto-Optimize mit dem Drawdownziel oder dem
`dd55`-Constraint laufen. In einigen Kandidatenlaeufen scheitern einzelne Pfade
technisch - etwa nach einer Engine- oder Datenaenderung, die einen seltenen
Randfall trifft. Der Optimizer meldet keinen Fehler, denn D-14 bilanziert die
Fehler sauber und die beiden anderen Verteilungen melden die volle Stichprobe.
Gewaehlt wird der Kandidat mit der hoechsten Fehlerquote, weil jeder
Fehlerpfad als Drawdown 0 Prozent und Endvermoegen 0 EUR in die gepoolte
Verteilung eingeht. Der Champion sieht im Ergebnispanel exzellent aus und faellt
im normalen Monte Carlo durch. Die Ursachensuche beginnt bei der
Kandidatensuche oder beim Sampling, nicht bei einer Rohverteilung, die
technische Fehler mit realen Nullen vermischt - insbesondere weil der Slice als
"fail-closed" dokumentiert ist.

### Findings-Lifecycle

- Neu eingefuehrte Blocker: E11-1, E11-2, E11-3.
- Neu eingefuehrte Restrisiken und Hinweise: E11-4 bis E11-15.
- Uebernommene offene Findings aus Slice 10: F10-1 bis F10-7 bleiben offen;
  E10-9 (Profil-Ownership beim Apply) bleibt bewusst offen. Keines davon wird
  durch Slice 11 beruehrt.
- Von Codex selbst benannte offene Risiken der Slice-MD: alle fuenf bleiben
  bestehen; das Risiko zur Neuvermessung der 978-Byte-Konstante wird durch
  E11-11 praezisiert, das Risiko zum UI-Selektor durch E11-14.
- Geschlossene Findings dieses Slice: keine, da dies das Erstreview ist.

## Review-Ergebnis

- Status: blockiert
- Blocker:
  - E11-1: Das tatsaechlich berechnete finale Ruinjahr wird entgegen der
    Nutzerentscheidung D-14 nicht in die Metrik aufgenommen; in allen
    82 gemessenen Ruinlaeufen fehlt genau diese Beobachtung, und der Ausschluss
    beguenstigt systematisch depotzerstoerende Kandidaten.
  - E11-2: Technisch gescheiterte Runs gehen mit Endvermoegen 0 EUR und
    Drawdown 0 Prozent in die neuen Rohverteilungen ein, waehrend der Vertrag
    die volle Stichprobe meldet; gemessen kippt der `dd55`-Constraint ab
    28 Prozent Fehlerquote von verletzt auf erfuellt.
  - E11-3: Eine fehlende Entnahmequote wirkt in der objectivewirksamen
    Safety-Penalty exakt wie eine beobachtete Null (612,50 EUR in beiden
    Faellen); der Zustand ist ueber eine reine Ansparphase erreichbar.
- Restrisiken: E11-4 bis E11-15, wichtigster Punkt E11-8 - das Versionsgate des
  Tiebreakers passiert zwei unversionierte Shapes, und genau solche verwendet
  der gesamte `runAutoOptimize`-Integrationstest.
- Pre-Mortem: Vereinzelte technische Pfadfehler machen einen Kandidaten zum
  Champion, weil seine Fehlerlaeufe als Drawdown 0 Prozent und Endvermoegen
  0 EUR in die gepoolte Verteilung eingehen, ohne dass eine Missingness
  sichtbar wird.

## Re-Review durch Claude nach der Blocker-Nachbesserung

**Reviewdatum:** 2026-07-27
**Pruefgegenstand:** Arbeitsstand mit neun Programmdateien nach der vom Nutzer
autorisierten Scope-Erweiterung, fuenf geaenderten beziehungsweise neuen
Testdateien und dem Snapshotkandidaten `post-suite-data-11-v1`.

### Verifikationsbasis

Alle Aussagen stammen aus eigenen Messungen gegen den nachgebesserten Stand.

- Unabhaengig nachgefahrene Gates: `npm test` 8.328/8.328 Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles; `npm run test:browser` mit
  16/16 bestandenen Smokes; `git diff --check` gruen. `git status --short` weist genau neun
  Programmdateien aus; `engine/`, `engine.js`, `dist/`, `workers/` und `types/`
  bleiben unveraendert.
- Fuenf neue Messsonden: Wiederholung des Ruinlaufs aus dem Erstreview mit
  identischem Seed, Einzeljahresmessung der Ruinquote ueber
  `simulateOneYear()` mit variierender Liquiditaet, kontrollierte
  Aggregatfixtures mit technischen Pfaden, Vertragsproben auf Objective,
  Constraint, Tiebreaker und Safety-Penalty sowie eine Exportprobe fuer die
  neu nullbaren Quantile.

### Was geschlossen ist

#### E11-2 geschlossen - technische Pfade sind aus den Rohverteilungen entfernt

`buildFinancialRunDistribution` filtert Runs mit
`MISSINGNESS_CODE.TECHNICAL_ERROR` und weist `requestedRuns`, `sampleSize`,
`excludedRuns` und `missingness.technical_error` real aus. Dieselbe Fixture wie
im Erstreview, 100 Runs, gesunde Drawdowns 30 bis 70 Prozent, die schlechtesten
Runs scheitern technisch:

| technische Fehler | Endvermoegen P10 | Drawdown P90 | `sampleSize` | `excludedRuns` | Constraint `dd55` |
| --- | --- | --- | --- | --- | --- |
| 0 | 1.000.000 | 66,0000 % | 100 | 0 | verletzt |
| 20 | 1.000.000 | 58,7273 % | 80 | 20 | verletzt |
| 28 | 1.000.000 | 55,8182 % | 72 | 28 | verletzt |
| 30 | 1.000.000 | 55,0909 % | 70 | 30 | verletzt |

Der Einbruch von P10 auf 0 entfaellt vollstaendig, und der im Erstreview
gemessene Constraintumschlag bei 28 technischen Fehlern tritt nicht mehr ein.
Der verbleibende Drift des Drawdown-P90 ist die korrekte Folge einer
verkleinerten Grundgesamtheit, nicht mehr eine Kontamination durch Nullwerte.
Im Optimizer weist `collectFiniteDistribution` jeden Seed-Batch mit technischer
Missingness zusaetzlich fail-closed ab.

#### E11-3 geschlossen - Missingness ist in der Safety-Penalty nicht mehr gleich Null

`computeDynamicFlexSafetyPenalty` verlangt jetzt alle vier Terme ueber
`requireAutoOptimizeMetricValue`. Gemessen:

| `medianWithdrawalRate` | Ergebnis |
| --- | --- |
| `undefined` | `AUTO_OPTIMIZE_METRIC_UNAVAILABLE` |
| 0,00 (echte Null) | 612,50 EUR |
| 0,08 | 2.800,00 EUR |

Die im Erstreview gemessene Gleichbehandlung von 612,50 EUR fuer beide Faelle
ist aufgehoben. Test 28b sichert das ab.

#### E11-7, E11-8, E11-9 und E11-13 geschlossen

- E11-7: Beide Verteilungen tragen reale Stichproben- und Ausschlusszahlen; die
  strukturell konstanten Felder existieren nicht mehr.
- E11-8: Das Versionsgate ist unbedingt. Gemessen wirft jetzt auch der Fall
  "keine Seite versioniert" `AUTO_OPTIMIZE_TIEBREAKER_CONTRACT_MISMATCH`; alle
  `evaluateCandidateFn`-Fixtures des Integrationstests sind ueber
  `createVersionedMetricResult` versioniert.
- E11-9: `readAutoOptimizeMetricValue` akzeptiert nur primitive endliche
  `number`. Gemessen liefern `true`, `'0.995'`, `[]`, `[0.995]`, `NaN` und
  `null` jeweils `null`, und die zugehoerigen Constraints schlagen fehl.
- E11-13: Test 28 deckt den Entnahmequoten-Term mit 0,072 gegen 0 ab, der
  Delta-Ledger benennt die Rankingaenderung.

---

### Blocker

#### F11-1 (Blocker) - Das Ruinjahr ist jetzt enthalten, aber nicht mit der entschiedenen Groesse

Die Aufnahme funktioniert. Der Ruinlauf aus dem Erstreview mit identischem
Seed zeigt jetzt in allen 82 Ruinlaeufen `Beobachtungen == simulierte Jahre`
statt vorher 82-mal ein fehlendes Jahr. Damit ist die Inklusionsklausel von
D-14 erfuellt.

Der eingesetzte **Zahlenwert** entspricht jedoch nicht der entschiedenen
Definition. D-14 legt fest: "Jahreswert ist die kanonische realisierte Quote
`result.logData.entnahmequote`, also `jahresEntnahmeEffektiv / depotwertGesamt`."
`buildRuinOutcome` erhaelt als Zaehler stattdessen

- in `simulator-engine-direct.js:679-685` `totalWealthAvailable`, also
  `equityAfterBuys + goldAfterBuys + liquiditaet` - das gesamte verbliebene
  Vermoegen einschliesslich des Depots selbst. In diesem Zweig kehrt die
  Funktion vor der Auszahlung zurueck; es wird ueberhaupt nichts entnommen;
- in `simulator-engine-direct.js:717-724` `jahresEntnahmeEffektiv +
  equityAfterBuys + goldAfterBuys`, also die Auszahlung zuzueglich des
  vollstaendigen Depots.

Der Nenner bleibt `depotwertGesamt`. Zaehler und Nenner sind damit nicht mehr
dieselbe Groessenordnung. Einzeljahresmessung mit dem Aufbau des neuen
Tests aus `tests/simulation.test.mjs`, variiert nur um die Liquiditaet:

| Fall | Ruin | Zaehler | Nenner | `entnahmequote` |
| --- | --- | --- | --- | --- |
| gesundes Jahr, Depot 500.000, Liquiditaet 20.000 | nein | 28.800 | 500.000 | 5,8 % |
| **Testfixture Codex**, Depot 10.000, Liquiditaet 0 | ja | 10.000 | 10.000 | 100,0 % |
| Depot 1.000, Liquiditaet 20.000 | ja | 21.000 | 1.000 | **2.100,0 %** |
| Depot 100, Liquiditaet 20.000 | ja | 20.100 | 100 | **20.100,0 %** |
| Depot 1, Liquiditaet 20.000 | ja | 20.001 | 1 | **2.000.100,0 %** |
| Depot 0, Liquiditaet 20.000 | ja | 20.000 | 0 | **0,0 %** |

Drei Konsequenzen:

1. Der Wert ist nach oben unbeschraenkt und wird vom Nenner bestimmt, nicht vom
   Entnahmeverhalten. Im realen Monte-Carlo-Lauf erreicht der Runmittelwert
   gemessen **924,369** - ein Run mit einer mittleren Jahresquote von
   92.437 Prozent. Sieben von 82 Ruinlaeufen liegen ueber 1,0, zwanzig ueber
   0,5.
2. Die letzten beiden Zeilen liegen einen Euro auseinander. Ein Restdepot von
   1 EUR ergibt 2.000.100 Prozent, ein Restdepot von 0 EUR ergibt 0,0 Prozent -
   den guenstigsten moeglichen Wert, genau im schlechtesten Zustand. Der neue
   Test in `tests/simulation.test.mjs` haelt diesen Sprung als Vorsatz fest
   ("zero-depot ruin should preserve the canonical zero-denominator policy").
3. Der D-14-Median des Referenzlaufs steigt von 0,19986 auf 0,21860. Der Median
   daempft die Extremwerte, das Ergebnis bleibt aber eine Kennzahl, deren
   Einzelwerte nicht die vertraglich zugesagte Groesse sind.

Beide neuen Tests koennen das nicht sehen. `tests/simulation.test.mjs` und
`auto-optimize-fidelity.test.mjs` Test 6b setzen die Liquiditaet auf 0 - die
einzige Konstellation, in der `totalWealthAvailable` mit `depotwertGesamt`
zusammenfaellt und die Zaehlerersetzung unsichtbar bleibt. Die zentrale
Assertion vergleicht ausserdem `logData.entnahmequote` mit
`ruinDetails.effectiveWithdrawalNominal / ruinDetails.depotValueNominal`, also
die Implementierung mit sich selbst; sie kann nicht feststellen, dass der
Zaehler keine Entnahme ist.

Der Delta-Ledger benennt die Ersetzung mit "coveredFloorNominal as its
effective numerator" transparent. Das macht sie nachvollziehbar, aber nicht
vertragskonform: D-14 ist eine Nutzerentscheidung und wurde einseitig
praezisiert.

---

### Restrisiken und Hinweise

#### F11-2 - D-14 ist auch ohne Ruin nach oben unbeschraenkt

Die Messung oben zeigt in Zeile 1 den Normalfall: `jahresEntnahmeEffektiv` ist
`min(liquiditaet, jahresEntnahmeTarget)`, also die Auszahlung aus dem
**Liquiditaetstopf**, waehrend `depotwertGesamt` ueber `sumDepot()` genau diesen
Topf ausschliesst. Sobald das Depot klein gegenueber der Jahresentnahme ist,
verlaesst die Quote den Wertebereich einer Entnahmerate, ohne dass ein Ruin
vorliegt: Depot 10.000 EUR bei Liquiditaet 20.000 EUR ergibt gemessen
**288,0 Prozent** in einem regulaeren, nicht ruinierten Jahr.

Das ist keine Folge der Nachbesserung, sondern die Eigenschaft der vom Nutzer
entschiedenen Formel. Slice 11 macht sie erstmals rankingwirksam und legt eine
Safety-Penalty-Schwelle bei 5,5 Prozent darauf. Die Nachbesserung dokumentiert
den Nennerumfang jetzt korrekt als
`equity_bond_and_gold_tranches_excluding_liquidity_and_health_bucket`, aendert
die Semantik aber nicht. Ich empfehle eine ausdrueckliche Folgeentscheidung zu
D-14: entweder Nenner auf das Gesamtvermoegen umstellen oder die Metrik als
"Entnahme relativ zum Wertpapierdepot" umbenennen und die Penalty-Schwelle neu
festlegen. Ohne diese Entscheidung bleibt der wichtigste Restrisikopunkt des
Slice offen.

#### F11-3 - Die E11-3-Korrektur weitet die Abbruchflaeche aus

Vor der Nachbesserung brach nur das Ziel `Median_WR` bei fehlender
Entnahmequote ab. Jetzt wirft die Safety-Penalty fuer **jedes** Ziel, sobald
Safety-Guards aktiv sind - das ist der Default, sobald Dynamic-Flex-Parameter
im Suchraum liegen (`auto_optimize.js:208`). Der im Erstreview belegte,
betrieblich erreichbare Zustand einer reinen Ansparphase (40 von 40 Runs ohne
Beobachtung) beendet damit den gesamten Lauf statt einen Kandidaten. Test 28b
haelt dieses Verhalten ausdruecklich als gewollt fest. Fachlich ist
fail-closed richtiger als ein falsches Ranking; operativ fehlt weiterhin die
Kandidatenisolation aus E11-4.

#### F11-4 - Ein einziger technischer Pfad beendet den gesamten Optimierungslauf

`collectFiniteDistribution` wirft `AUTO_OPTIMIZE_METRIC_SOURCE_INVALID`, sobald
ein Seed-Batch `missingness.technical_error > 0` meldet. Zusammen mit dem
fehlenden Fehlerpfad in `Promise.all` (E11-4) bedeutet das: ein einzelner
technisch gescheiterter Pfad unter bis zu 10.000 Runs eines einzigen Kandidaten
beendet die komplette Optimierung. Innerhalb desselben Vertrags gelten damit
zwei Politiken fuer dasselbe Ereignis - D-14 inventarisiert technische Fehler
und rechnet weiter, Endvermoegen und Drawdown brechen hart ab.

#### F11-5 - Der Technikfilter der Finanzverteilungen haengt an einem fremden Buffer

`buildFinancialRunDistribution` leitet den Ausschluss aus
`buffers.meanWithdrawalRateMissingness` ab, also aus der Missingness einer
anderen Metrik. Fehlt dieser Buffer, greift der Filter still nicht: gemessen
liefert dieselbe Fixture mit 20 technischen Fehlern wieder `excludedRuns: 0`,
20 Nullwerte in der Verteilung und Drawdown P90 = 57,9192 Prozent, waehrend
D-14 korrekt `sampleSize: 0` meldet. `summarizePerRunMeanWithdrawalRate` hat
fuer denselben Fall einen expliziten Zweig, `buildFinancialRunDistribution`
nicht. Produktiv ist der Zustand derzeit nicht erreichbar, weil
`createMonteCarloChunkAccumulatorV1` und der Runner den Buffer immer anlegen;
als stiller Rueckfall auf das Vorverhalten bleibt die Kopplung ein Risiko.

#### F11-6 - Gemischte Nenner und neu nullbare Quantile im kanonischen Aggregat

`finalOutcomes` und `maxDrawdowns` beziehen sich jetzt auf die um technische
Pfade bereinigte Stichprobe, `depotErschoepfungsQuote`, `outcomeCounts` und
`extraKPI` weiterhin auf `totalRuns`. Innerhalb eines Aggregats existieren
damit zwei Grundgesamtheiten. Zusaetzlich sind `finalOutcomes.p10/p25/p50/p90`
und `maxDrawdowns.p50/p90` neu `null`, wenn jeder Run technisch scheitert.
Gemessen verarbeitet `createMonteCarloRunResultV1` diesen Fall fehlerfrei
(`batchStatus=technical_error`); die Typaenderung betrifft aber alle
Aggregatkonsumenten und ist in `TECHNICAL.md` nicht beschrieben.

#### Unveraendert offene Findings des Erstreviews

E11-4, E11-6, E11-10, E11-11, E11-12, E11-14 und E11-15 sind von Codex
ausdruecklich als offen ausgewiesen und wurden nicht bearbeitet. Ich habe sie
stichprobenartig nachgeprueft und bestaetige den Stand: kein Fehlerpfad um
`evaluate()`, unveraenderte Nullsubstitution bei leerem Depot, neutralisierter
Snapshotvergleich, nicht nachgemessene 978-Byte-Konstante, weiterhin
99 Quantile je Kandidat, unvalidiertes `ao_quantile` mit abweichender
Paneldarstellung und Rohverteilungen ohne Konsument ausserhalb des Optimizers.
E11-5 ist dokumentarisch adressiert und fachlich durch F11-2 verschaerft.

---

### Pre-Mortem

> Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
> Produktivbetrieb - was ist die wahrscheinlichste Ursache?

Ein Nutzer optimiert ein knapp finanziertes Szenario, in dem ein grosser Teil
der Pfade ruiniert. Der Optimizer meldet eine "Median Withdrawal Rate" von
mehreren hundert Prozent, weil die Ruinjahre das gesamte Restvermoegen durch
ein Restdepot von wenigen Euro teilen. Die Safety-Penalty saettigt fuer alle
Kandidaten gleichermassen und verliert ihre Trennschaerfe; ausgewaehlt wird
faktisch nur noch nach Endvermoegen. Ein zweiter Nutzer mit demselben Szenario,
dessen Depot im Ruinjahr exakt auf 0 faellt, erhaelt stattdessen eine Quote von
0,0 Prozent und damit gar keine Penalty. Beide Ergebnisse sind intern
konsistent, keines faellt als Defekt auf, und die Ursachensuche beginnt bei der
Kandidatensuche statt bei einem Zaehler, der das Restvermoegen statt der
Entnahme misst.

### Findings-Lifecycle

- Geschlossene Findings: E11-2, E11-3, E11-7, E11-8, E11-9, E11-13 - jeweils
  durch Gegenprobe belegt.
- Nicht geschlossener Blocker: E11-1. Die Inklusionsklausel ist erfuellt, die
  Definitionsklausel nicht; fortgefuehrt als F11-1.
- Neu eingefuehrte Blocker: F11-1.
- Neu eingefuehrte Restrisiken und Hinweise: F11-2 bis F11-6.
- Unveraendert offen: E11-4, E11-5 (fachlich, verschaerft durch F11-2), E11-6,
  E11-10, E11-11, E11-12, E11-14, E11-15.
- Uebernommen aus Slice 10: F10-1 bis F10-7 und E10-9 bleiben offen und werden
  von Slice 11 nicht beruehrt.

## Re-Review-Ergebnis (Claude)

- Status: blockiert
- Blocker:
  - F11-1: Das finale Ruinjahr wird jetzt aufgenommen, aber mit
    `totalWealthAvailable` beziehungsweise `Auszahlung + vollstaendiges Depot`
    als Zaehler statt mit `jahresEntnahmeEffektiv`. Die Quote ist dadurch nach
    oben unbeschraenkt - gemessen bis 2.000.100 Prozent im Einzeljahr und
    924,369 als Runmittelwert -, springt bei einem Restdepot von 0 EUR auf den
    guenstigsten Wert 0,0 Prozent, und beide neuen Tests sind wegen
    Liquiditaet 0 blind fuer die Ersetzung.
- Restrisiken: F11-2 bis F11-6 sowie die unveraendert offenen E11-4, E11-6,
  E11-10 bis E11-12, E11-14 und E11-15. Wichtigster Punkt F11-2 - D-14 ist auch
  ohne Ruin unbeschraenkt (gemessen 288,0 Prozent in einem regulaeren Jahr),
  weil der Zaehler aus dem Liquiditaetstopf und der Nenner ohne diesen Topf
  gebildet wird; das erfordert eine Folgeentscheidung des Nutzers zu D-14.
- Pre-Mortem: In ruinreichen Szenarien saettigt die Safety-Penalty fuer alle
  Kandidaten, weil die Ruinjahre das Restvermoegen durch ein Restdepot von
  wenigen Euro teilen; die Metrik verliert ihre Trennschaerfe, ohne dass ein
  Defekt sichtbar wird.

## Codex-Nachbesserung zu F11-1

F11-1 ist innerhalb des bereits autorisierten Neun-Dateien-Scopes technisch
adressiert. D-14 bleibt unveraendert:
`jahresEntnahmeEffektiv / depotwertGesamt`.

- Der Ruinzweige vor dem Auszahlungsschritt setzt
  `effectiveWithdrawalNominal` exakt auf 0. Das vorhandene Restvermoegen wird
  weiterhin getrennt als `coveredFloorNominal` diagnostiziert.
- Der Ruinzweige nach einer Teilauszahlung verwendet nur den bereits
  ausgezahlten `jahresEntnahmeEffektiv`-Betrag. Verbleibende Aktien- und
  Goldwerte werden nicht mehr zum Zaehler addiert.
- `terminalRuinYearNumerator` und Delta-Ledger benennen nun
  `jahresEntnahmeEffektiv_actual_payout_only`.
- Der direkte Regressionsfall verwendet bewusst 20.000 EUR Liquiditaet und
  1.000 EUR Depot. Die fehlerhafte F11-1-Implementierung ergab daraus
  2.100 Prozent; der korrigierte Vor-Auszahlungs-Ruin weist exakt 0 EUR
  Auszahlung und 0 Prozent aus. Damit vergleicht der Test nicht mehr die
  Implementierung mit sich selbst und ist nicht mehr durch Liquiditaet 0
  blind.
- Der reale Drei-Pfad-Monte-Carlo-Witness belegt weiterhin je Run genau eine
  beobachtete terminale D-14-Zeile mit der tatsaechlichen Nullauszahlung.

Validierung nach der Korrektur: Simulation 16/16,
Auto-Optimize-Fidelity 121/121, Metrikvertrag 30/30, Messvertrag
1.299/1.299, Simulator-Monte-Carlo 160/160, Auto-Optimize-Worker 15/15,
Worker-Paritaet 430/430 und Auto-Optimizer 83/83. `npm test` ist mit
8.333/8.333 Assertions und 0 offenen Handles gruen; Browser-Smokes 16/16,
Coverage 78,33 Prozent (36.185/46.194) mit bestandenen Dateigates.

F11-2 bleibt bewusst offen: Der vom Nutzer entschiedene D-14-Nenner schliesst
Liquiditaet aus. Eine Aenderung auf Gesamtvermoegen oder eine neue
Penalty-Schwelle waere eine neue fachliche Entscheidung und wurde nicht
vorweggenommen. Codex erteilt keine Eigenfreigabe; F11-1 und der Gesamt-Slice
benoetigen ein erneutes unabhaengiges Re-Review.

## Zweites Re-Review durch Claude nach der F11-1-Nachbesserung

**Reviewdatum:** 2026-07-27
**Pruefgegenstand:** Aenderung an `app/simulator/simulator-engine-direct.js` und den
beiden Ruinwitnesses gegenueber dem Stand des ersten Re-Reviews. Die uebrigen
acht Programmdateien sind unveraendert.

### Verifikationsbasis

- Unabhaengig nachgefahrene Gates: `npm test` 8.333/8.333 Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles; `npm run test:browser` 16/16;
  `git diff --check` gruen. Weiterhin genau neun Programmdateien; `engine/`,
  `engine.js`, `dist/`, `workers/` und `types/` unveraendert.
- Drei eigene Messsonden: Wiederholung der Einzeljahrestabelle aus dem ersten
  Re-Review mit identischem Aufbau, Wiederholung des Ruinlaufs mit identischem
  Seed 777001 und eine systematische Zweigabdeckung ueber 504 Kombinationen aus
  Depot, Liquiditaet, Floor und Flex.

---

### F11-1 geschlossen

#### Der Zaehler ist jetzt die vertraglich zugesagte Groesse

`buildRuinOutcome` erhaelt

- im Vor-Auszahlungs-Zweig (`simulator-engine-direct.js:679-688`)
  `effectiveWithdrawalNominal: 0`. Das ist korrekt und nachpruefbar: Die
  Funktion kehrt zurueck, bevor `liquiditaet -= payout` ausgefuehrt wird; in
  diesem Jahr wird tatsaechlich nichts ausgezahlt.
- im Auszahlungs-Fallback-Zweig (`simulator-engine-direct.js:717-732`)
  `effectiveWithdrawalNominal: jahresEntnahmeEffektiv`. Auch das ist korrekt:
  `applyPayoutFallbackSale` gibt `isRuin: true` zurueck, **bevor** ueberhaupt
  Tranchen reduziert werden (`simulator-forced-sale.js:214-222`), es existiert
  also keine zusaetzliche Auszahlung aus Verkaufserloesen.

Die Klammerung `min(normalizedCoveredFloor, effectiveWithdrawalNominal)` kann
den Zaehler in keinem der beiden Zweige nach unten verzerren: Der
Fallback-Zweig setzt `jahresEntnahmeEffektiv + 1e-6 < netFloorYear` voraus,
womit `normalizedCoveredFloor >= jahresEntnahmeEffektiv` gilt.

#### Die Unbeschraenktheit im Ruinjahr ist verschwunden

Dieselbe Einzeljahresmessung wie im ersten Re-Review, variiert nur um die
Liquiditaet:

| Fall | Ruin | Zaehler | Nenner | vorher | jetzt |
| --- | --- | --- | --- | --- | --- |
| Depot 10.000, Liquiditaet 0 | ja | 0 | 10.000 | 100,0 % | 0,0 % |
| Depot 1.000, Liquiditaet 20.000 | ja | 0 | 1.000 | 2.100,0 % | 0,0 % |
| Depot 100, Liquiditaet 20.000 | ja | 0 | 100 | 20.100,0 % | 0,0 % |
| Depot 1, Liquiditaet 20.000 | ja | 0 | 1 | 2.000.100,0 % | 0,0 % |
| Depot 0, Liquiditaet 20.000 | ja | 0 | 0 | 0,0 % | 0,0 % |

Der Sprung um zwei Millionen Prozentpunkte zwischen einem Restdepot von 1 EUR
und 0 EUR existiert nicht mehr.

Im realen Monte-Carlo-Lauf mit identischem Seed 777001, 150 Runs, 82 Ruinen:

| Kennzahl | erstes Re-Review | jetzt |
| --- | --- | --- |
| groesster Runmittelwert (RUIN) | 924,369 | 1,64785 |
| Runmittel > 1,0 | 7 | 4 |
| Runmittel > 0,5 | 20 | 16 |
| D-14 Median | 0,21860 | 0,19037 |

Die Aufnahme selbst bleibt erhalten: alle 82 Ruinlaeufe zeigen weiterhin
`Beobachtungen == simulierte Jahre`.

#### Die Vertragsmetadaten und der Witness sind mitgezogen

`terminalRuinYearNumerator` lautet jetzt
`jahresEntnahmeEffektiv_actual_payout_only`; der Delta-Ledger nennt "the actual
payout only". Der neue Witness in `tests/simulation.test.mjs` verwendet
Depot 1.000 mit Liquiditaet 20.000 - genau die Konstellation, mit der ich die
2.100 Prozent gemessen habe - und trennt `coveredFloorNominal = 21000` von
`effectiveWithdrawalNominal = 0` in getrennten Assertions. Die im ersten
Re-Review bemaengelte tautologische Assertion gegen die eigenen
`ruinDetails`-Felder ist damit ersetzt. `auto-optimize-fidelity.test.mjs`
Test 6b prueft zusaetzlich auf Runebene `withdrawalRateObservationCount = 1`,
`meanWithdrawalRateMissingness = OBSERVED` und `meanWithdrawalRateRatio = 0`.

#### Keine Seiteneffekte durch das neue `logData` am Ruinobjekt

Das Ruinergebnis traegt jetzt erstmals ein `logData`. Ich habe alle Konsumenten
geprueft, die die Existenz von `logData` als Erfolgsindikator verwenden:

- `historical-backtest-runner.js` faengt den Ruin in Zeile 530 ab, also vor der
  Pruefung `!result?.logData` in Zeile 599. Keine Aenderung.
- `sweep-runner.js` bricht im `result.isRuin`-Zweig ab, bevor `result.logData`
  gelesen wird; alle uebrigen Zugriffe sind ueber `Number.isFinite` abgesichert.
- `monte-carlo-runner.js` erzeugt Ruinzeilen weiterhin ueber
  `buildMonteCarloRuinLogRow`; der Erfolgszweig verlangt zusaetzlich
  `kind === undefined || 'success'`.

---

### Neue Findings

#### G11-1 - Die Aufnahme des Ruinjahrs verbessert jetzt die Metrik der ruinierenden Kandidaten

Der Vor-Auszahlungs-Zweig ist der einzige praktisch erreichbare Ruinzweig
(siehe G11-2) und liefert immer exakt 0. Das terminale Ruinjahr steuert damit
den kleinstmoeglichen Wert zum Runmittel bei und senkt es. Gemessen ueber
denselben Lauf mit Seed 777001:

| Zustand | D-14 Median |
| --- | --- |
| Ruinjahr ausgeschlossen (Ausgangsstand, Erstreview) | 0,19986 |
| Ruinjahr mit Restvermoegen als Zaehler (erste Nachbesserung) | 0,21860 |
| Ruinjahr mit tatsaechlicher Auszahlung 0 (aktuell) | **0,19037** |

Das Einschliessen des Ruinjahrs - genau das, was D-14 verlangt - macht einen
ruinierenden Kandidaten in diesem Lauf um 0,95 Prozentpunkte **besser** als das
Ausschliessen. Formal ist das die korrekte Umsetzung der entschiedenen Formel:
Die realisierte Entnahme betraegt in diesem Jahr null. Die Wirkung ist aber das
Gegenteil dessen, was die Aufnahme des Extremjahres nahelegt.

Das ist kein Implementierungsfehler, sondern eine fachliche Konsequenz von
D-14 und gehoert zusammen mit F11-2 in dieselbe Folgeentscheidung. Solange sie
aussteht, sollte die Wirkungsrichtung in der Slice-MD ausdruecklich benannt
bleiben.

#### G11-2 - Der einzige Zweig mit einem von null verschiedenen Ruinzaehler ist unerreichbar

Nur der Auszahlungs-Fallback kann ein Ruinjahr mit `entnahme_effektiv > 0`
erzeugen. Ueber 504 systematisch variierte Kombinationen aus Depot
(0 bis 50.000), Liquiditaet (0 bis 100.000), Floor (12.000 bis 80.000) und
Flex (0 bis 40.000) wurde er kein einziges Mal erreicht:

```
Zweigverteilung: { vorAuszahlung: 279, auszahlungsFallback: 0, keinRuin: 225 }
```

Das ist algebraisch erklaerbar: Solange `payout = min(liquiditaet, target)`
gleich der Liquiditaet ist, gilt bereits
`payout + equity + gold = totalWealthAvailable >= netFloorYear`, womit
`additionalNeeded <= equity + gold` folgt und der Fallback nie `isRuin`
zurueckgibt. Der Zweig ist damit defensiver Code ohne Witness - die gesamte
Logik fuer einen von null verschiedenen Ruinzaehler ist unbelegt. Sollte sich
die Auszahlungslogik spaeter aendern und der Zweig erreichbar werden, greift
kein Test.

#### G11-3 - `depotValueNominal` ist der Depotwert vor den Jahrestransaktionen

`depotValueNominal: depotwertGesamt` verwendet den in
`simulator-engine-direct.js:391` gebildeten Wert vor Verkaeufen und Kaeufen,
waehrend der Ruinabbruch selbst nach dem Kaufblock erfolgt. Fuer die Quote ist
das ohne Wirkung, weil der Zaehler im erreichbaren Zweig 0 ist, und es ist
konsistent zum Normaljahr, das denselben Nenner verwendet. Als Diagnosefeld in
`ruinDetails` beschreibt es aber nicht den Depotwert im Ruinzeitpunkt. Der neue
Witness verdeckt das, weil er mit `rendite: 0` arbeitet und beide Werte
zusammenfallen.

#### G11-4 - Der Snapshotkandidat wurde innerhalb des Slice dreimal neu geschrieben

`post-suite-data-11-v1.json` traegt denselben Zeitstempel wie die aktuelle
Codeaenderung und ist seit dem Erstreview von 5.169 auf 5.701 Byte gewachsen.
Die D-14-Runwerte des festen Achtlauffalls sind dabei unveraendert geblieben
(0,07525604704941306 als erster Wert vor und nach der Nachbesserung), die
Erweiterung ist additiv. Der Kandidat hat der Implementierung damit ueber drei
Iterationen hinweg gefolgt und besitzt fuer diesen Slice keine eigenstaendige
Regressionswirkung; `reviewStatus` steht korrekt weiterhin auf `pending`, seine
Waechterfunktion beginnt erst nach der externen Abnahme.

---

### Unveraendert offene Findings

F11-2 bis F11-6 sowie E11-4, E11-6, E11-10, E11-11, E11-12, E11-14 und E11-15
wurden nicht bearbeitet und sind in der Entscheidungstabelle als offen
ausgewiesen. Ich habe den Stand stichprobenartig nachgeprueft und bestaetige
ihn. Wichtigster Punkt bleibt F11-2: D-14 ist ueber die Normaljahrformel nach
oben unbeschraenkt, weil der Zaehler die Auszahlung aus dem Liquiditaetstopf
und der Nenner das Depot ohne diesen Topf ist. Der aktuelle Lauf belegt das
weiterhin - der groesste Runmittelwert betraegt 1,64785 und 16 von 82
Ruinlaeufen liegen ueber 0,5, obwohl das Ruinjahr selbst jetzt 0 beitraegt.
Diese Werte stammen ausschliesslich aus regulaeren Jahren.

E11-6 ist durch die Nachbesserung faktisch entschaerft: Da der erreichbare
Ruinzweig den Zaehler 0 setzt, kann die Nullnenner-Substitution im Ruinjahr nur
noch den Fall 0/0 betreffen. In regulaeren Jahren bleibt sie unveraendert.

---

### Pre-Mortem

> Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
> Produktivbetrieb - was ist die wahrscheinlichste Ursache?

Ein Nutzer vergleicht zwei Konfigurationen, von denen eine deutlich haeufiger
ruiniert. Die ruinierende Konfiguration erhaelt die **niedrigere** Median
Withdrawal Rate, weil jedes terminale Ruinjahr mit 0 in das Runmittel eingeht,
und damit auch die geringere Safety-Penalty. Gleichzeitig treibt die
Normaljahrformel bei kleinen Restdepots einzelne Runmittelwerte ueber 1,0. Die
Kennzahl bewegt sich damit aus zwei gegenlaeufigen Gruenden, die beide korrekt
implementiert sind; der Nutzer liest sie als Entnahmerate und trifft daraus
eine Portfolioentscheidung. Aufgefallen waere das nur an einer
Plausibilitaetsgrenze, die es fuer D-14 nicht gibt.

### Findings-Lifecycle

- Geschlossen: F11-1. Der Zaehler entspricht in beiden Ruinzweigen
  `jahresEntnahmeEffektiv`, die Unbeschraenktheit im Ruinjahr ist beseitigt,
  Vertragsmetadaten und Witness sind mitgezogen, und das neue `logData` am
  Ruinobjekt erzeugt bei keinem Konsumenten einen Seiteneffekt.
- Zuvor geschlossen und weiterhin gruen: E11-2, E11-3, E11-7, E11-8, E11-9,
  E11-13.
- Neu eingefuehrt: G11-1 bis G11-4, keine Blocker.
- Unveraendert offen: F11-2 bis F11-6 sowie E11-4, E11-6, E11-10 bis E11-12,
  E11-14 und E11-15.
- Uebernommen aus Slice 10: F10-1 bis F10-7 und E10-9 bleiben offen.

## Zweites Re-Review-Ergebnis (Claude)

- Status: freigegeben
- Blocker: keine.
- Restrisiken:
  - F11-2 (wichtigster Punkt): D-14 ist ueber die Normaljahrformel nach oben
    unbeschraenkt - gemessen 288,0 Prozent in einem regulaeren Jahr und ein
    Runmittelwert von 1,64785 im aktuellen Lauf. Erfordert eine
    Folgeentscheidung des Nutzers zu D-14; die Freigabe bezieht sich auf die
    korrekte Umsetzung der entschiedenen Formel, nicht auf ihre fachliche
    Eignung als Entnahmerate.
  - G11-1: Die vertraglich geforderte Aufnahme des Ruinjahrs senkt D-14 fuer
    ruinierende Kandidaten (0,19986 ausgeschlossen gegen 0,19037
    eingeschlossen) und gehoert in dieselbe Folgeentscheidung.
  - G11-2: Der einzige Zweig mit einem von null verschiedenen Ruinzaehler ist
    in 504 Kombinationen unerreichbar und ohne Witness.
  - G11-3, G11-4 sowie die unveraendert offenen F11-3 bis F11-6, E11-4, E11-6,
    E11-10 bis E11-12, E11-14 und E11-15.
- Pre-Mortem: Die Kennzahl bewegt sich aus zwei gegenlaeufigen, jeweils korrekt
  implementierten Gruenden - Ruinjahre druecken sie nach unten, kleine
  Restdepots in regulaeren Jahren treiben sie ueber 100 Prozent. Ein Nutzer
  liest sie als Entnahmerate und trifft daraus eine Portfolioentscheidung; eine
  Plausibilitaetsgrenze, an der das auffiele, existiert fuer D-14 nicht.

## Zweites Re-Review durch Gemini nach der F11-1-Nachbesserung

**Review-Datum:** 2026-07-27  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Nachbesserung von Codex in `app/simulator/simulator-engine-direct.js` (Zeilen 683 & 725) und den korrigierten Ruin-Witness-Tests in `tests/simulation.test.mjs` und `tests/auto-optimize-fidelity.test.mjs`.

### Verifizierung der Blocker-Behebung (F11-1)

1. **Behebung von F11-1 (Zählerkorrektur im Ruinjahr): BEHOBEN & BESTÄTIGT.**
   - In `simulator-engine-direct.js` wurde der Zähler für `effectiveWithdrawalNominal` in beiden Ruinzweigen exakt korrigiert:
     - Vor-Auszahlungs-Ruin (Zeile 683): `effectiveWithdrawalNominal: 0` (da vor dem Auszahlungsschritt abgebrochen wird; $0\,\text{EUR}$ tatsächliche Auszahlung).
     - Auszahlungs-Fallback-Ruin (Zeile 725): `effectiveWithdrawalNominal: jahresEntnahmeEffektiv` (ausschließlich die tatsächlich geleistete Auszahlung, ohne Hinzurechnung des Restdepots).
   - *Verifizierung:* In der Einzeljahresmessung mit $20.000\,\text{EUR}$ Liquidität und $1.000\,\text{EUR}$ Depot ergab sich früher $2.100\,\%$, jetzt exakt $0,0\,\%$.
   - *Verifizierung:* Die künstliche Unbeschränktheit (früher bis zu $2.000.100\,\%$) ist vollständig eliminiert. Der maximale Run-Mittelwert im Referenzlauf mit Seed 777001 sank von $924,369\,\%$ auf realistische $1,64785\,\%$.

2. **Verifizierung der Test-Witnesses & Nebenwirkungsfreiheit:**
   - Der Regressionstest in `tests/simulation.test.mjs` verifiziert die Trennung von `coveredFloorNominal` ($21.000\,\text{EUR}$) und `effectiveWithdrawalNominal` ($0\,\text{EUR}$) explizit an Nicht-Null-Liquidität.
   - Alle bestehenden Konsumenten von `result.logData` (`historical-backtest-runner`, `sweep-runner`, `monte-carlo-runner`) wurden auf Seiteneffekte geprüft; alle Zugriffe sind abgesichert.
   - Formale Gates: `npm test` mit **8.333 / 8.333 Assertions zu 100 % grün**, 0 offene Handles, 16/16 Browser-Smokes grün, Coverage-Gates bei 78,33 % Gesamtdeckung erfüllt.

### Re-Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. (F11-1 vollständig behoben).
- Restrisiken: 
  1. F11-2 (Claude/Gemini): D-14 Nenner schließt Liquidität aus, während der Zähler im Normaljahr aus der Liquidität gespeist wird (kann in regulären Nicht-Ruin-Jahren bei kleinem Depot > 100 % erreichen; erfordert künftige fachliche Folgeentscheidung zu D-14).
  2. G11-1 (Claude/Gemini): Die vertraglich geforderte Inklusion des Ruinjahres (mit 0 % Auszahlung) senkt die D-14-Metrik für ruiniere Kandidaten leicht (0,19986 vs. 0,19037).
  3. F11-3 bis F11-6, E11-4, E11-6, E11-10..E11-12, E11-14, E11-15: Als ausgewiesene Restrisiken/Hinweise verifiziert.
- Pre-Mortem: Die D-14-Kennzahl wird in regulären Jahren mit sehr kleinem Wertpapierdepot durch die Auszahlung aus der Liquidität über 100 % getrieben, während das Ruinjahr selbst mit 0 % eingeht. Ein Nutzer interpretiert die Zahl als reine Entnahmerate und trifft eine Portfolioentscheidung, ohne zu erkennen, dass der Nenner nur das Wertpapierdepot ohne Cash-Bestände umfasst.
```

