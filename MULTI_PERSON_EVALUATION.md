# Multi-Person Portfolio Management: Architektur-Evaluation

**Datum:** 2025-01-15
**Status:** Evaluation-Phase
**Ziel:** Verwaltung mehrerer Depots (User: 2,5M€ + Partnerin: 250k€) mit individuellen UND gemeinsamen Features

---

## Use-Cases

### Individuelle Features (pro Person)
- ✅ Separate Tranchen-Verwaltung (User: 6 Tranchen, Partnerin: 4 Tranchen)
- ✅ Individuelle Jahresabschlüsse
- ✅ Separate Balance-Apps (eigene Historie)
- ✅ Eigene Risikoprofile

### Gemeinsame Features (Haushalt)
- ✅ Monte Carlo mit kombiniertem Portfolio (2,75M€)
- ✅ Gemeinsame Entnahme-Strategie (Floor/Flex für Haushalt)
- ✅ Szenarien (Tod eines Partners, Dual-Care)
- ✅ Cross-Depot Tax-Optimization (verkaufe aus steueroptimalem Depot)

---

## Aktuelle Architektur (Analyse)

### localStorage Keys (Hardcoded)
```javascript
// balance-config.js
LS_KEY: 'ruhestandsmodellValues_v29_guardrails'  // Balance State
SNAPSHOT_PREFIX: 'ruhestandsmodell_snapshot_'     // Snapshots

// depot-tranchen-status.js
'depot_tranchen'  // Alle Tranchen
```

### Problem
- **Single-User-Design:** Nur ein Balance-State, nur ein Tranchen-Set
- **Keine Profile:** Kein Konzept von "User" vs "Partnerin"
- **Hardcoded Keys:** Alle Zugriffe direkt auf feste localStorage-Keys

### Was bereits Multi-Person-fähig ist
✅ **Simulator:** Hat Person 1 + Person 2 (Alter, Geschlecht, Rente)
✅ **Snapshot-Labels:** Können Profilnamen enthalten ("Dieter_2025-...")
❌ **Balance-App:** Komplett Single-User
❌ **Tranchen-Manager:** Nur ein Depot
❌ **Engine:** Nimmt ein Portfolio, keine Multi-Depot-Logic

---

## Architektur-Optionen

### **Option A: Profile-Namespace (Empfohlen für Phase 1)**

#### Konzept
```javascript
// localStorage Keys mit Profile-Prefix
const PROFILE = 'USER';  // oder 'PARTNERIN' oder 'GEMEINSAM'

LS_KEY = `ruhestandsmodell_${PROFILE}_v29_guardrails`
TRANCHEN_KEY = `depot_tranchen_${PROFILE}`
SNAPSHOT_KEY = `snapshot_${PROFILE}_`

// Beispiel:
'ruhestandsmodell_USER_v29_guardrails'      → Dieter's Balance
'ruhestandsmodell_PARTNERIN_v29_guardrails' → Partner's Balance
'ruhestandsmodell_GEMEINSAM_v29_guardrails' → Household Balance

'depot_tranchen_USER'      → 6 Tranchen
'depot_tranchen_PARTNERIN' → 4 Tranchen
```

#### UI-Änderungen
```html
<!-- Balance.html / Simulator.html -->
<div class="profile-switcher">
    <select id="activeProfile">
        <option value="USER">👤 Dieter (2,5M€)</option>
        <option value="PARTNERIN">👤 Partnerin (250k€)</option>
        <option value="GEMEINSAM">👫 Gemeinsam (2,75M€)</option>
    </select>
</div>
```

#### Implementierungs-Schritte
1. **Config-Änderung:**
   - `balance-config.js`: LS_KEY wird dynamisch basierend auf `activeProfile`
   - `depot-tranchen-status.js`: TRANCHEN_KEY wird dynamisch

2. **Profile-Manager erstellen:**
   ```javascript
   // profile-manager.js
   export const ProfileManager = {
       getActiveProfile() {
           return localStorage.getItem('activeProfile') || 'USER';
       },
       setActiveProfile(profile) {
           localStorage.setItem('activeProfile', profile);
           window.location.reload(); // Reload app with new profile
       },
       getProfiles() {
           return [
               { id: 'USER', name: 'Dieter', value: 2500000 },
               { id: 'PARTNERIN', name: 'Partnerin', value: 250000 }
           ];
       }
   };
   ```

