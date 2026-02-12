# Implementierungsplan: Dynamische Flex-Entnahme (VPW + Sterbetafeln + Robustheitsleitplanken)

## Kernidee

Die manuelle `flexBedarf`-Eingabe wird durch eine dynamisch berechnete Flex-Komponente ersetzt, basierend auf **VPW (Variable Percentage Withdrawal)**. VPW berechnet aus Gesamtvermögen, Restlaufzeit und erwarteter Realrendite den maximal nachhaltigen Entnahmebetrag. Nach Abzug des Floor ergibt sich die dynamische Flex.

```
vpwRate  = r / (1 - (1+r)^(-n))           // Annuitätenfaktor
vpwTotal = Gesamtvermögen × vpwRate        // Nachhaltige Gesamtentnahme
Flex     = max(0, vpwTotal - Floor_netto)  // Rest nach Floor
```

Das gesamte Guardrail-System (Alarm, Smoothing, Regime-Erkennung, Recovery-Caps,
Wealth-Adjusted Reduction, Flex-Budget-Cap) bleibt vollständig erhalten und wirkt
weiterhin auf die FlexRate (0-100%).

```
Entnahme = Floor(fix, inflationsbereinigt)
         + Flex(VPW-dynamisch) × FlexRate%(Guardrails)
```

---

## Optionen-Übersicht

### Option A: RMD (Vermögen / Restlebenserwartung)

- **Formel:** `Flex = max(0, Depotwert / LE(Alter) - Floor)`
- **Horizont:** Aktuarisch aus Sterbetafeln (Single/Joint/Konservativ)
- **Rendite:** Keine Renditeerwartung eingepreist
- **Architektur:** App-Layer (`simulator-engine-direct.js`), Engine unverändert
- **Features:** Joint Life für Ehepaare, Konservativ-Aufschlag, Go-Go-Multiplikator
- **Nachteil:** Frühphase zu konservativ ("knauserig") — 5% statt realitätsnäher 6-7%

### Option B: VPW (Variable Percentage Withdrawal)

- **Formel:** `Flex = max(0, Vermögen × r/(1-(1+r)^-n) - Floor)`
- **Horizont:** Fixer Planungshorizont (z.B. "plane bis 95")
- **Rendite:** CAPE-basierte erwartete Realrendite, gewichtet nach Ziel-Allokation
- **Architektur:** Engine-Layer (`engine/core.mjs`), beide Apps profitieren
- **Features:** Antizyklisch (CAPE), renditeaware, natürliche Anpassung
- **Nachteil:** Fixer Horizont ignoriert aktuarische Realität und Geschlecht

### Option C: Beides kombiniert (Empfehlung) ★

VPW-Formel (renditeaware) **+** aktuarischer Horizont aus Sterbetafeln **+** RMD-Features.

- **Formel:** `Flex = max(0, Vermögen × r/(1-(1+r)^-n) - Floor)`
- **Horizont:** `n` aus Sterbetafeln, bevorzugt als **Langlebigkeits-Quantil** (z.B. p85/p90) statt reinem Erwartungswert
- **Rendite:** CAPE-basierte erwartete Realrendite (wie Option B)
- **Features:** Joint Life, Konservativ-Aufschlag (+X Jahre), Go-Go-Multiplikator
- **Architektur:** VPW-Formel in Engine, Horizont-Berechnung in App-Layer → Engine bekommt `horizonYears`

| | Option A (RMD) | Option B (VPW) | **Option C (Kombiniert)** |
|---|---|---|---|
| Formel | V / n | V × r/(1-(1+r)^-n) | V × r/(1-(1+r)^-n) |
| Horizont | Sterbetafel (aktuarisch) | Fix (z.B. 95) | **Sterbetafel (aktuarisch)** |
| Rendite | Keine (r=0) | CAPE + Allokation | **CAPE + Allokation** |
| Alter 65, r=3% | ~5.0% (bei n=20) | ~6.7% (bei n=30) | **Bandbreite** je nach `n`-Methode (Mean vs. p85/p90) |
| Joint Life | Ja | Nein | **Ja** |
| Go-Go | Ja | Nein | **Ja** |
| Konservativ | +X Jahre | - | **+X Jahre** |
| Engine-Changes | Keine | Ja | Ja |
| Antizyklisch | Nein | Ja (CAPE) | **Ja (CAPE)** |

**Warum Option C die beste Basis ist (mit Leitplanken):**
1. **Aktuarisch fundiert**: `n` kommt aus Sterbetafeln statt Wunschalter.
2. **Langlebigkeitsrobust**: p85/p90-Horizont oder expliziter Zuschlag reduziert Unterdeckungsrisiko bei langen Lebensdauern.
3. **Renditeaware, aber kontrolliert**: CAPE-Input wird geglättet und geclampt, um sprunghafte VPW-Raten zu dämpfen.
4. **Paaradaptiv**: Joint Life verlängert den Horizont und schützt den Überlebenden.
5. **Kompatibel mit Guardrails**: Bestehende Sicherheitsmechanik bleibt intakt.

### Warum VPW statt RMD

| | RMD (Vermögen/LE) | VPW (mit Renditeerwartung) |
|---|---|---|
| Formel | V / n | V × r/(1-(1+r)^-n) |
| Bei r=0 | 5.0% (Alter 65, n=20) | 5.0% (identisch, Fallback) |
| Bei r=3% | 5.0% | **6.7%** (realitätsnäher) |
| Frühphase | Konservativ ("knauserig") | Angemessen |
| Parameter | Keiner | r aus Asset-Allokation (automatisch) |

VPW preist die erwartete Portfolio-Rendite ein. Das kann gegenüber reinem RMD in der
Frühphase höhere Entnahmen erlauben, darf aber nicht als garantiert "besser" verstanden
werden; die Robustheit hängt von Horizont-Definition und Rendite-Dämpfung ab.

---

## Architektur-Entscheidung (Option C)

**Zwei Ebenen: Horizont-Berechnung im App-Layer, VPW-Formel in der Engine.**

```
App-Layer (Simulator/Balance)                    Engine-Layer (core.mjs)
┌─────────────────────────────┐                 ┌──────────────────────────┐
│ Sterbetafeln (MORTALITY_TABLE)│                │ VPW-Formel:              │
│ → Single/Joint LE           │  horizonYears   │   vpwRate(r, n)          │
│ → + konservativPlus         │ ──────────────→ │   vpwTotal = V × rate    │
│ → Go-Go-Multiplikator       │  goGoMultiplier │   flex = vpwTotal - floor│
│                             │ ──────────────→ │   × goGoMultiplier       │
└─────────────────────────────┘                 └──────────────────────────┘
```

