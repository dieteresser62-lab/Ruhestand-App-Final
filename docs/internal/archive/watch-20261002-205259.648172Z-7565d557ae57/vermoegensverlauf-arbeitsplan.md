# Arbeitsplan: Vermögensverlauf im Balance-Teil

## Auftrag und Ausführungsgrenze

- Zielbranch: `feature/vermoegensverlauf`.
- Geprüfter Ausgangscommit: `a942453fe24cd84e80070eebac44c00a37bc48c6`.
- Dieser Schritt ist `PLAN_ONLY`: Ausschließlich dieses Arbeitsplandokument wird geschrieben. Die folgenden vier Slices beschreiben die spätere Produktumsetzung und werden in diesem Lauf nicht ausgeführt.
- Die Reihenfolge ist verbindlich: Slice 1 bis Slice 4. Jeder Slice nennt seine vollständige, exakte Änderungspfadliste. Neue Dateien sind ausdrücklich bezeichnet; andere Pfade brauchen eine Scope-Erweiterung durch den Orchestrator.
- Keine neuen Abhängigkeiten. Keine Änderungen an Engine-Semantik, Workerpfaden, `engine.js`, `dist/`, Desktop-Binaries, Projektregeln oder Buildkonfiguration. Branchtransaktionen, Commits, vollständige Testsuite und Freigabe liegen beim Orchestrator beziehungsweise den zugewiesenen Prüfern.

## Repositorybefund und Integrationspunkte

1. `app/balance/balance-main.js` synchronisiert Profilwerte, liest `UIReader.readAllInputs()` und wendet `updateProfilverbundGlobals()` an. Das erfolgreiche `update()` liefert genau diese tatsächlich verwendeten Werte als `result.inputData` zurück. Das ist die gemeinsame Erfassungsquelle für Einzelprofil, Tranchenaggregation und Profilverbund; formatierte DOM-Texte und simulierte `modelResult.newState` sind keine Vermögensquelle.
2. `app/balance/balance-binder.js` führt beide Jahresknöpfe über `createSnapshotHandlers()` in `app/balance/balance-binder-snapshots.js`. Der Coordinator prüft das abgeschlossene Kalenderjahr, bestätigt einen Recovery-Snapshot, führt Jahresdaten und Ausgabenwechsel aus, ruft `commitLiveState()` auf und finalisiert `annualPeriodMetadata`. `app/balance/balance-annual-period.js` liefert die bestehende Identität `calendar-year:YYYY` und die Sperren gegen Wiederholung und unvollständige Recovery.
3. Der Balance-State unter `CONFIG.STORAGE.LS_KEY` ist bereits profilbezogen. `profile-live-storage.js` übernimmt ihn beim Profilwechsel; die Registry enthält ihn pro Profil als JSON-String. Balance-Export klont den vollständigen State, Profilbundle exportiert die Registry, Komplettbackup und Snapshot-Archiv sichern erlaubte Persistenzrecords. Ein optionales State-Feld benötigt deshalb keinen neuen Storage-Key und keine Erweiterung der Key-Allowlisten.
4. Validierungsgrenzen sind `StorageManager.loadState()/saveState()`, `normalizeBalanceImportDocument()`, `loadStoredBalanceStateFromData()` und `validatePersistenceDomainRecords()`. Der neue Datenvertrag muss an diesen Grenzen gelten, auch für inaktive Registryprofile.
5. `app/shared/persistence-facade.js` bietet `replaceRecordsTransactional()` mit Backend-/Cache-Readback und Rollback. Die Erfassung kann damit den Live-Balance-State und die dazugehörige Registry zusammen bestätigen, ohne andere Records zu ersetzen.
6. Der Simulator erzeugt bereits SVG direkt, etwa `renderParetoFrontier()` in `app/simulator/simulator-visualization.js`. Balance verwendet dieselbe Browsertechnik mit einem eigenen fachlich passenden SVG-Renderer; keine Diagrammbibliothek und kein Import der Simulator-Controller.
7. `tests/run-tests.mjs` entdeckt neue `*.test.mjs` automatisch. Fokussierte Läufe verwenden `node tests/run-single.mjs tests/<datei>.test.mjs`; Assertions müssen vom vorhandenen Runner gezählt werden.

## Verbindlicher Produkt- und Datenvertrag

### Inhalt, Werte und Zuordnung

