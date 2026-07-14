# Slice Balance Hardening 04: Marktdaten-Stichtag

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** erledigt; durch Gemini freigegeben und als `a06d0bc` committed
**Prioritaet:** P0  
**Abhaengigkeit:** Slice 02

## Ziel

`endeVJ` wird ausschliesslich aus dem letzten verfuegbaren Handelstag des abgeschlossenen Kalenderjahres gebildet und zusammen mit pruefbaren Stichtagsmetadaten gespeichert.

## Akzeptanzkriterien

- Zieljahr kommt aus der Perioden-ID, nicht aus `new Date()` als Kursstichtag.
- Abruffenster umfasst Jahresende, Wochenenden und Feiertage konservativ.
- Verwendeter Kurs liegt im Zieljahr und ist der letzte gueltige Kurs bis 31.12.
- Der akzeptierte letzte Handelstag muss im Fenster 27.12. bis 31.12. des Zieljahres liegen; ein aelterer Kurs wird als unvollstaendige Jahresendversorgung abgelehnt.
- Wert, Datum, Ticker, Quelle und Zieljahr werden zurueckgegeben/persistiert.
- Zukunftsdaten, falsches Jahr, leere Quotes und unplausible Preise blockieren Nachruecken.
- ATH und `jahreSeitAth` basieren auf konsistenten Stichtagen.

## Scope

Programmdateien, maximal 2:

- `app/balance/balance-annual-marketdata.js`
- `tests/balance-annual-marketdata.test.mjs` oder Erweiterung eines bestehenden CAPE-unabhaengigen Marktdaten-Tests

## Nicht-Scope

- CAPE-Quellen;
- Inflation;
- Proxy-Architektur;
- Engine-Marktanalyse.

## Diff-Risiko vor Start

Startstatus am 2026-07-13 vor Coding:
- aktiver Branch: `codex/balance-app-hardening`;
- `git status --short`: ausschliesslich fremde untracked Playwright-Dateien unter `node_modules`;
- Basis-Commit: `ddb33ef` (`feat(balance-hardening): implement Slice 03 - Fail-safe Jahresprozess-Integration`);
- Slice 02 ist als lokaler Commit vorhanden und die Abhaengigkeit damit erfuellt;
- Nutzerauftrag zur Implementierung von Slice 04 liegt vor.

Geplante Dateien:
- `app/balance/balance-annual-marketdata.js`;
- neue Datei `tests/balance-annual-marketdata.test.mjs`;
- diese Slice-MD, der Hauptplan und die betroffenen Referenzdokumente nur zur Rueckdokumentation.

Voraussichtliche Aenderungstiefe: **mittel bis riskant**, weil ein bisher tagesaktueller und permissiver Online-Abruf auf einen fail-closed Jahresend-Stichtagscontract umgestellt wird.
Gefaehrdete bestehende Tests: Annual Marketdata/CAPE, Annual Workflow, Storage-Contract und Browser Smoke.
Nicht anfassen: CAPE- und Inflationslogik, Tauri-/Node-Yahoo-Proxy, `engine/`, `engine.js`, `dist/` sowie fremde Playwright-Dateien unter `node_modules`.
Rollback: `app/balance/balance-annual-marketdata.js` und die Dokumentationsdateien gezielt per `git checkout -- <datei>` zuruecknehmen; die neue Testdatei nur nach ausdruecklicher Freigabe entfernen.

Contract-Entscheidungen fuer die Umsetzung:
- Quelle des Zieljahres ist `annualPeriodMetadata.pendingCommit.periodId`, das Slice 03 vor dem ETF-Schritt bereits persistiert. Schema-Version, Phase `writes_started`, bestaetigte Snapshot-ID, Reihenfolge zur letzten Commit-Periode und bereits abgeschlossenes Zieljahr werden gemeinsam validiert; ein ungueltiger Kontext bricht vor Fetch und Mutation ab.
- Das Yahoo-Fenster reicht in UTC vom 27.12. des Zieljahres bis zum 01.01. des Folgejahres (exklusives `period2`); aus der Antwort wird unabhaengig von deren Reihenfolge nur der letzte finite VWCE.DE-Schlusskurs von 0,50 bis 100.000 EUR im Fenster 27.12. bis 31.12. akzeptiert.
- Stichtagsdaten werden als ISO-Datum `YYYY-MM-DD` unter einem expliziten Marktdaten-Metadatenschluessel gespeichert; der persistierte Preis entspricht dem gerundeten `endeVJ`-Wert.
- ATH und `jahreSeitAth` bleiben Jahresendbeobachtungen: Vergleich, Fortschreibung und Metadaten verwenden denselben akzeptierten Jahresendstichtag.

## Umsetzungsschritte

