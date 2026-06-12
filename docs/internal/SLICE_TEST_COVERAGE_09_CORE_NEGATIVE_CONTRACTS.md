# Slice Test Coverage 09: Fehlerpfade und negative Contracts im Finanzkern

**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** nicht veroeffentlicht in diesem Slice  
**Status:** umgesetzt und freigegeben


## Ziel

Fachlich riskante Fehler- und Grenzfaelle im Finanzkern werden als negative Contract-Tests abgesichert, ohne neue Runtime-Semantik einzufuehren. Der Slice prueft insbesondere `minimumFlexAnnual`, UI-/Engine-Feldnamen, Steuer-/Settlement-Pfade mit Verlusttopf und Forced Sales sowie NaN/Infinity-Eingaben.

## Akzeptanzkriterien

- Jede testbare Stop-Regel aus `AGENTS.md` hat mindestens einen Contract-Test oder eine dokumentierte manuelle Pruefung.
- `minimumFlexAnnual`-Tests pruefen zuerst bestehende Lade-, Migrations- und Validierungsstrecken und fuehren keine neue strikte Runtime-Validierung ein.
- Wenn Bestandsdaten mit ungueltigem `minimumFlexAnnual` abstuerzen oder still verfremdet werden, stoppt der Slice zugunsten eines separaten Migrations-/Bugfix-Plans.
- Unklare Engine-Semantik wird nicht festgeschrieben.
- Bestehende Golden-/Backtest-Erwartungen werden nicht ohne Review angepasst.

## Scope

- Neuer negativer Kern-Contract-Test `tests/core-negative-contracts.test.mjs`.
- Rueckdokumentation im uebergeordneten Testabdeckungsplan.

## Nicht-Scope

- Keine Aenderung an Engine-, Simulator- oder Persistenz-Semantik.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.
- Keine Anpassung bestehender Golden-/Backtest-Erwartungen.
- Keine neue Migration fuer Bestandsprofile.

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

Die `node_modules`-Aenderungen stammen aus dem Playwright-Setup und werden in diesem Slice nicht angefasst.

## Diff-Risiko-Block

Geplante Dateien:

- `tests/core-negative-contracts.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_09_CORE_NEGATIVE_CONTRACTS.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Änderungstiefe:

- mittel, test- und dokumentationsnah

Gefährdete bestehende Tests:

- `tests/engine-robustness.test.mjs`
- `tests/simulator-backtest.test.mjs`
- `tests/core-tax-settlement.test.mjs`
- `tests/tax-settlement.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- lokale `node_modules`-Artefakte
- fachliche Engine-, Simulator- oder Steuersemantik

Rollback-Strategie:

- `git checkout -- docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`
- Neue Dateien `tests/core-negative-contracts.test.mjs` und diese Slice-Datei nur nach Freigabe entfernen.

## Stop-Regel-Abdeckung

| Stop-Regel | Abdeckung in Slice 9 |
|---|---|
| Mehr als 5 Dateien noetig | Manuell geprueft: geplanter Scope umfasst 3 Dateien. |
| Tests nicht ausfuehrbar | Pflichttests werden ausgefuehrt; bei Ausfall Stop. |
| Contract unklar | Tests beschraenken sich auf bestehende Validierungs- und Settlement-Contracts. |
| Engine-Semantik muesste geaendert werden | Keine Produktionsaenderung geplant; bei rotem Test Stop statt Semantikaenderung. |
| Snapshot-/Backtest-Abweichungen | `simulator-backtest.test.mjs` bleibt Pflicht-Gate; Erwartungen werden nicht angepasst. |
| FlowDelta auffaellig | Bestehende Backtest-FlowDelta-Checks bleiben Pflicht-Gate. |
| UI und Engine unterschiedliche Parameternamen | `core-negative-contracts.test.mjs` prueft `minimumFlexAnnual` vom Simulator-Reader bis Engine-Input. |
| `minimumFlexAnnual` still begrenzt statt validiert | `core-negative-contracts.test.mjs` prueft negative/zu hohe Werte als Validierungsfehler und dokumentiert den bestehenden Legacy-Fallback fuer nicht-numerische Bestandsdaten. |

