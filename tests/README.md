# Ruhestands-Planer Testing Infrastructure

## Overview

This directory contains the comprehensive testing infrastructure for the Ruhestand-App-Final project. The tests are designed to be zero-dependency, using native Node.js ESM and a custom test runner, avoiding the need for heavy frameworks like Jest or Mocha.

**Test-Statistik:** 45 Testdateien mit 400+ Einzeltests

## Directory Structure

- `run-tests.mjs` - Der benutzerdefinierte Test-Runner
- `run-single.mjs` - Führt eine einzelne Testdatei aus
- `*.test.mjs` - Testdateien (werden automatisch vom Runner erkannt)

## How to Run Tests

### Alle Tests ausführen
```bash
npm test
```

### Schnelle Tests (Subset)
```bash
QUICK_TESTS=1 npm test
```

### Einzelne Testdatei ausführen
```bash
node tests/run-single.mjs <testfile>
# Beispiel:
node tests/run-single.mjs core-engine.test.mjs
```

### Direkte Ausführung
```bash
node tests/run-tests.mjs
```

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

### 1. Engine Core & Validation

#### `core-engine.test.mjs`
**Zweck:** Validiert die grundlegende `EngineAPI`-Integrität und Ausgabestrukturen.
- Prüft dass `EngineAPI.simulateSingleYear()` korrekte Ergebnisobjekte liefert
- Validiert UI-Ausgabestruktur (spending, market, action, diagnosis)
- Testet Engine-Version und Build-ID

#### `engine-robustness.test.mjs`
**Zweck:** Robustheitstests gegen Edge Cases und fehlerhafte Eingaben.
- **Inflation:** Zero inflation, hohe Inflation (50%), out-of-range (>50%)
- **Marktextreme:** 100% Jahresperformance, 0% Return
- **Ungültige Werte:** Negative Assets, NaN/Infinity, fehlende Pflichtfelder
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

#### `spending-quantization.test.mjs`
**Zweck:** Testet die Anti-Pseudo-Accuracy-Rundungslogik für Entnahmen.
- **Tier-basierte Rundung:**
  - Tier 1 (<2000): Schritt 50
  - Tier 2 (<5000): Schritt 100
  - Tier 3 (>5000): Schritt 250
- Integrationstests mit SpendingPlanner
- Prüft dass monatliche Entnahmen auf sinnvolle Schritte gerundet werden

### 3. Transaktions-Engine

#### `liquidity-guardrail.test.mjs`
**Zweck:** Validiert operative Guardrails.
- **Bear Market Refill Caps:** Begrenzt Nachfüllung in Bärenmärkten
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

#### `care-meta.test.mjs`
**Zweck:** Validiert die Pflegefall-Logik.
- **Eintrittswahrscheinlichkeit:** Altersabhängige Pflegewahrscheinlichkeit
- **Kostenrampe:** Inflation und Progression der Pflegekosten
- **Dual-Household:** Flex-Budget-Anpassung bei Pflege beider Partner
- Pflegegrade (PG 0-5) und ambulant vs. stationär

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

#### `auto-optimizer.test.mjs`
**Zweck:** Testet die 3-stufige Auto-Optimierung.
- **Latin Hypercube Sampling:** Gleichmäßige Verteilung im Parameterraum
- **Nachbarschafts-Generierung:** generateNeighborsReduced
- **Kandidaten-Validierung:** isValidCandidate (Runway-Invariante, Gold-Cap, Grenzen)
- **Constraint-Prüfung:** checkConstraints (SR99, NOEX, TS45, DD55)
- **Objective-Extraktion:** getObjectiveValue für verschiedene Metriken
- **CandidateCache:** Vermeidung redundanter Evaluierungen
- **Tie-Breaker:** Höhere Success Rate, niedrigerer Drawdown
- **Champion-Findung:** Konvergenz nahe Optimum

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

