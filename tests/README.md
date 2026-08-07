# Ruhestands-Planer Testing Infrastructure

## Overview

This directory contains the comprehensive testing infrastructure for the Ruhestand-App-Final project. The tests are designed to be zero-dependency, using native Node.js ESM and a custom test runner, avoiding the need for heavy frameworks like Jest or Mocha.

**Test-Statistik:** 169 entdeckte Testdateien mit 19.382 von 19.382 erfolgreichen Assertions, 0 fehlgeschlagenen Dateien, einem bestandenen separaten Gate und 0 offenen Handles (Slice-03-Reviewkorrektur mit `npm test` am 2026-08-07 verifiziert). Das separate Browser-Pflichtgate bestand im Wiederholungslauf nach einem transienten lokalen Windows-Socketfehler mit 29/29 Workflows einschliesslich der responsiven Exaktwert-Fixture, sichtbarer langer Kartentitel und der vollstaendigen realen Simulatorseite nach einem Lauf bei 320 Pixel. Der letzte gesonderte Coverage-Lauf stammt aus der Slice-13-Nachbesserung und erreichte 78,97 Prozent Zeilenabdeckung (40.302/51.035); Coverage wurde fuer Slice 03 nicht erneut gemessen.

Die Zahl beschreibt nur die Node-Standardsuite. `npm run test:browser`, `npm run test:coverage` und ein echter Tauri-Build sind getrennte Gates und in den Assertions nicht enthalten.

## Directory Structure

- `run-tests.mjs` - Der benutzerdefinierte Test-Runner
- `run-single.mjs` - Führt eine einzelne Testdatei aus
- `legacy-assertion-loader.mjs` - Zaehlt in explizit benannten Alt-Tests lokale bzw. Node-Assertions ueber den gemeinsamen Runner-Contract
- `*.test.mjs` - Testdateien (werden automatisch vom Runner erkannt)

## How to Run Tests

### Standard-Suite
```bash
npm test
```

`npm test` fuehrt die schnelle Node-Standardsuite ueber `node tests/run-tests.mjs` aus. Die Suite enthaelt DOM-freie Engine-, Balance-, Simulator-, Profil-, Tranchen-, Persistenz-, Worker- und Tauri-Contract-Tests. Browser-Smokes und echte Tauri-Builds sind separate Gates.

Das statische Architektur-/Fachkonzept-Evidenzgate ist Teil dieser Suite und
kann zusätzlich fokussiert ausgeführt werden:

```bash
npm run docs:evidence
```

Der Befehl prüft die normativen Markt- und Forschungsregister ausschließlich
lokal auf Recordzahlen, Pflichtfelder, IDs, Anker, lokale Links,
ISO-Datumsfelder und fällige Aktualitätsscopes. Er führt keine Live-HTTP-
Prüfung durch; externe Erhebungen bleiben ein getrennt dokumentierter
Pflegeschritt.

Der Runner sortiert alle Dateien deterministisch und meldet fuer jede Datei Modus und Assertionzahl. Die Ausfuehrungspolicy steht explizit in `TEST_EXECUTION_POLICY`:

- `in-process`: DOM-freie Standardtests teilen den schnellen Hauptprozess.
- `isolated`: DOM-/Browser-Globals, Worker-Mocks oder legacy Assertion-Helper laufen in einem eigenen Kindprozess; dessen Assertionzahlen gehen in die Gesamtsumme ein.
- `separate-gate`: `browser-smoke.test.mjs` wird nicht still importiert, sondern mit dem Pflichtbefehl `npm run test:browser` ausgewiesen.

Jede tatsaechlich ausgefuehrte Datei muss mindestens eine gezaehlte Assertion liefern. Null Assertions beenden sowohl `npm test` als auch `run-single.mjs` mit Fehler. Der Legacy-Loader gilt nur fuer die im Policy-Manifest benannten Dateien; unbekannte Import-only-Tests erhalten keinen stillen Ausnahmeweg.

Der Slice-16-Integrationscontract liest alle Inputs im realen
Sweep-Ranges-Fieldset generisch und gleicht jeden sichtbaren Parameter
fail-closed mit der Traceability-Matrix ab. Witness-Gates werden gegen
`TEST_EXECUTION_POLICY` geprueft. Die Matrix belegt kanonische Zuordnung,
Consumer und Provenienz, nicht eigenstaendig eine KPI-Wirkung.

### Coverage-Baseline
```bash
npm run test:coverage
```

Der Coverage-Runner loescht `.coverage/`, startet die Standardsuite mit `NODE_V8_COVERAGE` und schreibt bei gruener Standardsuite `.coverage/summary.json`. Der Report wertet Projektdateien unter `app/`, `engine/`, `workers/` und `types/` aus. Die Messung nach der CR08-16-Nachbesserung liegt bei 78,23% approximativer Coverage aus ausfuehrbaren V8-Zeilenbereichen (39.024/49.886 Zeilen in 216 Dateien). `npm run test:coverage` erzwingt zusaetzlich ein 50-Prozent-Dateigate fuer `worker-job-runner.js` und `results-renderers.js`; ein fehlender Inventareintrag oder eine Unterschreitung beendet den Lauf rot. Playwright-Ausfuehrung fliesst nicht in diese Node-V8-Zahl ein. Der durch den neuen DOM-Vertrag teilweise in Node ausgefuehrte Orchestrierungspfad `app/simulator/simulator-sweep.js` erreicht dort 6,50%; Browseranteile bleiben ausserhalb dieser Messung. Coverage bleibt eine Risikomessung, kein Freigabe-, Wirksamkeits- oder Eignungsnachweis und insbesondere keine echte JavaScript-Statement-Metrik.

Monte-Carlo-Abschlussgate in Slice 12:

| Modul | Zeilen | Coverage |
| --- | ---: | ---: |
| `worker-job-runner.js` | 147/217 | 67,74% |
| `results-renderers.js` | 117/117 | 100,00% |

Backtest-Kernmodule im Slice-10-Abschlussgate:

| Modul | Zeilen | Coverage |
| --- | ---: | ---: |
| `historical-backtest-contract.js` | 604/779 | 77,54% |
| `historical-backtest-runner.js` | 545/610 | 89,34% |
| `historical-backtest-metrics.js` | 202/215 | 93,95% |
| `historical-backtest-cohorts.js` | 242/294 | 82,31% |
| `historical-backtest-export.js` | 205/267 | 76,78% |
| `historical-backtest-ui.js` | 265/327 | 81,04% |
| `simulator-backtest.js` | 225/313 | 71,88% |

Das Coverage-Inventar fuehrt zentrale Tranchenmodule auch bei 0% sichtbar auf und markiert einen geladenen, aber nicht ausgefuehrten Page-Pfad als `runtime-loaded-uncovered`. `app/tranches/tranchen-manager-page.js` ist im aktuellen Node-Coverage-Lauf mit 59,61% (611/1025 Zeilen) erfasst; der separate Browser-Smoke bleibt fuer echte DOM- und Navigationspfade erforderlich.

Bekannte Coverage-Ausnahmen:
- UI-nahe Renderer und Page-Module koennen trotz Browser-Smoke in der V8-Zeilenmetrik niedrig oder 0% erscheinen, wenn ihre Logik nur ueber echte Browserinteraktion relevant ist.
- Wrapper-/Re-Export-Module wie `engine/index.mjs` koennen niedrige Werte zeigen, obwohl die dahinterliegenden Kernmodule abgedeckt sind.
- Dateien ohne ausfuehrbare Zeilen werden mit `coveragePct: null` ausgewiesen und nicht als 100%-Abdeckung interpretiert.

### Browser-Smoke-Gate
```bash
npm run test:browser
```

Das Browser-Gate nutzt Playwright mit einem vom Test verwalteten lokalen HTTP-Server. Jeder Fall erhaelt einen isolierten Browser-Context und eine eigene Storage-Baseline. Neben den zentralen Einstiegspunkten (`index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html`, `Handbuch.html`) prueft es in `Balance.html` Profilabwahl nach Reload, Engine-Mismatch, mutationsfreien Jahres-Preflight, sichtbare korrupte Ausgaben, sichtbaren Import-Reject, einen Markt-CSV-Roundtrip mit periodengebundener Provenienz/`windowHigh`/sichtbarer gerichteter ATH-Untergrenze samt Anwendungsstatus/Boolean-Reload, einen Doppelklick mit genau einem Jahrescommit und Recovery-Snapshot sowie die 3-Bucket-Bear-Diagnose aus der realen Engine-Rendite. Die Simulatorfaelle warten auf fachliche Statuswerte statt auf feste Millisekunden: Sie pruefen Hybridprofile fail-closed, versionierte Sweep-Request-/Resultprovenienz mit allen sieben sichtbaren Parametern und den Evaluate-/Apply-Fingerprint des experimentellen Optimizers. Der MC-E2E-Fall prueft zusaetzlich den V2-Szenariodownload und adversarial, dass nach Szenario A ein nicht projizierbares Szenario B weder A noch einen partiellen Export herunterladen kann. Der Backtestfall reconciliiert sichtbare Periode, Outcome, Jahrinventar, exakte 10-%-Metrik, Pflegebucket und Cohort-Inventar mit Raw-JSON und deckt die Negativpfade ab. Die Tranchenkette prueft mit synthetischen Profilen A/B Manager-Handoff, CRUD, Dialogfokus und Tastaturbedienung, EUR-Quote, Reload, 390-Pixel-Layout, schreibfreie Balance-/Simulatorlaeufe, bestaetigten Reconcile genau einmal, Quote-Teilerfolg/Offline und raw-preserving Corrupt-Recovery. Inflation, Yahoo-Proxy und CAPE werden deterministisch geroutet; andere externe Requests werden blockiert. Das Gate ersetzt keine Node-Unit-Tests und laeuft bewusst getrennt von `npm test`.

Wichtig fuer CI/Release: Weil `npm test` dieses Gate nicht ausfuehrt, muss `npm run test:browser` explizit als eigener Job oder Release-Schritt laufen, wenn Browser-Regressionen blockierend sein sollen.

### Release-nahe Tauri-Gates
```bash
node tests/run-single.mjs tests/tauri-csp.test.mjs
npm run tauri:build
```

`tests/tauri-csp.test.mjs` ist Teil von `npm test` und prueft Tauri-Konfiguration, CSP, Icons, Package-Skripte und statische Rust-Command-Contracts. Sobald `src-tauri/` geaendert wird, muss zusaetzlich ein echter Tauri-/Rust-Build laufen (`npm run tauri:build` oder der manuelle Windows-Release-Pfad). Manuelle Desktop-Smokes nach EXE-Build bleiben manuelle Release-Verifikation und sind kein Ersatz fuer automatisierte Tests.

Persistenz-Hinweis: `persistence.test.mjs` simuliert IndexedDB-Upgrade-, Blocked-, Legacy-Cleanup- und Versionchange-Pfade ueber Fakes; `balance-storage-contract.test.mjs` prueft die Migration des historischen Verzeichnis-Handles in die dedizierte Handle-Datenbank. Ein echtes Chromium-Szenario mit Datenbank-Version N -> N+1 und realem Schemawechsel bleibt ein separates Browser-/Playwright-Backlog.

### Einzelne Testdatei ausführen
```bash
node tests/run-single.mjs <testfile>
# Beispiel:
node tests/run-single.mjs core-engine.test.mjs
```

`run-single.mjs` verwendet dieselbe dateibasierte Isolations-/Legacy-Assertion-Policy wie die Standardsuite und scheitert ebenfalls bei null Assertions.

### Direkte Ausführung
```bash
node tests/run-tests.mjs
```

`QUICK_TESTS=1` ist deprecated. Fuer schnelle Fehlersuche gezielt `node tests/run-single.mjs <testfile>` oder die im jeweiligen Slice dokumentierten Fokusbefehle verwenden.

## Assertions Available

Die folgenden Assertion-Funktionen werden vom Test-Runner global bereitgestellt:

- `assert(condition, message)` - Prüft ob Bedingung wahr ist
- `assertEqual(actual, expected, message)` - Prüft strikte Gleichheit
- `assertClose(actual, expected, tolerance, message)` - Prüft numerische Nähe

## Writing New Tests

1. Erstelle eine neue Datei mit dem Suffix `.test.mjs` im `tests/`-Verzeichnis
2. Die Assertions sind global verfügbar (vom Runner bereitgestellt)
3. Verwende Standard-ESM-Imports für Module
4. **Mocking:** Da das Projekt auf Browser-Globals (`window`, `document`, `localStorage`) angewiesen ist, müssen diese vor dem Import von Code gemockt werden. Siehe `simulation.test.mjs` für ein umfassendes Beispiel.

---

## Test Coverage Areas

### Neuentwicklungen seit Juni 2026

| Entwicklungsbereich | Direkte Tests | Zusaetzliche Integrations-/Paritaetsdeckung |
|---------------------|---------------|--------------------------------------------|
| Kontinuierliche Regime-Signale | `regime-signals.test.mjs` | `spending-planner.test.mjs`, Engine-/Diagnose-Contracts |
| Kontinuierliche CAPE-Return-Policy | `vpw-return-policy.test.mjs` | `core-engine.test.mjs`, `worker-parity.test.mjs`, Balance-Diagnose-Tests |
| Konservatives Langlebigkeitsmodell | `longevity-contract.test.mjs`, `longevity-horizon.test.mjs` | `longevity-engine-runner.test.mjs`, `longevity-ui-persistence.test.mjs`, `longevity-optimizer-docs.test.mjs`, `worker-parity.test.mjs` |
| Stationary Bootstrap | `stationary-bootstrap-contract.test.mjs`, `stationary-bootstrap-sampler.test.mjs` | `mc-worker-contract.test.mjs`, `worker-parity.test.mjs` |
| Tail-Risk-/Crash-Overlay | `tail-risk-contract.test.mjs`, `tail-risk-overlay.test.mjs` | `simulator-input-readers.test.mjs`, `simulator-monte-carlo.test.mjs`, `worker-parity.test.mjs` |
| Simulator-Realentnahme | `simulator-real-withdrawal-contract.test.mjs` | Drei-Jahres-Faktor, Anspar-Transition, effektive Realentnahme, MC-Stichprobe und App-/Engine-State-Spiegelung |
| Architektur-/Fachkonzept-Evidenz | `architecture-evidence.test.mjs` | `npm run docs:evidence`, offline im regulären `npm test`-Gate |
| Projektlizenz-Metadaten | `project-license-metadata.test.mjs` | MIT-Konsistenz in Lizenztext, npm-/Lockfile-Root, Cargo, README und Markt-GAP |

Die Tests sichern Contracts, Grenzwerte, Determinismus, Nicht-Mutation, Runner-Integration und Worker-/Chunk-Paritaet. Sie belegen keine empirische Kalibrierung des Tail-Risk-Modells und keine Prognoseguete gegen unbekannte kuenftige Marktdaten.

### 1. Engine Core & Validation

#### `core-engine.test.mjs`
**Zweck:** Validiert die grundlegende `EngineAPI`-Integrität und Ausgabestrukturen.
- Prüft dass `EngineAPI.simulateSingleYear()` korrekte Ergebnisobjekte liefert
- Validiert UI-Ausgabestruktur (spending, market, action, diagnosis)
- Testet Engine-Version und Build-ID

#### `engine-robustness.test.mjs`
**Zweck:** Robustheitstests gegen Edge Cases und fehlerhafte Eingaben.
- **Inflation:** Nullinflation, historische Deflation bis -15%, hohe Inflation
  bis 50% sowie out-of-range unter -15% und über 50%