3. **Storage-Manager erweitern:**
   ```javascript
   // balance-storage.js
   import { ProfileManager } from './profile-manager.js';

   loadState() {
       const profile = ProfileManager.getActiveProfile();
       const key = `ruhestandsmodell_${profile}_v29_guardrails`;
       const data = localStorage.getItem(key);
       // ...
   }
   ```

4. **UI: Profile-Switcher in Header:**
   - Balance.html: Dropdown oben rechts
   - Simulator.html: Dropdown oben rechts
   - Tranchen-Manager: Dropdown oben rechts

#### Vorteile
✅ **Einfach zu implementieren** (2-3 Tage)
✅ **Keine Engine-Änderungen** (Balance/Simulator unverändert)
✅ **Backward-Compatible** (alte Daten werden zu 'USER' migriert)
✅ **Klare Separation** (jedes Profil komplett isoliert)

#### Nachteile
⚠️ **Keine simultane Ansicht** (nur ein Profil gleichzeitig)
⚠️ **Gemeinsam-Profil manuell pflegen** (Summe aus USER + PARTNERIN)
⚠️ **Reload bei Switch** (State muss neu geladen werden)

#### Aufwand: **2-3 Tage**

---

### **Option B: Multi-Depot Balance-App (Phase 2)**

#### Konzept
```javascript
// Balance-State enthält ALLE Depots
state = {
    depots: {
        USER: {
            portfolio: { depotwertAlt: 2000000, ... },
            lastState: { flexRate: 0.8, ... },
            tranchen: [T001, T002, ..., T006]
        },
        PARTNERIN: {
            portfolio: { depotwertNeu: 250000, ... },
            lastState: { flexRate: 1.0, ... },
            tranchen: [T007, T008, T009, T010]
        }
    },
    household: {
        combinedPortfolio: { ... },  // Auto-berechnet
        sharedFloor: 45000,
        sharedFlex: 20000
    }
}
```

#### UI: Side-by-Side View
```html
<div class="multi-depot-view">
    <div class="depot-column">
        <h3>👤 Dieter (2,5M€)</h3>
        <div class="portfolio-card">
            <!-- Balance-Felder für User -->
        </div>
    </div>

    <div class="depot-column">
        <h3>👤 Partnerin (250k€)</h3>
        <div class="portfolio-card">
            <!-- Balance-Felder für Partnerin -->
        </div>
    </div>

    <div class="household-summary">
        <h3>👫 Haushalt (2,75M€)</h3>
        <div class="combined-metrics">
            <!-- Aggregierte KPIs -->
        </div>
    </div>
</div>
```

#### Vorteile
✅ **Alles auf einen Blick** (kein Profil-Switching)
✅ **Echte Household-Logic** (gemeinsame Floor/Flex)
✅ **Cross-Depot-Optimization** möglich

#### Nachteile
❌ **UI-Komplexität massiv** (Desktop wird eng bei 2 Depots)
❌ **Engine-Anpassungen nötig** (Multi-Portfolio-Support)
❌ **Breaking Change** (alte Balance-App inkompatibel)
❌ **Testing-Aufwand hoch** (neue Parity-Tests)

#### Aufwand: **3-4 Wochen**

---

### **Option C: Aggregator-Service (Phase 3)**

#### Konzept
```javascript
// Separate Apps + Aggregation
Balance_USER.html      → Lädt Profile 'USER'
Balance_PARTNERIN.html → Lädt Profile 'PARTNERIN'
Balance_Household.html → Aggregiert beide

// Aggregator
HouseholdAggregator = {
    loadAllDepots() {
        return {
            user: loadState('USER'),
            partner: loadState('PARTNERIN')
        };
    },
    combinePortfolios(depots) {
        return {
            depotwertAlt: depots.user.depotwertAlt + depots.partner.depotwertAlt,
            depotwertNeu: depots.user.depotwertNeu + depots.partner.depotwertNeu,
            // ... merge all fields
        };
    },
    optimizeSale(depots, amount) {
        // Cross-depot tax-optimization
        // Verkaufe aus steueroptimalem Depot
    }
};
```

#### Vorteile
✅ **Modular** (jede App eigenständig)
✅ **Flexibel** (einfach neue Profile hinzufügen)
✅ **Klare Separation of Concerns**

#### Nachteile
❌ **Maintenance-Overhead** (3 Apps statt 1)
❌ **Synchronisation schwierig** (wer hat welche Version?)
❌ **User-Confusion** ("Welche App öffne ich?")

#### Aufwand: **4-6 Wochen**

---

## Gemeinsame Features: Implementation

### **1. Monte Carlo mit Multi-Depot**

