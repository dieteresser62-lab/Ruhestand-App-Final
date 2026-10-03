# Arbeitsplan: Vermögensverlauf nur auf Wunsch anzeigen

## Auftrag und Ausführungsgrenze

Zielbranch: `feature/verlauf-auf-wunsch`.
Planungsbasis: `f8f2ce5ec93d622de734f650fd02228b19bc0742`.

Dieser Schritt ist `PLAN_ONLY`: Sein einziges Änderungsziel ist diese Datei. Die folgende Slice beschreibt die spätere Produktumsetzung und ist in diesem Lauf kein ausführbarer Implementierungsauftrag. Produktcode, Tests, Konfiguration, generierte Artefakte und Git-Historie bleiben in diesem Planungsschritt unberührt. Der vorhandene unversionierte Eintrag `.gemini` gehört nicht zum Auftrag.

## Verbindliches Zielverhalten

- Der Bereich startet zugeklappt, auch mit gespeicherten Ständen und vor Abschluss der JavaScript-Initialisierung. Reload und der reale Profilwechsel setzen ihn wieder auf diesen Zustand. Der Aufklappzustand wird weder gespeichert noch exportiert.
- Unter der Bereichsüberschrift stehen zugeklappt nur „Stand jetzt erfassen“, „Verlauf anzeigen“ und bei vorhandenen Einträgen deren Anzahl. Beschreibung, Legende, Leerhinweis, Diagramm und Tabelle gehören in den versteckten Detailbereich. Kurze Erfassungsbestätigungen und Fehler bleiben außerhalb davon zugänglich; sie sind die ausdrücklich geforderte Ausnahme für Rückmeldungen.
- „Verlauf anzeigen“ öffnet die Details und liest den aktuellen gespeicherten Verlauf, ohne Vorschau, Erfassung oder Schreibtransaktion auszulösen. Derselbe Knopf heißt danach „Verlauf ausblenden“ und schließt die Details wieder.
- Erfassen bewahrt den aktuellen Aufklappzustand. Zugeklappt werden nur Anzahl und Rückmeldung aktualisiert; SVG und Tabelle werden dabei nicht erzeugt. Offen werden Diagramm und Tabelle aus der bestätigten aktuellen Datenbasis ersetzt, einschließlich Tagesersetzung und neuer Jahresstände.
- Eine ausgewählte Balance-Importdatei klappt die Ansicht vor Beginn zu und hält sie nach Abschluss zugeklappt. Das gilt auch bei abgelehntem Import oder Rollback; bestehende Daten- und Fehlerverträge bleiben erhalten. Ein Dateidialog ohne ausgewählte Datei bleibt wirkungslos. Profilbundle- und Komplettimporte behalten ihre bestehenden Navigations-/Reloadpfade, deren Rückkehr ebenfalls zugeklappt startet.
- Die kurze Erfolgsmeldung lautet beispielsweise „Stand gesichert“ und erscheint erst nach bestätigter Speicherung. Der automatische Jahresstand erhält ebenfalls eine kurze Bestätigung. Bestehende Meldungen und Ergebnisdialoge des gesamten Jahresprozesses werden dadurch nicht ersetzt.
- Ein leerer Verlauf lässt sich öffnen und zeigt dann den bestehenden erklärenden Leerhinweis. Bei null gespeicherten Einträgen wird außerhalb der Details keine Anzahl benötigt. Fehler werden sichtbar gemeldet und nicht als leere Historie oder erfolgreiche Erfassung ausgegeben.

## Befund aus dem Repository

