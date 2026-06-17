# Slice: Regime Smoothing 03 - Engine Targets

**Stand:** 2026-06-15  
**Feature-Branch:** `codex/regime-uebergaenge-glaetten`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`  
**Status:** implementiert, Review ausstehend

## Ziel

Slice 3 integriert die kontinuierlichen Regime-Signale in die Engine-Zielwertberechnung fuer Liquiditaets-Runway. Die Integration bleibt hinter einem Feature-Flag, sodass bestehende Default-Ergebnisse unveraendert bleiben. Harte Mindest-Runway- und Notfallgrenzen bleiben unveraendert.

## Akzeptanzkriterien

- Default-Konfiguration laesst `calculateTargetLiquidity()` strukturell wie bisher rechnen.
- Aktivierte Glattung interpoliert Zielmonate monoton zwischen neutralem Ziel und Stressziel.
- Geglaettete Zielmonate unterschreiten nie `minRunwayMonths` und ueberschreiten nicht den relevanten Stress-Stuetzwert.
- Nicht-finite oder unvollstaendige Signalwerte fallen kontrolliert auf den bisherigen diskreten Zielwert zurueck.
- Notfall-/Guardrail-Aktivierung bleibt hart und wird in diesem Slice nicht geglaettet.

## Scope

- `engine/config.mjs`
- `engine/transactions/transaction-utils.mjs`
- `tests/regime-signals.test.mjs`
- Slice- und Plan-Dokumentation

## Nicht-Scope

- Keine UI-/Copytext-Aenderung.
- Keine Aenderung an Guardrail-Aktivierung, Mindest-Runway oder Notfall-Refill.
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
 M engine/analyzers/MarketAnalyzer.mjs
 M node_modules/.package-lock.json
 M tests/market-analyzer.test.mjs
?? docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md
?? docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md
?? docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md
?? docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md
?? docs/internal/SLICE_REGIME_SMOOTHING_01_CONTRACT.md
?? docs/internal/SLICE_REGIME_SMOOTHING_02_SIGNAL_MODULE.md
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

- `engine/config.mjs`
- `engine/transactions/transaction-utils.mjs`
- `tests/regime-signals.test.mjs`
- `docs/internal/SLICE_REGIME_SMOOTHING_03_ENGINE_TARGETS.md`
- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`

Voraussichtliche Aenderungstiefe:

- mittel; Ziel-Liquiditaet bekommt einen Feature-Flag-geschuetzten geglaetteten Monatspfad, Default bleibt aus.

Gefaehrdete bestehende Tests:

- `tests/regime-signals.test.mjs`
- Guardrail-/Transaction-Tests, weil `calculateTargetLiquidity()` gemeinsam genutzt wird, auch wenn die Glattung per Default deaktiviert bleibt.

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- UI-Module und Simulator-Logs
- vorbestehende `node_modules`-Aenderungen

Rollback-Strategie:

- `git checkout -- engine/config.mjs engine/transactions/transaction-utils.mjs tests/regime-signals.test.mjs docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`
- neue Slice-3-Datei nur nach Freigabe gezielt entfernen.

## Geplante Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs`
- `node tests/run-single.mjs tests/liquidity-guardrail.test.mjs`
- `node tests/run-single.mjs tests/transaction-engine-ath.test.mjs`
- `npm run build:engine`
- `npm test`

## Durchgefuehrte Aenderungen

- `CONFIG.REGIME_SMOOTHING` als Feature-Flag-Block ergaenzt; `TARGETS_ENABLED` ist per Default `false`.
- `calculateSmoothedRunwayTargetMonths()` im DOM-freien Signalmodul ergaenzt.
- `TransactionEngine.calculateTargetLiquidity()` nutzt den geglaetteten Zielmonatswert nur bei aktivem Feature-Flag und ohne explizites Nutzerziel.
- Bestehende ATH-Skalierung, Mindest-Runway, Guardrail-Aktivierung und Notfall-Refill bleiben unveraendert.
- Tests fuer deaktivierten Default, aktivierte Zielwert-Interpolation, monotone Zielmonate, invaliden Severity-Fallback und explizite Nutzerziel-Bypass-Logik ergaenzt.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 57 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/liquidity-guardrail.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 10 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/transaction-engine-ath.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 10 bestanden, 0 fehlgeschlagen
- `npm run build:engine`
  - Ergebnis: bestanden
  - Hinweis: Fallback-Build ohne `esbuild`; kein `engine.js` im Git-Status.
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 91
  - Assertions: 2354 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- Keine fachliche Abweichung.
- Die Zielwert-Glattung schreibt in diesem Slice noch keine UI-Diagnosefelder, weil UI-/Copytext-Transparenz Scope von Slice 4 bleibt.

## Offene Risiken

- Das Feature-Flag ist per Default deaktiviert. Die aktivierte Zielwert-Glattung ist getestet, aber noch nicht in UI/Logs sichtbar erklaert.
- Custom-Konfigurationen mit vertauschten Neutral-/Stress-Regime-Stuetzwerten wuerden mathematisch funktionieren, aber fachlich falsche Zwischenziele erzeugen. Slice 4 sollte dies in Diagnose/Erklaerung sichtbar machen.

## Rueckdokumentation

- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md` wurde auf Slice-3-Implementierungsstand aktualisiert.

## Freigabestatus

Freigegeben. Das Review am 2026-06-15 durch Gemini war erfolgreich.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-03 | Gemini | Stumme Deaktivierung der Glaettung bei unvollstaendigen Profildaten (z. B. fehlende `bear`-Struktur oder nicht-finites `discreteTargetMonths`). | Der Fallback auf das diskrete Ziel verhindert Systemabstuerze. Die Diagnose-UI in Slice 4 muss dem Anwender explizit anzeigen, ob das Smoothing aktiv war oder stumm uebergegangen wurde. | erledigt: Fallback-Struktur in `calculateSmoothedRunwayTargetMonths` sichert Stabilitaet ab. |

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Stumme Deaktivierung:* Fehlen im Profil die spezifischen Runway-Einträge fuer `bear` oder `hot_neutral`, schaltet sich die Glaettung stumm ab und faellt auf das diskrete Ziel zurueck. Dies muss in der UI-Visualisierung (Slice 4) sichtbar gemacht werden.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein Anwender importiert ein altes Profil, bei dem die Struktur `runway.bear` unvollstaendig ist. Die Glaettung schaltet sich stumm ab, das System berechnet diskret 60 Monate Ziel-Liquiditaet, und der Nutzer wundert sich ueber die sprunghaften Refills, da in der Diagnose keine Warnung ausgegeben wird.