- **Marktextreme:** 100% Jahresperformance, 0% Return

#### `tauri-csp.test.mjs`
**Zweck:** Contract-Test fuer Tauri-Release-Konfiguration und CSP.
- Prüft `frontendDist`, Produktname und Fensterbasis.
- Validiert erlaubte Live-Datenziele fuer Yahoo-Proxy, ECB, World Bank, OECD und CAPE via `r.jina.ai`.
- Prüft Worker-, Script-, Style- und Font-CSP sowie bewusst gesetztes `dangerousDisableAssetCspModification`.
- Stellt sicher, dass die in `tauri.conf.json` referenzierten Bundle-Icons existieren.
- **Ungültige Werte:** Negative Assets, NaN/Infinity, fehlende Pflichtfelder
- **Pflichtbedarfe:** Fehlende `floorBedarf`/`flexBedarf` werden als `ValidationError` gemeldet.
- **Grenzwerte:** Extreme hohe Werte (>100M), leeres Portfolio
- **Alter:** Out-of-range (5 Jahre, >120 Jahre)
- Stellt sicher dass ValidationErrors sauber zurückgegeben werden (kein Crash)

#### `market-analyzer.test.mjs`
**Zweck:** Validiert Markt-Diagnose-Funktionen.
- ATH-Drawdown-Erkennung
- CAPE-Bewertungssignale
- Szenario-Klassifizierung (Bear/Peak/Recovery/Hot/Sideways)
- Regime-Übergänge und -Persistenz

#### `historical-data-robustness.test.mjs`
**Zweck:** Testet Verhalten bei fehlenden oder leeren historischen Daten.
- Fallback auf SIDEWAYS-Regime wenn Daten fehlen
- Graceful degradation ohne Crash

### 2. Spending/Entnahme-Logik

#### `spending-planner.test.mjs`
**Zweck:** Validiert den SpendingPlanner im Engine.
- **Fail-Safe Alarm:** Prüft Alarm-Logik bei kritischen Withdrawal Rates
- **Flex-Rate Smoothing:** Validiert den Glättungsalgorithmus für Flex-Anteile
- **Budget Floor Protection:** Stellt sicher dass Mindest-Entnahmen geschützt sind
- **Guardrail-Integration:** Tests für Ceiling/Floor-Mechanismen
- **Mindest-Flex:** Prüft Contract, haushaltsweite Anrechnung des Rentenueberschusses, Notfall-/Runway-Blockaden, Pipeline-Ordering vor Flex-Budget/Final-Limits, finale Quantisierung und die Interaktion mit niedrigem Dynamic-Flex-Stage-2-Safety-Flex. Nicht-finite vorhandene Eingaben werden an Engine- und Simulatorgrenze abgelehnt statt auf null ersetzt.

#### `spending-safety-cap.test.mjs`
**Zweck:** Validiert `SpendingPolicyOrderV2`, normale Safety-Obergrenze und das
konjunktive Null-Flex-Gate.
- Prüft strukturelle Quellen/Anchor, Minimum- und Gleichstandsregeln sowie die
  Trennung von Textlabels und tatsaechlicher Ratenwirkung.
- Deckt die Schwellen 24,99/25,00/25,01 Prozent, Alarm an/aus,
  Entnahmebelastungsfaktor 0/1 und den C-16-Wechsel 0 -> normal -> 0 ab.
- Belegt, dass normaler Safety-Cap Mindest-Flex respektiert, die schwere
  Notlage alle Flex-Floors ueberstimmt und der Floor centgenau geschuetzt
  bleibt.
- Fehlende oder nicht-endliche Drawdowns scheitern fail-closed; ein endlicher
  negativer Vor-Peak-Wert wird als neues reales Hoch auf 0 normalisiert.

#### `spending-quantization.test.mjs`
**Zweck:** Testet die Anti-Pseudo-Accuracy-Rundungslogik für Entnahmen.
- **Tier-basierte Rundung:**
  - Tier 1 (<2000): Schritt 50
  - Tier 2 (<5000): Schritt 100
  - Tier 3 (>5000): Schritt 250
- Integrationstests mit SpendingPlanner
- Prüft dass monatliche Entnahmen auf sinnvolle Schritte gerundet werden

### 3. Transaktions-Engine

#### `liquidity-runway-contract.test.mjs`
**Zweck:** Pinnt den reinen kanonischen Slice-08-Runwayvertrag.
- Default 5 Jahre, Bereich 1 bis 10 und Schrittweite 0,5;
- Legacy-Prioritaet `liquidityRunwayYears` vor `runwayTargetMonths`,
  `runwayMinMonths` und Default; alle 104 alten UI-Monatswerte werden ohne
  Verkuerzung auf das naechste Halbjahr normalisiert;
- leere und ungueltige kanonische Werte, negative Werte, Nicht-0,5-Schritte
  und kontrolliert scheiternde Migration;
- exaktes Liquiditaetsziel und abgeleitete harte Mindest-Policy.

Transaktionen, VPW, Post-Payout-Nullsemantik, Goldband sowie Sweep-/Optimizer-
Inventar liegen bewusst in den jeweiligen Fachtests.

#### `liquidity-guardrail.test.mjs`
**Zweck:** Validiert operative Guardrails.
- **Bear Market Refill Caps:** Begrenzt Nachfüllung in Bärenmärkten
- **Benannter Bear-Cap-Grenzzeuge:** Bei exakt 75 Prozent Zieldeckung bleibt das quantisierte Standard-Cap aktiv; einen Euro darunter aktiviert `isCriticalLiquidityBear` das 10-Prozent-Notfall-Cap. Nullgewinn-Lots isolieren dabei Verkaufs- und Liquiditaetswirkung von der Steuer; die Diagnose muss die tatsaechlich wirksame Standard- beziehungsweise Notfall-Prozentgrenze ausweisen.
- **Runway Coverage Triggers:** Aktiviert bei kritischer Liquiditätsdeckung
- Minimum-Runway-Enforcement

#### `transaction-tax.test.mjs`
**Zweck:** Validiert die komplette Steuerlogik.
- **Abgeltungssteuer:** Korrekte Berechnung (26,375% + Soli)
- **Teilfreistellung (TQF):** 30% für Aktienfonds
- **Sparer-Pauschbetrag:** Korrekte Anwendung und Verbrauch
- **FIFO Cost-Basis Tracking:** Korrekte Kostenbasis-Verfolgung
- **Kirchensteuer:** Zusätzliche Steuerbelastung
- Steueroptimierte Verkaufsreihenfolge
- **Zwei Gewinnquoten:** `gainQuotePlan` (≥ 0) vs. `gainQuoteSigned` (mit Vorzeichen für Verlustpositionen)
- **TQF-Symmetrie:** Teilfreistellung wird symmetrisch auf Verluste angewandt (§ 22 InvStG)
- **Roh-Aggregate:** `sumRealizedGainSigned`, `sumTaxableAfterTqfSigned` für Settlement
- **Profilherkunft:** Detailtranchen-Verkaeufe bewahren profilbezogene `trancheId` und `sourceProfileId`

#### `tax-settlement.test.mjs`
**Zweck:** Validiert das Jahres-Settlement (Verlustverrechnungstopf).
- **Verrechnungsreihenfolge:** lossCarry → SPB → Steuer
- **Negativer Jahressaldo:** Zero Tax, additive lossCarry-Fortschreibung
- **Exakter Aufbrauch:** Floating-Point-Robustheit bei lossCarry = Gewinn
- **SPB-Restverbrauch:** SPB absorbiert Rest nach lossCarry
- **Non-Mutation:** taxStatePrev wird nicht verändert

#### `core-tax-settlement.test.mjs`
**Zweck:** End-to-End-Integration Settlement in Engine.
- **taxState-Fortschreibung:** `lastState.taxState.lossCarry` wird korrekt propagiert
- **action.steuer:** Enthält Settlement-Steuer (nicht Sale-Plan-Steuer)
- **Reserve-Reconciliation:** Plansteuer, Plan-Netto, finale Steuer und einmalige Liquiditaetsgutschrift erfuellen die Cash-Invarianten
- **Globale Quellen-Reconciliation:** Auch ohne Balance-3-Bucket-Flag entsprechen Quellen-Netto und nichtnegative Einzelquellen der finalen Action und ihren Verwendungen
- **Golden Cases:** Kein, teilweiser und ueberdeckender LossCarry sowie No-Transaction
- **Signierte Tranchen:** Reine Verluste und gemischte Gewinn-/Verlusttranchen bleiben endlich und vorzeichengetreu
- **taxRawAggregate:** Roh-Aggregate in UI-Ausgabe vorhanden
- **Default-Robustheit:** `lastState: {}` ohne taxState funktioniert

#### `simulator-tax-settlement.test.mjs`
**Zweck:** Simulator-Integration mit Gesamt-Settlement-Recompute.
- **Notfallverkauf-Recompute:** Bei Forced Sales werden reguläre + Notfall-Aggregate kombiniert und Settlement neu berechnet
- **3-Bucket-Recompute:** Eine Bad-Year-Ersetzung durch Bondquellen wird auf ihrem finalen Rohaggregat zentral abgerechnet; der blockierte Aktienplan darf weder Steuer noch Verlustvortrag fortschreiben
- **Kein-Notfall-Regression:** Ohne Forced Sale bleibt Engine-Settlement unverändert
- **Steuerkonsistenz:** `totalTaxesThisYear` kommt aus Settlement
- **Ausfuehrungsskalierung:** Regulaere Reserve und Rohaggregate verwenden denselben `regularSaleScale`; Forced-Sale-Plansteuer wird ohne zweiten SPB skaliert reserviert
- **Cash-Reconciliation:** `taxReservedTotal - taxDueFinal` wird genau einmal als `taxCashAdjustment` gebucht
- **Zwei Action-Phasen:** `plannedActionFlow` bleibt vor Ausfuehrung quellen-/verwendungskonsistent; `SimulatorExecutedTaxContractV1` prueft dessen Reserve gegen finale Verkaufssteuer, Zinssteuer, Jahressteuer und Cash-Anpassung
- **Adaptergrenze:** Formal ausgeglichene, aber zentral falsch abgerechnete Engine-Steuer sowie werfende Action-/Steueraggregat-Getter enden kontrolliert als technischer Vertragsfehler
- **Steuer-Inventarmodell V1:** `proportional_market_value_v1` bindet die internen signierten Lot-Rohwerte mit absolut `1e-7` an die proportionale Marktwert-/Cost-Basis-Reduktion. Nichtproportionale Auswahl oder centgerundete Fremdadapter sind bewusst kein V1-Kompatibilitaetsfall.
- **Mehrjahresinvariante:** Zehn deterministische Gewinn-/Verlustjahre mit regulaeren und erzwungenen Verkaeufen zeigen keine kumulative Steuer-/Cash-Drift

#### `transaction-engine-ath.test.mjs`
**Zweck:** Testet Transaktionsverhalten bei All-Time-High.
- Bei ATH ohne Runway-Lücke: Opportunistisches Rebalancing statt Notfüllung
- Guardrail-Cliff-Test: Korrekte Auffüllung nahe Ziel
- Prüft dass keine unnötige Notfüllung ausgelöst wird

#### `transaction-engine-rebal.test.mjs`
**Zweck:** Testet Gold-Rebalancing-Logik.
- **Gold Drift:** Verkauf bei starker Übergewichtung (>30% statt Ziel 7,5%)
- Band-Verletzung führt zu Rebalancing-Transaktion
- Prüft korrekte Quellen und Verkaufsbeträge

#### `transaction-gold-liquidity.test.mjs`
**Zweck:** Testet Gold-Kauf vs. Liquiditätslücke.
- **Blockierung:** Kein Gold-Kauf wenn Liquidität unter Ziel
- **Freigabe:** Gold-Kauf erlaubt bei Liquiditätsüberschuss
- Priorität: Liquidität vor Gold-Allokation

#### `transaction-quantization.test.mjs`
**Zweck:** Testet die Transaktions-Rundungslogik.
- **Tier-basierte Brutto-Rundung:**
  - <10k: Schritt 1k
  - <50k: Schritt 5k
  - <200k: Schritt 10k
  - >200k: Schritt 25k
- **Hysterese:** Kleine Lücken (<2k) lösen keine Transaktion aus
- **Opportunistisches Refill:** Korrekte Rundung bei Auffüllung
- **Surplus-Investition:** Floor-Rundung bei Überschüssen
- **Komponenten-Rundung:** Gilt auch für Gold-Verkäufe

### 4. Monte-Carlo-Simulation

#### `monte-carlo-measurement-contract.test.mjs`
**Zweck:** Validiert Golden Cases, unveraenderliche Snapshot-Linie, Delta-Ledger, Same-Runtime-Exaktheit sowie Direct-/Worker-/Chunk-Paritaet.
- **V2-Ressourcenerweiterung:** Die drei neuen Real-Drawdown-Buffer werden separat auf Registrierung und Paritaet geprueft. Die eingefrorene V1-Snapshotprojektion misst weiterhin nur den historischen V1-Bufferbestand, damit eine additive V2-Ressource keinen semantisch unveraenderten V1-Hash umdeutet.
- **Aktuelle Referenz:** Die oeffentliche `currentReference` ist `null`,
  solange kein extern freigegebener Nachfolger vorliegt;
  `post-backtest-data-07-v1` ist der neueste getrennte, noch extern zu
  reviewende Demografie-/Pflege-/Hinterbliebenen-Messkandidat auf Basis von
  `post-backtest-data-06-v2`. Der
  veraenderliche Zeiger ist aus der eingefrorenen
  Ergebnisprojektion ausgeschlossen. Keine fruehere Fixture wird
  ueberschrieben und eine reine Zeigeraenderung erzeugt keinen
  Folgesnapshot.
- **Slice-02-Delta:** Die harte Nullsemantik fuer `maxSkimPctOfEq` und das Equity-Gesamtbudget veraendert im festen Acht-Run-Fall nur Volatilitaet und maximalen Drawdown von Run 6 sowie die davon abgeleitete Median-Volatilitaet.
- **Invarianten:** Direct-Runner-CaR, alle anderen Pfad-/Aggregatwerte, Outcome-Inventar, Missingness und Datenprovenienz bleiben exakt.
- **Slice-11-Kandidat:** `post-suite-data-11-v1` bleibt bis zum externen Review
  `pending`, dokumentiert D-14-Runwerte, Rohverteilungen und das erwartete
  Bufferdelta 93 auf 106 Byte pro Run, ohne fruehere Referenzen zu
  ueberschreiben.
- **Backtest-Data-Slice-02-Kandidat:** `post-backtest-data-02-v3` friert die
  neue Aktien-Datenversion sowie Risiko-, CaR-, Sampling- und
  Auto-Optimize-Projektionen fuer denselben Seed und dasselbe Workerlayout
  ein. V1 und V2 bleiben als ueberholte, unreviewte Kandidaten unveraendert;
  der Erzeugungsmodus darf V3 nicht ueberschreiben und endet absichtlich
  nicht gruen. V3 bleibt bis zum externen Review `pending`.
- **Backtest-Data-Slice-03-Kandidat:** `post-backtest-data-03-v1` baut
  unveraenderlich auf V3 auf und friert die CPI-Datenversion samt Risiko-,
  CaR-, Sampling- und Auto-Optimize-Projektionen ein. Der Erzeugungsmodus
  verweigert ein Ueberschreiben; der Kandidat bleibt bis zum externen Review
  `pending`. Die oeffentliche `currentReference` bleibt deshalb `null`.
