# Slice CAPE Return 02: Policy-Modul

**Stand:** 2026-06-15  
**Status:** nachgebessert, erneutes Review ausstehend  
**Autor:** Codex  
**Paket:** 2 - Policy-Modul und Unit-Tests  
**Feature-Branch:** `codex/cape-return-kontinuierlich`  
**GitHub-Status:** Lokal angelegt, noch nicht veroeffentlicht.

## Ziel

Dieser Slice implementiert das DOM-freie VPW-Return-Policy-Modul fuer Legacy- und Continuous-CAPE-Modus. Der Slice verdrahtet das Modul noch nicht in `engine/core.mjs`; Legacy bleibt damit unveraendert Default.

## Akzeptanzkriterien

- `engine/planners/vpw-return-policy.mjs` exportiert `deriveVpwExpectedRealReturn`, `deriveCAPEContinuousReturn`, `deriveCAPELegacyStepReturn` und `normalizeVpwReturnPolicyOptions`.
- Continuous-CAPE normalisiert CAPE robust: `null`, `undefined`, `NaN`, `Infinity`, `0`, negative Werte und Werte ausserhalb des CAPE-Contracts erzeugen keinen Crash und fallen transparent auf `DEFAULT_CAPE` zurueck.
- Continuous-CAPE ist monoton fallend: hoeheres CAPE darf keine hoehere erwartete Realrendite liefern.
- Aktien-Realrendite und Portfolio-Realrendite werden separat geklammert und diagnostiziert.
- `safeRealReturnSource` ist in jedem Continuous-Ergebnis gesetzt.
- Legacy-Modus bleibt als expliziter Policy-Pfad vorhanden, ohne bestehende Engine-Ausgaben zu veraendern.

## Scope

- Neue Policy-Konfiguration in `engine/config.mjs`.
- Neues DOM-freies Policy-Modul.
- Fokussierte Unit-Tests fuer CAPE 10, 15, 20, 25, 30, 35, 45, `null`, `0`, `NaN`.
- Rueckdokumentation im uebergeordneten Arbeitsplan.

## Nicht-Scope

- Keine Integration in `engine/core.mjs`.
- Keine UI-, Backtest-, MC-, Worker- oder Sweep-Durchreichung.
- Kein Default-Wechsel auf Continuous.
- Keine Aenderung generierter Artefakte.

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

- `engine/config.mjs`
- `engine/planners/vpw-return-policy.mjs`
- `tests/vpw-return-policy.test.mjs`
- `docs/internal/SLICE_CAPE_RETURN_02_POLICY_MODULE.md`
- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md`

Voraussichtliche Aenderungstiefe:

- mittel, aber DOM-frei und ohne Engine-Integration

Gefaehrdete bestehende Tests:

- neue Policy-Tests
- Config-Importe bei Syntax-/Exportfehlern

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- UI-/Runner-Module

Rollback-Strategie:

- `git checkout -- engine/config.mjs docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md`
- Neue Dateien nur nach Freigabe gezielt entfernen: `engine/planners/vpw-return-policy.mjs`, `tests/vpw-return-policy.test.mjs`, `docs/internal/SLICE_CAPE_RETURN_02_POLICY_MODULE.md`

## Geplante Tests

- `node tests/run-single.mjs tests/vpw-return-policy.test.mjs`
- `npm run build:engine`
- `npm test`, sofern fokussierte Tests und Build erfolgreich sind

## Durchgefuehrte Aenderungen

- `engine/config.mjs` erweitert `SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY` mit Default `legacy_step`.
- `engine/config.mjs` ergaenzt `CONFIG.CAPE_CONTINUOUS` mit Default-CAPE, CAPE-Grenzen, Equity-/Portfolio-Clamps, Premium-Adjustment und Safe-Rate-Modus.
- `engine/planners/vpw-return-policy.mjs` neu angelegt:
  - `normalizeVpwReturnPolicyOptions()`
  - `deriveCAPEContinuousReturn()`
  - `deriveCAPELegacyStepReturn()`
  - `deriveVpwExpectedRealReturn()`
- Continuous-Policy normalisiert CAPE vor jeder Rechnung und meldet `capeInputStatus`.
- Safe-Rate kommt bevorzugt aus Kontext oder Dynamic-Flex-Konfiguration und meldet immer `safeRealReturnSource`.
- Dispatcher erhaelt den bestehenden CAPE-Alias-Fallback: `capeRatio: 0` kann auf `marketCapeRatio` ausweichen.
- Gold- und Safe-Beitraege werden nur mit positiver Zielgewichtung in die Portfolio-Rendite eingerechnet; fehlende Gold-Konfiguration faellt transparent auf `0` mit `goldRealReturnSource='fallback_zero'` zurueck.
- `tests/vpw-return-policy.test.mjs` neu angelegt und deckt Referenz-CAPEs, Monotonie, Invalid-Fallbacks, Clamps, Dispatcher, Legacy-Formel sowie aktive/inaktive Gold-Pfade ab.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/vpw-return-policy.test.mjs`
  - Ergebnis: erfolgreich
  - 100 Assertions, 100 bestanden, 0 fehlgeschlagen
