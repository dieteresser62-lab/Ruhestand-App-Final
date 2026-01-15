# Multi-Tranchen Portfolio System - Anleitung

## 🎯 Überblick

Das Multi-Tranchen-System ermöglicht die **detaillierte Verwaltung einzelner Depot-Positionen** mit individuellen Kaufpreisen, Kaufdaten und Steuermerkmalen. Dies ist besonders wichtig für:

- **Präzise Steuerberechnung**: Jede Position hat unterschiedliche Gewinnquoten und Teilfreistellungen
- **Steueroptimierte Verkaufslogik**: Geringste Steuerlast zuerst (Kaufdatum als Tie-Breaker)
- **Altbestände vor 2009**: Steuerfreie Positionen (Spekulationsfrist) korrekt berücksichtigen
- **Transparente Simulation**: Realistische Abbildung des tatsächlichen Depots

---

## 📁 Dateien

### Neu hinzugefügt:
1. **`depot-tranchen-manager.html`** - Eigenständiges Tool zur Verwaltung der Tranchen
2. **`tranche-config-example.js`** - Beispiel-Konfiguration mit Ihren Positionen
3. **`MULTI-TRANCHEN-ANLEITUNG.md`** - Diese Dokumentation

### Erweitert:
1. **`simulator-portfolio.js`** - Neue Funktion `initializePortfolioDetailed()`
2. **`engine/transactions/TransactionEngine.mjs`** - steueroptimierte Verkaufslogik

---

## 🚀 Schnellstart

### Schritt 1: Depot-Tranchen-Manager öffnen

```bash
# Öffnen Sie die Datei im Browser:
depot-tranchen-manager.html
```

### Schritt 2: Beispiel laden

1. Klicken Sie auf **"📥 Beispiel laden"**
2. Die Beispiel-Daten mit Ihren realen Positionen werden geladen
3. Passen Sie die Werte an (Stückzahlen, Preise, Kaufdaten)

### Schritt 3: Tranchen anpassen

Für jede Position:
- **Name**: z.B. "SAP SE"
- **ISIN**: z.B. "DE0007164600"
- **Stücke**: Anzahl der gehaltenen Anteile
- **Kaufpreis**: Ursprünglicher Preis pro Stück
- **Aktueller Kurs**: Heutiger Preis (wird für Marktwert verwendet)
- **Kaufdatum**: Optional (nur als Tie-Breaker, wenn Steuerlast gleich ist)
- **TQF (Tax Quota Free)**:
  - `1.0` = 100% steuerfrei (Altbestände vor 2009)
  - `0.30` = 30% Teilfreistellung (Standard Aktienfonds)
  - `0.0` = Voll steuerpflichtig

### Schritt 4: Exportieren

1. Klicken Sie auf **"💾 Export JSON"**
2. Eine JSON-Datei wird heruntergeladen
3. Diese Datei enthält alle Ihre Tranchen

---

## 🔧 Ihre Depot-Positionen

Basierend auf Ihren Angaben:

| Position | Stücke | Kaufpreis | Gewinn | TQF | Kategorie |
|----------|--------|-----------|--------|-----|-----------|
| **SAP SE** | 352 | ca. Jahr 2000 | ? | **1.0** (steuerfrei) | Alt |
| **UBS MSCI World DLAD** | 1312 | 145,42€ | 121,88% | 0.30 | Alt |
| **Vanguard FTSE DLD** | 3304 | 72,36€ | 100,94% | 0.30 | Alt |
| **X(IE)-MSCIACWLDSC 1C** | 3000 | 19,04€ | 136,40% | 0.30 | Alt |
| **Vanguard FTSE DLA** | 6270 | 135,62€ | 9,82% | 0.30 | Neu |
| **XTR.II EUR OV.RATE SW.** | 1900 | 147,15€ | 0,67% | 0.30 | Geldmarkt |

### ⚠️ Wichtige Hinweise:

1. **SAP ist steuerfrei** (TQF = 1.0), da vor 2009 gekauft (Altbestand unter Spekulationsfrist)
2. Für **SAP** sollten Sie einen geschätzten Kaufpreis eingeben oder den aktuellen Marktwert nutzen
3. Der **Vanguard FTSE DLA (IE00BK5BQT80)** wird als Referenz-Kurs für die Marktbewertung genutzt

---

## 🧮 Steueroptimierte Verkaufslogik

### Was bedeutet "steueroptimiert"?

Das System verkauft **zuerst die Tranchen mit der geringsten Steuerlast**. Die Steuerlast ergibt sich aus Gewinnquote, Teilfreistellung (TQF) und Steuersatz. Kaufdatum wird nur als Tie-Breaker genutzt.

### Wie funktioniert es?

