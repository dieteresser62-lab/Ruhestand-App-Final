# Slice 02 – Dauerhafter Vergleichsfehler und wahrheitsgemäße Aufrufer

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Dauerhafter Vergleichsfehler und wahrheitsgemäße Aufrufer

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_VARIANTENVERGLEICH_02_UI_FEHLERZUSTAND.md`, `docs/internal/slice-stress-replay-variantenvergleich-bugfix-arbeitsplan-02-dauerhafter-vergleichsfehler-und-wahrheitsgemae-aufrufer.md`, `docs/internal/stress-replay-variantenvergleich-bugfix-implement-review-429c3799.md`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Vor Coding geprüft: aktiver Branch `codex/stress-pfad-replay`. Der Status
enthielt ausschließlich die vom Orchestrator für Slice 2 angelegten
Dokumente. Diff-Risiko: mittel, insbesondere wegen nachgelagerter
Erfolgsmeldungen, die einen gefangenen Vergleichsfehler überschreiben können.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

Der Controller führt einen dauerhaften Vergleichszustand `idle`, `success`
oder `error`; leere Ergebnisse scheitern mit einem stabilen Fehlercode. Der
Renderer zeigt sanitizierte und HTML-escaped Diagnosen alert-semantisch.
Initialisierung, Fixierung, Import, Hinzufügen, Entfernen sowie direkter und
registrierter Recompute melden den tatsächlichen Rechenerfolg. Erfolgreiche
Persistenzmutationen behalten ihre Rückgabewerte und werden bei anschließendem
Rechenfehler getrennt von diesem benannt.

## Ausgeführte Validierung mit Ergebnis

Implementer-fokussiert erfolgreich: UI 131/131 und Renderer 46/46
Assertions; `git diff --check` ohne Befund. Der Browser-Smoke wurde um den
echten DOM-Click ergänzt, konnte lokal mangels Playwright-Chromium-Binary aber
nicht gestartet werden. Die autoritative Matrix einschließlich Browserlauf
wird durch den Orchestrator ausgeführt.

## Abweichungen vom Plan

Keine.

## Offene Risiken

Neue Aufrufer könnten die einheitliche Recompute-Rückgabe umgehen oder eine
pauschale Erfolgsmeldung nachschalten. Die sieben aktuellen Aufrufklassen und
der echte DOM-Click sind explizit abgedeckt. `C-02` und `C-03` verbleiben
planmäßig für Slice 3. Siehe zusätzlich Findings-Lebenszyklus.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-672205b5f662`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: Checked dimensions — fail-closed empty/throwing comparison handling, XSS-safe diagnostic rendering (double-layered: input sanitization + output escaping), per-call-site truthful mutation-vs-comparison status separation across 7 caller classes, idle-state resets on workspace discard/import/read-only, focus-target determinism under nested render() calls, and back-compat fallback in the renderer.
- Größtes Restrisiko: inline duplication of the success/failure status ternary across 5 call sites (C-04).
- Realistische Bruchbedingung: a future call site or edit omits the &#96;error:&#96;/&#96;focus:&#96; branching and is not covered by a new ui-test, silently regressing the fixed defect.
- Eigene Findings: `C-01`, `C-02`, `C-03`, `C-04`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-672205b5f662`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: Checked dimensions — durable comparison error lifecycle (idle, success, error) with fail-closed rejection of empty/malformed results (STRESS_REPLAY_COMPARISON_EMPTY), separation of mutation persistence success from comparison failure across all 7 caller sites (addVariant, removeVariant, fixSelectedScenario, importSerialized, initialize, direct recompute, and DOM recompute action), double-layered XSS defense (controller-level diagnostic regex/control-character sanitization + renderer HTML escaping), accessibility semantics (role="alert" and deterministic focus routing), backward-compatible renderer fallback, and workspace lifecycle state resets on discard/read-only transitions.
- Größtes Restrisiko: largest residual risk: inline repetition of the mutation-success/comparison-failure status ternary across call sites without a unified helper (tracked via C-04)
- Realistische Bruchbedingung: realistic break condition: a future mutation entry point or automated recompute trigger sets an unconditional success status after persistence without checking the comparison return value.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — V2 speichert weiterhin sämtliche exakten Reconciliation-Werte und Feldpräsenzen, nutzt jedoch eine kompakte kanonische Kodierung; der bestehende E2E-Größentest besteht mit 91/91 Assertions.
- `C-02` Antwort 1: **angenommen** — Die erforderliche Datenschutzhinweis-Dokumentation wird gemäß Arbeitsplan in Slice 3 innerhalb dessen freigegebenen Dokumentationsscope ergänzt.
- `C-02` Antwort 2: **angenommen** — Die Datenschutzdokumentation betrifft weiterhin den freigegebenen Dokumentationsscope von Slice 3 und wird dort umgesetzt.
- `C-03` Antwort 1: **angenommen** — Exportgröße, verbleibende Budgetreserve und Kompaktkodierungsbegründung werden planmäßig in Slice 3 dokumentiert.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-672205b5f662`

