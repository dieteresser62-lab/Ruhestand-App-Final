# Slice 09: Forschungs-, Daten-, Kosten- und Holdout-Gates

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)<br>
**Feature-Branch:** `codex/simulator-backtest-gap-plan`<br>
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe<br>
**Status:** implementiert und selbstgeprueft; externe Forschungsarbeit bleibt blockiert, adversariales Review ausstehend<br>
**Abhaengigkeit:** kann nach Datenmanifest aus Slice 03 beginnen; Laufmanifest-/Trial-Verweise werden nach Slice 07 finalisiert<br>
**GAPs:** BT-07, BT-13, BT-17, BT-18

## Ziel

Die Grenze zwischen technischem Backtest-Hardening und belastbarerer Forschungsvalidierung wird operationalisiert. Offene Datenvarianten, Lizenzen, Kosten, Trial-Inventar und Holdouts werden in ein separates, versioniertes Studien-/Folgevorhaben mit Ownern, Eingangsgates, Abbruchregeln und erlaubten Aussageformen ueberfuehrt.

Dieser Slice schliesst keine externe Evidenzluecke durch Dokumentation allein. Er verhindert, dass technische Verbesserungen als Wirksamkeitsfreigabe missverstanden werden.

## Akzeptanzkriterien

- Ein separates Forschungsprotokoll verweist auf FQ-01, FQ-02 und FQ-03 und enthaelt mindestens FV-G01 bis FV-G08.
- Offene Manifestfelder (`msci_eur`-Variante, Gold-Missingness, Quellen/Lizenzen, Transformationen) bleiben mit Owner, naechstem Nachweis und Blockierwirkung sichtbar.
- Kosten-/Steuervertrag listet explizit Produktkosten, Transaktionskosten, Spread, FX, Rebalancing, Steuerumfang und Sensitivitaetsbaender als `modelled | not_modelled | unresolved`.
- Historisch bereits betrachtete Perioden/Varianten werden als explorativ/kontaminiert markiert; keine nachtraegliche Behauptung eines unangetasteten Holdouts.
- Trial-Schema und Kontaminationsregeln sind definiert. Ein persistentes Trial-Log wird nur nach ausdruecklicher Nutzerentscheidung, Speicher-/Datenschutzcontract und eigener Implementierungsslice geplant.
- Ein Holdout-Custodian, Daten-/Kapitalmarktmethodik-Owner und gegebenenfalls externer Steuer-/Rechtsreview sind als benoetigte Rollen benannt; fehlende Namen lassen den Status blockiert.
- Erlaubte Produkttexte sind begrenzt auf „historische In-sample-Diagnose“, „technisch getestet“ oder „unter diesen Annahmen beobachtet“.
- Ein eigenes Folgearbeitsdokument ist Voraussetzung fuer Datenersetzung, internationales Dataset, Kosten-Cashflows oder Policy-Wirksamkeitsvergleich.
- Keine Produktivcodeaenderung und keine Holdoutauswertung in diesem Slice.

## Scope

- Studien-/Validierungsprotokoll und Rollen-/Gate-Matrix
- Daten-/Kosten-/Trial-/Holdout-Inventar
- Kontaminations- und Aussagegrenzen
- Verlinkung mit Forschungsvalidierungs-Backlog und Evidenzregister
- Entscheidung, welches Folgearbeitsdokument als naechstes zulässig ist

Owner-, Lizenz-, Kosten- und Holdout-Gates koennen unabhaengig von der Zeitachsenimplementierung dokumentiert werden. Der Slice gilt jedoch erst als abgeschlossen, wenn das tatsaechliche Laufmanifest aus Slice 07 referenziert und sein Unterschied zu einem persistenten Trial-Log festgehalten ist.

## Nicht-Scope

- keine Beschaffung/Integration neuer Daten
- keine Kosten-/Steuer-Cashflows
- keine Holdoutentsperrung oder -auswertung
- kein Policyvergleich
- kein persistentes Trial-Logging
- keine Wirksamkeitsfreigabe

## Geplante Dateien

Voraussichtlich nur Dokumentation:

