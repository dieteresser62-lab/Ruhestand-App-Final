# Stress-Pfad-Replay - Korrekturarbeitsplan

Stand: 2026-08-15

Zielbranch: `codex/stress-pfad-replay`

Planstatus: Review und fingerprint-gebundene Nutzerfreigabe ausstehend

Orchestrierung: State v3, `PLAN_ONLY`

## 1. Ziel und Ausgangsbasis

Dieser Plan erweitert den bereits bestehenden Feature-Branch, ohne die zehn
abgeschlossenen Slice-Commits zurückzusetzen, umzuschreiben oder
zusammenzufassen. Er schließt den reproduzierbaren Fehler im Browser-Harness,
die neun offenen Auditbeobachtungen und die benannten kleinen
Abschlussbefunde. Die fachliche Aussagegrenze von Stress-Replay V1 bleibt
unverändert: verglichen werden Strategie- und Entnahmeparameter auf genau
einem fixierten Monte-Carlo-Pfad; Asset-Allokations-Gegenfakten werden nicht
wieder eingeführt.

Verifizierte Ausgangsbasis für den Korrekturlauf:

- `npm test` bestand mit 180 Testdateien und 19.472 von 19.472 Assertions.
- `tests/stress-replay-e2e.test.mjs` bestand mit 13 von 13 Assertions.
- Der beobachtete Median des 60-Jahres-Replays lag bei rund 439,9 ms unter
  dem Budget von 1.743,432 ms; der Export war 88.524 Bytes groß.
- Der Browser-Smoke scheitert reproduzierbar an Playwrights
  `locator.isDisabled()` für das native Fieldset
  `#stressReplayVariantFields`, obwohl DOM-Property, HTML-Attribut,
  Persistenzzustand und Statusmeldung den fachlich korrekten Sperrzustand
  belegen.
- Weil der Browser-Smoke am ersten Fehler abbricht, gelten alle nachfolgenden
  Browser-Workflows bis zu einem vollständigen erfolgreichen Lauf als nicht
  abschließend nachgewiesen.

## 2. Schreibgeschützte Quellen und Scope-Grenzen

Die folgenden Quellen dienen der Umsetzung als Beleg, bleiben aber außerhalb
jedes Korrekturslice-Scopes:

- `docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md`
- `docs/internal/stress-replay-implement-review-fa2904b2.md`
- die zehn vorhandenen Arbeitsplan-Slice-Dokumente des ursprünglichen Laufs,
- die zehn vorhandenen Implementierungs-Slice-Dokumente des ursprünglichen
  Laufs.

Die vorstehenden Beschreibungen sind keine Pfadfreigaben und keine Globs für
Änderungen. Neue Korrektur-Slice-Dokumente werden erst durch den Orchestrator
beim Start des jeweiligen Umsetzungsslices angelegt. Produktcode,
Konfiguration, Tests oder generierte Artefakte werden in diesem `PLAN_ONLY`-
Lauf nicht geändert.

Nicht im Scope sind:

- Asset-Allokations-Gegenfakten oder eine neue initiale Asset-Transformation,
- Änderungen der normalen Monte-Carlo-Finanzsemantik ohne einen unmittelbar
  belegten Fehler aus K-02 bis K-09,
- Änderungen an Profil-, Tranchen-, Steuer- oder Entnahmeverträgen außerhalb
  der Stress-Replay-Korrekturen,
- manuelle Änderungen an `engine.js`, `dist/` oder
  `RuhestandSuite.exe`,
- Push, Merge, Release, Deployment oder irgendeine Umschreibung bestehender
  Commits.

## 3. State-v3-Ausführungsvertrag

1. Der Orchestrator prüft vor jedem Slice Branch, Arbeitsbaum, exakten
   Pfad-Scope, produktive Änderungsgruppen und Diff-Risiko. Der Branch wird
   weder von Codex erstellt noch gewechselt.
2. Vor Slice 01 müssen dieser Plan von Claude und danach genau einmal von
   Antigravity auf demselben Fingerprint geprüft sowie durch den Nutzer
   fingerprint-gebunden freigegeben sein. Erst dann darf der Orchestrator den
   geprüften Plan committen und einen an `APPROVED_PLAN_COMMIT` gebundenen
   `IMPLEMENT`-Handoff erzeugen.
3. Jeder Slice erhält eine neue, 1-basierte Slice-MD erst bei seinem Start.
   Codex implementiert nur den freigegebenen Pfad-Scope und genehmigt seine
   eigene Arbeit nicht. Claude prüft jede Implementierungsrunde; Antigravity
   prüft jeden Slice nach Claudes Freigabe genau einmal auf demselben
   Fingerprint.
4. Nur der Orchestrator führt die deterministische Validierungsmatrix aus und
   erzeugt fingerprint-gebundene Attestierungen. Fokussierte Entwicklerläufe
   sind zulässig, ersetzen aber keine Orchestrator-Attestierung.
5. Eine Auditbeobachtung darf nur durch die geplante Korrektur oder durch einen
   konkreten Quellen-Gegenbeweis samt Regressionstest geschlossen werden. Sie
   darf nicht unverändert als akzeptiertes Restrisiko weitergetragen werden.
6. Ein späterer Slice darf einen früher geschlossenen Vertrag nicht wieder
   abschwächen. Unerwartete Abweichungen bei Finanzresultaten, RNG,
   Quellidentität, Persistenz, FlowDelta, Snapshots oder Backtests lösen die
   Stopbedingungen aus.

## 4. Geordnete Korrekturslices

### Slice 01 - Browser-Harness und vollständiges Browser-Gate

**Korrekturbereich:** K-01.

