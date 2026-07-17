# Korrektur-Arbeitsplan zu den Findings aus Slice 08

**Stand:** 2026-07-17<br>
**Status:** in Umsetzung – Slice 4 implementiert; Review ausstehend<br>
**Ausgangsdokument:** `SLICE_ARCHITEKTUR_FACHKONZEPT_08_INTEGRATION_ABSCHLUSS.md`<br>
**Betroffenes Hauptdokument:** `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`<br>
**Planerstellungs-Branch:** `codex/architektur-fachkonzept-doku`<br>
**Vorgesehener Umsetzungs-Branch:** `codex/architektur-fachkonzept-korrekturen`<br>
**GitHub-Status:** Umsetzungs-Branch lokal angelegt; Veröffentlichung ausstehend<br>
**Planart:** gemischtes Dokumentations-, Contract-, UI- und
Validierungsvorhaben

## 1. Auftrag und Prozessgrenze

Dieser Arbeitsplan übersetzt die in Slice 08 dokumentierten Abweichungen und
offenen Risiken in klar getrennte Korrekturpakete. Er implementiert noch keine
Korrektur und erteilt keine Freigabe.

Für die Umsetzung gelten die normalen Rollen- und Reviewregeln des
Repositorys, weil der Plan neben Dokumentation auch Programm- und
Konfigurationsänderungen vorsieht:

- Codex erstellt Plan und Slices und implementiert nach Freigabe auf dem
  Feature-Branch.
- Gemini beziehungsweise Antigravity prüft den Plan und später die
  Implementierung adversarial; optional kann Claude als zweiter Reviewer
  hinzugezogen werden.
- Codex markiert weder Plan noch eigene Implementierung selbst als
  freigegeben und erstellt keine Commits.
- Ein lokaler Commit erfolgt erst nach positivem Review und Nutzerfreigabe
  durch den dafür vorgesehenen Abnahmeweg.
- Ein Push oder die Veröffentlichung des Branches erfolgt nur nach
  ausdrücklicher Nutzerfreigabe.

Die Korrekturumsetzung beginnt erst, wenn:

1. U-08 des laufenden Dokumentationsprojekts entschieden ist;
2. der aktuelle Dokumentationsstand sicher committed oder anderweitig als
   unveränderliche Ausgangsbasis festgehalten wurde;
3. `codex/architektur-fachkonzept-korrekturen` angelegt und in jeder
   Slice-Datei dokumentiert ist;
4. dieser Plan nach Review den Status `implementierungsreif` besitzt.

## 2. Verifizierte Findings

| ID | Finding | Lokaler Nachweis | Korrekturklasse | Priorität |
| --- | --- | --- | --- | --- |
| KF-01 | Markt- und Forschungsblock erreichen zusammen nicht den redaktionellen Orientierungswert von 20 bis 25 %; der Marktblock ist größer als der Forschungsblock. | Slice 08: Markt rund 9.224 Wörter, Forschung rund 8.317 Wörter | Dokumentarchitektur | hoch |
| KF-02 | 69 MKT- und 55 FOR-Auditrecords erhöhen Auditierbarkeit, aber auch Länge, Navigations- und Pflegeaufwand des Hauptdokuments. | D.12 und E.4 des Hauptdokuments | Dokumentarchitektur | hoch |
| KF-03 | Preise, Produktstufen, Funktionen, amtliche Daten und dynamische Webquellen veralten; die Checkliste definiert Pflege, erzwingt aber weder Fälligkeit noch strukturelle Vollständigkeit. | Slice 08, Release-Checkliste und Quellenrecords | Aktualisierungs-Governance | hoch |
| KF-04 | Die HTTP-Ziele und externen Aussagen wurden in Slice 08 nicht neu inhaltlich erhoben; gültig ist der eingefrorene Stand 2026-07-15. | Slice 08, Quellenkopf D/E | Evidenzaktualität | mittel |
| KF-05 | Dokumentationskonsistenz und lokale Tests sind kein externer Wirksamkeitsnachweis; FR-01 bis FR-12 und FQ-01 bis FQ-10 bleiben offen. | E.13 und E.14 | Forschungsvalidierung | hoch, aber mehrjährig |
| KF-06 / PD-01 | `jahresentnahme_real` wird durch einen kumulierten Inflationsfaktor geteilt, der im mehrjährigen Simulatorpfad nicht fachlich korrekt fortgeschrieben wird. | `simulator-year-result.js`, Simulator-State und MR-09/PD-01 | Ergebnis-/State-Contract | hoch |
| KF-07 / PD-02 | `pflegeKostenDrift` wird beim UI-/Profil-Input in ein Verhältnis normalisiert und in `simulator-engine-helpers.js` erneut durch 100 geteilt. | `simulator-input-care.js`, `simulator-profile-inputs.js`, `simulator-engine-helpers.js` | Einheitenvertrag | hoch |
| KF-08 / PD-03 | Die Beschreibung „Depot vollständig aufgebraucht“ ist breiter als die Berechnungsbasis aus `isRuin` oder Aktien-plus-Gold bis 100 EUR. | `mc-run-metrics.js`, `monte-carlo-aggregates.js`, `results-metrics.js` | KPI-/UI-Vertrag | mittel |
| KF-09 / GAP-MKT-06 | Die Lizenzmetadaten widersprechen dem MIT-Lizenztext: `package.json` und Root-`package-lock.json` nennen ISC, `Cargo.toml` ist leer. | `LICENSE.md`, `package.json`, `package-lock.json`, `src-tauri/Cargo.toml` | Release-/Metadatenvertrag | hoch |
| KF-10 | Archivierung, Commit und Push des Ausgangsprojekts sind noch nicht freigegeben. | U-08/U-09 und Slice-08-Status | Prozess-Gate, kein Produktfehler | blockierend vor Umsetzung |

## 3. Zielbild

Nach Abschluss des Korrekturvorhabens gilt:

1. Das zentrale Architektur- und Fachkonzept bleibt eigenständig verständlich,
   führt aber Detailrecords in klar verlinkten Evidenzanhängen.
