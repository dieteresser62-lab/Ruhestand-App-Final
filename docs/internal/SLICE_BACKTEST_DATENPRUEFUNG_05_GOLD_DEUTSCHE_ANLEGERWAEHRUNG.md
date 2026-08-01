# Slice 05 - Goldrendite in deutscher Anlegerwaehrung

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Entscheidung:** dauerhafte Nutzerentscheidung vom 2026-07-29 fuer
Slice 02 bis 13; kein neuer Feature-Branch  
**GitHub-Status:** Remote `origin` ist vorhanden; fuer den aktiven Branch ist
kein Upstream konfiguriert  
**Basiscommit:** `a33876c`  
**Status:** technisch umgesetzt; externes Review ausstehend  
**Freigabe:** ausstehend; Codex nimmt keine Selbstfreigabe vor

## Input aus dem Ergebnisdokument von Slice 04

Claudes Zweitreview von Slice 04 ist die verbindliche Eingangsgrenze. Slice 04
ist extern freigegeben und als lokaler Commit `a33876c` vorhanden. Vor der
eigentlichen Gold-Datenarbeit muessen die beiden ausdruecklichen Auflagen
geschlossen werden:

- **CR04-10:** Die Primaerquellenpruefung darf nicht an einen hart
  verdrahteten lokalen WinGet-Pfad oder exakt Poppler `pdftohtml` 25.07.0
  gebunden bleiben. Poppler wird als Systemvoraussetzung mit Bezugsquelle
  dokumentiert, ueber `PATH` oder eine explizite Umgebungsvariable aufgeloest
  und anhand einer kompatiblen Mindestversion statt einer exakten
  Patchversion geprueft. Der extrahierte Quelleninhalt bleibt durch Hash- und
  Kreuzvergleich fail-closed.
- **CR04-13:** Die bereits in Slice 04 inhaltlich geaenderte
  `SIMULATION_DATA_INVENTORY_REVISION` wird vor der Goldumstellung erhoeht.

Die leichten Restrisiken **CR04-11** und **CR04-12** bleiben als
Slice-04-Restrisiken bestehen. Sie werden nicht still als Gold-Scope
umgedeutet.

Verbindliche fachliche Grenzen aus Slice 04:

- Engine-, Steuer-, Runway-, Mindest-Flex-, Quantisierungs- und
  Transaktionssemantik bleiben unveraendert.
- Der historische Dataset-Stand nach Slice 04 ist
  `2026-07-29.5` mit Dataset-Hash
  `6a1ff0c9245d66d5aec69d85e216daf8c0c005804f70868f681452b47353e543`.
- Der Cash-/Geldmarktwertehash
  `cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69`
  bleibt unveraendert.
- `portfolio_flow_delta` war in allen sieben Slice-04-Referenzfaellen exakt
  null. Ein auffaelliges Delta stoppt Slice 05.
- `post-backtest-data-04-v1` bleibt eine unveraenderliche, nicht von Codex
  freizugebende Eingangsfixture.

## Preflight vor Coding

**Gemessen am:** 2026-07-30  
**Aktiver Branch:** `codex/suite-datenintegritaet-hardening`  
**HEAD:** `a33876c feat(simulator): implement slice 04 german cash money market chain`  
**Arbeitsbaum:** sauber (`git status --short` ohne Ausgabe)  
**Unerwartete Dateien:** keine  
**Branchstatus:** kein Upstream konfiguriert; die dokumentierte dauerhafte
Nutzerentscheidung erlaubt die lokale Fortsetzung auf diesem Branch

## Diff-Risiko

Geplante produktive Programm- und Konfigurationsdateien:

- `app/simulator/gold-german-investor-chain.js` (generiert, neu)
- `app/simulator/german-cash-money-market-chain.js` (nur Metadaten des
  Slice-04-Vorgates, generiert)
- `app/simulator/simulation-data-inventory.js`
- `app/simulator/simulator-data.js`
- `scripts/lib/poppler-toolchain.mjs` (neu; Slice-04-Vorgate)
- `scripts/check-poppler-toolchain.mjs` (neu; Slice-04-Vorgate)
- `scripts/build-german-cash-money-market-chain.mjs` (Slice-04-Vorgate)
- `scripts/build-gold-german-investor-chain.mjs` (neu)
- `package.json`

Geplante Tests, Fixtures, Daten und Dokumentation:

- Poppler-Aufloesungs- und Kompatibilitaetstests fuer CR04-10;
- unveraenderte Primaerquellenrekonstruktion der Cash-/Geldmarktkette;
- neue Goldketten-, Quellenrekonstruktions- und Backtestdelta-Tests;
- betroffene Manifest-, Inventar-, Backtest-, Monte-Carlo- und
  Integrationsvertraege;
- neuer unveraenderlicher Kandidat `post-backtest-data-05-v1`, falls das
  Wertedelta die bestehende Messpolicy ausloest;
- `data/historical/gold-german-investor-chain/` mit gepinnten Quellen,
  abgeleiteten Eingaben, Lizenz- und Methodendokumentation;
- dieses Slice-Dokument, der Hauptplan und betroffene Referenzdokumente.

Voraussichtliche Aenderungstiefe:

- **hoch** fuer goldhaltige historische Backtests und Monte-Carlo-Ergebnisse,
  weil 42 bisher ungeklaerte Nullwerte und weitere unbelegte Renditen ersetzt
  werden;
- **mittel** fuer Datenhashes, Charakterisierungsfixtures und
  Snapshot-Kandidaten;
- **klein bis mittel** fuer CR04-10 und CR04-13, weil die
  Primaerquellenpruefung portabler wird, aber fail-closed bleiben muss.

Gefaehrdete bestehende Tests:

- Cash-/Geldmarkt-Generator und dessen unabhaengiger PDF-Oracle;
- historische Manifest-, Inventar- und Charakterisierungstests;
- Backtest-Delta- und Suite-Traceability-Gates;
- Monte-Carlo-Mess- und Exportvertraege;
- Tests mit gepinnten Goldwerten, Dataset-Hashes oder Inventarrevisionen.

Nicht anfassen:

- Engine-, Steuer-, Runway-, Mindest-Flex-, Quantisierungs- und
  Transaktionssemantik;
- `minimumFlexAnnual` und seine Parameternamen;
- `global_equity_research_index`, `inflation_de`, `zinssatz_de`, `lohn_de`
  und `cape`;
- Gold-Zielquote, Gold-Cap und Gold-Transaktionslogik;
- `engine.js`, `dist/` und `RuheStandSuite.exe`;
- unveraenderliche historische Snapshot-Fixtures.

Rollback-Strategie:

- geaenderte versionierte Dateien gezielt mit
  `git checkout -- <datei...>` auf Basiscommit `a33876c` zuruecksetzen;
- neu angelegte Dateien nur nach ausdruecklicher Freigabe entfernen;
- keine Hard-Resets oder sonstigen destruktiven Git-Kommandos.

Die neun geplanten produktiven Programm-/Konfigurationsdateien bleiben unter
der Stop-Grenze von mehr als zehn Dateien. Der Diff-Risiko-Block loest damit
keine Stop-Regel aus.

## Ziel

`gold_eur_perf` wird von einer eingebetteten Teilreihe mit 42 ungeklaerten
Nullwerten zu einer reproduzierbaren, segmentierten Gold-Bruttorenditekette
fuer Returnjahre 1925 bis 2025. Die Reihe misst die Veraenderung eines
ungehedgten Goldpreisniveaus in der fuer den jeweiligen Abschnitt
deklarierten deutschen Anlegerwaehrung beziehungsweise in einer ausdruecklich
gekennzeichneten Nachkriegs-Proxybruecke.

Die Runtime-Zahl ist ein Marktpreisreturn vor Produktaufschlag,
An-/Verkaufsspread, Verwahrung, Steuer und sonstigen Kosten. Diese Komponenten
werden nicht in die Datenreihe eingerechnet und nicht doppelt abgezogen.

## Vorgesehener Reihenvertrag

| Returnjahre | Preis-/Waehrungsbasis | Evidenzklasse | Jahreskonvention |
| --- | --- | --- | --- |
| 1925-1944 | dokumentierte USD-Goldparitaet beziehungsweise Marktpreis und JST-R6 `DEU.xrusd` | `proxy` / `derived` | Jahresdurchschnittsniveau in deutscher Waehrung; Goldstandard- und Marktregime maschinenlesbar |
| 1945-1950 | explizite Nachkriegs-/Waehrungsreformbruecke ohne behaupteten frei investierbaren deutschen Marktreturn | `estimated` | nur die dokumentierte Proxyregel darf die nicht vergleichbare Waehrungsfolge ueberbruecken |
| 1951-1967 | dokumentierte USD-Goldpreisregel und JST-R6 `DEU.xrusd` in DM | `proxy` / `derived` | Jahresdurchschnittsniveau in DM |
| 1968-1998 | Deutsche Bundesbank, Frankfurter Goldfixing, 1 kg Feingold in DM | `official` | publizierter Jahresdurchschnitt aus taeglichen Notierungen; 1968 Teiljahresdurchschnitt ab Erstnotierung |
| 1999-2025 | World Bank Goldpreis in USD je Feinunze, dividiert durch den Bundesbank-/EZB-Jahresdurchschnitt USD je EUR | `official` / `derived` | Jahresdurchschnittsniveau in EUR |

Die genaue Nahtbehandlung 1944/1945, 1950/1951, 1967/1968 und 1998/1999
muss vor Werteprojektion im Generator und in einem unabhaengigen Testreader
identisch dokumentiert, aber getrennt rekonstruiert werden.

## Scope

- vorgeschaltete technische Schliessung von CR04-10 und CR04-13;
- gepinnte Primaerquellen mit Hashes, Lizenz-/Nutzungsstatus und Abrufstand;
- reproduzierbarer, schreibfrei verifizierbarer Goldketten-Generator;
- generiertes, tief eingefrorenes Datenmodul fuer 101 Jahreswerte;
- Projektion aller `gold_eur_perf`-Werte aus dem generierten Modul;
- Manifest-, Inventar- und Runtime-Provenienz mit einheitlichem Wertehash;
- explizite Goldmarkt-, Waehrungs- und Zugangsregime;
- Aufloesung aller 42 bisher ungeklaerten Nullwerte ohne stilles Zero-Fill;
- Markerjahre fuer Goldstandardbruch, Nachkrieg, Marktoeffnung, DM/EUR-Naht,
  Hausse und Verlustjahr;
- Vorher-/Nachher-Deltas fuer goldfreie und goldhaltige feste
  Backtest-Referenzfaelle;
- Dokumentations-Sync in Hauptplan, Datenquellen, Technik,
  Simulator-Modulreferenz und Testreferenz.

## Nicht im Scope

- Aenderung der Goldrendite-Anwendung oder ihres Zeitpunkts;
- Gold-Transaktionskosten, physische Auf-/Abschlaege, Verwahrungskosten,
  Steuer oder Produkttracking;
- historisch exakte Vermoegensumstellung durch die Waehrungsreform 1948;
- Aenderung von Gold-Zielquote, Gold-Cap, Gold-Guardrails oder
  Transaktionslogik;
- Austausch weiterer historischer Reihen;
- Release-Sync von `dist/` oder Bau der EXE.

## Akzeptanzkriterien

