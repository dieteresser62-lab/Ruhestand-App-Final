# Slice 03 - Deutscher Verbraucherpreisindex

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Entscheidung:** dauerhafte Nutzerentscheidung vom 2026-07-29 fuer
Slice 02 bis 13; kein neuer Feature-Branch  
**GitHub-Status:** kein Upstream fuer den aktiven Branch eingetragen  
**Basiscommit:** `289471b`  
**Status:** Nachbesserung nach Claude-Zweitreview Runde 2 umgesetzt;
externes Re-Review ausstehend  
**Freigabe:** ausstehend; Codex nimmt keine Selbstfreigabe vor

## Input aus der Freigabe von Slice 02

Das Claude-Zweitreview Runde 2 von Slice 02 ist verbindlicher
Uebergabe-Input. Vor dem Coding dieses Slices wurden deshalb die vier
Auflagen CR02-13 bis CR02-16 als eigenes Gate technisch geschlossen:

- zeitraumgebundene Identitaet und expliziter Periodenvergleich der
  Referenzfaelle;
- schreibfreie Original-zu-Filter-Rekonstruktion als regulärer Suite-Test;
- Samplinggrenze 1950/1951 konsistent mit dem Equity-Proxysegment;
- ausdrueckliche Dokumentation des deutschen
  Waehrungsreform-Rekonstruktionsartefakts 1948/1949.

Die gezielten Gates waren vor Beginn der VPI-Implementierung gruen. Die
technische Erledigung ist am Ende der Slice-02-Datei dokumentiert.

## Preflight vor Coding

**Gemessen am:** 2026-07-29  
**Aktiver Branch:** `codex/suite-datenintegritaet-hardening`  
**HEAD:** `289471b feat(simulator): implement slice 02 global equity research chain`  
**Arbeitsbaum:** vor dem vorgeschalteten Gate sauber; beim Beginn der
VPI-Implementierung erwartungsgemaess geaendert durch CR02-13 bis CR02-16  
**Unerwartete Dateien:** keine  
**Branchstatus:** kein Upstream konfiguriert; die dokumentierte
Nutzerentscheidung erlaubt die lokale Fortsetzung

**Erwartetes Diff-Risiko:**

- hoch fuer historische Backtest- und Monte-Carlo-Ergebnisse, weil
  `inflation_de` die reale Deflationierung, Regimeklassifikation und in
  Folgejahren nominal fortgeschriebene Bedarfe beeinflusst;
- mittel fuer Charakterisierungsfixtures und Datenhashes;
- begrenzt fuer Engine-Semantik: Nach ausdruecklicher Nutzerfreigabe wurde nur
  die Inflations-Untergrenze des zentralen Inputvalidators von `-10` auf `-15`
  Prozent erweitert; Steuer-, Runway-, Quantisierungs-, Mindest-Flex- und
  Transaktionslogik bleiben unveraendert;
- `npm run build:engine` ist wegen der Validatoraenderung Pflichtgate. Der
  Fallback-Build hat den bestehenden `engine.js`-Wrapper inhaltlich nicht
  veraendert; `dist/` und `RuheStandSuite.exe` bleiben ausserhalb des Scope.

## Ziel

`inflation_de` wird von einer nicht identifizierten eingebetteten Reihe zu
einer reproduzierbaren deutschen Verbraucherpreis-Jahresdurchschnittskette
fuer 1925 bis 2025. VPI, historische Preisindizes fuer die Lebenshaltung und
der fruehe Forschungsproxy bleiben als getrennte Evidenzsegmente sichtbar.
HICP-Werte werden nicht verwendet.

## Kanonischer Reihenvertrag

| Returnjahre | Reihe | Gebiet / Population | Evidenzklasse | Nahtregel |
| --- | --- | --- | --- | --- |
| 1925-1949 | JST R6 `cpi`, Jahresdurchschnittslevel; historischer Preisindex fuer die Lebenshaltung, kein moderner VPI | Deutsches Reich beziehungsweise Deutschland im jeweiligen historischen JST-Datenvertrag | `proxy` | Rate `t` aus JST-Level `t-1` und `t`; die Destatis-1948-Beobachtung ist nur der Durchschnitt des zweiten Halbjahres und wird deshalb nicht fuer 1949 verkettet |
| 1950-1962 | Preisindex fuer die Lebenshaltung, 4-Personen-Haushalte von Arbeitern und Angestellten mit mittlerem Einkommen | Frueheres Bundesgebiet | `official` mit ausdruecklicher Proxy-Population | erste Rate 1950 aus demselben amtlichen Index 1949/1950 |
| 1963-1991 | Preisindex fuer die Lebenshaltung, alle privaten Haushalte | Frueheres Bundesgebiet | `official` | erste Rate 1963 aus demselben amtlichen Index 1962/1963 |
| 1992-2025 | Verbraucherpreisindex fuer Deutschland | Deutschland | `official` | erste Rate 1992 aus demselben amtlichen VPI 1991/1992 |

Die Segmentgrenzen erzeugen damit keinen Return aus zwei unterschiedlichen
Indexvarianten oder Gebietsstaenden. Die Kette ist kanonisch fuer die App,
aber kein einzelner rueckgerechneter amtlicher Gesamtdeutschland-VPI bis 1925.
Insbesondere ist die JST-Rate von rund `-11,03` Prozent dem Krisenjahr 1932
zuzuordnen. Sie beschreibt den historischen Preisindex fuer die Lebenshaltung
und nicht die Wendezeit: Fuer 1989 und 1990 enthaelt die Kette positive Raten
von `2,8` beziehungsweise `2,6` Prozent.

## Datenquellen

1. Destatis, Statistischer Bericht
   `Verbraucherpreisindex fuer Deutschland - Lange Reihen ab 1948`,
   Tabellen `csv-611xx-01` und `csv-611xx-02`, Jahresdurchschnitte und
   Veraenderungsraten; Datenlizenz Deutschland - Namensnennung - Version 2.0.
2. Destatis, aktuelle VPI-Tabelle `Verbraucherpreisindex: Gesamtindex und
   12 Abteilungen`, Jahresdurchschnitt 2025; Datenlizenz Deutschland -
   Namensnennung - Version 2.0.
3. Jordà-Schularick-Taylor Macrohistory Database R6, deutsches
   Jahresdurchschnitts-CPI-Level 1924-1949; CC BY-NC-SA 4.0. Das bereits in
   Slice 02 paketierte Original wird wiederverwendet und nicht dupliziert.
