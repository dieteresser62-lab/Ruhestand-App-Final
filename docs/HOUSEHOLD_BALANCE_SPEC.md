# Haushalts-Balance Spezifikation

## Übersicht

Dieses Dokument spezifiziert die Erweiterung der Balance-App um eine **haushaltsbewusste Entnahmeplanung**. Ziel ist es, bei mehreren Profilen (z.B. Partner) eine konkrete Empfehlung zu geben, aus welchem Depot wie viel verkauft werden soll.

---

## Problemstellung

### Aktueller Zustand
- Die Balance-App zeigt immer nur **ein** Profil
- Bei Paaren mit getrennten Depots muss jeder seine Balance separat berechnen
- Es fehlt die Antwort auf: "Wer verkauft dieses Jahr wie viel?"

### Gewünschter Zustand
- Die Balance-App erkennt automatisch, wenn 2+ Profile existieren
- Sie zeigt eine **Haushalts-Gesamtsicht** mit aggregierten Werten
- Sie gibt eine **konkrete Entnahmeempfehlung** pro Profil
- Die Empfehlung ist **steueroptimiert** (oder nach anderem Schlüssel)

---

## Funktionale Anforderungen

### F1: Automatische Haushalts-Erkennung
- Wenn 2 oder mehr Profile existieren, zeigt die Balance-App automatisch den Haushaltsmodus
- Die Einzelprofil-Ansicht bleibt weiterhin verfügbar (Toggle)
- Profile können per Checkbox als "Gehört zum Haushalt" markiert werden

### F2: Haushalts-Aggregation
Folgende Werte werden über alle Haushalts-Profile aggregiert:

| Wert | Aggregation |
|------|-------------|
| Jahresbedarf (Floor + Flex) | Summe |
| Renteneingänge | Summe |
| Netto-Entnahmebedarf | Summe |
| Depotwert gesamt | Summe |
| Tagesgeld gesamt | Summe |
| Geldmarkt-ETF gesamt | Summe |
| Runway (Monate) | Gewichteter Durchschnitt oder Minimum |

### F3: Entnahmeverteilung
Der Gesamtbedarf des Haushalts wird nach einem Verteilungsschlüssel auf die Profile aufgeteilt:

#### F3.1: Steueroptimiert (Standard)
- Berechne für jedes Profil: `Steuerlast/€ = (Marktwert - Kostenbasis) / Marktwert × Steuersatz`
- Verkaufe zuerst aus dem Profil mit **niedrigerer** Steuerlast pro Euro
- Berücksichtige FIFO innerhalb jedes Profils

#### F3.2: Proportional
- Verteile nach Anteil am Gesamtdepotwert
- Profil mit 60% des Vermögens zahlt 60% der Entnahme

#### F3.3: Runway-First
- Verkaufe zuerst aus dem Profil mit **mehr** Liquiditätsreserve
- Schützt das Profil mit weniger Puffer

#### F3.4: Konfigurierbar
- Der Verteilungsschlüssel ist einstellbar
- Wird in localStorage gespeichert (global, nicht pro Profil)

### F4: Konkrete Verkaufsempfehlung
Für jedes Profil wird angezeigt:
- Verkaufsbetrag in Euro
- Erwartete Steuerlast
- Konkrete Tranchen (wenn `depot_tranchen` vorhanden)
- Runway vor/nach Verkauf

### F5: Haushalts-Kennzahlen
Zusätzlich zur Einzelprofil-Diagnose:
- Gesamt-Steuer (Summe beider Profile)
- Steuerersparnis vs. alternatives Szenario
- Haushalts-Runway (kombinierte Liquidität)
- Haushalts-Equity-Quote

---

## Technische Spezifikation

### Neue Dateien

#### `household-balance.js`
Kernlogik für die Haushalts-Balance.

