# Slice 02 - Offene globale Aktien-Forschungsreihe

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Entscheidung:** dauerhafte Nutzerentscheidung vom 2026-07-29:
bestehender Branch fuer Slice 02 bis 13, kein eigener Feature-Branch und keine
erneute Branch-Rueckfrage ohne ausdruecklichen Widerruf  
**GitHub-Status:** kein Upstream fuer den aktiven Branch eingetragen  
**Basiscommit:** `16f5c830d83ce17f114294e555651fcb2d776d72`  
**Status:** Review-Nachbesserung durch Codex technisch umgesetzt; wegen
ausstehendem erneutem Claude-Review weiterhin nicht freigegeben; Commit
ausstehend  
**Freigabe:** ausstehend; Codex nimmt keine Selbstfreigabe vor

**Blockierung:** Die von Claude dokumentierten technischen Blocker CR02-1 und
CR02-3 sowie die Freigabeauflagen CR02-2 und CR02-6 sind durch Variante 1 und
die nachstehenden Nachweise technisch bearbeitet. Der Reviewstatus bleibt bis
zur unabhaengigen erneuten Pruefung blockiert. Bis zur externen Freigabe wird
weder Slice 02 committed noch Slice 03 begonnen.

## Ziel

Die ungeklaerte `msci_eur`-Price-Proxyreihe wird durch die vom Nutzer
beschlossene offene, segmentierte globale Aktien-Forschungsreihe fuer 1925 bis
2025 ersetzt. Der kanonische Name `global_equity_research_index` erhebt
ausdruecklich keinen Anspruch, einen Anbieterindex abzubilden. Alle
Aktienpositionen verwenden weiterhin denselben Jahresreturn.

## Akzeptanzkriterien

1. Die kanonische Reihe deckt 1925 bis 2025 lueckenlos ab.
2. Jeder Jahresreturn ist auf eine konkrete Segmentquelle, Transformation,
   Waehrungsbehandlung und Qualitaetsklasse rueckfuehrbar.
3. Es werden keine MSCI-Werte kopiert, abgeleitet oder unter einem
   MSCI-nahelegenden Namen paketiert.
4. Fuer 1925 bis 2020 werden die nominalen lokalen Aktien-Total-Returns der
   offenen JST Macrohistory Database aus einem ex ante definierten
   16-Laender-Universum verwendet. Fuer 2021 bis 2025 werden offene
   OECD-Kursindizes mit einem explizit modellierten, aus JST 2020
   fortgeschriebenen Dividendenbaustein kombiniert.
5. Segment- und Waehrungsuebergaenge erzeugen keinen unbelegten Return.
6. Jeder Jahreswert stimmt innerhalb `1e-12` mit dem deterministischen
   Transformationsskript ueberein. OECD-Kurs- und EZB-Waehrungskomponenten
   stimmen unveraendert mit den gefilterten Eingabedaten ueberein.
7. Rohdaten oder reproduzierbare Rohdatenreferenz, Transformationsskript,
   Manifestrevision und SHA-256-Fingerprints sind vorhanden.
8. Bestehende Consumer werden kontrolliert auf den neutralen Reihennamen
   migriert; UI und Engine verwenden keinen abweichenden Aliasvertrag.
9. Die definierten Referenzlaeufe besitzen maschinenlesbare
   Vorher-/Nachher-Deltas mit Ursache; unerwartete Ergebnisabweichungen und
   `portfolio_flow_delta >= 1 EUR` stoppen den Slice.
10. Manifest-, Inventar-, Backtest-, Monte-Carlo- und Gesamttests bestehen.

## Scope

- Quellen-, Lizenz- und Identitaetsnachweis der offenen Forschungsreihe;
- reproduzierbarer Bau der segmentierten Jahresreturn- und Indexlevelkette;
- neutraler kanonischer Reihenname mit kontrollierter Consumer-Migration;
- reihenspezifische Qualitaetssegmente und Manifestrevision;
- Referenzlaufvergleich und Dokumentations-Sync.

## Nicht im Scope

- positionsspezifische Aktienrenditen;
- Aenderungen an Inflation, Zins, Gold, CAPE oder Lohn;
- Rebalancing-, Runway-, Floor-, Mindest-Flex- oder Steuersemantik;
- Rekalibrierung von Regimegrenzen;
- historische Steuergesetze;
- `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- Commit, Push oder Selbstfreigabe durch Codex.

## Verbindliche Branch-Ausnahme

Der Nutzer hat am 2026-07-29 nach dem initialen Branch-Check ausdruecklich
entschieden:

> Es gibt keinen eigenen Branch - wir arbeiten im aktuellen Branch weiter.
> Dokumentiere diese Benutzerentscheidung so, dass du sie beim naechsten
> Slice wiederfindest.

Diese Entscheidung gilt laut Rueckdokumentation im Hauptplan dauerhaft fuer
Slice 02 bis 13. Vor Folgeslices wird der aktive Branch weiterhin gemessen,
aber nicht erneut die Anlage eines eigenen Feature-Branches verlangt, solange
der Nutzer die Ausnahme nicht widerruft.

## Branch-, Status- und Diff-Risiko vor Coding

Ausgefuehrt am 2026-07-29 vor dem ersten Produktivcode-Edit:

```text
git branch --show-current
codex/suite-datenintegritaet-hardening

git status --short
<sauber>

git rev-parse HEAD
16f5c830d83ce17f114294e555651fcb2d776d72

git rev-parse --abbrev-ref --symbolic-full-name @{upstream}
<kein-upstream>
```

```text
Geplante Dateien nach Aufloesung der Stop-Gates:
- data/historical/global-equity-research-chain/ (gefilterte Eingabedaten,
  Quellen-, Lizenz- und Transformationsvertrag)
- scripts/build-global-equity-research-chain.mjs
- app/simulator/global-equity-research-chain.js
- app/simulator/simulator-data.js
- app/simulator/simulation-data-inventory.js
- app/simulator/historical-backtest-contract.js
- app/simulator/simulator-portfolio-historical.js
- app/simulator/simulator-engine-helpers.js
- tests/global-equity-research-chain.test.mjs
- tests/simulation-data-inventory.test.mjs
- tests/historical-data-manifest.test.mjs
- tests/historical-backtest-contract.test.mjs
- tests/simulator-backtest-characterization.test.mjs
- tests/fixtures/simulator-backtest-target-v1.json
- docs/reference/DATA_SOURCES.md
- docs/reference/TECHNICAL.md
- docs/reference/SIMULATOR_MODULES_README.md
- tests/README.md
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_02_GLOBALE_AKTIENREIHE.md

Voraussichtliche Aenderungstiefe:
- riskant: wertveraendernde historische Kernreihe mit Backtest-, Monte-Carlo-
  und Regimewirkung

Gefaehrdete bestehende Tests:
- simulation-data-inventory.test.mjs
- historical-data-manifest.test.mjs
- historical-backtest-contract.test.mjs
- historical-backtest-runner.test.mjs
- simulator-backtest-characterization.test.mjs
- Monte-Carlo-, Sweep-, Worker- und Snapshot-/Backtest-Contracts

Nicht anfassen:
- andere historische Reihen und deren Werte
- Engine-, Runway-, Floor-, Mindest-Flex- und Steuersemantik
- Regimegrenzen
- engine.js, dist/ und RuheStandSuite.exe
- vorhandene nutzerseitige Aenderungen ausserhalb des Slice-Scope

Rollback-Strategie:
- neue Rohdaten-, Skript- und Testdateien nur nach ausdruecklicher Freigabe
  entfernen
- git checkout -- app/simulator/simulator-data.js
  app/simulator/simulation-data-inventory.js
  app/simulator/historical-backtest-contract.js
  app/simulator/simulator-portfolio-historical.js
  app/simulator/simulator-engine-helpers.js
  tests/simulation-data-inventory.test.mjs
  tests/historical-data-manifest.test.mjs
  tests/historical-backtest-contract.test.mjs
  tests/simulator-backtest-characterization.test.mjs
  tests/fixtures/simulator-backtest-target-v1.json
  docs/reference/DATA_SOURCES.md docs/reference/TECHNICAL.md
  docs/reference/SIMULATOR_MODULES_README.md tests/README.md