#### Ansatz 1: Pre-Merge (einfach)
```javascript
// Simulator lädt beide Profile, merged vor Simulation
const userPortfolio = loadProfile('USER').portfolio;
const partnerPortfolio = loadProfile('PARTNERIN').portfolio;
const combinedPortfolio = mergePortfolios([userPortfolio, partnerPortfolio]);

// Normale Simulation mit combined Portfolio
runMonteCarloSimulation({ portfolio: combinedPortfolio, ... });
```

✅ **Keine Engine-Änderungen**
⚠️ **Verliert Info welcher Tranche von wem ist**

#### Ansatz 2: Multi-Depot-Engine (komplex)
```javascript
// Engine simuliert beide Depots parallel
runMonteCarloSimulation({
    depots: [
        { owner: 'USER', portfolio: userPortfolio },
        { owner: 'PARTNERIN', portfolio: partnerPortfolio }
    ],
    withdrawalStrategy: 'JOINT'  // oder 'SEQUENTIAL' oder 'OPTIMIZED'
});

// Engine entscheidet Jahr für Jahr:
// "Verkaufe 30k aus USER (steuerfrei Alt-Bestand)"
// "Verkaufe 20k aus PARTNERIN (liquide Geldmarkt)"
```

✅ **Cross-Depot Tax-Optimization**
✅ **Realistische Szenarien** (wer stirbt wann?)
❌ **Massive Engine-Änderungen**

#### Empfehlung: **Phase 1 = Ansatz 1, Phase 2 = Ansatz 2**

---

### **2. Szenarien (Tod, Dual-Care)**

#### Current: Simulator hat Person 1 + Person 2
```javascript
// Bereits implementiert:
inputs.alter1 = 65;
inputs.geschlecht1 = 'male';
inputs.alter2 = 63;
inputs.geschlecht2 = 'female';

// Mortalität:
if (person1Dies) {
    // Partner erbt Portfolio von Person 1
    // Rente geht auf Witwenrente
}
```

#### Neu: Portfolio-Attribution
```javascript
// Mit Multi-Depot:
if (person1Dies) {
    // USER-Portfolio geht an PARTNERIN
    partnerPortfolio += userPortfolio;
    userPortfolio = 0;

    // Aber: Tranchen behalten Tax-Status!
    // USER's Alt-Bestand bleibt steuerfrei
}
```

✅ **Bereits 90% implementiert** (Mortalität + Witwenrente)
⚠️ **Nur Portfolio-Attribution fehlt**

---

### **3. Cross-Depot Tax-Optimization**

#### Problem
```
Haushalt braucht 50k€ Entnahme

USER Portfolio:
- Alt-Bestand: 2.000.000€ (100% steuerfrei)
- Neu-Bestand: 500.000€ (30% TQF)

PARTNERIN Portfolio:
- Geldmarkt: 150.000€ (0% Steuern, aber keine Gains)
- Neu-Bestand: 100.000€ (30% TQF)

Optimal:
1. 30k€ aus USER Alt-Bestand (0€ Steuer)
2. 20k€ aus PARTNERIN Geldmarkt (0€ Steuer)
Total: 0€ Steuer statt ~3.300€ bei naivem Split
```

#### Implementation
```javascript
// TransactionEngine erweitern
optimizeSaleAcrossDepots(depots, amount) {
    // 1. Sammle alle Tranchen aus allen Depots
    const allTranches = [];
    for (const [owner, depot] of Object.entries(depots)) {
        for (const tranche of depot.tranchen) {
            allTranches.push({ ...tranche, owner });
        }
    }

    // 2. Sortiere nach Tax-Burden/EUR (wie bisher)
    allTranches.sort((a, b) => a.taxBurden - b.taxBurden);

    // 3. Verkaufe FIFO über alle Depots
    let remaining = amount;
    const sales = [];
    for (const tranche of allTranches) {
        if (remaining <= 0) break;
        const saleAmount = Math.min(remaining, tranche.marketValue);
        sales.push({ owner: tranche.owner, tranche, amount: saleAmount });
        remaining -= saleAmount;
    }

    return sales;  // z.B. [{ owner: 'USER', tranche: T001, amount: 30000 }, ...]
}
```

✅ **Konzeptionell einfach** (bestehende Tax-Logic erweitern)
⚠️ **Engine muss Multi-Depot verstehen**

---

## Empfehlung: Phased Approach

### **Phase 1: Profile-Namespace (2-3 Tage)**
**Ziel:** Separate Depots verwalten können

