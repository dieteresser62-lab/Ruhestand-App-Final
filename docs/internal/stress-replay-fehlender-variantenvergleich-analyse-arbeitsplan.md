# Arbeitsplan: Fehlender Variantenvergleich im Stresspfad-Replay

**Stand:** 2026-08-17

**Status:** Planentwurf; externes Review ausstehend

**Autor:** Codex (Implementer, keine Eigenfreigabe)

**Zielbranch:** `codex/stress-pfad-replay`

**Planungsbaseline:** Branch `codex/stress-pfad-replay`, HEAD `5eeca8b2`

**Branch-Status:** lokal vorhanden; kein Upstream eingetragen, Veröffentlichung
ausstehend

**Orchestrierung:** State v3, `PLAN_ONLY`; die Analyse beginnt erst nach dem
geprüften und committeten Plan-Handoff

## 1. Anlass und Untersuchungsziel

Nach dem Fixieren eines Monte-Carlo-Stresspfads lässt sich eine Variante
„Reduziert“ mit Flex-Bedarf 28.000 EUR und Mindest-Flex 12.000 EUR anlegen. Die
Variantenliste zeigt beide Abweichungen gegenüber der Baseline von 90.000 EUR
beziehungsweise 30.000 EUR. Dennoch bleibt nach der automatischen Berechnung
beziehungsweise nach „Neu berechnen“ die Leerdarstellung „Noch kein
Variantenvergleich berechnet.“ sichtbar.

Die Analyse soll den ersten tatsächlichen Fehlschlag im vollständigen Pfad von
der Formulareingabe bis zur Renderer-Eingabe `comparison` reproduzierbar
bestimmen. Sie trennt dabei drei Ebenen:

1. korrekte Erfassung, Normalisierung, Persistenz und Anwendung der beiden
   numerischen Patchwerte;
2. den Berechnungsfehler oder Rückgabewert, der `comparison` auf `null` hält;
3. eine gegebenenfalls nachgelagerte Statusmeldung, die den ursprünglichen
   Fehlertext überschreibt, ohne selbst die Ursache des leeren Vergleichs zu
   sein.

Das Ergebnis ist eine reine Ist-Analyse. Es klassifiziert den Fall eindeutig
als Bedienfehler, erwartetes Verhalten, Dateninkompatibilität oder
Softwaredefekt und beantwortet „Mache ich etwas falsch?“ verständlich. Ein
Defekt wird nur mit minimalem Korrektur- und Regressionstestumfang beschrieben,
nicht behoben.

## 2. Verifizierte Ausgangslage und Kontrollpunkte

Die Planung beruht auf folgenden, im aktuellen Branch sichtbaren
Integrationspunkten:

- `readVariantPatch()` in `app/simulator/stress-replay-ui.js` überspringt nur
  die exakte leere Zeichenfolge `''` und wandelt Zahlenfelder mit `Number()`
  um. Damit sind leer, `0`, 28.000 und 12.000 entlang des tatsächlichen
  UI-Pfads getrennt nachzuweisen.
- `defaultRunComparison()` führt jede Workspace-Variante über
  `runStressReplayPathV1()` aus und übergibt anschließend dieselbe
  Variantenliste samt Resultaten an `buildStressReplayComparisonV1()`.
- `computeComparison()` setzt `comparison` und `comparisonResults` vor jedem
  Lauf zurück. Es fängt geworfene Fehler intern ab, schreibt den Status
  „Variantenvergleich fehlgeschlagen: …“, rendert mit leerem Vergleich und
  gibt `null` zurück.
- `addVariant()` ignoriert derzeit den Rückgabewert von `computeComparison()`
  und setzt danach eine Erfolgsmeldung. `removeVariant()` verfährt analog. Der
  Recompute-Pfad reicht dagegen den Rückgabewert von `computeComparison()`
  durch; der Click-Handler und der abschließende Busy-/Render-Pfad sind gesondert
  zu prüfen.
- Variantenanwendung, effektive Bedarfsrelation sowie Varianten- und
  Eingabefingerprints liegen in `stress-replay-variant.js` und
  `stress-replay-contract.js`; Resultat- und Vergleichsidentität liegen in
  Runner, Comparison-Builder und Contract-Validator.
