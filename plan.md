# Implementierungsplan: RMD als dynamischer Flex-Bedarf

## Kernidee

Statt eines festen, inflationsbereinigten Flex-Bedarfs wird der Flex-Anteil
jedes Simulationsjahr dynamisch über die RMD-Formel berechnet:

```
Flex(dynamisch) = max(0, Depotwert / Restlebenserwartung(Alter) - Floor)
```

Das gesamte Guardrail-System (Alarm, Smoothing, Regime-Erkennung, Recovery-Caps,
Wealth-Adjusted Reduction, etc.) bleibt vollständig erhalten und wirkt weiterhin
auf die FlexRate (0-100%).

```
Entnahme = Floor(fix, inflationsbereinigt)
         + Flex(RMD-dynamisch) × FlexRate%(Guardrails)
```

## Warum dieser Ansatz elegant ist

1. **Null Änderungen an der Engine** - SpendingPlanner, Guardrails, Alarm-Logik
   bleiben komplett unangetastet
2. **Doppelte Dämpfung** bei Crash: Portfolio sinkt → RMD-Flex sinkt UND
   Guardrails senken FlexRate
3. **Altersadaptiv**: Divisor sinkt mit dem Alter → mehr Flex verfügbar →
   löst das "Go-Go Years"-Problem teilweise automatisch
4. **Floor bleibt heilig**: Miete, KV, Grundversorgung sind nie betroffen
5. **~150 Zeilen** neuer Code statt ~350 beim Vollumbau

---

## Implementierungsschritte

### Schritt 1: Life-Expectancy-Funktionen exportieren und erweitern
**Datei:** `app/simulator/simulator-engine-helpers.js`

Die bestehende `estimateRemainingLifeYears(gender, currentAge)` (Zeile 149-167)
ist aktuell eine interne Funktion. Änderungen:

- Funktion exportieren (sie wird von `simulator-engine-direct.js` gebraucht)
- Neue Funktion `estimateJointRemainingLifeYears(gender1, age1, gender2, age2)`:
  ```
  P(mindestens einer lebt in Jahr t) = 1 - P(P1 tot) × P(P2 tot)
  Erwartungswert = Summe über alle t von P(mindestens einer lebt)
  ```
  Nutzt dieselbe `MORTALITY_TABLE` wie die Einzelperson-Variante.

### Schritt 2: Simulator-Inputs erweitern
**Datei:** `app/simulator/simulator-portfolio-inputs.js`

In `getCommonInputs()` (~Zeile 170) neue Felder auslesen:

```javascript
// RMD-Flex Konfiguration
const entnahmeStrategie = document.getElementById('entnahmeStrategie')?.value || 'guardrails';
const rmdLeTabelle = document.getElementById('rmdLeTabelle')?.value || 'single';
const rmdKonservativPlus = parseInt(document.getElementById('rmdKonservativPlus')?.value) || 5;
const rmdGoGoJahre = parseInt(document.getElementById('rmdGoGoJahre')?.value) || 0;
const rmdGoGoMultiplier = parseFloat(document.getElementById('rmdGoGoMultiplier')?.value) || 1.0;
```

Zurückgeben als Teil des Return-Objekts:
```javascript
entnahmeStrategie,
rmdConfig: { leTabelle: rmdLeTabelle, konservativPlus: rmdKonservativPlus,
             goGoJahre: rmdGoGoJahre, goGoMultiplier: rmdGoGoMultiplier }
```

### Schritt 3: RMD-Flex-Berechnung im Simulator-Jahr
**Datei:** `app/simulator/simulator-engine-direct.js`

**Zentrale Änderung** - vor dem Engine-Aufruf (~Zeile 416-426):

