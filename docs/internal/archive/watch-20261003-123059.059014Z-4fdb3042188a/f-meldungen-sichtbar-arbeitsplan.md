# Arbeitsplan: Meldungen bleiben sichtbar

## Auftrag und Ausführungsgrenze

- Zielbranch: `feature/meldungen-sichtbar`; Ausgangscommit: `aadddd75b319156c56669f07a56a8f7ad93ab381`.
- Dieser Aufruf ist `PLAN_ONLY`. Seine einzige Änderung ist dieses Dokument. Die folgenden drei Slices sind zukünftige Umsetzungspakete und werden erst in einem nachfolgenden Umsetzungslauf ausgeführt.
- Keine Branchtransaktionen, kein Staging, keine Commits, kein Push oder Merge durch den Implementierer. Die volle Node-Suite führt im orchestrierten Lauf allein der Orchestrator aus. Der gesteuerten Sitzung obliegt das Browsergate vor dem Merge.
- Produktgrenze ist ausschließlich Balance. Engine, Datenverträge, gespeicherte Zustände, Recovery, Snapshot-/Importtransaktionen, Jahresabschlussreihenfolge und die anderen Seiten bleiben unverändert. `engine.js`, `dist/` und Desktop-Binaries werden nicht angefasst.

## Repositorybefund und Planungsgrundlage

Die beiden vorgegebenen Reviews unter `inbox/backlog/` wurden nur gelesen. Ihre Ursachenbeschreibung stimmt mit den Meldungspfaden des aktuellen Quellstands überein:

1. `app/balance/balance-renderer.js`: `toast()` schreibt in `dom.containers.error` und startet für jeden Aufruf einen unbedingten 3500-ms-Löschcallback. `handleError()` und `clearError()` verwenden denselben Container.
2. `app/balance/balance-main.js`: `update()` leert die Fehleranzeige nach dem Engine-Gate und beim initialen Leerzustand; der Catch zeigt Berechnungsfehler über `handleError()`. Dieses Verhalten muss für die laufende Berechnung erhalten bleiben.
3. `app/balance/balance-binder.js`: `handleFormChange()` ignoriert Dateifelder bereits; `handleFormInput()` plant auch für Dateifelder ein Update und kann dabei Eingabemetadaten verändern.
4. JSON- und Markt-CSV-Import melden ihre sicheren, gegebenenfalls um Recovery ergänzten Fehler in `balance-binder-imports.js`. Der Jahresprozess und Snapshot-Restore/-Löschen melden ihre Fehler in `balance-binder-snapshots.js`; Inflations-, ETF- und Jahresupdate-Handler sowie Ausgabenaktionen benutzen ebenfalls den allgemeinen Fehlerpfad. Der Binder behandelt außerdem Fehler beim Verbinden des Snapshot-Ordners.
5. Die Jahresabschlussbestätigung stammt aus `balance-binder-snapshots.js`. Der Zusatz `Vermögensstand gesichert.` hängt bereits am Flag `annualWealthSaved`, das erst nach bestätigter Finalisierung gesetzt wird. Diese Bedingung wird nicht geändert. `balance-annual-orchestrator.js` plant weiterhin sein fachlich vorhandenes `debouncedUpdate()`.
6. `tests/browser-smoke.test.mjs` protokolliert Meldungen in `createPage()` aktuell ausschließlich über einen Observer auf `#error-container`. Der Markt-CSV-Erfolg wird dort ebenfalls gesucht. Diese Leser müssen den neuen Kanal verwenden.
7. Der aktuelle Verlaufsfall nutzt bereits `waitForWealthBrowserIdle()` und `installWealthBrowserUpdateObserver`; der in der Idee zitierte ältere Kommentar und das Warten auf eine leere Fehleranzeige sind im Ausgangsstand nicht mehr vorhanden. Die aktuelle Instrumentierung zählt `readAllInputs`, `clearError`, Persistenzaufrufe und sämtliche Browser-Speichermutationen. Diese stärkeren Prüfungen bleiben erhalten. Die neue 6000-ms-Toastzeit darf das auf 250-ms-Eingabeupdates bezogene Idle nicht blockieren.
8. `tests/balance-smoke.test.mjs` importiert und initialisiert das echte `balance-main.js` mit DOM-/Engine-Fakes. Hier können tatsächliche `update()`- und Debounce-Läufe abgesichert werden. `balance-ui-orchestration.test.mjs` enthält bereits echte Importhandler und Binderverdrahtung; die bisherigen Fehlerspies müssen beim neuen Aktionsfehlerpfad mitgezogen werden.

