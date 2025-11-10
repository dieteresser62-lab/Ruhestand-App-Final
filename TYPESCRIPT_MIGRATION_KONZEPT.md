# TypeScript-Migration – Konzept

## Executive Summary

**Ziel:** Migration der Ruhestand-App von Vanilla-JavaScript zu TypeScript, um Typsicherheit, Wartbarkeit und Developer-Experience zu verbessern.

**Umfang:** 22 ES6-Module (~6.500 LOC) verteilt auf Balance-App, Simulator und Engine.

**Empfohlene Strategie:** Inkrementelle Migration (Bottom-Up: Engine → Shared Types → Simulator → Balance).

**Risiko:** Niedrig – alle Module sind bereits klar getrennt und nutzen Imports/Exports.

---

## Ausgangssituation

### Aktuelle Struktur

```
Ruhestand-App-Final/
├── Balance.html
├── Simulator.html
├── balance-*.js            # 7 Module
├── simulator-*.js          # 7 Module
├── engine/                 # 8 Module + README
│   ├── adapter.js
│   ├── config.js
│   ├── core.js
│   ├── errors.js
│   ├── analyzers/MarketAnalyzer.js
│   ├── planners/SpendingPlanner.js
│   ├── transactions/TransactionEngine.js
│   └── validators/InputValidator.js
├── engine.js               # gebündelte Version
├── build-engine.js         # Node-Build-Skript
└── css/, Simulator.css, Dokumentation
```

Alle Business-Module sprechen bereits die gemeinsame Engine an und nutzen keine Bundler.

### Gründe für TypeScript

* **Typsicherheit** bei Finanzberechnungen (z. B. Guardrails, Parameter-Sweeps).
* **Bessere IDE-Unterstützung** und Refactoring-Sicherheit.
* **Selbstdokumentierende Schnittstellen** (z. B. `MarketState`, `SpendingResult`).
* **Frühe Fehlererkennung** bei Tippfehlern oder inkonsistenten Strukturen.

Beispiel:

```typescript
interface SpendingResult {
  total: number;
  flexRate: number;
  guardrailHits: string[];
}

function renderEntnahme(result: SpendingResult) {
  // Autocomplete & Typprüfung
}
```

---

## Migrationsstrategie

### Phase 1 – Infrastruktur

1. `npm init -y`
2. Dev-Abhängigkeiten installieren:
   ```bash
   npm install --save-dev typescript @types/node
   npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
   ```
3. `tsconfig.json` mit ES2022 + DOM-Typen anlegen.
4. `package.json`-Scripts hinzufügen (`build:engine`, `build`, `lint`).

### Phase 2 – Gemeinsame Typdefinitionen

1. Ordner `types/` anlegen.
2. Schnittstellen für Eingaben/Outputs der Engine beschreiben (`EngineInput`, `EngineResult`, `DiagnosisEntry`).
3. Typdefinitionen in JS-Modulen per JSDoc referenzieren, solange die Migration läuft.

### Phase 3 – Engine migrieren

1. Dateien in `engine/` nach `engine/*.ts` umbenennen.
2. CommonJS → ES-Module (`export`/`import`).
3. Build-Skript auf `esbuild` oder `tsc` + kleines Bundle-Skript umstellen (z. B. `esbuild engine/core.ts --bundle --format=iife --outfile=engine.js`).
4. Strenge Compileroptionen (`strict`, `noImplicitAny`) aktivieren.
5. Smoke-Tests (`sim-parity-smoketest.js`) und manuelle Checks in beiden Oberflächen.

### Phase 4 – Simulator

1. Utility-Module (`simulator-utils.js`, `simulator-data.js`) zuerst migrieren.
2. Komplexere Module (`simulator-engine.js`, `simulator-main.js`) inkl. Generics für Random-Streams, Parameter-Sweep-Strukturen.
3. DOM-Typen für `document.getElementById` etc. explizit annotieren.
4. Heatmap-Modul (`simulator-heatmap.js`) auf strikte SVG-Typen prüfen.

### Phase 5 – Balance

1. Hilfs- und Konfigurationsmodule (`balance-config.js`, `balance-utils.js`).
2. Storage-Layer (`balance-storage.js`) mit Typs für Persistenzstruktur.
3. Reader/Renderer/Binder mit klaren UI-Interfaces (DOM-Elemente, Render-Daten).
4. `balance-main.js` als orchestrierendes Modul mit App-State-Interface.

### Phase 6 – HTML & Build

1. Skript-Tags auf `.ts`-Bundle (oder `.mjs`) anpassen.
2. Optional: separate Bundles für Balance/Simulator via `esbuild`.
3. Deploy-/Test-Checkliste aktualisieren.

---

## Technische Entscheidungen

* **Compiler**: `tsc --emitDeclarationOnly` für Typs, `esbuild`/`vite` für Bundles (schnell, kein schwerer Build).
* **Module Resolution**: `module` = `es2022`, `moduleResolution` = `bundler` oder `node16`.
* **Strenge Optionen**: `strict`, `noImplicitAny`, `noUnusedLocals`, `exactOptionalPropertyTypes`.
* **Linting**: ESLint mit TypeScript-Plugin, Regeln für `no-floating-promises`, `prefer-const`, `no-implicit-any-catch`.
* **Testing**: perspektivisch `vitest` oder `jest` für Engine-Module.

---

## Aufwandsabschätzung

| Phase | Aufwand (PT) |
|-------|--------------|
| Setup & Tooling | 2 |
| Engine | 5–7 |
| Simulator | 5–7 |
| Balance | 3–5 |
| Nacharbeiten (Docs, Build, QA) | 2 |
| **Summe** | **17–23** |

Zeitersparnis durch Typsicherheit: erwartete Reduktion von Runtime-Bugs ≥ 30 %.

---

## Risiken & Mitigation

| Risiko | Mitigation |
|--------|------------|
| Browser unterstützen keine Module-Bundles | Weiterhin `engine.js` als IIFE ausliefern, Balance/Simulator via ES-Bundle oder `<script type="module">`. |
| StructuredClone-Typen | Eigene Typen (`type StructuredClone<T> = T extends Function ? never : T`). |
| File-System-APIs | DOM-Typen via `lib`-Option `dom` verfügbar, ggf. Ergänzung eigener Typdefinitionen. |
| Legacy-Simulator erwartet CommonJS | `adapter.js` weiterhin als Bridge exportieren, Bundle generiert kompatibles Objekt. |

---

## Abschluss

Die bestehende Modularchitektur erleichtert eine schrittweise TypeScript-Migration erheblich. Durch den Start in der Engine werden zentrale Datentypen früh stabilisiert, was die Migration der UI-Schichten beschleunigt. Eine vollständige Umstellung kann ohne Big-Bang erfolgen und verbessert langfristig Codequalität und Wartbarkeit.

