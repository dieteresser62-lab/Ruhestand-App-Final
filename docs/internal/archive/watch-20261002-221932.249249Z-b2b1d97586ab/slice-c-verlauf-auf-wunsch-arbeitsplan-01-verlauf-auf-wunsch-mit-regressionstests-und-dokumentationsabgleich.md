# Slice 1 von 1 – Verlauf auf Wunsch mit Regressionstests und Dokumentationsabgleich

<!-- audit:status:begin -->
In Arbeit · Runde 2
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Das vollständige Zielverhalten in einem zusammenhängenden Produktpaket umsetzen, einschließlich der Anpassung bereits betroffener Tests und aller betroffenen Dokumentationsstellen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
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
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Balance.html`
- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-binder.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history-renderer.js`
- `app/balance/balance-wealth-history.js`
- `css/balance.css`
- `docs/internal/c-verlauf-auf-wunsch-implement-review-ce5e12f4.md`
- `docs/internal/slice-c-verlauf-auf-wunsch-arbeitsplan-01-verlauf-auf-wunsch-mit-regressionstests-und-dokumentationsabgleich.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - `Balance.html` liefert den Detailcontainer mit `hidden` aus. Erfassen, Umschaltknopf, Anzahl und Rückmeldungen stehen außerhalb; Beschreibung, Legende, Leerhinweis und die bisherigen benannten Regionen liegen innerhalb. Lokale CSS-Regeln sichern Verstecken und Knopfumbruch.
> - Der Renderer hält Sichtbarkeit ausschließlich im DOM, synchronisiert Buttonname/ARIA und führt nur einen Fokus innerhalb der Details zum Knopf zurück. Geschlossen wird der aktuelle Verlauf validiert/gezählt und alter Inhalt entfernt; erst offen werden SVG und Tabelle aufbereitet. Öffnen lädt frisch ohne Engineupdate oder Schreibtransaktion.
> - `balance-main.js` initialisiert geschlossen. Reguläre Updates, manuelle Erfassung, Jahresabschluss und Snapshotaktionen erhalten die Sichtbarkeit. Der Binder bindet beide Verlaufslistener einmal und schließt ausgewählte Balance-Importe vor dem Dateilesen sowie abschließend, einschließlich Ablehnung und Rollback. Ein Dateidialog ohne Auswahl bleibt wirkungslos.
> - Manuelle Erfassung meldet nach dem bestehenden Readback „Stand gesichert“. Der optionale Jahresrückruf folgt ausschließlich neuer erfolgreicher Finalisierung ab 2026, nach Setzen von `completedResult`. No-op, ältere Jahre und Fehler bestätigen keinen neuen Stand; nachgelagerte UI-Rückruffehler ändern keinen bestätigten Abschluss in eine Recoverylage. Datenverträge und Engine-Schreibwege bleiben unverändert.
> - Bestehende Node-Regressionen wurden erhalten und um offene/geschlossene Erfassung, Inhaltserzeugungsverbot geschlossen, einmalige Umschaltbindung, Fokus, Import/Ablehnung/Rollback und Jahresbestätigung erweitert. Die Browserfälle prüfen die explizite Anzeige, Markup ohne JavaScript, Tastatur, Profilwechsel, Reload, echte Importe samt injiziertem Post-Replace-Fehler sowie zwei frisch initialisierte Jahresabschlussszenarien.
> - `README.md`, `Handbuch.html`, `docs/reference/TECHNICAL.md`, `docs/reference/BALANCE_MODULES_README.md` und `tests/README.md` beschreiben die flüchtige Anzeige, Bestätigungen und unveränderten Datenverträge konsistent.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün, rot · Prüfurteil abgelehnt · 1 neu, 0 geschlossen.
- Runde 2: Korrektur · Validierung grün, rot · Prüfurteil abgelehnt · 0 neu, 0 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
### R-01 – Das verpflichtende Browsergate ist rot: Die Validierungsattestierung zum Fingerprint [Hash ausgelassen]……

Klasse: Blocker · Stand: eskaliert

Befund:
> Das verpflichtende Browsergate ist rot: Die Validierungsattestierung zum Fingerprint [Hash ausgelassen]… meldet `npm run test:browser` in beiden Läufen mit exit=1. Der Abbruch liegt in `Balance wealth history` bei `assertWealthBrowserVisibility` (browser-smoke.test.mjs:772) und kommt aus `toggleWealthBrowserHistory` (Zeile 785) sowie `runBalanceWealthHistory` (Zeile 883), also beim ersten Öffnen per Enter mit leerer Historie. Die gekürzte Meldung beginnt mit „Offe…“. Das passt zur Assertion „Offene Regionen mit bisherigen Namen erreichbar“. Diese verlangt im offenen Zustand `isVisible()` für `#wealthHistoryChart` und `#wealthHistoryTable`. Bei leerer Historie bleiben beide Divs ohne Inhalt und damit ohne Höhe; Playwright wertet sie deshalb als unsichtbar. Das Slice-Kriterium verlangt ein grünes `npm test` und ein grünes `npm run test:browser` am finalen Quellstand. Damit ist das Kriterium nicht erfüllt. Die Abdeckung von Sichtbarkeit, Tastatur, Import/Rollback und Jahresabschluss im Browser ist so ebenfalls nicht belegt, weil der Lauf vor diesen Schritten abbricht.