1. `Balance.html` enthält im Ergebnisbereich bereits `captureWealthBtn`, `wealthHistoryStatus`, `wealthHistoryHint`, Legende sowie die benannten, per Tab erreichbaren Regionen `wealthHistoryChart` und `wealthHistoryTable`. Die Beschreibung und sämtliche Details sind derzeit ständig sichtbar.
2. `app/balance/balance-wealth-history-renderer.js` trennt die reine Darstellung (`renderBalanceWealthHistory`) vom Laden (`refreshBalanceWealthHistory`). Beide Inhalte werden auch bei Legacy- und Fehlerzuständen vollständig ersetzt. `balance-wealth-history-metrics.js` bereitet die Daten unverändernd auf.
3. `app/balance/balance-main.js` sammelt die DOM-Referenzen. Es ruft den Refresh sowohl beim Start als auch zu Beginn jedes `update()` auf. Diese allgemeinen Updates dürfen weder aufklappen noch den Bereich nach einem manuellen Aufklappen wieder schließen.
4. `app/balance/balance-binder.js` verdrahtet die manuelle Erfassung und die beiden Jahresknöpfe. `handleImport()` aktualisiert derzeit im `finally` die Darstellung; Snapshotaktionen besitzen ebenfalls einen Refresh. WeakSet/WeakMap sichern die manuelle Listener-/Controllerbindung bei wiederholter Initialisierung.
5. `createManualWealthHistoryController()` in `balance-wealth-history.js` führt frisches `PREVIEW`, bestätigte Erfassung und Refresh aus. `withAnnual()` aktualisiert abschließend ebenfalls. Die Erfassung selbst ist in `createBalanceWealthHistoryService()` unabhängig von Diagramm und Tabelle organisiert.
6. `balance-binder-snapshots.js` erfasst ab Abschlussjahr 2026 mit `finalizeAnnual()` nach dem erfolgreichen fachlichen Commit. Ein frischer Abschluss und ein Wiederholungs-No-op liefern beide `already_committed`; allein anhand dieses Rückgabestatus darf deshalb keine neue Erfassungsbestätigung abgeleitet werden.
7. Die vorhandenen Tests `balance-wealth-history-chart.test.mjs` und `balance-wealth-history.test.mjs` prüfen Darstellung, Erfassung, Listenerbindung, echte Import-/Rollbackpfade und Fehler. `balance-annual-workflow-contract.test.mjs` schützt den gemeinsamen Jahresprozess. Im Browser-Smoke erwarten die Fälle `Balance wealth history` und `Balance annual commit` bisher die sofort sichtbare Tabelle; ihre Wartepunkte und Tab-Reihenfolge müssen angepasst werden.
8. Nutzerdokumentation steht in `README.md` und `Handbuch.html`; technische Referenzen stehen in `docs/reference/TECHNICAL.md` und `docs/reference/BALANCE_MODULES_README.md`. `tests/README.md` beschreibt die betroffenen Node- und Browsernachweise. `package.json` und `orchestrator.toml` enthalten bereits die erforderlichen Prüfkommandos und das separate Browsergate.

## Umsetzungsentscheidungen und geschützte Verträge

Der Detailbereich erhält eine eigene stabile ID und initial das native `hidden`-Attribut. Der zusätzliche native Button verwendet `type="button"`, `aria-controls` auf diese ID und initial `aria-expanded="false"`. Beschriftung, Sichtbarkeit und ARIA-Zustand werden gemeinsam geändert. Zugeklappte Regionen verschwinden dadurch aus Darstellung, Tab-Reihenfolge und Zugänglichkeitsbaum. Beim Öffnen bleibt der Fokus auf dem Knopf; anschließend sind wie bisher Diagramm und Tabelle per Tab erreichbar. Beim programmatischen Schließen wird ein gegebenenfalls innerhalb der Details liegender Fokus auf den Aufklappknopf zurückgeführt, ohne Fokus außerhalb des Bereichs zu stehlen.

Die Steuerung bleibt im bestehenden Renderer-/Binderzuschnitt; ein neues Modul ist nicht nötig. Der Renderer erhält kleine Initialisierungs-, Umschalt- und Schließhilfen sowie einen Refresh, der den Detailzustand respektiert. `renderBalanceWealthHistory()` kann weiterhin als separat prüfbarer Darstellungsbaustein dienen. Der Refresh validiert auch zugeklappt die geladene Historie, aktualisiert die separate Anzahl und entfernt veraltete Inhalte, erzeugt aber nur bei offener Ansicht SVG und Tabelle. Fehlertexte bleiben als Text außerhalb des versteckten Bereichs sichtbar. Öffnen liest erneut, statt einen früheren Daten-Snapshot wiederzuverwenden. Schließen entfernt Detailinhalte, damit beim nächsten Öffnen ausschließlich aktuelle Daten erscheinen.

`balance-main.js` ergänzt DOM-Referenzen für Umschaltknopf, Detailcontainer und Anzahl. Initialisierung schließt ausdrücklich; reguläre `update()`-Aufrufe erhalten hingegen den Zustand. Der bereits vorhandene reale Profilwechsel über `index.html` und den Balance-Handoff initialisiert die Seite neu. Er wird durch Browserinteraktion geprüft, ohne neue Persistenz- oder Profilwechselmechanismen einzuführen.

