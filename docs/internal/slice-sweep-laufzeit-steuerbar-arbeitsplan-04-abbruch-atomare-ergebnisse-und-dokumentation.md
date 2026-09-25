# Slice 4 von 4 – Abbruch, atomare Ergebnisse und Dokumentation

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Laufende Sweeps zuverlässig abbrechen, frühere vollständige Ergebnisse bewahren und den Nutzer-Workflow dokumentieren.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- Am SOURCE-Vertrag ist Abbrechen während eines Worker-Sweeps bedienbar, terminiert aktive Worker, meldet „Abgebrochen“ sichtbar, gibt den Startknopf frei und veröffentlicht kein Teilresultat als gültige Heatmap.
- Am SOURCE-Vertrag bleibt ein älteres vollständiges Ergebnis bei Abbruch oder Fehler einschließlich `window.sweepExecution` und Heatmap unverändert; ohne Altresultat bleibt der Ergebnisbereich leer. Ein direkt folgender Sweep mit neuer Generation endet vollständig, ohne späte Meldungen des alten Laufs.
- Am SOURCE-Vertrag funktioniert derselbe Abbruch im seriellen Fallback an der nächsten kurzen Yield-Grenze; ein Nutzerabbruch löst keinen Worker-zu-Seriell-Fallback aus und zeigt niemals 100 %.
- Am SOURCE-Vertrag beschreiben `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/SIMULATOR_MODULES_README.md` und `Handbuch.html` denselben Stand und dieselbe Schwelle; MC-Reiter und Auto-Optimize bleiben unverändert.
- Fokussierte Regressionen: `node tests/run-single.mjs tests/worker-lifecycle-isolation.test.mjs`, `node tests/run-single.mjs tests/simulator-sweep.test.mjs`; der Browserfall prüft Abbruch, alte Heatmap, sofortigen Neustart und vollständigen zweiten Lauf.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Handbuch.html`
- `README.md`
- `Simulator.html`
- `app/simulator/simulator-sweep.js`
- `app/simulator/sweep-runner.js`
- `docs/internal/slice-sweep-laufzeit-steuerbar-arbeitsplan-04-abbruch-atomare-ergebnisse-und-dokumentation.md`
- `docs/internal/sweep-laufzeit-steuerbar-implement-review-098ffcd9.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-sweep.test.mjs`
- `tests/worker-lifecycle-isolation.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Abbruchknopf und sichtbarer Laufstatus sind an die aktive Sweep-Generation gebunden. Nutzerabbruch beendet den Worker-Pool, stoppt den seriellen Pfad an seiner Yield-Grenze und verhindert den Fallback.
> - Fortschritt und Ergebnisse eines abgebrochenen Laufs werden verworfen. Erst vollständig berechnete und erfolgreich gerenderte Ergebnisse ersetzen gemeinsam Heatmap, Ranges und `window.sweepExecution`.
> - README, technische Referenzen und Handbuch nennen dieselbe Großlastschwelle von mehr als 5.000.000 nominellen Laufjahren und den Abbruch-Workflow.

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
> Geprüft wurden alle Diff-Pfade dieses Slices. Alle liegen innerhalb der exakten Allowlist. Worker-Abbruch: `cancelParameterSweep` ruft `controller.abort()` auf und danach `pool.dispose()`. Der Runner erhält `signal`. `throwIfSweepCancelled` greift vor und nach `broadcast`. Bei Abbruch oder `isWorkerRunCancelledError` gibt es keinen seriellen Fallback. Serieller Pfad: Das Signal wird vor `iterator.next()` und direkt nach `yieldToEventLoop` geprüft, also an der nächsten gedrosselten Yield-Grenze. Die Drosselung aus C-01 bleibt erhalten. Atomare Veröffentlichung: Die Vollständigkeit wird geprüft, die Heatmap vorab gerendert, dann werden `sweepResults`, `sweepExecution`, `sweepParamRanges`, Heatmap und Buttons gemeinsam gesetzt, mit Rollback im Fehlerfall. 100 % erscheinen nur bei `completedSuccessfully`. Generationen: `activeSweep` sperrt parallele Starts, `showProgress` verwirft Meldungen fremder oder abgebrochener Läufe, und das verzögerte Ausblenden prüft `activeSweep === null`. Dokumentation: README, TECHNICAL, SIMULATOR_MODULES_README und Handbuch nennen übereinstimmend die Schwelle von 5.000.000 Laufjahren, den Abbruch und den Erhalt des Altresultats. Tests: Der Browser-Smoke deckt Worker- und seriellen Abbruch, Erhalt des Altresultats, leeren Zustand ohne Altresultat und sofortigen vollständigen Neustart ab. Ein Unit-Test prüft den AbortError an der ersten Yield-Grenze. `npm test` ist laut Attestierung grün. C-01 und C-02 sind bereits CLOSED; es gibt keine offenen Befunde.

Größtes Restrisiko:
> Ob `WorkerPool.dispose()` ein laufendes `pool.broadcast('sweep-init')` zuverlässig mit einem Reject beendet, geht aus dem Diff nicht hervor. Bricht der Nutzer genau in diesem kurzen Fenster ab und bleibt das Promise hängen, würden `activeSweep` und der Startknopf bis zum Neuladen gesperrt bleiben. Außerdem ist der Browser-Smoke nicht Teil der Attestierung, die nur `npm test` umfasst. Die Abbruchpfade im Browser sind also nur durch den Test-Code belegt, nicht durch einen hier attestierten Lauf.

Bruchbedingung:
> Der Befund wäre zu eröffnen, wenn `WorkerJobRunner` die Option `signal` oder den Export `isWorkerRunCancelledError` nicht unterstützt. Ebenso, wenn `dispose()` ausstehende Broadcasts oder Jobs nicht mit einem Reject beendet und ein Abbruch deshalb nie `finally` erreicht, oder wenn `npm run test:browser` auf diesem Stand bei den neuen Abbruchfällen fehlschlägt.

Vorab-Risikoanalyse:
> Das wahrscheinlichste spätere Scheitern ist ein Abbruch während der Worker-Initialisierung, bei dem das `broadcast`-Promise nach `dispose()` weder erfüllt noch zurückgewiesen wird. Dann bliebe die Sweep-UI gesperrt. Ein zweites Risiko: `displaySweepResults()` wird durch direktes Rendern mit `renderSweepHeatmapSVG` ersetzt. Falls `displaySweepResults` zusätzliche Hinweise gerendert hat, fehlen diese nach einem neuen Lauf, bis Metrik oder Achse gewechselt werden. Beides lässt sich aus dem Paket nicht widerlegen. Es gibt aber keine konkrete Evidenz für einen Defekt, und die Abnahmekriterien des Slices sind im Diff und in den Tests abgebildet.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20260925-174253.834895Z-28177406be99`, Arbeitseinheit(en) 5; Nachweise in der Recordkette.
<!-- audit:reference:end -->