**Deliverables:**
1. ✅ Profile-Switcher in UI (Dropdown)
2. ✅ Dynamische localStorage Keys
3. ✅ Migration: Alte Daten → 'USER' Profile
4. ✅ Separate Tranchen pro Profil
5. ✅ Separate Jahresabschlüsse

**Testing:**
- User-Profil: 6 Tranchen, Jahresabschluss funktioniert
- Partner-Profil: 4 Tranchen, unabhängig von User
- Switch zwischen Profilen ohne Datenverlust

**Aufwand:** 2-3 Tage
**Risiko:** Niedrig (keine Engine-Änderungen)

---

### **Phase 2: Gemeinsame Simulation (1 Woche)**
**Ziel:** Monte Carlo mit kombiniertem Portfolio

**Deliverables:**
1. ✅ "Gemeinsam"-Profil erstellen
2. ✅ Aggregator: USER + PARTNERIN → GEMEINSAM Portfolio
3. ✅ Simulator lädt GEMEINSAM-Profil
4. ✅ Monte Carlo mit Household-Portfolio

**Implementation:**
```javascript
// Neuer Button in Balance: "Haushalt-Portfolio erstellen"
createHouseholdProfile() {
    const user = loadProfile('USER');
    const partner = loadProfile('PARTNERIN');

    const household = {
        portfolio: mergePortfolios([user.portfolio, partner.portfolio]),
        tranchen: [...user.tranchen, ...partner.tranchen],
        // Floor/Flex für Haushalt (nicht doppelt!)
        floorBedarf: user.floorBedarf,  // Nicht user + partner!
        flexBedarf: user.flexBedarf
    };

    saveProfile('GEMEINSAM', household);
}
```

**Testing:**
- Haushalt-Portfolio = Summe beider Einzeldepots
- Monte Carlo zeigt realistische Success-Rate
- Szenarien (Tod) funktionieren

**Aufwand:** 1 Woche
**Risiko:** Mittel (Merge-Logic muss korrekt sein)

---

### **Phase 3: Cross-Depot Tax-Optimization (2-3 Wochen)**
**Ziel:** Engine entscheidet aus welchem Depot verkauft wird

**Deliverables:**
1. ✅ Engine-Erweiterung: Multi-Depot-Support
2. ✅ TransactionEngine: optimizeSaleAcrossDepots()
3. ✅ Simulator: zeigt pro Jahr welches Depot verkauft
4. ✅ Balance: "Empfehlung: Verkaufe 30k aus USER (steuerfrei)"

**Engine-Änderungen:**
```javascript
// TransactionEngine.mjs
export function determineAction(inputs) {
    // Neu: inputs.depots statt inputs.portfolio
    if (inputs.depots) {
        return optimizeSaleAcrossDepots(inputs.depots, entnahmeBedarf);
    } else {
        // Fallback: Single-Portfolio (backward-compatible)
        return determineSingleAction(inputs.portfolio, entnahmeBedarf);
    }
}
```

**Testing:**
- Vergleich: Single-Depot vs Multi-Depot Tax
- Monte Carlo: Lifetime-Tax mit Multi-Depot < Single
- Parity: Multi-Depot-Engine = Summe von 2× Single-Depot-Engine

**Aufwand:** 2-3 Wochen
**Risiko:** Hoch (Engine-Änderungen, Parity-Tests kritisch)

---

## Migration Strategy

### Alte Daten (Single-User) → Multi-Profile

```javascript
// migration-multi-profile.js
export function migrateToMultiProfile() {
    // 1. Check if migration needed
    if (localStorage.getItem('multiProfileMigrated')) return;

    // 2. Load old data
    const oldState = localStorage.getItem('ruhestandsmodellValues_v29_guardrails');
    const oldTranchen = localStorage.getItem('depot_tranchen');

    // 3. Migrate to USER profile
    if (oldState) {
        localStorage.setItem('ruhestandsmodell_USER_v29_guardrails', oldState);
    }
    if (oldTranchen) {
        localStorage.setItem('depot_tranchen_USER', oldTranchen);
    }

    // 4. Set default profile
    localStorage.setItem('activeProfile', 'USER');

    // 5. Mark as migrated
    localStorage.setItem('multiProfileMigrated', 'true');

    console.log('✅ Migration zu Multi-Profile abgeschlossen');
}
```

**Run on App-Start:**
```javascript
// balance-main.js / simulator-main.js
import { migrateToMultiProfile } from './migration-multi-profile.js';

// Vor allem anderen:
migrateToMultiProfile();
```

---

## Risiken & Mitigationen

### **Risiko 1: Datenverlust bei Profile-Switch**
**Problem:** User wechselt Profil, vergisst zu speichern, Daten weg

