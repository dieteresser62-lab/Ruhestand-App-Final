# Überarbeitungsplan: Architektur und Fachkonzept

**Stand:** 2026-07-15
**Zieldokument:** docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
**Planart:** Dokumentationsüberarbeitung in mehreren 1-basierten Slices
**Status:** Slice 8 implementiert – Abschlussfreigabe U-08 ausstehend
**Feature-Branch:** codex/architektur-fachkonzept-doku
**GitHub-Status:** Branch nur lokal angelegt; Veröffentlichung und Push sind nicht beauftragt
**Änderungsart:** ausschließlich Dokumentation; keine Änderung der Engine-Semantik oder des Laufzeitcodes

## 1. Auftrag und Prozessentscheidung

Die zentrale Datei ARCHITEKTUR_UND_FACHKONZEPT.md soll auf fachliche und
technische Vollständigkeit überarbeitet werden. Marktvergleich und
wissenschaftliche Einordnung sollen deutlich mehr Raum, eine nachvollziehbare
Methodik und eine belastbare Quellenbasis erhalten.

Für diese reine Dokumentationsarbeit gilt auf ausdrückliche Entscheidung des
Nutzers vom 2026-07-15:

- Gemini- und Claude-Reviews sind nicht erforderlich.
- Der Nutzer prüft und erteilt die notwendigen Zwischen- und
  Abschlussfreigaben direkt.
- Codex bleibt Autor und Implementer der Dokumentationsänderungen und erteilt
  keine Eigenfreigabe.
- Codex erstellt entsprechend der Projektrollen keine Git-Commits. Ein Commit
  erfolgt durch den Nutzer oder einen vom Nutzer ausdrücklich bestimmten
  Abnahmeweg.
- Ein Push oder die Veröffentlichung des Branches erfolgt erst nach
  ausdrücklicher Nutzerfreigabe.

Diese Prozessentscheidung ersetzt für diesen dokumentationsreinen Auftrag die
Gemini-/Claude-Reviewstufen, nicht aber Branch-, Scope-, Diff-, Status- und
Freigabedokumentation.

## 2. Ausgangslage

Die Bestandsaufnahme vom 2026-07-15 ergab:

| Bereich | Aktueller Umfang | Anteil am Dokument |
| --- | ---: | ---: |
| Übersicht | 191 Zeilen | 6,2 % |
| Technische Architektur | 904 Zeilen | 29,4 % |
| Fachliche Algorithmen | 1.566 Zeilen | 50,9 % |
| Marktvergleich | 158 Zeilen | 5,1 % |
| Forschungsabgleich | 112 Zeilen | 3,6 % |
| Appendix und Quellen | 145 Zeilen | 4,7 % |

Marktvergleich und Forschungsabgleich umfassen zusammen nur 8,7 % des
Dokuments. Der Marktvergleich ist überwiegend eine Feature-Matrix. Der
Forschungsabgleich besteht aus kurzen Einzelzuordnungen mit einer noch zu
schmalen wissenschaftlichen Quellenbasis.

Zusätzlich ist der Metastand nicht vollständig aktuell:

- Der Dokumentkopf nennt einen Codeabgleich bis 2026-07-04.
- Aktuell vorhanden sind 36 Balance-JS-Module und 107 Testdateien; im
  Zieldokument stehen noch 35 beziehungsweise 101.
- Nach dem ausgewiesenen Stand wurden Engine-Verträge, der Balance-
  Jahresworkflow und das Tranchenmanagement weiter gehärtet.
- Einzelne neue Verträge sind bereits punktuell nachgezogen, aber noch nicht zu
  einem konsistenten Architektur- und Fachbild zusammengeführt.

## 3. Zielbild

Das überarbeitete Dokument soll:

1. als eigenständige zentrale Architektur- und Fachlektüre ausreichen;
2. den aktuellen technischen Stand und die maßgeblichen Datenverträge korrekt
   wiedergeben;
3. Fachannahmen, Rechnungszeitpunkte, Grenzen und Modellrisiken ausdrücklich
   dokumentieren;
4. Konkurrenzprodukte methodisch fair und reproduzierbar vergleichen;
5. wissenschaftliche Grundlagen, eigene Adaptionen und experimentelle
   Heuristiken sauber voneinander trennen;
6. Aussagen durch Primärquellen, offizielle Produktquellen oder klar markierte
   Unsicherheiten absichern;
7. eigene Stärken und Grenzen gleichermaßen sichtbar machen;
8. trotz der Erweiterung navigierbar und redaktionell wartbar bleiben.

Als redaktioneller Orientierungswert sollen Marktvergleich und
wissenschaftliche Einordnung zusammen ungefähr 20 bis 25 % des inhaltlichen
Hauptdokuments einnehmen. Die wissenschaftliche Einordnung soll größer sein als
der Marktvergleich. Dieser Wert ist kein Selbstzweck; Quellenqualität und
Aussagekraft haben Vorrang vor Zeilenzahl.

## 4. Scope

### 4.1 Primärer Scope

- docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
- diese übergeordnete Arbeitsplan-MD
- vor Beginn jedes Slices die zugehörige Slice-MD unter docs/internal
- bei nachgewiesenem Konsistenzbedarf weitere Markdown-Referenzen, insbesondere:
  - README.md
  - docs/reference/TECHNICAL.md
  - docs/reference/DATA_SOURCES.md
  - docs/reference/BALANCE_MODULES_README.md
  - docs/reference/SIMULATOR_MODULES_README.md
  - docs/reference/TRANCHEN_MODULES_README.md
  - engine/README.md
  - tests/README.md

Sekundärreferenzen werden nur geändert, wenn dies zur Beseitigung eines
konkreten Widerspruchs erforderlich ist. Das Zieldokument bleibt der
Hauptbearbeitungsort.

### 4.2 Nicht-Scope

- keine Änderungen an JS-, MJS-, HTML-, CSS-, Rust-, JSON- oder Build-Dateien;
- keine Änderung fachlicher Engine-Semantik;
- keine neuen Produktfunktionen;
- keine manuelle Änderung generierter Artefakte wie engine.js, dist oder
  RuhestandSuite.exe;
- keine Änderung von Tests oder Snapshots;
- keine Behauptung, dass eine dokumentierte Strategie wissenschaftlich
  validiert sei, wenn nur Implementierungs- oder Plausibilitätsnachweise
  vorliegen;
- keine Übernahme personenbezogener Finanzdaten, lokaler Exporte oder Logs.

