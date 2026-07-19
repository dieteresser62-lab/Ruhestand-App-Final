# Slice 03: Historischer Daten- und Jahrescontract

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** freigegeben; technisches Review durch Gemini abgeschlossen (freigegeben)  
**Abhaengigkeit:** Slices 01 und 02 freigegeben und lokal committed; Slice-02-Commit `60f191e`  
**GAPs:** BT-01, BT-02, BT-06, BT-07, BT-18, BT-20

## Ziel

Es wird ein ausfuehrbarer Contract fuer Datenmanifest, Backtestperiode und `HistoricalYearRecordV1` erstellt. Jede Reihe erhaelt einen expliziten Source-/As-of-Bezug und einen Qualitaetsstatus. Ungeklaerte Herkunft bleibt `unresolved`; fehlende Werte werden nicht still als 0 % behandelt.

Dieser Slice definiert und validiert den Contract, schaltet aber die bestehende Backtest-Zeitachsenberechnung noch nicht auf die neue Konvention um. Dadurch kann D-01 vor der Ergebnisverschiebung separat reviewt werden.

## Akzeptanzkriterien

- Das maschinenlesbare Manifest enthaelt pro Serie mindestens: ID, Variante, Waehrung, Region, Frequenz, Zeitraum, Quelle/Status, Lizenzstatus, Transformation, geschaetzte Abschnitte, Missingness-Regel und Revision.
- Heute ungeklaerte Felder werden explizit `unresolved`; Tests verbieten leere oder erfundene „known“-Angaben.
- `HistoricalYearRecordV1` trennt `realized` und `decisionAsOf` samt `sourceYear`/`asOfYear` und Qualitaetsstatus.
- Pflichtfelder mit `missing`, nicht-finiten Werten oder unzulaessigen Indexleveln liefern einen strukturierten Contractfehler; kein `|| 0`.
- Das Dataset wird einmal je Revision/Hash validiert und als immutable validierter Lookup bereitgestellt. Ein Instrumentationstest belegt, dass die Vollvalidierung nicht in Jahres-, MC-, Sweep- oder Cohort-Schleifen aufgerufen wird.
- Vor einem Single Path oder Cohort-Batch prueft ein Periodenpreflight fuer jedes ganzzahlige Jahr von `startYear` bis `endYear` die Existenz genau eines Records und aller freigegebenen Pflichtfelder. Die erste Luecke erzeugt einen strukturierten `incomplete`-Grund; kein `continue`.
- `fallback_zero` is ein eigener sichtbarer Status und darf nur fuer manifestierte Altwerte genutzt werden.
- Gültige Backtestgrenzen werden aus Dataset-/Lookback-Contract abgeleitet; UI-Hardcodes sind nicht Source of Truth.
- Start-/Endjahr sind endliche Ganzzahlen. Die Entscheidung zu einem Einjahreslauf ist dokumentiert und getestet.
- Der Contract selbst ist DOM-frei und mutiert `HISTORICAL_DATA` nicht.
- Backtest-, Monte-Carlo- und alternative `prepareHistoricalData()`-Zuordnungen werden in einer Vergleichstabelle inventarisiert; dieser Slice aendert noch keinen aktiven MC-/Sweep-Datenpfad.
- Keine vorhandene Backtestzahl aendert sich in diesem Slice.

## Scope

- Manifest-/Datenqualitaetsschema fuer bestehende Reihen
- Periodenvalidierung
- YearRecord-Builder/Validator hinter noch nicht aktivierter Integrationsgrenze
- negative Daten-/Missingness-Tests
- Data-Sources-Doku fuer exakte Statusbegriffe
- einmaliger Datasetvalidator plus gecachter Lookup und Periodenpreflight

## Nicht-Scope

- keine neue Zeitachsenkonvention
- keine neuen historischen Werte
- keine Quellenbehauptung ohne Nachweis
- keine internationale Datenreihe
- keine Kosten-/Gebuehrenmodellierung
- keine Umschaltung des produktiven Backtests auf die neue Jahreszuordnung
- keine Engine-Aenderung
- keine Aenderung an `simulator-year-portfolio.js:readYearReturnRates()`; der gemeinsame 0-%-Fallback bleibt bis D-09/Slice 05 ein explizites P0-Restrisiko
- keine Record-Vollvalidierung innerhalb einer Simulationsschleife