**Ziel:** Die bekannte falsche Playwright-Auswertung des nativen Fieldsets
wird im Test-Harness beseitigt, ohne die fachliche Aussage zu schwächen. Der
Browser-Smoke läuft danach zwingend vollständig über alle Suite-Workflows.

**Exakter Änderungspfad**

- `tests/browser-smoke.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`

Produktive Änderungsgruppen: 0; Test- und Slice-Dokumentation zählen nicht zur
produktiven Zehn-Gruppen-Stopregel.

**Umsetzung und Akzeptanzkriterien:**

- Der Initialzustand wird über
  `document.getElementById('stressReplayVariantFields').disabled === true`,
  das vorhandene `disabled`-Attribut und mindestens ein tatsächlich
  deaktiviertes enthaltenes Control geprüft; `locator.isDisabled()` ist für
  dieses Fieldset kein Oracle mehr.
- Ohne ausführbaren fixierten Pfad bleiben Fieldset und Variantenaktionen
  gesperrt, `sim.stressReplay.active.v1` entsteht nicht und die Statusmeldung
  fordert weiterhin Monte-Carlo-Start und Szenarioauswahl.
- `npm run test:browser` erreicht das reguläre Testende. Ein nach der
  Harnesskorrektur auftretender späterer Fehler ist ein neues Finding und darf
  nicht durch eine weitere Testabschwächung übergangen werden.

**Fokussierte Tests und Fehlerpfade:**

- `npm run test:browser`
- Negativpfad: leerer Startzustand ohne Workspace und ohne ausgewähltes
  Szenario.
- Positivpfad: die bereits vorhandenen späteren Stress-Replay- und übrigen
  Browser-Workflows werden bis zum Ende durchlaufen.

**Invarianten, Risiken und Stopbedingungen:**

- Es wird kein Produktcode geändert und kein künstlicher Workspace erzeugt.
- Größtes Risiko ist, dass der korrigierte Harness einen bislang verdeckten
  echten Browserfehler sichtbar macht.
- Stoppen, sobald der vollständige Smoke nach der Fieldset-Korrektur an einem
  echten Produktzustand scheitert; Workflow, Erwartungswert und Ist-Zustand
  werden dann als Finding dokumentiert.

### Slice 02 - Varianten-Whitelist mit belegten Prozentgrenzen

**Korrekturbereich:** K-02.

**Abhängigkeit:** Slice 01 muss freigegeben sein, damit der Browser-Gate nicht
mehr am bekannten Harnessfehler abbricht.

**Ziel:** Programmgesteuerte, importierte und über die UI erzeugte Varianten
verwenden denselben fail-closed Wertebereich. Die vorhandenen Primärquellen
`Simulator.html` und `app/balance/balance-binder-imports.js` belegen 0 bis 50
für `maxSkimPctOfEq` und 0 bis 70 für `maxBearRefillPctOfEq`.

**Exakter Änderungspfad**

- `app/simulator/stress-replay-contract.js`
- `tests/stress-replay-contract.test.mjs`
- `tests/stress-replay-variant.test.mjs`
- `tests/stress-replay-export.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`

Produktive Änderungsgruppen: 1.

**Umsetzung und Akzeptanzkriterien:**

- Die beiden Whitelist-Deskriptoren erhalten inklusive Grenzen 0 bis 50 und 0
  bis 70; es gibt kein Clamping und keinen abweichenden Importpfad.
- Die exakten Grenzen sowie belegte Innenwerte werden akzeptiert. Negative
  Werte, Werte oberhalb der Grenze, `NaN`, `Infinity` und `-Infinity` werden
  vor Runner- oder Engine-Aufruf mit stabilem Contractfehler abgewiesen.
- Direkte Variantenerzeugung, Variantvalidierung und Export-Import-Rehydration
  durchlaufen dieselbe Contractquelle. UI-`min`/`max` bleiben mit ihr
  konsistent.

**Fokussierte Tests und Fehlerpfade:**

- `node tests/run-single.mjs tests/stress-replay-contract.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-variant.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-export.test.mjs`
- Manipulierter Import mit selbst neu berechnetem äußeren Fingerprint darf die
  Bereichsvalidierung nicht umgehen.

**Invarianten, Risiken und Stopbedingungen:**

- `minimumFlexAnnual` wird weder begrenzt noch verändert; keine normale
  Monte-Carlo-Eingabesemantik wird ausgeweitet.
- Risiko ist eine zweite, abweichende Prozentgrenze in einem Stress-Replay-
  Producer; die Tests müssen alle drei Eintrittspfade abdecken.
- Stoppen, falls Repository-Primärquellen andere Grenzen als 0 bis 50 und 0
  bis 70 belegen oder UI und Contract unterschiedliche Parameternamen nutzen.

### Slice 03 - Kanonischer Marktstatus vor Post-Ruin-Shadow

**Korrekturbereich:** K-03.

**Abhängigkeit:** Slice 02 ist abgeschlossen; dieser Slice ändert keine
Varianten- oder Finanzparameterverträge.

**Ziel:** Das Ruinjahr wird genau einmal in den kanonischen Marktfolgezustand
übernommen, bevor das erste Shadow-Jahr CAPE, Regime und Tail-Risk-Folgewerte
auflöst.

**Exakter Änderungspfad**

- `app/simulator/monte-carlo-runner.js`
- `tests/worker-parity.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`

Produktive Änderungsgruppen: 1.

**Umsetzung und Akzeptanzkriterien:**

- Der bestehende Ruin-Fixture endet vor dem Horizont und macht den vor dem
  Shadow-Loop verwendeten Marktstatus beobachtbar, ohne einen produktiven
  Debug-Hook zurückzulassen.
