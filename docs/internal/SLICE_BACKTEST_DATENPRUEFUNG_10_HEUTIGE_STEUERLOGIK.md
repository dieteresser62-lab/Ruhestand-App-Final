# Slice 10 - Heutige Steuerlogik auf heutigem Startbestand

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Ausnahme:** Nutzerentscheidung vom 2026-07-29 fuer Slice 02 bis 13;
kein neuer Feature-Branch  
**GitHub-Status:** Remote `origin` ist vorhanden; der aktive Branch besitzt
keinen Upstream und bleibt bis zu einer ausdruecklichen Nutzerfreigabe lokal  
**Basiscommit:** `2e4867f5fa1817a050fd06029b3298b10342764e`  
**Status:** Claude-Review Runde 1 blockierte; CR10-1 bis CR10-12 sowie der
abschliessende Browser-Befund S10-STOP-04 sind im durch den Nutzer freigegebenen
Scope von exakt fuenfzehn produktiven Dateien korrigiert und selbstgetestet;
externes Re-Review und Freigabe stehen aus  
**Abhaengigkeiten:** Slices 01, 02, 04 und das vollstaendige freigegebene
Ergebnisdokument von Slice 09

## Input aus dem Ergebnisdokument von Slice 09

Slice 09 ist in Claude-Review Runde 2 freigegeben und als Basiscommit
`2e4867f` vorhanden. Die drei damaligen Blocker CR09-1 bis CR09-3 sind
geschlossen. Vor Slice 10 sind zwei ausdrueckliche Auflagen zu erfuellen:

- **CR09-4:** Fuer die Aussage, dass der Floor in finanzierbaren Szenarien
  keinen Fehlbetrag besitzt und nur echter finanzieller Ruin den Floor
  unterschreiten kann, fehlt ein diskriminierender Zeuge.
- **CR09-14:** Bei aktivem Dynamic Flex verwendet die Jahresdiagnose noch den
  statischen Brutto-Flexbedarf. Der bereits von der Engine berechnete
  effektive VPW-Flex muss stattdessen die Haushaltsbasis speisen, ohne die
  Engine-Policy zu veraendern.

Die uebrigen offenen Restrisiken CR09-5 bis CR09-13 und CR09-15 bis CR09-20
werden nicht still als Teil von Slice 10 behandelt. Besonders CR09-16/17 zur
Runway-Einheit und zur Nichtanwendbarkeit im Auto-Optimize bleiben sichtbar
offen; sie sind von der Steuerkorrektur fachlich unabhaengig.

## Preflight vor Coding

- `git branch --show-current`: `codex/suite-datenintegritaet-hardening`
- `git status --short`: leer; der Arbeitsbaum war vor Anlage dieser Slice-MD
  sauber.
- `git rev-parse HEAD`: `2e4867f5fa1817a050fd06029b3298b10342764e`.
- Slice-09-Abnahme: Claude Runde 2 `freigegeben`, lokaler Commit vorhanden.
- Generierte Artefakte `engine.js`, `dist/` und `RuheStandSuite.exe` sind kein
  Bearbeitungsziel.
- Unveraenderte Baseline `npm test`: 160 Testdateien, Exitcode 0.

## S10-STOP-01 - Steuervertrag erfordert elf produktive Dateien

Der vorlaeufig festgeschriebene Scope von zehn produktiven Dateien reichte
nicht aus. Der anschliessende Vertragsabgleich hat in
`app/simulator/simulator-portfolio-init.js` drei weitere aktive
Steuerableitungen gefunden:

- aggregierter Altbestand wird mit `tqf: 0.30` erzeugt;
- aggregierter Neubestand wird mit `tqf: 0.30` erzeugt;
- Gold-Steuerfreiheit wird als `tqf: 1.0` statt als eigenstaendiger
  Steuerstatus kodiert.

Diese Initialwerte laufen vor `simulator-portfolio-tranches.js` und koennen
dort nicht nachtraeglich fachlich korrekt repariert werden. Die Datei ist
deshalb fuer D-07/D-08 zwingend. Mit ihr umfasst der unteilbare produktive
Scope genau elf Dateien. Gemaess projektweiter Stop-Regel erfolgen vor einer
ausdruecklichen Nutzerentscheidung keine Programmdatei-Edits.

## S10-STOP-02 - Dateninventar ist zwoelfte produktive Vertragsdatei

Die erste Gesamtsuite nach der Umsetzung hat den weiterhin aktiven
Steuervertrag in `app/simulator/simulation-data-inventory.js` als zusaetzliche
Source-of-Truth-Grenze sichtbar gemacht. Dort sind noch
`defaultEquityTqf: 0.30`, `goldTaxFreeTqf: 1`, die alte
Transformationsbeschreibung und der dazugehoerige Embedded-Hash inventarisiert.
Nur den Test an die neue Implementierung anzupassen wuerde das dokumentierte
Dateninventar widerspruechlich machen. Die Datei muss daher als zwoelfte
produktive Datei in den Slice-Scope aufgenommen und mit D-07/D-08
synchronisiert werden. Bis zur ausdruecklichen Nutzerfreigabe bleibt diese
zusaetzliche Programmdatei unveraendert. Der Nutzer hat S10-STOP-02 am
2026-08-02 geschlossen und den Scope auf genau zwoelf produktive Dateien
erweitert.

## S10-STOP-03 - Reviewkorrektur erfordert vierzehn produktive Dateien

Der vollstaendige Abgleich von CR10-1 bis CR10-12 zeigt zwei produktive
Vertragsgrenzen ausserhalb des bisher freigegebenen Zwoelf-Dateien-Scopes:

- **CR10-11:** `app/simulator/historical-backtest-metrics.js` muss den neuen
  `flex_haushalt_basis`-Marker auswerten und gemischte Bezugsbasen fail-closed
  behandeln; eine reine Testaenderung wuerde die produktive Fehlaggregation
  nicht korrigieren.
- **CR10-8:** `app/tranches/tranchen-manager-page.js` muss bei geladenen
  Schema-0/-1-Tranchen den konservativen Steuervertrag (`tqf: 0`,
  `taxExempt: false`) sichtbar machen und eine fachliche Nutzerbestaetigung
  verlangen; ein statischer HTML-Hinweis kann nicht unterscheiden, ob eine
  Migration tatsaechlich stattgefunden hat.

Alle uebrigen Reviewpunkte lassen sich innerhalb der bereits freigegebenen
Produktivdateien sowie in Tests, Fixtures und Dokumentation korrigieren. Der
unteilbare Scope fuer die vollstaendige Reviewkorrektur umfasst damit genau
vierzehn Produktivdateien. Gemaess projektweiter Stop-Regel erfolgen Aenderungen
an den beiden zusaetzlichen Programmdateien erst nach ausdruecklicher
Nutzerfreigabe. Der Nutzer hat S10-STOP-03 am 2026-08-02 geschlossen und den
Scope auf genau vierzehn Produktivdateien erweitert.

## S10-STOP-04 - Synthetische Profiltranchen erfordern fuenfzehnte Produktivdatei

Der nach CR10-1 bis CR10-12 erneut ausgefuehrte Browser-Gate scheitert im
Balance-Jahres-Preflight am nun strikten Engine-Vertrag. Die Ursache liegt in
`app/profile/profilverbund-balance.js`: `buildSyntheticProfileTranches()`
erzeugt fuer Profile ohne Detailtranchen weiterhin Laufzeittranchen ohne
`schemaVersion: 2` und ohne explizites `taxExempt`. Diese synthetischen
Aggregate sind kein Legacy-Persistenzinput und duerfen deshalb nicht am
Engine-Rand migriert werden.

Die fachlich korrekte Reparatur muss die synthetischen Equity-, Gold-,
Geldmarkt- und Anleihen-Tranchen bereits bei ihrer Erzeugung mit dem aktuellen
Steuervertrag versehen. Damit steigt der produktive Scope von exakt vierzehn
auf exakt fuenfzehn Dateien. Der Nutzer hat S10-STOP-04 am 2026-08-02
geschlossen und die Korrektur dieser fuenfzehnten Produktivdatei freigegeben.

## Ziel und zu schliessende Befunde

Das bestehende vereinfachte Modell wendet die heutige Steuerlogik konsistent
auf alle historischen Marktsequenzen an. Slice 10 schliesst:

- **D-06:** positive Cashzinsen gehen in dasselbe Jahres-Settlement wie
  realisierte Verkaufsgewinne ein und verbrauchen dort den bereits bestehenden
  Sparer-Pauschbetrag;