## Geplante Dateien

Voraussichtlich:

- neu: `app/simulator/historical-backtest-contract.js`
- geaendert oder extrahiert: `app/simulator/simulator-data.js`
- geaendert: `app/simulator/simulator-input-validation.js`
- neu: `tests/historical-backtest-contract.test.mjs`
- neu oder geaendert: `tests/historical-data-manifest.test.mjs`
- geaendert: `docs/reference/DATA_SOURCES.md`

Programmdateien: voraussichtlich 5. Ein separates JSON-Manifest zaehlt als Programm-/Konfigurationsdatei und muss in der Grenze mitgezaehlt werden.

## Pflichtentscheidungen vor Coding

- D-02: Einjahreslauf zulassen oder begruendet verbieten.
- D-03: Pflicht-/optionale Reihen und `fallback_zero`-Regel.
- Manifest-ID/Revision und Hashkanonisierung.

D-01 wird vorbereitet, aber erst in Slice 04 wirksam.

Die D-01-Vorbereitung muss fuer Aktien, Gold, Cash/Bond, Inflation, Lohn/Rentenanpassung und CAPE jeweils Datenlabel, `sourceYear`, `asOfYear`, Einheit, Missingness und Abweichung zum aktiven `annualData` ausweisen. Die nachgewiesene Rentenanpassungsmapping `simStartYear - series.startYear + yearIdx` wird als Test erhalten; der von Claude vermutete direkte Zugriff auf 1950 ist kein bestaetigter Defekt.

## Diff-Risiko vor Coding

```text
Implementierungsstart 2026-07-18:
- git branch --show-current: codex/simulator-backtest-gap-plan
- git status --short:
  - unversioniert: docs/internal/SLICE_SIMULATOR_BACKTEST_03_DATEN_JAHRES_CONTRACT.md bis SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md
  - unversioniert: Playwright-Pakete und Startskripte unter node_modules/
- Einordnung: Slice 02 ist in Commit 60f191e durch Gemini freigegeben und lokal committed. Die Folge-Slices und Playwright-Dateien waren vor Slice-03-Beginn vorhanden und werden ausserhalb des Slice-Scope nicht veraendert.

Geplante Dateien:
- app/simulator/historical-backtest-contract.js
- app/simulator/simulator-data.js
- app/simulator/simulator-input-validation.js
- tests/historical-backtest-contract.test.mjs
- tests/historical-data-manifest.test.mjs
- docs/reference/DATA_SOURCES.md
- docs/internal/SLICE_SIMULATOR_BACKTEST_03_DATEN_JAHRES_CONTRACT.md
- docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md
- docs/internal/SIMULATOR_BACKTEST_GAP_ANALYSE.md

Voraussichtlich Änderungstiefe:
- mittel; neuer Contract neben bestehendem produktiven Pfad

Gefährdete bestehende Tests:
- historical-data-robustness.test.mjs
- simulator-backtest.test.mjs
- monte-carlo-sampling.test.mjs bei versehentlicher Datenmutation
- simulator-input-readers.test.mjs

Nicht anfassen:
- konkrete HISTORICAL_DATA-Werte
- annualData-/MC-Samplingsemantik
- engine/**, workers/**, engine.js
- dist/** und RuheStandSuite.exe
```

## Pflichtentscheidungen zum Implementierungsstart