- Hauptplan und Slice-MD nur nach ausdruecklicher Freigabe zuruecksetzen
```

Die geplanten produktiven Dateien bleiben nach aktueller Abgrenzung unter der
Zehn-Dateien-Grenze. Wegen der bewusst wertveraendernden Reihe sind
Vorher-/Nachher-Backtest, FlowDelta, Monte-Carlo-/Worker-Contracts und die
Gesamtsuite Pflicht.

## Referenzlaufvertrag vor dem Wert-Edit

Damit Regel 7 des Hauptplans pruefbar ist, werden folgende vorhandene,
maschinenlesbare Charakterisierungsfaelle aus
`tests/fixtures/simulator-backtest-target-v1.json` als Vorher-Baseline am
Basiscommit `16f5c83` festgelegt:

| Referenzfall | Input-Hash | Zweck |
| --- | --- | --- |
| `completed_2000_2005` | `ebdea5f8b4162f411a17802329bb68cc3a4e756f61e0c6a1f0131b611601ab7d` | Dotcom-/fruehe Erholungssequenz |
| `completed_1960_2020` | `cb5a70552297ce10277b714a2c5fcc6878a4569571368284257ece3550b8e379` | lange Kette ueber mehrere geplante Segmente |
| `three_bucket_minimum_flex_2005_2014` | `ee6f0f4f65ac743fec4e1b68f7424a486fa7b4c8f0f4a43bf374d743b4723c29` | 3-Bucket-, Steuer- und Flex-Interaktion |
| `capital_poor_ruin_2000_2005` | `e576bf078df99d1bc8b779e50fc8c0ffe381bb5599f8c9b1809da292295d31fc` | Ruin-Outcome unter geaenderter Aktiensequenz |
| `dynamic_flex_cape_2010_2013` | `1bc7852f16e88c723c6cc528290c37b04e209df4b1b353d55180d91a319ab65d` | Aktienreturn bei aktivem dynamischem Flex/CAPE-Pfad |

Zusaetzlich bleibt der nutzerseitige 2000-2025-Beispiellauf mit Fingerprint
`89fc3e368d641ffed70dd7dcb78bc4980d021f053e97ab7ff2cc53f42a1754c7`
ein externer Vergleichsfall. Da dessen vollstaendige Eingabe nicht als
Repository-Fixture vorliegt, darf er nicht das einzige automatisierte Oracle
sein.

Pro Fall werden mindestens Endvermoegen, Gesamtentnahme, Gesamtsteuer,
Outcome/Ruin, Kuerzungsjahre, maximale Kuerzungsserie, maximaler Drawdown,
Runway-Minimum und maximales absolutes `portfolio_flow_delta` verglichen.
Jedes Delta braucht die maschinenlesbare Ursache
`global_equity_research_chain`; FlowDelta muss unter 1 EUR bleiben.

## Quellen- und Lizenz-Preflight

Geprueft am 2026-07-29:

1. Das offizielle MSCI-World-EUR-Net-Factsheet belegt die Zielidentitaet
   `Net Returns (EUR)`, weist die Index-Auflage am 31.03.1986 und die
   Rueckrechnung davor aus und publiziert nur einen begrenzten Ausschnitt der
   benoetigten Jahreswerte.
2. Die offiziellen
   [MSCI Index Terms](https://www.msci.com/legal/index-terms) untersagen ohne
   vorherige schriftliche Zustimmung insbesondere Reproduktion,
   Weiterverteilung, Datenbankbefuellung sowie Nutzung zur Erzeugung oder
   Korrektur anderer Daten-/Indexketten. Die frei sichtbaren Werte decken
   daher die im Slice verlangte lokale Einbettung und Paketierung nicht.
3. Die
   [Jordà-Schularick-Taylor Macrohistory Database](https://www.macrohistory.net/database/)
   bietet die verwendeten nominalen lokalen Aktien-Total-Returns sowie
   Bevoelkerung, reales BIP je Einwohner und Wechselkurse unter
   `CC BY-NC-SA 4.0` an. Der abgeleitete Datenbaustein wird deshalb separat
   vom MIT-Code unter denselben Bedingungen ausgewiesen.
4. Der OECD-Datenfluss
   `OECD.SDD.STES,DSD_STES@DF_FINMARK,4.0` liefert fuer alle 16 verwendeten
   Laender Dezember-Kursindexwerte von 2020 bis 2025. OECD weist diese Reihe
   ausdruecklich als Price Index ohne reinvestierte Dividenden aus.
5. Der EZB-Datenfluss `EXR` liefert fuer alle neun benoetigten
   Nicht-Euro-Waehrungen Dezember-Referenzkurse von 2020 bis 2025. Fuer die
   Euro-Laender gilt der Faktor `1`.
6. Die heruntergeladenen Originaldateien werden durch SHA-256 identifiziert;
   paketiert werden nur die benoetigten, unveraendert gefilterten
   Eingabespalten und die daraus erzeugte Forschungsreihe.

## Verbindlicher Transformationsvertrag

Das Laenderuniversum ist fuer beide Segmente
`AUS, BEL, CHE, DEU, DNK, ESP, FIN, FRA, GBR, ITA, JPN, NLD, NOR, PRT, SWE,
USA`. Kanada und Irland bleiben ausgeschlossen, weil JST R6 fuer sie keine
Aktien-Total-Return-Reihe bereitstellt.

Die Gewichte des Jahres `t` verwenden ausschliesslich Informationen aus
`t-1`:

```text
economicWeight[i,t] =
    pop[i,t-1] * rgdpmad[i,t-1]
    / sum(pop[*,t-1] * rgdpmad[*,t-1])
```

Fuer 1925 bis 1949 wird der lokale JST-Total-Return ueber
`xrusd = lokale Waehrung je USD` in USD umgerechnet. Dieser fruehe Abschnitt
ist ein expliziter Waehrungsproxy:

```text
countryReturnUSD[i,t] =
    (1 + eq_tr[i,t]) * xrusd[i,t-1] / xrusd[i,t] - 1
```

Fuer 1950 bis 2020 wird derselbe Country-Return mit dem deutschen
`xrusd`-Faktor in deutsche Anlegerwaehrung ueberfuehrt. Die von JST nach 1998
fortgefuehrte synthetische DM-Skalierung ist fuer Renditen aequivalent zur
EUR-Skalierung:

```text
countryReturnGerman[i,t] =
    (1 + eq_tr[i,t])
    * xrusd[i,t-1] / xrusd[i,t]
    * xrusd[DEU,t] / xrusd[DEU,t-1]
    - 1
```

Der fehlende deutsche `xrusd`-Wert 1945 schliesst Deutschland 1945 und 1946
aus; fehlende japanische `eq_tr`-Werte schliessen Japan 1946 und 1947 aus.
Diese Luecken werden nicht gefuellt. Die Gewichte der vorhandenen Laender
werden neu normiert: 15 Laender 1945, 14 Laender 1946, 15 Laender 1947 und
16 Laender in allen anderen Jahren.

Fuer 2021 bis 2025 wird das 2020-Gewicht eingefroren. Der lokale
Total-Return-Proxy addiert zum OECD-Kursreturn den letzten beobachteten
JST-Dividendenreturn des jeweiligen Landes. Das ist eine offengelegte
Modellannahme, kein beobachteter Total-Return:

```text
countryPriceReturn[i,t] =
    oecdShareIndex[i,December(t)]
    / oecdShareIndex[i,December(t-1)]
    - 1

countryTotalReturnProxy[i,t] =
    countryPriceReturn[i,t] + eq_div_rtn[i,2020]

countryReturnEUR[i,t] =
    (1 + countryTotalReturnProxy[i,t])
    * ecbCurrencyPerEUR[i,December(t-1)]
    / ecbCurrencyPerEUR[i,December(t)]
    - 1
```

Die Gesamtjahresrendite ist in jedem Segment die gewichtete Summe der
verfuegbaren Country-Returns. Die kanonische Levelkette startet 1924 bei
`100` und wird ohne manuelle Einzelkorrektur verkettet.

## Aufgeloestes Stop-Gate

Der Nutzer hat am 2026-07-29 mit „Stelle sie um“ den zweiten im Preflight
angebotenen Fortsetzungsweg gewaehlt: vollstaendig offene, neutral benannte
Forschungsdatenkette. Damit entfällt MSCI als Ziel- und Quelldatensatz.

Das Lizenzrisiko bleibt sichtbar: Die aus JST abgeleiteten Datenartefakte
stehen wegen `CC BY-NC-SA 4.0` unter einer separaten Datenlizenz und duerfen
nicht still als MIT-lizenzierter Programmcode ausgegeben werden.

## Validierung

- `npm run build:global-equity-data`
- `node tests/run-single.mjs tests/global-equity-research-chain.test.mjs`
- `node tests/run-single.mjs tests/global-equity-backtest-delta.test.mjs`
- `node tests/run-single.mjs tests/simulation-data-inventory.test.mjs`
- `node tests/run-single.mjs tests/historical-data-manifest.test.mjs`
- `node tests/run-single.mjs tests/historical-backtest-contract.test.mjs`
- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`
- `npm test`
- `git diff --check`

`npm run build:engine` ist nicht vorgesehen, solange weder `engine/` noch die
oeffentliche `EngineAPI` geaendert werden.

## Durchgefuehrte Aenderungen

- dauerhafte Branch-Ausnahme im Hauptplan fuer Slice 02 bis 13 verankert;
- diese Slice-MD vor Coding angelegt;
- Branch-, Status-, Scope- und Diff-Risiko dokumentiert;
- Referenzlaufvertrag vor dem ersten Wert-Edit festgelegt;
- Quellen- und Lizenz-Preflight durchgefuehrt;
- Nutzerentscheidung zur offenen Forschungsdatenkette rueckdokumentiert;
- JST-, OECD- und EZB-Abdeckung sowie Originaldatei-Hashes gemessen;
- gehashte Originaldateien und daraus bytegenau rekonstruierbare gefilterte
  Eingabedateien samt separater Datenlizenz unter
  `data/historical/global-equity-research-chain/` abgelegt;
- deterministischen Generator
  `scripts/build-global-equity-research-chain.mjs` und den Build-Befehl
  `npm run build:global-equity-data` hinzugefuegt;
- 101 lueckenlose Jahresreturns und Indexlevel 1925-2025 als tief
  eingefrorenes Datenartefakt erzeugt;
- alle produktiven Consumer auf `global_equity_research_index` migriert und
  `annualData` direkt an die generierte Jahresreturn-Wahrheit gebunden;
- Manifest und simulationsweites Inventar auf die getrennten Segmente
  `proxy` 1925-1950, `backtested` 1951-2020 und `estimated` 2021-2025
  fortgeschrieben;
- alle sechs bestehenden Backtest-Zielreferenzen sowie einen siebten Lauf
  ueber die 1949/1950/1951-Naht mit Vorher-/Nachher-Werten, unveraenderten
  Input-Hashes und Outcome-Klassen sowie Ursache
  `global_equity_research_chain` eingefroren;
- die Monte-Carlo-Wirkung als getrennten, nicht selbst freigegebenen
  `post-backtest-data-02-v3`-Snapshot und Delta-Ledger-Eintrag erfasst; die
  ueberholten V1-/V2-Kandidaten bleiben unveraendert;
- Referenzdokumentation und Testinventar synchronisiert.