- neu: `docs/internal/SIMULATOR_BACKTEST_FORSCHUNGSPROTOKOLL.md`
- geaendert: `docs/internal/FORSCHUNGSVALIDIERUNGS_BACKLOG.md`
- geaendert: `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`
- geaendert: `docs/reference/DATA_SOURCES.md`
- optional: `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- diese Slice-MD und Arbeitsplan

Programmdateien: 0.

## Gate-Matrix

| Gate | Status vor Slice | Abschlussbedingung |
| --- | --- | --- |
| FV-G01 Baseline/Protokoll | teilweise aus Slice 01 | Frage, Hypothese, Metriken, Abbruch vor Ergebniseinsicht eingefroren |
| FV-G02 Datenmanifest | technisch vorbereitet in Slice 03 | genaue Variante/Lizenz/Transformation oder explizit blockierendes `unresolved` |
| FV-G03 Kosten-/Steuervertrag | offen | vollstaendige Modellierungs-/Nichtmodellierungsmatrix |
| FV-G04 Produktvertraege | teilweise | Real-/Nominal-/Prozent-/Outcome-Vertraege nachgewiesen |
| FV-G05 Trial-Log | offen | Schema + Nutzerentscheid; Alttrials als unvollstaendig markiert |
| FV-G06 Holdout | offen | Custodian, Partition, Sperre und Kontamination dokumentiert |
| FV-G07 Ergebnisbuendel | technisch aus Slice 06 | vollstaendig, inklusive negativer/instabiler Outcomes |
| FV-G08 Review/Replikation | offen | unabhaengiger Methodenreview/Replikationsplan |

## Diff-Risiko vor Coding

```text
Vor Dokumentstart:
- git branch --show-current: codex/simulator-backtest-gap-plan
- git status --short:
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_09_FORSCHUNGS_GATES.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md
  ?? node_modules/.bin/playwright
  ?? node_modules/.bin/playwright-core
  ?? node_modules/.bin/playwright-core.cmd
  ?? node_modules/.bin/playwright-core.ps1
  ?? node_modules/.bin/playwright.cmd
  ?? node_modules/.bin/playwright.ps1
  ?? node_modules/playwright-core/
  ?? node_modules/playwright/

Geplante Dateien:
- neu: docs/internal/SIMULATOR_BACKTEST_FORSCHUNGSPROTOKOLL.md
- geaendert: docs/internal/FORSCHUNGSVALIDIERUNGS_BACKLOG.md
- geaendert: docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md
- geaendert: docs/reference/DATA_SOURCES.md
- geaendert: docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md
- geaendert: diese Slice-MD

Voraussichtliche Änderungstiefe:
- mittel; normative Aussage-/Forschungsgates

Gefährdete bestehende Tests:
- architecture-evidence.test.mjs bzw. Docs-Evidenzvalidator bei neuen IDs/Links
- project-license-metadata.test.mjs nur bei Lizenzmetadaten

