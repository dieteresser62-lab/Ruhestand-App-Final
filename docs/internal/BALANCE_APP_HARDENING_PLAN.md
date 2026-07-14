# Balance-App-Hardening: Arbeitsplan

**Stand:** 2026-07-14  
**Status:** implementierungsreif; Slice 01, 02, 03, 04, 05, 06, 07 und 08 erledigt  
**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal vorhanden; `git ls-remote --heads origin refs/heads/codex/balance-app-hardening` lieferte am 2026-07-13 keinen Remote-Branch; keine Veroeffentlichung ohne ausdrueckliche Freigabe  
**Autor:** Codex  
**Ausgangspunkt:** technische Balance-Analyse vom 2026-07-10 mit Findings zu Profilverbund, Jahresprozess, Marktdaten, Inflation, Persistenz, Importen und Eingabevalidierung

## Ziel

Die Balance-App soll fuer reale Jahresplanung einen eindeutigen, wiederholsicheren und pruefbaren Vertrag erhalten. Haushaltsbedarf darf im Profilverbund nur einmal verteilt werden. Jahreswechsel muessen genau einer Periode zugeordnet, vor Mutation gesichert und entweder vollstaendig committed oder kontrolliert abgebrochen werden. Externe Daten muessen fachlich zum ausgewiesenen Stichtag passen. Import-, Recovery- und Eingabefehler duerfen nicht still in scheinbar gueltige Finanzdaten umgedeutet werden.

## Nicht-Ziele

- keine Aenderung der fachlichen Engine-Semantik in `engine/`;

- kein Redesign der Balance-Oberflaeche;

- keine Bearbeitung von `engine.js`, `dist/` oder Release-EXE;

- keine neue externe Datenquelle ohne eigenen Review;

- keine Migration realer lokaler Nutzerdaten in Test-Fixtures;

- keine Zusammenlegung mit Simulator-Refactorings.

## Verbindliche Leitentscheidungen

1. Die Engine bleibt Source of Truth fuer genau einen fachlich vollstaendigen Single-Year-Input. Haushaltsverteilung wird vor dem Engine-Aufruf in DOM-freier Balance-/Profil-Logik aufgeloest.

2. Ein Jahresprozess besitzt eine stabile Perioden-ID, zum Beispiel das abgeschlossene Kalenderjahr. Wiederholung derselben Periode darf keine zweite Mutation ausloesen.

3. Datenbeschaffung und Zustandsmutation werden getrennt: Fetch/Parse/Validate zuerst, Commit erst nach erfolgreicher Vorschau und Snapshot.

4. `endeVJ` bezeichnet ausschliesslich den letzten verfuegbaren Handelstag des abgeschlossenen Kalenderjahres.

5. Inflationsquellen muessen denselben Kalenderjahres-Contract liefern; Deflation wird nicht still auf null begrenzt.

6. Inkompatible Engine-Major-Versionen blockieren Berechnung und Persistenz.

7. Import und Recovery arbeiten schema-validiert und mit Rueckfallpunkt.

8. Parser melden ungueltige Werte; sie wandeln fachlich relevante Fehleingaben nicht still in `0` um.

9. Der Jahresprozess ist nicht ACID-atomar. Der verbindliche Sicherheitscontract lautet: nebenwirkungsfreier Preflight -> erfolgreicher Pre-Mutation-Flush -> bestaetigter Recovery-Snapshot -> sequentielle fachliche Writes -> Post-Write-Validierung -> finaler Flush. Ohne bestaetigten Recovery-Snapshot beginnen keine Writes.

10. Legacy-Daten ohne Perioden-ID werden nicht aus Alter oder unsicheren Datumsfeldern als `already_committed` erraten. Der erste neue Jahresprozess liefert `legacy_confirmation_required`; der Nutzer bestaetigt einmalig Zielperiode und ob diese bereits abgeschlossen wurde. Erst diese Bestaetigung erzeugt die Baseline-Metadaten.

11. **Fachentscheidung D-01, entschieden am 2026-07-13 – Variante A:** Floor, Flex, Renten und sonstige Einkuenfte werden genau einmal auf Haushaltsebene verarbeitet. Erst der daraus resultierende gemeinsame Nettoentnahmebedarf wird gemaess dem gewaehlten Finanzierungsmodus auf Profile verteilt. Profil-Engine-Laeufe erhalten nur ihren Finanzierungsanteil und duerfen keine zweite Spending-, Floor-/Flex- oder Einkommensanrechnung erzeugen. Floor und Flex werden nicht als eigenstaendige Profilbudgets allokiert.

## Ausgangsbefunde und Zuordnung

| ID | Prioritaet | Befund | Slice |
| - | - | - | - |
| F-01 | P0 | Profilverbund simuliert den vollen Haushaltsbedarf je Profil | 01 |
| F-02 | P0 | aktueller Tageskurs wird als `endeVJ` gespeichert | 04 |
| F-03 | P0 | Jahresupdate und Jahresabschluss besitzen keinen eindeutigen Periodenvertrag | 02, 03 |
| F-04 | P1 | Jahresupdate ist nicht atomar und nicht idempotent | 02, 03 |
| F-05 | P1 | Inflationsquellen haben unterschiedliche Semantik und keinen einheitlichen Timeout | 05 |
| F-06 | P1 | Deflation wird in Bedarf und kumuliertem Faktor unterschiedlich behandelt | 05 |
| F-07 | P1 | Profilverbund-Abwahl wird beim Start zurueckgesetzt | 06 |
| F-08 | P1 | Update-Fehler blockieren Jahresabschluss nicht verlaesslich | 03, 07 |
| F-09 | P1 | inkompatible Engine rechnet trotz Warnung weiter | 07 |
| F-10 | P2 | JSON-Import ohne Schema-/Versionspruefung und Recovery | 08 |
| F-11 | P2 | korrupte Ausgabendaten werden still als leer behandelt | 09 |
| F-12 | P2 | tolerantes Zahlen-/CSV-Parsing maskiert Fehler | 10 |
| F-13 | Prozess | kritische Orchestrierungsinvarianten fehlen in echten Browserablaeufen | 11 |


## Architektur-Zielbild

```
Profilverbund  
  -\> Haushaltsbedarf und profilbezogene Ressourcen normalisieren  
  -\> deterministische Profilallokation  
  -\> genau ein Engine-Input je Profil mit zugeordnetem Bedarf  
  -\> Haushaltsinvarianten pruefen  
  -\> Actions zusammenfuehren  
  
Jahresprozess  
  -\> Perioden-ID und Ist-Zustand lesen  
  -\> Inputs/Engine-Version validieren  
  -\> externe Daten mit Stichtagsmetadaten beschaffen  
  -\> geplante Mutation als Vorschau erzeugen  
  -\> Pre-Mutation-Snapshot und Flush  
  -\> Mutation genau einmal committen  
  -\> Post-Commit-Flush und Abschlussprotokoll
```

