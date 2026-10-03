# Vermögensverlauf-Tab: Restarbeiten

## Auftrag und Ausführungsgrenze

- Zielbranch: `feature/vermoegensverlauf-tab`.
- Dieser Planungsschritt schreibt ausschließlich `docs/internal/d2-vermoegensverlauf-tab-rest-arbeitsplan.md`. Die folgenden Slices beschreiben die spätere Produktumsetzung, nicht zusätzliche ausführbare Pakete dieses PLAN_ONLY-Aufrufs.
- Grundlage: Nutzerauftrag und das nur gelesene Review `inbox/backlog/review-vermoegensverlauf-tab-2026-10-03.md` mit B-01, B-02 und W-03 bis H-08.
- Die Slices werden anschließend in der Reihenfolge 1, 2, 3 umgesetzt und unabhängig geprüft. Änderungen bleiben innerhalb der jeweiligen exakten Pfadliste. Der Implementierer wechselt keine Branches, staged und committet nicht; Git-Transaktionen gehören dem Orchestrator bzw. der gesteuerten Sitzung.
- Bestehende fremde Änderungen werden nicht überschrieben. `engine.js`, `dist/`, Engine, Datenmodell, Profil-/Persistenzverträge und Desktop-Build bleiben außerhalb des Änderungsumfangs.

## Verifizierter Ausgangspunkt

- `createSnapshotHandlers().handleJahresabschluss()` in `app/balance/balance-binder-snapshots.js` finalisiert neue Jahresstände im bestehenden Zweig ab 2026. Nach `completedResult = completed` prüft der UI-Rückruf die Jahresschwelle nochmals; der Toast enthält nur `Ausgaben-Check auf ${nextYear} umgestellt.`. No-op und neuer Erfolg können beide den Status `already_committed` liefern; der Status allein belegt keinen neuen Stand.
- `createBalanceWealthHistoryService().finalizeAnnual()` wartet auf die transaktionale Speicherung einschließlich Readback von Balance-State und aktiver Registrykopie. Dieser bestehende Bestätigungsvertrag bleibt maßgeblich.
- `css/balance.css` setzt `.form-column { min-width: 0; }`. Die Ausgabentabelle hat `min-width: 720px`. Das Review meldet nur 568–691 px sichtbare Breite und hat Entfernen der Spaltenregel plus `contain: inline-size` auf `.wealth-scroll` in einer Kopie verifiziert. Diese Angaben sind fremde Vorher-Evidenz, keine neuen Messungen dieses Planungsschritts.
- Das Layout ist bis einschließlich 1250 px einspaltig und darüber zweispaltig. `.tab-buttons` erlaubt Umbruch; `.tab-btn` hat derzeit 18 px horizontalen Innenabstand.
- `Balance.html` platziert `wealthHistoryDate` als eigenen Absatz hinter `wealth-actions` und Status. Der neue mobile Drawer-Sonderfall steht separat unter dem bestehenden Drawer-Verhalten. Beim Drucken wird die Formularspalte bereits ausgeblendet.
- `app/balance/balance-main.js` verwendet für `debouncedUpdate()` wörtlich 250 ms. `installWealthBrowserUpdateObserver()` in `tests/browser-smoke.test.mjs` filtert ebenfalls wörtlich auf 250 ms und verwendet Accessors für nachträgliche Timerzuweisungen. Der Node-Test importiert hierfür das gesamte Browser-Smoke-Modul; sein vorhandener VM-Test prüft bisher keine erneute Zuweisung nach Installation.
- Bestehende Node-Fixtures in `tests/balance-wealth-history.test.mjs` decken bereits Finalisierungsfehler, blockierten Readback, aktive/inaktive Erfassung, Tablistener und Fehler nach Commit ab. Sie werden um konkrete Meldungsnachweise ergänzt. `tests/balance-wealth-history-chart.test.mjs` enthält Markup- und Datumsprüfungen.
- Der Browserhelfer `activateWealthBrowserTab()` prüft Update-/Clear-/Facade-Write-Zähler sowie State, Registry und Export, bisher keine vollständigen Browser-Speichervergleiche. Der Fall `Balance annual commit` prüft aktive und inaktive neue Abschlüsse sowie Wiederholung und Reload, bisher überwiegend den Status im Verlaufspanel.

