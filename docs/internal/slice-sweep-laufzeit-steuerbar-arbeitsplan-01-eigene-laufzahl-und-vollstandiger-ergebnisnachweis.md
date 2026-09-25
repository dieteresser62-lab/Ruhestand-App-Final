# Slice 1 von 4 – Eigene Laufzahl und vollständiger Ergebnisnachweis

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Den Sweep von `mcAnzahl` entkoppeln, den Wert dauerhaft speichern und den bestehenden Request-/Provenienzvertrag mit der tatsächlich verwendeten Laufzahl füllen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- Am SOURCE-Vertrag zeigt ein frischer Simulator 500 Sweep-Läufe; bei `mcAnzahl=10000` oder ungültigem `mcAnzahl` und `sweepRuns=500` verwendet der Sweep 500, während ein normaler MC-Start weiter sein eigenes Feld liest.
- Am SOURCE-Vertrag überlebt eine geänderte Laufzahl das Neuladen; fehlender Speicherwert führt zu 500, leerer oder ungültiger gespeicherter Wert wird nicht still zu 500 korrigiert und verhindert den Sweep mit verständlicher Meldung.
- Am SOURCE-Vertrag tragen Request und jede gültige wie ungültige Ergebnis-Provenienz denselben validierten Wert; Methode, Dauer, Blockgröße, Seed, Startjahr- und CAPE-Einstellungen behalten ihre bisherige Herkunft und die Versionskennungen bleiben stabil.
- Fokussierte Regressionen: `node tests/run-single.mjs tests/monte-carlo-parameters.test.mjs`, `node tests/run-single.mjs tests/simulator-sweep.test.mjs`; Browserfall in `tests/browser-smoke.test.mjs` prüft Feld, Persistenz, Entkopplung, Fehlereingabe und Provenienz.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Simulator.html`
- `app/simulator/monte-carlo-ui.js`
- `app/simulator/simulator-sweep.js`
- `docs/internal/slice-sweep-laufzeit-steuerbar-arbeitsplan-01-eigene-laufzahl-und-vollstandiger-ergebnisnachweis.md`
- `docs/internal/sweep-laufzeit-steuerbar-implement-review-098ffcd9.md`
- `tests/browser-smoke.test.mjs`
- `tests/monte-carlo-parameters.test.mjs`
- `tests/simulator-sweep.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - `Simulator.html` enthält das eigene Feld `sweepRuns` mit dem Anfangswert 500 und denselben harten Grenzen wie die MC-Laufzahl.
> - Der Sweep liest nur für die Laufzahl `sweepRuns`; Methode, Dauer, Blockgröße, Seed, Startjahr und CAPE behalten ihre bisherigen Quellen. Der normale MC-Start liest weiter `mcAnzahl`.
> - `sim.sweep.runs` speichert Eingaben über die Persistenz-Fassade. Fehlende Werte belassen den HTML-Anfangswert; leere und ungültige Werte führen beim Start zu einer verständlichen Validierungsmeldung.
> - Der bestehende versionierte Sweep-Request transportiert die validierte Laufzahl. Die vorhandene Ergebnis-Provenienz übernimmt das vollständige normalisierte Parameterobjekt auch für ungültige Kombinationen.
> - Regressionsfälle prüfen Entkopplung, Persistenz und Provenienz. Der Browserfall wurde um Neuladen, Fehleingaben und gültige wie ungültige Ergebnisse ergänzt.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil freigegeben · 0 neu, 0 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
Keine.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Korrektheit: `readMonteCarloParameters(inputs, { runsElementId: 'sweepRuns' })` liest nur für den Sweep das eigene Feld und prüft es mit `readIntegerInput` gegen `MONTE_CARLO_PARAMETER_LIMITS.runs`. Der Standardaufruf bleibt bei `mcAnzahl`, der normale MC-Start ist also nicht betroffen. Verträge: Der Request läuft weiter über `normalizeSweepRequestV1`. Die Unit-Tests zeigen, dass die gesamte Provenienz für gültige und ungültige Kombinationen gleich `request.monteCarloParameters` ist. Methode, Dauer, Blockgröße, Seed, Startjahr und CAPE bleiben erhalten. Persistenz: Neuer Schlüssel `sim.sweep.runs`. Ein fehlender Wert ergibt den HTML-Default 500. Ein leerer oder ungültiger Wert wird nur für `sweepRuns` sichtbar übernommen und nicht still korrigiert. Andere Felder behalten ihr bisheriges Verhalten. Fehlerpfade: Leere, nicht ganzzahlige und ungültige Werte werden abgewiesen; laut Browserfall erscheint eine Meldung, und es entsteht kein `sweepExecution`. Umfang: Alle geänderten Pfade liegen in der Slice-Allowlist. Validierung: `npm test` PASS mit passendem Fingerprint.

Größtes Restrisiko:
> Der Browser-Smoke gehört nicht zur attestierten `npm test`-Suite. In den Fehlerfällen liest er `__browserSmokeAlerts` direkt nach dem Klick, ohne auf die Meldung zu warten. Tritt die Meldung in `runParameterSweep` erst nach einem echten asynchronen Schritt auf, kann der Test flackern.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn `readIntegerInput` leere oder nicht ganzzahlige Werte doch annimmt oder wenn der gemeinsame Persistenz-Listener `sweepRuns` nicht unter `sim.sweep.runs` speichert. Ebenso, wenn `runParameterSweep` vor dem Lesen der Parameter schon einen Teilzustand in `window.sweepExecution` schreibt oder wenn `npm run test:browser` im Sweep-Integrationsfall rot wird.

Vorab-Risikoanalyse:
> Wahrscheinlichste Fehlerursache nach dem Merge: Der Browserfall prüft die Alert-Meldung ohne `waitForFunction` und könnte deshalb in CI flackern. Außerdem kann ein Nutzer mit leerem gespeichertem Wert erst nach dem Klick sehen, warum der Sweep nicht startet. Das ist laut Abnahmekriterium so gewollt. Die Kopplung an `mcAnzahl` ist nachweislich aufgehoben, und der Provenienzvertrag bleibt unverändert.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20260925-174253.834895Z-28177406be99`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
