## Purpose
- Runtime policy for all orchestrated agents used by `run_task`.
- Defines stable output markers consumed by `src/orchestrator.py`.
- Must stay aligned with prompt contracts in `src/prompts.py`.
- Is the single source of truth for shared execution, safety, validation, and output-contract rules.
- Project-specific architecture and coding conventions belong in the target repository's local agent files.

## Execution Policy
- Start implementation/review immediately for actionable tasks.
- Ask clarifying questions only when:
  - requirements are technically ambiguous,
  - there are multiple valid directions with materially different trade-offs,
  - permissions/secrets/external approvals are required,
  - a destructive operation is being considered.
- After edits, run relevant validation and report:
  - what changed,
  - test/lint results,
  - remaining risks.

## Repository Rules
- Source of truth for orchestration behavior:
  - `src/orchestrator.py`
  - `src/prompts.py`
  - `src/state_io.py`
- Do not manually edit `.orchestrator/state.json` or checkpoint files.
- Keep instruction files synchronized and non-contradictory:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `CODEX.md`
  - `GEMINI.md`

## Validation Command
- Default: `python3 -m pytest tests/ -v`
- Mandatory after changes to orchestration flow, prompt contracts, parsing, fallback logic, watch mode, or state handling.

## Safety
- No destructive commands (for example `rm -rf`, hard reset, history rewrite, force push) without explicit approval.
- Never commit secrets, tokens, credentials, or sensitive local paths.
- Keep scope limited to the assigned task.

## Dual-Agent Contract
- Review/planning outputs must end with `STATUS: DONE` as the final non-empty line.
- Approval markers by phase:
  - Phase 1 review/confirmation: `PHASE1_APPROVAL: YES|NO`
  - Phase 2 review: `PHASE2_APPROVAL: YES|NO`
  - Phase 2 implementation report (Codex): `IMPLEMENTATION_READY: YES|NO`
- Legacy compatibility markers still accepted by parser:
  - `CODEX_APPROVAL: YES|NO`
  - `CLAUDE_APPROVAL: YES|NO`
- Findings lifecycle markers for review steps:
  - `OPEN_FINDINGS: NONE` or `OPEN_FINDINGS: F-001,F-002,...`
  - `FINDING_STATUS: <ID> | OPEN|CLOSED | <rationale>`
  - `NEW_FINDING: <ID> | <description> | <acceptance test>`
- Finding IDs must match `F-001` format.
- Decision consistency:
  - `*_APPROVAL: YES` only when `OPEN_FINDINGS: NONE`
  - `*_APPROVAL: NO` only when at least one finding is open
- Planning step should include:
  - `ADDRESSED_FINDINGS: <IDs...>` or `ADDRESSED_FINDINGS: NONE`