Der Binder bindet den zusätzlichen Listener genau einmal, auch nach erneuter Initialisierung. Manuelle Erfassung, `withAnnual()` und Snapshotaktionen verwenden denselben zustandserhaltenden Refresh. Der Balance-Dateiimport schließt bei tatsächlich ausgewählter Datei vor dem ersten asynchronen Schritt und nochmals beim abschließenden Refresh; Importfehler und Rollback bleiben beim bisherigen Importhandler. Eine Rückkehr aus externen Import-/Profilpfaden verwendet den initial geschlossenen Zustand.

Die manuelle Bestätigung wird verkürzt, ihre Position nach Readback bleibt erhalten. Für Jahresstände wird im Snapshothandler ein optionaler UI-Rückruf mit wirkungslosem Standard ergänzt: Er wird ausschließlich im Pfad eines erfolgreich bestätigten `finalizeAnnual()` für Jahre ab 2026 aufgerufen. Der Binder setzt damit die kurze Statusmeldung; das bestehende `withAnnual()` übernimmt den Refresh. Der bestätigte Abschluss wird vor UI-Rückrufen als abgeschlossen markiert, damit ein nachgelagerter Anzeige-/Rückruffehler keine falsche Pending-/Recoverylage erzeugt. No-op, Abbruch, Fehler und Jahre vor 2026 erzeugen keine Meldung über einen neu gesicherten Stand. Aus dem mehrdeutigen `already_committed` wird keine neue Speicherung gefolgert.

Unverändert bleiben insbesondere:

- `wealthHistory: { schemaVersion: 1, entries: [...] }`, Recordidentitäten, lokale Klicktage, Tagesersetzung, nominale Beträge, Summen und Sortierung;
- Profilzuordnung, Readback, transaktionaler State-/Registry-Replace, gemeinsame Sperren, Rollback und Recovery;
- Quelle `result.inputData`, `PREVIEW` bei manueller Erfassung und genau der bestehende Jahrescommit mit Jahreserfassung ab 2026;
- SVG-Titel und Langbeschreibung, Tabellenüberschriften, Anlasskennzeichnung und interne Scrollregionen;
- bestehende Import-, Export-, Snapshot- und Backupformate sowie sämtliche Engineverträge.

`css/balance.css` erhält nur die bei zwei Knöpfen nötige lokale Anordnung mit Umbruch und die Absicherung des versteckten Detailcontainers. Das SVG-Mindestmaß und das interne horizontale Scrollen bleiben erhalten. Weder `engine.js` noch `dist/` werden gebaut oder bearbeitet.

## Geordnete spätere Produktumsetzung

### Slice 1 - Verlauf auf Wunsch mit Regressionstests und Dokumentationsabgleich

**Ziel**

Das vollständige Zielverhalten in einem zusammenhängenden Produktpaket umsetzen, einschließlich der Anpassung bereits betroffener Tests und aller betroffenen Dokumentationsstellen.

**Exakter Änderungspfad**

- `Balance.html`
- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-binder.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history-renderer.js`
- `app/balance/balance-wealth-history.js`
- `css/balance.css`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`

**Arbeitsschritte**

