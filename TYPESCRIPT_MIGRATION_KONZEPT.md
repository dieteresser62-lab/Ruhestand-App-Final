# TypeScript Migration Konzept - Ruhestand-App

## Executive Summary

**Ziel:** Migration der Ruhestand-App von JavaScript zu TypeScript für verbesserte Typsicherheit, Wartbarkeit und Entwickler-Experience.

**Umfang:** 22 Module, ~6.500 Zeilen Code
**Geschätzter Aufwand:** 15-25 Personentage
**Empfohlene Strategie:** Inkrementelle Migration (Bottom-Up)
**Risiko:** Niedrig (durch schrittweises Vorgehen)

---

## 1. Warum TypeScript?

### Vorteile für dieses Projekt

✅ **Typsicherheit bei Finanzberechnungen**
```typescript
// JavaScript - Fehler erst zur Laufzeit
function calculateWithdrawal(portfolio, rate) {
  return portfolio.total * rate; // Was wenn portfolio undefined?
}

// TypeScript - Fehler beim Schreiben
interface Portfolio {
  tagesgeld: number;
  etfAlt: number;
  depotwertGesamt: number;
}

function calculateWithdrawal(portfolio: Portfolio, rate: number): number {
  return portfolio.depotwertGesamt * rate; // Typsicher!
}
```

✅ **Bessere IDE-Unterstützung**
- Autocomplete für alle Objekteigenschaften
- Inline-Dokumentation
- Refactoring-Tools funktionieren besser
- "Finde alle Referenzen" ist zuverlässiger

✅ **Dokumentation durch Typen**
```typescript
// Selbstdokumentierend!
type MarketRegime =
  | 'peak_hot'
  | 'peak_stable'
  | 'recovery'
  | 'corr_young'
  | 'side_long'
  | 'bear_deep'
  | 'recovery_in_bear';

function classifyRegime(price: number, ath: number): MarketRegime {
  // Compiler garantiert, dass nur valide Regimes zurückgegeben werden
}
```

✅ **Frühe Fehlererkennung**
```typescript
// JavaScript - Tippfehler erst zur Laufzeit
const result = portfolio.depotwetGesamt; // Ups, "t" statt "rt"

// TypeScript - Fehler beim Schreiben
const result = portfolio.depotwetGesamt;
// ❌ Error: Property 'depotwetGesamt' does not exist on type 'Portfolio'
```

✅ **Bessere Wartbarkeit**
- Bei Refactorings siehst du sofort, wo Code kaputt geht
- Neue Entwickler verstehen den Code schneller
- Schnittstellen sind klar definiert

### Kosten-Nutzen-Analyse

| Aspekt | Aufwand | Nutzen |
|--------|---------|--------|
| **Initial-Migration** | 15-25 PT | Hoch (einmalig) |
| **Lernkurve** | 2-5 PT | Hoch (langfristig) |
| **Build-Setup** | 0.5-1 PT | Mittel |
| **Laufende Wartung** | +10-15% Zeit | -30% Bugs |
| **Onboarding neuer Entwickler** | -50% Zeit | Hoch |

**Fazit:** Lohnt sich bei diesem Projektumfang und Komplexität!

---

## 2. Projekt-Analyse

### Aktuelle Struktur

```
Ruhestand-App-Final/
├── Balance.html (255 Zeilen)
├── Simulator.html (242 Zeilen)
│
├── css/
│   ├── balance.css (530 Zeilen)
│   └── simulator.css (99 Zeilen)
│
├── js/
│   ├── balance/ (7 Module, ~1.512 Zeilen)
│   │   ├── balance-main.js
│   │   ├── balance-config.js
│   │   ├── balance-storage.js
│   │   ├── balance-reader.js
│   │   ├── balance-renderer.js
│   │   ├── balance-binder.js
│   │   └── balance-utils.js
│   │
│   ├── simulator/ (7 Module, ~2.155 Zeilen)
│   │   ├── simulator-main.js
│   │   ├── simulator-engine.js
│   │   ├── simulator-results.js
│   │   ├── simulator-portfolio.js
│   │   ├── simulator-heatmap.js
│   │   ├── simulator-utils.js
│   │   └── simulator-data.js
│   │
│   └── engine/ (8 Module, ~1.200 Zeilen)
│       ├── core.js
│       ├── adapter.js
│       ├── config.js
│       ├── errors.js
│       ├── validators/InputValidator.js
│       ├── analyzers/MarketAnalyzer.js
│       ├── planners/SpendingPlanner.js
│       └── transactions/TransactionEngine.js
```

