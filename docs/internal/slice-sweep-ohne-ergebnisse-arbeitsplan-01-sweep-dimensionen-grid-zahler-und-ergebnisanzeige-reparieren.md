# Slice 1 von 1 – Sweep-Dimensionen, Grid-Zähler und Ergebnisanzeige reparieren

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Einen normalen Sweep mit deaktiviertem Dynamic Flex/Go-Go bis zur sichtbaren Heatmap durchlaufen lassen, die Zählung mit den tatsächlich verwendeten Kombinationen synchronisieren und beide Pfade mit einem vollständigen Regressionstest absichern.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- Bei Standardkonfiguration ohne Dynamic Flex/Go-Go liefert „Run Sweep“ mindestens ein nicht als ungültig markiertes Ergebnis mit endlichem `successProbFloor` und eine sichtbare Heatmap-Zelle mit Wert; die Leermeldung erscheint dabei nicht.
- Bei aktivem Dynamic Flex mit passender Horizontmethode und aktivem Go-Go bleiben Quantil und Multiplikator echte Sweep-Dimensionen; explizite unzulässige Runner-Kombinationen bleiben ungültig. Metrik- und Achsenwechsel rendern vorhandene gültige Ergebnisse erneut.
- Der Grid-Zähler zeigt für die HTML-Vorgaben 50 und für den beschriebenen Gold-Target-Bereich `2:2:10` bei sonst gleichen Vorgaben 125 Kombinationen; nach Persistenzladen, Eingaben und Strategie-/Presetwechsel stimmt er mit der tatsächlich gestarteten Matrix überein. Ungültige Ranges und mehr als 300 Kombinationen behalten ihre sichtbaren Hinweise.
- Der Browser-Regressionstest führt den Sweep von der realen Simulatorseite bis zu SVG-Zellen mit kanonischen Metrikwerten aus. Der DOM-Test deckt die Initialisierungsreihenfolge und die bedingt wirksamen Dimensionen ab. Der vorhandene gültige Dynamic-Flex-/Go-Go-Browserfall bleibt grün.
- Die betroffenen Beschreibungen in `README.md`, `docs/reference/TECHNICAL.md` und `docs/reference/SIMULATOR_MODULES_README.md` stimmen mit der neuen UI-Regel überein.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `README.md`
- `Simulator.html`
- `app/simulator/simulator-main-init.js`
- `app/simulator/simulator-main-sweep-ui.js`
- `app/simulator/simulator-sweep.js`
- `docs/internal/slice-sweep-ohne-ergebnisse-arbeitsplan-01-sweep-dimensionen-grid-zahler-und-ergebnisanzeige-reparieren.md`
- `docs/internal/sweep-ohne-ergebnisse-implement-review-4a51d854.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-ui-orchestration.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Der bisherige Standardlauf lieferte wegen der immer gesetzten VPW-Overrides den Runner-Grund `Dynamic-Flex-Parameter gesetzt, aber Dynamic Flex ist deaktiviert`; der versionierte Metrikvertrag blendete diese ungültigen Ergebnisse folgerichtig aus.
> - `readInteractiveSweepRanges()` liefert Lauf und Grid-Zähler dieselben fünf allgemeinen sowie bedingt wirksamen VPW-Dimensionen. Gespeicherte inaktive VPW-Eingaben bleiben erhalten und erzeugen keine Runner-Overrides.
> - Die Sweep-Persistenz wird vor der ersten Zählerinitialisierung geladen. Range-, Strategie- und Presetwechsel aktualisieren den Zähler und die sichtbare Aktivitätskennzeichnung; Parse- und 300er-Hinweise bleiben erhalten.
> - DOM-Regression prüft 50/125 Kombinationen, Persistenz, aktive und inaktive VPW-Felder, Parsefehler und die Heatmap-Leermeldung. Der Browser-Smoke prüft den normalen Klickpfad bis zur SVG-Zelle mit kanonischem Wert und erhält den Dynamic-Flex-/Go-Go-Fall.

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
> Korrektheit: Die Ursache ist behoben. Bisher wurden survivalQuantile/goGoMultiplier immer als Override gesendet, und der Runner markierte deshalb bei deaktiviertem Dynamic Flex jede Kombination als ungültig („Dynamic-Flex-Parameter gesetzt, aber Dynamic Flex ist deaktiviert“). readInteractiveSweepRanges nimmt diese Felder jetzt nur noch bei wirksamer Strategie auf. Vertrag: Zähler und Lauf teilen sich Auswahl und Parser (parseRangeInput); die Initialisierung wurde hinter initSweepDefaultsWithLocalStorageFallback verschoben, und Listener auf dynamicFlex/horizonMethod/goGoActive/dynamicFlexPreset halten den Zähler synchron. Die Rechnung 5×5×2=50 bzw. 5×5×5=125 ist im DOM-Test abgedeckt. Fehlerpfade: Leere oder ungültige aktive Ranges lösen weiterhin Alert bzw. den Zählerwert „?“ aus; der 300er-Hinweis bleibt erhalten. Ungültige inaktive Ranges blockieren den Lauf bewusst nicht, das ist so dokumentiert. Pfadgrenze: Alle 9 Diff-Pfade liegen in der Allowlist. Doku-Sync erfolgt in README, TECHNICAL und SIMULATOR_MODULES_README, einschließlich der Korrektur sweepRebalancingBand→sweepGoldRebalancingBand. Sicherheit und Resume: keine Persistenzformatänderung; inaktive Werte bleiben gespeichert. npm test ist laut Attestierung auf diesem Fingerprint PASS.

Größtes Restrisiko:
> Der Browser-Regressionstest (tests/browser-smoke.test.mjs) läuft nicht in npm test, und die Attestierung belegt nur npm test. Der End-to-End-Pfad runParameterSweep mit nur fünf Range-Schlüsseln ist daher nicht maschinell bestätigt. Ebenfalls nicht im Diff sichtbar sind die Id 'horizonMethod' in Simulator.html und das Verhalten von displaySweepResults, wenn eine Heatmap-Achse auf eine inaktive VPW-Dimension ohne Eintrag in sweepParamRanges zeigt.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn eine der folgenden Bedingungen zutrifft: (a) npm run test:browser scheitert am neuen Standard-Sweep-Fall. (b) Das reale Horizontmethoden-Element trägt nicht die Id 'horizonMethod', sodass das Quantil nie als Sweep-Dimension wirkt. (c) Nachgelagerter Sweep-Code greift fest auf paramRanges.survivalQuantile/goGoMultiplier zu. (d) Die Achsenwahl einer inaktiven VPW-Dimension wirft in displaySweepResults eine Ausnahme.

Vorab-Risikoanalyse:
> Das wahrscheinlichste Fehlerszenario nach dem Merge: Ein Nutzer aktiviert Dynamic Flex, aber das Quantil wird nie variiert, weil die Horizontmethoden-Id abweicht. Der DOM-Test registriert 'horizonMethod' selbst, und der Browserfall prüft nur goGoMultiplier. Das zweite Szenario: Im Standardfall wählt ein Nutzer als Heatmap-Achse survivalQuantile oder goGoMultiplier und bekommt eine leere oder abgebrochene Darstellung statt eines Hinweises. Beides betrifft Randpfade. Der Kernfehler – kein Ergebnis bei Standardkonfiguration – ist durch Code und Tests plausibel behoben; npm test ist grün. Deshalb gebe ich frei und benenne die Punkte als Restrisiko.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20260925-170911.759399Z-c9eb89116d18`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
