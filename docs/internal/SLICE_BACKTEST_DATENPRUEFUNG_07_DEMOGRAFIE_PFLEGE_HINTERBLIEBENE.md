# Slice 07 - Demografie-, Pflege- und Hinterbliebenendaten

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Entscheidung:** dauerhafte Nutzerentscheidung vom 2026-07-29 fuer
Slice 02 bis 13; kein neuer Feature-Branch  
**GitHub-Status:** Remote `origin` ist vorhanden; fuer den aktiven Branch ist
kein Upstream konfiguriert  
**Basiscommit:** `02f39f9`  
**Status:** CR07-1 bis CR07-3 technisch nachgebessert und selbstgeprueft;
erneutes externes Review ausstehend  
**Freigabe:** ausstehend; Codex nimmt keine Selbstfreigabe vor

## Input aus dem Ergebnisdokument von Slice 06

Das vollstaendige Ergebnisdokument
`SLICE_BACKTEST_DATENPRUEFUNG_06_CAPE_LOHN_RENTENFORTSCHREIBUNG.md`
ist die verbindliche Eingangsgrenze. Slice 06 ist durch Claudes Drittreview
vom 2026-08-01 technisch freigegeben und als lokaler Commit `02f39f9`
vorhanden.

Vor der eigentlichen Demografie-/Pflege-/Hinterbliebenenarbeit werden die
beiden ausdruecklichen Auflagen des Slice-06-Reviews geschlossen:

- **CR06-21:** Ein lohnindexierter Backtestfall muss die Quellennaht
  1946/1947 ueberschreiten und belegen, dass fuer 1947 die publizierte
  Destatis-Jahresrate ohne quellenuebergreifendes Levelverhaeltnis verwendet
  wird.
- **CR06-22:** Die Beibehaltung des JST-Werts 1945 im Lohnpfad wird als
  bewusste Kriegsjahres-Modellannahme begruendet. Sie darf nicht als
  beobachtete deutsche Marktlohnveraenderung oder amtliche
  Rentenanpassungsrate erscheinen.

Die Restrisiken CR06-20 und CR06-23 sowie uebernommene Restrisiken werden
nicht still als Slice-07-Scope umgedeutet. Sie bleiben fuer Review und
spaetere Bereinigung sichtbar.

## Preflight vor Coding

**Gemessen am:** 2026-08-01  
**Aktiver Branch:** `codex/suite-datenintegritaet-hardening`  
**HEAD:** `02f39f9 feat(simulator): implement slice 06 us shiller cape and german wage growth chain`  
**Arbeitsbaum:** sauber (`git status --short` ohne Ausgabe)  
**Unerwartete Dateien:** keine  
**Branchstatus:** kein Upstream konfiguriert; die dokumentierte dauerhafte
Nutzerentscheidung erlaubt die lokale Fortsetzung auf diesem Branch

## Diff-Risiko

Geplante produktive Programm- und Konfigurationsdateien:

- `app/simulator/german-demography-care-survivor-contract.js` (generiert,
  neu);
- `app/simulator/simulator-data.js`;
- `app/simulator/simulation-data-inventory.js`;
- `app/simulator/monte-carlo-runner.js`;
- `Simulator.html`;
- `scripts/build-german-demography-care-survivor-contract.mjs` (neu);
- `scripts/build-german-gross-wage-growth-chain.mjs` (CR06-22-Vorgate);
- `app/simulator/german-gross-wage-growth-chain.js` (generiertes
  CR06-22-Vorgate);
- `package.json`.

Geplante Tests, Fixtures, Daten und Dokumentation:

- gepinnte amtliche Destatis-Periodensterbetafel samt Lizenz- und Hashgrenze;
- gepinnte amtliche Pflege-Bestandsstatistik als Validierungsreferenz, nicht
  als individuelle Uebergangstabelle;
- reproduzierbarer Generator und davon getrennter Quellenoracle;
- Markerprofile fuer Alter/Geschlecht, Pflegeeintritt/-verlauf und
  Hinterbliebenenleistung;
- CR06-21-Nahtfall und CR06-22-Begruendung;
- Inventar-, Monte-Carlo-, Worker-, Backtest- und Dokumentationsgates;
- Dokumentations-Sync in Hauptplan, Datenquellen, Technik,
  Simulator-Modulreferenz, Testreferenz und README.

Voraussichtliche Aenderungstiefe:

- **hoch** fuer Monte-Carlo- und Sweep-Ergebnisse, wenn die bislang
  unbelegte Sterbetafel durch eine aktuelle amtliche Periodentafel ersetzt
  wird;
- **mittel** fuer Pflegepfade, weil die heutige Praevalenz-zu-Inzidenz-
  Annaeherung fachlich neu klassifiziert und maschinenlesbar begrenzt wird;
- **klein** fuer historische Single-Path-Backtests ohne stochastische
  Lebensereignisse; dort duerfen sich Finanzmetriken und FlowDelta nicht
  aendern.

Gefaehrdete bestehende Tests:

- Mortalitaets-, Lebensdauer-, Monte-Carlo-, Sweep- und Worker-Paritaetstests;
- Pflege-Metadaten-, Pflege-KPI- und Health-Bucket-Tests;
- Dateninventar-, Monte-Carlo-Messvertrag- und Exportprovenienztests;
- Slice-06-Lohnketten- und Backtest-Charakterisierungstests.

Nicht anfassen:

- Engine-, Steuer-, Runway-, Mindest-Flex- und Transaktionssemantik;
- Pflegekosten-, Floor-, Flex- und Health-Bucket-Formeln;
- gesetzliche Anspruchsberechnung oder Einkommensanrechnung der
  Hinterbliebenenrente;
- `minimumFlexAnnual` und seine Parameternamen;
- historische Markt-, VPI-, Cash-, Gold-, CAPE- und Lohnwerte ausserhalb der
  beiden Slice-06-Vorgates;
- `engine.js`, `dist/` und `RuheStandSuite.exe`;
- unveraenderliche historische Eingangsfixtures.

Rollback-Strategie:

- geaenderte versionierte Dateien gezielt mit
  `git checkout -- <datei...>` auf Basiscommit `02f39f9` zuruecksetzen;
- neu angelegte Dateien nur nach ausdruecklicher Freigabe entfernen;
- keine Hard-Resets oder sonstigen destruktiven Git-Kommandos.

Die neun produktiven Programm-/Konfigurationsdateien bleiben unter der
Stop-Grenze von mehr als zehn Dateien. Eine zehnte produktive Datei bleibt
zulaessig; eine elfte stoppt die Umsetzung.

## Ziel

Die stochastischen Lebensereignisse des Simulators erhalten einen
versionierten, reproduzierbaren Daten- und Modellvertrag. Die Runtime nutzt
eine klar bezeichnete deutsche Periodensterbetafel nach Alter und
statistischem Geschlecht. Pflege-Bestandsquoten, modellierte individuelle
Eintrittswahrscheinlichkeiten, Pflegegrad-Progression, Pflegedauer und
Mortalitaetsmultiplikatoren bleiben strikt getrennte Groessen.

Die Hinterbliebenenoption bleibt eine vereinfachte, frei konfigurierbare
Cashflow-Modellannahme. Der Default von 55 Prozent wird als Orientierung an
der grossen Witwen-/Witwerrente dokumentiert, aber weder als automatische
Anspruchspruefung noch als vollstaendige Abbildung des SGB-VI-Vertrags
ausgegeben.

## Scope

- Sterbetafeljahr, Perioden-/Kohortenabgrenzung, Alter und Geschlecht;
- Pflegeinzidenz, beobachtete Pflege-Bestandsquoten,
  Pflegegradverteilung/-progression und Pflegedauer;
- Hinterbliebenen-/Witwenparameter und ihre vereinfachte Runtime-Semantik;
- Quellen-, Versions-, Lizenz-, Abruf- und Hashvertrag;
- Runtimeprojektion ausschliesslich aus einem tief eingefrorenen Datenvertrag;
- Markerprofile fuer Alter, Geschlecht, Pflege und Hinterbliebene;
- CR06-21 und CR06-22 als vorgeschaltete Gates;
- Dokumentations-Sync.

