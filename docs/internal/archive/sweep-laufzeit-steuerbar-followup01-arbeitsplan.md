# Arbeitsplan: Sweep-Dokumentation nach Abnahmereview 2 vervollständigen

## Ausgangslage und Vertrag

Der Abnahmereview zu Slice 4 des Arbeitsplans `docs/internal/sweep-laufzeit-steuerbar-arbeitsplan.md` hat eine Dokumentationslücke festgestellt. Die bestehenden Sweep-Absätze in `README.md`, `Handbuch.html` (Abschnitt `simulator-sweep`), `docs/reference/TECHNICAL.md` und `docs/reference/SIMULATOR_MODULES_README.md` erklären bereits nominellen Aufwand, Warnschwelle, Abbruch und Erhalt des letzten vollständigen Ergebnisses. Sie nennen aber weder den Standard von 500 Simulationen je Kombination und dessen Speicherung noch den Zwischenfortschritt innerhalb einer Kombination im Worker- und seriellen Pfad.

Der Quellstand legt den zu dokumentierenden Vertrag fest: `Simulator.html` gibt `sweepRuns` mit `value="500"` vor; das Feld ist vom Monte-Carlo-Feld `mcAnzahl` unabhängig. `initSweepDefaultsWithLocalStorageFallback()` in `app/simulator/simulator-sweep.js` liest und schreibt `sim.sweep.runs` bei Eingaben. Nur ein fehlender gespeicherter Wert lässt den HTML-Standard gelten. Ein leerer oder ungültiger gespeicherter Wert wird nicht still auf 500 gesetzt und verhindert den Sweep beim Start durch Validierung. `workers/mc-worker.js` meldet Teilstände aus dem Sweep-Runner; `app/simulator/simulator-sweep.js` verarbeitet Teilstände auch im seriellen Pfad. Der sichtbare Fortschritt ist bis zur vollständigen Ergebnisprüfung, Heatmap-Darstellung und Veröffentlichung auf höchstens 99 % begrenzt; erst ein erfolgreicher Abschluss zeigt 100 %.

Diese Nacharbeit ändert nur Dokumentation. Bestehende Aussagen zu `Kombinationen × Läufe × Jahre` als nominellem Aufwand, der Bestätigung oberhalb von 5.000.000 Laufjahren, Abbruch und Erhalt eines alten vollständigen Ergebnisses bleiben sachlich und im jeweiligen Kontext erhalten. Keine neue Laufzeitprognose, Produktlogik, Tests oder generierten Artefakte.

## Umsetzung und Validierung

Die vier Texte werden im vorhandenen Sweep-Kontext ergänzt. Für Nutzertexte werden Default, Eigenständigkeit des Felds, Speicherung über Neuladen und Verhalten bei leerer oder ungültiger Eingabe in verständlicher Sprache erklärt. Die technischen Referenzen nennen zusätzlich `sweepRuns`, `sim.sweep.runs` und die Grenze von 99 % bis zur Veröffentlichung. Jeder Text beschreibt den Zwischenfortschritt ausdrücklich innerhalb einer Kombination beziehungsweise eines Worker-Blocks sowohl bei Worker-Ausführung als auch im seriellen Pfad. Die Aussagen dürfen nicht suggerieren, dass ein Teilstand schon ein gültiges Ergebnis ist.

Nach der Änderung alle vier betroffenen Abschnitte vollständig lesen und ihre Aussagen gegeneinander sowie gegen `Simulator.html`, `app/simulator/simulator-sweep.js`, `app/simulator/sweep-runner.js` und `workers/mc-worker.js` prüfen. `git diff --check` und die Prüfung des Diffs auf genau die vier Dokumentationspfade bilden die fokussierte Validierung. Für reine Textänderungen sind keine neuen Produkttests erforderlich; die volle Suite und die Freigabe liegen gemäß orchestriertem Ablauf beim Orchestrator und Prüfer. Im Umsetzungsbericht die tatsächlich gelaufenen Prüfungen benennen.

### Slice 1 - Sweep-Hilfe und Referenzen vervollständigen

**Ziel**

Den bereits implementierten Sweep-Workflow in allen vier betroffenen Dokumenten vollständig und widerspruchsfrei beschreiben.

**Exakter Änderungspfad**

- `Handbuch.html`
- `README.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TECHNICAL.md`

**Umsetzung**

Den vorhandenen Sweep-Absatz in `README.md`, den Absatz unter `id="simulator-sweep"` in `Handbuch.html`, den Punkt „Sweep-Laufzeit“ in `docs/reference/TECHNICAL.md` und den Sweep-Absatz bei `simulator-sweep.js` in `docs/reference/SIMULATOR_MODULES_README.md` gezielt ergänzen. In jedem Text die eigene Standardlaufzahl von 500 je Kombination, ihre Unabhängigkeit von `mcAnzahl`, die Persistenz über Neuladen, die Behandlung leerer oder ungültiger Werte sowie Zwischenfortschritt innerhalb einer Kombination im Worker- und seriellen Pfad bis höchstens 99 % vor vollständiger Veröffentlichung aufnehmen. Den bestehenden Umfang zu Aufwand, Schwelle, Abbruch und Ergebniserhalt bewahren. Technische Schlüssel dort nennen, wo sie zur Referenzfunktion gehören; im Handbuch den Nutzerablauf klar formulieren.