- `npm run build:engine`
  - Ergebnis: erfolgreich
  - Hinweis: Fallback-Build ohne `esbuild`; keine zusaetzliche Git-Aenderung an `engine.js`
- `npm test`
  - Ergebnis: erfolgreich
  - 92 Testdateien, 2482 Assertions, 2482 bestanden, 0 fehlgeschlagen

## Abweichungen vom Plan

- Keine fachliche Abweichung.
- Die Datei ist als globaler Slice `SLICE_CAPE_RETURN_02_POLICY_MODULE.md` benannt, weil Paket 1 bereits den Contract/Fachentscheid beschreibt. Inhaltlich ist dies Paket 2, erster Implementierungsslice.

## Offene Risiken

- Continuous ist in diesem Slice noch nicht in der Engine verdrahtet; Integrationsrisiken werden in Slice 3 behandelt.
- Kalibrierung bleibt fachlich reviewpflichtig und wird erst mit Vergleichsreport belastbar.
- CAPE < 12.5 erzeugt wegen Equity-Clamp ein Plateau; das ist konservativ, muss aber in Paket 5 im Backtest-Vergleich sichtbar gemacht werden.

## Rueckdokumentation

- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md` wurde mit Branch-/Slice-Status fuer Paket 2 aktualisiert.

## Freigabestatus

Review durch Gemini durchgeführt. Status: **freigegeben** (alle Findings erfolgreich behoben).

## Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - Plateau-Bildung bei CAPE < 15.38 (durch den `MAX_EQUITY_REAL_RETURN = 0.08` Deckel). Dies dämpft die erwartete Rendite im Vergleich zur Legacy-Logik bei extrem niedrigen Bewertungen.
- **Pre-Mortem:**
  - Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein veraltetes Profil-State-Backup aus dem Browser überschreibt die neuen Config-Keys mit `null`, wodurch `normalizeCape` lautlos auf `DEFAULT_CAPE` (20) zurückfällt und ein eigentlich günstiges Marktumfeld fälschlicherweise defensiv bewertet wird.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| B1 | Gemini | `NaN`-Ausbreitung bei fehlender Gold-Konfiguration | angenommen | erledigt: `resolveGoldRealReturn()` mit `fallback_zero`, Beitragsrechnung nur bei positiver Gewichtung |
| B2 | Gemini | Keine Unit-Tests für `goldAktiv: true` in der Policy | angenommen | erledigt: Tests fuer inaktives Gold mit fehlender Config, aktives Gold mit eigener Rendite und Legacy-Gold-Fallback |

## Review-Antworten von Codex

### Antwort auf B1

Angenommen. `deriveCAPEContinuousReturn()` und `deriveCAPELegacyStepReturn()` verwenden jetzt eine explizite Gold-Return-Aufloesung. Ist weder Kontext noch Dynamic-Flex-Konfiguration endlich numerisch, wird `goldRealReturn=0` mit `goldRealReturnSource='fallback_zero'` gesetzt. Zusaetzlich werden `goldContribution` und `safeContribution` nur bei positiver Gewichtung multipliziert, sodass `0 * undefined` nicht mehr entstehen kann.

### Antwort auf B2

Angenommen. `tests/vpw-return-policy.test.mjs` enthaelt jetzt zusaetzliche Gold-Tests:

- inaktives Gold mit fehlender Gold-Konfiguration bleibt endlich und diagnostiziert `fallback_zero`
- aktives Gold mit 20% Zielgewicht und expliziter Goldrendite prueft Gewichtungen, Einzelbeitraege und Gesamtrendite
- Legacy-Gold-Pfad bleibt ebenfalls endlich, wenn die Gold-Konfiguration fehlt
