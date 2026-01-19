# Implementierungs-Prompt: Profilverbund-Balance

Implementiere die Profilverbund-Balance in der Balance-App.

## Anforderungen
1) Profilauswahl per Checkbox (Standard: alle aktiv).
2) Verteilungsmodus (steueroptimiert, proportional, runway-first).
3) Aggregation von Vermoegen, Renten und Tranchen aus den aktiven Profilen.
4) Kein separater Verbundmodus oder Toggle.

## Module
- `profilverbund-balance.js`: Aggregation, Verteilung, Tranche-Logik.
- `profilverbund-balance-ui.js`: Profilverbund-UI (Profilwahl + Karten).
- `balance-main.js`: Einbindung, Synchronisierung und Rendering.

## Tests
- `tests/profilverbund-balance.test.mjs`
- `tests/profilverbund-profile-gold-overrides.test.mjs`