- **Backtest-Data-Slice-04-Kandidat:** `post-backtest-data-04-v1` baut
  unveraenderlich auf dem Slice-03-Kandidaten auf und friert nur die neue
  Cash-/Geldmarkt-Datenprovenienz samt erwarteten Modellprojektionen ein.
  Der Kandidat bleibt bis zum erneuten externen Review `pending`.
- **Backtest-Data-Slice-05-Kandidat:** `post-backtest-data-05-v1` baut
  unveraenderlich auf dem Slice-04-Kandidaten auf und friert die neue
  Gold-Datenprovenienz samt erwarteten Modellprojektionen ein. Der Kandidat
  bleibt `pending`; weder Slice 04 noch eine andere Eingangsfixture wird
  ueberschrieben.
- **Backtest-Data-Slice-06-Kandidat:** `post-backtest-data-06-v1` bleibt als
  unveraenderlicher Kandidat mit unvollstaendig behauptetem Messumfang und
  fehlerhaftem Evidenzvertrag erhalten. `post-backtest-data-06-v2` ist sein
  zur Laufzeit zeitgestempelter Nachfolger. V2 sagt explizit, dass die sechs
  Golden Cases weder Gold-, CAPE-Sampling- noch lohnindexierte Rentenwirkung
  messen, und belegt gegen Slice 05 exakt null numerische Deltas; nur Identitaet,
  Erfassungsnachweis, Messscope und `annualDataHash` duerfen abweichen. Beide
  Slice-06-Kandidaten bleiben `pending`.
- **Backtest-Data-Slice-07-Kandidat:** `post-backtest-data-07-v1` vergleicht
  bei identischem Node, Profil, Seed und Input den unveraenderlichen
  Slice-06-Basiscommit mit dem Slice-07-Arbeitsstand. Der Lauf umfasst 2.048
  Runs, 40 Jahre, aktiven Pflege-/Partner-/Hinterbliebenenpfad und zwei
  Sweep-Kombinationen. 40 numerische Deltas, 44 geaenderte Blaetter und ihre
  Hashes sind eingefroren; der Kandidat bleibt bis zum externen Review
  `pending`.
- **Slice-08-Messung:**
  `fixtures/liquidity-runway-slice-08-measurement-v1.json` und
  `fixtures/monte-carlo-measurement/liquidity-runway-slice-08-v1.json`
  dokumentieren die getrennte Wirkung des kanonischen Runway-/Puffervertrags.
  Die grossen Slice-07-Eingangsfixtures bleiben byte-identisch und werden per
  SHA-256 geschuetzt; die neuen Fixtures sind technische Messbelege und keine
  externe Modellfreigabe.
- **Slice-09-Messung:**
  `fixtures/minimum-flex-slice-09-measurement-v1.json` konsumiert die
  bytegeschuetzte Slice-08-Messung als Eingangsreferenz, ergaenzt den
  historischen D-17-Zeugen fuer 2001/2005/2009/2010 und weist fuer alle elf
  bestehenden positiven Faelle exakt null Endvermoegens-, Entnahme-, Steuer-,
  Outcome- und FlowDelta-Deltas aus. Der Kandidat bleibt bis zum externen
  Review `pending`; die Slice-08-Fixture wird nicht ueberschrieben.
  `fixtures/monte-carlo-measurement/minimum-flex-slice-09-v1.json` bindet
  ebenso die byteidentische Slice-08-Monte-Carlo-Fixture und weist fuer die
  gemessenen MC-/Sweep-Aggregatprojektionen drei unveraenderte Hashes und null
  Projektdeltas aus. Aktive Soll/Ist/Fehlbetrag-Rowparitaet wird getrennt im
  Worker-Vertrag belegt und nicht als Aggregatmessung ausgegeben.
- **Slice-17-Messung:**
  `fixtures/liquidity-runway-basis-slice-17-measurement-v1.json` bindet die
  wertveraendernde Korrektur der Runway-Bedarfsbasis als neuen Pending-
  Kandidaten. Die Datei referenziert die byteidentischen Slice-10-/13-
  Eingangsfixtures und pinnt getrennte Zielhashes fuer Backtest,
  Monte-Carlo/Sweep, Demografie/Pflege sowie den synthetischen
  Export-Fingerprint. Sie bindet zusaetzlich den lebenden
  `crossSliceOracleProjection`, das vollstaendige Slice-09-nach-10-Deltaledger
  und einen Safety-Gegenzeugen mit post-policy operativem sowie pre-policy
  Dynamic-Flex-Safety-Runway. Persoenliche Daten des Nutzer-Replays sind nicht
  enthalten. Die historischen Fixtures werden nicht ueberschrieben; der alte
  Slice-10-Updatepfad ist absichtlich blockiert.
- **Abschlusshaertung Slice-03-Messung:**
  `fixtures/safety-policy-slice-03-measurement-v1.json` bindet die
  bytegeschuetzten Backtest-/Demografie- und Monte-Carlo-Eingangsgrenzen als
  neuen Pending-Kandidaten. Die 2000-2025-Messung weist vier schwere
  Null-Flex-Jahre (2002-2004 und 2008), 0 Floorverletzungen, FlowDelta 0 sowie
  Entnahme-, Steuer- und Endvermoegensdelta aus. Monte Carlo und
  Demografie/Pflege besitzen getrennte Zielhashes; persoenliche Replaydaten
  sind nicht enthalten. `reviewStatus` bleibt bis zur externen Codepruefung
  `pending_external_review`.
- **Historische Fixture-Kompatibilitaet:** Vergleichsausnahmen fuer
  unveraenderliche Pending-Fixtures stehen ausschliesslich in
  `snapshot-policy-v1.json`. Der produktive Runtime-Vertrag enthaelt weder
  Fixture-Pfade noch ein `ignoredHistoricalFixtureFields`-Feld.
- **Ressourcenmessung:** Das feste Standardprofil mit 100.000 Runs ergab
  977,62585 gesamte Worker-Result-Byte pro Run; der Laufzeitvertrag verwendet
  gerundete 978 Byte pro Run.

#### `monte-carlo-sampling.test.mjs`
**Zweck:** Validiert den statistischen Kern der Simulation.
- **Block-Bootstrap Sampling:** Korrelationserhaltung historischer Daten
- **Regime-Transitions:** Wahrscheinlichkeitsbasierte Übergänge (Bull/Bear/Sideways/Stagflation)
- Determinismus bei gleichem Seed

#### `monte-carlo-startyear.test.mjs`
**Zweck:** Validiert die gewichtete Startjahr-Auswahl.
- **Filter Mode:** Einschränkung auf bestimmte Jahre
- **Recency Mode:** Höhere Gewichtung für jüngere Jahre
- **Uniform Mode:** Gleichverteilte Auswahl
- Deterministische CDF-Auswahl

#### `simulator-monte-carlo.test.mjs`
**Zweck:** Umfassende Tests für den MC-Kern.
- **Heatmap Merge:** Korrekte Akkumulation von Chunk-Ergebnissen
- **pickWorstRun:** Tie-Breaker-Logik (Endvermögen → comboIdx → runIdx)
- **Buffer-Strukturen:** finalOutcomes, taxOutcomes, kpiLebensdauer etc.
- **Aggregates:** P10/P50/P90 Berechnung, Erfolgsquote, Drawdown
- **Chunk-Merge:** Split- vs. Full-Run Konsistenz
- **Determinismus:** Gleicher Seed → gleiche Ergebnisse
- **Ruin-Zählung:** Übereinstimmung mit finalOutcomes ≤ 0
- **Perzentile:** P10 < P50 < P90 Ordnung
- **Mindest-Flex:** Serial-MC-Lauf mit `minimumFlexAnnual > 0` inklusive Withdrawal-Effekt und Logstatus.

#### `results-metrics.test.mjs`
**Zweck:** Sichert den sichtbaren Ergebnisvertrag ohne DOM.
- **Präzises Label:** Ruin oder Aktien/Gold-Endbestand ≤ 100 Euro statt
  vollständiger Vermögensaufzehrung
- **Aussagegrenze:** `isRuin`, freie Liquidität und Pflegebucket werden im
  Beschreibungstext ausdrücklich eingeordnet
- **Kompatibilität:** Prozentformatierung, Altersanzeige und bestehende
  Success-/Warning-/Danger-Schwellen bleiben unverändert
- **Exaktwerte:** P10/P50/P90-Endvermoegen ohne Grobstufen, reale
  Depotentnahme P10, Median der Run-P10, Steuermedian und
  Verlustvortragsersparnis bleiben centgenau und primaer sichtbar
- **Rundungsrichtung:** Zusatzdezimal-Fixtures sichern Nutzen abwaerts, Kosten
  aufwaerts und positive Drawdown-Verlustbetraege aufwaerts; Gleitkommawerte
  nahe einer exakten Centgrenze bleiben stabil
- **Drawdown:** nominale/reale Preisbasis, Paarreihenfolge, gueltige
  Grenzwerte 0/34,25/100 sowie fail-closed Verhalten fuer negative,
  groesser-100-, nicht endliche, fehlende und nicht anwendbare Werte
- **Missingness:** fehlende Beobachtungszahlen erscheinen als `unbekannt`;
  bei mehreren Gruenden gewinnt der hoechste aggregierte Zaehler
- **Copy:** strikt-`>`-Berichtsreferenz und sichtbar nicht kausaler
  Pflege-Gruppenmedianvergleich

#### `care-meta.test.mjs`
**Zweck:** Validiert die Pflegefall-Logik.
- **Eintrittswahrscheinlichkeit:** Altersabhängige Pflegewahrscheinlichkeit
- **Kostenrampe:** Inflation und Progression der Pflegekosten
- **Einheitenvertrag:** 0/3,5/100 %, direkte Verhältnisverwendung, zweijährige
  Driftfortschreibung sowie Cap-/Ramp-up-Wirkung ohne doppelte Skalierung
- **Dual-Household:** Flex-Budget-Anpassung bei Pflege beider Partner
- Pflegegrade (PG 0-5) und ambulant vs. stationär

### Pflegebucket
**Datei:** `health-bucket.test.mjs`

**Zweck:** Testet die gesperrte Geldmarkt-/Cash-Reserve fuer Pflegefaelle.
- **Trigger:** Mindestpflegegrad, `OR`-/`AND`-Modus und P1/P2-Care-Metadaten ueber `householdContext.care`.
- **Deckung:** `care_additional_floor_only` und `floor_when_care_active`.
- **Air Gap:** Bucket-Betraege werden nicht als freie operative Liquiditaet behandelt.
- **Verbrauch:** FIFO-Reduktion der Bucket-Tranchen, Restbetrag und Warnungen.
- **Diagnose:** Verzinsung mit `rC`, inflationsindexierter Zielwert, Zieldeckung und Ziel-Luecke.

### 5. Parameter-Sweep & Optimierung

#### `simulator-sweep.test.mjs`
**Zweck:** Validiert Parameter-Sweep-Funktionalität.
- **parseRangeInput:** Einzelwerte, Kommalisten, Range-Format (start:step:end)
- **cartesianProductLimited:** Kartesisches Produkt mit Limit-Schutz
- **Whitelist/Blocklist:** SWEEP_ALLOWED_KEYS, isBlockedKey für Partner-/P2-Felder
- **P2-Invarianten:** extractP2Invariants, areP2InvariantsEqual
- **normalizeWidowOptions:** Default-Werte und Normalisierung
- **buildSweepInputs:** Parameter-Überschreibung
- **runSweepChunk:** Ausführung und Determinismus
- **Mindest-Flex:** Sweep-Chunk mit gesetztem `minimumFlexAnnual` bleibt gueltig und berechnet Metriken.
- **Common Random Numbers:** Wirkungsgleiche Kombinationen verwenden je
  Run-Index identische Seeds, Sampling-Rohpfade und Metriken. Wirkungsvoll
  verschiedene Kombinationen belegen denselben Rohpfadpraefix bis zu einer
  strategieabhaengigen Terminierung, ohne vollstaendige Pfadgleichheit zu
  behaupten.
- **Terminalruin:** Der Nullpunkt wird vor dem Abbruch in die Drawdownserie
  aufgenommen und ergibt aus positivem Peak exakt 100 Prozent Drawdown.

#### `sweep-metrics.test.mjs`
**Zweck:** Testet den versionierten Sweep-Metrik- und Unsicherheitsvertrag.
- **D-06:** P95 des aufsteigend sortierten nichtnegativen
  Drawdown-Verlustmasses sowie handberechnete Reihe 1 bis 100.
- **Kanonische Quantile:** P10, P25, Median und P75 des Endvermoegens
  verwenden denselben interpolierten Quantilhelfer wie der Drawdown.
- **Saettigung:** Terminalruinanzahl und -anteil sowie ein im Ruinblock
  liegendes P95 werden explizit diagnostiziert.
- **Metadaten:** Einheit, Richtung, Rohquelle, Quantilrichtung und
  Terminalruin-Semantik sind versioniert. `minRunwayObserved` liest in
  `SweepMetricsV4` ausschliesslich kanonische Vor-Auszahlungs-Monate; eine
  Prozentdeckung, falsche Phase oder fehlendes Monatsfeld wird nicht
  stillschweigend uebernommen.
- **Unsicherheit:** Runzahl, CRN-Status und Wilson-95-Prozent-Intervall der
  Erfolgsquote; Quantil-Konfidenzintervall bleibt explizit `null`.
- **Contract-Reader:** Unversionierte und nicht endliche Metrikwerte werden
  fail-closed abgewiesen; Drawdownverluste ausserhalb 0 bis 100 werfen
  ebenfalls fail-closed.

#### `simulator-sweep-consumers.test.mjs`
**Zweck:** Sichert den gemeinsamen Metrikshape aller Sweep-Consumer.
- Parametervergleich, Multi-Objective und Constraints lesen nur den
  kanonischen versionierten Shape.
- Pareto-Berechnung und -Rendering schliessen Legacy-/NaN-Werte aus.
- Gesaettigte Drawdownziele werden in Heatmap und Pareto sichtbar
  ausgewiesen; exakte Ranking-Gleichstaende waehlen nicht mehr den ersten
  Arrayeintrag.

#### `auto-optimizer.test.mjs`
**Zweck:** Testet die mehrphasige Auto-Optimierung.
- **Latin Hypercube Sampling:** Gleichmäßige Verteilung im Parameterraum
- **Quick-/Full-Evaluation:** Kandidaten werden vor der vollständigen Bewertung vorgefiltert
- **Nachbarschafts-Generierung:** generateNeighborsReduced
- **Kandidaten-Validierung:** zentrale Parameterregistry
  (`isAutoOptimizeCandidateValid`) mit Runway-Invariante, Gold-Cap,
  Domains und Modus-Anwendbarkeit
- **Constraint-Prüfung:** checkConstraints (SR99, NOEX, TS45, DD55)
- **Objective-Extraktion:** getObjectiveValue für verschiedene Metriken
- **CandidateCache:** Vermeidung redundanter Evaluierungen
- **Tie-Breaker:** Höhere Success Rate, niedrigerer Drawdown
- **Fail-closed:** Fehlende Objective-, Constraint- oder Tiebreaker-Metriken
  werden nicht als guenstige numerische 0 behandelt. Beide
  Tiebreaker-Ergebnisse muessen `AutoOptimizeMetricResultV1` tragen; Bool,
  Array und numerischer String gelten nicht als Zahlen.