## Ergebnisse

- Generator-Fingerprints:
  - Rohdatenverbund:
    `a234f57c21c3184077ce00743bbd6bc149363518939eeebb016e9fb25ab1f893`
  - Jahresreturns:
    `7982d0a0a9ec3f9dea0d547ec433abc7cb2aef0f61886fc7b3556c169a97e5bf`
  - Indexlevel:
    `38118b9f982ee3ff5d64a920b397451c302c34f3e46722462bac6e0732878c89`
- Die dokumentierten Luecken bleiben explizit: Deutschland fehlt 1945-1946,
  Japan 1946-1947; in allen anderen Jahren sind 16 Laender enthalten.
- Alle sieben Backtest-Referenzfaelle behalten ihren Input-Hash und ihre
  Outcome-Klasse. Der Ruin-Fall bleibt Ruin; alle sechs uebrigen Faelle
  bleiben abgeschlossen.
- Der maximale absolute `portfolio_flow_delta` betraegt in allen sieben
  Referenzfaellen vorher und nachher `0 EUR`.
- Die wirtschaftlichen Ergebnisse aendern sich erwartungsgemaess deutlich.
  Beispiel `completed_1960_2020`: Endvermoegen
  `95.436.508,34 EUR -> 178.982.113,78 EUR`; das ist ein Datenketten-Delta
  und keine Aenderung der Engine-, Steuer-, Runway- oder
  Mindest-Flex-Semantik.
- `npm run build:global-equity-data` reproduziert die drei vorstehenden
  Fingerprints.
- Fokussierte Backtest-, Manifest-, Inventar-, Monte-Carlo- und
  Integrationsvertraege bestanden.
- `npm test`: 140 Testdateien, 11.375 Assertions, 11.375 bestanden,
  0 fehlgeschlagen, 0 offene Handles.
- `git diff --check`: bestanden.
- `npm run build:engine` wurde nicht ausgefuehrt, weil weder `engine/` noch
  die oeffentliche `EngineAPI` geaendert wurden.
- Produktiver Scope: exakt zehn Programm-/Konfigurationsdateien; damit wurde
  die Stop-Grenze nicht ueberschritten:
  `app/simulator/global-equity-research-chain.js`,
  `app/simulator/historical-backtest-contract.js`,
  `app/simulator/simulation-data-inventory.js`,
  `app/simulator/simulator-data.js`,
  `app/simulator/simulator-engine-helpers.js`,
  `app/simulator/simulator-portfolio-historical.js`,
  `scripts/build-global-equity-research-chain.mjs`, `package.json`,
  `scripts/dev/debug_2013.mjs` und `scripts/dev/generate_fixed_data.js`.
- Es erfolgten weder Commit noch Push noch Selbstfreigabe.

## Abweichungen vom Plan

- Der Hauptplan verlangte MSCI-basierte Segmente ab 1970. Die frei sichtbaren
  MSCI-Daten besitzen keine fuer Einbettung und Paketierung ausreichende
  Nutzungserlaubnis. Der Nutzer hat den Vertrag deshalb auf eine offene,
  neutrale Forschungsdatenkette umgestellt.
- Die dauerhafte Nutzerentscheidung zum vorhandenen Branch ersetzt fuer
  dieses Korrekturprogramm die allgemeine Vorgabe eines eigenen
  Feature-Branches.

## Offene Risiken

- Die wirtschaftsgewichtete Forschungsreihe kann von einem
  kapitalgewichteten Weltindex erheblich abweichen und darf nicht als dessen
  Ersatzidentitaet bezeichnet werden.
- Die Dezember-Monatswerte der OECD sind Monatsdurchschnitte beziehungsweise
  aus Schlusskursen abgeleitete Monatswerte, keine garantierten
  Jahresultimo-Staende.
- Der Dividendenbaustein 2021-2025 ist eine Modellannahme auf Basis von 2020
  und kann reale Dividendenkuerzungen oder -steigerungen verfehlen.
- Eine CC-BY-NC-SA-Datenbeilage darf nicht still als Bestandteil des
  MIT-lizenzierten Quellcodes behandelt werden.
- Die Umbenennung von `msci_eur` wirkt auf Backtest, Monte Carlo, Sweep,
  Worker, Regime und Exportprovenienz; ein Alias ohne klaren Ablaufvertrag
  koennte zwei Wahrheiten erzeugen.

## Rueckdokumentation in den Arbeitsplan

Der Hauptplan dokumentiert die dauerhafte Branch-Ausnahme, verlinkt Slice 02
und weist den aktuellen Quellen-/Lizenz-Stopp aus.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U02-1 | Nutzer | Kein eigener Branch; im aktuellen Branch weiterarbeiten und Entscheidung fuer Folgeslices auffindbar dokumentieren | angenommen | Hauptplan und Slice 02 enthalten dauerhafte Ausnahme fuer Slice 02 bis 13 |
| S02-1 | Codex-Preflight | MSCI-Nutzungsrecht deckt Einbettung, Ableitung und Paketierung nicht | aufgeloest | MSCI ist weder Quelle noch Zielidentitaet |
| S02-2 | Codex-Preflight | Keine freigegebene, lizenzkompatible globale Total-Return-Proxyreihe 1925-1969 | aufgeloest | offene JST-Forschungsdaten mit separater CC-BY-NC-SA-Datenlizenz |
| U02-2 | Nutzer | „Stelle sie um“ auf den angebotenen offenen, neutral benannten Fortsetzungsweg | angenommen | Vertrag und Umsetzung verwenden `global_equity_research_index` |
| CR02-1 | Claude-Review | Numerairebruch an der Segmentgrenze 1949/1950 erzeugt einen unbelegten Return; AK 5 verletzt | Nutzerentscheidung Variante 1 umgesetzt; erneutes Review ausstehend | USD-Proxy bis einschliesslich 1950, deutsche Anlegerwaehrung ab Returnjahr 1951; 1950 nun +19,4134 % statt -17,10 % |
| CR02-2 | Claude-Review | Kein Referenzlauf beruehrt 1925-1959; Proxysegment und Naht sind durch keinen Lauf belegt | technisch umgesetzt; erneutes Review ausstehend | `completed_numeraire_seam_1949_1952` deckt beide Segmente und die Naht ab |
| CR02-3 | Claude-Review | Monte-Carlo-Tripwire geschwaecht: Live-vs-Fixture-Vergleiche durch Fixture-vs-Fixture ersetzt, verbleibender Anker per Umgebungsvariable selbst erzeugbar | technisch umgesetzt; erneutes Review ausstehend | V3 wird nie gegen den eigenen Lauf validiert; einmalige Erzeugung endet absichtlich rot, Ueberschreiben wird verweigert, normaler Lauf vergleicht live gegen V3; V1/V2 bleiben unveraendert |
| CR02-4 | Claude-Review | `beforeTarget.sha256` pinnt ein gitignoriertes Arbeitsverzeichnis, nicht den Basiscommit | technisch umgesetzt; erneutes Review ausstehend | instrumentierte Vorher-Fixture ist versioniert und gehasht; Originalhash der Basiscommit-Fixture bleibt getrennt ausgewiesen |
| CR02-5 | Claude-Review | Zwei der acht Deltametriken existierten im Basiscommit nicht; ihre Vorher-Werte sind nachtraeglich instrumentiert und nicht als solche ausgewiesen | technisch umgesetzt; erneutes Review ausstehend | Drawdown und Runway sind als retroberechnete Zusatzdiagnostik markiert und aus den Basisfixture-Deltaoracles entfernt |
| CR02-6 | Claude-Review | Sechster Referenzfall `health_bucket_nested_row_summary_positive` aendert sich materiell ohne Deltabeleg; AK 9 | technisch umgesetzt; erneutes Review ausstehend | Fall ist mit Vorher-/Nachher-Werten, Outcome, Inputhash und Ursache im Deltavertrag enthalten |
| CR02-7 | Claude-Review | Filterschritt Originaldatei -> CSV ist nicht reproduzierbar; Spaltenauswahl macht die Additivitaetsannahme des Dividendenbausteins unpruefbar | technisch umgesetzt; erneutes Review ausstehend | Originale paketiert; Build rekonstruiert Filter bytegenau; `eq_capgain` aufgenommen und additive JST-Zerlegung 2020 geprueft |
| CR02-8 | Claude-Review | AK 6 ist maschinell nicht abgesichert: nur drei von 101 Jahren an Literale gebunden, Hashes gegen das eigene Artefakt geprueft | technisch umgesetzt; erneutes Review ausstehend | Test rechnet alle 101 Returns unabhaengig direkt aus den Filtereingaben nach |
| CR02-9 | Claude-Review | Lizenzfolgen unabgeschlossen: Wurzel-`LICENSE.md` und `README.md` erwaehnen die CC-BY-NC-SA-Beilage nicht, NC-Klausel fuer ein verteiltes Produkt unbewertet | technisch dokumentiert; Rechtspruefung bleibt extern | Wurzeldokumente grenzen MIT-Code und NC/SA-Daten ab; kommerzielle Verteilung bleibt ohne gesonderte Pruefung untersagt |
| CR02-10 | Claude-Review | `dist/` fuehrt weiterhin `msci_eur`; ausgelieferter Stand und Quellbaum verwenden verschiedene Aktienreihen | als Release-Gate dokumentiert; ausserhalb des Slice-Buildscopes | `dist/` bleibt bis zu ausdruecklichem `npm run sync-dist` veraltet und darf nicht released werden |
| CR02-11 | Claude-Review | Stille Semantikaenderung: `annualData[0].rendite` wechselt von strukturell `0` auf einen echten Jahreswert | technisch dokumentiert; erneutes Review ausstehend | erster Samplingwert 1925 ist bewusst der echte Jahresreturn; Monte-Carlo-V3 friert die Wirkung ein |
| CR02-12 | Claude-Review | Hinweis ausserhalb der Codex-Verantwortung: `scratch/simulate_2000_vpw.mjs` liest weiterhin `msci_eur` | ausserhalb des versionierten Slice-Scopes | ignoriertes lokales Scratch-Skript bleibt Nutzerhinweis und ist kein Produktivconsumer |

