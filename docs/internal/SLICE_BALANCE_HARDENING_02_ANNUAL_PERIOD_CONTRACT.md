# Slice Balance Hardening 02: Jahresperioden-Contract

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
**Prioritaet:** P0

## Ziel

Ein DOM-freier Perioden- und Zustandsvertrag legt fest, welches Kalenderjahr abgeschlossen wird, welche Schritte geplant sind und ob ein Aufruf neu, bereits abgeschlossen oder recovery-pflichtig ist.

## Akzeptanzkriterien

- Perioden-ID ist stabil und unabhaengig vom Ausfuehrungszeitpunkt.
- Preflight und Planerstellung mutieren weder DOM noch Persistenz.
- Status mindestens: `ready`, `already_committed`, `incomplete_recovery`, `invalid`.
- Derselbe abgeschlossene Zeitraum kann nicht zweimal committed werden.
- Der Vertrag beschreibt Alter vorher/nachher, Bedarfsinflation, Marktdatenjahr und Ausgabenjahr konsistent.
- Definierte Fehlerobjekte sind fuer UI und Tests stabil.
- Legacy-State ohne Periodenmetadaten liefert `legacy_confirmation_required`, nicht automatisch `already_committed` oder `incomplete_recovery`.

## Scope

Programmdateien, maximal 2:

- neues DOM-freies Modul `app/balance/balance-annual-period.js`
- neuer Contract-Test `tests/balance-annual-period.test.mjs`

## Nicht-Scope

- noch keine Integration in Buttons oder Storage;
- keine Netzwerkabrufe;
- keine Engine-Aenderung.

## Diff-Risiko vor Start

Planungs-Branch: `codex/balance-app-hardening`; vor Coding erneut pruefen. Fremder Ausgangszustand unter `node_modules` nicht anfassen.  
Aenderungstiefe: **mittel**.  
Gefaehrdete Tests: keine direkten; Folge-Slice 03 integriert den Contract.  
Nicht anfassen: bestehende Orchestratoren, Persistenzadapter, Engine.  
Rollback: neue Dateien nach Freigabe loeschen; keine bestehenden Programmdateien geplant.

## Umsetzungsschritte

1. Perioden-ID und Zustandsuebergaenge als Datenmodell definieren.
2. Pure Funktionen fuer Preflight, Plan und Commit-Pruefung implementieren.
3. Grenzfaelle testen: Jahresmitte, Jahresanfang, wiederholter Aufruf, fehlende Metadaten, halbfertiger Commit.
4. Datenvertrag fuer Slice 03 dokumentieren.

## Legacy-Migration

- Es erfolgt keine Heuristik aus Alter, `lastInflationAppliedAtAge`, Dateinamen oder aktuellem Kalenderjahr, weil diese Werte keinen abgeschlossenen Jahresprozess beweisen.
- Beim ersten Lauf mit Legacy-State erzeugt der Preflight `legacy_confirmation_required` und schlaegt die aus Systemdatum und Eingaben abgeleitete Zielperiode nur als Vorschlag vor.
- Der Nutzer bestaetigt einmalig: Zielperiode und Status `noch nicht abgeschlossen` oder `bereits abgeschlossen`.
- `noch nicht abgeschlossen` erzeugt nur Baseline-Metadaten; der anschliessende Jahresprozess darf einmal committen.
- `bereits abgeschlossen` setzt `lastCommittedPeriod` auf die bestaetigte Periode, ohne Alter, Bedarf oder Marktdaten erneut zu mutieren.
- Abbruch laesst den Legacy-State unveraendert und blockiert den Jahresprozess.
- Pflichttests: beide Bestaetigungsvarianten, Abbruch, Wiederholung und State mit teilweise vorhandenen neuen Metadaten.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-annual-period.test.mjs
npm test
```

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Die einmalige Legacy-Bestaetigung ist eine bewusste Nutzerentscheidung; eine automatische Inferenz ist ausgeschlossen.

## Rueckdokumentation

Contract und Status in Hauptplan sowie spaeter in `docs/reference/TECHNICAL.md` nachfuehren.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

F-R04 wurde angenommen. Der Legacy-Uebergang nutzt keine unsichere Heuristik, sondern eine einmalige explizite Baseline-Bestaetigung mit `legacy_confirmation_required`.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R04 | Hauptplan-Review | Legacy-State ohne Perioden-ID | angenommen | Migrationsalgorithmus und Pflichttests ergaenzt |
