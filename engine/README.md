# Engine Module – Übersicht

Die Berechnungs-Engine wurde aus dem historischen Monolithen extrahiert und besteht nun aus klar getrennten ES-Modulen. `build-engine.mjs` ruft einen einfachen esbuild-Bundle-Lauf (oder einen Modul-Fallback) auf und erzeugt `engine.js`, das die globale `EngineAPI` bereitstellt.

---

## Verzeichnisstruktur

```
engine/

├── config.mjs                    # Schwellenwerte, Profile, Texte, Build-ID
├── core.mjs                      # Orchestrierung & EngineAPI
├── errors.mjs                    # Fehlerklassen (AppError, ValidationError, FinancialCalculationError)
├── analyzers/MarketAnalyzer.mjs  # Marktanalyse & Regime-Klassifikation
├── planners/SpendingPlanner.mjs  # Guardrails & Entnahmeplanung
├── transactions/TransactionEngine.mjs      # Transaktionslogik & Liquiditätsziele
├── transactions/transaction-action.mjs     # Orchestrierung der Transaktionsentscheidungen
├── transactions/transaction-opportunistic.mjs # Opportunistisches Rebalancing (Refill)
├── transactions/transaction-surplus.mjs    # Surplus-Investments (Cash-Abbau)
├── transactions/sale-engine.mjs            # Verkauf/Steuer/Tranchensortierung
├── transactions/transaction-utils.mjs      # Ziel-Liquidität, Quantisierung, Min-Trade
├── validators/InputValidator.mjs # Eingabevalidierung
└── index.mjs                     # Bündel-Entry, re-exportiert API
```

`build-engine.mjs` nutzt `engine/index.mjs` als Einstieg und erzeugt daraus das Browser-Artefakt `engine.js`.

---

## Wichtige Exporte

| Modul | Export | Beschreibung |
|-------|--------|--------------|
| `errors.mjs` | `{ AppError, ValidationError, FinancialCalculationError }` | Fehler-Objekte für Engine & UI |
| `config.mjs` | `{ ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG }` | Versionsinfo & Konfiguration |
| `validators/InputValidator.mjs` | `InputValidator` | Validierung der Benutzereingaben |
| `analyzers/MarketAnalyzer.mjs` | `MarketAnalyzer` | Regimeerkennung & Kennzahlen |
| `planners/SpendingPlanner.mjs` | `SpendingPlanner` | Guardrails, Diagnose, Glättung, Flex-S-Kurve, harte Caps, Flex-Budget |
| `transactions/TransactionEngine.mjs` | `TransactionEngine` | Liquiditätsziele, Rebalancing |
| `core.mjs` | `{ EngineAPI, _internal_calculateModel }` | Öffentliche API + interner Pipeline-Entry |


`EngineAPI` stellt die Methoden `getVersion()`, `getConfig()`, `analyzeMarket()`, `calculateTargetLiquidity()` und `simulateSingleYear()` bereit.

---

## Build-Prozess

```bash
npm run build:engine
```

Das Skript versucht zuerst einen esbuild-Bundle-Lauf (IIFE, globale Exporte). Wenn `esbuild` nicht verfügbar ist (z. B. Offline-Umgebung), wird automatisch ein Modul-Fallback geschrieben, der die Globals per `engine.js` bereitstellt.

---

## Entwicklungstipps

1. Änderungen immer im jeweiligen Modul vornehmen, nicht in `engine.js`.
2. Nach Anpassungen `npm run build:engine` ausführen und `engine.js` im Versionskontrollsystem prüfen.
3. Balance-App und Simulator testen – beide nutzen dieselbe gebündelte Datei bzw. den Modul-Fallback.
4. Für Regressionstests steht `npm test` bereit.
