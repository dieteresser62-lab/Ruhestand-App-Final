# Tranchenmanagement-Hardening: Arbeitsdokument

**Stand:** 2026-07-14
**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal angelegt; Veröffentlichung ausstehend und nur nach Nutzerfreigabe
**Status:** implementierungsreif (Gemini-Review abgeschlossen, Claude-Review ausstehend)
**GAP-Grundlage:** [TRANCHENMANAGEMENT_GAP_ANALYSE.md](./TRANCHENMANAGEMENT_GAP_ANALYSE.md)

## Zweck

Dieses Arbeitsdokument plant die Härtung des Tranchenmanagements als durchgängigen Vertrag zwischen Manager, Profilpersistenz, Balance, Simulator und Engine. Es schließt belegte Datenverlust-, Doppelzählungs-, Steuer-, Herkunfts-, Kurs- und Bedienlücken in voneinander reviewbaren Slices.

Vor einer Umsetzung müssen Gemini und optional Claude den Plan nach den adversarialen Review-Regeln prüfen. Codex darf den Status nicht selbst auf `implementierungsreif` setzen.

## Ausgangslage

- Die aktuelle Node-Suite und das vorhandene Browser-Gate sind grün.
- Der normale Runner führt die Assertions des Manager-Page-Tests dennoch nicht aus; Coverage für `tranchen-manager-page.js` ist 0 %.
- Ein Kategorie-/Typ-Mismatch erzeugt reproduzierbar eine doppelte Engine-Sell-Order und einen Verkauf über den vorhandenen Lotwert hinaus.
- Korrupter Tranche-Storage wird aktuell beim Managerstart überschrieben.
- Profilherkunft, Geldmarkt-Aggregation, Kirchensteuer-Einheit und Quote-Währung sind entlang der Verbraucher nicht durchgängig konsistent.
- Nutzer- und Referenzdokumentation bildet Persistenz, Backup, Workflow und aktuellen Modulschnitt nicht zuverlässig ab.

Die vollständige Evidenz und Priorisierung steht in der GAP-Analyse.

## Zielbild

Nach Abschluss aller Slices gilt:

1. Ein kanonischer, versionierter und DOM-freier Tranche-Contract ist die gemeinsame Quelle für Validierung und Klassifikation.
2. Ungültige Kategorie-/Typ-Paare, doppelte IDs und nicht endliche Finanzwerte erreichen keine Berechnung.
3. Die Engine kann dieselbe Lot-ID nicht mehrfach in einer Sell-Order verwenden.
4. Corrupt/empty/valid sind getrennte Persistenzzustände; Lesen ist mutationsfrei und Recovery ist explizit.
5. Manager-Saves sind bestätigt, profilgebunden und bei Fehler sichtbar wiederholbar.
6. Quote-Updates sind währungs- und stichtagsbewusst, abbrechbar und race-frei.
7. Balance, Status und Simulator verwenden dieselbe Assetklasse, TQF-, Einheiten- und Provenienzsemantik.
8. Simulator-Lots bleiben nach Verkäufen und Käufen intern konsistent.
9. Der reale Bestandsabgleich ist entweder ausdrücklich beratend oder als bestätigter Reconcile-Workflow umgesetzt; es gibt keine stille Mutation.
10. Node-, Browser-, Persistenz- und Tauri-nahe Gates decken die vollständige Kette ab.
11. Nutzer- und Referenzdokumentation ist aktuell, synthetisch und frei von privaten Finanzbeispielen.

## Nicht-Ziele

- Keine allgemeine Neuentwicklung der Steuer-, LossCarry-, Settlement-, VPW- oder 3-Bucket-Semantik.
- Keine automatische steuerrechtliche Ableitung von TQF oder Altbestandsstatus.
- Keine FX-Engine, sofern das Planreview nicht ausdrücklich von EUR-only abweicht.
- Keine brechende Umbenennung des bestehenden Feldes `detailledTranches`.
- Kein Release-Build, kein `dist/`-Sync und keine Änderung an `RuheStandSuite.exe`.
- Keine echten Depotdaten, Exporte, Logs oder Screenshots in Tests und Dokumentation.

## Verbindliche Querschnittsinvarianten