```javascript
/**
 * Hauptfunktionen:
 */

// Lade alle Profile, die zum Haushalt gehören
function loadHouseholdProfiles() {
    // Nutzt profile-storage.js: listProfiles(), getProfileData()
    // Filtert nach "belongsToHousehold" Flag
    // Gibt Array von { profileId, name, inputs } zurück
}

// Aggregiere Haushaltswerte
function aggregateHouseholdInputs(profileInputs) {
    // Summe: floorBedarf, flexBedarf, renteMonatlich, depotwert, tagesgeld
    // Gibt { totalBedarf, totalRente, totalEntnahme, totalDepot, ... } zurück
}

// Berechne Entnahmeverteilung
function calculateWithdrawalDistribution(profileInputs, aggregated, mode) {
    // mode: 'tax_optimized' | 'proportional' | 'runway_first'
    // Gibt Array von { profileId, withdrawalAmount, taxEstimate, tranches } zurück
}

// Berechne Steuerlast pro Euro für ein Profil
function calculateTaxPerEuro(profileInputs) {
    // (Marktwert - Kostenbasis) / Marktwert × Steuersatz
    // Berücksichtigt Kirchensteuer
}

// Wähle optimale Tranchen für Verkauf
function selectTranchesForSale(tranches, targetAmount) {
    // FIFO-sortiert nach Steuerlast
    // Gibt Array von { tranche, sellAmount, taxAmount } zurück
}
```

#### `household-balance-ui.js`
UI-Rendering für die Haushalts-Ansicht.

```javascript
/**
 * Hauptfunktionen:
 */

// Rendere Haushalts-Übersicht
function renderHouseholdOverview(aggregated) {
    // Zeigt: Gesamtbedarf, Renteneingänge, Netto-Entnahme, Runway
}

// Rendere Entnahmeempfehlung pro Profil
function renderWithdrawalRecommendation(distribution) {
    // Für jedes Profil: Karte mit Verkaufsbetrag, Steuer, Tranchen
}

// Rendere Steuervergleich
function renderTaxComparison(taxOptimized, proportional) {
    // Zeigt Ersparnis durch Steueroptimierung
}

// Toggle zwischen Einzel- und Haushaltsmodus
function toggleHouseholdMode(enabled) {
    // Zeigt/versteckt Haushalts-Sektion
}
```

### Änderungen an bestehenden Dateien

#### `Balance.html`
```html
<!-- Neue Sektion nach dem Header -->
<section id="household-section" class="household-container" style="display: none;">
    <div class="household-header">
        <h2>Haushalts-Balance</h2>
        <select id="withdrawal-mode">
            <option value="tax_optimized">Steueroptimiert</option>
            <option value="proportional">Proportional</option>
            <option value="runway_first">Runway-First</option>
        </select>
    </div>

    <div id="household-overview">
        <!-- Aggregierte Werte -->
    </div>

    <div id="withdrawal-recommendation">
        <!-- Empfehlung pro Profil -->
    </div>

    <div id="tax-comparison">
        <!-- Steuervergleich -->
    </div>
</section>

<!-- Toggle am Anfang -->
<div class="mode-toggle">
    <label>
        <input type="checkbox" id="household-mode-toggle" />
        Haushaltsmodus
    </label>
</div>
```

#### `balance-main.js`
```javascript
// Am Anfang von initializeApp():
const profiles = listProfiles();
const householdProfiles = profiles.filter(p => p.belongsToHousehold !== false);

if (householdProfiles.length >= 2) {
    // Zeige Haushaltsmodus-Toggle
    document.getElementById('mode-toggle').style.display = 'block';

    // Optional: Automatisch aktivieren
    if (localStorage.getItem('household_mode_enabled') === 'true') {
        activateHouseholdMode();
    }
}

// Neue Funktion:
function activateHouseholdMode() {
    const profileInputs = loadHouseholdProfiles();
    const aggregated = aggregateHouseholdInputs(profileInputs);
    const distribution = calculateWithdrawalDistribution(
        profileInputs,
        aggregated,
        localStorage.getItem('household_withdrawal_mode') || 'tax_optimized'
    );

    renderHouseholdOverview(aggregated);
    renderWithdrawalRecommendation(distribution);
}
```