2. Markt- und Forschungszusammenfassungen bilden zusammen 20 bis 25 % des
   definierten Haupttextes; der Forschungsblock ist größer als der Marktblock.
3. Keine MKT-, FOR-, MAP-, FR-, FQ-, MR-, PD- oder GAP-ID geht bei der
   Aufteilung verloren oder wird doppeldeutig.
4. Evidenzrecords besitzen maschinell prüfbare Pflichtfelder, Stichtage und
   Fälligkeitsregeln; Live-HTTP-Prüfung bleibt ein bewusst manueller,
   datierter Erhebungsschritt.
5. Lizenztext und Paketmetadaten nennen einheitlich die vom Nutzer bestätigte
   Lizenz.
6. `jahresentnahme_real` hat einen ausdrücklich entschiedenen und getesteten
   Real-/Nominalvertrag.
7. Pflegekosten-Drift wird an genau einer Grenze von Prozent in Verhältnis
   normalisiert und downstream nicht erneut skaliert.
8. Die Depot-Erschöpfungs-KPI benennt exakt ihre Berechnungsbasis; eine
   Berechnungsänderung erfolgt nur nach separater fachlicher Entscheidung.
9. Forschungsrisiken werden nicht scheinbar „geschlossen“, sondern in einen
   priorisierten, reproduzierbaren Validierungs-Backlog mit eigenen
   Freigabegates überführt.

## 4. Verbindliche Entscheidungen vor Umsetzung

### 4.1 Dokumenttopologie

Empfohlene Richtung:

- Das Hauptdokument behält verständliche Markt- und Forschungszusammenfassungen
  einschließlich zentraler Befunde, Grenzen und Risikoregister.
- Vollständige MKT-Records kommen in
  `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md`.
- Vollständige FOR-Records und ausführliche Mechanismusdossiers kommen in
  `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`.
- Hauptdokument und Register verlinken sich wechselseitig auf stabile Anker.
- Die Register sind normative Beleganhänge, keine Archive.

Eine alternative bloße Kürzung der Records im Hauptdokument wird nicht
empfohlen, weil sie die in Slice 4 bis 7 aufgebaute Aussagegrenze und
Reproduzierbarkeit schwächen würde.

### 4.2 Messvertrag für den Umfang

Vor Slice 2 wird ein reproduzierbares Wortzählverfahren festgeschrieben:

- Nenner: Haupttext von `# Übersicht` bis unmittelbar vor
  `# Appendix: Modul-Inventar`;
- Zähler: die beiden Top-Level-Bereiche `# Marktvergleich` und
  `# Wissenschaftlicher Rahmen ...`;
- Markdown-Tabellen und Listen zählen mit, Codeblöcke und reine Linkziele
  werden nach einer festgelegten Regel behandelt;
- Ziel: Markt plus Forschung 20 bis 25 % des Nenners;
- Zusatzbedingung: Forschungsblock mehr Wörter als Marktblock;
- Wortzahl darf nicht durch bedeutungslose Aufblähung oder Verlust zentraler
  Aussagegrenzen erreicht werden.

Wenn der Zielkorridor ohne Verlust der eigenständigen Verständlichkeit nicht
erreichbar ist, stoppt der Slice und legt dem Nutzer eine begründete neue
Zielspanne vor.

### 4.3 PD-01: Realwert oder Umbenennung

Vor der Implementierung ist eine fachliche Nutzerentscheidung erforderlich:

- **Route A – empfohlen:** kumulierten Inflationsfaktor im Simulator-State
  korrekt fortschreiben und `jahresentnahme_real` als echten Realwert
  beibehalten. Erwartbare KPI-, Stress-, Backtest- und Optimizer-Deltas werden
  als beabsichtigte Korrektur isoliert und getestet.
- **Route B:** Berechnung unverändert lassen und Feld, Tabellen, Exporte sowie
  abhängige KPIs konsistent als nominal umbenennen. Diese Route minimiert
  Ergebnisdeltas, erhält aber den fachlich weniger hilfreichen Vertrag.

Route A kann Spending-/State-Semantik beeinflussen und darf deshalb erst nach
expliziter Entscheidung sowie dokumentierter Delta-Baseline umgesetzt werden.

### 4.4 PD-02: Pflegekosten-Einheit

Empfohlener kanonischer Vertrag:

- UI und Profile speichern/zeigen Prozentwerte wie `3.5`;
- die Input-Grenze normalisiert genau einmal auf `0.035`;
- Simulator, Runner und Worker transportieren danach ausschließlich das
  Verhältnis;
- `simulator-engine-helpers.js` verwendet das Verhältnis direkt;
- ungültige oder negative Werte werden an der definierten Input-Grenze
  validiert, nicht an mehreren Stellen still unterschiedlich begrenzt.

### 4.5 PD-03: Label oder Berechnung

Empfohlene Route ist eine Label-/Beschreibungskorrektur ohne Änderung der
Aggregation:

- technischer Key `depotErschoepfungsQuote` bleibt kompatibel;
- Titel und Beschreibung nennen `isRuin` sowie den Aktien-/Gold-Schwellenwert;
- freie Liquidität und Pflegebucket werden ausdrücklich als nicht vollständig
  erfasste Größen genannt.

Eine Erweiterung der Berechnungsbasis würde Erfolgsquote, Optimizerziele und
Worker-Buffers beeinflussen und erfordert ein eigenes fachliches
Änderungsdokument.

### 4.6 Lizenz

Empfohlen ist MIT, weil `LICENSE.md`, README und Hauptdokument MIT als
maßgebliche Lizenz nennen. Vor Slice 5 bestätigt der Nutzer dennoch
ausdrücklich, ob MIT autoritativ ist. Ohne diese Entscheidung wird keine
Lizenzmetadatei geändert.

**Nutzerentscheidung vom 2026-07-16:** MIT ist die autoritative
Projektlizenz. Slice 5 darf die Metadaten auf MIT vereinheitlichen, ohne
Dependency-, Versions- oder sonstige Paketänderungen auszulösen.

## 5. Scope