## Nicht im Scope

- Kohortensterbetafel oder zukuenftige Mortalitaetsverbesserung;
- medizinische Individualprognose oder Korrelation zwischen Partnern;
- Ableitung individueller Pflegeeintritte direkt aus amtlichen
  Bestandsquoten;
- vollstaendiges Mehrzustandsmodell mit Genesung, Rueckstufung und Tod;
- gesetzliche Berechnung kleiner/grosser Witwenrente, Sterbevierteljahr,
  Einkommensanrechnung, altes Recht oder Wiederheirat;
- Aenderung der finanziellen Engine-Semantik, Engine-Bundle oder Releasebau.

## Akzeptanzkriterien

1. Die Runtime-Sterblichkeit nennt Quelle, Tabellenperiode, Region, Alter,
   Geschlecht, Einheit, Abrufstand, Lizenz und Rohdatenhash.
2. Periodensterblichkeit wird maschinenlesbar als Momentaufnahme ohne
   kuenftige Mortalitaetsverbesserung abgegrenzt; sie wird nicht als
   Kohortensterblichkeit bezeichnet.
3. Alle Runtime-Alter sind lueckenlos belegt oder besitzen einen expliziten,
   fail-closed Randvertrag. Divers bleibt eine offengelegte Modellableitung
   und keine amtliche dritte Sterbetafel.
4. Amtliche Pflegequoten/-gradanteile bleiben beobachtete Bestandsdaten. Sie
   werden weder direkt noch durch blosses Dividieren durch eine angenommene
   Dauer als amtliche individuelle Jahresuebergangswahrscheinlichkeit
   ausgegeben.
5. Pflegeeintritt, Progression, Dauer, Kosten und
   Mortalitaetsmultiplikatoren sind getrennt klassifiziert; jede
   Modellannahme bleibt als solche sichtbar.
6. Hinterbliebenenparameter sind als vereinfachter Nutzervertrag mit
   Versionsstand dokumentiert; der 55-Prozent-Default erhebt keinen Anspruch
   auf eine vollstaendige gesetzliche Leistungsberechnung.
7. Markerprofile beweisen mindestens: Mann/Frau/divers an mehreren
   Altersmarkern, Pflegeeintritt unter/ab Mindestalter, Pflegegradverlauf,
   akute/chronische Dauer sowie Partner-Tod und Hinterbliebenenleistung.
8. CR06-21 besitzt einen lohnindexierten Nahtzeugen ueber 1946/1947;
   CR06-22 ist im Quellenvertrag begruendet.
9. Historische Single-Path-Referenzfaelle, die weder stochastische
   Lebensereignisse ziehen noch die Sterbetafel deterministisch fuer einen
   `survival_quantile`-Horizont konsumieren, behalten Outcome,
   Finanzmetriken und `portfolio_flow_delta`. Die Sterbetafelwirkung des
   aktiven Dynamic-Flex-Falls wird dagegen als erwartetes Delta gemessen.
10. Erwartete Monte-Carlo-/Sweep-Deltas werden neu gemessen und als
    datenbedingte Aenderung dokumentiert; unerwarteter Outcomewechsel oder
    auffaelliger FlowDelta stoppt den Slice.
11. Alle Quellen-Verify-Gates und `npm test` sind gruen; Codex erteilt keine
    Selbstfreigabe.

## Stop-Regeln

Der Slice stoppt vor weiterer Umsetzung, wenn:

- die amtliche Sterbetafel oder Pflege-Referenz nicht reproduzierbar gepinnt
  und lizenziert werden kann;
- fuer die Runtime eine Kohorten- statt der geplanten Periodensemantik
  notwendig waere;
- beobachtete Pflege-Bestandsquoten als individuelle Transition verwendet
  werden muessten;
- mehr als zehn produktive Programm-/Konfigurationsdateien erforderlich sind;
- bestehende Engine-Semantik geaendert werden muesste;
- Snapshot-/Backtest-Ergebnisse unerwartet abweichen oder `FlowDelta`
  auffaellig wird;
- Tests nicht ausfuehrbar oder nicht sinnvoll ersetzbar sind;
- UI und Engine unterschiedliche Parameternamen verwenden;
- `minimumFlexAnnual` irgendwo still begrenzt statt validiert wird.

## Geplante Tests

- CR06-21-Lohnnaht-Golden-Case und Generatorgate fuer CR06-22;
- Demografie-/Pflege-/Hinterbliebenen-Generator-Build und schreibfreies
  Verify-Gate;
- unabhaengige Vollrekonstruktion der Runtime-Sterbewahrscheinlichkeiten aus
  der gepinnten Destatis-Quelle;
- Quellenhash-, Perioden-/Kohorten-, Alters-, Geschlechts-, Freeze- und
  Wertehashgates;
- Pflege-Bestands-/Transitions-Trennung und Wahrscheinlichkeitsgrenzen;
- deterministische Markerprofile fuer Pflege, Tod und Hinterbliebene;
- Inventar-, Monte-Carlo-, Sweep-, Worker-, Backtest- und
  Suite-Traceability-Gates;
- abschliessend alle Quellen-Verify-Gates, `npm test`, `npm run test:browser`,
  `npm run test:coverage`, `npm run docs:evidence` und `git diff --check`.

## Durchgefuehrte Aenderungen

- Der amtliche Destatis-Bericht `Statistischer Bericht Sterbetafeln
  2023/2025` (EVAS 12621), Tabellen `12613-b01` und `12613-b02`, sowie die
  amtliche Pflegestatistik 2023 wurden als unveraenderliche
  Original-Arbeitsmappen gepinnt. Die SHA-256-Hashes lauten
  `fbc46083d581e5978c679600875164bcc5af0565a9eb33c57bf33d44ca87aadc`
  beziehungsweise
  `a8088d8e95964c5ffade848b9f303d000dc499519512f66f92ee6b8d60aa4280`.
- Der neue Generator erzeugt den tief eingefrorenen
  `GermanDemographyCareSurvivorContractV1` mit Revision `2026-08-01.1`.
  Der kombinierte Rohdatenhash ist
  `a21bab59269970d29f1e15ad49b64e82a74348692cc38759e4339e1be1205fc3`,
  der Sterbetafelhash
  `88c1000eac950016a65e7408127d5c1256683946933b710a0c28f672fde5f232`.
- Die Runtime verwendet fuer Mann und Frau die amtlichen
  Einjahres-Sterbewahrscheinlichkeiten von Alter 18 bis 100. Alter 101 bis
  110 ist als beibehaltenes Modellende gekennzeichnet; `divers` ist als
  ungewichteter Modellmittelwert offengelegt. Perioden- und Kohortenvertrag
  sowie fehlende kuenftige Mortalitaetsverbesserung sind maschinenlesbar.
- Die Pflege-Bestandsquoten und Pflegegradzahlen bleiben reine
  Beobachtungs-/Validierungsdaten. Pflegeeintritt, Progression und Dauer sind
  getrennte Modellannahmen; die zuvor unzutreffend behauptete
  `Praevalenz / 4`-Ableitung wurde entfernt. Kosten und
  Mortalitaetsmultiplikatoren blieben unveraendert und ausserhalb des
  Datenvertrags.
- Der Hinterbliebenenvertrag dokumentiert den Runtime-Default
  `percent = 55` als vereinfachten Nutzer-Cashflow. Anspruchspruefung,
  Sterbevierteljahr, Einkommensanrechnung, altes Recht und Wiederheirat sind
  ausdruecklich ausgeschlossen. Der Inventar-Default wurde an den bereits
  ausgewaehlten UI-/Runtime-Modus `percent` angeglichen.
- Runtime, Dateninventar (Revision `2026-08-01.5`), Monte-Carlo-Diagnostik und
  UI-Hinweise konsumieren beziehungsweise benennen denselben Vertrag. Der
  Monte-Carlo-Export traegt die kompakten Vertrags- und Wertehashes unter
  `samplingDiagnostics.modelContracts.demographyCareSurvivor`.
