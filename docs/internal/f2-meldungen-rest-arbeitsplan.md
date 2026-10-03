# Meldungen bleiben sichtbar – Restarbeiten

## Auftrag und Ausführungsgrenze

Zielbranch: `feature/meldungen-sichtbar`. Planungsbasis: `aadddd75b319156c56669f07a56a8f7ad93ab381`, ergänzt durch das nur gelesene Abnahmereview `inbox/backlog/abnahmereview-meldungen-sichtbar-2026-10-03.md`. Die aktive Branchbezeichnung wurde geprüft. Der bereits vorhandene unversionierte Eintrag `.gemini` gehört nicht zum Auftrag und bleibt unangetastet.

Dieser PLAN_ONLY-Schritt schreibt ausschließlich `docs/internal/f2-meldungen-rest-arbeitsplan.md`. Die folgenden fünf Slices sind zukünftige Umsetzungspakete, die erst in einem anschließenden Implementierungslauf bearbeitet werden. In diesem Schritt erfolgen keine Produktänderungen und keine Produkttestläufe. Branchwechsel, Staging, Commits, Push und Merge sind dem Implementierer untersagt. Jeder zukünftige Slice verwendet ausschließlich seine unten aufgeführten exakten Änderungspfade; zusätzlicher Änderungsbedarf wird als Umfangserweiterung gemeldet.

## Befund und gewählte Umsetzung

- **B-01/W-01:** `createImportExportHandlers()` in `app/balance/balance-binder-imports.js` rendert beim Dry-Run bereits importierte Werte. Beide Catch-Pfade stellen mit `restoreInputUiState()` die Eingaben zurück, ohne die Ergebnisansicht zu erneuern. JSON erfordert nach dem Restore eine abgewartete Vorschau; CSV zusätzlich die Wiederherstellung der Provenienzanzeige. Erst anschließend wird der bestehende sichere Aktionsfehler ausgegeben. Das echte `balance-main.update()` bereinigt normalerweise Berechnungsfehler und Feldmarkierungen; `BALANCE_UPDATE_MODE.PREVIEW` schreibt laut `persistBalanceUpdate()` keine Daten. Die bestehende Importtransaktion bleibt unverändert.
- **H-01:** Die zusätzlichen Sperren `inFlight`, `fetchInFlight` und `etfInFlight` bleiben als ausdrücklich kommentierte interne Absicherung erhalten. Ihre bestehenden Rückgaben und Fehlercodes werden nicht verändert oder als neue UI-Verträge dargestellt. `Balance.html` bietet keine separaten Inflations-, ETF- oder CAPE-Abrufknöpfe; beide Jahresknöpfe laufen über `createSnapshotHandlers().handleJahresabschluss()`. Dessen bestehende Sperre `annualCloseInFlight` und der periodengebundene Commitvertrag bleiben erhalten. Interne Direktaufruftests werden als interne Prüfungen ausgewiesen.
- **H-02/H-05:** `UIRenderer.handleActionError()` erzeugt derzeit einen Knopf mit wiederholtem Fehlertext im Label und ohne Fokusübergabe. Der Text erhält eine eindeutige ID, der Knopf das Label „Fehlermeldung schließen“ und `aria-describedby`. Die manuelle Schließaktion setzt Fokus auf den nächsten verbleibenden Schließenknopf, am Listenende auf einen verbleibenden Nachbarknopf, sonst auf den vorhandenen Diagnoseknopf `#openDiagnosisBtn` nahe den Meldungen. Automatische Bereichsbereinigung übernimmt keinen Fokus. Die CSS-Korrektur bleibt auf Balance-Meldungen begrenzt.
- **H-03:** Die bisherige boolesche Toast-API erhält einen expliziten neutralen Typ, beispielsweise `UIRenderer.toast(text, 'info')`, bei unverändertem Verhalten für fehlenden zweiten Parameter sowie `true` und `false`. Hinweis, Erfolg und Fehler werden nach Anlass zugeordnet, ohne aus dem Meldungstext einen Typ abzuleiten und ohne den Originaltext zu ändern.
- **H-04:** Das vorzeitige `clearActionError('snapshots')` sitzt in der Ordnerknopfbindung in `app/balance/balance-binder.js`. `StorageManager.connectFolder()` fängt `AbortError` bereits ab und liefert bisher keinen Erfolgswert. Das Rücksetzen wird an die erfolgreich bestätigte Verbindung im Storage-Handler verlagert, nach Ordnerwahl, Berechtigung und Speicherung des Handles. Der bestehende Rückgabevertrag bleibt erhalten.
- **H-06:** Vorhandene echte Handler- und Main-Tests in `balance-ui-orchestration.test.mjs` und `balance-smoke.test.mjs` werden erweitert. Browser-Regressionsprüfungen werden im vorhandenen `tests/browser-smoke.test.mjs` ergänzt; Produktcode erhält keine Testhooks.

