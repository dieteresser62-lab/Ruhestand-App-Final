# Slice 19 - Runway-KPI vor Jahresauszahlung

**Datum:** 2026-08-04  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Basiscommit:** `32dbef844ffef878995cb0f8446407a4feb14e7f`  
**GitHub-Status:** Der Branch besitzt keinen lokalen Upstream. Codex erstellt
weder Commit noch Push; die externe Freigabe bleibt bei Claude, Gemini oder
dem Nutzer.  
**Status:** technisch umgesetzt und validiert; externe Freigabe offen. Codex
erteilt keine eigene Freigabe

## Fehlerbild und Nutzerentscheidung

Slice 17 hat Ziel-Liquiditaet und Transaktionsentscheidung auf die final
geplante Jahresentnahme umgestellt. Die nachgelagerte Ergebnisbildung
vergleicht `RunwayCoveragePct` jedoch weiterhin mit der Liquiditaet **nach**
der Jahresauszahlung und am Jahresende. Dadurch meldet ein Jahr trotz
erfolgreicher Auffuellung auf den Fuenfjahrespuffer weniger als 100 Prozent
Zieldeckung und wird in der historischen Zusammenfassung als Stressjahr
gezaehlt.

Der Nutzer hat am 2026-08-04 den fachlichen Messzeitpunkt eindeutig
festgelegt: Die Zielerfuellung des Liquiditaetspuffers wird **nach der
Transaktion und vor der Jahresauszahlung** gemessen. Die Jahresend-Reichweite
nach Auszahlung bleibt nur als separat benannte Diagnose erhalten. Die
Korrektur soll auch fuer Monte Carlo gelten.

Zusaetzlich wurde im Sweep-Pfad ein unabhaengiger Einheitenfehler gefunden:
`minRunwayObserved` ist als Monate dokumentiert und dargestellt, wurde aber
aus `RunwayCoveragePct` in Prozent gespeist.

## Preflight vor Coding

- `git branch --show-current`:
  `codex/suite-datenintegritaet-hardening`
- `git status --short`:
  ` M RuheStandSuite.exe`
- `HEAD`: `32dbef844ffef878995cb0f8446407a4feb14e7f`
- `main...HEAD`: 0 Commits hinter, 44 Commits vor `main`
- Branch-Upstream: keiner vorhanden.
- Passung zum Arbeitsplan: Der Nutzer hat die Korrektur auf dem aktuellen
  Branch angeordnet. Slice 19 bleibt Teil der laufenden
  Backtest-Datenpruefung; der vorgemerkte, noch nicht begonnene Slice 18 zur
  Lot-Steuervertragsversionierung wird dadurch nicht vorgezogen oder
  veraendert.
- Vorbestehende Aenderung: `RuheStandSuite.exe` gehoert dem Nutzer und liegt
  ausserhalb dieses Slice. Sie wird weder gelesen, gebaut, zurueckgesetzt noch
  fuer einen spaeteren Commit vorgemerkt.

## Ziel und fachlicher Vertrag

1. Die generische Runway-Zieldeckung und die generischen Runway-Monate eines
   Entnahmejahres verwenden `liq_before_payout`, also die freie Liquiditaet
   nach allen Transaktionen und erzwungenen Verkaeufen, aber vor der
   Jahresauszahlung.
2. Der Nenner bleibt die reconciliierte final geplante Netto-Jahresentnahme
   aus dem gemeinsamen Planned-Withdrawal-Vertrag.
3. Die Jahresend-Reichweite nach Auszahlung bleibt unter einem expliziten
   `post_payout_end_of_year`-Namen erhalten und darf nicht in die generische
   Zielerfuellung oder Stressjahreszaehlung einfliessen.
4. Terminale Ruin- und Todeszeilen ohne ausgefuehrte Jahresentscheidung
   liefern fuer die Runway-Zieldeckung `null` und eine nicht anwendbare Phase,
   nicht eine erfundene Null-Prozent-Beobachtung.
5. Historischer Backtest und Monte-Carlo-Jahreslogs verwenden denselben
   Phasenvertrag. Historische Aggregatmetriken konsumieren ausschliesslich
   anwendbare Vor-Auszahlungs-Zeilen.