## Slice-Reihenfolge

| Nr. | Slice | Prioritaet | Abhaengigkeit | Programmdateien max. | Status |
| -: | - | - | - | -: | - |
| 1 | [Profilverbund-Bedarfsallokation](./SLICE_BALANCE_HARDENING_01_PROFILVERBUND_ALLOCATION.md) | P0 | keine; D-01 entschieden | 5 | erledigt |
| 2 | [Jahresperioden-Contract](./SLICE_BALANCE_HARDENING_02_ANNUAL_PERIOD_CONTRACT.md) | P0 | keine | 2 | erledigt |
| 3 | [Fail-safe Jahresprozess-Integration](./SLICE_BALANCE_HARDENING_03_ANNUAL_WORKFLOW_COMMIT.md) | P0 | 02 | 5 | erledigt |
| 4 | [Marktdaten-Stichtag](./SLICE_BALANCE_HARDENING_04_MARKETDATA_ASOF.md) | P0 | 02 | 5 | erledigt |
| 5 | [Inflations-Contract](./SLICE_BALANCE_HARDENING_05_INFLATION_CONTRACT.md) | P1 | 02 | 5 | erledigt |
| 6 | [Persistente Profilmitgliedschaft](./SLICE_BALANCE_HARDENING_06_PROFILE_MEMBERSHIP.md) | P1 | 01 | 3 | erledigt |
| 7 | [Engine-Gate und Update-Ergebnis](./SLICE_BALANCE_HARDENING_07_ENGINE_UPDATE_GATE.md) | P1 | 03 | 4 | erledigt |
| 8 | [Schema-validierter Balance-Import](./SLICE_BALANCE_HARDENING_08_IMPORT_RECOVERY.md) | P1 | 07 | 4 | erledigt |
| 9 | [Korrupte Persistenz sichtbar behandeln](./SLICE_BALANCE_HARDENING_09_CORRUPT_DATA_RECOVERY.md) | P1 | 08 | 5 | geplant |
| 10 | [Striktes Zahlen- und CSV-Parsing](./SLICE_BALANCE_HARDENING_10_STRICT_PARSING.md) | P2 | 04, 05, 08 | 5 | geplant |
| 11 | [Browser-E2E und Dokumentationsgates](./SLICE_BALANCE_HARDENING_11_E2E_DOCUMENTATION.md) | P2 | 01-10 | 1 | geplant |


## Globale Akzeptanzkriterien

- Zwei Profile mit zusammen 50.000 EUR Haushaltsbedarf erhalten zusammen exakt 50.000 EUR zugeordneten Bedarf, nicht 100.000 EUR.

- Summierte Profil-Action und Steuerreserve verletzen keine definierte Haushaltsinvariante.

- Ein Jahresprozess fuer dieselbe Perioden-ID ist idempotent.

- Kein Alter, Bedarf, Ausgabenjahr oder Markthistorienfeld wird nach einem fehlgeschlagenen Preflight teilweise fortgeschrieben.

- `endeVJ` enthaelt den letzten plausiblen Schlusskurs im Fenster 27.12. bis 31.12. des abgeschlossenen Jahres. Der feste VWCE.DE-Contract akzeptiert Rohkurse von 0,50 bis 100.000 EUR und blockiert insbesondere Proxy-/Skalierungsfehler. Perioden-ID, ISO-Stichtag, Wert, Ticker, Quelle, Zieljahr, Marktdateninputs und ATH-Auswertung werden unter `annualMarketDataMeta` gemeinsam nachvollziehbar persistiert.

- Inflationswert, Bezugsjahr, Quelle, Datenstand und Semantik sind nachvollziehbar persistiert.

- Ein Engine-Major-Mismatch verhindert Engine-Aufruf und State-Speicherung.

- Ungueltige oder inkompatible Imports veraendern keine Live-Daten.

- Korrupte Daten werden quarantiniert beziehungsweise als Recovery-Fall angezeigt, nicht still geleert.

- `npm test` und `npm run test:browser` sind am Ende gruen.

- Architektur-, Workflow- und Testdokumentation ist synchron.

## Querschnittliche Invarianten

### Profilverbund

- `sum(profileAllocatedNeed) === householdNeed` innerhalb einer dokumentierten Rundungstoleranz.

- Kein Profil erhaelt mehr Bedarf als seine Allokation.

- Nicht ausgewaehlte Profile beeinflussen weder Assets noch Renten, Bedarf, Diagnose oder Action.

- Jede Quelle/Verwendung bleibt einem `profileId` zuordenbar.

### Jahresprozess

- Preflight ist nebenwirkungsfrei.

- Snapshot entsteht vor der ersten fachlichen Mutation.

- Commit besitzt genau eine Perioden-ID und einen Abschlussstatus.

- Fehler vor Commit: keine Mutation. Fehler nach Commit: Snapshot und klarer Recovery-Status bleiben erhalten.

- Doppelklick und erneuter Aufruf koennen keinen zweiten Commit erzeugen.

### Persistenz und Import

- Jede ersetzende Operation validiert zuerst und schreibt fail-safe mit bestaetigtem Recovery-Punkt; eine ACID-Garantie ueber mehrere Storage-Keys wird nicht behauptet.

- Ein Recovery-Snapshot darf keine technischen oder persoenlichen Fremddaten aus Tests enthalten.

- Fehlermeldungen enthalten betroffenen Bereich und Handlungsoption, aber keine sensiblen Payloads.

Der aktuelle Balance-Dateivertrag ist `appId: "ruhe-stand-suite.balance"`, `schema: "balance-state"`, `schemaVersion: 1`, `appVersion`, `exportedAt` und `payload`. Unversionierte Rohobjekte werden abgewiesen. Als explizite Legacy-Pfade sind nur die frueheren Balance-Envelopes v21.1 und v22.0 zugelassen und getestet. Ein Import folgt verbindlich der Reihenfolge pure Shape-/Kernwertvalidierung -> Engine-Dry-Run ohne Persistenz -> bestaetigter Snapshot mit Kind `balance-import-recovery` -> einzelner Replace des Balance-State-Keys -> persistentes Erfolgs-Update. Ein spaeter Fehler rollt alle erfassten erlaubten Live-Daten und die sichtbaren Eingaben zurueck; ohne bestaetigten Snapshot findet kein Replace statt.

## Teststrategie

