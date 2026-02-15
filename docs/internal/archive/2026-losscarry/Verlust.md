# Implementierungskonzept: Verlustverrechnungstopf + Günstigerprüfung

## 1. Ziel und Scope

Dieses Konzept beschreibt die technische Umsetzung von:

1. Verlustverrechnungstopf für Kapitalerträge (jahresübergreifend).
2. Optionaler Günstigerprüfung (Vergleich Abgeltungsteuer vs. tarifliche Einkommensteuer).

Ziel ist eine robuste Integration in:

- Balance-App (jährlicher Echtbetrieb mit Persistenz)
- Simulator (Backtest, Monte Carlo, Sweep; run-lokale Fortschreibung)
- Profilverbund (pro Profil eigener Zustand, ohne zusätzliche Optimierung in Phase 1-4)


## 2. Bewertung der externen Kritik

Die vorliegende Kritik ist in den Kernpunkten fachlich und architektonisch zutreffend. Dieses Dokument wurde entsprechend angepasst.

Übernommene Verbesserungen:

1. `taxState` wird **in** `lastState` geführt (`lastState.taxState`), nicht als separater Top-Level-Key.
2. Verlustverrechnung wird als **Jahresaggregation** umgesetzt (Settlement-Schritt), nicht innerhalb der einzelnen Sale-Berechnung.
3. Start mit **einem** Verlusttopf (`lossCarry`) statt zwei Töpfen.
4. `spbUsedThisYear` wird **nicht** persistiert (nur transient im Jahresergebnis/Diagnose).
5. Profilverbund-Optimierung nach Verlusttopf wird für Phase 1-4 explizit ausgeschlossen.
6. GGP-MVP wird konkretisiert: entweder `zvE`+Tarifformel oder auf spätere Phase verschieben.
7. Simulator bekommt zusätzlich eine klare Mehrwertmetrik (`taxSavedByLossCarry`).

Offene Designentscheidung (hier festgelegt):

- **Settlement-Timing:** Für Phase 1-3 wird **Option A (konservativ)** gewählt.
- Das heißt: Entnahmeplanung bleibt zunächst mit bestehender Steuerabschätzung kompatibel, Verlustvortragsvorteile werden im Jahres-Settlement nachgelagert verrechnet.
- Effekt: mögliche leichte Überentnahme im Jahr der Realisierung; Vorteil materialisiert als höheres Restvermögen und wirkt in Folgejahren.
- Diese Modellgrenze wird dokumentiert und in Phase 4+ optional auf Option B (integrierte Planung mit taxState) ausbaubar gehalten.

Zusätzliche Festlegungen (v4):

- **TQF-Behandlung im Modell:** Für das Standardmodell wird TQF symmetrisch auf positive und negative Fonds-Erträge angewendet (`taxableAfterTqfSigned = realizedGainSigned * (1 - tqf)`), da das zur InvStG-Logik der Teilfreistellung passt.
- **Sonderfallgrenze:** Übergangs- und Alt-Anteile-Sonderfälle (z. B. §56 InvStG) werden im MVP nicht separat modelliert; dieser Scope ist explizit außerhalb Phase 1-4.
- **Simulator-Notfallverkäufe:** Müssen in denselben Settlement-Pfad einfließen wie reguläre Verkäufe (kein blinder Fleck).
- **Steuerquelle im Simulator:** Bei verfügbarem Settlement-Ergebnis gilt ausschließlich Settlement-Steuer; keine Rekonstruktion aus `quellen[].steuer`.
- **Teststrategie Legacy vs. Settlement:** Option A wird gewählt: `calculateSaleAndTax` behält ein Legacy-Feld `steuerGesamt` als Plansteuer (Kompatibilität), während Settlement die verbindliche Jahressteuer liefert.


## 3. Ist-Analyse (Code-Stand)

### 3.1 Steuerlogik heute

