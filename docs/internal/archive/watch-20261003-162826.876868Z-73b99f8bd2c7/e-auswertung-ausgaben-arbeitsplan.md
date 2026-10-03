# Arbeitsplan: Auswertung mit Jahresausgaben und automatischer Verlaufserfassung

## Auftrag und Ausführungsgrenze

Zielbranch: `feature/auswertung-ausgaben`. Untersuchte Ausgangsbasis: `026eac0679c8bb52867dbfcd0bf10ef030656c76`.

Dieser PLAN_ONLY-Schritt schreibt ausschließlich dieses Dokument. Die folgenden fünf Slices sind zukünftige Produktarbeit und werden erst nach Planprüfung ausgeführt. Keine Branchtransaktionen, Commits oder Änderungen an Produktdateien in diesem Schritt. Auch künftig bleiben Engine, generierte Artefakte und die Speicherformate von Ausgaben und Vermögensverlauf unverändert. Der Tranchenvertrag wird ausdrücklich um genau ein optionales Kurszeitfeld erweitert, damit die geforderte Automatik mit ETF-Beständen produktiv funktioniert. Die vorhandene unversionierte `.gemini`-Änderung bleibt unangetastet.

Produktziel: Der vierte Balance-Tab heißt „Auswertung“, enthält zuerst den bestehenden Vermögensverlauf und darunter eine lesende Übersicht „Ausgaben je Jahr“. Erfolgreiche Ausgabenimporte versuchen anschließend genau eine Erfassung nach dem bestehenden unterjährigen Speichervertrag. Unbekannte beziehungsweise alte Kurse verhindern diese automatische Erfassung, ohne den Import rückgängig zu machen.

## Belegte Ausgangslage und abgeleitete Entscheidungen

### Ausgaben, Profile und Monatszählung

- `app/balance/balance-expenses-storage.js`: `EXPENSES_STORAGE_KEY` ist `balance_expenses_v1`; der Store enthält `version`, `activeYear`, `years[year].months[month].profiles[profileId]`. `loadExpensesStoreResult()` unterscheidet `ok`, `empty`, `corrupt` und erhält den beschädigten Rohinhalt. `getExpensesYearData()` und `getExpensesMonthData()` erzeugen fehlende Container; die neue lesende Projektion darf diese mutierenden Helfer nicht verwenden.
- `app/balance/balance-expenses.js`: `getProfiles()` nutzt `loadProfilverbundProfiles()` aus `app/profile/profilverbund-balance.js` für die sichtbaren Profilspalten. `updateSummary()` übergibt dagegen das gesamte `yearData` an `computeYearStats()`, ohne Profilfilter. `refreshExpensesTableValues()` in `app/balance/balance-expenses-renderer.js` benutzt für die Monatsgesamtwerte ebenfalls `sumMonthProfiles()`.
- `app/balance/balance-expenses-metrics.js`: `sumMonthProfiles()` addiert `computeSpent(categories).spent` aus **allen gespeicherten Profileinträgen eines Monats**, auch wenn ein Profil nicht mehr als sichtbare Spalte ausgewählt ist. Erst wird je Profil die vorzeichenbehaftete Kategoriesumme gebildet und deren Betrag genommen, dann über Profile summiert. Die neue Übersicht übernimmt exakt diese Zuordnung und rechnet nicht den Betrag einer gemeinsamen Kategoriesumme aus.
- `computeYearStats()` zählt heute nur Monate mit `monthTotal > 0`; `avgMonthly` teilt die Summe dieser Monate durch deren Anzahl. Diese Fachsemantik bleibt bestehen. Ein importierter Nullmonat trägt deshalb 0 Euro bei und erhöht die Kennzahl „Monate mit Daten“ nicht; ein kurzer Hinweis erläutert die bestehende Zählweise als „Monate mit Ausgaben“. Ein Nullimportjahr bleibt als Jahr mit importierten Profileinträgen sichtbar, mit Summe 0, Anzahl 0 und Ø 0. Rein durch Jahresauswahl angelegte leere Jahrescontainer erscheinen nicht als Ausgabenjahr.
- Jahresauswahl und `rollExpensesYear()` laufen über `setYear()`. Jahreswechsel, erfolgreiche Imports, Löschungen und bestätigter Recovery-Reset benötigen einen gemeinsamen Benachrichtigungspfad für die lesende Übersicht. Deren Aktualisierung darf keinen zusätzlichen Import oder Vermögensstand auslösen.
- `handleCsvImport()` liest derzeit eine Datei für einen ausgewählten Monat und ein Profil. Es gibt keinen produktiven Mehrmonats-/Mehrprofil-Batchimport. Kein neuer Batch-Importer wird eingeführt. Der nachgelagerte Rückruf gehört an die Erfolgsgrenze des gesamten Importvorgangs, niemals in eine Monats-/Profilschleife; ein synthetischer Vorgang mit mehreren Änderungen prüft dieses Prinzip zusätzlich.

### Budgetentscheidung: nur tatsächliche Ausgaben

- `app/balance/balance-main.js`, `update()`, berechnet das aktuelle Budget aus `fixedIncomeAnnual` und `modelResult.ui.spending.monatlicheEntnahme` und ruft `updateExpensesBudget()` auf. `app/balance/balance-update-pipeline.js`, `calculateExpensesBudget()`, bildet daraus Monatsbudget und dessen Zwölffaches. Das ist aktuelle Planung, kein historischer Jahresdatensatz.
- Der Ausgabenstore speichert Kategorien und `updatedAt`, kein Jahresbudget. `types/wealth-history-contract.js`, `createEntry()`, speichert Datum, Anlass, Perioden-ID und Vermögenskomponenten, ebenfalls kein Budget.
- `app/balance/balance-annual-period.js`, `completeAnnualPeriodCommit()`, speichert nur die letzte abgeschlossene Periode und entfernt den Pendingmarker. `app/balance/balance-binder-snapshots.js` erstellt vor dem Jahresprozess einen Recovery-Snapshot, verändert anschließend Planung/Marktdaten und finalisiert den Vermögensrecord. Die Records bilden keine verlässliche vollständige jährliche Budgethistorie. Recovery-Snapshots können fehlen oder gelöscht sein und sind kein Budgetregister.
- Daher erscheinen **keine Budget- oder Abweichungsspalten** und kein Budgetbalken. Erklärung in der Übersicht: „Die Übersicht zeigt tatsächliche Ausgaben. Jahresbudgets werden nicht historisch gespeichert und lassen sich für vergangene Jahre nicht verlässlich rekonstruieren.“

### Vermögenswerte und unveränderter Speicherweg

- `app/balance/balance-binder.js`, `initUIBinder()`, erstellt `createBalanceWealthHistoryService()` und `createManualWealthHistoryController()`. Die manuelle Erfassung startet `update({ mode: BALANCE_UPDATE_MODE.PREVIEW })`, also eine frische Eingabe-/Profilprojektion ohne Periodencommit.
- `app/balance/balance-wealth-history.js`, `captureManual()` und `persistEntry()`, verwenden diese `result.inputData`, warten auf Flush und bestätigen den transaktionalen Replace von Balance-State und Registrykopie ausschließlich des aktiven Profils. Kontextwechsel, Pending-Jahresabschluss und konkurrierende Änderungen sind bereits abgesichert; mehrere Dienstinstanzen teilen eine Schreibkoordination über `storage`.
- `types/wealth-history-contract.js`: lokaler Importtag mittels `formatLocalWealthHistoryDate()`, ID `manual:YYYY-MM-DD`, `reason: 'manual'`, `periodId: null`, Tagesersetzung mittels `upsertManualWealthHistory()`. Kein importierter Monatsstichtag und keine neuen Felder/Anlässe.
- Dieselben Vorschauwerte wie beim manuellen Knopf können bei aktivem Profilverbund aggregiert sein. Automatisch wird weder ein eigener Vermögensbegriff noch eine Beschränkung auf das importierte Ausgabenprofil eingeführt: Werte wie manuell, Speicherung beim aktiven Profil. Die Kursprüfung muss alle ETF-Bestände erfassen, die zu dieser konkreten Vorschau beitragen.
- `app/balance/balance-wealth-history-metrics.js` projiziert heute `manual` als „Manuell“. Nur das Anzeigelabel wird „Unterjährig“, ebenso Legende und SVG-Beschreibung in `Balance.html` und `balance-wealth-history-renderer.js`. Raute, gestrichelter Rahmen und Import-/Exportvalidierung bleiben erhalten.

### Kursdatum: belegte Quelle und notwendige rückwärtskompatible Erweiterung

- `app/tranches/tranchen-price-service.js`, Prüfung der Proxyantwort um Zeilen 192–221: `asOf` ist eine positive UTC-Unixsekunde; der Kursdienst liefert `symbol`, `price`, `currency`, `asOf`, `source`.
- `app/tranches/tranchen-manager-page.js`, `executePriceBatch()` um Zeilen 1163–1168: bei erfolgreichem „Kurse aktualisieren“ werden nur `ticker: quote.symbol` und `currentPrice: quote.price` in die Tranche übernommen. **`quote.asOf` wird nicht persistiert.** `app/tranches/tranchen-manager-state.js`, `saveTranchesToStorage()`, speichert die normalisierten Tranchen unter `PROFILE_TRANCHES_KEY`. `types/tranche-contract.js`, `TRANCHE_FIELD_GROUPS.persisted`, definiert kein Kursdatum. Profil-`meta.updatedAt` und `purchaseDate` sind keine Kurszeitpunkte.
- `app/balance/balance-annual-marketdata.js`: `ANNUAL_MARKET_DATA_META_KEY` ist `annualMarketDataMeta`; `nachrueckenMitETF()` speichert `price`, `asOf`, `ticker`, Quelle und Jahresperiode im Balance-State. Das zugehörige Update betrifft den Strategie-ETF (`VWCE.DE`) und die Jahres-/ATH-Eingaben, **nicht** die einzelnen `currentPrice`-Bewertungen der Vermögenstranchen. Dieses `asOf` darf deshalb nicht pauschal als Kursdatum aller Bestände gelten, auch nicht bei zufällig gleichem Ticker oder Preis.
- Entscheidung zur Behebung von R-01: Die Vorgabe „keine neuen gespeicherten Felder“ bezieht sich im Auftrag auf **Ausgaben und Vermögensverlauf**, nicht auf den Tranchenvertrag. Die erwartete Quelle „Kurse aktualisieren“ lässt sich mit der minimalen optionalen Speicherung von `quote.asOf` an genau der damit bewerteten Tranche erschließen. Slice 3 erweitert deshalb ausdrücklich diesen Vertrag, bevor Slice 4 die automatische Sicherung einbindet. Ein erfolgreiches Kursupdate aller beitragenden ETF-Tranchen mit frischen Kursen ermöglicht danach die nächste automatische Sicherung; die bisherige dauerhaft wirkungslose ETF-Automatik wird nicht als Produktgrenze übernommen.
- Neues optionales Tranchenfeld `asOf`: positive sichere ganzzahlige UTC-Unixsekunden, deren Umrechnung in Millisekunden einen gültigen JavaScript-Zeitpunkt ergibt, unmittelbar aus der validierten Kursantwort. Es bezeichnet ausschließlich den gespeicherten `currentPrice` der betreffenden Tranche. `TRANCHE_SCHEMA_VERSION` bleibt 2; Datensätze der unterstützten Versionen 0/1/2 ohne Feld bleiben gültig. Abwesend beziehungsweise `null` bedeutet unbekannt und wird ohne erfundenen Ersatzzeitpunkt normalisiert. Ein vorhandener ungültiger Wert wird mit einem stabilen feldbezogenen Vertragsfehler abgelehnt, nicht still als frisch behandelt. Alter und Zukunft werden relativ zum Importzeitpunkt im Frischegate geprüft, nicht beim Laden historischer Daten.
- `executePriceBatch()` übernimmt `ticker`, `currentPrice` und `asOf` gemeinsam in die bestehende transaktionale Speicherung; auch ein unveränderter Kurswert erhält den tatsächlich gelieferten Kurszeitpunkt. Fehlgeschlagene/abgebrochene Quotes behalten ihren bisherigen Preis und dessen bisheriges Datum. Neue manuelle Tranchen haben kein Kursdatum. `saveTranche()` und `readTrancheFromForm()` dürfen das Datum nur erhalten, wenn normalisierter Preis, ISIN, Ticker und Kategorie/Typ unverändert bleiben; Preis-/Instrumentänderungen entfernen es. Reine Änderungen an Anteilen, Notizen oder Steuermerkmalen machen denselben Preis nicht undatiert. Kein Datum aus Kaufdatum, Profiländerung, Importzeit oder Jahresabschluss ableiten.
- Normalisierung und Speicherweg: `types/tranche-contract.js`, `normalizeTrancheCollection()`, sowie `app/tranches/tranchen-manager-state.js`, `normalizeTranches()`/`saveTranchesToStorage()`/`loadTranchesFromStorage()`. `app/profile/profilverbund-balance.js`, `buildProfileOwnedTranches()`, übernimmt bestehende Tranchen per Spread samt Profilprovenienz; synthetische Bestände haben keine Preiszeitprovenienz. Der neue produktive Leser wertet das gespeicherte `asOf` aus den tatsächlich zur PREVIEW beitragenden Tranchen aus; er setzt nicht einfach alle ETF-Bestände auf unbekannt.
- Import-/Exportnachweis: `app/profile/profile-bundle-io.js`, `exportProfilesBundle()`/`normalizeProfilesBundle()`/`importProfilesBundle()`, transportiert den profilierten Tranchen-JSON-String und verwendet `validatePersistenceDomainRecords()`. `app/shared/persistence-backup.js`, `validateStoredTranches()`, validiert ihn bereits über `normalizeTrancheCollection(..., { mode: 'persisted' })`; Vollbackup und Restore verwenden denselben Domainvalidator. Beide Pfade übernehmen die optionale Vertragsregel ohne neues Bundle-/Backupformat. Slice 3 belegt Erhalt und Ablehnung durch Roundtrip-/Fehlertests, statt redundante Feldkopierer einzuführen. Diese beiden bestehenden IO-Module werden gelesen/geprüft, nicht geändert.
- Altdaten ohne Feld bleiben **Kursdatum unbekannt**, bis der Manager den zugehörigen Preis erfolgreich aktualisiert. Synthetische Zeit-Fixtures sichern die Grenzlogik ab; zusätzlich ist ein produktiver Integrationsnachweis mit realem Managerlistener, Kursantwort, bestätigter Persistenz, Reload/Profilwechsel und realem Ausgabenimport verpflichtend. Ein frisches `annualMarketDataMeta` allein schaltet nichts frei.
- Keine kursabhängigen Bestände: Prüfung erfüllt. ETF-Anteile der Vermögenssumme sind Aktien- und Geldmarkt-ETF; Tagesgeld wird ausdrücklich nicht datiert. Positive aggregierte ETF-Werte ohne belegbare Tranchen-/Kurszuordnung dürfen nicht irrtümlich als „keine Bestände“ gelten, sondern als unbekannt. Gold und separate Anleihen gehören nicht zur bestehenden Vermögenssumme.
- Benannte Konstante `EXPENSES_WEALTH_QUOTE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000`. Vergleich mit dem einmal festgehaltenen Importzeitpunkt in Millisekunden; genau sieben Tage frisch, eine Sekunde mehr alt. Ungültige oder zukünftige Zeitpunkte liefern keine Freigabe. Bei mehreren bewerteten Beständen müssen alle Datum/Nachweis besitzen und frisch sein; maßgeblicher Meldungstag ist das älteste belegte Kursdatum, bei fehlender Zuordnung „Kursdatum unbekannt“.

### Darstellung, Lebenszyklus und Meldungen

- `Balance.html` enthält vier `.tab-btn` mit IDs `update`, `settings`, `ausgaben`, `wealth`; `tab-wealth` enthält Capture, Anzahl, Datum, Status und zwei `.wealth-scroll`-Regionen. Die technischen IDs bleiben erhalten; nur der sichtbare Tabname und die umgebende Auswertungsstruktur ändern sich.
- `app/balance/balance-wealth-history-renderer.js`, `renderBalanceWealthHistory()`, leert Details bei jedem Refresh, datiert/zählt auch inaktiv und erzeugt SVG/Tabelle nur bei aktivem Panel. `UIBinder.handleTabClick()` aktualisiert ohne Engineaufruf oder Write. `balance-main.js` aktualisiert den Verlauf bei Start und allgemeinen Updates; Binder aktualisiert ihn nach Import-/Snapshotaktionen. Neue Übersicht an dieselben Lebenszyklusgrenzen anschließen, ohne den Vermögensrenderer fachlich zu verändern.
- `css/balance.css` begrenzt `.wealth-scroll` mit `contain: inline-size`, `max-width: 100%`, `overflow-x: auto`. Neue Regionen verwenden dieses Muster. Bestehende Formularbreite, 720-px-Mindestbreite der Ausgaben-Check-Tabelle, Drawer und Druckverhalten bleiben.
- `app/balance/balance-renderer.js`, `toast(msg, isSuccess = true)`, hat bereits eine separate 6000-ms-Region und die Typen Erfolg (`true`), Hinweis (`'info'`), Fehler (`false`). **Kein String `'success'`/`'error'` an die boolesche API übergeben.** Aktionsfehler über `handleActionError(error, scope)` bleiben je Bereich stehen; `clearError()` betrifft nur Berechnungsvalidierung.
- Importerfolg wird vor der optionalen Sicherung bestätigt. Anschließend Erfolg „Vermögensstand gesichert (Kurse vom TT.MM.JJJJ).“ oder ohne ETF-Bestände „Vermögensstand gesichert (keine kursabhängigen Bestände).“ als Erfolgstoast. Hinweis exakt: „Vermögensstand nicht gesichert: Kurse vom TT.MM.JJJJ sind älter als 7 Tage. Kurse im Profil-Assets-Manager aktualisieren und danach in der Auswertung „Stand jetzt erfassen“.“ Unbekannt-Variante: „Vermögensstand nicht gesichert: Kursdatum unbekannt. Kurse im Profil-Assets-Manager aktualisieren und danach in der Auswertung „Stand jetzt erfassen“.“
- Echter Fehler bei Vorschau, Kontextprüfung oder Speicherung: bleibender Aktionsfehler mit eigenem Scope `expenses-wealth`, im Ausgaben-Bereich verortet, unter Erhalt der Importbestätigung und der bisher bestätigten Historie. Nicht als CSV-Importfehler melden. Kein neuer Fehlercontainer und keine generelle Bereinigung fremder Aktionsfehler.

## Geordnete zukünftige Implementierung

Abhängigkeiten: Slice 1 liefert die Jahresprojektion, Slice 2 deren Darstellung. Slice 3 schafft und prüft die gespeicherte Kursprovenienz einschließlich der Persistenzvertragsvalidierung. Erst Slice 4 aktiviert die Importautomatik auf dieser produktiv belegten Grundlage. Slice 5 gleicht Nutzerdokumentation und Abschlussnachweise ab. Jede Änderung bleibt im jeweiligen exakten Pfadumfang; zusätzliche nötige Pfade werden vor Bearbeitung als Umfangserweiterung gemeldet.

### Slice 1 - Jahresausgaben als unveränderliche Projektion absichern

**Ziel**

Eine DOM-freie, mit dem Ausgaben-Check identische Jahresprojektion bereitstellen, bevor die neue Darstellung eingebunden wird.

**Exakter Änderungspfad**

- `app/balance/balance-expenses-metrics.js`
- `tests/balance-expenses-history.test.mjs`
- `tests/balance-expenses.test.mjs`

**Umsetzung**

1. Neue exportierte Jahresprojektion neben `computeYearStats()` ergänzen: Store und explizites aktuelles Kalenderjahr als Eingaben; chronologisch aufsteigende Jahreszeilen. Gültige Jahrescontainer mit wenigstens einem importierten Profileintrag aufnehmen, rein leere Container auslassen. Monate außerhalb 1–12 nicht als Jahresausgaben zählen.
2. Pro Zeile `annualUsed`, `monthsWithData`, `avgMonthly` direkt aus `computeYearStats({ yearData })` ableiten. Keine zweite Berechnungsformel und kein neues Budget. Laufend-Markierung nur für das lokale aktuelle Kalenderjahr mit weniger als zwölf gezählten Monaten, unabhängig von `activeYear` im Ausgaben-Check.
3. Nulljahre, leere Stores, unsortierte Jahre, mehrere Profile und Kategorien mit gemischten Vorzeichen prüfen. Store und Eingaben tief einfrieren beziehungsweise vorher/nachher vergleichen. Bei 0 Datenmonaten Ø 0 ohne Division durch 0.
4. Vorhandene Kennzahlentests erhalten und mit konkreten Gegenbeispielen belegen, dass ein ausgewähltes/ausgeblendetes Profil keinen Filter für die Summen darstellt. Diese Slice führt noch keine sichtbare Produktänderung ein; die Browserintegration folgt vollständig in Slice 2.

**Akzeptanzkriterien**

- SOURCE: Synthetisch ergeben Profil A mit Kategorien −100/20 und Profil B mit +30 für denselben Monat 110 Euro; zwei Profile im selben Monat zählen zusammen genau einen Datenmonat. Für jedes ausgewertete Jahr stimmen Summe, Anzahl und Ø exakt mit `computeYearStats()` überein.
- SOURCE: Fixtures mit mehreren Jahren, zwölf Monaten, einem laufenden Teiljahr, historischem Teiljahr, Nullimportjahr und rein leeren Containern prüfen Reihenfolge, Markierung, Nullwerte und Auswahl. Das gewählte Ausgabenjahr beeinflusst weder die Jahresliste noch die Laufend-Markierung.
- SOURCE: Keine Änderung an Eingaben oder Store, keine Speicherzugriffe, keine Budget-/Abweichungswerte in der Projektion und keine Änderung der bestehenden Ausgaben-Check-Semantik.
- SOURCE: `node tests/run-single.mjs tests/balance-expenses-history.test.mjs` und `node tests/run-single.mjs tests/balance-expenses.test.mjs` bestehen; der Orchestrator führt anschließend `npm test` aus.

### Slice 2 - Auswertung mit zwei Abschnitten und frischer lesender Darstellung integrieren

**Ziel**

Den vierten Tab umbenennen, die Jahresübersicht barrierefrei darstellen und beide Abschnitte nur im aktiven Tab zeichnen.

**Exakter Änderungspfad**

- `Balance.html`
- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder.js`
- `app/balance/balance-expenses-history-renderer.js`
- `app/balance/balance-expenses.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history-metrics.js`
- `app/balance/balance-wealth-history-renderer.js`
- `css/balance.css`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-expenses-history.test.mjs`
- `tests/balance-expenses.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

1. Tabname „Auswertung“, Panel mit passender zugänglicher Gesamtbenennung und zwei semantisch benannten Abschnitten. Vorhandene IDs für Vermögensverlauf, Capture, Datum und Status erhalten. „Stand jetzt erfassen“ existiert genau einmal. Den Anlass in Projektion, Legende und SVG-Beschreibung auf „Unterjährig“ umstellen; Datenvertrag nicht bearbeiten.
2. Neues `balance-expenses-history-renderer.js` mit eigenen DOM-Referenzen, Loader und festlegbarer Uhr. Erst Storezustand prüfen und alte Inhalte entfernen; bei inaktivem `tab-wealth` keine SVG-/Tabellenmarkups erzeugen. Aktiver Tab zeigt Jahreszeilen aus Slice 1 oder sichtbaren Leerhinweis „Noch keine Ausgabendaten vorhanden.“
3. Tabelle mit Caption und `scope`-Überschriften: Jahr/Status, Ausgaben gesamt, Monate mit Daten, Ø pro Monat. Schlichtes SVG mit Jahresgesamtsäulen in nominalen Euro; Beträge, Jahreszahl und Datenmonate zugänglich beschreiben. Eigenständige eindeutige Titel-/Beschreibung-IDs, `role="img"`, `aria-labelledby` ausschließlich für den Titel, `aria-describedby` für die Beschreibung. Ø/Monat in Tabelle und Erläuterung ausdrücklich als Grundlage für Vergleiche unvollständiger Jahre hervorheben; kein Median und keine Hochrechnung als tatsächliche Ausgaben.
4. Diagramm und Tabelle in getrennten benannten fokussierbaren Scrollregionen. Inaktive Regionen über vorhandene Panel-Sichtbarkeit aus Fokus-/Zugänglichkeitsbaum nehmen. Bei vielen Jahren und großen Beträgen endliche SVG-Koordinaten und ausschließlich internen horizontalen Überlauf sichern; nicht die Formularspalte verbreitern.
5. `initExpensesTab()` bekommt einen injizierten Änderungsrückruf. Nach erfolgreichem Import, Jahresauswahl/`rollExpensesYear()`, Löschung und bestätigtem Reset die Übersicht frisch lesen. Datenänderungsrückruf von späterem Importerfolgsrückruf trennen. Neues Rendern an Tabwechsel, Start/Update, bestätigte Balance-Importe einschließlich `finally` nach Ablehnung/Rollback und Snapshot-Refresh anschließen; keine automatische Tabaktivierung und keine Engineberechnung aus Tabwechseln.
6. Beschädigten Store über `loadExpensesStoreResult()` erkennen: im neuen Abschnitt die gleiche Diagnose/Backendzuordnung und Hinweis auf Recovery im Ausgaben-Check anzeigen, ohne eigene Resetaktion, automatisches Überschreiben oder rohe Finanzdaten. Fehler im Ausgabenabschnitt lassen Vermögensabschnitt und restliche Seite bedienbar. Lesende Verarbeitung ungültiger Untercontainer darf nicht ungefangen abbrechen.
7. Browser-Smoke bereits hier um beide Abschnitte, Jahreswerte, Leer-/Korruptzustand und Aktivitätswechsel erweitern. `WEALTH_TAB_SINGLE_ROW_MIN_WIDTH` von 1440 auf 1366 setzen und Messkommentar aktualisieren. Bestehende Matrix 1250/1251, 1280, 1366, 1440, 1600, 1920 und 375 CSS-Pixel erhalten; an 1366 die neue gemeinsame Zeile verlangen. Neue breite Jahresfixture ergänzen.
8. Die fünf Dokumente für die bereits umgesetzte Tabstruktur, Jahresübersicht, „Unterjährig“, Rendererzuständigkeit und 1366-px-Grenze im selben Paket synchronisieren. Automatische Importerfassung noch nicht als umgesetzt darstellen. Der Import-bei-aktiver-Auswertung-Browserfall startet im Ausgaben-Check und hält eine beobachtbare Datei-/Importoperation offen, öffnet dann die Auswertung und wartet auf deren Abschluss; keine feste Verzögerung und kein neuer UI-Importknopf in der Leseübersicht.

**Akzeptanzkriterien**

- SOURCE: Markup und Binderprüfungen zeigen vier Tabs in bestehender Reihenfolge, „Auswertung“ an vierter Stelle, beide benannten Abschnitte untereinander und genau eine Capturetaste. Start, Reload und Profilwechsel starten weiter mit „Jahres-Update“.
- SOURCE: Gefüllter Store erzeugt vor erster Aktivierung sowie nach Verlassen keinerlei dynamisches SVG/Tabelle in beiden Auswertungsabschnitten. Renderinstrumentierung prüft null Markuperzeugung inaktiv. Öffnen zeichnet die aktuelle Datenbasis ohne Erfassung, Engineupdate, Fehlerbereinigung oder Write.
- SOURCE: Tabelle und SVG stimmen für alle Jahre mit Slice-1-Werten überein; laufendes Teiljahr wird textlich markiert. Kein Budget/keine Abweichung, aber sichtbare Budgeterklärung und Ø-Vergleichshinweis. Nullimportjahr und vollständig leere Übersicht bleiben verständlich.
- SOURCE: Neuer Änderungsrückruf nach realem CSV-Import beziehungsweise Jahreswechsel aktualisiert eine aktive Auswertung ohne Tabwechsel; inaktiv bleiben ihre dynamischen Container leer. Löschung/Recovery-Reset hinterlassen keine alten Jahreswerte. Korruptes JSON und fehlerhafte Datenstrukturen erzeugen einen verständlichen Hinweis ohne Rohdaten, Reset oder Seitenabbruch.
- SOURCE: SVG besitzt einen eindeutigen Namen und eine getrennte vollständige Beschreibung; Tabelle ist gleichwertige zugängliche Entsprechung. Alle Scrollregionen sind aktiv per Tastatur erreichbar. Bestehende Vermögenswerte/Markersymbole bleiben; sichtbarer Anlass überall „Unterjährig“, gespeichert weiterhin `manual`.
- SOURCE: Browser-Smoke verlangt eine vollständige gemeinsame Tabzeile ab 1366 und bei 375 CSS-Pixeln bedienbare Tabs, vier interne Diagramm-/Tabellenregionen bei gefüllter Auswertung und keinen seitenweiten Überlauf. Bestehende 720-px-Ausgaben-Check-Tabelle, Drawer und Druckvertrag bleiben geprüft.
- SOURCE: Gezielte Läufe für `balance-expenses-history.test.mjs`, `balance-expenses.test.mjs`, `balance-ui-orchestration.test.mjs` und `balance-wealth-history-chart.test.mjs` mit `node tests/run-single.mjs` bestehen. Der Orchestrator führt `npm test` aus; Browserlauf bleibt dem externen Abschlussgate vorbehalten.

### Slice 3 - Kurszeitpunkte der bewerteten Tranchen rückwärtskompatibel speichern

**Ziel**

Die vom Kursdienst bereits gelieferte Zeitprovenienz an genau dem übernommenen Preis erhalten und den vollständigen produktiven Persistenzweg vor Aktivierung der Importautomatik absichern.

**Exakter Änderungspfad**

- `Handbuch.html`
- `README.md`
- `app/tranches/tranchen-manager-modal.js`
- `app/tranches/tranchen-manager-page.js`
- `app/tranches/tranchen-manager-state.js`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/browser-smoke.test.mjs`
- `tests/persistence.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/profilverbund-balance.test.mjs`
- `tests/tranche-contract.test.mjs`
- `tests/tranchen-manager-modal.test.mjs`
- `tests/tranchen-manager-page.test.mjs`
- `tests/tranchen-manager-state.test.mjs`
- `types/tranche-contract.js`

**Umsetzung**

1. `asOf` als optionales Preiszeitfeld in `TRANCHE_FIELD_GROUPS.persisted` aufnehmen und in `normalizeOne()` für Persistenz- und Engineprojektion nach der oben festgelegten Sekundenregel validieren/erhalten. Fehlend und `null` werden ohne Datum ausgegeben; ungültige vorhandene Werte erzeugen einen stabilen Fehlercode mit Feld `asOf`. Versionen 0/1/2, vorhandene Legacy-Migrationen, Bewertungen, Steuern und Engineberechnung bleiben unverändert. Kein Versionssprung, keine Datenbankmigration, kein neuer Schlüssel.
2. `executePriceBatch()` übernimmt bei jedem erfolgreichen Quote `asOf: quote.asOf` zusammen mit Preis und Ticker vor `calculateTrancheDerivedValues()` und `persistTranchen()`. Bestätigten Flush/Readback und Rollback des bestehenden Managers erhalten. Teilfehler ändern weder Preis noch Datum der fehlgeschlagenen Tranche; Abbruch oder Profilwechsel darf keinen unbestätigten Kurszeitpunkt in einen fremden Kontext schreiben.
3. `saveTranche()` reicht den bestehenden Datensatz an `readTrancheFromForm()` weiter. Der Formleser vergleicht normalisierte Instrumentmerkmale und den resultierenden `currentPrice`: Nur bei identischem Preis/ISIN/Ticker/Kategorie/Typ wird das bisherige `asOf` übernommen. Preis-/Instrumentänderungen löschen es. Neuanlage und Kaufpreis-Fallback erzeugen keine künstliche Zeitprovenienz. Namens-/Notiz-, Anteils- oder Steueränderungen erhalten einen ansonsten unveränderten belegten Preis. Ein manuell geänderter Preis wird auch dann unbekannt, wenn später derselbe Zahlenwert wieder eingetragen wird.
4. `normalizeTranches()`/`saveTranchesToStorage()`/`loadTranchesFromStorage()` nutzen weiterhin den kanonischen Vertrag; dokumentierte Rückgabe-/JSDoc-Verträge in `tranchen-manager-state.js` um das optionale Feld ergänzen. Load/Save/Load und erneute Normalisierung müssen das Datum erhalten, ohne Rohdaten allein beim Lesen umzuschreiben. Altdaten bleiben undatiert; Korruptzustände behalten Rohinhalt und bestehenden Recoverypfad.
5. Import/Export gezielt über die bestehenden exakten Pfade `app/profile/profile-bundle-io.js` und `app/shared/persistence-backup.js` prüfen, ohne diese Module zu ändern: Profilbundle und Vollbackup transportieren den Tranchen-JSON-String und validieren vorhandenes `asOf` über den erweiterten kanonischen Vertrag. Tests in `profile-storage.test.mjs` und `persistence.test.mjs` belegen Roundtrip, Legacy-Import ohne Feld, Ablehnung ungültiger Zeitwerte vor dem Write und unveränderten Zustand nach Ablehnung/Rollback. Kein Kursdatum aus `exportedAt` erzeugen. Sollte dafür wider Erwarten eine IO-Codeänderung nötig sein, vor dieser Änderung den exakten Umfang erweitern lassen.
6. `profilverbund-balance.test.mjs` belegt, dass echte Tranchen durch `buildProfileOwnedTranches()` Datum und Preis samt `sourceProfileId` behalten und mehrere Profile getrennt zuordenbar bleiben. Synthetische Tranchen aus aggregierten Eingaben bleiben undatiert; keine ETF-Strategieprovenienz übernehmen. Enginegebundene Tranchentests zusätzlich als Regression ausführen.
7. Manager-Browserfälle auf den gespeicherten Quotezeitpunkt und dessen Erhalt nach Navigation/Reload erweitern; vorhandenen Mock-Proxy mit festem `asOf` benutzen. Auf abgeschlossene Managerpersistenz beziehungsweise Registrywerte warten, nicht auf feste Zeiten. Die automatische Sicherung folgt in Slice 4 und wird hier noch nicht behauptet. Node-Managerintegration fährt denselben echten Kurslistener mit kontrolliertem Fetch/Backend.
8. Die fünf geforderten Dokumente beschreiben schon in diesem Paket das optionale Tranchenfeld, seine Herkunft und Lebensdauer, Altdaten als unbekannt sowie die Pflichtvalidierung. Die Sperre neuer Ausgaben-/Verlaufsfelder bleibt ausdrücklich erhalten. Noch keine freigeschaltete Importautomatik dokumentieren.

**Akzeptanzkriterien**

- SOURCE: V0-/V1-/V2-Tranchen ohne `asOf` sowie mit `null` laden weiter; die normalisierte Ausgabe hat kein erfundenes Datum. Ein gültiger positiver UTC-Sekundenwert bleibt bei wiederholter Normalisierung, Save/Load und Engineprojektion identisch. Strings, leere Strings, Nullwert 0, negative/gebrochene/nicht endliche beziehungsweise nicht darstellbare Zeitwerte werden feldbezogen abgelehnt; eine alte gültige Kurszeit bleibt strukturell gültig und wird erst im Frischegate als alt bewertet.
- SOURCE: Der reale Manager-Kurslistener speichert bei erfolgreicher Quote Preis, aufgelösten Ticker und exakt `quote.asOf` zusammen, auch bei gleichem Preis und mehreren Tranchen desselben Symbols. Live-Store, bestätigte Registrykopie und nach Reload geladene Tranche stimmen überein. Teilfehler, Abbruch, fehlgeschlagener Flush und Profilwechsel erzeugen keinen fälschlich neuen Kurszeitpunkt.
- SOURCE: Eine reine Notiz-/Anteils-/Steueränderung erhält die Zeitprovenienz des gleichen Kurses; manuelle Preis-/ISIN-/Ticker-/Kategorie-/Typänderung entfernt sie. Neuanlage besitzt kein `asOf`. Form-, Manager- und Normalisierungstests belegen diese Regeln einschließlich Kaufpreis-Fallback und Wiedereintragen eines früheren Preises.
- SOURCE: Profilbundle und Vollbackup erhalten gültiges `asOf` im exportierten und wieder importierten Tranchenbestand einschließlich anschließendem Profilwechsel. Altdatenimporte ohne Feld laden unverändert als unbekannt. Ein ungültiges vorhandenes Feld wird von den bestehenden Domainvalidatoren vor dem Importwrite erkannt, ohne fremde Daten, Ausgaben oder Vermögensverlauf zu ändern.
- SOURCE: Profilverbundprojektion erhält Preis und Zeit je realer beitragender Tranche samt Eigentümer; synthetische Bestände und positive ETF-Aggregate ohne Tranchenprovenienz bleiben undatiert. Weder Profil-`updatedAt` noch Strategie-ETF-`annualMarketDataMeta` oder Exportzeitpunkt ersetzen das Kursdatum. Keine Veränderung der Engine-/Steuer-/Bewertungssemantik und keine Änderung der Ausgaben-/Verlaufsformate.
- SOURCE: Wegen des geänderten Persistenzvertrags sind gemäß AGENTS.md gezielte Läufe von `tranche-contract.test.mjs`, `tranchen-manager-state.test.mjs`, `tranchen-manager-modal.test.mjs`, `tranchen-manager-page.test.mjs`, `profile-storage.test.mjs`, `persistence.test.mjs` und `profilverbund-balance.test.mjs` über `node tests/run-single.mjs` verpflichtend. Zusätzlich bestehende `tranche-reconciliation.test.mjs`, `simulator-portfolio-tranches.test.mjs` und `depot-tranchen-status.test.mjs` unverändert als Regression ausführen. Die volle Pflichtsuite `npm test` führt anschließend ausschließlich der Orchestrator aus; Browserprüfung bleibt extern.

### Slice 4 - Automatische Erfassung nach bestätigtem Ausgabenimport absichern

**Ziel**

Einen unabhängigen nachgelagerten Sicherungsschritt mit genauer Kursfrischeprüfung, gemeinsamem Erfassungspfad und bereichsbezogenen Meldungen integrieren.

**Exakter Änderungspfad**

- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder.js`
- `app/balance/balance-expenses-wealth-capture.js`
- `app/balance/balance-expenses.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history.js`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-expenses-wealth-capture.test.mjs`
- `tests/balance-expenses.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`

**Umsetzung**

1. Neues Modul `balance-expenses-wealth-capture.js`: benannte 7-Tage-Konstante, DOM-freier Frischebewerter und automatische Importkoordination mit injizierbaren Uhr-/Provenienz-/Vorschau-/Persistenzabhängigkeiten. Produktiver Provenienzleser verwendet das in Slice 3 gespeicherte `asOf` der tatsächlich beitragenden Aktien-/Geldmarkt-Tranchen mit `asOf * 1000` für den Altersvergleich; vorhandene unbekannte Tranchenkontexte bleiben konservativ unbekannt. Die Zuordnung umfasst alle Profile der konkreten PREVIEW, nicht nur das importierte Ausgabenprofil. Keine Erfindung eines Datums aus `annualMarketDataMeta`.
2. Bestehenden manuellen Erfassungspfad in `balance-wealth-history.js` so gemeinsam nutzen, dass automatisch und per Knopf dieselbe PREVIEW-Berechnung und `service.captureManual()`-Transaktion laufen. Unterschiedlich sind Auslöser, Frischegate und Meldungsort. Keine zweite Implementierung von ID, Komponenten, Registryupdate oder Rollback. Manuelle Erfassung erhält ihre bisherige Bedienung und verlangt weiterhin keinen automatischen Frischegate.
3. In `initExpensesTab()` einen separaten injizierten Importerfolgsrückruf anbinden, über `balance-main.js`/Binder mit dem bestehenden Update und Dienst verbunden. Erfolgsgrenze: Datei gelesen/geparst, Store geschrieben und benötigte Persistenzbestätigung abgeschlossen, bevor automatisch gesichert wird. Den Import zum bestehenden Facade-Backend flushen; Fehler dabei sind Importfehler und starten keine Sicherung. Uhrzeit und aktiven Profilkontext einmal je Vorgang unmittelbar an dieser Grenze festhalten, vor weiterem asynchronem Warten.
4. Importbestätigung unabhängig vom optionalen Schritt ausgeben und erhalten. Importdaten dürfen nach bereits erfolgreicher Speicherung nicht wegen eines Render- oder Sicherungsfehlers als abgelehnt behandelt werden. Optionalen Schritt getrennt abfangen; weder CSV-Rollback noch erneuter CSV-Fehlertoast. Frischegate einmal je Vorgang, nicht je enthaltenem Monat/Profil. Abbruch der Dateiauswahl, Parserablehnung, Recovery-Sperre und Schreibfehler lösen keinen Rückruf aus.
5. Mit einmaliger frischer PREVIEW-Datenbasis und belegter Kurszuordnung erfassen; nach jedem asynchronen Übergang vorhandene Profil-/Stateprüfungen nutzen. Kursdatum, Preise, Bestandszuordnung und Vorschau dürfen nicht auseinanderlaufen. Bei konkurrierendem Profilwechsel Sicherung ablehnen und Fehler melden; nicht unter einem inzwischen anderen Profil sichern. Mehrere erfolgreiche Imports seriell je einmal abarbeiten, niemals still durch den manuellen `in_flight`-Status verlieren. Laufender/Pending-Jahresabschluss bleibt abgesichert und wird als Sicherungsfehler gemeldet.
6. Frischegate mit fester Zeit; ohne kursabhängige Vermögensanteile direkt erfüllt. Sonst nur vollständiger belegter Satz frischer Kurszeitpunkte erlaubt. Unbekannte/alte Kurse: `info` und null Verlaufwrites. Erfolg erst nach bestehendem Readback als Erfolgstoast. Echte Fehler bleibend in `expenses-wealth` mit Kontext „Ausgaben importiert; Vermögensstand nicht bestätigt …“. Nur diesen eigenen Aktionsfehler beim erneuten Sicherungsversuch bereinigen.
7. Nach Erfolg/Fehler beide Auswertungsabschnitte frisch aus bestätigten Daten aktualisieren; Datum im Vermögensabschnitt auch inaktiv aktuell halten. Status nicht bei übersprungenen Sicherungen als Erfolg darstellen. Keine Navigation zur Auswertung.
8. Browserfälle nutzen den realen Dateifeldlistener und `window.__browserSmokeMessages` mit einem Nachrichtenindex vor jeder Aktion. Der produktive positive Fall startet mit undatierten ETF-Tranchen, aktualisiert deren Kurse im echten Manager mit kontrolliertem Proxy, wartet auf gespeichertes `asOf`, kehrt zur Balance zurück und importiert Ausgaben. Genau ein bestätigter Verlaufseintrag muss entstehen. Zweiter Import am selben Tag, alte/fehlende Provenienz mit echten ETF-Tranchen, Sicherung ohne ETF-Bestände, Ablehnung und Speicherfehler ergänzen. Die Nodeintegration belegt dieselbe durchgängige Kette über echte Manager-/Importlistener und tatsächlichen Speicher, unabhängig vom externen Browsergate; synthetische Grenztests allein genügen nicht als produktiver Nachweis.
9. Die fünf Dokumente im selben Paket um die jetzt umgesetzte Importerfassung, den wirksamen Manager-Kursupdatepfad, die nicht geprüfte Tagesgeldaktualität, Meldungen und Importunabhängigkeit ergänzen. Slice 5 gleicht danach alle Referenzen und Prüfnachweise abschließend ab.

**Akzeptanzkriterien**

- SOURCE: Ein erfolgreicher Import mit produktiv gespeichertem frischem Tranchendatum führt genau eine PREVIEW und eine bestätigte unterjährige Erfassung aus. Eine Nodeintegration startet mit undatierten ETF-Beständen, fährt den realen Manager-Kurslistener, bestätigt Preis/`asOf` im echten Speicher, lädt den Bestand erneut und fährt den realen CSV-Importlistener; der dabei entstandene Eintrag hat dieselben Komponenten wie die manuelle Erfassung. Ergänzend prüft ein synthetischer Import mit mehreren Monaten/Profilen genau einen Versuch je Vorgang. Lokal festgehaltener Importtag statt importiertem Monat, `manual:YYYY-MM-DD`, `reason: manual`, `periodId: null`; zweiter Import desselben Tages ersetzt, ein anderer Tag ergänzt. Jahresstände bleiben unverändert.
- SOURCE: Feste UTC-Zeit prüft exakt 604800000 ms als frisch und eine Sekunde darüber als alt; zusätzlich fehlendes/ungültiges/zukünftiges Datum, mehrere frische Kurse, mindestens ein alter beziehungsweise unbekannter Kurs. Lokal abweichender Kalendertag und ein Warten über Mitternacht prüfen, dass der festgehaltene Importtag verwendet wird.
- SOURCE: Produktiver Leser erkennt undatierte Altdaten als unbekannt und gibt nach erfolgreichem Managerupdate aller beitragenden Bestände mit frischem gespeichertem `asOf` die Sicherung frei. Mehrere beitragende Profile werden vollständig geprüft; ein fehlendes oder altes Tranchendatum verhindert die Sicherung auch bei frischem Datum im aktiven Profil. Frisches `annualMarketDataMeta`, Profil-`updatedAt` und Kaufdatum allein geben keine Freigabe. Positive ETF-Aggregate ohne vollständigen Bewertungsnachweis bleiben unbekannt; ohne kursabhängige Bestände wird produktiv gesichert.
- SOURCE: Automatische und manuelle Erfassung verwenden dieselben realen PREVIEW-Werte und dieselbe Persistenztransaktion. Aktive Registrykopie und Live-State stimmen nach Readback überein; fremde Profile, Periodenstate, Importdaten und beide Speicherformate bleiben unverändert. Legacy-Exporte mit `manual` laden weiter.
- SOURCE: Ungültige CSV, nicht gewählte Datei, fehlgeschlagene Datei-/Store-/Flushoperation und Recovery-Sperre lösen null Sicherungsversuche aus. Zwei schnelle gültige Vorgänge werden je einmal bearbeitet. Konkurrenz mit manueller Erfassung, Profilwechsel und Jahresabschluss schreibt keine fremden oder unbestätigten Werte und meldet Fehler nachvollziehbar.
- SOURCE: Alte/unbekannte Kurse erzeugen exakt den jeweiligen Hinweistext als `info`, mit null Verlaufwrites; bestätigte Sicherung erzeugt Erfolg mit formatiertem Kursdatum beziehungsweise ohne-Bestände-Text. Schreib-/Readback-/Vorschaufehler bleiben als Ausgaben-Aktionsfehler stehen. Importbestätigung ist in Nachrichtenevidenz und gespeicherten Ausgaben nachweisbar; der optional fehlgeschlagene Schritt macht den Import nicht ungültig.
- SOURCE: Kein Erfolg, kein Hinweis und kein Fehler aktiviert einen anderen Tab. Aktive Auswertung aktualisiert beide Abschnitte; inaktive Container bleiben ungezeichnet und „Zuletzt erfasst am …“ entspricht weiterhin dem maximalen bestätigten Stichtag. Bisherige manuelle und jährliche Meldungen/Erfassungen bleiben grün.
- SOURCE: Gezielte Läufe von `balance-expenses-wealth-capture.test.mjs`, `balance-expenses.test.mjs`, `balance-ui-orchestration.test.mjs`, `balance-wealth-history.test.mjs`, `balance-messages.test.mjs`, `wealth-history-contract.test.mjs` und `balance-annual-workflow-contract.test.mjs` via `node tests/run-single.mjs` bestehen; der Orchestrator führt anschließend `npm test` aus. Bestehende zuletzt genannte Dateien werden zur Regression gelesen/ausgeführt, nicht geändert.

### Slice 5 - Bedienung und abschließende Prüfverträge dokumentieren

**Ziel**

Die fünf geforderten Dokumente an die tatsächlich erreichbaren Funktionen anpassen und den externen Browserabschluss vorbereiten.

**Exakter Änderungspfad**

- `Handbuch.html`
- `README.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`

**Umsetzung**

1. README und Handbuch erklären „Auswertung“, Reihenfolge beider Abschnitte, Jahresgesamtwerte/Ø, positive Datenmonatszählung und laufendes Teiljahr. Kein historisches Budget behaupten. Vorhandenen Handbuchanker zum Vermögensverlauf erhalten, Inhaltsverzeichnis/Bedienhinweise an neue Gesamtansicht anpassen.
2. Automatische Sicherung mit lokalem Importtag, Tagesersetzung, aktivem Speicherprofil und unverändertem `manual` dokumentieren. Anzeigename „Unterjährig“, manuelle Taste und Jahresabschluss bleiben. Verhalten bei fehlender Frische und Fehlern sowie nachgelagerte Unabhängigkeit vom CSV-Import erläutern.
3. Ausdrücklich: Tagesgeld wird nicht auf Aktualität geprüft. „Kurse aktualisieren“ im Profil-Assets-Manager speichert künftig `quote.asOf` je erfolgreich bewerteter Tranche und ermöglicht bei höchstens sieben Tage alten Kursen aller beitragenden ETF-Bestände die nächste automatische Sicherung. Altdaten ohne Feld oder manuell geänderte Preise gelten bis zu einem erfolgreichen Kursupdate als unbekannt. Zur sofortigen manuellen Sicherung bleibt „Stand jetzt erfassen“ verfügbar. Strategie-ETF-Datum nicht als Nachweis sämtlicher Bestandspreise bezeichnen.
4. TECHNICAL und Modul-README ergänzen neue Renderer-/Koordinationsmodule, Daten- und Importerfolgsrückrufe, Frischekonstante, Meldungsscope und gemeinsame Capturetransaktion. Den ausdrücklich erweiterten Tranchenvertrag mit optionalem `asOf`, UTC-Sekunden, Rückwärtskompatibilität ohne Versionssprung, Invalidierung bei Preis-/Instrumentänderung und IO-Roundtrips beschreiben. Keine neue Engine-API und keine neuen Felder/Anlässe in Ausgaben oder Vermögensverlauf behaupten.
5. Alle fünf Dokumente ersetzen die bisherige 1440-px-Einzeiligkeitsgrenze durch 1366 px. Die Layoutmatrix darf 1440 als weiterhin geprüfte Fenstergröße nennen. tests/README ordnet Node-Tests und Browserfälle der jeweiligen Quelle zu: synthetische Frischegrenzen ergänzen den verpflichtenden produktiven Manager-Persistenz-Importnachweis und ersetzen ihn nicht.
6. Externes Browsergate beschreiben: Start-/Profilpersistenz mit `waitForWealthBrowserStartup`, Registry-/Importabgleich mit `waitForBrowserValue`, DOMzustände/Nachrichtenindizes statt fester Wartezeiten; Maße nach Schriften und `getAnimations()`-Ende. Keine pauschalen Sleeps für Imports oder Toasts hinzufügen.

**Akzeptanzkriterien**

- SOURCE: Alle fünf Dokumente beschreiben dieselbe Tabstruktur, Leseübersicht, Datenbasis über gespeicherte Profile, Monatszählung, Budgetabwesenheit, 1366-px-Grenze und unveränderte mobile/Printbedienung. „Vermögensverlauf“ bleibt Abschnittsname, nicht veralteter vierter Tabtitel.
- SOURCE: Automatische Sicherung, unbekannte/alte Kurse, Importunabhängigkeit, „Unterjährig“ bei gespeichertem `manual` und fehlende Tagesgeld-Altersprüfung sind nachvollziehbar dokumentiert. Dokumente erklären den produktiv wirksamen Managerupdatepfad mit gespeichertem `asOf`, Altdaten ohne Datum und manuell geänderte Preise als unbekannt; nur vollständig frische beitragende Bestände erlauben die Automatik. Ausgaben-/Verlaufsvertrag bleiben unverändert.
- SOURCE: Referenzen nennen tatsächlich vorhandene neue Module/Tests und bestehende Meldungs-APIs. Browser-Smoke ist als separates externes Gate benannt, synthetische und produktive Frischeevidenz werden unterschieden; keine Ausführung in der Agentensandbox als grüner Nachweis behaupten.
- SOURCE: Dokumentabgleich per `rg` und `git diff --check` besteht; `npm test` wird nach dieser Slice durch den Orchestrator ausgeführt. Außerhalb der Sandbox führt die gesteuerte Sitzung vor lokalem Merge `npm run test:browser` aus und bestätigt insbesondere die gemessene Tabzeile ab 1366 CSS-Pixeln.

## Prüfung, Risiken und Abschluss

Jede Slice wird gegenläufig geprüft; niemand gibt die eigene Arbeit frei. Nach jeder zukünftigen Slice führt ausschließlich der Orchestrator die volle Node-Suite `npm test` aus. Neue `*.test.mjs`-Dateien werden durch `tests/run-tests.mjs`, `getTestFiles()`, automatisch entdeckt; Tests mit eigenen `node:assert`-Aufrufen verwenden die vorhandenen instrumentierten Assertionglobals beziehungsweise die entsprechende bestehende Testkonvention, damit `run-single` nicht mit null gezählten Assertions endet. Kein `npm install`, Enginebuild, Desktopbuild oder Dist-Sync gehört zu dieser Aufgabe.

Wesentliche Risiken und Gegenprüfungen:

- Vermeintlich frische Kurse aus unpassendem Datum: explizite minimale Tranchenvertragserweiterung statt ungesicherter Heuristik. Produktiver positiver Test über Manager, bestätigten Store und Ausgabenimport; separate unbekannt-Tests für Altdaten, manuelle Preisänderung, synthetische ETF-Aggregate und Strategie-ETF. Preis und Datum werden gemeinsam gespeichert und geprüft; sämtliche beitragenden Profile müssen abgedeckt sein.
- Verlust oder Fälschung der Kursprovenienz bei Persistenz/IO: optionale v2-Vertragsregel, Legacy-/Invalidwerttests, Roundtrips von Load/Save, Profilwechsel, Profilbundle und Vollbackup. Pflichtvalidierung des Persistenzvertrags inklusive voller Node-Suite durch den Orchestrator; keine neuen Ausgaben-/Verlaufsfelder. Zukünftige Kurszeiten geben keine Freigabe, obwohl der Kursdienst eine eigene kurze Zukunftstoleranz hat.
- Geänderte Ausgabensummen: gemeinsame bestehende Berechnung verwenden; gemischte Vorzeichen, ausgeschlossene Profile und Nullmonate explizit testen. Jahrescontainer lesend behandeln.
- Importerfolg durch optionalen Fehler verloren: getrennte Fehlergrenzen und Nachrichtenindizes; Ausgabenpersistenz nach injizierten Sicherungsfehlern erneut lesen.
- Alte oder fremde Vermögenswerte: frische PREVIEW, gleiche Kontext-/Statekontrollen und bestätigte Transaktion; Konkurrenz- und Profilwechseltests einschließlich aggregierter Vermögenswerte.
- Unbeabsichtigtes Zeichnen oder Tabwechsel: Renderer-/Binderinstrumentierung und Browserprüfungen aktiv/inaktiv; nicht am Toastablauf oder Berechnungsfehlercontainer auf Idle schließen.
- Layoutregression: neue Jahresdatenfixture plus bestehende Vermögensfixture; vollständige Matrix und echte 375-px-Scroll-/Drawerprüfung. Die gemeldete Messung 592 px Bedarf/630 px Platz bei 1366 ist Planannahme der Steuerung, kein neu gefahrenes Browserergebnis.

Abschlussnachweise: volle Node-Suite grün auf dem endgültigen Stand, anschließend Browser-Smoke außerhalb der Sandbox mit nachvollziehbaren Zustands-/Meldungs-/Layoutmessungen und aktualisierte Nutzerdoku. Sandboxbedingte Port-/Browser-/Unterprozessfehler werden als nicht ausführbar protokolliert und ersetzen keinen grünen Browsernachweis. In diesem PLAN_ONLY-Schritt laufen keine Produkttests; validiert werden Existenz, Vollständigkeit, Slice-/Pfadsyntax und ausschließliche Änderung des Arbeitsplans. Der Branch bleibt ungemergt; lokale Merge-/Buildaktionen übernimmt später ausschließlich die gesteuerte Sitzung.

## Bearbeitung des Planbefunds R-01

R-01 wird angenommen. Die ursprüngliche Schlussfolgerung, dass ETF-Bestände produktiv dauerhaft unbekannt bleiben müssten, entfällt. Der überarbeitete Plan erfüllt Variante (a) des Akzeptanztests: Slice 3 plant das optionale Kurszeitfeld ausdrücklich im Tranchenvertrag, nennt Manager-/Form-/Normalisierungspfade und die bestehenden exakten IO-Pfade, fordert Legacy- und Roundtriptests sowie die Pflichtvalidierung für Persistenzverträge. Slice 4 weist anschließend die tatsächliche Freischaltung der automatischen Sicherung nach einem frischen Manager-Kursupdate mit realen Listenern und Speicherung nach. Die Ausgaben-/Verlaufsformate bleiben unverändert. Diese Bearbeitungsbegründung ersetzt keine gegenläufige Freigabe; das folgende Orchestrator-Prüfprotokoll bleibt dem Orchestrator vorbehalten.

## Orchestrator-Prüfprotokoll

### Verlauf

<!-- audit:history:begin -->
- Runde 1: Planung · Validierung grün · Prüfurteil abgelehnt · 1 neu, 0 geschlossen.
- Runde 2: Planrevision · Validierung grün · Prüfurteil freigegeben · 0 neu, 1 geschlossen.
<!-- audit:history:end -->

### Befunde

<!-- audit:findings:begin -->
### R-01 – Der Plan stellt laut eigener Codeanalyse fest: `executePriceBatch()` in…

Klasse: Befund · Stand: geschlossen

Befund:
> Der Plan stellt laut eigener Codeanalyse fest: `executePriceBatch()` in `app/tranches/tranchen-manager-page.js` speichert `quote.asOf` nicht, und `TRANCHE_FIELD_GROUPS.persisted` kennt kein Kursdatum. Daraus folgert er, dass ETF-Tranchen produktiv immer als „Kursdatum unbekannt“ gelten (siehe Abschnitt „Kursdatum“ und Risiko 1). Er begründet das mit „keine neuen gespeicherten Felder“. Diese Vorgabe steht im Auftrag aber unter „Datenmodell und Speicherung von Ausgaben und Vermögensverlauf“ und betrifft nicht ausdrücklich den Tranchenvertrag. Zugleich nennt der Auftrag `asOf` aus „Kurse aktualisieren“ als erwartete Quelle. Ziel sind mehr und regelmäßigere Verlaufspunkte. Nach diesem Plan sichert die Kernfunktion bei jedem Nutzer mit ETF-Beständen nie automatisch. Die Hinweismeldung „Kurse im Profil-Assets-Manager aktualisieren …“ wird dann irreführend, weil ein Kursupdate die nächste automatische Sicherung nicht freischaltet. Der Plan trifft damit still eine Produktentscheidung mit wesentlich anderem Ergebnis, statt sie zu begründen oder der Steuerung vorzulegen.

Akzeptanztest:
> Der Arbeitsplan erfüllt eine von zwei Bedingungen. (a) Er plant eine minimale, rückwärtskompatible Speicherung der Kursprovenienz, etwa ein optionales `asOf` je Tranche aus `executePriceBatch()`. Dazu nennt er exakte Pfade (Tranchenvertrag, Manager, Normalisierung, Import/Export, Tests), sieht die Pflichtvalidierung für Persistenzverträge nach AGENTS.md vor und weist nach, dass Altdaten ohne dieses Feld als unbekannt gelten. Ein Kursupdate im Manager schaltet dann bei frischen Kursen die automatische Sicherung produktiv frei. (b) Oder er legt die Entscheidung über den Stoppgrund CONTRACT-UNCLEAR ausdrücklich der Steuerung vor und beschreibt beide Ergebnisse. Ein Plan, der die dauerhaft wirkungslose ETF-Automatik nur als dokumentierte Grenze hinnimmt, erfüllt dies nicht.

Antwort des Implementierers, Runde 1 (angenommen):
> Der Plan ergänzt eine minimale, rückwärtskompatible Speicherung von asOf je Tranche samt Legacy-, Import-/Export- und Persistenzprüfungen. Ein produktiver Integrationstest muss die automatische Sicherung nach einem frischen Manager-Kursupdate belegen.

Abschlussbegründung des Prüfers:
> Der überarbeitete Arbeitsplan erfüllt Variante (a). Der Abschnitt „Kursdatum: belegte Quelle und notwendige rückwärtskompatible Erweiterung“ und Slice 3 planen ein optionales `asOf` je Tranche aus `executePriceBatch()` (UTC-Sekunden, kein Versionssprung, `TRANCHE_SCHEMA_VERSION` bleibt 2). Genannt werden exakte Pfade: `types/tranche-contract.js` (Vertrag/`normalizeOne()`), `app/tranches/tranchen-manager-page.js` (Manager), `app/tranches/tranchen-manager-state.js` (Normalisierung/Speicherweg) und `app/tranches/tranchen-manager-modal.js` (Formregeln). Import/Export über `app/profile/profile-bundle-io.js` und `app/shared/persistence-backup.js` wird mit Tests in `profile-storage.test.mjs`/`persistence.test.mjs` nachgewiesen; ist doch eine Codeänderung nötig, wird vorher eine Umfangserweiterung beantragt. Die Pflichtvalidierung nach AGENTS.md ist als verpflichtende Liste gezielter Läufe plus `npm test` durch den Orchestrator festgelegt. Altdaten ohne Feld oder mit `null` gelten ausdrücklich als „Kursdatum unbekannt“. Die Akzeptanzkriterien in Slice 4 verlangen eine produktive Node-Integration: Sie startet mit undatierten ETF-Tranchen, ruft den realen Manager-Kurslistener auf, speichert `asOf` bestätigt, lädt neu und führt einen realen CSV-Import aus. Ergebnis muss genau eine Sicherung sein; ein Browserfall ergänzt das. Die dauerhaft wirkungslose ETF-Automatik wird damit nicht mehr als Grenze hingenommen.
<!-- audit:findings:end -->

### Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft wurden: Vollständigkeit des PLAN_ONLY-Artefakts unter `docs/internal/e-auswertung-ausgaben-arbeitsplan.md` mit fünf durchgehend nummerierten Slices, exakten Pfadlisten und Akzeptanzkriterien (Attestierung `internal:work-plan-contract` PASS, future_slices=5). Die Diff betrifft ausschließlich den autorisierten Pfad. Weiter geprüft: Erfüllung von R-01 (a) inklusive Abgrenzung von „keine neuen gespeicherten Felder“ auf Ausgaben und Vermögensverlauf, Fehlerpfade (ungültiges `asOf` wird feldbezogen abgelehnt, Teilfehler, Abbruch, Profilwechsel), Importunabhängigkeit der Sicherung, Toast-API (boolesch/`'info'`), 7-Tage-Grenze mit fester Uhr, Idempotenz über die Tagesersetzung `manual:YYYY-MM-DD` und die Budgetentscheidung samt Begründung.

Größtes Restrisiko:
> Die Codebelege des Plans konnten nicht gegen die Quelldateien geprüft werden, weil die Anfrage die Lesezugriffe auf Manifest, Anfrage und Diff begrenzt und kein Repository-Snapshot dieser Module in der Evidenz liegt. Betroffen sind Zeilenbereiche in `tranchen-price-service.js` und `tranchen-manager-page.js`, die `toast()`-Signatur und die Zählweise von `computeYearStats()`. Falls `normalizeOne()` die Engineprojektion an weitere Konsumenten durchreicht, kann das zusätzliche Feld außerhalb der genannten Pfade Anpassungen erfordern. Der Plan begegnet dem mit Regressionsläufen und einer vorab beantragten Umfangserweiterung.

Bruchbedingung:
> Der Plan scheitert, wenn eine der folgenden Bedingungen eintritt. Erstens: Die Validierung des persistierten Tranchenvertrags in `persistence-backup.js` oder `profile-bundle-io.js` verwirft unbekannte Felder oder kopiert sie feldweise, sodass `asOf` beim Roundtrip ohne IO-Codeänderung verloren geht. Zweitens: Eine Engine- oder Simulator-Komponente reagiert empfindlich auf das neue Feld in der Engineprojektion. In beiden Fällen ist eine Umfangserweiterung für Slice 3 nötig.

Vorab-Risikoanalyse:
> Wahrscheinlichster Fehlschlag in der Umsetzung: In Slice 4 bildet der Provenienzleser die zur PREVIEW beitragenden Tranchen bei aktivem Profilverbund nicht vollständig ab. Synthetische Aggregate könnten fälschlich als „keine kursabhängigen Bestände“ gelten und eine Sicherung ohne Frischenachweis auslösen. Ebenso könnte der Leser reale Tranchen anderer Profile übersehen. Der Plan verlangt dafür ausdrücklich Tests mit mehreren Profilen und positiven ETF-Aggregaten ohne Provenienz. Zweites Risiko: Die Formregel in `readTrancheFromForm()` erhält `asOf` trotz geändertem Preis oder verliert es bei reinen Notizänderungen. Dagegen stehen die Formtests in Slice 3.
<!-- audit:approval:end -->