### Migrations-Prioritäten

**Priorität 1 - Engine (Höchster ROI):**
- ✅ Komplexe Business-Logic
- ✅ Viele Inter-Modul-Abhängigkeiten
- ✅ Kritische Finanzberechnungen
- ✅ Wird von beiden Apps genutzt

**Priorität 2 - Shared Types:**
- ✅ Typen werden überall gebraucht
- ✅ Kleine Files, schnell migriert
- ✅ Sofortiger Nutzen

**Priorität 3 - Simulator:**
- ✅ Komplexe Monte-Carlo-Logic
- ✅ Viele numerische Berechnungen
- ✅ Mehrere Datenstrukturen

**Priorität 4 - Balance:**
- ✅ UI-lastiger
- ✅ Event-Handling
- ✅ Storage-Logik

---

## 3. Migrations-Strategie

### Empfohlener Ansatz: Bottom-Up + Inkrementell

```
Schritt 1: TypeScript-Setup
    ↓
Schritt 2: Shared Types erstellen
    ↓
Schritt 3: Engine migrieren (8 Module)
    ↓
Schritt 4: Simulator migrieren (7 Module)
    ↓
Schritt 5: Balance migrieren (7 Module)
    ↓
Schritt 6: HTML-Anpassungen
    ↓
Schritt 7: Build & Deployment optimieren
```

### Warum Bottom-Up?

✅ **Engine hat keine eigenen Dependencies** (nur interne)
✅ **Beide Apps nutzen Engine** → Doppelter Nutzen
✅ **Business-Logic ist kritischste** → Größter Mehrwert
✅ **Typen verbreiten sich nach oben** → Natürlicher Flow

---

## 4. Detaillierter Migrations-Plan

### Phase 1: Setup & Infrastruktur (2-3 Tage)

#### 1.1 TypeScript Installation

```bash
# package.json erstellen
npm init -y

# TypeScript & Tools installieren
npm install --save-dev typescript
npm install --save-dev @types/node
npm install --save-dev esbuild  # Für schnelle Builds
npm install --save-dev concurrently # Für parallele Builds

# Optional: Linting
npm install --save-dev @typescript-eslint/parser
npm install --save-dev @typescript-eslint/eslint-plugin
npm install --save-dev prettier
```

#### 1.2 TypeScript Konfiguration

**tsconfig.json (Root):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",

    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,

    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**tsconfig.engine.json (für Engine separat):**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/engine"
  },
  "include": ["src/engine/**/*"]
}
```

#### 1.3 Build-Scripts

**package.json:**
```json
{
  "name": "ruhestand-app",
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "build": "npm run build:types && npm run build:js",
    "build:types": "tsc --noEmit",
    "build:js": "esbuild src/**/*.ts --bundle --outdir=dist --format=esm --splitting",

    "build:engine": "tsc -p tsconfig.engine.json",
    "build:simulator": "tsc -p tsconfig.simulator.json",
    "build:balance": "tsc -p tsconfig.balance.json",

    "watch": "tsc --watch",
    "watch:engine": "tsc -p tsconfig.engine.json --watch",

    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",

    "dev": "concurrently \"npm run watch\" \"npm run serve\"",
    "serve": "python -m http.server 8000"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "esbuild": "^0.24.0",
    "concurrently": "^9.0.0",
    "@types/node": "^22.0.0"
  }
}
```

#### 1.4 Ordnerstruktur anpassen

```bash
# Neue Struktur
Ruhestand-App-Final/
├── src/                      # TypeScript Source
│   ├── types/               # Shared Types
│   ├── engine/              # Engine (TS)
│   ├── simulator/           # Simulator (TS)
│   └── balance/             # Balance (TS)
│
├── dist/                     # Kompilierter JS-Code
│   ├── engine/
│   ├── simulator/
│   └── balance/
│
├── public/                   # Static Assets
│   ├── Balance.html
│   ├── Simulator.html
│   └── css/
│
├── tsconfig.json
├── package.json
└── README.md
```

**Migration-Skript:**
```bash
#!/bin/bash
# migrate-structure.sh

