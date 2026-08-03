# Slice 12 - Stressszenarien, Regime und Fallbackwerte

**Datum:** 2026-08-03  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**GitHub-Status:** lokal; kein gleichnamiger Remote-Branch sichtbar, Push bleibt
Nutzerentscheidung  
**Basiscommit:** `6ecb249` (`feat(simulator): implement slice 11 auto optimize metrics and withdrawals contract`)  
**Status:** technisch umgesetzt und durch Codex selbstgeprueft; externes Review,
Freigabe und Commit ausstehend

## Eingangsgrenze aus Slice 11

Das vollstaendige Ergebnisdokument
[`SLICE_BACKTEST_DATENPRUEFUNG_11_EXPORT_PROVENIENZ.md`](SLICE_BACKTEST_DATENPRUEFUNG_11_EXPORT_PROVENIENZ.md)
ist die verbindliche Eingangsgrenze dieses Slice.

- Slice 11 ist durch Claude Runde 4 technisch freigegeben und als Commit
  `6ecb249` vorhanden.
- CR11-1 bis CR11-28 sind geschlossen.
- **CR11-29 ist vor Slice 12 zu schliessen:** Die 34 CSV-Spalten muessen durch
  einen literalen Goldenheader statt durch einen Vergleich der produktiven
  Spaltenliste mit sich selbst gepinnt werden.
- CR11-30 bis CR11-32 bleiben uebernommene Restrisiken und werden nicht still
  als Teil dieses fachlich anders zugeschnittenen Slice geschlossen.
- Die von Slice 11 gebundene Source-, Engine-, Daten- und Exportprovenienz darf
  nicht abgeschwaecht werden.

Weitere Eingangsgroessen:

- S01-1 verlangt vor Slice 12 die Aufloesung der zweiten, abweichenden
  Regimeklassifikation in `simulator-portfolio-historical.js`.
- Slice 2 hat die Verteilung nach dem Wechsel von der Kurs- auf die kanonische
  Total-Return-Reihe mit **40 BULL / 6 BEAR / 49 SIDEWAYS / 6 STAGFLATION**
  dokumentiert (vor Slice 2: 44/7/43/7). Der Renditemittelwert stieg von 9,91
  auf 11,13 Prozent.
- P-06 verlangt deshalb eine Vorher-/Nachher-Verteilung und eine Begruendung
  fuer jede beibehaltene Grenze; nicht nur eine Rekalibrierung ist
  begruendungspflichtig.

## Preflight vor Coding

- `git branch --show-current`: `codex/suite-datenintegritaet-hardening`
- `git status --short`: leer; Arbeitsbaum sauber
- Branchentscheidung: Die dokumentierte Nutzerentscheidung vom 2026-07-29
  erlaubt ausdruecklich, Slice 02 bis 13 auf diesem vorhandenen Branch
  fortzufuehren.

## Ziel

Die aktive Regimeklassifikation wird als ein einziger, messbarer Vertrag an die
kanonischen Reihen gebunden. Stresspresets unterscheiden maschinenlesbar
zwischen historischem Filter, Rekonstruktion, Hybrid und synthetischem Schock.
Fehlende Daten, leere historische Pools und unbekannte Presets duerfen nicht
still als Normalzustand, `NONE`, `SIDEWAYS` oder Nullreturn weiterlaufen.

## Akzeptanzkriterien

1. CR11-29 ist durch einen unabhaengigen literalen CSV-Goldenheader geschlossen.
2. Es existiert genau eine produktive Regimeklassifikation und ein gemeinsamer
   Schwellenvertrag fuer BULL, BEAR, SIDEWAYS und STAGFLATION.
3. Die Schwellenentscheidung nennt die Verteilung vor Slice 2 und auf der
   kanonischen Reihe; beibehaltene Schwellen werden nicht als extern kalibriert
   ausgegeben.
4. Die aktuelle Verteilung, alle Regimepools und die Transitionsmatrix sind
   durch unabhaengige Erwartungen gepinnt.
5. Historische Fenster, historische Filter, Rekonstruktionen, hybride und rein
   synthetische Stresspresets sind maschinenlesbar unterscheidbar; sichtbare
   Namen behaupten keine unbelegte historische Exaktheit.
6. Unbekannte Presets, leere Filterpools, fehlende historische Daten und
   unbrauchbare Regimeuebergaenge scheitern mit stabilen Fehlercodes statt
   `NONE`, `SIDEWAYS` oder Nullrenditen zu erfinden.
7. Monte-Carlo- und Sweep-Pfade verwenden weiterhin denselben Stress- und
   Regimevertrag; Worker-/Serial-Paritaet bleibt gruen.
8. Inventarhashes und Referenzdokumentation beschreiben den tatsaechlichen
   Vertrag.

## Scope

Produktivdateien:

- `app/simulator/simulator-data.js`
- `app/simulator/simulator-portfolio-historical.js`
- `app/simulator/simulator-portfolio-stress.js`
- `app/simulator/simulator-engine-helpers.js`
- `app/simulator/simulation-data-inventory.js`

Tests und Dokumentation:

- `tests/historical-backtest-export.test.mjs`
- `tests/historical-data-robustness.test.mjs`
- fokussierter Regime-/Stress-Vertragstest
- dieses Slice-Dokument und der uebergeordnete Arbeitsplan
- betroffene Referenzdokumentation

## Nicht im Scope

- Aenderungen an den historischen Reihenwerten aus Slice 2 bis 6;
- Engine-, Runway-, Floor-, Mindest-Flex-, Steuer- oder Exportsemantik;
- Monte-Carlo-Methoden, Tail-Risk-Parameter oder Optimizer-Zielmetriken;
- `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- Commit, Push oder Selbstfreigabe durch Codex.

## Schwellenentscheidung vor Umsetzung

Die bestehenden Grenzen 5 Prozent Inflation, 0 Prozent schwache Aktienrendite,
-15 Prozent Crash und +15 Prozent Boom werden nach der Verteilungspruefung
vorerst beibehalten. Der Grund ist kein behaupteter externer Kalibrierungsbeleg:
Die Labels bleiben absolute, erklaerbare Stresskategorien, waehrend eine
quantilbasierte Rekalibrierung ihre Semantik und die Markov-Mechanik aendern
wuerde. Der Vertrag muss deshalb ausdruecklich
`retained_after_total_return_distribution_review` und
`externalValidationStatus: not_validated` ausweisen. Eine spaetere
Rekalibrierung braucht eine eigene fachliche Zielgroesse und externe Evidenz.

Gemessene kanonische Verteilung 1925-2025 (101 Beobachtungen):

| Label | vor Slice 2 | Slice-12-Eingang | Delta |
| --- | ---: | ---: | ---: |
| BULL | 44 | 40 | -4 |
| BEAR | 7 | 6 | -1 |
| SIDEWAYS | 43 | 49 | +6 |
| STAGFLATION | 7 | 6 | -1 |

Renditequantile der kanonischen Reihe: P10 -8,5293 Prozent, P25 -0,2328
Prozent, Median 12,1846 Prozent, P75 22,0347 Prozent und P90 30,5938 Prozent.

## Diff-Risiko vor Coding

```text
Geplante Dateien:
- app/simulator/simulator-data.js
- app/simulator/simulator-portfolio-historical.js
- app/simulator/simulator-portfolio-stress.js
- app/simulator/simulator-engine-helpers.js
- app/simulator/simulation-data-inventory.js
- app/simulator/mc-year-sampling.js
- app/simulator/simulator-monte-carlo.js
- app/simulator/simulator-input-validation.js
- app/simulator/monte-carlo-contracts.js
- app/simulator/auto_optimize_ui.js
- tests/historical-backtest-export.test.mjs
- tests/historical-data-robustness.test.mjs
- neuer fokussierter Regime-/Stress-Vertragstest
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_12_STRESS_REGIME_FALLBACKS.md
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- betroffene Referenzdokumentation

Finale Aenderungstiefe nach zwei Reviewrunden:
- mittel; zehn produktive Dateien, keine Engine-Semantik

Gefaehrdete bestehende Tests:
- Monte-Carlo-/Sweep-Sampling und Worker-Paritaet
- Dateninventar-Hashes
- Stresspreset- und Exportvertraege

Nicht anfassen:
- engine/, engine.js, dist/, RuheStandSuite.exe
- historische Reihenwerte
- Runway-, Floor-, Mindest-Flex- und Steuersemantik

Rollback-Strategie:
- gezielte Wiederherstellung der zehn geplanten Programmdateien sowie
  vorhandener Tests und Dokumente
