# Slice 12 - Typisierte Balance-Importe und Marktprovenienz

**Stand:** 2026-07-28  
**Status:** freigegeben - unabhaengiges Re-Review (Claude & Gemini) abgeschlossen  


**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini), optional Claude  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** IMP-01 bis IMP-03  
**Prioritaet:** P1

Balance-JSON-Importe erhalten einen expliziten, versionierten Feldvertrag mit
strikten Typen und Bounds. String-Booleans werden im aktuellen Schema
abgewiesen und ausschliesslich in einem benannten Legacy-Migrator
symmetrisch normalisiert.

Manuelle Markt-CSVs werden vor jeder Mutation an Modus, Zielperiode und
erwarteten ISO-Stichtag gebunden. Quelle, Instrument, Importzeit,
Periodenabdeckung, Zeilenzahl und Hoch-Scope werden gemeinsam mit den
Marktdaten persistiert und nach Reload sowie in der Diagnose sichtbar.

## Verbindliche Entscheidung D-13

Eine manuelle CSV belegt ohne unabhaengigen Vollhistoriennachweis kein
Allzeithoch. Der Parser exponiert daher ausschliesslich ein `windowHigh`.
Der Nutzer hat am 2026-07-28 die gerichtete konservative Untergrenze
entschieden: Liegt `windowHigh` echt ueber dem letzten CSV-Kurs, werden Wert
und beobachtete Jahre als belegte Untergrenze des wahren ATH-Abstands an den
bestehenden Engine-Eingabevertrag gereicht. Faellt das Fensterhoch dagegen
mit dem letzten Kurs zusammen, traegt die Untergrenze keine Information ueber
ein echtes ATH; der Engine-Eingang bleibt dann ATH-neutral. Die Provenienz
behauptet in beiden Faellen kein echtes ATH und kennzeichnet die
Engine-Nutzung separat mit
`window_high_as_conservative_ath_lower_bound` und `applied: true|false`.

## Akzeptanzkriterien

- O-16 und O-17 sind gruen.
- Das aktuelle Balance-Importschema akzeptiert fuer Booleanfelder nur echte
  JavaScript-Booleans.
- `"false"`, `"0"`, `false`, `true`, fehlend und ungueltig sind explizit
  getestet; kein nichtleerer String aktiviert eine Checkbox.
- Der benannte Legacy-Migrator normalisiert die unterstuetzten historischen
  Booleanrepraesentationen symmetrisch und weist unbekannte Werte ab.
- Importierte Dynamic-Flex-/Go-Go-Flags bleiben nach Apply und Reload
  semantisch identisch.
- Eine 2010 endende CSV kann keine aktuelle 2025/2026-Zielperiode speisen.
- Eine historische CSV ist nur im expliziten Modus `historical` zulaessig.
- Zielperiode und erwarteter ISO-Stichtag muessen exakt zum letzten
  CSV-Datenpunkt passen.
- Vier Datenzeilen erzeugen nur `windowHigh`, niemals ein verifiziertes
  Allzeithoch. Die interne Engine-Referenz bleibt als gerichtete konservative
  Untergrenze separat und sichtbar gekennzeichnet: positiver Fensterabstand
  wird angewendet, Gleichstand mit dem letzten Kurs bleibt ATH-neutral.
- Quelle, Instrument, Importzeit, Abdeckung, Zeilenzahl und High-Scope
  bleiben nach Reload und im Balance-Export/Diagnosezustand erhalten.
- CSV-Preview und Engine-Dry-run laufen vor Recovery-Snapshot und Live-Write.
- Ein ungueltiger oder spaet fehlschlagender Import stellt sichtbare Inputs
  und Storage wieder her.

## Scope

### Programmdateien

- `app/balance/balance-binder-imports.js`
- `app/balance/balance-reader.js`
- `app/balance/balance-main.js`
- `app/balance/balance-diagnosis-keyparams.js`
- `Balance.html`

Das entspricht dem im Hauptplan festgelegten Maximum von fuenf
Programmdateien.

### Tests und Dokumentation

- `tests/balance-reader.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-storage-contract.test.mjs`
- `tests/balance-annual-marketdata.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/README.md`
- `README.md`
- `Handbuch.html`
- `docs/reference/TECHNICAL.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/DATA_SOURCES.md`
- `docs/internal/SLICE_SUITE_DATA_12_BALANCE_IMPORT_PROVENANCE.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine Aenderung von Engine-Marktregime-, Entnahme-, Steuer- oder
  Spending-Semantik;
- kein behauptetes ATH aus manueller CSV ohne Vollhistoriennachweis;
- keine automatische Datenquellenrecherche oder externe ATH-Verifikation;
- keine Aenderung des Online-Yahoo-/CAPE-Vertrags;
- kein Profilbundle- oder Vollbackup-Import; diese folgen in Slice 14;
- keine Aenderung von `engine/`, `engine.js`, `dist/` oder
  `RuheStandSuite.exe`.

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-27 vor Anlage dieser Slice-MD.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber. Slice 11 ist freigegeben
und lokal committed (`ecb329c`). Der Branch besitzt keinen dokumentierten
Upstream und ist nur lokal.

## Diff-Risiko

```text
Geplante Dateien:
- app/balance/balance-binder-imports.js
- app/balance/balance-reader.js
- app/balance/balance-main.js
- app/balance/balance-diagnosis-keyparams.js
- Balance.html
- tests/balance-reader.test.mjs
- tests/balance-ui-orchestration.test.mjs
- tests/balance-storage-contract.test.mjs
- tests/balance-annual-marketdata.test.mjs
- tests/browser-smoke.test.mjs
- tests/README.md
- README.md
- Handbuch.html
- docs/reference/TECHNICAL.md
- docs/reference/BALANCE_MODULES_README.md
- docs/reference/DATA_SOURCES.md
- docs/internal/SLICE_SUITE_DATA_12_BALANCE_IMPORT_PROVENANCE.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Balance-JSON-Export-/Import-Roundtrip und Legacy-Migration
- Checkbox-/Dynamic-Flex-/Go-Go-Apply
- CSV-Parsing und Marktdaten-Engine-Dry-run
- Balance-Import-Recovery und Rollback
- Jahresperioden-/Online-Marktdaten-Metadaten
- Browser-Smoke fuer Import-Reject, Reload und Snapshotanzahl