Je Slice zuerst fokussierte Tests, danach mindestens alle direkt gefaehrdeten Balance-/Profil-/Persistenztests. Nach Contract-Aenderungen an Profil- oder Persistenzdaten ist `npm test` verpflichtend. Browser- und Workflow-Aenderungen erhalten zusaetzlich `npm run test:browser`.

Abschlussgates:

```
npm test  
npm run test:browser  
npm run test:coverage
```

`npm run build:engine` ist nur erforderlich, falls ein Reviewer spaeter eine Engine-Aenderung genehmigt. Dieser Plan sieht keine Engine-Aenderung vor.

## Stop- und Eskalationskriterien

Zusatzlich zu `AGENTS.md` und `SLICE\_EXECUTION\_RULES.md` wird gestoppt, wenn:

- die korrekte Aufteilung von Floor und Flex im Profilverbund fachlich nicht aus bestehenden Contracts ableitbar ist;

- ein Slice mehr als fuenf Programmdateien benoetigt;

- fuer Idempotenz oder Persistenz die Engine-Semantik veraendert werden muesste;

- Snapshot-/Backtest-Ergebnisse ausserhalb der erwarteten neuen Contracts abweichen;

- UI und Engine fuer denselben Wert unterschiedliche Parameternamen oder Einheiten verwenden;

- `minimumFlexAnnual` still begrenzt statt validiert wuerde;

- fokussierte oder verpflichtende Tests nicht ausfuehrbar sind;

- bestehende fremde Aenderungen mit dem Slice-Scope kollidieren.

- eine Umsetzung von der entschiedenen D-01-Variante A abweichen oder Floor/Flex beziehungsweise Einkuenfte erneut auf Profilebene verarbeiten wuerde.

- ein Recovery-Snapshot wegen Quota-, Adapter- oder Berechtigungsfehler nicht bestaetigt geschrieben werden kann.

## Review- und Freigabeprozess

1. Gemini prueft diesen Plan adversarial und dokumentiert Findings unter `Review-Feedback von Gemini`.

2. Codex arbeitet Findings ein und dokumentiert Antworten.

3. Erst nach Status `implementierungsreif` und Freigabe darf Slice 01 beginnen.

4. Vor jedem Slice werden Branch und `git status --short` erneut in der Slice-Datei dokumentiert.

5. Nach jedem Slice: fokussierte Tests, Gesamtsuite gemaess Risiko, Rueckdokumentation, Gemini-Review und Nutzerfreigabe.

6. Codex erstellt keine Commits. Push erfolgt nur nach ausdruecklicher Nutzerfreigabe.

## Umsetzungsprotokoll

| Datum | Ereignis | Ergebnis |
| - | - | - |
| 2026-07-13 | Plan und Slice-Dateien angelegt | Branch lokal; Implementierung und Review ausstehend |
| 2026-07-13 | Gemini-Review durchgefuehrt | Status: blockiert; 2 Blocker, 3 Major, 7 Minor, 2 Hinweise |
| 2026-07-13 | Review-Findings eingearbeitet | Remote- und Modulinventur verifiziert; F-R04 bis F-R12 praezisiert; D-01 und zweites Review bleiben offen |
| 2026-07-13 | Fachentscheidung D-01 durch Nutzer getroffen | Variante A verbindlich: Haushalts-Spending einmal bestimmen, nur Nettoentnahme auf Finanzierungsprofile verteilen; zweites Review bleibt ausstehend |
| 2026-07-13 | Arbeitsdokument durch Nutzer freigegeben; Slice 01 gestartet | Scope nach Startanalyse um `balance-main.js` auf 5 Programmdateien erweitert; allgemeine Stop-Grenze zuvor gemaess AGENTS.md angehoben |
| 2026-07-13 | Slice 01 durch Codex implementiert | Haushalts-Spending einmal ausgefuehrt; centgenaue Profilfinanzierung; fokussierte Tests 96/96, Gesamtsuite 3151/3151 und Browser-Smoke gruen; Code-Review ausstehend |
| 2026-07-13 | Slice 01 durch Gemini freigegeben und committed | Commit `dabd3d8`; keine Blocker, dokumentierte Restrisiken G1-01 bis G1-03 |
| 2026-07-13 | Slice 02 durch Codex implementiert | Reiner Jahresperioden-/Legacy-/Recovery-Contract; fokussiert 52/52, Gesamtsuite 3203/3203; Code-Review ausstehend |
| 2026-07-13 | Slice 02 durch Gemini freigegeben und committed | Commit; keine Blocker, Restrisiken G2-01 bis G2-02 |
| 2026-07-13 | Slice 03 durch Codex implementiert | Beide Jahres-Buttons auf Perioden-Coordinator vereinheitlicht; Snapshot-/Recovery-Phasen, Idempotenz und Doppelklick-Sperre integriert; fokussiert 52/52 + 28/28 + 23/23 + 24/24, Gesamtsuite 3186/3186 und Browser-Smoke gruen; Code-Review ausstehend |
| 2026-07-13 | Slice 03 durch Gemini freigegeben und committed | Commit; keine Blocker, Restrisiken G3-01 bis G3-03 |
| 2026-07-14 | Slice 04 durch Gemini freigegeben und committed | Commit; keine Blocker, Restrisiko G4-01 |
| 2026-07-14 | Slice 05 durch Codex implementiert | Gemeinsamer Kalenderjahres-/Ergebnisvertrag fuer ECB, World Bank und OECD; aktuelle OECD-SDMX-API samt Tauri-CSP; Timeout/Abort-Cleanup; Deflation in Bedarf und kumuliertem Faktor; mutationsfreier Fehlerpfad. Reale Einjahresantworten fuer 2025 verifiziert; fokussiert 34/34 + 30/30 + 37/37, Gesamtsuite 3288/3288; Code-Review ausstehend |
| 2026-07-14 | Slice 05 durch Gemini freigegeben und committed | Commit; keine Blocker, Restrisiko G5-01 |
| 2026-07-14 | Slice 06 durch Codex implementiert | Pauschalen Membership-Reset beim Balance-Start entfernt; gespeichertes Opt-out und Checkboxzustand bleiben erhalten; bestehender Neu-/Legacy-Default `true` ohne Registry-Migration abgesichert; ausgeschlossene Profile bleiben aus Aggregaten, Profil-Runs und Action-Quellen entfernt. Fokussiert 51/51 + 127/127 + 58/58, Gesamtsuite 3291/3291; Code-Review ausstehend |
| 2026-07-14 | Slice 06 durch Gemini freigegeben und committed | Commit; keine Blocker, Restrisiko G6-01 |
| 2026-07-14 | Slice 07 durch Codex implementiert | Engine-Major-Gate bindet den erfolgreichen `getVersion()`-/`simulateSingleYear()`-Contract fail-closed; nachtraeglicher Engine-Austausch, fehlende und inkompatible Engines blockieren Berechnung und Persistenz. `update()` liefert `success`, `validation_error`, `engine_error` oder `blocked`; spaetes Script-`src`-Umschreiben entfernt. Fokussiert Smoke gruen + 63/63 + 30/30, Gesamtsuite 3291/3291 und Browser-Smoke fuer alle fuenf Einstiegspunkte gruen; Code-Review ausstehend |
| 2026-07-14 | Slice 07 durch Gemini freigegeben und committed | Commit; keine Blocker, Restrisiko G7-01 |
| 2026-07-14 | Slice 08 durch Codex implementiert | Aktuelles `balance-state`-v1-Schema und explizite v21.1-/v22.0-Migration; Pflicht-/Kernwertvalidierung; Engine-Dry-Run; bestaetigter `balance-import-recovery`-Snapshot; einzelner Balance-State-Replace und automatischer allowlist-basierter Voll-Rollback bei spaetem Fehler. Fokussiert 106/106 + 38/38 + 21/21 + 202/202 gruen; Gesamtsuite 3305/3305 und Browser-Smoke fuer alle fuenf Einstiegspunkte gruen; Code-Review ausstehend. |
| 2026-07-14 | Slice 08 durch Gemini freigegeben und committed | Commit; keine Blocker, Restrisiko G8-01 |


