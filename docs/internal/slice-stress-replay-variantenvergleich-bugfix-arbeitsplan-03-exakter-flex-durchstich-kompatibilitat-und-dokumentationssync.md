# Slice 03 – Exakter Flex-Durchstich, Kompatibilität und Dokumentationssync

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Exakter Flex-Durchstich, Kompatibilität und Dokumentationssync

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `Handbuch.html`, `README.md`, `docs/internal/SLICE_STRESS_REPLAY_VARIANTENVERGLEICH_03_E2E_UND_DOKU.md`, `docs/internal/slice-stress-replay-variantenvergleich-bugfix-arbeitsplan-03-exakter-flex-durchstich-kompatibilitat-und-dokumentationssync.md`, `docs/internal/stress-replay-variantenvergleich-bugfix-implement-review-429c3799.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-e2e.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Coding: `codex/stress-pfad-replay`; Zielbranch stimmt überein.
- Status vor Coding: nur orchestratorverwalteter Auditbericht geändert und
  diese Slice-Datei unversioniert.
- Risiko: mittel; der echte Engine-Durchstich kann Contract-, Fingerprint- und
  Reconciliation-Abweichungen sichtbar machen. Verwaltete Auditblöcke bleiben
  unverändert.

## Geplante Tests

- `node tests/run-single.mjs tests/stress-replay-e2e.test.mjs`
- `node tests/run-single.mjs tests/browser-smoke.test.mjs`
- `git diff --check`

## Durchgeführte Änderungen

- Synthetischer 35-Jahres-E2E-Durchstich für den exakten Patch
  90.000/30.000 EUR auf 28.000/12.000 EUR über Vorschau, Anwendung, echte
  Replay-Läufe, Comparison, Workspace, Export, Import und V2-Reload.
- Golden-V1-Import als Nur-Lesen mit `source_identity_refix_required`
  abgesichert.
- Nutzer- und Referenzdokumentation zu V2, V1-Refix, Fehlerstatus,
  Klartext-Finanzdaten sowie knappem Exportgrößenbudget synchronisiert.
- Kein zusätzlicher Browser-Smoke-Code nötig; der Slice-2-DOM-Test deckt den
  geforderten Fehlerzustand bereits ab.

## Ausgeführte Validierung mit Ergebnis

- Fokussierter E2E-Test: 115/115 Assertions erfolgreich.
- `run-single` importiert den Main-basierten Browser-Smoke nur und meldet null
  Assertions. Der korrekte direkte Aufruf wurde vor dem Teststart durch
  `listen EPERM 127.0.0.1` in der Agentensandbox blockiert; die autoritative
  Browservalidierung bleibt beim Orchestrator.
- `git diff --check`: erfolgreich.
- Die autoritative Gesamtmatrix wird durch den Orchestrator projiziert.

## Abweichungen vom Plan

Keine fachliche Abweichung. `tests/browser-smoke.test.mjs` blieb unverändert,
weil der geforderte echte Click-Fehlerzustand samt Fokus und Escaping bereits
in Slice 2 vollständig ergänzt wurde.

## Offene Risiken

Der V2-Export hat nur rund 1,1 Prozent Reserve zum relativen Größenbudget.
Künftige Reconciliation-Felder erfordern Neumessung und synchronisierte
Datenschutzdokumentation. Neue UI-Mutationsaufrufer müssen den dauerhaften
Vergleichsfehler weiterhin explizit absichern.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-f16ebf1bc11a`
- Testdateien: `tests/stress-replay-e2e.test.mjs`
- Prüfdimensionen: checked invariants (patch-value exactness end-to-end into real engine execution, immutability of baseline/path/source across the full flow, export/import/reload result-fingerprint identity, V1 read-only/refix classification), failure paths (legacy V1 golden fixture stays inspectable-only, no silent migration), doc/code consistency (size-budget and privacy-disclosure numbers matching across README/SIMULATOR_MODULES_README/TECHNICAL/Handbuch), and scope/attestation binding (allowlist adherence, PASS attestation bound to current fingerprint)
- Größtes Restrisiko: largest residual risk: the ~1.1% export-size headroom (C-03/now closed but still numerically thin) combined with three independently hand-maintained doc copies of that figure (C-05)
- Realistische Bruchbedingung: break condition: a future Slice adds a reconciliation field or grows the max-row export without re-running the relative-budget size test and without updating all doc copies, silently regressing the size contract or leaving stale headroom guidance for the next implementer.
- Eigene Findings: `C-01`, `C-02`, `C-03`, `C-04`, `C-05`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-f16ebf1bc11a`
- Testdateien: `tests/stress-replay-e2e.test.mjs`
- Prüfdimensionen: E2E real engine pipeline integration (synthetic 35y path 90,000/30,000 EUR -&gt; 28,000/12,000 EUR exact values through preview, variant creation, engine execution without clamping), immutability invariants (baselineInputs, materialized path, and original source rows preserved), deterministic V2 export/import/reload result fingerprint parity without original logs, legacy V1 inspection and refix isolation without silent migration, and documentation synchronization across [&#96;Handbuch.html&#96;](file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/Handbuch.html), [&#96;README.md&#96;](file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/README.md), [&#96;SIMULATOR_MODULES_README.md&#96;](file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/reference/SIMULATOR_MODULES_README.md), and [&#96;TECHNICAL.md&#96;](file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/reference/TECHNICAL.md) including plaintext financial privacy disclosures and export size budget limits
- Größtes Restrisiko: The ~1.1% (1,183 B) export-size budget headroom in conjunction with triple-duplicated manual documentation figures across reference docs (tracked under C-03/C-05) and inline mutation-comparison status logic (C-04)
- Realistische Bruchbedingung: A future modification expanding SOURCE_IDENTITY_V2_RECONCILIATION_FIELDS or altering the canonical compact encoding pushes max-row export size above 110,655 B while failing to update one of the reference docs synchronously.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — V2 speichert weiterhin sämtliche exakten Reconciliation-Werte und Feldpräsenzen, nutzt jedoch eine kompakte kanonische Kodierung; der bestehende E2E-Größentest besteht mit 91/91 Assertions.
- `C-02` Antwort 1: **angenommen** — Die erforderliche Datenschutzhinweis-Dokumentation wird gemäß Arbeitsplan in Slice 3 innerhalb dessen freigegebenen Dokumentationsscope ergänzt.
- `C-02` Antwort 2: **angenommen** — Die Datenschutzdokumentation betrifft weiterhin den freigegebenen Dokumentationsscope von Slice 3 und wird dort umgesetzt.
- `C-02` Antwort 3: **angenommen** — Nutzer- und Referenzdokumentation nennen die vollständigen Reconciliation-Werte des gebundenen Source-Präfixes sowie die weiterhin ausgeschlossenen Daten explizit.
- `C-03` Antwort 1: **angenommen** — Exportgröße, verbleibende Budgetreserve und Kompaktkodierungsbegründung werden planmäßig in Slice 3 dokumentiert.
- `C-03` Antwort 2: **angenommen** — Gemessene Exportgröße, Budgetgrenze, verbleibende Reserve, Kompaktkodierungsgrund und Neumessungspflicht sind dokumentiert.
- `C-04` Antwort 1: **angenommen** — Slice 3 ergänzt keinen neuen Mutationsaufrufer; die Wartungsanforderung für künftige Aufrufer ist im Slice-Bericht festgehalten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-f16ebf1bc11a`