1. CR04-10 ist geschlossen: kein hart verdrahteter WinGet-Paketpfad in
   Produktiv- oder Testcode, dokumentierte Systemvoraussetzung und
   kompatible Mindestversion statt exakter Patchbindung.
2. CR04-13 ist geschlossen: geaenderter Inventarinhalt traegt eine neue
   `SIMULATION_DATA_INVENTORY_REVISION`.
3. Die Goldkette deckt 1925 bis 2025 lueckenlos mit endlichen Prozentwerten
   ab.
4. Jeder der 42 bisher ungeklaerten Nullwerte ist durch eine Quelle oder eine
   ausdrueckliche, jahresgenaue Modellannahme ersetzt. Kein fehlender Wert
   wird still als null projiziert.
5. Quelle, Preisvariante, Einheit, Waehrung, Jahreskonvention,
   Evidenzklasse, Markt-/Waehrungsregime und Transformation sind
   maschinenlesbar.
6. Die Bundesbankwerte 1968 bis 1998 und die World-Bank-/EZB-Werte 1999 bis
   2025 stimmen exakt mit den gepinnten Eingaben ueberein.
7. Die Nachkriegs-/Waehrungsreformbruecke ist sichtbar als Schaetzung
   gekennzeichnet und kann nicht als beobachteter investierbarer deutscher
   Goldreturn gelesen werden.
8. Negative Jahreswerte bleiben vorzeichenrichtig erhalten; es gibt kein
   stilles Begrenzen auf null oder auf den spaeteren Engine-Gold-Cap.
9. Goldfreie Referenzportfolios bleiben bei isoliertem Datenersatz
   ergebnisgleich.
10. Goldhaltige Referenzlaeufe besitzen erklaerte Vorher-/Nachher-Deltas;
    Outcomes bleiben erklaert und `FlowDelta` bleibt unauffaellig.
11. Manifest, Inventar und Runtime tragen denselben generierten
    Goldwertehash.
12. Der neue Monte-Carlo-Kandidat bleibt `pending`; Codex veraendert keine
    unveraenderliche Eingangsfixture und nimmt keine Promotion vor.
13. Alle Quellen-Verify-Gates und `npm test` sind vollstaendig gruen; Codex
    erteilt keine Selbstfreigabe.

## Stop-Regeln

Der Slice stoppt vor weiterer Umsetzung, wenn:

- eine Primaerquelle oder ihr gepinnter Hash nicht reproduzierbar ist;
- die 1945-1950-Bruecke nicht ohne verdeckte Nullannahme oder unerklaerten
  Waehrungssprung definiert werden kann;
- ein Jahreswert nicht eindeutig einem Segment zugeordnet werden kann;
- mehr als zehn produktive Programm-/Konfigurationsdateien geaendert werden
  muessen;
- Engine-Semantik geaendert werden muesste;
- goldfreie Referenzfaelle sich veraendern;
- Referenz-Outcomes unerwartet wechseln, `FlowDelta` auffaellig wird oder
  die Tests nicht sinnvoll ausfuehrbar sind;
- UI und Engine unterschiedliche Parameternamen verwenden;
- `minimumFlexAnnual` irgendwo still begrenzt statt validiert wird.

## Geplante Tests

- Poppler-Toolchain-Check ueber `PATH` und explizite Umgebungsvariable;
- kompatible hoehere Poppler-Version wird nicht allein wegen ihrer
  Versionsnummer abgewiesen;
- Generator-Build und schreibfreies Verify-Gate;
- unabhaengige Vollrekonstruktion aus den gepinnten Gold- und
  Waehrungsquellen;
- 101-Jahres-Abdeckung, Segmentgrenzen, Freeze und Wertehash;
- Markerjahre mindestens 1934, 1945, 1948, 1951, 1968, 1969, 1998, 1999,
  2008, 2013, 2024 und 2025;
- goldfreier Invarianzfall und goldhaltige Backtestdeltas;
- Manifest-, Inventar-, Charakterisierungs- und Suite-Traceability-Gates;
- Monte-Carlo-Export- und Messvertrag;
- abschliessend alle Quellen-Verify-Gates und `npm test`.

## Ergebnisse

- **Vorgate CR04-10:** `scripts/lib/poppler-toolchain.mjs` loest
  `pdftohtml` portabel ueber `RUHESTANDSAPP_PDFTOHTML`,
  `RUHESTANDSAPP_POPPLER_BIN` oder `PATH` auf. Die kompatible
  akzeptierte Vertragsuntergrenze ist 25.07.0; als Referenz ist nur 25.07.0
  tatsaechlich vermessen. Hoehere Patch-/Minorversionen werden nicht allein
  wegen der Versionsnummer abgewiesen, muessen aber das Inhaltsoracle bestehen. Der Check
  `npm run verify:poppler-toolchain` ist gruen. Cash-Generator und
  unabhaengiger PDF-Test verwenden denselben Toolchain-Vertrag, aber
  getrennte Extraktionslogik.
- **Vorgate CR04-13:** Manifest und Inventar tragen nach der Reviewkorrektur
  Revision `2026-08-01.1`. Der kanonische Dataset-Hash ist
  `e2ee9db77d02cca23ca451e16ed16b565de44411807c550e49f415e7bed45d0a`.
  Der Slice-04-Cashwertehash bleibt unveraendert
  `cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69`.
- **Gepinnte Eingaben:** JST R6 `DEU.xrusd`, Bundesbank
  `BBEX3.A.XAU.DEM.EA.AC.C03`, Bundesbank
  `BBEX3.A.USD.EUR.BB.AC.A04` und World Bank Commodity Price Data sind mit
  Einzel-SHA-256 und Lizenzgrenzen abgelegt. Der kombinierte
  Primaereingabenhash ist
  `133ed7c3d79a313de4a64f94e54b4f0e06e4f7b24ab4182aa5263958cae49b7d`.
- **Generierte Goldkette:** `GoldGermanInvestorChainV1` deckt 1925-2025
  lueckenlos mit 101 endlichen Bruttojahresreturns ab. Der Wertehash ist
  `068a15a99c665b48dc14a187b654033d292c9de6ed3cf712f7e789ddcec049aa`,
  der Methodenhash
  `c81c8314ee281cace26bbd69f502d0de22106e34aa3b1bf74739555cf9c9f86e`.
  `HISTORICAL_DATA`, `annualData`, Manifest und Inventar verwenden dieselbe
  Projektion.
- **Nullwerte:** Von den vormals 42 ungeklaerten Nullen bleiben zwoelf
  literal Nullen. 1942-1944 und 1951-1953 sind aus unveraendertem
  Policypreis und JST-FX abgeleitet; 1945-1950 ist die explizite,
  jahresgenaue Nachkriegs-/Waehrungsreform-Schaetzbruecke. Jeder Wert besitzt
  eine maschinenlesbare Klassifikation. Abgeleitete Nullen werden nur bei
  exakter Gleichheit beider Quellkomponenten akzeptiert; unklassifizierte
  Nullen schlagen fail-closed fehl und `fallbackZeroSegments` ist leer.
- **Naehte und Marker:** Die korrigierte Rekonstruktion pinnt unter anderem
  1933 `+5,084700%`, 1934 `-4,578326%`, 1968 `+13,474523%`, 1999
  `-1,443790%`, 2000 `+15,396275%`, 2024 `+22,777827%` und 2025
  `+38,065727%`. 1968 ist die Teiljahresnaht ab 18. Juni; 1999 verwendet
  1,95583 DEM/EUR und 32,15074656862798 Feinunzen/kg.
- **Backtestdelta:** Der unveraenderliche Slice-04-Zielstand ist separat als
  `post-backtest-data-04-target-v1.json` mit SHA-256
  `6374986dccb2a176942e88bdea22059e1ff6f55dec5b3593483408d3f3e39cc9`
  archiviert. Das neue aktive Ziel hat SHA-256
  `c7c695505935d0e7788b9c73ab2e066b6802a59ae91db5230c84f42d17f8bc1c`.
  In allen sieben goldfreien Referenzfaellen sind Outcome, acht
  Finanzmetriken und `portfolio_flow_delta` exakt unveraendert. Geaenderte
  Row-Hashes betreffen nur die fortgeschriebenen diagnostischen
  Goldreturnfelder; die Brueckenperiode 1949-1952 ist byteidentisch.
- **Goldhaltiger Referenzlauf:** Ein echter sechsjaehriger UI-/Provider-/
  Backtestlauf 2000-2005 mit 200.000 EUR Start-Gold und aktivem Zehn-Prozent-
  Ziel laeuft gegen Slice-04-Werte und aktuelle Kette. Outcome bleibt
  `completed`; Endvermoegen aendert sich um `-55.479,30 EUR`, Steuer um
  `+1.599,44 EUR`, maximale Drawdownquote um `+0,733649 pp` und minimale
  Runway-Deckung um `+20,136526 pp`. Alle acht Finanzmetriken und FlowDelta
  sind in `goldDataDeltaOracle` eingefroren.
- **Monte Carlo:** `post-backtest-data-05-v1` baut unveraenderlich auf
  `post-backtest-data-04-v1` auf, traegt `annualDataHash` `f7767289` bei
  unveraendertem `regimeHash` `7d37583a` und bleibt `pending`.
- **Gezielte Tests:** Goldkette 491/491, Golddelta 246/246,
  Charakterisierung 100/100, Monte-Carlo-Messvertrag 1391/1391,
  Suite-Traceability 1077/1077, Poppler 12/12, Cashkette 362/362 und
  Cash-PDF-Rekonstruktion 230/230 Assertions gruen.
- **Volltest:** `npm test` ist mit 15.055/15.055 Assertions, null
  fehlgeschlagenen Assertions, null fehlgeschlagenen Dateien, einem
  separaten Gate und null offenen Handles gruen.
- **Scope:** Neun produktive Programm-/Konfigurationsdateien wurden
  geaendert; die Stop-Grenze von mehr als zehn wurde nicht erreicht.

## Abweichungen vom Plan

- Der Goldtest rekonstruiert die vollstaendige Generatorausgabe byteidentisch
  im schreibfreien Verify-Gate, pinnt alle Originaldateihashes und berechnet
  ausgewaehlte Policy-/FX-, Frankfurt- und EUR-Marker mit getrennten Formeln.
  Er implementiert bewusst keinen zweiten vollstaendigen XLSX-/SDMX-Parser;
  die unabhaengige Kontrolle der gesamten Reihe erfolgt damit durch
  Quellenbytes, Generator-Rebuild, lueckenlose Runtimeprojektion und
  unabhaengige Naht-/Markerformeln.
- Die geplante Formulierung „Jahresstichtag“ wurde zu einem segmentierten
  Zeitvertrag praezisiert: 1925-1967 verwenden Jahresendniveaus, 1968 ist
  eine gemischte Naht und ab 1969 werden Jahresdurchschnittsniveaus verwendet.

## Offene Risiken

- Die deutsche Anlegerwaehrung ist waehrend Krieg, Besatzungszeit und
  Waehrungsreform nicht als durchgehend handelbarer, vergleichbarer
  Marktpreis beobachtbar.
- Die USD-Goldparitaet ist kein frei erreichbarer deutscher
  Privatanlegerreturn und kann Marktverbote, Schwarzmarktpreise,
  Spreads oder Kapitalverkehrskontrollen nicht abbilden.
- Der Frankfurter Goldpreis beginnt erst am 18. Juni 1968; das erste
  Jahresniveau ist ein Teiljahresdurchschnitt.
