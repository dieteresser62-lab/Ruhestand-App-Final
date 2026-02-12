# Profilverbund-Balance Spezifikation

## Ziel
Die Balance-App arbeitet profiluebergreifend. Aktivierte Profile bilden einen Profilverbund, der Vermoegen, Renten und Tranchen aggregiert. Es gibt keinen separaten Verbundmodus.

## UI
- Profilverbund-Sektion mit:
  - Profilauswahl (Checkboxen, Standard: alle aktiv)
  - Verteilungsmodus (`tax_optimized`, `proportional`, `runway_first`)
- Anzeige erfolgt nur, wenn mindestens ein Profil vorhanden ist.

## Logik
- Pro Profil werden Balance-Inputs geladen und mit Profil-Overrides (Tagesgeld, Rente, Gold-Strategie) kombiniert.
- Aggregation:
  - Vermoegen, Renten, Tranchen werden summiert bzw. zusammengefuehrt.
  - Floor/Flex bleiben in der Balance-Eingabe und gelten als Gesamtbedarf.
- Entnahmeverteilung:
  - `tax_optimized`: zuerst geringere Steuerlast
  - `proportional`: nach Vermoegensanteil
  - `runway_first`: profil mit groesserer Runway traegt mehr
- Handlungsanweisungen listen Quellen/Verwendungen pro Profil.

## Module
- `profilverbund-balance.js`: Aggregation, Verteilung, Tranche-Auswahl
- `profilverbund-balance-ui.js`: Profilselektion und Profilverbund-Karten
- `balance-main.js`: Integration und Zustandssynchronisation

## Storage
- Profil-Metadaten: `belongsToHousehold` (intern, UI nennt es Profilverbund)
- Verteilungsmodus: `household_withdrawal_mode`

## Tests
- `tests/profilverbund-balance.test.mjs`
- `tests/profilverbund-profile-gold-overrides.test.mjs`
