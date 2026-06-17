# Slice: Regime Smoothing 02 - Signal Module

**Stand:** 2026-06-15  
**Feature-Branch:** `codex/regime-uebergaenge-glaetten`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`  
**Status:** implementiert, Review ausstehend

## Ziel

Slice 2 erweitert den DOM-freien Contract aus Slice 1 zu einem nutzbaren Signal-Snapshot und verdrahtet ihn rein additiv im `MarketAnalyzer`. Diskrete Regime-Labels bleiben unveraendert; es werden nur neue Diagnose-/Signalwerte ausgegeben.

## Akzeptanzkriterien

- `MarketAnalyzer.analyzeMarket()` liefert weiterhin dieselben diskreten Regime-Labels fuer bestehende Testfaelle.
- Neue Felder fuer `regimeSignalSeverities`, `regimeSmoothingFactors` und `regimeSmoothingApplied` sind additiv und DOM-frei.
- Nicht-finite Rohwerte werden nicht als `NaN`/`Infinity` in Diagnosepayloads weitergereicht.
- Die Signalrichtung aus dem Contract bleibt in den Faktoren sichtbar, insbesondere `runwaySeverity.scale === 'descending'`.
- Keine Aenderung an Transaktions-, Guardrail-, Spending- oder UI-Semantik.

## Scope

- `engine/analyzers/regime-signals.mjs`
- `engine/analyzers/MarketAnalyzer.mjs`
- `tests/regime-signals.test.mjs`
- `tests/market-analyzer.test.mjs`
- Slice- und Plan-Dokumentation

## Nicht-Scope

- Keine Zielwert-Interpolation in Transaktionen oder Guardrails.
- Keine UI-/Copytext-Aenderung.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.
- Keine Bereinigung vorbestehender `node_modules`- oder Plan-Dateien.

## Branch- und Statuscheck vor Coding

`git branch --show-current`:

```text
codex/regime-uebergaenge-glaetten
```

`git status --short`:

```text
 M docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md
 M node_modules/.package-lock.json
?? docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md
?? docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md
?? docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md
?? docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md
?? docs/internal/SLICE_REGIME_SMOOTHING_01_CONTRACT.md
?? docs/internal/STATIONARY_BOOTSTRAP_PLAN.md
?? engine/analyzers/regime-signals.mjs
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
?? tests/regime-signals.test.mjs
```

Hinweis: Die Git-Warnung zu `C:\Users\Diete/.config/git/ignore` ist eine lokale Leserechtswarnung und nicht Teil des Slice-Scopes.

## Diff-Risiko-Block

Geplante Dateien:

- `engine/analyzers/regime-signals.mjs`
- `engine/analyzers/MarketAnalyzer.mjs`
- `tests/regime-signals.test.mjs`
- `tests/market-analyzer.test.mjs`
- `docs/internal/SLICE_REGIME_SMOOTHING_02_SIGNAL_MODULE.md`
- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`

Voraussichtliche Aenderungstiefe:

- mittel; additive Engine-Diagnosefelder, keine operative Zielwertaenderung.

Gefaehrdete bestehende Tests:

- `tests/market-analyzer.test.mjs`, weil der Analyzer-Return erweitert wird.
- `tests/regime-signals.test.mjs`, weil der Contract um Snapshot-Metadaten erweitert wird.

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- Transaktions-/Guardrail-/Spending-Pfade
- UI-Module
- vorbestehende `node_modules`-Aenderungen

Rollback-Strategie:

- `git checkout -- engine/analyzers/MarketAnalyzer.mjs tests/market-analyzer.test.mjs`
- Aenderungen in den untracked Slice-1-Dateien gezielt zuruecknehmen; neue Slice-2-Datei nur nach Freigabe entfernen.

## Geplante Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs`
- `node tests/run-single.mjs tests/market-analyzer.test.mjs`
- `npm run build:engine`

## Durchgefuehrte Aenderungen

- `engine/analyzers/regime-signals.mjs` um `buildRegimeSignalSnapshot()` erweitert.
- Snapshot-Payload liefert pro Signal:
  - Severity,
  - Quelle,
  - Rohwert oder `null` bei nicht-finiten Werten,
  - gerundete Severity-Prozent,
  - Stuetzwerte,
  - Skalenrichtung,
  - Hard-Boundary-Marker.
- `calculateRegimeSignalSeverities()` nutzt intern denselben definitionsbasierten Rechenpfad wie der Snapshot.
- `MarketAnalyzer.analyzeMarket()` gibt additiv `regimeSignalSeverities`, `regimeSmoothingFactors` und `regimeSmoothingApplied` zurueck.
- Bestehende diskrete Regime-Labels und CAPE-Bewertung bleiben unveraendert.
- Tests fuer Snapshot-Metadaten, nicht-finite Rohwerte und additive MarketAnalyzer-Felder ergaenzt.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 45 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/market-analyzer.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 13 bestanden, 0 fehlgeschlagen
- `npm run build:engine`
  - Ergebnis: bestanden
  - Hinweis: Fallback-Build ohne `esbuild`; kein `engine.js` im Git-Status.
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 91
  - Assertions: 2342 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- Keine fachliche Abweichung.
- Die Rueckdokumentation im uebergeordneten Plan fuehrt dazu, dass zusammen mit der Slice-MD sechs Dateien im Slice-Scope geaendert wurden. Der fachliche Code-Scope bleibt auf zwei Engine-Dateien plus zwei Testdateien begrenzt.

## Offene Risiken

- Runway-Severity wird im `MarketAnalyzer` noch nicht mit realer Runway befuellt, weil dieser Wert dort nicht vorliegt. Die absteigende Runway-Skala bleibt im DOM-freien Snapshot-API und in Unit-Tests abgesichert.

## Rueckdokumentation

- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md` wurde auf Slice-2-Implementierungsstand aktualisiert.

## Freigabestatus

Freigegeben. Das Review am 2026-06-15 durch Gemini war erfolgreich.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-02 | Gemini | Unvollstaendiges Contract-Eingabe-Objekt bei benutzerdefinierter Uebergabe kann stumme Ausfaelle der Glaettung bewirken. | Robuste Defensivpruefungen (`Number.isFinite`, optional chaining) fangen unvollstaendige Contracts ab; die Diagnose meldet dann stumm Nullwerte. Dies ist fuer Version 1 ein sicheres Fallback-Design. | erledigt: Absicherung im Modul `regime-signals.mjs` integriert. |

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Stummes Versagen bei Custom-Contracts:* Wenn ein fehlerhaft strukturiertes Contract-Objekt uebergeben wird, faellt das System lautlos auf standardmaessige Null-Stress-Werte zurueck, was im Produktivbetrieb unbemerkt bleiben koennte. Die UI/Diagnose-Anzeige muss dies in Slice 4 explizit visualisieren.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein neuer stochastischer Pfaduebergang im Simulator wird ohne `DrawdownPct` oder `capeRatio` in den inputs aufgerufen, wodurch die neu eingefuehrte Signal-Diagnose leere Null-Faktoren liefert und der darauf aufbauende Interpolationspfad fuer Zielwerte stumm inaktiv bleibt.