Nicht anfassen:
- Engine-Marktregime-, Entnahme-, Steuer- oder Spending-Semantik
- Online-Yahoo-/CAPE-Contract
- Profilbundle-/Vollbackup-Import
- engine/
- engine.js
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/balance/balance-binder-imports.js app/balance/balance-reader.js app/balance/balance-main.js app/balance/balance-diagnosis-keyparams.js Balance.html tests/balance-reader.test.mjs tests/balance-ui-orchestration.test.mjs tests/balance-storage-contract.test.mjs tests/balance-annual-marketdata.test.mjs tests/browser-smoke.test.mjs tests/README.md README.md Handbuch.html docs/reference/TECHNICAL.md docs/reference/BALANCE_MODULES_README.md docs/reference/DATA_SOURCES.md docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen.
```

## Geplante Umsetzung

1. Importierbare Balance-Inputfelder in einem exportierten Schema V2 mit
   Typ, Bounds, Requiredness und erlaubten Enums inventarisieren.
2. Aktuelle Dokumente strikt validieren; `balance-state` V1 und die
   bestehenden Legacy-V0-Envelopes ueber benannte Migratoren aufwaerts
   migrieren.
3. Checkbox-Apply auch gegen unerwartete nicht-boolesche Storagewerte
   fail-safe machen.
4. CSV-Parser um Abdeckung und `windowHigh` erweitern, ohne ein ATH zu
   behaupten.
5. Manuellen CSV-Kontext aus Modus, Zieljahr, erwartetem Stichtag,
   Instrument und Dateiquelle validieren.
6. CSV-Werte zuerst nur im DOM anwenden und per Preview durch die Engine
   pruefen; danach den vorhandenen Recovery-/Replace-/Rollback-Vertrag
   verwenden.
7. Provenienz im State, nach Reload, im Export und in den
   Diagnose-Schluesselparametern bereitstellen.
8. Node-, Fault-Injection- und Browserfaelle sowie Vollsuite ausfuehren.

## Geplante Tests

- `node tests/run-single.mjs tests/balance-reader.test.mjs`
- `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`
- `node tests/run-single.mjs tests/balance-storage-contract.test.mjs`
- `node tests/run-single.mjs tests/balance-annual-marketdata.test.mjs`
- `npm test`
- `npm run test:browser`
- `git diff --check`

## Ergebnisse

- `BALANCE_IMPORT_INPUT_SCHEMA_V2` inventarisiert die importierbaren
  Balance-Inputs mit Typen, Requiredness, Bounds und Enums. Verschachtelte
  Entnahme-, Pflegebucket- und Tranchenwerte werden ueber eigene Vertraege
  validiert; unbekannte Felder und inkonsistente Alias-/Grenzwerte blockieren.
- Balance-Exporte verwenden `schemaVersion: 2` und
  `inputSchemaVersion: 2`. Version-1-Sicherungen laufen ueber einen benannten
  Aufwaertsmigrator; `targetEq: 0`, `rebalBand: 0` und damalige
  Prozentschreibweisen bleiben dabei semantisch erhalten.
- Der Recovery-Export bleibt auch bei erreichbaren, aber ausserhalb des
  aktuellen Importvertrags liegenden Livewerten moeglich. Solche Werte
  werden mit maschinenlesbarem Fehlercode und konkreter Feldmeldung unter
  `validationWarnings` inventarisiert; strukturelle Exportfehler reichen Code
  und Ursache bis in die UI durch.
- Aktuelle JSON-Dokumente akzeptieren nur echte Booleans. Der benannte
  Legacy-V0-Migrator normalisiert die unterstuetzten String-/Zahlformen
  symmetrisch und uebernimmt den historischen
  `bondRefillThresholdPct`-Alias in das kanonische Feld.
- `UIReader.applyStoredInputs()` aktiviert Checkboxen und den Rentenmodus nur
  noch per exaktem Boolean-`true`.
- Der Markt-CSV-Parser liefert Abdeckung, Zeilenzahl und `windowHigh`, aber
  kein verifiziertes ATH. Der Importplan bindet Modus, Zielperiode,
  ISO-Stichtag, Instrument und bereinigten Dateinamen vor jeder Mutation.
  Gemaess Nutzerentscheidung D-13 wird das Fensterhoch gerichtet als
  konservative ATH-Untergrenze verwendet: Ein 45-Prozent-Einbruch bleibt
  dadurch als `bear_deep` erkennbar, ein steigendes Fenster mit Hoch am
  letzten Datenpunkt bleibt ATH-neutral und behauptet kein `peak_hot`.
- Der CSV-Pfad nutzt `PREVIEW`, Recovery-Snapshot, atomaren Replace,
  `PERSIST_INPUTS` und eine exakte Provenienz-Bestaetigung. Fehler vor dem
  Replace schreiben nichts; spaete Fehler rollen Storage und DOM zurueck.
- `annualMarketDataMeta` traegt Quelle, Instrument, Importzeit, Abdeckung,
  Perioden-ID, Hoch-Scope und die getrennte `engineReference`. Dieselben Daten
  erscheinen nach Reload, im Balance-Export und in den
  Diagnose-Schluesselparametern.
- Die UI bietet die expliziten CSV-Kontextfelder und weist sichtbar darauf
  hin, dass ein lokales Fensterhoch kein ATH belegt.

## Abweichungen vom Plan

- Keine Scope-Abweichung: exakt die vorab dokumentierten fuenf
  Programmdateien wurden geaendert.
- `app/balance/balance-storage.js`, `balance-annual-marketdata.js` und
  `balance-annual-period.js` benoetigten keine Produktivaenderung; ihre
  bestehenden Vertraege wurden ueber Storage-, Annual- und Periodentests
  integriert verifiziert.
- Der erste Browserlauf deckte eine unzulaessige Neuzuweisung der
  schreibgeschuetzten DOM-`dataset`-Eigenschaft auf. Die Implementierung
  schreibt nun nur deren einzelne `data-*`-Felder; der Wiederholungslauf war
  vollstaendig gruen.

## Testresultate

- `node tests/run-single.mjs tests/balance-reader.test.mjs`: 142/142
  Assertions.
- `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`:
  223/223 Assertions.
- `node tests/run-single.mjs tests/balance-storage-contract.test.mjs`: 44/44
  Assertions.
- `node tests/run-single.mjs tests/balance-annual-marketdata.test.mjs`: 74/74
  Assertions.
- `node tests/run-single.mjs tests/balance-diagnosis-keyparams.test.mjs`:
  30/30 Assertions.
- `node tests/run-single.mjs tests/balance-annual-period.test.mjs`: 52/52
  Assertions.
- `npm test`: 8.446/8.446 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles.
- `npm run test:browser`: 17/17 Browser-Smokes, einschliesslich
  Markt-CSV-Import, Recovery-Snapshot, Boolean-Roundtrip,
  Provenienz-Reload und Diagnose.
- `npm run build:engine` war nicht erforderlich, weil weder `engine/` noch
  die oeffentliche `EngineAPI` geaendert wurden.

## Offene Risiken

- Ein manuelles CSV-Fenster kann ohne externe Instrument-/Vollhistorienquelle
  kein echtes ATH belegen. Die entschiedene Untergrenzen-Policy kann einen
  wahren Abstand unterschaetzen, aber keinen groesseren als den aus dem
  beobachteten Fenster ableiten.
- Die aktuelle Importgrenze validiert den Balance-Einzelstate. Profilbundle
  und Vollbackup bleiben bis Slice 14 getrennt gesperrte Vertraege.
- Der Dateiname belegt die lokale Quelle, aber keine externe Echtheit,
  Instrumentidentitaet oder Vollhistorie. Deshalb bleibt ein echtes ATH fuer
  diesen Pfad bewusst unverfuegbar.

## Rueckdokumentation

Umsetzungsstand, Testresultate, Abweichungen und Restrisiken sind in dieser
Datei sowie im Hauptplan dokumentiert. Commit, Push und Freigabe stehen aus.

## Freigabestatus

- Technische Umsetzung: Blocker-Nachbesserungen T12-1 und T12-3 abgeschlossen
- Selbstpruefung Codex: technisch abgeschlossen, keine Eigenfreigabe
- Re-Review Gemini/Claude/Nutzer: erfolgreich abgeschlossen; Slice 12 ist freigegeben
- Lokaler Commit: abgeschlossen

- Push: ausstehend; nur nach ausdruecklicher Nutzerfreigabe


## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| S12-1 | Claude | Export laeuft durch den Importvertrag und bricht bei erreichbaren Livewerten ab; `handleExport` verwirft Code und Feldnennung | Blocker | technisch nachgebessert: Recovery-Export mit `validationWarnings`, strukturelle Fehler mit Code und Feld |
| S12-2 | Claude | Bestehende `schemaVersion: 1`-Dateien werden ohne Versionsbump abgewiesen; `targetEq: 0` widerspricht der Nullgrenzenentscheidung aus Slice 03 | Blocker | technisch nachgebessert: Export-/Inputschema V2, benannter V1-Migrator und Nullgrenzen-Roundtrip |
| S12-3 | Claude | D-13 ist umgesetzt, ohne entschieden zu sein; `ath = 0` schaltet die Baerenmarkterkennung des CSV-Pfads ab (gemessen `side_long` statt `bear_deep`) | Nutzerentscheidung 2026-07-28: gerichtete konservative Fensterhoch-Untergrenze | technisch nachgebessert: positiver Fensterabstand ergibt `bear_deep`; Fensterhoch am letzten Kurs bleibt ATH-neutral |
| S12-4 | Claude | Jede Marktdatenkorrektur nach einem CSV-Import sperrt den Export ueber die Provenienz-Kreuzpruefung | Restrisiko | technisch nachgebessert: Export bleibt moeglich und markiert `invalid_market_provenance` |
| S12-5 | Claude | Nach spaetem CSV-Fehlschlag bleiben die verworfenen Preview-Ergebnisse sichtbar, waehrend die Provenienzzeile sie verneint | Restrisiko | offen |
| S12-6 | Claude | `getMarketDataProvenanceViewModel` und `buildKeyParams` leiten `highScope` unterschiedlich ab (`allTimeHigh` gegen `unbekannt`) | Restrisiko | technisch nachgebessert: identischer `allTimeHigh`-Fallback und sichtbare Engine-Policy |
| S12-7 | Claude | Der Exportpfad ist nur gegen einen Synthetikzustand mit fuenf von 66 Vertragsfeldern getestet | Restrisiko | technisch nachgebessert: Produktionsreader plus alle sieben gemessenen Livevarianten und Nullgrenzen |
| S12-8 | Claude | Die Onlineprovenienz wird beim Schreiben nicht gegen `validateAnnualMarketDataMeta` geprueft | Hinweis | offen |
| S12-9 | Claude | `normalizeSourceFileName` filtert nur Steuerzeichen; heute nicht ausnutzbar, aber als Vertrag zu eng | Hinweis | offen |
| S12-10 | Claude | Der CSV-Pfad schreibt einen State ohne `validateBalanceState`, der danach nicht mehr exportierbar sein kann | Restrisiko | technisch nachgebessert: Vollvalidierung vor Replace und nach Abschlusswrite |
| T12-1 | Claude | `migrateBalanceStateV1` ruft `validateBalanceState` nicht auf; als `schemaVersion: 1` gekennzeichnete Dokumente umgehen den kompletten Eingabevertrag, der Legacy-V0-Pfad ebenso | Blocker | technisch nachgebessert: V1 und Legacy-V0 enden nach expliziten Migrationen am vollstaendigen V2-Vertrag |
| T12-2 | Claude | Mit `validationWarnings` exportierte Dokumente sind nicht reimportierbar; das Feld traegt hoechstens einen Eintrag statt eines Inventars | Restrisiko | offen |
| T12-3 | Claude | Faellt das Fensterhoch mit dem letzten CSV-Datenpunkt zusammen, meldet die Engine `peak_hot` mit der Begruendung "Neues Allzeithoch" - die von D-13 verbotene Behauptung | Blocker | technisch nachgebessert: Engine-Referenz nur bei `windowHigh > endeVJ`; Gleichstand liefert `ath = 0`, `side_long` und `applied: false` |
| T12-4 | Claude | Der CSV-Import scheitert seit der Nachbesserung an vertragsfremden Livewerten, waehrend der Export dafuer nur warnt | Restrisiko | offen |
| T12-5 | Claude | `migrateLegacyPercentRate` skaliert `kirchensteuerSatz` heuristisch, obwohl Version 1 dort bereits ein Enum vorschrieb | Hinweis | technisch nachgebessert: Kirchensteuer wird nicht heuristisch skaliert und muss nach Migration dem Enum entsprechen |
| T12-6 | Claude | Die Bezeichnung "Variante A" im Hauptplan widerspricht der Variantenliste des Erstreviews; umgesetzt ist die dort als (b) gefuehrte Variante | Hinweis | technisch nachgebessert: Entscheidung wird nur noch beschreibend als gerichtete konservative Fensterhoch-Untergrenze dokumentiert |
| U12-1 | Claude | Der strenge Vertrag trifft nach der Schliessung von T12-1 auch echte Altdateien; unbekannte Felder und Bereichsverletzungen werden ohne Verwerfen-, Klemm- oder Hinweispfad abgewiesen | Restrisiko | offen |
| U12-2 | Claude | Die Bedeutung von `schemaVersion: 2` hat innerhalb des Slice zweimal ohne Versionswechsel gewechselt; nutzerseitig nicht erreichbar, ab Auslieferung versionierungspflichtig | Hinweis | offen |
| U12-3 | Claude | Alte manuelle CSV-Provenienz ohne gueltiges `high.yearsSince` bleibt ohne Ausweichweg unlesbar | Hinweis | offen |

## Review-Feedback von Claude

**Datum:** 2026-07-27
**Reviewer:** Claude (Primary Reviewer & Analyst)
**Pruefgegenstand:** Arbeitsstand von Slice 12 auf `codex/suite-datenintegritaet-hardening`,
sechs geaenderte Programm-/Auslieferungsdateien (`app/balance/balance-binder-imports.js`,
`app/balance/balance-reader.js`, `app/balance/balance-main.js`,
`app/balance/balance-diagnosis-keyparams.js`, `Balance.html`, `Handbuch.html` als
dokumentierte Handbuchdatei), sieben Testdateien und sechs Dokumentationsdateien.

### Verifikationsbasis

Alle Aussagen dieses Reviews sind gemessen, nicht gelesen.

- Gates unabhaengig nachgefahren: `npm test` 8.402/8.402 Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles; `npm run test:browser`
  17/17 Browser-Smokes, Exit 0; `git diff --check` gruen.
- Vier eigene Messsonden gegen den Produktivcode:
  1. Produktionsreader (`UIReader.readAllInputs`) mit einem Mock-DOM aus den
     tatsaechlichen `Balance.html`-Defaults, danach `createBalanceExportDocument`
     ueber zehn Feldvarianten.
  2. `parseMarketDataCsv` und `createManualMarketCsvImportPlan` an einer
     Vierjahres-CSV, danach Exportpruefung des entstehenden States sowie
     Import bestehender `schemaVersion: 1`-Dokumente in sieben Varianten.
  3. `MarketAnalyzer.analyzeMarket` mit und ohne D-13-Nullsetzung des ATH.
  4. `getMarketDataProvenanceViewModel` gegen `buildKeyParams` an identischer
     Provenienz.
- Statische Gegenpruefung des Engine-Konsums von `ath`/`jahreSeitAth`
  (`engine/analyzers/MarketAnalyzer.mjs`, `engine/planners/flex-rate-policy.mjs`,
  `engine/planners/alarm-policy.mjs`, `engine/planners/spending-guardrails.mjs`,
  `engine/transactions/sale-engine.mjs`, `engine/config.mjs`) sowie des
  Schreibpfads der Onlineprovenienz (`app/balance/balance-annual-marketdata.js`).

### Prueferergebnis nach den fuenf Pruefdimensionen

**1. Korrektheit.** Der Feldinventar-Abgleich ist vollstaendig: Der
Produktionsreader liefert 65 Felder, das Schema kennt 66; die einzige Differenz
ist das optionale `depotLastUpdate`, das der Reader nicht erzeugt. Es gibt kein
Reader-Feld ohne Schemaeintrag. Der Boolean-Fix wirkt in beide Richtungen
(`el.checked = storedInputs[key] === true`, `renteAktiv` ueber exaktes `=== true`).
Der CSV-Parser liefert Abdeckung, Zeilenzahl und `windowHigh` korrekt; die
Zweigverteilung der Kontextvalidierung wurde an gueltigen und ungueltigen
Stichtagen geprueft. Nicht geprueft wurde vom Slice der Rueckweg: Kein Test
fuehrt eine reale `readAllInputs()`-Ausgabe durch `createBalanceExportDocument`
(siehe S12-7).

**2. Vertragstreue.** Hier liegen die schwersten Befunde. Der Export laeuft seit
diesem Slice durch denselben strikten Importvertrag (`createBalanceExportDocument`
ruft `validateBalanceState`), ohne dass die Bounds gegen die Wertebereiche des
Readers und der HTML-Felder abgeglichen wurden (S12-1). Die
`BALANCE_EXPORT_SCHEMA_VERSION` bleibt bei 1, obwohl der akzeptierte Wertebereich
messbar geschrumpft ist (S12-2). Der CSV-Pfad schreibt einen State, den der
gleiche Modulvertrag danach ablehnen kann (S12-10).

**3. Fehlerbehandlung.** `handleExport` faengt mit `catch {` ohne Bindung und
verwirft damit `code` und Meldung des `BalanceImportError`. Die praezise
Diagnose existiert, erreicht die Nutzenden aber nie (Teil von S12-1). Nach
einem spaeten CSV-Fehlschlag werden DOM, Storage und Provenienzzeile
zurueckgerollt, die gerenderten Ergebnisse jedoch nicht (S12-5).

**4. Seiteneffekte.** Die neue Provenienz erreicht zwei Renderer, die
unterschiedliche Ergebnisse liefern (S12-6). Der Onlinepfad schreibt seine
Metadaten weiterhin ungeprueft und erfuellt den neuen Vertrag nur zufaellig
(S12-8). Positiv gegengeprueft: Beide Provenienzrenderer schreiben ausschliesslich
ueber `textContent`/`replaceChildren`; der ungefilterte Dateiname ist damit heute
nicht ausnutzbar (S12-9). Ebenfalls gegengeprueft: Die vier neuen
`marketCsv*`-Felder gelangen ueber `document.querySelectorAll('input, select')`
automatisch in `dom.inputs`; der CSV-Pfad ist damit im echten Browser erreichbar.

**5. Was koennte brechen?** Die am wenigsten durchdachte Stelle ist D-13. Die
Entscheidung wurde umgesetzt, obwohl der Stop-/Reviewpunkt des Slice sie
ausdruecklich voraussetzt und der Hauptplan fuer D-13 nur eine `Empfehlung`
fuehrt, die dort explizit als "kein Nutzer- oder Reviewfreigabe" gekennzeichnet
ist (S12-3). Die gemessene Folge ist keine Randnotiz: Der manuelle CSV-Pfad
schaltet die Baerenmarkterkennung der Engine vollstaendig ab.

### Blocker

#### S12-1 (Blocker): Der Export ist an den Importvertrag gebunden und bricht bei erreichbaren Livewerten ab

`createBalanceExportDocument` validiert seit diesem Slice den kompletten
Livezustand gegen `BALANCE_IMPORT_INPUT_SCHEMA_V1`. Die Bounds des Schemas sind
enger als die Wertebereiche, die `UIReader.readAllInputs` und `Balance.html`
tatsaechlich erzeugen. Gemessen mit dem Produktionsreader an einem Mock-DOM aus
den HTML-Defaults:

| Livezustand | Export moeglich | Fehlercode | Ursache |
|---|---|---|---|
| Standardformular mit HTML-Defaults | ja | - | - |
| `rebalBand` geleert | nein | `invalid_input_bounds` | Reader-Fallback 0, Schema `min: 1` |
| `aktuellesAlter` geleert | nein | `invalid_input_bounds` | `parseInt('') \|\| 0`, Schema `min: 18` |
| `inflation` 60 | nein | `invalid_input_bounds` | HTML ohne `max`, Schema `max: 50` |
| `horizonYears` 30,5 | nein | `invalid_input_type` | `parseFloat`, Schema `integer: true` |
| `profilName` 250 Zeichen | nein | `invalid_input_type` | HTML ohne `maxlength`, Schema `maxLength: 200` |
| `flexBudgetYears` 12 | nein | `invalid_input_bounds` | Schema `max: 10` |
| `tqfAlt` 30 (Prozentschreibweise) | nein | `invalid_input_bounds` | Schema `max: 1` |

Der einfachste erreichbare Fall ist das Leeren des Feldes "Rebalancing-Band":
`finiteNumber('rebalBand', 0)` liefert dann 0, das Schema fordert mindestens 1,
und der Exportknopf funktioniert ab diesem Moment nicht mehr. Verschaerfend
verwirft `handleExport` die praezise Meldung:

```js
} catch {
    UIRenderer.handleError(new AppError('Export nicht moeglich: Der Balance-Zustand ist unvollstaendig oder beschaedigt. Bitte die Eingaben pruefen.'));
}
```

Der `BalanceImportError` benennt Feld und Grenze exakt; die Nutzenden erhalten
davon nichts. In einem Datenintegritaets-Slice ist der Export der letzte
Sicherungspfad; er darf nicht ohne benannte Ursache ausfallen.

**Erwartete Aufloesung:** Bounds gegen Reader-Defaults und HTML-Attribute
abgleichen, den Exportpfad entweder auf eine gesonderte, weitere Validierung
stellen oder Verletzungen als benannte Warnung mit Feldnennung ausgeben, und den
Fehlercode in jedem Fall durchreichen.

#### S12-2 (Blocker): Rueckwaertskompatibilitaet gebrochen ohne Versionsbump

`BALANCE_EXPORT_SCHEMA_VERSION` bleibt 1, der akzeptierte Wertebereich schrumpft
aber materiell. Bestehende Sicherungsdateien tragen dieselbe Versionsnummer und
werden abgewiesen. Gemessen an `normalizeBalanceImportDocument` mit einem
korrekt aufgebauten `schemaVersion: 1`-Dokument:

| Bestehende Exportdatei | importierbar | Fehlercode |
|---|---|---|
| unveraenderte Pflichtfelder | ja | - |
| `rebalBand: 0` (Leerfeld-Default des Readers) | nein | `invalid_input_bounds` |
| `aktuellesAlter: 0` (Leerfeld) | nein | `invalid_input_bounds` |
| `targetEq: 0` | nein | `invalid_input_bounds` |
| unbekanntes Zusatzfeld | nein | `unknown_input_field` |
| `kirchensteuerSatz: 8` statt `0.08` | nein | `invalid_input_bounds` |

Der Fall `targetEq: 0` widerspricht direkt der in Slice 03 getroffenen
Nullgrenzenentscheidung: Dort wurde der stille `|| 60`-Fallback entfernt, damit
eine explizite 0 erhalten bleibt. Slice 12 weist genau diesen Wert nun ab. Die
Fehlermeldung nennt eine Zahlengrenze, nicht "aeltere Datei"; die Nutzenden
haben keinen Hinweis darauf, dass ihre Sicherung unbrauchbar geworden ist.

**Erwartete Aufloesung:** Entweder Schema-/Exportversion erhoehen und einen
benannten Aufwaertsmigrator fuer v1-Dokumente vorsehen, oder die Bounds so
weiten, dass jeder von der Vorversion erzeugbare Wert weiterhin importierbar
bleibt.

#### S12-3 (Blocker): D-13 ist implementiert, aber nicht entschieden - und schaltet die Baerenmarkterkennung ab

Der Hauptplan fuehrt D-13 ausschliesslich in der Spalte `Empfehlung`. Direkt
ueber der Tabelle steht: "Die Spalte `Empfehlung` ist ein Planvorschlag, keine
Nutzer- oder Reviewfreigabe." Zum Vergleich traegt D-14 den ausdruecklichen
Vermerk "am 2026-07-27 durch den Nutzer entschieden". Fuer D-13 fehlt ein
solcher Vermerk, waehrend der Stop-/Reviewpunkt des Slice verlangt: "D-13 muss
entschieden sein." Die Slice-MD bezeichnet D-13 dennoch als "Verbindliche
Entscheidung".

Die fachliche Folge ist gemessen. `ath: 0` fuehrt in
`engine/analyzers/MarketAnalyzer.mjs` ueber `isPositiveFinite(ath) === false` zu
`hasAthBasis === false` und damit in den neutralen Fallback:

| Marktlage aus derselben CSV | `ath` an die Engine | `sKey` | ATH-Abstand | Szenario |
|---|---|---|---|---|
| Fenster 150 auf 110 | 0 (D-13) | `side_long` | `null` | Seitwaerts Lang |
| Fenster 150 auf 110 | 150 (`windowHigh`) | `bear_deep` | 26,7 % | Tiefer Baer |
| Fenster 100 auf 55 | 0 (D-13) | `side_long` | `null` | Seitwaerts Lang |
| Fenster 100 auf 55 | 100 (`windowHigh`) | `bear_deep` | 45,0 % | Tiefer Baer |

`sKey === 'bear_deep'` ist im gesamten Engine-Pfad der einzige Ausloeser fuer die
defensive Reaktion: `engine/planners/flex-rate-policy.mjs` bildet die Kuerzung als
`50 + max(0, abstandVomAthProzent - 20)` ausschliesslich in diesem Zweig, also
75 Prozentpunkte bei 45 % Abstand gegenueber 0 unter D-13; die
`FLEX_BUDGET.ACTIVE_REGIMES` sind `['bear_deep', 'recovery_in_bear']`;
`alarm-policy.mjs` setzt `isCrisis` nur bei `bear_deep`; `sale-engine.mjs` und
`transaction-action.mjs` fuehren eigene Baerenzweige. Nach einem manuellen
CSV-Import empfiehlt die App im 45-Prozent-Einbruch also die volle flexible
Entnahme statt einer Kuerzung um bis zu 75 Prozentpunkte.

Entscheidend fuer die ausstehende Nutzerentscheidung ist die Asymmetrie: Ein
`windowHigh` ist eine **untere Schranke** des wahren Allzeithochs. Ein daraus
berechneter ATH-Abstand ist damit ebenfalls eine untere Schranke des wahren
Abstands - er kann den Markt nie staerker darstellen als er ist. Die gewaehlte
Umsetzung verwirft mit der unbelegten ATH-Behauptung zugleich die konservative
Schranke und landet bei der am wenigsten defensiven der drei moeglichen
Varianten. Die Slice-MD und die UI weisen `windowHigh` korrekt als "kein ATH"
aus; ueber die Regimefolge sagen beide nichts.

**Erwartete Aufloesung:** D-13 dem Nutzer mit dieser Messung zur Entscheidung
vorlegen. Zur Wahl stehen mindestens: (a) unveraendert `ath = 0` mit
dokumentierter Abschaltung der Baerenerkennung; (b) `windowHigh` als
konservative untere ATH-Schranke an die Engine, weiter ohne ATH-Behauptung in
der Provenienz; (c) Blockade des CSV-Pfads ohne unabhaengigen
Vollhistoriennachweis, wie der Stop-/Reviewpunkt sie als Alternative nennt.

### Restrisiken und Hinweise

#### S12-4: Jede Marktdatenkorrektur nach einem CSV-Import sperrt den Export

`validateBalanceState` verlangt bei `sourceType === 'manual_csv'` exakt
`inputs.endeVJ === marketMeta.price`, `inputs.ath === 0` und
`inputs.jahreSeitAth === 0`. Gemessen:

| Zustand nach CSV-Import | Export moeglich | Fehlercode |
|---|---|---|
| unveraendert | ja | - |
| Nutzer korrigiert `endeVJ` von 110 auf 111 | nein | `invalid_market_provenance` |
| Nutzer traegt ein extern belegtes ATH ein | nein | `invalid_market_provenance` |
| identische Inputs ohne Provenienz | ja | - |

Die Kopplung selbst ist richtig: Nach einer Aenderung stimmt die Provenienz
nicht mehr. Falsch ist die Reaktion. Der zweite Fall ist besonders ungluecklich,
weil D-13 dem Nutzer das ATH gerade wegnimmt und die naheliegende Abhilfe - es
aus einer eigenen Quelle nachzutragen - den Sicherungspfad sperrt. Ein
Invalidieren beziehungsweise Loeschen der Provenienz waere die passende Antwort;
die einzige heute vorhandene Loesung ist "Nachruecken", das die Marktwerte
zusaetzlich verschiebt.

#### S12-5: Nach spaetem CSV-Fehlschlag zeigt die Oberflaeche die verworfenen Preview-Ergebnisse weiter an

`update()` rendert Summary, Handlungsanweisung und Diagnose vor der
Modusverzweigung, also auch im `PREVIEW`-Lauf. Der `catch`-Zweig von
`handleCsvImport` rollt Storage zurueck, stellt die DOM-Inputs wieder her und
rendert die Provenienzzeile auf den alten Stand - ruft `update()` aber nicht
erneut auf. Nach einem Fehlschlag zwischen `replaceStateFromImport` und der
Provenienzbestaetigung stehen damit CSV-basierte Zahlen neben einer
Provenienzzeile, die diese CSV ausdruecklich verneint. Derselbe Ablauf gilt fuer
`handleImport`.

#### S12-6: Zwei Implementierungen desselben Provenienz-Viewmodels weichen messbar ab

`getMarketDataProvenanceViewModel` (balance-reader.js) und der neue Block in
`buildKeyParams` (balance-diagnosis-keyparams.js) leiten `highScope` getrennt
ab. Gemessen an identischer Provenienz:

| Provenienz | Statuszeile | Diagnose-Kachel |
|---|---|---|
| Onlinepfad (Yahoo, `ath.value: 125`) | Hoch-Scope `allTimeHigh` | Hoch-Scope `unbekannt` |
| Manuelle CSV | Hoch-Scope `windowHigh` | Hoch-Scope `windowHigh` |

`buildKeyParams` fehlt die Rueckfallregel
`Number.isFinite(meta.ath?.value) ? 'allTimeHigh' : 'unbekannt'`. Zusaetzlich
setzt die Kachel `trend: highScope === 'windowHigh' ? 'neutral' : 'up'` und
vergibt damit ausgerechnet dem Zustand `unbekannt` die positive Trendmarkierung.

#### S12-7: Der Exportpfad ist nur gegen einen Synthetikzustand mit fuenf Feldern getestet

`tests/balance-ui-orchestration.test.mjs:668` uebergibt `createBalanceExportDocument`
ein `inputs`-Objekt mit fuenf der 66 Vertragsfelder. Kein Test fuehrt eine reale
`readAllInputs()`-Ausgabe durch den Exportpfad, und kein Test importiert ein
Dokument, das die Vorversion erzeugt haben koennte. Genau diese beiden Luecken
lassen S12-1 und S12-2 passieren.

#### S12-8: Die Onlineprovenienz wird nur an der Import-/Exportgrenze validiert

`balance-annual-marketdata.js:604` schreibt `annualMarketDataMeta` ohne
`validateAnnualMarketDataMeta`. Der geschriebene Shape erfuellt den neuen
Vertrag heute - eigens gemessen, ein Export mit Onlineprovenienz gelingt -, aber
nichts erzwingt das. Eine kuenftige Aenderung des Onlineshapes wuerde sich
zuerst als nicht mehr exportierbarer State zeigen, nicht als Fehler an der
Schreibstelle.

#### S12-9: `normalizeSourceFileName` filtert nur Steuerzeichen

Der Dateiname wandert bis auf entfernte Steuerzeichen ungefiltert in
`provenance.source`, in den Export und in beide UI-Pfade. Heute nicht
ausnutzbar, weil `renderMarketDataProvenance` ueber `textContent` und
`buildKeyParams` ueber `document.createElement` plus `textContent` schreibt -
das wurde eigens geprueft. Der Sanitisierungsvertrag des Feldes lautet damit
aber "nur Steuerzeichen"; jeder kuenftige `innerHTML`-Konsument erbt einen
Injektionspfad. Bis zu 200 Zeichen freier Nutzertext liegen zudem im
Exportdokument.

#### S12-10: Der CSV-Pfad schreibt einen State, den derselbe Modulvertrag ablehnen kann

Der JSON-Pfad validiert vor `replaceStateFromImport`; der CSV-Pfad baut
`importedState` aus `dryRunResult.inputData` und schreibt ihn ohne
`validateBalanceState`. `StorageManager.replaceStateFromImport` prueft nur
Objektform und Serialisierbarkeit und vertraut ausweislich seiner
Fehlermeldungen auf den "validierten Importzustand". Der einzige nachgelagerte
Vertragscheck betrifft die Provenienz. Zusammen mit S12-1 heisst das: Ein
CSV-Import kann erfolgreich abschliessen und einen State hinterlassen, der
danach nicht mehr exportierbar ist.

### Gegengeprueft ohne Befund

- Der Feldinventar-Abgleich Reader gegen Schema ist vollstaendig; kein
  Reader-Feld ohne Vertrag, `healthBucket` und `decumulation` treffen die
  Detailvertraege exakt.
- `ath: 0` wird von `MarketAnalyzer` tatsaechlich als "nicht verfuegbar"
  behandelt (`marketDataStatus: 'partial'`, `abstandVomAthProzent: null`), nicht
  als "Abstand null". Die technische Umsetzung von D-13 ist insofern korrekt;
  strittig ist ausschliesslich die Regimefolge (S12-3).
- Beide Provenienzrenderer sind gegen `null`, `undefined`, `[]`, String und
  Zahl robust und liefern den Nichtverfuegbarkeitstext.
- Die vier neuen `marketCsv*`-Felder erreichen `dom.inputs` ueber die generische
  Sammlung in `balance-main.js`; der CSV-Pfad ist im Browser erreichbar.
- Der CSV-Parser wurde in Zeilen-, Datums- und Duplikatsbehandlung nicht
  veraendert; die Strenge gegenueber einzelnen ungueltigen Zeilen ist
  vorbestehend.
- Die Provenienzbestaetigung ueber `JSON.stringify`-Vergleich ist
  schluesselordnungsabhaengig, aber unkritisch, weil beide Seiten aus demselben
  `cloneJson(plan.provenance)` stammen und `saveState` die Reihenfolge nicht
  normalisiert.

### Findings-Lifecycle

- Neu eroeffnet und blockierend: S12-1, S12-2, S12-3.
- Neu eroeffnet als Restrisiko/Hinweis: S12-4, S12-5, S12-6, S12-7, S12-8,
  S12-9, S12-10.
- Aus frueheren Slices unveraendert offen und hier beruehrt: die
  Nullgrenzenentscheidung aus Slice 03 (S03-2, S03-3) steht im direkten
  Widerspruch zu den neuen Bounds; siehe S12-2.
- Geschlossen durch diesen Slice: keine frueheren Claude-Findings; Slice 12
  wurde bisher nicht von Claude reviewt.

- Pre-Mortem: Die wahrscheinlichste Fehlerursache in drei Monaten ist ein
  Nutzer, der ein Zahlenfeld leert oder eine Marktdatenkorrektur vornimmt und
  danach beim Exportversuch nur noch "Der Balance-Zustand ist unvollstaendig
  oder beschaedigt" liest. Er wird den Zustand fuer beschaedigt halten, obwohl
  er intakt ist, und im schlimmsten Fall zuruecksetzen - in genau dem Slice, der
  die Datenintegritaet haerten sollte. Die zweitwahrscheinlichste Ursache ist
  ein manueller CSV-Import waehrend eines echten Einbruchs, nach dem die App
  ueber Monate die volle flexible Entnahme empfiehlt, weil D-13 die
  Baerenerkennung stillgelegt hat und niemand die Regimefolge dokumentiert hat.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-28  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Implementierung von Codex auf `codex/suite-datenintegritaet-hardening` für Slice 12 (5 geänderte Programmdateien, 13 Test-/Doku-Dateien) sowie das Erstreview von Claude.

### Evaluierung der Prüfdimensionen & Bestätigung der Blocker

1. **S12-1 (Blocker - Export bricht bei gewöhnlichen Formulareingaben ab): BESTÄTIGT.**
   - *Befund:* `createBalanceExportDocument()` prüft den Live-Zustand gegen `BALANCE_IMPORT_INPUT_SCHEMA_V1`. Leert ein Nutzer das Rebalancing-Band (`rebalBand`), wird es vom Reader zu `0` konvertiert. Das Schema verlangt `min: 1`. Der Export wirft `BalanceImportError('invalid_input_bounds')`, welcher in `handleExport()` zu einer generischen Meldung verschlungen wird ("Der Balance-Zustand ist unvollständig oder beschädigt"). Der Nutzer verliert die Möglichkeit zum Export, obwohl das Formular voll funktionsfähig ist.

2. **S12-2 (Blocker - Abweisung gültiger `schemaVersion: 1`-Dateien & `targetEq: 0`): BESTÄTIGT.**
   - *Befund:* Ältere Exporte oder Formularzustände mit `targetEq: 0` (0 % Aktien, in Slice 03 explizit als zulässig vereinbart) oder `rebalBand: 0` werden durch die neuen Schema-Bounds ohne Versionserhöhung verworfen.

3. **S12-3 (Blocker - D-13 Unentschieden & Stilllegung der Bärenmarkterkennung): BESTÄTIGT.**
   - *Befund:* Beim manuellen CSV-Import setzt der Code `ath: 0`. In `engine/analyzers/MarketAnalyzer.mjs` führt `ath: 0` zu `hasAthBasis: false` und zwingt das Marktregime in den neutralen Zustand `side_long`. Auch bei einem extremen Kurseinbruch um 45 % im CSV-Fenster schaltet die Engine niemals in `bear_deep`. Folglich greifen die Flex-Entnahmekürzungen (`flex-rate-policy.mjs`) nie. Dies ist eine schwerwiegende fachliche Nebenwirkung, die der Nutzer explizit entscheiden muss.

4. **S12-4 bis S12-10 (Restrisiken & Hinweise): BESTÄTIGT.**
   - Nachträgliche Marktdatenkorrekturen im UI sperren den Export über die Provenienzprüfung (S12-4).
   - Nach verworfenem CSV-Import verbleiben gerenderte Preview-Ergebnisse in der UI (S12-5).
   - Die Provenienz-Anzeige in der Statuszeile und Kachel weicht bei `highScope` ab (S12-6).

### Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker: 
  1. S12-1 (Claude/Gemini): `createBalanceExportDocument` validiert gegen `BALANCE_IMPORT_INPUT_SCHEMA_V1` und bricht bei gewöhnlichen Eingaben (z. B. leeres Rebalancing-Band = 0) mit generischer Fehlermeldung ab.
  2. S12-2 (Claude/Gemini): `BALANCE_EXPORT_SCHEMA_VERSION` bleibt 1, weist aber bestehende Exporte mit `targetEq: 0` (Widerspruch zu Slice 03) oder `rebalBand: 0` ab.
  3. S12-3 (Claude/Gemini): D-13 ist unentschieden; `ath: 0` deaktiviert die Bärenmarkterkennung der Engine im manuellen CSV-Pfad vollständig (keine Flex-Kürzungen selbst bei 45 % Kurseinbruch).
- Restrisiken: 
  1. S12-4 bis S12-10 (Claude/Gemini): Provenienz-Sperre bei manueller Korrektur, verworfene Previews im DOM, abweichende Provenienz-ViewModel-Ableitung.
- Pre-Mortem: Ein Nutzer importiert eine manuelle CSV-Datei während eines schweren Börseneinbruchs. Weil D-13 `ath: 0` setzt, erkennt die Engine das Regime `bear_deep` nicht und empfiehlt weiterhin 100 % der flexiblen Entnahme statt einer notwendigen Kürzung, was zum vorzeitigen Depotruin führt.
```