- Rendite, CAPE und kanonische Historienfelder des Ruinjahres sind im Start des
  ersten Shadow-Jahres enthalten; der Zustand ist weder um ein Jahr veraltet
  noch doppelt fortgeschrieben.
- Folgewerte des ersten Shadow-Jahres und mindestens eines weiteren
  pfadabhängigen Werts sind deterministisch und stimmen bei Worker- und
  Direktpfad überein. Jahresindizes bleiben streng steigend.

**Fokussierte Tests und Fehlerpfade:**

- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- Kontrastfall mit stark vom Vorjahr abweichender Ruinjahresrendite/CAPE, damit
  ein veralteter Zustand den Test sicher brechen lässt.
- Überlebender Pfad bleibt unverändert und aktiviert keine Shadow-Fortsetzung.

**Invarianten, Risiken und Stopbedingungen:**

- RNG-Aufrufreihenfolge, Seedable-Fingerprint, normale MC-Endwerte,
  Source-Prefix und Terminalstatus bleiben unverändert.
- Größtes Risiko ist eine doppelte Anwendung des Ruinjahres auf
  `marketDataHist`.
- Stoppen bei unerwarteter RNG-, Finanzresultat-, Worker-Paritäts- oder
  Source-Prefix-Abweichung; keine breiteren Monte-Carlo-Anpassungen vornehmen.

### Slice 04 - Symmetrischer Terminalzustand all_dead

**Korrekturbereich:** K-04.

**Abhängigkeit:** Slice 03 hat den Pfadzeitachsenvertrag stabilisiert.

**Ziel:** `terminal_death` wird in `yearResults` als expliziter terminaler
Jahreseintrag repräsentiert, symmetrisch zum vorhandenen `terminal_ruin`, ohne
ein finanziell nicht auswertbares Todesjahr als Finanzjahr zu zählen.

**Exakter Änderungspfad**

- `app/simulator/stress-replay-contract.js`
- `app/simulator/stress-replay-runner.js`
- `app/simulator/stress-replay-comparison.js`
- `tests/stress-replay-runner.test.mjs`
- `tests/stress-replay-comparison.test.mjs`
- `tests/stress-replay-renderer.test.mjs`
- `tests/stress-replay-export.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`

Produktive Änderungsgruppen: 3.

**Umsetzung und Akzeptanzkriterien:**

- Der bestehende Jahresergebnisvertrag wird anhand der `terminal_ruin`-
  Repräsentation belegt. Das Todesjahr erhält einen eindeutigen Status,
  `yearIndex`, `historicalYear` und einen unveränderten Portfolioendwert, aber
  keine erfundene Entnahme, Steuer oder finanzielle Auswertbarkeit.
- `yearResults` enthält das verarbeitete Todesjahr; `financiallyEvaluatedYears`
  zählt weiterhin nur Einträge mit Status `financial_year` und `ruinYear`
  bleibt für `all_dead` null.
- Vergleiche mit unterschiedlich langen `all_dead`-/Ruin-/Horizontpfaden
  werfen nicht, schneiden keine letzte Zeile ab und erzeugen keine
  mehrdeutigen KPI-Deltas.
- Jahrestabelle und Export bewahren den terminalen Eintrag deterministisch und
  kennzeichnen Missingness statt `undefined` oder einer fingierten Null.

**Fokussierte Tests und Fehlerpfade:**

- `node tests/run-single.mjs tests/stress-replay-runner.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-comparison.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-renderer.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-export.test.mjs`
- Paarung eines früher verstorbenen Baseline-Haushalts mit einer ein Jahr
  längeren Alternative sowie der umgekehrte Fall.

**Invarianten, Risiken und Stopbedingungen:**

- Keine Finanztransaktion wird nach dem Tod simuliert; Summary-Fingerprints
  bleiben vollständig validiert.
- Risiko ist, dass ein Downstream-Consumer jeden `yearResults`-Eintrag als
  finanziell auswertbar behandelt.
- Stoppen, falls der bestehende Jahresergebnisvertrag keine eindeutige
  terminale Repräsentation zulässt oder eine neue fachliche Produktentscheidung
  zwischen materiell unterschiedlichen Semantiken nötig wird.

### Slice 05 - Explizite Missingness bis in Transaktions-Breakdowns

**Korrekturbereich:** K-05.

**Abhängigkeit:** Slice 04 hat die terminalen Jahreszeilen vereinheitlicht;
dieser Slice ändert nur Diagnoseverträge und deren Producer.

**Ziel:** Jeder unbekannte Breakdown-Wert trägt eine maschinenlesbare,
feldbezogene Begründung. Bekannte Werte bleiben numerisch und Breakdown sowie
Aggregat widersprechen sich nicht.

**Exakter Änderungspfad**

- `app/simulator/simulator-bond-refill.js`
- `app/simulator/simulator-engine-direct.js`
- `app/simulator/simulator-forced-sale.js`
- `app/simulator/stress-replay-transactions.js`
- `tests/stress-replay-transactions.test.mjs`
- `tests/stress-replay-comparison.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`

Produktive Änderungsgruppen: 4.

**Umsetzung und Akzeptanzkriterien:**

- `breakdown[].netEur` und `breakdown[].taxEur` sind entweder endliche,
  nichtnegative Zahlen oder `null` mit einer Missingness-Struktur, die
  Breakdown-Index beziehungsweise Assetklasse, Feld und stabilen Grund trägt.
- Ein stilles `null`, leerer Grund, unbekanntes Feld, negative Zahl oder
  nichtendliche Zahl wird fail-closed abgewiesen.