- Assetklassifikation ist disjunkt und zentral.
- Persistierte Lots sind profilintern eindeutig; kombinierte Lots tragen eindeutige ID plus `sourceProfileId`.
- `marketValue`, `costBasis`, `shares`, Preise und TQF sind endlich und erfüllen die im Contract festgelegten Grenzen.
- Kein stilles Clamping fachlich relevanter Werte; ungültige Daten werden mit Feldfehlern abgelehnt.
- Aggregatwerte sind Fallback oder Detailquelle, niemals beides für denselben Anteil.
- Preisfehler verändern vorhandene Kurse nicht.
- Kein sichtbarer Erfolg vor bestätigtem Persistenz-Flush.
- Keine bewusst roten Tests über eine Slice-Grenze hinweg.

## Vorgeschlagene Architektur

### Kanonischer Contract

Das neue DOM-freie Modul `types/tranche-contract.js` stellt Validierung,
Legacy-Normalisierung, disjunkte Assetklassifikation und stabile Ergebnisobjekte
für Manager und Engine bereit. `types/strategy-options.js` zeigt ebenfalls, dass
`app/` und `engine/` gemeinsame reine Contracts aus `types/` importieren können.

Der Modulimport ist über `build-engine.mjs`, die Node-Suite und das Browser-Gate
verifiziert. Lokal war kein `esbuild` installiert; deshalb blieb der bereits
versionierte Modul-Fallback in `engine.js` bytegleich. Ein echter Bundlelauf bleibt
als Build-Restrisiko dokumentiert.

### Persistenzzustand

Der Loader liefert kein nacktes Array mehr, sondern einen auswertbaren Zustand:

```text
valid   -> normalisierte Lots + optionale Legacy-Hinweise
empty   -> bewusst kein Bestand
corrupt -> Rohpayload bleibt erhalten, keine Berechnung, Recovery erforderlich
unavailable -> transienter IO-/Adapterfehler, keine Mutation, Retry erforderlich
```

Schreibende Aktionen sind getrennt vom Laden und schließen erst nach erfolgreichem Flush ab. `corrupt` und `unavailable` dürfen nicht ineinander überführt werden: Ein vorübergehender IndexedDB-/Tauri-Fehler bietet keinen Reset an. Bei `corrupt` ist der Rohpayload nur nach einer ausdrücklichen lokalen Aktion anzeig- und kopierbar; er gelangt nie automatisch in Logs oder Dokumentation.

### Verbraucher

Manager, Status, Profilverbund und Simulator verwenden denselben normalisierten Shape. Die Engine validiert ihre öffentliche Grenze zusätzlich fail-closed; sie vertraut nicht allein auf UI-Validierung.

### Quote-Contract

Der Preisservice liefert ein Objekt statt einer bloßen Zahl. Browser-Node-Proxy und Tauri-Proxy müssen dasselbe Shape liefern. Der vorgeschlagene erste Scope akzeptiert nur EUR-Quotes; Nicht-EUR bleibt manuell pflegbar, wird aber nicht automatisch als EUR übernommen.

## Slice-Reihenfolge

| Nr. | Slice | Hauptziel | Abhängigkeit | Max. geplante Programmdateien | Status |
| ---: | --- | --- | --- | ---: | --- |
| 1 | [Test-Gate und Baseline](./SLICE_TRANCHENMANAGEMENT_01_TEST_GATE_BASELINE.md) | assertionslose False-Green-Pfade schließen | Planfreigabe | 5 | freigegeben |
| 2 | [Kanonischer Datencontract](./SLICE_TRANCHENMANAGEMENT_02_CANONICAL_DATA_CONTRACT.md) | Schema, Klassifikation und Doppelverkauf beheben | Slice 01 | 11 nach Nutzerfreigabe; `engine.js` ohne Diff | freigegeben |
| 3 | [Persistenz und Recovery](./SLICE_TRANCHENMANAGEMENT_03_PERSISTENCE_RECOVERY.md) | valid/empty/corrupt/unavailable, Flush, Profil-Handoff | Slice 02 | 9 | freigegeben |
| 4 | [CRUD, UX und Accessibility](./SLICE_TRANCHENMANAGEMENT_04_CRUD_UX_ACCESSIBILITY.md) | sichere Eingabe und bedienbare Darstellung | Slice 03 | 10 | freigegeben |
| 5 | [Quote- und Währungscontract](./SLICE_TRANCHENMANAGEMENT_05_QUOTE_CURRENCY_RESILIENCE.md) | EUR-/Stichtagscontract, Batch und Proxyparität | Slice 02, 03 | 8 | freigegeben |
| 6 | [Balance-, Status- und Steuerparität](./SLICE_TRANCHENMANAGEMENT_06_BALANCE_STATUS_TAX_PARITY.md) | Einheiten, TQF, Status und Klassifikation | Slice 02, 03 | 9 | freigegeben |
| 7 | [Simulator-Provenienz und Lot-Invarianten](./SLICE_TRANCHENMANAGEMENT_07_SIMULATOR_PROVENANCE_LOTS.md) | Herkunft, Geldmarkt und In-Memory-Lots | Slice 02, 06 | 10 | freigegeben |
| 8 | [Reconciliation-Workflow](./SLICE_TRANCHENMANAGEMENT_08_RECONCILIATION_WORKFLOW.md) | bestätigte reale Bestandsfortschreibung idempotent umsetzen | Slice 03, 06, 07 | 9 | geplant |
| 9 | [E2E, Migration und Dokumentation](./SLICE_TRANCHENMANAGEMENT_09_E2E_MIGRATION_DOCUMENTATION.md) | vollständige Gates und Doku-Sync | Slices 01-08 | 6 (5 Tests + Handbuch-HTML), plus Markdown | geplant |