# Erstelle neue Ordner
mkdir -p src/{types,engine,simulator,balance}
mkdir -p dist
mkdir -p public/css

# Kopiere HTML/CSS (bleiben unverändert)
cp *.html public/
cp css/*.css public/css/

echo "✅ Struktur erstellt. Bereit für Migration!"
```

---

### Phase 2: Shared Types (1-2 Tage)

#### 2.1 Core Domain Types

**src/types/portfolio.ts:**
```typescript
/**
 * Portfolio-Datenstruktur
 */
export interface Portfolio {
  tagesgeld: number;
  geldmarktEtf: number;
  depotwertAlt: number;
  depotwertNeu: number;
  goldWert: number;
  goldAktiv: boolean;
}

export interface PortfolioAllocation {
  cash: number;        // Tagesgeld + Geldmarkt
  equity: number;      // ETFs + Aktien
  gold: number;        // Gold
}

export interface PortfolioValue {
  total: number;
  depot: number;
  liquidity: number;
}
```

**src/types/market.ts:**
```typescript
/**
 * Markt-Regimes (7 Zustände)
 */
export type MarketRegime =
  | 'peak_hot'          // ATH mit starkem Momentum
  | 'peak_stable'       // ATH, stabil
  | 'recovery'          // Starke Erholung
  | 'corr_young'        // Frühe Korrektur (0-10%)
  | 'side_long'         // Seitwärts (-10 bis -20%)
  | 'bear_deep'         // Tiefe Korrektur (>-20%)
  | 'recovery_in_bear'; // Rally im Bärenmarkt

export interface MarketData {
  year: number;
  price: number;
  ath: number;
  returns: number[];   // Letzte 3 Monate
  inflation: number;
}

export interface MarketAnalysis {
  regime: MarketRegime;
  drawdown: number;
  momentum: number;
  volatility: number;
}
```

**src/types/withdrawal.ts:**
```typescript
/**
 * Entnahme-Strategien & Guardrails
 */
export type AlarmLevel = 'GREEN' | 'CAUTION' | 'ALARM';

export interface WithdrawalPlan {
  amount: number;
  rate: number;          // Entnahmerate in %
  alarmLevel: AlarmLevel;
  adjustmentNeeded: boolean;
  recommendation: string;
}

export interface GuardrailConfig {
  initialRate: number;
  upperGuardrail: number;  // -20% trigger
  lowerGuardrail: number;  // +20% trigger
  adjustment: number;      // ±10% adjustment
}

export interface WithdrawalThresholds {
  alarmRate: number;       // 5.5%
  cautionRate: number;     // 4.5%
  maxDrawdown: number;     // 25%
  inflationCap: number;    // 3%
}
```

**src/types/transaction.ts:**
```typescript
/**
 * Transaktionen & Steueroptimierung
 */
export type AssetType = 'tagesgeld' | 'etf' | 'aktien' | 'gold';

export interface Transaction {
  assetType: AssetType;
  amount: number;
  basis: number;         // Einstandswert
  gain: number;          // Gewinn
  tax: number;           // Steuer
  netProceeds: number;   // Netto-Erlös
}

export interface TaxCalculation {
  grossGain: number;
  teilfreistellung: number;  // 30% für Equity
  freibetrag: number;        // 1000€
  taxableGain: number;
  tax: number;               // 26.375%
}

