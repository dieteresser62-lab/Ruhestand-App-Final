# Implementierungsplan: VPW-basierte Dynamische Flex-Entnahme

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

### Warum VPW statt RMD

| | RMD (Vermögen/LE) | VPW (mit Renditeerwartung) |
|---|---|---|
| Formel | V / n | V × r/(1-(1+r)^-n) |
| Bei r=0 | 5.0% (Alter 65, n=20) | 5.0% (identisch, Fallback) |
| Bei r=3% | 5.0% | **6.7%** (realitätsnäher) |
| Frühphase | Konservativ ("knauserig") | Angemessen |
| Parameter | Keiner | r aus Asset-Allokation (automatisch) |

VPW preist die erwartete Portfolio-Rendite ein. Bei 60/40-Allokation und CAPE-basierter
Renditeerwartung ergibt das am Anfang ~35% höhere Entnahmen als reines RMD, ohne das
Kapital schneller aufzubrauchen.

---

## Architektur-Entscheidung

**VPW-Logik lebt in `engine/core.mjs`, vor dem SpendingPlanner-Aufruf.**

Begründung:
- core.mjs macht bereits Input-Preprocessing (Renten-Nettierung, Zeilen 85-98)
- VPW ersetzt `inflatedBedarf.flex` – genau dort, wo der Wert gesetzt wird
- SpendingPlanner bleibt **unverändert** – er sieht den dynamischen Flex wie normalen `flexBedarf`
- Beide Apps (Balance + Simulator) profitieren über einen einzigen Eingriffspunkt
- `dynamicFlex: false` (Default) → exakt das bisherige Verhalten, volle Abwärtskompatibilität

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

## Datenfluss-Diagramm

```
Simulator UI / Balance UI
  │
  ├─ dynamicFlex: true/false (Checkbox)
  ├─ planungshorizont: 95 (Alter, Default)
  ├─ startFlexBedarf: 28000 (wird bei VPW ignoriert)
  │
  ▼
simulator-portfolio-inputs.js / balance-reader.js
  │
  ▼
simulator-engine-direct.js (simulateOneYear)
  │
  ├─ engineInput.dynamicFlex = true
  ├─ engineInput.planungshorizont = 95
  ├─ engineInput.flexBedarf = baseFlex (wird in Engine überschrieben)
  │
  ▼
engine/core.mjs (_internal_calculateModel)
  │
  ├─ Marktanalyse → market.expectedReturnCape (4-8% je nach CAPE)
  ├─ Gesamtvermögen = Depot + Liquidität (Zeile 72, bereits vorhanden)
  │
  ├─ if (dynamicFlex):
  │   ├─ r = gewichtete Realrendite aus targetEq + CAPE + Gold + Safe
  │   ├─ n = planungshorizont - aktuellesAlter
  │   ├─ vpwRate = r / (1 - (1+r)^(-n))    [bei r≈0: 1/n]
  │   ├─ vpwTotal = gesamtwert × vpwRate
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
Ergebnis enthält ui.vpw = { horizonYears, vpwRate, dynamicFlex, expectedRealReturn }
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
    FALLBACK_REAL_RETURN: 0.03       // 3% real wenn keine CAPE-Daten
}
```

---

### Schritt 2: Input-Validierung erweitern

**Datei:** `engine/validators/InputValidator.mjs`

Nach dem `flexBudgetYears`-Block (Zeile 132) einfügen:

```javascript
// Dynamische Flex (VPW-Modus)
if (input.dynamicFlex) {
    checkFiniteRange(
        input.planungshorizont, 70, 120,
        'planungshorizont',
        'Planungshorizont muss zwischen 70 und 120 Jahren liegen.'
    );
    if (Number.isFinite(input.planungshorizont) && Number.isFinite(input.aktuellesAlter)) {
        check(
            input.planungshorizont <= input.aktuellesAlter,
            'planungshorizont',
            'Planungshorizont muss größer als aktuelles Alter sein.'
        );
    }
}
```

