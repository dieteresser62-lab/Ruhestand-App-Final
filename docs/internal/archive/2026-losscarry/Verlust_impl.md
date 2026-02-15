# Implementierungsplan: Verlustverrechnung & Settlement

Dieses Dokument ist der operative Umsetzungsplan auf Basis von `Verlust.md`.

## 0. Zielbild (kurz)

Nach Abschluss gilt:

- `lastState.taxState.lossCarry` wird über Jahre konsistent fortgeführt.
- Finale Steuerlast je Jahr kommt aus Settlement, nicht aus Sale-Einzelwerten.
- Simulator verarbeitet reguläre und Notfallverkäufe steuerlich konsistent via Gesamt-Settlement-Recompute.
- Bestehende Sale-Engine-Tests bleiben kompatibel (Legacy-Plansteuer), neue Settlement-/Integrations-Tests sichern das neue Verhalten ab.


## 1. Vorbereitungen

1. Branch erstellen (z. B. `feature/loss-carry-settlement`).
2. Status erfassen:
- `npm test` einmal laufen lassen und grünen Baseline-Stand dokumentieren.
3. Technisches Ziel-Review:
- `Verlust.md` final lesen, keine offenen Designfragen mehr zulassen.
4. Implementierungsreihenfolge fixieren:
- Erst Engine-Kern, dann Balance-Persistenz, dann Simulator-Recompute, zuletzt Tests nachschärfen.


## 2. Phase 1: Engine-Kern (Settlement + Rohdaten)

## 2.1 Neues Modul `engine/tax-settlement.mjs`

### Aufgabe
Pure Function für Jahressteuerabschluss einführen.

### Schritte
1. Datei `engine/tax-settlement.mjs` anlegen.
2. API definieren, z. B.:
```js
settleTaxYear({
  taxStatePrev,
  rawAggregate,
  sparerPauschbetrag,
  kirchensteuerSatz
}) => {
  taxDue,
  taxStateNext,
  details
}
```
3. Rohaggregate unterstützen:
- `sumTaxableAfterTqfSigned`
- `sumRealizedGainSigned`
4. Reihenfolge strikt implementieren:
- Jahresbasis summieren
- `lossCarry` verrechnen
- SPB anwenden
- Steuer berechnen
- negativen Rest in `lossCarry` vortragen
5. Nicht-Mutation sicherstellen:
- `taxStatePrev` niemals in-place ändern.

### Definition of Done
- Modul ist deterministisch und seiteneffektfrei.
- `taxDue >= 0`, `lossCarry >= 0` immer garantiert.


## 2.2 Sale-Engine erweitern: Rohdaten statt finaler Jahreswahrheit

### Betroffene Datei
- `engine/transactions/sale-engine.mjs`

### Schritte
1. Rohfelder je Sale/Breakdown ergänzen:
- `realizedGainSigned`
- `taxableAfterTqfSigned`
2. Zwei Gewinnquoten sauber trennen:
- `gainQuotePlan = max(0, (mv-cb)/mv)` (Mengenplanung)
- `gainQuoteSigned = (mv-cb)/mv` (Roh-Steuerdaten)
3. TQF-Regel symmetrisch anwenden:
- `taxableAfterTqfSigned = realizedGainSigned * (1 - tqf)`
4. SPB in `sale-engine` nur als Plan-/Mengenhilfe belassen (falls benötigt), nicht als finale Jahreslogik.
5. Legacy-Kompatibilität beibehalten:
- `steuerGesamt` weiterhin als Plansteuer liefern (bestehende Tests/API nicht abrupt brechen).

### Definition of Done
- Bestehende Aufrufer brechen nicht.
- Rohdaten pro Verkauf sind vorhanden und plausibel.


## 2.3 Action-Layer um Rohaggregate ergänzen

### Betroffene Datei
- `engine/transactions/transaction-action.mjs`

### Schritte
1. Rohwerte aus Sale-Breakdown aggregieren:
- `sumTaxableAfterTqfSigned`
- `sumRealizedGainSigned`
2. Struktur in Action aufnehmen (z. B. `action.taxRawAggregate`).
3. Bestehende Felder unverändert lassen, damit UI nicht regressiert.

### Definition of Done
- `action.taxRawAggregate` immer vorhanden (bei `NONE` auf 0 setzen).


## 2.4 Core-Orchestrierung um Settlement erweitern

### Betroffene Datei
- `engine/core.mjs`

### Schritte
1. Einzigen Defaulting-Punkt setzen:
```js
const taxState = lastState?.taxState ?? { lossCarry: 0 };
```
2. Nach `determineAction(...)` Settlement aufrufen.
3. Settlement-Ergebnis in Resultat schreiben:
- `newState.taxState = taxStateNext`
- `ui.action.steuer = taxDue` (Settlement-Steuer)
- `ui.action.taxSettlement = details`
- `ui.action.taxRawAggregate = {...}`
4. `action.type === 'NONE'` explizit behandeln:
- Raw-Aggregate = 0
- `taxDue = 0`
- `lossCarry` unverändert.
5. Kommentar im Code ergänzen:
- `action.steuer` wird bewusst nach Settlement überschrieben.

