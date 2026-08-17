# Slice 3 – Exakter Flex-Durchstich, Kompatibilität und Dokumentationssync

**Stand:** 2026-08-17

**Feature-Branch:** `codex/stress-pfad-replay`

**Rolle:** Codex-Implementierung; keine Eigenfreigabe

## Vorabprüfung

- Branch vor Coding: `codex/stress-pfad-replay` (entspricht dem Zielbranch).
- Status vor Coding: nur die vom Orchestrator angelegte Änderung am verwalteten
  Implementierungsbericht und die unversionierte Slice-Arbeitsdatei.
- Scope: ausschließlich die für Slice 3 freigegebenen Test-, Dokumentations-
  und Slice-Pfade. Verwaltete Auditblöcke wurden nicht editiert.
- Diff-Risiko: mittel. Der echte Engine-Durchstich kann Contract-,
  Fingerprint- oder Reconciliation-Abweichungen offenlegen; solche
  Abweichungen werden nicht durch angepasste Fixtures kaschiert.

## Umsetzung

- `tests/stress-replay-e2e.test.mjs` enthält einen zusätzlichen vollständig
  synthetischen 35-Jahres-Durchstich. Die Baseline verwendet 90.000 EUR
  Flex-Bedarf und 30.000 EUR Mindest-Flex; die Alternative ändert ausschließlich
  diese Blätter auf 28.000 EUR und 12.000 EUR.
- Vorschau, Variantenerzeugung und Patchanwendung bewahren die beiden Werte
  exakt. Baseline und Alternative laufen mit der echten Engine auf demselben
  materialisierten Pfad; der Comparison-Builder liefert `complete`, beide Arme
  bleiben frei von technischen Fehlern und besitzen getrennte
  Variantenfingerprints.
- Die ersten echten finanziellen Jahresrecords belegen unverändert 30.000 EUR
  beziehungsweise 12.000 EUR `minimumFlexConfiguredAnnualEur`. Baseline,
  Pfadfingerprint und synthetische Source-Zeilen bleiben über den gesamten
  Ablauf unverändert.
- Workspace, Vergleichsexport und Import erhalten V2-Source-Identity-,
  Workspace- und Vergleichsbindung. Ein erneuter Baselinelauf gegen die
  importierte V2-Identität reconciliert ohne Originallogs und erzeugt denselben
  Resultatfingerprint wie der direkte Lauf.
- Das bestehende synthetische Golden-V1-Exportorakel belegt zusätzlich den
  Nur-Lesen-Status und den stabilen Grund `source_identity_refix_required`,
  ohne Migration oder Umschreiben der V1-Evidenz.
- README, technische Referenz, Simulator-Modulreferenz und Handbuch beschreiben
  Source Identity V2, V1-Nur-Lesen/Refix, die getrennten Mutations- und
  Vergleichsstatus sowie den erweiterten Klartext-Finanzdatenumfang.
  Vollständige Source-Scenario-Logs, lokale Pfade, Secrets und unbeteiligte
  Speicherrecords bleiben entsprechend dem bestehenden Exportvertrag
  ausgeschlossen.
- Die technischen Referenzen dokumentieren die gemessenen 109.472 Byte, das
  relative Limit von 110.655 Byte, die verbleibenden 1.183 Byte (rund 1,1
  Prozent) und die Pflicht zur Neumessung bei Erweiterung von
  `SOURCE_IDENTITY_V2_RECONCILIATION_FIELDS`.
- `tests/browser-smoke.test.mjs` wurde nicht geändert: Der in Slice 2 ergänzte
  echte Recompute-Click deckt sichtbaren Alert, stabilen Fehlerstatus, Fokus
  und HTML-Escaping bereits vollständig ab.

## Fokussierte Validierung

- `node tests/run-single.mjs tests/stress-replay-e2e.test.mjs`: 115/115
  Assertions erfolgreich.
- `node tests/run-single.mjs tests/browser-smoke.test.mjs`: für diese als
  Main-Programm aufgebaute Datei ungeeignet; der Runner importiert sie ohne
  Ausführung und meldet deshalb null Assertions.
- `node tests/browser-smoke.test.mjs`: Start vor dem ersten Test mit
  `listen EPERM 127.0.0.1` durch die lokale Agentensandbox blockiert. Dies ist
  gemäß Orchestratorvertrag kein fachlicher Stop; das autoritative Browser-Gate
  läuft außerhalb dieser Portbeschränkung.
- `git diff --check`: erfolgreich.

Die vollständige Repository-Matrix wird absichtlich nicht im
Implementer-Prozess ausgeführt; die autoritative Validierung gehört dem
Orchestrator.

## Abweichungen und offene Risiken

Keine fachliche Abweichung vom freigegebenen Slice-Plan. Der Browser-Smoke
benötigte keine weitere Teständerung, weil Slice 2 Fehlerzustand und Erholung
bereits über den registrierten DOM-Click absichert.

Die akzeptierten Beobachtungen `C-02` und `C-03` sind durch den expliziten
Datenschutzhinweis und die Größenbudget-/Kompaktkodierungsdokumentation
umgesetzt. `C-04` bleibt eine zukünftige Wartungsbeobachtung: Neue
Mutations-Aufrufer müssen den Fehlerzweig entweder über eine gemeinsame Hilfe
oder einen eigenen UI-Test gegen das Überschreiben durch Erfolgscopy sichern.

Das größte Restrisiko ist eine spätere Erweiterung der V2-Feldliste, die den
knappen Exportpuffer verbraucht oder neue Finanzwerte ohne synchronisierten
Datenschutzhinweis einführt.

Codex erteilt keine Freigabe. Slice 3 ist nach den fokussierten Checks zur
externen Validierung und zum Review durch Claude und Antigravity bereit.