- CR06-21 ist durch den neuen lohnindexierten Golden Case 1944 bis 1950
  geschlossen. CR06-22 ist als explizite 1945-Modellbehandlung mit
  Beibehaltungsgrund und Nullbruecken-Sensitivitaet im Lohnvertrag verankert;
  der Lohnwertehash blieb unveraendert.
- `demography-care-survivor-backtest-delta-v1.json` bindet den Basiscommit,
  das Slice-06-Ergebnisdokument und die unveraenderte Slice-06-Deltafixture
  per SHA-256. Das Suite-Traceability-Gate akzeptiert die aktive
  Backtest-Zielfixture nur noch mit `backtest_data_07`-Evidenz.

## Ausgefuehrte Tests

- `tests/german-demography-care-survivor-contract.test.mjs`: 67/67
  Assertions.
- `tests/german-demography-care-survivor-source-reconstruction.test.mjs`:
  696/696 Assertions; unabhaengige Rekonstruktion aller amtlichen
  Runtime-Sterbewerte und Pflege-Marker aus den gepinnten XLSX-XML-Daten.
- `tests/german-gross-wage-growth-chain.test.mjs`: 382/382 Assertions.
- `tests/simulation-data-inventory.test.mjs`: 372/372 Assertions.
- `tests/simulator-backtest-characterization.test.mjs`: 193/193 Assertions
  und elf Golden Cases.
- `tests/demography-care-survivor-runtime-measurement.test.mjs`: gruen;
  reproduziert denselben 2.048-Run-/40-Jahres-Fall mit festem Seed auf dem
  unveraenderlichen Slice-06-Basiscommit und dem Slice-07-Arbeitsstand.
- Gezielte Pflege-, Mortalitaets-, Eingabeleser-, Simulation-,
  Monte-Carlo-, Worker-/Messvertrags- und Suite-Traceability-Tests: gruen.
- Alle sieben schreibfreien historischen Quellen-Verify-Gates einschliesslich
  `verify:german-demography-data`: gruen.
- `npm test`: 159 Dateien, 17.855/17.855 Assertions, keine fehlgeschlagene
  Datei.
- `npm run test:browser`: 27/27 Workflows gruen.
- `npm run test:coverage`: 17.855/17.855 Assertions, 78,10 Prozent
  approximative V8-Zeilenabdeckung; beide verpflichtenden Datei-Coverage-Gates
  bestanden.
- `npm run docs:evidence`: gruen; 69 MKT-, 55 FOR- und 17 MAP-Nachweise.
- `git diff --check`: gruen.

## Abweichungen vom Plan

- Der vorab als klein eingeschaetzte historische Single-Path-Scope enthaelt
  einen deterministischen Sterbetafelverbrauch: Der aktive Dynamic-Flex-Fall
  2018 bis 2025 leitet seinen `survival_quantile`-Horizont aus der
  Sterbetafel ab. Der direkte Slice-06-zu-Slice-07-Vergleich ergibt fuer
  Endvermoegen `-19.225,84 EUR`, Entnahmen `+3.000 EUR`, Steuer
  `+1.124,01 EUR` und Runway-Deckung `-3,740149` Prozentpunkte. Der
  CAPE-inaktive Referenzarm verschiebt sich um `+12.940,41 EUR`,
  `-24.000 EUR`, `+4.458,88 EUR` und `-2,543821` Prozentpunkte. Outcome bleibt
  jeweils `completed`, maximaler `portfolio_flow_delta` bleibt null. Die
  weiterhin separat geprueften Werte `+24.483,08 EUR`, `-3.000 EUR`,
  `-3.455,06 EUR` und `+9,287973` Prozentpunkte sind der CAPE-an/aus-Vergleich
  innerhalb des Slice-07-Arbeitsstands und keine Sterbetafelwirkung.
- Die neun uebrigen bereits vorhandenen Golden Cases blieben unveraendert.
  Der elfte Fall ist der neue
  CR06-21-Nahtzeuge 1944 bis 1950.
- Pflege- und Hinterbliebenenmodelle verursachen im historischen
  Single-Path-Backtest kein Delta, weil dort weder Pflegeeintritt noch
  Partnertod gezogen werden. Der neue Kandidat
  `post-backtest-data-07-v1` misst deshalb Monte Carlo und zwei Sweep-
  Kombinationen mit 2.048 Runs, 40 Jahren, festem Seed sowie aktivem Pflege-,
  Partner- und Hinterbliebenenpfad. Gegen den reproduzierten Slice-06-Stand
  sinken die Lebensdauerquantile P10/P50/P90 um 2/1/1 Jahre, das mediane
  nominale MC-Endvermoegen um `105.797,440633 EUR` und die Zahl der Runs mit
  Pflege um 52. Der 50-Prozent-Aktien-Sweep zeigt dasselbe Median-Delta;
  Witwenjahre P1/P2 verschieben sich um -598/+1.933. Die Fixture bindet 40
  numerische Deltas und bleibt bis zum externen Review `pending`.

## Offene Risiken

- Eine aktuelle Periodensterbetafel unterschätzt bei langfristig sinkender
  Sterblichkeit moeglicherweise die Lebensdauer juengerer Kohorten.
- Pflege-Bestandsstatistiken liefern ohne Laengsschnittdaten keinen direkten
  individuellen Eintritts- oder Progressionsvertrag.
- Der vereinfachte Hinterbliebenen-Cashflow bildet gesetzliche
  Anspruchsvoraussetzungen und Einkommensanrechnung bewusst nicht ab.
- Die Restrisiken aus dem Slice-06-Ergebnisdokument bleiben bestehen, soweit
  sie nicht als CR06-21/CR06-22 ausdrueckliche Vorgates sind.

## Rueckdokumentation

Nach technischer Umsetzung werden Status, Quellenvertrag, Markerprofile,
Wirkungsnachweise und Testergebnisse in
`BACKTEST_2000_2025_DATENPRUEFUNG.md` rueckdokumentiert.

## Freigabestatus

