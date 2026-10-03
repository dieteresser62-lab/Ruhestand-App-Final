# Slice 2 von 3 – Dauerhafte Aktionsfehler und Dateifeldschutz

<!-- audit:status:begin -->
Freigegeben in Runde 2 · 1 Befund, 1 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Aktionsfehler bis zur nächsten passenden Nutzeraktion oder bis zum Schließen erhalten, ohne den bisherigen Berechnungsfehlervertrag zu verändern.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- Im Balance-Quellpfad bleiben JSON-/CSV-Import-, Jahresabschluss- und Snapshotfehler mit unverändertem Wortlaut, Fehlerklassen, Status und Recoveryhinweis nach `clearError()`, normalem und entprelltem `update()` sowie Toastablauf sichtbar. Entsprechende Node-Nachweise verwenden reale Handler und Renderer, nicht ausschließlich spies.
- Ein neuer ausführbarer Vorgang desselben Bereichs entfernt den vorherigen Aktionsfehler; ein Vorgang eines anderen Bereichs, eine leere Dateiauswahl, abgebrochene Bestätigung und eine wegen Reentranz abgewiesene Aktion tun dies nicht. Zwei verschiedene Bereichsfehler bleiben gleichzeitig sichtbar. Schließen entfernt genau den zugehörigen Fehler und löst weder Update noch Speicherzugriff aus.
- File-`input` und File-`change` bewirken über den tatsächlich gebundenen Formlistener null direkte/entprellte Berechnungsaufrufe und keine Änderung von `pendingInputMetadata`. Gewöhnliche Eingaben lösen weiterhin das bisherige Update aus; Depot-/Gold-Zeitstempel bleiben erhalten.
- Ein Berechnungsvalidierungsfehler erzeugt weiterhin seinen bisherigen Text, seine Liste und Feldmarkierungen. Korrigierte Eingaben beseitigen diese beim nächsten echten `update()`; ein gleichzeitig vorhandener Toast und Aktionsfehler bleiben erhalten. Fehler innerhalb einer Aktion werden durch ihre Herkunft richtig zugeordnet, auch wenn sie vom Typ `ValidationError` sind.
- Im Browser-Smoke bleiben ein abgelehnter und ein zurückgerollter Balance-Import nach 2 s im sichtbaren Aktionsfehlerbereich erhalten und zusätzlich im Meldungsprotokoll belegt. Tabwechsel erhalten den Fehler und erfüllen weiterhin exakt null Update-/Clear-/Write-/Storageaufrufe; Daten-, Registry- und Exportprüfungen bleiben bestehen. Die Jahresabschlussprüfungen aus Slice 1 bleiben wirksam.
- Annual-Preflight, `invalid`, `incomplete_recovery`, bestätigter Abschluss trotz anschließendem UI-Fehler, Wiederholungs-No-op, Snapshot-Profilzuordnung, Importrollback und Ausgaben-Recovery behalten ihre vorhandenen fachlichen Regressionstests. `npm test` ist auf diesem Slice-Stand beim Orchestrator grün.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Balance.html`
- `app/balance/balance-annual-inflation.js`
- `app/balance/balance-annual-marketdata.js`
- `app/balance/balance-annual-orchestrator.js`
- `app/balance/balance-binder-imports.js`
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-binder.js`
- `app/balance/balance-expenses.js`
- `app/balance/balance-main.js`
- `app/balance/balance-renderer.js`
- `css/balance.css`
- `docs/internal/f-meldungen-sichtbar-implement-review-5ff9eb73.md`
- `docs/internal/slice-f-meldungen-sichtbar-arbeitsplan-02-dauerhafte-aktionsfehler-und-dateifeldschutz.md`
- `tests/balance-annual-inflation.test.mjs`
- `tests/balance-annual-marketdata.test.mjs`
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/balance-binder-snapshots.test.mjs`
- `tests/balance-expenses.test.mjs`
- `tests/balance-messages.test.mjs`
- `tests/balance-smoke.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Eigene zugängliche Region `#action-error-container` mit `dom.containers.actionError`, `handleActionError(error, scope)` und `clearActionError(scope)` ergänzt. Der Renderer hält ausschließlich flüchtige Bereichseinträge; Schließen entfernt genau den zugehörigen Eintrag ohne Berechnung, Recovery oder Speicherzugriff. Veraltete Knöpfe können keinen neuen Bereichsfehler löschen. Neuinitialisierung beendet den alten Meldungszustand.
> - Gemeinsame Fehlerformatierung erhält bestehende Texte, AppError-Präfix und Validierungslisten. Ausschließlich Berechnungsvalidierung setzt Feldmarkierungen; auch ein `ValidationError` aus einer Aktion bleibt im Aktionskanal.
> - JSON-/Markt-CSV-Import, Export, Jahresabschluss einschließlich verschachtelter Datenabrufe, Snapshotaktionen und nutzerinitiierte Ausgaben-Recovery/-Importfehler ihren Bereichen zugeordnet. Rücksetzen erfolgt bei ausführbaren Aktionen desselben Bereichs, nach erforderlicher Bestätigung beziehungsweise tatsächlicher Dateiauswahl. Verschachtelte Jahresschritte erhalten die Kennzeichnung `nested`; Reentranz leert den Jahreskanal nicht. Die rendernde Profil-Recovery bleibt im bisherigen Berechnungskanal.
> - File-Guard vor Metadatenänderung und Debounce im tatsächlich gebundenen Form-Inputlistener ergänzt. Normale Eingaben und Depot-/Gold-Zeitstempel bleiben erhalten.
> - Node-Nachweise mit echten Import-, Snapshot- und Annualhandlern, echtem Renderer sowie echtem Main-Update/Debounce ergänzt. Reale Ablehnung und ausgelöster Rollback behalten Recoverytext über direkte und entprellte Updates. JSON-/CSV-/Snapshot-/Annualfehler bleiben auch nach echtem Toastablauf sichtbar. Berechnungsvalidierung verschwindet nach echter Korrektur samt Liste und Feldmarkierungen; Toast und Aktionsfehler bleiben erhalten.
> - Browser-Meldungsprotokoll um Bereichseinträge erweitert: unveränderte Texte ohne Schließenbeschriftung, keine Wiederholung unveränderter anderer Bereiche. Annual-Preflight liest den Aktionskanal. Importablehnung und Rollback werden bei offenem und geschlossenem Verlauf nach abgeschlossener Verarbeitung zusätzlich nach 2 s sichtbar geprüft; Tabwechsel erhalten denselben Text und verwenden weiterhin die bestehenden strikten Nullzählungen und Daten-/Registry-/Exportvergleiche. Die Jahresabschlussprüfungen aus Slice 1 bleiben unverändert.
> - Korrektur R-01: Verschachtelte Inflations-/ETF-Aufrufe werfen bei bereits laufendem Abruf einen eindeutig benannten `AppError` mit Kontextcode `inflation_fetch_in_flight` beziehungsweise `etf_fetch_in_flight`. Dadurch erfasst das Jahresupdate den blockierten Schritt in `results.errors` und liefert `ok: false`. Die Abweisung lässt Sperre, Knopfzustand und bestehenden Annualfehler des ursprünglichen Direktabrufs unangetastet; direkte Doppelklicks starten weiterhin keinen zweiten Fetch. Der Regressionstest verwendet für beide Schritte reale Handler, den realen Jahresorchestrator und einen zurückgehaltenen Fetch und prüft zusätzlich den Abschluss sowie einen danach wieder möglichen Direktabruf.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil abgelehnt · 1 neu, 0 geschlossen.
- Runde 2: Korrektur · Validierung grün · Prüfurteil freigegeben · 0 neu, 1 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
### R-01 – Die in diesem Slice neu eingeführten Reentranzsperren in `handleFetchInflation` (`if (fetchInFlight)…

