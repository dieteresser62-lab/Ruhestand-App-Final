# Slice Longevity 05: Optimizer Docs

**Stand:** 2026-06-16  
**Status:** freigegeben  
**Autor:** Codex  
**Paket:** 5 - Doku und Vergleich  
**Slice:** 5 - Optimizer-Grenzen, Vergleichsreport, Doku-Sync  
**Feature-Branch:** `codex/langlebigkeitsmodell-konservativer`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

## Ziel

Dieser Slice schliesst das Langlebigkeitsmodell fuer Version 1 ab. Longevity bleibt ein bewusst gesetzter Sicherheitsparameter und wird nicht durch Sweep oder Auto-Optimize als freie Optimierungsvariable veraendert. Zusaetzlich dokumentiert der Slice eine kleine Vergleichsauswertung fuer 0, +2 und +5 Jahre fixen Puffer.

## Akzeptanzkriterien

- Auto-Optimize bietet `longevityMode`, `longevityQuantileShift`, `longevityRelativePct` und `longevityBufferYears` nicht als waehlbare Parameter an.
- Auto-Optimize-Champion-Apply kann Longevity-Felder nicht ueberschreiben.
- Sweep uebernimmt Longevity-Werte aus den Basisinputs, variiert sie aber nicht pro Kombination.
- Vergleichsreport 0 vs. +2 vs. +5 Jahre ist dokumentiert.
- Der uebergeordnete Arbeitsplan ist auf Slice-5-Status aktualisiert.

## Scope

- Neuer fokussierter Contract-Test fuer Optimizer-/Sweep-Grenzen.
- Slice-Dokumentation mit Vergleichsreport.
- Rueckdokumentation im Arbeitsplan.

## Nicht-Scope

- Keine neue Auto-Optimize- oder Sweep-UI.
- Keine Aufnahme von Longevity in Optimizer-/Sweep-Parameterlisten.
- Keine Aenderung an Engine-, Runner- oder Worker-Semantik.
- Keine Aenderung an generierten Artefakten (`engine.js`, `dist/`, `RuheStandSuite.exe`).
- Keine Bereinigung vorbestehender `node_modules`-Aenderungen.

## Branch- und Statuscheck vor Coding

`git branch --show-current`:

```text
codex/langlebigkeitsmodell-konservativer
```

`git status --short`:

```text
 M Balance.html
 M Simulator.html
 M app/balance/balance-binder-diagnosis.js
 M app/balance/balance-reader.js
 M app/simulator/monte-carlo-runner.js
 M app/simulator/simulator-backtest.js
 M app/simulator/simulator-input-strategy.js
 M app/simulator/simulator-main-dynamic-flex.js
 M app/simulator/simulator-main-input-persist.js
 M app/simulator/simulator-profile-inputs.js
 M docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md
 M engine/core.mjs
 M engine/validators/InputValidator.mjs
 M node_modules/.package-lock.json
 M tests/balance-diagnosis-copy-contract.test.mjs
 M tests/worker-parity.test.mjs
?? app/simulator/dynamic-flex-longevity-contract.js
?? app/simulator/dynamic-flex-longevity-horizon.js
?? app/simulator/dynamic-flex-runner-horizon.js
?? docs/internal/SLICE_LONGEVITY_01_CONTRACT.md
?? docs/internal/SLICE_LONGEVITY_02_HORIZON_MODULE.md
?? docs/internal/SLICE_LONGEVITY_03_ENGINE_RUNNER.md
?? docs/internal/SLICE_LONGEVITY_04_UI_PERSISTENCE.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
?? tests/longevity-contract.test.mjs
?? tests/longevity-engine-runner.test.mjs
?? tests/longevity-horizon.test.mjs
?? tests/longevity-ui-persistence.test.mjs
```

Hinweis: Die Slice-01/02/03/04-Aenderungen sind noch uncommitted und werden nicht zurueckgesetzt. Die `node_modules`-Aenderungen bestanden vor Slice-Beginn und liegen ausserhalb dieses Slice-Scopes.

## Diff-Risiko

Geplante Dateien:

- `tests/longevity-optimizer-docs.test.mjs`
- `docs/internal/SLICE_LONGEVITY_05_OPTIMIZER_DOCS.md`
- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

Voraussichtliche Aenderungstiefe:

- klein; keine Runtime-Semantik wird geaendert.

Gefaehrdete bestehende Tests:

- `tests/auto-optimizer.test.mjs`
- `tests/simulator-sweep.test.mjs`
- `tests/longevity-engine-runner.test.mjs`

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- Auto-Optimize-/Sweep-Parameterlisten fuer Longevity
- bestehende `node_modules`-Aenderungen

Rollback-Strategie:

- `tests/longevity-optimizer-docs.test.mjs` und diese Slice-Datei nach Freigabe gezielt entfernen.
- Rueckdokumentation im Arbeitsplan gezielt zuruecknehmen.

## Geplante Tests

- `node tests/run-single.mjs tests/longevity-optimizer-docs.test.mjs`
- `node tests/run-single.mjs tests/auto-optimizer.test.mjs`
- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
- `node tests/run-single.mjs tests/longevity-engine-runner.test.mjs`
- `npm run build:engine`
- `npm test`

## Vergleichsreport

Referenzhaushalt:

- Single, Alter 65, Dynamic-Flex aktiv.
- Startvermoegen MC: 900.000 EUR, davon 80.000 EUR Liquiditaet.
- Floor/Flex: 24.000 EUR / 12.000 EUR.
- Historische Blocksimulation, 120 Runs, 30 Jahre, Seed `90210`.
- Vergleich variiert nur `longevityMode='buffer_years'` mit 0, 2 und 5 Jahren.

Single-Year-VPW-Vergleich mit festem 30-Jahre-Horizont:

| Puffer | Effektivhorizont | VPW-Rate |
|---|---:|---:|
| 0 Jahre | 30 | 5,235% |
| +2 Jahre | 32 | 5,039% |
| +5 Jahre | 35 | 4,791% |

Monte-Carlo-Vergleich mit jahrweise neu berechnetem Runner-Horizont:

| Puffer | Raw/Effektivhorizont im ersten Logjahr | VPW-Rate erstes Logjahr | Flex freigegeben erstes Logjahr | Erfolgswahrscheinlichkeit | P10-Endvermoegen | P50-Endvermoegen |
|---|---:|---:|---:|---:|---:|---:|
| 0 Jahre | 29 / 29 | 5,107% | 5.854 EUR | 99,17% | 479.417 EUR | 1.577.215 EUR |
| +2 Jahre | 29 / 31 | 4,894% | 4.610 EUR | 99,17% | 544.157 EUR | 1.660.112 EUR |
| +5 Jahre | 29 / 34 | 4,625% | 3.034 EUR | 99,17% | 539.714 EUR | 1.663.661 EUR |

Einordnung:

- Der Puffer senkt die VPW-Rate und die freigegebene Flex-Entnahme monoton im ersten Logjahr.
- Die Erfolgswahrscheinlichkeit ist in diesem kleinen Referenzlauf bereits am oberen Rand und bleibt unveraendert.
- Das P10-Endvermoegen verbessert sich gegenueber 0 Jahren; +5 Jahre liefert in diesem Seed-Setup kein monotones P10-Plus gegenueber +2 Jahren, weil MC-Pfade und Todeszeitpunkte die Endvermoegen ueberlagern. Der direkte VPW-Effekt bleibt dennoch monoton.

## Durchgefuehrte Aenderungen

- Neuer Test `tests/longevity-optimizer-docs.test.mjs`:
  - prueft, dass Auto-Optimize keine Longevity-Keys anbietet,
  - prueft, dass Champion-Apply Longevity-Felder ignoriert,
  - prueft, dass Sweep Longevity aus Basisinputs erbt, aber nicht pro Kombination ueberschreibt.
- Diese Slice-Datei mit Branch-/Statuscheck, Diff-Risiko und Vergleichsreport angelegt.
- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md` auf Slice-5-Status aktualisiert.
- Review-Blocker F-02 behoben:
  - `docs/reference/TECHNICAL.md` beschreibt Longevity-Module, Felder, Diagnose, MC-/Backtest-Anwendung und Optimizer-/Sweep-Grenzen.
  - `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` beschreibt Longevity-Adjustments, Paarlogik, Transition-Smoothing, Validierung und Nicht-Optimierbarkeit in C.10/C.11.
  - `Handbuch.html` beschreibt konservative Langlebigkeitsannahmen in Backtest-/Log-/Sweep-Abschnitten und FAQ.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/longevity-optimizer-docs.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 24 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/auto-optimizer.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 62 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 107 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/longevity-engine-runner.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 23 bestanden, 0 fehlgeschlagen
- `npm run build:engine`
  - Ergebnis: bestanden
  - Hinweis: Fallback-Build ohne `esbuild` erstellt.
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 97
  - Assertions: 2807 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- Keine Runtime-Aenderung noetig: Die Optimizer-/Sweep-Grenze bestand bereits und wird nun als Contract abgesichert.
- Nach Review-Feedback wurden zusaetzlich die drei geforderten Referenz-/Nutzerdokumente synchronisiert. Dadurch ist der Slice groesser als der urspruengliche reine Optimizer-Contract, bleibt aber auf den blockierenden Doku-Gap begrenzt.

## Offene Risiken

- `isValidCandidate()` ignoriert unbekannte Candidate-Keys, weil die erlaubten Parameter aktuell ueber UI-/Config-Erzeugung und Apply-/Evaluate-Mappings begrenzt werden. Ein spaeterer direkter API-Caller koennte dadurch unbekannte Keys mitschleppen, ohne dass sie wirken. Der neue Test sichert die heutigen oeffentlichen Auswahl- und Apply-Pfade, nicht jede interne Call-Variante.
- Die MC-Vergleichswerte sind ein kleiner deterministischer Referenzlauf, kein statistischer Kalibrierungsnachweis.

## Rueckdokumentation

- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md` wurde um den Slice-05-Status ergaenzt.

## Freigabestatus

Freigegeben durch Gemini.

## Review-Antworten von Codex

- **F-02 / Dokumentations-Sync:** Angenommen und umgesetzt. `TECHNICAL.md`, `ARCHITEKTUR_UND_FACHKONZEPT.md` und `Handbuch.html` dokumentieren jetzt die Longevity-Module, Modi, Validierungsgrenzen, Raw-/Effektivhorizont-Diagnose, Joint-to-Single-Smoothing und die Grenze, dass Sweep/Auto-Optimize Longevity in Version 1 nicht variieren.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-01 | Gemini | Die Einschränkungen von Auto-Optimize und Sweep bezüglich Langlebigkeits-Parametern wurden durch `tests/longevity-optimizer-docs.test.mjs` erfolgreich abgesichert. | Akzeptiert. Sichert ab, dass der Puffer ein reiner Sicherheitsparameter bleibt. | erledigt (in tests) |
| F-02 | Gemini | Die Referenzdokumente `TECHNICAL.md`, `ARCHITEKTUR_UND_FACHKONZEPT.md` und das Benutzerhandbuch `Handbuch.html` wurden noch nicht an die neuen Langlebigkeits-Module (Pufferung, Glättung) angepasst. Dies stellt einen offenen Gap dar. | Akzeptiert. Der Dokumentations-Sync wurde umgesetzt. | erledigt |

