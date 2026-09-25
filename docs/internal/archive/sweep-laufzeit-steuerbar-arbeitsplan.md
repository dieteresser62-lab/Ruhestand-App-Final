# Arbeitsplan: Parameter-Sweep mit eigener Laufzahl, Aufwand, Fortschritt und Abbruch

## Ausgangslage und verbindliche Entscheidungen

- `app/simulator/simulator-sweep.js` erstellt `SweepRequestV1` derzeit mit `readMonteCarloParameters(baseInputs)`; dadurch stammt `monteCarloParameters.anzahl` aus `mcAnzahl`. `simulator-main-sweep-ui.js` zählt nur Kombinationen. `runSweepChunk()` rechnet synchron und meldet bisher keinen Zwischenstand. `workers/mc-worker.js` sendet für Sweep-Jobs nur Endergebnisse; `WorkerJobRunner` verwendet vorhandene Worker-Zwischenmeldungen bislang nur für die Stillstandsuhr. `WorkerPool.cancelGeneration()` und `WorkerJobRunner` mit `AbortSignal` bieten bereits den Abbruchvertrag.
- Der neue Sweep-Wert heißt im DOM `sweepRuns`, im Speicher `sim.sweep.runs`, im bestehenden Request unverändert `monteCarloParameters.anzahl`. Vorgabe: 500; gültig sind ganze Zahlen von 1 bis 1.000.000 gemäß `MONTE_CARLO_PARAMETER_LIMITS.runs`. Ein fehlender Speicherwert führt zu 500; auch ein leerer oder fehlerhafter gespeicherter Wert bleibt als Eingabe sichtbar und scheitert beim Start. `mcAnzahl` darf selbst bei ungültigem Inhalt den Sweep weder steuern noch blockieren. Die anderen MC-Felder werden unverändert über denselben Reader und Normalisierer gelesen. Dazu erhält `readMonteCarloParameters()` einen optionalen Laufzahl-Override, dessen Weglassen das Verhalten des MC-Reiters unverändert lässt. Keine Schema- oder Engine-Semantikänderung: `SweepRequestV1` und die vorhandene Ergebnis-Provenienz (`normalizedParameters.anzahl`) tragen bereits die tatsächlich validierte Laufzahl.
- Vor dem Start steht neben dem Grid-Zähler die nominelle Rechnung `Kombinationen × Läufe × Jahre = Laufjahre`. „Nominell“ ist wesentlich: Ungültige Kombinationen werden weiterhin übersprungen, und ein Lauf kann vor dem Maximalhorizont enden. Die Jahre kommen aus `mcDauer`, die Kombinationen aus genau den aktiven Sweep-Ranges. Bei ungültigem Feld wird statt einer scheinbar genauen Zahl ein verständliches `?` angezeigt und der Start durch die bestehende Validierung verhindert.
- Es wird **keine Minutenschätzung** angezeigt. Die genannte Messung von etwa 17 ms pro Lauf gilt nur für ein konkretes 35-Jahre-Szenario auf einem Kern; CPU, Anzahl realer Worker, Worker-Initialisierung, Pflege-/Steuerpfade und vorzeitig beendete Läufe ändern die Dauer erheblich. Eine Umrechnung in Minuten wäre daher nicht belastbar. Ab **mehr als 5.000.000 nominellen Laufjahren** fragt die Oberfläche vor dem Start mit dem konkreten Aufwand und einem ausdrücklichen Hinweis auf die unsichere Dauer nach. Die Schwelle ist eine konservative Ressourcenwarnung, keine Zeitprognose: Das typische Beispiel `125 × 500 × 35 = 2.187.500` läuft ohne zusätzliche Rückfrage; ein versehentlicher Rückfall auf `125 × 10.000 × 35 = 43.750.000` wird abgefangen. Ablehnung löst weder Worker-Start noch Ergebnisänderung aus.
- Fortschritt zählt abgeschlossene Kombinationen plus den Anteil bereits absolvierter Läufe je aktiver Kombination; bei ungültigen Kombinationen gilt die Kombination erst mit ihrem Ergebnis als abgeschlossen. Meldungen sind nach Job-/Generationskennung zu filtern, je Kombination monoton zu halten und höchstens in moderater Frequenz (etwa alle 100–250 ms) an die UI zu geben. Der Wert bleibt unter 100 %, bis alle Kombinationen und Ergebnisse vollständig vorliegen. Ein optionaler Fortschritts-Hook im DOM-freien Runner darf Resultate, Seeds, Metriken und die Reihenfolge der Berechnung nicht ändern.
- Der serielle Fallback benötigt echte Unterbrechungen für Browser-Paint und Klicks: Der Rechenkern wird als gemeinsam genutzter, fortsetzbarer Ablauf ausgeführt; die bestehende synchrone `runSweepChunk()`-API leert ihn ohne Yield, ein zusätzlicher serieller Adapter gibt nach kurzen Rechenabschnitten an den Event-Loop ab und prüft das Abbruchsignal. Den Kern nicht für jeden Teilstand neu starten, weil das Zufallspfade und Kosten ändern würde. Der Worker nutzt denselben Kern, sendet nur gedrosselte Zwischenstände und bleibt bei gleicher Request-Eingabe ergebnisgleich zum seriellen Pfad.
- Abbruch ist ein eigener Terminalzustand. Ein `AbortController` pro Sweep-Lauf steuert Worker-Runner und seriellen Adapter. Worker werden über `cancelGeneration()` terminiert; verspätete Nachrichten der alten Generation dürfen weder Fortschritt noch Ergebnis überschreiben. Abbruchfehler lösen **keinen** seriellen Fallback aus. `window.sweepResults`, `window.sweepExecution`, `window.sweepParamRanges` und die Heatmap werden erst nach vollständig erfolgreichem Lauf gemeinsam veröffentlicht; bis dahin bleibt ein früheres vollständiges Ergebnis samt Anzeige erhalten. Startknopf, Abbruchknopf, Status und Fortschrittsanzeige werden in allen Terminalpfaden konsistent zurückgesetzt. Ein neuer Sweep benutzt eine neue Generation.
- Außerhalb des Vorhabens bleiben Engine-Semantik, Metrikdefinitionen, Validierung gültiger Kombinationen, MC-Reiter, Auto-Optimize und generierte Dateien (`engine.js`, `dist/`). Keine Änderungen an öffentlichen Versionskennungen allein wegen zusätzlicher UI-Steuerung oder optionaler Fortschrittsmeldungen.