- `tests/stress-replay-ui.test.mjs` stellt bereits einen injizierbaren
  Controller/Fake-DOM-Aufbau bereit. `tests/stress-replay-e2e.test.mjs` enthält
  einen realen 60-Jahres-Durchstich für V2-Bedarfswerte, jedoch nicht exakt den
  gemeldeten Wertepaar- und Statusfehler.

Diese Punkte sind noch keine Ursachenfeststellung. Insbesondere gilt die
sichtbare Statusüberschreibung bis zum reproduzierten Berechnungsfehler nur als
separate Defekthypothese.

## 3. Scope und unveränderliche Grenzen

### Schreibscope

Im Analyse-Slice wird ausschließlich der neue Bericht
`docs/internal/STRESS_REPLAY_FEHLENDER_VARIANTENVERGLEICH_ANALYSE.md` angelegt.
Es werden keine bestehenden versionierten Dateien geändert. Vom Orchestrator
verwaltete Plan-, Slice- und Reviewartefakte bleiben außerhalb dieses
fachlichen Schreibscopes.

### Lesescope

Der Kontrollfluss wird ausschließlich in folgenden Produktmodulen untersucht:

- `app/simulator/stress-replay-ui.js`
- `app/simulator/stress-replay-runner.js`
- `app/simulator/stress-replay-comparison.js`
- `app/simulator/stress-replay-variant.js`
- `app/simulator/stress-replay-contract.js`
- `app/simulator/stress-replay-renderer.js`

Als Testorakel und Reproduktionsvorlagen dürfen alle vorhandenen
`tests/stress-replay-*.test.mjs` sowie deren vorhandene Fixtures gelesen und
unverändert ausgeführt werden. Ein synthetischer Nachweis darf nur über
Standard-Eingabe oder in einem temporären Verzeichnis außerhalb des
Repositorys entstehen und wird nicht versioniert.

### Nicht-Scope

- keine Produktcode-, Test-, Fixture-, Snapshot- oder Baselineänderung;
- keine Änderung bestehender Dokumentation;
- keine Änderung von Engine-Semantik, Replay-Vertrag oder Fingerprints;
- kein Build und keine Änderung von `engine.js`, `dist/` oder
  `RuheStandSuite.exe`;
- kein Commit, Push, Merge oder Release durch Codex;
- keine Nutzung oder Veränderung realer Profile, Tranchen oder gespeicherter
  personenbezogener Finanzdaten.

## 4. Reproduktions- und Beweismethode

### 4.1 Baseline und Bedienfolge

Der Bericht dokumentiert zunächst den genauen reproduzierten Ablauf:

1. einen vorhandenen Fixture-Pfad oder einen minimal synthetisch erzeugten,
   gültigen Workspace mit Baseline-Variante laden beziehungsweise fixieren;
2. Baseline `startFlexBedarf = 90000` und `minimumFlexAnnual = 30000` verwenden;
3. Variante „Reduziert“ mit den Form-Control-Zeichenfolgen `'28000'` und
   `'12000'` anlegen, alle nicht geänderten Controls als `''` belassen;
4. UI-Zustand unmittelbar nach `addVariant()` erfassen;
5. „Neu berechnen“ über den tatsächlichen registrierten Click-Handler auslösen
   und UI-Zustand erneut erfassen;
6. sofern ohne Veränderung versionierter Daten möglich, dieselbe Alternative
   entfernen und den Zustand nach `removeVariant()` erfassen.

Falls der vorhandene E2E-Pfad nicht mit der gewünschten Baseline kombinierbar
ist, wird dessen gültiger Pfad mit einem synthetischen Workspace verbunden,
der nach denselben Contract-Funktionen erzeugt wird. Abweichungen gegenüber
dem fehlenden Originalexport werden im Bericht ausdrücklich benannt.

### 4.2 Wert- und Identitätsprotokoll

Für jede Stufe wird nicht nur das Endergebnis, sondern ein kompaktes
Ist-Protokoll mit Wert, Typ, Vorhandensein und Identität erhoben:

- Form-Control: `'28000'`, `'12000'` und unveränderte Felder `''`;
- von `readVariantPatch()` übergebener Patch;
- Ergebnis von `previewStressReplayVariantPatchV1()`;
- von `createStressReplayVariantV1()` normalisierter und gespeicherter Patch;
- persistierte Workspace-Varianten und deren Reihenfolge;
- effektive Inputs nach `applyStressReplayVariantV1()`;
- Runner-Aufruf und erstes finanzielles Jahresresultat beziehungsweise
  `technicalError`;
- an `buildStressReplayComparisonV1()` übergebene Varianten und Resultate;
- Rückgabewert oder geworfener Fehler des Comparison-Builders;
- Controllerzustand `comparison`/`results` und Renderer-Eingabe.

Leerwerte werden dabei durch Blatt-Vorhandensein (`Object.hasOwn`) von
expliziten numerischen Werten getrennt; es wird nicht über Truthiness
geschlossen. Baseline-Snapshot und fixierter Pfad werden vor und nach der
Rechnung byteweise beziehungsweise über ihre kanonischen Fingerprints
verglichen.

Zusätzlich werden mindestens folgende Identitätsbeziehungen als konkrete
Werte protokolliert:

- `variant.id` gegen `result.variantId` und die Reihenfolge beider Listen;
- `path.pathFingerprint` gegen jeden `result.pathFingerprint` und den
  Vergleichsfingerprint-Bestandteil;
- Workspace-/Varianten-`baselineScenarioFingerprint` gegen die Resultate;
- `variant.normalizedInputFingerprint` gegen den tatsächlich angewandten
  Input;
- gespeicherte `sourceIdentity` beziehungsweise Reconciliation-Daten für die
  Baseline, ohne sie fälschlich für Alternativen zu fordern;
- Workspace-Fingerprint vor und nach der Variantenmutation.

### 4.3 Bestimmung des ersten Fehlschlags

Der Nachweis wird schrittweise ausgeführt, damit ein späterer Contractfehler
nicht irrtümlich als Ursprung bezeichnet wird:

1. Variante isoliert erzeugen und validieren.
2. Variante isoliert auf eine Kopie der Baseline anwenden.
3. Baseline und Alternative getrennt über `runStressReplayPathV1()` ausführen.
4. `technicalError`, Resultatstatus und vollständige stabile Fehlerdaten jedes
   Runs erfassen.
5. Erst danach `buildStressReplayComparisonV1()` mit exakt diesen Varianten
   und Resultaten aufrufen.
6. Schließlich denselben Lauf über `computeComparison()` im Controller
   auslösen.

Als „erste fehlschlagende Funktion“ gilt die früheste Funktion, die bei
wirksamen Inputs 28.000/12.000 entweder wirft, einen technischen Fehler
produziert oder einen für die nächste Stufe unverträglichen Rückgabewert
erzeugt. Der Bericht enthält Funktionsname, konkrete Codefundstelle, wirksame
Eingangsdaten, vollständigen Fehlercode, `details`, Message und den relevanten
Rückgabewert. Ein späterer Catch oder Renderer-Leerzustand wird nicht als
Primärursache ausgegeben.

### 4.4 Aufrufer und Statusüberschreibung

Die drei geforderten Aufrufer werden getrennt mit demselben kontrollierten
Fehlerpfad geprüft:

- `addVariant()` nach erfolgreicher Persistenz;
- `removeVariant()` nach erfolgreicher Persistenz;
- Recompute-Click-Handler für „Neu berechnen“.

Für jeden Aufrufer werden zeitlich geordnet protokolliert:

- Rückgabewert von `computeComparison()`;
- `comparison` und `comparisonResults` vor und nach dem Aufruf;
- Text und `data-status` der Live-Region direkt nach dem Catch;
- Text und `data-status` nach dem Rücksprung zum Aufrufer und nach
  `finishBusyAction()`;
- Renderer-Leertext und Fokusziel.

Damit wird ein möglicher Primärdefekt der Rechnung getrennt von einem zweiten
UI-Defekt bewertet, bei dem `addVariant()` oder `removeVariant()` trotz
`null`-Vergleich bedingungslos Erfolg meldet. Für Recompute wird ebenso
belegt, ob der Catch-Fehler bestehen bleibt oder durch einen späteren Status
überschrieben wird.

## 5. Berichtstruktur und Entscheidungskriterien

Der Ergebnisbericht enthält mindestens:

- Reproduktionsaufbau, Fixture beziehungsweise synthetische Datenbasis und
  genaue Bedienfolge;
- Baseline 90.000/30.000 EUR und Patch 28.000/12.000 EUR einschließlich
  Datentypen und Leerwertabgrenzung;
- tabellarischen Datenfluss von Formulareingabe bis Renderer;
- erste fehlschlagende Funktion mit tatsächlichem Rückgabewert oder
  vollständigem Fehlercode und wirksamen Eingangsdaten;
- konkrete, mit Zeilennummern erhobene Codefundstellen auf der analysierten
  Planungsbaseline;
- Identitätsprüfung für Varianten-IDs, Baseline, Pfad und Fingerprints;
- gesonderte Ablaufbilder für `addVariant()`, `removeVariant()` und Recompute;
- sichtbaren UI-Zustand vor und nach jeder Statusüberschreibung;
- Ursachenklassifikation mit eindeutiger Antwort auf „Mache ich etwas
  falsch?“;
- minimalen Korrekturansatz und präzise Regressionstestfälle, ohne
  Implementierung;
- Hypothesen und verbleibende Unsicherheiten, besonders die eingeschränkte
  Aussage über export- oder umgebungsspezifische Daten ohne Originalexport.

Die Klassifikation folgt den beobachteten Daten:

- **Bedienfehler** nur, wenn der dokumentierte Workflow einen vertraglich
  ungültigen oder unvollständigen Nutzerinput belegt;
- **erwartetes Verhalten** nur, wenn ein dokumentierter Contract den leeren
  Vergleich für diese gültigen Werte ausdrücklich fordert;
- **Dateninkompatibilität** nur bei konkret belegter ID-, Baseline-, Pfad-,
  Herkunfts- oder Fingerprintabweichung;
- **Softwaredefekt** bei gültigen, korrekt übertragenen Daten, deren Rechnung
  oder UI-Orchestrierung den Vergleich dennoch verliert oder irreführend als
  erfolgreich meldet.

Mehrere Defekte werden getrennt aufgeführt. Insbesondere beweist eine
Statusüberschreibung nicht die Ursache des leeren Vergleichs.

## 6. Minimaler Fix- und Regressionstestrahmen

Nur falls die Reproduktion einen Softwaredefekt belegt, beschreibt der Bericht
den kleinsten betroffenen Funktionsrand. Erwartet wird je nach Befund entweder
eine eng begrenzte Korrektur an der ersten fehlschlagenden Berechnungsfunktion,
eine Rückgabewertprüfung der UI-Aufrufer oder beides. Änderungen an
Engine-Semantik oder Replay-Vertrag werden nicht vorweggenommen; falls sie
notwendig erscheinen, werden sie als separate Produktentscheidung und Risiko
markiert.

Die vorgeschlagenen Regressionstests müssen mindestens abgrenzen:

- exakte Patchwerte 28.000/12.000 bei Baseline 90.000/30.000 durch
  Normalisierung, Speicherung, Runner und Comparison;
- leeres Feld gegen explizite Zahl einschließlich `0`;
- kompatible IDs und Fingerprints sowie ein gezielt inkompatibler Negativfall;
- den tatsächlichen Primärfehler als fokussierten Test am zuerst
  fehlschlagenden Funktionsrand;
- `computeComparison()` mit Erfolg und mit geworfenem Fehler;
- `addVariant()`, `removeVariant()` und Recompute bei `null`, jeweils mit
  unverfälschter Fehlermeldung und ohne falsche Erfolgsmeldung;
- sichtbaren Vergleich beziehungsweise korrekten Leerzustand im Renderer.

Der Bericht benennt die exakten bestehenden Testdateien, in denen diese Fälle
bei einer späteren Behebung ergänzt werden sollten. Im Analyselauf selbst wird
keine Testdatei geändert.

## 7. Validierung des Analyse-Slice

Folgende vorhandene Tests werden lesend und ohne Snapshot-/Fixture-Update
ausgeführt:

```text
node tests/run-single.mjs tests/stress-replay-ui.test.mjs
node tests/run-single.mjs tests/stress-replay-e2e.test.mjs
```

