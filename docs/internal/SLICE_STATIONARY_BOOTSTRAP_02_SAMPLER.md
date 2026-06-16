# Slice Stationary Bootstrap 02: Sampler

**Feature-Branch:** `codex/stationary-bootstrap`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Status:** freigegeben  
**Startdatum:** 2026-06-16  
**Uebergeordneter Plan:** `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`

## Ziel

Dieser Slice implementiert den DOM-freien Stationary-Bootstrap-Sampler und fokussierte Unit-Tests. Runner, Worker, UI und Persistenz bleiben unveraendert. Die in Slice 1 dokumentierten Gemini-Findings zu `null`-Eingaben und nicht-booleaschem `useCapeSampling` werden in diesem Slice mitbehoben.

## Akzeptanzkriterien

- Sampler-Modul hat keinen DOM- oder Browser-Global-Zugriff.
- Sampler akzeptiert synthetische `annualData` und einen injizierten RNG.
- `expectedBlockLength` nutzt den Contract aus Slice 1.
- Pro Simulationsjahr wird genau ein Restart-Wurf verbraucht; bei `data_end` wird dieser Wurf ebenfalls konsumiert.
- Neue Blockstarts koennen uniform oder ueber CDF/Index-Pool gezogen werden.
- Blockfortsetzung laeuft sequenziell; kein Wrap-around am Datenende.
- Datenende-Restart setzt `lastRestartReason='data_end'`.
- `expectedBlockLength=1` fuehrt zu IID-aehnlichem Verhalten mit Neustart pro Jahr.
- `normalizeStationaryBootstrapConfig(null)` und `resolveStationaryBootstrapStartPolicy(null)` werfen nicht.
- Nicht-booleasches truthy `useCapeSampling` aktiviert CAPE nicht implizit.

## Scope

- `app/simulator/stationary-bootstrap-sampler.js` neu.
- Fokussierter Sampler-Test neu.
- Defensive Contract-Fixes aus Slice-1-Review.
- Slice-Dokumentation und Rueckdokumentation im Arbeitsplan.

## Nicht-Scope

- Keine Runner-Integration.
- Keine Worker-Payload-Aenderung.
- Keine UI-/Persistenz-Aenderung.
- Keine Aenderung der bestehenden Methode `block`.
- Keine Anpassung von `engine.js`, `dist/` oder Release-Artefakten.

## Git-Status Vor Start

Branch:

```text
codex/stationary-bootstrap
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
```

Hinweis: Die `node_modules`-Aenderungen waren vor Slice-Start vorhanden und werden nicht angefasst.

## Diff-Risiko

Geplante Dateien:

- `docs/internal/SLICE_STATIONARY_BOOTSTRAP_02_SAMPLER.md`
- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`
- `app/simulator/stationary-bootstrap-contract.js`
- `app/simulator/stationary-bootstrap-sampler.js`
- `tests/stationary-bootstrap-sampler.test.mjs`

Voraussichtliche Änderungstiefe:

- mittel, DOM-frei und ohne Produktivverdrahtung

Gefährdete bestehende Tests:

- `tests/stationary-bootstrap-contract.test.mjs`
- `tests/monte-carlo-sampling.test.mjs`
- `tests/monte-carlo-startyear.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- Runner-/Worker-/UI-Integration
- bestehende `block`-Sampling-Semantik
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Geaenderte bestehende Dateien: `git checkout -- docs/internal/STATIONARY_BOOTSTRAP_PLAN.md app/simulator/stationary-bootstrap-contract.js`
- Neue Dateien nach Rueckfrage entfernen: `docs/internal/SLICE_STATIONARY_BOOTSTRAP_02_SAMPLER.md`, `app/simulator/stationary-bootstrap-sampler.js`, `tests/stationary-bootstrap-sampler.test.mjs`

## Geplante Tests

- `node tests/run-single.mjs tests/stationary-bootstrap-contract.test.mjs`
- `node tests/run-single.mjs tests/stationary-bootstrap-sampler.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs`
- `npm test`

## Durchgefuehrte Aenderungen