## Abfolge und Prüfgrenzen

Die Slices bauen aufeinander auf. Nach jedem Slice die angegebenen fokussierten Tests mit `node tests/run-single.mjs <datei>` ausführen; bei DOM-Fällen den Browser-Smoke mit `npm run test:browser`, sofern die Umgebung ihn starten kann. Da DOM-freier Sweep-Runner, Worker und gemeinsame Verträge berührt werden, führt der Orchestrator nach der gesamten Umsetzung `npm test` und separat `npm run test:browser` aus. Codex meldet gezielte Läufe und etwaige Browser-Sandbox-Grenzen; es bearbeitet keine generierten Dateien und führt im orchestrierten Schritt nicht eigenständig die volle Suite aus. Vorhandene Änderungen anderer Beteiligter bleiben unangetastet. Die Tests müssen jeweils bei Wegnahme des neuen Verhaltens rot werden; reine Snapshot-Kopien der Implementierung genügen nicht.

### Slice 1 - Eigene Laufzahl und vollständiger Ergebnisnachweis

**Ziel**

Den Sweep von `mcAnzahl` entkoppeln, den Wert dauerhaft speichern und den bestehenden Request-/Provenienzvertrag mit der tatsächlich verwendeten Laufzahl füllen.

**Exakter Änderungspfad**

- `Simulator.html`
- `app/simulator/monte-carlo-ui.js`
- `app/simulator/simulator-sweep.js`
- `tests/browser-smoke.test.mjs`
- `tests/monte-carlo-parameters.test.mjs`
- `tests/simulator-sweep.test.mjs`

**Umsetzung**

Das Zahlenfeld im Fieldset „Sweep-Ranges“ erhält `value="500"`, verständliches Label und HTML-Grenzen. `simulator-sweep.js` lädt und speichert `sim.sweep.runs` mit `input`/`change`; nur ein wirklich fehlender gespeicherter Wert nutzt 500. Der optionale Override in `readMonteCarloParameters(inputs, options)` ersetzt `anzahl` **vor** `normalizeMonteCarloParametersV1()`; die bisherige Signatur ohne Option bleibt identisch. Der Sweep gibt die rohe neue Eingabe als Override weiter, sodass Leerwert, Dezimalzahl, Suffix, Negativzahl und Überschreitung als konkrete Validierungsfehler vor dem Worker-Start erscheinen. `SweepRequestV1.monteCarloParameters.anzahl`, `window.sweepExecution.request` und jedes `result.provenance.normalizedParameters.anzahl` müssen übereinstimmen.

**Akzeptanzkriterien**