**Warum diese Aufteilung:**
- **Sterbetafeln im App-Layer**: `MORTALITY_TABLE` (~50 Einträge pro Geschlecht) lebt bereits in `simulator-data.js`. In der Balance-App wird sie importiert. Engine bleibt schlank und demografiefrei.
- **VPW-Formel in der Engine**: core.mjs macht bereits Input-Preprocessing (Renten-Nettierung). VPW ersetzt `inflatedBedarf.flex` – genau dort, wo der Wert gesetzt wird.
- SpendingPlanner bleibt **unverändert** – er sieht den dynamischen Flex wie normalen `flexBedarf`
- Beide Apps (Balance + Simulator) profitieren über einen einzigen Eingriffspunkt
- `dynamicFlex: false` (Default) → exakt das bisherige Verhalten, volle Abwärtskompatibilität

**Engine-Input-Kontrakt:**
Die Engine erhält `horizonYears` (Zahl, z.B. 21) statt `planungshorizont` (Alter, z.B. 95).
Der App-Layer berechnet `horizonYears` aus Sterbetafeln und ist verantwortlich für:
- Wahl der Tabelle (Single/Joint)
- Wahl der Methode (`mean` oder `survival_quantile`)
- Konservativ-Aufschlag (+X Jahre)
- Min/Max-Clamping

Die Engine ist verantwortlich für:
- VPW-Rate aus `horizonYears` + erwarteter Realrendite
- Realrendite-Dämpfung (Smoothing) und Min/Max-Clamp
- Go-Go-Multiplikator auf `vpwTotal`
- Diagnostics

Zusätzliche Input-Felder (nur wenn `dynamicFlex=true`):
- `horizonMethod`: `'mean' | 'survival_quantile'` (Default: `survival_quantile`)
- `survivalQuantile`: z.B. `0.85` (Default), zulässig `0.5..0.99`

### Inflation-Frage (geklärt)

`inflatedBedarf.floor` und `.flex` sind in core.mjs bereits **nominal** (aktuelles Jahr).
Im Simulator werden `baseFloor`/`baseFlex` jedes Jahr mit Inflation fortgeschrieben
(`naechsterBaseFlex = baseFlex * (1 + inflation)`, Zeile 214 in simulator-engine-direct.js).
Der SpendingPlanner wendet **keine** zusätzliche Inflation auf `inflatedBedarf` an –
`cumulativeInflationFactor` wird nur für Diagnostik (realer Drawdown) verwendet.

VPW berechnet: `gesamtwert (nominal) × vpwRate(r_real, n)` → ergibt korrekte nominale Beträge.
Bei aktivem VPW wird die Simulator-seitige Inflation-Fortschreibung von `baseFlex` ignoriert
(VPW berechnet jedes Jahr frisch). **Kein Doppelzählungsproblem.**

---

## Datenfluss-Diagramm (Option C)

```
Simulator UI / Balance UI
  │
  ├─ dynamicFlex: true/false (Checkbox)
  ├─ dynamicFlexHorizont: 'single' | 'joint' | 'konservativ' (Select)
  ├─ horizonMethod: 'survival_quantile' | 'mean' (Default: survival_quantile)
  ├─ survivalQuantile: 0.85 (Default)
  ├─ konservativPlus: 5 (Jahre, Default)
  ├─ goGoJahre: 0 (Anzahl Jahre mit Bonus, Default 0 = aus)
  ├─ goGoMultiplier: 1.2 (Faktor, Default 1.0)
  ├─ startFlexBedarf: 28000 (wird bei dynamicFlex ignoriert)
  │
  ▼
simulator-portfolio-inputs.js / balance-reader.js
  │
  ▼
simulator-engine-direct.js (simulateOneYear) / balance-main.js
  │
  ├─ *** HORIZONT-BERECHNUNG (App-Layer) ***
  ├─ if (dynamicFlex):
  │   ├─ if (horizont === 'joint' && partner.aktiv):
  │   │     n = estimateJointRemainingLifeYears(g1, age1, g2, age2)
  │   ├─ else:
  │   │     n = estimateRemainingLifeYears(gender, age)
  │   ├─ if (horizont === 'konservativ'):  n += konservativPlus
  │   └─ horizonYears = clamp(n, 1, 60)
  │
  ├─ engineInput.dynamicFlex = true
  ├─ engineInput.horizonYears = 21  (berechnet, nicht fix!)
  ├─ engineInput.horizonMethod = 'survival_quantile'
  ├─ engineInput.survivalQuantile = 0.85
  ├─ engineInput.goGoActive = (yearIndex < goGoJahre)
  ├─ engineInput.goGoMultiplier = 1.2
  ├─ engineInput.capeRatio = resolvedCapeRatio
  ├─ engineInput.flexBedarf = baseFlex (wird in Engine überschrieben)
  │
  ▼
engine/core.mjs (_internal_calculateModel)
  │
  ├─ Marktanalyse → market.expectedReturnCape (4-8% je nach CAPE)
  ├─ Gesamtvermögen = Depot + Liquidität (Zeile 72, bereits vorhanden)
  │
  ├─ if (dynamicFlex && horizonYears > 0):
  │   ├─ r = gewichtete Realrendite aus targetEq + CAPE + Gold + Safe
  │   ├─ vpwRate = r / (1 - (1+r)^(-n))    [bei r≈0: 1/n]
  │   ├─ vpwTotal = gesamtwert × vpwRate
  │   ├─ if (goGoActive): vpwTotal *= goGoMultiplier
  │   └─ inflatedBedarf.flex = max(0, vpwTotal - inflatedBedarf.floor)
  │
  ▼
SpendingPlanner.determineSpending() ← KEINE ÄNDERUNG
  │
  ├─ Regime-Erkennung, Alarm, Guardrails
  ├─ FlexRate berechnen (0-100%) mit Smoothing
  ├─ Flex-Budget-Cap, Final-Limits
  │
  ▼
Entnahme = Floor_netto + VPW-Flex × FlexRate%
  │
  ▼
Ergebnis enthält ui.vpw = { horizonYears, vpwRate, dynamicFlex,
                            expectedRealReturn, goGoActive, horizonMode }
```