- Diff-Fingerprint: `f16ebf1bc11ac86657cb7c2ea21613a0b7e9c0362a74b9adb2fb6cbd59c42942`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `bddd625fc0d60a572e31a1d749aeced97a5431e973abfb979518761454ebdf81`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[184670 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: The most likely failure in three months is a follow-on feature adding one more &#96;SOURCE_IDENTITY_V2_RECONCILIATION_FIELDS&#96; entry (or raising the max captured row count) that passes the existing relative-budget size test only marginally or not at all, while the implementer copies the old byte figures into only one of the two reference docs, leaving TECHNICAL.md and SIMULATOR_MODULES_README.md inconsistent about the real remaining headroom — exactly the residual risk captured in C-05 building on the still-thin margin from C-03.
  - Ereignis 3: In three months, the most probable failure vector is a follow-up feature that adds new fields to SOURCE_IDENTITY_V2_RECONCILIATION_FIELDS or increases the maximum captured scenario rows, causing the 60-year export payload to exceed the 110,655 B relative budget threshold (~1.1% headroom) during edge-case runs, or introducing new plaintext financial properties into the export without updating the privacy disclosures across the four synchronized documentation files.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: The fingerprint-bound orchestrator validation is RED: tests/stress-replay-e2e.test.mjs fails "The comparison export must stay within the documented relative and contract size budgets." Slice 1 replaced the compact V1 per-row &#96;reconciliationFingerprint&#96; hash with a verbose V2 &#96;reconciliationValues&#96; object embedding the full set of monetary/ratio reconciliation fields per source row, materially growing the persisted workspace and comparison-export payload (up to 60 rows × ~14 fields), which breaks the documented size-budget invariant that stress-replay-e2e.test.mjs enforces. No red-state follow-up Slice for this regression is authorized in this run, so the Slice cannot be approved until either the size budget documentation/threshold is updated in the authorized scope or the V2 payload is brought back within budget (e.g. tightened field allowlist, compaction) while preserving the exact-value reconciliation guarantee this Slice added.
- Akzeptanztest: VALIDATE: ["npm","test"]
- Statusbegründung: The bound validation attestation for fingerprint 584287cf83d0… is PASS (npm test, 1/1 required, exit 0), and the diff shows the size regression was fixed at its root cause — replacing the verbose per-field V2 object with a canonical, presence+value compact string that preserves exact values and field-presence while shrinking the payload — not by loosening the documented budget. The fix is defended by targeted mutation/canonicality/max-row tests plus a real workspace/export round-trip test proving direct and persisted evidence reach identical reconciliation decisions at the exact tolerance boundaries. Acceptance test (&#96;VALIDATE: ["npm","test"]&#96;) is satisfied by the bound attestation.

### `C-02` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: V2 source identities now persist and export actual monetary/decision values (Vermögenswerte, Renten, Flex-Erfüllung, Jahresentnahme) per row in localStorage and comparison-export JSON, where V1 only stored an opaque per-row hash. This is a deliberate and reasonable trade for exact reconciliation, and the data stays on the user's own device/export file, but it enlarges the plaintext financial-data surface persisted/exported for this feature and should be called out explicitly in the user-facing docs (Slice 3 scope: Handbuch.html / SIMULATOR_MODULES_README.md / TECHNICAL.md) so users understand what a stress-replay export now contains.
- Akzeptanztest: Confirm Slice 3 documentation explicitly states that a fixed stress-path export now contains full per-row reconciliation values (not just a hash) for the retained source prefix, and that this is reviewed for consistency with the existing privacy-exclusion list in the export contract.
- Statusbegründung: Slice 3's Handbuch.html/SIMULATOR_MODULES_README.md/TECHNICAL.md text explicitly discloses that the bound V2 source-identity prefix now stores/exports actual per-row reconciliation values (Vermögen, Renten, Flex-Erfüllung, Jahresentnahme), reaffirms the unchanged privacy exclusion list, and states the export remains confidential financial data — the exact acceptance test is met.

### `C-03` — `CLOSED`

- Quelle: `claude`; Runde 2
- Klasse: `OBSERVATION`
- Finding: The V2 compact-encoding fix for C-01 restores the size budget with only ~1.1% headroom (109,472 B vs. 110,655 B documented relative budget), leaving little margin before the next field/row addition regresses the same size-budget invariant; the size test failure alone does not point a future implementer at the encoding as the likely cause.
- Akzeptanztest: Confirm that Slice 3's documentation sync (TECHNICAL.md / SIMULATOR_MODULES_README.md) records the current measured export size and the compact-encoding rationale so a future size-budget regression is diagnosed quickly, and that any future addition to SOURCE_IDENTITY_V2_RECONCILIATION_FIELDS is required to re-measure the relative budget rather than assuming continued headroom.
- Statusbegründung: SIMULATOR_MODULES_README.md and TECHNICAL.md record the measured 109,472 B export, the 110,655 B relative limit, the 1,183 B (~1.1%) remaining reserve, the compact-encoding rationale, and an explicit re-measurement requirement for any future field-list growth — the exact acceptance test is met.

### `C-04` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The five mutation-success/comparison-failure status branches in stress-replay-ui.js (addVariant, removeVariant, fixSelectedScenario, importSerialized, and the initialize load-status branch) duplicate the same &#96;computedComparison ? success-text : failure-text, { error: !computedComparison }&#96; pattern inline instead of routing through one shared helper, so a future new mutation entry point could copy an older call site incompletely and reintroduce a status message that overwrites a caught comparison failure with an unconditional success message.
- Akzeptanztest: Confirm that any future Slice adding a new mutation/entry-point call site that computes a comparison after a successful persistence mutation either reuses a shared status-composition helper or is covered by a dedicated ui-test asserting the failure branch is not overwritten by a success message, following the pattern already established in tests/stress-replay-ui.test.mjs Tests 14/16/17.
- Statusbegründung: Carried forward unchanged; the current review supplied no explicit status update.

### `C-05` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The compact-encoding size-budget figures (109,472 measured bytes; 110,655-byte relative limit; ~1.1%/1,183-byte headroom) are now hand-duplicated as prose in SIMULATOR_MODULES_README.md and TECHNICAL.md (and again in the Slice-03 internal report) with no single source of truth and no test that fails specifically when these documented numbers diverge from a newly measured value; a later Slice that changes the encoding or field list could update the code and the existing relative-budget size test (which still enforces the real threshold correctly) while leaving one of the doc copies with a stale headroom figure, misleading a future implementer's risk assessment even though functional/size-budget behavior stays correct.
- Akzeptanztest: acceptance=Confirm that any future Slice touching SOURCE_IDENTITY_V2_RECONCILIATION_FIELDS or the compact encoding re-measures and updates the byte figures consistently across SIMULATOR_MODULES_README.md and TECHNICAL.md in the same change, and consider deriving the documented reserve from the same measurement path used by the size-budget test rather than three independently hand-maintained numbers.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The fingerprint-bound orchestrator validation is RED: tests/stress-replay-e2e.test.mjs fails "The comparison export must stay within the documented relative and contract size budgets." Slice 1 replaced the compact V1 per-row &#96;reconciliationFingerprint&#96; hash with a verbose V2 &#96;reconciliationValues&#96; object embedding the full set of monetary/ratio reconciliation fields per source row, materially growing the persisted workspace and comparison-export payload (up to 60 rows × ~14 fields), which breaks the documented size-budget invariant that stress-replay-e2e.test.mjs enforces. No red-state follow-up Slice for this regression is authorized in this run, so the Slice cannot be approved until either the size budget documentation/threshold is updated in the authorized scope or the V2 payload is brought back within budget (e.g. tightened field allowlist, compaction) while preserving the exact-value reconciliation guarantee this Slice added. | BLOCKER | angenommen | erledigt: The bound validation attestation for fingerprint 584287cf83d0… is PASS (npm test, 1/1 required, exit 0), and the diff shows the size regression was fixed at its root cause — replacing the verbose per-field V2 object with a canonical, presence+value compact string that preserves exact values and field-presence while shrinking the payload — not by loosening the documented budget. The fix is defended by targeted mutation/canonicality/max-row tests plus a real workspace/export round-trip test proving direct and persisted evidence reach identical reconciliation decisions at the exact tolerance boundaries. Acceptance test (&#96;VALIDATE: ["npm","test"]&#96;) is satisfied by the bound attestation. |
| C-02 | claude | V2 source identities now persist and export actual monetary/decision values (Vermögenswerte, Renten, Flex-Erfüllung, Jahresentnahme) per row in localStorage and comparison-export JSON, where V1 only stored an opaque per-row hash. This is a deliberate and reasonable trade for exact reconciliation, and the data stays on the user's own device/export file, but it enlarges the plaintext financial-data surface persisted/exported for this feature and should be called out explicitly in the user-facing docs (Slice 3 scope: Handbuch.html / SIMULATOR_MODULES_README.md / TECHNICAL.md) so users understand what a stress-replay export now contains. | OBSERVATION | angenommen | erledigt: Slice 3's Handbuch.html/SIMULATOR_MODULES_README.md/TECHNICAL.md text explicitly discloses that the bound V2 source-identity prefix now stores/exports actual per-row reconciliation values (Vermögen, Renten, Flex-Erfüllung, Jahresentnahme), reaffirms the unchanged privacy exclusion list, and states the export remains confidential financial data — the exact acceptance test is met. |
| C-03 | claude | The V2 compact-encoding fix for C-01 restores the size budget with only ~1.1% headroom (109,472 B vs. 110,655 B documented relative budget), leaving little margin before the next field/row addition regresses the same size-budget invariant; the size test failure alone does not point a future implementer at the encoding as the likely cause. | OBSERVATION | angenommen | erledigt: SIMULATOR_MODULES_README.md and TECHNICAL.md record the measured 109,472 B export, the 110,655 B relative limit, the 1,183 B (~1.1%) remaining reserve, the compact-encoding rationale, and an explicit re-measurement requirement for any future field-list growth — the exact acceptance test is met. |
| C-04 | claude | The five mutation-success/comparison-failure status branches in stress-replay-ui.js (addVariant, removeVariant, fixSelectedScenario, importSerialized, and the initialize load-status branch) duplicate the same &#96;computedComparison ? success-text : failure-text, { error: !computedComparison }&#96; pattern inline instead of routing through one shared helper, so a future new mutation entry point could copy an older call site incompletely and reintroduce a status message that overwrites a caught comparison failure with an unconditional success message. | OBSERVATION | angenommen | offen |
| C-05 | claude | The compact-encoding size-budget figures (109,472 measured bytes; 110,655-byte relative limit; ~1.1%/1,183-byte headroom) are now hand-duplicated as prose in SIMULATOR_MODULES_README.md and TECHNICAL.md (and again in the Slice-03 internal report) with no single source of truth and no test that fails specifically when these documented numbers diverge from a newly measured value; a later Slice that changes the encoding or field list could update the code and the existing relative-budget size test (which still enforces the real threshold correctly) while leaving one of the doc copies with a stale headroom figure, misleading a future implementer's risk assessment even though functional/size-budget behavior stays correct. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/stress-replay-variantenvergleich-bugfix-implement-review-429c3799.md`

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