## Verbindlicher Anzeigevertrag

### Drei unabhängige Zuständigkeiten

- **Kurzmeldungen:** Neuer `#toast-container` unmittelbar bei der bisherigen Meldungsanzeige, referenziert als `dom.containers.toast`. Er erhält `role="status"`, `aria-live="polite"` und eine atomare Textankündigung. Er ist kein Bestandteil des Fehlercontainers. Eine Meldung ersetzt die vorherige und bleibt ab ihrem eigenen Aufruf ungefähr 6000 ms sichtbar; danach wird ausschließlich dieser Toast entfernt.
- **Laufende Berechnung:** `#error-container` und `dom.containers.error` bleiben der Kanal für `handleError(error)` und `clearError()`. Eingabevalidierung mit Liste und `input-error`-Markierungen, Engine-/Updatefehler und Initialisierungsfehler behalten ihren bisherigen Lebenszyklus. Kein pauschales Unterdrücken von `clearError()` und keine Umklassifizierung anhand der Fehlerklasse.
- **Nutzeraktionen:** Neuer benachbarter `#action-error-container`, referenziert als `dom.containers.actionError`. Der Renderer verwaltet dort flüchtige, nach Bereich identifizierte Fehlermeldungen, beispielsweise über `handleActionError(error, scope)` und `clearActionError(scope)`. Mehrere Bereiche können gleichzeitig einen Fehler anzeigen; ein späterer Fehler in einem anderen Bereich darf den bisherigen nicht überschreiben. Jeder Eintrag besitzt einen echten `type="button"`-Schließenknopf mit verständlichem zugänglichem Namen. Aktionsfehler werden zugänglich angekündigt. Schließen bestätigt lediglich das Lesen und bewirkt keinen Recovery-, Daten- oder Berechnungsaufruf.

Die Anzeigeformatierung wird wiederverwendet: Bestehende Meldungstexte einschließlich `AppError`-Präfix, Validierungsdetails, Fehlercodes und Recovery-Hinweisen bleiben erhalten. Die Herkunft des Aufrufs entscheidet über die Lebensdauer: Auch ein Validierungsfehler innerhalb eines Imports oder Jahresabschlusses wird als Aktionsfehler behandelt, während derselbe Typ aus `update()` weiterhin ein Berechnungsfehler ist. Feldmarkierungen der laufenden Berechnung bleiben deren eigener Zuständigkeit zugeordnet.

Toast-Erfolg und `isSuccess=false` erhalten unterscheidbare Formen/Symbole und eine zugängliche Typkennzeichnung zusätzlich zu Farbe. Der eigentliche Meldungstext wird nicht umgeschrieben. Für exakte Textvergleiche und das Meldungsprotokoll wird der Text ohne Schließenknopf, Typkennzeichnung und dekorative Zeichen gelesen; vorhandene Zeichen im Originaltext bleiben erhalten. Keine Meldung als HTML interpretieren. Lange Recovery-Texte umbrechen auf mobilen Breiten, Schließen ist per Tastatur erreichbar; neue Styles betreffen nur Balance und erhalten die bestehende Druckdarstellung.

### Eigentümerschaft und Rücksetzen von Aktionsfehlern