export interface TransactionPlan {
  transactions: Transaction[];
  totalGain: number;
  totalTax: number;
  netAmount: number;
}
```

**src/types/simulation.ts:**
```typescript
/**
 * Monte-Carlo-Simulation Types
 */
export type SimulationMethod = 'regime' | 'bootstrap' | 'historical';

export interface SimulationConfig {
  runs: number;
  years: number;
  method: SimulationMethod;
  seed: number;
  blockSize: number;  // Für Block-Bootstrap
}

export interface SimulationRun {
  finalValue: number;
  totalTax: number;
  yearsFailed: number;
  maxDrawdown: number;
  volatility: number;
  depleted: boolean;
  ageAtDepletion: number | null;
}

export interface SimulationResults {
  runs: SimulationRun[];
  p10: number;
  p50: number;
  p90: number;
  successRate: number;
  avgEndValue: number;
  maxDrawdown: number;
  avgVolatility: number;
}
```

**src/types/index.ts (Barrel Export):**
```typescript
export * from './portfolio';
export * from './market';
export * from './withdrawal';
export * from './transaction';
export * from './simulation';
```

---

### Phase 3: Engine Migration (5-7 Tage)

#### 3.1 Migrations-Reihenfolge (Bottom-Up)

```
1. constants.ts       (keine Dependencies)
    ↓
2. errors.ts          (keine Dependencies)
    ↓
3. config.ts          (nutzt constants)
    ↓
4. InputValidator.ts  (nutzt types)
    ↓
5. MarketAnalyzer.ts  (nutzt types)
    ↓
6. SpendingPlanner.ts (nutzt MarketAnalyzer)
    ↓
7. TransactionEngine.ts (nutzt types)
    ↓
8. core.ts           (orchestriert alle)
```

#### 3.2 Beispiel-Migration: constants.ts

**Vorher (JS):**
```javascript
// engine/config.js
export const THRESHOLDS = {
  ALARM: {
    withdrawalRate: 5.5,
    realDrawdown: 25
  },
  CAUTION: {
    withdrawalRate: 4.5,
    inflationCap: 3
  }
};
```

**Nachher (TS):**
```typescript
// src/engine/constants.ts
import type { WithdrawalThresholds } from '../types';

export const WITHDRAWAL_THRESHOLDS: WithdrawalThresholds = {
  alarmRate: 5.5,
  cautionRate: 4.5,
  maxDrawdown: 25,
  inflationCap: 3
} as const;

export const TAX_RATES = {
  capitalGains: 0.25,
  soli: 0.055,
  total: 0.26375,
  freibetrag: 1000,
  teilfreistellung: 0.30
} as const;

export const GUARDRAILS = {
  upperGuardrail: 0.8,   // -20% trigger
  lowerGuardrail: 1.2,   // +20% trigger
  adjustment: 0.1        // ±10%
} as const;

// Typen exportieren für Type-Safety
export type WithdrawalThresholdsType = typeof WITHDRAWAL_THRESHOLDS;
export type TaxRatesType = typeof TAX_RATES;
export type GuardrailsType = typeof GUARDRAILS;
```

#### 3.3 Beispiel-Migration: MarketAnalyzer.ts

**Vorher (JS):**
```javascript
// engine/analyzers/MarketAnalyzer.js
export class MarketAnalyzer {
  analyzeMarket(input) {
    const drawdown = this.calculateDrawdown(input.price, input.ath);
    const regime = this.classifyRegime(input.price, input.ath, input.returns);
    return { regime, drawdown };
  }

  classifyRegime(price, ath, returns) {
    if (price >= ath) {
      const momentum = returns.reduce((a, b) => a + b, 0);
      return momentum > 0.10 ? 'peak_hot' : 'peak_stable';
    }
    // ... weitere Logik
  }

