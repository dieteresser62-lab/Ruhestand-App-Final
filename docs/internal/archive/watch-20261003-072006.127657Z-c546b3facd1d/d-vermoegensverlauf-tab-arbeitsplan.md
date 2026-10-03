# Arbeitsplan: Vermögensverlauf als eigener Tab

## Auftrag und Ausführungsgrenze

Zielbranch: `feature/vermoegensverlauf-tab`. Grundlage: `3ca209f190d2d3c91bd778077cf1f92ee5026475`.

Dieser PLAN_ONLY-Schritt erstellt ausschließlich diesen Arbeitsplan. Die folgenden beiden Slices beschreiben eine spätere Produktumsetzung; sie sind keine Ausführungsfreigabe dieses Schritts. Branchtransaktionen, Staging, Commits und Abschlussmerge bleiben beim Orchestrator. Die bereits vorhandene unversionierte Änderung `.gemini` gehört nicht zum Auftrag und bleibt unangetastet.

## Zielbild und unveränderte Verträge

Die Balance-App erhält nach „Ausgaben-Check“ einen vierten Tab „Vermögensverlauf“. Der bisherige Verlaufsabschnitt zieht vollständig aus der rechten Ergebnisspalte in dieses Panel. Dort stehen Erklärtext, Legende, Erfassung, Anzahl, Status, Datum, Diagramm und Tabelle ohne zusätzliche Auf-/Zuklappbedienung. Bei leerer Historie ist der Leerhinweis sichtbar; es müssen keine leeren SVG- oder Tabellenattrappen erzeugt werden.

Allein die Aktivität des Panels entscheidet über die Inhaltserzeugung. Beim Verlassen werden erzeugtes Diagramm und Tabelle entfernt. Inaktive Aktualisierungen lesen und validieren höchstens den Verlauf und aktualisieren seine Metadaten. Öffnen liest den aktuellen gespeicherten State frisch, ohne Engineupdate oder Write. Reload beginnt weiter auf „Jahres-Update“; weder Tabaktivität noch Sichtbarkeit werden gespeichert oder exportiert.

„Zuletzt erfasst am TT.MM.JJJJ“ steht neben „Stand jetzt erfassen“. Maßgeblich ist das größte validierte `asOf` aller gespeicherten Einträge, unabhängig von `reason`, Arrayreihenfolge oder Zeitpunkt des Bedienvorgangs. Die leere Historie zeigt dort exakt „Noch keine Stände erfasst“. Beschädigte Daten dürfen nicht als leere Historie oder als bestätigtes Datum erscheinen; alte Datumstexte und Darstellungen werden entfernt und der bestehende Fehlerpfad bleibt sichtbar. Anzahl und Erfassungsstatus bleiben getrennte Angaben.

Manuelle Erfassung verwendet unverändert den bestehenden Controller mit frischer PREVIEW, lokaler Tagesersetzung, Sperren und bestätigtem State-/Registry-Write. Im aktiven Tab erscheinen erfolgreiche Änderungen sofort und melden „Stand gesichert“. Der Jahresabschluss wechselt keinen Tab. Seine bestehende Abschlusskurzmeldung erhält „Vermögensstand gesichert.“ ausschließlich nach tatsächlicher erfolgreicher Verlaufsfinalisierung.

Unverändert bleiben `wealthHistory` mit SchemaVersion 1, Balance-Import-/Exportversionen, Validierung, Profilzuordnung, Verbundaggregation, Schreibkoordination, Recovery, Jahresabschluss-Erfassung und Engine-Semantik. Ebenso bleiben drei Diagrammgruppen, Alt-/Neu-Depot in der Tabelle, Anlass als Text/Symbol/Rahmen, die Datumsachse ohne interpolierte Zwischenwerte und die zugänglichen SVG-/Tabellennamen erhalten. Keine Änderung an `types/`, Profilpersistenz, `engine/`, `engine.js`, `dist/`, Paketierung oder Projektregeln ist vorgesehen.

## Repositorybefund und Ansatzpunkte