## 5. Verbindliche Arbeits- und Evidenzregeln

### 5.1 Trennung der Aussagearten

Jede zentrale Aussage muss einer der folgenden Ebenen zuordenbar sein:

| Ebene | Bedeutung |
| --- | --- |
| Externe Evidenz | Ergebnis einer konkret belegten wissenschaftlichen oder institutionellen Quelle |
| Offizielle Produktinformation | öffentlich dokumentierte Funktion eines Konkurrenzprodukts |
| Implementierungsstand der Suite | im aktuellen Repository oder in verbindlichen Referenzen nachweisbar |
| Eigene Adaption | bekannte Methode, die in der Suite verändert oder kombiniert wurde |
| Heuristik | fachlich begründete, aber nicht extern validierte Regel |
| Experimentell | optionale Policy oder Stressannahme ohne belastbaren Wirksamkeitsnachweis |
| Schlussfolgerung | ausdrücklich als Interpretation oder Inferenz gekennzeichnet |

Literaturergebnisse dürfen nicht als Messergebnisse der Ruhestand-Suite
dargestellt werden, solange kein eigener reproduzierbarer Vergleichslauf
dokumentiert ist.

### 5.2 Marktquellen

- Zeitabhängige Preis-, Tarif- und Featureangaben erhalten Abrufdatum und
  untersuchte Produktstufe.
- Funktionsaussagen werden bevorzugt aus offiziellen Produktseiten,
  Hilfecentern, Methodikseiten oder Handbüchern belegt.
- Sekundärreviews dienen nur für subjektive UX-, Lernkurven- oder
  Nutzungseindrücke und werden als solche gekennzeichnet.
- „Nicht öffentlich dokumentiert“ ist nicht gleichbedeutend mit „nicht
  vorhanden“.
- Exklusivitätsaussagen werden auf die tatsächlich untersuchte Stichprobe
  begrenzt.

### 5.3 Wissenschaftliche Quellen

- Peer-reviewte Publikationen, Originalarbeiten, offizielle Statistiken und
  institutionelle Methodenberichte haben Vorrang.
- Practitioner Research, Bücher und Community-Quellen werden als eigene
  Evidenzstufen ausgewiesen.
- Quellen erhalten soweit verfügbar Autor, Titel, Jahr, Publikation,
  DOI beziehungsweise dauerhaften Link und Abrufdatum.
- Zentrale Aussagen werden nahe am Text belegt und nicht nur in einer
  unspezifischen Schlussliste gesammelt.
- Abweichungen zwischen Literaturmethode und Suite-Implementierung werden
  ausdrücklich beschrieben.

### 5.4 Aktualität und Reproduzierbarkeit

- Bestandszahlen werden mit Datum und reproduzierbarem Ermittlungsweg versehen.
- Code-, API-, Daten- und Quellenstände werden getrennt ausgewiesen.
- Zeitabhängige Vergleiche erhalten eine Aktualisierungsnotiz.
- Eigene Beispiel- oder Benchmarkfälle müssen synthetisch und reproduzierbar
  sein.

## 6. Lokale und externe Quellenbasis

### 6.1 Lokale Source of Truth

- package.json für Laufzeit- und Buildkommandos;
- README.md für Produkt- und Funktionsüberblick;
- docs/reference/TECHNICAL.md für technische Abläufe und Datenflüsse;
- die Modul-READMEs für aktuelle Modulgrenzen;
- engine/README.md für EngineAPI und Engine-Verträge;
- tests/README.md für Testbestand und Validierung;
- docs/reference/DATA_SOURCES.md für Datenherkunft und offene
  Provenienzfragen;
- aktuelle Quellmodule und Tests ausschließlich lesend zur
  Plausibilisierung konkreter Aussagen;
- abgeschlossene Arbeitsdokumente unter docs/internal/archive als
  Entscheidungsnachweis, nicht als Laufzeit-Source-of-Truth.

### 6.2 Externe Quellenbasis

Die externe Recherche erfolgt erst in den dafür vorgesehenen Slices und umfasst:

- offizielle Produkt- und Methodikseiten der Vergleichswerkzeuge;
- Primärliteratur zur Ruhestandsentnahme und Lifecycle Finance;
- Primärliteratur zu Bootstrap, Regime-Modellen, Tail-Risiken,
  Optimierungs- und Backtest-Risiken;
- offizielle deutsche Quellen zu Steuern, Rente, Sterblichkeit und Pflege;
- belastbare institutionelle Arbeiten zu Safe Withdrawal, flexiblen
  Entnahmen, Langlebigkeit und Pflegekosten.

Die konkrete Produkt- und Literaturliste wird vor ihrer Ausarbeitung dem Nutzer
als Freigabepunkt vorgelegt.

## 7. Umsetzungspakete

| Slice | Kurztitel | Hauptziel | Nutzerfreigabe |
| ---: | --- | --- | --- |
| [1](SLICE_ARCHITEKTUR_FACHKONZEPT_01_BESTAND_STRUKTUR.md) | Bestand und Zielgliederung | belastbare Baseline und neue Dokumentstruktur | Gliederung und Scope |
| [2](SLICE_ARCHITEKTUR_FACHKONZEPT_02_ARCHITEKTUR_CONTRACTS.md) | Architekturstand und Härtungs-Contracts | aktuellen technischen Stand kohärent nachziehen | erteilt am 2026-07-15 |
| [3](SLICE_ARCHITEKTUR_FACHKONZEPT_03_FACHKONZEPT_MODELLGRENZEN.md) | Fachkonzept, Annahmen und Modellgrenzen | fachliche Grundlagen und Grenzen vervollständigen | erteilt am 2026-07-15 |
| [4](SLICE_ARCHITEKTUR_FACHKONZEPT_04_MARKT_METHODIK.md) | Methodik und Stichprobe des Marktvergleichs | fairen und reproduzierbaren Vergleichsrahmen festlegen | erteilt am 2026-07-15 |
| [5](SLICE_ARCHITEKTUR_FACHKONZEPT_05_MARKTVERGLEICH_POSITIONIERUNG.md) | Marktanalyse und Positionierung | Vergleich recherchieren, belegen und ausgewogen formulieren | erteilt am 2026-07-15 |
| [6](SLICE_ARCHITEKTUR_FACHKONZEPT_06_FORSCHUNG_RAHMEN_QUELLEN.md) | Wissenschaftlicher Rahmen und Quellenkorpus | Evidenzsystem und Literaturbasis aufbauen | erteilt am 2026-07-15 |
| [7](SLICE_ARCHITEKTUR_FACHKONZEPT_07_FORSCHUNGSABGLEICH_VERTIEFUNG.md) | Wissenschaftliche Tiefeneinordnung | Algorithmen systematisch gegen Evidenz und Grenzen abgleichen | erteilt am 2026-07-15 |
| [8](SLICE_ARCHITEKTUR_FACHKONZEPT_08_INTEGRATION_ABSCHLUSS.md) | Redaktionelle Integration und Abschlussvalidierung | Gesamtwerk konsolidieren, prüfen und abschließen | Gesamtfreigabe ausstehend |