- **Safety-Penalty:** Fehlende D-14-Entnahmequote bricht die
  Dynamic-Flex-Bewertung mit `AUTO_OPTIMIZE_METRIC_UNAVAILABLE` ab und ist
  nicht gleichbedeutend mit einer beobachteten Nullquote.
- **Champion-Findung:** Konvergenz nahe Optimum
- **Modellannahmen:** MC-Sampling, CAPE, Datenfilter und disjunkte
  Train-/Bestaetigungsseeds werden im Ergebnisvertrag ausgewiesen

#### `auto-optimize-fidelity.test.mjs`
**Zweck:** Sichert O-15/O-20 und die Evaluate-/Apply-Paritaet.
- Jeder interaktive Registryparameter perturbiert seinen kanonischen
  Request-Key; Null-Caps bleiben 0.
- Alle acht angebotenen Parameter besitzen kontrollierte, deterministische
  MC-Kausalitaets-Witnesses. `maxBearRefillPct` bleibt fuer explizite
  Nullwert-/Apply-Vertraege registriert, wird mangels Runner-Wirkungsnachweis
  aber weder im Parameterpicker noch in Presets angeboten.
- Gold 0/25 verwendet `goldZielProzent`, besitzt verschiedene
  Requestfingerprints und erzeugt unterschiedliche MC-Ergebnisse.
- Der direkte Horizon 15/55 wirkt unabhaengig vom Longevity-Modus im Resolver
  und normalen MC exakt;
  aktuarische Methoden ignorieren das Direktfeld und der Optimizer bietet es
  dort nicht an.
- Champion-Apply verlangt Evaluationsfingerprints, prueft Modus und alle
  Formularziele vor dem ersten Write und verifiziert Ruecklese-Fingerprint
  sowie Gold-/Go-Go-Aktivierungszustand; manipulierte oder nicht anwendbare
  Champions werden fail-closed abgewiesen.
- Reale Evaluate-Ergebnisse tragen `AutoOptimizeMetricResultV1`; P10, P25 und
  P50 bleiben geordnet und D-14 liefert eine endliche, stichprobengestuetzte
  Median-Entnahmequote.
- Ein echter Sofortruin-Witness mit nicht leerer Liquiditaet belegt, dass das
  tatsaechlich berechnete finale Ruinjahr in jedem Run enthalten bleibt und
  vor dem Auszahlungsschritt eine beobachtete Nullauszahlung statt des
  Restvermoegens als D-14-Zaehler verwendet.

#### `auto-optimize-metrics-contract.test.mjs`
**Zweck:** Sichert O-21 und den versionierten Slice-11-Metrikvertrag.
- Die Endvermoegensreihe 1 bis 100 liefert mit kanonischer linearer
  Interpolation P10 = 10,9, P25 = 25,75 und P50 = 50,5.
- D-14 bildet zuerst das arithmetische Mittel je Run und danach den Median
  ueber auswertbare Runs; echte 0 bleibt beobachtet, Missingness bleibt
  separat.
- Technische Pfade werden aus Endvermoegens- und Drawdownverteilungen
  entfernt; `sampleSize`, `excludedRuns` und
  `missingness.technical_error` reconciliieren die angeforderten Runs.
- Das zusaetzliche Quantilfeld waehlt tatsaechlich das gewuenschte
  Endvermoegensquantil; absichtlich vertauschte P10-/P25-Rangfolgen
  diskriminieren den jeweiligen Gewinner.
- Fehlende Objective-, Constraint- und Tiebreaker-Werte sowie
  unversionierte oder nicht primitiv numerische Shapes schlagen fail-closed
  fehl.

#### `auto-optimize-worker-contract.test.mjs`
**Zweck:** Testet den Worker-Merge-Contract des Auto-Optimize-MC-Pfads.
- Mock-Worker führt echte `runMonteCarloChunk()`-Jobs aus
- Vergleicht Auto-Optimize-Worker-Merge mit seriellem MC-Aggregat
- Prüft `failCount`, P10/P25/P50/P90, Erschöpfungsquote,
  Stress-Zeitanteil sowie D-14-Median, Stichprobengroesse und Missingness

### 6. Balance-App Module

#### `balance-smoke.test.mjs`
**Zweck:** End-to-End Smoke-Test der Balance-App ohne JSDOM.
- Initialisierung über DOMContentLoaded
- EngineAPI.simulateSingleYear wird beim Init aufgerufen
- Input-Änderungen triggern debounced Update
- Footer zeigt Engine-Version

#### `balance-reader.test.mjs`
**Zweck:** Testet das DOM-Input-Lesen.
- **readAllInputs:** Basis DOM-Werte, Währungsformatierung
- **Profile-Overrides:** localStorage überschreibt DOM-Werte
- **Gold-Modul Defaults:** Fallback auf 7,5% Ziel, 1% Floor, 25% Band
- **Tranchen-Aggregation:** Automatische Summenbildung aus depot_tranchen
- **Sonstige Einkünfte:** Addition zu Rente
- **applyStoredInputs:** Checkbox, Currency-Formatierung, Boolean → ja/nein
- **applySideEffectsFromInputs:** Gold-Panel Visibility, Rente disabled

#### `balance-storage.test.mjs`
**Zweck:** Testet die localStorage-Persistenz.
- **saveState/loadState:** JSON-Serialisierung, Rundtrip-Integrität
- **Migrations:** Ungültiger cumulativeInflationFactor (>3 → 1), NaN-Handling
- **Migration-Flag:** Läuft nur einmal
- **resetState:** Vollständige Bereinigung
- **createSnapshot:** full-localstorage Format, Label in Key
- **restoreSnapshot:** Wiederherstellung aller Keys
- **deleteSnapshot:** Entfernung aus localStorage
- **Fehlerbehandlung:** Ungültiges JSON, leerer Storage

#### `balance-storage-contract.test.mjs`
**Zweck:** Testet reale StorageManager-Contracts gegen `app/balance/balance-storage.js`.
- **Migration:** Inflations-State wird bereinigt und Migrations-Flag gesetzt
- **TaxState:** `lastState.taxState.lossCarry` wird ergänzt, repariert oder erhalten
- **StorageError:** Ungültiges State-JSON wirft den echten Fehler-Typ
- **Restore-Filter:** Full-localStorage-Restore übernimmt nur erlaubte App-Keys
- **Snapshot:** `createSnapshot()` schreibt Full-localStorage-Payload mit bereinigtem Label

#### `balance-annual-inflation.test.mjs`
**Zweck:** Testet die jährliche Inflationsanpassung.
- **Kumulative Inflation:** 2% über 10 Jahre → Faktor ~1.22
- **Bedarfsanpassung:** Floor und Flex werden skaliert
- **Negative Inflation:** Wird ignoriert (kein Faktor-Rückgang)
- **lastInflationAppliedAtAge:** Tracking des letzten Anwendungsalters

#### `balance-annual-workflow-contract.test.mjs`
**Zweck:** Testet die operativen Jahresworkflow-Contracts.
- **Jahresupdate-Orchestrator:** Reihenfolge Alter → Inflation → ETF → CAPE → Update
- **Result-Shape:** CAPE-Fehlerdetails, altes/neues Alter, gespeichertes Log
- **Profil-Save:** Jahresupdate schreibt den aktuellen Profil-Snapshot
- **Jahresabschluss:** Snapshot nach Jahresfortschreibung und vor Ausgaben-Rollover
- **Snapshot-Refresh:** Snapshot-Liste wird nach Abschluss neu gerendert

#### `balance-binder-snapshots.test.mjs`
**Zweck:** Testet Snapshot-Erstellung und -Wiederherstellung.
- **Jahresabschluss:** Erstellt vollständigen Snapshot (inputs + tranchen + state)
- **Label in Key:** Profilname wird im Snapshot-Key gespeichert
- **Restore:** Stellt alle localStorage-Daten wieder her
- **Fehlerbehandlung:** Broken Snapshots werden abgefangen
- **Multiple Snapshots:** Koexistenz mehrerer Snapshots

#### `balance-diagnosis-chips.test.mjs`
**Zweck:** Testet UI-Chip-Komponenten für Diagnose.
- **formatChipValue:** Null/undefined/leerer String → Fallback
- **getChipColor:** Threshold-basierte Farbzuordnung (ok/warn/danger)
- **createChip:** DOM-Struktur mit Status-Klasse und Tooltip

#### `balance-diagnosis-copy-contract.test.mjs`
**Zweck:** Testet den kopierbaren Diagnose-Exporttext.
- **Statusblock:** Status-Übersicht wird nicht doppelt ausgegeben
- **Transaktionsdiagnostik:** Blockgrund, geplante Aktion und Grenzwerte werden lesbar exportiert
- **Dynamic Flex:** VPW-Block, Sicherheitsmodus und Warnsignale bleiben im Copytext erhalten

#### `balance-diagnosis-decision-tree.test.mjs`
**Zweck:** Testet den Entscheidungsbaum für Diagnose.
- Überschuss → "Investieren"
- Unterdeckung → "Verkaufen"
- Gold über Limit → "Gold reduzieren"
- Liquidität kritisch → "Notfall-Refill"
- Neutral → "Keine Aktion nötig"
- Severity-Klasse bei Guardrail-Eingriff

#### `balance-diagnosis-guardrails.test.mjs`
**Zweck:** Testet Guardrail-Chip-Rendering.
- Bear Market Chip bei regime bear_*
- Runway Warning bei <75%
- Alarm Chip bei activeAlarm > 0
- Refill-Cap Hint im Bear Market
- Korrekte Farbcodierung (ok/warn/danger)

#### `balance-diagnosis-format.test.mjs`
**Zweck:** Testet Normalisierung der Entscheidungsdiagnose.
- Exakt erreichte Mindestschwellen werden als ok bewertet
- Grenzfallhinweise wie „Exakt auf Mindestniveau“ werden gesetzt
- Knappe Sicherheitsabstände bleiben warn

#### `balance-diagnosis-transaction.test.mjs`
**Zweck:** Testet Transaktions-Diagnose-Rendering.
- Empty State bei null-Diagnostics
- Guardrail-Block → danger Status
- Cap active → warn Status
- Tranchenauswahl-Rendering mit Details
- Gold-„Warum nicht?“-Hinweis bei sichtbarem Ziel ohne Goldkauf

#### `balance-renderer-summary.test.mjs`
**Zweck:** Testet Summary-Rendering.
- formatCurrency: Euro-Symbol
- calculateTotals: Werte werden preserved
- renderSummary: DOM-Updates mit Formatierung

### Pflegebucket-Diagnose
**Dateien:** `balance-health-bucket.test.mjs`, `balance-decumulation.test.mjs`, `balance-diagnosis-keyparams.test.mjs`, `balance-diagnosis-copy-contract.test.mjs`, `balance-renderer-summary.test.mjs`, `balance-smoke.test.mjs`

**Zweck:** Sichert die Balance-App als reinen Consumer der Pflegebucket-Profildefinition.
- **Diagnosewerte:** Brutto-Liquiditaet, Pflege-Zweckbindung, operative Liquiditaet, Zieldeckung und Ziel-Luecke.
- **Policy:** `releasePolicy='diagnostic_only'`, `releaseAllowed=false`, `releasedAmount=0`.
- **UI/Copytext:** Summary, Key-Parameter und Diagnose-Export weisen die Zweckbindung und die fehlende automatische Freigabe aus.

### 7. Simulator Module

#### `simulation.test.mjs`
**Zweck:** Integration der vollständigen Simulationsschleife.
- simulateOneYear mit verschiedenen Szenarien
- Portfolio-Updates über Jahresschritte
- Validierung der Ergebnisstruktur

#### `simulator-headless.test.mjs`
**Zweck:** Headless Full-Backtest ohne Browser.
- 2000-2025 Simulation mit realen Marktdaten
- Validiert dass Liquidität nie negativ wird
- State-Persistence über Jahre hinweg

#### `simulator-backtest.test.mjs`
**Zweck:** Testet die historische Backtest-Funktion.
- **Determinismus:** Zwei Läufe mit gleichen Inputs sind identisch
- **Startjahr-Filterung:** Korrekte Jahr-Auswahl (2010-2012)
- **Historische Daten:** D-01-konforme Inflation aus `HISTORICAL_DATA[t]`
- **yearlyResults:** Länge entspricht (end-start+1)
- **finalWealth:** Stimmt mit letztem Jahreseintrag überein
- **Mindest-Flex:** Stresstest 2005-2014 mit lokalem Same-Year-Invariant bei Status `applied`, Logstatus und FlowDelta-Pruefung inklusive 3-Bucket-Modus.
- **Profilverbund-Transparenz:** Backtest-Ergebnis behaelt die profilgenaue `minimumFlexProfiles`-Aufteilung.
- **Realentnahme:** Historische Jahreszeilen führen den kumulierten Inflationsfaktor fort und deflationieren die effektive Entnahme.
- **Zinsmarker:** Hochzins 2000, der EONIA-/EURSTR-Uebergang 2019 und das
  reine negative EURSTR-Jahr 2020 werden vom generierten Quellenwert ueber
  `cashBondReturn` bis zur exakten Zinsgutschrift im Balance-Trace
  nachgerechnet; `portfolio_flow_delta` bleibt jeweils null.

#### `simulator-backtest-ui.test.mjs`
**Zweck:** Testet den DOM-armen UI-/Accessibility-Vertrag des historischen Backtests.
- **Zeitraum:** Provider-Bounds, sichtbarer Datensatzhinweis, Einjahreslauf sowie leere, NaN-, nicht-ganzzahlige, rueckwaertige und out-of-bounds Felder.
- **Inline/Fokus:** Feldzuordnung, `aria-invalid`, sichtbarer Fehler und Fokus auf das erste ungueltige Feld.
- **Statussicherheit:** Stabiler technischer Code ohne Stack oder lokalen Pfad; terminaler Fokus und maschinenlesbarer Status.
- **Datenqualitaet/A11y:** Inventar der Observation-Qualitaetsmarker, Caption, `scope="col"`, verstaendliche Headerlabels und HTML-Escaping.
- **Cohorts:** Tief eingefrorener UI-/Exportsnapshot, feste Horizontlaenge, Ausschlussgruende und `eligible=0` ohne `NaN`/`Infinity`.

#### `historical-backtest-runner.test.mjs`
**Zweck:** Testet den DOM-freien historischen Runner direkt an seiner Dependency-Injection-Grenze.
- **Request/Result:** `BacktestRequestV1` und `BacktestRunResultV1` inklusive Zeitraum, `breakOnRuin`, Dataset-/Temporal-/Engineprovenienz, diskriminiertem Outcome, Rows, Completion, Portfolio-Snapshots, Metriken und Summary.
- **Isolation:** Lauf unter blockierten Browser-/Persistenzglobals; alle benoetigten Funktionen und historischen Records werden explizit injiziert.
- **Non-Mutation:** Tief eingefrorene Partner-/Trancheninputs und Historienrecords, wiederholter identischer Aufruf sowie Erhalt von `undefined`, `Date`, `RegExp` und zyklischen Referenzen.
- **Contractintegration:** Validierte Records, initiale Vierjahres-Markthistorie, D-01-`yearData`, fail-closed `incomplete` vor dem Loop sowie reconciliierte `completed`-/`ruin`-/`technical_error`-Pfade.

