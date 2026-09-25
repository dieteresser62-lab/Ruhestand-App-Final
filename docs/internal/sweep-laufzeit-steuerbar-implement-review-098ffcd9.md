# Gesamtaudit – sweep-laufzeit-steuerbar-implement

<!-- audit:meta:begin -->
Aufgabe: sweep-laufzeit-steuerbar-implement · Zielbranch: `feature/parameter-sweep-eigene-laufzahl-laufzeitschatzun-6701e273d6073a6d` · Lauf: `watch-20260925-174253.834895Z-28177406be99` · Stand: abgeschlossen
<!-- audit:meta:end -->

## Übersicht

<!-- audit:overview:begin -->
| Slice | Titel | Stand | Commit | Runden | Befunde |
|---:|---|---|---|---:|---:|
| 1 | Eigene Laufzahl und vollständiger Ergebnisnachweis | freigegeben | 1de1fd4e | 1 | 0 |
| 2 | Rechenaufwand und Rückfrage vor dem Start | freigegeben | fb0832a7 | 1 | 0 |
| 3 | Zwischenfortschritt in Worker und seriellem Pfad | freigegeben | 87ae416f | 2 | 2 |
| 4 | Abbruch, atomare Ergebnisse und Dokumentation | freigegeben | adbf1557 | 2 | 0 |
<!-- audit:overview:end -->

## Befunde

