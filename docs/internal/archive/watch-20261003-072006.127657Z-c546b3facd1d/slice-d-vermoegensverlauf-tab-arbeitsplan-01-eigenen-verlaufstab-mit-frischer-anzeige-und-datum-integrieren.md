# Slice 1 von 2 – Eigenen Verlaufstab mit frischer Anzeige und Datum integrieren

<!-- audit:status:begin -->
In Arbeit · Runde 2
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Den gesamten Bedien- und Darstellungsbereich in die bestehende Tabstruktur übertragen, Aktivität als einzige flüchtige Darstellungsbedingung verwenden und alle bisherigen Umschaltprüfungen mit gleichwertigen Tabnachweisen ersetzen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Markup- und Browserprüfungen belegen genau vier Balance-Haupttabs in der bisherigen Reihenfolge, mit „Vermögensverlauf“ an vierter Stelle und genau einem `captureWealthBtn` im neuen Panel. Die rechte Ergebnisspalte enthält weder Verlaufssection noch Capturetaste; Togglebutton und Togglebedienung existieren nicht mehr.
- SOURCE: Start und Reload aktivieren nur „Jahres-Update“. Vor der ersten Aktivierung sowie nach Verlassen und nach beliebigen inaktiven Refreshs enthalten die Verlaufcontainer keine SVG-/Tabelleninhalte. Instrumentierte Rendererprüfungen belegen null Inhaltserzeugung bei inaktivem gefülltem Verlauf; dennoch werden ungültige Historien geprüft. Öffnen zeichnet sofort die aktuelle gefüllte Historie beziehungsweise zeigt einen sichtbaren Leerhinweis.
- SOURCE: Klick, Enter und Leertaste aktivieren den neuen Tab mit der bestehenden Tabmechanik. Instrumentierte Binderprüfungen und Browser-Statevergleiche belegen, dass Aktivieren/Verlassen weder Erfassung noch Engineupdate, Fehlerbereinigung oder Persistenz auslösen. Wiederholte Initialisierung bindet die Captureaktion weiter genau einmal.
- SOURCE: Manuelle Erfassung im aktiven Panel aktualisiert Diagramm, Tabellenzeilen, Anzahl und Datum unmittelbar nach Bestätigung, meldet „Stand gesichert“ und lässt den Tab aktiv. Tagesersetzung und Ergänzung an einem anderen lokalen Tag bleiben erhalten; ein Speicher-/Readbackfehler bestätigt nichts und erhält die bisher gültige Datenbasis.
- SOURCE: Der Datumstext ist exakt „Zuletzt erfasst am TT.MM.JJJJ“ für das größte gespeicherte `asOf`, auch bei unsortierten Einträgen, einem jüngeren Jahresabschluss gegenüber einem älteren manuellen Stand und gleichem Stichtag mit zwei Anlässen. Eine spätere Bedienung mit älterem Stichtag verringert die Anzeige nicht. Fehlende/leere Historie zeigt exakt „Noch keine Stände erfasst“; beschädigte Historie lässt keinen alten oder erfundenen Datumstext stehen.
- SOURCE: Reale Binder- und Browserprüfungen decken gültigen Import, abgelehnten Import, Legacy-Replace und Rollback jeweils bei aktivem und inaktivem Verlaufstab ab. Datum und aktive Darstellung entsprechen anschließend dem tatsächlich bestätigten State, ohne Tabwechsel; inaktiv wird nicht gezeichnet. Profilwechsel und Reload zeigen danach ausschließlich das richtige Profildatum beziehungsweise den leeren Zustand.
- SOURCE: State, aktive Registrykopie und Balance-Export enthalten kein neues Tab-/Sichtbarkeitsfeld. Nach Startpersistenz verglichene bestehende Fachzustände bleiben durch Tabwechsel unverändert. Die bisherigen Import-, Export-, Profilisolation-, Verbund-, Recovery- und Erfassungstests behalten ihren fachlichen Umfang.
- SOURCE: SVG-Titel „Vermögensverlauf in nominalen Euro“ und separate Beschreibung, Tabellencaption, Gruppen, Teildepots, Anlassdarstellung und Datumsachse sind unverändert belegt. Fokus gelangt im aktiven Tab von Capture in die beiden scrollbaren Regionen; inaktive Regionen sind nicht fokussierbar. Bei 375 CSS-Pixeln gibt es keinen seitenweiten horizontalen Überlauf, alle vier Tabs sind erreichbar und interne Diagramm-/Tabellenscrollbereiche funktionieren.
- SOURCE: Die bisherigen Prüfungen für initial geschlossenes Markup, Umschaltname/ARIA, frisches Wiederöffnen, keine Erzeugung geschlossen, geschlossene Imports und Fokus-Rückführung sind ausdrücklich durch Initialtab-, Aktivierungs-, Deaktivierungs-, Import-im-aktuellen-Tab- und Fokusprüfungen ersetzt. Die fünf Dokumente beschreiben diese neue Bedienung konsistent. Die gezielten Tests sowie beide Orchestrator-Gates bestehen.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Balance.html`
- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history-renderer.js`
- `css/balance.css`
- `docs/internal/d-vermoegensverlauf-tab-implement-review-3cd00aa7.md`
- `docs/internal/slice-d-vermoegensverlauf-tab-arbeitsplan-01-eigenen-verlaufstab-mit-frischer-anzeige-und-datum-integrieren.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Den gesamten Verlauf einschließlich Capturetaste in `tab-wealth` als vierten Haupttab übertragen; die rechte Ergebnisspalte enthält keinen Verlauf mehr. Togglebutton, Toggle-API und separate hidden-Steuerung entfernt.
> - Renderer an die bestehende DOM-Tabaktivität gebunden: inaktiv validieren/zählen/datieren, aber keine SVG-/Tabelleninhalte erzeugen; Aktivierung liest frisch, Deaktivierung leert Inhalte. `wealthHistoryDate` zeigt das maximale validierte `asOf`, exakt formatiert beziehungsweise den Leertext; Beschädigungen entfernen alte Datumsangaben.
> - Binder frischt nach reinem Tabwechsel die Anzeige auf, ohne Engineupdate, Erfassung, globale Fehlerbereinigung oder Write. Import erhält den aktiven Tab und aktualisiert abschließend die tatsächlich bestätigte Datenbasis bei Erfolg, Ablehnung, Legacy-Replace und Rollback. Capture und Tablistener bleiben bei erneuter Initialisierung einmal gebunden.
> - Responsive CSS lässt die vier Tabs und den Seitenkopf umbrechen, hält die Formularspalte schrumpfbar und verhindert auf schmalen Seiten zusätzlichen Scrollraum durch den geschlossenen Diagnose-Drawer. Diagramm und Tabelle behalten ihre internen Scrollbereiche und die direkte Fokusfolge ab Capture.
> - Bestehende Toggleprüfungen durch gleichwertige Initialtab-, Aktivierungs-/Deaktivierungs-, Import- und Fokusprüfungen ersetzt. Renderer-/Binderprüfungen instrumentieren Inhaltserzeugung, Updates und Fehlerbereinigung; Browserprüfungen vergleichen zusätzlich Fachzustand, Registry und Export. Browserimporte laufen jeweils aktiv und inaktiv; Meldungen werden anhand neuer Nachrichten, ausstehende Inputupdates anhand abgeschlossener Timer und Layouts nach Animationsende geprüft.
> - README, Handbuch, technische Referenz, Balance-Modulreferenz und Testdokumentation synchronisiert. Fachliche Speicher-, Profil-, Verbund-, Recovery-, Erfassungs- und Jahresverträge bleiben unverändert; die Jahresabschluss-Toast-Erweiterung gehört weiterhin ausschließlich zu Slice 2.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün, rot · Prüfurteil abgelehnt · 1 neu, 0 geschlossen.
- Runde 2: Korrektur · Validierung grün, rot · Prüfurteil abgelehnt · 0 neu, 0 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
### R-01 – Das verpflichtende Browsergate `npm run test:browser` schlägt in der fingerprintgebundenen Validierung…

Klasse: Blocker · Stand: eskaliert

Befund:
> Das verpflichtende Browsergate `npm run test:browser` schlägt in der fingerprintgebundenen Validierung (validation-[Hash ausgelassen], Fingerprint [Hash ausgelassen]…) in beiden Läufen reproduzierbar fehl: Szenario `Balance wealth history`, `activateWealthBrowserTab` (tests/browser-smoke.test.mjs:878), aufgerufen aus `runBalanceWealthHistory` Zeile 1018. Das ist laut Diff die Aktivierung des Verlaufstabs direkt nach `page.reload()` + `waitForWealthBrowserStartup()` + `assertWealthBrowserVisibility(page, false, 1)`. Gemessen: `Tabwechsel ohne Update/Fehlerbereinigung/Write: {"updates":2,"clears":1,"writes":2}`. Damit ist das Slice-Kriterium „Instrumentierte Binderprüfungen und Browser-Statevergleiche belegen, dass Aktivieren/Verlassen weder Erfassung noch Engineupdate, Fehlerbereinigung oder Persistenz auslösen … beide Orchestrator-Gates bestehen“ nicht erfüllt. Aus dem Snapshot ist nicht entscheidbar, ob ein Produktfehler vorliegt (Tabaktivierung nach Reload stößt `UIReader.readAllInputs`/`clearError`/`setItem` an) oder ein Wettlauf im Test: `waitForWealthBrowserIdle` installiert den `setTimeout`-Hook erst lazy nach dem Reload, sodass ein vor der Installation geplantes entprelltes 250-ms-Update aus Start/Profilverbund-Persistenz nicht in `__wealthPendingUpdates` erfasst wird und genau im Zählfenster feuert. Die Vorher-Aktivierungen im selben Szenario vor dem Reload bestanden, was auf den Startpfad nach Reload hindeutet. Ursache feststellen und beheben, ohne die Zählerprüfung abzuschwächen.

Akzeptanztest:
> Die Ursache der Zähler updates=2/clears=1/writes=2 nach Reload ist benannt. Liegt sie im Produkt, löst `UIBinder.handleTabClick()` bzw. die Tabaktivierung nach Reload nachweislich keine `readAllInputs`-, `clearError`- oder `persistenceStorage.setItem`-Aufrufe mehr aus. Liegt sie im Test, erfasst die Idle-Beobachtung auch vor Hookinstallation geplante Startupdates (z. B. Hook per `addInitScript` vor Seitenskripten installieren), ohne die Nullzählung im Aktivierungsfenster aufzuweichen oder feste Schlafzeiten einzuführen. `npm test` und `npm run test:browser` bestehen beide auf dem neuen Fingerprint.

Antwort des Implementierers, Runde 2 (angenommen):
> Der lazy installierte Timer-Hook übersah den beim Start durch die Tranchen-Synchronisierung geplanten 250-ms-Update. Nach Reload erfüllten bereits gespeicherte Haushaltsdaten den Startupcheck vor dessen Abschluss. Der Hook wird jetzt per context.addInitScript vor den Seitenskripten installiert, einschließlich Reload und Profilnavigation. Die Nullzählung bleibt unverändert. Regressionstests bestehen: 358 und 149 Assertions; Syntax- und Diffprüfung ebenfalls grün. npm run test:browser scheitert in der Sandbox am Serverstart mit listen EPERM. Beide Gesamtgates bleiben durch den Orchestrator auf dem neuen Fingerprint auszuführen; npm test wurde hier gemäß Laufregeln nicht gestartet.

Eskalation zum Blocker:
> The reviewer did not close the Finding; it is escalated to BLOCKER.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.

- Runde 1: `npm run test:browser` · rot · Exitcode 1.

```
> node tests/browser-smoke.test.mjs