4. Statistisches Reichsamt / Statistisches Bundesamt,
   [Statistik der Verbraucherpreise 1920 bis 1937](https://www.statistischebibliothek.de/mir/servlets/MCRFileNodeServlet/DEMonografie_derivate_00001286/statistik-verbraucherpreise-1920-37.pdf),
   als unabhaengiger semantischer Gegencheck fuer den historischen
   Lebenshaltungskostenbegriff und die Groessenordnung der 1932er Deflation;
   kein Transformationsinput des Generators.

Abrufstand, Originaldatei-Hashes, Transformationsformel und generierter
Wertehash werden im Datenartefakt und in
`docs/reference/DATA_SOURCES.md` festgehalten.

## Scope

- Rohdaten und reproduzierbares Transformationsskript fuer die vier Segmente;
- generiertes, tief eingefrorenes VPI-Datenmodul;
- Projektion aller 101 `inflation_de`-Werte aus dem generierten Modul;
- reihenspezifische Manifest- und Inventarqualitaet;
- Tests fuer Quellenhashes, Vollnachrechnung, Segmentnaehte, 2024/2025,
  Runtimeprojektion und HICP-Ausschluss;
- Vorher-/Nachher-Backtestdeltas fuer feste Referenzfaelle;
- Dokumentations-Sync in Hauptplan, Datenquellen, Technik,
  Simulator-Modulreferenz und Testreferenz.

## Nicht im Scope

- weitere Aenderungen der Engine-, Steuer-, Runway-, Mindest-Flex-,
  Quantisierungs- oder Transaktionssemantik ausserhalb der ausdruecklich
  freigegebenen Inflations-Untergrenze;
- Austausch der Lohn-, Cash-, Gold- oder CAPE-Reihe;
- Aenderung der Live-Inflationsprovider der Balance-App;
- Neuberechnung von HICP;
- Release-Sync von `dist/` oder Bau der EXE.

## Akzeptanzkriterien

1. Die Kette deckt 1925 bis 2025 lueckenlos mit endlichen Prozentwerten ab.
2. 2024 und 2025 betragen jeweils 2,2 Prozent.
3. Kein Segment verwendet HICP; Quelle und Serienidentitaet sind
   maschinenlesbar.
4. Jeder Jahreswert stimmt innerhalb `1e-12` mit der unabhaengigen
   Vollnachrechnung aus den Rohleveln beziehungsweise amtlichen
   Veraenderungsraten ueberein.
5. Die Nahtjahre 1950, 1963 und 1992 verwenden ausschliesslich Vorjahres- und
   Jahreslevel derselben Quellreihe.
6. Der isolierte D-20-Endjahresfall 2024 aendert keine nominale
   Ergebniskennzahl; seine reale Abweichung ist aus dem geaenderten
   Deflatorfaktor rechnerisch erklaert.
7. Vollketten-Referenzlaeufe dokumentieren erwartete nominale und reale
   Deltas, wenn geaenderte Inflation Folgejahresbedarfe fortschreibt.
8. `FlowDelta` bleibt unauffaellig, Outcomes bleiben erklaert und
   `minimumFlexAnnual` wird weder still begrenzt noch umbenannt.
9. Manifest, Inventar und Runtime tragen denselben generierten
   Inflationswertehash.
10. `npm test` ist vollstaendig gruen; Codex erteilt keine Selbstfreigabe.

## Stop-Regeln

Der Slice stoppt vor weiterer Umsetzung, wenn:

- die amtliche XLSX-Struktur oder ein gepinnter Rohdatenhash nicht
  reproduzierbar ist;
- ein Jahreswert nicht eindeutig einem der vier Segmente zugeordnet werden
  kann;
- an einer Segmentgrenze zwei unterschiedliche Indexreihen in eine
  Jahresrate eingehen;
- mehr als zehn produktive Programm-/Konfigurationsdateien geaendert werden
  muessen;
- Engine-Semantik geaendert werden muesste;
- Referenz-Outcomes unerwartet wechseln, `FlowDelta` auffaellig wird oder
  die Tests nicht sinnvoll ausfuehrbar sind;
- UI und Engine unterschiedliche Parameternamen verwenden;
- `minimumFlexAnnual` irgendwo still begrenzt statt validiert wird.

## Geplanter Dateiscope

Produktiv / Konfiguration:

- `app/simulator/german-cpi-chain.js` (generiert),
- `app/simulator/simulator-data.js`,
- `app/simulator/simulation-data-inventory.js`,
- `engine/validators/InputValidator.mjs`,
- `scripts/build-german-cpi-chain.mjs`,
- `package.json`.

Tests und Fixtures:

- `tests/german-cpi-chain.test.mjs`,
- `tests/german-cpi-backtest-delta.test.mjs`,
- `tests/engine-robustness.test.mjs`,
- `tests/monte-carlo-measurement-contract.test.mjs`,
- `tests/suite-data-integration-contract.test.mjs`,
- betroffene historische Manifest-, Inventar- und Charakterisierungsfixtures.

Daten und Dokumentation:

- `data/historical/german-cpi-chain/`,
- dieses Slice-Dokument,
- Hauptplan und betroffene Referenzdokumente.

## Abschlussprotokoll

### Technischer Stand vom 2026-07-29

Umgesetzt und gezielt validiert:

- gepinnte JST-/Destatis-Originale mit Lizenzen und Einzelhashes;
- Generator `scripts/build-german-cpi-chain.mjs` mit schreibfreiem
  `--verify-only`-Gate;
- generiertes `GermanCpiResearchChainV1` mit 101 Raten, synthetischen Levels,
  Quellsegmenten und tiefem Freeze;
- Runtimeprojektion ohne verbliebene numerische `inflation_de`-Literale;
- Manifestrevision `2026-07-29.3`, Dataset-Hash
  `26e7334f7123c5f22d40746a9c9f7b840e44beebb10df148c3c11f528128d6e2`;
- kombinierter Rohdatenhash
  `83841d2c11df3a5e193aa07db3bdfe815cbbeea7f9f81c3526b197702a46bdb4`
  und Inflationswertehash
  `9ec87b5052d5e086517142c34213a4063e2be6ccdd8a5babf6d5722ffb76ae3a`;
- 2024/2025 jeweils 2,2 Prozent und expliziter HICP/HVPI-Ausschluss;
- eingefrorener Post-Slice-02-Backteststand sowie maschinenlesbare
  Slice-03-Deltas mit stabilen Outcomes und `FlowDelta` unter einem Euro;
- neuer unveraenderlicher Monte-Carlo-Kandidat
  `post-backtest-data-03-v1`, der `post-backtest-data-02-v3` als Quelle
  referenziert und `pending` bleibt;
- D-20-Endjahresisolation: nominale Differenz 0 EUR, dokumentierte reale
  Differenz +7.758,95 EUR vollstaendig aus dem geaenderten Deflator.

Gruene gezielte Gates:

- `npm run verify:german-cpi-data`;
- `tests/german-cpi-chain.test.mjs` (539/539);
- `tests/german-cpi-source-reconstruction.test.mjs` (3/3);
- `tests/german-cpi-backtest-delta.test.mjs` (403/403);
- `tests/historical-data-manifest.test.mjs` (302/302);
- `tests/simulation-data-inventory.test.mjs` (395/395);
- `tests/simulator-backtest-characterization.test.mjs` (85/85);
- `tests/global-equity-backtest-delta.test.mjs` (360/360);
- `tests/engine-robustness.test.mjs` (39/39);
- `tests/suite-data-integration-contract.test.mjs` (1.069/1.069);
- `npm run build:engine` erfolgreich, Fallback-Wrapper ohne Inhaltsdelta;
- `npm test`: 144 Testdateien, 12.440/12.440 Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles.

### Aufloesung S03-STOP-01 - JST-Deflation 1932 verletzte Engine-Vertrag

Der erste Vollsuite-Lauf war nicht gruen und hat die dokumentierte Stop-Regel
korrekt ausgeloest. Die direkte JST-Levelnachrechnung ergibt fuer 1932
`-11.02941175231129` Prozent. Die gemeinsame Engine-Validierung akzeptiert
zu diesem Zeitpunkt Inflation nur von `-10` bis `50` Prozent. Dadurch schlugen
die
Monte-Carlo-, Sweep-, Auto-Optimize- und Workerpfade fachlich fail-closed
fehl. Die Vollsuite meldete:

- 10.848 Assertions, davon 10.843 bestanden und 5 fehlgeschlagen;
- 2 weitere fehlgeschlagene Testdateien ohne Assertionabschluss;
- die MC-/Sweep-/Workerfehler als Folge der 1932-Grenzverletzung;
- zusaetzlich erwartete, noch nachzuziehende Hash-/Ledger-Deltas in
  `monte-carlo-measurement-contract` und
  `suite-data-integration-contract`.

Codex hat den Forschungswert nicht still auf `-10` begrenzt. Der Nutzer hat
am 29. Juli 2026 nach der fachlichen Einordnung der historischen
Reichsindex-Reihe die Erweiterung der Engine-Grenze ausdruecklich freigegeben.
Die Untergrenze wurde deshalb auf `-15` Prozent erweitert; `50` Prozent bleibt
die unveraenderte Obergrenze. Regressionstests belegen den exakten
JST-1932-Wert, die inklusive `-15`-Grenze und die Zurueckweisung unterhalb
dieser Grenze. Der anschliessende Vollsuite-Lauf ist vollstaendig gruen. Es
wurde weder winsorisiert noch ein historischer Wert begrenzt.

## Abweichungen vom Plan

- Die Engine-Inflationsuntergrenze war urspruenglich ausserhalb des Slice-Scope.
  Die unerwartete, aber quellengetreue 1932er Rate aktivierte die Stop-Regel.
  Erst nach ausdruecklicher Nutzerfreigabe wurde diese eine Grenze erweitert.
- Wegen der geaenderten Datenversion wurde zusaetzlich zur geplanten
  Backtestdelta-Fixture eine eigene Monte-Carlo-Snapshotstufe fuer
  Backtest-Data Slice 03 angelegt. Fruehere Snapshots bleiben unveraendert.

## Offene Risiken

- 1925 bis 1949 bleibt ein JST-Forschungsproxy fuer historische
  Lebenshaltungskosten und ist kein moderner VPI fuer das heutige Deutschland.
- Die Balance-Liveprovider und deren Jahresfortschreibung bleiben ausserhalb
  dieses Slices bei ihrem eigenen `-10`-bis-`50`-Plausibilitaetsvertrag. Die
  neue `-15`-Untergrenze betrifft den zentralen Engine-Inputvertrag, der fuer
  historische Simulationsjahre benoetigt wird.
- Reviewstatus der neuen Delta- und Monte-Carlo-Evidenz bleibt `pending`.

## Rueckdokumentation

Der Hauptplan fuehrt Slice 03 als umgesetzt und technisch validiert. Datenquelle,
Generator, Manifest-/Inventarvertrag, Ergebnisdeltas, Validatorentscheidung und
Vollsuite-Ergebnis sind in den betroffenen Referenz- und Testdokumenten
nachgezogen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| U-01 | Nutzer | Historischen 1932er Wert nicht der Wendezeit zuordnen | angenommen | 1989/1990 explizit als positive Raten dokumentiert; Fruehsegment als historischer Lebenshaltungskostenproxy bezeichnet |
| U-02 | Nutzer | Engine-Untergrenze erweitern | angenommen | Untergrenze `-15`, Obergrenze unveraendert `50`; Grenz- und Regressionsfaelle getestet |
| CR03-1 | Claude-Review | AK 4 ist nicht umgesetzt: es existiert kein von `build-german-cpi-chain.mjs` unabhaengiges Nachrechnungsoracle; der Rekonstruktionstest fuehrt denselben Generator erneut aus | offen (Blocker) | ausstehend |
| CR03-2 | Claude-Review | Der Querpruefungs-Guard von `0.16` pp ist rund dreimal lockerer als noetig und laesst einen vollen publizierten Tick von `0.1` pp unbemerkt durch | offen | ausstehend |
| CR03-3 | Claude-Review | Nahtjahr 1949 stammt aus dem einzigen von JST selbst verketteten, nicht ganzzahligen Proxywert und weicht 8,09 pp von der amtlichen Alternative ab; Groessenordnung und Splicecharakter sind nicht dokumentiert | offen | ausstehend |
| CR03-4 | Claude-Review | Die Quantisierung des Proxysegments (0,48 bis 0,85 pp je Jahr gegenueber 0,1 pp im amtlichen Segment) ist in Kette, Manifest, Inventar und Datenquellen nicht deklariert | offen | ausstehend |
| CR03-5 | Claude-Review | Preisstopp 1936 bis 1948 und Waehrungsreform 1948 bleiben unbenannt, obwohl das Gegenstueck der Aktienreihe auf Auflage CR02-16 hin ausdruecklich dokumentiert wurde | offen | ausstehend |
| CR03-6 | Claude-Review | CR02-13 ist nur an der Zuordnung geschlossen; der `inputHash` bleibt nicht diskriminierend und kollidiert in der neuen Slice-03-Fixture erneut | offen | ausstehend |
| CR03-7 | Claude-Review | `MONTE_CARLO_SNAPSHOT_POLICY.currentReference` benennt weiterhin `post-suite-data-02-v1`, obwohl `post-suite-data-05-v1` existiert und der aktive Vergleich gegen `post-backtest-data-03-v1` laeuft | offen (vorbestehend) | ausstehend |
| CR03-8 | Claude-Review | Dritter dauerhaft im Messvertrag verbleibender Selbstschreibpfad `MC_UPDATE_BACKTEST_DATA_03`; das Wachstumsmuster, nicht die Einzelimplementierung, ist das Risiko | offen | ausstehend |
| CR03-9 | Claude-Review | `retrievedAt` meldet fuer `inflation_de` den Verarbeitungstag `2026-07-29` statt des Abrufstands der gepinnten Originale (2026-07-10 beziehungsweise 2025-06) | offen | ausstehend |
| CR03-10 | Claude-Review | Die freigegebene Untergrenze `-15` gilt global im Engine-Inputvertrag, waehrend die Balance-Pfade bei `-10` abweisen; die Divergenz ist dokumentiert, aber nicht aufgeloest, und die Obergrenze `50` bleibt ohne inklusiven Grenztest | ersetzt durch CR03-12 | Nachbesserung loest die Divergenz, aber ausserhalb des Scopes |
| CR03-11 | Claude-Review (Runde 2) | Die Verschaerfung auf `0,06` pp ist nicht trennscharf: in 14 von 75 amtlichen Jahren passiert ein Ein-Tick-Fehler weiterhin; das einzige trennscharfe Fenster ist `[0,049688; 0,050312)`, `0,05` waere vollstaendig trennscharf | offen (Auflage aus CR03-2 nicht geschlossen) | ausstehend |
| CR03-12 | Claude-Review (Runde 2) | Die Untergrenze des Balance-Liveinflationsproviders wurde von `-10` auf `-15` geoeffnet, obwohl das Slice Aenderungen der Balance-Liveprovider ausdruecklich ausschliesst und die Nutzerentscheidung U-02 auf den Engine-Inputvertrag bezogen ist | offen (Blocker) | ausstehend |
| CR03-13 | Claude-Review (Runde 2) | `currentReference` zeigt jetzt auf den `pending`-Kandidaten `post-backtest-data-03-v2`; v1 und v2 unterscheiden sich nur in `snapshotId` und dem eingebetteten Zeiger, wodurch jede Zeigeraenderung einen vollstaendigen neuen unveraenderlichen Snapshot erzwingt | offen | ausstehend |
| CR03-14 | Claude-Review (Runde 2) | Die Waehrungsreform 1948 ist als Splice-Endpunkt qualifiziert, ihre Wirkung auf Geldvermoegen (Umstellung 100:6,50 gegenueber `36,9` Prozent Kaufkraftverlust laut Kette) bleibt unbenannt | geschlossen in Runde 3 | `proxyQualification.monetaryAssetDiscontinuity` mit `93,5` Prozent nominalem Verlust gegenueber `58,5366` / `36,9231` Prozent |
| CR03-15 | Claude-Review (Runde 3) | Balance-Importvertrag (`-15`) und Balance-Anwendungspfad (`-10`) fallen erstmals auseinander; ein importierter Wert zwischen `-15` und `-10` wird angenommen, in das Eingabefeld geschrieben und laesst den jaehrlichen Inflationsschritt scheitern | offen (Auflage vor Slice 04) | ausstehend |
| CR03-16 | Claude-Review (Runde 3) | Der eingefrorene Kandidat traegt weiterhin ein `currentReference`, das im Vergleich geloescht wird und nie gueltig war; `policy` verspricht versionierte Referenzen bei leerem Zeiger | offen (leicht) | ausstehend |

Review und Freigabe bleiben Gemini, Claude oder dem Nutzer vorbehalten.

## Review-Feedback von Claude

**Reviewstand:** 2026-07-29, Arbeitsbaum auf `codex/suite-datenintegritaet-hardening`,
HEAD `289471b`, Slice 03 vollstaendig unversioniert im Arbeitsbaum.
Rolle: adversariales Zweitreview. Der Reviewauftrag nennt ein Gemini-Review
ohne Findings; dieses Ergebnis liegt mir nicht aus erster Hand vor und ist
nicht als Vorpruefung in die eigene Bewertung eingegangen.

### Verifikationsbasis

Alle Zahlen unten sind selbst gemessen, nicht aus dem Abschlussprotokoll
uebernommen.

- Gates unabhaengig nachgefahren: `npm test` 12.440/12.440 Assertions,
  0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles;
  `npm run docs:evidence` gruen; `npm run verify:german-cpi-data` gruen;
  `npm run verify:global-equity-data` gruen; `git diff --check` sauber.
  Die Angaben des Abschlussprotokolls stimmen.
- Eigener Reader fuer XLSX und HTML, unabhaengig vom Generatorcode, direkt
  gegen die gepinnten Originale.
- Eigene Neuberechnung aller 101 Jahreswerte aus JST R6, der Destatis-Langreihe
  und der aktuellen Destatis-Tabelle.
- Fuenf Mutationsproben gegen Generator und Artefakt, jeweils mit
  byteidentischer Wiederherstellung.
- Rueckvergleich gegen die vorherige Reihe aus `git show HEAD:app/simulator/simulator-data.js`.

### 1 Korrektheit

Die Transformation ist rechnerisch richtig. Meine unabhaengige Neuberechnung
aller 101 Werte aus den Originalen trifft das Artefakt mit einer maximalen
Abweichung von **exakt 0**. AK 1, 2 und 3 sind erfuellt: 101 lueckenlose
endliche Werte, 2024 und 2025 jeweils `2,2` Prozent, HICP maschinenlesbar
ausgeschlossen.

AK 5 haelt an allen drei Naehten, nachgerechnet aus den Rohleveln derselben
Reihe:

| Naht | Quellreihe | Level t-1 -> t | abgeleitet | publiziert und verwendet |
| --- | --- | --- | --- | --- |
| 1950 | Frueheres Bundesgebiet, 4-Personen mittleres Einkommen | 28,2 -> 26,4 | -6,383 % | -6,4 % |
| 1963 | Frueheres Bundesgebiet, alle privaten Haushalte | 33,0 -> 34,0 | 3,030 % | 3,0 % |
| 1992 | Deutschland, Verbraucherpreisindex | 61,9 -> 65,0 | 5,008 % | 5,0 % |

Ein echter Quervergleich zweier unabhaengiger Destatis-Veroeffentlichungen
gelingt fuer 2024: Langreihe und aktuelle Tabelle nennen beide Level `119,3`
und Rate `2,2`. Das ist die einzige Stelle der Kette, an der zwei getrennte
Quellen denselben Wert bestaetigen.

**Nicht geprueft, weil nicht pruefbar:** Fuer 1950 bis 2025 uebernimmt die
Kette die publizierte Rate. Meine "unabhaengige" Nachrechnung liest dieselbe
Zelle. Genuin abgeleitet ist nur das Segment 1925 bis 1949. AK 4 ist damit
arithmetisch erfuellt, aber fuer drei Viertel der Reihe eine Identitaet und
keine Kontrolle.

### 2 Vertragstreue

Manifest, Inventar, Datenquellen und Kette tragen konsistent dieselben Hashes
(`rawDataHash 83841d2c...`, `annualRateHash 9ec87b50...`). Die vier Auflagen
aus dem Slice-02-Zweitreview sind nachgemessen erledigt:

- **CR02-14 erledigt.** `verify:global-equity-data` meldet
  "Verified original-to-filtered reconstruction"; `tests/global-equity-source-reconstruction.test.mjs`
  laeuft in der Suite mit.
- **CR02-15 erledigt.** `resolveMinStartYearIndex(annualData, true)` liefert
  jetzt Index 26, Jahr **1951**; zuvor 1950.
- **CR02-16 erledigt.** `docs/reference/DATA_SOURCES.md` benennt das
  Waehrungsreform-Rekonstruktionsartefakt mit `-4,17` pp fuer 1948 und
  `+37,38` pp fuer 1949 ausdruecklich.
- **CR02-13 nur teilweise (CR03-6).** Die Auflage lautete auf einen expliziten
  Periodenvergleich; der ist mit `referenceCaseIdentity` und `assertSamePeriod`
  umgesetzt. Der `inputHash` selbst bleibt aber nicht diskriminierend: In der
  **neuen** Slice-03-Fixture tragen `completed_1960_2020` (1960-2020) und
  `completed_numeraire_seam_1949_1952` (1949-1952) erneut denselben
  `inputHash cb5a7055...`, und `german-cpi-backtest-delta.test.mjs` fuehrt ihn
  weiterhin als Beleg "input should remain unchanged".

Nicht eingehalten ist **AK 4** als Testartefakt. Das ist CR03-1 und der
Blocker dieses Reviews.

### 3 Fehlerbehandlung und Oracle-Haerte

Fuenf Proben, jeweils mit anschliessender Byteidentitaet von Generator
(`1c9c2622f52ec871...`) und Artefakt (`8718166367fcd16e...`):

| Probe | Manipulation | Ergebnis |
| --- | --- | --- |
| A/B | Destatis-Rate 1987 um genau einen publizierten Tick `+0,1` pp verfaelscht | Generator baut **fehlerfrei** durch (rc=0, 1987 wird `0,3` statt `0,2`); der `0,16`-Guard greift **nicht** |
| B | dieselbe Verfaelschung, Artefakt neu gebaut, Rekonstruktionstest | **unbemerkt gruen** |
| B | dieselbe Verfaelschung, Kettentest | erkannt, aber ausschliesslich ueber den handgepflegten `embeddedValueHash` |
| C | Segment 1963-1991 auf den falschen Haushaltstyp umgestellt | Generator blind; erkannt durch den festen Stichwert `1963 == 3` |
| D | Jahreswert im Artefakt haendisch verfaelscht | erkannt ueber die Level-Ketten-Bedingung |
| E | Toleranz von `0,16` auf `0,06` pp verschaerft | Kette bleibt baubar |

Daraus folgen zwei Findings.

**CR03-1 (Blocker) - es gibt kein Oracle fuer die Transformation.**
`tests/german-cpi-source-reconstruction.test.mjs` startet
`build-german-cpi-chain.mjs --verify-only` und vergleicht das Ergebnis mit dem
Artefakt. Ein fehlerhafter Generator reproduziert seinen eigenen Fehler
byteidentisch; Probe B belegt das gemessen. Was den Fehler tatsaechlich
gefangen hat, war der von Hand gepflegte `embeddedValueHash` in
`app/simulator/simulation-data-inventory.js` - genau der Wert, der bei jeder
legitimen Datenaenderung im Normalablauf mitgezogen wird. Slice 02 hatte mit
`independentAnnualReturnRecalculation()` ein zweites, vom Generator getrenntes
Rechenverfahren in der Suite; Slice 03 faellt hinter diesen Stand zurueck,
obwohl AK 4 es ausdruecklich verlangt. Die Werte selbst sind richtig - ich habe
sie nachgerechnet -, die Absicherung fehlt. Die Behebung ist additiv und
erfordert keine Datenaenderung.

**CR03-2 - der Querpruefungs-Guard ist zu locker kalibriert.** Ueber alle 75
amtlichen Jahre betraegt die groesste reale Abweichung zwischen publizierter
Rate und Levelverhaeltnis `0,0497` pp (1987). Der Guard erlaubt `0,16` pp,
also `0,1103` pp ungenutzten Spielraum - **1,10 volle Schritte der publizierten
Nachkommastelle**. Ein um einen Tick falscher Wert in der Destatis-Ratentabelle
passt damit in jedem einzelnen Jahr durch. Probe E zeigt, dass `0,06` pp ohne
jede Aenderung der Kette ausreichen wuerde.

### 4 Seiteneffekte

Der Reihenwechsel ist gross: **75 von 101 Jahren aendern sich.** Wirkung auf
das Preisniveau und damit auf jedes Realergebnis:

| Zeitraum | Preisniveaufaktor alt | neu | Realwerte am Horizont |
| --- | --- | --- | --- |
| 1925-2025 | 9,7958 | 10,2548 | -4,48 % |
| 1925-1950 | 1,3931 | 1,5263 | -8,72 % |
| 1950-2025 | 6,9893 | 6,2889 | +11,14 % |
| 2000-2025 | 1,6608 | 1,6334 | +1,68 % |

Die groessten Einzelaenderungen: 1949 `+8,24` pp, 1942 `-7,89` pp,
1947 `-7,44` pp, 1948 `+7,28` pp, 1925 `+6,88` pp, 1950 `-5,80` pp.

Die Regimeklassifikation bleibt dagegen **unveraendert**: SIDEWAYS 49, BULL 40,
BEAR 6, STAGFLATION 6, identisch mit dem Stand nach Slice 02. Fuenf Jahre
wechseln zwar die `5`-Prozent-Inflationsschwelle (1925, 1942, 1943, 1949,
1992), aber `STAGFLATION` verlangt zusaetzlich `equityPoor`, und alle fuenf
haben positive Aktienrenditen. Bestaetigt durch den unveraenderten
`regimeHash 7d37583a` in beiden Snapshots bei geaendertem
`annualDataHash d30d066 -> e2de8c5d`. Die Formulierung des Delta-Ledgers
("may change in either direction") beschreibt damit eine Moeglichkeit, die
nicht eingetreten ist - das ist korrekt formuliert, nicht ueberzogen.

Der Monte-Carlo-Negativpfad ist reproduziert: `MC_UPDATE_BACKTEST_DATA_03=1`
endet mit Exitcode 1 und `Error: Refusing to overwrite immutable Backtest-Data
Slice 03 V1 candidate`; die Kandidatendatei bleibt bei
`905c7763a488de00...`. **CR03-8** betrifft nicht diese Implementierung, sondern
das Muster: mit `MC_UPDATE_BACKTEST_DATA_03` steht nun der dritte dauerhaft im
Messvertrag verbleibende Selbstschreibpfad, und jeder weitere Slice haengt
einen an.

**CR03-10** betrifft die einzige Engine-Aenderung. Die vom Nutzer freigegebene
Erweiterung auf `-15` gilt global im Inputvertrag, nicht nur fuer historische
Simulationsjahre. `app/balance/balance-annual-inflation.js:19` und
`app/balance/balance-binder-imports.js:66` weisen weiterhin unterhalb `-10`
ab. Ein Wert zwischen `-15` und `-10` wird damit je nach Eintrittspfad
angenommen oder verworfen. Die Nutzerentscheidung deckt die Erweiterung, nicht
die Divergenz. Die neuen Grenztests pruefen `-15` inklusiv und `-15,0001`
abweisend; ein inklusiver Test fuer die Obergrenze `50` fehlt weiterhin.

**CR03-7** (vorbestehend, durch Slice 03 groesser geworden):
`MONTE_CARLO_SNAPSHOT_POLICY.currentReference` nennt `post-suite-data-02-v1`,
obwohl `post-suite-data-05-v1` mit `sliceId SUITE-DATA-05` existiert und der
aktive Vergleich inzwischen gegen `post-backtest-data-03-v1` laeuft;
`tests/monte-carlo-export-contract.test.mjs:183` schreibt den alten Wert fest.

**CR03-9:** Das Inventar meldet `retrievedAt: 2026-07-29` fuer `inflation_de`.
Die gepinnte aktuelle Tabelle traegt im Dateinamen den `2026-07-10`, die
Langreihe den Stand `2025-06`. Das Feld dokumentiert den Verarbeitungstag statt
des Abrufstands.

### 5 Was koennte brechen - die schwaechste Stelle der Reihe

Ich habe das Proxysegment aus den Raten zurueckgerechnet. Normiert auf
1938 := 126 ergibt sich fuer **jedes Jahr von 1925 bis 1948 ein exakter
ganzzahliger Indexstand**: 140, 141, 148, 152, 154, 148, 136, 121, 118, 121,
123, 124, 125, 126, 126, 130, 133, 137, 138, 141, 145, 158, 169, 195. Das JST-
Segment ist ein ganzzahliger Reichsindex auf Basis 1913 = 100.

**1949 ist der einzige nicht ganzzahlige Wert: 208,7186.** Genau das Jahr, das
Codex als Nahtendpunkt waehlt und in `german-cpi-chain.test.mjs:88` mit
`7.035203603123863` als "JST transition endpoint" festschreibt, ist das
einzige, das JST nicht aus dem historischen Index uebernimmt, sondern selbst
ueber die Waehrungsreform verkettet - nach einem Verfahren, das weder in der
Kette noch im Slice-Dokument beschrieben ist.

Die amtliche Alternative aus derselben Destatis-Reihe (Level 1948 `28,5` ->
1949 `28,2`) ergibt `-1,0526` Prozent. Verwendet werden `+7,0352` Prozent.
**Differenz 8,09 pp.** Das Slice-Dokument begruendet, warum die
Destatis-1948-Beobachtung als Halbjahresdurchschnitt nicht verkettbar ist. Es
sagt aber nicht, dass der gewaehlte Ersatzwert
seinerseits ein Splice ist und dass beide verfuegbaren Werte um 8 pp
auseinanderliegen. Der Referenzfall `completed_numeraire_seam_1949_1952` laeuft
genau durch dieses Jahr und weist ein Endvermoegensdelta von `-6.751,78` EUR
aus. Das ist **CR03-3**.

**CR03-4:** Ein Indexpunkt des Proxysegments entspricht `0,48` bis `0,85` pp
Jahresrate (1939: `0,79` pp; 1948: `0,51` pp). Die Werte `1939 = 0,0000` und
`1938 = 0,8000` sehen wie exakte Messungen aus, sind aber Ganzzahlquotienten
mit rund acht- bis sechzehnfach groeberer Aufloesung als das amtliche Segment.
Weder `segments[0]`, noch Manifest, Inventar oder `DATA_SOURCES.md` nennen das.

**CR03-5:** Die Kette weist fuer 1936 bis 1948 kumuliert `+58,5` Prozent aus,
also `36,9` Prozent Kaufkraftverlust. Der zugrunde liegende Index stand unter
der Preisstopverordnung; die Waehrungsreform vom Juni 1948 stellte
Reichsmarkguthaben mit 100:6,50 um. Ein Backtest, der ueber 1948 hinweg
deflationiert, weist Geldvermoegen deshalb real weitgehend erhalten aus. Fuer
die Aktienreihe hat Codex das spiegelbildliche Artefakt auf Auflage CR02-16 hin
ausdruecklich dokumentiert; fuer die Preisreihe fehlt das Pendant. Kein
Vertragsbruch - das Segment ist als `proxy` deklariert und wird beim Ausschluss
geschaetzter Historie entfernt -, aber die auffaelligste unausgesprochene
Grenze dieser Reihe.

### Verworfene Hypothesen

Folgende Verdachtsmomente habe ich geprueft und **widerlegt**; sie sind keine
Findings:

- Die Kette verwende an einer Naht zwei verschiedene Indexreihen fuer eine
  Jahresrate (widerlegt, alle drei Naehte aus den Rohleveln nachgerechnet).
- Der 2025er HTML-Parser koenne einen Tausenderpunkt falsch lesen (widerlegt,
  Werte liegen bei 121,9 und werden zusaetzlich hart gepinnt).
- Die Verkettung publizierter Ein-Nachkommastellen-Raten treibe eine
  nennenswerte Drift gegen die amtlichen Levelverhaeltnisse (gemessen:
  `+0,074` % fuer 1950-1962, `-0,290` % fuer 1963-1991, `-0,128` % fuer
  1992-2024; klein und als Restrisiko gefuehrt, kein Finding).
- Die 1992er Rate `5,0` kippe wegen der strikten `>`-Schwelle eine
  Regimeklassifikation (widerlegt: `equityPoor` ist 1992 nicht erfuellt,
  Regime bleibt SIDEWAYS in beiden Varianten).
- Der Ausschluss geschaetzter Historie greife nach der Slice-02-Auflage
  erneut daneben (widerlegt, Grenze liegt bei 1951).
- Das Artefakt oder die Originale seien nicht reproduzierbar (widerlegt,
  beide `verify`-Gates gruen, alle drei Quellhashes bestaetigt).
- `dist/` oder die EXE seien mitgezogen worden (widerlegt).

### Findings-Lifecycle

- Aus Slice 02 uebernommen: CR02-14, CR02-15, CR02-16 **geschlossen**;
  CR02-13 **teilweise geschlossen**, Rest als CR03-6 fortgefuehrt.
- Neu eingefuehrt: CR03-1 (Blocker), CR03-2 bis CR03-5 (Auflagen),
  CR03-6 bis CR03-10 (Restfindings).
- Unveraendert offen aus Slice 02: CR02-10, CR02-17 (zu den bereits
  weiterverbreiteten CC-BY-NC-SA-Originalen kommen jetzt 688 kB
  Destatis-Material unter Datenlizenz Deutschland hinzu: XLSX 486 kB,
  HTML 202 kB), CR02-18 (siehe CR03-8).

### Pre-Mortem

> Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
> Produktivbetrieb - was ist die wahrscheinlichste Ursache?

Ein Folgeslice aktualisiert die Destatis-Langreihe auf einen neueren Stand
oder korrigiert eine Segmentgrenze, zieht `rawDataHash` und `embeddedValueHash`
im Normalablauf mit und veroeffentlicht damit einen Transformationsfehler. Weil
das einzige Rekonstruktionsgate denselben Generator erneut ausfuehrt, bleibt
die Suite gruen; weil der Querpruefungs-Guard einen vollen publizierten Tick
durchlaesst, faellt auch eine Abweichung von `0,1` pp nicht auf. Der Fehler
wirkt sich nicht auf Nominalwerte aus, sondern nur auf die reale
Deflationierung - also auf genau die Kennzahl, die niemand gegen eine externe
Referenz haelt.

Zweitwahrscheinlich: Jemand liest den Wert `1949 = 7,04 Prozent` als
historische Aussage ueber die deutsche Teuerung, obwohl er ein
undokumentierter JST-Splice ueber die Waehrungsreform ist und die amtliche
Alternative `-1,05` Prozent lautet.

## Review-Ergebnis (Claude)

- **Status: blockiert**
- **Blocker:**
  - **CR03-1** - AK 4 ("unabhaengige Vollnachrechnung") ist nicht umgesetzt.
    Das gelieferte Rekonstruktionsgate fuehrt denselben Generator erneut aus
    und kann Transformationsfehler grundsaetzlich nicht erkennen; Probe B
    belegt das gemessen. Die Werte selbst sind korrekt - meine unabhaengige
    Nachrechnung aller 101 Jahre trifft das Artefakt mit Abweichung 0 -, die
    Behebung ist additiv und erfordert keine Datenaenderung.
- **Auflagen vor dem Commit:** CR03-2 (Guard auf hoechstens `0,06` pp
  verschaerfen), CR03-3 (1949er Splice und die 8,09-pp-Alternative
  dokumentieren), CR03-4 (Quantisierung des Proxysegments deklarieren),
  CR03-5 (Preisstopp und Waehrungsreform benennen, analog zu CR02-16).
- **Auflagen vor Slice 04:** CR03-6, CR03-7, CR03-9.
- **Restrisiken:**
  - CR03-8 und CR03-10 sowie die aus Slice 02 uebernommenen CR02-10, CR02-17.
  - Rundungsdrift der aus publizierten Raten verketteten Reihe gegen die
    amtlichen Levelverhaeltnisse (`+0,074` %, `-0,290` %, `-0,128` % je
    Segment).
  - Der HTML-Parser fuer 2025 haengt an den festen `div`-Kennungen `236128`
    und `236130`; der Destatis-Selektor haengt an einem bedeutungstragenden
    Leerzeichen am Ende von `Preisindex fuer die Lebenshaltung `. Beide
    Bindungen sind fail-closed, aber beim naechsten Datenstand faellig.
  - Der Konzeptwechsel 1991 (West, `3,7` %) auf 1992 (Gesamtdeutschland,
    `5,0` %) bleibt eine Populationsgrenze innerhalb einer als kanonisch
    gefuehrten Reihe.
  - Die globale Ausschlussgrenze folgt mit 1925-1950 der Aktienreihe, das
    VPI-Proxysegment endet 1949; ein amtliches Jahr wird also mit
    ausgeschlossen. Konservativ, aber die beiden Reihen sind nicht mehr durch
    dieselbe Grenze beschrieben.
- **Pre-Mortem:** siehe oben - stiller Transformationsfehler bei der naechsten
  Datenaktualisierung, unentdeckt, weil das Rekonstruktionsgate den Generator
  gegen sich selbst prueft und der Querpruefungs-Guard einen vollen
  publizierten Tick durchlaesst.

Kopfzeile, `**Status:**` und `**Freigabe:**` dieses Dokuments sind durch dieses
Review nicht veraendert worden.

## Codex-Nachbesserung auf das Claude-Review

**Umgesetzt am:** 2026-07-29  
**Status:** alle Findings CR03-1 bis CR03-10 technisch nachgebessert;
externes Re-Review ausstehend  
**Freigabe:** unveraendert ausstehend; Codex nimmt keine Selbstfreigabe vor

Der vorstehende Claude-Reviewtext blieb unveraendert. Die nachfolgenden
Antworten dokumentieren ausschliesslich die Implementierung auf seine
Findings.

| Finding | Technische Antwort | Nachweis |
| --- | --- | --- |
| CR03-1 | Das bisherige Selbstvergleichsgate bleibt als schreibfreier Produktionscheck erhalten, ist aber nicht mehr das Oracle. `german-cpi-source-reconstruction.test.mjs` besitzt jetzt einen eigenen ZIP-/XLSX-/HTML-Reader, eigene Segmentselektoren und eine getrennte Vollrechnung aller 101 Jahresraten direkt aus den drei gepinnten Originalen. Der Test importiert oder startet fuer diese Vollrechnung den Generator nicht. | 101/101 Raten stimmen mit hoechstens `1e-12` Abweichung; der zusaetzliche Produktionslauf prueft danach nur noch Reproduzierbarkeit und Schreibfreiheit. |
| CR03-2 | Der Querpruefungs-Guard wurde von `0,16` auf `0,06` Prozentpunkte verschaerft und als `validation.publishedRateVsRoundedLevelTolerancePp` im Artefakt exponiert. | Die unabhaengige Vollrechnung misst den realen Maximalabstand mit rund `0,0497` pp und verlangt explizit `> 0,049` sowie `<= 0,06`. |
| CR03-3 | Der 1949er JST-Endpunkt ist jetzt als Waehrungsreform-Splice maschinenlesbar qualifiziert. Die ausgewaehlten `+7,0352` % werden der aus den Destatis-Leveln `28,5 -> 28,2` abgeleiteten Alternative `-1,0526` % gegenuebergestellt. | `proxyQualification.historicalDiscontinuities` dokumentiert die Differenz von `8,0878` pp; Ketten- und Oracle-Test pinnen Berechnung und Metadaten. |
| CR03-4 | Die Proxyquantisierung ist in Kette, Manifest, Inventar und Datenquellendokumentation deklariert. Normiert auf `1938=126` ergeben 1925-1948 ganzzahlige Staende; 1949 bleibt mit `208,7186` der nicht ganzzahlige Splice-Endpunkt. | Das Artefakt weist eine implizite Ein-Punkt-Aufloesung von rund `0,48` bis `0,85` pp aus; der unabhaengige Test rekonstruiert die normierten Ganzzahlstaende. |
| CR03-5 | Preisstop-/Kriegsphase 1936-1948 und Waehrungsreform 1948/1949 sind nun in Artefakt, Manifest, Inventar und Referenzdokumentation ausdruecklich benannt. | Die Dokumentation warnt explizit davor, die Proxyreihe als unbeschraenkten Marktpreisprozess oder amtliche 1949er VPI-Aussage zu lesen. |
| CR03-6 | `inputHash` umfasst jetzt die normalisierten Inputs **und** `{startYear, endYear, requestedYears}`. | `completed_1960_2020` traegt `3a08ea0c...`, `completed_numeraire_seam_1949_1952` `d2b24432...`; eine Eindeutigkeitsassertion blockiert erneute Kollisionen der positiven Referenzfaelle. |
| CR03-7 | `MONTE_CARLO_SNAPSHOT_POLICY.currentReference` verweist auf den aktiven Nachbesserungskandidaten `post-backtest-data-03-v2`. Der ungepruefte V1-Kandidat bleibt unveraendert erhalten. | Export- und Messvertrag pinnen V2 als aktive Referenz; `reviewStatus` bleibt `pending`. |
| CR03-8 | Die beiden slicespezifischen Variablen und Schreibzweige wurden durch genau einen generischen Pfad `MC_UPDATE_REFERENCE=<snapshotId>` ersetzt. | Eine gemeinsame Kandidatenmap, eine Existenz-/Overwrite-Sperre und ein Schreibblock bedienen alle zugelassenen Referenzen. |
| CR03-9 | Das Inventar nennt fuer `inflation_de` jetzt den neuesten gepinnten Quellenstand `2026-07-10`. Die Kette fuehrt zusaetzlich je Quelldatei `dataAsOf`: Destatis-Langreihe `2025-06`, aktuelle Tabelle `2026-07-10`, JST `R6`. | Inventar- und Kettentests pruefen die weiter gepinnten Quellhashes; Datenquellendokumentation nennt beide Destatis-Staende. |
| CR03-10 | Balance-Jahresinflation und Balance-Importvertrag wurden an den zentralen Bereich `-15` bis `50` angeglichen. | Engine prueft `-15` und `50` inklusiv sowie Werte ausserhalb abweisend; Balance prueft beide inklusiven Grenzen und der Import-Roundtrip erhaelt beide Werte. |

### Revalidierung nach der Nachbesserung

- `npm run build:german-cpi-data`: gruen; Datenhashes unveraendert
  (`rawDataHash 83841d2c...`, `annualRateHash 9ec87b50...`,
  `indexLevelHash e752e21c...`).
- `npm run verify:german-cpi-data`: gruen und schreibfrei.
- `npm run verify:global-equity-data`: gruen und schreibfrei.
- `npm run build:engine`: gruen ueber den dokumentierten Fallback-Wrapper.
- Gezielte Gates fuer unabhaengige VPI-Rekonstruktion, Kette, Backtestdeltas,
  periodengebundene Inputidentitaet, Balance-Grenzen, Manifest/Inventar,
  Monte-Carlo-Messvertrag, Exportvertrag und Suite-Traceability: gruen.
- Erster Vollsuite-Zwischenlauf: genau eine erwartete Sperre am veralteten
  Git-Blob-Hash des periodengebunden neu erzeugten Backtesttargets. Der
  deklarierte Backtest-Data-03-Nachweis und der Ledger-Hash wurden
  fortgeschrieben.
- Abschliessend `npm test`: **13.293 / 13.293 Assertions gruen**,
  144 Testdateien, kein fehlgeschlagenes File, keine offenen Handles.

### Re-Review-Uebergabe

CR03-1 bis CR03-10 sind aus Implementierungssicht beantwortet. Diese
Dokumentation aendert Claudes Status nicht rueckwirkend und erteilt keine
Freigabe. Slice 03 wartet auf das externe Re-Review.

## Zweitreview von Claude (Runde 2)

**Reviewstand:** 2026-07-29, Arbeitsbaum auf `codex/suite-datenintegritaet-hardening`,
HEAD unveraendert `289471b`, Slice 03 weiterhin unversioniert im Arbeitsbaum.
Der Runde-1-Reviewtext ist unveraendert; die Entscheidungsspalten meiner
Findings wurden nicht von Codex befuellt. Die Kopfzeile `**Status:**` hat Codex
auf den eigenen Umsetzungsstand fortgeschrieben, die Freigabezeile nicht
angefasst.

### Nachgemessene Gates

- `npm test`: **13.293 / 13.293 Assertions**, 0 fehlgeschlagene Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles. Deckt sich mit der Angabe von
  Codex.
- `npm run docs:evidence`, `npm run verify:german-cpi-data`,
  `npm run verify:global-equity-data`: gruen und schreibfrei.
- `git diff --check`: sauber.
- Datenlage unveraendert: `annualRateHash 9ec87b50...`,
  `indexLevelHash e752e21c...`, `rawDataHash 83841d2c...` identisch mit
  Runde 1; die Aktienkette bleibt bei `c2b754e4...`. Die Nachbesserung hat
  **keinen einzigen Jahreswert** veraendert. Alle Proben wurden mit
  byteidentischer Wiederherstellung abgeschlossen (`3018ff7a...`,
  `b96e37b4...`).

### CR03-1 - geschlossen, gegen zwei Mutationen gemessen

`tests/german-cpi-source-reconstruction.test.mjs` hat jetzt einen eigenen
ZIP-, XLSX- und HTML-Reader und rechnet alle 101 Jahresraten selbst aus den
drei gepinnten Originalen. Der Generator wird fuer die Rechnung weder
importiert noch gestartet; der Produktionslauf ist auf Test 4 als reiner
Schreibfreiheitscheck isoliert.

Ich habe das Oracle in beiden Segmenten angegriffen:

| Mutation | Guardlage | Ergebnis |
| --- | --- | --- |
| JST-Proxyjahr 1935 um `0,05` pp verfaelscht (dieses Segment hat gar keinen Guard) | Generator baut durch, rc=0 | **erkannt**: `1935 should equal the independent source oracle` |
| Amtliches Jahr 1987 um einen publizierten Tick verfaelscht | Guard greift nicht (siehe CR03-11) | **erkannt**: `1987 should equal the independent source oracle` |

Damit ist der Runde-1-Blocker erledigt. Das war der Kern der Nachbesserung.

### CR03-11 (neu, ersetzt CR03-2) - der Guard ist verschaerft, aber weiterhin nicht trennscharf

Die Toleranz wurde von `0,16` auf `0,06` pp gesenkt und als
`validation.publishedRateVsRoundedLevelTolerancePp` exponiert. Die Begruendung
der Nachbesserung - der reale Maximalabstand liege bei `0,0497` pp, also
verlange man `> 0,049` und `<= 0,06` - kalibriert den Wert, belegt aber keine
Erkennungsleistung. Gemessen ueber alle 75 amtlichen Jahre:

- groesster echter Abstand zwischen abgeleiteter und publizierter Rate:
  `0,049688` pp (1987);
- kleinster Abstand, den ein Ein-Tick-Fehler von `0,1` pp erzeugt:
  `0,050312` pp (ebenfalls 1987, weil die abgeleitete Rate dort fast exakt
  zwischen zwei publizierbaren Ticks liegt);
- vollstaendig trennscharf ist damit ausschliesslich das Fenster
  **[`0,049688`; `0,050312`)** mit einer Breite von `0,000624` pp.

`0,06` liegt oberhalb dieses Fensters. Praktische Folge, gemessen: **in 14 von
75 Jahren passiert ein Ein-Tick-Fehler den Guard weiterhin unbemerkt**
(1954, 1956, 1959, 1964, 1966, 1982, 1987, 1988, 1994, 1997, 2000, 2004, 2009
und 2011). Die Probe bestaetigt es am laufenden System: mit `+0,1` pp auf
1987 baut der Generator mit rc=0 durch.

`0,05` waere vollstaendig trennscharf - alle echten Werte passieren, jeder
Ein-Tick-Fehler wird erkannt. Der neue Test pinnt statt dessen `<= 0,06` und
zementiert damit genau den nicht trennscharfen Wert.

Einordnung: Das unabhaengige Oracle faengt einen Generatorfehler in diesen
Jahren ab. Es faengt aber nicht ab, wogegen dieser Guard gerichtet ist,
naemlich eine Inkonsistenz **innerhalb der Destatis-Quelle** zwischen
Raten- und Leveltabelle - denn das Oracle liest dieselbe publizierte Rate.
Die Luecke ist also nicht durch CR03-1 kompensiert.

### CR03-12 (neu, ersetzt CR03-10, Blocker) - der Balance-Liveprovider wurde ausserhalb des Scopes gelockert

CR03-10 hat die Divergenz zwischen Engine (`-15`) und Balance (`-10`)
benannt und als Restrisiko gefuehrt. Die Nachbesserung loest sie auf, indem
sie die Balanceseite oeffnet:

- `app/balance/balance-annual-inflation.js:19`: `INFLATION_RATE_MIN`
  von `-10` auf `-15`.
- `app/balance/balance-binder-imports.js:66`: Importschema
  `inflation` von `min: -10` auf `min: -15`.

Die zweite Aenderung ist sachlich begruendbar: ein Export-/Import-Roundtrip
soll keinen Wert verlieren, den die Engine akzeptiert. Die erste ist es nicht.
Der Modulkopf beschreibt `balance-annual-inflation.js` als
"Fetches one validated calendar-year inflation value and applies it atomically
to Balance needs"; `assertInflationRate` ist die Plausibilitaetsschranke fuer
den **live abgerufenen** Wert, dessen Quellenliste ausdruecklich
`ecb / ECB (HICP)` enthaelt. Der akzeptierte Bereich fuer eine live gezogene
Verbraucherpreisrate wurde damit nach unten geoeffnet, obwohl:

1. das Slice-Dokument unter **Nicht im Scope** ausdruecklich
   "Aenderung der Live-Inflationsprovider der Balance-App" fuehrt;
2. die dokumentierte Nutzerentscheidung **U-02** auf
   "Engine-Untergrenze erweitern" lautet und im Abschlussprotokoll
   ausdruecklich auf "den zentralen Engine-Inputvertrag, der fuer historische
   Simulationsjahre benoetigt wird" bezogen ist;
3. der fachliche Anlass - die JST-Reichsindexrate von `-11,03` Prozent fuer
   1932 - diesen Codepfad nie erreicht. Ein Wert zwischen `-15` und `-10`
   aus einem Liveprovider waere ein Datenfehler, kein historischer Messwert,
   und wurde bis zu dieser Aenderung als solcher zurueckgewiesen;
4. der abgerufene Wert laut Modulzweck **atomar auf die Bedarfe des Nutzers
   angewendet** wird.

Die Nachbesserung hat damit eine Verteidigungslinie in einem
nutzerseitig wirksamen Livepfad entfernt, um eine von mir als Restrisiko
gefuehrte Inkonsistenz zu schliessen, die ich nicht zur Aenderung
ausgeschrieben hatte. Die naheliegende Alternative - die Divergenz als
gewollt dokumentieren, weil die historische Reihe diesen Pfad nie durchlaeuft,
und nur das Importschema angleichen - haette beide Vertraege erhalten.

Dies ist eine Scope- und Autorisierungsfrage, keine rein technische. Sie
gehoert vor der Uebernahme zurueck an den Nutzer.

### CR03-13 (neu, ersetzt CR03-7) - der Zeiger zeigt jetzt auf einen ungeprueften Kandidaten und erzeugt einen Versionslauf

`MONTE_CARLO_SNAPSHOT_POLICY.currentReference` verweist jetzt auf
`post-backtest-data-03-v2`. Dieser Snapshot traegt `reviewStatus: pending`,
und der Messvertrag verlangt an anderer Stelle ausdruecklich, dass Codex
eigene Snapshots nicht als geprueft markiert. Ein oeffentliches Vertragsfeld
benennt damit als aktuelle Referenz ein Artefakt, dessen eigener Vertrag
festhaelt, dass es ungeprueft ist.

Der Weg dorthin ist zirkulaer. Ich habe `post-backtest-data-03-v1` und `-v2`
feldweise verglichen: sie unterscheiden sich in **genau zwei Feldern**,
`snapshotId` und dem eingebetteten
`result.contracts.snapshotPolicy.currentReference`. Alle Rechenergebnisse
sind identisch. Die Zeigeraenderung hat also einen vollstaendigen neuen
unveraenderlichen Snapshot erzwungen, der den neuen Zeiger auf sich selbst
enthaelt. Jede kuenftige Zeigeraenderung wiederholt das. `-v1` bleibt als
toter Ballast erhalten und wird nur noch von einer einzigen Assertion
beruehrt, die seine Unveraendertheit bestaetigt.

### CR03-14 (neu, Rest aus CR03-5) - die Waehrungsreform ist qualifiziert, aber nicht in ihrer Wirkung benannt

`proxyQualification.historicalDiscontinuities` benennt jetzt die Preisstopp-
und Kriegsphase 1936-1948 mit der Auslegung, dass nahezu unveraenderte
Messwerte kein freier Marktpreisprozess sind, und den 1949er Wert als
Splice-Endpunkt. Was weiterhin fehlt, ist der Grund, aus dem die Reihe als
Deflator fuer Geldvermoegen ueber 1948 hinweg irrefuehrend bleibt: die
Umstellung der Reichsmarkguthaben mit 100:6,50. Die Kette weist fuer
1936-1948 kumuliert `+58,5` Prozent aus, also `36,9` Prozent
Kaufkraftverlust; der nominale Verlust auf Geldvermoegen betrug rund
`93,5` Prozent. Diese Groessenordnung steht nirgends.

### Geschlossene Findings, nachgemessen

- **CR03-3 geschlossen.** `proxyQualification.historicalDiscontinuities`
  enthaelt `selectedJstRatePct 7.035203603123863`, die amtliche Alternative
  `-1.0526315789473717` aus den Leveln `28,5 -> 28,2` und
  `differencePp 8.087835182071235`. Das sind exakt die Werte, die ich in
  Runde 1 unabhaengig gemessen hatte.
- **CR03-4 geschlossen.** Das Artefakt fuehrt Normierung `1938 = 126`,
  ganzzahliges Levelfenster 1925-1948, den nicht ganzzahligen Splice-Endpunkt
  `208.71864710701823` und die Aufloesungsspanne `0,4791` bis `0,8475` pp -
  deckungsgleich mit meiner Rekonstruktion.
- **CR03-6 geschlossen.** Der `inputHash` umfasst jetzt Zeitraum und
  angeforderte Jahre. In beiden Deltafixtures: **0 Kollisionen** bei 7 Faellen;
  `completed_1960_2020` traegt `3a08ea0c...`, `completed_numeraire_seam_1949_1952`
  `d2b24432...`.
- **CR03-8 geschlossen.** Der generische Schreibpfad ist nicht maechtiger als
  die beiden vorherigen. Gemessen: `pre-hardening-v1`, `post-slice-03-v1`,
  `post-suite-data-02-v1` und `post-backtest-data-03-v1` werden mit
  `Unsupported MC_UPDATE_REFERENCE target` abgewiesen (Exitcode 1);
  `post-backtest-data-03-v2` mit
  `Refusing to overwrite immutable Monte Carlo candidate`. Kein Fixture wurde
  geschrieben.
- **CR03-9 geschlossen.** Inventar meldet fuer `inflation_de` jetzt
  `2026-07-10`; die Kette fuehrt zusaetzlich je Quelldatei `dataAsOf`
  (`2025-06`, `2026-07-10`, JST `R6`).

### Verworfene Hypothesen (Runde 2)

Geprueft und **widerlegt**:

- Der generische Schreibpfad koenne jetzt einen historischen unveraenderlichen
  Snapshot ueberschreiben (widerlegt, vier Zielkennungen abgewiesen).
- Die Nachbesserung habe Jahreswerte veraendert (widerlegt, alle drei
  Datenhashes identisch mit Runde 1).
- Das neue Oracle importiere oder starte den Generator fuer die Rechnung
  (widerlegt, Spawn ausschliesslich in Test 4).
- Das Oracle decke nur das Proxysegment ab (widerlegt, 1987 wird erkannt).
- `-v2` sei wegen geaenderter Rechenergebnisse noetig geworden (widerlegt,
  Unterschied ausschliesslich in zwei Metadatenfeldern).
- Die Aktienkette sei mitgezogen worden (widerlegt, `c2b754e4...`
  unveraendert).
- Codex habe eigene Entscheidungsspalten befuellt oder die Freigabezeile
  angefasst (widerlegt).

### Findings-Lifecycle

- **Geschlossen:** CR03-1 (Blocker aus Runde 1), CR03-3, CR03-4, CR03-6,
  CR03-8, CR03-9.
- **Fortgefuehrt:** CR03-2 nicht geschlossen, ersetzt durch **CR03-11**;
  CR03-7 ersetzt durch **CR03-13**; CR03-10 ersetzt durch **CR03-12**;
  CR03-5 weitgehend geschlossen, Rest als **CR03-14**.
- **Neu eingefuehrt:** CR03-11, CR03-12 (Blocker), CR03-13, CR03-14.
- **Unveraendert offen aus Slice 02:** CR02-10, CR02-17.

### Pre-Mortem (Runde 2)

> Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
> Produktivbetrieb - was ist die wahrscheinlichste Ursache?

Ein Inflationsprovider der Balance-App liefert nach einer Umstellung seiner
Reihe oder einer Vorzeichenkonvention einen Wert um `-12` Prozent. Bis zu
dieser Nachbesserung haette die Plausibilitaetsschranke ihn zurueckgewiesen;
jetzt wird er akzeptiert und atomar auf die Bedarfe des Nutzers angewendet.
Der Fehler ist nicht auffaellig, weil er als "erweiterte historische
Deflation" begruendet in der Datei steht - obwohl er mit historischer
Deflation nichts zu tun hat.

Zweitwahrscheinlich: Eine kuenftige Destatis-Ausgabe enthaelt in einem der
14 identifizierten Jahre eine um einen Tick abweichende publizierte Rate. Der
`0,06`-Guard laesst sie durch, das unabhaengige Oracle kann sie
konstruktionsbedingt nicht sehen, und der Wert wandert unbemerkt in den
Deflator.

## Review-Ergebnis (Claude, Runde 2)

- **Status: blockiert**
- **Blocker:**
  - **CR03-12** - Die Untergrenze des Balance-Liveinflationsproviders
    (`app/balance/balance-annual-inflation.js:19`) wurde von `-10` auf `-15`
    geoeffnet. Das Modul validiert einen live abgerufenen Wert und wendet ihn
    atomar auf die Bedarfe des Nutzers an. Das Slice-Dokument fuehrt
    Aenderungen der Balance-Liveprovider ausdruecklich unter "Nicht im Scope",
    die Nutzerentscheidung U-02 ist auf den zentralen Engine-Inputvertrag
    bezogen, und der fachliche Anlass erreicht diesen Codepfad nie. Das ist
    eine Nutzerentscheidung, keine Implementierungsfrage. Die parallele
    Angleichung des Importschemas
    (`app/balance/balance-binder-imports.js:66`) ist davon nicht betroffen und
    sachlich begruendbar.
- **Nicht geschlossene Auflage:** **CR03-11** - `0,06` pp liegt oberhalb des
  einzigen trennscharfen Toleranzfensters `[0,049688; 0,050312)`; in 14 von
  75 amtlichen Jahren passiert ein Ein-Tick-Fehler weiterhin unbemerkt.
  `0,05` waere vollstaendig trennscharf. Der Test pinnt derzeit `<= 0,06`.
- **Auflagen vor Slice 04:** CR03-13, CR03-14.
- **Restrisiken:** CR02-10 und CR02-17 unveraendert; die in Runde 1
  aufgefuehrten Restrisiken (Rundungsdrift, HTML- und Selektorbindung,
  Konzeptwechsel 1991/1992, Ausschlussgrenze 1950 gegenueber Proxyende 1949)
  bestehen unveraendert fort.
- **Pre-Mortem:** siehe oben - akzeptierter Datenfehler eines
  Liveinflationsproviders, der bis zu dieser Nachbesserung abgewiesen worden
  waere.

Ausdruecklich festgehalten: Der Runde-1-Blocker CR03-1 ist erledigt, und die
Nachbesserung hat keinen einzigen Jahreswert der Kette veraendert. Kopfzeile
und Freigabezeile dieses Dokuments sind durch dieses Zweitreview nicht
veraendert worden.

## Codex-Nachbesserung auf das Claude-Zweitreview (Runde 2)

**Umgesetzt am:** 2026-07-29  
**Status:** CR03-11 bis CR03-14 technisch nachgebessert; externes Re-Review
ausstehend  
**Freigabe:** unveraendert ausstehend; Codex nimmt keine Selbstfreigabe vor

Der vorstehende Claude-Reviewtext blieb unveraendert. Die nachfolgenden
Antworten dokumentieren ausschliesslich die Implementierung auf die vier
Runde-2-Findings.

| Finding | Technische Antwort | Nachweis |
| --- | --- | --- |
| CR03-11 | Der Destatis-Raten-/Level-Guard wurde von `0,06` auf `0,05` Prozentpunkte gesetzt. Das unabhaengige Oracle misst neben dem groessten echten Rundungsabstand nun fuer jeden amtlichen Cross-Check beide moeglichen Ein-Tick-Mutationen von `+0,1` und `-0,1` Prozentpunkten. | Der groesste echte Abstand von rund `0,049688` pp passiert. Der kleinste Abstand nach einer Ein-Tick-Mutation liegt oberhalb `0,05` pp. Alle 76 amtlichen Cross-Checks 1950-2025 sind im Trennschaerfenachweis enthalten; keine Ein-Tick-Mutation passiert den Guard. |
| CR03-12 | Die ausserhalb des Slice-Scopes vorgenommene Oeffnung des Balance-Livepfads wurde zurueckgenommen: `balance-annual-inflation.js` akzeptiert wieder ausschliesslich `-10` bis `50`. Der davon getrennte historische Engine-Inputvertrag bleibt wie von U-02 entschieden bei `-15` bis `50`; das Importschema bleibt fuer einen verlustfreien Engine-/Export-Roundtrip ebenfalls bei `-15` bis `50`. | Der Livepfad prueft `-10` und `50` inklusiv und weist `-10,1` sowie `50,1` ab. Der Importtest erhaelt weiterhin `-15` und `50` inklusiv. `DATA_SOURCES.md` beschreibt die drei getrennten Vertraege ausdruecklich. |
| CR03-13 | Ein `pending`-Kandidat wird nicht mehr als aktuelle Referenz ausgegeben. `MONTE_CARLO_SNAPSHOT_POLICY.currentReference` ist bis zu einer externen Freigabe explizit `null`. `post-backtest-data-03-v1` bleibt der einzige Slice-03-Messkandidat und wird nur im Delta-Ledger gefuehrt. Der ausschliesslich durch die Zeigeraenderung entstandene V2-Doppelgaenger wurde entfernt. Der veraenderliche Referenzzeiger ist zudem kein Bestandteil der eingefrorenen Ergebnisprojektion mehr. | Exportvertrag prueft `currentReference: null`; der Messvertrag verlangt, dass der aktive Messkandidat `pending` bleibt. Delta-Ledger und Traceability zeigen wieder auf V1. Eine reine spaetere Zeigeraenderung veraendert damit keine eingefrorene Finanz-/Ergebnisprojektion und erzeugt keinen Folgesnapshot. |
| CR03-14 | Die Proxyqualifikation enthaelt jetzt eine eigene maschinenlesbare Geldvermoegensdiskontinuitaet. Fuer grosse Bar- und Bank-/Sparguthaben werden `100 RM -> 6,50 DM` und `93,5` % nominaler Verlust dem CPI-Proxy 1936-1948 (`+58,5366` % Preisniveau beziehungsweise `36,9231` % impliziter Kaufkraftverlust) gegenuebergestellt. | Artefakt, Manifest, Inventar und Referenzdokumentation stellen klar, dass der CPI-Proxy nicht den nominalen Guthabenschnitt abbildet und kein durchgehender Geldvermoegensdeflator ueber 1948 ist. Institutioneller Beleg: [Deutsche Bundesbank, Waehrungsreform 1948](https://www.bundesbank.de/de/aufgaben/themen/waehrungsreform-1948-614040). |

### Technische Revalidierung der Runde-2-Nachbesserung

- `npm run build:german-cpi-data`: gruen; die 101 Jahreswerte und ihre
  Datenhashes bleiben unveraendert.
- `npm run verify:german-cpi-data`: gruen und schreibfrei.
- `npm run verify:global-equity-data`: gruen und schreibfrei.
- Gezielte Gates fuer Balance-Livegrenzen, Balance-Import, unabhaengige
  VPI-Rekonstruktion, VPI-Kette, Manifest, Inventar, Monte-Carlo-Export,
  Monte-Carlo-Messvertrag und Suite-Traceability: gruen.
- `npm run docs:evidence`: gruen.
- Abschliessend `npm test`: **13.303 / 13.303 Assertions gruen**,
  144 Testdateien, kein fehlgeschlagenes File und keine offenen Handles.

### Re-Review-Uebergabe Runde 2

CR03-11 bis CR03-14 sind aus Implementierungssicht beantwortet. Der
Runde-1-Oracle-Blocker CR03-1 bleibt geschlossen. Diese Dokumentation aendert
Claudes Reviewentscheidung nicht rueckwirkend und erteilt keine Freigabe.
Slice 03 wartet weiterhin auf das externe Re-Review.

## Drittreview von Claude (Runde 3)

**Reviewstand:** 2026-07-29, Arbeitsbaum auf `codex/suite-datenintegritaet-hardening`,
HEAD unveraendert `289471b`. Der Runde-1- und Runde-2-Reviewtext ist
unveraendert; die Entscheidungsspalten meiner Findings hat Codex nicht
befuellt, die Freigabezeile nicht angefasst.

### Nachgemessene Gates

- `npm test`: **13.303 / 13.303 Assertions**, 0 fehlgeschlagene Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles. Deckt sich mit der Angabe von
  Codex.
- `npm run docs:evidence`, `npm run verify:german-cpi-data`,
  `npm run verify:global-equity-data`: gruen und schreibfrei.
- `git diff --check`: sauber.
- Datenlage weiterhin unveraendert: `rawDataHash 83841d2c...`,
  `annualRateHash 9ec87b50...`, `indexLevelHash e752e21c...` identisch mit
  Runde 1 und 2; Aktienkette unveraendert `c2b754e4...`. Auch diese
  Nachbesserung hat keinen Jahreswert beruehrt.
- Alle Proben mit byteidentischer Wiederherstellung abgeschlossen
  (`ea11844a...`, `ff67229b...`).

### CR03-11 - geschlossen, gegen vier Mutationen gemessen

Die Toleranz steht auf `0,05` pp und wird an beiden Stellen verwendet: im
Ratensegment (`validatePublishedRate`) **und** in der separaten
2025-Querpruefung, die in Runde 2 noch fest auf `0,16` stand. Damit sind alle
76 amtlichen Cross-Checks 1950-2025 abgedeckt. Eigene Nachrechnung: `0,05`
liegt im einzigen trennscharfen Fenster `[0,049688; 0,050312)`; fuer 2025
betraegt der Abstand nach einem Ein-Tick-Fehler `0,0794` pp und liegt damit
ebenfalls oberhalb.

| Probe | Ergebnis |
| --- | --- |
| amtliche Rate 1987 `+0,1` pp (schlechtester Fall aus Runde 2) | Build rc=1, `Published Destatis rate is inconsistent with the rounded index levels` |
| amtliche Rate 1987 `-0,1` pp (Gegenrichtung) | Build rc=1, dieselbe Meldung |
| 2025-Rate `+0,1` pp mit deaktiviertem Hartpin | Build rc=1, `Destatis 2025 published rate is inconsistent with the annual-average levels` |
| Toleranz auf `0,06` zurueckgedreht, Kette baut unveraendert durch | Oracle rc=1, `Generated metadata should expose the one-tick-discriminating official-rate guard` |

Die vierte Probe ist die wichtige: der Trennschaerfenachweis ist selbst
abgesichert, eine spaetere Aufweichung der Toleranz faellt auf.

### CR03-12 - Blocker geschlossen

`app/balance/balance-annual-inflation.js` steht wieder bei
`INFLATION_RATE_MIN = -10`; die Datei erscheint nicht mehr im Diff gegen
`HEAD`. Die Gegenprobe im Testcode prueft `-10` und `50` inklusiv und weist
`-10,1` und `50,1` ab. Der historische Engine-Inputvertrag bleibt bei `-15`
bis `50` gemaess U-02. `docs/reference/DATA_SOURCES.md` beschreibt die
Trennung jetzt ausdruecklich: Liveprovider `-10` bis `50`, Engine- und
Balance-Importvertrag `-15` bis `50`. Die Scope- und Autorisierungsfrage aus
Runde 2 ist damit beantwortet.

### CR03-15 (neu, mittel) - die beiden Balance-Vertraege sind jetzt gegeneinander erreichbar

Die gewaehlte Aufloesung laesst die Balance-App intern uneinheitlich zurueck,
und zwar auf einem Pfad, den ein Nutzer erreicht:

1. `app/balance/balance-binder-imports.js:66` akzeptiert `inflation` von
   `-15` bis `50`.
2. `app/balance/balance-binder-imports.js:1344` uebergibt die normalisierten
   Inputs an `UIReader.applyStoredInputs`, das in
   `app/balance/balance-reader.js:436` jeden Schluessel, der in `dom.inputs`
   existiert, unveraendert in das Feld schreibt (`el.value = storedInputs[key]`).
3. `app/balance/balance-annual-inflation.js:397` liest genau dieses Feld und
   validiert es gegen `-10`.

Ein importiertes Dokument mit `inflation: -12` wird also angenommen, landet im
Eingabefeld und laesst den jaehrlichen Inflationsschritt anschliessend mit
`AppError: Die Inflationsrate muss zwischen -10 und 50 Prozent liegen`
scheitern - mit einer Meldung, die eine Grenze nennt, die der Import selbst
nicht anwendet.

Vor diesem Slice waren beide Vertraege bei `-10` und damit konsistent; nach
Runde 2 waren beide bei `-15` und ebenfalls konsistent. Die jetzige Fassung ist
die erste, in der sie auseinanderfallen. Das ist fail-closed, es entsteht
keine stille Datenverfaelschung, und die Divergenz ist in `DATA_SOURCES.md`
dokumentiert - der erreichbare Uebergang zwischen beiden aber nicht, und kein
Test deckt ihn ab.

### CR03-13 - geschlossen

`MONTE_CARLO_SNAPSHOT_POLICY.currentReference` ist `null`; der Exportvertrag
prueft das mit der Begruendung, dass kein `pending`-Kandidat als aktuelle
Referenz ausgegeben werden darf. `post-backtest-data-03-v2` ist entfernt; in
Code, Fixtures und Traceability findet sich kein Verweis mehr darauf, nur noch
in den historischen Reviewtexten dieses Dokuments. Delta-Ledger und aktiver
Messkandidat zeigen wieder auf `post-backtest-data-03-v1`.

Wichtiger als die Zeigerkorrektur ist die Ursachenbehebung: der veraenderliche
Zeiger wird in `finalCandidateSnapshotProjection` per Destrukturierung aus der
eingefrorenen Projektion entfernt. Eine kuenftige Zeigeraenderung erzeugt damit
tatsaechlich keinen Folgesnapshot mehr. Der generische Schreibpfad hat die
Entfernung von V2 unbeschadet ueberstanden: `pre-hardening-v1` und
`post-suite-data-02-v1` werden weiterhin mit `Unsupported MC_UPDATE_REFERENCE
target` abgewiesen, `post-backtest-data-03-v1` und `post-backtest-data-02-v3`
mit `Refusing to overwrite immutable Monte Carlo candidate`. Kein Fixture
wurde geschrieben.

### CR03-16 (neu, leicht) - Restspuren der Zeigerkorrektur

Zwei Nebenwirkungen bleiben:

- Der eingefrorene Kandidat `post-backtest-data-03-v1.json` traegt in
  `result.contracts.snapshotPolicy.currentReference` weiterhin
  `post-suite-data-02-v1`. `omitSnapshotCurrentReference()` loescht das Feld
  vor dem Vergleich. Das Beweisartefakt enthaelt damit dauerhaft einen Wert,
  der nach diesem Slice nie gueltig war und heute `null` lautet; sichtbar ist
  das nur, wenn man die Fixture selbst oeffnet. Bei einem unveraenderlichen
  Snapshot ist das der vertretbare Weg, sollte aber im Artefakt oder in der
  Dokumentation als bewusst ignoriertes Feld vermerkt sein.
- Der Exportvertrag nennt jetzt ueberhaupt keine aktuelle Referenz mehr.
  `immutableBaseline`, `deltaLedger` und `finalCandidate` bleiben erhalten,
  sodass die Zuordnung nicht verloren geht; eine eigene, ausdruecklich als
  ungeprueft gekennzeichnete Angabe (etwa `pendingReference`) haette die
  Information erhalten, statt sie zu entfernen. Zusaetzlich behauptet
  `policy: 'immutable-baseline-with-versioned-post-slice-references'`
  weiterhin versionierte Referenzen, waehrend das zugehoerige Feld leer ist.

### CR03-14 - geschlossen

`proxyQualification.monetaryAssetDiscontinuity` benennt jetzt die Umstellung
`100 RM -> 6,50 DM`, `nominalBalanceLossPct 93,5`, den Geltungsbereich
(grosse Bar- und Bank-/Sparguthaben nach dem Festkontengesetz vom Oktober
1948) und stellt dem den CPI-Proxy mit `cumulativePriceChangePct
58,53658549405758` und `impliedPurchasingPowerLossPct 36,92307697408539`
gegenueber. Das sind exakt die Werte, die ich in Runde 1 unabhaengig gemessen
hatte (`+58,5` Prozent beziehungsweise `36,9` Prozent). Die Auslegung sagt
ausdruecklich, dass die Reihe kein durchgehender Geldvermoegensdeflator ueber
die Reform hinweg ist; eine Bundesbank-Quelle ist verlinkt.

### Verworfene Hypothesen (Runde 3)

Geprueft und **widerlegt**:

- Die 2025-Querpruefung sei bei `0,16` stehen geblieben (widerlegt, sie nutzt
  dieselbe Konstante; Probe 3 loest sie aus).
- Der Trennschaerfenachweis sei nur eine gepinnte Zahl ohne Wirkung
  (widerlegt, Probe 4 erkennt die Ruecknahme auf `0,06`).
- Die Ruecknahme des Balance-Livepfads sei nur dokumentiert, nicht im Code
  vollzogen (widerlegt, Datei faellt aus dem Diff).
- Die Entfernung von `post-backtest-data-03-v2` habe haengende Verweise
  hinterlassen (widerlegt).
- Die Entfernung von V2 habe die Sperren des generischen Schreibpfads
  geschwaecht (widerlegt, vier Zielkennungen erneut geprueft).
- Der Zeiger sei nur im Vergleich unterdrueckt, aber weiterhin Teil der
  erzeugten Projektion (widerlegt, er wird in
  `finalCandidateSnapshotProjection` vor der Kanonisierung entfernt).
- Die Nachbesserung habe Jahreswerte oder die Aktienkette veraendert
  (widerlegt, alle vier Hashes unveraendert).

### Findings-Lifecycle

- **Geschlossen in dieser Runde:** CR03-11, CR03-12 (Blocker aus Runde 2),
  CR03-13, CR03-14.
- **Bereits geschlossen:** CR03-1 (Blocker aus Runde 1), CR03-3, CR03-4,
  CR03-6, CR03-8, CR03-9; CR03-2, CR03-5, CR03-7 und CR03-10 ueber ihre
  Nachfolger.
- **Neu eingefuehrt:** CR03-15 (Auflage vor Slice 04), CR03-16 (leicht).
- **Unveraendert offen aus Slice 02:** CR02-10, CR02-17.

### Pre-Mortem (Runde 3)

> Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
> Produktivbetrieb - was ist die wahrscheinlichste Ursache?

Ein Nutzer importiert ein Balance-Dokument, das eine Inflation zwischen `-15`
und `-10` Prozent enthaelt - etwa aus einem historischen Szenario oder einem
Engine-nahen Export. Der Import nimmt es an, das Feld traegt den Wert, und der
jaehrliche Inflationsschritt bricht anschliessend mit einer Fehlermeldung ab,
die einen Bereich nennt, den derselbe Vorgang gerade akzeptiert hat. Der
Nutzer sieht einen Widerspruch ohne Handlungsanweisung, und niemand sucht die
Ursache in zwei getrennt gepflegten Grenzwerten derselben App.

Zweitwahrscheinlich: Eine kuenftige Destatis-Ausgabe verschiebt einen
Jahresdurchschnitt um einen Indexpunkt, der `0,05`-Guard bricht den Build
korrekt ab, und die schnellste Reparatur waere eine Aufweichung der Toleranz.
Dieser Weg ist seit dieser Runde versperrt - Probe 4 belegt es -, kostet aber
Erklaerungsaufwand, wenn niemand den Trennschaerfenachweis kennt.

## Review-Ergebnis (Claude, Runde 3)

- **Status: freigegeben**
- **Blocker: keine.** Der Runde-2-Blocker CR03-12 ist zurueckgenommen, der
  Runde-1-Blocker CR03-1 bleibt geschlossen.
- **Auflagen vor Slice 04:**
  - **CR03-15** - Den erreichbaren Uebergang zwischen Balance-Importvertrag
    (`-15`) und Balance-Anwendungspfad (`-10`) entweder schliessen oder
    absichern: entweder den importierten Wert beim Anwenden auf den
    Livebereich normalisieren beziehungsweise beim Import sichtbar
    zurueckweisen, oder den Fall als Test festhalten und die Fehlermeldung so
    formulieren, dass sie den Importfall benennt.
  - **CR03-16** - Das im eingefrorenen Kandidaten verbliebene, im Vergleich
    unterdrueckte `currentReference` als bewusst ignoriertes Feld
    dokumentieren und die Aussage von
    `policy: 'immutable-baseline-with-versioned-post-slice-references'` mit
    dem leeren Zeiger in Einklang bringen.
- **Restrisiken:**
  - CR02-10 und CR02-17 unveraendert.
  - Aus Runde 1 unveraendert fortbestehend: Rundungsdrift der aus publizierten
    Raten verketteten Reihe (`+0,074` %, `-0,290` %, `-0,128` % je Segment);
    Bindung des 2025-Parsers an die `div`-Kennungen `236128` und `236130`
    sowie des Destatis-Selektors an ein bedeutungstragendes Leerzeichen;
    Konzeptwechsel 1991 West auf 1992 Gesamtdeutschland; globale
    Ausschlussgrenze 1950 gegenueber dem VPI-Proxyende 1949.
  - Der Querpruefungsguard ist jetzt trennscharf gegen Abweichungen zwischen
    Raten- und Leveltabelle; groessere Abweichungen faellt er erst recht auf.
    Er kann jedoch per Konstruktion keinen Fehler erkennen, der in beiden
    Destatis-Tabellen konsistent enthalten ist, und das unabhaengige Oracle
    kann es ebenfalls nicht, weil es dieselben Zellen liest.
- **Pre-Mortem:** siehe oben - Importwert zwischen `-15` und `-10`, der beim
  jaehrlichen Inflationsschritt auf die engere Livegrenze trifft.

Kopfzeile und Freigabezeile dieses Dokuments sind durch dieses Drittreview
nicht veraendert worden. Die Freigabe bezieht sich auf den technischen Stand
des Slice; Commit, Push und die Programmfreigabe bleiben Nutzerentscheidung.