- World-Bank- und EZB-Jahresdurchschnitte sind kein exakter
  Jahresend-Spotreturn und kein investierbarer Produkt-NAV.
- Produktaufschlaege, Spread, Verwahrung, Steuer und Tracking fehlen und
  wirken gegenueber einem Privatanleger tendenziell optimistisch.

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
| CR04-10 | Claude Slice-04-Zweitreview | Poppler-Abhaengigkeit ist an exakte Version und lokalen WinGet-Pfad gebunden | angenommen | portabler Resolver, Mindestversionsvertrag, Checkskript und Tests umgesetzt |
| CR04-13 | Claude Slice-04-Zweitreview | geaenderter Inventarinhalt traegt unveraenderte Revision | angenommen | Inventarrevision auf `2026-07-30.2` erhoeht und hash-/vertraglich getestet |
| CR05-1 | Claude-Review | 1933 (-36,227224) und 1934 (+57,235714) sind ein Konstruktionsartefakt aus Politikpreisstufe und laufendem Wechselkurs; Methode verfehlt die RM-Goldparitaet nur 1933 um 36 Prozent; Regimebruch fehlt in `discontinuities` | Korrektur umgesetzt; Review ausstehend | offizieller RFC-Jahresendpreis 34,06 USD fuer 1933; 1934 vergleicht dagegen den gesetzlichen 35-USD-Anker; Returns jetzt +5,084700/-4,578326; beide Regimebrueche maschinenlesbar |
| CR05-2 | Claude-Review | die fuer alle 101 Jahre deklarierte Jahresdurchschnittskonvention gilt fuer 1925-1967 nicht; JST `DEU.xrusd` ist eine Jahresendreihe; Naht 1967/1968 mischt Jahresende und Teiljahresdurchschnitt | Korrektur umgesetzt; Review ausstehend | `timingSegments` trennt Jahresende 1925-1967, gemischte Naht 1968 und Jahresdurchschnittssegmente ab 1969 |
| CR05-3 | Claude-Review | AK 10 als erfuellt gemeldet, ohne erfuellt zu sein: alle sieben Referenzfaelle goldfrei, MC-Snapshots 04/05 ohne einen einzigen veraenderten Kennwert, Witness ist ein Einjahresaufruf ausserhalb der Backtestmaschinerie | Korrektur umgesetzt; Review ausstehend | echter sechsjaehriger goldhaltiger UI-/Provider-/Backtestlauf mit acht Vorher-/Nachher-Metriken, Outcomes, Row-Hashes und FlowDelta |
| CR05-4 | Claude-Review | `npm test` bricht ohne Poppler vor der ersten Testdatei ab (0 Assertions statt einer roten Datei) | Korrektur umgesetzt; Review ausstehend | Poppler-Check aus dem vorgeschalteten `npm test`-Pre-Gate entfernt; der Quellenrekonstruktionstest bleibt Teil der Suite und kann als konkrete Testdatei rot werden |
| CR05-5 | Claude-Review | Mindestversion 25.07.0 ist behauptet, nicht gemessen; Versionsdrift meldet sich als Datenintegritaetsalarm | offen | ausstehend |
| CR05-6 | Claude-Review | Artefakt veroeffentlicht JST-Beobachtungen 1946-1949, die der eigenen Nullbruecke widersprechen, ohne Begruendung der Auslassung | Korrektur umgesetzt; Review ausstehend | ungenutzte Beobachtungen getrennt unter `excludedSourceObservations` mit Numeraire-/Waehrungsreform-Begruendung |
| CR05-7 | Claude-Review | Gate gegen stilles Zero-Fill besteht aus Generatorliteralen und kann nicht fehlschlagen | Korrektur umgesetzt; Review ausstehend | Generator lehnt unklassifizierte Nullreturns ab und fordert fuer abgeleitete Nullen Gleichheit beider Quellkomponenten |
| CR05-8 | Claude-Review | fuer 95 der 101 Jahre existiert kein unabhaengiger Inhaltsoracle; monatlich neu veroeffentlichte World-Bank-Mappe macht Neupinnung zur Routine | offen | ausstehend |
| CR05-9 | Claude-Review | Nullbruecke 1945-1950 erzwingt gegen die Slice-03-Inflation -27,8 Prozent real und weicht ohne Begruendung von der Brueckenmethode der Cashkette ab | methodische Grenze dokumentiert; Review ausstehend | Artefakt und Referenzdoku stellen klar: Bruecke ist nur nominal neutral und bei positiver Inflation real negativ; keine Gleichsetzung mit Cash-Bruecke |
| CR05-10 | Claude-Review | 37 Prozent des MC-Ziehungsraums tragen eine strukturell unwiederholbare Nullrendite; modellierte Goldvolatilitaet sinkt von 20,45 auf 17,68 | methodische Grenze dokumentiert; Review ausstehend | `monteCarloQualification` weist auf unveraenderte Legacy-Stichprobe und potenziell gedrueckte Goldvolatilitaet hin; keine stille Umgewichtung in diesem Slice |
| CR05-11 | Claude-Review | Erklaerung der abgeleiteten Nullen wird aus dem Jahresbereich erzeugt und nicht geprueft | Korrektur umgesetzt; Review ausstehend | Erklaerung entsteht erst nach Komponentenpruefung; Test fordert den publizierten Komponentenbeweis |
| CR05-12 | Claude-Review | CR04-11 bleibt offen; `layoutExtract.tool.version` ist jetzt ein unbelegtes Literal, `rawDataScope` weiter Klartext im Hash-Container | offen | ausstehend |
| CR05-13 | Claude-Review | `discontinuities` fehlen 1961, 1971/1973 und 1933/1934; Reihenvertrag verlangt maschinenlesbare Markt- und Waehrungsregime | Korrektur umgesetzt; Review ausstehend | 1933, 1934, 1961, 1971 und 1973 ergaenzt; bestehende 1968/1999-Naehte bleiben erhalten |
| CR05-14 | Claude-Review (Runde 2) | 1933er Rundreise auf +5,08/-4,58 gegen die RM-Paritaet verkleinert, aber nicht null; die drei USD-Preisanker sind unhashierte Literale mit URL-Zitat | offen | ausstehend |
| CR05-15 | Claude-Review (Runde 2) | Monte-Carlo-Evidenz enthaelt weiterhin keinen goldhaltigen Fall (499 identische Felder); `capturedAtUtc` von `post-backtest-data-05-v1` liegt vor dem Korrekturstand, den es fingerprintet | offen (Auflage) | ausstehend |
| CR05-16 | Claude-Review (Runde 2) | `gold-german-investor-backtest-delta-v1.json` wurde entfernt statt neben v2 aufbewahrt; die Ersetzung ist nicht offengelegt | offen | ausstehend |

## Review-Feedback von Claude

**Reviewer:** Claude (Primary Reviewer & Analyst)
**Reviewstand:** 2026-07-30, Arbeitsbaum auf Basiscommit `a33876c`, Slice-05-
Aenderungen unversioniert
**Rolle:** ausschliesslich pruefend; keine Programmdatei wurde durch das Review
veraendert. Fuer Mutationsproben zeitweilig veraenderte Dateien sind
byteidentisch wiederhergestellt (Nachweis unten).

### Prueflast und Verifikationsbasis

Unabhaengig nachgemessen, nicht aus dem Slice-Dokument uebernommen:

| Gegenstand | Ergebnis |
|---|---|
| `npm test` | 14.995/14.995 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 1 separates Gate, 0 offene Handles |
| `verify:gold-german-investor-data` | rc=0, `annualReturnHash 9c85f9d4c4e273bdd9922c020dbc844f0397cccc3ebbca695e4eb0701059cb36` |
| `verify:german-cash-money-market-data` | rc=0, `annualReturnHash cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69` (Slice-04-Stand unveraendert) |
| `verify:german-cpi-data`, `verify:global-equity-data` | rc=0; Artefakthashes `ff67229b...`, `c2b754e4...` unveraendert |
| `verify:poppler-toolchain` | rc=0, `Poppler pdftohtml 25.07.0 is compatible (minimum 25.07.0)` |
| Schreibfreiheit aller fuenf Gates | fuenf Artefakthashes vor und nach den Laeufen identisch |
| `git diff --check` | sauber |
| Eigene Vollrekonstruktion aller 101 Goldwerte | Abweichung 0; max. 1,4e-14 (Gleitkommarauschen, Jahr 1934) |

Die eigene Rekonstruktion verwendet einen selbst geschriebenen ZIP-/XLSX-Leser
mit Vorwaertsscan ueber lokale Header statt der zentralen Directory, eine
eigene Zellentokenisierung, eine eigene Feldauswertung der beiden
Bundesbank-CSV-Dateien und eigene Formeln. Sie importiert weder den Generator
noch dessen Testdatei.

### 1. Korrektheit

Die Transformation ist quelltreu implementiert: alle 101 Werte, alle vier
Segmentgrenzen und beide Nahtniveaus reproduzieren sich unabhaengig ohne
Abweichung. Die World-Bank-Goldpreise (1999 279, 2011 1569, 2020 1770, 2024
2388, 2025 3442 USD/oz) und die Frankfurter Fixings (1968 5106,33; 1980
35930,48; 1998 16701,93 DM/kg) stimmen mit den gepinnten Quellbytes ueberein.

Zwei Jahreswerte sind dennoch sachlich falsch, und die deklarierte
Jahreskonvention trifft fuer 43 von 101 Jahren nicht zu: siehe **CR05-1** und
**CR05-2**. Beide sind aus der Methode selbst und aus den gepinnten Quellen
nachweisbar, ohne externe Datenquelle.

Nicht geprueft, weil ausserhalb des Slice-Scopes: Gold-Zielquote, Gold-Cap,
Gold-Guardrails, Transaktions- und Steuersemantik.

### 2. Vertragstreue

Akzeptanzkriterien einzeln nachgemessen:

| AK | Ergebnis |
|---|---|
| 1 (CR04-10 geschlossen) | erfuellt: kein WinGet-Paketpfad und kein `LOCALAPPDATA` in Produktiv- oder Testcode; repoweite Suche findet die Kennung nur noch in Installationshinweisen und in der Negativassertion `tests/poppler-toolchain.test.mjs:63` |
| 2 (CR04-13 geschlossen) | erfuellt: `SIMULATION_DATA_INVENTORY_REVISION` `2026-07-29.5` -> `2026-07-30.2`, Dataset-Hash `798a29ca...` |
| 3 (101 endliche Werte) | erfuellt |
| 4 (kein stilles Zero-Fill) | inhaltlich erfuellt, aber ohne wirksames Gate: siehe **CR05-7** |
| 5 (Regime maschinenlesbar) | teilweise: 1933/1934, 1961 und 1971/1973 fehlen: siehe **CR05-1** und **CR05-13**; Jahreskonvention falsch deklariert: **CR05-2** |
| 6 (Quellwerte exakt) | erfuellt, unabhaengig bestaetigt |
| 7 (Bruecke als Schaetzung erkennbar) | erfuellt; Richtungswirkung nicht offengelegt: **CR05-9** |
| 8 (Vorzeichenrichtigkeit) | erfuellt: 34 negative Jahre, Abbruch bei <= -100 Prozent |
| 9 (goldfreie Faelle ergebnisgleich) | erfuellt: alle acht Metriken in allen sieben Faellen mit Delta 0 |
| 10 (goldhaltige Referenzlaeufe) | **nicht erfuellt**, obwohl als erfuellt berichtet: **CR05-3** |
| 11 (einheitlicher Wertehash) | erfuellt |
| 12 (Kandidat bleibt `pending`) | erfuellt: `post-backtest-data-05-v1` mit `reviewStatus: pending`, Ledgereintrag `BACKTEST-DATA-05` ebenfalls `pending`, `externalValidationStatus: not_validated` |
| 13 (Gates gruen, keine Selbstfreigabe) | erfuellt |