### Definition of Done
- Core liefert finale Steuer aus Settlement.
- API-Vertrag klar und stabil.


## 2.5 Input-Validierung aktualisieren

### Betroffene Datei
- `engine/validators/InputValidator.mjs`

### Schritte
1. Optionalen Pfad validieren:
- `input.lastState.taxState.lossCarry` finite und `>= 0`.
2. Keine harten Fehler bei `lastState: {}` ohne `taxState`.

### Definition of Done
- Null/Undefined/Leere States robust.


## 2.6 Build-Integration

### Betroffene Datei(en)
- `build-engine.mjs`
- ggf. `engine/index.mjs`

### Schritte
1. Sicherstellen, dass `engine/tax-settlement.mjs` in den Bundle-Pfad gelangt.
2. Build laufen lassen, Browser-Entry prüfen.

### Definition of Done
- `engine.js` enthält Settlement-Pfad.

Hinweis zur Reihenfolge:
- Ein früher Smoke-Check direkt nach Anlegen von `engine/tax-settlement.mjs` ist sinnvoll.
- Der endgültige Build-Nachweis ist erst möglich, sobald Imports in `core.mjs`/Entrypoint verdrahtet sind.


## 3. Phase 2: Balance-App Persistenz & Darstellung

## 3.1 Storage-Migration

### Betroffene Datei
- `app/balance/balance-storage.js`

### Schritte
1. Migration ergänzen:
- Falls `lastState` existiert und `lastState.taxState` fehlt: `{ lossCarry: 0 }` setzen.
2. Keine neuen Top-Level-Keys einführen.

### Definition of Done
- Alte Speicherstände funktionieren ohne manuellen Eingriff.


## 3.2 Reset-Verhalten anpassen

### Betroffene Datei
- `app/balance/balance-main.js`

### Schritte
1. Guardrail-Reset so ändern, dass `taxState` erhalten bleibt.
2. Praktisch:
- statt `lastState = null` -> `lastState = { taxState: prevTaxState }`.

### Definition of Done
- Verlusttopf überlebt Reset korrekt.


## 3.3 Renderer/Diagnose anbinden

### Betroffene Datei
- `app/balance/balance-renderer-action.js`

### Schritte
1. Primärwert anzeigen:
- `ui.action.steuer` (Settlement-Wert).
2. Optional detaillieren:
- vor/nach Verlustverrechnung
- `taxSavedByLossCarry`
3. Fallback robust halten, falls Felder fehlen.

### Definition of Done
- UI zeigt finale Steuer nachvollziehbar.


## 4. Phase 3: Simulator-End-to-End inkl. Notfallpfad

## 4.1 State-Fortschreibung

### Betroffene Dateien
- `app/simulator/simulator-engine-direct.js`
- `app/simulator/simulator-engine-helpers.js`

### Schritte
1. `lastState.taxState` in Simulationsstate sicher führen.
2. Default in Initialisierung: `{ lossCarry: 0 }`.
3. Nach jedem Jahr `newState.lastState.taxState` übernehmen.

### Definition of Done
- Run-lokale Fortschreibung stabil.


## 4.2 Gesamt-Settlement-Recompute bei Notfallverkäufen

### Betroffene Datei
- `app/simulator/simulator-engine-direct.js`

Voraussetzung:
- Phase 1 (insbesondere 2.2/2.3) ist umgesetzt, damit `calculateSaleAndTax`/Action-Rohdaten (`realizedGainSigned`, `taxableAfterTqfSigned`, `taxRawAggregate`) verfügbar sind.

### Schritte
1. Vor Engine-Aufruf `taxStatePrev` merken.
2. Engine laufen lassen -> reguläre `taxRawAggregate` lesen.
3. Falls Notfallverkauf erfolgt:
- Notfall-Rohdaten aggregieren,
- regulär + notfall zu Jahresgesamtwerten addieren,
- Settlement **neu** mit `taxStatePrev` rechnen,
- Engine-Settlement für dieses Jahr überschreiben.
4. Falls kein Notfallverkauf:
- Engine-Settlement unverändert übernehmen.

### Definition of Done
- Kein inkrementelles Fehl-Settlement durch SPB.


## 4.3 Steuerquelle im Simulator vereinheitlichen

### Betroffene Datei
- `app/simulator/simulator-engine-direct.js`

### Schritte
1. `totalTaxesThisYear` aus Settlement nehmen.
2. Rekonstruktion aus `quellen[].steuer` nur noch Fallback ohne Settlement-Daten.
3. Logging ergänzen:
- `lossCarryEnd`
- `taxSavedByLossCarry`