## Review-Feedback von Gemini

**Reviewer:** Gemini (Claude-Modell, adversariale Rolle gemaess GEMINI.md) **Datum:** 2026-07-13 **Status:** blockiert

### Blocker

**F-R01 – Branch-Status-Widerspruch:** Der Plan dokumentiert `nur lokal angelegt`, aber `remotes/origin/codex/balance-app-hardening` existiert bereits auf GitHub. Der Branch existiert nicht lokal. Alle 11 Slice-Dokumente wiederholen denselben falschen Status. Vor Implementierung klaeren: Wer hat gepusht? Welchen Stand hat der Remote-Branch? Alle Dokumente korrigieren.

**F-R02 – BALANCE\_MODULES\_README.md massiv veraltet:** Die Referenz listet 8 Module, tatsaechlich existieren 35 Dateien in `app/balance/`. Mehrere Slice-Scope-Dateien (z.B. `balance-annual-orchestrator.js`, `balance-update-pipeline.js`, `balance-binder-imports.js`) sind in der Referenz nicht erfasst. Vor Implementierung aktualisieren.

### Major-Findings (vor Slice 01 zu klaeren)

**F-R03 – Floor/Flex-Split ohne Eskalationspfad (Slice 01):** Das offene Risiko benennt die fachliche Entscheidung zum Floor/Flex-Split, aber es fehlt: Wer entscheidet? Bis wann? Was ist der Fallback? Empfehlung: Nutzerentscheidung unter Leitentscheidungen ergaenzen.

**F-R04 – Legacy-Migrationspfad fuer Perioden-ID fehlt (Slice 02):** Bestehende Daten haben keine Perioden-ID. Es fehlt: Strategie fuer den ersten Jahresabschluss nach Migration, Inferenz von `already\_committed` fuer Legacy-Perioden, Testfall fuer den Uebergang. Empfehlung: Abschnitt Legacy-Migration im Slice ergaenzen.

**F-R05 – Atomaritaet ueber localStorage nicht garantierbar (Slice 03):** Der Slice fordert atomare Commits, localStorage bietet keine Multi-Key-Transaktionen. Empfehlung: Titel und AK klarstellen – atomar im Sinne von fail-safe mit Recovery-Punkt (Snapshot → Writes → Validierung), nicht ACID.

### Minor-Findings

**F-R06 – Handelstag-Toleranzfenster fehlt (Slice 04):** Kein definiertes Fenster fuer den letzten Handelstag. Empfehlung: Fenster \[27.12.–31.12.\] explizit dokumentieren.

**F-R07 – Deflationsformel fehlt (Slice 05):** AK 4 fordert konsistente Deflationsbehandlung, aber ohne konkrete Formel. Empfehlung: Mathematische Definition als AK ergaenzen.

**F-R08 – Scope-Ueberschneidung Slice 01/06:** Beide Slices aendern `balance-main-profilverbund.js`. Merge-Risiko nicht bewertet. Empfehlung: Betroffene Funktionen in Slice 06 explizit dokumentieren.

**F-R09 – loadExpensesStore() Signatur-Break (Slice 09):** Aenderung von `ok/empty` zu `ok/empty/corrupt` ist ein Interface-Break. Empfehlung: Aufrufer-Analyse vor Implementierung dokumentieren.

**F-R10 – minimumFlexAnnual ohne Grenzwerte (Slice 10):** AK 7 fordert Validierung, definiert aber keinen Gueltigkeitsbereich. Empfehlung: Wertebereich und Fehlerbehandlung konkretisieren.

**F-R11 – 1 Programmdatei fuer 5+ E2E-Tests (Slice 11):** Akzeptabel, aber bei \>500 Zeilen Aufteilung erwaegen.

**F-R12 – ENGINE\_VERSION nicht im Code gefunden (Slice 07):** Grep nach `ENGINE\_VERSION` in `.js`/`.mjs`-Dateien ergab keine Treffer. Vor Slice 07 den tatsaechlichen Versionsmechanismus verifizieren.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – wahrscheinlichste Ursache:

1. Legacy-Migrationspfad (F-R04) erkennt nicht alle Datenkonstellationen; laufender Jahresabschluss wird faelschlich als `incomplete\_recovery` klassifiziert.

2. Snapshot-Recovery (F-R05) scheitert an localStorage-Quota; Writes laufen ohne Rueckfallpunkt.

3. Profilverbund-Allokation (F-R03) erzeugt bei Randfaellen (100% Floor/100% Flex) fachlich falsche Handlungsempfehlungen.

### Empfohlenes Vorgehen

1. F-R01 klaeren: Branch-Status verifizieren, alle Dokumente korrigieren.

2. F-R02 umsetzen: BALANCE\_MODULES\_README.md auf 35-Datei-Stand aktualisieren.

3. F-R03, F-R04, F-R05 in den Arbeitsplan einarbeiten.

4. Codex arbeitet F-R06 bis F-R12 als Praezisierungen in die Slice-Dokumente ein.

5. Zweites Review nach Einarbeitung.

## Review-Feedback von Claude

# Review: Balance-App-Hardening – Arbeitsplan und Slice-Dokumente