- `Balance.html`: `.tab-buttons` enthält derzeit `update`, `settings`, `ausgaben`; nur `tab-update` ist initial aktiv. Die `.wealth-history`-Section steht in der Ergebnisspalte und enthält `captureWealthBtn`, `toggleWealthHistoryBtn`, `wealthHistoryCount`, `wealthHistoryStatus` und den initial verborgenen `wealthHistoryDetails`-Container.
- `css/balance.css`: `.tab-panel.active` steuert die Panels; `.tab-buttons` hat bisher kein Umbruchverhalten. `.wealth-actions` kann bereits umbrechen, `.wealth-scroll` scrollt intern; der Abschnittsrand und Abstand stammen aus der bisherigen Ergebnisspalte.
- `app/balance/balance-binder.js`: `handleTabClick()` schaltet zentral Klassen um. Capturebindung und Controller existieren schon. `handleImport()` schließt den Verlauf ausdrücklich vor und nach dem Import; diese alte Sichtbarkeitsregel muss durch Refresh des aktuellen Panels ersetzt werden. `handleSnapshotActions()` und der manuelle Controller refreshen bereits.
- `app/balance/balance-main.js`: sammelt Verlaufs-DOM-Referenzen und ruft Initialisierung/Refresh beim Start sowie Refresh am Anfang von `update()` auf. Dieser allgemeine Updatepfad muss bei inaktivem Tab ohne Inhaltserzeugung bleiben.
- `app/balance/balance-wealth-history-renderer.js`: validiert über `readWealthHistory()`, zählt auch geschlossen, erzeugt SVG/Tabelle nur offen und entfernt alte Inhalte bei Refresh/Fehler. `initializeBalanceWealthHistory()`, `toggleBalanceWealthHistory()` und `closeBalanceWealthHistory()` enthalten noch die bisherige Auf-/Zuklapplogik. Das SVG hat getrennte Titel- und Beschreibungsreferenzen; diese Markuperzeugung bleibt erhalten.
- `app/balance/balance-wealth-history-metrics.js`: unverändernde chronologische Projektion mit Jahresabschluss vor manuell bei gleichem Datum. Für den neuen Datumstext genügt ein Maximum der validierten ISO-Stichtage im Renderer, ohne Sortierung/Projektion der Diagrammwerte im inaktiven Panel.
- `app/balance/balance-wealth-history.js`: `capture()` und `withAnnual()` refreshen nach Operationen. `finalizeAnnual()` liefert erst nach transaktionaler Bestätigung zurück; Änderungen an diesem Dienst sind nicht erforderlich.
- `app/balance/balance-binder-snapshots.js`: der READY-Zweig führt ab 2026 `await wealthHistory.finalizeAnnual(...)` aus. Nach dem Abschluss wird `onAnnualWealthSaved()` derzeit durch eine wiederholte Jahresprüfung ausgelöst; der Toast lautet `Ausgaben-Check auf ${nextYear} umgestellt.`. Der `already_committed`-Frühausstieg und die bestehende Absicherung durch `completedResult` bleiben bestehen.
- `tests/balance-wealth-history-chart.test.mjs` prüft Markup, Renderer, bisherige Sichtbarkeit und Barrierefreiheit. `tests/balance-wealth-history.test.mjs` enthält reale Binder-, Import-, Erfassungs-, Finalisierungs- und Fehlertests. `tests/balance-annual-workflow-contract.test.mjs` prüft Reihenfolge und Idempotenz des Abschlusses. Ihre bisherigen Schutzprüfungen werden angepasst und ergänzt.
- `tests/browser-smoke.test.mjs`: `runBalanceWealthHistory()` und `runBalanceAnnualCommitScenario()` benutzen noch Toggle-Helfer und alte Fokusstationen. Vorhandene Helfer `waitForWealthBrowserStartup()`, `waitForBrowserValue()` und die gesammelten `window.__browserSmokeMessages` liefern Zustandsnachweise für die neuen Szenarien.

## Geordnete spätere Umsetzung

### Slice 1 - Eigenen Verlaufstab mit frischer Anzeige und Datum integrieren

