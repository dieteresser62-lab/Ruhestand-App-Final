# Slice 3 von 4 – Zwischenfortschritt in Worker und seriellem Pfad

<!-- audit:status:begin -->
Freigegeben in Runde 2 · 2 Befunde, 2 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Fortschritt bereits während der ersten lang laufenden Kombination sichtbar machen, ohne Ergebnisparität oder Prozentgrenzen zu verletzen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- Am SOURCE-Vertrag steigt der sichtbare Balken vor dem Ende des ersten Blocks sowohl bei Workern als auch bei erzwungenem seriellem Fallback; der Browser kann im seriellen Pfad dazwischen einen Paint und einen Klick verarbeiten.
- Am SOURCE-Vertrag laufen Prozentwerte trotz paralleler, verspäteter oder doppelter Nachrichten nie rückwärts; 100 % erscheint erst, wenn jede Kombination abgeschlossen und das Gesamtergebnis vollständig ist.
- Am SOURCE-Vertrag sind Resultate, Seeds, Sampling-Fingerprints und Provenienz mit und ohne Fortschritts-Hook sowie zwischen Worker und seriellem Pfad gleich; ungültige Kombinationen bleiben unverändert klassifiziert.
- Fokussierte Regressionen: `node tests/run-single.mjs tests/simulator-sweep.test.mjs`, `node tests/run-single.mjs tests/worker-lifecycle-isolation.test.mjs`, `node tests/run-single.mjs tests/worker-parity.test.mjs`; der Browserfall erzwingt einen länger dauernden ersten Block und den seriellen Pfad ohne minutenlangen Rechenlauf.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `app/simulator/simulator-sweep.js`
- `app/simulator/sweep-runner.js`
- `app/simulator/worker-job-runner.js`
- `docs/internal/slice-sweep-laufzeit-steuerbar-arbeitsplan-03-zwischenfortschritt-in-worker-und-seriellem-pfad.md`
- `docs/internal/sweep-laufzeit-steuerbar-implement-review-098ffcd9.md`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-sweep.test.mjs`
- `tests/worker-lifecycle-isolation.test.mjs`
- `tests/worker-parity.test.mjs`
- `workers/mc-worker.js`
<!-- audit:scope:end -->

## Umsetzung

> - Der Sweep-Kern liefert nach abgeschlossenen Läufen und Kombinationen Fortschrittseinheiten. Die synchrone Worker-Ausführung und die asynchrone serielle Ausführung verwenden denselben Iterator und damit dieselbe Ergebnisberechnung.
> - Der serielle Pfad gibt beim ersten sichtbaren Zwischenstand einen Browser-Frame frei und pausiert danach nur bei mindestens 16 ms vergangener Rechenzeit. Worker senden Zwischenstände mit Generation und Blockbereich; der Job-Runner zählt parallele Blöcke zusammen und ignoriert doppelte, veraltete oder fremde Meldungen.
> - Der sichtbare Balken bleibt bis zum vollständig veröffentlichten Ergebnis unter 100 Prozent. Beim Worker-Fallback bleiben die angezeigten Werte monoton.
> - Regressionen decken Ergebnis- und Provenienzparität, ungültige Kombinationen, gedrosselte Pausen, parallele Nachrichten, eine echte Worker-Nachricht innerhalb des einzigen Blocks sowie Paint und Klick während des seriellen ersten Blocks ab.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil abgelehnt · 2 neu, 0 geschlossen.
- Runde 2: Korrektur · Validierung grün · Prüfurteil freigegeben · 0 neu, 2 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
### C-01 – Serieller Pfad: `runSweepChunkAsync` gibt nach jedem Fortschrittsschritt per `await new Promise(resolve =>…

Klasse: Befund · Stand: geschlossen

Befund:
> Serieller Pfad: `runSweepChunkAsync` gibt nach jedem Fortschrittsschritt per `await new Promise(resolve => setTimeout(resolve, 0))` an die Event-Loop ab. `iterateSweepChunk` erzeugt für jede Kombination bis zu 101 Schritte: alle `floor(anzahlRuns/100)` Läufe einen Schritt plus einen Abschlussschritt. Bei kleinem `anzahlRuns` gibt es sogar einen Schritt pro Lauf. Browser (Chromium/WebView2) setzen verschachtelte Timer-Ketten nach fünf Ebenen auf mindestens 4 ms. Dadurch kommen pro Kombination bis zu ≈0,4 s reine Wartezeit hinzu, unabhängig vom Rechenaufwand. Bei vielen Kombinationen verlängert das den seriellen Sweep um ein Vielfaches (z. B. 100 Kombinationen → ≈40 s Leerlauf). Vorher gab es nur eine Pause pro Block. Das widerspricht dem Ziel des Vorhabens, die Laufzeit steuerbar zu machen, und entwertet die Aufwandsschätzung aus Slice 2 für den Fallback.

Akzeptanztest:
> Der serielle Pfad gibt zeitbasiert an die Event-Loop ab, z. B. nur, wenn seit der letzten Pause ≥16–50 ms vergangen sind (`performance.now()`). Alternativ darf eine nicht gedrosselte Abgabe (etwa über MessageChannel) die Zahl der Pausen pro Kombination begrenzen. Ein Test mit einer gemockten Zeitquelle oder gezählten Pausen zeigt, dass bei schnellen Läufen deutlich weniger als ein Timer-Yield pro Fortschrittsschritt entsteht. Browser-Paint und Klick im seriellen Pfad sind weiterhin nachgewiesen, und die Ergebnisparität bleibt unverändert.

Antwort des Implementierers, Runde 2 (angenommen):
> Serielle Pausen sind zeitlich auf mindestens 16 ms Abstand gedrosselt; ein erster Browser-Frame bleibt möglich. Ein Test mit gemockter Zeitquelle zählt bei schnellen Fortschrittsschritten nur eine Pause. Browser-Smoke und Ergebnisparität bestehen.

Abschlussbegründung des Prüfers:
> `runSweepChunkAsync` pausiert jetzt nur beim ersten Fortschritt und danach nur, wenn `now() - lastYieldAt >= 16` gilt. Zeitquelle und Yield-Funktion lassen sich injizieren. Ein Test in `tests/simulator-sweep.test.mjs` mit `now: () => 0` und gezählten Pausen erwartet genau eine Pause und byte-identische Resultate gegenüber `runSweepChunk`. Die frühere Pause pro Block in `runSweepSerial` entfällt. Der Browser-Smoke prüft im seriellen Pfad weiterhin Zwischenbreite, rAF-Lauf während des Sweeps, Klick und Parität mit dem Worker-Ergebnis.

### C-02 – Der Browser-Smoke weist im Worker-Pfad keinen Zwischenfortschritt innerhalb eines Blocks nach

Klasse: Befund · Stand: geschlossen

Befund:
> Der Browser-Smoke weist im Worker-Pfad keinen Zwischenfortschritt innerhalb eines Blocks nach. Der MutationObserver setzt `__sweepWorkerProgress` bei jeder Breite zwischen 0 und 100 %. Werden die zwei Kombinationen auf mehrere Worker-Jobs verteilt (Chunkgröße aus `minChunk`/`workerCount`), erzeugt schon der Abschluss des ersten Blocks 50 %, und der Test ist grün, ohne dass eine `phase: 'sweep'`-Nachricht aus `workers/mc-worker.js` angekommen wäre. Die Verdrahtung Worker → Pool → `WorkerJobRunner` (Nachrichtenform, `generationId`, `comboRange`) ist damit für das Abnahmekriterium ‚steigt vor dem Ende des ersten Blocks … bei Workern‘ nicht belegt. Der Unit-Test in `tests/worker-lifecycle-isolation.test.mjs` nutzt einen Pool-Mock und prüft die echte Worker-Nachricht nicht.

Akzeptanztest:
> Der Browser- oder Worker-Test erzwingt einen einzigen ersten Worker-Block, z. B. eine Kombination mit mehreren Läufen oder eine Blockgröße ≥ Kombinationszahl. Er weist nach, dass eine Breite zwischen 0 und 100 % gemeldet wird, bevor irgendein Block abgeschlossen ist. Alternativ belegt der Test, dass mindestens eine echte `progress`-Nachricht mit `phase: 'sweep'` und passender `generationId` im Runner verarbeitet wurde.

Antwort des Implementierers, Runde 2 (angenommen):
> Der Browser-Smoke erzwingt einen einzelnen Worker-Block und prüft eine echte Fortschrittsnachricht mit passender Generation und passendem Blockbereich sowie sichtbaren Fortschritt vor dem Blockende.

Abschlussbegründung des Prüfers:
> Der Smoke-Fall nutzt jetzt genau eine Kombination (`sweepLiquidityRunwayYears=3`, 30 Läufe) und damit genau einen Worker-Block. Nach dem Blockabschluss begrenzt `reportProgress` den Wert auf 99, daher kann eine beobachtete Breite zwischen 0 und 99 nur aus Teilfortschritt stammen. Zusätzlich fängt eine `Worker`-Unterklasse echte Nachrichten mit `type: 'progress'` und `phase: 'sweep'` ab. Geprüft werden die passende `generationId` über die zugeordnete `jobId`, `comboRange {start:0,count:1}` und `0 < completedUnits < 1`. Beide Bedingungen sind Teil der Assertion.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.

- Runde 2: `npm test` · grün · Exitcode 0.
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft wurden:
> - die Drosselung in `runSweepChunkAsync` und das Generator-Refactoring: `iterateSweepChunk` liefert an allen Kombinationsausgängen ein `yield`;
> - Monotonie und 99-%-Deckel in `WorkerJobRunner` und `showProgress`; 100 % gibt es nur bei `completedSuccessfully`;
> - der Nachrichtenfilter über `generationId`, `comboRange` und `scheduledRanges`;
> - die Ergebnisparität per Hook, asynchron und zwischen Worker und seriellem Pfad;
> - die Pfadgrenze und die Attestation `npm test` PASS auf dem aktuellen Fingerprint.

Größtes Restrisiko:
> Die Standard-Pause wartet auf `requestAnimationFrame`. In einem verdeckten Tab oder minimierten Fenster kann der serielle Fallback dadurch anhalten, bis die Seite wieder sichtbar ist. Außerdem ist der Browser-Smoke nicht Teil von `npm test` und damit nicht durch die Attestation abgedeckt.

Bruchbedingung:
> Das Urteil kippt in drei Fällen:
> - `npm run test:browser` schlägt im Sweep-Integrationsfall fehl.
> - Worker- und serielle Ergebnisse unterscheiden sich.
> - Ein Worker-Block meldet nach Abschluss eine Breite unter 99, sodass der Einzelblock-Nachweis nicht mehr trennscharf ist.

Vorab-Risikoanalyse:
> Scheitert der Slice später, dann am wahrscheinlichsten, weil der serielle Fallback in einem Hintergrundfenster durch rAF-basierte Pausen stehen bleibt. Möglich ist auch, dass der Browser-Smoke in CI nicht läuft und die Worker-Nachrichtenverdrahtung unbemerkt bricht. Beides verfälscht keine Ergebnisse, betrifft aber Laufzeit und Beobachtbarkeit.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20260925-174253.834895Z-28177406be99`, Arbeitseinheit(en) 4; Nachweise in der Recordkette.
<!-- audit:reference:end -->