## Review-Antworten von Codex

**Datum:** 2026-07-28  
**Status:** technische Nachbesserung abgeschlossen; Reviewerstatus bleibt bis
zum unabhaengigen Re-Review unveraendert blockiert.

- **S12-1:** Der Export ist vom strikten Import-Gate getrennt. Ein
  strukturell JSON-faehiger Balance-State wird auch bei erreichbaren
  Domainabweichungen gesichert; `validationWarnings` enthaelt Code und
  konkrete Feldmeldung. Nur strukturell unmoegliche Exporte brechen ab, und
  deren Code/Meldung erreicht unverkuerzt die UI.
- **S12-2:** Export- und Eingabevertrag wurden auf V2 angehoben. V1-Dateien
  laufen ueber `migrateBalanceStateV1`; `targetEq: 0`, `rebalBand: 0`,
  damalige Prozentdarstellungen und die alte manuelle CSV-Provenienz sind
  durch Regressionstests abgedeckt.
- **S12-3:** Der Nutzer entschied am 2026-07-28 die gerichtete konservative
  Fensterhoch-Untergrenze. Das Fensterhoch wird bei positivem
  Fensterabstand intern verwendet, bleibt in `annualMarketDataMeta` aber
  `windowHigh` mit `verifiedAllTimeHighAvailable: false`. Die getrennte
  `engineReference` dokumentiert Policy und Anwendung. Ein direkter
  45-Prozent-Witness liefert `bear_deep` statt `side_long`; Gleichstand mit
  dem letzten Kurs bleibt ATH-neutral.