### Definition of Done
- Einheitliche Steuerbasis in Backtest/MC/Sweep.


## 4.4 MC-/Sweep-Aggregate erweitern

### Betroffene Dateien
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/sweep-runner.js`
- ggf. `app/simulator/results-metrics.js`

### Schritte
1. `taxSavedByLossCarry` pro Jahr/Run summieren.
2. Aggregierte Kennzahlen in Ergebnisdarstellung aufnehmen.
3. Seed-deterministische Reproduzierbarkeit sicherstellen.

### Definition of Done
- Kennzahl ist sichtbar und reproduzierbar.


## 5. Testplan (verbindlich)

## 5.1 Bestehende Tests stabil halten

1. `tests/transaction-tax.test.mjs` prüfen/anpassen:
- Weiterhin `steuerGesamt` als Plansteuer testen.
- Klaren Kommentar ergänzen: finale Steuer kommt aus Settlement.

## 5.2 Neue/erweiterte Engine-Tests

1. Neues `tests/tax-settlement.test.mjs`:
- Reihenfolgeunabhängigkeit
- negativer Jahressaldo
- additive lossCarry-Fortschreibung
- exakter Aufbrauch (FP-Robustheit)
- SPB > Restgewinn
- Non-Mutation
2. `tests/transaction-tax.test.mjs` erweitern:
- Zwei-Gewinnquoten-Fall
- TQF-Symmetrie bei Verlust

## 5.3 Core-Integrationstests

Neues File (z. B.) `tests/core-tax-settlement.test.mjs`:

- `lastState.taxState.lossCarry` wird korrekt fortgeschrieben.
- `ui.action.steuer` = Settlement-Steuer.
- `ui.action.taxRawAggregate` vorhanden/korrekt.
- `lastState: {}` wird robust auf Default behandelt.

## 5.4 Simulator-Integrationstests

1. Notfallverkauf-Szenario mit konkreten Zahlen:
- regulärer Gewinn + Notfallverlust -> Gesamt-Recompute korrekt.
2. Szenario ohne Notfallverkauf:
- kein Recompute, Engine-Settlement bleibt.
3. MC-Determinismustest:
- `taxSavedByLossCarry` bei fixem Seed reproduzierbar.


## 6. Rollout-Reihenfolge im Repo

1. `engine/tax-settlement.mjs`
2. `engine/transactions/sale-engine.mjs`
3. `engine/transactions/transaction-action.mjs`
4. `engine/core.mjs`
5. `engine/validators/InputValidator.mjs`
6. `build-engine.mjs` / `engine/index.mjs`
7. `app/balance/balance-storage.js`
8. `app/balance/balance-main.js`
9. `app/balance/balance-renderer-action.js`
10. `app/simulator/simulator-engine-helpers.js`
11. `app/simulator/simulator-engine-direct.js`
12. `app/simulator/monte-carlo-runner.js` / `app/simulator/sweep-runner.js`
13. Testfiles aktualisieren/ergänzen


## 7. Abnahme-Checkliste

1. Ohne Verluste verhalten sich Ergebnisse weitgehend wie vorher (Abweichung nur im vereinbarten Modellrahmen).
2. Mit Verlusten sinkt Steuer im Folgejahr sichtbar (`taxSavedByLossCarry > 0` in geeigneten Fällen).
3. `lossCarry` wird nie negativ und bleibt über Balance-Reset/Snapshot erhalten.
4. Simulator-Notfallpfad ist steuerlich konsistent (Gesamt-Recompute).
5. UI zeigt finale Settlement-Steuer (`action.steuer`) nachvollziehbar an.


## 8. Optional danach: Günstigerprüfung (separate Umsetzung)

Nicht Teil dieses Umsetzungsplans. Danach möglich:

- Eingabe `zvEExCapital`
- Tariffunktion je Steuerjahr
- Vergleich `taxFlat` vs. `taxTariff`
- Optional Option-B-Planung (Entnahmeplanung mit taxState vorab)

## 9. Abschlussstatus (Stand Umsetzung)

Abgeschlossen:

1. Engine-Settlement inkl. `lastState.taxState.lossCarry` und finaler `action.steuer`.
2. Balance-Persistenz/Reset inkl. Erhalt von `taxState`.
3. Simulator-Recompute für Notfallverkäufe inkl. konsistenter Steuerquelle.
4. Testpaket für Settlement, Core-Integration, Simulator-Recompute und UI-Anzeige.
5. Abschluss-Nachschärfungen:
- optionale Validator-Prüfung für `lastState.taxState.lossCarry`
- MC-/Worker-Aggregation für `taxSavedByLossCarry`
- Sweep-Metriken um `taxSavedByLossCarry` erweitert
- sichtbare KPI `Ø Steuerersparnis Verlusttopf` im Ergebnisdashboard

Offen:

- Keine offenen Muss-Punkte aus diesem Implementierungsplan.