Zusätzlich wird der in Abschnitt 4 beschriebene manuelle oder
stdin-/temporärskriptgestützte Nachweis mit exakt 28.000 EUR Flex und 12.000 EUR
Mindest-Flex ausgeführt. Das Skript darf keine Repositorydatei schreiben und
muss im Bericht mit Befehl beziehungsweise reproduzierbarer Pseudocodefolge,
Inputs, Outputs und Exitstatus dokumentiert werden.

Vor Abschluss werden `git status --short` und der kanonische Diff geprüft. Der
einzige fachliche Diff darf der neue Analysebericht sein. Die vollständige
Repository-Validierung wird nicht im Agentenprozess ausgeführt; sie bleibt der
autoritativen Orchestrator-Matrix vorbehalten.

## 8. Risiken und Stopbedingungen

- Der Originalexport ist nicht vorausgesetzt. Fehlt er, darf die Analyse mit
  Fixture oder synthetischem Workspace abgeschlossen werden, sofern Ursache
  und Kontrollfluss belastbar sind; die Übertragbarkeit auf export-spezifische
  Korruption bleibt als Unsicherheit sichtbar.
- Wenn sich der Zustand weder reproduzieren noch aus dem Kontrollfluss
  eindeutig erklären lässt und nur der Originalexport die verbleibende
  Ursachenklasse unterscheiden kann, wird kontrolliert gestoppt.
- Wenn Produktcode, Tests, Fixtures, Snapshots oder gespeicherte Nutzerdaten
  geändert werden müssten, wird kontrolliert gestoppt.
- Wenn die beiden Pflicht-Tests nicht ausführbar sind und kein gleichwertiger
  lesender Nachweis möglich ist, wird kontrolliert gestoppt.
- Wenn eine Behebung Engine-Semantik oder Replay-Vertrag verändern müsste,
  wird dies nur als Risiko beziehungsweise separate Produktentscheidung
  dokumentiert.
- Auffällige Abweichungen in Snapshot-/Backtestdaten, FlowDelta,
  UI-/Engine-Parameternamen oder eine stille Begrenzung von
  `minimumFlexAnnual` lösen die projektweiten Stop-Regeln aus.

## 9. Geplanter Analyse-Slice

Dieser `PLAN_ONLY`-Lauf legt weder den Ergebnisbericht noch Code- oder
Teständerungen an. Nach Planfreigabe wird genau der folgende, rein
dokumentierende Slice ausgeführt.

### Slice 1 - Reproduktion, Ursachenanalyse und Ergebnisbericht

**Ziel:** Den gemeldeten 28.000/12.000-Fall mit einem unveränderten Fixture-
oder synthetischen Workspace reproduzieren, Wert-, Kontroll- und
Identitätsfluss bis `comparison` vollständig belegen, Primärfehler und
Statusüberschreibung getrennt klassifizieren und die eindeutige Nutzerantwort
samt minimalem Fix-/Testumfang im neuen Analysebericht festhalten.

**Exakter Änderungspfad**

- `docs/internal/STRESS_REPLAY_FEHLENDER_VARIANTENVERGLEICH_ANALYSE.md`

**Akzeptanzkriterien:**

- Die genaue Bedienfolge und die beobachteten UI-Zustände sind reproduzierbar
  dokumentiert.
- Beide Patchwerte sind vom Form-Control bis Runner und Comparison mit Typ,
  Blatt-Vorhandensein und wirksamem Input nachgewiesen.
- Die erste fehlschlagende Funktion, ihre konkreten Eingaben und ihr
  vollständiger Fehler beziehungsweise Rückgabewert sind belegt.
- `computeComparison()` und alle drei geforderten Aufrufer sind separat
  untersucht; Berechnungsursache und mögliche Statusüberschreibung werden
  nicht vermischt.
- Varianten-IDs, Baseline, fixierter Pfad und Fingerprints sind auf
  Kompatibilität geprüft.
- Die Ursachenklasse und die Antwort auf „Mache ich etwas falsch?“ sind
  eindeutig.
- Ein etwaiger Fix- und Testumfang ist präzise, minimal und nicht
  implementiert.
- Beide Pflicht-Tests und der exakte 28.000/12.000-Nachweis sind mit Ergebnis
  dokumentiert.
