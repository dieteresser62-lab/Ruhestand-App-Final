# Slice 1 – Synthetischer Nachweis und einheitlicher Reconciliation-Vertrag

**Stand:** 2026-08-17

**Feature-Branch:** `codex/stress-pfad-replay`

**Rolle:** Codex-Implementierung; keine Eigenfreigabe

## Vorabprüfung

- Branch vor Coding: `codex/stress-pfad-replay` (entspricht dem Zielbranch).
- Status vor Coding: nur die vom Orchestrator angelegten, unversionierten Dateien
  `docs/internal/slice-stress-replay-variantenvergleich-bugfix-arbeitsplan-01-synthetischer-nachweis-und-einheitlicher-reconciliation-vertrag.md`
  und `docs/internal/stress-replay-variantenvergleich-bugfix-implement-review-429c3799.md`.
- Diff-Risiko: hoch. Die Source Identity ist persistiert und mehrfach
  fingerprintgebunden. V1 darf nicht umgedeutet werden; V2 muss Feldpräsenz,
  Reihenfolge, Struktur und die unveränderten Pfadtoleranzen erhalten.
- Scope: ausschließlich die für Slice 1 freigegebenen Produkt-, Test- und
  Dokumentationspfade. Der verwaltete Auditbericht wurde nicht verändert.

## Synthetischer Vorab-Nachweis

Vor der ersten Produktcodeänderung wurde in
`tests/stress-replay-runner.test.mjs` ein synthetischer Zwei-Jahres-Fall
ergänzt. Eine Source-Zeile wich um 0,005 EUR und `0,5e-9` von der erzeugten
Zeile ab; beide Abweichungen liegen innerhalb der im Pfad gespeicherten
Grenzen von 0,01 EUR und `1e-9`.

Der fokussierte Lauf
`node tests/run-single.mjs tests/stress-replay-runner.test.mjs` zeigte den
erwarteten Widerspruch:

- direkter Abgleich gegen die Originalzeilen: erfolgreich;
- Abgleich nach Erzeugung und JSON-Roundtrip einer V1-Source-Identity:
  `STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED` in `reconcileRows()`;
- Testdatei: 7 erfolgreiche Assertions, danach 1 fehlgeschlagene Testdatei;
  Prozessstatus 1.

Damit war das im freigegebenen Plan verlangte Gate erfüllt. Reale
Workspace-Daten, Exporte und Fingerprints wurden nicht verwendet.

## Umsetzung

- Neue Source Identities werden als `StressReplaySourceIdentityV2` erzeugt.
  Jede Zeile enthält die strikt gebundenen Strukturfelder und eine begrenzte
  `reconciliationValues`-Projektion der tatsächlich vorhandenen
  Reconciliation-Felder. Die Projektion wird pro Zeile als kanonischer,
  kompakter JSON-String gespeichert: Eine geordnete, versionsgebundene
  Schlüsselzeichenfolge hält die Feldpräsenz fest, die gleich lange
  Werteliste hält die exakten Zahlen. Dadurch wiederholt der äußere lesbare
  Export weder Feldnamen noch Einrückung pro Einzelwert; der Runner expandiert
  beides sowie die ebenfalls versionsgebundenen Struktur-Kurzschlüssel vor
  dem gemeinsamen Abgleich verlustfrei.
  Fehlende optionale Felder werden weiterhin durch fehlende Objekteigenschaften
  dargestellt und nicht erfunden.
- V1- und V2-Validatoren bleiben getrennt. Der gemeinsame Dispatcher liest
  beide Revisionen fail-closed; unbekannte Revisionen werden abgelehnt.
- Workspace-, Source-Descriptor-, Identity- und Exportfingerprints binden die
  V2-Projektion. Eine maximale synthetische Identität mit 60 vollständigen
  Zeilen bleibt innerhalb des unveränderten 2-MiB-Limits.
- Der Runner akzeptiert als persistierte Ausführungsevidenz ausschließlich
  validiertes V2 und führt Originalzeilen und V2-Projektionen durch dieselbe
  feldweise Reconciliation. Struktur und Reihenfolge bleiben exakt;
  Geldwerte verwenden 0,01 EUR beziehungsweise die Pfadtoleranz,
  Verhältniswerte `1e-9` beziehungsweise die Pfadtoleranz.
- V1-Source-Identitäten bleiben unverändert validier-, speicher-, exportier-
  und importierbar, werden jedoch mit dem stabilen Grund
  `source_identity_refix_required` als Nur-Lesen klassifiziert. Die UI nennt
  als Nutzeraktion „Stresspfad neu fixieren“.
- Neu fixierte Workspaces verwenden V2. Es gibt keine automatische Migration,
  keine Ableitung aus dem materialisierten Pfad und kein Clamping von
  Produktwerten oder Toleranzen.
- Nach Finding `C-01` wurde die zunächst ausgeschriebene V2-Projektion auf
  diese kompakte, weiterhin fingerprintgebundene Feldabbildung umgestellt.
  Damit bleiben sämtliche exakten Werte und Präsenzinformationen erhalten,
  ohne das bestehende relative Exportgrößenbudget anzuheben.

## Fokussierte Validierung

Nach der Umsetzung liefen die fünf Slice-Tests erfolgreich:

- `tests/stress-replay-contract.test.mjs`: 109/109 Assertions;
- `tests/stress-replay-runner.test.mjs`: 68/68 Assertions;
- `tests/stress-replay-persistence.test.mjs`: 67/67 Assertions;
- `tests/stress-replay-export.test.mjs`: 27/27 Assertions;
- `tests/stress-replay-ui.test.mjs`: 99/99 Assertions.

Nach der Korrektur zu `C-01` lief außerdem der gezielte bestehende
60-Jahres-End-to-End-Test mit 91/91 Assertions erfolgreich. Der gemessene
Comparison-Export umfasst 109.472 Byte und bleibt damit unter dem
unveränderten relativen Budget von 110.655 Byte sowie unter der
2-MiB-Vertragsgrenze. Das Budget und seine Dokumentation wurden nicht
angehoben.

Der Runner-Nachweis umfasst den echten Workspace- und
Comparison-Export-/Importpfad. Innerhalb der Toleranz, bei fehlendem
optionalen Feld und knapp außerhalb der Toleranz treffen Direkt- und
Reloadpfad jeweils dieselbe Entscheidung. `git diff --check` war ohne Befund.
Die vollständige Validierungsmatrix bleibt dem Orchestrator vorbehalten.

## Offene Risiken und Freigabe

Das größte Restrisiko liegt in bislang nicht vorkommenden optionalen
Source-Log-Feldkombinationen über lange Horizonte. Die Projektion ist deshalb
allowlistbasiert, feldpräsenztreu und durch maximale 60-Zeilen-, Mutations-,
Reihenfolge-, Pfadbindungs- und Roundtriptests abgesichert.

Codex erteilt keine Freigabe. Slice 1 ist zur externen Validierung und zum
Review durch Claude und Antigravity bereit.
