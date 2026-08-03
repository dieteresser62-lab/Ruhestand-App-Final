# Slice 11 - Exportgrenzen, Horizont und Engine-Provenienz

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Ausnahme:** Nutzerentscheidung vom 2026-07-29 fuer Slice 02 bis 13;
kein neuer Feature-Branch  
**GitHub-Status:** Remote `origin` ist vorhanden; der aktive Branch besitzt
keinen Upstream und bleibt bis zu einer ausdruecklichen Nutzerfreigabe lokal  
**Basiscommit:** `05ff8c3896b1c86137b57a1610d90c7c6aedfa76`  
**Status:** Claude-Review Runde 3 blockiert; CR11-1 bis CR11-28 technisch
nachgebessert und selbstgeprueft; externes Re-Review ausstehend  
**Abhaengigkeiten:** Slices 01, 08, 09 und das vollstaendige freigegebene
Ergebnisdokument von Slice 10

## Input aus dem Ergebnisdokument von Slice 10

Slice 10 ist in Claude-Review Runde 2 freigegeben und als Basiscommit
`05ff8c3` vorhanden. CR10-1 bis CR10-12 sind geschlossen. Vor Slice 11 sind
zwei ausdrueckliche Auflagen zu erfuellen:

- **CR10-13:** Die gemessene Steuerwirkung muss mit Richtung,
  Groessenordnung und Ursache in Prosa im Ergebnisdokument stehen, nicht nur
  in der Messfixture. In elf gemessenen Faellen sinkt das Endvermoegen; der
  groesste Effekt betraegt -8.395.042,76 EUR bei +569.838,01 EUR Steuer.
- **CR10-14:** Der zwoelfte Charakterisierungsfall
  `minimum_flex_d17_2000_2010` muss mit seiner Finanzwirkung in das
  Slice-09-zu-10-Delta-Ledger aufgenommen werden.

CR10-15 bis CR10-18 bleiben als Restrisiken sichtbar. Sie werden nicht still
als Teil dieses Export-Slice behandelt. Insbesondere werden weder die
Legacy-Steuermigration noch die aggregierte Steuerplanung oder Engine-Semantik
veraendert.

## Preflight vor Coding

- `git branch --show-current`: `codex/suite-datenintegritaet-hardening`.
- `git status --short`: leer; der Arbeitsbaum war vor Anlage dieser Slice-MD
  sauber.
- `git rev-parse HEAD`: `05ff8c3896b1c86137b57a1610d90c7c6aedfa76`.
- Slice-10-Abnahme: Claude Runde 2 `freigegeben`, lokaler Commit vorhanden.
- Generierte Artefakte `engine.js`, `dist/` und `RuheStandSuite.exe` sind kein
  Bearbeitungsziel.
- Unveraenderte Eingangsbaseline aus dem bestaetigten Slice-10-Ergebnis:
  `npm test` mit 17.930/17.930 Assertions und 0 offenen Handles;
  `npm run test:browser` mit 28/28 Szenarien; Coverage 78,40 Prozent
  (39.539/50.430).

## Ziel und zu schliessende Befunde

Der historische Raw-Export beschreibt Zeitraum, Wiederverwendungsgrenze,
Metrikbasis, Quantisierung, Quellstand und Datenstand eindeutig. Slice 11
schliesst:

- **D-09:** `flex_reduction_max_pct` bleibt ausdruecklich auf die kanonische,
  konsistente Haushalts-Flexbasis bezogen und wird im Export nicht als
  Personen- oder statische Inputquote missverstanden;
- **D-12:** die verbleibenden Namens- und Redundanzfallen von
  `zielLiquiditaet`, `capeRatio`, `startVermoegen`, `geldmarktEtf` und dem
  abgeleiteten `depotwertNeu` erhalten einen maschinenlesbaren Semantikvertrag;
- **D-13:** aktive Anti-Pseudo-Accuracy- und Quantisierungsregeln werden mit
  Stufen, Rundungsmodus und Floor-Schutz im Export offengelegt;
- **D-16:** interne Start-/End-Portfolioobjekte werden nicht mehr als
  vermeintlich restartfaehige Raw-Snapshots exportiert;
- **D-19:** Engine-Build, sauberer Source-Commit, Konfigurationsfingerprint und
  Datenrevision werden gemeinsam fingerprintwirksam gebunden;
- **CR10-13 und CR10-14** als Eingangsgates aus dem Slice-10-Ergebnis.

## Exportvertrag

1. Der Raw-JSON-Vertrag wird auf `HistoricalBacktestExportV2` versioniert.
2. `period` nennt Start, Ende, inklusive Jahreszahl, wirtschaftlich
   ausgewertete Jahre und Vollstaendigkeitsstatus. 2000 bis 2025 sind damit
   explizit 26 Jahre und keine abgebrochene 30-Jahres-Projektion.
3. `portfolioSnapshots` wird an der Exportgrenze durch rein aggregierte
   `portfolioBoundaries` ersetzt. Diese enthalten nur kanonische Summen und
   sind ausdruecklich `restartable: false`; interne Detailfelder werden nicht
   exportiert.
4. `inputSemantics` trennt historische Signale, Startbestandteile,
   abgeleitete Aggregate und Strategieparameter. Bestehende Runtime-Feldnamen
   werden in diesem Slice nicht umbenannt.
5. `quantizationContract` spiegelt die tatsaechlich geladene
   Engine-Konfiguration, nicht eine handgepflegte Exportkopie.
6. Ein Raw-Export ohne gueltigen 40-stelligen Source-Commit oder aus einem als
   dirty markierten Quellbaum scheitert fail-closed. Der lokale Browser-Server
   liefert diese Provenienz dynamisch; `sync-dist` erzeugt sie fuer das
   Desktop-Artefakt.
7. Source-Commit, Engine-Build, Konfigurationsfingerprint, Datenrevision,
   Request und Resultat liegen innerhalb der kanonischen Fingerprintbasis.

## Akzeptanzkriterien

1. Ein Lauf 2000 bis 2025 exportiert `startYear: 2000`, `endYear: 2025`,
   `inclusiveYears: 26` und keine 30-Jahres-Behauptung.
2. Unvollstaendige, technische und Ruinpfade unterscheiden angeforderte,
   abgeschlossene und exportierte Jahreszeilen ohne Mehrdeutigkeit.
3. Der Raw-Export enthaelt kein internes End-Portfolioobjekt und keine
   Detailtranche, die als kanonischer Neustartbestand gelesen werden koennte.
4. Start- und Endsumme der Exportgrenzen reconciliieren mit den kanonischen
   Metriken; widerspruechliche Summen stoppen den Export.
5. Engine-Build, Source-Commit, Quellbaumstatus,
   Konfigurationsfingerprint, Datenrevision und Datenhash sind vorhanden und
   fingerprintwirksam.
6. Ein fehlender, ungueltiger oder dirty Source-Commit blockiert den
   Raw-JSON-Export mit stabilem Fehlercode.
7. Quantisierungsstatus, Monatsstufen, Floor-Rundungsmodus und
   Floor-Schutzregel sind maschinenlesbar und entsprechen der Engine-
   Konfiguration.
8. `flex_reduction_max_pct` weist die kanonische Haushaltsbasis und
   Missingness bei fehlender oder gemischter Basis explizit aus.
9. CR10-13 steht als verstaendliche Ergebniswirkung in der Slice-10-MD;
   CR10-14 inventarisiert alle zwoelf Faelle im Delta-Ledger.
10. Request- und Result-Fingerprint bleiben bei reinem Exportzeitpunkt oder
    UI-Detailwechsel stabil, reagieren aber auf Source-Commit, Datenrevision,
    Quantisierung und kanonische Endsumme.

## Programmdatei-Scope

Der produktive Scope umfasst nach beiden Review-Nachbesserungen exakt zehn
Dateien. Der bestehende `HistoricalBacktestMetricsV2`-Vertrag weist
Haushaltsbasis und Missingness bereits kanonisch aus; Slice 11 veraendert seine
Metrikformeln nicht. Der Engine-Scope bindet und sichert ausschliesslich den
bereits freigegebenen Rundungsmodus ab:

1. `app/simulator/historical-backtest-export.js`;
2. `app/simulator/historical-backtest-runner.js`;
3. `app/shared/runtime-build-provenance.js` (neu);
4. `start_suite.ps1`;
5. `scripts/sync-dist.ps1`;
6. `app/simulator/simulator-backtest.js`;
7. `app/simulator/simulator-main.js`;
8. `app/simulator/simulation-data-inventory.js`;
9. `engine/config.mjs`;
10. `engine/planners/spending-policy-helpers.mjs`.

Testdateien, Fixtures und Dokumentation zaehlen gemaess Projektregel nicht zur
Zehn-Dateien-Grenze.

## Nicht im Scope

- keine Aenderung der Steuer-, Entnahmehoehen-, Runway- oder
  Mindest-Flex-Semantik; der bestehende Quantisierungsmodus wird als
  exportierbarer Vertrag gebunden und bei ungueltiger Live-Konfiguration
  defensiv auf denselben freigegebenen Default zurueckgefuehrt;
- keine Umbenennung bestehender Runtime-Eingabefelder;
- kein restartfaehiger Portfolioimport aus einem historischen Ergebnis;
- keine historischen Steuergesetze oder Korrektur von CR10-15 bis CR10-18;
- keine Aenderung historischer Datenreihen oder ihrer Manifestwerte;
- keine manuelle Aenderung von `engine.js`, `dist/` oder
  `RuheStandSuite.exe`.

## Diff-Risiko vor dem ersten Programmdatei-Edit

```text
Geplante Dateien:
- app/simulator/historical-backtest-export.js
- app/simulator/historical-backtest-runner.js
- app/shared/runtime-build-provenance.js
- app/simulator/simulator-backtest.js
- app/simulator/simulator-main.js
- app/simulator/simulation-data-inventory.js
- engine/config.mjs
- engine/planners/spending-policy-helpers.mjs
- start_suite.ps1
- scripts/sync-dist.ps1
- fokussierte Export-, Runner-, Metrik-, Provenienz-, Browser- und
  Charakterisierungstests/Fixtures
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_11_EXPORT_PROVENIENZ.md
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_10_HEUTIGE_STEUERLOGIK.md
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- betroffene Referenzdokumentation nach finalem Contract

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Raw-JSON-Schema, Golden-Fingerprint und Downloadvertrag
- historische Runner-, Metrik-, Charakterisierungs- und Workerparitaet
- Browser-Backtestexport und lokaler Server
- dist-/Tauri-Sync-Vertrag
- Slice-09-zu-10-Delta-Ledger und Cross-Slice-Orakel

Nicht anfassen:
- historische Datenlogik
- Steuer-, Runway- und Mindest-Flex-Berechnung sowie finanzielle
  Entnahmehoehen ausserhalb des unveraenderten Rundungsvertrags
- engine.js, dist/ und RuheStandSuite.exe

Rollback-Strategie:
- geaenderte versionierte Dateien gezielt mit git checkout -- <datei...>
  auf Basiscommit 05ff8c3 zuruecksetzen
- neue Slice- und Provenienzdatei nur nach ausdruecklicher Freigabe loeschen
- keine Hard-Resets oder sonstigen destruktiven Git-Kommandos
```

## Geplante Tests

- Export-V2-Vertrag fuer 26-Jahres-Horizont, alle Outcomes,
  Portfolio-Grenzen und Eingabesemantik;
- Source-Commit-Validierung fuer clean, dirty, fehlend und ungueltig;
- Quantisierungsprojektion gegen die geladene Engine-Konfiguration;
- Fingerprint-Gegenproben fuer Source-Commit, Datenrevision,
  Quantisierung und Endsumme;
- Runner-Provenienz und Metrikdescriptor fuer Haushalts-Flexbasis;
- CR10-14 mit exakt zwoelf Delta-Ledger-Faellen;
- Browser-Raw-Export mit dynamischer Build-Provenienz;
- `npm test`, `npm run test:coverage`, `npm run test:browser`,
  `npm run docs:evidence` und `git diff --check`.

## Durchgefuehrte Aenderungen

- Slice-MD auf Basis des vollstaendigen freigegebenen
  Slice-10-Ergebnisdokuments angelegt.
- Branch-, Arbeitsbaum-, Ergebnis-, Scope- und Diff-Risiko-Status vor Coding
  dokumentiert.
- CR10-13 im Slice-10-Ergebnis als gerichtete und bezifferte Ergebniswirkung
  ergaenzt. Fuer CR10-14 wurde der fehlende D-17-Fall direkt auf Commit
  `2e4867f` nachgemessen und ein vollstaendiges 12/12-Delta-Ledger angelegt.
- Raw-JSON auf `HistoricalBacktestExportV2` versioniert. Der Vertrag weist die
  inklusive Periode, angeforderte/abgeschlossene/emittierte Jahre,
  Vollstaendigkeit und die Grenze zur 30-Jahres-Projektion explizit aus.