- **D-07:** die pauschale 30-Prozent-Teilfreistellung wird weder als
  Tranchendefault noch fuer Geldmarkt-/Anleihepositionen still erzeugt;
- **D-08:** Steuerfreiheit wird je Starttranche durch ein explizites
  `taxExempt`-Merkmal gespeichert und nicht aus Typ, Name, Notiz, Kaufdatum
  oder Simulationsjahr abgeleitet;
- **CR09-4 und CR09-14** als Eingangsgates aus dem Slice-09-Ergebnis.

## Steuervertrag

1. `tqf` bleibt die explizit bestaetigte Teilfreistellungsquote zwischen 0 und
   1. Der Default fuer neue beziehungsweise nicht belegte Positionen ist 0,
   nicht 0,30.
2. `taxExempt` ist ein eigenstaendiges, explizites Boolean-Merkmal. Nur
   `taxExempt === true` befreit einen realisierten Gewinn vollstaendig.
3. `aktien_alt`, Kaufdatum und Freitext besitzen keine Steuerwirkung. Der
   Alt-/Neu-Typ bleibt ausschliesslich ein Verkaufs-/Bestandsmerkmal.
4. Geldmarkt- und Anleihetranchen duerfen im kanonischen Vertrag keine positive
   Aktienfonds-Teilfreistellung tragen. Einzelaktien muessen als steuerpflichtig
   mit `tqf: 0` erfasst werden; eine automatische ISIN-/Namensklassifikation
   findet nicht statt.
5. Positive Cashzinsen werden als eigener, nachvollziehbarer Anteil der
   signierten Jahressteuerbasis in das zentrale Settlement aufgenommen. Die
   daraus entstehende Mehrsteuer wird aus dem verzinsten Cashbestand gezahlt;
   eine Verkaufssteuerreserve wird dafuer nicht vorgetaeuscht.
6. Negative Cashzinsen bleiben signiert und werden im vereinfachten Modell in
   derselben Jahresbasis verrechnet. Die fachliche Vollmodellierung
   unterschiedlicher Steuertoepfe bleibt Nicht-Scope.
7. Nicht verkaufte Tranchen erzeugen auch mit gesetztem Steuermerkmal keine
   fiktive Verkaufsteuer.
8. Der Raw-Backtestexport uebernimmt den kanonischen Request unverkuerzt; damit
   sind `taxExempt` und `tqf` je Starttranche Bestandteil von Fingerprint und
   Replayvertrag.

## Akzeptanzkriterien

1. CR09-4 besitzt je einen Zeugen fuer finanzierbaren Floor ohne Fehlbetrag und
   fuer echten Ruin mit sichtbarem Floor-Fehlbetrag.
2. Bei aktivem Dynamic Flex verwenden `flex_brutto_haushalt`,
   `flex_haushalt_erfuellt`, `flex_haushalt_kuerzung_pct` und der finale
   Mindest-Flex-Fehlbetrag dieselbe effektive VPW-/Haushaltsbasis.
3. Neue Tranchen starten steuerpflichtig mit `tqf: 0`; Steuerfreiheit muss
   explizit gesetzt werden.
4. Geldmarkt- und Anleihetranchen mit positiver TQF scheitern an der
   kanonischen Tranchengrenze mit Feldkontext.
5. `taxExempt: true` fuehrt bei einem Verkauf zu 0 EUR steuerpflichtigem
   Gewinn; `taxExempt: false` mit identischen Werten bleibt steuerpflichtig.
6. Der Startbestandexport enthaelt `taxExempt` und `tqf` je Tranche und ist
   fingerprint-/replaystabil.
7. Ein positives Markerjahr ohne Verkauf weist positive Zinssteuer und den
   korrekten Verbrauch des bestehenden Pauschbetrags aus.
8. Ein Markerjahr mit Verkauf und Zins settled beide Einkunftsanteile genau
   einmal; Steuer, Cashdelta, Verlustvortrag und `FlowDelta` reconciliieren.
9. Eine nicht verkaufte steuerpflichtige oder steuerfreie Tranche erzeugt
   keine Verkaufsteuer.
10. Historische Steuersaetze oder -gesetze werden nicht nach Simulationsjahr
    umgeschaltet.

## Vorlaeufiger Programmdatei-Scope und erforderliche Erweiterung

Der zuerst festgeschriebene produktive Scope umfasste zehn Dateien:

1. `types/tranche-contract.js`;
2. `depot-tranchen-manager.html`;
3. `app/tranches/tranchen-manager-modal.js`;
4. `app/simulator/simulator-engine-direct-utils.js`;
5. `app/simulator/simulator-portfolio-tranches.js`;
6. `engine/transactions/sale-engine.mjs`;
7. `app/profile/profilverbund-action-attribution.js`;
8. `app/simulator/simulator-tax-recompute.js`;
9. `app/simulator/simulator-engine-direct.js`;
10. `app/simulator/simulator-year-result.js`.

Der Vertragsabgleich erfordert zusaetzlich als elfte produktive Datei:

11. `app/simulator/simulator-portfolio-init.js`.

Die Gesamtsuite hat zusaetzlich die inventarisierte Steuer-Source-of-Truth als
zwoelfte produktive Datei aufgedeckt:

12. `app/simulator/simulation-data-inventory.js`.

Das Claude-Review Runde 1 erfordert nach Nutzerfreigabe zusaetzlich:

13. `app/simulator/historical-backtest-metrics.js`;
14. `app/tranches/tranchen-manager-page.js`.

Testdateien, Fixtures und Dokumentation zaehlen gemaess Projektregel nicht zur
Zehn-Dateien-Grenze. Der Nutzer hat S10-STOP-01 am 2026-08-02 geschlossen und
den Scope zunaechst auf genau elf produktive Dateien erweitert. S10-STOP-02
wurde am selben Tag ebenfalls durch Nutzerentscheidung geschlossen und der
finale Scope auf genau zwoelf produktive Dateien erweitert.

## Nicht im Scope

- keine historischen Steuergesetze oder Steuersatzumschaltung nach Jahr;
- keine Vorabpauschale, Ausschuettungslogik, vollstaendige
  Sparer-Pauschbetragslogik oder Kirchensteuer-Veranlagung;
- keine automatische Wertpapierklassifikation aus ISIN, Name oder Notiz;
- keine Besteuerung des Pflegebucket-`cash_return`; dessen gesonderte
  Mittelherkunft und Steuerzahlung benoetigen einen eigenen Vertrag;
- keine Aenderung der historischen Reihen aus Slice 02 bis 07;
- keine Bereinigung der unabhaengigen CR09-5 bis CR09-13 oder CR09-15 bis
  CR09-20;
- keine manuelle Aenderung von `engine.js`, `dist/` oder
  `RuheStandSuite.exe`.

## Diff-Risiko vor dem ersten Programmdatei-Edit

```text
Geplante Dateien:
- die zehn im vorlaeufigen Programmdatei-Scope genannten Dateien
- nach Nutzerfreigabe zusaetzlich app/simulator/simulator-portfolio-init.js
- nach zweiter Nutzerfreigabe zusaetzlich
  app/simulator/simulation-data-inventory.js
- fokussierte Tranche-, Verkaufssteuer-, Profilverbund-, Simulatorsteuer-,
  Backtest-, Worker- und Exporttests/Fixtures
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_10_HEUTIGE_STEUERLOGIK.md
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- betroffene Referenzdokumentation nach finalem Contract

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- kanonischer Tranche-/Persistenzvertrag und Tranchenmanager
- Verkaufsreihenfolge, Verkaufsteuer und Profilverbund-Steuerattribution
- Simulator-Jahressettlement, Zins-, Verlusttopf- und Cashreconciliation
- Backtest-, Monte-Carlo-, Sweep- und Workerparitaet
- Slice-09-Mindest-Flex- und Delta-Orakel

Nicht anfassen:
- historische Datenreihen und deren generierte Module
- Runway-/Optimizer-Semantik der offenen CR09-Findings
- engine.js, dist/ und RuheStandSuite.exe

Rollback-Strategie:
- geaenderte versionierte Dateien gezielt mit git checkout -- <datei...>
  auf Basiscommit 2e4867f zuruecksetzen
- neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen
- keine Hard-Resets oder sonstigen destruktiven Git-Kommandos
```

## Geplante Tests

- CR09-4 Floor-finanzierbar/Ruin und CR09-14 Dynamic-Flex-Haushaltsbasis;
- Tranchenschema fuer explizite Steuerfreiheit, TQF 0/0,30 und unzulaessige
  positive TQF bei Geldmarkt/Anleihe;
