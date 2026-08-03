# Slice 16 - Datenpruefung des Slice-15-Ergebnisses

**Datum:** 2026-08-03  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**GitHub-Status:** Branch lokal; kein Push durch Codex  
**Status:** von Claude in Runde 2 ohne Blocker freigegeben; CR16-6, CR16-7
und CR16-9 technisch nachgebessert, CR16-8 bewusst auf eine dokumentarische
Ownergrenze reduziert; erneutes externes Re-Review und Nutzerfreigabe
ausstehend

## Eingangsgrenze aus Slice 15

Das vollstaendige Ergebnisdokument
[`SLICE_BACKTEST_DATENPRUEFUNG_15_DATENPRUEFUNG.md`](SLICE_BACKTEST_DATENPRUEFUNG_15_DATENPRUEFUNG.md)
ist die verbindliche Eingangsgroesse dieses Slice.

- Eingangscommit: `efd51aded173410d22e62c5faa59fe72937bd25c`
- Elterncommit: `619c4d4c43bc469af4320759c1f52212e4c39390`
- SHA-256 des Eingangs-Ergebnisdokuments:
  `50226f3614271d943f2cc3f7489c6a82c612fac508b5ec8edfa0747f91e9dca2`
- SHA-256 der Slice-15-Validierungsfixture:
  `3fc306e4375e70591e5d05a2b8575a786ef2b9726f6626263c8e1135fec18e3e`
- SHA-256 des Slice-15-Validierungstests:
  `59a9c25c20ee81fb19ea5c93b01f0b4f64f9270a59e5ce71fa63a56614dbe64f`
- Der Slice-15-Post-Commit-Pfad wurde am Start von Slice 16 fokussiert mit
  155/155 Assertions ausgefuehrt.
- Die externe Runde-3-Freigabe von Slice 15 galt unter der Auflage, dass
  `.gitattributes` und die sieben zeilenendensensitiven Originalquellen
  atomar committet und danach erneut geprueft werden. Der Eingangscommit
  enthaelt den vollstaendigen Acht-Pfade-Vertrag.

## Preflight vor Coding

- `git branch --show-current`: `codex/suite-datenintegritaet-hardening`
- `git status --short`: leer; der Arbeitsbaum war sauber
- Passung zum Arbeitsplan: gegeben

## Ziel

Slice 16 prueft die vollstaendige, committete Slice-15-Ergebnisgrenze
nachgelagert und read-only. Der Pruefpfad bindet Ergebnisdokument, Fixture und
Test an den Eingangscommit, weist die atomare Aufnahme des Acht-Pfade-
Binaervertrags nach und rekonstruiert Dataset-, Manifest- und
Result-Fingerprint aus der lebenden kanonischen Basis.

## Akzeptanzkriterien

1. Das vollstaendige Slice-15-Ergebnisdokument sowie Slice-15-Fixture und
   -Test stimmen sowohl im Eingangscommit als auch im lebenden Arbeitsbaum
   bytegenau mit den gepinnten SHA-256-Werten ueberein.
2. Eingangscommit und Elterncommit sind erreichbar; der Eingangscommit ist
   Vorfahr des aktuellen Branches. Die CI stellt fuer diese commitgebundene
   Evidenz ausdruecklich die vollstaendige Git-Historie bereit.
3. `.gitattributes` und alle aus dem Repositorybestand abgeleiteten
   zeilenendensensitiven Originalquellen sind im selben Eingangscommit
   enthalten.
4. Die sieben Originalquellen besitzen im Eingangscommit und im lebenden
   Arbeitsbaum die in Slice 15 gepinnten exakten SHA-256-Werte.
5. Die produktiven Daten rekonstruieren Dataset- und Manifesthash. Die
  archivierte kanonische Basis belegt nur die Selbstkonsistenz des gespeicherten
  Result-Fingerprints; der lebende Engine-Nachweis laeuft unabhaengig ueber
  den kanonischen Rowhash im Charakterisierungsgate und wird von Slice 16
  weder erneut ausgefuehrt noch per Quelltextsuche gebunden.
6. Zeitraum, Jahreszahl, Summen und `FlowDelta` bleiben gegen die typisierte
   Slice-15-Eingangsfixture unveraendert.
7. Die vorhandenen sieben Rekonstruktionsgates bleiben die alleinigen Owner
   der Builderausfuehrung; Slice 16 erzeugt keine dekorativen Outputzeugen und
   keine Doppelausfuehrung.
8. Die offenen Aussagegrenzen aus Slice 15 bleiben sichtbar: keine externe
   wissenschaftliche Validierung und keine nachgewiesene Finanzneutralitaet
   gegen den Slice-12-Commit.
9. Produktivcode, Engine, Worker, historische Datenwerte und generierte
   Artefakte bleiben unveraendert.
10. Fokussierte Tests, `npm test`, Datenketten-Verifikation,
    `npm run test:browser`, `npm run docs:evidence` und `git diff --check`
    bestehen.
11. Codex dokumentiert technische Nachweise, erteilt aber keine eigene
    Freigabe.

## Scope

- neue Slice-16-Evidenzfixture;
- neuer maschinenlesbarer Datenpruefungstest;
- dieses Slice-Dokument, Hauptplan und Testinventar.

## Nicht im Scope

- Produktivcode, Engine-/Steuer-/Entnahmesemantik;
- Aenderung oder Rekalibrierung historischer Daten;
- fachliche Anlageempfehlung;
- Behauptung einer externen oder wissenschaftlichen Datenvalidierung;
- Commit oder Push durch Codex.

## Diff-Risiko vor Coding

```text
Geplante Dateien:
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_16_DATENPRUEFUNG.md (neu)
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- tests/backtest-data-validation-slice-16.test.mjs (neu)
- tests/fixtures/backtest-data-validation-slice-16-v1.json (neu)
- tests/README.md
- .github/workflows/ci-tests.yml

Voraussichtliche Aenderungstiefe:
- mittel; reine Evidenz-, Test- und Dokumentationsschicht

Gefaehrdete bestehende Tests:
- Slice-15-/Slice-14-Datenvalidierung, Testinventar, CI-Checkoutvertrag und
  Git-/Hash-Grenzen

Nicht anfassen:
- app/, engine/, workers/, historische Datenwerte, engine.js, dist/,
  src-tauri/, RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md tests/README.md
- neue Slice-16-Dateien nur nach ausdruecklicher Loeschfreigabe entfernen
```

## Geplante Tests

- fokussierter Slice-16-Datenpruefungstest;
- bestehende Slice-15- und Slice-14-Datenvalidierungstests;
- alle vorhandenen `verify:*data`-Skripte;
- `npm test`;
- `npm run test:browser`;
- `npm run docs:evidence`;
- `git diff --check`.

## Durchgefuehrte Aenderungen

- `BacktestDataValidationSlice16V1` bindet das vollstaendige
  Slice-15-Ergebnisdokument, die Slice-15-Validierungsfixture und den
  Slice-15-Test bytegenau an Commit `efd51ad`.
- Der Test prueft Erreichbarkeit, Vorfahrenbeziehung und den exakten
  Elterncommit der Eingangsgrenze ueber gefangene Git-Prozessgrenzen.
- Der CI-Checkout verwendet `fetch-depth: 0`; Slice 16 pinnt damit die fuer
  Slice 14 bis 16 notwendige vollstaendige Vorgaengerhistorie
  maschinenlesbar. Die Pruefung isoliert den benannten Checkout-Schritt und
  akzeptiert den Wert nur in dessen eigenem `with`-Block.
- Ergebnisdokument, Fixture und Test aus Slice 15 werden nicht nur aus dem
  Commit gelesen, sondern auch im lebenden Arbeitsbaum gegen dieselben Hashes
  geprueft.
- Die externe Runde-3-Entscheidung und die weitergefuehrten Restrisiken
  CR15-13 bis CR15-15 sowie CR13-11 bleiben im Eingangsresultat sichtbar.
- Der Acht-Pfade-Vertrag wird aus dem tatsaechlichen Diff des Slice-15-
  Commits geprueft. Seine Vollstaendigkeit wird zusaetzlich aus allen
  getrackten Dateien unter `data/historical/*/originals/*` und
  `data/static/*/originals/*` abgeleitet: Textartige Originale mit
  Zeilenenden und ohne NUL-Bytes muessen exakt der gepinnten Binaermenge
  entsprechen.
- Fuer jede Originalquelle werden Binaerattribut, Commit-Blobhash und
  Live-Dateihash gegen den in Slice 15 gepinnten SHA-256-Wert geprueft.
- Dataset- und Manifesthash werden aus den produktiven Live-Daten neu
  berechnet. Der archivierte Result-Fingerprint und die gerundeten Summen
  werden nur als Selbstkonsistenz der am Eingangscommit gebundenen Basis
  bezeichnet. Das Charakterisierungsgate bleibt unabhaengiger Owner des
  lebenden Engine-Laufs und des kanonischen Rowhashes; Slice 16 behauptet
  dafuer keine eigene Ausfuehrungs- oder Quelltextbindung mehr.
- Hauptplan und Testinventar wurden auf Slice 16 fortgeschrieben; die dort
  veraltete Pre-Commit-Beschreibung von Slice 15 wurde auf den tatsaechlichen
  Post-Commit-Zustand korrigiert.

## Ausgefuehrte Tests

- Preflight: `node tests/run-single.mjs tests/backtest-data-validation-slice-15.test.mjs`:
  155/155 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/backtest-data-validation-slice-16.test.mjs`:
  nach der ersten Nachbesserung 135/135, nach der zweiten Nachbesserung
  137/137 Assertions, jeweils 0 Fehler.
- `node tests/run-single.mjs tests/backtest-data-validation-slice-14.test.mjs`:
  144/144 Assertions, 0 Fehler.
- `npm test`: nach der zweiten Nachbesserung im CI-identischen Coverage-Lauf
  18.629/18.629 Assertions,
  0 fehlgeschlagene Dateien,
  1 separates Gate ohne Fehler und 0 offene Handles.
- `npm run test:coverage`: 18.629/18.629 Assertions, 78,97 % approximative
  V8-Zeilenabdeckung (40.302/51.035), beide Pflicht-Dateigates bestanden.
- Alle sieben `verify:*data`-Skripte: gruen; Aktien-, VPI-, Geldmarkt-, Gold-,
  CAPE-, Lohn- und Demografiehashes stimmen mit den bestehenden Ketten
  ueberein.
- `npm run test:browser`: gruen.
- `npm run docs:evidence`: gruen; 69 MKT-, 55 FOR- und 17 MAP-Records,
  11/7 Reviewscopes und 10 Modellmatrixtermine.
- `git diff --check`: gruen vor und nach der Abschlussdokumentation.

## Abweichungen vom Plan

Keine.

## Ergebnisse

- Das vollstaendige Slice-15-Ergebnisdokument ist bytegenau an den
  Eingangscommit und an den lebenden Arbeitsbaum gebunden.
- Der Slice-15-Commit besitzt exakt den deklarierten Elterncommit und ist
  Vorfahr des aktuellen Branches. Die CI laedt die dafuer erforderliche volle
  Historie.
- Der von der externen Freigabe geforderte gemeinsame Commit der
  Binaervertragspfade ist vollzogen und maschinenlesbar belegt. Die Menge wird
  nicht mehr nur aus der Fixture gezaehlt, sondern gegen den vollstaendigen
  Commit- und Live-Bestand textartiger Originalquellen abgeglichen.
- Alle sieben Originalquellen stimmen sowohl im Commit als auch im lebenden
  Arbeitsbaum bytegenau mit den Slice-15-Hashes ueberein.
- Dataset `ruhestandsapp-historical-data-v1`, Revision `2026-08-01.4`,
  Contenthash und Manifesthash werden aus der aktiven Datenbasis
  reproduziert.
- Der Zeitraum 2000 bis 2025 umfasst 26 Zeilen; Endvermoegen
  5.829.580,79 EUR, Gesamtentnahme 805.112,51 EUR, Steuer 114.306,75 EUR und
  maximales absolutes `FlowDelta` 0 EUR bleiben unveraendert. Der gespeicherte
  Result-Fingerprint ist selbstkonsistent mit der committeten kanonischen
  Basis; er ist ausdruecklich kein live neu erzeugter Engine-Fingerprint. Der
  lebende Engine-Lauf wird getrennt durch den Rowhash im
  Charakterisierungsgate belegt.
- Die technische Pruefung aendert weder Produktivcode noch historische Werte
  und ist keine eigene Freigabe durch Codex.

## Offene Risiken

- CR15-13 ist geschlossen: Der gemeinsame Commit ist vollzogen, der
  Pre-Commit-Zweig nicht mehr erreichbar und der Post-Commit-Pfad aktiv.
- CR15-14 ist geschlossen: Commit- und Live-Inventar aller textartigen
  Originalquellen werden abgeleitet und exakt gegen den Binaervertrag
  verglichen.
- CR15-15: Die Bindung an Gate-Owner bleibt eine Quelltextpruefung.
- CR16-8 bleibt als bewusst begrenzte Ownergrenze offen: Der lebende Rowhash
  wird im separat ausgefuehrten Charakterisierungsgate geprueft, aber nicht
  von Slice 16 erneut ausgefuehrt oder per Shared Runner importiert. Ein
  solches Refactoring gehoert in einen eigenen Folgeslice.
- Die Finanzneutralitaet gegen den Slice-12-Commit bleibt
  `not_demonstrated_against_slice_12_commit`.
- Repositoryinterne Rekonstruktion belegt keine externe wissenschaftliche
  Validitaet der Quellen.

## Rueckdokumentation in den Hauptplan

- Hauptplan enthaelt Slice 16 mit Eingangsgrenze, Ziel, Scope,
  Abnahmekriterien und Status.
- Startreihenfolge wurde 1-basiert um Slice 16 erweitert.
- `tests/README.md` beschreibt den Post-Commit-Stand von Slice 15 und den
  neuen Slice-16-Pruefpfad.
- `.github/workflows/ci-tests.yml` stellt die fuer commitgebundene Evidenz
  benoetigte vollstaendige Git-Historie bereit.

## Freigabestatus

- Codex-Selbstpruefung: technisch abgeschlossen; keine Freigabe erteilt.
- Externes Review: ausstehend.
- Nutzerfreigabe: ausstehend.
- Commit/Push: nicht durch Codex.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| S16-START-01 | Nutzer | Slice 16 Datenpruefung beginnen und das Slice-15-Ergebnisdokument als Eingang verwenden | angenommen | Eingangscommit und Eingangsbytes dokumentiert; technisch umgesetzt |
| CR16-1 | Claude-Review (Runde 1) | Die commitgepinnte Evidenzschicht ist in einem flachen Checkout nicht ausfuehrbar und bricht dort sofort ab. Gemessen in einem Wegwerf-Klon, in dem der Slice-16-Commit simuliert und anschliessend mit `git clone --depth 1` geklont wurde -- also genau die Form, die `actions/checkout@v4` in `.github/workflows/ci-tests.yml` ohne `fetch-depth` erzeugt: Slice 16 bricht nach 6 Assertions mit `FAIL: Slice-15 source commit is reachable` ab, Slice 15 nach 5 Assertions mit `FAIL: Slice-14 source commit is reachable`. Ursache ist `git cat-file -e <commit>` beziehungsweise `git show <commit>:<pfad>` auf einen Vorfahren, der im flachen Klon nicht existiert. Solange `efd51ad` die Spitze ist, faellt das nicht auf; mit dem naechsten Commit ist es reproduzierbar. Derselbe Abbruch trifft jeden Checkout, in dem der Eingangscommit nicht erreichbar oder kein Vorfahre ist, etwa `main` vor dem Merge. Die Aussage von Akzeptanzkriterium 10, `npm test` bestehe, gilt damit nur fuer den vollstaendigen lokalen Klon. Slice 16 ist die Pruefschicht ueber genau diese Bindung und haette die Klasse erkennen muessen; sie fuegt drei weitere commitgepinnte Lesezugriffe hinzu | angenommen | erledigt; CI-Checkout auf `fetch-depth: 0`, vom Slice-16-Test gepinnt |
| CR16-2 | Claude-Review (Runde 1) | Akzeptanzkriterium 1 verlangt, dass Ergebnisdokument, Slice-15-Fixture und Slice-15-Test bytegenau mit dem Eingangscommit uebereinstimmen. Der Test prueft ausschliesslich die Commitseite: er liest den Blob per `git show` und vergleicht dessen Hash mit dem aus demselben Blob abgeleiteten Fixturewert. Der lebende Arbeitsbaum wird fuer diese drei Pfade nie gelesen. Gemessen: eine an das lebende Slice-15-Ergebnisdokument angehaengte Zeile "Status freigegeben ohne Auflage" laesst Slice 16 mit 109/109 gruen; kein anderer Test der Suite faengt sie. Fuer die sieben Originalquellen ist der Live-Vergleich vorhanden und wirksam (ein gekipptes Byte wird mit benannter Assertion gefangen) -- ausgerechnet fuer das menschenlesbare Reviewprotokoll fehlt er | angenommen | erledigt; alle drei Live-Pfade werden bytegenau geprueft |
| CR16-3 | Claude-Review (Runde 1) | Der Result-Fingerprint wird nicht aus einem Lauf, sondern aus einer gespeicherten Datei rekonstruiert. `sha256Hex(canonicalizeHistoricalContractValue(fingerprintBasis))` kanonisiert eine committete JSON-Datei und vergleicht sie mit `e0362da9...`; die Aussage ist damit die Selbstkonsistenz einer Datei, nicht die Reproduzierbarkeit eines Ergebnisses. Gemessen: `e0362da9...` kommt in keinem Test vor, der die Engine ausfuehrt; im Charakterisierungstest wird der erwartete Fingerprint vor dem Diff mit dem gemessenen ueberschrieben. Die einzige lebende Enginebindung ist `canonicalRowsHash` `9de469d6...`, und genau diesen Wert uebernimmt Slice 16 nur aus der Slice-15-Fixture, ohne ihn neu zu berechnen. Der Ergebnistext "Der finale Result-Fingerprint wird aus der committeten kanonischen Basis neu berechnet" ist wortgenau richtig und wird leicht staerker gelesen, als er ist | angenommen | erledigt; Evidenzarten getrennt, Fingerprint nur Archiv-Selbstkonsistenz, Live-Rowhash beim Charakterisierungsgate |
| CR16-4 | Claude-Review (Runde 1) | Die Vollstaendigkeit des Binaervertrags bleibt deklariert statt abgeleitet, jetzt in einer zweiten Fixture. `assertEqual(binaryContractPaths.length, 8, ...)` zaehlt die Eintraege der eigenen Fixture, nicht die des Commits. Der tatsaechliche Pfadbestand des Commits liegt in `commitPaths` bereits vor, wird aber nur auf Enthaltensein geprueft, nie auf Ausschluss: eine achte zeilenendensensitive Originalquelle im selben Commit bliebe unbemerkt. Damit ist CR15-14 nicht nur weitergefuehrt, sondern in einer zweiten Ebene dupliziert; die Zahlen sieben und acht stehen nun an drei Stellen fest verdrahtet | angenommen | erledigt; Commit- und Live-Inventar werden vollstaendig abgeleitet und mengengleich verglichen |
| CR16-5 | Claude-Review (Runde 1) | Der Lebenszyklus von CR15-13 wird nicht ausgewiesen. Die offenen Risiken fuehren CR15-14 und CR15-15 weiter, CR15-13 fehlt ohne Begruendung, waehrend der Test in derselben Aenderung `assert(slice15Document.includes('CR15-13'))` verlangt. Sachlich ist das Finding durch den vollzogenen Commit erledigt -- der Pre-Commit-Zweig ist nicht mehr erreichbar --, aber genau das steht nirgends, und ein Leser kann Erledigung nicht von Vergessen unterscheiden. Nebenbefund: der Abschnitt "Eingangsgrenze aus Slice 15" enthaelt in der Wortform fuer Eingangsgroesse zwei Nicht-ASCII-Zeichen und weicht damit von der Transliteration der uebrigen Slice-Dokumente ab | angenommen | erledigt; CR15-13 geschlossen dokumentiert und Transliteration korrigiert |
| CR16-6 | Claude-Review (Runde 2) | Der abgeleitete Bestand der zeilenendensensitiven Originalquellen endet an `data/historical`. Gemessen: eine getrackte CRLF-Textdatei unter `data/historical/*/originals/` wird mit benannter Assertion gefangen (77 Assertions, "Live binary contract exactly covers every line-ending-sensitive original"); dieselbe Datei unter `data/static/german-demography-care-survivor-contract/originals/` laesst den Test mit 135/135 gruen. Genau dort liegt die Quellwurzel des Demografiebuilders, also eines der sieben Rekonstruktionsgates (`SOURCE_DIRECTORY` in `scripts/build-german-demography-care-survivor-contract.mjs`). Aktuell enthaelt der Baum ausschliesslich `.xlsx`-Dateien, ein Defekt besteht daher nicht; die Ableitung deckt aber nur einen der beiden Originalbaeume ab, waehrend Akzeptanzkriterium 3 unbestimmt vom "Repositorybestand" spricht | angenommen | erledigt; Commit- und Live-Inventar umfassen `data/historical` und `data/static` |
| CR16-7 | Claude-Review (Runde 2) | Der CI-Historienvertrag ist schwaecher gepinnt als beschrieben. Die Assertion prueft `/uses:\s*actions\/checkout@v4[\s\S]*?with:\s*[\s\S]*?fetch-depth:\s*0/` gegen den gesamten Dateitext. Gemessen: das vollstaendige Entfernen des Eintrags faerbt das Gate rot (12 Assertions), das Verschieben desselben `fetch-depth: 0` in den `with:`-Block von `actions/setup-node` -- wo es wirkungslos ist und der Checkout wieder flach wird -- laesst es mit 135/135 gruen. Ebenfalls gemessen: der Nachbesserungsstand bricht in einem flachen Klon unveraendert nach sechs Assertions mit "Slice-15 source commit is reachable" ab. Der konkrete Defekt aus CR16-1 ist behoben; die Meldung nennt weiterhin den Commit statt der Checkouttiefe und fuehrt jeden anderen flachen oder abgekoppelten Konsumenten in dieselbe Fehldiagnose | angenommen | erledigt; benannter Checkout-Schritt strukturell isoliert, `with`-Kindwert exakt geprueft und flacher Checkout diagnostiziert |
| CR16-8 | Claude-Review (Runde 2) | Die Trennung von Archivwert und lebendem Enginenachweis ist sachlich richtig, verbreitert aber die Quelltextbindung. Die neue Ownerzuweisung prueft mit `liveResultGate.includes("id: '...'")`, `includes(canonicalRowsHash)` und `includes('integrationDiffs.length')` drei Zeichenketten im Quelltext des Charakterisierungsgates. Diese Assertionen treffen auch dann zu, wenn die Kennung in einem Kommentar, einem uebersprungenen Fall oder einer toten Verzweigung steht. Damit ist die aus Slice 15 uebernommene Schwaeche CR15-15 nicht nur weitergefuehrt, sondern an einer zweiten, fuer die Ergebnisaussage zentralen Stelle wiederholt | angenommen | begrenzt; drei Quelltextassertions entfernt, kein eigener Live-Nachweis behauptet; Shared-Runner-Refactoring als separater Folgescope |
| CR16-9 | Claude-Review (Runde 2) | Im selben Arbeitsschritt, der die Transliteration korrigiert, ist im Abschnitt "Durchgefuehrte Aenderungen" ein neues Nicht-ASCII-Zeichen entstanden. Der Befund ist folgenlos fuer die Tests, zeigt aber, dass die Transliteration nicht durch ein Gate gedeckt ist, sondern von Hand nachgezogen wird | angenommen | erledigt; `Vorgaengerhistorie` ASCII-transliteriert |
| CR16-10 | Claude-Review (Runde 3) | Der CI-Historienvertrag kann gegen den falschen Schritt geprueft werden. `findNamedYamlStep(ciWorkflow, 'Checkout')` nimmt den ersten Treffer auf `- name: Checkout` in der gesamten Workflowdatei, ohne die Jobzugehoerigkeit auszuwerten. Gemessen: ein vorgelagerter Job `lint`, dessen Checkout `fetch-depth: 0` traegt, waehrend der eigentliche Testjob den Eintrag verliert, ergibt 137/137 gruen -- der Testjob checkt dann flach aus, und die commitgebundene Evidenz scheitert erst in der CI. Der Fall ist heute nicht eingetreten, weil die Datei genau einen Job enthaelt; er tritt bei jeder Aufteilung in Lint-, Build- oder Matrixjobs auf | offen | ausstehend |
| CR16-11 | Claude-Review (Runde 3) | Der Vertrag pinnt die Actionversion als exakte Zeichenkette. `yamlStepHasCheckoutHistoryContract` verlangt die Zeile `uses: actions/checkout@v4` woertlich. Gemessen: eine Anhebung auf `actions/checkout@v5` bei unveraendert korrekt platziertem `fetch-depth: 0` ergibt `FAIL: CI checkout provides the predecessor history required by Slice 14-16`. Die Fehlerrichtung ist sicher, die Meldung aber irrefuehrend: sie behauptet einen fehlenden Historienvertrag, obwohl nur die Version abweicht, und nennt die Version nicht. Bei einer routinemaessigen Abhaengigkeitsanhebung ist der naheliegende Reparaturweg die Aufweichung der Assertion | offen | ausstehend |
| CR16-12 | Claude-Review (Runde 3) | Die Ruecknahme aus CR16-8 loest die falsche Aussage, hinterlaesst aber eine unbewachte Stelle. Slice 16 verweist im Ergebnisabschnitt auf den lebenden Rowhash des Charakterisierungsgates, besitzt dorthin aber keine maschinenlesbare Verbindung mehr -- weder Ausfuehrung noch Quelltextbindung noch eine gepinnte Fallkennung. Ich habe die Aussage eigen geprueft: eine Aenderung der Aktienrendite 2001 in `app/simulator/global-equity-research-chain.js` faerbt das Charakterisierungsgate rot (248 statt 249 Assertions), der Nachweis existiert also und wirkt. Verliert dieses Gate jedoch den integrierten Referenzfall 2000 bis 2025 oder dessen Rowhashvergleich, bleibt Slice 16 gruen und behauptet weiterhin einen lebenden Enginenachweis, den niemand mehr fuehrt. Codex hat die Grenze bewusst gezogen und auf einen Folgeslice verwiesen; die Aussage im Ergebnisabschnitt ist damit dokumentarisch, nicht abgesichert | offen | ausstehend |

## Review-Feedback von Claude (Runde 1)

**Pruefgegenstand:** `tests/backtest-data-validation-slice-16.test.mjs`
(229 Zeilen, neu), `tests/fixtures/backtest-data-validation-slice-16-v1.json`
(81 Zeilen, neu), dieses Dokument sowie die Fortschreibungen in
`docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md` und `tests/README.md`.
Basis: HEAD `efd51ad`, Arbeitsbaum mit fuenf Positionen.

**Verifikationsbasis (eigene Messungen):**

- `npm test`: 18.601/18.601 Assertions, 0 fehlgeschlagene Dateien, 1 separates
  Gate ohne Fehler, 0 offene Handles.
- `npm run test:browser`: Exitcode 0.
- `npm run docs:evidence`: 69 MKT-, 55 FOR-, 17 MAP-Records; 11/7 Reviewscopes;
  10 Modellmatrixtermine.
- `git diff --check`: ohne Befund.
- Fokussiert: Slice 16 109/109, Slice 15 155/155, Slice 14 144/144,
  Slice-13-Charakterisierung 249/249, jeweils 0 Fehler.
- Vier Proben in drei Wegwerf-Klonen ausserhalb des Projektverzeichnisses; alle
  entfernt. Der Arbeitsbaum des Projekts wurde nicht veraendert.

### Probe 1 -- Ist die Commit-Auflage aus Runde 3 des Slice-15-Reviews vollzogen?

Sie ist es. Gemessen an `git show --stat efd51ad` sowie in einem frischen Klon
des Commits mit `core.autocrlf=true`:

```text
.gitattributes und alle sieben Originalquellen im selben Commit  ja
oecd-share-prices-monthly.csv im frischen Klon  281.140 Byte  9ea88f6d...
ecb-fx-monthly.csv                              121.753 Byte  047cab45...
destatis-vpi-current-2026-07-10.html            202.144 Byte  82ab91a5...
bundesbank-money-market-pages-15-16-layout.txt   21.744 Byte  85e3b0f6...
bundesbank-frankfurt-gold-annual-1968-1998.csv   12.789 Byte  c08654b0...
bundesbank-usd-eur-annual-1999-2025.csv          11.652 Byte  ba8810d1...
destatis-bruttomonatsverdienst-index-2026-08-01.html 73.246 Byte 1f62492a...
sieben verify:*data-Builder im frischen Klon    7/7 Exitcode 0
Slice-15-Test im frischen Klon                  155/155
```

Damit ist CR15-1 und CR15-9 nicht mehr nur am Kandidatenzustand, sondern am
Repository selbst belegt. Das ist der substanzielle Fortschritt dieses Slice.

### Probe 2 -- Verhaelt sich die Evidenzschicht in einem flachen Checkout?

Sie tut es nicht. Der Slice-16-Commit wurde in einem Wegwerf-Klon simuliert und
dieser anschliessend mit `git clone --depth 1` geklont:

```text
Slice 16 im flachen Klon   6 Assertions, FAIL: Slice-15 source commit is reachable
Slice 15 im flachen Klon   5 Assertions, FAIL: Slice-14 source commit is reachable
```

`actions/checkout@v4` in `.github/workflows/ci-tests.yml` erzeugt ohne
`fetch-depth` genau diese Form. Siehe CR16-1.

### Probe 3 -- Was faengt die Live-Bindung, was nicht?

```text
Byte in lebender Originalquelle gekippt   -> FAIL mit benannter Assertion
binary-Zeile aus lebender .gitattributes  -> Slice 16 gruen, Slice 15 faengt es
Zeile an lebendes S15-Dokument angehaengt -> Slice 16 109/109 gruen, niemand faengt es
```

Die Byteintegritaet der sieben Quellen ist beidseitig abgesichert, die des
Reviewprotokolls nur commitseitig. Siehe CR16-2.

### Probe 4 -- Woran haengt der Result-Fingerprint?

An einer Datei, nicht an einem Lauf. `e0362da9...` erscheint in keinem Test,
der die Engine ausfuehrt; der Charakterisierungstest ueberschreibt den
erwarteten Fingerprint vor dem Vergleich mit dem gemessenen. Die lebende
Enginebindung laeuft ueber `canonicalRowsHash` `9de469d6...`, den Slice 16 nur
uebernimmt. Siehe CR16-3.

### Pruefdimensionen (Runde 1)

1. **Korrektheit:** Die Commit-, Vorfahren- und Byteaussagen sind zutreffend und
   nachgemessen. Nicht zutreffend ist Akzeptanzkriterium 1 in seiner
   Formulierung (CR16-2), und Akzeptanzkriterium 10 gilt nur fuer den
   vollstaendigen Klon (CR16-1).
2. **Vertragstreue:** Die sieben Rekonstruktionsgates bleiben alleinige Owner
   der Builderausfuehrung; es gibt weder Doppelausfuehrung noch dekorative
   Outputzeugen. Die aus Slice 15 uebernommenen Grenzen
   `not_demonstrated_against_slice_12_commit` und
   `repository_reconstruction_not_external_scientific_validation` werden
   maschinell gegen die committete Slice-15-Fixture geprueft und nicht neu
   behauptet.
3. **Fehlerbehandlung:** Datei-, JSON- und Git-Grenzen sind durchgaengig
   gefangen und melden benannte Assertions; ein Abbruch ohne Aussage wurde
   nicht gefunden. `git diff-tree` auf einen Mergecommit liefert eine leere
   Pfadmenge und laesst die Enthaltenseinspruefung scheitern statt stillschweigend
   bestehen -- die Fehlerrichtung stimmt.
4. **Seiteneffekte:** Der Slice ist read-only; Produktivcode, Engine, Worker und
   historische Werte sind unberuehrt. Die beiden fortgeschriebenen Dokumente
   beschreiben den gemessenen Zustand zutreffend.
5. **Was koennte brechen?** Ein flacher oder von `efd51ad` abgekoppelter
   Checkout (CR16-1); eine spaetere Aenderung am lebenden Reviewprotokoll
   (CR16-2); eine achte zeilenendensensitive Originalquelle (CR16-4).

### Findings-Lifecycle (Runde 1)

- CR15-1, CR15-9: geschlossen. Der gemeinsame Commit ist vollzogen, im frischen
  Klon reproduzieren alle sieben Ketten (Probe 1).
- CR15-13: sachlich erledigt, da der Pre-Commit-Zweig nach dem Commit nicht mehr
  erreichbar ist; die Erledigung ist im Dokument nicht ausgewiesen (CR16-5).
- CR15-14, CR15-15: unveraendert offen; CR15-14 ist in der Slice-16-Fixture
  zusaetzlich dupliziert (CR16-4).
- CR15-10, CR15-11, CR15-12: bleiben geschlossen; erneut gegengemessen.
- CR13-10, CR13-11, CR13-13, CR14-10 bis CR14-13, CR14-16 sowie die Restrisiken
  der Slices 6 bis 12: unveraendert offen.
- Neu eroeffnet: CR16-1, CR16-2, CR16-3, CR16-4, CR16-5.

## Review-Ergebnis (Claude, Runde 1)

- Status: blockiert
- Blocker:
  - **CR16-1** -- Die Evidenzschicht ist in der eigenen CI-Checkoutform nicht
    ausfuehrbar; gemessen bricht sie dort nach sechs beziehungsweise fuenf
    Assertions ab. Freigabefaehig wird der Slice, wenn entweder der Checkout
    die noetige Historie erhaelt oder der Test einen fehlenden Eingangscommit
    als ausgewiesene, benannte Einschraenkung behandelt statt als Fehler.
    Solange das offen ist, darf weder dieses Dokument noch `tests/README.md`
    das Bestehen der Pflichtgates ohne Umgebungsvorbehalt fuehren.
  - **CR16-2** -- Akzeptanzkriterium 1 behauptet eine Uebereinstimmung, die der
    Test fuer die drei Eingangsartefakte nicht prueft. Entweder wird der
    Live-Hash der drei Pfade wie bei den sieben Originalquellen gegen den
    gepinnten Wert verglichen, oder das Kriterium wird auf die tatsaechliche
    Aussage zurueckgenommen. Ein falsifiziertes lebendes Reviewprotokoll darf
    nicht gruen bleiben.
- Restrisiken:
  - CR16-3: Der Result-Fingerprint ist dateibezogen, nicht laufbezogen.
  - CR16-4: Sieben und acht bleiben deklarierte Konstanten.
  - CR16-5: Der Lebenszyklus von CR15-13 ist nicht ausgewiesen.
  - Die Finanzneutralitaet gegen den Slice-12-Commit bleibt
    `not_demonstrated_against_slice_12_commit`.
  - Uebernommen und weiterhin offen: CR13-10, CR13-11, CR13-13, CR14-10 bis
    CR14-13, CR14-16, CR15-14, CR15-15 sowie die Restrisiken der Slices 6 bis
    12.
  - Der Slice belegt Repositorykonsistenz; er belegt keine externe fachliche
    oder wissenschaftliche Validitaet der Datenquellen. Diese Grenze ist im
    Dokument korrekt gezogen.
- Pre-Mortem: In drei Monaten wird der Branch nach `main` gemergt und der
  Pull-Request-Lauf der CI schlaegt fehl, weil der flache Checkout `efd51ad`
  nicht kennt. Der Fehlertext lautet "Slice-15 source commit is reachable" und
  klingt nach einem Problem mit den Daten, nicht mit der Checkouttiefe. Weil
  die Suite lokal auf jedem vollstaendigen Klon gruen ist, wird der Test als
  umgebungsabhaengig eingestuft und in der CI ausgenommen oder seine
  Commitbindung auf `HEAD` umgestellt. Damit verliert die gesamte Kette der
  Slices 14 bis 16 genau die Eigenschaft, wegen der sie gebaut wurde: die
  Bindung an einen bestimmten, unveraenderlichen Stand.

## Review-Antworten von Codex (Runde 1)

**Nachbesserungsdatum:** 2026-08-03

### CR16-1 - flacher CI-Checkout

Angenommen und behoben. `.github/workflows/ci-tests.yml` setzt fuer
`actions/checkout@v4` jetzt `fetch-depth: 0`. Die Slice-16-Fixture benennt die
volle Historie als Voraussetzung commitgebundener Evidenz; der Test prueft den
Workflowvertrag. Damit erhalten Slice 14 bis 16 in der projekteigenen CI die
gepinnten Vorgaengercommits. Ein beliebiger externer flacher Klon bleibt ohne
Nachladen der Historie bewusst keine geeignete Ausfuehrungsumgebung fuer die
commitgebundene Evidenz.

### CR16-2 - fehlende Live-Bindung der Eingangsartefakte

Angenommen und behoben. Ergebnisdokument, Validierungsfixture und
Validierungstest aus Slice 15 werden nach der Commitpruefung zusaetzlich aus
dem lebenden Arbeitsbaum gelesen und gegen dieselben drei SHA-256-Werte
verglichen. Eine nachtraegliche Aenderung des Reviewprotokolls bricht jetzt mit
einer pfadgenauen Assertion.

### CR16-3 - Archivfingerprint versus lebender Lauf

Angenommen und behoben. Fixture, Assertionstext, Hauptplan, Testinventar und
Ergebnisabschnitt unterscheiden nun ausdruecklich:

- Der Result-Fingerprint ist nur die Selbstkonsistenz der committeten
  kanonischen Archivbasis und kein live neu erzeugter Engine-Fingerprint.
- Der lebende Engine-Nachweis ist der kanonische Rowhash des Falls
  `integrated_reference_2000_2025` im bestehenden
  `simulator-backtest-characterization.test.mjs`. Slice 16 bindet diesen
  Owner, die Fall-ID, den erwarteten Rowhash und dessen Feldvergleich.

### CR16-4 - deklarierte Siebenermenge

Angenommen und behoben. Die konstante Laengenassertion wurde entfernt. Der
Test inventarisiert alle getrackten Originaldateien im Eingangscommit und im
lebenden Baum, klassifiziert zeilenendensensitive Textoriginale anhand der
Bytes (Zeilenende vorhanden, kein NUL-Byte) und vergleicht beide abgeleiteten
Mengen exakt mit dem Binaervertrag. Eine weitere textartige Originalquelle
bleibt damit nicht unbemerkt.

### CR16-5 - Findings-Lifecycle und Transliteration

Angenommen und behoben. CR15-13 ist als durch den vollzogenen Commit
geschlossen dokumentiert. CR15-14 ist durch die abgeleitete Commit- und
Live-Inventur geschlossen; CR15-15 bleibt offen. `Eingangsgroesse` verwendet
jetzt die projektweite ASCII-Transliteration.

### Nachbesserungsstatus Runde 1

- CR16-1 bis CR16-5: technisch umgesetzt; externes Re-Review ausstehend.
- Fokussierter Slice-16-Test nach der Nachbesserung: 137/137 Assertions,
  0 Fehler.
- Vollstaendige Pflichtgates nach Abschluss der Dokumentfortschreibung:
  `npm test` und das CI-Kommando `npm run test:coverage` jeweils
  18.627/18.627 Assertions; Browser-, Doku- und Diff-Gate gruen.

## Review-Feedback von Claude (Runde 2)

**Pruefgegenstand:** `tests/backtest-data-validation-slice-16.test.mjs`
(295 Zeilen, zuvor 229), `tests/fixtures/backtest-data-validation-slice-16-v1.json`
(91 Zeilen, zuvor 81), `.github/workflows/ci-tests.yml`, die geaenderten
Abschnitte "Akzeptanzkriterien", "Durchgefuehrte Aenderungen", "Ergebnisse" und
"Offene Risiken" dieses Dokuments sowie `tests/README.md`. Basis: HEAD
unveraendert `efd51ad`, Arbeitsbaum mit sechs Positionen.

**Verifikationsbasis (eigene Messungen):**

- `npm test`: 18.627/18.627 Assertions, 0 fehlgeschlagene Dateien, 1 separates
  Gate ohne Fehler, 0 offene Handles.
- `npm run test:coverage`: 78,97 % approximative V8-Zeilenabdeckung
  (40.302/51.035), 217 Dateien, beide Pflicht-Dateigates bestanden.
- `npm run test:browser`: Exitcode 0.
- `npm run docs:evidence`: 69 MKT-, 55 FOR-, 17 MAP-Records; 11/7 Reviewscopes;
  10 Modellmatrixtermine.
- `git diff --check`: ohne Befund.
- Fokussiert: Slice 16 135/135, Slice 15 155/155, Slice 14 144/144,
  Slice-13-Charakterisierung 249/249, jeweils 0 Fehler.
- Sechs Mutationsproben in zwei Wegwerf-Klonen ausserhalb des
  Projektverzeichnisses, in denen der Nachbesserungsstand tatsaechlich
  committet wurde; beide entfernt. Der Arbeitsbaum des Projekts wurde nicht
  veraendert.

### Probe 5 -- Faengt die Live-Bindung die Manipulation aus Runde 1?

Sie tut es, an derselben Stelle, an der die Suite in Runde 1 gruen blieb:

```text
Zeile an lebendes S15-Dokument angehaengt
-> FAIL nach 16 Assertions: "... remains byte-identical in the live tree"
   (Expected 50226f36..., got 42149919...)
```

CR16-2 ist damit am Vollzug geschlossen, nicht nur an der Formulierung.

### Probe 6 -- Traegt die abgeleitete Vollstaendigkeitspruefung?

Fuer `data/historical` ja. Eine achte, als CRLF-Text angelegte und getrackte
Originalquelle wird mit benannter Assertion gefangen, die den zusaetzlichen
Pfad ausdruecklich auflistet:

```text
data/historical/german-cpi-chain/originals/neue-quelle-2026.csv hinzugefuegt
-> FAIL nach 77 Assertions: "Live binary contract exactly covers every
   line-ending-sensitive original"
```

Das ist exakt das Szenario aus dem Pre-Mortem der Slice-15-Runde 3. Die Sieben
ist keine Konstante mehr, sondern ein Vergleich gegen den Bestand.

### Probe 7 -- Wie weit reicht der abgeleitete Bestand?

Nur ueber einen der beiden Originalbaeume. Dieselbe Datei unter
`data/static/german-demography-care-survivor-contract/originals/` bleibt
unbemerkt:

```text
data/static/.../originals/neue-quelle-2026.csv hinzugefuegt -> 135/135 gruen
git ls-files "data/static/*/originals/*"                    -> 2 Dateien (.xlsx)
Quellwurzel des Demografie-Builders: data/static/.../originals
```

Der Demografiebuilder ist einer der sieben Rekonstruktionsgates, und sein
Originalbaum liegt ausserhalb des abgeleiteten Bestands. Aktuell liegen dort
nur echte Binaerformate, ein Defekt besteht also nicht. Siehe CR16-6.

### Probe 8 -- Ist der CI-Historienvertrag maschinell gepinnt?

Nur teilweise. Gemessen an derselben Datei:

```text
fetch-depth vollstaendig entfernt        -> FAIL nach 12 Assertions
fetch-depth in den setup-node-with-Block -> 135/135 gruen, obwohl der Checkout
verschoben (dort wirkungslos)               damit wieder flach ist
```

Zusaetzlich gemessen: der Nachbesserungsstand, in einen flachen Klon gebracht,
bricht unveraendert nach sechs Assertions mit `FAIL: Slice-15 source commit is
reachable` ab. Der konkrete Defekt aus CR16-1 ist behoben, die Diagnosefaehigkeit
des Abbruchs nicht. Siehe CR16-7.

### Pruefdimensionen (Runde 2)

1. **Korrektheit:** Akzeptanzkriterium 1 deckt sich jetzt mit dem Test; die
   Live-Pruefung der drei Eingangsartefakte ist vorhanden und wirksam
   (Probe 5). Kriterium 3 spricht vom "aus dem Repositorybestand abgeleiteten"
   Bestand, meint aber `data/historical` (Probe 7).
2. **Vertragstreue:** Kriterium 5 und der Ergebnisabschnitt trennen jetzt
   Archiv-Selbstkonsistenz und lebenden Enginenachweis und benennen das
   Charakterisierungsgate als Owner. Die sieben Rekonstruktionsgates bleiben
   alleinige Owner der Builderausfuehrung; keine Doppelausfuehrung, keine
   dekorativen Zeugen.
3. **Fehlerbehandlung:** Die neuen Grenzen (`ls-tree`, `ls-files`, Lesen der
   Workflowdatei) sind gefangen und melden benannte Assertions. Der
   Bytefilter `!bytes.includes(0) && (bytes.includes(10) || bytes.includes(13))`
   ist eine Heuristik; sie trifft fuer den vorhandenen Bestand zu, ist aber
   keine Formatpruefung.
4. **Seiteneffekte:** Erstmals wird in diesem Slice eine Datei ausserhalb von
   Tests und Dokumentation geaendert (`.github/workflows/ci-tests.yml`). Die
   Aenderung ist im Diff-Risiko-Block nachgezogen und unter "Abweichungen vom
   Plan" mit "Keine" gefuehrt -- das ist vertretbar, weil der Block vor dem
   Coding erweitert wurde, verdient aber den Hinweis, dass der urspruengliche
   Scope diese Datei nicht enthielt. `feature-branch-pages.yml` fuehrt keine
   Tests aus und ist nicht betroffen.
5. **Was koennte brechen?** Eine zeilenendensensitive Quelle im zweiten
   Originalbaum (CR16-6); ein verschobener oder auf eine andere Checkout-Action
   umgestellter Historienvertrag (CR16-7); ein Gate-Owner, der die gegreppten
   Zeichenketten nur noch nominell traegt (CR16-8).

### Findings-Lifecycle (Runde 2)

- CR16-1: geschlossen. Der CI-Checkout laedt die volle Historie, und das
  Entfernen des Eintrags faerbt das Gate rot (Probe 8). Die verbleibende
  Schwaeche der Pinnung wird als CR16-7 weitergefuehrt.
- CR16-2: geschlossen; am Vollzug nachgemessen (Probe 5).
- CR16-3: geschlossen. Archivwert und Live-Nachweis sind sprachlich und
  maschinenlesbar getrennt; die Ownerbindung selbst bleibt eine
  Quelltextpruefung und wird als CR16-8 weitergefuehrt.
- CR16-4: fuer `data/historical` geschlossen; am Vollzug nachgemessen
  (Probe 6). Die Bereichsgrenze wird als CR16-6 weitergefuehrt.
- CR16-5: geschlossen. CR15-13 ist als erledigt ausgewiesen und die
  Transliteration der Eingangsgrenze korrigiert; die Wiedereinfuehrung eines
  Nicht-ASCII-Zeichens an anderer Stelle wird als CR16-9 gefuehrt.
- CR15-13, CR15-14: geschlossen; jeweils eigen nachgemessen.
- CR15-15: unveraendert offen und in CR16-8 verbreitert.
- CR13-10, CR13-11, CR13-13, CR14-10 bis CR14-13, CR14-16 sowie die
  Restrisiken der Slices 6 bis 12: unveraendert offen.
- Neu eroeffnet: CR16-6, CR16-7, CR16-8, CR16-9.

## Review-Ergebnis (Claude, Runde 2)

- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - CR16-6: Der abgeleitete Bestand endet an `data/historical`; der
    Originalbaum des Demografiegates unter `data/static` ist nicht erfasst.
  - CR16-7: Der CI-Historienvertrag ist eine permissive Regex; ein an
    wirkungsloser Stelle stehendes `fetch-depth: 0` besteht das Gate. Die
    Abbruchmeldung im flachen Checkout nennt weiterhin den Commit statt der
    Checkouttiefe.
  - CR16-8: Die Bindung an die Gate-Owner bleibt eine Quelltextpruefung und
    umfasst jetzt zusaetzlich Fallkennung, Rowhash und Vergleichsausdruck des
    Charakterisierungsgates.
  - CR16-9: Im selben Arbeitsschritt, der die Transliteration korrigiert, ist
    im Abschnitt "Durchgefuehrte Aenderungen" ein neues Nicht-ASCII-Zeichen
    entstanden.
  - Die Finanzneutralitaet gegen den Slice-12-Commit bleibt
    `not_demonstrated_against_slice_12_commit`.
  - Uebernommen und weiterhin offen: CR13-10, CR13-11, CR13-13, CR14-10 bis
    CR14-13, CR14-16, CR15-15 sowie die Restrisiken der Slices 6 bis 12.
  - Der Slice belegt Repositorykonsistenz; er belegt keine externe fachliche
    oder wissenschaftliche Validitaet der Datenquellen. Diese Grenze ist im
    Dokument korrekt gezogen.
- Pre-Mortem: In drei Monaten wird die Destatis-Sterbetafel des
  Demografiegates von einer Tabellendatei auf eine CSV-Ausleitung umgestellt
  und unter `data/static/german-demography-care-survivor-contract/originals/`
  mit CRLF abgelegt. Der abgeleitete Bestand von Slice 16 sieht diesen Baum
  nicht, `.gitattributes` erhaelt keinen Eintrag, und saemtliche Gates bleiben
  auf dem Rechner des Ergaenzenden gruen. Im naechsten frischen Klon scheitert
  genau der Demografiebuilder mit einem Hashvergleich. Weil Slice 15 und
  Slice 16 die Zeilenendenfrage als abgeleitet und geschlossen dokumentieren,
  wird die Ursache dort nicht mehr vermutet, und der gepinnte Hash wird auf die
  vorgefundenen LF-Bytes gezogen.

## Review-Antworten von Codex (Runde 2)

**Nachbesserungsdatum:** 2026-08-03

### CR16-6 - zweiter Originalquellenbaum

Angenommen und behoben. Die Commitinventur liest nun `data/historical` und
`data/static`; die Live-Inventur erfasst beide `*/originals/*`-Baeume. Die
beiden derzeitigen Demografie-XLSX-Originale werden mitinventarisiert, aber
wegen ihrer NUL-Bytes korrekt nicht als zeilenendensensitive Textquellen
klassifiziert. Eine spaetere CSV-/HTML-/Textquelle unter `data/static` wird
damit ebenso wie unter `data/historical` gegen den Binaervertrag geprueft.

### CR16-7 - Struktur und Diagnose des CI-Historienvertrags

Angenommen und behoben. Die dateiweite permissive Regex wurde entfernt. Der
Test isoliert den YAML-Schritt mit `name: Checkout`, verlangt dort
`uses: actions/checkout@v4` und akzeptiert `fetch-depth: 0` ausschliesslich als
Kind des `with`-Blocks desselben Schritts. Ein zum Setup-Node-Schritt
verschobener Wert ist damit wirkungslos und laesst das Gate rot werden.

Wenn ein gepinnter Commit fehlt, fragt die Diagnose zusaetzlich
`git rev-parse --is-shallow-repository` ab. Ein flacher Klon meldet nun
ausdruecklich, dass die volle Historie beziehungsweise `fetch-depth: 0`
benoetigt wird; ein nicht flacher abgekoppelter Checkout erhaelt eine getrennte
Diagnose.

### CR16-8 - schwache Quelltextbindung

Angenommen und gemaess Nutzerentscheidung begrenzt. Die drei
`includes(...)`-Assertionen auf Fallkennung, Rowhash und Vergleichsausdruck
sowie die zugehoerigen Fixturepfade wurden entfernt. Slice 16 behauptet keine
eigene Ausfuehrung oder Quelltextbindung des lebenden Referenzlaufs mehr. Das
separat ausgefuehrte Charakterisierungsgate bleibt dessen unabhaengiger Owner.

Eine vollstaendige technische Zusammenfuehrung wuerde einen gemeinsam
nutzbaren DOM-freien Referenzrunner erfordern und den Slice deutlich
vergroessern. Dieses Refactoring bleibt deshalb als offener Folgescope unter
CR15-15/CR16-8 dokumentiert.

### CR16-9 - erneute Transliteration

Angenommen und behoben. `Vorgaengerhistorie` ist ASCII-transliteriert. Eine
abschliessende Suche auf Nicht-ASCII-Zeichen im Slice-Dokument ist Teil der
Nachpruefung.

### Nachbesserungsstatus Runde 2

- CR16-6, CR16-7 und CR16-9: technisch umgesetzt; externes Re-Review
  ausstehend.
- CR16-8: schwache Zusatzbindung entfernt und Aussagegrenze korrigiert;
  Shared-Runner-Refactoring bewusst nicht in Slice 16 aufgenommen.
- Fokussierter Slice-16-Test nach der Nachbesserung: 135/135 Assertions,
  0 Fehler.
- Vollstaendige Pflichtgates nach der Dokumentfortschreibung:
  `npm run test:coverage` 18.629/18.629 Assertions bei 78,97 % approximativer
  V8-Zeilenabdeckung; Browser-, Doku- und Diff-Gate gruen.
- Gegenprobe des CI-Parsers: `fetch-depth: 0` unter `setup-node` wird
  abgelehnt; derselbe Kindwert unter `actions/checkout@v4` wird akzeptiert.
- Nicht-ASCII-Pruefung des Slice-Dokuments: keine Treffer.

## Review-Feedback von Claude (Runde 3)

**Pruefgegenstand:** `tests/backtest-data-validation-slice-16.test.mjs`
(346 Zeilen, zuvor 295), `tests/fixtures/backtest-data-validation-slice-16-v1.json`
(88 Zeilen, zuvor 91), `.github/workflows/ci-tests.yml` sowie die geaenderten
Abschnitte "Akzeptanzkriterien", "Durchgefuehrte Aenderungen" und
"Offene Risiken" dieses Dokuments. Basis: HEAD unveraendert `efd51ad`,
Arbeitsbaum mit sechs Positionen.

**Verifikationsbasis (eigene Messungen):**

- `npm test`: 18.629/18.629 Assertions, 0 fehlgeschlagene Dateien, 1 separates
  Gate ohne Fehler, 0 offene Handles.
- `npm run test:browser`: Exitcode 0.
- `npm run docs:evidence`: 69 MKT-, 55 FOR-, 17 MAP-Records; 11/7 Reviewscopes;
  10 Modellmatrixtermine.
- `git diff --check`: ohne Befund.
- Fokussiert: Slice 16 137/137, Slice 15 155/155, Slice 14 144/144,
  Slice-13-Charakterisierung 249/249, jeweils 0 Fehler.
- Nicht-ASCII-Pruefung des Slice-Dokuments: 0 Treffer.
- Sechs Mutationsproben in zwei Wegwerf-Klonen ausserhalb des
  Projektverzeichnisses, in denen der Nachbesserungsstand tatsaechlich
  committet wurde; beide entfernt. Der Arbeitsbaum des Projekts wurde nicht
  veraendert.

### Probe 9 -- Reicht der abgeleitete Bestand jetzt ueber beide Originalbaeume?

Ja. Dieselbe Datei, die in Runde 2 unbemerkt blieb, wird jetzt mit benannter
Assertion und ausgewiesenem Pfad gefangen:

```text
data/static/.../originals/neue-quelle-2026.csv hinzugefuegt
-> FAIL nach 82 Assertions: "Live binary contract exactly covers every
   line-ending-sensitive original", der Zusatzpfad ist in der Diffliste benannt
```

### Probe 10 -- Haelt der isolierte Schrittparser?

Fuer die gemeldete Fehlplatzierung ja. `fetch-depth: 0` in den `with`-Block von
`actions/setup-node` verschoben ergibt jetzt `FAIL: CI checkout provides the
predecessor history required by Slice 14-16`, wo in Runde 2 noch 135/135 gruen
gemeldet wurden. Die beiden mitgelieferten Selbsttests des Parsers pruefen
genau diese Unterscheidung.

### Probe 11 -- Wird der richtige Schritt geprueft?

Nicht zwingend. `findNamedYamlStep` nimmt den ersten Treffer auf
`- name: Checkout` in der gesamten Datei. Gemessen mit einem vorgelagerten
Job, dessen Checkout den Vertrag erfuellt, waehrend der Testjob ihn verliert:

```text
jobs.lint.Checkout mit fetch-depth: 0, jobs.test.Checkout ohne
-> 137/137 gruen, obwohl der Testjob flach auscheckt
```

Siehe CR16-10.

### Probe 12 -- Ist der Abbruch im flachen Klon jetzt diagnosefaehig?

Ja. Der Nachbesserungsstand in einem `--depth 1`-Klon meldet:

```text
FAIL: Slice-15 source commit is reachable; repository is shallow;
fetch full history or configure actions/checkout with fetch-depth: 0
```

Die in meinem Pre-Mortem der Runde 1 beschriebene Fehldiagnose ist damit
wesentlich unwahrscheinlicher geworden.

### Probe 13 -- Wie reagiert der Vertrag auf eine Versionsanhebung?

Mit einem Fehlalarm. `actions/checkout@v4` auf `@v5` angehoben, bei unveraendert
korrekt platziertem `fetch-depth: 0`, ergibt `FAIL: CI checkout provides the
predecessor history required by Slice 14-16`. Die Meldung nennt die Version
nicht. Siehe CR16-11.

### Probe 14 -- Traegt der Gate-Owner, an den Slice 16 jetzt nur noch verweist?

Er traegt. Da Slice 16 die Quelltextbindung an das Charakterisierungsgate
ersatzlos aufgegeben hat, habe ich dessen Aussagekraft direkt geprueft: die
Aktienrendite 2001 in `app/simulator/global-equity-research-chain.js` von
`-0.13609...` auf `-0.12609...` geaendert ergibt `FAIL` mit 248 statt 249
Assertions. Der lebende Enginenachweis existiert also und ist wirksam -- er
ist nur nicht mehr an Slice 16 gebunden. Siehe CR16-12.

### Pruefdimensionen (Runde 3)

1. **Korrektheit:** Die Ableitung des Originalbestands deckt jetzt beide
   Baeume; der CI-Parser unterscheidet Schritte statt Zeichenketten. Offen
   bleibt die Jobzuordnung (Probe 11).
2. **Vertragstreue:** Akzeptanzkriterium 5 und der Ergebnisabschnitt
   beschreiben die Evidenzarten jetzt deckungsgleich mit dem, was der Test
   tatsaechlich tut. Die Ruecknahme in CR16-8 ist eine ehrliche Verkleinerung
   der Aussage, keine Verstaerkung der Pruefung -- das ist im Dokument als
   solches benannt.
3. **Fehlerbehandlung:** `gitHistoryDiagnostic` erhoeht die Aussagekraft des
   haeufigsten Abbruchs, ohne eine Bedingung zu entschaerfen. Die
   Parser-Selbsttests sind eine sinnvolle Absicherung gegen stille
   Aufweichung der Regel.
4. **Seiteneffekte:** Weiterhin read-only ausserhalb von Tests, Dokumentation
   und der einen Workflowdatei; `git diff --check` ohne Befund;
   `feature-branch-pages.yml` unberuehrt.
5. **Was koennte brechen?** Eine Umstrukturierung der CI in mehrere Jobs
   (CR16-10); eine Versionsanhebung der Checkout-Action und die naheliegende
   Reaktion darauf (CR16-11); ein Charakterisierungsgate, das den integrierten
   Referenzfall verliert, ohne dass Slice 16 es bemerkt (CR16-12).

### Findings-Lifecycle (Runde 3)

- CR16-6: geschlossen; am Vollzug nachgemessen (Probe 9).
- CR16-7: geschlossen. Die gemeldete Fehlplatzierung wird gefangen (Probe 10)
  und die Abbruchmeldung benennt die Checkouttiefe (Probe 12). Zwei engere
  Grenzfaelle werden als CR16-10 und CR16-11 weitergefuehrt.
- CR16-8: als bewusste Ruecknahme geschlossen; die verbleibende Folge wird als
  CR16-12 gefuehrt.
- CR16-9: geschlossen; das Dokument enthaelt 0 Nicht-ASCII-Zeichen.
- CR16-1 bis CR16-5: bleiben geschlossen; erneut gegengemessen.
- CR15-13, CR15-14: bleiben geschlossen. CR15-15 bleibt offen.
- CR13-10, CR13-11, CR13-13, CR14-10 bis CR14-13, CR14-16 sowie die
  Restrisiken der Slices 6 bis 12: unveraendert offen.
- Neu eroeffnet: CR16-10, CR16-11, CR16-12.

## Review-Ergebnis (Claude, Runde 3)

- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - CR16-10: Der Vertrag wird gegen den ersten `Checkout`-Schritt der Datei
    geprueft, nicht gegen den des Testjobs.
  - CR16-11: `actions/checkout@v4` ist als exakte Zeichenkette gepinnt; eine
    Versionsanhebung erzeugt einen Fehlalarm ohne Versionshinweis.
  - CR16-12: Slice 16 besitzt keine maschinenlesbare Verbindung mehr zum
    lebenden Enginenachweis. Dass dieser existiert und wirksam ist, habe ich
    eigen geprueft (Probe 14); dass er bestehen bleibt, sichert kein Gate von
    Slice 16 ab.
  - CR15-15: Die Bindung an die Gate-Owner der Builderausfuehrung bleibt eine
    Quelltextpruefung.
  - Die Finanzneutralitaet gegen den Slice-12-Commit bleibt
    `not_demonstrated_against_slice_12_commit`.
  - Uebernommen und weiterhin offen: CR13-10, CR13-11, CR13-13 sowie CR14-10
    bis CR14-13 und CR14-16; dazu die Restrisiken der Slices 6 bis 12.
  - Der Slice belegt Repositorykonsistenz; er belegt keine externe fachliche
    oder wissenschaftliche Validitaet der Datenquellen. Diese Grenze ist im
    Dokument korrekt gezogen.
- Pre-Mortem: In drei Monaten wird `actions/checkout` routinemaessig auf die
  naechste Hauptversion angehoben. Der Historienvertrag ist dabei unveraendert
  korrekt gesetzt, aber das Slice-16-Gate meldet `CI checkout provides the
  predecessor history required by Slice 14-16` -- ohne die Version zu nennen.
  Weil die CI gleichzeitig gruen ist und der Vertrag offensichtlich erfuellt
  aussieht, wird die Assertion als zu streng eingestuft und auf eine
  Zeichenkettensuche zurueckgebaut. Damit ist genau die Luecke aus CR16-7
  wiederhergestellt, diesmal ohne dass ein Review sie erneut sucht: der Wert
  darf wieder an wirkungsloser Stelle stehen, und der naechste flache Checkout
  faellt erst in der CI auf.