- Interne `portfolioSnapshots` aus dem kanonischen Runnerresultat und damit
  auch aus `window.globalBacktestData` und dem Raw-Export entfernt. An ihre
  Stelle treten reconciliierte, aggregierte, ausdruecklich nicht
  restartfaehige `portfolioBoundaries`.
- Maschinenlesbare Eingabesemantik fuer Legacy-Aliase, historische Signale,
  Startbestandteile und abgeleitete Aggregate sowie die Haushaltsbasis von
  `flex_reduction_max_pct` in den Export aufgenommen.
- Die aktive Anti-Pseudo-Accuracy-Konfiguration einschliesslich Jahres- und
  Monatsstufen, Rundungsphase, Floor-Modus und Floor-Schutz wird direkt aus der
  Engine-Konfiguration erfasst und fingerprintwirksam exportiert.
- `RuntimeBuildProvenanceV1` eingefuehrt. Vor dem Browserlauf wird der relative,
  unterpfadfaehige Same-Origin-Endpunkt `./__build-provenance.json` explizit abgewartet; eine
  globale Injection und ein unbeobachteter Modul-Import-Side-Effect existieren
  nicht. Fehlende oder dirty Provenienz blockiert Raw-JSON mit sichtbaren
  stabilen Fehlercodes, nicht jedoch CSV.
- Die beim Laufstart erfasste Source-Provenienz ist allein autoritativ. Der
  Export liest keine Laufzeitprovenienz und kann weder Commit noch Clean-Status
  ersetzen. `sync-dist` blockiert Aenderungen an versionierten Quellen vor dem
  Kopieren, kopiert nur das gefilterte `git ls-files`-Inventar und revalidiert
  Commit sowie Clean-Status unmittelbar vor dem Schreiben. Unversionierte
  Scratchdateien werden weder kopiert noch als Dirty-Ursache behandelt.
- README, technische Referenzen, Forschungs-/Datenquellengrenzen und
  Testdokumentation auf den V2-Vertrag synchronisiert.

## Ausgefuehrte Tests

- Baseline vor Coding: `npm test` mit 160 Testdateien und 17.930/17.930
  Assertions, 0 fehlgeschlagenen Dateien und 0 offenen Handles.
- `node tests/run-single.mjs tests/historical-backtest-export.test.mjs`:
  85/85 Assertions.
- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`:
  124/124 Assertions.
- `node tests/run-single.mjs tests/runtime-build-provenance.test.mjs`:
  16/16 Assertions.
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`:
  224/224 Assertions und vollstaendiges 12/12-Slice-09-zu-10-Ledger.
- Finaler `npm test`: 161 Testdateien, 17.995/17.995 Assertions,
  0 fehlgeschlagene Dateien und 0 offene Handles.
- `npm run test:coverage`: dieselben 17.995/17.995 Assertions; 78,43 Prozent
  (39.728/50.655), beide obligatorischen Dateigates bestanden.
- `npm run test:browser`: 28/28 Browser-Szenarien bestanden.
- `npm run docs:evidence`: bestanden; 69 MKT-, 55 FOR-Records und 17
  MAP-Anker, keine Netznutzung.
- PowerShell-Parserpruefung fuer `start_suite.ps1` und
  `scripts/sync-dist.ps1`: bestanden.
- `git diff --check`: bestanden.

## Abweichungen vom Plan

- Die bestehende kanonische Metrikberechnung blieb unveraendert; der bereits
  vorhandene `HistoricalBacktestMetricsV2`-Basisvertrag wird mit einem
  positiven Wertzeugen in V2 projiziert.
- Die Rundungssemantik wurde als konsumierter Engine-Vertrag ergaenzt. Deshalb
  aenderte sich erwartungsgemaess nur der Hash von `engine_policy_defaults`;
  Finanzwerte und FlowDelta blieben unveraendert. Der produktive Scope stieg
  damit auf die dokumentierte Obergrenze von zehn Dateien.
- Das Browser-Gate konsumiert denselben festen Provenienz-Endpunkt wie die
  Anwendung. Wegen des nun asynchronen Startvertrags wartet es auf den
  terminalen Status beziehungsweise den fokussierten Validierungsfehler.

## Offene Risiken

- CR10-15 bis CR10-18 und die im Slice-10-Ergebnis uebernommenen aelteren
  Restrisiken bleiben ausserhalb dieses Slice offen.
- Der Source-Commit-Vertrag setzt voraus, dass produktive Exporte ueber den
  lokalen Server oder ein aus nachweislich sauberen Quellen mit `sync-dist`
  erzeugtes Desktop-Artefakt laufen. Parser-, statische Contract- und
  Browserpfade sind getestet; `dist/` wurde gemaess Scope nicht neu generiert
  und ein echter Tauri-Release-Build ist kein Slice-11-Gate.

## Rueckdokumentation in den Hauptplan

Exportversion, technisch geschlossene Befunde, tatsaechlicher Dateiscope,
Tests und Restrisiken sind in `BACKTEST_2000_2025_DATENPRUEFUNG.md`
zurueckdokumentiert.

## Freigabestatus

Nach Claude-Review Runde 1 technisch nachgebessert und selbstgeprueft. Codex
erteilt keine Selbstfreigabe; Re-Review, Freigabe und lokaler Commit bleiben
extern.

## Review-Feedback von Claude

### Pruefgegenstand

Slice 11 auf Basiscommit `05ff8c3`, unversioniert im Arbeitsbaum. Produktiver
Scope wie deklariert exakt fuenf Dateien:
`app/simulator/historical-backtest-export.js`,
`app/simulator/historical-backtest-runner.js`,
`app/shared/runtime-build-provenance.js` (neu), `start_suite.ps1`,
`scripts/sync-dist.ps1`. Der deklarierte Scope ist eingehalten; kein weiteres
Produktivmodul ist beruehrt.

### Verifikationsbasis

Selbst gemessen, nicht aus dem Dokument uebernommen:

- `npm test`: 17.995/17.995 Assertions, 0 fehlgeschlagene Dateien, 0 offene
  Handles, 1 separates Gate. Deckungsgleich mit der Dokumentangabe.
- `npm run test:coverage`: 78,43 Prozent (39.728/50.655), beide obligatorischen
  Dateigates bestanden. Deckungsgleich.
- `npm run test:browser`: 28 bestandene Szenarien, keine Fehlmeldung.
- `npm run docs:evidence`: bestanden; 69 MKT-, 55 FOR-Records, 17 MAP-Anker.
- `git diff --check`: gruen.
- Dateicoverage der neuen Provenienzdatei: 71,43 Prozent (30/42);
  `historical-backtest-export.js` 80,67 Prozent (359/445).

Zusaetzlich gelesen: Diff aller fuenf Produktivdateien, beide neuen Fixtures,
`engine/config.mjs` (`ANTI_PSEUDO_ACCURACY`), `engine/core.mjs` (`getConfig`),
`engine/planners/spending-policy-helpers.mjs` (`calculateFinalWithdrawal`),
`app/simulator/historical-backtest-metrics.js` (`wealth_start/end`,
`flexBasisContract`), `app/simulator/simulator-backtest.js` (einziger Aufrufer
des Exports) und `.gitignore`.

### Dimension 1 - Korrektheit

Der Periodenvertrag, die Ersetzung von `portfolioSnapshots` durch aggregierte
`portfolioBoundaries` und die Projektion der Quantisierungsstufen aus der
geladenen Engine-Konfiguration sind sachlich richtig; `getConfig()` liefert das
reale `CONFIG`-Objekt mit echtem `Infinity`, sodass `captureQuantizationContract`
im Browser nicht ins Leere greift.

Falsch ist die Provenienz-Anreicherung. `enrichRequestProvenance` setzt
`hasCompleteCapturedSource` nur dann auf wahr, wenn Commit **und**
Baumstatus vollstaendig sind. Der Runner schreibt aber
`sourceTreeStatus: 'unavailable'` als Default, sobald das Statusfeld fehlt.
In genau dieser Konstellation - gueltiger 40-stelliger Commit, Status
`unavailable` - ueberschreibt die Exportzeit-Provenienz den beim Lauf
erfassten Commit (**CR11-1**).

Weiter ist die Reconciliation der Exportgrenzen tautologisch:
`deriveHistoricalBacktestMetrics` definiert `endWealth` als
`finiteOrNull(result.portfolioEnd)`, und `reconcileBoundaryTotal` vergleicht
`metrics.values.wealth_end_nominal_eur` gegen genau dieses `result.portfolioEnd`.
Im realen Pfad koennen die beiden Werte nicht auseinanderlaufen; der Test
erzeugt die Abweichung durch Handmutation des Resultats (**CR11-7**).

### Dimension 2 - Vertragstreue

Akzeptanzkriterium 5 verlangt, dass der Quantisierungsvertrag die tatsaechlich
geladene Engine-Konfiguration spiegelt und "nicht eine handgepflegte
Exportkopie" ist. `withdrawalRounding.phase`, `.mode`, `.floorProtection` und
`metricDisplayRounding` sind Stringliterale im Exportmodul. Sie beschreiben
`calculateFinalWithdrawal` derzeit korrekt, sind aber an keiner Stelle an
`engine/planners/spending-policy-helpers.mjs` gebunden (**CR11-6**).

Akzeptanzkriterium 7 verlangt maschinenlesbare Monatsstufen, Rundungsmodus und
Floor-Schutz "entsprechend der Engine-Konfiguration". Das Exportgate prueft
davon nur die Schemaversion als String. Die Runner-Fixture in
`tests/historical-backtest-runner.test.mjs` belegt das selbst: ein
`quantizationContract` aus ausschliesslich `{ schemaVersion, enabled: true }`
- ohne eine einzige Stufe - passiert `validateEngineExportProvenance`
unbeanstandet (**CR11-5**).

Die Dokumentaussage "Eine Exportzeit-Provenienz darf nur einen zuvor nicht
verfuegbaren Wert ergaenzen und nie einen zwischenzeitlich geaenderten Commit
unterschieben" wird vom Code nicht eingehalten (CR11-1); der Export behauptet
im gemessenen Fall zusaetzlich `sourceTreeStatus: 'clean'` fuer einen Lauf,
dessen Baumstatus nie bekannt war.

Akzeptanzkriterium 8 ist im Test nur an der konstanten Interpretationszeile
verankert. Auf `contracts.flexReductionMaximum.basis` existiert keine
Wertassertion; die Fixture traegt kein `flexBasisContract`, der exportierte
Wert ist in jedem Test `null`. Ein falscher Pfad bliebe unbemerkt (**CR11-8**).

### Dimension 3 - Fehlerbehandlung

Die vier neuen Fehlercodes sind sauber typisiert und tragen Details. Sie
erreichen jedoch niemanden. Einziger Aufrufer ist `exportBacktestLogData`
(`app/simulator/simulator-backtest.js:317`); dort wird der Fehler mit
`void error` verworfen und durch eine generische Meldung ersetzt, die zum
erneuten Ausfuehren des Backtests raet. Genau das hilft bei fehlender oder
dirty Provenienz nie, weil der Zustand deterministisch ist. Akzeptanzkriterium
6 ("blockiert mit stabilem Fehlercode") ist am Modulrand erfuellt und eine
Ebene darueber wieder aufgehoben (**CR11-2**).

Verschaerfend: `createHistoricalBacktestDownload` baut das Raw-Dokument
unabhaengig vom Format. Damit scheitert auch der **CSV**-Export an der
Provenienzpruefung, obwohl das CSV keinerlei Provenienz enthaelt. Und der
Normalzustand eines Arbeitsbaums ist `dirty` - im aktuellen Repository melden
24 Eintraege genau das. Slice 11 schaltet beide Exportknoepfe im Regelfall ab,
ohne dem Nutzer die Ursache zu nennen. `simulator-backtest.js` liegt ausserhalb
des deklarierten Fuenf-Dateien-Scopes und wurde nicht angepasst.

`loadRuntimeBuildProvenance` wird beim Modulladen als Seiteneffekt gestartet und
nirgends abgewartet. Ein Export vor Aufloesung des Fetch scheitert mit
`HISTORICAL_EXPORT_SOURCE_COMMIT_REQUIRED`, obwohl die Provenienz Sekunden
spaeter vorliegt (**CR11-13**).

### Dimension 4 - Seiteneffekte

`sync-dist.ps1` schreibt `sourceTreeStatus: 'dirty'` ohne Warnung und ohne
Abbruch; die Pfadpruefung verifiziert nur die Existenz der Datei. Ein
Desktop-Artefakt aus einem dirty Baum wird also ausgeliefert, der Raw-Export
darin ist dauerhaft blockiert, und der Build gibt dazu kein Signal
(**CR11-9**). `dist/` ist gitignoriert, das Neugenerieren dirtyt den Baum
selbst also nicht - die Ursache ist allein der Zustand der Quellen zum
Buildzeitpunkt.

`globalThis.__RUHESTANDSAPP_BUILD_PROVENANCE__` hat Vorrang vor dem geladenen
Dokument, ist nicht auf Testkontexte beschraenkt und wird von beiden
Browser-Gates gesetzt. Die fail-closed-Garantie ist damit nur so belastbar wie
eine beschreibbare globale Variable (**CR11-10**).

