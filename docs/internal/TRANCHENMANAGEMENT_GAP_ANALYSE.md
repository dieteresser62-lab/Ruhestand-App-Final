# Tranchenmanagement: GAP-Analyse

**Stand:** 2026-07-14
**Autor:** Codex (Bestandsaufnahme und Planentwurf, keine Review-Freigabe)
**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** nur lokal angelegt; Veröffentlichung ausstehend und nur nach Nutzerfreigabe
**Status:** freigegeben (Gemini-Review abgeschlossen, Claude-Review ausstehend)

## Zweck und Abgrenzung

Diese Analyse erfasst den Ist-Stand des Tranchenmanagements vom Manager über Profilpersistenz, Balance, Simulator und Engine bis zu Tests und Dokumentation. Sie ist die fachliche Grundlage für den [Umsetzungsplan](./TRANCHENMANAGEMENT_HARDENING_PLAN.md) und die dort verlinkten 1-basierten Slices.

Sie ist kein formales Code-Review und erteilt keine Freigabe. Gemini und Claude sollen die Befunde adversarial prüfen, ergänzen oder verwerfen. Änderungen an Produktivcode sind nicht Bestandteil dieser Planungsphase.

## Untersuchte Bereiche

- Einstieg und UI: `index.html`, `depot-tranchen-manager.html`
- Manager: `app/tranches/tranchen-manager-*.js`, `tranchen-price-service.js`
- Status und Aggregation: `app/tranches/depot-tranchen-status.js`
- Profilverbund und Persistenz: `app/profile/`, `app/shared/persistence-*`
- Balance: `app/balance/`, insbesondere Reader, Profil-Sync und Haushaltslauf
- Simulator: Profil-Merge, Portfolio-Initialisierung, Lot-Mutationen und Engine-Input
- Engine: `engine/transactions/sale-engine.mjs` und steuernahe Regressionen
- Browser- und Node-Tests sowie Coverage-Bericht
- Nutzer-, Referenz- und interne Dokumentation

## Verifizierte Baseline

| Prüfung | Ergebnis |
| --- | --- |
| Fokussierte Tranchen-Tests | 6 Dateien, 64 Assertions, 0 Fehler |
| `npm test` | 103 Testdateien, 3.405 Assertions, 0 Fehler, 0 offene Handles |
| `npm run test:browser` | alle vorhandenen Browser-Smokes grün |
| Coverage-Stand vom 2026-07-14 | Manager-Page 0 %, Depot-Status 33,91 %, State 68,42 %, Preisservice 71,96 % |
| Browserprüfung 1280 × 720 | Empty-State und Profilwerte sichtbar |
| Browserprüfung 390 × 844 | Body-Breite 953 px bei 390 px Viewport nach Anlegen einer synthetischen Tranche |
| Dialogprüfung | keine Dialogrolle, keine Fokusübernahme, Escape schließt nicht |
| Rendererprüfung | synthetische Gold-Tranche wird als „Geldmarkt“ beschriftet |

Die grüne Gesamtsuite ist kein Gegenbeleg zu den GAPs: `tests/tranchen-manager-page.test.mjs:166-170,250-259` führt seine Assertions im normalen Runner nicht aus. `tests/run-tests.mjs:111-117` wertet einen assertionslosen Import trotzdem als abgeschlossene Testdatei.

## Prioritätsdefinition

- **P0:** kann Vermögen, Steuer, Lot-Bestand, Profilherkunft oder persistierte Daten fachlich falsch behandeln.
- **P1:** kann Persistenz, Bedienablauf, Wiederanlauf oder Qualitätssicherung unzuverlässig machen.
- **P2:** erzeugt relevante Bedien-, Wartungs-, Barrierefreiheits- oder Dokumentationsdefizite ohne bereits belegte direkte Rechenverfälschung.

## GAP-Matrix

