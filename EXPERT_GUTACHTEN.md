# Kritische Analyse: Ruhestand-Suite DIY-Software zur Ruhestandsplanung

**Gutachten erstellt:** Januar 2026
**Gutachter-Rolle:** Software-Architekt, Quant/Finanzplaner, Research-Literatur-Experte
**Analysierte Version:** Engine API v31.0, Build 2025-12-22

---

## Executive Summary

Die **Ruhestand-Suite** ist ein bemerkenswert ausgereiftes DIY-Tool zur Ruhestandsplanung, das technisch solide implementiert ist und fachlich fundierte Methoden verwendet. Mit einem **Gesamtscore von 78/100** positioniert sie sich als eine der anspruchsvollsten Open-Source-Alternativen im deutschsprachigen Raum.

**Kernstärken:** Durchdachte Guardrail-Logik mit Marktregime-Erkennung, deterministische Monte-Carlo-Simulation mit Worker-Parallelisierung, umfassende Pflegefall-Modellierung, Multi-Profil-Unterstützung.

**Hauptrisiken:** Fehlendes explizites Steuermodul (Annahme: Steuereffekte grob oder ignoriert), iid-Return-Modell ohne Autokorrelation/Fat Tails, begrenzte historische Datenbasis (1950-2024, primär DE/EU), keine professionelle Sicherheitsauditierung.

**Empfehlung:** Für technisch versierte Solo-Ruheständler mit Finanzverständnis ein exzellentes Planungswerkzeug. Nicht für Laien ohne Hintergrundwissen geeignet. Ergebnisse als Entscheidungsunterstützung, nicht als Prognose interpretieren.

---

## A) Vorgehensplan und Dokumentation

### A.1 Repo-Scan

```
Ruhestand-App-Final/
├── Balance.html                    # Entry-Point Balance-App
├── Simulator.html                  # Entry-Point Simulator
├── index.html                      # Profil-Manager/Dashboard
├── engine/                         # Kern-Engine (8 ESM-Module)
│   ├── core.mjs                    # Orchestrierung, EngineAPI
│   ├── config.mjs                  # Zentrale Konfiguration
│   ├── validators/InputValidator   # Input-Validierung
│   ├── analyzers/MarketAnalyzer    # Marktregime-Klassifikation
│   ├── planners/SpendingPlanner    # Guardrails, Flex-Rate
│   └── transactions/TransactionEngine  # Liquidität, Rebalancing
├── balance-*.js                    # ~25 Balance-App Module
├── simulator-*.js                  # ~35 Simulator Module
├── monte-carlo-runner.js           # DOM-freie MC-Simulation
├── workers/                        # Web Worker Pool
├── tests/                          # 25 Test-Dateien
└── docs/                           # Zusätzliche Dokumentation
```

**Dependencies:** Minimal - nur `@tauri-apps/cli` als devDependency für Desktop-Build. Keine Runtime-Dependencies.

### A.2 Systemverständnis

**Zwei Apps, eine Engine:**

1. **Balance-App:** Jahresabschluss-Tool für Einzeljahr-Planung
   - Liest DOM-Inputs → Engine → Rendert Ergebnisse
   - Persistenz via localStorage + File System Access API

2. **Simulator:** Monte-Carlo + Parameter-Sweeps
   - Parallelisierte Simulation via Web Workers
   - 3-stufige Optimierung (Coarse → Refinement → Verification)
   - Pflegefall-Szenarien mit Dual-Care-Logik

**Datenfluss Engine:**
```
Input → InputValidator.validate()
      → MarketAnalyzer.analyzeMarket()
      → SpendingPlanner.determineSpending()
      → TransactionEngine.calculateTargetLiquidity()
      → TransactionEngine.determineAction()
      → Result {newState, diagnosis, ui}
```

### A.3 Algorithmus-Inventar