#### `balance-annual-inflation.test.mjs`
**Zweck:** Testet die jährliche Inflationsanpassung.
- **Kumulative Inflation:** 2% über 10 Jahre → Faktor ~1.22
- **Bedarfsanpassung:** Floor und Flex werden skaliert
- **Negative Inflation:** Wird ignoriert (kein Faktor-Rückgang)
- **lastInflationAppliedAtAge:** Tracking des letzten Anwendungsalters

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

#### `balance-diagnosis-transaction.test.mjs`
**Zweck:** Testet Transaktions-Diagnose-Rendering.
- Empty State bei null-Diagnostics
- Guardrail-Block → danger Status
- Cap active → warn Status
- Tranchenauswahl-Rendering mit Details

#### `balance-renderer-summary.test.mjs`
**Zweck:** Testet Summary-Rendering.
- formatCurrency: Euro-Symbol
- calculateTotals: Werte werden preserved
- renderSummary: DOM-Updates mit Formatierung

### 7. Simulator Module

#### `simulation.test.mjs`
**Zweck:** Integration der vollständigen Simulationsschleife.
- simulateOneYear mit verschiedenen Szenarien
- Portfolio-Updates über Jahresschritte
- Validierung der Ergebnisstruktur

#### `simulator-headless.test.mjs`
**Zweck:** Headless Full-Backtest ohne Browser.
- 2000-2024 Simulation mit realen Marktdaten
- Validiert dass Liquidität nie negativ wird
- State-Persistence über Jahre hinweg

#### `simulator-backtest.test.mjs`
**Zweck:** Testet die historische Backtest-Funktion.
- **Determinismus:** Zwei Läufe mit gleichen Inputs sind identisch
- **Startjahr-Filterung:** Korrekte Jahr-Auswahl (2010-2012)
- **Historische Daten:** Inflation aus HISTORICAL_DATA
- **yearlyResults:** Länge entspricht (end-start+1)
- **finalWealth:** Stimmt mit letztem Jahreseintrag überein

#### `simulator-heatmap.test.mjs`
**Zweck:** Testet Heatmap-Rendering.
- **viridis:** Farbskala-Endpunkte (0 → dunkelviolett, 1 → gelb)
- **computeHeatmapStats:** Leere/einzelne Werte
- **renderHeatmapSVG:** Cell-Mapping, Legende
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
- **selectTranchesForSale:** FIFO + Steueroptimierung

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
- Warning bei >2 Profilen

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

#### `portfolio.test.mjs`
**Zweck:** Unit-Tests für Portfolio-Operationen.
- buyGold, sumDepot
- DOM-unabhängige Initialisierung
- Portfolio-Struktur-Validierung

#### `worker-parity.test.mjs`
**Zweck:** Kritische Parity-Prüfung.
- MC/Sweep Chunk-Merges produzieren identische Aggregate wie Single-Pass
- Worker-Chunking beeinflusst Ergebnisse nicht

#### `depot-tranches.test.mjs`
**Zweck:** Testet Tranchen-Verwaltung.
- **sortTranchesFIFO:** Älteste Tranche zuerst
- **calculateTrancheTax:** Teilverkauf mit TFS und Kirchensteuer
- **applySaleToPortfolio:**
  - FIFO-Reduktion über Matching-Tranchen
  - Proportionale Kostenbasis-Reduktion
  - Mehrere Kategorien (Aktien, Gold, Geldmarkt)

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