- **D-02 angenommen:** Einjahreslaeufe sind gueltig, wenn genau ein vollstaendiger `HistoricalYearRecordV1` samt Lookback vorliegt. `startYear === endYear` ist deshalb zulaessig; rueckwaertige, nicht-finite oder nicht-ganzzahlige Grenzen sind Contractfehler.
- **D-03 angenommen:** Die sechs eingebetteten Reihen `msci_eur`, `gold_eur_perf`, `zinssatz_de`, `inflation_de`, `lohn_de` und `cape` sind fuer den vollstaendigen V1-Record Pflicht. Fehlende/nicht-finite Werte und unzulaessigen Indexlevel sind Fehler. Ein vorhandener, aber quellenmaessig ungeklaerter Wert bleibt sichtbar `unresolved`. `fallback_zero` ist nur innerhalb explizit manifestierter Segmente zulaessig; fuer den aktuellen Goldbestand wird wegen der ungeklärten Nullwertbedeutung kein solches Segment behauptet.
- **Manifest/Hash:** Manifest-ID `ruhestandsapp-historical-data-v1`, Revision `2026-07-18.1`. Der Content-Hash wird als SHA-256 ueber kanonisches JSON gebildet: Jahreskeys numerisch aufsteigend, Recordfelder lexikografisch und Zahlen ohne locale-abhaengige Formatierung. Revision plus Hash bilden den Cache-Key der einmaligen Vollvalidierung.
- **D-01 bleibt Vorschlag:** Der neue V1-Builder weist die vorgeschlagene `t`-/`t-1`-Zuordnung explizit aus, is aber nicht an den produktiven Runner angeschlossen. Die fachliche Freigabe und wirksame Umschaltung bleiben Slice 04 vorbehalten.

## Geplante Tests