## Unveränderte Produktverträge

- Vier Haupttabs in bestehender Reihenfolge; Start, Reload und Profilwechsel öffnen „Jahres-Update“. Tabaktivität bleibt allein im DOM und wird weder gespeichert noch exportiert.
- Öffnen liest frisch, ohne Engineupdate, Erfassung, Fehlerbereinigung oder Write. Inaktiv werden keine Diagramm-/Tabelleninhalte erzeugt; Aktivieren ersetzt sie frisch, Deaktivieren leert sie.
- Erfassen und Import behalten den aktiven Tab auch bei Fehler/Ablehnung/Rollback. Capture öffnet keinen Tab.
- Datum folgt dem maximalen validierten gespeicherten `asOf`; Leertext, beschädigte Historie, Profilisolation, Anzahl, Schreibkoordination, Barrierefreiheit und Fokusfolge bleiben erhalten.
- Keine Wiederholung der Jahresschwelle für Rückmeldungen; die vorhandenen fachlichen Zweige für Koordination und Finalisierung bleiben bestehen.
- Ein UI-Fehler nach bestätigter Speicherung macht einen abgeschlossenen Jahresprozess nicht zu `incomplete_recovery` und ermöglicht keinen zweiten fachlichen Commit.
- Operatorentscheidung zum Druck: Der Vermögensverlauf bleibt beim Druck der Balance-Seite ausgeblendet. Nur dokumentieren; keinen neuen Druckpfad bauen.

## Geordnete Umsetzung

### Slice 1 - Entprellkonstante und unabhängiger Testbeobachter

**Ziel**

Den Timer-Beobachter von der Browser-Suite entkoppeln, seine Verzögerung mit dem Produkt teilen und den Accessor-Pfad sowie fremde Speicherzugriffe beim Tabwechsel absichern.

**Exakter Änderungspfad**

