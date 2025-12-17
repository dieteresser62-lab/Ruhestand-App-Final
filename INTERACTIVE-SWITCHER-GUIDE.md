# Interaktiver Engine-Switcher - Benutzerhandbuch

## Überblick

Der **Interaktive Engine-Switcher** ermöglicht es, im Simulator zwischen zwei Engine-Implementierungen umzuschalten:

1. **Adapter** (Legacy): Verwendet `Ruhestandsmodell_v30` Adapter mit 3-5 Aufrufen pro Jahr
2. **Direct API** (Neu): Direkter Zugriff auf `EngineAPI` mit 1 Aufruf pro Jahr

## Features

✅ **Live-Umschaltung** während der Simulation
✅ **Performance-Monitoring** für beide Engines
✅ **Side-by-Side Comparison Mode**
✅ **Persistente Settings** (localStorage)
✅ **Drag & Drop Panel**
✅ **Real-Time Statistics**

---

## Verwendung

### 1. Simulator öffnen

Öffnen Sie `Simulator.html` im Browser. Das Engine-Switcher-Panel erscheint automatisch oben rechts.

### 2. Engine-Modus wechseln

**Im Panel:**
- Wählen Sie **"Adapter"** für die Legacy-Version
- Wählen Sie **"Direct API"** für die neue Version

**Oder per Code:**
```javascript
// Im Browser Console
window.featureFlags.setEngineMode('direct');  // Zur Direct API wechseln
window.featureFlags.setEngineMode('adapter'); // Zurück zum Adapter

// Toggle zwischen beiden
window.featureFlags.toggleEngineMode();
```

### 3. Comparison Mode

Aktivieren Sie **"Side-by-Side Comparison Mode"** im Panel, um beide Engines parallel zu testen.

```javascript
window.featureFlags.setComparisonMode(true);

// Run comparison
import { simulateOneYearComparison } from './simulator-engine-wrapper.js';
const result = simulateOneYearComparison(state, inputs, yearData, 0);

console.log('Adapter Zeit:', result.timeAdapter, 'ms');
console.log('Direct Zeit:', result.timeDirect, 'ms');
console.log('Speedup:', result.speedup, '%');
console.log('Match:', result.match);
console.log('Differences:', result.differences);
```

### 4. Performance-Statistiken

Das Panel zeigt automatisch:
- **Durchschnittliche Zeit** pro Engine
- **Anzahl Runs**
- **Speedup-Prozentsatz**

**Reset:**
```javascript
window.featureFlags.resetMetrics();
```

---

## API-Referenz

### FeatureFlags

#### Methoden

```javascript
// Engine Mode
featureFlags.getEngineMode()           // Returns: 'adapter' | 'direct'
featureFlags.setEngineMode(mode)       // mode: 'adapter' | 'direct'
featureFlags.toggleEngineMode()        // Switches between modes

// Comparison Mode
featureFlags.setComparisonMode(boolean)
featureFlags.isComparisonMode()        // Returns: boolean

// Engine Reference
featureFlags.getEngine()               // Returns: Ruhestandsmodell_v30 | EngineAPI
featureFlags.getSimulatorFunction()    // Returns: simulateOneYear function

// Performance
featureFlags.recordPerformance(mode, timeMs, hadError)
featureFlags.getPerformanceStats()     // Returns: detailed statistics
featureFlags.resetMetrics()            // Clear all metrics

// Storage
featureFlags.getAllFlags()             // Get all current flags
featureFlags.reset()                   // Reset to defaults

// Listeners
const unsubscribe = featureFlags.subscribe((flag, value) => {
    console.log(`${flag} changed to ${value}`);
});
unsubscribe(); // Stop listening
```

### Engine Wrapper

#### `simulateOneYear(...)`

Adaptive Funktion, die automatisch die richtige Engine basierend auf Feature-Flags wählt:

```javascript
import { simulateOneYear } from './simulator-engine-wrapper.js';

const result = simulateOneYear(
    currentState,
    inputs,
    yearData,
    yearIndex,
    pflegeMeta,
    careFloorAddition,
    householdContext,
    temporaryFlexFactor,
    engineAPI  // Optional override
);
```

**Performance-Tracking erfolgt automatisch!**

#### `simulateOneYearComparison(...)`

Führt beide Engines aus und vergleicht die Ergebnisse:

```javascript
import { simulateOneYearComparison } from './simulator-engine-wrapper.js';

const comparison = simulateOneYearComparison(
    currentState,
    inputs,
    yearData,
    yearIndex
);

console.log('Adapter Result:', comparison.adapter);
console.log('Direct Result:', comparison.direct);
console.log('Speedup:', comparison.speedup, '%');
console.log('Match:', comparison.match);

if (!comparison.match) {
    console.log('Differences:', comparison.differences);
}
```

---

## Praktische Beispiele

### Beispiel 1: Einfacher Modus-Wechsel

```javascript
// Starte im Adapter-Modus
window.featureFlags.setEngineMode('adapter');

// Führe eine Simulation aus
runMonteCarloSimulation({...});

// Wechsle zur Direct API
window.featureFlags.setEngineMode('direct');

// Führe dieselbe Simulation erneut aus
runMonteCarloSimulation({...});

// Vergleiche Statistiken
const stats = window.featureFlags.getPerformanceStats();
console.log('Adapter avg:', stats.adapter.avgTime, 'ms');
console.log('Direct avg:', stats.direct.avgTime, 'ms');
console.log('Speedup:', stats.comparison.speedup, '%');
```

### Beispiel 2: Automated A/B Testing

```javascript
async function runABTest(inputs, runs = 100) {
    // Test Adapter
    window.featureFlags.setEngineMode('adapter');
    window.featureFlags.resetMetrics();

    for (let i = 0; i < runs; i++) {
        await runMonteCarloSimulation({
            inputs,
            monteCarloParams: { anzahl: 1, maxDauer: 30, seed: i }
        });
    }

    const adapterStats = window.featureFlags.getPerformanceStats().adapter;

    // Test Direct
    window.featureFlags.setEngineMode('direct');
    window.featureFlags.resetMetrics();

    for (let i = 0; i < runs; i++) {
        await runMonteCarloSimulation({
            inputs,
            monteCarloParams: { anzahl: 1, maxDauer: 30, seed: i }
        });
    }

    const directStats = window.featureFlags.getPerformanceStats().direct;

    return {
        adapter: adapterStats,
        direct: directStats,
        speedup: ((adapterStats.avgTime - directStats.avgTime) / adapterStats.avgTime) * 100
    };
}

// Ausführen
const results = await runABTest(myInputs, 100);
console.log('A/B Test Results:', results);
```

### Beispiel 3: Detailed Comparison

```javascript
import { simulateOneYearComparison } from './simulator-engine-wrapper.js';

const inputs = {...};
const state = {...};
const yearData = {...};

const comparison = simulateOneYearComparison(
    state, inputs, yearData, 0
);

// Detaillierte Analyse
console.log('=== PERFORMANCE ===');
console.log(`Adapter: ${comparison.timeAdapter.toFixed(3)}ms`);
console.log(`Direct:  ${comparison.timeDirect.toFixed(3)}ms`);
console.log(`Speedup: +${comparison.speedup.toFixed(1)}%`);

console.log('\n=== CORRECTNESS ===');
if (comparison.match) {
    console.log('✅ Results are identical!');
} else {
    console.log('⚠️  Found differences:');
    comparison.differences.forEach(diff => {
        console.log(`  ${diff.field}:`);
        console.log(`    Adapter: ${diff.adapter}`);
        console.log(`    Direct:  ${diff.direct}`);
        console.log(`    Diff:    ${diff.diffPct}%`);
    });
}

// Fehlerprüfung
if (comparison.errorAdapter) {
    console.error('Adapter Error:', comparison.errorAdapter);
}
if (comparison.errorDirect) {
    console.error('Direct Error:', comparison.errorDirect);
}
```

---

## UI-Panel

### Features

- **Minimieren:** Klicken Sie auf "_" um das Panel zu minimieren
- **Schließen:** Klicken Sie auf "×" um das Panel zu verbergen
- **Draggable:** Ziehen Sie das Panel an eine beliebige Position
- **Persistent:** Einstellungen werden in localStorage gespeichert

### Panel wiederherstellen

Wenn Sie das Panel geschlossen haben:

```javascript
window.engineSwitcher.show();
```

### Panel neu initialisieren

```javascript
window.engineSwitcher.init();
```

---

## Debugging

### Debug-Logging aktivieren

```javascript
// Enable debug logging
const flags = window.featureFlags.getAllFlags();
flags.debugLogging = true;
```

### Zugriff auf Engine-Instanzen