`portfolioSnapshots` bleibt auf dem kanonischen Resultat und in
`window.globalBacktestData` bestehen; D-16 ist ausschliesslich an der
Exportgrenze geschlossen (**CR11-15**).

### Dimension 5 - Was koennte brechen

Der goldene Fingerprint `d9037523d64dbb431c17b7cd230e8df6ddf941be...` wurde
geloescht und durch `/^[a-f0-9]{64}$/` ersetzt - eine Formpruefung, die jeder
beliebige SHA-256-Wert besteht. Das ist dasselbe Muster, das in Slice 10 Runde 1
als CR10-1 blockiert hat, und es ist weder in "Durchgefuehrte Aenderungen" noch
in "Abweichungen vom Plan" erwaehnt (**CR11-3**).

Der gesamte D-19-Mechanismus ist nirgends durchgaengig geprueft.
`loadRuntimeBuildProvenance` wird von keinem Test ausgefuehrt;
`tests/runtime-build-provenance.test.mjs` prueft die beiden PowerShell-Skripte
ausschliesslich per Substring; und beide Browser-Gates wurden so geaendert, dass
sie die injizierte globale Variable mit hartcodiertem `clean` verwenden und den
Endpunkt gar nicht erst anfassen (**CR11-4**). Die Notiz unter "Abweichungen vom
Plan" beschreibt diesen Schritt als Loesung eines 404 - tatsaechlich hat sie das
einzige verbliebene Beweismittel fuer den Endpunktvertrag entfernt.

Die CR10-14-Evidenz ist nicht reproduzierbar: die Fixture nennt
`PRINT_D17_SOURCE=1 node tests/run-single.mjs ...` als Messkommando, doch
`PRINT_D17_SOURCE` existiert nirgends im Repository. Der Test pinnt den
SHA-256 der Fixture, nicht die Herkunft ihrer Zahlen (**CR11-11**).

CR10-14 wurde ausserdem nicht korrigiert, sondern dupliziert: das alte
`slice09To10DeltaLedger` in der Slice-10-Messfixture traegt weiterhin
`sourceCaseCount: 12` neben elf Faellen - exakt die beanstandete Konstellation.
Zwei Ledger mit verschiedenen Schemaversionen und Fallzahlen koexistieren jetzt
(**CR11-12**).

### Gegenproben

Alle drei Proben wurden gegen ein SHA-256-Manifest byteidentisch
zurueckgesetzt (`app/shared/runtime-build-provenance.js`
`c991631a81d0f79e...`, `app/simulator/historical-backtest-export.js`
`82fc00094777d695...`, beide nach Wiederherstellung `OK`).

**Gegenprobe A - Endpunktvertrag.** Die abgerufene Ressource in
`runtime-build-provenance.js` wurde auf `__build-provenance-PROBE-A.json`
umbenannt, also die Uebereinstimmung zwischen Clientpfad und Serverroute
gebrochen. Ergebnis: `tests/runtime-build-provenance.test.mjs` 16/16 gruen,
`tests/historical-backtest-export.test.mjs` 85/85 gruen,
`npm run test:browser` 28 bestandene Szenarien ohne einen einzigen Fehler. Der
Endpunktvertrag ist vollstaendig ungepinnt (Beleg fuer CR11-4).

**Gegenprobe B - Quantisierungssemantik.** Das exportierte
`withdrawalRounding.mode` wurde von `floor_monthly_then_multiply_by_12` auf
`ceil_monthly_then_multiply_by_12` gesetzt, also eine sachlich falsche Aussage
in den Exportvertrag geschrieben. Ergebnis: Export 85/85 und
Charakterisierung 224/224 gruen. Der geloeschte goldene Fingerprint haette die
Aenderung des Exportdokuments erfasst (Beleg fuer CR11-3 und CR11-6).

**Gegenprobe C - Provenienzueberschreibung.** Read-only-Skript gegen das
unveraenderte Exportmodul, Lauf mit `sourceCommit: 'aaaa...'` (40 Stellen) und
`sourceTreeStatus: 'unavailable'`, Exportzeit-Provenienz
`sourceCommit: 'eeee...'`, `sourceTreeStatus: 'clean'`:

```text
erfasster Commit   : aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
exportierter Commit: eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
Provider           : probe_c_export_time
ueberschrieben     : true
```

Der Export bindet damit einen Commit in den Fingerprint, der den Lauf nicht
erzeugt haben muss, und deklariert den Baum zusaetzlich als `clean`
(Beleg fuer CR11-1).

### Findings-Lifecycle

- Eingangsgates aus Slice 10: **CR10-13 geschlossen** - der Abschnitt
  "Gemessene Ergebniswirkung der Steuerkorrektur" nennt Richtung, Spannweite
  (-680,93 EUR bis -8.395.042,76 EUR Endvermoegen, +764,87 EUR bis
  +569.838,01 EUR Steuer) und Ursache in Prosa. **CR10-14 substanziell
  geschlossen** - das neue Ledger deckt zwoelf von zwoelf Faellen ab, der
  D-17-Fall mit -8.840,82 EUR Endvermoegen und +7.886,87 EUR Steuer; formal
  offen bleiben CR11-11 und CR11-12.
- CR10-15 bis CR10-18 bleiben unveraendert offen und wurden von Slice 11
  korrekt nicht angefasst.
- Neu eingefuehrte Blocker: CR11-1, CR11-2, CR11-3, CR11-4.
- Neu eingefuehrte Restrisiken: CR11-5 bis CR11-15.
- Keine bestehende Freigabe wird durch dieses Review zurueckgenommen.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache: Der Nutzer klickt im
Simulator auf Backtest-Export und erhaelt "Der kanonische Raw-Export konnte
technisch nicht erstellt werden. Fuehren Sie den Backtest erneut aus." Er
fuehrt den Backtest erneut aus, mehrfach, auch mit anderen Zeitraeumen, auch
im CSV-Format - immer dieselbe Meldung. Die tatsaechliche Ursache ist ein
einziges Zeichen in einer JSON-Datei neben der Anwendung: `dirty` statt
`clean`. Weder die Oberflaeche noch ein Log nennt den Fehlercode, der genau
das saeuberlich beschreiben wuerde, und niemand vermutet den Grund fuer einen
fehlgeschlagenen Zahlenexport im Git-Status des Buildbaums.

## Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:**
  - CR11-1: Die Exportzeit-Provenienz ueberschreibt einen beim Lauf erfassten
    Commit, sobald der Baumstatus `unavailable` ist - dem Default des Runners;
    der Fingerprint bindet dann einen fremden Commit und behauptet `clean`.
  - CR11-2: Die vier neuen Fehlercodes erreichen den Nutzer nicht; der einzige
    Aufrufer verwirft sie und raet zu einer wirkungslosen Wiederholung. Der
    CSV-Export faellt mit aus, und der Normalzustand `dirty` schaltet beide
    Exporte ab.
  - CR11-3: Der goldene Exportfingerprint wurde ersatzlos durch eine
    Formpruefung ersetzt - dasselbe Muster wie CR10-1 - und die Loeschung ist
    nirgends dokumentiert.
  - CR11-4: Der D-19-Mechanismus hat keine durchgaengige Pruefung; der
    Endpunktvertrag ist per Gegenprobe A nachweislich ungepinnt, weil beide
    Browser-Gates ihn per injizierter globaler Variable umgehen.
- **Restrisiken:** CR11-5 bis CR11-15 sowie unveraendert CR10-15 bis CR10-18,
  CR09-5 bis CR09-13, CR09-15 bis CR09-20, CR08-17, CR08-21 bis CR08-23,
  CR07-4, CR07-7 bis CR07-15, CR06-20, CR06-23.
- **Pre-Mortem:** siehe oben - ein dauerhaft blockierter Export, dessen
  eigentliche Ursache (`sourceTreeStatus: 'dirty'`) durch eine generische
  Fehlermeldung verdeckt bleibt und dessen Bedienhinweis in die Irre fuehrt.

