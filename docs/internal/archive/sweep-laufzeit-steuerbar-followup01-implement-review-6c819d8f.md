# Gesamtaudit – sweep-laufzeit-steuerbar_followup01-implement

<!-- audit:meta:begin -->
Aufgabe: sweep-laufzeit-steuerbar_followup01-implement · Zielbranch: `feature/parameter-sweep-eigene-laufzahl-laufzeitschatzun-6701e273d6073a6d` · Lauf: `watch-20260925-182754.587957Z-24c493694369` · Stand: abgeschlossen
<!-- audit:meta:end -->

## Übersicht

<!-- audit:overview:begin -->
| Slice | Titel | Stand | Commit | Runden | Befunde |
|---:|---|---|---|---:|---:|
| 1 | Sweep-Hilfe und Referenzen vervollständigen | freigegeben | 7c5c03e4 | 2 | 0 |
<!-- audit:overview:end -->

## Befunde

<!-- audit:findings:begin -->
| ID | Herkunft | Klasse | Stand | Titel |
|---|---|---|---|---|
| – | – | – | – | Keine. |
<!-- audit:findings:end -->

## Halte und Entscheidungen

<!-- audit:holds:begin -->
Keine.
<!-- audit:holds:end -->

## Abnahmereview

<!-- audit:acceptance-review:begin -->
Abnahmereview abgeschlossen.

Geprüft:
> Ich habe den vollständigen Branch-Diff aus sechs Teilen gelesen, insgesamt 125673 Bytes. Schwerpunkt war die Nacharbeit zu C-03: Die Sweep-Abschnitte in README.md, Handbuch.html (Abschnitt simulator-sweep), docs/reference/TECHNICAL.md (Punkt Sweep-Laufzeit) und docs/reference/SIMULATOR_MODULES_README.md habe ich gegen den Quellstand abgeglichen. Dazu gehören: sweepRuns mit Standardwert 500 in Simulator.html, der Speicherschlüssel sim.sweep.runs in initSweepDefaultsWithLocalStorageFallback, die Ausnahme für leere Speicherwerte, readMonteCarloParameters mit runsElementId, der Iterator-Fortschritt in sweep-runner.js, die progress-Meldungen in mc-worker.js, die 99-%-Kappung in WorkerJobRunner und showProgress sowie 100 % nur bei completedSuccessfully. Alle vier Texte nennen jetzt übereinstimmend: Standard 500 je Kombination, Unabhängigkeit von mcAnzahl, Erhalt nach dem Neuladen, keine stille Korrektur leerer oder ungültiger Werte, Zwischenfortschritt in Worker- und seriellem Pfad, höchstens 99 % bis zur Veröffentlichung, Aufwand = Kombinationen × Läufe × Jahre, Rückfrage erst oberhalb von 5.000.000, Abbruch und Erhalt des alten Ergebnisses. Die technischen Referenzen nennen sweepRuns und sim.sweep.runs korrekt. Außerdem geprüft: Pfadgrenzen gegen authorized_paths, Abbruch- und Fallbackpfade, atomare Veröffentlichung mit Wiederherstellung, Doppelstart-Sperre und Ablehnung der Rückfrage ohne Seiteneffekte. Die Attestation zu npm test ist grün und passt zum Fingerprint.

Größtes Restrisiko:
> Ohne Quellzugriff über den Diff hinaus bleibt offen, ob WorkerPool.dispose() idempotent ist und ob ein Abbruch während pool.broadcast (sweep-init) das ausstehende Promise sicher beendet. Das betrifft den doppelten Aufruf durch cancelParameterSweep und den finally-Block von runSweepWithWorkers. Hängt broadcast nach dispose, bliebe activeSweep gesetzt und ein Neustart wäre blockiert. Offen bleibt auch, ob displaySweepResults über die direkt gerenderte Heatmap hinaus Inhalte liefert, die nach einem neuen Lauf fehlen. Der Browser-Smoke ist nicht Teil der Attestation.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn einer der vier Dokumentationstexte vom Code abweicht, etwa bei Speicherschlüssel, Standardwert, Schwelle oder 99-%-Grenze. Sie wäre auch falsch, wenn ein Abbruch vor dem Ende von sweep-init den Lauf dauerhaft blockiert. Ebenso, wenn dispose() bei zweitem Aufruf wirft und ein Abbruch deshalb als Fehler gemeldet wird. Oder wenn displaySweepResults Pflichtinhalte rendert, die die direkte Veröffentlichung nicht erzeugt.

Vorab-Risikoanalyse:
> Scheitert der Branch nach dem Merge, dann am wahrscheinlichsten an Randfällen des Abbruchs, die der Browser-Smoke nicht abdeckt. Der Smoke bricht erst ab, wenn Fortschritt sichtbar ist. Ein Abbruch in der kurzen Phase von Pool-Erzeugung und sweep-init hängt vom nicht sichtbaren Verhalten von WorkerPool.dispose ab. Zweites Risiko: Die ungedrosselten progress-Nachrichten des Workers, bis zu etwa 100 je Kombination, erzeugen bei großen Grids mehr Nachrichtenlast als der Plan mit 100 bis 250 ms vorsah. Das ist funktional unkritisch. Die Dokumentationslücke C-03 ist mit dieser Nacharbeit in allen vier Texten konsistent geschlossen.
<!-- audit:acceptance-review:end -->