**Reviewer:** Gemini (Claude-Modell, adversariale Rolle gemäß GEMINI.md)  
**Datum:** 2026-07-13  
**Gegenstand:** [BALANCE\_APP\_HARDENING\_PLAN.md](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/BALANCE_APP_HARDENING_PLAN.md) + 11 Slice-Dokumente  
**Review-Typ:** Adversariales Plan-Review vor Implementierungsfreigabe


## Prüfdimensionen

### 1. Korrektheit der Befunderhebung und Scope-Zuordnung

### 2. Vertragstreue gegenüber Projektregeln (AGENTS.md, SLICE\_EXECUTION\_RULES.md)

### 3. Fehlerbehandlung und Grenzfälle in der Planung

### 4. Seiteneffekte und Abhängigkeitsketten

### 5. Architektur-Konsistenz mit TECHNICAL.md und Modul-READMEs


## Findings

### F-R01 – BLOCKER: Branch-Status-Widerspruch

**Betroffen:** Arbeitsplan Zeile 6, alle Slice-Dokumente  
**Sachverhalt:** Der Arbeitsplan dokumentiert:

> `GitHub-Status: nur lokal angelegt; keine Veroeffentlichung ohne ausdrueckliche Freigabe`

Die Git-Branch-Analyse zeigt jedoch:

- `remotes/origin/codex/balance-app-hardening` **existiert bereits auf GitHub**

- Der Branch existiert **nicht lokal** auf `main`

Dies ist ein direkter Widerspruch. Der Branch wurde offensichtlich bereits gepusht, aber die Dokumentation behauptet das Gegenteil. Alle 11 Slice-Dokumente wiederholen denselben falschen Status.

**Bewertung:** Blocker. Vor jeder Implementierung muss geklärt werden:

1. Wer hat den Branch auf GitHub veröffentlicht und warum?

2. Welchen Stand hat der Remote-Branch?

3. Der lokale Branch muss mit `git checkout codex/balance-app-hardening` angezogen oder der Remote-Stand geprüft werden.

4. Alle Dokumente müssen den tatsächlichen Status korrekt abbilden.


### F-R02 – BLOCKER: Balance-Verzeichnis enthält bereits 35 Module – Scope-Dateien teilweise unbekannt

**Betroffen:** Slices 03, 07, 08, 09, 10  
**Sachverhalt:** Die [Balance-Modulreferenz](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/reference/BALANCE_MODULES_README.md) listet nur 8 Module. Das tatsächliche Verzeichnis `app/balance/` enthält **35 Dateien**. Der BALANCE\_MODULES\_README.md ist massiv veraltet (Stand: 2025-11-15).

Mehrere Slice-Scope-Dateien referenzieren Module, die **bereits existieren** und von der Referenzdoku **nicht erfasst** sind:

- `balance-annual-orchestrator.js` (existiert, 5.5 KB) – Slice 03 will hier ändern

- `balance-update-pipeline.js` (existiert, 3.8 KB) – Slice 07 will hier ändern

- `balance-binder-imports.js` (existiert, 6.2 KB) – Slices 08, 10 wollen hier ändern

- `balance-expenses-storage.js` (existiert, 2.6 KB) – Slice 09 will hier ändern

- `balance-expenses-csv.js` (existiert, 3.3 KB) – Slice 10 will hier ändern

**Risiko:** Ohne aktuelle Modul-Dokumentation besteht die Gefahr, dass Codex bestehende Contracts verletzt, weil die Referenzdoku den Ist-Stand nicht abbildet.

**Empfehlung:** BALANCE\_MODULES\_README.md vor Slice 01 aktualisieren (kann als Vorbereitungsschritt ohne Codeänderung erfolgen). Alternativ: Slice 11 explizit um diesen Sync erweitern.


### F-R03 – MAJOR: Slice 01 – Floor/Flex-Split bleibt als offenes Risiko ohne Eskalationspfad

**Betroffen:** [Slice 01](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_01_PROFILVERBUND_ALLOCATION.md), Zeile 77  
**Sachverhalt:** Das offene Risiko dokumentiert korrekt:

> „Fachliche Entscheidung, wie Floor und Flex bei steueroptimierter Quellenwahl getrennt zugeordnet werden."

Allerdings fehlt ein konkreter Eskalationspfad: Wer trifft diese Entscheidung? Bis wann? Was ist der Fallback?

**Kontext:** Die bestehende Profilverbund-Logik in [profilverbund-balance.js](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profilverbund-balance.js) (22 KB) ist komplex. Zeile 172 filtert Profile nach `belongsToHousehold !== false`, aber die Bedarfsallokation selbst ist nicht als separate Funktion extrahiert.

**Empfehlung:** Vor Slice 01 muss eine fachliche Entscheidung zum Floor/Flex-Split dokumentiert werden. Vorschlag: Nutzer-Entscheidung explizit im Arbeitsplan unter „Verbindliche Leitentscheidungen" ergänzen, bevor Slice 01 freigegeben wird.


### F-R04 – MAJOR: Slice 02 – Legacy-Daten ohne Perioden-ID haben keinen definierten Migrationspfad

**Betroffen:** [Slice 02](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_02_ANNUAL_PERIOD_CONTRACT.md), Zeile 70  
**Sachverhalt:** Bestehende Balance-Daten haben keine Perioden-ID. Das offene Risiko benennt dies, aber es fehlt:

1. Eine Strategie, wie der **erste Jahresabschluss nach Migration** abläuft

2. Ob `already\_committed` für Legacy-Perioden inferiert wird (z.B. aus `balanceState.alter` oder gespeichertem Jahr)

3. Ein Testfall für den Übergang von Legacy zu neuem Contract

**Risiko:** Ohne explizite Migrationsstrategie könnte der erste Jahresabschluss nach Einführung des Perioden-Contracts entweder fälschlich blockiert werden (Legacy als `incomplete\_recovery`) oder doppelt durchlaufen.

**Empfehlung:** Im Slice-Dokument einen Abschnitt „Legacy-Migration" mit konkretem Inferenz-Algorithmus ergänzen.


### F-R05 – MAJOR: Slice 03 – Atomarität über localStorage ist architekturell nicht garantierbar

**Betroffen:** [Slice 03](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_03_ANNUAL_WORKFLOW_COMMIT.md), Zeile 79  
**Sachverhalt:** Der Slice fordert atomare Commits über mehrere Persistenz-Keys. localStorage bietet jedoch keine Multi-Key-Transaktionen. Das offene Risiko benennt dies:

> „Echte atomare Persistenz ueber mehrere Keys muss mit vorhandener Facade erreichbar sein; andernfalls stoppen und Scope neu entscheiden."

