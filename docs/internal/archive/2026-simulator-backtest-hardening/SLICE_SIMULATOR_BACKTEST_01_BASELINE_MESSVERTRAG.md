# Slice 01: Backtest-Baseline und Messvertrag

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** freigegeben; technisches Review durch Gemini abgeschlossen (freigegeben)  
**GAPs:** BT-01, BT-04, BT-05, BT-09, BT-10, BT-14, BT-19, BT-20

## Ziel

Vor jeder fachlichen oder strukturellen Backtest-Aenderung wird ein reproduzierbarer Ist-Messvertrag erstellt. Er friert Inputs, Daten-/Configstand, ausgewaehlte historische Pfade, kanonische Jahreswerte, Summary-Werte und bekannte Widersprueche so ein, dass spaetere erwartete und unerwartete Deltas getrennt werden koennen.

Der Slice schliesst keinen bekannten Defekt und markiert die aktuelle Semantik nicht als fachlich richtig. Er liefert nur die Messgrenze fuer nachfolgende Slices.

## Akzeptanzkriterien

- Mindestens sieben deterministische Characterization-Faelle sind versioniert:
  - Completed-Pfad 2000-2005 mit feldgenauer Legacy-Zuordnung von Aktien, Gold, Inflation, Zins, Lohn und CAPE,
  - Completed-Langpfad, zum Beispiel 1960-2020,
  - 3-Bucket + Mindest-Flex,
  - kapitalarmer Ruinpfad mit exakt dokumentiertem Vorjahres-`simState`, synthetischer Null-Ruinzeile und heutigem Summary-Endwert,
  - Pflegebucket-aktiver Pfad mit vorhandenen `row.health_bucket_*`-Werten und heute leerem Summary,
  - Dynamic-Flex-/CAPE-Pfad,
  - Kuerzung exakt 10 % mit heutigem Zaehler `>= 10` und Label `> 10 %`.
- Einjahreslauf, NaN-/rueckwaertige Periode, fehlendes mittleres Jahr und nicht-finite Returnfelder sind als Legacy-Negativfaelle dokumentiert; ein fehlendes Jahr darf in spaeteren Zieltests nie als vollstaendiger Lauf gelten.
- Jeder Fall enthaelt vollstaendige Inputs, Zeitraum, erwartete Zeilenzahl, Outcome-Beobachtung, Start-/Endwerte, Steuer, Entnahme, Kuerzungsmetriken und maximale absolute `portfolio_flow_delta`.
- Fuer mindestens zwei Jahre wird die aktuell tatsaechlich verwendete Zuordnung von Aktien, Gold, Inflation, Zins, Lohn und CAPE dokumentiert.
- Fuer 2000 wird der Unterschied zwischen Backtest-Legacyrecord und aktivem Monte-Carlo-`annualData` als festes Alignment-Oracle dokumentiert.
- Bekannte Widersprueche wie Vorjahres-Endvermoegen bei Ruin oder fehlendes Pflegebucket-Summary werden als `legacy_observed_gap` markiert und nicht als Zielsoll formuliert.
- `window.globalBacktestData` wird inklusive Feldmenge, Typen, Detailtoggle-Abhaengigkeit und fehlender Felder als `legacy_schema_v0` gesnapshottet.
- Caller-Inputs, Detailtranchen und `HISTORICAL_DATA` werden vor/nach jedem Fall tief verglichen; die Fixture selbst enthaelt einen kanonischen Inputhash.
- Fixture-/Snapshotwerte sind stabil serialisiert; Zeitstempel, Objektadressierung und lokale Pfade sind ausgeschlossen.
- Ein Delta-Reporter unterscheidet `expected_after_approved_contract_change` von unerwarteten Deltas.
- Die fokussierten Tests und `npm test` sind gruen.

## Scope

- Characterization-/Golden-Case-Test fuer den heutigen DOM-Backtestpfad
- kleine, nicht produktive Fixture-/Snapshotstruktur
- Metrikwörterbuch Version 1 mit Einheit, Vorzeichen, Rundung und Nenner
- dokumentierte Ausgangswerte und bekannte Widersprueche
- getrennte Oracle-Klassen `legacy_observed` und `target_expected`; Slice 01 erzeugt ausschliesslich erstere

## Nicht-Scope

