# Profilverbund: Multi-Profil-Auswertung

Der Profilverbund verbindet mehrere Profile zu einer gemeinsamen Analyse. Es gibt keinen separaten Verbundmodus oder separaten Tab mehr; die Profilauswahl steuert Balance und Simulator direkt.

## Ziele
- Mehrere Profile parallel auswerten, ohne separate Modus-Umschalter.
- Ergebnisse bleiben deterministisch und worker-kompatibel.
- Balance und Simulator nutzen dieselbe Profilauswahl.

## Datenquellen
- Profile werden in `profile-storage.js` verwaltet.
- Vermoegen, Tranchen, Renten und Gold-Strategie werden pro Profil gepflegt.
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

## Hinweise
- Gold-Strategie ist pro Profil gepflegt; die Kombination nutzt nur Profile mit aktivem Gold und Ziel > 0.
- Bei unplausiblen Tranchensummen faellt der Simulator auf aggregierte Werte zurueck.
- Legacy-Keys wie `belongsToHousehold` und `household_withdrawal_mode` bleiben intern bestehen, sind aber UI-seitig nicht sichtbar.