Die Reihenfolge ist verbindlich, solange das Planreview sie nicht ändert. Für Slice 08 ist durch O-09 der explizite Reconcile-Workflow festgelegt; eine rein beratende No-Code-Variante ist nicht mehr Teil dieses Plans.

### Rückdokumentation Slice 01

- Der Node-Runner erzwingt pro ausgefuehrter Datei mindestens eine Assertion und berichtet Modus sowie Assertionzahl.
- DOM-/global-nahe Tests, insbesondere `tranchen-manager-page.test.mjs`, laufen isoliert; das Browser-Smoke-Gate wird mit `npm run test:browser` als separates Pflichtgate ausgewiesen.
- Verifizierte Baseline: 103 Dateien entdeckt, 102 ausgefuehrt, 3939 Assertions, 0 Fehler, 0 offene Handles.
- Coverage-Baseline: 71,20% (24563/34499 Zeilen, 193 Dateien); `tranchen-manager-page.js` 51,30% statt 0%.
- Slice 01 ist durch Gemini und Nutzer freigegeben; die Abhängigkeit für Slice 02 war damit erfüllt.

### Rückdokumentation Slice 02

- `types/tranche-contract.js` definiert Lot-Schema v1, den unterstützten Legacy-Stand
  v0, disjunkte Kategorie-/Typ-Paare, strukturierte Feldfehler und die Trennung von
  Persistenz-, Ableitungs- und Merge-Provenienzfeldern.
- Manager-State und Form-Reader normalisieren über denselben Contract. Leere TQF,
  unbekannte Versionen, doppelte IDs, nicht endliche Werte und ungültige Datumswerte
  werden nicht still korrigiert.
- Die Engine validiert `detailledTranches` erneut. Mismatch-, Duplikat- und
  Nicht-Array-Fälle brechen kontrolliert mit `TRANCHE_VALIDATION_FAILED` ab; jede
  gültige Lot-ID kann höchstens einmal in der Sell-Order vorkommen.
- Der nachgewiesene 100-EUR-Mismatch kann keinen 150-EUR-Breakdown mehr erzeugen.
  Gültige Steuer-, Snapshot-, Settlement-, Backtest-, Worker- und Browser-Gates
  bleiben grün.
- Verifiziert: 104 Node-Testdateien, 4034/4034 Assertions, 0 Fehler, 0 offene
  Handles; elf Browser-Smoke-Szenarien; historischer Backtest und FlowDelta ohne
  unerwartete Abweichung.
- Nach Eintritt der Dateilimit-Stop-Regel hat der Nutzer die Erweiterung auf elf
  Programmdiffs ausdrücklich freigegeben. Slice 02 ist durch Gemini und Nutzer
  freigegeben und als Commit `acd6905` vorhanden.

### Rückdokumentation Slice 03

- Der Tranchen-Loader liefert `valid`, `empty`, `corrupt` oder `unavailable` ohne
  Lade-Write. Korrupte Rohdaten bleiben unverändert; transiente Lesefehler bieten
  nur Retry und keinen Reset.