- keine Aenderung an `app/simulator/` oder `engine/`
- keine Korrektur der Zeitachse
- kein neuer Runner
- keine Freigabe bestehender Zahlen als fachlich richtig
- keine externen Daten oder Netzabfragen

## Geplante Dateien

Voraussichtlich:

- neu: `tests/simulator-backtest-characterization.test.mjs`
- neu: `tests/fixtures/simulator-backtest-baseline-v1.json`
- optional eng begrenzt: `tests/README.md`
- diese Slice-MD und Rueckdokumentation im Arbeitsplan

Programmdateien: voraussichtlich 2. Falls fuer stabile Characterization Produktcode geaendert werden muesste, stoppt der Slice.

## Diff-Risiko vor Coding

```text
Implementierungsstart 2026-07-18:
- `git branch --show-current`: `codex/simulator-backtest-gap-plan`
- `git status --short`:
  - `M docs/internal/README.md`
  - unversioniert: `docs/internal/SIMULATOR_BACKTEST_GAP_ANALYSE.md`
  - unversioniert: `docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md`
  - unversioniert: `docs/internal/SLICE_SIMULATOR_BACKTEST_01_BASELINE_MESSVERTRAG.md` bis `SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md`
  - unversioniert: Playwright-Pakete und Startskripte unter `node_modules/`
- Einordnung: Die Doku- und Playwright-Dateien waren vor Slice-Beginn vorhanden. Sie werden nicht entfernt oder als Slice-Produktcode behandelt. Der aktive Branch entspricht dem Feature-Branch des freigegebenen Arbeitsdokuments.

Geplante Dateien:
- tests/simulator-backtest-characterization.test.mjs
- tests/fixtures/simulator-backtest-baseline-v1.json
- optional tests/README.md
- docs/internal/SLICE_SIMULATOR_BACKTEST_01_BASELINE_MESSVERTRAG.md
- docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md

Voraussichtliche Änderungstiefe:
- klein bis mittel; reine Test-/Fixture-Schicht

Gefährdete bestehende Tests:
- simulator-backtest.test.mjs durch globale DOM/window-Mocks
- Runner-Isolation bei gemeinsam mutierten Globals

Nicht anfassen:
- app/simulator/**
- engine/**
- engine.js
- dist/**
- RuheStandSuite.exe
- node_modules/**

Rollback-Strategie:
- neue Test-/Fixture-Dateien nach Nutzerfreigabe entfernen
- git checkout -- tests/README.md docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md
```

## Geplante Tests

- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `node tests/run-single.mjs tests/runner-contract.test.mjs`
- `npm test`

## Review-Auflagen in diesem Slice

- Claude C-01/C-02/C-05/C-07: Ruin-State, Pflegebucket-Leerfeld, exakt 10 % und `globalBacktestData` v0 explizit einfrieren.
- Gemini G-F-01/G-F-04: Legacy-Alignment gegen Monte Carlo dokumentieren und Non-Mutation nachweisen.
- Die Baseline ist kein fachliches Soll. Nach D-01/D-04 entstehen getrennte `target_expected`-Fixtures; die Legacywerte werden nicht ueberschrieben.

## Stop-Regeln dieses Slice

- Characterization ist mit dem bestehenden Test-Runner nicht deterministisch.
- Fixture muss personenbezogene Finanzdaten oder lokale Exporte enthalten.
- Ein Characterization-Lauf veraendert Persistenz/Realtranchen.
- Stabilisierung erfordert Produktcode.
- FlowDelta ist bereits im Baselinefall auffaellig oder ein Snapshot weicht zwischen identischen Laeufen ab.

## Durchgefuehrte Aenderungen

- `tests/simulator-backtest-characterization.test.mjs` als deterministisches Characterization-Gate angelegt.
- `tests/fixtures/simulator-backtest-baseline-v1.json` als stabil serialisierte `legacy_observed`-Fixture angelegt.
- Sechs echte Laufbaselines plus ein separater exakt-10-%-Grenzfall und fuenf Legacy-Negativfaelle eingefroren.
- Metrikwoerterbuch V1, Alignment-Oracles fuer 2000/2001, `legacy_schema_v0`, Detailtoggle-Paritaet, kanonische Input-/Row-Hashes und Non-Mutation-Gates aufgenommen.
- Delta-Reporter klassifiziert Abweichungen als `unexpected_delta` oder nach expliziter Freigabe als `expected_after_approved_contract_change`.
- `tests/README.md` um Zweck, Aussagegrenze, Fixture und Regenerationskommando ergaenzt.
- Kein Produktcode, keine Engine-Datei und kein generiertes Artefakt wurde geaendert.

