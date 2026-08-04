# Slice 04 - Cash- und Geldmarktrendite

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Entscheidung:** dauerhafte Nutzerentscheidung vom 2026-07-29 fuer
Slice 02 bis 13; kein neuer Feature-Branch  
**GitHub-Status:** Remote `origin` ist vorhanden; fuer den aktiven Branch ist
kein Upstream konfiguriert  
**Basiscommit:** `3880870`  
**Status:** technisch nachgebessert; erneutes externes Review ausstehend  
**Freigabe:** ausstehend; Codex nimmt keine Selbstfreigabe vor

## Input aus der Freigabe von Slice 03

Claudes Drittreview von Slice 03 ist der verbindliche Uebergabe-Input. Slice 03
ist fuer den technischen Stand freigegeben, nennt aber zwei Auflagen, die vor
der eigentlichen Geldmarktdaten-Aenderung geschlossen werden muessen:

- **CR03-15:** Der erreichbare Widerspruch zwischen dem Balance-Importvertrag
  fuer Inflation (`-15` bis `50`) und dem engeren Balance-Anwendungspfad
  (`-10` bis `50`) wird fail-closed geschlossen. Der Balance-Import nimmt
  keine Inflationsrate an, die derselbe Balance-Workflow anschliessend
  zurueckweist. Der historische Engine-Vertrag bleibt davon unberuehrt.
- **CR03-16:** Das im unveraenderlichen Kandidaten
  `post-backtest-data-03-v1` verbliebene historische Feld
  `currentReference` wird als bewusst ignorierte Altmetadaten dokumentiert.
  Der oeffentliche Policy-Text darf bei `currentReference: null` keine bereits
  freigegebene aktuelle Post-Slice-Referenz behaupten.

Beide Auflagen sind als vorgeschaltetes Gate dieses Slices testbar zu
schliessen. Die unveraenderliche Slice-03-Fixture wird nicht umgeschrieben.

## Preflight vor Coding

**Gemessen am:** 2026-07-29  
**Aktiver Branch:** `codex/suite-datenintegritaet-hardening`  
**HEAD:** `3880870 feat(simulator): implement slice 03 german consumer price index chain`  
**Arbeitsbaum:** sauber (`git status --short` ohne Ausgabe)  
**Unerwartete Dateien:** keine  
**Branchstatus:** kein Upstream konfiguriert; die dokumentierte dauerhafte
Nutzerentscheidung erlaubt die lokale Fortsetzung auf diesem Branch

## Diff-Risiko

Geplante produktive Programm- und Konfigurationsdateien:

- `app/balance/balance-binder-imports.js`
- `app/simulator/german-cash-money-market-chain.js` (generiert)
- `app/simulator/monte-carlo-contracts.js`
- `app/simulator/simulation-data-inventory.js`
- `app/simulator/simulator-data.js`
- `scripts/build-german-cash-money-market-chain.mjs`
- `package.json`

Geplante Tests, Fixtures, Daten und Dokumentation:

- neue Cash-/Geldmarktkette-, Quellenrekonstruktions- und
  Backtestdelta-Tests;
- betroffene Balance-Import-, Manifest-, Inventar-, Backtest-,
  Monte-Carlo- und Integrationsvertraege;
- neuer unveraenderlicher Backtest-Datenkandidat fuer Slice 04, falls die
  bestehende Messpolicy dies nach dem Wertedelta verlangt;
- `data/historical/german-cash-money-market-chain/` mit gepinnter
  Bundesbank-Quelle und reproduzierbarem Tabellenextrakt;
- dieses Slice-Dokument, der Hauptplan und betroffene Referenzdokumente.

Voraussichtliche Aenderungstiefe:

- **hoch** fuer historische Backtest- und Monte-Carlo-Ergebnisse, weil
  `zinssatz_de` die Cash-Ertraege und damit alle Folgejahresbilanzen aendert;
- **mittel** fuer Datenhashes, Charakterisierungsfixtures und
  Snapshot-Kandidaten;
- **klein** fuer CR03-15 und CR03-16: fail-closed Vertragsangleichung und
  Metadatenpraezisierung ohne Engine-Aenderung.

Gefaehrdete bestehende Tests:

- Balance-Import- und UI-Orchestrierungsvertraege;
- historische Manifest-, Inventar- und Charakterisierungstests;
- Backtest-Delta- und Suite-Traceability-Gates;
- Monte-Carlo-Mess- und Exportvertraege;
- Tests mit gepinnten Cash-Zinswerten oder Datenhashes.

Nicht anfassen:

- Engine-, Steuer-, Runway-, Mindest-Flex-, Quantisierungs- und
  Transaktionssemantik;
- `minimumFlexAnnual` und seine Parameternamen;
- `global_equity_research_index`, `inflation_de`, `lohn_de`,
  `gold_eur_perf` und `cape`;
- `engine.js`, `dist/` und `RuheStandSuite.exe`;
- unveraenderliche historische Snapshot-Fixtures.

Rollback-Strategie:

- geaenderte versionierte Dateien gezielt mit
  `git checkout -- <datei...>` auf Basiscommit `3880870` zuruecksetzen;
- neu angelegte Dateien nur nach ausdruecklicher Freigabe entfernen;
- keine Hard-Resets oder sonstigen destruktiven Git-Kommandos.

Die sieben geplanten produktiven Programm-/Konfigurationsdateien bleiben unter
der Stop-Grenze von mehr als zehn Dateien. Der Diff-Risiko-Block loest damit
keine Stop-Regel aus.

## Ziel

`zinssatz_de` wird von einer eingebetteten Reihe mit ungeklaerter
Stichtagskonvention zu einer reproduzierbaren deutschen
Cash-/Geldmarktproxykette fuer 1925 bis 2025. Die Runtime-Zahl ist ein
vor Kosten und Steuern liegender Jahresertragsproxy fuer operative
Liquiditaet, Geldmarkttranchen und den cash-nah fortgeschriebenen
Pflegebucket. Der bestehende Runtimevertrag wendet denselben Wert auch auf
Anleihetranchen an; diese Verwendung wird als gemeinsamer Cash-/Bond-Proxy
mit ausdruecklicher Laufzeit- und Kreditrisikogrenze dokumentiert.

## Vorgesehener Reihenvertrag

| Returnjahre | Quelle / Instrument | Evidenzklasse | Jahreskonvention |
| --- | --- | --- | --- |
| 1925-1944 | JST R6, deutsches `stir` | `proxy` | nominaler deutscher Kurzfristzins des Kalenderjahres |
| 1945-1948 | explizite Kriegs-/Nachkriegs-Ueberbrueckung | `estimated` | letzter verfuegbarer JST-Wert wird nur zur lueckenlosen Simulation fortgeschrieben; kein beobachteter investierbarer Marktreturn |
| 1949-1996 | Deutsche Bundesbank, gemeldetes Tagesgeld am Frankfurter Bankplatz | `proxy` | publizierter Jahresdurchschnitt in Prozent p.a.; Eingangssaetze waren nicht amtlich festgesetzt oder quotiert |
| 1997-1998 | Deutsche Bundesbank, FIBOR O/N | `official` | publizierter Jahresdurchschnitt in Prozent p.a. |
| 1999-2018 | EONIA | `official` | publizierter Jahresdurchschnitt in Prozent p.a. |
| 2019-2025 | EONIA bis 30.09.2019, danach Euro Short-Term Rate (`EURSTR`) | `official` | Bundesbank-Jahresdurchschnitt der von ihr dokumentierten Overnight-Fortsetzung |

Die publizierten Jahresdurchschnittssaetze werden als einfacher
Brutto-Jahresertragsproxy verwendet. Sie sind kein Fonds-NAV-Return und
enthalten weder Produktkosten noch Bankmarge, Depotentgelt oder Steuern.
Insbesondere werden diese Komponenten nicht in die Datenreihe eingerechnet und
spaeter nicht doppelt abgezogen.

## Scope

- gepinnte JST-/Bundesbank-Quellen mit Hashes, Lizenz-/Nutzungsstatus und
  Abrufstand;
- direktes, koordinatenbasiertes Lesen der gepinnten Bundesbank-PDF mit
  exaktem Vergleich gegen den getrennten Layout-Extrakt;
- reproduzierbarer, schreibfrei verifizierbarer Generator;
- generiertes, tief eingefrorenes Datenmodul fuer 101 Jahreswerte;
- Projektion aller `zinssatz_de`-Werte aus dem generierten Modul;
- Manifest-, Inventar- und Runtime-Provenienz mit einheitlichem Wertehash;
- Markerjahre fuer positives, negatives und Uebergangs-Zinsumfeld;
- Vorher-/Nachher-Deltas fuer feste Backtest-Referenzfaelle;
- vorgeschaltete technische Schliessung von CR03-15 und CR03-16;
- Dokumentations-Sync in Hauptplan, Datenquellen, Technik,
  Simulator-Modulreferenz und Testreferenz.

## Nicht im Scope

- Aenderung der Engine-Zinsgutschrift oder ihres Zeitpunkts;
- Besteuerung von Zinsertraegen (Slice 10);
- produktspezifische Geldmarkt-ETF-Kosten, Tracking-Differenzen,
  Bankmargen oder Kontogebuehren;
- historische Steuer- oder Einlagensicherungsregime;
- Zinsgutschrift auf Aktien- oder Goldanlagen;
- Austausch weiterer historischer Reihen;
- Release-Sync von `dist/` oder Bau der EXE.

## Akzeptanzkriterien

1. Die Kette deckt 1925 bis 2025 lueckenlos mit endlichen Prozentwerten ab.
2. Quelle, Instrument, Einheit, Jahreskonvention, Evidenzklasse,
   Waehrungs-/Regimegrenze und Transformation sind maschinenlesbar.