- Der einzige fachliche Workspace-Diff ist der neue Analysebericht.

**Diff-Risiko:** klein; ausschließlich ein neues internes Analysedokument. Das
inhaltliche Hauptrisiko ist eine vorschnelle Ursachenzuschreibung aus dem
UI-Status statt aus dem ersten fehlschlagenden Berechnungsrand.

**Rollback:** Der neue Bericht darf nur nach ausdrücklicher Freigabe entfernt
werden; Produktcode, Tests und Fixtures benötigen keinen Rollback, da sie
unverändert bleiben.

## 10. Review- und Abschlussstatus

Codex erstellt den Plan und später den Analysebericht, gibt aber weder den
Plan noch die eigene Analyse frei. Plan und Slice-Ergebnis benötigen das
vorgesehene externe, adversariale Review. Commit- und Branchtransaktionen
bleiben beim Orchestrator beziehungsweise Nutzer; ein Push bedarf ausdrücklicher
Nutzerfreigabe.

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-8bd585e43c4f`
- Testdateien: keine
- Prüfdimensionen: checked plan-contract shape (single SLICE_PLAN + single future-slice section with canonical heading), scope discipline (read-only product scope vs. single-file write scope), reproduction/causation methodology ordering, caller-by-caller status-overwrite isolation, classification falsifiability, fix/regression framing without implementation, and validation/stop-condition alignment with the assignment
- Größtes Restrisiko: largest residual risk: a fixture/synthetic-only reproduction may fail to reveal an export-specific data-identity defect that only manifests with the real original export, potentially forcing a second analysis round
- Realistische Bruchbedingung: break condition: the Slice 1 report ships a definitive root-cause classification without being able to reproduce the null comparison at all (neither via fixture, synthetic workspace, nor control-flow tracing) yet still asserts a specific cause instead of invoking the documented stop condition.
- Eigene Findings: keine
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-8bd585e43c4f`
- Testdateien: keine
- Prüfdimensionen: plan-contract conformity (single SLICE_PLAN + canonical future slice heading), strict scope discipline (read-only product code/tests vs single new report file write scope), reproduction methodology and data-flow traceability from form controls to comparison renderer, strict separation of computation failure from UI status overwrite, comprehensive identity and fingerprint reconciliation, regression test specification without premature implementation, non-destructive validation strategy, and robust stop conditions for missing original exports
- Größtes Restrisiko: Largest residual risk: a purely synthetic or fixture-based reproduction may miss subtle export schema anomalies or lifecycle nuances present only in the user's specific original export
- Realistische Bruchbedingung: Break condition: the Slice 1 implementation conflates the UI status overwrite symptom with the root calculation defect, claiming the problem is solved by fixing caller status handling without identifying the upstream function that produced null comparison
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `plan-validation-8bd585e43c4f`

- Diff-Fingerprint: `8bd585e43c4f0f77c722cecbe4160a0ab3a1ec198eb4304109af35e580ea202e`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: internal plan contract passed
- Ausgabedigest: `1ff95b042341b952c1a2b2e359596e24a75274e1f93466fdb0a9d7653d7ba05f`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| internal:work-plan-contract | PASS | 0 | slices=1; planned_paths=1; changed_paths=1; future_slices=1; work_plan=docs/internal/stress-replay-fehlender-variantenvergleich-analyse-arbeitsplan.md |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: most likely failure in three months is that the eventual report correctly documents a status-overwrite in addVariant()/removeVariant() but stops there instead of tracing computeComparison()'s internal catch back to the actual first-failing function/return value, so the shipped "root cause" is really just the most visible symptom — the plan's layered methodology (4.3) is explicitly designed to prevent this, so the risk is in execution discipline during the Slice, not in the plan's design.
  - Ereignis 3: The most likely failure cause in three months is that during Slice 1 execution, the report focuses heavily on the visible status message overwrite in addVariant()/removeVariant() and glosses over the exact upstream calculation or contract failure within defaultRunComparison() or buildStressReplayComparisonV1(), resulting in an incomplete analysis that explains UI messaging but leaves the underlying comparison failure unresolved.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
Noch keine strukturierten Findings.
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |
<!-- audit:decision-table:end -->

### Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `NOT_RECORDED`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`
<!-- audit:approval-status:end -->