Klasse: Befund · Stand: geschlossen

Befund:
> Die in diesem Slice neu eingeführten Reentranzsperren in `handleFetchInflation` (`if (fetchInFlight) return;`) und `handleNachrueckenMitETF` (`if (etfInFlight) return;`) gelten auch für verschachtelte Aufrufe mit `{ nested: true }` und liefern dann stillschweigend `undefined`, ohne zu werfen. `handleJahresUpdate` erfasst Schrittfehler aber nur im `catch` (`results.errors.push(...)`, sichtbar im Diff von app/balance/balance-annual-orchestrator.js). Läuft ein direkt über den eigenen Knopf gestarteter Inflations- oder ETF-Abruf noch, während Jahres-Update oder Jahresabschluss (`runAnnualUpdate({ failOnStepError: true, nested: true })`) denselben Schritt aufruft, wird der Schritt nicht als Fehler gezählt. `results.inflation` bzw. `results.etf` bleibt dann leer, obwohl `failOnStepError` gesetzt ist. Vor dem Slice gab es keinen solchen stillen Pfad: Der Schritt lief erneut und lieferte ein echtes Ergebnis oder einen Fehler. Damit kann der bestätigte Jahresabschluss ohne gültiges Schrittergebnis weiterlaufen oder mit einem irreführenden Fehler `incomplete_recovery` enden. Gleichzeitig ändert der parallele Direktlauf außerhalb des Commit-Ablaufs Daten. Kein Test deckt die Kombination aus Sperre und verschachteltem Aufruf ab. Die neuen Tests prüfen nur `nested` ohne parallelen Lauf.