- Ist eine Aufteilung fachlich bekannt, wird sie numerisch erzeugt. Ist nur
  das Aggregat bekannt, erklärt die Breakdown-Missingness ausdrücklich die
  fehlende Aufteilbarkeit; Summen bekannter Breakdown-Werte dürfen dem
  Aggregat nicht widersprechen.
- Vergleichsaggregation erhält Gründe und verwechselt unbekannt weder mit
  null Euro noch mit Gleichheit.

**Fokussierte Tests und Fehlerpfade:**

- `node tests/run-single.mjs tests/stress-replay-transactions.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-comparison.test.mjs`
- Forced Sale, Payout-Fallback und Bond-Refill decken bekannte sowie nicht
  aufteilbare Netto-/Steuerwerte ab.

**Invarianten, Risiken und Stopbedingungen:**

- Capture bleibt additiv; Finanzresultate und Transaktionsreihenfolge ändern
  sich nicht.
- Risiko ist eine scheinbar plausible Aufteilung, die nicht durch den
  Simulator-Producer belegt ist.
- Stoppen, wenn eine numerische Pro-rata-Steuer- oder Nettoaufteilung neue
  Steuersemantik erfordern würde; in diesem Fall explizite Missingness statt
  Gegenfaktik verwenden.

### Slice 06 - Runner-Capture-Paritaet im echten Stressverkauf

**Korrekturbereich:** K-06.

**Abhängigkeit:** Slice 05 definiert die vollständige Diagnoseform, die dieser
Integrationsslice durch den echten Runner führt.

**Ziel:** Ein tatsächlicher Forced-Sale-/Payout-Fallback-Pfad beweist am
Runner-Rand, dass Transaktions-Capture ausschließlich erlaubte Diagnosefelder
ergänzt und keine Finanz-, Log- oder Reconciliation-Semantik verändert.

**Exakter Änderungspfad**

- `app/simulator/simulator-engine-direct.js`
- `app/simulator/stress-replay-runner.js`
- `tests/stress-replay-runner.test.mjs`
- `tests/stress-replay-transactions.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`

Produktive Änderungsgruppen: 2.

**Umsetzung und Akzeptanzkriterien:**

- Ein materialisierter Bären-/Crashpfad erzwingt innerhalb eines echten
  `runStressReplayPathV1`-Laufs Forced Sale oder Payout-Fallback; ein
  triviales Fixture ohne Verkauf genügt nicht.
- Capture aus und Capture an starten aus bytegleicher Quelle und liefern
  identische Portfolioendwerte, Entnahmen, Steuern, Terminalstatus,
  `scenarioLog`-Kernzeilen, Reconciliation und bestehende Trace-Phasen.
- Zulässige Unterschiede sind ausschließlich
  `stressReplayTransactionDiagnostics` und die bereits vertraglich
  dokumentierte additive `after_payout_fallback`-Trace-Zeile; ihre Anzahl,
  Position und Reihenfolge werden exakt geprüft.
- Wiederholung mit gleicher Quelle ist deterministisch; Capture mutiert weder
  Pfad noch Baseline-Eingaben.

**Fokussierte Tests und Fehlerpfade:**

- `node tests/run-single.mjs tests/stress-replay-runner.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-transactions.test.mjs`
- Der Paritätstest entfernt vor dem Bytevergleich nur die ausdrücklich
  erlaubten additiven Felder, nicht pauschal ganze Logflächen.

**Invarianten, Risiken und Stopbedingungen:**

- Kein toleranzbasierter Ausgleich finanzieller Abweichungen und keine
  Änderung normaler Capture-off-Semantik.
- Größtes Risiko ist ein versteckter Trace- oder Hash-Unterschied im
  Verkaufsjahr.
- Stoppen bei jeder nicht ausdrücklich additiven Finanz-, Log-,
  Reconciliation- oder Fingerprintabweichung.

### Slice 07 - Produktiver transaktionaler Persistenzpfad

**Korrekturbereich:** K-07.

**Abhängigkeit:** Die zu persistierenden Ergebnis- und Transaktionsverträge
aus Slice 04 bis 06 sind stabil.

**Ziel:** Save, unverändertes Save, Replace und Discard werden über den
wirklichen Default-Pfad von Stress-Replay zur Persistence-Facade und deren
`replaceRecordsTransactional` ausgeführt, einschließlich verifiziertem
Readback und Rollbackfehlern.

**Exakter Änderungspfad**

- `app/shared/persistence-facade.js`
- `app/simulator/stress-replay-persistence.js`
- `tests/persistence.test.mjs`
- `tests/stress-replay-persistence.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`

Produktive Änderungsgruppen: 2.

**Umsetzung und Akzeptanzkriterien:**

- Der Integrationstest konfiguriert über die vorhandene Test-Facade einen
  kontrollierten Adapter, ruft die Stress-Replay-API ohne injiziertes
  `backend` auf und beweist damit den produktiven
  `replaceRecordsTransactional`-Zweig.
- Erstes Save, idempotentes unverändertes Save ohne Schreibvorgang,
  bestätigter atomarer Replace und bestätigter Discard werden durch
  Backend-Readback belegt.
- Schreibfehler, Readback-Mismatch, erfolgreich kompensierter Rollback und
  fehlgeschlagener Rollback liefern stabile Fehlercodes und die korrekte
  `rollbackFailed`-Information. Der vorherige Wert bleibt bei erfolgreichem
  Rollback bytegleich erhalten.
- Ein Sentinel unter mindestens einem anderen Persistenzschlüssel bleibt in
  allen Erfolgs- und Fehlerpfaden unverändert. Test-Facade und Lifecycle-
  Zustand werden im `finally` vollständig zurückgesetzt.

**Fokussierte Tests und Fehlerpfade:**