<!-- audit:findings:begin -->
| ID | Herkunft | Klasse | Stand | Titel |
|---|---|---|---|---|
| C-01 | Slice 3 | Befund | geschlossen | Serieller Pfad: `runSweepChunkAsync` gibt nach jedem Fortschrittsschritt per `await new Promise(resolve =>… |
| C-02 | Slice 3 | Befund | geschlossen | Der Browser-Smoke weist im Worker-Pfad keinen Zwischenfortschritt innerhalb eines Blocks nach |
| C-03 | Slice DISCOVERY | Befund | offen | Die Dokumentation erfüllt den Umfang aus Slice 4 nur teilweise |
| C-03 | Abnahme | Befund | offen | Die Dokumentation erfüllt den Umfang aus Slice 4 nur teilweise. Laut Arbeitsplan sollen README, technische Referenz, Modulreferenz und Sweep-Hilfe im Handbuch „eigene Laufzahl 500, Persistenz, nominellen Aufwand und Warnschwelle, Zwischenfortschritt, Abbruch sowie Erhalt eines alten vollständigen Ergebnisses“ erklären. Die neuen Absätze in README.md, Handbuch.html, docs/reference/TECHNICAL.md und docs/reference/SIMULATOR_MODULES_README.md behandeln Aufwand, Schwelle, Abbruch und Ergebniserhalt. Keiner der vier Texte nennt jedoch den Default 500 oder die Persistenz der Sweep-Laufzahl (`sim.sweep.runs`, Erhalt nach dem Neuladen). Auch der Zwischenfortschritt innerhalb einer Kombination bzw. eines Worker-Blocks (höchstens 99 % bis zur Veröffentlichung) fehlt überall. Das Slice-Dokument meldet trotzdem „Abweichungen vom Plan: Keine.“ Nach AGENTS.md müssen geänderte Nutzer-Workflows in den Referenzen nachgezogen werden. |
<!-- audit:findings:end -->

## Halte und Entscheidungen

<!-- audit:holds:begin -->
Keine.
<!-- audit:holds:end -->

## Abnahmereview

<!-- audit:acceptance-review:begin -->
Abnahmereview abgeschlossen.

Geprüft:
> Geprüft wurden der vollständige Branch-Diff (104550 Bytes) und die Slices 1–4. Schwerpunkte: Entkopplung von sweepRuns und mcAnzahl, Persistenz, Aufwandsanzeige und Bestätigungsschwelle (genau 5.000.000 ohne Rückfrage, darüber mit Rückfrage), iteratorbasierter Kern mit Parität zwischen synchroner und asynchroner Ausführung sowie gedrosselte serielle Pausen (C-01 bleibt geschlossen). Außerdem geprüft: Worker-Fortschritt mit Generations-, Bereichs- und Monotoniefilter (C-02 bleibt geschlossen), AbortController je Lauf und die Sperre gegen doppelten Start. Weitere Punkte: kein Fallback bei Abbruch, atomare Veröffentlichung mit Wiederherstellung, verspäteter Ausblend-Timer, Terminalpfade, Pfadgrenzen und Dokumentationsabgleich. npm test ist laut Attestation grün.

Größtes Restrisiko:
> Die Veröffentlichung ruft displaySweepResults() nicht mehr auf, sondern rendert direkt mit renderSweepHeatmapSVG. Falls displaySweepResults zusätzliche Hinweise oder KPIs rendert, fehlen diese nach einem neuen Lauf bis zum nächsten Metrikwechsel. Das ließ sich ohne Quellzugriff nicht abschließend belegen. Der Browser-Smoke ist nicht Teil der Attestation.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn displaySweepResults über die Heatmap hinaus Pflichtinhalte rendert, die jetzt fehlen. Sie wäre auch falsch, wenn pool.dispose() nach einem Abbruch nicht idempotent ist und im finally-Block von runSweepWithWorkers eine Ausnahme auslöst, die als Fehler statt als Abbruch gemeldet wird.

Vorab-Risikoanalyse:
> Das wahrscheinlichste Nachproblem: Nutzer oder Referenzleser erfahren nicht, dass der Sweep standardmäßig 500 Läufe nutzt und den Wert dauerhaft speichert (C-03). Ein Folgelauf mit einem vergessenen, hohen gespeicherten Wert wirkt dann überraschend. Die Bestätigungsschwelle fängt das nur oberhalb von 5.000.000 Laufjahren ab. Zweites Risiko: das duplizierte Heatmap-Rendering neben displaySweepResults driftet künftig auseinander.

### C-03 – Die Dokumentation erfüllt den Umfang aus Slice 4 nur teilweise. Laut Arbeitsplan sollen README, technische Referenz, Modulreferenz und Sweep-Hilfe im Handbuch „eigene Laufzahl 500, Persistenz, nominellen Aufwand und Warnschwelle, Zwischenfortschritt, Abbruch sowie Erhalt eines alten vollständigen Ergebnisses“ erklären. Die neuen Absätze in README.md, Handbuch.html, docs/reference/TECHNICAL.md und docs/reference/SIMULATOR_MODULES_README.md behandeln Aufwand, Schwelle, Abbruch und Ergebniserhalt. Keiner der vier Texte nennt jedoch den Default 500 oder die Persistenz der Sweep-Laufzahl (`sim.sweep.runs`, Erhalt nach dem Neuladen). Auch der Zwischenfortschritt innerhalb einer Kombination bzw. eines Worker-Blocks (höchstens 99 % bis zur Veröffentlichung) fehlt überall. Das Slice-Dokument meldet trotzdem „Abweichungen vom Plan: Keine.“ Nach AGENTS.md müssen geänderte Nutzer-Workflows in den Referenzen nachgezogen werden.

Klasse: Befund · Stand: offen

Befund:
> Die Dokumentation erfüllt den Umfang aus Slice 4 nur teilweise. Laut Arbeitsplan sollen README, technische Referenz, Modulreferenz und Sweep-Hilfe im Handbuch „eigene Laufzahl 500, Persistenz, nominellen Aufwand und Warnschwelle, Zwischenfortschritt, Abbruch sowie Erhalt eines alten vollständigen Ergebnisses“ erklären. Die neuen Absätze in README.md, Handbuch.html, docs/reference/TECHNICAL.md und docs/reference/SIMULATOR_MODULES_README.md behandeln Aufwand, Schwelle, Abbruch und Ergebniserhalt. Keiner der vier Texte nennt jedoch den Default 500 oder die Persistenz der Sweep-Laufzahl (`sim.sweep.runs`, Erhalt nach dem Neuladen). Auch der Zwischenfortschritt innerhalb einer Kombination bzw. eines Worker-Blocks (höchstens 99 % bis zur Veröffentlichung) fehlt überall. Das Slice-Dokument meldet trotzdem „Abweichungen vom Plan: Keine.“ Nach AGENTS.md müssen geänderte Nutzer-Workflows in den Referenzen nachgezogen werden.

Akzeptanztest:
> README.md, Handbuch.html (Abschnitt simulator-sweep), docs/reference/TECHNICAL.md und docs/reference/SIMULATOR_MODULES_README.md enthalten widerspruchsfrei: den Default von 500 Simulationen je Kombination, unabhängig vom MC-Feld; die Speicherung der Laufzahl über das Neuladen hinweg, wobei leere oder ungültige Werte nicht still korrigiert werden; den Zwischenfortschritt innerhalb einer Kombination im Worker- und im seriellen Pfad mit höchstens 99 % bis zur vollständigen Veröffentlichung. Die bestehenden Angaben zu Schwelle, Abbruch und Ergebniserhalt bleiben unverändert.
<!-- audit:acceptance-review:end -->
