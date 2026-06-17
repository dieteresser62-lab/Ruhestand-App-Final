# Slice CAPE Return 04: Runner-Paritaet

**Stand:** 2026-06-15  
**Status:** umgesetzt, Review ausstehend  
**Autor:** Codex  
**Paket:** 4 - Simulator-/Balance-Durchreichung  
**Feature-Branch:** `codex/cape-return-kontinuierlich`  
**GitHub-Status:** Lokal angelegt, noch nicht veroeffentlicht.

## Ziel

Dieser Slice sichert ab, dass der in Slice 03 integrierte CAPE-Return-Policy-Modus in Backtest, Monte Carlo, Worker-Chunking und Sweep konsistent ueber denselben Engine-Pfad laeuft. Die Steuerung bleibt config-basiert; es wird keine neue UI- oder Profilpersistenz eingefuehrt.

## Akzeptanzkriterien

- Backtest nutzt bei `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY='cape_continuous'` denselben Engine-Policy-Pfad und schreibt die VPW-Diagnose in die Jahreszeilen.
- Monte-Carlo Full-Run und chunked Worker-Run bleiben bei aktivierter Continuous-Policy identisch.
- Sweep Full-Run und split Worker-Run bleiben bei aktivierter Continuous-Policy identisch.
- Legacy bleibt Default; keine UI-, Profil-, Auto-Optimize-Parameter- oder Default-Aenderung.

## Scope

- `tests/simulator-backtest.test.mjs`
- `tests/worker-parity.test.mjs`
- `docs/internal/SLICE_CAPE_RETURN_04_RUNNER_PARITY.md`
- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md`

## Nicht-Scope

- Keine Aenderung von `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY` Default.
- Keine Nutzersteuerung im Simulator oder Balance-UI.
- Keine Persistenz neuer Profilfelder.
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

- `tests/simulator-backtest.test.mjs`
- `tests/worker-parity.test.mjs`
- `docs/internal/SLICE_CAPE_RETURN_04_RUNNER_PARITY.md`
- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md`

Voraussichtliche Aenderungstiefe:

- mittel: keine Runner-Produktionslogik, aber Tests aktivieren temporaer die globale Engine-Policy.

Gefaehrdete bestehende Tests:

- `tests/simulator-backtest.test.mjs`
- `tests/worker-parity.test.mjs`
- `tests/vpw-dynamic-flex.test.mjs`

Nicht anfassen:

- UI-/Profilmodule
- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- `node_modules`

Rollback-Strategie:

- `git checkout -- tests/simulator-backtest.test.mjs tests/worker-parity.test.mjs docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md`
- Neue Slice-Datei nach Freigabe gezielt entfernen: `docs/internal/SLICE_CAPE_RETURN_04_RUNNER_PARITY.md`

## Geplante Tests

- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs`
- `npm run build:engine`
- `npm test`, sofern fokussierte Tests und Build erfolgreich sind

## Durchgefuehrte Aenderungen

- `tests/simulator-backtest.test.mjs` importiert `CONFIG` und prueft einen Backtest-Lauf mit temporaer aktivierter `cape_continuous`-Policy.
- Der Backtest-Test stellt sicher, dass alle aktiven VPW-Jahreszeilen `returnPolicy='cape_continuous'`, `expectedReturnSource='cape_continuous'`, `capeInputStatus='valid'` und endliche `expectedRealReturn`-Werte ausweisen.
- `tests/worker-parity.test.mjs` importiert `CONFIG` und prueft einen Monte-Carlo-Full-Run gegen ungleich gesplittete Chunks mit aktivierter Continuous-Policy.
- Der MC-Test vergleicht Aggregate, Listenformen und geloggte `ui.vpw`-Payloads fuer ausgewaehlte Runs.
- `tests/worker-parity.test.mjs` prueft zusaetzlich Sweep-Full-Run gegen split Chunking mit aktivierter Continuous-Policy.
- Keine Produktionsmodule wurden geaendert; Backtest, MC und Sweep laufen bereits ueber denselben Engine-Policy-Pfad.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
  - Ergebnis: erfolgreich
  - 39 Assertions, 39 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
  - Ergebnis: erfolgreich
  - 261 Assertions, 261 bestanden, 0 fehlgeschlagen
  - Hinweis: Node meldete unveraendert eine Warnung zu `--localstorage-file` ohne gueltigen Pfad.
- `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs`
  - Ergebnis: erfolgreich
  - 52 Assertions, 52 bestanden, 0 fehlgeschlagen
  - Hinweis: Erwarteter Validierungslog fuer ungueltigen `goGoMultiplier`.
- `npm run build:engine`
  - Ergebnis: erfolgreich
  - Hinweis: Fallback-Build ohne `esbuild`; keine zusaetzliche Git-Aenderung an `engine.js`.
- `npm test`
  - Ergebnis: erfolgreich
  - 92 Testdateien, 2592 Assertions, 2592 bestanden, 0 fehlgeschlagen
  - Hinweise: Node meldete unveraendert Warnungen zu `--localstorage-file`; CAPE-Fallback-Fehlerlogs stammen aus negativen CAPE-Tests.

## Abweichungen vom Plan

- Keine fachliche Abweichung.
- Die Durchreichung bleibt bewusst config-basiert. Es wurde kein neuer UI-/Profil-Schalter eingefuehrt, weil das Default- und Nutzerentscheidungs-Gate fuer Slice 05 vorgesehen ist.

## Offene Risiken

- Realer Browser-Worker importiert die Config in einem separaten Modulkontext; die Policy bleibt deshalb bewusst Build-/Config-basiert und nicht per Laufzeit-Payload ueberschreibbar.
- Auto-Optimize wird nicht um einen optimierbaren Return-Policy-Parameter erweitert, damit die neue Formel nicht automatisch als Optimierungshebel genutzt wird.

## Rueckdokumentation

- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md` wurde mit dem Status fuer Slice 04 aktualisiert.

## Freigabestatus

Review durch Gemini durchgeführt. Status: **freigegeben** (alle Akzeptanzkriterien für Parität erfüllt, Tests laufen erfolgreich).

## Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - Die Return-Policy-Steuerung ist rein konfigurationsbasiert und noch nicht profilbezogen dynamisierbar. Dies schränkt das Testen unterschiedlicher Profile nebeneinander ohne Neustart der Engine/Konfigurationsänderung ein (wird in Slice 5 gelöst).
- **Pre-Mortem:**
  - Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein Browser-Update im Worker-Kontext isoliert Module so stark, dass die dynamischen Importe von `vpw-return-policy.mjs` fehlschlagen und das Fallback-Verhalten der Worker stumm greift, wodurch Diskrepanzen zwischen Main-Thread und Worker-Resultaten entstehen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| 1 | Gemini | Determinismus in Monte Carlo unter Continuous-CAPE | freigegeben | erledigt: Unit-Test verifiziert Seed-Determinismus und identische Resultate in `worker-parity.test.mjs` |
| 2 | Gemini | Parität bei Parameter-Sweeps | freigegeben | erledigt: Sweeps laufen mit Continuous-CAPE in Chunks und im Full-Run absolut paritätisch |
| 3 | Gemini | Stabilitätsprüfung bei historischen Backtests | freigegeben | erledigt: Backtests laufen deterministisch durch, VPW-Jahreszeilen weisen die Continuous-Diagnose korrekt aus |
