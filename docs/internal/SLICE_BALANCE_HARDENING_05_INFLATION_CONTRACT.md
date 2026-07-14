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

Programmdateien, nach Nutzerklarstellung am 2026-07-14 maximal 5 (unterhalb der Stop-Grenze in AGENTS.md):

- `app/balance/balance-annual-inflation.js`
- `tests/balance-annual-inflation.test.mjs`
- `tests/balance-annual-workflow-contract.test.mjs`
- `src-tauri/tauri.conf.json`
- `tests/tauri-csp.test.mjs`

## Nicht-Scope

- Marktdaten und CAPE;
- allgemeine Fetch-Bibliothek;
- Engine-Inflationspolitik.

## Diff-Risiko vor Start

Startcheck am 2026-07-14:

```text
git branch --show-current
codex/balance-app-hardening

git status --short
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Geplante Dateien:
- `app/balance/balance-annual-inflation.js`
- `tests/balance-annual-inflation.test.mjs`
- `tests/balance-annual-workflow-contract.test.mjs`
- `src-tauri/tauri.conf.json`
- `tests/tauri-csp.test.mjs`
- reine Rueckdokumentation in Slice-, Hauptplan- und Datenquellen-Doku

Voraussichtliche Aenderungstiefe: **riskant**, weil Bedarf und historischer Faktor betroffen sind.  
Gefaehrdete bestehende Tests: Inflation, Annual Workflow, Spending/Guardrails indirekt.  
Nicht anfassen: `engine/`, globale Runtime-/Proxy-Konfiguration ausser der eng begrenzten OECD-CSP-Aktualisierung und die fremden ungetrackten `node_modules`-Dateien.  
Rollback: Scope-Dateien und geaenderte Bestandsdokumente gezielt per `git checkout -- <datei>`; eine neu angelegte Datei duerfte nur nach Freigabe entfernt werden.

Es greift keine Stop-Regel: Branch und Contract sind eindeutig, der erweiterte Scope bleibt mit fuenf Programmdateien unter der Grenze in AGENTS.md und die geplanten Tests sind ausfuehrbar.

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

### Stop-Grund vor Code-Umsetzung (2026-07-14)

Die offizielle OECD-Dokumentation bestaetigt, dass die bisherigen OECD.Stat-Endpunkte unter `stats.oecd.org` seit dem 1. Juli 2024 abgeschaltet sind. Der gepflegte Nachfolger liegt unter `https://sdmx.oecd.org`. Die Tauri-CSP erlaubt derzeit nur `https://stats.oecd.org`; ein Wechsel ohne Anpassung von `src-tauri/tauri.conf.json` wuerde daher im Desktop-Build blockiert.

Eine funktionsfaehige Umsetzung erfordert voraussichtlich die enge Scope-Erweiterung um:

- `src-tauri/tauri.conf.json` (OECD-Ziel auf `https://sdmx.oecd.org` aktualisieren),
- `tests/tauri-csp.test.mjs` (CSP-Regression auf das aktuelle Ziel aktualisieren).

Damit sind fuenf statt der urspruenglich geplanten drei Programmdateien betroffen. Der Nutzer hat am 2026-07-14 klargestellt, dass die Stop-Grenze gemaess AGENTS.md eingehalten wird. Die Umsetzung wird daher mit der eng auf das OECD-Ziel begrenzten CSP-Aktualisierung fortgesetzt.

## Offene Risiken

- Falls keine Quelle dieselbe Jahreskennzahl liefert, ist eine fachliche Nutzerentscheidung erforderlich; keine automatische Mischsemantik.
- OECD ist ohne freigegebene CSP-/Test-Anpassung im Tauri-Build nicht ueber den aktuellen offiziellen Endpunkt erreichbar.

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
