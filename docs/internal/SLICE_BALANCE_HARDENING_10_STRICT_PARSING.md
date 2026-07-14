# Slice Balance Hardening 10: Striktes Zahlen- und CSV-Parsing

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
**Prioritaet:** P2  
**Abhaengigkeit:** Slices 04, 05 und 08

## Ziel

Fachlich relevante Eingaben und CSV-Daten werden vollstaendig validiert. Teilstrings, ungueltige Kalenderdaten und unvollstaendige Zeitreihen werden nicht still als Zahl, Null oder Leerfeld akzeptiert.

## Akzeptanzkriterien

- Zahlenparser akzeptieren definierte deutsche/englische Formate nur als vollstaendigen String.
- `12abc`, mehrdeutige Separatoren, `Infinity` und leere Pflichtfelder erzeugen strukturierte Fehler.
- Gueltige Nullwerte bleiben von fehlenden/ungueltigen Werten unterscheidbar.
- CSV-Datumswerte werden auf echtes Kalenderdatum und Zieljahr geprueft.
- Markt-CSV verlangt alle fuer den Contract notwendigen Jahreswerte oder meldet exakt, welche fehlen.
- Ausgaben-CSV behandelt reservierte Objekt-Keys sicher und verwirft keine Zeilen still ohne Zusammenfassung.
- `minimumFlexAnnual` muss endlich sein und `0 <= minimumFlexAnnual <= flexBedarf` erfuellen. Negative Werte erzeugen `Mindest-Flex p.a. darf nicht negativ sein.`; Werte oberhalb `flexBedarf` erzeugen die bestehenden feldbezogenen Fehler fuer `minimumFlexAnnual` und `flexBedarf`. Bei Reject bleibt der eingegebene Wert sichtbar, Engine-Aufruf und Persistenz werden blockiert; es findet kein Clamp statt.

## Scope

Programmdateien, maximal 5:

- `app/balance/balance-utils.js`
- `app/balance/balance-binder-imports.js`
- `app/balance/balance-expenses-csv.js`
- `tests/balance-reader.test.mjs`
- `tests/balance-expenses.test.mjs`

## Nicht-Scope

- Engine-Validator aendern;
- allgemeiner CSV-Frameworkwechsel;
- Simulator-Parser.

## Diff-Risiko vor Start

Branch/Status vor Coding neu erfassen.  
Aenderungstiefe: **riskant**, weil viele bestehende Eingaben durch den gemeinsamen Parser laufen.  
Gefaehrdete Tests: Reader, Formatting, Expenses, Import, Browser Smoke.  
Nicht anfassen: Shared-Formatter sofern nicht zwingend; Engine-/Simulator-Parser.  
Rollback: Scope-Dateien per `git checkout --`.

## Umsetzungsschritte

1. Parser-Contract mit `valid/value/error` statt stiller Null definieren, ohne alle Aufrufer auf einmal zu brechen.
2. Kritische Balance-Reader-/Importpfade auf strikt umstellen.
3. Markt-CSV auf Header, Datum und historische Vollstaendigkeit pruefen.
4. Ausgaben-CSV mit Null-Prototyp-Map und Importzusammenfassung haerten.
5. Positiv-/Negativmatrix fuer deutsche und englische Formate testen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-reader.test.mjs
node tests\run-single.mjs tests\balance-expenses.test.mjs
node tests\run-single.mjs tests\formatting.test.mjs
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
npm test
npm run test:browser
```

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Der gemeinsame Parser hat mehr Aufrufer als der Slice-Scope. Wenn die kompatible Einfuehrung die Stop-Regel in `AGENTS.md` verletzt, stoppen und in zwei Slices teilen.

## Rueckdokumentation

Akzeptierte Zahlen-/CSV-Formate und Fehlermeldungen im Hauptplan dokumentieren.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

F-R10 wurde angenommen. Mindest-Flex ist endlich, nicht negativ und hoechstens gleich `flexBedarf`; Reject blockiert Engine und Persistenz ohne Clamp.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R10 | Hauptplan-Review | Mindest-Flex-Grenzen fehlen | angenommen | Wertebereich, Fehlermeldungen und Reject-Verhalten ergaenzt |