- Tranchenmanager-Read/Write fuer `taxExempt` und Default `tqf: 0`;
- Verkaufssteuer-Witnesses fuer identische steuerpflichtige/steuerfreie Lots;
- Profilverbund-Steuerattribution mit expliziter Steuerfreiheit;
- Simulator-Marker ohne Verkauf sowie kombiniert mit Verkauf, positiver und
  negativer Cashverzinsung;
- Raw-Export/Fingerprint/Replay mit expliziten Steuermerkmalen;
- isoliertes Slice-09-zu-Slice-10-Delta-Ledger;
- Worker-/Seriellparitaet fuer Steuer-, Cash- und Ergebnisfelder;
- `npm test`, `npm run test:coverage`, `npm run test:browser`,
  `npm run docs:evidence`, `npm run build:engine` und `git diff --check`.

## Durchgefuehrte Aenderungen

- Slice-MD auf Basis des vollstaendigen Slice-09-Ergebnisdokuments angelegt.
- Branch-, Arbeitsbaum-, Ergebnis-, Scope- und Diff-Risiko-Status vor Coding
  dokumentiert.
- Das Tranchenschema auf Version 2 mit explizitem booleschem `taxExempt`
  migriert. Der Persistenzrand migriert alte Goldkodierung `tqf: 1` explizit zu
  `tqf: 0` plus `taxExempt: true`; andere positive Nicht-Aktien-TQF werden auf
  0 gesetzt. Der Engine-Rand weist fehlendes `taxExempt` dagegen fail-closed ab.
- Positive TQF fuer jede Nicht-Aktien-Kategorie vertraglich abgewiesen; die
  Tranchen-UI speichert den Steuerfreiheitsstatus explizit und zeigt Zahl sowie
  Art betroffener Legacy-Tranchen bis zur Nutzerbestaetigung an.
- Verkaufsteuer, Profilverbund-Attribution und Simulator-Initialisierung auf
  das explizite Merkmal umgestellt; Gold-Steuerfreiheit wird nicht mehr als
  `tqf: 1` kodiert.
- Positive und negative Cashzinsen in das gemeinsame Jahres-Settlement
  aufgenommen; Steuerzahlung beziehungsweise Erstattung werden signiert mit
  Cashbestand, Flow-Delta und Jahresdiagnose reconciliert.
- CR09-4 durch getrennte finanzierbare Floor- und Ruin-Zeugen sowie CR09-14
  durch die effektive VPW-Flex-Haushaltsbasis geschlossen.
- Das Dateninventar einschliesslich Embedded-Hash mit dem neuen
  Steuerdatenvertrag synchronisiert.
- Die aggregierte Verkaufsvorplanung verwendet nun gewinngewichtete TQF und
  explizite Steuerfreiheit statt pauschaler Null-/False-Werte.
- Die historische negative Subcent-Klemme ist begruendet und auf negative
  Rundungsartefakte begrenzt; positive Subcent-Erstattungen bleiben erhalten.
- Haushalts-Flexmetriken werden nur noch ueber eine vollstaendige, einheitliche
  `flex_haushalt_basis` aggregiert; fehlende oder gemischte Basen liefern `null`.
- Synthetische Profilverbund-Tranchen werden als vollstaendige Schema-2-Lots
  erzeugt; Equity-TQF bleibt erhalten, Goldsteuerfreiheit ist explizit und
  Geldmarkt traegt weder TQF noch Steuerbefreiung.
- Bestehende Slice-08/09-Messfixtures unveraendert gelassen, wieder aktiv und
  feldweise verglichen; die Slice-10-Backtestfixture enthaelt die 31
  Cross-Slice-Orakel sowie ein vollstaendiges Slice-09-zu-10-Delta-Ledger.

## Ausgefuehrte Tests

- Unveraenderte Baseline `npm test`: 160 Testdateien, Exitcode 0.
- Fokussierte Vertrags-, UI-, Persistenz-, Steuer-, Profilverbund-, Backtest-,
  Demografie-, Monte-Carlo- und Simulatortests: gruen.
- Vollstaendige Abschlusssuite `npm test`: 17.930/17.930 Assertions, 0
  fehlgeschlagene Dateien, 0 offene Handles, Exitcode 0.
- `npm run test:coverage`: 17.930/17.930 Assertions; 78,40 %
  (39.539/50.430 V8-Zeilenbereiche), 216 Dateien, erforderliche Datei-Gates
  gruen, Exitcode 0.
- `npm run test:browser`: 28/28 Browser-Smoke-Szenarien gruen, Exitcode 0.
- `npm run docs:evidence`: Architektur-Evidenzvalidierung gruen, kein
  Netzwerkzugriff.
- `npm run build:engine`: Exitcode 0; der Fallback-Modul-Wrapper ist
  deterministisch unveraendert geblieben.
- `git diff --check`: gruen.

## Abweichungen vom Plan

- CR09-4 und CR09-14 stehen nicht im urspruenglichen Steuer-Scope des
  Hauptplans, sind durch das freigegebene Slice-09-Ergebnis aber ausdrueckliche
  Auflagen vor Slice 10. Sie werden deshalb als vorgeschaltete Eingangsgates
  aufgenommen.
- Der erste Scope uebersah die aktive Aggregate-Initialisierung in
  `simulator-portfolio-init.js`. S10-STOP-01 dokumentiert die notwendige
  Erweiterung von zehn auf elf produktive Dateien vor dem ersten Code-Edit.
- Die erste Gesamtsuite machte den ebenfalls produktiven Inventarvertrag in
  `simulation-data-inventory.js` sichtbar. S10-STOP-02 dokumentiert die vom
  Nutzer freigegebene Erweiterung von elf auf zwoelf produktive Dateien.
- Das Claude-Review Runde 1 erforderte fuer sichtbare Legacy-Migration und
  metrische Auswertung der Flexbasis zwei weitere produktive Dateien.
  S10-STOP-03 dokumentiert die Nutzerfreigabe auf exakt vierzehn Dateien.
- Der abschliessende Browser-Gate deckte synthetische Profiltranchen ohne den
  neuen Steuervertrag auf. S10-STOP-04 dokumentiert die Nutzerfreigabe der
  fuenfzehnten produktiven Datei.

## Offene Risiken

- Der Nutzer muss die reale steuerliche Einordnung bestehender Tranchen
  bestaetigen; sie wird absichtlich nicht aus Name, Datum oder Alt-/Neu-Typ
  geraten.
- Das vereinfachte gemeinsame Settlement bildet keine getrennten deutschen
  Verlustverrechnungstoepfe ab.
- Pflegebucket-Ertraege bleiben ausserhalb dieses ersten Zinssteuervertrags.
- Die unabhaengigen offenen Risiken des Slice-09-Ergebnisdokuments bleiben
  bestehen und werden nicht durch Steuerfixtures ueberdeckt.

## Rueckdokumentation in den Hauptplan

Der Hauptplan verlinkt diese Slice-MD und dokumentiert den freigegebenen
Slice-09-Basiscommit, die beiden Eingangsgates, den finalen
Fuenfzehn-Dateien-Scope, die Korrektur von CR10-1 bis CR10-12 und das gruene
Implementierungsergebnis.

## Freigabestatus

