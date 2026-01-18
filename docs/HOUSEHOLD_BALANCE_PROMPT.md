# Implementierungs-Prompt: Haushalts-Balance

> Diesen Prompt kannst du direkt an Claude Code geben, um die Haushalts-Balance zu implementieren.

---

## Prompt

```
Implementiere die "Haushalts-Balance" Funktion für die Balance-App gemäß der Spezifikation in `docs/HOUSEHOLD_BALANCE_SPEC.md`.

## Kontext

Die Balance-App (`Balance.html`) zeigt aktuell immer nur ein Profil. Wenn der Benutzer mehrere Profile hat (z.B. Partner), soll die App automatisch einen Haushaltsmodus anbieten, der zeigt:

1. **Aggregierte Haushaltswerte** (Gesamtbedarf, Gesamtrente, Netto-Entnahme)
2. **Konkrete Entnahmeempfehlung** pro Profil ("Verkaufe X€ aus Profil A, Y€ aus Profil B")
3. **Steueroptimierte Verteilung** (niedrigste Steuerlast zuerst)

## Anforderungen

### 1. Neue Datei: `household-balance.js`

Erstelle die Kernlogik mit diesen Funktionen:

```javascript
// Lade alle Profile, die zum Haushalt gehören
export function loadHouseholdProfiles()

// Aggregiere Haushaltswerte (Bedarf, Rente, Depot, etc.)
export function aggregateHouseholdInputs(profileInputs)

// Berechne Steuerlast pro Euro für ein Profil
export function calculateTaxPerEuro(inputs)

// Berechne Entnahmeverteilung nach Modus
export function calculateWithdrawalDistribution(profileInputs, aggregated, mode)
// mode: 'tax_optimized' | 'proportional' | 'runway_first'

// Wähle optimale Tranchen für Verkauf (wenn depot_tranchen vorhanden)
export function selectTranchesForSale(tranches, targetAmount)
```

Die Logik soll:
- `profile-storage.js` nutzen für Profil-Zugriff (listProfiles, getProfileData)
- `household-inputs.js` wiederverwenden wo möglich (buildSimulatorInputsFromProfileData)
- Steuerberechnung: KapESt 25% + Soli 5,5% + optionale Kirchensteuer

### 2. Neue Datei: `household-balance-ui.js`

Erstelle das UI-Rendering:

```javascript
// Rendere Haushalts-Übersicht (Gesamtwerte)
export function renderHouseholdOverview(aggregated, containerId)

// Rendere Entnahmeempfehlung pro Profil
export function renderWithdrawalRecommendation(distribution, containerId)

// Rendere Steuervergleich (optimiert vs. proportional)
export function renderTaxComparison(taxOptimized, proportional, containerId)

// Toggle zwischen Einzel- und Haushaltsmodus
export function toggleHouseholdMode(enabled)
```

### 3. Änderungen an `Balance.html`

Füge hinzu:
- Modus-Toggle am Anfang (Checkbox "Haushaltsmodus")
- Neue Sektion `<section id="household-section">` mit:
  - Dropdown für Verteilungsschlüssel
  - Container für Haushalts-Übersicht
  - Container für Entnahmeempfehlung

### 4. Änderungen an `balance-main.js`

- Prüfe bei Initialisierung: Gibt es 2+ Profile?
- Wenn ja: Zeige Haushaltsmodus-Toggle
- Bei Aktivierung: Rufe Haushalts-Berechnung auf
- Speichere Modus in localStorage (`household_mode_enabled`)

### 5. Änderungen an `profile-storage.js`

- Erweitere Profil-Meta um `belongsToHousehold: boolean` (Default: true)
- Neue Funktion: `setProfileHouseholdMembership(profileId, belongs)`

## Wichtige Details

### Steueroptimierte Verteilung
```
1. Berechne für jedes Profil: taxPerEuro = (Gewinn/Marktwert) × Steuersatz
2. Sortiere Profile aufsteigend nach taxPerEuro
3. Verteile Entnahme: Profil mit niedrigster Steuerlast zuerst
```

### Tranchen-Auswahl
```
1. Filtere equity-Tranchen
2. Sortiere nach Steuerlast (niedrigste zuerst)
3. Wähle Tranchen bis targetAmount erreicht
```

### Edge Cases
- Nur 1 Profil → Haushaltsmodus nicht verfügbar
- Profil ohne Depot-Daten → überspringen mit Warnung
- Rente > Bedarf → "Keine Entnahme erforderlich"

## CSS

Nutze das bestehende CSS aus `balance-styles.css`. Die neuen Elemente sollen sich nahtlos einfügen. Verwende die existierenden Klassen wie `.summary-card`, `.kpi-chip`, etc.

## Tests

Erstelle `tests/household-balance.test.mjs` mit:
- Test für Aggregation
- Test für Steuerberechnung
- Test für verschiedene Verteilungsmodi
- Test für Tranchen-Auswahl

## Reihenfolge

1. `household-balance.js` (Kernlogik)
2. Tests für Kernlogik
3. `household-balance-ui.js` (Rendering)
4. Balance.html + balance-main.js Integration
5. profile-storage.js Erweiterung
6. Manuelle Tests im Browser

Lies zuerst die vollständige Spezifikation in `docs/HOUSEHOLD_BALANCE_SPEC.md`.
```

---

## Verwendung

1. Kopiere den Prompt oben
2. Starte eine neue Claude Code Session
3. Füge den Prompt ein
4. Claude wird die Spezifikation lesen und implementieren

## Hinweise

- Die Spezifikation enthält alle Details (UI-Mockups, Algorithmen, Edge Cases)
- Du kannst den Prompt anpassen, z.B. nur einzelne Teile implementieren lassen
- Bei Fragen wird Claude nachfragen

## Varianten

### Nur Kernlogik (ohne UI)
```
Implementiere nur `household-balance.js` gemäß `docs/HOUSEHOLD_BALANCE_SPEC.md`.
Fokus auf die Berechnungslogik, kein UI.
```

### Nur UI-Integration
```
Die Kernlogik in `household-balance.js` existiert bereits.
Implementiere jetzt `household-balance-ui.js` und die Integration
in Balance.html gemäß `docs/HOUSEHOLD_BALANCE_SPEC.md`.
```

### Schrittweise
```
Implementiere Phase 1 der Haushalts-Balance: Nur loadHouseholdProfiles()
und aggregateHouseholdInputs() in `household-balance.js`.
Teste mit console.log() ob die Aggregation funktioniert.
```