- **S12-4, S12-6, S12-7 und S12-10:** Ebenfalls technisch nachgebessert:
  Provenienzabweichungen verhindern keinen Recovery-Export mehr, beide
  Provenienzrenderer besitzen denselben Hoch-Scope-Fallback, der reale
  Produktionsreader und alle sieben Reviewvarianten sind abgedeckt, und der
  CSV-State wird vor Replace sowie nach Abschlusswrite voll validiert.
- **S12-5, S12-8 und S12-9:** Bleiben als dokumentierte Restrisiken/Hinweise
  fuer das Re-Review offen; sie veraendern keinen der drei bestaetigten
  Blocker.

## Re-Review durch Claude nach der Blocker-Nachbesserung

**Datum:** 2026-07-28
**Reviewer:** Claude (Primary Reviewer & Analyst)
**Pruefgegenstand:** Nachgebesserter Arbeitsstand auf
`codex/suite-datenintegritaet-hardening`. Gegenueber dem Erstreview haben sich
`app/balance/balance-binder-imports.js` (1.234 auf 1.458 Zeilen),
`app/balance/balance-reader.js`, `app/balance/balance-diagnosis-keyparams.js`,
`Balance.html` und `Handbuch.html` sowie sieben Testdateien erneut geaendert.

### Verifikationsbasis