1. Alle Tranchen werden nach **Steuerlast pro EUR** sortiert (niedrigste zuerst)
2. Bei Verkauf wird in dieser Reihenfolge verkauft
3. **Ausnahme**: Im defensiven Kontext kann Gold priorisiert werden (Asset-Allokation vor Steueroptimierung)

### Beispiel:

Angenommen, Sie muessen 50.000 EUR verkaufen:

```
Verkaufsreihenfolge (steueroptimiert):
1. Vanguard DLA Neu (2023) - ~50.000 EUR -> ~600 EUR Steuer

Gesamt: 50.000 EUR brutto, ~49.400 EUR netto
```

-> **Steueroptimierung reduziert hier die Steuerlast deutlich**.

## 📊 Integration in Simulator / Balance App

### ✅ Automatische Integration (BEREITS IMPLEMENTIERT!)

Die Tranchen werden **automatisch** aus dem localStorage geladen, sobald Sie sie im Depot-Tranchen-Manager gespeichert haben.

**So funktioniert es:**

1. **Sie verwalten Tranchen** im Depot-Tranchen-Manager
2. **Tranchen werden gespeichert** im Browser (localStorage unter Key `depot_tranchen`)
3. **Balance & Simulator laden automatisch** die Tranchen beim Start
4. **Status-Badge zeigt** ob Tranchen geladen sind

**Implementierungs-Details:**

```javascript
// balance-reader.js & simulator-portfolio.js (automatisch):
const saved = localStorage.getItem('depot_tranchen');
if (saved) {
    detailledTranches = JSON.parse(saved);
    console.log('✅ Detaillierte Depot-Tranchen geladen:', detailledTranches.length, 'Positionen');
}

// Tranchen werden automatisch in inputs-Objekt eingefügt:
inputs.detailledTranches = detailledTranches;
```

**Status-Anzeige:**

In beiden Apps (Balance & Simulator) sehen Sie einen Status-Badge:

- ✅ **Grünes Badge**: "X Tranchen geladen (steueroptimiert)" → Detaillierte Tranchen werden verwendet
- ℹ️ **Graues Badge**: "Keine detaillierten Tranchen geladen" → Vereinfachtes Alt/Neu-Modell wird verwendet

### Methode 2: JSON-Import

1. Exportieren Sie Ihre Tranchen aus dem Manager
2. Importieren Sie die JSON-Datei in Ihrer App
3. Nutzen Sie die Daten für Berechnungen

```javascript
// JSON laden
import { DEPOT_TRANCHEN } from './meine-tranchen.json';

// An inputs anhängen
inputs.detailledTranches = DEPOT_TRANCHEN;
```

### Methode 3: Direkt in Code

```javascript
const inputs = {
    // ... andere Inputs
    detailledTranches: [
        {
            name: "SAP SE",
            isin: "DE0007164600",
            shares: 352,
            purchasePrice: 50,
            currentPrice: 150,
            purchaseDate: "2000-06-15",
            tqf: 1.0,
            category: "equity",
            type: "aktien_alt"
        },
        // ... weitere Tranchen
    ]
};
```

---

## 💾 Persistenz & Speicherung

### Wo werden die Daten gespeichert?

Die Tranchen werden im **Browser-localStorage** gespeichert:

```
Speicherort: localStorage
Key: 'depot_tranchen'
Format: JSON-Array mit allen Tranchen
```

### Was bedeutet das?

✅ **Vorteile:**
- Daten bleiben **dauerhaft** gespeichert (auch nach Browser-Neustart)
- **Keine Cloud** nötig, alles bleibt auf Ihrem Gerät
- **Schnell** und **offline** verfügbar
- **Automatisch synchronisiert** zwischen Tabs im selben Browser

⚠️ **Einschränkungen:**
- Daten sind **pro Browser/Gerät** (Chrome ≠ Firefox ≠ Edge)
- Daten sind **pro Computer** (Desktop ≠ Laptop ≠ Smartphone)
- Bei Browser-Cache löschen gehen Daten verloren (siehe Backup!)

### 🔄 Multi-Gerät-Nutzung

**Szenario:** Sie möchten auf mehreren Geräten arbeiten

**Lösung:**
1. Exportieren Sie Ihre Tranchen als JSON (Button "💾 Export JSON" im Manager)
2. Speichern Sie die JSON-Datei z.B. in Dropbox/OneDrive/Google Drive
3. Importieren Sie die Datei auf dem anderen Gerät (Button "📂 Import JSON")

**Empfehlung:** Exportieren Sie regelmäßig als Backup!

### 🔁 Synchronisation zwischen Apps

**Balance.html**, **Simulator.html** und **Depot-Tranchen-Manager** teilen sich denselben localStorage:

```
Depot-Tranchen-Manager speichert
              ↓
      localStorage['depot_tranchen']
              ↓
Balance & Simulator laden automatisch
```

