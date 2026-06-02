# Ueberarbeitungsplan: ARCHITEKTUR_UND_FACHKONZEPT.md

**Stand der Pruefung:** 2026-05-20  
**Zieldokument:** `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`  
**Bewertung:** Ueberarbeitung erforderlich. Das Dokument beschreibt fachlich weiterhin viele gueltige Konzepte, ist aber bei Bestandszahlen, Modul-Inventar, einzelnen Build-Hinweisen und einigen Querverweisen nicht mehr konsistent mit dem aktuellen Repository.

## Gepruefte Quellen

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/PROFILVERBUND_FEATURES.md`
- `docs/reference/DATA_SOURCES.md`
- `README.md`
- `engine/README.md`
- `tests/README.md`
- Aktuelle Dateistruktur unter `app/`, `engine/`, `workers/`, `tests/`, `src-tauri/`
- `package.json`
- `src-tauri/tauri.conf.json`

## Festgestellte Abweichungen

| Bereich | Dokumentierter Stand | Aktuelle Realitaet | Konsequenz |
| --- | --- | --- | --- |
| Meta-Stand | `ARCHITEKTUR_UND_FACHKONZEPT.md` nennt Februar 2026 | Repository und Referenzen enthalten spaetere Erweiterungen bis mindestens Mai 2026 | Stand/Validierungsdatum aktualisieren und Versionierung klaeren |
| Balance-Module | 28 Module im Architekturkonzept, 30 in `BALANCE_MODULES_README.md` | 34 `*.js` unter `app/balance/` | Modul-Inventar und Uebersicht korrigieren |
| Simulator-Module | 43 Module im Architekturkonzept | 86 `*.js` unter `app/simulator/` | Simulator-Abschnitt neu strukturieren, statt eine veraltete Auswahl als vollstaendigen Stand wirken zu lassen |
| Engine-Module | 13 Module, ca. 3.600 LOC | 24 `*.mjs` unter `engine/`, ca. 4.240 Zeilen | Engine-Inventar, Pipeline und Modulgruppen aktualisieren |
| Worker-Module | 3 Module, ca. 600 LOC | 3 Module, ca. 757 Zeilen | Anzahl stimmt, LOC/Verantwortung pruefen |
| Profile/Tranchen/Shared | ca. 20 Module, ca. 2.500 LOC | `app/profile`, `app/tranches`, `app/shared` zusammen ca. 2.959 Zeilen | Bestandszahlen und Modulaufteilung nachziehen |
| Tests | Architekturkonzept und `tests/README.md` nannten 74 Testdateien / 1639 Assertions | 74 `*.test.mjs` vorhanden; `npm test` am 2026-05-20 ergab 1659 Assertions | Testdateizahl und Assertion-Zahl aktualisiert |
| Technische Referenz | `TECHNICAL.md` verweist unten auf 54 Testdateien | Aktuell 74 Testdateien | Querverweis in `TECHNICAL.md` korrigieren |
| Build-Hinweis | `TECHNICAL.md` nennt `node build-engine.js` | `package.json` und Repo nutzen `node build-engine.mjs` bzw. `npm run build:engine` | Build-Hinweis korrigieren |
| EXE-Name | Architekturkonzept nutzte teils `RuhestandSuite.exe`, teils `RuheStandSuite.exe` | Verbindliche Projektschreibweise ist `RuhestandSuite.exe` gemaess README, `tauri.conf.json`/`productName` und Build-Skript | Im Architekturkonzept vereinheitlicht |
| Tauri/CSP | Architekturkonzept beschreibt Tauri generell; `TECHNICAL.md` ist konkreter | `tauri.conf.json` nutzt `frontendDist: ../dist`, CSP mit Live-Daten-Zielen und `dangerousDisableAssetCspModification` | Tauri-Abschnitt an aktuellen technischen Contract angleichen |

## Zielbild der Ueberarbeitung

1. Das Architekturkonzept bleibt das breite, fachliche Dach-Dokument.
2. Das Architekturkonzept muss als eigenstaendige Lektuere ausreichen; spezialisierte Referenzen ergaenzen Exportlisten, Betriebsdetails und Testinventare, ersetzen aber nicht die fachliche Beschreibung.
3. Detailinventare werden nicht unkritisch doppelt gepflegt; wenn sie im Architekturkonzept stehen, dann als stabile Cluster, Rollen und Contracts statt als bruechige LOC-/Exportlisten.
4. Wenn Zahlen genannt werden, muessen sie mit einem Pruefdatum versehen oder per kurzer Ermittlung reproduzierbar sein.
5. Build- und Laufzeitbefehle werden aus `package.json` gespiegelt, nicht frei formuliert.
6. Fachliche Abschnitte werden nur angepasst, wenn Code oder spezialisierte Referenzen eine echte Abweichung zeigen.

## Arbeitspakete

### 1. Metadaten und Scope bereinigen

**Status:** erledigt am 2026-05-20.

- Kopfblock auf aktuellen Stand setzen.
- `Codeumfang`, Modulzahlen und Teststatistik entweder aktualisieren oder in eine "Momentaufnahme vom ..." Tabelle verschieben.
- Die vorhandene Release-Checkliste beibehalten, aber um einen konkreten "Inventar aktualisieren"-Befehlssatz ergaenzen.

### 2. Architekturuebersicht aktualisieren

**Status:** erledigt am 2026-05-20.

- Komponenten-Tabelle auf aktuelle Top-Level-Struktur bringen:
  - `Balance.html`, `Simulator.html`, `index.html`, `depot-tranchen-manager.html`, `Handbuch.html`
  - `app/balance`, `app/simulator`, `app/profile`, `app/tranches`, `app/shared`
  - `engine/`, `workers/`, `src-tauri/`
- Modulzahlen mit aktueller Pruefung ersetzen:
  - Balance: 34 JS-Module
  - Simulator: 86 JS-Module
  - Engine: 24 MJS-Module
  - Workers: 3 JS-Module
  - Tests: 74 Testdateien
- LOC-Schaetzwerte aktualisieren oder entfernen, wenn sie nicht gepflegt werden sollen.

### 3. Balance-Abschnitt mit `BALANCE_MODULES_README.md` abgleichen

**Status:** erledigt am 2026-05-20; nach Review auf Eigenstaendigkeit ergaenzt.

- Ausgelagerte Module seit dem alten Stand aufnehmen:
  - `balance-action-postprocessor.js`
  - `balance-binder-annual.js`
  - `balance-binder-diagnosis.js`
  - `balance-binder-imports.js`
  - `balance-binder-snapshots.js`
  - `balance-update-pipeline.js`
  - alle `balance-diagnosis-*` Module als eigene Diagnose-Schicht
  - alle `balance-expenses-*` Module
- Detailbeschreibungen kurz halten und fuer Exportlisten auf `BALANCE_MODULES_README.md` verweisen.

### 4. Simulator-Abschnitt neu ordnen

**Status:** erledigt am 2026-05-20.

- Den alten "43 Module"-Inventarblock durch Themencluster ersetzen:
  - App-Bootstrap und UI-Fassaden
  - Input-Layer und Profilaggregation
  - Portfolio/Tranchen/Renten/Pflege
  - Monte-Carlo Runner und MC-Hilfsmodule
  - Backtest/Sweep/Heatmap
  - Auto-Optimize
  - Ergebnisdarstellung und Visualisierung
  - DOM-freie Jahreslogik
- Neue oder inzwischen ausgelagerte Module aus `app/simulator/` aufnehmen, insbesondere `simulator-input-*`, `simulator-year-*`, `worker-job-runner.js`, `simulator-visualization.js` und die erweiterten Portfolio-Module.
- Detaillierte Exportlisten weiterhin in `SIMULATOR_MODULES_README.md` pflegen.

### 5. Engine- und Transaktionsabschnitt aktualisieren

**Status:** erledigt am 2026-05-20.

- Engine-Inventar auf aktuelle Ordnerstruktur abbilden:
  - Root: `config`, `core`, `errors`, `index`, `tax-settlement`
  - `analyzers/`
  - `planners/`
  - `transactions/`
  - `validators/`
- Spending-Policy-Pipeline, Flex-Budget/Flex-Rate-Policies, Wealth-Reduction und Transaction-Submodule als Modulgruppen dokumentieren.
- Oeffentliche Engine-Contracts aus `engine/README.md` uebernehmen.

### 6. Tauri, Live-Daten und Build-Pfade synchronisieren

**Status:** erledigt am 2026-05-20.

- Tauri-Abschnitt mit `src-tauri/tauri.conf.json` und `docs/reference/DATA_SOURCES.md` abgleichen.
- Build-Kommandos aus `package.json` nutzen:
  - `npm run sync-dist`
  - `npm run tauri:build`
  - `npm run build-tauri-exe`
  - `npm run build:engine`
  - `npm run build:engine:strict`
- Falsche oder uneinheitliche Hinweise wie `node build-engine.js` ersetzen.
- EXE-Schreibweise projektweit abstimmen und dann im Architekturkonzept vereinheitlichen.

### 7. Test- und Validierungsabschnitt korrigieren

**Status:** erledigt am 2026-05-20.

- Testkategorien anhand `tests/README.md` und realer Testdateien aktualisieren.
- `TECHNICAL.md` Querverweis "54 Testdateien" auf 74 korrigieren.
- Falls Assertion-Zahl beibehalten wird, vor der finalen Doku-Aenderung per Testlauf oder Runner-Ausgabe verifizieren.
- Validierungsregeln mit `AGENTS.md` konsistent halten:
  - Default `npm test`
  - nach Engine-/EngineAPI-Aenderungen zusaetzlich `npm run build:engine`

### 8. Fachkonzept gezielt validieren

**Status:** erledigt am 2026-05-20.

- Fachabschnitte nicht pauschal neu schreiben, sondern gegen Code/Referenzen pruefen:
  - Floor-Flex und Dynamic Flex
  - Steuer-Engine und Jahres-Settlement
  - Profilverbund und Tranchen-Contract
  - Monte-Carlo Sampling und Backtest-Zeitraeume
  - Pflegefall, Rentenlogik, Ansparphase
  - Auto-Optimize Modi und Worker-Nutzung
- Veraltete Code-Zeilenangaben entweder entfernen oder auf "konzeptionell, siehe Modul" umstellen.

## Empfohlene Reihenfolge

1. `TECHNICAL.md` Kleinkorrekturen vorziehen (`build-engine.mjs`, 74 Testdateien).
2. Modul- und Bestandszahlen im Architekturkonzept ersetzen.
3. Appendix-Inventar durch aktuelle Cluster ersetzen.
4. Simulator- und Balance-Abschnitte an die jeweiligen Modul-READMEs angleichen.
5. Tauri-/Build-/Live-Daten-Abschnitte gegen `package.json`, `tauri.conf.json` und `DATA_SOURCES.md` finalisieren.
6. Fachabschnitte gegen gezielte Tests/Code-Reads validieren.
7. Abschlusslauf: `npm test`; bei Engine-Doc-Aenderungen ohne Codeaenderung kein Engine-Build erforderlich.

## Offene Entscheidungen

- Soll das grosse Architekturkonzept kuenftig exakte LOC-/Modulzahlen enthalten oder nur "Stand vom" Momentaufnahmen?
- EXE-Schreibweise ist fuer die Doku geklaert: `RuhestandSuite.exe`.
- Sollen Code-Zeilenangaben im Architekturkonzept komplett entfernt werden, um Doku-Drift zu vermeiden?
- Soll `ARCHITEKTUR_UND_FACHKONZEPT.md` weiterhin Marktvergleich/Forschungsabgleich enthalten oder sollen diese Abschnitte in eigene Referenzdokumente ausgelagert werden?

## Definition of Done

- Architekturkonzept widerspricht der aktuellen Dateistruktur nicht mehr.
- Build- und Laufzeitbefehle entsprechen `package.json`.
- Testzahlen sind mit `tests/README.md` und realer Dateistruktur konsistent.
- Moduldetails verweisen auf spezialisierte Referenzen statt veraltete Doppellisten zu pflegen.
- `README.md`, `TECHNICAL.md`, Modul-READMEs und Agent-Instruktionsdateien bleiben widerspruchsfrei.