Alle Messungen erfolgten auf dem unveraenderten Arbeitsbaum; die drei
Gegenproben sind byteidentisch zurueckgesetzt. Commit, Push und Freigabe
bleiben Nutzerentscheidung.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| CR11-1 | Claude-Review (Runde 1) | `enrichRequestProvenance` ueberschreibt einen beim Lauf erfassten 40-stelligen Commit, sobald `sourceTreeStatus` den Runner-Default `unavailable` traegt, und deklariert den Baum danach als `clean` | angenommen | Exportzeit-Anreicherung entfernt; der Lauf-Commit bleibt unveraendert und `unavailable` blockiert Raw-JSON |
| CR11-2 | Claude-Review (Runde 1) | Die vier neuen Exportfehlercodes erreichen den Nutzer nicht; `exportBacktestLogData` verwirft sie und raet zur wirkungslosen Wiederholung, der CSV-Export scheitert mit, und der Normalzustand `dirty` blockiert beide Exporte dauerhaft | angenommen | stabile Codes und konkrete Handlungsoptionen werden sichtbar projiziert; CSV hat einen unabhaengigen Pfad und Fingerprint |
| CR11-3 | Claude-Review (Runde 1) | Der goldene Exportfingerprint wurde durch eine Formpruefung `/^[a-f0-9]{64}$/` ersetzt; die Loeschung des Ankers ist nirgends dokumentiert und wiederholt das Muster von CR10-1 | angenommen | V2-Golden `818de6432e945e47100f4b6895905fe6f974b91bd8f66500125e0c97cb696acd` exakt gepinnt |
| CR11-4 | Claude-Review (Runde 1) | Der D-19-Mechanismus ist nirgends durchgaengig geprueft; Gegenprobe A bricht den Endpunktvertrag ohne einen einzigen Testfehler, weil beide Browser-Gates ihn per injizierter globaler Variable umgehen | angenommen | Browser-Server liefert den festen Endpunkt; E2E-Export assertiert Commit/Provider aus dem Endpunkt, ohne globale Injection |
| CR11-5 | Claude-Review (Runde 1) | `validateEngineExportProvenance` prueft den Quantisierungsvertrag nur an der Schemaversion; die Runner-Fixture belegt, dass ein Vertrag voellig ohne Stufen das Gate passiert | angenommen | Stufenfelder, endliche Werte, unbeschraenkte Endstufe und Rundungsvertrag werden tief fail-closed validiert |
| CR11-6 | Claude-Review (Runde 1) | `withdrawalRounding.phase/mode/floorProtection` und `metricDisplayRounding` sind Stringliterale im Exportmodul und an keiner Stelle an `spending-policy-helpers.mjs` gebunden, obwohl Akzeptanzkriterium 5 eine handgepflegte Exportkopie ausschliesst | angenommen | Rundungsvertrag liegt in `CONFIG` und steuert `calculateFinalWithdrawal`; ein Mutationszeuge belegt die kausale Bindung |
| CR11-7 | Claude-Review (Runde 1) | Die Reconciliation der Exportgrenzen vergleicht `wealth_end_nominal_eur` mit `result.portfolioEnd`, also die Metrik mit ihrer eigenen Quelle; im realen Pfad kann Akzeptanzkriterium 4 nie ausloesen | angenommen | Runner erfasst unabhaengige Start-/Endtotale je Jahreszeile; finanzielle Exporte reconciliieren erste/letzte Zeile gegen die Metriken |
| CR11-8 | Claude-Review (Runde 1) | Auf `contracts.flexReductionMaximum.basis` existiert keine Wertassertion; die Fixture traegt kein `flexBasisContract`, der exportierte Basiswert ist in jedem Test `null` | angenommen | positive Fixture und exakte Assertion pinnen `gross_household_flex_required` |
| CR11-9 | Claude-Review (Runde 1) | `sync-dist.ps1` schreibt `sourceTreeStatus: 'dirty'` ohne Warnung oder Abbruch; ein Desktop-Artefakt aus dirty Quellen wird mit dauerhaft blockiertem Raw-Export ausgeliefert | angenommen | Clean-Preflight liegt vor jeder Kopie; Commit und Clean-Status werden vor dem Provenienzschreiben erneut geprueft |
| CR11-10 | Claude-Review (Runde 1) | `globalThis.__RUHESTANDSAPP_BUILD_PROVENANCE__` hat Vorrang vor dem geladenen Dokument und ist nicht auf Testkontexte beschraenkt; die fail-closed-Garantie haengt an einer beschreibbaren globalen Variable | angenommen | globaler Override vollstaendig entfernt; nur der feste Same-Origin-Endpunkt wird akzeptiert |
| CR11-11 | Claude-Review (Runde 1) | Das in der CR10-14-Fixture genannte Messkommando `PRINT_D17_SOURCE=1 ...` existiert nirgends im Repository; die Herkunft der einzigen unabhaengig gemessenen Zahlenreihe ist nicht reproduzierbar | angenommen | `node tests/reconstruct-slice09-d17.mjs` archiviert Commit `2e4867f`, rekonstruiert D-17 und vergleicht bytekanonisch mit der Fixture |
| CR11-12 | Claude-Review (Runde 1) | CR10-14 wurde dupliziert statt korrigiert; das alte `slice09To10DeltaLedger` traegt weiterhin `sourceCaseCount: 12` neben elf Faellen, und zwei Ledger mit verschiedenen Schemaversionen koexistieren | angenommen | ein einziges `Slice09To10FinancialDeltaLedgerV2` mit 12/12 Faellen, Source-, Ziel- und Delta-Werten liegt in der Slice-10-Messfixture |
| CR11-13 | Claude-Review (Runde 1) | `loadRuntimeBuildProvenance` startet als unbeobachteter Seiteneffekt beim Modulladen; ein Export vor Aufloesung des Fetch scheitert, obwohl die Provenienz kurz darauf vorliegt | angenommen | kein Import-Side-Effect; UI und globaler Browserentrypoint warten den Loader vor dem Lauf explizit ab |
| CR11-14 | Claude-Review (Runde 1) | Im Kopf der Slice-10-MD fehlt der Zeilenumbruch am Ende der neuen `**Status:**`-Zeile; Status und Abhaengigkeiten rendern als ein Absatz | angenommen | Markdown-Zeilenumbruch ergaenzt |
| CR11-15 | Claude-Review (Runde 1) | `portfolioSnapshots` bleibt auf dem kanonischen Resultat und in `window.globalBacktestData` bestehen; D-16 ist ausschliesslich an der Exportgrenze geschlossen | angenommen | Snapshots aus Runnerresultat und globalem UI-Zustand entfernt; Tests pinnen deren Abwesenheit |
| CR11-16 | Claude-Review (Runde 2) | Der Runner ueberschreibt `row.portfolio_total_end` mit `portfolioTotal`, das den Pflegebucket nicht enthaelt; exportierte Jahreszeilen, CSV-Spalte und Drawdownreihe verschieben sich still, und der Metrikdeskriptor sagt weiterhin "including health bucket" zu | angenommen | Engine-Zeilentotal bleibt autoritativ; kanonische Grenze und Fallback addieren den Pflegebucket genau einmal, ein realer Runnerzeuge pinnt 2.300 EUR statt 1.500 EUR |
| CR11-17 | Claude-Review (Runde 2) | Die Reconciliation der Exportgrenzen vergleicht zwei Aufrufe derselben `portfolioTotal`-Funktion auf demselben Portfolioobjekt; ein zweiter Rechenweg existiert weiterhin nicht | angenommen | kanonische Grenze nutzt die injizierte aktive Totalfunktion plus Pflegebucket; Jahreszeilenevidenz summiert Aktien-, Gold-, Liquiditaets- und Pflegebestand separat, und eine Gegenprobe erzwingt eine Abweichung |
| CR11-18 | Claude-Review (Runde 2) | `tests/slice09-d17-reconstruction.test.mjs` ruft `tar` mit einem Windows-Pfad auf; unter GNU tar wird der Doppelpunkt als Remotehost gelesen und `npm test` scheitert umgebungsabhaengig mit 18.021/1 statt 18.022/0 | angenommen | Rekonstruktion pinnt den absoluten Windows-bsdtar-Pfad unter `%SystemRoot%\\System32\\tar.exe`; PATH-Aufloesung ist ausgeschlossen und statisch getestet |
| CR11-19 | Claude-Review (Runde 2) | Der CSV-Export traegt keine Laufidentitaet mehr; die Assertion zur gemeinsamen kanonischen Laufkennung wurde geloescht und der Dateiname enthaelt nur noch den Bytehash der CSV-Datei | angenommen | `run_id` ist erste CSV-Spalte und identisch zur JSON-Run-ID; beide Dateinamen teilen denselben Run-Hashkern, waehrend CSV seinen Byte-Fingerprint behaelt |
| CR11-20 | Claude-Review (Runde 2) | `calculateFinalWithdrawal` wirft im Jahres-Hotpfad bei ungueltigem `WITHDRAWAL_ROUNDING`-Vertrag, der bei jedem Aufruf aus der veraenderbaren `CONFIG` gelesen wird; ein ersetzendes `ANTI_PSEUDO_ACCURACY` bricht ganze MC- oder Sweep-Batches ab | angenommen | ungueltige oder ersetzte Live-Konfiguration faellt ohne Wurf auf den beim Modulstart gepinnten freigegebenen Rundungs-/Stufenvertrag zurueck und weist den Fallback in der Diagnostik aus |
| CR11-21 | Claude-Review (Runde 2) | Das Dokument widerspricht sich: "Programmdatei-Scope" nennt weiterhin fuenf Dateien und "Nicht im Scope" schliesst Engine- und Quantisierungssemantik aus, waehrend der Nachbesserungs-Preflight zehn Dateien und zwei geaenderte Enginedateien fuehrt | angenommen | Scope, Diff-Risiko und Nicht-Scope nennen konsistent exakt zehn produktive Dateien sowie die defensive Bindung des unveraenderten Rundungsdefaults |
| CR11-22 | Claude-Review (Runde 2) | `RUNTIME_BUILD_PROVENANCE_PATH` ist absolut und blockiert bei Auslieferung unterhalb eines Unterpfades still den JSON-Export; `sync-dist` verlangt zusaetzlich einen auch von unversionierten Dateien freien Baum | angenommen | Endpunkt ist relativ `./__build-provenance.json`; Dist-Sync bewertet nur versionierte Aenderungen und kopiert ausschliesslich das gefilterte `git ls-files`-Inventar |
| CR11-23 | Claude-Review (Runde 3) | Die technische CSV hat mit `run_id` eine neue fuehrende Spalte und damit 34 statt 33 Spalten, behaelt aber die Vertragsversion `HistoricalBacktestCsvV1`; die Referenzdokumentation nennt weiterhin 33 Spalten, und die Slice-07-Regel gegen stille positionsveraendernde Erweiterungen ist verletzt | angenommen | Vertrag auf `HistoricalBacktestCsvV2` versioniert; Header-/Golden-Tests und Referenzdokumentation pinnen 34 Spalten mit fuehrender `run_id` |
| CR11-24 | Claude-Review (Runde 3) | `quantizeMonthly` deaktiviert die Quantisierung nur noch bei `ENABLED === false`; jeder andere falsy Wert laesst sie entgegen dem bisherigen Verhalten aktiv und veraendert die Entnahmehoehe | angenommen | bisherige `!ENABLED`-Semantik wiederhergestellt und fuer `false`, `undefined`, `null`, `0` und leeren String getestet |
| CR11-25 | Claude-Review (Runde 3) | Der defensive Rundungsfallback ist stumm: `contractFallbackApplied` wird von keinem Aufrufer gelesen und erscheint in keiner Jahreszeile, keinem Export und keiner Diagnose | angenommen | Fallback traegt den stabilen Diagnosecode `SPENDING_ROUNDING_CONTRACT_FALLBACK` und meldet ihn pro Modullauf einmalig ueber die sichtbare Runtime-Konsole; Rueckgabediagnostik und Test pinnen denselben Code |
| CR11-26 | Claude-Review (Runde 3) | `sync-dist.ps1` wurde von Robocopy auf eine Kopierschleife ueber `git ls-files` umgestellt; kein Test fuehrt das Skript aus, und eine ignorierte, zur Laufzeit benoetigte Datei verschwindet still aus `dist/` | angenommen | isoliertes temporaeres Git-Fixture fuehrt das echte PowerShell-Skript aus; Pflichtmodul, Clean-Provenienz und Scratch-Ausschluss werden positiv, normale und explizit ignorierte unversionierte Runtime-Quelldateien mit handlungsleitendem Reject negativ getestet |
| CR11-27 | Claude-Review (Runde 3) | `wealth_start_nominal_eur` und `wealth_end_nominal_eur` enthalten neu den Pflegebucket, waehrend die Ergebnisuebersicht "Endvermoegen" unveraendert neben "Pflegebucket am Laufende" zeigt; die Enthaltensein-Beziehung ist nirgends benannt | angenommen | `HistoricalBacktestPortfolioBoundariesV2.totalComposition` beschreibt aktives Portfolio plus Pflegebucket und `included_in_total_do_not_add`; die sichtbare Pflegebucket-Karte nennt die Enthaltensein-Beziehung explizit |
| CR11-28 | Claude-Review (Runde 3) | Der Raw-JSON-Dateiname traegt nicht mehr den Exportfingerprint, und `identifiers.runId` ist nicht mehr `btrun_<resultFingerprint>`; ein gespeicherter Export laesst sich nicht mehr ueber seinen Dateinamen auf seinen Fingerprint zurueckfuehren | angenommen | beide Dateinamen tragen den gemeinsamen Run-Token; JSON zusaetzlich den Result-Fingerprint, CSV ihren Byte-Fingerprint, jeweils durch exakte Downloadtests gepinnt |
| CR11-29 | Claude-Review (Runde 4) | Die CSV-Spaltenreihenfolge ist ungepinnt: die Headerassertion vergleicht die Ausgabe mit derselben Spaltenliste, die sie erzeugt, und eine Umsortierung passiert die gesamte Suite gruen; die im Slice-07-Ergebnis behaupteten Golden-/Header-Tests existieren so nicht | offen | Auflage vor Slice 12 |
| CR11-30 | Claude-Review (Runde 4) | Die CSV-Schemaversion ist in keinem erzeugten Artefakt sichtbar; weder die CSV selbst noch `exportContract` im Raw-JSON nennen sie, sodass V1 und V2 nur ueber die Kopfzeile unterscheidbar sind | offen | ausstehend |
| CR11-31 | Claude-Review (Runde 4) | Die Fallbackwarnung wird ueber einen Modul-Latch nur einmal pro Instanz ausgegeben; in workerbasierten Monte-Carlo- und Sweep-Laeufen erscheint sie auf einer Konsole, die die Oberflaeche nie zeigt | offen | ausstehend |
| CR11-32 | Claude-Review (Runde 4) | Drei Evidenzgates sind an Windows gebunden - bsdtar-Pfad, `WindowsPowerShell\v1.0\powershell.exe` und ein lokal vollstaendiges Git-Repository - und scheitern ausserhalb hart statt zu ueberspringen | offen | ausstehend |

## Nachbesserungs-Preflight nach Claude-Review Runde 1

- Datum: 2026-08-03.
- `git branch --show-current`: `codex/suite-datenintegritaet-hardening`.
- `git rev-parse HEAD`: `05ff8c3896b1c86137b57a1610d90c7c6aedfa76`.
- `git status --short`: ausschliesslich der dokumentierte uncommittete
  Slice-11-Scope einschliesslich Claudes Review-Ergaenzung; keine
  fachfremden Dateien.
- Reviewstatus: blockiert durch CR11-1 bis CR11-4; CR11-5 bis CR11-15 werden
  in derselben Nachbesserung bearbeitet, soweit sie Slice-11-Code,
  Testevidenz oder Dokumentation betreffen.

```text
Geplante produktive Dateien der Nachbesserung (einschliesslich bisherigem Scope):
- app/simulator/historical-backtest-export.js
- app/simulator/historical-backtest-runner.js
- app/shared/runtime-build-provenance.js
- app/simulator/simulator-backtest.js
- app/simulator/simulator-main.js
- engine/config.mjs
- engine/planners/spending-policy-helpers.mjs
- start_suite.ps1
- scripts/sync-dist.ps1
- app/simulator/simulation-data-inventory.js

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Export-V2-Golden-Fingerprint, JSON-/CSV-Download und UI-Fehlerstatus
- Runner-Resultat, Charakterisierungs-Snapshots und Browser-Backtest
- Engine-Quantisierung, Build-Synchronitaet und Provenienz-Endpunkt
- Slice-09-zu-10-Ledger und reproduzierbare D-17-Herkunft

Nicht anfassen:
- Steuer-, Entnahmehoehen-, Runway- und Mindest-Flex-Semantik
- historische Datenreihen und Datenmanifestwerte
- dist/ und RuheStandSuite.exe

Rollback-Strategie:
- bestehende Slice-11-Dateien gezielt auf den vor Review-Nachbesserung
  dokumentierten Arbeitsstand zurueckfuehren
- keine Hard-Resets, keine Loeschung fremder Dateien und kein Commit durch Codex
```

Der produktive Scope umfasst zehn Dateien und erreicht damit die zulaessige
Obergrenze, ohne die Stopgrenze von mehr als zehn Programmdateien zu
ueberschreiten. `simulation-data-inventory.js` wurde nach dem ersten Voll-Gate
als erwartete direkte Folge des neuen Engine-Rundungsvertrags aufgenommen: Nur
der gepinnte Hash von `engine_policy_defaults` aendert sich; Finanzwerte und
FlowDelta bleiben unveraendert. `npm run build:engine` wurde ausgefuehrt; der
generierte `engine.js` blieb byteidentisch und gehoert deshalb nicht zum
tatsaechlichen Aenderungsscope. Das neue
`tests/reconstruct-slice09-d17.mjs` ist ein Test-/Evidenzwerkzeug; weitere
Testdateien, Fixtures und Dokumentation zaehlen gemaess Projektregel nicht zur
Programmdateigrenze.