```javascript
// --- RMD-FLEX: Dynamische Flex-Berechnung ---
let effectiveFlexBedarf = baseFlex * temporaryFlexFactor;

if (inputs.entnahmeStrategie === 'rmd') {
    const rmdCfg = inputs.rmdConfig || {};
    const currentAgeP1 = inputs.startAlter + yearIndex;

    // Divisor berechnen (Single / Joint / Konservativ)
    let divisor;
    if (rmdCfg.leTabelle === 'joint' && inputs.partner?.aktiv) {
        const ageP2 = (inputs.partner.startAlter || currentAgeP1) + yearIndex;
        const p2Gender = inputs.partner.geschlecht || 'm';
        divisor = estimateJointRemainingLifeYears(
            inputs.geschlecht, currentAgeP1, p2Gender, ageP2
        );
    } else {
        divisor = estimateRemainingLifeYears(inputs.geschlecht, currentAgeP1);
    }
    if (rmdCfg.leTabelle === 'konservativ') {
        divisor += (rmdCfg.konservativPlus || 5);
    }
    divisor = Math.max(1, divisor);

    // RMD-Flex: Was das Depot pro Jahr hergibt, abzüglich Floor
    let rmdGesamt = depotwertGesamt / divisor;

    // Go-Go-Multiplikator (erste N Jahre)
    if (rmdCfg.goGoJahre > 0 && yearIndex < rmdCfg.goGoJahre) {
        rmdGesamt *= Math.max(1.0, rmdCfg.goGoMultiplier || 1.0);
    }

    effectiveFlexBedarf = Math.max(0, rmdGesamt - effectiveBaseFloor);
}
```

Dann wird `effectiveFlexBedarf` statt `baseFlex * temporaryFlexFactor` an die
Engine übergeben:
```javascript
flexBedarf: effectiveFlexBedarf,  // statt: baseFlex * temporaryFlexFactor
```

**Wichtig:** Bei RMD-Flex entfällt die jährliche Inflationsanpassung des Flex,
weil der Flex jedes Jahr neu aus dem Depotwert berechnet wird. Die Inflation
ist implizit enthalten (Depot wächst nominal → Flex wächst nominal).

Die `baseFlex`-Fortschreibung (`naechsterBaseFlex`) wird bei RMD-Strategie
übersprungen oder ignoriert, da der Wert jedes Jahr frisch berechnet wird.

### Schritt 4: Simulator UI
**Datei:** `Simulator.html`

Neuer Abschnitt im Strategie-Bereich (neben Runway/Rebalancing):

```html
<!-- Entnahme-Strategie -->
<label>Flex-Berechnung</label>
<select id="entnahmeStrategie">
  <option value="guardrails">Fix + Inflation (Standard)</option>
  <option value="rmd">RMD-dynamisch (Lebenserwartung)</option>
</select>

<!-- RMD-Konfiguration (bedingt sichtbar) -->
<div id="rmdConfigPanel" style="display:none">
  <label>Lebenserwartungs-Tabelle</label>
  <select id="rmdLeTabelle">
    <option value="single">Einzelperson</option>
    <option value="joint">Ehepaar (Joint Life)</option>
    <option value="konservativ">Konservativ (+5 Jahre)</option>
  </select>

  <label>Konservativ-Aufschlag (Jahre)</label>
  <input id="rmdKonservativPlus" type="number" value="5" min="0" max="15">

  <label>Go-Go-Phase (Jahre)</label>
  <input id="rmdGoGoJahre" type="number" value="0" min="0" max="20">

  <label>Go-Go-Multiplikator</label>
  <input id="rmdGoGoMultiplier" type="number" value="1.0" min="1.0" max="1.5" step="0.05">
</div>
```

Plus ein kleiner JS-Block für bedingte Sichtbarkeit:
```javascript
document.getElementById('entnahmeStrategie').addEventListener('change', e => {
    document.getElementById('rmdConfigPanel').style.display =
        e.target.value === 'rmd' ? '' : 'none';
});
```

### Schritt 5: Engine bauen und testen
```bash
npm run build:engine   # Engine-Bundle neu erstellen (nur nötig falls Engine geändert)
npm test               # Alle Tests laufen lassen - Regression prüfen
```

