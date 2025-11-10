# Engine Module – Übersicht

Die Berechnungs-Engine wurde aus dem historischen Monolithen extrahiert und besteht nun aus klar getrennten Modulen. `build-engine.js` bündelt sie zu einer browserkompatiblen `engine.js`, die als IIFE eingebunden wird.

---

## Verzeichnisstruktur

```
engine/
├── adapter.js                   # Kompatibilitäts-API für den Simulator (Ruhestandsmodell_v30)
├── config.js                    # Schwellenwerte, Profile, Texte, Build-ID
├── core.js                      # Orchestrierung & EngineAPI
├── errors.js                    # Fehlerklassen (AppError, ValidationError, FinancialCalculationError)
├── analyzers/MarketAnalyzer.js  # Marktanalyse & Regime-Klassifikation
├── planners/SpendingPlanner.js  # Guardrails & Entnahmeplanung
├── transactions/TransactionEngine.js  # Transaktionslogik & Liquiditätsziele
└── validators/InputValidator.js # Eingabevalidierung
```

`build-engine.js` liest die Module in genau dieser Reihenfolge ein und generiert am Ende `engine.js`.

---

## Wichtige Exporte

| Modul | Export | Beschreibung |
|-------|--------|--------------|
| `errors.js` | `{ AppError, ValidationError, FinancialCalculationError }` | Fehler-Objekte für Engine & UI |
| `config.js` | `{ ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG }` | Versionsinfo & Konfiguration |
| `validators/InputValidator.js` | `InputValidator` | Validierung der Benutzereingaben |
| `analyzers/MarketAnalyzer.js` | `MarketAnalyzer` | Regimeerkennung & Kennzahlen |
| `planners/SpendingPlanner.js` | `SpendingPlanner` | Guardrails, Diagnose, Glättung |
| `transactions/TransactionEngine.js` | `TransactionEngine` | Liquiditätsziele, Rebalancing |
| `core.js` | `{ EngineAPI, _internal_calculateModel }` | Öffentliche API + interner Pipeline-Entry |
| `adapter.js` | `Ruhestandsmodell_v30_Adapter` | Legacy-Schnittstelle für den Simulator |

`EngineAPI` stellt die Methoden `getVersion()`, `getConfig()`, `analyzeMarket()`, `calculateTargetLiquidity()` und `simulateSingleYear()` bereit. Der Adapter exportiert weiterhin das Objekt `Ruhestandsmodell_v30` für ältere Simulator-Aufrufe.

---

## Build-Prozess

```bash
node build-engine.js
```

Das Skript
1. entfernt `use strict`/`require`/`module.exports`-Fragmente,
2. legt einen internen Modul-Cache an und
3. exportiert anschließend `EngineAPI` und `Ruhestandsmodell_v30` global.

`ENGINE_BUILD_ID` wird beim Bundling aus dem aktuellen ISO-Zeitstempel erzeugt.

---

## Entwicklungstipps

1. Änderungen immer im jeweiligen Modul vornehmen, nicht in `engine.js`.
2. Nach Anpassungen `node build-engine.js` ausführen und `engine.js` im Versionskontrollsystem prüfen.
3. Balance-App (EngineAPI) und Simulator (Adapter) testen – beide nutzen dieselbe gebündelte Datei.
4. Für Regressionstests stehen `sim-parity-smoketest.js` und `test-dual-care.js` bereit.