- `app/balance/balance-config.js`
- `app/balance/balance-main.js`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/wealth-browser-update-observer.mjs`

**Umsetzung**

- Eine benannte Exportkonstante `BALANCE_UPDATE_DEBOUNCE_MS = 250` im bereits DOM-freien `balance-config.js` ergänzen. `debouncedUpdate()` importiert/verwendet sie; Verhalten und Verzögerung bleiben gleich.
- `installWealthBrowserUpdateObserver` in das neue, kleine `tests/wealth-browser-update-observer.mjs` verschieben. Das Hilfsmodul startet weder Server noch Browser und importiert keine Browser-Suite.
- Die installierte Funktion erhält die Entprellzeit als explizites Argument. Browser-Smoke und Node-Test importieren die Produktkonstante und übergeben sie. `context.addInitScript(installWealthBrowserUpdateObserver, BALANCE_UPDATE_DEBOUNCE_MS)` muss ohne Modul-Closure funktionieren; auch die VM-Serialisierung übergibt das Argument. Die Filterzahl 250 steht nicht erneut im Beobachter. Die Alternative „alle Timer bis 1 s“ wird nicht verwendet.
- Accessors für `setTimeout` und `clearTimeout`, idempotente Installation, Callbackargumente, Abbruch, Folgeupdates und Entfernung im `finally` erhalten. VM-Test nach Installation beide Timerfunktionen neu zuweisen lassen; danach geplante Updates müssen über den neuen Scheduler beobachtet und über den neuen Cancel-Pfad entfernt werden. Zusätzlich eine abweichend übergebene Verzögerung prüfen, damit ein wieder eingeführter wörtlicher 250-ms-Filter auffällt.
- In `activateWealthBrowserTab()` nach beobachtetem Idle sortierte Schlüssel und vollständige Schlüssel/Wert-Paare beider Speicher (`localStorage`, `sessionStorage`) vor und nach der Aktion vergleichen. Ergänzend `setItem`, `removeItem` und `clear` beider Speicher während der Aktion zählen, damit auch unveränderte oder zurückgenommene Writes auffallen. Instrumentierung im `finally` zuverlässig zurücksetzen. Vorhandene Facade-Zähler, State-/Registry-/Exportvergleiche bleiben erhalten.
- Vorhandene Node-Tabprüfungen explizit für Eintritt und Austritt sowie die anderen Haupttabs behalten/ergänzen: weder synchrones Update noch Entprellplanung noch Erfassung noch Fehlerbereinigung. Testdokumentation erklärt den Accessor: `page.clock` weist `setTimeout` nach dem Init-Skript neu zu. Architektur-/Moduldokumentation nennt gemeinsame Entprellkonstante und separates Hilfsmodul und korrigiert die widersprüchliche Zuständigkeit für das Browsergate.

**Akzeptanzkriterien**

1. Gemessen an SOURCE: Produkt und Browser-Beobachter beziehen ihre Entprellzeit aus `BALANCE_UPDATE_DEBOUNCE_MS`; die serialisierte Init-Funktion ist ohne freie Modulvariablen ausführbar. Die Produktverzögerung beträgt weiterhin 250 ms.
2. Gemessen an SOURCE: `tests/balance-wealth-history.test.mjs` importiert den Beobachter nur aus dem Hilfsmodul. VM-Prüfungen belegen Start/Reload, Idempotenz, nachträgliche Timerzuweisung, Beobachtung eines 250-ms-Timers, Callbackargumente, Folgeupdates, Cancel und Cleanup nach Callbackfehler. Ein Test mit anderer übergebener Verzögerung belegt die Parameterbindung; ein 3500-ms-Meldungstimer blockiert Idle nicht.
3. Gemessen an SOURCE: Der Browserfall vergleicht bei Tabwechseln Schlüssel und Werte von `localStorage` und `sessionStorage` und verlangt null Mutationen beider Speicher zusätzlich zu den bisherigen Nullzählern und State-/Registry-/Exportvergleichen; jede Instrumentierung wird zurückgebaut.
4. Gemessen an SOURCE: Node-Tests belegen, dass Tabwechsel kein Update und keine Entprellplanung auslösen. Neue Browserprüfungen warten auf beobachtbares Idle; sie führen keine festen Aktionswartezeiten ein. Der Profilverbund-Startuphelfer wird nur für Szenarien mit zwei Profilen eingesetzt.
5. Gemessen an SOURCE: Die fokussierten Node-Prüfungen bestehen; die betroffenen Referenzen beschreiben Hilfsmodul, gemeinsame Konstante, `page.clock`-Accessor und die Browserprüfung durch die gesteuerte Sitzung vor dem Merge.

**Validierung**

- Implementierer: `node tests/run-single.mjs tests/balance-wealth-history.test.mjs` und `node tests/run-single.mjs tests/balance-smoke.test.mjs`.
- Orchestrator nach diesem Slice: `npm test` auf genau dem geprüften Arbeitsstand.
- Gesteuerte Sitzung vor dem Merge: `node tests/browser-smoke.test.mjs --only='Balance wealth history'` und `node tests/browser-smoke.test.mjs --only='Balance annual commit'`; insbesondere Beobachter vor Uhrinstallation und nach Reload prüfen.

### Slice 2 - Sichtbare Bestätigung nur nach neuer Jahresfinalisierung

**Ziel**

Die Kurzmeldung des Jahresabschlusses verlässlich an den tatsächlich dauerhaft bestätigten neuen Jahresstand binden und den bereits bestehenden Fehlervertrag erhalten.

**Exakter Änderungspfad**

- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder-snapshots.js`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