| ID | Prio | GAP | Evidenz | Auswirkung | Ziel / Slice |
| --- | --- | --- | --- | --- | --- |
| TM-01 | P0 | Kategorie und Typ sind nicht disjunkt; dieselbe Tranche kann mehrfach in der Engine-Verkaufsreihenfolge erscheinen. | Unabhängige Selects in `depot-tranchen-manager.html:530-548`; überlappende Listen in `engine/transactions/sale-engine.mjs:252-265,319-344`. | Reproduziert: Bestand 100 EUR, Bedarf 150 EUR, Breakdown 100 + 50 EUR aus derselben ID. | Kanonische Klassifikation, ungültige Paare fail-closed, eindeutige Sell-Order in Slice 02. |
| TM-02 | P0 | Es gibt keinen ausführbaren, versionierten Tranche-Contract. | `types/profile-types.js:164-180` macht alle Felder optional; `normalizeTranches()` ergänzt nur IDs (`tranchen-manager-state.js:11-19`). | Negative, nicht endliche, widersprüchliche oder doppelte Lots gelangen unterschiedlich weit in Verbraucher. | Pflichtfelder, Enums, Wertebereiche, ID- und Legacy-Regeln in Slice 02. |
| TM-03 | P0 | Marktwert, Cost Basis, TQF und Datum werden je Verbraucher anders normalisiert. | State `tranchen-manager-state.js:21-32`; Status `depot-tranchen-status.js:14-55`; Profilverbund `profilverbund-balance.js:106-167`; Simulator `simulator-portfolio-init.js:205-229`; Engine `sale-engine.mjs:193-200`. | Derselbe persistierte Datensatz kann in Manager, Balance, Simulator und Engine andere Summen oder Steuerannahmen erzeugen. | Eine Non-Mutation-Normalisierung und gemeinsame Invarianten in Slices 02, 06 und 07. |
| TM-04 | P0 | Korrupter Storage wird beim Managerstart still als leer geladen und sofort durch `[]` ersetzt. | `tranchen-manager-state.js:39-46`; `tranchen-manager-page.js:267-270`; bestehender Test fordert Überschreibung in `tranchen-manager-page.test.mjs:229-242`. | Unwiederbringlicher Tranchendatenverlust und anschließende Leerung des aktiven Profils. | Status `ok/empty/corrupt`, Quarantäne und explizite Recovery in Slice 03. |
| TM-05 | P0 | Online-Kurse besitzen keinen Währungs-, Symbol- oder Stichtagscontract, werden aber als EUR gespeichert. | `tranchen-price-service.js:62-72`; Anwendung in `tranchen-manager-page.js:226-240`; Proxy-Metadaten in `tools/yahoo-proxy.cjs:89-127` und `src-tauri/src/lib.rs:186-267`. | USD/GBP/GBp oder falsche Börsenplätze können ungeprüft als EUR-Bestand eingehen. | Quote-Objekt mit `symbol`, `price`, `currency`, `asOf`, `source`; EUR-only oder FX-Entscheidung in Slice 05. |
| TM-06 | P0 | Profilverbund-Steuerschätzung verwendet Kirchensteuer in falscher Einheit; Tranchenauswahl ignoriert TQF. | UI speichert `0.08/0.09` (`Balance.html:381-385`), `computeTaxRate()` dividiert nochmals durch 100 (`profilverbund-balance.js:86-89`); Test nutzt abweichend `9` (`profilverbund-balance.test.mjs:94-103`); Auswahl in `profilverbund-balance.js:385-406` berücksichtigt TQF nicht. | Profil- und Tranchenauswahl kann steuerlich falsch priorisiert werden. | Einheitencontract und TQF-paritätische Auswahl in Slice 06; keine neue Steuerrechtsautomatik. |
| TM-07 | P0 | `sourceProfileId` geht zwischen Simulator-Merge und Engine-Input verloren. | Setzen in `simulator-profile-inputs.js:452-469`; Weglassen in `simulator-portfolio-init.js:216-229` und `simulator-engine-direct-utils.js:103-116`. | Mehrprofil-Verkäufe können nachgelagert nicht zuverlässig dem Eigentümer zugeordnet werden. | Provenienz-End-to-End-Contract in Slice 07. |
| TM-08 | P0 | Geldmarkt kann als Detailtranche und Aggregat doppelt in das Simulator-Startvermögen eingehen. | `simulator-profile-inputs.js:326-350,562-570`; Status schreibt Tranchensumme in `geldmarktEtf` (`depot-tranchen-status.js:370-381`). | Startvermögen und Liquidität können zu hoch sein. | Technische Trennung „detailliert“ versus „ungetrancht“ und Deduplizierung in Slices 06 und 07. |
| TM-09 | P1 | Manager-Navigation hat keinen gesicherten Profil-Handoff. | Manager-Link ohne `data-profile-handoff` (`index.html:451`); Flush-Handoff nur für markierte Links (`profile-navigation.js:39-80`). | Direkt nach Profilwechsel kann der Manager ein veraltetes oder falsches Profil laden. | Flush vor Navigation, Profilidentität und BFCache-Regression in Slice 03. |
| TM-10 | P1 | Speichern ist nicht awaitbar und Flush-Fehler bleiben nur in der Konsole. | `tranchen-manager-page.js:39-43,115-133`; Import/Kursstatus melden vor bestätigter Dauerhaftigkeit. | UI kann Erfolg anzeigen, obwohl IndexedDB-/Tauri-Persistenz fehlschlug. | Sichtbarer Save-Status, bestätigter Commit und kontrollierter Retry in Slice 03. |
| TM-11 | P1 | Kursbatch ist nicht abbrechbar, nicht gegen Doppelklick geschützt und kann offline sehr lange blockieren. | Drei 8-s-Retries pro Request (`tranchen-price-service.js:42-57`); sequenzielle Ticker-/ISIN-/Search-Pfade (`tranchen-manager-page.js:177-245`). | Minutenlange UI-Blockade, konkurrierende Updates und Race bei Persistenz. | Ein Flight, Abbruch, definierte Teilerfolge und Per-Lot-Status in Slice 05. |
| TM-12 | P1 | Status-, Override- und Cross-Tab-Vertrag ist inkonsistent. | Leeres Override fällt auf Storage zurück (`depot-tranchen-status.js:61-102`); `[]` gilt gespeichert als geladen; Sync hört auf `storage` plus Polling (`:417-432`), nicht auf IndexedDB/Tauri-Ereignisse. | Falscher „FIFO aktiv“-Status, veraltete Anzeige oder Datenleck aus dem aktuellen Profil in eine leere Haushaltsauswahl. | Explizite Quelle/Empty-Semantik und Refresh-Vertrag in Slices 03 und 06. |
| TM-13 | P1 | Lot-Identität und FIFO-Gruppe sind nicht vollständig modelliert. | ID aus Zeit + Zufall (`tranchen-manager-state.js:6-9`), keine Duplikatprüfung; kein Depot-/Broker-/Instrumentgruppenfeld im Typ. | Doppelte IDs und globales FIFO über eigentlich getrennte Depots sind nicht sicher unterscheidbar. | Stabile ID-Regel; Entscheidung zu `accountId`/`instrumentId` in Slice 02. |
| TM-14 | P1 | Simulator-Verkäufe reduzieren Marktwert/Cost Basis, aber nicht Stückzahl; Käufe werden in vorhandene Lots eingemischt. | `simulator-portfolio-tranches.js:154-166,204-209,293-315`. | Nach dem ersten Verkauf/Kauf widersprechen sich Stückzahl, Preis, Marktwert, Kaufdatum und FIFO-Lot. | Lot-Mutationsinvarianten und neue Simulationslots in Slice 07. |
| TM-15 | P1 | Ausgeführte oder bestätigte reale Verkäufe werden nicht mit `depot_tranchen` reconciled. | Manager ist einziger produktiver Writer; Jahresworkflow reduziert den persistierten Lotbestand nicht (`balance-annual-orchestrator.js:95-100`). | Spätere Jahre können bereits veräußerte Bestände erneut verwenden. | Nutzerentscheidung O-09: expliziter, bestätigter und idempotenter Reconcile-Schritt in Slice 08; keine automatische Mutation. |
| TM-16 | P1 | Das Standard-Testgate kann entdeckte Dateien ohne Assertions grün melden. | Guard in `tranchen-manager-page.test.mjs:166-170,250-259`; Runner in `tests/run-tests.mjs:107-130`; Coverage Manager-Page 0 %. | Kritische Managerpfade erscheinen in der Suite abgesichert, obwohl sie nicht laufen. | Isolationsmanifest/Assertion-Gate und reproduzierbare Baseline in Slice 01. |
| TM-17 | P1 | Direkte Produktionspfade und echte End-to-End-Ketten fehlen in Tests. | `depot-tranchen-status.js` nur 33,91 %; `balance-reader.test.mjs:109-145` testet eine lokale Nachbildung; Browser-Smoke öffnet nur den Dialog (`browser-smoke.test.mjs:403-412`). | Contract-Drift zwischen Manager, Persistenz, Balance, Simulator und Engine bleibt unentdeckt. | Direkte Contract-Tests in Slices 06/07 und Browser-/Migrationsketten in Slice 09. |
| TM-18 | P1 | Profilwerte autosaven bei jedem `input`, ohne den HTML-Gültigkeitszustand als Save-Gate zu nutzen. | `tranchen-manager-page.js:65-94`; Normalisierung in `profile-asset-values.js:23-45`; mehrere Felder sind nicht Teil eines Submit-Forms. | Negative oder Zwischenwerte können während der Eingabe persistiert werden; Flush pro Tastendruck. | Validierter, debouncter Commit und sichtbarer Fehlerstatus in Slice 04. |
| TM-19 | P2 | Tranchen-Import/-Export ist toter Code und widerspricht dem zentralen Backup-Vertrag. | Funktionen/Listener `tranchen-manager-page.js:135-168,248-264`, keine Controls in `depot-tranchen-manager.html:354-359`; bewusste Entfernung in `PERSISTENCE_MIGRATION_PLAN.md:595-607`. | Phantom-Feature, unsicherer unversionierter Replace-Import und irreführende Tests/Mocks. | Reviewentscheidung: Dead Code entfernen oder fachlichen Export neu spezifizieren; Slice 03. |
| TM-20 | P2 | Renderer, Navigation, Mobilansicht und Accessibility sind unvollständig. | Gold-Defaultbadge `tranchen-manager-renderer.js:63-68`; negatives Statuspräfix `depot-tranchen-status.js:228-230`; kein Rücklink; Modal `depot-tranchen-manager.html:251-276,488-571`; Iconbuttons `tranchen-manager-renderer.js:86-89`. | Falsche Assetanzeige, horizontales Scrollen der ganzen Seite, nicht bedienbarer Dialog für Tastatur/Screenreader und erschwerte Profilorientierung. | CRUD-/A11y-/Responsive-Härtung in Slice 04; Statusvorzeichen in Slice 06. |
| TM-21 | P2 | Nutzer- und Referenzdokumentation ist veraltet und enthält sensible Beispielwerte. | `docs/guides/MULTI-TRANCHEN-ANLEITUNG.md:49-75,105-227`; veraltete Handbuchpfade `Handbuch.html:887-897,1193-1207`; Workflow-Widersprüche zu `TECHNICAL.md:173`. | Falsche Backup-, Persistenz-, FIFO- und Bedienanweisungen; Datenschutzrisiko im Repository. | Vollständige Sanitisierung und neue Tranchenreferenz in Slice 09. |
| TM-22 | P2 | Mehrfachinitialisierung und Listener-Lebenszyklus sind nicht definiert. | `tranchen-manager-page.js:248-275`; `depot-tranchen-status.js:407-432` registriert Listener/Intervall ohne gemeinsamen Dispose-Contract. | Tests, BFCache oder wiederholte Initialisierung können doppelte Handler/Polling erzeugen. | Idempotenz-/Dispose-Vertrag in Slices 03 und 09. |

