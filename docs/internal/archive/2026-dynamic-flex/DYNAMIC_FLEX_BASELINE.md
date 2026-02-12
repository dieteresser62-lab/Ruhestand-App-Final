# Dynamic Flex Baseline (T00)

Datum: 2026-02-12T10:47:48+01:00  
Commit: `ebac8a6`  
Zweck: Referenzstand vor Implementierung von Dynamic Flex (VPW/Sterbetafeln/CAPE-Automation).

## 1) Regression-Baseline

Ausgefuehrter Befehl:

```bash
npm test
```

Ergebnis:
- Testdateien: `46`
- Assertions: `764`
- Passed: `764`
- Failed: `0`

## 2) Referenz-Szenarien (Engine, deterministisch)

Quelle: Ableitung aus den bestehenden Core-Engine Testinputs (`tests/core-engine.test.mjs`), lokal via `EngineAPI.simulateSingleYear`.

| Szenario | Regime | Monatl. Entnahme | Kuerzung | Kuerzungsquelle | Ziel-Liquiditaet | Aktion |
|---|---|---:|---:|---|---:|---|
| `S1_base` | `peak_stable` | 2400 | 20% | `Budget-Floor` | 90000 | `NONE` |
| `S2_bear` | `bear_deep` | 2400 | 20% | `Glaettung (Final-Guardrail)` | 58500 | `TRANSACTION` (`Notfall-Verkauf`, netto 38000) |
| `S3_floor_protection` | `bear_deep` | 3200 | 16% | `Glaettung (Final-Guardrail)` | 75900 | `TRANSACTION` (`Notfall-Verkauf`, netto 50000) |

Hinweis:
- Diese Werte sind die lokale Start-Benchmark fuer spaetere Ticket-Checks.
- Bei `dynamicFlex=false` muessen diese Referenzwerte stabil bleiben.

## 3) Performance-Snapshot (lokal)

Befehl (Engine-Mikrobenchmark):

```bash
node --input-type=module -e "<5000x EngineAPI.simulateSingleYear>"
```

Ergebnis:
- Iterationen: `5000`
- Gesamtzeit: `109.65 ms`
- Durchschnitt: `0.0219 ms / run`

Hinweis:
- Das ist ein lokaler Orientierungswert (Hardware-/Last-abhaengig), kein offizielles SLO.
- Dient als frueher Indikator fuer grobe Performance-Regressionen.

## 4) Freigabekriterium fuer Ticket T00

- [x] Regression dokumentiert
- [x] Mindestens 3 Referenz-Szenarien dokumentiert
- [x] Einfacher Performance-Messpunkt dokumentiert

T00 Status: **Done**