6. Sweep und Auto-Optimize aggregieren fuer `minRunwayObserved` echte Monate
   derselben Vor-Auszahlungs-Phase. Der geaenderte Metrikvertrag wird
   versioniert, damit alte Prozentwerte nicht als Monate gelesen werden.
7. Ansparjahre ohne Jahresauszahlung bleiben als eigene Phase getrennt und
   werden nicht nachtraeglich in Entnahme-Runway-Stress umgedeutet.

## Akzeptanzkriterien

- Bei exakt fuenf Jahresentnahmen Liquiditaet vor Auszahlung betragen
  `RunwayCoveragePct` exakt 100 Prozent und der kanonische Runway exakt
  60 Monate, unabhaengig von der danach ausgezahlten Jahresentnahme.
- Die separat benannte Jahresend-Reichweite ist im selben Zeugen um genau
  zwoelf Monate niedriger, sofern keine nachgelagerten Cash-Flows wirken.
- Historische `runway_min_coverage_pct`- und
  `runway_stress_years_below_100_pct`-Werte verwenden nur Zeilen mit der
  kanonischen Phase `after_transaction_before_payout`; falsche oder fehlende
  Phasen werden nicht still akzeptiert.
- Terminale Ruin- und Todeszeilen erzeugen keine kuenstliche
  Null-Prozent-Zieldeckung.
- Monte-Carlo-Normaljahre tragen den zentral erzeugten Vor-Auszahlungswert;
  Ruin- und Todeszeilen bleiben nicht anwendbar.
- `minRunwayObserved` im Sweep ist in Monaten nachweisbar und die Metadaten
  benennen Quelle und Messphase. Resultate mit der alten Vertragsversion
  werden von entscheidungsrelevanten Verbrauchern fail-closed abgelehnt.
- Keine Aenderung an Zielhoehe, Transaktionsentscheidung, Spending-, Steuer-,
  Gold-, Pflege-, Demografie- oder Dynamic-Flex-Safety-Policy.
- Fokussierte Tests, Gesamtsuite, Browser-, Doku- und Diff-Gates bestehen;
  unbeklaerte Finanzdeltas oder `abs(FlowDelta) >= 1 EUR` stoppen den Slice.

## Scope

Produktivcode, maximal sechs Dateien:

- `app/simulator/simulator-year-result.js`
- `app/simulator/historical-backtest-metrics.js`
- `app/simulator/historical-backtest-runner.js`
- `app/simulator/mc-log-builder.js`
- `app/simulator/sweep-runner.js`
- `app/simulator/sweep-metrics-contract.js`

Tests:

- fokussierte Simulator-, historische Backtest-, Monte-Carlo-, Sweep- und
  Worker-/Browser-Vertragszeugen;
- eine neue versionierte Messgrenze nur, falls bestehende
  Charakterisierungsgates die aktuelle Laufzeit semantisch binden;
- alte versionierte Fixtures werden nicht ueberschrieben.

Dokumentation:

- dieses Slice-Dokument;
- `docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md`;
- betroffene Simulator-, Architektur-, Workflow- und Testreferenzen.

## Nicht im Scope

- Zielhoehe oder `liquidityRunwayYears`;
- Engine-Aktionslogik und Dynamic-Flex-Safety-Rohbedarfsbasis;
- Spending-, Mindest-Flex-, Steuer-, Lot-, Gold-, Pflege-, Demografie- oder
  3-Bucket-Policy;
- Bereinigung anderer Legacy-Aliase wie `NeedLiq`, `liqEnd` oder
  `safety_runway_post_months`;
- historische Datenreihen oder persoenliche Exportdaten;
- Slice 18, `engine.js` von Hand, `dist/`, `src-tauri/` oder
  `RuheStandSuite.exe`;
- Commit, Push, Merge oder Freigabe durch Codex.

## Diff-Risiko vor Coding

