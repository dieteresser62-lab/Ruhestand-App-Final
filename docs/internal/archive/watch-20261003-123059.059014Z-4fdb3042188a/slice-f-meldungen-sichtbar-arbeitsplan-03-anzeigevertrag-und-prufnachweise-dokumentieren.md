# Slice 3 von 3 – Anzeigevertrag und Prüfnachweise dokumentieren

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Nutzerhilfe, Architektur, Modulübersicht und Testbeschreibung an das fertig implementierte Balance-Verhalten angleichen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- README und Handbuch stimmen am fertigen Quellverhalten bei Toastdauer, nächster passender Nutzeraktion, Schließen und Recoveryhinweisen überein; die vorhandene Regel für `Vermögensstand gesichert.` bleibt richtig beschrieben.
- TECHNICAL und Balance-Modulübersicht beschreiben genau die implementierten Container, APIs und Bereichszuständigkeiten ohne Änderungen an Datenmodell, Engine oder anderen Seiten zu behaupten.
- Test-README beschreibt die tatsächlich implementierten Node- und Browserbelege, insbesondere sichtbare 1-/3-s-Jahresmeldung, 2-s-Importfehler, neue Observerziele und unveränderte strikte Tabwechselinstrumentierung. Es behauptet keinen in der Sandbox ausgeführten Browserlauf.
- Die fünf Dokumente enthalten keine widersprüchliche aktuelle Angabe über den gemeinsamen Toast-/Fehlerkanal oder 3,5-s-Toasts. `npm test` ist auch auf dem finalen Dokumentationsstand beim Orchestrator grün.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Handbuch.html`
- `README.md`
- `docs/internal/f-meldungen-sichtbar-implement-review-5ff9eb73.md`
- `docs/internal/slice-f-meldungen-sichtbar-arbeitsplan-03-anzeigevertrag-und-prufnachweise-dokumentieren.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
<!-- audit:scope:end -->

## Umsetzung

> - `README.md` und `Handbuch.html` erläutern sechssekündige Kurzmeldungen, Ersetzung mit neuer Frist, unterscheidbare Meldungstypen und bereichsbezogene Aktionsfehler bis zur nächsten passenden Aktion oder zum Schließen. Schließen und Reload erledigen keine Recovery. Die vorhandene Jahresstandsbestätigung ab 2026 nach State-/Registry-Readback bleibt beschrieben; Verlaufserfassungsfehler werden von Import-/Jahresaktionsfehlern sprachlich abgegrenzt.
> - `TECHNICAL.md` dokumentiert die drei Container samt DOM-Referenzen und ARIA-Verträgen, Renderer-APIs, sieben Bereichsschlüssel und konkrete Rücksetzgrenzen einschließlich No-op, verschachtelter Annual-Schritte und abgewiesener Reentranz. Flüchtiger Meldungszustand, Timeridentität, Containerprüfung, Schließen ohne Datenzugriff und beide Dateievent-Guards sind am bestehenden Quellstand beschrieben.
> - `BALANCE_MODULES_README.md` stimmt damit überein und korrigiert die Export-/Dependencyliste der Renderer-Fassade auf die tatsächlich vorhandenen Methoden und Imports. Kein Fachmodul, Datenmodell oder Enginevertrag wurde geändert.
> - `tests/README.md` benennt die isolierte Meldungstestdatei, echte Main-/Binderbelege, Observerziele mit Originaltextlesern, sichtbare Jahresmeldung nach 1/3 s und Import-Ablehnung/Rollback nach 2 s. Die strikte Nullzählung beim Tabwechsel bleibt beschrieben; der synthetische 3500-ms-Observertimer wird ausdrücklich von 6000-ms-Produktionstoasts unterschieden. Dokumentierte Assertions werden nicht als neuer Testlauf ausgegeben.

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
> Geprüft wurde der kanonische Diff von Handbuch.html, README.md, docs/reference/BALANCE_MODULES_README.md, docs/reference/TECHNICAL.md und tests/README.md. Alle Pfade liegen in der exakten Slice-Allowlist; Code-, Engine- und Testdateien sind nicht geändert. Die Dokumente stimmen inhaltlich überein: Toastdauer 6 s bzw. 6000 ms, Ersetzung mit neuer Frist, Rücksetzen je Bereich erst beim nächsten tatsächlich begonnenen passenden Vorgang, „Schließen“ ohne Reparatur, Recovery oder Berechnung, keine Persistenz der Meldungen und ein unveränderter Lebenszyklus der Berechnungs- und Validierungsfehler. Die Regel zu „Vermögensstand gesichert.“ ist unverändert. tests/README kennzeichnet den 3500-ms-Timer als synthetisch, nennt die 1-/3-s- und 2-s-Prüfungen und behauptet keinen Browserlauf in der Sandbox. Die Attestierung zu npm test meldet PASS auf dem Fingerprint [Hash ausgelassen]…. R-01 ist bereits geschlossen.

Größtes Restrisiko:
> Wörtliche API-Signaturen und Bereichsgrenzen in der Doku, etwa handleActionError(error, scope), aria-relevant und die Rücksetzregeln für expenses-import und expenses-recovery, lassen sich hier nicht Zeile für Zeile gegen den Code der Slices 1 und 2 prüfen. Grund: Das Paket enthält nur den Dokumentationsdiff dieses Slice, und der Lesevertrag erlaubt keine weiteren Dateizugriffe.

Bruchbedingung:
> Die Freigabe kippt, wenn der Quellcode eine andere Toastdauer als 6000 ms, ein anderes Rücksetzverhalten je Bereich oder andere Container-Attribute zeigt als dokumentiert, oder wenn npm test auf dem finalen Stand nicht grün ist.

Vorab-Risikoanalyse:
> Wahrscheinlichster Fehlschlag: Die Doku beschreibt ein Detail der Rücksetzgrenzen oder ARIA-Attribute genauer, als es im Code umgesetzt ist, und Nutzer oder Finalprüfer finden diese Abweichung. Das Risiko ist begrenzt, weil die Formulierungen den freigegebenen Slice-Verträgen und dem geschlossenen R-01 folgen; das Finalreview über den gesamten Branch prüft dies gegen den Code.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-123059.059014Z-4fdb3042188a`, Arbeitseinheit(en) 4; Nachweise in der Recordkette.
<!-- audit:reference:end -->
