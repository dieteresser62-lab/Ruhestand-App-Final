# Slice-uebergreifendes Review der Suite-Datenintegritaet-Haertung

**Reviewdatum:** 2026-07-29
**Reviewer:** Claude (Primary reviewer & Analyst)
**Pruefgegenstand:** Gesamtergebnis der Slices 1 bis 16 auf
`codex/suite-datenintegritaet-hardening`, Kopfcommit `860ba50`
**Grundlage:** `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`,
die sechzehn Slice-Dokumente, der Arbeitsbaum
**Methode:** adversariales Review nach `CLAUDE.md`; gesucht wurden
ausschliesslich Fehlerbilder, die erst im Zusammenspiel mehrerer Slices
entstehen und deshalb in keinem Einzelreview sichtbar werden konnten

## Abgrenzung

Dieses Review prueft nicht die einzelnen Slices erneut. Die sechzehn
Einzelfreigaben durch Gemini und Claude bleiben unberuehrt; keiner der hier
dokumentierten Befunde stellt eine dieser Freigaben in Frage. Gegenstand ist
allein die Frage, ob das Gesamtvorhaben als abgeschlossen gelten kann.

Die Freigabestatus der Slice-Dokumente und des Hauptplans bleiben unveraendert;
Statusaenderungen sind Nutzer- beziehungsweise Gemini-Entscheidung.

## Verifikationsbasis

Alle Aussagen dieses Dokuments beruhen auf eigener Messung am Kopfcommit, nicht
auf der Uebernahme fremder Protokolle.

| Nachweis | Ergebnis |
| --- | --- |
| `npm test` | 9.184/9.184 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | 27/27 Szenarien, 0 Fehlerzeilen |
| `npm run docs:evidence` | gruen fuer 2026-07-29; 69 MKT-, 55 FOR-Records, 17 MAP-Anker, 10 Matrixtermine |
| `git status --short` | leer; Arbeitsbaum sauber |
| Systemuhr eingefroren auf 2026-11-15 | `npm test` 9.184/9.184 |
| Systemuhr eingefroren auf 2026-12-31 | `balance-ui-orchestration.test.mjs` 238/238 |
| Systemuhr eingefroren auf 2027-01-01 | `balance-ui-orchestration.test.mjs` 155/155 mit 1 Fehlschlag, Runner-Exitcode 1 |
| Systemuhr eingefroren auf 2027-03-01, 2028-02-29, 2030-05-05 | jeweils dasselbe Bild, keine weitere Datei betroffen |

Das Einfrieren der Uhr erfolgte ueber einen `--import`-Loader, der `Date`
ersetzt; die Umgebungsvariable wird an die isolierten Kindprozesse des Runners
vererbt. Der Arbeitsbaum wurde dafuer nicht veraendert.

## Prueferdimension 1 - Korrektheit

Die Frage lautet nicht, ob die einzelnen Fixes korrekt sind, sondern ob das
Vorhaben das erreicht hat, was es sich als Nachweisziel gesetzt hat.

Der Hauptplan definiert in `## Findings-Register` fuenfundsechzig Diagnosebefunde
und ordnet jedem in der Zuordnungstabelle einen Fix-Slice **und** einen
Nachweis-Slice zu. Gemessen nennen achtunddreissig dieser Befunde Slice 16 als
Nachweis-Slice: BAL-01, BAL-02, BAL-04, BAL-06, DAT-01, DAT-02, DAT-03, DAT-05,
ENG-01, ENG-05, ENG-06, SWP-01 bis SWP-04, SWP-06, SWP-07, SWP-09 bis SWP-11,
OPT-01, OPT-07, SIM-02 bis SIM-05, IMP-01, IMP-02, PER-02, PER-05 sowie MOD-01
bis MOD-08. Im Dokument von Slice 16 kommt **keiner** dieser achtunddreissig
Bezeichner vor. Gegenprobe: jeder Befund wird jeweils genau in seinem Fix-Slice
gefuehrt - SWP-01 und SWP-09 in Slice 09, SIM-04 in Slice 06, BAL-01 in
Slice 01, DAT-01 in Slice 03, MOD-01 in Slice 15. Die zweite Haelfte des
geplanten Nachweisverfahrens wurde nie ausgefuehrt. Siehe G-01.

Sechs Befunde erscheinen darueber hinaus in gar keinem Slice-Dokument:
OPT-07, IMP-02, PER-02, PER-05, QA-01 und QA-02. Alle sechs sind P1 und alle
sechs nennen Slice 16 als Nachweis.

## Prueferdimension 2 - Vertragstreue

Der Hauptplan definiert unter `## Verbindliche Zielvertraege und Invarianten`
acht Vertraege I-01 bis I-08. Gemessen erscheinen die Bezeichner `I-01` bis
`I-08` an genau acht Stellen im gesamten Repository - naemlich in ihrer eigenen
Definition im Hauptplan. Null Vorkommen in den sechzehn Slice-Dokumenten, null
in `tests/`, null im Rueckverfolgbarkeitsinventar von Slice 16. Waehrend die
Orakel O-01 bis O-22 bis in `oracle-traceability-v1.json` durchgetragen wurden,
sind die verbindlichen Invarianten nach ihrer Formulierung nie wieder
aufgegriffen worden. Siehe G-02.

Ein zweiter Vertragsbruch betrifft eine Fachgroesse, nicht ein Dokument. Fuer
den Goldzielanteil existieren nach sechzehn Slices drei verschiedene Domaenen
in drei Schichten, und die engste greift still. Siehe G-04.

## Prueferdimension 3 - Fehlerbehandlung

Das Vorhaben hat die Aussengrenze konsequent auf fail-closed umgestellt: Import,
Persistenz, Vollbackup, Profilbundle und CSV weisen ungueltige Eingaben mit
strukturierten Fehlercodes ab. Im Rechenkern gilt das nicht. Gemessen an drei
Stellen liefert derselbe Fehlerfall dort still einen plausibel aussehenden Wert
statt eines Fehlers. Siehe G-04, G-05 und G-06.

Besonders aufschlussreich ist die Symmetriebrechung beim Boolean: Orakel O-16
verlangt ausdruecklich, dass ein importiertes `dynamicFlex: "false"` als String
ohne Mutation abgewiesen wird. Im Haushaltsvertrag wird dieselbe Fehlerklasse
still abgeraeumt - `hasPartner: "true"` als String fuehrt gemessen zu Faktor
0,5 statt 0,875, ohne jede Meldung.

## Prueferdimension 4 - Seiteneffekte

`app/simulator/sweep-runner.js` wurde in fuenf Slices angefasst - 01, 07, 08, 09
und 16. Jeder dieser Slices hat die Menge der Schluessel in `caseOverrides`
erweitert. Keiner hat bemerkt, dass die Funktion jeden dieser Schluessel
bedingungslos in die Engine-Inputs schreibt, auch wenn der Aufrufer ihn nicht
liefert. Gemessen werden bei einem Aufruf mit einem einzigen Parameter acht von
neun Basiswerten auf `undefined` gesetzt. Siehe G-06.

Der Schluesselvertrag der Persistenz existiert in zwei unabhaengig gepflegten
Fassungen, weil ein Importzyklus die Wiederverwendung der kanonischen Definition
verhindert. Siehe G-07.

## Prueferdimension 5 - Was koennte brechen

Am 2027-01-01 - in fuenf Monaten - verliert die Testsuite ihre
Reproduzierbarkeit. Das ist kein Risiko, sondern ein Termin. Siehe G-03.

## Findings

### G-01 - Slice 16 hat den Nachweisauftrag fuer 38 von 65 Diagnosebefunden nicht eingeloest

**Messung.** Die Zuordnungstabelle des Hauptplans weist achtunddreissig Befunden
Slice 16 als Nachweis-Slice zu. Das Dokument
`SLICE_SUITE_DATA_16_GESAMTINTEGRATION.md` nennt keinen einzigen dieser
Bezeichner. Es besitzt - anders als Slice 15 - auch keinen Abschnitt
`## Finding-Traceability`.

**Warum das kein formaler Mangel ist.** Slice 16 hat seine eigenen
Akzeptanzkriterien vollstaendig erfuellt; die beziehen sich auf O-01 bis O-22,
sechs Browserworkflows, vier Paritaetsachsen und die Kausalitaetsmatrix. Aber
O-01 bis O-22 stammen vom 2026-07-23 und sind eine andere, kleinere Menge als
die fuenfundsechzig Befunde. Zwischen beiden Mengen gibt es keine dokumentierte
Abbildung. Damit laesst sich aus den Artefakten fuer keinen der achtunddreissig
Befunde belegen, dass der Fix im Zusammenspiel der Suite wirkt - nur, dass er im
Fix-Slice isoliert getestet wurde. Genau diese Luecke sollte der Nachweis-Slice
schliessen.

**Was fehlt konkret.** Eine Tabelle Befund -> Orakel/Witness -> Gate, die
belegt, dass zum Beispiel SWP-09 (Ruin-/Drawdown) durch O-14 in
`simulator-sweep.test.mjs` und PER-05 (Vollbackup-Preflight) durch den
Browserwitness `full backup recovery` abgedeckt ist. Fuer PER-05 existiert der
Witness sogar - er ist nur nirgends mit dem Befund verknuepft.

### G-02 - Die acht verbindlichen Zielvertraege I-01 bis I-08 sind nach ihrer Definition nie wieder referenziert worden

**Messung.** Acht Vorkommen der Bezeichner `I-01` bis `I-08` im gesamten
Repository, alle acht in der Definitionsstelle des Hauptplans. Null Vorkommen in
Slice-Dokumenten, Tests oder im Traceability-Inventar.

**Konsequenz.** Die Invarianten waren als oberste Abnahmeschicht des Vorhabens
gedacht - I-01 "Preview ist nicht Commit", I-04 "Kanonische Zahlengrenze",
I-06 "Parameterfidelity" und so weiter. Nach Abschluss kann niemand aus den
Artefakten beantworten, ob sie gelten. Inhaltlich gibt es fuer jede von ihnen
Tests; formal ist keine von ihnen abgenommen. Das ist die Kehrseite von G-01
und wiegt schwerer, weil die Invarianten - anders als die Befunde - keinen
Fix-Slice haben, in dem sie ersatzweise dokumentiert waeren.

### G-03 - Die Testsuite verliert am 2027-01-01 ihre Reproduzierbarkeit

**Messung.** Mit eingefrorener Systemuhr:

| Datum | `balance-ui-orchestration.test.mjs` | Gesamtsuite |
| --- | --- | --- |
| 2026-11-15 | 238/238 | 9.184/9.184 |
| 2026-12-31 | 238/238 | - |
| 2027-01-01 | 155/155 mit 1 Fehlschlag | 9.101, Exitcode 1 |
| 2027-03-01 / 2028-02-29 / 2030-05-05 | identisch | identisch |

Die fehlschlagende Assertion ist `tests/balance-ui-orchestration.test.mjs:1186`
("CSV-Import durchlaeuft Preview und persistente Bestaetigung", erwartet 2,
erhaelt 0). Ursache: der Test setzt `marketCsvMode = 'current'` und
`marketCsvTargetYear = '2025'` fest, waehrend
`resolveCurrentMarketCsvTargetYear` (`app/balance/balance-binder-imports.js:1076`)
bei fehlendem `pendingCommit` auf `deriveCompletedCalendarYear(new Date())`
zurueckfaellt. Ab dem Jahreswechsel erwartet der Produktivvertrag 2026, der Test
liefert 2025, und `market_csv_period_mismatch` bricht den Import ab.

**Gutes Verhalten.** Der Runner meldet Exitcode 1; der Gate ist fail-closed, es
verschwinden keine Assertions unbemerkt.

**Ausdehnung auf den Browsergate.** `tests/browser-smoke.test.mjs:721-726`
enthaelt dieselbe Konstruktion - `selectOption('current')`, `fill('2025')` -
und der Seed-State setzt `pendingCommit: null`. Der Kipppunkt gilt dort nach
Codelage identisch. Diesen Teil habe ich nicht gemessen, weil die Uhr der
Playwright-Seite nicht ueber den Node-Loader erreichbar ist; die Aussage ist
abgeleitet, nicht belegt.

**Warum kein Einzelreview das sehen konnte.** Der Test entstammt Slice 01
(Preview/Commit), die Datumsbindung entstammt Slice 12 (CSV-Provenienz). Slice 15
hat mit T15-1 die Systemuhr aus der Suite entfernt - aber nur die des
Doku-Gates. Das damals eroeffnete Restrisiko U15-2 ("die Suite als Ganzes ist
weiterhin nicht datumsunabhaengig") wurde nie beziffert. Es sind fuenf Monate.

### G-04 - Dieselbe Fachgroesse hat drei Domaenen; die engste korrigiert still auf den Default

**Messung.** Fuer den Goldzielanteil:

| Schicht | Datei | Domaene | Verhalten ausserhalb |
| --- | --- | --- | --- |
| Profilvalidierung | `app/profile/profile-asset-values.js:181` | 0 bis 100 | fail-closed; 100,5 wird abgewiesen |
| Haushaltsaggregation | `app/profile/profile-asset-values.js:102` | unbegrenzt | Quotient aus Betrag und Basis, keine Pruefung |
| Balance-Reader | `app/balance/balance-reader.js:301` | 0 bis 50 | **still** auf `DEFAULT_GOLD_ZIEL = 7.5` |

Gemessen: `validateProfileAssetValues` akzeptiert 7,5 / 50 / 50,0001 / 60 / 100
und weist erst 100,5 ab. Zwei Profile zu je 500.000 EUR mit je 60 Prozent
Goldziel ergeben aggregiert `goldZielProzent = 60` bei `goldZielBetrag =
600.000 EUR`. Der Reader ersetzt die 60 durch 7,5 - der Zielbetrag faellt damit
von 600.000 EUR auf 75.000 EUR, ohne Meldung.

**Erreichbarkeit.** `depot-tranchen-manager.html:736` fuehrt
`<input type="number" id="profileGoldZiel" step="0.1" min="0" max="100">`. Der
Wert 60 ist interaktiv eingebbar, wird validiert, persistiert und aggregiert -
und dann verworfen.

**Verhaeltnis zum Bestand.** Y04-2 hat die Divergenz der Domaenen benannt und
ist als Restrisiko offen. Nicht gemessen wurde die Groesse des Effekts: es wird
nicht auf 50 geklemmt, sondern auf 7,5 zurueckgesetzt. Das ist inhaltlich die
Fehlerklasse DAT-01, gegen die das Vorhaben angetreten ist - ein
entscheidungsrelevanter Betrag aendert sich still um den Faktor acht.

### G-05 - Fail-closed an der Aussengrenze, fail-open im Rechenkern

**Messung** an `computeHouseholdFlexFactor`
(`app/simulator/simulator-engine-helpers.js:523`), Paar mit Pflegefall bei P1:

| Aufruf | Ergebnis |
| --- | --- |
| vollstaendig | 0,875 |
| `hasPartner` fehlt | 0,5 |
| `hasPartner: "true"` (String) | 0,5 |
| `p1Alive` fehlt | 0,75 |
| alle Felder fehlen | 0 |

Kein Aufruf wirft, keiner meldet. Der letzte Fall kappt das gesamte Flexbudget
auf null. Die Funktion ist ueber
`app/simulator/simulator-engine-direct.js:923` oeffentlich re-exportiert.

**Der Stringfall ist der Kern.** Orakel O-16 verlangt, dass ein importiertes
`dynamicFlex: "false"` ohne Mutation abgewiesen wird - der Importpfad ist gegen
genau diese Falle gehaertet. Der Rechenkern nicht. Beide Pfade gehoeren
demselben Vorhaben an.

**Bestand.** B08-1 beschreibt den Fall `hasPartner` fehlt und ist offen. Der
Stringfall und der Nullfall sind darin nicht enthalten.

### G-06 - `buildSweepInputs` ist eine Total-Ueberschreibung, die sich als Teil-Ueberschreibung liest - und der Bestand enthaelt bereits einen Teilaufruf

**Messung.** `buildSweepInputs(base, { targetEq: 70 })` mit vollstaendigem
`base`:

| Schluessel | Basis | nach dem Aufruf |
| --- | --- | --- |
| runwayMinMonths | 24 | `undefined` |
| runwayTargetMonths | 36 | `undefined` |
| targetEq | 60 | 70 |
| rebalBand | 5 | `undefined` |
| maxSkimPctOfEq | 10 | `undefined` |
| maxBearRefillPctOfEq | 5 | `undefined` |
| horizonYears | 27 | `undefined` |
| survivalQuantile | 0,85 | `undefined` |
| goGoMultiplier | 1,1 | `undefined` |

Acht von neun Basisannahmen verschwinden. `engine/core.mjs:81` normalisiert
`undefined` auf 0.

**Der Teilaufruf existiert bereits.** `tests/longevity-engine-runner.test.mjs:200`
ruft die Funktion ohne `horizonYears`, `survivalQuantile` und `goGoMultiplier`
auf. Nachgemessen mit exakt diesen Argumenten: `horizonYears` 30 ->
`undefined`, `survivalQuantile` 0,85 -> `undefined`, `goGoMultiplier` 1 ->
`undefined`. Der Test besteht, weil er ausschliesslich
`inputs.longevityBufferYears` prueft.

**Warum kein Gate das sieht.** Der Contract-Test von Slice 16 baut sein
`sweepParams` aus **allen** Kausalitaetszeilen
(`tests/suite-data-integration-contract.test.mjs:161`). Er kann den Teilfall
strukturell nicht beobachten. Der Browserpfad liefert ebenfalls immer alle neun
Werte - deshalb ist der Befund im interaktiven Betrieb heute folgenlos.

**Verhaeltnis zum Bestand.** T16-1 beschreibt denselben Mechanismus fuer
`horizonYears` allein. Der Umfang - acht Schluessel, plus ein bereits
existierender Teilaufrufer im Testbestand - ist neu.

### G-07 - Der Schluesselvertrag der Persistenz existiert in zwei unabhaengig gepflegten Fassungen

**Messung.** `app/shared/persistence-key-policy.js` deklariert in den Zeilen 5,
11 und 24 `PROFILE_STORAGE_KEYS`, `PROFILE_VALUE_KEYS` und
`PROFILE_SCOPED_FIXED_KEYS` als Literale neu.
`app/profile/profile-key-policy.js:2` importiert dieselben Konstanten dagegen
kanonisch aus `profile-state.js`. Beide Fassungen sind heute deckungsgleich.

**Die Duplizierung ist erzwungen.** Der Importgraph enthaelt einen Zyklus:
`persistence-key-policy` -> `profile-state` -> `persistence-facade` ->
`persistence-adapter-indexeddb:4` -> `persistence-key-policy`. Ein
Direktimport ist ohne Herausloesen der Konstanten in ein blattnahes Modul nicht
moeglich. Das ist eine Architekturaussage, kein Versaeumnis - macht die Kopplung
aber nicht weniger fragil.

**Konsequenz bei Drift.** Ein kuenftiger Profilschluessel, der in
`profile-state.js` ergaenzt, in `persistence-key-policy.js` aber vergessen wird,
ist gemessen an der Codelage: profilbezogen (kanonisch korrekt erkannt), aber
nicht in `isAllowedSnapshotCaptureKey` und nicht in
`isAllowedPersistenceImportKey`. Er existiert dann live, ist profilgebunden -
und liegt in keinem Recovery-Punkt und in keinem Vollbackup.

**Was ich zunaechst vermutet und dann widerlegt habe.** Der Verdacht, ein solcher
Schluessel werde beim Vollbackup-Import zerstoert, ist falsch:
`replaceRecordsTransactional` (`app/shared/persistence-facade.js:409`) bestimmt
auch die Loeschmenge ueber dieselbe Allowlist, nicht erlaubte Livewerte bleiben
also unangetastet. Ebenso weist `buildFullPersistenceBackup:284` ausgeschlossene
Schluessel in `excludedKeys` und `excludedRecordCount` sichtbar aus. Still ist
nur der Recovery-Pfad `collectAllowedFacadeRecords:265`, aufgerufen in
`importFullPersistenceBackup:453` - und der ist im Umfang konsistent zum
Replace. Der Befund reduziert sich damit auf die fehlende Kopplung der beiden
Fassungen.

**Keine Absicherung.** `tests/snapshot-key-policy.test.mjs` prueft einzelne
Schluessel, kein Test importiert beide Definitionen und vergleicht sie. Das ist
M01-1 ("Allowlist ohne Vollstaendigkeitssicherung", seit Slice 01 offen) in
genau dem Modul, das gegen diese Fehlerklasse gebaut wurde.

### G-08 - Das Nachweisinventar deckt die Slices 14 und 15 nicht ab

**Messung.** `oracle-traceability-v1.json` benennt einundzwanzig
Witness-Dateien. Nicht darunter: `persistence.test.mjs`,
`snapshot-archive.test.mjs`, `balance-storage-contract.test.mjs`,
`profile-state.test.mjs`, `profilverbund-balance.test.mjs`,
`architecture-evidence.test.mjs`. Slice 13 ist ueber O-18 mit
`profile-storage.test.mjs` vertreten, Slice 14 und Slice 15 gar nicht.

**Fairnesshalber.** O-01 bis O-22 stammen vom 2026-07-23 und damit aus einer
Zeit vor den Slices 13 bis 15. Slice 16 verletzt sein Akzeptanzkriterium 1
nicht - dieses ist ausdruecklich auf O-01 bis O-22 begrenzt. Der Befund richtet
sich gegen den Endzustand, nicht gegen den Slice: das Inventar, das als
maschinenpruefbare Rueckverfolgbarkeit der Suite gedacht ist, kennt die
Vollbackup-, Recovery- und Modelltransparenzvertraege nicht.

### G-09 - Mindestens 92 offene Befunde ohne zentrales Register

**Messung.** Ueber alle sechzehn Slice-Dokumente treten 230 verschiedene
Befundkennungen auf. Aus den jeweils letzten Review-Ergebnissen sind
zweiundneunzig Kennungen namentlich als offen ausgewiesen; wegen
Bereichsangaben wie "T16-1 bis T16-7" oder "F11-3 bis F11-6" liegt die
tatsaechliche Zahl darueber. Fuenfundvierzig in den Slice-Dokumenten gefuehrte
Kennungen kommen im Hauptplan ueberhaupt nicht vor: B08-3, C09-7, C09-8,
D09-4 bis D09-7, D14-1, E10-5 bis E10-7, E11-11, F10-2 bis F10-6, F11-3 bis
F11-5, G11-3, M01-2, N01-2, N01-4, N01-5, S01-2, S01-5, S01-6, S11-1, S11-2,
S13-6, S13-11, S14-7 bis S14-9, S14-11, U09-1, U13-2 bis U13-4, W02-2, Y04-2,
Y04-4, Z06-2 und Z06-3. Darunter sind mit Y04-2 und M01-2 zwei Befunde, die
dieses Review als G-04 beziehungsweise G-07 wieder aufgreift.

**Konsequenz.** Der Hauptplan fuehrt eine append-only-Chronologie und eine
Entscheidungstabelle, aber kein Register offener Punkte. Wer wissen will, was
nach sechzehn Slices offen ist, muss sechzehn Dokumente mit zusammen ueber
17.000 Zeilen lesen und die jeweils letzten Ergebnisbloecke von Hand
zusammensetzen. Genau das macht in der Praxis niemand - und deshalb sind
Befunde wie U15-2 (siehe G-03) und Y04-2 (siehe G-04) benannt, aber ohne
Wirkung geblieben.

### G-10 - Betriebshinweis: das lokale `dist/` ist sechs Monate alt

**Messung.** `dist/Simulator.html` traegt den Zeitstempel 2026-07-22, also den
Tag der Ausgangsdiagnose; `Simulator.html`, `Balance.html` und `Handbuch.html`
weichen inhaltlich ab, `engine.js` ist identisch. `dist/` ist ueber
`.gitignore:29` ausgeschlossen und nicht getrackt.

**Entlastend.** `scripts/build-tauri.ps1:293` ruft `npm run sync-dist` vor dem
Build, das Verzeichnis wird also beim Erzeugen des Desktopartefakts erneuert.
Kein Gate prueft die Uebereinstimmung; wer die Suite direkt aus `dist/`
oeffnet, arbeitet mit dem ungehaerteten Stand.

## Geprueft und verworfen

Diese Verdachtsmomente habe ich gemessen und nicht als Befund gefuehrt:

1. **Fail-open-Runner.** Vermutung: die Suite meldet bei datumsbedingtem
   Fehlschlag "Failed Files: 0" und beendet mit 0. Gemessen: Exitcode 1. Der
   Gate ist fail-closed.
2. **Stille Assertionsverluste ueber die Zeit.** Vermutung: mit fortschreitendem
   Datum verschwinden Assertions unbemerkt. Gemessen ueber 2026-11-15,
   2027-03-01, 2028-02-29 und 2030-05-05: die Gesamtzahl faellt genau einmal von
   9.184 auf 9.101, und zwar als Folge des Abbruchs derselben Datei. Keine
   weitere Datei ist datumsgebunden.
3. **Zerstoerung nicht gelisteter Schluessel beim Vollbackup-Import.** Widerlegt,
   siehe G-07.
4. **Stiller Ausschluss beim Backup-Export.** Widerlegt: `excludedKeys` und
   `excludedRecordCount` sind Bestandteil des Exportdokuments.
5. **Divergenz zwischen `profile-key-policy` und `profile-state`.** Widerlegt:
   `profile-key-policy.js:2` importiert kanonisch. Betroffen ist allein
   `persistence-key-policy.js`.
6. **Stale `engine.js` gegenueber `engine/`.** Widerlegt: `engine.js` in `dist/`
   und im Wurzelverzeichnis sind blobgleich, und die Delta-Baseline von Slice 16
   pinnt die Datei.
7. **Ungetrackte Testdateien.** Widerlegt: `getTestFiles`
   (`tests/run-tests.mjs:183`) liest das Verzeichnis vollstaendig; alle 137
   Testdateien laufen. Es gibt keine Registrierungsliste, die etwas auslassen
   koennte.

## Findings-Lifecycle

- Neu eingefuehrte Blocker fuer den Abschluss des Gesamtvorhabens: G-01, G-02,
  G-03.
- Neu eingefuehrte Restrisiken: G-04 bis G-10.
- Verhaeltnis zum Bestand: G-04 vertieft Y04-2, G-05 vertieft B08-1, G-06
  vertieft T16-1, G-07 vertieft M01-1, G-03 beziffert U15-2. Keiner der
  bestehenden Befunde wird durch dieses Review geschlossen.
- Unveraendert offen: die mindestens zweiundneunzig unter G-09 gezaehlten
  Restrisiken der Einzelslices.
- Keine der sechzehn Einzelfreigaben wird durch dieses Review beruehrt.

## Pre-Mortem

*Angenommen, dieses Vorhaben verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Der Jahreswechsel. Am 2027-01-01 wird `npm test` rot, und zwar in einer
Balance-Orchestrierungsdatei, deren Fehlermeldung nach einem CSV-Importproblem
aussieht und nicht nach einem Kalenderproblem. Wer das nicht weiss, sucht den
Fehler im Importpfad. Der naheliegende Weg des geringsten Widerstands ist, die
Jahreszahl im Test von 2025 auf 2026 hochzusetzen - womit die Falle exakt ein
Jahr weiter gestellt und die Ursache erneut nicht behoben wird. Dass Slice 15
die Systemuhr aus dem Doku-Gate bereits entfernt hat, verstaerkt die
Fehlannahme, die Suite sei datumsunabhaengig.

Zweitwahrscheinlich: jemand ruft `buildSweepInputs` aus einem neuen
programmatischen Pfad mit einer Teilparametrisierung auf - genau so, wie es
`longevity-engine-runner.test.mjs` heute schon tut. Acht Basisannahmen werden
auf `undefined` gesetzt, `engine/core.mjs:81` macht daraus Nullen, und die
Ergebnisse sind plausibel, aber falsch. Kein Gate schlaegt an, weil der
Contract-Test der Gesamtintegration den Teilfall strukturell nicht erzeugen
kann.

Drittens: ein Nutzer setzt im Tranchenmanager ein Goldziel von 60 Prozent -
ein Wert, den die Oberflaeche mit `max="100"` anbietet und die Profilvalidierung
akzeptiert - und plant anschliessend mit 7,5 Prozent, ohne dass irgendetwas
darauf hinweist.

Viertens, und am schwersten zu reparieren: In sechs Monaten fragt jemand, ob
BAL-04 oder PER-05 nun behoben sind. Die Antwort steht in keinem Artefakt. Die
Fixes existieren, die Tests laufen - aber die Kette vom Befund zum Nachweis ist
nie geschlossen worden, und sie laesst sich aus dem Gedaechtnis nicht
rekonstruieren.

## Review-Ergebnis

- **Status:** blockiert - bezogen auf die Feststellung, dass das
  Gesamtvorhaben abgeschlossen ist. Die sechzehn Einzelfreigaben bleiben
  unberuehrt; am Kopfcommit ist kein Gate rot und keine Auslieferung gefaehrdet.
- **Blocker:**
  - G-01 - Slice 16 hat den Nachweisauftrag fuer achtunddreissig von
    fuenfundsechzig Diagnosebefunden nicht eingeloest; keiner der Bezeichner
    kommt im Slice-16-Dokument vor.
  - G-02 - die acht verbindlichen Zielvertraege I-01 bis I-08 sind seit ihrer
    Definition nie wieder referenziert worden; null Vorkommen in Slices, Tests
    und Inventar.
  - G-03 - die Testsuite ist ab dem 2027-01-01 nicht mehr gruen; gemessen,
    Ursache und Zeile bekannt, fuenf Monate Vorlauf.
- **Restrisiken:** G-04 (drei Domaenen fuer den Goldzielanteil, stille
  Ruecksetzung auf 7,5 statt Klemmung auf 50; interaktiv erreichbar),
  G-05 (fail-open im Rechenkern, gemessen an fuenf Aufrufvarianten des
  Haushaltsflexfaktors, einschliesslich der Stringboolean-Falle aus O-16),
  G-06 (acht statt einer stillen `undefined`-Ueberschreibung in
  `buildSweepInputs`, mit bereits existierendem Teilaufrufer im Testbestand),
  G-07 (zwei unabhaengig gepflegte Fassungen des Persistenz-Schluesselvertrags,
  durch einen Importzyklus erzwungen, ohne bindenden Test),
  G-08 (das Nachweisinventar kennt die Slices 14 und 15 nicht),
  G-09 (mindestens zweiundneunzig offene Befunde ohne zentrales Register),
  G-10 (lokales `dist/` sechs Monate alt) sowie unveraendert alle unter G-09
  gezaehlten Restrisiken der Einzelslices.
- **Pre-Mortem:** siehe oben - der Jahreswechsel macht die Suite rot, die
  Fehlermeldung zeigt in die falsche Richtung, und die naheliegende Korrektur
  stellt die Falle ein Jahr weiter.

Was das Vorhaben erreicht hat, ist an den Gates ablesbar: 9.184 Assertions,
27 Browserszenarien, ein Doku-Gate und ein maschinenpruefbares Inventar, wo zu
Beginn eine Diagnose stand. Was fehlt, ist der Schlussstein - der Beleg, dass
die fuenfundsechzig Befunde und die acht Invarianten, mit denen das Vorhaben
begonnen hat, am Ende auch tatsaechlich adressiert sind. Solange dieser Beleg
nicht existiert, ist der Abschluss eine Behauptung und keine Feststellung.

Die drei Blocker sind Nachweis- und Terminfragen, keine Codefehler. G-01 und
G-02 lassen sich ohne Aenderung an Programmdateien schliessen. G-03 erfordert
eine Aenderung an zwei Testdateien und ist keine Fachentscheidung.

## Review-Feedback von Gemini zum Gesamtreview

**Review-Datum:** 2026-07-29  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Unabhängige Evaluierung des von Claude erstellten Gesamtreviews (`docs/internal/SUITE_DATENINTEGRITAET_GESAMTREVIEW.md`).

### Evaluierung der Prüfdimensionen & Bestätigung der Befunde

1. **Bestätigung der 3 Blocker (G-01, G-02, G-03):**
   - **G-01 (Abschlussnachweis für 38 Diagnosebefunde fehlt):** Vollinhaltlich bestätigt. Die 38 im Hauptplan an Slice 16 zugewiesenen Nachweis-Befunde (BAL-01, DAT-01, SWP-09, PER-05 etc.) wurden in `SLICE_SUITE_DATA_16_GESAMTINTEGRATION.md` nicht mit ihren konkreten Test-Witnesses verknüpft.
   - **G-02 (Verbindliche Zielverträge I-01 bis I-08 unangemessen):** Vollinhaltlich bestätigt. Die 8 Hauptinvarianten des Master-Plans besitzen bisher kein maschinenlesbares oder dokumentiertes Freigabe-Mapping.
   - **G-03 (Kalenderfalle ab 01.01.2027 in `balance-ui-orchestration.test.mjs`):** Unabhängig reproduziert und verifiziert. Der Test setzt für `marketCsvMode = 'current'` hart das Jahr `'2025'` an. Ab 2027 evaluiert `deriveCompletedCalendarYear(new Date())` zu `2026`, was zu einem `market_csv_period_mismatch` Abbruch führt.

2. **Evaluierung der Restrisiken G-04 bis G-10:**
   - G-04 (Domänendivergenz & Stiller Goldziel-Reset im `balance-reader.js`), G-05 (Fail-open Parameter handling), G-06 (`buildSweepInputs` Partial-Override), G-07 (Schlüsselvertrags-Duplizierung durch Zirkelimport), G-08 (Fehlende Traceability für Slices 14/15), G-09 (Register offener Punkte) und G-10 (`dist/` Stand) werden als valide Architektur- und Dokumentationshinweise für eine abschließende Bereinigung bestätigt.

### Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: blockiert (Bezogen auf die Gesamtfreigabe des Projekts als "abgeschlossen")
- Blocker: G-01 (Fehlendes Traceability-Mapping für 38 Diagnosebefunde in Slice 16), G-02 (Fehlender Nachweis für Zielverträge I-01 bis I-08), G-03 (Kalenderfalle ab 01.01.2027 in balance-ui-orchestration.test.mjs & browser-smoke.test.mjs).
- Restrisiken: G-04 bis G-10 (wie von Claude dokumentiert).
- Pre-Mortem: Am 01.01.2027 schlägt `npm test` fehl; die Fehlermeldung verweist irreführend auf ein CSV-Importproblem statt auf die verstrichene Systemzeit.
```


## Re-Review durch Claude nach der G-01-bis-G-03-Nachbesserung

**Reviewdatum:** 2026-07-29
**Reviewer:** Claude (Primary reviewer & Analyst)
**Pruefgegenstand:** Nachbesserung von Codex zu den Blockern G-01, G-02 und
G-03 auf `codex/suite-datenintegritaet-hardening` gegen Kopfcommit `860ba50`
**Methode:** adversariales Re-Review nach `CLAUDE.md`; jede Aussage der
Nachbesserung wurde unabhaengig nachgemessen, nicht aus dem Protokoll
uebernommen

### Vorbemerkung zu einer eigenen Ungenauigkeit

Mein Gesamtreview schreibt zu den sechs in keinem Slice-Dokument genannten
Befunden: "Alle sechs sind P1 und alle sechs nennen Slice 16 als Nachweis."
Das trifft nur auf vier zu. OPT-07, IMP-02, PER-02 und PER-05 fuehren Slice 16
in der Nachweisspalte; QA-01 und QA-02 fuehren Slice 16 als **Fix**-Slice, ihre
Nachweisspalte lautet "unabhaengige Orakel O-01 bis O-22" beziehungsweise
"Coverage-/Boundary-Inventar". Die Zahl 38 fuer die Slice-16-Nachweismenge ist
davon unberuehrt und bleibt nachgemessen richtig; QA-01 und QA-02 waren dort nie
enthalten. Codex hat diese Unterscheidung in seiner Tabelle korrekt getroffen.

### Verifikationsbasis

| Nachweis | Ergebnis |
| --- | --- |
| `npm test` | 9.892/9.892 Assertions, 137 Dateien, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm test`, Uhr eingefroren auf 2027-01-01 | 9.892/9.892, 0 offene Handles |
| `npm test`, Uhr eingefroren auf 2027-06-15 | 9.892/9.892 |
| `npm test`, Uhr eingefroren auf 2030-05-05 | 9.892/9.892 |
| `npm test`, Uhr eingefroren auf 2035-12-31 | 9.892/9.892 |
| `npm run test:browser` | 27/27 in drei von vier Laeufen; ein Lauf mit Timeout, siehe H-1 |
| `npm run docs:evidence` | gruen fuer 2026-07-29; 69 MKT, 55 FOR, 17 MAP, 10 Matrixtermine |
| `git diff --check` | gruen |
| Scope | ausschliesslich `tests/` und `docs/internal/`; keine Datei unter `app/`, `engine/`, `workers/`, `types/`, `scripts/`, `dist/` oder `src-tauri/` |
| Mutationsproben gegen die neue Plankopplung | dreizehn Mutationen, zehn erkannt, drei unbemerkt (siehe H-4) |

Die Uhr wurde ueber einen `--import`-Loader ersetzt, der `Date` austauscht; die
Umgebungsvariable vererbt sich an die isolierten Kindprozesse des Runners. Der
Arbeitsbaum wurde dafuer nicht veraendert.

### Prueferdimension 1 - Korrektheit

**G-03 ist geschlossen und an der Ursache behoben.** Die Nachbesserung ersetzt
die feste Jahreszahl nicht durch eine spaetere feste Jahreszahl, sondern leitet
Zieljahr, Stichtag, Dateiname, CSV-Zeilen und alle Erwartungen aus dem
abgeschlossenen Kalenderjahr des jeweiligen Laufzeitkontexts ab. Entscheidend
und richtig gewaehlt ist die Herkunft der Referenz: der Node-Test rechnet mit
`new Date().getFullYear() - 1` in demselben Prozess, in dem auch
`resolveCurrentMarketCsvTargetYear` seine Referenz zieht; der Browsertest liest
sie ueber `page.evaluate` aus dem Seitenkontext, in dem der Produktcode den
Import validiert. Ich habe geprueft, dass beide Seiten dieselbe Regel
verwenden: `deriveCompletedCalendarYear`
(`app/balance/balance-annual-period.js:128`) ist exakt
`referenceDate.getFullYear() - 1` und arbeitet damit ebenfalls in Ortszeit -
es gibt keine Zeitzonendivergenz zwischen Test und Produkt.

Gemessen: die Gesamtsuite bleibt bei 2027-01-01, 2027-06-15, 2030-05-05 und
2035-12-31 durchgehend bei 9.892/9.892. Die Assertionszahl ist an allen vier
Terminen konstant - es verschwinden also auch keine Assertions still, wie es
vor der Nachbesserung beim Abbruch der Datei geschah.

Der Test bleibt aussagekraeftig. Die Ableitung im Test ist eine Zweitfassung
derselben Regel, keine Uebernahme des Produktergebnisses: der Test setzt das
Zieljahr als **Eingabe** und prueft anschliessend, dass Periode, Stichtag und
Quelle unveraendert bis in den persistierten State gelangen. Wuerde jemand
`deriveCompletedCalendarYear` fachlich aendern, liefe die Eingabe des Tests
gegen die neue Produktregel und der Gate wuerde rot. Das ist der gewuenschte
Zustand.

**G-01 ist geschlossen.** Das Inventar fuehrt jetzt alle 65 Ausgangsbefunde in
Planreihenfolge. Nachgemessen stimmen die Mengen exakt: 65 Findings im Inventar
deckungsgleich mit den 65 Registerzeilen des Plans, und die Teilmenge mit
`evidenceSlices` einschliesslich 16 umfasst genau die 38 Befunde, die ich im
Gesamtreview ausgezaehlt habe. Der Contract liest beide Mengen direkt aus dem
Hauptplan und vergleicht sie zusaetzlich gegen zwei fest verdrahtete
Erwartungslisten - eine Dreifachbindung, die weder das Inventar noch den Plan
allein fortschreiben laesst.

**G-02 ist geschlossen.** I-01 bis I-08 stehen mit exaktem Plantitel im
Inventar; der Contract liest die acht Ueberschriften aus dem Plan, prueft
Reihenfolge und Titel und loest jede Orakelreferenz gegen das O-01-bis-O-22-
Inventar auf.

### Prueferdimension 2 - Vertragstreue

Die entscheidende Frage bei einer Traceability-Nachbesserung ist, ob die
Verknuepfungen fachlich tragen oder nur formal existieren. Ich habe fuenf
Zuordnungen gegen den Wortlaut des Findings-Registers geprueft:

| Befund | Registertext (gekuerzt) | Zuordnung | Urteil |
| --- | --- | --- | --- |
| BAL-06 | Reader ersetzt 0 Cashpuffer-Monate durch 2 | O-08 Nullgrenzen | trifft genau |
| DAT-01 | Faktor-1.000-Fehler bei Fractional Lots | O-05 Fractional Lot | trifft genau |
| SIM-02 | negative Cashrenditen im Ansparpfad und Pflegebucket auf 0 geklemmt | O-10 Negativzins mit Cash- und Pflegebucket | trifft genau |
| IMP-02 | alte Markt-CSV ohne Bezug zum Planjahr; Datum/Quelle nach Reload verloren | O-17 Stale CSV, Stichtag persistent | trifft genau |
| ENG-06 | Monatsquantisierung kann die Floor-Entnahme unterschreiten | O-19 Engine-Grenzen einschliesslich Floor | trifft |

Die Zuordnungen sind nicht dekorativ. Auch die Verteilung spricht dagegen:
alle 22 Orakel werden verwendet, die Haeufigkeiten liegen zwischen 2 und 6, und
20 Befunde tragen einen direkten Witness statt einer Orakelreferenz - es gibt
keinen Sammelverweis, hinter dem sich unbelegte Befunde verstecken. Die einzige
Ausnahme ist QA-01, siehe H-3.

Die 29 direkten Witness-Marker habe ich einzeln daraufhin geprueft, ob sie in
einer Kommentarzeile stehen. Keiner tut das; alle liegen in ausgefuehrten
Assertionszeilen.

Was der Contract **nicht** prueft, ist die fachliche Angemessenheit der
Verknuepfung. Er prueft Existenz, Aufloesbarkeit, Markerpraesenz und das
tatsaechliche Gate. Ein falsch gewaehltes, aber existierendes Orakel wuerde er
akzeptieren. Das ist die Grenze dieser Bauform und als solche zu benennen -
siehe H-3.

### Prueferdimension 3 - Fehlerbehandlung

Ich habe die neue Plankopplung mit dreizehn Mutationen auf Fail-closed
geprueft. Zehn werden erkannt, drei nicht - Details in H-4. Die drei
unerkannten Faelle sind Umbenennungen von Endmarken; sie sind heute folgenlos,
weil hinter den betroffenen Abschnitten keine passenden Zeilen stehen.

Fehlt dem Inventar das Feld `findings` oder `invariants` vollstaendig, laeuft
der Contract in einen `TypeError` statt in eine benannte Assertion. Der Runner
zaehlt das als fehlgeschlagene Datei, der Gate bleibt also rot - die Meldung
ist aber schlechter als noetig.

### Prueferdimension 4 - Seiteneffekte

Der Diff umfasst sieben Dateien, alle unter `tests/` oder `docs/internal/`.
Kein Produktivmodul, keine Engine, kein Worker, kein generiertes Artefakt.
`git diff --check` ist gruen. Die zugesagte Nichtberuehrung meines
Reviewdokuments ist eingehalten; Codex hat dort ausschliesslich das
Gemini-Feedback angefuegt, meinen Reviewtext nicht veraendert.

Ein nicht deklarierter Nebeneffekt ist positiv: die Zahl der im Inventar
gefuehrten Witness-Dateien steigt von 21 auf 29. Neu enthalten sind unter
anderem `persistence.test.mjs`, `balance-storage-contract.test.mjs`,
`profile-state.test.mjs`, `profilverbund-balance.test.mjs`,
`architecture-evidence.test.mjs`, `auto-optimizer.test.mjs`,
`core-negative-contracts.test.mjs` und `coverage-report.test.mjs`. Damit sind
die Slices 14 und 15, die im Inventar zuvor gar nicht vorkamen, jetzt mit
konkreten Witnesses vertreten. G-08 ist dadurch weitgehend erledigt, obwohl
Codex es unveraendert unter den offenen Restrisiken fuehrt. Vollstaendig ist es
nicht: `snapshot-archive.test.mjs` fehlt weiterhin.

### Prueferdimension 5 - Was koennte brechen

Der Arbeitsplan ist mit dieser Nachbesserung von einem Dokument zu einem
Testfixture geworden. Das ist die beabsichtigte Kopplung und der Grund, warum
G-01 nicht wieder auseinanderlaufen kann - es ist zugleich die Stelle, an der
die Suite kuenftig unerwartet rot wird, wenn jemand den Plan umformatiert.
Siehe H-4.

Zweitens haengen neun Befund- und Invariantennachweise am Browsergate, und
dieser Gate ist gemessen nicht deterministisch. Siehe H-1.

### Findings

#### H-1 - Der Browsergate ist nicht deterministisch; ein von vier Laeufen ist ausgefallen

**Messung.** Vier vollstaendige Laeufe von `npm run test:browser` am selben
Arbeitsbaum: drei mal 27/27 mit Exitcode 0, ein Lauf mit Exitcode 1 nach vier
bestandenen Szenarien. Fehlerstelle:

```text
Running browser smoke: Balance shared tranche ids
Browser smoke failed:
page.waitForFunction: Timeout 30000ms exceeded.
    at runBalanceSharedTrancheIds (tests/browser-smoke.test.mjs:490:16)
```

Die betroffene Wartebedingung ist
`document.querySelectorAll('#profilverbund-profile-list input:checked').length === 2`
- eine asynchrone Initialisierung des Profilverbunds, nicht der geaenderte
CSV-Roundtrip. Das Szenario stammt aus Slice 04/13 und ist von dieser
Nachbesserung nicht beruehrt; der Ausfall ist keine Regression.

**Warum es hier trotzdem gehoert.** Mit G-01 und G-02 haengen jetzt neun
Befunde und mehrere Invarianten an einem Nachweis, der ausdruecklich mit
"Node + Browser" ausgewiesen ist. Ein Gate, der ohne Codeaenderung in einem von
vier Laeufen ausfaellt, traegt diesen Anspruch nur eingeschraenkt. Praktisch
bedeutet ein Flake mit dieser Rate, dass ein roter Browserlauf zuerst als
"nochmal laufen lassen" behandelt wird - genau die Gewoehnung, die ich im
Pre-Mortem des Gesamtreviews fuer den Doku-Gate beschrieben habe.

#### H-2 - Zwei der drei Assertionen in `assertTraceabilityOwner` koennen an ihren Aufrufstellen nicht fehlschlagen

**Messung.** Die Funktion prueft

```js
assert(Array.isArray(entry.oracleIds), `${owner} must declare oracleIds, even when empty`);
assert(Array.isArray(entry.witnesses), `${owner} must declare witnesses, even when empty`);
```

wird aber ausschliesslich mit bereits normalisierten Objekten aufgerufen:

```js
assertTraceabilityOwner({
    oracleIds: finding.oracleIds || [],
    witnesses: finding.witnesses || []
}, finding.id);
```

`Array.isArray(x || [])` ist fuer jeden fehlenden Wert wahr. Die Regel
"must declare ..., even when empty" wird damit nicht durchgesetzt. Im Bestand
fehlt das Feld `oracleIds` bei 20 der 65 Findings, das Feld `witnesses` bei 39
Findings und bei sieben der acht Invarianten. Die Assertionen greifen nur noch
gegen einen falschen **Typ** - etwa `oracleIds: "O-01"` als String.

Wirksam ist allein die dritte Bedingung, die Summe aus Orakel- und
Witnessanzahl. Die beiden anderen sind Zaehlwerk. Das ist dieselbe Klasse wie
S16-5 aus meinem Slice-16-Review: eine Assertion, die strenger klingt, als sie
misst.

#### H-3 - Der Contract erzwingt die Existenz der Verknuepfung, nicht ihre fachliche Richtigkeit; QA-01 ist der schwaechste Punkt

Fuenf stichprobenhaft gepruefte Zuordnungen treffen fachlich zu (siehe
Prueferdimension 2). Das ist eine Aussage ueber den heutigen Inhalt, nicht
ueber den Contract: ein Befund, der auf ein beliebiges existierendes Orakel
zeigt, besteht die Pruefung ebenso.

Der schwaechste Eintrag ist QA-01 - "Tests pruefen haeufig Determinismus oder
Main-/Worker-Paritaet statt fachlicher Richtigkeit". Er ist im Inventar mit
allen 22 Orakeln zugleich hinterlegt. Ein Sammelverweis auf den gesamten
Orakelbestand ist der einzige Eintrag, der keine Aussage mehr traegt: er ist
per Konstruktion nicht verletzbar. Die Planzeile selbst sagt "unabhaengige
Orakel O-01 bis O-22", die Umsetzung ist insofern planstreu - der Befund
bleibt damit aber nachweislich unbelegt, waehrend er als abgebildet erscheint.

#### H-4 - Der Arbeitsplan ist jetzt ein Testfixture; drei von dreizehn Mutationen bleiben unbemerkt

**Messung.** Ich habe die Parserlogik des Contracts exakt nachgebildet und
gegen mutierte Fassungen des Plantextes laufen lassen. Der Arbeitsbaum wurde
dabei nicht veraendert.

| Mutation | erkannt |
| --- | --- |
| `## Findings-Register` umbenannt | ja, 0 statt 65 Registerzeilen |
| `## Vollstaendige Traceability` umbenannt | ja, 0 statt 65 Tabellenzeilen |
| `## Verbindliche Zielvertraege und Invarianten` umbenannt | ja, 0 statt 8 Invarianten |
| eine Registerzeile entfernt | ja, 64 statt 65 |
| Nachweisspalte von SWP-09 von 16 auf 9 geaendert | ja, 37 statt 38 |
| Nachweis 16 zusaetzlich bei SWP-05 gesetzt | ja, 39 statt 38 |
| Invariantentitel I-04 gekuerzt | ja, Titelabgleich |
| vierte Spalte in der Traceability-Tabelle ergaenzt | ja, 64 statt 65 |
| `## Vollstaendige Traceability` zusaetzlich frueher im Dokument | ja, 0 Tabellenzeilen |
| `## Findings-Register` zusaetzlich spaeter im Dokument | **nein**, folgenlos |
| Endmarke `## Reproduzierte Golden-Orakel` umbenannt | ja, 130 statt 65 |
| Endmarke `## Test- und Nachweisstrategie` umbenannt | **nein** |
| Endmarke `## Architektur-Zielbild` umbenannt | **nein** |

Die drei unerkannten Faelle sind heute harmlos: hinter den betroffenen
Abschnitten stehen keine Zeilen, die auf die Regex passen. Das ist ein
Zustandsbefund, keine Eigenschaft - die Chronologie waechst append-only weiter,
und eine kuenftige Zeile der Form `| PER-05 | ... | ... |` in einem
Entscheidungs- oder Antworttabellenblock hinter `## Vollstaendige Traceability`
wuerde in die Auswertung geraten.

Zwei weitere Beobachtungen zur Kopplung:

- Die Auswahlregel fuer die 38er-Teilmenge ist `/(^|[^\d])16([^\d]|$)/` auf der
  Nachweisspalte. Gemessen enthaelt heute keine Nachweiszelle eine Zeichenfolge
  wie `O-16` oder `D-16`; kaeme eine hinzu, wuerde sie als Slice-16-Nachweis
  gezaehlt. Das faellt auf, weil die Menge dann 39 statt 38 betruege - es ist
  ein Fehlalarm, kein stiller Durchlaeufer.
- Eine gewollte Umbenennung im Plan macht `npm test` rot mit einer Meldung, die
  auf ein Testfixture zeigt und nicht auf die Ueberschrift. Wer die Kopplung
  nicht kennt, sucht an der falschen Stelle.

#### H-5 - `SuiteDataIntegrityTraceabilityV1` ist unter unveraendertem Versionsnamen ein groesserer Vertrag geworden

Das Inventar traegt weiterhin `schemaVersion: 'SuiteDataIntegrityTraceabilityV1'`,
und der Contract assertiert diesen Wert unveraendert. Zugleich sind
`findings` und `invariants` faktisch Pflichtfelder geworden: ein V1-Dokument
ohne sie laesst den Contract in einen `TypeError` laufen. Codex begruendet die
Additivitaet damit, dass bestehende V1-**Leser** die neuen Felder ignorieren
koennen - das stimmt fuer Leser, nicht fuer den Vertrag. Da Fixture und Test im
selben Repository ausgeliefert werden, ist das Risiko klein; die
Fehlerklasse ist dieselbe wie U12-2 aus Slice 12, wo die Bedeutung von
`schemaVersion: 2` innerhalb eines Slice zweimal wechselte.

#### H-6 - Der gewachsene Assertionsstand misst Buchfuehrung, nicht Anwendungsverhalten

**Messung.** `npm test` steigt von 9.184 auf 9.892 Assertions. Der Zuwachs von
708 entfaellt vollstaendig auf `suite-data-integration-contract.test.mjs`, das
von 358 auf 1.066 Assertions waechst. Die beiden korrigierten CSV-Roundtrips
aendern ihre Assertionszahl nicht: `balance-ui-orchestration.test.mjs` bleibt
bei 238.

Das ist kein Fehler - Traceability gehoert abgesichert. Es ist ein Hinweis fuer
die Lesart der Kennzahl: rund sieben Prozent des Gesamtstands pruefen jetzt die
Uebereinstimmung eines Dokuments mit einem Fixture. Bemerkenswert ist der
Zusammenhang mit H-3: ausgerechnet QA-01, der Befund "Tests pruefen haeufig
nicht die fachliche Richtigkeit", gilt durch dieses Inventar als abgebildet.

#### H-7 - Theoretisches Rennen am Jahreswechsel, nicht reproduzierbar

Der Node-Test bestimmt sein Zieljahr einmal; der Produktcode ruft `new Date()`
Millisekunden spaeter erneut auf. Faellt der Jahreswechsel genau zwischen beide
Aufrufe, laufen Eingabe und Erwartung auseinander. Ich habe das mit einer
verschobenen, aber weiterlaufenden Uhr bei einem, zwei, drei, fuenf und acht
Sekunden vor Mitternacht des 2027-01-01 zu reproduzieren versucht - alle fuenf
Laeufe blieben bei 238/238. Das Fenster liegt in der Groessenordnung von
Millisekunden pro Jahr. Ich fuehre den Punkt der Vollstaendigkeit halber, nicht
als Handlungsbedarf.

### Geprueft und verworfen

1. **Tautologie in der Datumsableitung.** Vermutung: der Test uebernimmt die
   Erwartung aus dem Produktcode und kann eine Regelaenderung nicht mehr
   erkennen. Widerlegt: der Test setzt das Jahr als Eingabe und prueft die
   Durchreichung; eine Aenderung von `deriveCompletedCalendarYear` liefe gegen
   diese Eingabe.
2. **Zeitzonendivergenz zwischen Test und Produkt.** Widerlegt:
   `deriveCompletedCalendarYear` ist `getFullYear() - 1` in Ortszeit, der Test
   rechnet identisch, der Browsertest liest aus dem Seitenkontext.
3. **Stille Assertionsverluste in der Zukunft.** Widerlegt: die Gesamtzahl
   bleibt an vier Zukunftsterminen konstant bei 9.892.
4. **Witness-Marker in Kommentaren.** Widerlegt: alle 29 direkten Marker liegen
   in ausgefuehrten Assertionszeilen.
5. **Sammelverweise als Fuellmaterial.** Weitgehend widerlegt: alle 22 Orakel
   sind belegt, Haeufigkeiten zwischen 2 und 6, 20 Befunde mit direktem
   Witness. Einzige Ausnahme QA-01, als H-3 gefuehrt.
6. **Fehlende Witness-Dateien.** Widerlegt: alle 29 im Inventar benannten
   Dateien existieren, und der Contract leitet ihr Gate aus
   `getTestExecutionPolicy` ab.
7. **Nicht deklarierte Aenderungen ausserhalb des Testbereichs.** Widerlegt:
   der Diff umfasst ausschliesslich `tests/` und `docs/internal/`.

### Findings-Lifecycle

- Geschlossen in diesem Durchgang: G-01, G-02, G-03 - jeweils unabhaengig
  nachgemessen.
- Weitgehend geschlossen als nicht deklarierter Nebeneffekt: G-08 (Witnesses
  21 -> 29, Slices 14 und 15 jetzt vertreten; `snapshot-archive.test.mjs` fehlt
  weiterhin).
- Neu eingefuehrte Blocker: keine.
- Neu eingefuehrte Restrisiken: H-1 bis H-7.
- Unveraendert offen: G-04, G-05, G-06, G-07, G-09, G-10 sowie die im
  Gesamtreview gezaehlten mindestens 92 Restrisiken der Einzelslices.

### Pre-Mortem

*Angenommen, diese Nachbesserung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Jemand strukturiert den Arbeitsplan um - eine Ueberschrift praeziser
formuliert, eine Spalte in der Traceability-Tabelle ergaenzt, den
Entscheidungsblock verschoben - und `npm test` wird rot. Die Meldung lautet
sinngemaess "Finding traceability must match every plan finding exactly once
and in plan order" und zeigt auf ein Testfixture. Die naheliegende Reaktion ist,
das Fixture an den neuen Plan anzupassen, statt zu bemerken, dass eine
Ueberschrift die Klammer des Nachweises ist. Damit bleibt der Gate gruen und die
Kopplung ist gerissen.

Zweitwahrscheinlich: der Browsergate faellt ohne Codeaenderung aus (H-1), wird
als bekannter Flake abgetan und irgendwann nicht mehr als blockierend
behandelt. Neun Befunde und mehrere Invarianten verlieren damit still ihre
Browserhaelfte.

Drittens: ein Befund wird kuenftig mit einem existierenden, aber unpassenden
Orakel verknuepft. Der Contract akzeptiert das (H-3), die Zahlen bleiben
stimmig, und die Rueckverfolgbarkeit sieht vollstaendig aus, waehrend sie es
nicht mehr ist.

### Re-Review-Ergebnis (Claude)

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** H-1 (Browsergate in einem von vier Laeufen ausgefallen,
  `browser-smoke.test.mjs:490`, vorbestehendes Szenario), H-2 (zwei von drei
  Assertionen in `assertTraceabilityOwner` koennen an ihren Aufrufstellen nicht
  fehlschlagen; 20 Findings ohne `oracleIds`, 39 ohne `witnesses`, sieben von
  acht Invarianten ohne `witnesses`), H-3 (der Contract prueft Existenz und
  Aufloesbarkeit, nicht fachliche Angemessenheit; QA-01 verweist auf alle 22
  Orakel zugleich und ist damit nicht verletzbar), H-4 (der Arbeitsplan ist ein
  Testfixture geworden; drei von dreizehn Mutationen bleiben unbemerkt, heute
  folgenlos), H-5 (`SuiteDataIntegrityTraceabilityV1` ist unter unveraendertem
  Versionsnamen ein groesserer Vertrag), H-6 (der Zuwachs von 708 Assertionen
  entfaellt vollstaendig auf Inventarbuchfuehrung), H-7 (theoretisches Rennen am
  Jahreswechsel, in fuenf Versuchen nicht reproduzierbar) sowie unveraendert
  G-04, G-05, G-06, G-07, G-09, G-10 und die Restrisiken der Einzelslices.
- **Pre-Mortem:** siehe oben - eine Umformatierung des Arbeitsplans macht die
  Suite rot, die Meldung zeigt auf ein Fixture, und die naheliegende Korrektur
  loest die Kopplung wieder auf.

Die drei Blocker sind an der Ursache behoben und nicht umgangen. G-03 wurde
nicht durch eine spaetere feste Jahreszahl entschaerft, sondern durch eine
Ableitung aus dem Laufzeitkontext, und ich habe das an vier Zukunftsterminen bis
2035 nachgemessen. G-01 und G-02 wurden nicht als Dokumentationstabelle
abgelegt, sondern an den Hauptplan gekoppelt, sodass Plan und Inventar nicht
getrennt fortgeschrieben werden koennen; zehn von dreizehn Mutationsproben
werden erkannt. Der Scope ist eingehalten - keine Produktivdatei, keine Engine,
kein generiertes Artefakt.

Die Freigabe bezieht sich auf die Schliessung von G-01 bis G-03 und damit
darauf, dass die Nachweiskette des Vorhabens vom Ausgangsbefund bis zum
laufenden Gate jetzt geschlossen und maschinell gebunden ist. Sie umfasst nicht
die Restrisiken H-1 bis H-7 und nicht die weiterhin offenen G-04 bis G-07, G-09
und G-10; deren Behandlung ist eine Nutzer- beziehungsweise Planungsentscheidung
ausserhalb dieser Nachbesserung.

## Re-Review-Feedback von Gemini nach G-01-bis-G-03-Nachbesserung

**Review-Datum:** 2026-07-29  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Unabhängiges Re-Review des Gesamtreviews nach Behebung der 3 Blocker (G-01, G-02, G-03) auf `codex/suite-datenintegritaet-hardening`.

### Evaluierung der Prüfdimensionen nach Nachbesserung

1. **Testgates & Kalenderinvarianz (G-03):**
   - `npm test`: **9.892 / 9.892 Assertions grün** (reproduziert, 0 Fehler, 0 offene Handles).
   - Datumsunabhängigkeit verifiziert: Bei eingefrorenen Systemzeiten (2027-01-01, 2027-06-15, 2030-05-05, 2035-12-31) bleiben alle Assertions (9.892) ohne Fehlschläge vollumfänglich grün.
   - `npm run test:browser`: **27 / 27 Smokes grün**.
   - `npm run docs:evidence`: **grün**.

2. **Verifizierung von G-01 & G-02:**
   - **G-01 (Abschlussnachweis für 38 Diagnosebefunde):** Vollständig verknüpft. Das Traceability-Inventar `oracle-traceability-v1.json` führt nun alle 65 Ausgangsbefunde und ordnet jedem seine Orakel/Witnesses zu. `suite-data-integration-contract.test.mjs` sichert diese Zuordnungen automatisiert ab.
   - **G-02 (Master-Invarianzverträge I-01 bis I-08):** Invarianten I-01 bis I-08 wurden lückenlos mit den Orakeln verknüpft und durch den Integrationscontract getestet.

3. **Seiteneffekte & Restrisiko-Prüfung:**
   - Gemini bestätigt die von Claude identifizierten Restrisiken H-1 bis H-7 als unkritische Architektur- und Formatierungshinweise, die die Freigabe des Gesamthandling-Projekts nicht blockieren.

### Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: freigegeben (Bezogen auf den Abschluss der Datenintegritäts-Härtung Slices 1-16)
- Blocker: keine (G-01, G-02 und G-03 vollständig behoben)
- Restrisiken: H-1 bis H-7 (wie von Claude dokumentiert).
- Pre-Mortem: Eine Umformatierung von Überschriften im Arbeitsplan lässt suite-data-integration-contract.test.mjs rot werden, da Plan und Fixture strikt gekoppelt sind.
```