1. In `Balance.html` beide Knöpfe, Anzahl und Rückmeldungen außerhalb des initial versteckten Detailcontainers anordnen. Bestehende Regions-IDs und zugängliche Namen erhalten; Beschreibung, Legende und Leerhinweis in den Detailcontainer verschieben. Die lokalen Styles für Knopfumbruch und verlässliches Verstecken ergänzen.
2. Im Renderer Zustandssteuerung und Anzahl ergänzen. Geschlossene Refreshpfade dürfen keine SVG-/Tabellenaufbereitung auslösen; offene Refreshpfade behalten vollständigen Replace bei gültigem, leerem und fehlerhaftem State. Umschalten liest nur; kein Aufruf der Erfassungs- oder Updatepipeline.
3. DOM-Referenzen und Initialisierung in `balance-main.js` erweitern. Im Binder Umschalten einmalig verdrahten und alle vorhandenen Refreshpfade zusammenführen. Import mit ausgewählter Datei ausdrücklich zuklappen. Snapshot-Restore bei offener Ansicht aktualisiert weiterhin den aktuellen Snapshotstand; er öffnet eine geschlossene Ansicht nicht.
4. Die manuelle Bestätigung verkürzen. Den optionalen Jahres-Rückruf nach bestätigter Finalisierung verdrahten und gegen Wiederholungs-No-op sowie UI-Fehler nach Commit absichern. Keine Änderungen an Schreibkoordination oder Jahresfachlogik durchführen.
5. In den vorhandenen Node-Tests explizite offene/geschlossene DOM-Fakes hinzufügen und bisherige Annahmen über immer sichtbare Import-/Reloadinhalte ersetzen. Tests für Initialzustand, Lesen ohne Writes, Toggle, Anzahl, frische Daten nach Wiederöffnen, offenen/geschlossenen manuellen und jährlichen Refresh, Import/Rollback, Fokus und einmalige Listenerbindung ergänzen. Jahresfehler, Wiederholung und bestätigter Commit mit nachgelagertem UI-Fehler bleiben abgedeckt.
6. Beide vorhandenen Browserfälle um echte Sichtbarkeitsprüfungen vor Erfassung, nach Reload, nach Profilwechsel und nach Import erweitern. Erst nach explizitem Öffnen auf Tabellenzeilen warten. Hin- und Rückschalten darf den gespeicherten Verlauf nicht verändern. Erfassung bei offener Ansicht muss Tagesersetzung und zusätzliche Stände sichtbar aktualisieren. Den kontrollierten Jahresabschluss sowohl geschlossen als auch in einem getrennten, frisch initialisierten offenen Szenario prüfen; keine bloße Wiederholung als Nachweis einer neuen Jahreserfassung verwenden.
7. Browserimport mit gültiger vorhandener Historie zusätzlich zum bisherigen Legacy-Import prüfen, jeweils aus zuvor offener Ansicht. Nach Import müssen die Details geschlossen und die Anzahl aktuell sein; nach explizitem Öffnen müssen ausschließlich die importierten Werte erscheinen. Reale Profilnavigation, Nullstand, Registryabgleich und lokale Datumsprüfung erhalten.
8. Tastaturprüfungen auf die zusätzliche Tabstation anpassen: Erfassen, Aufklappknopf, bei offener Ansicht Diagramm und Tabelle. Enter und Leertaste am Umschaltknopf prüfen; geschlossen dürfen die Detailregionen nicht fokussierbar sein. Bei 375 CSS-Pixeln beide Zustände und Knopfumbruch prüfen; offene Scrollregionen dürfen keinen zusätzlichen Seitenüberlauf erzeugen.
9. Nutzerdoku und technische Referenzen auf den expliziten Anzeigevorgang, die flüchtige Sichtbarkeit, Bestätigungen und die Testabdeckung abgleichen. Bestehende fachliche Angaben zur Erfassung und Speicherung erhalten. Keine Projektregeln oder Build-/Startkommandos ändern.

**Akzeptanzkriterien**

