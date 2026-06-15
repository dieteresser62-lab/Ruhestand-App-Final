# Slice CAPE Return 03: Engine-Integration

**Stand:** 2026-06-15  
**Status:** umgesetzt, Review ausstehend  
**Autor:** Codex  
**Paket:** 3 - Engine-Integration hinter Modus  
**Feature-Branch:** `codex/cape-return-kontinuierlich`  
**GitHub-Status:** Lokal angelegt, noch nicht veroeffentlicht.

## Ziel

Dieser Slice verdrahtet das DOM-freie VPW-Return-Policy-Modul in `engine/core.mjs`. Der Engine-Default bleibt `legacy_step`; `cape_continuous` wird nur aktiv, wenn `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY` explizit gesetzt wird.

## Akzeptanzkriterien

- `engine/core.mjs` nutzt `deriveVpwExpectedRealReturn()` fuer die Dynamic-Flex-/VPW-Renditeerwartung.
- Legacy bleibt Default und bestehende VPW-Ergebnisse bleiben im Legacy-Modus unveraendert.
- Continuous kann per Config aktiviert werden und liefert eigene VPW-Diagnosefelder.
- Return-Smoothing bleibt im Core erhalten und wirkt auf Legacy und Continuous gleich.
- Keine UI-, Runner-, Worker-, Sweep- oder Default-Aenderung.

## Scope

- `engine/core.mjs`
- `tests/vpw-dynamic-flex.test.mjs`
- `docs/internal/SLICE_CAPE_RETURN_03_ENGINE_INTEGRATION.md`
- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md`

## Nicht-Scope

- Keine Aenderung von `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY` Default.
- Keine Nutzersteuerung im Simulator oder Balance-UI.
- Keine Backtest-/MC-/Worker-/Sweep-Durchreichung.
- Keine manuelle Aenderung von `engine.js`, `dist/` oder `RuheStandSuite.exe`.

## Startstatus

`git branch --show-current`:

```text
codex/cape-return-kontinuierlich
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

- `engine/core.mjs`
- `tests/vpw-dynamic-flex.test.mjs`
- `docs/internal/SLICE_CAPE_RETURN_03_ENGINE_INTEGRATION.md`
- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md`

Voraussichtliche Aenderungstiefe:

- mittel, weil der zentrale VPW-Renditepfad beruehrt wird; Default bleibt Legacy.

Gefaehrdete bestehende Tests:

- `tests/vpw-dynamic-flex.test.mjs`
- `tests/dynamic-flex-horizon.test.mjs`
- `tests/simulator-backtest.test.mjs`
- `tests/worker-parity.test.mjs`
- `tests/vpw-return-policy.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- UI-/Profil-/Runner-Module

Rollback-Strategie:

- `git checkout -- engine/core.mjs tests/vpw-dynamic-flex.test.mjs docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md`
- Neue Slice-Datei nach Freigabe gezielt entfernen: `docs/internal/SLICE_CAPE_RETURN_03_ENGINE_INTEGRATION.md`

## Geplante Tests

- `node tests/run-single.mjs tests/vpw-return-policy.test.mjs`
- `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs`
- `node tests/run-single.mjs tests/dynamic-flex-horizon.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `npm run build:engine`
- `npm test`, sofern fokussierte Tests und Build erfolgreich sind

## Durchgefuehrte Aenderungen

- `engine/core.mjs` importiert und nutzt `deriveVpwExpectedRealReturn()` fuer die VPW-Return-Ableitung.
- Das bisherige Core-Smoothing bleibt erhalten und glaettet den Policy-Zielwert ueber `EXPECTED_RETURN_SMOOTHING_ALPHA`.
- `result.ui.vpw` erhaelt aktive Policy-Diagnosefelder, u. a. `returnPolicy`, `expectedReturnSource`, `capeInputStatus`, `capePolicyRatioUsed`, Safe-/Gold-Return-Quellen sowie Raw-/Clamp-/Pre-Smoothing-Werte.
- `tests/vpw-dynamic-flex.test.mjs` prueft explizit, dass Legacy Default bleibt.
- `tests/vpw-dynamic-flex.test.mjs` aktiviert `cape_continuous` temporaer per Config und prueft Rendite, Rate und Diagnosefelder.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/vpw-return-policy.test.mjs`
  - Ergebnis: erfolgreich
  - 100 Assertions, 100 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs`
  - Ergebnis: erfolgreich
  - 52 Assertions, 52 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/dynamic-flex-horizon.test.mjs`
  - Ergebnis: erfolgreich
  - 10 Assertions, 10 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
  - Ergebnis: erfolgreich
  - 33 Assertions, 33 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
  - Ergebnis: erfolgreich
  - 168 Assertions, 168 bestanden, 0 fehlgeschlagen
  - Hinweis: Node meldete unveraendert eine Warnung zu `--localstorage-file` ohne gueltigen Pfad; der Testlauf war erfolgreich.
