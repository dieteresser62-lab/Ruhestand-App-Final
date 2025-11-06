# Engine Module Documentation

## Überblick

Die Ruhestand-Engine wurde von einem Monolithen (959 Zeilen) in eine modulare Architektur aufgeteilt. Die Module sind in separate Dateien organisiert, die dann zu einer einzigen browser-kompatiblen `engine.js` zusammengebaut werden.

## Verzeichnisstruktur

```
engine/
├── errors.js                    # Fehlerklassen (AppError, ValidationError, FinancialCalculationError)
├── config.js                    # Zentrale Konfiguration (Schwellenwerte, Profile, Texte)
├── validators/
│   └── InputValidator.js        # Eingabevalidierung
├── analyzers/
│   └── MarketAnalyzer.js        # Marktanalyse und Szenarioerkennung
├── planners/
│   └── SpendingPlanner.js       # Ausgabenplanung und Flex-Rate-Berechnung
├── transactions/
│   └── TransactionEngine.js     # Transaktionslogik und Steuerberechnung
├── core.js                      # Orchestrierung & EngineAPI
└── adapter.js                   # Simulator-V5-Adapter für Abwärtskompatibilität
```

## Module

### 1. errors.js
Enthält spezifische Fehlerklassen:
- `AppError`: Basis-Fehlerklasse
- `ValidationError`: Validierungsfehler mit Details
- `FinancialCalculationError`: Berechnungsfehler

### 2. config.js
Zentrale Konfiguration mit:
- `ENGINE_API_VERSION`: API-Version
- `CONFIG`: Schwellenwerte, Profile, Spending-Model, Recovery-Guardrails, Texte

### 3. validators/InputValidator.js
Validiert Benutzereingaben:
- Alters-, Inflations-, Vermögenswerte-Validierung
- Gold-, Runway-, Aktien-Validierung
- Gibt strukturierte Fehler zurück

### 4. analyzers/MarketAnalyzer.js
Analysiert Marktbedingungen:
- Berechnet ATH-Abstand, Performance
- Bestimmt Marktszenario (peak_hot, bear_deep, recovery, etc.)
- Erkennt Stagflation

### 5. planners/SpendingPlanner.js
Berechnet optimale Ausgabenstrategie:
- State-Management (initialisieren/laden)
- Alarm-Bedingungen evaluieren
- Flex-Rate berechnen mit Glättung
- Guardrails anwenden (Recovery-Cap, Caution-Cap, Budget-Floor)

### 6. transactions/TransactionEngine.js
Bestimmt Transaktionsaktionen:
- Berechnet Ziel-Liquidität
- Bestimmt Verkaufs-/Kaufaktionen
- Berechnet Steuern und Verkaufsreihenfolge
- Puffer-Schutz im Bärenmarkt

### 7. core.js
Orchestriert alle Module:
- `_internal_calculateModel()`: Führt alle Module zusammen
- `EngineAPI`: Moderne API für Balance App v38+
  - `getVersion()`
  - `getConfig()`
  - `analyzeMarket()`
  - `calculateTargetLiquidity()`
  - `simulateSingleYear()`

### 8. adapter.js
Adapter für Simulator V5:
- `Ruhestandsmodell_v30_Adapter`: Abwärtskompatible API
- Bildet alte Funktionssignaturen auf neue Engine ab
- Cached Simulationsergebnisse für Performance

## Build-Prozess

Die Module werden mit `build-engine.js` zu einer einzigen Datei zusammengefügt:

```bash
node build-engine.js
```

Das Build-Script:
1. Liest alle Module in der richtigen Reihenfolge
2. Entfernt `require()` Aufrufe
3. Erstellt einen internen Module-Cache
4. Exportiert die APIs global (`EngineAPI`, `Ruhestandsmodell_v30`)
5. Generiert eine browser-kompatible `../engine.js`

## Entwicklung

### Module bearbeiten
1. Öffne die entsprechende Datei im `engine/` Verzeichnis
2. Nehme Änderungen vor
3. Führe `node build-engine.js` aus
4. Teste mit Balance App oder Simulator

### Neue Module hinzufügen
1. Erstelle neue Datei in passendem Unterverzeichnis
2. Füge Modul zu `modules` Array in `build-engine.js` hinzu
3. Aktualisiere Export-Logik im Build-Script
4. Führe Build aus

## APIs

### EngineAPI (Moderne API)
```javascript
// Version abrufen
const version = EngineAPI.getVersion();

// Markt analysieren
const market = EngineAPI.analyzeMarket(input);

// Jahr simulieren
const result = EngineAPI.simulateSingleYear(input, lastState);
```

### Ruhestandsmodell_v30 (Kompatibilitäts-API)
```javascript
// Für Simulator V5
const spending = Ruhestandsmodell_v30.determineSpending({...});
const action = Ruhestandsmodell_v30.determineAction(results, inputsCtx);
```

## Testing

Die gebündelte `engine.js` wird von beiden Apps geladen:
- `Balance.html`: Nutzt EngineAPI
- `Simulator.html`: Nutzt Ruhestandsmodell_v30

## Vorteile der Modularisierung

1. **Wartbarkeit**: Jedes Modul hat klare Verantwortlichkeit
2. **Testbarkeit**: Module können einzeln getestet werden
3. **Wiederverwendbarkeit**: Module können in anderen Projekten genutzt werden
4. **Übersichtlichkeit**: Code ist in logische Einheiten aufgeteilt
5. **Kompatibilität**: Build-Prozess stellt Browser-Kompatibilität sicher