- Pro `handleJahresabschluss()`-Aufruf ein lokales, initial falsches Flag für den neuen bestätigten Vermögensstand einführen. Es wird ausschließlich direkt nach erfolgreichem `await wealthHistory.finalizeAnnual(...)` wahr. Keine neue Jahresschwellenprüfung hinzufügen; die wiederholte Prüfung am `onAnnualWealthSaved`-Aufruf durch das Flag ersetzen.
- Nach erfolgreichem fachlichen Abschluss zuerst `completedResult` setzen und die vorhandene Kurzmeldung ausgeben: bei gesetztem Flag exakt `Ausgaben-Check auf ${nextYear} umgestellt. Vermögensstand gesichert.`, sonst die bisherige Meldung ohne Zusatz. Den Toast vor `onAnnualWealthSaved()` ausgeben, damit ein Fehler dieses UI-Rückrufs die sichtbare Bestätigung nicht verhindert. Status im Verlaufstab weiterhin nur bei gesetztem Flag bestätigen.
- Den bestehenden Catch-Zweig für UI-Fehler nach `completedResult` erhalten. Auch bei Fehler im Rückruf, Toast oder Snapshot-Rendering bleibt der bestätigte Commit abgeschlossen. Eine fehlgeschlagene UI-Ausgabe darf keinen Recoverymarker erzeugen; ihre sichtbare Meldung ist naturgemäß kein Pflichtnachweis bei defektem Toast selbst.
- Vorhandene Node-Fixtures nutzen, um Toasttexte je Aktion mit einem vorher erfassten Nachrichtenindex auszuwerten. Erfolgreicher neuer Abschluss 2026, direkt nachfolgender No-op, 2025, fehlgeschlagener Readback und ein gezielt angehaltener Readback erhalten eigene positive/negative Meldungsprüfungen. Bei angehaltenem Readback vor Freigabe kein Zusatz und kein UI-Rückruf; nach erfolgreicher Freigabe genau eine Bestätigung.
- Fehler im `onAnnualWealthSaved`-Rückruf und im Snapshot-Rendering nach Commit prüfen: Bestätigung bereits ausgegeben, finaler State/Registry bestätigt, kein Recovery, Wiederholung ohne neuen Zusatz und ohne zweiten Commit. Bei fehlgeschlagenem Readback kein finaler Jahresrecord/Periodenmarker und kein Zusatz; nach Restore bleibt der vorhandene Wiederanlaufvertrag erhalten.
- Im Browserfall `Balance annual commit` für beide Varianten (aktiver/inaktiver Verlauf) unmittelbar vor dem neuen Abschluss den Index von `window.__browserSmokeMessages` merken und nur neue Nachrichten nach diesem Index prüfen. Vor dem No-op erneut einen Index erfassen; beobachtbaren No-op-Nachrichtentext abwarten und im neuen Abschnitt das Fehlen des Zusatzes prüfen. Der globale Nachrichtenverlauf oder `#error-container` allein ist kein Beleg. State-/Registryabgleich, Sperren, zweiter Jahresknopf und Reload bleiben erhalten.
- README, Handbuch und Referenzen nennen die sichtbare Abschlussmeldung, ihre Readbackbindung und die fehlende Bestätigung bei Wiederholung, Fehler und Jahren vor 2026.

**Akzeptanzkriterien**