**Mitigation:**
- Auto-Save bei Profile-Switch
- Confirmation-Dialog: "Nicht gespeicherte Änderungen gehen verloren. Fortfahren?"
- Backup vor jedem Switch

### **Risiko 2: Synchronisation Gemeinsam-Profil**
**Problem:** User updated USER-Depot, aber GEMEINSAM-Profil nicht aktualisiert

**Mitigation:**
- GEMEINSAM ist read-only (wird immer frisch berechnet)
- Button: "🔄 Haushalt-Portfolio aktualisieren" statt manuelles Editieren
- Timestamp zeigt wann zuletzt aktualisiert

### **Risiko 3: Engine-Bugs bei Multi-Depot**
**Problem:** Cross-Depot-Verkäufe führen zu falschen Steuern

**Mitigation:**
- Extensive Tests: Multi-Depot vs 2× Single-Depot
- Golden-Master-Testing (Excel-Backtests für Multi-Depot)
- Phased Rollout: Phase 2 vor Phase 3 ausgiebig testen

### **Risiko 4: UI-Verwirrung**
**Problem:** User weiß nicht welches Profil gerade aktiv ist

**Mitigation:**
- Prominent: Großer Indicator oben (z.B. "👤 Aktiv: Dieter")
- Farbcodierung: User = Blau, Partnerin = Grün, Gemeinsam = Lila
- Breadcrumb: "Balance > Dieter > Jahresabschluss 2024"

---

## Performance-Implikationen

### **localStorage Size**
```
Aktuell (Single-User):
- Balance State: ~5 KB
- 6 Tranchen: ~2 KB
- Snapshots (10 Jahre): ~50 KB
Total: ~57 KB

Mit Multi-Profile (3 Profile):
- 3× Balance State: ~15 KB
- 10 Tranchen total: ~3 KB
- 3× Snapshots: ~150 KB
Total: ~168 KB
```

**localStorage Limit:** 5-10 MB (Browser-abhängig)
**Usage:** <1% → ✅ Kein Problem

### **Monte Carlo Performance**
```
Single-Depot (100k Runs):
- ~40 Sekunden (mit Web Workers)

Multi-Depot (100k Runs):
- Phase 1 (Pre-Merge): ~40 Sekunden (gleich)
- Phase 3 (Cross-Depot): ~50-60 Sekunden (+25% wegen Tax-Optimization über mehr Tranchen)
```

✅ **Akzeptabel** (1 Minute statt 40 Sekunden)

---

## Conclusion & Next Steps

### **Empfohlener Weg: Phase 1 (Profile-Namespace)**

**Warum:**
1. ✅ **Schnell** (2-3 Tage statt Wochen)
2. ✅ **Risikoarm** (keine Engine-Änderungen)
3. ✅ **Sofortiger Nutzen** (Partnerin-Depot sofort verwaltbar)
4. ✅ **Fundament** für Phase 2+3

**Was Sie SOFORT können:**
- Partnerin's 250k€ Depot in Suite einpflegen
- Separate Tranchen-Verwaltung
- Individuelle Jahresabschlüsse
- Parallele Balance-Apps (User/Partner)

**Was dann fehlt:**
- Gemeinsame Monte Carlo (kommt Phase 2)
- Cross-Depot Tax-Optimization (kommt Phase 3)
- Side-by-Side View (optional, Phase 2+)

### **Nächste Schritte:**

1. **Entscheidung:** Phase 1 starten? (Ja/Nein)
2. **Design-Review:** Profile-Switcher UI-Mockup
3. **Implementation:**
   - Tag 1: Profile-Manager + Config-Änderungen
   - Tag 2: UI-Integration + Migration
   - Tag 3: Testing + Bugfixes
4. **Rollout:** Ihre 6 Tranchen → USER, Partnerin einpflegen → PARTNERIN

---

## Offene Fragen

1. **Profile-Namen:** "USER/PARTNERIN" oder "Dieter/[Name]"?
2. **Gemeinsam-Profil:** Auto-generiert oder manuell erstellt?
3. **Tax-Optimization Priorität:** Phase 3 wichtig oder "nice-to-have"?
4. **Side-by-Side View:** Gewünscht oder Profile-Switch ausreichend?
5. **Mobile:** Relevant für Multi-Person? (vermutlich nein)

---

**Status:** Ready for Decision
**Recommendation:** Start Phase 1 (Profile-Namespace) - 2-3 Tage Aufwand, sofortiger Nutzen
**Risk:** Low (backward-compatible, no Engine changes)
