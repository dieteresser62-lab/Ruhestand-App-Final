# Slice 1: Bestand und Zielgliederung

**Stand:** 2026-07-15  
**Arbeitsplan:** `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`  
**Zieldokument:** `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`  
**Feature-Branch:** `codex/architektur-fachkonzept-doku`  
**GitHub-Status:** Branch nur lokal; Veröffentlichung und Push sind nicht beauftragt  
**Status:** durch den Nutzer freigegeben  
**Freigabe:** U-02 am 2026-07-15 mit „U-02 freigegeben“ erteilt

## Ziel

Eine reproduzierbare Baseline für Dokument, Code, Module, Tests und öffentliche
Engine-API herstellen und eine belastbare Zielgliederung für die folgenden
Überarbeitungsslices festlegen. Der Slice ändert ausschließlich Dokumentation
und weder Laufzeitcode noch Engine-Semantik.

## Akzeptanzkriterien

- Alle Bestandszahlen tragen Stichtag und reproduzierbaren Ermittlungsweg.
- Veraltete Momentaufnahmen, Dopplungen und widersprüchliche Aussagen sind
  konkret erfasst.
- Die Zielgliederung deckt Übersicht, Architektur, Fachkonzept,
  Marktvergleich, wissenschaftliche Einordnung, Glossar, Annahmen und
  Modellrisiken ab.
- Marktvergleich und wissenschaftliche Einordnung sind eigenständige,
  ausreichend tiefe Hauptbereiche; die wissenschaftliche Einordnung ist
  umfangreicher als der Marktvergleich geplant.
- Für Detailinventare ist entschieden, ob sie im Hauptdokument bleiben oder
  auf die jeweilige Source of Truth verweisen.
- Redaktionelle Umfangsziele und ein Quellenformat sind festgelegt.
- Keine Programmdatei, kein Test, kein generiertes Artefakt und keine
  Engine-Semantik wird geändert.
- Vor Slice 2 liegt die ausdrückliche Nutzerfreigabe U-02 vor.

## Scope

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`
- `engine/README.md` nach ausdrücklicher Nutzerentscheidung zum während der
  Validierung erkannten EngineAPI-Contract-Widerspruch
- diese Slice-Datei
- rein lesender Abgleich mit den verbindlichen Referenzen, Quellmodulen,
  Tests und `package.json`

## Nicht-Scope

- Änderungen an JS-, MJS-, HTML-, CSS-, Rust-, JSON-, Test- oder Build-Dateien
- externe Markt- oder Literaturrecherche; sie beginnt erst in den dafür
  vorgesehenen Slices
- inhaltliche Neuschreibung der Architektur- und Fachkapitel
- Änderung der Engine-Semantik oder Ergänzung neuer Produktfunktionen
- manuelle Änderungen an `engine.js`, `dist/`, `RuhestandSuite.exe` oder
  `node_modules/`

## Branch- und Statuscheck vor Umsetzung

Ausgeführt am 2026-07-15 vor dem ersten Slice-Edit.

```text
git branch --show-current
codex/architektur-fachkonzept-doku

git status --short
?? docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die Plan-Datei gehört zum aktuellen Dokumentationsauftrag. Die ungetrackten
Playwright-Dateien bestanden bereits und bleiben unberührt und außerhalb des
Slice-Scope.

## Diff-Risiko vor Umsetzung

**Geplante Dateien:**