## Unveränderliche Verträge

Toasts behalten 6000 ms Laufzeit sowie Timer-/Identitätsschutz einschließlich identischer Folgetexte und Neuinitialisierung. Der Jahresabschluss-Toast bleibt mindestens 3000 ms sichtbar. Aktionsfehler bleiben pro Bereich bis zum nächsten tatsächlich begonnenen passenden Vorgang oder bis zum manuellen Schließen bestehen; fremde Aktionen, Berechnungen, Tabwechsel und Toastablauf entfernen sie nicht. Leere Dateiauswahl, abgebrochene Bestätigung und abgewiesener paralleler Jahresabschluss löschen keinen Fehler.

Berechnungsvalidierung behält ihren normalen Lebenszyklus. Nur der auf abgelehnte Importdaten bezogene Fehler wird durch die erneute Prüfung der wiederhergestellten Eingaben ersetzt bzw. bereinigt. Ein echter Fehler des wiederhergestellten Standes darf weiterhin sichtbar werden. Dateiinputs lösen weder `handleFormInput()`- noch `handleFormChange()`-Updates, Metadatenänderungen oder Fehlerbereinigung aus; die eigenen Importhandler dürfen weiterhin ihre expliziten Dry-Run-/Final-/Wiederherstellungsupdates ausführen.

Meldungswortlaut, Fehlercodes und Recovery-Hinweise bleiben erhalten, einschließlich eingebetteter Symbole im Originaltext. Keine Änderungen an Engine, Datenmodell, Importnormalisierung, Recovery-Snapshots, Rollbackverfahren, Profil-/Tranchenverträgen oder fachlicher Jahreslogik. Bei `rollback_failed` darf die Vorschau nicht behaupten, der Speicher sei repariert; die bestehende Aufforderung zur Recovery bleibt sichtbar. Die Vorschau erzeugt keinen zusätzlichen persistierenden Write und keinen Ersatz-Commit. `engine.js`, `dist/`, Desktop-Binaries und Konfiguration bleiben außerhalb der Umsetzung.

## Reihenfolge der zukünftigen Umsetzung

### Slice 1 - Importfehler nach Wiederherstellung neu darstellen

**Ziel**

B-01 und W-01 beheben und mit echten JSON-/CSV-Handlern sowie beobachtbaren Ergebnissen absichern.

**Exakter Änderungspfad**