Akzeptanztest:
> `npm run test:browser` läuft am Prüfstand vollständig grün, einschließlich `Balance wealth history` und beider Szenarien von `Balance annual commit`. Der offene Zustand mit leerer Historie wird fachlich korrekt geprüft: Der Leerhinweis ist sichtbar, und die Regionen sind vorhanden und zugänglich, ohne eine Mindesthöhe leerer Divs vorauszusetzen. Alternativ erhalten die Regionen bewusst eine sichtbare Fläche. Die Sichtbarkeitsprüfung gefüllter offener Regionen und die Abwesenheit im Zugänglichkeitsbaum im geschlossenen Zustand dürfen dabei nicht abgeschwächt werden. `npm test` bleibt grün.

Antwort des Implementierers, Runde 2 (angenommen):
> Browserprüfung korrigiert: Leere offene Historien prüfen sichtbaren Leerhinweis, benannte Regionen und Fokussierbarkeit ohne Mindesthöhe. Sichtbarkeitsprüfungen gefüllter Regionen und Ausschluss geschlossener Regionen aus dem Zugänglichkeitsbaum bleiben erhalten. Drei gezielte Regressionstests mit 419 Assertions sowie Syntaxprüfung und git diff --check erfolgreich. Browserlauf beim Serverstart durch listen EPERM blockiert; vollständige Gates npm test und npm run test:browser führt der Orchestrator außerhalb der Sandbox aus.

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
Error: Offe
...[98 characters omitted]...
/tests/browser-smoke.test.mjs:110:27)
    at assertWealthBrowserVisibility (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:772:9)
    at async toggleWealthBrowserHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:785:5)
    at async runBalanceWealthHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:883:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3514:13)
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
Error: Off
...[99 characters omitted]...
/tests/browser-smoke.test.mjs:110:27)
    at assertWealthBrowserVisibility (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:772:9)
    at async toggleWealthBrowserHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:785:5)
    at async runBalanceWealthHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:883:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3514:13)
```

- Runde 2: `npm test` · grün · Exitcode 0.

- Runde 2: `npm run test:browser` · rot · Exitcode 1.

```
=== validation run 1/2: FAIL (exit=1) ===
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
Error: Umschalten ergänzt kein persistiertes Sichtbarkeitsflag
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at toggleWealthBrowserHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:804:5)
    at async runBalanceWealthHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:902:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3531:13)
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
Error: Dar
...[4 characters omitted]...
ellte Daten entsprechen auch der bestätigten aktiven Registrykopie
    at assert (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:110:27)
    at assertWealthBrowserTable (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:815:5)
    at async runBalanceWealthHistory (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:1016:5)
    at async main (~/repos/RuhestandsApp/tests/browser-smoke.test.mjs:3531:13)
```
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Noch nicht freigegeben.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261002-221932.249249Z-b2b1d97586ab`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