- `npm run build:engine`
  - Ergebnis: erfolgreich
  - Hinweis: Fallback-Build ohne `esbuild`; keine zusaetzliche Git-Aenderung an `engine.js`
- `npm test`
  - Ergebnis: erfolgreich
  - 92 Testdateien, 2493 Assertions, 2493 bestanden, 0 fehlgeschlagen
  - Hinweise: Node meldete unveraendert Warnungen zu `--localstorage-file`; CAPE-Fallback-Fehlerlogs stammen aus negativen CAPE-Tests.

## Abweichungen vom Plan

- Keine fachliche Abweichung.
- Der User-Auftrag nannte "Slice 2 von Paket 2"; da `SLICE_CAPE_RETURN_02_POLICY_MODULE.md` bereits freigegeben ist, wurde der naechste geplante Umsetzungsslice `SLICE_CAPE_RETURN_03_ENGINE_INTEGRATION.md` umgesetzt.

## Offene Risiken

- Runner-/Worker-Paritaet fuer explizit aktiviertes Continuous ist noch nicht vollstaendig durchgereicht; das ist Scope von Slice 04.
- Die neue Diagnose ist nur im aktiven VPW-Pfad sichtbar; UI-Erklaerung und Log-Aufbereitung folgen in spaeteren Slices.
- Kalibrierungsrisiko und CAPE-Plateau bei niedrigen Bewertungen bleiben bis zum Vergleichsreport offen.

## Rueckdokumentation

- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md` wurde mit Branch-/Slice-Status fuer Slice 03 aktualisiert.

## Freigabestatus

Review durch Gemini durchgeführt. Status: **freigegeben** (alle Akzeptanzkriterien erfüllt, keine Regressionen).

## Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - **Runner-Deltas bei globaler Aktivierung:** Sollte `SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY` in `config.mjs` manuell auf `cape_continuous` gesetzt werden, laufen alle Monte-Carlo- und Backtest-Berechnungen über das neue Modell. Da in dieser Phase die Parameter-Steuerung in UI und Runnern (Monte Carlo/Sweep) noch nicht dynamisch durchgereicht wird, kann dies zu unerwarteten Einstellungs-Diskrepanzen führen (gelöst im nächsten Slice).
- **Pre-Mortem:**
  - Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein Entwickler ändert versehentlich in `config.mjs` den Default-Wert auf `cape_continuous`, wodurch sich alle historischen Backtests im Hintergrund lautlos verschieben, ohne dass es im UI anwählbar ist oder grafisch verständlich erklärt wird.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| 1 | Gemini | Übergabe von `capeRatio` / `marketCapeRatio` an `_calculateExpectedRealReturn` | gelöst | erledigt: Codex hat die Parametrisierung im Aufruf ergänzt |
| 2 | Gemini | Abwärtskompatibilität der Diagnose-Payloads in `core.mjs` | gelöst | erledigt: Alle bisherigen UI-Diagnosefelder bleiben unverändert, neue Felder wurden optional hinten angehängt |
| 3 | Gemini | Paritätsprüfung (Worker vs. Serial) bei aktiviertem Flag | gelöst | erledigt: `worker-parity.test.mjs` läuft auch bei Konfigurationsänderung fehlerfrei durch |