1. Gemessen an SOURCE: Ein neuer dauerhaft bestätigter Abschluss 2026 erzeugt genau einmal den exakten Zusatz `Vermögensstand gesichert.` in der Kurzmeldung. Flag und UI-Rückruf folgen der erfolgreich zurückgekehrten Finalisierung, nicht einer erneut geprüften Jahresschwelle.
2. Gemessen an SOURCE: Node-Tests belegen ohne Zusatz: No-op desselben Handlers nach Erfolg, Abschluss 2025, fehlgeschlagener Readback und Zustand während blockiertem Readback. Nach erfolgreicher Readbackfreigabe erscheinen Zusatz und Rückruf genau einmal. Nachrichten werden je Aktion isoliert ausgewertet; `already_committed` allein gilt nicht als Erfolgsnachweis.
3. Gemessen an SOURCE: Node-Tests belegen bei UI-Rückruf-/Renderfehler nach Commit erhaltene finalisierte Daten und den zuvor ausgegebenen Zusatz. Die Rückgabe bleibt abgeschlossen, `pendingCommit` ist leer, Wiederholung erzeugt weder zweiten Engine-Commit noch neuen Zusatz. Ein Toastfehler ändert ebenfalls keine bestätigte Abschlusssemantik.
4. Gemessen an SOURCE: `Balance annual commit` prüft den Zusatz beim jeweils neuen Abschluss und sein Fehlen beim fachlich belegten No-op anhand eigener Meldungsindizes in `window.__browserSmokeMessages`, bei aktivem und inaktivem Verlauf. Bestehende fachliche und Persistenzprüfungen bleiben erhalten.
5. Gemessen an SOURCE: Die fokussierten Node-Prüfungen bestehen und die fünf betroffenen Dokumente beschreiben den endgültigen Meldevertrag konsistent.

**Validierung**

- Implementierer: `node tests/run-single.mjs tests/balance-wealth-history.test.mjs` und `node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs`.
- Orchestrator nach diesem Slice: `npm test`.
- Gesteuerte Sitzung vor dem Merge: `node tests/browser-smoke.test.mjs --only='Balance annual commit'` mit den zwei bestehenden kontrollierten Abschlüssen 2026 und ihren Wiederholungen.

### Slice 3 - Tabellenbreite, Tabzeile, Datum und Druckdokumentation

**Ziel**

Die Ausgabentabelle wieder vollständig anzeigen, den Verlauf innerhalb seiner Spalte halten und die verbleibenden Layout- und Dokumentationsbefunde abschließen.

**Exakter Änderungspfad**

- `Balance.html`
- `Handbuch.html`
- `README.md`
- `css/balance.css`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