S10-STOP-01 bis S10-STOP-04 sind durch Nutzerfreigaben vom 2026-08-02
geschlossen. Der Scope umfasst exakt fuenfzehn produktive Dateien. CR10-1 bis
CR10-12 sowie der Browser-Befund sind korrigiert und selbstgetestet. Codex
erteilt keine Selbstfreigabe; Re-Review, Freigabe und lokaler Commit bleiben
extern.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| U10-1 | Nutzer 2026-08-02 | Slice 10 beginnen und Slice-09-Ergebnisdokument als Eingang verwenden | angenommen | Preflight und Slice-Dokument angelegt |
| CR09-4 | Claude-Review Slice 09 Runde 2 | Floor-finanzierbar/Ruin-Zeuge fehlt | als Eingangsgate uebernommen | implementiert und selbstgetestet |
| CR09-14 | Claude-Review Slice 09 Runde 2 | Dynamic-Flex-Haushaltsbasis ist statisch | als Eingangsgate uebernommen | implementiert und selbstgetestet |
| D-06 | Datenpruefung | Cashzinsen liegen ausserhalb des Jahres-Settlements | angenommen | implementiert und selbstgetestet |
| D-07 | Datenpruefung | pauschale TQF 0,30 fuer alle Tranchen | angenommen | implementiert und selbstgetestet |
| D-08 | Datenpruefung | kein expliziter Steuerfreiheitsstatus je Starttranche | angenommen | implementiert und selbstgetestet |
| S10-STOP-01 | Codex-Preflight und Nutzer 2026-08-02 | `simulator-portfolio-init.js` erzeugt weiterhin pauschale TQF- und Gold-Steuerwerte ausserhalb des ersten Zehn-Dateien-Scopes | Scope auf genau elf produktive Dateien erweitert | geschlossen; Umsetzung freigegeben |
| S10-STOP-02 | Codex-Vertragsabgleich und Nutzer 2026-08-02 | `simulation-data-inventory.js` hielt den alten TQF-/Gold-Steuervertrag ausserhalb des Elf-Dateien-Scopes fest | Scope auf genau zwoelf produktive Dateien erweitert | geschlossen; Umsetzung freigegeben |
| S10-STOP-03 | Codex-Abgleich Claude-Review Runde 1 und Nutzer 2026-08-02 | CR10-8 und CR10-11 benoetigen produktive Korrekturen in `tranchen-manager-page.js` und `historical-backtest-metrics.js` ausserhalb des Zwoelf-Dateien-Scopes | Scope auf genau vierzehn produktive Dateien erweitert | geschlossen; Umsetzung freigegeben |
| S10-STOP-04 | abschliessender Browser-Gate und Nutzer 2026-08-02 | synthetische Profiltranchen aus `profilverbund-balance.js` verletzen den strikten v2-Steuervertrag | Scope auf exakt fuenfzehn produktive Dateien erweitert | geschlossen; Schema-2-Steuervertrag umgesetzt und getestet |
| CR10-1 | Claude-Review (Runde 1) | 31 exakte Cross-Slice-Orakelwerte aus Slice 06, 07 und 08 wurden ersatzlos geloescht, darunter das vollstaendige Slice-07-zu-08-Ledger und beide FlowDelta-Null-Assertionen | angenommen | 31 exakte Orakelwerte einschliesslich beider FlowDelta-Nullwerte wiederhergestellt und feldweise gepinnt |
| CR10-2 | Claude-Review (Runde 1) | Die Slice-09-Messfixture wird nicht mehr verglichen; `slice09Measurement` wird berechnet und nur noch unter einer Umgebungsvariable ausgegeben | angenommen | Slice-09-Fixture ist aktive Eingangsquelle und wird feldweise gegen das daraus gebildete Delta-Ledger geprueft |
| CR10-3 | Claude-Review (Runde 1) | Es gibt kein Slice-09-zu-Slice-10-Delta-Ledger; die neue Fixture enthaelt nur Zaehler, Hashes und ein inhaltsleeres `economicAggregateDeltaExpected`-Flag | angenommen | elf Charakterisierungsfaelle plus vier D17-Zeugen mit Richtung und Betrag fuer Vermoegen, Entnahme, Steuer und FlowDelta dokumentiert; Outcome unveraendert |
| CR10-4 | Claude-Review (Runde 1) | `buildInputsCtxFromPortfolio` und die aggregierten Pseudo-Tranchen der Verkaufsengine setzen `tqf: 0` und `taxExempt: false` fest; die Engine plant damit gegen andere Steuermerkmale als die realisierte Tranchensteuer | angenommen | gewinngewichtete TQF und All-Exempt-Marker bis in die aggregierte Verkaufsplanung durchgereicht und getestet |
| CR10-5 | Claude-Review (Runde 1) | Der neue Liquiditaets-Wurf in `simulateOneYear` hat keinen Zeugen und laeuft in Monte Carlo und Sweep in keine Fehlerbehandlung; er wuerde die gesamte Charge statt des einzelnen Laufs abbrechen | angenommen | chargenbrechenden Wurf entfernt; bestehende konservative Verkaufsreserve und signierte Cash-Steuerkorrektur bleiben massgeblich |
| CR10-6 | Claude-Review (Runde 1) | Der Kommentar zur historischen Ursache der Nullklemme in `simulator-tax-recompute.js` wurde ersatzlos geloescht; die neue Toleranz verwirft zusaetzlich positive Erstattungen unter einem Cent | angenommen | historische MC-Ruin-Begruendung wiederhergestellt; nur negative Subcent-Artefakte geklemmt, positive 0,005-EUR-Erstattung gepinnt |
| CR10-7 | Claude-Review (Runde 1) | Die TQF-Kategoriegrenze gilt nur fuer Geldmarkt und Anleihen; Gold- und Cash-Tranchen duerfen weiterhin eine Aktienfonds-Teilfreistellung tragen, und die alte Kodierung `tqf: 1.0` fuer Goldsteuerfreiheit bleibt wirksam | angenommen | positive TQF fuer alle Nicht-Aktien-Kategorien ungueltig; Legacy-Gold `tqf: 1` wird explizit zu `taxExempt: true`, `tqf: 0` migriert |
| CR10-8 | Claude-Review (Runde 1) | Die Migration senkt fuer jeden Bestandsnutzer die Aktien-TQF von 0,30 auf 0 und setzt `taxExempt` auf `false`, ohne Migrationshinweis in der Oberflaeche und ohne bezifferte Steuerwirkung | angenommen | Aktien-TQF bleibt erhalten; UI nennt Anzahl, Gold-Konvertierungen und Nicht-Aktien-TQF-Resets und fordert fachliche Bestaetigung; Steuerwirkung je Backtestfall im Delta-Ledger beziffert |
| CR10-9 | Claude-Review (Runde 1) | Die Pflicht zu explizitem `taxExempt` haengt an `schemaVersion === 2`, also an einem Feld, das derselbe Schreibpfad setzt; ein Datensatz ohne Schemaversion wird still als nicht steuerfrei uebernommen | angenommen | Engine-Modus verlangt `taxExempt` unabhaengig von `schemaVersion`; Migration ist auf den Persistenzrand begrenzt und getestet |
| CR10-10 | Claude-Review (Runde 1) | Der neue CR09-4-Zeuge fuer den finanzierbaren Floor ist nicht diskriminierend; der fachlich interessante Fall gedecktes Vermoegen bei fehlender Liquiditaet fehlt | angenommen | Zeuge startet mit null Cash und gedecktem Vermoegen, erzwingt Liquidation zur Floor-Finanzierung und bleibt getrennt vom Ruin-Zeugen |
| CR10-11 | Claude-Review (Runde 1) | `flex_haushalt_basis` markiert die Bezugsbasis, wird aber von keiner Metrik ausgewertet; kumulierte Haushalts-Flexmetriken koennen zwei Basen desselben Laufs summieren | angenommen | Flexaggregation verlangt vollstaendige einheitliche Basis; fehlende/gemischte Marker liefern nachvollziehbar `null` |
| CR10-12 | Claude-Review (Runde 1) | Der Ergebnisabschnitt nennt nur Testdateizahl und Exitcode statt der in Slice 08 und 09 ueblichen exakten Assertions-, Coverage- und Browserzahlen | angenommen | Abschlusswerte dokumentiert: 17.930/17.930 Assertions, 78,40 % (39.539/50.430) Coverage und 28/28 Browser-Szenarien |
| CR10-13 | Claude-Review (Runde 2) | Die gemessene Steuerwirkung steht nur in der Fixture; kein Abschnitt des Ergebnisdokuments nennt eine Groessenordnung, obwohl ein Backtestfall 8.395.042,76 EUR Endvermoegen verliert | offen | ausstehend |
| CR10-14 | Claude-Review (Runde 2) | Das Delta-Ledger deckt elf von zwoelf Charakterisierungsfaellen ab; `sourceCaseCount: 12` neben `cases: 11` legt Vollstaendigkeit nahe, die nicht besteht | offen | ausstehend |
| CR10-15 | Claude-Review (Runde 2) | Die Legacy-Migration ueberschreibt ein explizit gesetztes `taxExempt: true` auf einer Nicht-Aktien-Tranche mit positiver TQF still auf `false` | offen | ausstehend |
| CR10-16 | Claude-Review (Runde 2) | Die gewinngewichtete Aggregat-TQF klammert Verluste und unterstellt eine proportionale Entnahme, waehrend der reale Verkauf steueroptimiert sortiert; Plan und Realisierung bleiben systematisch verschieden | offen | ausstehend |
| CR10-17 | Claude-Review (Runde 2) | Die Scope-Liste nennt nur vierzehn Dateien und schliesst weiterhin mit "finale Scope auf genau zwoelf"; `profilverbund-balance.js` fehlt als fuenfzehnte Datei | offen | ausstehend |
| CR10-18 | Claude-Review (Runde 2) | Der entfernte Wurf hinterlaesst die Deckungsbehauptung des Kommentars ohne Zeugen; die Absicherung liegt allein bei der naechsten Enginegrenze | offen | ausstehend |