3. Die Bundesbankwerte 1949 bis 2025 stimmen exakt mit dem gepinnten
   Langreihen-Tabellenstand ueberein; die JST-Werte stimmen exakt mit dem
   gepinnten Original ueberein.
4. Die Luecke 1945 bis 1948 ist sichtbar als Schaetzung gekennzeichnet und
   kann nicht als beobachtete oder amtliche Marktrendite gelesen werden.
5. Negative Jahreswerte bleiben vorzeichenrichtig erhalten; es gibt kein
   stilles Begrenzen auf null.
6. Die Runtime wendet den Jahreswert genau einmal auf die im bestehenden
   Modell cash-nah gefuehrten Bestaende an. Kosten, Abschlaege und Steuern
   werden durch diesen Slice weder eingebaut noch doppelt angewandt.
7. Markerjahre fuer Hochzins, Negativzins und EURSTR-Uebergang lassen sich
   von Quellenwert ueber Zinsgutschrift bis `portfolio_flow_delta`
   nachrechnen.
8. Wertveraendernde Referenzlaeufe besitzen erklaerte Vorher-/Nachher-Deltas;
   Outcomes bleiben erklaert und `FlowDelta` bleibt unauffaellig.
9. CR03-15 ist durch einen getesteten, konsistenten Balance-Import- und
   Anwendungspfad geschlossen; der historische Engine-Inflationsvertrag
   bleibt unveraendert.
10. CR03-16 ist ohne Umschreiben der unveraenderlichen Slice-03-Fixture
    geschlossen; der aktuelle Policy-Vertrag behauptet keine freigegebene
    Referenz, solange `currentReference` `null` ist.
11. Manifest, Inventar und Runtime tragen denselben generierten
    Geldmarktwertehash.
12. `npm test` ist vollstaendig gruen; Codex erteilt keine Selbstfreigabe.

## Stop-Regeln

Der Slice stoppt vor weiterer Umsetzung, wenn:

- Bundesbank-Tabelle oder gepinnter Rohdatenhash nicht reproduzierbar sind;
- ein Jahreswert nicht eindeutig einem Segment zugeordnet werden kann;
- eine Luecke ausserhalb der expliziten 1945-1948-Schaetzung entsteht;
- mehr als zehn produktive Programm-/Konfigurationsdateien geaendert werden
  muessen;
- Engine-Semantik geaendert werden muesste;
- Referenz-Outcomes unerwartet wechseln, `FlowDelta` auffaellig wird oder
  die Tests nicht sinnvoll ausfuehrbar sind;
- UI und Engine unterschiedliche Parameternamen verwenden;
- `minimumFlexAnnual` irgendwo still begrenzt statt validiert wird.

## Geplante Tests

- Generator-Build und schreibfreies Verify-Gate;
- unabhaengige Vollrekonstruktion aus JST-Original und
  Bundesbank-Tabellenextrakt;
- 101-Jahres-Abdeckung, Segmentgrenzen, Freeze und Wertehash;
- Markerjahre mindestens 1944/1945, 1948/1949, 1998/1999, 2019, 2020,
  2022, 2024 und 2025;
- Balance-Importgrenzen fuer CR03-15;
- Snapshot-Policy-/Messvertrag fuer CR03-16;
- isolierte und vollstaendige Backtestdeltas;
- Manifest-, Inventar-, Charakterisierungs- und Suite-Traceability-Gates;
- abschliessend `npm test`.

## Ergebnisse

- CR03-15 ist fail-closed geschlossen: Balance-Import und anschliessender
  Balance-Anwendungspfad akzeptieren beide nur `-10` bis `50` Prozent.
  `-10,1` wird beim Import mit `invalid_input_bounds` abgewiesen; der
  historische Engine-/Backtestvertrag wurde nicht veraendert.
- CR03-16 ist ohne Aenderung von `post-backtest-data-03-v1` geschlossen:
  `currentReference` bleibt im oeffentlichen Vertrag `null`, die Policy nennt
  ausschliesslich versionierte Pending-Kandidaten. Historische
  Vergleichsausnahmen stehen nur in `snapshot-policy-v1.json`; der
  produktive Vertrag enthaelt keine Fixture-Pfade.
- Die gepinnte Bundesbank-PDF hat SHA-256
  `cec782c8a1110a5377fe81f463d6b3b6b4a22e9fde91df98693d76ede56343c1`;
  der mechanische Seiten-15/16-Extrakt hat
  `85e3b0f6678944a555bb6848b2eefe5601475124bae497e6e63faf47b759c383`.
  Der Generator liest die PDF selbst mit Poppler `pdftohtml` 25.07.0 und
  verlangt fuer alle 77 Jahre exakte Uebereinstimmung mit dem Extrakt. Das
  wiederverwendete JST-R6-Original bleibt auf
  `c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d`
  gepinnt.
- Generator und unabhaengiger Testreader rekonstruieren alle 101 Werte
  1925-2025. Der Testreader liest die PDF mit einer getrennten
  Koordinatenauswahl statt den Layout-Extrakt als Oracle zu verwenden.
  Ausser der deklarierten 1945-1948-Bruecke existiert keine Luecke. Der
  generierte Wertehash lautet
  `cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69`;
  der nur Primaerquellen umfassende Rohdatenhash lautet
  `ea1608b5dee7e00ae7bf24bb651cb01cd3f0d5423b54cdf21b9f975cced30722`,
  der getrennte Hash des abgeleiteten Layout-Extrakts
  `eae9ce9d4a172ecce6264fde18a618f810b4f11af2adb4bd53d1670fca44a97a`
  und der Hash der PDF-Koordinatenreihe
  `f4677d78bd54dd046b151d1c96851e69b29111dfceaf92756127f2cb3fbfc47f`.
- `HISTORICAL_DATA_MANIFEST` und `SimulationDataInventoryV1` stehen auf
  Revision `2026-07-29.5`. Der neue kanonische Dataset-Hash ist
  `6a1ff0c9245d66d5aec69d85e216daf8c0c005804f70868f681452b47353e543`.
  Alle 101 `zinssatz_de`-Werte werden ausschliesslich aus dem generierten
  Modul projiziert.
- Negative Werte bleiben erhalten, unter anderem `-0,39` Prozent 2019 und
  `-0,57` Prozent 2021. Die Returnmetadaten schliessen zusaetzliche
  Aufzinsung, Produktkosten, Bankmarge und Steuer aus. Der Proxy ist nicht
  als erreichbarer Endkundenreturn deklariert.
- `cashBondReturn` wird wahrheitsgemaess fuer operative Liquiditaet,
  Geldmarkt, Pflegebucket und Anleihetranchen ausgewiesen. Fuer Anleihen
  fehlen Duration, Laufzeitpraemie, Kreditrisiko und Mark-to-Market.
- Die Meldergruppen- und Zinstagebrueche 1970/1990, der FIBOR- und
  EURSTR-Uebergang, die Fritz-Knapp-/Bundesbank-Quellenkette sowie der
  geforderte EZB-EURSTR-Administratorhinweis sind maschinenlesbar.
- Die nominale Geldvermoegensabschreibung der Waehrungsreform 1948 wird in
  der Runtime weiterhin nicht angewandt. Diese Grenze ist nun explizit; der
  Carry-forward-Zins behauptet keine Kontinuitaet realer Guthaben.
- Die sieben Backtest-Referenzfaelle behalten ihre Eingabeidentitaet und
  Outcome-Klasse. Die Endvermoegensdeltas reichen von `-4.382,51` EUR bis
  `+1.014.077,20` EUR; Entnahmen bleiben in allen Referenzen unveraendert.
  Steuerdeltas treten nur als nachgelagerte Portfolioeffekte auf. Der maximale
  absolute `portfolio_flow_delta` ist vor und nach der Aenderung in allen
  sieben Faellen `0`.
- Der separate Monte-Carlo-Kandidat `post-backtest-data-04-v1` referenziert
  unveraenderlich `post-backtest-data-03-v1`, bleibt `pending` und deckt alle
  sechs Golden-Case-Familien ab. `annualDataHash` wechselt von `e2de8c5d`
  auf `60918da2`; `regimeHash` bleibt `7d37583a`.
- `npm run verify:german-cash-money-market-data` ist gruen.
- `npm test` ist mit 147 Testdateien und 14.270 von 14.270 Assertions gruen;
  es gibt keine fehlgeschlagenen Dateien und keine offenen Handles.

## Abweichungen vom Plan

- Der geplante produktive Scope blieb exakt bei sieben Programm-/
  Konfigurationsdateien und damit innerhalb der Stop-Grenze.
- Fuer die bestehende Suite-Daten-Traceability mussten zusaetzlich deren
  Testvertrag und Fixture-Fingerprints auf die neue
  `backtest_data_04`-Evidenzklasse nachgezogen werden. Dies sind Test-/
  Fixture-Dateien, keine zusaetzlichen produktiven Programmdateien.
- Die historische aktive Backtest-Zielfixture aus Slice 03 wurde als
  `post-backtest-data-03-target-v1.json` eingefroren, damit der
  Slice-03-CPI-Deltabeleg unveraendert pruefbar bleibt, waehrend das aktive
  Ziel den Slice-04-Stand abbildet.

## Offene Risiken

- Der JST-Kurzfristzins ist vor 1949 kein durchgehend identischer,
  direkt investierbarer Geldmarktindex.
- Die Jahre 1945 bis 1948 besitzen keinen beobachteten deutschen
  Geldmarktwert und bleiben eine explizite Modellueberbrueckung.
- Ein publizierter Jahresdurchschnitt eines annualisierten Overnight-Satzes
  ist ein Brutto-Ertragsproxy, kein exakter Fonds- oder Tagesgeldreturn.
- Der bestehende Engine-Zeitpunkt der Zinsgutschrift bleibt unveraendert und
  ist eine Modellkonvention, keine taegliche Zinsakkumulation.