## Review-Feedback von Claude

Pruefgegenstand ist der unkommittierte Arbeitsbaumstand auf
`codex/suite-datenintegritaet-hardening` ueber dem Basiscommit `16f5c83`.
Der Branch ist eine dokumentierte Nutzerentscheidung und wird nicht als
Befund gefuehrt. Kopfzeile, Status- und Freigabezeile dieses Dokuments
wurden nicht veraendert.

### Verifikationsbasis

Eigenstaendig ausgefuehrt, nicht aus dem Slice-Dokument uebernommen:

| Gate | Ergebnis |
| --- | --- |
| `npm test` | 11.158 Assertions, 11.158 bestanden, 0 fehlgeschlagen, 0 offene Handles |
| `npm run docs:evidence` | bestanden (2026-07-29; MKT 69, FOR 55, MAP 17) |
| `git diff --check` | sauber |
| `npm run build:global-equity-data` | byteidentisch reproduziert, sha256 `d870996c2820ffa538d0ccc43b1c6d2c64d1355937179a6d784ac10755464ab1`; die drei dokumentierten Fingerprints stimmen |
| Unabhaengige Nachrechnung 1925-2025 | eigene Implementierung des Transformationsvertrags aus den CSV-Eingaben; maximale absolute Abweichung gegen `annualReturns` = `0` ueber alle 101 Jahre |

Die Nachrechnung ist der zentrale positive Befund: der im Dokument
beschriebene Vertrag und der Generator stimmen exakt ueberein. Alle
folgenden Befunde betreffen deshalb nicht die Implementierung der Formeln,
sondern deren fachliche Tragfaehigkeit an den Segmentgrenzen sowie die
Belegkette.

### CR02-1 (Blocker) - Numerairebruch 1949/1950 erzeugt unbelegte Returns

Akzeptanzkriterium 5 verlangt: „Segment- und Waehrungsuebergaenge erzeugen
keinen unbelegten Return." Gemessen wird das Gegenteil.

Der Generator wechselt in `scripts/build-global-equity-research-chain.mjs`
ab `year >= 1950` den Numeraire, indem er zusaetzlich den Faktor
`xrusd[DEU,t] / xrusd[DEU,t-1]` anwendet. Die JST-Reihe `xrusd` fuer
Deutschland ist im Umfeld der Waehrungsreform eine Rekonstruktion:

| Jahr | `xrusd[DEU]` | Faktor `t/t-1` |
| --- | --- | --- |
| 1944 | 2,4894 | 1,0000 |
| 1945 | leer | n/a |
| 1946 | 17,5000 | n/a |
| 1947 | 23,5000 | 1,3429 |
| 1948 | 20,5000 | 0,8723 |
| 1949 | 6,0500 | 0,2951 |
| 1950 | 4,2000 | 0,6942 |
| 1951 | 4,2000 | 1,0000 |

Diese Reihe wirkt in drei aufeinanderfolgenden Jahren strukturell
verschieden: 1948 und 1949 als lokaler Waehrungsfaktor eines Landes mit
rund 5 Prozent Gewicht, ab 1950 als globaler Numeraire mit 100 Prozent
Wirkung. Daraus folgt gemessen:

| Jahr | Kettenrendite | Zerlegung |
| --- | --- | --- |
| 1948 | -1,06 % | Beitrag Deutschland -4,17 pp bei `eq_tr` = -88,4 %; ohne Deutschland waere das Jahr +3,11 % |
| 1949 | +44,33 % | Beitrag Deutschland +37,38 pp; die Landesrendite betraegt +702,4 % aus `eq_tr` = +136,8 % mal FX-Faktor 3,3884; alle uebrigen 15 Laender zusammen tragen +6,96 pp |
| 1950 | -17,10 % | reiner Waehrungsbeitrag des deutschen Faktors -30,58 %; ohne ihn waere das Jahr +19,41 %. Nicht-deutsche Laender tragen -16,60 pp, die USA allein -5,37 pp bei `eq_tr` = +28,3 % |

Der Faktor 0,6942 des Jahres 1950 ist zugleich der extremste deutsche
FX-Faktor des gesamten Segments 1950-2020; der naechstgroessere ist 1985
mit 0,7819. Das ausgerechnet an der Segmentgrenze extremste Jahr ist ein
Konstruktionsartefakt, kein Marktereignis: der Kurs war ab September 1949
bis 1961 fixiert, was die Faktoren 1951 bis 1953 von exakt 1,0000
bestaetigen.

Vier Folgewirkungen sind produktiv erreichbar:

1. `indexLevels[1949] = 734,09` ist ein USD-Stand, `indexLevels[1950] =
   608,55` ein DM-Stand. Jede Kennzahl, die ueber die Naht hinweg
   Levelverhaeltnisse bildet, ist in keiner Waehrung definiert.
2. Fuer einen Backtest mit Start 1951 liefert
   `simulator-engine-helpers.js:190` beziehungsweise
   `historical-backtest-contract.js:696` einen Allzeithochstand von 734,09
   gegen einen Vorjahresstand von 608,55 und damit einen Phantom-Drawdown
   von -17,10 Prozent ohne Marktereignis. Der Stand wird erst 1951 wieder
   ueberschritten, der Effekt ist also auf Startjahr 1951 begrenzt, aber
   real.
3. `annualData` enthaelt 1948 bis 1950 als ziehbare Beobachtungen. Bei
   Blockbildung ueber die Naht kombiniert Monte Carlo ein +44-Prozent-Jahr
   mit einem -17-Prozent-Jahr, die beide dieselbe Ursache haben.
4. Entscheidend: 1950 liegt laut `SIMULATION_DATA_INVENTORY` im Segment
   1950-2020 mit `evidenceClass: 'backtested'`, also in der hoechsten
   Qualitaetsklasse des Slices. `excludeEstimatedHistory` steht ueberall
   auf `false` als Vorgabewert und wuerde selbst eingeschaltet nur Jahre
   unterhalb von `ESTIMATED_HISTORY_CUTOFF_YEAR` entfernen. Der groesste
   Konstruktionsartefakt der Kette ist damit weder als geschaetzt markiert
   noch ausfilterbar.

Die im Dokument gefuehrten „Offenen Risiken" decken diesen Punkt nicht ab.
Sie nennen die Abweichung von einem kapitalgewichteten Index, die
OECD-Monatswerte, den Dividendenbaustein und die Lizenz - nicht den
Numerairewechsel.

Zur Aufloesung genuegt eine der folgenden Massnahmen, die Wahl ist eine
fachliche Entscheidung des Nutzers: den deutschen FX-Anker erst ab einem
Jahr mit belegtem Marktkurs setzen und die Jahre davor konsistent in USD
fuehren; oder 1948 bis 1950 als eigenes Qualitaetssegment mit
`evidenceClass: 'proxy'` ausweisen und ausfilterbar machen; oder die
deutsche Position und den deutschen Anker fuer 1946-1950 aus dem Universum
nehmen und die Gewichte wie bei 1945-1947 neu normieren.

### CR02-2 (mittel) - kein Referenzlauf beruehrt den kritischen Bereich

Die fuenf vertraglich festgelegten Referenzfaelle decken 2000-2005,
1960-2020, 2005-2014, 2000-2005 und 2010-2013 ab. Der fruehestmoegliche
Startpunkt ist 1960. Weder das Proxysegment 1925-1949 noch die Naht
1949/1950 noch die neuen Modelljahre 2021-2025 werden von einem
Referenzlauf beruehrt. Die Akzeptanzkriterien 4 und 5 betreffen genau die
Abschnitte, fuer die kein Vorher-/Nachher-Beleg existiert.

### CR02-3 (mittel) - der Monte-Carlo-Tripwire ist schwaecher als vorher

In `tests/monte-carlo-measurement-contract.test.mjs` wurden fuenf
Zusicherungen der Form „Live-Datenversion gegen unveraenderliche Referenz"
umgestellt:

- `assertJsonEqual(actualDataVersion, postSlice03…)`, `…postSlice05…`,
  `…postSlice06…`, `…postSlice07…` und `…finalCandidate…` entfallen;
- an ihre Stelle treten Vergleiche zwischen zwei Fixtures
  (`postSlice03` gegen `postSlice05`, `postSlice06`, `postSlice07`,
  `finalCandidate`), die konstant und damit inhaltsleer sind;
- als einziger Live-Vergleich bleibt
  `assertJsonEqual(actualDataVersion, activeSnapshot.metadata.dataVersion)`.

`activeSnapshot` ist definiert als
`postBacktestData02 || actualBacktestData02Snapshot`. Bei gesetzter
Umgebungsvariable `MC_UPDATE_BACKTEST_DATA_02=1` ist `postBacktestData02`
gleich `null`, `activeSnapshot` wird der frisch berechnete Lauf, und
saemtliche `compareSnapshotNode`-Aufrufe vergleichen den Lauf mit sich
selbst - waehrend derselbe Durchlauf die Fixture ueberschreibt und die
Suite gruen meldet. Eine Pruefung auf `reviewStatus !== 'reviewed'` vor dem
Schreiben fehlt, obwohl `snapshot-policy-v1.json` fuer diese Klasse
`immutableAfterReview: true` und `overwriteAllowed: false` festlegt.

