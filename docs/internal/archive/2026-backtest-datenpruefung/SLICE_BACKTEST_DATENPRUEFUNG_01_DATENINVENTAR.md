# Slice 01 - Dateninventar, Evidenzklassen und Quell-Gates

**Uebergeordneter Arbeitsplan:** `BACKTEST_2000_2025_DATENPRUEFUNG.md`  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Entscheidung:** Nutzerauftrag vom 2026-07-29: bestehender Branch,
kein neuer Branch  
**GitHub-Status:** kein Upstream fuer den aktiven Branch eingetragen; Remote-
Status in der lokalen Sandbox nicht verifizierbar  
**Status:** technisch abgeschlossen; Review ausstehend  
**Freigabe:** ausstehend; Codex nimmt keine Selbstfreigabe vor

## Ziel

Slice 01 schafft einen vollstaendigen maschinen- und menschenlesbaren
Inventarvertrag fuer die sechs eingebetteten historischen Reihen und die
produktiv verwendeten statischen Datenklassen. Er trennt technische
Reproduzierbarkeit, Evidenzklasse und externe Validierung. Ungeklaerte
Quellen-, Lizenz- oder Abrufangaben bleiben explizit `unresolved`.

## Akzeptanzkriterien

1. Alle sechs historischen Reihen besitzen eigene Qualitaetssegmente und die
   Pflichtfelder Quelle, Reihenkennung, Einheit, Waehrung, Jahreskonvention,
   Transformation, Lizenz, Abrufdatum und Hash.
2. Die produktiven statischen Datenklassen fuer Mortalitaet, Pflege,
   Hinterbliebene, Steuern/Tranchen, Rente/Sozialversicherung,
   Stress/Regime und Default-/Fallbackwerte sind mit Implementierungsort und
   Evidenzklasse inventarisiert.
3. `unresolved` enthaelt keinen erfundenen Wert und kann weder als
   `externally_validated` noch als freigegebene Ersatzquelle gelten.
4. Extern beobachtete Daten, abgeleitete Werte, Modellannahmen,
   Schaetzungen, Nutzerparameter und Stressparameter tragen verschiedene
   Evidenzklassen.
5. Eingebettete Werte werden durch kanonische `embeddedValueHash`-
   SHA-256-Fingerprints gegen unbeabsichtigte Drift gesichert. Ein nicht
   vorhandener externer `rawDataHash` bleibt davon getrennt `unresolved`.
6. Historische Zahlen, Engine-Semantik und produktive Simulationsergebnisse
   bleiben unveraendert.
7. Manifest-, Contract- und Dokumentationstests sowie die Gesamtsuite
   bestehen.

## Scope

- neuer DOM-freier `SimulationDataInventoryV1`-Contract;
- reihenspezifische Qualitaetssegmente fuer die sechs historischen Reihen;
- statische Klasseninventur mit Implementierungsabdeckung;
- Validierungs- und Quell-Gates;
- Contracttests und Referenzdokumentation;
- Rueckdokumentation in Arbeitsplan und Testkatalog.

## Nicht im Scope

- Austausch oder Korrektur historischer Zahlen;
- neue externe Rohdaten oder deren Paketierung;
- Aenderung der Engine-, Steuer-, Pflege-, Mortalitaets-, Stress- oder
  Fallbacksemantik;
- Umbenennung produktiver Reihen oder Consumer;
- `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- Freigabe, Commit oder Push.

## Branch-, Status- und Diff-Risiko vor Coding

Ausgefuehrt am 2026-07-29:

```text
git branch --show-current
codex/suite-datenintegritaet-hardening

git status --short
 M RuheStandSuite.exe
?? docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
```

Die geaenderte EXE und das neue Arbeitsdokument lagen vor Slice-Beginn im
Arbeitsbaum. Die EXE wird nicht angefasst. Das Arbeitsdokument ist der vom
Nutzer beauftragte Hauptplan und wird nur um Branch- und Slice-Status ergaenzt.

```text
Geplante Dateien:
- app/simulator/simulation-data-inventory.js
- tests/simulation-data-inventory.test.mjs
- tests/historical-data-manifest.test.mjs
- docs/reference/DATA_SOURCES.md
- README.md
- docs/reference/TECHNICAL.md
- docs/reference/SIMULATOR_MODULES_README.md
- tests/README.md
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_01_DATENINVENTAR.md

Voraussichtliche Aenderungstiefe:
- mittel