- `app/balance/balance-binder-imports.js`
- `tests/balance-smoke.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

1. In beiden Import-Catch-Pfaden die Reihenfolge festlegen: bestehender Rollbackversuch, Wiederherstellung der Eingabefelder, beim CSV Wiederherstellung der Provenienz, abgewartetes `update({ mode: BALANCE_UPDATE_MODE.PREVIEW })`, Ausgabe des ursprünglichen sicheren Aktionsfehlers. Gemeinsame Hilfslogik bleibt bei Bedarf im Importmodul. Ein Fehler der Wiederherstellungsvorschau darf den Import-/Recovery-Aktionsfehler und das Leeren des Dateifeldes im `finally` nicht verhindern.
2. Die auf verworfene Daten bezogenen Berechnungsfehler samt `input-error` durch die Vorschau bereinigen. Falls die Vorschau vor der üblichen Bereinigung scheitert, darf der alte Importdatenfehler nicht unverändert fortbestehen; die Fehlerbereinigung darf keine fremden Aktionsfehler entfernen. Neue Fehler des wiederhergestellten Standes bleiben nach dem bestehenden Berechnungsfehlervertrag sichtbar.
3. Die vorhandenen Handler-Fixtures auf die zusätzliche Vorschau umstellen. Fehlerinjektionen gezielt auf Dry-Run, Replace oder Final-Update begrenzen, damit das Wiederherstellungsupdate tatsächlich den Ausgangsstand berechnen kann. Echte Handler verwenden; erwartete Werte aus einer vorherigen Berechnung mit deutlich anderen Importdaten gewinnen.
4. Browserfälle für JSON-Replacefehler, JSON-Rollback nach Finalfehler und Markt-CSV-Fehler nach erfolgreichem Dry-Run ergänzen. KPI-Texte und `#handlungContent` vor dem Import erfassen und nach Abschluss der Wiederherstellung vergleichen. Gespeicherten State und wiederhergestellte Felder ebenfalls prüfen.
5. Eine separate Browserprüfung für Dateifeldschutz ergänzen: echte Formbindung und Datei-`input`-/`change`-Ereignisse prüfen, während kein eigener Importvorgang gestartet wird, etwa mit einem temporären Dateiinput im Formular ohne Aktionshandler. Zusätzlich vorhandene reale Dateiinputs und ihre `input`-Ereignisse prüfen. Testseitig `clearError`, Berechnungsaufrufe und vorgemerkte entprellte Updates beobachten; ein bereits sichtbarer Berechnungsfehler samt Feldmarkierung muss erhalten bleiben. Anschließend die eigenen Importhandler in den Importfällen regulär ausführen. Alle Testinstrumentierungen wieder entfernen.

**Akzeptanzkriterien**

- SOURCE: Ein echter JSON-Import mit erfolgreichem Dry-Run und werfendem Replace, einschließlich Snapshot-/Storagefehler, rendert vor dem Aktionsfehler wieder mit den ursprünglichen Eingaben; die Wiederherstellungsvorschau verwendet ausschließlich `PREVIEW` und verursacht keinen zusätzlichen Speicherwrite.
- SOURCE: JSON-Finalfehler mit erfolgreichem Rollback erzeugen weiterhin `post_replace_validation_failed`; ein fehlgeschlagener Rollback behält `rollback_failed` und den Recovery-Hinweis. Beide Wege versuchen die Vorschau mit wiederhergestellten Feldern vor Ausgabe des Aktionsfehlers; die Vorschau selbst schreibt nicht und wirft den Aktionsfehler nicht aus dem Ablauf.
- SOURCE: Markt-CSV-Fälle für Replacefehler, `validateBalanceState` vor/nach Replace, Finalfehler und Provenienzbestätigungsfehler werden nach erfolgreichem Dry-Run gezielt ausgelöst. Felder und Provenienzanzeige sind wiederhergestellt, die Ergebnisse beziehen sich auf den wiederhergestellten Stand, und der bestehende CSV-Aktionsfehler bleibt sichtbar. Die Rollbackschritte und Fehlercodes bleiben erhalten.
- SOURCE: Mit echtem Renderer und echtem Main-Update verschwinden Berechnungsfehler aus abgelehnten Dry-Run- und Finaldaten samt `input-error` bei gültigem Ausgangsstand. Fremde Aktionsfehler bleiben bestehen; ein zusätzlich injizierter Fehler der Wiederherstellungsvorschau verhindert den ursprünglichen Importaktionsfehler nicht.
- SOURCE: Der Browser-Smoke vergleicht nach gescheitertem JSON-/CSV-Import KPI und Handlungsanweisung mit der zuvor erfassten gültigen Baseline und prüft den neu protokollierten Aktionsfehler. Die gesonderten Dateievents ohne gestarteten Import ergeben null Updates, null `clearError()`-Aufrufe und unveränderte Feldmarkierungen.
- SOURCE: Die gezielten Läufe für `balance-ui-orchestration.test.mjs` und `balance-smoke.test.mjs` bestehen; der Orchestrator führt danach `npm test` aus. Neue Browserfälle sind implementiert, ihr Lauf erfolgt außerhalb der Sandbox vor dem Merge.

### Slice 2 - Hinweise korrekt kennzeichnen und interne Sperren erklären

**Ziel**

H-01 und H-03 erledigen, ohne den Jahresprozess oder vorhandene Toastaufrufe still umzudeuten.

**Exakter Änderungspfad**