- `node tests/run-single.mjs tests/stress-replay-persistence.test.mjs`
- `node tests/run-single.mjs tests/persistence.test.mjs`
- Fehleradapter für Write, Readback und Rollback sowie Wiederholung nach
  Fehlschlag.

**Invarianten, Risiken und Stopbedingungen:**

- Die Allowlist bleibt exakt auf `sim.stressReplay.active.v1` begrenzt; keine
  andere Anwendungspersistenz wird ersetzt oder gelöscht.
- Risiko ist globaler Testzustand aus der Persistence-Facade, der Folgetests
  beeinflusst.
- Stoppen, wenn der Test nicht sicher isoliert und zurückgesetzt werden kann
  oder eine Änderung des allgemeinen Persistenzvertrags außerhalb des
  Stress-Replay-Bedarfs nötig würde.

### Slice 08 - Busy- und Parallelitaetsvertrag der UI

**Korrekturbereich:** K-08.

**Abhängigkeit:** Slice 07 hat die atomare Backend-Grenze verifiziert; die UI
serialisiert nun alle Mutationen oberhalb dieser Grenze.

**Ziel:** Fixieren, Export, Import, Verwerfen und Variantenaktionen teilen
einen einzigen Busy-/Mutationsvertrag. Schnelle konkurrierende Aktionen
können nie zwei Mutationen desselben Workspace-Schlüssels starten.

**Exakter Änderungspfad**

- `app/simulator/stress-replay-ui.js`
- `tests/stress-replay-ui.test.mjs`
- `tests/browser-smoke.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`

Produktive Änderungsgruppen: 1.

**Umsetzung und Akzeptanzkriterien:**

- Import und Discard setzen vor dem ersten asynchronen Persistenzaufruf Busy
  und lösen die Sperre ausschließlich im `finally`. Fixieren, Export,
  Import-Dateiauswahl, Discard, Add/Remove/Recompute und relevante
  Editorcontrols respektieren denselben Zustand.
- Eine zentrale Reentrancy-Prüfung verhindert auch programmgesteuerte zweite
  Aufrufe, nicht nur Klicks auf deaktivierte Buttons.
- Manuell kontrollierte Deferred Promises halten Import beziehungsweise
  Discard offen. Währenddessen bleiben Buttons, Fieldset und dynamische
  Variantenaktionen gesperrt und `aria-busy` ist wahr.
- Schnelle konkurrierende Klicks erzeugen genau einen Persistenzaufruf. Nach
  Erfolg wie Fehler wird die UI konsistent entsperrt und der gespeicherte
  Workspace entspricht der gewonnenen Operation.

**Fokussierte Tests und Fehlerpfade:**

- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`
- `npm run test:browser`
- Import-vs.-Discard, Discard-vs.-Fixieren, Import-vs.-Variante und
  abgewiesene Promise-Pfade werden tatsächlich über verzögerte Promises
  überlappt.

**Invarianten, Risiken und Stopbedingungen:**

- Kein Queueing mit überraschender später Mutation; konkurrierende Aktionen
  werden deterministisch abgewiesen.
- Risiko ist eine Sperre, die nach Fehler oder abgebrochenem Dateidialog nicht
  freigegeben wird.
- Stoppen, falls der Browser-Smoke einen echten Produktzustandsfehler zeigt
  oder mehrere fachlich unterschiedliche Konfliktauflösungsregeln eine neue
  Produktentscheidung erfordern.

### Slice 09 - Unabhaengige Herkunftsidentitaet bei Reload und Import

**Korrekturbereich:** K-09.

**Abhängigkeit:** Slice 07 liefert den produktiven atomaren Speicherpfad und
Slice 08 verhindert konkurrierende Änderungen während Reload/Import.

**Ziel:** Baseline-Reconciliation verwendet auch nach Reload und kompatiblem
Import eine beim Fixieren unabhängig aus dem Ursprungslauf gewonnene,
persistierte Quellidentität und niemals aus dem zu prüfenden Pfad abgeleitete
Ersatzzeilen.

**Exakter Änderungspfad**

- `app/simulator/stress-replay-contract.js`
- `app/simulator/stress-replay-export.js`
- `app/simulator/stress-replay-persistence.js`
- `app/simulator/stress-replay-runner.js`
- `app/simulator/stress-replay-ui.js`
- `tests/stress-replay-contract.test.mjs`
- `tests/stress-replay-e2e.test.mjs`
- `tests/stress-replay-export.test.mjs`
- `tests/stress-replay-persistence.test.mjs`
- `tests/stress-replay-ui.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`

Produktive Änderungsgruppen: 5.

**Umsetzung und Akzeptanzkriterien:**

- Beim Fixieren wird eine minimale, datenschutzverträgliche Identität direkt
  aus den ursprünglichen Szenariozeilen erzeugt. Sie enthält nur die für den
  bestehenden Baseline-Abgleich erforderlichen strukturierten Felder und
  einen kanonischen Fingerprint; keine vollständigen Logs, lokalen Pfade,
  Secrets oder personenbezogenen Finanzdetails.
- Workspace-Contract, Workspace-Fingerprint, Save/Load und Export/Import
  validieren diese Identität, ihre Länge, ihren Source-Prefix-Bezug und ihren
  Fingerprint fail-closed. Unbekannte Felder, Drift, fehlende Identität,
  Reordering, nichtendliche Werte und Größenüberschreitung werden abgewiesen.
- Frisches Fixieren, anschließendes Laden und kompatibler Import liefern dem
  Baseline-Runner dieselbe unabhängig persistierte Quellidentität. Der
  produktive Fallback `deriveReplayIdentityRows(workspace.path)` entfällt.
- Manipulation nur des Pfads oder nur der Quellidentität bleibt auch nach
  Neuberechnung eines äußeren Exportfingerprints erkennbar. Deterministische
  Exporte bleiben unter dem vorhandenen Größenlimit.
- Ein alter V1-Workspace ohne unabhängige Identität bleibt validierbar zur
  Inspektion, wird aber fail-closed `read_only` mit dem stabilen Grund
  `source_identity_unavailable`; Ausführung und Variantenmutation sind
  gesperrt und aus dem Pfad wird keine Evidenz synthetisiert.

**Fokussierte Tests und Fehlerpfade:**

- `node tests/run-single.mjs tests/stress-replay-contract.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-persistence.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-export.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-e2e.test.mjs`
- Testsequenz: Fixieren → persistieren → neuen Controller initialisieren →
  vergleichen sowie Export → Import → vergleichen; beide Male muss dieselbe
  unabhängige Identität am Runner ankommen.

**Invarianten, Risiken und Stopbedingungen:**

- Path-, Baseline-, Workspace- und Exportfingerprints bleiben kanonisch und
  deterministisch; Datenschutz- und Größenlimits werden nicht gelockert.
- Größtes Risiko ist eine selbstreferenzielle Identität, wenn sie mittelbar
  doch aus `workspace.path.years` rekonstruiert wird.
- Stoppen, wenn die minimale Quellidentität für einen unabhängigen Abgleich
  nicht ausreicht, wenn eine Datenschutz-/Größenverletzung droht oder wenn
  mehrere fachlich unterschiedliche Legacy-Migrationsstrategien eine neue
  Produktentscheidung erfordern.

### Slice 10 - Eindeutige KPI-Deltadarstellung

**Korrekturbereich:** K-10.

**Abhängigkeit:** Slice 04 hat Terminaljahre vereinheitlicht und Slice 09 hat
die zugrunde liegende Vergleichsevidenz stabilisiert.

**Ziel:** Absolute KPI-Werte und Deltas verwenden getrennte Formatter. Ein
Ruinjahresdelta ist eine Anzahl Jahre; Drawdown-Deltas sind Prozentpunkte.

**Exakter Änderungspfad**

- `app/simulator/stress-replay-renderer.js`
- `tests/stress-replay-renderer.test.mjs`
- `tests/browser-smoke.test.mjs`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`