#### `profile-storage.js`
```javascript
// Neue Funktion: Markiere Profil als Haushaltsmitglied
function setProfileHouseholdMembership(profileId, belongs) {
    const registry = loadRegistry();
    if (registry.profiles[profileId]) {
        registry.profiles[profileId].meta.belongsToHousehold = belongs;
        saveRegistry(registry);
    }
}

// Erweitere listProfiles() um belongsToHousehold Flag
function listProfiles() {
    const registry = loadRegistry();
    return Object.values(registry.profiles).map(p => ({
        id: p.meta.id,
        name: p.meta.name,
        belongsToHousehold: p.meta.belongsToHousehold !== false, // Default: true
        ...
    }));
}
```

### Datenfluss

```
┌─────────────────────────────────────────────────────────────────┐
│                      HAUSHALTS-BALANCE FLOW                     │
└─────────────────────────────────────────────────────────────────┘

1. INITIALISIERUNG
   ┌──────────────────┐
   │ profile-storage  │──→ listProfiles()
   └──────────────────┘           │
                                  ▼
                         ┌───────────────┐
                         │ 2+ Profile?   │──No──→ Einzelmodus (wie bisher)
                         └───────────────┘
                                  │ Yes
                                  ▼
2. PROFILE LADEN
   ┌──────────────────┐
   │ loadHousehold    │──→ Für jedes Profil: getProfileData()
   │ Profiles()       │──→ buildSimulatorInputsFromProfileData()
   └──────────────────┘
              │
              ▼
3. AGGREGATION
   ┌──────────────────┐     ┌─────────────────────────────────┐
   │ aggregateHouse   │──→  │ totalBedarf = Σ(floor + flex)   │
   │ holdInputs()     │     │ totalRente = Σ(renteMonatlich)  │
   └──────────────────┘     │ totalEntnahme = bedarf - rente  │
                            │ totalDepot = Σ(depotwert)       │
                            └─────────────────────────────────┘
              │
              ▼
4. VERTEILUNG
   ┌──────────────────┐     ┌─────────────────────────────────┐
   │ calculateWith    │──→  │ Mode: tax_optimized             │
   │ drawalDistri     │     │  → Sortiere Profile nach        │
   │ bution()         │     │    taxPerEuro (aufsteigend)     │
   └──────────────────┘     │  → Verteile Entnahme            │
                            └─────────────────────────────────┘
              │
              ▼
5. TRANCHEN-AUSWAHL
   ┌──────────────────┐     ┌─────────────────────────────────┐
   │ selectTranches   │──→  │ Für jedes Profil:               │
   │ ForSale()        │     │  → Lade depot_tranchen          │
   └──────────────────┘     │  → Sortiere nach Steuerlast     │
                            │  → Wähle bis targetAmount       │
                            └─────────────────────────────────┘
              │
              ▼
6. RENDERING
   ┌──────────────────┐
   │ renderHousehold  │──→ UI aktualisieren
   │ Overview()       │
   │ renderWithdrawal │
   │ Recommendation() │
   └──────────────────┘
```

---

## UI-Design

### Haushalts-Übersicht (Kompakt)