- `app/balance/balance-annual-inflation.js`
- `app/balance/balance-annual-marketdata.js`
- `app/balance/balance-annual-orchestrator.js`
- `app/balance/balance-binder-imports.js`
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-renderer.js`
- `css/balance.css`
- `tests/balance-annual-cape.test.mjs`
- `tests/balance-annual-inflation.test.mjs`
- `tests/balance-annual-marketdata.test.mjs`
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/balance-messages.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

1. Die Toast-API kompatibel um einen expliziten Hinweis-Typ ergänzen. Er erhält „Hinweis: “, ein neutrales Symbol und eine unterscheidbare Formklasse; Timer und `.toast-text` bleiben unverändert. Keine Heuristik anhand von Emojis oder Textanfängen.
2. Fortschrittsaufrufe wie „Starte Jahres-Update...“, Inflations-/ETF-Abrufstart und Warnungen über lokalen CAPE-Stand auf Hinweis umstellen. Ebenso reine No-op-Hinweise zur bereits angewendeten Inflation, bereits abgeschlossenen Jahresperiode und zum bereits laufenden Jahresprozess. Den Export mit Validierungswarnung als Hinweis behandeln; bestätigte Erfolge bleiben Erfolg, echte Fehler bleiben Fehler.
3. Die drei zusätzlichen Reentranzsperren mit ihrer internen Funktion kommentieren: Sie sichern direkte interne Aufrufe ab, sind keine zusätzlichen Balance-Nutzerpfade. Vorhandene `nested`-Bereichsgrenzen, Fehlerweitergabe und Rückgaben beibehalten. Tests zu internen Handlern von Tests zum UI-Jahresabschluss ausdrücklich unterscheiden.
4. Typen mit Fake-Clock und unverändertem Meldungstext prüfen. Browserbelege über tatsächliche Jahresaktionen und beobachtbare Meldungszustände ergänzen; für kurzlebige Fortschrittszustände den Datenabruf testseitig kontrolliert freigeben.

**Akzeptanzkriterien**

- SOURCE: Standard-/`true`-Aufrufe bleiben Erfolg und `false` bleibt Fehler; der explizite Hinweis-Typ liefert „Hinweis: “, neutrales Symbol und eigene Formklasse. Originaltexte einschließlich enthaltenen Symbolen bleiben bytegleich.
- SOURCE: Die genannten Fortschritts-, Warn- und No-op-Meldungen erscheinen als Hinweis, ohne zusätzliches „Erfolg:“/✓ oder „Fehler:“. Bestätigte Jahres-/Importerfolge und echte Fehlertoasts behalten ihren Typ.
- SOURCE: Alle drei Toasttypen bestehen die 6000-ms-, Timerersetzungs-, identische-Folgetext-, Neuinitialisierungs- und Kanaltrennungstests. Der Browser prüft Typ und Originaltext an einem tatsächlichen Jahresprozess sowie mindestens 3000 ms Sichtbarkeit der Abschlussmeldung.
- SOURCE: Kommentare kennzeichnen die zusätzlichen Sperren als intern. Ihre bisherigen Rückgaben/Fehlercodes, die Jahresabschluss-Sperre und `nested`-Fehlergrenzen bleiben unverändert; der bestehende Test für genau einen Jahrescommit bei Doppelklick bleibt grün.
- SOURCE: Die gezielten Läufe für `balance-messages.test.mjs` und die vier genannten Annual-Testdateien bestehen; `npm test` folgt durch den Orchestrator. Die neuen Browserprüfungen sind für den späteren externen Lauf vorhanden.

### Slice 3 - Snapshotfehler bei abgebrochener Ordnerwahl erhalten

**Ziel**

H-04 an der tatsächlichen Ordnerknopfbindung und dem echten Storage-Handler beheben.

**Exakter Änderungspfad**

- `app/balance/balance-binder.js`
- `app/balance/balance-storage.js`
- `tests/balance-smoke.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