Produktive Änderungsgruppen: 1.

**Umsetzung und Akzeptanzkriterien:**

- Baseline `ruinYear = 3`, Alternative `ruinYear = 5` und
  `absoluteDelta = 2` werden als `Δ 2 Jahre` oder semantisch gleichwertige
  Differenz angezeigt, niemals als `Δ Jahr 3`.
- Singular, Null und negative Jahresdifferenz werden eindeutig dargestellt;
  absolute Ruinjahre bleiben als 1-basierte `Jahr N`-Werte lesbar.
- Absolute Drawdown-Werte verwenden weiterhin `%`; Deltas mit Contracteinheit
  `percentage_points` verwenden ausdrücklich `%-Punkte` oder
  `Prozentpunkte`. Vorzeichen und Missingness bleiben korrekt.
- Renderer-Unit-Test und echter Browserworkflow prüfen Text und semantische
  Zuordnung in der KPI-Tabelle.

**Fokussierte Tests und Fehlerpfade:**

- `node tests/run-single.mjs tests/stress-replay-renderer.test.mjs`
- `npm run test:browser`
- Nicht anwendbares Ruinjahresdelta und technischer Fehler bleiben
  maschinenlesbar gesperrt statt als Null formatiert zu werden.

**Invarianten, Risiken und Stopbedingungen:**

- KPI-Berechnung, Contracteinheiten und finanzielle Werte ändern sich nicht;
  nur ihre kontextabhängige Darstellung wird korrigiert.
- Risiko ist die Wiederverwendung des absoluten Formatters in einem zweiten
  Rendererpfad.
- Stoppen bei einer Änderung der Delta-Berechnung selbst oder einem echten
  Browserfehler außerhalb der Darstellungsformatierung.

### Slice 11 - Abschlussbereinigung, Dokumentationssync und Gesamtgates

**Korrekturbereich:** K-11 und branchweiter Abschluss.

**Abhängigkeit:** Slices 01 bis 10 sind einzeln von Claude und Antigravity
freigegeben und ihre Findings geschlossen.

**Ziel:** Tote Contractoberfläche und Whitespacebefund werden bereinigt,
Dokumentation und Testinventar werden auf die tatsächlich korrigierte Semantik
synchronisiert und alle verbindlichen Gesamtgates werden auf einem einzigen
Branchfingerprint attestiert.

**Exakter Änderungspfad**

- `app/simulator/stress-replay-path-materializer.js`
- `app/simulator/stress-replay-transactions.js`
- `tests/stress-replay-transactions.test.mjs`
- `README.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`

Produktive Änderungsgruppen: 2; Referenzdokumentation und Testinventar zählen
nicht zur produktiven Zehn-Gruppen-Stopregel.

**Umsetzung und Akzeptanzkriterien:**

- Die zusätzliche Leerzeile am Ende von
  `app/simulator/stress-replay-path-materializer.js` wird entfernt; die Datei
  endet mit genau einem Newline.
- `asset_allocation_initial_transform` wird aus dem
  Stress-Replay-Transaktionscontract und seinem Testinventar entfernt, weil
  kein belegter Producer existiert und V1 keine neue Asset-Gegenfaktik
  einführt. Ein neuer Producer ist ausdrücklich nicht zulässig.