```
┌─────────────────────────────────────────────────────────────┐
│  HAUSHALT 2026                              [Steueroptimiert ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │  BEDARF       │  │  RENTEN       │  │  ENTNAHME     │   │
│  │  71.000 €     │  │  30.000 €     │  │  41.000 €     │   │
│  │  pro Jahr     │  │  pro Jahr     │  │  aus Depots   │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│                                                             │
│  Runway: 38 Monate ✅  │  Equity: 62% ✅  │  Steuer: ~1.150 € │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Entnahmeempfehlung (Detail)

```
┌─────────────────────────────────────────────────────────────┐
│  ENTNAHME-EMPFEHLUNG                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤 PROFIL "PARTNERIN"                              │   │
│  │  ───────────────────────────────────────────────────│   │
│  │  Depot: 380.000 €  │  Rente: 1.000 €/M  │  Runway: 42M │ │
│  │                                                     │   │
│  │  → VERKAUFE: 25.000 €                              │   │
│  │  → Steuer:   ~600 € (2,4%)                         │   │
│  │                                                     │   │
│  │  Tranchen:                                         │   │
│  │  • VWCE 03/2019  8.000 € (Gewinn: 2.100 €)        │   │
│  │  • VWCE 09/2020 12.000 € (Gewinn: 2.800 €)        │   │
│  │  • VWCE 01/2021  5.000 € (Gewinn: 900 €)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👤 PROFIL "DU"                                     │   │
│  │  ───────────────────────────────────────────────────│   │
│  │  Depot: 450.000 €  │  Rente: 1.500 €/M  │  Runway: 35M │ │
│  │                                                     │   │
│  │  → VERKAUFE: 16.000 €                              │   │
│  │  → Steuer:   ~544 € (3,4%)                         │   │
│  │                                                     │   │
│  │  Tranchen:                                         │   │
│  │  • VWCE 01/2021 16.000 € (Gewinn: 2.100 €)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💰 ZUSAMMENFASSUNG                                 │   │
│  │  Gesamt-Steuer: 1.144 €                            │   │
│  │  vs. Proportional: 1.394 € → Ersparnis: 250 €     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Konfiguration

### Neue localStorage-Keys (Global)

| Key | Typ | Default | Beschreibung |
|-----|-----|---------|--------------|
| `household_mode_enabled` | boolean | `false` | Haushaltsmodus aktiv |
| `household_withdrawal_mode` | string | `'tax_optimized'` | Verteilungsschlüssel |

### Profil-Metadaten-Erweiterung

```javascript
// In rs_profiles_v1 Registry
profiles: {
    "profil-1": {
        meta: {
            id: "profil-1",
            name: "Ich",
            belongsToHousehold: true,  // NEU
            createdAt: "...",
            updatedAt: "..."
        },
        data: { ... }
    }
}
```

---

## Berechnungslogik

### Steueroptimierte Verteilung (Algorithmus)

```javascript
function calculateTaxOptimizedDistribution(profileInputs, totalWithdrawal) {
    // 1. Berechne Steuerlast/€ für jedes Profil
    const taxRates = profileInputs.map(p => ({
        profileId: p.profileId,
        taxPerEuro: calculateTaxPerEuro(p.inputs),
        maxWithdrawal: p.inputs.depotwertAlt + p.inputs.depotwertNeu
    }));

    // 2. Sortiere aufsteigend nach Steuerlast
    taxRates.sort((a, b) => a.taxPerEuro - b.taxPerEuro);

    // 3. Verteile Entnahme (niedrigste Steuerlast zuerst)
    let remaining = totalWithdrawal;
    const distribution = [];

    for (const rate of taxRates) {
        if (remaining <= 0) break;

        const amount = Math.min(remaining, rate.maxWithdrawal);
        distribution.push({
            profileId: rate.profileId,
            withdrawalAmount: amount,
            taxEstimate: amount * rate.taxPerEuro
        });
        remaining -= amount;
    }

    return distribution;
}

function calculateTaxPerEuro(inputs) {
    const { depotwertAlt, einstandAlt, depotwertNeu, einstandNeu } = inputs;
    const totalValue = depotwertAlt + depotwertNeu;
    const totalCost = einstandAlt + einstandNeu;

    if (totalValue <= 0) return 0;

    const gainRatio = (totalValue - totalCost) / totalValue;
    const taxRate = 0.26375; // KapESt + Soli
    const kirchensteuer = inputs.kirchensteuerSatz || 0;

    return gainRatio * taxRate * (1 + kirchensteuer);
}
```

### Tranchen-Auswahl (FIFO steueroptimiert)