1. Das vor dem Dialog ausgeführte Rücksetzen in der Binderbindung entfernen. Den eigenen Snapshotfehler erst nach erfolgreich gewähltem Ordner, gewährter Berechtigung und bestätigter Handle-Speicherung zurücksetzen, unmittelbar vor der vorhandenen Erfolgsmeldung.
2. `connectFolder()` behält seine bestehende Abbruchbehandlung und Rückgabe. Nicht-Abbruchfehler werden weiterhin vom Binder als Snapshot-Aktionsfehler dargestellt; andere Bereiche bleiben unberührt.
3. Echte Knopfbindung und Storage-Handler mit kontrolliertem Picker prüfen: `AbortError`, verweigerte Berechtigung, fehlgeschlagene Handle-Speicherung und Erfolg. Für Browserprüfungen den Picker testseitig ersetzen; kein nativer Dialog und keine produktiven Testhooks.

**Akzeptanzkriterien**

- SOURCE: Ein vorhandener Snapshotfehler bleibt während des offenen Dialogs und nach `AbortError` mit unverändertem Eintrag erhalten; weder Erfolgsmeldung noch `clearActionError('snapshots')` treten auf.
- SOURCE: Erst die bestätigte Verbindung entfernt den bisherigen Snapshotfehler. Verweigerte Berechtigung oder Handle-Speicherfehler ersetzen ihn durch den bestehenden Snapshot-Aktionsfehler; fremde Bereiche bleiben erhalten.
- SOURCE: Rückgabe, Ordnerhandle-Persistenz und Snapshotabläufe behalten ihre bisherigen Verträge. Node-Tests mit echtem `connectFolder()` und Browserabbruchprüfung decken die Aktion ab.
- SOURCE: Die gezielten Läufe für `balance-ui-orchestration.test.mjs` und `balance-smoke.test.mjs` bestehen; der Orchestrator führt `npm test` aus. Der Browserfall wartet auf den beobachteten Pickerabschluss und den Meldungszustand.

### Slice 4 - Fokus und kompakte kontrastreiche Meldungsdarstellung

**Ziel**

H-02 und H-05 mit messbaren Fokus-, ARIA-, Kontrast- und Layoutprüfungen erledigen.

**Exakter Änderungspfad**

- `Balance.html`
- `app/balance/balance-renderer.js`
- `css/balance.css`
- `tests/balance-messages.test.mjs`
- `tests/balance-smoke.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

1. Aktionsfehlertext mit eindeutiger ID und Schließenknopf mit kurzem Label sowie `aria-describedby` verbinden. IDs dürfen bei mehreren Bereichen, Ersatzfehlern und Renderer-Neuinitialisierung nicht kollidieren.
2. Nur beim gültigen manuellen Schließen den Fokus auf den nächsten noch vorhandenen Schließenknopf übertragen; am Listenende auf einen verbleibenden Nachbarn, ohne verbleibenden Fehler auf `#openDiagnosisBtn`. Veraltete Knöpfe bleiben wirkungslos. Bei automatischem Rücksetzen keinen Fokuswechsel auslösen.
3. Den inneren `.error-warn`-Rahmen ausschließlich innerhalb der Aktionsfehler neutralisieren; Berechnungsfehler behalten ihre Darstellung. Abstände und Padding reduzieren und die Fehlerliste mit begrenzter Höhe und vertikalem Scrollen kompakt halten, ohne Texte zu kürzen oder Schließenknöpfe unerreichbar zu machen. Als prüfbare Grenze beträgt die Listenhöhe bei mehreren langen Fehlern höchstens `min(16rem, 30vh)`; alle Einträge sind per Tastatur erreichbar.
4. Lokale Toast-Farben mit explizitem Hintergrund für alle drei Typen setzen und einen WCAG-Kontrast von mindestens 4,5:1 für den Text sicherstellen. Globale Erfolgs-/Fehlerfarben anderer Produktbereiche bleiben unberührt. Symbole und Formen bleiben auch ohne Farbwahrnehmung unterscheidbar.
5. Node-DOM-Mocks nur um erforderliches Fokus-/ARIA-Verhalten ergänzen. Browserprüfungen kontrollieren `activeElement`, Beziehungen der IDs, errechnete Farben und Kontrast, Listenhöhe, mobile Breite und Druckausblendung. Eine Kontrastberechnung aus tatsächlichen CSS-Farben verwenden, nicht nur Klassen-/Quelltextvergleiche.

**Akzeptanzkriterien**

