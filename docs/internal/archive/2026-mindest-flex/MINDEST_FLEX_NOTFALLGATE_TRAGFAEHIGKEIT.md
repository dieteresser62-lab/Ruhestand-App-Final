# Mindest-Flex: Tragfaehigkeitsgate fuer schwere Flex-Notlage

## Status und Branch

- Status: freigegeben durch Gemini (Abschlussreview)
- Feature-Branch: `codex/min-flex-severe-affordability`
- Branch-Veröffentlichung: nur lokal; ein Push wurde nicht beauftragt
- Ausgangsreferenz: `post-abschlusshaertung-03-v1`
- Messkandidat: `post-minimum-flex-severe-affordability-v1`

## Anlass

Das bisherige Null-Flex-Gate setzte in `bear_deep` bei mehr als 25 Prozent
realem Drawdown den gesamten Flex einschliesslich Mindest-Flex auf 0. Die
verbleibende Tragfaehigkeit des aktiven Gesamtvermoegens war dabei nur
Diagnose. Dadurch konnte ein hoher relativer Drawdown auch dann eine
Nullentnahme ausloesen, wenn Floor und Mindest-Flex aus dem verbleibenden
Vermoegen komfortabel finanzierbar waren.

## Neuer Contract

Eine schwere Flex-Notlage darf Mindest-Flex nur noch ueberstimmen, wenn alle
drei Bedingungen gleichzeitig gelten:

1. `market.sKey === 'bear_deep'`.
2. Der reale Drawdown des aktiven Gesamtvermoegens liegt strikt ueber der
   konfigurierten 25-Prozent-Grenze.
3. Die geschuetzte Portfolioentnahmequote liegt mindestens bei
   `WEALTH_ADJUSTED_REDUCTION.FULL_WITHDRAWAL_RATE`, aktuell 3,5 Prozent.

Die geschuetzte Quote lautet:

```text
(Netto-Floor aus Portfolio + offener Mindest-Flex aus Portfolio)
----------------------------------------------------------------
                  aktives Gesamtvermoegen
```

Der offene Mindest-Flex wird erst nach Anrechnung des auf Flex entfallenden
Rentenueberschusses bestimmt. Damit wird Rente genau einmal beruecksichtigt.
Die Quote verwendet aktuelle Bedarfs- und Vermoegenswerte und haengt nicht von
der tatsaechlichen Vorjahresentnahme ab; ein Nulljahr kann das Gate daher nicht
durch eine Rueckkopplung im Folgejahr deaktivieren.

## Diagnosevertrag

Engine-Diagnose und Simulator-Jahreslog transportieren zusaetzlich:

- `protectedPortfolioWithdrawalAnnual`
- `protectedPortfolioWithdrawalRate`
- `protectedPortfolioWithdrawalRateThreshold`
- `protectedPortfolioWithdrawalCapacityCritical`
- `protectedPortfolioWithdrawalGateRole`

Der bisherige `withdrawalBurdenFactor` bleibt ausdruecklich diagnostisch. Bei
aktivem schweren Gate bleiben Null-Flex, Mindest-Flex-Override, separater
Floor-Schutz und der Vor-Gate-Glaettungsanker unveraendert.

## Test- und Messvertrag

- Die dreidimensionale Truth-Matrix prueft Marktregime, die strikte
  Drawdown-Grenze und Belastungsquoten unmittelbar unter, auf und ueber 3,5
  Prozent.
- Ein synthetischer Gegenzeuge bildet hohen Drawdown bei niedrigem offenen
  Mindest-Flex und hohem Restvermoegen ab; Mindest-Flex bleibt erfuellt.
- Ein synthetischer schwerer Fall belegt weiterhin den zulaessigen Override auf
  0.
- Die alte Fixture
  `tests/fixtures/safety-policy-slice-03-measurement-v1.json` bleibt
  unveraendert. Der Nachfolgekandidat liegt in
  `tests/fixtures/minimum-flex-severe-affordability-measurement-v1.json`.
- Der Nachfolgekandidat enthaelt keine persoenlichen Replaydaten und bleibt
  `pending_external_review`.

Die versionierte Messung zeigt erwartete finanzielle Pfadänderungen: In der
integrierten historischen Referenz entfallen die vier bisherigen schweren
Null-Flex-Jahre, ohne Floorverletzung oder FlowDelta. Monte-Carlo-, Sweep- und
Demografiepfade behalten Outcome-, Laufzeit-, Pflege- und technische
Invarianten, weisen wegen der geaenderten Entnahmen aber neue Finanzhashes und
Vermoegensverteilungen aus. Diese Deltas sind ein technischer
Regressionsnachweis und keine Modellfreigabe.

## Validierung

- `node tests/run-single.mjs tests/spending-safety-cap.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-keyparams.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-copy-contract.test.mjs`
- `node tests/run-single.mjs tests/simulation.test.mjs`
- `npm run build:engine`
- `npm test`

Codex dokumentiert nur die technische Selbstpruefung. Die finale Bewertung und
Freigabe erfolgt durch Gemini, Claude oder den Nutzer.
