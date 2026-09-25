# Arbeitsplan: Parameter-Sweep ohne gültige Ergebnisse

## Auftrag und Ausgangslage

Der interaktive Parameter-Sweep im Simulator soll bei gültigen Eingaben nach „Run Sweep“ eine Heatmap mit lesbaren Metrikwerten anzeigen. Der Grid-Zähler soll die Kombinationen anzeigen, die der unmittelbar folgende Lauf tatsächlich berechnet. Die Änderung betrifft die gemeinsame Browser-/Tauri-Quelloberfläche; `dist/` und die Desktop-EXE sind keine Bearbeitungsorte.

## Befund aus der Quellprüfung

- `app/simulator/simulator-sweep.js` liest alle sieben Range-Felder und nimmt sie stets in jede Parameterkombination auf. Das schließt `survivalQuantile` und `goGoMultiplier` auch dann ein, wenn die zugehörigen Strategien nicht aktiv sind.
- `app/simulator/sweep-runner.js` markiert eine Kombination ausdrücklich als ungültig, sobald Dynamic-Flex-Parameter bei `baseInputs.dynamicFlex !== true` gesetzt sind. Es verwirft auch `goGoMultiplier` bei inaktivem Go-Go und `survivalQuantile` bei einer anderen Horizontmethode. Die HTML-Vorgaben enthalten beide Felder. Damit kann ein normaler Lauf ausschließlich versionierte, aber als `invalidCombination` markierte Ergebnisse erzeugen. `readSweepMetricValue()` gibt für diese Ergebnisse `null` zurück; `renderSweepHeatmapSVG()` zeigt folgerichtig die gemeldete Leermeldung. Der Vertrag des DOM-freien Runners ist durch bestehende Tests belegt und soll erhalten bleiben.
- `app/simulator/simulator-main-init.js` ruft `initSweepUIControls()` vor `initSweepDefaultsWithLocalStorageFallback()` auf. Der Grid-Zähler wird in `initSweepUIControls()` sofort berechnet. Das spätere Setzen persistierter Werte löst kein `input`-Event aus. So kann der Zähler noch die HTML-Vorgaben von 50 Kombinationen zeigen, obwohl ein gespeicherter Gold-Target-Bereich mit fünf Werten 125 Kombinationen ergibt.
- Der vorhandene Browser-Smoke in `tests/browser-smoke.test.mjs` aktiviert Dynamic Flex und Go-Go ausdrücklich und prüft die Heatmap-Ausgabe bislang nicht auf Zellen und Metrikwerte. Er deckt den gemeldeten Standardfall daher nicht ab. Die Quellprüfung ist eine Ursachenhypothese; die Umsetzung muss sie mit einem reproduzierbaren Test und dem tatsächlichen `invalidReason` belegen.

## Umsetzungsvertrag

Die bestehenden Runner-Guardrails bleiben bestehen. Die interaktive Oberfläche stellt nur aktiv wirksame Parameter als Sweep-Dimensionen zusammen: `survivalQuantile` bei aktivem Dynamic Flex mit Horizontmethode `survival_quantile`, `goGoMultiplier` bei aktivem Dynamic Flex und aktivem Go-Go. Inaktive VPW-Felder behalten ihre gespeicherten Eingaben, werden aber nicht als Override in die Kombinationen aufgenommen. Die fünf übrigen Dimensionen bleiben wie bisher aktiv. Eine explizit programmatisch übergebene unzulässige Kombination bleibt im Runner ungültig. Der Grid-Zähler benutzt exakt dieselbe Auswahl- und Range-Logik wie der Lauf, einschließlich 300er-Limit. Beispielsweise ergeben `3:1:7`, `10:5:30` und `2:2:10` bei ansonsten einzelnen Werten 125 Kombinationen, unabhängig davon, ob die beiden VPW-Einzelwertfelder gerade aktiv sind. Mehrwertige inaktive VPW-Felder dürfen die Zahl nicht künstlich erhöhen.

Die ausgewählte Metrik wird weiter ausschließlich über den kanonischen `SweepMetricsV4`-Vertrag gelesen. Keine Änderung an Engine-Semantik, numerischen Metrikdefinitionen, Worker-Nachrichten oder der Behandlung echter ungültiger Kombinationen ist Teil dieses Fixes.

### Slice 1 - Sweep-Dimensionen, Grid-Zähler und Ergebnisanzeige reparieren

**Ziel**

Einen normalen Sweep mit deaktiviertem Dynamic Flex/Go-Go bis zur sichtbaren Heatmap durchlaufen lassen, die Zählung mit den tatsächlich verwendeten Kombinationen synchronisieren und beide Pfade mit einem vollständigen Regressionstest absichern.

**Exakter Änderungspfad**

