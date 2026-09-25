# Slice 1 von 1 – Sweep-Hilfe und Referenzen vervollständigen

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Den bereits implementierten Sweep-Workflow in allen vier betroffenen Dokumenten vollständig und widerspruchsfrei beschreiben.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- Am SOURCE-Vertrag nennen `README.md`, `Handbuch.html` im Abschnitt `simulator-sweep`, `docs/reference/TECHNICAL.md` und `docs/reference/SIMULATOR_MODULES_README.md` jeweils 500 Simulationen je Sweep-Kombination als Standard und erklären die Unabhängigkeit vom Monte-Carlo-Laufzahlfeld.
- Am SOURCE-Vertrag erklären alle vier Texte, dass die Sweep-Laufzahl nach einem Neuladen erhalten bleibt; ein leerer oder ungültiger gespeicherter beziehungsweise eingegebener Wert wird nicht still auf 500 korrigiert und verhindert den Start mit Validierungsfehler. Die technischen Referenzen benennen `sweepRuns` und `sim.sweep.runs` korrekt.
- Am SOURCE-Vertrag beschreiben alle vier Texte sichtbaren Zwischenfortschritt bereits innerhalb einer Kombination beziehungsweise eines Worker-Blocks für Worker- und seriellen Pfad; bis zur vollständigen Veröffentlichung des neuen Ergebnisses werden höchstens 99 % gezeigt, 100 % erst nach erfolgreichem Abschluss.
- Am SOURCE-Vertrag bleiben die vorhandenen Angaben zu nominellem Aufwand als Kombinationen × Läufe × Jahre, Bestätigung erst oberhalb von 5.000.000 Laufjahren, Abbruch und Erhalt eines alten vollständigen Ergebnisses in allen vier Texten erhalten und widersprechen einander nicht.
- Die fokussierte Prüfung liest alle vier vollständigen Sweep-Abschnitte gegen die genannten Quellstellen, prüft den Diff auf ausschließlich die vier Pfade und führt `git diff --check` erfolgreich aus; neue Tests oder Produktänderungen sind für diesen Dokumentations-Slice nicht vorgesehen.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Handbuch.html`
- `README.md`
- `docs/internal/slice-sweep-laufzeit-steuerbar-followup01-arbeitsplan-01-sweep-hilfe-und-referenzen-vervollstandigen.md`
- `docs/internal/sweep-laufzeit-steuerbar-followup01-implement-review-6c819d8f.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
<!-- audit:scope:end -->

## Umsetzung

> Noch nicht dokumentiert.

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
> Umfang: Der Diff berührt nur Handbuch.html, README.md, docs/reference/SIMULATOR_MODULES_README.md und docs/reference/TECHNICAL.md. Alle vier liegen in der Slice-Allowlist; Produktcode und Tests wurden nicht geändert. Inhalt je Abnahmekriterium: Alle vier Texte nennen 500 Simulationen je Kombination als Standard, die Unabhängigkeit vom Monte-Carlo-Laufzahlfeld, den Erhalt nach einem Neuladen und dass leere oder ungültige Werte nicht still korrigiert werden, sondern den Start per Validierung verhindern. Die technischen Referenzen nennen `sweepRuns`, `mcAnzahl` und `sim.sweep.runs`. Zwischenfortschritt innerhalb einer Kombination bzw. eines Worker-Blocks ist für den Worker- und den seriellen Pfad beschrieben, ebenso höchstens 99 % bis zur Veröffentlichung und 100 % erst nach Erfolg. Weiterhin vorhanden und widerspruchsfrei sind: Aufwand als Kombinationen × Läufe × Jahre, Bestätigung erst oberhalb von 5.000.000 Laufjahren, Abbruch und Erhalt des alten vollständigen Ergebnisses bzw. leere Ansicht ohne Altresultat. Die Attestierung validation-[Hash ausgelassen] (npm test PASS) passt zum Fingerprint [Hash ausgelassen]…. Resume und Idempotenz sind nicht betroffen, da der Slice nur Dokumentation ändert.

Größtes Restrisiko:
> Die Quellstellen (z. B. `initSweepDefaultsWithLocalStorageFallback()`, die 99-%-Kappung und der Fortschritt innerhalb eines Worker-Blocks) habe ich nicht direkt im Code geprüft, sondern nur gegen den Slice-Vertrag. Weicht der tatsächliche Code von den Funktionsnamen oder vom Verhalten ab, wäre die Referenzdoku ungenau. Ob `git diff --check` erfolgreich lief, geht aus dem Paket nicht explizit hervor; im Diff sind aber keine Whitespace-Fehler sichtbar.

Bruchbedingung:
> Das Urteil kippt, wenn der Code eine ungültige gespeicherte Sweep-Laufzahl doch still auf 500 setzt, `sim.sweep.runs` oder `initSweepDefaultsWithLocalStorageFallback()` nicht existieren oder anders heißen, der Fortschritt vor der Veröffentlichung 100 % erreichen kann oder die Bestätigungsschwelle nicht bei mehr als 5.000.000 Laufjahren liegt.

Vorab-Risikoanalyse:
> Wenn diese Freigabe sich als falsch erweist, dann am wahrscheinlichsten, weil die Doku ein Verhalten beschreibt, das der Code so nicht umsetzt, etwa beim Fallback nach dem Neuladen oder beim Zwischenfortschritt im seriellen Pfad pro Kombination. Weil nur Dokumentation geändert wurde, wären die Folgen auf irreführende Hilfetexte begrenzt; Engine, Persistenz und Tests bleiben unberührt.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20260925-182754.587957Z-24c493694369`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