  calculateDrawdown(price, ath) {
    return (price - ath) / ath;
  }
}
```

**Nachher (TS):**
```typescript
// src/engine/analyzers/MarketAnalyzer.ts
import type { MarketData, MarketAnalysis, MarketRegime } from '../../types';

export class MarketAnalyzer {
  /**
   * Analysiert Marktdaten und klassifiziert Regime
   */
  public analyzeMarket(data: MarketData): MarketAnalysis {
    const drawdown = this.calculateDrawdown(data.price, data.ath);
    const regime = this.classifyRegime(data.price, data.ath, data.returns);
    const momentum = this.calculateMomentum(data.returns);
    const volatility = this.calculateVolatility(data.returns);

    return { regime, drawdown, momentum, volatility };
  }

  /**
   * Klassifiziert aktuelles Marktregime
   */
  public classifyRegime(
    price: number,
    ath: number,
    returns: number[]
  ): MarketRegime {
    // ATH erreicht?
    if (price >= ath) {
      const momentum = this.calculateMomentum(returns);
      return momentum > 0.10 ? 'peak_hot' : 'peak_stable';
    }

    const drawdown = this.calculateDrawdown(price, ath);

    // Tiefe Korrektur
    if (drawdown < -0.20) {
      const momentum = this.calculateMomentum(returns);
      return momentum > 0.20 ? 'recovery_in_bear' : 'bear_deep';
    }

    // Moderate Korrektur
    if (drawdown < -0.10) {
      return 'side_long';
    }

    // Leichte Korrektur
    return 'corr_young';
  }

  /**
   * Berechnet Drawdown vom ATH
   */
  private calculateDrawdown(price: number, ath: number): number {
    if (ath === 0) throw new Error('ATH cannot be zero');
    return (price - ath) / ath;
  }

  /**
   * Berechnet Momentum (Summe der Returns)
   */
  private calculateMomentum(returns: number[]): number {
    return returns.reduce((sum, r) => sum + r, 0);
  }

  /**
   * Berechnet Volatilität (Standardabweichung)
   */
  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
}
```

**Vorteile der TS-Version:**
- ✅ Typsicherheit bei allen Parametern
- ✅ Return-Types sind klar definiert
- ✅ Private/Public klar getrennt
- ✅ JSDoc für IDE-Unterstützung
- ✅ Compiler verhindert falsche Aufrufe

---

### Phase 4: Simulator Migration (4-6 Tage)

#### 4.1 Migrations-Reihenfolge

```
1. simulator-utils.ts    (Helper-Funktionen)
    ↓
2. simulator-data.ts     (Historische Daten)
    ↓
3. simulator-portfolio.ts (Portfolio-Mgmt)
    ↓
4. simulator-engine.ts   (Monte-Carlo-Logic)
    ↓
5. simulator-results.ts  (Result-Rendering)
    ↓
6. simulator-heatmap.ts  (SVG-Viz)
    ↓
7. simulator-main.ts     (Orchestrierung)
```

#### 4.2 Beispiel: simulator-engine.ts

**Vorher (JS):**
```javascript
export function simulateOneYear(portfolio, config, rand) {
  const returns = sampleReturns(config.method, rand);
  const newPortfolio = applyReturns(portfolio, returns);
  const withdrawal = calculateWithdrawal(newPortfolio, config);
  return { portfolio: newPortfolio, withdrawal };
}
```

**Nachher (TS):**
```typescript
// src/simulator/simulator-engine.ts
import type {
  Portfolio,
  SimulationConfig,
  SimulationRun,
  MarketRegime
} from '../types';
import { MarketAnalyzer } from '../engine/analyzers/MarketAnalyzer';

interface YearResult {
  portfolio: Portfolio;
  withdrawal: number;
  regime: MarketRegime;
  tax: number;
}

export class SimulationEngine {
  private marketAnalyzer: MarketAnalyzer;

  constructor() {
    this.marketAnalyzer = new MarketAnalyzer();
  }