| Bereichsschlüssel | Nutzeraktionen und Fehlerquellen | Grenze für das Rücksetzen |
| --- | --- | --- |
| `balance-import` | Balance-JSON-Import, Ablehnung, Dry-Run-Fehler, automatischer Rollback oder Rollbackfehler | Beginn eines neuen Imports mit tatsächlich gewählter Datei |
| `market-csv-import` | Markt-CSV-Import einschließlich sicherem Rollbackhinweis | Beginn eines neuen Markt-CSV-Imports mit Datei |
| `balance-export` | Balance-JSON-Export | Beginn eines neuen Exports |
| `annual` | Beide Jahresknöpfe und ihre verschachtelten Jahres-/Inflations-/ETF-Schritte; direkt gestartete Annual-Datenaktionen | Beginn einer neuen, angenommenen Aktion dieses Bereichs, vor der Arbeit |
| `snapshots` | Snapshot-Ordner verbinden, Snapshot wiederherstellen oder löschen | Beginn einer tatsächlich ausgeführten neuen Snapshotaktion |
| `expenses-import` | Ausgaben-CSV-Dateiimport für einen Monat/ein Profil | Beginn eines neuen Imports mit Datei und gültigem Importziel |
| `expenses-recovery` | Nutzerinitiierter Recovery-Export und bestätigtes Zurücksetzen korrupter Ausgaben | Beginn einer neuen ausführbaren Recoveryaktion |

Rücksetzen und Fehleranzeige liegen an den bestehenden Aktionsgrenzen; die fachliche Arbeit bleibt unverändert. Verschachtelte Annual-Schritte bereinigen nicht nochmals den gemeinsamen Annual-Kanal und löschen keine gerade entstandenen Fehler. Ein bereits laufender Jahresprozess/Doppelklick, ein irrelevanter Snapshotlisten-Klick, ein Dateidialog ohne Auswahl und eine abgebrochene Bestätigung beseitigen keine Meldung. Wo eine Bestätigung benötigt wird, wird erst nach dieser Bestätigung zurückgesetzt. Ein Erfolgstoast räumt keine Aktionsfehler anderer Bereiche ab.

Die rein rendernde Profil-Recovery-Anzeige in `balance-expenses.js` bleibt von den nutzerinitiierten Recoveryfehlern unterschieden; kein neuer Datenrecoveryvertrag. Die eigene Meldungsregion `#wealthHistoryStatus` wird nicht umgestaltet: Vermögensverlauf-Erfassung und ihre Fachlogik sind nicht Gegenstand dieses Plans.

### Timer und flüchtiger Zustand

Der Renderer hält den aktiven Toasttimer und eine monoton wechselnde Meldungsidentität. Ein neuer Toast storniert den vorherigen Timer; der Callback prüft zusätzlich die Identität und den zugehörigen Container, bevor er löscht. Damit bleiben auch bereits bereitgestellte alte Callbacks wirkungslos. Erneute Rendererinitialisierung beendet alte Timer und bindet keinen alten Zustand an neue DOM-Referenzen. Derselbe Text in zwei aufeinanderfolgenden Toasts ist eine neue Meldung mit eigener Frist. Kein Timer löscht Fehler, und keine Berechnungsfehlerbereinigung löscht Toasts oder Aktionsfehler. Meldungszustand wird weder gespeichert noch exportiert.

## Zukünftige Umsetzungsslices

Die Slices werden in der folgenden Reihenfolge umgesetzt. Jede Liste ist die exakte Änderungsallowlist ihres zukünftigen Pakets; zusätzliche Dateien erfordern eine planmäßige Umfangskorrektur. Wiederholte Pfade zwischen Paketen sind beabsichtigt, weil Tests und Renderer schrittweise erweitert werden.

### Slice 1 - Eigenständige Kurzmeldungen mit sicherer Laufzeit

**Ziel**

Toasts vom bisherigen Fehlerkanal trennen und ihren Lebenszyklus gegen Hintergrundupdates und veraltete Timer absichern.

**Exakter Änderungspfad**

- `Balance.html`
- `app/balance/balance-main.js`
- `app/balance/balance-renderer.js`
- `css/balance.css`
- `tests/balance-messages.test.mjs`
- `tests/balance-smoke.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/run-tests.mjs`

**Umsetzung**

