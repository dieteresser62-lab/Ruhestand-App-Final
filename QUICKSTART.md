# Quickstart: Ruhestand-Suite

Schnelleinstieg für Einzelpersonen und Paare zur Entnahmeplanung im Ruhestand.


---

## Voraussetzungen

*   **Betriebssystem:** Windows 10/11
*   **Browser:** Ein aktueller Chrome, Edge oder Firefox
*   **Optional:** [Node.js](https://nodejs.org/) (nur erforderlich für Online-Kursdaten via Yahoo-Proxy)

---


## Start in 2 Minuten

### Option A: Windows-EXE

1. `RuhestandSuite.exe` herunterladen
2. Doppelklick → App startet automatisch im Browser
3. Fertig.

### Option B: Browser-Version

1. Repository herunterladen/entpacken
2. Doppelklick auf `start_suite.cmd`
3. Browser öffnet sich automatisch

> **Voraussetzung:** Für Online-Kurse (optional) muss Node.js installiert sein.

---

## Vorarbeit: Profil pflegen

Bevor Sie mit der eigentlichen Planung beginnen, müssen Sie Ihr Profil einrichten. Ein Profil besteht aus zwei Teilen: den Stammdaten und den Depot-Tranchen.

### 1. Profil anlegen (index.html)

Die Startseite (`index.html`) ist die zentrale Profilverwaltung:

1. **Neues Profil erstellen:** Name eingeben (z.B. "Max" oder "Haushalt")
2. **Bei Paaren:** Separate Profile für jeden Partner anlegen
3. **Profilverbund:** Mehrere Profile können für gemeinsame Auswertung kombiniert werden

> **Tipp:** Für Paare mit getrennten Depots empfiehlt sich je ein Profil pro Person.

### 2. Profil-Stammdaten erfassen

Im Profil-Assets Manager die Stammdaten hinterlegen:

- **Vermögenswerte:** Tagesgeld (als Liquiditätsreserve)
- **Renten & Einkünfte:** Monatliche Renten, Status (aktiv/inaktiv) und sonstige Einkünfte
- **Gold-Strategie:** Optionaler Gold-Anteil und Rebalancing-Band


### 3. Depot-Tranchen erfassen (Tranchen-Manager)

Die Tranchen sind Teil des Profils und erforderlich für korrekte Steuerberechnungen:

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

Alle Profildaten werden im localStorage gespeichert und stehen bei jedem Start zur Verfügung.

---

## Erste Schritte

### Balance-App (jährliche Planung)

1. **Balance.html** öffnen
2. **Profil wählen:** Oben links die gewünschten Profile aktivieren (bei Paaren ggf. beide).
3. Tab "Jahres-Update":
   - **Vermögen prüen:** Die Werte (Depot, Tagesgeld) sind schreibgeschützt und kommen direkt aus dem Profil.
   - **Jahres-Update starten:** Button klicken für Online-Daten und Jahreswechsel.
3. Tab "Grundeinstellungen & Strategie":
   - **Bedarf anpassen:** Floor (Grundbedarf) und Flex (optional) hier einstellen.
4. Tab "Ausgaben-Check":
   - **Monat importieren:** Pro Profil und Monat CSV einlesen.
   - **Budget prüfen:** Monatsampel, Jahresrestbudget, Hochrechnung und Soll/Ist (auf Basis importierter Monate) kontrollieren.
   - **Historie nutzen:** Über die Jahresauswahl alte Jahre anzeigen; der Jahresabschluss schaltet automatisch auf das nächste Jahr.
5. **Ergebnis lesen:** Die Entnahmeempfehlung wird **automatisch** und sofort rechts angezeigt (kein "Berechnen"-Button nötig).
6. Diagnose-Tab zeigt Erklärungen zu allen Berechnungsschritten.

### Simulator (Was-wäre-wenn)

1. **Simulator.html** öffnen
2. Tab "Rahmendaten":
   - **Profile wählen:** Gewünschte Profile für die Simulation aktivieren.
   - **Bedarf pflegen:** **Floor** (Muss-Ausgaben) und **Flex** (Wunsch-Ausgaben) prüfen und anpassen.
   - **Personen prüfen:** Rentenhöhe und Startalter kontrollieren (Sektion "Personen & Rente").
3. Tab "Monte-Carlo": **Simulation starten** klicken für die Monte-Carlo-Prognose.
4. Tab "Backtesting": **Historische Simulation** für einen Realitätscheck gegen historische Marktdaten.
5. Ergebnis: Erfolgswahrscheinlichkeit und detaillierte Szenario-Analysen.

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
3. Im Tab "Ausgaben-Check" prüfen, ob das neue Jahr aktiv ist (Vorjahre bleiben über den Jahres-Selector abrufbar)
4. Aktuelle Depotwerte eingeben
5. Entnahmeempfehlung für das Jahr ablesen
6. Optional: Snapshot speichern (`Alt+E`)

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
Jeder Partner hat ein eigenes Profil mit separatem Depot und Renten. Der Verbund aggregiert die Vermögen und verteilt Entnahmen gemäß gewähltem Modus (steueroptimiert, proportional oder runway-first).

**Was ist neu bei der Steuerlogik?**
Verkäufe werden jahresweise per Settlement verrechnet. Verluste werden als Verlusttopf (`lossCarry`) ins nächste Jahr übernommen und reduzieren dort die Steuer.

---

## Nächste Schritte

- **README.md** – Vollständige Dokumentation aller Features
- **CHANGELOG.md** – Änderungen pro Release
- **docs/guides/GUIDED_TOURS.md** – Geführte Schritt-für-Schritt-Touren
- **docs/reference/TECHNICAL.md** – Technische Details zur Architektur
- **docs/reference/PROFILVERBUND_FEATURES.md** – Multi-Profil für Paare

---

## Hilfe & Feedback

- Issues auf GitHub melden
- Fragen im Wertpapier-Forum stellen
