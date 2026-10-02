# Slice 3 von 4 – Manuelle Erfassung und SVG-Verlaufsdiagramm

<!-- audit:status:begin -->
Freigegeben in Runde 2 · 1 Befund, 1 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Den Verlauf in Balance sichtbar machen und aktuelle Stände über den neuen Knopf sicher erfassen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: „Stand jetzt erfassen“ speichert einen aktuellen Stand; erneuter Klick am selben Tag ersetzt seine Werte, am nächsten lokalen Tag wächst die Historie um einen Record. Jahresrecord am selben Tag bleibt erhalten. Ein Klick ohne erfolgreiche aktuelle Balance-Validierung schreibt nichts.
- SOURCE: Die manuelle Erfassung verwendet das aktuelle aggregierte `result.inputData` trotz noch ausstehender Debounce-Aktualisierung; sie erzeugt keinen zusätzlichen Engine-Periodencommit. Rund um UTC-Mitternacht bleibt das lokale Klickdatum maßgeblich.
- SOURCE: Unsortierte synthetische Records werden chronologisch mit deterministischer Gleichstandsregel aufbereitet. Die drei Stapelsegmente, deren kumulierte Grenzen und die ausgewiesene Summe entsprechen den Quellen; Alt-/Neu-Depot werden nicht doppelt gestapelt.
- SOURCE: Diagramm und Tabelle unterscheiden Jahresabschluss/manuell durch lesbare Bezeichnungen und zusätzliche nichtfarbliche Kennzeichnung. Datum, Euro-Skala, Summe und beide Teildepots sind zugänglich; leere, einzelne und nur nullwertige Verläufe rendern ohne Division durch null oder ungültige SVG-Koordinaten.
- SOURCE: Schreibfehler, Profilwechsel und laufende/Pending-Jahresprozesse verhindern falsche Erfolgsmeldungen und fremde oder vorläufige Records. Nach Abschluss oder Fehler wird die Bedienung korrekt entsperrt; Listenerverdopplung erzeugt keine zweite Erfassung.
- SOURCE: Reload und Import eines Profils ohne Historie entfernen bisherige Chart-/Tabelleninhalte und zeigen den Hinweis. Ein beschädigter Verlauf zeigt einen Fehler und wird durch den Knopf nicht überschrieben.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Balance.html`
- `app/balance/balance-binder.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history-metrics.js`
- `app/balance/balance-wealth-history-renderer.js`
- `app/balance/balance-wealth-history.js`
- `css/balance.css`
- `docs/internal/slice-vermoegensverlauf-arbeitsplan-03-manuelle-erfassung-und-svg-verlaufsdiagramm.md`
- `docs/internal/vermoegensverlauf-implement-review-2e1a4a7a.md`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/balance-wealth-history.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Neuer Bereich „Vermögensverlauf“ in der Ergebnisspalte mit Profilzuordnung, Gruppenlegende, Knopf, Status, SVG und semantischer Datentabelle. Die Tabelle enthält beide Teildepots zusätzlich zur einzigen gestapelten Aktiengruppe.
> - `balance-wealth-history-metrics.js` validiert und projiziert gespeicherte Records unverändernd: Datum aufsteigend, Jahresabschluss vor manuell, anschließend ID; drei Gruppen mit kumulierten Grenzen und unveränderten Quellbeträgen.
> - `balance-wealth-history-renderer.js` zeigt Einzelmessungen als gestapelte Säulen ohne Interpolation. Text, Quadrat/Raute und durchgezogener/gestrichelter Rahmen unterscheiden die Anlässe. Euro-Skala, Datum, zugänglicher SVG-Name und Tabelle sind vorhanden. Schmale Ansichten scrollen innerhalb der beiden Ergebnisbereiche. Fehlende Historie und Lade-/Validierungsfehler entfernen alte Inhalte; Fehlermeldungen werden als Text gesetzt.
> - Der manuelle Controller hält das lokale Klickdatum fest und führt unmittelbar `update({ mode: PREVIEW })` aus. Erst nach transaktionalem Readback und Profilprüfung wird Erfolg gemeldet. Engine-State und Jahresmetadaten werden dabei nicht committed. Ein schon geplanter Debounce-Inputwrite wird während der Transaktion angehalten und anschließend wieder eingeplant.
> - Manuelle Erfassung und beide Jahresknöpfe teilen Bedienungssperren. Laufende/Pending-Jahresprozesse, ungültige aktuelle Ergebnisse, beschädigte Historie, Schreib-/Readback-/Flushfehler und Profilwechsel bestätigen keinen manuellen Record. Erfolgs- und Fehlerpfade entsperren die Bedienung. Der Capture-Listener und sein Controller werden für denselben Knopf bei erneuter Initialisierung wiederverwendet.
> - Anzeige wird beim Start, bei Updates, nach bestätigter Erfassung, Jahresprozess, Import und Snapshotaktionen aus dem aktuellen State erneuert. Ein Import entfernt vorherige Erfassungsbestätigungen; auch der Import-Rollback erneuert die Anzeige.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung rot · Prüfurteil abgelehnt · 1 neu, 0 geschlossen.
- Runde 2: Korrektur · Validierung grün · Prüfurteil freigegeben · 0 neu, 1 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
### R-01 – Die zum Fingerprint [Hash ausgelassen] passende Validierungsattestierung validation-[Hash ausgelassen] hat…

Klasse: Befund · Stand: geschlossen

Befund:
> Die zum Fingerprint [Hash ausgelassen] passende Validierungsattestierung validation-[Hash ausgelassen] hat den Status FAIL: `npm test` Lauf 1/2 endete mit exit=1, Lauf 2/2 mit exit=0. Damit ist die Suite auf genau diesem Stand nicht deterministisch grün, und der Vertrag verlangt eine Entscheidung im Einklang mit einer deterministischen Attestierung. Die fehlschlagende Datei ist in der gekürzten Ausgabe („...[191437 characters omitted]...“) nicht erkennbar. Daher ist nicht auszuschließen, dass die neuen Tests dieses Slices die Ursache sind. Mögliche Auslöser dort: die globale Manipulation von `process.env.TZ`, das Überschreiben von `global.document`/`UIReader.applyStoredInputs`, der 10-s-Timer, der wirft, sobald `handleCaptureWealth` ihn nicht löscht, und die Gate-/Deferred-Abläufe beim Readback. Ein Slice-Commit ist auf dieser Grundlage nicht freigabefähig.

Akzeptanztest:
> Auf dem Stand des Slice-Commits laufen beide Validierungsläufe von `npm test` mit exit=0, und die Attestierung meldet PASS. Ist der Fehlschlag von Lauf 1 auf eine Datei dieses Slices zurückzuführen (z. B. tests/balance-wealth-history.test.mjs oder tests/balance-wealth-history-chart.test.mjs), ist die Nichtdeterminismus-Ursache behoben, etwa Zeitzonen-, Timer-, Global- oder Reihenfolgeabhängigkeit. Liegt die Ursache nachweislich außerhalb dieses Slices, ist das mit der konkreten fehlschlagenden Datei und Assertion aus der vollständigen Ausgabe belegt.

Antwort des Implementierers, Runde 2 (angenommen):
> Die vollständige Validierungsausgabe belegt eine Snapshot-ID-Kollision im Wiederholungstest nach Restore. Eigene Fixture-Labels beheben die Zeitabhängigkeit; zusätzliche Assertions sichern den ursprünglichen Recovery-Snapshot. Beide Slice-Tests bestehen mit insgesamt 218 Assertions, auch bei eingefrorener Uhr. Ursache und Nachweise sind im Slice-Dokument festgehalten. Die zwei vollständigen npm-test-Läufe samt neuer Attestierung übernimmt gemäß Projektregel der Orchestrator.

Abschlussbegründung des Prüfers:
> Für den aktuellen Fingerprint [Hash ausgelassen]… meldet die Attestierung validation-[Hash ausgelassen] den Status PASS (`npm test` exit=0, 1 von 1 erforderlichen Läufen bestanden). Der Implementierer hat die Ursache innerhalb dieses Slices benannt: Im Wiederholungstest nach Restore in tests/balance-wealth-history.test.mjs konnten zwei Recovery-Snapshots in derselben Millisekunde mit gleichem Label dieselbe ID erhalten. Die Korrektur setzt pro Fehlerfall ein eigenes Label (`A-Wiederholung-${fault}`) und beseitigt so die Abhängigkeit von der Echtzeituhr. Zwei neue Assertions belegen das: `env.snapshots.size === 2` und der unveränderte ursprüngliche Recovery-Snapshot (`recoveryBefore`). Die übrigen Verdachtsmomente habe ich am Diff geprüft. `process.env.TZ` wird im finally wiederhergestellt; `global.document` und `UIReader.applyStoredInputs` werden am Ende zurückgesetzt. Den 10-s-Timer löscht `handleCaptureWealth` nachweislich, belegt durch die Assertion `binderState.debounceTimer === null`.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · rot · Exitcode 1.

```