- Kernberechnung Verkäufe/Steuer: `engine/transactions/sale-engine.mjs`
- Orchestrierung: `engine/transactions/transaction-action.mjs`, `engine/core.mjs`
- Simulationsintegration: `app/simulator/simulator-engine-direct.js`
- Balance-Persistenz: `app/balance/balance-storage.js`, `app/balance/balance-main.js`

Aktuelles Verhalten:

- Abgeltungsteuer pauschal über `keSt = 0.25 * (1 + 0.055 + kiSt)`.
- SPB und TQF sind vorhanden.
- Verluste werden faktisch weggeclamped (`Math.max(0, ...)`), kein Verlustvortrag.
- Keine Günstigerprüfung implementiert.

### 3.2 Persistenz heute

- Balance speichert `{ inputs, lastState }` unter `CONFIG.STORAGE.LS_KEY`.
- `lastState` kann bei größeren Input-Änderungen zurückgesetzt werden (`shouldResetGuardrailState`).
- Simulator führt State run-lokal fort (`simState = result.newState`), ohne globale Persistenz.

Schlussfolgerung:

- Technische Vorleistung ist hoch.
- Es fehlt ein klarer, zentraler Jahres-Settlement-Schritt für Steuern.
- Persistenz ist geeignet, wenn `taxState` als Teil von `lastState` geführt und beim Guardrail-Reset bewusst erhalten wird.


## 4. Fachliches Zielmodell

### 4.1 Persistenter Steuerzustand in `lastState`

Neues Feld:

```js
lastState.taxState = {
  lossCarry: 0            // jahresübergreifender Verlustvortrag
}
```

Nicht persistent (nur transient pro Jahr):

- `spbUsedThisYear`
- `taxBeforeLossCarry`
- `taxAfterLossCarry`
- `taxSavedByLossCarry`

### 4.2 Verlustverrechnung als Jahres-Settlement

Prinzip:

1. Sales liefern nur Rohgrößen pro Transaktion:
  - `realizedGainSigned`
  - `taxableAfterTqfSigned`
2. Nach allen Sales eines Jahres wird ein zentraler Settlement-Schritt ausgeführt.
3. Dieser Schritt verrechnet Verlustvortrag, SPB und Steuerbasis in konsistenter Reihenfolge.

Damit wird Reihenfolgeabhängigkeit einzelner Sales vermieden.

Verrechnungsreihenfolge im Settlement (verbindlich):

1. Jahreswerte aus allen Sales summieren (`taxableAfterTqfSigned`).
2. Bestehenden `lossCarry` gegen positive Jahresbasis anrechnen.
3. SPB auf den verbleibenden positiven Rest anwenden.
4. Auf die verbleibende Basis Steuer berechnen.
5. Negativen Rest als neuen `lossCarry` ins Folgejahr vortragen.

Negativer Jahressaldo (explizit):

- `taxDue = 0`.
- `lossCarry` erhöht sich um den absoluten negativen Jahresrest.
- `spbUsedThisYear = 0`; SPB verfällt in diesem Jahr ungenutzt.
- Diagnosehinweis: "SPB nicht genutzt, da kein positiver Kapitalertrag nach Verlustverrechnung."

TQF-Regel (verbindlich im Modell):

- `taxableAfterTqfSigned = realizedGainSigned * (1 - tqf)` für beide Vorzeichen.
- Hinweis: Spezielle Ausnahmen aus der Alt-Anteile-Übergangslogik (z. B. §56 InvStG) sind im MVP nicht abgebildet.

### 4.3 Günstigerprüfung (klarer Scope)

Für Phase 1-4: **keine** aktive GGP.

Für spätere Aktivierung (Phase 4):

- Option A (empfohlen): Input `zvEExCapital` (zvE ohne Kapitalerträge) + Tariffunktion für relevantes Steuerjahr.
- Option B: GGP deaktiviert lassen, bis Tarifmodell implementiert ist.

Ein manuelles Feld `personalTaxRateApprox` als alleinige Grundlage wird verworfen (zu ungenau/irreführend).


## 5. Zielarchitektur und Änderungen pro Modul