## Nachbesserungsergebnis nach Claude-Review Runde 1

Alle Findings CR11-1 bis CR11-15 wurden angenommen und technisch bearbeitet.
Die Einzelentscheidungen und Implementierungsbelege stehen in der Tabelle
`Review-Entscheidungen`. Besonders sicherheitsrelevant sind folgende
Vertragsaenderungen:

- Provenienz wird einmalig vor dem Lauf vom festen Same-Origin-Endpunkt geladen
  und im Request gebunden. Weder Exportzeit noch globale Variablen koennen
  Commit oder Clean-Status ersetzen.
- Raw-JSON validiert Provenienz, tiefen Quantisierungsvertrag und unabhaengige
  finanzielle Jahreszeilengrenzen fail-closed. CSV bleibt als getrennte
  technische Byteprojektion verfuegbar.
- Die Rundungssemantik stammt aus der Engine-Konfiguration und wird von
  `calculateFinalWithdrawal` konsumiert. Ein Konfigurationsmutations-Test
  beweist, dass eine Modusaenderung das Rechenergebnis tatsaechlich aendert.
- Interne Portfolio-Snapshots wurden bereits aus dem kanonischen Resultat
  entfernt. Finanzielle Start-/Endgrenzen sind reine, nicht restartfaehige
  Aggregate; technische Teilresultate behaupten keine finanziell
  reconciliierten Grenzen.
- Die D-17-Slice-09-Basis ist aus dem archivierten Commit reproduzierbar. Das
  Slice-09-zu-10-Ledger existiert nur noch einmal und enthaelt alle 12 Faelle
  mit Source-, Ziel- und Delta-Werten.

## Validierung der Nachbesserung

- `npm run build:engine`: bestanden; `engine.js` ausschliesslich ueber den
  vorgesehenen Fallback-Build generiert.
- Fokussierte Gates:
  - Export: 97/97 Assertions;
  - Runner: 124/124 Assertions;
  - Runtime-Provenienz: 22/22 Assertions;
  - Backtest-Orchestrierung: 79/79 Assertions;
  - Entnahmequantisierung: 28/28 Assertions;
  - Charakterisierung und konsolidiertes Ledger: 223/223 Assertions;
  - D-17-Rekonstruktion: 2/2 Assertions;
  - Dateninventar: 373/373 Assertions.
- Der erste Voll-Lauf meldete ausschliesslich den erwarteten Hashwechsel von
  `engine_policy_defaults`, der aus dem neu aufgenommenen Rundungsvertrag
  folgt. Nach kontrollierter Aktualisierung dieses Inventarhashs bestand
  `npm test` mit 162 Testdateien und 18.022/18.022 Assertions, 0
  fehlgeschlagenen Dateien und 0 offenen Handles.
- `npm run test:coverage`: 18.022/18.022 Assertions; 78,49 Prozent
  (39.853/50.772), beide obligatorischen Dateigates bestanden.
- `npm run test:browser`: 28/28 Browser-Szenarien bestanden; der reale
  Raw-JSON-Download traegt Commit und Provider aus `/__build-provenance.json`.
- `npm run docs:evidence`: bestanden; 69 MKT-, 55 FOR-Records und 17
  MAP-Anker, keine Netznutzung.
- PowerShell-Parserpruefung fuer `start_suite.ps1` und
  `scripts/sync-dist.ps1`: bestanden.
- `git diff --check`: bestanden.

## Freigabestatus nach Nachbesserung

Technisch nachgebessert und selbstgeprueft. Die Blockade aus Claude-Review
Runde 1 wird von Codex nicht eigenstaendig aufgehoben. Externes Re-Review,
Freigabe und lokaler Commit stehen aus.

## Zweitreview von Claude (Runde 2)

### Pruefgegenstand und Verifikationsbasis

Nachbesserungsstand im unversionierten Arbeitsbaum auf Basiscommit `05ff8c3`.
Produktiver Scope jetzt zehn Dateien statt fuenf; zusaetzlich
`app/simulator/simulator-backtest.js`, `app/simulator/simulator-main.js`,
`app/simulator/simulation-data-inventory.js`, `engine/config.mjs` und
`engine/planners/spending-policy-helpers.mjs`.

Selbst gemessen unter PowerShell (dokumentierte Umgebung):

- `npm test`: 18.022/18.022 Assertions, 0 fehlgeschlagene Dateien, 0 offene
  Handles. Deckungsgleich mit der Dokumentangabe.
- `npm run test:coverage`: 78,49 Prozent (39.853/50.772), beide
  obligatorischen Dateigates bestanden. Deckungsgleich.
- `npm run test:browser`: 28 bestandene Szenarien.
- `npm run docs:evidence`: bestanden; 69 MKT-, 55 FOR-Records, 17 MAP-Anker.
- `git diff --check`: gruen.

Derselbe `npm test` unter einer Git-Bash-PATH-Umgebung: **18.021 Assertions,
1 fehlgeschlagene Assertion** in `tests/slice09-d17-reconstruction.test.mjs`
(siehe CR11-18).

### Verifikation der Findings aus Runde 1

Alle fuenfzehn Findings sind angenommen und einzeln nachgeprueft:

- **CR11-1 geschlossen.** `enrichRequestProvenance` ist ersatzlos entfernt;
  `buildValidatedRequest` validiert nur noch. Es existiert kein Pfad mehr, auf
  dem Exportzeit-Provenienz einen erfassten Commit ersetzt.
- **CR11-2 geschlossen.** Alle fuenf Fehlercodes werden mit Titel,
  Zusammenfassung und konkreter Handlungsoption projiziert; der Code selbst
  erscheint als Statuskennung. Der CSV-Pfad ist vom Raw-JSON-Pfad entkoppelt
  und bleibt bei fehlender Provenienz verfuegbar. Siehe aber CR11-19.
- **CR11-3 geschlossen.** Der V2-Golden `818de6432e945e47...cb696acd` ist exakt
  gepinnt.
- **CR11-4 geschlossen und per Gegenprobe D belegt.** Der Browser-Testserver
  liefert `/__build-provenance.json` real aus, und der E2E-Raw-Export
  assertiert Commit und Provider aus dem Endpunkt.
- **CR11-5 geschlossen.** `isValidQuantizationContract` prueft Stufenindex,
  endliche Schrittweiten, streng steigende Obergrenzen, genau eine
  unbeschraenkte Endstufe und den Rundungsvertrag fail-closed.
- **CR11-6 geschlossen.** Der Rundungsvertrag liegt in
  `CONFIG.ANTI_PSEUDO_ACCURACY.WITHDRAWAL_ROUNDING` und wird von
  `calculateFinalWithdrawal` konsumiert. Der Mutationszeuge in
  `tests/spending-quantization.test.mjs` belegt die Kausalitaet numerisch:
  `monthlyMode: 'ceil'` ergibt 25.200 statt 24.600 EUR.
- **CR11-7 formal geschlossen, substanziell offen.** Siehe CR11-17.
- **CR11-8 geschlossen.** Die Fixture traegt einen positiven
  `flexBasisContract`, und `raw.contracts.flexReductionMaximum.basis` ist exakt
  auf `gross_household_flex_required` assertiert.
- **CR11-9 geschlossen.** `Assert-CleanRuntimeBuildProvenance` laeuft vor jeder
  Kopie und erneut nach dem Robocopy gegen den erwarteten Commit.
- **CR11-10 geschlossen.** Der globale Override ist vollstaendig entfernt; nur
  der feste Same-Origin-Endpunkt wird akzeptiert.
- **CR11-11 geschlossen.** `tests/reconstruct-slice09-d17.mjs` archiviert
  Commit `2e4867f` per `git archive`, injiziert die Messsonde, rechnet den
  D-17-Fall nach und vergleicht kanonisch mit der Fixture. Die Herkunft ist
  damit reproduzierbar - mit der Einschraenkung aus CR11-18.
- **CR11-12 geschlossen.** Es existiert genau ein
  `Slice09To10FinancialDeltaLedgerV2` mit zwoelf Faellen sowie Source-, Ziel-
  und Deltawerten. Ich habe die geaenderte Slice-10-Messfixture feldweise gegen
  `HEAD` verglichen: ausserhalb des Ledgerblocks und des daraus folgenden
  `targetActualSha256` hat sich **kein einziger gemessener Wert** geaendert;
  `crossSliceOracleProjection` und der D-17-Zeuge sind unveraendert.
- **CR11-13 geschlossen.** Kein Import-Seiteneffekt mehr;
  `runBacktestWithRuntimeProvenance` wartet den Loader mit `force: true` vor
  dem Lauf ab und ist als `window.runBacktest` gebunden.
- **CR11-14 geschlossen.** Der Kopfblock der Slice-10-MD trennt Status und
  Abhaengigkeiten jetzt durch eine Leerzeile; die Darstellung ist korrekt.
- **CR11-15 geschlossen.** `portfolioSnapshots` ist aus beiden Ergebnispfaden
  des Runners entfernt und existiert weder im kanonischen Resultat noch in
  `window.globalBacktestData`.

### Dimension 1 - Korrektheit

Die Nachbesserung hat eine finanzielle Groesse still veraendert. Der Runner
ueberschreibt in jeder Jahreszeile

```js
const row = { ...result.logData, portfolio_total_start: ..., portfolio_total_end: computePortfolioTotal(...) };
```

den vom Engine-Pfad gelieferten Wert. `simulator-year-result.js` bildet
`portfolioTotalEnd = euros(portfolioActiveEnd + healthBucketEnd)`,
`portfolioTotal` in `simulator-results.js` summiert dagegen nur
Aktien-, Gold- und Liquiditaetspositionen. Das Pflegebucket faellt damit aus
jeder exportierten Jahreszeile heraus (**CR11-16**).

### Dimension 2 - Vertragstreue

`historical-backtest-metrics.js` ist unveraendert und beschreibt die
Drawdownreihe weiterhin als "portfolioStart followed by each
rows[*].row.portfolio_total_end, nominal, **including health bucket**". Genau
dieses Feld enthaelt den Pflegebucketanteil nun nicht mehr. Der Deskriptor
beschreibt die Daten nach der Nachbesserung falsch, und die CSV-Spalte
`portfolio_total_end_nominal_eur` liefert fuer jeden Lauf mit gefuelltem
Pflegebucket andere Werte als vor Slice 11 (CR11-16).

Der Abschnitt "Nicht im Scope" ist unveraendert und schliesst "keine Aenderung
der Engine-, Steuer-, Entnahme-, Runway-, Mindest-Flex- oder
Quantisierungssemantik" aus; "Programmdatei-Scope" nennt weiterhin
"fuenf Dateien". Beides steht im selben Dokument neben dem
Nachbesserungs-Preflight mit zehn Dateien und zwei geaenderten Enginedateien
(**CR11-21**).

### Dimension 3 - Fehlerbehandlung

Die Fehlerprojektion in der UI ist jetzt sachgerecht: stabiler Code, konkrete
Ursache, umsetzbare Handlungsoption, und der CSV-Export bleibt bei fehlender
Provenienz nutzbar. Der Startknopf wird im `finally` von `runBacktest` wieder
freigegeben; die neue asynchrone Huelle erzeugt keine dauerhafte Sperre.

Neu ist ein Wurf im Jahres-Hotpfad: `calculateFinalWithdrawal` wirft bei
ungueltigem `WITHDRAWAL_ROUNDING`-Vertrag. Der Vertrag wird bei jedem
Jahresaufruf aus der lebenden `CONFIG` gelesen, die `getConfig()` unveraendert
nach aussen gibt. Ein Konsument, der `ANTI_PSEUDO_ACCURACY` als Ganzes ersetzt,
bricht damit ganze Monte-Carlo- oder Sweep-Batches ab - dasselbe Muster, das in
Slice 10 als CR10-5 dokumentiert wurde (**CR11-20**).

### Dimension 4 - Seiteneffekte

`tests/slice09-d17-reconstruction.test.mjs` ruft `tar -xf C:\...` auf. GNU tar
liest einen Pfad mit Doppelpunkt als `host:pfad` und bricht ab; Windows-eigenes
`bsdtar` nicht. Damit haengt das Ergebnis von `npm test` davon ab, welche
`tar`-Implementierung im PATH zuerst steht (**CR11-18**).

`sync-dist.ps1` bricht jetzt bei jedem unsauberen Baum ab, einschliesslich
unversionierter Dateien. Das ist die gewollte Fail-closed-Wirkung, verschaerft
aber die Packvoraussetzung: ein einziges nicht ignoriertes Scratchfile
verhindert die Erzeugung von `dist/`. `RUNTIME_BUILD_PROVENANCE_PATH` ist
absolut; eine Auslieferung unterhalb eines Unterpfades wuerde die Provenienz
und damit den JSON-Export still blockieren (**CR11-22**).

