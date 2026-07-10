# Slice Engine Hardening 01: Liquiditaets-Input-Contract

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** umgesetzt - Review ausstehend  
**Aenderungsbereich:** Punkt 2 / Contract C1

## Ziel

Der optionale Override `aktuelleLiquiditaet` wird vor jeder Engine-Rechnung eindeutig normalisiert und hart validiert. Explizit ungueltige Werte duerfen weder still auf `0` fallen noch NaN, negative Liquiditaet oder String-Konkatenation in Ergebnisfelder tragen.

## Akzeptanzkriterien

- Fehlendes, `undefined` oder `null` gesetztes Feld verwendet `tagesgeld + geldmarktEtf`.
- `0` und endliche nicht-negative Zahlen werden akzeptiert.
- Alle Strings werden abgelehnt, auch `"50000"`, `"50000.00"` und `"50.000,00"`. Locale-Parsing gehoert in UI-Reader, nicht in die Engine.
- Strings, NaN, Infinity und negative Werte liefern im Ergebnisobjekt einen `ValidationError` mit `fieldId: 'aktuelleLiquiditaet'`.
- Das normalisierte Feld im Ergebnis ist bei vorhandenem Override eine Zahl.
- Gesamtvermoegen, Deckung und Runway enthalten keine NaN-Werte.
- Der Pflegebucket bleibt ausserhalb der operativen Liquiditaet; keine Aenderung am Simulator-Mapping.
- `tagesgeld` und `geldmarktEtf` behalten ihren bestehenden Legacy-Contract: konvertierbare Werte werden normalisiert, NaN/Infinity fallen auf `0`, negative endliche Werte werden validiert.
- Der Simulator-Builder liefert `aktuelleLiquiditaet` nachweislich als Zahl.
- Balance und Simulator behandeln den bestehenden Engine-Contract `{ error }`; die Engine wirft den Validierungsfehler nicht ungefangen.
- Bestehende `minimumFlexAnnual`-Semantik bleibt unveraendert.

## Scope

Geplant:

- gezielte Normalisierung in `engine/core.mjs`,
- Validierung in `engine/validators/InputValidator.mjs`,
- negative Contract-Faelle in `tests/core-negative-contracts.test.mjs`,
- Simulator-Builder-Contract in `tests/simulation.test.mjs`,
- generiertes `engine.js` nur via Build.

Nicht-Scope:

- allgemeiner Rewrite der Input-Normalisierung,
- Aenderung des Pflegebucket-Carve-outs,
- neues UI-Parsing oder UI-Redesign,
- Core-Extraktion; sie ist nach Review zurueckgestellt.

## Git- und Diff-Risiko vor Coding

Planungsstand am 2026-07-10:

```text
Branch: codex/engine-contract-hardening
Status: bestehende fremde Doku-/node_modules-Aenderungen sowie neue Planungsdateien vorhanden
```

Vor dem ersten Code-Edit wurden `git branch --show-current` und `git status --short` erneut ausgefuehrt:

```text
Branch: codex/engine-contract-hardening
Status:
 M README.md
 M docs/internal/README.md
 M docs/internal/archive/README.md
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M docs/reference/SIMULATOR_MODULES_README.md
 M docs/reference/TECHNICAL.md
 M node_modules/.package-lock.json
 M tests/README.md
?? docs/internal/ENGINE_CONTRACT_HARDENING_PLAN.md
?? docs/internal/SLICE_ENGINE_HARDENING_01_LIQUIDITY_INPUT_CONTRACT.md
?? docs/internal/SLICE_ENGINE_HARDENING_02_TAX_NET_PROCEEDS_CONTRACT.md
?? docs/internal/SLICE_ENGINE_HARDENING_03_MARKET_DATA_FALLBACK.md
?? docs/internal/SLICE_ENGINE_HARDENING_04_INPUT_NORMALIZER_EXTRACTION.md
?? docs/internal/SLICE_ENGINE_HARDENING_05_VPW_SAFETY_EXTRACTION.md
?? docs/internal/SLICE_ENGINE_HARDENING_06_SETTLEMENT_EXTRACTION.md
?? docs/internal/SLICE_ENGINE_HARDENING_07_RESULT_BUILDER_DOCS.md
?? docs/internal/SLICE_ENGINE_HARDENING_08_SIMULATOR_TAX_RECONCILIATION.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

```text
Geplante Dateien:
- engine/core.mjs
- engine/validators/InputValidator.mjs
- tests/core-negative-contracts.test.mjs
- tests/simulation.test.mjs
- engine.js (generiert)