---

## Implementierungsschritte

### Schritt 1: Engine-Konfiguration erweitern

**Datei:** `engine/config.mjs`

Neuen Block `DYNAMIC_FLEX` in `SPENDING_MODEL` einfügen (nach Zeile 153, nach FLEX_RATE_FINAL_LIMITS):

```javascript
DYNAMIC_FLEX: {
    SAFE_ASSET_REAL_RETURN: 0.005,   // 0.5% reale Rendite sichere Anlagen
    GOLD_REAL_RETURN: 0.01,          // 1.0% reale Rendite Gold (konservativ)
    MIN_HORIZON_YEARS: 1,            // Mindest-Restlaufzeit
    MAX_HORIZON_YEARS: 60,           // Maximale Restlaufzeit
    DEFAULT_HORIZON_METHOD: 'survival_quantile',
    DEFAULT_SURVIVAL_QUANTILE: 0.85, // Langlebigkeits-Quantil als robuster Default
    MIN_SURVIVAL_QUANTILE: 0.5,
    MAX_SURVIVAL_QUANTILE: 0.99,
    FALLBACK_REAL_RETURN: 0.03,      // 3% real wenn keine CAPE-Daten
    MIN_REAL_RETURN: 0.00,           // Keine negativen VPW-Realrenditen in Phase 1
    MAX_REAL_RETURN: 0.05,           // Deckel gegen zu aggressive Entnahmen
    EXPECTED_RETURN_SMOOTHING_ALPHA: 0.35, // Dämpft CAPE-Sprünge zwischen Jahren
    MAX_KONSERVATIV_PLUS_YEARS: 15,
    MAX_GO_GO_MULTIPLIER: 1.5        // Maximaler Go-Go-Multiplikator
}
```

---

### Schritt 2: Input-Validierung erweitern

**Datei:** `engine/validators/InputValidator.mjs`

Nach dem `flexBudgetYears`-Block (Zeile 132) einfügen:

```javascript
// Dynamische Flex (VPW + Sterbetafeln, Option C)
if (input.dynamicFlex) {
    checkFiniteRange(
        input.horizonYears, 1, 60,
        'horizonYears',
        'Horizont muss zwischen 1 und 60 Jahren liegen.'
    );
    if (input.horizonMethod != null) {
        const okMethod = input.horizonMethod === 'mean' || input.horizonMethod === 'survival_quantile';
        check(!okMethod, 'horizonMethod', "horizonMethod muss 'mean' oder 'survival_quantile' sein.");
    }
    if ((input.horizonMethod || 'survival_quantile') === 'survival_quantile') {
        checkFiniteRange(
            input.survivalQuantile, 0.5, 0.99,
            'survivalQuantile',
            'survivalQuantile muss zwischen 0.5 und 0.99 liegen.'
        );
    }
    if (input.goGoActive) {
        checkFiniteRange(
            input.goGoMultiplier, 1.0, CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.MAX_GO_GO_MULTIPLIER,
            'goGoMultiplier',
            `Go-Go-Multiplikator muss zwischen 1.0 und ${CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.MAX_GO_GO_MULTIPLIER} liegen.`
        );
    }
}
```

`dynamicFlex` ist boolean, `horizonYears` ist die vom App-Layer berechnete Restlaufzeit (Zahl, z.B. 21).

---

### Schritt 3: VPW-Berechnung in Engine Core

**Datei:** `engine/core.mjs`

**3a. Zwei Hilfsfunktionen VOR `_internal_calculateModel` (vor Zeile 39):**

```javascript
/**
 * VPW-Rate (Variable Percentage Withdrawal).
 * Bei r≈0 Fallback auf 1/n (= RMD).
 * @param {number} realReturn - Erwartete Realrendite (z.B. 0.03)
 * @param {number} horizonYears - Restlaufzeit in Jahren (≥ 1)
 * @returns {number} Entnahmerate (z.B. 0.067 für 6.7%)
 */
function _calculateVpwRate(realReturn, horizonYears) {
    const n = Math.max(1, horizonYears);
    if (Math.abs(realReturn) < 0.001) return 1 / n;
    const r = realReturn;
    return r / (1 - Math.pow(1 + r, -n));
}

/**
 * Erwartete Realrendite aus Ziel-Allokation + CAPE-Bewertung.
 * Nutzt targetEq (nicht aktuelle Allokation) für Stabilität.
 */
function _calculateExpectedRealReturn(params) {
    const cfg = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX;
    const { gesamtwert, expectedReturnCape, inflation, targetEq, goldAktiv, goldZielProzent, lastExpectedRealReturn } = params;
    if (!gesamtwert || gesamtwert <= 0) return cfg.FALLBACK_REAL_RETURN;

    const equityNominal = (typeof expectedReturnCape === 'number' && isFinite(expectedReturnCape))
        ? expectedReturnCape : (cfg.FALLBACK_REAL_RETURN + inflation / 100);
    const inflRate = (typeof inflation === 'number' && isFinite(inflation)) ? inflation / 100 : 0.02;

    const eqPct = (typeof targetEq === 'number' && isFinite(targetEq)) ? targetEq / 100 : 0.60;
    const goldPct = (goldAktiv && typeof goldZielProzent === 'number') ? goldZielProzent / 100 : 0;
    const safePct = Math.max(0, 1 - eqPct - goldPct);

    const raw = eqPct * (equityNominal - inflRate) + goldPct * cfg.GOLD_REAL_RETURN + safePct * cfg.SAFE_ASSET_REAL_RETURN;
    const clamped = Math.max(cfg.MIN_REAL_RETURN, Math.min(cfg.MAX_REAL_RETURN, raw));
    const base = Number.isFinite(lastExpectedRealReturn) ? lastExpectedRealReturn : clamped;
    return base + cfg.EXPECTED_RETURN_SMOOTHING_ALPHA * (clamped - base);
}
```

**3b. VPW-Override in `_internal_calculateModel`:**

Einfügen ZWISCHEN der bestehenden `inflatedBedarf`-Berechnung (Zeilen 90-97) und der
`neuerBedarf`-Berechnung (Zeile 98). Die bestehende Zeile 98 (`const neuerBedarf = ...`)
wird in den neuen Block integriert:

```javascript
    // === VPW DYNAMIC FLEX (Option C: VPW + Sterbetafeln) ===
    let vpwDiagnostics = null;
    if (input.dynamicFlex && input.horizonYears > 0) {
        const horizonYears = Math.max(
            CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.MIN_HORIZON_YEARS,
            Math.min(CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.MAX_HORIZON_YEARS, input.horizonYears)
        );
        const expectedRealReturn = _calculateExpectedRealReturn({
            gesamtwert, expectedReturnCape: market.expectedReturnCape,
            inflation: input.inflation, targetEq: input.targetEq,
            goldAktiv: input.goldAktiv, goldZielProzent: input.goldZielProzent,
            lastExpectedRealReturn: lastState?.vpwExpectedRealReturn
        });
        const vpwRate = _calculateVpwRate(expectedRealReturn, horizonYears);
        let vpwTotal = gesamtwert * vpwRate;

        // Go-Go-Multiplikator (erste N Jahre → höhere Entnahme in aktiven Jahren)
        const goGoActive = input.goGoActive || false;
        const goGoMultiplier = (goGoActive && input.goGoMultiplier > 1.0)
            ? Math.min(input.goGoMultiplier, CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.MAX_GO_GO_MULTIPLIER)
            : 1.0;
        vpwTotal *= goGoMultiplier;

        inflatedBedarf.flex = Math.max(0, vpwTotal - inflatedBedarf.floor);

        vpwDiagnostics = {
            horizonYears,
            horizonMethod: input.horizonMethod || 'survival_quantile',
            survivalQuantile: input.survivalQuantile ?? 0.85,
            expectedRealReturn: Math.round(expectedRealReturn * 10000) / 100,
            vpwRate: Math.round(vpwRate * 10000) / 100,
            vpwTotal: Math.round(vpwTotal),
            dynamicFlex: Math.round(inflatedBedarf.flex),
            gesamtwert: Math.round(gesamtwert),
            goGoActive,
            goGoMultiplier: Math.round(goGoMultiplier * 100) / 100
        };
    }
    const neuerBedarf = inflatedBedarf.floor + inflatedBedarf.flex;
```

**3c. Diagnostics im Ergebnis (Zeile 219, resultForUI):**

`vpw: vpwDiagnostics` als neues Feld in `resultForUI` einfügen.

---

### Schritt 4: Simulator-Integration

**4a. HTML-Input** (`Simulator.html`)

Im Bereich der Floor/Flex-Eingabe:

```html
<!-- Dynamische Flex (Option C: VPW + Sterbetafeln) -->
<div class="form-group">
    <label for="dynamicFlex">
        <input type="checkbox" id="dynamicFlex"> Dynamische Flex (VPW)
    </label>
    <small class="help-text">Flex wird dynamisch aus Vermögen, Lebenserwartung und
    Renditeerwartung berechnet. Manuelle Flex-Eingabe entfällt.</small>
</div>
<div id="dynamicFlexPanel" style="display:none">
    <div class="form-group">
        <label for="dynamicFlexHorizont">Horizont-Modus</label>
        <select id="dynamicFlexHorizont">
            <option value="single">Einzelperson (Sterbetafel)</option>
            <option value="joint">Ehepaar (Joint Life)</option>
            <option value="konservativ" selected>Konservativ (+5 Jahre)</option>
        </select>
    </div>
    <div class="form-group" id="konservativPlusGroup">
        <label for="konservativPlus">Konservativ-Aufschlag (Jahre)</label>
        <input type="number" id="konservativPlus" value="5" min="0" max="15">
    </div>
    <div class="form-group">
        <label for="survivalQuantile">Langlebigkeitsniveau (Quantil)</label>
        <select id="survivalQuantile">
            <option value="0.85" selected>Robust (p85)</option>
            <option value="0.90">Sehr robust (p90)</option>
            <option value="0.50">Mittelwertnah (p50)</option>
        </select>
    </div>
    <div class="form-group">
        <label for="goGoJahre">Go-Go-Phase (Jahre ab Start)</label>
        <input type="number" id="goGoJahre" value="0" min="0" max="20">
        <small class="help-text">Erhöhte Entnahme in den ersten aktiven Ruhestandsjahren (0 = deaktiviert)</small>
    </div>
    <div class="form-group" id="goGoMultiplierGroup" style="display:none">
        <label for="goGoMultiplier">Go-Go-Multiplikator</label>
        <input type="number" id="goGoMultiplier" value="1.2" min="1.0" max="1.5" step="0.05">
    </div>
</div>
```

JS: Checkbox togglet Sichtbarkeit von `dynamicFlexPanel` und disabled `startFlexBedarf`.
Horizont-Select togglet `konservativPlusGroup` (nur bei 'konservativ').
Go-Go-Jahre > 0 zeigt `goGoMultiplierGroup`.

**4b. Input-Reader** (`app/simulator/simulator-portfolio-inputs.js`)

In `getCommonInputs()` nach Zeile 115 (flexBudgetRecharge):

```javascript
dynamicFlex: document.getElementById('dynamicFlex')?.checked || false,
dynamicFlexHorizont: document.getElementById('dynamicFlexHorizont')?.value || 'konservativ',
konservativPlus: parseInt(document.getElementById('konservativPlus')?.value) || 5,
goGoJahre: parseInt(document.getElementById('goGoJahre')?.value) || 0,
goGoMultiplier: parseFloat(document.getElementById('goGoMultiplier')?.value) || 1.0,
horizonMethod: 'survival_quantile',
survivalQuantile: parseFloat(document.getElementById('survivalQuantile')?.value) || 0.85,
```

**4c. Horizont-Berechnung + Engine-Input** (`app/simulator/simulator-engine-direct.js`)

Neue Hilfsfunktion und Anpassung im `simulateOneYear`:

```javascript
import { estimateRemainingLifeYears, estimateJointRemainingLifeYears }
    from './simulator-engine-helpers.js';

/**
 * Berechnet horizonYears aus Sterbetafeln (Option C).
 * Wird pro Simulationsjahr aufgerufen.
 */
function _calculateHorizonYears(inputs, yearIndex) {
    const currentAge = inputs.startAlter + yearIndex;
    const mode = inputs.dynamicFlexHorizont || 'konservativ';
    let n;

    const quantile = Number.isFinite(inputs.survivalQuantile) ? inputs.survivalQuantile : 0.85;
    const method = inputs.horizonMethod || 'survival_quantile';

    if (mode === 'joint' && inputs.partner?.aktiv) {
        const ageP2 = (inputs.partner.startAlter || currentAge) + yearIndex;
        const p2Gender = inputs.partner.geschlecht || 'm';
        n = estimateJointRemainingLifeYears(
            inputs.geschlecht, currentAge, p2Gender, ageP2, { method, quantile }
        );
    } else {
        n = estimateRemainingLifeYears(inputs.geschlecht, currentAge, { method, quantile });
    }

    if (mode === 'konservativ') {
        n += (inputs.konservativPlus || 5);
    }

    return Math.max(1, Math.min(60, n));
}
```