Vor Beginn jedes Slices wird die eigene Slice-MD mit Branch, Status,
Diff-Risiko, Akzeptanzkriterien und geplantem Validierungsweg erstellt.

## 8. Slice 1 – Bestand und Zielgliederung

**Geplante Slice-Datei:**
docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_01_BESTAND_STRUKTUR.md

### Aufgaben

- aktuellen Dokument-, Code-, Modul-, Test- und API-Stand reproduzierbar
  erfassen;
- veraltete Momentaufnahmen, Dopplungen und widersprüchliche Aussagen
  markieren;
- aktuelle Kapitelstruktur auf Navigierbarkeit und thematische Balance prüfen;
- neue Zielgliederung einschließlich Glossar, Annahmenregister,
  Modellrisiken, Marktvergleich und wissenschaftlicher Einordnung entwerfen;
- festlegen, welche Detailinventare im Hauptdokument bleiben und welche nur
  referenziert werden;
- redaktionelle Umfangsziele und Quellenformat festlegen.

### Akzeptanzkriterien

- alle Bestandszahlen besitzen Datum und Ermittlungsweg;
- die Zielgliederung deckt Architektur, Fachkonzept, Markt und Forschung
  vollständig ab;
- Marktvergleich und Forschung sind eigenständige, ausreichend tiefe
  Hauptbereiche;
- keine Laufzeit- oder Engine-Semantik wird geändert;
- der Nutzer hat die Zielgliederung vor Slice 2 freigegeben.

### Ergebnis

- freigegebene Zielgliederung;
- aktualisierte Metadaten- und Inventarbasis;
- dokumentierte Liste zu entfernender, zu ersetzender und zu erweiternder
  Inhalte.

## 9. Slice 2 – Architekturstand und Härtungs-Contracts

**Geplante Slice-Datei:**
docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_02_ARCHITEKTUR_CONTRACTS.md

### Aufgaben

- Drei-Schichten- und Laufzeitarchitektur auf den aktuellen Stand bringen;
- Engine-Eingabe-, Ergebnis-, Settlement- und Fehlerverträge konsistent
  beschreiben;
- periodengebundenen Balance-Jahresprozess als Zustandsfolge dokumentieren:
  Vorprüfung, Flush, Recovery-Snapshot, Mutation, Validierung, Abschluss oder
  Recovery;
- Persistenz, Import-Recovery, Korruptionsbehandlung und Tauri-Quarantäne
  zusammenhängend erklären;
- Profilverbund-Attribution, profilbezogenes Steuer-Settlement und
  Haushalts-Reconciliation darstellen;
- kanonischen Tranchenvertrag, Provenienz, Schreibgrenzen und bestätigten
  Realbestandsabgleich integrieren;
- Live-Daten, Stichtage, Fallbacks und Provenienz präzisieren;
- „buildbar“, „validiert“ und „ausgeliefert“ bei Plattformangaben trennen;
- Datenschutz- und Netzwerkgrenzen sachlich korrekt formulieren;
- geeignete kleine Architekturübersichten beziehungsweise Zustandsdiagramme
  ergänzen.

### Akzeptanzkriterien

- die seit 2026-07-04 nachgezogenen Härtungen sind kohärent beschrieben;
- Schreib- und Ownership-Grenzen zwischen Balance, Simulator, Engine,
  Profilen, Tranchen und Persistenz sind eindeutig;
- Fail-safe-, Fallback- und fail-closed-Verhalten werden nicht vermischt;
- Plattform- und Datenschutzaussagen sind nachweisbar und nicht absoluter als
  die Implementierung;
- betroffene Referenzdokumente widersprechen dem Hauptdokument nicht;
- der Nutzer hat den Architekturblock freigegeben.

### Ergebnis

Slice 2 wurde am 2026-07-15 dokumentarisch umgesetzt. Das Hauptdokument
beschreibt nun Laufzeit- und Ownership-Grenzen, Engine- und
Settlement-Contracts, den atomaren Jahresprozess, Persistenz-/Recovery-Pfade,
Profilverbund- und Tranchenattribution, Datenprovenienz sowie Plattform-,
Netzwerk- und Datenschutzgrenzen. Nachgewiesene Widersprüche wurden zusätzlich
in `README.md`, `docs/reference/TECHNICAL.md` und
`docs/reference/DATA_SOURCES.md` korrigiert. Laufzeitcode, Tests, Builds und
generierte Artefakte blieben unverändert.

Die Umsetzungs- und Validierungsdetails stehen in
[`SLICE_ARCHITEKTUR_FACHKONZEPT_02_ARCHITEKTUR_CONTRACTS.md`](SLICE_ARCHITEKTUR_FACHKONZEPT_02_ARCHITEKTUR_CONTRACTS.md).
Die implementierungsseitigen Kriterien sind abgearbeitet; der Nutzer hat Slice
2 am 2026-07-15 ausdrücklich freigegeben. Der gemeinsame Freigabepunkt U-03
für Architektur- und Fachkonzeptblock wurde nach Abschluss von Slice 3 am
2026-07-15 ebenfalls durch den Nutzer erteilt.

## 10. Slice 3 – Fachkonzept, Annahmen und Modellgrenzen

**Geplante Slice-Datei:**
docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_03_FACHKONZEPT_MODELLGRENZEN.md

### Aufgaben

- Glossar für Floor, Flex, Bedarf, reale und nominale Werte, Runway,
  Reserve, Erfolg, Ruin und Pflegebucket ergänzen;
- Rechnungs- und Zeitkonventionen dokumentieren:
  Jahresanfang und Jahresende, Inflation, Rentenzufluss, Verkäufe,
  Steuer-Settlement, Tod und Pflegeereignisse;