- Am SOURCE-Vertrag zeigt ein frischer Simulator 500 Sweep-Läufe; bei `mcAnzahl=10000` oder ungültigem `mcAnzahl` und `sweepRuns=500` verwendet der Sweep 500, während ein normaler MC-Start weiter sein eigenes Feld liest.
- Am SOURCE-Vertrag überlebt eine geänderte Laufzahl das Neuladen; fehlender Speicherwert führt zu 500, leerer oder ungültiger gespeicherter Wert wird nicht still zu 500 korrigiert und verhindert den Sweep mit verständlicher Meldung.
- Am SOURCE-Vertrag tragen Request und jede gültige wie ungültige Ergebnis-Provenienz denselben validierten Wert; Methode, Dauer, Blockgröße, Seed, Startjahr- und CAPE-Einstellungen behalten ihre bisherige Herkunft und die Versionskennungen bleiben stabil.
- Fokussierte Regressionen: `node tests/run-single.mjs tests/monte-carlo-parameters.test.mjs`, `node tests/run-single.mjs tests/simulator-sweep.test.mjs`; Browserfall in `tests/browser-smoke.test.mjs` prüft Feld, Persistenz, Entkopplung, Fehlereingabe und Provenienz.

### Slice 2 - Rechenaufwand und Rückfrage vor dem Start

**Ziel**

Die tatsächliche Größenordnung der geplanten Rechnung vor dem Start sichtbar machen und Großlasten bewusst bestätigen lassen.

**Exakter Änderungspfad**

- `Simulator.html`
- `app/simulator/simulator-main-sweep-ui.js`
- `app/simulator/simulator-sweep.js`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

Ein eigener Text neben `sweepGridSize` zeigt den nominellen Ausdruck und das Produkt in deutschen Zahlformaten. `initSweepUIControls()` aktualisiert ihn nach dem Persistenzladen und bei Range-, Strategie-, Preset-, Sweep-Laufzahl- und `mcDauer`-Änderungen. Für Anzeige und Start werden derselbe Range-Parser und dieselben validierten Laufzahl-/Dauerwerte verwendet; eine ungültige Eingabe zeigt `?`, nicht einen geratenen Wert. Nach der vollständigen Eingabevalidierung, aber vor `WorkerPool`-Initialisierung, wird bei `Kombinationen × Läufe × Jahre > 5.000.000` eine konkrete Bestätigung angefordert. Bei Ablehnung werden weder ein neuer Lauf gestartet noch alte Ergebnisse verändert. Die UI erklärt, dass die Zahl ein Aufwand und keine Laufzeitprognose ist.

**Akzeptanzkriterien**

- Am SOURCE-Vertrag steht vor dem Start mindestens `Kombinationen × Läufe × Jahre` neben dem Grid-Zähler; Änderungen eines der drei Faktoren und Änderungen wirksamer Ranges aktualisieren den Text ohne Start.
- Am SOURCE-Vertrag ist `5.000.000` selbst ohne Rückfrage zulässig, ein höherer Wert fordert Bestätigung; Ablehnung erzeugt keinen Worker-Job, kein serielles Rechnen und kein neues Ergebnis.
- Am SOURCE-Vertrag zeigt die Oberfläche keine erfundene Minutenzahl und bezeichnet die Laufjahre als nominell; ungültige Eingaben erscheinen nicht als belastbarer Aufwand.
- Der Browserfall in `tests/browser-smoke.test.mjs` prüft die Berechnung, die Schwellenränder und Ablehnung; bestehender Grid-Zähler und das 300-Kombinationen-Limit bleiben gleich.

### Slice 3 - Zwischenfortschritt in Worker und seriellem Pfad

**Ziel**

Fortschritt bereits während der ersten lang laufenden Kombination sichtbar machen, ohne Ergebnisparität oder Prozentgrenzen zu verletzen.

**Exakter Änderungspfad**

