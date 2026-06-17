# Slice: Regime Smoothing 04 - Diagnosis UI

**Stand:** 2026-06-15  
**Feature-Branch:** `codex/regime-uebergaenge-glaetten`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`  
**Status:** implementiert, Review ausstehend

## Ziel

Slice 4 macht die in Slice 3 eingefuehrte Runway-Zielglaettung in Diagnose, Copytext und Simulator-Logs sichtbar. Nutzer sollen erkennen, ob ein Zielwert aus einem diskreten Profilwert, einer aktiven Interpolation oder einem Fallback stammt.

## Akzeptanzkriterien

- Balance-Diagnose zeigt geglaettete Runway-Ziele mit Rohziel, effektivem Ziel, Severity und Stuetzwerten.
- Copytext nennt Rohziele, Severity und harte Mindestgrenzen.
- Fallbacks bei unvollstaendigen Profildaten sind sichtbar und werden nicht als aktive Glattung ausgegeben.
- Simulator-Detail-Logs enthalten maschinenlesbare Felder fuer rohes Ziel, geglaettetes Ziel, Severity, Fallback und harte Mindestgrenze.
- Bestehende Ziel-Liquiditaetsberechnung bleibt fuer bestehende Aufrufer als Zahl verfuegbar.

## Scope

- `engine/analyzers/regime-signals.mjs`
- `engine/transactions/transaction-utils.mjs`
- `engine/transactions/TransactionEngine.mjs`
- `engine/core.mjs`
- `app/balance/balance-utils.js`
- `app/balance/balance-diagnosis-chips.js`
- `app/balance/balance-diagnosis-keyparams.js`
- `app/balance/balance-binder-diagnosis.js`
- `app/simulator/simulator-year-result.js`
- `app/simulator/simulator-results.js`
- `app/simulator/simulator-main-helpers.js`
- fokussierte Tests
- Slice- und Plan-Dokumentation

## Nicht-Scope

- Keine Aenderung der Regime-Klassifikation.
- Keine Aenderung harter Notfallgrenzen, Mindest-Runway-Logik oder Guardrail-Aktivierung.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.
- Keine Bereinigung vorbestehender `node_modules`-Aenderungen.

## Branch- und Statuscheck vor Coding

`git branch --show-current`:

```text
codex/regime-uebergaenge-glaetten
```

`git status --short`:

```text
 M docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md
 M engine/analyzers/MarketAnalyzer.mjs
 M engine/config.mjs
 M engine/transactions/transaction-utils.mjs
 M node_modules/.package-lock.json
 M tests/market-analyzer.test.mjs
?? docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md
?? docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md
?? docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md
?? docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md
?? docs/internal/SLICE_REGIME_SMOOTHING_01_CONTRACT.md
?? docs/internal/SLICE_REGIME_SMOOTHING_02_SIGNAL_MODULE.md
?? docs/internal/SLICE_REGIME_SMOOTHING_03_ENGINE_TARGETS.md
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

- siehe Scope

Voraussichtliche Aenderungstiefe:

- mittel; Engine-Zielwert bleibt numerisch kompatibel, neue Diagnose-Metadaten werden additiv durchgereicht.

Gefaehrdete bestehende Tests:

- `tests/regime-signals.test.mjs`
- `tests/balance-diagnosis-*.test.mjs`
- `tests/simulation.test.mjs`
- Simulator-/Worker-Log-Paritaet, weil Logzeilen neue additive Felder erhalten.

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- vorbestehende `node_modules`-Aenderungen
- fachliche Guardrail-/Notfall-Semantik

Rollback-Strategie:

- `git checkout -- engine/analyzers/regime-signals.mjs engine/transactions/transaction-utils.mjs engine/transactions/TransactionEngine.mjs engine/core.mjs app/balance/balance-utils.js app/balance/balance-diagnosis-chips.js app/balance/balance-diagnosis-keyparams.js app/balance/balance-binder-diagnosis.js app/simulator/simulator-year-result.js app/simulator/simulator-results.js app/simulator/simulator-main-helpers.js tests/regime-signals.test.mjs tests/balance-diagnosis-chips.test.mjs tests/balance-diagnosis-keyparams.test.mjs tests/balance-diagnosis-copy-contract.test.mjs tests/simulation.test.mjs docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`
- neue Slice-4-Datei nur nach Freigabe gezielt entfernen.

## Scope-Ausnahme

Die Agent-Stop-Regel zu mehr als 5 geaenderten Dateien wurde vor Umsetzung ausgeloest. Der Nutzer hat am 2026-06-15 explizit freigegeben: "Setze ihn komplett um".

## Geplante Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-chips.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-keyparams.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-copy-contract.test.mjs`
- `node tests/run-single.mjs tests/simulation.test.mjs`
- `npm run build:engine`
- `npm test`