## Review-Feedback von Claude

**Reviewdatum:** 2026-08-02
**Pruefstand:** unverbuchter Arbeitsbaum auf Basiscommit `2e4867f`.
**Rolle:** adversariales Fremdreview; ausser diesem Ergebnisdokument wurde
keine Datei dauerhaft veraendert.

### Selbstaendig nachgefahrene Gates

| Gate | Gemessen | Dokumentbehauptung |
|---|---|---|
| `npm test` | 160 Dateien, **17.890/17.890** Assertions, 0 Fehler, 0 offene Handles, 1 separates Gate | nur "160 Testdateien, Exitcode 0" |
| `npm run test:coverage` | **78,36 Prozent** (39.426/50.314), beide Pflichtdatei-Gates | nur "160 Testdateien, Exitcode 0" |
| `npm run test:browser` | **28/28** | bestaetigt |
| `npm run docs:evidence` | erfolgreich, rein lokale statische Validierung | bestaetigt |
| `npm run build:engine` | Fallback-Build; `engine.js`, `dist/` und `RuheStandSuite.exe` unveraendert | bestaetigt |
| `git diff --check` | sauber | bestaetigt |

Der Gesamtlauf ist gruen. Die Beanstandung betrifft nicht den Lauf, sondern was
er nach diesem Slice noch messen kann.

### Blocker

**CR10-1 - 31 exakte Cross-Slice-Orakelwerte wurden ersatzlos geloescht.**
`tests/simulator-backtest-characterization.test.mjs` verliert in diesem Slice
31 Assertionen und gewinnt eine. Geloescht wurden:

| Orakel | Geloeschte exakte Werte |
|---|---|
| Slice-06-CAPE-Effekt (live berechnet) | 56.705,98 / -30.000 / -4.318,72 / 10,517888 |
| Early-Wage JST 1930-1940 | 7 Werte, u. a. 2.740.858,55 / 2.670.022,78 / -70.835,77 |
| Early-Wage JST 1935-1946 | 7 Werte, u. a. 5.136.609,35 / 5.091.243,10 / -45.366,25 |
| Slice-07-zu-08-Runwayledger | 12 Werte, beide Arme, **einschliesslich beider `FlowDelta`-Null-Assertionen** |

Erhalten bleiben nur die Werte, die aus **archivierten JSON-Dateien** gelesen
werden (`slice06To07`, Byte-Hashes der Slice-06/07/08-Fixtures). Diese
Assertionen sind trivial stabil, weil niemand die Dateien schreibt. Die
geloeschten Werte waren die einzigen, die verlangten, dass der **aktuelle Code**
die Wirkungen der Slices 06, 07 und 08 noch reproduziert.

Genau dieses Muster war in Slice 08 Runde 1 der Blocker CR08-2 und wurde damals
korrekt behoben, indem die Werte in einer neuen Fixture exakt neu verankert
wurden - nicht, indem sie entfielen. Slice 10 verankert nichts neu.

**CR10-2 - Die Slice-09-Messfixture wird nicht mehr verglichen.**
Vor diesem Slice lautete die Struktur:

```
if (PRINT_BACKTEST_DATA_09 === '1') { ausgeben }
else { collectDiffs(expectedSlice09Measurement, slice09Measurement) }
```

Der `else`-Zweig ist entfallen. `slice09Measurement` wird weiterhin vollstaendig
berechnet (`tests/simulator-backtest-characterization.test.mjs:1753`), aber nur
noch unter der Umgebungsvariable ausgegeben und **nie** assertiert.
`minimum-flex-slice-09-measurement-v1.json` wird ausschliesslich noch gelesen,
um zwei Hashfelder in die Slice-10-Fixture zu kopieren. Die elf
`existingCaseFinancialDeltas` und der vierjaehrige D-17-Zeuge, die im
Slice-09-Review als geschlossener Nachweis galten, sind damit tote Daten.

**CR10-3 - Es gibt kein Slice-09-zu-Slice-10-Delta-Ledger.**
Die neue Fixture `tax-logic-slice-10-backtest-measurement-v1.json` enthaelt
vollstaendig:

```
schemaVersion, snapshotId, sourceReference, sourceFixtureSha256,
sourceActualSha256, targetResultDocument, reviewStatus, targetActualSha256,
caseCount 12, negativeCaseCount 5, ruinCaseCount 1,
maxAbsolutePortfolioFlowDelta 0, economicAggregateDeltaExpected true
```

Kein einziger Finanzwert. `caseCount`, `negativeCaseCount` und `ruinCaseCount`
sind gegenueber Slice 09 unveraendert (12/5/1); die einzige inhaltliche Aussage
ist ein Boolean, das behauptet, es gebe eine oekonomische Wirkung, ohne sie zu
beziffern. Dass es sie gibt, ist belegbar: `sourceActualSha256`
(`6303a479...`, der Slice-09-Stand) und `targetActualSha256`
(`165766b1...`) unterscheiden sich. Richtung und Groesse der Steuerwirkung auf
die zwoelf Charakterisierungsfaelle sind nirgends festgehalten - weder in der
Fixture noch im Ergebnisdokument. Der Abschnitt "Geplante Tests" nennt ein
"isoliertes Slice-09-zu-Slice-10-Delta-Ledger"; es existiert nicht, und
"Abweichungen vom Plan" erwaehnt das nicht.

**Gegenprobe A** zeigt die Folge fuer die Diagnose. Mutation:
`hardMinimumCapMonths` 24 auf 18 in `types/liquidity-runway-contract.js` - also
exakt die Slice-08-Groesse, die das geloeschte Slice-07-zu-08-Ledger gemessen
hat. Das Gate faellt weiterhin zu, aber die vollstaendige Diagnose lautet jetzt:

```
[{ "actual": "3a252f36...", "expected": "165766b1...",
   "path": "targetActualSha256" }]
```

Die Assertion heisst weiterhin "should reproduce exactly with field-level
diagnostics". Feldebene gibt es nicht mehr - es bleibt ein nackter
Hashvergleich ueber die gesamte Projektion. Wer diesen Fehlschlag in drei
Monaten sieht, erfaehrt nicht, welche Groesse sich veraendert hat.

### Weitere Befunde

**CR10-4 - Planungssicht und realisierte Steuer verwenden verschiedene
Steuermerkmale.** `simulator-portfolio-tranches.js:361` setzt in
`buildInputsCtxFromPortfolio` fest `tqfAlt: 0` und `tqfNeu: 0`;
`sale-engine.mjs:247` und `:254` setzen fuer die aggregierten Alt-/Neu-Pseudo-
Tranchen fest `taxExempt: false`. Die per Tranche gepflegten Merkmale gehen auf
diesem Weg vollstaendig verloren. Die realisierte Steuer entsteht dagegen in
`calculateTrancheTax` je Tranche und respektiert beide Merkmale. Ein Haushalt
mit steuerfreien Positionen oder mit einer bestaetigten Teilfreistellung plant
damit systematisch zu hohe Steuer und verkauft entsprechend zu viel. Vorher
stand an derselben Stelle die pauschale 0,30 - der Slice hat die erfundene
Konstante ausgetauscht, nicht die Erfindung beseitigt. D-07 ist an dieser
Stelle nicht geschlossen.

**CR10-5 - Der neue Wurf hat keinen Zeugen und keine Fehlerbehandlung.**
`simulator-engine-direct.js:818` wirft neu
`Simulator-Liquiditaets-Contract verletzt`, wenn die Jahressteuer die Liquiditaet
unter -0,01 druecken wuerde. Ich habe versucht, ihn auszuloesen, und halte ihn
derzeit fuer unerreichbar: Die Verzinsung wird erst **nach** der Auszahlung auf
die Restliquiditaet gutgeschrieben, die Zinssteuer betraegt also rund
`0,26 * rC * liq` gegenueber einem Bestand von `liq * (1 + rC)`. Genau deshalb
gibt es keinen Zeugen. Wenn er dennoch feuert, ist die Wirkung unbelegt und
unverhaeltnismaessig: Weder `monte-carlo-runner.js` noch `sweep-runner.js`
besitzen ein `try`/`catch` um die Jahresschleife (nur
`historical-backtest-runner.js:510` faengt). Ein einziger betroffener Lauf
bricht damit die gesamte Monte-Carlo-Charge beziehungsweise den Sweep-Chunk ab
statt nur sich selbst.