### 5.1 Dokumentationsscope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- neue Evidenzregister für Markt und Forschung
- `README.md`, `docs/reference/TECHNICAL.md`, `docs/README.md` und relevante
  Modul-READMEs nur bei nachgewiesenem Synchronisationsbedarf
- dieser Arbeitsplan und vor jedem Paket eine eigene Slice-MD
- ein priorisierter Forschungsvalidierungs-Backlog unter `docs/internal/`

### 5.2 Möglicher Programmscope

- statischer Evidenzvalidator unter `scripts/`
- gezielte Tests unter `tests/`
- `package.json` und `package-lock.json`
- `src-tauri/Cargo.toml`
- die für PD-01 bis PD-03 nachweislich erforderlichen Module unter
  `app/simulator/`

### 5.3 Nicht-Scope

- keine pauschale Neuentwicklung des Simulators oder der Engine;
- keine stillschweigende Änderung von Engine-Semantik;
- keine gleichzeitige Lösung aller FR-/FQ-Forschungsfragen;
- keine Anlage-, Steuer-, Rechts-, Versicherungs- oder Pflegeberatung;
- keine Anmeldung, Bezahlung oder Verarbeitung realer Finanzdaten bei
  Konkurrenzprodukten;
- keine Live-HTTP-Abhängigkeit im normalen `npm test`-Gate;
- keine manuelle Änderung von `engine.js`, `dist` oder `RuheStandSuite.exe`;
- keine Archivierung des Ausgangsprojekts vor U-08;
- kein Commit oder Push durch Codex.

## 6. Vorgesehene Umsetzungsslices

Jeder Slice erhält vor Beginn eine eigene Datei nach den Regeln aus
`SLICE_EXECUTION_RULES.md`, dokumentiert Branch/Status/Diff-Risiko und endet
mit Rückdokumentation in diesen Plan.

### Slice 1 – Baseline, Messvertrag und Entscheidungsprotokoll

**Slice-Datei:**
[`SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_01_BASELINE_MESSVERTRAG.md`](SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_01_BASELINE_MESSVERTRAG.md)

**Ziel:** Unveränderliche Ausgangsbasis und alle fachlichen Richtungsentscheide
vor dem ersten Korrekturedit festlegen.

**Aufgaben:**

- Ausgangscommit, Worktree, Modul-/Testinventar und Dokumentwortzahlen erfassen;
- Wortzählverfahren als wiederholbaren Befehl oder read-only Scriptentwurf
  dokumentieren;
- Zieltopologie für Hauptdokument und Evidenzregister bestätigen;
- Nutzerentscheidungen zu PD-01, PD-03 und Lizenz dokumentieren;
- pro Folgeslice die voraussichtlichen Programmdateien gegen die
  Zehn-Dateien-Stop-Regel abgrenzen;
- aktuellen Branch nach Abschluss von U-08 anlegen und gegebenenfalls nach
  Freigabe veröffentlichen.

**Akzeptanzkriterien:**

- keine offene Richtungsfrage wird implizit durch Code entschieden;
- Wortzählung und Ausgangswerte sind reproduzierbar;
- Umsetzungsbranch stimmt mit dem Plan überein;
- alle Folgeslices bleiben einzeln unter der Stop-Schwelle oder besitzen ein
  ausdrückliches Nutzer-Gate.

### Slice 2 – Markt-Evidenzregister und kompakter Hauptblock

**Slice-Datei:**
[`SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_02_MARKT_EVIDENZREGISTER.md`](SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_02_MARKT_EVIDENZREGISTER.md)

**Ziel:** Vollständige Auditierbarkeit erhalten und den Marktteil im
Hauptdokument auf Methodik, Kernergebnisse, Positionierung, Grenzen und
Aktualisierung konzentrieren.

**Aufgaben:**

- 69 MKT-Records verlustfrei in das neue Markt-Evidenzregister überführen;
- Stichprobe, Kriterien, RH-Referenzfälle und Segmentbefunde im Hauptdokument
  ohne Prozessdopplung zusammenfassen;
- jede zentrale Marktbehauptung mit MKT-ID und Registeranker verbinden;
- Produktstufe, Region, Stichtag und Evidenzlücke sichtbar erhalten;
- MKT-ID-Eindeutigkeit, Links und Tabellen mechanisch prüfen.

**Akzeptanzkriterien:**

- 69 von 69 IDs definiert und alle Verwendungen auflösbar;
- kein Preis-/Featurebefund verliert Stufe oder Stichtag;
- das Hauptdokument bleibt ohne Öffnen des Registers in seinen
  Kernaussagen verständlich;
- keine neue Rangliste, Gesamtwertung oder Exklusivitätsbehauptung entsteht.

**Umsetzungsstand 2026-07-17:** Slice 2 ist dokumentarisch implementiert; das
Review steht aus. Das neue normative Register führt 69 von 69 Recordzeilen
inhaltlich unverändert mit 69 eindeutigen IDs und Ankern. Der Marktblock im
Hauptdokument sank nach dem Messvertrag von 8.860 auf 2.839 Wörter. Der
Forschungsblock blieb mit 7.842 Wörtern unverändert und ist nun 5.003 Wörter
größer. Markt plus Forschung liegen vor Slice 3 noch bei 37,40 % des
Haupttextnenners; der 20-bis-25-Prozent-Korridor und U-K03 bleiben daher
ausdrücklich offen.

### Slice 3 – Forschungsregister und kompakter Mechanismusabgleich

**Slice-Datei:**
[`SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_03_FORSCHUNGS_EVIDENZREGISTER.md`](SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_03_FORSCHUNGS_EVIDENZREGISTER.md)

**Ziel:** Quellenkorpus und ausführliche Dossiers auslagern, während das
Hauptdokument Evidenzstatus, Mechanismusbefunde, Ergebnisgrenzen und Risiken
eigenständig erklärt.

**Aufgaben:**

- 55 FOR-Records und die ausführlichen MAP-Dossiers verlustfrei in das
  Forschungs-Evidenzregister überführen;