- `node --check app/simulator/historical-backtest-contract.js`
- `node tests/run-single.mjs tests/historical-backtest-contract.test.mjs`
- `node tests/run-single.mjs tests/historical-data-manifest.test.mjs`
- `node tests/run-single.mjs tests/historical-data-robustness.test.mjs`
- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`
- `npm test`

## Review-Auflagen in diesem Slice

- Gemini G-F-01/G-F-02: feldgenaues Alignment und Hard-Failure statt Silent Skip.
- Gemini G-F-05: Vollvalidierung genau einmal auf Datenlade-/Provider-Ebene; Periodenpreflight genau einmal je Request/Batch; Call-Count-/Performance-Nachweis.
- Claude C-04: Rentenanpassungsmapping mit Markerwerten 1950/2000/2001 testen; die 1950-Hypothese ist durch den aktuellen Offsetcode widerlegt.
- Claude C-08: `readYearReturnRates()` bleibt bewusst ausser Scope und ist als BT-20/D-09 an Slice 05 uebergeben.
- Claude C-09: lueckenlose Schluessel- und Pflichtfeldpruefung fuer den gesamten angeforderten Zeitraum vor der Schleife.

## Stop-Regeln dieses Slice

- Der Contract erfordert Aenderung konkreter Historienwerte.
- Eine Quelle, Lizenz oder Indexvariante kann nicht belegt werden und soll trotzdem als geklaert markiert werden.
- `annualData` oder Monte-Carlo-Ergebnisse aendern sich.
- Datasetvalidierung oder Periodenpreflight wird pro simuliertem Jahr/Pfad ausgefuehrt oder erzeugt eine unerklaerte Performanceverschlechterung.
- Pflichtreihen/As-of-Konvention koennen nicht eindeutig festgelegt werden.
- Mehr als zehn Programmdateien oder Engine-Semantik werden beruehrt.

## Durchgefuehrte Aenderungen

- `app/simulator/simulator-data.js` um das tief eingefrorene `HISTORICAL_DATA_MANIFEST` (`HistoricalDataManifestV1`) ergaenzt. Manifest-ID `ruhestandsapp-historical-data-v1`, Revision `2026-07-18.1`, kanonischer SHA-256 `8246422d98657c2a76b750ce9fd1253e01aa7a9a4dfa0f0f01dcb96b5507ef29`.
- Fuer `msci_eur`, `inflation_de`, `zinssatz_de`, `lohn_de`, `gold_eur_perf` und `cape` Variante, Waehrung, Region, Frequenz, Zeitraum, Source-/Lizenzstatus, Transformation, Schaetzsegmente, Missingness und Revision maschinenlesbar gemacht. Unbelegte Source-, Lizenz- und Variantenangaben bleiben `unresolved` mit `value: null`.
- `app/simulator/historical-backtest-contract.js` neu angelegt: browserkompatible kanonische SHA-256-Bildung, Manifest-/Dataset-/Recordvalidator, strukturierte `HistoricalDataContractError`-Codes, Cache je Dataset-ID/Revision/Content-/Manifest-Hash und immutable Provider.
- `HistoricalYearRecordV1` eingefuehrt. Realisierte Aktien-, Gold-, Cash/Bond-, Inflations- und Lohn-/Rentenwerte sind von `decisionAsOf.capeRatio` getrennt; jede Beobachtung traegt `sourceYear`, `asOfYear`, Einheit, Ableitung und `qualityStatus`.
- V1-Zeitachse sichtbar als `alignmentStatus='proposal_pending_d01'` markiert. Aktienrendite nutzt `t/t-1`; realisierte Makro-/Goldwerte den Datenlabeljahrgang `t`; CAPE den letzten Wert `t-1`. Keine produktive Umschaltung erfolgte.
- `fallback_zero` nur innerhalb expliziter Manifestsegmente zugelassen. Das aktuelle Manifest hat keine solchen Segmente; vorhandene Goldnullen bleiben numerisch unveraendert und werden `unresolved`, statt als belegter Fallback oder echte Nullrendite umgedeutet zu werden.
- Vierjaehrigen Lookback fuer Aktienrendite und `endeVJ` bis `endeVJ_3` manifestiert. Daraus werden technische Bounds `1929-2025` abgeleitet; die Legacy-UI bleibt noch unveraendert.
- `preparePeriod()` fuer Single Paths und `prepareBatch()` fuer Cohort-Batches implementiert. Beide pruefen vor dem Konsum alle ganzzahligen Lookback-/Anfragejahre; die erste Luecke liefert `status='incomplete'` mit strukturiertem Grund. Einjahreslaeufe sind bei vollstaendigem Record zulaessig.
- `HISTORICAL_ASSIGNMENT_INVENTORY_V1` mit Legacy-Backtest-, aktivem Monte-Carlo-, alternativem `prepareHistoricalData()`- und V1-Proposal-Mapping angelegt.
- Zwei neue Testdateien fuer YearRecord/Perioden/Fehler/Instrumentation sowie Manifest/Hash/Unresolved/Non-Mutation angelegt. Die Rentenanpassungsmarker 1950/2000/2001 sind explizit eingefroren.
- `DATA_SOURCES.md`, `SIMULATOR_MODULES_README.md`, `TECHNICAL.md`, `tests/README.md`, Arbeitsplan und GAP-Analyse auf den tatsaechlichen Slice-03-Stand synchronisiert.

## Ausgefuehrte Tests

- `node --check app/simulator/historical-backtest-contract.js`: gruen.
- `node --check app/simulator/simulator-data.js`: gruen.
- `node --check tests/historical-backtest-contract.test.mjs`: gruen.
- `node --check tests/historical-data-manifest.test.mjs`: gruen.
- `node tests/run-single.mjs tests/historical-backtest-contract.test.mjs`: gruen, 146/146 Assertions.
- `node tests/run-single.mjs tests/historical-data-manifest.test.mjs`: gruen, 274/274 Assertions.
- `node tests/run-single.mjs tests/historical-data-robustness.test.mjs`: gruen, 3/3 Assertions.
- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`: gruen, 53/53 Assertions.
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`: gruen, 65/65 Assertions; keine Fixture-Deltas.
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`: gruen, 46/46 Assertions.
- `npm test`: gruen, 115 Testdateien, 5120/5120 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `git diff --check`: gruen.

## Ergebnisse

- Das Manifest enthaelt fuer jede Pflichtreihe alle geforderten Reproduzierbarkeitsfelder. Tests verhindern leere `known`-Werte und Wertebehauptungen unter `unresolved`.
- Der eingebettete Post-Normalisierungs-Datenbestand ist kanonisch gefingert; die browserkompatible SHA-256-Implementierung stimmt gegen Node-`crypto` und den bekannten `abc`-Vektor.
- Vollvalidierung und Recordaufbau finden nur bei einem neuen Revision-/Hash-Key statt. Ein zweiter Provideraufruf liefert denselben gecachten immutable Provider. Instrumentierte Year-/MC-/Sweep-/Cohort-Lookups loesen keine neue Vollvalidierung aus.
- Einzelpfad- und Cohort-Batch-Preflight erzeugen jeweils genau ein Instrumentationsereignis. Innerhalb des Preflights werden alle ganzzahligen Lookback-/Anfragejahre geprueft; es gibt keinen `continue`-Pfad im Contract.
- Fehlende Felder, nicht-finite Werte, nicht-positive MSCI-/CAPE-Level, `qualityStatus='missing'` und nicht manifestiertes `fallback_zero` liefern strukturierte Fehlercodes.
- D-02 is technisch umgesetzt: ein vollstaendiger Einjahreslauf enthaelt genau einen Record. NaN, Bruchjahre und rueckwaertige Perioden are Contractfehler.
- D-03 is technisch umgesetzt: alle sechs Reihen sind fuer einen vollstaendigen V1-Record Pflicht. Ungeklaerte, aber vorhandene Werte bleiben sichtbar `unresolved`; sie werden nicht still auf 0 gesetzt.
- Die produktive Simulation ist verhaltensneutral geblieben: Characterization- und Backtest-Oracles sowie die gesamte Suite sind unveraendert gruen.