- neue Slice-/Testdateien nur nach expliziter Freigabe loeschen
```

Die Stop-Regeln greifen nicht: Der produktive Scope umfasst nach den beiden
Reviewrunden exakt zehn Dateien, der Datenvertrag ist eindeutig, und die
Pflichtvalidierung ist lokal vorhanden.

## Geplante Tests

- literaler 34-Spalten-Goldenheader fuer `HistoricalBacktestCsvV2`;
- exakte Regimeverteilung, Grenzwerte und Transitionsmatrix;
- genau ein produktiver Klassifikationspfad;
- Preset-Taxonomie und erwartete historische Kandidatenfenster/-pools;
- unbekanntes Preset und leerer Filterpool fail-closed mit stabilem Code;
- leere Historie und unbrauchbare Transitionen fail-closed statt Nullreturn;
- fokussierte Tests, `npm test`, `npm run test:coverage`,
  `npm run test:browser`, `npm run docs:evidence`, Worker-/Serial-Paritaet und
  `git diff --check`.

## Durchgefuehrte Aenderungen

1. **CR11-29 geschlossen:** `HistoricalBacktestCsvV2` wird gegen einen
   unabhaengig ausgeschriebenen literalen 34-Spalten-Goldenheader geprueft.
   Eine Umsortierung der produktiven Spaltenliste kann die Erwartung nicht mehr
   mitverschieben.
2. **S01-1 geschlossen:** Der alternative Neuaufbau in
   `simulator-portfolio-historical.js` samt abweichenden Inflations-, Crash- und
   Zeitversatzgrenzen wurde entfernt. `prepareHistoricalData()` ist nur noch
   ein fail-closed Verfuegbarkeitsgate fuer die beim Modulstart kanonisch
   initialisierten Daten.
3. **Ein Regimevertrag:** `HistoricalRegimeClassificationV1` bindet die
   bestehenden absoluten Grenzen an
   `global_equity_research_annual_returns`, weist den Retention- und
   Nichtvalidierungsstatus aus und pinnt 101 Beobachtungen mit der Verteilung
   40/6/49/6. Grenzwerte und Transitionsmatrix werden unabhaengig getestet.
4. **Keine erfundenen Regimewerte:** Fehlende Historie, leere Regimepools,
   fehlende/ungueltige Transitionen, nicht auf 1 summierende Uebergangszeilen
   und Verteilungsdrift werfen stabile `SIMULATOR_*`-Codes. Nullrendite und
   `SIDEWAYS` werden nicht mehr als Datenersatz erzeugt.
5. **Stress-Evidenzvertrag:** Jedes Preset traegt `evidenceKind`,
   `sourceEvidence` und `claimScope`. Historische Filter nennen ihren Mix aus
   Beobachtung, Proxy und Rekonstruktion; die Fenster 1929-1933 und 1939-1945
   werden als Rekonstruktion bezeichnet; hybride und synthetische Schocks sind
   getrennt.
6. **Preset-Namen berichtigt:** Die UI behauptet weder einen exakten
   Great-Depression-/WWII-Replay noch einen 1970er-, Dotcom- oder GFC-Replay.
7. **`minCluster` wirksam gemacht:** `DOUBLE_BEAR_00s` verwendete bisher trotz
   `minCluster: 2` alle 17 einzelnen Filtertreffer. Der kanonische Pool enthaelt
   nun nur die 10 Jahre aus tatsaechlich mindestens zweijaehrigen Folgen:
   1929-1931, 1946-1948, 1973-1974 und 2001-2002.
8. **Stress-Fallbacks begrenzt:** Unbekannte Presets, leere historische Pools,
   leere Schnittmengen mit dem effektiven Samplinguniversum, nicht endliche
   Stressinputs und fehlende Sequenzwerte scheitern fail-closed. Ein fehlender
   optionaler Presetwert bleibt der explizit dokumentierte Default `NONE`.
9. **Inventar und Referenzen synchronisiert:**
   `SimulationDataInventoryV1` traegt Revision `2026-08-03.1`, aktualisierte
   Wertfingerprints und die neuen Vertragsgrenzen. README, Datenquellen,
   Architektur-/Fachkonzept, technische Referenz und Simulator-Modulreferenz
   beschreiben denselben Stand.

## Testergebnisse

- Fokussierter Regime-/Stressvertrag: **65/65** Assertions.
- Historische Daten-Robustheit: **2/2** Assertions.
- Historischer Export einschliesslich CR11-29: **106/106** Assertions.
- Monte-Carlo-Sampling: **6/6** Assertions.
- Monte-Carlo-Samplingvertrag: **70/70** Assertions.
- Monte-Carlo-Exportvertrag einschliesslich alter V1-Lesekompatibilitaet:
  **118/118** Assertions.
- Auto-Optimizer einschliesslich gemeinsamer deutscher Fehlerabbildung:
  **102/102** Assertions.
- Dateninventar: bestanden, alle statischen und historischen Hashgates gruen.
- Sweep: **254/254** Assertions.
- Worker-/Serial-Paritaet: **591/591** Assertions.
- `npm test`: **163 Testdateien, 18.135/18.135 Assertions**, 0 Fehler,
  0 offene Handles, 1 separates Gate gruen.
- `npm run test:coverage`: **78,66 Prozent** (40.141/51.031), 217 Dateien,
  beide Pflichtdatei-Gates gruen.
- `npm run test:browser`: **28/28** Browser-Smokes gruen.
- `npm run docs:evidence`: bestanden; 69 MKT-, 55 FOR- und 17 MAP-Anker,
  kein Netzwerkzugriff.
- `git diff --check`: gruen.
- Scopecheck: exakt **zehn** produktive Dateien, sechs Testdateien und sieben
  Dokumentationsdateien. `engine/`, `engine.js`, `dist/` und
  `RuheStandSuite.exe` sind unveraendert.
- `npm run build:engine` wurde nicht ausgefuehrt, weil weder `engine/` noch die
  oeffentliche `EngineAPI` geaendert wurden.

## Abweichungen vom Plan

- Reviewbedingt kamen fuenf produktive Dateien fuer Preflight,
  Lesekompatibilitaet, Fehlerabbildung und Auto-Optimizer hinzu; die
  Zehn-Dateien-Stopgrenze wurde nicht ueberschritten.
- Der geplante Test fuer Stresspools hat eine bestehende, bisher unwirksame
  Semantik sichtbar gemacht: `minCluster: 2` wurde nie ausgewertet. Die
  Umsetzung des bereits deklarierten Vertrags reduziert den Pool wie oben
  dokumentiert von 17 auf 10 Jahre; das ist die einzige beabsichtigte
  finanzielle Ergebniswirkung fuer aktive Presets.

## Offene Risiken

- Die beibehaltenen Regimegrenzen sind weiterhin eine nicht extern validierte
  Modellannahme; Slice 12 macht diese Grenze sichtbar, beseitigt sie aber nicht.
- Historische Proxysegmente koennen einem benannten Zeitraum keine
  beobachtete deutsche Anlegerhistorie verleihen.
- Die Poolaenderung von `DOUBLE_BEAR_00s` veraendert Ergebnisse bestehender
  gespeicherter Stresskonfigurationen bei gleichem Seed; die neue Auswahl ist
  vertragstreu, aber nicht ergebnisneutral.
- CR11-30 bis CR11-32 bleiben aus dem Slice-11-Ergebnis uebernommen.

## Rueckdokumentation in den Arbeitsplan

Der Slice ist verlinkt, die Slice-11-Eingangsgrenze sowie CR11-29/S01-1/P-06
sind dokumentiert, und der Masterplan nennt die technische Umsetzung,
Ergebniswirkung, zehn produktiven Dateien und Abschlussgates. Der Status bleibt
bis zum externen Review ohne Freigabe.

## Freigabestatus

Codex implementiert und prueft technisch, erteilt aber keine Freigabe. Externes
Review durch Gemini, Claude oder den Nutzer und anschliessende Nutzerfreigabe
bleiben erforderlich.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| CR11-29 | Claude Slice 11 Runde 4 | CSV-Reihenfolge ohne literalen Goldenheader | angenommen | erledigt; unabhaengiger literaler V2-Header |
| S01-1 | Claude Slice 1 | zweite abweichende Regimeklassifikation | angenommen | erledigt; Neuaufbau entfernt, einzig kanonischer Pfad bleibt |
| P-06 | Claude Planreview | Beibehalten der gegen Kursdaten kalibrierten Grenzen ist begruendungspflichtig | angenommen | erledigt; Vorher/Nachher-Verteilung, Retention- und Nichtvalidierungsstatus gepinnt |
| S12-1 | Codex-Selbstpruefung | `minCluster: 2` war deklarativ, aber im Filter wirkungslos | angenommen | erledigt; nur Folgen ab zwei Jahren, Pool 17 -> 10 |
| CR12-1 | Claude-Review (Runde 1) | Der harte Startjahrfilter und der Schalter "Geschaetzte Jahre (vor 1950) ausschliessen" machen fuenf der sechs historischen Stresspresets zu einem Laufzeitfehler mitten im Lauf; es gibt keinen Preflight, keine Oberflaechenzuordnung und keine deutschsprachige Meldung | angenommen | umgesetzt; identischer Sampling-Preflight vor Fortschritt/Worker plus deutsche Handlungsmeldung, externes Review ausstehend |
| CR12-2 | Claude-Review (Runde 1) | Der Regime-Sampler behaelt genau die Fallbackklasse, die der Slice beseitigen soll: hat ein Regime im gefilterten Startjahrfenster keine Beobachtung, faellt `sampleNextYearData` still auf die ungefilterte Historie zurueck und zieht Jahre weit vor der "harten Grenze" | angenommen | umgesetzt; effektiver Regimepool ist zwingend, kein Rueckfall auf `REGIME_DATA`, externes Review ausstehend |
| CR12-3 | Claude-Review (Runde 1) | Fuenf der zwoelf neuen `SIMULATOR_*`-Codes sind durch keinen Test gepinnt, darunter die beiden im Betrieb am leichtesten erreichbaren (`SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY`, `SIMULATOR_REGIME_POOL_EMPTY`) | angenommen | umgesetzt; alle fuenf genannten Codes mit Negativtest gepinnt, externes Review ausstehend |
| CR12-4 | Claude-Review (Runde 1) | Der neue Evidenzvertrag ist stumm: `evidenceKind`, `sourceEvidence` und `claimScope` werden in den Stresskontext kopiert, aber von keinem Konsumenten gelesen und erscheinen in keinem Export, keiner Kennzahl und keiner Oberflaeche | angenommen | umgesetzt; `MonteCarloRunRequestV1.stress` exportiert Provenienz und Rohpoolvertrag, externes Review ausstehend |
| CR12-5 | Claude-Review (Runde 1) | Die historischen Filterpools sind nur teilweise gepinnt und fachlich duenn: beide Stagflationspresets ziehen 7 bzw. 8 Stressjahre aus den drei Kandidaten 1946/1948/1973 und degenerieren unter dem 1950-Schalter auf ein einziges wiederholtes Jahr; der Verlustclusterpool enthaelt kein einziges Jahr der Finanzkrise | angenommen | umgesetzt; alle Pools gepinnt, Kalenderjahrescluster, Mindestdiversitaet drei und Claim als unabhaengige Ziehungen praezisiert; externes Review ausstehend |
| CR12-6 | Claude-Review (Runde 1) | Der Verteilungsdriftwurf steht im Modulinitialisierer ohne Auffangpfad; ein regulaeres Datenupdate legt bereits beim Import das gesamte Simulatormodul stumm still, und die Meldung nennt nur die beobachtete, nicht die erwartete Verteilung | angenommen | umgesetzt; Import bleibt moeglich, Runtime-Preflight nennt Soll und Ist und wird deutsch abgebildet; externes Review ausstehend |
| CR12-7 | Claude-Review (Runde 1) | `STRESS_PRESETS` und die neuen `provenance`-Objekte sind nicht eingefroren, waehrend der Regimevertrag vollstaendig eingefroren ist; der Evidenzvertrag ist zur Laufzeit ueberschreibbar | angenommen | umgesetzt; gesamter Preset-/Provenienzbaum tief eingefroren, externes Review ausstehend |
| CR12-8 | Claude-Review (Runde 2) | `MonteCarloRunRequestV1` verlangt neu zwingend `stress.provenance`, `stress.provenance.evidenceKind`, `stress.provenance.claimScope` und `stress.pool`, behaelt aber die unveraenderte Versionskennung; ein frueher exportiertes Dokument wird beim Wiedereinlesen abgewiesen | angenommen | umgesetzt; neue Writer schreiben beide Felder, alte V1-Requests ohne additive Felder werden validiert und als Gesamtexport eingelesen; externes Review ausstehend |
| CR12-9 | Claude-Review (Runde 2) | Acht der dreizehn `SIMULATOR_*`-Codes haben keine deutsche Meldung, darunter das ueber ein gespeichertes Profil erreichbare `SIMULATOR_STRESS_PRESET_UNKNOWN`; sie erscheinen als englischer Rohtext mit vorangestelltem Code | angenommen | umgesetzt; zentraler deutscher Katalog deckt alle 13 Stress-/Regimecodes ab; externes Review ausstehend |
| CR12-10 | Claude-Review (Runde 2) | Die sechs neuen nutzersichtbaren Meldungen sind ASCII-transliteriert ("ausfuehrbar", "frueher", "geschaetzte", "enthaelt"), waehrend die uebrigen Meldungen derselben Datei korrekte Umlaute tragen | angenommen | umgesetzt; alle neuen Meldungen verwenden korrektes Deutsch mit Umlauten; externes Review ausstehend |
| CR12-11 | Claude-Review (Runde 2) | Der Auto-Optimizer zeigt Fehler ueber `alert('Error during auto-optimization:' + e.message)` und umgeht `formatSimulatorValidationError`; dieselbe abgewiesene Kombination bleibt dort unuebersetzt | angenommen | umgesetzt; Auto-Optimizer delegiert an dieselbe zentrale Fehlerabbildung; externes Review ausstehend |
| CR12-12 | Claude-Review (Runde 2) | Die Mindestdiversitaet von drei Jahren wirkt nur im Vertragspreflight; `buildStressContext` und `sampleNextYearData` pruefen weiterhin nur auf Poolgroesse null, und der Reihenfolgetest ist ein Quelltext-Substringscan ohne Semantikpruefung | angenommen | umgesetzt; Rohkontext und Laufzeit-Schnittmenge erzwingen Diversitaet separat, Quelltextscan entfernt; externes Review ausstehend |
| CR12-13 | Claude-Review (Runde 2) | Das Dokument widerspricht sich: "Testergebnisse" nennt weiterhin exakt fuenf produktive Dateien und 18.086 Assertions, waehrend der Nachbesserungs-Preflight neun produktive Dateien und das Nachbesserungsergebnis 18.105 Assertions fuehrt | angenommen | umgesetzt; Abschlusszahlen und Scope im gesamten Ergebnisabschnitt synchronisiert; externes Review ausstehend |
| CR12-14 | Claude-Review (Runde 3) | `SIMULATOR_HISTORICAL_DATA_UNAVAILABLE` fehlt im deutschen Meldungskatalog und erscheint als englischer Rohtext; der Vollstaendigkeitstest vergleicht den Katalog gegen eine handgeschriebene Liste, die denselben Code auslaesst, und kann die Luecke daher nicht erkennen | offen | Auflage vor Slice 13 |
| CR12-15 | Claude-Review (Runde 3) | Die Reihenfolge "Preflight vor Fortschrittsanzeige und Workerdispatch" ist nach Entfernen des Quelltextscans durch keinen Test mehr verankert; eine Verschiebung hinter den Dispatch bliebe unbemerkt | offen | Auflage vor Slice 13 |
| CR12-16 | Claude-Review (Runde 3) | Der Auto-Optimizer-Test prueft die Hilfsfunktion `formatAutoOptimizeError`, nicht den tatsaechlichen Fehlerpfad; ein Rueckbau des `catch`-Blocks auf `e.message` passiert die gesamte Suite gruen | offen | Auflage vor Slice 13 |

## Review-Feedback von Claude

### Pruefgegenstand und Verifikationsbasis

Unversionierter Arbeitsbaum auf Basiscommit `6ecb249`. Produktiver Scope: fuenf
Dateien, wie dokumentiert. `engine/`, `engine.js`, `dist/` und
`RuheStandSuite.exe` sind unberuehrt; `dist/app/simulator/simulator-data.js`
weicht weiterhin vom Arbeitsbaum ab, das Artefakt wurde also nicht mit
synchronisiert.

Selbst gemessen, nicht aus dem Dokument uebernommen:

- `npm test`: **18.086/18.086** Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles, 1 separates Gate.
- `npm run test:coverage`: **78,61 Prozent** (40.022/50.910), beide
  Pflichtdatei-Gates bestanden.
- `npm run test:browser`: **28** bestandene Szenarien.
- `npm run docs:evidence`: bestanden, 69 MKT-, 55 FOR-, 17 MAP-Anker.
- `git diff --check`: gruen.
- Fokussiert: Regime-/Stressvertrag 24/24, Datenrobustheit 2/2,
  historischer Export 106/106.

Alle Angaben sind deckungsgleich mit dem Dokument.

### Verifikation der Eingangsgrenzen

- **CR11-29 geschlossen, mit Zeugen.** Gegenprobe E hat genau die Mutation
  wiederholt, die in Slice 11 Runde 4 noch 18.063/18.063 gruen passiert ist:
  Vertauschen von `gold_return_pct` und `cash_bond_return_pct` bei
  unveraenderter Spaltenzahl. Ergebnis jetzt:

  ```text
  FAIL: CSV V2 uses the independently pinned literal 34-column golden header
  ```

  Der literale Header enthaelt gemessen 34 Felder und ist mit der produktiven
  Spaltenliste identisch, aber unabhaengig von ihr formuliert.
- **S01-1 geschlossen.** Der zweite Klassifikationspfad ist entfernt. Zur
  Genauigkeit: Er war bereits vorher praktisch unerreichbar, weil der
  Modulinitialisierer von `simulator-data.js` `annualData` schon beim Import
  fuellt und der alte `prepareHistoricalData()` mit
  `if (annualData.length > 0) return;` begann. Der Slice beseitigt damit eine
  latente, keine aktive Divergenz - das ist eine Verbesserung, aber kein
  behobener Produktivfehler.
- **P-06 geschlossen.** `calibrationStatus` und `externalValidationStatus`
  sind gesetzt, gepinnt und im Inventar gespiegelt.
- CR11-30 bis CR11-32 sind unveraendert offen und werden korrekt nicht als
  Teil dieses Slice ausgewiesen.

### Dimension 1 - Korrektheit

`classifyHistoricalRegime` ist eine verhaltensgleiche Extraktion der
bisherigen Kaskade; ich habe die Grenzfaelle nachgerechnet und keine
Abweichung gefunden. Die Verteilung 40/6/49/6 bei 101 Beobachtungen und die
Transitionsmatrix sind unabhaengig nachgemessen und stimmen.

`enforceMinimumConsecutiveCluster` arbeitet auf Indexnachbarschaft in
`annualData`. Weil die kanonische Reihe 1925-2025 lueckenlos ist, entspricht
das hier der Jahresnachbarschaft; bei einer spaeteren Luecke waere es das
nicht mehr.

Fachlich ist die neue `minCluster`-Wirkung zu betonen: `minCluster` filtert
die Kandidatenmenge, erzeugt aber keine zusammenhaengenden Ziehungen. Der
Sampler zieht weiterhin unabhaengig aus dem Pool, so dass ein "Verlustcluster"
im gezogenen Pfad nicht garantiert ist. Gemessener Pool:

```text
DOUBLE_BEAR_00s -> [1929,1930,1931,1946,1947,1948,1973,1974,2001,2002]
DOUBLE_BEAR enthaelt 2008: false
```

Sechs der zehn Kandidatenjahre liegen vor 1951 und stammen damit aus der
Rekonstruktion; das Jahr der Finanzkrise ist als isoliertes Verlustjahr
vollstaendig ausgeschlossen (**CR12-5**).

### Dimension 2 - Vertragstreue

Akzeptanzkriterium 6 verlangt, dass unbrauchbare Regimeuebergaenge mit
stabilen Fehlercodes scheitern, statt `SIDEWAYS` zu erfinden;
`DATA_SOURCES.md` schreibt das nun ausdruecklich fest. Diese Zusage ist
unvollstaendig eingeloest. In `sampleNextYearData` liegen sechs Zeilen
auseinander:

- Zeile 393: leerer effektiver Stresspool - harter Wurf;
- Zeile 467: kein Regime-Sampler im gefilterten Fenster - stiller Rueckfall
  auf die **ungefilterte** `REGIME_DATA[regime]`.

Gemessen mit dem Oberflaechenmodus "Startjahr filtern (harte Grenze)":

```text
Filter 2010: Regime ohne Fensterbeobachtung = [BEAR]
             gezogene Jahre unterhalb der harten Grenze = [1930,1931,1937,1990,2002,2008]