**CR10-6 - Die geloeschte Begruendung der Nullklemme.**
`simulator-tax-recompute.js` hatte bisher `Math.max(0, rawTaxCashAdjustment)`
mit dem Kommentar, dass ein negativer Cashwert die naechste Engine-Validierung
scheitern laesst und Monte Carlo diesen Validierungsfehler dann als
Portfolio-Ruin fehlklassifiziert. Der Slice ersetzt die Klemme durch eine
signierte Groesse und loescht den Kommentar ersatzlos, statt ihn auf die neue
Absicherung zu aktualisieren. Der dokumentierte historische Vorfall ist damit
aus dem Code verschwunden. Zusaetzlich aendert sich die Toleranz von
`Math.max(0, raw)` auf `Math.abs(raw) <= 0.01 ? 0 : raw`: Eine positive
Erstattung unterhalb eines Cent wurde vorher durchgereicht und wird jetzt
verworfen.

**CR10-7 - Die Kategoriegrenze ist unvollstaendig, die alte Goldkodierung
bleibt wirksam.** `TRANCHE_TQF_CATEGORY_UNSUPPORTED` feuert nur fuer
`money_market` und `bonds`. Eine Gold- oder Cash-Tranche mit `tqf: 0.30` bleibt
vertragskonform, obwohl Steuervertragspunkt 4 die Teilfreistellung als reines
Aktienfondsmerkmal beschreibt. Gleichzeitig bleibt die alte Kodierung der
Goldsteuerfreiheit als `tqf: 1.0` gueltig **und wirksam**: In
`calculateTrancheTax` liefert `bruttogewinn * (1 - 1.0)` weiterhin 0. Nach der
Umstellung existieren damit zwei parallele, beide wirksame Kodierungen
derselben Steuerfreiheit - bestehende Profile nutzen die alte, neue Tranchen die
neue. D-08 verlangt genau die Beseitigung solcher impliziten Ableitungen.

**CR10-8 - Die Migrationswirkung ist unbeziffert und unsichtbar.**
`readTaxExempt` migriert jeden v0/v1-Datensatz konservativ auf
`taxExempt: false`, und `initializePortfolioDetailed` senkt den Aktien-Default
von 0,30 auf 0. Fuer jeden Bestandsnutzer ohne explizit gepflegte
Teilfreistellung steigt damit die simulierte Steuerlast. Die
Gegenprobe (Default zurueck auf 0,30) laesst drei Assertionen fallen, die
Richtung ist also gepinnt - die **Groesse** der Wirkung steht nirgends, und die
Oberflaeche weist den Nutzer bei der Migration nicht darauf hin. "Offene
Risiken" nennt die Notwendigkeit einer Nutzerbestaetigung, aber nicht, dass bis
dahin gerechnet wird.

**CR10-9 - Die Pflichtgrenze haengt am selbst gesetzten Feld.**
`readTaxExempt` verlangt ein explizites `taxExempt` nur, wenn
`schemaVersion === 2`. Ein Datensatz ohne `schemaVersion` faellt ueber
`readSchemaVersion` auf 0 und wird still als nicht steuerfrei uebernommen -
anschliessend aber als Version 2 zurueckgeschrieben. Ein Datensatz, der aus
irgendeinem Grund `schemaVersion: 2` traegt, ohne `taxExempt` zu besitzen,
scheitert dagegen mit `TRANCHE_TAX_EXEMPT_REQUIRED`. Die Grenze zwischen
stiller Migration und hartem Fehler haengt damit an genau dem Feld, das
derselbe Schreibpfad setzt.

**CR10-10 - Der CR09-4-Zeuge ist nicht diskriminierend.** Der neue Zeuge prueft
`Math.max(0, floor_aus_depot - entnahme_effektiv) === 0` in einem Jahr mit
reichlich Vermoegen und ohne Marktstress. Das ist trivial erfuellt. Der
fachlich interessante Fall - Gesamtvermoegen deckt den Floor, die Liquiditaet
aber nicht, ausdruecklich **kein** Ruin laut
`simulator-engine-direct.js:692` - ist nicht abgedeckt. AK 1 ist damit dem
Wortlaut nach erfuellt und der Sache nach nicht.

**CR10-11 - Der neue Basismarker wird von keiner Metrik gelesen.**
`flex_haushalt_basis` unterscheidet korrekt zwischen
`effective_vpw_plus_pension_surplus` und `static_input`. Ausgewertet wird er
nur in `tests/simulation.test.mjs:758`. `historical-backtest-metrics.js`
summiert `flex_brutto_haushalt` und `flex_haushalt_erfuellt` weiterhin ohne
Ruecksicht auf den Marker. Ein Lauf, der durch einen VPW-Sicherheitsstufenwechsel
mitten im Pfad zwischen beiden Basen springt, addiert damit zwei verschiedene
Groessen in `flex_required_total_nominal_eur` und in den `flex_reduction_*`-Metriken.

**CR10-12 - Der Ergebnisabschnitt ist hinter den Slice-08/09-Standard
zurueckgefallen.** "Ausgefuehrte Tests" nennt fuer `npm test` und
`npm run test:coverage` jeweils nur "160 Testdateien, Exitcode 0". Slice 08 und
Slice 09 haben an dieser Stelle exakte Assertionszahlen, Coverageprozente und
absolute Zeilenzahlen dokumentiert, und genau diese Zahlen waren in beiden
Reviews der pruefbare Aufhaenger. Gemessen habe ich 17.890/17.890 und
78,36 Prozent (39.426/50.314); nachpruefbar dokumentiert ist davon nichts.

### Gegenproben

| Probe | Mutation | Ergebnis |
|---|---|---|
| A | `hardMinimumCapMonths` 24 auf 18 | faellt zu, aber ausschliesslich als Hashabweichung in `targetActualSha256`; keine Feldinformation |
| B | Aktien-TQF-Default zurueck auf 0,30 in `simulator-portfolio-init.js` | faellt zu: 3 Fehlassertionen |

### Geprueft und nicht beanstandet

- **D-06 Zinssettlement:** Der gemeinsame Jahrestopf ist korrekt implementiert
  und gepinnt. `simulator-tax-settlement.test.mjs` belegt den Verbrauch des
  bestehenden Pauschbetrags durch Zinsen, die signierte Cashbelastung und die
  gemeinsame Verrechnung von Verkaufsgewinn und Zins.
- **D-08 Verkaufspfad:** `taxExempt` wirkt konsistent in
  `calculateTrancheTax`, `calculateSaleAndTax`, `getSellOrder`,
  `sortTranchesTaxOptimized` und in der Profilverbund-Attribution. Die
  Verkaufsreihenfolge behandelt eine steuerfreie Tranche als steuerlast 0.
- **Dateninventar:** Der `embeddedValueHash` wird ueber
  `assertSimulationDataValueHash` aus dem Vertragswert berechnet, ist also
  nicht handgepflegt. Der Test bindet zusaetzlich die neuen Quelltextmuster.
- **CR09-14 Haushaltsbasis:** Die Ableitung
  `pensionFlexCapacity + vpw.dynamicFlex` ist konsistent mit
  `engine/core.mjs`: `vpwDiagnostics` entsteht nur bei effektivem Dynamic Flex,
  und `dynamicFlex` ist dort genau `inflatedBedarf.flex`. Der Stufe-2-Mindestflex
  laeuft im ausschliessenden Zweig und kann die Basis nicht verfaelschen.
- **Archivierte Evidenz:** Die Byte-Hashes der Slice-06-, Slice-07- und
  Slice-08-Fixtures und die daraus gelesenen exakten Slice-06-zu-07-Werte sind
  unveraendert.
- **Generierte Artefakte:** `engine.js`, `dist/` und `RuheStandSuite.exe` sind
  unberuehrt.

### Aufgeraeumter Pruefstand

Die Gegenproben A und B wurden ueber ein vorab erstelltes SHA-256-Manifest
byteidentisch zurueckgesetzt; alle drei beruehrten Dateien melden `OK`.
`git status --short` zeigt exakt dieselben Eintraege wie vor dem Review.

## Review-Ergebnis (Claude)

- **Status: blockiert**
- **Blocker:**
  - **CR10-1** - 31 exakte Cross-Slice-Orakelwerte aus Slice 06, 07 und 08
    ersatzlos geloescht, darunter das vollstaendige Slice-07-zu-08-Ledger und
    beide FlowDelta-Null-Assertionen. Dasselbe Muster war in Slice 08 Runde 1
    der Blocker CR08-2 und wurde dort durch exakte Neuverankerung behoben.
  - **CR10-2** - Die Slice-09-Messfixture wird nicht mehr verglichen; ihre elf
    Fall-Deltas und der D-17-Zeuge sind tote Daten.
  - **CR10-3** - Es gibt kein Slice-09-zu-Slice-10-Delta-Ledger. Die
    Steuerwirkung ist nachweislich vorhanden und nirgends beziffert; die
    verbliebene Absicherung ist ein einzelner opaker Hash ueber die gesamte
    Projektion.
