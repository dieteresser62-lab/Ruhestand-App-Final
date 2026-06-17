# Slice Longevity 02: Horizon Module

**Stand:** 2026-06-16  
**Status:** implementiert, Review ausstehend  
**Autor:** Codex  
**Paket:** 3 - Langlebigkeitsmodell konservativer  
**Slice:** 2 - Horizon-/Buffer-Helfer und Unit-Tests  
**Feature-Branch:** `codex/langlebigkeitsmodell-konservativer`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

## Ziel

Dieser Slice implementiert einen DOM-freien Helper, der einen bereits abgeleiteten Dynamic-Flex-Rohhorizont mit dem Longevity-Contract aus Slice 1 kombiniert. Produktive Engine-, Backtest-, Monte-Carlo-, Worker- oder UI-Pfade werden noch nicht verdrahtet.

## Akzeptanzkriterien

- `longevityMode='none'` erhaelt den Rohhorizont unveraendert.
- `quantile_shift` kappt das effektive Quantil bei 0.95 und diagnostiziert den tatsaechlich angewandten Shift.
- Ein wirkungsloser Quantil-Shift bei Basisquantil 0.95 wird als `quantile_cap` diagnostiziert.
- `relative_horizon_buffer` und `buffer_years` erhoehen den effektiven Horizont monoton, ohne Max-Horizon 60 zu verletzen.
- Das Adjustment arbeitet auf dem finalen Haushalts-Horizon und enthaelt keine Pro-Person-Anwendung.
- Ungueltige Longevity-Settings liefern Fehler statt stiller Normalisierung.
- Die lineare Joint-to-Single-Floor-Glattung begrenzt den ersten Drop auf 3 Jahre und laeuft ueber 3 Jahre aus.

## Scope

- Neues Modul `app/simulator/dynamic-flex-longevity-horizon.js`.
- Neuer fokussierter Test `tests/longevity-horizon.test.mjs`.
- Slice-Dokumentation und Rueckdokumentation im Arbeitsplan.

## Nicht-Scope

- Keine Aenderung an `engine/core.mjs`.
- Keine Aenderung an Backtest, Monte Carlo, Sweep, Worker oder Auto-Optimize.
- Keine UI-/Persistenzfelder.
- Keine generierten Artefakte (`engine.js`, `dist/`, `RuheStandSuite.exe`).
- Keine Bereinigung vorbestehender `node_modules`-Aenderungen.

## Branch- und Statuscheck vor Coding

`git branch --show-current`:

```text
codex/langlebigkeitsmodell-konservativer
```

`git status --short`:

```text
 M docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md
 M node_modules/.package-lock.json
?? app/simulator/dynamic-flex-longevity-contract.js
?? docs/internal/SLICE_LONGEVITY_01_CONTRACT.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
?? tests/longevity-contract.test.mjs
```

Hinweis: Die Slice-01-Dateien sind noch uncommitted. Die `node_modules`-Aenderungen bestanden vor Slice-Beginn und liegen ausserhalb des Slice-Scopes.

## Diff-Risiko

Geplante Dateien:

- `app/simulator/dynamic-flex-longevity-horizon.js`
- `tests/longevity-horizon.test.mjs`
- `docs/internal/SLICE_LONGEVITY_02_HORIZON_MODULE.md`
- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

Voraussichtliche Aenderungstiefe:

- klein; DOM-freier Helper, keine produktive Verdrahtung.

Gefaehrdete bestehende Tests:

- gering; bestehende Laufzeitpfade bleiben unveraendert.

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- Engine-/Runner-/UI-Integration
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Neue Slice-02-Dateien nach Freigabe gezielt entfernen.
- `git checkout -- docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md` fuer die Plan-Rueckdokumentation, falls noetig.

## Geplante Tests

- `node tests/run-single.mjs tests/longevity-horizon.test.mjs`
- `node tests/run-single.mjs tests/longevity-contract.test.mjs`
- `node tests/run-single.mjs tests/dynamic-flex-horizon.test.mjs`
- `npm test`, sofern fokussierte Tests erfolgreich sind

## Durchgefuehrte Aenderungen

- `app/simulator/dynamic-flex-longevity-horizon.js` neu angelegt.
- `applyLongevityHorizonAdjustment()` implementiert:
  - `none` erhaelt den Rohhorizont.
  - `quantile_shift` kappt bei 0.95, diagnostiziert `longevityAppliedShift` und akzeptiert eine explizite Recompute-Funktion fuer den Sterbetafel-Horizont.
  - `relative_horizon_buffer` und `buffer_years` wenden den Puffer auf den finalen Rohhorizont an und clampen auf 60.
  - ungueltige Contract-Settings liefern Fehler ohne Diagnoseobjekt.
- `applyLongevityTransitionSmoothing()` implementiert die lineare Horizon-Floor-Glattung ueber 3 Jahre.
- `tests/longevity-horizon.test.mjs` deckt Default, Quantil-Cap, Max-Horizon-Clamp, fixed/relative Buffer, ungueltige Settings und Joint-to-Single-Smoothing ab.

## Ausgefuehrte Tests

- `node tests\run-single.mjs tests\longevity-horizon.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 22 bestanden, 0 fehlgeschlagen
- `node tests\run-single.mjs tests\longevity-contract.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 33 bestanden, 0 fehlgeschlagen
- `node tests\run-single.mjs tests\dynamic-flex-horizon.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 10 bestanden, 0 fehlgeschlagen
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 94
  - Assertions: 2665 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- Keine fachliche Abweichung.
- `quantile_shift` berechnet den Sterbetafel-Horizont nicht selbst, sondern verlangt eine `recomputeHorizonForQuantile`-Funktion. Damit bleibt die bestehende Single-/Pair-Horizon-Ableitung bis Slice 3 unveraendert und der Helper bleibt DOM- und Runner-frei.

## Offene Risiken

- Die produktive Verdrahtung und String-/UI-Konvertierung folgen erst in Slice 3/4.
- Worker-Paritaet fuer Longevity-Felder ist noch nicht belegt, weil Worker-Payloads erst in Slice 3 erweitert werden.

## Rueckdokumentation

- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md` wurde um den Slice-02-Status ergaenzt.

## Freigabestatus

Freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-01 | Gemini | Die Horizon-Module setzen strikte Zahlen voraus (keine implizite Typkonvertierung von Strings im Helper selbst). | Akzeptiert. Wurde durch Typ-Normalisierung im Core-Normalizer (`engine/core.mjs`) und in den Simulator-Resolvern sichergestellt. | erledigt (in Slice 03) |
| F-02 | Gemini | `applyLongevityTransitionSmoothing` amortisiert die Horizon-Reduktion linear ueber 3 Jahre, was bei hohem Altersunterschied mathematisch stabil wirkt. | Akzeptiert. Deckt die Anforderungen an die Vermeidung sprunghafter Entnahmedefizite ab. | erledigt (in Slice 02/03) |

