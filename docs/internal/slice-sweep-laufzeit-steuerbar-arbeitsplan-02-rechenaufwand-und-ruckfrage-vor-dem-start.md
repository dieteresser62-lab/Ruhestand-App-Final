# Slice 2 von 4 – Rechenaufwand und Rückfrage vor dem Start

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Die tatsächliche Größenordnung der geplanten Rechnung vor dem Start sichtbar machen und Großlasten bewusst bestätigen lassen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- Am SOURCE-Vertrag steht vor dem Start mindestens `Kombinationen × Läufe × Jahre` neben dem Grid-Zähler; Änderungen eines der drei Faktoren und Änderungen wirksamer Ranges aktualisieren den Text ohne Start.
- Am SOURCE-Vertrag ist `5.000.000` selbst ohne Rückfrage zulässig, ein höherer Wert fordert Bestätigung; Ablehnung erzeugt keinen Worker-Job, kein serielles Rechnen und kein neues Ergebnis.
- Am SOURCE-Vertrag zeigt die Oberfläche keine erfundene Minutenzahl und bezeichnet die Laufjahre als nominell; ungültige Eingaben erscheinen nicht als belastbarer Aufwand.
- Der Browserfall in `tests/browser-smoke.test.mjs` prüft die Berechnung, die Schwellenränder und Ablehnung; bestehender Grid-Zähler und das 300-Kombinationen-Limit bleiben gleich.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Simulator.html`
- `app/simulator/simulator-main-sweep-ui.js`
- `app/simulator/simulator-sweep.js`
- `docs/internal/slice-sweep-laufzeit-steuerbar-arbeitsplan-02-rechenaufwand-und-ruckfrage-vor-dem-start.md`
- `docs/internal/sweep-laufzeit-steuerbar-implement-review-098ffcd9.md`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Neben dem Grid-Zähler steht die nominelle Rechnung aus den wirksamen Kombinationen, der validierten Sweep-Laufzahl und der validierten MC-Dauer. Änderungen der Faktoren und der aktiven Ranges aktualisieren den Text sofort; bei ungültigen Eingaben oder mehr als 300 Kombinationen erscheint `?`.
> - Mehr als 5.000.000 nominelle Laufjahre lösen nach der Eingabevalidierung und vor dem Start eine Rückfrage mit dem konkreten Aufwand aus. Eine Ablehnung lässt vorhandene Ergebnisse und die Fortschrittsanzeige unverändert. Die Oberfläche erklärt den Aufwand ohne Minutenschätzung.
> - Der Browser-Smoke prüft Faktorenwechsel, ungültige Werte, das Grid-Limit und beide Seiten der Rückfrageschwelle einschließlich Ablehnung.

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
> Geprüft: Pfadgrenze (nur 4 erlaubte Pfade geändert), Korrektheit von calculateSweepWorkload (Safe-Integer-Prüfung aller Faktoren und des Produkts, Fehler statt Scheinwert), UI-Aktualisierung über sweepRuns/mcDauer-Listener und aktive Ranges, Grid-Limit 300 unverändert, Schwellwert strikt '>' 5.000.000, Ablehnungspfad (return vor Fortschrittsanzeige, Worker-Start und Ergebnis-Zuweisung; finally reaktiviert Button, progressStarted verhindert 100%-Anzeige), keine Minutenprognose, Laufjahre als nominell bezeichnet, Browser-Smoke deckt Rechnung, Schwellenränder und Ablehnung ab. Attestierung npm test PASS zum Fingerprint [Hash ausgelassen].

Größtes Restrisiko:
> Der Browser-Smoke läuft laut Repo-Regeln separat (npm run test:browser) und ist nicht Teil der Attestierung; die neuen Browserassertions sind also nur statisch geprüft. Zudem startet der Schwellenrandfall mit 125.000 Läufen × 40 Jahren einen echten Sweep, dessen Dauer vom vorherigen (ggf. ungültigen) Kombinationszustand abhängt und das 30-s-Timeout reißen könnte; der Worker-Zähler erfasst vorab gepoolte Worker nicht.

Bruchbedingung:
> Das Urteil kippt, wenn vor dem confirm-Aufruf bereits window.sweepExecution/sweepResults oder die Heatmap zurückgesetzt bzw. Worker gestartet werden, wenn readMonteCarloParameters ungültige Laufzahl/Dauer still begrenzt statt zu werfen, oder wenn npm run test:browser mit den neuen Assertions rot läuft.

Vorab-Risikoanalyse:
> Wahrscheinlichster Fehlschlag nach Merge: Der Browser-Smoke-Fall am Schwellwert (5.000.000 nominelle Laufjahre) rechnet real und wird auf langsamer Hardware zu langsam, oder die Ablehnungsprüfung per Worker-Zähler bleibt bei gepoolten Workern wirkungslos. Fachlich ist die Rückfrage korrekt vor jeder Seiteneffekt-Aktion platziert; Folgeslices 3/4 (Fortschritt, Abbruch) müssen progressStarted-Logik und frühen return erhalten.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20260925-174253.834895Z-28177406be99`, Arbeitseinheit(en) 3; Nachweise in der Recordkette.
<!-- audit:reference:end -->