## 5.1 Engine-Ebene

### `engine/transactions/sale-engine.mjs`

Aufgabe bleibt: Sale-Mengen, Netto/Brutto, Roh-Steuerkomponenten.

Neue/angepasste Rückgabefelder je Breakdown/Result:

- `realizedGainSigned`
- `taxableAfterTqfSigned`
- `gainQuotePlan` (für Mengensteuerung, geclamped `>= 0`, intern)
- `gainQuoteSigned` (für Steuer-Rohdaten, mit Vorzeichen, intern/diagnostisch)

Wichtig:

- Keine finale Verlusttopf-Verrechnung hier.
- Keine finale SPB-Verrechnung hier.
- Keine finale Jahressteuerentscheidung hier.

SPB-Entscheidung für Verkaufsmengen (festgelegt):

- Für Mengen-/Refill-Berechnung bleibt eine **SPB-Schätzung** in `sale-engine` zulässig, um bestehendes Verkaufsverhalten stabil zu halten.
- Steuerlich verbindlich ist ausschließlich das Jahres-Settlement.
- Potenzielle Differenz (Plansteuer vs. Settlement-Steuer) wird als konservative Modellabweichung akzeptiert und diagnostisch ausweisbar gemacht.

Zwei-Gewinnquoten-Regel (verbindlich):

- `gainQuotePlan = max(0, (mv-cb)/mv)` nur für Netto-aus-Sale-Kapazität.
- `gainQuoteSigned = (mv-cb)/mv` für Roh-Steuerdaten (`realizedGainSigned`, `taxableAfterTqfSigned`).
- Damit wird verhindert, dass negative Gewinnquoten die Mengenlogik numerisch verzerren.

### Neues Modul `engine/tax-settlement.mjs`

Neues zentrales Modul für Jahressteuerabschluss.

Input:

- `taxStatePrev`
- aggregierte Sale-Rohdaten des Jahres
- `sparerPauschbetrag`
- `kirchensteuerSatz`

Output:

- `taxDue`
- `taxStateNext` (mit aktualisiertem `lossCarry`)
- Diagnosewerte (`taxBeforeLossCarry`, `taxAfterLossCarry`, `spbUsedThisYear`, `taxSavedByLossCarry`)

Verwendung:

- Wird in `engine/core.mjs` für den regulären Engine-Pfad genutzt.
- Wird in `app/simulator/simulator-engine-direct.js` zusätzlich für außerhalb der Engine ausgelöste Notfallverkäufe genutzt.

Wichtige Präzisierung für Simulator:

- Ein rein inkrementelles "zweites Settlement" auf `taxStateNext` aus dem Engine-Result ist wegen SPB-Effekt **nicht** äquivalent zu einem Gesamt-Settlement.
- Deshalb wird im Simulator bei Notfallverkäufen ein **Gesamt-Settlement-Recompute** ausgeführt:
  1. `taxStatePrev` (vor Engine-Aufruf) merken.
  2. Engine-Rohaggregate regulärer Verkäufe aus `fullResult` lesen.
  3. Rohaggregate der Notfallverkäufe hinzufügen.
  4. Settlement einmal über die Gesamtsumme mit `taxStatePrev` rechnen.
  5. Ergebnis überschreibt das zuvor im Engine-Result enthaltene Settlement für dieses Jahr.

### `engine/transactions/transaction-action.mjs`

Änderungen:

- Sale-Rohdaten (`realizedGainSigned`, `taxableAfterTqfSigned`) in Action-Result durchreichen.
- Keine endgültige Verlusttopf-Logik in diesem Modul.

### `engine/core.mjs`

Änderungen:

1. `taxState` an genau einer Stelle defaulten: `const taxState = lastState?.taxState ?? { lossCarry: 0 };`
2. Nach `determineAction(...)` Jahres-Settlement aufrufen.
3. Steuer- und Diagnosewerte in `ui.action`/`diagnosis` anreichern.
4. `newState.taxState = taxStateNext` setzen.
5. Rohaggregate für Simulator-Recompute exponieren, z. B. unter `ui.action.taxRawAggregate`:
   - `sumTaxableAfterTqfSigned`
   - `sumRealizedGainSigned`