Stille Semantikaenderung ausserhalb der Akzeptanzkriterien: `npm test` ist von
`node tests/run-tests.mjs` auf
`npm run verify:poppler-toolchain && node tests/run-tests.mjs` umgestellt
worden. Das ist keine Testerweiterung, sondern eine neue harte Vorbedingung
der gesamten Suite: **CR05-4**.

### 3. Fehlerbehandlung

Fail-closed geprueft und bestaetigt: fehlende Quelldatei, Quellhash-Abweichung,
fehlende JST-Pflichtjahre (1924-1944 und 1950-1967), fehlende oder
nichtpositive Bundesbank- und World-Bank-Beobachtung, unerwartete Serien-ID in
den CSV-Dateien, nicht kanonisierbare Zahl, Rendite <= -100 Prozent, veraltetes
Artefakt im Verify-Gate. Der Poppler-Resolver wirft mit eigenem Fehlercode und
verwertbarer Meldung.

Nicht abgedeckt: eine still hinzugefuegte Null in einem Nichtmarkerjahr
(**CR05-7**) und eine inhaltlich falsche Quellbeobachtung nach legitimer
Neupinnung eines Quellhashes (**CR05-8**).

### 4. Seiteneffekte

Ausserhalb des Goldpfades veraendert der Slice die Slice-04-Cashkette
(Metadaten, Werte unveraendert), Manifest, Inventar, Backtest-Zielfixture,
Monte-Carlo-Messvertrag und `package.json`. Der Cashwertehash ist unveraendert;
Slice-02- und Slice-03-Artefakte sind byteidentisch. Neun produktive
Programm-/Konfigurationsdateien liegen unter der Stop-Grenze.

Nicht zurueckrollbare Zustandsaenderungen: keine. Alle Generatoren sind im
Verify-Modus schreibfrei; die unveraenderlichen Fixtures verweigern das
Ueberschreiben.

### 5. Was koennte brechen?

Am wenigsten durchdacht ist die Plausibilitaet der vorgelagerten Segmente. Der
Slice prueft, ob die Werte *aus den Quellen folgen*, aber an keiner Stelle, ob
das Ergebnis ein moegliches Marktgeschehen beschreibt. Genau dort liegen
CR05-1, CR05-2, CR05-9 und CR05-10. Zweitens hat der Slice die
Testbarkeit der Suite an ein externes Binaerprogramm gebunden (CR05-4,
CR05-5). Drittens ist die groesste Datenaenderung des Programms bisher
vollstaendig ohne gemessene Finanzwirkung dokumentiert (CR05-3).

---

### Blocker

#### CR05-1 (Blocker) - 1933/1934 tragen ein Wertepaar, das es nicht gegeben hat

Der Generator bildet das Goldniveau vor 1968 als
`statutory USD price x JST DEU.xrusd`. Der gesetzliche US-Preis ist eine
Stufenfunktion (20,67 USD/oz bis 1933, 35 USD/oz ab 1934), der Wechselkurs
dagegen eine laufende Reihe. In dem Jahr, in dem die USA den Goldstandard
verlassen haben, laufen beide auseinander.

Rekonstruiertes Goldniveau in RM/kg nach der Methode des Generators:

| Jahr | 1930 | 1931 | 1932 | **1933** | 1934 | 1935 | 1940 | 1944 |
|---|---|---|---|---|---|---|---|---|
| RM/kg | 2792 | 2816 | 2792 | **1781** | 2800 | 2798 | 2815 | 2801 |

In 20 der 21 Jahre 1924-1944 reproduziert die Methode die
Reichsmark-Goldparitaet von rund 2790 RM/kg auf unter ein Prozent genau. Nur
1933 weicht sie um -36 Prozent ab. Das ist kein Quellenproblem, sondern eine
innere Inkonsistenz der Methode gegen ihren eigenen Politikanker.

Wirkung in der Runtime:

- `gold_eur_perf` 1933 = `-36,227224` Prozent ist damit **das schlechteste
  Goldjahr der gesamten 101-Jahres-Reihe** (danach 1976 -20,40; 2013 -18,26;
  1970 -16,16).
- `gold_eur_perf` 1934 = `+57,235714` Prozent ist das dritthoechste (nach 1980
  +99,88 und 1974 +59,66).
- Ueber das Paar hebt sich der Effekt fast auf (0,6377 x 1,5724 = 1,003). Im
  Monte Carlo hebt er sich nicht auf: `MIN_START_YEAR_INDEX = 4` erlaubt
  Startjahre ab 1929, `ESTIMATED_HISTORY_CUTOFF_YEAR = 1951` wirkt nur bei
  gesetztem `excludeEstimatedHistory` und nur auf das Startjahr. Beide Jahre
  sind unabhaengig voneinander ziehbar; in einem 30-Jahres-IID-Pfad wird 1933
  mit rund 27 Prozent Wahrscheinlichkeit mindestens einmal gezogen.
- Der alte eingebettete Wert war 1933 `+69` - offenbar der Versuch, die
  US-Dollarabwertung 35/20,67 = +69,3 Prozent darzustellen. Der Slice ersetzt
  ihn nicht durch einen belegten Wert, sondern dreht das Vorzeichen um 105
  Prozentpunkte in die andere Richtung. Es ist die groesste Einzeljahresaenderung
  des gesamten Ersatzes.

Zusaetzlich ist der Regimebruch nicht maschinenlesbar: `discontinuities`
enthaelt nur 1945-1950, 1968 und 1999. `qualitySegments` behandelt 1925-1944
als ein homogenes `proxy`-Segment. Der Reihenvertrag des Slice (Zeile 143)
verlangt aber ausdruecklich "Goldstandard- und Marktregime maschinenlesbar",
und die eigene Testliste nennt 1934 als Markerjahr - der Marker wurde gesetzt,
ohne die Plausibilitaet des Werts zu pruefen.

Groessenordnung einer konventionskonsistenten Behandlung: wird fuer 1933 der
zum Jahresende tatsaechlich geltende US-Goldpreis von rund 34,06 USD/oz
verwendet (RFC-/Treasury-Ankaufspreis Ende Dezember 1933) statt der noch nicht
angepassten Paritaet 20,67, ergibt sich 34,06 x 2,6795 x 32,15 = 2934 RM/kg,
also rund +5 Prozent fuer 1933 und rund -5 Prozent fuer 1934 - statt -36,2 und
+57,2. Die Zahl ist als Groessenordnung zu lesen; die Wahl der US-Preisreihe
fuer 1933 ist eine Fachentscheidung.

Moegliche Schliessungen (Reihenfolge ohne Praeferenz):

1. Fuer 1933 eine belegte US-Goldpreisreihe statt der Stufenfunktion verwenden
   und den Uebergang als eigenes Segment mit eigener Evidenzklasse fuehren.
2. Das Niveau 1925-1944 direkt an der Reichsmark-Goldparitaet fuehren und den
   Wechselkurs nur dort verwenden, wo er nicht durch die Paritaet bestimmt ist;
   1933/1934 werden dann zu einem deklarierten Bruch.
3. 1933 und 1934 als `estimated` mit ausdruecklicher Nichtbeobachtbarkeit
   fuehren, in `discontinuities` aufnehmen und aus dem
   Monte-Carlo-Ziehungsraum ausschliessen. Dazu muss der Ausschluss der
   Schaetzhistorie erstmals auch Jahre ausserhalb von 1945-1950 erfassen.

#### CR05-2 (Blocker) - die deklarierte Jahresdurchschnittskonvention gilt fuer 1925-1967 nicht

`returnConvention.timing` lautet fuer alle 101 Jahre "simulation year t
compares annual-average level t with annual-average level t-1"; Manifest,
Inventar (`yearConvention`) und die Referenzdokumente wiederholen das. Fuer
1925-1967 stammt die Waehrungskomponente aber aus JST `DEU.xrusd`, und diese
Reihe ist eine **Jahresendreihe**, keine Jahresdurchschnittsreihe. Gemessen
gegen bekannte DM/USD-Werte:

| Jahr | JST `DEU.xrusd` | DM/USD Jahresdurchschnitt | DM/USD Jahresende |
|---|---|---|---|
| 1975 | 2,6223 | 2,4614 | **2,622** |
| 1980 | 1,9590 | 1,8177 | **1,959** |
| 1985 | 2,4613 | 2,9440 | **2,4613** |
| 1990 | 1,4940 | 1,6157 | **1,494** |
| 1998 | 1,6730 | 1,7597 | **1,673** |

In allen Faellen trifft die Reihe den Jahresendkurs auf vier Dezimalstellen und
weicht vom Jahresdurchschnitt materiell ab (1985 um 16 Prozent). Damit ist die
maschinenlesbare Konventionsangabe fuer 43 der 101 Jahre unzutreffend, und
Akzeptanzkriterium 5 ist mit einer falschen Aussage erfuellt gemeldet.

Folgewirkung auf die Naht 1967/1968: `theoretical1967DemPerKilogram` ist ein
**Jahresendniveau** (4499,98 DM/kg), das gegen den Bundesbank-**Teiljahres-
durchschnitt** 18. Juni bis 31. Dezember 1968 (5106,33 DM/kg) gestellt wird.
Der Slice dokumentiert den Teiljahrescharakter, nicht die
Konventionsmischung. Die +13,474523 Prozent der Naht enthalten damit einen
nicht bezifferten Konventionsanteil.

Das Slice-Dokument beschreibt unter "Abweichungen vom Plan" ausdruecklich, die
Formulierung "Jahresstichtag" sei zu "Jahresdurchschnittsniveaus" praezisiert
worden. Die Praezisierung ging in die falsche Richtung: fuer die erste
Haelfte der Reihe war "Jahresstichtag" die richtige Beschreibung.

#### CR05-3 (Blocker) - kein einziger goldhaltiger Lauf; AK 10 ist als erfuellt berichtet, ohne erfuellt zu sein

Gemessen:

- Alle sieben Backtest-Referenzfaelle in `simulator-backtest-target-v1.json`
  tragen `goldAktiv: false` und `goldZielProzent: 0`. Der Golddeltatest heisst
  seine Faelle selbst `goldFreeCases`.
- Die Monte-Carlo-Snapshots `post-backtest-data-04-v1` und
  `post-backtest-data-05-v1` unterscheiden sich in genau 7 von 506 Feldern:
  `snapshotId`, `sourceReference`, `sliceId`, `capturedAtUtc`, zweimal
  `annualDataHash` und ein entfallenes Policy-Feld. **Kein einziger numerischer
  Kennwert hat sich veraendert** (499 identische Felder).
- Der "goldhaltige Witness" ist `runGoldHoldingReference`: ein einzelner
  Aufruf von `applyAnnualReturnsToPortfolio` fuer ein Jahr auf einer einzigen
  Goldtranche. Er erzeugt keine Backtestzeile, kein Outcome und kein
  `portfolio_flow_delta`.

