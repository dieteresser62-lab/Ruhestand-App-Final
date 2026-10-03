# Slice 4 von 5 – Automatische Erfassung nach bestätigtem Ausgabenimport absichern

<!-- audit:status:begin -->
Freigegeben in Runde 2 · 1 Befund, 1 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Einen unabhängigen nachgelagerten Sicherungsschritt mit genauer Kursfrischeprüfung, gemeinsamem Erfassungspfad und bereichsbezogenen Meldungen integrieren.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Ein erfolgreicher Import mit produktiv gespeichertem frischem Tranchendatum führt genau eine PREVIEW und eine bestätigte unterjährige Erfassung aus. Eine Nodeintegration startet mit undatierten ETF-Beständen, fährt den realen Manager-Kurslistener, bestätigt Preis/`asOf` im echten Speicher, lädt den Bestand erneut und fährt den realen CSV-Importlistener; der dabei entstandene Eintrag hat dieselben Komponenten wie die manuelle Erfassung. Ergänzend prüft ein synthetischer Import mit mehreren Monaten/Profilen genau einen Versuch je Vorgang. Lokal festgehaltener Importtag statt importiertem Monat, `manual:YYYY-MM-DD`, `reason: manual`, `periodId: null`; zweiter Import desselben Tages ersetzt, ein anderer Tag ergänzt. Jahresstände bleiben unverändert.
- SOURCE: Feste UTC-Zeit prüft exakt 604800000 ms als frisch und eine Sekunde darüber als alt; zusätzlich fehlendes/ungültiges/zukünftiges Datum, mehrere frische Kurse, mindestens ein alter beziehungsweise unbekannter Kurs. Lokal abweichender Kalendertag und ein Warten über Mitternacht prüfen, dass der festgehaltene Importtag verwendet wird.
- SOURCE: Produktiver Leser erkennt undatierte Altdaten als unbekannt und gibt nach erfolgreichem Managerupdate aller beitragenden Bestände mit frischem gespeichertem `asOf` die Sicherung frei. Mehrere beitragende Profile werden vollständig geprüft; ein fehlendes oder altes Tranchendatum verhindert die Sicherung auch bei frischem Datum im aktiven Profil. Frisches `annualMarketDataMeta`, Profil-`updatedAt` und Kaufdatum allein geben keine Freigabe. Positive ETF-Aggregate ohne vollständigen Bewertungsnachweis bleiben unbekannt; ohne kursabhängige Bestände wird produktiv gesichert.
- SOURCE: Automatische und manuelle Erfassung verwenden dieselben realen PREVIEW-Werte und dieselbe Persistenztransaktion. Aktive Registrykopie und Live-State stimmen nach Readback überein; fremde Profile, Periodenstate, Importdaten und beide Speicherformate bleiben unverändert. Legacy-Exporte mit `manual` laden weiter.
- SOURCE: Ungültige CSV, nicht gewählte Datei, fehlgeschlagene Datei-/Store-/Flushoperation und Recovery-Sperre lösen null Sicherungsversuche aus. Zwei schnelle gültige Vorgänge werden je einmal bearbeitet. Konkurrenz mit manueller Erfassung, Profilwechsel und Jahresabschluss schreibt keine fremden oder unbestätigten Werte und meldet Fehler nachvollziehbar.
- SOURCE: Alte/unbekannte Kurse erzeugen exakt den jeweiligen Hinweistext als `info`, mit null Verlaufwrites; bestätigte Sicherung erzeugt Erfolg mit formatiertem Kursdatum beziehungsweise ohne-Bestände-Text. Schreib-/Readback-/Vorschaufehler bleiben als Ausgaben-Aktionsfehler stehen. Importbestätigung ist in Nachrichtenevidenz und gespeicherten Ausgaben nachweisbar; der optional fehlgeschlagene Schritt macht den Import nicht ungültig.
- SOURCE: Kein Erfolg, kein Hinweis und kein Fehler aktiviert einen anderen Tab. Aktive Auswertung aktualisiert beide Abschnitte; inaktive Container bleiben ungezeichnet und „Zuletzt erfasst am …“ entspricht weiterhin dem maximalen bestätigten Stichtag. Bisherige manuelle und jährliche Meldungen/Erfassungen bleiben grün.
- SOURCE: Gezielte Läufe von `balance-expenses-wealth-capture.test.mjs`, `balance-expenses.test.mjs`, `balance-ui-orchestration.test.mjs`, `balance-wealth-history.test.mjs`, `balance-messages.test.mjs`, `wealth-history-contract.test.mjs` und `balance-annual-workflow-contract.test.mjs` via `node tests/run-single.mjs` bestehen; der Orchestrator führt anschließend `npm test` aus. Bestehende zuletzt genannte Dateien werden zur Regression gelesen/ausgeführt, nicht geändert.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder.js`
- `app/balance/balance-expenses-wealth-capture.js`
- `app/balance/balance-expenses.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history.js`
- `docs/internal/e-auswertung-ausgaben-implement-review-8b7f18fb.md`
- `docs/internal/slice-e-auswertung-ausgaben-arbeitsplan-04-automatische-erfassung-nach-bestatigtem-ausgabenimport-absichern.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-expenses-wealth-capture.test.mjs`
- `tests/balance-expenses.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - `balance-expenses.js` bestätigt den Ausgabenstore durch Flush, meldet den Import unabhängig vom optionalen Schritt und startet `onImportSuccess` vor darstellenden Rückrufen. Gültige Vorgänge laufen seriell; Jahr/Monat/Profilziel werden je Dateivorgang festgehalten. Datei-/Parser-/Store-/Flushfehler, leere Auswahl und Recovery-Sperren starten keine Sicherung.
> - `balance-expenses-wealth-capture.js` hält Importzeit und Profilkontext fest, prüft den vollständigen zur PREVIEW beitragenden Aktien-/Geldmarktbestand und das gespeicherte `asOf`. Exakt 604800000 ms sind frisch; alte, fehlende, ungültige, zukünftige und unvollständig zugeordnete Kurse verhindern Writes. Das älteste Kursdatum bestimmt den Hinweis. Tagesgeld wird nicht datiert; kursfreie Bestände werden gesichert. Beide vorhandenen Anleihenprojektionen bleiben erhalten und benötigen kein ETF-Kursgate.
> - Automatik und manuelle Taste teilen `previewWealthHistory()` sowie die bestehende `captureManual()`-Transaktion. Lokaler Importtag, `manual:YYYY-MM-DD`, `reason: manual`, `periodId: null`, Tagesersetzung, Jahresstände und Speicherformate bleiben erhalten. Profil-/Vorschauquellenwechsel und laufende/Pending-Jahresabschlüsse blockieren; Quellenprüfung berücksichtigt auch Verbundprofile. Bekannte Legacy-Ergänzungen des bestehenden Speicherladers sind nur als dessen exaktes Schreibziel zulässig.
> - Der Binder verbindet den Rückruf mit dem bestehenden Update und Verlaufsspeicher. Hinweise verwenden exakt die vorgesehenen Texte und `'info'`; Erfolg verwendet `true`. Echte Fehler bleiben in `expenses-wealth`, ohne CSV-Rollback oder falsche Importablehnung. Toast-/Renderfehler widerrufen keine bestätigte Erfassung. Beide Auswertungsabschnitte aktualisieren bestätigte Daten ohne Tabwechsel; inaktiv bleiben Container leer und das Datum bleibt maximal.
> - Die produktive Nodeintegration startet undatiert, fährt den echten Manager-Kurslistener mit kontrollierter Kursantwort, bestätigt Backend-/Registry-Preiszeit, lädt erneut und fährt den echten CSV-Dateifeldlistener mit realem UIReader, Profilverbund und Engine-PREVIEW. Manuelle Komponenten stimmen überein. Undatierte/alte Partner blockieren tatsächliche Imports; alle frischen Partner geben frei. Kursfreie Bestände, zwei schnelle Imports, Importfehler und optionale Fehler sind zusätzlich produktiv belegt.
> - README, Handbuch und Referenzen beschreiben den wirksamen Manager-/Importpfad, fehlende Tagesgeld-Altersprüfung, Meldungen und Importunabhängigkeit. Der Browser-Smoke enthält den realen Manager-/IndexedDB-/CSV-Ablauf mit Nachrichtenindex, Tagesersetzung, aktiver/inaktiver Auswertung sowie Frische-/Fehlerfällen; konkrete Zustände und beobachtetes Idle ersetzen pauschale Wartezeiten.
>
> ### Gezielte Prüfung des Implementierers
>
> Alle folgenden Läufe via `node tests/run-single.mjs <datei>` bestanden auf dem umgesetzten Stand, ohne fehlgeschlagene Assertions oder Dateien:
>
> | Datei | Erfolgreiche Assertions |
> |---|---:|
> | `tests/balance-expenses-wealth-capture.test.mjs` | 107 |
> | `tests/balance-expenses.test.mjs` | 171 |
> | `tests/balance-ui-orchestration.test.mjs` | 641 |
> | `tests/balance-wealth-history.test.mjs` | 718 |
> | `tests/balance-messages.test.mjs` | 180 |
> | `tests/wealth-history-contract.test.mjs` | 215 |
> | `tests/balance-annual-workflow-contract.test.mjs` | 136 |
>
> Gesamt: 2168 erfolgreiche Assertions. `node --check tests/browser-smoke.test.mjs`, Dokumentabgleich und `git diff --check` bestanden. Die drei zuletzt genannten Regressiondateien wurden nur gelesen/ausgeführt, nicht geändert; auch `balance-wealth-history.test.mjs` bleibt unverändert.
>
> Die volle Suite `npm test` lief nicht beim Implementierer und bleibt dem Orchestrator vorbehalten. Der Browser-Smoke wurde in der Agentensandbox nicht ausgeführt; die gesteuerte Sitzung führt `npm run test:browser` außerhalb der Sandbox vor dem Merge aus. Der Syntaxcheck ist kein Browsernachweis. Diese gezielten Implementiererprüfungen ersetzen weder die Orchestratorvalidierung noch eine gegenläufige Freigabe. Die vorhandene `.gemini`-Änderung und das vom Orchestrator bereits bearbeitete Gesamtaudit blieben unangetastet.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil abgelehnt · 1 neu, 0 geschlossen.
- Runde 2: Korrektur · Validierung grün · Prüfurteil freigegeben · 0 neu, 1 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
### R-01 – docs/reference/BALANCE_MODULES_README.md: Die Modulinventur bekommt mit…