- Optionales Top-Level-Feld `wealthHistory` im Balance-State, außerhalb von `inputs` und `lastState`: `{ schemaVersion: 1, entries: [...] }`. Fehlt das Feld, ist der Verlauf leer; Laden allein erzeugt keine Einträge und keine synthetische Historie.
- Jeder Eintrag enthält `id`, `asOf` als echtes Kalenderdatum `YYYY-MM-DD`, `reason` (`annual_close` oder `manual`), `periodId` (Jahresperiode oder `null`), `tagesgeld`, `geldmarktEtf`, `depotwertAlt`, `depotwertNeu`, `aktienEtf` und `total` in nominalen Euro.
- `aktienEtf = depotwertAlt + depotwertNeu`; `total = tagesgeld + geldmarktEtf + aktienEtf`. Nur diese beauftragten Vermögensgruppen gehören zur Summe. Gold, separate Anleihen, Einnahmen und simulierte Verkaufs-/Entnahmeergebnisse werden nicht hinzuaddiert. Der Pflegebucket ist eine Zweckbindung innerhalb der vorhandenen Werte und wird weder zusätzlich addiert noch pauschal abgezogen.
- Werte stammen unverändert aus einem frischen erfolgreichen Balance-Update nach Profil- und Tranchenaggregation. Persistierte Beträge werden nicht auf ganze Euro gerundet; die Anzeige verwendet vorhandene Währungsformatter. Nichtnegative endliche Zahlen, gültige Daten, unterstützte Schema-/Anlasswerte und eindeutige Identitäten sind verpflichtend. Abgeleitete Summen werden beim Import validiert; nur numerisches Gleitkomma-Rauschen bis `8 * Number.EPSILON * max(1, abs(erwarteteSumme))` ist tolerierbar.
- Der Verlauf gehört ausschließlich zum aktiven Profil, in dessen Balance-Ansicht er erfasst wurde. Auch ein dort angezeigter Profilverbundstand wird einmal in diesem Verlauf gespeichert und nicht in die Verläufe aller Verbundmitglieder kopiert. Verbundwechsel verändern gespeicherte Stände nicht rückwirkend. UI und Doku benennen diese Zuordnung und die drei enthaltenen Gruppen.
- Die Profilidentität wird vor jeder asynchronen Erfassung festgehalten und vor dem Schreiben erneut geprüft. Ein Wechsel zu einem anderen aktiven/current Profil bricht die Erfassung ab; Werte dürfen niemals im inzwischen aktiven fremden Profil landen.
- Ein vorhandener beschädigter Verlauf ist ein sichtbarer Validierungsfehler. Er wird weder als leer behandelt noch durch Erfassung überschrieben. Fehlendes Feld ist dagegen der erlaubte Legacy-Fall. Bestehende Export-Warnungs-/Recoverymöglichkeiten bleiben erhalten.

### Stichtag und Ersetzungsregeln

- Manuell: Stichtag ist das lokale Kalenderdatum des Klicks, nicht der UTC-Tag von `toISOString()`. Identität `manual:YYYY-MM-DD`, `reason: manual`, `periodId: null`. Derselbe Tag ersetzt nur den manuellen Eintrag dieses Tages; ein Jahresabschluss-Eintrag am selben Tag bleibt separat erhalten. Ein anderer Tag legt einen weiteren Eintrag an.
- Jahresabschluss: Identität `annual:YYYY`, `periodId: calendar-year:YYYY`, Stichtag `YYYY-12-31`, `reason: annual_close`. Maßgeblich ist das bereits validierte `planning.plan.targetYear`, nicht das Ausführungsjahr oder das nach dem Rollover gewählte Ausgabenjahr.
- Die Jahreswerte werden aus dem erfolgreichen periodengebundenen `commitLiveState()`-Ergebnis übernommen: nach Aktualisierung der Jahresdaten, vor einer Interpretation simulierter Engine-Vermögensstände als realer Bestand. Diese Definition entspricht den zu diesem Zeitpunkt in Balance verwendeten Beständen; es erfolgt keine zusätzliche historische Bewertung.
- Genau ein Jahresabschluss-Eintrag je Periode. Ein bereits erfolgreicher Abschluss ist unverändert ein No-op, einschließlich Verlauf. Die Erfassung ist Teil der finalen Abschlussbestätigung und niemals ein separater ungeprüfter Nachlauf.
- Nutzung beginnt 2026: Es entstehen keine Stände mit einem Stichtag vor `2026-01-01`, keine Rückrechnung aus `endeVJ*` und kein Nachtragen alter bereits abgeschlossener Perioden. Ein bestehender Jahresprozess für ein Jahr vor 2026 behält sein Verhalten und erzeugt keinen Verlaufseintrag. Der erste automatische Stand für 2026 entsteht beim bestehenden Abschlussprozess im Jahr 2027. Manuelle Stände sind bereits 2026 möglich.

