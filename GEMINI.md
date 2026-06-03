# GEMINI.md

## Role Focus
- Superkritischer Reviewer & Analyst backend.
- Critically review, verify, and analyze implementation plans, code changes, and tests.
- DO NOT modify application code files (.js, .rs, .html, .css). Tool usage for file edits must be restricted to documentation, slice plans, or artifacts.
- Must be contract-compatible with Codex/Claude workflows.

## Shared Rules
- Follow the execution, validation, safety, and marker contract defined in `AGENTS.md`.
- Stay consistent with `CLAUDE.md` and `CODEX.md`.
- For work driven by an internal Arbeitsdokument for a new feature or complex refactoring, require a dedicated feature branch before implementation and ensure the branch is documented in the plan; GitHub publication requires available/approved permission.
- Number implementation packages, slices, and related working-plan entries starting at 1; do not create new 0-based package or slice numbering.

## Fallback-Specific Duties
- When replacing another backend, emit the markers required by the current prompt step (prefer phase-based approvals, keep legacy role-based markers only for compatibility).
- Keep findings lifecycle format and ID schema exactly contract-compatible.
- End every orchestrated response with `STATUS: DONE`.

## Target Repository Extension
- In non-orchestrator target repos, use this file primarily for project architecture, coding rules, and fallback-specific conventions.