Voraussichtliche Aenderungstiefe:
- klein bis mittel

Gefaehrdete bestehende Tests:
- core-negative-contracts
- engine-robustness
- simulator input/engine integration
- balance/simulator error handling
- health-bucket / worker parity

Nicht anfassen:
- app/simulator/simulator-engine-input.js
- minimumFlexAnnual-Contract
- dist/
- RuhestandSuite.exe
- bestehende fremde Doku- und node_modules-Aenderungen

Rollback-Strategie:
- git checkout -- engine/core.mjs engine/validators/InputValidator.mjs tests/core-negative-contracts.test.mjs engine.js
```

## Geplante Tests

```text
node tests/run-single.mjs tests/core-negative-contracts.test.mjs
node tests/run-single.mjs tests/simulation.test.mjs
node tests/run-single.mjs tests/engine-robustness.test.mjs
node tests/run-single.mjs tests/health-bucket.test.mjs
npm run build:engine
npm test
```

Testmatrix: fehlend, `null`, `0`, positive Zahl, numerischer String, deutscher Betragsstring, leerer String, Text, NaN, beide Infinities und negative Zahl. Zusaetzlich Simulator-Builder mit operativer Liquiditaet `0` und positivem Wert.

## Durchgefuehrte Aenderungen

- `engine/core.mjs`: Entfernt `null` und `undefined` als nicht vorhandenen Override vor der Berechnung. Damit greift fuer diese Faelle wieder der bestehende Fallback `tagesgeld + geldmarktEtf`; alle expliziten Werte bleiben zur harten Validierung unveraendert.
- `engine/validators/InputValidator.mjs`: Validiert einen vorhandenen Override ausschliesslich als endliche, nicht-negative JavaScript-Zahl. Strings, NaN, beide Unendlichkeiten und negative Zahlen liefern den vorhandenen strukturierten `ValidationError` fuer `aktuelleLiquiditaet`.
- `tests/core-negative-contracts.test.mjs`: Deckt fehlende Werte, `0`, positive Zahl sowie numerische/deutsche/englische Strings, leeren Text, Text, NaN, beide Unendlichkeiten und negative Werte ab.
- `tests/simulation.test.mjs`: Sichert, dass der Simulator-Builder positive und Null-Liquiditaet als Zahl durchreicht und den Pflegebucket nicht einbezieht.
- `engine.js`: ueber `npm run build:engine` erzeugt; der Fallback-Modul-Wrapper hatte keinen inhaltlichen Diff.

## Ausgefuehrte Tests mit Ergebnis

- `node tests/run-single.mjs tests/core-negative-contracts.test.mjs` - gruen, 67 Assertions.
- `node tests/run-single.mjs tests/simulation.test.mjs` - gruen.
- `node tests/run-single.mjs tests/engine-robustness.test.mjs` - gruen, 34 Assertions.
- `node tests/run-single.mjs tests/health-bucket.test.mjs` - gruen.
- `npm run build:engine` - gruen; esbuild nicht verfuegbar, vorhandener Fallback-Modul-Wrapper erzeugt.
- `npm test` - gruen: 101 Testdateien, 3.029 Assertions, 0 Fehlschlaege.
- `git diff --check` - gruen.

## Abweichungen vom Plan

Keine fachlichen Abweichungen. `engine.js` wurde wie vorgeschrieben nur ueber den Build erzeugt, blieb dabei aber unveraendert, weil der Fallback-Modul-Wrapper dieselbe Ausgabe erzeugt.

## Offene Risiken

- Externe direkte Engine-Aufrufer mit String-Override erhalten neu einen Validierungsfehler; bekannte Projektaufrufer liefern Zahlen.
- Die Entscheidung `null = Feld fehlt` muss im Review gegen externe direkte Engine-Aufrufer bestaetigt werden.

## Rueckdokumentation

- Der Hauptplan markiert Slice 1 als umgesetzt, Review ausstehend.
- Tatsaechliche Programmdateien: `engine/core.mjs`, `engine/validators/InputValidator.mjs`, `tests/core-negative-contracts.test.mjs`, `tests/simulation.test.mjs`. Kein `engine.js`-Diff.
- Eine Erweiterung von `engine/README.md` ist nicht erforderlich, da der Contract in diesem Slice-Dokument und den Contract-Tests verbindlich festgehalten ist.

## Freigabestatus

- [x] Plan freigegeben
- [x] Branch-/Statuscheck aktualisiert
- [x] Implementierung abgeschlossen
- [x] Tests gruen
- [x] Gemini-Review
- [ ] Nutzerfreigabe

### Review-Feedback von Gemini

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:** C1 wurde dahingehend präzisiert, dass alle Strings strikt abgelehnt werden. Dies eliminiert das Parsing-Risiko vollständig und verlagert das deutsche vs. englische Zahlenformat-Parsing sauber an die UI (gelöst, Finding **G-01**).
- **Vertragstreue:** Die Validierungs-Asymmetrie bezüglich der Basisfelder wird als historischer Legacy-Contract akzeptiert und explizit dokumentiert/getestet (akzeptiert, Finding **G-04**).
- **Fehlerbehandlung:** Die Engine wirft keine ungefangenen Fehler mehr, sondern liefert `{ error: ValidationError }`. Das kontrollierte Abfangen in den UI-Consumer-Pfaden wird im Rahmen dieses Slice getestet und abgesichert (gelöst, Finding **G-05**).

### 2. Findings (Gemini)
- **G-01 (Hoch):** String-Normalisierung von `aktuelleLiquiditaet` unpräzise (gelöst, Strings strikt abgelehnt).
- **G-04 (Mittel):** Validierungs-Asymmetrie im `InputValidator` (akzeptiert, historischer Contract dokumentiert).
- **G-05 (Mittel):** Unbehandelte `ValidationError`-Abbrüche in UI-Consumer-Komponenten (gelöst, `{ error }`-Handling).

### 3. Pre-Mortem
Angenommen, dieser Slice verursacht in 3 Monaten einen Fehler: Ein Anwender gibt `"45.000"` in ein UI-Feld ein (gedacht als 45 Tsd. EUR). Das System normalisiert dies naiv über `parseFloat`, liest `45` EUR aus und führt eine dramatisch unterdeckte Simulation aus. Mitigation: Strenge Ablehnung von Strings mit Punkten und Kommas, wenn keine eindeutige deutsche/englische Parsing-Logik vorgeschaltet ist.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Keine

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

- **G-01 angenommen:** Strings werden nicht locale-abhaengig geparst, sondern ausnahmslos abgelehnt.
- **G-04 teilweise angenommen:** Die behauptete NaN-Propagation ist nicht reproduzierbar; `_normalizeEngineInput()` setzt NaN/Infinity fuer `tagesgeld` und `geldmarktEtf` bereits auf `0`, negative Werte werden validiert. Der bestehende Legacy-Contract wird dokumentiert und getestet, aber nicht vereinheitlicht.
- **G-05 teilweise angenommen:** `EngineAPI.simulateSingleYear()` liefert `{ error: ValidationError }`. Balance fuehrt diesen Wert kontrolliert in bestehendes `try/catch`/`UIRenderer.handleError`, der Simulator prueft `fullResult.error`. Der Slice verifiziert diesen Consumer-Contract, fuehrt aber keine neue Fehlerarchitektur ein.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 | Gemini | String-Normalisierung unpräzise | angenommen | alle Strings abgelehnt |
| G-04 | Gemini | Validierungs-Asymmetrie Tagesgeld/ETF | angenommen | Legacy-Verhalten dokumentiert |
| G-05 | Gemini | Unbehandelte ValidationError in UI | angenommen | { error }-Handling verifiziert |
| F-S01-01 | Claude | Override strenger als regulaere Felder | angenommen | bewusste Contract-Grenze dokumentiert |
| F-S01-02 | Claude | Simulator-Aufrufpfad fehlt | angenommen | `simulation.test.mjs` im Scope |