Die drei Blocker CR07-1 bis CR07-3 sind technisch nachgebessert und
selbstgeprueft. Erneutes externes Review, Freigabe und Commit sind ausstehend.
Codex nimmt keine eigene Review-Freigabe vor.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| CR06-21 | Claude-Review Slice 06 Runde 3 | Kein Lohnmodus-Fall ueberschreitet die Quellennaht 1946/1947 | angenommen | Golden Case 1944 bis 1950 und Generatorgate technisch umgesetzt |
| CR06-22 | Claude-Review Slice 06 Runde 3 | Beibehaltung des 1945er JST-Werts im Lohnpfad ist fachlich unbegruendet | angenommen | Beibehaltungsgrund, Modellstatus und Nullbruecken-Sensitivitaet technisch umgesetzt |
| CR07-1 | Claude-Review (Runde 1) | Dokumentierte Sterbetafelwirkung ist die falsche Vergleichsgroesse und hat bei drei von vier Kennzahlen das falsche Vorzeichen | angenommen | Slice-06-zu-Slice-07-Oracles fuer aktiven und Referenzarm technisch umgesetzt; CAPE-an/aus-Wirkung getrennt benannt |
| CR07-2 | Claude-Review (Runde 1) | Keine Monte-Carlo-/Sweep-Messung, obwohl die Sterbetafel praktisch nur stochastisch wirkt (AK 10 unerfuellt) | angenommen | reproduzierbare 2.048-Run-MC-/Sweep-Messfixture `post-backtest-data-07-v1` technisch umgesetzt; externes Review ausstehend |
| CR07-3 | Claude-Review (Runde 1) | Quellenreihe als "Allgemeine Sterbetafel" bezeichnet; gepinnt ist der jaehrliche Statistische Bericht "Sterbetafeln 2023/2025" | angenommen | Maschinenname auf Statistischen Bericht, EVAS 12621 und Tabellen 12613-b01/b02 korrigiert und getestet |
| CR07-4 | Claude-Review (Runde 1) | Inventar fuehrt die modellkontaminierte Sterbetafel und die Pflegetaxonomie als `official` | offen | ausstehend |
| CR07-5 | Claude-Review (Runde 1) | Zwei divergierende Hinterbliebenen-Defaults; nur einer ist dokumentiert und keiner gegen den Reader gepinnt | offen | ausstehend |
| CR07-6 | Claude-Review (Runde 1) | Gepinnte Pflegequoten sind als `validation_only` deklariert, es findet aber keine Validierung statt | offen | ausstehend |
| CR07-7 | Claude-Review (Runde 1) | `minimumEntryAge: 65` erzeugt strukturelle Nullwahrscheinlichkeit vor 65 gegen die eigene gepinnte Quelle | offen | ausstehend |
| CR07-8 | Claude-Review (Runde 1) | AK 3 an der Altersuntergrenze unerfuellt: fehlende Alter liefern still `qx = 1` statt eines expliziten Randvertrags | offen | ausstehend |
| CR07-9 | Claude-Review (Runde 1) | Vertrag deklariert `eligibleInitialGrades` und `minimumEntryAge`, die die Runtime nicht liest | offen | ausstehend |
| CR07-10 | Claude-Review (Runde 1) | Geschlechtsspalte der Quelle bleibt in Generator und Quellenoracle ungenutzt | offen | ausstehend |
| CR07-11 | Claude-Review (Runde 1) | Die im Lohnvertrag verlangte Nullbruecken-Sensitivitaet wird nirgends ausgefuehrt | offen | ausstehend |
| CR07-12 | Claude-Review (Runde 1) | Kleinere Vertragsmaengel: Leerzeichen in `yearConvention`, undeklarierter Nenner in `sharesPctByGrade`, positionsbasierte Zeilenadressierung | offen | ausstehend |
| CR07-13 | Claude-Review (Runde 2) | Das neue Laufzeit-Messgate ist faktisch plattform- und Node-gebunden, deklariert das aber nicht und vergleicht den Runtimeblock ueberhaupt nicht | offen | ausstehend |
| CR07-14 | Claude-Review (Runde 2) | Die Quellseite der Messung ist ausserhalb der Fixture nicht verankert; beide Deltahashes stammen aus derselben Datei | offen | ausstehend |
| CR07-15 | Claude-Review (Runde 2) | Das Messprofil daempft die Pflege-Mortalitaetskopplung gegenueber den ausgelieferten Defaults und entkoppelt den Hinterbliebenenwert vom Vertrag | offen | ausstehend |

## Review-Feedback von Gemini

Ausstehend.

## Review-Feedback von Claude

**Reviewdatum:** 2026-08-01
**Reviewrunde:** 1
**Pruefstand:** Arbeitsbaum auf Basiscommit `02f39f9`, 27 geaenderte oder neue
Eintraege laut `git status --short`; HEAD wurde nicht veraendert.
**Reviewerstatus:** blockiert

### Verifikationsbasis

Alle Zahlen dieses Abschnitts sind eigenstaendig gemessen, nicht aus dem
Slice-Dokument uebernommen.

- Eigener XLSX-Leser (Vorwaertsscan ueber lokale ZIP-Header statt Central
  Directory, eigener sequentieller XML-Tokenizer, eigene Sharedstring- und
  Spaltenaufloesung), unabhaengig vom Generator und vom mitgelieferten
  Quellenoracle.
- Vollrekonstruktion aller amtlichen Runtime-Sterbewahrscheinlichkeiten:
  166 Werte fuer Alter 18 bis 100 und beide amtlichen Geschlechter,
  **Abweichung 0**, maximale Einzelabweichung 0.
- Fernere Lebenserwartung mit 65 aus der Quelle: `17.974645137784975` (m) und
  `21.100266082940671` (w); beide stimmen ziffernidentisch mit
  `officialLifeExpectancyAt65Years`.
- Ableitung `divers`: 93 Alter geprueft, Abweichung 0 gegen den ungewichteten
  Mittelwert.
- Modellrand 101 bis 110: byteidentisch zum Stand vor dem Slice, fuer m und w.
- Naht 100 zu 101: Faktor 1,0996 (m) und 1,1387 (w); im Bereich 30 bis 100
  ist die Tafel fuer beide Geschlechter streng monoton steigend, und
  `qx(m) > qx(w)` gilt an allen 83 Altern.
- Pflegestatistik: alle 21 Pflegequoten-Marker, alle fuenf Pflegegradzahlen,
  Gesamtbestand `5688473` und `bisher ohne Zuordnung` `2097` unabhaengig
  reproduziert, Abweichung 0. Spaltenindex 8 ist verifiziert die Spalte
  `Pflegequote` in Prozent.
- Eigene Gate-Laeufe: `npm test` 17.795/17.795 Assertions, 0 fehlgeschlagen,
  0 offene Handles; `npm run test:browser` 27/27; `npm run test:coverage`
  gesamt 77,89 Prozent (38.818/49.836), beide Datei-Gates bestanden, die
  beiden generierten Module bei 100 Prozent; `npm run docs:evidence` gruen mit
  69 MKT-, 55 FOR- und 17 MAP-Nachweisen; alle sieben Quellen-Verify-Gates
  gruen und schreibfrei; `git diff --check` sauber. Die im Slice genannten
  Einzelzahlen 66, 696, 382, 371 und 183 Assertions habe ich je Datei
  nachgefahren und bestaetigt.

### Gepruefte Dimensionen

Korrektheit, Vertragstreue, Fehlerbehandlung, Seiteneffekte und Bruchszenarien
wurden systematisch abgearbeitet. Die Befunde folgen.

### Blockierende Findings

**CR07-1 (blockierend): Die dokumentierte Sterbetafelwirkung ist die falsche
Vergleichsgroesse und hat bei drei von vier Kennzahlen das falsche Vorzeichen.**

Der Abschnitt "Abweichungen vom Plan" und die Rueckdokumentation in
`BACKTEST_2000_2025_DATENPRUEFUNG.md` nennen `+24.483,08 EUR`, `-3.000 EUR`,
`-3.455,06 EUR` und `+9,287973` Prozentpunkte "gegen die Slice-06-Basis". Das
sind die Deltas des `capeLegacyStepDeltaOracle`, also der Vergleich
CAPE-aus gegen CAPE-an, beide Seiten bereits unter der neuen Sterbetafel
gerechnet. Sie beschreiben die CAPE-Wirkung, nicht die Slice-07-Wirkung.

Die tatsaechliche Veraenderung des freigegebenen Golden Case
`dynamic_flex_cape_legacy_step_2018_2025` zwischen Slice 06 und Slice 07,
gemessen an `tests/fixtures/simulator-backtest-target-v1.json` und den beiden
Delta-Fixtures:

| Kennzahl | Slice 06 | Slice 07 | Slice-07-Wirkung |
|---|---|---|---|
| `summaryEndWealth` | 2.783.336,86 | 2.764.111,02 | **-19.225,84 EUR** |
| `totalWithdrawal` | 771.000 | 774.000 | **+3.000 EUR** |
| `totalTax` | 95.006,65 | 96.130,66 | **+1.124,01 EUR** |
| `minRunwayCoveragePct` | 72,719865 | 68,979716 | **-3,740149 pp** |

Drei der vier Vorzeichen sind gegenlaeufig zur Dokumentation. Zusaetzlich
bewegt sich der CAPE-aus-Referenzarm desselben Oracles voellig
undokumentiert: Endvermoegen `+12.940,41 EUR`, Entnahmen `-24.000 EUR`,
Steuer `+4.458,88 EUR`, Runway-Deckung `-2,543821` Prozentpunkte.

Die Richtung ist sachlich zwingend und bestaetigt die Fehlzuordnung: die neue
Periodentafel weist bei den relevanten Altern hoehere Sterblichkeit aus
(`qx(m,65)` 0,010 auf 0,014951; `qx(m,80)` 0,045 auf 0,056286). Der
`survival_quantile`-Horizont verkuerzt sich dadurch messbar, von mir
gerechnet: m65 von 29 auf 27 Jahre, w65 von 31 auf 30, Joint m65/w62 von 34
auf 33. Ein kuerzerer Horizont hebt die VPW-Entnahme und senkt das
Endvermoegen. Genau das zeigt die Fixture, und genau das Gegenteil legt die
Dokumentation nahe.