Running browser smoke: index.html
Browser smoke passed: index.html
Running browser smoke: full backup recovery
Browser smoke passed: full backup recovery
Running browser smoke: Balance.html
Browser smoke passed: Balance.html
Running browser smoke: Balance membership reload
Browser smoke passed: Balance membership reload
Running browser smoke: Balance wealth history
Browser smoke failed:
Error: Tabw
...[13 characters omitted]...
pdate/Fehlerbereinigung/Write: {"updates":2,"clears":1,"writes":2}
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at activateWealthBrowserTab (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:878:9)
    at async runBalanceWealthHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:1018:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3598:13)
=== validation run 2/2: FAIL (exit=1) ===
> ruhestand-app-final@1.0.0 test:browser
> node tests/browser-smoke.test.mjs

Running browser smoke: index.html
Browser smoke passed: index.html
Running browser smoke: full backup recovery
Browser smoke passed: full backup recovery
Running browser smoke: Balance.html
Browser smoke passed: Balance.html
Running browser smoke: Balance membership reload
Browser smoke passed: Balance membership reload
Running browser smoke: Balance wealth history
Browser smoke failed:
Error: Tab
...[14 characters omitted]...
pdate/Fehlerbereinigung/Write: {"updates":2,"clears":1,"writes":2}
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at activateWealthBrowserTab (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:878:9)
    at async runBalanceWealthHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:1018:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3598:13)