- im Hauptdokument eine zusammenhängende Einordnung der 17 Mechanismen
  erhalten;
- FR-01 bis FR-12 und FQ-01 bis FQ-10 im Hauptdokument oder über eine
  eindeutig begründete normative Ownership führen;
- Quellenrolle, Übertragbarkeit, Abweichung und lokale Validierungsgrenze je
  Mechanismus sichtbar halten;
- FOR-/MAP-/FR-/FQ-Eindeutigkeit und Querverweise prüfen.

**Akzeptanzkriterien:**

- 55 von 55 FOR-IDs und MAP-01 bis MAP-17 sind vollständig auflösbar;
- keine Literaturzahl wird zu einem Suite-Ergebnis;
- der Forschungsblock ist nach dem Messvertrag größer als der Marktblock;
- offene V4-/V5-Prüfungen bleiben sichtbar.

**Umsetzungsstand 2026-07-17:** Slice 3 ist dokumentarisch implementiert und
freigegeben. Das neue normative Forschungs-Evidenzregister führt 55 von
55 FOR-Recordzeilen inhaltsgleich mit eindeutigen Ankern und MAP-01 bis
MAP-17 als inhaltsgleiche Sieben-Pflichtfeld-Dossiers. Der Forschungsblock im
Hauptdokument umfasst 2.940 Wörter und ist 101 Wörter größer als der
Marktblock mit 2.839 Wörtern. Gemeinsam belegen beide Blöcke 24,43 Prozent des
Haupttextnenners. FR-01 bis FR-12 und FQ-01 bis FQ-10 bleiben im Hauptdokument
normativ geführt; U-K03 wurde am 2026-07-17 freigegeben.

### Slice 4 – Evidenzaktualität und statischer Dokumentvalidator

**Slice-Datei:**
[`SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_04_EVIDENZVALIDATOR.md`](SLICE_ARCHITEKTUR_FACHKONZEPT_FINDINGS_04_EVIDENZVALIDATOR.md)

**Ziel:** Strukturelle Vollständigkeit und Fälligkeit maschinell prüfen, ohne
das Testgate von externem Netzwerk abhängig zu machen.

**Geplanter Programmscope:** höchstens vier Programm-/Konfigurationsdateien,
voraussichtlich:

- `scripts/check-architecture-evidence.mjs`
- eine gezielte Testdatei unter `tests/`
- `package.json`
- bei notwendiger Scriptregistrierung `package-lock.json` nur, wenn der
  Paketvertrag dies tatsächlich ändert

**Aufgaben:**

- Pflichtfelder, eindeutige IDs, Datumsformate, lokale Anker und definierte
  nächste Prüfzeitpunkte validieren;
- einen lokalen Befehl wie `npm run docs:evidence` ergänzen;
- den Validator über eine gezielte Test-Wrapper-Datei in das reguläre
  `npm test`-Gate einbinden, ohne Netzwerkzugriff auszulösen;
- Live-HTTP-Prüfung ausdrücklich getrennt halten;
- volatile Marktquellen bei Umsetzung erneut aus offiziellen Quellen prüfen;
- wissenschaftliche/amtliche Quellen nur bei geändertem Daten- oder
  Berichtsstand aktualisieren und die alte Version nachvollziehbar halten;
- nicht erreichbare oder widersprüchliche Quellen nach Stop-Regel behandeln.

**Akzeptanzkriterien:**

- statischer Validator arbeitet deterministisch und offline;
- defekte IDs, Pflichtfelder, lokale Links und überfällige Records erzeugen
  einen klaren Fehler;
- externe Erhebung ist mit Datum und Quelle dokumentiert;
- `npm test` benötigt kein Internet.

**Umsetzungsstand 2026-07-17:** Slice 4 ist implementiert; Review und U-K04
stehen aus. `scripts/check-architecture-evidence.mjs` prüft offline 69 MKT-,
55 FOR-Records, MAP-01 bis MAP-17, Pflichtfelder, eindeutige IDs/Anker, lokale
Links, ISO-Daten und 18 Aktualitätsscopes. `npm run docs:evidence` stellt das
fokussierte Gate bereit; `architecture-evidence.test.mjs` bindet positive und
negative Contractfälle in `npm test` ein. Die volatile Marktstichprobe wurde
am 2026-07-17 über die offiziellen Produkt-/Preis-/Methodenanker erneuert; nur
das BVI-Revisionsdatum änderte sich auf 2026-07-02. Die amtlich/dynamische
Forschungsstichprobe bestätigte die geprüften Versionsstände ohne
Recordaustausch. Fokuslauf 19/19 und Gesamtsuite 4.460/4.460 Assertions sind
grün; das Gate meldet null offene Handles und benötigt kein Internet.

### Slice 5 – Lizenzmetadaten vereinheitlichen

**Ziel:** Lizenztext und Paketmetadaten widerspruchsfrei machen.

**Geplanter Programmscope:**

- `package.json`
- Root-Eintrag in `package-lock.json`
- `src-tauri/Cargo.toml`
- eine fokussierte Metadatenprüfung unter `tests/`, falls kein geeignetes Gate
  vorhanden ist

**Aufgaben:**

- vom Nutzer bestätigte Lizenz in allen drei Metadatenquellen eintragen;
- README, Hauptdokument und Markt-GAP synchronisieren;
- GAP-MKT-06 nur nach nachgewiesener Konsistenz schließen;
- npm- und Cargo-Metadaten lokal plausibilisieren.
- keine Paketmanager-Installation oder Dependency-Aktualisierung ausführen;
  im Lockfile ausschließlich den Root-Lizenzwert ändern, sofern erforderlich.

**Akzeptanzkriterien:**

- `LICENSE.md`, npm und Cargo nennen dieselbe Lizenz;
- keine Abhängigkeitslizenz wird fälschlich als Projektlizenz behandelt;
- keine Paketversion oder Abhängigkeit ändert sich unbeabsichtigt.

### Slice 6 – PD-01 Real-/Nominalvertrag korrigieren

**Ziel:** Die freigegebene Route aus Abschnitt 4.3 vollständig und ohne
Mischvertrag umsetzen.