- Anlagenmodell, Asset-Grenzen und Zielgruppenabgrenzung aktualisieren;
- Gebühren, Transaktionskosten, Währungen, Datenrekonstruktion und
  Steuer-/Regulierungsänderungen als Annahmen oder Grenzen einordnen;
- Modellrisiko- und Annahmenregister ergänzen;
- bekannte Einschränkungen ausbauen;
- zentrale Fachinvarianten und die Beziehung zwischen Floor-Flex,
  Guardrails, VPW, Runway, Steuern, Rente und Pflege verständlich
  zusammenführen;
- operative Nutzerentscheidung und automatische Policy klar trennen.

### Akzeptanzkriterien

- zentrale Begriffe und Rechnungszeitpunkte sind eindeutig;
- Annahmen, Implementierungsgrenzen und echte Produktfunktionen sind
  voneinander getrennt;
- keine neue fachliche Semantik wird durch Dokumenttext erfunden;
- jeder Widerspruch, der nur durch eine Codeänderung lösbar wäre, wird als
  Stop-Punkt an den Nutzer gemeldet;
- der Nutzer hat Fachkonzept und Modellgrenzen freigegeben.

### Umsetzungsergebnis

Slice 3 wurde am 2026-07-15 dokumentationsseitig implementiert. Das
Hauptdokument enthält nun verbindliches Glossar, Rechnungs-/Ereigniszeitachse,
Rentenkonvention, zentrale Fachinvarianten, die Trennung von
Nutzerentscheidungen und automatischen Policies sowie einen eigenen Bereich
für Zielgruppe, Asset-Grenzen, Reserven, Annahmen, Modellrisiken,
Ergebnisinterpretation und Validierungsstufen.

Der Source-of-Truth-Abgleich korrigierte insbesondere veraltete Steuer-,
Pflege-, Renten- und Ergebnisbeschreibungen. Zwei zunächst gemeldete
Code-/UI-Widersprüche – die doppelt skalierte Pflegekosten-Drift und die nicht
deflationierte Simulator-KPI `jahresentnahme_real` – werden auf ausdrückliche
Nutzerentscheidung dokumentationsrein als PD-02 beziehungsweise PD-01 geführt.
Die zu breite UI-Bezeichnung der Depoterschöpfungsmetrik ist als PD-03 ergänzt.
Es wurde keine Laufzeitsemantik geändert.

Die notwendigen Konsistenzkorrekturen betrafen neben dem Hauptdokument
`README.md`, `docs/reference/TECHNICAL.md` und
`docs/reference/SIMULATOR_MODULES_README.md`. Details, Validierung und
Nutzerentscheidung stehen in
[`SLICE_ARCHITEKTUR_FACHKONZEPT_03_FACHKONZEPT_MODELLGRENZEN.md`](SLICE_ARCHITEKTUR_FACHKONZEPT_03_FACHKONZEPT_MODELLGRENZEN.md).
Die implementierungsseitigen Kriterien sind abgearbeitet. Der Nutzer hat U-03
am 2026-07-15 mit „Die Nutzerfreigabe u-03 ist erteilt“ freigegeben. Slice 4
bleibt bis zu einer separaten Beauftragung unangetastet.

## 11. Slice 4 – Methodik und Stichprobe des Marktvergleichs

**Geplante Slice-Datei:**
docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_04_MARKT_METHODIK.md

### Aufgaben

- Recherchezeitraum, Auswahlregeln und Vergleichsgrenzen definieren;
- Vergleichswerkzeuge nach Segmenten ordnen:
  Consumer Planner, deutsche Vorsorge-/Entnahmewerkzeuge,
  Beratersoftware, Open-Source-/FIRE-Werkzeuge und Offline-/Tabellenlösungen;
- Produktstichprobe mit Begründung vorschlagen;
- einheitlichen Kriterienkatalog entwickeln:
  Fachmodell, Steuern, Rente, Pflege, Haushalt, Datenbasis,
  Stochastik, Transparenz, Szenarien, Optimierung, Datenschutz,
  Offline-Fähigkeit, Export, Auditierbarkeit, UX, Barrierefreiheit,
  Preis und Lizenz;
- Bedeutungen von vorhanden, teilweise, nicht dokumentiert und nicht
  vorhanden verbindlich festlegen;
- synthetischen Referenzhaushalt für einen reproduzierbaren
  Modellierbarkeitsvergleich definieren;
- Quellen- und Abrufdatumschema festlegen.

### Akzeptanzkriterien

- Produktkategorien werden nicht unreflektiert miteinander vermischt;
- Kriterien sind fachlich definiert und für alle Produkte gleich;
- unklare oder nicht öffentliche Funktionen erhalten keinen negativen
  Tatsachenstatus;
- Produktstichprobe, Kriterien und Referenzfall sind vor Slice 5 vom Nutzer
  freigegeben.

### Umsetzungsergebnis

Slice 4 wurde am 2026-07-15 dokumentationsseitig implementiert. Der bisherige
Altvergleich mit undatierten Preis- und Featureangaben, Symbolwertungen,
Reviewer-Zitaten und unbelegten Exklusivitätsaussagen wurde durch einen
reproduzierbaren Methodenrahmen ersetzt. Er trennt fünf Produktsegmente,
verzichtet auf Gesamtscore und Rangliste und definiert ein konservatives
Statuslexikon einschließlich neutraler Evidenzlücken.

Als Maximum-Variation-Stichprobe sind zehn externe Werkzeuge plus
Ruhestand-Suite vorgeschlagen: ProjectionLab Premium, Boldin PlannerPlus, BVI
Entnahme-Rechner, Finanzfluss Entnahmeplan, Digitale Rentenübersicht,
MoneyGuide, eMoney Pro, FI Calc, FIRECalc 3.0 und Pralana Gold. Alle 18
Plankriterien wurden operationalisiert. Der synthetische Referenzhaushalt
RH-01 besitzt feste Personen-, Zeit-, Einkommens-, Ausgaben-, Portfolio-,
Kosten- und Steuer-Testparameter; RH-02 bis RH-04 prüfen Sequenzstress, Pflege
und Hinterbliebenenwirkung.