- Nur das regressionsverursachende `min-width: 0` von `.form-column` entfernen und auf `.wealth-scroll` `contain: inline-size` ergänzen. Keine globale Verkleinerung der Ausgabentabelle; deren 720-px-Vertrag bleibt erhalten. Diagramm und Verlaufstabelle dürfen intern horizontal scrollen, ihre intrinsische Breite darf die Formularspalte nicht vergrößern.
- Horizontalen Innenabstand der Balance-Tabbuttons bedarfsgerecht reduzieren. Im zweispaltigen Layout über 1250 px passen alle vier vollständigen Tabtitel ohne Umbruch innerhalb eines Titels in eine Zeile. `flex-wrap` für schmalere Ansichten erhalten; keinen neuen Layoutbreakpoint erzwingen.
- `wealthHistoryDate` als nicht fokussierbares Inlineelement mit unveränderter ID und `aria-live` in `wealth-actions` neben Capturetaste und Anzahl verschieben. Status bleibt eine eigene Statusregion. Desktop zeigt alle drei in derselben Zeile; auf 375 px darf die Aktionszeile kontrolliert umbrechen, ohne Überlauf. Datumslogik und Leer-/Fehlertexte werden nicht geändert.
- Die mobile `.diagnosis-drawer:not(.is-open)`-Regel einschließlich ihres falschen Kommentars entfernen. Bestehende Drawer-Transformation, Öffnen/Schließen, Overlay und Transition erhalten; keine Ersatzregel einführen.
- Den bestehenden Node-Markuptest um den gemeinsamen Aktionscontainer für Capture, Anzahl und Datum erweitern. Bestehende Datumsprüfungen erhalten. Node-Capturetests bei aktivem und inaktivem Verlauf sowie über den tatsächlich gebundenen Clicklistener um explizite Tabzustandsprüfungen ergänzen, einschließlich Fehlerpfad; keine produktive Änderung der Tabmechanik nötig.
- Den Browserfall `Balance wealth history` um Desktopmessungen bei 1251, 1280, 1366, 1440 und 1920 CSS-Pixeln ergänzen; 1250 px zusätzlich als einspaltige Grenze prüfen. Vor Maßen auf Ende von `document.getAnimations()` und auf beobachtetes Idle warten, bei Bedarf auch auf geladene Schriftarten.
- In gleichen Viewports und mit gleichem Fixture bei aktiver Ausgabentabelle ihre Tabellenbreite, sichtbare Breite des Wrappers, Formularspaltenbreite und Seitenbreite erfassen. Zusätzlich Formularspaltenbreite vor und nach Öffnen eines gefüllten Verlaufs vergleichen, Tabbutton-Rechtecke und Aktionszeile messen. Lang genug gefüllte Diagramm-/Tabelleninhalte müssen tatsächlich intern scrollen.
- Bei 375 px Seitenbreite und interne Regionen prüfen, alle vier Tabs erreichbar lassen und Diagnose-Drawer im bestehenden geschlossenen/geöffneten/wieder geschlossenen Zustand prüfen. Browserprüfungen des Datumstextes, der gemeinsamen Desktopzeile und der direkten Fokusfolge Capture → Diagramm → Tabelle erhalten/ergänzen.
- Alle fünf geforderten Dokumente synchronisieren: Tabs liegen im zweispaltigen Desktoplayout in einer Zeile und dürfen in schmaleren Ansichten umbrechen; Capture, Anzahl und Datum bilden die Aktionszeile. Das Handbuch sagt im Abschnitt Vermögensverlauf ausdrücklich in einem Satz: „Beim Drucken der Balance-Seite wird der Vermögensverlauf nicht ausgegeben.“ Die widersprüchliche Aussage, der Orchestrator führe beide Gates aus, bleibt korrigiert: nur Node-Suite im Orchestrator, Browser-Smoke vor Merge durch die gesteuerte Sitzung.

**Akzeptanzkriterien**

1. Gemessen an SOURCE: `.form-column` hat die zusätzliche `min-width: 0`-Regel nicht mehr, `.wealth-scroll` nutzt `contain: inline-size`, und die neue mobile Drawer-Sonderregel samt Kommentar ist entfernt. Die Ausgabentabelle behält ihre Mindestbreite von 720 px und bestehende Drawer-Regeln bleiben erhalten.
2. Gemessen an SOURCE: Aus dem Quellstand gestartete Browserprüfungen belegen bei 1251, 1280, 1366, 1440 und 1920 px mindestens 720 px vollständig sichtbare Ausgabentabelle wie auf `main`; die Formularspalte wächst beim Öffnen des gefüllten Verlaufs nicht. Alle vier Tabs liegen vollständig in einer Zeile. Browsermaße werden mit höchstens 1 CSS-Pixel Rundungstoleranz verglichen und nach Animationsende erhoben.
3. Gemessen an SOURCE: Bei 375 px entsteht kein seitenweiter horizontaler Überlauf im Verlauf; Diagramm und Tabelle scrollen intern, alle Tabs und Capture bleiben erreichbar. Das Entfernen des Drawer-Sonderfalls verändert das bestehende Öffnen/Schließen nicht. Die Grenze 1250/1251 px entspricht weiterhin dem vorhandenen Layoutbreakpoint.
4. Gemessen an SOURCE: Node-Markuptests belegen Capture, Anzahl und Datum im selben Aktionscontainer mit unveränderter ID/Live-Ankündigung. Browserprüfungen belegen deren gemeinsame Desktopzeile und unveränderte Datumstexte. Node-Tests belegen, dass Capture bei aktiver/inaktiver Historie sowie Fehlern keinen Tab öffnet oder wechselt; die in Slice 1 abgesicherte Updatefreiheit beim Tabwechsel bleibt grün.
5. Gemessen an SOURCE: README, Handbuch, technische Referenz, Modulreferenz und Test-README beschreiben die endgültige Darstellung und Gatezuständigkeiten konsistent. Das Handbuch nennt die ausgeschlossene Druckausgabe; Druck-CSS wird dafür nicht verändert.
6. Gemessen an SOURCE: Die fokussierten Node-Prüfungen und anschließend die Orchestrator-Suite bestehen. Der Browserbericht der gesteuerten Sitzung nennt echte gemessene Tabellen-/Wrapper-/Formular-/Seitenbreiten und Tabzeilen für die Viewportmatrix sowie die 375-px-Messung; Review-Vorherwerte gelten nicht als neue Messung.

