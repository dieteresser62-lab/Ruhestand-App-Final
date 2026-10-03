# Slice 5 von 5 – Tatsächliche Bedienwege und Prüfnachweise dokumentieren

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Die Anzeige- und Wiederherstellungsverträge in Nutzer- und Referenzdokumentation konsistent erklären und die Abnahme vorbereiten.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Die fünf Dokumente beschreiben konsistent die drei Toasttypen, dauerhafte bereichsbezogene Fehler, Fokusübergabe, Dialogabbruch und die nicht persistierende Import-Wiederherstellung. Fachliche Recovery-Warnungen bleiben verständlich und unverändert wirksam.
- SOURCE: Nutzerpfade stimmen mit `Balance.html` überein; direkte Inflations-/ETF-/CAPE-Aufrufe und ihre Sperren werden ausschließlich als intern beschrieben. Die beiden Jahresknöpfe und ihr vorhandener Doppelklickschutz bleiben korrekt dokumentiert.
- SOURCE: `tests/README.md` nennt die hinzugefügten Node- und Browsernachweise und trennt den Orchestratorlauf `npm test` vom Browser-Smoke außerhalb der Sandbox. Es behauptet keine im Planungs- oder Implementierungsschritt nicht ausgeführten Prüfungen.
- SOURCE: Der Dokumentationsdiff enthält keine Änderungen an Projektregeln, generierten Artefakten oder nicht freigegebenen Pfaden. Das abschließende `npm test` durch den Orchestrator ist grün; die gesteuerte Sitzung führt `npm run test:browser` vor dem Merge aus.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Handbuch.html`
- `README.md`
- `docs/internal/f2-meldungen-rest-implement-review-e848a1f3.md`
- `docs/internal/slice-f2-meldungen-rest-arbeitsplan-05-tatsachliche-bedienwege-und-prufnachweise-dokumentieren.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
<!-- audit:scope:end -->

## Umsetzung