- Manageränderungen und Profilwerte gelten erst nach bestätigtem Flush. Bei
  Rejection werden der letzte bestätigte sichtbare Stand und die zugehörigen
  Cache-/Registry-Werte wiederhergestellt; ausstehende Änderungen sind retrybar.
- Die blockierende Recovery-UI bietet Startseitenabbruch, zentralen
  Komplettbackup-Restore, bewusstes lokales Anzeigen/Kopieren und bestätigten
  Reset. Toter Tranchen-Teilimport/-export und Test-Phantom-Controls sind entfernt.
- Der Manager-Handoff flusht die gewählte Profilidentität vor Navigation und
  verzichtet für diesen Link auf eine automatische `window.name`-Payloadkopie.
  Der Manager zeigt Name und ID des tatsächlich geladenen Profils.
- Initialisierung, BFCache und Tab-Rückkehr sind idempotent beziehungsweise laden
  den Profilkontext neu. Ein explizites leeres Profil-Override bleibt leer.
- Verifiziert: 104 Node-Testdateien, 4082/4082 Assertions, 0 Fehler, 0 offene
  Handles; elf grüne Browser-Smoke-Szenarien. Slice 03 ist durch Gemini und Nutzer
  freigegeben und als Commit `13328fa` vorhanden.

### Rückdokumentation Slice 04

- Der Modal- und Save-Pfad validiert endliche positive Tranchewerte, TQF und die
  kanonische Kategorie-/Typ-Matrix vor jeder Mutation. Strukturierte Fehler bleiben
  blockierend sichtbar und enthalten Fehlercode, Feld und soweit vorhanden Lot-ID.
- Neue IDs werden bei Kollision erneut erzeugt; Edit-IDs bleiben stabil und die
  Collection-Grenze blockiert Duplikate weiterhin vor jedem Storage-Write.
- Profilwerte besitzen eine strikte vollständige Validierung, eine 300-ms-Entprellung
  und eine serielle Nachspeicherung bei langsamen Flushs. Ungültige Zwischenstände
  verändern weder sichtbaren bestätigten Zustand noch Persistenz.
- Dialogrolle, zugänglicher Name, initialer Fokus, Fokusfalle, Escape/Fokus-Rückgabe,
  Live-Regionen und benannte Icon-Aktionen sind umgesetzt. Gold und Kategorie/Typ
  werden eindeutig angezeigt; negative Renditen enthalten kein `+-`.
- Bei 390 CSS-Pixeln bleibt das Dokument ohne horizontalen Overflow; nur der
  gekennzeichnete Tabellencontainer scrollt. Rücklink und Profilanzeige tragen die
  tatsächlich geladene Profil-ID.
- Verifiziert: 104 Node-Testdateien, 4117/4117 Assertions, 0 Fehler, 0 offene
  Handles sowie elf grüne Browser-Smoke-Szenarien. Slice 04 ist freigegeben und
  als Commit `e554062` vorhanden.

### Rückdokumentation Slice 05

- Browser-Service, Node-Proxy und Tauri-Proxy liefern denselben normalisierten
  Quote-Shape mit Symbol, positivem endlichem Preis, Waehrung, UTC-Unixsekunde und
  Quelle. Symbole folgen dem Yahoo-Format ohne proprietaeren `@exchange`-Suffix.
- Ausschliesslich EUR wird automatisch uebernommen. Fehlende oder fremde Waehrung,
  fehlende/alte/zukuenftige Zeit, Symbolabweichung, ungueltiger Preis, unbekanntes
  Symbol, Rate-Limit, Providerfehler, Timeout und Proxy-Nichterreichbarkeit besitzen
  stabile Fehlercodes und bleiben im Manager pro Tranche sichtbar.
- Quotes duerfen maximal sieben Kalendertage alt sein und hoechstens fuenf Minuten
  in der Zukunft liegen. Browserrequests sind einzeln begrenzt; Node und Tauri
  begrenzen Yahoo-Upstreamzugriffe auf vier Sekunden.
- Der Kursbatch ist single-flight, dedupliziert identische Symbole, verarbeitet
  maximal drei Tranchen parallel und bricht nach zwoelf Sekunden ab. Teilerfolge
  werden mit genau einem bestaetigten Commit gespeichert; Fehler behalten den alten
  Kurs und ein Batch ohne Erfolg schreibt nicht.