- `README.md`
- `Simulator.html`
- `app/simulator/simulator-main-init.js`
- `app/simulator/simulator-main-sweep-ui.js`
- `app/simulator/simulator-sweep.js`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-ui-orchestration.test.mjs`

**Arbeitsschritte**

1. Den Fehler zunächst mit den HTML-Vorgaben und ausgeschalteten Dynamic-Flex-/Go-Go-Schaltern reproduzieren; für die erzeugten Ergebnisse `invalidCombination`, `invalidReason`, Metrikversion und ausgewählten Schlüssel feststellen. Die Diagnose als Testfall festhalten, ohne den Runner-Vertrag aufzuweichen.
2. Die Auswahl der interaktiv wirksamen Sweep-Dimensionen und das Parsing in einer gemeinsamen UI-nahen Funktion bündeln, die sowohl `runParameterSweep()` als auch der Grid-Zähler verwenden. Inaktive VPW-Felder aus den Kombinationen auslassen; bei aktiven Feldern fehlerhafte oder leere Ranges weiterhin vor dem Lauf melden. Den aktiven Zustand aus den tatsächlichen Simulator-Eingaben beziehungsweise den zugehörigen Schaltern lesen und keine Strategie still aktivieren.
3. Die Grid-Anzeige nach dem Laden persistierter Sweep-Werte initialisieren und bei Range-Änderungen sowie Änderungen von Dynamic Flex, Horizontmethode, Go-Go und deren Presets aktualisieren. Den Zustand der bedingt wirksamen Sweep-Felder und die Zählregel in der Oberfläche verständlich kennzeichnen. Der Zähler zeigt bei Parsefehlern `?` und oberhalb von 300 weiterhin den Grenzhinweis; beim Start entspricht er der Zahl der tatsächlich an den Runner übergebenen Kombinationen.
4. Den bestehenden Browser-Smoke um einen echten Klick auf „Run Sweep“ mit den normalen inaktiven VPW-Schaltern und einer kleinen, deterministischen Matrix erweitern. Nach Abschluss `window.sweepExecution.results`, gültige `SweepMetricsV4`-Werte und sichtbare SVG-Zellen samt Metrikwerten prüfen; anschließend Metrik und Achse wechseln und die aktualisierte Anzeige prüfen. Den bereits vorhandenen Fall mit aktivem Dynamic Flex und Go-Go erhalten.
5. Im DOM-Orchestrierungstest persistierte Range-Werte vor Initialisierung sowie nachträgliche Änderungen prüfen: HTML-Vorgaben 50, fünf Gold-Target-Werte 125, mehrwertige inaktive VPW-Felder ohne Mehrfachzählung, aktivierte VPW-Dimensionen mit passender Mehrfachzählung und identische Lauf-Kombinationszahl. Einen echten ungültigen Fall so prüfen, dass die Leermeldung nur bei fehlendem lesbarem Metrikwert erscheint.
6. Die bedingte Wirksamkeit der beiden VPW-Sweepfelder und die Zählregel in Produkt- und Modulreferenzen nachführen. Keine generierten Dateien bearbeiten.

**Akzeptanzkriterien**

- Bei Standardkonfiguration ohne Dynamic Flex/Go-Go liefert „Run Sweep“ mindestens ein nicht als ungültig markiertes Ergebnis mit endlichem `successProbFloor` und eine sichtbare Heatmap-Zelle mit Wert; die Leermeldung erscheint dabei nicht.
- Bei aktivem Dynamic Flex mit passender Horizontmethode und aktivem Go-Go bleiben Quantil und Multiplikator echte Sweep-Dimensionen; explizite unzulässige Runner-Kombinationen bleiben ungültig. Metrik- und Achsenwechsel rendern vorhandene gültige Ergebnisse erneut.
- Der Grid-Zähler zeigt für die HTML-Vorgaben 50 und für den beschriebenen Gold-Target-Bereich `2:2:10` bei sonst gleichen Vorgaben 125 Kombinationen; nach Persistenzladen, Eingaben und Strategie-/Presetwechsel stimmt er mit der tatsächlich gestarteten Matrix überein. Ungültige Ranges und mehr als 300 Kombinationen behalten ihre sichtbaren Hinweise.
- Der Browser-Regressionstest führt den Sweep von der realen Simulatorseite bis zu SVG-Zellen mit kanonischen Metrikwerten aus. Der DOM-Test deckt die Initialisierungsreihenfolge und die bedingt wirksamen Dimensionen ab. Der vorhandene gültige Dynamic-Flex-/Go-Go-Browserfall bleibt grün.
- Die betroffenen Beschreibungen in `README.md`, `docs/reference/TECHNICAL.md` und `docs/reference/SIMULATOR_MODULES_README.md` stimmen mit der neuen UI-Regel überein.

**Validierung und Übergabe an den Prüfer**

- Während der Umsetzung gezielt `node tests/run-single.mjs tests/simulator-ui-orchestration.test.mjs` ausführen. Für die bestehende Runner-Guardrail zusätzlich `node tests/run-single.mjs tests/simulator-sweep.test.mjs` verwenden; bei neuen fachlichen Abweichungen anhalten und den Vertrag klären.
- Für diese UI-/Runner-Anbindung ist die volle Node-Suite `npm test` Pflicht. Der Orchestrator führt sie im orchestrierten Lauf aus; Codex meldet seine gezielten Läufe und übergibt den Stand für dieses Gate. `npm run test:browser` separat für den vollständigen Sweep-zu-Heatmap-Pfad ausführen lassen. Ein Port-/Browserstartproblem in der Agenten-Sandbox ist kein Stoppgrund, sondern mit Teststatus zu berichten.
- Prüfer misst unabhängig mindestens den Standardfall, die 125er-Zählung nach Persistenz/Änderung und den weiter ungültigen expliziten Runner-Fall. Unerwartete Engine-, Snapshot- oder Backtest-Abweichungen als `CONTRACT-UNCLEAR` behandeln statt still umzudeuten.

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
> Geprüft wurden: das Vorhandensein des Plan-Artefakts am exakten Pfad docs/internal/sweep-ohne-ergebnisse-arbeitsplan.md (neue Datei, einziger Diff-Pfad, innerhalb von authorized_paths) und die Slice-Struktur mit 1-basierter Nummerierung, exakten Änderungspfaden, Arbeitsschritten, Akzeptanzkriterien und Validierung. Die Ursachenhypothese passt zur Beobachtung im Nutzerbericht: Es gibt Ergebnisse, aber keinen lesbaren Metrikwert, weil der Runner inaktive VPW-Overrides verwirft und Kombinationen als invalidCombination markiert. Die Grid-Zähler-Hypothese passt zur Initialisierungsreihenfolge. Die Arithmetik 50/125 stimmt: 5×5×5 = 125; die Vorgaben mit 2 Gold-Werten ergeben 50. Der Runner-Vertrag bleibt erhalten; Engine, Worker und Metrikdefinitionen bleiben unverändert. Keine Strategie wird still aktiviert. Der Regressionstest deckt den vollständigen Weg vom Klick bis zu den SVG-Zellen ab. Die Validierung (run-single, npm test, test:browser) entspricht AGENTS.md; die Stoppregeln sind benannt. Die Validierungsattestierung PASS passt zum Fingerprint.

Größtes Restrisiko:
> Die Quellbefunde, also die Guardrails in sweep-runner.js und die Aufrufreihenfolge in simulator-main-init.js, konnte ich in diesem Prüflauf nicht direkt am Repository nachmessen. Der Plan kennzeichnet sie selbst als Hypothese und verlangt in Schritt 1 den Nachweis über invalidReason. Stellt sich eine andere Ursache heraus, etwa ein Metrikversions- oder Schlüsselproblem in simulator-heatmap.js oder sweep-runner.js, dann reicht die Pfadliste des Slices nicht aus. In diesem Fall muss die Umsetzung mit SCOPE-EXTENSION-REQUESTED oder CONTRACT-UNCLEAR anhalten.

Bruchbedingung:
> Der Plan wäre abzulehnen, wenn die Reproduktion bei deaktiviertem Dynamic Flex/Go-Go einen invalidReason zeigt, der nicht auf inaktive VPW-Overrides zurückgeht. Ebenso, wenn Kombinationen trotz gültiger Markierung keine SweepMetricsV4-Werte tragen oder wenn der Grid-Zähler bereits nach dem Persistenzladen aktualisiert wird. Dann trägt die Ursachenanalyse nicht und der Änderungsumfang wäre falsch geschnitten.

Vorab-Risikoanalyse:
> Wahrscheinlichster Fehlschlag: Die Hypothese ist nur teilweise richtig. Nach dem Auslassen inaktiver VPW-Dimensionen bleiben dann weitere Kombinationen ungültig, etwa weil maxSkim oder maxBearRefill andere Guardrails treffen, und die Heatmap bleibt leer. Der Plan fängt das durch die Pflicht zur Diagnose in Schritt 1 und das harte Akzeptanzkriterium ab: endlicher successProbFloor und sichtbare Zelle im Browser-Smoke. Zweites Risiko: Nutzer mit mehrwertigen VPW-Ranges bei deaktivierter Strategie erleben ein stilles Ignorieren. Der Plan verlangt dafür eine verständliche Kennzeichnung in der Oberfläche und die Nachführung der Dokumentation. Drittes Risiko: Der Browser-Smoke scheitert in der Sandbox. Das ist laut Regeln kein Stoppgrund, muss aber mit Teststatus berichtet werden.
<!-- audit:approval:end -->