```text
Geplante Produktivdateien: 6 (unter der Stop-Grenze von mehr als 10)

Wertwirkung:
- keine Aenderung an Portfolio-, Entnahme-, Steuer- oder Aktionsfluss
- erwartete Aenderung ausschliesslich an Ergebnis-/Metrikfeldern,
  Aggregaten, Export-Fingerprints und Sweep-Rangfolgen, soweit die bisherige
  Prozent-als-Monate-Kennzahl Entscheidungen beeinflusste

Gefaehrdete Vertraege:
- Jahreszeilen und historische Export-/Metrikversion
- Monte-Carlo-Worst-Run-Logs
- Sweep-/Auto-Optimize-Metrikversion und Verbraucher
- versionierte Charakterisierungs- und Browserzeugen

Nicht anfassen:
- Nutzerdatei RuheStandSuite.exe
- alte Messfixtures und persoenliche JSON-Exporte
- Engine-/Daten-/Policycode

Rollback:
- bestehende Slice-19-Code-, Test- und Referenzdateien einzeln mit Git auf
  ihren Basisstand zuruecksetzen;
- neue Slice-19-Dateien nur nach ausdruecklicher Loeschfreigabe entfernen;
- RuheStandSuite.exe in keinem Rollback-Kommando nennen.
```

## Geplante Validierung

Vor dem Code-Edit bestanden am 2026-08-04:

- `tests/simulation.test.mjs`: 75/75;
- `tests/historical-backtest-metrics.test.mjs`: bestanden;
- `tests/historical-backtest-runner.test.mjs`: bestanden;
- `tests/simulator-monte-carlo.test.mjs`: bestanden;
- `tests/sweep-metrics.test.mjs`: 32/32;
- `tests/simulator-sweep.test.mjs`: 254/254.

Nach der Umsetzung:

- dieselben fokussierten Tests plus betroffene Charakterisierungs-, Export-,
  Worker-Paritaets- und Browserzeugen;
- `npm test`;
- `npm run test:browser`;
- `npm run docs:evidence`;
- `git diff --check`.

## Durchgefuehrte Aenderungen

- `simulator-year-result.js` berechnet `RunwayCoveragePct`, den generischen
  `entscheidung.runwayMonths` und `ui.runway.months` jetzt unmittelbar aus
  `liqBeforePayout` und der reconcilierten finalen Jahresentnahme. Das neue
  kanonische Rohfeld
  `runway_after_transaction_before_payout_months` traegt denselben Wert; der
  bestehende Safety-Alias bleibt kompatibel.
- `RunwayMeasurementPhase` ist fuer Entnahmejahre
  `after_transaction_before_payout`. Liquiditaet, Deckung und Monate nach
  Auszahlung bleiben als `jahresende`, `deckungJahresende`,
  `RunwayCoveragePostPayoutEndOfYearPct` und
  `runway_post_payout_end_of_year_months` explizit erhalten.
- `HistoricalBacktestMetricsV3` bindet Runway-Minimum und Stressjahre an eine
  vollstaendige Vor-Auszahlungs-Phase aller echten Entnahmezeilen. `null` bei
  nicht anwendbarer Zieldeckung wird aus dem endlichen Nenner ausgeschlossen;
  eine fehlende oder abweichende Phase invalidiert beide Aggregate statt
  unvereinbare Werte zu mischen.
- Synthetische historische Ruinzeilen und Monte-Carlo-Ruin-/Todeszeilen tragen
  `null` und eine explizite Nichtanwendbarkeitsphase. Sie koennen dadurch kein
  kuenstliches Null-Prozent-Minimum oder Stressjahr mehr erzeugen.
- `SweepMetricsV4` und `SweepMetricMetadataV3` definieren
  `minRunwayObserved` als Monate nach Transaktion/vor Auszahlung. Der Runner
  akzeptiert nur das kanonische Monatsfeld mit passender Phase. Alte
  `SweepMetricsV3`-Ergebnisse werden durch bestehende Verbraucher fail-closed
  abgelehnt und muessen neu gerechnet werden.
- Die neue Fixture
  `tests/fixtures/runway-kpi-slice-19-measurement-v1.json` bindet die
  byteidentische Slice-17-Eingangsgrenze, Backtest-, Monte-Carlo-/Sweep- und
  Demografieprojektionen sowie den neuen Metrikvertrag. Alte Fixtures wurden
  nicht geaendert.
- README, technische Referenz, Simulator-Modulreferenz, Fachkonzept,
  Workflow-Pseudocode, Testreferenz und Hauptplan beschreiben die neue Phase
  und die weiterhin getrennte Jahresenddiagnose.

## Ausgefuehrte Tests und Ergebnisdeltas

