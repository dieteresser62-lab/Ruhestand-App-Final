# Geführte Touren: Ruhestand-Suite

**Schritt-für-Schritt-Anleitungen für typische Nutzungsszenarien**

---

## Dokument-Info

| Eigenschaft | Wert |
|-------------|------|
| **Zielgruppe** | Einsteiger und fortgeschrittene Nutzer |
| **Voraussetzungen** | Suite gestartet (siehe [QUICKSTART.md](../../QUICKSTART.md)) |
| **Format** | 7 Touren à 5-15 Minuten |
| **Letzte Aktualisierung** | Februar 2026 |

### Wo finde ich was?

| Wenn du... | ...dann lies |
|------------|--------------|
| Die Suite zum ersten Mal startest | [QUICKSTART.md](../../QUICKSTART.md) |
| Eine bestimmte Aufgabe erledigen willst | **Dieses Dokument** |
| Verstehen willst, wie die Algorithmen funktionieren | [ARCHITEKTUR_UND_FACHKONZEPT.md](../reference/ARCHITEKTUR_UND_FACHKONZEPT.md) |
| Hilfe direkt in der App brauchst | [Handbuch.html](../../Handbuch.html) |
| Entwickeln oder debuggen willst | [TECHNICAL.md](../reference/TECHNICAL.md) |

---

## Übersicht der Touren