#### `historical-backtest-contract.test.mjs`
**Zweck:** Testet den im Produktbacktest aktiven V1-Daten-/Jahrescontract ohne DOM.
- **YearRecord:** Realized-/Decision-as-of-Trennung, Source-/As-of-Jahre, Qualitaet und aktive D-01-Konvention `realized_t_decision_t_minus_1_v1`.
- **Preflight:** Einjahreslauf, Integer-/Bounds-Vertrag, erste Lookback-/Periodenluecke und Cohort-Batch.
- **Fehler:** Strukturierte Missing-/Non-Finite-/Indexlevel-/Fallback-Zero-Fehler.
- **Instrumentation:** Vollvalidierung einmal je Revision/Hash und Preflight einmal je Request/Batch; wiederholte Year-/MC-/Sweep-/Cohort-Lookups bleiben reine Cache-Reads.
- **Marker:** Rentenanpassungs-Offset fuer 1950, 2000 und 2001 sowie maschinenlesbares Builderinventar.

#### `historical-data-manifest.test.mjs`
**Zweck:** Testet `HistoricalDataManifestV1` und den eingebetteten Datenfingerprint.
- **Manifestfelder:** IDs, Variante, Waehrung, Region, Frequenz, Zeitraum, Source-/Lizenzstatus, Transformation, Schaetzsegmente, Missingness und Revision.
- **Resolution-Gate:** Belegte Aktien- und VPI-Source-/Lizenzfelder bleiben `known`; fuer die verbleibenden Reihen gibt es keine leeren `known`-Werte und keine erfundenen Werte unter `unresolved`.
- **Hash:** Browser-kompatibles SHA-256 gegen Node-`crypto` und den manifestierten Laufzeit-Datenbestand.
- **Lookup:** Lueckenlose 1925-2025-Baseline, abgeleitete technische Bounds 1929-2025, Provenienz und Non-Mutation.

#### `global-equity-research-chain.test.mjs`
**Zweck:** Testet die generierte offene 1925-2025-Aktien-Forschungsproxykette.
- **Quellenhashes:** Originale und gefilterte JST-/OECD-/EZB-Eingaben stimmen mit den gepinnten SHA-256-Werten ueberein; der Build rekonstruiert die Filterung bytegenau.
- **Verkettung:** 101 Jahresreturns und Levels sind lueckenlos, positiv und genau einmal verkettet; `HISTORICAL_DATA` verwendet ausschliesslich diese Levels.
- **Vollnachrechnung:** Ein unabhaengiger Testpfad rekonstruiert alle 101
  Returns direkt aus den Filtereingaben; 1950 bleibt USD-basiert, der
  deutsche Anleger-Numeraire beginnt 1951.
- **Lueckenvertrag:** Deutsche Wechselkursluecke 1945-1946 und japanische Aktienluecke 1946-1947 bleiben maschinenlesbar.
- **Evidenz:** `proxy`, `backtested` und `estimated` bleiben getrennt; moderne Referenzjahre und Datenhashes sind stabil.
- **Identitaet/Lizenz:** Kein MSCI-Anspruch; das generierte Artefakt traegt den separaten JST-Datenlizenzhinweis.
- **Inventarbruecke:** Alle sechs Runtime-Reihen sind mit eigenem Wert-Hash und
  Qualitaetssegmenten in `SimulationDataInventoryV1` verknuepft.

#### `global-equity-backtest-delta.test.mjs`
**Zweck:** Validiert den maschinenlesbaren Vorher-/Nachher-Vertrag aller sechs
bestehenden Zielreferenzen sowie eines zusaetzlichen Laufs ueber die
1949/1950/1951-Naht.
- **Konstanz:** Eingabe-Hashes und Outcome-Klassen bleiben unveraendert.
- **Deltas:** Endvermoegen, Entnahmen, Steuern, Kuerzungsjahre/-serie und
  FlowDelta besitzen jeweils die Ursache `global_equity_research_chain`.
  Neu instrumentierte Drawdown-/Runway-Werte sind getrennt als
  retroberechnete Zusatzdiagnostik markiert und keine Basisfixture-Oracles.
- **Bilanzgate:** Vorher und nachher bleibt der maximale absolute
  `portfolio_flow_delta` unter 1 EUR.

#### `german-cpi-chain.test.mjs`
**Zweck:** Testet die generierte deutsche 1925-2025-VPI-Kette.
- **Quellenhashes:** JST-R6-Original, Destatis-Langreihen-XLSX und aktueller
  Destatis-HTML-Snapshot stimmen mit ihren gepinnten SHA-256-Werten ueberein.
- **Verkettung:** 101 Jahresraten und synthetische Levels sind lueckenlos;
  `HISTORICAL_DATA` und `annualData` verwenden ausschliesslich die generierten
  Raten.
- **Naehte:** 1949/1950, 1962/1963, 1991/1992 und 2024/2025 besitzen feste
  Quellen-/Gebietsvertraege; 2024 und 2025 betragen jeweils 2,2 Prozent.
- **Evidenz/Lizenz:** JST-Proxy, amtliche Destatis-Segmente,
  `proxy_population`, HICP/HVPI-Ausschluss und beide Datenlizenzen bleiben
  maschinenlesbar.

#### `german-cpi-source-reconstruction.test.mjs`
**Zweck:** Fuehrt den read-only Original-zu-Modul-Rekonstruktionscheck aus und
beweist, dass das Verifikationsgate das generierte Modul nicht umschreibt.

#### `german-cpi-backtest-delta.test.mjs`
**Zweck:** Validiert die Slice-03-Vorher-/Nachher-Evidenz gegen den eingefrorenen
Post-Slice-02-Zielstand und das aktive Backtest-Ziel.
- **Identitaet:** Referenzen werden mit ID und Periode identifiziert;
  Input-Hashes und Outcome-Klassen bleiben stabil.
- **Deltas:** Endvermoegen, Entnahmen, Steuern, Kuerzungsmetriken,
  Drawdown, Runway und FlowDelta tragen die alleinige Ursache
  `german_cpi_chain`.
- **D-20:** Die isolierte Endjahreskorrektur 2024 haelt nominales
  Endvermoegen konstant und erklaert die dokumentierten +7.758,95 EUR
  Realwert rein aus dem Deflator.
- **Bilanzgate:** Vorher und nachher bleibt der maximale absolute
  `portfolio_flow_delta` unter 1 EUR.

#### `german-cash-money-market-chain.test.mjs`
**Zweck:** Testet die generierte deutsche 1925-2025-Cash-/
Overnight-Geldmarktproxykette.
- **Quellenhashes:** JST-R6-Original, Bundesbank-Langreihen-PDF und
  mechanischer Layout-Extrakt stimmen mit den gepinnten SHA-256-Werten
  ueberein. Der Rohdatenhash umfasst nur die beiden Primaerquellen; der
  abgeleitete Extrakt besitzt einen getrennten Hash.
- **Laufzeit:** 101 endliche Jahreswerte werden ausschliesslich aus dem
  generierten Modul in `HISTORICAL_DATA` und `annualData` projiziert.
- **Naehte:** JST, Schaetzbruecke, Frankfurt-Tagesgeld, FIBOR, EONIA,
  Uebergang 2019 und EURSTR besitzen feste Segmentgrenzen; Negativzinsen
  bleiben signiert.
- **Qualifikation:** Die 1949-1996-Werte sind wegen der nicht amtlich
  festgesetzten oder quotierten Meldesaetze als `proxy` klassifiziert.
  Meldergruppen-, Zinstage-, FIBOR- und EURSTR-Uebergaenge, die nicht
  modellierte Geldvermoegensabschreibung 1948 sowie der EZB-
  Administratorhinweis sind maschinenlesbar.
- **Anwendungsgrenze:** Der einfache Brutto-Jahresproxy wird vom bestehenden
  `cashBondReturn` auf Cash, Geldmarkt, Pflegebucket und Anleihetranchen
  angewandt. Fuer Anleihen bildet er weder Duration, Laufzeitpraemie,
  Kreditrisiko noch Mark-to-Market ab; zusaetzliche Aufzinsung,
  Produktkosten und Steuer sind ausgeschlossen.

#### `german-cash-money-market-source-reconstruction.test.mjs`
**Zweck:** Rekonstruiert alle 101 Werte unabhaengig aus dem JST-Original und
direkt aus der gepinnten Bundesbank-PDF. Ein eigenstaendiger
koordinatenbasierter `pdftohtml`-Reader prueft 77 Jahreswerte gegen das
Generatorartefakt, die einzige erlaubte 1945-1948-Luecke und das schreibfreie
Verifikationsgate; der abgeleitete Layout-Extrakt ist nicht das Oracle.
Poppler `pdftohtml` ab Version 25.07.0 ist deshalb eine fail-closed
Testvoraussetzung. Das Programm wird ueber `PATH`,
`RUHESTANDSAPP_POPPLER_BIN` oder `RUHESTANDSAPP_PDFTOHTML` aufgeloest;
`npm run verify:poppler-toolchain` prueft die Installation. Der Test bindet
nicht an eine konkrete Patchversion oder einen lokalen WinGet-Paketpfad.

#### `german-cash-money-market-backtest-delta.test.mjs`
**Zweck:** Validiert die Slice-04-Vorher-/Nachher-Evidenz gegen den
eingefrorenen Post-Slice-03-Zielstand und die archivierte, byteidentische
Post-Slice-04-Zielkopie.
- **Identitaet:** Input-Hashes und Outcome-Klassen aller sieben
  Referenzfaelle bleiben stabil.
- **Deltas:** Vermoegen, Entnahmen, Steuern, Kuerzungsmetriken, Drawdown,
  Runway und FlowDelta tragen die alleinige Ursache
  `german_cash_money_market_chain`.
- **Marker:** Backtest und Monte Carlo verwenden in 2000/2001 denselben
  generierten aktuellen Jahreswert; der Legacy-Vergleich bleibt sichtbar
  `t-1`. Die Runtime-Zinsgutschrift wird zusaetzlich fuer Hochzins 2000,
  Uebergang 2019 und negatives EURSTR 2020 bis zum FlowDelta nachgerechnet.
- **Bilanzgate:** Vorher und nachher bleibt der maximale absolute
  `portfolio_flow_delta` unter 1 EUR.

#### `gold-german-investor-chain.test.mjs`
**Zweck:** Testet die generierte 1925-2025-Goldkette in deutscher
Anlegerwaehrung.
- **Quellenidentitaet:** JST-R6-XLSX, zwei Bundesbank-SDMX-CSV-Snapshots und
  World-Bank-Pink-Sheet-XLSX stimmen mit den gepinnten SHA-256-Werten
  ueberein.
- **Rekonstruktion:** 101 endliche Jahresreturns werden ausschliesslich aus
  dem generierten Modul in `HISTORICAL_DATA` und `annualData` projiziert;
  Markerformeln pruefen den offiziellen RFC-Jahresendanker 1933, den
  gesetzlichen 1934-Anker sowie Frankfurt- und EUR-Naehte unabhaengig. Die
  Zeitkonvention trennt Jahresend-, Teiljahres- und Jahresdurchschnittsregime.
- **Nullwerte:** Alle zwoelf literal verbleibenden Nullen tragen eine
  source-derived oder explizit estimated Erklaerung. Abgeleitete Nullen
  muessen Gleichheit beider Quellkomponenten belegen; unklassifizierte Nullen
  und Fallback-Zero-Segmente sind verboten.
- **Anwendung:** Der Goldreturn wird genau einmal auf den Goldbestand
  angewandt. Produktaufschlag, Spread, Verwahrung, Steuer und Tracking sind
  nicht Teil der Datenreihe.

#### `gold-german-investor-backtest-delta.test.mjs`
**Zweck:** Validiert die isolierte Slice-05-Vorher-/Nachher-Evidenz.
- **Goldfreie Invarianz:** Alle sieben festen goldfreien
  Charakterisierungsfaelle behalten Finanzmetriken, Outcomes und FlowDelta
  exakt; abweichende Row-Hashes entstehen nur durch diagnostische
  Goldreturnfelder.
- **Gold-Witness:** Ein echter sechsjaehriger UI-/Provider-/Backtestlauf
  2000-2005 mit 200.000 EUR Start-Gold und aktivem Zehn-Prozent-Ziel wird
  einmal gegen die Slice-04-Goldwerte und einmal gegen die aktuelle Kette
  ausgefuehrt. Acht Finanzmetriken, Outcomes, Row-Hashes und FlowDelta werden
  vorher/nachher eingefroren; mindestens ein Finanzwert muss sich wirksam
  aendern.

#### `simulation-data-inventory.test.mjs`
**Zweck:** Testet das simulationsweite Evidenzinventar und seine Quell-Gates.
- **Historieninventar:** Sechs eigene, lueckenlose 1925-2025-Segmentvertraege
  einschliesslich der aufgeloesten Aktien-, VPI-, Cash-/Geldmarkt- und
  Gold-Quellketten.
- **Statische Klassen:** Demografie, Pflege, Hinterbliebene, Steuern/Tranchen,
  Rente/Sozialversicherung, Stress/Regime und Default-/Fallbackwerte besitzen
  Implementierungsabdeckung und getrennte Evidenzklassen.
- **Wertfingerprints:** Historienreihen und exportierte statische Daten werden
  kanonisch gegen SHA-256 geprueft; lokale UI-/Steuerdefaults werden gegen
  ihre produktiven Quellen abgeglichen.
- **Negativ-Gates:** Erfundenes `unresolved`, unbelegte externe Validierung und
  statische Wertdrift schlagen fail-closed fehl.

#### `german-demography-care-survivor-contract.test.mjs`
**Zweck:** Validiert den generierten Demografie-/Pflege-/Hinterbliebenenvertrag.
- **Sterblichkeit:** Perioden- statt Kohortensemantik, Destatis-Periode
  2023/2025, Mann/Frau/divers-Marker, offizieller Altersbereich 18-100,
  expliziter Modellrand 101-110 und fehlende kuenftige
  Mortalitaetsverbesserung.
- **Pflege:** Amtliche Bestandszahlen/Praevalenzen bleiben
  `context_only_not_runtime_validation_or_transition_probability` (ohne
  Laufzeitvalidierung); Eintritt Grad 1/2,
  Progression und Dauer sind getrennte Modellannahmen.
- **Hinterbliebene:** `percent`/55 entspricht dem UI-Default, bleibt aber
  ausdruecklich keine gesetzliche Anspruchsberechnung.
- **Runtime/Diagnose:** Re-Exports und
  `DemographyCareSurvivorDiagnosticsV1` tragen Revision, Hashes und
  Aussagegrenzen; das Verify-Gate rekonstruiert byteidentisch.

#### `german-demography-care-survivor-source-reconstruction.test.mjs`
**Zweck:** Rekonstruiert mit einem separaten ZIP/XML-Leser alle 166 amtlichen
Runtime-`qx` fuer Mann/Frau und Alter 18-100 direkt aus dem gepinnten
Destatis-Workbook. Zusaetzlich werden Pflege-Gesamtbestand, alle fuenf
Pflegegradbestaende und 21 Alters-/Geschlechts-Praevalenzmarker aus dem
zweiten Original nachgerechnet.