**Analyse:** Die bestehende Persistenz nutzt localStorage mit [balance-storage.js](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/balance/balance-storage.js) (17.5 KB). Echte Atomarität ist damit nicht erreichbar. Die realistische Lösung ist ein Snapshot-basierter Recovery-Ansatz (Write-Ahead-Log-Muster), kein echtes ACID.

**Empfehlung:**

1. Den Slice-Titel und die Akzeptanzkriterien klarstellen: „atomar" im Sinne von „fail-safe mit Recovery-Punkt", nicht im Sinne von ACID-Transaktionen.

2. Explizit dokumentieren, dass der Ansatz Snapshot → Sequentielle Writes → Post-Write-Validierung ist.


### F-R06 – MINOR: Slice 04 – „Handelstag" vs. Datenverfügbarkeit bei Yahoo Finance

**Betroffen:** [Slice 04](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_04_MARKETDATA_ASOF.md)  
**Sachverhalt:** Der Slice definiert `endeVJ` als „letzten verfügbaren Handelstag des abgeschlossenen Kalenderjahres". Aktuell liest der Code in [balance-annual-marketdata.js](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/balance/balance-annual-marketdata.js) den ETF-Preis und setzt ihn direkt mit `dom.inputs.endeVJ.value = etfPrice.toString()` (Zeile 367).

**Analyse:** Yahoo Finance liefert für Jahresende-Daten typischerweise den Schlusskurs des 30. oder 31. Dezember. Für manche Märkte ist der letzte Handelstag aber der 28. oder 29. Dezember. Der Slice definiert kein Toleranzfenster.

**Empfehlung:** Im Slice explizit dokumentieren: „Der letzte Handelstag liegt im Fenster \[27.12. – 31.12.\] des Zieljahres. Kurse außerhalb dieses Fensters werden abgelehnt."


### F-R07 – MINOR: Slice 05 – Deflationsbehandlung fehlt als Akzeptanzkriterium mit konkreter Formel

**Betroffen:** [Slice 05](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_05_INFLATION_CONTRACT.md), AK 4  
**Sachverhalt:** Das Akzeptanzkriterium lautet:

> „Deflation wirkt in Bedarf und kumuliertem Faktor konsistent; keine stille Nullbegrenzung."

Es fehlt die konkrete Formel: Wird Deflation multiplikativ angewendet (`bedarfNeu = bedarfAlt \* (1 + rate)`, wobei rate \< 0)? Oder gibt es eine Untergrenze für den kumulierten Faktor?

**Empfehlung:** Eine konkrete mathematische Definition der Deflationsbehandlung als Akzeptanzkriterium ergänzen, z.B.:

```
kumulierterFaktor(t) = kumulierterFaktor(t-1) \* (1 + inflationsRate(t))  
bedarf(t) = basisBedarf \* kumulierterFaktor(t)  
// Keine Begrenzung auf \>= 0 für inflationsRate oder kumulierterFaktor
```


### F-R08 – MINOR: Slice 06 – Scope-Datei `app/balance/balance-main-profilverbund.js` überschneidet sich mit Slice 01

**Betroffen:** [Slice 06](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_06_PROFILE_MEMBERSHIP.md) und [Slice 01](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_01_PROFILVERBUND_ALLOCATION.md)  
**Sachverhalt:** Beide Slices listen `balance-main-profilverbund.js` im Scope. Slice 01 (Bedarfsallokation) und Slice 06 (persistente Mitgliedschaft) ändern dieselbe Datei. Die Abhängigkeit Slice 06 → Slice 01 ist dokumentiert, aber das Merge-Risiko ist nicht bewertet.

**Empfehlung:** Im Slice 06 explizit dokumentieren, welche Funktionen/Abschnitte geändert werden und dass die Änderungen aus Slice 01 als Basis vorausgesetzt werden.


### F-R09 – MINOR: Slice 09 – `loadExpensesStore()` Signaturänderung kann Kettenreaktion auslösen

**Betroffen:** [Slice 09](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_09_CORRUPT_DATA_RECOVERY.md), Zeile 78  
**Sachverhalt:** Das offene Risiko benennt korrekt, dass eine Signaturänderung weitere Aufrufer betreffen kann. Die Regel „bei mehr als 5 Programmdateien stoppen" ist dokumentiert.

**Analyse:** [balance-expenses-storage.js](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/balance/balance-expenses-storage.js) (2.6 KB) wird wahrscheinlich von `balance-expenses.js` und `balance-main.js` importiert. Eine Signaturänderung von `ok/empty` zu `ok/empty/corrupt` ist ein **Interface-Break**.

**Empfehlung:** Vor Implementierung eine Aufrufer-Analyse dokumentieren. Wenn mehr als die 5 Scope-Dateien betroffen sind, muss der Slice geteilt werden.


### F-R10 – MINOR: Slice 10 – `minimumFlexAnnual` Validierung ohne klare Grenzwerte

**Betroffen:** [Slice 10](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_10_STRICT_PARSING.md), AK 7  
**Sachverhalt:** Das Akzeptanzkriterium fordert:

> „`minimumFlexAnnual` wird validiert und niemals still begrenzt."

Es fehlt die Definition: Was sind gültige Werte? Welche Fehlermeldung wird erzeugt? Wie verhält sich die UI bei Validation-Reject?

**Empfehlung:** Gültigkeitsbereich (z.B. `\>= 0`, `\<= householdNeed`) und erwartete Fehlerbehandlung als konkretes Akzeptanzkriterium ergänzen.


### F-R11 – MINOR: Slice 11 – Nur 1 Programmdatei für umfangreiche E2E-Tests ist ambitioniert

**Betroffen:** [Slice 11](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SLICE_BALANCE_HARDENING_11_E2E_DOCUMENTATION.md)  
**Sachverhalt:** Der Slice erlaubt maximal 1 Programmdatei für Browser-E2E-Tests, die mindestens 5 verschiedene Nutzerabläufe abdecken sollen (Profilabwahl, Engine-Mismatch, Doppelklick, Preflight, Commit). Das ist machbar, wenn alle Tests in einer Datei liegen, aber die Komplexität könnte die Wartbarkeit beeinträchtigen.

**Empfehlung:** Akzeptabel, aber bei der Implementierung auf Test-Isolation innerhalb der Datei achten. Falls die Datei \> 500 Zeilen wird, sollte eine Aufteilung in Betracht gezogen werden (erfordert Scope-Erweiterung).


### F-R12 – MINOR: ENGINE\_VERSION nicht im Codebase gefunden

**Betroffen:** Slice 07 (Engine-Gate)  
**Sachverhalt:** Eine Grep-Suche nach `ENGINE\_VERSION` in `.js`/`.mjs`-Dateien ergab **keine Treffer**. Die engine/README.md referenziert `ENGINE\_VERSION` in `constants.js`, aber der tatsächliche Mechanismus ist möglicherweise anders implementiert.