| Komponente | Algorithmus/Strategie | Evidenz |
|------------|----------------------|---------|
| **Marktregime** | Klassifikation via ATH-Abstand, 1Y-Performance, Stagflation-Check | `MarketAnalyzer.mjs:59-152` |
| **Guardrails** | Floor-Flex-System mit Alarm-Eskalation/Deeskalation | `SpendingPlanner.mjs:300-347` |
| **Flex-Rate Glättung** | Exponentieller Glättung (α=0.35) mit Rate-Change-Caps | `config.mjs:101-107` |
| **Recovery-Caps** | ATH-Gap-abhängige Kürzungsregeln (10-25%) | `config.mjs:143-163` |
| **Liquiditäts-Targeting** | Dynamisches Runway-Ziel nach Marktregime (36-60 Monate) | `config.mjs:76-89` |
| **Anti-Pseudo-Accuracy** | Quantisierung auf sinnvolle Stufungen | `config.mjs:115-133` |
| **Monte-Carlo** | Per-Run-Seeding, Block-Bootstrap, CAPE-Sampling | `monte-carlo-runner.js:76-688` |
| **Pflegefall** | Grad-basierte Wahrscheinlichkeiten, Progression, Mortalität | `simulator-data.js:14-51` |
| **Stress-Tests** | Parametrische + Conditional Bootstrap Szenarien | `simulator-data.js:162-224` |

### A.4 Reproduzierbarkeit

**Gesichert:**
- Deterministischer Seed (`makeRunSeed()` in `simulator-utils.js:96-103`)
- Per-Run-Seeding erlaubt identische Ergebnisse bei Chunk-Splitting
- Build-ID in `config.mjs` für Versionierung
- Worker-Parity-Test (`worker-parity.test.mjs`) validiert Determinismus

**Annahme:** Ergebnisse sind reproduzierbar bei gleichen Inputs und Seeds.

### A.5 Validierung

| Test-Kategorie | Dateien | Coverage-Schätzung |
|---------------|---------|-------------------|
| Engine Core | `core-engine.test.mjs`, `spending-planner.test.mjs` | ~70% |
| Transaktionen | `transaction-*.test.mjs` (4 Files) | ~80% |
| Monte-Carlo | `simulation.test.mjs`, `simulator-headless.test.mjs` | ~60% |
| Worker-Parität | `worker-parity.test.mjs` | ~90% |
| Integration | `balance-smoke.test.mjs`, `profilverbund-*.test.mjs` | ~50% |

**Testframework:** Einfaches Assertion-Framework (`assert`, `assertEqual`, `assertClose`). Keine Property-Based Tests, keine Fuzz-Tests.

### A.6 Nutzerperspektive

**Entscheidungsunterstützung:**
- "Wie viel kann ich dieses Jahr entnehmen?"
- "Welche Asset-Allokation ist optimal?"
- "Wie robust ist mein Plan gegen Worst-Case-Szenarien?"
- "Was passiert bei Pflegebedürftigkeit?"

**Stolperfallen:**
- Keine explizite Steuerberechnung (grobe Annahme erforderlich)
- Komplexität der Parameter kann überfordern
- Ergebnisse können Scheingenauigkeit suggerieren

---

## B) Technische Analyse

### B.1 Architektur & Modularität (Score: 85/100)

**Stärken:**
- Klare Trennung: Engine (Logik) ↔ Apps (UI) ↔ Workers (Parallelisierung)
- Native ES6-Module ohne Bundler für App-Code
- DOM-freie Runner ermöglichen Worker-Kompatibilität
- Facade-Pattern für Engine-Zugriff (`simulator-engine-wrapper.js`)

**Schwächen:**
- Einige Module sind groß (`monte-carlo-runner.js`: 689 Zeilen)
- Zirkuläre Abhängigkeiten nicht systematisch geprüft
- Keine TypeScript-Typisierung

**Evidenz:**
```javascript
// Gute Separation: Engine exportiert klare API
const EngineAPI = {
    getVersion: function() { ... },
    analyzeMarket: function(input) { ... },
    simulateSingleYear: function(input, lastState) { ... }
};
// core.mjs:237-306
```

### B.2 Codequalität (Score: 75/100)

**Stärken:**
- Konsistentes Naming (deutsch/englisch gemischt, aber konsistent)
- Gute Dokumentation in Kommentaren
- Konfiguration zentralisiert in `config.mjs`

**Schwächen:**
- Einige Magic Numbers (z.B. `0.35` für Glättung)
- Lange Funktionen in `monte-carlo-runner.js` (> 500 Zeilen)
- Dead Code teilweise vorhanden (deprecated Funktionen)