Akzeptanzkriterium 10 verlangt woertlich "Goldhaltige Referenzlaeufe besitzen
erklaerte Vorher-/Nachher-Deltas; Outcomes bleiben erklaert und `FlowDelta`
bleibt unauffaellig". Ein Einjahresaufruf ausserhalb der Backtestmaschinerie
kann keines dieser drei Merkmale belegen. Der Ergebnisabschnitt bezeichnet ihn
gleichwohl als "deterministischen Referenzfall" und meldet AK 10 als erfuellt.

Damit ist die groesste Datenaenderung des Programms bisher ohne jede gemessene
Finanzwirkung dokumentiert: 34 der 101 Jahre aendern sich um mehr als 10
Prozentpunkte (1980 -6,2 -> +99,88; 2000 -2,7 -> +15,40; 1968 0 -> +13,47),
und die Evidenzbasis zeigt ausschliesslich Invarianz. Der Ledgereintrag
`BACKTEST-DATA-05` behauptet "gold-holding financial paths and aggregate
deltas may change in either direction", obwohl unter den sechs Golden Cases
kein goldhaltiger Pfad existiert. Die Aussage ist so nicht falsifizierbar.

Der Diff-Risiko-Block des Slice nennt die Aenderungstiefe fuer "goldhaltige
historische Backtests und Monte-Carlo-Ergebnisse" ausdruecklich **hoch**. Genau
dieser Bereich ist der ungemessene.

Zur Schliessung genuegt ein fester goldhaltiger Referenzfall ueber die reale
Backtestmaschinerie, mit Vorher-/Nachher-Delta der acht Metriken, Outcome und
`portfolio_flow_delta` - analog zu `assertCashRateMarker` aus der
Slice-04-Nachbesserung (CR04-7). Sinnvolle Jahre: 2000 (Waehrungseffekt),
1980 (Extremjahr), 1949-1952 (Bruecke), 2013 (Verlustjahr).

---

### Weitere Findings

#### CR05-4 - `npm test` laeuft ohne Poppler nicht mehr an

Gemessen in einer Umgebung ohne Poppler im `PATH` und ohne die beiden
Umgebungsvariablen: `npm test` bricht nach 37 Ausgabezeilen mit rc=1 ab,
**null Testdateien ausgefuehrt, null Assertions, kein SUMMARY-Block**. Die
Meldung ist verwertbar: `Compatible Poppler pdftohtml is unavailable. Install
Poppler >= 25.07.0 and expose pdftohtml on PATH, set
RUHESTANDSAPP_POPPLER_BIN, or set RUHESTANDSAPP_PDFTOHTML to the executable.`

Vor Slice 05 hat dieselbe Umgebung die Suite vollstaendig ausgefuehrt und eine
Datei rot gemeldet. CR04-10 hat verlangt, die Primaerquellenpruefung portabel
und dokumentiert zu machen; das ist erfolgt. Gleichzeitig ist die
Abhaengigkeit von "eine Testdatei schlaegt fehl" auf "die Suite ist nicht
ausfuehrbar" verschaerft worden. Poppler wird ausschliesslich fuer das
PDF-Gate einer einzigen Datenreihe gebraucht; ein Beitragender, der an Steuer-,
Renten- oder UI-Code arbeitet, hat ohne dieses Binaerprogramm kein
Testergebnis mehr.

Kein Blocker, weil fail-closed und mit brauchbarer Meldung. Empfohlen: das
Gate an die Testdatei binden, die es braucht, statt an die Suite - oder es als
eigenes Skript neben `test` fuehren, das die Suite nicht blockiert.

#### CR05-5 - die Mindestversion 25.07.0 ist behauptet, nicht gemessen

`POPPLER_MINIMUM_VERSION = '25.07.0'` ist genau die lokal installierte
Version. Es gibt keinen Nachweis, dass 25.07.0 die aelteste Version ist, die
die gepinnten Koordinaten liefert, und keinen, dass irgendeine andere Version
sie liefert. Der Versionsvergleich selbst ist korrekt und monoton (`25.07.0`
-> `[25,7,0]`, `26.01.0` -> `[26,1,0]`); geprueft wird aber die Versionsnummer,
nicht das Ergebnis.

Praktische Folge: Poppler 25.07.0 ist juenger als die Pakete der meisten
verbreiteten Distributionen. Der erste Beitragende mit einer neueren Version,
deren Koordinatenausgabe sich verschoben hat, erhaelt nicht "falsche
Werkzeugversion", sondern
`Bundesbank layout extract disagrees with the independent PDF coordinate
oracle` - eine Meldung, die wie ein Datenintegritaetsalarm aussieht und die
Ursachensuche in die Quellen statt in die Toolchain lenkt.

#### CR05-6 - das Artefakt veroeffentlicht Beobachtungen, die seiner eigenen Bruecke widersprechen

`sourceObservations.jstGermanCurrencyPerUsd` enthaelt 1946 = 17,5, 1947 = 23,5,
1948 = 20,5 und 1949 = 6,05. Die Kette setzt fuer genau diese Jahre 0. Aus den
Werten des Artefakts selbst laesst sich 1947 zu rund +34 Prozent und 1948 zu
rund -13 Prozent herleiten. `currencyRegimes` begruendet die Bruecke damit,
dass "no comparable continuous German annual gold/FX market series is used" -
das ist eine Entscheidung, keine Datenlage, und die Entscheidung ist nirgends
begruendet. Nur 1945 fehlt in der Quelle tatsaechlich.

Fuer 1950 ist die Bruecke zwingend, weil 1949 als Vorjahresniveau in einer
anderen Waehrung liegt; das ist konsistent und sollte so benannt werden.

#### CR05-7 - das Gate gegen stilles Zero-Fill kann nicht fehlschlagen

`gapPolicy.fallbackZeroSegments: []` und `gapPolicy.rejectMissingOrNonFinite:
true` sind Literale im Generator, keine berechneten Groessen. Test 4 pruefen
genau diese Literale (`fallbackZeroSegments.length === 0`,
`rejectMissingOrNonFinite === true`). `zeroObservations` und die im Test
gebildete Liste `zeroYears` entstehen beide aus demselben Datenobjekt, ihr
Vergleich ist tautologisch.

Damit hat Akzeptanzkriterium 4 kein wirksames Gate. Eine still ergaenzte Null
in einem Nichtmarkerjahr wuerde von keiner inhaltlichen Pruefung erfasst; sie
faellt nur ueber die handgepflegten Fingerabdruecke auf. Das ist in Probe A
gemessen: eine verfaelschte Frankfurt-Beobachtung mit mitgezogenem Quellhash
wurde von vier Fingerabdruck-Assertions gemeldet
(`Delta fixture should pin the active gold chain`,
`Inventory raw-data hash should match`,
`Manifest hash should match canonical data`,
`Backtest-Data Slice 05 data version must match`) und von keinem
Inhaltsvergleich.

#### CR05-8 - fuer 95 der 101 Jahre existiert kein unabhaengiger Inhaltsoracle

Test 3 prueft sechs Markerjahre (1925, 1934, 1969, 1999, 2000, 2025) mit
hart hinterlegten Zahlenliteralen. Alle uebrigen Gates vergleichen Hashes des
Generatorergebnisses gegen frueher festgehaltene Hashes desselben Ergebnisses;
sie erkennen **Aenderung**, nicht **Richtigkeit**. Ein von Anfang an falscher
Wert in einem der 95 Nichtmarkerjahre wuerde von der Suite nie beanstandet.

Der Slice erklaert das unter "Abweichungen vom Plan" als bewusste
Entscheidung: es werde kein zweiter vollstaendiger XLSX-/SDMX-Parser
implementiert. Das ist genau die Konstellation, die in Slice 04 als CR04-1
Blocker war und dort durch einen zweiten, andersartig selektierenden Leser
geschlossen wurde. Gegenueber Slice 04 ist die Lage entspannter, weil hier alle
vier Quellen Originaldateien sind, die der Code selbst liest - aber der
Rueckschritt gegenueber dem in Slice 04 erreichten Stand ist real.

Realistischer Ausloeser: die World-Bank-Pink-Sheet-Arbeitsmappe wird monatlich
neu veroeffentlicht (`dataAsOf: updated 2026-03-03; retrieved 2026-07-30`).
Jede Aktualisierung erzwingt eine Neupinnung des Dateihashes. Danach sind 26
der 27 EUR-Goldwerte ohne inhaltliche Kontrolle.

Ich habe die 101 Werte fuer diesen Reviewstand selbst unabhaengig
rekonstruiert; die Abweichung ist 0. Diese Aussage gilt fuer heute und ersetzt
kein Gate.

#### CR05-9 - die Nullbruecke 1945-1950 ist eine gerichtete Annahme

Gegen die Slice-03-Inflationskette gerechnet ergibt die Bruecke fuer einen
Goldhalter einen **kumulierten Realverlust von -27,8 Prozent** ueber sechs
Jahre (Inflation 1945 2,84; 1946 8,97; 1947 6,96; 1948 15,38; 1949 7,04; 1950
-6,40 Prozent bei 0 Prozent Nominalrendite). Das ist das Gegenteil des
historisch dokumentierten Verhaltens von Gold in dieser Periode und die
groesste Realwirkung, die eine Modellannahme in der Reihe hat.

Die Bruecke ist erreichbar: der Referenzfall
`completed_numeraire_seam_1949_1952` liegt darin, und Monte-Carlo-Startjahre
sind standardmaessig ab 1929 zugelassen. `discontinuities.limitation` sagt
korrekt, es handle sich nicht um eine beobachtete Rendite; Richtung und
Groessenordnung der auferlegten Realwirkung fehlen. Die Nullwahl ist zudem
nicht neutral: eine Fortschreibung des letzten beobachteten Niveaus waere
dieselbe Methode, die die Cashkette in Slice 04 fuer 1945-1948 gewaehlt hat.
Zwei Reihen desselben Programms behandeln dieselbe Luecke mit
unterschiedlichen Methoden und unterschiedlichen Endjahren, ohne dass die
Abweichung begruendet ist.

#### CR05-10 - 37 Prozent des Ziehungsraums tragen eine strukturell unwiederholbare Nullrendite

Von den 97 ab 1929 ziehbaren Jahren haben 36 einen Absolutwert unter einem
Prozent - fast alle aus der Festparitaetszeit. Wirkung auf die
Verteilungsparameter der Goldrendite:

| Stichprobe | Standardabweichung | Mittelwert |
|---|---|---|
| 1929-2025 | 17,68 | 5,15 |
| 1929-2025 ohne 1933/1934 | 16,51 | - |
| 1968-2025 | 20,45 | 8,34 |

Nur 1945-1950 ist als `estimated` klassifiziert, also greift
`excludeEstimatedHistory` nicht fuer 1925-1944 und 1951-1967. Wer die
Schaetzhistorie ausschliesst, zieht weiterhin 39 Paritaetsjahre. Der Abschnitt
"Offene Risiken" nennt die fehlende Investierbarkeit, nicht die daraus
folgende Verzerrung der modellierten Goldvolatilitaet in jedem
Monte-Carlo-Pfad.

#### CR05-11 - die Erklaerung der abgeleiteten Nullen wird nicht geprueft