### Priorität 6: Utilities & Sweep
- `utils.test.mjs`
- `formatting.test.mjs`
- `feature-flags.test.mjs`
- `simulator-sweep.test.mjs`
- `auto-optimizer.test.mjs`

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
| `auto-optimizer.test.mjs` | ~500 | 3-stufige Optimierung, LHS, Constraints |
| `balance-annual-inflation.test.mjs` | ~130 | Jährliche Inflationsanpassung |
| `balance-binder-snapshots.test.mjs` | ~160 | Snapshot-Erstellung/-Restore |
| `balance-diagnosis-chips.test.mjs` | ~70 | Diagnose-Chip-Rendering |
| `balance-diagnosis-decision-tree.test.mjs` | ~100 | Entscheidungsbaum-Logik |
| `balance-diagnosis-guardrails.test.mjs` | ~100 | Guardrail-Chips |
| `balance-diagnosis-transaction.test.mjs` | ~100 | Transaktions-Diagnose |
| `balance-reader.test.mjs` | ~640 | DOM-Input-Lesen, Overrides |
| `balance-renderer-summary.test.mjs` | ~50 | Summary-Rendering |
| `balance-smoke.test.mjs` | ~340 | End-to-End Smoke-Test |
| `balance-storage.test.mjs` | ~490 | localStorage-Persistenz |
| `care-meta.test.mjs` | ~200 | Pflegefall-Logik |
| `core-engine.test.mjs` | ~150 | EngineAPI-Basisvalidierung |
| `depot-tranches.test.mjs` | ~130 | FIFO-Verkäufe, Steuer |
| `engine-robustness.test.mjs` | ~240 | Edge Cases, Fehlereingaben |
| `feature-flags.test.mjs` | ~60 | Feature-Flag-System |
| `formatting.test.mjs` | ~120 | Formatierungsfunktionen |
| `historical-data-robustness.test.mjs` | ~60 | Fehlende Marktdaten |
| `liquidity-guardrail.test.mjs` | ~100 | Liquiditäts-Guardrails |
| `market-analyzer.test.mjs` | ~150 | Markt-Regime-Klassifizierung |
| `monte-carlo-sampling.test.mjs` | ~200 | Bootstrap, Regime-Transitions |
| `monte-carlo-startyear.test.mjs` | ~100 | Startjahr-Auswahl |
| `portfolio.test.mjs` | ~100 | Portfolio-Operationen |
| `profile-storage.test.mjs` | ~540 | Profil-Registry CRUD |
| `profilverbund-balance.test.mjs` | ~150 | Multi-Profil Aggregation |
| `profilverbund-profile-gold-overrides.test.mjs` | ~160 | Gold-Parameter-Overrides |
| `scenario-analyzer.test.mjs` | ~95 | Szenario-Tags, Vergleich |
| `scenarios.test.mjs` | ~150 | Komplexe Lebenspfade |
| `simulation.test.mjs` | ~200 | Simulations-Integration |
| `simulator-backtest.test.mjs` | ~150 | Historischer Backtest |
| `simulator-headless.test.mjs` | ~125 | Headless 2000-2024 |
| `simulator-heatmap.test.mjs` | ~60 | Heatmap-Rendering |
| `simulator-monte-carlo.test.mjs` | ~460 | MC-Kern, Buffers, Merge |
| `simulator-multiprofile-aggregation.test.mjs` | ~115 | Simulator Multi-Profil |
| `simulator-sweep.test.mjs` | ~470 | Parameter-Sweep |
| `spending-planner.test.mjs` | ~200 | Entnahme-Logik |
| `spending-quantization.test.mjs` | ~80 | Entnahme-Rundung |
| `transaction-engine-ath.test.mjs` | ~160 | ATH-Verhalten |
| `transaction-engine-rebal.test.mjs` | ~105 | Gold-Rebalancing |
| `transaction-gold-liquidity.test.mjs` | ~90 | Gold vs. Liquidität |
| `transaction-quantization.test.mjs` | ~250 | Transaktions-Rundung |
| `transaction-tax.test.mjs` | ~150 | Steuerberechnung |
| `utils.test.mjs` | ~100 | Hilfsfunktionen |
| `worker-parity.test.mjs` | ~150 | Worker-Chunk-Parity |
| `worker-pool.test.mjs` | ~670 | Worker-Pool-Lifecycle |