```javascript
function selectTranchesForSale(tranches, targetAmount) {
    // Nur Equity-Tranchen
    const equityTranches = tranches
        .filter(t => t.type === 'equity')
        .map(t => ({
            ...t,
            taxPerEuro: (t.currentValue - t.costBasis) / t.currentValue * 0.26375
        }))
        .sort((a, b) => a.taxPerEuro - b.taxPerEuro); // Niedrigste Steuerlast zuerst

    let remaining = targetAmount;
    const selected = [];

    for (const tranche of equityTranches) {
        if (remaining <= 0) break;

        const sellAmount = Math.min(remaining, tranche.currentValue);
        const taxAmount = sellAmount * tranche.taxPerEuro;

        selected.push({
            tranche,
            sellAmount,
            taxAmount
        });
        remaining -= sellAmount;
    }

    return selected;
}
```

---

## Edge Cases

### E1: Nur ein Profil
- Haushaltsmodus nicht verfügbar
- Balance-App verhält sich wie bisher

### E2: Profil ohne Depot-Daten
- Wird in Aggregation übersprungen
- Warnung anzeigen: "Profil X hat keine Depot-Daten"

### E3: Alle Entnahme aus einem Profil
- Kann bei starkem Steuerunterschied passieren
- Ist korrekt, solange Liquidität ausreicht
- Warnung wenn Runway unter Minimum fällt

### E4: Rente > Bedarf
- Netto-Entnahme = 0
- Keine Verkaufsempfehlung nötig
- Zeige "Keine Entnahme erforderlich"

### E5: Depot erschöpft
- Wenn ein Depot leer ist, verteile auf andere
- Warnung wenn Gesamtdepot nicht ausreicht

---

## Testfälle

### T1: Basis-Szenario
```
Profil A: 450.000 € Depot, 18.000 € Rente, 36.000 € Bedarf
Profil B: 380.000 € Depot, 12.000 € Rente, 35.000 € Bedarf

Erwartet:
- Gesamtbedarf: 71.000 €
- Gesamtrente: 30.000 €
- Netto-Entnahme: 41.000 €
```

### T2: Steueroptimiert vs Proportional
```
Profil A: Steuerlast 3,4 ct/€
Profil B: Steuerlast 2,4 ct/€

Steueroptimiert: B verkauft mehr (niedrigere Steuerlast)
Proportional: Nach Depotgröße (A: 54%, B: 46%)
```

### T3: Keine Tranchen vorhanden
```
depot_tranchen = null

Erwartet:
- Zeige Empfehlung nur auf Depot-Ebene
- Keine Tranchen-Details
```

---

## Implementierungsreihenfolge

### Phase 1: Kernlogik (household-balance.js)
1. `loadHouseholdProfiles()` - Profile laden
2. `aggregateHouseholdInputs()` - Werte aggregieren
3. `calculateTaxPerEuro()` - Steuerlast berechnen
4. `calculateWithdrawalDistribution()` - Verteilung berechnen

### Phase 2: UI (household-balance-ui.js)
1. `renderHouseholdOverview()` - Übersicht
2. `renderWithdrawalRecommendation()` - Empfehlung
3. `toggleHouseholdMode()` - Modus-Wechsel

### Phase 3: Integration
1. Balance.html erweitern
2. balance-main.js anpassen
3. profile-storage.js: belongsToHousehold

### Phase 4: Tests
1. Unit-Tests für Berechnungslogik
2. Integration-Tests für UI
3. Edge-Case-Tests

---

## Abhängigkeiten

- `profile-storage.js` - Profilverwaltung (existiert)
- `household-inputs.js` - Input-Aggregation (existiert, kann wiederverwendet werden)
- `balance-reader.js` - Input-Reading (existiert)
- `balance-renderer.js` - Basis-Rendering (existiert)

---

## Offene Fragen

1. **Monatliche vs. jährliche Anzeige?**
   - Aktuell: Balance zeigt monatliche Entnahme
   - Haushalt: Jährliche Verkaufsempfehlung sinnvoller?

2. **Synchronisation mit Simulator?**
   - Soll die Haushalts-Balance die gleichen Verteilungsschlüssel wie der Simulator nutzen?

3. **Persistierung der Empfehlung?**
   - Soll die letzte Empfehlung gespeichert werden?
   - Historische Vergleiche ermöglichen?