- Verifiziert: 104 Node-Testdateien, 4204/4204 Assertions, 0 Fehler, 0 offene
  Handles; elf grüne Browser-Smoke-Szenarien; 8/8 Rust-Tests. Slice 05 ist
  freigegeben und als Commit `e29d348` vorhanden.

### Rückdokumentation Slice 06

- Status und Balance-Reader unterscheiden `not_loaded`, `empty`, `valid` und
  `error`. Nur ein valider nichtleerer Bestand aktiviert FIFO; ein korrupter
  Bestand fällt nicht auf DOM-, Aggregate- oder aktuellen Profilbestand zurück.
- Ein explizites leeres Haushalts-/Profil-Override bleibt als `[]` erhalten,
  unterdrückt veraltete Balance-Aggregate und erzeugt keine synthetischen Lots.
- Balance, Profilverbund, Action-Attribution und Statusaggregation verwenden die
  disjunkte Kategorie-/Typ-Matrix aus Slice 02. Geldmarkt und Gold werden nicht als
  Aktienbestand doppelt gezählt; ein Widerspruch endet fail-closed.
- `kirchensteuerSatz` bleibt von der Balance-UI bis zur Steuerberechnung die
  Dezimalrate `0.08` beziehungsweise `0.09`. Die steuerorientierte Auswahl bezieht
  lotbezogene TQF ein; fehlende TQF wird nicht mehr still als 30 % geraten.
- Negative Statusrenditen werden ohne `+-` dargestellt. Geldmarkt-Synchronisation
  ersetzt den Aggregatwert und addiert keine zweite Position.
- Direkte Produktionstests ersetzen die bisherige lokale Aggregationskopie als
  Nachweis. Verifiziert: 105 Node-Testdateien, 4253/4253 Assertions, 0 Fehler,
  0 offene Handles sowie elf grüne Browser-Smoke-Szenarien. Snapshot-, Backtest-
  und FlowDelta-Gates blieben ohne unerwartete Abweichung. Slice 06 ist freigegeben
  und als Commit `0b0063e` vorhanden.

### Rückdokumentation Slice 07

- Der Simulator trennt Profil- und Simulationszustand an zwei tiefen Kopiergrenzen:
  beim Profilverbund-Override und vor der Portfolio-Initialisierung. Verschachtelte
  Profilobjekte bleiben nach Verkauf, Wiederholung und Engine-Lauf unveraendert.
- Profilinterne IDs werden beim Haushaltsmerge mit der Profil-ID eindeutig gemacht;
  `sourceProfileId` bleibt als explizite Provenienz bis zum Engine-/Verkaufs-
  Breakdown erhalten. Die In-Memory-Aufloesung verwendet nur exakte IDs plus
  Provenienz und kein Suffixparsing.
- Explizites `[]` bleibt leer, korrupte Inputs enden strukturiert fail-closed und
  Detail-Geldmarkt ersetzt den ueberlappenden Aggregatwert vollstaendig. Dadurch
  werden weder Startvermoegen noch Liquiditaet doppelt erfasst.
- Teilverkaeufe reduzieren Marktwert, Cost Basis und vorhandene Stueckzahl im
  selben Verhaeltnis. Vollverkaeufe markieren Lots als `sold` und entfernen sie
  aus folgenden Engine-Inputs; doppelte Breakdown-Eintraege koennen kein zweites
  Lot treffen.
- Jeder simulierte Kauf erzeugt ein eigenes kanonisches `simlot:`-Lot mit
  deterministischer ID, Simulationsdatum, Profilherkunft und Cost Basis. Legacy-
  Aggregatlagen erhalten stabile `simbase:`-IDs vor dem Engine-Aufruf.
- Verifiziert: 106 Node-Testdateien, 4298/4298 Assertions, 0 Fehler und 0 offene
  Handles. Direkt-/Worker-Paritaet (354/354), Snapshots, historischer Backtest und
  FlowDelta blieben ohne unerwartete Abweichung. Review und Freigabe stehen aus.

## GAP-Zuordnung