  /**
   * Simuliert ein einzelnes Jahr
   */
  public simulateOneYear(
    portfolio: Portfolio,
    config: SimulationConfig,
    rand: () => number
  ): YearResult {
    // Sample returns basierend auf Methode
    const returns = this.sampleReturns(config.method, rand);

    // Wende Returns auf Portfolio an
    const newPortfolio = this.applyReturns(portfolio, returns);

    // Berechne Entnahme
    const withdrawal = this.calculateWithdrawal(newPortfolio, config);

    // Analysiere Markt
    const analysis = this.marketAnalyzer.analyzeMarket({
      year: config.currentYear,
      price: newPortfolio.total,
      ath: config.ath,
      returns: returns,
      inflation: config.inflation
    });

    // Berechne Steuern
    const tax = this.calculateTax(withdrawal);

    return {
      portfolio: newPortfolio,
      withdrawal,
      regime: analysis.regime,
      tax
    };
  }

  /**
   * Führt komplette Monte-Carlo-Simulation durch
   */
  public async runMonteCarlo(
    config: SimulationConfig,
    onProgress?: (progress: number) => void
  ): Promise<SimulationRun[]> {
    const runs: SimulationRun[] = [];
    const rand = this.createRNG(config.seed);

    for (let i = 0; i < config.runs; i++) {
      const run = await this.simulateSingleRun(config, rand);
      runs.push(run);

      // Progress callback
      if (onProgress && i % 100 === 0) {
        onProgress((i + 1) / config.runs);
      }
    }

    return runs;
  }

  private sampleReturns(method: SimulationMethod, rand: () => number): number[] {
    switch (method) {
      case 'regime':
        return this.sampleRegimeReturns(rand);
      case 'bootstrap':
        return this.sampleBootstrapReturns(rand);
      case 'historical':
        return this.sampleHistoricalReturns(rand);
      default:
        // TypeScript erkennt, dass alle Cases behandelt wurden!
        const _exhaustive: never = method;
        throw new Error(`Unknown method: ${_exhaustive}`);
    }
  }

  private applyReturns(portfolio: Portfolio, returns: number[]): Portfolio {
    // Implementation...
    return { ...portfolio };
  }

  private calculateWithdrawal(portfolio: Portfolio, config: SimulationConfig): number {
    // Implementation...
    return 0;
  }

  private calculateTax(withdrawal: number): number {
    // Implementation...
    return 0;
  }

  private async simulateSingleRun(
    config: SimulationConfig,
    rand: () => number
  ): Promise<SimulationRun> {
    // Implementation...
    return {} as SimulationRun;
  }

