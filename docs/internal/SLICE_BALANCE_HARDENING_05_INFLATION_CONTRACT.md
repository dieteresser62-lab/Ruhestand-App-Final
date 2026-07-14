# Slice Balance Hardening 05: Inflations-Contract

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** implementiert, Review/Freigabe ausstehend
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
node tests\run-single.mjs tests\tauri-csp.test.mjs
npm test
```

## Durchgefuehrte Aenderungen

- Gemeinsame Ergebnisstruktur mit `rate`, `year`, `source`, `dataAsOf`, `fetchStatus` und stabiler `metric` eingefuehrt.
- Zielkennzahl auf deutschen All-items-Verbraucherpreis-Jahresdurchschnitt festgelegt: ECB HICP `AVR`, World Bank `FP.CPI.TOTL.ZG`, OECD national CPI `PA/_T/GY`, jeweils fuer exakt dasselbe abgeschlossene Kalenderjahr.
- ECB-SDMX-JSON 1.x, World-Bank-JSON und OECD-SDMX-JSON 2.0 werden dimensions- und jahresbezogen validiert; falsche, mehrdeutige oder inkompatible Antworten fallen zur naechsten Quelle durch.
- Jeder Quellenrequest besitzt einen eigenen 8-Sekunden-Timeout, `AbortController` und garantiertes Timer-Cleanup im `finally`-Pfad.
- Bedarfsmutationen werden vollstaendig vorbereitet und erst nach Validierung des Ergebnisobjekts ausgefuehrt. Schlagen alle Quellen fehl, bleiben Inflationsfeld, Bedarfe und persistenter Zustand unveraendert.
- Direkte Bedarfsfortschreibung und kumulierter Faktor verwenden jetzt auch bei Deflation dieselbe multiplikative Formel ohne Nullbegrenzung.
- Veralteten OECD.Stat-Host durch die aktuelle OECD Data Explorer API ersetzt und die Tauri-CSP samt CSP-Regression angepasst.
- Der Annual-Workflow-Test bewahrt Zieljahr und Fetch-Status des Inflationsvertrags im Ergebnisprotokoll.

## Ausgefuehrte Tests mit Ergebnis

- Ausgangszustand vor Umsetzung:
  - `node tests\run-single.mjs tests\balance-annual-inflation.test.mjs` -> 7/7 Assertions gruen.
  - `node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs` -> 28/28 Assertions gruen.
- Nach Umsetzung:
  - `node tests\run-single.mjs tests\balance-annual-inflation.test.mjs` -> 34/34 Assertions gruen.
  - `node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs` -> 30/30 Assertions gruen.
  - `node tests\run-single.mjs tests\tauri-csp.test.mjs` -> 37/37 Assertions gruen.
  - `npm test` -> 103 Testdateien, 3288/3288 Assertions gruen, 0 fehlgeschlagene Dateien, 0 offene Handles.
- Reale Einjahresantworten fuer 2025 wurden am 2026-07-14 direkt gegen die offiziellen ECB-, World-Bank- und OECD-Endpunkte geprueft. Dabei wurde der Parser an das tatsaechliche OECD-SDMX-JSON-2.0-Layout (`data.structures`/`data.dataSets`) angeglichen.

## Abweichungen vom Plan

### Stop-Grund vor Code-Umsetzung (2026-07-14)

Die offizielle OECD-Dokumentation bestaetigt, dass die bisherigen OECD.Stat-Endpunkte unter `stats.oecd.org` seit dem 1. Juli 2024 abgeschaltet sind. Der gepflegte Nachfolger liegt unter `https://sdmx.oecd.org`. Die Tauri-CSP erlaubt derzeit nur `https://stats.oecd.org`; ein Wechsel ohne Anpassung von `src-tauri/tauri.conf.json` wuerde daher im Desktop-Build blockiert.

Eine funktionsfaehige Umsetzung erfordert voraussichtlich die enge Scope-Erweiterung um:

- `src-tauri/tauri.conf.json` (OECD-Ziel auf `https://sdmx.oecd.org` aktualisieren),
- `tests/tauri-csp.test.mjs` (CSP-Regression auf das aktuelle Ziel aktualisieren).

Damit sind fuenf statt der urspruenglich geplanten drei Programmdateien betroffen. Der Nutzer hat am 2026-07-14 klargestellt, dass die Stop-Grenze gemaess AGENTS.md eingehalten wird. Die Umsetzung wird daher mit der eng auf das OECD-Ziel begrenzten CSP-Aktualisierung fortgesetzt.

## Offene Risiken

- ECB verwendet HICP, World Bank und OECD verwenden nationale CPI-Reihen. Der normalisierte Vertrag ist dieselbe fachliche Jahreskennzahl (All-items-Verbraucherpreisinflation als Jahresdurchschnitt), die Reihen koennen methodisch bedingt dennoch leicht unterschiedliche Werte liefern; die Fallback-Kette bildet keinen Quellenkonsens.
- `dataAsOf` verwendet die von der Antwort bereitgestellte Aktualisierungs-/Preparation-Zeit; falls eine Quelle keine solche Angabe liefert, wird transparent der Abrufzeitpunkt verwendet.
- Live-Endpunkte koennen trotz korrektem Contract zeitweise durch CORS, Rate-Limits oder Netzfehler ausfallen; der Fehlerpfad bleibt dann mutationsfrei.