Im `engineInput`-Objekt (nach Zeile 428):

```javascript
dynamicFlex: inputs.dynamicFlex || false,
horizonYears: inputs.dynamicFlex ? _calculateHorizonYears(inputs, yearIndex) : 0,
horizonMethod: inputs.horizonMethod || 'survival_quantile',
survivalQuantile: inputs.survivalQuantile || 0.85,
goGoActive: inputs.dynamicFlex && inputs.goGoJahre > 0 && yearIndex < inputs.goGoJahre,
goGoMultiplier: inputs.goGoMultiplier || 1.0,
```

`horizonYears` sinkt automatisch pro Jahr (LE wird kürzer mit steigendem Alter).
Bei Go-Go: `goGoActive` ist nur die ersten N Jahre true.

**4d. Joint-Life-Funktion exportieren** (`app/simulator/simulator-engine-helpers.js`)

Neue Funktion (nach der bestehenden `estimateRemainingLifeYears`):

```javascript
/**
 * Joint Life: Erwartete Restjahre bis der letzte von beiden stirbt.
 * P(mindestens einer lebt in Jahr t) = 1 - P(P1 tot) × P(P2 tot)
 */
export function estimateJointRemainingLifeYears(gender1, age1, gender2, age2, opts = {}) {
    const table1 = MORTALITY_TABLE[gender1] || MORTALITY_TABLE.m;
    const table2 = MORTALITY_TABLE[gender2] || MORTALITY_TABLE.m;
    let survP1 = 1, survP2 = 1;
    let expectedYears = 0;

    for (let t = 0; t < 60; t++) {
        const qx1 = table1[age1 + t] ?? 1;
        const qx2 = table2[age2 + t] ?? 1;
        const jointSurv = 1 - (1 - survP1) * (1 - survP2);
        expectedYears += jointSurv;
        survP1 *= (1 - Math.min(1, Math.max(0, qx1)));
        survP2 *= (1 - Math.min(1, Math.max(0, qx2)));
        if (jointSurv < 0.0001) break;
    }

    // Phase 1: Bei quantile/method vorerst Mean-Fallback beibehalten,
    // aber Signatur bereits vorbereitet für echte Quantil-Berechnung.
    return Math.max(1, Math.round(expectedYears));
}
```

Bestehende `estimateRemainingLifeYears` ebenfalls exportieren (aktuell nur intern).

---

### Schritt 5: Balance-App Integration

**5a. HTML** (`Balance.html`)

Analog zum Simulator: Checkbox + Horizont-Modus + Konservativ-Aufschlag + Go-Go neben `flexBedarf`.
Gleiche UI-Elemente wie in Schritt 4a, angepasst an Balance-App Formular-Stil.

**5b. Reader** (`app/balance/balance-reader.js`)

In `readAllInputs()`:

```javascript
dynamicFlex: dom.inputs['dynamicFlex']?.checked || false,
dynamicFlexHorizont: dom.inputs['dynamicFlexHorizont']?.value || 'konservativ',
konservativPlus: parseInt(dom.inputs['konservativPlus']?.value) || 5,
goGoJahre: parseInt(dom.inputs['goGoJahre']?.value) || 0,
goGoMultiplier: parseFloat(dom.inputs['goGoMultiplier']?.value) || 1.0,
horizonMethod: 'survival_quantile',
survivalQuantile: parseFloat(dom.inputs['survivalQuantile']?.value) || 0.85,
```

**5c. Horizont-Berechnung** (`app/balance/balance-main.js` oder neues Modul)

Balance-App ist Einzeljahr-Berechnung. `horizonYears` wird einmalig aus Sterbetafeln berechnet.
Wichtig: Balance hat aktuell keinen robusten Gender-/Partner-Input im Reader, daher erst Datenvertrag klären.

```javascript
import { MORTALITY_TABLE } from '../simulator/simulator-data.js';  // shared data

// Vorbedingung: Geschlecht aus Profilsync liefern (sonst definierter Fallback + UI-Hinweis)
function calculateHorizonYears(gender, currentAge, mode, konservativPlus) {
    // Sterbetafel-Berechnung (analog estimateRemainingLifeYears)
    const table = MORTALITY_TABLE[gender] || MORTALITY_TABLE.m;
    // ... (gleiche Logik wie in simulator-engine-helpers.js)
    let n = estimatedYears;
    if (mode === 'konservativ') n += konservativPlus;
    return Math.max(1, Math.min(60, n));
}
```

Alternativ: Sterbetafel-Funktion in ein shared Modul extrahieren (z.B. `app/shared/life-expectancy.js`),
das beide Apps importieren. **Entscheidung bei Implementierung.**

**5d. Renderer** (`app/balance/balance-renderer-summary.js`)

Wenn `ui.vpw` vorhanden, VPW-Info unter der monatlichen Entnahme anzeigen:
`"VPW-Flex: €X/Jahr (Rate: Y%, LE: Z J. [konservativ], exp. Rendite: W%)"`.
Bei Go-Go: zusätzlich `"Go-Go aktiv: ×1.2"` anzeigen.

---

### Schritt 6: Engine Build + Tests

```bash
npm run build:engine    # Pflicht: Engine-Module wurden geändert
npm test                # Regressionstests — alles muss bestehen (dynamicFlex default false)
```

**Neue Testdatei:** `tests/vpw-dynamic-flex.test.mjs`

