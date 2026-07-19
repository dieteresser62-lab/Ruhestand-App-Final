# Simulator-Backtest: Forschungs-, Daten-, Kosten- und Holdout-Protokoll

**Protokoll-ID:** `SimulatorBacktestResearchProtocolV1`<br>
**Stand:** 2026-07-19<br>
**Status:** `FV0 / blockiert`; Gate-Vertrag dokumentiert, keine bestaetigende
Studie gestartet<br>
**Scope:** FQ-01, FQ-02 und FQ-03; FV-G01 bis FV-G08<br>
**Feature-Branch der Gate-Dokumentation:**
`codex/simulator-backtest-gap-plan`<br>
**Produktcode:** unveraendert

## 1. Zweck und normative Grenzen

Dieses Protokoll operationalisiert die Forschungsgrenze des historischen
Backtests. Es ist ein Gate- und Inventarartefakt, kein Studienergebnis, keine
Vorregistrierung einer bereits lauffaehigen Studie und keine Freigabe fuer
Datenersetzung, Kosten-Cashflows, Policyvergleiche oder Holdoutauswertungen.

Normativ gelten gemeinsam:

- [Forschungsvalidierungs-Backlog](./FORSCHUNGSVALIDIERUNGS_BACKLOG.md),
  insbesondere FQ-01 bis FQ-03 und FV-G01 bis FV-G08;
- [Forschungs-Evidenzregister](../reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md),
  insbesondere MAP-12 und MAP-13;
- [Data Sources And Provenance](../reference/DATA_SOURCES.md) fuer den
  eingebetteten historischen Datensatz;
