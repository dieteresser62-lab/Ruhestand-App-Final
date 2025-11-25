# Engine Module – Übersicht

Die Berechnungs-Engine wurde aus dem historischen Monolithen extrahiert und besteht nun aus klar getrennten ES-Modulen. `build-engine.mjs` ruft einen einfachen esbuild-Bundle-Lauf (oder einen Modul-Fallback) auf und erzeugt `engine.js`, das weiterhin die globalen Exporte `EngineAPI` und `Ruhestandsmodell_v30` bereitstellt.

---

## Verzeichnisstruktur

```
engine/
├── adapter.mjs                   # Kompatibilitäts-API für den Simulator (Ruhestandsmodell_v30)
├── config.mjs                    # Schwellenwerte, Profile, Texte, Build-ID
├── core.mjs                      # Orchestrierung & EngineAPI
├── errors.mjs                    # Fehlerklassen (AppError, ValidationError, FinancialCalculationError)
├── analyzers/MarketAnalyzer.mjs  # Marktanalyse & Regime-Klassifikation
├── planners/SpendingPlanner.mjs  # Guardrails & Entnahmeplanung
├── transactions/TransactionEngine.mjs  # Transaktionslogik & Liquiditätsziele
├── validators/InputValidator.mjs # Eingabevalidierung
└── index.mjs                     # Bündel-Entry, re-exportiert API und Adapter
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
| `planners/SpendingPlanner.mjs` | `SpendingPlanner` | Guardrails, Diagnose, Glättung |
| `transactions/TransactionEngine.mjs` | `TransactionEngine` | Liquiditätsziele, Rebalancing |
| `core.mjs` | `{ EngineAPI, _internal_calculateModel }` | Öffentliche API + interner Pipeline-Entry |
| `adapter.mjs` | `Ruhestandsmodell_v30` | Legacy-Schnittstelle für den Simulator |

`EngineAPI` stellt die Methoden `getVersion()`, `getConfig()`, `analyzeMarket()`, `calculateTargetLiquidity()` und `simulateSingleYear()` bereit. Der Adapter exportiert weiterhin das Objekt `Ruhestandsmodell_v30` für ältere Simulator-Aufrufe.

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
3. Balance-App (EngineAPI) und Simulator (Adapter) testen – beide nutzen dieselbe gebündelte Datei bzw. den Modul-Fallback.
4. Für Regressionstests stehen `sim-parity-smoketest.js` und `test-dual-care.js` bereit.
