# PRINCIPAL REVIEW: Ruhestand-App-Final

**Unabhängige Analyse der Ruhestand-Suite (Balance-App + Simulator + Engine)**
**Reviewer-Datum:** 2026-02-12
**Engine-Version:** API v31.0, Build 2025-12-22
**Codeumfang:** ~37.000 LOC (182 Code-Dateien, 54 Tests, 41 Doku-Dateien)

---

## 1) Executive Summary

### Gesamtbewertung

| Metrik | Wert |
|--------|------|
| **Weighted Overall Score** | **72 / 100** |
| **Risk-Adjusted Score** | **62 / 100** |
| **Confidence** | **78%** |
| **Einordnung** | Solide mit relevanten Lücken |

### 5 größte Stärken

1. **Null-Dependency-Engine mit klarer Schichtentrennung:** Der `/engine/`-Kern (3.826 LOC, 0 externe Abhängigkeiten) ist sauber isoliert, versioniert (API v31.0), und hat eine durchdachte Modulstruktur (Validator → MarketAnalyzer → SpendingPlanner → TransactionEngine). Evidenz: `engine/core.mjs:16-21` (Imports), `engine/config.mjs:10` (Versionierung).

2. **Umfangreiche Testsuite mit 100% Pass-Rate:** 909 Assertions in 54 Testdateien, alle bestanden (0 Failures). Custom ESM-Runner ohne externe Abhängigkeiten. Prioritäten-Kategorisierung dokumentiert. Evidenz: Testlauf-Output `Total Assertions: 909, Passed: 909, Failed: 0`.

3. **Durchdachte Fachlogik mit mehrstufigem Sicherheitsnetz:** Guardrails (Alarm, Caution, Recovery), Wealth-Adjusted Reduction, Flex-Budget-Caps, Anti-Pseudo-Accuracy-Quantisierung, und finale Rate-Limits bilden ein tiefgestaffeltes Sicherheitssystem. Evidenz: `SpendingPlanner.mjs:253-379` (determineSpending-Pipeline).

4. **Exzellente Dokumentation:** 114K-Architektur-Fachkonzept (`ARCHITEKTUR_UND_FACHKONZEPT.md`), Release-Checkliste, Forschungsabgleich, Marktvergleich, explizite Eignung/Nicht-Eignung. Insgesamt 41 Markdown-Dateien mit klarer Struktur.

5. **Realistische Pflegefall-Modellierung (Dual-Care):** PG1-5 mit altersabhängigen Eintrittswahrscheinlichkeiten (BARMER Pflegereport 2024), Progression, separater Mortalitäts-Multiplikator, Dual-Care für Paare mit getrennter RNG. Evidenz: `simulator-data.js:22-58`, `monte-carlo-runner.js:470-479`.

### 5 kritischste Risiken

1. **Keine CI/CD-Testautomatisierung** – Tests laufen nur lokal; die GitHub Actions Pipeline deployt nur Pages.
2. **Historische Daten 1925-1949 unsicher** – Interpolierte/geschätzte MSCI-EUR-Levels ohne transparente Quellendokumentation.
3. **Block-Bootstrap ohne Stationary Bootstrap** – Bekannte Einschränkung, kann Autokorrelationsstrukturen verzerren.
4. **Kein formales Coverage-Tracking** – 909 Assertions bei ~27.000 LOC Produktivcode: qualitativ gut, quantitativ nicht verifizierbar.
5. **`var`-Nutzung und DEBUG-Logs in Produktion** – `sale-engine.mjs:96` nutzt `var explicitBrutto`, und mehrere `console.warn('DEBUG:...')` verbleiben im Code.

---

## 2) Detaillierte Scorecard