### Abschluss, Fehler und Speichern

- Jahresabschluss-Eintrag und `annualPeriodMetadata.lastCommittedPeriod` werden im selben finalen Balance-State bestätigt. Die aktive Registrykopie erhält denselben Verlauf. Erfolg wird erst nach bestätigter Persistenz gemeldet.
- Fehler vor fachlichem Abschluss erzeugen keinen erfolgreichen Jahresstand. Ein Fehler bei der finalen Verlauf-/Metadatenpersistenz lässt den bisherigen Verlauf und den vorhandenen Pending-/Recoveryzustand stehen beziehungsweise stellt sie wieder her; es darf keinen erfolgreichen Periodenmarker ohne den vorgesehenen Eintrag geben.
- Bestehende Recovery bleibt maßgeblich: `incomplete_recovery` blockiert einen weiteren Jahreslauf bis zum Restore des bestätigten Snapshots. Restore stellt auch den damaligen Verlauf wieder her; ein anschließender Abschluss erzeugt genau einen Eintrag. Dieser Auftrag baut keinen neuen direkten Resume-Mechanismus und lockert keine Jahresperiodensperre.
- Manuelle Erfassung und Jahresabschluss teilen eine Schreib-/In-Flight-Koordination. Während eines laufenden oder recovery-pflichtigen Jahresprozesses wird keine manuelle Zwischenstandserfassung zugelassen. Doppelklicks und späte Antworten dürfen keine veralteten Werte zurückschreiben.
- Die Erfassung schreibt nur Verlauf und, beim Jahresabschluss, dessen Abschlussmetadaten. Sie commitet nicht zusätzlich einen Engine-Jahresschritt. Für manuelle Werte wird `PREVIEW` synchron frisch ausgeführt, statt einen älteren debounced Zustand zu verwenden.
- Für neue Verlaufsschreibvorgänge wird die vorhandene transaktionale Facade mit exakt eingegrenzten Keys `CONFIG.STORAGE.LS_KEY` und `PROFILE_STORAGE_KEYS.registry` genutzt. Die Registry wird aus dem aktuellen zulässigen Profilbestand aufgebaut; andere Profile und alle übrigen State-Felder bleiben erhalten. Erforderliche Flushes, Profil-/State-Rechecks und bestätigter Readback gehören zur Erfassungsfunktion; die Facade selbst wird nicht umgebaut.
- Balance-Export/-Import, Profilbundle, Komplettbackup und Standard-Snapshot-Restore transportieren das Feld über die bestehenden State-/Recordpfade. Ältere unterstützte Balance-Exporte, Legacy-Profilbundles und Backups ohne Feld bleiben importierbar. Ein Import ohne Verlauf ersetzt ihn entsprechend dem bestehenden Replace-Vertrag durch einen leeren Verlauf; keine Vermischung mit der bisherigen Historie.

### Anzeige

- Eigener Bereich „Vermögensverlauf“ in der Balance-Ergebnisspalte mit Knopf „Stand jetzt erfassen“, Diagramm, Gruppenlegende und kurzer Erläuterung der Profilzuordnung.
- SVG mit gestapelten Säulen für Liquidität, Geldmarkt und Aktien-ETF. Für unregelmäßige Einzelmessungen werden keine ungemessenen Zwischenwerte interpoliert. Datum und Euro-Skala sind sichtbar; die Säulenhöhe entspricht der gespeicherten Summe.
- Aufbereitung sortiert aufsteigend nach `asOf`, bei gleichem Datum deterministisch Jahresabschluss vor manuell und danach nach `id`. Beide Einträge desselben Tages sind einzeln erkennbar.
- Anlass wird durch Text und zusätzliche Form-/Rahmenkennzeichnung unterscheidbar, nicht allein durch Farbe. Summe, Gruppen sowie Alt-/Neu-Depot sind zusätzlich als zugängliche Datentabelle ablesbar, auch per Tastatur und ohne Hover.
- Einträge werden bei Start/Reload, nach erfolgreicher Erfassung und nach Import/Restore aus dem aktuellen Profilstate gerendert. Eine neue Datenbasis entfernt auch alte Diagramm-/Tabelleninhalte; kein Profilübertrag im Renderer.
- Ohne Einträge: kurzer Hinweis auf „Stand jetzt erfassen“ und automatische Jahresabschlussstände ab dem Abschlussjahr 2026. Ein einzelner Stand und vollständig nullwertige Stände sind gültige Anzeigefälle. Schmale Ansichten haben ein skalierendes SVG und bei Bedarf nur innerhalb des Diagramm-/Tabellenbereichs Scrollen.

