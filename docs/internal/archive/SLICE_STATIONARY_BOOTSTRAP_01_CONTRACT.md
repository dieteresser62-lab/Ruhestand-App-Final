# Slice Stationary Bootstrap 01: Contract

**Feature-Branch:** `codex/stationary-bootstrap`
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht
**Status:** freigegeben
**Startdatum:** 2026-06-16
**Uebergeordneter Plan:** `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`

## Ziel

Dieser Slice legt den DOM-freien Contract fuer Stationary Bootstrap fest, ohne Runner, Worker oder UI bereits fachlich umzuschalten. Festgeschrieben werden Methodenname, Parametergrenzen, Restart-Gruende und die Interaktion von CAPE/FILTER/RECENCY mit neuen Blockstarts.

## Akzeptanzkriterien

- Interner Methodenwert ist `stationary`; bestehende Methode `block` bleibt getrennt.
- UI-Label ist `Stationary Bootstrap`.
- `mcBlockSize` kann spaeter als `expectedBlockLength` wiederverwendet werden.
- `expectedBlockLength` wird auf 1..30 normalisiert; Werte `<= 0` ergeben IID-Verhalten mit Laenge 1.
- `p = 1 / expectedBlockLength` ist Bestandteil des Contracts.
- CAPE hat bei neuen Blockstarts Vorrang vor FILTER/RECENCY.
- FILTER/RECENCY gelten nur fuer neue Blockstarts; Blockfortsetzung ist rein sequenziell.
- Datenende-Restarts verwenden den Grund `data_end`; Wrap-around ist fuer Version 1 ausgeschlossen.
- Kein Zugriff auf DOM oder globale Browserobjekte.

## Scope

- Neues Contract-Modul unter `app/simulator/`.
- Fokussierter Contract-Test.
- Slice-Dokumentation und Rueckdokumentation im Arbeitsplan.

## Nicht-Scope

- Kein Stationary-Sampler.
- Keine Monte-Carlo-Runner-Integration.
- Keine Worker-Payload-Aenderung.
- Keine UI-/Persistenz-Aenderung.
- Keine Aenderung der bestehenden `block`-Semantik.

## Git-Status Vor Start

Branch:

```text
codex/stationary-bootstrap
```

Status:

```text
## codex/stationary-bootstrap
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

Hinweis: Die `node_modules`-Aenderungen waren vor Slice-Start vorhanden und werden nicht angefasst.

## Diff-Risiko

Geplante Dateien:

- `docs/internal/SLICE_STATIONARY_BOOTSTRAP_01_CONTRACT.md`
- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`
- `app/simulator/stationary-bootstrap-contract.js`
- `tests/stationary-bootstrap-contract.test.mjs`

Voraussichtliche Änderungstiefe:

- klein bis mittel

Gefährdete bestehende Tests:

- `tests/monte-carlo-sampling.test.mjs`
- `tests/monte-carlo-startyear.test.mjs`
- `tests/simulator-monte-carlo.test.mjs`
- `tests/worker-parity.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- bestehende `block`-Sampling-Semantik
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Geaenderte bestehende Dateien: `git checkout -- docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`
- Neue Dateien nach Rueckfrage entfernen: `docs/internal/SLICE_STATIONARY_BOOTSTRAP_01_CONTRACT.md`, `app/simulator/stationary-bootstrap-contract.js`, `tests/stationary-bootstrap-contract.test.mjs`

## Geplante Tests

- `node tests/run-single.mjs tests/stationary-bootstrap-contract.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs`
- `npm test`

## Durchgefuehrte Aenderungen

- `app/simulator/stationary-bootstrap-contract.js` neu angelegt.
- Contract-Konstanten fuer Methode `stationary`, UI-Label, erwartete Blocklaenge 1..30, Default 5 und Restart-Gruende festgelegt.
- `normalizeStationaryBootstrapConfig()` implementiert, inklusive Wiederverwendung von `blockSize` als `expectedBlockLength` und IID-Fallback fuer Werte `<= 0`.
- `resolveStationaryBootstrapStartPolicy()` implementiert, um CAPE-Vorrang und FILTER/RECENCY-Scope fuer neue Blockstarts festzuhalten.
- `tests/stationary-bootstrap-contract.test.mjs` neu angelegt.
- Uebergeordneten Arbeitsplan mit lokalem Branch und Slice-Status aktualisiert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/stationary-bootstrap-contract.test.mjs`
  - Ergebnis: gruen, 19 Assertions.
- `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs`
  - Ergebnis: gruen, 6 Assertions.
- `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs`
  - Ergebnis: gruen, 112 Assertions.