Recherchefenster, Vergleichsstichtag, Quellenhierarchie, Quellenrecord,
Suchpfad, Austauschregeln und zulässige Aussageformen sind verbindlich
definiert. Die offizielle Rekognoszierung vom 2026-07-15 belegt nur
Produktidentität, Stufe und Segment; sie nahm noch keine Funktionsbewertung aus
Slice 5 vor. Details und Validierungsnachweise stehen in
[`SLICE_ARCHITEKTUR_FACHKONZEPT_04_MARKT_METHODIK.md`](SLICE_ARCHITEKTUR_FACHKONZEPT_04_MARKT_METHODIK.md).
Die implementierungsseitigen Kriterien sind abgearbeitet. Der Nutzer hat U-04
am 2026-07-15 mit „U-04 ist freigegeben“ erteilt und Slice 5 anschließend
separat beauftragt. Dessen Umsetzungsergebnis ist im folgenden Abschnitt
rückdokumentiert.

## 12. Slice 5 – Marktanalyse und Positionierung

**Geplante Slice-Datei:**
docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_05_MARKTVERGLEICH_POSITIONIERUNG.md

### Aufgaben

- freigegebene Produktstichprobe anhand offizieller Quellen recherchieren;
- Preis, Produktstufe, Funktionsstand und Abrufdatum dokumentieren;
- Vergleichsmatrix mit Zellbelegen beziehungsweise eindeutigen
  Quellenverweisen erstellen;
- Referenzhaushalt auf Modellierbarkeit und nicht nur Feature-Vorhandensein
  untersuchen;
- Konkurrenzstärken sichtbar machen, etwa Visualisierung,
  Szenarioeditoren, Integrationen, Kollaboration, Beraterfunktionen oder
  breitere Asset-Unterstützung;
- Stärken, Grenzen und strategische Lücken der Ruhestand-Suite ausgewogen
  gegenüberstellen;
- Differenzierungsmerkmale auf die untersuchte Stichprobe begrenzen;
- Werbe- und Reviewer-Zitate entfernen oder eindeutig als subjektive
  Sekundäreindrücke kennzeichnen;
- Positionierung und Nicht-Zielsegmente der Suite formulieren;
- Aktualisierungsroutine für volatile Produktdaten ergänzen.

### Akzeptanzkriterien

- jede wesentliche Wettbewerbsbehauptung ist belegt oder als Unsicherheit
  markiert;
- Vergleich und Positionierung enthalten sowohl Vor- als auch Nachteile;
- keine unbeschränkte Exklusivitätsbehauptung bleibt stehen;
- der Marktvergleich ist methodisch nachvollziehbar und reproduzierbar;
- der Nutzer hat den Marktvergleich freigegeben.

### Umsetzungsergebnis

Slice 5 wurde am 2026-07-15 dokumentationsseitig implementiert. Der
Marktblock enthält nun:

- den eingefrorenen Preis-, Stufen-, Zugangs- und Lizenzstand für die
  Ruhestand-Suite und zehn externe Produkte;
- stufenscharfe Quellenrecords mit Abrufdatum, Evidenzklasse, Fundstelle und
  Einschränkung;
- segmentierte K-01-bis-K-18-Matrizen mit Quellen-ID in jeder Zelle und ohne
  Score oder Rangliste;
- eine konservative Modellierbarkeitskarte für RH-01 bis RH-04 ohne
  numerischen Scheinvergleich;
- getrennte Segmentbefunde mit belegten Wettbewerberstärken;
- eine begrenzte Positionierung der Suite, strategische Lücken,
  Nicht-Zielsegmente und eine turnusmäßige Aktualisierungsroutine.

Die Erhebung nutzte nur öffentlich zugängliche offizielle Quellen und die
lokale Source of Truth; es wurden keine Käufe, Registrierungen, Demo- oder
Beraterzugänge verwendet. Besonders wichtige eigene Grenzen sind die nur
näherungsweise abbildbaren festen Referenzereignisse, fehlende vollständige
Einkommensteuer-/Sozialabgabenlogik, kein allgemeiner
Side-by-side-Planvergleich, fehlende formale UX/WCAG-Prüfung und
widersprüchliche Lizenzmetadaten. Details und Validierungsnachweise stehen in
SLICE_ARCHITEKTUR_FACHKONZEPT_05_MARKTVERGLEICH_POSITIONIERUNG.md.

Die inhaltliche Implementierung von Slice 5 ist abgeschlossen. Der Nutzer hat
U-05 am 2026-07-15 mit „U-05 freigegeben“ erteilt und Slice 6 anschließend am
selben Tag separat beauftragt.

## 13. Slice 6 – Wissenschaftlicher Rahmen und Quellenkorpus

**Geplante Slice-Datei:**
docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_06_FORSCHUNG_RAHMEN_QUELLEN.md

### Aufgaben

- Evidenzstufen und Zitierstandard verbindlich definieren;
- wissenschaftliches Quellenkorpus aufbauen für:
  - Safe Withdrawal und dynamische Entnahmen;
  - Guyton-Klinger, risikobasierte Guardrails und VPW/RMD;
  - Floor-and-Upside, Safety-first, Lifecycle Finance und Konsumglättung;
  - Sequence-of-Returns-, Langlebigkeits- und Verrentungsrisiko;
  - Bootstrap, Regime-Modelle, Fat Tails und Stressmodelle;
  - Backtest-, Optimierungs-, Data-Snooping- und Overfitting-Risiken;
  - CAPE und langfristige Renditeerwartungen;
  - Pflege, Mental Accounting und Selbstversicherung;
  - Cash-, Bond-, Gold- und Bucket-Strategien;
  - deutsche Sterblichkeit, Rente, Pflege und relevante offizielle Daten;
- Quellen nach Primärliteratur, institutioneller Forschung, Practitioner
  Research, Fachbuch und Community-Quelle klassifizieren;
- pro Suite-Mechanismus eine Evidenz-Mapping-Struktur vorbereiten.

### Akzeptanzkriterien

- die Quellenbasis geht deutlich über Morningstar-, Kitces- und
  Community-Artikel hinaus;
- zentrale Methoden besitzen mindestens eine geeignete Primär- oder
  institutionelle Quelle, soweit verfügbar;
- Quellenqualität und Übertragbarkeit auf die Suite werden bewertet;
- Quellenkorpus und Evidenztaxonomie sind vor Slice 7 vom Nutzer
  freigegeben.

### Umsetzungsergebnis

Slice 6 ist inhaltlich umgesetzt. Kapitel E des Hauptdokuments definiert acht
Quellenklassen, drei Evidenzstufen, vier Übertragbarkeitsklassen sowie einen
Zitier- und Versionsstandard. Das thematisch gegliederte Korpus umfasst 55
eindeutige Records aus wissenschaftlichen, offiziellen, institutionellen,
fachpraktischen und Community-Quellen. Eine Mapping-Matrix ordnet 17 zentrale
Suite-Mechanismen den einschlägigen Quellen und den in Slice 7 zu prüfenden
Fragen zu. Unzureichend kontextualisierte Literaturzahlen und Gleichsetzungen
aus dem vorherigen Forschungsblock wurden nicht übernommen.