AK 9 verlangt, die Sterbetafelwirkung des aktiven Dynamic-Flex-Falls "als
erwartetes Delta" zu messen, AK 10 die Dokumentation als datenbedingte
Aenderung. Beides ist mit den genannten Zahlen nicht erfuellt.

**CR07-2 (blockierend): Keine Monte-Carlo-Messung, obwohl die Sterbetafel
praktisch nur stochastisch wirkt.**

`MORTALITY_TABLE` wird ueber
`app/simulator/mc-life-events.js:resolveSimulatorMortalityProbability` in
jedem Simulationsjahr jedes Pfades gezogen. Der historische Single-Path-
Backtest beruehrt die Tafel nur an einer einzigen Stelle, dem
`survival_quantile`-Horizont eines einzigen Falls. Das eigentliche
Wirkungsfeld ist Monte Carlo und Sweep.

Die Slices 02 bis 06 haben dafuer jeweils eine Messfixture unter
`tests/fixtures/monte-carlo-measurement/` hinterlassen
(`post-backtest-data-02-v1` bis `-06-v2`). Fuer Slice 07 existiert keine. Die
`snapshot-policy-v1.json` deklariert unveraendert
`expectedDelta: backtest_data_06`, und im Messvertrag
`tests/monte-carlo-measurement-contract.test.mjs` gibt es keinen
Slice-07-Eintrag.

Das Slice-Dokument schaetzt die Aenderungstiefe selbst als "**hoch** fuer
Monte-Carlo- und Sweep-Ergebnisse" ein und stellt in
`expectedEffectBoundary` fest, dass Pflege- und Hinterbliebenenmodelle im
deterministischen Backtest inaktiv sind. Damit ist ausdruecklich anerkannt,
dass die gesamte Pflege- und Hinterbliebenenwirkung sowie der weit groessere
Teil der Sterbetafelwirkung ungemessen bleiben. AK 10 ist unerfuellt.

**CR07-3 (blockierend): Die Quellenreihe ist falsch bezeichnet.**

`sourceFiles.mortality.sourceSeries` im Artefakt und `source` im
Dateninventar lauten `Destatis Allgemeine Sterbetafel Deutschland 2023/2025`.
Die gepinnte Arbeitsmappe ist das nicht. Ihr Titelblatt lautet "Statistischer
Bericht / Sterbetafeln / 2023/2025", EVAS-Nummer 12621, erschienen am
07. Juli 2026; die verwendeten Blaetter sind `12613-b01` und `12613-b02`
"Sterbetafel 2023/2025 fuer Deutschland nach Altersjahren - maennlich" bzw.
"- weiblich". Die "Allgemeine Sterbetafel" ist ein davon getrenntes,
zensusgestuetztes Destatis-Produkt mit eigener Methodik und eigenem
Erscheinungsrhythmus.

Der Slice widerspricht sich dabei selbst: `docs/reference/DATA_SOURCES.md`
schreibt korrekt "Destatis **period life table 2023/2025**", die
mitgelieferte `LICENSE.md` korrekt "Destatis, Sterbetafeln 2023/2025". Die
Fehlbezeichnung steht ausgerechnet in den beiden maschinenlesbaren Feldern,
die exportiert und zitiert werden. In einem Korrekturprogramm, dessen Zweck
die Beseitigung falsch benannter Reihen ist, ist das blockierend.

### Weitere Findings

**CR07-4: Das Inventar fuehrt eine modellkontaminierte Tafel als `official`.**
`mortality_table.evidenceClass` wechselt von `proxy` auf `official`, obwohl
das Artefakt selbst korrekt `official_with_model_tail` fuehrt. Der als
`embeddedValueHash` hinterlegte `mortalityTableHash` deckt die vollstaendige
Tafel ab, also einschliesslich des Modellrands 101 bis 110 und der
vollstaendig modellierten Reihe `d`. Zehn von 93 Runtime-Altern und ein
Drittel der Geschlechtsschluessel sind damit als amtlich klassifiziert.
Dasselbe gilt fuer `care_grade_taxonomy`, das von `proxy` auf `official`
wechselt, obwohl die gehashten `labels` projektseitige Anzeigetexte sind.
Dies ist derselbe Befundtyp wie das noch offene CR06-20.

**CR07-5: Zwei divergierende Hinterbliebenen-Defaults, dokumentiert ist nur
einer.** Vertrag und Inventar setzen `defaultMode: 'percent'` und
`defaultPercent: 55`; `DATA_SOURCES.md` erklaert den vorherigen Eintrag
`stop` fuer "incorrect and is repaired". Der Leser
`app/simulator/simulator-input-pension.js:65` faellt jedoch unveraendert auf
`'stop'` zurueck, und Zeile 61 setzt den Prozentsatz auf `0`, wenn das Feld
fehlt. Es gibt also weiterhin zwei Defaults, je nachdem ob das DOM-Feld
existiert; die Aenderung hat nur getauscht, welcher dokumentiert wird, und
kein Test pinnt den Reader-Fallback gegen den Vertrag. Bruchszenario: ein
Worker-, Engine- oder Profilimportpfad ohne diese Felder erzeugt still eine
Hinterbliebenenleistung von null, waehrend Vertrag und UI 55 Prozent
zusagen.

**CR07-6: `validation_only` ohne jede Validierung.** Die Pflegequoten sind
mit `runtimeRole: 'validation_only_not_transition_probability'` und einem
`prohibitedTransformation`-Satz versehen, aber kein Test und kein Gate
vergleicht die Modellhazards jemals mit ihnen. Die Daten sind inert. Zur
Groessenordnung habe ich unter den ausgelieferten Defaults
(`pflegeModellTyp = chronisch`, Mortalitaetsaufschlag der Eintrittsgrade 1
und 2 gleich 0) die modellimplizierte Pflegepraevalenz gerechnet:

| Alter | Modell | amtlich m | amtlich w |
|---|---|---|---|
| 75 bis 79 | 40,27 % | 16,48 % | 20,75 % |
| 80 bis 84 | 62,11 % | 28,24 % | 39,07 % |
| 85 bis 89 | 82,18 % | 47,45 % | 65,01 % |

Die Rechnung ist indikativ und nicht als Nachweis einer Fehlkalibrierung zu
lesen: sie vergleicht eine Kohortenpraevalenz ab 65 mit einer
Periodenpraevalenz, sie beruecksichtigt den akuten Modus nicht und sie setzt
den Mortalitaetsaufschlag erst ab Grad 3 an. Genau deshalb waere eine
definierte Validierungsregel noetig. Der Slice pinnt die Daten, die diese
Pruefung ermoeglichen wuerden, und fuehrt sie nicht durch.

**CR07-7: Strukturelle Nullwahrscheinlichkeit vor Alter 65.**
`minimumEntryAge: 65` und `CARE_PROBABILITY_BUCKETS[0] === 65` bedeuten, dass
vor 65 in keinem Pfad ein Pflegeeintritt gezogen wird. Die im selben Slice
gepinnte Quelle weist fuer 60 bis unter 65 eine Pflegequote von 4,34 Prozent
und fuer 55 bis unter 60 von 2,86 Prozent aus. Fuer eine
Ruhestandsplanungsanwendung, deren Kernfall der vorgezogene Ruhestand ist,
ist das eine einseitige Untererfassung, die als solche nirgends benannt
wird.