| Slice | GAPs |
| --- | --- |
| 01 | TM-16, Grundlage für TM-17 |
| 02 | TM-01, TM-02, TM-03, TM-13 |
| 03 | TM-04, TM-09, TM-10, TM-12, TM-19, TM-22 |
| 04 | TM-18, TM-20 |
| 05 | TM-05, TM-11 |
| 06 | TM-03, TM-06, TM-08, TM-12, TM-17, TM-20 |
| 07 | TM-03, TM-07, TM-08, TM-14, TM-17 |
| 08 | TM-15 |
| 09 | TM-17, TM-21, TM-22 und Abschlussgates aller P0/P1-GAPs |

## Globale Akzeptanzkriterien

- Jede GAP-ID ist durch Code/Test/Dokumentation geschlossen oder mit Nutzerentscheidung bewusst als akzeptiertes Restrisiko markiert.
- Synthetische Mismatch-Tranche kann nicht doppelt verkauft werden.
- Corrupt-Storage-Test belegt Rohdatenerhalt und verhindert Leerüberschreibung.
- Nicht-EUR-Quote wird nicht als EUR persistiert.
- `sourceProfileId` bleibt bis Engine-Breakdown erhalten.
- Geldmarkt wird im Simulator genau einmal gezählt.
- Kirchensteuer- und TQF-Tests verwenden die reale UI-Einheit.
- Lotmutationen halten Stückzahl-/Wert-/Cost-Basis-Invarianten.
- Der Manager-Page-Test läuft im Standardgate tatsächlich mit Assertions.
- Browser-E2E deckt Add/Edit/Delete, Reload, Profil A/B, Recovery, Online-Teilerfolg und Offlinefall ab.
- Keine privaten Finanzdaten verbleiben in der Tranchenanleitung.
- `npm test` und `npm run test:browser` sind grün; Engineänderungen zusätzlich `npm run build:engine` und relevante Backtests/Snapshots ohne unerwartete Abweichung.

## Teststrategie

### Pro Slice

- Zuerst fokussierte Tests der geänderten Contracts.
- Danach `npm test` bei jeder Änderung an Persistenz-, Profil-, Tranchen-, Consumer- oder Engine-Verträgen.
- Browseränderungen zusätzlich `npm run test:browser`.
- Änderungen an `engine/` oder öffentlicher EngineAPI zusätzlich `npm run build:engine`.
- Änderungen an `src-tauri/src/lib.rs` zusätzlich fokussierter Rust-Testlauf; kein EXE-Release-Build ohne separaten Nutzerauftrag.

### Abschluss

```powershell
npm test
npm run test:browser
npm run test:coverage
```

Zusätzlich abhängig vom tatsächlichen Diff:

```powershell
npm run build:engine
cargo test --manifest-path src-tauri/Cargo.toml
```

Coverage ist ein Navigationssignal, kein alleiniges Abnahmekriterium. Entscheidend sind die fachlichen Akzeptanzkriterien und Negativfälle.

## Stop- und Eskalationskriterien

Zusätzlich zu `AGENTS.md` und `SLICE_EXECUTION_RULES.md` gilt:

- Stop, wenn ein Slice mehr als zehn Programmdateien benötigt; neu schneiden und Nutzer fragen.
- Stop bei unerwarteter Änderung von Snapshot-/Backtest-Ergebnissen oder FlowDelta.
- Stop, wenn die Engine-Semantik über die belegte Deduplizierung/Validierung hinaus verändert werden müsste.
- Stop, wenn UI und Engine unterschiedliche Feldnamen oder Assetklassen benötigen.
- Stop, wenn TQF, Kirchensteuer, Altbestand oder Reconciliation eine neue fachliche/steuerrechtliche Entscheidung erfordern.
- Stop, wenn Recovery Rohdaten nicht sicher erhalten kann.
- Stop, wenn Node- und Tauri-Proxy keinen identischen Quote-Contract erreichen, ohne den Slice-Scope zu überschreiten.
- Stop, wenn Tests nicht ausführbar sind oder eine erforderliche Browser-/Tauri-Validierung nicht sinnvoll ersetzbar ist.
- `minimumFlexAnnual` bleibt außerhalb des Scopes und darf nirgends still begrenzt werden.

## Branch-, Commit- und Reviewablauf