## Ausgefuehrte Tests

- `node --check tests/simulator-backtest-characterization.test.mjs`: gruen.
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`: gruen, 65/65 Assertions.
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`: gruen, 46/46 Assertions.
- `node tests/run-single.mjs tests/runner-contract.test.mjs`: gruen, 49/49 Assertions.
- `npm test`: gruen, 112 Testdateien, 4650/4650 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles; Browser-Smoke bleibt als separates Gate ausgewiesen.
- `npm run test:browser` und `npm run test:coverage` wurden in diesem reinen Test-/Fixture-Slice nicht erneut ausgefuehrt; die dokumentierte Planungsbaseline vom 2026-07-18 bleibt unveraendert.

## Ergebnisse

- Fixture-ID: `simulator-backtest-baseline-v1`.
- Fixture-SHA-256: `56f4ec2bfecc15d0f2074e40e58afac91ececb43ab0349a0cd53f581bcb95202`.
- Positive Baseline-IDs:
  - `completed_2000_2005`
  - `completed_1960_2020`
  - `three_bucket_minimum_flex_2005_2014`
  - `capital_poor_ruin_2000_2005`
  - `health_bucket_nested_row_summary_gap`
  - `dynamic_flex_cape_2010_2013`
- Separater siebter Characterization-Fall: `reduction_exactly_10pct_legacy_boundary`.
- Negative Baseline-IDs: `negative_single_year_2010`, `negative_nan_period`, `negative_reverse_period_2012_2010`, `negative_missing_middle_year_2000_2002`, `negative_non_finite_gold_return_2001_2002`.
- Alle positiven FlowDelta-Maxima liegen unter 1 EUR; die eingefrorenen Baselines melden konkret 0 EUR.
- Der Ruinfall enthaelt eine reale Vorjahreszeile, danach die synthetische Null-Ruinzeile und ein positives Legacy-Summary-Endvermoegen von 7.687,50 EUR.
- Der Pflegebucketfall enthaelt eine echte Engine-Jahreszeile unter `row.health_bucket_*`; das Legacy-Summary bleibt wegen des Zugriffs auf die falsche Wrapper-Ebene leer.
- 2000/2001 dokumentieren feldgenau Legacy-Backtest- und aktives Monte-Carlo-Alignment. Fuer 2000 are insbesondere Legacy Gold/Inflation/Zins aus 1999 und MC Gold/Inflation/Zins aus 2000 eingefroren.
- Normale und detaillierte Darstellung erzeugen denselben kanonischen Row-Hash; nur die sichtbare/exportierte Spaltenprojektion ist detailabhaengig.

## Abweichungen vom Plan

- Der aktuelle DOM-Inputpfad liefert keinen direkt aktivierbaren Pflegebucket an `getCommonInputs()`. Um den bereits bestaetigten Summary-Objektebenenfehler ohne Produktcodeaenderung zu charakterisieren, erzeugt der Test eine echte Pflegebucket-Jahreszeile ueber `simulateOneYear()` und projiziert sie testlokal in den unveraenderten Legacy-Wrapper. Diese Abweichung ist im Fall selbst dokumentiert und darf nicht als produktive Inputintegration interpretiert werden.

## Offene Risiken

- Ein zu breites Golden Snapshot kann legitime Refactorings unnoetig blockieren.
- Die Fixture speichert vollstaendige normalisierte Inputs, Kernmetriken, Stichprobenzeilen und Hashes aller kanonischen Rows; Detailfelder werden nicht doppelt vollstaendig ausgeschrieben. Ein Hashdelta benoetigt deshalb zur Diagnose einen lokalen Vergleichslauf.
- Pflegebucket-Inputintegration und Pflegebucket-Summary sind zwei getrennte Risiken. Slice 01 friert nur die Summary-Projektionsluecke mit einer echten Engine-Row ein; die produktive Inputweitergabe bleibt fuer den zustaendigen Fachslice zu inventarisieren.
- Assertions auf bekannte Defekte sind als `legacy_observed_gap` markiert und duerfen nicht als Sollcontract umgedeutet werden.

## Rueckdokumentation