Der gepinnte `embeddedValueHash` von `engine_policy_defaults` wurde als Folge
der neuen CONFIG-Schluessel aktualisiert. Der Vorgang ist im Preflight
dokumentiert und betrifft keinen Finanzwert.

### Dimension 5 - Was koennte brechen

Die Reconciliation der Exportgrenzen prueft weiterhin nichts. `portfolioEnd`
entsteht in `finishResult` als `computePortfolioTotal(simulationState.portfolio)`;
`rows.at(-1).row.portfolio_total_end` entsteht im selben Lauf aus derselben
Funktion auf demselben Portfolioobjekt. Auf der Startseite gilt dasselbe fuer
`portfolioStart` und `rows[0].row.portfolio_total_start`. Es sind zwei Aufrufe
derselben Funktion auf demselben Zustand, kein zweiter Rechenweg; ein
Rechenfehler in `portfolioTotal` verschiebt beide Seiten identisch
(**CR11-17**).

Der CSV-Export traegt keine Laufidentitaet mehr. Die Assertion "JSON and CSV
identify the same canonical run" wurde geloescht; der Dateiname enthaelt jetzt
den Bytehash des CSV selbst. Eine CSV-Datei laesst sich damit weder ihrem
JSON-Export noch ihrem Lauf zuordnen (**CR11-19**).

### Gegenproben

Die einzige mutierte Datei wurde gegen ein SHA-256-Manifest byteidentisch
zurueckgesetzt (`app/shared/runtime-build-provenance.js`
`4d6b0f40bc103d81...`, nach Wiederherstellung `OK`).

**Gegenprobe D - Endpunktvertrag, Wiederholung von Runde 1.** Der abgerufene
Pfad wurde erneut auf `/__build-provenance-PROBE-D.json` gebrochen. Ergebnis
jetzt: `npm run test:browser` bricht mit `TimeoutError` ab. In Runde 1 hatte
dieselbe Mutation 28 gruene Szenarien geliefert. Die Detektionsluecke aus
CR11-4 ist geschlossen.

**Gegenprobe E - Pflegebucket in der Jahreszeile.** Read-only-Messung gegen die
unveraenderten Module mit einem Portfolio aus 1.000 EUR Aktien, 500 EUR
Liquiditaet und 800 EUR Pflegebucket:

```text
Runner (portfolioTotal, neu in row.portfolio_total_end): 1500
Engine (simulator-year-result portfolioTotalEnd)       : 2300
Differenz = Pflegebucket                               :  800
```

Der einzige Charakterisierungsfall mit positivem Pflegebucket
(`health_bucket_nested_row_summary_positive`) injiziert seine Zeile ueber
`projectionOverride` synthetisch und durchlaeuft den Runnerpfad nicht. Deshalb
bleibt die Aenderung in allen 18.022 Assertions unsichtbar (Beleg fuer
CR11-16).

### Findings-Lifecycle

- Geschlossen: CR11-1 bis CR11-6, CR11-8 bis CR11-15 - einzeln verifiziert.
- Formal geschlossen, substanziell offen: CR11-7 (fortgefuehrt als CR11-17).
- Neu eingefuehrte Blocker: CR11-16, CR11-18.
- Neu eingefuehrte Restrisiken: CR11-17, CR11-19 bis CR11-22.
- Eingangsgates CR10-13 und CR10-14 bleiben geschlossen; die Slice-10-Messwerte
  wurden nachweislich nicht umgedeutet.
- CR10-15 bis CR10-18 bleiben unveraendert offen.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache: Ein Nutzer mit gefuelltem
Pflegebucket vergleicht einen aelteren Backtestexport mit einem neuen und
findet in jeder Jahreszeile ein um exakt den Pflegebucketbetrag niedrigeres
Endvermoegen, dazu einen veraenderten maximalen Drawdown. Er sucht die Ursache
in der Pflegelogik oder in den Steuerregeln, denn Slice 11 ist als reiner
Exportvertragsslice dokumentiert und schliesst Semantikaenderungen ausdruecklich
aus. Der Metrikdeskriptor sagt ihm zudem weiterhin zu, die Reihe enthalte das
Pflegebucket.

## Review-Ergebnis (Claude, Runde 2)

- **Status:** blockiert
- **Blocker:**
  - CR11-16: Der Runner ueberschreibt `row.portfolio_total_end` mit einem
    Total ohne Pflegebucket. Exportierte Jahreszeilen, die CSV-Spalte und die
    Drawdownreihe aendern sich still, der Metrikdeskriptor wird falsch, und
    kein Test deckt den Pfad ab.
  - CR11-18: `npm test` ist umgebungsabhaengig. Unter einem Git-Bash-PATH
    scheitert `tests/slice09-d17-reconstruction.test.mjs` hart, weil GNU tar
    den Windows-Pfad als Remotehost liest - gemessen 18.021 Assertions mit
    einem Fehler gegenueber 18.022/18.022 unter PowerShell.
- **Restrisiken:** CR11-17, CR11-19, CR11-20, CR11-21, CR11-22 sowie
  unveraendert CR10-15 bis CR10-18, CR09-5 bis CR09-13, CR09-15 bis CR09-20,
  CR08-17, CR08-21 bis CR08-23, CR07-4, CR07-7 bis CR07-15, CR06-20, CR06-23.
- **Pre-Mortem:** siehe oben - ein stiller, um den Pflegebucketbetrag
  verschobener Vermoegensverlauf in einem Slice, der Semantikaenderungen
  ausdruecklich ausschliesst.

Die vierzehn substanziell geschlossenen Findings aus Runde 1 sind sauber und
mit echten Zeugen geloest; die Blockade betrifft ausschliesslich die beiden neu
gefundenen Punkte. Commit, Push und Freigabe bleiben Nutzerentscheidung.

## Nachbesserungs-Preflight nach Claude-Review Runde 2

- Datum: 2026-08-03.
- Branch und Basiscommit bleiben
  `codex/suite-datenintegritaet-hardening` / `05ff8c3`.
- Der Arbeitsbaum enthaelt weiterhin ausschliesslich den dokumentierten
  uncommitteten Slice-11-Scope einschliesslich beider Claude-Reviews.
- CR11-16 bis CR11-22 werden vollstaendig bearbeitet. CR10-15 bis CR10-18 und
  die aelteren uebernommenen Restrisiken bleiben ausserhalb des Auftrags.

```text
Produktive Dateien der Runde-2-Nachbesserung, bereits im Zehn-Dateien-Scope:
- app/simulator/historical-backtest-runner.js
- app/simulator/historical-backtest-export.js
- app/shared/runtime-build-provenance.js
- engine/planners/spending-policy-helpers.mjs
- scripts/sync-dist.ps1

Test-/Evidenz- und Dokumentdateien:
- tests/historical-backtest-runner.test.mjs
- tests/historical-backtest-export.test.mjs
- tests/runtime-build-provenance.test.mjs
- tests/spending-quantization.test.mjs
- tests/reconstruct-slice09-d17.mjs
- tests/slice09-d17-reconstruction.test.mjs
- bestehende Charakterisierungs-, Browser- und Referenzdokumentation

Voraussichtliche Aenderungstiefe:
- riskant

Stop-/Pruefpunkte:
- Pflegebucket muss in kanonischer Metrik, Jahreszeile und CSV identisch bleiben
- Grenzreconciliation muss zwei unabhaengige Rechenwege vergleichen
- D-17-Rekonstruktion darf nicht von der tar-Reihenfolge im PATH abhaengen
- unversionierte Dateien duerfen weder den Dist-Build blockieren noch in dist gelangen
- Finanzwerte, Steuerwerte und FlowDelta duerfen unerwartet nicht abweichen
```

Der produktive Gesamtscope bleibt bei exakt zehn Dateien. Runde 2 fuegt keine
weitere Programmdatei hinzu und ueberschreitet die Stopgrenze daher nicht.

## Nachbesserungsergebnis nach Claude-Review Runde 2

CR11-16 bis CR11-22 sind angenommen und technisch bearbeitet:

- Die primaere Portfoliogrenze addiert den Pflegebucket zur bestehenden
  aktiven Portfolio-Totalfunktion. Die unabhaengige Jahreszeilenevidenz
  summiert Aktien-, Gold-, Liquiditaets- und Pflegebestand getrennt. Der vom
  Engine-Jahrespfad gelieferte Endwert wird nicht mehr durch eine schmalere
  Runnerprojektion ueberschrieben.
- Raw-JSON und CSV leiten eine gemeinsame kanonische Run-ID aus demselben
  Laufinhalt ab. `run_id` ist Bestandteil jeder CSV-Zeile und beide
  Downloadnamen teilen denselben Run-Hashkern; der CSV-Bytehash bleibt ein
  getrennter Formatfingerprint.
- Die D-17-Rekonstruktion verwendet den absoluten Windows-bsdtar-Pfad und ist
  damit unabhaengig von Git-Bash- oder GNU-tar-Eintraegen im `PATH`.
- Ein ungueltiger oder als Ganzes ersetzter Live-Rundungsvertrag wirft nicht
  mehr im Jahres-Hotpfad. Die Berechnung verwendet defensiv den unveraenderten
  freigegebenen Default und kennzeichnet den Fallback diagnostisch.
- Der Runtime-Endpunkt ist relativ und damit unter Anwendungsunterpfaden
  erreichbar. `sync-dist` prueft nur versionierte Quellen, kopiert nur das
  gefilterte Git-Inventar und kann unversionierte Scratchdateien daher weder
  einpacken noch an ihnen scheitern.

## Fokussierte Validierung der Runde-2-Nachbesserung

- `npm run build:engine`: bestanden; Fallback-Modulwrapper erzeugt,
  `engine.js` blieb ohne Aenderung.
- `historical-backtest-runner.test.mjs`: 131/131 Assertions.
- `historical-backtest-export.test.mjs`: 100/100 Assertions.
- `runtime-build-provenance.test.mjs`: 24/24 Assertions.
- `spending-quantization.test.mjs`: 31/31 Assertions.
- `simulator-backtest.test.mjs`: 79/79 Assertions.
- `simulator-backtest-characterization.test.mjs`: 223/223 Assertions; alle
  Slice-10-Finanzwerte, Steuerwerte und FlowDelta unveraendert, daher keine
  Fixture-Aktualisierung.
- `slice09-d17-reconstruction.test.mjs`: 4/4 Assertions einschliesslich realer
  Rekonstruktion vom archivierten Commit.
- PowerShell-Parserpruefung fuer `scripts/sync-dist.ps1`: bestanden.

## Vollstaendige Abschlussvalidierung nach Runde 2

- `npm test`: 162 Testdateien, 18.039/18.039 Assertions, 0 fehlgeschlagene
  Dateien und 0 offene Handles.
- `npm run test:coverage`: 18.039/18.039 Assertions; 78,52 Prozent
  (39.925/50.844), beide obligatorischen Dateigates bestanden.
- `npm run test:browser`: 28/28 Browser-Szenarien bestanden; der reale
  JSON-/CSV-Download teilt dieselbe kanonische Run-ID.
- `npm run docs:evidence`: bestanden; 69 MKT-, 55 FOR-Records und 17
  MAP-Anker, keine Netznutzung.
- `node --check`: alle zehn geprueften geaenderten JavaScript-/MJS-Dateien
  bestanden.
- PowerShell-Parserpruefung fuer `start_suite.ps1` und
  `scripts/sync-dist.ps1`: bestanden.
- `git diff --check`: bestanden; lediglich die bestehenden Git-Hinweise zur
  spaeteren LF-/CRLF-Normalisierung der beiden PowerShell-Dateien wurden
  ausgegeben.
- Scopecheck: exakt die zehn dokumentierten produktiven Dateien; keine
  Aenderung an `engine.js`, `dist/` oder `RuheStandSuite.exe`.

Codex hebt die Claude-Blockade nicht selbst auf und erteilt keine Freigabe.
Erneutes externes Re-Review, Freigabe und lokaler Commit stehen aus.

## Drittreview von Claude (Runde 3)

### Pruefgegenstand und Verifikationsbasis

Nachbesserungsstand der Runde 2 im unversionierten Arbeitsbaum auf Basiscommit
`05ff8c3`. Der produktive Scope bleibt bei zehn Dateien; Runde 2 hat keine
weitere Programmdatei hinzugefuegt.

Selbst gemessen:

- `npm test` unter PowerShell und **zusaetzlich unter Git-Bash-PATH**: beide
  Male **18.039/18.039** Assertions, 0 fehlgeschlagene Dateien, 0 offene
  Handles. Damit ist der in Runde 2 blockierende Umgebungsunterschied
  ausgeraeumt.
- `npm run test:coverage`: 78,52 Prozent (39.925/50.844), beide
  obligatorischen Dateigates bestanden. Deckungsgleich mit der Dokumentangabe.
- `npm run test:browser`: 28 bestandene Szenarien.
- `npm run docs:evidence`: bestanden.
- `git diff --check`: gruen.

### Verifikation der Findings aus Runde 2