### Schritt 6: RMD-spezifische Tests
**Neue Datei:** `tests/rmd-flex.test.mjs`

Testfälle:
1. **Grundformel**: Depot 500k, Alter 65 (LE~20) → Flex ≈ 25k - Floor
2. **Floor-Dominanz**: Depot 200k, Alter 65, Floor 15k → Flex ≈ max(0, 10k - 15k) = 0
3. **Hohes Alter**: Depot 200k, Alter 90 (LE~5) → Flex ≈ 40k - Floor (deutlich mehr)
4. **Joint Life**: Divisor höher als Single → Flex niedriger
5. **Konservativ**: Divisor += 5 → Flex niedriger
6. **Go-Go**: Erste 10 Jahre mit 1.2x → Flex 20% höher
7. **Guardrails wirken**: Bei Bear-Markt wird FlexRate trotz hohem RMD-Flex gesenkt
8. **Regression**: `entnahmeStrategie: 'guardrails'` → identisches Verhalten wie bisher

---

## Datenfluss-Diagramm

```
Simulator UI
  │
  ├─ entnahmeStrategie: 'guardrails' | 'rmd'
  ├─ rmdConfig: { leTabelle, konservativPlus, goGoJahre, goGoMultiplier }
  │
  ▼
simulator-portfolio-inputs.js (getCommonInputs)
  │
  ▼
monte-carlo-runner.js (Simulations-Schleife)
  │
  ├─ pro Jahr: ageP1, ageP2, yearData
  │
  ▼
simulator-engine-direct.js (simulateOneYear)
  │
  ├─ if (rmd):
  │   ├─ divisor = estimateRemainingLifeYears(gender, age)  ← aus simulator-engine-helpers.js
  │   ├─ rmdGesamt = depotwertGesamt / divisor [× goGoMultiplier]
  │   └─ effectiveFlexBedarf = max(0, rmdGesamt - floor)
  │
  ├─ engineInput.flexBedarf = effectiveFlexBedarf
  │
  ▼
Engine (SpendingPlanner) ← KEINE ÄNDERUNG
  │
  ├─ Regime-Erkennung, Alarm, Guardrails
  ├─ FlexRate berechnen (0-100%)
  ├─ Smoothing, Delta-Caps
  │
  ▼
Entnahme = Floor + effectiveFlexBedarf × FlexRate%
```

---

## Dateien und geschätzter Umfang

| Datei | Änderung | Zeilen |
|-------|----------|--------|
| `app/simulator/simulator-engine-helpers.js` | Export + Joint-LE-Funktion | ~35 |
| `app/simulator/simulator-engine-direct.js` | RMD-Flex-Berechnung vor Engine-Aufruf | ~25 |
| `app/simulator/simulator-portfolio-inputs.js` | Neue Input-Felder lesen | ~10 |
| `Simulator.html` | UI-Elemente + Toggle-Logik | ~40 |
| `tests/rmd-flex.test.mjs` | Neue Testdatei | ~120 |
| **Gesamt** | | **~230** |

Engine-Dateien (`engine/*.mjs`) werden **nicht verändert**. Kein `build:engine` nötig.

---

## Scope-Abgrenzung

**In Scope (Phase 1):**
- Dynamischer RMD-Flex im Simulator
- Single/Joint/Konservativ Lebenserwartung
- Go-Go-Multiplikator
- UI mit bedingter Sichtbarkeit
- Tests

**Nicht in Scope (Phase 2 - Balance-App):**
- RMD-Flex in der Balance-App
- RMD-Flex in Parameter-Sweeps
- Eigene Diagnose-Chips für RMD

**Nicht nötig (bereits vorhanden):**
- Smoothing → FlexRate-Smoothing im SpendingPlanner
- Floor-Protection → Engine schützt Floor automatisch
- Cap → FlexRate ist auf 100% begrenzt
- Sterbetafeln → MORTALITY_TABLE in simulator-data.js
