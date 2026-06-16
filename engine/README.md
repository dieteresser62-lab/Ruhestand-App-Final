# Engine Module – Übersicht

Die Berechnungs-Engine wurde aus dem historischen Monolithen extrahiert und besteht nun aus klar getrennten ES-Modulen. `build-engine.mjs` ruft einen einfachen esbuild-Bundle-Lauf (oder einen Modul-Fallback) auf und erzeugt `engine.js`, das die globale `EngineAPI` bereitstellt.

---

## Verzeichnisstruktur

```
engine/
├── config.mjs                    # Schwellenwerte, Profile, Texte, Build-ID
├── core.mjs                      # Orchestrierung & EngineAPI
├── errors.mjs                    # Fehlerklassen (AppError, ValidationError, FinancialCalculationError)
├── index.mjs                     # Bündel-Entry, re-exportiert API
├── tax-settlement.mjs            # Jahres-Settlement (Verlusttopf, SPB, finale Steuer)
├── analyzers/
│   └── MarketAnalyzer.mjs        # Marktanalyse & Regime-Klassifikation
├── planners/
│   ├── SpendingPlanner.mjs       # Guardrails & Entnahmeplanung
│   ├── alarm-policy.mjs          # Alarm-Aktivierung und Deeskalation
│   ├── final-rate-policy.mjs     # Finale jährliche Flex-Rate-Delta-Limits
│   ├── flex-budget-policy.mjs    # Flex-Budget-Cap, Recharge und Min-Rate
│   ├── flex-rate-policy.mjs      # Flex-Rate, S-Kurve und harte Caps
│   ├── minimum-flex-policy.mjs   # Bedingte Mindest-Flex-Untergrenze
│   ├── spending-diagnosis.mjs    # Diagnose-Shape, Guardrail-Uebersicht und Runway-Ziel
│   ├── spending-guardrails.mjs   # Recovery-/Caution-Guardrails und Budget-Floor
│   ├── spending-policy-pipeline.mjs # Policy-Reihenfolge nach initialer Flex-Rate
│   ├── spending-policy-helpers.mjs # Reine Helper fuer Quantisierung, S-Kurven, Flex-Anteil
│   └── wealth-reduction.mjs      # Vermoegensbasierte Reduktionsdaempfung
├── transactions/
│   ├── TransactionEngine.mjs     # Transaktionslogik & Liquiditätsziele
│   ├── transaction-action.mjs    # Orchestrierung der Transaktionsentscheidungen
│   ├── transaction-opportunistic.mjs  # Opportunistisches Rebalancing (Refill)
│   ├── transaction-surplus.mjs   # Surplus-Investments (Cash-Abbau)
│   ├── sale-engine.mjs           # Verkauf/Steuer/Tranchensortierung
│   ├── three-bucket-logic.mjs    # 3-Bucket-Jilge: Bond-Verkauf und Bond-Refill
│   └── transaction-utils.mjs     # Ziel-Liquidität, Quantisierung, Min-Trade
└── validators/
    └── InputValidator.mjs        # Eingabevalidierung
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
| `planners/SpendingPlanner.mjs` | `SpendingPlanner` | Guardrails, Diagnose, Glättung, Flex-S-Kurve, harte Caps, Flex-Budget, vermögensbasierte Flex-Dämpfung (Flex-Bedarf + Gesamtvermögen) |
| `planners/alarm-policy.mjs` | `{ evaluateAlarmConditions, shouldDeescalateInPeak, shouldDeescalateInRecovery }` | Alarm-Aktivierung, Peak-/Recovery-Deeskalation und Wealth-Sufficient-Unterdrueckung |
| `planners/final-rate-policy.mjs` | `{ applyFinalRateLimits }` | Finale jährliche Flex-Rate-Delta-Limits |
| `planners/flex-budget-policy.mjs` | `{ applyFlexBudgetCap }` | Flex-Budget-Cap, Topfverbrauch, Recharge und Min-Rate |
| `planners/flex-rate-policy.mjs` | `{ calculateFlexRate, applyFlexShareCurve }` | Flex-Rate-Berechnung, Alarmmodus, S-Kurve und harte Bear-/Runway-Caps |
| `planners/minimum-flex-policy.mjs` | `{ applyMinimumFlexFloor }` | Bedingte Mindest-Flex-Untergrenze als Rate nach Guardrails und vor Flex-Budget |
| `planners/spending-diagnosis.mjs` | `{ buildSpendingDiagnosis, resolveRunwayTarget }` | Finale Spending-Diagnose, Guardrail-Uebersicht, Key-Parameter-Kopie und Runway-Ziel |
| `planners/spending-guardrails.mjs` | `{ applyGuardrails }` | Recovery-Cap, Caution-Inflationscap, Budget-Floor und Guardrail-Diagnosen |
| `planners/spending-policy-pipeline.mjs` | `{ applySpendingPolicyPipeline }` | Guardrails, Flex-Budget und finale Rate-Limits in stabiler Reihenfolge |
| `planners/spending-policy-helpers.mjs` | `{ quantizeMonthly, smoothstep, calcFlexShare, calculateFinalWithdrawal }` | Reine Helper fuer Spending-Policies |
| `planners/wealth-reduction.mjs` | `{ calculateWealthAdjustedReductionFactor }` | Vermoegensbasierte Daempfung der Flex-Reduktion |
| `transactions/TransactionEngine.mjs` | `TransactionEngine` | Liquiditätsziele, Rebalancing |
| `transactions/three-bucket-logic.mjs` | `{ getThreeBucketInputs, applyThreeBucketLogic, appendBondReplenishment }` | 3-Bucket-Jilge-Logik fuer Bond-Verkauf, Bond-Refill und Bond-Klassifikation |
| `core.mjs` | `{ EngineAPI, _internal_calculateModel }` | Öffentliche API + interner Pipeline-Entry |


`EngineAPI` stellt die Methoden `getVersion()`, `getConfig()`, `analyzeMarket()`, `calculateTargetLiquidity()` und `simulateSingleYear()` bereit.

### Verkaufs-/Tranchen-Contract

`transactions/sale-engine.mjs` baut fuer detaillierte Tranchen eine `breakdown[]`-Liste. Neben Verkaufsbetrag, Steuer- und Rohgewinnfeldern bleiben `trancheId` und, falls vorhanden, `sourceProfileId` erhalten. Mehrprofilige Simulator-Inputs koennen dadurch gleichartige Positionen aus unterschiedlichen Profilen eindeutig auf die urspruengliche Profil-Tranche zurueckfuehren.

### 3-Bucket-Jilge-Contract

`transactions/three-bucket-logic.mjs` normalisiert die Strategieparameter fuer `3_bucket_jilge`, erkennt Bond-/Anleihen-Tranchen ueber Typ oder Kategorie (`bond`, `bonds`, `anleihe`) und stellt gemeinsame Funktionen fuer Bond-Verkauf in schlechten Jahren sowie Bond-Wiederauffuellung in guten Jahren bereit. Die Funktionen liefern dieselben Verkaufs- und Steuer-Rohaggregate wie regulaere Verkäufe, damit `tax-settlement.mjs` die finale Jahressteuer konsistent berechnen kann.

### Dynamic-Flex Vertragsfelder (`simulateSingleYear`)

Bei aktivem Dynamic-Flex (`dynamicFlex=true`) werden folgende Eingaben genutzt:

* `horizonYears` (1..60), `horizonMethod` (`mean` | `survival_quantile`), `survivalQuantile` (0.5..0.99)
* `goGoActive` (Boolean), `goGoMultiplier` (1.0..1.5)
* `capeRatio` (kanonisch; `marketCapeRatio` wird als Alias-Fallback akzeptiert)

Ausgabe für UI/Diagnostik erfolgt in `result.ui.vpw` (u. a. `enabled`, `horizonYears`, `vpwRate`, `expectedRealReturn`, `status`).
Die erwartete Realrendite laeuft ueber `engine/planners/vpw-return-policy.mjs`. Der Default bleibt `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY='legacy_step'`; `cape_continuous` ist nur explizit per Config aktiv. Continuous normalisiert ungueltige CAPE-Werte auf den dokumentierten Fallback, klammert Aktien- und Portfolio-Realrendite separat und diagnostiziert `returnPolicy`, `expectedReturnSource`, `capeInputStatus`, `expectedRealReturnRaw`, `expectedRealReturnClamped`, `safeRealReturn` und `safeRealReturnSource`.
Bei `dynamicFlex=false` bleibt das bisherige Flex-Verhalten unverändert.

### Mindest-Flex Vertragsfeld (`simulateSingleYear`)

`minimumFlexAnnual` ist ein optionaler nicht-negativer Jahresbetrag. Fehlende, leere oder nicht numerische Werte werden als `0` normalisiert. Werte über `flexBedarf` werden als Validierungsfehler abgelehnt, damit der Flex-Bedarf die fachliche Obergrenze bleibt. Die Spending-Wirkung erfolgt in `applyMinimumFlexFloor()` als Rate nach Guardrails und vor Flex-Budget; `0` verändert bestehende Simulationen nicht. Die Anhebung wird bei Alarm oder unzureichender Gesamtvermoegens-/Runway-Deckung blockiert und mit `minimumFlexStatus` / `minimumFlexBlockReason` diagnostiziert.

---

## Build-Prozess

```bash
npm run build:engine
```

Das Skript versucht zuerst einen esbuild-Bundle-Lauf (IIFE, globale Exporte). Wenn `esbuild` nicht verfügbar ist (z. B. Offline-Umgebung), wird automatisch ein Modul-Fallback geschrieben, der die Globals per `engine.js` bereitstellt.

Für CI/Release sollte Strict-Mode genutzt werden:

```bash
npm run build:engine:strict
```

Strict-Mode (`ENGINE_BUILD_STRICT=1` oder `CI=true`) bricht ohne `esbuild` ab und verhindert versehentliche Fallback-Releases.

---

## Entwicklungstipps

1. Änderungen immer im jeweiligen Modul vornehmen, nicht in `engine.js`.
2. Nach Anpassungen `npm run build:engine` ausführen und `engine.js` im Versionskontrollsystem prüfen.
3. Balance-App und Simulator testen – beide nutzen dieselbe gebündelte Datei bzw. den Modul-Fallback.
4. Für Regressionstests steht `npm test` bereit.