Filter 2023: Regime ohne Fensterbeobachtung = [BEAR,STAGFLATION]
             gezogene Jahre unterhalb der harten Grenze = [1930,1931,1937,1946,1947,1948,1973,1974,1990,2002,2008,2022]
```

Der Nutzer waehlt eine harte Grenze bei 2010 und erhaelt Baerenmarktjahre aus
1930 und 1937 - ohne Fehlercode, ohne Diagnose, ohne Hinweis. Das ist exakt
die Fehlerklasse, die der Slice beseitigen will, im selben Modul und in
derselben Funktion (**CR12-2**).

Der Evidenzvertrag ist maschinenlesbar hinterlegt, aber es gibt keinen
Konsumenten. `provenance` wird in `buildStressContext` in den Kontext kopiert
und danach von niemandem gelesen; `stressKPI` transportiert nur `presetKey`
und `years`. Weder Ergebnisdarstellung noch Monte-Carlo-Export noch
Szenariolog nennen `evidenceKind` oder `claimScope`. Das ist dieselbe stumme
Diagnose, die in Slice 11 als CR11-25 aufgenommen und dort behoben wurde
(**CR12-4**).

Der Regimevertrag ist vollstaendig eingefroren, `STRESS_PRESETS` und die
`provenance`-Objekte sind es nicht (**CR12-7**).

### Dimension 3 - Fehlerbehandlung

Fail-closed ist die richtige Richtung, aber es fehlt der Auffangpfad. Gemessen
mit den vorhandenen Oberflaechenschaltern:

```text
A1 GREAT_DEPRESSION + "vor 1950 ausschliessen" -> THROW SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY
A2 WWII_40s         + "vor 1950 ausschliessen" -> THROW SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY
A3 GREAT_DEPRESSION + Startjahrfilter 1970     -> THROW SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY
A5 STAGFLATION_70s  + Startjahrfilter 1990     -> THROW SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY
```

Beide Bedienelemente liegen im selben Formular unmittelbar neben der
Stressauswahl; der Startjahrfilter ist ein Schieberegler von 1925 bis 2025.
Es gibt keinen Preflight, der die Kombination vor dem Lauf abweist, keine
Zuordnung des Codes auf eine deutschsprachige Meldung und keine
Handlungsempfehlung. Der Nutzer sieht ueber `formatSimulatorValidationError`
den englischen Rohtext mit vorangestelltem Code. Verschaerfend: Der Wurf
faellt erst im Jahrespfad an, der Workerlauf scheitert, wird in
`simulator-monte-carlo.js` als "falling back to serial" abgefangen, und der
vollstaendige Lauf wird seriell wiederholt, bevor dieselbe Meldung erscheint.
In Slice 11 hat Codex fuer genau diese Situation fuenf Exportcodes auf Titel,
Zusammenfassung und Handlung abgebildet; hier fehlt das Gegenstueck
vollstaendig (**CR12-1**).

Von den zwoelf Codes des Slice sind fuenf durch keinen Test gepinnt:
`SIMULATOR_REGIME_TRANSITIONS_EMPTY`, `SIMULATOR_REGIME_DISTRIBUTION_DRIFT`,
`SIMULATOR_STRESS_INPUT_INVALID`, `SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY` und
`SIMULATOR_REGIME_POOL_EMPTY`. Ausgerechnet die beiden im Betrieb am
leichtesten erreichbaren sind ungesichert (**CR12-3**).

Die Abbruchschwelle liegt ausschliesslich bei Poolgroesse null. Ein Pool mit
einem einzigen Jahr laeuft unbeanstandet durch:

```text
B1 STAGFLATION_70s roh 3 -> effektiv [1973] fuer 7 Stressjahre
B2 gezogene Stressjahre: [1973,1973,1973,1973,1973,1973,1973]
```

Sieben Stressjahre, siebenmal dasselbe Beobachtungsjahr, ohne Hinweis
(**CR12-5**).

### Dimension 4 - Seiteneffekte

Der Verteilungsdriftwurf steht im Modulinitialisierer. Gegenprobe D hat ein
regulaeres Datenupdate simuliert:

```text
IMPORT THROW: SIMULATOR_REGIME_DISTRIBUTION_DRIFT
stress-Modul faellt mit aus: SIMULATOR_REGIME_DISTRIBUTION_DRIFT
tests/stress-regime-contract.test.mjs: Failed Files: 1
```

Es gibt keinen `try`/`catch` um die Modulinitialisierung. Ein zusaetzliches
Datenjahr oder eine korrigierte Inflationszahl legt damit beim Import das
gesamte Simulatormodul still - in der Oberflaeche ohne jede Meldung, weil das
Modul nie so weit kommt, eine anzuzeigen. Die Meldung nennt zudem nur die
beobachtete Verteilung; bei einer reinen Abweichung der Beobachtungszahl
zeigt sie eine Verteilung an, die mit dem Vertrag uebereinstimmt, und
verschleiert damit die tatsaechliche Ursache (**CR12-6**).

Die Poolaenderung von `DOUBLE_BEAR_00s` ist wie dokumentiert nicht
ergebnisneutral. Sie ist im Dokument sauber als einzige beabsichtigte
finanzielle Wirkung ausgewiesen.

### Dimension 5 - Was koennte brechen

Die wahrscheinlichste Bruchstelle ist nicht die Rechnung, sondern die
Kombination aus zwei benachbarten Bedienelementen. Fuenf der sechs
historischen Presets sind unter einem gesetzten Startjahrfilter oder dem
1950-Schalter nicht mehr lauffaehig, und der Nutzer erfaehrt das erst nach
einem doppelt ausgefuehrten Lauf in Form eines englischen Fehlercodes.
Zweitwahrscheinlich: der stille Rueckfall des Regime-Samplers, der eine als
"hart" beschriftete Grenze ohne Signal unterlaeuft.

### Gegenproben

Zwei Dateien wurden temporaer mutiert und gegen ein SHA-256-Manifest
byteidentisch zurueckgesetzt:

```text
app/simulator/simulator-data.js             999bc94da4a4816a...  OK
app/simulator/historical-backtest-export.js 4dfddfe273f76c65...  OK
```

- **Gegenprobe D** (Verteilungsdrift): Import wirft, abhaengige Module fallen
  mit aus, ein Test schlaegt als Dateifehler fehl.
- **Gegenprobe E** (Spaltentausch ohne Zahlaenderung): schlaegt jetzt fehl,
  waehrend dieselbe Mutation in Slice 11 Runde 4 vollstaendig gruen war.
  CR11-29 ist damit belegt geschlossen.
- Nach beiden Wiederherstellungen: Regime-/Stressvertrag 24/24, Export
  106/106.

Die Proben A bis C sind reine Leseproben ohne Dateiaenderung.

### Findings-Lifecycle

- Geschlossen und verifiziert: CR11-29 (mit Zeugen), S01-1, P-06.
- Weiterhin geschlossen: CR11-1 bis CR11-28.
- Neu eingefuehrte Blocker: CR12-1, CR12-2.
- Neu eingefuehrte Restrisiken: CR12-3 bis CR12-7.
- Unveraendert offen: CR11-30 bis CR11-32, CR10-15 bis CR10-18, CR09-5 bis
  CR09-13, CR09-15 bis CR09-20, CR08-17, CR08-21 bis CR08-23, CR07-4,
  CR07-7 bis CR07-15, CR06-20, CR06-23.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache: Die historische Reihe wird
regulaer um ein Jahr fortgeschrieben oder ein Wert wird korrigiert. Die
gepinnte Verteilung passt danach nicht mehr, der Modulinitialisierer wirft
beim Import, und weil kein Aufrufer den Wurf auffangen kann, startet der
Simulator ueberhaupt nicht mehr - ohne sichtbare Meldung, weil das Modul vor
jeder Oberflaechenausgabe abbricht. Zweitwahrscheinlich: Ein Nutzer setzt den
Startjahrfilter auf ein modernes Jahr, waehlt ein historisches Stresspreset
und erhaelt entweder einen englischen Abbruch nach doppeltem Lauf oder - im
Regimepfad - stillschweigend Jahre aus den 1930ern innerhalb einer als hart
beschrifteten Grenze.

## Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:**
  - CR12-1: Fuenf der sechs historischen Stresspresets scheitern unter dem
    Startjahrfilter oder dem Schalter "Geschaetzte Jahre (vor 1950)
    ausschliessen" mit einem englischen Rohfehler mitten im Lauf. Es fehlen
    Preflight, Codezuordnung und Handlungshinweis; der Lauf wird zuvor
    seriell wiederholt.
  - CR12-2: `sampleNextYearData` faellt bei einem im Startjahrfenster leeren
    Regime still auf die ungefilterte Historie zurueck und zieht Jahre weit
    vor der als hart beschrifteten Grenze. Akzeptanzkriterium 6 ist damit
    nicht eingeloest, und `DATA_SOURCES.md` beschreibt den Gegenzustand.
- **Restrisiken:** CR12-3 (fuenf von zwoelf Fehlercodes ungetestet),
  CR12-4 (Evidenzvertrag ohne Konsumenten), CR12-5 (degenerierte und nur
  teilweise gepinnte Filterpools), CR12-6 (Modulinitialisierer wirft ohne
  Auffangpfad), CR12-7 (Evidenzvertrag nicht eingefroren) sowie unveraendert
  CR11-30 bis CR11-32, CR10-15 bis CR10-18, CR09-5 bis CR09-13, CR09-15 bis
  CR09-20, CR08-17, CR08-21 bis CR08-23, CR07-4, CR07-7 bis CR07-15,
  CR06-20, CR06-23.
- **Pre-Mortem:** siehe oben - ein regulaeres Datenupdate laesst den
  Simulator beim Import stumm abbrechen.

Alle Gates sind gruen und in beiden Richtungen nachgemessen; CR11-29 ist mit
einem echten Zeugen geschlossen. Die Blockade betrifft die Auffangseite der
neuen Fail-closed-Vertraege, nicht deren Richtung. Commit, Push und Freigabe
bleiben Nutzerentscheidung.

## Nachbesserungs-Preflight nach Claude-Review Runde 1

- **Branch:** `codex/suite-datenintegritaet-hardening`
- **Status:** bestehende, uncommittete Slice-12-Aenderungen; keine fremden
  Programmdateien im Arbeitsbaum erkannt.
- **Eingang:** Claude-Review Runde 1 mit CR12-1 bis CR12-7.
- **Scope:** Die bisherigen fuenf produktiven Slice-Dateien werden korrigiert.
  Hinzu kommen vier produktive Dateien fuer Preflight, Fehlerabbildung und
  Exportkonsum: `mc-year-sampling.js`, `simulator-monte-carlo.js`,
  `simulator-input-validation.js` und `monte-carlo-contracts.js`. Damit bleibt
  der Slice bei insgesamt neun produktiven Dateien und ueberschreitet die
  Stop-Regel nicht.
- **Diff-Risiko:** Die Nachbesserung veraendert keine Engine-Semantik. Sie
  kann bisher still oder erst im Jahrespfad akzeptierte Kombinationen vor dem
  Workerstart ablehnen. Stress-Pools werden vollstaendig gepinnt, nach
  Kalenderjahren statt Array-Nachbarschaft geclustert und bei weniger als
  drei unterschiedlichen Beobachtungen verworfen.
- **Stop-Regeln:** Kein Contract ist fuer die Nachbesserung offen. Bei
  unerwarteter Backtest-/Snapshot-Abweichung, nicht ausfuehrbarer
  Pflichtvalidierung oder Bedarf an einer elften produktiven Datei wird
  gestoppt.
- **Geplante Abhilfe:** frueher sampling-identischer Preflight vor
  Fortschrittsanzeige und Workerdispatch; kein ungefilterter Regime-Fallback;
  deutschsprachige Handlungsmeldungen; explizite Stress-Pool- und
  Provenienzmetadaten in Request und Ergebnis; kein Wurf im
  Modulinitialisierer; vollstaendig eingefrorene Stressvertraege; gezielte
  Tests fuer alle von CR12-3 genannten Codes.

## Nachbesserungsergebnis nach Claude-Review Runde 1

- Historische Stresskombinationen werden vor `showProgress()` und vor dem
  Workerdispatch gegen denselben wirksamen Samplingvertrag geprueft, den der
  Runner verwendet. Leere und auf ein oder zwei unterschiedliche Jahre
  degenerierte Pools erhalten stabile Codes und deutsche Handlungsoptionen.
- Ein vorhandener Jahresfilter macht `regimeSamplers` verbindlich. Ein darin
  fehlendes Regime wirft `SIMULATOR_REGIME_POOL_EMPTY`; der alte Rueckfall auf
  die ungefilterte globale Regimemenge ist entfernt.
- `SIMULATOR_REGIME_TRANSITIONS_EMPTY`,
  `SIMULATOR_REGIME_DISTRIBUTION_DRIFT`, `SIMULATOR_STRESS_INPUT_INVALID`,
  `SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY` und
  `SIMULATOR_REGIME_POOL_EMPTY` besitzen direkte Negativtests. Zusaetzlich ist
  der neue Diversitaetsfehler `SIMULATOR_STRESS_EFFECTIVE_POOL_TOO_SMALL`
  gepinnt.
- Die Regimeverteilung wird nicht mehr im Modulinitialisierer verworfen.
  `prepareHistoricalData()` fuehrt den auffangbaren Runtime-Preflight aus;
  dessen Driftmeldung nennt erwartete und beobachtete Zaehler.
- `STRESS_PRESETS` ist tief eingefroren. Der Exportrequest konsumiert
  `evidenceKind`, `sourceEvidence`, `claimScope`, Poolpolicy,
  Mindestdiversitaet und die vollstaendige Rohjahresliste. Die bestehenden
  eingefrorenen Monte-Carlo-Ergebnisprojektionen bleiben byteidentisch.
- Der geaenderte Stresskatalog ist im statischen Dateninventar mit dem neuen
  Wert-Hash `e42d795bef1f5f30b9664864aa8981d1a55efa691ed827d29faeb78675ec3988`
  gepinnt.
- Technischer Stand: gezielte Stress-/Regime-, Sampling-, Inventar-, Export-
  und Monte-Carlo-Messvertragstests gruen; `npm test` mit 18.105/18.105
  Assertions gruen; Coverage 78,65 % (40.124/51.013 Zeilen) und beide
  Pflicht-Dateigates gruen; Browser-Smoke gruen. Eine Freigabe wird hiermit
  nicht erteilt und bleibt dem externen Review vorbehalten.

## Zweitreview von Claude (Runde 2)

### Pruefgegenstand und Verifikationsbasis

Nachbesserungsstand der Runde 1 im unversionierten Arbeitsbaum auf Basiscommit
`6ecb249`. Der produktive Scope ist von fuenf auf **neun** Dateien gewachsen;
die vier neuen Dateien dienen ausschliesslich Preflight, Fehlerabbildung und
Exportkonsum. `engine/`, `engine.js`, `dist/` und `RuheStandSuite.exe` sind
unberuehrt.

Selbst gemessen:

- `npm test`: **18.105/18.105** Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles.
- `npm run test:coverage`: **78,65 Prozent** (40.124/51.013), beide
  Pflichtdatei-Gates bestanden.
- `npm run test:browser`: **28** bestandene Szenarien.
- `npm run docs:evidence`: bestanden.
- `git diff --check`: gruen.
- Fokussiert: Regime-/Stressvertrag **36/36**, Samplingvertrag **71/71**.

Alle Angaben sind deckungsgleich mit dem Nachbesserungsergebnis.

### Verifikation der Findings aus Runde 1

- **CR12-1 geschlossen.** Der Preflight sitzt in
  `resolveMonteCarloSamplingContractV1` und damit im selben Vertrag, den auch
  Runner und Sweep aufloesen; er wird in der Oberflaeche vor
  `ui.showProgress()` und vor dem Workerdispatch ausgefuehrt. Gemessen:

  ```text
  GREAT_DEPRESSION + vor-1950-Schalter -> SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY
  WWII_40s         + vor-1950-Schalter -> SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY
  GREAT_DEPRESSION + Filter 1970       -> SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY
  STAGFLATION_70s  + vor-1950-Schalter -> SIMULATOR_STRESS_EFFECTIVE_POOL_TOO_SMALL
  STAGFLATION_70s  ohne Filter         -> Preflight ok
  DOUBLE_BEAR      + vor-1950-Schalter -> Preflight ok
  ```

  Alle vier Ablehnungen erscheinen als deutschsprachige Handlungsmeldung. Der
  doppelte Lauf ueber den Worker-/Seriellfallback entfaellt, weil der Abbruch
  vor dem Dispatch liegt. Gegenprobe J belegt die Absicherung: nach Entfernen
  des Preflightblocks meldet der Samplingvertragstest
  `FAIL: historical stress conflicts fail during sampling preflight`.
- **CR12-2 geschlossen - mit einer Richtigstellung meinerseits.** Der
  ungefilterte Rueckfall ist entfernt; ein im Jahresfenster fehlendes Regime
  wirft jetzt `SIMULATOR_REGIME_POOL_EMPTY`. Gemessen ueber 200 Ziehungen mit
  hartem Filter 2010: kein einziges Jahr unterhalb der Grenze, Fehlercode
  gesetzt. Gegenprobe K belegt die Absicherung: nach Wiedereinbau des alten
  Rueckfalls schlaegt genau eine Assertion fehl.

  Richtigstellung: In meinem Runde-1-Zeugen hatte ich `sampleNextYearData`
  direkt aufgerufen. Der produktive Monte-Carlo- und Sweeppfad laeuft jedoch
  ueber `resolveMonteCarloSamplingContractV1`, und das dort bereits vorhandene
  `assertDrawableRegimePools` hat dieselbe Konfiguration schon vor Slice 12
  mit `MC_SAMPLING_REGIME_POOL_EMPTY` abgewiesen - nachgemessen am aktuellen
  Stand fuer Filter 2010. Der Rueckfall war damit real vorhanden, aber ueber
  die produktiven Einstiegspunkte nicht erreichbar. Meine Formulierung
  "der Nutzer erhaelt stillschweigend Jahre aus den 1930ern" war insoweit zu
  weit gefasst; die Feststellung bleibt als Tiefenverteidigung gueltig, ihre
  Nutzerwirkung war es nicht.
- **CR12-3 geschlossen.** Alle dreizehn Codes einschliesslich des neuen
  `SIMULATOR_STRESS_EFFECTIVE_POOL_TOO_SMALL` sind jetzt durch mindestens
  einen Test gepinnt; nachgezaehlt ueber alle Testdateien.
- **CR12-4 weitgehend geschlossen.** `MonteCarloRunRequestV1.stress` traegt
  `provenance` und `pool` samt vollstaendiger Rohkandidatenliste; der
  Exportvertragstest pinnt `[1946, 1948, 1973]`. Der Evidenzvertrag ist damit
  in einem Artefakt sichtbar. In der Oberflaeche erscheint er weiterhin nicht -
  das ist die uebernommene Klasse CR11-30, kein neuer Befund. Siehe aber
  CR12-8.
- **CR12-5 geschlossen.** Die Clusterbildung arbeitet jetzt auf
  Kalenderjahren statt Arraynachbarschaft, alle fuenf Pools sind gepinnt, die
  Mindestdiversitaet von drei Jahren verhindert die degenerierte Ziehung, und
  `claimScope` benennt `independent_draws_...not_a_contiguous_replay`. Die
  gemessenen Pools sind unveraendert; die Umstellung ist ergebnisneutral.
  Siehe aber CR12-12.
- **CR12-6 geschlossen.** Der Modulinitialisierer wirft nicht mehr; der
  Import bleibt moeglich. `assertHistoricalRegimeContract()` laeuft in
  `prepareHistoricalData()` und damit auch in den Workern
  (`workers/mc-worker.js` ruft `prepareHistoricalDataOnce()`). Die Meldung
  nennt jetzt Soll und Ist, und `REGIME_CLASSIFICATION_DIAGNOSTICS` stellt
  die Diagnose ohne Wurf bereit.
- **CR12-7 geschlossen.** `STRESS_PRESETS` ist tief eingefroren; gemessen
  einschliesslich `filter`, `provenance` und `seqReturnsEq`.

### Dimension 1 - Korrektheit

Die Umstellung von Index- auf Kalenderjahrnachbarschaft ist die fachlich
richtige Formulierung derselben Regel und liefert bei der lueckenlosen Reihe
identische Pools. Ich habe keinen Rechenfehler gefunden.

`minimumDistinctYears: Math.min(3, preset.years)` legt die Schwelle fuer alle
historischen Presets auf drei. `STAGFLATION_70s` liegt mit genau drei
Kandidatenjahren exakt auf der Grenze: der ungefilterte Lauf ist zulaessig,
jede Einschraenkung kippt ihn. Das ist eine bewusste, aber sehr knappe
Auslegung.

### Dimension 2 - Vertragstreue

`validateMonteCarloRunRequestV1` verlangt neu vier zusaetzliche Pflichtfelder
unter `stress`, waehrend `MONTE_CARLO_RUN_REQUEST_VERSION` unveraendert
`MonteCarloRunRequestV1` bleibt. Der Lesepfad
`monte-carlo-export.js` validiert eingelesene Exportdokumente mit derselben
Funktion. Gemessen an einem Dokument mit alter `stress`-Struktur und
gueltiger Versionskennung:

```text
alter Request abgelehnt: MC_CONTRACT_REQUIRED_OBJECT
MonteCarloRunRequestV1: stress.provenance must be an object.
```

Ein vor dieser Aenderung gespeicherter Monte-Carlo-Export ist damit nicht mehr
einlesbar, obwohl er sich korrekt als `MonteCarloRunRequestV1` ausweist. Das
ist dieselbe Klasse wie CR11-23 - stille Vertragsverschaerfung unter
unveraenderter Versionskennung -, hier mit belegtem statt latentem
Funktionsbruch. Der Schema-Golden faengt es nicht ab, weil er nur
Versionskennungen und die obersten Pflichtfelder prueft (**CR12-8**).

### Dimension 3 - Fehlerbehandlung

Die Zuordnung deckt fuenf `SIMULATOR_*`-Codes plus
`MC_SAMPLING_REGIME_POOL_EMPTY` ab. Acht Codes bleiben ohne deutsche Meldung.
Der praktisch relevanteste davon ist `SIMULATOR_STRESS_PRESET_UNKNOWN`: der
Presetschluessel kommt ueber `readString(profileData, simKey('stressPreset'),
'NONE')` ungeprueft aus einem gespeicherten Profil, so dass ein spaeter
umbenanntes oder entferntes Preset genau hier landet. Gemessen:

```text
F8 unbekanntes Preset -> UI: SIMULATOR_STRESS_PRESET_UNKNOWN: Unknown stress preset DOTCOM_2000.
```

(**CR12-9**)

Die sechs neuen Meldungen sind nutzersichtbarer Text und ASCII-transliteriert
("nicht ausfuehrbar", "Setzen Sie die Grenze frueher", "erlauben Sie
geschaetzte Jahre"), waehrend dieselbe Datei an anderer Stelle korrekt
"groesser", "fuer" und "Liquiditaets-Runway" mit Umlauten schreibt. In der
Oberflaeche steht damit fehlerhaftes Deutsch (**CR12-10**).

Der Auto-Optimizer faehrt denselben Samplingvertrag, zeigt Fehler aber ueber
`alert('Error during auto-optimization:\n\n' + e.message)` und umgeht die
Zuordnung vollstaendig; dort bleibt dieselbe Ablehnung englisch (**CR12-11**).

### Dimension 4 - Seiteneffekte

Die Mindestdiversitaet lebt ausschliesslich im Vertragspreflight.
`buildStressContext` und `sampleNextYearData` pruefen weiterhin nur auf
Poolgroesse null, so dass ein Konsument, der den Vertrag nicht aufloest,
weiterhin sieben Stressjahre aus einem einzigen Beobachtungsjahr ziehen kann.
Der neue Reihenfolgetest ist ein Substringscan ueber den Quelltext von
`simulator-monte-carlo.js`; er prueft Textpositionen, nicht Semantik, und
zerbricht an jeder Umbenennung (**CR12-12**).

Beobachtung ohne eigenen Befund: Bei Gegenprobe J hat die betroffene
Testdatei nach der ersten fehlgeschlagenen Assertion abgebrochen - 60 statt
71 Assertions bei `Failed Files: 0`. Das Gesamtgate schlaegt korrekt ueber
`Failed Assertions: 1` an, die Dateizaehlung verdeckt den Abbruch aber.

Der Abschnitt "Testergebnisse" nennt weiterhin fuenf produktive Dateien und
18.086 Assertions, waehrend Preflight und Nachbesserungsergebnis neun Dateien
und 18.105 Assertions fuehren (**CR12-13**).

### Dimension 5 - Was koennte brechen

Die wahrscheinlichste Bruchstelle ist der Wiedereinlesepfad: gespeicherte
Monte-Carlo-Exporte aus der Zeit vor dieser Aenderung tragen dieselbe
Versionskennung und werden dennoch abgewiesen. Zweitwahrscheinlich: ein
gespeichertes Profil mit einem spaeter geaenderten Presetschluessel, das mit
einem englischen Rohfehler abbricht.

### Gegenproben

Zwei Dateien wurden temporaer mutiert und gegen ein SHA-256-Manifest
byteidentisch zurueckgesetzt:

```text
app/simulator/simulator-engine-helpers.js 6ca6b8533e002093...  OK
app/simulator/mc-year-sampling.js         f1ad138bce16e2e8...  OK
```

- **Gegenprobe J** (Preflightblock entfernt): `FAIL: historical stress
  conflicts fail during sampling preflight (Expected
  SIMULATOR_STRESS_EFFECTIVE_POOL_EMPTY, got undefined)`.
- **Gegenprobe K** (alter Regime-Rueckfall wiederhergestellt): `npm test`
  meldet 1 fehlgeschlagene Assertion.
- Nach beiden Wiederherstellungen: Samplingvertrag 71/71, Regime-/Stress
  36/36.

### Findings-Lifecycle

- Geschlossen: CR12-1 bis CR12-7, einzeln verifiziert; CR12-1 und CR12-2
  zusaetzlich per Mutationszeuge. CR12-2 mit dokumentierter Richtigstellung
  zur Erreichbarkeit.
- Weiterhin geschlossen: CR11-29, S01-1, P-06 sowie CR11-1 bis CR11-28.
- Neu eingefuehrter Blocker: CR12-8.
- Neu eingefuehrte Restrisiken: CR12-9 bis CR12-13.
- Unveraendert offen: CR11-30 bis CR11-32, CR10-15 bis CR10-18, CR09-5 bis
  CR09-13, CR09-15 bis CR09-20, CR08-17, CR08-21 bis CR08-23, CR07-4,
  CR07-7 bis CR07-15, CR06-20, CR06-23.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache: Ein Nutzer oeffnet einen
Monte-Carlo-Export, den er vor der Umstellung gespeichert hat. Die Datei
weist sich als `MonteCarloRunRequestV1` aus, wird aber mit einer generischen
Vertragsmeldung ueber ein fehlendes `stress.provenance` abgewiesen. Weil die
Versionskennung ausdruecklich sagt, es habe sich nichts geaendert, sucht
niemand die Ursache in einer Vertragsverschaerfung, und der Export gilt als
beschaedigt.

## Review-Ergebnis (Claude, Runde 2)

- **Status:** blockiert
- **Blocker:**
  - CR12-8: `MonteCarloRunRequestV1` verlangt neu zwingend
    `stress.provenance`, `stress.provenance.evidenceKind`,
    `stress.provenance.claimScope` und `stress.pool`, behaelt aber die
    unveraenderte Versionskennung. Zuvor exportierte Dokumente werden vom
    Wiedereinlesepfad abgewiesen. Entweder wird die Version angehoben oder
    die neuen Felder werden beim Lesen als optional behandelt.
- **Restrisiken:** CR12-9 (acht Codes ohne deutsche Meldung), CR12-10
  (nutzersichtbare Meldungen ohne Umlaute), CR12-11 (Auto-Optimizer umgeht
  die Zuordnung), CR12-12 (Mindestdiversitaet nur im Preflight,
  Reihenfolgetest als Quelltextscan), CR12-13 (Dokumentwiderspruch zu Scope
  und Assertionszahl) sowie unveraendert CR11-30 bis CR11-32, CR10-15 bis
  CR10-18, CR09-5 bis CR09-13, CR09-15 bis CR09-20, CR08-17, CR08-21 bis
  CR08-23, CR07-4, CR07-7 bis CR07-15, CR06-20, CR06-23.
- **Pre-Mortem:** siehe oben - ein vor der Umstellung gespeicherter
  Monte-Carlo-Export laesst sich unter unveraenderter Versionskennung nicht
  mehr einlesen.

Alle sieben Findings der Runde 1 sind substanziell geschlossen, die beiden
Blocker jeweils mit einem eigenen Mutationszeugen. Die verbliebene Blockade
betrifft eine einzelne, eng umrissene Vertragsversionierung. Commit, Push und
Freigabe bleiben Nutzerentscheidung.

## Nachbesserungs-Preflight nach Claude-Review Runde 2

- **Branch/Basis:** `codex/suite-datenintegritaet-hardening`, weiterhin
  uncommitteter Slice-12-Arbeitsbaum auf `6ecb249`.
- **Findings:** CR12-8 bis CR12-13 werden angenommen. Die neuen
  Stressmetadaten bleiben fuer neu geschriebene V1-Requests vorhanden, sind
  beim Lesen historischer V1-Requests aber optional. Das ist eine
  rueckwaertskompatible V1-Erweiterung, keine neue Version.
- **Scope:** Die neun bereits geaenderten produktiven Dateien bleiben im
  Scope. Fuer CR12-11 kommt ausschliesslich `app/simulator/auto_optimize_ui.js`
  hinzu. Damit liegt der Slice bei exakt zehn produktiven Dateien und erreicht,
  aber ueberschreitet nicht die Stop-Grenze.
- **Diff-Risiko:** keine Engine- oder Finanzsemantik. Geaendert werden
  Lesekompatibilitaet, Fehlerdarstellung, Runtime-Tiefenverteidigung und Tests.
  Die Mindestdiversitaet wird im Jahrespfad nochmals erzwungen; gueltige
  produktive Pfade wurden bereits im Preflight akzeptiert und bleiben daher
  numerisch unveraendert.
- **Stop-Regeln:** Bei Bedarf an einer elften produktiven Datei, einer
  unerwarteten Snapshot-/Backtestabweichung oder nicht ausfuehrbarer
  Pflichtvalidierung wird gestoppt.

## Nachbesserungsergebnis nach Claude-Review Runde 2

- **CR12-8:** `stress.provenance` und `stress.pool` sind additive V1-Felder.
  Neue Writer liefern sie weiterhin; der Validator prueft sie strikt, wenn sie
  vorhanden sind, akzeptiert aber historische V1-Requests ohne diese Felder.
  Ein vollstaendiger alter V1-Export wird im Test neu fingerprinted und ueber
  `readMonteCarloExportV1()` erfolgreich eingelesen.
- **CR12-9/CR12-10:** Ein eingefrorener zentraler Meldungskatalog deckt alle
  13 Stress-/Regimecodes ab. Tests verhindern Rohcode-/Englisch-Leaks und die
  beanstandeten ASCII-Umlautumschreibungen.
- **CR12-11:** Der Auto-Optimizer verwendet fuer Alert und Statuszeile
  `formatSimulatorValidationError()` und zeigt denselben deutschen
  Handlungshinweis wie Monte Carlo, Sweep und Backtest.
- **CR12-12:** Sowohl `buildStressContext()` als auch
  `sampleNextYearData()` erzwingen die Mindestdiversitaet unabhaengig vom
  Vertragspreflight. Der Quelltext-Substringscan wurde entfernt und durch
  Funktionsproben fuer einen einjaehrigen Rohpool und eine einjaehrige
  Laufzeit-Schnittmenge ersetzt.
- **CR12-13:** Der kanonische Testergebnisabschnitt und der Masterplan nennen
  nun zehn produktive Dateien und die aktuellen Abschlusszahlen.
- **Validierung:** Regime-/Stress 65/65, Samplingvertrag 70/70,
  Exportvertrag 118/118, Auto-Optimizer 102/102; `npm test`
  18.135/18.135; Coverage 78,66 Prozent (40.141/51.031), Pflichtgates gruen;
  28/28 Browser-Smokes und `docs:evidence` gruen; `git diff --check` gruen.
- **Freigabe:** technisch umgesetzt und selbstgeprueft, aber nicht durch
  Codex freigegeben. Erneutes externes Review bleibt erforderlich.

## Drittreview von Claude (Runde 3)

### Pruefgegenstand und Verifikationsbasis

Nachbesserungsstand der Runde 2 im unversionierten Arbeitsbaum auf Basiscommit
`6ecb249`. Der produktive Scope ist um `auto_optimize_ui.js` auf **zehn**
Dateien gewachsen und liegt damit auf der Stop-Grenze. `engine/`, `engine.js`,
`dist/` und `RuheStandSuite.exe` sind unberuehrt.

Selbst gemessen:

- `npm test`: **18.135/18.135** Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles.
- `npm run test:coverage`: **78,66 Prozent** (40.141/51.031), beide
  Pflichtdatei-Gates bestanden.
- `npm run test:browser`: **28** bestandene Szenarien.
- `npm run docs:evidence`: bestanden.
- `git diff --check`: gruen.
- Fokussiert: Regime-/Stressvertrag **65/65**, Exportvertrag **118/118**,
  Auto-Optimizer **102/102**.

Alle Angaben sind deckungsgleich mit dem Nachbesserungsergebnis.

### Verifikation der Findings aus Runde 2

- **CR12-8 geschlossen.** `stress.provenance` und `stress.pool` werden nur
  noch geprueft, wenn sie vorhanden sind; neue Writer liefern sie weiterhin.
  Der Exportvertragstest baut ein Dokument ohne beide Felder und liest es ueber
  `readMonteCarloExportV1()` erfolgreich ein. Gegenprobe O belegt die
  Absicherung: nach Wiedereinbau der unbedingten Pflichtpruefung scheitert die
  Exportvertragstestdatei (`Failed Files: 1`).
- **CR12-9 weitgehend geschlossen.** Der eingefrorene Katalog
  `SIMULATOR_CONTRACT_ERROR_MESSAGES_DE` deckt dreizehn Codes ab, darunter das
  ueber ein gespeichertes Profil erreichbare
  `SIMULATOR_STRESS_PRESET_UNKNOWN`. Ein von Slice 12 eingefuehrter Code fehlt
  weiterhin (**CR12-14**).
- **CR12-10 geschlossen.** Alle Meldungen tragen korrekte Umlaute; ein Test
  prueft je Code sowohl auf Rohcodeleaks als auch auf
  ASCII-Umschreibungsmuster.
- **CR12-11 geschlossen.** Der Auto-Optimizer nutzt fuer Alert und Statuszeile
  `formatSimulatorValidationError()` und beschriftet beides deutsch. Siehe aber
  CR12-16 zur Verankerung.
- **CR12-12 geschlossen.** `buildStressContext()` weist einen degenerierten
  Rohpool ab, und `sampleNextYearData()` erzwingt die Mindestdiversitaet
  unabhaengig vom Vertragspreflight. Gegenprobe Q belegt die Absicherung:
  ohne die Laufzeitpruefung meldet der Vertragstest
  `FAIL: Runtime stress sampling independently rejects a one-year effective
  pool`.
- **CR12-13 geschlossen.** "Testergebnisse" und Masterplan nennen jetzt zehn
  produktive Dateien, sechs Testdateien und 18.135 Assertions.

### Dimension 1 - Korrektheit

Ich habe geprueft, ob die neue Laufzeitpruefung Konfigurationen abbricht, die
der Preflight zuvor akzeptiert hat. Ueber sechs Samplingmodi (UNIFORM, UNIFORM
mit 1950-Schalter, FILTER 1970/1990/2005, RECENCY), alle fuenf historischen
Presets und zwei Methoden, je 300 Ziehungen:

```text
N2 Divergenzen Preflight vs. Laufzeit: 0
```

Preflight und Jahrespfad stimmen ueberein; die Tiefenverteidigung ist
ergebnisneutral.

Die Schwelle `Math.min(3, preset.years)` laesst `STAGFLATION_70s` mit genau
drei Kandidatenjahren exakt passieren. Das bleibt eine knappe, aber jetzt an
beiden Stellen konsistent durchgesetzte und im Export ausgewiesene Grenze.

### Dimension 2 - Vertragstreue

Die Ruecknahme der Pflichtfelder ist die richtige Auflegung: `V1` bleibt `V1`,
alte Dokumente bleiben lesbar, neue Dokumente tragen die Metadaten. Ich habe
keine weitere stille Vertragsverschaerfung gefunden.

Der Vollstaendigkeitstest des Meldungskatalogs vergleicht dessen Schluessel
gegen eine im Test handgeschriebene Liste. Diese Liste ist selbst
unvollstaendig: `SIMULATOR_HISTORICAL_DATA_UNAVAILABLE` wird von Slice 12 an
zwei Stellen geworfen - in `prepareHistoricalData()` und im Jahrespfad -,
steht aber weder im Katalog noch in der Erwartungsliste. Gemessen:

```text
N1 ohne deutsche Meldung: [..., "SIMULATOR_HISTORICAL_DATA_UNAVAILABLE"]
   -> SIMULATOR_HISTORICAL_DATA_UNAVAILABLE: Cannot sample a market year
      without canonical historical data.