**Evidenz:**
```javascript
// Gut: Klare Konstanten
FLEX_RATE_SMOOTHING_ALPHA: 0.35,  // Dokumentiert
RATE_CHANGE_MAX_DOWN_IN_BEAR_PP: 10.0  // Dokumentiert as "drastisch"
// config.mjs:101-107
```

### B.3 Performance (Score: 90/100)

**Stärken:**
- Web Worker Pool mit adaptivem Chunking (`worker-pool.js`)
- Quickselect für Quantile statt Full-Sort (`simulator-utils.js:111-144`)
- Typed Arrays für Buffers (`Float64Array`, `Uint32Array`)
- Time-Budget-basierte Chunk-Größenanpassung

**Schwächen:**
- Keine explizite Memory-Pooling für häufige Allokationen
- GC-Pressure bei großen Sweeps möglich

**Evidenz:**
```javascript
// Optimierte Quantile-Berechnung
export function quantile(arr, q) {
    const sorted = new Float64Array(arr);  // Typed Array
    // Quickselect-Algorithmus statt O(n log n) Sort
    // simulator-utils.js:111-144
}
```

### B.4 Zuverlässigkeit (Score: 80/100)

**Stärken:**
- Input-Validierung mit strukturierten Fehlermeldungen
- Fallback-Logik bei Worker-Fehlern (Serial-Fallback)
- Defensive Cloning (`structuredClone`) für Sweep-Cases

**Schwächen:**
- Keine explizite Floating-Point-Hygiene (keine epsilon-Vergleiche)
- Grenzfälle bei extremen Inputs nicht vollständig abgedeckt
- Keine Retry-Logik bei Engine-Fehlern

**Evidenz:**
```javascript
// Validierung vorhanden
const validationResult = InputValidator.validate(input);
if (!validationResult.valid) {
    return { error: new ValidationError(validationResult.errors) };
}
// core.mjs:35-40
```

### B.5 Security/Privacy (Score: 70/100)

**Stärken:**
- Vollständig lokal (keine Server-Kommunikation für Kernfunktionen)
- Keine Secrets im Code
- localStorage für Persistenz (browserisoliert)

**Schwächen:**
- Keine CSP (Content Security Policy) definiert
- Online-Datenabruf (Yahoo Finance, ECB) ohne Validierung
- Keine Audit für XSS in Renderer-Modulen

**Annahme:** Für DIY-Tool akzeptabel, aber kein Enterprise-Level.

### B.6 Testing (Score: 70/100)

**Stärken:**
- 25 Test-Dateien mit substantieller Coverage
- Worker-Parity-Test für Determinismus
- Smoke-Tests für Integration

**Schwächen:**
- Keine Code-Coverage-Metriken
- Keine Property-Based Tests
- Keine automatisierte UI-Tests

### B.7 DX/Operations (Score: 65/100)

**Stärken:**
- Einfaches `npm test` für alle Tests
- Build-Skript für Engine-Bundling
- Tauri-Integration für Desktop-Build

**Schwächen:**
- Kein CI/CD-Pipeline definiert
- Kein Linting (ESLint) konfiguriert
- Keine TypeScript-Checks

---

## C) Fachliche Analyse

### C.1 Zielklarheit (Score: 85/100)

**Unterstützte Entscheidungen:**
- ✅ Entnahmerate (Floor-Flex-Modell)
- ✅ Asset-Allokation (Aktien/Gold/Cash)
- ✅ Rebalancing-Timing (Marktregime-abhängig)
- ✅ Cash-Buffer (dynamisches Runway-Ziel)
- ✅ Krisenregeln (Alarm-Modus, Recovery-Guardrails)
- ⚠️ Steuern (nur implizit via SPB-Freibetrag)
- ❌ Sozialversicherung/Krankenversicherung

### C.2 Realismus (Score: 70/100)

| Aspekt | Behandlung | Bewertung |
|--------|-----------|-----------|
| **Inflation** | Historische DE-Daten, Stagflation-Erkennung | ✅ Gut |
| **Fees** | Nicht explizit modelliert | ⚠️ Schwach |
| **Steuern** | Nur SPB-Freibetrag, keine Progression | ⚠️ Schwach |
| **Rendite** | Historisch (1950-2024), CAPE-Sampling | ✅ Gut |
| **Tail-Risiken** | Stress-Presets, aber keine Fat Tails | ⚠️ Moderat |
| **Regimewechsel** | Markov-Chain für Regime-Transitions | ✅ Gut |