## Abweichungen vom Plan

- `simulator-input-validation.js` wurde nicht geaendert. Perioden- und Boundsvalidierung liegen bewusst im DOM-freien Datencontract; die UI-Integration und Ersetzung der Legacy-Hardcodes sind Nicht-Scope dieses Slice und folgen in Slice 04/08.
- `tests/simulator-input-readers.test.mjs` wurde deshalb ebenfalls nicht geaendert, aber als fokussiertes Regressionsgate ausgefuehrt.
- `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md` und `tests/README.md` wurden zusaetzlich aktualisiert, weil ein neues Quellmodul und zwei neue Tests dokumentiert werden muessen.
- Das Manifest wurde ohne separates JSON angelegt und zaehlt zusammen mit Contract und zwei Tests als vier Programmdateien. Die Stop-Grenze von zehn Programmdateien bleibt eingehalten.

## Offene Risiken

- Ein Manifest mit `unresolved` verbessert Transparenz, aber nicht Datenvaliditaet.
- Gold-Nullwerte koennen echte Nullrendite oder Missingness bedeuten; keine automatische Umdeutung.
- Lookback-Anforderungen fuer ATH/Regime muessen von eigentlichen Returnjahren getrennt bleiben.
- Die technischen Bounds `1929-2025` umfassen den als `estimated` markierten Vor-1950-Bestand. Ob und wie Nutzer diese Jahre im Backtest waehlen duerfen, ist eine Produkt-/D-01-Folgeentscheidung und noch nicht in der UI aktiviert.
- Der SHA-256 bezieht sich auf den post-normalisierten Laufzeitbestand. Aenderungen an der deterministischen 1925-1949-Brueckentransformation erfordern bewusst eine neue Manifestrevision und einen neuen Hash.
- `HistoricalYearRecordV1` ist mit der vorgeschlagenen Zeitachse gebaut, aber noch nicht fachlich freigegeben. Eine D-01-Aenderung muss Record-Oracles und Manifestrevision bewusst aktualisieren.
- Der Legacy-Runner ist noch nicht an `preparePeriod()` angeschlossen; BT-02 bleibt im produktiven Pfad bis zur Folgeintegration beobachtbar. Das gleiche gilt fuer BT-20 im gemeinsamen `readYearReturnRates()`-Pfad.
- Providercache-Eintraege leben fuer die Modullaufzeit. Bei sehr vielen dynamisch erzeugten Manifestrevisionen koennte der Cache wachsen; der aktuelle Produktpfad verwendet genau eine eingebettete Revision.

## Rueckdokumentation

Manifest-ID/Revision/Hash, offene `unresolved`-Felder, Lookback/Bounds, Periodencontract, D-02/D-03-Implementierungsentscheidungen, Builderinventar, Testzahlen und die bewusst offenen BT-01-/BT-02-/BT-20-Integrationsgrenzen sind in Arbeitsplan und GAP-Analyse rueckgeschrieben. Modul-, Datenquellen- und Testreferenzen sind synchronisiert.

## Freigabestatus