#### `demography-care-survivor-runtime-measurement.test.mjs`
**Zweck:** Berechnet das stochastische 2.048-Run-/40-Jahres-Profil mit festem
Seed in jedem Lauf live. Der Test kann weiterhin einen Vergleichsstand ueber
`DEMOGRAPHY_MEASUREMENT_RUNTIME_ROOT` laden, aktiviert Pflege, Partner und
55-Prozent-Hinterbliebenen-Cashflow und vergleicht Monte Carlo sowie zwei
Sweep-Kombinationen vollstaendig mit der Slice-19-Zielfixture. Die neue Datei
bindet die unveraenderte Slice-17-Eingangsgrenze per SHA-256 und versioniert den
Vor-Auszahlungs-Runway sowie die korrigierte Monatsmetrik des Sweeps. Die
Slice-17-Datei bindet weiterhin den unveraenderten Slice-10-Eingang. Das
bytegeschuetzte `post-backtest-data-07-v1` bleibt eine unabhaengige Quelle fuer
die stabilen Slice-07-Demografieinvarianten; Runtime, Hashkette und aktive
Pflege-/Todes-/Hinterbliebenenpfade werden getrennt geprueft.

#### `historical-backtest-metrics.test.mjs`
**Zweck:** Testet das vollstaendige `HistoricalBacktestMetricsV3`-Woerterbuch und die reine Ableitung aus kanonischen Rohzeilen.
- **Definitionen:** Eindeutige IDs, Einheiten, nominal/real-Basis, Nenner, Rundung, Missingness, Outcome-Regel und Rohquellen fuer alle 29 Metriken.
- **Reconciliation:** Start-/Endvermoegen, reale Werte, Entnahmen, Floor-Shortfall, Haushalts-Flexbedarf/-Erfuellung, inklusive `>= 10 %`-Haushalts-Flexgrenze, finaler Mindest-Flex-Fehlbetrag, nullable Runway der Phase `after_transaction_before_payout`, Drawdown, Steuern, Verlusttopf, Pflegebucket und Outcome-Indikatoren. Gemischte oder fehlende Runway-Phasen invalidieren das Aggregat; terminale Ruinzeilen werden nicht als Null-Prozent-Stressjahr gezaehlt. Historische Rohzeilen ohne Haushaltsquote nutzen kontrolliert den Legacy-Kuerzungswert.
- **Fehlerpfade:** `incomplete`/`technical_error` erhalten keine erfundenen Finanzmetriken; Ruin behaelt additive Floor-Deckungsdiagnostik.

#### `historical-backtest-cohorts.test.mjs`
**Zweck:** Testet `HistoricalBacktestCohortsV1` und feste ueberlappende In-sample-Fenster.
- **Fenstervertrag:** Positive ganzzahlige inklusive Horizontlaenge, alle Kandidaten, `insufficient_horizon` fuer spaete Fenster und `yearIndex=0` je Cohort.
- **Batch/Outcomes:** Ein Provider-Batch-Preflight, keine Doppelvalidierung ueberlappender Jahre sowie getrennte Inventare fuer alle Outcomes und Ausschluesse.
- **Aussagegrenze:** Keine Erfolgswahrscheinlichkeit oder Unabhaengigkeitsbehauptung; Null-Eligible-Raten bleiben `null`.

#### `historical-backtest-export.test.mjs`
**Zweck:** Testet `HistoricalBacktestExportV2`, `HistoricalBacktestInputSemanticsV2` und die feste technische CSV-Projektion.
- **Reproduktion:** Request-/Result-Fingerprint, inklusive Periode, Dataset-/Manifest-/Temporal-/Engine-/Source-Commit-Provenienz, nicht restartfaehige aggregierte Portfolio-Grenzen, Quantisierungs-/Eingabesemantik, Records, Rows, Metriken und optionales Cohort-Inventar.
- **Stabilitaet:** Exportzeitpunkt und Detailtoggle aendern den Result-Fingerprint nicht; Source-Commit, Datenrevision, Quantisierung und kanonische Endsumme sind fingerprintwirksam. Fehlende/dirty Provenienz und widerspruechliche Endsumme scheitern fail-closed.
- **CSV/Sicherheit:** `HistoricalBacktestCsvV2` mit 34 festen Spalten einschliesslich der neuen fuehrenden, mit Raw-JSON geteilten kanonischen `run_id`, getrennte Haushalts-/Renten-/Depot-Flexbasis, finaler Mindest-Flex samt Fehlbetrag, Pflegebucket-inclusive Portfoliogrenzen, Punktdezimalen, LF, leere Missingness, keine HTML-/Displayformatter und Schutz gegen Formel-, Quote-, Delimiter- und Zeilenumbruchinjektion.

#### `simulator-backtest-characterization.test.mjs`
**Zweck:** Vergleicht die unveraenderte Slice-01-Baseline `legacy_observed` mit dem separaten D-01-Zieloracle `target_expected`.
- **Golden Cases:** kurzer und langer Completed-Pfad, 3-Bucket/Mindest-Flex, der eigene D-17-Zeuge 2000-2010 mit Einzeljahren 2001/2005/2009/2010, Ruin, Pflegebucket-Projektionsluecke, Dynamic-Flex/CAPE, zwei lohnindexierte JST-Fenster 1930-1940 und 1935-1946 sowie der Lohnquellen-Nahtzeuge 1944-1950.
- **Negative Cases:** Einjahreslauf, NaN-/rueckwaertige Periode, mittlere Datenluecke und nicht-finite Goldrendite.
- **Messvertrag:** kanonische Input- und Row-Hashes, Non-Mutation, Metrikwoerterbuch, 2000/2001-Alignment sowie kontrollierte Abloesung von `legacy_schema_v0` durch `backtest_ui_state_v1`; Detailtoggle-Paritaet bleibt erhalten.
- **Delta-Gate:** `BacktestTemporalDeltaReportV1` benennt jede geaenderte Metrik samt Ursache und berichtet Endvermoegens-, Ruinfall- sowie Downstream-Consumer-Auswirkungen; nicht gespeicherte Zieldeltas schlagen fehl. `CapeWageBacktestDeltaEvidenceV3` bleibt als bytegehashtes Slice-06-Archiv erhalten. `DemographyCareSurvivorBacktestDeltaEvidenceV1` bindet den neuen Sterbetafelhash, den Lohnnahtzeugen und fuer aktiven sowie CAPE-inaktiven Arm den direkten Slice-06-zu-Slice-07-Vergleich mit zehn exakten Kennzahlen. `Slice07To08LiquidityRunwayBacktestDeltaV1` misst davon getrennt die echte Runway-Slice-Wirkung; der CAPE-an/aus-Effekt innerhalb des aktuellen Laufs bleibt ein drittes separates Orakel. Pflege/Hinterbliebene sind im deterministischen Backtest inaktiv.
- **Fixtures:** `fixtures/simulator-backtest-baseline-v1.json` und die bytegehashte Slice-06-V3-Evidenz bleiben read-only; `fixtures/simulator-backtest-target-v1.json` darf kontrolliert mit `UPDATE_BACKTEST_TARGET=1 node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs` erzeugt werden. Die Slice-07-Evidenz wird einmalig mit `CREATE_BACKTEST_DATA_07_DELTA=1` angelegt und danach nicht ueberschrieben. `fixtures/liquidity-runway-slice-08-measurement-v1.json` bleibt der unveraenderliche Slice-09-Eingang; `fixtures/minimum-flex-slice-09-measurement-v1.json` speichert getrennt das Slice-08-zu-09-Ledger und den D-17-Zeugen. Fuer CR10-14 belegt `minimum-flex-slice-09-added-case-financial-v1.json` die am Commit `2e4867f` nachgemessene Finanzbasis des zwoelften Falls; `node tests/reconstruct-slice09-d17.mjs` rekonstruiert diese Messung aus dem archivierten Commit. Das einzige autoritative 12/12-Ledger liegt als `Slice09To10FinancialDeltaLedgerV2` in `tax-logic-slice-10-backtest-measurement-v1.json` und ist unveraenderlich. `PRINT_BACKTEST_DATA_10=1` erlaubt nur eine lesende Diagnose; `UPDATE_BACKTEST_DATA_10=1` wird absichtlich blockiert.
- **Slice-13-Integration:** `fixtures/backtest-data-integration-slice-13-v1.json`
  pinnt acht echte Referenzfenster ab 1930, darunter ein dediziertes
  Stagflationsfenster 1970-1982 und ein Crashfenster 2007-2010, die
  SHA-256-Kette der Slice-2-bis-10-Deltaevidenzen und den inklusiven
  26-Jahres-Lauf 2000-2025. Die Finanzneutralitaet der Slices 11 bis 13 wird
  als Gleichheit des kanonischen 26-Jahres-Rowhashes gegen die Slice-12-Basis
  gemessen.
  Alle Referenzen muessen `portfolio_flow_delta < 1 EUR` halten. Der finale
  Raw-JSON-Export bleibt bis zum extern geprueften Slice-13-Commit gesperrt.
  Der Test misst Git-HEAD und Git-Status, bindet sie in die Runtime-Provenienz
  und erwartet im Dirty-Tree `HISTORICAL_EXPORT_SOURCE_TREE_DIRTY`; auf einem
  sauberen Commit muss dasselbe Gate in den erfolgreichen Exportzweig
  umschlagen und einen Result-Fingerprint liefern.
- **Slice-17-Runway-Basis:** Die neue Fixture
  `fixtures/liquidity-runway-basis-slice-17-measurement-v1.json` bindet den
  aktuellen vollstaendigen Charakterisierungshash und den erwarteten Delta-
  Zeugen des inklusiven 2000-2025-Integrationsfalls. Die Slice-13-Aussage zur
  damaligen Finanzneutralitaet bleibt in ihrer byteidentischen Eingangsfixture
  unveraendert. Aus der Slice-10-Grenze bleiben sowohl
  `crossSliceOracleProjection` als auch das vollstaendige Deltaledger durch
  exakte Runtime-Hashes gebunden; der aktuelle Runtimepfad darf sich nicht als
  die alte neutrale Grenze ausgeben.
- **Slice-14-Ergebnisvalidierung:**
  `backtest-data-validation-slice-14.test.mjs` verwendet das vollstaendige
  Slice-13-Ergebnisdokument als Eingangsgrenze. Die Fixture
  `fixtures/backtest-data-validation-slice-14-v1.json` pinnt den sauberen
  Slice-13-Commit `bbc25ab`, Ergebnisdokument und Integrationsfixture per
  SHA-256 sowie den finalen Exportfingerprint. Die separate Fixture
  `fixtures/backtest-data-validation-slice-14-fingerprint-basis-v1.json`
  enthaelt die vollstaendige kanonische Fingerprint-Basis; der Test berechnet
  den Fingerprint daraus mit dem produktiven Kanonisierungsvertrag neu. Er
  liest die Eingangsbytes und alle neun Attributionsevidenzen direkt aus dem
  archivierten Commit, prueft Ergebnisdokument und Integrationsfixture
  zusaetzlich im lebenden Arbeitsbaum, bindet aktive Daten und Manifest samt
  neu berechneten Hashes, verlangt Git-Erreichbarkeit und Vorfahrenbeziehung
  und prueft acht eindeutige inklusive Referenzperioden, vollstaendige
  Jahreszeilen, endliche Summen und endliches `FlowDelta < 1 EUR`.
  Die Slice-11-bis-13-Finanzneutralitaet wird ausdruecklich nicht als belegt
  behandelt, weil der Integrationsfall im Slice-12-Commit nicht existierte.
- **Slice-15-Datenpruefung:**
  `backtest-data-validation-slice-15.test.mjs` verwendet das vollstaendige
  Slice-14-Ergebnisdokument am sauberen Commit `619c4d4` als Eingangsgrenze.
  Die Fixture `fixtures/backtest-data-validation-slice-15-v1.json` pinnt
  Ergebnisdokument, Slice-14-Validierungsfixture und -test sowie die
  kanonische Fingerprintbasis per SHA-256. Der Test liest die unveraenderten
  Vorgaengerartefakte direkt aus dem Commit, protokolliert CR14-14/CR14-15
  ohne erneute Bytebindung des fortschreibbaren Slice-14-Dokuments und
  rekonstruiert Dataset-/Manifest- und Result-Fingerprint aus der
  bytegebundenen Live-Basis. Die sieben bereits
  vorhandenen Rekonstruktions-/Kettengates bleiben Owner der
  `verify:*data`-Builderausfuehrung; Slice 15 bindet Paketkommando, Skriptpfad,
  Gate-Datei und gefangene `spawnSync`-Prozessgrenze, ohne die
  Builder in `npm test` doppelt auszufuehren. Sieben zeilenendensensitive
  Originalquellen sind in `.gitattributes` als `binary` markiert. Vor dem
  Commit prueft das Gate den gemeinsamen Acht-Pfade-Kandidaten; nach dem
  Slice-Commit vergleicht es die tatsaechlichen HEAD-Blobbytes mit den
  gepinnten SHA-256-Werten. Der gemeinsame Slice-15-Commit `efd51ad` enthaelt
  den Binaervertrag und der Post-Commit-Pfad besteht mit 155/155 Assertions.
  Die offene
  Finanzneutralitaet gegen Slice 12 bleibt als
  `not_demonstrated_against_slice_12_commit` erhalten. Das versionierte
  Nachfolgerverfahren fuer Evidenzfortschreibungen ist dokumentiert, aber
  ausdruecklich nicht maschinell gegen autorisierte Fixtureaenderungen oder
  fehlendes externes Review erzwingbar. Repositoryinterne Rekonstruktion ist
  keine externe wissenschaftliche Validierung.
- **Slice-16-Datenpruefung:**
  `backtest-data-validation-slice-16.test.mjs` verwendet das vollstaendige
  Slice-15-Ergebnisdokument am sauberen Commit `efd51ad` als Eingangsgrenze.
  Die Fixture `fixtures/backtest-data-validation-slice-16-v1.json` bindet
  Ergebnisdokument, Slice-15-Fixture und Slice-15-Test per SHA-256 und prueft
  alle drei Pfade auch im lebenden Baum. Der CI-Checkout muss mit
  `fetch-depth: 0` die fuer Slices 14 bis 16 benoetigte Vorgaengerhistorie
  bereitstellen; das Gate isoliert den benannten Checkout-Schritt und prueft
  `fetch-depth: 0` nur in dessen eigenem `with`-Block. Der Test leitet alle
  textartigen Originalquellen unter `data/historical` und `data/static` aus
  Commit- und Live-Inventar ab, verlangt fuer die vollstaendige Menge
  Binaerattribute und vergleicht deren Bytes mit den gepinnten Hashes. Dataset
  und Manifest werden aus produktiven Daten neu
  berechnet. Der Result-Fingerprint belegt nur die Selbstkonsistenz der
  committeten kanonischen Archivbasis. Der lebende Engine-Nachweis bleibt
  unabhaengig beim Charakterisierungsgate; Slice 16 fuehrt ihn nicht erneut
  aus und bindet ihn nicht ueber Quelltext-Teilstrings. Die offenen Grenzen zur
  Slice-12-Finanzneutralitaet und zur externen wissenschaftlichen Validierung
  bleiben erhalten; Builder werden nicht doppelt ausgefuehrt.

#### `simulator-real-withdrawal-contract.test.mjs`
**Zweck:** Testet den Simulatorvertrag für echte Realentnahmen.
- dreijähriger synthetischer 10-%-Inflationsfall mit Faktoren `1 / 1,1 / 1,21`
- genau einmal fortgeschriebener App-State und Engine-`lastState`-Spiegel
- Ansparjahre und erstes Entnahmejahr beziehen sich auf die Kaufkraft des ersten Simulatorjahres
- deterministische MC-Log- und Realentnahmestichprobe verwenden denselben Faktorvertrag
- nominaler und realer MC-Maximum-Drawdown verwenden dieselben erfolgreichen Portfoliopunkte; die reale Serie deflationiert jeden Punkt mit dem zugehoerigen kumulierten Inflationsfaktor