## Geplante Tests

```powershell
node tests\run-single.mjs tests\engine-robustness.test.mjs
node tests\run-single.mjs tests\simulator-backtest.test.mjs
node tests\run-single.mjs tests\core-negative-contracts.test.mjs
npm test
```

## Durchgefuehrte Änderungen

- `tests/core-negative-contracts.test.mjs` angelegt:
  - prueft `minimumFlexAnnual` negativ und oberhalb `flexBedarf` im Engine-Pfad als `ValidationError` mit Feldbezug,
  - dokumentiert den bestehenden Legacy-Fallback fuer nicht-numerisches `minimumFlexAnnual` als nicht crashenden Null-Fallback,
  - prueft den Simulator-Reader-/Validator-Contract fuer den Feldnamen `minimumFlexAnnual` ohne Alias,
  - prueft NaN/Infinity-Assetwerte auf bestehenden nicht crashenden Null-Fallback statt neuer strikter Runtime-Semantik,
  - prueft Steuer-Settlement mit ungueltigem Verlusttopf und ungueltigen Rohaggregaten auf finite, nicht mutierende Sanitization,
  - prueft Forced-Sale-Recompute mit Verlusttopf, TQF-adjustiertem Signed-Aggregate und `forcedSaleScaleApplied`,
  - prueft nicht-positive Forced-Shortfall-Pfade als neutral und ohne Portfolio-/Tax-Aggregate-Mutation.
- Keine Produktionsdateien geaendert.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\core-negative-contracts.test.mjs
```

Ergebnis: erfolgreich.

- 35 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\engine-robustness.test.mjs
```

Ergebnis: erfolgreich.

- 34 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\simulator-backtest.test.mjs
```

Ergebnis: erfolgreich.

- 33 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
npm test
```

Ergebnis: erfolgreich.

- 90 Testdateien gefunden.
- 2272 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.
- 0 offene Handles.

Bestehende Warnungen aus der Suite bleiben unveraendert sichtbar, insbesondere ``--localstorage-file` was provided without a valid path`, CAPE-Fallback-Logs und ein erwarteter Validierungslog fuer `goGoMultiplier`.

## Abweichungen vom Plan

- Der NaN/Infinity-Asset-Contract wurde nicht als neue strikte Validierung formuliert. Die bestehende Engine normalisiert diese Werte vor der Validierung auf 0; der Slice-Test haelt deshalb den bestehenden nicht crashenden, finiten Fallback fest.
- Der Legacy-Pfad fuer nicht-numerisches `minimumFlexAnnual` bleibt als bestehender Null-Fallback dokumentiert. Negative Werte und Werte oberhalb `flexBedarf` werden weiterhin validiert.

## Offene Risiken

- Die Tests pruefen kontrollierte Contract-Pfade, aber keine realen Bestandsprofile mit historisch gewachsenen Feldkombinationen.
- Nicht-testbare Stop-Regeln bleiben dokumentierte manuelle Pruefungen.

## Rueckdokumentation

- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` dokumentiert Slice 9 als umgesetzt und listet den neuen Contract-Test inklusive Validierungsergebnissen.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Detailanalyse

#### Korrektheit
- **`minimumFlexAnnual` Validierung:** Test 1 prüft, ob die Engine negative Werte sowie Werte oberhalb von `flexBedarf` als `ValidationError` zurückweist. Dies verhindert, dass ungültige Grenzen im Kern unbemerkt zu falschen Berechnungen führen.
- **Legacy Fallback für Bestandsdaten:** Test 2 stellt sicher, dass Altdaten (z. B. ein nicht-numerisches `minimumFlexAnnual: 'legacy-invalid'`) nicht zum Absturz führen, sondern robust auf `0` normalisiert werden.
- **Feldnamens-Gleichheit (UI/Engine):** Test 3 prüft die Konsistenz des Feldnamens `minimumFlexAnnual` in der simulator-input-strategy (Reader) und simulator-input-validation (Validator) und stellt sicher, dass kein Alias (z. B. `minFlexAnnual`) eingeschleust wird.
- **NaN/Infinity-Sicherheit:** Test 4 und 5 prüfen die Robustheit bei der Übergabe unendlicher oder undefinierter Werte in Asset-Inputs und Steuerparametern. Die Engine normalisiert diese Werte auf sichere Finit-Grenzwerte (`0`), ohne abzustürzen oder den Ausgangszustand zu mutieren.
- **Forced-Sale-Recomputation:** Test 6 und 7 prüfen das Verhalten bei Zwangsverkäufen. Es wird verifiziert, dass Steuer-Vorträge (`lossCarry`) korrekt verrechnet werden, bevor Steuern anfallen, und dass nicht-positive Shortfalls neutral und ohne Aggregat-Mutation verarbeitet werden.

#### Vertragstreue
- **Stop-Regel-Konformität:** Der Test deckt die Kern-Stop-Regeln aus `AGENTS.md` ab (Konsistenz von UI/Engine-Parametern, Schutz von Engine-Semantik vor stiller Kapselung, Legacy-Fallbacks).
- **Prozess-Hygene:** Der Test verwendet keine DOM-Mocks und kann daher vertragsgemäß direkt in der Haupt-Suite `npm test` mitlaufen (erhöht die Assertion-Zahl um 35).

#### Fehlerbehandlung
- **Stummschaltung erwarteter Logs:** `withMutedValidationLog` unterdrückt erwartete Konsolen-Fehlermeldungen während der Validierungs-Tests, was das Test-Log übersichtlich hält.
- **Globale Bereinigung:** In `finally`-Blöcken wird `console.error` stets restauriert, um Nebeneffekte auf nachfolgende Tests auszuschließen.

#### Seiteneffekte
- **Keine Mutation geteilter Objekte:** Die Tests verwenden Kopien über Destructuring (`{ ...baseEngineInput }`), was Seiteneffekte auf andere Tests verhindert.

#### Was könnte brechen?
- **Unbemerkte Fehlertoleranz (Risiko):** Dass die Engine NaN/Infinity-Inputs stillschweigend auf `0` normalisiert und rechnet, verhindert zwar Abstürze, kann aber dazu führen, dass Programmierfehler im Frontend (z. B. fehlerhafte Berechnungsformeln, die NaN liefern) stillschweigend ignoriert werden. Die Validierung im UI-Reader sollte solche Werte bereits an der Oberfläche abfangen.

---

### 2. Strukturierte Findings & Blocker

| ID | Schwere | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S9-01 | RISIKO | Stillschweigende Normalisierung von NaN/Infinity auf 0 kann logische Fehler maskieren. | Als Restrisiko akzeptiert, da die Engine robust sein muss; UI-Reader validiert diese an der Oberfläche. | Keine Änderung. |
| G-S9-02 | HINWEIS | Temporäre Stummschaltung von `console.error` maskiert auch unerwartete Fehler während des Callbacks. | Als Hinweis dokumentiert. Callbacks sind kurz gehalten. | Keine Änderung. |

---

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Maskierung von Formelfehlern im Frontend durch die hohe Fehlertoleranz des Engine-Kerns (NaN/Infinity-Normalisierung).
- Pre-Mortem:
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Ein Entwickler führt eine neue Berechnung im Simulator-Frontend ein, die unter bestimmten Bedingungen (z. B. Division durch 0 bei leeren Profilen) `Number.POSITIVE_INFINITY` als Depotwert liefert. Da die Engine diesen Wert im Kern stillschweigend auf `0` korrigiert und normal rechnet, stürzt die App nicht ab. Der Benutzer erhält jedoch eine fehlerhafte Simulation mit 0 € Depotwert, ohne dass ein Fehler gemeldet wird. Der Contract-Test deckt zwar die Normalisierung ab, verhindert aber nicht das Auftreten des Frontend-Fehlers.“

## Freigabestatus

Freigegeben durch Gemini am 2026-06-12.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S9-01 | Gemini | Maskierung von NaN/Infinity-Fehlern im Kern | Restrisiko akzeptiert | Keine |
| G-S9-02 | Gemini | Stummschaltung von `console.error` in Tests | Hinweis dokumentiert | Keine |