- README, technische Referenzen, Simulator-Modulübersicht und Testinventar
  dokumentieren Prozentgrenzen, Shadow-Marktstatus, symmetrische
  Terminalzeilen, vollständige Transaktions-Missingness, produktive
  Transaktionalität, UI-Busy-Vertrag, persistierte unabhängige
  Herkunftsidentität, KPI-Einheiten und den echten Browser-Pflicht-Gate.
- Keine Aussage behauptet eine Codex-Freigabe oder eine neue
  Asset-Allokationsfunktion.

**Fokussierte Tests und verbindliche Abschlussvalidierung:**

- `node tests/run-single.mjs tests/stress-replay-transactions.test.mjs`
- alle in Slices 01 bis 10 genannten fokussierten Tests,
- `node tests/run-single.mjs tests/stress-replay-e2e.test.mjs`,
- `npm test`,
- `npm run test:browser`,
- `git diff --check`.

Der Orchestrator führt die vollständige Matrix aus. Der Browser-Smoke ist ein
Pflicht-Gate und darf nicht allein wegen eines Implementer-Sandboxfehlers als
ausstehend weitergereicht werden; der Orchestrator muss ihn tatsächlich bis
zum Ende ausführen. `npm run build:engine`, `dist`-Sync und Desktop-Build sind
nicht vorgesehen, solange kein zuvor genehmigter EngineAPI-Fehler eine solche
Scope-Erweiterung erzwingt.

**Invarianten, Risiken und Stopbedingungen:**

- Alte Pläne, alter Auditbericht, alte Slice-Dokumente und abgeschlossene
  Commits bleiben unverändert.
- Größtes Risiko ist eine Dokumentationsbehauptung, die einer erst im
  Korrekturlauf gewählten konkreten Contractform vorausgreift.
- Stoppen bei unerwarteter Gesamtmatrix-, Snapshot-, Backtest-, RNG-,
  Finanzresultat-, Quellidentitäts- oder Persistenzabweichung sowie bei jedem
  neuen Whitespacebefund.

## 5. Korrekturbereich-zu-Slice-Nachweis

| Bereich | Slice | Verbindlicher Abschlussnachweis |
|---|---:|---|
| K-01 | 01 | verlässlicher Fieldset-Startzustand und vollständiger Browser-Smoke |
| K-02 | 02 | Grenzen 0–50/0–70 in Contract, Producer und Import fail-closed |
| K-03 | 03 | Ruinjahresmarkt vor erstem Shadow-Jahr fortgeschrieben |
| K-04 | 04 | explizite `all_dead`-Terminalzeile in Runner und Downstream-Flächen |
| K-05 | 05 | Missingness für jedes unbekannte Breakdown-Feld |
| K-06 | 06 | Capture-on/off-Parität im echten Runner-Stressverkauf |
| K-07 | 07 | Default-Facadepfad einschließlich Readback und Rollbackfehler |
| K-08 | 08 | UI-Reentrancy und Deferred-Promise-Rennen gesperrt |
| K-09 | 09 | unabhängige Quellidentität nach Reload und Import |
| K-10 | 10 | Jahresdifferenz und Prozentpunkte getrennt formatiert |
| K-11 | 11 | tote Klasse entfernt, Whitespace und Dokumentation bereinigt |

## 6. Branchweites Review und Freigabereihenfolge

Nach erfolgreicher Gesamtvalidierung erstellt Codex auf dem attestierten
Fingerprint ausschließlich den State-v3-konformen Implementierungs-
Abschlussbericht mit Testdateiinventar, Finding-Antworten und
`FINAL_REPORT_READY`; Codex bewertet oder genehmigt die eigene Implementierung
nicht.

Danach gilt auf demselben Fingerprint:

1. Claude führt mit Sonnet und Effort `high` das adversariale branchweite
   Review über Korrektheit, Contracts, Fehlerpfade, Sicherheitsgrenzen,
   Datenschutz, Resume-/Idempotenzverhalten und alle K-01–K-11-Nachweise aus.
2. Eine positive Claude-Entscheidung benötigt dokumentierte Findings oder
   vollständige `REVIEW_EVIDENCE`, ein Pre-Mortem, die gebundene
   Validierungsattestierung und keine reviewer-eigenen offenen Blocker.
3. Erst nach Claudes Freigabe prüft Antigravity denselben Fingerprint genau
   einmal adversarial und mit denselben Evidenzanforderungen.
4. Neue Findings gehen zurück in einen explizit freigegebenen
   Remediation-Scope; nur der jeweilige Reviewer darf sein Finding schließen
   oder reklassifizieren.
5. Push, Merge, Release oder Deployment sind auch nach positiver
   Gesamtprüfung nicht durch diesen Plan autorisiert.

## 7. Gesamt-Pre-Mortem

Angenommen, die Korrektur verursacht in drei Monaten einen Produktivfehler:
Die wahrscheinlichste Ursache ist, dass die nach Reload persistierte
Quellidentität zwar formal gültig und fingerprint-konsistent ist, aber nicht
mehr wirklich unabhängig vom gespeicherten Pfad erzeugt wird. Dadurch würde
ein manipulierter oder gedrifteter Pfad seine eigene Baseline scheinbar
bestätigen. Der stärkste Gegenbeweis ist deshalb die Slice-09-Sequenz mit
getrennt manipulierter Quelle und Pfad über Fixieren, Reload und Import sowie
der abschließende echte Browserworkflow.

## 8. Definition of Done

Der Korrekturlauf ist erst fachlich bereit für die externe Gesamtfreigabe,
wenn:

- alle elf Slices in direkter 1-basierter Reihenfolge abgeschlossen sind,
- jede der neun alten Auditbeobachtungen durch Korrektur oder konkreten
  Quellen-Gegenbeweis samt Regressionstest geschlossen ist,
