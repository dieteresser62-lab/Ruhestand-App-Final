# Gesamtaudit – e-auswertung-ausgaben-implement

<!-- audit:meta:begin -->
Aufgabe: e-auswertung-ausgaben-implement · Zielbranch: `feature/auswertung-ausgaben` · Lauf: `watch-20261003-162826.876868Z-73b99f8bd2c7` · Stand: abgeschlossen
Provider-Attempts:

| Slot | Rolle | Provider | Profil | Modell | Effort | Binary-Identität |
|---|---|---|---|---|---|---|
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| implementer | implementer | codex | implementation | gpt-6.1-sol | high | verified: ~/.nvm/versions/node/v22.23.2/bin/codex (`b54337198672060af3d8dbf12f54c9b97b0b21a0f72252f03f7f32d63bbfe81d`) |
| reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
| final_reviewer | reviewer | claude | review | opus | high | verified: ~/.local/bin/claude (`88694734fe19206de74d00d345886f58f1223377d235266d22eaa50394a25214`) |
<!-- audit:meta:end -->

## Übersicht

<!-- audit:overview:begin -->
| Slice | Titel | Stand | Commit | Runden | Befunde |
|---:|---|---|---|---:|---:|
| 1 | Jahresausgaben als unveränderliche Projektion absichern | freigegeben | 48b2417f | 1 | 0 |
| 2 | Auswertung mit zwei Abschnitten und frischer lesender Darstellung integrieren | freigegeben | 85b0f778 | 1 | 0 |
| 3 | Kurszeitpunkte der bewerteten Tranchen rückwärtskompatibel speichern | freigegeben | 56f82d4e | 1 | 0 |
| 4 | Automatische Erfassung nach bestätigtem Ausgabenimport absichern | freigegeben | baedcc05 | 2 | 1 |
| 5 | Bedienung und abschließende Prüfverträge dokumentieren | freigegeben | 55325fa8 | 2 | 0 |
<!-- audit:overview:end -->

## Befunde

<!-- audit:findings:begin -->
| ID | Herkunft | Klasse | Stand | Titel |
|---|---|---|---|---|
| R-01 | Slice 4 | Befund | geschlossen | docs/reference/BALANCE_MODULES_README.md: Die Modulinventur bekommt mit… |
<!-- audit:findings:end -->

## Halte und Entscheidungen

<!-- audit:holds:begin -->
Keine.
<!-- audit:holds:end -->

## Abnahmereview

<!-- audit:acceptance-review:begin -->
Abnahmereview abgeschlossen.

Geprüft:
> Geprüft habe ich den vollständigen Branch-Diff (15 Teile) gegen den Arbeitsplan, die Slice-Pfade und authorized_paths. Alle geänderten Pfade liegen innerhalb der Grenze. Korrektheit: prepareExpensesHistoryMetrics übernimmt die Kennzahlen direkt aus computeYearStats; nur die Monate 1–12 zählen, Jahre bloß aus der Jahresauswahl werden ausgefiltert. Der Renderer zeichnet nur bei aktivem Panel, escaped alle Werte und gibt im Hinweis keine Rohdaten aus. Frischegate: Die Grenze liegt exakt bei 604800000 ms, zukünftige oder ungültige Zeitpunkte ergeben 'unknown', zusätzlich wird die Bewertungszuordnung geprüft. Fehlerpfade: Der Import wird vor dem optionalen Schritt geflusht, die Erfassung läuft seriell über tail und importTail, Fehler landen im eigenen Scope 'expenses-wealth' ohne Rücknahme des Imports. Resume und Idempotenz: Tagesersetzung manual:YYYY-MM-DD, Prüfung von Kontext, Pending-Commit und laufendem Jahresabschluss, sourceFingerprint mit exakt bekanntem Schreibziel. Tranchenvertrag: asOf ist optional und wird strikt validiert; die Formularlogik erhält oder entfernt das Feld passend. Die Doku ist in allen fünf Dokumenten konsistent (1366 px, „Unterjährig“, Anker). Die Attestation für npm test ist PASS, ihr Fingerprint passt.

Größtes Restrisiko:
> Nicht verifizierbar, weil der Snapshot nur den Diff enthält und balance-reader, Profilverbund-Aggregator und calculateTrancheDerivedValues fehlen: readExpensesWealthQuoteEvidence vergleicht depotwertAlt+depotwertNeu bzw. geldmarktEtf sowie marketValue gegen shares*currentPrice mit absoluter Toleranz 1e-6. Runden Aggregator oder marketValue auf Cent, bleibt die Automatik bei Bruchteilsanteilen dauerhaft 'unknown'. Die Tests verwenden nur ganzzahlige Werte. Außerdem ist die gemeinsame Tabzeile ab 1366 CSS-Pixeln nur als Browser-Assertion beschrieben und noch nicht gemessen.

Bruchbedingung:
> Ein Befund wäre nötig, wenn ein Aggregat oder marketValue bei realen Bruchteilsanteilen gerundet wird und dadurch frisch bewertete ETF-Bestände als 'unknown' gelten. Ebenso, wenn der externe Browserlauf `Balance wealth layout SOURCE` bei 1366 px keine gemeinsame Tabzeile misst oder die Kursquelle nicht ganzzahlige asOf-Werte liefert, die die Tranchenspeicherung mit TRANCHE_AS_OF_INVALID ablehnt.

Vorab-Risikoanalyse:
> Wenn das Feature nach dem Merge scheitert, dann am wahrscheinlichsten so: Die automatische Sicherung meldet bei echten Depots mit Bruchteilsanteilen oder gerundeten Aggregaten dauerhaft „Kursdatum unbekannt“, weil die exakte Bewertungszuordnung mit 1e-6 Toleranz nicht zu den Aggregatwerten passt. Zweitens kann eine leicht in der Zukunft liegende Kurszeit (Uhrabweichung) direkt nach einem Kursupdate als unbekannt gelten. Drittens könnte die 1366-px-Tabzeile in anderen Schriftmetriken umbrechen. Daten gehen dabei nicht verloren und es entstehen keine falschen Writes; es fällt lediglich die Komfortfunktion aus. Der externe Browser-Smoke vor dem Merge ist deshalb Pflicht.
<!-- audit:acceptance-review:end -->