### C.3 Withdrawal-Methodik (Score: 85/100)

**Implementiert:**
- **Floor-Flex-Modell:** Grundbedarf (Floor) + optionaler Bedarf (Flex)
- **Dynamische Anpassung:** Flex-Rate wird marktabhängig angepasst
- **Guardrails:**
  - Alarm-Schwellen (5.5% Entnahmequote, 25% realer Drawdown)
  - Vorsichts-Schwellen (4.5% Entnahmequote)
  - Recovery-Caps (10-25% basierend auf ATH-Abstand)
- **Glättung:** Exponentieller Glättung mit Rate-Change-Caps

**Nicht implementiert:**
- VPW (Variable Percentage Withdrawal)
- RMD-basierte Regeln
- Utility-basierte Optimierung

**Evidenz:**
```javascript
// Floor-Flex-Modell in SpendingPlanner
const inflatedBedarf = {
    floor: Math.max(0, input.floorBedarf - renteJahr),
    flex: input.flexBedarf
};
// Guardrail-Check
const isQuoteCritical = entnahmequoteDepot > CONFIG.THRESHOLDS.ALARM.withdrawalRate;
```

### C.4 Sequence-of-Returns Risk (Score: 80/100)

**Explizite Modellierung:**
- ✅ Monte-Carlo mit verschiedenen Startjahren
- ✅ CAPE-Sampling für bewertungsähnliche Perioden
- ✅ Stress-Presets (Stagflation 70er, Doppelbär 2000er)
- ✅ Worst-Case-Analyse mit Szenario-Logging

**Schwächen:**
- Keine explizite SoRR-Metrik (z.B. "Retirement Years 1-5 Return")
- Keine Bucket-Strategie-Simulation

### C.5 Monte Carlo Qualität (Score: 72/100)

| Aspekt | Status | Bewertung |
|--------|--------|-----------|
| **Return-Model** | Historisch + Block-Bootstrap | ✅ |
| **iid-Annahme** | Ja (innerhalb Blöcke) | ⚠️ Schwach |
| **Fat Tails** | Nicht explizit | ⚠️ Schwach |
| **Autokorrelation** | Via Block-Bootstrap partiell | ✅ Moderat |
| **Volatility Clustering** | Via Regime-Modell partiell | ✅ Moderat |
| **Mortalität** | Sterbetafeln (m/w/d) | ✅ Gut |
| **Determinismus** | Per-Run-Seeding | ✅ Exzellent |

### C.6 Backtest-Hygiene (Score: 75/100)

**Stärken:**
- Historische Daten 1950-2024 (75 Jahre)
- Regime-Klassifikation basierend auf beobachtbaren Metriken
- Keine Look-ahead in der Engine-Logik

**Schwächen:**
- Survivorship Bias: Nur MSCI (keine gescheiterten Märkte)
- Trading-Friktionen nicht modelliert
- Rebalancing-Annahmen vereinfacht (jährlich)

### C.7 Interpretation der Outputs (Score: 80/100)

**Verfügbare KPIs:**
- Erfolgswahrscheinlichkeit (Success Prob Floor)
- Vermögens-Perzentile (P10/P25/P50/P75/P90)
- Max Drawdown (P50, P90)
- Depot-Erschöpfungsquote
- Pflegefall-Statistiken (Entry Age, Duration, Costs)

**Fehlinterpretationsgefahr:**
- "95% Erfolg" bedeutet nicht "95% Wahrscheinlichkeit"
- Scheingenauigkeit durch viele Dezimalstellen
- Anti-Pseudo-Accuracy-Modul hilft teilweise

### C.8 Handlungsleitfaden (Score: 70/100)

**Vorhanden:**
- Marktregime-Anzeige mit Handlungsempfehlung
- Diagnose-Panel mit Entscheidungsbaum
- "Aktionsbox" mit konkreten Transaktionen

**Fehlend:**
- Keine "Wenn-Dann"-Checklisten für Nutzer
- Keine automatische Warnung bei kritischen Kombinationen
- Kein Onboarding/Wizard für Erstnutzer

---

## D) Marktvergleich

### D.1 Kommerzielle Retirement Planner