Die Detailnachweise, Grenzen und Validierungsergebnisse stehen in
`SLICE_ARCHITEKTUR_FACHKONZEPT_06_FORSCHUNG_RAHMEN_QUELLEN.md`. Der Nutzer hat
U-06 am 2026-07-15 mit „U-06 freigegeben“ erteilt und Slice 7 anschließend
separat beauftragt. Dessen Umsetzungsergebnis ist im folgenden Abschnitt
rückdokumentiert.

## 14. Slice 7 – Wissenschaftliche Tiefeneinordnung

**Geplante Slice-Datei:**
docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_07_FORSCHUNGSABGLEICH_VERTIEFUNG.md

### Aufgaben

- für jeden zentralen Mechanismus dokumentieren:
  Forschungsgrundlage, Suite-Umsetzung, Abweichung, Evidenzstatus,
  Validierung und Restrisiko;
- Literaturergebnisse strikt von eigenen Suite-Ergebnissen trennen;
- bestehende Ergebnisübernahmen prüfen, insbesondere die in der aktuellen
  Kitces-Tabelle der Suite zugeschriebenen Rückgangswerte;
- Safe-Withdrawal-Aussagen mit Horizont, Asset-Allokation,
  Erfolgsdefinition und Einkommensvolatilität kontextualisieren;
- Bootstrap, Regime-Switching und Tail-Risk-Overlay mit Kalibrierungs- und
  Stichprobengrenzen einordnen;
- CAPE-Policy, EMA und Clamps als Evidenz beziehungsweise Heuristik
  differenzieren;
- Backtest, Sweep und Auto-Optimize hinsichtlich Look-ahead,
  Survivorship, Data Snooping, Mehrfachtests und Overfitting einordnen;
- Mortalitäts-, Joint-Life- und Pflegeannahmen einschließlich
  Perioden-/Kohortenproblem und Kostenunsicherheit vertiefen;
- Bucket-, Cash-, Bond- und Goldannahmen wissenschaftlich abgleichen;
- Erfolgsquote um Konsumkürzungen, Floor-Verletzungen, Stressdauer,
  Nachlass, Steuerlast und Liquiditätsengpässe ergänzen;
- offene Forschungsfragen und ein Modellrisiko-Register formulieren.

### Akzeptanzkriterien

- jede Fachmethode ist als etabliert, adaptiert, heuristisch oder
  experimentell einordenbar;
- keine Literaturzahl erscheint ohne klaren Urheber und Kontext als
  Suite-Ergebnis;
- Validierungsnachweise werden nicht mit empirischer Güte gleichgesetzt;
- Übertragbarkeits- und Modellgrenzen werden sichtbar;
- der Nutzer hat den Forschungsabgleich freigegeben.

### Umsetzungsergebnis

Slice 7 ist dokumentationsseitig implementiert. Der Mapping-Vertrag aus Slice
6 wurde für MAP-01 bis MAP-17 vollständig ausgeführt. Jedes
Mechanismus-Dossier trennt Implementierungsanker, Forschungsanker und
Quellenrolle, Übertragbarkeit, konkrete Suite-Abweichung, Evidenzstatus,
lokale V1-bis-V3-Validierung, Restrisiko und offene V5-Prüfung.

Die Suite-Ausprägungen sind nun nachvollziehbar als adaptiert, heuristisch,
experimentell oder – beim Backtest ausschließlich in seiner Rolle als
Diagnoseverfahren – etabliert eingeordnet. Insbesondere werden Safe-
Withdrawal-Aussagen an Horizont, Assetset, Inflation, Kosten/Steuern,
Datenraum und Erfolgsdefinition gebunden; Guardrails nicht mit
Guyton-Klinger gleichgesetzt; VPW, RMD, Community-Methode und CAPE-Adaption
getrennt; Bootstrap, Regime und Tail Risk nicht als externe Kalibrierung
dargestellt; und Backtest-/Optimizer-Resultate um Look-ahead, Survivorship,
Data Snooping, Mehrfachtests und Selection Bias begrenzt.

Die Erfolgsquote wird um ein verpflichtendes Ergebnisbündel aus
Konsumkürzung, Floor-Verletzung, Stressdauer, Nachlass/Restvermögen,
Steuerlast, Liquiditätsengpass und Pflegewirkung ergänzt. Das neue
Forschungs-/Modellrisikoregister FR-01 bis FR-12 sowie die priorisierten
Forschungsfragen FQ-01 bis FQ-10 machen fehlende Kalibrierung und nächste
V5-Arbeiten explizit. Die früher missverständlich der Suite zurechenbaren
Kitces-/Morningstar-Werte wurden nicht wiedereingeführt.

Details und Validierungsnachweise stehen in
`SLICE_ARCHITEKTUR_FACHKONZEPT_07_FORSCHUNGSABGLEICH_VERTIEFUNG.md`. Die
inhaltliche Implementierung ist abgeschlossen. Der Nutzer hat U-07 am
2026-07-15 mit „U-07 ist freigegeben“ erteilt und Slice 8 anschließend separat
beauftragt. Slice 8 ist implementiert; U-08 bleibt bis zur Gesamtprüfung durch
den Nutzer ausstehend.

## 15. Slice 8 – Redaktionelle Integration und Abschlussvalidierung

**Geplante Slice-Datei:**
docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_08_INTEGRATION_ABSCHLUSS.md

### Aufgaben

- alle freigegebenen Blöcke redaktionell zusammenführen;
- Inhaltsverzeichnis, Kapitelnummern, Anker und Querverweise prüfen;
- Dopplungen zwischen Architektur-, Fach-, Markt- und Forschungskapiteln
  reduzieren;
- Diagramme, Tabellen, Glossar, Annahmenregister und Quellenverzeichnis
  vereinheitlichen;
- Quellen direkt an zentralen Aussagen sowie vollständig im
  Literaturverzeichnis führen;
- Dokumentkopf, Code-, Daten- und Quellenstand aktualisieren;
- betroffene Referenzdokumente auf Widersprüche prüfen und nur notwendige
  Markdown-Synchronisationen vornehmen;