  private createRNG(seed: number): () => number {
    // Mulberry32 RNG
    return () => {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  private sampleRegimeReturns(rand: () => number): number[] {
    // Implementation...
    return [];
  }

  private sampleBootstrapReturns(rand: () => number): number[] {
    // Implementation...
    return [];
  }

  private sampleHistoricalReturns(rand: () => number): number[] {
    // Implementation...
    return [];
  }
}
```

---

### Phase 5: Balance Migration (3-5 Tage)

Gleiche Strategie wie Simulator, aber UI-fokussierter.

#### 5.1 DOM-Typen nutzen

**Vorher (JS):**
```javascript
const button = document.getElementById('saveButton');
button.addEventListener('click', () => save());
```

**Nachher (TS):**
```typescript
// src/balance/balance-binder.ts
export class BalanceBinder {
  private saveButton: HTMLButtonElement;

  constructor() {
    this.saveButton = this.getElement<HTMLButtonElement>('saveButton');
    this.bindEvents();
  }

  private bindEvents(): void {
    this.saveButton.addEventListener('click', () => this.handleSave());
  }

  private handleSave(): void {
    // Type-safe save logic
  }

  private getElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with id '${id}' not found`);
    }
    return element as T;
  }
}
```

---

### Phase 6: HTML-Anpassungen (1 Tag)

**Vorher:**
```html
<script type="module" src="balance-main.js"></script>
```

**Nachher:**
```html
<script type="module" src="dist/balance/balance-main.js"></script>
```

**Oder mit Bundler:**
```html
<script type="module" src="dist/bundle.js"></script>
```

---

### Phase 7: Build & Deployment (1 Tag)

#### 7.1 Build-Prozess

```bash
# Entwicklung (mit Watch)
npm run dev

# Production Build
npm run build

# Type-Check ohne Build
npm run type-check

# Linting
npm run lint
```

#### 7.2 CI/CD (GitHub Actions)

**.github/workflows/build.yml:**
```yaml
name: Build & Type Check

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

---

## 5. Risiko-Management

### Mögliche Probleme & Lösungen

| Problem | Lösung |
|---------|--------|
| **Build-Komplexität** | Inkrementell vorgehen, erstmal nur tsc nutzen |
| **Breaking Changes** | Adapter-Pattern für Rückwärtskompatibilität |
| **Performance** | Source Maps nur in Dev, Production optimiert |
| **Lernkurve** | Pair-Programming, Code-Reviews, Dokumentation |
| **External Dependencies** | Type-Definitionen nutzen (@types/*) |

### Rollback-Strategie

```bash
# Falls Migration schief geht:
git checkout main
npm run build-js  # Alter JS-Build

# Oder: Feature-Branch weiter nutzen
git checkout feature/typescript-migration
```

---

## 6. Testing-Strategie

### Unit Tests (mit Jest)

```bash
npm install --save-dev jest @types/jest ts-jest
```

**jest.config.js:**
```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ]
};
```

**Beispiel-Test:**
```typescript
// src/engine/__tests__/MarketAnalyzer.test.ts
import { MarketAnalyzer } from '../analyzers/MarketAnalyzer';
import type { MarketData } from '../../types';

describe('MarketAnalyzer', () => {
  let analyzer: MarketAnalyzer;

  beforeEach(() => {
    analyzer = new MarketAnalyzer();
  });

  describe('classifyRegime', () => {
    it('should classify peak_hot regime correctly', () => {
      const result = analyzer.classifyRegime(100, 100, [0.02, 0.03, 0.06]);
      expect(result).toBe('peak_hot');
    });

    it('should classify bear_deep regime correctly', () => {
      const result = analyzer.classifyRegime(75, 100, [-0.05, -0.03, -0.02]);
      expect(result).toBe('bear_deep');
    });
  });

  describe('calculateDrawdown', () => {
    it('should calculate drawdown correctly', () => {
      const result = analyzer.calculateDrawdown(80, 100);
      expect(result).toBe(-0.2);
    });

    it('should throw error for zero ATH', () => {
      expect(() => analyzer.calculateDrawdown(80, 0)).toThrow();
    });
  });
});
```

---

## 7. Zeitplan & Meilensteine

### Realistischer Zeitplan (25 Personentage)

| Phase | Dauer | Meilensteine |
|-------|-------|--------------|
| **Phase 1: Setup** | 2-3 Tage | ✅ TypeScript läuft<br>✅ Build funktioniert |
| **Phase 2: Types** | 1-2 Tage | ✅ Alle Core-Types definiert<br>✅ Exports funktionieren |
| **Phase 3: Engine** | 5-7 Tage | ✅ 8 Module migriert<br>✅ Tests laufen |
| **Phase 4: Simulator** | 4-6 Tage | ✅ 7 Module migriert<br>✅ Monte-Carlo funktioniert |
| **Phase 5: Balance** | 3-5 Tage | ✅ 7 Module migriert<br>✅ UI funktioniert |
| **Phase 6: HTML** | 1 Tag | ✅ HTML-Anpassungen<br>✅ Imports korrekt |
| **Phase 7: Deploy** | 1 Tag | ✅ CI/CD läuft<br>✅ Production-Build |
| **Buffer** | 2-3 Tage | Bug-Fixes, Polishing |

**Gesamt:** 19-27 Tage (Durchschnitt: 23 Tage)

### Sprint-Plan (3 Sprints à 1 Woche)

**Sprint 1 (Woche 1): Foundation**
- Setup & Infrastruktur
- Shared Types
- Engine-Start (4 von 8 Modulen)

**Sprint 2 (Woche 2): Core Logic**
- Engine fertig (8 von 8 Modulen)
- Simulator-Start (4 von 7 Modulen)

**Sprint 3 (Woche 3): Completion**
- Simulator fertig
- Balance fertig
- HTML-Anpassungen
- Deployment

---

## 8. Erfolgskriterien

### Definition of Done

✅ Alle 22 Module migriert
✅ Keine TypeScript-Fehler (`tsc --noEmit` erfolgreich)
✅ Alle Features funktionieren wie vorher
✅ Build-Prozess automatisiert
✅ CI/CD läuft
✅ Dokumentation aktualisiert
✅ Tests vorhanden (mind. 50% Coverage)

### Qualitätskriterien

- **Type Coverage:** >90%
- **Test Coverage:** >50% (Ziel: 80%)
- **Build Time:** <30 Sekunden
- **Bundle Size:** <500KB (gzipped)
- **Zero Runtime Errors:** In Produktion

---

## 9. Langfristige Vorteile

### Nach der Migration möglich:

✅ **Automatische Tests:** Jest/Vitest einfach integrierbar
✅ **Refactoring:** Mit Confidence
✅ **Code-Generierung:** Tools wie QuickType
✅ **API-Dokumentation:** Aus Types generierbar
✅ **Onboarding:** Neue Entwickler schneller produktiv
✅ **Maintenance:** Weniger Bugs, schnellere Fixes

---

## 10. Empfehlung

### Für dein Projekt: **JA zur Migration!**

**Gründe:**
1. ✅ Projektgröße rechtfertigt den Aufwand (6.500 Zeilen)
2. ✅ Komplexität profitiert von Typen (Finanzen, Monte-Carlo)
3. ✅ Modulare Struktur erleichtert inkrementelle Migration
4. ✅ Langfristige Wartbarkeit wird stark verbessert
5. ✅ Du hast bereits SAP-Architekt-Erfahrung (statische Typen bekannt)

### Nächste Schritte:

1. **Entscheidung treffen:** Migration ja/nein?
2. **Proof of Concept:** Engine-Modul als Pilot migrieren (2-3 Tage)
3. **Review:** POC evaluieren, Learnings sammeln
4. **Full Migration:** Wenn POC erfolgreich, Rest migrieren

---

## 11. Alternativen

Falls TypeScript zu aufwendig ist:

### Option A: JSDoc + TypeScript Compiler
```javascript
// Bleibt JavaScript, aber mit Type-Checking!
/**
 * @param {Portfolio} portfolio
 * @param {number} rate
 * @returns {number}
 */
function calculateWithdrawal(portfolio, rate) {
  return portfolio.total * rate;
}
```

**Vorteile:** Kein Build-Step, fast gleiche Type-Safety
**Nachteile:** Verbosere Syntax, weniger IDE-Support

### Option B: Nur kritische Module
Nur Engine + Simulator migrieren, Balance bleibt JS.

**Vorteile:** Weniger Aufwand (15 statt 25 Tage)
**Nachteile:** Hybrides System, weniger konsistent

---

## 12. Fazit

TypeScript für dein Projekt ist eine **strategisch sinnvolle Investition**:

- 📊 **ROI:** Hoch (bessere Code-Qualität, weniger Bugs)
- ⏱️ **Aufwand:** Überschaubar (3-4 Wochen)
- 🎯 **Risiko:** Niedrig (inkrementelle Migration möglich)
- 🚀 **Zukunft:** Bereitet Projekt für Wachstum vor

**Meine Empfehlung:** Starte mit einem 2-3 Tage POC (Engine-Modul), dann evaluieren!

---

**Erstellt:** 2025-11-06
**Autor:** Claude Code
**Für:** Ruhestand-App-Final v3.0 (TypeScript Edition)