- [Architektur und Fachkonzept](../reference/ARCHITEKTUR_UND_FACHKONZEPT.md#e6-forschungs--und-modellrisiken)
  fuer FR-01 bis FR-03, FR-07, FR-08 und FR-12;
- `HistoricalBacktestExportV1` aus Slice 07 als Laufmanifest eines einzelnen
  explizit exportierten Laufs.

Die drei priorisierten Forschungsfragen bleiben offen:

| ID | Forschungsfrage | Status in diesem Protokoll |
| --- | --- | --- |
| FQ-01 | Wie aendern definierte Return-Indizes, Kosten und internationale Daten die Entnahmeergebnisse? | FV0; Daten-, Lizenz-, Kosten- und Owner-Gates blockiert |
| FQ-02 | Welche Guardrail-, VPW- oder CAPE-Verbesserungen halten auf unangetasteten Daten und Seeds? | FV0; historische Daten kontaminiert, Trial-Log nicht autorisiert, kein Custodian |
| FQ-03 | Wie oft, tief und lange werden Floor, Flex und Runway verletzt? | FV0; Metrik-Owner und studienspezifisches Ergebnisbuendel fehlen |

## 2. Rollen- und Freigabematrix

Ein Rollenname bedeutet eine konkret benannte Person oder Institution, nicht
nur eine generische Funktionsbezeichnung. `nicht benannt` ist deshalb ein
blockierender Status.

| Rolle | Aktuelle Besetzung | Verantwortung | Blockierwirkung |
| --- | --- | --- | --- |
| Nutzer / Auftraggeber | Nutzer | priorisiert Folgevorhaben, benennt Owner, genehmigt Scope und neue Persistenz | kann keine fachliche oder unabhaengige Freigabe ersetzen |
| Daten- und Kapitalmarktmethodik-Owner | nicht benannt | Indexvarianten, Quellen, Transformationen, Vergleichbarkeit und Datenqualitaet | blockiert FV-G02 und FQ-01 |
| Validierungs-/Statistik-Owner | nicht benannt | Hypothesen, Kandidatenraum, Multiple Testing, Trial- und Holdoutdesign | blockiert FV-G01, FV-G05, FV-G06 und FQ-02 |
| Ergebnis-/Risikometrik-Owner | nicht benannt | Metriken, Nenner, Schwellen und vollstaendiges Ergebnisbuendel | blockiert FV-G01, FV-G07 und FQ-03 |
| Holdout-Custodian | nicht benannt | Sperre, Zugriff, einmalige Freigabe und Kontaminationsregister | blockiert jede Holdoutzuordnung und -auswertung |
| Externer Steuer-/Rechtsreview | nicht benannt | Reichweite und Aktualitaet steuerlicher/rechtlicher Annahmen | blockiert Rechtsvollstaendigkeitsaussagen und FQ-01-Steuerteil |
| Unabhaengiger Methodenreview / Replikation | nicht benannt | Review ohne Beteiligung an Variantenwahl oder Implementierung | blockiert FV-G08 sowie FV4/FV5 |
| Implementer | Codex nur nach ausdruecklichem Folgeauftrag | technische Umsetzung eines freigegebenen Arbeitsdokuments | darf Methodik und eigene Ergebnisse nicht freigeben |

Gesamtstatus: Die Gate-Dokumentation ist umgesetzt, die Forschungsarbeit bleibt
`FV0 / blockiert`. Kein fehlender Rollenname wird durch Codex, Gemini, Claude
oder einen automatisierten Test still ersetzt.

## 3. Gate-Matrix FV-G01 bis FV-G08

| Gate | Aktueller Nachweis | Status | Owner / naechster Nachweis | Abbruch- oder Blockierwirkung |
| --- | --- | --- | --- | --- |
| FV-G01 Baseline und Protokoll | dieses Gate-Protokoll; technische Backtest-Baselines aus Slice 01 | teilweise dokumentiert, nicht eingefroren | zustaendige Fachowner muessen je FQ ein eigenes vorab reviewtes Studienprotokoll mit Hypothese, Population, Policies, Metriken, Schwellen, Seeds und Abbruchregeln einfrieren | keine bestaetigende Auswertung; heutige Ergebnisse duerfen keine nachtraegliche Hypothese begruenden |
| FV-G02 Datenmanifest | `HistoricalDataManifestV1`, Dataset `ruhestandsapp-historical-data-v1`, Revision `2026-07-18.1`, Content-Hash `8246422d98657c2a76b750ce9fd1253e01aa7a9a4dfa0f0f01dcb96b5507ef29` | technisch manifestiert, fachlich blockiert | Daten-/Kapitalmarktmethodik-Owner liefert genaue Varianten, Primaerquellen, Lizenzen, Abrufstaende und reproduzierbare Transformationen | keine Datenersetzung, internationale Vergleichsstudie oder staerkere Wirksamkeitsaussage |
| FV-G03 Kosten-/Steuervertrag | Modellgrenzen sind inventarisiert; kein studienspezifischer Annahmenvertrag | blockiert | Daten-/Kapitalmarktmethodik-Owner plus externer Steuer-/Rechtsreview frieren Werte, Zeitbezug und Sensitivitaetsbaender ein | keine Vergleichbarkeit zwischen Kostenbasen; keine Rechtsvollstaendigkeitsaussage; keine Kosten-Cashflows |
| FV-G04 Produktvertraege | technische Real-/Nominal-, Prozent-/Verhaeltnis- und Outcome-Vertraege sind dokumentiert und getestet | teilweise erfuellt | jeweiliger FQ-Owner friert das studienspezifische Parameter- und Einheitenwoerterbuch ein und weist UI/Runner/Worker/Export-Paritaet nach | bei Contract-Drift Abbruch; keine stillen Konvertierungen oder neue Engine-Semantik |
| FV-G05 vollstaendiges Trial-Log | Slice-07-Laufmanifest fuer einzelne explizite Exporte; kein historisches oder append-only Trial-Register | blockiert; Persistenz nicht autorisiert | Nutzerentscheid zu Speicher-/Datenschutzvertrag, danach eigenes Arbeitsdokument und Implementierungsslice | ein fehlender, ueberschreibbarer oder nachtraeglich selektierter Trial blockiert bestaetigende Aussagen |
| FV-G06 Holdout-Register | Kontaminationsinventar in Abschnitt 7; kein gesperrter Holdout und kein Custodian | blockiert | Custodian definiert Partitionen und Zugriff, bevor Implementer Ergebniswerte sehen; neue Daten werden vor Nutzung gehasht und gesperrt | heutige Historie darf nie als unangetasteter Holdout umgedeutet werden; vorzeitige Sicht macht eine Partition explorativ |
| FV-G07 Ergebnisbuendel | `HistoricalBacktestMetricsV1`, diskriminierte Outcomes, Raw-JSON und optionales Cohort-Inventar aus Slices 05 bis 07 | teilweise technisch vorhanden | Ergebnis-/Risikometrik-Owner definiert je FQ primaere/sekundaere Metriken, Unsicherheit, Stabilitaet und vollstaendige negative Resultate | nur Champion, Erfolgsquote oder Median zu berichten ist unzulaessig; Fehler und Abbrueche bleiben im Inventar |
| FV-G08 Reproduktion und Review | fokussierte technische Tests und Gesamtsuite; reproduzierbare Run-Fingerprints | blockiert | unabhaengiger Methodenreview sowie gegebenenfalls unabhaengige Code- oder Datenreplikation | Implementer-Selbstpruefung und gruene Tests sind keine Methodenfreigabe |

Keine Gate-Zeile besitzt aktuell den Status `erfuellt` fuer eine bestaetigende
FQ-Studie. Teilnachweise duerfen nur als technische Vorarbeiten zitiert werden.

## 4. Daten- und Lizenzinventar

### 4.1 Kanonischer technischer Stand

Der eingebettete Datensatz deckt 1925 bis 2025 ab. Die Jahre 1925 bis 1949
sind als `estimated` markiert. Fuer Backtests besteht ein vierjaehriger
Lookback; die technischen Periodengrenzen sind 1929 bis 2025. Das Manifest und
sein Hash machen diesen Stand reproduzierbar, belegen aber weder Herkunft noch
Nutzungsrecht.

| Offenes Feld | Aktueller Status | Benoetigter Owner | Naechster akzeptierter Nachweis | Blockierwirkung |
| --- | --- | --- | --- | --- |
| genaue `msci_eur`-Variante, einschliesslich Price/Net/Gross TR | `unresolved` | Daten-/Kapitalmarktmethodik-Owner | Primaerquellenbeleg, Indexname, Return-Typ, Waehrungsbehandlung, Datenstand und Lizenz | blockiert FQ-01-Baseline und internationale Vergleiche |
| Varianten von `inflation_de`, `zinssatz_de`, `lohn_de`, `gold_eur_perf` und `cape` | `unresolved` | Daten-/Kapitalmarktmethodik-Owner | eindeutige Reihen-/Indexkennungen mit Definition und Datenstand | blockiert fachlichen FV-G02-Abschluss |
| Quelle aller sechs Reihen | `unresolved` | Daten-/Kapitalmarktmethodik-Owner | Primaerquelle oder dokumentierte zulaessige Sekundaerkette je Serie und Segment | blockiert Datenersetzung und Replikation |
| Lizenz/Nutzungsrecht aller sechs Reihen | `unresolved` | Daten-/Kapitalmarktmethodik-Owner plus bei Bedarf Rechtsreview | Lizenztext, Nutzungsumfang, Weitergabe-/Speicherrecht und Pruefdatum | blockiert Integration oder Weitergabe neuer Datensaetze |
| Vor-1950-Quelle und Transformation | interne Reskalierung bekannt; externe Ursprungskette `unresolved` | Daten-/Kapitalmarktmethodik-Owner | reproduzierbares Transformationsskript/-protokoll, Rohdatenhashes, Bridge-Regel und Quellenbeleg | 1925-1949 bleiben `estimated` und duerfen nicht mit Baselinejahren gleichgesetzt werden |
| Gold-Nullwerte | 42 Jahre mit `quality=unresolved`: 1925-1932, 1934-1960 und 1962-1968 | Daten-/Kapitalmarktmethodik-Owner | Nachweis je Segment, ob echte Nullrendite, fehlender Wert oder gesetzte Annahme; anschliessend neue Manifestrevision | blockiert goldbezogene Wirksamkeits- und Holdoutaussagen; keine stille Null-/Missingness-Uminterpretation |
| CAPE-Region | `unresolved` | Daten-/Kapitalmarktmethodik-Owner | eindeutiger Markt-/Regionsbezug und Transformations-/Waehrungsvertrag | blockiert internationale CAPE- und Policyvergleiche |

Ein Nachweis aendert den Status erst in einer neuen, reviewten Manifestrevision.
Dieses Protokoll setzt kein Feld von `unresolved` auf `known`.

### 4.2 Regeln fuer Datenersetzung oder internationale Daten

Vor jeder Beschaffung, Ersetzung oder Integration muss ein eigenes
Arbeitsdokument bestehen. Es muss mindestens Dataset-IDs, Lizenzpruefung,
Rohdatenhashes, unveraenderte Rohablage, Transformationen, Missingness,
Vergleichbarkeit, Holdoutzuordnung, Migrations-/Rollbackgrenze und
Reproduktionschecks festlegen. Eine notwendige Engine-Semantikaenderung stoppt
das Vorhaben und benoetigt einen separaten fachlichen Entscheid.

## 5. Kosten- und Steuervertrag: Istinventar

Die Statuswerte bedeuten:

- `modelled`: als expliziter technischer Vertrag vorhanden, ohne Aussage ueber
  Rechts- oder Markt-Vollstaendigkeit;
- `not_modelled`: kein eigener Cashflow beziehungsweise Abzug im Backtest;
- `unresolved`: fachliche Annahme, Wert, Zeitbezug oder Sensitivitaet ist nicht
  fuer eine Studie eingefroren.

| Dimension | Status | Heutige Grenze | Pflicht vor FQ-01 |
| --- | --- | --- | --- |
| laufende Produktkosten / TER | `not_modelled` | kein eigener Kosten-Cashflow in Engine oder Simulator | Instrument-/Portfoliovertrag und vorab definiertes Sensitivitaetsband |
| Transaktionsgebuehren | `not_modelled` | keine simulierten Order-/Ausfuehrungsgebuehren; Realbestands-Reconcile ist kein Backtest-Kostenmodell | Gebuehrenmodell je Kauf/Verkauf oder Band mit Zeitbezug |
| Bid-Ask-Spread | `not_modelled` | kein Spread-Abzug | Asset-/Liquiditaetsabhaengiges Band oder explizit begruendete Vereinfachung |
| Slippage | `not_modelled` | kein Slippage-Cashflow | Ausfuehrungsannahme und Sensitivitaet |
| FX-Kosten | `not_modelled` | Datensatz/Portfolio werden EUR-nah behandelt; keine explizite Konvertierungskostenkette | Waehrungs- und Hedgevertrag, FX-Quelle und Kostenband |
| Rebalancing-Mechanik | `modelled` | operative Surplus-/opportunistische und 3-Bucket-Pfade sind implementiert | konkrete Baselinepolicy, Frequenz/Trigger und identische Regel ueber alle Vergleichslaeufe einfrieren |
| Rebalancing-Kosten | `not_modelled` | modellierte Trades erzeugen keine separaten Gebuehren-, Spread- oder Slippage-Cashflows | mit den drei Kostenpositionen gemeinsam definieren |
| Kapitalertragsteuer bei Verkaeufen | `modelled` | parametrisiertes Jahres-Settlement mit TQF, Pauschbetrag, Verlustvortrag und pauschaler KESt/Soli/KiSt-Logik | exakte Parameter, Rechtsstand und Sensitivitaet fuer die Studie einfrieren |
| Renten-Steuerquote | `modelled` | nutzerparametrisierter pauschaler Abzug, keine vollstaendige Veranlagung | Scope und Zusammenspiel mit Kapitalertragsteuer explizit definieren |
| Einkommensteuer, Sozialabgaben und vollstaendiger Rechtskontext | `not_modelled` | keine vollstaendige deutsche Steuer-/Abgabenrechnung | darf nur nach qualifiziertem externem Review erweitert oder als Rechtsmodell beschrieben werden |
| Steuerumfang der FQ-01-Studie | `unresolved` | implementierte Teilmodelle definieren noch keinen vollstaendigen Studien- oder Rechtsumfang | einbezogene Steuerarten, ausgeschlossene Rechtsfragen, Parameterstand und externer Reviewbedarf vorab festlegen |
| konstante versus zeitabhaengige Kosten-/Steuerwerte | `unresolved` | kein studienspezifischer Zeitvertrag | vor Ergebniseinsicht festlegen |
| Sensitivitaetsbaender | `unresolved` | keine fuer FQ-01 eingefrorenen Baender | Primaerband, Begruendung, Randwerte und Abbruchregel vorab registrieren |

Kosten-Cashflows koennen Rechen- und Engine-Semantik veraendern. Daher darf
dieses Dokument sie weder implementieren noch als harmlose Konfiguration
vorwegnehmen.

## 6. Trial-Schema und Persistenzgate

### 6.1 Dokumentarischer Zielvertrag `ResearchTrialRecordV1`

Das folgende Schema ist nur ein Pflichtfeldvertrag fuer ein spaeteres
Arbeitsdokument. Es ist nicht implementiert und autorisiert keine Persistenz.

| Feldgruppe | Pflichtinhalt |
| --- | --- |
| Identitaet | `schemaVersion`, unveraenderliche `trialId`, UTC-Zeit, `protocolId`, Protokollversion/-hash, Hypothesen-ID |
| Ausfuehrungsstand | Git-Commit oder freigegebener Codehash, Engine-Build-ID, Config-Fingerprint, Umgebung/Versionen |
| Daten | Dataset-ID, Revision, Content-/Manifest-Hash, Partitions-ID, Datenstufe `development`/`inner_validation`/`confirmatory_holdout`, Kontaminationsstatus |
| Kandidat | Baseline-/Kandidaten-ID, vollstaendiger vorab definierter Kandidatenraum, kanonische Parameter oder datenschutzkonformer reproduzierbarer Verweis |
| Zufall | Seed oder Seed-Liste, Sampler-/Generatorversion, Worker-/Chunkvertrag |
| Laufmanifest | Schema-ID/-Version, Request-ID, Run-ID und Fingerprint von `HistoricalBacktestExportV1` oder aequivalenter versionierter Runnervertrag |
| Ergebnis | diskriminiertes Outcome, Ergebnisbuendel-/Rohartefakthash, Fehlercode, Abbruchgrund und Status auch fuer verworfene/fehlgeschlagene Trials |
| Interaktion | manuelle Parameteraenderung, Ergebnisansicht, Export, Champion-Uebernahme, Wiederholung und Begruendung |
| Append-only-Integritaet | vorheriger Record-Hash, eigener Record-Hash, Autor/Prozess und eventuelle Korrektur als neuer Folgerecord statt Ueberschreiben |
| Datenschutz | Datenklasse, Speicherortklasse, Zugriffsrolle, Aufbewahrungs-/Loeschregel und Redaktionsstatus; keine lokalen absoluten Pfade im Forschungsartefakt |

### 6.2 Unterschied zum vorhandenen Laufmanifest

`HistoricalBacktestExportV1` beschreibt genau den explizit exportierten Lauf:
Request, Daten-/Temporal-/Engineprovenienz, Ergebnis, Metriken, Rohzeilen und
Fingerprint. Es weiss nicht, welche frueheren oder verworfenen Varianten
betrachtet wurden, ob ein Export unterlassen wurde, ob Parameter nach einer
Ergebnissicht geaendert wurden oder ob der Lauf einen Holdout beruehrte.

Deshalb gilt:

```text
vollstaendiges Runmanifest != vollstaendiges Trial-Log != Holdout-Nachweis
```

### 6.3 Nutzer-, Speicher- und Datenschutzentscheid

Der Nutzerauftrag fuer Slice 09 autorisiert nur Dokumentation. Persistentes
Trial-Tracking ist **nicht autorisiert**. Vor einer Implementierung muessen ein
eigener Arbeitsplan und ein ausdruecklicher Nutzerentscheid mindestens
Speicherort/-backend, lokale oder externe Verarbeitung, Verschluesselung und
Zugriff, sensible Inputfelder, Redaktion/Pseudonymisierung, Aufbewahrung,
Export/Portabilitaet, Korrektur-/Loeschvertrag, Recovery/Backup und
Append-only-Integritaet festlegen.

## 7. Kontaminations- und Holdoutregister

### 7.1 Aktuell kontaminierte beziehungsweise explorative Bereiche

| Bereich | Status | Begruendung |
| --- | --- | --- |
| eingebettete Historie 1925-2025 | explorativ/kontaminiert | Datenwerte sind im Repository sichtbar und wurden fuer Entwicklung, Tests und Backtests verwendet |
| technisch zulaessige Backtestfenster 1929-2025 | explorativ/kontaminiert | wiederholte Einzelpfade und Rolling Cohorts sind moeglich; historische Trial-Historie ist nicht vollstaendig rekonstruierbar |
| Segment 1925-1949 | explorativ, zusaetzlich `estimated` | Sichtbarkeit und Nutzung plus ungeklaerte externe Transformationskette |
| Rolling Cohorts | In-sample-Diagnose | Fenster ueberlappen und stammen aus demselben Datensatz; Outcomeanteile sind keine unabhaengige Erfolgswahrscheinlichkeit |
| Auto-Optimize Train-/Test-Seeds | modellintern, nicht externer Holdout | disjunkte Seeds nutzen denselben Generator und dieselbe Modell-/Datenbasis |
| bestehende Policies, Parameter, Metriken und Schwellen | entwicklungsbeeinflusst | sie wurden unter Kenntnis derselben Historie entworfen oder betrachtet |

Kein Teilzeitraum des eingebetteten Datensatzes darf nachtraeglich als
`unangetastet` bezeichnet werden. Unbekannte fruehere manuelle Trials werden im
Kontaminationsregister als `unknown_pre_registry_trials` gefuehrt, nicht als
nicht existent angenommen.

### 7.2 Regeln fuer einen kuenftigen bestaetigenden Holdout

1. Der Holdout-Custodian wird vor Datenzugriff namentlich benannt und ist nicht
   fuer Kandidatenwahl oder Implementierung verantwortlich.
2. Entwicklungs-, innere Validierungs- und bestaetigende Partitionen werden
   vor Einsicht versioniert, gehasht und im gesperrten Register beschrieben.
3. Der Implementer erhaelt vor Freigabe weder Rohwerte noch Ergebnisansichten
   des bestaetigenden Holdouts. Im Repository stehen hoechstens IDs, Hashes und
   Freigabestatus, keine konkreten Holdoutdaten.
4. Baseline, Kandidatenraum, Parameter, Metriken, Schwellen, Kosten-/Steuerbasis,
   Seeds, Abbruchregeln und Auswerteskript sind vor der einmaligen Freigabe
   eingefroren.
5. Jede vorzeitige Einsicht oder nachtraegliche Aenderung kontaminiert die
   Partition. Sie wird explorativ; eine bestaetigende Wiederholung erfordert
   einen neuen unangetasteten Holdout.
6. Negative, instabile, fehlgeschlagene und abgebrochene Resultate werden mit
   demselben Gewicht inventarisiert wie guenstige Ergebnisse.

Moegliche kuenftige Daten aus neuen Kalenderjahren oder neuen Laender-/Index-
Datensaetzen sind nicht automatisch Holdouts. Sie werden es nur durch einen
vorherigen Custodian-, Lizenz-, Partitions- und Protokollvertrag.

## 8. Zulässige und gesperrte Aussageformen

Fuer den aktuellen Produkt- und Dokumentationsstand sind nur folgende
Kurzformen zulaessig, jeweils mit engem Kontext:

| Zulaessige Form | Pflichtkontext |
| --- | --- |
| `historische In-sample-Diagnose` | Zeitraum, Datasetrevision, ueberlappende Fenster und Kontamination nennen |
| `technisch getestet` | getesteter Contract, Version und Testgrenze nennen; kein externer Wirksamkeitsbezug |
| `unter diesen Annahmen beobachtet` | Daten-, Kosten-/Steuer-, Policy-, Haushalts-, Horizont- und Metrikannahmen nennen |

Aktuell gesperrt sind insbesondere `sicher`, `optimiert`, `robust`, `senkt das
Risiko`, `verbessert die Entnahme`, `out-of-sample bestaetigt`, `unabhaengig
validiert`, `fuer deutsche Haushalte geeignet`, `Safe Withdrawal Rate` als
Produkteigenschaft und jede Zukunftsgarantie. Auch statistisch guenstige Werte
heben diese Sperre nicht automatisch auf.

## 9. Entscheidung ueber das naechste Folgearbeitsdokument

Derzeit ist kein Produktcode-Folgevorhaben aus FQ-01 bis FQ-03 ausfuehrbar.
Nach Benennung des Daten-/Kapitalmarktmethodik-Owners ist als naechstes nur ein
reines Inventar- und Entscheidungsarbeitsdokument zulaessig:

`FQ01_DATEN_KOSTEN_INVENTAR_PLAN.md`

Es darf zunaechst keine Produktdatei aendern und muss die offenen Varianten,
Quellen, Lizenzen, Transformationen, Gold-Missingness sowie den Kosten-/
Steuerannahmenvertrag mit Abbruchregeln klaeren. Datenersetzung,
internationaler Datasetimport und Kosten-Cashflows benoetigen danach jeweils
ein eigenes reviewtes Folgearbeitsdokument und einen eigenen Feature-Branch.

Ein `FQ02_TRIAL_REGISTER_HOLDOUT_PLAN.md` ist erst nach ausdruecklicher
Nutzerautorisierung des Speicher-/Datenschutzvertrags und Benennung von
Validierungs-Owner sowie Holdout-Custodian zulaessig. FQ-03 benoetigt vor einem
eigenen Arbeitsdokument einen benannten Ergebnis-/Risikometrik-Owner. Keine
dieser Bedingungen ist durch Slice 09 erfuellt.

## 10. Abbruch- und Aenderungsvertrag

Die Arbeit stoppt und bleibt blockiert, wenn ein `unresolved`-Feld ohne Beleg
auf `known` gesetzt, ein betrachteter Zeitraum als unangetastet ausgegeben,
Trial-Persistenz ohne Nutzerentscheid implementiert, ein Owner durch eine
Rollenbezeichnung simuliert, Kosten-/Steuersemantik still geaendert oder eine
gesperrte Wirksamkeitsaussage verwendet werden soll.

Jede Aenderung dieses Protokolls benoetigt eine neue Protokollversion mit
Aenderungsgrund. Eine Statusanhebung der FQ- oder FV-Gates erfolgt erst nach
dem jeweils geforderten Artefakt, unabhaengigem Review und Nutzerfreigabe.
