# Slice Test Coverage 05: Worker-Entrypoints

**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** nicht veroeffentlicht in diesem Slice  
**Status:** umgesetzt und freigegeben


## Ziel

Die Worker-Entrypoints werden ueber echte Worker-nahe Ausfuehrungspfade abgesichert. Schwerpunkt ist `workers/mc-worker.js`, weil diese Datei bislang nur indirekt ueber Mock-Worker-Pfade beruehrt wurde.

## Akzeptanzkriterien

- `workers/mc-worker.js` wird in einem Node-Worker-Thread-nahen Harness geladen, der `self.onmessage` und `self.postMessage` abbildet.
- `init`, `job`, `dispose`, unbekannte Message-Typen und fehlende Szenario-Caches liefern kontrollierte Antworten.
- Ein gueltiger Monte-Carlo-Job liefert eine `result`-Antwort mit Buffern, Totals, Listen und `elapsedMs`.
- Progress-Nachrichten werden gesammelt, ohne den Jobabschluss zu stoeren.
- Transferable-nahe ArrayBuffer-Payloads werden im Antwortpfad sichtbar.
- Worker-Fehler oder Worker-Error-Antworten beenden den Testprozess nicht unkontrolliert.
- Bestehende Worker-/Parity-Tests bleiben gruen.

## Scope

- Neuer Contract-Test fuer `workers/mc-worker.js`.
- Nutzung bestehender Runner- und Worker-Tests als Regressionsgate.
- Rueckdokumentation im uebergeordneten Testabdeckungsplan.

## Nicht-Scope

- Keine Aenderung an fachlicher Engine- oder Simulator-Semantik.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.
- Keine Umstellung des bestehenden `tests/worker-pool.test.mjs` auf ein neues Testframework.
- Keine Browser-Worker-Abdeckung; Node-Worker-Thread bleibt als dokumentierte Naeherung.

## Git-Status vor Start

Branch:

```text
codex/test-coverage-expansion
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
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Die `node_modules`-Aenderungen stammen aus Slice 4/Playwright-Setup und werden in diesem Slice nicht angefasst.

## Diff-Risiko-Block

Geplante Dateien:

- `tests/mc-worker-contract.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_05_WORKER_ENTRYPOINTS.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Änderungstiefe:

- mittel

Gefährdete bestehende Tests:

- `tests/worker-pool.test.mjs`
- `tests/worker-parity.test.mjs`
- Monte-Carlo-nahe Tests, falls der Worker-Harness globale Annahmen offenlegt.

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- fachliche Engine-/Simulator-Semantik
- lokale `node_modules`-Artefakte

Rollback-Strategie:

- `git checkout -- docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`
- Neue Dateien `tests/mc-worker-contract.test.mjs` und diese Slice-Datei nur nach Freigabe entfernen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\worker-pool.test.mjs
node tests\run-single.mjs tests\worker-parity.test.mjs
node tests\run-single.mjs tests\mc-worker-contract.test.mjs
npm test
```

## Durchgefuehrte Änderungen

- `tests/mc-worker-contract.test.mjs` angelegt:
  - startet einen Node-Worker-Thread mit Test-Harness fuer `self.onmessage` und `self.postMessage`,
  - importiert darin den echten Entrypoint `workers/mc-worker.js`,
  - prueft `init`/`dispose`,
  - prueft unbekannte Message-Typen als kontrollierte `error`-Antwort,
  - prueft `job` ohne Szenario-Cache als kontrollierte `error`-Antwort,
  - prueft einen gueltigen Monte-Carlo-Job inklusive `result`, Progress-Nachrichten, TypedArray-Buffern, Heatmap, Totals, Listen und `elapsedMs`.
- Produktionscode wurde nicht geaendert.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\mc-worker-contract.test.mjs
```

Ergebnis: erfolgreich.

- 22 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\worker-pool.test.mjs
```

Ergebnis: erfolgreich.

- 40 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\worker-parity.test.mjs
```

Ergebnis: erfolgreich.

- 168 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
npm test
```

Ergebnis: erfolgreich.

- 84 Testdateien gefunden.
- 2228 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.
- 0 offene Handles.

Hinweis: Node gibt weiterhin die bestehende Warnung ``--localstorage-file` was provided without a valid path` aus. Sie ist nicht neu durch diesen Slice entstanden und hat den Testlauf nicht fehlschlagen lassen.

## Abweichungen vom Plan

- Die Akzeptanzkriterien nennen auch `workers/worker-pool.js`, `workers/worker-telemetry.js` und `app/simulator/auto-optimize-worker.js`. Diese Pfade bleiben durch bestehende Tests abgedeckt:
  - `tests/worker-pool.test.mjs`
  - `tests/worker-parity.test.mjs`
  - `tests/auto-optimize-worker-contract.test.mjs` im Gesamtlauf
- Neu umgesetzt wurde gezielt der fehlende echte Entrypoint-Contract fuer `workers/mc-worker.js`.

## Offene Risiken

- Node Worker Threads bilden Browser-Worker-Verhalten nur naeherungsweise ab.
- Der neue Contract nutzt bewusst kleine Monte-Carlo-Jobs, um Laufzeit und Flakiness gering zu halten.

## Rueckdokumentation

- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` dokumentiert Slice 5 als umgesetzt mit Verweis auf `tests/mc-worker-contract.test.mjs` und die ausgefuehrten Gates.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Detailanalyse