**CR07-8: AK 3 ist an der Altersuntergrenze nicht erfuellt.** Die
Akzeptanzkriterien verlangen "lueckenlos belegt oder expliziter, fail-closed
Randvertrag". Gemessen: `resolveSimulatorMortalityProbability` liefert fuer
Alter 0 bis 17 und fuer einen unbekannten Geschlechtsschluessel still
`qx = 1`, also sicheren Tod im ersten Jahr, ohne Fehler und ohne
vorgelagerte Validierung; `assertSimulatorHorizonAgeContract` prueft nur auf
nichtnegative Ganzzahl. Die gepinnte Quelle enthaelt die Alter 0 bis 17, der
Generator verwirft sie ueber `if (age >= OFFICIAL_MIN_RUNTIME_AGE)`. Das
Verhalten ist geerbt, nicht neu eingefuehrt, aber das Akzeptanzkriterium
behauptet seine Abdeckung.

**CR07-9: Der Vertrag deklariert Felder, die die Runtime nicht liest.**
`care.entryModel.eligibleInitialGrades: [1, 2]` und `minimumEntryAge: 65`
stehen als Daten im Vertrag, waehrend
`app/simulator/simulator-engine-helpers.js:604` `INITIAL_ENTRY_GRADES`
hartcodiert und das Mindestalter aus den Objektschluesseln ableitet. Ich
habe verifiziert, dass die Entfernung der Grade 3 bis 5 aus dem
Eintrittsmodell heute genau deswegen wirkungsneutral ist. Der Vertrag
verspricht damit aber eine Kopplung, die nicht existiert; wer eines von
beiden aendert, erhaelt still zwei widerspruechliche Wahrheiten.

**CR07-10: Die Geschlechtsspalte der Quelle bleibt ungenutzt.** Die Blaetter
`csv-12613-b01` und `csv-12613-b02` fuehren eine explizite Spalte
`Geschlecht` mit den Werten `maennlich` und `weiblich`. Der Generator prueft
`Statistik`, `Gebiet` und `Jahre`, nicht aber `Geschlecht`, und ordnet das
Geschlecht ueber den fest verdrahteten Blattnamen zu. Der mitgelieferte
Quellenoracle prueft die Spalte ebenfalls nicht und adressiert zusaetzlich
`xl/worksheets/sheet28.xml` und `sheet29.xml` als feste Pfade. Eine
Vertauschung faellt heute nur ueber den 65er-Wertmarker und die
Plausibilitaetszusicherung `qx(m) > qx(w)` auf. Das ist eine wirksame, aber
schwaechere Absicherung als der in Slice 06 durchgesetzte
Spaltenidentitaetsvertrag, und die Quelle liefert die noetige Information
frei Haus.

**CR07-11: Die verlangte Nullbruecken-Sensitivitaet wird nie ausgefuehrt.**
Der Lohnvertrag stellt fuer 1945 jetzt fest, der Wert "must be
sensitivity-tested against a neutral zero-growth bridge", und hinterlegt
`neutralBridgeAlternativePct: 0` samt 22,687-Prozentpunkt-Differenz. Kein
Fall, kein Oracle und kein Gate rechnet diese Nullbruecke jemals. CR06-22
ist damit als Offenlegung geschlossen, als Sensitivitaet aber nur
angekuendigt.

**CR07-12: Kleinere Vertrags- und Darstellungsmaengel.**
- `widow_benefit_parameters.yearConvention` lautet
  `scenario_cash_flow_after_partner_death_subject_to configured marriage timing`
  und enthaelt ein Leerzeichen mitten in einer maschinenlesbaren
  Konventionskennung.
- `sharesPctByGrade` summiert sich auf 99,963 Prozent, weil der Nenner den
  Bestand `bisher ohne Zuordnung` (2.097) einschliesst. Der Nenner ist
  nirgends deklariert.
- `readXlsxSheetRows` adressiert Zeilen positionsbasiert in Dokumentreihenfolge
  und ignoriert das `r`-Attribut. Bei einer Mappe mit ausgelassenen
  Zeilenelementen verschoeben sich die Identitaetspruefungen still; heute
  schuetzt nur der Quellenhash.

### Geprueft und verworfen

Zehn Hypothesen habe ich konstruiert und widerlegt:

1. Die Entfernung der Eintrittsgrade 3 bis 5 aendert die Ziehung. Widerlegt:
   `INITIAL_ENTRY_GRADES = [1, 2]` war bereits auf `02f39f9` hartcodiert, die
   Datei ist unveraendert.
2. Die Blaetter b01 und b02 sind vertauscht. Widerlegt ueber die
   Geschlechtsspalte und `qx(m) > qx(w)` an allen 83 Altern.
3. Der Generator liest die falsche Pflegequotenspalte. Widerlegt: Index 8 ist
   die Spalte `Pflegequote` in Prozent.
4. `find` trifft eine geschlechtsspezifische Abschnittszeile. Widerlegt:
   `22421-01` enthaelt genau eine `Insgesamt`/`Anzahl`-Zeile (10) und genau
   eine `Pflegegrad 1`-Zeile (34).
5. Der Modellrand 101 bis 110 wurde still veraendert. Widerlegt, byteidentisch
   fuer m und w.
6. Die `divers`-Ableitung wurde veraendert. Widerlegt, Abweichung 0 ueber alle
   93 Alter.
7. Die Naht 100 zu 101 erzeugt einen unplausiblen Sprung. Widerlegt, Faktor
   1,0996 und 1,1387 bei durchgehender Monotonie.
8. Der CR06-21-Nahtzeuge ist eine tote Fixture. Widerlegt durch zwei Proben:
   1947 von 5,6 auf 9,9 bewegt den Fall auf Endvermoegen 4.016.343,29 EUR,
   Entnahmen 74.400 EUR und Runway-Deckung 87,994228 Prozent; 1946 von
   2,8968 auf 11,5 auf 4.027.038,18 EUR mit Kuerzung 16,844293 Prozent. Beide
   Nahtseiten sind live, und nur dieser eine Fall bewegt sich.
9. CR06-22 hat den Lohnwertehash veraendert. Widerlegt: `annualGrowthHash`
   `e10e581f...` unveraendert, nur `methodHash` und
   `observationContractHash` wechseln.
10. Die Gates schreiben. Widerlegt: `git status --short` bleibt nach allen
    sieben Verify-Gates, Coverage- und Browserlauf bei 27 Eintraegen,
    `git diff --check` sauber. Alle Proben wurden byteidentisch
    zurueckgesetzt und per SHA-256 belegt.

### Was zutreffend umgesetzt ist

Zur Abgrenzung des Reviewumfangs, nicht als Freigabe: die Quellenbindung, die
Perioden-/Kohortenabgrenzung, die Trennung von Beobachtung und Modellannahme
in der Klassifikation, die Entfernung der unzutreffenden
`Praevalenz / 4`-Behauptung, der byteidentische Verify-Pfad und die
Schliessung von CR06-21 mit einem nachweislich lebenden Zeugen halten meiner
Pruefung stand.

## Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:**
  - CR07-1 - die dokumentierte Sterbetafelwirkung ist die falsche
    Vergleichsgroesse und bei drei von vier Kennzahlen gegenlaeufig
    vorzeichenbehaftet;
  - CR07-2 - keine Monte-Carlo-/Sweep-Messung fuer die Aenderung, deren
    Wirkung fast vollstaendig stochastisch ist (AK 10);
  - CR07-3 - die amtliche Quellenreihe ist im Artefakt und im Inventar falsch
    bezeichnet.
- **Restrisiken:** CR07-4 bis CR07-12 sowie die uebernommenen offenen
  Restrisiken CR06-20 und CR06-23 aus Slice 06 und die dort weitergefuehrten
  Punkte aus den Slices 02, 04 und 05.
- **Pre-Mortem:** In drei Monaten verschiebt jemand die Pflegeeintritts-
  hazards oder den akuten Dauerdefault, und die Monte-Carlo-Ruinquoten
  wandern um mehrere Punkte. Niemand bemerkt es, weil Slice 07 keine
  Monte-Carlo-Basislinie fuer den Demografie-/Pflegevertrag hinterlassen hat
  und die letzte Messung `post-backtest-data-06-v2` noch von vor dem
  Sterbetafelwechsel stammt. Wer die Zahlen dann rekonstruieren will, findet
  als einzige quantitative Wirkungsaussage `+24.483,08 EUR` im Protokoll,
  schliesst daraus auf eine Verbesserung durch die Periodentafel und sucht
  die Ursache an der falschen Stelle.