Hinweis zum Timing (Phase 1-3):

- Settlement ist nachgelagert (Option A, konservativ).
- Entnahmeplanung wird in diesen Phasen nicht rückwirkend auf die reduzierte Steuer neu aufgerollt.

API-Vertrag (bewusst geändert):

- Ab Phase 1 ist `ui.action.steuer` die Settlement-bereinigte Jahressteuer.
- `ui.action.steuer` kann deshalb von `sum(ui.action.quellen[].steuer)` abweichen.
- Die Quellsteuern gelten als technische Sale-Rohwerte, nicht als finale Steuerlast.

Implementierungshinweis:

- `action` wird in `resultForUI` als Referenzobjekt geführt; Überschreibung von `action.steuer` nach Settlement ist beabsichtigt und im Code zu kommentieren (`ACHTUNG: settlement override`).
- Bei `action.type === 'NONE'` werden Rohaggregate explizit als 0 gesetzt; Settlement liefert `taxDue = 0`, `lossCarry` bleibt unverändert.

### `engine/validators/InputValidator.mjs`

Änderungen:

- Optionales Feld `input.lastState.taxState.lossCarry` auf `>= 0` und finite validieren.


## 5.2 Balance-App

### `app/balance/balance-storage.js`

Schema bleibt `{ inputs, lastState }`.

Migration:

- Falls `lastState` existiert und `lastState.taxState` fehlt: `lastState.taxState = { lossCarry: 0 }`.

### `app/balance/balance-main.js`

Änderungen:

- Keine neuen Top-Level-Keys.
- Beim Guardrail-Reset:
  - Guardrail-relevante Teile von `lastState` können verworfen werden,
  - `lastState.taxState` wird explizit erhalten.

Praktisch:

- Bei Reset `lastState = { taxState: prevLastState.taxState }` statt `null`.

### `app/balance/balance-guardrail-reset.js`

Änderung in Dokumentation/Verwendung:

- Diese Logik entscheidet nur über Guardrail-Historie, nicht über steuerliche Verlustvorträge.

### `app/balance/balance-renderer-action.js`

Erweiterung (Anzeige):

- Steuerzeile optional aufschlüsseln:
  - vor Verlustverrechnung
  - nach Verlustverrechnung
  - Ersparnis

Datenpfad (konkret):

- `ui.action.steuer` = finale Settlement-Steuer (Primärwert für Anzeige).
- Zusätzliche Werte unter `ui.action.taxSettlement` (oder gespiegelt in `diagnosis.keyParams.taxSettlement`).
- Renderer nutzt bei Vorhandensein immer Settlement-Werte; sonst Fallback auf bisherige Einzelfelder.


## 5.3 Profilverbund

### `app/balance/balance-main-profilverbund.js`

Änderungen:

- Pro Profil bleibt `lastState.taxState` im jeweiligen Profil-State erhalten.
- Beim Persistieren: `inputs` + `lastState` unverändert speichern.

Nicht Teil von Phase 1-4:

- Keine zusätzliche Entnahmeoptimierung anhand Verlustvorträgen.

### `app/profile/profilverbund-balance.js`

In Phase 1-4 keine algorithmische Änderung an Verteilungsheuristiken.


## 5.4 Simulator (Backtest/MC/Sweep)

### `app/simulator/simulator-engine-direct.js`

Änderungen:

- `currentState.lastState.taxState` an Engine übergeben.
- `newState.lastState.taxState` pro Jahr fortschreiben (über Engine-Resultat).
- Log-Erweiterung:
  - `lossCarryEnd`
  - `taxSavedByLossCarry`

Kritische Interaktion (verbindlich zu beheben):