- SOURCE: `Balance.html` versteckt die Details bereits im ausgelieferten Markup. Reale Browserprüfungen belegen den geschlossenen Zustand bei leerem und gefülltem Start, Reload nach vorherigem Öffnen und Profilwechsel in beide Richtungen. Die korrekte Anzahl bleibt bei vorhandenen Ständen sichtbar; kein Sichtbarkeitsflag wird persistiert oder transportiert.
- SOURCE: Der native Umschaltknopf öffnet und schließt per Klick, Enter und Leertaste; Name, `aria-expanded` und `aria-controls` stimmen mit dem tatsächlichen Zustand überein. Node- und Browserprüfungen zeigen dabei unveränderte Verlaufseinträge; der Umschaltpfad löst weder Erfassung noch Engineupdate aus.
- SOURCE: Manuelle Erfassung und ein echter neuer Jahresabschluss bleiben bei geschlossener Ansicht geschlossen, aktualisieren die Anzahl und bestätigen erst nach dauerhaft bestätigter Speicherung kurz. Fehler melden keinen Erfolg. Ein Jahres-No-op und Jahre vor 2026 bestätigen keinen neu erfassten Jahresstand.
- SOURCE: Bei zuvor geöffneter Ansicht erscheinen nach bestätigter manueller Tagesersetzung, einem zusätzlichen manuellen Tag und einem neuen kontrollierten Jahresabschluss die aktuellen Werte in Diagramm und Tabelle. Die Darstellung stimmt mit dem bestätigten IndexedDB-State und der aktiven Registrykopie überein.
- SOURCE: Geschlossene Refreshpfade erzeugen keine SVG- oder Tabelleninhalte. Nach Schließen, zwischenzeitlicher Erfassung und Wiederöffnen wird der dann aktuelle State angezeigt; alte Inhalte aus Legacy-, Fehler- oder Profilzuständen bleiben nicht zurück.
- SOURCE: Gültiger Balance-Import mit Verlauf und Legacy-Import ohne Verlauf schließen eine zuvor offene Ansicht und erhalten den bestehenden Replacevertrag. Ablehnung und erfolgreicher Rollback schließen ebenfalls, bewahren die bisherigen Daten und zeigen weiterhin den Importfehler. Nach erneutem Öffnen wird genau die endgültige Datenbasis dargestellt.
- SOURCE: Bestehende Erfassungs- und Jahresprozessprüfungen bleiben erhalten: frisches `PREVIEW`, lokaler Klicktag, Profilisolation, Sperren, Readback, Recovery, genau ein Jahresrecord und kein zusätzlicher Enginecommit. Nachgelagerte UI-Fehler ändern einen bestätigten Abschluss nicht in einen unvollständigen Abschluss.
- SOURCE: Der geschlossene Detailbereich fehlt aus Tab-Reihenfolge und Zugänglichkeitsbaum; offen sind Diagramm und Tabelle mit den bisherigen Namen, SVG-Beschreibung und Tabellenstrukturen erreichbar. Programmatisches Schließen hinterlässt keinen Fokus im versteckten Bereich. Bei 375 CSS-Pixeln bleiben beide Knöpfe bedienbar und offene Detailregionen scrollen intern ohne zusätzlichen Seitenüberlauf.
- SOURCE: `README.md`, `Handbuch.html`, beide betroffenen Referenzen und `tests/README.md` beschreiben dieselbe Bedienung und dieselben unveränderten Datenverträge wie der implementierte Quellstand.
- SOURCE: Die fokussierten Node-Prüfungen bestehen; der Orchestrator bestätigt am finalen Quellstand ein grünes `npm test` und ein grünes `npm run test:browser`. Ein wegen Sandboxbeschränkungen nicht gestarteter Browserlauf gilt nicht als grüner Browsernachweis.

**Gezielte Validierung während der Umsetzung**

```bash
node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs
node tests/run-single.mjs tests/balance-wealth-history.test.mjs
node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs
node tests/run-single.mjs tests/wealth-history-contract.test.mjs
```

Die unveränderte Datenvertragsprüfung dient hier als Regression für die ausdrücklich geschützte Erfassungssemantik. Weitere gezielte Tests nur bei konkretem Befund nachziehen; keine vollständige Suite durch den Implementierer im orchestrierten Lauf.

Außerhalb der Agentensandbox können die beiden Browserfälle zur Fehlersuche separat laufen:

```bash
node tests/browser-smoke.test.mjs --only='Balance wealth history'
node tests/browser-smoke.test.mjs --only='Balance annual commit'
```

Nach dem Paket führt der Orchestrator die verbindlichen vollständigen Gates aus:

```bash
npm test
npm run test:browser
```

## Risiken und Prüfschwerpunkte

- Ein nach wie vor ungefilterter Refresh in `update()` würde das ursprüngliche Neuzeichnen fortsetzen. Der geschlossene Pfad muss daher an allen bestehenden Aufrufstellen funktionieren; ein CSS-Versteck allein genügt nicht.
- Ein übergreifend gespeichertes Sichtbarkeitsflag würde die Vorgabe nach Reload/Profilwechsel verletzen. Ausschließlich flüchtiger UI-Zustand ist erlaubt.
- Der Import führt intern `PREVIEW`, Replace und abschließendes Update aus. Er darf während dieser Abfolge weder aufklappen noch alte Details anzeigen; abschließender Refresh und Rollback müssen dieselbe Zustandspolitik haben.
- `already_committed` unterscheidet nicht zwischen neuer und zuvor bestehender Finalisierung. Der Erfolgshinweis benötigt den tatsächlichen Finalisierungspfad; eine Statusabfrage alleine wäre falsch.
- Neue UI-Rückrufe nach dem Jahreswrite dürfen den Recoveryvertrag nicht verschieben. Die bestehenden Tests für Renderfehler nach bestätigtem Abschluss sind ausdrücklich zu erhalten und auf die neue Verdrahtung zu erweitern.
- Browsertests mit bisherigen automatischen Tabellen-Wartepunkten würden hängen oder unbemerkt nur verborgene DOM-Inhalte prüfen. Sichtbarkeit und ARIA-Zustand müssen ausdrücklich geprüft werden, nicht nur die Existenz von Zeilen.
- Der zweite Knopf verändert die Tab-Reihenfolge und kann bei schmalen Ansichten umbrechen. Die bisherigen Regions- und Überlaufprüfungen bleiben erhalten und beziehen jetzt beide Zustände ein.