📂 Running 3bucket-refill.test.mjs in process...
--- 3-Bucket Refill Tests ---
✅ 3-Bucket refill test
...[191437 characters omitted]...
   at async MockDocument.dispatch (~/repos/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)
    at async runProfileUiContractTests (~/repos/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)
    at async ~/repos/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9
[VALIDATION ERROR] Invalid input fields: [
  {
    fieldId: 'goGoMultiplier',
    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'
  }
]
=== validation run 2/2: PASS (exit=0) ===
> ruhestand-app-final@1.0.0 test
> node tests/run-tests.mjs

🚀 Starting Test Runner...
Found 187 test files.

📂 Running 3bucket-config.test.mjs in process...
--- 3-Bucket Config Tests ---
✅ 3-Bucket config tests passed
✅ 3bucket-config.test.mjs completed.
📊 FILE RESULT: 3bucket-config.test.mjs | mode=in-process | assertions=17 | passed=17 | failedAssertions=0 | failedFiles=0

📂 Running 3bucket-refill.test.mjs in process...
--- 3-Bucket Refill Tests ---
✅ 3-Bucket refill tes
...[191417 characters omitted]...
   at async MockDocument.dispatch (~/repos/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)
    at async runProfileUiContractTests (~/repos/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)
    at async ~/repos/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9
