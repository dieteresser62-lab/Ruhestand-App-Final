# Slice: Regime Smoothing 05 - Regression Docs

**Stand:** 2026-06-15  
**Feature-Branch:** `codex/regime-uebergaenge-glaetten`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`  
**Status:** implementiert, Review ausstehend

## Ziel

Slice 5 schliesst Paket 1 mit fokussierten Regressionen, Doku-Sync und dokumentierter Default-Entscheidung ab. Es werden keine neuen fachlichen Zielwerte eingefuehrt; die vorhandene Regime-/Runway-Glaettung wird gegen Grenzfall-Spruenge abgesichert und in den Referenzdokumenten beschrieben.

## Akzeptanzkriterien

- Drawdown-Grenzwerte knapp unter/ueber den relevanten Schwellen erzeugen bei aktivierter Zielwert-Glaettung keine grossen Runway-Zielspruenge.
- Das Feature-Flag fuer Zielwert-Glaettung bleibt per Default deaktiviert und wird per Test abgesichert.
- Harte Mindest-Runway-Grenzen bleiben als harte Grenzen dokumentiert.
- README, technische Referenz und Fachkonzept beschreiben Contract, Diagnosefelder und Default-Entscheidung konsistent.
- Vergleichslaeufe und Testergebnisse werden in dieser Slice-Datei dokumentiert.

## Scope

- `tests/regime-signals.test.mjs`
- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`
- diese Slice-Datei

## Nicht-Scope

- Keine Aenderung der Regime-Klassifikation.
- Keine Aenderung von Transaktions-, Steuer- oder Spending-Semantik.
- Keine Aenderung an `engine.js`, `dist/`, `RuheStandSuite.exe` oder `node_modules`.
- Kein Push und kein Commit durch Codex.

## Branch- und Statuscheck vor Coding

`git branch --show-current`:

```text
codex/regime-uebergaenge-glaetten
```

`git status --short`:

```text
 M app/balance/balance-binder-diagnosis.js
 M app/balance/balance-diagnosis-chips.js
 M app/balance/balance-diagnosis-keyparams.js
 M app/balance/balance-utils.js
 M app/simulator/simulator-main-helpers.js
 M app/simulator/simulator-results.js
 M app/simulator/simulator-year-result.js
 M docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md
 M engine/analyzers/MarketAnalyzer.mjs
 M engine/config.mjs
 M engine/core.mjs
 M engine/transactions/TransactionEngine.mjs
 M engine/transactions/transaction-utils.mjs
 M node_modules/.package-lock.json
 M tests/balance-diagnosis-chips.test.mjs
 M tests/balance-diagnosis-copy-contract.test.mjs
 M tests/balance-diagnosis-keyparams.test.mjs
 M tests/market-analyzer.test.mjs
 M tests/simulation.test.mjs
?? docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md
?? docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md
?? docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md
?? docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md
?? docs/internal/SLICE_REGIME_SMOOTHING_01_CONTRACT.md
?? docs/internal/SLICE_REGIME_SMOOTHING_02_SIGNAL_MODULE.md
?? docs/internal/SLICE_REGIME_SMOOTHING_03_ENGINE_TARGETS.md
?? docs/internal/SLICE_REGIME_SMOOTHING_04_DIAGNOSIS_UI.md
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

- klein bis mittel; Regression/Doku, keine neue Produktlogik.

Gefaehrdete bestehende Tests:

- `tests/regime-signals.test.mjs`
- `npm test`, weil Assertion-Zahlen und Testinventar aktualisiert werden.

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- vorbestehende `node_modules`-Aenderungen
- harte Notfall-/Mindest-Runway-Semantik und Feature-Flag-Default

Rollback-Strategie:

- `git checkout -- tests/regime-signals.test.mjs README.md docs/reference/TECHNICAL.md docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`
- neue Slice-5-Datei nur nach Freigabe gezielt entfernen.

## Geplante Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs`
- `node tests/run-single.mjs tests/market-analyzer.test.mjs`
- `node tests/run-single.mjs tests/transaction-engine-ath.test.mjs`
- `node tests/run-single.mjs tests/simulation.test.mjs`
- `npm run build:engine`
- `npm test`

## Durchgefuehrte Aenderungen

- `tests/regime-signals.test.mjs` erweitert um Grenzfall-Regressionen fuer Drawdown 9,9/10,0/10,1%, 19,9/20,0/20,1% und 29,9/30,0/30,1%.
- Test sichert, dass `CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED` per Default `false` bleibt.
- Test sichert, dass die geglaettete Runway-Zielberechnung eine harte Mindest-Runway nicht unterschreitet.
- `README.md` beschreibt Regime-Smoothing-Diagnose, Default-Entscheidung und `regime-signals.mjs` in der Repository-Struktur.
- `docs/reference/TECHNICAL.md` dokumentiert `regime-signals.mjs`, `calculateTargetLiquidityDetails()` und die UI-Diagnosefelder.
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` dokumentiert kontinuierliche Regime-Signale, optionale Runway-Zielglaettung, harte Grenzen, Testinventar und aktuelle Testzahlen.
- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md` wurde auf Slice-5-Implementierungsstand aktualisiert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 77 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/market-analyzer.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 13 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/transaction-engine-ath.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 10 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulation.test.mjs`
  - Ergebnis: bestanden
  - Hinweis: Datei nutzt lokale Assertions ausserhalb des Runner-Counters; Testdatei lief fehlerfrei.
- `npm run build:engine`
  - Ergebnis: bestanden
  - Hinweis: Fallback-Build ohne `esbuild`; `engine.js` blieb im finalen Git-Status unveraendert.
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 91
  - Assertions: 2382 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- Keine fachliche Abweichung.
- Die Vergleichslaeufe wurden als deterministische Grenzfall-Regressionen im bestehenden `regime-signals.test.mjs` umgesetzt, nicht als separate Backtest-Datei. Das reduziert Scope und testet direkt den Zielwert-Contract.

## Offene Risiken

- Die Zielwert-Glaettung bleibt per Default deaktiviert; reale Backtest-Abweichungen bei produktiver Aktivierung muessen in einem spaeteren Rollout-/Default-Slice erneut bewertet werden.
- Die Regressionen pruefen den Zielwert-Contract um definierte Drawdown-Schwellen. Sie ersetzen keine vollstaendige historische Ergebnisfreigabe fuer eine spaetere Default-Aktivierung.

## Rueckdokumentation

- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md` wurde auf Slice-5-Implementierungsstand aktualisiert.

## Freigabestatus

Freigegeben. Das Review am 2026-06-15 durch Gemini war erfolgreich.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-05 | Gemini | Statisch dokumentierte Test- und Assertionzahlen in `ARCHITEKTUR_UND_FACHKONZEPT.md` veralten zwangslaeufig, sobald andere, nicht verwandte Testmodule erweitert werden. | Dies ist ein bekanntes Restrisiko von statischen Dokumentationen und fuehrt zu keinem funktionalen Fehler. Die Angabe ist als historischer Stichtagswert zu betrachten. | erledigt: Zahlen wurden auf den Stichtag 2026-06-15 synchronisiert. |

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Veralten von Stichtagswerten:* Zukuenftige Test-Erweiterungen fuehren zu einer Diskrepanz bei den dokumentierten Assertionszahlen in den Modul-Metadaten.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Es wurde kein funktionales Risiko identifiziert, da die Glaettung per Default deaktiviert bleibt und der mathematische Kontroll-Contract vollstaendig unter Grenzbedingungen abgesichert ist.
