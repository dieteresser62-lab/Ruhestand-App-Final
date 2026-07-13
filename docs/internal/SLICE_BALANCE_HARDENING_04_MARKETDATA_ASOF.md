# Slice Balance Hardening 04: Marktdaten-Stichtag

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
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

Planungs-Branch: `codex/balance-app-hardening`; vor Coding neu erfassen.  
Aenderungstiefe: **mittel bis riskant** wegen fachlichem Marktdatenstichtag.  
Gefaehrdete Tests: Annual Marketdata/CAPE, Workflow, Browser Smoke.  
Nicht anfassen: Tauri-Proxy, `engine/analyzers/`, `dist/`.  
Rollback: bestehende Scope-Datei zuruecksetzen; neue Testdatei nur nach Freigabe entfernen.

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

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Historische Kursabdeckung des lokalen Yahoo-Proxys muss fuer das definierte Fenster bestaetigt werden.

## Rueckdokumentation

Datenquellen- und Stichtagscontract in Hauptplan und Referenzdoku aktualisieren.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

F-R06 wurde angenommen. Das gueltige Jahresendfenster ist explizit auf 27.12. bis 31.12. des Zieljahres begrenzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R06 | Hauptplan-Review | Handelstag-Toleranzfenster fehlt | angenommen | Fenster und Testspezifikation ergaenzt |