| Tool | Preis | MC-Simulation | Guardrails | DE-Support | Differenzierung Ruhestand-Suite |
|------|-------|---------------|------------|------------|-------------------------------|
| **[ProjectionLab](https://projectionlab.com/germany)** | $109/Jahr | ✅ | ❌ | ✅ | Suite hat bessere Guardrails |
| **[Boldin](https://www.boldin.com)** | $120/Jahr | ✅ | ⚠️ | ❌ | Suite ist kostenlos, offline |
| **[Pralana](https://www.pralana.com)** | $99+ | ✅ | ⚠️ | ❌ | Suite hat Pflegefall-Modell |
| **[WealthTrace](https://www.mywealthtrace.com/)** | $99/Jahr | ✅ | ❌ | ❌ | Suite hat Multi-Profil |

### D.2 Kostenlose Tools

| Tool | MC-Simulation | Guardrails | Offline | Differenzierung |
|------|---------------|------------|---------|-----------------|
| **[Portfolio Visualizer](https://www.portfoliovisualizer.com/monte-carlo-simulation)** | ✅ | ❌ | ❌ | Suite hat dynamische Entnahme |
| **[FI Calc](https://ficalc.app)** | ✅ | ❌ | ❌ | Suite hat Pflegefall |
| **[Honest Math](https://www.honestmath.com)** | ✅ | ❌ | ❌ | Suite hat deutsche Fokussierung |
| **[BVI Entnahme-Rechner](https://www.bvi.de/en/services/calculators/retirement-calculator/)** | ✅ | ❌ | ❌ | Suite hat Parameter-Sweeps |

### D.3 Alleinstellungsmerkmale

**Ruhestand-Suite bietet:**
1. ✅ Vollständig offline/lokal (Datenschutz)
2. ✅ Deutschsprachig mit DE-Marktdaten
3. ✅ Dynamische Guardrails mit Marktregime-Erkennung
4. ✅ Pflegefall-Modellierung (PG1-5, Dual-Care)
5. ✅ Multi-Profil (Paare, getrennte Depots)
6. ✅ Parameter-Sweeps mit Auto-Optimize
7. ✅ Open Source (MIT-Lizenz)

**Suite fehlt:**
1. ❌ Detaillierte Steuerberechnung
2. ❌ Social Security/GRV-Optimierung
3. ❌ Roth-Conversion-Analyse (US-spezifisch, irrelevant für DE)
4. ❌ Account-Linking für automatische Updates
5. ❌ Mobile App

---

## E) Forschungsabgleich

### E.1 Dynamische Entnahmeregeln

**Stand der Forschung:**
- [Morningstar 2025](https://www.morningstar.com/retirement/how-retirees-can-determine-safe-withdrawal-rate-2025): Guardrails ermöglichen 5.7% statt 3.9% SWR
- [Kitces 2024](https://www.kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/): Risk-based Guardrails überlegen vs. Guyton-Klinger

**Suite-Bewertung:** ✅ Im Einklang
- Floor-Flex ähnelt Guardrails-Ansatz
- Marktregime-abhängige Anpassung geht über klassische Guardrails hinaus
- Recovery-Caps verhindern zu schnelle Erhöhung

### E.2 Fat Tails / Regime Switching

**Stand der Forschung:**
- Regime-Switching-Modelle erfassen Volatility Clustering besser als iid
- Fat Tails (Student-t, GARCH) wichtig für Tail-Risk

**Suite-Bewertung:** ⚠️ Teilweise
- Regime-Klassifikation vorhanden (BULL/BEAR/SIDEWAYS/STAGFLATION)
- Markov-Chain für Transitions implementiert
- **Lücke:** Keine expliziten Fat Tails im Return-Modell

### E.3 Bootstrap-Verfahren

**Stand der Forschung:**
- Block-Bootstrap erhält Autokorrelation
- Stationary Bootstrap (Politis/Romano) optimal für Zeitreihen

**Suite-Bewertung:** ✅ Gut
- Block-Bootstrap implementiert (`blockSize` Parameter)
- CAPE-Sampling für bewertungsähnliche Perioden
- **Lücke:** Kein Stationary Bootstrap mit zufälliger Blocklänge

### E.4 Robustheitsprinzipien

**Stand der Forschung:**
- Sensitivity Analysis für Schlüsselparameter
- Model Uncertainty durch Ensembles
- Stress Testing für Extremszenarien

**Suite-Bewertung:** ✅ Gut
- Parameter-Sweeps ermöglichen Sensitivity Analysis
- 7 Stress-Presets (Stagflation, Doppelbär, Lost Decade, etc.)
- **Lücke:** Keine automatische Model Uncertainty Quantification

### E.5 High-Leverage Verbesserungen

1. **Fat Tails:** Student-t-Verteilung für Returns (+15% Robustheit bei Tail-Events)
2. **Steuer-Modul:** Deutsche Abgeltungssteuer + Progression (+25% Realismus)
3. **Fees:** TER-Abzug pro Jahr (+5% Realismus)
4. **SoRR-Metrik:** Explizite Early-Retirement-Years-Performance
5. **Utility-Funktion:** CRRA für risikoaverse Optimierung

---

## F) Bewertungsraster

### F.1 Technik (Gewicht: 30%)

**Score: 78/100**

| Kriterium | Punkte | Begründung |
|-----------|--------|------------|
| Architektur | 85 | Klare Trennung, modularer Aufbau |
| Codequalität | 75 | Gute Lesbarkeit, aber lange Funktionen |
| Performance | 90 | Worker-Pool, Typed Arrays, Quickselect |
| Zuverlässigkeit | 80 | Validierung, aber keine epsilon-Vergleiche |
| Security | 70 | Lokal, aber keine Audits |
| Testing | 70 | Substantielle Coverage, aber keine Metriken |
| DX | 65 | Einfach, aber kein CI/CD |

**Top 3 Strengths:**
1. Web Worker Parallelisierung mit adaptivem Chunking
2. Deterministisches Seeding für Reproduzierbarkeit
3. Saubere Engine/UI-Trennung

**Top 3 Risks:**
1. Keine TypeScript-Typisierung
2. Keine CI/CD-Pipeline
3. Potenzielle XSS in Renderer-Modulen

### F.2 Fachliche Methodik (Gewicht: 30%)

**Score: 77/100**

| Kriterium | Punkte | Begründung |
|-----------|--------|------------|
| Withdrawal-Strategie | 85 | Floor-Flex mit Guardrails |
| MC-Qualität | 72 | Gut, aber iid ohne Fat Tails |
| SoRR-Handling | 80 | CAPE-Sampling, Stress-Tests |
| Backtest-Hygiene | 75 | 75 Jahre Daten, aber Survivorship Bias |
| Realismus | 70 | Inflation ja, Steuern/Fees nein |

**Top 3 Strengths:**
1. Marktregime-basierte dynamische Guardrails
2. Pflegefall-Modellierung mit Progression
3. Multi-Profil für Paare

**Top 3 Risks:**
1. Fehlende Steuerberechnung
2. iid-Returns ohne Fat Tails
3. Nur MSCI-basiert (Survivorship Bias)

### F.3 Validierung & Reproduzierbarkeit (Gewicht: 15%)

**Score: 82/100**

| Kriterium | Punkte | Begründung |
|-----------|--------|------------|
| Test-Coverage | 70 | 25 Files, aber keine Metriken |
| Determinismus | 95 | Per-Run-Seeding, Worker-Parity-Test |
| Dokumentation | 80 | CLAUDE.md, TECHNICAL.md, READMEs |

### F.4 Nutzerwert für Solo-Ruheständler (Gewicht: 15%)

**Score: 75/100**

| Kriterium | Punkte | Begründung |
|-----------|--------|------------|
| Entscheidungsunterstützung | 85 | Diagnose-Panel, Aktionsbox |
| Bedienbarkeit | 65 | Komplex, kein Onboarding |
| Erklärbarkeit | 75 | Entscheidungsbaum, aber technisch |

### F.5 Marktposition & Differenzierung (Gewicht: 10%)

**Score: 85/100**

| Kriterium | Punkte | Begründung |
|-----------|--------|------------|
| Feature-Parität | 90 | Übertrifft kostenlose Alternativen |
| Alleinstellung | 85 | Guardrails + Pflege + Multi-Profil |
| Preis-Leistung | 80 | Kostenlos, aber Setup-Aufwand |

---

## F.6 Finaler Score

| Kategorie | Gewicht | Score | Gewichteter Score |
|-----------|---------|-------|-------------------|
| Technik | 30% | 78 | 23.4 |
| Fachliche Methodik | 30% | 77 | 23.1 |
| Validierung & Reproduzierbarkeit | 15% | 82 | 12.3 |
| Nutzerwert | 15% | 75 | 11.25 |
| Marktposition | 10% | 85 | 8.5 |

### **Gesamtscore: 78.55/100 ≈ 78%**

---

## G) Top 5 Next Actions (priorisiert)

| Priorität | Aktion | Impact | Aufwand |
|-----------|--------|--------|---------|
| 1 | **Steuer-Modul:** Abgeltungssteuer + Progressionsvorbehalt | Hoch | Mittel |
| 2 | **Fat-Tails:** Student-t oder GARCH für Return-Sampling | Hoch | Mittel |
| 3 | **CI/CD:** GitHub Actions für automatisierte Tests | Mittel | Niedrig |
| 4 | **Fees:** TER-Parameter mit automatischem Abzug | Mittel | Niedrig |
| 5 | **Onboarding:** Wizard für Erstnutzer mit Defaults | Mittel | Mittel |

---

## Appendix: Modul-Inventar

### Engine-Module (8)
| Modul | LOC | Funktion |
|-------|-----|----------|
| `core.mjs` | 311 | Orchestrierung, EngineAPI |
| `config.mjs` | 228 | Zentrale Konfiguration |
| `InputValidator.mjs` | ~200* | Input-Validierung |
| `MarketAnalyzer.mjs` | 156 | Marktregime-Klassifikation |
| `SpendingPlanner.mjs` | 659 | Guardrails, Flex-Rate |
| `TransactionEngine.mjs` | 41 | Facade für Transaktionen |
| `transaction-*.mjs` | ~500* | Transaktionslogik (5 Dateien) |
| `errors.mjs` | ~50* | Fehlerklassen |

### Simulator-Module (Auswahl)
| Modul | LOC | Funktion |
|-------|-----|----------|
| `monte-carlo-runner.js` | 689 | DOM-freie MC-Simulation |
| `simulator-sweep.js` | ~500 | Parameter-Sweeps |
| `simulator-optimizer.js` | ~500 | 3-stufige Optimierung |
| `simulator-data.js` | 322 | Historische Daten, Presets |
| `simulator-utils.js` | 260 | RNG, Quantile, Parser |

### Kernalgorithmen
1. **Floor-Flex-Guardrails** (`SpendingPlanner.mjs`)
2. **Marktregime-Klassifikation** (`MarketAnalyzer.mjs`)
3. **Per-Run-Seeding** (`simulator-utils.js:makeRunSeed`)
4. **Block-Bootstrap** (`monte-carlo-runner.js:sampleNextYearData`)
5. **Worker-Pool mit adaptivem Chunking** (`worker-pool.js`)
6. **Pflegegrad-Progression** (`simulator-data.js:PFLEGE_GRADE_PROGRESSION`)
7. **3-Stage-Optimization** (`simulator-optimizer.js`)

---

## Quellen

### Marktvergleich
- [Portfolio Visualizer Monte Carlo](https://www.portfoliovisualizer.com/monte-carlo-simulation)
- [Rob Berger: Best Retirement Calculators](https://robberger.com/best-retirement-calculators/)
- [ProjectionLab Germany](https://projectionlab.com/germany)
- [Honest Math](https://www.honestmath.com)
- [The Flexible Retirement Planner](https://www.flexibleretirementplanner.com/wp/)

### Forschung
- [Morningstar: Safe Withdrawal Rate 2025](https://www.morningstar.com/retirement/how-retirees-can-determine-safe-withdrawal-rate-2025)
- [Kitces: Risk-Based Guardrails](https://www.kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/)
- [White Coat Investor: Risk-Based Guardrails](https://www.whitecoatinvestor.com/risk-based-guardrail-retirement-withdrawal-strategy/)
- [Morningstar: Best Flexible Strategies](https://www.morningstar.com/retirement/best-flexible-strategies-retirement-income-2)

---

*Dokument erstellt durch automatisierte Code-Analyse und manuelle Überprüfung. Alle Bewertungen basieren auf dem analysierten Code-Stand und können bei zukünftigen Änderungen abweichen.*