**Validierung**

- Implementierer: `node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs`, `node tests/run-single.mjs tests/balance-wealth-history.test.mjs`, `node tests/run-single.mjs tests/balance-expenses.test.mjs` und `node tests/run-single.mjs tests/balance-smoke.test.mjs`.
- Orchestrator nach diesem Slice: `npm test`.
- Gesteuerte Sitzung vor dem Merge: beide gezielten Verlaufs-/Abschlussfälle und danach `npm run test:browser` auf dem fertigen Zweig. Vergleich zu `main` nur lesend bzw. über getrennte Scratch-Fixture, ohne Branchwechsel des Implementierers oder Bearbeitung generierter Artefakte. Messwerte im Prüfbericht angeben, keinen zusätzlichen Slice-Plan anlegen.

## Abschluss, Evidenz und Grenzen

- Die aktuellen Planungsergebnisse enthalten keine ausgeführten Produktprüfungen und keine neuen Browsermessungen. Erst spätere grüne Prüfläufe sind Umsetzungsevidenz.
- Nach jedem Produkt-Slice führt allein der Orchestrator die volle `npm test`-Suite außerhalb der Agentensandbox aus. Der Implementierer berichtet seine gezielten Läufe mit Ergebnis und weist darauf hin, dass er die volle Suite nicht selbst gefahren hat.
- Ein gescheiterter Port-, Browser- oder Unterprozessstart in der Sandbox ist keine fachliche Freigabe und kein Stoppgrund; die Einschränkung und noch ausstehende externe Prüfung werden ausdrücklich berichtet. Zahlen werden nicht aus statischen CSS-Regeln als angebliche Layoutmessungen abgeleitet.
- Nach befundfreiem Finalreview bleibt der Zielbranch ungemergt ausgecheckt. Die gesteuerte Sitzung führt vor dem lokalen Merge den Browser-Smoke und die Breitenmessungen aus. Das dokumentierte Druckverhalten wird dabei durch Druckvorschau bzw. Print-Medienemulation des Quellstands bestätigt.
- Abschluss erst mit grüner Node-Suite, bestandenen angepassten Browserfällen, vollständigen Breitenmessungen und konsistenter Doku. Push, Merge und Desktop-Build sind keine Implementiereraktionen dieses Auftrags.
- Risiken: Rückmeldungen vor Readback, am Jahreswechsel doppelt gepflegte Schwellen, verlorene Beobachtung nach `page.clock`, vom Startup verfälschte Speichervergleiche und durch breite Verlaufsinhalte beeinflusste Flexbreiten. Die vorgesehenen Gates zielen jeweils auf diese Fehlerpfade.
- Falls später andere Quellpfade notwendig werden, meldet der Implementierer `SCOPE-EXTENSION-REQUESTED`, bevor er sie ändert. Fehlende ausschließlich vom Operator bereitstellbare Voraussetzungen werden als `OPERATOR-PREREQUISITE-MISSING`, echte Vertragsunklarheiten als `CONTRACT-UNCLEAR` berichtet. Es besteht hier keine offene Produktentscheidung.

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
> Geprüft wurde die einzige geänderte Datei docs/internal/d2-vermoegensverlauf-tab-rest-arbeitsplan.md (neu, 169 Zeilen) gegen den Auftrag, die Grenze PLAN_ONLY und die Validierungsbescheinigung (internal:work-plan-contract PASS, future_slices=3, Fingerprint [Hash ausgelassen]… passt). Abgedeckt sind die Auftragspunkte: (1) Kurzmeldung mit Zusatz in Slice 2, gebunden an ein lokales Flag pro Aufruf nach erfolgreichem finalizeAnnual, ohne Wiederholung der Jahresschwelle; Node-Tests für 2026 neu, No-op, 2025, gescheiterten und blockierten Readback sowie UI-Fehler nach Commit; Browserfall über Meldungsindizes. (2) Regel .form-column entfernen und .wealth-scroll mit contain: inline-size, mit Breitenmatrix in Slice 3. (3) Tabs ab 1251 px in einer Zeile. (4) Datum in wealth-actions. (5) Drawer-Regel entfernen. (6) Druck-Satz im Handbuch. (7) Speichervergleich, BALANCE_UPDATE_DEBOUNCE_MS, Accessor-VM-Test nach Neuzuweisung, Hilfsmodul tests/wealth-browser-update-observer.mjs, Node-Tests für Kernvorgaben (Capture öffnet keinen Tab, Tabwechsel ohne Update). Alle fünf geforderten Dokumente sind den Slices zugeordnet. Jeder Slice hat exakte Pfade, Akzeptanzkriterien, gezielte Läufe und die Zuständigkeit für den Browser-Smoke. Die Nummerierung ist 1-basiert. Es gibt keine Produktänderung, und der Umfang bleibt auf den autorisierten Pfad beschränkt.