| # | Testfall | Erwartung |
|---|----------|-----------|
| 1 | VPW-Rate bei r=0, n=20 | 0.05 (= 1/n, RMD-Fallback) |
| 2 | VPW-Rate bei r=3%, n=20 | ≈ 0.0672 |
| 3 | VPW-Rate bei r=5%, n=10 | ≈ 0.1295 |
| 4 | dynamicFlex=false | flexBedarf unverändert, exakt wie bisher |
| 5 | dynamicFlex=true, Vermögen 600k, Floor(netto) 6k, n aus Quantil, r aus CAPE | plausibler VPW-Flex > 0, reproduzierbar |
| 6 | Renten-Nettierung + VPW | Floor 24k - Rente 18k = netFloor 6k, VPW-Flex basiert auf 6k |
| 7 | Restlaufzeit sinkt mit Alter | `horizonYears` nimmt über Jahre ab, VPW-Rate steigt ceteris paribus |
| 8 | Bear-Market + VPW | FlexRate < 100% → tatsächliche Entnahme < VPW-Flex |
| 9 | vpwDiagnostics im Ergebnis | Bei true: alle Felder inkl. goGoActive. Bei false: null |
| 10 | Regression: alle bestehenden Tests | Bestehen unverändert |
| 11 | Joint Life Horizont | `horizonYears(joint)` >= `horizonYears(single)` bei typischem Paar |
| 12 | Konservativ-Aufschlag/Quantil | p90 bzw. +X Jahre → höhere `horizonYears` → niedrigere VPW-Rate |
| 13 | Go-Go aktiv (Jahr 0-9) | vpwTotal × 1.2, goGoActive=true in Diagnostics |
| 14 | Go-Go inaktiv (Jahr 10+) | vpwTotal × 1.0, goGoActive=false |
| 15 | Go-Go-Multiplikator geclampt | Max 1.5, Input 2.0 → wird auf 1.5 begrenzt |
| 16 | Realrendite-Clamp | unter/oberhalb Grenzen wird auf MIN/MAX gekappt |
| 17 | Realrendite-Smoothing | Return-Änderung zwischen Jahren gedämpft |
| 18 | CAPE-Feldkonsistenz | `capeRatio` wird durchgängig genutzt (Alias-Fallback getestet) |
| 19 | Balance-Gate | Ohne Gender-Datenvertrag: Dynamic Flex in Balance nicht aktiv |

---

## Dateien und Umfang

| Datei | Änderung | Zeilen |
|-------|----------|--------|
| `engine/config.mjs` | Neuer Block `DYNAMIC_FLEX` (inkl. Clamp/Smoothing/Quantil-Defaults) | ~15 |
| `engine/validators/InputValidator.mjs` | Validierung `dynamicFlex`, `horizonYears`, `goGoMultiplier`, Quantil-Felder | ~25 |
| `engine/core.mjs` | VPW-Funktionen + Override + Return-Clamp/Smoothing + Diagnostics | ~85 |
| `Simulator.html` | Checkbox + Horizont-Modus + Quantil + Go-Go + Toggle-JS | ~50 |
| `app/simulator/simulator-portfolio-inputs.js` | Felder in `getCommonInputs()` erweitert | ~8 |
| `app/simulator/simulator-engine-direct.js` | Horizont-Berechnung + EngineInput (inkl. Quantil-Meta) | ~45 |
| `app/simulator/simulator-engine-helpers.js` | Export LE + Joint-Life-Signatur (method/quantile-ready) | ~35 |
| `Balance.html` | Checkbox + Horizont-Modus + Quantil + Go-Go | ~40 |
| `app/balance/balance-reader.js` | zusätzliche DynamicFlex-Felder | ~8 |
| `app/balance/balance-main.js` (o. shared) | Horizont-Berechnung + Datenvertrags-Gate | ~30 |
| `app/balance/balance-renderer-summary.js` | VPW-Info + Go-Go-Anzeige | ~20 |
| `tests/vpw-dynamic-flex.test.mjs` | Neue Testdatei (19 Testfälle) | ~230 |
| **Gesamt** | | **~590** |

---

## Kritische Design-Entscheidungen

### 0. Aktuarischer Horizont als Quantil statt fixer Planungshorizont

Der fixe Planungshorizont (z.B. "plane bis 95") hat zwei Probleme:
- **Willkürlich**: Warum 95 und nicht 90 oder 100? Jede Wahl erzeugt bias.
- **Geschlechtsblind**: Frauen leben statistisch 4-5 Jahre länger als Männer.

Sterbetafeln lösen beides. Für Entnahmeplanung wird jedoch nicht nur der Mittelwert
(`mean`) genutzt, sondern standardmäßig ein Langlebigkeits-Quantil (`survival_quantile`,
Default p85). Damit wird das Risiko einer zu kurzen Planungsdauer reduziert.
Konservativ-Aufschlag (+X Jahre) bleibt als zusätzliche, transparente Sicherheitsmarge.

### 1. Realrendite aus `targetEq` (Ziel-Allokation), NICHT aktueller Allokation

Die aktuelle Allokation driftet mit dem Markt. Nach einem Crash ist der Aktienanteil
niedriger → niedrigere erwartete Rendite → niedrigerer VPW-Flex → doppelte Bestrafung.
`targetEq` ist stabil und reflektiert die langfristige Strategie. Bereits als Input
vorhanden und validiert (20-90%, Zeile 113-117 in InputValidator).

### 2. CAPE-basierte Aktienrendite (antizyklisch), aber geglättet/geclampt

MarketAnalyzer berechnet `expectedReturnCape` (4-8% nominal, Zeile 222-227 in config.mjs):
- Teurer Markt (CAPE 35) → 4% → niedrigerer VPW-Flex → konservativer
- Billiger Markt (CAPE 15) → 8% → höherer VPW-Flex → mutiger

Im Simulator ändert sich CAPE jedes Jahr (aus historischen Daten gesampelt).
In der Balance-App kommt der aktuelle CAPE aus dem Eingabefeld.
Damit jährliche VPW-Sprünge nicht zu groß werden, wird die Realrendite:
- auf `MIN_REAL_RETURN..MAX_REAL_RETURN` geclampt
- mit `EXPECTED_RETURN_SMOOTHING_ALPHA` zeitlich geglättet

### 3. Gesamtvermögen (Depot + Liquidität) als Basis

VPW basiert auf `gesamtwert` (core.mjs Zeile 72), nicht nur auf `depotwertGesamt`.
Die Liquidität ist Teil des finanziellen Kapitals, nicht gesperrt. Die Runway-Logik
(TransactionEngine) schützt die Mindest-Liquidität unabhängig davon.

### 4. Wechselwirkung Guardrails + VPW

