# Quickstart: Ruhestand-Suite

Schnelleinstieg für Einzelpersonen und Paare zur Entnahmeplanung im Ruhestand.

---

## Start in 2 Minuten

### Option A: Windows-EXE (einfachste Variante)

1. `RuhestandSuite.exe` herunterladen
2. Doppelklick → App startet automatisch im Browser
3. Fertig.

### Option B: Browser-Version

1. Repository herunterladen/entpacken
2. Doppelklick auf `start_suite.cmd`
3. Browser öffnet sich automatisch

> **Voraussetzung:** Für Online-Kurse (optional) muss Node.js installiert sein.

---

## Vorarbeit: Profile und Tranchen einrichten

Bevor Sie mit der eigentlichen Planung beginnen, sollten Sie Ihre Daten einmalig konfigurieren.

### 1. Profil anlegen (index.html)

Die Startseite (`index.html`) ist die zentrale Profilverwaltung:

1. **Neues Profil erstellen:** Name eingeben (z.B. "Dieter" oder "Haushalt")
2. **Bei Paaren:** Separate Profile für jeden Partner anlegen, oder ein gemeinsames Profil
3. **Profilverbund:** Mehrere Profile können für gemeinsame Auswertung kombiniert werden

> **Tipp:** Für Paare mit getrennten Depots empfiehlt sich je ein Profil pro Person.

### 2. Depot-Tranchen erfassen (Tranchen-Manager)

Für steueroptimierte Verkäufe benötigt die Suite Ihre Depot-Positionen mit Kaufdaten:

1. **Tranchen-Manager** über die Startseite oder Balance-App öffnen
2. Pro Position eingeben:
   - **Wertpapier** (z.B. "VWCE")
   - **Kaufdatum** (für FIFO-Berechnung)
   - **Kaufkurs** und **Stückzahl**
   - **Aktueller Kurs** (kann per Yahoo-Proxy aktualisiert werden)
3. Die Suite berechnet automatisch:
   - Unrealisierte Gewinne/Verluste
   - Steueroptimale Verkaufsreihenfolge
   - Teilfreistellung (30% für Aktienfonds, 15% für Mischfonds)

> **Wichtig:** Die Tranchen-Pflege ist erforderlich. Die Suite nutzt diese Daten für alle Steuerberechnungen und Entnahmeempfehlungen.

### 3. Grunddaten im Profil speichern

In der Balance-App einmalig hinterlegen:

- **Vermögenswerte:** Depotwert, Tagesgeld, sonstige Liquidität
- **Jährlicher Bedarf:** Floor (Grundbedarf) und Flex (optional)
- **Renten:** Betrag, Startjahr, Indexierung
- **Steuereinstellungen:** Kirchensteuer ja/nein, Sparer-Pauschbetrag

Diese Daten werden im localStorage gespeichert und stehen bei jedem Start zur Verfügung.

---

## Erste Schritte

### Balance-App (jährliche Planung)

1. **Balance.html** öffnen
2. Grunddaten eingeben:
   - Gesamtvermögen (Depot + Liquidität)
   - Jährlicher Bedarf (Floor = Grundbedarf, Flex = optionale Ausgaben)
   - Rente(n) und Startjahr
3. **Berechnen** klicken → Entnahmeempfehlung erscheint
4. Diagnose-Tab zeigt Erklärungen zu allen Berechnungsschritten

### Simulator (Was-wäre-wenn)

1. **Simulator.html** öffnen
2. Tab "Rahmendaten": Vermögen, Bedarf und Renten eintragen
3. Tab "Monte-Carlo": **Simulation starten** klicken
4. Ergebnis: Erfolgswahrscheinlichkeit und Szenario-Analyse

---

## Die wichtigsten Eingabefelder

| Feld | Bedeutung | Beispiel |
|------|-----------|----------|
| Gesamtvermögen | Depot + Tagesgeld + sonstige Anlagen | 500.000 € |
| Floor-Bedarf | Fixkosten, die gedeckt sein müssen | 24.000 €/Jahr |
| Flex-Bedarf | Optionale Ausgaben (kürzbar in Krisen) | 12.000 €/Jahr |
| Rente | Gesetzliche/betriebliche Rente | 18.000 €/Jahr ab 67 |
| Aktienquote | Anteil risikobehafteter Anlagen | 60% |

---

## Typische Workflows

### Jährliche Balance (Februar-Routine)

1. Balance-App öffnen
2. `Alt+J` → Jahresabschluss-Assistent
3. Aktuelle Depotwerte eingeben
4. Entnahmeempfehlung für das Jahr ablesen
5. Optional: Snapshot speichern (`Alt+E`)

### Langfristplanung prüfen

1. Simulator öffnen
2. Aktuelle Werte aus Balance übernehmen
3. Monte-Carlo mit 1.000 Läufen starten
4. Ziel: **Erfolgswahrscheinlichkeit > 95%**
5. Bei Bedarf: Parameter-Sweep für Optimierung

### Pflegefall durchspielen

1. Simulator → Tab "Monte-Carlo"
2. Pflegefall-Szenarien aktivieren
3. Pflegegrad und Kosten konfigurieren
4. Simulation zeigt Auswirkungen auf Vermögensverlauf

---

## Tastenkürzel (Balance-App)

| Kürzel | Funktion |
|--------|----------|
| `Alt+J` | Jahresabschluss |
| `Alt+N` | Marktdaten aktualisieren |
| `Alt+I` | Import |
| `Alt+E` | Export |

---

## Häufige Fragen

**Wo werden meine Daten gespeichert?**
Lokal im Browser (localStorage). Keine Cloud, keine Registrierung.

**Kann ich Daten zwischen Geräten übertragen?**
Ja, per Export (JSON) und Import auf dem anderen Gerät.

**Was bedeutet "Floor" und "Flex"?**
- Floor = Grundbedarf, der immer gedeckt sein muss
- Flex = Optionale Ausgaben, die in schlechten Jahren reduziert werden können

**Wie genau ist die Simulation?**
Die Monte-Carlo-Simulation nutzt 100 Jahre historische Daten (1925-2025). Das Ergebnis zeigt Wahrscheinlichkeiten, keine Garantien.

**Muss ich Tranchen pflegen?**
Ja. Die Suite benötigt Ihre Depot-Positionen mit Kaufdaten für korrekte Steuerberechnungen (FIFO, Teilfreistellung) und Entnahmeempfehlungen.

**Wie funktioniert der Profilverbund für Paare?**
Jeder Partner hat ein eigenes Profil mit separatem Depot und Renten. Der Verbund aggregiert die Vermögen und verteilt Entnahmen optimal (steueroptimiert, proportional oder runway-first).

---

## Nächste Schritte

- **README.md** – Vollständige Dokumentation aller Features
- **TECHNICAL.md** – Technische Details zur Architektur
- **docs/PROFILVERBUND_FEATURES.md** – Multi-Profil für Paare

---

## Hilfe & Feedback

- Issues auf GitHub melden
- Fragen im Wertpapier-Forum stellen