**Voraussichtlicher Programmscope:**

- `app/simulator/simulator-engine-direct.js`
- `app/simulator/simulator-year-result.js`
- nur nach Datenflussnachweis weitere direkte KPI-/State-Consumer
- gezielte Tests, insbesondere Simulator-Headless, Backtest, Monte Carlo und
  Worker-Parität; insgesamt höchstens zehn Programmdateien

**Aufgaben bei Route A:**

- kumulativen Inflationsfaktor über alle Simulatorjahre genau einmal
  fortschreiben;
- State-Ownership zwischen App und Engine explizit festlegen;
- reale Entnahme, `inflation_factor_cum`, Stressmetriken und Exporte mit
  synthetischen Mehrjahresfällen prüfen;
- erwartete Backtest-/MC-/Optimizer-Deltas vorab gegen eine Baseline
  klassifizieren.
- Auto-Optimize-Ergebnisse vor und nach der Korrektur mit identischen Seeds
  und Eingaben vermessen; erwartete Verschiebungen der Zielfunktion getrennt
  von unerwarteten Ergebnisdeltas dokumentieren;
- `worker-parity.test.mjs` als Pflichtgate für die Serial-/Worker-Gleichheit
  ausführen und jede Abweichung als Stop-Grund behandeln.

**Aufgaben bei Route B:**

- Feld, Header, Export und abhängige KPI-Beschreibungen konsistent nominal
  benennen;
- keinen stillen Alias mit widersprüchlicher Semantik zurücklassen;
- Kompatibilitätsauswirkung auf gespeicherte Exporte dokumentieren.

**Akzeptanzkriterien:**

- ein dreijähriger synthetischer Inflationsfall besitzt rechnerisch
  nachgewiesene Real-/Nominalwerte;
- Serial-, Worker- und Backtestpfade verwenden denselben Vertrag;
- unerwartete Snapshot-/Backtest-Deltas lösen die Stop-Regel aus;
- MR-09/PD-01 werden erst nach grüner Gesamtsuite geschlossen.

### Slice 7 – PD-02 Pflegekosten-Drift korrigieren

**Ziel:** Prozent-/Verhältnisvertrag an genau einer Grenze normalisieren.

**Voraussichtlicher Programmscope:**

- `app/simulator/simulator-input-care.js`
- `app/simulator/simulator-profile-inputs.js`
- `app/simulator/simulator-engine-helpers.js`
- fokussierte Input-, Care- und Worker-/Runner-Tests; insgesamt höchstens acht
  Programmdateien

**Aufgaben:**

- kanonischen Einheitenvertrag aus Abschnitt 4.4 implementieren;
- UI-, Profil-, Persistenz- und Runnerpfad mit 0 %, 3,5 % und Grenzwerten
  testen;
- das persistierte Profilformat unverändert als Prozentwertvertrag erhalten;
  die Normalisierung erfolgt ausschließlich in-memory an der festgelegten
  Input-Grenze; eine JSON-Schemamigration ist Nicht-Scope dieses Slices;
- nachweisen, dass 3,5 % als Faktor 0,035 und nicht 0,00035 wirken;
- Pflegekostenpfade und Kappung mit deterministischen Jahren prüfen;
- Dokumentation und PD-02/MR-Eintrag erst nach Validierung aktualisieren.

**Akzeptanzkriterien:**

- keine doppelte Division oder Multiplikation durch 100;
- Serial- und Workerpfad stimmen überein;
- Invalidwerte werden am festgelegten Contract abgelehnt oder nach
  dokumentierter Regel normalisiert;
- erwartete Pflegeergebnisdeltas sind erklärt, unerwartete Deltas blockieren.

### Slice 8 – PD-03 KPI-Bezeichnung präzisieren

**Ziel:** Anzeige und Hilfetext an die bestehende Berechnungsbasis anpassen,
sofern der Nutzer nicht ausdrücklich eine Berechnungsänderung wählt.

**Voraussichtlicher Programmscope:**

- `app/simulator/results-metrics.js`
- fokussierter KPI-/UI-Test
- gegebenenfalls Dokumentationsreferenzen

**Aufgaben:**

- Titel und Beschreibung so formulieren, dass `isRuin`, Aktien/Gold-Schwelle
  und nicht erfasste Bestände erkennbar sind;
- technischen Key für Export-/Optimizer-Kompatibilität beibehalten;
- Tooltip, Dashboard und Handbuchtext synchronisieren, soweit betroffen;
- bei gewünschter Berechnungsänderung stoppen und einen separaten Plan
  erstellen.

**Akzeptanzkriterien:**

- kein Text behauptet vollständige Vermögenslosigkeit;
- Aggregation und Optimizervertrag ändern sich nicht;
- PD-03 wird erst nach UI-/Dokumentationsabgleich geschlossen.

### Slice 9 – Forschungsvalidierungs-Backlog operationalisieren

**Ziel:** FR-01 bis FR-12 und FQ-01 bis FQ-10 in ausführbare,
priorisierte Folgevorhaben zerlegen, ohne Wirksamkeit vorzutäuschen.

**Aufgaben:**

- Abhängigkeiten zu Datenmanifest, Kostenvertrag, PD-01/PD-02, Trial-Logging
  und Holdouts dokumentieren;
- FQ-01 bis FQ-04 als Priorität-1-Pakete mit Mindestnachweisen und
  Abbruchkriterien ausarbeiten;
- FQ-05 bis FQ-10 als nachgelagerte Pakete mit Owner, Eingaben und
  Ergebnisartefakten beschreiben;
- jedes Paket auf erwartete Programmdateien und Zehn-Dateien-Stop-Regel
  begrenzen oder als eigenes Arbeitsdokument ausweisen;
- klarstellen, welche FRs nur durch externe Daten, Methodikreview oder
  unabhängige Replikation reduzierbar sind.

**Akzeptanzkriterien:**

- jede FR-/FQ-ID besitzt einen nächsten ausführbaren Schritt oder eine
  begründete externe Abhängigkeit;