- Direkte Notfallverkäufe (`calculateSaleAndTax(...)` außerhalb Engine) müssen Roh-Steuerdaten sammeln.
- Danach Gesamt-Settlement-Recompute über **alle** Verkäufe des Jahres (regulär + notfallbedingt) mit dem ursprünglichen `taxStatePrev`.
- `totalTaxesThisYear` wird aus Settlement übernommen, nicht aus rekonstruierten `quellen[].steuer`.
- Voraussetzung: Engine liefert Rohaggregate regulärer Verkäufe im Jahresresultat (`ui.action.taxRawAggregate` o. ä.).

### `app/simulator/simulator-engine-helpers.js`

Änderung:

- Initialisierung mit `lastState: { taxState: { lossCarry: 0 } }`.

### `app/simulator/simulator-backtest.js`
### `app/simulator/monte-carlo-runner.js`
### `app/simulator/sweep-runner.js`

Änderungen:

- Keine globale Persistenz notwendig.
- Sicherstellen, dass `simState.newState` inkl. `lastState.taxState` durchgereicht wird.

Zusatznutzen:

- MC- und Sweep-Aggregate um `taxSavedByLossCarry` erweitern (Median/P10/P90 oder Mittelwert).


## 6. Testkonzept

### 6.1 Engine-Tests

Erweitern/neu:

- Bestehende `tests/transaction-tax.test.mjs` (7 Fälle):
  - bleiben bestehen und prüfen weiterhin `steuerGesamt` als Plansteuer-Kompatibilitätsfeld,
  - erhalten Klarstellung, dass finale Jahressteuer aus Settlement stammt.

- `tests/transaction-tax.test.mjs`
  - Verlustjahr erzeugt `lossCarry`.
  - Folgejahr nutzt `lossCarry` korrekt.
  - SPB-Reihenfolge im Settlement korrekt.
  - Jahr ohne Verkäufe: `lossCarry` unverändert.
  - Jahr mit positiven Erträgen <= SPB: `lossCarry` unverändert.
  - Verlusttranche testet Zwei-Gewinnquoten-Regel (`gainQuotePlan` vs. `gainQuoteSigned`).
  - TQF-Symmetrie bei Verlust explizit geprüft.

- Neues File `tests/tax-settlement.test.mjs`
  - Reihenfolgeunabhängigkeit bei mehreren Sales im selben Jahr.
  - Keine negative Steuerbasis.
  - `lossCarry` nie negativ.
  - Teilweiser Verbrauch von `lossCarry`.
  - Vollständiger Verbrauch + erneute Verluste im Folgejahr.
  - Negativer Jahressaldo -> `taxDue = 0`, `spbUsedThisYear = 0`, `lossCarry` steigt.
  - Bestehender `lossCarry` + neuer negativer Jahressaldo -> additive Fortschreibung.
  - Exakter Aufbrauch von `lossCarry` (Floating-Point-Robustheit um 0).
  - `SPB > Restgewinn nach Verlustverrechnung` -> `taxDue = 0`, kein SPB-Vortrag.
  - Pure-Function-Test: Inputobjekte werden nicht mutiert.

- Neues/erweitertes Core-Integrationstestfile (z. B. `tests/core-tax-settlement.test.mjs`)
  - End-to-End `core.mjs`: `lastState.taxState.lossCarry` wird korrekt fortgeschrieben.
  - `ui.action.steuer` ist Settlement-Steuer.
  - `ui.action.taxRawAggregate` ist konsistent.
  - `lastState: {}` (ohne `taxState`) initialisiert robust auf Default.

### 6.2 Balance-Tests

- `tests/balance-storage.test.mjs`
  - Migration auf `lastState.taxState`.
  - Reset-Pfad erhält `taxState`.

### 6.3 Simulator-Tests