## Zukünftige Umsetzung

### Slice 1 - Verlaufvertrag und Persistenzgrenzen

**Ziel**
Den optionalen Verlauf als validierten profilbezogenen State-Vertrag einführen und alle Import-/Ladewege rückwärtskompatibel absichern.

**Exakter Änderungspfad**
- `app/balance/balance-binder-imports.js`
- `app/balance/balance-storage.js`
- `app/profile/profile-state.js`
- `app/shared/persistence-backup.js`
- `tests/balance-storage-contract.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/persistence.test.mjs`
- `tests/profile-state.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/wealth-history-contract.test.mjs`
- `types/wealth-history-contract.js`

**Umsetzung**
- Neu: `types/wealth-history-contract.js` als DOM-/Storage-freier Vertrag mit Schema-/Anlasskonstanten, Datums-/Identitätsprüfung, Eintragsbildung, unverändernden Upsertfunktionen und Verlaufvalidierung. Fehlendes Feld als leer auswerten; vorhandene falsche Typen, Versionen und doppelte Identitäten ablehnen.
- Den Validator in die oben beschriebenen State-/Importgrenzen einbinden. `profile-state.js` meldet ungültige Historie entsprechend seinem vorhandenen `CORRUPT`-Vertrag; Backupvalidierung prüft Live-State und jedes Registryprofil. Keine neue Key-Policy und keine Erhöhung der äußeren Export-/Bundleversion nur für das optionale Feld.
- Neu: `tests/wealth-history-contract.test.mjs`. Bestehende Persistenz-/Profil-/Importtests um echte Roundtrips und Negativpfade ergänzen, ausschließlich mit synthetischen Finanzwerten.

**Akzeptanzkriterien**
- SOURCE: Für Tagesgeld 12000, Geldmarkt 23000, Alt-Depot 34000 und Neu-Depot 45000 entstehen Aktien-ETF 79000 und Summe 114000; nullwertige Komponenten bleiben gültig, das Eingabeobjekt bleibt unverändert.
- SOURCE: Zwei manuelle Erfassungen am selben lokalen Tag ersetzen genau einen manuellen Record; anderer Tag und Jahresabschluss am selben Datum bleiben eigenständige Records. Jahres-Upsert ist anhand der Periode eindeutig und eine Wiederholung verändert keinen bereits erfolgreichen Jahresstand.
- SOURCE: Ungültige Kalenderdaten einschließlich normalisierter Überlaufdaten, Stände vor 2026, widersprüchliche IDs/Perioden/Anlässe, doppelte IDs, negative/nichtendliche Beträge, falsche Summen und unbekannte Versionen werden abgelehnt und niemals still begrenzt.
- SOURCE: Speichern/Laden, Balance-V2-Export/-Import, Profilbundle-Export/-Import und Komplettbackup-Export/-Import erhalten alle Verlauffelder. Zwei Profile behalten getrennte Verläufe; auch ein beschädigter Verlauf eines inaktiven Profils wird vor Importwrites erkannt.
- SOURCE: Unterstützte Balance-V1-/Legacy-Exporte, Legacy-Profilbundles und Komplettbackups ohne Verlauf bleiben importierbar und zeigen eine leere Historie; der bisherige Verlauf wird bei einem Replace ohne Feld nicht übernommen.

**Fokussierte Validierung**
- `node tests/run-single.mjs tests/wealth-history-contract.test.mjs`
- `node tests/run-single.mjs tests/balance-storage-contract.test.mjs`
- `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`
- `node tests/run-single.mjs tests/profile-state.test.mjs`
- `node tests/run-single.mjs tests/profile-storage.test.mjs`
- `node tests/run-single.mjs tests/persistence.test.mjs`