```javascript
// Current engine
const engine = window.featureFlags.getEngine();
console.log('Current engine:', engine);

// Direct access to both
const adapter = window.Ruhestandsmodell_v30;
const direct = window.EngineAPI;

console.log('Adapter:', adapter);
console.log('Direct:', direct);
```

### State-Inspektion

```javascript
// Current state
console.log('Current Mode:', window.featureFlags.getEngineMode());
console.log('Comparison Mode:', window.featureFlags.isComparisonMode());
console.log('All Flags:', window.featureFlags.getAllFlags());

// Performance metrics
const stats = window.featureFlags.getPerformanceStats();
console.log('Stats:', JSON.stringify(stats, null, 2));
```

---

## Best Practices

### 1. Immer Performance monitoren

```javascript
// Starten Sie mit Reset
window.featureFlags.resetMetrics();

// Führen Sie Ihre Tests aus
// ...

// Prüfen Sie die Ergebnisse
const stats = window.featureFlags.getPerformanceStats();
console.log('Performance:', stats);
```

### 2. Vergleichen Sie identische Bedingungen

```javascript
// Verwenden Sie denselben Seed
const seed = 42;

// Test 1: Adapter
window.featureFlags.setEngineMode('adapter');
runMC({ seed });

// Test 2: Direct
window.featureFlags.setEngineMode('direct');
runMC({ seed });

// Ergebnisse sollten identisch sein!
```

### 3. Nutzen Sie Comparison Mode für Validierung

```javascript
// Vor dem Produktiv-Einsatz
window.featureFlags.setComparisonMode(true);

// Führen Sie kritische Szenarien aus
// ...

// Prüfen Sie auf Unterschiede
const stats = window.featureFlags.getPerformanceStats();
if (stats.direct.errors > 0) {
    console.error('Direct API hat Fehler!');
}
```

---

## Troubleshooting

### Problem: Panel erscheint nicht

**Lösung:**
```javascript
// Panel manuell initialisieren
import { engineSwitcher } from './simulator-engine-switcher.js';
engineSwitcher.init();
```

### Problem: Engine nicht gefunden

**Lösung:**
```javascript
// Prüfen Sie, ob beide Engines geladen sind
console.log('Adapter:', typeof window.Ruhestandsmodell_v30);
console.log('Direct:', typeof window.EngineAPI);

// Wenn nicht geladen, prüfen Sie die Script-Tags in Simulator.html
```

### Problem: Performance-Metriken zeigen "No data"

**Lösung:**
```javascript
// Metriken werden nur aufgezeichnet, wenn performanceMonitoring aktiv ist
const flags = window.featureFlags.getAllFlags();
if (!flags.performanceMonitoring) {
    // Aktivieren Sie es
    window.location.reload(); // Neustart erforderlich
}

// Oder manuell setzen (für nächste Sessions)
localStorage.setItem('featureFlags', JSON.stringify({
    ...flags,
    performanceMonitoring: true
}));
```

### Problem: Unterschiede in Comparison Mode

**Lösung:**
```javascript
// Führen Sie detaillierte Vergleiche durch
const comparison = simulateOneYearComparison(...);

if (!comparison.match) {
    console.log('Differences:', comparison.differences);

    // Prüfen Sie, ob Unterschiede signifikant sind
    comparison.differences.forEach(diff => {
        if (Math.abs(diff.diffPct) > 1) {
            console.warn('Significant difference in', diff.field);
        }
    });
}
```

---

## Migration-Roadmap

### Phase 1: Testing (aktuell)
- ✅ Engine-Switcher implementiert
- ✅ Beide Engines parallel verfügbar
- ⏳ Umfangreiche Tests durchführen
- ⏳ Performance-Validierung

### Phase 2: Soft-Launch
- Feature-Flag standardmäßig auf 'adapter'
- Benutzer können optional zu 'direct' wechseln
- Feedback sammeln
- Edge-Cases identifizieren

### Phase 3: Vollständige Migration
- Feature-Flag standardmäßig auf 'direct'
- Adapter als Fallback verfügbar
- Monitoring für Probleme

### Phase 4: Cleanup
- Adapter-Code entfernen
- Feature-Flag-System optional machen
- Dokumentation aktualisieren

---

## Kontakt & Support

Bei Fragen oder Problemen:
- Siehe: `ADAPTER-ELIMINATION-REPORT.md` für technische Details
- Siehe: `tests/adapter-vs-direct.test.mjs` für Test-Beispiele

**Viel Erfolg beim Testing!** 🚀