1. Pure Funktion fuer Zieljahr und Abruffenster extrahieren.
2. Yahoo-Antwort strikt auf den letzten gueltigen Handelstag des Zieljahres filtern.
3. Stichtagsmetadaten in Result-/State-Contract aufnehmen.
4. Jahresmitte-, 27.12.-bis-31.12.-Fenster, Wochenend-, Feiertags-, falsches-Jahr- und leere-Daten-Faelle testen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-annual-marketdata.test.mjs
node tests\run-single.mjs tests\balance-annual-cape.test.mjs
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
npm test
```

## Durchgefuehrte Aenderungen

- `createAnnualMarketDataRequest(periodId)` bildet Zieljahr, ISO-Fenster und UTC-Zeitgrenzen ausschliesslich aus `calendar-year:<YYYY>`. `period2` ist der exklusive Beginn des Folgejahres.
- `selectAnnualCloseQuote()` wertet Yahoo-Timestamps und Schlusskurse indexgleich aus, ignoriert Antwortreihenfolge und akzeptiert nur den letzten Kurs innerhalb des expliziten VWCE.DE-Plausibilitaetsbereichs von 0,50 bis 100.000 EUR vom 27.12. bis 31.12. des Zieljahres.
- `handleNachrueckenMitETF()` validiert Schema, Write-Phase, Snapshot-ID, letzte Commit-Periode und abgeschlossenes Zieljahr, prueft den Kontext nach dem asynchronen Fetch erneut und mutiert bei fehlender, gewechselter oder unvollstaendig versorgter Periode weder DOM noch Marktdatenmetadaten.
- Der Result-Contract fuehrt neben dem lokalisierten Datum jetzt `asOf`, `targetYear` und `periodId`. Der Balance-State speichert Marktdateninputs und `annualMarketDataMeta` in demselben Write; enthalten sind Schema-Version, Perioden-ID, Zieljahr, gerundeter `endeVJ`-Preis, ISO-Stichtag, Ticker, Quelle und die am selben Stichtag ausgewerteten ATH-Daten.
- Wirft ein nachgelagerter Schritt nach begonnener DOM-Mutation, stellt der Handler Marktdatenfelder und den persistenten Zustand auf den Stand unmittelbar vor dem ETF-Schritt zurueck; der uebergeordnete Jahresprozess behaelt zusaetzlich seinen Recovery-Snapshot.
- ATH-Gleichstand setzt `jahreSeitAth` wie der manuelle Pfad auf null, behauptet aber kein neues ATH. Ein niedrigerer Jahresendkurs erhoeht die Jahreszahl genau einmal.
- Quellenloses manuelles Nachruecken invalidiert veraltete Online-Stichtagsmetadaten; Undo stellt Marktfelder und den vorherigen Metastand gemeinsam wieder her.
- Die neue CAPE-unabhaengige Contract-Testdatei deckt reine Fenster-/Parserfaelle sowie Handler-, Persistenz-, ATH-, Undo- und Fail-closed-Integration ab.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\balance-annual-marketdata.test.mjs`: 72/72 Assertions, 0 Fehler.
- `node tests\run-single.mjs tests\balance-annual-cape.test.mjs`: 13/13 Assertions, 0 Fehler.
- `node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs`: 28/28 Assertions, 0 Fehler.
- `npm test`: 103 Testdateien, 3258/3258 Assertions, 0 Fehler, 0 offene Handles.
- Der Headless-Backtest 2000-2025 blieb bei 416.201 EUR.
- `npm run test:browser`: `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html` und `Handbuch.html` gruen.
- `git diff --check`: erfolgreich, keine Whitespace-Fehler.

## Abweichungen vom Plan

- Keine Scope- oder Dateizahlabweichung: geaendert wurden das vorgesehene Quellmodul und die neu angelegte, vorgesehene Testdatei.
- Die Perioden-ID wird ohne zusaetzliche Orchestrator-Datei aus `annualPeriodMetadata.pendingCommit.periodId` gelesen, weil Slice 03 diesen Marker vor dem ETF-Schritt bereits fail-safe persistiert.
- Der bestehende gerundete `endeVJ`-Vertrag bleibt erhalten. Der persistierte Metadatenpreis entspricht deshalb bewusst dem UI-/Engine-Wert und nicht einem zusaetzlichen ungerundeten Rohkurs.
- Zusaetzlich zur Online-Route wurden manueller Nachrueck- und Undo-Pfad innerhalb derselben Scope-Datei auf Metadatenkonsistenz gebracht.

## Offene Risiken

- Historische Kursabdeckung des lokalen Yahoo-Proxys muss fuer das definierte Fenster bestaetigt werden.
- Die Tests verwenden deterministische Yahoo-Payloads. Eine reale historische Online-Abfrage war nicht Bestandteil der automatisierten Suite; Upstream-Verfuegbarkeit bleibt damit ein Betriebsrisiko.
- Legacy-Zustaende besitzen bis zum ersten erfolgreichen periodengebundenen ETF-Abruf keine `annualMarketDataMeta`. Der neue Online-Pfad erzeugt sie; der restliche Lese-/Engine-Pfad bleibt rueckwaertskompatibel.
- Ein direkter Aufruf des Online-Handlers ausserhalb des laufenden Snapshot-/Perioden-Coordinators wird absichtlich vor dem Fetch blockiert.
- Der feste Preisbereich ist absichtlich sehr breit, aber tickerbezogen. Eine spaetere Notierungswaehrungs- oder Anteilsklassenumstellung ausserhalb von 0,50 bis 100.000 EUR erfordert eine bewusste Contract-Anpassung statt stiller Uebernahme.