## Nachbesserung nach Claude-Review Runde 1

Die folgenden Punkte dokumentieren die Codex-Umsetzung der drei von Claude
genannten Blocker. Sie veraendern Claudes vorstehendes Review-Ergebnis nicht;
ob die Blocker damit geschlossen sind, entscheidet das erneute externe Review.

- **CR07-1:** Das Backtest-Gate vergleicht nun fuer den aktiven
  `dynamic_flex_cape_legacy_step_2018_2025`-Arm und den CAPE-inaktiven
  Referenzarm jeweils die unveraenderliche Slice-06-Zielfixture mit dem
  Slice-07-Ziel. Der aktive Arm traegt die Deltas `-19.225,84 EUR`,
  `+3.000 EUR`, `+1.124,01 EUR` und `-3,740149` Prozentpunkte; der Referenzarm
  `+12.940,41 EUR`, `-24.000 EUR`, `+4.458,88 EUR` und `-2,543821`
  Prozentpunkte. Der separate CAPE-an/aus-Vergleich bleibt erhalten, ist aber
  nicht mehr als Slice-07-Wirkung bezeichnet.
- **CR07-2:** `demography-care-survivor-runtime-measurement.test.mjs`
  rekonstruiert den Basiscommit `02f39f9` und vergleicht ihn mit dem aktuellen
  Stand bei identischem Profil, Node-Runtime, Seed, 2.048 Runs, 40 Jahren und
  zwei Sweep-Kombinationen. Pflege, beide Personen und der 55-Prozent-
  Hinterbliebenenpfad sind aktiv. `post-backtest-data-07-v1` speichert 40
  numerische Deltas, die Hashkette und den `pending`-Status; aeltere
  Messfixtures werden nicht ueberschrieben.
- **CR07-3:** Generator, generiertes Artefakt und Dateninventar nennen die
  Quelle nun `Destatis Statistischer Bericht Sterbetafeln 2023/2025 (EVAS
  12621), Tabellen 12613-b01 und 12613-b02`. Exakte Vertragsassertionen
  verhindern die Rueckkehr der falschen Bezeichnung.
- **Validierung:** `npm test` 17.855/17.855, Browser 27/27, Coverage
  17.855/17.855 bei 78,10 Prozent, alle sieben Quellen-Verify-Gates,
  Doku-Evidenz und `git diff --check` sind gruen. Das neue Runtime-Messgate
  traegt 19/19 gezaehlte Assertions.

**Nachbesserungsstatus:** technisch umgesetzt und selbstgeprueft; erneutes
externes Review, Freigabe und Commit ausstehend.

## Zweitreview von Claude (Runde 2)

**Reviewdatum:** 2026-08-01
**Pruefstand:** Arbeitsbaum auf Basiscommit `02f39f9`, 32 Eintraege laut
`git status --short`; HEAD unveraendert.
**Reviewerstatus:** freigegeben mit zwei Auflagen

### Findings-Lifecycle

- Geschlossen und einzeln nachgemessen: **CR07-1, CR07-2, CR07-3**.
- Unveraendert offen: CR07-4 bis CR07-12; davon werden **CR07-5** und
  **CR07-6** als Auflagen vor Slice 08 gefuehrt.
- Neu eroeffnet: **CR07-13, CR07-14, CR07-15** (nicht blockierend).

### CR07-1 geschlossen

Der neue Oracle `Slice06To07MortalityBacktestDeltaV1` liest die
unveraenderliche Slice-06-Evidenz `cape-wage-backtest-delta-v3.json` ueber
ihren gepinnten Bytehash `71bad07c...` ein und bildet fuer beide CAPE-Arme
Vorher/Nachher-Deltas. Alle acht Kennzahlen sind hart assertiert und stimmen
**ziffernidentisch** mit meiner Messung aus Runde 1:

| Arm | Endvermoegen | Entnahmen | Steuer | Runway |
|---|---|---|---|---|
| aktiv | -19.225,84 EUR | +3.000 EUR | +1.124,01 EUR | -3,740149 pp |
| Referenz | +12.940,41 EUR | -24.000 EUR | +4.458,88 EUR | -2,543821 pp |

Zusaetzlich ist `maxAbsolutePortfolioFlowDelta` fuer beide Arme mit Delta 0
assertiert, und `canonicalRowsHash.changed` ist als `true` festgehalten. Die
alten Werte `+24.483,08 EUR` und so fort bleiben erhalten, sind aber in
Assertionstexten, Fixture und Slice-Dokument ausdruecklich als
CAPE-an/aus-Vergleich innerhalb des Slice-07-Stands bezeichnet und nicht mehr
als Sterbetafelwirkung. Damit ist AK 9 erfuellt.

### CR07-2 geschlossen

`tests/demography-care-survivor-runtime-measurement.test.mjs` fuehrt erstmals
in diesem Programm eine echte Laufzeitmessung im Testlauf aus: 2.048 Runs,
40 Jahre, Seed `20260801`, chronische Pflege, aktiver Partner,
55-Prozent-Hinterbliebenenpfad und zwei Sweep-Kombinationen.

Ich habe die Quellseite selbst reproduziert. Dazu habe ich den Basiscommit
ueber `git archive 02f39f9` in ein Scratch-Verzeichnis ausgepackt und die
Messung mit `DEMOGRAPHY_MEASUREMENT_RUNTIME_ROOT` gegen diesen Stand
gefahren. Ergebnis: **byteidentisch zu `fixture.sourceMeasurement`,
0 abweichende Blaetter**. Die Zielseite reproduziert im Suitelauf live mit
19/19 Assertions.

Damit ist die Messung belastbar, und die gemessenen Wirkungen sind:

| Groesse | Slice 06 | Slice 07 | Wirkung |
|---|---|---|---|
| Lebensdauer P10/P50/P90 | 18/27/33 | 16/26/32 | -2/-1/-1 Jahre |
| MC-Endvermoegen Median | 3.488.010,24 | 3.382.212,80 | -105.797,44 EUR |
| Runs mit Pflege | 1.777 | 1.725 | -52 |
| Pflegeeintritte P1 | 1.290 | 1.159 | -131 |
| Pflegejahre P1 | 13.208 | 10.998 | -2.210 |
| Witwenjahre P1 / P2 | 4.908 / 13.173 | 4.310 / 15.106 | -598 / +1.933 |
| Horizontaufloesung min/max | 3 / 34 | 4 / 33 | +1 / -1 |

Die Richtung ist in sich stimmig: hoehere Sterblichkeit verkuerzt die
Lebensdauer, senkt die Pflegeexposition und verschiebt die Hinterbliebenenzeit
vom Mann zur Frau. Die Outcomezaehler `ruin`, `allDead`,
`horizonExhausted` bleiben mit 2/2.045/1 unveraendert.

Entscheidend fuer die Freigabe ist, dass das Gate fail-closed ist. Probe C:
Ich habe die Progressionswahrscheinlichkeit von Pflegegrad 1 im generierten
Artefakt von 0,15 auf 0,25 gesetzt. Das Gate faellt sofort mit einer
Tiefenvergleichsverletzung. Genau diese Klasse von Aenderung konnte der
historische Single-Path-Backtest nie erfassen. Der Vertrag ist damit
tatsaechlich runtimeseitig abgesichert; die Datei wurde byteidentisch
zurueckgesetzt und per SHA-256 belegt. AK 10 ist erfuellt.

### CR07-3 geschlossen

Generator, generiertes Artefakt und Dateninventar nennen die Quelle nun
`Destatis Statistischer Bericht Sterbetafeln 2023/2025 (EVAS 12621),
Tabellen 12613-b01 und 12613-b02`. Das deckt sich mit dem Titelblatt der
gepinnten Mappe, das ich in Runde 1 selbst gelesen habe. Eine Volltextsuche
nach `Allgemeine Sterbetafel` findet ausserhalb der Abgrenzungssaetze keinen
Treffer mehr; zwei exakte Assertionen in
`german-demography-care-survivor-contract.test.mjs` und
`simulation-data-inventory.test.mjs` verhindern die Rueckkehr, und
`DATA_SOURCES.md` grenzt das Produkt ausdruecklich ab.