#### `simulator-heatmap.test.mjs`
**Zweck:** Testet Heatmap-Rendering.
- **viridis:** Farbskala-Endpunkte (0 → dunkelviolett, 1 → gelb)
- **computeHeatmapStats:** Leere/einzelne Werte
- **renderHeatmapSVG:** Cell-Mapping, Legende
- **4,5-Prozent-Grenze:** Das exakt bei 4,5 Prozent beginnende Bin gehoert zur
  bin-basierten `>=`-Ueberlagerung; Basis, Operator und Berichtsrolle sind
  sichtbar und vom strikt-`>`-Gesamt-KPI getrennt
- **renderSweepHeatmapSVG:** Placeholder bei leeren Ergebnissen

#### `scenario-analyzer.test.mjs`
**Zweck:** Testet Szenario-Analyse und -Vergleich.
- **extractKeyMetrics:** Defaults, Typ-Coercion, NaN-Handling
- **analyzeScenario Tags:** care, failed, early_care, severe_cut, widow, crash
- **Tags aus logDataRows:** Erkennung von Events in Jahresdaten
- **compareScenarios:** Ranking nach Endvermögen, failed-Flag

#### `scenarios.test.mjs`
**Zweck:** End-to-End-Verifikation komplexer Lebenspfade.
- **Care Case:** Hohe Pflegekosten-Deckung
- **Widow/Survivor:** Rentenreduktions-Logik
- **Market Crash:** Notfall-Refill und Kapitalerhalt

### 8. Profilverbund (Multi-Profil)

#### `profile-storage.test.mjs`
**Zweck:** Testet das Profil-Registry-System.
- **Default Profile:** Automatische Erstellung bei leerem Storage
- **ensureProfileRegistry:** Idempotenz (nur 1 Default)
- **Slug-Konflikte:** Automatische Suffix-Generierung
- **Slug-Normalisierung:** Umlaute, Leerzeichen, Sonderzeichen entfernt
- **renameProfile:** Name-Update ohne ID-Änderung
- **deleteProfile:** Löschen, Schutz des letzten Profils, Switch nach Löschung
- **switchProfile:** Save/Load, Profile-scoped Keys werden gelöscht
- **getProfileMeta/Data:** Lesen einzelner Profile
- **updateProfileData:** Merge-Verhalten
- **belongsToHousehold:** Verbund-Mitgliedschaft
- **Export/Import:** Bundle-Format, Globals-Handling
- **Korrupte Daten:** Graceful fallback bei ungültigem JSON

#### `profilverbund-balance.test.mjs`
**Zweck:** Testet Balance-App Aggregation über Profile.
- **aggregateProfilverbundInputs:** Summenbildung (Bedarf, Renten, Depots)
- **calculateTaxPerEuro:** Steuerquote basierend auf Gewinnanteil
- **calculateWithdrawalDistribution:**
  - Proportional: Nach Depot-Anteil
  - Tax-optimized: Niedrigste Steuer zuerst
  - Runway-first: Nach Runway-Zielgewichten
  - Cash-first: Tagesgeld/Geldmarkt vor Tranchenauswahl
- **selectTranchesForSale:** FIFO + Steueroptimierung
- **Asset-Summaries:** Detailtranchen ersetzen aggregierte Assetwerte ohne Doppelzählung

#### `profilverbund-profile-gold-overrides.test.mjs`
**Zweck:** Testet Gold-Parameter-Overrides aus Profil-Storage.
- profile_gold_aktiv überschreibt inputs.goldAktiv
- profile_gold_ziel_pct überschreibt goldZielProzent
- Komma-Parsing für deutsche Zahlenformate (7,5 → 7.5)
- belongsToHousehold=false wird nicht geladen

#### `simulator-multiprofile-aggregation.test.mjs`
**Zweck:** Testet Simulator-Profile-Kombination.
- **combineSimulatorProfiles:** Vermögens-/Bedarfs-Summen
- Primary/Partner-Aufteilung bei 2 Profilen
- Warning bei >2 Profilen, während finanzielle Summen erhalten bleiben
- Detailtranchen-Merge mit profilbezogenen IDs und `sourceProfileId`
- Pflegebucket-Definition des Primary-Profils gilt als Haushaltsdefinition; abweichende sekundäre Definitionen erzeugen Warnungen
- Null-Marktwert-Tranchen fallen mit Warnung auf aggregierte Startwerte zurück
- Balance-Bedarfswerte haben Vorrang vor historischen `sim_`-Werten; diese
  bleiben nur Fallback, wenn der Balance-Wert fehlt

#### `simulator-household-needs-persistence.test.mjs`
**Zweck:** Testet den globalen Vertrag für manuelle Haushaltsbedarfs-Overrides.
- einmalige Migration eines vollständigen gültigen `sim_`-Altwert-Trios
- automatische Migration ausschließlich im sicher zuordenbaren
  Einprofil-Haushalt; Mehrprofilwerte bleiben bei der aggregierten Profilbasis
- früher `migration_pending`-Vertrag ohne Abhängigkeit vom erfolgreichen
  Profilverbund-Aufbau; ein fehlender Profilverbund blockiert Simulatorläufe
  sichtbar und fail-closed
- unabhängig kanonisierte feldbezogene Overrides und Präzedenz vor Profil-Summen
- native feldnahe Validierung ungültiger Eingaben, wirksame
  Mindest-Flex-/Flex-Invariante mit letztem wirksamen Nachbarwert, reloadfeste
  Eingabe-Zwischenstände und Ablehnung nicht exakt darstellbarer Großwerte
- exakte Schemaversion mit einmaliger Warnungsquittierung, Selbstheilung
  beschädigter V1-Daten, schreibgeschützte Zukunftsversionen und Reset ohne
  erneute Migration

### 9. Utilities & Hilfsfunktionen

#### `utils.test.mjs`
**Zweck:** Validiert Kern-Hilfsfunktionen.
- **Währungsformatierung:** formatCurrency, formatCurrencyShortLog
- **Math-Funktionen:** Mean, StdDev, Quantile
- **RNG-Stabilität:** Seeding, Forking, Determinismus

#### `formatting.test.mjs`
**Zweck:** Testet alle Formatierungsfunktionen.
- formatCurrency, formatCurrencyShortLog, formatCurrencyRounded
- formatCurrencySafe (undefined → "—")
- formatNumberWithUnit, formatPercentage
- formatPercentValue, formatPercentRatio
- formatDisplayNumber (Tausender-Gruppierung)
- Non-breaking Space Normalisierung

#### `feature-flags.test.mjs`
**Zweck:** Testet Feature-Flag-System.
- **Defaults:** engineMode='adapter', useWorkers=false
- **isEnabled/toggleFlag:** In-memory und localStorage-Persistenz
- **Invalid Flag:** Wirft Fehler

### 10. Integration & Parity

#### `suite-data-integration-contract.test.mjs`
**Zweck:** Bindet den Abschluss der Suite-Datenintegritaet an ein
maschinenlesbares Traceability-Inventar.
- ordnet O-01 bis O-22 konkreten Dateien und Witness-Markern zu;
- bindet alle 65 Ausgangsbefunde des Arbeitsplans an Fix-/Nachweisslices,
  Orakel beziehungsweise direkte Witnesses und das tatsaechliche Node- oder
  Browsergate;
- bildet die acht verbindlichen Zielvertraege I-01 bis I-08
  maschinenpruefbar auf ihre Orakel und direkten Recovery-Witnesses ab;
- prueft die Browservertraege Preview/Commit, 3-Bucket, Hybridprofil,
  Import/Recovery, Sweep und Optimizer;
- inventarisiert Single-/Multi-Profil-, Main-/Worker-,
  MC-/Ein-Zellen-Sweep- und Evaluate-/Apply-Paritaet;
- vergleicht alle sichtbaren Sweep-/Optimizerparameter mit kanonischen Keys,
  Domains, Consumern und Provenienz-Witnesses; dieser Datenpfadnachweis ist
  kein eigenstaendiger KPI-Wirkungsnachweis;
- haelt die freigegebenen Backtest-, Monte-Carlo-, FlowDelta- und
  `engine.js`-Blob-Baselines unveraendert.

#### `portfolio.test.mjs`
**Zweck:** Unit-Tests für Portfolio-Operationen.
- buyGold, sumDepot
- DOM-unabhängige Initialisierung
- Portfolio-Struktur-Validierung

#### `worker-parity.test.mjs`
**Zweck:** Kritische Parity-Prüfung.
- MC/Sweep Chunk-Merges produzieren identische Aggregate wie Single-Pass
- Worker-Chunking beeinflusst Ergebnisse nicht
- Sweep-Metrikmetadaten, Unsicherheitsdiagnostik und CRN-Provenienz bleiben
  ueber Chunkgrenzen identisch.
- Pflegekosten-Drift bleibt beim Szenario-Klon und über Care-Chunks als
  normalisiertes Verhältnis unverändert

#### `depot-tranches.test.mjs`
**Zweck:** Testet Tranchen-Verwaltung.
- **sortTranchesFIFO:** Älteste Tranche zuerst
- **calculateTrancheTax:** Teilverkauf mit TFS und Kirchensteuer
- **applySaleToPortfolio:**
  - FIFO-Reduktion über Matching-Tranchen
  - Proportionale Kostenbasis-Reduktion
  - Mehrere Kategorien (Aktien, Gold, Geldmarkt)
  - Profilbezogene Tranche-IDs verhindern Cost-Basis-Vermischung bei identischen Positionen aus verschiedenen Profilen

### 11. Worker-Pool & Parallelisierung

#### `worker-pool.test.mjs`
**Zweck:** Testet Worker-Pool-Lifecycle und Job-Verwaltung.
- **Pool-Erstellung:** Korrekte Größe, Initialisierung
- **Fehlerbehandlung:** Pool ohne URL wirft Fehler
- **runJob:** Einzelner Job, mehrere parallele Jobs
- **broadcast:** Init an alle Worker
- **Queue-Verarbeitung:** Jobs werden in Reihenfolge abgearbeitet
- **dispose:** Vollständige Ressourcen-Freigabe
- **Transferables:** ArrayBuffer-Übertragung
- **Callbacks:** onProgress, onError
- **Telemetrie:** Job-Start/Complete-Aufzeichnung
- **Worker-IDs:** Eindeutige Zuweisung
- **Größen-Normalisierung:** 0/-5/'invalid' → 1
- **Job-Typen:** 'job' (MC), 'sweep'
- **Idle-Management:** Worker werden nach Job-Ende wieder verfügbar

---

## Test-Kategorien nach Priorität

### Priorität 1: Finanz-Kern (Kritisch)
- `spending-planner.test.mjs`
- `transaction-tax.test.mjs`
- `tax-settlement.test.mjs`
- `core-tax-settlement.test.mjs`
- `liquidity-guardrail.test.mjs`
- `core-engine.test.mjs`
- `engine-robustness.test.mjs`

### Priorität 2: Algorithmen & Logik
- `monte-carlo-sampling.test.mjs`
- `monte-carlo-startyear.test.mjs`
- `simulator-monte-carlo.test.mjs`
- `care-meta.test.mjs`
- `market-analyzer.test.mjs`
- `scenario-analyzer.test.mjs`

### Priorität 3: Transaktions-Details
- `transaction-engine-ath.test.mjs`
- `transaction-engine-rebal.test.mjs`
- `transaction-gold-liquidity.test.mjs`
- `transaction-quantization.test.mjs`
- `spending-quantization.test.mjs`

### Priorität 4: UI & Persistenz
- `balance-*.test.mjs` (alle Balance-App-Tests)
- `profile-storage.test.mjs`
- `profilverbund-*.test.mjs`

### Priorität 5: Integration & Parity
- `worker-parity.test.mjs`
- `scenarios.test.mjs`
- `simulation.test.mjs`
- `simulator-headless.test.mjs`
- `simulator-backtest.test.mjs`
- `simulator-tax-settlement.test.mjs`

### Priorität 6: Utilities & Sweep
- `utils.test.mjs`
- `formatting.test.mjs`
- `feature-flags.test.mjs`
- `simulator-sweep.test.mjs`
- `auto-optimizer.test.mjs`
- `auto-optimize-fidelity.test.mjs`

---

## Debugging

### Testfehler analysieren
Bei fehlgeschlagenen Tests wird detailliertes Logging nach stdout ausgegeben. Einzelne Tests können isoliert werden:
```bash
node tests/run-single.mjs my-test.test.mjs
```

### DOM/Browser-Mocking
Die meisten Tests benötigen Mocks für Browser-Globals. Typisches Pattern:
```javascript
// Setup
const prevLocalStorage = global.localStorage;
global.localStorage = createLocalStorageMock();
global.document = createDocumentMock();

try {
    // ... Tests ...
} finally {
    // Cleanup
    if (prevLocalStorage === undefined) delete global.localStorage;
    else global.localStorage = prevLocalStorage;
}
```

### Worker-Tests
Worker-Tests verwenden MockWorker-Klassen, da echte Web Worker in Node.js nicht verfügbar sind.

---

## Testdatei-Übersicht (Alphabetisch)