- Vor dem Produktivcode-Edit bestanden die fokussierten Simulator-,
  historischen Backtest-, Monte-Carlo- und Sweep-Bestandstests.
- Neue synthetische Zeugen belegen exakt 60 Monate und 100 Prozent vor sowie
  48 Monate und 80 Prozent nach einer Jahresauszahlung. Falsche/missing
  Phasen, Prozent-ohne-Monatsfeld, terminaler Ruin und Tod aller Personen sind
  als Negativzeugen abgedeckt.
- Die erste Gesamtsuite nach dem Code-Edit meldete erwartungsgemaess genau zwei
  rote versionierte Slice-17-Laufzeitgrenzen. Keine Fach-, Flow-, Worker- oder
  sonstige Regression trat auf. Nach Anlage der neuen Slice-19-Grenze bestand
  `npm test` mit 167 Dateien, 18.977/18.977 Assertions, 0 Fehlern und 0 offenen
  Handles.
- `npm run test:browser`: 29/29 Browser-Smokes bestanden, einschliesslich
  Monte Carlo, Sweep und Auto-Optimize.
- `npm run docs:evidence`: bestanden, ohne Netzwerkzugriff.
- `git diff --check`: bestanden.
- `npm run build:engine` war nicht erforderlich: Weder `engine/` noch die
  oeffentliche `EngineAPI` wurden geaendert.
- Die neue versionierte 2000-bis-2025-Referenzmessung weist gegen Slice 17
  exakt 0 EUR Delta bei Endvermoegen, Gesamtentnahme und Steuer, keine
  Outcome-/Jahreszahldifferenz und `maxAbsolutePortfolioFlowDelta = 0` aus.
- Rein lesende Off-Repo-Nachrechnung des vertraulichen Nutzerexports: Die
  bisherige historische Mindestdeckung 80,1547 Prozent und 23 Stressjahre
  werden mit der beschlossenen Phase zu 100,4302 Prozent und 0 Stressjahren.
  Fuer 2025 wechseln Zieldeckung und Reichweite von 81,7704 Prozent und rund
  49,06 Monaten nach Auszahlung auf 100,4302 Prozent und rund 60,26 Monate vor
  Auszahlung. Keine absoluten Nutzerdaten wurden in Tests oder Fixtures
  uebernommen.

## Abweichungen, Stoppsignale und offene Risiken

- Der direkte Aufruf von `browser-smoke.test.mjs` ueber den Unit-Test-Wrapper
  ist konstruktionsbedingt ungueltig und endete mit null Assertions. Das
  vorgesehene separate Gate `npm run test:browser` wurde danach vollstaendig
  und erfolgreich ausgefuehrt.
- Bestehende lokale JSON-Exporte werden nicht rueckwirkend veraendert. Nur ein
  neu ausgefuehrter Backtest beziehungsweise eine neue Monte-Carlo-/Sweep-
  Rechnung traegt die V3-/V4-Vertraege und korrigierten Kennzahlen.
- Bei Dominanz des separaten Brutto-Notfallpuffers kann 100 Prozent
  Zieldeckung bewusst von `liquidityRunwayYears * 12` Monaten abweichen. Das
  ist keine Phaseninkonsistenz: Prozentdeckung misst dann das groessere
  operative Euroziel, Monate weiterhin die Reichweite gegen die final
  geplante Nettoentnahme.
- Ansparjahre behalten ihre eigene Phase
  `post_accumulation_end_of_year` und werden nicht in Entnahme-Runway-Aggregate
  aufgenommen.
- Sweep-/Auto-Optimize-Rangfolgen koennen sich aendern, weil der bisherige
  Prozent-als-Monate-Fehler entscheidungsrelevant war. Die neue Version macht
  diese Aenderung sichtbar und verhindert eine stille Weiternutzung alter
  Resultate.
- Keine Stop-Regel wurde ausgeloest: sechs Produktivdateien, ausfuehrbare
  Pflichtgates, kein Engine-Semantikwechsel, keine wirtschaftlichen Deltas,
  kein auffaelliger FlowDelta und kein Mindest-Flex-Clamping.
- Die technische Umsetzung bleibt bis zur Pruefung durch Claude, Gemini oder
  den Nutzer ohne externe Freigabe. Codex erteilt keine eigene Freigabe.