- **Restrisiken:** CR10-4 bis CR10-12; uebernommen aus Slice 09 CR09-5 bis
  CR09-13 und CR09-15 bis CR09-20, aus Slice 08 CR08-17 und CR08-21 bis
  CR08-23, aus Slice 07 CR07-4 und CR07-7 bis CR07-15 sowie CR06-20 und
  CR06-23.
- **Pre-Mortem:** In drei Monaten faellt auf, dass eine Regression in der
  Runway- oder CAPE-Semantik seit Wochen unbemerkt im Code steht. Ursache:
  Slice 10 hat die 31 benannten Orakelwerte durch einen einzigen Hash ueber die
  gesamte Projektion ersetzt. Beim ersten Fehlschlag hat jemand den Hash neu
  verankert - das ist der uebliche und fast unvermeidliche Umgang mit einem
  opaken Hash, weil kein Feldname sagt, welche fachliche Groesse sich veraendert
  hat und ob die Aenderung gewollt war. Die Slices 06 bis 08 haben ihre
  Wirkungen dann zwar noch dokumentiert, aber kein Gate verlangt mehr, dass der
  Code sie reproduziert.

## Zweitreview von Claude (Runde 2)

**Reviewdatum:** 2026-08-02
**Pruefstand:** unverbuchter Arbeitsbaum auf Basiscommit `2e4867f` nach der
Nachbesserung zu CR10-1 bis CR10-12.
**Rolle:** adversariales Fremdreview; keine dauerhafte Aenderung an
Programmdateien.

### Selbstaendig nachgefahrene Gates

| Gate | Gemessen | Dokumentbehauptung |
|---|---|---|
| `npm test` | 160 Dateien, **17.930/17.930** Assertions, 0 Fehler, 0 offene Handles, 1 separates Gate | bestaetigt |
| `npm run test:coverage` | **78,40 Prozent** (39.539/50.430), beide Pflichtdatei-Gates | bestaetigt |
| `npm run test:browser` | **28/28** | bestaetigt |
| `npm run docs:evidence` | erfolgreich | bestaetigt |
| `npm run build:engine` | Fallback-Build; `engine.js`, `dist/` und `RuheStandSuite.exe` unveraendert | bestaetigt |
| `git diff --check` | sauber | bestaetigt |
| geaenderte Produktivdateien | **15** | S10-STOP-04: exakt fuenfzehn |

CR10-12 ist damit geschlossen: Die Abschlusszahlen stehen jetzt exakt im
Dokument und stimmen mit meiner Messung ueberein.

### CR10-1 bis CR10-3 - geschlossen

Codex hat die drei Blocker nicht durch Wiedereinsetzen der 31 Inline-Assertionen
geloest, sondern durch eine feldweise verglichene Projektion in der
Slice-10-Fixture. Das ist gleichwertig und in der Diagnose besser.

**CR10-1:** `crossSliceOracleProjection` enthaelt alle 31 Werte als benannte
Felder - den CAPE-Effekt, beide Early-Wage-JST-Orakel mit Vorher/Nachher und
Kuerzungsjahren sowie beide Arme des Slice-07-zu-08-Ledgers einschliesslich
beider `maxAbsolutePortfolioFlowDelta`-Nullwerte. Die Werte sind exakt neu
verankert, und der Steuereffekt auf sie ist sichtbar:

| Orakel | Slice 09 | Slice 10 |
|---|---:|---:|
| CAPE Endvermoegen | 56.705,98 | 47.270,09 |
| CAPE Steuer | -4.318,72 | -7.793,73 |
| CAPE Entnahme | -30.000 | -9.000 |
| Slice-07-zu-08 aktiver Arm Endvermoegen | -48.559,87 | -97.739,89 |
| Slice-07-zu-08 aktiver Arm Steuer | -3.157,35 | **+48.710,28** |
| beide Arme FlowDelta | 0 | 0 |

**CR10-2:** Die Slice-09-Fixture ist wieder aktive Eingangsquelle. Ihre elf
`existingCaseFinancialDeltas` und der vierjaehrige `d17Witness` bilden die
`source`-Seite jedes Ledgereintrags und werden damit bei jedem Lauf mitgeprueft.

**CR10-3:** `slice09To10DeltaLedger` beziffert je Fall Endvermoegen, Entnahme,
Steuer, FlowDelta und Outcomewechsel. Alle elf Faelle behalten
`outcomeChanged: false` und `FlowDelta 0`; die D-17-Diagnosewerte 2001, 2005,
2009 und 2010 sind mit Delta 0 und unveraendertem Status gepinnt.

**Gegenprobe C** belegt den Diagnosegewinn. Dieselbe Mutation wie in Runde 1
(`hardMinimumCapMonths` 24 auf 18) liefert jetzt statt eines nackten
Hashvergleichs benannte Feldpfade mit konkreten Werten, unter anderem:

```
crossSliceOracleProjection.earlyWage1930To1940.summaryEndWealthBefore
  erwartet 2740858.55, gemessen 2741348.63
slice09To10DeltaLedger.cases.0.summaryEndWealth.slice10
  erwartet -1722.99, gemessen -8538.68
```

### CR10-4 bis CR10-12 - einzeln nachgeprueft

| Finding | Zustand |
|---|---|
| CR10-4 | geschlossen: `buildInputsCtxFromPortfolio` bildet gewinngewichtete `tqfAlt`/`tqfNeu` und `taxExemptAlt`/`taxExemptNeu`; die Verkaufsengine liest beide |
| CR10-5 | geschlossen: der chargenbrechende Wurf ist entfernt und die Begruendung im Code vermerkt |
| CR10-6 | geschlossen: der historische MC-Ruin-Hinweis ist wiederhergestellt und praezisiert; geklemmt wird nur noch negatives Subcent-Rauschen |
| CR10-7 | geschlossen: positive TQF ist fuer **jede** Nicht-Aktien-Kategorie ungueltig, und Legacy-Gold `tqf: 1` wird am Persistenzrand explizit zu `tqf: 0` plus `taxExempt: true` migriert |
| CR10-8 | geschlossen: die Aktien-TQF bleibt erhalten, und `describeLegacyTaxMigration` nennt Anzahl und Art betroffener Legacy-Tranchen bis zur Bestaetigung |
| CR10-9 | geschlossen: `readTaxExempt` erlaubt die stille Migration nur noch bei `mode === 'persisted'`; der Engine-Rand verlangt das Merkmal unabhaengig von der Schemaversion |
| CR10-10 | geschlossen: der Zeuge startet mit `liquiditaet = 0` und ausreichendem Vermoegen nur in verkaufbaren Positionen und prueft, dass die erzwungene Liquidation den Floor vor der Auszahlung deckt |
| CR10-11 | geschlossen: `flexBasisConsistent` verlangt eine vollstaendige einheitliche Basis, sechs Deskriptoren sind angepasst, und `flexBasisContract` legt Beobachtung und Wirkung offen |
| CR10-12 | geschlossen: 17.930/17.930 und 78,40 Prozent (39.539/50.430) sind dokumentiert und von mir bestaetigt |