1. Planreview durch Gemini und optional Claude.
2. Codex beantwortet Findings in diesem Dokument.
3. Gemini setzt erst nach gelösten Findings den Status auf `implementierungsreif`.
4. Vor jedem Slice: frischer Branch-/Statuscheck und Diff-Risiko-Block in der Slice-MD.
5. Codex implementiert und dokumentiert Tests; Codex erteilt keine Freigabe und erstellt keinen Commit.
6. Gemini prüft Slice und Scope, führt nach Nutzerfreigabe den lokalen Commit aus.
7. Push nur nach ausdrücklicher Nutzerfreigabe.

## Verbindliche Nutzerentscheidungen

Alle Entscheidungen wurden am 2026-07-14 durch den Nutzer getroffen. Die Detailformulierungen stehen in der GAP-Analyse; für die Umsetzung gilt:

| ID | Festlegung |
| --- | --- |
| O-01 | Strikte Kategorie-/Typ-Matrix; beide Felder bleiben erhalten. |
| O-02 | TQF wird manuell bestätigt und gespeichert; keine stille Ableitung. |
| O-03 | Ausschließlich EUR; keine Fremdwährungs- oder FX-Automatik. |
| O-04 | Corrupt fail-closed mit Recovery; transiente IO-Fehler separat und ohne Reset. |
| O-05 | Teilerfolge, alte Kurse bei Fehler, ein bestätigter Batch-Commit. |
| O-06 | Teilimport/-export entfernen; zentrale Komplettsicherung ist maßgeblich. |
| O-07 | `sourceProfileId` beim Merge ergänzen und end-to-end erhalten. |
| O-08 | Ein logisches Depot je Profil; FIFO nur je Instrument innerhalb dieses Profils. |
| O-09 | Expliziter, bestätigter und idempotenter Reconcile-Schritt. |
| O-10 | `detailledTranches` bleibt unverändert der einzige kanonische Feldname. |

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Der Arbeitsplan adressiert die identifizierten Risiken in einer logischen und 1-basierten Reihenfolge (Slices 01 bis 09). Die Integration der Tests in Slice 01 ist ein notwendiger erster Schritt. Die Akzeptanzkriterien sind verifizierbar formuliert, vernachlässigen jedoch teilweise die detaillierte UX-Reaktion auf Persistenz- und Validierungsausfälle.
* **Vertragstreue:** Die Schnittstellen zwischen Manager, Profilpersistenz, Balance, Simulator und Engine sind stark betroffen. Die Einführung von `types/tranche-contract.js` ist vertragskonform, erfordert aber ein strenges Import-Handling, das die Engine-Bündelung nicht gefährdet.
* **Fehlerbehandlung:** Der Plan sieht Recovery-Zustände vor, aber es fehlt eine genaue Definition, was bei partiell fehlgeschlagenen API-Abfragen (Batch-Updates) passiert. Ein totaler Abbruch bei einem einzelnen Ticker-Fehler muss verhindert werden.
* **Seiteneffekte:** Simulator-Läufe verändern Lot-Objekte im Arbeitsspeicher. Wenn diese nicht isoliert (deep-copied) sind, lecken die Mutationen in das globale State-Management.
* **Was könnte brechen?** Die Synchronisation zwischen dem `geldmarktEtf`-Eingabefeld und den Detailtranchen ist hochgradig fehleranfällig. Wenn hier nicht an einer einzigen Stelle dedupliziert wird, kommt es zu doppelten Vermögenswerten in der Simulation.

### 2. Findings

* **G-01 (Transiente Persistenzfehler vs. Datenverlust):** Wenn der Recovery-Prozess bei korruptem Speicher direkt einen Reset/Quarantäne anbietet, riskieren Nutzer permanenten Datenverlust bei nur vorübergehenden IDB-Sperren.
  * *Forderung:* Der Recovery-Modus muss den rohen Payload als auslesbaren, kopierbaren Text anzeigen, damit Nutzer ihre Daten manuell sichern können.
* **G-02 (Simulator Deep-Copy-Pflicht):** Da der Simulator In-Memory-Mutationen auf den Lots durchführt, besteht die Gefahr, dass Lot-Objektreferenzen in andere UI- oder Statemodule zurückfließen.
  * *Forderung:* Der Simulator muss die Tranchen initial zwingend tiefenkopieren (`structuredClone`), bevor er Berechnungen startet.