- Den Toastbereich, die DOM-Referenz, zugängliche Statusausgabe und Form-/Typunterscheidung gemäß Anzeigevertrag ergänzen. Kein Fallback, der bei fehlendem Toastbereich wieder Fehler überschreibt.
- `toast()` auf 6000 ms und Timer-/Identitätsprüfung umstellen; `clearError()` weiterhin ausschließlich für Berechnungsfehler verwenden.
- Neue `balance-messages.test.mjs` mit gezählten Assertions des vorhandenen Runners, minimalem DOM und kontrollierter Uhr anlegen. Die Datei im bestehenden `TEST_EXECUTION_POLICY` als `isolated` aufnehmen, weil sie DOM-/Timer-Globals verwendet. Alle Änderungen an Globals und Rendererzustand im Cleanup zurückbauen. Keine neuen Abhängigkeiten oder neue Testinfrastruktur.
- `balance-smoke.test.mjs` mit echten Rendereraufrufen und erfolgreichem sowie fehlerhaftem `balanceMain.update()` ergänzen; Toastnachweis nicht durch einen ersetzten `toast()` oder einen nachgebauten Updatecallback entwerten.
- `createPage()` in der Browser-Suite so erweitern, dass der neue Toastbereich zusätzlich zu bisherigen Fehlern beobachtet wird. Reine Meldungstexte protokollieren, damit exakte Jahresabschlussprüfungen ihre Aussage behalten. Markt-CSV-Erfolgsleser auf den Toasttext umstellen und ebenfalls einen seit der Aktion neuen Protokolleintrag verlangen.
- Im bestehenden `Balance annual commit` unmittelbar nach nachgewiesener Abschlussbestätigung die tatsächliche Sichtbarkeit und denselben Meldungstext nach ungefähr 1 s und nach insgesamt 3 s prüfen, jeweils für offenen und geschlossenen Verlauf. Reguläre Timer laufen weiter; nicht nur die Uhrzeit ändern und nicht bloß das historische Protokoll abfragen.

**Akzeptanzkriterien**

- An der Quelloberfläche von Balance existiert ein benachbarter, zugänglicher Statusbereich mit `role="status"` und `aria-live="polite"`; beide Toasttypen sind zusätzlich zu Farbe durch Form und zugängliche Typkennzeichnung unterscheidbar, der Meldungswortlaut bleibt exakt erhalten.
- Kontrollierte Node-Zeit belegt Sichtbarkeit bis unmittelbar vor 6000 ms und Entfernung bei Ablauf. Neuer Toast, identischer Folgetext und erneute Initialisierung sind abgesichert; ein ausdrücklich ausgeführter alter Callback kann eine neuere Meldung nicht löschen.
- Node-Tests über den echten Renderer sowie das echte `balanceMain.update()` belegen, dass ein Toast `clearError()` und erfolgreiche oder fehlerhafte Updates überlebt; Fehler können gleichzeitig im bisherigen Fehlerkanal erscheinen.
- Der Browser-Smoke beobachtet Fehler und Toasts zusätzlich im Meldungsprotokoll. Der erfolgreiche neue Jahresabschluss wird im sichtbaren Toasttext nach 1 s und 3 s mit dem unveränderten Zusatz belegt; No-op und Jahre vor 2026 erhalten weiterhin keinen neuen Zusatz. Markt-CSV-Erfolg wird am neuen Kanal geprüft.
- Die neue Testdatei wird von der bestehenden Suite entdeckt und isoliert ausgeführt; gezielte Tests liefern gezählte Assertions und keine zurückbleibenden Echtzeittimer. `npm test` ist auf diesem Slice-Stand beim Orchestrator grün.

**Fokussierte Validierung**

```bash
node tests/run-single.mjs tests/balance-messages.test.mjs
node tests/run-single.mjs tests/balance-smoke.test.mjs
node --check tests/browser-smoke.test.mjs
```

Der Syntaxcheck ist kein Browsernachweis. Vor dem Merge fährt die gesteuerte Sitzung insbesondere die vorhandenen Fälle `Balance annual commit` und `Balance CSV import roundtrip`.

### Slice 2 - Dauerhafte Aktionsfehler und Dateifeldschutz

**Ziel**

