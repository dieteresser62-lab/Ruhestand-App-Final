# Slice 15 - Datenpruefung des Slice-14-Ergebnisses

**Datum:** 2026-08-03
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`
**GitHub-Status:** Remote `origin` ist konfiguriert; Push bleibt Nutzerentscheidung
**Basiscommit:** `619c4d4c43bc469af4320759c1f52212e4c39390`
**Status:** Claude-Findings CR15-1 bis CR15-12 technisch nachgebessert;
gemeinsamer Integritaetscommit, externes Re-Review und Freigabe ausstehend

## Eingangsgrenze aus Slice 14

Das vollstaendige Ergebnisdokument
[`SLICE_BACKTEST_DATENPRUEFUNG_14_ERGEBNISVALIDIERUNG.md`](SLICE_BACKTEST_DATENPRUEFUNG_14_ERGEBNISVALIDIERUNG.md)
ist die verbindliche Eingangsgrenze dieses Slice.

- Slice 14 liegt als sauberer lokaler Commit `619c4d4` vor.
- SHA-256 des Eingangs-Ergebnisdokuments:
  `be7dee62c308479c15ad187c31a4cba281fc93d531829702501fce4f63c9b509`.
- Die Slice-14-Validierungsfixture hat SHA-256
  `d7492aa3a01d4d209bfb1ed041f374721de55c00befde142d6565d90ed771a6d`.
- Die darin referenzierte Fingerprintbasis hat SHA-256
  `1e7825e477b50f992dd2d6ec885bc17ddb5daaf0574d169ede26e0c1cae54079`.
- Die externe Runde-2-Freigabe war bedingt: CR14-14 und CR14-15 waren Auflagen
  vor Commit, wurden in `619c4d4` aber noch nicht erfuellt. Slice 15 fuehrt
  die Commitbytes deshalb als Vorgaengerevidenz und die in Slice 15
  protokollierten Nachkorrekturen getrennt. Das lebende Slice-14-Dokument wird
  nicht bytegenau eingefroren. CR14-10 bis CR14-13 und CR14-16 bleiben
  als Restrisiken sichtbar; CR13-11 ist weiterhin nicht als
  Finanzneutralitaet gegen den Slice-12-Commit nachgewiesen.
- Produktivcode, Engine-Semantik und historische Datenreihen werden in diesem
  Slice nicht veraendert.

## Preflight vor Coding

- `git branch --show-current`: `codex/suite-datenintegritaet-hardening`
- `git status --short`: leer
- `git rev-parse HEAD`: `619c4d4c43bc469af4320759c1f52212e4c39390`
- Remote: `origin` ist konfiguriert; ein Push wurde nicht ausgefuehrt.

## Ziel

Slice 15 prueft die in Slice 14 eingefrorene Daten- und Ergebnisgrenze aus
einer neuen, nachgelagerten Evidenzschicht. Die Pruefung muss unterscheiden
zwischen bytegenauer Eingangsidentitaet, aktiver Rekonstruktion aus den
lebenden Datenketten und Aussagen, die durch Repository-Evidenz nicht belegt
werden koennen. Insbesondere darf die offene Finanzneutralitaet CR13-11 nicht
durch identische spaetere Konstanten ersetzt werden.

## Akzeptanzkriterien

1. Das vollstaendige Slice-14-Ergebnisdokument und seine beiden
   Validierungsartefakte sind an Commit und SHA-256 gebunden.
2. Die Slice-14-Validierungsfixture wird strukturell und semantisch gelesen;
   Status-, Dataset-, Perioden-, Summen-, Rowhash- und Fingerprintwerte werden
   nicht als duplizierte Sollkonstanten ohne Quellvergleich akzeptiert.
3. Alle verfuegbaren historischen Datenketten bestehen ihre `--verify-only`-
   Rekonstruktion sowohl im lebenden Arbeitsbaum als auch in einem isolierten
   LF-Checkout der kuenftigen Commitbytes. Zeilenendensensitive
   Originalquellen bleiben durch explizite Git-Binaerattribute bytegenau.
4. Der aktive Slice-14-Testpfad und die kanonische Fingerprintrekonstruktion
   werden erneut ausgefuehrt.
5. CR13-11 bleibt explizit `not_demonstrated_against_slice_12_commit`, solange
   kein echter Basislauf aus dem Slice-12-Commit vorliegt.
6. Fuer beabsichtigte Fortschreibungen der eingefrorenen Evidenz ist ein
   versioniertes Verfahren dokumentiert: neuer Quellcommit, neue Basisdatei,
   neue Slice-/Schema-Version und dokumentierte externe Freigabe. Das
   Repository kann eine externe Freigabe nicht technisch beweisen und
   verhindert autorisierte Fixture-Umschreibungen nicht; diese Grenze wird
   ausdruecklich ausgewiesen.
7. Produktivcode, Engine, Worker, fachliche historische Datenwerte und
   generierte Artefakte bleiben unveraendert; nur die Git-Behandlung der sieben
   Originalquellen wird auf exakte Binaerbytes festgelegt.
8. Fokussierte Tests, `npm test`, Datenketten-Verifikation,
   `npm run test:browser`, `npm run docs:evidence` und `git diff --check`
   bestehen.
9. Codex dokumentiert technische Nachweise und Aussagegrenzen, erteilt aber
   keine eigene Freigabe.

## Scope

- neue Slice-15-Evidenzfixture;
- neuer maschinenlesbarer Datenpruefungstest;
- dieses Slice-Dokument, Hauptplan, Testinventar und bei Bedarf technische
  Referenzdokumentation.

## Nicht im Scope

- Produktivcode, Engine-/Steuer-/Entnahmesemantik;
- Aenderung oder Rekalibrierung historischer Daten;
- fachliche Anlageempfehlung;
- Behauptung einer externen oder wissenschaftlichen Datenvalidierung;
- Commit oder Push durch Codex.

## Diff-Risiko vor Coding

```text
Geplante Dateien:
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_15_DATENPRUEFUNG.md (neu)
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- tests/backtest-data-validation-slice-15.test.mjs (neu)
- tests/fixtures/backtest-data-validation-slice-15-v1.json (neu)
- tests/README.md
- .gitattributes
- sieben zeilenendensensitive Originalquellen unter data/historical/
- tests/simulator-backtest-characterization.test.mjs
- gegebenenfalls docs/reference/TECHNICAL.md

Voraussichtliche Aenderungstiefe:
- mittel nach Claude-Review; Nachweis-/Git-Integritaetsebene, keine fachliche
  Laufzeitlogik und keine Aenderung historischer Werte

Gefaehrdete bestehende Tests:
- Hash-/Provenienz-Gates und Datenketten-Verifikation

Nicht anfassen:
- app/, engine/, workers/, engine.js, dist/, src-tauri/, RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md tests/README.md docs/reference/TECHNICAL.md
- neue Slice-15-Dateien nur nach ausdruecklicher Loeschfreigabe entfernen
```

## Geplante Tests

- fokussierter Slice-15-Datenpruefungstest;
- bestehender Slice-14-Datenvalidierungstest;
- alle vorhandenen `verify:*data`-Skripte;
- `npm test`;
- `npm run test:browser`;
- `npm run docs:evidence`;
- `git diff --check`.

## Durchgefuehrte Aenderungen

- Slice-Dokument mit verbindlicher Slice-14-Eingangsgrenze angelegt.
- `BacktestDataValidationSlice15V1` bindet Ergebnisdokument,
  Validierungsfixture, Validierungstest und Fingerprintbasis aus dem
  Slice-14-Commit an SHA-256.
- Der neue Test liest alle vier Eingangsartefakte sowohl direkt aus Commit
  `619c4d4` als auch aus dem lebenden Arbeitsbaum.
- Dataset-Contenthash, Manifesthash und finaler Result-Fingerprint werden mit
  den produktiven Kanonisierungsfunktionen neu berechnet.
- Die sieben vorhandenen Rekonstruktions-/Kettengates bleiben alleinige Owner
  der Builderausfuehrung in `npm test`; Slice 15 bindet Paketkommando,
  Skriptpfad, Gate-Datei und gefangene Prozessgrenze, ohne die
  Builder im selben Gesamtlauf doppelt zu starten.
- Sieben zeilenendensensitive Originalquellen sind in `.gitattributes` als
  `binary` markiert. Git speichert damit exakt die bereits gepinnten Bytes;
  gefilterte Eingaben und normaler Quellcode bleiben LF-normalisiert.
- Der Test unterscheidet den aktuellen Pre-Commit-Kandidaten vom spaeteren
  HEAD-Zustand. Vor dem Review muss der gemeinsame Acht-Pfade-Diff vorliegen;
  sobald HEAD den Binaervertrag enthaelt, werden die sieben committeten
  Blobbytes zwingend gegen ihre SHA-256-Werte geprueft.
- JSON-, Datei- und Git-Grenzen des Slice-15-Tests sind gefangen und melden
  benannte Assertions. Die beiden Git-Grenzen des Slice-13-
  Charakterisierungstests verwenden jetzt dasselbe `spawnSync`-Muster.
- Die Evidenzfortschreibung ist als organisatorisches, nicht maschinell
  erzwungenes Nachfolgerverfahren korrekt begrenzt.
- Die Nachkorrekturen CR14-14 und CR14-15 werden in der Slice-15-Fixture
  semantisch protokolliert, ohne das fortschreibbare Slice-14-Dokument erneut
  bytegenau einzufrieren.
- Hauptplan und Testinventar wurden auf Slice 15 fortgeschrieben.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/backtest-data-validation-slice-15.test.mjs`:
  150/150 Assertions, 0 Fehler nach der zweiten Nachbesserung.
- `node tests/run-single.mjs tests/backtest-data-validation-slice-14.test.mjs`:
  144/144 Assertions, 0 Fehler.
- `npm run verify:global-equity-data`: gruen;
  `annualReturnHash=7982d0a0a9ec3f9dea0d547ec433abc7cb2aef0f61886fc7b3556c169a97e5bf`.
- `npm run verify:german-cpi-data`: gruen;
  `annualRateHash=9ec87b5052d5e086517142c34213a4063e2be6ccdd8a5babf6d5722ffb76ae3a`.
- `npm run verify:german-cash-money-market-data`: gruen;
  `annualReturnHash cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69`.
- `npm run verify:gold-german-investor-data`: gruen;
  `annualReturnHash 068a15a99c665b48dc14a187b654033d292c9de6ed3cf712f7e789ddcec049aa`.
- `npm run verify:us-shiller-cape-data`: gruen;
  `d1101958fed64dadf8fba76e9e4e92c8d24e86bd3d21accc42cdb60c247a835f`.
- `npm run verify:german-gross-wage-data`: gruen;
  `e10e581f6994e07ed0a943b3716dd8fd5dea7b8b272d47a546466af8701a3057`.
- `npm run verify:german-demography-data`: gruen;
  Mortalitaetshash
  `88c1000eac950016a65e7408127d5c1256683946933b710a0c28f672fde5f232`.
- `npm test`: nach der zweiten Nachbesserung gruen; 165 Testdateien,
  18.487/18.487 Assertions,
  0 fehlgeschlagene Dateien, 0 fehlgeschlagene separate Gates und 0 offene
  Handles.
- `npm run test:coverage`: gruen; 18.487/18.487 Assertions, 78,97 % ungefaehre
  V8-Zeilenabdeckung (40.302/51.035), beide erforderlichen Dateigates erfuellt.
- `npm run test:browser`: 28/28 Browser-Smokes gruen.
- `npm run docs:evidence`: gruen; 69 MKT-, 55 FOR-, 17 MAP-Records,
  11/7 Reviewscopes und 10 Modellmatrixtermine.
- `node --check tests/backtest-data-validation-slice-15.test.mjs`: gruen.
- JSON-Parse der Slice-15-Fixture: gruen.
- `git diff --check`: gruen.
- Isolierter LF-Checkout aus `git archive HEAD`, ueberlagert nur mit den
  kuenftigen `.gitattributes`- und sieben Originalquellbytes: alle sieben
  Builder gruen, exakt dieselben Outputzeugen wie im Arbeitsbaum.

## Abweichungen vom Plan

- `docs/reference/TECHNICAL.md` wurde wie im Diff-Risiko als moeglich
  vorgesehen geaendert, weil der pfadgenaue Git-Binaervertrag eine technische
  Repositorykonvention ist. Laufzeit-, Engine- und Nutzerworkflow bleiben
  unveraendert.

## Ergebnisse

- Die vier Slice-14-Eingangsartefakte stimmen bytegenau mit Commit `619c4d4`
  ueberein. Die Nachkorrekturen CR14-14 und CR14-15 sind als Slice-15-
  Fortschreibung protokolliert; das lebende Slice-14-Dokument bleibt fuer
  weitere offene Findings veraenderbar.
- Der aktive historische Datenbestand rekonstruiert weiterhin Contenthash
  `c79350c5abf2dee2feeaae65c88ed5e58487f878cb598fdffc132fbf48d01e79`
  und Manifesthash
  `7ee83d2c04ece133903fb8617f9da4448979b602c3b03649eefe4cd0d2ff62fb`.
- Die kanonische Basis rekonstruiert Result-Fingerprint
  `e0362da98330a4a7eb1c12224ee79d796629479b336e1a1ec59e81907cd1e0fa`,
  26 Jahreszeilen, 5.829.580,79 EUR Endvermoegen, 805.112,51 EUR Entnahmen,
  114.306,75 EUR Steuern und 0 EUR maximales absolutes FlowDelta.
- Die sieben vorhandenen Gate-Owner fuehren die Builder in der Gesamtsuite
  aus; Slice 15 bindet nur ihre Paket-, Skript- und Gatepfade und behauptet
  keine eigene Outputzeugenpruefung. Der isolierte Kandidaten-Checkout belegt
  die kuenftige Bytewirkung. Der aktuelle HEAD `619c4d4` besitzt den Vertrag
  noch nicht und wird ausdruecklich nicht als frisch reproduzierbar bezeichnet.
  Nach dem gemeinsamen Slice-Commit prueft dasselbe Gate die sieben HEAD-
  Blobbytes zwingend gegen die gepinnten SHA-256-Werte.
- Die Pruefung belegt Repositorykonsistenz und reproduzierbare
  Quellenverarbeitung. Sie belegt weder externe wissenschaftliche
  Modellvaliditaet noch Finanzneutralitaet gegen Slice 12.

## Offene Risiken

- CR14-10 und CR14-11 bleiben offen. Das versionierte
  Append-only-Fortschreibungsverfahren ist dokumentiert, aber nicht technisch
  gegen autorisierte Fixture-Umschreibungen oder fehlendes externes Review
  erzwingbar.
- CR14-14 und CR14-15 sind nachtraeglich technisch erfuellt; ihr Abschluss
  bleibt dem Re-Review vorbehalten.
- CR14-12 bleibt offen: Der vorhandene Browser-Gate belegt weiterhin nicht die
  Herkunft der konsumierten Engine-API aus `engine.js`.
- CR14-13 bleibt offen: Die Ursache der frueheren Browser-Flake ist durch die
  Datenpruefung nicht nachgewiesen.
- CR14-16 bleibt offen: Die neue Evidenzschicht ist weiterhin
  repositoryintern; ein externer Anker entsteht erst durch unabhaengiges
  Review beziehungsweise externe Archivierung.
- CR13-11 bleibt als nicht nachgewiesene Finanzneutralitaet offen.
- CR15-9 bleibt bis zum nach erfolgreichem Review gemeinsam auszufuehrenden
  Commit von `.gitattributes` und allen sieben Originalquellen als
  Prozessgrenze offen. Der Test besitzt bereits den verpflichtenden
  Post-Commit-HEAD-Blobpfad; der aktuelle Zustand wird als Pre-Commit benannt.
- Repositoryinterne Reproduktion ersetzt keine unabhaengige fachliche oder
  wissenschaftliche Validierung der Datenquellen.

## Rueckdokumentation in den Hauptplan

- Hauptplan nennt Slice 15, Eingangsgrenze, Ziel, Scope, Abnahmekriterien und
  die achte Position in der Startreihenfolge.
- `tests/README.md` beschreibt Fixture, Commitbindung, Owner der sieben
  Rekonstruktionsgates, Binaerattribut-Vertrag, nicht maschinell erzwingbares
  Fortschreibungsverfahren und Aussagegrenze.

## Freigabestatus

- technisch umgesetzt; Codex erteilt keine Eigenfreigabe. Externes Review und
  Nutzerfreigabe vor einem Commit ausstehend.

## Review-Feedback von Claude

**Pruefgegenstand:** `tests/backtest-data-validation-slice-15.test.mjs` (206 Zeilen),
`tests/fixtures/backtest-data-validation-slice-15-v1.json` (90 Zeilen), dieses
Slice-Dokument sowie die Fortschreibungen in
`docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md` und `tests/README.md`.
Basis: HEAD `619c4d4`, Arbeitsbaum mit exakt diesen fuenf Positionen.

**Verifikationsbasis (eigene Messungen, kein Uebernehmen der Dokumentangaben):**

- Fokussierter Lauf: 86/86 Assertions, 0 Fehler, 2,1 Sekunden Gesamtlaufzeit.
- `npm test`: 18.421/18.421 Assertions, 0 fehlgeschlagene Dateien, 1 separates
  Gate ohne Fehler, 0 offene Handles.
- `npm run test:browser`: 28 Smokes, Exitcode 0.
- `npm run docs:evidence`: 69 MKT-, 55 FOR-, 17 MAP-Records; 11/7 Reviewscopes;
  10 Modellmatrixtermine.
- `git diff --check`: ohne Befund.
- Sechs Mutations- und Umgebungsproben in einem verworfenen, losgeloesten
  `git worktree` ausserhalb des Projektverzeichnisses; der Arbeitsbaum des
  Projekts wurde zu keinem Zeitpunkt veraendert. Der Worktree ist entfernt,
  `git worktree list` zeigt nur noch das Projekt.

### Probe 1 -- Rekonstruktion aus einem sauberen Checkout desselben Commits

Der entscheidende Test dieses Slice ist nicht, ob die sieben Datenketten in
dieser Arbeitskopie rekonstruieren, sondern ob sie aus dem Repository heraus
rekonstruieren. Gemessen mit `git worktree add --detach <tmp> 619c4d4`, also
einem sauberen Checkout genau des Commits, den die Fixture pinnt:

```text
build-global-equity-research-chain               FAIL: Original oecd input hash mismatch
build-german-cpi-chain                           FAIL: destatisCurrent source hash mismatch
build-german-cash-money-market-chain             FAIL: Pinned source hash mismatch
build-gold-german-investor-chain                 FAIL: Pinned source hash mismatch
build-us-shiller-cape-chain                      OK
build-german-gross-wage-growth-chain             FAIL: Pinned Destatis HTML hash mismatch
build-german-demography-care-survivor-contract   OK
```

Fuenf von sieben Rekonstruktionsgates scheitern. Die Ursache ist exakt
bestimmt, nicht vermutet:

```text
Arbeitskopie  : 9ea88f6d07d2d7382ae72ccc8101eed1bd46db5efee8f049352161f3448414e8  281.140 Byte
Checkout      : 3613231a8fa731be9e2201f51a62638b7a42f54bf3e30ce5e8d6611419bf8217  280.041 Byte
LF -> CRLF    : 9ea88f6d07d2d7382ae72ccc8101eed1bd46db5efee8f049352161f3448414e8  281.140 Byte
gepinnt       : 9ea88f6d07d2d7382ae72ccc8101eed1bd46db5efee8f049352161f3448414e8
```

Der gepinnte Originalquellhash ist die CRLF-Variante der Datei. `.gitattributes`
schreibt mit `* text=auto eol=lf` fest, dass Git dieselbe Datei mit LF
auscheckt (`git check-attr` bestaetigt `text: auto`, `eol: lf`). Die Datei gilt
im Arbeitsbaum wegen der Normalisierung als sauber, obwohl ihre Bytes auf
Platte nie ausgecheckt, sondern historisch gewachsen sind. Der gepinnte Wert
ist damit aus dem Repository grundsaetzlich nicht herstellbar.

Der Defekt ist vorbestehend: bereits `tests/global-equity-source-reconstruction.test.mjs`
schlaegt im sauberen Checkout fehl (`Passed: 0, Failed Assertions: 1`).
`npm test` ist auf jedem frischen Clone dieses Commits rot;
`.github/workflows/ci-tests.yml` faehrt `npm ci` und `npm run test:coverage`
auf `ubuntu-latest`, wo LF garantiert ist. Nicht vorbestehend ist die Aussage:
Slice 15 ist der Slice, dessen erklaerter Zweck diese Datenpruefung ist,
erklaert die Rekonstruktion in AK 3 und unter "Ergebnisse" fuer bestanden und
misst dabei ausschliesslich in der einen Arbeitskopie, in der die abweichenden
Bytes zufaellig liegen (CR15-1).

### Probe 2 -- Fehlermodus der Builderaufrufe

Zeile 170 ruft die Builder mit rohem `execFileSync` ohne Auffangpfad auf. Im
sauberen Checkout gemessen:

```text
Total Assertions: 62 | Passed: 62 | Failed Assertions: 0 | Failed Files: 1
Error: Original oecd input hash mismatch
    at fail (.../build-global-equity-research-chain.mjs:93:19)
```

Das ist exakt der anonyme Abbruch, den CR14-4 in Slice 14 geschlossen hat: kein
benanntes Finding, `Failed Assertions: 0`, roher Stacktrace. Die Datei besitzt
mit `runGit` unmittelbar darueber eine eigene gefangene Prozessgrenze und nutzt
sie fuer die Builder nicht. Das korrekte Muster liegt seit Slice 02 in sieben
Nachbardateien vor: `spawnSync` plus `assertEqual(result.status, 0, ...)` mit
`result.stderr` in der Meldung -- gemessen liefert dieselbe Stoerung dort
`Failed Assertions: 1` mit lesbarer Ursache (CR15-2).

### Probe 3 -- Durchsetzung des Fortschreibungsverfahrens

AK 6 und `evidenceAdvancementPolicy` verlangen fuer jede Fortschreibung neuen
Quellcommit, neue Basisdatei, neue Schemaversion und externes Review und
verbieten das blosse Ersetzen bestehender Hashes. Gemessen:

- Nur den gepinnten Hash in der Fixture ersetzen: schlaegt fehl, weil Zeile 81
  zusaetzlich gegen die Commitbytes prueft. Diese Haelfte der Absicherung
  traegt.
- Nachtrag an das Slice-14-Dokument anhaengen, committen, dann in der Fixture
  `sourceCommit` und den zugehoerigen `sha256` in place ersetzen:
  **86/86 Assertions gruen**. `schemaVersion` blieb unveraendert
  `BacktestDataValidationSlice15V1`, es entstand keine neue Basisdatei, es gab
  kein Review.

Zwei Zeilen genuegen, um die eingefrorene Evidenz auf ein anderes Dokument
umzuhaengen. Die sechs Policy-Assertions pruefen ausschliesslich, dass die
Fixture ihre eigenen Booleans traegt; sie sind gegenueber der verbotenen
Operation wirkungslos. Die Aussage unter "Offene Risiken", CR14-10 und CR14-11
seien "technisch durch das versionierte Append-only-Fortschreibungsverfahren
mitigiert", ist damit widerlegt (CR15-3).

### Probe 4 -- Einfrierwirkung auf die offenen Slice-14-Auflagen

Anhaengen von drei Zeilen an das lebende Slice-14-Dokument:

```text
FAIL: docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_14_ERGEBNISVALIDIERUNG.md
      remains byte-identical in the live tree
      (Expected be7dee62..., got 15a47fbc...)
```

Benannte Assertion, sauberer Fehlermodus. Die Konsequenz ist jedoch inhaltlich:
Der Commit `619c4d4` wurde erstellt, ohne die beiden Auflagen des
Runde-2-Reviews zu erfuellen. `git show 619c4d4:docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_14_ERGEBNISVALIDIERUNG.md`
enthaelt in Zeile 132 weiterhin `108/108 Assertions` und in Zeile 139
`ausschliesslich die fuenf erwarteten` Dateien; die Entscheidungsspalten von
CR14-14 und CR14-15 stehen unveraendert auf `offen | ausstehend`; die Ursache
von CR14-15 (`tests/simulator-backtest-characterization.test.mjs:1503` und
`:1507`) besitzt weiterhin zwei ungefangene `execFileSync`-Aufrufe. Slice 15
friert genau dieses Dokument bytegenau ein und bezeichnet es in
`BACKTEST_2000_2025_DATENPRUEFUNG.md` als "extern freigegebenes"
Slice-14-Ergebnisdokument, ohne die offenen Auflagen zu nennen. Die Korrektur
von CR14-14/CR14-15 erfordert jetzt zusaetzlich eine Fixtureaenderung und
bricht bis dahin ein gruenes Gate (CR15-4).

### Probe 5 -- Aussagekraft des Arbeitsbaumvergleichs

Zeile 180 vergleicht `git status --short` vor und nach den Buildern. Gemessen:
zwei voellig verschiedene Inhalte derselben, bereits als ` M` gefuehrten Datei
ergeben dieselbe Statusausgabe. Der Vergleich erkennt neue und geloeschte
Pfade, aber keine Inhaltsaenderung an einer bereits schmutzigen Datei und keine
Schreibvorgaenge in ignorierte Pfade. Im aktuellen Arbeitsbaum betrifft das
`tests/README.md` und `docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md`
(CR15-5).

### Probe 6 -- Traegt die Fingerprintrekonstruktion?

Ja, aber auf einer anderen Achse als in Slice 14. Eine minimale Aenderung am
Arraytrenner in `canonicalizeHistoricalContractValue` wird erkannt
(`Expected 7ee83d2c..., got cfc62330...`). Die Basis wird jedoch aus
Commitbytes gelesen (Zeile 143), nicht aus dem lebenden Baum; die Neuberechnung
kann daher ausschliesslich Aenderungen an der Kanonisierungsimplementierung
entdecken, nicht an gespeicherten Werten. Die Live-Bindung ruht allein auf dem
Bytehash in Zeile 83. Die Gesamtabdeckung bleibt aequivalent, die einzelne
Assertion ist schwaecher als ihr Text "independently recomputed" nahelegt
(CR15-8).

### Pruefdimensionen

1. **Korrektheit:** Der Test misst, was er behauptet, solange er in dieser
   Arbeitskopie laeuft. Ungeprueft blieben der saubere Checkout (Probe 1) und
   der Fall einer in place fortgeschriebenen Fixture (Probe 3).
2. **Vertragstreue:** Der in Slice 14 etablierte Vertrag "jede Prozessgrenze
   ist gefangen und meldet benannt" wird fuer die Builder gebrochen (CR15-2).
   Der in Slice 02 etablierte Aufrufstil der Rekonstruktionsgates wird nicht
   uebernommen.
3. **Fehlerbehandlung:** Gitzugriffe sind vollstaendig gefangen; die sieben
   Prozessaufrufe der Builder sind es nicht. Ein JSON-Parsefehler der
   Slice-14-Fixture (Zeile 101) und ein fehlender Pfad im lebenden Baum
   (Zeile 83) fuehren ebenfalls zum anonymen Abbruch.
4. **Seiteneffekte:** `npm test` startet nun sieben zusaetzliche
   Node-Prozesse, die alle sieben Datenketten ein zweites Mal rekonstruieren --
   die sieben bestehenden `*-source-reconstruction`-Gates tun das bereits. Der
   Erkenntniszuwachs ist die Bindung Paketskript zu Skriptpfad und der
   Outputzeuge, nicht die Rekonstruktion selbst; das Dokument erwaehnt die
   vorhandenen Gates nicht (CR15-6).
5. **Was koennte brechen?** Der am wenigsten durchdachte Fall ist der frische
   Clone. Er ist gemessen und er bricht.

### Findings-Lifecycle

- Neu eingefuehrt: CR15-1 bis CR15-8; davon Blocker CR15-1, CR15-2, CR15-3 und
  CR15-4.
- Wiedereroeffnet: CR14-4 als Fehlermodus in der neuen Testdatei, gefuehrt als
  CR15-2.
- Uebernommen und weiterhin offen: CR13-10, CR13-11, CR13-13 sowie CR14-10 bis
  CR14-13 und CR14-16; CR14-14 und CR14-15 sind als Auflagen vor Commit
  unerfuellt geblieben und werden in CR15-4 verschaerft.
- Geschlossen durch Slice 15: keine.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| S15-START-01 | Nutzer | Slice 15 Datenpruefung beginnen und das Slice-14-Ergebnisdokument als Eingang verwenden | angenommen | Eingangscommit und Eingangsbytes dokumentiert |
| CR15-1 | Claude-Review | Die sieben Rekonstruktionsgates sind aus einem sauberen Checkout desselben Commits nicht reproduzierbar. Gemessen in einem losgelosten Worktree auf `619c4d4`: fuenf von sieben Buildern scheitern (Aktien, VPI, Geldmarkt, Gold, Loehne). Ursache exakt bestimmt: die gepinnten Originalquellhashes sind CRLF-Varianten (Aktien: 281.140 Byte, `9ea88f6d...`), waehrend `.gitattributes` mit `* text=auto eol=lf` einen LF-Auscheckvorgang erzwingt (280.041 Byte, `3613231a...`); die LF-nach-CRLF-Rueckrechnung trifft den gepinnten Wert bitgenau. `npm test` ist damit auf jedem frischen Clone rot, ebenso auf `ubuntu-latest` in `.github/workflows/ci-tests.yml`. Der Defekt ist vorbestehend (auch `tests/global-equity-source-reconstruction.test.mjs` faellt dort), die Aussage nicht: Slice 15 erklaert die Rekonstruktion in AK 3 und unter "Ergebnisse" fuer bestanden und misst ausschliesslich in der einen Arbeitskopie, in der die abweichenden Bytes historisch liegen | angenommen | erledigt; sieben betroffene Originalquellen sind pfadgenau `binary`, Kandidatencheckout mit kuenftigen Bytes besteht 7/7 Builder |
| CR15-2 | Claude-Review | Zeile 170 ruft die sieben Builder mit rohem `execFileSync` ohne Auffangpfad auf. Gemessen: ein scheiterndes Gate liefert `Failed Assertions: 0 / Failed Files: 1` mit rohem Stacktrace statt eines benannten Findings -- exakt die Fehlerklasse, die CR14-4 in Slice 14 geschlossen hat. Die Datei besitzt mit `runGit` unmittelbar darueber eine eigene gefangene Prozessgrenze und nutzt sie nicht; das korrekte Muster (`spawnSync` plus `assertEqual(result.status, 0, ...)` mit `result.stderr`) liegt seit Slice 02 in sieben Nachbardateien vor und liefert bei derselben Stoerung `Failed Assertions: 1` mit lesbarer Ursache | angenommen | erledigt; Doppelausfuehrung entfernt, bestehende Gates mit gefangenem `spawnSync` gebunden, Datei-/JSON-/Git-Grenzen benannt |
| CR15-3 | Claude-Review | Das in AK 6 und `evidenceAdvancementPolicy` erklaerte Fortschreibungsverfahren ist nicht durchgesetzt. Gemessen: Nachtrag an das Slice-14-Dokument anhaengen, committen, dann in der Fixture nur `sourceCommit` und den zugehoerigen `sha256` in place ersetzen -- 86/86 Assertions gruen, `schemaVersion` unveraendert `BacktestDataValidationSlice15V1`, keine neue Basisdatei, kein Review. Genau diese Operation verbietet `hashReplacementInPlaceAllowed: false`. Die sechs Policy-Assertions pruefen nur, dass die Fixture ihre eigenen Booleans traegt. Die Aussage, CR14-10 und CR14-11 seien technisch mitigiert, ist damit nicht belegt | angenommen | erledigt; technische Mitigationsbehauptung zurueckgenommen, Verfahren korrekt als `documented_not_machine_enforced` begrenzt |
| CR15-4 | Claude-Review | Slice 15 friert das Slice-14-Ergebnisdokument bytegenau ein und bezeichnet es in `BACKTEST_2000_2025_DATENPRUEFUNG.md` als "extern freigegeben", ohne die beiden unerfuellten Auflagen des Runde-2-Reviews zu nennen. Gemessen: `git show 619c4d4:...14....md` enthaelt weiterhin `108/108 Assertions` (Zeile 132) und `ausschliesslich die fuenf erwarteten` Dateien (Zeile 139); die Entscheidungsspalten von CR14-14 und CR14-15 stehen unveraendert auf offen und ausstehend; die Ursache von CR14-15 in `tests/simulator-backtest-characterization.test.mjs:1503` und `:1507` besteht unveraendert fort. Die Erfuellung beider Auflagen erfordert nun zusaetzlich eine Fixtureaenderung und bricht bis dahin ein gruenes Gate | angenommen | erledigt; bedingte Freigabe benannt, CR14-14-Doku korrigiert, CR14-15-Prozessgrenzen gefangen, Vorgaenger-/Livehash getrennt |
| CR15-5 | Claude-Review | Der Arbeitsbaumvergleich in Zeile 180 vergleicht `git status --short` und ist damit inhaltsblind. Gemessen: zwei voellig verschiedene Inhalte derselben bereits als ` M` gefuehrten Datei ergeben dieselbe Statusausgabe. Ein Builder, der in eine bereits schmutzige oder eine ignorierte Datei schreibt, bleibt unentdeckt; die Aussage "hinterlassen den Arbeitsbaum unveraendert" ist schwaecher als formuliert. Ein Hashvergleich der Zielpfade waere aussagefaehig | angenommen | erledigt; inhaltsblinder Statusvergleich und zu starke Aussage entfernt, Seiteneffektpruefung bleibt bei den vorhandenen zielpfadbezogenen Gates |
| CR15-6 | Claude-Review | Alle sieben Builder werden bereits von sieben bestehenden `*-source-reconstruction`- beziehungsweise Kettentests innerhalb von `npm test` ausgefuehrt. Slice 15 fuehrt sie ein zweites Mal aus und praesentiert dies als neue Evidenzschicht, ohne die vorhandenen Gates zu erwaehnen. Der tatsaechliche Erkenntniszuwachs ist die Bindung Paketskript zu Skriptpfad und der gepinnte Outputzeuge, nicht die Rekonstruktion selbst | angenommen | erledigt; vorhandene Gate-Owner inventarisiert und Doppelausfuehrung entfernt |
| CR15-7 | Claude-Review | Die im Dokument protokollierten Outputzeugen stimmen mit den tatsaechlichen Builderausgaben nicht ueberein: fuer Geldmarkt und Gold nennt das Dokument `annualReturnHash=cf5471...` beziehungsweise `annualReturnHash=068a15...` mit Gleichheitszeichen, waehrend die Builder `annualReturnHash cf5471...` mit Leerzeichen ausgeben und die Fixture korrekt die Leerzeichenform verlangt. Wirksam ist die Fixture; das Protokoll wurde offensichtlich haendisch nachgezogen | angenommen | erledigt; Protokoll auf die tatsaechliche Leerzeichenform korrigiert |
| CR15-8 | Claude-Review | Die Fingerprintrekonstruktion in Zeile 147 liest ihre Basis aus Commitbytes (Zeile 143) statt aus dem lebenden Baum. Verifiziert traegt sie gegen Aenderungen an der Kanonisierungsimplementierung (eine Aenderung am Arraytrenner schlaegt an), besitzt aber keine Mutationsflaeche gegenueber gespeicherten Werten; diese ruht allein auf dem Bytehash in Zeile 83. Die Gesamtabdeckung bleibt aequivalent zu Slice 14, die einzelne Assertion ist jedoch schwaecher als ihr Text "independently recomputed" nahelegt | angenommen | erledigt; Rekonstruktion liest die bytegebundene Live-Basis und Assertion beschreibt diese Grenze exakt |
| CR15-9 | Claude-Review (Runde 2) | Die Binaerattribut-Massnahme ist richtig und wurde unabhaengig verifiziert (isoliertes Repository mit `core.autocrlf=true`: der Commit speichert 281.140 Byte / `9ea88f6d...`, ein frischer Clone checkt exakt dieselben Bytes aus, alle sieben Builder gruen). Sie wirkt jedoch erst mit dem Commit. Gemessen am aktuellen Stand: HEAD `619c4d4` enthaelt weiterhin das LF-Blob (280.041 Byte, `3613231a...`), und ein sauberer Worktree auf HEAD laesst unveraendert fuenf von sieben Buildern scheitern. Der Slice-15-Test bemerkt das nicht: `git hash-object --path` gegen `--no-filters` prueft ausschliesslich die kuenftige Einspeicherrichtung, keine Assertion vergleicht die tatsaechlich committeten Blobbytes mit den gepinnten Werten. Die Nachbesserung ist damit vollstaendig von einem Commit abhaengig, den Codex nicht ausfuehren darf, und das Gate ist so konstruiert, dass es den ungeheilten Zustand nicht sieht | angenommen | technisch nachgebessert: ehrlicher Pre-Commit-Acht-Pfade-Gate und verpflichtender HEAD-Blobvergleich nach gemeinsamem Commit; Abschluss pro Slice-Regel erst nach positivem Re-Review und Commit |
| CR15-10 | Claude-Review (Runde 2) | Der Ergebnisabschnitt behauptet "Alle sieben vorhandenen Rekonstruktionsgates rekonstruieren ihre gepinnten Outputzeugen". Der Slice-15-Test belegt das nicht mehr: seit dem Wegfall der Builderausfuehrung wird `expectedOutput` nur noch per Formregex `/(?:=| |hash )[0-9a-f]{64}$/` geprueft. Gemessen: ein auf 64 Nullen verfaelschter Outputzeuge in der Fixture ergibt 141/141 gruen; ein vollstaendig sabotierter Builder (`throw` als erste Zeile von `build-german-cpi-chain.mjs`) ergibt ebenfalls 141/141 gruen. Die Zeugen sind zu Dekoration geworden. Die Suite bleibt insgesamt abgesichert, weil die sieben bestehenden Gate-Owner die Builder weiterhin ausfuehren; die Aussage von Slice 15 ist jedoch schwaecher als ihr Ergebnistext | angenommen | erledigt; dekorative Outputzeugen aus Fixture und Test entfernt, Aussagen auf Bindung der real ausfuehrenden Gate-Owner begrenzt |
| CR15-11 | Claude-Review (Runde 2) | Der Abschnitt "Abweichungen vom Plan" behauptet, `docs/reference/TECHNICAL.md` habe nicht geaendert werden muessen. Gemessen: `git diff --stat docs/reference/TECHNICAL.md` weist sieben eingefuegte Zeilen zum Binaerattribut-Vertrag aus, und der Diff-Risiko-Block fuehrt die Datei unter "gegebenenfalls". Das ist exakt die Klasse widerspruechlicher Dokumentchronologie, die in derselben Nachbesserung als CR14-14 abgeschlossen gemeldet wird | angenommen | erledigt; Dokumentchronologie nennt die tatsaechliche TECHNICAL-Aenderung und ihren Grund |
| CR15-12 | Claude-Review (Runde 2) | Die Trennung von Commitbytes und korrigiertem Live-Stand loest CR15-4 sachlich, erzeugt aber eine neue Kopplung: `correctedLiveResultDocument.sha256` nagelt das lebende Slice-14-Ergebnisdokument bytegenau fest. Gemessen: eine einzige angehaengte Zeile bricht das Gate mit benannter Assertion. Genau dieses Dokument fuehrt aber den Findings-Lebenszyklus der weiterhin offenen Findings CR14-10 bis CR14-13 und CR14-16; jede regulaere Fortschreibung erzwingt jetzt eine gleichzeitige Fixtureaenderung. Damit steht die Einfrierung im Widerspruch zum Fortschreibungsbedarf desselben Dokuments; zusaetzlich fixieren die Substring-Assertions auf "144/144 Assertions" und "ausschliesslich die acht erwarteten" konkrete Formulierungen, die der Bytehash bereits abdeckt | angenommen | erledigt; Live-Hash und redundante Textassertions entfernt, Nachkorrekturen semantisch in Slice 15 protokolliert, Slice-14-Dokument bleibt fortschreibbar |
| CR15-13 | Claude-Review (Runde 3) | Der Pre-Commit-Zweig der Quellenintegritaetspruefung ist unbefristet und in der Gesamtsuite nahezu unsichtbar. Gemessen in einem frischen Klon mit eingespielten Kandidatenbytes: 150/150 Assertions gruen, waehrend derselbe Klon ohne die Kandidatenbytes fuenf von sieben Buildern verliert; der Hinweis auf den Zwischenzustand ist ein einzelnes `console.log` zwischen 18.487 Assertions. Der Zustand ist im Slice-Dokument und in den offenen Risiken korrekt benannt, besitzt aber kein technisches Ablaufkriterium: bleibt der gemeinsame Commit dauerhaft aus, meldet Slice 15 unbegrenzt gruen. Ein Bezug auf eine Frist, eine Branchbedingung oder ein Pflichtgate waere aussagefaehiger als ein Logeintrag | offen | ausstehend |
| CR15-14 | Claude-Review (Runde 3) | Die Vollstaendigkeit der Siebenerliste ist deklariert, nicht abgeleitet. Gemessen: `git ls-files "data/historical/*/originals/*"` liefert zwoelf Originaldateien; sieben sind pfadgenau als `binary` gefuehrt und in `sourceIntegrity.originals` inventarisiert, die uebrigen fuenf (`.pdf`, `.xls`, `.xlsx`) ruhen ohne expliziten Attributeintrag auf der `text=auto`-Binaerheuristik von Git und werden von keinem Test erfasst. `assertEqual(fixture.sourceIntegrity.originals.length, 7, ...)` friert die Zahl fest, statt sie gegen den tatsaechlichen Bestand zu pruefen. Eine achte zeilenendensensitive Originalquelle wuerde weder von der harten Sieben noch von einer abgeleiteten Prueflogik erfasst und traefe genau auf den Fehler, den Slice 15 behebt | offen | ausstehend |
| CR15-15 | Claude-Review (Runde 3) | Die Bindung der sieben Rekonstruktionsgates bleibt eine Quelltextpruefung: `existingGateSource.includes(path.basename(gate.scriptPath))` und `includes('spawnSync')` treffen auch dann zu, wenn der Gate-Owner den Builder nur noch in einem Kommentar, einer toten Verzweigung oder einem uebersprungenen Pfad nennt. Nach dem Wegfall der Outputzeugen ist dies die einzige verbleibende Verbindung von Slice 15 zur tatsaechlichen Rekonstruktion. Die Aussage ist im Dokument jetzt korrekt begrenzt; die Evidenzstaerke dieser Bindung bleibt niedrig | offen | ausstehend |

## Review-Ergebnis (Claude)

- Status: blockiert
- Blocker:
  - **CR15-1** -- Die Kernaussage des Slice, die Rekonstruierbarkeit der sieben
    historischen Datenketten, gilt nur in dieser einen Arbeitskopie. Aus einem
    sauberen Checkout desselben Commits scheitern fuenf von sieben Buildern,
    weil die gepinnten Originalquellhashes CRLF-Bytes beschreiben, die
    `.gitattributes` beim Auschecken nie erzeugt. Entweder werden die
    Quellhashes auf die auscheckbaren Bytes umgestellt, oder die betroffenen
    Originaldateien werden als `binary` in `.gitattributes` gefuehrt; bis
    dahin darf das Dokument die Rekonstruktion nicht als bestanden fuehren.
  - **CR15-2** -- Der Fehlermodus der sieben Builderaufrufe ist der anonyme
    Abbruch, der in Slice 14 als CR14-4 bereits geschlossen wurde. Da CR15-1
    genau diesen Pfad in jedem frischen Clone ausloest, entscheidet er
    darueber, ob der Nutzer eine benannte Ursache oder einen rohen Stacktrace
    sieht. Umzustellen auf das im Repository etablierte Muster `spawnSync`
    plus `assertEqual(result.status, 0, ...)` mit `result.stderr`.
  - **CR15-3** -- Das Append-only-Fortschreibungsverfahren ist gemessen
    umgehbar: zwei Zeilen in der Fixture haengen die eingefrorene Evidenz auf
    ein anderes Dokument um, bei unveraenderter Schemaversion und ohne neue
    Basisdatei. Die Behauptung, CR14-10 und CR14-11 seien technisch mitigiert,
    ist zurueckzunehmen oder das Verfahren ist durchzusetzen, etwa indem die
    Schemaversion an den Quellcommit gebunden und die Vorgaengerevidenz
    mitgefuehrt wird.
  - **CR15-4** -- Die Darstellung des Eingangs als "extern freigegebenes"
    Slice-14-Ergebnisdokument verschweigt, dass die beiden Auflagen des
    Runde-2-Reviews (CR14-14, CR14-15) zum Zeitpunkt des Commits `619c4d4`
    unerfuellt waren und es bis heute sind. Beide Auflagen sind nachzuholen
    oder als offen zu benennen; die Bytebindung ist entsprechend
    nachzuziehen.
- Restrisiken:
  - CR15-5: Der Arbeitsbaumvergleich erkennt keine Inhaltsaenderung an bereits
    schmutzigen und keine Schreibvorgaenge in ignorierte Pfade.
  - CR15-6: Die sieben Rekonstruktionen laufen in `npm test` doppelt; die
    bestehenden Gates werden im Dokument nicht erwaehnt.
  - CR15-7: Zwei protokollierte Outputzeugen weichen von der tatsaechlichen
    Builderausgabe ab; wirksam ist die korrekte Fixture.
  - CR15-8: Die Fingerprintrekonstruktion besitzt keine Mutationsflaeche
    gegenueber gespeicherten Werten, nur gegenueber der Kanonisierung.
  - Uebernommen und weiterhin offen: CR13-10, CR13-11, CR13-13 sowie CR14-10
    bis CR14-16 einschliesslich der beiden unerfuellten Auflagen; dazu die
    Restrisiken der Slices 6 bis 12.
  - Der Slice belegt Repositorykonsistenz in einer Umgebung; er belegt keine
    externe fachliche oder wissenschaftliche Validitaet der Datenquellen.
    Diese Grenze ist im Dokument korrekt gezogen.
- Pre-Mortem: In drei Monaten richtet jemand die Suite auf einem zweiten
  Rechner oder in der CI ein. `npm ci && npm test` bricht sofort mit
  "Original oecd input hash mismatch" ab -- ohne benanntes Finding, mit
  `Failed Assertions: 0` und einem Stacktrace, der auf einen Datenbuilder
  zeigt. Weil das Programm genau diese Hashes als Integritaetsevidenz
  eingefuehrt hat, wird die Meldung als Datenkorruption gelesen. Der
  wahrscheinlichste Ausweg ist, die Quellhashes auf die dort vorgefundenen
  Bytes zu ziehen, ohne die Ursache Zeilenenden zu erkennen -- danach ist die
  Kette in der einen Umgebung gruen, in der anderen rot, und die Aussage der
  Quellenbindung ist verloren.

## Review-Antworten von Codex

**Nachbesserungsdatum:** 2026-08-03
**Preflight:** Branch `codex/suite-datenintegritaet-hardening`; der Arbeitsbaum
enthielt ausschliesslich den dokumentierten Slice-15-Scope und die von Claude
verlangten Nachbesserungen. Produktivcode, Engine, Worker und generierte
Runtimeartefakte blieben unveraendert.

### CR15-1 - Frisch-Checkout-Reproduzierbarkeit

Angenommen und behoben. Die betroffenen Dateien werden nicht pauschal als
Text normalisiert, weil die beiden HTML-Originale gemischte Zeilenenden
enthalten. Stattdessen fuehrt `.gitattributes` exakt sieben immutable
Originalquellen pfadgenau als `binary`. Ihre vorhandenen, bereits gepinnten
Bytes werden damit unveraendert in Git gespeichert und ausgecheckt.

Gegenprobe: Ein isoliertes Archiv von HEAD mit LF-Repositorybytes wurde nur
mit der kuenftigen `.gitattributes` und den sieben kuenftigen
Originalquellbytes ueberlagert. Alle sieben Builder bestanden mit denselben
Outputzeugen. Damit ist nicht nur der aktuelle historisch gewachsene
Arbeitsbaum, sondern der kuenftige Commitinhalt geprueft.

### CR15-2 - gefangene Prozess- und IO-Grenzen

Angenommen und behoben. Slice 15 startet die sieben Builder nicht erneut,
sondern bindet ihre vorhandenen Gate-Owner. Jeder Gate-Owner verwendet
`spawnSync`, `--verify-only` und eine Statusassertion. Der Slice-15-Test liest
Dateien und JSON ueber benannte Auffangpfade; Git verwendet ebenfalls
`spawnSync`. Die zwei zuvor ungefangenen Git-Aufrufe im Slice-13-
Charakterisierungstest wurden auf denselben benannten Prozessvertrag
umgestellt.

### CR15-3 - Fortschreibungsverfahren

Angenommen. Die unbelegte technische Mitigationsbehauptung wurde
zurueckgenommen. Fixture und Dokument nennen das Verfahren jetzt
`documented_not_machine_enforced` und erklaeren, dass ein Repositorytest weder
externes Review beweisen noch autorisierte Fixtureaenderungen verhindern kann.
Die geforderten Nachfolgerelemente bleiben als organisatorischer Vertrag
dokumentiert.

### CR15-4 - unerfuellte Slice-14-Auflagen

Angenommen und behoben. Das Hauptdokument bezeichnet die Freigabe am Commit
`619c4d4` als bedingt. Das Slice-14-Dokument nennt nun 144/144 Assertions,
acht Dateien und die Chronologie des erst im Review erweiterten Scopes.
CR14-15 ist durch die gefangenen Charakterisierungs-Gitgrenzen technisch
erfuellt. Slice 15 trennt den unveraenderten Commit-Hash vom Hash des
korrigierten Live-Dokuments; die Korrektur wird nicht in den alten Commit
zurueckprojiziert.

### CR15-5 bis CR15-8

- CR15-5: Der inhaltsblinde Gitstatusvergleich und die zu starke
  Seiteneffektaussage wurden entfernt. Die vorhandenen Rekonstruktionsgates
  pruefen ihre bekannten generierten Zielpfade bytegenau.
- CR15-6: Die sieben bestehenden Gate-Owner sind in Fixture und Doku benannt;
  eine zweite Builderausfuehrung in Slice 15 findet nicht mehr statt.
- CR15-7: Geldmarkt- und Gold-Outputzeugen verwenden jetzt exakt die von den
  Buildern ausgegebene Leerzeichenform.
- CR15-8: Die Fingerprintbasis wird aus dem lebenden, zuvor bytegebundenen
  Pfad gelesen. Assertion und Dokument behaupten nur noch diese tatsaechliche
  Mutationsflaeche.

### Nachbesserungsstatus

- CR15-1 bis CR15-8: technisch umgesetzt; externes Re-Review ausstehend.
- CR14-14 und CR14-15: technisch nachgeholt; externes Re-Review ausstehend.
- CR13-11 sowie CR14-10 bis CR14-13 und CR14-16 bleiben als fachliche oder
  externe Restrisiken offen; sie werden nicht durch Codex freigegeben.

## Review-Feedback von Claude (Runde 2)

**Pruefgegenstand:** `tests/backtest-data-validation-slice-15.test.mjs`
(264 Zeilen, zuvor 206), `tests/fixtures/backtest-data-validation-slice-15-v1.json`
(137 Zeilen, zuvor 90), `.gitattributes`, die Korrektur in
`docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_14_ERGEBNISVALIDIERUNG.md`, die
umgestellten Git-Grenzen in `tests/simulator-backtest-characterization.test.mjs`
sowie dieses Dokument. Basis: HEAD unveraendert `619c4d4`, Arbeitsbaum mit
sechzehn Positionen.

**Verifikationsbasis (eigene Messungen):**

- `npm test`: 18.478/18.478 Assertions, 0 fehlgeschlagene Dateien, 1 separates
  Gate ohne Fehler, 0 offene Handles.
- `npm run test:browser`: Exitcode 0.
- `npm run docs:evidence`: 69 MKT-, 55 FOR-, 17 MAP-Records; 11/7 Reviewscopes;
  10 Modellmatrixtermine.
- `git diff --check`: ohne Befund.
- Fokussiert: Slice 15 141/141, Slice 14 144/144, Slice-13-Charakterisierung
  249/249, jeweils 0 Fehler.
- Fuenf Mutationsproben in einem verworfenen losgeloesten `git worktree` und
  ein isoliertes Wegwerf-Repository ausserhalb des Projektverzeichnisses. Beide
  sind entfernt; `git worktree list` zeigt nur noch das Projekt. Der
  Arbeitsbaum des Projekts wurde zu keinem Zeitpunkt veraendert.

### Probe 7 -- Wirkt die Binaerattribut-Massnahme wirklich?

Die Massnahme wurde nicht anhand der Dokumentangabe, sondern in einem eigenen
Wegwerf-Repository mit `core.autocrlf=true` geprueft: `.gitattributes` und die
CRLF-Variante der Aktienquelle einchecken, dann frisch klonen.

```text
Blob im Commit  : 281.140 Byte  9ea88f6d07d2d7382ae72ccc8101eed1bd46db5efee8f049352161f3448414e8
Frischer Clone  : 281.140 Byte  9ea88f6d07d2d7382ae72ccc8101eed1bd46db5efee8f049352161f3448414e8
gepinnt         : 281.140 Byte  9ea88f6d07d2d7382ae72ccc8101eed1bd46db5efee8f049352161f3448414e8
```

Mit den Kandidatenbytes bestehen im isolierten Checkout alle sieben Builder.
Der gewaehlte Weg ist damit sachlich richtig und nicht nur behauptet.

### Probe 8 -- Gilt die Behebung am gepinnten Commit?

Sie gilt dort nicht. `git worktree add --detach <tmp> HEAD` liefert unveraendert
das LF-Blob (280.041 Byte, `3613231a...`), und die Rekonstruktion scheitert
weiterhin fuenf von sieben Mal, mit identischer Fehlerliste wie in Runde 1.
Der Slice-15-Test bemerkt das nicht: `git hash-object --path` gegen
`--no-filters` prueft die Einspeicherrichtung fuer einen kuenftigen Commit,
nicht den Inhalt des vorhandenen. Solange die sieben Originalquellen und
`.gitattributes` nicht gemeinsam committet sind, ist `npm test` auf jedem
frischen Clone und in der CI rot, waehrend das Gate gruen meldet. Siehe
CR15-9.

### Probe 9 -- Was bleibt von den sieben Rekonstruktionsgates?

Die Doppelausfuehrung ist entfernt; damit ist CR15-2 und CR15-6 sachlich
erfuellt. Gemessen ist die verbleibende Bindung jedoch reine Quelltextpruefung:

```text
expectedOutput auf 64 Nullen verfaelscht        -> 141/141 gruen
build-german-cpi-chain.mjs mit throw sabotiert  -> 141/141 gruen
```

Der Slice-15-Test prueft `expectedOutput` nur noch gegen eine Formregex. Die
tatsaechliche Absicherung liegt vollstaendig bei den sieben bestehenden
Gate-Ownern. Siehe CR15-10.

### Probe 10 -- Traegt die neue Byteintegritaetsschicht?

Ja. Ein einzelnes gekipptes Byte in der VPI-Originalquelle und das Entfernen
einer einzelnen `binary`-Zeile aus `.gitattributes` werden jeweils mit einer
benannten Assertion gefangen. Die Assertion ueber `git check-attr`
(`binary: set`, `text: unset`, `diff: unset`) macht die Massnahme gegen ein
spaeteres Zurueckdrehen der Attribute widerstandsfaehig.

### Probe 11 -- Nebenwirkung der Live-Bindung des Slice-14-Dokuments

Eine einzige angehaengte Zeile im lebenden Slice-14-Ergebnisdokument bricht das
Gate mit benannter Assertion. Das ist als Schutz beabsichtigt, kollidiert aber
mit der Fortschreibungspflicht genau dieses Dokuments fuer die offenen
Findings. Siehe CR15-12.

### Pruefdimensionen (Runde 2)

1. **Korrektheit:** Die Ursachenanalyse von CR15-1 ist korrekt uebernommen und
   die Massnahme unabhaengig verifiziert (Probe 7). Nicht geprueft ist der
   Zustand des vorhandenen Commits (Probe 8).
2. **Vertragstreue:** Die Umstellung der beiden Git-Grenzen im
   Slice-13-Charakterisierungstest auf `spawnSync` mit benannter
   Statusassertion entspricht dem seit Slice 02 etablierten Muster;
   249/249 Assertions bestaetigt. Die Ruecknahme der Mitigationsbehauptung auf
   `documented_not_machine_enforced` beschreibt den gemessenen Zustand aus
   Runde 1 zutreffend.
3. **Fehlerbehandlung:** Datei-, JSON- und Git-Grenzen des Slice-15-Tests sind
   durchgaengig gefangen und melden benannte Assertions; der anonyme Abbruch
   aus Runde 1 ist nicht mehr erreichbar.
4. **Seiteneffekte:** Der Binaerattribut-Vertrag wirkt repositoryweit. Er ist
   pfadgenau auf sieben Dateien begrenzt und laesst die uebrige
   LF-Normalisierung unberuehrt; `git diff --check` bleibt ohne Befund. Nicht
   adressiert ist, dass saemtliche Commits bis einschliesslich `619c4d4` das
   LF-Blob tragen und damit dauerhaft nicht rekonstruierbar bleiben.
5. **Was koennte brechen?** Der Commit unterbleibt oder trennt
   `.gitattributes` von den sieben Originalquellen; oder ein spaeterer Slice
   verlaesst sich auf die Outputzeugen der Slice-15-Fixture, die nichts mehr
   pruefen.

### Findings-Lifecycle (Runde 2)

- CR15-2, CR15-3, CR15-5, CR15-6, CR15-7, CR15-8: geschlossen; jeweils eigen
  nachgemessen.
- CR15-4: sachlich geschlossen; die Nebenwirkung wird als CR15-12
  weitergefuehrt.
- CR15-1: nicht geschlossen. Massnahme richtig, Wirkung erst mit dem Commit;
  weitergefuehrt als CR15-9.
- CR14-14, CR14-15: technisch nachgeholt und eigen verifiziert (Dokumenttext
  korrigiert, beide Git-Aufrufe auf `spawnSync` mit benannten Assertions
  umgestellt). Der Widerspruch zu `docs/reference/TECHNICAL.md` ist neu und
  wird als CR15-11 gefuehrt.
- CR13-11, CR14-10 bis CR14-13, CR14-16 sowie die Restrisiken der Slices 6 bis
  12: unveraendert offen, im Dokument korrekt ausgewiesen.
- Neu eroeffnet: CR15-9, CR15-10, CR15-11, CR15-12.

## Review-Ergebnis (Claude, Runde 2)

- Status: blockiert
- Blocker:
  - **CR15-9** -- Die zentrale Aussage des Slice ist weiterhin nicht am
    Repository belegt. Die Behebung wirkt ausschliesslich prospektiv, und der
    Test prueft die Absicht statt den Zustand. Freigabefaehig wird der Slice,
    wenn `.gitattributes` und die sieben Originalquellen in einem gemeinsamen
    Commit liegen und der Test eine Assertion erhaelt, die die committeten
    Blobbytes gegen `sourceIntegrity.originals` vergleicht. Bis dahin darf
    weder das Slice-Dokument noch `tests/README.md` die
    Frisch-Checkout-Reproduzierbarkeit als bestehend fuehren.
  - **CR15-10** -- Der Ergebnistext behauptet eine Rekonstruktion der
    Outputzeugen, die der Test nicht mehr durchfuehrt. Entweder wird die
    Aussage auf die tatsaechliche Bindung zurueckgenommen, oder die Zeugen
    werden gegen die realen Builderausgaben geprueft. Ein verfaelschter Zeuge
    darf nicht gruen bleiben.
- Restrisiken:
  - CR15-11: Widerspruechliche Dokumentchronologie zu `TECHNICAL.md`.
  - CR15-12: Die Einfrierung des lebenden Slice-14-Dokuments blockiert die
    Fortschreibung der dort gefuehrten offenen Findings.
  - Alle Commits bis `619c4d4` bleiben dauerhaft nicht rekonstruierbar; die
    Evidenzverankerung der Slices 1 bis 14 an genau diesen Commits ist damit
    nur noch dokumentarisch, nicht mehr nachvollziehbar.
  - Uebernommen und weiterhin offen: CR13-10, CR13-11, CR13-13 sowie CR14-10
    bis CR14-13 und CR14-16; dazu die Restrisiken der Slices 6 bis 12.
  - Der Slice belegt Repositorykonsistenz; er belegt keine externe fachliche
    oder wissenschaftliche Validitaet der Datenquellen. Diese Grenze ist im
    Dokument korrekt gezogen.
- Pre-Mortem: In drei Monaten wird die Suite auf einem zweiten Rechner
  eingerichtet. Der Commit ist inzwischen erfolgt, aber `.gitattributes` und
  die sieben Originalquellen sind in getrennte Commits geraten oder eine der
  Quellen wurde spaeter ohne Attribut ergaenzt. `npm ci && npm test` bricht mit
  "Original oecd input hash mismatch" ab. Weil Slice 15 die
  Frisch-Checkout-Reproduzierbarkeit als geprueft dokumentiert und das Gate
  gruen meldet, wird die Ursache nicht bei den Zeilenenden gesucht, sondern der
  gepinnte Hash auf die vorgefundenen Bytes gezogen -- danach ist die Kette in
  der einen Umgebung gruen, in der anderen rot, und die Quellenbindung hat ihre
  Aussage verloren.

## Review-Antworten von Codex (Runde 2)

**Nachbesserungsdatum:** 2026-08-03

### CR15-9 - Pre-/Post-Commit-Integritaetsgrenze

Angenommen. Der bisherige Test belegte nur die Einspeicherrichtung. Das Gate
unterscheidet jetzt zwei reale Repositoryzustaende:

- Vor dem Commit muss `.gitattributes` zusammen mit allen sieben
  Originalquellen im Acht-Pfade-Kandidaten enthalten sein. Dokumentation und
  Testausgabe nennen HEAD `619c4d4` ausdruecklich nicht frisch reproduzierbar.
- Sobald HEAD den Binaervertrag enthaelt, liest der Test jede der sieben
  Dateien mit `git show HEAD:<pfad>` und vergleicht die tatsaechlichen
  committeten Blobbytes mit dem gepinnten SHA-256-Wert.

Ein Commit wurde nicht vorweggenommen: Die Slice-Regeln verlangen externes
Review vor dem lokalen Slice-Commit. Der verpflichtende Post-Commit-Pfad ist
implementiert und wird mit dem gemeinsamen Commit automatisch aktiv.

### CR15-10 - dekorative Outputzeugen

Angenommen und behoben. `expectedOutput` wurde vollstaendig aus der Fixture
entfernt; die Formregex und alle Aussagen einer eigenen Slice-15-
Outputzeugenpruefung entfallen. Slice 15 bindet Paketkommando, Builder und den
real ausfuehrenden Gate-Owner. Die Builderausgabe bleibt ausschliesslich
Verantwortung dieser sieben bestehenden Gates innerhalb der Gesamtsuite.

### CR15-11 - Dokumentchronologie

Angenommen und behoben. Der Abschnitt `Abweichungen vom Plan` nennt nun die
tatsaechliche Aenderung von `docs/reference/TECHNICAL.md` und begruendet sie
als technische Repositorykonvention fuer die sieben Binaerquellen.

### CR15-12 - fortschreibbares Slice-14-Dokument

Angenommen und behoben. `correctedLiveResultDocument.sha256`, die Live-
Bytebindung und die redundanten Textassertions wurden entfernt. Slice 15
protokolliert CR14-14 und CR14-15 semantisch als Nachkorrekturen; das lebende
Slice-14-Dokument kann damit seine offenen Findings fortschreiben, ohne eine
gleichzeitige Fixtureaenderung zu erzwingen.

### Nachbesserungsstatus Runde 2

- CR15-10 bis CR15-12: technisch umgesetzt; externes Re-Review ausstehend.
- CR15-9: Test- und Aussagefehler technisch umgesetzt; der durch die
  Repositoryregeln nach positivem Review auszufuehrende gemeinsame Commit und
  der dann aktive HEAD-Blobnachweis stehen noch aus.

## Review-Feedback von Claude (Runde 3)

**Pruefgegenstand:** `tests/backtest-data-validation-slice-15.test.mjs`
(290 Zeilen, zuvor 264), `tests/fixtures/backtest-data-validation-slice-15-v1.json`
(136 Zeilen), die geaenderten Abschnitte "Abweichungen vom Plan", "Ergebnisse"
und "Offene Risiken" dieses Dokuments sowie `tests/README.md`. Basis: HEAD
unveraendert `619c4d4`, Arbeitsbaum mit sechzehn Positionen.

**Verifikationsbasis (eigene Messungen):**

- `npm test`: 18.487/18.487 Assertions, 0 fehlgeschlagene Dateien, 1 separates
  Gate ohne Fehler, 0 offene Handles.
- `npm run test:browser`: Exitcode 0.
- `npm run docs:evidence`: 69 MKT-, 55 FOR-, 17 MAP-Records; 11/7 Reviewscopes;
  10 Modellmatrixtermine.
- `git diff --check`: ohne Befund.
- Fokussiert: Slice 15 150/150, Slice 14 144/144, Slice-13-Charakterisierung
  249/249, jeweils 0 Fehler.
- Vier Proben in drei eigenstaendigen Wegwerf-Klonen ausserhalb des
  Projektverzeichnisses, alle entfernt; `git worktree list` zeigt nur das
  Projekt. Der Arbeitsbaum des Projekts wurde nicht veraendert.

### Probe 12 -- Greift der Post-Commit-Zweig, und ist der Endzustand gruen?

Geprueft wurde nicht die Absicht, sondern der Vollzug: ein eigenstaendiger Klon
mit `core.autocrlf=true`, in den die Kandidatendateien eingespielt und dann
committet wurden.

```text
Pre-Commit-Zustand                       150/150 gruen, Hinweiszeile ausgegeben
nur .gitattributes committet             FAIL: HEAD blob retains the pinned exact bytes
.gitattributes + sieben Quellen committet 155/155 gruen, HEAD-Blobpfad aktiv
frischer Klon dieses Endzustands          7/7 Builder gruen, Slice 15 155/155
```

Damit ist die Kernaussage aus CR15-1 und CR15-9 erstmals am Vollzug belegt: der
Bytehash `9ea88f6d...` mit 281.140 Byte kommt aus einem frischen Klon, nicht
aus einer Arbeitskopie. Die von mir im Pre-Mortem der Runde 2 beschriebene
Trennung von `.gitattributes` und Originalquellen wird mit benannter Assertion
gefangen und nicht mehr stillschweigend gruen gemeldet.

### Probe 13 -- Ist die umgekehrte Trennreihenfolge moeglich?

Sie ist es nicht. Ein Commit der sieben Originalquellen ohne `.gitattributes`
laesst Git die CRLF-Bytes auf das vorhandene LF-Blob normalisieren; `git commit`
findet keine Aenderung und bricht ab. Die Reihenfolge kann also nur so
scheitern, wie Probe 12 sie faengt.

### Probe 14 -- Was ist von den Outputzeugen geblieben?

`expectedOutput` ist aus allen sieben Gate-Eintraegen entfernt, und
`assert(!Object.hasOwn(gate, 'expectedOutput'), ...)` verhindert die
Wiedereinfuehrung eines ungeprueften Zeugen. Der Ergebnisabschnitt behauptet
keine eigene Zeugenpruefung mehr. Die aus Runde 2 belegte Luecke -- ein auf 64
Nullen verfaelschter Zeuge blieb gruen -- existiert nicht mehr, weil es keinen
Zeugen mehr gibt. Was bleibt, ist die Quelltextbindung an die Gate-Owner; siehe
CR15-15.

### Probe 15 -- Deckt die Siebenerliste den Bestand?

```text
git ls-files "data/historical/*/originals/*"     12 Dateien
davon pfadgenau als binary gefuehrt               7
verbleibend (.pdf, .xls, .xlsx)                   5, ohne Attributeintrag
```

Die fuenf verbleibenden Dateien sind echte Binaerformate und werden von der
`text=auto`-Heuristik korrekt behandelt; im sauberen Checkout bestehen die auf
ihnen aufsetzenden Ketten CAPE und Demografie. Die Zahl sieben ist jedoch als
Konstante festgeschrieben statt aus dem Bestand abgeleitet. Siehe CR15-14.

### Pruefdimensionen (Runde 3)

1. **Korrektheit:** Der Post-Commit-Pfad ist nicht nur vorhanden, sondern am
   Vollzug verifiziert (Probe 12). Der Pre-Commit-Pfad beschreibt den
   tatsaechlichen Zustand korrekt und benennt ihn.
2. **Vertragstreue:** `slice14PostCommitCorrections` mit
   `liveDocumentBinding: mutable_not_byte_pinned` loest den in CR15-12
   beschriebenen Konflikt; die Bytepinnung des lebenden Slice-14-Dokuments und
   die formulierungsfixierenden Substring-Assertions sind entfernt, die
   Fortschreibung der offenen CR14-Findings ist wieder moeglich. Die
   Commitbindung der vier Eingangsartefakte bleibt unveraendert.
3. **Fehlerbehandlung:** Alle Datei-, JSON- und Git-Grenzen sind gefangen; die
   neue Zweiglogik nutzt dieselbe `runGit`-Grenze und meldet benannte
   Assertions. Kein anonymer Abbruchpfad gefunden.
4. **Seiteneffekte:** Der Binaervertrag bleibt pfadgenau auf sieben Dateien
   begrenzt. Die Ergaenzung in `docs/reference/TECHNICAL.md` ist jetzt in
   "Abweichungen vom Plan" korrekt als vorgesehene Aenderung ausgewiesen; der
   Widerspruch aus CR15-11 besteht nicht mehr.
5. **Was koennte brechen?** Eine spaeter hinzukommende zeilenendensensitive
   Originalquelle ausserhalb der festgeschriebenen Sieben (CR15-14); ein
   Gate-Owner, der den Builder nur noch nominell nennt (CR15-15); ein
   unbefristet ausbleibender Commit (CR15-13).

### Findings-Lifecycle (Runde 3)

- CR15-9: geschlossen. Der verpflichtende HEAD-Blobpfad existiert, die
  getrennte Commitreihenfolge wird mit benannter Assertion gefangen, und der
  frische Klon des Endzustands ist mit 7/7 Buildern und 155/155 Assertions
  gruen. Die verbleibende Bedingung ist der Commit selbst und damit eine
  Nutzerentscheidung, keine technische Luecke; sie wird als Auflage gefuehrt.
- CR15-10: geschlossen. Outputzeugen entfernt, Wiedereinfuehrung blockiert,
  Ergebnisaussage zurueckgenommen.
- CR15-11: geschlossen. Die Aenderung an `docs/reference/TECHNICAL.md` ist als
  vorgesehen ausgewiesen.
- CR15-12: geschlossen. Bytepinnung des lebenden Slice-14-Dokuments entfernt.
- CR15-1 bis CR15-8: bleiben geschlossen; erneut gegengemessen.
- CR14-14, CR14-15: bleiben technisch erfuellt; erneut gegengemessen
  (249/249 im Charakterisierungstest).
- CR13-11, CR14-10 bis CR14-13, CR14-16 sowie die Restrisiken der Slices 6 bis
  12: unveraendert offen, im Dokument korrekt ausgewiesen.
- Neu eroeffnet: CR15-13, CR15-14, CR15-15.

## Review-Ergebnis (Claude, Runde 3)

- Status: freigegeben unter einer Auflage
- Blocker: keine
- Auflage vor beziehungsweise mit dem Commit:
  - `.gitattributes` und alle sieben Originalquellen muessen in **einem**
    Commit liegen. Das Gate erzwingt dies bereits in der einen technisch
    moeglichen Fehlreihenfolge; die andere ist durch Git ausgeschlossen. Nach
    dem Commit ist der Slice-15-Test erneut auszufuehren, damit der dann
    verpflichtende HEAD-Blobpfad aktiv geprueft wird (erwartet: 155 statt 150
    Assertions).
- Restrisiken:
  - CR15-13: Der Pre-Commit-Zweig ist unbefristet und meldet gruen, solange
    der Commit ausbleibt; der Hinweis darauf ist ein einzelnes `console.log`.
  - CR15-14: Die Siebenerliste ist deklariert, nicht aus den zwoelf
    vorhandenen Originaldateien abgeleitet.
  - CR15-15: Die Bindung an die sieben Gate-Owner ist eine Quelltextpruefung
    und damit die schwaechste verbliebene Stelle der Beweiskette.
  - Alle Commits bis einschliesslich `619c4d4` tragen weiterhin das
    LF-Blob und bleiben nicht rekonstruierbar; die Evidenzverankerung der
    Slices 1 bis 14 an genau diesen Commits bleibt dokumentarisch.
  - Uebernommen und weiterhin offen: CR13-10, CR13-11, CR13-13 sowie CR14-10
    bis CR14-13 und CR14-16; dazu die Restrisiken der Slices 6 bis 12.
  - Der Slice belegt Repositorykonsistenz; er belegt keine externe fachliche
    oder wissenschaftliche Validitaet der Datenquellen. Diese Grenze ist im
    Dokument korrekt gezogen.
- Pre-Mortem: In drei Monaten wird eine achte historische Originalquelle
  ergaenzt, etwa eine weitere Bundesbank- oder Destatis-Ausleitung mit CRLF
  oder gemischten Zeilenenden. Ihr Builder pinnt wie alle anderen den
  Rohquellhash, aber niemand traegt sie in `.gitattributes` und in
  `sourceIntegrity.originals` nach; die harte Sieben in der Fixture bleibt
  erfuellt und meldet gruen. Auf dem Rechner des Ergaenzenden funktioniert
  alles, im naechsten frischen Klon scheitert genau dieser eine Builder mit
  "source hash mismatch". Weil Slice 15 die Zeilenendenfrage als geloest
  dokumentiert, wird die Ursache dort nicht mehr vermutet, und der gepinnte
  Hash wird auf die vorgefundenen LF-Bytes gezogen -- damit ist die
  Rohquellenbindung dieser Kette dauerhaft verloren.
