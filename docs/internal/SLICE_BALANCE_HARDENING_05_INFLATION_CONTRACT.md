# Slice Balance Hardening 05: Inflations-Contract

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
**Prioritaet:** P1  
**Abhaengigkeit:** Slice 02

## Ziel

Alle Inflationsquellen liefern denselben Kalenderjahres-Contract mit Timeout, Datenstand und konsistenter Behandlung negativer Inflation.

## Akzeptanzkriterien

- ECB, World Bank und OECD liefern einen Wert fuer dasselbe Zieljahr und dieselbe fachliche Kennzahl oder werden als inkompatibel verworfen.
- Ergebnis enthaelt Rate, Zieljahr, Quelle, Datenstand und Fetch-Status.
- Jeder Request besitzt Timeout und Abort-Cleanup.
- Deflation wirkt multiplikativ und konsistent: `faktorNeu = faktorAlt * (1 + rateProzent / 100)` und `bedarfNeu = bedarfAlt * (1 + rateProzent / 100)`. Fuer den bestehenden Engine-Vertrag bleibt `-10 <= rateProzent <= 50`; es gibt keine zusaetzliche Nullbegrenzung fuer negative Raten. Faktor und Bedarf muessen endlich und groesser als null bleiben.
- Bedarfe werden erst nach erfolgreicher Validierung des Ergebnisobjekts mutiert.
- Nicht verfuegbare Daten erzeugen keine Teilmutation.

## Scope

Programmdateien, maximal 3:

- `app/balance/balance-annual-inflation.js`
- `tests/balance-annual-inflation.test.mjs`
- `tests/balance-annual-workflow-contract.test.mjs`

## Nicht-Scope

- Marktdaten und CAPE;
- allgemeine Fetch-Bibliothek;
- Engine-Inflationspolitik.

## Diff-Risiko vor Start

Planungs-Branch vor Coding erneut pruefen. Fremde `node_modules`-Aenderungen nicht anfassen.  
Aenderungstiefe: **riskant**, weil Bedarf und historischer Faktor betroffen sind.  
Gefaehrdete Tests: Inflation, Annual Workflow, Spending/Guardrails indirekt.  
Nicht anfassen: `engine/`, globale Runtime-/Proxy-Konfiguration.  
Rollback: Scope-Dateien per `git checkout --`.

## Umsetzungsschritte

1. Fachliche Zielkennzahl und Zieljahr pro Quelle explizit festlegen.
2. Gemeinsamen Fetch-/Parse-Result-Contract einfuehren.
3. Timeout/Abort je Quelle implementieren.
4. Deflationsvertrag in direkter und kumulierter Fortschreibung angleichen.
5. Tests fuer positive, negative, fehlende, falsche und verspaetete Daten ergaenzen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-annual-inflation.test.mjs
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

- Falls keine Quelle dieselbe Jahreskennzahl liefert, ist eine fachliche Nutzerentscheidung erforderlich; keine automatische Mischsemantik.

## Rueckdokumentation

Inflationsdefinition und Quellenfallback im Hauptplan und in `docs/reference/DATA_SOURCES.md` dokumentieren.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

F-R07 wurde angenommen. Die multiplikative Formel, der bestehende Ratenbereich und die Endlichkeits-/Positivitaetsbedingungen sind jetzt Akzeptanzkriterium.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R07 | Hauptplan-Review | Deflationsformel fehlt | angenommen | Formel und Wertebereich ergaenzt |