- Gates unabhaengig nachgefahren: `npm test` 8.446/8.446 Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles; `npm run test:browser`
  17/17 Browser-Smokes, Exit 0; `git diff --check` gruen.
- Vier neue Messsonden gegen den nachgebesserten Produktivcode:
  1. Produktionsreader plus `createBalanceExportDocument` ueber zehn
     Livevarianten, jeweils mit anschliessendem Reimport des erzeugten
     Dokuments.
  2. Identische Nutzlast als `schemaVersion: 1`, als `schemaVersion: 2` und
     ueber den Legacy-V0-Pfad, in zehn Verletzungsvarianten.
  3. `parseMarketDataCsv` plus `createManualMarketCsvImportPlan` in vier
     Marktszenarien, jeweils durch `MarketAnalyzer.analyzeMarket`.
  4. `validateBalanceState` auf dem CSV-Importzustand sowie beide
     Provenienzrenderer an identischer Provenienz.
- Statische Gegenpruefung von `validateBalanceInputs`
  (`app/balance/balance-update-pipeline.js:430`),
  `StorageManager.replaceStateFromImport`, `engine/config.mjs` `REGIME_MAP`
  und `RATE_CHANGE_*_UP_PP` sowie `balance-renderer-summary.js:312`.

### Status der Erstreview-Findings

| ID | Status | Nachweis |
|---|---|---|
| S12-1 | geschlossen, mit Restklasse T12-2 | `aktuellesAlter` 0..130, `targetEq` 0..90, `rebalBand` 0..20 geweitet; geleertes Rebalancing-Band, geleertes Alter und `targetEq: 0` exportieren gemessen ohne Warnung; `handleExport` bindet den Fehler und gibt `[code]: message` aus |
| S12-2 | geschlossen, aber neuer Blocker T12-1 aus der Migration | Export `schemaVersion: 2` mit `inputSchemaVersion: 2`; V1-Dateien mit `targetEq: 0` und `rebalBand: 0` sind gemessen importierbar |
| S12-3 | Nutzerentscheidung dokumentiert, Baerenfall geschlossen, neuer Blocker T12-3 | 45,0 % Fensterabstand liefert gemessen `bear_deep` statt `side_long`; 26,7 % ebenso |
| S12-4 | geschlossen | Kreuzpruefung vergleicht jetzt gegen `engineReference`; eine Abweichung erzeugt eine Warnung statt eines Exportabbruchs |
| S12-5 | unveraendert offen | von Codex ausdruecklich offen gehalten |
| S12-6 | geschlossen | beide Renderer liefern an identischer Onlineprovenienz gemessen `allTimeHigh`, an der CSV-Provenienz `windowHigh` plus Engine-Referenz |
| S12-7 | geschlossen | die Tests fuehren den Produktionsreader durch den Exportpfad und pruefen die Warnfelder |
| S12-8 | unveraendert offen | von Codex ausdruecklich offen gehalten |
| S12-9 | unveraendert offen | von Codex ausdruecklich offen gehalten |
| S12-10 | geschlossen, mit Nebenwirkung T12-4 | `validateBalanceState` laeuft vor dem Replace und nach dem Abschlusswrite |

### Prueferergebnis nach den fuenf Pruefdimensionen

**1. Korrektheit.** Die Bounds sind jetzt gegen die Reader-Defaults
abgeglichen; die drei im Erstreview gemessenen Alltagsfaelle exportieren
sauber. Der Baerenfall der D-13-Variante ist korrekt umgesetzt und gemessen.
Nicht korrekt ist der Gegenfall: Faellt das Fensterhoch mit dem letzten
Datenpunkt zusammen, behauptet der Engine-Eingang ein Allzeithoch (T12-3).

**2. Vertragstreue.** Der schwerste Befund dieser Runde. Der neue
V1-Migrationspfad ruft `validateBalanceState` nicht auf; der gesamte
Eingabevertrag, der das Ziel dieses Slice ist, wird fuer als Version 1
gekennzeichnete Dokumente uebersprungen (T12-1). Der Legacy-V0-Pfad, der
in der Vorversion noch `validateBalanceState(migrateLegacyStateV0(...))`
aufrief, laeuft jetzt ebenfalls ueber den ungeprueften Migrator - das ist
eine Verschlechterung gegenueber dem Stand des Erstreviews.

**3. Fehlerbehandlung.** Deutlich besser: `handleExport` reicht Code und
Meldung durch, der Erfolgstoast nennt den Validierungshinweis. Offen bleibt,
dass ein mit Warnung geschriebenes Dokument nicht mehr importierbar ist und
dass `validationWarnings` trotz gegenteiliger Formulierung in der Slice-MD
hoechstens einen Eintrag traegt (T12-2).

**4. Seiteneffekte.** Die Provenienzrenderer stimmen jetzt ueberein. Neu
eingefuehrt wurde eine Kopplung in die andere Richtung: Der CSV-Import
scheitert seit der Nachbesserung an Livewerten, die mit der CSV nichts zu tun
haben (T12-4).

**5. Was koennte brechen?** Am wenigsten durchdacht ist die Richtungsfrage der
konservativen Schranke. Eine untere Schranke des Allzeithochs traegt
Information ueber den Abstand nach unten, aber keine ueber die Nichtexistenz
eines Abstands. Genau diese Umkehrung nimmt die Implementierung vor.

### Blocker

#### T12-1 (Blocker): Der V1-Migrationspfad umgeht den kompletten Eingabevertrag

`migrateBalanceStateV1` prueft `aktuellesAlter`, eine Liste nichtnegativer
Kernbetraege, `minimumFlexAnnual <= flexBedarf` und - nur bei manueller
CSV-Provenienz - die Marktmetadaten. Danach gibt die Funktion den Payload
zurueck, **ohne** `validateBalanceState` beziehungsweise
`validateBalanceInputsAgainstSchema` aufzurufen. `normalizeBalanceImportDocument`
reicht dieses Ergebnis unveraendert an `handleImport` weiter, das es
`UIReader.applyStoredInputs` uebergibt und anschliessend per
`StorageManager.replaceStateFromImport` woertlich persistiert.

Dieselbe Nutzlast, einmal als `schemaVersion: 1` und einmal als
`schemaVersion: 2` importiert:

| Nutzlast | als Version 1 | als Version 2 | Legacy-V0-Pfad |
|---|---|---|---|
| unbekanntes Zusatzfeld | **akzeptiert** | abgewiesen (`unknown_input_field`) | **akzeptiert** |
| `goldAktiv: "true"` als String | **akzeptiert** | abgewiesen (`invalid_boolean`) | **akzeptiert** |
| `targetEq: 5000` | **akzeptiert** | abgewiesen (`invalid_input_bounds`) | **akzeptiert** |
| `kirchensteuerSatz: 0.5` ausserhalb des Enums | **akzeptiert** | abgewiesen (`invalid_input_bounds`) | **akzeptiert** |
| `risikoprofil: "aggressiv-total"` | **akzeptiert** | abgewiesen (`invalid_input_value`) | **akzeptiert** |
| `horizonMethod: "wuerfeln"` | **akzeptiert** | abgewiesen (`invalid_input_value`) | **akzeptiert** |
| `inflation: 9999` | **akzeptiert** | abgewiesen (`invalid_input_bounds`) | **akzeptiert** |
| `detailledTranches: [{ nonsense: true }]` | **akzeptiert** | abgewiesen (`invalid_input_value`) | **akzeptiert** |
| `healthBucket` widerspricht dem Flachfeld | **akzeptiert** | abgewiesen (`invalid_core_value`) | **akzeptiert** |
| `profilName` mit 5.000 Zeichen | **akzeptiert** | abgewiesen (`invalid_input_type`) | **akzeptiert** |

Zehn von zehn Vertragsverletzungen passieren, sobald das Dokument
`schemaVersion: 1` traegt. Damit ist der zentrale Zweck des Slice - IMP-01,
ein typisierter und begrenzter Importvertrag - fuer den einzigen Dateityp
ausser Kraft gesetzt, den Nutzende ueberhaupt in nennenswerter Zahl besitzen:
ihre bestehenden Sicherungen.

Die Codekommentierung begruendet das mit „Die anschliessende Import-Preview
bleibt der fachliche Laufzeit-Check". Das traegt nicht.
`validateBalanceInputs` in `app/balance/balance-update-pipeline.js:430`
prueft ausschliesslich, ob `minimumFlexAnnual` negativ ist und ob es
`flexBedarf` uebersteigt. Weder Enums noch Bounds noch unbekannte Felder noch
der Tranchenvertrag werden dort beruehrt. Felder wie `profilName` oder ein
frei erfundenes Zusatzfeld erreichen ueberhaupt keinen Rechenpfad, der sie
ablehnen koennte, und liegen nach dem Replace im persistierten State.