* **G-03 (Währungs- und Kurs-Fehlermeldungen):** Wenn Kurse in Fremdwährungen (USD, GBP, GBp) geladen werden, werden sie verworfen. Ohne ein sichtbares Feedback vermuten Nutzer einen Systemfehler.
  * *Forderung:* Abgelehnte Kurse müssen im Batch-Ergebnis explizit protokolliert und mit dem Grund (z. B. "Währung USD nicht unterstützt") im UI dargestellt werden.
* **G-04 (Fehler-Feedback der Engine-Validierung):** Wenn die Engine im Notfall (fail-closed) Berechnungen blockiert, weil widersprüchliche Tranchendaten übergeben wurden, muss dieser Fehler strukturiert in der UI gemeldet werden.
  * *Forderung:* Es darf kein stiller Absturz oder unendliche Schleife auftreten; die UI muss den Validierungsfehler der Engine als blockierenden Hinweis ausgeben.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein unbemerktes Durchsickern einer modifizierten Lot-Referenz aus dem Monte-Carlo-Simulator in den globalen Anwendungs-State. Nach einer Simulation sind die Stückzahlen oder Marktwerte der Tranchen im Speicher modifiziert (z. B. auf 0 reduziert). Der Nutzer wechselt auf die Tranchen-Seite und speichert ab; die geänderten (nullifizierten) Lots werden dauerhaft in die IndexedDB geschrieben, was zu irreversiblem Datenverlust führt.

### 4. Review-Ergebnis

* **Status:** freigegeben
* **Blocker:** keine
* **Restrisiken:**
  * Datenbereinigung von Altdaten, die nicht konform zur neuen Kategorie-Typ-Matrix sind.
  * Abweichungen zwischen Browser- und Tauri-Umgebung bei der Kursabfrage.
  * Einhaltung des neuen explicit Reconcile Contracts im realen Betrieb.

## Review-Feedback von Claude

Ausstehend. Pflichtstruktur analog Gemini mit IDs `C-01`, `C-02`, ...

## Review-Antworten von Codex

- **G-01 angenommen:** O-04 trennt künftig `corrupt` von transientem `unavailable`. Nur ein syntaktisch oder fachlich beschädigter, tatsächlich gelesener Payload führt in Recovery. Der Rohpayload bleibt unverändert und kann ausschließlich hinter einer bewussten lokalen Aktion angezeigt und kopiert werden; IO-/IDB-/Tauri-Rejections bieten Retry, aber keinen Reset. Slice 03 und dessen Negativtests werden entsprechend ergänzt.
- **G-02 umgesetzt:** Slice 07 zieht zwingende Deep-Copy-Grenzen vor Haushaltsmerge und Portfolio-Mutation. Referenzisolations-Tests beweisen, dass Profil-, UI- und Persistenzobjekte nach Simulation unverändert bleiben.
- **G-03 angenommen:** O-03 und O-05 legen EUR-only plus Teilerfolg fest. Slice 05 weist jede abgelehnte Tranche mit maschinenlesbarem Fehlercode und sichtbarem Grund aus, beispielsweise `UNSUPPORTED_CURRENCY: USD`; alte Kurse bleiben erhalten.
- **G-04 angenommen:** Die Enginegrenze liefert beziehungsweise wirft einen strukturierten Validierungsfehler mit Feld-/Tranchekontext. Der aufrufende UI-Pfad fängt ihn ab, beendet die Berechnung kontrolliert und zeigt einen blockierenden Hinweis. Stiller Absturz, leeres Fallback und Endlosschleife sind explizite Negativtests in Slices 02 und 04.

Die Antworten ändern den Gemini-Status nicht eigenmächtig. Plan und Slices bleiben bis zum Nachreview blockiert beziehungsweise nicht freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| G-01 | Gemini | Transiente Persistenzfehler und korrupter Payload unzureichend getrennt | angenommen | Slice 03 freigegeben und als Commit `13328fa` vorhanden |
| G-02 | Gemini | Simulator benötigt zwingende Deep-Copy-Grenze | angenommen | in Slice 07 umgesetzt; Review ausstehend |
| G-03 | Gemini | Abgelehnte Fremdwährungsquotes benötigen sichtbaren Grund | angenommen | O-03/O-05 und Slice 05 konkretisiert; Code ausstehend |
| G-04 | Gemini | Engine-Validierungsfehler muss strukturiert in der UI ankommen | angenommen | Contract in Slice 02 und blockierender Manager-UI-Pfad in Slice 04 implementiert; Review ausstehend |