**Gegenprobe D:** `flexBasisConsistent` auf konstant `true` gesetzt - das
Metrikgate scheitert ("A run that switches household-flex basis is identified
explicitly", 365 bestanden, 1 Fehlassertion). Die Fail-closed-Regel aus CR10-11
ist wirksam gepinnt.

### Neue Befunde

**CR10-13 - Die gemessene Wirkung steht nur in der Fixture.**
Das Ledger beziffert jetzt, was Slice 10 wirtschaftlich bewirkt, und die
Groessenordnung ist erheblich:

| Fall | Endvermoegen | Steuer |
|---|---:|---:|
| `completed_1960_2020` | **-8.395.042,76** | +569.838,01 |
| `dynamic_flex_cape_legacy_step_2018_2025` | -49.180,02 | +51.867,63 |
| `three_bucket_minimum_flex_2005_2014` | -26.114,70 | +15.837,88 |
| `completed_numeraire_seam_1949_1952` | -18.398,47 | +12.344,04 |
| `wage_indexed_pension_jst_1935_1946` | -16.388,94 | +8.590,63 |

Alle elf Faelle verlieren Endvermoegen und zahlen mehr Steuer; nur
`dynamic_flex_cape_legacy_step_2018_2025` veraendert zusaetzlich die
Gesamtentnahme (-12.000 EUR). Im Ergebnisdokument taucht keine einzige dieser
Zahlen auf. "Durchgefuehrte Aenderungen" stellt nur fest, dass ein Ledger
existiert; "Offene Risiken" nennt die Notwendigkeit einer Nutzerbestaetigung,
aber nicht, dass historische Backtestergebnisse bis in den Millionenbereich
abweichen. Ein Leser des Ergebnisdokuments erfaehrt die wichtigste Konsequenz
des Slice nicht. Ein Absatz mit Richtung, Spannweite und Ursache wuerde
genuegen; die Zahlen liegen bereits vor.

**CR10-14 - Das Ledger deckt elf von zwoelf Faellen ab.**
`slice09To10DeltaLedger.cases` enthaelt elf Eintraege, direkt daneben steht
`sourceCaseCount: 12` und im selben Dokument `caseCount: 12`. Der in Slice 09
ergaenzte zwoelfte Fall `minimum_flex_d17_2000_2010` besitzt in der
Slice-09-Fixture keinen `existingCaseFinancialDeltas`-Eintrag und faellt deshalb
aus dem Ledger; erfasst sind nur seine vier D-17-Diagnosewerte. Ausgerechnet der
juengste Fall ist damit der einzige, dessen Vermoegens-, Entnahme- und
Steuerwirkung nicht beziffert ist. Die Nebeneinanderstellung von `cases: 11` und
`sourceCaseCount: 12` legt eine Vollstaendigkeit nahe, die nicht besteht.

**CR10-15 - Die Legacy-Migration ueberschreibt eine explizite Steuerfreiheit.**
In `types/tranche-contract.js` gilt

```js
migratedLegacyTaxExempt = category === 'gold' && tqf === 1;
...
const taxExempt = migratedLegacyTaxExempt ?? readTaxExempt(...)
```

`migratedLegacyTaxExempt` ist im Migrationszweig immer ein Boolean, nie `null`.
Fuer eine persistierte Nicht-Aktien-Tranche mit positiver TQF ungleich der
Goldkodierung - etwa eine Goldposition mit `tqf: 0.30, taxExempt: true` oder
eine Geldmarktposition mit `tqf: 0.30, taxExempt: true` - greift damit der
`??`-Zweig nicht, `readTaxExempt` wird nie aufgerufen, und das ausdruecklich
gesetzte `taxExempt: true` wird still auf `false` gesetzt. Der Fall ist schmal,
verletzt aber genau das Prinzip von D-08: Ein explizit gepflegtes Steuermerkmal
darf nicht aus anderen Feldern ueberschrieben werden.

**CR10-16 - Die aggregierte Planung bleibt systematisch verschieden.**
`effectiveTqf` bildet `1 - taxableGain / gain` mit
`gain = Math.max(0, marketValue - costBasis)`. Verlustpositionen tragen damit
weder zu `gain` noch zu `taxableGain` bei, und die abgeleitete Quote unterstellt
eine proportionale Entnahme ueber alle Lots. Der reale Verkauf sortiert
dagegen ueber `getSellOrder` beziehungsweise `sortTranchesTaxOptimized`
steueroptimiert und nimmt die am geringsten belasteten Positionen zuerst. Die
Planungssicht ist gegenueber der pauschalen Konstante deutlich besser, deckt
sich aber weiterhin nicht mit der realisierten Steuer. Die verbleibende
Abweichung ist nirgends beziffert.

**CR10-17 - Die Scope-Liste ist unvollstaendig und widerspricht sich.**
Der Abschnitt "Vorlaeufiger Programmdatei-Scope und erforderliche Erweiterung"
zaehlt die Dateien 1 bis 14 auf und endet mit dem Satz, der finale Scope sei
"auf genau zwoelf produktive Dateien erweitert". `profilverbund-balance.js`
fehlt als fuenfzehnte Datei vollstaendig, obwohl S10-STOP-04 sie ausdruecklich
freigibt und der Abschnitt "Durchgefuehrte Aenderungen" ihre Korrektur nennt.
Nachgezaehlt sind es exakt fuenfzehn geaenderte Produktivdateien; der Scope
stimmt also, seine Dokumentation nicht.

**CR10-18 - Die Deckungsbehauptung des entfernten Wurfs hat keinen Zeugen.**
Der neue Kommentar in `simulator-engine-direct.js` begruendet den Verzicht auf
den Wurf damit, der zusaetzliche signierte Steueranteil sei "durch den
verzinsten Cashbestand gedeckt". Meine eigene Nachrechnung stuetzt das - die
Verzinsung wird nach der Auszahlung auf die Restliquiditaet gutgeschrieben, die
Zinssteuer betraegt rund `0,26 * rC * liq` gegenueber einem Bestand von
`liq * (1 + rC)`. Ein Zeuge dafuer existiert aber nicht, und die Absicherung
liegt jetzt allein bei der naechsten Enginegrenze. Das ist gegenueber dem
chargenbrechenden Wurf die richtige Entscheidung, laesst die Invariante aber
unbelegt.

### Geprueft und nicht beanstandet

- **Dateiscope:** exakt fuenfzehn geaenderte Produktivdateien, deckungsgleich
  mit S10-STOP-04.
- **Archivierte Evidenz:** Die Byte-Hashes der Slice-06-, Slice-07- und
  Slice-08-Fixtures und die daraus gelesenen exakten Slice-06-zu-07-Werte sind
  unveraendert; die Slice-08-Fixture bleibt byteidentisch gebunden.
- **Synthetische Profiltranchen:** `buildSyntheticProfileTranches` erzeugt jetzt
  vollstaendige Schema-2-Lots; Equity behaelt seine TQF, Gold traegt
  `taxExempt` statt `tqf: 1`, Geldmarkt traegt keines von beidem.
- **Outcomes:** Kein Charakterisierungsfall wechselt sein Outcome, und
  `maxAbsolutePortfolioFlowDelta` bleibt in allen elf Faellen exakt 0 - die
  Steuerwirkung ist eine reine Ergebnisverschiebung, keine Bilanzverletzung.
- **Mein Runde-1-Text** ist im Dokument byteidentisch erhalten; Codex hat ihn
  nicht angefasst.

### Aufgeraeumter Pruefstand

Die Gegenproben C und D wurden ueber ein vorab erstelltes SHA-256-Manifest
byteidentisch zurueckgesetzt; alle drei beruehrten Dateien melden `OK`.
`engine.js`, `dist/` und `RuheStandSuite.exe` sind unveraendert. Ausser diesem
Ergebnisdokument ist keine Datei von mir veraendert.

## Review-Ergebnis (Claude, Runde 2)

- **Status: freigegeben**
- **Blocker: keine**
- **Geschlossen:** CR10-1 bis CR10-12, jeweils einzeln nachgeprueft; CR10-1 und
  CR10-3 zusaetzlich mit Gegenprobe C als diagnosefaehig nachgewiesen, CR10-11
  mit Gegenprobe D als fail-closed.
- **Auflagen vor Slice 11:** **CR10-13** (die gemessene Steuerwirkung - bis zu
  8,4 Mio EUR Endvermoegen und 570 TEUR Steuer in einem einzigen Fall - gehoert
  in Prosa ins Ergebnisdokument, nicht nur in die Fixture) und **CR10-14** (der
  zwoelfte Charakterisierungsfall gehoert ins Delta-Ledger).
- **Restrisiken:** CR10-15 bis CR10-18; uebernommen aus Slice 09 CR09-5 bis
  CR09-13 und CR09-15 bis CR09-20, aus Slice 08 CR08-17 und CR08-21 bis
  CR08-23, aus Slice 07 CR07-4 und CR07-7 bis CR07-15 sowie CR06-20 und
  CR06-23.
- **Pre-Mortem:** In drei Monaten vergleicht der Nutzer eine aeltere gespeicherte
  Backtestauswertung mit einer neuen und findet ein um Millionen niedrigeres
  Endvermoegen. Er sucht die Ursache in den historischen Reihen oder in der
  Entnahmelogik, weil das Ergebnisdokument von Slice 10 keine Groessenordnung
  nennt und die Steuerkorrektur dort als reine Vertragsbereinigung erscheint.
  Die Zahl steht in `tax-logic-slice-10-backtest-measurement-v1.json`, aber
  niemand liest eine Testfixture, um einen Ergebnissprung zu erklaeren.