### Neue Findings

**CR07-13: Das Messgate ist plattformgebunden, ohne es zu deklarieren.**
Der Vergleich setzt vor `deepEqual` den Runtimeblock der Fixture in das
Istergebnis ein. Node-Version, Plattform und Architektur werden damit
ueberhaupt nicht geprueft, waehrend anschliessend auf sechs Nachkommastellen
gerundete Akkumulationen aus 2.048 Laeufen ueber 40 Jahre exakt verglichen
werden; bei Betraegen um 3,4 Millionen sind das rund dreizehn signifikante
Stellen. `snapshot-policy-v1.json` sieht fuer diesen Fall ausdruecklich
`crossRuntime: field-specific tolerances declared in the snapshot before
execution` vor, doch `post-backtest-data-07-v1.json` deklariert keine
Toleranzen. Dies ist der erste Snapshot des Programms, der live nachgerechnet
statt nur Fixture gegen Fixture verglichen wird; damit wird die Luecke der
Policy hier zum ersten Mal wirksam. Bruchszenario: auf einem Linux-CI oder
nach einem Node-Sprung faellt `npm test` mit einem undurchsichtigen
Zahlendiff statt mit einer Runtime-Meldung.

**CR07-14: Die Quellseite der Messung ist ausserhalb der Fixture nicht
verankert.** Das Gate rechnet nur die Zielseite nach;
`sourceMeasurement` ist reine Vertrauensdatenmenge. `changedLeafPathsHash`
und `numericDeltasHash` werden aus den beiden Haelften derselben Datei
gebildet und erkennen deshalb die Verfaelschung einer Haelfte, nicht aber ein
konsistentes Umschreiben beider. Einziger Anker ist der Prosatext
`captureEvidence.sourceCommit`; kein Hash der Eingangsgroessen des
Basiscommits, etwa seiner eingebetteten Sterbetafel, ist gebunden. Ich habe
die Quellseite reproduziert und byteidentisch bestaetigt, der Stand ist also
heute korrekt. Das Finding betrifft die Haltbarkeit, nicht die Richtigkeit.

**CR07-15: Das Messprofil daempft die Pflege-Mortalitaetskopplung und
entkoppelt den Hinterbliebenenwert vom Vertrag.** `GRADE_CONFIGS` setzt
`mortalityFactor` auf 1/1/1,25/1,5/1,75, waehrend die ausgelieferte
Oberflaeche 0/0/3/5/5 vorgibt; `pflegeRampUp` ist 3 statt 5. Die im
Delta-Ledger festgehaltene `expectedDirection`, hoehere Sterblichkeit senke
die Pflegeexposition, wird also in einer Konfiguration gemessen, in der
Pflege die Sterblichkeit kaum erhoeht. Zweitens uebergibt das Profil ein
literales `WIDOW_OPTIONS`-Objekt statt
`survivor.runtimeContract`, sodass eine Aenderung von `defaultPercent` dieses
Gate nicht bewegen wuerde. Drittens ist Sweep-Kombination 0 dieselbe
Konfiguration wie der Monte-Carlo-Lauf; nur `targetEq 70` ist ein wirklich
zusaetzlicher Parametersatz. Das erklaert auch, warum das
Sweep-Median-Delta identisch zum MC-Median-Delta ist.

### Auflagen vor Slice 08

- **CR07-5:** Der Leser
  `app/simulator/simulator-input-pension.js` faellt unveraendert auf
  `mode = 'stop'` und `percent = 0` zurueck, waehrend Vertrag, Inventar und
  Oberflaeche `percent`/`55` zusagen. Das ist der einzige noch offene Punkt,
  der einen real falschen Laufzeitwert erzeugen kann.
- **CR07-6:** Die gepinnten Pflegequoten tragen weiterhin
  `runtimeRole: validation_only_not_transition_probability`, ohne dass
  irgendeine Validierung stattfindet. Entweder wird eine pruefbare Regel
  definiert oder die Rolle wird ehrlich als Kontextbeleg bezeichnet.

### Eigene Gate-Laeufe in Runde 2

`npm test` 17.855/17.855 Assertions, 0 fehlgeschlagen, 0 offene Handles,
Gesamtlaufzeit 48 Sekunden. Einzeln nachgefahren und mit dem Slice-Dokument
uebereinstimmend: 67, 372, 193 und 19 Assertions; das Messgate benoetigt
allein rund 21 Sekunden. `npm run test:browser` 27/27.
`npm run test:coverage` 78,10 Prozent (38.920/49.836), beide Datei-Gates
bestanden, beide generierten Module bei 100 Prozent.
`npm run docs:evidence` gruen. Alle sieben Quellen-Verify-Gates gruen; der
Arbeitsbaum bleibt danach unveraendert bei 32 Eintraegen, `git diff --check`
sauber. Alle Proben wurden byteidentisch zurueckgesetzt und per SHA-256
belegt.

### Geprueft und verworfen

1. Das Messgate rekonstruiert den Basiscommit zur Laufzeit. Verworfen: es
   pruefte nur die Zielseite; die Quellseite ist aufgezeichnet. Siehe
   CR07-14.
2. Das Messprofil laeuft mit 0,55 Prozent statt 55 Prozent
   Hinterbliebenenrente. Verworfen: `normalizeWidowOptions` klemmt auf
   `[0, 1]`, der Runner erwartet also das Verhaeltnis; `0.55` ist korrekt.
3. Die neuen Deltas sind aus der Fixture abgeschrieben. Verworfen: eigene
   Reproduktion des Basisstands, 0 abweichende Blaetter.
4. Die Pflege- und Hinterbliebenenwirkung bleibt weiterhin ungemessen.
   Verworfen durch Probe C.
5. Die geaenderte Quellenbezeichnung ist erneut ungenau. Verworfen gegen das
   Titelblatt der Mappe; einzige Restunschaerfe ist, dass der Generator die
   CSV-Varianten `csv-12613-b01`/`-b02` liest, waehrend der Vertrag die
   Basistabellen nennt. Inhaltlich identisch.
6. Die Nachbesserung hat mein Erstreview veraendert. Verworfen: Abschnitt und
   Ergebnisblock von Runde 1 sind unveraendert, Codex hat ausschliesslich
   angehaengt.
7. Die Gates schreiben. Verworfen, 32 Eintraege vor und nach allen Laeufen.

## Review-Ergebnis (Claude, Runde 2)

- **Status:** freigegeben
- **Blocker:** keine; CR07-1 bis CR07-3 sind geschlossen und einzeln
  nachgemessen
- **Auflagen vor Slice 08:** CR07-5 und CR07-6
- **Restrisiken:** CR07-4, CR07-7 bis CR07-15 sowie die uebernommenen
  Restrisiken CR06-20 und CR06-23 und die dort weitergefuehrten Punkte aus
  den Slices 02, 04 und 05
- **Pre-Mortem:** Ausgerechnet das Gate, das den Demografievertrag jetzt
  bitgenau absichert, bricht als erstes aus einem Grund, der mit Demografie
  nichts zu tun hat. In drei Monaten wechselt die Ausfuehrung auf Linux oder
  auf eine neue Node-Version, und
  `demography-care-survivor-runtime-measurement` faellt mit einem
  Zahlendiff auf der sechsten Nachkommastelle von 2.048 akkumulierten Pfaden,
  ohne Runtime-Meldung. Unter Zeitdruck nimmt jemand die Fixture auf der
  neuen Laufzeit neu auf. Damit wird stillschweigend auch die
  Slice-06-Vergleichsseite ueberschrieben, weil sie nur Vertrauensdaten ist.
  Der Nachweis fuer den Sterbetafelwechsel wird so zu einem Vergleich der
  neuen Laufzeit mit sich selbst, und die `-105.797,44 EUR`, die den Wechsel
  belegen, verschwinden, ohne dass es jemand bemerkt.