- `tests/simulator-headless.test.mjs` / `tests/simulator-monte-carlo.test.mjs`
  - run-lokale Fortschreibung von `lossCarry`.
  - `taxSavedByLossCarry` > 0 in geeigneten Szenarien.
  - Notfallverkauf in Verlustjahr + Gewinnjahr danach -> Settlement wirkt im Folgejahr sichtbar.
  - Bei vorhandener Settlement-Steuer wird keine abweichende Steuer aus `quellen[].steuer` rekonstruiert.
  - Gesamt-Settlement-Recompute mit konkretem Zahlenbeispiel (regulärer Gewinn + Notfallverlust).
  - Kein Notfallverkauf -> kein Recompute, Engine-Settlement bleibt unverändert.
  - MC-Aggregation `taxSavedByLossCarry` bei fixem Seed deterministisch reproduzierbar.


## 7. Schrittplan (Implementierungsreihenfolge)

## Phase 1: Jahres-Settlement für Verlustvortrag

1. Neues Modul `engine/tax-settlement.mjs` anlegen.
2. `sale-engine.mjs` um Rohgrößen erweitern.
3. `core.mjs` verbindet Action-Ergebnis mit Settlement und schreibt `newState.taxState`.
4. Build-Integration sicherstellen (`build-engine.mjs`/Entrypoint-Import prüfen und anpassen).
5. Engine-Tests ergänzen.
6. Feature-Toggle: **kein Toggle**; Standard ist aktiv, `lossCarry = 0` wirkt als No-Op.

Abnahmekriterium:

- Verlustvortrag wirkt korrekt über mindestens 3 Jahre inkl. Teilverbrauch/Vollverbrauch.
- Ergebnis ist unabhängig von Reihenfolge einzelner Sales.
- Jahr ohne Verkäufe lässt `lossCarry` unverändert.
- Negativer Jahressaldo führt zu `taxDue = 0` und erhöhtem `lossCarry`.
- `lossCarry` wird nie negativ (inkl. Rundungsrobustheit).

## Phase 2: Balance-Persistenz/Reset sauber machen

1. Migration in `balance-storage.js`.
2. Reset-Pfad in `balance-main.js` so anpassen, dass `lastState.taxState` erhalten bleibt.
3. UI-Diagnose um Steuerersparnis ergänzen.
4. Snapshot-/Import-Export-Kompatibilität im selben Schritt testen.

Abnahmekriterium:

- Jahresupdate, Reload, Snapshot-Restore behalten Verlustvortrag konsistent.

## Phase 3: Simulator-End-to-End

1. `simulator-engine-direct.js` + Helper auf `lastState.taxState` umstellen.
2. Notfallverkaufs-Pfad auf gemeinsames Jahres-Settlement umstellen.
3. Steuerquelle im Simulator auf Settlement-Werte priorisieren (kein `quellen[]`-Reconstruct bei vorhandener Settlement-Steuer).
4. Backtest/MC/Sweep-Logs um `lossCarryEnd` und `taxSavedByLossCarry` erweitern.
5. Aggregatmetriken ergänzen.
6. Handbuch-/FAQ-Hinweise zur konservativen Timing-Annahme ergänzen.

Abnahmekriterium:

- Bei unverändertem Markt-/Inputfall ohne Verluste bleibt Verhalten stabil; Steuerdifferenz ist auf Modellabweichung durch SPB-Schätzung begrenzt (max. `SPB * keSt` pro Jahr).
- Bei Verlustszenarien sichtbare und plausible Steuerersparnis.

## Phase 4 (optional): Günstigerprüfung

1. Eingabe `zvEExCapital` (und ggf. Veranlagungsart) ergänzen.
2. Tariffunktion pro Zieljahr implementieren (Versionierung nach Jahrgang).
3. Vergleich `taxFlat` vs `taxTariff` im Settlement.
4. UI/Diagnose um Entscheidungsgrund erweitern.
5. Optional: Übergang von Timing-Option A zu Option B (Entnahmeplanung nutzt taxState vorab).

Abnahmekriterium:

- GGP-Ergebnis deterministisch nachvollziehbar, nicht nur heuristisch.


## 8. Daten- und Persistenzbewertung

### Balance-App

- Voll sinnvoll persistierbar über `lastState.taxState`.
- Kritischer Punkt ist allein der Reset-Pfad; dieser muss steuerlichen Zustand erhalten.