Zusaetzlich entfallen die zuvor ausdruecklich benannten
Vergleichsausnahmen (`resourceContract.measuredWorkerResultBytesPerRun`,
`result.bufferBytesPerRun`, `riskKpis.maximumDrawdownPct.distribution`)
ersatzlos, weil der Anker gewechselt hat. Nach diesem Slice vergleicht
kein Test den Live-Lauf mehr gegen einen extern freigegebenen Snapshot.

### CR02-4 (mittel) - die Vorher-Basislinie ist nicht reproduzierbar

`tests/fixtures/global-equity-research-chain-backtest-delta-v1.json`
fuehrt `beforeTarget.sha256 = 0ef4a355e6eda9899b2aedeb8b9db1be45da052724edaad1af1b248cacfaa2b5`
mit `"generatedFrom": "baseCommit"`. Gemessen:

- Blob im Basiscommit `16f5c83`: sha256 `c34e0aea16304308650d11b3a03d96ec3632f80e95df4bc771958da3d987febe`, 109.075 Bytes;
- `.tmp/slice02-before-16f5c83/tests/fixtures/simulator-backtest-target-v1.json`: sha256 `0ef4a355…`, 110.444 Bytes.

Der gepinnte Hash gehoert also zu einer lokalen Arbeitskopie unter `.tmp`,
das per `.gitignore` ausgeschlossen ist und derzeit 83 MB belegt. Ein
Strukturvergleich zeigt, dass die Kopie inhaltlich der Basiscommit-Fassung
zuzueglich der beiden neuen Metriken entspricht - die Basislinie ist
sachlich also in Ordnung, ihre Herkunftsangabe aber falsch und ihr
Fingerprint fuer niemanden nachvollziehbar. Der Test prueft ausschliesslich
`afterTarget.sha256`; der Vorher-Hash ist durch nichts abgesichert.

### CR02-5 (mittel) - zwei der acht Deltametriken sind neu

Im Basiscommit enthaelt `values` die Schluessel
`lastRowPortfolioTotalEnd, lastWrapperPortfolio,
maxAbsolutePortfolioFlowDelta, maxReductionStreak, startWealth,
summaryEndWealth, totalTax, totalWithdrawal,
yearsWithReductionAtLeast10Pct`. `maxDrawdownPct` und
`minRunwayCoveragePct` werden erst durch diesen Slice in
`simulator-backtest-characterization.test.mjs` eingefuehrt. Ihre
Vorher-Werte koennen daher nicht aus der Basisfixture stammen, sondern nur
aus einer nachtraeglichen Instrumentierung des Basiscommits.

Die Deltafixture stellt alle acht Metriken einheitlich mit `before`,
`after` und `delta` dar, und
`tests/global-equity-backtest-delta.test.mjs` prueft ausschliesslich
`delta === after - before`. Fuer die beiden neuen Metriken ist der
Vorher-Wert damit eine unbelegte Zahl in einem Beweisartefakt. Betroffen
sind ausgerechnet die groessten relativen Aenderungen:
`three_bucket_minimum_flex_2005_2014.minRunwayCoveragePct` 40,095577 ->
95,532481 und `dynamic_flex_cape_2010_2013.minRunwayCoveragePct`
22,404964 -> 47,531808.

Hinweis dazu: `minRunwayCoveragePct` ist die Metrik, die Befund D-02 des
Pruefdokuments als irrefuehrend ausgewiesen hat. Sie wird hier als
Delta-Oracle eingefroren, bevor D-02 behandelt ist.

### CR02-6 (mittel) - sechster Referenzfall ohne Deltabeleg

`tests/fixtures/simulator-backtest-target-v1.json` enthaelt sechs Faelle,
die Deltafixture nur fuenf. Der nicht erfasste Fall
`health_bucket_nested_row_summary_positive` (2010-2011) aendert sich
materiell:

| Metrik | vorher | nachher |
| --- | --- | --- |
| `summaryEndWealth` | 2.042.036,36 | 2.272.042,20 |
| `lastWrapperPortfolio` | 2.042.036,36 | 2.272.042,20 |
| `totalTax` | 1.568,12 | 2.657,61 |
| `canonicalRowsHash` | geaendert | geaendert |

Der `inputHash` bleibt gleich, die Ursache ist also dieselbe
Datenkettenaenderung. Akzeptanzkriterium 9 verlangt maschinenlesbare
Vorher-/Nachher-Deltas mit Ursache fuer die definierten Referenzlaeufe;
fuer diesen Fall existiert keiner.

### CR02-7 (mittel) - der Filterschritt ist nicht Teil der Belegkette

Der Generator prueft die Hashes der gefilterten CSV-Dateien und
verweigert bei Abweichung den Dienst - das ist wirksam. Die
`originalSha256`-Werte der drei Originaldateien sind dagegen reine
Behauptungen: die Originale liegen nicht im Repository, und kein Skript
erzeugt aus ihnen die gefilterten CSVs. Der Schritt „Originaldatei ->
gefilterte Eingabe" ist damit ein manueller, nicht nachvollziehbarer
Zwischenschritt in einer sonst deterministischen Kette (AK 7).

Konkret pruefbare Folge: die gefilterte JST-Datei enthaelt `eq_tr` und
`eq_div_rtn`, aber nicht `eq_capgain`. Die Modellannahme fuer 2021-2025,
`countryTotalReturnProxy = countryPriceReturn + eq_div_rtn[2020]`, setzt
eine additive Zerlegung von `eq_tr` voraus. Ob JST R6 additiv oder
multiplikativ zerlegt, laesst sich aus den paketierten Daten nicht
feststellen. Der gewichtete Dividendenbaustein betraegt 2,2074 Prozent pro
Jahr und wirkt ueber fuenf Jahre; bei multiplikativer Zerlegung waere er
systematisch falsch angesetzt.

### CR02-8 (leicht) - AK 6 ist sachlich erfuellt, aber nicht abgesichert

`tests/global-equity-research-chain.test.mjs` bindet drei von 101 Jahren an
Literale (2021, 2024, 2025). `annualReturnHash` und `indexLevelHash` werden
gegen Werte geprueft, die im selben generierten Artefakt stehen; nur
`rawDataHash` ist an ein Literal gebunden. Die Kettenbedingung
`level[t] = level[t-1] * (1 + r[t])` faengt Einzelwertmanipulationen ab,
aber keine konsistent durchgezogene Aenderung von Rendite und Level.

Ich habe die fehlende Absicherung durch eine unabhaengige Nachrechnung
ersetzt: eigene Implementierung der dokumentierten Formeln direkt aus den
CSV-Dateien, maximale absolute Abweichung `0` ueber alle 101 Jahre. AK 6
gilt damit sachlich als erfuellt; eine stehende maschinelle Absicherung
fehlt.

Nebenmessung: der Produktivcode leitet die Aktienrendite auf zwei Wegen
ab - `annualData[].rendite` direkt aus `annualReturns`,
`historical-backtest-contract.js` dagegen aus `level[t]/level[t-1] - 1`.
Die maximale Abweichung zwischen beiden Wegen betraegt `3,05e-16` im Jahr
1998 und ist unerheblich; der Test toleriert sie mit `1e-9`.

### CR02-9 (leicht) - die Lizenzfolgen sind nicht abgeschlossen

`data/historical/global-equity-research-chain/LICENSE.md` grenzt die
CC-BY-NC-SA-Beilage sauber ab und nennt die geforderte Namensnennung. Drei
Luecken bleiben:

- die Wurzeldateien `LICENSE.md` (MIT) und `README.md` enthalten keinen
  einzigen Treffer auf `CC BY-NC-SA`, `NonCommercial` oder die
  JST-Autoren; ein Empfaenger des Repositories sieht ausschliesslich MIT;
- die NonCommercial-Klausel ist fuer ein als ausfuehrbare Datei
  verteiltes Produkt nirgends bewertet; das Slice-Dokument nennt nur die
  ShareAlike-Abgrenzung;
- der Lizenzhinweis im Kopf des generierten Moduls verweist relativ auf
  `data/historical/global-equity-research-chain/LICENSE.md`; ein
  `dist/data`-Verzeichnis existiert nicht, die Namensnennung reist also
  nicht mit dem verteilten Stand.

Das ist keine Rechtsberatung meinerseits, sondern der Hinweis, dass die
Bewertung aussteht und derzeit nur in einer Slice-Datei steht.

### CR02-10 (leicht) - `dist/` fuehrt weiterhin die alte Reihe

`dist/app/simulator/simulator-data.js`,
`dist/app/simulator/historical-backtest-contract.js`,
`dist/app/simulator/simulator-engine-helpers.js` und
`dist/app/simulator/simulator-portfolio-historical.js` enthalten weiterhin
`msci_eur`; `global_equity_research_index` kommt in `dist/` an keiner
Stelle vor. `dist/` steht ausdruecklich nicht im Scope, und `dist/` ist
gitignoriert. Der Hinweis bleibt trotzdem noetig: bis zu einem Neubau
rechnen Quellbaum und ausgelieferter Stand mit verschiedenen Aktienreihen.
`engine/` und `engine.js` sind unauffaellig; dort existiert keine zweite
Datenwahrheit.

### CR02-11 (leicht) - stille Semantikaenderung im ersten Sampling-Jahr

Vorher setzte `initializeData()` fuer das erste Jahr strukturell
`rendite = 0`, weil `prevMsci === null` war. `annualData[0]` war damit eine
kuenstliche Nullbeobachtung im Ziehungspool. Jetzt liefert
`GLOBAL_EQUITY_RESEARCH_ANNUAL_RETURNS[1925]` den Wert `+0,143383`.

Sachlich ist das eine Verbesserung - die alte Null war ein Defekt. Sie ist
aber weder in „Durchgefuehrte Aenderungen" noch in den Risiken genannt,
obwohl sie den Monte-Carlo-Ziehungspool veraendert.

### CR02-12 (Hinweis, nicht Codex zuzurechnen)