Aktionsfehler bis zur nächsten passenden Nutzeraktion oder bis zum Schließen erhalten, ohne den bisherigen Berechnungsfehlervertrag zu verändern.

**Exakter Änderungspfad**

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

**Umsetzung**

- Aktionsfehlerregion und ihre DOM-Referenz ergänzen; Fehlerformatierung für beide Kanäle wiederverwenden. Aktionsfehler nach obiger Bereichstabelle verwalten, gezielt bereinigen und per Tastatur schließbar machen. Berechnungsfehler, Validierungslisten und Feldmarkierungen weiterhin über den bisherigen Rendererpfad behandeln.
- Alle oben inventarisierten nutzerinitiierten `handleError()`-Aufrufe auf den expliziten Aktionskanal führen und die passende Rücksetzgrenze ergänzen. Die Hintergrund-Catches in `balance-main.js` bleiben Berechnungsfehler. Der Annual-Koordinator darf seine bestehenden Rückgabestatus, Recoveryentscheidung, Reihenfolge und Debounce-Aufrufe nicht ändern.
- In `handleFormInput()` den vorhandenen Datei-Guard aus `handleFormChange()` vor Metadatenänderung und Debounce spiegeln. Gilt für alle Dateifelder, darunter Balance-, Markt- und Ausgaben-CSV. Normale Depot-/Gold-Eingaben behalten Zeitstempel und Updateverhalten.
- Tests, die bisher `UIRenderer.handleError` für Aktionsfehler ersetzen, auf die neue API und die Bereichseigentümerschaft umstellen; ihre fachlichen Assertions und Fehlerpropagationsprüfungen beibehalten. Keine pauschale Änderung aller Fehlerspies: Berechnungsfehler müssen weiter über `handleError()` nachgewiesen werden.
- Einen echten abgelehnten sowie einen echten zurückgerollten Import mit Renderer im Node-Test ausführen, anschließend einen tatsächlich entprellten Eingabeupdate über die bestehende Main-/Binderverdrahtung auslösen. Anzeige und Recoverytext vor/nach dem Update vergleichen. Die DOM-Fakes müssen echte Nachfahren-Texte und die verwendeten Knopfereignisse korrekt abbilden; keine bloßen Container-Stringkopien als Beleg.
- `createPage()` auch die Aktionsfehlerregion beobachten lassen; im Protokoll keine Schließenbeschriftungen miterfassen. Alle Balance-Leser von `#error-container` prüfen: Berechnungsleser dort belassen, Annual-/Importfehler am neuen Kanal lesen. Simulatorleser bleiben unverändert.
- In `Balance wealth history` und dem vorhandenen Import-Reject-Fall den Fehler nach abgeschlossener Dateiverarbeitung im Protokoll belegen und nach 2 s im sichtbaren Aktionskanal prüfen. Ablehnung und Rollback, offener und geschlossener Verlauf, jeweils ohne neue Datenänderung. Zusätzlich Fehlererhalt über den folgenden instrumentierten Tabwechsel prüfen.
- Die bestehende Idle-Prüfung vor Instrumentierung beibehalten; kein Warten auf eine leere Fehleranzeige einführen. Exakt-null-Prüfungen für Update-/Clear-/Write- und Storageaufrufe sowie State-/Registry-/Exportvergleiche beim Tabwechsel unverändert streng erhalten. Auch ohne das vorbestehende Dateieingabeupdate muss der Registry-Roundtrip weiterhin fachlich korrekt sein; falls dies unerwartet abweicht, nicht durch Datenwrites oder Testlockerung kaschieren, sondern als Vertragsbefund melden.

**Akzeptanzkriterien**