Besonders unstimmig wird das im Zusammenspiel mit T12-2: Ein
vertragsverletzendes Dokument wird als Version 2 hart abgewiesen, dieselbe
Nutzlast als Version 1 dagegen ungeprueft uebernommen.

**Erwartete Aufloesung:** `migrateBalanceStateV1` muss nach der Migration
`validateBalanceState` durchlaufen. Werte, die die Vorversion erzeugen konnte
und die weiterhin gueltig sein sollen, gehoeren in die Bounds des V2-Schemas -
so wie es fuer `targetEq`, `rebalBand` und `aktuellesAlter` bereits richtig
gemacht wurde -, nicht in einen ungeprueften Bypass.

#### T12-3 (Blocker): Variante A behauptet im steigenden Markt ein Allzeithoch

Der Baerenfall der Nutzerentscheidung ist korrekt umgesetzt. Der Gegenfall
nicht. `engineValues.ath = parsed.high.value` setzt das Fensterhoch bedingungslos
als Engine-ATH. Faellt das Fensterhoch mit dem letzten Datenpunkt zusammen -
der Normalfall eines steigenden Vierjahresfensters -, ergibt das
`ath === endeVJ`, also einen ATH-Abstand von exakt 0. Gemessen ueber
`parseMarketDataCsv`, `createManualMarketCsvImportPlan` und
`MarketAnalyzer.analyzeMarket`:

| CSV-Fenster | `ath` an die Engine | `jahreSeitAth` | `sKey` | Abstand | erste Begruendung |
|---|---|---|---|---|---|
| 90, 100, 80, 55 | 100 | 2 | `bear_deep` | 45,0 % | ATH-Abstand > 20 % |
| 100, 150, 120, 110 | 150 | 2 | `bear_deep` | 26,7 % | ATH-Abstand > 20 % |
| 80, 95, 110, 130 | 130 | 0 | `peak_hot` | 0,0 % | **Neues Allzeithoch** |
| 80, 90, 100, 130 | 130 | 0 | `peak_hot` | 0,0 % | **Neues Allzeithoch** |

Die zugehoerige Provenienz sagt im selben Moment
`ath.value: null`, `ath.scope: "unavailable_manual_window"` und
`ath.engineAvailable: false`. Der Engine-Eingang behauptet also genau das,
was D-13 und der Text der Nutzerentscheidung ausdruecklich verbieten: ein
belegtes Allzeithoch. Die Begruendung „Neues Allzeithoch" ist nicht intern:
`balance-renderer-summary.js:312` setzt `market.reasons` als Titel des
Marktstatus.

Fachlich ist die Ursache eine Richtungsverwechslung. Ein `windowHigh` ist eine
untere Schranke des wahren Allzeithochs. Daraus folgt, dass der berechnete
Abstand eine untere Schranke des wahren Abstands ist - das rechtfertigt den
Baerenfall. Ein berechneter Abstand von 0 heisst aber nur „das Fenster zeigt
keinen Einbruch", nicht „es gibt keinen". Genau in diesem Fall traegt die
Schranke keine Information, und die Implementierung liest sie als
staerkstmoegliche Aussage.

Die Wirkung ist nicht nur kosmetisch: `peak_hot` wird in
`engine/config.mjs` `REGIME_MAP` auf `peak` abgebildet, und
`flex-rate-policy.mjs` waehlt dafuer `RATE_CHANGE_AGILE_UP_PP` mit 4,5
Prozentpunkten statt `RATE_CHANGE_MAX_UP_PP` mit 2,5. Die flexible Entnahme
darf also fast doppelt so schnell steigen, gestuetzt auf ein unbelegtes
Allzeithoch. Bei schwaecherem Momentum ergibt sich `peak_stable`, das
regimeseitig `hot_neutral` entspricht; dort bleibt die Ratenmechanik wie
zuvor, die falsche Begruendung im Marktstatus aber bestehen.

**Erwartete Aufloesung:** Die konservative Schranke nur dort verwenden, wo sie
traegt. Konkret: `windowHigh` an die Engine geben, solange es echt ueber dem
letzten Kurs liegt; andernfalls den ATH als nicht verfuegbar melden, also den
neutralen Fallback der Vorversion. Damit bleibt der 45-Prozent-Fall
`bear_deep` und der steigende Fall verliert die unbelegte Peak-Behauptung.
Kein Test deckt diesen Fall bisher ab; der vorhandene Witness in
`tests/balance-reader.test.mjs` prueft ausschliesslich den Baerenfall.

### Restrisiken und Hinweise

#### T12-2: Ein mit Warnung exportiertes Dokument ist nicht wieder importierbar

Der Recovery-Export erfuellt seinen Zweck nur halb. Gemessen ueber
`createBalanceExportDocument` mit anschliessendem
`normalizeBalanceImportDocument` auf dasselbe Dokument:

| Livezustand | Export | Warnung | Reimport |
|---|---|---|---|
| Standardformular | ok | keine | ja |
| `rebalBand` geleert | ok | keine | ja |
| `aktuellesAlter` geleert | ok | keine | ja |
| `targetEq: 0` | ok | keine | ja |
| `inflation` 60 | ok | `invalid_input_bounds` | **nein** |
| `horizonYears` 30,5 | ok | `invalid_input_type` | **nein** |
| `profilName` 250 Zeichen | ok | `invalid_input_type` | **nein** |
| `flexBudgetYears` 12 | ok | `invalid_input_bounds` | **nein** |
| `tqfAlt` 30 | ok | `invalid_input_bounds` | **nein** |

Die drei Alltagsfaelle des Erstreviews sind damit sauber geloest. Es bleibt
aber eine Klasse von Zustaenden, in der die App eine Sicherung schreibt, die
sie selbst nicht mehr einlesen kann. Der Warntext nennt Code und Feld, sagt
aber nicht, dass die Datei nicht reimportierbar ist.