## Rueckdokumentation

Der Status und Teststand sind im Hauptplan zurueckdokumentiert. `README.md`, `docs/reference/TECHNICAL.md` und `docs/reference/BALANCE_MODULES_README.md` beschreiben jetzt Jahresendfenster, Periodenquelle, Persistenzschluessel und Fail-closed-Verhalten.

## Freigabestatus

Gemini hat die Implementierung ohne Blocker freigegeben; lokaler Abschluss-Commit: `a06d0bc`.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - Das Zieljahr wird nun korrekt aus der Perioden-ID (`annualPeriodMetadata.pendingCommit.periodId`) abgeleitet und nicht mehr über das aktuelle Systemdatum (`new Date()`).
  - Die ETF-Abfrage via Yahoo Finance wird auf das feste UTC-Fenster [27.12. - 31.12.] des Zieljahres eingegrenzt (`selectAnnualCloseQuote`).
  - Die Plausibilitätsgrenzen des Kurses sind auf [0,5 - 100.000] EUR gesetzt. Ungültige Kurse, leere Quotes, Wochenend-Gaps und Zukunftsdaten werden fehlerfrei behandelt.
  - Stichtagsmetadaten (`annualMarketDataMeta`) inklusive Ticker, Quelle, Datum und ATH-Auswertung werden atomar mit den Marktdaten-Inputs persistiert.
  - Die Tests in `balance-annual-marketdata.test.mjs` laufen alle erfolgreich (72/72 Assertions). Die gesamte Testsuite ist mit 3258 Assertions ebenfalls **grün**.
- **Vertragstreue:**
  - Die Härtung erfolgt ohne Änderung der Engine-Schnittstelle. Die Stichtagsmetadaten ergänzen den Zustand abwärtskompatibel.
- **Fehlerbehandlung:**
  - Abbrüche vor dem Fetch verhindern jegliche Mutation der Live-Daten.
  - Bei Fehlern nach der DOM-Mutation (z. B. im nachgelagerten Inflationsschritt) wird ein lokales Rollback der DOM-Inputs und des persistenten Zustands durchgeführt (`rollbackContext`).
- **Seiteneffekte:**
  - Manuelles Nachrücken und Undo-Nachrücken wurden synchronisiert, um veraltete Online-Metadaten sicher zu invalidieren bzw. wiederherzustellen.
- **Was könnte brechen?**
  - Falls das Schreiben des Rollback-Zustands fehlschlägt (z. B. Quota-Fehler), stünden DOM und persistent Zustand im Mismatch. Dies wird jedoch durch den übergeordneten Recovery-Snapshot von Slice 03 abgefangen.

### 2. Findings

- **G4-01 (Minor): Unbehandelter Fehlerpfad bei fehlschlagendem Rollback-Flush**
  - Tritt nach einem Fehler im Update-Prozess beim lokalen Rollback ein Fehler in `StorageManager.saveState` auf (z. B. Quota-Limit erreicht), wird der Catch-Block stumm fortgesetzt. Der Zustand im persistenten Speicher bliebe mutiert, während die DOM-Inputs zurückgerollt sind.
  - *Empfehlung:* Da der übergeordnete fail-safe Orchestrator in diesem Fall ohnehin ein `incomplete_recovery` setzt und die Wiederherstellung des Snapshots erzwingt, ist dieses Verhalten tolerierbar, sollte aber dokumentarisch als bekanntes Restrisiko erfasst werden.
- **G4-02 (Minor): Hartcodierter ETF-Ticker**
  - Der Ticker `VWCE.DE` ist fest im Handler hinterlegt. Ein Wechsel der Anteilsklasse oder des Anbieters ist ohne Codeänderung nicht möglich.
  - *Empfehlung:* Entspricht dem Projekt-Scope ("keine neue Datenquelle ohne eigenen Review").

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Yahoo Finance ändert das Antwortformat oder die API-Schnittstelle. Da der lokale Proxy die Rohdaten an die App durchreicht, schlägt die Validierung in `selectAnnualCloseQuote` aufgrund fehlender Felder (`chart.result`) oder geänderter Zeitstempel-Formate fehl. Der Jahresabschluss wird mit einer Fehlermeldung abgebrochen. Der Nutzer ist gezwungen, das Nachrücken manuell oder über den Ausgaben-Check-CSV-Import durchzuführen.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Abhängigkeit vom Recovery-Snapshot bei fehlschlagendem partiellem Rollback-Flush (G4-01).

---

## Review-Antworten von Codex

F-R06 und U-04 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G4-01 bis G4-02) wurde zur Kenntnis genommen und die Restrisiken bezüglich partiellem Rollback-Flush werden akzeptiert, da sie durch den globalen Commit-Recovery-Snapshot aus Slice 03 abgesichert sind. Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R06 | Hauptplan-Review | Handelstag-Toleranzfenster fehlt | angenommen | Fenster und Testspezifikation ergaenzt |
| U-04 | Nutzer | Slice 04 implementieren | angenommen | Implementierung, Tests und Rueckdokumentation abgeschlossen; Review ausstehend |