- SOURCE: Jeder Schließenknopf heißt zugänglich exakt „Fehlermeldung schließen“ und beschreibt sich über die eindeutige Text-ID. Mehrere Fehler und Fehlerersatz erzeugen keine doppelten IDs oder verwaisten Beschreibungsbezüge.
- SOURCE: Tastatur-Schließen übergibt Fokus an den nächsten bzw. verbleibenden Schließenknopf, beim letzten Fehler an `#openDiagnosisBtn`; `activeElement` ist nie `BODY`. Schließen löst weiterhin weder Berechnung noch Speicherzugriff aus. Automatische Bereinigung und veraltete Schließenknöpfe ziehen keinen Fokus ab.
- SOURCE: Aktionsfehler haben nur einen sichtbaren Rahmen, während der Berechnungsfehlerrahmen unverändert bleibt. Erfolg-, Hinweis- und Fehlertoast erreichen mit ihren errechneten Vorder-/Hintergrundfarben jeweils mindestens 4,5:1 Textkontrast.
- SOURCE: Mehrere lange Aktionsfehler halten die festgelegte maximale Listenhöhe ein. Alle Texte und Knöpfe sind durch Scrollen/Tastaturnavigation erreichbar; bei 375 px Breite entsteht kein horizontaler Überlauf. Toasts und Aktionsfehler bleiben im Druck ausgeblendet.
- SOURCE: Die gezielten Läufe für `balance-messages.test.mjs` und `balance-smoke.test.mjs` bestehen; der Orchestrator führt `npm test` aus. Browserprüfungen für Fokus, Kontrast und Layout sind implementiert und werden vor dem Merge extern ausgeführt.

### Slice 5 - Tatsächliche Bedienwege und Prüfnachweise dokumentieren

**Ziel**

Die Anzeige- und Wiederherstellungsverträge in Nutzer- und Referenzdokumentation konsistent erklären und die Abnahme vorbereiten.

**Exakter Änderungspfad**

- `Handbuch.html`
- `README.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`

**Umsetzung**

1. Erfolg/Hinweis/Fehler, unveränderte Verweildauer, kompakten Fehlerbereich, Schließen samt Fokusübergabe sowie Erhalt des Snapshotfehlers bei Dialogabbruch erklären. `README.md` ebenfalls synchronisieren, da dessen Meldungsabschnitt bisher nur Erfolg und Fehler beschreibt.
2. Die abgewartete Import-Wiederherstellungsvorschau ohne zusätzlichen Write dokumentieren. Bei fehlgeschlagenem Rollback bleibt der Recovery-Snapshot maßgeblich; Schließen der Meldung repariert keine Daten.
3. In der Annual-Bereichstabelle und Modulreferenz ausschließlich die beiden tatsächlich vorhandenen Jahresknöpfe als Nutzerpfade darstellen. Interne Inflations-/ETF-/CAPE-Handler, `nested` und zusätzliche Sperren als interne Abläufe kennzeichnen. Keine separaten Abrufknöpfe oder neuen Menüpfade erfinden.
4. In `tests/README.md` die Node-/Browser-Regressionsfälle, testseitige Fehlerinjektionen und tatsächliche Prüfausführung beschreiben. Historische Reviewzahlen nicht als neue Testergebnisse übernehmen. Keine personenbezogenen Daten oder lokalen Exporte in Beispiele aufnehmen.

**Akzeptanzkriterien**

- SOURCE: Die fünf Dokumente beschreiben konsistent die drei Toasttypen, dauerhafte bereichsbezogene Fehler, Fokusübergabe, Dialogabbruch und die nicht persistierende Import-Wiederherstellung. Fachliche Recovery-Warnungen bleiben verständlich und unverändert wirksam.
- SOURCE: Nutzerpfade stimmen mit `Balance.html` überein; direkte Inflations-/ETF-/CAPE-Aufrufe und ihre Sperren werden ausschließlich als intern beschrieben. Die beiden Jahresknöpfe und ihr vorhandener Doppelklickschutz bleiben korrekt dokumentiert.
- SOURCE: `tests/README.md` nennt die hinzugefügten Node- und Browsernachweise und trennt den Orchestratorlauf `npm test` vom Browser-Smoke außerhalb der Sandbox. Es behauptet keine im Planungs- oder Implementierungsschritt nicht ausgeführten Prüfungen.
- SOURCE: Der Dokumentationsdiff enthält keine Änderungen an Projektregeln, generierten Artefakten oder nicht freigegebenen Pfaden. Das abschließende `npm test` durch den Orchestrator ist grün; die gesteuerte Sitzung führt `npm run test:browser` vor dem Merge aus.

