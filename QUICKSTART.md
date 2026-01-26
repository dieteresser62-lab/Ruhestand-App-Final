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

---

## Nächste Schritte

- **README.md** – Vollständige Dokumentation aller Features
- **TECHNICAL.md** – Technische Details zur Architektur
- **docs/PROFILVERBUND_FEATURES.md** – Multi-Profil für Paare

---

## Hilfe & Feedback

- Issues auf GitHub melden
- Fragen im Wertpapier-Forum stellen