- **CR11-16 geschlossen.** Der Runner uebernimmt den vom Engine-Jahrespfad
  gelieferten `portfolio_total_end` und faellt nur bei nicht endlichem Wert auf
  eine eigene Berechnung zurueck. Die kanonische Grenze addiert den
  Pflegebucket ueber `computeCanonicalPortfolioTotal`. Der neue Runnertest
  pinnt Start-, Zeilen- und Endwert eines Laufs mit 800 EUR Pflegebucket auf
  jeweils 2.300 EUR.
- **CR11-17 geschlossen.** `computeIndependentPortfolioTotal` ist bewusst nicht
  die injizierte `totalPortfolio`-Funktion, sondern ein zweiter Rechenweg. Die
  Exportgrenze vergleicht damit drei verschiedene Herkunftspfade: kanonische
  Metrik, unabhaengige Runnerevidenz und Engine-Jahreszeile. Der neue
  Divergenzzeuge (`activeTotalOffset: -1`) belegt, dass eine Abweichung von
  1 EUR erkannt wird.
- **CR11-18 geschlossen.** Die Rekonstruktion nutzt den ueber `SystemRoot`
  aufgeloesten bsdtar-Pfad und wirft eine klare Meldung, falls er fehlt. Die
  Suite ist in beiden Shells gruen.
- **CR11-19 geschlossen.** `createHistoricalBacktestRunIdentity` bildet eine
  inhaltsgebundene Laufkennung ueber Request, Outcome, Zeilen, historische
  Records, Metriken und Kohorten. Beide Downloadnamen teilen denselben
  Hashkern, und `run_id` steht in jeder CSV-Zeile. Siehe aber CR11-23.
- **CR11-20 geschlossen.** Der Wurf im Jahres-Hotpfad ist entfernt; ein
  ungueltiger Live-Vertrag faellt auf den unveraenderten freigegebenen Default
  zurueck. Siehe aber CR11-24 und CR11-25.
- **CR11-21 geschlossen.** "Programmdatei-Scope" nennt jetzt zehn Dateien
  einschliesslich beider Enginedateien, und "Nicht im Scope" beschreibt die
  Bindung des Quantisierungsmodus statt sie auszuschliessen.
- **CR11-22 geschlossen.** `RUNTIME_BUILD_PROVENANCE_PATH` ist relativ;
  `sync-dist` prueft nur versionierte Quellen und kopiert nur das gefilterte
  Git-Inventar. Siehe aber CR11-26.

### Dimension 1 - Korrektheit

Die Pflegebucketkorrektur ist rechnerisch sauber. Ich habe geprueft, ob der
neue Dreiwegevergleich falsch-positive Exportabbrueche erzeugen kann:
`euros()` ist in diesem Projekt kein Rundungs-, sondern ein
Nichtnegativitaetsoperator (`Math.max(0, Number(x) || 0)`), und
`healthBucketGeldmarkt` wird ueber denselben Operator geschrieben. Die drei
Wege koennen deshalb nur dann auseinanderlaufen, wenn eine Teilsumme negativ
ist - die Toleranz von 1e-6 ist damit nicht zu eng.

### Dimension 2 - Vertragstreue

Die technische CSV hat eine neue fuehrende Spalte `run_id` erhalten. Die
Vertragsversion ist unveraendert `HistoricalBacktestCsvV1`. Gemessen:

```text
Spalten: 34 | Version: HistoricalBacktestCsvV1
docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md:2530: "... mit 33 festen Rohspalten ..."
```

Das Slice-07-Ergebnisdokument haelt fuer genau diesen Fall fest: "Die
CSV-Spaltenreihenfolge ist Teil von `HistoricalBacktestCsvV1` und durch
Golden-/Header-Tests fixiert. Kuenftige Schemaaenderungen benoetigen
Versionierung statt stiller positionsveraendernder Erweiterung." Genau diese
Regel ist verletzt (**CR11-23**).

`quantizeMonthly` hat seine Abschaltbedingung von `!ENABLED` auf
`ENABLED === false` verengt. Ein Konsument, der `ENABLED` auf `undefined`,
`null`, `0` oder `''` setzt, hat die Quantisierung bisher deaktiviert; jetzt
bleibt sie aktiv und veraendert die Entnahmehoehe. Das ist eine stille
Semantikaenderung im Entnahmepfad und in "Durchgefuehrte Aenderungen" nicht
erwaehnt (**CR11-24**).

### Dimension 3 - Fehlerbehandlung

Der Ersatz des Wurfs durch einen defensiven Default ist die richtige Richtung.
Der Fallback ist aber stumm: `contractFallbackApplied` existiert
ausschliesslich im Rueckgabeobjekt von `calculateFinalWithdrawal` und in seinem
eigenen Test. Kein Aufrufer liest das Feld, es erscheint in keiner
Jahreszeile, in keinem Export und in keiner Diagnose. Ein produktiv
verbogener Rundungsvertrag rechnet damit unbemerkt mit dem Default weiter
(**CR11-25**).

### Dimension 4 - Seiteneffekte

`sync-dist.ps1` wurde von einem Robocopy-Spiegel auf eine Kopierschleife ueber
`git ls-files` umgestellt. Das loest CR11-22 vollstaendig, ist aber deutlich
mehr als das Finding verlangt hat und aendert den Packvertrag auf "nur
versionierte Dateien". Kein Test fuehrt das Skript aus; abgesichert sind nur
Substringpruefungen und der PowerShell-Parser. Eine ignorierte, aber zur
Laufzeit benoetigte Datei verschwaende damit still aus `dist/`, und die
Nachpruefung testet `dist/app/shared` nur als Verzeichnis. Konkret waere das
neue `app/shared/runtime-build-provenance.js` bis zu seinem Commit nicht im
Artefakt enthalten (**CR11-26**).

`wealth_start_nominal_eur` und `wealth_end_nominal_eur` enthalten jetzt den
Pflegebucket; vorher nicht. Die Ergebnisuebersicht zeigt weiterhin
"Endvermoegen" unmittelbar neben "Pflegebucket am Laufende", ohne dass eine
Beschriftung oder ein Deskriptor die neue Enthaltensein-Beziehung nennt. Wer
beide Zahlen addiert, zaehlt den Pflegebucket doppelt (**CR11-27**).

### Dimension 5 - Was koennte brechen

Der Dateiname des Raw-JSON traegt nicht mehr den Exportfingerprint, sondern
den Kern der Laufkennung; `identifiers.runId` ist nicht mehr
`btrun_<resultFingerprint>`, sondern ein eigener Inhaltshash. Fuer die
Formatverklammerung ist das genau richtig, es bedeutet aber, dass sich ein
gespeicherter JSON-Export nicht mehr an seinem Dateinamen auf seinen
Fingerprint zurueckfuehren laesst (**CR11-28**).

### Gegenproben

Die einzige mutierte Datei wurde gegen ein SHA-256-Manifest byteidentisch
zurueckgesetzt (`app/simulator/historical-backtest-runner.js`
`072aa53166f86c48...`, nach Wiederherstellung `OK`).

**Gegenprobe F - Pflegebucket in der unabhaengigen Evidenz.** Der Summand
`readHealthBucketTotal(portfolio)` wurde aus
`computeIndependentPortfolioTotal` entfernt. Ergebnis:

```text
FAIL: independent opening-row evidence includes the health bucket exactly once
      (Expected 2300, got 1500)
```

Damit ist genau der Zahlenzeuge aus meiner Runde-2-Gegenprobe E jetzt
testseitig gepinnt.

**Gegenprobe G - Umgebungsabhaengigkeit.** `npm test` unter demselben
Git-Bash-PATH, der in Runde 2 einen harten Fehler erzeugt hat: 18.039/18.039
ohne Fehler.

### Findings-Lifecycle

- Geschlossen: CR11-16 bis CR11-22 - einzeln verifiziert, CR11-16 und CR11-17
  zusaetzlich per Mutationszeuge.
- Weiterhin geschlossen: CR11-1 bis CR11-15, CR10-13 und CR10-14.
- Neu eingefuehrter Blocker: CR11-23.
- Neu eingefuehrte Restrisiken: CR11-24 bis CR11-28.
- CR10-15 bis CR10-18 und die aelteren uebernommenen Restrisiken bleiben
  unveraendert offen.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache: Ein Nutzer laedt die
Backtest-CSV in eine Auswertungsvorlage, die er sich zu einem frueheren
Zeitpunkt gebaut hat und die auf feste Spaltenpositionen zugreift. Die Datei
meldet sich weiterhin als `HistoricalBacktestCsvV1`, traegt aber eine Spalte
mehr. Jede Kennzahl steht eine Position zu weit rechts: Renditen landen in
Steuerfeldern, Endvermoegen in Verlustvortraegen. Nichts bricht sichtbar, die
Zahlen sehen plausibel aus, und die Versionskennung sagt ausdruecklich, dass
sich nichts geaendert habe.

## Review-Ergebnis (Claude, Runde 3)

- **Status:** blockiert
- **Blocker:**
  - CR11-23: Die technische CSV hat 34 statt 33 Spalten und eine neue fuehrende
    `run_id`-Spalte, behaelt aber die Vertragsversion
    `HistoricalBacktestCsvV1`; die Referenzdokumentation nennt weiterhin 33
    Spalten. Das verletzt die im Slice-07-Ergebnis festgehaltene Regel, dass
    positionsveraendernde Erweiterungen eine neue Version verlangen.
- **Restrisiken:** CR11-24 bis CR11-28 sowie unveraendert CR10-15 bis CR10-18,
  CR09-5 bis CR09-13, CR09-15 bis CR09-20, CR08-17, CR08-21 bis CR08-23,
  CR07-4, CR07-7 bis CR07-15, CR06-20, CR06-23.
- **Pre-Mortem:** siehe oben - eine um eine Spalte verschobene CSV, die sich
  weiterhin als unveraenderte Vertragsversion ausweist.

Alle sieben Findings der Runde 2 sind substanziell und mit echten Zeugen
geschlossen; die verbliebene Blockade betrifft eine einzelne, eng umrissene
Vertragsversionierung. Commit, Push und Freigabe bleiben Nutzerentscheidung.

## Nachbesserungs-Preflight nach Claude-Review Runde 3

- Datum: 2026-08-03.
- Branch und Basiscommit bleiben
  `codex/suite-datenintegritaet-hardening` / `05ff8c3`.
- `git status --short` enthaelt weiterhin ausschliesslich den dokumentierten
  uncommitteten Slice-11-Scope einschliesslich Claudes drittem Review.
- CR11-23 bis CR11-28 werden vollstaendig bearbeitet; die aelteren
  uebernommenen Restrisiken bleiben ausserhalb dieses Auftrags.

```text
Produktive Dateien der Runde-3-Nachbesserung, bereits im Zehn-Dateien-Scope:
- app/simulator/historical-backtest-export.js
- app/simulator/simulator-backtest.js
- engine/planners/spending-policy-helpers.mjs
- scripts/sync-dist.ps1
- start_suite.ps1

Test-/Evidenz- und Dokumentdateien:
- tests/historical-backtest-export.test.mjs
- tests/spending-quantization.test.mjs
- tests/runtime-build-provenance.test.mjs
- tests/browser-smoke.test.mjs
- bestehende Slice-, Test- und Referenzdokumentation

Voraussichtliche Aenderungstiefe:
- riskant

Stop-/Pruefpunkte:
- CSV-V2 muss die neue fuehrende run_id-Spalte explizit versionieren
- falsy ENABLED muss die bisherige Abschaltsemantik behalten
- ein Rundungsvertragsfallback muss mit stabilem Diagnosecode sichtbar sein
- sync-dist muss in einem isolierten Git-Repository wirklich ausgefuehrt werden
- Summen inklusive Pflegebucket duerfen nicht als additive Einzelwerte erscheinen
- JSON-Dateiname muss Run-ID und Result-Fingerprint getrennt rueckverfolgbar machen
- Finanzwerte, Steuerwerte und FlowDelta duerfen unerwartet nicht abweichen
```

Der produktive Gesamtscope bleibt bei exakt zehn Dateien. Runde 3 fuegt keine
weitere Programmdatei hinzu und ueberschreitet die Stopgrenze daher nicht.

## Nachbesserungsergebnis nach Claude-Review Runde 3

Alle Findings CR11-23 bis CR11-28 wurden angenommen und technisch bearbeitet:

- Die positionsveraendernde CSV-Erweiterung ist als
  `HistoricalBacktestCsvV2` mit 34 Spalten explizit versioniert.
- Die bisherige falsy-Abschaltung der Quantisierung ist wiederhergestellt. Ein
  ungueltiger Live-Rundungsvertrag bleibt batchsicher, wird aber ueber den
  stabilen Diagnosecode `SPENDING_ROUNDING_CONTRACT_FALLBACK` sichtbar.
- `sync-dist.ps1` blockiert normale und ignorierte unversionierte
  Runtime-Quellen, verlangt das Provenienzmodul als exakten Dist-Pfad und wird
  in einem isolierten echten
  Git-Repository ausgefuehrt statt nur als Quelltext untersucht.