**Ziel**

Den gesamten Bedien- und Darstellungsbereich in die bestehende Tabstruktur übertragen, Aktivität als einzige flüchtige Darstellungsbedingung verwenden und alle bisherigen Umschaltprüfungen mit gleichwertigen Tabnachweisen ersetzen.

**Exakter Änderungspfad**

- `Balance.html`
- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history-renderer.js`
- `css/balance.css`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

1. Einen nativen vierten `.tab-btn` mit `data-tab="wealth"`, `type="button"` und dem Text „Vermögensverlauf“ sowie `#tab-wealth.tab-panel` in der linken Tabstruktur ergänzen. Die Section vollständig verschieben, ihre bestehenden Diagramm-, Tabellen-, Status- und Capture-IDs erhalten. `toggleWealthHistoryBtn` entfernen; den Detailcontainer ohne eigenes `hidden` belassen oder als rein strukturellen Container erhalten. Neben Capture eine eigene Textreferenz `wealthHistoryLastCaptured` anlegen. Nur `tab-update` bleibt initial aktiv. Die rechte Spalte verliert ausschließlich den Verlaufsbereich.
2. Die DOM-Referenzen in `balance-main.js` auf Panel und Datum erweitern und die Toggle-Referenz entfernen. Im Renderer die bisherigen Auf-/Zuklappfunktionen durch eine an der tatsächlichen `.active`-Klasse des Panels ausgerichtete Anzeige ersetzen; keine zweite unabhängige Sichtbarkeitsvariable einführen. Interne Exporte und Aufrufer gemeinsam anpassen. Initialisierung und inaktiver Refresh entfernen erzeugte Inhalte; aktiv werden Erklärtext/Legende und aktuelle Darstellung ohne weiteren Klick sichtbar.
3. Validierte Einträge für Anzahl und größtes `asOf` lesen. Datum direkt aus ISO-Komponenten in deutscher Reihenfolge bilden, ohne UTC-/Zeitzonenverschiebung. Nur aktiv `prepareWealthHistoryMetrics()` und SVG-/Tabellenaufbau ausführen. Auch bei leerem, beschädigtem oder neuem State alte Werte vollständig ersetzen. Bestehende Fehlermeldungen und die Trennung von Darstellungsfehlern und Erfassungsstatus erhalten.
4. `handleTabClick()` nach der bisherigen Klassenumschaltung an den Refresh anbinden: Aktivieren liest frisch und zeichnet, Verlassen räumt Diagramm/Tabelle auf. Wiederholtes Öffnen bleibt ohne Engine-, PREVIEW-, PERSIST_INPUTS- oder COMMIT_PERIOD-Aufruf und ohne Schreibzugriff. Die nativen Buttons bleiben über Tab/Enter/Leertaste bedienbar. Verborgene Panelinhalte fehlen aus Fokusreihenfolge und Zugänglichkeitsbaum.
5. Die alte Schließregel in `handleImport()` entfernen. Eine ausgewählte Datei erhält den aktiven Tab; abschließender Refresh zeigt ausschließlich die endgültige erfolgreiche oder zurückgerollte Datenbasis. Keine Dateiauswahl bleibt wirkungslos. Ein gültiger Import ersetzt Datum und aktive Darstellung, Ablehnung/Rollback bewahren das bestätigte Datum, Legacy-Replace zeigt den leeren Zustand. Refresh erfolgt auch inaktiv ohne Zeichnen. Vorherige Capturebestätigungen wie bisher bereinigen. Import-/Export- und Rollbackcode selbst bleibt unverändert.
6. Capture-, allgemeine Update-, Snapshot- und Jahresabschluss-Refreshpfade erhalten. Testen, dass Capture im Verlaufstab sofort aus dem bestätigten State rendert und keinen Tabwechsel auslöst. Der bestehende Reload-/Profilwechselpfad liest Metadaten des jetzt aktiven Profils; dafür ist keine neue Profilpersistenz erforderlich.
7. Tab-Leiste umbrechen lassen und Panel-/Spaltenbreiten so begrenzen, dass bei 375 CSS-Pixeln alle vier Buttons bedienbar sind. Abschnittsabstände auf den neuen Platz abstimmen; Diagramm und Tabelle weiter ausschließlich innerhalb ihrer fokussierbaren Regionen scrollen. Keine CSS-Regel für die alte Detailverbergung als weitere Sichtbarkeitssteuerung stehen lassen.
8. Tests und Browserhelfer auf Panelaktivität umstellen. Auch die Jahresabschluss-Browserszenarien, die bisher „offen/geschlossen“ parametrisieren, auf „Verlaufstab aktiv/inaktiv“ übertragen; die Nachrichtenerweiterung folgt erst in Slice 2. Die gesperrte, nun gegebenenfalls unsichtbare Capturetaste per DOM-Zustand prüfen. Capture nur nach Aktivierung des Verlaufstabs ausführen. Die synthetischen Szenarien zu Daten, Nullständen, Profilverbund, Import/Rollback, Export und Snapshot erhalten.
9. Alle fünf geforderten Dokumente bereits in diesem Slice synchronisieren: neuer Bedienort, sofortige Inhalte im aktiven Tab, Datum nach Stichtag, Starttab, fehlende Sichtbarkeitspersistenz und Renderer-/Binderzuständigkeiten. Veraltete Toggle-API und Beschreibungen der Auf-/Zuklappbedienung ersetzen. Die zusätzliche Jahresabschlusskurzmeldung erst in Slice 2 als umgesetzt beschreiben.