## Reproduzierter P0-Fall: Doppelverkauf

Synthetischer Input:

```js
{
  trancheId: 'x',
  type: 'anleihe',
  category: 'equity',
  marketValue: 100,
  costBasis: 100,
  tqf: 0
}
```

Aktuelles Ergebnis:

```text
Sell-Order: ["x", "x"]
Breakdown bei Bedarf 150: 100 + 50 aus derselben Tranche
```

Damit ist TM-01 kein theoretisches Risiko. Die Behebung verändert das Verhalten ungültiger Engine-Inputs und fällt deshalb unter die Engine-Stop-Regel: Vor Slice 02 müssen Contract, Klassifikationsmatrix und erwartete Backtest-Auswirkung von Gemini/Claude/Nutzer bestätigt sein. Nach der Änderung sind `npm run build:engine`, die fokussierten Steuer-/Transaktionstests, `npm test` und ein Snapshot-/Backtest-Vergleich Pflicht.

## Zielinvarianten

1. Eine Tranche gehört zu genau einer Assetklasse.
2. Eine `trancheId` kommt innerhalb eines Profilbestands genau einmal vor.
3. Jede Engine-Sell-Order enthält jede Lot-ID höchstens einmal.
4. Persistierte Zahlen sind endlich; Stückzahl und Preise sind positiv, TQF liegt zwischen 0 und 1.
5. Abgeleitete Werte werden deterministisch aus einem kanonischen Input berechnet oder als explizit verifizierte Werte gekennzeichnet.
6. Korrupte Daten werden nie beim Lesen überschrieben.
7. Ein sichtbarer Save-Erfolg bedeutet, dass der Persistenz-Flush bestätigt wurde.
8. Profilherkunft bleibt vom Profilmerge bis zum Breakdown erhalten.
9. Detailtranchen und aggregierte Fallbackwerte werden nie für denselben Vermögensanteil addiert.
10. Automatische Kurse werden nur mit bestätigter Symbol-, Währungs- und Stichtagsinformation übernommen.
11. Simulator-Lotmutationen halten Stückzahl, Preise, Marktwert, Cost Basis und Kaufdatum konsistent.
12. Nutzerdokumentation enthält ausschließlich synthetische Beispiele.
13. Transiente Persistenzfehler werden nicht als korrupte Daten klassifiziert und bieten keinen Reset an.
14. Simulatoren mutieren ausschließlich tief kopierte Lots; reale Profil-/Persistenzobjekte bleiben referenziell isoliert.
15. Reale Bestände ändern sich nur durch einen separat bestätigten, idempotenten Reconcile-Schritt.