| Tour | Dauer | Ziel | Voraussetzung |
|------|-------|------|---------------|
| [Tour 1: Erste Einrichtung](#tour-1-erste-einrichtung) | 10-15 Min | Profil anlegen, Vermögen erfassen | Keine |
| [Tour 2: Depot-Tranchen einrichten](#tour-2-depot-tranchen-einrichten) | 10-15 Min | Steueroptimierte Positionen pflegen | Tour 1 |
| [Tour 3: Paar-Haushalt einrichten](#tour-3-paar-haushalt-einrichten) | 10 Min | Profilverbund für Paare | Tour 1 |
| [Tour 4: Jahresplanung mit Balance-App](#tour-4-jahresplanung-mit-balance-app) | 5-10 Min | Jährliche Entnahme planen | Tour 1+2 |
| [Tour 5: Jahresabschluss durchführen](#tour-5-jahresabschluss-durchführen) | 5 Min | Ins neue Jahr wechseln | Tour 4 |
| [Tour 6: Ausgaben kontrollieren](#tour-6-ausgaben-kontrollieren) | 5-10 Min | Monatliches Budget-Tracking | Tour 4 |
| [Tour 7: Zukunft simulieren](#tour-7-zukunft-simulieren) | 10-15 Min | Monte-Carlo und Stress-Tests | Tour 1+2 |

---

## Tour 1: Erste Einrichtung

**🎯 Ziel:** Ein vollständiges Profil mit Vermögenswerten anlegen

**⏱️ Dauer:** 10-15 Minuten

**📋 Was du brauchst:**
- Aktueller Kontostand (Tagesgeld/Geldmarkt-ETF)
- Depot-Gesamtwert (grob reicht für den Anfang)
- Monatliche Rentenhöhe (falls bereits Rentner)
- Geschätzter Jahresbedarf (Floor + Flex)

### Schritt 1: Suite starten

1. Doppelklick auf `RuhestandSuite.exe` oder `start_suite.cmd`
2. Die Startseite (`index.html`) öffnet sich im Browser

### Schritt 2: Neues Profil anlegen

1. Im Bereich **"Profil-Verwaltung"** einen Namen eingeben (z.B. "Max" oder "Mein Ruhestand")
2. Klick auf **"Neues Profil erstellen"**
3. Das neue Profil wird automatisch aktiviert

> **💡 Tipp für Paare:** Lege für jeden Partner ein eigenes Profil an (z.B. "Max" und "Anna"). Diese können später als Profilverbund kombiniert werden.

### Schritt 3: Vermögenswerte erfassen

1. Klick auf **"Profil-Assets bearbeiten"**
2. Erfasse folgende Werte:

| Feld | Beschreibung | Beispiel |
|------|--------------|----------|
| **Tagesgeld / Geldmarkt** | Liquiditätsreserve | 50.000 € |
| **Depot (Aktien-ETF)** | Gesamtwert deines Welt-ETF | 400.000 € |
| **Gold** | Optional, falls vorhanden | 30.000 € |

3. Klick auf **"Speichern"**

### Schritt 4: Renten erfassen

1. Im gleichen Dialog den Bereich **"Renten & Einkünfte"** öffnen
2. Erfasse:

| Feld | Beschreibung | Beispiel |
|------|--------------|----------|
| **Rente aktiv** | Checkbox aktivieren, wenn Rente läuft | ✓ |
| **Monatliche Rente (brutto)** | Gesetzliche + Betriebsrente | 1.800 € |
| **Steuerquote** | Geschätzter Steuersatz auf Rente | 25% |

3. Klick auf **"Speichern"**

### Schritt 5: Bedarf festlegen

1. Öffne **Balance.html** (Klick auf "Balance-App" in der Navigation)
2. Gehe zum Tab **"Grundeinstellungen & Strategie"**
3. Erfasse:

| Feld | Beschreibung | Beispiel |
|------|--------------|----------|
| **Floor-Bedarf (p.a.)** | Absolutes Minimum zum Leben | 36.000 € |
| **Flex-Bedarf (p.a.)** | Wünschenswerter Zusatz | 12.000 € |

> **💡 Floor vs. Flex:**
> - **Floor** = Muss-Ausgaben (Miete, Versicherungen, Lebensmittel)
> - **Flex** = Kann-Ausgaben (Reisen, Hobbys, Luxus)
>
> Die Suite reduziert in Krisenzeiten nur den Flex-Anteil, nie den Floor.

### ✅ Erfolgskontrolle

- [ ] Profil erscheint in der Profil-Liste
- [ ] Vermögenswerte werden in der Balance-App angezeigt
- [ ] Erste Entnahmeempfehlung erscheint automatisch

**➡️ Nächster Schritt:** [Tour 2: Depot-Tranchen einrichten](#tour-2-depot-tranchen-einrichten) für präzise Steuerberechnung

---

## Tour 2: Depot-Tranchen einrichten

**🎯 Ziel:** Einzelne Depot-Positionen für steueroptimierte Verkäufe erfassen

**⏱️ Dauer:** 10-15 Minuten

**📋 Was du brauchst:**
- Depot-Auszug mit einzelnen Positionen
- Pro Position: Kaufdatum, Kaufkurs, Stückzahl, aktueller Kurs

### Warum Tranchen?

Ohne Tranchen kennt die Suite nur den Gesamtwert deines Depots. Mit Tranchen kann sie:
- **FIFO-Prinzip** korrekt anwenden (älteste Anteile zuerst verkaufen)
- **Gewinnquote** pro Position berechnen
- **Steueroptimal verkaufen** (Positionen mit niedrigem Gewinn zuerst)
- **Teilfreistellung** korrekt berücksichtigen (30% für Aktien-ETF)

### Schritt 1: Tranchen-Manager öffnen

1. Auf der Startseite (`index.html`) klick auf **"Tranchen-Manager"**
2. Oder in der Balance-App: Button **"Tranchen bearbeiten"**

### Schritt 2: Positionen erfassen

Für jede ETF-Position (z.B. monatliche Sparplan-Käufe):

1. Klick auf **"Neue Tranche"**
2. Erfasse:

| Feld | Beschreibung | Beispiel |
|------|--------------|----------|
| **Bezeichnung** | Name zur Identifikation | VWCE Jan 2020 |
| **Typ** | Art des Wertpapiers | Aktien-ETF (neu) |
| **Kaufdatum** | Datum des Kaufs | 15.01.2020 |
| **Kaufkurs** | Preis pro Anteil beim Kauf | 75,00 € |
| **Stückzahl** | Anzahl Anteile | 50 |
| **Aktueller Kurs** | Heutiger Kurs | 120,00 € |

3. Klick auf **"Speichern"**

> **💡 Tipp:** Du musst nicht jeden einzelnen Sparplan-Kauf erfassen. Fasse Käufe aus demselben Jahr zusammen, das reicht für eine gute Schätzung.

### Schritt 3: Kurse aktualisieren (optional)

Falls Node.js installiert ist:

1. Klick auf **"Kurse aktualisieren"**
2. Die Suite ruft aktuelle Kurse via Yahoo Finance ab
3. Alle Tranchen werden automatisch aktualisiert

### Schritt 4: Aggregation prüfen

1. Unten im Tranchen-Manager siehst du die **Zusammenfassung**:
   - Gesamtwert aller Tranchen
   - Unrealisierte Gewinne/Verluste
   - Durchschnittliche Gewinnquote

2. Diese Werte werden automatisch in die Balance-App übernommen

### ✅ Erfolgskontrolle

- [ ] Alle relevanten Positionen sind erfasst
- [ ] Gesamtwert entspricht ungefähr deinem Depot-Auszug
- [ ] In der Balance-App erscheint "Tranchen: X Positionen"

**➡️ Nächster Schritt:** [Tour 4: Jahresplanung](#tour-4-jahresplanung-mit-balance-app) oder [Tour 3: Paar-Haushalt](#tour-3-paar-haushalt-einrichten)

---

## Tour 3: Paar-Haushalt einrichten

**🎯 Ziel:** Zwei Profile als Profilverbund für gemeinsame Planung verbinden

**⏱️ Dauer:** 10 Minuten

**📋 Voraussetzung:** Beide Partner haben ein eigenes Profil (Tour 1)

### Warum getrennte Profile?

- Jeder Partner hat eigene Renten mit unterschiedlichem Startdatum
- Getrennte Depots ermöglichen optimierte Entnahmereihenfolge
- Bei Versterben eines Partners wird nur dessen Profil deaktiviert
- Witwenrente kann korrekt modelliert werden

### Schritt 1: Zweites Profil anlegen

1. Auf `index.html` → **"Neues Profil erstellen"**
2. Name eingeben (z.B. "Anna")
3. Vermögen und Renten für diesen Partner erfassen (wie Tour 1)

### Schritt 2: Profilverbund aktivieren

1. Öffne **Balance.html**
2. Oben links siehst du die **Profil-Auswahl** (Checkboxen)
3. Aktiviere beide Profile: ☑ Max ☑ Anna

### Schritt 3: Aggregation prüfen

Mit aktiviertem Profilverbund zeigt die Balance-App:

| Anzeige | Bedeutung |
|---------|-----------|
| **Gesamtvermögen** | Summe beider Depots + Liquidität |
| **Renten gesamt** | Summe beider Renten |
| **Floor/Flex** | Gemeinsamer Haushaltsbedarf |

### Schritt 4: Entnahme-Verteilung wählen

Im Tab **"Grundeinstellungen & Strategie"**:

| Modus | Beschreibung | Wann sinnvoll |
|-------|--------------|---------------|
| **Proportional** | Entnahme anteilig nach Vermögen | Standard für gleichberechtigte Paare |
| **Steueroptimiert** | Aus Depot mit niedrigerer Steuerlast | Wenn ein Partner mehr Gewinn hat |
| **Runway-First** | Aus Depot mit kürzerer Reichweite | Bei unterschiedlichen Lebenserwartungen |

### Schritt 5: Simulator für Paare

1. Öffne **Simulator.html**
2. Im Tab **"Rahmendaten"** beide Profile aktivieren
3. Im Tab **"Personen & Rente"** werden beide Partner angezeigt:
   - Startalter pro Person
   - Lebenserwartung pro Person
   - Renten pro Person
   - **Witwenrente** (optional aktivierbar)

### ✅ Erfolgskontrolle

- [ ] Beide Profile erscheinen in der Auswahl
- [ ] Vermögen wird korrekt summiert
- [ ] Simulator zeigt beide Personen mit separaten Renten

---

## Tour 4: Jahresplanung mit Balance-App

**🎯 Ziel:** Die jährliche Entnahmeempfehlung verstehen und umsetzen

**⏱️ Dauer:** 5-10 Minuten

**📋 Voraussetzung:** Profil mit Vermögen und Tranchen eingerichtet

### Schritt 1: Balance-App öffnen

1. Öffne **Balance.html**
2. Wähle dein Profil (oder Profilverbund) oben links

### Schritt 2: Aktuelle Werte prüfen

Im Tab **"Jahres-Update"** siehst du:

| Bereich | Inhalt |
|---------|--------|
| **Vermögenswerte** | Depot, Tagesgeld, Gold (aus Profil/Tranchen) |
| **Marktdaten** | ATH-Abstand, CAPE, Inflation |
| **Renten** | Monatliche Einkünfte |

### Schritt 3: Entnahmeempfehlung lesen

Die **Aktionsbox** rechts zeigt automatisch:

```
┌─────────────────────────────────────┐
│  ENTNAHME-EMPFEHLUNG                │
├─────────────────────────────────────┤
│  Jahresbedarf:        48.000 €      │
│  - Renten:           -21.600 €      │
│  = Entnahme nötig:    26.400 €      │
├─────────────────────────────────────┤
│  AKTION: Verkaufe 27.000 € aus      │
│  Depot (Tranche "VWCE 2020")        │
│  Erwartete Steuer: ~1.200 €         │
└─────────────────────────────────────┘
```

### Schritt 4: Diagnose verstehen

Wechsle zum Tab **"Diagnose"** für Erklärungen:

| Element | Zeigt |
|---------|-------|
| **Status-Chips** | Marktregime (Peak/Bear/Recovery), Alarm-Status |
| **Entscheidungsbaum** | Warum diese Empfehlung? |
| **Guardrails** | Aktuelle Schwellenwerte |
| **Key-Params** | Entnahmequote, Runway, Flex-Rate |

### Schritt 5: Empfehlung umsetzen

Die Suite sagt dir **was** zu tun ist. Du führst es **selbst** bei deiner Bank aus:

1. Verkaufe die empfohlene Menge aus dem genannten ETF
2. Überweise den Erlös auf dein Tagesgeld/Geldmarkt
3. Aktualisiere die Tranchen im Tranchen-Manager

### ✅ Erfolgskontrolle

- [ ] Entnahmeempfehlung wird angezeigt
- [ ] Diagnose zeigt plausible Werte
- [ ] Runway ist im grünen Bereich (> 24 Monate)

---

## Tour 5: Jahresabschluss durchführen

**🎯 Ziel:** Das Jahr abschließen und ins neue Jahr wechseln

**⏱️ Dauer:** 5 Minuten

**📋 Wann:** Einmal jährlich, typischerweise im Januar

### Schritt 1: Jahres-Update starten

1. Öffne **Balance.html**
2. Tab **"Jahres-Update"**
3. Klick auf **"Jahres-Update starten"**

### Schritt 2: Online-Daten abrufen

Die Suite ruft automatisch ab:

| Datenquelle | Was |
|-------------|-----|
| ECB/OECD | Aktuelle Inflationsrate |
| Yahoo Finance | ETF-Kurse (falls Proxy läuft) |

Das Update-Protokoll zeigt alle abgerufenen Werte.

### Schritt 3: Jahresabschluss bestätigen

1. Prüfe die neuen Werte im Protokoll
2. Klick auf **"Jahresabschluss durchführen"** (oder `Alt+J`)

Was passiert:
- Marktdaten rücken ein Jahr nach
- Inflation wird auf den Bedarf angewendet
- ATH wird ggf. aktualisiert
- Ausgaben-Check wechselt auf das neue Jahr

### Schritt 4: Neues Jahr prüfen

Nach dem Abschluss:

1. Die Jahreszahl oben hat sich geändert
2. Floor/Flex sind inflationsangepasst
3. Eine neue Entnahmeempfehlung wird berechnet

### ✅ Erfolgskontrolle

- [ ] Jahreszahl ist aktualisiert
- [ ] Inflation wurde angewendet
- [ ] Neue Empfehlung erscheint

---

## Tour 6: Ausgaben kontrollieren

**🎯 Ziel:** Monatliche Ausgaben gegen das Budget tracken

**⏱️ Dauer:** 5-10 Minuten pro Monat

**📋 Was du brauchst:** CSV-Export deiner Kontoauszüge (kategorisiert)

### Schritt 1: CSV vorbereiten

Deine Bank oder Finanz-App kann oft kategorisierte Exporte erstellen. Format:

```csv
Kategorie;Betrag
Lebensmittel;-450,00
Mobilität;-180,00
Freizeit;-320,00
Restaurant;-150,00
```

> **💡 Tipp:** Die Suite erkennt automatisch Trennzeichen (`;`, `,`, Tab) und Zahlenformate (deutsch/englisch).

### Schritt 2: Ausgaben-Check öffnen

1. Öffne **Balance.html**
2. Tab **"Ausgaben-Check"**

### Schritt 3: Monat importieren

1. In der Tabelle den gewünschten Monat finden
2. Klick auf **"CSV"** bei deinem Profil
3. Datei auswählen
4. Import wird bestätigt

### Schritt 4: Budget-Status prüfen

Die Summary-Cards zeigen:

| Karte | Bedeutung |
|-------|-----------|
| **Jahresbudget** | Floor + Flex für das Jahr |
| **Noch frei** | Verbleibendes Budget |
| **Hochrechnung** | Prognose fürs Gesamtjahr (Median ab 2 Monaten) |
| **Soll/Ist** | Abweichung vom Plan |

### Schritt 5: Ampel lesen

| Farbe | Bedeutung |
|-------|-----------|
| 🟢 Grün | Im Budget |
| 🟡 Gelb | Leicht überzogen (bis 5%) |
| 🔴 Rot | Deutlich überzogen (>5%) |

### Schritt 6: Details analysieren

1. Klick auf **"Details"** bei einem Monat
2. Zeigt **Top-3-Kategorien** und vollständige Liste
3. Hilft, Einsparpotenziale zu finden

### ✅ Erfolgskontrolle

- [ ] Mindestens ein Monat ist importiert
- [ ] Hochrechnung erscheint plausibel
- [ ] Ampelfarbe entspricht deinem Gefühl

---

## Tour 7: Zukunft simulieren

**🎯 Ziel:** Monte-Carlo-Simulation durchführen und interpretieren

**⏱️ Dauer:** 10-15 Minuten

**📋 Voraussetzung:** Profil mit realistischen Werten eingerichtet

### Schritt 1: Simulator öffnen

1. Öffne **Simulator.html**
2. Im Tab **"Rahmendaten"** dein Profil aktivieren

### Schritt 2: Rahmendaten prüfen

Die Werte werden aus deinem Profil übernommen:

| Feld | Prüfen |
|------|--------|
| **Startvermögen** | Entspricht aktuellem Depot + Liquidität |
| **Floor/Flex** | Dein Jahresbedarf |
| **Renten** | Monatliche Einkünfte |
| **Startalter** | Dein aktuelles Alter |
| **Lebenserwartung** | Realistische Annahme (z.B. 90-95) |

### Schritt 3: Simulation starten

1. Tab **"Monte-Carlo"**
2. Standard-Einstellungen sind meist gut:
   - 1.000 Simulationsläufe
   - Historische Renditen
3. Klick auf **"Simulation starten"**
4. Warte 10-30 Sekunden

### Schritt 4: Ergebnisse interpretieren

| Kennzahl | Bedeutung | Zielwert |
|----------|-----------|----------|
| **Erfolgsquote (Floor)** | % der Läufe ohne Pleite | > 95% |
| **Erfolgsquote (Floor+Flex)** | % mit vollem Lebensstandard | > 80% |
| **Median Endvermögen** | Typisches Restvermögen | > 0 € |
| **P10 Endvermögen** | Schlechte 10% der Fälle | > 0 € |

### Schritt 5: Stress-Test durchführen

1. Im Dropdown **"Stress-Szenario"** wählen:
   - Stagflation 70er
   - Große Depression 1929
   - Doppel-Crash 2000er
2. Simulation erneut starten
3. Wie verändert sich die Erfolgsquote?

### Schritt 6: Backtest als Realitäts-Check

1. Tab **"Backtesting"**
2. Zeitraum wählen (z.B. 2000-2024)
3. Klick auf **"Backtest starten"**
4. Zeigt: Hätte dein Plan die echte Geschichte überlebt?

### ✅ Erfolgskontrolle

- [ ] Erfolgsquote > 95% unter Normalbedingungen
- [ ] Auch unter Stress > 80%
- [ ] Backtest zeigt kein Ruin-Szenario

---

## Weiterführende Ressourcen

| Thema | Dokument |
|-------|----------|
| Technische Details der Algorithmen | [ARCHITEKTUR_UND_FACHKONZEPT.md](../reference/ARCHITEKTUR_UND_FACHKONZEPT.md) |
| Parameter-Sweeps und Auto-Optimize | [AUTO_OPTIMIZE_DETAILS.md](../reference/AUTO_OPTIMIZE_DETAILS.md) |
| Profilverbund im Detail | [PROFILVERBUND_FEATURES.md](../reference/PROFILVERBUND_FEATURES.md) |
| Tranchen-Management | [MULTI-TRANCHEN-ANLEITUNG.md](./MULTI-TRANCHEN-ANLEITUNG.md) |
| Workflow-Pseudocode | [WORKFLOW_PSEUDOCODE.md](../reference/WORKFLOW_PSEUDOCODE.md) |

---

*Fragen oder Probleme? Öffne ein Issue auf [GitHub](https://github.com/...) oder konsultiere das [Handbuch.html](../../Handbuch.html) fuer interaktive Hilfe.*