- Historische Laeufe ueber 1948 modellieren die nominale Abschreibung grosser
  Reichsmark-Bar- und Bank-/Sparguthaben nicht.
- Anleihetranchen erhalten weiterhin den Overnight-Proxy und damit keinen
  historischen Bondindex mit Laufzeit-, Kredit- und Mark-to-Market-Risiken.

## Rueckdokumentation

Eingetragen in:

- `docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md`;
- `docs/reference/DATA_SOURCES.md`;
- `docs/reference/TECHNICAL.md`;
- `docs/reference/SIMULATOR_MODULES_README.md`;
- `tests/README.md`;
- `README.md`.

## Freigabestatus

Codex hat die Findings CR04-1 bis CR04-9 technisch nachgebessert. Der Slice
bleibt bis zum erneuten Review durch Gemini, Claude oder den Nutzer
`not_validated`/`pending`; Codex erteilt keine eigene Freigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| CR03-15 | Claude Slice-03-Drittreview | Balance-Import akzeptiert Werte, die der Anwendungspfad zurueckweist | angenommen | Importgrenze auf `-10` bis `50` vereinheitlicht; `-10,1` fail-closed getestet |
| CR03-16 | Claude Slice-03-Drittreview | Historischer Snapshot traegt ignorierten Zeiger, Policy-Text passt nicht zum leeren aktuellen Zeiger | angenommen | Immutable Fixture unveraendert; ignored field, Pending-Policy und externe Promotion-Regel explizit getestet |
| CR04-1 | Claude-Review | Die einzige Primaerquelle der 77 amtlichen Werte wird von keinem Codepfad gelesen; Generator und Rekonstruktionstest teilen Selektorlogik und abgeleitetes Substrat | angenommen | Generator und getrennter Testreader lesen die PDF koordinatenbasiert; 77 exakte Vergleiche gegen unabhaengige Selektion |
| CR04-2 | Claude-Review | `rC` wird auf Anleihetranchen angewendet, obwohl `applicability` nur Cash-nahe Bestaende nennt | angenommen | bestehende gemeinsame `cashBondReturn`-Anwendung und fehlende Bond-Risikodimensionen explizit deklariert und getestet |
| CR04-3 | Claude-Review | Drei in der gepinnten Quelle woertlich genannte Methodenbrueche, nur einer im Artefakt deklariert | angenommen | Meldergruppe 1970, Zinstage 1990, FIBOR 1997 und EURSTR 2019 dokumentiert |
| CR04-4 | Claude-Review | Evidenzklasse `official` widerspricht der Fussnote "Not officially set or quoted" derselben Tabelle; Quellenkette bis 1975 unvollstaendig | angenommen | 1949-1996 auf `proxy` gesetzt; Quotierungsstatus und Fritz-Knapp-/Bundesbank-Kette erfasst |
| CR04-5 | Claude-Review | Cash-Kette widerspricht der in Slice 03 erzwungenen `monetaryAssetDiscontinuity` fuer 1948 | angenommen | fehlende Runtime-Abschreibung und 100-RM-zu-6,5-DM-Grenze explizit; keine Kontinuitaetsbehauptung |
| CR04-6 | Claude-Review | `sourceExtraction.visualVerification` ist eine unpruefbare Behauptung in einem maschinenlesbaren Evidenzfeld | angenommen | Behauptung entfernt und durch reproduzierbare Werkzeug-, Versions-, Koordinaten- und Exaktheitsmetadaten ersetzt |
| CR04-7 | Claude-Review | AK 7 nur fuer 2000/2001 belegt; Negativzins- und EURSTR-Markerjahre nicht bis zur Zinsgutschrift nachgerechnet | angenommen | 2000, 2019 und 2020 von generierter Rate bis Zinsgutschrift und `FlowDelta` nachgerechnet |
| CR04-8 | Claude-Review | Der von der Quelle ausdruecklich verlangte EZB-Disclaimer fuer `EURSTR` ist nicht referenziert | angenommen | exakte EZB-Administrator-URL in Artefakt, Lizenz und Referenzdoku aufgenommen |
| CR04-9 | Claude-Review | `rawDataHash` umfasst ein selbst erzeugtes Zwischenprodukt; Testfixture-Pfad steht im produktiven Runtime-Vertrag | angenommen | Primaer- und Derived-Hashes getrennt; historische Ignore-Pfade ausschliesslich in der Messfixture |

## Review-Feedback von Claude

**Reviewstand:** 2026-07-30, Arbeitsbaum auf Basiscommit `3880870` mit den
unversionierten Slice-04-Aenderungen. Reviewerstatus: `blockiert`. Header,
`**Status:**` und `**Freigabe:**` bleiben unveraendert; sie sind Nutzer- und
Codex-Territorium.

Die Angabe, Gemini habe ohne Findings reviewt, lag mir nicht aus erster Hand
vor und ist in diese Bewertung nicht eingegangen. Aussagen aus Dokumenten
dieses Repositoriums wurden als Behauptung behandelt und nachgemessen.

### Verifikationsbasis

Nachgefahren und unabhaengig gemessen:

- `npm test`: 14.236 von 14.236 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles - deckungsgleich mit der Codex-Angabe;
- `verify:german-cash-money-market-data`, `verify:german-cpi-data`,
  `verify:global-equity-data`, `docs:evidence`: alle gruen und schreibfrei;
  die Slice-02- und Slice-03-Artefakte bleiben nach allen Gates byteidentisch
  (`c2b754e4...`, `ff67229b...`);
- `git diff --check`: sauber;
- **Vollrekonstruktion aller 101 Werte aus den gepinnten Originalen mit
  eigenen Lesern.** Die 77 Bundesbankwerte 1949-2025 wurden ueber einen
  zweiten, koordinatenbasierten Extraktionspfad desselben PDF
  (`pdftohtml -xml`, Spaltenzuordnung ueber den rechten Spaltenrand,
  Jahreszuordnung ueber die Dokumentordnung) nachgebildet: 77 von 77
  uebereinstimmend, Abweichung 0. Die 20 JST-Werte 1925-1944 wurden mit einem
  eigenen XLSX-Reader gelesen: 20 von 20 uebereinstimmend. Die vier
  Brueckenjahre entsprechen dem 1944-Wert `2.13`. Alle Werte sind korrekt;
- Reproduktion des gepinnten Textextrakts: mit Poppler `pdftotext` 25.07.0
  byteidentisch (`85e3b0f6...`);
- vier Mutationsproben gegen die Slice-04-Gates plus eine Kernprobe gegen das
  gemeinsame Substrat, jeweils mit anschliessend nachgewiesener
  Byteidentitaet der angefassten Dateien;
- Verfolgung des Anwendungspfads von `zinssatz_de` bis zur Zinsgutschrift
  ueber `historical-backtest-contract.js`, `historical-backtest-runner.js`,
  `simulator-portfolio-historical.js`, `simulator-year-portfolio.js`,
  `simulator-engine-direct.js` und `simulator-health-bucket.js`.

### Erfuellte Vorgaben aus dem Slice-03-Drittreview

Beide Auflagen sind geschlossen und wurden einzeln nachgeprueft.

**CR03-15** ist fail-closed in der von mir verlangten Richtung geschlossen:
`balance-binder-imports.js:66` steht auf `min: -10, max: 50` und stimmt damit
mit `INFLATION_RATE_MIN = -10` / `INFLATION_RATE_MAX = 50` in
`balance-annual-inflation.js` ueberein. Der historische Engine-Vertrag in
`engine/validators/InputValidator.mjs` bleibt bei `-15, 50`; unter `engine/`
gibt es keinen Diff. Das Balance-Eingabefeld selbst traegt kein `min`/`max`,
sodass eine Nutzereingabe unterhalb `-10` weiterhin am Anwendungspfad
abgewiesen wird statt still zu wirken.

**CR03-16** ist ohne Umschreiben der unveraenderlichen Slice-03-Fixture
geschlossen. `policy` lautet jetzt
`immutable-baseline-with-versioned-pending-candidates`, `promotionRule`
verlangt externe Freigabe vor jeder Zeigerbesetzung, und
`ignoredHistoricalFixtureFields` benennt das bewusst ignorierte Altfeld. Der
in diesem Slice neu erzeugte Kandidat `post-backtest-data-04-v1` traegt das
Altfeld gar nicht mehr - die in Runde 3 eingezogene Projektionssperre wirkt
also nicht nur formal.

### 1. Korrektheit