- kein offenes Forschungsrisiko wird allein durch Planung als erledigt
  markiert;
- Wirksamkeitsformulierungen bleiben bis zum jeweiligen Mindestnachweis
  gesperrt.

### Slice 10 – Gesamtintegration und Abschlussvalidierung

**Ziel:** Alle Korrekturen zusammenführen, Zielmetriken prüfen und die
Dokumentation auf den tatsächlichen Produktstand bringen.

**Aufgaben:**

- Wortanteile nach dem freigegebenen Messvertrag erneut bestimmen;
- Hauptdokument, Evidenzregister, README und Spezialreferenzen abgleichen;
- alle IDs, Anker, lokalen Links, Tabellen, Datumsfelder und Fälligkeiten
  prüfen;
- offene PD-/GAP-/MR-/FR-Einträge nur anhand nachgewiesener Ergebnisse
  aktualisieren;
- `npm test`, fokussierte Browserprüfung und statischen Evidenzvalidator
  ausführen;
- Diff-/Status-/Scope-Check dokumentieren;
- Nutzerfreigabe und spätere Archivierung/Commit/Push getrennt behandeln.

**Akzeptanzkriterien:**

- Markt plus Forschung liegen bei 20 bis 25 % des definierten Haupttextes und
  Forschung ist größer als Markt;
- Hauptdokument bleibt eigenständig verständlich;
- alle Beleg- und Risikoregister sind auflösbar und widerspruchsfrei;
- keine unerwartete Programmdatei oder generiertes Artefakt ist geändert;
- Gesamtsuite und vorgeschriebene Zusatzgates sind grün;
- Nutzer und Reviewer haben den Abschluss freigegeben.

## 7. Abhängigkeiten und Reihenfolge

```text
U-08 + sicherer Ausgangscommit
        |
      Slice 1
        |
   +----+----+
   |         |
Slice 2   Slice 5
   |         |
Slice 3   Slice 6 -> Slice 7 -> Slice 8
   |         |
Slice 4     |
   +----+----+
        |
      Slice 9
        |
      Slice 10
```

Die Darstellung bezeichnet fachliche Abhängigkeiten, keine Erlaubnis zur
parallelen Bearbeitung desselben Worktrees. Insbesondere benötigen Slice 6 bis
8 jeweils einen grünen und reviewten Vorgängerstand.

## 8. Validierungsstrategie

### 8.1 Dokumentation

- reproduzierbare Wortzählung nach dem Messvertrag;
- eindeutige Überschriften und GitHub-Anker;
- lokale Datei- und Ankerlinks;
- Tabellenstruktur;
- 69 MKT- und 55 FOR-Definitionen sowie alle MAP-/FR-/FQ-/MR-/PD-/GAP-IDs;
- keine undefinierten, doppelten oder verwaisten IDs;
- Datums-, Stichtags- und Fälligkeitsfelder;
- Suche nach unbelegten Absolutheiten und offenen Übergabetexten;
- `git diff --check` und Scope-Check.

### 8.2 Programmänderungen

- pro Code-Slice zunächst fokussierte Tests;
- danach zwingend `npm test`;
- Browser-Gate bei sichtbaren UI-, Label- oder Eingabeverträgen;
- Worker-Parität bei Monte-Carlo-/Runner-State oder Pflegepfaden;
- Backtest-/Snapshotvergleich bei PD-01 und PD-02;
- `npm run build:engine` nur, wenn wider Erwarten `engine/` oder öffentliche
  EngineAPI betroffen sind; eine solche Scope-Erweiterung benötigt vorher
  Nutzerfreigabe.

### 8.3 Externe Evidenz

- volatile Produkt-/Preis-/Featureaussagen aus offiziellen Quellen neu
  prüfen;
- Veröffentlichungs-, Daten- und Abrufstand getrennt halten;
- nicht erreichbare Quellen nicht als Negativbeleg verwenden;
- keine Netzwerkabhängigkeit in Unit-Tests;
- keine längeren urheberrechtlich geschützten Textkopien im Repository.

## 9. Stop-Regeln

Zusätzlich zu `AGENTS.md` wird gestoppt und nachgefragt, wenn:

- U-08 oder der sichere Ausgangscommit fehlt;
- der aktive Branch nicht `codex/architektur-fachkonzept-korrekturen` ist;
- ein Slice mehr als zehn Programmdateien benötigt;
- der 20-bis-25-Prozent-Korridor nur durch Verlust zentraler
  Aussagegrenzen erreichbar wäre;
- MKT-/FOR-Records beim Verschieben nicht 1:1 auflösbar bleiben;
- eine externe Quelle nicht erreichbar ist und dadurch ein zentraler Befund
  kippt;
- die autoritative Projektlizenz nicht ausdrücklich bestätigt ist;
- PD-01 eine nicht freigegebene Engine- oder Spending-Semantikänderung
  erfordert;
- Snapshot-, Backtest-, MC-, Optimizer- oder Worker-Ergebnisse außerhalb des
  vorab erwarteten Korrekturdeltas abweichen;
- Pflege-Inputs zwischen UI, Profil, Serial- und Workerpfad unterschiedliche
  Einheiten verwenden;
- PD-03 nicht als Labelkorrektur, sondern als KPI-Neudefinition umgesetzt
  werden soll;
- Tests nicht ausführbar sind oder kein sinnvoller Ersatz existiert;
- FlowDelta auffällig wird;
- UI und Engine unterschiedliche Parameternamen verwenden;
- `minimumFlexAnnual` berührt oder still begrenzt statt validiert würde;
- eine Forschungsquelle eine zentrale Selbstdarstellung wesentlich
  widerlegt und mehrere redaktionelle Richtungen offenstehen.

## 10. Freigabepunkte