- `HistoricalBacktestPortfolioBoundariesV2` und die sichtbare Summary
  kennzeichnen den Pflegebucket als bereits in Start-/Endvermoegen enthalten.
- Downloadnamen erlauben die getrennte Rueckverfolgung von Run-Identitaet und
  Result- beziehungsweise CSV-Byte-Fingerprint.

Die kontrollierte Charakterisierung hat ausschliesslich den erwarteten
`targetActualSha256` der geaenderten UI-Quelle von
`be9ac...` auf
`826108f1b1b07cc626c877eb5a7f3fc271195d405a33f42dfcf41cb5d2acf144`
fortgeschrieben. Finanz-, Steuer- und FlowDelta-Werte blieben unveraendert.

## Fokussierte Validierung der Runde-3-Nachbesserung

- Export-V2/CSV-V2: 106/106 Assertions.
- Entnahmequantisierung und Fallbackdiagnose: 38/38 Assertions.
- Runtime-Provenienz einschliesslich realer isolierter `sync-dist`-Ausfuehrung
  und Ignored-Runtime-Reject: 35/35 Assertions.
- Backtest-Orchestrierung: 79/79 Assertions.
- Charakterisierung nach kontrollierter Hashaktualisierung: 223/223
  Assertions; keine finanzielle oder FlowDelta-Abweichung.

## Vollstaendige Validierung nach Runde 3

- `npm run build:engine`: bestanden; der vorgesehene Fallback-Wrapper wurde
  erzeugt und `engine.js` blieb byteidentisch.
- `npm test`: 162 Testdateien, 18.063/18.063 Assertions, 0 fehlgeschlagene
  Dateien, 0 offene Handles.
- `npm run test:coverage`: 18.063/18.063 Assertions; 78,53 Prozent
  (39.946/50.864), beide obligatorischen Dateigates bestanden.
- `npm run test:browser`: 28/28 Browser-Szenarien bestanden; eingeschlossen
  sind die sichtbare Pflegebucket-Enthaltensein-Beziehung und die realen
  JSON-/CSV-Downloads.
- `npm run docs:evidence`: bestanden; 69 MKT-, 55 FOR-Records und 17
  MAP-Anker, keine Netznutzung.
- `node --check` fuer alle acht geaenderten JavaScript-/MJS-Programmdateien
  und PowerShell-Parserpruefung fuer `start_suite.ps1` sowie
  `scripts/sync-dist.ps1`: bestanden.
- `git diff --check`: bestanden; nur die bekannten Git-Hinweise zur spaeteren
  LF-/CRLF-Normalisierung der beiden PowerShell-Dateien bleiben sichtbar.
- Scopecheck: exakt die zehn dokumentierten produktiven Dateien; keine
  Aenderung an `engine.js`, `dist/` oder `RuheStandSuite.exe`.

Codex hebt die Claude-Blockade nicht selbst auf und erteilt keine Freigabe;
externes Re-Review, Freigabe und Commit stehen aus.

## Viertreview von Claude (Runde 4)

### Pruefgegenstand und Verifikationsbasis

Nachbesserungsstand der Runde 3 im unversionierten Arbeitsbaum auf Basiscommit
`05ff8c3`. Der produktive Scope bleibt bei zehn Dateien.

Selbst gemessen:

- `npm test` unter PowerShell **und** unter Git-Bash-PATH: beide Male
  **18.063/18.063** Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:coverage`: 78,53 Prozent (39.946/50.864), beide
  obligatorischen Dateigates bestanden.
- `npm run test:browser`: 28 bestandene Szenarien.
- `npm run docs:evidence`: bestanden.
- `git diff --check`: gruen.

Alle Angaben sind deckungsgleich mit dem Dokument.

Zusaetzlich habe ich die geaenderte Slice-10-Messfixture erneut feldweise gegen
`HEAD` verglichen. Ausserhalb des Ledgerblocks hat sich ueber alle vier Runden
hinweg genau ein Feld geaendert:

```text
Aenderungen ausserhalb des Ledgers: /targetActualSha256  165766b1... -> 826108f1...
```

Kein Finanz-, Steuer- oder FlowDelta-Wert der freigegebenen Slice-10-Messung
wurde angetastet.

### Verifikation der Findings aus Runde 3

- **CR11-23 geschlossen.** `HISTORICAL_BACKTEST_CSV_SCHEMA_VERSION` steht auf
  `HistoricalBacktestCsvV2`; gemessen 34 Spalten. Alle drei Referenzstellen
  (`ARCHITEKTUR_UND_FACHKONZEPT.md`, `TECHNICAL.md`,
  `SIMULATOR_MODULES_README.md`) nennen jetzt uebereinstimmend V2 und
  34 Spalten und benennen die positionsveraendernde Erweiterung ausdruecklich.
  Gegenprobe H belegt, dass eine zusaetzliche Spalte erkannt wird. Siehe aber
  CR11-29.
- **CR11-24 geschlossen.** `quantizeMonthly` prueft wieder
  `!CONFIG.ANTI_PSEUDO_ACCURACY?.ENABLED`; die bisherige falsy-Abschaltung ist
  wiederhergestellt.
- **CR11-25 geschlossen.** Der Fallback traegt den stabilen Code
  `SPENDING_ROUNDING_CONTRACT_FALLBACK`, erscheint als `warningCode` in der
  Quantisierungsdiagnose und wird einmalig als `console.warn` ausgegeben; ein
  Test pinnt Code, Diagnosefeld und Warnung. Siehe aber CR11-31.
- **CR11-26 geschlossen.** `tests/runtime-build-provenance.test.mjs` legt ein
  isoliertes Git-Fixture an und fuehrt `sync-dist.ps1` real aus - Erfolgsfall,
  Ablehnungsfall und Ignored-Runtime-Fall. Das Skript ist damit nicht mehr nur
  per Substring geprueft.
- **CR11-27 geschlossen.** `HistoricalBacktestPortfolioBoundariesV2` traegt
  `totalComposition.healthBucketRelation: 'included_in_total_do_not_add'`, und
  die Ergebnisuebersicht beschriftet den Posten als "Pflegebucket am Laufende
  (im Endvermoegen enthalten)".
- **CR11-28 geschlossen.** Der Downloadname trennt Laufidentitaet und
  Formatfingerprint:
  `backtest-<periode>-run-<12>-result|csv-<12>-<zeitstempel>.<ext>`.

### Dimension 1 - Korrektheit

Ich habe keinen Rechenfehler gefunden. Die Versionsanhebung ist rein
deklarativ und beruehrt weder Spalteninhalte noch Zahlenformatierung; die
falsy-Wiederherstellung stellt exakt das Verhalten vor Slice 11 wieder her.

### Dimension 2 - Vertragstreue

Die Slice-07-Regel verlangt Versionierung statt stiller positionsveraendernder
Erweiterung und beruft sich dabei auf "Golden-/Header-Tests". Diese Anker
existieren so nicht. Die Headerassertion lautet

```js
assertEqual(lines[0], HISTORICAL_BACKTEST_CSV_COLUMNS.map(c => c.id).join(';'), ...)
```

und vergleicht die Ausgabe mit genau derselben Liste, die sie erzeugt hat.
Gepinnt sind nur die Spaltenzahl 34 und die ersten Spalten ueber einen
`startsWith`-Vergleich (**CR11-29**).

Die Vertragsversion selbst ist in keinem erzeugten Artefakt sichtbar: die CSV
traegt keine Versionszeile, und `exportContract` im Raw-JSON nennt
`sourceResultSchemaVersion` und `canonicalization`, aber keine
CSV-Schemaversion. Wer eine CSV-Datei in der Hand haelt, kann V1 und V2 nur
ueber die Kopfzeile unterscheiden (**CR11-30**).

### Dimension 3 - Fehlerbehandlung

Der Fallback ist jetzt sichtbar, aber nur einmal pro Modulinstanz:
`roundingFallbackWarningEmitted` ist ein Modul-Latch. In workerbasierten
Monte-Carlo- oder Sweep-Laeufen liegt die Warnung damit auf einer
Workerkonsole, die die Oberflaeche nie zeigt, und eine spaetere zweite
Fehlkonfiguration im selben Prozess bleibt stumm (**CR11-31**).

### Dimension 4 - Seiteneffekte

Drei Evidenzgates sind konstruktionsbedingt an Windows gebunden: die
D-17-Rekonstruktion an den ueber `SystemRoot` aufgeloesten bsdtar-Pfad, der
`sync-dist`-Test an `System32\WindowsPowerShell\v1.0\powershell.exe`, beide
zusaetzlich an ein lokal vollstaendiges Git-Repository. Auf einer
Nicht-Windows-Umgebung scheitern sie hart statt zu ueberspringen
(**CR11-32**). Fuer dieses Projekt ist das vertretbar - die Suite wird ueber
PowerShell-Skripte gestartet -, es sollte aber bewusst festgehalten sein.

Der Scope ist unveraendert bei zehn Dateien; `engine.js`, `dist/` und
`RuheStandSuite.exe` sind unberuehrt.

### Dimension 5 - Was koennte brechen

Eine Umsortierung bestehender CSV-Spalten bleibt vollstaendig unentdeckt. Genau
diese Fehlerklasse hat sich in Runde 3 einmal materialisiert, als `run_id` alle
Positionen verschob. Solange kein literaler Goldenheader existiert, kann sie
sich jederzeit wiederholen, ohne dass ein Gate anschlaegt.

### Gegenproben

Die einzige mutierte Datei wurde gegen ein SHA-256-Manifest byteidentisch
zurueckgesetzt (`app/simulator/historical-backtest-export.js`
`4dfddfe273f76c65...`, nach beiden Proben `OK`).

**Gegenprobe H - zusaetzliche Spalte.** Eine Dummyspalte wurde an Position 3
eingefuegt. Ergebnis:

```text
FAIL: CSV V2 fixes the 34-column contract (Expected 34, got 35)
```

Die Spaltenzahl ist gepinnt.

**Gegenprobe I - Umsortierung ohne Zahlaenderung.** Die Spalten
`gold_return_pct` und `cash_bond_return_pct` wurden vertauscht, die
Spaltenzahl blieb 34. Ergebnis: `historical-backtest-export.test.mjs`
106/106 gruen und `npm test` **18.063/18.063** gruen - kein einziger Fehler.
Die Spaltenreihenfolge ist ungepinnt (Beleg fuer CR11-29).

### Findings-Lifecycle

- Geschlossen: CR11-23 bis CR11-28, einzeln verifiziert; CR11-23 zusaetzlich
  per Gegenprobe H.
- Weiterhin geschlossen: CR11-1 bis CR11-22 sowie CR10-13 und CR10-14.
- Neue Auflage vor Slice 12: CR11-29.
- Neu eingefuehrte Restrisiken: CR11-30, CR11-31, CR11-32.
- CR10-15 bis CR10-18 und die aelteren uebernommenen Restrisiken bleiben
  unveraendert offen.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache: Ein spaeterer Slice sortiert
die CSV-Spalten um oder gruppiert sie fachlich neu, weil die Reihenfolge
nirgends als Anker festgeschrieben ist. Alle Gates bleiben gruen, die
Versionskennung bleibt `HistoricalBacktestCsvV2`, und eine externe
Auswertungsvorlage liest ab diesem Zeitpunkt Goldrenditen in der Spalte fuer
Anleihenrenditen. Der Fehler faellt erst auf, wenn jemand die Zahlen fachlich
plausibilisiert.

## Review-Ergebnis (Claude, Runde 4)

- **Status:** freigegeben
- **Blocker:** keine
- **Auflage vor Slice 12:** CR11-29 - die CSV-Spaltenreihenfolge als literalen
  Goldenheader festschreiben, damit die im Slice-07-Ergebnis behauptete
  Absicherung tatsaechlich existiert. Gegenprobe I zeigt, dass eine
  Umsortierung derzeit 18.063/18.063 gruen passiert.
- **Restrisiken:** CR11-30 (CSV-Schemaversion in keinem Artefakt sichtbar),
  CR11-31 (Fallbackwarnung nur einmal pro Modulinstanz, in Workern unsichtbar),
  CR11-32 (drei Evidenzgates sind Windows-gebunden) sowie unveraendert
  CR10-15 bis CR10-18, CR09-5 bis CR09-13, CR09-15 bis CR09-20, CR08-17,
  CR08-21 bis CR08-23, CR07-4, CR07-7 bis CR07-15, CR06-20, CR06-23.
- **Pre-Mortem:** siehe oben - eine spaetere, von keinem Gate erkannte
  Umsortierung der CSV-Spalten bei unveraenderter Versionskennung.

Alle 28 Findings aus vier Runden sind geschlossen und einzeln verifiziert; die
Blocker der Runden 1 bis 3 sind jeweils mit einem eigenen Zeugen belegt. Die
Freigabe betrifft den technischen Stand. Commit, Push und Programmfreigabe
bleiben Nutzerentscheidung.