Implementierung und Selbstpruefung abgeschlossen. Review durch Gemini und Freigabe durch den Nutzer stehen aus. Codex erteilt keine Eigenfreigabe und erstellt keinen Commit.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit (GAPs und Akzeptanzkriterien):**
   - **Manifest & Datenqualität:** Das Manifest in `simulator-data.js` enthält alle Reproduzierbarkeits- und Qualitätsmetadaten. Nicht-belegte Daten- und Quellbezüge sind explizit als `unresolved` mit `value: null` deklariert.
   - **V1-YearRecord & Zeitachsensynchronisation:** `HistoricalYearRecordV1` trennt realized-Werte von decision-as-of-Inputs. Die Bounds (1929-2025) werden korrekt aus dem lookback-Vertrag (4 Jahre) abgeleitet.
   - **Caching & Performance:** Der Contract-Provider validiert das Dataset einmalig beim Laden anhand des Content-Hashes und cacht das Ergebnis. Instrumentierte Leseoperationen in MC- und Sweep-Schleifen lösen keine erneute Validierung aus.
   - **Periodenvalidierung:** `preparePeriod` und `prepareBatch` führen einen Preflight über den gesamten angeforderten Zeitraum durch. Fehlende Jahre oder Datenfehler führen zu einem kontrollierten `incomplete`-Zustand statt stillen Überspringens (`continue`).

2. **Vertragstreue:**
   - Der Contract `historical-backtest-contract.js` ist vollständig DOM- und storage-frei.
   - Die browserkompatible `sha256Hex`-Implementierung wurde im Vergleichstest gegen das Node-native `crypto`-Modul und bekannte Testvektoren abgesichert.

3. **Fehlerbehandlung:**
   - Ungültige Perioden (NaN, Brüche, Rückwärtszeiträume) und ungültige MSCI- oder CAPE-Indikatorwerte (≤ 0, nicht-finit) werfen strukturierte `HistoricalDataContractError`-Exceptions.

4. **Seiteneffekte:**
   - Keine vorhandene Simulationszahl wurde verändert. Die MC- und Sweep-Datenpfade bleiben unangetastet. Die Modifikationen an `simulator-data.js` beschränken sich auf zusätzliche Metadaten.

5. **Was könnte brechen?**:
   - *Rekursionslimit bei kanonischer Serialisierung:* Die Funktion `canonicalizeHistoricalContractValue` besitzt keine Schleifenerkennung. Bei zyklischen Datenstrukturen käme es zu einem Stack Overflow. Da der historische Datenbestand eine flache, baumartige JSON-Struktur ist, besteht aktuell kein Fehler.
   - *Ressourcenbedarf bei Hash-Berechnung:* Die Serialisierung des gesamten Datensatzes erzeugt einen großen String, der anschließend in ein Byte-Array kopiert wird. Bei mobilen Browsern mit sehr geringem Arbeitsspeicher könnte dies temporär zu Speicherpeaks führen (wird jedoch nur einmalig bei Dataset-Initialisierung ausgeführt).

### 2. Pre-Mortem
Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Szenario:* Eine zukünftige Version des historischen Datenbestands führt eine zirkuläre Referenz oder eine nicht-datentypische Eigenschaft (wie ein Symbol oder eine Funktion) ein. Die kanonische Serialisierung `canonicalizeHistoricalContractValue` gerät in eine Endlosrekursion oder liefert abweichende String-Repräsentationen im Browser vs. Node, was zu fehlerhaften Content-Hashes führt. Dies blockiert den Anwendungsstart mit einem unauflösbaren `HISTORICAL_DATA_HASH_MISMATCH`, obwohl die eigentlichen Datenwerte korrekt sind.

### 3. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - *Zirkelbezüge in Daten:* Keine Schleifenerkennung in der kanonischen Serialisierung.
  - *Einmaliger Speicherbedarf:* SHA-256-Generierung über den gesamten Datenbestand benötigt ein kurzzeitiges Speicher-Deltamaximum auf WebView-Clients.
- **Pre-Mortem:** (Siehe Szenario oben - Endlosrekursion oder Hash-Mismatch bei Datensatzerweiterung mit komplexeren Objekten).

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| S03-IMPL | Codex | Manifest, V1-YearRecord, Cache, Perioden-/Batch-Preflight und Regressionsgates implementiert | freigegeben durch Gemini | 5120/5120 Assertions gruen; produktiver Pfad unveraendert |