- `app/simulator/simulator-sweep.js`
- `app/simulator/sweep-runner.js`
- `app/simulator/worker-job-runner.js`
- `workers/mc-worker.js`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-sweep.test.mjs`
- `tests/worker-lifecycle-isolation.test.mjs`
- `tests/worker-parity.test.mjs`

**Umsetzung**

Der DOM-freie Sweep-Kern liefert optionale Teilstände mit `comboIdx`, `completedRuns` und `totalRuns`; auch kurze und vorzeitig ungültige Kombinationen liefern einen sauberen Abschlussstand. `mc-worker.js` sendet für Sweep nur gedrosselte `progress`-Nachrichten mit `jobId` und `generationId`. `WorkerJobRunner` reicht passende Zwischenstände über einen optionalen Callback weiter, ohne bestehende MC-Callbacks oder deren Bedeutung zu ändern. `simulator-sweep.js` aggregiert abgeschlossene Kombinationen und maximale Teilstände je Kombination, ignoriert veraltete oder widersprüchliche Nachrichten und setzt den Balken monoton auf höchstens 99,x %, solange ein Ergebnis fehlt. Die synchrone Runner-API bleibt für direkte Aufrufer erhalten; ein kooperativer serieller Adapter nutzt denselben Rechenkern, gibt spätestens nach kurzen Abschnitten dem Browser Event-Loop Zeit und leitet dieselben Teilstände an die Anzeige. Der Abschluss setzt 100 % nur nach vollständiger Ergebnisprüfung.

**Akzeptanzkriterien**

- Am SOURCE-Vertrag steigt der sichtbare Balken vor dem Ende des ersten Blocks sowohl bei Workern als auch bei erzwungenem seriellem Fallback; der Browser kann im seriellen Pfad dazwischen einen Paint und einen Klick verarbeiten.
- Am SOURCE-Vertrag laufen Prozentwerte trotz paralleler, verspäteter oder doppelter Nachrichten nie rückwärts; 100 % erscheint erst, wenn jede Kombination abgeschlossen und das Gesamtergebnis vollständig ist.
- Am SOURCE-Vertrag sind Resultate, Seeds, Sampling-Fingerprints und Provenienz mit und ohne Fortschritts-Hook sowie zwischen Worker und seriellem Pfad gleich; ungültige Kombinationen bleiben unverändert klassifiziert.
- Fokussierte Regressionen: `node tests/run-single.mjs tests/simulator-sweep.test.mjs`, `node tests/run-single.mjs tests/worker-lifecycle-isolation.test.mjs`, `node tests/run-single.mjs tests/worker-parity.test.mjs`; der Browserfall erzwingt einen länger dauernden ersten Block und den seriellen Pfad ohne minutenlangen Rechenlauf.

### Slice 4 - Abbruch, atomare Ergebnisse und Dokumentation

**Ziel**

Laufende Sweeps zuverlässig abbrechen, frühere vollständige Ergebnisse bewahren und den Nutzer-Workflow dokumentieren.

**Exakter Änderungspfad**

- `Handbuch.html`
- `README.md`
- `Simulator.html`
- `app/simulator/simulator-sweep.js`
- `app/simulator/sweep-runner.js`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-sweep.test.mjs`
- `tests/worker-lifecycle-isolation.test.mjs`

**Umsetzung**

Ein nur während des Laufs aktiver Abbruchknopf und ein sichtbarer Status erscheinen im Sweep-Bereich. Der Lauf verwaltet einen eigenen `AbortController`; Abbruch vor, während und unmittelbar nach Worker-Initialisierung bleibt idempotent. Im Worker-Pfad erreicht das Signal `WorkerJobRunner`, der `WorkerPool.cancelGeneration()` nutzt und aktive Worker terminiert. Der serielle Adapter prüft das Signal an seinen Yield-Grenzen und beendet sich ohne weitere Kombinationen. Der Catch-Pfad erkennt `WorkerRunCancelledError`/`AbortError` gesondert und startet **keinen** Fallback. Nur ein vollständig erfolgreicher aktueller Lauf veröffentlicht `window.sweepResults`, `window.sweepExecution`, `window.sweepParamRanges` und die Heatmap; ein früheres Ergebnis bleibt bei Abbruch erhalten und als früherer Lauf erkennbar. Terminalpfade setzen Buttons und Status zurück; verspätete Timer alter Läufe dürfen eine neue Progress-Anzeige nicht ausblenden. README, technische Referenz, Modulreferenz und Sweep-Hilfe im Handbuch erklären eigene Laufzahl 500, Persistenz, nominellen Aufwand und Warnschwelle, Zwischenfortschritt, Abbruch sowie Erhalt eines alten vollständigen Ergebnisses.

**Akzeptanzkriterien**

- Am SOURCE-Vertrag ist Abbrechen während eines Worker-Sweeps bedienbar, terminiert aktive Worker, meldet „Abgebrochen“ sichtbar, gibt den Startknopf frei und veröffentlicht kein Teilresultat als gültige Heatmap.
- Am SOURCE-Vertrag bleibt ein älteres vollständiges Ergebnis bei Abbruch oder Fehler einschließlich `window.sweepExecution` und Heatmap unverändert; ohne Altresultat bleibt der Ergebnisbereich leer. Ein direkt folgender Sweep mit neuer Generation endet vollständig, ohne späte Meldungen des alten Laufs.
- Am SOURCE-Vertrag funktioniert derselbe Abbruch im seriellen Fallback an der nächsten kurzen Yield-Grenze; ein Nutzerabbruch löst keinen Worker-zu-Seriell-Fallback aus und zeigt niemals 100 %.
- Am SOURCE-Vertrag beschreiben `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/SIMULATOR_MODULES_README.md` und `Handbuch.html` denselben Stand und dieselbe Schwelle; MC-Reiter und Auto-Optimize bleiben unverändert.
- Fokussierte Regressionen: `node tests/run-single.mjs tests/worker-lifecycle-isolation.test.mjs`, `node tests/run-single.mjs tests/simulator-sweep.test.mjs`; der Browserfall prüft Abbruch, alte Heatmap, sofortigen Neustart und vollständigen zweiten Lauf.