Klasse: Befund · Stand: geschlossen

Befund:
> docs/reference/BALANCE_MODULES_README.md: Die Modulinventur bekommt mit `balance-expenses-wealth-capture.js` eine neue Tabellenzeile (Hunk @@ -50,7 +50,8 @@, also netto eine Zeile mehr). Die direkt folgende unveränderte Zeile behauptet aber weiterhin „**Inventurergebnis:** 39 von 39 Dateien erfasst.“. Laut Dokument ist die Inventur „gegen den fertigen Stand von `app/balance/` abgeglichen“. Durch die neue Datei in `app/balance/` ist diese Zählung jetzt veraltet und widerspricht der Tabelle. Das verletzt die Regel zum Doku-Sync bei geändertem Modulzuschnitt. Außerdem steht die neue Zeile außerhalb der alphabetischen Reihenfolge zwischen `balance-wealth-history-renderer.js` und `balance-wealth-history.js`.

Akzeptanztest:
> In docs/reference/BALANCE_MODULES_README.md stimmt die Zahl im Satz „Inventurergebnis: N von N Dateien erfasst.“ sowohl mit der Zahl der Tabellenzeilen als auch mit der Zahl der JS-Dateien in app/balance/ nach diesem Slice überein (erwartet: um eins höher als vorher, also 40, falls die bisherigen 39 stimmten). Die Zeile für `balance-expenses-wealth-capture.js` steht an der alphabetisch richtigen Stelle der Inventurtabelle.