Zusaetzlich traegt `validationWarnings` hoechstens einen Eintrag, weil
`validateBalanceState` beim ersten Verstoss wirft. Ein Livezustand mit
`inflation: 60` **und** `tqfAlt: 30` erzeugt gemessen genau eine Warnung. Die
Slice-MD beschreibt das Feld dagegen als Inventar („Solche Werte werden ...
unter `validationWarnings` inventarisiert").

#### T12-4: Der CSV-Import ist neu hart an den Vertrag gekoppelt, der Export bewusst nicht

Die Aufloesung von S12-10 fuegt `validateBalanceState(importedState)` vor dem
Replace ein. `importedState.inputs` entsteht aus dem Livereader. Liegt
irgendein Livewert ausserhalb des Vertrags, scheitert damit der CSV-Import an
einem Feld, das mit der CSV nichts zu tun hat. Gemessen am selben
Importzustand:

| Livezustand | Vorpruefung vor dem Replace |
|---|---|
| im Vertrag | passiert |
| `inflation: 60` | wirft `invalid_input_bounds` |
| `profilName` 250 Zeichen | wirft `invalid_input_type` |
| `horizonYears` 30,5 | wirft `invalid_input_type` |

Derselbe Zustand exportiert bewusst mit blosser Warnung. Zwei Pfade desselben
Moduls behandeln dieselbe Vertragsverletzung damit gegensaetzlich. Die
Fehlermeldung nennt immerhin Feld und Grenze, weshalb dies kein Blocker ist.

#### T12-5: `migrateLegacyPercentRate` ist eine unbelegte Heuristik

`tqfAlt`, `tqfNeu` und `kirchensteuerSatz` werden geteilt, sobald der Wert
`> 1` und `<= 100` ist. Fuer `kirchensteuerSatz` war in Version 1 bereits ein
Enum aus 0, 0,08 und 0,09 vertraglich festgelegt; jeder andere Wert in einer
V1-Datei ist also korrupt und nicht rekonstruierbar. Die Heuristik macht aus
`8` still `0,08`, aus `50` still `0,5` - und Letzteres wird wegen T12-1
anschliessend nicht mehr gegen das Enum geprueft.

#### T12-6: Die Bezeichnung „Variante A" widerspricht der Variantenliste des Erstreviews

Das Erstreview stellte drei Varianten zur Wahl: (a) unveraendert `ath = 0`,
(b) `windowHigh` als konservative untere Schranke, (c) Blockade des Pfads.
Umgesetzt und im Hauptplan als „Variante A" protokolliert ist Variante (b).
Die Entscheidung selbst ist im Hauptplan im Klartext beschrieben und damit
eindeutig; die Buchstabenbezeichnung fuehrt jedoch beim Rueckvergleich mit dem
Erstreview in die Irre und sollte im Plan auf den beschreibenden Text
verkuerzt werden.

### Gegengeprueft ohne Befund

- Die drei im Erstreview gemessenen Alltagsfaelle des Exports sind
  nachgemessen sauber: geleertes Rebalancing-Band, geleertes Alter und
  `targetEq: 0` exportieren ohne Warnung und sind reimportierbar.
- Beide Provenienzrenderer liefern an identischer Onlineprovenienz jetzt
  `allTimeHigh` und an der CSV-Provenienz `windowHigh` samt Engine-Referenz.
  Die Formulierung der Zusatzangabe unterscheidet sich nur im Doppelpunkt.
- `validateAnnualMarketDataMeta` erzwingt fuer manuelle CSVs zusaetzlich, dass
  `engineReference.value` und `engineReference.yearsSince` exakt dem
  `high`-Objekt entsprechen; eine manipulierte Hochstufung auf `allTimeHigh`
  wird weiterhin abgewiesen.
- Die neuen Felder `goldBasisVermoegen`, `goldZielBetrag`, `goldFloorBetrag`
  und `goldStrategyDiagnostics` erweitern das Inventar von 66 auf 70 Felder;
  der Konsistenzcheck der Golddiagnostik ist in sich schluessig.
- Die Rueckwaertskompatibilitaet fuer gueltige V1-Dateien ist hergestellt:
  `targetEq: 0` und `rebalBand: 0` sind gemessen importierbar.
- Der CSV-Parser ist gegenueber der Vorversion unveraendert; nur `high`
  heisst jetzt `verifiedAllTimeHighAvailable` statt `engineAthAvailable`, und
  der V1-Migrator benennt das Feld nach.

### Findings-Lifecycle

- Geschlossen: S12-1 (mit Restklasse T12-2), S12-2, S12-4, S12-6, S12-7,
  S12-10 (mit Nebenwirkung T12-4); S12-3 im Baerenfall geschlossen.
- Unveraendert offen: S12-5, S12-8, S12-9.
- Neu eroeffnet und blockierend: T12-1, T12-3.
- Neu eroeffnet als Restrisiko/Hinweis: T12-2, T12-4, T12-5, T12-6.

## Re-Review-Ergebnis (Claude)

- Status: blockiert
- Blocker:
  - T12-1: `migrateBalanceStateV1` ruft `validateBalanceState` nicht auf;
    zehn von zehn Vertragsverletzungen passieren den Import, sobald das
    Dokument `schemaVersion: 1` traegt, und der Legacy-V0-Pfad ist gegenueber
    dem Stand des Erstreviews von validiert auf unvalidiert zurueckgefallen.
  - T12-3: Faellt das Fensterhoch mit dem letzten CSV-Datenpunkt zusammen,
    meldet der Engine-Eingang einen ATH-Abstand von 0 und die Engine
    begruendet mit „Neues Allzeithoch" - genau die Behauptung, die D-13 und
    die Nutzerentscheidung verbieten -, in `peak_hot` zusaetzlich mit der
    agilen Ratenobergrenze von 4,5 statt 2,5 Prozentpunkten.
- Restrisiken: T12-2 (mit Warnung exportierte Dateien sind nicht
  reimportierbar; `validationWarnings` enthaelt hoechstens einen Eintrag),
  T12-4 (CSV-Import scheitert an vertragsfremden Livewerten, waehrend der
  Export dafuer nur warnt), T12-5 (unbelegte Prozentheuristik im
  V1-Migrator), T12-6 (irrefuehrende Variantenbezeichnung im Hauptplan),
  sowie unveraendert S12-5, S12-8 und S12-9.
- Pre-Mortem: Die wahrscheinlichste Fehlerursache in drei Monaten ist eine
  aeltere oder von Hand bearbeitete Sicherungsdatei mit `schemaVersion: 1`.
  Sie laeuft am gesamten in diesem Slice gebauten Vertrag vorbei, ihre
  Abweichungen landen unbemerkt im persistierten State, und weil der Slice als
  „typisierte Balance-Importe" gilt, sucht dort niemand. Die
  zweitwahrscheinlichste Ursache ist ein manueller CSV-Import in einem
  steigenden Markt: Die App meldet ein Allzeithoch, das die Datei nicht
  belegt, erlaubt die agile Steigerung der flexiblen Entnahme und dokumentiert
  in derselben Provenienz, dass kein Allzeithoch verfuegbar ist.

## Zweites Re-Review durch Gemini nach der Blocker-Nachbesserung

**Review-Datum:** 2026-07-28  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Blocker-Nachbesserung von Codex auf `codex/suite-datenintegritaet-hardening` für Slice 12 sowie das zweite Re-Review von Claude.

### Evaluierung der Nachbesserung & Bestätigung der neuen Blocker (T12-1, T12-3)

Codex hat die ursprünglichen Blocker (S12-1, S12-2, S12-3 im Bärenfall) adressiert, jedoch **zwei neue schwerwiegende Blocker** eingeführt:

1. **T12-1 (Neuer Blocker - Umgehung des Eingabevertrags bei V1-Importen): BESTÄTIGT.**
   - *Befund:* `migrateBalanceStateV1` führt nur rudimentäre Checks durch, ruft danach aber **weder `validateBalanceState` noch `validateBalanceInputsAgainstSchema`** auf.
   - *Folge:* Dokumente mit `schemaVersion: 1` umgehen das gesamte in Slice 12 gebaute Schema-Gateway. Ungültige Enums, Bereichsverletzungen, Bool-Strings und unzulässige Tranchen werden ohne Schema-Validierung direkt in den State geschrieben und persistiert.

2. **T12-3 (Neuer Blocker - Behauptung eines Allzeithochs im steigenden Markt): BESTÄTIGT.**
   - *Befund:* Wenn in einem 4-Jahres-CSV-Fenster die Kurse steigen (z. B. 80, 95, 110, 130), fällt das Fensterhoch `windowHigh` (130) mit dem letzten Kurs `endeVJ` (130) zusammen. `MarketAnalyzer.analyzeMarket` berechnet dadurch ATH-Abstand = 0 % und stuft das Regime in `peak_hot` ein – mit der Begründung **„Neues Allzeithoch“**.
   - *Folge:* Es wird genau das behauptet, was D-13 und der Text der Nutzerentscheidung verbieten (ein unbelegtes ATH). In `peak_hot` erlaubt die Engine zudem agile Steigerungen der flexiblen Entnahme um bis zu 4,5 statt 2,5 Prozentpunkte.

3. **Restrisiken (T12-2, T12-4 bis T12-6): BESTÄTIGT.**
   - Dateien, die mit Warnung exportiert wurden, können nicht reimportiert werden (T12-2).
   - Ein CSV-Import kann an vertragsfremden Live-Formularwerten scheitern (T12-4).

### Re-Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker: 
  1. T12-1 (Claude/Gemini): `migrateBalanceStateV1` ruft `validateBalanceState` nicht auf; `schemaVersion: 1`-Dateien umgehen das gesamte Schema-Gateway und schreiben ungültige Werte/Enums unvalidiert in den State.
  2. T12-3 (Claude/Gemini): Bei steigenden CSV-Fenstern wird `ath = windowHigh` zu ATH-Abstand 0 % und löst das Regime `peak_hot` mit der Begründung „Neues Allzeithoch“ aus – ein direkter Verstoß gegen D-13.
- Restrisiken: 
  1. T12-2, T12-4 bis T12-6, S12-5, S12-8, S12-9: Ein mit Warnung exportierter State ist nicht reimportierbar; CSV-Import scheitert an vertragsfremden Formularfeldern.
- Pre-Mortem: Eine ältere V1-Sicherungsdatei mit korrupten oder manuell editierten Feldern umgeht beim Import das neue Schema-Gateway, persistiert ungeprüfte Werte im State und führt später im Hauptbetrieb zu unvorhersehbaren Berechnungsfehlern in der Engine.
```

## Zweite Review-Antworten von Codex

**Datum:** 2026-07-28  
**Status:** Neue Re-Review-Blocker technisch nachgebessert; der externe
Reviewerstatus bleibt bis zum erneuten unabhaengigen Re-Review blockiert.

- **T12-1:** `migrateBalanceStateV1` gibt den migrierten Payload nicht mehr
  ungeprueft zurueck, sondern fuehrt ihn durch `validateBalanceState`.
  Derselbe Abschlussvertrag gilt dadurch auch fuer den Legacy-V0-Envelope.
  Unbekannte Felder, Bereichsverletzungen, freie Enums und ueberlange Strings
  werden vor DOM-Anwendung und Persistenz abgewiesen. Die ausdruecklich
  unterstuetzten historischen Boolean-Strings bleiben keine
  Vertragsumgehung: Der benannte Migrator kanonisiert sie zuerst zu echten
  Booleans, danach prueft derselbe V2-Vertrag den kanonischen Payload.
- **T12-3:** Die konservative Fensterhoch-Untergrenze wird gerichtet
  angewendet. Nur `windowHigh > endeVJ` belegt einen positiven Mindestabstand
  und setzt Engine-`ath`/`jahreSeitAth`. Bei Gleichstand bleiben beide
  Engine-Felder 0; die Provenienz traegt
  `engineReference.applied: false`, `value: null` und `yearsSince: null`.
  Der direkte steigende Witness `80, 95, 110, 130` liefert damit `side_long`
  und keine Begruendung „Neues Allzeithoch"; der Kontrollfall
  `100, 90, 80, 55` bleibt mit 45 Prozent Abstand `bear_deep`.
- **T12-5:** Die unbelegte Prozentheuristik fuer `kirchensteuerSatz` wurde
  entfernt. V1-Werte muessen nach den expliziten Migrationen dem bestehenden
  Enum `0 | 0.08 | 0.09` entsprechen.
- **T12-6:** Arbeitsplan, Slice-Entscheidung und Referenzdokumentation nennen
  keine kollidierende Buchstabenvariante mehr, sondern die beschreibende
  gerichtete konservative Fensterhoch-Untergrenze.
- **T12-2, T12-4, S12-5, S12-8 und S12-9:** Bleiben als dokumentierte
  Restrisiken beziehungsweise Hinweise offen. Sie wurden nicht als
  Rechtfertigung fuer einen Import-Bypass oder eine Engine-Semantikaenderung
  verwendet.

### Validierung der zweiten Nachbesserung

- Direkte Gegenproben: V1 mit unbekanntem Feld -> `unknown_input_field`; V1
  mit `targetEq: 5000` -> `invalid_input_bounds`; unterstuetztes
  `goldAktiv: "true"` -> vor dem V2-Gate kanonisches Boolean `true`.
- Fokussiert 581/581 Assertions:
  `balance-reader` 149/149, `balance-ui-orchestration` 232/232,
  `balance-diagnosis-keyparams` 30/30, `balance-annual-marketdata` 74/74,
  `balance-annual-period` 52/52 und `balance-storage-contract` 44/44.
- `npm test`: 8.462/8.462 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles.
- `npm run test:browser`: 17/17 Browser-Smokes.
- `git diff --check`: gruen.
- Exakt fuenf Programmdateien im Slice-Gesamtscope; `engine/`, `engine.js`,
  `dist/`, `src-tauri/` und `RuheStandSuite.exe` unveraendert.

## Zweites Re-Review durch Claude nach der T12-Nachbesserung

**Datum:** 2026-07-28
**Reviewer:** Claude (Primary Reviewer & Analyst)
**Pruefgegenstand:** Arbeitsstand nach der zweiten Nachbesserung auf
`codex/suite-datenintegritaet-hardening`. Gegenueber dem ersten Re-Review haben
sich `app/balance/balance-binder-imports.js`, `app/balance/balance-reader.js`,
`app/balance/balance-diagnosis-keyparams.js`, `Handbuch.html`, `README.md`,
drei Referenzdokumente und vier Testdateien erneut geaendert.

### Verifikationsbasis

- Gates unabhaengig nachgefahren: `npm test` 8.462/8.462 Assertions,
  0 fehlgeschlagene Dateien, 0 offene Handles; `npm run test:browser`
  17/17 Browser-Smokes, Exit 0; `git diff --check` gruen.
- Scope gegengeprueft: sechs geaenderte `.js`/`.html`-Dateien, davon fuenf
  Programmdateien plus `Handbuch.html` als deklarierte Dokumentationsdatei;
  `engine/`, `engine.js`, `dist/`, `src-tauri/` und `RuheStandSuite.exe`
  unveraendert.
- Fuenf Messsonden gegen den nachgebesserten Produktivcode:
  1. Zehn Vertragsverletzungen als `schemaVersion: 1`, als `schemaVersion: 2`
     und ueber den Legacy-V0-Envelope.
  2. Vier CSV-Marktszenarien durch `parseMarketDataCsv`,
     `createManualMarketCsvImportPlan` und `MarketAnalyzer.analyzeMarket`.
  3. Produktionsreader plus `createBalanceExportDocument` mit anschliessendem
     Reimport ueber zehn Livevarianten.
  4. Elf Altbestandswerte als V1- und als V0-Datei.
  5. Provenienzmigration alter CSV-Metadaten in beiden `applied`-Zustaenden
     sowie ein V2-Dokument der Vorrevision.

### Status der offenen Findings

| ID | Status | Nachweis |
|---|---|---|
| T12-1 | geschlossen | `migrateBalanceStateV1` endet mit `return validateBalanceState(migrated)`; neun der zehn gemessenen Verletzungen werden auf dem V1- **und** dem V0-Pfad abgewiesen, die zehnte ist die ausdruecklich unterstuetzte Boolean-Kanonisierung |
| T12-3 | geschlossen | `buildManualWindowHighEngineReference` setzt `applied` nur bei `high.value > price`; der steigende Witness liefert gemessen `side_long` statt `peak_hot`, die Baerenfaelle bleiben bei 45,0 % und 26,7 % `bear_deep` |
| T12-5 | geschlossen, mit Folge in U12-1 | die Prozentheuristik fuer `kirchensteuerSatz` ist entfernt; `8` wird gemessen abgewiesen statt still zu `0,08` skaliert |
| T12-6 | geschlossen | Hauptplan und Slice-MD nennen die gerichtete konservative Fensterhoch-Untergrenze ohne kollidierende Buchstabenvariante |
| T12-2 | offen, durch U12-1 erweitert | unveraendert gemessen: fuenf von neun Livevarianten exportieren mit Warnung und sind nicht reimportierbar |
| T12-4 | unveraendert offen | von Codex ausdruecklich offen gehalten |
| S12-5, S12-8, S12-9 | unveraendert offen | von Codex ausdruecklich offen gehalten |

### Prueferergebnis nach den fuenf Pruefdimensionen

**1. Korrektheit.** Die gerichtete Anwendung der Untergrenze ist fachlich
richtig konstruiert: `applied` genau dann, wenn das Fensterhoch echt ueber dem
letzten Kurs liegt. Die Migration alter CSV-Provenienz erzeugt in beiden
Zustaenden konsistente Engine-Felder - gemessen `applied: false` mit
`inputs.ath = 0` und `applied: true` mit `inputs.ath = 150`,
`jahreSeitAth = 2`.

**2. Vertragstreue.** Der V1- und der V0-Pfad laufen wieder durch denselben
Abschlussvertrag; der Bypass des ersten Re-Reviews existiert nicht mehr.
`validateAnnualMarketDataMeta` rechnet die erwartete `engineReference` aus
`price` und `high` neu und vergleicht auch `applied`, sodass eine manipulierte
Provenienz die Engine-Referenz nicht mehr hochstufen kann. Offen bleibt, dass
die Bedeutung von `schemaVersion: 2` innerhalb dieses Slice zweimal ohne
Versionswechsel gewechselt hat (U12-2).

**3. Fehlerbehandlung.** Unveraendert gut auf dem Exportpfad. Die Meldungen
des Migrators benennen Feld und Grenze; sie sagen jedoch nicht, dass es sich um
eine Altdatei handelt und dass es keinen Weg gibt, sie doch noch einzulesen
(U12-1).

**4. Seiteneffekte.** Beide Provenienzrenderer stellen den `applied`-Zustand
konsistent dar („angewendet" beziehungsweise „nicht angewendet (kein belegter
Fensterabstand)"). Die Formulierungen unterscheiden sich weiterhin nur im
Doppelpunkt. Neue Seiteneffekte auf andere Module sind nicht erkennbar.

**5. Was koennte brechen?** Die verbleibende Bruchstelle ist der Altbestand.
Die Schliessung von T12-1 war notwendig und richtig, verschiebt die Haerte des
Vertrags aber vollstaendig auf Dateien, die unter anderen Regeln entstanden
sind, ohne jeden Reparaturpfad.

### Restrisiken und Hinweise

#### U12-1: Der strenge Vertrag trifft jetzt auch echte Altdateien, ohne Reparaturpfad

Die Schliessung von T12-1 ist inhaltlich richtig: Ein Migrator darf kein
Bypass sein. Die Konsequenz ist aber, dass Werte, die eine Version vor Slice 12
erzeugen konnte - damals gab es ueberhaupt kein Eingabeschema -, jetzt auf
beiden Legacy-Pfaden hart abgewiesen werden. Gemessen an V1- und V0-Dateien:

| Wert in der Altdatei | V1-Import | V0-Import |
|---|---|---|
| `targetEq: 0` (Slice-03-Nullgrenze) | ja | ja |
| `rebalBand: 0` (Leerfeld-Default) | ja | ja |
| `aktuellesAlter: 0` (Leerfeld) | ja | ja |
| `tqfAlt: 30` (Prozentschreibweise) | ja (migriert) | ja (migriert) |
| `kirchensteuerSatz: 0.08` | ja | ja |
| `inflation: 60` (HTML ohne `max`) | nein (`invalid_input_bounds`) | nein |
| `profilName` mit 250 Zeichen | nein (`invalid_input_type`) | nein |
| `horizonYears: 30,5` | nein (`invalid_input_type`) | nein |
| `flexBudgetYears: 12` | nein (`invalid_input_bounds`) | nein |
| `kirchensteuerSatz: 8` (Prozentschreibweise) | nein (`invalid_input_bounds`) | nein |
| entferntes Feld im Inputbereich | nein (`unknown_input_field`) | nein |

Die vier Alltagsfaelle des Erstreviews sind sauber geloest. Fuer die uebrigen
Klassen gilt: Der Migrator normalisiert genau vier Dinge - historische
Booleans, den `bondRefillThresholdPct`-Alias, die Prozentschreibweise von
`tqfAlt`/`tqfNeu` und die CSV-Provenienz - und lehnt alles andere ab. Es gibt
weder ein Verwerfen unbekannter Felder mit Hinweis noch ein Klemmen auf die
Vertragsgrenze mit Hinweis. Der Fall `kirchensteuerSatz: 8` ist dabei
besonders bedauerlich: Die stille Skalierung zu entfernen war richtig, aber an
ihre Stelle trat nichts. Da Version 1 fuer dieses Feld bereits das Enum
`0 | 0.08 | 0.09` vorschrieb, waere eine benannte, enumgebundene Migration
(`8 -> 0.08`, `9 -> 0.09`, alles andere abweisen) rekonstruierbar und
belegbar gewesen.

Zusammen mit T12-2 entsteht die unangenehme Symmetrie: Die App schreibt fuer
genau diese Wertklassen einen Export mit Warnung und kann ihn anschliessend
selbst nicht mehr einlesen - weder als V2 noch, nach Umetikettierung, als V1.

**Empfehlung:** Im Migrator - und nur dort - unbekannte Felder verwerfen und
Bereichsverletzungen auf die Vertragsgrenze klemmen, beides mit einem
maschinenlesbaren Hinweis im Ergebnis, analog zu `validationWarnings` des
Exports. Das strikte V2-Gate bleibt davon unberuehrt.

#### U12-2: Die Bedeutung von `schemaVersion: 2` hat innerhalb des Slice zweimal gewechselt

Ein V2-Dokument der unmittelbaren Vorrevision - `engineReference` ohne
`applied`, `inputs.ath` gleich dem Fensterhoch - wird jetzt gemessen mit
`invalid_market_provenance` abgewiesen, weil `validateAnnualMarketDataMeta`
`applied` gegen den neu berechneten Erwartungswert vergleicht. Das ist genau
das Muster, das im Erstreview als S12-2 blockierend war, nur eine Version
weiter.

Nutzerseitig ist der Fall nicht erreichbar: Der Branch ist nicht committet und
keine der beiden Zwischenrevisionen wurde ausgeliefert, es kann also kein
solches Dokument existieren. Der Hinweis steht hier als Muster fuer die
Freigabe: Sobald Slice 12 ausgeliefert ist, muss jede weitere Aenderung an der
akzeptierten Wertemenge oder an der Provenienzform `schemaVersion` erhoehen und
einen benannten Migrator erhalten.

#### U12-3: Alte CSV-Provenienz ohne gueltiges `high.yearsSince` bleibt unlesbar

Der Migrationsblock fuer manuelle CSV-Provenienz greift nur, wenn
`high.scope === 'windowHigh'`, `high.value` endlich und `high.yearsSince` eine
nichtnegative ganze Zahl ist. Fehlt `yearsSince`, wird keine `engineReference`
ergaenzt, und die anschliessende Pruefung wirft gemessen
`invalid_market_provenance`. Das ist fail-closed und damit vertretbar; die
Meldung nennt aber nicht, dass der Marktdatenteil und nicht der Kern der Datei
das Problem ist, und es gibt keinen Weg, die Datei ohne Provenienz zu
uebernehmen.

### Gegengeprueft ohne Befund

- Der Bypass aus T12-1 existiert auf keinem der drei Eingangspfade mehr; die
  einzige verbleibende Abweichung zwischen V1/V0 und V2 ist die ausdruecklich
  in den Akzeptanzkriterien vorgesehene Kanonisierung historischer
  Boolean-Repraesentationen durch den benannten Migrator.
- Die gerichtete Untergrenze wirkt in beide Richtungen korrekt: Einbruch 45 %
  und 26,7 % bleiben `bear_deep` mit exakt diesen Abstaenden, der steigende
  Vierjahresfall liefert `side_long` mit `ath = 0`,
  `engineReference.applied: false` und der Begruendung „ATH-Daten fehlen;
  neutraler Fallback aktiv". Die Provenienz bleibt in beiden Faellen bei
  `ath.value: null` und `scope: unavailable_manual_window`.
- Die Kreuzpruefung in `validateBalanceState` erwartet jetzt fallabhaengig
  `engineReference.value` beziehungsweise 0 und ist damit mit der gerichteten
  Anwendung konsistent.
- Beide Provenienzrenderer geben den `applied`-Zustand aus; die Statuszeile
  fuehrt ihn zusaetzlich als `data-engine-reference-applied`.
- Die Exportklasse aus T12-2 ist unveraendert: dieselben vier Alltagsfaelle
  ohne Warnung und reimportierbar, dieselben fuenf Ausnahmefaelle mit genau
  einer Warnung und ohne Reimport. Es wurde nichts verschlechtert.
- `engine/`, `engine.js`, `dist/`, `src-tauri/` und `RuheStandSuite.exe` sind
  unveraendert; die Programmdateizahl des Slice bleibt bei fuenf.

### Findings-Lifecycle

- Geschlossen: T12-1, T12-3, T12-5 (mit Folge U12-1), T12-6.
- Unveraendert offen: T12-2, T12-4, S12-5, S12-8, S12-9.
- Neu eroeffnet als Restrisiko/Hinweis: U12-1, U12-2, U12-3.
- Neu eroeffnet als Blocker: keine.

## Zweites Re-Review-Ergebnis (Claude)

- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - U12-1: Der strenge Vertrag trifft jetzt auch echte Altdateien; fuer
    `inflation > 50`, `profilName > 200`, nicht ganzzahlige `horizonYears`,
    `flexBudgetYears > 10`, `kirchensteuerSatz: 8` und entfernte Altfelder gibt
    es keinen Reparaturpfad, obwohl die App fuer dieselben Wertklassen
    Exportdateien mit Warnung schreibt.
  - T12-2: Mit `validationWarnings` exportierte Dokumente bleiben nicht
    reimportierbar; das Feld traegt hoechstens einen Eintrag.
  - T12-4: Der CSV-Import scheitert weiterhin an vertragsfremden Livewerten,
    waehrend der Export dafuer nur warnt.
  - U12-2: Die Bedeutung von `schemaVersion: 2` hat innerhalb des Slice
    zweimal gewechselt; nutzerseitig nicht erreichbar, aber ab Auslieferung
    versionierungspflichtig.
  - U12-3: Alte CSV-Provenienz ohne gueltiges `high.yearsSince` bleibt ohne
    Ausweichweg unlesbar.
  - Unveraendert S12-5 (verworfene Preview-Ergebnisse bleiben sichtbar),
    S12-8 (Onlineprovenienz ungeprueft geschrieben) und S12-9 (Dateiname nur
    gegen Steuerzeichen gefiltert).
- Pre-Mortem: Die wahrscheinlichste Fehlerursache in drei Monaten ist eine
  Sicherung aus der Zeit vor Slice 12, die einen einzigen Wert ausserhalb der
  neuen Grenzen enthaelt - etwa eine per Hand eingetragene Inflationsrate oder
  einen langen Profilnamen. Der Import bricht mit einer Bereichsmeldung ab, die
  Datei bleibt unlesbar, und es gibt keinen Weg, den Rest des Zustands zu
  retten. Die zweitwahrscheinlichste Ursache ist eine spaetere Aenderung an der
  Provenienzform ohne Erhoehung von `schemaVersion`, weil das Muster innerhalb
  dieses Slice zweimal folgenlos blieb.

Die Freigabe bezieht sich auf die korrekte Umsetzung der entschiedenen
Vertraege und der Nutzerentscheidung zu D-13, nicht auf die fachliche Eignung
der Vertragsgrenzen selbst.