**Akzeptanzkriterien**

- Am SOURCE-Vertrag nennen `README.md`, `Handbuch.html` im Abschnitt `simulator-sweep`, `docs/reference/TECHNICAL.md` und `docs/reference/SIMULATOR_MODULES_README.md` jeweils 500 Simulationen je Sweep-Kombination als Standard und erklären die Unabhängigkeit vom Monte-Carlo-Laufzahlfeld.
- Am SOURCE-Vertrag erklären alle vier Texte, dass die Sweep-Laufzahl nach einem Neuladen erhalten bleibt; ein leerer oder ungültiger gespeicherter beziehungsweise eingegebener Wert wird nicht still auf 500 korrigiert und verhindert den Start mit Validierungsfehler. Die technischen Referenzen benennen `sweepRuns` und `sim.sweep.runs` korrekt.
- Am SOURCE-Vertrag beschreiben alle vier Texte sichtbaren Zwischenfortschritt bereits innerhalb einer Kombination beziehungsweise eines Worker-Blocks für Worker- und seriellen Pfad; bis zur vollständigen Veröffentlichung des neuen Ergebnisses werden höchstens 99 % gezeigt, 100 % erst nach erfolgreichem Abschluss.
- Am SOURCE-Vertrag bleiben die vorhandenen Angaben zu nominellem Aufwand als Kombinationen × Läufe × Jahre, Bestätigung erst oberhalb von 5.000.000 Laufjahren, Abbruch und Erhalt eines alten vollständigen Ergebnisses in allen vier Texten erhalten und widersprechen einander nicht.
- Die fokussierte Prüfung liest alle vier vollständigen Sweep-Abschnitte gegen die genannten Quellstellen, prüft den Diff auf ausschließlich die vier Pfade und führt `git diff --check` erfolgreich aus; neue Tests oder Produktänderungen sind für diesen Dokumentations-Slice nicht vorgesehen.

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
> Geprüft wurden: Vorhandensein des Plans unter dem exakten Pfad docs/internal/sweep-laufzeit-steuerbar-followup01-arbeitsplan.md (neue Datei im Diff, einziger geänderter Pfad, innerhalb authorized_paths); Slice-Struktur mit 1-basierter Nummerierung, Ziel, exakten Änderungspfaden, Umsetzung, Akzeptanzkriterien und fokussierter Validierung; vollständige Abdeckung des Abnahmekriteriums aus Befund 1 (Default 500 unabhängig von mcAnzahl, Persistenz über sim.sweep.runs ohne stille Korrektur leerer oder ungültiger Werte, Zwischenfortschritt innerhalb einer Kombination bzw. eines Worker-Blocks im Worker- und seriellen Pfad mit höchstens 99 % bis zur Veröffentlichung, Erhalt der Angaben zu Aufwand, 5.000.000-Laufjahre-Schwelle, Abbruch und Ergebniserhalt); Scope-Grenze (nur Doku, keine Produkt-, Test- oder dist/-Änderungen); Validierungsaufteilung nach AGENTS.md; Übereinstimmung mit der Validierungsattestierung (slices=1, planned_paths=1, PASS, passender Fingerprint).

Größtes Restrisiko:
> Die Vertragsaussagen des Plans zur Quelle (sweepRuns value="500", initSweepDefaultsWithLocalStorageFallback, 99-%-Deckel, Teilstände im seriellen Pfad) habe ich in dieser Prüfung nicht selbst gegen den Quellcode geprüft. Falls der Code davon abweicht, etwa bei der Behandlung ungültiger gespeicherter Werte, würde die Umsetzung falsche Doku schreiben. Der Plan verlangt aber ausdrücklich, die Abschnitte gegen Simulator.html, simulator-sweep.js, sweep-runner.js und mc-worker.js abzugleichen.

Bruchbedingung:
> Diese Freigabe wäre falsch, wenn der Quellcode einen leeren oder ungültigen gespeicherten Wert doch still auf 500 zurücksetzt oder wenn der serielle Pfad keinen Zwischenfortschritt innerhalb einer Kombination meldet. Dann würde der Plan eine sachlich falsche Dokumentation vorschreiben, statt einen CONTRACT-UNCLEAR-Stopp auszulösen.

Vorab-Risikoanalyse:
> Ein Scheitern ist am ehesten in der Umsetzung zu erwarten: Ein Text lässt eines der drei neuen Elemente weg (vor allem den Zwischenfortschritt im seriellen Pfad) oder formuliert bestehende Aussagen zu Schwelle und Ergebniserhalt so um, dass sie inhaltlich verändert werden. Die Akzeptanzkriterien fordern je Dokument ausdrücklich alle Elemente und den Erhalt des Bestehenden. Damit ist das bei der Umsetzungsprüfung überprüfbar. Ein zweites Risiko ist ein Abweichen der Quelllage vom beschriebenen Vertrag. Der verpflichtende Abgleich mit den vier Quelldateien begrenzt dieses Risiko.
<!-- audit:approval:end -->