Akzeptanztest:
> Ein Node-Test in tests/balance-annual-workflow-contract.test.mjs (oder in den Inflations- bzw. Marktdatentests) startet einen direkten `handleFetchInflation()`- bzw. `handleNachrueckenMitETF()`-Aufruf mit zurückgehaltenem fetch. Während dieser Aufruf noch läuft, ruft er `handleJahresUpdate({ failOnStepError: true, nested: true })` auf. Erwartet wird eine von zwei Varianten. Erstens: Der verschachtelte Schritt wartet auf das laufende Promise und übernimmt dessen gültiges Ergebnis. Zweitens: Der Schritt wirft einen eindeutig benannten Fehler, sodass `results.errors` den Schritt enthält und das Ergebnis `ok: false` lautet. In keinem Fall darf der Schritt als erfolgreich gelten, wenn das Schrittergebnis `undefined` ist. Ein direkter Doppelklick erzeugt weiterhin keinen zweiten Abruf und entfernt keinen bestehenden Annualfehler.

Antwort des Implementierers, Runde 2 (angenommen):
> Verschachtelte Inflations- und ETF-Aufrufe werfen bei laufendem Abruf eindeutige Schrittfehler; das Jahresupdate liefert dadurch ok: false. Direkte Doppelklicks erhalten Abrufsperre und Annualfehler. Regressionstest vor der Korrektur fehlgeschlagen, danach bestanden. Vier gezielte Testdateien mit 231 Assertions bestanden; die volle Suite übernimmt der Orchestrator.

Abschlussbegründung des Prüfers:
> Behoben gemäß Variante 2 des Abnahmekriteriums. In app/balance/balance-annual-inflation.js und app/balance/balance-annual-marketdata.js wirft der Sperrzweig bei `nested` jetzt einen `AppError` mit den Codes `inflation_fetch_in_flight` bzw. `etf_fetch_in_flight`. Das geschieht vor `fetchInFlight = true` bzw. `etfInFlight = true` und vor dem `try`. Deshalb gibt das `finally` die Sperre des laufenden Direktabrufs nicht frei. Der `catch` in `handleJahresUpdate` erfasst den Schritt in `results.errors`. Test 7 in tests/balance-annual-workflow-contract.test.mjs deckt beide Schritte mit zurückgehaltenem fetch ab und prüft dabei: `result.ok === false`, genau einen Fehler mit dem passenden `step`, den Text 'Abruf läuft bereits' und ein Schrittergebnis `null`. Weiter belegt er, dass ein Doppelklick keinen zweiten Fetch startet (`fetchCalls === 1`), der bestehende Annualfehler erhalten bleibt und der Knopf bis zum Fetch-Ende gesperrt ist. Nach Freigabe liefert der ursprüngliche Abruf sein gültiges Ergebnis. Die Attestierung zu `npm test` meldet PASS auf dem Fingerprint [Hash ausgelassen]….
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.

- Runde 2: `npm test` · grün · Exitcode 0.
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft: Korrektheit der Sperr- und Wurfreihenfolge in beiden Abrufhandlern sowie die Fehlererfassung im Orchestrator. Ebenso geprüft: der Pfad von Jahresabschluss zu `runAnnualUpdate({ failOnStepError: true, nested: true })` mit `!annualUpdate?.ok` → throw, die Bereichszuordnung von `handleActionError` und `clearActionError`, das Verhalten bei Reentranz und Doppelklick, das Freigeben der Sperren im `finally`, die Neuinitialisierung des Renderers, die Testabdeckung (workflow-contract Test 7, messages, smoke) und die Pfadgrenzen. Alle Diffpfade liegen in der Slice-Allowlist.

Größtes Restrisiko:
> Wird der Jahresabschluss bestätigt, während ein Direktabruf läuft, endet er nach dem Metadaten-Write über den neuen Schrittfehler im Status `incomplete_recovery`, dessen Hinweis zur Wiederherstellung des Recovery-Snapshots korrekt ist. Fachlich ist das sicher, da `ok: false` gilt, für Nutzer aber schwerfällig. Das Abnahmekriterium lässt diese Variante ausdrücklich zu.

Bruchbedingung:
> Das Ergebnis würde kippen, wenn ein verschachtelter Aufruf bei gesetzter Sperre wieder `undefined` zurückgäbe oder der Wurf die Sperre des laufenden Direktabrufs im `finally` freigäbe. Dasselbe gilt, wenn `handleJahresUpdate` trotz Einträgen in `results.errors` bei `failOnStepError` `ok: true` lieferte. Test 7 würde jeden dieser Fälle rot melden.

Vorab-Risikoanalyse:
> Würde dieser Slice später scheitern, wäre die wahrscheinlichste Ursache ein Jahresabschluss, der parallel zu einem manuellen Inflations- oder ETF-Abruf gestartet wird. Er bricht nun zwar sicher mit `incomplete_recovery` ab, verlangt vom Nutzer aber eine Snapshot-Wiederherstellung. Weitere mögliche Ursache: Ein künftiger Aufrufer übergibt `nested` nicht und erhält beim Doppelklick still `undefined`. Beides liegt außerhalb des geprüften Vertrags. Der Direktpfad ist bewusst idempotent gestaltet, und der verschachtelte Pfad ist durch Test 7 abgesichert.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-123059.059014Z-4fdb3042188a`, Arbeitseinheit(en) 3; Nachweise in der Recordkette.
<!-- audit:reference:end -->