Der Text "Derived zero: both the statutory USD gold anchor and the observed
JST German FX rate are unchanged from the prior year" wird allein aus dem
Jahresbereich erzeugt, nicht aus einem Vergleich der beiden Komponenten. Fuer
1942-1944 und 1951-1953 trifft er heute zu (Wechselkurs jeweils exakt
identisch). Zwei sich gegenseitig aufhebende Aenderungen ergaeben dieselbe
Null mit einer falschen maschinenlesbaren Begruendung.

#### CR05-12 - CR04-11 bleibt offen und ist an einer Stelle unschaerfer geworden

`layoutExtract.tool.version` im Cash-Artefakt ist von der (falsch
wiederverwendeten) Konstante auf das hart notierte Literal `'25.07.0'`
umgestellt worden. Die Angabe betrifft `pdftotext`, wird nirgends geprueft und
ist jetzt eine Magic-String-Dublette der Poppler-Mindestversion.
`hashes.rawDataScope` ist in beiden Artefakten weiterhin eine Klartextangabe
im Hash-Container. Beides bleibt leichtes Restrisiko, nicht Slice-05-Scope -
aber die Umstellung hat die Angabe nicht belegt, sondern nur verschoben.

#### CR05-13 - `discontinuities` bleibt unvollstaendig

Nicht enthalten sind der DM-Aufwertungsschritt 1961 (im Wert sichtbar:
-4,18 Prozent), das Ende von Bretton Woods 1971/1973 (1971 +8,12; 1972 +30,70;
1973 +38,63 Prozent) und der Politikpreissprung 1933/1934 (CR05-1). Der
Reihenvertrag verlangt maschinenlesbare Markt- und Waehrungsregime; geliefert
sind drei von mindestens sechs.

---

### Geprueft und verworfen

| Hypothese | Ergebnis |
|---|---|
| Werte weichen von den gepinnten Quellen ab | verworfen: eigene Vollrekonstruktion mit eigenen Parsern, Abweichung 0 (max. 1,4e-14) |
| USD/EUR ist invertiert angewendet | verworfen: die Bundesbankreihe ist "1 EUR = ... USD"; die Division ergibt EUR/oz; 1999 = 261,78 EUR/oz ist plausibel |
| Die Naht 1998/1999 enthaelt einen Basissprung (Frankfurter Kilobarrenpreis mit Haendlermarge oder Umsatzsteuer gegen Londoner Notierung) | verworfen: 16701,93 DM/kg entsprechen bei DM/USD 1,7597 rund 295,2 USD/oz gegen World Bank 294,1 USD/oz, also 0,4 Prozent; kein materieller Sprung |
| Die Umsatzsteuerbefreiung fuer Goldbarren 1993 erzeugt eine Stufe in der Frankfurt-Reihe | nicht bestaetigt: das Verhaeltnis Frankfurt zu Weltpreis streut 1969-1998 zwischen 0,905 und 1,192 ohne Stufe bei 1993 (0,960 gegen 1992 0,967 und 1994 1,048); die Streuung stammt aus der Jahresendkonvention der FX-Reihe (siehe CR05-2) |
| Die Goldrendite wird doppelt oder auf Nichtgoldtranchen angewendet | verworfen: exakt `marketValue x (1 + r/100)` auf der Goldtranche; alle acht Metriken der goldfreien Faelle mit Delta 0 |
| Der Generator-Refactor hat Slice-04-Cashwerte veraendert | verworfen: `annualReturnHash cf5471a3...` unveraendert, Verify-Gate gruen |
| Slice-02-/Slice-03-Artefakte wurden angefasst | verworfen: `c2b754e4...` und `ff67229b...` unveraendert |
| `readJstGermanUsdRates` akzeptiert stillschweigend eine Luecke | verworfen: `requiredYears` deckt 1924-1944 und 1950-1967 ab und bricht ab |
| Negative Jahreswerte werden begrenzt | verworfen: 34 negative Jahre, Abbruch bei <= -100 Prozent |
| Die Revisionserhoehung fuer CR04-13 ist kosmetisch | verworfen: Inventarrevision, Manifestrevision und Dataset-Hash sind konsistent geaendert und getestet |
| Der Monte-Carlo-Kandidat wurde promoviert oder eine unveraenderliche Fixture veraendert | verworfen: `reviewStatus: pending`, `currentReference` unveraendert, Ueberschreibsperren aktiv |

### Reviewseitige Eingriffe und Wiederherstellung

Fuer Probe A wurden `bundesbank-frankfurt-gold-annual-1968-1998.csv`,
`scripts/build-gold-german-investor-chain.mjs` und
`app/simulator/gold-german-investor-chain.js` zeitweilig veraendert und
anschliessend byteidentisch wiederhergestellt. Nachweis nach Abschluss:

```
c08654b065a5685456bf2ebd954b43fec3cef9a9755f121d9dab6420c9410e2e  bundesbank-frankfurt-gold-annual-1968-1998.csv
1a1f276f634f9d3b154fcd7853b07d8a0220b441c241e35af4f42a8ea37527b1  scripts/build-gold-german-investor-chain.mjs
6c58281e32528aeeeed93181d7c927b92dd3e2675c5ec45c94911f9919fb6c91  app/simulator/gold-german-investor-chain.js
```

Ausser diesem Slice-Dokument hat das Review keine Datei des Repositories
veraendert.

## Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:**
  - **CR05-1** - 1933 (-36,227224 Prozent) und 1934 (+57,235714 Prozent) sind
    ein Konstruktionsartefakt aus Politikpreisstufe und laufendem
    Wechselkurs; die Methode reproduziert die Reichsmark-Goldparitaet in 20 von
    21 Jahren und verfehlt sie 1933 um 36 Prozent. 1933 ist damit das
    schlechteste Goldjahr der gesamten Reihe und im Monte Carlo unabhaengig
    von seinem Gegenjahr ziehbar. Der Regimebruch fehlt in
    `discontinuities`.
  - **CR05-2** - die fuer alle 101 Jahre deklarierte
    Jahresdurchschnittskonvention gilt fuer 1925-1967 nicht: JST `DEU.xrusd`
    ist eine Jahresendreihe (gegen fuenf bekannte DM/USD-Wertepaare
    nachgemessen). Die Naht 1967/1968 stellt ein Jahresendniveau gegen einen
    Teiljahresdurchschnitt.
  - **CR05-3** - Akzeptanzkriterium 10 ist als erfuellt gemeldet, ohne erfuellt
    zu sein: alle sieben Referenzfaelle sind goldfrei, die
    Monte-Carlo-Snapshots 04 und 05 unterscheiden sich in keinem einzigen
    numerischen Kennwert, und der "goldhaltige Witness" ist ein
    Einjahresaufruf ausserhalb der Backtestmaschinerie. Die groesste
    Datenaenderung des Programms bisher hat keine gemessene Finanzwirkung.
- **Restrisiken:**
  - CR05-4 `npm test` ist ohne Poppler nicht ausfuehrbar (0 Assertions statt
    einer roten Datei).
  - CR05-5 die Mindestversion 25.07.0 ist behauptet, nicht gemessen; ein
    Versionsdrift meldet sich als Datenintegritaetsalarm.
  - CR05-6 das Artefakt veroeffentlicht JST-Beobachtungen 1946-1949, die seiner
    eigenen Nullbruecke widersprechen, ohne die Auslassung zu begruenden.
  - CR05-7 das Gate gegen stilles Zero-Fill besteht aus Literalen und kann
    nicht fehlschlagen.
  - CR05-8 fuer 95 der 101 Jahre existiert kein unabhaengiger Inhaltsoracle;
    die monatlich neu veroeffentlichte World-Bank-Mappe macht die Neupinnung
    zur Routine.
  - CR05-9 die Nullbruecke 1945-1950 erzwingt gegen die Slice-03-Inflation
    -27,8 Prozent real und weicht ohne Begruendung von der Brueckenmethode der
    Cashkette ab.
  - CR05-10 37 Prozent des Monte-Carlo-Ziehungsraums tragen eine strukturell
    unwiederholbare Nullrendite; die modellierte Goldvolatilitaet sinkt von
    20,45 auf 17,68.
  - CR05-11 die Erklaerung der abgeleiteten Nullen wird nicht geprueft.
  - CR05-12 CR04-11 bleibt offen; `layoutExtract.tool.version` ist jetzt ein
    unbelegtes Literal.
  - CR05-13 `discontinuities` fehlen 1961, 1971/1973 und 1933/1934.
  - Uebernommen aus frueheren Slices: CR04-11, CR04-12, CR02-10, CR02-17, die
    nicht umgesetzte Geldvermoegensabschreibung 1948 sowie die ungetesteten
    Nahtjahre der Cashkette.
- **Pre-Mortem:** In drei Monaten faellt auf, dass goldhaltige
  Monte-Carlo-Laeufe ein unplausibles schlechtestes Goldjahr von -36 Prozent
  und gleichzeitig eine zu niedrige Goldvolatilitaet zeigen. Ursache sind
  1933/1934 und die 39 Paritaetsjahre im Ziehungsraum. Weil `gold_eur_perf`
  jetzt eine Quellenkette, Hashes, einen reproduzierbaren Generator und ein
  gruenes Verify-Gate besitzt, gilt die Reihe als geprueft; die Fehlersuche
  laeuft in die Gold-Transaktionslogik und in das Sampling statt in die Daten.
  Zweitwahrscheinlichste Ursache: eine Routineaktualisierung der
  World-Bank-Arbeitsmappe zieht einen veraenderten historischen Goldpreis
  mit, die Neupinnung der Hashes laesst ihn passieren, und keiner der 95
  Nichtmarkerjahre-Werte wird dabei inhaltlich geprueft.

## Codex-Korrekturstand nach dem Claude-Review

**Datum:** 2026-08-01  
**Status:** Blockerkorrekturen implementiert und technisch geprueft;
erneutes externes Review ausstehend. Der vorstehende Claude-Review bleibt als
unveraenderter Befund des damaligen Arbeitsstands erhalten.

### CR05-1 und CR05-2: Preisanker und Zeitkonvention

- Fuer 1933 wird nicht mehr der veraltete gesetzliche Preis von 20,67 USD
  verwendet. Der Generator nutzt den im Jahresbericht der Federal Reserve Bank
  of New York dokumentierten letzten RFC-Ankaufspreis 1933 von 34,06 USD,
  festgesetzt am 18. Dezember. 1934 verwendet 35 USD gegen diesen
  Jahresendanker.
- Dadurch aendern sich die beiden Artefaktreturns von `-36,227224%` und
  `+57,235714%` auf `+5,084700%` und `-4,578326%`.
- `returnConvention.timingSegments` trennt nun maschinenlesbar JST-/
  Policy-Jahresende 1925-1967, die gemischte Naht aus 1967-Jahresende und
  1968-Teiljahresdurchschnitt, fortlaufende Frankfurt-Jahresdurchschnitte
  1969-1998, die 1999er Quell-/Numeraire-Naht und die Jahresdurchschnitte
  2000-2025.
- `discontinuities` enthaelt jetzt 1933, 1934, 1961, 1968, 1971, 1973 und
  1999.

### CR05-3: echter goldhaltiger Backtest

`tests/simulator-backtest-characterization.test.mjs` fuehrt denselben
sechsjaehrigen Fall `gold_holding_2000_2005` zweimal ueber `runBacktest()` und
den produktiven `HistoricalBacktestContractProviderV1` aus. Die Eingaben
enthalten 200.000 EUR Gold und ein aktives Zehn-Prozent-Goldziel. Der
Vorher-Provider ersetzt fuer den abgedeckten Zeitraum ausschliesslich die
Goldwerte durch den gepinnten Slice-04-Stand; der Nachher-Lauf verwendet den
aktuellen Manifestprovider.