### Slice 2 - Bestände beim Jahresabschluss sicher erfassen

**Ziel**
Den vorhandenen periodengebundenen Jahresabschluss mit einer dauerhaft bestätigten, profilbezogenen Verlaufserfassung verbinden.

**Exakter Änderungspfad**
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-binder.js`
- `app/balance/balance-wealth-history.js`
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/balance-wealth-history.test.mjs`

**Umsetzung**
- Neu: `app/balance/balance-wealth-history.js` für Erfassungsquelle, Profil-/State-Rechecks, gemeinsame Schreibkoordination und transaktionale Aktualisierung des Verlaufs im Live-State samt aktiver Registrykopie. Abhängigkeiten übergeben, damit Fehler und Zeitabläufe deterministisch prüfbar sind.
- In `createSnapshotHandlers()` den erfolgreichen `commitLiveState()`-Rückgabewert nutzen. Aus `result.inputData` und `planning.plan.targetYear` den Jahresrecord bilden und zusammen mit den abgeschlossenen Metadaten finalisieren. Nicht für eine Erfassung allein erneut die Engine mit `COMMIT_PERIOD` ausführen.
- `balance-binder.js` verbindet den Erfassungsdienst mit `update()`, Facade und Profilkontext. Die beiden Jahresknöpfe bleiben am selben Coordinator. Der letzte Pending-State und vorherige Verlauf bleiben bei einem Fehler wiederherstellbar; Fehler nach bereits bestätigtem fachlichem Abschluss, etwa beim Rendern der Snapshotliste, erzeugen keinen zweiten Record und keine falsche Behauptung, die Erfassung sei ungespeichert.
- Zeitreferenz für Jahresprüfungen testbar injizieren, Standard bleibt lokale Systemzeit. Feste Testzeit Januar 2027 mit Zieljahr 2026 statt von der realen Ausführungszeit abhängiger neuer Tests verwenden.

**Akzeptanzkriterien**
- SOURCE: Ein simulierter vollständiger Abschluss 2026 bei Referenzdatum 2027 liefert genau `annual:2026` am 2026-12-31 mit den erwarteten vier Quellbeträgen, beiden Summen und `calendar-year:2026`; Live-State und aktive Registry sind nach dem Readback gleich.
- SOURCE: Die Quelle entspricht `commitLiveState().inputData` einschließlich Verbund-/Tranchenaggregation, selbst wenn sichtbare Eingabefelder, frühere gespeicherte Inputs und simulierte `newState`-Beträge bewusst andere Werte enthalten. Andere Profilverläufe werden nicht verändert.
- SOURCE: Wiederholter Jahresknopf, zweiter Jahresknopf und Doppelklick erzeugen keine zweite Jahreserfassung und keinen zusätzlichen Engine-Periodencommit. Ein Abschluss vor 2026 erzeugt keinen Verlaufseintrag und behält seinen bestehenden Periodenvertrag.
- SOURCE: Snapshotfehler, Fehler im Jahresdatenschritt sowie Fehler bei Verlaufwrite/Readback/Flush erzeugen keinen falschen erfolgreichen Jahresstand. Der finale Persistenzfehler bewahrt vorherige Historie und Pending-Recovery; ein erneuter Klick bleibt bis zum Restore blockiert.
- SOURCE: Nach tatsächlichem Snapshot-Restore und anschließendem erfolgreichen Abschluss existiert genau ein Jahresrecord. Vorherige manuelle Records bleiben erhalten, soweit sie im wiederhergestellten Snapshot enthalten waren.
- SOURCE: Ein Profilwechsel während eines wartenden Persistenz-/Jahresschritts bricht die Verlaufsschreiboperation ohne Eintrag im fremden Profil ab. Manuelle und jährliche Schreibvorgänge können sich nicht gegenseitig mit veralteten States überschreiben.

**Fokussierte Validierung**
- `node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs`
- `node tests/run-single.mjs tests/balance-wealth-history.test.mjs`
- `node tests/run-single.mjs tests/balance-annual-period.test.mjs`
- `node tests/run-single.mjs tests/balance-preview-commit-contract.test.mjs`
- `node tests/run-single.mjs tests/balance-binder-snapshots.test.mjs`

### Slice 3 - Manuelle Erfassung und SVG-Verlaufsdiagramm

**Ziel**
Den Verlauf in Balance sichtbar machen und aktuelle Stände über den neuen Knopf sicher erfassen.

