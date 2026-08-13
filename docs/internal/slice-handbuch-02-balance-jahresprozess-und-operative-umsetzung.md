# Slice 02 – Balance, Jahresprozess und operative Umsetzung

**Feature-Branch:** `codex/handbuch-ueberarbeitung`
**GitHub-Status:** nur lokal

## Ziel des Slice

Balance, Jahresprozess und operative Umsetzung

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `Handbuch.html`, `docs/internal/slice-handbuch-02-balance-jahresprozess-und-operative-umsetzung.md`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung geprüft: `codex/handbuch-ueberarbeitung`.
- Ausgangsstatus: ausschließlich dieses noch unversionierte Slice-Dokument;
  keine fremden Änderungen im Slice-Scope festgestellt.
- Diff-Risiko: mittel. `Handbuch.html` ist eine große eigenständige Seite;
  deshalb wurden bestehende IDs beibehalten und die Änderungen auf
  Balance-Quickstart, Balance-Detailteil, Fehlerhilfe, Jahrespflege, FAQ,
  Glossar und zugehörige TOC-Einträge begrenzt.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Balance-Schnellstart in die sichere Reihenfolge Profil/Backup, Preflight,
  Recovery-Snapshot, periodengebundener Datenlauf, Post-Write-Validierung,
  Ist-Bestände, Diagnose und reale Umsetzung gebracht.
- „Jahres-Update“ und „Jahresabschluss“ als zwei sichtbare Auslöser desselben
  fail-safe Periodenabschlusses beschrieben und vom separaten
  Marktdaten-Nachrücken sowie vom validierten CSV-Import abgegrenzt.
- Perioden-, Stichtags-, Provenienz- und Recovery-Verhalten ergänzt; ein
  Fehler nach Commit-Beginn wird nicht mehr als harmloser Offline- oder
  manueller Fallback dargestellt.
- Runway als konfigurierbares Nettoziel in der Messphase
  `after_transaction_before_payout` erläutert und vom Brutto-Notfallpuffer,
  der internen harten Untergrenze, Pflegebucket und freier Liquidität getrennt.
- Floor, Flex und Mindest-Flex konsolidiert; insbesondere wird ein ungültiger
  Mindest-Flex als abgelehnte statt still begrenzte Eingabe beschrieben.
- Ausgaben-Check, korrupte/persistenzgefährdete Daten, Snapshot-Recovery und
  Historienwechsel mit konkreten Nutzerreaktionen verbunden.
- Modellierte Handlung, reale Bank-/Brokeraktion, Tranchen-Reconcile und
  manuelle Cashnachführung als getrennte Schritte dokumentiert.
- Veraltete Zwölfmonatsbeispiele und die pauschale Rebalancing-Empfehlung aus
  den Balance-Querschnittstexten entfernt.

## Ausgeführte Validierung mit Ergebnis

- Codex-Selbstprüfung: `git diff --check` ohne Befund.
- Statische Hashlink-Prüfung: 50 IDs und 52 interne Hashlinks; keine doppelte
  ID und kein fehlendes Linkziel.
- Begriffssuche nach `12 Monate`, `Notfall-Runway`, `folgen Sie genau`,
  `1:1 umsetzen`, `exakt dieser Reihenfolge`, `Konfigurationsordner` und
  `index.html direkt öffnen`: keine Fundstelle.
- Pfadprüfung: Änderungen ausschließlich an `Handbuch.html` und diesem
  Slice-Dokument.
- Die deterministische Validierung und Attestierung bleibt dem Orchestrator
  vorbehalten und ist noch nicht erfasst.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Die abschließende Querschnittskonsistenz mit den Simulator-, Profilverbund-
  und Tranchenabschnitten wird planmäßig in den Folgeslices weitergeführt.
- Browserdarstellung und Klickpfade sind noch nicht durch die
  Orchestrator-Validierung attestiert.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-107e0bed1a7f`
- Testdateien: keine
- Prüfdimensionen: scope/path allow-list, TOC anchor integrity, cross-section terminology consistency (Jahres-Update/Jahresabschluss, Runway phase semantics, Mindest-Flex validation rule), HTML tag balance in changed blocks, contract-marker compliance of the new slice md
- Größtes Restrisiko: Largest residual risk: unverified assumption that "Jahres-Update" and "Jahresabschluss" buttons are truly the same code path with identical recovery-snapshot guarantee (see C-01)
- Realistische Bruchbedingung: Break condition: a future code-level slice shows the two buttons use different handlers or that one skips the pre-write recovery snapshot, making the current documentation actively misleading rather than merely unverified.
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-107e0bed1a7f`
- Testdateien: keine
- Prüfdimensionen: scope and path allowlist compliance, terminology correctness (Runway vs Cash-Puffer, Floor/Flex distinction), documentation of failure paths and recovery procedures
- Größtes Restrisiko: The strict invariants described in the documentation (e.g. atomic snapshots before writes) may not be fully backed by the current application code
- Realistische Bruchbedingung: A user encounters an error during the annual update, follows the documented recovery instructions, and finds that the application state is corrupted because the fail-safe recovery snapshot was not actually created.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-107e0bed1a7f`

- Diff-Fingerprint: `107e0bed1a7fe6917b9312f3a001941d2fd24cbb82291ea76fb0be115683211b`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `f75136f7e6939f638f99e3362ce01f4b1eaac34bff18b7e7bc59276f12ebd522`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 169 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[174072 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely failure in three months is that the "Jahres-Update"/"Jahresabschluss" same-process claim (C-01) turns out to be aspirational rather than actual — e.g., a legacy quick-button still bypasses the recovery-snapshot precondition — so a user trusts the documented safety net, hits a partial failure, and has no valid snapshot to restore from.
  - Ereignis 3: The documentation overstates the robustness of the application's failure recovery, leading users to confidently perform risky operations and lose data when the described safety nets fail.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Handbuch.html repeatedly (Quickstart step 2, "Jahres-Update" detail block, troubleshooting section, slice-02 summary) asserts that the "🌐 Jahres-Update" and "⭐ Jahresabschluss" buttons invoke the identical fail-safe, period-bound close with snapshot-before-write and once-per-calendar-year semantics. Nothing in the supplied evidence (docs-only diff, generic npm test PASS) demonstrates both UI entry points resolve to the same handler/invariant in app code. If they in fact diverge (e.g. one path skips the recovery snapshot or the once-per-year guard), users following the documented "either button is equally safe" guidance could execute an unprotected write.
- Akzeptanztest: Add a static check (e.g. grep the balance app source for both button ids' event bindings and confirm they resolve to one shared close-period function name, or reference an existing unit/contract test asserting this) and record the result/output in the next slice's "Ausgeführte Validierung" section.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | Handbuch.html repeatedly (Quickstart step 2, "Jahres-Update" detail block, troubleshooting section, slice-02 summary) asserts that the "🌐 Jahres-Update" and "⭐ Jahresabschluss" buttons invoke the identical fail-safe, period-bound close with snapshot-before-write and once-per-calendar-year semantics. Nothing in the supplied evidence (docs-only diff, generic npm test PASS) demonstrates both UI entry points resolve to the same handler/invariant in app code. If they in fact diverge (e.g. one path skips the recovery snapshot or the once-per-year guard), users following the documented "either button is equally safe" guidance could execute an unprotected write. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/handbuch.md`

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