| ID | Gegenstand | Voraussetzung | Freigabe durch | Status |
| --- | --- | --- | --- | --- |
| U-K01 | dieser Korrekturplan | Review-Feedback eingearbeitet | Nutzer + Reviewer | freigegeben am 2026-07-16 |
| U-K02 | Dokumenttopologie und Messvertrag | Slice 1 | Nutzer | freigegeben am 2026-07-16 |
| U-K03 | Markt-/Forschungsregister und Haupttextumfang | Slice 2 und 3 | Nutzer + Reviewer | freigegeben am 2026-07-17 |
| U-K04 | Evidenzvalidator und Aktualitätsvertrag | Slice 4 | Nutzer + Reviewer | freigegeben durch Gemini / Nutzer ausstehend |
| U-K05 | autoritative Lizenz | vor Slice 5 | Nutzer | MIT bestätigt am 2026-07-16 |
| U-K06 | PD-01 Route A oder B und zulässiges Delta | vor Slice 6 | Nutzer | Route A bestätigt; Delta-Baseline vor Slice 6 ausstehend |
| U-K07 | Pflegekosten-Einheitenvertrag | vor/mit Slice 7 | Nutzer + Reviewer | ausstehend |
| U-K08 | PD-03 Labelroute oder neuer KPI-Plan | vor Slice 8 | Nutzer | Labelroute bestätigt am 2026-07-16 |
| U-K09 | Forschungsvalidierungs-Backlog | Slice 9 | Nutzer + Reviewer | ausstehend |
| U-K10 | Gesamtabschluss | Slice 10, alle Gates grün | Nutzer + Reviewer | ausstehend |
| U-K11 | Commit und gegebenenfalls Push | U-K10 | Nutzer | ausstehend |

## 11. Slice-Status

| Slice | Status | Ergebnis |
| ---: | --- | --- |
| 1 | freigegeben | Baseline, Messvertrag, Scope-Gates und Branch validiert; MIT und U-K02 bestätigt; Review durch Gemini abgeschlossen am 2026-07-16 |
| 2 | freigegeben | 69 MKT-Records und Kriterienmatrix im normativen Register; Markt-Hauptblock auf 2.839 Wörter verdichtet; Review durch Gemini abgeschlossen am 2026-07-17 |
| 3 | freigegeben | 55 FOR-Records und 17 MAP-Dossiers im normativen Register; Forschungsblock 101 Wörter größer als Markt; gemeinsamer Anteil 24,43 %; Review durch Gemini abgeschlossen am 2026-07-17 |
| 4 | freigegeben | Offline-Validator und `npm run docs:evidence`; 69 MKT-, 55 FOR-, 17 MAP-Nachweise und 18 Aktualitätsscopes; 4.460/4.460 Assertions grün; Review durch Gemini abgeschlossen am 2026-07-17 |
| 5 | geplant | konsistente Lizenzmetadaten |
| 6 | geplant | korrigierter Real-/Nominalvertrag |
| 7 | geplant | korrigierter Pflegekosten-Einheitenvertrag |
| 8 | geplant | präzise Depot-Erschöpfungs-KPI |
| 9 | geplant | operationalisierter Forschungsvalidierungs-Backlog |
| 10 | geplant | Gesamtintegration und Abschlussvalidierung |

## 12. Branch- und Statusnachweis der Planerstellung

Vor dem ersten Edit dieser Plan-Datei am 2026-07-16:

- aktiver Branch: `codex/architektur-fachkonzept-doku`;
- bestehende Änderungen: freigegebene beziehungsweise noch zur U-08-Abnahme
  anstehende Markdown-Änderungen aus Slice 01 bis 08;
- vorbestehend und nicht Teil des Auftrags: ungetrackte Playwright-Dateien
  unter `node_modules`;
- die Planerstellung verändert keine bestehende Programm-, Test-, Build- oder
  generierte Datei.

Der zukünftige Umsetzungs-Branch wird bewusst noch nicht angelegt, weil der
laufende Dokumentationsstand uncommitted ist. Ein Branchwechsel vor U-08 und
sicherem Ausgangscommit würde die beiden Vorhaben unnötig vermischen.

Vor Slice 1 wurde der sichere Ausgangscommit
`ffdc3cb50088752e76f111c149713c7bb0ca0fe4` bestätigt und der lokale
Umsetzungs-Branch `codex/architektur-fachkonzept-korrekturen` angelegt. Die
Branch-Veröffentlichung bleibt bis zu einer ausdrücklichen Nutzerfreigabe
ausstehend.

## 13. Diff-Risiko der Planerstellung

**Geplante Datei:**

- `docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`

**Voraussichtliche Änderungstiefe:**

- klein; eine neue Markdown-Datei

**Gefährdete Tests:**

- keine

**Nicht anfassen:**

- bestehende Slice-01-bis-08-Änderungen;
- alle Programm-, Test-, Build- und generierten Dateien;
- `node_modules`, `engine.js`, `dist` und `RuheStandSuite.exe`.

**Rollback-Strategie:**

- neue Plan-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen;
- keine bestehenden Dateien zurücksetzen;
- keine destruktiven Git-Kommandos verwenden.

## 14. Definition of Done

Das Korrekturvorhaben ist erst abgeschlossen, wenn:

- alle zehn Slices mit tatsächlichen Ergebnissen zurückdokumentiert sind;
- U-K01 bis U-K10 erteilt sind;
- Dokumenttopologie und Wortanteile die freigegebenen Kriterien erfüllen;
- Auditrecords vollständig, eindeutig und wartbar bleiben;
- Aktualitäts- und Fälligkeitsvertrag offline prüfbar ist;
- Lizenzmetadaten konsistent sind;
- PD-01 bis PD-03 entweder nach freigegebener Route behoben oder mit einem
  ausdrücklich angenommenen Restzustand dokumentiert sind;
- FR-/FQ-Risiken einen realistischen nächsten Nachweis besitzen, ohne als
  erledigt ausgegeben zu werden;