**Exakter Änderungspfad**
- `Balance.html`
- `app/balance/balance-binder.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history-metrics.js`
- `app/balance/balance-wealth-history-renderer.js`
- `app/balance/balance-wealth-history.js`
- `css/balance.css`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/balance-wealth-history.test.mjs`

**Umsetzung**
- Neu: `balance-wealth-history-metrics.js` als reine Aufbereitung für Reihenfolge, drei Stapelgruppen, Stapelgrenzen, Summe, Teildepotwerte und Anlasskennzeichnung. Eingaben validieren; gespeicherte Reihenfolge und Beträge nicht verändern.
- Neu: `balance-wealth-history-renderer.js` mit skalierendem SVG, Legenden, eindeutigem Anlass, zugänglicher Tabelle und Leer-/Fehlerzustand. Vorhandene Balance-Währungsformatierung und SVG-Technik des Simulators verwenden; sichere Text-/DOM-Ausgabe statt ungeprüfter Importtexte in HTML.
- HTML-Bereich und DOM-Referenzen ergänzen, einmalige Listenerbindung über den Binder. Manuell frisches `update({ mode: PREVIEW })` auswerten, das lokale Klickdatum festhalten, den Dienst aus Slice 2 nutzen und erst nach bestätigtem Speichern Erfolg anzeigen und neu rendern.
- Verlauf bei Initialisierung und Aktualisierung aus dem aktuellen Profilstate laden. Auch Import-/Restorepfade mit Reload beziehungsweise erneutem Update müssen neue/entfernte Daten anzeigen. Keine automatische Erfassung bei normalen Eingabeänderungen oder Preview.

**Akzeptanzkriterien**
- SOURCE: „Stand jetzt erfassen“ speichert einen aktuellen Stand; erneuter Klick am selben Tag ersetzt seine Werte, am nächsten lokalen Tag wächst die Historie um einen Record. Jahresrecord am selben Tag bleibt erhalten. Ein Klick ohne erfolgreiche aktuelle Balance-Validierung schreibt nichts.
- SOURCE: Die manuelle Erfassung verwendet das aktuelle aggregierte `result.inputData` trotz noch ausstehender Debounce-Aktualisierung; sie erzeugt keinen zusätzlichen Engine-Periodencommit. Rund um UTC-Mitternacht bleibt das lokale Klickdatum maßgeblich.
- SOURCE: Unsortierte synthetische Records werden chronologisch mit deterministischer Gleichstandsregel aufbereitet. Die drei Stapelsegmente, deren kumulierte Grenzen und die ausgewiesene Summe entsprechen den Quellen; Alt-/Neu-Depot werden nicht doppelt gestapelt.
- SOURCE: Diagramm und Tabelle unterscheiden Jahresabschluss/manuell durch lesbare Bezeichnungen und zusätzliche nichtfarbliche Kennzeichnung. Datum, Euro-Skala, Summe und beide Teildepots sind zugänglich; leere, einzelne und nur nullwertige Verläufe rendern ohne Division durch null oder ungültige SVG-Koordinaten.
- SOURCE: Schreibfehler, Profilwechsel und laufende/Pending-Jahresprozesse verhindern falsche Erfolgsmeldungen und fremde oder vorläufige Records. Nach Abschluss oder Fehler wird die Bedienung korrekt entsperrt; Listenerverdopplung erzeugt keine zweite Erfassung.
- SOURCE: Reload und Import eines Profils ohne Historie entfernen bisherige Chart-/Tabelleninhalte und zeigen den Hinweis. Ein beschädigter Verlauf zeigt einen Fehler und wird durch den Knopf nicht überschrieben.

**Fokussierte Validierung**
- `node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs`
- `node tests/run-single.mjs tests/balance-wealth-history.test.mjs`
- `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`
- `node tests/run-single.mjs tests/balance-smoke.test.mjs`
- `node tests/run-single.mjs tests/profilverbund-balance.test.mjs`

### Slice 4 - Browserdurchstich und Dokumentations-Sync

**Ziel**
Die fertige Funktion über reale Balance-Bedienung prüfen und Nutzer-/Technikdokumentation mit der Umsetzung synchronisieren.

**Exakter Änderungspfad**
- `Handbuch.html`
- `README.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/browser-smoke.test.mjs`

**Umsetzung**
- Vorhandene Browser-Smokes gezielt um den echten Balance-Verlauf ergänzen: manuelles Erfassen/Ersetzen, Reload, Profilisolation, Import ohne Verlauf und SVG-/Tabellenanzeige. Den vorhandenen mit kontrollierten Datenquellen betriebenen Jahresabschlussfall um Record-/Wert-/Wiederholungsassertions erweitern; keine Live-Netzabhängigkeit einführen.
- Handbuch und README kurz um Bedienung, lokale Tagesersetzung, Jahresstichtag, Start 2026, enthaltene Gruppen, Profilverbundzuordnung und Export/Backup ergänzen. Recovery-Hinweise bleiben zum vorhandenen Snapshotverfahren konsistent.
- Technische Referenz und Balance-Modulübersicht um neue Module, `wealthHistory`-Schema, Erfassungsquelle und Persistenz-/Idempotenzgrenzen erweitern; Modulanzahl/Inventar an den tatsächlich fertigen Stand anpassen. Testreferenz um die neuen gezielten Prüfungen ergänzen.
- Produktfehler aus diesem Durchstich werden innerhalb der jeweiligen früheren Slice-Scopes korrigiert; diese Dokumentations-/Test-Slice gibt keine pauschale Produktpfaderweiterung frei.

**Akzeptanzkriterien**
- SOURCE: Der Browserdurchstich betätigt den echten Knopf und zeigt nach Reload dieselben gespeicherten Werte. Wiederholte Tageserfassung, Profilwechsel und Legacy-Import zeigen die jeweils richtige Anzahl und Quelle ohne Reste des zuvor angezeigten Profils.
- SOURCE: Der kontrollierte echte Jahresabschlussfall bestätigt genau einen Jahresrecord mit erwarteten Beständen und korrektem abgeschlossenen Jahr; Wiederholung und der vorhandene Recovery-Test zeigen keine Duplikate.
- SOURCE: Bei schmaler Ansicht, per Tastatur und mit einem einzelnen beziehungsweise nullwertigen Stand bleiben die Bedienung, Summe und Anlass zugänglich; es entsteht kein seitenweiter horizontaler Überlauf durch das Diagramm.
- SOURCE: README, Handbuch, TECHNICAL und Balance-Modulübersicht beschreiben dieselben tatsächlich implementierten Erfassungs-/Profil-/Recoveryverträge; die Testdoku nennt die neuen Tests und das separate Browsergate.
- SOURCE: Der Orchestrator bestätigt `npm test` auf dem fertigen Stand ohne Fehler; das separate Browsergate wird außerhalb einer gegebenenfalls browser-/portbeschränkten Agentensandbox ausgeführt und dokumentiert.

**Fokussierte Validierung**
- `node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs`
- `node tests/run-single.mjs tests/balance-wealth-history.test.mjs`
- `node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs`
- Separates Browsergate außerhalb einer beschränkten Sandbox: `npm run test:browser`.
- Vollständiges Gate durch den Orchestrator: `npm test` nach jedem Slice und auf dem final geprüften Stand.

## Prüfschwerpunkte und Abschluss

- Gegenprüfung insbesondere gegen falsche Vermögensquellen, doppelte Alt-/Neu-Addition, Verbund-Doppelzählung, lokale/UTC-Datumsverschiebung, falsches Rolloverjahr und Schreibfehler zwischen fachlichem Commit und Abschlussmarker.
- Fehler injizieren beim Snapshot, Jahresdatenabruf, transaktionalen Schreiben und Readback. Ausstehende Promises für Doppelklick/Profilwechsel verwenden. Historie, Profile, Pendingmarker und vorhandene fachliche State-Felder vor/nach Fehler unabhängig vergleichen.
- Snapshot-Restore ist ein echter Zustandswechsel und darf Historie auf den Snapshotstand zurücksetzen. Kein Anspruch auf append-only Historie über absichtliche Restore-/Replace-Operationen hinweg; die Einmaligkeit gilt im jeweiligen gespeicherten Profilzustand.
- Synthetische Daten und feste Zeitreferenzen verwenden. Keine persönlichen Exporte, Logs oder lokalen Finanzbestände in Tests/Dokumentation übernehmen.
- Nur gezielte Tests in der Agentensandbox. Nicht ausführbare Browser-/Port-/Unterprozessprüfungen konkret berichten; `npm test` führt allein der Orchestrator außerhalb dieser Sandbox aus. Im aktuellen Planungsschritt ist lediglich das geschriebene Dokument auf Existenz, Inhalt und Parserstruktur zu prüfen, keine Produkttestfreigabe zu behaupten.
- Fertig ist die spätere Umsetzung nach grünen Fach-/Persistenz-/Diagrammtests, dem dokumentierten Browserdurchstich, synchroner Dokumentation und unabhängiger Prüfung aller vier Slices sowie des Gesamtzweigs.

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
> Geprüft wurde der vollständige Diff (26972 Bytes, zwei Teile). Er enthält genau eine neue Datei, docs/internal/vermoegensverlauf-arbeitsplan.md, und damit nur den autorisierten Pfad. Produktcode, Tests und Konfiguration bleiben unberührt. Das Dokument enthält vier ab 1 fortlaufend nummerierte Slices. Jeder Slice hat einen exakten Änderungspfad, Akzeptanzkriterien mit SOURCE-Bezug und Befehle der Form node tests/run-single.mjs; dazu kommen npm test und npm run test:browser. Das passt zur Attestation internal:work-plan-contract (PASS, future_slices=4, changed_paths=1). Alle Anforderungen der Idee sind abgedeckt. Datenfelder: Stichtag, Anlass, Tagesgeld, Geldmarkt, Alt- und Neu-Depot, Aktien-ETF und Summe. Die Quelle ist result.inputData nach Profilverbund- und Tranchenaggregation. Pro Periode gibt es genau einen Jahresabschluss-Eintrag mit der ID annual:YYYY. Eine Wiederholung ist ein No-op. Fehler- und Recovery-Pfade sind über incomplete_recovery und Snapshot-Restore abgedeckt. Die manuelle Tagesersetzung nutzt das lokale Datum statt UTC. Persistenz, Export, Profilbundle und Backup sind eingeplant, einschließlich Import älterer Exporte ohne Verlauf. Das SVG-Diagramm folgt der vorhandenen Simulator-Technik und kommt ohne neue Abhängigkeiten aus. Die Diagrammaufbereitung wird getestet. Handbuch, README und TECHNICAL werden synchronisiert. Resume und Idempotenz sind adressiert: Verlauf und lastCommittedPeriod werden im selben finalen State transaktional bestätigt, erst danach wird Erfolg gemeldet. Ein Profilwechsel wird vor dem Schreiben erneut geprüft.

Größtes Restrisiko:
> Die Repository-Behauptungen des Plans lassen sich aus dem bereitgestellten Snapshot nicht prüfen. Der Snapshot enthält nur den Diff des Arbeitsplans, keine Produktdateien. Das betrifft: Felder in result.inputData wie Geldmarkt und depotwertAlt/Neu, den Rückgabewert von commitLiveState(), replaceRecordsTransactional() und die Existenz der rein zur Validierung genannten Testdateien (z. B. tests/balance-annual-period.test.mjs, tests/balance-binder-snapshots.test.mjs). Benötigt die Zeitinjektion für Jahresprüfungen tatsächlich Änderungen in app/balance/balance-annual-period.js, fehlt dieser Pfad in Slice 2. Das würde später eine Scope-Erweiterung erfordern.

Bruchbedingung:
> Der Plan scheitert, wenn eine dieser Annahmen nicht zutrifft: result.inputData liefert die aggregierten Bestände nicht wie beschrieben; commitLiveState() persistiert bereits den finalen Marker, sodass Verlauf und Periodenmarker nicht atomar zusammen bestätigt werden können; ein beschädigter wealthHistory führt an der loadState-Grenze dazu, dass der gesamte Balance-State unbrauchbar wird, statt einen sichtbaren und wiederherstellbaren Fehler zu melden.

Vorab-Risikoanalyse:
> Wahrscheinlichster späterer Fehlschlag: In Slice 2 erzwingt die bestehende Struktur von createSnapshotHandlers/commitLiveState einen separaten Schreibschritt für den Abschlussmarker. Zwischen fachlichem Commit und Verlaufseintrag entsteht dann ein Fenster, in dem ein Marker ohne Eintrag möglich ist. Ebenso kann eine nötige Änderung an balance-annual-period.js oder an Profilmodulen außerhalb der festgelegten Slice-Pfade liegen. Die Slice-Reviews müssen daher atomare Bestätigung, Readback und Profil-Recheck anhand echter Fehlerinjektionstests belegen.
<!-- audit:approval:end -->