- Im Balance-Quellpfad bleiben JSON-/CSV-Import-, Jahresabschluss- und Snapshotfehler mit unverändertem Wortlaut, Fehlerklassen, Status und Recoveryhinweis nach `clearError()`, normalem und entprelltem `update()` sowie Toastablauf sichtbar. Entsprechende Node-Nachweise verwenden reale Handler und Renderer, nicht ausschließlich spies.
- Ein neuer ausführbarer Vorgang desselben Bereichs entfernt den vorherigen Aktionsfehler; ein Vorgang eines anderen Bereichs, eine leere Dateiauswahl, abgebrochene Bestätigung und eine wegen Reentranz abgewiesene Aktion tun dies nicht. Zwei verschiedene Bereichsfehler bleiben gleichzeitig sichtbar. Schließen entfernt genau den zugehörigen Fehler und löst weder Update noch Speicherzugriff aus.
- File-`input` und File-`change` bewirken über den tatsächlich gebundenen Formlistener null direkte/entprellte Berechnungsaufrufe und keine Änderung von `pendingInputMetadata`. Gewöhnliche Eingaben lösen weiterhin das bisherige Update aus; Depot-/Gold-Zeitstempel bleiben erhalten.
- Ein Berechnungsvalidierungsfehler erzeugt weiterhin seinen bisherigen Text, seine Liste und Feldmarkierungen. Korrigierte Eingaben beseitigen diese beim nächsten echten `update()`; ein gleichzeitig vorhandener Toast und Aktionsfehler bleiben erhalten. Fehler innerhalb einer Aktion werden durch ihre Herkunft richtig zugeordnet, auch wenn sie vom Typ `ValidationError` sind.
- Im Browser-Smoke bleiben ein abgelehnter und ein zurückgerollter Balance-Import nach 2 s im sichtbaren Aktionsfehlerbereich erhalten und zusätzlich im Meldungsprotokoll belegt. Tabwechsel erhalten den Fehler und erfüllen weiterhin exakt null Update-/Clear-/Write-/Storageaufrufe; Daten-, Registry- und Exportprüfungen bleiben bestehen. Die Jahresabschlussprüfungen aus Slice 1 bleiben wirksam.
- Annual-Preflight, `invalid`, `incomplete_recovery`, bestätigter Abschluss trotz anschließendem UI-Fehler, Wiederholungs-No-op, Snapshot-Profilzuordnung, Importrollback und Ausgaben-Recovery behalten ihre vorhandenen fachlichen Regressionstests. `npm test` ist auf diesem Slice-Stand beim Orchestrator grün.

**Fokussierte Validierung**

```bash
node tests/run-single.mjs tests/balance-messages.test.mjs
node tests/run-single.mjs tests/balance-smoke.test.mjs
node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs
node tests/run-single.mjs tests/balance-binder-snapshots.test.mjs
node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs
node tests/run-single.mjs tests/balance-annual-inflation.test.mjs
node tests/run-single.mjs tests/balance-annual-marketdata.test.mjs
node tests/run-single.mjs tests/balance-expenses.test.mjs
node tests/run-single.mjs tests/balance-wealth-history.test.mjs
node --check tests/browser-smoke.test.mjs
```

Falls die Sandbox einen Unterprozess-/Port-/Browserstart verbietet, wird die konkrete nicht ausführbare Prüfung berichtet. Dies ersetzt nicht die volle Orchestrator-Suite und ist gemäß Repositoryregel kein Stoppgrund für diese Browserprüfungen.

### Slice 3 - Anzeigevertrag und Prüfnachweise dokumentieren

**Ziel**

Nutzerhilfe, Architektur, Modulübersicht und Testbeschreibung an das fertig implementierte Balance-Verhalten angleichen.

**Exakter Änderungspfad**

- `Handbuch.html`
- `README.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`

**Umsetzung**