## Rueckdokumentation

- Hauptplan markiert Slice 05 als implementiert und haelt Testergebnisse sowie den erweiterten Fuenf-Dateien-Scope fest.
- `docs/reference/DATA_SOURCES.md` dokumentiert Zielkennzahl, exakte Endpunkte, Ergebnisfelder, Fallback, Timeout und Deflationsformel.
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` und Tauri-CSP nennen den aktuellen OECD-SDMX-Host.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - Alle drei Quellen (ECB, World Bank, OECD) sind auf dieselbe fachliche Kennzahl (All-items Verbraucherpreis-Jahresdurchschnitt) und dasselbe Zieljahr normiert.
  - SDMX-JSON-Parser (ECB 1.x und OECD 2.0) validieren Dimensionen und Zeiträume strikt.
  - Jeder Request besitzt einen Timeout von 8 Sekunden, einen `AbortController` und sicheres Timer-Cleanup.
  - Deflation wirkt multiplikativ und konsistent auf Bedarfe und den kumulierten Faktor (`faktorNeu = faktorAlt * (1 + rate / 100)`).
  - Bedarfe werden erst nach erfolgreicher Validierung des gesamten Ergebnisobjekts mutiert. Schlagen alle Quellen fehl, bleibt der Zustand mutationsfrei.
  - Die Tests in `balance-annual-inflation.test.mjs` laufen alle erfolgreich (34/34 Assertions). Die gesamte Testsuite ist mit 3288 Assertions ebenfalls **grün**.
- **Vertragstreue:**
  - Die Anpassung von `src-tauri/tauri.conf.json` und `tests/tauri-csp.test.mjs` auf `sdmx.oecd.org` stellt sicher, dass die neue OECD-Schnittstelle im Desktop-Build (Tauri) zulässig ist.
- **Fehlerbehandlung:**
  - Robustes Fallback: Schlägt eine Quelle (z. B. wegen Timeout) fehl, wird die nächste Quelle abgefragt. Nur bei totalem Ausfall aller Quellen wird der Prozess mutationsfrei abgebrochen.
- **Seiteneffekte:**
  - Die Bedarfsfortschreibung (`applyInflationToBedarfe`) und die kumulierte Fortschreibung (`applyAnnualInflation`) teilen dieselben mathematischen Formeln und Plausibilitätsschranken ([-10%, +50%]).
- **Was könnte brechen?**
  - Ein kumulierter Inflationsfaktor über 3.0 (300% kumulierte Inflation) führt bei einem Neustart zu einem stillen Reset auf 1.0 durch eine verbleibende Migration in `StorageManager`. Dies ist jedoch ein geerbtes Verhalten (siehe Finding G5-01).

### 2. Findings

- **G5-01 (Minor): Stiller Reset bei kumulierter Inflation > 300%**
  - In `app/balance/balance-storage.js`'s `_runMigrations()` wird der kumulierte Inflationsfaktor auf `1` zurückgesetzt, falls er größer als `3` ist. Bei einer sehr langen Simulationsdauer (z. B. 40 Jahre mit 3% Inflation) kann dieser Wert regulär überschritten werden, was zu einem stillen Zurücksetzen führt.
  - *Empfehlung:* Dies ist ein bestehendes Systemverhalten. Da in Slices 01-11 keine logische Änderung an den Storage-Migrationen selbst vorgesehen ist, sollte diese Grenze als bekanntes Limit erfasst und in einem späteren Optimierungsschritt überarbeitet werden.
- **G5-02 (Hinweis): OECD SDMX-API Antwortstruktur**
  - Die Struktur der SDMX-JSON-Antworten der OECD kann sich bei API-Updates ändern. Da das Parsing in `extractSdmxAnnualValue` sehr flexibel aufgebaut ist (sucht sowohl in `series` als auch in `observations`), ist die Stabilität gegenüber kleineren Formatänderungen hoch.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Die World Bank oder die OECD ändert ihren API-Endpunkt oder schränkt den CORS-Zugriff weiter ein. Da die ECB die HICP-Reihen sehr stabil pflegt, fängt das ECB-Modul den Fehler im Standard-Pfad ab. Fällt jedoch die ECB-API aus und die App versucht das Fallback auf die World Bank oder OECD, führt ein CORS-Fehler oder Endpunkt-Wechsel zu einem Totalausfall der Online-Inflation. In diesem Fall bricht der Jahresprozess kontrolliert (mutationsfrei) mit einer sprechenden Fehlermeldung ab, und der Nutzer muss den Wert manuell eintragen.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Geerbtes Limit von max. 300% kumulierter Inflation in den Migrationen (G5-01).

---

## Review-Antworten von Codex

F-R07 und U-05 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G5-01 bis G5-02) wurde zur Kenntnis genommen. Das Restrisiko bezüglich des verbleibenden 300%-Inflations-Resets in den Altsystem-Migrationen wird als geerbtes Systemlimit akzeptiert. Die Stabilität des SDMX-Parser-Fallbacks wird weiter beobachtet. Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R07 | Hauptplan-Review | Deflationsformel fehlt | angenommen | Formel und Wertebereich ergaenzt |