| Kennwert | Slice 04 | korrigierter Slice 05 | Delta |
|---|---:|---:|---:|
| Endvermoegen | 1.855.006,76 EUR | 1.799.527,46 EUR | -55.479,30 EUR |
| Entnahmen gesamt | 175.200,00 EUR | 175.200,00 EUR | 0,00 EUR |
| Steuern gesamt | 0,00 EUR | 1.599,44 EUR | +1.599,44 EUR |
| Jahre mit mindestens 10% Kuerzung | 4 | 4 | 0 |
| maximale Kuerzungsserie | 4 | 4 | 0 |
| maximaler Drawdown | 33,805127% | 34,538776% | +0,733649 pp |
| minimale Runway-Deckung | 75,585921% | 95,722447% | +20,136526 pp |
| maximaler absoluter FlowDelta | 0,00 EUR | 0,00 EUR | 0,00 EUR |

Beide Outcomes sind `completed`; die kanonischen Row-Hashes unterscheiden
sich. Die Evidenz liegt in `goldDataDeltaOracle` der aktiven
Backtest-Zielfixture und in
`tests/fixtures/gold-german-investor-backtest-delta-v2.json`.

### Eng verbundene Reviewrisiken

- `npm test` startet die Testsuite wieder direkt; Poppler ist kein
  vorgeschaltetes 0-Assertion-Pre-Gate mehr. Das eigenstaendige
  `verify:poppler-toolchain` bleibt fuer gezielte Toolchain-Diagnose erhalten.
- JST 1946-1949 wird nicht mehr als verwendete Beobachtung ausgegeben, sondern
  mit Begruendung unter `excludedSourceObservations` getrennt.
- Abgeleitete Nullreturns werden nur erzeugt, wenn USD-Goldanker und JST-FX
  gegenueber dem Vorjahr beide exakt unveraendert sind. Jede andere Null
  ausserhalb der expliziten Bruecke bricht den Generator ab.
- Die nominale, bei positiver Inflation real negative Brueckenwirkung und die
  potenziell gedrueckte Goldvolatilitaet durch Proxy-/Brueckenjahre im
  unveraenderten Legacy-Monte-Carlo-Pool sind explizit als Modellgrenzen
  dokumentiert.
- CR05-5, CR05-8 und CR05-12 bleiben als Restrisiken offen; sie sind keine der
  drei formalen Claude-Blocker und wurden nicht als freigegeben markiert.

### Aktuelle Fingerprints

- Gold-Returnhash:
  `068a15a99c665b48dc14a187b654033d292c9de6ed3cf712f7e789ddcec049aa`
- Gold-Methodenhash:
  `c81c8314ee281cace26bbd69f502d0de22106e34aa3b1bf74739555cf9c9f86e`
- Manifest-/Inventarrevision: `2026-08-01.1`
- Dataset-Hash:
  `e2ee9db77d02cca23ca451e16ed16b565de44411807c550e49f415e7bed45d0a`
- Monte-Carlo-Datenversion: `annualDataHash f7767289`,
  `regimeHash 7d37583a`

## Zweitreview von Claude (Runde 2)

**Reviewer:** Claude (Primary Reviewer & Analyst)
**Reviewstand:** 2026-08-01, Arbeitsbaum auf Basiscommit `a33876c`,
Slice-05-Aenderungen weiterhin unversioniert
**Gegenstand:** Codex-Korrekturstand zu den drei Blockern CR05-1, CR05-2 und
CR05-3 sowie zu den eng verbundenen Reviewrisiken
**Rolle:** ausschliesslich pruefend; fuer Mutationsproben zeitweilig
veraenderte Dateien sind byteidentisch wiederhergestellt (Nachweis am Ende).

### Unabhaengig nachgemessene Gates

| Gegenstand | Ergebnis |
|---|---|
| `npm test` | 15.055/15.055 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| davon Goldkette / Golddelta / Charakterisierung / Poppler | 491 / 246 / 101 / 12 Assertions, alle gruen |
| `verify:gold-german-investor-data` | rc=0, `annualReturnHash 068a15a99c665b48dc14a187b654033d292c9de6ed3cf712f7e789ddcec049aa` |
| `verify:german-cash-money-market-data` | rc=0, `cf5471a3...` unveraendert |
| `verify:german-cpi-data`, `verify:global-equity-data` | rc=0; `ff67229b...`, `c2b754e4...` unveraendert |
| `verify:poppler-toolchain` | rc=0 |
| Schreibfreiheit aller fuenf Gates | fuenf Artefakthashes vor und nach den Laeufen identisch |
| `git diff --check` | sauber |
| Eigene Vollrekonstruktion aller 101 Werte mit dem neuen 1933-Anker | Abweichung 0; max. 1,4e-14 |

### CR05-1 - geschlossen

Der Preisanker ist segmentiert: `usdGoldPriceAnchors` fuehrt 1924-1932 mit
20,67 USD (`statutory_fixed_price`), **1933 mit 34,06 USD**
(`official_rfc_purchase_price`, `observationTiming:
year_end_price_fixed_1933-12-18`, FRASER-Belegstelle) und 1934-1967 mit 35 USD.
Die beiden Jahreswerte aendern sich von `-36,227224` und `+57,235714` auf
`+5,084700` und `-4,578326`.

Wirkung, unabhaengig nachgerechnet:

| Kennzahl | vor der Korrektur | nach der Korrektur |
|---|---|---|
| Goldniveau 1933 nach der Methode | 1781 RM/kg | 2934 RM/kg |
| schlechtestes Jahr der Reihe | 1933 mit -36,23 | 1976 mit -20,40 |
| bestes Jahr | 1980 mit +99,88 | 1980 mit +99,88 |
| zweitbestes Jahr | 1934 mit +57,24 | 1974 mit +59,66 |
| Standardabweichung 1929-2025 | 17,68 | 16,37 |
| Mittelwert 1929-2025 | 5,15 | 4,94 |

Beide Artefaktausreisser sind aus beiden Verteilungsraendern verschwunden; die
Extremwerte der Reihe sind jetzt durchgehend beobachtete Marktjahre.
`discontinuities` enthaelt 1933 und 1934 als eigene Eintraege mit
Runtimebehandlung und Limitation, `qualitySegments` trennt 1925-1932, 1933 und
1934-1944.

Restwirkung siehe **CR05-14**: die Rundreise ist von -36/+57 auf +5,1/-4,6
gesunken, aber nicht null.

### CR05-2 - geschlossen

`returnConvention.timingSegments` benennt jetzt fuenf Segmente maschinenlesbar
und trifft den gemessenen Sachverhalt:

| Segment | Konvention |
|---|---|
| 1925-1967 | `end_of_year_policy_price_times_end_of_year_fx` |
| 1968 | `mixed_seam_1967_end_of_year_to_1968_partial_year_average` |
| 1969-1998 | `annual_average_to_annual_average_frankfurt_fixing` |
| 1999 | `mixed_source_and_numeraire_annual_average_seam` |
| 2000-2025 | `annual_average_world_bank_gold_divided_by_annual_average_usd_eur` |

Die Segmentnotiz benennt ausdruecklich, dass JST `DEU.xrusd` eine
Jahresendreihe ist - genau der in Runde 1 gemessene Befund. Die Korrektur ist
nicht auf das Artefakt beschraenkt geblieben: `HISTORICAL_DATA_MANIFEST`
(`variant`, `transformation`) und `SIMULATION_DATA_INVENTORY`
(`yearConvention`, `transformation`) tragen dieselbe segmentierte Aussage, und
`docs/reference/DATA_SOURCES.md` fuehrt die Reihe in der Manifesttabelle als
"segmented-timing" mit "year-end policy/official gold price times year-end
German FX". Die pauschale Jahresdurchschnittsbehauptung ist an allen fuenf
Stellen ersetzt.

Die Konventionsmischung der Naht 1967/1968 ist damit erstmals benannt statt
verdeckt.

### CR05-3 - geschlossen

`tests/simulator-backtest-characterization.test.mjs` fuehrt den neuen Fall
`gold_holding_2000_2005` zweimal ueber `runBacktest()` aus - mit 200.000 EUR
Goldtranche, 1.700.000 EUR Aktienaltbestand, 100.000 EUR Geldmarkt, aktivem
Zehn-Prozent-Goldziel und identischem `inputHash` fuer beide Laeufe. Der
Vorher-Lauf haengt an einem eigenen `HistoricalBacktestContractProviderV1`, der
ausschliesslich `gold_eur_perf` fuer 2000-2005 durch den Slice-04-Stand
ersetzt. Die sechs Vorher-Werte (`-2,7 / 4,3 / 19,4 / 11,7 / 2,2 / 22,3`)
stimmen exakt mit `git show HEAD:app/simulator/simulator-data.js` ueberein.

Aus der aktiven Zielfixture ausgelesenes `goldDataDeltaOracle`:

| Kennwert | vorher | nachher | Delta |
|---|---:|---:|---:|
| `summaryEndWealth` | 1.855.006,76 | 1.799.527,46 | -55.479,30 |
| `totalWithdrawal` | 175.200,00 | 175.200,00 | 0 |
| `totalTax` | 0,00 | 1.599,44 | +1.599,44 |
| `yearsWithReductionAtLeast10Pct` | 4 | 4 | 0 |
| `maxReductionStreak` | 4 | 4 | 0 |
| `maxDrawdownPct` | 33,805127 | 34,538776 | +0,733649 |
| `minRunwayCoveragePct` | 75,585921 | 95,722447 | +20,136526 |
| `maxAbsolutePortfolioFlowDelta` | 0 | 0 | 0 |

Beide Outcomes `completed`, Row-Hashes verschieden, `FlowDelta` in beiden
Laeufen exakt null. Der Fall ist als achter Fall in die Zielfixture
aufgenommen; `goldDataDeltaOracle` steht in `approvedContractChangePaths`. Der
Golddeltatest filtert die goldfreien Faelle ueber die Vorherdatei und prueft
weiterhin `goldFreeCases.length === before.cases.length`, sodass kein
bestehender Fall stillschweigend entfaellt.

**Probe F** belegt, dass der Nachweis nicht selbstbestaetigend ist: werden die
sechs Vorher-Werte auf die aktuellen Kettenwerte gesetzt, werden beide Laeufe
identisch und die Assertion
`Gold data replacement should change the real backtest rows` schlaegt fehl
(gemessen: 15.031/15.032, eine fehlgeschlagene Assertion). Damit ist zugleich
belegt, dass die Providerinjektion den Vorher-Lauf tatsaechlich steuert.

### Eng verbundene Reviewrisiken - Ergebnis

- **CR05-4 geschlossen.** `package.json` fuehrt `test` wieder als
  `node tests/run-tests.mjs`. **Probe G** in einer Umgebung ohne Poppler im
  `PATH`: die Suite laeuft durch und meldet 14.861 Assertions, 0
  fehlgeschlagene Assertions, **1 fehlgeschlagene Datei** - die
  Cash-PDF-Rekonstruktion, die Poppler wirklich braucht. Das ist exakt das
  Verhalten vor Slice 05. `verify:poppler-toolchain` bleibt als eigenes
  Diagnoseskript erhalten.