## Bereits vorhandene, weiterzuverwendende Absicherung

- Profilbezogener Bundle-Transfer und Profiltrennung in `tests/profile-storage.test.mjs`.
- Profilverbund-Aggregation, Cash-first und synthetische Fallback-Tranchen in `tests/profilverbund-balance.test.mjs`.
- Simulator-Merge mit profilpräfixierten IDs in `tests/simulator-multiprofile-aggregation.test.mjs`.
- FIFO-/Steuer-/LossCarry-Golden-Cases in `tests/depot-tranches.test.mjs`, `tests/transaction-tax.test.mjs` und Settlement-Tests.
- Zentrale Komplettbackups über die Persistenzschicht; kein stilles Wiederbeleben alter Teilbackup-Buttons.

Diese Tests werden erweitert oder als Regression-Gates verwendet; parallele Test-Doppelungen sind nicht vorgesehen.

## Nutzerentscheidungen für das Planreview

**Entschieden durch den Nutzer am 2026-07-14.** Alle zehn Entscheidungen entsprechen jeweils Möglichkeit A der Einzelvorlage.

| ID | Entscheidung | Verbindliche Festlegung | Status |
| --- | --- | --- | --- |
| O-01 | Kategorie-/Typ-Matrix | Beide Felder bleiben erhalten. Zulässig sind ausschließlich `equity ↔ aktien_alt/aktien_neu`, `bonds ↔ anleihe`, `money_market ↔ geldmarkt` und `gold ↔ gold`; andere Paare werden blockiert. | entschieden |
| O-02 | TQF | TQF wird manuell bestätigt, als Wert von `0` bis `1` validiert und dauerhaft gespeichert. Fehlende Werte werden nicht still abgeleitet oder ersetzt. | entschieden |
| O-03 | Kurswährung | Die Anwendung arbeitet ausschließlich in EUR. Nur eindeutig als EUR gekennzeichnete Quotes werden automatisch übernommen; keine FX-Konvertierung. | entschieden |
| O-04 | Korrupte Daten | Rohpayload erhalten, Verarbeitung blockieren und explizite Recovery anbieten. Transiente IO-Fehler werden getrennt behandelt und lösen keinen Reset aus. | entschieden |
| O-05 | Batch-Kursupdate | Teilerfolge übernehmen, alte Kurse bei Fehler beibehalten und den Batch mit genau einem bestätigten Persistenz-Commit abschließen. | entschieden |
| O-06 | Teilimport/-export | Toten Teilimport/-export entfernen; zentrale Komplettbackups bleiben der einzige Restore-Weg. | entschieden |
| O-07 | Profilherkunft | `sourceProfileId` beim Merge ergänzen und danach zwingend erhalten; nicht redundant in jedem profilinternen Lot speichern. | entschieden |
| O-08 | FIFO-Gruppierung | Genau ein logisches Depot je Profil. FIFO gilt nur für Lots desselben Instruments innerhalb dieses Profils; kein gemeinsamer Haushalts-FIFO-Pool. | entschieden |
| O-09 | Reconciliation | Keine automatische Realbestandsmutation. Reale Verkäufe werden ausschließlich über einen explizit bestätigten, nachvollziehbaren und idempotenten Reconcile-Schritt fortgeschrieben. | entschieden |
| O-10 | Legacy-Feld `detailledTranches` | Der bestehende Legacy-Name bleibt in diesem Vorhaben unverändert der einzige kanonische Feldname; kein Alias und keine Migration. | entschieden |

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Die GAPs erfassen die Kernprobleme (Doppelverkauf, TQF-Mismatch, Währungschaos) präzise und belegbar. Die Zielinvarianten sind logisch konsistent. Es fehlen jedoch klare Anforderungen dazu, wie ungültige Tranchendaten an den Systemgrenzen (z. B. beim Einlesen) abgefangen werden, ohne dass die gesamte Anwendung unbedienbar wird.
* **Vertragstreue:** Der Entwurf respektiert die bestehenden Schnittstellen, schafft aber ein Risiko bei der esbuild-Bündelung von `types/tranche-contract.js`. Es muss sichergestellt werden, dass dieser Contract ohne Browser-DOM-Abhängigkeiten auskommt.
* **Fehlerbehandlung:** Extrem kritischer Punkt. Bei transienten IDB-Sperren oder Tauri-Dateisystemfehlern darf korrupter Speicher nicht voreilig gelöscht werden. Die Fehlerbehandlung bei API-Kursfehlern und ungültigen Währungen ist bisher zu still geplant.
* **Seiteneffekte:** In-Memory-Mutationen im Simulator können über geteilte Objektreferenzen unbemerkt in den Haupt-UI-Thread und das State-Management lecken.
* **Was könnte brechen?** Ein stiller Fehler in der esbuild-Bündelung oder eine Objektreferenz-Mutation, die nach einer Monte-Carlo-Simulation plötzlich den echten Tranchen-Bestand im Speicher verändert, wodurch nachfolgende manuelle Speicherungen korrupte Zustände wegschreiben.

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