- `app/simulator/stationary-bootstrap-sampler.js` neu angelegt.
- `createStationaryBootstrapSampler()` implementiert, inklusive synthetischer `annualData`, injiziertem RNG, Startindex-Pool und optionaler CDF-Auswahl.
- `nextYearSample()` implementiert, inklusive Initial-, Random- und Datenende-Restarts, sequenzieller Fortsetzung und State-Feldern `currentIndex`, `yearsInCurrentBlock`, `restartCount`, `lastRestartReason`.
- Datenende-Restart verbraucht wie jeder Simulationsjahr-Schritt einen Restart-Wurf und vermeidet Wrap-around.
- `app/simulator/stationary-bootstrap-contract.js` gegen `null`-Eingaben gehaertet.
- `useCapeSampling` wird in `resolveStationaryBootstrapStartPolicy()` nur noch bei strikt `true` als CAPE aktiv interpretiert.
- `tests/stationary-bootstrap-sampler.test.mjs` neu angelegt.
- Uebergeordneten Arbeitsplan mit Slice-2-Status aktualisiert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/stationary-bootstrap-contract.test.mjs`
  - Ergebnis: gruen, 19 Assertions.
- `node tests/run-single.mjs tests/stationary-bootstrap-sampler.test.mjs`
  - Ergebnis: gruen, 20 Assertions.
- `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs`
  - Ergebnis: gruen, 6 Assertions.
- `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs`
  - Ergebnis: gruen, 112 Assertions.
- `npm test`
  - Ergebnis: gruen, 99 Testdateien, 2846 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.

## Abweichungen Vom Plan

- Keine fachliche Abweichung. Runner, Worker und UI bleiben unveraendert und werden in Folge-Slices verdrahtet.

## Offene Risiken

- Runner- und Worker-Paritaet sind erst in Folge-Slices nachweisbar.
- Der Sampler ist noch nicht produktiv verdrahtet; Integration muss den State pro Run isolieren.
- Die CDF-Validierung ist bewusst minimal gehalten und erwartet monotone, vom bestehenden Sampling-Code erzeugte CDFs.

## Rueckdokumentation

- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md` dokumentiert Slice 2 als implementiert mit ausstehendem Review.

## Freigabestatus

- freigegeben

## Review-Feedback von Gemini

### 1. Korrektheit
- **Erfüllung der Akzeptanzkriterien**: Alle Kriterien aus Slice 2 sind vollständig und korrekt umgesetzt.
- **RNG-Verhalten**: Die Implementierung stellt sicher, dass pro Zeitschritt genau ein Aufruf des RNG erfolgt (`const restartDraw = drawRandom(state.rng);` zu Beginn von `nextYearSample`), auch wenn ein erzwungener Datenende-Restart vorliegt. Dies garantiert einen absolut gleichmäßigen und deterministischen RNG-Footprint.
- **Clamp-Schutz**: Die Funktion `clampRandom` schützt den Sampler effektiv vor unzulässigen RNG-Ausgaben (wie `NaN`, `Infinity` oder Werten außerhalb des Intervalls `[0, 1)`).

### 2. Vertragstreue
- **Vertragserfüllung**: Die Fehlerbehebungen für die in Slice 1 identifizierten Findings (G1 & G2) wurden in `stationary-bootstrap-contract.js` integriert. Die Typ- und Null-Sicherheit is damit voll gegeben.
- **Bestehende Sampler**: Der klassische Block-Bootstrap bleibt unangetastet.

### 3. Fehlerbehandlung
- **Robustheit**: Die Eingabe-Validierungen (`validateAnnualData`) und Typprüfungen bei Indizes sowie der CDF verhindern ungültige Zustände oder Endlosschleifen.
- **Ein-Element-Daten**: Bei einem historischen Datensatz mit nur einem Element läuft die Methode stabil, führt jedoch erwartungsgemäß in jedem Schritt einen `data_end`-Restart auf den einzigen Index aus.

### 4. Seiteneffekte
- **Isolierung**: Es gibt keine negativen Seiteneffekte auf andere Module, da es sich um ein rein additives und DOM-freies Modul handelt. Alle bestehenden Tests laufen einwandfrei.

### 5. Was könnte brechen?
- **Unerwartetes Objektformat**: Wenn die Elemente im `annualData`-Array keine Objekte sind (z.B. primitive Datentypen), liefert `{ ...state.annualData[state.currentIndex] }` leere Objekte `{}` zurück, stürzt jedoch nicht ab. Da das historische Daten-Array der Applikation aber immer aus Datenobjekten besteht, ist dieses Risiko vernachlässigbar.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken: keine
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein neues historisches Datenformat wird eingeführt, bei dem einzelne Einträge im Array `undefined` sind, wodurch der Spread-Operator `{ ...state.annualData[state.currentIndex] }` einen Laufzeitfehler wirft.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G1 | Gemini | `null`-Eingabe wirft TypeError | angenommen | in Slice 2 umgesetzt |
| G2 | Gemini | Inkonsequenter Check fuer `useCapeSampling` | angenommen | in Slice 2 umgesetzt |