**Live-Update:**
- Öffnen Sie Balance.html in Tab 1
- Öffnen Sie Depot-Tranchen-Manager in Tab 2
- Ändern Sie eine Tranche im Manager
- Balance.html aktualisiert automatisch alle 5 Sekunden

---

## 🧪 Steuerberechnung

### Formel pro Tranche:

```javascript
Bruttogewinn = Verkaufsbetrag × ((Marktwert - Einstand) / Marktwert)
GewinnNachTFS = Bruttogewinn × (1 - TQF)
Steuerbasis = GewinnNachTFS - SparerPauschbetrag
Steuer = Steuerbasis × KESt (ca. 26,375% mit Soli + ggf. KiSt)
NettoErlös = Verkaufsbetrag - Steuer
```

### Beispiel SAP (steuerfrei):

```
Verkauf: 20.000€
TQF: 1.0 (100% steuerfrei)
→ GewinnNachTFS = 0€
→ Steuer = 0€
→ NettoErlös = 20.000€
```

### Beispiel Vanguard DLA (neu, niedriger Gewinn):

```
Verkauf: 20.000€
Einstand: 18.215€ (Gewinn: 9,82%)
Bruttogewinn: 20.000€ × 0.0982 = 1.964€
TQF: 0.30 (30% Teilfreistellung)
GewinnNachTFS: 1.964€ × 0.70 = 1.375€
Steuerbasis: 1.375€ - 1.000€ (SPB) = 375€
Steuer: 375€ × 0.26375 = ~99€
NettoErlös: 20.000€ - 99€ = 19.901€
```

---

## 🎨 UI-Anpassungen

### Balance.html anpassen (optional):

Fügen Sie ein neues Panel für detaillierte Tranchen hinzu:

```html
<div class="form-section">
    <h3>📊 Depot-Tranchen (erweitert)</h3>
    <p>Verwalten Sie Ihre Positionen detailliert für präzise Steuerberechnung.</p>
    <button onclick="window.open('depot-tranchen-manager.html', '_blank')">
        Tranchen-Manager öffnen
    </button>
    <div id="tranchenSummary"></div>
</div>
```

### Anzeige der geladenen Tranchen:

```javascript
function displayTranchenSummary() {
    const tranches = JSON.parse(localStorage.getItem('depot_tranchen') || '[]');
    const summary = document.getElementById('tranchenSummary');

    if (tranches.length === 0) {
        summary.innerHTML = '<p>Keine detaillierten Tranchen geladen.</p>';
        return;
    }

    const totalValue = tranches.reduce((sum, t) => sum + t.marketValue, 0);
    summary.innerHTML = `
        <p>✅ ${tranches.length} Tranchen geladen</p>
        <p>Gesamtwert: ${totalValue.toLocaleString('de-DE')} €</p>
    `;
}
```

---

## 🐛 Troubleshooting

### Problem: "Tranchen werden nicht geladen"

**Lösung**: Prüfen Sie, ob die Tranchen im localStorage gespeichert sind:

```javascript
console.log(localStorage.getItem('depot_tranchen'));
```

### Problem: "Verkaufsreihenfolge stimmt nicht"

**Lösung**: Stellen Sie sicher, dass alle Tranchen ein `purchaseDate` Feld haben. Tranchen ohne Datum werden ans Ende sortiert.

### Problem: "Steuerberechnung weicht ab"

**Lösung**: Prüfen Sie die TQF-Werte:
- Altbestände vor 2009: TQF = 1.0
- Aktienfonds: TQF = 0.30
- Anleihen-ETFs: TQF = 0.15

---

## 📞 Nächste Schritte

1. ✅ **Depot-Tranchen-Manager öffnen** und Ihre Positionen eingeben
2. ✅ **SAP-Position** konfigurieren (TQF = 1.0, geschätzter Kaufpreis)
3. ✅ **Kaufdaten ergänzen** (optional, nur als Tie-Breaker)
4. ✅ **Aktuelle Kurse** aktualisieren
5. ✅ **JSON exportieren** als Backup
6. ⏳ Integration in Balance.html / Simulator.html (optional)

---

## 💡 Tipps

- **Regelmäßig aktualisieren**: Kurse und Positionen sollten regelmäßig aktualisiert werden
- **Backup**: Exportieren Sie Ihre Tranchen regelmäßig als JSON
- **Kaufdaten dokumentieren**: Je genauer die Kaufdaten, desto präziser die Simulation
- **Gold noch kaufen**: Sie haben erwähnt, dass der Gold-ETC noch gekauft werden muss

---

## 📚 Weiterführende Informationen

- `tranche-config-example.js` - Vollständiges Beispiel mit Ihren Positionen
- `simulator-portfolio.js` - Backend-Logik für Portfolio-Verwaltung
- `engine/transactions/TransactionEngine.mjs` - steueroptimierte Verkaufslogik und Steuerberechnung

---

Erstellt: 2026-01-13
Version: 1.0