Ausstehend. Claude ergänzt Prüfdimensionen, Findings, Pre-Mortem und Ergebnis nach `docs/internal/SLICE_EXECUTION_RULES.md`.

## Review-Antworten von Codex

- **G-01 angenommen:** O-04 trennt `corrupt` von transientem `unavailable`. Der unveränderte Rohpayload kann nur nach bewusster lokaler Aktion angezeigt und kopiert werden; Adapter-/IO-Fehler bieten ausschließlich Retry und keinen Reset. Konkretisiert in Hauptplan und Slice 03.
- **G-02 angenommen:** Eine zwingende Deep-Copy-Grenze und Referenzisolations-Tests wurden in Slice 07 aufgenommen.
- **G-03 angenommen:** O-03/O-05 legen EUR-only, Teilerfolg, Werterhalt und sichtbare Fehlercodes je Tranche fest. Konkretisiert in Slice 05.
- **G-04 angenommen:** Strukturierte Engine-Validierungsfehler und ein kontrollierter blockierender UI-Pfad wurden in Slices 02/04 aufgenommen.

Der Blockstatus wird nicht durch Codex aufgehoben; Gemini-Nachreview und Claude-Review stehen aus.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| G-01 | Gemini | Corrupt und transiente Persistenzfehler trennen | angenommen | Plan/Slice 03 konkretisiert; Code ausstehend |
| G-02 | Gemini | Deep-Copy-Garantie für Simulator-Lots | angenommen | Slice 07 konkretisiert; Code ausstehend |
| G-03 | Gemini | Sichtbares Feedback für abgelehnte Quotes | angenommen | O-03/O-05 und Slice 05 konkretisiert; Code ausstehend |
| G-04 | Gemini | Strukturierte Engine-Validierungsfehler in der UI | angenommen | Slices 02/04 konkretisiert; Code ausstehend |