- `docs/internal/SLICE_ARCHITEKTUR_FACHKONZEPT_01_BESTAND_STRUKTUR.md` (neu)
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`

Nach dem Contract-Befund S1-11 wurde `engine/README.md` als vierte
Markdown-Datei ergänzt. Der Nutzer hat diese eng begrenzte Synchronisation mit
der Entscheidung „Setze die Variante so um“ ausdrücklich autorisiert.

**Voraussichtliche Änderungstiefe:**

- mittel; ausschließlich Markdown, mit neuer Baseline/Zielgliederung und
  Rückdokumentation

**Gefährdete bestehende Tests:**

- keine Laufzeittests; redaktionelles Risiko bei Ankern, Inventarzahlen und
  Querverweisen

**Nicht anfassen:**

- alle Programm-, Build- und generierten Dateien
- README-/Spezialreferenzen ohne konkret nachgewiesenen Widerspruch
- `node_modules/` und die vorbestehenden ungetrackten Playwright-Dateien

**Rollback-Strategie:**

- `git checkout -- docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md docs/internal/ARCHITEKTUR_UND_FACHKONZEPT_UEBERARBEITUNGSPLAN.md`
- die neue Slice-Datei nur nach ausdrücklicher Nutzerfreigabe entfernen

## Geplante Validierung

- Dokumentzeilen und Kapitelanteile reproduzierbar bestimmen
- Modul- und Testinventar mit dokumentierten `rg`-Befehlen ermitteln
- öffentliche Engine-API gegen `engine/index.mjs` und `engine/README.md`
  abgleichen
- Build- und Testkommandos gegen `package.json` und `tests/README.md`
  abgleichen
- Überschriftenhierarchie, interne Markdown-Links und Anker prüfen
- veraltete Zahlen, Datumsstände, Dopplungen und absolute Aussagen suchen
- `git diff --check`
- abschließenden Git-Scope-Check ausführen

## Bestand und Befunde

### Erhebungsbasis

Die Baseline bezieht sich auf den unveränderten Laufzeitcode von Commit
`6ea3e7a268b42afee6ea9111ad28c8ec4b6098c6` vom 2026-07-15, 13:53:34
+02:00. Die während dieses Slices geänderten Markdown-Dateien sind nicht Teil
dieses Code-Commits. Ermittelt wurde der Commit mit:

```powershell
git rev-parse HEAD
git show -s --format='%H%n%ci%n%s' HEAD
```

Verbindlich abgeglichen wurden:

- `package.json` für Build- und Testkommandos;
- `engine/config.mjs`, `engine/core.mjs` und `engine/index.mjs` für Version,
  Build-ID, Exporte und öffentliche API;
- `engine/README.md` und `tests/README.md` für Engine- und Testverträge;
- `docs/reference/TECHNICAL.md` sowie die Balance-, Simulator- und
  Tranchen-Modul-READMEs für Modulgrenzen;
- aktuelle Dateien unter `app/`, `engine/`, `workers/`, `types/` und `tests/`
  als rein lesende Inventarbasis.

### Dokument- und Strukturbaseline vor Slice 1

Das Ausgangsdokument hatte am 2026-07-15 vor dem ersten Slice-Edit 3.076
physische Zeilen. Die Bereiche wurden über die sechs Top-Level-Blöcke und
`(Get-Content docs\reference\ARCHITEKTUR_UND_FACHKONZEPT.md).Count`
abgegrenzt:

| Bereich | Ausgangszeilen | Zeilen | Anteil |
| --- | ---: | ---: | ---: |
| Dokumentkopf und Übersicht | 1–191 | 191 | 6,2 % |
| Technische Architektur | 192–1.095 | 904 | 29,4 % |
| Fachliche Algorithmen | 1.096–2.661 | 1.566 | 50,9 % |
| Marktvergleich | 2.662–2.819 | 158 | 5,1 % |
| Forschungsabgleich | 2.820–2.931 | 112 | 3,6 % |
| Appendix und Quellen | 2.932–3.076 | 145 | 4,7 % |

Marktvergleich und Forschungsabgleich belegten zusammen nur 270 Zeilen
(8,7 %). Die Navigation verwies nur auf grobe Hauptbereiche, obwohl Architektur
und Fachkonzept zusammen 2.470 Zeilen umfassten. Ein Glossar, ein
Annahmenregister, ein Modellrisikoregister, eine Marktmethodik und eine
Evidenztaxonomie fehlten als eigenständige Strukturelemente.

### Reproduzierbares Modul- und Testinventar

Ausgeführt am 2026-07-15 im Repository-Root:

```powershell
(rg --files app\balance -g '*.js' | Measure-Object).Count
(rg --files app\simulator -g '*.js' | Measure-Object).Count
(rg --files app\profile -g '*.js' | Measure-Object).Count
(rg --files app\tranches -g '*.js' | Measure-Object).Count
(rg --files app\shared -g '*.js' | Measure-Object).Count
(rg --files types -g '*.js' | Measure-Object).Count
(rg --files engine -g '*.mjs' | Measure-Object).Count
(rg --files workers -g '*.js' | Measure-Object).Count
(rg --files tests -g '*.test.mjs' | Measure-Object).Count
```

| Bereich | Filter | Ergebnis |
| --- | --- | ---: |
| `app/balance/` | `*.js` | 36 |
| `app/simulator/` | `*.js` | 95 |
| `app/profile/` | `*.js` | 13 |
| `app/tranches/` | `*.js` | 7 |
| `app/shared/` | `*.js` | 12 |
| `types/` | `*.js` | 3 |
| `engine/` | `*.mjs` rekursiv über `rg --files` | 27 |
| `workers/` | `*.js` | 3 |
| `tests/` | `*.test.mjs` | 107 |

`tests/README.md` trennt davon 106 Dateien im Node-Standardgate und
`browser-smoke.test.mjs` als separates Pflichtgate. Die dort genannte
Runner-Baseline wurde am 2026-07-14 mit `npm test` erhoben; sie wurde in diesem
reinen Dokumentationsslice nicht als neuer Testlauf ausgegeben. Exakte
Assertion- und Coverage-Zahlen bleiben deshalb in `tests/README.md` und werden
nicht als dauerhafte Architekturkennzahl dupliziert.

### EngineAPI-Oberfläche und Kommandobaseline

`engine/config.mjs` definiert API-Version `31.0` und Build-ID
`2025-12-22_16-35`. Der unterstützte operative Vertrag besteht aus fünf
Methoden:

1. `getVersion()`
2. `getConfig()`
3. `analyzeMarket(input)`
4. `calculateTargetLiquidity(profil, market, inflatedBedarf)`
5. `simulateSingleYear(input, lastState)`

Das tatsächliche `EngineAPI`-Objekt enthält außerdem `addDecision()`,
`updateDecision()` und `removeDecision()`. Alle drei sind in `engine/core.mjs`
als `@deprecated` markierte No-op-Stubs, werden aber von
`Object.keys(EngineAPI)` als Methoden exponiert. Nach der Nutzerentscheidung
wird die Oberfläche deshalb verbindlich als acht exponierte Methoden
dokumentiert: fünf unterstützte operative Methoden und drei deprecated
No-op-Kompatibilitäts-Stubs, die neue Aufrufer nicht verwenden dürfen.
`engine/index.mjs` exportiert daneben `_internal_calculateModel`; dieser
Pipeline-Einstieg ist kein Mitglied des `EngineAPI`-Objekts und bleibt intern.

Die in `package.json` nachgewiesenen Gates sind:

| Zweck | Kommando |
| --- | --- |
| Node-Standardgate | `npm test` |
| Browser-Smoke | `npm run test:browser` |
| Coverage | `npm run test:coverage` |
| Engine-Bundle | `npm run build:engine` |
| striktes Engine-Bundle | `npm run build:engine:strict` |
| Tauri-Build | `npm run tauri:build` |
| Windows-Releasepfad | `npm run build-tauri-exe` |

### Befundliste

| ID | Befund | Konsequenz |
| --- | --- | --- |
| S1-01 | Kopf, Komponentenübersicht, B.1, B.2 und B.5 verwendeten unterschiedlich alte Stände; insbesondere 35 statt 36 Balance-Module und 101 statt 107 Testdateien. | Metadaten und alle betroffenen Inventarstellen wurden auf den reproduzierbaren Stand gebracht. |
| S1-02 | Ein aktueller Dateizähler konnte als vollständiger inhaltlicher Codeabgleich missverstanden werden, obwohl nach dem Redaktionsstand 2026-07-04 weitere Härtungen integriert wurden. | Dokument-, Inventar-, Inhalts-, API- und externe Quellenstände werden getrennt ausgewiesen. Die inhaltliche Aufarbeitung bleibt Scope der Slices 2 und 3. |
| S1-03 | Markt und Forschung machten zusammen nur 8,7 % aus; der Marktteil war primär eine Feature-Matrix, der Forschungsteil bestand aus acht kurzen Einzelzuordnungen. | Beide werden eigenständige Hauptbereiche; die wissenschaftliche Einordnung erhält mehr Raum als der Marktvergleich. |
| S1-04 | Das Inhaltsverzeichnis war für mehr als 3.000 Zeilen zu grob. Betriebsanleitung, Architektur, Fachlogik, Modellgrenzen und Pflegecheckliste waren nicht klar genug getrennt. | Die Zielgliederung trennt Leseführung, Architektur, Fachkonzept, Modellrisiken, Markt, Forschung und Betrieb. Jeder lange Hauptbereich erhält eine lokale Kapitelübersicht. |
| S1-05 | Der Appendix duplizierte Modul-READMEs und enthielt volatile, teils veraltete LOC-Angaben sowie eine doppelte Nummer 24 im Algorithmeninventar. | LOC-Angaben und die Doppelnummer wurden bereinigt. Der Appendix wird später auf eine konzeptionelle Modulkarte mit Verweisen reduziert. |
| S1-06 | Der Quellenaltbestand hatte keine einheitlichen Abrufdaten, Produktstufen, Evidenzklassen oder quellennahen Belege. Mehrere Wettbewerbsquellen waren Sekundärreviews. | Einheitliches Quellenformat und Aussageklassen werden verbindlich; die eigentliche Neurecherche beginnt erst in Slice 4. |
| S1-07 | Begriffe, Rechnungszeitpunkte, Annahmen und Modellrisiken waren über viele Fachkapitel verteilt. | Glossar, Zeitkonventionen, Annahmenregister und Modellrisikoregister werden eigene Unterbereiche. |
| S1-08 | Aussagen wie „vollständige deutsche Kapitalertragssteuer“, „kein anderes verglichenes Tool“ und „Novität“ sind weiter gefasst als die dokumentierten Modellgrenzen oder die bisherige Vergleichsmethodik tragen. | In Slices 3 bis 5 qualifizieren oder ersetzen; bis dahin kennzeichnet der Kopf Markt- und Forschungsaussagen als nicht neu verifiziert. |
| S1-09 | Die vollständige Pfadprüfung der in Backticks genannten Quell- und Referenzdateien fand keine verwaisten Repository-Verweise. Nur `ruhestand_suite_data.json` und `ruhestand_suite_snapshots.json` lösen nicht auf, weil sie Laufzeitdateien im Tauri-App-Datenverzeichnis sind. | Keine pfadbedingte Stop-Regel. Laufzeitdateien künftig ausdrücklich als erzeugte Dateien kennzeichnen. |
| S1-10 | Die 36. Balance-Datei `balance-annual-period.js`, der periodengebundene Jahresworkflow und die jüngsten Profil-/Tranchen-Härtungen sind im Alttext nur teilweise oder nicht zusammenhängend erklärt. | Für Slice 2 als Architekturdelta vorgemerkt; in Slice 1 wurde keine fachliche Beschreibung erfunden. |
| S1-11 | `engine/README.md` und das bestehende Hauptdokument nannten fünf öffentliche EngineAPI-Methoden; das Laufzeitobjekt exponiert zusätzlich drei `@deprecated`-No-op-Stubs. | Stop-Regel ausgelöst und Nutzerentscheidung eingeholt. Verbindlich dokumentiert sind nun acht exponierte Methoden: fünf unterstützte operative Methoden und drei deprecated No-op-Kompatibilitäts-Stubs. |

### Entfernen, ersetzen, erweitern

| Entscheidung | Inhalte |
| --- | --- |
| Entfernen | volatile LOC- und EXE-Größenangaben; doppelte Modul-/Algorithmusinventare; unbelegte Superlative und unbeschränkte Exklusivitätsaussagen; redaktionelle Zwischenstände ohne Aktualitätslabel |
| Ersetzen | Datei-für-Datei-Appendix durch kompakte Modul-/Ownership-Karte; pauschale Quellenliste durch quellennahes Belegsystem plus Bibliografie; reine Feature-Matrix durch methodischen Marktvergleich; kurze Forschungsblurbs durch Evidenz-Mappings |
| Erweitern | Aktualitätsmetadaten; Navigationshilfen; Architektur- und Zustandsflüsse; Glossar und Zeitkonventionen; Annahmen- und Modellrisikoregister; Marktmethodik; Konkurrenzstärken und eigene Grenzen; wissenschaftliche Grundlagen, Abweichungen und offene Forschungsfragen |
| Im Hauptdokument behalten | Produktzweck und Abgrenzung; konzeptionelle Laufzeit- und Ownership-Architektur; stabile öffentliche Engine-API; zentrale Fachinvarianten und Rechnungszeitpunkte; Interpretation von Ergebnissen; Marktpositionierung und Evidenzeinordnung |
| Nur kompakt referenzieren | vollständige Export- und Modulverzeichnisse in Modul-READMEs; alphabetisches Testinventar und aktuelle Runnerwerte in `tests/README.md`; Buildskripte in `package.json`/`TECHNICAL.md`; detaillierte Datenprovenienz in `DATA_SOURCES.md` |

## Zielgliederung

Die folgende 1-basierte Gliederung ist der Freigabegegenstand U-02. Sie legt
die redaktionelle Zielstruktur fest, ohne vor der Nutzerfreigabe bereits die
große Umordnung auszuführen.

### 1. Dokumentstatus und Leseführung

- getrennte Stände für Dokument, Inhalt/Code, Inventar/API, Daten und externe
  Quellen;
- Lesewege für Anwender, fachliche Prüfer und Entwickler;
- Source-of-Truth-Hierarchie und Aussagearten;
- kompakte Kapitelübersicht mit Links auf alle Haupt- und Unterbereiche.

### 2. Produktübersicht, Zielgruppe und Abgrenzung

- Zweck, Komponenten und wichtigste Workflows;
- unterstütztes Anlagen- und Haushaltsmodell;
- Zielgruppen und Nicht-Zielgruppen;
- Fähigkeiten, bewusste Nicht-Ziele und bekannte Grenzen in neutraler Sprache.

### 3. Technische Architektur und Datenverträge

- Einstiegspunkte, Laufzeit- und Auslieferungsschichten;
- Ownership- und Schreibgrenzen von Balance, Simulator, Engine, Profilen,
  Tranchen, Persistenz und Workers;
- öffentliche Engine-API, Eingabe-, Ergebnis-, Fehler- und
  Settlement-Verträge;
- Balance-Jahresworkflow und Simulator-Jahrespipeline als Zustandsfolgen;
- Persistenz, Import, Migration, Recovery, Quarantäne und Snapshot-Archiv;
- Profilverbund-Attribution, Haushalts-Reconciliation und kanonischer
  Tranchenvertrag;
- Live-Daten, Stichtage, Fallbacks und Provenienz;
- Browser/Tauri, Datenschutz-, Netzwerk- und Sicherheitsgrenzen;
- Testpyramide, Worker-Parität und Release-Gates.

### 4. Fachkonzept und Rechenkonventionen

- Glossar für Floor, Flex, Bedarf, reale/nominale Werte, Runway, Reserve,
  Erfolg, Ruin und Pflegebucket;
- Zeitachse mit Jahresanfang/-ende, Inflation, Rente, Verkäufen,
  Steuer-Settlement, Tod und Pflegeereignissen;
- Portfolio-, Asset- und Zielgruppenmodell;
- Floor/Flex, Guardrails, Regime, VPW und Mindest-Flex;
- Liquiditätssteuerung, Transaktionen, Rebalancing, 3-Bucket und Steuern;
- Rente, Witwenrente und Ansparphase;
- Langlebigkeit, Pflegeereignisse und Pflegebucket;
- historische Daten, Backtest, Monte Carlo, Bootstrap, Regime- und
  Tail-Risk-Modelle;
- Sweep, Auto-Optimize, Ergebnisgrößen und operative Nutzerentscheidungen.

### 5. Annahmen, Modellgrenzen und Validierung

- strukturiertes Annahmenregister mit Status, Auswirkung und Source of Truth;
- Modellrisikoregister mit Eintrittspfad, beobachtbarer Wirkung und
  Gegenmaßnahme;
- Gebühren, Kosten, Währungen, Steuern/Regulierung, Datenrekonstruktion,
  Asset- und Zielgruppengrenzen;
- Trennung von Contract-Test, numerischer Regression, historischer
  Plausibilisierung, empirischer Kalibrierung und Prognosegüte;
- Anleitung zur Interpretation von Erfolgsquote, Kürzungen,
  Floor-Verletzungen, Stressdauer, Nachlass, Steuer und Liquiditätsengpass.

### 6. Methodik des Marktvergleichs

- Recherchezeitraum, Segmente, Auswahlregeln und Produktstichprobe;
- einheitliche Kriterien und Statusbegriffe;
- synthetischer Referenzhaushalt und Modellierbarkeitsprüfung;
- Quellen-, Tarif-/Produktstufen- und Abrufdatumsschema;
- Grenzen der Vergleichbarkeit und Aktualisierungsroutine.

### 7. Marktanalyse und Positionierung

- Produktprofile und belegte Vergleichsmatrix;
- Auswertung des synthetischen Referenzhaushalts;
- Konkurrenzstärken, eigene Stärken, eigene Lücken und Nicht-Zielsegmente;
- Differenzierungsmerkmale nur innerhalb der freigegebenen Stichprobe;
- ausgewogene Schlussfolgerungen ohne Marketing-Superlative.

### 8. Wissenschaftlicher Rahmen und Evidenz-Mapping

- Evidenztaxonomie und Übertragbarkeitsregeln;
- Safe Withdrawal, flexible Entnahmen, Guardrails und VPW/RMD;
- Safety-first, Floor-and-Upside, Lifecycle Finance und Konsumglättung;
- Sequence-of-Returns, Langlebigkeit, Verrentung und Pflege;
- Bootstrap, Regime, Fat Tails, Stressmodelle und historische Grenzen;
- CAPE, Renditeerwartungen, Cash/Bonds/Gold und Bucket-Strategien;
- Backtest-, Optimierungs-, Data-Snooping- und Overfitting-Risiken;
- deutsche offizielle Daten zu Sterblichkeit, Rente und Pflege;
- je Suite-Mechanismus: Forschungsgrundlage, konkrete Umsetzung, Abweichung,
  Evidenzstatus, Validierung, Modellrisiko und offene Forschungsfrage.

### 9. Betrieb, Pflege und Änderungsnachweis

- Start-, Build- und Testpfade mit Verweis auf `package.json`;
- Dokumentations- und Release-Checkliste;
- Aktualisierungsrhythmus für Inventar, Markt und Forschung;
- Änderungs- und Evidenzprotokoll.

### Appendices

- **A:** kompakte konzeptionelle Modul- und Ownership-Karte;
- **B:** stabile Engine-API- und Datenvertragsübersicht ohne vollständige
  Exportduplikation;
- **C:** Annahmen-/Modellrisiko-Kurzregister zum Nachschlagen;
- **D:** Bibliografie und Quellenindex;
- **E:** Verweise auf die veränderlichen Detailinventare und
  Reproduktionskommandos.

## Redaktionelle Regeln

### Umfang und Balance

Bezugsgröße ist das inhaltliche Hauptdokument ohne Titel/TOC, Bibliografie und
Appendices. Die Zielanteile sind Orientierungswerte mit ungefähr zwei
Prozentpunkten Toleranz, keine Aufforderung zum Fülltext:

| Zielbereich | Zielanteil |
| --- | ---: |
| Dokumentstatus, Leseführung und Produktübersicht | 8 % |
| Technische Architektur und Datenverträge | 25 % |
| Fachkonzept und Rechenkonventionen | 32 % |
| Annahmen, Modellgrenzen und Validierung | 9 % |
| Marktmethodik und Marktanalyse zusammen | 9 % |
| Wissenschaftlicher Rahmen und Evidenz-Mapping | 14 % |
| Betrieb, Pflege und Änderungsnachweis | 3 % |

Markt und Wissenschaft erreichen damit zusammen 23 %, wobei die
wissenschaftliche Einordnung deutlich größer bleibt. Das Gesamtdokument soll
nach Konsolidierung möglichst unter 4.200 physischen Zeilen bleiben. Wird diese
Schwelle voraussichtlich überschritten, sind zuerst Duplikate, Datei-Inventare
und lange Codebeispiele zu kürzen; eine fachliche Aussage darf nicht allein für
eine Zeilenvorgabe entfallen.

### Detailtiefe und Navigation

- Jeder Hauptbereich beginnt mit Zweck, Abgrenzung und lokaler
  Kapitelübersicht.
- Architekturdiagramme zeigen Zustände, Ownership oder Datenflüsse, nicht bloß
  Dateilisten.
- Im Fließtext bleiben nur repräsentative Module und stabile Verträge;
  vollständige Export- und Dateilisten werden verlinkt.
- Wiederholte Fachmechanismen erhalten einen autoritativen Erklärort; andere
  Kapitel fassen nur ihre jeweilige Architektur-, Bedien- oder Evidenzsicht
  zusammen und verlinken dorthin.
- Tabellen benötigen definierte Spaltenbedeutungen, Stichtag und Source of
  Truth. Emojis sind keine Evidenz- oder Reifegradkennzeichnung.
- Codebeispiele bleiben kurz, synthetisch und werden nur verwendet, wenn sie
  einen Vertrag besser erklären als Prosa oder ein Zustandsdiagramm.

### Aussage- und Quellenformat

Jede wesentliche Aussage wird als externe Evidenz, offizielle
Produktinformation, Implementierungsstand, eigene Adaption, Heuristik,
Experiment oder Schlussfolgerung erkennbar. Schlussfolgerungen werden mit
„Daraus folgt für die Suite …“ oder einer gleichwertigen Inferenzmarkierung
eingeleitet.

| Quellentyp | Kennung und Vollformat |
| --- | --- |
| Lokaler Implementierungsnachweis | Repository-Pfad und Symbol in Backticks, dazu geprüfter Commit oder Inventarstichtag; bei komplexen Verträgen zusätzlich der maßgebliche Test/README-Verweis |
| Marktquelle | `[M-<produkt>-NN]` Anbieter, Seitentitel, untersuchte Produkt-/Tarifstufe, offizielle URL, Abrufdatum `YYYY-MM-DD`; Sekundäreindruck ausdrücklich als solcher |
| Wissenschaftliche Quelle | `[W-NN]` Autor(en), Titel, Jahr, Publikation, DOI oder dauerhafte URL, Evidenzklasse, Abrufdatum |
| Deutsche/offizielle Institution | `[I-<institution>-NN]` Institution, Statistik/Methodenbericht/Rechtsquelle, Berichtsstand, dauerhafte URL, Abrufdatum |

Kernaussagen erhalten die Quellenkennung direkt am Satz oder in der
betroffenen Tabellenzelle. Das Literaturverzeichnis enthält den Vollnachweis;
eine unspezifische Linkliste am Dokumentende reicht nicht. Wörtliche Zitate
werden sparsam verwendet und mit Seite beziehungsweise Abschnitt belegt.
Zeitabhängige Preis-, Tarif-, Funktions-, Steuer- und Statistikangaben tragen
immer Stichtag oder Abrufdatum. „Nicht öffentlich dokumentiert“ darf nicht zu
„nicht vorhanden“ verkürzt werden.

## Durchgeführte Änderungen

1. Diese Slice-Datei mit Branch-/Statusnachweis, Diff-Risiko, Scope,
   Akzeptanzkriterien, reproduzierbarer Baseline, Befundliste,
   Zielgliederung, Umfangszielen und Quellenformat angelegt.
2. Im Hauptdokument Dokument-, Inhalts-, Inventar-, API- und externe
   Quellenstände getrennt ausgewiesen.
3. Modul- und Testinventar auf Commit `6ea3e7a` aktualisiert: insbesondere 36
   statt 35 Balance-Module und 107 statt 101 entdeckte Testdateien.
4. Reproduktionskommandos auf `rg --files` und den Git-Commitnachweis
   umgestellt; volatile LOC-Schätzungen und die feste EXE-Größenangabe aus den
   Inventaren entfernt.
5. Appendix als heterogen datierten Altbestand markiert und die doppelte
   Algorithmusnummer 24 korrigiert.
6. `EngineAPI` in Hauptdokument und `engine/README.md` konsistent als acht
   exponierte Methoden dokumentiert: fünf unterstützte operative Methoden und
   drei deprecated No-op-Kompatibilitäts-Stubs.
7. Den Arbeitsplan mit U-01, Slice-Link, Ergebnis und der am 2026-07-15
   erteilten Nutzerfreigabe U-02 zurückdokumentiert.

Es wurden keine Programm-, Test-, Build- oder generierten Dateien geändert.

## Ausgeführte Validierung

| Prüfung | Ergebnis |
| --- | --- |
| Branch- und Vorstatusprüfung | bestanden; Feature-Branch `codex/architektur-fachkonzept-doku`, vorbestehende ungetrackte Playwright-Dateien dokumentiert |
| Reproduzierbares Dateiinventar | bestanden: Balance 36, Simulator 95, Profile 13, Tranchen 7, Shared 12, Types 3, Engine 27, Workers 3, Tests 107 |
| EngineAPI-Laufzeitprüfung per direktem ESM-Import | bestanden: API `31.0`, Build-ID `2025-12-22_16-35`, exakt acht exponierte Methoden; fünf operative Schlüssel und drei deprecated Stubs vorhanden; alle drei Stubs liefern `undefined` |
| Abgleich mit `package.json`, `engine/README.md`, `tests/README.md` und Modulreferenzen | bestanden; Kommandos und Inventartrennung konsistent |
| Markdown-Überschriftenhierarchie | bestanden: keine Ebenensprünge außerhalb von Codeblöcken in den vier Scope-Dateien |
| Interne Anker und relative Markdown-Links | bestanden: 13 interne Anker im Hauptdokument auflösbar, keine fehlende relative Markdown-Datei |
| Quellpfad-Audit im Hauptdokument | bestanden: 220 eindeutige, nicht-variable Dateikandidaten geprüft; nur die erwarteten Tauri-Laufzeitdateien `ruhestand_suite_data.json` und `ruhestand_suite_snapshots.json` liegen nicht im Repository |
| Suche nach abgelösten Inventar-/Blockermustern | bestanden; keine alten 35-/101-Zählwerte, entfernten LOC-Muster oder offenen Contractformulierungen mehr vorhanden |
| Audit absoluter Markt-/Vollständigkeitsbehauptungen | fünf Treffer als S1-08 für die Slices 3 bis 5 vorgemerkt; keine ungeprüfte redaktionelle Umschreibung in Slice 1 |
| `git diff --check` | bestanden |
| Abschließender Scope-Check | bestanden: nur die vier freigegebenen Markdown-Dateien geändert/neu; vorbestehende ungetrackte Playwright-Dateien unter `node_modules/` unverändert |

`npm test`, Browser-Smoke, Coverage und Engine-Build wurden nicht ausgeführt.
Der Slice ändert ausschließlich Markdown und behauptet keinen neuen
Anwendungstestlauf. Der direkte ESM-Import diente nur dem reproduzierbaren
Methoden-/Versionsabgleich und veränderte keine Artefakte.

## Abweichungen vom Plan

- `engine/README.md` kam als vierte Scope-Datei hinzu. Grund war der in der
  Validierung entdeckte Widerspruch zwischen fünf dokumentierten Methoden und
  acht tatsächlich exponierten Methoden. Codex stoppte gemäß Regel; der Nutzer
  autorisierte anschließend ausdrücklich die Variante mit fünf unterstützten
  Methoden plus drei deprecated No-op-Kompatibilitäts-Stubs.
- Der geplante npm-Testlauf entfiel nicht unerwartet, sondern gemäß der im
  Arbeitsplan festgelegten Doku-Validierung. Es wurden keine aktuellen
  Assertion-Zahlen neu behauptet.
- Externe Markt- und Literaturquellen wurden planmäßig noch nicht recherchiert
  oder inhaltlich neu bewertet.

## Offene Risiken

- Slice 2 ist durch U-02 prozessual zulässig, wurde aber noch nicht beauftragt
  oder begonnen.
- Die Inventar- und API-Metadaten sind aktuell, der inhaltliche Architektur-
  und Fachtext bildet die nach dem 2026-07-04 integrierten Härtungen aber erst
  teilweise ab. Das bleibt Aufgabe der Slices 2 und 3.
- Fünf pauschale Vollständigkeits-/Exklusivitätsformulierungen bleiben als
  bewusst dokumentierter Altbestand bis zu den fachlich passenden Slices 3
  bis 5 stehen.
- Die drei deprecated EngineAPI-Stubs bleiben Teil der exponierten
  Objektoberfläche. Eine spätere Codeentfernung wäre eine eigene
  Contractänderung mit Engine-Build und vollständiger Testvalidierung.
- Die externe Quellenbasis besitzt weiterhin heterogene Stände und noch keine
  einheitlichen Abrufdaten. Sie darf bis zu den Recherche-Slices nicht als neu
  verifiziert interpretiert werden.

## Rückdokumentation in den Arbeitsplan

- U-01 ist mit dem Nutzerauftrag vom 2026-07-15 als freigegeben dokumentiert.
- Slice 1 ist verlinkt und als „freigegeben“ eingetragen.
- Das Ergebnis nennt Inventar-/Metadatenbaseline, Zielgliederung und
  EngineAPI-Referenzabgleich.
- U-02 ist mit Datum und Nutzerformulierung als erteilt dokumentiert.

## Ergebnisse

- Reproduzierbare Bestandsbasis für Dokument, Commit, Module, Tests,
  EngineAPI und Paketkommandos hergestellt.
- Veraltete Zählwerte und volatile LOC-/Größenangaben bereinigt.
- Strukturelle Defizite, Dopplungen, unklare Aktualitätsstände und zu breite
  Wettbewerbs-/Vollständigkeitsformulierungen mit Folgeslice-Zuordnung erfasst.
- Zielgliederung mit neun Hauptbereichen und fünf Appendices entworfen.
- Detailinventar-Policy, Navigationsregeln, Umfangsverteilung und
  Quellenformat verbindlich vorgeschlagen.
- EngineAPI-Widerspruch transparent aufgelöst und beide Referenzdokumente auf
  denselben Methodenvertrag synchronisiert.

Alle Akzeptanzkriterien dieses Slices sind erfüllt. Der Nutzer hat
Zielgliederung und Scope mit U-02 freigegeben. Slice 2 darf damit nach einem
separaten Umsetzungsauftrag und dem dort vorgeschriebenen Branch-/Status- und
Diff-Risiko-Check begonnen werden.

## Freigabestatus

- Implementierung durch Codex: abgeschlossen, keine Eigenfreigabe
- Nutzerfreigabe U-02: am 2026-07-15 erteilt
- Review durch Gemini/Claude: gemäß dokumentierter Prozessentscheidung für
  diesen reinen Dokumentationsauftrag nicht erforderlich
- Commit/Push: nicht durch Codex; separate Nutzerentscheidung erforderlich

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-01 | Nutzer | Arbeitsplan und Beginn von Slice 1 | angenommen | Auftrag „Slice 01 implementieren“ vom 2026-07-15 |
| U-API-01 | Nutzer | Acht exponierte Methoden als fünf unterstützte operative Methoden plus drei deprecated No-op-Kompatibilitäts-Stubs dokumentieren | angenommen | Hauptdokument und `engine/README.md` synchronisiert; Entscheidung „Setze die Variante so um“ |
| U-02 | Nutzer | Zielgliederung und Scope für die Folgeslices | angenommen | Am 2026-07-15 mit „U-02 freigegeben“ erteilt; Slice 2 ist nach separatem Auftrag zulässig |
