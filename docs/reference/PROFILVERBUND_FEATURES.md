# Profilverbund: Multi-Profil-Auswertung

Der Profilverbund verbindet mehrere Profile zu einer gemeinsamen Analyse. Es gibt keinen separaten Verbundmodus oder separaten Tab mehr; die Profilauswahl steuert Balance und Simulator direkt.

## Ziele
- Mehrere Profile parallel auswerten, ohne separate Modus-Umschalter.
- Ergebnisse bleiben deterministisch und worker-kompatibel.
- Balance und Simulator nutzen dieselbe Profilauswahl.

## Datenquellen
- Profile werden in `profile-storage.js` verwaltet.
- Vermoegen, Tranchen, Renten und Gold-Strategie werden pro Profil gepflegt.
- Der Pflegebucket wird als Profil-/Haushaltsdefinition im Key `profile_health_bucket` gepflegt.
- Profilselektion erfolgt per Checkboxen (Standard: alle aktiv).

## Balance-App (Profilverbund)
- Aktivierte Profile werden aggregiert: Tagesgeld, Geldmarkt, Depot Alt/Neu, Gold, Renten.
- Entnahmeverteilung erfolgt nach Modus:
  - `tax_optimized` (Steuerlast minimieren)
  - `proportional` (Vermoegensanteil)
  - `runway_first` (mehr Runway traegt mehr)
- Handlungsanweisungen listen Quellen/Verwendungen pro Profil getrennt.
- Transaktionen bleiben pro Profil (keine Profil-Grenzueberschreitungen).

## Simulator (Profilverbund)
- Profilauswahl im Tab "Rahmendaten".
- Kombinierte Inputs:
  - Startvermoegen = Summe der Profile (unter Beruecksichtigung der Profileingaben)
  - Floor/Flex und Renten werden summiert
  - Tranchen werden zusammengefuehrt
- Personen/Renten: Profil 1 -> Person 1, Profil 2 -> Partner (sofern vorhanden).
- Ansparphase bleibt deaktiviert (vorerst).
- Pflegebucket: Die Definition des Hauptprofils gilt als Haushaltsdefinition. Abweichende Pflegebucket-Definitionen in weiteren aktiven Profilen werden als Warnung gemeldet, aber nicht gemischt.
- Der Pflegebucket-Carve-Out erfolgt erst nach dem Profilverbund-Merge auf dem aggregierten Haushaltsportfolio. Dadurch wird der Bucket nicht faelschlich gekappt, wenn ein Einzelprofil wenig Geldmarkt/Cash hat, der Haushalt insgesamt aber ausreichend cash-nahe Mittel besitzt.

## Hinweise
- Gold-Strategie ist pro Profil gepflegt; die Kombination nutzt nur Profile mit aktivem Gold und Ziel > 0.
- Bei unplausiblen Tranchensummen faellt der Simulator auf aggregierte Werte zurueck.
- Kombinierte Simulator-Tranchen erhalten profilbezogene IDs und `sourceProfileId`, damit spaetere Steuer-/Portfolio-Pfade die Herkunft nachvollziehen koennen.
- Pflegebucket-Tranchen werden nach dem Merge aus kombinierten Geldmarkt-Tranchen ausgegliedert. Sie behalten Herkunftsinformationen und werden nicht als freie operative Liquiditaet an die Engine gegeben.
- Legacy-Keys wie `belongsToHousehold` und `household_withdrawal_mode` bleiben intern bestehen, sind aber UI-seitig nicht sichtbar.

## Beteiligte Module

### Balance-App
- `profilverbund-balance.js` – Aggregation, Verteilung, Tranche-Auswahl
- `profilverbund-balance-ui.js` – Profilverbund-UI (Profilwahl + Karten)
- `balance-main.js` – Integration und Zustandssynchronisation

### Simulator
- `profile-storage.js` – Profil-Registry und Persistenz-Layer
- `profile-manager.js` – UI-Steuerung fuer Profilverwaltung (index.html)
- `simulator-profile-inputs.js` – Profilaggregation und Simulator-Input-Mapping
- `simulator-portfolio-init.js` – Haushaltsportfolio und Pflegebucket-Carve-Out nach dem Merge
- `simulator-health-bucket.js` – Pflegebucket-Trigger, Nutzung, Verzinsung und Diagnose im Jahreslauf

### Profilverwaltung
- `index.html` – Zentraler Einstiegspunkt fuer Profilverwaltung
- `profile-bridge.js` – Synchronisation zwischen Balance und Simulator

## Tests
- `tests/profilverbund-balance.test.mjs` – Aggregation und Verteilungslogik
- `tests/profilverbund-profile-gold-overrides.test.mjs` – Gold-Strategie bei Profilkombination
- `tests/profile-storage.test.mjs` – Persistenz und Profilwechsel
- `tests/simulator-multiprofile-aggregation.test.mjs` – Simulator-Kombination und Tranchen-Merge
- `tests/health-bucket.test.mjs` – Pflegebucket-Trigger, Deckung und Diagnose
- `tests/balance-health-bucket.test.mjs` – Balance-Diagnose und `diagnostic_only`-Policy

## Verwandte Dokumentation
- `README.md` → Abschnitt "Profilverbund (Multi-Profil)"
- `TECHNICAL.md` → Abschnitt "Multi-Profil Simulator"
- `ARCHITEKTUR_UND_FACHKONZEPT.md` → Abschnitte Pflegefall-Modellierung, Marktvergleich und Forschungsabgleich