`dynamicFlex` ist boolean, `planungshorizont` ist ein Alter (z.B. 95 = "plane bis 95").

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
    const { gesamtwert, expectedReturnCape, inflation, targetEq, goldAktiv, goldZielProzent } = params;
    if (!gesamtwert || gesamtwert <= 0) return cfg.FALLBACK_REAL_RETURN;

    const equityNominal = (typeof expectedReturnCape === 'number' && isFinite(expectedReturnCape))
        ? expectedReturnCape : (cfg.FALLBACK_REAL_RETURN + inflation / 100);
    const inflRate = (typeof inflation === 'number' && isFinite(inflation)) ? inflation / 100 : 0.02;

    const eqPct = (typeof targetEq === 'number' && isFinite(targetEq)) ? targetEq / 100 : 0.60;
    const goldPct = (goldAktiv && typeof goldZielProzent === 'number') ? goldZielProzent / 100 : 0;
    const safePct = Math.max(0, 1 - eqPct - goldPct);

    return eqPct * (equityNominal - inflRate) + goldPct * cfg.GOLD_REAL_RETURN + safePct * cfg.SAFE_ASSET_REAL_RETURN;
}
```

**3b. VPW-Override in `_internal_calculateModel`:**

Einfügen ZWISCHEN der bestehenden `inflatedBedarf`-Berechnung (Zeilen 90-97) und der
`neuerBedarf`-Berechnung (Zeile 98). Die bestehende Zeile 98 (`const neuerBedarf = ...`)
wird in den neuen Block integriert:

```javascript
    // === VPW DYNAMIC FLEX ===
    let vpwDiagnostics = null;
    if (input.dynamicFlex && input.planungshorizont > input.aktuellesAlter) {
        const horizonYears = input.planungshorizont - input.aktuellesAlter;
        const expectedRealReturn = _calculateExpectedRealReturn({
            gesamtwert, expectedReturnCape: market.expectedReturnCape,
            inflation: input.inflation, targetEq: input.targetEq,
            goldAktiv: input.goldAktiv, goldZielProzent: input.goldZielProzent
        });
        const vpwRate = _calculateVpwRate(expectedRealReturn, horizonYears);
        const vpwTotal = gesamtwert * vpwRate;
        inflatedBedarf.flex = Math.max(0, vpwTotal - inflatedBedarf.floor);

        vpwDiagnostics = {
            horizonYears,
            expectedRealReturn: Math.round(expectedRealReturn * 10000) / 100,
            vpwRate: Math.round(vpwRate * 10000) / 100,
            vpwTotal: Math.round(vpwTotal),
            dynamicFlex: Math.round(inflatedBedarf.flex),
            gesamtwert: Math.round(gesamtwert)
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
<div class="form-group">
    <label for="dynamicFlex">
        <input type="checkbox" id="dynamicFlex"> Dynamische Flex (VPW)
    </label>
    <small class="help-text">Flex wird dynamisch aus Vermögen, Alter und
    Renditeerwartung berechnet. Manuelle Flex-Eingabe entfällt.</small>
</div>
<div class="form-group" id="planungshorizontGroup" style="display:none">
    <label for="planungshorizont">Planungshorizont (Alter)</label>
    <input type="number" id="planungshorizont" value="95" min="70" max="120">
</div>
```

JS: Checkbox togglet Sichtbarkeit von `planungshorizontGroup` und disabled `startFlexBedarf`.

**4b. Input-Reader** (`app/simulator/simulator-portfolio-inputs.js`)

In `getCommonInputs()` nach Zeile 115 (flexBudgetRecharge):

```javascript
dynamicFlex: document.getElementById('dynamicFlex')?.checked || false,
planungshorizont: parseInt(document.getElementById('planungshorizont')?.value) || 95,
```

**4c. Engine-Input durchreichen** (`app/simulator/simulator-engine-direct.js`)

Im `engineInput`-Objekt (nach Zeile 428):

```javascript
dynamicFlex: inputs.dynamicFlex || false,
planungshorizont: inputs.planungshorizont || 95,
```

`aktuellesAlter` ist bereits korrekt gesetzt (Zeile 419: `inputs.startAlter + yearIndex`).
Die Engine berechnet `n = planungshorizont - aktuellesAlter`, das sinkt automatisch pro Jahr.

---

### Schritt 5: Balance-App Integration

**5a. HTML** (`Balance.html`)

Analog zum Simulator: Checkbox + Planungshorizont-Feld neben `flexBedarf`.

**5b. Reader** (`app/balance/balance-reader.js`)

In `readAllInputs()`:

```javascript
dynamicFlex: dom.inputs['dynamicFlex']?.checked || false,
planungshorizont: parseInt(dom.inputs['planungshorizont']?.value) || 95,
```

**5c. Renderer** (`app/balance/balance-renderer-summary.js`)

Wenn `ui.vpw` vorhanden, VPW-Info unter der monatlichen Entnahme anzeigen:
`"VPW-Flex: €X/Jahr (Rate: Y%, Restlaufzeit: Z J., exp. Rendite: W%)"`.

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
| 5 | dynamicFlex=true, Vermögen 600k, Floor(netto) 6k, n=20, r≈3% | vpwTotal ≈ 40k, Flex ≈ 34k |
| 6 | Renten-Nettierung + VPW | Floor 24k - Rente 18k = netFloor 6k, VPW-Flex basiert auf 6k |
| 7 | Restlaufzeit sinkt pro Jahr | Alter 65→vpwRate≈5.1%, Alter 80→≈8.4%, Alter 94→≈103% |
| 8 | Bear-Market + VPW | FlexRate < 100% → tatsächliche Entnahme < VPW-Flex |
| 9 | vpwDiagnostics im Ergebnis | Bei true: alle Felder vorhanden. Bei false: null |
| 10 | Regression: alle bestehenden Tests | Bestehen unverändert |

---

## Dateien und Umfang

| Datei | Änderung | Zeilen |
|-------|----------|--------|
| `engine/config.mjs` | Neuer Block `DYNAMIC_FLEX` | ~8 |
| `engine/validators/InputValidator.mjs` | Validierung `dynamicFlex`, `planungshorizont` | ~12 |
| `engine/core.mjs` | VPW-Funktionen + Override + Diagnostics | ~55 |
| `Simulator.html` | Checkbox + Planungshorizont-Input + Toggle-JS | ~15 |
| `app/simulator/simulator-portfolio-inputs.js` | 2 Felder in `getCommonInputs()` | ~3 |
| `app/simulator/simulator-engine-direct.js` | 2 Felder in `engineInput` | ~3 |
| `Balance.html` | Checkbox + Planungshorizont-Input | ~12 |
| `app/balance/balance-reader.js` | 2 Felder in `readAllInputs()` | ~3 |
| `app/balance/balance-renderer-summary.js` | VPW-Info-Anzeige | ~15 |
| `tests/vpw-dynamic-flex.test.mjs` | Neue Testdatei | ~150 |
| **Gesamt** | | **~275** |

---

## Kritische Design-Entscheidungen

### 1. Realrendite aus `targetEq` (Ziel-Allokation), NICHT aktueller Allokation

Die aktuelle Allokation driftet mit dem Markt. Nach einem Crash ist der Aktienanteil
niedriger → niedrigere erwartete Rendite → niedrigerer VPW-Flex → doppelte Bestrafung.
`targetEq` ist stabil und reflektiert die langfristige Strategie. Bereits als Input
vorhanden und validiert (20-90%, Zeile 113-117 in InputValidator).

### 2. CAPE-basierte Aktienrendite (antizyklisch)

MarketAnalyzer berechnet `expectedReturnCape` (4-8% nominal, Zeile 222-227 in config.mjs):
- Teurer Markt (CAPE 35) → 4% → niedrigerer VPW-Flex → konservativer
- Billiger Markt (CAPE 15) → 8% → höherer VPW-Flex → mutiger

Im Simulator ändert sich CAPE jedes Jahr (aus historischen Daten gesampelt).
In der Balance-App kommt der aktuelle CAPE aus dem Eingabefeld.

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

---

## Scope-Abgrenzung

**In Scope (Phase 1):**
- VPW-Berechnung in Engine Core (beide Apps)
- Simulator UI: Checkbox + Planungshorizont
- Balance UI: Checkbox + Planungshorizont
- VPW-Diagnostics in Ergebnis
- Tests

**Nicht in Scope (Phase 2):**
- VPW in Parameter-Sweeps (SWEEP_ALLOWED_KEYS)
- VPW im Auto-Optimizer
- Eigene Diagnose-Chips für VPW in der Balance-App
- Profilverbund mit VPW (Multi-Profil hat unterschiedliche Allokationen)
- Akkumulationsphase (VPW irrelevant während Ansparphase)

**Nicht nötig (bereits vorhanden):**
- Smoothing → FlexRate-Smoothing im SpendingPlanner
- Floor-Protection → Engine schützt Floor automatisch
- Cap → FlexRate ist auf 100% begrenzt
- CAPE-Daten → MarketAnalyzer liefert expectedReturnCape
- Asset-Allokation → targetEq bereits als Input vorhanden

---

## Rechenbeispiele

### Beispiel 1: Typischer deutscher Ruheständler

Gesamtvermögen 600k, Floor 24k, Rente 18k/J, Alter 65, Horizont 95, targetEq 60%

```
netFloor = max(0, 24k - 18k) = 6k
CAPE 30 → expectedReturnCape = 5% nominal
inflation = 2.5%
r_real = 60% × (5%-2.5%) + 10% × 1% + 30% × 0.5% = 1.75%
n = 95 - 65 = 30
vpwRate = 0.0175 / (1 - 1.0175^(-30)) = 0.0408 (4.08%)
vpwTotal = 600k × 0.0408 = 24.480
dynamicFlex = max(0, 24.480 - 6.000) = 18.480
Gesamt-Entnahme = 6k + 18.48k + 18k(Rente) = 42.480/Jahr = 3.540/Monat
```

### Beispiel 2: Hohes Vermögen (das Ausgangsproblem)

Gesamtvermögen 2.5 Mio, Floor 24k, Rente 18k/J, Alter 65, Horizont 95, targetEq 70%

```
netFloor = 6k
r_real = 70% × 2.5% + 0% gold + 30% × 0.5% = 1.9%
vpwRate = 0.019 / (1 - 1.019^(-30)) = 0.0415 (4.15%)
vpwTotal = 2.5M × 0.0415 = 103.750
dynamicFlex = max(0, 103.750 - 6.000) = 97.750
Gesamt-Entnahme = 6k + 97.75k + 18k = 121.750/Jahr ≈ 10.146/Monat
```

Statt der manuellen 28k Flex (→ 52k/Jahr) liefert VPW **122k/Jahr**. Das Vermögen wird
tatsächlich genutzt statt endlos akkumuliert.

### Beispiel 3: Crash-Szenario

Gesamtvermögen sinkt auf 800k (bei Alter 75), CAPE fällt auf 15

```
netFloor = 6k (unverändert, inflationsbereinigt)
CAPE 15 → expectedReturnCape = 8% (attraktive Bewertung!)
r_real = 70% × (8%-2.5%) + 30% × 0.5% = 4.0%
n = 95 - 75 = 20
vpwRate = 0.04 / (1 - 1.04^(-20)) = 0.0736 (7.36%)
vpwTotal = 800k × 0.0736 = 58.880
dynamicFlex = 52.880

Plus: Guardrails senken FlexRate auf z.B. 70% (bear_deep)
Tatsächliche Flex = 52.880 × 70% = 37.016
Gesamt = 6k + 37k + 18k = 61k/Jahr
```

Deutlich reduziert gegenüber dem Median-Szenario, aber immer noch komfortabel.
Die CAPE-basierte Renditeerwartung wirkt antizyklisch: nach dem Crash ist die
erwartete Rendite höher → VPW-Flex sinkt nicht so stark wie das Vermögen.