#### Korrektheit
- **Monte-Carlo Validierung:** Der Test prüft die Initialisierung (`init`), Berechnung (`job`), Beendigung (`dispose`) sowie das Verhalten bei unbekannten Job-Typen und fehlendem Szenario-Cache. Es wird verifiziert, dass die Ergebnisse korrekt als TypedArrays (Transferables) vorliegen, was der Akzeptanzkriterien-Vorgabe voll entspricht.
- **Sweep-Pfad ungetestet (Risiko):** `workers/mc-worker.js` enthält auch Code zur Verarbeitung von Sweeps (`sweep-init` und `sweep`). Diese Pfade werden in `mc-worker-contract.test.mjs` nicht direkt auf Message-Ebene verifiziert, obwohl sie transitiv über `worker-parity.test.mjs` abgedeckt sind.

#### Vertragstreue
- **Worker-Thread Harness:** Der Test lädt `mc-worker.js` unter Node.js in einem echten Worker-Thread über eine dynamische `data:text/javascript` Brücke. Dies simuliert das asynchrone PostMessage- und Event-Verhalten (inklusive Buffertransfer) realitätsnah und hält den Contract mit dem Frontend ein.

#### Fehlerbehandlung
- **Robuster Promise-Wrapper:** `postAndWait` implementiert eine saubere Fehlerbehandlung (inklusive Timeout nach 12s, Error- und Exit-Events des Worker-Threads). Dadurch führen Hänger oder Abstürze im Worker nicht zu verwaisten Handles oder einem unkontrollierten Absturz des Test-Runners.
- **Kontrollierte Fehlerantworten:** Es wird verifiziert, dass Fehler im Worker (z. B. fehlender Cache) sauber als `type: 'error'` zurückgeschickt werden, anstatt den Thread abstürzen zu lassen.

#### Seiteneffekte
- **Globale Verschmutzung:** Das Testskript definiert global `window` und `window.EngineAPI` ohne Teardown. Da dies dem bestehenden Muster in vielen anderen Testdateien entspricht, entsteht hierdurch keine neue Inkompatibilität, langfristig sollte globale Test-Verschmutzung jedoch vermieden werden.

#### Was könnte brechen?
- Falls Concurrency-Probleme beim Erzeugen vieler Worker-Threads auftreten oder die V8-Engine unter hoher Last keine Threads zuteilen kann, greift der 12s-Timeout. Die Ausführung mit minimalen Monte-Carlo-Größen (`anzahl: 6`) hält dieses Risiko jedoch gering.

---

### 2. Strukturierte Findings & Blocker

| ID | Schwere | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S5-01 | RISIKO | Der Sweep-Pfad (`sweep-init`/`sweep`) des Workers wird im neuen Contract-Test nicht direkt auf Message-Ebene abgedeckt. | Als Restrisiko akzeptiert, da Sweeps über `worker-parity.test.mjs` und `worker-pool.test.mjs` integriert getestet werden. | Keine Änderung. |
| G-S5-02 | HINWEIS | Globale Verschmutzung von `global.window` wird nach Testende nicht zurückgerollt. | Akzeptiert. Entspricht dem aktuellen Legacy-Design der Testsuite. | Keine Änderung. |

---

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Ungetesteter `sweep`-Contract direkt auf Worker-Ebene (abgefedert durch Integrationstests).
  - Unkontrolliertes Verhalten bei extrem langsamer Thread-Zuweisung (abgefedert durch 12s Timeout).
- Pre-Mortem:
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Ein Entwickler ändert den Message-Contract für Parameter-Sweeps im Frontend, vergisst jedoch, den Message-Handler `sweep` in `mc-worker.js` anzupassen. Da der neue Worker-Contract-Test nur Monte-Carlo-Jobs abdeckt, meldet dieser keinen Fehler. Der Fehler wird erst zur Laufzeit bemerkt, weil auch die Integrations-Tests für Sweeps fälschlicherweise gemockt wurden.“

## Freigabestatus

Freigegeben durch Gemini am 2026-06-12.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S5-01 | Gemini | Fehlende Sweep-Abdeckung im Contract-Test | Restrisiko akzeptiert | Keine |
| G-S5-02 | Gemini | Globale Verschmutzung von `window` ohne Teardown | Hinweis dokumentiert | Keine |