- README und Balance-Abschnitte im Handbuch erläutern sechssekündige Kurzmeldungen sowie Fehler, die bis zum nächsten passenden Vorgang oder Schließen stehen bleiben. Schließen repariert keine Daten und ersetzt keine Recovery. Jahresabschlusszusatz weiterhin nur nach der bestehenden bestätigten Erfassung beschreiben.
- TECHNICAL und Balance-Modulübersicht dokumentieren die drei DOM-/Rendererzuständigkeiten, flüchtigen Meldungszustand, Timeridentität, bereichsbezogene Aktionsfehler und Dateievent-Guard. Die 39 vorhandenen Balance-Module bleiben erhalten; kein neues Fachmodul ist vorgesehen.
- Test-README benennt die neue isolierte Meldungstestdatei, echte Main-/Binderprüfungen, sichtbare Dauerprüfungen und erweitertes Meldungsprotokoll. Den bisherigen pauschalen Satz „Es gibt keine neuen festen Aktionswartezeiten“ für diese ausdrücklich zeitbezogenen Meldungsprüfungen präzisieren: übrige Fach-/Idleprüfungen bleiben zustandsbasiert. Hinweise auf einen 3500-ms-Beispieltimer nicht als aktuelle Produktlaufzeit darstellen.
- Keine alten Suitezahlen als neue Messung ausgeben. Dokumentieren, dass Browsergate und Node-Suite getrennte Nachweise sind und der Browser-Smoke außerhalb der Agentensandbox vor dem Merge durchgeführt wird.

**Akzeptanzkriterien**

- README und Handbuch stimmen am fertigen Quellverhalten bei Toastdauer, nächster passender Nutzeraktion, Schließen und Recoveryhinweisen überein; die vorhandene Regel für `Vermögensstand gesichert.` bleibt richtig beschrieben.
- TECHNICAL und Balance-Modulübersicht beschreiben genau die implementierten Container, APIs und Bereichszuständigkeiten ohne Änderungen an Datenmodell, Engine oder anderen Seiten zu behaupten.
- Test-README beschreibt die tatsächlich implementierten Node- und Browserbelege, insbesondere sichtbare 1-/3-s-Jahresmeldung, 2-s-Importfehler, neue Observerziele und unveränderte strikte Tabwechselinstrumentierung. Es behauptet keinen in der Sandbox ausgeführten Browserlauf.
- Die fünf Dokumente enthalten keine widersprüchliche aktuelle Angabe über den gemeinsamen Toast-/Fehlerkanal oder 3,5-s-Toasts. `npm test` ist auch auf dem finalen Dokumentationsstand beim Orchestrator grün.

**Fokussierte Validierung**

Quervergleich der fünf Dokumente mit den fertigen Slice-1-/Slice-2-Quellen und Assertions; `git diff --check`. Neue Laufzeitmessungen oder zusätzliche Produktänderungen gehören nicht in dieses Dokumentationspaket.

## Gesamtabnahme und Risiken