## Abschluss und Berichterstattung

Der Implementierer berichtet später die tatsächlich geänderten Pfade, gezielte Testergebnisse und gegebenenfalls in der Sandbox nicht ausführbare Browserprüfungen. Fehlende externe Werkzeuge oder echte Vertragsmehrdeutigkeit werden nach den geltenden Stoppregeln gemeldet. Zusätzliche erforderliche Änderungspfade außerhalb der obigen Allowlist erfordern eine Scope-Erweiterung, keine stillschweigende Bearbeitung.

Die Planung selbst erfordert keinen Produkt-Testlauf. Vor Freigabe dieses PLAN_ONLY-Schritts wird diese Datei vollständig zurückgelesen und auf nichtleeren Inhalt, kanonische Slice-Struktur, zusammenhängende Nummerierung, exakte Änderungspfade und ausführbare Akzeptanzkriterien geprüft. Der JSON-Beleg dieses Laufs benennt ausschließlich diese Arbeitsplandatei; er führt die spätere Produkt-Slice nicht aus.

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
> Geprüft wurde der Diff. Er legt ausschließlich die neue Datei docs/internal/c-verlauf-auf-wunsch-arbeitsplan.md an und hält damit die Pfadgrenze ein. Geprüfte Dimensionen: (1) Abdeckung aller Nutzeranforderungen: zugeklappt nach Start, Reload, Profilwechsel und Import; Erfassen öffnet nicht; Umschaltknopf öffnet ohne Erfassung und schließt wieder; offene Ansicht zeigt neue Stände; Barrierefreiheit, schmale Ansicht, Nutzerdoku. (2) Slice-Struktur: eine Slice 1 mit exakter Pfadliste, Arbeitsschritten, SOURCE-Akzeptanzkriterien, gezielter Validierung und den Gates npm test sowie npm run test:browser. (3) Fehlerpfade: Import-Ablehnung und Rollback, UI-Fehler nach bestätigtem Jahrescommit, mehrdeutiges already_committed, Fehler nicht als Erfolg. (4) Resume/Idempotenz: einmalige Listenerbindung, kein persistiertes Sichtbarkeitsflag, kein Write beim Umschalten. (5) Die Attestierung internal:work-plan-contract ist PASS und passt zum Fingerprint.

Größtes Restrisiko:
> Die Repository-Befunde des Plans lassen sich aus dem bereitgestellten Diff nicht verifizieren, weil der Lauf auf drei Read-Aufrufe begrenzt war und die Quelldateien deshalb nicht eingesehen wurden. Das betrifft die Refresh-Aufrufstellen in balance-main.js, das finally in handleImport(), den finalizeAnnual-Pfad und die Wartepunkte im Browser-Smoke. Gibt es eine weitere Refresh-Aufrufstelle in einer nicht gelisteten Datei, braucht die Umsetzung eine Scope-Erweiterung; der Plan sieht diesen Weg ausdrücklich vor.

Bruchbedingung:
> Der Plan gilt als widerlegt, wenn ein Refresh- oder Renderpfad außerhalb der 16 gelisteten Pfade Diagramm oder Tabelle automatisch öffnet bzw. erzeugt oder wenn der Profilwechsel die Balance-Seite nicht neu initialisiert. Dann ließe sich die Slice nicht ohne Scope-Erweiterung umsetzen.

Vorab-Risikoanalyse:
> Wahrscheinlichstes Scheitern: In der Umsetzungs-Slice erzeugt ein übersehener Refreshpfad (update(), Snapshot-Restore oder Import-finally) bei geschlossener Ansicht weiterhin SVG und Tabelle, oder der Browser-Smoke wartet weiterhin auf sofort sichtbare Tabellenzeilen. Der Plan begegnet beidem ausdrücklich: Er verlangt einen geschlossenen Pfad an allen Aufrufstellen sowie Sichtbarkeits- und ARIA-Prüfungen statt bloßer DOM-Existenz. Ein zweites Risiko ist eine falsche Jahresbestätigung aus already_committed; der Plan bindet sie an den tatsächlichen finalizeAnnual-Erfolgspfad und an Tests für No-op und UI-Fehler nach dem Commit.
<!-- audit:approval:end -->