**Akzeptanzkriterien**

- SOURCE: Markup- und Browserprüfungen belegen genau vier Balance-Haupttabs in der bisherigen Reihenfolge, mit „Vermögensverlauf“ an vierter Stelle und genau einem `captureWealthBtn` im neuen Panel. Die rechte Ergebnisspalte enthält weder Verlaufssection noch Capturetaste; Togglebutton und Togglebedienung existieren nicht mehr.
- SOURCE: Start und Reload aktivieren nur „Jahres-Update“. Vor der ersten Aktivierung sowie nach Verlassen und nach beliebigen inaktiven Refreshs enthalten die Verlaufcontainer keine SVG-/Tabelleninhalte. Instrumentierte Rendererprüfungen belegen null Inhaltserzeugung bei inaktivem gefülltem Verlauf; dennoch werden ungültige Historien geprüft. Öffnen zeichnet sofort die aktuelle gefüllte Historie beziehungsweise zeigt einen sichtbaren Leerhinweis.
- SOURCE: Klick, Enter und Leertaste aktivieren den neuen Tab mit der bestehenden Tabmechanik. Instrumentierte Binderprüfungen und Browser-Statevergleiche belegen, dass Aktivieren/Verlassen weder Erfassung noch Engineupdate, Fehlerbereinigung oder Persistenz auslösen. Wiederholte Initialisierung bindet die Captureaktion weiter genau einmal.
- SOURCE: Manuelle Erfassung im aktiven Panel aktualisiert Diagramm, Tabellenzeilen, Anzahl und Datum unmittelbar nach Bestätigung, meldet „Stand gesichert“ und lässt den Tab aktiv. Tagesersetzung und Ergänzung an einem anderen lokalen Tag bleiben erhalten; ein Speicher-/Readbackfehler bestätigt nichts und erhält die bisher gültige Datenbasis.
- SOURCE: Der Datumstext ist exakt „Zuletzt erfasst am TT.MM.JJJJ“ für das größte gespeicherte `asOf`, auch bei unsortierten Einträgen, einem jüngeren Jahresabschluss gegenüber einem älteren manuellen Stand und gleichem Stichtag mit zwei Anlässen. Eine spätere Bedienung mit älterem Stichtag verringert die Anzeige nicht. Fehlende/leere Historie zeigt exakt „Noch keine Stände erfasst“; beschädigte Historie lässt keinen alten oder erfundenen Datumstext stehen.
- SOURCE: Reale Binder- und Browserprüfungen decken gültigen Import, abgelehnten Import, Legacy-Replace und Rollback jeweils bei aktivem und inaktivem Verlaufstab ab. Datum und aktive Darstellung entsprechen anschließend dem tatsächlich bestätigten State, ohne Tabwechsel; inaktiv wird nicht gezeichnet. Profilwechsel und Reload zeigen danach ausschließlich das richtige Profildatum beziehungsweise den leeren Zustand.
- SOURCE: State, aktive Registrykopie und Balance-Export enthalten kein neues Tab-/Sichtbarkeitsfeld. Nach Startpersistenz verglichene bestehende Fachzustände bleiben durch Tabwechsel unverändert. Die bisherigen Import-, Export-, Profilisolation-, Verbund-, Recovery- und Erfassungstests behalten ihren fachlichen Umfang.
- SOURCE: SVG-Titel „Vermögensverlauf in nominalen Euro“ und separate Beschreibung, Tabellencaption, Gruppen, Teildepots, Anlassdarstellung und Datumsachse sind unverändert belegt. Fokus gelangt im aktiven Tab von Capture in die beiden scrollbaren Regionen; inaktive Regionen sind nicht fokussierbar. Bei 375 CSS-Pixeln gibt es keinen seitenweiten horizontalen Überlauf, alle vier Tabs sind erreichbar und interne Diagramm-/Tabellenscrollbereiche funktionieren.
- SOURCE: Die bisherigen Prüfungen für initial geschlossenes Markup, Umschaltname/ARIA, frisches Wiederöffnen, keine Erzeugung geschlossen, geschlossene Imports und Fokus-Rückführung sind ausdrücklich durch Initialtab-, Aktivierungs-, Deaktivierungs-, Import-im-aktuellen-Tab- und Fokusprüfungen ersetzt. Die fünf Dokumente beschreiben diese neue Bedienung konsistent. Die gezielten Tests sowie beide Orchestrator-Gates bestehen.