## Gemeinsame Validierung und Abnahme

Für jeden zukünftigen Slice führt der Implementierer die unter seinen Akzeptanzkriterien genannten gezielten Tests mit `node tests/run-single.mjs tests/<datei>` aus. Bei neuen Fehlern nur betroffene Prüfungen wiederholen oder begründet erweitern. Die vollständige Suite `npm test` läuft nach jedem Paket ausschließlich durch den Orchestrator. Sandboxbedingte Port-/Browser-/Unterprozessfehler werden als nicht ausführbar berichtet; sie sind gemäß Repositoryregeln kein eigenständiger Stoppgrund. Fehlende notwendige Abhängigkeiten werden als `OPERATOR-PREREQUISITE-MISSING` gemeldet; keine Installation oder Netzzugriffe.

Neue Browserfälle warten auf abgeschlossene Aktionen, Dateifeldreset, neue Einträge in `window.__browserSmokeMessages`, KPI-/Anweisungstexte und bestätigten Storagezustand. `waitForWealthBrowserStartup` gilt nur für den Zwei-Profil-Verbund; sonst konkrete Startzustände verwenden. `waitForWealthBrowserIdle` und `waitForBrowserValue` dienen dem Abschlussnachweis, sofern die jeweiligen Observer installiert sind. Keine festen Wartezeiten für Import-, Dialog- oder Fokusabläufe. Gezielte feste Zeitprüfungen sind ausschließlich für Meldungsfristen vorgesehen; Fake-Clock vermeidet unnötige reale Wartezeit in Node.

Die gesteuerte Sitzung fährt nach befundfreiem Finalreview und vor dem lokalen Merge `npm run test:browser` außerhalb der Sandbox auf dem endgültigen Stand. Abnahme verlangt grüne bestehende und neue Tests, einschließlich Dateischutz, Import-Wiederherstellung, Berechnungsfehlerbereinigung, Snapshotabbruch, Fokus, Kontrast, Layout und mindestens dreisekündigem Jahresabschluss-Toast. Der Branch bleibt bis zu dieser Abnahme ungemergt; es wird nicht gepusht.

## Risiken und Gegenprüfungen

- Ein weiterhin auf jedem Aufruf werfender Update-Mock kann die Wiederherstellung nicht belegen. Fehlerinjektionen an die konkrete Importphase binden; mindestens einen Test mit echtem Main-Update und Renderer führen.
- Bei `rollback_failed` ist der persistierte Stand möglicherweise nicht wiederhergestellt. Die Vorschau darf daran nichts reparieren oder Recovery als erledigt darstellen. Im Test Speicher vor/nach Vorschau vergleichen und den Recoverytext prüfen.
- Vor der Importmessung ausstehende Debounce-/Persistenzarbeit abschließen; sonst werden Hintergrundwrites fälschlich der Vorschau zugerechnet. Dateieventtests dürfen keine erlaubten Importupdates mit Formupdates verwechseln.
- Vorschaufehler dürfen den ursprünglichen Aktionsfehler nicht verdecken. Eine zusätzliche Fehlerinjektion in der Wiederherstellungsphase sowie der Vergleich fremder Fehlerbereiche prüfen das explizit.
- Fokus darf nur von einem gültigen manuellen Schließen übertragen werden. Gegenprüfungen umfassen mehrere Fehler, letzten Fehler, Fehlerersatz, automatische Bereichsbereinigung und veralteten Knopf.
- Eine scrollbare Fehlerliste darf Meldungen nicht abschneiden oder die Tastaturbedienung verhindern. Im Browser alle Einträge erreichen und den letzten Knopf fokussieren; mobile und Druckdarstellung mitprüfen.

## Prüfung dieses Planartefakts