`scratch/simulate_2000_vpw.mjs` liest an fuenf Stellen weiterhin
`HISTORICAL_DATA[...].msci_eur` und liefert nach dieser Umstellung
`undefined`. Das Verzeichnis ist gitignoriert; Codex konnte es weder sehen
noch migrieren. Fuer den Nutzer ist es relevant, weil das Skript stillt
falsch rechnet statt zu scheitern.

### Nebenwirkung auf die Regimeklassifikation - gemessen, kein Regelverstoss

Die Schwellen in `REGIME_CLASSIFICATION_THRESHOLDS` sind unveraendert; die
Rekalibrierung von Regimegrenzen steht korrekt ausserhalb des Scopes. Die
Verteilung verschiebt sich als Folge der Datenaenderung:

| Label | vorher | nachher | Delta |
| --- | --- | --- | --- |
| BULL | 44 | 39 | -5 |
| BEAR | 7 | 7 | 0 |
| SIDEWAYS | 43 | 49 | +6 |
| STAGFLATION | 7 | 6 | -1 |

Der Mittelwert der Jahresrenditen steigt von 9,91 auf 10,77 Prozent. Der
`embeddedValueHash` von `REGIME_TRANSITIONS` wurde entsprechend
fortgeschrieben. Das ist konsistent, sollte aber als Eingangsgroesse fuer
Slice 12 vermerkt bleiben: die Schwellen von plus/minus 15 Prozent wurden
gegen eine Kursreihe kalibriert und wirken jetzt auf eine
Total-Return-Reihe.

### Fachliches Restrisiko - Identitaet der Reihe

Die Gewichtung 2020 ergibt USA 48,0 Prozent, Japan 12,5, Deutschland 8,1,
Grossbritannien 6,7 und Frankreich 6,3 Prozent. Ein kapitalgewichteter
Weltindex liegt beim USA-Anteil deutlich darueber. Weder ein Test noch ein
Dokument vergleicht die Kette gegen eine externe Benchmark. Fuer ein
Werkzeug, dessen Kernaussage von der Reihenfolge der Jahresrenditen
abhaengt, ist die Jahresgenauigkeit wichtiger als die CAGR; die
Jahresabweichung gegenueber dem Instrument, das ein Nutzer tatsaechlich
haelt, ist derzeit unvermessen. Der Slice weist das Risiko korrekt aus; es
bleibt offen.

### Geprueft und verworfen

| Verdacht | Ergebnis |
| --- | --- |
| Generator nicht deterministisch reproduzierbar | widerlegt - erneuter Lauf erzeugt eine byteidentische Datei |
| Vertragsformeln und Generator weichen ab | widerlegt - eigene Nachrechnung, maximale Abweichung `0` ueber 101 Jahre |
| Zweite Datenwahrheit in `engine/` oder `engine.js` | widerlegt - dort existiert kein `HISTORICAL_DATA` und kein Reihenname |
| MSCI-Reste im Produktivcode oder in der UI | widerlegt - Treffer nur in `.tmp/`, `scratch/` und `.claude/settings.local.json` |
| Level-Pfad und Return-Pfad divergieren materiell | widerlegt - maximale Abweichung `3,05e-16` |
| Regimeschwellen still rekalibriert | widerlegt - Schwellen unveraendert; nur die Verteilung folgt den Daten |
| Branchwahl als Regelverstoss | kein Befund - dokumentierte, dauerhafte Nutzerentscheidung |

### Pruefdimensionen

1. **Korrektheit:** Formeln und Generator stimmen exakt ueberein
   (Abweichung `0`). Nicht geprueft durch die Suite: 98 der 101
   Jahreswerte, die Segmentgrenzen und der gesamte Bereich vor 1960.
2. **Vertragstreue:** AK 1, 3, 7 (Teil), 8 und 10 sind erfuellt. AK 5 ist
   verletzt (CR02-1). AK 9 ist fuer den sechsten Referenzfall nicht
   erfuellt (CR02-6). AK 6 gilt sachlich, ist aber nicht abgesichert
   (CR02-8). AK 2 und AK 7 sind fuer den Filterschritt unvollstaendig
   (CR02-7).
3. **Fehlerbehandlung:** der Generator scheitert fail-closed bei
   Hashabweichung, Zeilenzahl, Lueckenmustern, Beobachtungsstatus und
   Renditen unter -100 Prozent. `initializeData()` wirft bei fehlender
   Jahresrendite. Kein Guard prueft die Plausibilitaet eines
   Waehrungsfaktors oder eines Landesbeitrags.
4. **Seiteneffekte:** Regimeverteilung, `REGIME_TRANSITIONS`,
   `annualData[0]`, drei Delta-Baselines der Slice-16-Nachweiskette, der
   Monte-Carlo-Vergleichsanker und die Snapshot-Policy sind betroffen. Der
   Monte-Carlo-Anker ist dabei geschwaecht worden (CR02-3).
5. **Was koennte brechen:** ein Backtest oder Monte-Carlo-Block, der die
   Naht 1949/1950 ueberdeckt. Die Suite bleibt dabei gruen, weil kein
   Referenzlauf diesen Bereich beruehrt.

### Pre-Mortem

In drei Monaten meldet jemand, dass ein Lauf ueber die spaeten
Vierzigerjahre absurde Ergebnisse liefert: ein Jahr mit +44 Prozent
unmittelbar gefolgt von -17 Prozent ohne erkennbares Marktereignis.
Ursache ist die deutsche Waehrungsreform-Rekonstruktion, die 1948 und 1949
als Landesfaktor eines Fuenf-Prozent-Gewichts und ab 1950 als globaler
Numeraire wirkt. Weil der Wert des Jahres 1950 in der Qualitaetsklasse
`backtested` steht, `excludeEstimatedHistory` ihn nicht entfernt und alle
11.158 Assertions bestehen, wird die Ursache zuerst in der Engine-,
Runway- oder Steuerlogik gesucht statt in der Datenkette.

## Review-Ergebnis (Claude)

- **Status: blockiert**
- **Blocker:**
  - CR02-1 - Numerairebruch an der Segmentgrenze 1949/1950 erzeugt
    unbelegte Returns; Akzeptanzkriterium 5 ist messbar verletzt, und der
    groesste Artefaktwert liegt in der Qualitaetsklasse `backtested` und
    ist durch `excludeEstimatedHistory` nicht ausfilterbar.
- **Vor der naechsten Freigabe zusaetzlich zu klaeren:** CR02-3 (der
  Monte-Carlo-Vergleichsanker darf nicht per Umgebungsvariable durch den
  eigenen Lauf ersetzbar sein), CR02-6 (Deltabeleg fuer den sechsten
  Referenzfall) und CR02-2 (mindestens ein Referenzlauf, der die Naht
  ueberdeckt - dieser belegt zugleich CR02-1).
- **Restrisiken:** CR02-4, CR02-5, CR02-7, CR02-8, CR02-9, CR02-10, CR02-11,
  CR02-12; ausserdem die unvermessene Jahresabweichung der
  wirtschaftsgewichteten Reihe gegenueber einem kapitalgewichteten Index
  und die gegen eine Kursreihe kalibrierten Regimeschwellen als
  Eingangsgroesse fuer Slice 12.
- **Pre-Mortem:** Ein Lauf ueber die Naht 1949/1950 liefert +44 Prozent
  gefolgt von -17 Prozent ohne Marktereignis; die Ursache ist die als
  Numeraire verwendete deutsche Waehrungsreform-Rekonstruktion, wird aber
  wegen gruener Suite und der Klasse `backtested` zuerst in der Engine
  gesucht.

## Review-Nachbesserung durch Codex

**Nutzerentscheidung:** Am 2026-07-29 wurde fuer CR02-1 ausdruecklich
Variante 1 beauftragt:

> USD-Numeraire bis einschliesslich 1950; deutscher Anleger-Numeraire erst ab
> dem Returnjahr 1951.

Die Nachbesserung veraendert keine Engine-, Steuer-, Runway- oder
Mindest-Flex-Semantik. Sie entfernt ausschliesslich den deutschen
Rekonstruktionsfaktor 1949→1950 aus dem globalen Return 1950. Gemessen:

| Jahr | Vor Review-Nachbesserung | Nach Variante 1 | Einordnung |
| --- | ---: | ---: | --- |
| 1949 | +44,3345 % | +44,3345 % | unveraenderter USD-Proxy |
| 1950 | -17,1049 % | +19,4134 % | vollstaendiger USD-Proxy; kein deutscher Nahtfaktor |
| 1951 | +28,2875 % | +28,2875 % | erster Return im deutschen Anleger-Numeraire; deutscher Faktor 4,2/4,2 = 1 |

Der feste Lauf `completed_numeraire_seam_1949_1952` weist nach der
Nachbesserung keinen Phantom-Drawdown mehr aus (`maxDrawdownPct = 0` statt
`1,195063`). Sein Endvermoegen aendert sich bei identischem Inputhash und
unveraenderter Outcome-Klasse von `3.697.010,68 EUR` auf
`5.152.751,56 EUR`.

Die technische Nachbesserung beantwortet zudem die weiteren Reviewfindings:

- CR02-2/CR02-6: sieben Deltafaelle, darunter Naht- und
  Health-Bucket-Referenz;
- CR02-3: neuer, nicht ueberschreibbarer
  `post-backtest-data-02-v3`-Kandidat; Erzeugung und Validierung sind getrennt;
- CR02-4/CR02-5: versionierte Vorher-Fixture, korrekter
  Basiscommit-Originalhash und explizite Kennzeichnung retroberechneter
  Zusatzdiagnostik;
- CR02-7: paketierte Originaldateien, bytegenaue Filterrekonstruktion und
  pruefbare additive JST-Zerlegung;