- **CR05-6 geschlossen.** `sourceObservations.jstGermanCurrencyPerUsdUsed`
  enthaelt 1946-1949 nicht mehr; die vier Werte stehen mit Begruendung unter
  `excludedSourceObservations`. Der Widerspruch zwischen veroeffentlichter
  Beobachtung und Nullbruecke ist aufgehoben.
- **CR05-7 und CR05-11 geschlossen.** `buildZeroObservations` klassifiziert
  jede Null und bricht sonst ab. Drei Mutationsproben:

  | Probe | Eingriff | Ergebnis |
  |---|---|---|
  | C | `annualReturnsPct[1960] = 0` | rc=1, `Derived zero is not supported by unchanged source components` |
  | D | `annualReturnsPct[1975] = 0` | rc=1, `Unclassified zero gold return is forbidden` |
  | E | `annualReturnsPct[1947] = 0.5` | rc=1, `Explicit post-war bridge must remain exactly zero` |

  Jede der zwoelf verbleibenden Nullen traegt jetzt `classification` und - bei
  den sechs abgeleiteten - einen `componentProof` mit beiden Vorjahreswerten.
  Der tautologische Charakter der frueheren Pruefung ist beseitigt.
- **CR05-13 geschlossen.** `discontinuities` enthaelt 1933, 1934, 1945-1950,
  1961, 1968, 1971, 1973 und 1999.
- **CR05-9 teilweise.** `discontinuities.limitation` benennt jetzt, dass die
  Bruecke bei positiver Inflation real negativ wirkt. Die Richtung ist damit
  offengelegt, die Groessenordnung nicht beziffert, und die Abweichung von der
  Fortschreibungsmethode der Cashkette (1945-1948) bleibt unbegruendet. Bleibt
  Restrisiko.
- **CR05-10 teilweise.** `monteCarloQualification` benennt Ziehungsraum und
  Grenze ausdruecklich ("can understate modeled gold volatility; no silent
  exclusion or reweighting is applied in this slice"). Das Verhalten ist
  unveraendert: weiterhin 36 der 97 ziehbaren Jahre mit einem Absolutwert
  unter einem Prozent. Bleibt Restrisiko, jetzt dokumentiert.
- **CR05-5, CR05-8 und CR05-12** hat Codex ausdruecklich als offen bezeichnet
  und nicht als geschlossen markiert. Das ist zutreffend; sie bleiben
  unveraendert offen.

---

### Neue Findings dieser Runde

#### CR05-14 - die 1933er Rundreise ist verkleinert, nicht beseitigt

Nach der Korrektur ergibt die Methode fuer 1933 ein Niveau von 2934 RM/kg
gegen 2792 (1932) und 2800 (1934), also weiterhin eine Rundreise von +5,08
Prozent und -4,58 Prozent gegen die in beiden Nachbarjahren reproduzierte
Reichsmark-Goldparitaet. Die Abweichung ist um den Faktor sieben kleiner und
sachlich vertretbar - der RFC-Ankaufspreis und der am Markt gehandelte Dollar
sind Ende 1933 auseinandergelaufen, und der JST-Jahresendkurs bildet den
Marktdollar ab. Sie ist aber nicht null und in `discontinuities` nicht
beziffert.

Zweiter Teil desselben Findings: die drei USD-Preisanker 20,67, 34,06 und 35
sind unhashierte Literale mit URL-Zitat, waehrend alle vier uebrigen Quellen
als gepinnte Dateien mit SHA-256 gefuehrt werden. Der neue Anker 34,06 steuert
zwei Jahreswerte allein und ist der einzige Wert der Kette, der weder aus einer
gepinnten Datei noch aus einer Formel folgt. Eine spaetere "Korrektur" dieses
Literals auf einen Jahresdurchschnittspreis wuerde fuenf Werte der 1930er Jahre
verschieben, und nur die Fingerabdruck-Gates wuerden widersprechen.

#### CR05-15 - die Monte-Carlo-Evidenz kennt weiterhin keinen goldhaltigen Fall

Die Snapshots `post-backtest-data-04-v1` und `post-backtest-data-05-v1`
unterscheiden sich unveraendert in genau 7 von 506 Feldern; **kein einziger
numerischer Kennwert weicht ab** (499 identische Felder). Der Ledgereintrag
`BACKTEST-DATA-05` behauptet weiterhin "gold-holding financial paths and
aggregate deltas may change in either direction", ohne dass unter den sechs
Golden Cases ein goldhaltiger Pfad existiert. Fuer den Backtest ist der Beleg
mit CR05-3 erbracht, fuer den Monte Carlo nicht.

Zusaetzlich traegt `post-backtest-data-05-v1` weiterhin
`capturedAtUtc: 2026-07-30T00:00:00.000Z`, obwohl der darin festgehaltene
`annualDataHash f7767289` erst aus dem Korrekturstand vom 2026-08-01 stammt.
Der Zeitstempel beschreibt eine Messung, die es zu diesem Zeitpunkt nicht
gegeben haben kann.

#### CR05-16 - die Vorgaengerfixture wurde entfernt statt aufbewahrt

`tests/fixtures/gold-german-investor-backtest-delta-v1.json` existiert nicht
mehr; es gibt ausschliesslich `-v2.json`. Der Korrekturabschnitt nennt nur die
neue Datei und legt die Entfernung nicht offen. Die Versionsbenennung und das
Vorbild `post-backtest-data-04-v1` / `-05-v1` legen ein Nebeneinander nahe. Die
praktische Wirkung ist gering, weil die Datei nie versioniert war und die
Vorher-Werte im Erstreview festgehalten sind; die Evidenzfuehrung sollte die
Ersetzung aber benennen.

---

### Geprueft und verworfen (Runde 2)

| Hypothese | Ergebnis |
|---|---|
| Die neuen 1933/1934-Werte folgen nicht aus dem deklarierten Anker | verworfen: eigene Rekonstruktion aller 101 Werte mit 34,06 fuer 1933, Abweichung 0 |
| Der neue Anker hat andere Jahre mitverschoben | verworfen: nur 1933 und 1934 aendern sich; 1925-1932 und 1935-2025 sind wertgleich zum Erstreviewstand |
| Der Vorher-Lauf des Goldbacktests verwendet in Wahrheit die aktuelle Kette | verworfen: Probe F macht beide Laeufe identisch und bringt die Assertion zum Fehlschlagen; die Providerinjektion ist wirksam |
| Die Vorher-Werte 2000-2005 sind nicht der echte Slice-04-Stand | verworfen: exakte Uebereinstimmung mit `git show HEAD:app/simulator/simulator-data.js` |
| Der goldhaltige Fall verdraengt einen bestehenden goldfreien Fall aus der Invarianzpruefung | verworfen: `goldFreeCases.length === before.cases.length` (sieben), der neue Fall wird ueber die Vorherdatei herausgefiltert |
| `FlowDelta` wird im goldhaltigen Lauf auffaellig | verworfen: vorher und nachher exakt 0 |
| Die neue Nullklassifikation laesst eine stille Null durch | verworfen: Proben C, D und E brechen mit drei verschiedenen, zutreffenden Meldungen ab |
| Die Konventionskorrektur blieb im Artefakt stecken | verworfen: Manifest, Inventar und `DATA_SOURCES.md` tragen dieselbe segmentierte Aussage |
| Die Cash-, CPI- oder Aktienkette wurde mitveraendert | verworfen: `cf5471a3...`, `ff67229b...`, `c2b754e4...` unveraendert |
| Der Monte-Carlo-Kandidat wurde promoviert | verworfen: `reviewStatus: pending`, `currentReference` unveraendert |
| Ein Gate schreibt in den Arbeitsbaum | verworfen: fuenf Artefakthashes vor und nach allen Laeufen identisch |

### Reviewseitige Eingriffe und Wiederherstellung

Fuer die Proben C, D, E und F wurden
`scripts/build-gold-german-investor-chain.mjs`,
`app/simulator/gold-german-investor-chain.js` und
`tests/simulator-backtest-characterization.test.mjs` zeitweilig veraendert und
anschliessend byteidentisch wiederhergestellt:

```
3c03df29df4ed0784a59db0f10094050d26cc0117a79a6d88310f6c2c496040b  scripts/build-gold-german-investor-chain.mjs
d4b9ac5184740111311540a33a75b66b9659419ffdc342f80c8a532bae0b528e  app/simulator/gold-german-investor-chain.js
e2515a8083dc08a4f58d1df02bbd0e6cef3e8bd6c7621b21a4c8056be7787631  tests/simulator-backtest-characterization.test.mjs
```

Ausser diesem Slice-Dokument hat das Zweitreview keine Datei des Repositories
veraendert.

## Review-Ergebnis (Claude, Runde 2)

- **Status:** freigegeben
- **Blocker:** keine
- **Findings-Lifecycle:**
  - geschlossen: CR05-1, CR05-2, CR05-3, CR05-4, CR05-6, CR05-7, CR05-11,
    CR05-13
  - teilweise geschlossen, als Modellgrenze dokumentiert: CR05-9, CR05-10
  - unveraendert offen: CR05-5, CR05-8, CR05-12
  - neu: CR05-14, CR05-15, CR05-16
- **Auflagen vor Slice 06:**
  - **CR05-8** - der fehlende unabhaengige Inhaltsoracle betrifft inzwischen
    vier Datenketten und ist das groesste verbliebene strukturelle Loch. Fuer
    die Goldkette sind sechs von 101 Jahren inhaltlich unabhaengig geprueft;
    fuer die uebrigen 95 erkennen die Gates nur Aenderung, nicht Richtigkeit.
  - **CR05-15** - entweder ein goldhaltiger Golden Case im
    Monte-Carlo-Messvertrag oder eine ausdrueckliche Feststellung im Ledger,
    dass die Goldwirkung dort bewusst nicht gemessen wird; ausserdem
    `capturedAtUtc` auf den tatsaechlichen Messzeitpunkt korrigieren.
- **Restrisiken:** CR05-5, CR05-9, CR05-10, CR05-12, CR05-14, CR05-16 sowie
  uebernommen CR04-11, CR04-12, CR02-10, CR02-17, die nicht umgesetzte
  Geldvermoegensabschreibung 1948 und die ungetesteten Nahtjahre der Cashkette.
- **Pre-Mortem:** In drei Monaten faellt ein Fehler im Goldpfad auf, den der
  neue Sentinel nicht gefangen hat. Wahrscheinlichste Ursache: der goldhaltige
  Referenzlauf ist genau ein Szenario - eine Allokation, ein Sechsjahresfenster
  2000-2005, `goldSteuerfrei: true`, kein Gold-Floor, kein Cap-Anschlag. Eine
  Aenderung an Gold-Rebalancing, Gold-Cap, Goldbesteuerung oder an den
  Extremjahren der Reihe wird nur bemerkt, wenn sie genau diesen Pfad trifft;
  die uebrigen sieben Referenzfaelle sind weiterhin goldfrei und die
  Monte-Carlo-Evidenz ebenfalls. Zweitwahrscheinlichste Ursache: das
  unhashierte Ankerliteral 34,06 wird spaeter "korrigiert", fuenf Werte der
  1930er Jahre verschieben sich, und nur die Fingerabdruck-Gates
  widersprechen - ohne dass ein Inhaltsoracle die neue Zahl prueft.