Größtes Restrisiko:
> Die Faktenbehauptungen des Plans über den Quellstand konnte ich nicht selbst prüfen. Das betrifft etwa, dass balance-config.js DOM-frei und in Node importierbar ist, die wörtlichen 250 ms in balance-main.js und tests/browser-smoke.test.mjs, die Existenz von tests/balance-annual-workflow-contract.test.mjs und den Breakpoint 1250 px. Grund: Diese Prüfung durfte nur die vier Manifestdateien lesen, und der Diff enthält nur das Plandokument. Erweist sich balance-config.js als nicht DOM-frei, würde der Import in Slice 1 eine Bereichserweiterung oder einen anderen Ablageort für die Konstante erfordern.

Bruchbedingung:
> Der Plan scheitert, wenn das Importieren von BALANCE_UPDATE_DEBOUNCE_MS aus app/balance/balance-config.js in Node oder Playwright Nebeneffekte im Browser auslöst. Er scheitert auch, wenn ein vorgezogener Toast vor onAnnualWealthSaved den bestehenden Catch-Vertrag nach completedResult verletzt oder wenn contain: inline-size die Formularspalte bei 375 px nicht begrenzt. Jeder dieser Fälle würde in Slice 1, 2 oder 3 als SCOPE-EXTENSION-REQUESTED bzw. als roter Test sichtbar.

Vorab-Risikoanalyse:
> Angenommen, die Umsetzung scheitert später. Wahrscheinlichste Ursachen: (a) Die Konstante liegt in einem Modul mit Browser-Abhängigkeiten, und der Node-Import des Hilfsmoduls bricht. (b) Die Toast-Reihenfolge wird umgestellt, aber ein Test prüft weiterhin die alte Reihenfolge des Rückrufs. (c) Die Breitenmessungen in der gesteuerten Sitzung werden ohne Warten auf das Animationsende erhoben. (d) Der Speichervergleich wird durch Startup-Writes vor dem Idle verfälscht. Der Plan nennt (c) und (d) ausdrücklich als Risiken und als Gates. Für (a) und (b) sind fokussierte Node-Läufe je Slice vorgesehen, die den Fehler früh zeigen würden.
<!-- audit:approval:end -->