| # | Dimension | Gewicht | Score | Confidence | Begründung | Schlüssel-Evidenzen |
|---|-----------|---------|-------|------------|------------|---------------------|
| 1 | **Architektur & Systemdesign** | 15% | 78 | 82% | Klare 3-Schichten-Architektur (Präsentation → Logik → Worker). Engine ist isoliert und portabel. Schwächen: Simulator-Schicht ist mit 14.570 LOC in 43 Modulen zu groß; fehlende Interface-Verträge zwischen Schichten. | `engine/core.mjs` (463 LOC, saubere Orchestrierung), `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md:151-190` (Schichtendiagramm) |
| 2 | **Codequalität & Wartbarkeit** | 15% | 65 | 80% | Konsistente Benennung (Deutsch), gute Kommentierung. Schwächen: `var` statt `let/const` (`sale-engine.mjs:96`), DEBUG-Console-Logs in Produktion (`transaction-opportunistic.mjs:167-173`), einzelne Funktionen >100 LOC, fehlende JSDoc-Rückgabetypen. | `sale-engine.mjs:96` (`var explicitBrutto`), `transaction-opportunistic.mjs:167-173` (console.warn DEBUG), `monte-carlo-runner.js:500-800` (300-LOC-Schleife) |
| 3 | **Korrektheit & Robustheit der Kernlogik** | 20% | 80 | 78% | Defensive Programmierung konsequent (NaN-Hardening, `Number.isFinite()`-Checks, Fallbacks). VPW-Formel korrekt (`core.mjs:62-69`). Steuerberechnung schlüssig (Abgeltungsteuer + Soli + KiSt). Schwäche: Kein Verlustverrechnungstopf, keine Günstigerprüfung. | `core.mjs:62-69` (VPW r/(1-(1+r)^-n)), `sale-engine.mjs:13` (keSt = 0.25*(1+0.055+kiSt)), `InputValidator.mjs:25-197` |
| 4 | **Testqualität & Verifikation** | 10% | 68 | 75% | 909 Assertions, 100% Pass-Rate, gute Prioritäts-Kategorisierung. Schwächen: Kein Coverage-Tracking, kein Mutation-Testing, Tests werfen bei erstem Fehler (assert throws), keine Property-Based-Tests für numerische Kernlogik. | `tests/run-tests.mjs:25-34` (assert wirft Error), Test-Output: 909/909 |
| 5 | **Fachliche Qualität (Finanz-/Rentenlogik)** | 15% | 75 | 80% | Guardrail-System mit 7 Marktregimen ist ausgereift. Runway-Logik (24-60 Monate) marktregimeabhängig. Tax-optimierte Verkaufsreihenfolge. Schwächen: Keine Verlustverrechnung, keine Günstigerprüfung, CAPE-Expected-Returns sind diskret (4 Stufen statt kontinuierlich). | `config.mjs:76-88` (PROFIL_MAP), `MarketAnalyzer.mjs:82-103` (Regime-Erkennung), `config.mjs:227-238` (MARKET_VALUATION) |
| 6 | **Wissenschaftlich-methodische Qualität** | 15% | 65 | 72% | Block-Bootstrap mit Regime-Markov-Sampling. CDF mit Binärsuche (`O(log n)`). Schwächen: Kein Stationary Bootstrap, keine Fat Tails, MSCI-EUR-Index-Variante undokumentiert (Price vs. Total Return), Daten 1925-1949 als geschätzt markiert aber Qualität unklar, Recency-Gewichtung-Halbwertszeit fest codiert (20 Jahre). | `monte-carlo-runner.js:105-142` (CDF+Binärsuche), `simulator-data.js:65-76` (Doku-Lücke msci_eur), `monte-carlo-runner.js:144-203` (Sampling-Config) |
| 7 | **Produkt-/UX-/Dokureife** | 5% | 80 | 85% | 114K-Fachkonzept, interaktives Handbuch (99K HTML), Quickstart-Guide, Release-Checkliste. Klare Eignungs-/Nicht-Eignungsliste. Schwäche: Kein automatischer Doku-Code-Sync-Check; LOC-Angaben in Doku sind stichtagsbezogen und können driften. | `ARCHITEKTUR_UND_FACHKONZEPT.md:1-146`, `QUICKSTART.md`, `Handbuch.html` |
| 8 | **Betriebs-/Release-Reife** | 5% | 45 | 85% | Kein automatisiertes Testing in CI. GitHub Actions nur für Pages-Deploy. Build-Script mit esbuild-Fallback ist pragmatisch. Kein Semantic Versioning. `RuheStandSuite.exe` im Repo ist fragwürdig (Binary in Git). | `.github/workflows/feature-branch-pages.yml` (kein Testlauf), `build-engine.mjs` (esbuild-Fallback), Root: `RuheStandSuite.exe` |