[VALIDATION ERROR] Invalid input fields: [
  {
    fieldId: 'goGoMultiplier',
    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'
  }
]
```

- Runde 2: `npm test` · grün · Exitcode 0.
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft habe ich die Korrektheit von Controller und Binder: Sperren in capture/withAnnual, Wiederaufnahme des Debounce, einmalige Listener-Bindung per WeakSet/WeakMap und lokales Klickdatum. Bei der SVG- und Tabellenaufbereitung habe ich Sortierung, Stapelgrenzen, Division durch null, sehr große Werte und Escaping geprüft. Dazu kamen die Fehlerpfade (Validierung, Write, Readback, Flush, Pending, beschädigte Historie, Profilwechsel), Import und Rollback sowie die Wiederherstellung der Test-Globals. Für R-01 habe ich die Determinismus-Ursache gegen die PASS-Attestierung geprüft. Alle Pfade liegen innerhalb der Allowlist.

Größtes Restrisiko:
> Die Erklärung der Snapshot-ID-Kollision stützt sich auf StorageManager.createSnapshot. Diese Datei liegt außerhalb des Diffs und ist hier nicht einsehbar, das ID-Schema lässt sich daher aus dem Snapshot nicht direkt verifizieren. Die neue Assertion `env.snapshots.size === 2` würde eine erneute Kollision jedoch deterministisch aufdecken. Die aktuelle Attestierung umfasst genau einen erforderlichen Lauf.

Bruchbedingung:
> Diese Freigabe ist zu revidieren, wenn ein weiterer `npm test`-Lauf auf diesem Fingerprint in tests/balance-wealth-history.test.mjs oder tests/balance-wealth-history-chart.test.mjs fehlschlägt. Gleiches gilt, wenn der Capture-Knopf trotz Pending- oder Jahresprozess einen Record schreibt oder wenn ein Import ohne Historie alte Chart- oder Tabelleninhalte stehen lässt.

Vorab-Risikoanalyse:
> Wahrscheinlichstes späteres Versagen: In Produktion könnten zwei Snapshots mit gleichem Label in derselben Millisekunde dieselbe ID erhalten. Das ist eine bestehende Eigenschaft außerhalb dieses Slices. Ein weiteres Risiko: `update()` lädt bei jeder Aktualisierung den State zum Rendern neu, was bei großen Profilen Leistung kostet. Fachlich wirkt keines davon auf die Akzeptanzkriterien dieses Slices zurück.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261002-194506.811440Z-1744300d869a`, Arbeitseinheit(en) 4; Nachweise in der Recordkette.
<!-- audit:reference:end -->