- CR02-8: unabhaengige Vollnachrechnung aller 101 Returns;
- CR02-9/CR02-11: Lizenzgrenze und erster echter Samplingreturn in den
  Wurzeldokumenten beziehungsweise Slice-Nachweisen offengelegt;
- CR02-10 bleibt ein ausdrueckliches Release-Gate: `dist/` wird erst bei
  einem gesondert beauftragten Sync-/Release-Schritt erneuert.

**Status nach Codex-Nachbesserung:** technisch umgesetzt; erneutes externes
Review und Freigabe ausstehend. Codex markiert die eigenen Korrekturen nicht
als freigegeben und fuehrt keinen Commit oder Push aus.

### Abschlussgates der Nachbesserung

- `npm test`: 140 Testdateien, 11.375/11.375 Assertions, 0 fehlgeschlagene
  Assertions oder Dateien, 0 offene Handles.
- Der negative Monte-Carlo-Ueberschreibversuch endet absichtlich mit
  `Refusing to overwrite immutable Backtest-Data Slice 02 V3 candidate`.
  Der SHA-256 bleibt vorher und nachher identisch:
  `50B806E91B762FDFF696EC85C81937E03E428911D018F838AAB1B0BBF6C14818`.
- Der normale Monte-Carlo-Vertrag bleibt Teil der gruenen Vollsuite; der
  negative Lauf ist ein separates Rot-Gate und keine erfolgreiche
  Selbstvalidierung.

## Zweitreview von Claude (Runde 2)

Geprueft wurde der Arbeitsbaumstand nach der Codex-Nachbesserung ueber dem
unveraenderten Basiscommit `16f5c83`. Kopfzeile, Status- und Freigabezeile
dieses Dokuments wurden erneut nicht angefasst. Die in der Nachbesserung
zitierte Nutzerentscheidung zu Variante 1 liegt mir nicht aus erster Hand
vor; ich nehme sie als gegeben und pruefe ausschliesslich, ob die Umsetzung
sie einloest.

### Erneut ausgefuehrte Gates

| Gate | Ergebnis |
| --- | --- |
| `npm test` | 11.375 Assertions, 11.375 bestanden, 0 fehlgeschlagen, 0 offene Handles |
| `npm run docs:evidence` | bestanden |
| `git diff --check` | sauber |
| `npm run build:global-equity-data` | byteidentisch reproduziert, sha256 `c2b754e4ce712ddcf065c258732a1aebd00ecb63febea82527c0ddcb6c6bf761`; die drei Fingerprints stimmen mit dem Dokument |
| Originaldateien | alle drei Hashes stimmen mit den gepinnten Werten: JST `c1bb91fe...`, OECD `9ea88f6d...`, EZB `047cab45...` |
| Eigene Vollnachrechnung 1925-2025 | neu implementiert mit der Numeraire-Regel USD bis 1950; maximale absolute Abweichung `0` ueber alle 101 Jahre |

### Nachgemessene Aufloesung der Blocker

**CR02-1 ist aufgeloest.** Der Numerairewechsel injiziert keinen Return
mehr:

| Jahr | Rendite | deutscher FX-Faktor | Level |
| --- | ---: | ---: | ---: |
| 1949 | +44,3345 % | 0,2951 nur lokal, Gewicht 5,3 % | 734,09 |
| 1950 | +19,4134 % | nicht angewendet | 876,60 |
| 1951 | +28,2875 % | 1,0000 | 1.124,56 |
| 1952 | +21,2775 % | 1,0000 | 1.363,84 |

Der Wechsel liegt jetzt an einer Stelle, an der der deutsche Faktor exakt
`1,0000` betraegt; der frueher gemessene Waehrungsbeitrag von -30,58 Prozent
ist vollstaendig entfallen. Der Phantom-Drawdown ist weg: fuer Startjahre
1950, 1951 und 1952 betraegt der Abstand zum Allzeithoch jeweils
`0,00 Prozent` statt zuvor `-17,10 Prozent`. Kette, Inventar und
`estimatedSegments` wurden konsistent auf `proxy 1925-1950` und
`backtested 1951-2020` verschoben; `numeraireTransition` ist als
maschinenlesbares Feld im Artefakt vorhanden und im Test gepinnt.

**CR02-3 ist aufgeloest und von mir am roten Pfad nachgewiesen.**
`activeSnapshot` ist jetzt ausschliesslich die gespeicherte Fixture. Mein
Lauf mit `MC_UPDATE_BACKTEST_DATA_02=1` endet mit Exitcode `1` und
`Error: Refusing to overwrite immutable Backtest-Data Slice 02 V3 candidate`.
Der SHA-256 von `post-backtest-data-02-v3.json` ist vor und nach diesem Lauf
`50b806e91b762fdff696ec85c81937e03e428911d018f838aab1b0bbf6c14818` und
bestaetigt die Angabe im Nachbesserungsprotokoll.

**CR02-4 ist sauber aufgeloest.** Die Vorher-Evidenz liegt jetzt als
versionierte Fixture `global-equity-research-chain-before-target-v1.json`
vor, ihr Hash wird im Test geprueft, und der echte Basiscommit-Hash
`c34e0aea16304308650d11b3a03d96ec3632f80e95df4bc771958da3d987febe` steht
getrennt daneben. Das ist exakt der Wert, den ich in Runde 1 gemessen habe.

**CR02-5 ist aufgeloest.** `maxDrawdownPct` und `minRunwayCoveragePct` sind
aus den vertraglichen Deltametriken entfernt und stehen als
`supplementalDiagnostics` mit dem Etikett
`retrocomputed_from_base_commit_with_slice02_instrumentation_not_a_base_fixture_oracle`.

**CR02-2 und CR02-6 sind aufgeloest.** Die Deltafixture enthaelt jetzt
sieben Faelle, darunter `completed_numeraire_seam_1949_1952` und den zuvor
fehlenden `health_bucket_nested_row_summary_positive`.

**CR02-7 ist aufgeloest, und zwar substanziell.** Die Originale sind
paketiert, der Generator liest die XLSX-Arbeitsmappe selbst, rekonstruiert
die gefilterten CSV-Dateien und vergleicht sie bytegenau. `eq_capgain` ist
aufgenommen, und die additive JST-Zerlegung wird fuer alle 16 Laender im
Jahr 2020 mit Toleranz `2e-8` geprueft. Meine Probe bestaetigt das Gate:
eine manipulierte Filtereingabe fuehrt zu
`Filtered jst input is not reproducible from the licensed original`.

**CR02-8 ist aufgeloest.** Test 5 rechnet alle 101 Returns unabhaengig aus
den Filtereingaben nach. Ich habe geprueft, dass das ein echtes Oracle ist
und nicht nur Dekoration: nach einer Manipulation der Eingabe-CSV samt
konsistent nachgezogener Hashfelder faellt der Test gezielt mit
`1975 independently recalculated return should match the generated chain`.

**CR02-9 ist aufgeloest.** Wurzel-`LICENSE.md` und `README.md` grenzen
MIT-Code und CC-BY-NC-SA-Datenbeilage ab und verlangen vor kommerzieller
Verteilung eine gesonderte Pruefung.

**CR02-11 und CR02-12 sind angemessen behandelt.** CR02-10 ist als
Release-Gate korrekt deklariert; ich bestaetige, dass `dist/` den neuen
Reihennamen weiterhin nicht kennt.

### Weiterhin offene und neue Befunde

#### CR02-13 (mittel, neu) - der Input-Hash identifiziert den Lauf nicht

`completed_1960_2020` und der neue `completed_numeraire_seam_1949_1952`
tragen denselben `inputHash`
`cb5a70552297ce10277b714a2c5fcc6878a4569571368284257ece3550b8e379`, obwohl
sie `1960-2020` beziehungsweise `1949-1952` laufen. Ursache:
`inputHash: stableHash(normalizedInputs)` deckt den Zeitraum nicht ab.

`tests/global-equity-backtest-delta.test.mjs` fuehrt den `inputHash` an drei
Stellen als Beleg unveraenderter Eingaben und vergleicht `period` an keiner
Stelle. Damit traegt die Aussage im Ergebnisteil, alle Referenzfaelle
behielten ihren Input-Hash, weniger als sie suggeriert - besonders fuer den
neuen Fall, dessen einziges Unterscheidungsmerkmal genau der Zeitraum ist.
Eine Aenderung des Startjahres eines Referenzfalls wuerde von den
Identitaetszusicherungen nicht bemerkt.

#### CR02-14 (mittel, neu) - die Filterrekonstruktion ist kein Suite-Gate

Der bytegenaue Abgleich Original zu gefilterter Eingabe existiert
ausschliesslich in `scripts/build-global-equity-research-chain.mjs`.
`npm test` ruft `node tests/run-tests.mjs` auf und fuehrt den Build nicht
aus. Der Kettentest prueft die Hashes beider Dateien, aber nicht die
Ableitung zwischen ihnen. Gemessen: das Rekonstruktionsgate feuerte in
meiner Probe erst bei ausdruecklichem `npm run build:global-equity-data`.
Der staerkste neue Nachweis der Nachbesserung laeuft damit in keinem
regulaeren Testlauf mit.

#### CR02-15 (mittel, neu) - die Ausschlussoption erfasst 1950 nicht

Die Nachbesserung hat das Proxysegment auf `1925-1950` ausgeweitet, die
Filtergrenzen aber nicht mitgezogen:

- `ESTIMATED_HISTORY_MAX_YEAR = 1949`, `ESTIMATED_HISTORY_CUTOFF_YEAR = 1950`;
- `DATASET_META.historicalData.estimatedYears = [1925, 1949]`;
- `HISTORICAL_DATA_MANIFEST...estimatedSegments = 1925-1950 und 2021-2025`.