**Gezielte Validierung**

- `node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs`
- `node tests/run-single.mjs tests/balance-wealth-history.test.mjs`
- `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`
- `node tests/run-single.mjs tests/balance-smoke.test.mjs`
- `node tests/run-single.mjs tests/wealth-history-contract.test.mjs`

Der Orchestrator führt danach außerhalb der Sandbox `npm test` und `npm run test:browser` aus. Insbesondere „Balance wealth history“ und die Jahresabschlussfälle müssen mit den neuen Aktivierungshelfern bestehen.

### Slice 2 - Jahresabschlussmeldung an bestätigte Finalisierung binden

**Ziel**

Die Abschlusskurzmeldung ausschließlich nach einem neuen dauerhaft bestätigten Jahresstand erweitern, ohne die automatische Erfassung, Idempotenz oder Tabaktivität zu verändern, und den gesamten Bedienweg abschließend absichern.

**Exakter Änderungspfad**

- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder-snapshots.js`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

1. Pro `handleJahresabschluss()`-Aufruf ein lokales zunächst falsches Bestätigungsflag anlegen. Es ausschließlich direkt nach erfolgreich zurückgekehrtem `await wealthHistory.finalizeAnnual(...)` im tatsächlich ausgeführten Finalisierungszweig setzen. Den vorhandenen Jahresfilter für die Erfassung selbst unverändert lassen. Keine erneute Jahresschwelle für Rückruf oder Meldung verwenden und kein Flag persistieren.
2. `onAnnualWealthSaved()` und den Zusatz des bestehenden Abschluss-Toasts aus diesem Flag ableiten. Der bestätigte Verlaufszweig meldet `Ausgaben-Check auf ${nextYear} umgestellt. Vermögensstand gesichert.`; der übrige erfolgreiche Zweig behält seine bisherige Kurzmeldung. Der No-op-Frühausstieg erzeugt keine neue Erfassungsbestätigung. Keine Aktivierung des Verlaufstabs ergänzen.
3. `completedResult` weiter vor UI-Rückrufen setzen, damit Rückruf-/Renderfehler nach bestätigter Finalisierung keinen unvollständigen Jahresabschluss oder neue Recovery behaupten. Den bestehenden Meldungs-/Fehlerablauf darüber hinaus nicht umbauen. Ausstehendes Flush/Readback darf weder Rückruf noch ergänzten Erfolgstoast auslösen; gescheiterte Finalisierung bleibt Recovery ohne den Zusatz.
4. Bestehende Jahres- und Diensttests um einen neuen Abschluss 2026, blockiertes Readback, No-op, erfolgreichen Abschluss 2025, Finalisierungsfehler und UI-Fehler nach bestätigtem Commit ergänzen. Bei Wiederholungen nur neu hinzugekommene Meldungen auswerten, damit ein früherer Erfolg nicht irrtümlich dem No-op zugeschrieben wird.
5. Browsernachweis für neuen Abschluss 2026 auf „Jahres-Update“ und bei bereits aktivem Verlaufstab durchführen. Vorher-/Nachher-Aktivität vergleichen; bei inaktivem Verlauf keine Erzeugung, nach späterem Öffnen korrektes Datum `31.12.2026`, bei aktivem Verlauf sofortiger Refresh. No-op über denselben abgeschlossenen Zeitraum prüfen, ohne neuen Stand, Snapshot oder Zusatz. Die fünf Dokumente um die tatsächlich bestätigte Kurzmeldung und ihren Geltungsbereich ergänzen.

**Akzeptanzkriterien**

- SOURCE: Ein neuer bestätigter Abschluss 2026 erfasst weiterhin genau einen unveränderten `annual:2026`-Record samt periodengebundenem Commit und Registrybestätigung; die Abschlusskurzmeldung enthält zusätzlich exakt „Vermögensstand gesichert.“. Rückruf und Zusatz hängen am ausgeführten bestätigten Finalisierungszweig, ohne wiederholte Jahresschwelle.
- SOURCE: Während kontrolliert blockierter dauerhafter Bestätigung und bei Write-/Flush-/Readback-/Kontextfehlern erscheint kein ergänzter Erfolgstoast und kein Erfassungsrückruf. Die vorhandenen Recovery-/Rollbackverträge bleiben erfüllt; ein UI-Fehler nach bestätigtem Abschluss macht den fachlich abgeschlossenen Commit nicht wieder unvollständig.
- SOURCE: Ein fachlicher `already_committed`-No-op meldet den Zusatz nicht, verändert Verlauf und Datum nicht und erzeugt keinen weiteren Snapshot oder Engine-Commit. Ein tatsächlich neu erfolgreich abgeschlossener Zeitraum vor 2026 meldet den Zusatz ebenfalls nicht und erzeugt keinen Jahresstand.
- SOURCE: Der neue Abschluss 2026 bleibt auf dem zuvor aktiven „Jahres-Update“; beim separat geprüften bereits aktiven Verlaufstab bleibt auch dieser aktiv und aktualisiert sofort Tabelle/Diagramm/Datum. Inaktiv bleibt der Verlauf ungezeichnet und zeigt nach Aktivierung das bestätigte jüngste Stichtagsdatum. Reload startet anschließend wieder auf „Jahres-Update“.
- SOURCE: Beide gezielten Jahrestestdateien, die Verlaufsrenderertests, `npm test` und `npm run test:browser` bestehen auf dem fertigen Stand. README, Handbuch und beide technischen Referenzen sowie die Testdokumentation stimmen zu Tabbedienung, Datum und bestätigter Abschlusskurzmeldung überein; kein flüchtiges Bestätigungsflag gelangt in Speicherung oder Export.

**Gezielte Validierung**

- `node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs`
- `node tests/run-single.mjs tests/balance-wealth-history.test.mjs`
- `node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs`

Anschließend führt allein der Orchestrator `npm test` und `npm run test:browser` außerhalb der Sandbox auf demselben fertigen Stand aus. Keine pauschale Grünbehauptung bei lediglich gezielten Agentenprüfungen.

## Browsernachweise und Übertragung bisheriger Prüflogik

Die vorhandenen Browserfälle bleiben erhalten; nur der Bedienvertrag wird übertragen. Toggle-Helfer werden zu Tabaktivierungs-/Deaktivierungshelfern. Ihre Statevergleiche behalten die Prüfung auf fehlende neue Persistenzschlüssel und unveränderte `wealthHistory`, `lastState` und `balanceStateLifecycle`. Die Tabelle wird weiterhin gegen gespeicherte Werte und die Registrykopie geprüft. Vor-JavaScript-Markupprüfungen belegen den initialen Jahres-Update-Tab und das inaktive Verlaufspanel.

Start und Reload mit `waitForWealthBrowserStartup()` absichern; nach Profilwechsel ebenfalls auf die Haushalts-Startpersistenz warten. Registrykopien nach Import mit `waitForBrowserValue()` gegen die erwartete endgültige Historie abgleichen, statt direkt nach der Dateiauswahl zu lesen. Importfehler und Erfolgstoasts über `window.__browserSmokeMessages` nachweisen; pro Aktion einen Nachrichtenindex vorab erfassen und nur spätere Meldungen auswerten. Dateifeldreset, endgültige Historie, Tabellenzeilen, Datum, wieder entsperrte Controls und Periodenmetadaten sind beobachtbare Abschlussbedingungen.

Keine neuen festen Verzögerungen für diese Synchronisation verwenden. Vor Geometrieprüfungen die laufenden relevanten `getAnimations()`-Animationen/Transitionen abwarten und das Layout dann messen. Die bisherige zeitbasierte `clearError()`-Prüfung beim Umschalten durch instrumentierte Update-/Fehlerbereinigungs- und Schreibzähler sowie einen beobachtbaren Abschluss ausstehender Updates übertragen. So bleiben Tabwechsel als reine Anzeigeaktion geprüft, ohne einen flüchtigen Fehlercontainer zur Nachrichtenquelle zu machen.

## Risiken und Abbruchgrenzen

- Ein vergessenes `closeBalanceWealthHistory()` im Import oder ein verbliebenes `details.hidden` als Renderbedingung würde aktive Darstellung verhindern. Aufrufer und bestehende Tests gemeinsam migrieren; auf alten Toggle-Code und veraltete aktive Dokumentbeschreibungen prüfen.
- Der allgemeine `update()`-Refresh darf den Verlaufsgraphen bei inaktivem Panel nicht erzeugen. Initialisierung, Inputupdates, Import und Abschluss deshalb separat mit Inhaltserzeugungszählern und DOM-Nachweisen prüfen.
- Das letzte Arrayelement ist nicht zwingend der jüngste Stand. Das Datum ausschließlich aus validiertem maximalem `asOf` bestimmen; keine Capturezeit oder neues persistiertes Metadatum einführen.
- Das vierte Tablabel und breite SVG-/Tabelleninhalte können horizontales Seitenoverflow verursachen. Breite/Fokus/Scrollbarkeit bei 375 CSS-Pixeln nach Transitionende im echten Browser prüfen.
- Ein Erfolgsflag vor Readback würde dauerhafte Speicherung behaupten; ein wiederverwendetes Flag würde den No-op falsch bestätigen. Lokal pro Aufruf halten und nur nach erfolgreichem Await setzen; verzögertes und gescheitertes Readback testen.
- Die genannten Scopepfade sind exakte spätere Änderungsgrenzen. Wird eine weitere Produktdatei notwendig, vor der Änderung `SCOPE-EXTENSION-REQUESTED` melden. Bei echter Vertragsmehrdeutigkeit `CONTRACT-UNCLEAR`; fehlt eine nur vom Operator bereitstellbare Voraussetzung, `OPERATOR-PREREQUISITE-MISSING`. Keine Engine-/Persistenzvertragsänderung als Nebenarbeit.

## Validierungszuständigkeit und Planabschluss

Dieser Planungsschritt baut nichts und verändert keine Produkt-, Test- oder Konfigurationsdatei. Seine Prüfung besteht aus Repositoryabgleich und erneutem Lesen dieser vollständigen, nicht leeren Plandatei, einschließlich zusammenhängender Slice-Nummern, exakter Pfadlisten und einzeln formulierter SOURCE-Kriterien.

In der späteren Umsetzung darf der Implementierer gezielte `run-single`-Läufe ausführen. Volle Suite und Browser-Smoke liegen gemäß Repositoryregeln beim Orchestrator; blockierte Server-, Browser- oder Unterprozessstarts in der Agentensandbox werden als dort nicht ausführbar dokumentiert und sind kein Produktbefund und kein Stoppgrund. Die Abnahme verlangt beide grünen Orchestrator-Gates; ein Plan oder eine erfolgreiche Teilprüfung ersetzt sie nicht.

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
> Geprüft: Pfadgrenze (Diff enthält ausschließlich die neue Datei docs/internal/d-vermoegensverlauf-tab-arbeitsplan.md, passend zu authorized_paths und Attestation changed_paths=1); PLAN_ONLY-Artefaktvertrag (Datei nicht leer, zwei fortlaufend ab 1 nummerierte spätere Slices mit exakten Pfadlisten, Umsetzungsschritten, SOURCE-Akzeptanzkriterien, gezielten run-single-Läufen, Browsernachweisen und Doku-Sync aller fünf geforderten Dokumente); Abdeckung der Nutzeridee (vierter Tab, Entfernen aus Ergebnisspalte, kein Toggle, Rendering nur bei aktivem Tab, Capture nur im Tab, Datum nach max. asOf inkl. Leertext, Import gültig/abgelehnt/Legacy, Profilwechsel, Reload auf Jahres-Update, keine Tab-Persistenz, Jahresabschluss-Zusatz per Flag aus ausgeführtem Finalisierungszweig, kein No-op/vor 2026, kein Tabwechsel, 375-px-Ansicht, Barrierefreiheit, Ersatz der Toggle-Tests); Fehlerpfade (Readback blockiert/gescheitert, UI-Fehler nach Commit, Rollback); Idempotenz (Flag lokal pro Aufruf, nicht persistiert; already_committed-Frühausstieg unverändert); Browser-Smoke-Hinweise (waitForWealthBrowserStartup, waitForBrowserValue, __browserSmokeMessages mit Index, getAnimations, keine festen Delays).

Größtes Restrisiko:
> Ob Slice 1 ohne weitere Dateien auskommt (z. B. ob balance-binder-snapshots.js oder tests/balance-annual-workflow-contract.test.mjs bereits Toggle-/close-Funktionen des Renderers referenzieren), ist aus diesem Snapshot nicht entscheidbar, weil der Review-Kontext nur den Plan-Diff und keine Produktquellen enthält; der Plan sieht dafür ausdrücklich SCOPE-EXTENSION-REQUESTED vor.

Bruchbedingung:
> Der Plan wäre zu verwerfen, wenn Slice 1 nach Entfernen von closeBalanceWealthHistory()/toggleBalanceWealthHistory() einen Aufrufer außerhalb seiner Pfadliste brechen würde und der Implementierer statt eines Scope-Stopps stillschweigend weitere Dateien ändert, oder wenn sich das Bestätigungsflag in Slice 2 doch an eine Jahresschwelle statt an das erfolgreich zurückgekehrte finalizeAnnual() bindet.

Vorab-Risikoanalyse:
> Wahrscheinlichstes Scheitern: Im Browser-Smoke bleiben Zeitprobleme bestehen, weil der Verlaufstab-Refresh nach Import über das entprellte update() erfolgt und Prüfungen zu früh Tabelle/Datum lesen; der Plan fordert hierfür beobachtbare Abschlussbedingungen und Nachrichtenindizes. Zweites Risiko: Ein vergessener Aufrufer der alten Toggle-API außerhalb der Slice-1-Pfade führt zu einem Laufzeitfehler; abgefangen durch die Scope-Stop-Regel und gezielte Suche nach altem Toggle-Code. Drittes Risiko: Die schmale Ansicht läuft durch das vierte Tablabel über; der Plan verlangt Messung nach Transitionende bei 375 CSS-Pixeln.
<!-- audit:approval:end -->