```

Der Test kann diese Luecke konstruktionsbedingt nicht finden, weil er den
Katalog gegen eine Liste prueft, die dieselbe Auslassung teilt - dasselbe
Muster wie CR11-29 (**CR12-14**). Die uebrigen in der Messung genannten
`MC_SAMPLING_*`-Codes stammen aus frueheren Slices und sind nicht Gegenstand
dieses Befunds.

### Dimension 3 - Fehlerbehandlung

Die Fehlerdarstellung ist jetzt ueber Monte Carlo, Sweep, Backtest und
Auto-Optimizer einheitlich. Der einzige verbliebene Rohtextpfad ist der oben
genannte Code.

### Dimension 4 - Seiteneffekte

Zwei Verankerungen sind bei der Nachbesserung verloren gegangen.

Der Quelltextscan, der die Reihenfolge "Preflight vor `ui.showProgress()`"
gesichert hat, wurde entfernt und nicht ersetzt. Die Reihenfolge stimmt im
Quelltext weiterhin, ist aber durch keinen Test mehr gebunden:

```text
N3 Preflight vor showProgress im Quelltext: true
N3 Reihenfolge noch testseitig verankert: false
```

Meine Runde-2-Feststellung galt der Fragilitaet des Scans, nicht seiner
Existenz; ersatzlos entfallen ist er die einzige Absicherung dafuer, dass die
Ablehnung vor Fortschrittsanzeige und Workerdispatch liegt - also fuer genau
die Eigenschaft, die CR12-1 geschlossen hat (**CR12-15**).

Der Auto-Optimizer-Test prueft die neu eingefuehrte Hilfsfunktion
`formatAutoOptimizeError`, nicht den `catch`-Block, der sie verwendet.
Gegenprobe R hat den Fehlerpfad auf `e.message` zurueckgedreht:

```text
tests/auto-optimizer.test.mjs: 102/102, Failed Assertions: 0
```

Kein Test der Suite verweist auf `handleRunAutoOptimize` oder den deutschen
Alerttext. Der Rueckbau von CR12-11 passiert die gesamte Suite gruen
(**CR12-16**).

### Dimension 5 - Was koennte brechen

Funktional habe ich keinen Pfad gefunden, der bricht. Das verbliebene Risiko
ist Erosion: drei der in dieser Runde geschlossenen Eigenschaften - deutsche
Meldung fuer jeden geworfenen Code, Preflight vor Dispatch, deutsche
Fehleranzeige im Auto-Optimizer - sind entweder gar nicht oder nur mittelbar
gebunden und koennen bei einem spaeteren Umbau unbemerkt zurueckfallen.

### Gegenproben

Drei Dateien wurden temporaer mutiert und gegen SHA-256-Manifeste
byteidentisch zurueckgesetzt:

```text
app/simulator/monte-carlo-contracts.js    ae92b733fa4d8869...  OK
app/simulator/simulator-engine-helpers.js 776845afca5e47e7...  OK
app/simulator/auto_optimize_ui.js         (Manifest safe5)     OK
```

- **Gegenprobe O** (Pflichtfelder wieder unbedingt): Exportvertragstestdatei
  scheitert.
- **Gegenprobe Q** (Laufzeit-Mindestdiversitaet entfernt): `FAIL: Runtime
  stress sampling independently rejects a one-year effective pool`.
- **Gegenprobe R** (Auto-Optimizer-Fehlerpfad auf Rohtext): **nicht erkannt**,
  102/102 gruen - Beleg fuer CR12-16.
- Nach allen Wiederherstellungen: Regime-/Stress 65/65, Exportvertrag 118/118,
  Auto-Optimizer 102/102.

### Findings-Lifecycle

- Geschlossen: CR12-8 bis CR12-13, einzeln verifiziert; CR12-8 und CR12-12
  zusaetzlich per Mutationszeuge.
- Weiterhin geschlossen: CR12-1 bis CR12-7, CR11-29, S01-1, P-06 sowie
  CR11-1 bis CR11-28.
- Neue Auflagen vor Slice 13: CR12-14, CR12-15, CR12-16.
- Unveraendert offen: CR11-30 bis CR11-32, CR10-15 bis CR10-18, CR09-5 bis
  CR09-13, CR09-15 bis CR09-20, CR08-17, CR08-21 bis CR08-23, CR07-4,
  CR07-7 bis CR07-15, CR06-20, CR06-23.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache: Ein spaeterer Umbau der
Monte-Carlo-Startsequenz verschiebt den Samplingpreflight hinter den
Workerdispatch, weil er dort naeher an der Ausfuehrung steht. Alle Gates
bleiben gruen, weil die Reihenfolge nirgends mehr gebunden ist. Die
Ablehnung einer historischen Stresskombination erscheint dann wieder erst
nach einem vollstaendig gelaufenen Worker- und Seriellversuch - der Zustand,
den CR12-1 beseitigt hat, ohne dass ein Test widerspricht.

## Review-Ergebnis (Claude, Runde 3)

- **Status:** freigegeben
- **Blocker:** keine
- **Auflagen vor Slice 13:**
  - CR12-14: `SIMULATOR_HISTORICAL_DATA_UNAVAILABLE` in den Meldungskatalog
    aufnehmen und die Erwartungsliste des Vollstaendigkeitstests aus den
    tatsaechlich geworfenen Codes ableiten statt sie handzuschreiben.
  - CR12-15: die Reihenfolge "Preflight vor Fortschrittsanzeige und
    Workerdispatch" wieder testseitig binden, vorzugsweise funktional statt
    ueber einen Quelltextscan.
  - CR12-16: den Auto-Optimizer-Fehlerpfad selbst pruefen, nicht die
    Hilfsfunktion; Gegenprobe R passiert derzeit gruen.
- **Restrisiken:** unveraendert CR11-30 bis CR11-32, CR10-15 bis CR10-18,
  CR09-5 bis CR09-13, CR09-15 bis CR09-20, CR08-17, CR08-21 bis CR08-23,
  CR07-4, CR07-7 bis CR07-15, CR06-20, CR06-23.
- **Pre-Mortem:** siehe oben - eine spaetere, von keinem Gate erkannte
  Verschiebung des Samplingpreflights hinter den Workerdispatch.

Alle sechzehn Findings aus drei Runden sind sachlich adressiert; die beiden
Blocker der Runden 1 und 2 sind jeweils mit einem eigenen Mutationszeugen
geschlossen. Die Freigabe betrifft den technischen Stand. Commit, Push und
Programmfreigabe bleiben Nutzerentscheidung.