- Release-Checkliste um Markt- und Forschungsaktualisierung ergänzen;
- Arbeitsplan und Slice-Status zurückdokumentieren;
- nach abschließender Nutzerfreigabe die spätere Archivierung der
  Arbeitsdokumente unter
  docs/internal/archive/2026-architektur-fachkonzept-ueberarbeitung
  vorbereiten.

### Akzeptanzkriterien

- das Hauptdokument ist als eigenständige Lektüre verständlich;
- Architektur- und Fachstand widersprechen den verbindlichen Referenzen
  nicht;
- Markt- und Forschungsaussagen sind belegt, datiert und methodisch
  eingegrenzt;
- Annahmen, Heuristiken, Experimente und offene Risiken sind sichtbar;
- keine Programm- oder generierte Datei wurde geändert;
- Git-Diff und Status enthalten nur freigegebene Markdown-Dateien sowie die
  bereits vorbestehenden, nicht zum Auftrag gehörenden ungetrackten
  Playwright-Dateien unter node_modules;
- der Nutzer hat das Gesamtdokument abschließend freigegeben.

### Umsetzungsergebnis

Slice 8 wurde am 2026-07-15 dokumentationsseitig implementiert. Dokumentkopf,
Einleitung und Quellenabschluss bilden nun den integrierten Stand nach
Architektur-, Fach-, Markt- und Forschungsabgleich ab. Prozessuale Zukunfts-
und Übergabetexte aus den vorangegangenen Slices wurden in dauerhafte
Methoden-, Ergebnis- und Aktualisierungsaussagen überführt. Die
Release-Checkliste enthält getrennte Pflegepfade für Inventar, Marktvergleich,
Forschungsabgleich, Quellenintegrität und Navigation.

Die Abschlussvalidierung bestätigte die aktuelle Modul-/Testinventur, Engine
API 31.0, alle 69 MKT- und 55 FOR-Quellen-IDs sowie die vollständigen MAP-,
FR-, FQ- und PD-Register. Inhaltsverzeichnis, Anker, lokale Links, Tabellen und
Markdown-Diff wurden mechanisch geprüft. Zwei fehlerhafte Fachanker und eine
doppelte Überschrift im Quellenbereich wurden korrigiert. Aktive
Spezialreferenzen ergaben keinen neuen Contract-Widerspruch; Programm-, Test-,
Build- und generierte Dateien blieben unangetastet.

Die vollständigen Änderungen und Prüfnachweise stehen in
[`SLICE_ARCHITEKTUR_FACHKONZEPT_08_INTEGRATION_ABSCHLUSS.md`](SLICE_ARCHITEKTUR_FACHKONZEPT_08_INTEGRATION_ABSCHLUSS.md).
Die implementierungsseitigen Kriterien sind abgearbeitet. U-08 bleibt bis zur
Gesamtprüfung durch den Nutzer ausstehend; erst danach wird die Archivierung
unter `docs/internal/archive/2026-architektur-fachkonzept-ueberarbeitung`
ausgeführt oder separat beauftragt.

## 16. Freigabepunkte

| ID | Freigabegegenstand | Freigabe durch | Status | Datum / Hinweis |
| --- | --- | --- | --- | --- |
| U-01 | Übergeordneter Arbeitsplan | Nutzer | freigegeben | 2026-07-15 – Auftrag „Slice 01 implementieren“ |
| U-02 | Zielgliederung und Scope nach Slice 1 | Nutzer | freigegeben | 2026-07-15 – „U-02 freigegeben“ |
| U-03 | Architektur- und Fachkonzeptblock nach Slice 2 und 3 | Nutzer | freigegeben | 2026-07-15 – „Die Nutzerfreigabe u-03 ist erteilt“ |
| U-04 | Produktstichprobe, Kriterien und Referenzfall nach Slice 4 | Nutzer | freigegeben | 2026-07-15 – „U-04 ist freigegeben“ |
| U-05 | Marktvergleich nach Slice 5 | Nutzer | freigegeben | 2026-07-15 – „U-05 freigegeben“ |
| U-06 | Quellenkorpus und Evidenztaxonomie nach Slice 6 | Nutzer | freigegeben | 2026-07-15 – „U-06 freigegeben“ |
| U-07 | Wissenschaftliche Einordnung nach Slice 7 | Nutzer | freigegeben | 2026-07-15 – „U-07 ist freigegeben“ |
| U-08 | Gesamtdokument nach Slice 8 | Nutzer | freigegeben | 2026-07-16 – erteilt durch Benutzeranforderung |
| U-09 | Commit und gegebenenfalls Push | Nutzer | freigegeben | 2026-07-16 – lokaler Commit durch Gemini |

Freigaben werden im Arbeitsplan beziehungsweise in der zugehörigen Slice-MD
mit Datum und kurzer Entscheidung dokumentiert.

## 17. Slice-Status

| Slice | Status | Nutzerfreigabe | Ergebnis |
| ---: | --- | --- | --- |
| 1 | freigegeben | erteilt am 2026-07-15 | Inventar- und Metadatenbaseline, Zielgliederung und EngineAPI-Referenzabgleich abgeschlossen |
| 2 | freigegeben | erteilt am 2026-07-15 | Architektur-, Ownership-, Engine-, Jahres-, Recovery-, Profilverbund-, Tranchen-, Datenquellen- und Plattformverträge konsolidiert |
| 3 | freigegeben | erteilt am 2026-07-15 | Glossar, Zeitachse, Fachinvarianten, Nutzer-/Policy-Grenze, Annahmen-/Modellrisikoregister, Ergebnisinterpretation und Produktmängel PD-01 bis PD-03 dokumentiert |
| 4 | freigegeben | erteilt am 2026-07-15 | Methodenrahmen, zehn externe Vergleichswerkzeuge, 18 Kriterien, Status-/Evidenzschema und Referenzfall RH-01 bis RH-04 dokumentiert |
| 5 | freigegeben | erteilt am 2026-07-15 | Quellenbasierter Marktvergleich, RH-Modellierbarkeit, Positionierung, Grenzen und Aktualisierungsroutine dokumentiert |
| 6 | freigegeben | erteilt am 2026-07-15 | Evidenztaxonomie, Zitierstandard, 55 Quellenrecords und Mapping für 17 Suite-Mechanismen dokumentiert |
| 7 | freigegeben | erteilt am 2026-07-15 | Mechanismusabgleich MAP-01 bis MAP-17, Ergebnisbündel, Forschungsrisiken FR-01 bis FR-12 und Forschungsfragen FQ-01 bis FQ-10 dokumentiert |
| 8 | freigegeben | erteilt am 2026-07-16 | Gesamtwerk redaktionell integriert; Metadaten, Release-Pflege, Navigation, Quellen-/ID-Integrität und Referenzkonsistenz abschließend validiert |

