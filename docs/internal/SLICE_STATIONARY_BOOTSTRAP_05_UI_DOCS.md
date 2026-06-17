# Slice Stationary Bootstrap 05: UI und Doku

**Feature-Branch:** `codex/stationary-bootstrap`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Status:** freigegeben  
**Startdatum:** 2026-06-16  
**Uebergeordneter Plan:** `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`

## Ziel

Dieser Slice macht `stationary` im Simulator auswaehlbar, persistiert die Monte-Carlo-Steuerfelder, passt die Beschriftung der wiederverwendeten Blockgroesse an und dokumentiert die Methodik in der Referenzdoku. Der Slice schliesst die UI-/Doku-Arbeit fuer Stationary Bootstrap ab.

## Akzeptanzkriterien

- Die Simulationsmethode enthaelt die Option `Stationary Bootstrap`.
- Das bestehende Feld `mcBlockSize` bleibt fuer `block` aktiv und ist fuer `stationary` als erwartete Blocklaenge aktiv.
- Bei Methoden ohne Blockparameter ist `mcBlockSize` deaktiviert.
- Gespeicherte MC-Einstellungen, inklusive alter Profile ohne `stationary`, laden ohne Fehler.
- Tooltip und Label unterscheiden fixe Blockgroesse von erwarteter Blocklaenge.
- Die Referenzdoku nennt Stationary Bootstrap nicht mehr als fehlende Einschraenkung und beschreibt den Contract.
- Browser-Smoke fuer den Simulator laeuft ohne UI-Fehler.

## Scope

- `Simulator.html`
- `app/simulator/simulator-main-init.js`
- `app/simulator/monte-carlo-ui.js`
- `app/simulator/simulator-main-input-persist.js`
- `tests/simulator-ui-orchestration.test.mjs`
- `README.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`

## Nicht-Scope

- Keine Aenderung an `engine/`, `workers/`, `engine.js`, `dist/` oder Release-Artefakten.
- Keine Aenderung der bestehenden Methode `block`.
- Keine neue historische Datenquelle.
- Keine Aenderung vorhandener `node_modules`-Aenderungen.

## Git-Status Vor Start

Branch:

```text
codex/stationary-bootstrap
```

Status:

```text
 M node_modules/.package-lock.json
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Hinweis: Die `node_modules`-Aenderungen waren vor Slice-Start vorhanden und werden nicht angefasst.

## Diff-Risiko

Geplante Dateien:

- `docs/internal/SLICE_STATIONARY_BOOTSTRAP_05_UI_DOCS.md`
- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`
- `Simulator.html`
- `app/simulator/simulator-main-init.js`
- `app/simulator/monte-carlo-ui.js`
- `app/simulator/simulator-main-input-persist.js`
- `tests/simulator-ui-orchestration.test.mjs`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `README.md`

Voraussichtliche Aenderungstiefe:

- mittel

Gefaehrdete bestehende Tests:

- `tests/simulator-ui-orchestration.test.mjs`
- `tests/simulator-input-readers.test.mjs`
- `tests/simulator-monte-carlo.test.mjs`
- `tests/browser-smoke.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- bestehende `block`-Sampling-Semantik
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Geaenderte bestehende Dateien: `git checkout -- docs/internal/STATIONARY_BOOTSTRAP_PLAN.md Simulator.html app/simulator/simulator-main-init.js app/simulator/monte-carlo-ui.js app/simulator/simulator-main-input-persist.js tests/simulator-ui-orchestration.test.mjs docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- Neue Datei nach Rueckfrage entfernen: `docs/internal/SLICE_STATIONARY_BOOTSTRAP_05_UI_DOCS.md`

## Stop-Regel-Ausnahme

Die Umsetzung beruehrt mehr als 5 Dateien. Der Nutzer hat am 2026-06-16 ausdruecklich freigegeben: "Mache alles komplett in einem Step".

## Geplante Tests

- `node tests/run-single.mjs tests/simulator-ui-orchestration.test.mjs`
- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `npm run test:browser`
- `npm test`

## Durchgefuehrte Aenderungen