Baseline-IDs, Fixture-Hash, Testergebnisse, Pflegebucket-Testprojektion und bekannte `legacy_observed_gap`-Felder sind im [Arbeitsplan](./SIMULATOR_BACKTEST_HARDENING_PLAN.md) eingetragen.

## Freigabestatus

Implementierung und Selbstpruefung abgeschlossen. Review durch Gemini und Freigabe durch den Nutzer stehen aus. Codex erteilt keine Eigenfreigabe und erstellt keinen Commit.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit (GAPs und Akzeptanzkriterien):**
   - **Abdeckung:** Alle geforderten 6 positiven Golden-Cases (`completed_2000_2005`, `completed_1960_2020`, `three_bucket_minimum_flex_2005_2014`, `capital_poor_ruin_2000_2005`, `health_bucket_nested_row_summary_gap`, `dynamic_flex_cape_2010_2013`) wurden vollständig in `tests/fixtures/simulator-backtest-baseline-v1.json` eingefroren.
   - **Grenzfälle:** Der 7. Fall für die 10-%-Kürzungsgrenze (`reduction_exactly_10pct_legacy_boundary`) ist korrekt als `legacy_observed_gap` hinterlegt.
   - **Negativtests:** Fünf Fälle für unzulässige Perioden (Einjahreslauf, NaN-Jahre, vertauschte Jahre) sowie Datenlücken und NaN-Renditen sind implementiert und verifiziert.
   - **Alignment:** Der Zeitachsen-Mismatch für 2000 und 2001 (Legacy Gold/Inflation/Zins vs. MC Gold/Inflation/Zins) ist als Alignment-Oracle dokumentiert.
   - **Kanonischer Zustand:** `legacy_schema_v0` von `window.globalBacktestData` ist feld- und typspezifisch erfasst.

2. **Vertragstreue:**
   - Die Mocks für `document`, `window`, `localStorage` und `alert` werden im `finally`-Block der Testausführung sauber abgeräumt.
   - Das Metrikwörterbuch V1 beschreibt Nennwert, Vorzeichen und bekannte Defekte präzise.

3. **Fehlerbehandlung:**
   - Die Vergleichsfunktion `collectDiffs` vergleicht tiefe Objektstrukturen rekursiv und erfasst sowohl fehlende als auch zusätzliche Properties.

4. **Seiteneffekte:**
   - Es wurden keine Änderungen an Anwendungsdateien (`app/` oder `engine/`) vorgenommen.
   - Die Integration in die Gesamt-Testsuite ist erfolgreich; `npm test` läuft mit allen 4.650 Assertions fehlerfrei durch.

5. **Was könnte brechen?:**
   - *Formatierungs-Abhängigkeit:* Der Test liest `app/simulator/simulator-backtest.js` ein und sucht per Regex nach den Operatoren der 10-%-Kürzungsgrenze. Ein Code-Formatter (z. B. Prettier) könnte in einem späteren Slice die Leerzeichen verändern und den Test brechen lassen, obwohl die Logik unberührt bleibt.
   - *Datenänderungen:* Eine legitime Erweiterung der historischen Markt- oder Zinsdaten bricht die Baselines und erfordert eine manuelle Regeneration über `UPDATE_BACKTEST_BASELINE=1`.

### 2. Pre-Mortem
Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Szenario:* Bei einer regulären Erweiterung der historischen Datenreihe um das Jahr 2026 wird das Baseline-Fixture über `UPDATE_BACKTEST_BASELINE=1` unbemerkt neu generiert, während gleichzeitig eine unbefugte Änderung an der Steuerberechnungslogik der Engine vorgenommen wurde. Da die Baseline-Fixtures bei einer globalen Regeneration blind überschrieben werden (ohne die einzelnen Deltas dediziert zu verifizieren), wird der Regressionseffekt der Logikänderung stumm geschluckt und gelangt in die Produktion.

### 3. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - *Formatierungssensitivität:* Regex-Prüfungen auf Quelltextebene (`reduction_exactly_10pct_legacy_boundary`) können durch Code-Formatter anschlagen.
  - *Blinde Fixture-Regeneration:* Die Option `UPDATE_BACKTEST_BASELINE=1` birgt das Risiko, funktionale Regressionen bei Daten-Updates unbemerkt zu überschreiben.
- **Pre-Mortem:** (Siehe Szenario oben).

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| S01-IMPL | Codex | Characterization implementiert und Tests gruen | freigegeben durch Gemini | Baseline Fixture und Test-Gate erstellt |