1. **Node-Gate:** Orchestrator führt nach jedem Umsetzungsslice `npm test` auf genau dessen Stand aus. Keine Snapshotbaselines, Finanzdaten oder Engineergebnisse zur Behebung eines Anzeigeproblems ändern. Neue Tests müssen gezählte Assertions liefern; Testisolation und Cleanup sind verpflichtend.
2. **Browser-Gate vor Merge:** Gesteuerte Sitzung führt `npm run test:browser` außerhalb der Sandbox auf dem final geprüften Branch aus. Für gezielte Fehlersuche sind `node tests/browser-smoke.test.mjs --only='Balance wealth history'` und `node tests/browser-smoke.test.mjs --only='Balance annual commit'` vorgesehen; sie ersetzen nicht das gesamte Browsergate. Sichtbarkeitsprüfungen verwenden echte sichtbare Textbereiche und laufende Timer. Das Protokoll ergänzt diese Prüfungen, ersetzt sie aber nicht.
3. **Leser und Observer:** Neue Typkennzeichnungen und Schließenknöpfe können Textvergleiche verfälschen. Deshalb Originaltext separat lesen und protokollieren; bestehende exakte Jahresmeldung und Einmalzählung beibehalten. Bei mehreren Regionen pro Mutation nur tatsächlich betroffene Meldungen protokollieren, keine Wiederholung unveränderter Meldungen aus einem anderen Kanal erzeugen.
4. **Vergessene Aktionsgrenze:** Alle inventarisierten Aufrufe werden explizit klassifiziert. Ein allgemeines „AppError bleibt stehen“ wäre falsch, weil auch Hintergrundupdates diesen Typ liefern. Verschachtelte Annual-Handler und Reentranz dürfen kein frisch gesetztes Recoveryfeedback entfernen.
5. **Dateievent als versteckte Datenkopplung:** Der entfernte unbeabsichtigte Updatepfad darf keine notwendigen Import-/Registrywirkungen enthalten. Die bestehenden echten Roundtrips und Rollbackvergleiche sind deshalb Pflicht. Bei unerwarteter fachlicher Abweichung gilt `CONTRACT-UNCLEAR`; keine beiläufige Änderung der Speicherlogik.
6. **Umfang:** Die expliziten Pfade enthalten auch nötige Testmock-Anpassungen. Benötigt die Umsetzung darüber hinaus Dateien, ist dies vor Änderung mit `SCOPE-EXTENSION-REQUESTED` zu melden. Fehlende nur vom Operator lieferbare Werkzeuge/Abhängigkeiten ergeben `OPERATOR-PREREQUISITE-MISSING`; keine Installation oder Netzzugriffe in der Sandbox.
7. **Abschluss:** Niemand gibt eigene Arbeit frei. Nach befundfreier Gesamtprüfung bleibt der Zielbranch entsprechend `merge_completed_branch = false` ausgecheckt und ungemergt. Browsergate und anschließender lokaler Merge gehören der gesteuerten Sitzung; dieses Planartefakt behauptet weder eine Umsetzung noch bestandene Produkttests.

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
> Geprüft: Diff enthält nur die neue Datei docs/internal/f-meldungen-sichtbar-arbeitsplan.md im autorisierten Pfad. PLAN_ONLY-Vertrag erfüllt: drei ab 1 nummerierte Slices mit exakten Pfadlisten, Akzeptanzkriterien und Validierungsbefehlen. Abdeckung der Idee: eigener Toast-Bereich (role=status, aria-live=polite, ca. 6000 ms), Timer-/Identitätsschutz, Unterscheidung nicht nur über Farbe, bereichsbezogene dauerhafte Aktionsfehler mit Schließen-Knopf, Validierungsfehler unverändert über handleError/clearError, Datei-Guard in handleFormInput, geforderte Node-Nachweise, Browser-Smoke (1 s/3 s Jahresabschluss, 2 s Reject/Rollback, Observer auf neue Regionen, strenge Tabwechsel-Nullzählung) und die fünf Doku-Dateien in Slice 3. Zwischenstände konsistent: Slice 1 stellt nur Toasts um, Fehlerleser wechseln erst in Slice 2. Attestation internal:work-plan-contract PASS (future_slices=3) passt zum Fingerprint.

Größtes Restrisiko:
> Die Repositorybefunde des Plans (etwa der nicht mehr vorhandene Wartekommentar in runBalanceWealthHistory, TEST_EXECUTION_POLICY in tests/run-tests.mjs, Vollständigkeit der handleError-Inventur in den Slice-2-Pfaden) sind hier nicht verifizierbar, weil der Auftrag auf fünf Read-Aufrufe (Manifest, Request, Diff) begrenzt ist und keine Quelldateien enthält. Der Plan fängt das ab: Slice 2 verlangt die Prüfung aller Leser, fehlende Pfade gehen über SCOPE-EXTENSION-REQUESTED.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn eine nutzerinitiierte handleError-Stelle außerhalb der Slice-2-Allowlist liegt, wenn der Datei-Input-Updatepfad notwendige Registry-Wirkungen trägt oder wenn Slice 1 für die Toast-DOM-Referenz weitere Dateien braucht. Jeder dieser Fälle müsste im Umsetzungsslice als Scope- oder Vertragsbefund auftauchen.

Vorab-Risikoanalyse:
> Falls die Umsetzung scheitert, dann am wahrscheinlichsten in Slice 2: Ein vergessener Aktions-Catch bleibt im Berechnungskanal und wird weiter durch debouncedUpdate geleert. Oder der Wegfall des Datei-Input-Updates verändert unbemerkt den Registry-Roundtrip im Browser-Smoke. Beides adressiert der Plan ausdrücklich durch die Inventurpflicht, Node-Nachweise mit echten Handlern und die Stoppregel CONTRACT-UNCLEAR statt Testlockerung.
<!-- audit:approval:end -->