Vor der PLAN_ONLY-Rückgabe wird diese Datei erneut vollständig gelesen und auf Existenz, nicht leeren Inhalt, fünf lückenlos ab 1 nummerierte Slice-Abschnitte, exakte Änderungspfade sowie jeweils genau einen nicht leeren Akzeptanzkriterienabschnitt geprüft. Der native Ergebnisdatensatz enthält genau einen ausführbaren Slice für dieses Planartefakt; die fünf zukünftigen Produktslices verbleiben ausschließlich in diesem Dokument.

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
> Geprüft wurde der vollständige Diff (25568 Bytes, eine neue Datei docs/internal/f2-meldungen-rest-arbeitsplan.md, identisch mit plan_artifact_path und authorized_paths). Vollständigkeit: B-01 und W-01 stecken in Slice 1, H-01 und H-03 in Slice 2, H-04 in Slice 3, H-02 und H-05 in Slice 4, der Doku-Abgleich in Slice 5 (Handbuch.html, TECHNICAL.md, BALANCE_MODULES_README.md, tests/README.md sowie README.md). Die H-06-Tests sind auf die Slices 1 bis 4 verteilt: echter Import-Handler mit Replace-, Rollback- und CSV-Fall, keine stehen gebliebenen Berechnungsfehler, Browser-Vergleich von KPI und Handlungsanweisung, Dateievents ohne update()/clearError(), Fokus nicht auf BODY. Die Slices sind lückenlos ab 1 nummeriert und haben jeweils exakte Änderungspfade, Umsetzungsschritte und SOURCE-Akzeptanzkriterien. Unveränderte Verträge sind festgehalten: 6000 ms Toastdauer, mindestens 3000 ms Jahresabschluss-Toast, Wortlaut, Fehlercodes, keine Engine- oder Datenmodelländerungen. Fehlerpfade: Ein Fehler der Wiederherstellungsvorschau darf den Aktionsfehler nicht verdecken, rollback_failed behauptet keine Reparatur, PREVIEW schreibt nichts. Validierung ist geregelt: gezielte run-single-Läufe, npm test durch den Orchestrator, Browser-Smoke vor dem Merge. Die Attestation internal:work-plan-contract ist PASS mit future_slices=5 und passt zum Fingerprint.

Größtes Restrisiko:
> Nicht verifizierbar sind die repositorybezogenen Annahmen des Plans: die Lage von clearActionError('snapshots') in balance-binder.js, dass connectFolder() AbortError abfängt, dass #openDiagnosisBtn als Fokusanker existiert und dass die genannten Annual-Testdateien vorhanden sind. Außerdem nennt der Plan als Planungsbasis aadddd75…, die Anfrage aber base_commit 1b09e0c9…. Der Grund: Laut Manifest waren nur die fünf gelisteten Dateien zu lesen, und der Arbeitsbereich ist kein Git-Repository. Damit liegen weder Produktquellen noch Commit-Verlauf vor. Trifft eine Annahme nicht zu, muss der betroffene zukünftige Slice per SCOPE-EXTENSION-REQUESTED nachgeschärft werden.

Bruchbedingung:
> Der Plan wäre zu verwerfen, wenn der Diff weitere Pfade außer dem Planartefakt enthielte oder ein Punkt aus B-01, W-01 und H-01 bis H-06 keinem Slice zugeordnet wäre. Gleiches gilt, wenn ein Slice die Vorschau persistierend ausführte oder Meldungswortlaut, Toastdauer oder Importtransaktion änderte. Ebenso, wenn sich herausstellte, dass H-04 außer balance-binder.js und balance-storage.js weitere Dateien braucht oder die genannte Basis-Commit-Angabe auf einen anderen Codestand als den Zielbranch verweist.

Vorab-Risikoanalyse:
> Wahrscheinlichstes Scheitern in der Umsetzung: In Slice 1 werfen die vorhandenen Handler-Fixtures bei jedem update(). Dann belegt die Wiederherstellungsvorschau nichts, oder die Tests verlangen fälschlich, dass sie scheitert. Der Plan begegnet dem mit phasengebundener Fehlerinjektion und einem Test mit echtem Main-Update. Zweites Risiko: In Slice 3 könnte das Verlagern von clearActionError in balance-storage.js eine ungewollte Kopplung zwischen Storage und Renderer erzeugen oder den Rückgabevertrag doch ändern. Drittes Risiko: Slice 4 verwendet #openDiagnosisBtn als Fokusanker, der im Layout womöglich nicht nahe bei den Meldungen liegt. Viertes Risiko: Der Browser-Smoke läuft erst außerhalb der Sandbox, sodass Browserfehler spät auffallen.
<!-- audit:approval:end -->