Gefaehrdete bestehende Tests:
- historical-data-manifest.test.mjs
- historical-backtest-contract.test.mjs
- historical-backtest-export.test.mjs
- Dokumentations-/Architektur-Contracttests

Nicht anfassen:
- historische Zahlen in app/simulator/simulator-data.js
- Engine-Semantik und engine.js
- dist/
- RuheStandSuite.exe
- vorhandene nutzerseitige Aenderungen ausserhalb des Slice-Scope

Rollback-Strategie:
- neue Datei app/simulator/simulation-data-inventory.js nach Freigabe
  explizit entfernen
- neue Datei tests/simulation-data-inventory.test.mjs nach Freigabe
  explizit entfernen
- git checkout -- tests/historical-data-manifest.test.mjs
  docs/reference/DATA_SOURCES.md docs/reference/SIMULATOR_MODULES_README.md
  tests/README.md
- Hauptplan und diese Slice-MD nur nach ausdruecklicher Freigabe entfernen
  oder zuruecksetzen
```

Keine Stop-Regel greift: eine neue Programmdatei bleibt deutlich unter der
Zehn-Dateien-Grenze; der Slice aendert weder Engine-Semantik noch
`minimumFlexAnnual`, UI-/Engine-Parameternamen oder Backtestzahlen.

## Geplante Tests

- `node tests/run-single.mjs tests/simulation-data-inventory.test.mjs`
- `node tests/run-single.mjs tests/historical-data-manifest.test.mjs`
- `node tests/run-single.mjs tests/historical-backtest-contract.test.mjs`
- `node tests/run-single.mjs tests/historical-backtest-export.test.mjs`
- `npm test`

`npm run build:engine` ist nicht vorgesehen, weil weder `engine/` noch die
oeffentliche `EngineAPI` geaendert werden.

## Durchgefuehrte Aenderungen

1. `app/simulator/simulation-data-inventory.js` fuehrt den tief
   unveraenderlichen `SimulationDataInventoryV1`-Contract mit:
   - sechs historischen Reihen und eigenen, lueckenlosen
     1925-2025-Qualitaetssegmenten;
   - den sieben geforderten statischen Kategorien;
   - getrennten Evidenzklassen fuer offizielle/abgeleitete/backtested/proxy-,
     Schaetz-, Modellannahme-, Nutzerinput-, Stress-, Missing- und
     Unresolved-Zustaende;
   - Pflichtfeldern fuer Quelle, externe Reihenkennung, Einheit, Waehrung,
     Jahreskonvention, Transformation, Lizenz, Abrufdatum, externen
     Rohdatenhash und eingebetteten Wertfingerprint;
   - fail-closed Gates fuer erfundene Provenienz, unbelegte externe
     Validierung, Datenersatz und Hashdrift.
2. `rawDataHash` und `embeddedValueHash` bleiben bewusst getrennt:
   - fehlt die externe Rohquelle, bleibt `rawDataHash` `unresolved`;
   - `embeddedValueHash` sichert nur den aktuellen In-App-Wert und damit die
     technische Reproduzierbarkeit.
3. Die bereits produktiv verwendeten Regimegrenzen wurden ohne
   Wertveraenderung als `REGIME_CLASSIFICATION_THRESHOLDS` aus
   `simulator-data.js` exportiert und vom bestehenden Initialisierungspfad
   weiterverwendet.
4. Der neue Contracttest prueft Vollstaendigkeit, Segmentabdeckung,
   statische Kategorien, Evidenztrennung, alle eingebetteten Wertfingerprints,
   lokale UI-/Steuerdefaults sowie Negativpfade.
5. Der bestehende `HistoricalDataManifestV1`-Test prueft zusaetzlich die
   Bruecke zum weiteren Inventar, ohne den aktiven Runtime-Manifestvertrag
   umzudeuten.
6. `README.md`, `DATA_SOURCES.md`, `TECHNICAL.md`,
   `SIMULATOR_MODULES_README.md` und `tests/README.md` dokumentieren
   Modulgrenze, Evidenzvokabular, Quell-Gate und Testabdeckung.
7. Der Hauptplan dokumentiert Nutzerentscheid, aktiven Branch, Slice-Link und
   technischen Abschlussstatus.

## Ergebnisse

Ausgefuehrt am 2026-07-29:

| Befehl | Ergebnis |
| --- | --- |
| `node tests/run-single.mjs tests/simulation-data-inventory.test.mjs` | gruen; 404/404 Assertions |
| `node tests/run-single.mjs tests/historical-data-manifest.test.mjs` | gruen; 304/304 Assertions |
| `node tests/run-single.mjs tests/historical-backtest-contract.test.mjs` | gruen; 169/169 Assertions |
| `node tests/run-single.mjs tests/historical-backtest-export.test.mjs` | gruen; 57/57 Assertions |
| `npm test` | gruen; 138 Dateien, 10.326/10.326 Assertions, 0 fehlgeschlagene Assertions/Dateien, 0 offene Handles |
| `git diff --check` | gruen; keine Whitespace-Fehler |

Der erste `npm test`-Aufruf wurde nach rund einer Sekunde durch ein zu knappes
Tool-Zeitlimit beendet und danach mit normalem Laufzeitfenster vollstaendig
und erfolgreich wiederholt. Dies war kein Testfehler.

`npm run build:engine` wurde wie geplant nicht ausgefuehrt: `engine/`, die
oeffentliche `EngineAPI`, `engine.js`, `dist/` und Releaseartefakte wurden
nicht durch den Slice geaendert.

Die Regimegrenzen, alle historischen Reihenhashes, der abgeleitete
Regime-Transitionshash und saemtliche bestehenden Backtestvertraege blieben
identisch. Ein Vorher-/Nachher-Backtest und `FlowDelta` sind deshalb fuer
diesen nicht wertveraendernden Evidenzslice nicht anwendbar.

## Abweichungen vom Plan

- Der Hauptplan sah urspruenglich
  `codex/historical-data-and-backtest-corrections` als neuen Branch vor. Der
  Nutzer hat am 2026-07-29 ausdruecklich entschieden, im vorhandenen Branch
  `codex/suite-datenintegritaet-hardening` zu bleiben.
- Die technische Detailplanung sah zunaechst einen einzigen neuen
  Contractpfad vor. Fuer eine hashbare, nicht duplizierte
  Regimeklassifikation wurde zusaetzlich `simulator-data.js` rein strukturell
  angepasst; Schwellen und Ergebnisse blieben unveraendert.
- `README.md` und `TECHNICAL.md` wurden wegen der neuen Architekturgrenze
  zusaetzlich in den Dokumentationsscope aufgenommen.

## Offene Risiken

- Ein Inventar belegt noch keine externe Richtigkeit der eingebetteten Werte.
- Ungeklaerte Quell- und Lizenzketten blockieren weiterhin die
  wertveraendernden Datenslices.
- Die Inventur sichert die benannten produktiven Datenklassen und ihre
  Implementierungsorte. Neue statische Datenklassen koennen weiterhin
  ausserhalb des Inventars entstehen, wenn spaetere Aenderungen den
  Vollstaendigkeitstest nicht mitpflegen.
- Der `HistoricalDataManifestV1` bleibt der aktive Backtest-Runtimevertrag;
  `SimulationDataInventoryV1` ist in Slice 01 ein Evidenz- und Aenderungsgate,
  noch kein zusaetzlicher Exportbestandteil.

## Rueckdokumentation in den Arbeitsplan

Branch-Entscheidung, Slice-Link, technischer Abschluss und die weiterhin
offenen Evidenz-/Lizenz-Gates sind in
`BACKTEST_2000_2025_DATENPRUEFUNG.md` nachgetragen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| S01-1 | Claude | Zweite, abweichende Regimeklassifikation ausserhalb des Inventars | offen | ausstehend |
| S01-2 | Claude | `engine_policy_defaults` inventarisiert die gesamte `CONFIG` als eine Blackbox | offen | ausstehend |
| S01-3 | Claude | Evidenzklasse laesst sich still hochstufen | offen | ausstehend |
| S01-4 | Claude | Vollstaendigkeit ist Konvention, nicht Vertrag | offen | ausstehend |
| S01-5 | Claude | Fail-Closed-Quote gemessen: 8 von 9 Mutationen erkannt | offen | ausstehend |
| S01-6 | Claude | Wertneutralitaet nur durch Konstruktion belegt, nicht durch Referenzlauf | offen | ausstehend |

## Review-Feedback von Claude

**Reviewdatum:** 2026-07-29
**Reviewer:** Claude (Primary reviewer & Analyst)
**Pruefgegenstand:** Arbeitsbaumstand des Slices 01 auf
`codex/suite-datenintegritaet-hardening`, Basiscommit `ca982cf`, nicht
committet
**Methode:** adversariales Review nach `CLAUDE.md`. Gesucht wurde nicht die
Bestaetigung, dass das Inventar funktioniert, sondern der Weg, auf dem es
seinen eigenen Zweck verfehlt.

### Verifikationsbasis

Alle Angaben stammen aus eigener Messung am Arbeitsbaum, nicht aus der
Uebernahme des Abschnitts `Ergebnisse`.

| Nachweis | Ergebnis |
| --- | --- |
| `npm test` | 10.326 von 10.326 Assertions, 138 Dateien, 0 fehlgeschlagene Assertions und Dateien, 0 offene Handles; deckungsgleich mit der Protokollangabe |
| `npm run docs:evidence` | bestanden |
| `git diff --check` | keine Whitespace-Fehler |
| Diff-Umfang | 2 neue Programmdateien, 1 geaenderte Programmdatei, 6 Dokumentations-/Testdateien; `engine/`, `dist/` und `RuheStandSuite.exe` unberuehrt |
| Wertneutralitaet des `simulator-data.js`-Diffs | geprueft: `5.0` zu `5`, `0` zu `0`, `-0.15`, `0.15` und das Labelarray sind identisch; `regimes` wird ausschliesslich lesend verwendet, das nun eingefrorene Array nirgends mutiert |
| Evidenzklassen-Trennung | 10 verschiedene Klassen ueber 6 Reihen und 17 statische Eintraege; Akzeptanzkriterium 4 erfuellt |
| Ehrlichkeit der Reihenbewertung | alle sechs historischen Reihen tragen `evidenceClass: unresolved` und `externalValidationStatus: unresolved`; keine erfundene Provenienz gefunden |
| Quell-Gate | `evaluateSimulationDataSourceGate('msci_eur')` liefert `technicallyReproducible: true`, `externallyValidated: false`, `replacementAllowed: false`, `unresolvedFields: [source, seriesIdentifier, license, retrievedAt]`; Akzeptanzkriterium 3 erfuellt |

### Fail-Closed-Messung

Neun Mutationen an Produktivdaten und am Inventar, jeweils einzeln eingespielt
und danach zurueckgerollt. Alle drei beruehrten Quelldateien wurden nach dem
Lauf byteidentisch verifiziert.

| Mutation | Ergebnis |
| --- | --- |
| `msci_eur` 2024 von 2500 auf 2510 | erkannt |
| `inflation_de` 2024 von 2,5 auf 2,2 | erkannt |
| `equityBoomRatio` von 0,15 auf 0,16 | erkannt |
| `CONFIG.THRESHOLDS.STRATEGY.absoluteMinLiquidity` von 10000 auf 12000 | erkannt |
| Sterbetafel `m/18` von 0,0008 auf 0,0009 | erkannt |
| erfundene Quelle fuer `msci_eur` | erkannt |
| `externalValidationStatus` ohne Beleg auf `externally_validated` | erkannt |
| Qualitaetssegment-Luecke, Endjahr 2025 auf 2024 | erkannt |
| `evidenceClass` von `unresolved` auf `official` | **unbemerkt** |

### S01-1 (mittel) Zweite, abweichende Regimeklassifikation ausserhalb des Inventars

`app/simulator/simulator-portfolio-historical.js:46` klassifiziert Regime mit
anderen Schwellen als der nun extrahierte und gehashte Vertrag:

| Groesse | `REGIME_CLASSIFICATION_THRESHOLDS` | `simulator-portfolio-historical.js:46` |
| --- | --- | --- |
| Stagflationsgrenze Inflation | groesser 5 | groesser 4 |
| Renditebezug fuer Stagflation | nominal | real |
| BEAR-Schwelle | kleiner -0,15 | kleiner -0,10 |

Zeile 51 derselben Datei dupliziert zusaetzlich das Labelarray ein zweites Mal.
Die Datei ist produktiv erreichbar ueber `app/simulator/simulator-portfolio.js:13`
und wird aus `auto_optimize.js:272`, `simulator-main-init.js:42`,
`simulator-engine-helpers.js:82` und `simulator-main-sweep-selftest.js:23`
aufgerufen. In keiner `implementationLocations` des Inventars taucht sie auf;
`regime_classification_thresholds` nennt ausschliesslich
`app/simulator/simulator-data.js:REGIME_CLASSIFICATION_THRESHOLDS`.

Ausdrueckliche Entwarnung zur Ergebniswirkung: `prepareHistoricalData()`
beginnt mit `if (annualData.length > 0) return;`, und die
Initialisierungs-IIFE in `simulator-data.js` fuellt `annualData` bereits beim
Modulladen. Der abweichende Zweig ist heute nicht erreichbar und veraendert
kein Ergebnis.

Warum der Befund trotzdem zaehlt:

1. Die Begruendung im Abschnitt `Abweichungen vom Plan`, die Extraktion diene
   einer nicht duplizierten Regimeklassifikation, trifft nachweislich nicht zu.
2. `tests/historical-data-robustness.test.mjs:27` leert `annualData` bereits
   heute, wenn auch im `finally` wiederhergestellt. Die Vorbedingung des
   abweichenden Zweigs ist damit nicht rein hypothetisch.
3. Slice 12 soll die Regimegrenzen pruefen und wuerde sich auf die
   `implementationLocations` des Inventars stuetzen. Die zweite Kopie bliebe
   unangetastet.

### S01-2 (mittel) `engine_policy_defaults` inventarisiert die gesamte CONFIG als eine Blackbox

Der Eintrag besitzt genau eine `implementationLocation`
(`engine/config.mjs:CONFIG`), eine Evidenzklasse `model_assumption` und einen
Hash ueber das Gesamtobjekt. Darin verschwinden genau die Parameter, die das
Korrekturprogramm namentlich adressieren muss:

| Parameter | Befund im Hauptplan | Sichtbarkeit im Inventar |
| --- | --- | --- |
| `THRESHOLDS.STRATEGY.absoluteMinLiquidity` mit 10000 | D-02 | nur als Teil des CONFIG-Hashes |
| `ANTI_PSEUDO_ACCURACY.QUANTIZATION_TIERS` | D-13 | nur als Teil des CONFIG-Hashes |
| `runwayGuardrailActivationPct`, `runwayCoverageMinPct` | Slice 8 | nur als Teil des CONFIG-Hashes |

Akzeptanzkriterium 4 verlangt getrennte Evidenzklassen fuer unterschiedliche
Datenarten. Bei dieser Granularitaet ist das fuer den umfangreichsten Eintrag
nicht einloesbar: eine Quantisierungsregel, eine Liquiditaetskonstante und eine
Guardrail-Schwelle sind fachlich verschiedene Dinge. Zusaetzlich bricht der
Gesamthash bei jeder spaeteren Konfigaenderung, ohne zu benennen, welcher Wert
sich geaendert hat.

Empfehlung: `engine_policy_defaults` vor Slice 8 in benannte Untereintraege
zerlegen, mindestens fuer die oben genannten drei Gruppen.

### S01-3 (mittel) Die Evidenzklasse laesst sich still hochstufen

`validateEntry` prueft `evidenceClass` nur gegen das erlaubte Vokabular. Es
gibt keine Regel, die eine starke Klasse an den Aufloesungsstatus von `source`
oder `seriesIdentifier` bindet. Gemessen: die Aenderung von `unresolved` auf
`official` bei unveraendert `source: unresolved()` passiert Validator und
Gesamtsuite unbemerkt.

Ausdrueckliche Entwarnung zur Tragweite: Das maschinelle Gate bleibt
geschlossen. `evaluateSimulationDataSourceGate` liefert weiterhin
`replacementAllowed: false`, weil `unresolvedFields` nichtleer bleibt, und der
Folgeschritt auf `externalValidationStatus: externally_validated` wird mit
`SIMULATION_DATA_EXTERNAL_VALIDATION_UNPROVEN` blockiert. Die Luecke betrifft
die menschenlesbare Etikettierung im Inventar, in `DATA_SOURCES.md` und in
kuenftigen Exporten, nicht die Ersetzungsfreigabe.

Empfehlung: `official`, `derived` und `backtested` nur zulassen, wenn `source`
und `seriesIdentifier` den Status `known` tragen.

### S01-4 (mittel) Vollstaendigkeit ist Konvention, nicht Vertrag

Kein Produktivmodul importiert `simulation-data-inventory.js`; der einzige
Treffer ausserhalb von `tests/` ist die Datei selbst. Die Abdeckung der
statischen Klassen wird ueber eine im Test hartkodierte Zuordnungstabelle
(`tests/simulation-data-inventory.test.mjs:182` bis `:206`) geprueft. Eine neue
statische Datenklasse kann produktiv entstehen und verwendet werden, ohne dass
ein Test fehlschlaegt.

Die Slice-MD benennt dieses Risiko unter `Offene Risiken` selbst. Ich stufe es
hoeher ein als dort formuliert, weil das gesamte Programm der Slices 2 bis 13
auf dieser Abdeckung aufbaut und S01-1 zeigt, dass die Luecke nicht erst
kuenftig entsteht, sondern heute schon besteht.

### S01-5 (leicht) Gemessene Fail-Closed-Quote

Acht von neun Mutationen wurden erkannt, darunter alle Aenderungen an
historischen Werten, an der Sterbetafel, an einer CONFIG-Konstante, an den
Regimeschwellen sowie erfundene Provenienz, unbelegte externe Validierung und
eine Segmentluecke. Das ist ein belastbarer Driftschutz und deutlich mehr als
der Slice zusagen musste. Die einzige Luecke ist S01-3.

### S01-6 (leicht) Wertneutralitaet nur durch Konstruktion belegt

Akzeptanzkriterium 6 verlangt unveraenderte Simulationsergebnisse. Der
Abschnitt `Ergebnisse` verzichtet mit Verweis auf die Wertneutralitaet auf
einen Vorher-/Nachher-Backtest und auf `FlowDelta`. Ich habe die
Wertneutralitaet des Diffs unabhaengig nachgelesen und bestaetige sie; fuer
diesen Evidenzslice ist der Verzicht vertretbar.

Ab Slice 2 ist er es nicht mehr. Uebergreifende Regel 7 des Hauptplans
verlangt fuer jeden wertveraendernden Slice einen Vorher-/Nachher-Vergleich
festgelegter Referenzlaeufe. Diese Referenzlaeufe sind bis heute nicht
festgelegt. Sie sollten vor Slice 2 benannt werden, sonst wiederholt sich das
Muster aus P-03 des Hauptplans: ein Abnahmekriterium ohne pruefbare Grundlage.

### Geprueft und verworfen

| Verdacht | Ergebnis |
| --- | --- |
| Der Refactor koennte die Regimeeinstufung veraendern | widerlegt; alle vier Schwellen und das Labelarray sind wertidentisch, die Gesamtsuite bleibt gruen |
| Das eingefrorene `labels`-Array koennte eine Mutation ausloesen | widerlegt; `regimes` wird nur mit `forEach` gelesen, `REGIME_DATA` wird separat in `simulator-data.js:503` deklariert |
| Der `embeddedValueHash` koennte tautologisch gegen sich selbst pruefen | widerlegt; der Test importiert die produktiven Objekte einschliesslich `HISTORICAL_DATA`, `MORTALITY_TABLE` und `CONFIG` und hasht sie zur Laufzeit |
| Der Branchwechsel koennte ein Regelverstoss sein | kein Befund; der Verbleib im bestehenden Branch ist eine dokumentierte Nutzerentscheidung und in Kopf und Abweichungsabschnitt festgehalten |
| Die Slice-Nummerierung koennte 0-basiert sein | kein Befund; Slice 01 ist 1-basiert |

### Pre-Mortem

Angenommen, dieser Slice verursacht in drei Monaten einen Fehler: Slice 12
prueft die Regimegrenzen und stuetzt sich dabei auf die
`implementationLocations` des Inventars, die genau eine Fundstelle ausweisen.
Die abweichende Klassifikation in `simulator-portfolio-historical.js` bleibt
unangetastet. Entfernt oder verschiebt ein spaeterer Refactor die
Waechterbedingung `annualData.length > 0`, kippt die Regimeverteilung auf die
uninventarisierten Schwellen. Der Hash ueber `REGIME_CLASSIFICATION_THRESHOLDS`
bestaetigt dann weiterhin einen Vertrag, der nicht mehr gilt, und die
Gesamtsuite bleibt gruen.

## Review-Ergebnis (Claude)

- Status: **freigegeben**
- Blocker: keine
- Auflage vor Slice 12: S01-1 aufloesen, also die zweite Regimeklassifikation
  entweder entfernen oder als eigene `implementationLocation` mit eigenem
  Vertragswert inventarisieren
- Auflage vor Slice 8: S01-2 aufloesen, also `engine_policy_defaults` in
  benannte Untereintraege zerlegen
- Auflage vor Slice 2: die in uebergreifender Regel 7 geforderten
  Referenzlaeufe festlegen (S01-6)
- Restrisiken: S01-1 bis S01-6
- Pre-Mortem: Slice 12 prueft die inventarisierte, aber inaktive
  Regimeklassifikation und uebersieht die zweite, abweichende Kopie