VPW bestimmt die **Obergrenze** des Flex. Guardrails modifizieren die **FlexRate** (0-100%).
Bei einem Crash:
- VPW-Flex sinkt (Vermögen ist kleiner) → natürliche Anpassung
- Guardrails senken FlexRate zusätzlich → Sicherheitspuffer

Die Wealth-Adjusted Reduction (Zeile 107-110 config.mjs) feuert bei VPW seltener,
weil die Entnahmequote durch VPW natürlich bei ~1/n·(1+r) bleibt — unterhalb der
Alarm-Schwelle von 5.5%.

### 5. Flex-Budget-Cap weiterhin funktional

Der Flex-Budget-Cap (flexBudgetAnnual/Years) arbeitet auf `inflatedBedarf.flex`.
Bei VPW ist dieser Wert jährlich anders, aber der Cap funktioniert identisch:
Er begrenzt die tatsächliche Flex-Entnahme in Bärenmärkten. Bei VPW ist der
dynamische Flex in Bärenmärkten ohnehin kleiner → Cap greift seltener → erwünschtes Verhalten.

### 6. Go-Go-Multiplikator: Einfach, transparent, aber klar als Risiko-Tradeoff

Go-Go erhöht `vpwTotal` um einen Faktor (z.B. 1.2× = 20% mehr) in den ersten N Jahren.
- Kein eigenes Budget, keine separate Berechnung
- Geclampt auf MAX_GO_GO_MULTIPLIER (1.5) als Sicherheitslimit
- Engine sieht nur `goGoActive: true/false` + `goGoMultiplier: 1.2`
- App-Layer entscheidet ob Go-Go aktiv ist: `yearIndex < goGoJahre`
- Nach Ablauf der Go-Go-Phase: automatisch Faktor 1.0, kein "Knick" weil VPW ohnehin jedes Jahr neu berechnet
- UI-Hinweis: höhere Frühentnahmen können das spätere Entnahmeniveau/Erbe reduzieren

### 7. Horizont-Berechnung im App-Layer, nicht in der Engine

Die Engine bekommt `horizonYears` als fertige Zahl. Sie weiß nicht, ob dieser
Wert aus Sterbetafeln, Joint Life oder einem fixen Planungshorizont stammt.

Vorteile:
- Engine bleibt schlank (~100KB Ziel) und demografiefrei
- `MORTALITY_TABLE` (~2KB) muss nicht in den Engine-Bundle
- Testbarkeit: Engine-Tests brauchen keine Sterbetafeln, nur `horizonYears`
- Zukünftig: Andere Horizont-Quellen (z.B. individuelle LE) ohne Engine-Änderung

### 8. Feldkonsistenz CAPE (`capeRatio` vs. `marketCapeRatio`)

Die Engine/MarketAnalyzer arbeiten mit `capeRatio`. Im Simulator existiert zusätzlich
`marketCapeRatio`. Für Phase 1 gilt: vor Engine-Aufruf wird immer `capeRatio` gesetzt
(alias/fallback weiter zulässig), damit VPW und Marktdiagnostik denselben Wert nutzen.

### 9. Balance-Datenvertrag vor Feature-Freischaltung

Balance-Reader enthält aktuell kein explizites Geschlecht/Partnerprofil. Ohne klaren
Datenvertrag für `gender` (und optional Partner) darf Dynamic Flex in Balance nicht
voll freigeschaltet werden. Phase 1 enthält deshalb einen expliziten Gate:
- Wenn `gender` fehlt: Dynamic Flex in Balance deaktivieren oder mit sichtbarem Hinweis.

---

## Scope-Abgrenzung

**In Scope (Phase 1):**
- VPW-Berechnung in Engine Core (beide Apps)
- Sterbetafeln-basierter Horizont (Single/Joint/Konservativ) inkl. Methodik-Flag (`mean`/`survival_quantile`)
- Joint-Life-Funktion in simulator-engine-helpers.js
- Go-Go-Multiplikator (erste N Jahre)
- Rendite-Glättung + Min/Max-Return-Clamp für VPW
- CAPE-Feldkonsistenz (`capeRatio` als kanonisches Engine-Feld)
- Simulator UI: Checkbox + Horizont-Modus + Go-Go + Konservativ-Aufschlag
- Simulator UI: Quantil-Auswahl (z.B. p85/p90)
- Balance: nur mit geklärtem Gender-Datenvertrag freischalten
- VPW-Diagnostics in Ergebnis (inkl. Go-Go-Status)
- Tests (19 Testfälle inkl. Joint Life, Quantil/Clamp/Smoothing, Go-Go)

**Nicht in Scope (Phase 2):**
- VPW in Parameter-Sweeps (SWEEP_ALLOWED_KEYS)
- VPW im Auto-Optimizer
- Eigene Diagnose-Chips für VPW in der Balance-App
- Profilverbund mit VPW (Multi-Profil hat unterschiedliche Allokationen)
- Akkumulationsphase (VPW irrelevant während Ansparphase)
- Exakte Quantil-Lebensdauerberechnung (falls in Phase 1 nur Mean-Fallback + API-Vorbereitung)

**Nicht nötig (bereits vorhanden):**
- Smoothing → FlexRate-Smoothing im SpendingPlanner
- Floor-Protection → Engine schützt Floor automatisch
- Cap → FlexRate ist auf 100% begrenzt
- CAPE-Daten → MarketAnalyzer liefert expectedReturnCape
- Asset-Allokation → targetEq bereits als Input vorhanden
- Sterbetafeln → MORTALITY_TABLE in simulator-data.js

---

## Rechenbeispiele

Hinweis: Die folgenden Zahlen sind **illustrativ**. Exakte Werte hängen von
Horizon-Methode (Mean vs. Quantil), Clamp/Smoothing-Parametern und Rundung ab.

### Beispiel 1: Typischer deutscher Ruheständler (Single, konservativ)

Gesamtvermögen 600k, Floor 24k, Rente 18k/J, Mann 65, targetEq 60%, Modus konservativ (+5J)

```
netFloor = max(0, 24k - 18k) = 6k
LE(m,65) im Modell grob 20-21 Jahre → konservativ z.B. n = 25-26
CAPE 30 → expectedReturnCape = 5% nominal
inflation = 2.5%
r_real = 60% × (5%-2.5%) + 10% × 1% + 30% × 0.5% = 1.75%
vpwRate ≈ 4.6% bis 4.8% (je nach n)
vpwTotal ≈ 27.6k bis 28.8k
dynamicFlex ≈ 21.6k bis 22.8k
Gesamt-Entnahme grob ≈ 45.6k bis 46.8k/Jahr
```

