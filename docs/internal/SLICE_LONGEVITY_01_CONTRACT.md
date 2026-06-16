# Slice Longevity 01: Contract

**Stand:** 2026-06-16  
**Status:** implementiert, Review ausstehend  
**Autor:** Codex  
**Paket:** 3 - Langlebigkeitsmodell konservativer  
**Slice:** 1 - Contract, Default-Entscheidung, Paarlogik  
**Feature-Branch:** `codex/langlebigkeitsmodell-konservativer`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

## Ziel

Dieser Slice legt den DOM-freien Longevity-Contract fuer Dynamic-Flex fest, ohne ihn bereits in Engine, Backtest, Monte Carlo, Balance oder UI zu verdrahten.

## Akzeptanzkriterien

- V1-Default bleibt kompatibel: `longevityMode='none'`.
- Zulaessige Modi sind explizit: `none`, `quantile_shift`, `relative_horizon_buffer`, `buffer_years`.
- `cohort_table` ist in V1 kein aktiver Modus und normalisiert auf `none`.
- Grenzen sind festgelegt:
  - `longevityQuantileShift`: 0..0.10
  - `longevityRelativePct`: 0..0.20
  - `longevityBufferYears`: ganzzahlig 0..10
  - Shift-Cap fuer Survival-Quantile: 0.95
- Paarlogik ist fachlich eindeutig: erst finalen Haushalts-/Joint-Horizon ableiten, dann Longevity-Adjustment genau einmal anwenden.
- Joint-to-Single-Smoothing ist als Contract konkretisiert: Drop groesser 3 Jahre triggert eine lineare Horizon-Floor-Glattung ueber 3 Jahre.
- Noch keine Runtime-Verdrahtung in produktive Berechnungspfade.

## Scope

- Neues Contract-Modul `app/simulator/dynamic-flex-longevity-contract.js`.
- Neuer fokussierter Test `tests/longevity-contract.test.mjs`.
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

Hinweis: Die `node_modules`-Aenderungen bestanden vor Slice-Beginn und liegen ausserhalb des Slice-Scopes.

## Diff-Risiko

Geplante Dateien:

- `app/simulator/dynamic-flex-longevity-contract.js`
- `tests/longevity-contract.test.mjs`
- `docs/internal/SLICE_LONGEVITY_01_CONTRACT.md`
- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

Voraussichtliche Aenderungstiefe:

- klein; DOM-freier Contract, keine produktive Verdrahtung.

Gefaehrdete bestehende Tests:

- gering, weil keine bestehenden Runtime-Pfade geaendert werden.

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- Engine-/Runner-/UI-Integration
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Neue Dateien nach Freigabe gezielt entfernen.
- `git checkout -- docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md` fuer die Plan-Rueckdokumentation, falls noetig.

## Geplante Tests

- `node tests/run-single.mjs tests/longevity-contract.test.mjs`
- `node tests/run-single.mjs tests/dynamic-flex-horizon.test.mjs`
- `npm test`, sofern fokussierte Tests erfolgreich sind

## Durchgefuehrte Aenderungen

- `app/simulator/dynamic-flex-longevity-contract.js` neu angelegt.
- Contract-Konstanten fuer Modi, Defaults, Grenzen und Transition-Smoothing definiert.
- `validateLongevitySettings()` fuer Contract-nahe Validierung ergaenzt.
- `describeLongevityHouseholdApplication()` dokumentiert technisch, dass Pair-Adjustments nicht pro Person, sondern einmal nach Joint-Horizon angewandt werden.
- `shouldSmoothJointToSingleTransition()` konkretisiert den Review-Punkt: ein Horizon-Drop groesser 3 Jahre beim Joint-to-Single-Wechsel braucht Glattung.
- `tests/longevity-contract.test.mjs` deckt Default, Modi, Grenzen, negative Settings, Paarlogik und Smoothing-Trigger ab.

## Ausgefuehrte Tests

- `node tests\run-single.mjs tests\longevity-contract.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 33 bestanden, 0 fehlgeschlagen
- `node tests\run-single.mjs tests\dynamic-flex-horizon.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 10 bestanden, 0 fehlgeschlagen
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 93
  - Assertions: 2643 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- Die Tests sind nicht als dauerhafter Red-State angelegt, sondern direkt mit dem neuen Contract-Modul gruen. Dadurch bleibt die Suite nutzbar; die Runtime-Integration folgt in den Folgeslices.

## Offene Risiken

- Der Contract ist noch nicht in Engine, Runner oder UI verdrahtet.
- Die konkrete mathematische Anwendung der `linear_horizon_floor`-Glattung muss in einem Folgeslice implementiert und gegen MC-Joint-to-Single-Laeufe getestet werden.

## Rueckdokumentation

- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md` wurde um den Slice-01-Status ergaenzt.

## Freigabestatus

Freigegeben mit Findings, bereit fuer Slice 2.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-01 | Gemini | Die Validierung `validateLongevitySettings` setzt strikte numerische Typen voraus. String-Eingaben (z. B. `"2"`) schlagen fehl, da `Number.isFinite()` ohne implizite Konvertierung prueft. | Akzeptiert. Die Integration in Slice 03/04 muss sicherstellen, dass Eingabewerte vor der Validierung/Verarbeitung explizit in Zahlen konvertiert werden. | Folgescope (Integration) |
| F-02 | Gemini | `shouldSmoothJointToSingleTransition` verlangt ebenfalls strikte Zahlen. String-Werte fuer die Horizonte fuehren stillschweigend zu `false` (keine Glattung). | Akzeptiert. Typ-Casting der Horizonte im MC-Runner vor Aufruf des Helpers sicherstellen. | Folgescope (Integration) |