| Datei | Lines | Zweck |
|-------|-------|-------|
| `3bucket-config.test.mjs` | ~90 | 3-Bucket-Konfiguration und Engine-Input-Mapping |
| `3bucket-refill.test.mjs` | ~160 | Bond-Refill und 3-Bucket-Nachsteuerung |
| `architecture-evidence.test.mjs` | ~170 | Offline-Contract für Evidenzrecords, Pflichtfelder, IDs, Anker, lokale Links und Fälligkeiten |
| `auto-optimizer.test.mjs` | ~850 | Mehrphasige Optimierung, LHS, Constraints |
| `auto-optimize-fidelity.test.mjs` | ~580 | O-15/O-20, Registry-, Fingerprint- und Apply-Paritaet |
| `auto-optimize-metrics-contract.test.mjs` | ~170 | O-21, P10/P25/P50, D-14, Quantilselector und fail-closed Metriken |
| `auto-optimize-worker-contract.test.mjs` | ~260 | Auto-Optimize Worker-Merge-Contract |
| `balance-annual-cape.test.mjs` | ~140 | CAPE-Abruf, Fallback und Jahresupdate-Contract |
| `balance-annual-inflation.test.mjs` | ~130 | Jährliche Inflationsanpassung |
| `balance-annual-workflow-contract.test.mjs` | ~180 | Jahresupdate-/Jahresabschluss-Workflow-Contracts |
| `balance-binder-snapshots.test.mjs` | ~160 | Snapshot-Erstellung/-Restore |
| `balance-decumulation.test.mjs` | ~120 | Entnahmemodus-/3-Bucket-Input der Balance-App |
| `balance-health-bucket.test.mjs` | ~110 | Pflegebucket-Diagnose und diagnostic-only Policy in Balance |
| `balance-diagnosis-chips.test.mjs` | ~70 | Diagnose-Chip-Rendering |
| `balance-diagnosis-copy-contract.test.mjs` | ~100 | Kopierbarer Diagnose-Exporttext |
| `balance-diagnosis-decision-tree.test.mjs` | ~100 | Entscheidungsbaum-Logik |
| `balance-diagnosis-format.test.mjs` | ~40 | Diagnose-Normalisierung und Grenzfalltexte |
| `balance-diagnosis-guardrails.test.mjs` | ~100 | Guardrail-Chips |
| `balance-diagnosis-keyparams.test.mjs` | ~90 | Key-Parameter- und VPW-Diagnosefelder |
| `balance-diagnosis-transaction.test.mjs` | ~100 | Transaktions-Diagnose |
| `balance-dynamic-flex-gate.test.mjs` | ~100 | Dynamic-Flex-Gating in Balance |
| `balance-expenses.test.mjs` | ~180 | Ausgaben-Check, CSV, Storage und Kennzahlen |
| `balance-reader.test.mjs` | ~640 | DOM-Input-Lesen, Overrides |
| `balance-renderer-action.test.mjs` | ~120 | Action-Rendering, Quellen/Verwendungen |
| `balance-renderer-summary.test.mjs` | ~50 | Summary-Rendering |
| `balance-smoke.test.mjs` | ~340 | End-to-End Smoke-Test |
| `balance-storage-contract.test.mjs` | ~180 | Echte StorageManager-Migrationen und Snapshot-Contracts |
| `balance-storage.test.mjs` | ~490 | localStorage-Persistenz |
| `balance-ui-orchestration.test.mjs` | ~225 | Balance-UI-Bindings, Import-/Export-Control-Pfade, Schema-V1/V2-Migration, CSV-Provenienz und Profilverbund-Hooks |
| `browser-smoke.test.mjs` | ~1070 | Playwright-Gate fuer HTML-Einstiege, MC-/Backtest-UI, A11y/Negativpfade sowie zentrale Balance-/Tranchenflows |
| `suite-data-integration-contract.test.mjs` | ~330 | 65 Findings, I-01 bis I-08, O-01 bis O-22, Browser-/Paritaetsinventar, fail-closed Parameterpfade, Gate-Zuordnung und unveraenderte Delta-Baselines |
| `simulator-monte-carlo-browser.mjs` | ~520 | Vier isolierte MC-Browserfaelle fuer Worker, Fallback, Technikfehler, Cancel/Restart, V2-Download, adversarialen Szenariowechsel, A11y, sichtbare Pflege-/4,5-Prozent-Titel sowie centgenaue Exaktwert-/Drawdown-Layouts und die vollstaendige reale Simulatorseite nach einem Lauf bei 320 px |
| `care-meta.test.mjs` | ~200 | Pflegefall-Logik |
| `health-bucket.test.mjs` | ~160 | Pflegebucket-Trigger, Deckung, Verzinsung und Diagnose |
| `core-engine.test.mjs` | ~150 | EngineAPI-Basisvalidierung |
| `core-negative-contracts.test.mjs` | ~130 | Negative Kern-Contracts fuer Stop-Regel-nahe Fehlerpfade |
| `core-tax-settlement.test.mjs` | ~85 | Core Settlement-Integration und globale Quellen-Reconciliation |
| `coverage-inventory.test.mjs` | ~120 | Coverage-Inventar, Modulklassifikation und ungeladene/runtime-geladene Dateien |
| `coverage-report.test.mjs` | ~220 | V8-Coverage-Report, Pfadnormalisierung, Leerreport und obligatorische Dateigates |
| `results-renderers.test.mjs` | ~620 | DOM-freie Ergebnisrenderer fuer Outcome, KPIs, Unsicherheit, Pflege, Sampling, Missingness und Fehlerpfade |
| `depot-tranches.test.mjs` | ~130 | FIFO-Verkäufe, Steuer |
| `dynamic-flex-horizon.test.mjs` | ~40 | Sterbetafel-Horizonte, Single/Joint, Mean/Quantil |
| `engine-robustness.test.mjs` | ~240 | Edge Cases, Fehlereingaben |
| `feature-flags.test.mjs` | ~60 | Feature-Flag-System |
| `formatting.test.mjs` | ~120 | Formatierungsfunktionen |
| `historical-backtest-runner.test.mjs` | ~550 | DOM-freier Backtest-Runner, Dependency Injection, V1-Outcome/Result, Reconciliation und Non-Mutation |
| `historical-backtest-contract.test.mjs` | ~340 | V1-YearRecord, Missingness, Perioden-/Batch-Preflight, Cache-Instrumentation und Builderinventar |
| `historical-backtest-metrics.test.mjs` | ~170 | Versioniertes Metrikwoerterbuch, Reconciliation, Missingness und Outcome-Regeln |
| `historical-backtest-cohorts.test.mjs` | ~210 | Feste Rolling-Cohort-Fenster, Batch-Preflight, Outcome-/Ausschlussinventar und Aussagegrenze |
| `historical-backtest-export.test.mjs` | ~310 | Raw-JSON/CSV, Fingerprints, Provenienz, Roundtrip, HTML-/Formelinjektionsschutz |
| `historical-data-manifest.test.mjs` | ~180 | Manifestvollstaendigkeit, unresolved-Gates, kanonischer SHA-256 und immutable Lookup |
| `global-equity-research-chain.test.mjs` | ~100 | Gepinnte offene Eingaben, 1925-2025-Verkettung, Laenderluecken, Evidenzsegmente und neutrale Identitaet |
| `german-cash-money-market-chain.test.mjs` | ~360 | Gepinnte JST-/Bundesbank-Eingaben, 1925-2025-Kette, Methodenbrueche, Waehrungsreformgrenze, Cash-/Bond-Anwendung, Disclaimer und Hashbruecken |
| `german-cash-money-market-source-reconstruction.test.mjs` | ~230 | Unabhaengige PDF-Koordinatenrekonstruktion aller 77 Bundesbank-Jahre plus JST, einzig erlaubte Schaetzluecke und read-only Generatorgate |
| `german-cash-money-market-backtest-delta.test.mjs` | ~340 | Slice-04-Vorher-/Nachher-Beleg, Markerjahre, Steuer-/Kostenabgrenzung und FlowDelta |
| `german-gross-wage-growth-chain.test.mjs` | ~370 | JST-/Destatis-Quellidentitaet, Gebiet, Praezision, Methodenbrueche, Runtimeprojektion, Hash- und Generatorgate |
| `german-gross-wage-independent-oracle.test.mjs` | ~180 | Unabhaengiger XLSX-Parser fuer 22 JST-Lohnveraenderungen und zustandsbasierter HTML-Parser fuer alle 79 amtlichen Jahre |
| `gold-german-investor-chain.test.mjs` | ~460 | Gepinnte JST-/Bundesbank-/World-Bank-Eingaben, 1925-2025-Goldkette, Naehte, Nullwerterklaerungen, Runtimeprojektion und read-only Generatorgate |
| `gold-german-investor-backtest-delta.test.mjs` | ~240 | Slice-05-Invarianz goldfreier Faelle und deterministischer goldhaltiger Delta-Witness |
| `gold-german-investor-independent-oracle.test.mjs` | ~230 | Zweiter quellnaher XLSX-/CSV-Parser und unabhaengige Vollrekonstruktion aller 101 Goldreturns |
| `poppler-toolchain.test.mjs` | ~15 | Portierbare Aufloesung, Mindestversionsvertrag und Ablehnung inkompatibler Poppler-Versionen |
| `historical-data-robustness.test.mjs` | ~60 | Fehlende Marktdaten |
| `simulation-data-inventory.test.mjs` | ~330 | Historien-/Statik-Inventar, Evidenzklassen, Wertfingerprints und fail-closed Quell-/Lizenz-Gates |
| `us-shiller-cape-chain.test.mjs` | ~930 | Gepinntes Shiller-XLS, 101 Dezember-t-1-Entscheidungssignale, Headeridentitaet, Qualitaetssegment, No-Double-Lag und Generatorgate |
| `us-shiller-cape-independent-oracle.test.mjs` | ~220 | Zweiter OLE-/BIFF-Parser und unabhaengige Vollrekonstruktion aller 101 Shiller-CAPE-Entscheidungssignale aus der gepinnten Monatsquelle |
| `cape-utils.test.mjs` | ~20 | Explizite Entscheidungssignal-Eingabe, genaue Kandidatendeltas und vollstaendiger Estimated-History-Ausschluss des CAPE-Schaetzsegments |
| `liquidity-guardrail.test.mjs` | ~100 | Liquiditäts-Guardrails |
| `liquidity-runway-contract.test.mjs` | ~480 | Reiner Slice-08-Runwayvertrag: Default, Domain, Schritt, Fehlerwerte, Legacy-Migration und abgeleitete Policy |
| `market-analyzer.test.mjs` | ~150 | Markt-Regime-Klassifizierung |
| `mc-worker-contract.test.mjs` | ~170 | MC-Worker-Entrypoint, Lifecycle und Fehlervertraege |
| `monte-carlo-export-contract.test.mjs` | ~900 | V1-/V2-Request-, Result- und Exportprovenienz, Heatmap-/Einheitenvertrag, Drawdown-Domaene, ScenarioLog-V2-JSON/CSV, Akkumulations-Missingness, Mindest-Flex-Quelltrennung, Legacy-Warnungen und fail-closed Dispatcher |
| `monte-carlo-measurement-contract.test.mjs` | ~1100 | Golden Cases, Snapshot-Linie, Delta-Ledger, Ressourcen-/Worker-Paritaet |
| `monte-carlo-sampling.test.mjs` | ~200 | Bootstrap, Regime-Transitions |
| `monte-carlo-startyear.test.mjs` | ~100 | Startjahr-Auswahl |
| `persistence.test.mjs` | ~900 | PersistenceFacade, IndexedDB/localStorage/Tauri-Adapter und Migrationen |
| `portfolio.test.mjs` | ~100 | Portfolio-Operationen |
| `project-license-metadata.test.mjs` | ~80 | MIT-Projektlizenz in Lizenztext, npm-/Cargo-Metadaten und normativer Dokumentation |
| `profile-asset-values.test.mjs` | ~80 | Profil-Assetwerte und Aggregation |
| `profile-navigation.test.mjs` | ~100 | Profilnavigation und UI-State |
| `profile-state.test.mjs` | ~100 | Profilzustand und Storage-Contracts |
| `profile-storage.test.mjs` | ~570 | Profil-Registry CRUD, Bundle-Tranchen |
| `profile-ui-contract.test.mjs` | ~160 | Profil-UI-Contracts, Navigation und DOM-nahe Profilaktionen |
| `profilverbund-balance.test.mjs` | ~230 | Multi-Profil Aggregation, Entnahmeverteilung, Asset-Summaries |
| `profilverbund-profile-gold-overrides.test.mjs` | ~160 | Gold-Parameter-Overrides |
| `runner-contract.test.mjs` | ~260 | Test-Runner-Sortierung, Null-Assertion-Gate, Isolation, separate Gates, Legacy-Zaehler und QUICK_TESTS-Deprecation |
| `scenario-analyzer.test.mjs` | ~95 | Szenario-Tags, Vergleich |
| `slice-02-risk-display-copy-contract.test.mjs` | ~75 | Sichtbarer Copy-Contract fuer P10-Auswahlkriterium, Pflege-Nichtkausalitaet sowie Basis, Operator und Berichtsrolle der 4,5-Prozent-Anzeige in Ergebnissen, Heatmap und Auto-Optimize |
| `scenarios.test.mjs` | ~150 | Komplexe Lebenspfade |
| `simulation.test.mjs` | ~200 | Simulations-Integration |
| `simulator-3bucket-ui-e2e.test.mjs` | ~130 | 3-Bucket-UI-Integration im Simulator |
| `simulator-backtest-characterization.test.mjs` | ~990 | Legacy-/Target-Golden-Cases, Negativfaelle, Messvertrag und Delta-Reporter fuer den historischen Backtest |
| `simulator-backtest-ui.test.mjs` | ~200 | Backtest-Periodenvalidierung, Statussicherheit, Datenqualitaet, Tabellen-A11y und Cohort-Nullnenner |
| `simulator-backtest.test.mjs` | ~150 | Historischer Backtest |
| `simulator-dynamic-flex-persistence.test.mjs` | ~110 | Persistenz von Dynamic-Flex-Inputs |
| `simulator-headless.test.mjs` | ~125 | Headless 2000-2025 |
| `simulator-household-needs-persistence.test.mjs` | ~180 | Migration, Schema, Validierung und Präzedenz globaler Haushaltsbedarfs-Overrides |
| `simulator-heatmap.test.mjs` | ~60 | Heatmap-Rendering |
| `simulator-input-readers.test.mjs` | ~160 | DOM-freie Simulator-Input-Reader |
| `simulator-log-columns.test.mjs` | ~110 | Logspalten für Entnahme, VPW, Bonds und Steuer |
| `simulator-monte-carlo.test.mjs` | ~1300 | MC-Kern, Buffers, Merge sowie typisierte finanziell auswertbare und terminale Logrecords |
| `simulator-real-withdrawal-contract.test.mjs` | ~415 | Realentnahme, kumulierter Inflationsfaktor, Anspar-Transition sowie punktgleicher nominaler/realer MC-Drawdown |
| `simulator-multiprofile-aggregation.test.mjs` | ~190 | Simulator Multi-Profil, Tranchen-Merge |
| `simulator-sweep.test.mjs` | ~470 | Parameter-Sweep |
| `simulator-tax-settlement.test.mjs` | ~180 | Simulator Settlement-Recompute |
| `simulator-ui-orchestration.test.mjs` | ~230 | Simulator-UI-Bindings, Tabs, Persistenz und Optimizer-Parameteruebernahme |
| `snapshot-archive.test.mjs` | ~160 | Kanonisches Snapshot-Archiv, Indexeintraege und Restore-Contracts |
| `snapshot-key-policy.test.mjs` | ~130 | Snapshot-Key-Policy, Restore-Grenzen und technische Key-Ausnahmen |
| `spending-planner.test.mjs` | ~200 | Entnahme-Logik |
| `spending-quantization.test.mjs` | ~80 | Entnahme-Rundung |
| `suite-data-three-bucket-final-action.test.mjs` | ~430 | Slice-02-Final-Action, profilbezogene Lot-Reservierung, Nullbudgets, Lot-/Gold-Kapazitaet sowie kapazitaetsbegrenzte Steuer- und Profil-Reconciliation |
| `tauri-csp.test.mjs` | ~130 | Tauri-CSP, Live-Daten-Endpunkte und Icons |
| `transaction-engine-ath.test.mjs` | ~160 | ATH-Verhalten |
| `transaction-engine-rebal.test.mjs` | ~105 | Gold-Rebalancing |
| `transaction-gold-liquidity.test.mjs` | ~90 | Gold vs. Liquidität |
| `transaction-quantization.test.mjs` | ~250 | Transaktions-Rundung |
| `tax-settlement.test.mjs` | ~70 | Jahres-Settlement, Verlusttopf |
| `tranchen-manager-modal.test.mjs` | ~120 | Tranchenmanager-Modal und Form-Parsing |
| `tranchen-manager-page.test.mjs` | ~170 | Tranchenmanager-Seitenentrypoint, App-Bindings und UI-Contract |
| `tranchen-manager-renderer.test.mjs` | ~100 | Tranchenmanager-Rendering |
| `tranchen-manager-state.test.mjs` | ~120 | Tranchenmanager-State und Derived Values |
| `tranchen-price-service.test.mjs` | ~160 | Preisservice-Proxy, Symbolauflösung, Timeout und degradierter Status |
| `transaction-tax.test.mjs` | ~340 | Steuerberechnung, Roh-Aggregate |
| `utils.test.mjs` | ~100 | Hilfsfunktionen |
| `vpw-dynamic-flex.test.mjs` | ~230 | VPW-Formel, Smoothing, Safety und Go-Go |
| `worker-parity.test.mjs` | ~750 | Worker-Chunk-Parity |
| `worker-pool.test.mjs` | ~670 | Worker-Pool-Lifecycle |