- Diff-Fingerprint: `672205b5f66229db62f7d3f546f0073e991d467cb65f66a017d166cb8dc9a14a`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `eb46253b326da24ffb3a2a21da8e4fa669233f6df082dcf83a29fccc7398e3d9`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[184669 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: The most likely failure in three months is a later feature (e.g. a new bulk-import or auto-recompute trigger) adding another &#96;computeComparison()&#96; call site that copies an older, pre-Slice-2 status pattern (or forgets the &#96;error:&#96;/&#96;focus:&#96; ternary) and silently reintroduces the "success text overwrites a caught comparison failure" defect this slice fixed, without a corresponding ui-test to catch it — exactly the residual risk captured in C-04.
  - Ereignis 3: The most likely failure cause in three months is a new UI action or batch mutation added to stress-replay-ui.js that triggers computeComparison() but follows the pre-Slice-2 pattern of writing an unconditional success message to status(), inadvertently clobbering the caught comparison failure alert for that action.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: The fingerprint-bound orchestrator validation is RED: tests/stress-replay-e2e.test.mjs fails "The comparison export must stay within the documented relative and contract size budgets." Slice 1 replaced the compact V1 per-row &#96;reconciliationFingerprint&#96; hash with a verbose V2 &#96;reconciliationValues&#96; object embedding the full set of monetary/ratio reconciliation fields per source row, materially growing the persisted workspace and comparison-export payload (up to 60 rows × ~14 fields), which breaks the documented size-budget invariant that stress-replay-e2e.test.mjs enforces. No red-state follow-up Slice for this regression is authorized in this run, so the Slice cannot be approved until either the size budget documentation/threshold is updated in the authorized scope or the V2 payload is brought back within budget (e.g. tightened field allowlist, compaction) while preserving the exact-value reconciliation guarantee this Slice added.
- Akzeptanztest: VALIDATE: ["npm","test"]
- Statusbegründung: The bound validation attestation for fingerprint 584287cf83d0… is PASS (npm test, 1/1 required, exit 0), and the diff shows the size regression was fixed at its root cause — replacing the verbose per-field V2 object with a canonical, presence+value compact string that preserves exact values and field-presence while shrinking the payload — not by loosening the documented budget. The fix is defended by targeted mutation/canonicality/max-row tests plus a real workspace/export round-trip test proving direct and persisted evidence reach identical reconciliation decisions at the exact tolerance boundaries. Acceptance test (&#96;VALIDATE: ["npm","test"]&#96;) is satisfied by the bound attestation.

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: V2 source identities now persist and export actual monetary/decision values (Vermögenswerte, Renten, Flex-Erfüllung, Jahresentnahme) per row in localStorage and comparison-export JSON, where V1 only stored an opaque per-row hash. This is a deliberate and reasonable trade for exact reconciliation, and the data stays on the user's own device/export file, but it enlarges the plaintext financial-data surface persisted/exported for this feature and should be called out explicitly in the user-facing docs (Slice 3 scope: Handbuch.html / SIMULATOR_MODULES_README.md / TECHNICAL.md) so users understand what a stress-replay export now contains.
- Akzeptanztest: Confirm Slice 3 documentation explicitly states that a fixed stress-path export now contains full per-row reconciliation values (not just a hash) for the retained source prefix, and that this is reviewed for consistency with the existing privacy-exclusion list in the export contract.
- Statusbegründung: Carried forward unchanged; the current review supplied no explicit status update.

### `C-03` — `OPEN`

- Quelle: `claude`; Runde 2
- Klasse: `OBSERVATION`
- Finding: The V2 compact-encoding fix for C-01 restores the size budget with only ~1.1% headroom (109,472 B vs. 110,655 B documented relative budget), leaving little margin before the next field/row addition regresses the same size-budget invariant; the size test failure alone does not point a future implementer at the encoding as the likely cause.
- Akzeptanztest: Confirm that Slice 3's documentation sync (TECHNICAL.md / SIMULATOR_MODULES_README.md) records the current measured export size and the compact-encoding rationale so a future size-budget regression is diagnosed quickly, and that any future addition to SOURCE_IDENTITY_V2_RECONCILIATION_FIELDS is required to re-measure the relative budget rather than assuming continued headroom.
- Statusbegründung: Carried forward unchanged; the current review supplied no explicit status update.

### `C-04` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The five mutation-success/comparison-failure status branches in stress-replay-ui.js (addVariant, removeVariant, fixSelectedScenario, importSerialized, and the initialize load-status branch) duplicate the same &#96;computedComparison ? success-text : failure-text, { error: !computedComparison }&#96; pattern inline instead of routing through one shared helper, so a future new mutation entry point could copy an older call site incompletely and reintroduce a status message that overwrites a caught comparison failure with an unconditional success message.
- Akzeptanztest: Confirm that any future Slice adding a new mutation/entry-point call site that computes a comparison after a successful persistence mutation either reuses a shared status-composition helper or is covered by a dedicated ui-test asserting the failure branch is not overwritten by a success message, following the pattern already established in tests/stress-replay-ui.test.mjs Tests 14/16/17.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The fingerprint-bound orchestrator validation is RED: tests/stress-replay-e2e.test.mjs fails "The comparison export must stay within the documented relative and contract size budgets." Slice 1 replaced the compact V1 per-row &#96;reconciliationFingerprint&#96; hash with a verbose V2 &#96;reconciliationValues&#96; object embedding the full set of monetary/ratio reconciliation fields per source row, materially growing the persisted workspace and comparison-export payload (up to 60 rows × ~14 fields), which breaks the documented size-budget invariant that stress-replay-e2e.test.mjs enforces. No red-state follow-up Slice for this regression is authorized in this run, so the Slice cannot be approved until either the size budget documentation/threshold is updated in the authorized scope or the V2 payload is brought back within budget (e.g. tightened field allowlist, compaction) while preserving the exact-value reconciliation guarantee this Slice added. | BLOCKER | angenommen | erledigt: The bound validation attestation for fingerprint 584287cf83d0… is PASS (npm test, 1/1 required, exit 0), and the diff shows the size regression was fixed at its root cause — replacing the verbose per-field V2 object with a canonical, presence+value compact string that preserves exact values and field-presence while shrinking the payload — not by loosening the documented budget. The fix is defended by targeted mutation/canonicality/max-row tests plus a real workspace/export round-trip test proving direct and persisted evidence reach identical reconciliation decisions at the exact tolerance boundaries. Acceptance test (&#96;VALIDATE: ["npm","test"]&#96;) is satisfied by the bound attestation. |
| C-02 | claude | V2 source identities now persist and export actual monetary/decision values (Vermögenswerte, Renten, Flex-Erfüllung, Jahresentnahme) per row in localStorage and comparison-export JSON, where V1 only stored an opaque per-row hash. This is a deliberate and reasonable trade for exact reconciliation, and the data stays on the user's own device/export file, but it enlarges the plaintext financial-data surface persisted/exported for this feature and should be called out explicitly in the user-facing docs (Slice 3 scope: Handbuch.html / SIMULATOR_MODULES_README.md / TECHNICAL.md) so users understand what a stress-replay export now contains. | OBSERVATION | angenommen | offen |
| C-03 | claude | The V2 compact-encoding fix for C-01 restores the size budget with only ~1.1% headroom (109,472 B vs. 110,655 B documented relative budget), leaving little margin before the next field/row addition regresses the same size-budget invariant; the size test failure alone does not point a future implementer at the encoding as the likely cause. | OBSERVATION | angenommen | offen |
| C-04 | claude | The five mutation-success/comparison-failure status branches in stress-replay-ui.js (addVariant, removeVariant, fixSelectedScenario, importSerialized, and the initialize load-status branch) duplicate the same &#96;computedComparison ? success-text : failure-text, { error: !computedComparison }&#96; pattern inline instead of routing through one shared helper, so a future new mutation entry point could copy an older call site incompletely and reintroduce a status message that overwrites a caught comparison failure with an unconditional success message. | OBSERVATION | offen | offen |
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