**Empfehlung:** Vor Slice 07 den tatsächlichen Versions-Mechanismus der Engine verifizieren. Falls `ENGINE\_VERSION` nicht als explizite Konstante existiert, muss der Slice den Gate-Mechanismus anders definieren.


### F-R13 – HINWEIS: Gesamtanzahl betroffener Programmdateien über alle Slices

**Betroffen:** Gesamtplan  
**Sachverhalt:** Die Summe der maximal betroffenen Programmdateien über alle 11 Slices beträgt: 4 + 2 + 5 + 2 + 3 + 3 + 4 + 4 + 5 + 5 + 1 = **38 Programmdateien**

Abzüglich Überschneidungen (z.B. `balance-main-profilverbund.js` in Slice 01 und 06, `balance-binder-imports.js` in Slice 08 und 10, diverse Testdateien) bleiben ca. **25-30 einzigartige Dateien**.

Dies ist erheblich und rechtfertigt die sequentielle Slice-Reihenfolge. Die Abhängigkeitskette ist sinnvoll: P0-Slices (01-04) bauen die Grundlage, P1-Slices (05-09) härten, P2-Slices (10-11) verfeinern und dokumentieren.


### F-R14 – HINWEIS: Abgleich Scope-Dateien mit tatsächlichen Moduldateien

| Slice | Scope-Datei | Existiert? | Anmerkung |
| - | - | - | - |
| 01 | `app/profile/profilverbund-balance.js` | ✅ (22 KB) | Komplex, Kernmodul |
| 01 | `app/balance/balance-main-profilverbund.js` | ✅ (13.5 KB) | Komplex |
| 02 | `app/balance/balance-annual-period.js` | ❌ NEU | Contract-Modul |
| 03 | `app/balance/balance-annual-orchestrator.js` | ✅ (5.5 KB) | Bereits vorhanden |
| 03 | `app/balance/balance-binder-snapshots.js` | ✅ (3.4 KB) |  |
| 03 | `app/balance/balance-binder.js` | ✅ (9.7 KB) |  |
| 03 | `app/balance/balance-main.js` | ✅ (17.5 KB) | Zentralmodul, riskant |
| 04 | `app/balance/balance-annual-marketdata.js` | ✅ (21 KB) | Komplex |
| 05 | `app/balance/balance-annual-inflation.js` | ✅ (9.5 KB) |  |
| 07 | `app/balance/balance-update-pipeline.js` | ✅ (3.8 KB) |  |
| 08 | `app/balance/balance-binder-imports.js` | ✅ (6.2 KB) |  |
| 08 | `app/balance/balance-storage.js` | ✅ (17.5 KB) | Komplex, Persistenz-Kern |
| 09 | `app/balance/balance-expenses-storage.js` | ✅ (2.6 KB) |  |
| 09 | `app/balance/balance-expenses.js` | ✅ (7.6 KB) |  |
| 10 | `app/balance/balance-utils.js` | ✅ (8.8 KB) | Shared Utility |
| 10 | `app/balance/balance-expenses-csv.js` | ✅ (3.3 KB) |  |


**Bewertung:** Die Scope-Dateien sind plausibel und existieren (bis auf die eine neue Datei in Slice 02). Positiv: Kein Slice plant Änderungen an `engine/`.


## Positive Aspekte (nach Finding-Dokumentation)

1. **Klare Nicht-Ziele:** Engine-Semantik bleibt unberührt – dies ist korrekt und wichtig.

2. **Konsistentes Slice-Template:** Alle 11 Slices folgen demselben Dokumentationsschema mit Branch-Status, Diff-Risiko, Rollback-Strategie.

3. **Sinnvolle Abhängigkeitskette:** P0 → P1 → P2 mit expliziten Slice-Abhängigkeiten.

4. **Stop-Regeln:** Sowohl global als auch slice-spezifisch gut definiert.

5. **Teststrategie:** Fokussierte Tests pro Slice + volle Suite ist ein solider Ansatz.

6. **Querschnittliche Invarianten:** Profilverbund- und Jahresprozess-Invarianten sind präzise formuliert.

7. **1-basierte Nummerierung:** Korrekt implementiert gemäß AGENTS.md.


## Review-Ergebnis

- **Status:** blockiert

- **Blocker:**

  - F-R01: Branch-Status-Widerspruch muss geklärt werden

  - F-R02: BALANCE\_MODULES\_README.md ist massiv veraltet; Ist-Stand muss vor Implementierung dokumentiert sein

- **Major-Findings (vor Slice-01-Freigabe zu klären):**

  - F-R03: Floor/Flex-Split braucht fachliche Entscheidung

  - F-R04: Legacy-Migrationspfad für Perioden-ID fehlt

  - F-R05: Atomaritäts-Definition klären (Snapshot-Recovery vs. ACID)

- **Minor-Findings (können parallel zur Implementierung adressiert werden):**

  - F-R06 bis F-R12: Präzisierungen in einzelnen Slices

- **Restrisiken:**

  - Die Gesamtkomplexität von 11 Slices mit ~25-30 einzigartigen Dateien ist erheblich

  - Realer Test mit localStorage-Quota-Grenzen fehlt in der Teststrategie

  - Playwright-Dependencies unter `node\_modules` sind ein ungelöstes DevDeps-Thema


## Pre-Mortem

> **Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?**

Die wahrscheinlichste Ursache ist ein **Datenverlust beim ersten realen Jahresabschluss nach dem Hardening**, weil:

1. Der Legacy-Migrationspfad (F-R04) nicht alle existierenden Datenkonstellationen korrekt erkennt und ein laufender Jahresabschluss fälschlich als `incomplete\_recovery` klassifiziert wird.

2. Der Snapshot-basierte Recovery-Mechanismus (F-R05) bei einer localStorage-Quota-Überschreitung den Snapshot nicht schreiben kann und die sequentiellen Writes dann ohne Rückfallpunkt ablaufen.

3. Die Profilverbund-Bedarfsallokation (F-R03) bei einem Randfall (z.B. ein Profil hat 100% Floor, das andere 100% Flex) einen unerwarteten Split erzeugt, der fachlich falsche Handlungsempfehlungen zur Folge hat.


## Empfohlenes Vorgehen

1. **F-R01 klären:** Branch-Status verifizieren und alle Dokumente korrigieren.

2. **F-R02 umsetzen:** BALANCE\_MODULES\_README.md auf den aktuellen 35-Datei-Stand aktualisieren.