## 18. Validierung

Da ausschließlich Markdown-Dateien geändert werden, ist kein npm-Testlauf
allein aufgrund dieser Überarbeitung erforderlich. Die Validierung umfasst je
nach Slice:

- git branch --show-current und git status --short vor jedem Slice;
- dokumentierter Diff-Risiko-Block vor der ersten Änderung eines Slices;
- reproduzierbare Modul- und Testinventur, wenn Zahlen genannt werden;
- Abgleich mit package.json und den verbindlichen Referenzdokumenten;
- Prüfung jeder Marktbehauptung gegen die zugehörige datierte Quelle;
- Prüfung jeder wissenschaftlichen Kernaussage gegen die zitierte Quelle;
- Kontrolle von Überschriften, Ankern, Tabellen und internen Links;
- Suche nach veralteten Versions-, Preis-, Modul-, Test- und Datumsangaben;
- Suche nach unbelegten Absolutheiten wie „einzigartig“, „vollständig“,
  „kein anderes Tool“ oder „wissenschaftlich bewiesen“;
- git diff --check;
- abschließender Scope-Check der geänderten Dateien.

Ein Testlauf wird nur erforderlich, wenn die Dokumentation konkrete aktuelle
Testergebnisse behaupten soll, die nicht aus einer bereits dokumentierten und
ausreichend aktuellen Baseline übernommen werden können.

## 19. Stop-Regeln für diese Überarbeitung

Codex stoppt und fragt den Nutzer, wenn:

- eine gewünschte Dokumentaussage nur durch Änderung der Engine-Semantik
  wahr gemacht werden könnte;
- lokale Referenzen und Code einen fachlich relevanten Contract
  widersprüchlich beschreiben;
- eine Konkurrenzfunktion nicht belastbar aus öffentlichen Quellen
  eingeordnet werden kann und die Unsicherheit die Vergleichsaussage
  wesentlich verändert;
- eine wissenschaftliche Quelle eine zentrale Selbstdarstellung der Suite
  widerlegt oder wesentlich relativiert und mehrere redaktionelle
  Richtungen offenstehen;
- eine externe Quelle nicht zugänglich oder ihre Aussage nicht
  reproduzierbar ist und keine gleichwertige Primärquelle gefunden wird;
- mehr als zehn Programmdateien betroffen wären – für diesen
  Dokumentationsauftrag würde bereits die erste notwendige Programmdatei
  eine Scope-Abweichung darstellen;
- unerwartete Änderungen außerhalb der freigegebenen Markdown-Dateien
  auftreten.

## 20. Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
| --- | --- |
| Dokument wird länger, aber nicht klarer | neue Zielgliederung, Zusammenfassungen, Glossar und kontrollierte Detailtiefe |
| Produktdaten veralten schnell | Abrufdatum, Tarifstufe und Aktualisierungsroutine |
| Vergleich wird Eigenwerbung | gleiche Kriterien, Konkurrenzstärken und eigene Grenzen verpflichtend |
| Wissenschaftliche Quelle wird überinterpretiert | Evidenzstufen und Trennung von Literatur-, Suite- und Inferenzebene |
| Implementierung wird mit Wirksamkeitsnachweis verwechselt | eigener Evidenzstatus und Validierungsgrenze pro Mechanismus |
| Quellenliste wird unübersichtlich | thematische Bibliografie und Quellen nahe an Kernaussagen |
| Doku widerspricht Spezialreferenzen | pro Slice gezielter Source-of-Truth-Abgleich |
| Recherche führt zu Feature-Scope-Creep | Code- und Semantikänderungen ausdrücklich außerhalb des Auftrags |
| Bestehende Nutzeränderungen werden berührt | nur freigegebene Markdown-Dateien editieren; node_modules unverändert lassen |

## 21. Initialer Branch- und Statusnachweis

Vor Erstellung dieses Plans:

- Ausgangsbranch: main
- neu angelegter Feature-Branch:
  codex/architektur-fachkonzept-doku
- GitHub-Veröffentlichung: ausstehend, da nicht beauftragt
- Arbeitsbaum: keine getrackten Änderungen; vorbestehende ungetrackte
  Playwright-Dateien unter node_modules
- diese ungetrackten Dateien sind nicht Teil des Auftrags und dürfen weder
  verändert noch committed werden

## 22. Diff-Risiko für die Planerstellung

**Geplante Datei:**

- docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md

**Voraussichtliche Änderungstiefe:**

- klein; eine neue Markdown-Datei

**Gefährdete bestehende Tests:**

- keine

**Nicht anfassen:**

- docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md vor Nutzerfreigabe U-01;
- alle Programm- und Build-Dateien;
- engine.js, dist und RuhestandSuite.exe;
- die vorbestehenden ungetrackten Playwright-Dateien unter node_modules.

**Rollback-Strategie:**

- Die neue Plan-Datei nur nach ausdrücklicher Nutzerfreigabe wieder entfernen.
- Keine bestehenden Dateien müssen für die Planerstellung zurückgesetzt
  werden.

## 23. Definition of Done

Die Gesamtüberarbeitung ist abgeschlossen, wenn:

- alle acht Slices durchgeführt und im Hauptplan zurückdokumentiert sind;
- alle Freigabepunkte U-01 bis U-08 durch den Nutzer entschieden wurden;
- Architektur, Fachkonzept, Marktvergleich und wissenschaftliche Einordnung
  vollständig und konsistent sind;
- Markt- und Forschungsabschnitte methodisch belastbar, ausgewogen und
  ausreichend ausführlich sind;
- zeitabhängige Produktangaben datiert und wissenschaftliche Aussagen
  quellenklar sind;
- jede zentrale Suite-Methode einen erkennbaren Evidenz- und
  Modellrisikostatus besitzt;
- das Zieldokument und notwendige Markdown-Referenzen widerspruchsfrei sind;
- keine Programmdatei oder generiertes Artefakt geändert wurde;
- Validierung und Scope-Check ohne Befund abgeschlossen sind;
- der Nutzer die Gesamtfassung freigegeben hat;
- Commit und Push ausschließlich nach separater Nutzerentscheidung erfolgen.