Antwort des Implementierers, Runde 2 (angenommen):
> Inventurtabelle vervollständigt und alphabetisch geordnet; Einleitung und Inventurergebnis auf 41 korrigiert. Direkter Node-Abgleich bestätigt 41 Tabellenzeilen für 41 JS-Dateien. git diff --check erfolgreich. Nur Dokumentation geändert; die volle Testsuite bleibt dem Orchestrator vorbehalten.

Abschlussbegründung des Prüfers:
> Behoben im Diff von docs/reference/BALANCE_MODULES_README.md: Der Hunk @@ -31,9 +31,11 @@ ergänzt `balance-expenses-history-renderer.js` (fehlte offenbar schon seit Slice 2) zwischen `balance-expenses-csv.js` und `balance-expenses-metrics.js` sowie `balance-expenses-wealth-capture.js` zwischen `balance-expenses-storage.js` und `balance-expenses.js`. Beide Positionen sind alphabetisch korrekt, denn '-' (0x2D) sortiert vor '.' (0x2E), wie bei den übrigen `balance-expenses-*`-Zeilen. Hunk @@ -50,9 +52,9 @@ entfernt die falsch platzierte Zeile neben `balance-wealth-history.js`. Einleitung und „Inventurergebnis“ nennen jetzt übereinstimmend 41 von 41. Das passt zur Zählung: Vorher standen 39 Zeilen im Dokument, eine Zeile fehlte schon vorher, und eine Datei ist neu hinzugekommen. Damit ist die Erwartung „40, falls die bisherigen 39 stimmten“ ausdrücklich bedingt und hier korrekt auf 41 angepasst.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.