```

- Runde 2: `npm test` · grün · Exitcode 0.

- Runde 2: `npm run test:browser` · rot · Exitcode 1.

```
> node tests/browser-smoke.test.mjs

Running browser smoke: index.html
Browser smoke passed: index.html
Running browser smoke: full backup recovery
Browser smoke passed: full backup recovery
Running browser smoke: Balance.html
Browser smoke passed: Balance.html
Running browser smoke: Balance membership reload
Browser smoke passed: Balance membership reload
Running browser smoke: Balance wealth history
Browser smoke failed:
Error: Tabw
...[13 characters omitted]...
pdate/Fehlerbereinigung/Write: {"updates":2,"clears":1,"writes":2}
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at activateWealthBrowserTab (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:885:9)
    at async runBalanceWealthHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:1016:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3607:13)
=== validation run 2/2: FAIL (exit=1) ===
> ruhestand-app-final@1.0.0 test:browser
> node tests/browser-smoke.test.mjs

Running browser smoke: index.html
Browser smoke passed: index.html
Running browser smoke: full backup recovery
Browser smoke passed: full backup recovery
Running browser smoke: Balance.html
Browser smoke passed: Balance.html
Running browser smoke: Balance membership reload
Browser smoke passed: Balance membership reload
Running browser smoke: Balance wealth history
Browser smoke failed:
Error: Tab
...[14 characters omitted]...
pdate/Fehlerbereinigung/Write: {"updates":2,"clears":1,"writes":2}
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at activateWealthBrowserTab (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:885:9)
    at async runBalanceWealthHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:1016:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3607:13)
```
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Noch nicht freigegeben.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-072006.127657Z-c546b3facd1d`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