Vergleich Option B (fixer Horizont 95): n=30 → niedrigere Rate.
Option C kann hier spürbar höhere Entnahme liefern, aber nicht als "garanterter Vorteil".

### Beispiel 2: Ehepaar mit Go-Go (Joint Life)

Gesamtvermögen 2.5 Mio, Floor 24k, Rente 18k/J, Mann 65 + Frau 63, targetEq 70%,
Joint Life, Go-Go 10 Jahre × 1.2

```
netFloor = 6k
LE_joint(m65, w63) ≈ 28 Jahre (Frau lebt statistisch länger → Joint > Single)
CAPE 30 → r_real = 70% × 2.5% + 30% × 0.5% = 1.9%
vpwRate = 0.019 / (1 - 1.019^(-28)) = 0.0432 (4.32%)
vpwTotal = 2.5M × 0.0432 = 108.000
Go-Go aktiv (Jahr 1): vpwTotal × 1.2 = 129.600
dynamicFlex = max(0, 129.600 - 6.000) = 123.600
Gesamt-Entnahme = 6k + 123.6k + 18k = 147.600/Jahr ≈ 12.300/Monat
```

Nach Go-Go-Phase (ab Jahr 11):
```
Alter 75, LE_joint(m75, w73) ≈ 18 Jahre
Vermögen ≈ 2.0M (angenommen)
vpwRate = 0.019 / (1 - 1.019^(-18)) = 0.0630 (6.30%)
vpwTotal = 2.0M × 0.063 = 126.000 (ohne Go-Go)
dynamicFlex = 120.000
Gesamt = 6k + 120k + 18k = 144k/Jahr
```

Im Vergleich zu statischer Flex kann Option C die Entnahme in der Go-Go-Phase deutlich erhöhen.
Wie stark dieser Effekt ausfällt, hängt von Vermögen, `n`, Guardrails und Return-Clamps ab.

### Beispiel 3: Crash-Szenario (Single, konservativ)

Gesamtvermögen sinkt auf 800k (bei Alter 75, Mann), CAPE fällt auf 15

```
netFloor = 6k (unverändert, inflationsbereinigt)
LE(m,75) ≈ 12 Jahre → n = 12 + 5 (konservativ) = 17
CAPE 15 → expectedReturnCape = 8% (attraktive Bewertung!)
r_real = 70% × (8%-2.5%) + 30% × 0.5% = 4.0%
vpwRate = 0.04 / (1 - 1.04^(-17)) = 0.0822 (8.22%)
vpwTotal = 800k × 0.0822 = 65.760
dynamicFlex = 59.760

Plus: Guardrails senken FlexRate auf z.B. 70% (bear_deep)
Tatsächliche Flex = 59.760 × 70% = 41.832
Gesamt = 6k + 41.8k + 18k = 65.8k/Jahr
```

Deutlich reduziert gegenüber dem Median-Szenario, aber immer noch komfortabel.
Die CAPE-basierte Renditeerwartung wirkt antizyklisch: nach dem Crash ist die
erwartete Rendite höher → VPW-Flex sinkt nicht so stark wie das Vermögen.
Der Konservativ-Aufschlag (+5J) verhindert, dass die vpwRate bei kurzer LE zu aggressiv wird.

---

## Entscheidungsvorlage (vor Implementierung)

Ziel: Vor Code-Start wenige Kernparameter fixieren, damit Verhalten stabil und testbar bleibt.

### 1) Horizon-Methode
- **Empfehlung:** `horizonMethod = 'survival_quantile'`, `survivalQuantile = 0.85` (p85)
- Alternative (vorsichtiger): `survivalQuantile = 0.90`
- Nicht empfohlen als Default: `mean` (zu optimistisch bei Langlebigkeit)

**Entscheidung:**
- [ ] p85 (empfohlen)
- [ ] p90 (konservativer)
- [ ] mean (nur bewusst)

### 2) Realrendite-Leitplanken
- **Empfehlung:** `MIN_REAL_RETURN = 0.00`, `MAX_REAL_RETURN = 0.05`
- Begründung: verhindert negative/überaggressive VPW-Raten in Phase 1

**Entscheidung:**
- [ ] 0.00 .. 0.05 (empfohlen)
- [ ] 0.00 .. 0.04 (konservativer)
- [ ] Eigene Bandbreite: ______

### 3) Smoothing der erwarteten Realrendite
- **Empfehlung:** `EXPECTED_RETURN_SMOOTHING_ALPHA = 0.35`
- Orientierung:
  - 0.25 = ruhiger, träger
  - 0.35 = ausgewogen
  - 0.50 = reaktiver, sprunghafter

**Entscheidung:**
- [ ] 0.35 (empfohlen)
- [ ] 0.25 (ruhiger)
- [ ] 0.50 (reaktiver)

### 4) Go-Go-Default
- **Empfehlung:** standardmäßig aus (`goGoJahre = 0`, `goGoMultiplier = 1.0`)
- Optionaler Startwert für aktive Nutzer: 10 Jahre, 1.15-1.20

**Entscheidung:**
- [ ] Default aus (empfohlen)
- [ ] Default an: ______ Jahre, Faktor ______

### 5) Balance-Gate (Freischaltregel)
- Aktuelles Alter ist via Profil da.
- Für Dynamic Flex in Balance muss `gender` verlässlich vorliegen; sonst kein sauberer Horizont.

**Empfehlung:** Feature in Balance nur aktivieren, wenn `gender` verfügbar ist; sonst UI-Hinweis und Fallback auf manuelle Flex.

**Entscheidung:**
- [ ] Gate aktiv (empfohlen)
- [ ] Ohne Gate (nicht empfohlen)

### 6) Abnahmekriterien Phase 1
- `dynamicFlex=false` ist bit-identisch zum bisherigen Verhalten.
- 19 neue Tests grün (inkl. Quantil/Clamp/Smoothing/CAPE-Konsistenz).
- Dokumentation aktualisiert (`README.md`, `TECHNICAL.md`, `engine/README.md`).

**Go/No-Go:**
- [ ] Go für Implementierung
- [ ] No-Go (offene Punkte zuerst klären): ________________________