- Runde 2: `npm test` · grün · Exitcode 0.
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft wurden der Abschluss von R-01 (Zählung, alphabetische Reihenfolge, Kopfzeile), die Pfadgrenze (alle 14 geänderten Pfade liegen in authorized_paths), die Attestierung (Fingerprint [Hash ausgelassen]… stimmt mit Paket und Request überein, `npm test` PASS) und die Korrekturrunde. Nebenbei gelesen: Importkette in balance-expenses.js (Flush vor onImportSuccess, serielle importTail, Fehler im Scope expenses-wealth), Controller in balance-expenses-wealth-capture.js (Kontext und Tag vor dem ersten await festgehalten, Frischegate, validateSource) und die gemeinsame PREVIEW in balance-wealth-history.js.

Größtes Restrisiko:
> Die absolute Zahl von 41 JS-Dateien in app/balance/ lässt sich nicht verifizieren. Das Paket enthält nur den Diff mit den Hunk-Kontexten, nicht die vollständige Tabelle oder ein Verzeichnislisting. Die Request-Vorgabe beschränkt diese Prüfung auf die 8 gelisteten Dateien. Die Konsistenz von Kopfzeile, Inventurergebnis und den hinzugefügten bzw. verschobenen Zeilen ist aus dem Diff belegt. Für die Gesamtzahl stütze ich mich auf den vom Implementierer berichteten Node-Abgleich (41 Zeilen für 41 Dateien).

Bruchbedingung:
> Die Freigabe wäre falsch, wenn app/balance/ tatsächlich nicht genau 41 JS-Dateien enthält. Das wäre der Fall, wenn `balance-expenses-history-renderer.js` schon vor diesem Slice in den 39 gezählten Zeilen stand oder wenn eine weitere Datei fehlt. Dann widerspräche das Inventurergebnis erneut dem Verzeichnis.

Vorab-Risikoanalyse:
> Wenn dieser Slice später scheitert, dann am ehesten nicht an R-01, sondern an der Browser-Smoke `Balance automatic expenses capture`. Sie läuft außerhalb von `npm test` und ist in dieser Attestierung nicht enthalten, etwa weil Proxy-Kursfixtures oder die Reihenfolge der Meldungen „CSV importiert.“ und Ergebnis im echten Browser abweichen. Für die Dokumentation bleibt das Risiko einer abweichenden Dateizahl; das korrigiert ein reiner Doku-Folgecommit ohne Auswirkung auf das Laufzeitverhalten.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-162826.876868Z-73b99f8bd2c7`, Arbeitseinheit(en) 5; Nachweise in der Recordkette.
<!-- audit:reference:end -->