Die Werte sind richtig. Die Segmentzuordnung ist quellengestuetzt: Fussnote 2
der Seite 15 belegt die Grenze 1996/1997 woertlich ("Up to December 1996 ...
For 1997 and 1998, the rates are annual averages of the daily FIBOR rates for
overnight money"), Fussnote 2 der Seite 16 belegt den Uebergang
EONIA/`EURSTR` zum 2019-10-01.

Nicht geprueft ist die Selektion selbst. Der Generator liest nicht die
gepinnte PDF, sondern eine daraus abgeleitete Textdatei, und der als
unabhaengig bezeichnete Rekonstruktionstest liest dieselbe Datei mit
demselben Selektor. Der Regex in
`scripts/build-german-cash-money-market-chain.mjs:292` und der Regex in
`tests/german-cash-money-market-source-reconstruction.test.mjs:106` sind
zeichenweise identisch:

```js
/^\s*(\d{4})\s+(-\s*)?(\d+\.\d+)(?:\s|$)/
```

Fuer 77 der 101 Werte - 76 Prozent der Reihe - gibt es damit keine zweite
Beobachtung, sondern eine Kopie derselben Transformation auf demselben
Substrat. Das ist strukturell derselbe Befund, der Slice 03 in Runde 1 als
CR03-1 blockiert hat, in neuer Form: dort wurde derselbe Generator erneut
ausgefuehrt, hier wird dieselbe Selektorlogik auf demselben abgeleiteten
Zwischenartefakt wiederholt.

**Mutationsbeweis (CR04-1).** Szenario: der Fehler sitzt im Textextrakt
selbst, so wie er bei einer Erstextraktion oder einem kuenftigen
Quellenupdate entstehen wuerde. Ein Wert wurde im Extrakt geaendert
(1970: `8.65` -> `3.65`) und der gepinnte Extrakthash im Generator
mitgezogen - genau der Arbeitsgang, den eine Neu-Extraktion ausloest:

| Gate | Reaktion |
| --- | --- |
| `build:german-cash-money-market-data` | rc=0, Artefakt enthaelt `"1970": 3.65` |
| `--verify-only` | rc=0, meldet die Kette als verifiziert |
| `german-cash-money-market-source-reconstruction.test.mjs` | **UNBEMERKT** |
| `german-cash-money-market-chain.test.mjs` | FAIL - `Inventory raw-data hash should match` |
| `simulation-data-inventory.test.mjs` | FAIL - `Inventory hash mismatch for zinssatz_de` |
| `historical-data-manifest.test.mjs` | FAIL - `Manifest hash should match canonical data` |
| `german-cash-money-market-backtest-delta.test.mjs` | FAIL - `Delta fixture should pin the active interest chain` |

Alle vier reagierenden Gates sind handgepflegte Fingerprint-Vergleiche. Sie
erkennen eine nachtraegliche Aenderung an einem bereits festgeschriebenen
Stand, aber keinen Fehler, der beim erstmaligen Festschreiben entsteht oder
bei einem Quellenupdate gemeinsam mit allen Fingerprints neu erzeugt wird.
Keines von ihnen liest die PDF. Der Rekonstruktionstest, der genau diese
Luecke schliessen soll, bleibt blind.

Die uebrigen vier Proben wurden erkannt und belegen, dass die Gates gegen
Generatorfehler wirksam sind:

| Probe | Ergebnis |
| --- | --- |
| Spaltenverwechslung Overnight -> One-month | Artefakt `"1949": 4.48`; beide Slice-Tests ERKANNT (`1949 should start the official Bundesbank segment`, `1949 should equal the independent source oracle`) |
| Jahresversatz `+1` im Bundesbank-Parser | Build rc=1, `Unexpected Bundesbank overnight coverage` |
| Kriegsbruecke auf `0` statt 1944-Wert | beide Slice-Tests ERKANNT (`1945 should use the explicit 1944 carry-forward`) |
| Negative Werte auf `0` geklemmt | beide Slice-Tests ERKANNT (`2019 should retain the benchmark transition average`, `2015 should equal the independent source oracle`) |

Die Trennlinie ist damit exakt vermessen: Fehler **im Generator** werden
erkannt, weil der Oracle das Substrat unabhaengig liest. Fehler **im
Substrat** werden nicht erkannt, weil beide Seiten dasselbe lesen.

### 2. Vertragstreue

`applicability` im generierten Artefakt lautet:

```json
"operativeCash": true, "moneyMarketTranches": true,
"cashLikeHealthBucket": true, "riskAssets": false
```

Der tatsaechliche Anwendungspfad ist breiter.
`app/simulator/simulator-year-portfolio.js:33` verzweigt

```js
const isBond = isBondCategory(tranche.type) || isBondCategory(tranche.category);
const trancheReturn = isBond ? rC : rA;
```

und `engine/transactions/three-bucket-logic.mjs:21` definiert
`isBondCategory` als `'anleihe' || 'bonds' || includes('bond')`. Der
Geldmarktsatz wird also auf **Anleihetranchen** angewendet, die laut
`types/tranche-contract.js:16` eine eigene Kategorie neben
`money_market: ['geldmarkt']` bilden. Das Zielfeld heisst im
Backtest-Vertrag folgerichtig `cashBondReturn`
(`historical-backtest-contract.js:477`). Das Artefakt nennt Anleihen an
keiner Stelle - weder unter `applicability` noch unter `riskAssets`.

Damit beschreibt der maschinenlesbare Anwendbarkeitsvertrag die Runtime
falsch, und die inhaltliche Verengung wirkt: eine Overnight-Rendite ist die
falsche Fristigkeit fuer einen Anleihebucket. Messung an der neuen gegen die
alte Reihe fuer einen Bestand von 100.000 EUR ueber 2015-2022 - die Jahre,
in denen die Vorreihe im Mittel bei `0,038` Prozent lag und die neue bei
`-0,334` Prozent:

- vorher `100.290,15` EUR, nachher `97.359,70` EUR, Differenz `-2.930,45` EUR.

Die Vorreihe war in der Negativzinsphase nicht negativ; die Vorzeichentreue
der neuen Reihe ist eine Verbesserung fuer Cash und gleichzeitig eine
Verschlechterung fuer den Anleihebucket, der dieselbe Zahl erhaelt.

### 3. Fehlerbehandlung

Fail-closed arbeitet sauber: Quellenhash-Mismatch, Duplikatjahr,
Luecke ausserhalb 1945-1948, nichtendliche Werte und die
Coverage-Erwartungen brechen den Build. Der Jahresversatz wird vom
Coverage-Check gefangen (Probe 2). Der Schutz greift allerdings nur, solange
ein Versatz Luecken hinterlaesst - er ist eine Vollstaendigkeitspruefung,
keine Wertpruefung. Ich habe das an einem realen Fall gemessen: derselbe
Regex auf einem Extrakt, der mit der im `PATH` liegenden Xpdf-Implementierung
4.06 statt mit Poppler erzeugt wurde, liefert 48 falsche und 29 fehlende
Werte. Die 29 Luecken loesen den Coverage-Fail aus; waere die Verschiebung
lueckenlos, blieben 48 verschobene Werte unbemerkt.

`sourceExtraction.command` nennt `pdftotext -layout -f 15 -l 16` ohne
Implementierung und Version. Das Kommando ist nicht toolinvariant: Poppler
25.07.0 reproduziert den gepinnten Extrakt byteidentisch, Xpdf 4.06 erzeugt
einen strukturell anderen Extrakt mit versetzten Jahr-Wert-Paaren. Der
Hashpin faengt eine Neu-Extraktion mit falschem Werkzeug - aber nur, solange
niemand den Pin mitzieht.

### 4. Seiteneffekte

Der produktive Scope bleibt bei sieben Programm- und Konfigurationsdateien.
`engine/` ist unberuehrt. Die Slice-02- und Slice-03-Artefakte bleiben
byteidentisch. Die Backtest-Deltas sind vollstaendig belegt und relativ
klein:

| Fall | Endvermoegen vorher -> nachher | Delta | relativ | Outcome | FlowDelta |
| --- | --- | --- | --- | --- | --- |
| `completed_2000_2005` | 1.692.425,95 -> 1.693.115,83 | +689,88 | +0,04 % | unveraendert | 0 |
| `completed_1960_2020` | 179.135.437,66 -> 180.149.514,86 | +1.014.077,20 | +0,57 % | unveraendert | 0 |
| `completed_numeraire_seam_1949_1952` | 5.145.999,78 -> 5.146.008,66 | +8,88 | +0,00 % | unveraendert | 0 |
| `three_bucket_minimum_flex_2005_2014` | 385.842,24 -> 383.033,24 | -2.809,00 | -0,73 % | unveraendert | 0 |
| `capital_poor_ruin_2000_2005` | 26.802,80 -> 26.793,05 | -9,75 | -0,04 % | `ruin` unveraendert | 0 |
| `health_bucket_nested_row_summary_positive` | 2.272.042,20 -> 2.271.595,28 | -446,92 | -0,02 % | unveraendert | 0 |
| `dynamic_flex_cape_2010_2013` | 2.412.711,90 -> 2.408.329,39 | -4.382,51 | -0,18 % | unveraendert | 0 |

Der grosse Absolutbetrag von `+1.014.077,20` EUR ist +0,57 Prozent auf einen
Lauf ueber 61 Jahre. Entnahmen bleiben in allen sieben Faellen unveraendert,
Steuerdeltas treten nur als nachgelagerte Portfolioeffekte auf, und der
maximale absolute `portfolio_flow_delta` bleibt vorher und nachher `0`.

Die Umstellung der Traceability-Baseline von `backtest_data_03` auf
`backtest_data_04` habe ich gezielt geprueft, weil sie einen fremden
Deltabeleg beruehrt. Ergebnis: unbedenklich. In
`german-cpi-chain-backtest-delta-v1.json` wandert ausschliesslich der
Dateizeiger von `simulator-backtest-target-v1.json` auf
`post-backtest-data-03-target-v1.json`; der gepinnte `sha256`
`c73f82d60efde37652229439c7cb783f91c1abd1d4b2b319a18346a3d77709fb` bleibt
unveraendert, und die eingefrorene Kopie ist byteidentisch mit dem
HEAD-Stand. Der Slice-03-Beleg bleibt inhaltlich intakt.

Ein Seiteneffekt ausserhalb des Codes: `ignoredHistoricalFixtureFields`
steht jetzt im produktiven `MONTE_CARLO_SNAPSHOT_POLICY` und benennt einen
Testfixture-Pfad (`result.contracts.snapshotPolicy.currentReference`). Der
Vertrag wird in Snapshots geschrieben und beschreibt damit eine
Testkonvention ueber sich selbst.

### 5. Was koennte brechen?

**Der Widerspruch zum Schwestermodul (CR04-5).** In Runde 3 des Slice-03-
Reviews wurde auf meine Auflage `proxyQualification.monetaryAssetDiscontinuity`
in `german-cpi-chain.js` aufgenommen: Umstellung 100 RM auf 6,50 DM,
93,5 Prozent nominaler Verlust auf Bar- und Bankguthaben, mit dem
ausdruecklichen Satz, die Reihe duerfe nicht als kontinuierlicher Deflator
fuer Reichsmark-Bargeld oder Bankguthaben ueber die Reform verwendet werden.

Slice 04 liefert die Reihe, die auf genau diese Bestaende angewendet wird,
und schreibt fuer 1948 `+2,13` Prozent fort. `currencyRegimes` fasst
1925-1948 zu einem Block zusammen mit der Aussage "rates are percentages and
no currency conversion is performed". Ein Lauf ueber 1948 laesst
Cash-Bestaende nominal durchwachsen, waehrend das Schwestermodul die
93,5-prozentige Abschreibung derselben Bestaende dokumentiert. In
`docs/reference/DATA_SOURCES.md` stehen beide Aussagen jetzt in benachbarten
Tabellenzeilen: `inflation_de` verweist auf "the separate 100:6.5 nominal
monetary-balance write-down across the 1948 reform", `zinssatz_de` auf
"percentage values require no conversion". Diese Jahre sind erreichbar:
`excludeEstimatedHistory` ist standardmaessig `false`, und
`HISTORICAL_PERIOD` beginnt 1925.

**Undeklarierte Methodenbrueche (CR04-3).** Die gepinnte Quelle nennt auf
Seite 15 in Fussnote 1 woertlich zwei weitere Brueche in der genutzten
Spalte: "From March 1970, the series are based on a new, broader survey
group" und "Up until June 1990, the rates are calculated using the German
360/360 days method. From July 1990, the rates are calculated using the
actual/360 method". Das Artefakt deklariert nur den FIBOR-Uebergang
1996/1997. Der Wechsel der Tageszaehlung ist fuer eine als Ertragsproxy
verwendete Reihe unmittelbar relevant - 365/360 sind rund 1,4 Prozent
relativ, bei einem 8-Prozent-Jahr also gut 0,11 Prozentpunkte - und die
Zeile 1990 mischt beide Methoden. Slice 03 fuehrt fuer denselben
Sachverhalt `historicalDiscontinuities`; das Slice-04-Artefakt hat weder
`historicalDiscontinuities` noch `proxyQualification`.

**Ueberklassifizierte Evidenz (CR04-4).** Fussnote 1 derselben Tabelle sagt
ueber die genutzten Werte: "Not officially set or quoted. The rates shown
here are unweighted monthly averages based on data reported by Frankfurt
banks." Das Artefakt klassifiziert 1949-1996 als `official`, ohne
Qualifier. Slice 03 hat fuer eine amtliche Reihe mit eingeschraenkter
Grundgesamtheit den `populationQualifier: 'proxy_population'` eingefuehrt;
das Gegenstueck fehlt hier. Ergaenzend nennt dieselbe Fussnote als
Primaerquelle bis 1975 nicht die Bundesbank, sondern "Deutsches Geld- und
Bankwesen in Zahlen 1876 - 1975 (1976), Verlag Fritz Knapp GmbH ... and
Bundesbank calculations"; die Quellenkette im Artefakt endet bei der
Bundesbank.

**Nicht nachrechenbare Markerjahre (CR04-7).** Akzeptanzkriterium 7 verlangt
Markerjahre fuer Hochzins, Negativzins und `EURSTR`-Uebergang von der Quelle
bis `portfolio_flow_delta`. Belegt sind ausschliesslich 2000 und 2001, weil
`alignmentOracle` der Zielfixture nur diese beiden Jahre fuehrt. Gerade der
Negativzins ist die einzige neue Verhaltensklasse dieses Slices: die
Vorreihe war 2015-2022 nie negativ. Die Mechanik eines negativen `rC` ist
separat abgedeckt (`health-bucket.test.mjs:177` und
`simulation.test.mjs:437`, jeweils `rC: -0.005`), aber nicht mit den
Slice-04-Werten verkettet.

**Lizenzweitergabe (CR04-8).** Die gepinnte Quelle verlangt auf Seite 16
ausdruecklich die Weitergabe des EZB-Administrator-Disclaimers fuer
`EURSTR` mit URL und stellt fest, dass dieser auch fuer
Bundesbank-Publikationen gilt. `LICENSE.md` nennt pauschal "Bundesbank and
ECB disclaimers ... remain applicable", ohne die verlangte Referenz -
obwohl 2020-2025 `EURSTR`-Werte genutzt werden.

### Konstruktiver Schliessungsweg fuer CR04-1

Der fehlende zweite Quellpfad ist mit vorhandenen Mitteln baubar. Drei
Optionen, alle von mir gemessen:

1. **Reproduktionsgate.** Poppler `pdftotext` 25.07.0 erzeugt den gepinnten
   Extrakt byteidentisch. Ein Gate, das die Extraktion ausfuehrt und gegen
   `85e3b0f6...` vergleicht, schliesst die Luecke - erfordert aber
   Implementierung und Version im gepinnten Vertrag, weil Xpdf 4.06 unter
   demselben Kommandonamen einen anderen Extrakt liefert.
2. **Zweiter Extraktionspfad desselben PDF.** `pdftohtml -xml` liefert
   Textknoten mit Koordinaten. Eine Zuordnung ueber den rechten
   Spaltenrand und die Dokumentordnung reproduziert alle 77 Werte
   (77 von 77, Abweichung 0) und ist von der `-layout`-Zeilenheuristik
   unabhaengig.
3. **Kreuzcheck gegen eine bereits gepinnte Zweitquelle.** JST `DEU.stir`
   liegt im Repository, ist gehasht und wird vom Generator ohnehin gelesen.
   Es ueberlappt das Bundesbank-Segment in 71 Jahren (1950-2020):
   67 von 71 Jahren innerhalb 0,05 Prozentpunkten, Maximum 0,094
   Prozentpunkte im Jahr 2009. Eine Toleranz von 0,10 Prozentpunkten waere
   trennscharf gegen Spaltenverwechslung (1949: 1,24 Prozentpunkte
   Abstand) und Jahresversatz (1949 auf 1950: 1,07 Prozentpunkte), aber
   nicht gegen Fehler an der letzten Dezimalstelle.

Option 2 oder 3 loest den Blocker; Option 1 allein haertet nur die
Reproduzierbarkeit, nicht die Selektion.

### Verworfene Hypothesen

Acht Verdachtsmomente wurden geprueft und widerlegt; sie sind keine
Findings:

1. **Extrakt nicht reproduzierbar** - mit Poppler 25.07.0 byteidentisch.
2. **Werte falsch** - alle 101 unabhaengig bestaetigt, Abweichung 0.
3. **Geldmarkttranchen erhalten den Aktienreturn** - nein.
   `simulator-portfolio-init.js:270` fuehrt `money_market` in
   `depotTranchesGeldmarkt` und aggregiert sie in die Liquiditaet, die mit
   `rC` verzinst wird.
4. **Doppelverzinsung von Liquiditaet und Pflegebucket** - nein.
   `simulator-portfolio-init.js:171` zieht den Bucketbetrag aus der
   Liquiditaet heraus (`liquiditaet = max(0, initialLiquiditaet - used)`),
   bevor `applyHealthBucketInterest` ihn separat verzinst.
5. **Slice-03-Deltabeleg umgeschrieben** - nein, nur der Dateizeiger;
   `sha256` unveraendert und die eingefrorene Kopie byteidentisch zum
   HEAD-Stand.
6. **Die verschaerfte Balance-Importgrenze bricht einen erreichbaren Pfad** -
   nein, das Eingabefeld traegt kein `min`/`max`, und ein nie akzeptierter
   Wert darf beim Import abgewiesen werden.
7. **Jahresversatz im Parser bleibt unbemerkt** - nein, der Coverage-Check
   bricht mit rc=1 ab.
8. **Das JST-Segment ist so inhomogen wie behauptet** - unbelegt und
   vermutlich zu vorsichtig. In den Ueberlappungsjahren 1950-1955 weicht
   JST `DEU.stir` von der Bundesbank-Tagesgeldreihe maximal 0,03
   Prozentpunkte ab (4,31/6,02/5,11/3,58/2,89/3,13 gegen
   4,31/6,01/5,11/3,57/2,89/3,16), was dafuer spricht, dass es dieselbe
   Groesse ist. Die konservative Klassifikation `proxy` bleibt zulaessig,
   die Begruendung im `note` ist nicht belegt.

## Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:**
  - **CR04-1** - Die gepinnte Bundesbank-PDF ist die einzige Primaerquelle
    fuer 77 der 101 Werte und wird von keinem Codepfad gelesen; sie wird nur
    gehasht. Generator und Rekonstruktionstest teilen zeichenidentischen
    Selektor und dasselbe abgeleitete Substrat. Mutationsbeweis: ein Fehler
    im Extrakt bleibt im Rekonstruktionstest unbemerkt und passiert
    `--verify-only` gruen; die vier reagierenden Gates sind ausschliesslich
    handgepflegte Fingerprints, die bei einer Erstextraktion oder einem
    Quellenupdate gemeinsam neu erzeugt wuerden. Schliessungsweg mit
    vorhandenen Mitteln ist belegt.
  - **CR04-2** - `applicability` behauptet eine Anwendungsgrenze, die die
    Runtime nicht einhaelt: `rC` wirkt ueber `isBondCategory` auf
    Anleihetranchen. Gemessener Effekt `-2.930,45` EUR auf 100.000 EUR
    ueber 2015-2022. Entweder ist die Anwendung auf den Anleihebucket im
    Vertrag zu deklarieren und fachlich zu begruenden, oder die Reihe darf
    dort nicht wirken.
- **Restrisiken:**
  - CR04-3 - zwei quellenseitig woertlich benannte Methodenbrueche (Maerz
    1970 Erhebungsgruppe, Juli 1990 Tageszaehlung) sind nicht deklariert;
    das Artefakt hat kein Analogon zu `historicalDiscontinuities`.
  - CR04-4 - `official` fuer 1949-1996 steht gegen "Not officially set or
    quoted" derselben Tabelle; Qualifier fehlt, Quellenkette bis 1975
    unvollstaendig.
  - CR04-5 - Widerspruch zur `monetaryAssetDiscontinuity` von Slice 03 fuer
    1948; die Jahre sind bei `excludeEstimatedHistory: false` erreichbar.
  - CR04-6 - `visualVerification` ist eine unpruefbare Behauptung in einem
    maschinenlesbaren Evidenzfeld.
  - CR04-7 - AK 7 nur fuer 2000/2001 belegt; Negativzins und
    `EURSTR`-Uebergang nicht bis zur Zinsgutschrift nachgerechnet.
  - CR04-8 - der von der Quelle verlangte `EURSTR`-Disclaimer fehlt.
  - CR04-9 - `rawDataHash` umfasst ein selbst erzeugtes Zwischenprodukt;
    ein Testfixture-Pfad steht im produktiven Runtime-Vertrag.
  - Uebernommen: der Interbanken-Overnight-Satz ist keine fuer
    Privatanleger erreichbare Rendite. Bankmarge, Produktkosten und
    Kontogebuehren sind ausgeschlossen und keinem Folgeslice zugewiesen; der
    verbleibende Bias wirkt optimistisch.
  - Fortgeschrieben aus Slice 02 und 03: CR02-10, CR02-17 sowie die
    Segmentrundungs- und Nahtrisiken der Inflationskette.
- **Pre-Mortem:** Die Bundesbank veroeffentlicht eine neue Langreihen-PDF.
  Jemand extrahiert die Tabellen mit dem `pdftotext`, das im `PATH` liegt -
  nicht notwendig dieselbe Implementierung wie beim Erstlauf -, zieht den
  Extrakthash mit und baut neu. Die Reihe ist um Jahre verschoben. Der
  Coverage-Check faengt es nur, solange die Verschiebung Luecken
  hinterlaesst; sonst greift kein Gate, weil kein Test die PDF liest und
  alle Fingerprints im selben Arbeitsgang neu erzeugt werden und sich selbst
  bestaetigen. Der Fehler zeigt sich erst als unerklaerte Verschiebung von
  Endvermoegen in Backtests, Jahre nachdem `zinssatz_de` als aufgeklaert
  gilt.

## Preflight fuer die Review-Nachbesserung

**Gemessen am:** 2026-07-30  
**Aktiver Branch:** `codex/suite-datenintegritaet-hardening`  
**HEAD:** `3880870 feat(simulator): implement slice 03 german consumer price index chain`  
**Arbeitsbaum:** ausschliesslich die erwarteten, noch unversionierten
Slice-04-Aenderungen; keine fremden oder unerwarteten Dateien  
**Reviewstatus:** Claude hat CR04-1 und CR04-2 als Blocker sowie CR04-3 bis
CR04-9 als Restrisiken dokumentiert

### Diff-Risiko der Nachbesserung

Geplante produktive Programm-/Konfigurationsdateien innerhalb des bereits
dokumentierten Siebener-Slice-Scope:

- `scripts/build-german-cash-money-market-chain.mjs`;
- `app/simulator/german-cash-money-market-chain.js` (generiert);
- `app/simulator/simulator-data.js`;
- `app/simulator/simulation-data-inventory.js`;
- `app/simulator/monte-carlo-contracts.js`.

Geplante Test-, Fixture-, Daten- und Dokumentationsdateien:

- Cash-/Geldmarktketten-, Quellenrekonstruktions-, Backtest- und
  Monte-Carlo-Vertragstests;
- `snapshot-policy-v1.json`;
- Quellen-/Lizenzdokumentation und die betroffenen Referenzdokumente;
- dieses Slice-Dokument und der Masterplan.

Voraussichtliche Aenderungstiefe:

- **mittel** fuer das Build-/Verify-Gate: die gepinnte PDF wird zusaetzlich
  mit Poppler `pdftohtml` 25.07.0 gelesen und ueber eine koordinatenbasierte,
  von der Layout-Textselektion unabhaengige Oracle-Reihe verglichen;
- **klein** fuer Runtime-Metadaten: bestehende Cash-/Bond-Anwendung,
  Methodenbrueche, Evidenzqualifier, Waehrungsreform und Disclaimer werden
  wahrheitsgemaess deklariert; Jahreswerte und Engine-Semantik bleiben
  unveraendert;
- **klein** fuer die Snapshot-Policy: fixture-spezifische Ignorierregeln
  wandern aus dem Produktivvertrag in die Messfixture.

Gefaehrdete bestehende Tests:

- Generator-/Verify- und Quellenrekonstruktionsgates;
- Manifest-, Inventar- und Dataset-Hash-Vertraege;
- Cash-/Geldmarktketten- und Backtestmarker;
- Monte-Carlo-Export- und Messvertrag.

Nicht anfassen:

- Engine-, Steuer-, Runway-, Mindest-Flex-, Quantisierungs- und
  Transaktionssemantik;
- die bestehende gemeinsame Runtime-Anwendung von `cashBondReturn` auf Cash
  und Anleihetranchen; eine fachliche Trennung waere eine eigene
  Engine-/Datenvertragsaenderung und ist nicht Teil dieser Nachbesserung;
- andere historische Reihen, `engine.js`, `dist/` und Release-Artefakte;
- unveraenderliche historische Snapshot-Fixtures.

Rollback-Strategie:

- geaenderte versionierte Dateien gezielt auf Basiscommit `3880870`
  zuruecksetzen;
- neu angelegte Slice-04-Dateien nur nach ausdruecklicher Freigabe entfernen;
- keine Hard-Resets oder destruktiven Sammeloperationen.

Der produktive Gesamtumfang des Slices bleibt bei sieben Programm-/
Konfigurationsdateien. Keine Stop-Regel wird durch die Nachbesserung
ausgeloest.

## Review-Antworten auf Claude-Feedback

**Nachbesserungsstand:** 2026-07-30  
**Verantwortung:** Codex implementiert; erneute Bewertung und Freigabe liegen
bei Claude, Gemini oder dem Nutzer

### CR04-1 - Primaer-PDF und unabhaengiges Oracle

Der Generator liest die gepinnte Bundesbank-PDF jetzt selbst mit Poppler
`pdftohtml` 25.07.0, Seiten 15 bis 16. Aus den XML-Koordinaten werden exakt 77
Jahreswerte selektiert und gegen den getrennten Layout-Extrakt verglichen.
Abweichende Abdeckung oder auch nur ein abweichender Wert blockiert den Build.
Der Quellenrekonstruktionstest verwendet einen eigenen Koordinatenreader mit
anderer Selektionsformulierung und liest ebenfalls die PDF; der Layout-Extrakt
ist dort kein Oracle mehr.

### CR04-2 - Tatsaechliche Cash-/Bond-Anwendung

`applicability` bildet nun den bestehenden Runtimevertrag ab:
`cashBondReturn` gilt fuer operative Liquiditaet, Geldmarkttranchen, den
cash-nahen Pflegebucket und Anleihetranchen. Die Metadaten und Referenzdoku
benennen, dass der Overnight-Proxy fuer Anleihen keine Duration,
Laufzeitpraemie, Kreditrisiken oder Mark-to-Market-Effekte abbildet. Eine
fachliche Aufspaltung in eigene Cash- und Bond-Reihen waere eine separate
Engine-/Datenvertragsaenderung und wurde in dieser Nachbesserung nicht
vorgenommen.

### CR04-3 und CR04-4 - Methoden- und Evidenzqualifikation

Die Meldergruppenumstellung im Maerz 1970, der Wechsel von 360/360 auf
actual/360 im Juli 1990, der FIBOR-Uebergang 1997 und der
EONIA-/EURSTR-Uebergang 2019 sind maschinenlesbar. Die Jahre 1949-1996 tragen
`proxy`, den Status `not_officially_set_or_quoted`, die gemeldete
Bankenpopulation und die Quellenkette ueber *Deutsches Geld- und Bankwesen in
Zahlen 1876-1975*, Verlag Fritz Knapp, sowie Bundesbank-Berechnungen.

### CR04-5 - Waehrungsreform 1948

Die Cash-Kette uebernimmt die in Slice 03 dokumentierte
`monetaryAssetDiscontinuity`: 100 RM grosse Bar- und Bank-/Sparguthaben
entsprachen nach dem Festkontengesetz 6,5 DM. Gleichzeitig ist
maschinenlesbar festgehalten, dass die bestehende Runtime diese nominelle
Abschreibung nicht anwendet und der 2,13-Prozent-Carry-forward sie weder
darstellt noch kompensiert. Damit besteht keine Kontinuitaetsbehauptung mehr;
eine historisch exakte Bilanzabschreibung bleibt ausserhalb dieses Slices,
weil sie Engine-Semantik aendern wuerde.

### CR04-6 - Reproduzierbare statt behauptete Evidenz

`sourceExtraction.visualVerification` wurde entfernt. An seine Stelle treten
Tool, exakte Version, Argumente, Seiten, Koordinatenselektion,
77-Jahres-Abdeckung, Reihenhash und die maschinenpruefbare Forderung exakter
Uebereinstimmung.

### CR04-7 - Durchgerechnete Runtime-Marker

Der fokussierte Backtesttest verfolgt fuer 2000, 2019 und 2020 den generierten
Jahreswert ueber `HISTORICAL_DATA`, `cashBondReturn` und den
`after_cash_interest`-Trace. Die erwartete Gutschrift wird als
`liqBasis * rate / 100` exakt nachgerechnet; das Jahresergebnis traegt
denselben Betrag und `portfolio_flow_delta` bleibt null.

### CR04-8 - EURSTR-Administratorhinweis

Die von der Bundesbank geforderte EZB-Administratorreferenz steht mit der
URL
`https://www.ecb.europa.eu/stats/financial_markets_and_interest_rates/euro_short-term_rate/html/index.en.html`
im generierten Artefakt, in `LICENSE.md` und in den Referenzdokumenten.

### CR04-9 - Hash- und Fixture-Grenzen

`rawDataHash` umfasst nur die beiden Primaerquellen JST und Bundesbank-PDF.
Der Layout-Extrakt besitzt einen getrennten `derivedArtifactHash`; die
koordinatenbasierte PDF-Reihe einen eigenen Jahreswertehash.
Fixture-spezifische Vergleichspfade wurden aus
`app/simulator/monte-carlo-contracts.js` entfernt und stehen nur noch in
`tests/fixtures/monte-carlo-measurement/snapshot-policy-v1.json`.
Export- und Messvertragstests sichern diese Grenze.

### Semantische und numerische Grenze der Nachbesserung

Die 101 Jahreswerte und ihr
`annualReturnHash=cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69`
sind unveraendert. Auch Engine-Semantik, Dataset-Hash, Backtest-Outcomes und
die unveraenderlichen Monte-Carlo-Snapshots wurden nicht umgeschrieben.
Geaendert wurden das Primaerquellengate, Evidenzmetadaten,
Vertragswahrheit, Tests und Dokumentation.

### Validierung der Nachbesserung

- `npm run verify:german-cash-money-market-data`: gruen, 101 Jahre,
  unveraenderter Jahreswertehash.
- PDF-Quellenrekonstruktion: 229/229 Assertions.
- Cash-/Geldmarktkette: 361/361 Assertions.
- Runtime-Backtestmarker: 73/73 Assertions.
- Manifest: 303/303; Inventar: 391/391; Backtestdelta: 339/339;
  Backtestcharakterisierung: 86/86 Assertions.
- Balance-Import-/Anwendungsgate: 245/245 Assertions.
- Monte-Carlo-Export: 113/113; Monte-Carlo-Messvertrag: 1.375/1.375
  Assertions.
- Suite-Datenintegrationsvertrag: nach der erwarteten Aktualisierung des
  deklarierten `mc-snapshot-policy`-Blobhashes gruen mit 1.069/1.069
  Assertions. Der erste Lauf blockierte genau diese noch alte
  Traceability-Angabe und bestaetigte damit das Delta-Gate.
- Vollsuite: 147 Testdateien, 14.270/14.270 Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles.

Eine externe Freigabe wird aus diesen technischen Ergebnissen nicht
abgeleitet.
| CR04-10 | Claude-Review (Runde 2) | Build- und Testsuite haengen jetzt fail-closed an genau Poppler `pdftohtml` 25.07.0; die Voraussetzung ist nirgends als Installationsanforderung deklariert | offen | ausstehend |
| CR04-11 | Claude-Review (Runde 2) | `hashes.rawDataScope` ist kein Hash; `layoutExtract.tool.version` erbt die `pdftohtml`-Konstante fuer `pdftotext` und bleibt ungeprueft | offen | ausstehend |
| CR04-12 | Claude-Review (Runde 2) | 1997-1998 tragen `official` ohne Qualifier, obwohl Fussnote 1 im Kopf derselben Tabelle steht | offen | ausstehend |
| CR04-13 | Claude-Review (Runde 2) | Inventarinhalt inklusive `rawDataHash` und einer Segment-Evidenzklasse geaendert, `SIMULATION_DATA_INVENTORY_REVISION` unveraendert | offen | ausstehend |

## Zweitreview von Claude (Runde 2)

**Reviewstand:** 2026-07-30, Arbeitsbaum auf Basiscommit `3880870`.
Reviewerstatus: `freigegeben` mit zwei Auflagen vor Slice 05. Header,
`**Status:**` und `**Freigabe:**` bleiben unveraendert.

Alle neun Findings der ersten Runde sind geschlossen; beide Blocker wurden
einzeln mutativ nachgewiesen. Vier neue Punkte betreffen die Konstruktion, mit
der die Schliessung erreicht wurde.

### Nachgemessene Gates

- `npm test`: 14.270 von 14.270 Assertions, 147 Testdateien,
  0 fehlgeschlagene Dateien, 0 offene Handles - deckungsgleich mit der
  Codex-Angabe;
- `verify:german-cash-money-market-data`, `verify:german-cpi-data`,
  `verify:global-equity-data`, `docs:evidence`: gruen und schreibfrei;
- `git diff --check`: sauber;
- Slice-02- und Slice-03-Artefakte unveraendert (`c2b754e4...`,
  `ff67229b...`);
- **Alle 101 Jahreswerte sind gegenueber dem Erstreviewstand unveraendert**,
  Abweichung 0, `annualReturnHash`
  `cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69`
  unveraendert. Die Nachbesserung hat keinen Wert angefasst;
- Determinismus: dreimaliger Build erzeugt dreimal
  `c1dd135744548038...`. Die externe Werkzeugausfuehrung fuehrt keine
  Laufzeitvarianz in das Artefakt ein.

### CR04-1 geschlossen - vier Proben

Der Generator liest die gepinnte PDF jetzt selbst
(`readBundesbankPdfCoordinateRates`), vergleicht 77 Jahre gegen den
Layout-Extrakt und bricht bei jeder Abweichung ab. Der Rekonstruktionstest
liest die PDF ebenfalls; der Layout-Extrakt ist dort kein Oracle mehr.

| Probe | Ergebnis |
| --- | --- |
| **A** Kernprobe der ersten Runde wiederholt: Fehler im Layout-Extrakt (1970 `8.65` -> `3.65`) mit mitgezogenem Hashpin | Build rc=1 und `--verify-only` rc=1, jeweils `Bundesbank layout extract disagrees with the independent PDF coordinate oracle`; Rekonstruktionstest ERKANNT. In Runde 1 blieb genau diese Probe **unbemerkt** und `--verify-only` meldete gruen |
| **D** Koordinatenfenster des Generators auf die One-month-Spalte verschoben | Build rc=1, dieselbe Kreuzvergleichsmeldung |
| **E** Layout-Selektor des Generators auf die One-month-Spalte verschoben | Build rc=1, dieselbe Kreuzvergleichsmeldung |
| **G** falscher Wert direkt im Artefakt, Extrakt und alle Hashes unangetastet, nur der Rekonstruktionstest ausgefuehrt | ERKANNT - `1970 should equal the independent source oracle` |

Probe G ist die entscheidende: sie umgeht das Generator-Gate vollstaendig und
beweist, dass der Test den Wert aus der PDF selbst gewinnt. Die
Selektionskriterien sind zwischen Generator und Test verschieden formuliert -
Generator `left >= 280 && left <= 350`, Test `left > 250 && right <= 350` -,
sodass die in Runde 1 beanstandete Zeichenidentitaet der Selektoren
aufgehoben ist.

### Die uebrigen sieben Findings

**CR04-2 geschlossen.** `applicability` nennt jetzt `bondTranches: true`,
`equityTranches: false`, `goldTranches: false`, `runtimeField:
'cashBondReturn'` und `modelingStatus: 'shared_cash_bond_proxy'`. Das deckt
sich mit `simulator-year-portfolio.js:33` und `three-bucket-logic.mjs:21`;
Gold laeuft ueber `rG`, Aktien ueber `rA`. `proxyQualification.
bondMaturityMismatch` benennt Duration, Laufzeitpraemie, Kreditrisiko und
Mark-to-Market als nicht modelliert. Die fachliche Trennung in eigene Cash-
und Bond-Reihen ist ausdruecklich zurueckgestellt und als Engine-/
Datenvertragsaenderung markiert - das ist eine nachvollziehbare
Scope-Entscheidung, kein verdeckter Verzicht.

**CR04-3 geschlossen.** `proxyQualification.historicalDiscontinuities`
fuehrt vier Eintraege mit Fussnotenbelegstelle: `1970-03` Meldergruppe,
`1990-07` Wechsel 360/360 auf actual/360, `1997-01` FIBOR O/N und
`2019-10-01` `EURSTR`. `mixedAnnualAverageYear` ist genau bei den drei
Jahresmitte-Umstellungen gesetzt und beim Jahreswechsel 1997 korrekt
weggelassen.

**CR04-4 geschlossen** bis auf CR04-12. 1949-1996 tragen jetzt `proxy`,
`quotationStatus: 'not_officially_set_or_quoted'`, den
`populationQualifier` und die Quellenkette ueber *Deutsches Geld- und
Bankwesen in Zahlen 1876-1975*, Verlag Fritz Knapp, sowie
Bundesbank-Berechnungen.

**CR04-5 geschlossen.** `currencyRegimes` ist in 1925-1947, 1948 und
1949-1998 aufgeteilt; 1948 traegt den Reformbruch explizit.
`monetaryAssetDiscontinuity` uebernimmt die Slice-03-Zahlen und ergaenzt
`runtimeLimitation` sowie die Feststellung, dass der 2,13-Prozent-Carry-
forward die Abschreibung weder darstellt noch kompensiert. Die
Kontinuitaetsbehauptung "no currency conversion is performed" ist
verschwunden.

**CR04-6 geschlossen.** `visualVerification` ist entfernt. An seine Stelle
treten `layoutExtract` und `coordinateOracle` mit Werkzeug, Version,
Argumenten, Selektionsregel, eigenem Jahreswertehash und
`exactAgreementRequired: true`, dazu `sourceValidation.primaryPdfReadByCode:
true`.

**CR04-7 geschlossen.** `assertCashRateMarker` in
`tests/simulator-backtest.test.mjs` rechnet fuer 2000, 2019 und 2020 den Weg
vom generierten Jahreswert ueber `HISTORICAL_DATA`, den
`after_cash_interest`-Trace und `liqBasisForInterest * rate / 100` bis
`portfolio_flow_delta = 0` nach. Eine Doppelanwendung waere daran erkennbar,
weil sie `(1+r)^2-1` erzeugen wuerde. Die drei Jahre decken positives,
Uebergangs- und negatives Zinsumfeld ab.

**CR04-8 geschlossen.** Die EZB-Administratorreferenz steht mit URL in
`benchmarkDisclaimers` des Artefakts, in `LICENSE.md` Zeile 17-21 und in den
Referenzdokumenten.

**CR04-9 geschlossen** bis auf CR04-11. `rawDataHash` umfasst nur noch die
beiden Primaerquellen (`ea1608b5...`), der Layout-Extrakt hat einen eigenen
`derivedArtifactHash` (`eae9ce9d...`), und die koordinatenbasierte Reihe
einen eigenen Jahreswertehash (`f4677d78...`, korrekt verschieden vom
101-Jahres-Hash, weil er 77 Jahre deckt).
`ignoredHistoricalFixtureFields` ist aus `monte-carlo-contracts.js`
entfernt; dort stehen nur noch `policy` und `promotionRule`.

### CR04-10 (neu, Auflage) - die Suite haengt an einer undeklarierten Binaerversion

Die Schliessung von CR04-1 wurde mit einem externen Werkzeugaufruf erkauft.
`resolvePinnedPdftohtml` verlangt `pdftohtml`-Version **exakt** `25.07.0` und
bricht sonst mit `Pinned Poppler pdftohtml implementation is unavailable` ab.
Gemessen in einer Umgebung ohne Poppler im `PATH` und ohne `LOCALAPPDATA`:

- `scripts/build-german-cash-money-market-chain.mjs --verify-only`: rc=1;
- `tests/german-cash-money-market-source-reconstruction.test.mjs`: rc=1 mit
  `Independent PDF oracle requires Poppler pdftohtml 25.07.0; set
  RUHESTANDSAPP_PDFTOHTML when it is not on PATH.`

Dieser Test ist Teil der Vollsuite (229 Assertions, in-process). Damit ist
Akzeptanzkriterium 12 - "`npm test` ist vollstaendig gruen" - an eine
Maschine gebunden, auf der genau diese Poppler-Patchversion installiert ist.
Probe F belegt die Striktheit: eine Aenderung der gepinnten Version auf
`25.08.0` laesst `--verify-only` fail-closed abbrechen, obwohl die
Extraktion unveraendert waere.

Drei Teilprobleme:

1. Die Voraussetzung ist nirgends als Installationsanforderung deklariert.
   `README.md` Abschnitt "Systemvoraussetzungen" nennt Browser und Node.js;
   `package.json` enthaelt weder eine Prueffunktion noch einen Hinweis.
   `tests/README.md` beschreibt den Reader als Testzweck, nicht als zu
   installierendes Werkzeug mit Version und Bezugsquelle.
2. Der WinGet-Paketidentifikator
   `oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe` ist in
   Produktiv- **und** Testcode hart verdrahtet. Das ist Umgebungswissen eines
   einzelnen Entwicklerrechners im Repository.
3. Gepinnt wird die Werkzeugversion statt des Ergebnisses. Der
   Wertkreuzvergleich wuerde eine Aenderung des Poppler-Verhaltens ohnehin
   fangen; die Gleichheitsforderung auf die Patchversion macht jedes
   Poppler-Upgrade zum Buildabbruch.

Die Fehlermeldung ist gut und der Ausfall ist fail-closed - deshalb ist das
kein Blocker. Es ist aber die Klasse Problem, die den erreichten Gewinn
wieder aufheben kann: siehe Pre-Mortem.

### CR04-11 bis CR04-13 (neu, leicht)

**CR04-11.** `hashes` enthaelt jetzt `rawDataScope:
'primary_source_files_only'` - ein Metadatum in einem Hash-Container.
Ausserdem deklariert `sourceExtraction.layoutExtract.tool` fuer `pdftotext`
die Version aus der Konstante `POPPLER_PDFTOHTML_VERSION`. Die Angabe
stimmt - ich habe den Extrakt mit Poppler `pdftotext` 25.07.0 byteidentisch
reproduziert -, aber sie wird von keinem Gate geprueft, weil niemand
`pdftotext` ausfuehrt. Nach der Nachbesserung ist der Layout-Extrakt ein
reines Zwischenprodukt, dessen Werkzeugherkunft behauptet bleibt.

**CR04-12.** 1997-1998 tragen `official` ohne Qualifier. Das Fussnotenzeichen
1 mit dem Text "Not officially set or quoted" haengt im Spaltenkopf
"Frankfurt banks' money market rates1, FIBOR" und ist damit formal auch auf
diese beiden Jahre anwendbar. Die Differenzierung ist vertretbar, weil der
Fussnotentext ausdruecklich die gemeldete Reihe beschreibt; belegt ist sie
nicht.

**CR04-13.** `SIMULATION_DATA_INVENTORY_REVISION` steht weiterhin auf
`2026-07-29.5`, obwohl der Inventarinhalt in 16 Zeilen geaendert wurde -
darunter `rawDataHash` von `129b290a...` auf `ea1608b5...` und die
`evidenceClass` des Segments 1949-1996 von `official` auf `proxy`. Zwei
inhaltlich verschiedene Inventarstaende tragen damit dieselbe
Revisionskennung. Das Aenderungsgate, das Slice 01 eingefuehrt hat, greift
an dieser Stelle nicht.

### Verworfene Hypothesen der Runde 2

1. **Der Kreuzvergleich prueft den Extrakt nur gegen sich selbst** - nein,
   Probe G beweist die eigenstaendige PDF-Lesung im Test.
2. **Generator und Test teilen wieder identische Selektoren** - nein, die
   Koordinatenkriterien sind unterschiedlich formuliert.
3. **Jahreswerte oder Reihenhash wurden angefasst** - nein, 0 von 101
   Abweichungen, `annualReturnHash` unveraendert.
4. **Der externe Werkzeugaufruf macht den Build nichtdeterministisch** -
   nein, dreimal derselbe Artefakthash; die Temp-XML wird im `finally`
   entfernt.
5. **Ein fehlendes Werkzeug wird stillschweigend uebersprungen** - nein,
   fail-closed mit praeziser Meldung.
6. **Der Koordinaten-Oracle-Hash muesste dem Kettenhash entsprechen** - nein,
   er deckt 77 statt 101 Jahre; die Differenz ist erwartet.
7. **Slice-02-/Slice-03-Artefakte oder der Dataset-Hash wurden beruehrt** -
   nein, alle drei unveraendert.

## Review-Ergebnis (Claude, Runde 2)

- **Status:** freigegeben
- **Blocker:** keine. CR04-1 und CR04-2 sind geschlossen; CR04-1 ist durch
  vier Proben belegt, darunter die Wiederholung der Kernprobe aus Runde 1,
  die dort unbemerkt blieb und jetzt in allen drei Gates abbricht.
- **Auflagen vor Slice 05:**
  - **CR04-10** - die neue harte Abhaengigkeit auf Poppler `pdftohtml`
    25.07.0 als Installationsanforderung mit Version und Bezugsquelle
    dokumentieren, den WinGet-spezifischen Pfad aus Produktiv- und Testcode
    loesen und die Versionspruefung so fassen, dass ein Poppler-Upgrade den
    Build nicht allein wegen der Patchnummer bricht.
  - **CR04-13** - `SIMULATION_DATA_INVENTORY_REVISION` bei geaendertem
    Inventarinhalt erhoehen.
- **Restrisiken:**
  - CR04-11 - `rawDataScope` als Nicht-Hash im Hash-Container; die
    Werkzeugangabe des Layout-Extrakts bleibt ungeprueft.
  - CR04-12 - `official` fuer 1997-1998 ist vertretbar, aber nicht belegt.
  - Markerjahre: die Segmentnaehte 1944/1945, 1948/1949 und 1998/1999 sind
    weiterhin nur ueber Wertepins abgedeckt, nicht bis zur Zinsgutschrift.
  - Der Interbanken-Overnight-Satz bleibt keine fuer Privatanleger
    erreichbare Rendite; Bankmarge, Produktkosten und Kontogebuehren sind
    ausgeschlossen und keinem Folgeslice zugewiesen. Der Bias wirkt
    optimistisch. Fuer Anleihetranchen ist die Fristigkeitsluecke jetzt
    deklariert, aber weiterhin wirksam - gemessen `-2.930,45` EUR auf
    100.000 EUR ueber 2015-2022.
  - Die 1948er Reformdiskontinuitaet ist dokumentiert, aber die Runtime
    wendet sie nicht an; Monte Carlo nutzt diese Jahre bei
    `excludeEstimatedHistory: false` weiterhin.
  - Fortgeschrieben aus Slice 02 und 03: CR02-10, CR02-17 sowie die
    Segmentrundungs- und Nahtrisiken der Inflationskette.
- **Pre-Mortem:** Die Suite laeuft auf einer zweiten Maschine - CI,
  Zweitgeraet oder Reviewumgebung - und ist rot, weil Poppler fehlt oder eine
  andere Patchversion traegt. Weil "`npm test` vollstaendig gruen" das
  zentrale Freigabekriterium des Programms ist, wird der schnellste Weg
  gewaehlt: die Versionspruefung wird aufgeweicht oder der Test
  uebersprungen. Damit ist das in dieser Runde gewonnene Primaerquellengate
  ausgeschaltet, ohne dass eine Zeile Datenlogik angefasst wurde - und der
  naechste Extraktionsfehler ist wieder unsichtbar.