Die ersten beiden widersprechen dem dritten im selben Modul. Gemessen:
`resolveMinStartYearIndex(annualData, true)` liefert Index `25`, also Jahr
`1950` mit `+19,4134 %`. Die nutzerseitige Option zum Ausschluss der
geschaetzten Historie laesst damit genau ein als geschaetzt deklariertes
Jahr im Ziehungspool. Der Wert selbst ist unauffaellig; die Vertragslage ist
es nicht.

#### CR02-16 (mittel, Rest aus CR02-1) - das Waehrungsreformartefakt 1948/1949 bleibt

Bereinigt ist der Numerairewechsel, nicht der lokale Faktor. Gemessen nach
der Nachbesserung:

| Jahr | Gesamtrendite | Beitrag Deutschland | Landesrendite Deutschland |
| --- | ---: | ---: | ---: |
| 1948 | -1,0627 % | -4,17 pp | -86,7 % |
| 1949 | +44,3345 % | +37,38 pp | +702,4 % |

Die deutsche Landesrendite 1949 entsteht aus `eq_tr = +136,8 %` mal dem
`xrusd`-Faktor `20,5 / 6,05 = 3,3884` - derselben Rekonstruktion, die als
globaler Numeraire zu Recht entfernt wurde. Ohne Deutschland betruege 1949
`+7,35 %`. Der Slice dokumentiert das nirgends; `numeraireTransition.rule`
spricht ausdruecklich nur vom globalen Faktor. Das ist kein Verstoss gegen
AK 5, weil kein Segmentuebergang betroffen ist, und die Jahre liegen in der
niedrigsten Evidenzklasse - aber ein Jahr, dessen Rendite zu 84 Prozent aus
einer Waehrungsreformrekonstruktion eines Fuenf-Prozent-Gewichts stammt,
gehoert benannt. In Verbindung mit CR02-15 ist zu beachten, dass die
Ausschlussoption dieses Jahr zwar erfasst, das Jahr 1950 aber nicht.

#### CR02-17 (leicht, neu) - Weiterverbreitung der Originaldatensaetze

Die Reproduzierbarkeit ist erkauft mit `1.811.051` Byte Originaldaten unter
`data/historical/global-equity-research-chain/originals/`, darunter die
vollstaendige `JSTdatasetR6.xlsx` mit `1.408.158` Byte unter
`CC BY-NC-SA 4.0`. Das ist etwas anderes als die bisher dokumentierte
Weitergabe abgeleiteter Werte: das Repository verbreitet den Fremddatensatz
jetzt unveraendert weiter. Fuer die im Hauptplan vorgesehene
GitHub-Veroeffentlichung ist das eine eigenstaendige Entscheidung, die die
neue Lizenzpassage in `LICENSE.md` zwar abdeckt, aber nicht ausdruecklich
benennt.

#### CR02-18 (leicht) - zwei verbliebene Selbstschreibpfade

- `--refresh-filtered-inputs` im Generator schreibt die gefilterten
  Eingaben und vergleicht sie anschliessend mit dem soeben Geschriebenen;
  der Byte-Abgleich ist in diesem Modus wirkungslos. Der Schalter ist ein
  CLI-Argument und im npm-Skript nicht gesetzt.
- `MC_UPDATE_BACKTEST_DATA_02=1` bei fehlender V3-Datei schreibt die Datei
  und laeuft danach auf `activeSnapshot = null` in einen TypeError statt in
  eine erklaerende Meldung. Fail-loud, aber irrefuehrend.

### Nebenwirkung Regimeklassifikation - erneut gemessen

Schwellen unveraendert; die Verteilung folgt der korrigierten Reihe:

| Label | vor Slice 02 | nach Nachbesserung |
| --- | ---: | ---: |
| BULL | 44 | 40 |
| BEAR | 7 | 6 |
| SIDEWAYS | 43 | 49 |
| STAGFLATION | 7 | 6 |

Der Mittelwert der Jahresrenditen steigt von 9,91 auf 11,13 Prozent. Die
Schwellen von plus/minus 15 Prozent bleiben gegen eine Kursreihe kalibriert
und wirken auf eine Total-Return-Reihe; das bleibt Eingangsgroesse fuer
Slice 12.

### Geprueft und verworfen (Runde 2)

| Verdacht | Ergebnis |
| --- | --- |
| Nachbesserung veraendert weitere Reihen oder Engine-Semantik | widerlegt - der Diff bleibt auf die Aktienreihe, ihre Consumer und die Nachweise begrenzt |
| Generator nach der Aenderung nicht mehr reproduzierbar | widerlegt - byteidentischer Neubau |
| Vertrag und Generator weichen unter der neuen Regel ab | widerlegt - eigene Vollnachrechnung, Abweichung `0` |
| Test 5 ist eine Scheinpruefung gegen das eigene Artefakt | widerlegt - faellt gezielt bei manipulierter Eingabe |
| Negativgate der Monte-Carlo-Fixture ist nur behauptet | widerlegt - Exitcode 1, Meldung und unveraenderter SHA reproduziert |
| Qualitaetssegmente nicht mitverschoben | widerlegt - Kette und Inventar stehen konsistent auf 1925-1950 und 1951-2020 |
| `dist/` still mitgezogen | widerlegt - `dist/` unveraendert, korrekt als Release-Gate deklariert |

### Pruefdimensionen (Runde 2)

1. **Korrektheit:** die eigene Vollnachrechnung stimmt exakt; der Nahtfall
   ist erstmals durch einen Referenzlauf belegt. Ungeprueft bleibt die
   Uebereinstimmung mit einer externen Benchmark.
2. **Vertragstreue:** AK 5 ist jetzt erfuellt. AK 9 ist erfuellt, die
   Identitaetszusicherung des Deltatests ist aber schwaecher als
   dargestellt (CR02-13). AK 6 und AK 7 sind erfuellt; das staerkste Gate
   laeuft nicht in der Suite mit (CR02-14).
3. **Fehlerbehandlung:** Rekonstruktions-, Additivitaets-, Status- und
   Hashpruefungen greifen fail-closed; drei von vier Mutationsproben wurden
   erkannt, die vierte war eine gelockerte Toleranz und damit nicht
   aussagekraeftig.
4. **Seiteneffekte:** Segmentgrenzen, Regimeverteilung, Manifest, Inventar,
   Delta-Baselines und Monte-Carlo-Anker; alle erklaert. Neu entstandene
   Inkonsistenz nur bei den Sampling-Grenzen (CR02-15).
5. **Was koennte brechen:** eine Reihenaenderung, die die Segmentgrenzen
   verschiebt, ohne `ESTIMATED_HISTORY_*` mitzuziehen; oder eine
   Zeitraumaenderung an einem Referenzfall, die der Input-Hash nicht sieht.

### Pre-Mortem (Runde 2)

In drei Monaten verschiebt ein Folgeslice erneut eine Segmentgrenze, etwa
weil eine bessere Quelle das Proxysegment verkuerzt. Die drei
Segmentdeklarationen werden nachgezogen, `ESTIMATED_HISTORY_MAX_YEAR` und
`ESTIMATED_HISTORY_CUTOFF_YEAR` erneut nicht, weil sie in einem anderen
Abschnitt derselben Datei stehen und kein Test sie gegen die Segmente
prueft. Die Option zum Ausschluss geschaetzter Historie zieht dann still
eine falsche Grenze, alle Tests bleiben gruen, und der Fehler faellt erst
auf, wenn jemand ein konservatives Ergebnis nicht reproduzieren kann.

## Review-Ergebnis (Claude, Runde 2)

- **Status: freigegeben**
- **Blocker: keine.** Der Blocker CR02-1 aus Runde 1 ist nachgemessen
  aufgeloest; CR02-2 bis CR02-9, CR02-11 und CR02-12 ebenfalls, CR02-10 ist
  korrekt als Release-Gate deklariert.
- **Auflagen vor dem Commit:**
  - CR02-15 - `ESTIMATED_HISTORY_MAX_YEAR`, `ESTIMATED_HISTORY_CUTOFF_YEAR`
    und `DATASET_META.estimatedYears` auf die neue Segmentgrenze 1950/1951
    nachziehen und die Uebereinstimmung mit `estimatedSegments` in einem
    Test festhalten;
  - CR02-16 - das deutsche Waehrungsreformartefakt 1948/1949 im Slice und
    in `DATA_SOURCES.md` benennen; ob Deutschland fuer 1947-1950 wie
    1945/1946 ausgeschlossen wird, ist eine fachliche Nutzerentscheidung.
- **Auflagen vor Slice 03:**
  - CR02-13 - Referenzfaelle ueber eine Kennung identifizieren, die den
    Zeitraum einschliesst, und `period` im Deltatest vergleichen;
  - CR02-14 - die Filterrekonstruktion als eigenes Suite- oder Release-Gate
    aufnehmen, damit sie nicht nur bei manuellem Build laeuft.
- **Restrisiken:** CR02-10 (dist-Stand), CR02-17 (Weiterverbreitung der
  Originaldatensaetze), CR02-18 (zwei Selbstschreibpfade); ausserdem
  unveraendert die unvermessene Jahresabweichung der wirtschaftsgewichteten
  Reihe gegenueber einem kapitalgewichteten Index, der auf 2020
  eingefrorene Dividendenbaustein 2021-2025, die OECD-Dezemberwerte als
  Monatsdurchschnitte und die gegen eine Kursreihe kalibrierten
  Regimeschwellen als Eingangsgroesse fuer Slice 12.
- **Pre-Mortem:** Ein Folgeslice verschiebt erneut eine Segmentgrenze, zieht
  die `ESTIMATED_HISTORY_*`-Konstanten nicht mit, und die Option zum
  Ausschluss geschaetzter Historie zieht still eine falsche Grenze, ohne
  dass ein Test anschlaegt.