## Durchgefuehrte Aenderungen

- `calculateTargetLiquidityDetails()` ergaenzt; `calculateTargetLiquidity()` bleibt als kompatibler Zahlen-Wrapper erhalten.
- Runway-Ziel-Diagnose erfasst jetzt `smoothingActive`, `smoothingApplied`, `smoothingFallback`, Fallback-Grund, Rohziel, effektives Ziel, Stuetzziele, Severity und harte Mindestgrenze.
- Engine-Diagnose schreibt die neuen Felder nach `diagnosis.general.runwayTargetSmoothing`, `diagnosis.general.regimeSmoothingFactors` und `diagnosis.keyParams.runwayTargetSmoothing`.
- Diagnose-Guardrail `Runway (vs. Ziel)` zeigt den effektiven Ziel-Schwellenwert, damit Statusblock und Guardrail-Liste nicht widerspruechlich werden.
- Balance-Diagnose-Chips, Key-Parameter und Copytext erklaeren geglaettete Runway-Ziele mit Rohziel, Severity, Stuetzwerten und harter Mindestgrenze.
- Smoothing-Fallbacks werden als Fallback ausgewiesen, nicht als angewandte Glattung.
- Simulator-Logzeilen und Detailtabellen enthalten additive Felder fuer `RunwayTargetRawMonths`, `RunwayTargetSmoothedMonths`, `RunwayTargetSmoothingApplied`, `RunwayTargetSmoothingFallback`, `RunwayTargetSeverityPct` und `RunwayTargetHardMinMonths`.
- `UIUtils.getThreshold()` toleriert DOM-freie Node-Kontexte ohne `window`.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 64 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/balance-diagnosis-chips.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 16 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/balance-diagnosis-keyparams.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 25 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/balance-diagnosis-copy-contract.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 16 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulation.test.mjs`
  - Ergebnis: bestanden
  - Hinweis: Datei nutzt lokale Assertions ausserhalb des Runner-Counters; Testdatei lief fehlerfrei.
- `npm run build:engine`
  - Ergebnis: bestanden
  - Hinweis: Fallback-Build ohne `esbuild`; kein `engine.js` im finalen Git-Status.
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 91
  - Assertions: 2369 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- Die Simulator-Log-Transparenz wurde nicht nur als Rohdatenfeld, sondern auch in den bestehenden Detailtabellen sichtbar gemacht.
- Mehr als 5 Dateien wurden geaendert; diese Scope-Ausnahme wurde vorab durch den Nutzer freigegeben.

## Offene Risiken

- Die neue Anzeige erklaert den geglaetteten Zielmonatswert. Die Euro-Ziel-Liquiditaet kann wegen Flex-Anteil, ATH-Skalierung und Rundung weiterhin vom Monatswert abgeleitet, aber nicht exakt im UI herleitbar sein.
- Das Feature-Flag fuer Zielwert-Glattung bleibt per Default deaktiviert; die neue UI-Transparenz ist erst bei aktivierter Glattung fachlich sichtbar.
- Vorbestehende uncommitted Dateien aus frueheren Slices und `node_modules` bleiben im Arbeitsbaum und muessen vor Review/Commit separat gegen den Gesamtscope geprueft werden.

## Rueckdokumentation

- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md` wurde auf Slice-4-Implementierungsstand aktualisiert.

## Freigabestatus

Freigegeben. Das Review am 2026-06-15 durch Gemini war erfolgreich.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-04 | Gemini | Starke Kopplung der UI-Binder und Simulator-Logger an die genaue Namensgebung und Struktur der `runwayTargetSmoothing`-Diagnosemetadaten. Ein zukuenftiges Refactoring der Diagnosefelder in der Engine wuerde stumm zu leeren Logzeilen und fehlenden UI-Informationen fuehren. | Die Paritaetstests (`tests/balance-diagnosis-*.test.mjs` und `tests/regime-signals.test.mjs`) wurden so ausgebaut, dass sie die Feldnamen auf Vorhandensein und Typen pruefen. Das minimiert das Drift-Risiko wirksam. | erledigt: Umfassende Absicherung in den Assertions der Testdateien integriert. |

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Format-Drift:* Struktur- oder Namensänderungen an den Diagnosefeldern der Engine werden zwar von der Engine selbst toleriert, fuehren aber zu fehlenden Anzeigen im UI und in den Simulator-Protokollen. Die Testabdeckungen fangen dies jedoch ab.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein Entwickler aendert das Feld `smoothingFallback` in der Engine in `isSmoothingFallback`. Die UI-Binder koennen den Wert nicht mehr auslesen, weshalb das UI bei unvollstaendigen Profilen faelschlicherweise "Keine Glaettung" anstelle von "Runway-Glaettung im Fallback" anzeigt.