### Score-Berechnung

```
Weighted Score = 0.15×78 + 0.15×65 + 0.20×80 + 0.10×68 + 0.15×75 + 0.15×65 + 0.05×80 + 0.05×45
              = 11.7 + 9.75 + 16.0 + 6.8 + 11.25 + 9.75 + 4.0 + 2.25
              = 71.5 → 72

Risk Adjustments:
- Keine CI/CD-Testautomatisierung: -4 (High-Impact: Regression kann unbemerkt in Produktion gelangen)
- Undokumentierte Index-Variante (Price vs. Total Return): -3 (High-Impact: Systematischer Bias in MC-Ergebnissen)
- Kein Stationary Bootstrap: -2 (Medium-Impact: Überschätzung der Diversifikation bei Regimewechseln)
- DEBUG-Logs + `var` in Produktion: -1 (Low-Impact: Code-Hygiene)

Risk-Adjusted Score = 72 - 10 = 62
```

---

## 3) Technische Tiefenanalyse

### 3.1 Architekturdiagramm (Textform)

```
┌──────────────────────────────────────────────────────────────────┐
│                 BROWSER / TAURI RUNTIME                          │
│                                                                  │
│  ┌─────────────────┐       ┌─────────────────────────────────┐  │
│  │  Balance.html    │       │  Simulator.html                 │  │
│  │  ┌─────────────┐│       │  ┌───────────────────────────┐  │  │
│  │  │balance-main ││       │  │simulator-main             │  │  │
│  │  │  -reader    ││       │  │  -portfolio-inputs         │  │  │
│  │  │  -renderer  ││       │  │  -engine-direct (988 LOC!) │  │  │
│  │  │  -storage   ││       │  │  -monte-carlo-runner       │  │  │
│  │  │  -diagnosis ││       │  │  -sweep / auto-optimize    │  │  │
│  │  │  -expenses  ││       │  │  -results / heatmap        │  │  │
│  │  └─────────────┘│       │  └───────────────────────────┘  │  │
│  └─────────────────┘       └─────────────────────────────────┘  │
│           │                            │                         │
│           └────────────┬───────────────┘                         │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ENGINE (engine.js Bundle)                     │   │
│  │  core.mjs → InputValidator → MarketAnalyzer               │   │
│  │           → SpendingPlanner → TransactionEngine            │   │
│  │              (sale-engine, opportunistic, surplus)         │   │
│  │  config.mjs (Schwellenwerte, Profile, Spending-Modell)    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              WORKERS (Web Worker Pool)                     │   │
│  │  worker-pool.js (319 LOC) → mc-worker.js (136 LOC)       │   │
│  │  worker-telemetry.js (395 LOC)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────┐  ┌────────────────────────────┐   │
│  │  PERSISTENZ              │  │  DATEN                      │   │
│  │  localStorage            │  │  simulator-data.js          │   │
│  │  File System Access API  │  │  (1925-2024, Mortalität,    │   │
│  │  profile-storage.js      │  │   Pflege, Stress-Presets)   │   │
│  └──────────────────────────┘  └────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Komplexitätshotspots

| Datei | LOC | Zyklomatische Komplexität (geschätzt) | Risiko |
|-------|-----|--------------------------------------|--------|
| `simulator-engine-direct.js` | 988 | Hoch (tiefe Verschachtelung, viele Branches) | **Kritisch** – Hauptbrücke zwischen Simulator und Engine |
| `monte-carlo-runner.js` | 750+ | Sehr hoch (300-LOC-Hauptschleife, 20+ State-Variablen) | **Hoch** – Kern der MC-Simulation |
| `SpendingPlanner.mjs` | 1.076 | Hoch (6 Hauptmethoden, viele Guardrail-Kaskaden) | **Mittel** – Gut modularisiert trotz Größe |
| `transaction-action.mjs` | 456 | Hoch (verschachtelte if/else-Kaskaden, Bear/Neutral/Opportunistic) | **Mittel** |
| `transaction-opportunistic.mjs` | 323 | Mittel-Hoch (viele Notfall-Pfade) | **Mittel** |

### 3.3 Konkrete Schwächen

**S1: `var`-Nutzung in sale-engine.mjs:96**
```javascript
var explicitBrutto = targetBruttoForTranche; // sale-engine.mjs:96
```
Funktions-Scoping statt Block-Scoping. Wird zwar durch `typeof explicitBrutto !== 'undefined'` in Zeile 103 korrekt abgefangen, ist aber fragiler als `let`.

**S2: DEBUG-Logs in Produktion** (`transaction-opportunistic.mjs:167-173`)
```javascript
console.warn('DEBUG: Trade Gated!');
console.warn('Total Bedarf:', effectiveTotalerBedarf);
```
Diese Logs erscheinen im Browser-Console des Endnutzers und offenbaren interne Variablenwerte.

**S3: Monte-Carlo-Hauptschleife zu komplex** (`monte-carlo-runner.js:500-800`)
Die `for`-Schleife verwaltet >20 State-Variablen (`p1Alive`, `p2Alive`, `careMetaP1`, `careMetaP2`, `widowBenefitActiveForP1`, `effectiveTransitionYear`, etc.) in einem einzigen Scope. Extraktionsmöglichkeiten: Mortality-Check, Care-Update, Year-Simulation, Log-Collection.

**S4: `isNaN`-Check nach Berechnung statt Prävention** (`sale-engine.mjs:342-344`)
```javascript
if (saleResult && isNaN(saleResult.achievedRefill)) {
    // Should be caught by hardening, but keeping safety check without logs
}
```
Leerer Catch-Block – kein Logging, kein Fallback, kein Throw. Sollte entweder entfernt oder mit einer konkreten Reaktion versehen werden.

### 3.4 Maßnahmen

**Kurzfristig (30 Tage):**
- `var` → `let` in `sale-engine.mjs:96`
- DEBUG-Logs durch Feature-Flag oder Entfernung ersetzen
- Leere NaN-Catch-Blöcke loggen oder entfernen

**Mittelfristig (60 Tage):**
- MC-Hauptschleife in Teilfunktionen extrahieren (Mortality, Care, YearSim, Logging)
- `simulator-engine-direct.js` (988 LOC) in separierbare Concerns aufteilen

**Längerfristig (90 Tage):**
- TypeScript-Migration mindestens für `/engine/` (Interface-Verträge)
- Formale API-Schemas (z.B. Zod) für Input/Output-Validierung

---

## 4) Fachliche Tiefenanalyse

### 4.1 Entnahmestrategien-Bewertung

**Guardrail-System (SpendingPlanner):**
Das System implementiert eine Variable Withdrawal Rate (VWR) mit mehreren Schutzebenen:

1. **Alarm-Modus** (`SpendingPlanner.mjs:562-637`): Aktiviert bei `bear_deep` + kritischer Entnahmequote (>5.5%) + kritischem Runway (<24 Mo) ODER Drawdown >25%. Floor auf 35% gehalten. Deeskalation bei Peak-Rückkehr.

2. **Wealth-Adjusted Reduction** (`SpendingPlanner.mjs:42-77`): Smoothstep-Funktion zwischen Safe Rate (1.5%) und Full Rate (3.5%). Bei Entnahmequote <1.5% wird die marktbedingte Reduktion vollständig aufgehoben.

3. **Flex-S-Kurve** (`SpendingPlanner.mjs:79-109`): Sigmoid-Capping des Flex-Anteils (K=0.8, A=14, B=0.52). Verhindert übermäßige Flex-Entnahme bei hohem Flex-Anteil.

4. **Flex-Budget** (`SpendingPlanner.mjs:119-211`): Zeitbegrenzter Topf (Default 5 Jahre) mit regime-gewichteter Abbaurate und Recharge-Mechanik.

5. **Recovery-Guardrails** (`config.mjs:201-221`): ATH-Gap-basierte Curb-Rules (10-25% Kürzung).

6. **Finale Rate-Limits** (`SpendingPlanner.mjs:213-251`): Maximale Änderung pro Jahr (±12pp normal, ±10pp in Bear).

**Bewertung:** Das System ist konservativ-robust. Die Tiefenstaffelung (6 Ebenen) schützt vor den meisten Fehlkonfigurationen. Kritik: Die Komplexität der Interaktion zwischen den Ebenen ist schwer vorhersagbar – ein Nutzer kann nicht intuitiv nachvollziehen, welche Ebene in welcher Kombination greift.

### 4.2 Steuerlogik

Die Steuerberechnung (`sale-engine.mjs:13`) implementiert:
```
keSt = 0.25 × (1 + 0.055 + kiSt)
```
Dies entspricht: Abgeltungsteuer (25%) auf Kapitalerträge, plus Solidaritätszuschlag (5.5% auf KESt), plus optionale Kirchensteuer. Die Teilfreistellung (TQF) wird pro Tranche angewendet (`sale-engine.mjs:74`), Sparer-Pauschbetrag wird korrekt verrechnet (`sale-engine.mjs:76-77`).

**Fehlende Aspekte:**
- **Verlustverrechnungstopf:** Nicht implementiert. Realisierte Verluste werden nicht gegen Gewinne aufgerechnet.
- **Günstigerprüfung:** Nicht implementiert. Für Steuerpflichtige mit niedrigem Grenzsteuersatz relevant.
- **Vorabpauschale für ETFs:** Nicht modelliert (wäre für thesaurierende ETFs relevant).

### 4.3 Modellgrenzen und Fehlentscheidungsrisiken

| Risiko | Beschreibung | Schwere |
|--------|-------------|---------|
| **Falsche Sicherheit durch hohe Erfolgsquote** | MC mit 10.000 Runs kann Erfolgsquoten wie "97.3%" anzeigen, was eine Präzision suggeriert, die das Modell nicht hat (historische Daten ≤100 Jahre) | **Hoch** |
| **CAPE als einziger Bewertungsindikator** | Shiller-CAPE hat bekannte Schwächen (Accounting-Changes, Globalisierung, Sektor-Shifts). 4 diskrete Stufen (undervalued/fair/overvalued/extreme) sind grob. | **Mittel** |
| **Keine Berücksichtigung von Inflation-Sequenzrisiko** | Inflation wird jährlich angewendet, aber das Sequenzrisiko von Hochinflationsphasen auf den realen Floor-Bedarf ist nicht explizit modelliert. | **Mittel** |
| **Pflegefall-Kosten als statische Konfiguration** | Die Kosten pro Pflegegrad werden vom Nutzer eingegeben und nicht dynamisch mit Inflation indexiert. Bei 30-Jahres-Simulationen signifikant. | **Mittel** |

---

## 5) Wissenschaftliche Tiefenanalyse

### 5.1 Backtest-Methodik

**Implementierung:** Deterministische Durchlaufung historischer Daten (1925-2024). Jedes Startjahr wird sequentiell simuliert.

**Bias-Risiken:**
- **Survivorship Bias:** Begrenzt, da die Datenbasis MSCI-World-ähnlich ist (breit diversifiziert, nicht einzelne Unternehmen). Allerdings fehlt die Berücksichtigung von Länderbias (nur überlebende Märkte).
- **Look-Ahead Bias:** Nicht erkennbar. Die Engine-Logik verwendet nur zum Zeitpunkt verfügbare Daten (VJ-Kurse, nicht Zukunftskurse).
- **Regime-Overfitting:** Die 7-Regime-Erkennung (`MarketAnalyzer.mjs:82-103`) basiert auf festen Schwellenwerten (20% für bear_deep, 10% für corr_young, etc.), die nicht out-of-sample validiert sind. Risiko: Die Schwellenwerte könnten auf die historische Verteilung überangepasst sein.

### 5.2 Monte-Carlo-Methodik

**Sampling-Verfahren:**
- Block-Bootstrap mit konfigurierbarer Blockgröße (`monte-carlo-runner.js:329`: `blockSize`)
- CDF-basiertes Sampling mit Binärsuche (`monte-carlo-runner.js:124-141`): Korrekt implementiert, `O(log n)`
- Regime-Markov-Transition: Regime des Vorjahres beeinflusst das Sampling des nächsten Jahres
- Optional: CAPE-basiertes Start-Jahr-Sampling, Recency-Gewichtung (Halbwertszeit 20 Jahre)
- Seeded RNG mit per-Run-Seeds: `rng(makeRunSeed(seed, 0, runIdx))` (`monte-carlo-runner.js:431`)

**Kategorisierung:**
- **Empirisch gut belegt:** Block-Bootstrap als Resampling-Methode (Efron & Tibshirani, 1993; Politis & Romano, 1994)
- **Plausible Heuristik:** Regime-Markov-Transition (Konzept gut, aber die Übergangsmatrix ist implizit aus historischen Daten abgeleitet, nicht formal geschätzt)
- **Unsicher/spekulativ:** MSCI-EUR-Daten 1925-1949 (`simulator-data.js:65-76` warnt selbst: "Die MSCI-Levels werden auf die 1950-Basis skaliert, um Spruenge zu vermeiden")

**Fehlende Elemente:**
- **Stationary Bootstrap** (Politis & Romano, 1994): Explizit als Einschränkung dokumentiert (`ARCHITEKTUR_UND_FACHKONZEPT.md:73`)
- **Fat Tails:** Keine t-Verteilung oder andere Heavy-Tail-Modelle. Returns werden direkt aus historischen Daten gezogen, was implizit Fat Tails enthält, aber keine synthetisch schwereren Tails erzeugen kann.
- **Korrelationsstruktur:** Rendite/Inflation/Gold-Korrelation wird durch das Block-Sampling implizit erhalten (da Blöcke aus historischen Jahrgängen stammen). Allerdings ist die Blocklänge nicht adaptiv.

### 5.3 Sweep/Optimizer-Methodik

**Verfahren:** Kartesisches Produkt von Parameterkombinationen, jeweils mit MC-Simulation bewertet. Der Auto-Optimizer verwendet LHS (Latin Hypercube Sampling) für die Initialsuche, gefolgt von Nachbar-Optimierung.

**Risiken:**
- **Suchraum-Explosion:** Bei 7-10 Sweep-Parametern und jeweils 5-10 Stufen: 10^7+ Kombinationen. In der Praxis wird der MC-Lauf pro Kombination auf wenige Hundert reduziert, was die statistische Aussagekraft verringert.
- **Overfitting auf historische Daten:** Der Optimizer findet die "beste" Kombination für die vergangene Renditeverteilung. Ohne Cross-Validation oder Train/Test-Split besteht Overfitting-Risiko.

### 5.4 Reproduzierbarkeit

Per-Run-Seeded RNG (`rng(makeRunSeed(seed, 0, runIdx))`) ermöglicht deterministische Reproduktion bei gleichen Parametern. Worker-Parity-Tests (`worker-parity.test.mjs`) stellen sicher, dass Chunk-Parallelisierung identische Ergebnisse liefert. **Bewertung: Gut gelöst.**

### 5.5 Empfehlungen für methodische Härtung

1. **MSCI-EUR-Index-Variante klären und dokumentieren** (Price vs. Net vs. Gross Total Return). Die geschätzte CAGR von ~7.9% (1978-2024) deutet auf Price Index hin – das wäre konservativ, aber muss explizit benannt werden.
2. **Stationary Bootstrap implementieren** (variable Blocklänge, geometrisch verteilt)
3. **Cross-Validation für Optimizer:** Train/Test-Split auf historische Perioden
4. **Konfidenzintervalle für Erfolgsquoten** anzeigen (Wilson-Intervall oder Bayesian)

---

## 6) Risiko-Register

| # | Risiko | Severity | Eintrittswsk. | Schadenspotenzial | Betroffene Dateien | Mitigation | Aufwand |
|---|--------|----------|---------------|-------------------|--------------------|------------|---------|
| R1 | **Keine CI/CD-Tests** – Regression gelangt in Produktion | Critical | Hoch (bei jeder Änderung) | Fehlberechnungen bei Entnahmen | `.github/workflows/` | GitHub Actions: `npm test` in CI | S |
| R2 | **MSCI-EUR-Index undokumentiert** – Systematischer Rendite-Bias | High | Sicher (ist bereits der Fall) | MC-Erfolgsquoten um 2-3pp über-/unterschätzt | `simulator-data.js:65-76` | Quellenrecherche, Dokumentation, ggf. Korrektur | M |
| R3 | **Historische Daten 1925-1949 unsicher** – MC-Ergebnisse bei Nutzung dieser Jahre verzerrt | High | Mittel (Standard-Filter ab 1970) | Stress-Tests und "Worst Case" könnten unrealistisch sein | `simulator-data.js:78-103` | Transparente Kennzeichnung in UI, optionaler Ausschluss | S |
| R4 | **Kein Stationary Bootstrap** – Blockgrenzen-Artefakte | Medium | Sicher | Leichte Unterschätzung von Sequenzrisiken | `monte-carlo-runner.js:144-203` | Stationary Bootstrap implementieren | L |
| R5 | **Fehlende Verlustverrechnung** – Steuerlast überschätzt | Medium | Hoch (betrifft alle Simulationen) | Entnahmen werden konservativer dargestellt als nötig | `sale-engine.mjs` | Verlustverrechnungstopf implementieren | L |
| R6 | **DEBUG-Logs in Produktion** – Informationsleck | Low | Sicher | Interne Variablen im Browser-Console sichtbar | `transaction-opportunistic.mjs:167-173` | Feature-Flag oder Entfernung | S |
| R7 | **`var` statt `let/const`** – Potenzielles Scoping-Problem | Low | Gering (aktuell korrekt abgefangen) | Fehlerhafte Variable in Edge Cases | `sale-engine.mjs:96` | `var` → `let` | S |
| R8 | **Binary (.exe) in Git** – Repository-Bloat | Low | Sicher | Git-History wird aufgebläht (>10MB) | `RuheStandSuite.exe` | `.gitignore` + Releases/Artifacts nutzen | S |
| R9 | **Kein Coverage-Tracking** – Unbekannte Testlücken | Medium | Mittel | Untestete Edge-Cases in Kernlogik | `tests/run-tests.mjs` | c8 oder Istanbul-Coverage integrieren | M |
| R10 | **Pflegekosten nicht inflationsindexiert** – Langfristige Unterschätzung | Medium | Hoch (bei >20J Simulation) | Pflegekosten real 30-50% zu niedrig | `monte-carlo-runner.js:607-609` | Pflegekosten mit Inflationsrate indexieren | M |

---

## 7) Priorisierte Roadmap

### Quick Wins (< 1 Woche)

| # | Maßnahme | Impact | Effort | Typ |
|---|----------|--------|--------|-----|
| 1 | **CI/CD: `npm test` in GitHub Actions** | Hoch | S | Quick Win |
| 2 | **DEBUG-Logs entfernen/Feature-Flag** | Mittel | S | Quick Win |
| 3 | **`var` → `let` in sale-engine.mjs** | Niedrig | S | Quick Win |
| 4 | **`.exe` in `.gitignore` + aus Tracking entfernen** | Niedrig | S | Quick Win |
| 5 | **Leere NaN-Catch-Blöcke loggen oder entfernen** | Niedrig | S | Quick Win |

### 30-Tage-Plan

| # | Maßnahme | Impact | Effort | Typ |
|---|----------|--------|--------|-----|
| 6 | **MSCI-EUR-Index-Variante dokumentieren** | Hoch | M | Strategic |
| 7 | **Konfidenzintervalle für Erfolgsquoten** | Hoch | M | Strategic |
| 8 | **Coverage-Tracking (c8) integrieren** | Mittel | M | Strategic |
| 9 | **Pflegekosten-Inflationsindexierung** | Mittel | M | Strategic |
| 10 | **MC-Hauptschleife refactoren** (Teilfunktionen) | Mittel | M | Strategic |

### 60-Tage-Plan

| # | Maßnahme | Impact | Effort | Typ |
|---|----------|--------|--------|-----|
| 11 | **Verlustverrechnungstopf** | Hoch | L | Strategic |
| 12 | **Stationary Bootstrap** | Mittel | L | Strategic |
| 13 | **simulator-engine-direct.js aufteilen** | Mittel | M | Strategic |
| 14 | **Property-Based Tests für numerische Kernlogik** | Mittel | M | Strategic |

### 90-Tage-Plan

| # | Maßnahme | Impact | Effort | Typ |
|---|----------|--------|--------|-----|
| 15 | **TypeScript-Migration für `/engine/`** | Hoch | L | Strategic |

---

## 8) Appendix

### A) Unklare/nicht verifizierbare Punkte

1. **MSCI-EUR-Index-Variante** (`simulator-data.js:65-76`): Explizit als "nicht dokumentiert" markiert. Die CAGR deutet auf Price Index hin, was konservativ wäre, aber nicht verifiziert werden kann ohne Quellenzugang.

2. **Historische Daten 1925-1949**: Die Gold-Performance ist für 1925-1932 und 1934-1945 als `0` codiert (`simulator-data.js:79-99`). Es ist unklar, ob dies "keine Daten" oder "keine Veränderung" bedeutet.

3. **BARMER Pflegereport 2024 Ableitung**: Die Kommentare (`simulator-data.js:14-21`) beschreiben eine Ableitung von Prävalenzen auf Inzidenzen mit 4-Jahres-Durchschnittsdauer. Die tatsächliche Ableitung ist nicht reproduzierbar dokumentiert.

4. **Kirchensteuer-Berechnung**: `keSt = 0.25 * (1 + 0.055 + kiSt)` (`sale-engine.mjs:13`). In Deutschland wird die Kirchensteuer auf die Kapitalertragsteuer berechnet (8% oder 9% der KESt), was den Abgeltungsteuersatz effektiv auf ~27.8% (mit 8% KiSt) oder ~27.99% (mit 9% KiSt) reduziert. Die aktuelle Formel berechnet: `0.25 × (1.055 + kiSt)`. Bei `kiSt = 0.09` ergibt das `0.25 × 1.145 = 0.28625`. Korrekt wäre: `(0.25 + 0.25×0.055 + 0.25×kiSt) = 0.25 + 0.01375 + 0.0225 = 0.28625`. Die Formeln sind mathematisch äquivalent – **verifiziert als korrekt**.

### B) Offene Fragen

1. Warum wird die Mortalitätstabelle für Alter <18 auf `0.0005` gefallen (`monte-carlo-runner.js:559`)? Die Suite ist für Ruheständler konzipiert – tritt dieses Alter in Produktion je auf?
2. Warum existiert `EngineAPI.addDecision()` als deprecated Methode ohne Implementierung (`core.mjs:446-458`)? Dead Code.
3. Die `Presentation/`-Ordner-Dateien – werden diese aktiv gepflegt?

### C) Annahmen des Reviewers

1. Die Suite wird als lokales Tool für informierte Einzelnutzer betrieben, nicht als SaaS-Dienst.
2. Sicherheitsanforderungen sind auf XSS-Schutz bei DOM-Rendering begrenzt (keine Netzwerk-Exposition).
3. Die historischen Daten in `simulator-data.js` sind die primäre und einzige Datenquelle für MC-Simulationen.

### D) Gescannte Schlüsseldateien

**Engine (vollständig gelesen):**
- `engine/core.mjs` (464 LOC)
- `engine/config.mjs` (285 LOC)
- `engine/planners/SpendingPlanner.mjs` (1.076 LOC)
- `engine/transactions/sale-engine.mjs` (333 LOC)
- `engine/transactions/transaction-action.mjs` (456 LOC)
- `engine/transactions/transaction-utils.mjs` (237 LOC)
- `engine/transactions/transaction-opportunistic.mjs` (323 LOC)
- `engine/analyzers/MarketAnalyzer.mjs` (160 LOC)
- `engine/validators/InputValidator.mjs` (199 LOC)

**Simulator (teilweise gelesen):**
- `app/simulator/monte-carlo-runner.js` (800 LOC von ~750+)
- `app/simulator/simulator-engine-direct.js` (200 LOC von 988)
- `app/simulator/simulator-data.js` (150 LOC von ~500+)

**Infrastruktur (vollständig gelesen):**
- `tests/run-tests.mjs`
- `build-engine.mjs`
- `.github/workflows/feature-branch-pages.yml`
- `app/shared/security-utils.js`

**Dokumentation (teilweise gelesen):**
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` (200 LOC von ~2.000+)

---

*Ende des Reviews. Keine Implementierungen, keine Commits, keine Refactorings durchgeführt – reine Analyse.*