- alle vorgeschriebenen Tests und Zusatzgates grün sind;
- Diff und Status nur erwartete Dateien enthalten;
- Reviewer und Nutzer den Abschluss freigegeben haben;
- Archivierung, Commit und Push getrennt und nur nach Freigabe erfolgen.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Der Plan ist fachlich vollständig und übersetzt alle 10 Befunde (`KF-01` bis `KF-10`) in konkrete Korrekturschritte.
   - *Detailfinding:* Für `KF-06 / PD-01` (Realwertvertrag `jahresentnahme_real`) fehlen im Plan konkrete Vorkehrungen zum Umgang mit den zu erwartenden massiven Deltas bei der Auto-Optimierung. Da sich die Zielfunktion des Optimizers von nominalen Werten auf reale Werte verschiebt, werden sich die Optimierungsergebnisse zwingend verändern. Dies muss in der Validierungsphase von Slice 6 explizit vermessen und dokumentiert werden.
2. **Vertragstreue:** Der Normalisierungsvertrag für die Pflegekosten-Drift (`KF-07 / PD-02`) wird im Plan korrekt als eingleisige Schranke entworfen.
   - *Detailfinding:* Es bleibt unklar, ob die Persistenzschicht (gespeicherte JSON-Profile) berührt wird. Wenn Profile weiterhin Prozentwerte (`3.5`) speichern, muss sichergestellt sein, dass die Normalisierung ausschließlich in-memory an den Schnittstellengrenzen erfolgt. Eine Änderung des Persistenz-JSON-Formats muss explizit ausgeschlossen oder als Breaking Change deklariert werden.
3. **Fehlerbehandlung:**
   - Der statische Evidenzvalidator (`Slice 4`) darf keine Online-Ressourcen anfordern. Dies wird im Plan durch den Offline-Zwang korrekt abgesichert. Es fehlt jedoch die Festlegung, ob ein Scheitern des Validators das reguläre Testgate `npm test` blockiert. Dies sollte über ein Test-Wrapper-Modul sichergestellt werden.
4. **Seiteneffekte:**
   - Die Lizenzvereinheitlichung (`Slice 5`) ändert Konfigurationsdateien wie `package.json` und `Cargo.toml`. Hier ist penibel darauf zu achten, dass keine automatischen Dependency-Upgrades durch Paketmanager-Läufe ausgelöst werden.
5. **Was könnte brechen?**
   - Bei der Umsetzung von `PD-01` (Realwertkorrektur) besteht die Gefahr, dass die Berechnungsänderung in der Engine zwar korrekt ist, aber in den parallelisierten MC-Worker-Threads unvollständig serialisiert oder deserialisiert wird, was zu Abweichungen zwischen Single-Thread- und Multi-Thread-Läufen führt. Hier muss das Worker-Paritätsgate aus `worker-parity.test.mjs` intensiv genutzt werden.

### 2. Pre-Mortem
Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Szenario:* Die Normalisierung der Pflegekosten-Drift (`PD-02`) führt bei der Migration älterer Profile zu unbemerkten Konvertierungsfehlern (z. B. doppelte Skalierung beim Laden eines alten Profils, da die UI-Ladeschnittstelle und der Profilmanager unterschiedliche Annahmen treffen), wodurch die Altersvorsorge-Simulationen für Pflegekosten fehlerhafte Pfade berechnen.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Persistenz-Kompatibilität:* Risiko von Schema-Drifts in alten Benutzerprofilen bei der Pflegekosten-Drift-Bereinigung.
  - *Optimizer-Deltas:* Verschiebung der mathematischen Maxima bei Sweeps und Optimierungen durch die Realwert-Umstellung von `jahresentnahme_real`.
- Pre-Mortem: (Siehe Szenario oben – unbemerktes Profil-Konvertierungs-Delta bei `PD-02`).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Die vier Detailfindings wurden angenommen und in den betroffenen Slices
verbindlich nachgeschärft:

1. Slice 6 erhält eine reproduzierbare Auto-Optimize-Delta-Baseline mit
   identischen Seeds und Eingaben sowie ein ausdrückliches
   Worker-Paritätsgate.
2. Slice 7 hält das persistierte JSON-Profilformat als Prozentwertvertrag
   unverändert; die Normalisierung erfolgt nur in-memory. Eine
   Schemamigration ist ausgeschlossen.
3. Slice 4 bindet den Offline-Validator über eine gezielte Testdatei in
   `npm test` ein. Eine Netzwerkabhängigkeit bleibt ausgeschlossen.
4. Slice 5 führt keine Paketinstallation oder Dependency-Aktualisierung aus;
   ein Lockfile-Diff darf ausschließlich den Root-Lizenzwert betreffen.

Der Nutzer hat den Plan mit dem Auftrag zur Bearbeitung von Slice 1 bestätigt
und am 2026-07-16 zusätzlich PD-01 Route A sowie die PD-03-Labelroute gewählt.
Anschließend hat er MIT ausdrücklich als autoritative Projektlizenz bestätigt
und U-K02 für Dokumenttopologie und Messvertrag freigegeben. Codex
dokumentiert hier externe Entscheidungen und erteilt keine Eigenfreigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| G-01 | Gemini | Auto-Optimize-Deltas bei PD-01 explizit vermessen | angenommen | Slice 6 ergänzt |
| G-02 | Gemini | Persistenzformat bei PD-02 unverändert halten | angenommen | Slice 7 ergänzt |
| G-03 | Gemini | Offline-Validator muss das reguläre Testgate blockieren | angenommen | Slice 4 ergänzt |
| G-04 | Gemini | Lizenzänderung darf keine Dependency-Upgrades auslösen | angenommen | Slice 5 ergänzt |
| G-05 | Gemini | Worker-Parität bei PD-01 als Pflichtgate nutzen | angenommen | Slice 6 ergänzt |
| U-K01 | Nutzer/Reviewer | Korrekturplan | freigegeben | erledigt am 2026-07-16 |
| U-K02 | Nutzer | Dokumenttopologie und Messvertrag | freigegeben | erledigt am 2026-07-16 |
| U-K05 | Nutzer | autoritative Projektlizenz | MIT | für Slice 5 verbindlich |
| U-K06 | Nutzer | PD-01 Route | Route A | Route entschieden; Delta-Baseline folgt vor Slice 6 |
| U-K08 | Nutzer | PD-03 Route | Labelkorrektur | erledigt am 2026-07-16 |