Nicht anfassen:
- Produktivcode, Tests/Fixtures mit Holdoutdaten
- engine/**, app/**, workers/**
- konkrete Holdoutdaten
- dist/**, engine.js, RuheStandSuite.exe
- vorhandene unversionierte Playwright- und Slice-10-Artefakte

Rollback-Strategie:
- git checkout -- fuer alle geaenderten bestehenden Markdown-Dateien
- neues Forschungsprotokoll und die bereits unversionierte Slice-Datei nur nach Nutzerfreigabe entfernen
```

## Geplante Tests/Checks

- Link-/ID-/Pflichtfeldpruefung per vorhandenem Evidenzvalidator
- `npm run docs:evidence`
- `node tests/run-single.mjs tests/architecture-evidence.test.mjs`
- `node tests/run-single.mjs tests/project-license-metadata.test.mjs` falls Lizenzfelder betroffen
- `npm test`

## Stop-Regeln dieses Slice

- Ein ungeklärtes Daten-/Lizenzfeld soll ohne Nachweis auf „known“ gesetzt werden.
- Ein bereits eingesehener Zeitraum soll als unangetasteter Holdout gelten.
- Nutzer hat persistentes Trial-Tracking nicht autorisiert.
- Kostenmodell wuerde Engine-Semantik erfordern.
- Owner/Custodian fehlen, aber Status soll trotzdem angehoben werden.
- Dokumentation behauptet Wirksamkeit, Eignung oder Safe Withdrawal.

## Durchgefuehrte Aenderungen

- Neues `SIMULATOR_BACKTEST_FORSCHUNGSPROTOKOLL.md` mit Protokoll-ID
  `SimulatorBacktestResearchProtocolV1`. Es verknuepft FQ-01 bis FQ-03 mit
  FV-G01 bis FV-G08, Rollen, Pflichtartefakten, Blockierwirkung und
  Abbruchregeln. Alle Forschungsfragen bleiben `FV0 / blockiert`.
- Rollenmatrix fuer Daten-/Kapitalmarktmethodik, Validierung/Statistik,
  Ergebnis-/Risikometrik, Holdout-Custodian, externen Steuer-/Rechtsreview und
  unabhaengigen Methodenreview. Fehlende Personennamen bleiben explizite
  Blocker und werden nicht durch Implementer oder technische Reviewer ersetzt.
- Daten-/Lizenzinventar fuer Dataset `ruhestandsapp-historical-data-v1`,
  Revision `2026-07-18.1` und den kanonischen SHA-256
  `8246422d98657c2a76b750ce9fd1253e01aa7a9a4dfa0f0f01dcb96b5507ef29`.
  Varianten, Quellen und Lizenzen aller sechs Reihen bleiben `unresolved`;
  Vor-1950-Ursprung/Transformation und 42 Gold-Nulljahre sind mit Owner,
  naechstem Nachweis und Blockierwirkung festgehalten.
- Kosten-/Steuermatrix mit den Statuswerten `modelled`, `not_modelled` und
  `unresolved` fuer Produktkosten/TER, Transaktionsgebuehren, Spread, Slippage,
  FX, Rebalancing/-kosten, Kapitalertragsteuer, Rentensteuerquote,
  Steuerumfang, Zeitvertrag und Sensitivitaetsbaender. Keine Cashflow- oder
  Engine-Semantik wurde geaendert.
- Dokumentarisches Pflichschema `ResearchTrialRecordV1` fuer Identitaet,
  Protokoll-/Code-/Datenhashes, Kandidatenraum, Seeds, Runmanifest, Ergebnis,
  Fehler/Abbruch, Nutzerinteraktion, Append-only-Integritaet und Datenschutz.
  Slice 09 autorisiert keine Persistenz.
- Kontaminationsregister: Die eingebettete Historie 1925-2025, alle daraus
  gebildeten Backtestfenster, Rolling Cohorts und bisher betrachteten Policies
  sind bestaetigungsbezogen explorativ/kontaminiert. Ein Train-/Test-Seed-Split
  desselben Generators ist kein externer Holdout. Es existiert kein
  unangetasteter Holdout.
- Erlaubte Produktaussagen sind auf `historische In-sample-Diagnose`,
  `technisch getestet` und `unter diesen Annahmen beobachtet` begrenzt.
  Wirksamkeits-, Sicherheits-, Optimierungs- und Eignungsaussagen bleiben
  gesperrt.
- Als naechstes zulaessiges Folgearbeitsdokument ist nach Benennung des
  Daten-/Kapitalmarktmethodik-Owners nur ein reines
  `FQ01_DATEN_KOSTEN_INVENTAR_PLAN.md` definiert. Datenersetzung,
  internationales Dataset, Kosten-Cashflows, Trial-Logging und Policyvergleich
  bleiben getrennte Folgevorhaben.
- Forschungsbacklog, Evidenzregister, Data-Sources-Referenz und Arbeitsplan
  wurden auf denselben Gate-Status synchronisiert. In `DATA_SOURCES.md` wurde
  ausserdem der veraltete Slice-03-Proposal-Text auf den seit Slice 04 aktiven
  `approved_d01`-/Temporal-Contract berichtigt.
- Produktivcode, Tests, Fixtures, Engine, Worker, Persistenz, Holdoutdaten und
  generierte Artefakte blieben unveraendert.

## Ausgefuehrte Tests

- `npm run docs:evidence`: bestanden; 69 MKT-Records, 55 FOR-Records, 17
  MAP-Anker, 11 Markt- und 7 Forschungs-Reviewscopes; keine Netzwerkzugriffe.
- `node tests/run-single.mjs tests/architecture-evidence.test.mjs`: 19/19
  Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/project-license-metadata.test.mjs`: 14/14
  Assertions, 0 Fehler.
- `npm test`: 119 Testdateien, 5722/5722 Assertions, 0 fehlgeschlagene Dateien,
  0 fehlgeschlagene Separate Gates und 0 offene Handles.

## Ergebnisse

- Alle Akzeptanzkriterien des Dokumentationsslice sind umgesetzt. Der Slice
  schliesst die technische Gate-Dokumentation, hebt aber bewusst keine
  Forschungsfrage oder Evidenzstufe an.
- `HistoricalBacktestExportV1` ist eindeutig als reproduzierbares
  Einzellaufmanifest abgegrenzt. Es ist weder ein vollstaendiges Trial-Log noch
  ein Holdout-Nachweis.
- Kein ungeklärtes Manifestfeld wurde auf `known` angehoben, kein betrachteter
  Zeitraum als unangetastet umgedeutet und keine externe Fachrolle erfunden.
- Programmdateien: 0. Rechenwerte, Engine-Semantik, FlowDelta und
  Snapshot-/Backtest-Ergebnisse sind unveraendert.

## Abweichungen vom Plan

- `ARCHITEKTUR_UND_FACHKONZEPT.md` blieb unveraendert, da Forschungsrisiken,
  FQ-Status und Aussagegrenzen dort bereits normativ korrekt sind. Die
  operationalen Slice-09-Details liegen wie geplant im neuen Protokoll,
  Forschungsbacklog, Evidenzregister und in `DATA_SOURCES.md`.
- Die Data-Sources-Referenz enthielt noch den ueberholten Stand, der
  `HistoricalYearRecordV1` als inaktiven Slice-03-Vorschlag bezeichnete. Der
  Dokumentationssync wurde innerhalb derselben bereits geplanten Datei auf den
  tatsaechlichen Slice-04-Vertrag begrenzt.

## Offene Risiken

- Historische Trial-Historie ist wahrscheinlich nicht vollstaendig rekonstruierbar; das muss als Kontamination bestehen bleiben.
- Verfuegbare Daten koennen Lizenz- oder Vergleichbarkeitsgates nicht erfuellen.
- Technische Reviewer ersetzen keinen externen Daten-/Kapitalmarkt-/Steuerfachreview.
- Ein kuenftiges Trial-Register kann sensible Finanzannahmen enthalten; ohne
  ausdruecklichen Speicher-, Zugriffs-, Aufbewahrungs- und Datenschutzentscheid
  darf es nicht implementiert werden.
- Neue Kalenderjahre oder internationale Daten sind nicht automatisch
  unangetastete Holdouts. Ohne vorab benannten Custodian und Sperrprotokoll
  werden auch sie explorativ.

## Rueckdokumentation

Gate-Status, benoetigte Rollen, blockierte Punkte, Runmanifest-/Trial-Grenze,
Kontamination und zulaessiges Folgearbeitsdokument sind im Arbeitsplan,
Forschungsbacklog, Evidenzregister und in `DATA_SOURCES.md` eingetragen.

## Freigabestatus

Freigegeben am 2026-07-19. Die Akzeptanzkriterien für Forschungsfragen-Abgrenzung, Datenlizenzierung, Holdout-Regeln und Evidenzregister sind vollständig in Dokumentation gegossen. Der Evidenz-Validator läuft erfolgreich durch. Ein lokaler Commit wird durchgeführt.

## Review-Feedback von Gemini

## Review-Resultat
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - **Rein dokumentarische Härtung**: Da dieser Slice ausschließlich Dokumentation ändert, wird keine reale Evidenzlücke im Datenstamm selbst behoben. Alle unklaren MSCI/Gold-Quellen verbleiben im Status `unresolved` und blockieren zukünftige Wirksamkeitsbehauptungen, was jedoch exakt der Sinn dieser Forschungs-Gates ist.
- Pre-Mortem:
  Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Entwickler erweitert den historischen Datenbestand um neuere Kalenderjahre und ignoriert dabei die definierten Partitionierungs- und Custodian-Regeln für Holdouts. Da der Preflight die Datei nur auf strukturelle Gültigkeit prüft, entsteht eine schleichende Kontamination des Testdatensatzes, wodurch das Holdout-Prinzip für wissenschaftliche Replays unbrauchbar wird.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| D-06 | Nutzer | Persistentes Trial-Log | nicht durch den Slice-09-Auftrag autorisiert | Schema und Entscheidungs-/Datenschutzgate dokumentiert; keine Implementierung |
| D-07 | Fachowner | Datenquellen/-lizenzen | offen; Owner nicht benannt | alle unbelegten Felder bleiben `unresolved`, Datenersetzung blockiert |
| D-08 | Nutzer/Fachowner | Kostenmodell als Folgefeature | offen; kein stiller Cashfloweingriff | Istinventar dokumentiert; zuerst `FQ01_DATEN_KOSTEN_INVENTAR_PLAN.md`, danach eigenes Arbeitsdokument |