- kein Korrekturbereich lediglich als akzeptiertes Restrisiko offen bleibt,
- alle fokussierten Tests sowie `npm test`, `npm run test:browser`, der
  einzelne Stress-Replay-E2E-Lauf und `git diff --check` auf demselben
  Fingerprint erfolgreich attestiert sind,
- der Browser-Smoke tatsächlich bis zum Ende gelaufen ist,
- Claude und danach Antigravity denselben Fingerprint nach dokumentiertem
  Pre-Mortem freigegeben haben,
- Codex keine eigene Review- oder Freigabeentscheidung abgegeben hat und
- weder alte Commits/Quellen noch generierte Artefakte verändert wurden.

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-640d6831cee0`
- Testdateien: keine
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-640d6831cee0`
- Testdateien: keine
- Prüfdimensionen: Plan completeness (K-01 to K-11 covered across 11 discrete 1-based slices), scope discipline (0–5 productive files per slice, well below the 10-group limit; no allocation counterfactuals in V1), dependency order (Harness fix unblocks browser gate -&gt; Whitelist contract bounds -&gt; MC timeline market state -&gt; Symmetrical terminal states -&gt; Transaction missingness -&gt; Forced-sale parity -&gt; Persistence facade -&gt; UI serialization -&gt; Independent source identity -&gt; Presentation -&gt; Cleanup), exactness of path allowlists (all repository-relative backtick paths, zero globs), robust error paths, invariants, and stop conditions per slice
- Größtes Restrisiko: The largest residual risk during execution is in Slice 09 (independent source provenance across reload/import) where an inadvertent derivation of identity from &#96;workspace.path&#96; would create a self-authenticating circular baseline
- Realistische Bruchbedingung: Slice 09 is broken if a mutated path loaded after persistence or imported from external JSON fails to trigger a reconciliation mismatch against a legitimately frozen original scenario baseline.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `plan-validation-640d6831cee0`

- Diff-Fingerprint: `640d6831cee0d80c1618cedc45033fb9d76f77f71fd35c27b60d7ee2ebba7126`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: internal plan contract passed
- Ausgabedigest: `79bc4a2dfbc564416f71d020048332c46f1138de12899786903456d94c8d464e`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| internal:work-plan-contract | PASS | 0 | slices=1; planned_paths=1; changed_paths=1; future_slices=11; work_plan=docs/internal/STRESS_REPLAY_KORREKTUR_ARBEITSPLAN.md |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: The plan's own Section 7 pre-mortem (self-referential source identity surviving Slice 09 formally-valid-but-not-truly-independent) is the most credible three-month failure mode and is already covered by the mandated Slice 09 fixed/reload/import divergence test sequence. The next most likely failure is the renderer/export path gap identified above in Slice 04: if unnoticed, it either stalls Slice 04 on an UNEXPECTED-PATH stop (safe but costly) or, worse, is worked around informally without updating the allowlist, silently widening slice scope beyond what Claude/Antigravity reviewed. Neither path causes silent financial-result corruption, since all per-slice stop conditions gate on unexpected financial/RNG/source-identity/persistence deviations.
  - Ereignis 3: In three months, the most plausible product defect would stem from edge cases in post-reload source provenance (Slice 09) if subtle schema evolution or optional fields cause the independent identity validator to fall back to reconstructing baseline rows from the stored path itself, masking drift. The plan's required isolation tests with intentionally mismatched path and identity payloads, along with the strict fail-closed read_only gate, provide the necessary safeguard against this failure mode.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Slice 04's &#96;**Exakter Änderungspfad**&#96; allowlists &#96;stress-replay-contract.js&#96;, &#96;stress-replay-runner.js&#96;, &#96;stress-replay-comparison.js&#96; and the test files for runner/comparison/renderer/export, but not &#96;app/simulator/stress-replay-renderer.js&#96; or &#96;app/simulator/stress-replay-export.js&#96; themselves — even though K-04 requires the year table and export to represent the new symmetric &#96;all_dead&#96; terminal entry without truncation or ambiguity. If the renderer/export source currently branches only on &#96;terminal_ruin&#96; (rather than generically iterating any terminal status), Slice 04 will need to touch those production files, which is outside its declared allowlist and would trigger the plan's own UNEXPECTED-PATH stop mid-slice, forcing a plan amendment before Slice 04 can complete.
- Akzeptanztest: Before Slice 04 implementation starts, Codex/orchestrator confirms via source inspection that &#96;stress-replay-renderer.js&#96; and &#96;stress-replay-export.js&#96; already render/export arbitrary &#96;yearResults&#96; status entries without a &#96;terminal_ruin&#96;-only branch; if that assumption is false, the correction plan must be amended to add those two files to Slice 04's (or a follow-up slice's) exact change path before implementation proceeds — this must not be silently absorbed as an extra "remediation path" from an unapproved slice.
- Statusbegründung: –
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | Slice 04's &#96;**Exakter Änderungspfad**&#96; allowlists &#96;stress-replay-contract.js&#96;, &#96;stress-replay-runner.js&#96;, &#96;stress-replay-comparison.js&#96; and the test files for runner/comparison/renderer/export, but not &#96;app/simulator/stress-replay-renderer.js&#96; or &#96;app/simulator/stress-replay-export.js&#96; themselves — even though K-04 requires the year table and export to represent the new symmetric &#96;all_dead&#96; terminal entry without truncation or ambiguity. If the renderer/export source currently branches only on &#96;terminal_ruin&#96; (rather than generically iterating any terminal status), Slice 04 will need to touch those production files, which is outside its declared allowlist and would trigger the plan's own UNEXPECTED-PATH stop mid-slice, forcing a plan amendment before Slice 04 can complete. | OBSERVATION | offen | offen |
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