- `npm test`
  - Ergebnis: gruen, 98 Testdateien, 2826 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.

## Abweichungen Vom Plan

- Keine fachliche Abweichung. Der Slice implementiert nur den Contract; Sampler, Runner, Worker und UI bleiben Folge-Slices.

## Offene Risiken

- Der Contract ist noch nicht in Runner, Worker oder UI verdrahtet. Folge-Slices muessen sicherstellen, dass Datenende-Restarts keinen RNG-Drift erzeugen und keine Sampler-Zustaende zwischen Runs geteilt werden.
- `data_end` ist als Restart-Grund festgelegt, aber der konkrete RNG-Footprint bei erzwungenem Datenende wird erst im Sampler-Slice technisch abgesichert.

## Rueckdokumentation

- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md` dokumentiert den lokalen Feature-Branch `codex/stationary-bootstrap` und den Status von Slice 1.

## Freigabestatus

- Codex-Implementierung abgeschlossen; Review durch Gemini/Nutzer steht aus. Codex markiert den Slice nicht als freigegeben.

## Review-Feedback von Gemini

### 1. Korrektheit
- **Eingaben-Ueberprüfung**: Die Akzeptanzkriterien verlangen eine Normalisierung der erwarteten Blocklänge auf 1..30. Dies wird durch `normalizeStationaryBootstrapConfig` erreicht.
- **Rundung von Fließkommawerten**: Werte zwischen `0` (exklusive) und `0.5` (exklusive) – z.B. `0.4` – überspringen den `raw <= 0` Check, werden per `Math.round()` zu `0` gerundet und anschließend über `Math.max(1, 0)` auf `1` hochgeklemmt. Dies ist mathematisch korrekt und führt zum gewünschten IID-Verhalten.

### 2. Vertragstreue
- **CAPE/FILTER/RECENCY-Priorisierung**: Der Contract bildet die Priorisierung im Policy-Builder sauber ab.
- **Inkonsistenz bei `useCapeSampling`**: In `resolveStationaryBootstrapStartPolicy` wird `useCapeSampling` für `blockStartSelector` als Truthy-Wert ausgewertet (`useCapeSampling ? 'CAPE' : ...`), für `capeHasPriority` jedoch strikt verglichen (`useCapeSampling === true`). Wird z. B. `"true"` (String) oder `1` übergeben, ist `blockStartSelector === 'CAPE'`, aber `capeHasPriority === false`. Dies sollte vereinheitlicht werden (z. B. durch einheitlich strikten Check oder explizite Typkonvertierung beim Lesen der UI-Werte).

### 3. Fehlerbehandlung
- **Null-Eingaben**: Wenn `inputs` (in `normalizeStationaryBootstrapConfig`) oder das Options-Argument (in `resolveStationaryBootstrapStartPolicy`) explizit als `null` übergeben wird, werfen die Funktionen einen `TypeError` (Cannot read properties of null). Der Default-Parameter greift nur bei `undefined`. Es wird empfohlen, dies defensiv abzusichern (z.B. `inputs = inputs || {}`).

### 4. Seiteneffekte
- **Bestehende block-Logik**: Die Logik ist vollständig isoliert. Es gibt keine Modifikationen an bestehenden Monte-Carlo-Methoden oder globalen Objekten. Alle Unit-Tests laufen fehlerfrei durch.

### 5. Was könnte brechen?
- **RNG-Drift und Worker-Sync (Folge-Slices)**: Da dies nur der Contract ist, besteht noch kein direktes Ausführungsrisiko. Bei der tatsächlichen Integration des Samplers im nächsten Slice muss sichergestellt werden, dass der Zufallszahlengenerator für jeden MC-Run sauber neu geseedet wird, um deterministische Parität zwischen seriellem Runner und Web Workern zu garantieren.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - TypeError bei expliziter Übergabe von `null` als Konfigurationsobjekt.
  - Abweichung zwischen `blockStartSelector` und `capeHasPriority` bei nicht-booleaschem Truthy-Wert für `useCapeSampling`.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Die Simulation stürzt ab, weil eine API-Schnittstelle oder eine Import-Bibliothek das Konfigurationsobjekt mit `null` statt `undefined` initialisiert und `normalizeStationaryBootstrapConfig(null)` aufgerufen wird.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G1 | Gemini | `null`-Eingabe wirft TypeError | Defensiver Check einbauen (`inputs = inputs \|\| {}`) | Codex-Umsetzung in Slice 2 ausstehend |
| G2 | Gemini | Inkonsequenter Check für `useCapeSampling` | Vereinheitlichen auf booleaschen Wert/striktes `=== true` | Codex-Umsetzung in Slice 2 ausstehend |