3. **F-R03, F-R04, F-R05 in den Arbeitsplan einarbeiten:** Konkrete Entscheidungen unter „Verbindliche Leitentscheidungen" ergänzen.

4. **Codex passt an:** Findings F-R06 bis F-R12 als Präzisierungen in die jeweiligen Slice-Dokumente einarbeiten.

5. **Zweites Review nach Einarbeitung:** Gemini prüft die aktualisierten Dokumente erneut.

STATUS: DONE


## Review-Antworten von Codex

- **F-R01:** Nachpruefung widerspricht dem Finding. Der lokale Branch `codex/balance-app-hardening` ist aktiv. Die lokale Ref `remotes/origin/codex/balance-app-hardening` existiert nicht. Der autorisierte Remote-Check `git ls-remote --heads origin refs/heads/codex/balance-app-hardening` war erfolgreich und lieferte keine Zeile, also keinen gleichnamigen GitHub-Branch. Die Branch-Dokumentation wurde trotzdem um diesen verifizierten Stand praezisiert. Es wurde nichts gepusht.
- **F-R02:** Die Referenz war bereits auf Stand 2026-06-04 und nannte korrekt 35 Module; die Review-Aussage „8 Module/Stand 2025-11-15“ trifft auf den aktuellen Branch nicht zu. Das berechtigte Risiko einer zu groben Gruppierung wurde angenommen: `BALANCE_MODULES_README.md` enthaelt jetzt eine explizite 35-von-35-Datei-Inventur mit Verantwortungen.
- **F-R03:** Angenommen und fachlich erledigt. Der Nutzer hat am 2026-07-13 Variante A entschieden: Spending, Floor/Flex und Einkuenfte werden einmal auf Haushaltsebene verarbeitet; nur die resultierende Nettoentnahme wird auf Finanzierungsprofile verteilt. Slice 01 wurde auf diesen Contract konkretisiert und bleibt bis zum zweiten Review nicht freigegeben.
- **F-R04:** Angenommen und eingearbeitet. Slice 02 definiert `legacy_confirmation_required`, verbietet unsichere Heuristiken und beschreibt beide einmaligen Baseline-Varianten samt Pflichttests.
- **F-R05:** Angenommen und eingearbeitet. Hauptplan und Slice 03 sprechen nicht mehr von ACID-Atomaritaet, sondern von fail-safe Snapshot-/Write-Ahead-Recovery mit Post-Write-Validierung und Quota-Stop-Regel.
- **F-R06:** Angenommen. Slice 04 verlangt das Fenster 27.12. bis 31.12. des Zieljahres.
- **F-R07:** Angenommen. Slice 05 enthaelt die konkrete multiplikative Formel und den bestehenden gueltigen Ratenbereich von -10 bis 50 Prozent.
- **F-R08:** Angenommen. Slice 06 grenzt seine Aenderungen auf `initProfilverbundBalance()` und Membership-Initialisierung ein und verlangt einen Diff-Abgleich mit Slice 01.
- **F-R09:** Angenommen. Die aktuelle Aufruferanalyse ist dokumentiert; vor Coding wird sie wiederholt. Ein kompatibler Result-Pfad wird bevorzugt, bei mehr als fuenf Programmdateien wird geteilt.
- **F-R10:** Angenommen. Slice 10 definiert `0 <= minimumFlexAnnual <= flexBedarf`, konkrete Fehlermeldungen und fail-closed Verhalten ohne Clamp.
- **F-R11:** Angenommen. Slice 11 definiert Testisolation und eine 500-Zeilen-Stop-Regel mit vorgeschlagenem Folgeslice statt stiller Scope-Erweiterung.
- **F-R12:** Angenommen und verifiziert. Der reale Contract ist `ENGINE_API_VERSION` in `engine/config.mjs` -> `EngineAPI.getVersion()` in `engine/core.mjs` -> `REQUIRED_ENGINE_API_VERSION_PREFIX` in `balance-config.js`. Slice 07 wurde entsprechend praezisiert.
- **F-R13/F-R14:** Zur Kenntnis genommen. Die sequentielle Abnahme bleibt verbindlich; kein Slice darf aufgrund der Gesamtplanung seine lokale Fuenf-Dateien-Grenze erweitern.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| - | - | - | - | - |
| F-R01 | Gemini | Branch-Status-Widerspruch (Blocker) | abgelehnt nach Verifikation | lokaler Branch aktiv; Remote-Branch per `ls-remote` nicht vorhanden; Status praezisiert |
| F-R02 | Gemini | BALANCE\_MODULES\_README.md veraltet (Blocker) | teilweise angenommen | Review-Fakten waren veraltet; explizite 35-von-35-Inventur dennoch ergaenzt |
| F-R03 | Gemini | Floor/Flex-Split Eskalationspfad (Major) | angenommen, fachlich erledigt | Nutzerentscheid D-01 Variante A dokumentiert; Slice 01 auf Nettoentnahme-Allokation konkretisiert |
| F-R04 | Gemini | Legacy-Migrationspfad Perioden-ID (Major) | angenommen | `legacy_confirmation_required` und Baseline-Algorithmus in Slice 02 |
| F-R05 | Gemini | Atomaritaets-Definition klaeren (Major) | angenommen | fail-safe Recovery statt ACID in Hauptplan/Slice 03 |
| F-R06 | Gemini | Handelstag-Toleranzfenster (Minor) | angenommen | 27.12.-31.12. in Slice 04 |
| F-R07 | Gemini | Deflationsformel fehlt (Minor) | angenommen | Formel und Wertebereich in Slice 05 |
| F-R08 | Gemini | Scope-Ueberschneidung Slice 01/06 (Minor) | angenommen | Funktionsgrenze und Diff-Pruefung in Slice 06 |
| F-R09 | Gemini | loadExpensesStore Signatur-Break (Minor) | angenommen | Aufruferinventur und Split-Stop-Regel in Slice 09 |
| F-R10 | Gemini | minimumFlexAnnual Grenzwerte (Minor) | angenommen | Bereich und Fehlerpfad in Slice 10 |
| F-R11 | Gemini | 1 Datei fuer E2E-Tests (Minor) | angenommen | Isolation und 500-Zeilen-Stop-Regel in Slice 11 |
| F-R12 | Gemini | ENGINE\_VERSION nicht gefunden (Minor) | angenommen | realen `ENGINE_API_VERSION`-/`getVersion()`-Contract in Slice 07 dokumentiert |
| F-R13 | Gemini | Gesamtkomplexitaet | zur Kenntnis genommen | sequentielle Slice-Freigabe bleibt verbindlich |
| F-R14 | Gemini | Scope-Dateien plausibel | zur Kenntnis genommen | keine Engine-Datei im Scope |