## Orchestrator-Prüfprotokoll

### Verlauf

<!-- audit:history:begin -->
- Runde 1: Planung · Validierung grün · Prüfurteil freigegeben · 0 neu, 0 geschlossen.
<!-- audit:history:end -->

### Befunde

<!-- audit:findings:begin -->
Keine.
<!-- audit:findings:end -->

### Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft: Das Plan-Artefakt liegt unter docs/internal/sweep-laufzeit-steuerbar-arbeitsplan.md, ist nicht leer und der Diff bleibt im erlaubten Pfad. Die vier künftigen Slices sind ab 1 fortlaufend nummeriert. Jeder Slice nennt exakte Änderungspfade und einzeln aufgeführte Akzeptanzkriterien. Alle Anforderungen der Idee sind abgedeckt: Sweep-Laufzahl 500 mit Persistenz, Validierung ohne stille Korrektur und Provenienz über monteCarloParameters.anzahl bzw. normalizedParameters.anzahl; nomineller Aufwand mit begründetem Verzicht auf Minuten und begründeter Schwelle über 5.000.000 Laufjahren; monotoner Zwischenfortschritt in Worker- und seriellem Pfad; Abbruch per AbortController und cancelGeneration ohne seriellen Fallback, mit atomarer Veröffentlichung; Doku-Sync (README, TECHNICAL, SIMULATOR_MODULES_README, Handbuch). Grenzen sind eingehalten: keine Engine-, MC-Reiter-, Auto-Optimize- oder engine.js/dist-Änderung. Die Validierung trennt gezielte Läufe vom Orchestrator-Lauf mit npm test und test:browser. Die Attestation (future_slices=4, PASS) passt zum Fingerprint.

Größtes Restrisiko:
> Größtes Restrisiko: Die Pfadlisten beruhen auf Annahmen über die Codebasis, die ich hier nicht selbst geprüft habe. Falls die Persistenz der Sweep-Felder in simulator-main-sweep-ui.js statt in simulator-sweep.js liegt, fehlt diese Datei in der Pfadliste von Slice 1. Dasselbe gilt für Slice 4, falls die Abbruchweitergabe doch Änderungen an worker-job-runner.js braucht. Dann würde die Umsetzung eine SCOPE-EXTENSION-REQUESTED auslösen. Ein zweites Risiko ist der Umbau von runSweepChunk() zu einem fortsetzbaren Kern: Er könnte die Parität zwischen Worker und seriellem Pfad beziehungsweise die Seed-Reihenfolge verletzen. Der Plan sichert das durch Paritätstests mit und ohne Fortschritts-Hook ab.

Bruchbedingung:
> Der Plan gilt als verfehlt, wenn ein umgesetzter Slice einen dieser Fälle zulässt: Der Sweep liest weiterhin mcAnzahl. Ein ungültiger Laufzahlwert wird still zu 500 korrigiert. Ein Abbruch löst den seriellen Fallback aus oder veröffentlicht ein Teilergebnis. Der Balken läuft rückwärts oder zeigt vor Abschluss 100 %. Oder die Worker-Seriell-Parität bzw. Seeds ändern sich durch den Fortschritts-Hook.

Vorab-Risikoanalyse:
> Wenn das Vorhaben scheitert, dann am wahrscheinlichsten in Slice 3 oder 4. Der fortsetzbare Rechenkern könnte die Reihenfolge der Zufallsziehungen unbemerkt ändern. Oder späte Worker-Nachrichten einer alten Generation überschreiben Fortschritt bzw. Ergebnis eines neuen Laufs. Ein weiteres Risiko sind Pfade, die in der Planung fehlen, etwa der Persistenzort der Sweep-Felder; das würde Scope-Stopps auslösen. Der Plan begegnet dem mit Generationsfilter, Paritätstests mit und ohne Hook, atomarer Veröffentlichung und der Vorgabe, dass Tests bei Rücknahme der Änderung rot werden.
<!-- audit:approval:end -->