### Simulator

- Run-lokale Fortschreibung reicht methodisch aus.
- Kein Bedarf an globaler Persistenz zwischen Simulationen.

### Profilverbund

- Pro Profil separater `lastState.taxState` ist fachlich konsistent.
- Optimierte Entnahme nach Topfzustand ist bewusst nicht Teil der ersten Ausbaustufen.


## 9. Realitätsgrad und Grenzen

Mit diesem Konzept erreichbar:

- Solide Praxisnähe für Standard-ETF/Gold-Entnahmeszenarien.
- Konsistente jahresübergreifende Verlustverrechnung.
- Sichtbarer Nutzeneffekt durch `taxSavedByLossCarry`.

Bewusste Grenzen:

- Keine vollständige Abbildung aller Sonderregeln/Produktklassen.
- Keine vollständige Veranlagungssimulation (Sonderausgaben, außergewöhnliche Belastungen etc.).
- GGP erst bei ausreichender Inputtiefe aktivieren.
- Gold-Verluste werden im MVP vereinfachend im selben Verlusttopf geführt; steuerlich wäre hierfür eine getrennte Behandlung (privates Veräußerungsgeschäft) differenzierter.


## 10. Risiken und Gegenmaßnahmen

1. Risiko: Regression durch neue Steuerpipeline.
- Maßnahme: additive Felder, bestehende API-Felder erhalten, fokussierte Regressionstests.

2. Risiko: Reset löscht versehentlich Steuerzustand.
- Maßnahme: explizite Regel `taxState survives reset` + Testabdeckung.

3. Risiko: GGP wirkt scheinpräzise.
- Maßnahme: GGP nur mit zvE+Tarifformel aktivieren, sonst deaktiviert lassen.

4. Risiko: Konservative Timing-Annahme erzeugt systematische Überentnahme im laufenden Jahr.
- Maßnahme: transparent dokumentieren; ggf. später Option B implementieren.


## 11. Definition of Done

1. Verlustvortrag ist als `lastState.taxState.lossCarry` in Engine, Balance, Simulator wirksam.
2. Balance-Reset erhält `taxState`.
3. Backtest/MC/Sweep führen `taxState` pro Run konsistent fort.
4. Logs und Aggregate zeigen `taxSavedByLossCarry`.
5. GGP ist entweder sauber via Tarifmodell umgesetzt oder explizit noch deaktiviert.

## 12. FAQ (Implementierung)

**Warum kann `ui.action.steuer` von `sum(quellen[].steuer)` abweichen?**  
`quellen[].steuer` sind Sale-Roh-/Planwerte. Verbindlich ist das Jahres-Settlement; daher ist `ui.action.steuer` die finale Steuer.

**Warum wird im Simulator bei Notfallverkäufen ein Recompute gemacht?**  
Die Engine hat ihr Settlement bereits vor dem Notfallverkauf gerechnet. Damit SPB und Verlusttopf korrekt über alle Verkäufe des Jahres wirken, wird ein Gesamt-Settlement mit dem ursprünglichen `taxStatePrev` neu gerechnet.

**Ist das nachgelagerte Settlement (Option A) ein Modellfehler?**  
Es ist eine bewusste konservative Vereinfachung: mögliche Überentnahme im laufenden Jahr, dafür höheres Restvermögen und Vorteil in Folgejahren. Für höhere Präzision ist später Option B (Steuerzustand in Entnahmeplanung) möglich.

**Braucht die Erweiterung neue Nutzereingaben?**  
Nein, für Verlusttopf/Settlement nicht. GGP bleibt in Phase 1-4 deaktiviert und würde erst mit zusätzlichem `zvE`-Input aktiviert.

**Wie bleibt die Build-Qualität für Releases stabil?**  
Für CI/Release wird Strict-Build empfohlen (`npm run build:engine:strict`). Dann schlägt der Build ohne `esbuild` bewusst fehl.