- `Simulator.html` enthaelt die neue Methode `stationary` mit UI-Label `Stationary Bootstrap`.
- Das Feld `mcBlockSize` hat ein eigenes Label-Element, damit die UI zwischen `Blockgroesse` und `Erwartete Blocklaenge` umschalten kann.
- `app/simulator/monte-carlo-ui.js` exportiert `initMonteCarloMethodControls()` und schaltet `mcBlockSize` fuer `block` und `stationary` aktiv, fuer Regime-Methoden deaktiviert.
- Bei `stationary` validiert `readMonteCarloParameters()` die erwartete Blocklaenge auf 1..30 und nutzt eine passende Fehlermeldung.
- `app/simulator/simulator-main-init.js` nutzt die neue MC-Methodensteuerung statt der bisherigen `block`-Speziallogik.
- `app/simulator/simulator-main-input-persist.js` persistiert die Monte-Carlo-Steuerfelder inklusive Methode, Blockparameter, RNG-Modus, Worker-Feldern, CAPE-Toggle und Startjahrgewichtung.
- `tests/simulator-ui-orchestration.test.mjs` prueft Stationary-Label, Aktivierung des Blocklaengenfelds, Tooltip und Persistenz.
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` dokumentiert Stationary Bootstrap und entfernt die alte Einschraenkung "kein Stationary Bootstrap".
- `README.md` nennt Stationary Bootstrap im Monte-Carlo-Funktionsueberblick.
- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md` markiert Slice 5 als implementiert mit Review ausstehend.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/simulator-ui-orchestration.test.mjs`
  - Ergebnis: gruen, 31 Assertions.
- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
  - Ergebnis: gruen, 35 Assertions.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - Ergebnis: gruen, 95 Assertions.
- `npm run test:browser`
  - Ergebnis: gruen; Smokes fuer `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html`, `Handbuch.html`.
- `npm test`
  - Ergebnis: gruen, 99 Testdateien, 2884 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- In-app-Browser-Pruefung ueber temporaeren lokalen Server:
  - `Simulator.html` geladen.
  - `mcMethode` enthaelt `Stationary Bootstrap`.
  - Vor Auswahl ist `mcBlockSize` fuer `regime_markov` deaktiviert.
  - Nach Auswahl `stationary` ist `mcBlockSize` aktiv, Label ist `Erwartete Blocklänge (Jahre)`, Tooltip nennt `1-30`.
  - Browser-Konsole: keine Error-Logs.

## Abweichungen Vom Plan

- Die Stop-Regel fuer mehr als 5 Dateien wurde nach ausdruecklicher Nutzerfreigabe bewusst ueberschritten, damit UI, Persistenz, Test und Doku in einem Step abgeschlossen werden.
- Die Browser-Persistenz wurde im in-app-Browser nicht ueber `localStorage` bewertet, weil die App in dieser Laufzeit ueber die Persistenz-Fassade arbeiten kann. Die Persistenz selbst ist durch den DOM-freien Orchestrierungstest gegen `persistenceStorage` abgesichert.

## Offene Risiken

- Die UI verwendet weiter das technische Feld `mcBlockSize`; bei `stationary` wird es fachlich als erwartete Blocklaenge interpretiert. Label/Tooltip mindern das UX-Risiko, aber Export-/Debug-Kontexte koennen weiterhin den technischen Namen zeigen.
- Stationary Bootstrap ist implementiert, aber noch nicht als Default-Methode festgelegt. Nutzer muessen die Methode aktiv auswaehlen.

## Rueckdokumentation

- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md` markiert Slice 5 als implementiert mit Review ausstehend.
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` beschreibt Stationary Bootstrap in der Sampling-Methodik und im Forschungsstatus.
- `README.md` wurde mit dem aktualisierten Monte-Carlo-Methodenumfang synchronisiert.

## Freigabestatus

freigegeben

## Review-Feedback von Gemini

### 1. Korrektheit
- **Erfüllung der Akzeptanzkriterien**: Alle Kriterien für Slice 5 wurden erfolgreich umgesetzt.
- **Dynamische UI-Aktualisierung**: Die Umschaltung der Beschriftung von "Blockgröße" auf "Erwartete Blocklänge (Jahre)" und die Aktualisierung des Tooltips bei Auswahl von `stationary` funktionieren in den Unit-Tests und im Browser fehlerfrei.
- **Parameter-Validierung**: Das Eingabefeld validiert bei `stationary` korrekt im Intervall 1..30.
- **Persistenz**: Alle Monte-Carlo-Eingaben werden über die Persistenz-Fassade (`simulator-main-input-persist.js`) gespeichert und beim Neuladen der Seite korrekt wiederhergestellt.

### 2. Vertragstreue
- **UI & Doku**: Die Schnittstellen und Bezeichnungen sind konsistent mit dem in Slice 1 definierten Contract.

### 3. Fehlerbehandlung
- **Abwärtskompatibilität**: Ältere Profile, die noch keinen Eintrag für `mcMethode` oder `stationary` besitzen, laden fehlerfrei durch Fallback-Werte.

### 4. Seiteneffekte
- **Modularisierung**: Die Entfernung des inline Event-Listeners in `simulator-main-init.js` und das Auslagern in `initMonteCarloMethodControls()` verbessern die Testbarkeit und Codequalität.

### 5. Was könnte brechen?
- **Technische Variablenbezeichnungen**: Das HTML-Element nutzt weiterhin die ID `mcBlockSize`. Im JSON-Export oder in Konsolen-Logs wird daher weiterhin `mcBlockSize` bzw. `blockSize` auftauchen, obwohl es sich um `expectedBlockLength` handelt. Dies ist eine bewusste und akzeptable Design-Entscheidung zur Vermeidung von Migrations-Overhead.

### 6. Dokumentations-Sync
- **README.md**: Erfolgreich aktualisiert.
- **ARCHITEKTUR_UND_FACHKONZEPT.md**: Erfolgreich aktualisiert (Stationary Bootstrap unter C.3.3 eingeführt und Einschränkungen angepasst).
- Alle relevanten Dokumente sind synchron und konsistent.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken: Geringes UX-Risiko bei Exporten, da dort weiterhin der technische Bezeichner `mcBlockSize` verwendet wird.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Benutzer importiert eine sehr alte, manuell editierte Einstellungs-JSON, die ungültige Werte für `mcMethode` enthält, was zu einem stummen Fallback im UI führt, ohne dass der Benutzer die Abweichung bemerkt.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | - | - | - |
