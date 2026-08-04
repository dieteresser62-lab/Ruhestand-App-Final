# Slice 06 - CAPE sowie Lohn-/Rentenfortschreibungsreihe

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Entscheidung:** dauerhafte Nutzerentscheidung vom 2026-07-29 fuer
Slice 02 bis 13; kein neuer Feature-Branch  
**GitHub-Status:** Remote `origin` ist vorhanden; fuer den aktiven Branch ist
kein Upstream konfiguriert  
**Basiscommit:** `a7038e5`  
**Status:** durch Claude in Runde 3 technisch freigegeben; lokaler Commit
`02f39f9`
**Freigabe:** technischer Stand freigegeben; Programmfreigabe bleibt
Nutzerentscheidung

## Input aus dem Ergebnisdokument von Slice 05

Das vollstaendige Ergebnisdokument
`SLICE_BACKTEST_DATENPRUEFUNG_05_GOLD_DEUTSCHE_ANLEGERWAEHRUNG.md`
ist die verbindliche Eingangsgrenze. Slice 05 ist durch Claudes Zweitreview
vom 2026-08-01 freigegeben und als lokaler Commit `a7038e5` vorhanden.

Vor der eigentlichen CAPE-/Lohnarbeit werden die beiden ausdruecklichen
Auflagen des Slice-05-Reviews geschlossen:

- **CR05-8:** Fuer die Goldkette wird ein unabhaengiger Inhaltsoracle ueber
  alle 101 Jahre eingerichtet. Er rekonstruiert die Werte aus den gepinnten
  Quellbytes mit eigenem Parser und eigener Formel, statt nur Generatorhashes
  oder sechs Markerjahre zu vergleichen. Die Auflage wird als Muster fuer die
  neuen CAPE- und Lohnketten uebernommen: vollstaendige Quellrekonstruktion und
  Generator-Verify sind getrennte Gates.
- **CR05-15:** Der Monte-Carlo-Messvertrag weist explizit aus, dass der
  Slice-05-Kandidat keinen goldhaltigen Golden Case enthaelt und deshalb keine
  Goldwirkung misst. Der unzutreffende pauschale Wirkungsclaim im Ledger wird
  ersetzt, und `capturedAtUtc` wird auf den tatsaechlichen Messzeitpunkt des
  Korrekturstands gesetzt. Eine Promotion bleibt ausgeschlossen.

Verbindliche Fingerprints aus Slice 05:

- Inventar-/Manifestrevision `2026-08-01.1`;
- Dataset-Hash
  `e2ee9db77d02cca23ca451e16ed16b565de44411807c550e49f415e7bed45d0a`;
- Gold-Returnhash
  `068a15a99c665b48dc14a187b654033d292c9de6ed3cf712f7e789ddcec049aa`;
- Gold-Methodenhash
  `c81c8314ee281cace26bbd69f502d0de22106e34aa3b1bf74739555cf9c9f86e`;
- Cash-Returnhash
  `cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69`;
- Monte-Carlo-Datenversion `annualDataHash f7767289`,
  `regimeHash 7d37583a`;
- `portfolio_flow_delta` blieb in allen Slice-05-Referenzfaellen null.

Die offenen Slice-05-Restrisiken CR05-5, CR05-9, CR05-10, CR05-12,
CR05-14 und CR05-16 sowie uebernommene Alt-Risiken werden nicht still als
CAPE-/Lohn-Scope umgedeutet. CR05-8 und CR05-15 sind dagegen ausdrueckliche
Auflagen vor Slice 06 und daher Vorgates dieses Slice.

## Preflight vor Coding

**Gemessen am:** 2026-08-01  
**Aktiver Branch:** `codex/suite-datenintegritaet-hardening`  
**HEAD:** `a7038e5 feat(simulator): implement slice 05 gold return german investor currency chain`  
**Arbeitsbaum:** sauber (`git status --short` ohne Ausgabe)  
**Unerwartete Dateien:** keine  
**Branchstatus:** kein Upstream konfiguriert; die dokumentierte dauerhafte
Nutzerentscheidung erlaubt die lokale Fortsetzung auf diesem Branch

## Diff-Risiko

Geplante produktive Programm- und Konfigurationsdateien:

- `app/simulator/us-shiller-cape-chain.js` (generiert, neu);
- `app/simulator/german-gross-wage-growth-chain.js` (generiert, neu);
- `app/simulator/simulator-data.js`;
- `app/simulator/simulation-data-inventory.js`;
- `app/simulator/historical-backtest-contract.js`;
- `scripts/build-us-shiller-cape-chain.mjs` (neu);
- `scripts/build-german-gross-wage-growth-chain.mjs` (neu);
- `scripts/lib/biff8-numeric-sheet.mjs` (neu, gemeinsamer read-only
  OLE-/BIFF8-Quellparser);
- `package.json`.

Geplante Tests, Fixtures, Daten und Dokumentation:

- gepinnte CAPE- und Destatis-Lohnquellen mit Hash-/Lizenzgrenzen;
- unabhängige Vollrekonstruktion der Gold-, CAPE- und Lohnwerte;
- Generator-, Manifest-, Inventar- und Zeitvertrags-Tests;
- isolierte CAPE-Invarianz bei deaktivierter VPW-/CAPE-Policy;
- lohngekoppelter Renten-Witness mit erklaertem Vorher-/Nachher-Delta;
- Backtest-Charakterisierung, Monte-Carlo-Messvertrag und Delta-Ledger;
- Dokumentations-Sync in Hauptplan, Datenquellen, Technik,
  Simulator-Modulreferenz, Testreferenz und README.

Voraussichtliche Aenderungstiefe:

- **hoch** fuer historische und Monte-Carlo-Fingerprints, weil zwei bislang
  unaufgeloeste Reihen ersetzt und die CAPE-Zeitachse korrigiert werden;
- **mittel** fuer Backtests mit lohngekoppelter Rente oder aktiver
  VPW-/CAPE-Policy;
- **klein** fuer fachliche Ergebnisse bei deaktivierter VPW-/CAPE-Policy;
  dort duerfen nur die exakt inventarisierten Provenienz-, Diagnose- und
  in diesem Szenario inaktiven VPW-CAPE-Eingangsfelder wechseln.

Gefaehrdete bestehende Tests:

- historische Manifest-, Inventar- und Zeitvertragsgates;
- Backtest-Charakterisierung und Golden Fixtures;
- Monte-Carlo-Messvertrag, CAPE-Sampling und Worker-Paritaet;
- lohngekoppelte Rentenpfade und Ergebnisexports.

Nicht anfassen:

- Rentenfortschreibungsformel und Moduswahl;
- VPW-/CAPE-Policyformeln und deren Schwellen;
- Engine-, Steuer-, Runway-, Mindest-Flex-, Gold- und
  Transaktionssemantik;
- `minimumFlexAnnual` und seine Parameternamen;
- `engine.js`, `dist/` und `RuheStandSuite.exe`;
- unveraenderliche historische Eingangsfixtures.

Rollback-Strategie:

- geaenderte versionierte Dateien gezielt mit
  `git checkout -- <datei...>` auf Basiscommit `a7038e5` zuruecksetzen;
- neu angelegte Dateien nur nach ausdruecklicher Freigabe entfernen;
- keine Hard-Resets oder sonstigen destruktiven Git-Kommandos.

Die neun produktiven Programm-/Konfigurationsdateien bleiben unter
der Stop-Grenze von mehr als zehn Dateien. Der Diff-Risiko-Block loest damit
keine Stop-Regel aus. Eine elfte produktive Datei stoppt die Umsetzung.

## Ziel

`cape` wird als klar bezeichnetes US-Shiller-CAPE-Entscheidungssignal mit
belegter Quelle, Region, Einheit und Beobachtungszeitpunkt gefuehrt. Fuer das
Returnjahr `t` wird genau die vor Jahresbeginn bekannte Beobachtung aus
`t-1` verwendet; der bisherige doppelte Jahresversatz ist ausgeschlossen.

`lohn_de` wird zu einer belegten deutschen nominalen
Bruttomonatsverdienst-Proxykette. Die vom Nutzer bestaetigte funktionale
Verwendung zur Fortschreibung lohngekoppelter Renten bleibt bestehen, aber
Metadaten und Export behaupten ausdruecklich **keine** historische gesetzliche
Rentenanpassungsreihe.

## Vorgesehener Reihenvertrag

### CAPE

- Region: US-Aktienmarkt;
- Variante: Robert Shillers konventionelles CAPE, nicht Total-Return-CAPE;
- Einheit: dimensionsloses Verhaeltnis;
- Quelle: monatliche Shiller-`ie_data`-Reihe;
- Zuordnung: Returnjahr `t` verwendet die letzte vollstaendige monatliche
  Beobachtung des Kalenderjahres `t-1` als Entscheidungssignal;
- Export: `observationYear`, `observationMonth`, `asOfYear` und
  `decisionYear` bleiben getrennt nachvollziehbar;
- keine globale oder deutsche CAPE-Interpretation.

### Lohn-/Rentenfortschreibungsproxy

- Region: Deutschland gemaess der jeweiligen Destatis-Gebiets-/Methodenlage;
- Variante: Index der durchschnittlichen Bruttomonatsverdienste ohne
  Sonderzahlungen;
- Einheit: prozentuale Veraenderung gegenueber dem Vorjahr;
- Quelle: Destatis-Langreihe;
- Zuordnung: Veraenderung des Berichtsjahres `t` wird einmal in Jahr `t` auf
  eine im Modus `wage` fortgeschriebene Rente angewandt;
- fruehe Jahre bleiben als JST-R6-Forschungsproxy segmentiert, nicht als
  amtliche Destatis-Beobachtung;
- keine Gleichsetzung mit gesetzlicher Rentenanpassung, aktuellem Rentenwert,
  Nominallohnindex inklusive Sonderzahlungen oder individueller
  Rentenmitteilung.

## Scope

- Schliessung der Slice-05-Auflagen CR05-8 und CR05-15 als Vorgates;
- gepinnte Quellen, Hashes, Abrufstand und Nutzungs-/Lizenzgrenzen;
- reproduzierbare, schreibfrei verifizierbare CAPE- und Lohnketten;
- generierte, tief eingefrorene Datenmodule fuer 1925-2025;
- Projektion von `cape` und `lohn_de` ausschliesslich aus den generierten
  Modulen;
- CAPE-Beobachtungsjahr `t-1` und Entscheidungsjahr `t` im Record/Export;
- Manifest-, Inventar- und Runtime-Provenienz mit einheitlichen Wertehashes;
- vollstaendige, unabhaengige Quellenrekonstruktion;
- Vorher-/Nachher-Deltas fuer CAPE-inaktive und lohnaktive Referenzfaelle;
- neuer, weiterhin `pending` bleibender Monte-Carlo-Kandidat;
- Dokumentations-Sync.

## Nicht im Scope

- Aenderung der Rentenfortschreibungsformel oder UI-Modi;
- Umstellung von `wage` auf eine amtliche Rentenanpassungsreihe;
- Nachbildung historischer Rentenformeln, Ost-/West-Rentenwerte,
  Schutzklauseln oder Nachhaltigkeitsfaktoren;
- Aenderung von CAPE-Policy, CAPE-to-Return-Kurve, Samplingpraezedenz oder
  Toleranz;
- Austausch weiterer historischer Reihen;
- Engine-Bundle, Release-Sync oder EXE-Build.

## Akzeptanzkriterien

1. CR05-8 ist fuer die Goldkette durch einen unabhaengigen 101-Jahres-
   Inhaltsoracle geschlossen; CAPE und Lohn besitzen denselben getrennten
   Quellenoracle-/Generatorvertrag.
2. CR05-15 ist geschlossen: der Monte-Carlo-Kandidat nennt fehlende Gold-,
   CAPE-Sampling- und lohnindexierte Messpopulationen wahrheitsgetreu, der
   Ledger behauptet keine ungemessene Wirkung und `capturedAtUtc` entsteht
   beim tatsaechlichen Erzeugungslauf.
3. CAPE-Quelle, konventionelle Variante, US-Region, Einheit, monatlicher
   Beobachtungszeitpunkt und Entscheidungszuordnung sind maschinenlesbar.
4. Fuer Returnjahr `t` stammt das CAPE-Signal genau aus `t-1`; es gibt weder
   Look-ahead noch einen zweiten `t-1`-Versatz.
5. Der Export dokumentiert mindestens Beobachtungsjahr, As-of-Jahr und
   Entscheidungsjahr des CAPE-Signals getrennt.
6. `lohn_de` besitzt eine belegte Reihenidentitaet und Jahreskonvention. Die
   Bezeichnung macht klar, dass es sich um einen nominalen
   Bruttomonatsverdienst-Proxy ohne Sonderzahlungen und nicht um eine
   tatsaechliche gesetzliche Rentenanpassungsreihe handelt.
7. Fruehe Lohnwerte sind explizit als JST-R6-Forschungsproxy segmentiert;
   kein fehlender Wert wird still als 0 oder als amtlicher Wert projiziert.
8. Die vom Nutzer bestaetigte funktionale Verwendung bleibt unveraendert:
   `rentAdjMode=wage` verwendet den Jahreswert einmal, andere Modi bleiben
   unbeeinflusst.
9. Bei deaktivierter VPW-/CAPE-Policy veraendert eine isolierte
   CAPE-Datenkorrektur weder Outcome noch Finanzmetriken. Die vollstaendige
   Blattfelddifferenz ist auf eine exakte Allowlist aus Provenienz,
   Entscheidungssignal und den in diesem Szenario inaktiven
   VPW-CAPE-Eingangsfeldern
   `capeRatioUsed` und `expectedReturnCape` begrenzt.
10. Ein lohngekoppelter Referenzlauf besitzt erklaerte Vorher-/Nachher-Deltas;
    Outcome und `portfolio_flow_delta` bleiben erklaert und unauffaellig.
11. Manifest, Inventar und Runtime tragen dieselben generierten CAPE- und
    Lohnwertehashes.
12. Ein neuer Monte-Carlo-Kandidat bleibt `pending`; Codex veraendert oder
    promoviert keine unveraenderliche Eingangsfixture.
13. Alle Quellen-Verify-Gates und `npm test` sind vollstaendig gruen; Codex
    erteilt keine Selbstfreigabe.

## Stop-Regeln

Der Slice stoppt vor weiterer Umsetzung, wenn:

- Quelle, Nutzungsgrenze oder gepinnter Hash nicht reproduzierbar ist;
- CAPE-Monats-/Jahreskonvention keine eindeutige `t-1`-Entscheidungszuordnung
  erlaubt;
- ein CAPE- oder Lohnjahr nicht eindeutig klassifiziert werden kann;
- mehr als zehn produktive Programm-/Konfigurationsdateien erforderlich sind;
- Rentenfortschreibungs-, VPW-/CAPE-Policy- oder Engine-Semantik geaendert
  werden muesste;
- CAPE-inaktive Referenzfaelle fachlich abweichen;
- Outcomes unerwartet wechseln, `FlowDelta` auffaellig wird oder Tests nicht
  sinnvoll ausfuehrbar sind;
- UI und Engine unterschiedliche Parameternamen verwenden;
- `minimumFlexAnnual` irgendwo still begrenzt statt validiert wird.

## Geplante Tests

- Gold-Volloracle ueber 101 Jahre mit unabhaengigem Parser und Formeln;
- CR05-15-Ledger-/Messzeit-/Populationstest;
- CAPE-Generator-Build und schreibfreies Verify-Gate;
- unabhaengige CAPE-Vollrekonstruktion aus der gepinnten Monatsquelle;
- Lohn-Generator-Build und schreibfreies Verify-Gate;
- unabhaengige Lohn-Vollrekonstruktion aus der gepinnten Destatis-Quelle;
- lueckenlose 1925-2025-Abdeckung, Freeze, Segment- und Wertehashgates;
- CAPE-Marker mindestens 1925, 1929, 1932, 1999, 2008, 2009, 2024 und 2025;
- Lohnmarker mindestens 1946/1947, 1950, 1991, 2000, 2009, 2020, 2024 und
  2025;
- expliziter CAPE-Zeitvertrag im `HistoricalYearRecordV1`;
- CAPE-inaktiver Invarianzfall und lohnaktiver Backtestdelta-Witness;
- Manifest-, Inventar-, Charakterisierungs-, Monte-Carlo- und
  Suite-Traceability-Gates;
- abschliessend alle Quellen-Verify-Gates, `npm test`, gegebenenfalls
  `npm run test:browser`, Coverage und `git diff --check`.

## Ergebnisse

### Quellen- und Datenketten

- Die gepinnte Shiller-Arbeitsmappe besitzt den Rohdatenhash
  `0e3d716f83f51c14f40c5ab5662e767cde4f83fcb7305db24ab003df2c9ee6c5`.
  `UsShillerCapeDecisionChainV1` enthaelt 101 konventionelle US-Price-CAPE-
  Signale fuer 1925-2025; Wertehash
  `d1101958fed64dadf8fba76e9e4e92c8d24e86bd3d21accc42cdb60c247a835f`.
  Returnjahr `t` verwendet genau die Dezemberbeobachtung `t-1` und exportiert
  Beobachtungsjahr/-monat, As-of-Jahr und Entscheidungsjahr getrennt.
- Die gepinnte Destatis-Seite besitzt den Rohdatenhash
  `1f62492a2efe78fba3ec2ac81dfd90a1c4ccd6f8b68b7bcc6c53ae4d8cd51f1a`.
  Zusammen mit der bereits gepinnten JST-R6-Datei erzeugt
  `GermanGrossWageGrowthChainV2` fuer 1925-1946 levelabgeleitete
  `DEU.wage`-Veraenderungen und fuer 1947-2025 die publizierten Veraenderungen
  des Bruttomonatsverdienstindex ohne Sonderzahlungen; kombinierter
  Eingabehash `cfd5c598a8bc846a96966fa8ff7388d80c30f3ada39edbfe90d39f234eef9d9b`,
  Wertehash
  `e10e581f6994e07ed0a943b3716dd8fd5dea7b8b272d47a546466af8701a3057`.
  Die Runtimebezeichnung bleibt Rentenfortschreibungsproxy und behauptet
  keine gesetzliche Rentenanpassungsreihe. Der Methodenvertrag markiert 1925
  als Startnormalisierung, 1945 als geschaetzte Kriegs-/Nachkriegsbruecke ohne
  Marktlohnbeobachtung, 1947 als JST-/Destatis-Quellennaht und 1948 als
  Waehrungsreformkontext.
- `simulator-data.js` enthaelt fuer `cape` und `lohn_de` keine numerischen
  Jahresliterale mehr. Manifest und Inventar tragen Revision `2026-08-01.4`
  sowie Dataset-Hash
  `c79350c5abf2dee2feeaae65c88ed5e58487f878cb598fdffc132fbf48d01e79`.
  Alle sechs historischen Reihen haben aufgeloeste Quellen- und Lizenz- oder
  Nutzungsgrenzen; ihre externe Validierung bleibt `not_validated`.

### Slice-05-Vorgates

- CR05-8 ist technisch geschlossen: Ein zweiter XLSX-/CSV-Parser
  rekonstruiert alle 101 Goldreturns aus den gepinnten Quellbytes. CAPE
  besitzt ebenfalls einen vom Produktionsparser getrennten OLE-/BIFF-Oracle
  fuer alle 101 Werte. Der Lohn-Volloracle nutzt einen eigenen XLSX-Parser fuer
  22 JST-Jahresveraenderungen und einen zustandsbasierten HTML-Parser ohne die
  Regex-/Feldauswahl des Produktionsgenerators fuer alle 79 amtlichen Jahre.
- Die bisher aktive Backtest-Zielfixture aus Slice 05 wurde bytegleich als
  `post-backtest-data-05-target-v1.json` erhalten; SHA-256
  `c7c695505935d0e7788b9c73ab2e066b6802a59ae91db5230c84f42d17f8bc1c`.
  Die Slice-05-Goldevidenz verweist nun auf diesen unveraenderlichen Stand,
  nicht auf die fortgeschriebene Slice-06-Zielfixture.
- CR05-15 und CR06-3/10 sind technisch geschlossen, ohne unveraenderliche
  Vorgaenger umzuschreiben. `post-backtest-data-06-v1` bleibt mit seinem
  defekten Messvertrag erhalten; V2 wurde mit `new Date().toISOString()` im
  Erzeugungslauf zeitgestempelt. V2 weist Gold-, CAPE-Sampling- und
  lohnindexierte Rentenwirkung explizit als nicht gemessen aus und belegt gegen
  Slice 05 exakt null numerische Deltas. `annualDataHash` ist `876585c9`,
  `regimeHash` bleibt `7d37583a`.

### Wirkungsnachweise

- CAPE bei deaktivierter Dynamic-Flex-/CAPE-Policy, 2000-2005: Outcome und
  alle acht Finanzmetriken sind exakt invariant; Endvermoegen jeweils
  `1.693.115,83 EUR`, `portfolio_flow_delta` jeweils null. Eine exakte
  normalisierte Allowlist deckt alle 35 geaenderten Blattfelder ab, darunter
  die nur bei deaktivierter Dynamic Flex in diesem Szenario inaktiven
  VPW-Eingaben `capeRatioUsed` und `expectedReturnCape`; unerwartete Felder
  sind unzulaessig. `expectedReturnCape` wird damit nicht allgemein als
  wirkungslos klassifiziert.
- CAPE im ausgelieferten Dynamic-Flex-Default `legacy_step`, 2018-2025:
  Endvermoegen `2.726.687,53 -> 2.783.336,86 EUR` (Delta `+56.649,33 EUR`),
  Entnahmen `801.000 -> 771.000 EUR`, Steuer
  `95.126,84 -> 95.006,65 EUR` und Runway-Deckung
  `62,235564 -> 72,719865`; Outcome bleibt `completed`, FlowDelta null. Der
  Volloracle dokumentiert 21 Stufenwechsel in 100 Jahren, darunter 2023 von
  4 auf 7 Prozent.
- Lohnindexierte Rente im JST-Abschnitt, 1930-1940, gegen eine konstante
  3-Prozent-Vorgaengerreihe: Endvermoegen
  `2.735.439,56 -> 2.670.178,40 EUR` (Delta `-65.261,16 EUR`), Entnahmen
  `41.400 -> 92.400 EUR`, Steuer `0 -> 2.408,26 EUR` und Kuerzungsjahre
  `7 -> 9`; Outcome bleibt `completed`, FlowDelta null.
- Lohnindexierte Rente im JST-Abschnitt, 1935-1946: Endvermoegen
  `5.141.746,50 -> 5.093.328,06 EUR` (Delta `-48.418,44 EUR`), Entnahmen
  `118.800 -> 147.000 EUR`, Steuer `9.837,65 -> 14.841,57 EUR` und
  Kuerzungsjahre `10 -> 1`; Outcome bleibt `completed`, FlowDelta null.
- Die getrennte aktive Deltafixture `cape-wage-backtest-delta-v3.json`
  reproduziert den CAPE-inaktiven Fall, den ausgelieferten
  Default-`legacy_step`, die lohnindexierte Wirkung 2000-2005 und beide fruehen
  JST-Lohnfaelle aus dem Basiscommit. Der fruehere Golden Case
  `dynamic_flex_cape_2010_2013` mit erzwungenem `cape_continuous` wurde durch
  `dynamic_flex_cape_legacy_step_2018_2025` ersetzt, nicht ergaenzt;
  `cape_continuous` bleibt durch bestehende Policy-/Backtesttests abgedeckt,
  ist aber kein Slice-06-Daten-Delta-Oracle.
- V1 bleibt als ueberholter Nachweis erhalten, weil sie beim Umbenennen des
  CAPE-Falls irrtuemlich `horizonMethod=mean` und `horizonYears=20` aus dem
  entfernten Continuous-Szenario behielt. V2 korrigierte den Fall auf die
  ausgelieferten Defaults `survival_quantile`, `horizonYears=30` und
  `survivalQuantile=0.85`, erfasste aber den neuen JST-Lohnabschnitt nicht.
  V3 dokumentiert beide Ablösungsgruende maschinenlesbar. Rentenformel und
  Moduswahl wurden nicht geaendert.

### Validierung

- Alle sieben read-only Quellen-/Toolchain-Gates sind gruen: globale Aktien,
  deutsche Inflation, Geldmarkt, Gold, Lohn, CAPE und Poppler.
- Fokussierte Nachbesserung: CAPE-Sampling 17/17, JST-/Destatis-Lohnoracle
  184/184, Lohnkette 378/378, CAPE-Volloracle 108/108, CAPE-Kette 932/932,
  Backtest-Charakterisierung 175/175, historischer Backtestcontract 172/172,
  Manifest 309/309, Monte-Carlo-Messvertrag 1.442/1.442, Dateninventar 376/376
  und Suite-Traceability 1.098/1.098.
- `npm test`: 156 Dateien, 17.022/17.022 Assertions, keine fehlgeschlagene
  Datei und keine offenen Handles.
- `npm run test:browser`: 27/27 Workflows gruen.
- `npm run test:coverage`: Gate gruen; 38.781 von 49.799 ausfuehrbaren Zeilen
  bzw. 77,88 Prozent gesamt, `app/shared/cape-utils.js` 97,44 Prozent und die
  beiden generierten CAPE-/Lohnmodule jeweils 100 Prozent.
- `npm run docs:evidence` und `git diff --check` sind sauber.

## Abweichungen vom Plan

- Der gemeinsame OLE-/BIFF8-Parser wurde als neunte produktive Datei
  aufgenommen. Damit bleibt der Slice unter der Stop-Grenze; der Preflight
  hatte acht Dateien erwartet.
- Der erste Vollsuite-Lauf fand zwei veraltete Evidenzhashes fuer die bewusst
  fortgeschriebene Backtest-Zielfixture. Statt Slice-05-Evidenz umzuschreiben,
  wurde deren bytegleicher Stand separat eingefroren und die Traceability um
  die neue Delta-Klasse `backtest_data_06` erweitert. Der anschliessende
  Vollsuite-Lauf war vollstaendig gruen.

## Offene Risiken

- Fuer die oeffentlich angebotene Shiller-Arbeitsmappe wurde keine
  ausdrueckliche offene Redistributionserlaubnis gefunden. Attribution,
  Disclaimer und diese Nutzungsgrenze sind deshalb sichtbar; eine
  Weiterverteilung als offene Daten wird nicht behauptet.
- CAPE ist eine US-Reihe. Jede globale oder deutsche Interpretation sowie die
  wirtschaftliche Eignung der `cape_continuous`-Policy benoetigt ein separates
  fachliches Review.
- Die Lohnwerte 1925-1946 sind ein JST-R6-Forschungsproxy. Auch der amtliche
  Abschnitt ist nur ein Bruttoverdienst-Proxy fuer Rentenfortschreibung, keine
  historische gesetzliche Rentenanpassung; Gebiets- und Methodenbrueche
  begrenzen seine wirtschaftliche Vergleichbarkeit.
- Der neue Monte-Carlo-Kandidat misst weder Gold-, CAPE-Sampling- noch
  lohnindexierte Rentenwirkung, weil seine sechs Golden Cases diese Pfade nicht
  aktivieren. Diese Grenze und das numerische Null-Delta sind nun explizit;
  die getrennten Backtest- und Sampling-Oracles tragen den Wirkungsnachweis.
- Alle Quellenketten bleiben bis zum externen Review `not_validated`; der
  Monte-Carlo-Kandidat bleibt `pending`.

## Rueckdokumentation

Nach Abschluss einzutragen in:

- `docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md`;
- `docs/reference/DATA_SOURCES.md`;
- `docs/reference/TECHNICAL.md`;
- `docs/reference/SIMULATOR_MODULES_README.md`;
- `tests/README.md`;
- `README.md`.

## Freigabestatus

Codex implementiert und prueft technisch. Review, Freigabe und Commit liegen
bei Gemini, Claude oder dem Nutzer. Bis dahin bleibt der Slice
`not_validated`/`pending`.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| CR05-8 | Claude Slice-05-Zweitreview | 95 von 101 Goldjahren besitzen keinen unabhaengigen Inhaltsoracle | angenommen | technisch durch unabhaengigen 101-Jahres-Oracle geschlossen; externes Review ausstehend |
| CR05-15 | Claude Slice-05-Zweitreview | Monte-Carlo-Kandidat misst keine Goldwirkung und traegt einen unmoeglichen Messzeitpunkt | angenommen | technisch durch expliziten Scope, Korrektur-Ledger und tatsaechlichen Messzeitpunkt geschlossen; externes Review ausstehend |
| CR06-1 | Claude-Review | Wirkung im ausgelieferten Standardpfad `legacy_step` ist ungemessen; der einzige Dynamic-Flex-Golden-Case wurde in diesem Slice auf die Nicht-Default-Policy umgewidmet | angenommen | Default-`legacy_step` 2018-2025 mit exakten Finanzmetriken und 21/100 Schwellenwechseln als Golden Oracle ergaenzt; externes Review ausstehend |
| CR06-2 | Claude-Review | AK 9 begrenzt Abweichungen auf Provenienz-/Diagnosefelder; `rows[].vpw.expectedReturnCape` und `rows[].vpw.capeRatioUsed` weichen ab und kein Test prueft die Feldgrenze | angenommen | Vollpayload-Diff mit exakt 35 Blattfeldern, normalisierter Allowlist und separater Finanz-/Outcome-Invarianz ergaenzt; externes Review ausstehend |
| CR06-3 | Claude-Review | Monte-Carlo-Kandidat 06 zeigt null numerische Aenderungen; der Ledger behauptet dennoch CAPE-, Lohn- und Regimewirkung und offenbart nur die Goldluecke | angenommen | V2 misst und prueft exakt null numerische Deltas und weist Gold-, CAPE-, Lohn- und Regimewirkung wahrheitsgetreu als nicht gemessen aus; externes Review ausstehend |
| CR06-4 | Claude-Review | Der Lohn-Volloracle verwendet zeichengleich die Regex und Feldauswahl des Produktionsparsers und erfuellt die Auflage CR05-8 fuer `lohn_de` nicht | angenommen | unabhaengiger XLSX-Parser und zustandsbasierter HTML-Parser rekonstruieren 22 JST- und 79 Destatis-Jahre; externes Review ausstehend |
| CR06-5 | Claude-Review | Die CAPE-Spaltenidentitaet (Index 12) ist in Generator und Oracle hart gesetzt und nirgends gegen die Spaltenbeschriftung der gepinnten Mappe geprueft | angenommen | BIFF8-SST/LABELSST-Unterstuetzung und fail-closed Headerpruefung fuer `Date`, konventionelles `CAPE` und verworfenes `TR CAPE`; externes Review ausstehend |
| CR06-6 | Claude-Review | Die in Fussnote 1 der Quelle benannten Methodenbrueche 2007 und 2022 sind weder geprueft noch als Segment oder Diskontinuitaet gefuehrt | angenommen | beide Quellmarker werden geprueft und als eigene Qualitaets-/Methodensegmente exportiert; externes Review ausstehend |
| CR06-7 | Claude-Review | Die Gebietsangabe uebernimmt die Quellenfussnote; fuer 1946-1990 kann die Reihe nur das fruehere Bundesgebiet abbilden | angenommen | territoriale Segmente trennen JST, frueheres Bundesgebiet bis 1990 und Deutschland ab 1991; externes Review ausstehend |
| CR06-8 | Claude-Review | Die 3%-Annahme 1925-1946 ist unveraendert uebernommen; die bereits gepinnte JST-R6-Lohnreihe deckt genau diesen Zeitraum ab und ist weder genutzt noch begruendet verworfen | angenommen | pauschale Annahme durch aus `DEU.wage` levelabgeleitete 1925-1946-Raten ersetzt; externes Review ausstehend |
| CR06-9 | Claude-Review | Die Traceability weist die Backtest-Zielfixture als eigene Deltaevidenz aus (Selbstreferenz) statt einer separaten Deltafixture wie in Slice 05 | angenommen | aktive Traceability verweist auf `cape-wage-backtest-delta-v3.json`; V1 und V2 bleiben mit explizitem Ablösungsgrund als ueberholte Evidenz erhalten; externes Review ausstehend |
| CR06-10 | Claude-Review | `capturedAtUtc` des neuen Kandidaten ist erneut ein Literal im Testcode; das Gate prueft nur eine Datumsuntergrenze | angenommen | V2-Zeitstempel entsteht ausschliesslich im Erzeugungslauf per `new Date().toISOString()` und ist gegen Literal-/Vorgaengergrenzen geprueft; externes Review ausstehend |
| CR06-11 | Claude-Review | `app/shared/cape-utils.js` liest `HISTORICAL_DATA[year].cape` ohne Versatz; durch die Datenverschiebung aendert sich die Monte-Carlo-Startjahrauswahl still | angenommen | Helper konsumiert nur uebergebene `annualData[].capeRatio`; Vorher-/Nachher-Kandidaten sind als eigene Deltafixture exakt eingefroren; externes Review ausstehend |
| CR06-12 | Claude-Review | Der CAPE-Qualitaetsvertrag ist ueber 101 Jahre einteilig; die interpolierte Vorkriegsbasis betrifft Entscheidungsjahre bis 1935 und ist nicht abgegrenzt | angenommen | CAPE 1925-1935 `estimated`, 1936-2025 `backtested`; Test belegt vollstaendigen Ausschluss des fruehen Segments durch den MC-Filter; externes Review ausstehend |
| CR06-13 | Claude-Review | Die fruehen amtlichen Lohnjahre stammen aus auf 0,1 gerundeten Indexstaenden im Bereich 1,8-3,7; diese Praezisionsgrenze ist nicht ausgewiesen | angenommen | eigenes 1947-1955-Praezisionssegment dokumentiert 0,1-Levelrundung und maximal 2,8 Prozent relativen Half-Unit-Effekt; externes Review ausstehend |
| CR06-14 | Claude-Review (Runde 2) | Die JST-abgeleiteten Lohnjahre 1925-1946 sind der groesste Datenwechsel des Slice und besitzen keinen Golden Case und kein Delta-Oracle | angenommen | zwei Golden-/Delta-Oracles fuer 1930-1940 und 1935-1946 vergleichen die JST-Kette gegen die konstante 3-Prozent-Vorgaengerreihe mit exakten Finanzmetriken, Kuerzungsjahren und FlowDelta; externes Review ausstehend |
| CR06-15 | Claude-Review (Runde 2) | Der Abschnitt Wirkungsnachweise behauptet ein `cape_continuous`-Delta-Oracle und dessen Aufnahme in die V2-Deltafixture; beides existiert nicht mehr, die Entfernung des Golden Case `dynamic_flex_cape_2010_2013` ist nicht offengelegt | angenommen | Dokumentation nennt die Ersetzung durch den Default-`legacy_step`-Fall explizit und grenzt die bestehende Continuous-Testabdeckung vom Slice-06-Daten-Delta ab; externes Review ausstehend |
| CR06-16 | Claude-Review (Runde 2) | `cape-wage-backtest-delta-v1.json` und `-v2.json` enthalten fuer dasselbe Oracle widersprechende Zahlen ohne genannten Grund | angenommen | V3 dokumentiert V1 als ungueltigen Szenariovertrag (`mean`/20 aus dem entfernten Fall) und V2 als korrigierten, aber um den fruehen Lohnscope unvollstaendigen Nachfolger; externes Review ausstehend |
| CR06-17 | Claude-Review (Runde 2) | 1925, 1945 und 1946 werden als gewoehnliche Proxyjahre gefuehrt; Nachkriegsbruecke, Quellennaht 1946/1947 und Waehrungsreform 1948 haben keinen Nahtvertrag | angenommen | maschinenlesbare Diskontinuitaeten markieren 1925, 1945, 1947 und 1948; 1945 ist `estimated`, 1946 bleibt als letzter JST-Proxy vor der expliziten 1947-Naht abgegrenzt; externes Review ausstehend |
| CR06-18 | Claude-Review (Runde 2) | `precisionSegments` nennt eine Levelspanne ausserhalb des eigenen Segments; `nonEffectiveVpwDiagnostics` bezeichnet `expectedReturnCape` faelschlich als nicht wirksam | angenommen | Praezisionshinweis trennt 1947-1955 (1,9-4,5) vom fuer die 1947-Aenderung benoetigten 1946er Stand 1,8; Feldvertrag heisst `scenarioInactiveVpwInputs` und behauptet Wirkungslosigkeit nur fuer Dynamic Flex aus; externes Review ausstehend |
| CR06-19 | Claude-Review (Runde 2) | Browser-Smoke und Coverage wurden nach der Nachbesserung nicht wiederholt, obwohl mit `app/shared/cape-utils.js` ein produktives Modul umgebaut wurde | angenommen | Browser-Smoke 27/27 und Coverage-Gate bei 77,88 Prozent gesamt sowie 97,44 Prozent fuer `cape-utils.js` erneut gruen; externes Review ausstehend |
| CR06-20 | Claude-Review (Runde 3) | Manifest fuehrt 1925-1946 als `estimated`, waehrend Artefakt und Inventar nur 1945 als `estimated` und die uebrigen Jahre als `proxy` fuehren; die Konvention weicht zudem von der Goldkette ab | offen | ausstehend |
| CR06-21 | Claude-Review (Runde 3) | Die neu deklarierte Quellennaht 1946/1947 wird von keinem Lohnmodus-Fall ueberschritten; ein Verstoss gegen das eigene Nahtverbot bliebe unbemerkt | offen | ausstehend |
| CR06-22 | Claude-Review (Runde 3) | Der 1945er JST-Wert `+22,69 %` wird im Lohnpfad als volle Rentenanpassung angewandt, obwohl der Vertrag ihn als nicht beobachtete Kriegsjahresschaetzung fuehrt; die Fachentscheidung ist unbegruendet | offen | ausstehend |
| CR06-23 | Claude-Review (Runde 3) | Das Slice-Dokument enthaelt vier `U+FFFD`-Ersetzungszeichen statt Umlauten; drei davon sind in der Nachbesserung Runde 2 entstanden | offen | ausstehend |

## Review-Feedback von Claude

**Reviewdatum:** 2026-08-01  
**Reviewer:** Claude (Primary reviewer & Analyst)  
**Pruefstand:** Arbeitsbaum auf `codex/suite-datenintegritaet-hardening`, HEAD
`a7038e5`, Slice-06-Aenderungen unverwaltet im Arbeitsbaum  
**Rolle:** adversariales Review; Programmdateien wurden von mir nicht
dauerhaft geaendert. Alle Messproben sind byteidentisch zurueckgerollt.

### Verifikationsbasis

- **Eigene Vollrekonstruktion der CAPE-Kette.** Eigener OLE-/BIFF8-Leser
  (eigene FAT-Verkettung, eigene Verzeichnisauswertung, Datumszerlegung ueber
  die Dezimaldarstellung statt ueber Rundung). Ergebnis: alle 101 Werte
  1925-2025 stimmen, **Abweichung 0**. 1867 Datumszeilen, jedes Jahr mit genau
  zwoelf Monatszeilen, keine Dezemberduplikate, maximale Quellperiode 2026-07.
- **Eigene Auslesung der Spaltenbeschriftungen** aus dem SST der gepinnten
  Mappe: Spalte 12 = "Cyclically Adjusted Price Earnings Ratio P/E10 or CAPE",
  Spalte 14 = "TR CAPE", Spalte 0 = "Date". Die Spaltenwahl ist sachlich
  richtig.
- **Eigene Auswertung der Destatis-Quelle:** 80 Tabellenzeilen 1946-2025, 79
  publizierte Veraenderungen ab 1947. Die publizierten Veraenderungen sind mit
  den publizierten Indexstaenden konsistent (1,9/1,8 = 5,6 %; 2,2/1,9 = 15,8 %;
  2,8/2,2 = 27,3 %; 3,7/3,1 = 19,4 %).
- **Rueckwaertspruefung des Vorzustands** gegen `git show HEAD`: die als
  Vorher-Werte injizierten CAPE-Signale (40,6 / 43,8 / 36,8 / 29,9 / 22,9 /
  27,1 sowie 15,2 / 20,3 / 23,0 / 21,1) und Lohnwerte (2,5 / 1,9 / 2,1 / 1,2 /
  1,1 / 0,8) entsprechen exakt dem Stand des Basiscommits.
- **Gates selbst nachgefahren:** `npm test` 16.856/16.856 Assertions, null
  fehlgeschlagene Assertions, null fehlgeschlagene Dateien, null offene
  Handles. Alle sechs Quellen-Verify-Gates gruen; `git status` danach
  unveraendert, also schreibfrei. `git diff --check` sauber.
- **Vier Mutationsproben** (C, D, F, G) mit anschliessender byteidentischer
  Wiederherstellung.

### Pruefdimension 1 - Korrektheit

Die Zahlen sind korrekt. Meine unabhaengige Rekonstruktion reproduziert alle
101 CAPE-Signale ohne Abweichung, und die 79 amtlichen Lohnjahre entsprechen
der gepinnten Quelle.

Der behauptete Vorzustand haelt ebenfalls stand. Ich habe die alte
`cape`-Reihe gegen sieben Quellvarianten getestet (Dezember `t-1`, Dezember
`t`, Januar `t`, Januar `t-1`, Jahresmittel `t`, Jahresmittel `t-1`,
Jahresmaximum `t`). Die kleinste mittlere absolute Abweichung hat Januar `t`
mit 1,21, gefolgt von Dezember `t-1` mit 1,44; Dezember `t` liegt bei 2,17.
Die alte Reihe hatte also Jahresanfangs-Vintage, auf die der Vertrag mit
`previous.cape` ein zweites `-1` legte. Der Befund D-05 war bisher als
"teilweise bestaetigt" gefuehrt; er ist damit bestaetigt.

Nicht vollstaendig ist die Klassifikation auf der Lohnseite (CR06-6, CR06-7,
CR06-13), und die Aussage, Returnjahr `t` verwende ausschliesslich `t-1`, gilt
nicht fuer alle Konsumenten (CR06-11).

### Pruefdimension 2 - Vertragstreue

`buildHistoricalYearRecord` wurde konsistent von `previous.cape` auf
`current.cape` umgestellt und exportiert `observationYear`,
`observationMonth`, `asOfYear` und `decisionYear` getrennt; die
Vertragsvalidierung prueft alle drei neuen Felder. AK 3, 4 und 5 sind erfuellt.

AK 9 ist nicht erfuellt. Die Formulierung lautet "nur erlaubte
Provenienz-/Diagnosefelder duerfen abweichen". Meine Feldprobe des
CAPE-Invarianzfalls 2000-2005 ergibt 35 abweichende Blattfelder. Davon sind
`rows[].vpw.capeRatioUsed` (sechs Zeilen) und `rows[].vpw.expectedReturnCape`
(eine Zeile, 0,04 auf 0,05) keine Provenienzfelder, sondern Eingangsgroessen
der VPW-Rechnung. Der Test prueft ausschliesslich die acht Finanzkennzahlen;
die zugesagte Feldgrenze ist nirgends kodiert (CR06-2).

Die Auflage CR05-8 ist fuer Gold und CAPE erfuellt, fuer Lohn nicht: der
"unabhaengige" Lohn-Oracle uebernimmt Regex und Feldauswahl des
Produktionsparsers wortgleich (CR06-4).

### Pruefdimension 3 - Fehlerbehandlung

Fail-closed-Verhalten habe ich mit vier Mutationen gemessen:

| Probe | Mutation | Ergebnis |
|---|---|---|
| C | ein CAPE-Wert im generierten Modul um 1 ULP verfaelscht | `verify:us-shiller-cape-data` bricht mit "module is stale" ab |
| D | Lohnwert 2020 von -0,9 auf +0,9 | `verify:german-gross-wage-data` bricht mit "module is stale" ab |
| F | CAPE-Spalte 12 auf 14 (TR CAPE) umgestellt und neu gebaut | drei fehlgeschlagene Assertions, acht fehlgeschlagene Dateien; der unabhaengige Oracle meldet sachbezogen "1925 CAPE should match the independently parsed December t-1 source value (Expected 13,41, got 9,31)" |
| G | Modellannahme 3 % auf 4 % umgestellt und neu gebaut | drei fehlgeschlagene Assertions, acht fehlgeschlagene Dateien; die Kette meldet "1925 should retain the explicit early model rate (Expected 3, got 4)" |

Die Gates haben Zaehne, und der CAPE-Oracle faengt einen Spaltentausch. Was er
nicht faengt, ist eine gemeinsame Fehlannahme beider Parser (CR06-5); beim
Lohn faellt die zweite Instanz als Zeuge ganz aus (CR06-4).

Der Destatis-Parser scheitert korrekt bei fehlender amtlicher Veraenderung ab
1947 und behandelt den Strich der Zeile 1946 als Nichtwert; das Minuszeichen
2020 bleibt erhalten. AK 7 ist erfuellt.

### Pruefdimension 4 - Seiteneffekte

Hier liegt der schwerste Befund. `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY`
steht im ausgelieferten Stand auf `legacy_step`. Dieser Pfad konsumiert CAPE
sehr wohl: `deriveCapeAssessment` bildet den Wert ueber die Schwellen 15/30/35
auf `expectedReturnCape` aus {8 %, 7 %, 5 %, 4 %} ab, und
`deriveCAPELegacyStepReturn` verwendet genau diesen Wert als Nominalrendite.

Ich habe den Stufenwechsel ueber die gesamte Reihe ausgezaehlt: **21 von 100
Jahren wechseln die Bewertungsstufe** zwischen dem alten effektiven Signal und
dem neuen, 2023 sogar um zwei Stufen (extrem 4 % auf fair 7 %). Anschliessend
habe ich den Default-Pfad mit aktivem Dynamic Flex gemessen; die Vorher-Werte
sind gegen HEAD verifiziert:

| Fenster | Endvermoegen | Entnahmen | Steuern | Runway-Deckung |
|---|---|---|---|---|
| 1998-2003 | 1.772.318,94 auf 1.769.906,21 (-2.412,73 EUR) | 597.000 auf 588.000 (-9.000 EUR) | 66.122,29 auf 56.641,73 (-9.480,56 EUR) | 46,07 auf 53,43 (+7,35 pp) |
| 2018-2025 | 2.726.687,53 auf 2.783.336,86 (+56.649,33 EUR) | 801.000 auf 771.000 (-30.000 EUR) | 95.126,84 auf 95.006,65 (-120,19 EUR) | 62,24 auf 72,72 (+10,48 pp) |
| 2010-2013 | exakt invariant | exakt invariant | exakt invariant | exakt invariant |

Outcome bleibt in allen drei Faellen `completed`, FlowDelta null. Das dritte
Fenster ist genau das von Codex gewaehlte und das einzige der drei ohne
Stufenwechsel. Um ueberhaupt eine sichtbare Wirkung zu erzeugen, wurde die
Policy im Test auf `cape_continuous` gezwungen. Damit hat der einzige
Dynamic-Flex-Golden-Case `dynamic_flex_cape_2010_2013` in diesem Slice die
Policy gewechselt: vorher Default `legacy_step`, jetzt erzwungenes
`cape_continuous`. Der ausgelieferte Standardpfad hat danach weder einen
Golden Case noch einen Wirkungsnachweis, obwohl er sich messbar aendert
(CR06-1).

Zweiter Seiteneffekt: `app/shared/cape-utils.js:getStartYearCandidates` liest
`HISTORICAL_DATA[year].cape` ohne Versatz. Der Wert bedeutet jetzt Dezember
`t-1` statt eines Wertes aus `t`. Fachlich ist das plausibler, aber es ist eine
stille Bedeutungsaenderung ausserhalb des Slice-Scopes. Gemessen: bei
Ziel-CAPE 15 wechseln elf von 26 Kandidatenjahren, bei Ziel-CAPE 20 sechs von
32 (CR06-11).

Ausgeschlossen habe ich dagegen eine Regimewirkung: `initializeData`
klassifiziert ausschliesslich ueber Aktienrendite und Inflation, `cape` geht
nicht ein; `regimeHash 7d37583a` bleibt konsistenterweise unveraendert. Auch
`ESTIMATED_HISTORY_CUTOFF_YEAR` bleibt bei der harten Konstante 1951 und wird
vom neuen Lohnsegment 1925-1946 nicht verschoben.

### Pruefdimension 5 - Was koennte brechen?

- **Die Monte-Carlo-Evidenz belegt nichts.** `post-backtest-data-06-v1` hat
  gegenueber 05 **499 identische Blattfelder und null numerische
  Abweichungen**; es wechseln nur `snapshotId`, `sourceReference`, `sliceId`,
  `capturedAtUtc` und zweimal `annualDataHash`. Der Ledgereintrag behauptet
  dennoch "CAPE sampling candidates, wage-indexed pension paths and derived
  regimes may change in either direction". `measurementScope` offenbart
  ausschliesslich die fehlende Goldpopulation - genau der Defekt, den CR05-15
  beanstandet hat, wird fuer CAPE und Lohn im selben Kandidaten wiederholt
  (CR06-3).
- **Die Deltaevidenz zeigt auf sich selbst.** In
  `oracle-traceability-v1.json` traegt `backtest-target` jetzt
  `"deltaEvidence": "tests/fixtures/simulator-backtest-target-v1.json"`. Fuer
  Slice 05 war das eine eigene Deltafixture (CR06-9).
- **Die Lohnreihe ist als amtlich etikettiert, aber methodisch gebrochen.**
  Fussnote 1 der gepinnten Seite nennt zwei Brueche: "Ab 2007: Produzierendes
  Gewerbe und Dienstleistungsbereich" und "Seit 2022 Ergebnisse aus der
  Verdiensterhebung". Der Generator prueft Titel, Gebietsfussnote und
  Veroeffentlichungsstand, nicht aber Fussnote 1; das Artefakt fuehrt
  1947-2025 als einen einzigen `official`-Block. Beide Bruchjahre liegen im
  Backtestfenster 2000-2025 (CR06-6).
- **Die 3%-Annahme ist keine Datenluecke, sondern eine ungepruefte Erbschaft.**
  Die im Repository bereits gepinnte und bereits genutzte JST-R6-Datei enthaelt
  eine deutsche Nominallohnreihe (`wage`, DEU, 1870-2020) mit vollstaendiger
  Deckung 1924-1946. Die daraus ableitbaren Veraenderungen reichen von -9,7 %
  (1932) ueber -7,8 % (1931) bis +9,3 % (1928); 1934-1938 liegen sie zwischen
  +0,4 % und +2,0 %. Der pauschale Wert von 3 % trifft in diesem Zeitraum kein
  einziges Jahr. Weder Slice-Dokument noch Artefakt erwaehnen, dass diese
  Option geprueft und verworfen wurde (CR06-8).
- **Praezisionsgrenze der fruehen Lohnjahre.** Die Veraenderungen 1947-1955
  ruhen auf Indexstaenden zwischen 1,8 und 3,7, publiziert auf eine
  Nachkommastelle. Eine Rundung von 0,05 entspricht dort bis zu 2,8
  Indexprozent. Diese Grenze steht nirgends im Vertrag (CR06-13).
- **CAPE-Qualitaetsvertrag.** Ein einziges Segment `backtested` ueber 101 Jahre
  mit dem Hinweis auf interpolierte Cowles-Jahresdaten "pre-1926". Da CAPE ein
  Zehnjahresmittel ist, betrifft diese Basis die Entscheidungsjahre bis
  einschliesslich 1935. Die betroffenen Jahre sind nicht abgegrenzt, und
  `estimatedSegments` ist leer, sodass die Monte-Carlo-Option "geschaetzte
  Historie ausschliessen" keinen CAPE-Jahrgang filtert (CR06-12).

### Geprueft und verworfen

1. CAPE-Werte fehlerhaft - widerlegt, eigene Vollrekonstruktion 101 von 101,
   Abweichung 0.
2. Spalte 12 sei das Total-Return-CAPE - widerlegt durch eigene Auslesung der
   Spaltenbeschriftungen.
3. Die Monatszerlegung ueber `Math.round((raw-year)*100)` verfehle Oktober
   (1925.1) - widerlegt, alle Jahre haben genau zwoelf Monatszeilen, kein
   ungueltiger Monat.
4. Doppelte oder fehlende Dezemberbeobachtungen - keine.
5. Der behauptete doppelte Jahresversatz sei konstruiert - nicht widerlegt,
   sondern durch die Vintage-Analyse gestuetzt.
6. Lohnwerte falsch gelesen - widerlegt, 79 amtliche Jahre stimmen und sind
   mit den Indexstaenden konsistent.
7. Das Minuszeichen 2020 gehe verloren - widerlegt, -0,9 korrekt signiert.
8. 1946 werde still als 0 projiziert - widerlegt, explizite Modellannahme.
9. Die Regimeklassifikation haenge an CAPE - widerlegt.
10. `ESTIMATED_HISTORY_CUTOFF_YEAR` verschiebe sich durch das neue
    Lohnsegment - widerlegt, harte Konstante 1951.
11. Hash- und Oracle-Gates seien Attrappen - widerlegt durch die Proben C, D,
    F und G.
12. Die Verify-Gates schrieben Dateien - widerlegt, `git status` unveraendert.
13. Die Zielfixture habe still Faelle verloren - widerlegt, acht vorher wie
    nachher, keiner entfallen; nur `dynamic_flex_cape_2010_2013` aendert Werte.
14. Andere Rentenmodi als `wage` seien betroffen - widerlegt, die sieben
    uebrigen Golden Cases behalten alle Finanzkennzahlen exakt.

### Wiederherstellungsnachweis

Nach den Proben C, D, F und G:

```
00d5fdf89a1682b7fd62e50ac3517bce24a0b49d6deb0774ceaaf1fcd8e413e1  tests/simulator-backtest-characterization.test.mjs
6c103565cba73ea5cb6f02aa2d7e8f52f2dee502c995baa5d5f33df70a636edc  app/simulator/us-shiller-cape-chain.js
db92639ff340b183735f958d6296aca513838078e5e884dfb1f4b6f1b3b48bd5  app/simulator/german-gross-wage-growth-chain.js
1de9436ae2548503d0f887c32842d3b2d64e18adbf4f04d521903809a072fff3  scripts/build-us-shiller-cape-chain.mjs
Verified US Shiller CAPE decision chain 1925-2025; hash d1101958...
Verified German gross-wage growth chain 1925-2025; hash a7917b5b...
Verified German-investor gold chain 1925-2025; annualReturnHash 068a15a9...
git diff --check sauber
```

Ausser diesem Dokument habe ich keine Datei veraendert.

## Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:**
  - CR06-1: Die Wirkung im ausgelieferten Standardpfad `legacy_step` ist
    ungemessen und undokumentiert (21 von 100 Jahren mit Stufenwechsel;
    gemessen bis +56.649,33 EUR Endvermoegen und -30.000 EUR Entnahmen ueber
    2018-2025), und der einzige Dynamic-Flex-Golden-Case wurde in diesem Slice
    auf die Nicht-Default-Policy umgewidmet.
  - CR06-2: AK 9 ist weder erfuellt noch geprueft; `vpw.expectedReturnCape`
    und `vpw.capeRatioUsed` sind keine Provenienzfelder.
  - CR06-3: Der Monte-Carlo-Kandidat 06 misst weder CAPE- noch Lohnwirkung
    (null numerische Aenderungen), der Ledger behauptet sie dennoch und
    offenbart nur die Goldluecke.
- **Restrisiken:** CR06-4 bis CR06-13; uebernommen aus Slice 05: CR05-5,
  CR05-9, CR05-10, CR05-12, CR05-14, CR05-16; ferner die unveraendert offenen
  Alt-Risiken CR04-11, CR04-12, CR02-10, CR02-17, die nicht umgesetzte
  Abwertung 1948 und die ungetesteten Nahtjahre der Cash-Kette. Alle
  Quellenketten bleiben `not_validated`, der Monte-Carlo-Kandidat `pending`.
- **Pre-Mortem:** In drei Monaten meldet ein Nutzer mit aktivem Dynamic Flex
  in der Standardkonfiguration, dass seine Entnahmeplanung fuer die Jahre um
  2019 bis 2025 spuerbar andere Werte liefert als vor dem Update. Ursache ist
  der CAPE-Stufenwechsel im `legacy_step`-Pfad, der in 21 Jahren die erwartete
  Nominalrendite um eine oder zwei Stufen verschiebt. Niemand sucht dort, weil
  der Slice die CAPE-Korrektur als "bei deaktivierter Policy neutral" und "bei
  aktiver Policy erklaert" dokumentiert hat - beides bezog sich jedoch auf
  eine Policy, die im Auslieferungsstand gar nicht aktiv ist, und der einzige
  Regressionsfall fuer den Standardpfad war im selben Commit umgewidmet
  worden.

## Review-Nachbesserungs-Preflight (Codex)

**Stand:** 2026-08-01  
**Branch:** `codex/suite-datenintegritaet-hardening` (entspricht dem dokumentierten Feature-Branch)  
**Ausgangs-HEAD:** `a7038e531ebbd4a258192e223feac66614fc28a0`  
**Git-Status:** Slice-06-Arbeitsbaum mit 9 produktiven bzw. Konfigurationsdateien, Tests, Fixtures und Dokumentation; zusaetzlich wurde nur diese Slice-MD durch das Claude-Review erweitert. Es bestehen keine unerwarteten produktiven Fremdaenderungen.

### Diff-Risiko der Nachbesserung

Geplante produktive bzw. Konfigurationsdateien (gesamt maximal 10):

- `app/simulator/us-shiller-cape-chain.js`
- `app/simulator/german-gross-wage-growth-chain.js`
- `app/simulator/simulator-data.js`
- `app/simulator/simulation-data-inventory.js`
- `app/simulator/historical-backtest-contract.js`
- `app/shared/cape-utils.js` (einzige zusaetzliche produktive Datei)
- `scripts/build-us-shiller-cape-chain.mjs`
- `scripts/build-german-gross-wage-growth-chain.mjs`
- `scripts/lib/biff8-numeric-sheet.mjs`
- `package.json`

Zusaetzlich betroffen sind ausschliesslich Tests, Test-Fixtures sowie Dokumentation.

Voraussichtliche Aenderungstiefe:

- riskant: Die JST-R6-Lohnwerte 1925-1946 ersetzen die pauschale 3-Prozent-Annahme; CAPE-Qualitaetssegmente, Methodenbrueche, Monte-Carlo-Messvertrag und Golden-Case-Evidenz werden verschaerft.

Gefaehrdete bestehende Tests:

- Quellen- und Manifest-Hashes der CAPE-/Lohnketten
- Backtest-Charakterisierung fuer Dynamic Flex und lohnindexierte Renten
- Monte-Carlo-Snapshot-/Ledger-Vertrag
- Dateninventar-, Traceability- und Sampling-Contracts

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- fachfremde Quellmodule
- bestehende unveraenderliche Snapshot-Datei `post-backtest-data-06-v1.json`; die korrigierte Messung erhaelt eine V2-Folgedatei

Rollback-Strategie:

- bestehende geaenderte Dateien gezielt mit `git checkout -- <datei>` gegen den Basiscommit zuruecksetzen; neu angelegte Slice-Dateien nur nach ausdruecklicher Freigabe entfernen.

Die Stop-Regel greift nicht: Die Nachbesserung bleibt bei genau zehn produktiven bzw. Konfigurationsdateien. Eine elfte solche Datei wuerde die Umsetzung stoppen.

## Review-Nachbesserung Abschluss (Codex)

**Stand:** 2026-08-01  
**Status:** CR06-1 bis CR06-13 technisch bearbeitet; erneutes externes Review,
Freigabe und Commit ausstehend.

Die Nachbesserung blieb bei den im Preflight inventarisierten zehn produktiven
bzw. Konfigurationsdateien. Es kamen keine unerwarteten produktiven Dateien
hinzu; `engine.js`, `dist/` und Release-Artefakte blieben unangetastet.

Die wesentlichen Korrekturen sind:

- Default-`legacy_step`, CAPE-inaktiver Feldvertrag und die lohnindexierte
  Wirkung 2000-2005 besitzen getrennte, reproduzierbare Oracles. Der zuvor
  verwendete `cape_continuous`-Fall wurde durch den Default-Fall ersetzt;
- Lohn 1925-1946 stammt aus JST R6 statt einer pauschalen 3-Prozent-Annahme;
  Destatis-Gebiet, Praezision sowie Methodenbrueche 2007/2022 sind explizit;
- CAPE-Spaltenidentitaet, interpolationsbetroffenes Qualitaetssegment und
  aufrufergebundene Monte-Carlo-Kandidaten sind fail-closed bzw. exakt belegt;
- die Backtest-Traceability verwendete nach Runde 1 eine separate
  V2-Deltafixture; Runde 2 fuehrt sie wegen des erweiterten JST-Wirkungsscope
  als V3 fort;
- Monte-Carlo-V1 bleibt unveraendert als fehlerhafter Vorgaenger erhalten,
  waehrend V2 einen zur Laufzeit erzeugten Zeitstempel, den vollstaendigen
  Messscope und exakt null numerische Deltas dokumentiert.

Abschlussgates: sieben read-only Quellen-/Toolchain-Verifikationen gruen,
fokussierte Nachbesserungsgates gruen, Suite-Traceability 1.095/1.095,
`npm test` 16.968/16.968 bei 156 Dateien ohne offene Handles und
`git diff --check` sauber. Diese technische Dokumentation ist keine
Selbstfreigabe.

## Zweitreview von Claude (Runde 2)

**Reviewdatum:** 2026-08-01  
**Reviewer:** Claude (Primary reviewer & Analyst)  
**Pruefstand:** Arbeitsbaum auf `codex/suite-datenintegritaet-hardening`, HEAD
`a7038e5`; Nachbesserung unverwaltet im Arbeitsbaum  
**Rolle:** adversariales Zweitreview. Programmdateien wurden von mir nicht
dauerhaft geaendert; alle Messproben sind byteidentisch zurueckgerollt.

### Ergebnis der Findings-Lifecycle

Alle dreizehn Findings der ersten Runde sind geschlossen. Ich habe jede
Schliessung eigenstaendig nachgemessen und nicht nur die Zusage geprueft.

| Finding | Status | Eigener Nachweis |
|---|---|---|
| CR06-1 | geschlossen | Der neue Golden Case `dynamic_flex_cape_legacy_step_2018_2025` und `capeLegacyStepDeltaOracle` reproduzieren meine Round-1-Messung ziffernidentisch: Endvermoegen `2.726.687,53 -> 2.783.336,86 EUR`, Entnahmen `-30.000 EUR`, Runway `+10,484301 pp`, Drawdown `-0,013622 pp`, Steuer `-120,19 EUR`. `capeLegacyStepThresholdOracle` nennt `changedYearCount: 21` und listet dieselben Jahre, die ich unabhaengig ausgezaehlt habe. Der Test erzwingt zusaetzlich `RETURN_POLICY === 'legacy_step'`. |
| CR06-2 | geschlossen | `CAPE_DISABLED_ALLOWED_LEAF_PATHS` ist eine exakte Mengengleichheit mit `changedLeafCount === 35`. Probe K (eine Allowlist-Zeile entfernt) scheitert mit "CAPE-disabled payload must not change a field outside the explicit provenance/input/diagnostic allowlist". |
| CR06-3 | geschlossen | `slice06NumericDeltas` wird als echter Blattdiff gegen den Slice-05-Snapshot berechnet und gegen `measurementScope.numericDeltaCount` geprueft. Probe J (0 auf 1) scheitert mit "Slice 06 snapshot must disclose zero numeric deltas". |
| CR06-4 | geschlossen | Der neue Lohn-Oracle nutzt einen eigenen Zustandsautomaten fuer die HTML-Tabelle statt der Produktionsregex sowie einen eigenen JST-Leser. |
| CR06-5 | geschlossen | Der Generator prueft Kopfzeile 7 auf `Date`, `CAPE` und `TR CAPE`. Probe H (Spalte 12 auf 14) scheitert bereits im Build mit "Shiller source column identity does not match the conventional-CAPE contract". |
| CR06-6 | geschlossen | Beide Fussnote-1-Marker werden geprueft; 2007 und 2022 sind eigene Qualitaetssegmente und stehen als `sourceMethodBreaks` im Methodenvertrag. |
| CR06-7 | geschlossen | `territorialSegments` trennt JST bis 1946, frueheres Bundesgebiet 1947-1990 und Deutschland ab 1991. |
| CR06-8 | geschlossen | Die Kette leitet 1925-1946 aus `JST R6 DEU.wage` ab. Meine eigene Rekonstruktion mit eigenem ZIP-Vorwaertsscan, eigenem Zellenleser und eigener HTML-Auswertung reproduziert **alle 101 Werte mit Abweichung 0**. |
| CR06-9 | geschlossen | Die aktive Traceability verweist auf `cape-wage-backtest-delta-v2.json`; V1 ist als `backtest-data-06-delta-v1-superseded` gefuehrt. |
| CR06-10 | geschlossen | Der V2-Zeitstempel entsteht per `new Date().toISOString()`; das Gate prueft, dass er kein Testquellliteral ist und den Vorgaenger ueberholt. |
| CR06-11 | geschlossen | `getStartYearCandidates` liest nur noch uebergebene `capeRatio`-Werte. `cape-sampling-delta-v1.json` friert die Kandidatenlisten ein; die sechs entfallenen Jahre bei Ziel-CAPE 15 decken sich mit meiner Round-1-Messung. |
| CR06-12 | geschlossen | CAPE 1925-1935 ist `estimated`, 1936-2025 `backtested`. Die Grenze 1935 entspricht exakt der von mir hergeleiteten Reichweite des Zehnjahresfensters. |
| CR06-13 | geschlossen | Eigenes `precisionSegments`-Feld 1947-1955 mit Levelpraezision 0,1 und maximal 2,8 Prozent Half-Unit-Effekt. |

### Nachgefahrene Gates

- `npm test`: **16.968/16.968** Assertions, null fehlgeschlagene Assertions,
  null fehlgeschlagene Dateien, null offene Handles.
- Sechs Quellen-Verify-Gates plus Poppler-Gate gruen und schreibfrei
  (`git status` danach unveraendert), `git diff --check` sauber.
- Vier Mutationsproben H, I, J, K; alle scheitern fail-closed. Probe I
  (Endvermoegensdelta um einen Cent verfaelscht) schlaegt mit "backtest-target
  changed without declared delta evidence" an.
- Dokumentstaende gegen Laufzeit geprueft: Revision `2026-08-01.3`,
  Dataset-Hash `c79350c5...`, Lohnwertehash `e10e581f...`,
  `annualDataHash 876585c9` - alle vier stimmen mit den Modulen ueberein.

### Neue Findings

**CR06-14 (Blocker) - der groesste Datenwechsel dieses Slice hat keinen
Wirkungsnachweis.** Die Korrektur zu CR06-8 hat 22 bislang konstante Jahre in
variable Werte verwandelt: 1925-1946 reicht jetzt von `-9,72 %` (1932) bis
`+26,52 %` (1925) statt durchgaengig `+3 %`. Es gibt dafuer weder einen Golden
Case noch ein Delta-Oracle: der einzige lohnindexierte Zeuge ist
`wage_indexed_pension_2000_2005`, und dieses Fenster ist von der Aenderung
nicht beruehrt. Alle acht Golden Cases laufen mit `rentAdjMode: fix`. Ich habe
die Wirkung selbst gemessen (Vorher-Provider mit dem alten Pauschalwert 3,
`rentAdjMode=wage`):

| Fenster | Endvermoegen | Entnahmen | Steuern | Jahre mit Kuerzung >= 10 % |
|---|---|---|---|---|
| 1930-1940 | 2.735.439,56 auf 2.670.178,40 (`-65.261,16 EUR`) | 41.400 auf 92.400 (`+51.000 EUR`) | 0 auf 2.408,26 EUR | 7 auf 9 |
| 1935-1946 | 5.141.746,50 auf 5.093.328,06 (`-48.418,44 EUR`) | 118.800 auf 147.000 (`+28.200 EUR`) | 9.837,65 auf 14.841,57 EUR | **10 auf 1** |

Outcome bleibt in beiden Faellen `completed`. Der Sprung von zehn auf ein
Kuerzungsjahr ist keine Nuance, sondern eine qualitativ andere Aussage des
Backtests. Das ist genau die Befundklasse, die in Runde 1 als CR06-1 blockiert
wurde, nur auf der Lohnseite und neu durch die Nachbesserung selbst
entstanden.

**CR06-15 (Blocker) - das Ergebnisdokument behauptet einen Nachweis, den es
nicht mehr gibt.** Der Abschnitt "Wirkungsnachweise" fuehrt weiterhin
"CAPE bei explizit aktiver `cape_continuous`-Policy, 2010-2013: Endvermoegen
`2.452.466,83 -> 2.385.899,62 EUR` ..." und behauptet, die Deltafixture V2
reproduziere die "Default-, CAPE-inaktiven, `cape_continuous`- und
lohnindexierten" Faelle. Beides trifft nicht mehr zu:

- `capeActiveDeltaOracle` existiert in
  `tests/fixtures/simulator-backtest-target-v1.json` nicht mehr;
- `cape-wage-backtest-delta-v2.json` enthaelt genau vier Oracles, keines davon
  `cape_continuous` (Volltextsuche nach `cape_continuous` in beiden Fixtures:
  kein Treffer);
- der Golden Case `dynamic_flex_cape_2010_2013` wurde ersatzlos entfernt;
- die Zahlen `2385899` und `2452466` kommen im gesamten Test- und
  Dokumentationsbestand ausser in diesem Absatz nicht mehr vor.

Der Wechsel vom erzwungenen `cape_continuous` auf den Default `legacy_step`
war richtig und schliesst CR06-1. Er wurde aber als Ergaenzung beschrieben,
waehrend er tatsaechlich eine Ersetzung war, und die alte Evidenzaussage blieb
stehen. Damit steht in der Ergebnisdokumentation ein Wirkungsclaim ohne
Evidenz - dieselbe Befundklasse wie CR06-3, die in Runde 1 blockiert wurde.
Der Blocker ist auf zwei Wegen schliessbar: entweder das
`cape_continuous`-Delta-Oracle wieder aufnehmen oder die beiden Saetze
korrigieren.

**CR06-16 - zwei widersprechende Messungen desselben Oracles werden
nebeneinander ausgeliefert.** `cape-wage-backtest-delta-v1.json` und `-v2.json`
haben identische Schluesselmengen, aber fuer `capeLegacyStepDeltaOracle`
unterschiedliche Zahlen: Endvermoegensdelta `+30.159,32 EUR` gegen
`+56.649,33 EUR`, Entnahmen `-12.000` gegen `-30.000 EUR`, auch die
Vorher-Werte unterscheiden sich (`2.613.621,30` gegen `2.726.687,53 EUR`). V1
ist als "ueberholt" markiert, aber weder Dokument noch Fixture nennen den
Grund der Abweichung. Ein spaeterer Leser kann nicht entscheiden, welche
Messung fehlerhaft war und warum.

**CR06-17 - der Kriegs- und Nachkriegsabschnitt der Lohnkette hat keinen
Nahtvertrag.** 1945 traegt jetzt `+22,69 %` und 1946 `+2,90 %` als
`proxy`-Beobachtung, 1925 `+26,52 %`. Die erste Zahl ist ein Artefakt der
JST-Levelreihe fuer ein Jahr, in dem es in Deutschland keine
Marktlohnbeobachtung gab; die letzte ist die Normalisierung nach der
Hyperinflation. Im selben Datensatz behandeln die Cash-Kette (1945-1948) und
die Goldkette (1945-1950) genau diese Jahre als ausdrueckliche
Nichtbeobachtungsbruecken. Die Lohnkette fuehrt sie als gewoehnliche
Proxyjahre. Zusaetzlich fehlt eine `discontinuities`-Liste: der Quellenwechsel
1946/1947 von der JST-Levelreihe auf den Destatis-Index und die
Waehrungsreform 1948 sind nirgends als Naht ausgewiesen, obwohl Slice 05 fuer
die Naehte 1968 und 1999 genau das verlangt hat.

**CR06-18 - zwei kleine, aber unzutreffende Vertragsangaben.** Erstens sagt
`precisionSegments[0].note`, die Indexstaende laegen "between 1.8 and 4.5 in
this segment"; im Segment 1947-1955 liegen sie zwischen 1,9 und 4,5, der Wert
1,8 gehoert zum Jahr 1946 ausserhalb des Segments. Zweitens bezeichnet
`leafFieldBoundary.nonEffectiveVpwDiagnostics` die Felder `capeRatioUsed` und
`expectedReturnCape` als nicht wirksame Diagnosen. `expectedReturnCape` ist im
Default `legacy_step` sehr wohl wirksam - es ist nur in diesem einen Szenario
folgenlos, weil Dynamic Flex dort abgeschaltet ist. Die Bezeichnung behauptet
mehr als der Nachweis hergibt.

**CR06-19 - Browser-Smoke und Coverage wurden nach der Nachbesserung nicht
wiederholt.** Die Begruendung "rein DOM-freie Daten-/Testnachbesserung" ist
nicht ganz zutreffend: `app/shared/cape-utils.js` ist ein produktives Modul und
wurde umgebaut. Der einzige Konsument ist zwar `mc-year-sampling.js`, und
Worker-Paritaet ist Teil von `npm test`, aber die geplanten Tests des Slice
haben Browser-Smoke und Coverage ausdruecklich vorgesehen.

### Geprueft und verworfen (Runde 2)

1. Die neuen Lohnwerte seien falsch gelesen - widerlegt, eigene Rekonstruktion
   aller 101 Werte, Abweichung 0.
2. Der JST-Lohnabgriff nehme die falsche Spalte oder das falsche Land -
   widerlegt, eigene Kopfzeilenauswertung liefert `year`/`iso`/`wage` und 23
   DEU-Level 1924-1946.
3. Die CAPE-Werte haetten sich durch die Nachbesserung veraendert - widerlegt,
   Wertehash `d1101958...` unveraendert.
4. Die Headerpruefung sei kosmetisch - widerlegt durch Probe H.
5. Die 35-Feld-Allowlist sei nur eine Obergrenze - widerlegt, exakte
   Mengengleichheit, Probe K.
6. Der Nulldeltabefund im Monte-Carlo-Kandidaten sei erneut nur behauptet -
   widerlegt, er wird aus einem echten Blattdiff berechnet, Probe J.
7. Die Grenze 1935 des CAPE-Estimated-Segments sei willkuerlich - widerlegt,
   sie entspricht exakt dem letzten Entscheidungsjahr, dessen Zehnjahresfenster
   Beobachtungen vor 1926 enthaelt.
8. `regimeHash` habe sich durch die Lohnaenderung verschoben - widerlegt,
   `7d37583a` unveraendert und ausdruecklich geprueft.
9. Die V2-Deltafixture verwende geschoente Vorher-Werte - widerlegt, sie
   stimmen mit meiner eigenen, aus HEAD abgeleiteten Messung ziffernidentisch
   ueberein.
10. Der Umbau von `cape-utils.js` aendere das Sampling gegenueber dem Zustand
    vor der Nachbesserung - widerlegt, beide Aufrufer uebergeben `annualData`,
    dessen `capeRatio` unveraendert `HISTORICAL_DATA[year].cape` ist.
11. Die Zielfixture habe still Faelle verloren - teilweise bestaetigt: acht
    vorher wie nachher, aber `dynamic_flex_cape_2010_2013` wurde durch
    `dynamic_flex_cape_legacy_step_2018_2025` ersetzt; siehe CR06-15.

### Wiederherstellungsnachweis (Runde 2)

Nach den Proben H, I, J, K und W:

```
5f8b2c54deef43f848efe3d4f52b0debabdf98f9199a2d6421f32b4339300ede  scripts/build-us-shiller-cape-chain.mjs
7c2c562dfef9c542a4d69f2ad13ab4f05126a649a07ab001fb58c9e0f70fdab3  tests/simulator-backtest-characterization.test.mjs
e8fa0672e69440667ccf058cd3b4e3d142a5b0fda2e246a732717a11b1dde334  tests/fixtures/simulator-backtest-target-v1.json
36683330c3ec208e58b543484a5ceccfa3cb813140b5f12971bfc52f070b3102  tests/fixtures/monte-carlo-measurement/post-backtest-data-06-v2.json
sha256sum -c: alle OK
git diff --check sauber
```

Ausser diesem Dokument habe ich keine Datei veraendert.

## Review-Ergebnis (Claude, Runde 2)

- **Status:** blockiert
- **Blocker:**
  - CR06-14: Die JST-abgeleiteten Lohnjahre 1925-1946 sind der groesste
    Datenwechsel dieses Slice und besitzen keinen Wirkungsnachweis; gemessen
    bis `-65.261,16 EUR` Endvermoegen, `+51.000 EUR` Entnahmen und ein Wechsel
    von zehn auf ein Kuerzungsjahr.
  - CR06-15: Der Abschnitt "Wirkungsnachweise" behauptet ein
    `cape_continuous`-Delta-Oracle und dessen Aufnahme in die V2-Deltafixture;
    beides existiert nach der Nachbesserung nicht mehr, und die Entfernung des
    Golden Case `dynamic_flex_cape_2010_2013` ist nicht offengelegt.
- **Restrisiken:** CR06-16, CR06-17, CR06-18, CR06-19; uebernommen aus
  Slice 05: CR05-5, CR05-9, CR05-10, CR05-12, CR05-14, CR05-16; ferner
  CR04-11, CR04-12, CR02-10, CR02-17, die nicht umgesetzte Abwertung 1948 und
  die ungetesteten Nahtjahre der Cash-Kette. Alle Quellenketten bleiben
  `not_validated`, die Monte-Carlo-Kandidaten `pending`.
- **Pre-Mortem:** In drei Monaten aendert jemand die Rentenfortschreibung oder
  die Kuerzungslogik und prueft die Wirkung an den vorhandenen Zeugen. Alle
  acht Golden Cases laufen mit `rentAdjMode: fix`, der einzige lohnindexierte
  Zeuge liegt in 2000-2005, wo die Jahresraten zwischen 1,4 und 2,7 Prozent
  schwanken. Der Bereich, in dem die Lohnreihe zwischen `-9,7` und `+26,5`
  Prozent springt und in dem ein Backtest von zehn auf ein Kuerzungsjahr
  kippen kann, wird von keinem Regressionsfall beruehrt. Der Fehler faellt
  erst auf, wenn ein Nutzer einen Vorkriegsstart mit lohngekoppelter Rente
  rechnet - also spaet und einzeln.

## Review-Nachbesserung Runde 2 (Codex)

**Stand:** 2026-08-01  
**Status:** CR06-14 bis CR06-19 technisch bearbeitet; erneutes externes
Review, Freigabe und Commit ausstehend.

### Technische Behandlung

- **CR06-14:** Die Golden Cases
  `wage_indexed_pension_jst_1930_1940` und
  `wage_indexed_pension_jst_1935_1946` vergleichen die JST-abgeleitete Reihe
  mit der abgeloesten konstanten 3-Prozent-Reihe. Der erste Fall reproduziert
  die Claude-Messung `-65.261,16 EUR` Endvermoegen, `+51.000 EUR` Entnahmen,
  `+2.408,26 EUR` Steuer und `7 -> 9` Kuerzungsjahre; der zweite
  `-48.418,44 EUR`, `+28.200 EUR`, `+5.003,92 EUR` und `10 -> 1`. Beide
  Outcomes bleiben `completed`, beide FlowDeltas null.
- **CR06-15:** Die unzutreffende Continuous-Aussage ist entfernt. Der alte
  Golden Case `dynamic_flex_cape_2010_2013` wurde durch
  `dynamic_flex_cape_legacy_step_2018_2025` ersetzt. Bestehende
  `cape_continuous`-Policytests bleiben davon unberuehrt, bilden aber kein
  Slice-06-Daten-Delta-Oracle.
- **CR06-16:** `CapeWageBacktestDeltaEvidenceV3` und die Traceability halten
  beide Ablösungsgruende fest. V1 uebernahm irrtuemlich `mean`/20 Jahre aus
  dem entfernten Continuous-Fall; V2 korrigierte auf die ausgelieferten
  Defaults `survival_quantile`/30 Jahre/0,85, mass aber den fruehen
  JST-Lohnwirkungsscope noch nicht. V1 und V2 bleiben unveraendert erhalten,
  V3 ist aktiv.
- **CR06-17:** Der Daten-, Manifest- und Inventarvertrag fuehrt geordnete,
  eindeutige Diskontinuitaeten 1925, 1945, 1947 und 1948. Das Jahr 1945 ist
  wegen der fehlenden Marktlohnbeobachtung `estimated`; 1946 bleibt letzter
  JST-Proxy vor der 1947er Quellennaht.
- **CR06-18:** Der Praezisionshinweis nennt fuer 1947-1955 korrekt 1,9-4,5
  und grenzt den fuer die 1947er Aenderung benoetigten 1946er Stand 1,8 ab.
  `scenarioInactiveVpwInputs` ersetzt die zu breite Bezeichnung
  `nonEffectiveVpwDiagnostics`; die Inaktivitaetsaussage gilt nur fuer den
  Fall mit deaktivierter Dynamic Flex.
- **CR06-19:** Browser-Smoke und Coverage wurden nach allen Aenderungen erneut
  ausgefuehrt.

### Abschlussgates Runde 2

- sieben read-only Quellen-/Toolchain-Verifikationen: gruen;
- fokussiert: Lohnkette 378/378, unabhaengiger Lohnoracle 184/184,
  Manifest 309/309, Dateninventar 376/376, historischer Backtestcontract
  172/172, Backtest-Charakterisierung 175/175 und Suite-Traceability
  1.098/1.098;
- `npm test`: 156 Dateien, 17.022/17.022 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles;
- `npm run test:browser`: 27/27 Workflows;
- `npm run test:coverage`: 77,88 Prozent gesamt; `cape-utils.js` 97,44 Prozent,
  generierte CAPE-/Lohnmodule jeweils 100 Prozent;
- `npm run docs:evidence`: gruen;
- produktiver/Konfigurationsscope: weiterhin genau zehn Dateien; keine
  Engine-, Dist- oder Release-Artefakte;
- `git diff --check`: gruen.

Diese Nachbesserung ist eine technische Implementerdokumentation und keine
Selbstfreigabe. Claude, Gemini oder der Nutzer muessen den Stand erneut
reviewen, bevor Commit oder Push erfolgen.

## Drittreview von Claude (Runde 3)

**Reviewdatum:** 2026-08-01  
**Reviewer:** Claude (Primary reviewer & Analyst)  
**Pruefstand:** Arbeitsbaum auf `codex/suite-datenintegritaet-hardening`, HEAD
`a7038e5`; Nachbesserung Runde 2 unverwaltet im Arbeitsbaum  
**Rolle:** adversariales Drittreview. Programmdateien wurden von mir nicht
dauerhaft geaendert; alle Messproben sind byteidentisch zurueckgerollt.

### Findings-Lifecycle

Alle neunzehn Findings aus Runde 1 und Runde 2 sind geschlossen. CR06-1 bis
CR06-13 waren bereits in Runde 2 verifiziert; die sechs Findings der zweiten
Runde habe ich in dieser Runde eigenstaendig nachgemessen.

| Finding | Status | Eigener Nachweis |
|---|---|---|
| CR06-14 | geschlossen | Die neuen Golden Cases `wage_indexed_pension_jst_1930_1940` und `wage_indexed_pension_jst_1935_1946` laufen mit `rentAdjMode: wage` und reproduzieren meine Round-2-Messung in **allen acht Kennzahlen ziffernidentisch**: `-65.261,16 EUR` / `+51.000 EUR` / `+2.408,26 EUR` / `7 -> 9` beziehungsweise `-48.418,44 EUR` / `+28.200 EUR` / `+5.003,92 EUR` / `10 -> 1`. Probe L (Vorher-Reihe von 3 auf 4 Prozent) beweist, dass der Zeuge live gerechnet und nicht aus der Fixture gelesen wird: "1930-1940 constant-wage baseline end wealth should stay exact (Expected 2735439.56, got 2746552.55)". |
| CR06-15 | geschlossen | Die unzutreffende `cape_continuous`-Aussage ist entfernt; die Ersetzung des Golden Case ist ausdruecklich als Ersetzung und nicht als Ergaenzung dokumentiert, und die verbleibende Continuous-Testabdeckung ist vom Slice-06-Daten-Delta abgegrenzt. Volltextsuche nach `2452466` und `2385899` im gesamten Test- und Dokumentationsbestand: kein Treffer mehr. |
| CR06-16 | geschlossen | `cape-wage-backtest-delta-v3.json` traegt einen `supersession`-Block; die Traceability nennt beide Abloesungsgruende ausformuliert (V1 behielt `horizonMethod=mean`/`horizonYears=20` aus dem entfernten Continuous-Fall, V2 mass den fruehen JST-Abschnitt nicht). Das erklaert die von mir gemessene Zahlendifferenz vollstaendig. |
| CR06-17 | geschlossen | `discontinuities` fuehrt 1925 (`start_boundary`), 1945 (`wartime_market_observation_break`), 1947 (`source_seam`, ausdruecklich ohne quellenuebergreifendes Levelverhaeltnis) und 1948 (`currency_reform_context`). Artefakt, Manifest und Inventar tragen dieselbe Liste, und der Kettentest prueft sie als Mengengleichheit. |
| CR06-18 | geschlossen | Der Praezisionshinweis nennt jetzt 1,9-4,5 fuer das Segment und grenzt den fuer 1947 benoetigten 1946er Stand 1,8 ausdruecklich ab; `nonEffectiveVpwDiagnostics` heisst jetzt `scenarioInactiveVpwInputs`, und das Ergebnisdokument stellt klar, dass `expectedReturnCape` nicht allgemein als wirkungslos gilt. |
| CR06-19 | geschlossen | Ich habe Browser-Smoke und Coverage selbst ausgefuehrt: **27/27** Smoke-Workflows gruen; Coverage gesamt **77,88 Prozent (38.781/49.799)**, `app/shared/cape-utils.js` **97,44 Prozent**, beide generierten Module **100 Prozent**, beide obligatorischen Dateigates bestanden. Alle vier Zahlen stimmen mit der Implementerdokumentation ueberein. |

### Nachgefahrene Gates

- `npm test`: **17.022/17.022** Assertions, null fehlgeschlagene Assertions,
  null fehlgeschlagene Dateien, null offene Handles.
- `npm run test:browser`: **27/27**.
- `npm run test:coverage`: gruen, Gesamt 77,88 Prozent, beide Dateigates
  bestanden.
- Quellen-Verify-Gates gruen und schreibfrei; `git status` danach unveraendert;
  `git diff --check` sauber.
- **Eigene Vollrekonstruktion der Lohnkette wiederholt:** eigener
  ZIP-Vorwaertsscan, eigener Zellenleser, eigene HTML-Auswertung; alle 101
  Werte, **Abweichung 0**. Die Werte sind gegenueber Runde 2 unveraendert; nur
  Klassifikation und Nahtvertrag wurden ergaenzt.
- CAPE-Wertehash `d1101958...` unveraendert, Goldkette `068a15a9...`
  unveraendert.

### Neue Findings

**CR06-20 - zwei Vertraege klassifizieren dieselben 21 Jahre
unterschiedlich.** Artefakt und Inventar fuehren 1925-1944 und 1946 als
`proxy` und nur 1945 als `estimated`. Das Laufzeitmanifest fuehrt in
`estimatedSegments` dagegen den gesamten Block 1925-1946 mit
`qualityStatus: 'estimated'`. Die Richtung ist konservativ, und der
Kettentest zementiert sie sogar (`estimatedSegments[0].endYear === 1946`),
aber die Konvention weicht innerhalb desselben Datensatzes ab: die Goldkette
fuehrt ihre Proxysegmente 1925-1944 und 1951-1967 gerade **nicht** in
`estimatedSegments`. Damit bedeutet die Nutzeroption "geschaetzte Historie
ausschliessen" fuer Lohn-Proxyjahre etwas anderes als fuer Gold-Proxyjahre.
Praktisch folgenlos, solange `ESTIMATED_HISTORY_CUTOFF_YEAR` bei 1951 steht;
die Divergenz ist nirgends als Absicht dokumentiert.

**CR06-21 - die neu deklarierte Quellennaht 1947 wird von keinem
Lohnmodus-Fall ueberschritten.** Der Vertrag verbietet ausdruecklich ein
quellenuebergreifendes Levelverhaeltnis an der Naht 1946/1947. Kein Golden
Case prueft das: `wage_indexed_pension_jst_1935_1946` endet exakt im letzten
JST-Jahr, `completed_numeraire_seam_1949_1952` laeuft mit `rentAdjMode: fix`.
Ich habe die Naht selbst vermessen: 1946-1952 im Lohnmodus zeigt **null
Abweichung** zwischen alter und neuer Reihe, 1944-1950 zeigt Wirkung
(`+42.719,18 EUR` Endvermoegen, `-20.400 EUR` Entnahmen, Kuerzungsjahre
`0 -> 1`) - aber ausschliesslich aus den Jahren 1945 und 1946. Die Naht selbst
ist also heute wirkungsneutral und genau deshalb ungeschuetzt: ein spaeterer
Verstoss gegen die eigene Nahtregel wuerde von keinem Fall aufgedeckt.

**CR06-22 - der Backtest rechnet weiterhin mit einem Wert, den der eigene
Vertrag als nicht beobachtbar bezeichnet.** 1945 traegt numerisch `+22,69 %`
und wird im Lohnmodus als volle Rentenanpassung angewandt, waehrend
`discontinuities[1945].treatment` festhaelt, der Wert sei "not claimed as an
observed German market-wage change". Im selben Datensatz haben Cash- und
Goldkette fuer genau diese Jahre ausdrueckliche Nichtbeobachtungsbruecken
erhalten. Die Entscheidung, hier stattdessen den JST-Wert zu behalten, ist
vertretbar und offengelegt, aber sie ist eine Fachentscheidung ohne
dokumentierte Begruendung und ohne Sensitivitaetsangabe. Der Fall
`wage_indexed_pension_jst_1935_1946` friert diese Wirkung ein, ohne sie als
Modellannahme zu kennzeichnen.

**CR06-23 - vier zerstoerte Zeichen im Ergebnisdokument.** Das Slice-Dokument
enthaelt an vier Stellen das Ersetzungszeichen `U+FFFD` statt eines Umlauts:
Zeile 83 (`unabh?ngige`, aus dem urspruenglichen Plan) sowie die Zeilen 364,
446 und 1015 (`Abl?sungsgruende` beziehungsweise `Abl?sungsgrund`), die alle
drei in der Nachbesserung von Runde 2 entstanden sind. Das ist kein
Darstellungsproblem, sondern Informationsverlust: die Originalzeichen sind aus
der Datei verschwunden. Das Dokument verwendet sonst durchgehend
ASCII-Transliteration (`ue`, `ae`, `oe`), sodass es sich um einen
unbeabsichtigten Encoding-Roundtrip handelt. Das Gate `npm run docs:evidence`
lief gruen und faengt diesen Fall folglich nicht.

### Geprueft und verworfen (Runde 3)

1. Die Lohnwerte haetten sich durch die Umklassifikation veraendert -
   widerlegt, eigene Rekonstruktion aller 101 Werte, Abweichung 0.
2. Die neuen Lohnzeugen seien aus der Fixture abgeschrieben - widerlegt durch
   Probe L.
3. Die Vorher-Reihe der neuen Zeugen sei nicht die abgeloeste Annahme -
   widerlegt, `beforeProvider.annualGrowthPct` ist fuer alle 22 Jahre exakt 3
   und traegt `supersededAssumption: constant_3_percent_1925_1946`.
4. Ein Golden Case sei bei der Erweiterung verloren gegangen - widerlegt, acht
   bestehende Faelle plus zwei neue.
5. Die `cape_continuous`-Behauptung stehe noch irgendwo - widerlegt,
   Volltextsuche ohne Treffer.
6. Die V3-Fixture sei erneut selbstreferenziell - widerlegt, `backtest-target`
   verweist auf V3, V3 selbst traegt `expectedDelta: none`.
7. Die Diskontinuitaeten seien nur Text ohne Gate - widerlegt, der Kettentest
   vergleicht Jahr und Typ als Mengengleichheit, das Inventar spiegelt sie.
8. Die Coverage- und Browserangaben seien uebernommen statt gemessen -
   widerlegt, ich habe beide Gates selbst ausgefuehrt; alle vier genannten
   Prozentwerte stimmen.
9. Der Nahtvertrag 1947 sei durch einen bestehenden Fall abgedeckt - nicht
   widerlegt, sondern bestaetigt als Luecke; siehe CR06-21.
10. Die Umklassifikation von 1945 habe den Monte-Carlo-Filter verschoben -
    widerlegt, `ESTIMATED_HISTORY_CUTOFF_YEAR` bleibt die harte Konstante 1951.

### Wiederherstellungsnachweis (Runde 3)

Nach den Proben L und P:

```
ad7505e6df12715020fabbbfc1c58fb9cedc4e7b76c481c607793b38f7921a74  tests/simulator-backtest-characterization.test.mjs
fa96a6796814f1d99f4fa26dec4583742fef450fee4aed20b3a46be32c7e9be7  scripts/build-german-gross-wage-growth-chain.mjs
b57777da5441665e7da96b46dc77d6e30eaf979f6147dc2d987aee97bccf093d  app/simulator/german-gross-wage-growth-chain.js
sha256sum -c: alle OK
git diff --check sauber
```

Ausser diesem Dokument habe ich keine Datei veraendert.

## Review-Ergebnis (Claude, Runde 3)

- **Status:** freigegeben
- **Blocker:** keine. CR06-1 bis CR06-19 sind geschlossen und einzeln
  nachgemessen.
- **Auflagen vor Slice 07:** CR06-21 (ein Lohnmodus-Fall, der die Naht
  1946/1947 ueberschreitet) und CR06-22 (dokumentierte Begruendung fuer die
  Beibehaltung des 1945er JST-Werts im Lohnpfad).
- **Restrisiken:** CR06-20, CR06-23; uebernommen aus Slice 05: CR05-5, CR05-9, CR05-10,
  CR05-12, CR05-14, CR05-16; ferner CR04-11, CR04-12, CR02-10, CR02-17, die
  nicht umgesetzte Abwertung 1948 und die ungetesteten Nahtjahre der
  Cash-Kette. Alle Quellenketten bleiben `not_validated`, die
  Monte-Carlo-Kandidaten `pending`. Die wirtschaftliche Eignung der
  CAPE-Stufenschwellen 15/30/35 und der `cape_continuous`-Kurve ist weiterhin
  nicht fachlich reviewt.
- **Pre-Mortem:** In drei Monaten aendert jemand die Behandlung der
  Quellennaht 1946/1947 - etwa indem er das vom Vertrag verbotene
  quellenuebergreifende Levelverhaeltnis doch berechnet, um den Sprung
  zwischen JST-Level und Destatis-Index zu "glaetten". Kein Regressionsfall
  faellt aus: der einzige Lohnmodus-Zeuge in diesem Bereich endet 1946, und
  meine Messung zeigt, dass ein Fenster 1946-1952 heute null Abweichung
  liefert, also auch keinen Ankerwert besitzt. Der Fehler wandert still in
  jede lohngekoppelte Rente, deren Backtest die Nachkriegsjahre kreuzt, und
  faellt erst auf, wenn jemand die Rentenhoehe 1947 gegen eine externe Quelle
  haelt.

Die Freigabe betrifft den technischen Stand. Commit, Push und Programmfreigabe
bleiben Nutzerentscheidung.