> - `README.md` und `Handbuch.html` erklären Erfolg, neutralen Hinweis und Fehler mit unveränderter sechssekündiger Laufzeit, bereichsbezogene dauerhafte Fehler, kompakte scrollbare Darstellung, manuelles Schließen mit Fokusübergabe und passive automatische Bereinigung. Snapshotfehler bleiben während der Ordnerwahl und bei Dialogabbruch erhalten; erst die bestätigte, gespeicherte Verbindung bereinigt den Bereich.
> - Beide Nutzerreferenzen sowie `docs/reference/TECHNICAL.md` und `docs/reference/BALANCE_MODULES_README.md` beschreiben die abgewartete Wiederherstellungsvorschau nach gescheitertem JSON-/Markt-CSV-Import: Eingaben und CSV-Provenienz wiederherstellen, ausschließlich `PREVIEW` ohne zusätzlichen Speicherwrite oder Ersatz-Commit, danach ursprünglicher Aktionsfehler. Berechnungsfeedback verworfener Daten wird bereinigt; echte Fehler des Ausgangsstandes und fremde Aktionsfehler bleiben zulässig. Bei `rollback_failed` bleibt die Recovery-Aufforderung maßgeblich; Schließen und Vorschau reparieren keine Daten.
> - Die beiden tatsächlichen Jahresknöpfe teilen den Snapshot-Coordinator und `annualCloseInFlight`; Perioden- und Doppelklickschutz sowie mindestens drei Sekunden sichtbare Abschlussmeldung bleiben dokumentiert. Direkte Inflations-/ETF-/CAPE-Aufrufe, `nested` und die zusätzlichen Sperren `inFlight`, `fetchInFlight`, `etfInFlight` sind ausschließlich interne Abläufe.
> - `tests/README.md` benennt die ergänzten Node-/Browserfälle, testseitige Fehlerinjektionen, Baselinevergleiche, Dateieventschutz, Dialogabbruch, Fokus-/ARIA-, Kontrast-, Scroll-/Mobil- und Druckprüfungen. Interne CAPE-Quellentests werden vom Toasttypnachweis im Jahresworkflow unterschieden. Historische Suitezahlen bleiben unverändert.
> - Produktcode, Tests, Projektregeln und generierte Artefakte wurden in diesem Slice nicht geändert. Das bestehende Gesamtaudit und der vorhandene unversionierte Eintrag `.gemini` wurden nicht bearbeitet.

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
> Geprüft wurden Pfadgrenze, Dokumentkonsistenz, Bedienwege, Teststatus und Projektregeln. Pfadgrenze: Der Diff ändert nur Handbuch.html, README.md, docs/reference/BALANCE_MODULES_README.md, docs/reference/TECHNICAL.md und tests/README.md, alle in der Slice-Allowlist. Er enthält weder Projektregeldateien noch generierte Artefakte noch Code. Konsistenz: Die fünf Dokumente beschreiben übereinstimmend drei Toasttypen (✓/i/! mit `'info'`), bereichsbezogene dauerhafte Aktionsfehler, Fokusübergabe (nächster Knopf, Nachbar, `#openDiagnosisBtn`) und passive automatische Bereinigung. Ebenso übereinstimmend beschrieben sind der Ordnerdialogabbruch (`AbortError` erhält den Fehler) und die Import-Wiederherstellung per nicht persistierender `PREVIEW`, wobei `rollback_failed` weiter maßgeblich bleibt. Bedienwege: Als Nutzerpfade sind nur `#btnJahresUpdate` und `#jahresabschlussBtn` mit `annualCloseInFlight` genannt. Inflations-, ETF- und CAPE-Aufrufe und die Sperren `inFlight`, `fetchInFlight` und `etfInFlight` sind ausdrücklich als intern beschrieben. Die Tabstation des Containers nur bei vorhandenen Einträgen deckt sich mit der Behebung von R-01 (bereits CLOSED). Teststatus: tests/README.md trennt `npm test` (Orchestrator) und `npm run test:browser` (gesteuerte Sitzung vor dem Merge). Die Datei erklärt ausdrücklich, dass die Beschreibung keine ausgeführten Browserläufe und keine neuen Suitezahlen behauptet. Die Attestation `npm test` auf Fingerprint [Hash ausgelassen]… ist PASS.

Größtes Restrisiko:
> Einzelne Detailangaben der Doku lassen sich mit diesem Paket nicht abgleichen, etwa `min(16rem, 30vh)`, die Mindestanzeige von 3000 ms und genaue Testfallnamen wie `Balance folder abort` oder `Balance import restoration` in tests/browser-smoke.test.mjs. Grund: Das Review-Paket enthält nur den Dokumentationsdiff dieses Slices, keine Quell- oder Testdateien. Die Angaben stammen aus den zuvor geprüften Slices 1–4, und R-01 war dort im Quelltext verifiziert. Eine Abweichung wäre ein reiner Dokumentationsfehler ohne Laufzeitwirkung.

Bruchbedingung:
> Das Review wäre falsch, wenn eines dieser Dinge zutrifft: Balance.html enthält doch eigene Inflations-, ETF- oder CAPE-Abrufknöpfe. Die Liste in css/balance.css ist anders begrenzt als mit `min(16rem, 30vh)`. Der Renderer setzt `tabindex="0"` auch bei leerer Liste. Oder die in tests/README.md genannten Browserfälle existieren in tests/browser-smoke.test.mjs nicht unter diesen Namen.

Vorab-Risikoanalyse:
> Wenn dieser Slice später als fehlerhaft gilt, dann am wahrscheinlichsten, weil die Doku eine Eigenschaft (Testfallname, CSS-Grenze, Fokusziel am Listenende) genauer behauptet, als die Implementierung aus Slice 2–4 sie umsetzt. Das Finalreview sollte daher die Namen der Browserfälle und die CSS-Höhengrenze stichprobenartig mit dem Quelltext abgleichen. Funktional besteht kein Risiko, weil weder Code noch Tests geändert wurden und `npm test` grün ist.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-135954.330992Z-fd7253ade355`, Arbeitseinheit(en) 6; Nachweise in der Recordkette.
<!-- audit:reference:end -->
